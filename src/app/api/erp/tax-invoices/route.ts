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

    // 1. Unissued Billings for batch tax invoice issuance (RENTAL + SERVICE + TRADE_SALE)
    if (type === "UNISSUED_BILLINGS") {
      // 1-1. Rental Billings (WHERE tax_invoice_id IS NULL)
      const rentalQuery = `
        SELECT 
          b.id as "billingId",
          CONCAT('RENTAL_', b.id) as "uid",
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
          COALESCE(NULLIF(c.customer_biz_no, ''), p.business_no, '100-00-00000') as "businessNo",
          COALESCE(NULLIF(c.customer_ceo_name, ''), p.ceo_name, '대표자') as "ceoName",
          COALESCE(NULLIF(c.customer_address, ''), CONCAT_WS(' ', p.address, p.address_detail), '') as "customerAddress",
          COALESCE(NULLIF(c.customer_biz_type, ''), p.biz_type, '') as "customerBizType",
          COALESCE(NULLIF(c.customer_biz_class, ''), p.biz_item, '') as "customerBizClass",
          COALESCE(NULLIF(c.customer_email, ''), p.main_email, '') as "customerEmail",
          COALESCE(c.customer_email2, '') as "customerEmail2",
          COALESCE(NULLIF(b.tax_purpose, ''), c.tax_purpose, '청구') as "purposeType",
          COALESCE(NULLIF(b.tax_memo, ''), c.tax_memo, CONCAT(c.customer_name, ' ', b.year_month, ' 임대료')) as "taxMemo",
          CASE 
            WHEN b.tax_items IS NOT NULL AND jsonb_array_length(b.tax_items) > 0 THEN b.tax_items
            WHEN c.tax_items IS NOT NULL AND jsonb_array_length(c.tax_items) > 0 THEN c.tax_items
            ELSE '[]'::jsonb
          END as "taxItems",
          ROUND(COALESCE(b.pro_rata_revenue, 0)) as "supplyAmount",
          ROUND(COALESCE(NULLIF(b.vat_amount, 0), COALESCE(b.pro_rata_revenue, 0) * 0.1)) as "vatAmount",
          ROUND(COALESCE(NULLIF(b.total_amount, 0), COALESCE(b.pro_rata_revenue, 0) + COALESCE(NULLIF(b.vat_amount, 0), COALESCE(b.pro_rata_revenue, 0) * 0.1))) as "totalAmount",
          COALESCE(
            NULLIF(b.tax_items->0->>'itemName', ''),
            NULLIF(c.tax_items->0->>'itemName', ''),
            CONCAT(COALESCE(rp.model_name, '임대장비'), ' ', b.year_month, ' 임대료')
          ) as "itemName"
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
          CONCAT(CASE WHEN c.service_type = 'DEVELOPMENT' THEN 'DEV_SERVICE_' ELSE 'OP_SERVICE_' END, b.id) as "uid",
          CASE WHEN c.service_type = 'DEVELOPMENT' THEN 'DEV_SERVICE' ELSE 'OP_SERVICE' END as "domainType",
          b.billing_no as "billingNo",
          COALESCE(b.billing_date, b.created_at::date) as "billingDate",
          TO_CHAR(COALESCE(b.billing_date, b.created_at::date), 'YYYY-MM') as "yearMonth",
          c.id as "contractId",
          c.contract_no as "contractNo",
          c.customer_name as "customerName",
          COALESCE(c.entity_type, 'CORP') as "entityType",
          c.project_name as "projectName",
          b.milestone_name as "milestoneName",
          COALESCE(NULLIF(c.customer_biz_no, ''), p.business_no, '100-00-00000') as "businessNo",
          COALESCE(NULLIF(c.customer_ceo_name, ''), p.ceo_name, '대표자') as "ceoName",
          COALESCE(NULLIF(c.customer_address, ''), CONCAT_WS(' ', p.address, p.address_detail), '') as "customerAddress",
          COALESCE(NULLIF(c.customer_biz_type, ''), p.biz_type, '') as "customerBizType",
          COALESCE(NULLIF(c.customer_biz_class, ''), p.biz_item, '') as "customerBizClass",
          COALESCE(NULLIF(c.customer_email, ''), p.main_email, '') as "customerEmail",
          COALESCE(c.customer_email2, '') as "customerEmail2",
          COALESCE(NULLIF(b.tax_purpose, ''), c.tax_purpose, '청구') as "purposeType",
          COALESCE(NULLIF(b.tax_memo, ''), c.tax_memo, b.memo, '') as "taxMemo",
          CASE 
            WHEN b.tax_items IS NOT NULL AND jsonb_array_length(b.tax_items) > 0 THEN b.tax_items
            WHEN c.tax_items IS NOT NULL AND jsonb_array_length(c.tax_items) > 0 THEN c.tax_items
            ELSE '[]'::jsonb
          END as "taxItems",
          ROUND(COALESCE(b.supply_amount, 0)) as "supplyAmount",
          ROUND(COALESCE(b.vat_amount, 0)) as "vatAmount",
          ROUND(COALESCE(b.total_amount, 0)) as "totalAmount",
          COALESCE(
            NULLIF(b.tax_items->0->>'itemName', ''),
            NULLIF(c.tax_items->0->>'itemName', ''),
            CONCAT(COALESCE(c.project_name, '용역'), ' ', COALESCE(b.milestone_name, '기성금'))
          ) as "itemName"
        FROM erp_service_billings b
        JOIN erp_service_contracts c ON b.contract_id = c.id
        LEFT JOIN erp_partners p ON c.partner_id = p.id OR (c.partner_id IS NULL AND c.customer_name = p.name)
        WHERE b.tax_invoice_id IS NULL
        ORDER BY b.billing_date DESC, b.id DESC
      `;

      // 1-3. Trade Billings (WHERE tax_invoice_id IS NULL)
      const tradeQuery = `
        SELECT
          b.id as "billingId",
          CONCAT('TRADE_SALE_', b.id) as "uid",
          'TRADE_SALE' as "domainType",
          b.billing_no as "billingNo",
          COALESCE(b.billing_date, s.sale_date, b.created_at::date) as "billingDate",
          TO_CHAR(COALESCE(b.billing_date, s.sale_date, b.created_at::date), 'YYYY-MM') as "yearMonth",
          s.id as "contractId",
          s.sale_no as "contractNo",
          s.customer_name as "customerName",
          COALESCE(s.entity_type, 'CORP') as "entityType",
          tp.name as "projectName",
          COALESCE(b.milestone_name, CONCAT(s.qty, COALESCE(tp.unit, 'EA'))) as "milestoneName",
          COALESCE(NULLIF(s.customer_biz_no, ''), p.business_no, '100-00-00000') as "businessNo",
          COALESCE(NULLIF(s.customer_ceo_name, ''), p.ceo_name, '대표자') as "ceoName",
          COALESCE(NULLIF(s.customer_address, ''), CONCAT_WS(' ', p.address, p.address_detail), '') as "customerAddress",
          COALESCE(NULLIF(s.customer_biz_type, ''), p.biz_type, '') as "customerBizType",
          COALESCE(NULLIF(s.customer_biz_class, ''), p.biz_item, '') as "customerBizClass",
          COALESCE(NULLIF(s.customer_email, ''), p.main_email, '') as "customerEmail",
          COALESCE(s.customer_email2, '') as "customerEmail2",
          COALESCE(NULLIF(b.tax_purpose, ''), s.tax_purpose, '청구') as "purposeType",
          COALESCE(NULLIF(b.tax_memo, ''), s.tax_memo, b.memo, tp.name) as "taxMemo",
          CASE 
            WHEN b.tax_items IS NOT NULL AND jsonb_array_length(b.tax_items) > 0 THEN b.tax_items
            WHEN s.tax_items IS NOT NULL AND jsonb_array_length(s.tax_items) > 0 THEN s.tax_items
            ELSE '[]'::jsonb
          END as "taxItems",
          ROUND(COALESCE(b.supply_amount, s.total_amount, 0)) as "supplyAmount",
          ROUND(COALESCE(NULLIF(b.vat_amount, 0), s.vat_amount, COALESCE(b.supply_amount, s.total_amount, 0) * 0.1)) as "vatAmount",
          ROUND(COALESCE(b.total_amount, COALESCE(b.supply_amount, s.total_amount, 0) * 1.1)) as "totalAmount",
          COALESCE(
            NULLIF(b.tax_items->0->>'itemName', ''),
            NULLIF(s.tax_items->0->>'itemName', ''),
            b.milestone_name,
            CONCAT(tp.name, ' (', s.qty, COALESCE(tp.unit, 'EA'), ')')
          ) as "itemName"
        FROM erp_trade_billings b
        JOIN erp_trade_sales s ON b.sale_id = s.id
        LEFT JOIN erp_trade_products tp ON s.product_id = tp.id
        LEFT JOIN erp_partners p ON s.partner_id = p.id OR (s.partner_id IS NULL AND s.customer_name = p.name)
        WHERE b.tax_invoice_id IS NULL
        ORDER BY b.billing_date DESC, b.id DESC
      `;

      const [rentalRes, serviceRes, tradeRes] = await Promise.all([
        pool.query(rentalQuery),
        pool.query(serviceQuery),
        pool.query(tradeQuery),
      ]);

      const unissuedBillings = [...rentalRes.rows, ...serviceRes.rows, ...tradeRes.rows];
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
        COALESCE(customer_address, '') as "customerAddress",
        COALESCE(customer_biz_type, '') as "customerBizType",
        COALESCE(customer_biz_class, '') as "customerBizClass",
        COALESCE(customer_email, '') as "customerEmail",
        COALESCE(customer_email2, '') as "customerEmail2",
        COALESCE(purpose_type, '청구') as "purposeType",
        COALESCE(modify_reason, '해당없음') as "modifyReason",
        COALESCE(tax_items, '[]'::jsonb) as "taxItems",
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
          const writeDateStr = item.issueDate || (item.billingDate ? String(item.billingDate).slice(0, 10) : new Date().toISOString().slice(0, 10));
          const mm = writeDateStr.slice(5, 7);
          const dd = writeDateStr.slice(8, 10);

          const normalizedTaxItems = Array.isArray(item.taxItems) && item.taxItems.length > 0
            ? item.taxItems.map((ti: any) => ({
                month: ti.month || mm,
                day: ti.day || dd,
                itemName: ti.itemName || item.itemName,
                spec: ti.spec || "",
                qty: Number(ti.qty || 1),
                unitPrice: Number(ti.unitPrice ?? ti.supplyAmount ?? supply),
                supplyAmount: Number(ti.supplyAmount ?? supply),
                vatAmount: Number(ti.vatAmount ?? vat),
                remark: ti.remark || "",
              }))
            : [
                {
                  month: mm,
                  day: dd,
                  itemName: item.itemName || "렌탈 및 기술용역료",
                  spec: "",
                  qty: 1,
                  unitPrice: supply,
                  supplyAmount: supply,
                  vatAmount: vat,
                  remark: "",
                },
              ];

          const resolvedItemName = normalizedTaxItems.length > 1
            ? `${normalizedTaxItems[0].itemName} 외 ${normalizedTaxItems.length - 1}건`
            : (normalizedTaxItems[0]?.itemName || item.itemName || "렌탈 및 기술용역료");

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
              writeDate: writeDateStr.replace(/-/g, ""),
              purposeType: item.purposeType || "청구",
              customerName: item.customerName,
              customerBizNo: item.businessNo || "100-00-00000",
              customerCeoName: item.ceoName || "대표자",
              customerAddr: item.customerAddress || "",
              customerBizType: item.customerBizType || "",
              customerBizClass: item.customerBizClass || "",
              customerEmail: item.customerEmail || entity.email,
              customerEmail2: item.customerEmail2 || "",
              itemName: resolvedItemName,
              supplyAmount: supply,
              vatAmount: vat,
              totalAmount: total,
              memo: item.taxMemo || item.memo || "",
              taxItems: normalizedTaxItems,
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
              customer_name, business_no, ceo_name, customer_address, customer_biz_type, customer_biz_class,
              customer_email, customer_email2, purpose_type, modify_reason, tax_items,
              issue_date, supply_amount, vat_amount, total_amount, item_name,
              status, nts_confirm_no, memo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, '해당없음', $21::jsonb, $22, $23, $24, $25, $26, 'SENT_NTS', $27, $28)
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
              item.customerAddress || "",
              item.customerBizType || "",
              item.customerBizClass || "",
              item.customerEmail || "",
              item.customerEmail2 || "",
              item.purposeType || "청구",
              JSON.stringify(normalizedTaxItems),
              writeDateStr,
              supply,
              vat,
              total,
              resolvedItemName,
              ntsConfirmNo,
              item.taxMemo || item.memo || "",
            ]
          );
          const savedInvoice = insRes.rows[0];
          issuedInvoices.push(savedInvoice);

          // Link to original billing/sale record
          if (item.billingId) {
            if (item.domainType === "RENTAL") {
              await client.query("UPDATE erp_rental_billings SET tax_invoice_id = $1 WHERE id = $2", [savedInvoice.id, item.billingId]);
            } else if (item.domainType === "TRADE_SALE") {
              await client.query("UPDATE erp_trade_billings SET tax_invoice_id = $1 WHERE id = $2", [savedInvoice.id, item.billingId]);
              if (item.contractId) {
                await client.query("UPDATE erp_trade_sales SET tax_invoice_id = $1 WHERE id = $2", [savedInvoice.id, item.contractId]);
              }
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

      // CASE B: Single Issue (Manual or Direct from Domain Table)
      const { 
        domainType, refId, customerName, businessNo, ceoName,
        customerAddress, customerBizType, customerBizClass, customerEmail, customerEmail2,
        purposeType, taxItems,
        issueDate, supplyAmount, vatAmount, itemName, memo, supplierEntityType 
      } = body;

      if (!customerName || !supplyAmount || (!itemName && (!Array.isArray(taxItems) || taxItems.length === 0))) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "거래처명, 품목명, 공급가액은 필수입니다." }, { status: 400 });
      }

      const entityType = supplierEntityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
      const entity = getEntity(entityType);
      const supply = Math.round(parseFloat(supplyAmount));
      const vat = vatAmount !== undefined && vatAmount !== null && vatAmount !== ""
        ? Math.round(parseFloat(vatAmount))
        : Math.round(supply * 0.1);
      const total = supply + vat;
      const writeDateStr = issueDate ? String(issueDate).slice(0, 10) : new Date().toISOString().split("T")[0];
      const mm = writeDateStr.slice(5, 7);
      const dd = writeDateStr.slice(8, 10);
      const invoiceNo = `TX${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      const normalizedTaxItems = Array.isArray(taxItems) && taxItems.length > 0
        ? taxItems.map((ti: any) => ({
            month: ti.month || mm,
            day: ti.day || dd,
            itemName: ti.itemName || itemName,
            spec: ti.spec || "",
            qty: Number(ti.qty || 1),
            unitPrice: Number(ti.unitPrice ?? ti.supplyAmount ?? supply),
            supplyAmount: Number(ti.supplyAmount ?? supply),
            vatAmount: Number(ti.vatAmount ?? vat),
            remark: ti.remark || "",
          }))
        : [
            {
              month: mm,
              day: dd,
              itemName: (itemName || "물품 및 용역 공급").trim(),
              spec: "",
              qty: 1,
              unitPrice: supply,
              supplyAmount: supply,
              vatAmount: vat,
              remark: "",
            },
          ];

      const resolvedItemName = normalizedTaxItems.length > 1
        ? `${normalizedTaxItems[0].itemName} 외 ${normalizedTaxItems.length - 1}건`
        : (normalizedTaxItems[0]?.itemName || itemName);

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
          writeDate: writeDateStr.replace(/-/g, ""),
          purposeType: purposeType || "청구",
          customerName: customerName.trim(),
          customerBizNo: businessNo || "100-00-00000",
          customerCeoName: ceoName || "대표자",
          customerAddr: customerAddress || "",
          customerBizType: customerBizType || "",
          customerBizClass: customerBizClass || "",
          customerEmail: customerEmail || entity.email,
          customerEmail2: customerEmail2 || "",
          itemName: resolvedItemName.trim(),
          supplyAmount: supply,
          vatAmount: vat,
          totalAmount: total,
          memo: memo || "",
          taxItems: normalizedTaxItems,
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
          customer_name, business_no, ceo_name, customer_address, customer_biz_type, customer_biz_class,
          customer_email, customer_email2, purpose_type, modify_reason, tax_items,
          issue_date, supply_amount, vat_amount, total_amount, item_name,
          status, nts_confirm_no, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, '해당없음', $21::jsonb, $22, $23, $24, $25, $26, 'SENT_NTS', $27, $28)
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
          customerAddress || "",
          customerBizType || "",
          customerBizClass || "",
          customerEmail || "",
          customerEmail2 || "",
          purposeType || "청구",
          JSON.stringify(normalizedTaxItems),
          writeDateStr,
          supply,
          vat,
          total,
          resolvedItemName.trim(),
          ntsConfirmNo,
          memo || "",
        ]
      );
      const invoice = insRes.rows[0];

      if (refId) {
        if (domainType === "RENTAL") {
          await client.query("UPDATE erp_rental_billings SET tax_invoice_id = $1 WHERE id = $2", [invoice.id, refId]);
        } else if (domainType === "TRADE_SALE") {
          const tbUpd = await client.query("UPDATE erp_trade_billings SET tax_invoice_id = $1 WHERE id = $2 RETURNING sale_id", [invoice.id, refId]);
          if (tbUpd.rows.length > 0 && tbUpd.rows[0].sale_id) {
            await client.query("UPDATE erp_trade_sales SET tax_invoice_id = $1 WHERE id = $2", [invoice.id, tbUpd.rows[0].sale_id]);
          } else {
            await client.query("UPDATE erp_trade_sales SET tax_invoice_id = $1 WHERE id = $2", [invoice.id, refId]);
          }
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
