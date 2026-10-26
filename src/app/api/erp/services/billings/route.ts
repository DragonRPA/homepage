import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: List all service billings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get("serviceType");

    const pool = getErpPool();
    let query = `
      SELECT 
        b.id,
        b.billing_no as "billingNo",
        b.contract_id as "contractId",
        c.contract_no as "contractNo",
        c.service_type as "serviceType",
        c.customer_name as "customerName",
        c.project_name as "projectName",
        b.billing_type as "billingType",
        b.milestone_name as "milestoneName",
        b.billing_date as "billingDate",
        b.supply_amount as "supplyAmount",
        b.vat_amount as "vatAmount",
        b.total_amount as "totalAmount",
        b.payment_status as "paymentStatus",
        b.tax_invoice_id as "taxInvoiceId",
        ti.invoice_no as "taxInvoiceNo",
        b.memo,
        b.created_at as "createdAt"
      FROM erp_service_billings b
      JOIN erp_service_contracts c ON b.contract_id = c.id
      LEFT JOIN erp_tax_invoices ti ON b.tax_invoice_id = ti.id
    `;
    const params: any[] = [];
    if (serviceType) {
      query += " WHERE c.service_type = $1";
      params.push(serviceType);
    }
    query += " ORDER BY b.billing_date DESC, b.id DESC";

    const res = await pool.query(query, params);
    return NextResponse.json({ success: true, billings: res.rows });
  } catch (error: any) {
    console.error("GET Service Billings Error:", error);
    return NextResponse.json({ error: "용역 청구 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Create service billing (monthly retainer or milestone)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractId, billingType, milestoneName, billingDate, supplyAmount, memo } = body;

    if (!contractId || !supplyAmount) {
      return NextResponse.json({ error: "계약 ID와 공급가액은 필수입니다." }, { status: 400 });
    }

    const supply = parseFloat(supplyAmount);
    const vat = Math.round(supply * 0.1);
    const total = supply + vat;
    const billingNo = `SB${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabaseErp
      .from("erp_service_billings")
      .insert({
        billing_no: billingNo,
        contract_id: contractId,
        billing_type: billingType || "MONTHLY_RETAINER",
        milestone_name: milestoneName || (billingType === "MILESTONE" ? "중도금" : "당월 용역료"),
        billing_date: billingDate || new Date().toISOString().split("T")[0],
        supply_amount: supply,
        vat_amount: vat,
        total_amount: total,
        payment_status: "UNPAID",
        memo: memo || "",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, billing: data });
  } catch (error: any) {
    console.error("POST Service Billing Error:", error);
    return NextResponse.json({ error: "용역 청구 등록 실패: " + error.message }, { status: 500 });
  }
}
