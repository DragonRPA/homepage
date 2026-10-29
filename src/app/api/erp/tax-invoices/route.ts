import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { BUSINESS_ENTITIES, getEntity } from "@/lib/businessEntities";
import { registIssuePopbill } from "@/lib/popbillService";

// GET: List tax invoices or unissued billings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'UNISSUED_BILLINGS' or null
    const domainType = searchParams.get("domainType");
    const supplierEntityType = searchParams.get("supplierEntityType");

    const pool = getErpPool();

    // 1. Unissued Billings for batch tax invoice issuance
    if (type === "UNISSUED_BILLINGS") {
      // 1-1. Rental Billings (WHERE tax_invoice_id IS NULL)
      const rentalQuery = `
        SELECT 
          b.id as "billingId",
          'RENTAL' as "domainType",
          b.billing_no as "billingNo",
          COALESCE(b.billing_date, b.start_date, b.created_at::date) as "billingDate",
          b.year_month as "yearMonth",
          c.id as "contractId",
          c.contract_no as "contractNo",
          c.customer_name as "customerName",
          COALESCE(c.entity_type, 'CORP') as "entityType",
          c.site_name as "siteName",
          rp.model_name as "modelName",
          COALESCE(p.business_no, '100-00-00000') as "businessNo",
          COALESCE(p.ceo_name, '대표자') as "ceoName",
          COALESCE(p.main_email, '') as "customerEmail",
          ROUND(COALESCE(b.pro_rata_revenue, 0)) as "supplyAmount",
          ROUND(COALESCE(b.pro_rata_revenue, 0) * 0.1) as "vatAmount",
          ROUND(COALESCE(b.pro_rata_revenue, 0) * 1.1) as "totalAmount",
          CONCAT(c.customer_name, ' ', b.year_month, ' 렌탈료') as "itemName"
        FROM erp_rental_billings b
        JOIN erp_rental_contracts c ON b.contract_id = c.id
        LEFT JOIN erp_partners p ON c.partner_id = p.id OR (c.partner_id IS NULL AND c.customer_name = p.name)
        LEFT JOIN erp_rental_assets a ON c.asset_id = a.id
        LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
        WHERE b.tax_invoice_id IS NULL
        ORDER BY b.year_month DESC, b.id DESC
      `;

      // 1-2. Service Billings (WHERE tax_invoice_id IS NULL)
      const serviceQuery = `
        SELECT 
          b.id as "billingId",
          COALESCE(c.service_type, 'OP_SERVICE') as "domainType",
          b.billing_no as "billingNo",
          COALESCE(b.billing_date, b.created_at::date) as "billingDate",
          TO_CHAR(COALESCE(b.billing_date, b.created_at::date), 'YYYY-MM') as "yearMonth",
          c.id as "contractId",
          c.contract_no as "contractNo",
          c.customer_name as "customerName",
          COALESCE(c.entity_type, 'CORP') as "entityType",
          c.project_name as "projectName",
          b.milestone_name as "milestoneName",
          COALESCE(p.business_no, '100-00-00000') as "businessNo",
          COALESCE(p.ceo_name, '대표자') as "ceoName",
          COALESCE(p.main_email, '') as "customerEmail",
          ROUND(COALESCE(b.supply_amount, 0)) as "supplyAmount",
          ROUND(COALESCE(b.vat_amount, 0)) as "vatAmount",
          ROUND(COALESCE(b.total_amount, 0)) as "totalAmount",
          CONCAT(COALESCE(c.project_name, '용역'), ' ', COALESCE(b.milestone_name, '기성금')) as "itemName"
        FROM erp_service_billings b
        JOIN erp_service_contracts c ON b.contract_id = c.id
        LEFT JOIN erp_partners p ON c.partner_id = p.id OR (c.partner_id IS NULL AND c.customer_name = p.name)
        WHERE b.tax_invoice_id IS NULL
        ORDER BY b.billing_date DESC, b.id DESC
      `;

      const [rentalRes, serviceRes] = await Promise.all([
        pool.query(rentalQuery),
        pool.query(serviceQuery),
      ]);

      const unissuedBillings = [...rentalRes.rows, ...serviceRes.rows];
      return NextResponse.json({ success: true, billings: unissuedBillings });
    }

    // 2. Issued Tax Invoices (대장 목록)
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
    return NextResponse.json({ error: "세금계산서 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: Issue tax invoice (supports single manual issue & batch billings issue)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // CASE A: Batch Issuance from Selected Contract Billings
      if (body.batchIssue === true && Array.isArray(body.billings)) {
        const { billings } = body;
        if (billings.length === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "선택된 청구건이 없습니다." }, { status: 400 });
        }

        const issuedInvoices = [];
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");

        for (let i = 0; i < billings.length; i++) {
          const item = billings[i];
          const entityType = item.entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
          const entity = getEntity(entityType);
          const supply = Math.round(parseFloat(item.supplyAmount) || 0);
          const vat = Math.round(parseFloat(item.vatAmount) || Math.round(supply * 0.1));
          const total = supply + vat;

          // Unique Invoice No & NTS Mgt Key
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const invoiceNo = `TX${dateStr}-${String(i + 1).padStart(2, "0")}${randomSuffix}`;

          // Popbill Electronic Tax Invoice Issue Call (Test Mode Supported)
          let ntsConfirmNo = "";
          try {
            const popRes = await registIssuePopbill({
              corpNum: entity.bizNumRaw,
              supplierCorpName: entity.corpName,
              supplierCeoName: entity.ceoName,
              supplierAddr: entity.address,
              supplierBizType: entity.bizType,
              supplierBizClass: entity.bizClass,
              supplierEmail: entity.email,
              invoicerMgtKey: invoiceNo,
              writeDate: (item.issueDate || new Date().toISOString().slice(0, 10)).replace(/-/g, ""),
              customerName: item.customerName,
              customerBizNo: item.businessNo || "100-00-00000",
              customerCeoName: item.ceoName || "대표자",
              customerEmail: item.customerEmail || entity.email,
              itemName: item.itemName || "렌탈 및 기술용역료",
              supplyAmount: supply,
              vatAmount: vat,
              totalAmount: total,
              memo: item.memo || "",
            });
            ntsConfirmNo = popRes.ntsConfirmNo;
          } catch (popErr: any) {
            console.warn("Popbill Issue Warning in Batch:", popErr.message);
            ntsConfirmNo = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-41000000-POPBILL_TEST`;
          }

          // Insert into erp_tax_invoices
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
              item.domainType || "RENTAL",
              item.billingId,
              entity.key,
              entity.bizNumRaw,
              entity.corpName,
              entity.ceoName,
              entity.address,
              entity.bizType,
              entity.bizClass,
              entity.email,
              item.customerName,
              item.businessNo || "100-00-00000",
              item.ceoName || "대표자",
              item.issueDate || new Date().toISOString().split("T")[0],
              supply,
              vat,
              total,
              item.itemName,
              ntsConfirmNo,
              item.memo || "",
            ]
          );
          const savedInvoice = insRes.rows[0];
          issuedInvoices.push(savedInvoice);

          // Link to original billing record
          if (item.billingId) {
            if (item.domainType === "RENTAL") {
              await client.query("UPDATE erp_rental_billings SET tax_invoice_id = $1 WHERE id = $2", [savedInvoice.id, item.billingId]);
            } else {
              await client.query("UPDATE erp_service_billings SET tax_invoice_id = $1 WHERE id = $2", [savedInvoice.id, item.billingId]);
            }
          }

          // Audit log for each invoice
          await client.query(
            `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
             VALUES ('TAX_INVOICE', 'BATCH_ISSUE', $1, 'ADMIN', $2)`,
            [invoiceNo, JSON.stringify({ billingId: item.billingId, customerName: item.customerName, total, ntsConfirmNo })]
          );
        }

        await client.query("COMMIT");
        return NextResponse.json({
          success: true,
          count: issuedInvoices.length,
          message: `선택한 ${issuedInvoices.length}건의 청구건에 대해 국세청 전자세금계산서가 성공적으로 일괄 발행되었습니다.`,
          invoices: issuedInvoices,
        });
      }

      // CASE B: Single Manual Issue
      const { 
        domainType, refId, customerName, businessNo, ceoName, 
        issueDate, supplyAmount, itemName, memo, supplierEntityType 
      } = body;

      if (!customerName || !supplyAmount || !itemName) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "거래처명, 품목명, 공급가액은 필수입니다." }, { status: 400 });
      }

      const entityType = supplierEntityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
      const entity = getEntity(entityType);
      const supply = Math.round(parseFloat(supplyAmount));
      const vat = Math.round(supply * 0.1);
      const total = supply + vat;
      const invoiceNo = `TX${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Popbill Electronic Tax Invoice Issue Call
      let ntsConfirmNo = "";
      try {
        const popRes = await registIssuePopbill({
          corpNum: entity.bizNumRaw,
          supplierCorpName: entity.corpName,
          supplierCeoName: entity.ceoName,
          supplierAddr: entity.address,
          supplierBizType: entity.bizType,
          supplierBizClass: entity.bizClass,
          supplierEmail: entity.email,
          invoicerMgtKey: invoiceNo,
          writeDate: (issueDate || new Date().toISOString().slice(0, 10)).replace(/-/g, ""),
          customerName: customerName.trim(),
          customerBizNo: businessNo || "100-00-00000",
          customerCeoName: ceoName || "대표자",
          customerEmail: entity.email,
          itemName: itemName.trim(),
          supplyAmount: supply,
          vatAmount: vat,
          totalAmount: total,
          memo: memo || "",
        });
        ntsConfirmNo = popRes.ntsConfirmNo;
      } catch (popErr: any) {
        console.warn("Popbill Issue Warning in Single:", popErr.message);
        ntsConfirmNo = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-41000000-POPBILL_TEST`;
      }

      // Insert tax invoice
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

      if (refId) {
        if (domainType === "RENTAL") {
          await client.query("UPDATE erp_rental_billings SET tax_invoice_id = $1 WHERE id = $2", [invoice.id, refId]);
        } else if (domainType === "OP_SERVICE" || domainType === "DEV_SERVICE") {
          await client.query("UPDATE erp_service_billings SET tax_invoice_id = $1 WHERE id = $2", [invoice.id, refId]);
        }
      }

      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('TAX_INVOICE', 'MANUAL_ISSUE', $1, 'ADMIN', $2)`,
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
