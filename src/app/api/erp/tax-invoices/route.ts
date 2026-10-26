import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: List all tax invoices (optionally filter by domain_type)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domainType = searchParams.get("domainType");

    const pool = getErpPool();
    let query = `
      SELECT 
        id,
        invoice_no as "invoiceNo",
        domain_type as "domainType",
        ref_id as "refId",
        customer_name as "customerName",
        business_no as "businessNo",
        ceo_name as "ceoName",
        issue_date as "issueDate",
        supply_amount as "supplyAmount",
        vat_amount as "vatAmount",
        total_amount as "totalAmount",
        item_name as "itemName",
        status,
        nts_confirm_no as "ntsConfirmNo",
        memo,
        created_at as "createdAt"
      FROM erp_tax_invoices
    `;
    const params: any[] = [];
    if (domainType) {
      query += " WHERE domain_type = $1";
      params.push(domainType);
    }
    query += " ORDER BY issue_date DESC, id DESC";

    const res = await pool.query(query, params);
    return NextResponse.json({ success: true, invoices: res.rows });
  } catch (error: any) {
    console.error("GET Tax Invoices Error:", error);
    return NextResponse.json({ error: "세금계산서 대장 조회 실패" }, { status: 500 });
  }
}

// POST: Issue tax invoice (and optionally link to rental/service billing)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      domainType, refId, customerName, businessNo, ceoName, 
      issueDate, supplyAmount, itemName, memo 
    } = body;

    if (!customerName || !supplyAmount || !itemName) {
      return NextResponse.json({ error: "거래처명, 품목명, 공급가액은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const supply = parseFloat(supplyAmount);
      const vat = Math.round(supply * 0.1);
      const total = supply + vat;
      const invoiceNo = `TX${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      const ntsConfirmNo = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-41000000-${Math.floor(10000000 + Math.random() * 90000000)}`;

      // 1. Insert tax invoice
      const insRes = await client.query(
        `INSERT INTO erp_tax_invoices
         (invoice_no, domain_type, ref_id, customer_name, business_no, ceo_name, 
          issue_date, supply_amount, vat_amount, total_amount, item_name, status, nts_confirm_no, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'SENT_NTS', $12, $13)
         RETURNING *`,
        [
          invoiceNo,
          domainType || "TRADE_SALE",
          refId || null,
          customerName.trim(),
          businessNo || "100-00-00000",
          ceoName || "대표자",
          issueDate || new Date().toISOString().split("T")[0],
          supply,
          vat,
          total,
          itemName.trim(),
          ntsConfirmNo,
          memo || "",
        ]
      );
      const invoice = insRes.rows[0];

      // 2. Link to ref billing if specified
      if (refId) {
        if (domainType === "RENTAL") {
          await client.query("UPDATE erp_rental_billings SET tax_invoice_id = $1 WHERE id = $2", [invoice.id, refId]);
        } else if (domainType === "OP_SERVICE" || domainType === "DEV_SERVICE") {
          await client.query("UPDATE erp_service_billings SET tax_invoice_id = $1 WHERE id = $2", [invoice.id, refId]);
        }
      }

      // 3. Audit log
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('TAX_INVOICE', 'ISSUE', $1, 'ADMIN', $2)`,
        [invoiceNo, JSON.stringify({ customerName, total, ntsConfirmNo })]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true, invoice });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST Tax Invoice Error:", error);
    return NextResponse.json({ error: "세금계산서 발행 실패: " + error.message }, { status: 500 });
  }
}
