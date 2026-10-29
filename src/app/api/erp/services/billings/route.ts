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
        c.entity_type as "entityType",
        c.customer_name as "customerName",
        c.project_name as "projectName",
        b.billing_type as "billingType",
        b.milestone_name as "milestoneName",
        b.billing_date as "billingDate",
        b.supply_amount as "supplyAmount",
        b.vat_amount as "vatAmount",
        b.total_amount as "totalAmount",
        COALESCE(NULLIF(b.tax_purpose, ''), c.tax_purpose, '청구') as "taxPurpose",
        COALESCE(NULLIF(b.tax_memo, ''), c.tax_memo, b.memo, '') as "taxMemo",
        CASE 
          WHEN b.tax_items IS NOT NULL AND jsonb_array_length(b.tax_items) > 0 THEN b.tax_items
          WHEN c.tax_items IS NOT NULL AND jsonb_array_length(c.tax_items) > 0 THEN c.tax_items
          ELSE '[]'::jsonb
        END as "taxItems",
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
    const { contractId, billingType, milestoneName, billingDate, supplyAmount, vatAmount, taxPurpose, taxMemo, taxItems, memo } = body;

    if (!contractId || !supplyAmount) {
      return NextResponse.json({ error: "계약 ID와 공급가액은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const ctRes = await pool.query(
      "SELECT id, project_name, tax_purpose, tax_memo, tax_items, vat_amount FROM erp_service_contracts WHERE id = $1",
      [parseInt(String(contractId), 10)]
    );
    const ct = ctRes.rows[0] || {};

    const supply = parseFloat(supplyAmount);
    const vat = vatAmount !== undefined && vatAmount !== null && vatAmount !== ""
      ? Math.round(parseFloat(vatAmount))
      : Math.round(supply * 0.1);
    const total = supply + vat;
    const billingNo = `SB${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const resolvedItems = Array.isArray(taxItems) && taxItems.length > 0
      ? taxItems
      : Array.isArray(ct.tax_items) && ct.tax_items.length > 0
        ? ct.tax_items
        : [
            {
              itemName: milestoneName || ct.project_name || "정기 용역료",
              spec: "",
              qty: 1,
              unitPrice: supply,
              supplyAmount: supply,
              vatAmount: vat,
              remark: "",
            },
          ];

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
        tax_purpose: taxPurpose || ct.tax_purpose || "청구",
        tax_memo: taxMemo !== undefined ? taxMemo : (ct.tax_memo || milestoneName || ""),
        tax_items: resolvedItems,
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

// DELETE: Delete service billing
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 청구 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const checkRes = await pool.query(
      "SELECT id, billing_no, tax_invoice_id FROM erp_service_billings WHERE id = $1",
      [parseInt(id, 10)]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: "해당 청구건을 찾을 수 없습니다." }, { status: 404 });
    }

    const billing = checkRes.rows[0];
    if (billing.tax_invoice_id) {
      return NextResponse.json({
        error: `해당 청구건은 이미 국세청 전자세금계산서가 발행되어 있어 삭제할 수 없습니다. (세금계산서 대장을 확인해 주십시오)`
      }, { status: 400 });
    }

    await pool.query("DELETE FROM erp_service_billings WHERE id = $1", [parseInt(id, 10)]);

    return NextResponse.json({
      success: true,
      message: `청구 [${billing.billing_no}] 내역이 성공적으로 삭제되었습니다.`
    });
  } catch (error: any) {
    console.error("DELETE Service Billing Error:", error);
    return NextResponse.json({ error: "용역 청구 삭제 실패: " + error.message }, { status: 500 });
  }
}
