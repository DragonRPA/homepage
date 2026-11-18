export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getErpPool } from "@/lib/supabaseErp";
import { ensureErpCoreIndexes, runSchemaInitOnce } from "@/lib/erpSchemaCache";
import { requireMenuPermission } from "@/lib/erpRbacGuard";
import { resolveExplicitAccountSubject } from "@/lib/erpAccountSubjects";
import { BUSINESS_ENTITIES } from "@/lib/businessEntities";
import {
  parseXlsxBufferToRows,
  decodeTextBuffer,
  parseCsvOrTsvTextToRows,
} from "@/lib/ibkBankParser";
import {
  computeAssetMonthlyDeprecForYm,
  computeAssetDisposalLossForYm,
  computeAssetAccumDeprecAsOf,
  resolveUsefulLifeMonths,
  buildMonthlyAssetRollForwardSchedule,
  classifyRentalSalesInvoice,
  buildRentalSalesSeparationAndModelRevenue,
} from "@/lib/erpDepreciation";

import {
  FinancialDetailItem,
  isCapitalizedAssetPurchaseInvoice,
  getPartialCapitalizedInvoiceSupply,
  isCapitalizedBankCardTx,
  classifyTaxPaymentSubAccount,
  parseTaxPayDate,
  parseTaxPayNum,
  ParsedTaxPaymentRow,
  parseHometaxTaxPaymentRows,
  classifyPurchaseInvoiceSubAccount,
  classifyBankTxAccount,
  isVatInclusiveBankExpense,
} from "./financialReportEngine";
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
    const taxPayRes = {
      rows: allTaxPayRes.rows.filter((r: any) =>
        year === "ALL" ? true : String(r.pay_date || "").startsWith(`${year}-`)
      ),
    };
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

    const details: FinancialDetailItem[] = [];

    // 채권(매출 미수금) / 채무(매입 미지급금) 집계 (BS용)
    let accountsReceivable = 0;
    let accountsPayable = 0;

    // 3. 세금계산서 분류 적재 (예정/미수금 포함 정상 처리 가정)
    for (const row of invRes.rows) {
      const ym = String(row.issue_date).slice(0, 7);
      const supply = Number(row.supply_amount || 0);
      const vat = Number(row.vat_amount || 0);
      const total = Number(row.total_amount || supply + vat);
      const reconciled = Number(row.reconciled_amount || 0);
      const remain = row.settlement_status === "PAID" ? 0 : Math.max(0, total - reconciled);
      const ent = (row.entity_type === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP") as "CORP" | "INDIVIDUAL";

      if (row.io_type === "SALE") {
        accountsReceivable += remain;
        let subAccount = "운영·유지보수 용역매출";
        let rentalTypeBadge = "";
        if (row.domain_type === "RENTAL") {
          const rentalCls = classifyRentalSalesInvoice(row);
          if (rentalCls.categoryCode === "OWNED_ASSET_RENTAL") {
            subAccount = "자사 렌탈자산 임대매출";
            const modelSummary = rentalCls.modelAttributions
              .map((a) => `${a.modelCode}(₩${a.amount.toLocaleString()})`)
              .join(", ");
            rentalTypeBadge = modelSummary ? ` [귀속모델: ${modelSummary}]` : "";
          } else if (rentalCls.categoryCode === "SUBLEASE_RENTAL") {
            subAccount = "전대·외부임차 임대매출";
          } else if (rentalCls.categoryCode === "RENTAL_OP_SERVICE") {
            subAccount = "렌탈 단기용역·작업비 매출";
          } else {
            subAccount = "렌탈 부대 상품·장비 판매매출";
          }
        } else if (row.domain_type === "TRADE_SALE") subAccount = "상품·장비 판매매출";
        else if (row.domain_type === "DEV_SERVICE") subAccount = "SI·개발 용역매출";

        details.push({
          id: `INV-${row.id}`,
          source: "TAX_INVOICE",
          entityType: ent,
          yearMonth: ym,
          date: row.issue_date,
          majorAccount: "REVENUE",
          subAccount,
          counterparty: row.customer_name || "-",
          description: `${row.item_name || row.memo || "매출 세금계산서"}${rentalTypeBadge}`,
          supplyAmount: supply,
          vatAmount: vat,
          totalAmount: total,
          status: row.settlement_status === "PAID" ? "수납완료" : "수납예정(정상가정)",
          refNo: row.invoice_no || `INV-${row.id}`,
        });
      } else {
        accountsPayable += remain;
        const isCapex = isCapitalizedAssetPurchaseInvoice(
          row.customer_name || "",
          row.item_name || "",
          row.memo || "",
          row.invoice_no || ""
        );
        const partialCapSupply = !isCapex
          ? getPartialCapitalizedInvoiceSupply(
              row.customer_name || "",
              row.item_name || "",
              row.invoice_no || "",
              supply
            )
          : 0;
        if (isCapex) {
          // 임대용 유형/무형자산 취득(CAPEX) 건은 즉시 매출원가(COGS)로 비용 처리하지 않고 BS 자산 등록 후 월별 감가상각비로 인식
          details.push({
            id: `INV-${row.id}`,
            source: "TAX_INVOICE",
            entityType: ent,
            yearMonth: ym,
            date: row.issue_date,
            majorAccount: "NON_OP",
            subAccount: "임대자산취득(자산화)",
            counterparty: row.customer_name || "-",
            description: `${row.item_name || row.memo || "매입 세금계산서"} [임대자산 자산화 → 월별 감가상각 반영]`,
            supplyAmount: supply,
            vatAmount: vat,
            totalAmount: total,
            status: "자산화(감가상각대상)",
            refNo: row.invoice_no || `INV-${row.id}`,
          });
        } else if (partialCapSupply > 0 && partialCapSupply < supply) {
          const capVat = Math.round(partialCapSupply * 0.1);
          const capTotal = partialCapSupply + capVat;
          const remSupply = supply - partialCapSupply;
          const remVat = vat - capVat;
          const remTotal = total - capTotal;
          const cls = classifyPurchaseInvoiceSubAccount(
            row.customer_name || "",
            row.item_name || "",
            row.memo || ""
          );
          details.push({
            id: `INV-${row.id}-CAPEX`,
            source: "TAX_INVOICE",
            entityType: ent,
            yearMonth: ym,
            date: row.issue_date,
            majorAccount: "NON_OP",
            subAccount: "임대자산취득(자산화)",
            counterparty: row.customer_name || "-",
            description: `${row.item_name || row.memo || "매입 세금계산서"} (임대자산 자산화분) [임대자산 자산화 → 월별 감가상각 반영]`,
            supplyAmount: partialCapSupply,
            vatAmount: capVat,
            totalAmount: capTotal,
            status: "자산화(감가상각대상)",
            refNo: row.invoice_no || `INV-${row.id}`,
          });
          details.push({
            id: `INV-${row.id}`,
            source: "TAX_INVOICE",
            entityType: ent,
            yearMonth: ym,
            date: row.issue_date,
            majorAccount: cls.majorAccount,
            subAccount: cls.subAccount,
            counterparty: row.customer_name || "-",
            description: `${row.item_name || row.memo || "매입 세금계산서"} (자산화 외 잔여분)`,
            supplyAmount: remSupply,
            vatAmount: remVat,
            totalAmount: remTotal,
            status: row.settlement_status === "PAID" ? "지급완료" : "지급예정(정상가정)",
            refNo: row.invoice_no || `INV-${row.id}`,
          });
        } else {
          const cls = classifyPurchaseInvoiceSubAccount(
            row.customer_name || "",
            row.item_name || "",
            row.memo || ""
          );
          details.push({
            id: `INV-${row.id}`,
            source: "TAX_INVOICE",
            entityType: ent,
            yearMonth: ym,
            date: row.issue_date,
            majorAccount: cls.majorAccount,
            subAccount: cls.subAccount,
            counterparty: row.customer_name || "-",
            description: row.item_name || row.memo || "매입 세금계산서",
            supplyAmount: supply,
            vatAmount: vat,
            totalAmount: total,
            status: row.settlement_status === "PAID" ? "지급완료" : "지급예정(정상가정)",
            refNo: row.invoice_no || `INV-${row.id}`,
          });
        }
      }
    }

    // 4. 통장 입출금(급여, 4대보험, 카드/경비 등) 분류 적재 및 현금흐름(CF) 집계
    let cfSaleInflow = 0;
    let cfOtherOperatingInflow = 0;
    let cfPurchaseOutflow = 0;
    let cfPayrollOutflow = 0;
    let cfOpexOutflow = 0;
    let cfTaxOutflow = taxItems.withholdingTax + taxItems.vatTax + taxItems.corporateTax + taxItems.taxPayment;
    let cfInvestingInflow = 0;
    let cfInvestingOutflow = 0;
    let cfFinancingInflow = 0;
    let cfFinancingOutflow = 0;

    for (const row of bankRes.rows) {
      const wAmt = Number(row.withdrawal_amount || 0);
      const dAmt = Number(row.deposit_amount || 0);
      const isMatched = Boolean(row.is_matched);
      const matchedType = String(row.matched_type || "");
      const sr = String(row.sender_receiver || "").replace(/\u3000/g, " ").trim();
      const holder = String(row.counterparty_holder || "").replace(/\u3000/g, " ").trim();
      const memo = String(row.memo || "").trim();
      const combined = `${sr} ${holder} ${memo}`;

      // CF (현금흐름표) 실제 통장 입출금 기준 집계
      const cls = classifyBankTxAccount(row);
      if (isMatched && matchedType === "SALE_INVOICE") {
        cfSaleInflow += dAmt;
      } else if (isMatched && matchedType === "PURCHASE_INVOICE") {
        // 2024-07-09 이명옥 출금 2,660,000원(#128)은 임차보증금 잔금 2,000,000원 + 1회차 선납임차료 660,000원 복합 지급건
        if (Number(row.id) === 128 && wAmt === 2660000) {
          cfPurchaseOutflow += 660000;
          cfInvestingOutflow += 2000000;
        } else if (
          /삼원아이엔지|진진씨앤씨|에이브이랜드|키타드에스이/.test(combined) ||
          row.matched_id === "PX260309-581912" ||
          row.matched_id === "PX260311-529669" ||
          row.matched_id === "PX250801-415385" ||
          row.matched_id === "PX241120-587365" ||
          row.matched_id === "101" ||
          row.matched_id === "99" ||
          row.matched_id === "151" ||
          row.matched_id === "56"
        ) {
          // 임대용 자산 취득(65인치 TV, 한글 라이선스, EB-FH08 프로젝터, 55인치 TV 10대) 대금 지급은 투자활동 현금유출로 분류
          cfInvestingOutflow += wAmt;
        } else if (row.matched_id === "PX250904-e4wcph" || row.matched_id === "137" || Number(row.id) === 259) {
          // 엠디케이팩토리 2025-09-08 이체분 중 RAM-001(40개) + RAM-002(10개) 자산화분(공급가 1,650,000 + 부가세 165,000 = 1,815,000원)은 투자활동 현금유출
          const capPortion = Math.min(wAmt, 1815000);
          cfInvestingOutflow += capPortion;
          cfPurchaseOutflow += Math.max(0, wAmt - capPortion);
        } else if (row.matched_id === "PX250904-jt555a" || row.matched_id === "138" || Number(row.id) === 247) {
          // 엠디케이팩토리 2025-09-10 이체분 중 SSD-001(3개) 자산화분(공급가 108,000 + 부가세 10,800 = 118,800원)은 투자활동 현금유출
          const capPortion = Math.min(wAmt, 118800);
          cfInvestingOutflow += capPortion;
          cfPurchaseOutflow += Math.max(0, wAmt - capPortion);
        } else if (row.matched_id === "PX251128-f3631k" || row.matched_id === "120" || Number(row.id) === 171) {
          // 비엔솔루션 2025-12-01 이체분(528,000원): SSD-002(7개, 420,000원) + RAM-003(12개, 60,000원) = 공급가 480,000원(합계 528,000원) 전액 투자활동 현금유출
          cfInvestingOutflow += wAmt;
        } else {
          cfPurchaseOutflow += wAmt;
        }
      } else if (
        cls &&
        (/보증금/.test(cls.subAccount) || cls.subAccount === "임대자산취득(자산화)")
      ) {
        cfInvestingInflow += dAmt;
        cfInvestingOutflow += wAmt;
      } else if (
        cls &&
        /자본금|가수금|대표자/.test(cls.subAccount)
      ) {
        cfFinancingInflow += dAmt;
        cfFinancingOutflow += wAmt;
      } else if (cls) {
        if (cls.majorAccount === "PAYROLL") {
          cfPayrollOutflow += wAmt - dAmt;
        } else if (cls.majorAccount === "COGS") {
          cfPurchaseOutflow += wAmt - dAmt;
        } else if (cls.majorAccount === "OPEX") {
          cfOpexOutflow += wAmt - dAmt;
        } else if (cls.majorAccount === "NON_OP") {
          cfOtherOperatingInflow += dAmt;
        }
      }

      if (!cls) continue;

      const ym = String(row.trans_date).slice(0, 7);
      const rawAmt = wAmt > 0 ? wAmt : dAmt;
      const signedAmt = rawAmt * cls.sign;
      const ent = (row.entity_type === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP") as "CORP" | "INDIVIDUAL";

      const isVatInc = isVatInclusiveBankExpense(row, cls);
      const bankVat = isVatInc ? Math.round(signedAmt / 11) : 0;
      const bankSupply = signedAmt - bankVat;

      details.push({
        id: `BANK-${row.id}`,
        source: "BANK_TX",
        entityType: ent,
        yearMonth: ym,
        date: row.trans_date,
        majorAccount: cls.majorAccount,
        subAccount: cls.subAccount,
        counterparty: row.counterparty_holder || row.sender_receiver || "-",
        description: `${row.sender_receiver}${row.memo ? ` (${row.memo})` : ""}`,
        supplyAmount: bankSupply,
        vatAmount: bankVat,
        totalAmount: signedAmt,
        status: row.is_matched ? `매칭완료 (${row.matched_id || row.matched_type})` : "통장집행",
        refNo: row.matched_id || `${row.tx_channel || "통장"}-${row.id}`,
      });
    }

    // 4-2. 국세청 납부세액(erp_tax_payments) 전표 적재 (귀속연도 기준 매칭)
    let interimPrepaidCorpTax = 0;
    for (const row of attrTaxPayRows) {
      const payYr = String(row.pay_date).slice(0, 4);
      const attrYr = String(row.attribution_year || payYr);
      // 다음 해 초(1~4월)에 확정 납부된 전년도 귀속 세액은 해당 귀속연도의 12월 결산월에 귀속 표시
      const ym =
        year !== "ALL" && payYr !== String(year) && attrYr === String(year)
          ? `${year}-12`
          : String(row.pay_date).slice(0, 7);
      const amt = Number(row.pay_amount || 0);
      const ent = (row.entity_type === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP") as "CORP" | "INDIVIDUAL";
      const subAcc = (row.sub_account || classifyTaxPaymentSubAccount(row.tax_type)) as
        | "원천세"
        | "부가세"
        | "법인세"
        | "납부항목";

      const isInterimCorpTax =
        subAcc === "법인세" &&
        (/중간예납/.test(String(row.tax_type || "")) || String(row.pay_date).slice(5, 7) === "08");
      if (isInterimCorpTax) {
        interimPrepaidCorpTax += amt;
      }

      details.push({
        id: `TAXPAY-${row.id}`,
        source: "TAX_PAYMENT",
        entityType: ent,
        yearMonth: ym,
        date: row.pay_date,
        majorAccount: "TAX_DUES",
        subAccount: subAcc,
        counterparty: row.tax_office ? `국세청 (${row.tax_office})` : "국세청",
        description: `${row.tax_type}${row.attribution_year ? ` [귀속:${row.attribution_year}년]` : ""}${payYr !== attrYr ? ` (실납부:${row.pay_date})` : ""}${row.electronic_pay_no ? ` (${row.electronic_pay_no})` : ""}`,
        supplyAmount: amt,
        vatAmount: 0,
        totalAmount: amt,
        status: isInterimCorpTax ? "선급법인세(중간예납)" : "납부완료",
        refNo: row.electronic_pay_no || `TAX-${row.id}`,
      });
    }

    // 5. 대상 월 목록 구성
    const monthSet = new Set<string>();
    if (year !== "ALL") {
      for (let m = 1; m <= 12; m++) {
        monthSet.add(`${year}-${String(m).padStart(2, "0")}`);
      }
    } else {
      for (const d of details) {
        if (d.yearMonth) monthSet.add(d.yearMonth);
      }
      for (const ast of activeRentalAssets) {
        if (ast.acquisition_date) monthSet.add(String(ast.acquisition_date).slice(0, 7));
      }
    }
    const months = Array.from(monthSet).sort();
    const lastReportYm = months.length > 0 ? months[months.length - 1] : `${currentYearStr}-12`;
    const bsDepreciationCutoff =
      year === "ALL" ? `${lastReportYm}-31` : endCutoff;

    let tangibleAssets = 0;
    let accumDepreciation = 0;
    for (const ast of activeRentalAssets) {
      // 기준일(bsDepreciationCutoff) 이전에 이미 파손/폐기 완료된 자산은 기말 재무상태표(BS) 총유형자산 및 감가상각누계액에서 모두 제각(제거)
      if (ast.disposed_date && String(ast.disposed_date).slice(0, 7) <= bsDepreciationCutoff.slice(0, 7)) {
        continue;
      }
      tangibleAssets += Number(ast.acquisition_cost || 0);
      accumDepreciation += computeAssetAccumDeprecAsOf(ast, bsDepreciationCutoff);
    }

    // 5-2. 임대용 자산 월별 감가상각비(정액법) 전표 생성 및 매출원가(임대자산 감가상각비) 반영
    const rentalSaleInvoicesForSchedule = invRes.rows.filter(
      (r: any) => r.io_type === "SALE" && r.domain_type === "RENTAL"
    );
    const { monthTotalOwnedRevenueMap } = buildRentalSalesSeparationAndModelRevenue(
      rentalSaleInvoicesForSchedule
    );
    const depreciationSchedule = buildMonthlyAssetRollForwardSchedule(
      activeRentalAssets,
      months,
      monthTotalOwnedRevenueMap
    );
    for (const ym of months) {
      // 모델별로 당월 감가상각비를 묶어 전표 가독성 향상
      const modelGroup = new Map<
        string,
        {
          modelName: string;
          supplier: string;
          count: number;
          depSum: number;
          lifeYears: number;
          lifeMonths: number;
          firstNo: string;
          lastNo: string;
        }
      >();
      for (const ast of activeRentalAssets) {
        const dep = computeAssetMonthlyDeprecForYm(ast, ym);
        if (dep <= 0) continue;
        const key = `${ast.rental_product_id || ast.model_code || ast.model_name}`;
        const cur = modelGroup.get(key);
        if (!cur) {
          modelGroup.set(key, {
            modelName: ast.model_name || ast.model_code || "임대자산",
            supplier: ast.supplier || "자사보유",
            count: 1,
            depSum: dep,
            lifeYears: Number(ast.useful_life_years || 4),
            lifeMonths: resolveUsefulLifeMonths(ast),
            firstNo: ast.asset_no,
            lastNo: ast.asset_no,
          });
        } else {
          cur.count += 1;
          cur.depSum += dep;
          cur.lastNo = ast.asset_no;
        }
      }
      for (const [key, grp] of modelGroup.entries()) {
        const rangeLabel =
          grp.count > 1 ? `${grp.firstNo}~${grp.lastNo} (${grp.count}대)` : `${grp.firstNo} (1대)`;
        const lifeLabel =
          grp.lifeMonths <= 1
            ? "1개월 전액상각"
            : grp.lifeMonths % 12 === 0
            ? `내용연수 ${grp.lifeMonths / 12}년(${grp.lifeMonths}개월) 정액법 월할상각`
            : `내용월수 ${grp.lifeMonths}개월 정액법 월할상각`;
        details.push({
          id: `DEP-${ym}-${key}`,
          source: "DEPRECIATION",
          entityType: "CORP",
          yearMonth: ym,
          date: `${ym}-28`,
          majorAccount: "COGS",
          subAccount: "임대자산 감가상각비",
          counterparty: grp.supplier,
          description: `[감가상각] ${grp.modelName} ${rangeLabel} (${lifeLabel})`,
          supplyAmount: grp.depSum,
          vatAmount: 0,
          totalAmount: grp.depSum,
          status: "상각계상(비현금)",
          refNo: grp.firstNo,
        });
      }

      // 파손/폐기(DISPOSED) 자산의 폐기월 잔여 미상각 장부가액 일시 손실 처리
      for (const ast of activeRentalAssets) {
        const lossAmt = computeAssetDisposalLossForYm(ast, ym);
        if (lossAmt <= 0) continue;
        details.push({
          id: `DISP-LOSS-${ym}-${ast.asset_no}`,
          source: "DEPRECIATION",
          entityType: "CORP",
          yearMonth: ym,
          date: String(ast.disposed_date || `${ym}-28`).slice(0, 10),
          majorAccount: "COGS",
          subAccount: "임대자산 감가상각비",
          counterparty: ast.supplier || "자사보유",
          description: `[자산파손·폐기손실] ${ast.model_name || ast.model_code || "임대자산"} ${ast.asset_no} (파손시점 미상각 잔여장부가 일시 비용 반영)`,
          supplyAmount: lossAmt,
          vatAmount: 0,
          totalAmount: lossAmt,
          status: "파손폐기손실(비현금)",
          refNo: ast.asset_no,
        });
      }
    }

    // 6. 계정과목별 월별 매트릭스 집계
    const useTotal = amountBasis === "TOTAL";
    const getVal = (d: FinancialDetailItem) => (useTotal ? d.totalAmount : d.supplyAmount);

    interface AccountRow {
      majorAccount: "REVENUE" | "COGS" | "PAYROLL" | "OPEX" | "TAX_DUES" | "NON_OP";
      subAccount: string;
      monthly: Record<string, number>;
      total: number;
      count: number;
    }

    const rowMap = new Map<string, AccountRow>();
    const ensureRow = (
      majorAccount: AccountRow["majorAccount"],
      subAccount: string
    ): AccountRow => {
      const key = `${majorAccount}__${subAccount}`;
      if (!rowMap.has(key)) {
        const monthly: Record<string, number> = {};
        for (const m of months) monthly[m] = 0;
        rowMap.set(key, { majorAccount, subAccount, monthly, total: 0, count: 0 });
      }
      return rowMap.get(key)!;
    };

    // 기본 표준 하위계정 미리 생성하여 표 구조 일관성 유지 (원천세, 부가세, 법인세, 납부항목 기본 0원 포함)
    const defaultSubAccounts: Array<[AccountRow["majorAccount"], string]> = [
      ["REVENUE", "운영·유지보수 용역매출"],
      ["REVENUE", "상품·장비 판매매출"],
      ["REVENUE", "자사 렌탈자산 임대매출"],
      ["REVENUE", "전대·외부임차 임대매출"],
      ["REVENUE", "렌탈 단기용역·작업비 매출"],
      ["REVENUE", "렌탈 부대 상품·장비 판매매출"],
      ["REVENUE", "SI·개발 용역매출"],
      ["COGS", "관계사 매입·용역원가"],
      ["COGS", "외주용역·전대임차원가"],
      ["COGS", "상품·장비·자재매입원가"],
      ["COGS", "임대자산 감가상각비"],
      ["COGS", "무증빙·카드 상품자재매입"],
      ["PAYROLL", "임직원급여·수당"],
      ["PAYROLL", "퇴직급여·정산"],
      ["PAYROLL", "일용직급여"],
      ["PAYROLL", "4대보험료(기관납부)"],
      ["OPEX", "복리후생비(식대·다과·경조사)"],
      ["OPEX", "임차료·관리비"],
      ["OPEX", "통신비"],
      ["OPEX", "차량유지·렌트비"],
      ["OPEX", "세무·인증·수수료"],
      ["OPEX", "수도광열비(공과금)"],
      ["OPEX", "법인BC카드대금결제"],
      ["OPEX", "소모품·플랫폼·IT구독비"],
      ["OPEX", "체크카드·현장운영경비"],
      ["OPEX", "기타지급수수료·경비"],
      ["TAX_DUES", "원천세"],
      ["TAX_DUES", "부가세"],
      ["TAX_DUES", "법인세"],
      ["TAX_DUES", "납부항목"],
    ];
    for (const [maj, sub] of defaultSubAccounts) {
      ensureRow(maj, sub);
    }

    const monthlyTotals: Record<
      string,
      {
        revenue: number;
        cogs: number;
        grossProfit: number;
        payroll: number;
        opex: number;
        operatingProfit: number;
        taxDues: number;
        netOperatingCash: number;
        nonOp: number;
      }
    > = {};

    for (const m of months) {
      monthlyTotals[m] = {
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        payroll: 0,
        opex: 0,
        operatingProfit: 0,
        taxDues: 0,
        netOperatingCash: 0,
        nonOp: 0,
      };
    }

    for (const d of details) {
      if (!monthlyTotals[d.yearMonth]) continue;
      const val = getVal(d);
      const r = ensureRow(d.majorAccount, d.subAccount);
      r.monthly[d.yearMonth] = (r.monthly[d.yearMonth] || 0) + val;
      r.total += val;
      r.count += 1;

      const mt = monthlyTotals[d.yearMonth];
      if (d.majorAccount === "REVENUE") mt.revenue += val;
      else if (d.majorAccount === "COGS") mt.cogs += val;
      else if (d.majorAccount === "PAYROLL") mt.payroll += val;
      else if (d.majorAccount === "OPEX") mt.opex += val;
      else if (d.majorAccount === "TAX_DUES") mt.taxDues += val;
      else if (d.majorAccount === "NON_OP") mt.nonOp += val;
    }

    // 세무 항목(원천세, 부가세, 법인세, 납부항목): 국세청 납부내역(erp_tax_payments)이 있으면 해당 합계를 우선 반영하고, 없으면 수동 입력(remark) 기본값을 반영
    const rWth = ensureRow("TAX_DUES", "원천세");
    const rVat = ensureRow("TAX_DUES", "부가세");
    const rCorp = ensureRow("TAX_DUES", "법인세");
    const rPay = ensureRow("TAX_DUES", "납부항목");

    if (rWth.count > 0) taxItems.withholdingTax = rWth.total;
    else rWth.total = taxItems.withholdingTax;

    if (rVat.count > 0) taxItems.vatTax = rVat.total;
    else rVat.total = taxItems.vatTax;

    if (rCorp.count > 0) taxItems.corporateTax = rCorp.total;
    else rCorp.total = taxItems.corporateTax;

    if (rPay.count > 0) taxItems.taxPayment = rPay.total;
    else rPay.total = taxItems.taxPayment;

    let grandRevenue = 0;
    let grandCogs = 0;
    let grandPayroll = 0;
    let grandOpex = 0;
    let grandTaxDues =
      taxItems.withholdingTax +
      taxItems.vatTax +
      taxItems.corporateTax +
      taxItems.taxPayment;

    // CF(현금흐름표) 세무 유출은 실제 해당 연도 통장 납부일(pay_date) 기준 집계
    let cfWthOutflow = 0;
    let cfVatOutflow = 0;
    let cfCorpOutflow = 0;
    let cfPayOutflow = 0;
    if (taxPayRes.rows.length > 0) {
      for (const r of taxPayRes.rows) {
        const sub = r.sub_account || classifyTaxPaymentSubAccount(r.tax_type);
        const amt = Number(r.pay_amount || 0);
        if (sub === "원천세") cfWthOutflow += amt;
        else if (sub === "부가세") cfVatOutflow += amt;
        else if (sub === "법인세") cfCorpOutflow += amt;
        else cfPayOutflow += amt;
      }
    } else {
      cfWthOutflow = taxItems.withholdingTax;
      cfVatOutflow = taxItems.vatTax;
      cfCorpOutflow = taxItems.corporateTax;
      cfPayOutflow = taxItems.taxPayment;
    }
    cfTaxOutflow = cfWthOutflow + cfVatOutflow + cfCorpOutflow + cfPayOutflow;

    // 공급가액 기준(K-GAAP) 손익계산서 차감 세액:
    // 1) 부가세: 예수금/대급금 정산이므로 차감 제외
    // 2) 원천세: 통장 실수령액 기준 인건비에서 빠진 근로·퇴직소득세 원천징수분이므로 귀속연도 손익에서 차감하여 세전 총인건비와 일치
    // 3) 법인세: 귀속연도 확정 법인세만 차감하며, 기중 납부한 법인세 중간예납(interimPrepaidCorpTax)은 선급법인세(자산)이므로 손익 차감에서 제외
    // 4) 납부항목(주민세 사업소분 등): 세금과공과 비용으로 차감
    const deductibleCorpTax = Math.max(0, taxItems.corporateTax - interimPrepaidCorpTax);
    const plDeductibleTaxTotal = useTotal
      ? grandTaxDues - interimPrepaidCorpTax
      : taxItems.withholdingTax + deductibleCorpTax + taxItems.taxPayment;
    let grandNonOp = 0;

    for (const m of months) {
      const mt = monthlyTotals[m];
      mt.grossProfit = mt.revenue - mt.cogs;
      mt.operatingProfit = mt.grossProfit - mt.payroll - mt.opex;
      const mWthTax = rWth.monthly[m] || 0;
      // 8월 중간예납 법인세는 선급법인세(자산)이므로 월별 순손익 차감에서 제외
      const mRawCorpTax = rCorp.monthly[m] || 0;
      const mCorpTax = m.endsWith("-08") && interimPrepaidCorpTax > 0 ? Math.max(0, mRawCorpTax - interimPrepaidCorpTax) : mRawCorpTax;
      const mPayTax = rPay.monthly[m] || 0;
      const mDeductibleTax = useTotal
        ? (rVat.monthly[m] || 0) + mWthTax + mCorpTax + mPayTax
        : mWthTax + mCorpTax + mPayTax;
      mt.netOperatingCash = mt.operatingProfit - mDeductibleTax;

      grandRevenue += mt.revenue;
      grandCogs += mt.cogs;
      grandPayroll += mt.payroll;
      grandOpex += mt.opex;
      grandNonOp += mt.nonOp;
    }

    const grandGrossProfit = grandRevenue - grandCogs;
    const grandOperatingProfit = grandGrossProfit - grandPayroll - grandOpex;
    const grandNetIncome = grandOperatingProfit - plDeductibleTaxTotal;

    // 7. 재무제표 (BS / PL / CF / Remark) 구조 생성
    // [PL: 손익계산서]
    const plStatement = {
      revenue: grandRevenue,
      revenueSub: Array.from(rowMap.values()).filter((r) => r.majorAccount === "REVENUE"),
      cogs: grandCogs,
      cogsSub: Array.from(rowMap.values()).filter((r) => r.majorAccount === "COGS"),
      grossProfit: grandGrossProfit,
      grossMarginRate: grandRevenue > 0 ? Number(((grandGrossProfit / grandRevenue) * 100).toFixed(1)) : 0,
      payroll: grandPayroll,
      payrollSub: Array.from(rowMap.values()).filter((r) => r.majorAccount === "PAYROLL"),
      opex: grandOpex,
      opexSub: Array.from(rowMap.values()).filter((r) => r.majorAccount === "OPEX"),
      operatingProfit: grandOperatingProfit,
      operatingMarginRate:
        grandRevenue > 0 ? Number(((grandOperatingProfit / grandRevenue) * 100).toFixed(1)) : 0,
      taxItems: {
        withholdingTax: taxItems.withholdingTax,
        vatTax: taxItems.vatTax,
        corporateTax: taxItems.corporateTax,
        taxPayment: taxItems.taxPayment,
        totalTax: grandTaxDues,
      },
      netIncome: grandNetIncome,
      netMarginRate: grandRevenue > 0 ? Number(((grandNetIncome / grandRevenue) * 100).toFixed(1)) : 0,
    };

    // [BS: 재무상태표 (자산 = 부채 + 자본 보존 항등식 및 연도별 이익잉여금 100% 연속성 보장)]
    // 1) 이전 연도(개업일 ~ 조회연도 전년도 말) 누적 당기순이익을 정밀 계산하여 전기이월이익잉여금(retainedEarningsBefore) 산출
    const isBeforeCorpEstablishment = endCutoff < BUSINESS_ENTITIES.CORP.openDate;
    const isOpeningYear =
      year === "ALL" ||
      (entityType === "CORP" && Number(year) <= 2024) ||
      (entityType !== "CORP" && Number(year) <= 2023);

    let retainedEarningsBefore = 0;

    if (!isOpeningYear && year !== "ALL") {
      const priorCutoff = `${Number(year) - 1}-12-31`;
      const priorParams: any[] = [priorCutoff];
      let priorInvEntitySql = "";
      let priorBankEntitySql = "";
      let priorTaxEntitySql = "";
      if (entityType !== "ALL") {
        priorParams.push(entityType);
        priorInvEntitySql = ` AND COALESCE(supplier_entity_type, 'CORP') = $2`;
        priorBankEntitySql = ` AND COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) = $2`;
        priorTaxEntitySql = ` AND COALESCE(entity_type, 'CORP') = $2`;
      }

      const [priorInvRes, priorBankRes, priorTaxPayRes, priorRemarkRes] = await Promise.all([
        pool.query(
          `SELECT COALESCE(io_type, 'SALE') AS io_type,
                  customer_name,
                  item_name,
                  memo,
                  COALESCE(supply_amount, 0)::numeric AS supply_amount,
                  COALESCE(vat_amount, 0)::numeric AS vat_amount,
                  COALESCE(total_amount, 0)::numeric AS total_amount
           FROM erp_tax_invoices
           WHERE issue_date <= $1::date ${priorInvEntitySql}`,
          priorParams
        ),
        pool.query(
          `SELECT id,
                  COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) AS entity_type,
                  trans_date::text AS trans_date,
                  COALESCE(withdrawal_amount, 0)::numeric AS withdrawal_amount,
                  COALESCE(deposit_amount, 0)::numeric AS deposit_amount,
                  sender_receiver, counterparty_holder, tx_channel, memo, is_matched, matched_type, matched_id
           FROM erp_bank_transactions
           WHERE trans_date <= $1::date ${priorBankEntitySql}`,
          priorParams
        ),
        pool.query(
          `SELECT COALESCE(attribution_year, SUBSTRING(pay_date::text, 1, 4)) AS pyear,
                  pay_date::text AS pay_date,
                  sub_account,
                  tax_type,
                  COALESCE(pay_amount, 0)::numeric AS pay_amount
           FROM erp_tax_payments
           WHERE COALESCE(attribution_year, SUBSTRING(pay_date::text, 1, 4))::int < $1::int ${
             entityType !== "ALL" ? `AND COALESCE(entity_type, 'CORP') = $2` : ""
           }`,
          entityType !== "ALL" ? [Number(year), entityType] : [Number(year)]
        ),
        pool.query(
          `SELECT year,
                  COALESCE(tax_withholding, 0)::numeric AS tax_withholding,
                  COALESCE(tax_vat, 0)::numeric AS tax_vat,
                  COALESCE(tax_corporate, 0)::numeric AS tax_corporate,
                  COALESCE(tax_payment, 0)::numeric AS tax_payment
           FROM erp_financial_remarks
           WHERE year != 'ALL' AND year::int < $1::int AND entity_type = $2`,
          [Number(year), entityType]
        ),
      ]);

      let priorRev = 0;
      let priorCogs = 0;
      let priorPayroll = 0;
      let priorOpex = 0;

      for (const r of priorInvRes.rows) {
        const supply = Number(r.supply_amount || 0);
        const vat = Number(r.vat_amount || 0);
        const total = Number(r.total_amount || supply + vat);
        const val = useTotal ? total : supply;
        if (r.io_type === "SALE") {
          priorRev += val;
        } else {
          if (
            isCapitalizedAssetPurchaseInvoice(
              r.customer_name || "",
              r.item_name || "",
              r.memo || ""
            )
          ) {
            continue;
          }
          const partialCapSupply = getPartialCapitalizedInvoiceSupply(
            r.customer_name || "",
            r.item_name || "",
            "",
            supply
          );
          const adjVal =
            partialCapSupply > 0
              ? Math.max(0, val - (useTotal ? Math.round(partialCapSupply * 1.1) : partialCapSupply))
              : val;
          const cls = classifyPurchaseInvoiceSubAccount(
            r.customer_name || "",
            r.item_name || "",
            r.memo || ""
          );
          if (cls.majorAccount === "COGS") priorCogs += adjVal;
          else if (cls.majorAccount === "OPEX") priorOpex += adjVal;
        }
      }

      // 이전 연도 말(priorCutoff)까지의 누적 감가상각비 반영
      for (const ast of activeRentalAssets) {
        priorCogs += computeAssetAccumDeprecAsOf(ast, priorCutoff);
      }

      for (const r of priorBankRes.rows) {
        const cls = classifyBankTxAccount(r);
        if (!cls) continue;
        const wAmt = Number(r.withdrawal_amount || 0);
        const dAmt = Number(r.deposit_amount || 0);
        const rawAmt = wAmt > 0 ? wAmt : dAmt;
        const signedAmt = rawAmt * cls.sign;
        const isVatInc = isVatInclusiveBankExpense(r, cls);
        const bankVat = isVatInc ? Math.round(signedAmt / 11) : 0;
        const val = useTotal ? signedAmt : signedAmt - bankVat;
        if (cls.majorAccount === "REVENUE") priorRev += val;
        else if (cls.majorAccount === "COGS") priorCogs += val;
        else if (cls.majorAccount === "PAYROLL") priorPayroll += val;
        else if (cls.majorAccount === "OPEX") priorOpex += val;
      }

      // 연도별 세무 항목 합산 (erp_tax_payments가 있는 항목은 실납부액, 없으면 remark 저장값)
      const startYr = entityType === "CORP" ? 2024 : 2023;
      let priorTaxTotal = 0;
      for (let y = startYr; y < Number(year); y++) {
        const yStr = String(y);
        const rem = priorRemarkRes.rows.find((x: any) => String(x.year) === yStr);
        const yPays = priorTaxPayRes.rows.filter((x: any) => String(x.pyear) === yStr);
        const sumSub = (sub: string) =>
          yPays
            .filter((x: any) => (x.sub_account || classifyTaxPaymentSubAccount(x.tax_type)) === sub)
            .reduce((acc: number, cur: any) => acc + Number(cur.pay_amount || 0), 0);
        const cntSub = (sub: string) =>
          yPays.filter((x: any) => (x.sub_account || classifyTaxPaymentSubAccount(x.tax_type)) === sub).length;

        const wth = cntSub("원천세") > 0 ? sumSub("원천세") : Number(rem?.tax_withholding || 0);
        const vat = cntSub("부가세") > 0 ? sumSub("부가세") : Number(rem?.tax_vat || 0);
        const corp = cntSub("법인세") > 0 ? sumSub("법인세") : Number(rem?.tax_corporate || 0);
        const pay = cntSub("납부항목") > 0 ? sumSub("납부항목") : Number(rem?.tax_payment || 0);
        const interimCorp = yPays
          .filter(
            (x: any) =>
              (x.sub_account || classifyTaxPaymentSubAccount(x.tax_type)) === "법인세" &&
              (/중간예납/.test(String(x.tax_type || "")) || String(x.pay_date || "").slice(5, 7) === "08")
          )
          .reduce((acc: number, cur: any) => acc + Number(cur.pay_amount || 0), 0);
        const dedCorp = Math.max(0, corp - interimCorp);
        priorTaxTotal += useTotal ? wth + vat + dedCorp + pay : wth + dedCorp + pay;
      }

      retainedEarningsBefore = priorRev - priorCogs - priorPayroll - priorOpex - priorTaxTotal;
    }

    // 2) 자본총계 = 자본금 + 전기이월이익잉여금 + 당기순이익 (100% 일치 보장)
    const capitalStock =
      entityType === "INDIVIDUAL" || isBeforeCorpEstablishment
        ? BUSINESS_ENTITIES.INDIVIDUAL.capitalStock
        : BUSINESS_ENTITIES.CORP.capitalStock;
    const currentTermNetIncome = grandNetIncome;
    const totalEquity = capitalStock + retainedEarningsBefore + currentTermNetIncome;

    // 3) 부가세(예수금/대급금)는 억지 차액(rawDiff) 수식이 아니라, 당기 2기(07~12월) 실제 매출세액 - 매입세액 - 기납부세액(예정고지)으로 정밀 산출
    let q2SaleVat = 0;
    let q2PurchaseVat = 0;
    for (const row of invRes.rows) {
      const issueDt = String(row.issue_date || "");
      const mo = Number(issueDt.slice(5, 7));
      if (mo >= 7) {
        const v = Number(row.vat_amount || 0);
        if (row.io_type === "SALE") q2SaleVat += v;
        else q2PurchaseVat += v;
      }
    }
    let q2CardDeductibleVat = 0;
    for (const row of bankRes.rows) {
      const transDt = String(row.trans_date || "");
      const mo = Number(transDt.slice(5, 7));
      if (mo < 7) continue;
      const mType = String(row.matched_type || "");
      if (mType === "SALE_INVOICE" || mType === "PURCHASE_INVOICE" || mType === "PAYROLL") continue;
      const ch = String(row.tx_channel || "").trim();
      const sr = String(row.sender_receiver || "").trim();
      if (
        ch === "체크" ||
        ch === "CC" ||
        ch === "BC" ||
        /비씨카드|컴퓨존|옥션|G마켓|11번가|쿠팡|네이버/.test(sr)
      ) {
        const wAmt = Number(row.withdrawal_amount || 0);
        const dAmt = Number(row.deposit_amount || 0);
        q2CardDeductibleVat += Math.round((wAmt - dAmt) / 11);
      }
    }
    let q2PrepaidVatTax = 0;
    for (const row of taxPayRes.rows) {
      const payDt = String(row.pay_date || "");
      const mo = Number(payDt.slice(5, 7));
      const subAcc = row.sub_account || classifyTaxPaymentSubAccount(row.tax_type);
      // 10월~12월 중 납부한 당기 2기 예정고지/예정신고 부가세
      if (mo >= 10 && subAcc === "부가세") {
        q2PrepaidVatTax += Number(row.pay_amount || 0);
      }
    }

    const netQ2Vat = q2SaleVat - q2PurchaseVat - q2CardDeductibleVat - q2PrepaidVatTax;
    const vatPrepaid = (netQ2Vat < 0 ? Math.abs(netQ2Vat) : 0) + interimPrepaidCorpTax;
    const vatTaxPayable = netQ2Vat > 0 ? netQ2Vat : 0;

    // 기말 시점 미납 확정 세액 (예: 2024년 말 기준 2025년 1~4월에 납부된 2024년 귀속 원천세/법인세 미지급금)
    let endWthTaxPayable = 0;
    let endCorpTaxPayable = 0;
    if (year !== "ALL") {
      for (const row of attrTaxPayRows) {
        const payYr = String(row.pay_date || "").slice(0, 4);
        const attrYr = String(row.attribution_year || payYr);
        if (attrYr === String(year) && Number(payYr) > Number(year)) {
          const subAcc = row.sub_account || classifyTaxPaymentSubAccount(row.tax_type);
          const amt = Number(row.pay_amount || 0);
          if (subAcc === "원천세") endWthTaxPayable += amt;
          else if (subAcc === "법인세") endCorpTaxPayable += amt;
        }
      }
    }

    const leaseDeposit =
      !isBeforeCorpEstablishment && (entityType === "CORP" || entityType === "ALL")
        ? 5000000
        : 0;
    const nonCurrentAssets = leaseDeposit + Math.max(0, tangibleAssets - accumDepreciation);
    const currentAssets = cashEnding + accountsReceivable + vatPrepaid;
    const totalAssets = currentAssets + nonCurrentAssets;

    const currentLiabilities = accountsPayable + endWthTaxPayable + vatTaxPayable + endCorpTaxPayable;
    const nonCurrentLiabilities = 0;
    const totalLiabilities = currentLiabilities + nonCurrentLiabilities;

    const bsStatement = {
      assets: {
        cashAndEquivalents: cashEnding,
        cashCorp: cashEndingCorp,
        cashIndiv: cashEndingIndiv,
        accountsReceivable,
        vatPrepaid,
        currentAssets,
        leaseDeposit,
        tangibleAssets,
        accumDepreciation,
        nonCurrentAssets,
        totalAssets,
      },
      liabilities: {
        accountsPayable,
        withholdingTaxPayable: endWthTaxPayable,
        vatTaxPayable,
        corporateTaxPayable: endCorpTaxPayable,
        taxPaymentPayable: 0,
        currentLiabilities,
        nonCurrentLiabilities,
        totalLiabilities,
      },
      equity: {
        capitalStock,
        retainedEarningsBefore,
        currentTermNetIncome,
        totalEquity,
      },
    };

    // [CF: 현금흐름표]
    const operatingCashFlow =
      cfSaleInflow +
      cfOtherOperatingInflow -
      cfPurchaseOutflow -
      cfPayrollOutflow -
      cfOpexOutflow -
      cfTaxOutflow;
    const investingCashFlow = cfInvestingInflow - cfInvestingOutflow;
    const financingCashFlow = cfFinancingInflow - cfFinancingOutflow;
    const netCashChange = cashEnding - cashBeginning;

    const cfStatement = {
      beginningCash: cashBeginning,
      operating: {
        saleInflow: cfSaleInflow,
        otherInflow: cfOtherOperatingInflow,
        purchaseOutflow: cfPurchaseOutflow,
        payrollOutflow: cfPayrollOutflow,
        opexOutflow: cfOpexOutflow,
        withholdingTaxOutflow: cfWthOutflow,
        vatTaxOutflow: cfVatOutflow,
        corporateTaxOutflow: cfCorpOutflow,
        taxPaymentOutflow: cfPayOutflow,
        netOperatingCashFlow: operatingCashFlow,
      },
      investing: {
        inflow: cfInvestingInflow,
        outflow: cfInvestingOutflow,
        netInvestingCashFlow: investingCashFlow,
      },
      financing: {
        inflow: cfFinancingInflow,
        outflow: cfFinancingOutflow,
        netFinancingCashFlow: financingCashFlow,
      },
      netCashChange,
      endingCash: cashEnding,
    };

    return NextResponse.json({
      success: true,
      year,
      entityType,
      amountBasis,
      months,
      accountRows: Array.from(rowMap.values()).filter(
        (r) => r.majorAccount === "TAX_DUES" || r.count > 0 || r.total !== 0
      ),
      monthlyTotals,
      summary: {
        revenue: grandRevenue,
        cogs: grandCogs,
        grossProfit: grandGrossProfit,
        grossMarginRate: grandRevenue > 0 ? Number(((grandGrossProfit / grandRevenue) * 100).toFixed(1)) : 0,
        payroll: grandPayroll,
        opex: grandOpex,
        operatingProfit: grandOperatingProfit,
        operatingMarginRate:
          grandRevenue > 0 ? Number(((grandOperatingProfit / grandRevenue) * 100).toFixed(1)) : 0,
        taxDues: grandTaxDues,
        netOperatingCash: grandNetIncome,
        nonOp: grandNonOp,
      },
      statements: {
        bs: bsStatement,
        pl: plStatement,
        cf: cfStatement,
        remark: {
          text: remarkRow.remark_text || "",
          taxWithholding: taxItems.withholdingTax,
          taxVat: taxItems.vatTax,
          taxCorporate: taxItems.corporateTax,
          taxPayment: taxItems.taxPayment,
          updatedAt: remarkRow.updated_at || null,
        },
      },
      depreciationSchedule,
      details,
    });
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
