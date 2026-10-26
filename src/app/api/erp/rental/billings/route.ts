import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// GET: List rental billings with contract, customer, site, asset details
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get("yearMonth"); // e.g. '2026-10'

    const pool = getErpPool();
    let query = `
      SELECT 
        b.id,
        b.billing_no as "billingNo",
        b.contract_id as "contractId",
        c.contract_no as "contractNo",
        c.customer_name as "customerName",
        c.site_name as "siteName",
        a.asset_no as "assetNo",
        rp.model_name as "modelName",
        b.year_month as "yearMonth",
        b.start_date as "startDate",
        b.end_date as "endDate",
        b.operating_days as "operatingDays",
        b.pro_rata_revenue as "proRataRevenue",
        b.depreciation_cogs as "depreciationCogs",
        b.net_margin as "netMargin",
        b.billing_date as "billingDate",
        b.payment_status as "paymentStatus",
        b.paid_amount as "paidAmount",
        b.tax_invoice_id as "taxInvoiceId",
        ti.invoice_no as "taxInvoiceNo",
        b.created_at as "createdAt"
      FROM erp_rental_billings b
      JOIN erp_rental_contracts c ON b.contract_id = c.id
      JOIN erp_rental_assets a ON c.asset_id = a.id
      JOIN erp_rental_products rp ON a.rental_product_id = rp.id
      LEFT JOIN erp_tax_invoices ti ON b.tax_invoice_id = ti.id
    `;
    const params: any[] = [];
    if (yearMonth) {
      query += " WHERE b.year_month = $1";
      params.push(yearMonth);
    }
    query += " ORDER BY b.year_month DESC, b.id DESC";

    const res = await pool.query(query, params);
    return NextResponse.json({ success: true, billings: res.rows });
  } catch (error: any) {
    console.error("GET Rental Billings Error:", error);
    return NextResponse.json({ error: "임대 정산 대장 조회 실패" }, { status: 500 });
  }
}

// POST: Generate monthly rental billing with pro-rata calculation (헌장 4.1 일할 계산) & depreciation COGS
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractId, yearMonth, startDate, endDate, operatingDays } = body;

    if (!contractId || !yearMonth || !startDate || !endDate) {
      return NextResponse.json({ error: "계약 ID, 정산연월, 시작일, 종료일은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Fetch contract and asset
      const contractRes = await client.query(
        `SELECT c.id, c.contract_no, c.monthly_rate, c.daily_rate, c.asset_id,
                a.acquisition_cost, a.salvage_value, a.useful_life_years
         FROM erp_rental_contracts c
         JOIN erp_rental_assets a ON c.asset_id = a.id
         WHERE c.id = $1`,
        [contractId]
      );
      if (contractRes.rows.length === 0) throw new Error("계약을 찾을 수 없습니다.");
      const c = contractRes.rows[0];

      const days = parseInt(operatingDays || "30", 10);
      const monthlyRate = parseFloat(c.monthly_rate);
      // 헌장 4.1 일할 계산: 월임대료 / 30 * 가동일수
      const proRataRevenue = Math.round((monthlyRate / 30) * days);

      // 월 감가상각 매출원가
      const totalMonths = Math.max(1, c.useful_life_years * 12);
      const deprecCogs = Math.round((parseFloat(c.acquisition_cost) - parseFloat(c.salvage_value)) / totalMonths);
      const netMargin = proRataRevenue - deprecCogs;

      const billingNo = `RB${yearMonth.replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      const insRes = await client.query(
        `INSERT INTO erp_rental_billings
         (billing_no, contract_id, year_month, start_date, end_date, operating_days, 
          pro_rata_revenue, depreciation_cogs, net_margin, billing_date, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, 'UNPAID')
         RETURNING *`,
        [billingNo, contractId, yearMonth, startDate, endDate, days, proRataRevenue, deprecCogs, netMargin]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true, billing: insRes.rows[0] });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST Rental Billing Error:", error);
    return NextResponse.json({ error: "임대 정산 청구 등록 실패: " + error.message }, { status: 500 });
  }
}
