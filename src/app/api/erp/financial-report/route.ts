export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getErpPool } from "@/lib/supabaseErp";
import { ensureErpCoreIndexes, runSchemaInitOnce } from "@/lib/erpSchemaCache";
import { requireMenuPermission } from "@/lib/erpRbacGuard";
import {
  parseXlsxBufferToRows,
  decodeTextBuffer,
  parseCsvOrTsvTextToRows,
} from "@/lib/ibkBankParser";
import {
  FinancialDetailItem,
  ParsedTaxPaymentRow,
  parseHometaxTaxPaymentRows,
} from "./financialReportEngine";
import { buildFinancialReportPayload } from "./financialStatementsBuilder";
export type { FinancialDetailItem, ParsedTaxPaymentRow };

async function ensureFinancialReportSchema(pool: any) {
  await runSchemaInitOnce("erp_financial_report_schema_v2", async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_financial_remarks (
        id SERIAL PRIMARY KEY,
        year VARCHAR(10) NOT NULL,
        entity_type VARCHAR(20) NOT NULL DEFAULT 'ALL',
        remark_text TEXT DEFAULT '',
        tax_withholding NUMERIC DEFAULT 0,
        tax_vat NUMERIC DEFAULT 0,
        tax_corporate NUMERIC DEFAULT 0,
        tax_payment NUMERIC DEFAULT 0,
        updated_by VARCHAR(100),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (year, entity_type)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_tax_payments (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(20) NOT NULL DEFAULT 'CORP',
        pay_date DATE NOT NULL,
        tax_type VARCHAR(100) NOT NULL,
        sub_account VARCHAR(50) NOT NULL,
        taxpayer_name VARCHAR(150),
        pay_amount NUMERIC DEFAULT 0,
        electronic_pay_no VARCHAR(100),
        attribution_year VARCHAR(10),
        tax_office VARCHAR(100),
        national_tax NUMERIC DEFAULT 0,
        education_tax NUMERIC DEFAULT 0,
        defense_tax NUMERIC DEFAULT 0,
        rural_special_tax NUMERIC DEFAULT 0,
        surcharge NUMERIC DEFAULT 0,
        remark TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (electronic_pay_no, pay_date, pay_amount)
      )
    `);

    await pool.query(`
      ALTER TABLE erp_tax_payments
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);
    await pool.query(`
      ALTER TABLE erp_tax_payments
      DROP CONSTRAINT IF EXISTS erp_tax_payments_electronic_pay_no_key;
    `);
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'erp_tax_payments_epay_date_amt_key'
        ) THEN
          ALTER TABLE erp_tax_payments
          ADD CONSTRAINT erp_tax_payments_epay_date_amt_key UNIQUE (electronic_pay_no, pay_date, pay_amount);
        END IF;
      END $$;
    `);
  });
  await ensureErpCoreIndexes(pool);
}

export async function GET(request: Request) {
  try {
    const guard = await requireMenuPermission(
      request,
      ["financial_report", "FINANCIAL_REPORT"],
      "view"
    );
    if (!guard.authorized) {
      return guard.response!;
    }

    const { searchParams } = new URL(request.url);
    const currentYearStr = String(new Date().getFullYear());
    const year = searchParams.get("year") || currentYearStr; // 당기 기본값 ('2026', '2027', ... | 'ALL')
    const entityType = searchParams.get("entityType") || "ALL"; // 'ALL' | 'CORP' | 'INDIVIDUAL'
    const amountBasis = searchParams.get("amountBasis") || "SUPPLY"; // 'SUPPLY' | 'TOTAL'

    const pool = getErpPool();
    await ensureFinancialReportSchema(pool);

    const taxPayParams: any[] = [];
    let taxPayWhere = `WHERE 1=1`;
    if (year !== "ALL") {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      taxPayParams.push(yearStart, yearEnd, String(year));
      taxPayWhere += ` AND ((pay_date >= $${taxPayParams.length - 2}::date AND pay_date <= $${taxPayParams.length - 1}::date) OR COALESCE(attribution_year, SUBSTRING(pay_date::text, 1, 4)) = $${taxPayParams.length})`;
    }
    if (entityType !== "ALL") {
      taxPayParams.push(entityType);
      taxPayWhere += ` AND COALESCE(entity_type, 'CORP') = $${taxPayParams.length}`;
    }

    const invParams: any[] = [];
    let invWhere = `WHERE 1=1`;
    if (year !== "ALL") {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      invParams.push(yearStart, yearEnd);
      invWhere += ` AND issue_date >= $${invParams.length - 1}::date AND issue_date <= $${invParams.length}::date`;
    }
    if (entityType !== "ALL") {
      invParams.push(entityType);
      invWhere += ` AND COALESCE(supplier_entity_type, 'CORP') = $${invParams.length}`;
    }

    const bankParams: any[] = [];
    let bankWhere = `WHERE 1=1`;
    if (year !== "ALL") {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      bankParams.push(yearStart, yearEnd);
      bankWhere += ` AND trans_date >= $${bankParams.length - 1}::date AND trans_date <= $${bankParams.length}::date`;
    }
    if (entityType !== "ALL") {
      bankParams.push(entityType);
      bankWhere += ` AND COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) = $${bankParams.length}`;
    }

    const endCutoff = year === "ALL" ? "2099-12-31" : `${year}-12-31`;
    const startCutoff = year === "ALL" ? "1900-01-01" : `${Number(year) - 1}-12-31`;

    // 0~2-3. 독립 DB 조회 7건을 Promise.all로 병렬 실행
    const [
      remarkRes,
      allTaxPayRes,
      invRes,
      bankRes,
      balEndRes,
      balStartRes,
      rentalAssetRes,
    ] = await Promise.all([
      pool.query(
        `SELECT remark_text,
                COALESCE(tax_withholding, 0)::numeric AS tax_withholding,
                COALESCE(tax_vat, 0)::numeric AS tax_vat,
                COALESCE(tax_corporate, 0)::numeric AS tax_corporate,
                COALESCE(tax_payment, 0)::numeric AS tax_payment,
                updated_at
         FROM erp_financial_remarks
         WHERE year = $1 AND entity_type = $2
         LIMIT 1`,
        [year, entityType]
      ),
      pool.query(
        `SELECT id,
                COALESCE(entity_type, 'CORP') AS entity_type,
                pay_date::text AS pay_date,
                tax_type,
                sub_account,
                taxpayer_name,
                COALESCE(pay_amount, 0)::numeric AS pay_amount,
                electronic_pay_no,
                attribution_year,
                tax_office,
                remark
         FROM erp_tax_payments
         ${taxPayWhere}
         ORDER BY pay_date ASC, id ASC`,
        taxPayParams
      ),
      pool.query(
        `SELECT id, invoice_no, COALESCE(io_type, 'SALE') AS io_type,
                COALESCE(domain_type, 'OP_SERVICE') AS domain_type,
                COALESCE(supplier_entity_type, 'CORP') AS entity_type,
                issue_date::text AS issue_date,
                customer_name, item_name, memo,
                COALESCE(supply_amount, 0)::numeric AS supply_amount,
                COALESCE(vat_amount, 0)::numeric AS vat_amount,
                COALESCE(total_amount, 0)::numeric AS total_amount,
                COALESCE(settled_amount, 0)::numeric AS reconciled_amount,
                COALESCE(settlement_status, 'UNPAID') AS settlement_status
         FROM erp_tax_invoices
         ${invWhere}
         ORDER BY issue_date ASC, id ASC`,
        invParams
      ),
      pool.query(
        `SELECT id,
                COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) AS entity_type,
                account_no, trans_date::text AS trans_date, trans_time, trans_type,
                COALESCE(withdrawal_amount, 0)::numeric AS withdrawal_amount,
                COALESCE(deposit_amount, 0)::numeric AS deposit_amount,
                COALESCE(balance_after, 0)::numeric AS balance_after,
                sender_receiver, counterparty_holder, counterparty_bank, counterparty_account,
                tx_channel, memo, is_matched, matched_type, matched_id
         FROM erp_bank_transactions
         ${bankWhere}
         ORDER BY trans_date ASC, trans_time ASC, id ASC`,
        bankParams
      ),
      pool.query(
        `SELECT DISTINCT ON (account_no)
                account_no,
                COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) AS entity_type,
                COALESCE(balance_after, 0)::numeric AS balance_after,
                trans_date::text AS trans_date
         FROM erp_bank_transactions
         WHERE trans_date <= $1
         ORDER BY account_no, trans_date DESC, trans_time DESC, id DESC`,
        [endCutoff]
      ),
      pool.query(
        `SELECT DISTINCT ON (account_no)
                account_no,
                COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) AS entity_type,
                COALESCE(balance_after, 0)::numeric AS balance_after,
                trans_date::text AS trans_date
         FROM erp_bank_transactions
         WHERE trans_date <= $1
         ORDER BY account_no, trans_date DESC, trans_time DESC, id DESC`,
        [startCutoff]
      ),
      pool
        .query(
          `
          SELECT a.id,
                 a.asset_no,
                 a.rental_product_id,
                 rp.model_code,
                 rp.model_name,
                 a.status,
                 a.acquisition_date::text AS acquisition_date,
                 a.disposed_date::text AS disposed_date,
                 COALESCE(a.acquisition_cost, 0)::numeric AS acquisition_cost,
                 COALESCE(a.salvage_value, 0)::numeric AS salvage_value,
                 COALESCE(a.useful_life_years, 4)::int AS useful_life_years,
                 a.useful_life_months,
                 COALESCE(a.monthly_depreciation, 0)::numeric AS monthly_depreciation,
                 a.supplier,
                 a.memo
          FROM erp_rental_assets a
          LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
          WHERE a.acquisition_date <= $1::date
            AND COALESCE(a.acquisition_cost, 0) > 0
          ORDER BY a.acquisition_date ASC, a.id ASC
        `,
          [endCutoff]
        )
        .catch(() => ({ rows: [] as any[] })),
    ]);

    const remarkRow = remarkRes.rows[0] || {
      remark_text: "",
      tax_withholding: 0,
      tax_vat: 0,
      tax_corporate: 0,
      tax_payment: 0,
      updated_at: null,
    };

    const taxItems = {
      withholdingTax: Number(remarkRow.tax_withholding || 0), // 원천세 (초기값 0)
      vatTax: Number(remarkRow.tax_vat || 0),                 // 부가세 (초기값 0)
      corporateTax: Number(remarkRow.tax_corporate || 0),     // 법인세 (초기값 0)
      taxPayment: Number(remarkRow.tax_payment || 0),         // 납부항목 (초기값 0)
    };

    // 실제 해당 연도에 통장에서 납부된 세무 내역 (CF 현금흐름표 및 2기 예정고지 납부액용)
    const taxPayRows = allTaxPayRes.rows.filter((r: any) =>
      year === "ALL" ? true : String(r.pay_date || "").startsWith(`${year}-`)
    );
    // 귀속연도(attribution_year) 기준 세무 내역 (PL 손익계산서 및 월별 집계용)
    const attrTaxPayRows = allTaxPayRes.rows.filter((r: any) =>
      year === "ALL"
        ? true
        : String(r.attribution_year || String(r.pay_date || "").slice(0, 4)) === String(year)
    );

    let cashEnding = 0;
    let cashEndingCorp = 0;
    let cashEndingIndiv = 0;
    for (const r of balEndRes.rows) {
      if (entityType !== "ALL" && r.entity_type !== entityType) continue;
      const b = Number(r.balance_after || 0);
      cashEnding += b;
      if (r.entity_type === "CORP") cashEndingCorp += b;
      else cashEndingIndiv += b;
    }

    let cashBeginning = 0;
    for (const r of balStartRes.rows) {
      if (entityType !== "ALL" && r.entity_type !== entityType) continue;
      cashBeginning += Number(r.balance_after || 0);
    }

    const activeRentalAssets =
      entityType === "INDIVIDUAL" ? [] : rentalAssetRes.rows;

    const payload = await buildFinancialReportPayload({
      pool,
      year,
      entityType,
      amountBasis,
      currentYearStr,
      endCutoff,
      remarkRow,
      taxItems,
      invRows: invRes.rows,
      bankRows: bankRes.rows,
      taxPayRows,
      attrTaxPayRows,
      activeRentalAssets,
      cashEnding,
      cashEndingCorp,
      cashEndingIndiv,
      cashBeginning,
    });

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("GET Financial Report Error:", error);
    return NextResponse.json(
      { error: "경영지표 보고서 조회 실패: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireMenuPermission(
      request,
      ["financial_report", "FINANCIAL_REPORT"],
      "save"
    );
    if (!guard.authorized) {
      return guard.response!;
    }

    const contentType = request.headers.get("content-type") || "";
    const pool = getErpPool();

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const defaultEntityRaw = String(formData.get("entityType") || "CORP").toUpperCase();
      const defaultEntity: "CORP" | "INDIVIDUAL" =
        defaultEntityRaw === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";

      if (!file) {
        return NextResponse.json(
          { error: "업로드할 국세청 납부세액 엑셀/CSV 파일이 없습니다." },
          { status: 400 }
        );
      }

      const fileName = file.name.toLowerCase();
      const arrayBuf = await file.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      const uint8 = new Uint8Array(arrayBuf);

      let rows: string[][] = [];
      const isZipXlsx = uint8.length >= 2 && uint8[0] === 0x50 && uint8[1] === 0x4b;
      const isOleXls = uint8.length >= 4 && uint8[0] === 0xd0 && uint8[1] === 0xcf;

      if (isZipXlsx || isOleXls) {
        try {
          const wb = XLSX.read(buf, { type: "buffer", raw: false });
          const sheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[sheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          rows = rawRows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "").trim()) : []));
        } catch {
          rows = parseXlsxBufferToRows(buf);
        }
      } else {
        const text = decodeTextBuffer(buf);
        if (text.includes("<table") || text.includes("<tr")) {
          const wb = XLSX.read(text, { type: "string", raw: false });
          const sheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[sheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          rows = rawRows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "").trim()) : []));
        } else {
          rows = parseCsvOrTsvTextToRows(text);
        }
      }

      const parsedRows = parseHometaxTaxPaymentRows(rows, defaultEntity);
      if (parsedRows.length === 0) {
        return NextResponse.json(
          {
            error:
              "파일에서 유효한 국세청 납부세액 내역(납부일자, 세목, 납부세액)을 찾지 못했습니다.",
          },
          { status: 400 }
        );
      }

      await ensureFinancialReportSchema(pool);

      let upsertedCount = 0;
      const touchedYears = new Set<string>();

      for (const item of parsedRows) {
        await pool.query(
          `INSERT INTO erp_tax_payments (
            entity_type, pay_date, tax_type, sub_account, taxpayer_name, pay_amount,
            electronic_pay_no, attribution_year, tax_office,
            national_tax, education_tax, defense_tax, rural_special_tax, surcharge, remark, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
          ON CONFLICT (electronic_pay_no, pay_date, pay_amount)
          DO UPDATE SET
            entity_type = EXCLUDED.entity_type,
            tax_type = EXCLUDED.tax_type,
            sub_account = EXCLUDED.sub_account,
            taxpayer_name = EXCLUDED.taxpayer_name,
            attribution_year = EXCLUDED.attribution_year,
            tax_office = EXCLUDED.tax_office,
            national_tax = EXCLUDED.national_tax,
            education_tax = EXCLUDED.education_tax,
            defense_tax = EXCLUDED.defense_tax,
            rural_special_tax = EXCLUDED.rural_special_tax,
            surcharge = EXCLUDED.surcharge,
            remark = EXCLUDED.remark,
            updated_at = NOW()`,
          [
            item.entityType,
            item.payDate,
            item.taxType,
            item.subAccount,
            item.taxpayerName,
            item.payAmount,
            item.electronicPayNo,
            item.attributionYear,
            item.taxOffice,
            item.nationalTax,
            item.educationTax,
            item.defenseTax,
            item.ruralSpecialTax,
            item.surcharge,
            item.remark,
          ]
        );
        upsertedCount++;
        touchedYears.add(item.payDate.slice(0, 4));
      }

      // 연도별 합계를 사업자별 및 전체('ALL')로 erp_financial_remarks에 동기화
      const syncRes = await pool.query(`
        SELECT SUBSTRING(pay_date::text, 1, 4) AS yr,
               entity_type,
               SUM(CASE WHEN sub_account = '원천세' THEN pay_amount ELSE 0 END)::numeric AS wth,
               SUM(CASE WHEN sub_account = '부가세' THEN pay_amount ELSE 0 END)::numeric AS vat,
               SUM(CASE WHEN sub_account = '법인세' THEN pay_amount ELSE 0 END)::numeric AS corp,
               SUM(CASE WHEN sub_account = '납부항목' THEN pay_amount ELSE 0 END)::numeric AS etc
        FROM erp_tax_payments
        GROUP BY SUBSTRING(pay_date::text, 1, 4), entity_type
      `);

      for (const s of syncRes.rows) {
        await pool.query(
          `INSERT INTO erp_financial_remarks (
            year, entity_type, remark_text, tax_withholding, tax_vat, tax_corporate, tax_payment, updated_by, updated_at
          ) VALUES ($1, $2, '', $3, $4, $5, $6, 'TAX_UPLOAD', NOW())
          ON CONFLICT (year, entity_type)
          DO UPDATE SET
            tax_withholding = EXCLUDED.tax_withholding,
            tax_vat = EXCLUDED.tax_vat,
            tax_corporate = EXCLUDED.tax_corporate,
            tax_payment = EXCLUDED.tax_payment,
            updated_by = 'TAX_UPLOAD',
            updated_at = NOW()`,
          [s.yr, s.entity_type, s.wth, s.vat, s.corp, s.etc]
        );
      }

      const syncAllRes = await pool.query(`
        SELECT SUBSTRING(pay_date::text, 1, 4) AS yr,
               SUM(CASE WHEN sub_account = '원천세' THEN pay_amount ELSE 0 END)::numeric AS wth,
               SUM(CASE WHEN sub_account = '부가세' THEN pay_amount ELSE 0 END)::numeric AS vat,
               SUM(CASE WHEN sub_account = '법인세' THEN pay_amount ELSE 0 END)::numeric AS corp,
               SUM(CASE WHEN sub_account = '납부항목' THEN pay_amount ELSE 0 END)::numeric AS etc
        FROM erp_tax_payments
        GROUP BY SUBSTRING(pay_date::text, 1, 4)
      `);

      for (const s of syncAllRes.rows) {
        await pool.query(
          `INSERT INTO erp_financial_remarks (
            year, entity_type, remark_text, tax_withholding, tax_vat, tax_corporate, tax_payment, updated_by, updated_at
          ) VALUES ($1, 'ALL', '', $2, $3, $4, $5, 'TAX_UPLOAD', NOW())
          ON CONFLICT (year, entity_type)
          DO UPDATE SET
            tax_withholding = EXCLUDED.tax_withholding,
            tax_vat = EXCLUDED.tax_vat,
            tax_corporate = EXCLUDED.tax_corporate,
            tax_payment = EXCLUDED.tax_payment,
            updated_by = 'TAX_UPLOAD',
            updated_at = NOW()`,
          [s.yr, s.wth, s.vat, s.corp, s.etc]
        );
      }

      return NextResponse.json({
        success: true,
        parsedCount: parsedRows.length,
        upsertedCount,
        years: Array.from(touchedYears).sort(),
        message: `국세청 납부세액 ${upsertedCount}건 업로드 및 세무 계정 집계가 완료되었습니다.`,
      });
    }

    const body = await request.json();
    const {
      year = String(new Date().getFullYear()),
      entityType = "ALL",
      remarkText = "",
      taxWithholding = 0,
      taxVat = 0,
      taxCorporate = 0,
      taxPayment = 0,
      updatedBy = "ADMIN",
    } = body;

    await pool.query(
      `INSERT INTO erp_financial_remarks (
        year, entity_type, remark_text, tax_withholding, tax_vat, tax_corporate, tax_payment, updated_by, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (year, entity_type)
      DO UPDATE SET
        remark_text = EXCLUDED.remark_text,
        tax_withholding = EXCLUDED.tax_withholding,
        tax_vat = EXCLUDED.tax_vat,
        tax_corporate = EXCLUDED.tax_corporate,
        tax_payment = EXCLUDED.tax_payment,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()`,
      [
        year,
        entityType,
        remarkText,
        Number(taxWithholding || 0),
        Number(taxVat || 0),
        Number(taxCorporate || 0),
        Number(taxPayment || 0),
        updatedBy,
      ]
    );

    return NextResponse.json({
      success: true,
      message: `${year === "ALL" ? "전체 연도" : year + "년"} 재무제표 주석(Remark) 및 세무 항목이 저장되었습니다.`,
    });
  } catch (error: any) {
    console.error("POST Financial Remark Error:", error);
    return NextResponse.json(
      { error: "주석 및 세무 항목 저장 실패: " + error.message },
      { status: 500 }
    );
  }
}
