import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";
import { BUSINESS_ENTITIES, getEntity } from "@/lib/businessEntities";

// GET: List all tax invoices (optionally filter by domain_type & supplier_entity_type)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domainType = searchParams.get("domainType");
    const supplierEntityType = searchParams.get("supplierEntityType");

    const pool = getErpPool();
    let query = `
      SELECT 
        id,
        invoice_no as "invoiceNo",
        domain_type as "domainType",
        ref_id as "refId",
        supplier_entity_type as "supplierEntityType",
        supplier_corp_num as "supplierCorpNum",
        supplier_corp_name as "supplierCorpName",
        supplier_ceo_name as "supplierCeoName",
        supplier_address as "supplierAddress",
        supplier_biz_type as "supplierBizType",
        supplier_biz_class as "supplierBizClass",
        supplier_email as "supplierEmail",
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
      WHERE 1=1
    `;
    const params: any[] = [];
    if (domainType && domainType !== "ALL") {
      params.push(domainType);
      query += ` AND domain_type = $${params.length}`;
    }
    if (supplierEntityType && supplierEntityType !== "ALL") {
      params.push(supplierEntityType);
      query += ` AND supplier_entity_type = $${params.length}`;
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
      issueDate, supplyAmount, itemName, memo, supplierEntityType 
    } = body;

    if (!customerName || !supplyAmount || !itemName) {
      return NextResponse.json({ error: "거래처명, 품목명, 공급가액은 필수입니다." }, { status: 400 });
    }

    const entityType = supplierEntityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
    const entity = getEntity(entityType);

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const supply = parseFloat(supplyAmount);
      const vat = Math.round(supply * 0.1);
      const total = supply + vat;
      const invoiceNo = `TX${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      const ntsConfirmNo = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-41000000-${Math.floor(10000000 + Math.random() * 90000000)}`;

      // 1. Insert tax invoice with explicit supplier entity details
      const insRes = await client.query(
        `INSERT INTO erp_tax_invoices
         (invoice_no, domain_type, ref_id, supplier_entity_type, supplier_corp_num, supplier_corp_name,
          supplier_ceo_name, supplier_address, supplier_biz_type, supplier_biz_class, supplier_email,
          customer_name, business_no, ceo_name, issue_date, supply_amount, vat_amount, total_amount, item_name,
          status, nts_confirm_no, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'SENT_NTS', $20, $21)
         RETURNING *`,
        [
          invoiceNo,
          domainType || "TRADE_SALE",
          refId || null,
          entity.key,
          entity.bizNumRaw,
          entity.corpName,
          entity.ceoName,
          entity.address,
          entity.bizType,
          entity.bizClass,
          entity.email,
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
        [invoiceNo, JSON.stringify({ customerName, total, ntsConfirmNo, supplier: entity.shortName })]
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
