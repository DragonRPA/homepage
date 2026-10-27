import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

function computeMonthlyProRata(
  yearMonth: string,
  contractStartDate: string,
  contractEndDate: string,
  monthlyRate: number,
  acquisitionCost: number,
  salvageValue: number,
  usefulLifeYears: number
) {
  const [y, m] = yearMonth.split("-").map(Number);
  const monthStart = `${yearMonth}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;

  const effStart = contractStartDate > monthStart ? contractStartDate : monthStart;
  const effEnd = contractEndDate < monthEnd ? contractEndDate : monthEnd;

  const sDate = new Date(`${effStart}T00:00:00`);
  const eDate = new Date(`${effEnd}T00:00:00`);
  const operatingDays = Math.max(
    0,
    Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const isFullMonth = effStart === monthStart && effEnd === monthEnd;
  const proRataRevenue =
    operatingDays <= 0
      ? 0
      : isFullMonth
      ? Math.round(monthlyRate)
      : Math.min(Math.round(monthlyRate), Math.round((monthlyRate / 30) * operatingDays));

  const depreciationCogs = Math.round(
    (acquisitionCost - salvageValue) / Math.max(1, usefulLifeYears * 12)
  );
  const netMargin = proRataRevenue - depreciationCogs;

  return {
    effStart,
    effEnd,
    operatingDays,
    proRataRevenue,
    depreciationCogs,
    netMargin,
  };
}

// GET /api/erp/inout
// Query params: yearMonth (default current YYYY-MM), lookup (optional assetNo or serialNo)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const yearMonth = searchParams.get("yearMonth") || defaultYm;
    const lookup = (searchParams.get("lookup") || "").trim();
    const mode = (searchParams.get("mode") || "ALL").toUpperCase();

    const pool = getErpPool();

    const [assetsRes, logsRes, partnersRes, billingsRes] = await Promise.all([
      // 1. Fetch all rental assets with product info and active contract info
      pool.query(`
        SELECT
          a.id,
          a.asset_no AS "assetNo",
          a.serial_no AS "serialNo",
          a.rental_product_id AS "rentalProductId",
          p.model_code AS "modelCode",
          p.model_name AS "modelName",
          p.category,
          p.manufacturer,
          COALESCE(p.standard_monthly_rate, 0)::numeric AS "standardMonthlyRate",
          COALESCE(p.standard_daily_rate, 0)::numeric AS "standardDailyRate",
          p.spec AS "productSpec",
          a.custom_spec AS "customSpec",
          a.owner_type AS "ownerType",
          a.status,
          a.current_customer AS "currentCustomer",
          a.current_site AS "currentSite",
          a.contract_no AS "contractNo",
          COALESCE(a.acquisition_cost, 0)::numeric AS "acquisitionCost",
          COALESCE(a.salvage_value, 0)::numeric AS "salvageValue",
          COALESCE(a.useful_life_years, 5)::int AS "usefulLifeYears",
          a.memo,
          c.id AS "activeContractId",
          c.contract_no AS "activeContractNo",
          c.customer_name AS "activeCustomerName",
          c.site_name AS "activeSiteName",
          c.entity_type AS "activeEntityType",
          TO_CHAR(c.start_date, 'YYYY-MM-DD') AS "activeStartDate",
          TO_CHAR(c.end_date, 'YYYY-MM-DD') AS "activeEndDate",
          COALESCE(c.monthly_rate, p.standard_monthly_rate, 0)::numeric AS "activeMonthlyRate"
        FROM erp_rental_assets a
        LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
        LEFT JOIN LATERAL (
          SELECT *
          FROM erp_rental_contracts rc
          WHERE rc.asset_id = a.id AND rc.status = 'ACTIVE'
          ORDER BY rc.id DESC
          LIMIT 1
        ) c ON true
        ORDER BY a.asset_no ASC
      `),
      // 2. Fetch recent INBOUND / OUTBOUND logs
      pool.query(`
        SELECT
          l.id,
          l.asset_id AS "assetId",
          l.asset_no AS "assetNo",
          a.serial_no AS "serialNo",
          p.model_name AS "modelName",
          p.manufacturer,
          l.event_type AS "eventType",
          TO_CHAR(l.event_date, 'YYYY-MM-DD') AS "eventDate",
          l.customer_name AS "customerName",
          l.site_name AS "siteName",
          l.memo,
          l.created_at AS "createdAt"
        FROM erp_asset_inout_logs l
        LEFT JOIN erp_rental_assets a ON l.asset_id = a.id
        LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
        WHERE l.event_type IN ('OUTBOUND', 'INBOUND')
        ORDER BY l.event_date DESC, l.id DESC
        LIMIT 100
      `),
      // 3. Fetch customer list from erp_partners (skip if mode === 'INBOUND')
      mode === "INBOUND"
        ? Promise.resolve({ rows: [] })
        : pool.query(`
            SELECT DISTINCT name AS "customerName", business_no AS "businessNo", ceo_name AS "ceoName"
            FROM erp_partners
            WHERE partner_type IN ('CUSTOMER', 'BOTH') AND status = 'ACTIVE'
            ORDER BY name ASC
          `),
      // 4. Fetch monthly billings (skip if mode === 'INBOUND')
      mode === "INBOUND"
        ? Promise.resolve({ rows: [] })
        : pool.query(
            `
            SELECT
              b.id,
              b.billing_no AS "billingNo",
              b.contract_id AS "contractId",
              c.contract_no AS "contractNo",
              c.customer_name AS "customerName",
              c.site_name AS "siteName",
              c.entity_type AS "entityType",
              c.status AS "contractStatus",
              a.id AS "assetId",
              a.asset_no AS "assetNo",
              a.serial_no AS "serialNo",
              p.model_name AS "modelName",
              b.year_month AS "yearMonth",
              TO_CHAR(b.start_date, 'YYYY-MM-DD') AS "startDate",
              TO_CHAR(b.end_date, 'YYYY-MM-DD') AS "endDate",
              b.operating_days AS "operatingDays",
              COALESCE(c.monthly_rate, 0)::numeric AS "monthlyRate",
              COALESCE(b.pro_rata_revenue, 0)::numeric AS "proRataRevenue",
              COALESCE(b.depreciation_cogs, 0)::numeric AS "depreciationCogs",
              COALESCE(b.net_margin, 0)::numeric AS "netMargin",
              b.payment_status AS "paymentStatus"
            FROM erp_rental_billings b
            JOIN erp_rental_contracts c ON b.contract_id = c.id
            LEFT JOIN erp_rental_assets a ON c.asset_id = a.id
            LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
            WHERE b.year_month = $1
            ORDER BY c.customer_name ASC, b.id DESC
          `,
            [yearMonth]
          ),
    ]);

    // If lookup query is provided, also return matched asset directly
    let matchedAsset = null;
    if (lookup) {
      const qUpper = lookup.toUpperCase();
      matchedAsset =
        assetsRes.rows.find(
          (r) =>
            (r.assetNo && r.assetNo.toUpperCase() === qUpper) ||
            (r.serialNo && r.serialNo.toUpperCase() === qUpper)
        ) ||
        assetsRes.rows.find(
          (r) =>
            r.status === "RENTED" &&
            ((r.assetNo && r.assetNo.toUpperCase().includes(qUpper)) ||
              (r.serialNo && r.serialNo.toUpperCase().includes(qUpper)))
        ) ||
        assetsRes.rows.find(
          (r) =>
            (r.assetNo && r.assetNo.toUpperCase().includes(qUpper)) ||
            (r.serialNo && r.serialNo.toUpperCase().includes(qUpper))
        ) ||
        null;
    }

    // Group customer billing summary for the month
    const customerMap: Record<
      string,
      {
        customerName: string;
        assetCount: number;
        totalMonthlyRate: number;
        totalProRataRevenue: number;
        items: any[];
      }
    > = {};

    for (const row of billingsRes.rows) {
      const cust = row.customerName || "미지정";
      if (!customerMap[cust]) {
        customerMap[cust] = {
          customerName: cust,
          assetCount: 0,
          totalMonthlyRate: 0,
          totalProRataRevenue: 0,
          items: [],
        };
      }
      customerMap[cust].assetCount += 1;
      customerMap[cust].totalMonthlyRate += Number(row.monthlyRate || 0);
      customerMap[cust].totalProRataRevenue += Number(row.proRataRevenue || 0);
      customerMap[cust].items.push(row);
    }

    return NextResponse.json({
      success: true,
      yearMonth,
      assets: assetsRes.rows,
      matchedAsset,
      logs: logsRes.rows,
      partners: partnersRes.rows,
      billings: billingsRes.rows,
      customerBillingSummary: Object.values(customerMap),
    });
  } catch (error: any) {
    console.error("GET /api/erp/inout error:", error);
    return NextResponse.json(
      { error: "입출고 데이터 조회 실패: " + error.message },
      { status: 500 }
    );
  }
}

// POST /api/erp/inout
// Handles action: "OUTBOUND" | "INBOUND"
export async function POST(request: Request) {
  const pool = getErpPool();
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "OUTBOUND") {
      const {
        assetId,
        assetNo,
        customerName,
        siteName,
        billingStartDate,
        endDate,
        monthlyRate,
        entityType,
        deposit,
        memo,
        actorName,
      } = body;

      if ((!assetId && !assetNo) || !customerName || !billingStartDate || monthlyRate === undefined) {
        return NextResponse.json(
          { error: "고객사명, 출고 자산, 청구 시작일, 월 단가는 필수 입력 항목입니다." },
          { status: 400 }
        );
      }

      const numMonthlyRate = Number(monthlyRate);
      if (isNaN(numMonthlyRate) || numMonthlyRate < 0) {
        return NextResponse.json(
          { error: "유효한 월 단가를 입력해 주십시오." },
          { status: 400 }
        );
      }

      await client.query("BEGIN");

      // 1. Fetch & lock target asset
      const assetRes = await client.query(
        `
        SELECT a.*, p.model_name, p.standard_monthly_rate
        FROM erp_rental_assets a
        LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
        WHERE ${assetId ? "a.id = $1" : "UPPER(a.asset_no) = UPPER($1)"}
        FOR UPDATE OF a
      `,
        [assetId || assetNo]
      );

      if (assetRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "선택한 렌탈자산을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      const asset = assetRes.rows[0];
      if (asset.status === "RENTED") {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: `해당 자산(${asset.asset_no})은 이미 [${asset.current_customer || "타 고객사"}]에 출고(대여중) 상태입니다.`,
          },
          { status: 400 }
        );
      }

      // 2. Create rental contract in erp_rental_contracts
      const contractYear = billingStartDate.slice(0, 4);
      const contractNo = `RNT-${contractYear}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const dailyRate = Math.round(numMonthlyRate / 30);
      const effectiveEndDate = endDate || "2099-12-31";

      const contractRes = await client.query(
        `
        INSERT INTO erp_rental_contracts
        (contract_no, entity_type, customer_name, site_name, asset_id, start_date, end_date, monthly_rate, daily_rate, deposit, status, memo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', $11)
        RETURNING *
      `,
        [
          contractNo,
          entityType || "CORP",
          customerName.trim(),
          (siteName || "").trim() || null,
          asset.id,
          billingStartDate,
          effectiveEndDate,
          numMonthlyRate,
          dailyRate,
          Number(deposit || 0),
          memo || null,
        ]
      );
      const contract = contractRes.rows[0];

      // 3. Update asset status to RENTED in erp_rental_assets
      await client.query(
        `
        UPDATE erp_rental_assets
        SET status = 'RENTED',
            current_customer = $1,
            current_site = $2,
            contract_no = $3,
            updated_at = NOW()
        WHERE id = $4
      `,
        [customerName.trim(), (siteName || "").trim() || null, contractNo, asset.id]
      );

      // 4. Calculate and insert current month / start month billing in erp_rental_billings
      const startYearMonth = billingStartDate.slice(0, 7);
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const monthsToBill = new Set<string>([startYearMonth]);
      if (currentYearMonth >= startYearMonth && currentYearMonth <= effectiveEndDate.slice(0, 7)) {
        monthsToBill.add(currentYearMonth);
      }

      const createdBillings = [];
      for (const ym of monthsToBill) {
        const calc = computeMonthlyProRata(
          ym,
          billingStartDate,
          effectiveEndDate,
          numMonthlyRate,
          Number(asset.acquisition_cost || 0),
          Number(asset.salvage_value || 0),
          Number(asset.useful_life_years || 5)
        );

        if (calc.operatingDays > 0) {
          const billingNo = `RB${ym.replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
          const billRes = await client.query(
            `
            INSERT INTO erp_rental_billings
            (billing_no, contract_id, year_month, start_date, end_date, operating_days, pro_rata_revenue, depreciation_cogs, net_margin, billing_date, payment_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, 'UNPAID')
            RETURNING *
          `,
            [
              billingNo,
              contract.id,
              ym,
              calc.effStart,
              calc.effEnd,
              calc.operatingDays,
              calc.proRataRevenue,
              calc.depreciationCogs,
              calc.netMargin,
            ]
          );
          createdBillings.push(billRes.rows[0]);
        }
      }

      // 5. Record OUTBOUND event in erp_asset_inout_logs
      const logMemo =
        memo ||
        `출고등록 완료 (청구시작: ${billingStartDate}, 월단가: ${numMonthlyRate.toLocaleString()}원, 계약번호: ${contractNo})`;
      await client.query(
        `
        INSERT INTO erp_asset_inout_logs
        (asset_id, asset_no, event_type, event_date, customer_name, site_name, memo)
        VALUES ($1, $2, 'OUTBOUND', $3, $4, $5, $6)
      `,
        [
          asset.id,
          asset.asset_no,
          billingStartDate,
          customerName.trim(),
          (siteName || "").trim() || null,
          logMemo,
        ]
      );

      // 6. Record Audit Log
      await client.query(
        `
        INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
        VALUES ('RENTAL_INOUT', 'OUTBOUND', $1, $2, $3)
      `,
        [
          String(asset.asset_no),
          actorName || "출고담당자",
          JSON.stringify({
            assetId: asset.id,
            assetNo: asset.asset_no,
            serialNo: asset.serial_no,
            customerName: customerName.trim(),
            siteName: (siteName || "").trim() || null,
            billingStartDate,
            monthlyRate: numMonthlyRate,
            contractNo,
            billingsCreated: createdBillings.length,
          }),
        ]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        contract,
        billing: createdBillings[0] || null,
        billings: createdBillings,
        assetNo: asset.asset_no,
      });
    } else if (action === "INBOUND") {
      const { assetId, queryKey, inboundDate, nextStatus, memo, actorName } = body;

      if (!assetId && !queryKey) {
        return NextResponse.json(
          { error: "자산번호 또는 제조번호(시리얼번호)를 입력해 주십시오." },
          { status: 400 }
        );
      }

      const effectiveInboundDate = inboundDate || new Date().toISOString().split("T")[0];
      const targetNextStatus = nextStatus === "REPAIRING" ? "REPAIRING" : "AVAILABLE";

      await client.query("BEGIN");

      // 1. Find asset + product info + active contract in 1 query
      let assetRes;
      if (assetId) {
        assetRes = await client.query(
          `
          SELECT a.*, p.model_name, p.manufacturer,
                 c.id AS "active_contract_id",
                 c.customer_name AS "active_customer_name",
                 c.site_name AS "active_site_name",
                 c.monthly_rate AS "active_monthly_rate",
                 TO_CHAR(c.start_date, 'YYYY-MM-DD') AS "start_date_str"
          FROM erp_rental_assets a
          LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
          LEFT JOIN LATERAL (
            SELECT * FROM erp_rental_contracts rc
            WHERE rc.asset_id = a.id AND rc.status = 'ACTIVE'
            ORDER BY rc.id DESC LIMIT 1
          ) c ON true
          WHERE a.id = $1
          FOR UPDATE OF a
          `,
          [assetId]
        );
      } else {
        const cleanKey = String(queryKey).trim();
        assetRes = await client.query(
          `
          SELECT a.*, p.model_name, p.manufacturer,
                 c.id AS "active_contract_id",
                 c.customer_name AS "active_customer_name",
                 c.site_name AS "active_site_name",
                 c.monthly_rate AS "active_monthly_rate",
                 TO_CHAR(c.start_date, 'YYYY-MM-DD') AS "start_date_str"
          FROM erp_rental_assets a
          LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
          LEFT JOIN LATERAL (
            SELECT * FROM erp_rental_contracts rc
            WHERE rc.asset_id = a.id AND rc.status = 'ACTIVE'
            ORDER BY rc.id DESC LIMIT 1
          ) c ON true
          WHERE UPPER(a.asset_no) = UPPER($1) OR UPPER(a.serial_no) = UPPER($1)
          ORDER BY CASE WHEN a.status = 'RENTED' THEN 0 ELSE 1 END, a.id ASC
          LIMIT 1
          FOR UPDATE OF a
        `,
          [cleanKey]
        );
      }

      if (assetRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "입력하신 자산번호 또는 제조번호와 일치하는 자산이 없습니다." },
          { status: 404 }
        );
      }

      const asset = assetRes.rows[0];
      const activeContractId = asset.active_contract_id || null;
      const fromCustomer =
        asset.active_customer_name || asset.current_customer || "미지정 고객사";
      const fromSite = asset.active_site_name || asset.current_site || null;

      // 2. If activeContract exists, close it as RETURNED and adjust monthly billing up to inboundDate
      let updatedBilling = null;
      if (activeContractId) {
        const inboundYm = effectiveInboundDate.slice(0, 7);
        const contractStartStr = asset.start_date_str || effectiveInboundDate;

        const calc = computeMonthlyProRata(
          inboundYm,
          contractStartStr,
          effectiveInboundDate,
          Number(asset.active_monthly_rate || 0),
          Number(asset.acquisition_cost || 0),
          Number(asset.salvage_value || 0),
          Number(asset.useful_life_years || 5)
        );

        const billingNo = `RB${inboundYm.replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
        const closeAndBillRes = await client.query(
          `
          WITH closed_contract AS (
            UPDATE erp_rental_contracts
            SET status = 'RETURNED', end_date = $1
            WHERE id = $2
            RETURNING id
          ),
          updated_bill AS (
            UPDATE erp_rental_billings
            SET end_date = $3,
                operating_days = $4,
                pro_rata_revenue = $5,
                depreciation_cogs = $6,
                net_margin = $7
            WHERE contract_id = $2 AND year_month = $8
            RETURNING *
          ),
          inserted_bill AS (
            INSERT INTO erp_rental_billings
            (billing_no, contract_id, year_month, start_date, end_date, operating_days, pro_rata_revenue, depreciation_cogs, net_margin, billing_date, payment_status)
            SELECT $9, $2, $8, $10, $3, $4, $5, $6, $7, CURRENT_DATE, 'UNPAID'
            WHERE $4 > 0 AND NOT EXISTS (SELECT 1 FROM updated_bill)
            RETURNING *
          )
          SELECT * FROM updated_bill
          UNION ALL
          SELECT * FROM inserted_bill
          `,
          [
            effectiveInboundDate,
            activeContractId,
            calc.effEnd,
            calc.operatingDays,
            calc.proRataRevenue,
            calc.depreciationCogs,
            calc.netMargin,
            inboundYm,
            billingNo,
            calc.effStart,
          ]
        );
        updatedBilling = closeAndBillRes.rows[0] || null;
      }

      // 3. Update asset status, insert INBOUND log, and insert Audit Log in a single CTE query
      const logMemo =
        memo ||
        `[${fromCustomer}${fromSite ? " / " + fromSite : ""}] 입고 완료 (상태전환: ${
          targetNextStatus === "AVAILABLE" ? "임대가능" : "정비/수리중"
        })`;
      const auditDetails = JSON.stringify({
        assetId: asset.id,
        assetNo: asset.asset_no,
        serialNo: asset.serial_no,
        fromCustomer,
        fromSite,
        inboundDate: effectiveInboundDate,
        nextStatus: targetNextStatus,
      });

      const finishRes = await client.query(
        `
        WITH upd_asset AS (
          UPDATE erp_rental_assets
          SET status = $1,
              current_customer = NULL,
              current_site = NULL,
              contract_no = NULL,
              updated_at = NOW()
          WHERE id = $2
        ),
        ins_audit AS (
          INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
          VALUES ('RENTAL_INOUT', 'INBOUND', $3, $4, $5)
        )
        INSERT INTO erp_asset_inout_logs
        (asset_id, asset_no, event_type, event_date, customer_name, site_name, memo)
        VALUES ($2, $3, 'INBOUND', $6, $7, $8, $9)
        RETURNING
          id,
          asset_id AS "assetId",
          asset_no AS "assetNo",
          event_type AS "eventType",
          TO_CHAR(event_date, 'YYYY-MM-DD') AS "eventDate",
          customer_name AS "customerName",
          site_name AS "siteName",
          memo,
          created_at AS "createdAt"
      `,
        [
          targetNextStatus,
          asset.id,
          asset.asset_no,
          actorName || "입고담당자",
          auditDetails,
          effectiveInboundDate,
          fromCustomer,
          fromSite,
          logMemo,
        ]
      );

      await client.query("COMMIT");

      const createdLog = finishRes.rows[0]
        ? {
            ...finishRes.rows[0],
            serialNo: asset.serial_no || "",
            modelName: asset.model_name || "",
            manufacturer: asset.manufacturer || "",
          }
        : null;

      return NextResponse.json({
        success: true,
        assetId: asset.id,
        assetNo: asset.asset_no,
        serialNo: asset.serial_no,
        fromCustomer,
        fromSite,
        inboundDate: effectiveInboundDate,
        nextStatus: targetNextStatus,
        updatedBilling,
        createdLog,
      });
    } else {
      return NextResponse.json({ error: "지원하지 않는 action입니다." }, { status: 400 });
    }
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("POST /api/erp/inout error:", error);
    return NextResponse.json(
      { error: "입출고 처리 실패: " + error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
