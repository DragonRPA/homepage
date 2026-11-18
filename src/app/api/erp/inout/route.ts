export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { ensureRentalRateSchema } from "@/lib/rentalSchemaInit";
import { ensureForkliftSchema } from "@/lib/forkliftSchemaInit";
import { ensureRentalMaintenanceSchema } from "@/lib/rentalMaintenanceSchema";
import {
  ensurePartnerStatusSchema,
  PartnerTradeBlockedError,
} from "@/lib/partnerStatusService";
import {
  parseNumericInput,
  resolveDailyRentalFee,
} from "@/lib/rentalFeeUtils";
import {
  InoutValidationError,
  executeInboundInoutTx,
  executeOutboundInoutTx,
} from "@/lib/erpInoutTxService";

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
    await ensureRentalRateSchema(pool);
    await ensureForkliftSchema(pool);
    await ensurePartnerStatusSchema(pool);

    const [assetsRes, logsRes, partnersRes, billingsRes] = await Promise.all([
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
          COALESCE(a.attached_options, '[]'::jsonb) AS "attachedOptions",
          COALESCE(a.operating_hours, 0)::numeric AS "operatingHours",
          a.owner_type AS "ownerType",
          a.status,
          a.current_customer AS "currentCustomer",
          a.current_site AS "currentSite",
          a.contract_no AS "contractNo",
          a.current_contract_id AS "currentContractId",
          COALESCE(a.current_monthly_rate, 0)::numeric AS "currentMonthlyRate",
          COALESCE(a.current_daily_rate, 0)::numeric AS "currentDailyRate",
          TO_CHAR(a.outbound_date, 'YYYY-MM-DD') AS "outboundDate",
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
          COALESCE(NULLIF(a.current_monthly_rate, 0), p.standard_monthly_rate, c.monthly_rate, 0)::numeric AS "activeMonthlyRate",
          COALESCE(NULLIF(a.current_daily_rate, 0), p.standard_daily_rate, c.daily_rate, 0)::numeric AS "activeDailyRate",
          COALESCE(c.rate_basis, 'MONTHLY') AS "activeRateBasis"
        FROM erp_rental_assets a
        LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
        LEFT JOIN LATERAL (
          SELECT *
          FROM erp_rental_contracts rc
          WHERE (rc.id = a.current_contract_id OR rc.asset_id = a.id OR (a.current_customer IS NOT NULL AND rc.customer_name = a.current_customer))
            AND rc.status = 'ACTIVE'
          ORDER BY CASE WHEN rc.id = a.current_contract_id THEN 0 ELSE 1 END, rc.id ASC
          LIMIT 1
        ) c ON true
        ORDER BY a.asset_no ASC
      `),
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
      mode === "INBOUND"
        ? Promise.resolve({ rows: [] })
        : pool.query(`
            SELECT id,
                   name AS "customerName",
                   business_no AS "businessNo",
                   ceo_name AS "ceoName",
                   status,
                   nts_biz_state AS "ntsBizState",
                   nts_closed_date AS "ntsClosedDate"
            FROM erp_partners
            WHERE partner_type IN ('CUSTOMER', 'BOTH')
            ORDER BY CASE WHEN status = 'ACTIVE' AND COALESCE(nts_biz_state, 'ACTIVE') = 'ACTIVE' THEN 0 ELSE 1 END, name ASC
          `),
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
              COALESCE(c.daily_rate, 0)::numeric AS "dailyRate",
              COALESCE(c.rate_basis, 'MONTHLY') AS "rateBasis",
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

    const normalizedAssets = assetsRes.rows.map((r: any) => {
      const stdMonthly = Math.round(parseNumericInput(r.standardMonthlyRate));
      const stdDaily = resolveDailyRentalFee(stdMonthly, r.standardDailyRate);
      const actMonthly = Math.round(parseNumericInput(r.activeMonthlyRate));
      const actDaily = resolveDailyRentalFee(actMonthly, r.activeDailyRate);
      return {
        ...r,
        standardMonthlyRate: stdMonthly,
        standardDailyRate: stdDaily,
        activeMonthlyRate: actMonthly,
        activeDailyRate: actDaily,
      };
    });

    let matchedAsset = null;
    if (lookup) {
      const qUpper = lookup.toUpperCase();
      matchedAsset =
        normalizedAssets.find(
          (r) =>
            (r.assetNo && r.assetNo.toUpperCase() === qUpper) ||
            (r.serialNo && r.serialNo.toUpperCase() === qUpper)
        ) ||
        normalizedAssets.find(
          (r) =>
            r.status === "RENTED" &&
            ((r.assetNo && r.assetNo.toUpperCase().includes(qUpper)) ||
              (r.serialNo && r.serialNo.toUpperCase().includes(qUpper)))
        ) ||
        normalizedAssets.find(
          (r) =>
            (r.assetNo && r.assetNo.toUpperCase().includes(qUpper)) ||
            (r.serialNo && r.serialNo.toUpperCase().includes(qUpper))
        ) ||
        null;
    }

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
      assets: normalizedAssets,
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
  await ensureRentalRateSchema(pool);
  await ensureRentalMaintenanceSchema(pool);
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "OUTBOUND") {
      const result = await executeOutboundInoutTx(client, body);
      return NextResponse.json(result);
    } else if (action === "INBOUND") {
      const result = await executeInboundInoutTx(client, body);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "지원하지 않는 action입니다." }, { status: 400 });
  } catch (error: any) {
    if (error instanceof InoutValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof PartnerTradeBlockedError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }
    console.error("POST /api/erp/inout error:", error);
    return NextResponse.json(
      { error: "입출고 처리 실패: " + error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
