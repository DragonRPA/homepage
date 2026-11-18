export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { getEntity } from "@/lib/businessEntities";
import { registIssuePopbill, deletePopbillInvoice, resolvePopbillCorpNum } from "@/lib/popbillService";
import { resolveContractItemTemplate, resolveContractTaxItemsTemplate, selectPreferredBizItem } from "@/lib/erpContractTemplate";
import { assertPartnerTradable, PartnerTradeBlockedError } from "@/lib/partnerStatusService";
import { requireMenuPermission } from "@/lib/erpRbacGuard";
import { syncBankAccountClosingState } from "@/lib/erpBankClosing";

function normalizeNameForAutoMatch(raw?: string): string {
  if (!raw) return "";
  return String(raw)
    .replace(/\(주\)|주식회사|（주）|\(유\)|유한회사|㈜|사단법인|\(사\)|재단법인|\(재\)/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^가-힣a-zA-Z0-9]/g, "")
    .toLowerCase()
    .trim();
}

// 고객사 세금계산서 수신 이메일을 거래처(erp_partners), 담당자(erp_partner_contacts), 계약(erp_service_contracts, erp_rental_contracts)에서 조회
async function resolveCustomerTaxEmails(
  client: any,
  customerName?: string,
  businessNo?: string,
  rawEmail1?: string,
  rawEmail2?: string
): Promise<{ email1: string; email2: string }> {
  let email1 = (rawEmail1 || "").trim();
  let email2 = (rawEmail2 || "").trim();
  if (email1) return { email1, email2 };

  const cleanName = (customerName || "").trim();
  const cleanBiz = (businessNo || "").trim();

  const pRes = await client.query(
    `SELECT
       COALESCE(
         NULLIF(p.main_email, ''),
         (SELECT pc.email FROM erp_partner_contacts pc WHERE pc.partner_id = p.id AND pc.email IS NOT NULL AND pc.email <> '' ORDER BY pc.is_primary DESC, pc.id ASC LIMIT 1),
         (SELECT sc.customer_email FROM erp_service_contracts sc WHERE (sc.partner_id = p.id OR sc.customer_name = p.name) AND sc.customer_email IS NOT NULL AND sc.customer_email <> '' ORDER BY sc.id DESC LIMIT 1),
         (SELECT rc.customer_email FROM erp_rental_contracts rc WHERE (rc.partner_id = p.id OR rc.customer_name = p.name) AND rc.customer_email IS NOT NULL AND rc.customer_email <> '' ORDER BY rc.id DESC LIMIT 1),
         ''
       ) AS main_email,
       COALESCE(
         NULLIF(p.sub_email, ''),
         (SELECT sc.customer_email2 FROM erp_service_contracts sc WHERE (sc.partner_id = p.id OR sc.customer_name = p.name) AND sc.customer_email2 IS NOT NULL AND sc.customer_email2 <> '' ORDER BY sc.id DESC LIMIT 1),
         (SELECT rc.customer_email2 FROM erp_rental_contracts rc WHERE (rc.partner_id = p.id OR rc.customer_name = p.name) AND rc.customer_email2 IS NOT NULL AND rc.customer_email2 <> '' ORDER BY rc.id DESC LIMIT 1),
         ''
       ) AS sub_email
     FROM erp_partners p
     WHERE ($1 <> '' AND p.business_no = $1) OR ($2 <> '' AND p.name = $2)
     ORDER BY (CASE WHEN p.main_email IS NOT NULL AND p.main_email <> '' THEN 0 ELSE 1 END), p.id ASC
     LIMIT 1`,
    [cleanBiz, cleanName]
  );

  if (pRes.rows.length > 0) {
    email1 = email1 || pRes.rows[0].main_email || "";
    email2 = email2 || pRes.rows[0].sub_email || "";
  }
  return { email1, email2 };
}

// 신규 세금계산서 발행/등록 직후 미매칭 통장 입출금 내역(erp_bank_transactions)과 자동 대사 및 원천 청구 수납 연동
async function tryAutoReconcileNewInvoice(client: any, invoice: any) {
  const ioType = invoice.io_type || "SALE";
  const entityType = invoice.supplier_entity_type || "CORP";
  const totalAmt = Number(invoice.total_amount || 0);
  if (totalAmt <= 0) return invoice;

  const invName = normalizeNameForAutoMatch(invoice.customer_name);
  const invCeo = normalizeNameForAutoMatch(invoice.ceo_name);
  if (!invName || invName.length < 2) return invoice;

  const txCond =
    ioType === "PURCHASE"
      ? `(COALESCE(withdrawal_amount, 0) > 0 OR trans_type = 'WITHDRAWAL')`
      : `(COALESCE(deposit_amount, 0) > 0 OR trans_type = 'DEPOSIT')`;

  const candRes = await client.query(
    `SELECT id, trans_date::text AS trans_date,
            COALESCE(deposit_amount, 0)::numeric AS deposit_amount,
            COALESCE(withdrawal_amount, 0)::numeric AS withdrawal_amount,
            sender_receiver, counterparty_holder, memo
     FROM erp_bank_transactions
     WHERE ${txCond}
       AND COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) = $1
       AND COALESCE(is_matched, false) = false
     ORDER BY trans_date DESC, id DESC
     LIMIT 200`,
    [entityType]
  );

  const invDate = new Date(String(invoice.issue_date).slice(0, 10)).getTime();
  let matchedTx: any = null;

  for (const tx of candRes.rows) {
    const txAmt = ioType === "PURCHASE" ? Number(tx.withdrawal_amount) : Number(tx.deposit_amount);
    if (Math.abs(txAmt - totalAmt) > 1000) continue;

    const txDate = new Date(String(tx.trans_date).slice(0, 10)).getTime();
    const diffDays = Math.round((txDate - invDate) / (1000 * 60 * 60 * 24));
    if (diffDays < -35 || diffDays > 60) continue;

    const sr = normalizeNameForAutoMatch(tx.sender_receiver);
    const ch = normalizeNameForAutoMatch(tx.counterparty_holder);
    const mm = normalizeNameForAutoMatch(tx.memo);

    const isNameMatched =
      (sr && (sr.includes(invName) || invName.includes(sr))) ||
      (ch && (ch.includes(invName) || invName.includes(ch))) ||
      (mm && mm.includes(invName)) ||
      (invCeo && invCeo.length >= 2 && ((sr && sr.includes(invCeo)) || (ch && ch.includes(invCeo))));

    if (isNameMatched) {
      matchedTx = tx;
      break;
    }
  }

  if (!matchedTx) return invoice;

  const txId = Number(matchedTx.id);
  const updInv = await client.query(
    `UPDATE erp_tax_invoices
     SET settled_amount = $1,
         settlement_status = 'PAID',
         matched_bank_tx_ids = $2::jsonb,
         settled_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [totalAmt, JSON.stringify([txId]), invoice.id]
  );

  await client.query(
    `UPDATE erp_bank_transactions
     SET is_matched = true,
         matched_type = $1,
         matched_id = $2,
         matched_at = NOW()
     WHERE id = $3`,
    [ioType === "PURCHASE" ? "PURCHASE_INVOICE" : "SALE_INVOICE", invoice.invoice_no, txId]
  );

  // 연결된 청구 테이블 수납완료 동기화
  await client.query(`UPDATE erp_service_billings SET payment_status = 'PAID' WHERE tax_invoice_id = $1`, [invoice.id]);
  await client.query(
    `UPDATE erp_rental_billings SET payment_status = 'PAID', paid_amount = total_amount WHERE tax_invoice_id = $1`,
    [invoice.id]
  );
  await client.query(
    `UPDATE erp_trade_billings SET payment_status = 'PAID', paid_amount = total_amount WHERE tax_invoice_id = $1`,
    [invoice.id]
  );

  await syncBankAccountClosingState(client);

  return updInv.rows[0] || invoice;
}

function mapTaxItemInput(
  ti: any,
  d: { mm: string; dd: string; itemName: string; supply: number; vat: number; remark: string }
) {
  return {
    month: ti.month || d.mm,
    day: ti.day || d.dd,
    itemName: ti.itemName || d.itemName,
    spec: ti.spec || "",
    qty: Number(ti.qty || 1),
    unitPrice: Number(ti.unitPrice ?? ti.unitCost ?? ti.supplyAmount ?? d.supply),
    supplyAmount: Number(ti.supplyAmount ?? d.supply),
    vatAmount: Number(ti.vatAmount ?? d.vat),
    remark: ti.remark || ti.note || d.remark,
  };
}

function resolveInvoiceContent(params: {
  baseItems: any[];
  writeDateStr: string;
  fallbackFirstItem?: string;
  rawMemoSource?: string;
  fallbackTextItem?: string;
  computeSummaryTemplate: (normalizedItems: any[]) => string;
}) {
  const normalizedTaxItems = resolveContractTaxItemsTemplate(params.baseItems, {
    dateStr: params.writeDateStr,
    fallbackFirstItem: params.fallbackFirstItem,
  });
  const firstFallback = normalizedTaxItems[0]?.itemName || params.fallbackTextItem;
  const resolvedMemo = resolveContractItemTemplate(params.rawMemoSource || "", {
    dateStr: params.writeDateStr,
    items: normalizedTaxItems,
    fallbackFirstItem: firstFallback,
  });
  const resolvedItemName = resolveContractItemTemplate(params.computeSummaryTemplate(normalizedTaxItems), {
    dateStr: params.writeDateStr,
    items: normalizedTaxItems,
    fallbackFirstItem: firstFallback,
  });
  return { normalizedTaxItems, resolvedMemo, resolvedItemName };
}

async function issueAndRecordTaxInvoiceTx(
  client: any,
  params: {
    invoiceNo: string;
    ioType?: "SALE" | "PURCHASE";
    sourceType?: string;
    domainType: string;
    refId: number | null;
    entity: ReturnType<typeof getEntity>;
    customerName: string;
    businessNo?: string | null;
    ceoName?: string | null;
    customerAddress?: string | null;
    customerBizType?: string | null;
    customerBizClass?: string | null;
    customerEmail?: string | null;
    customerEmail2?: string | null;
    purposeType?: string | null;
    taxItems: any[];
    writeDateStr: string;
    supplyAmount: number;
    vatAmount: number;
    totalAmount: number;
    itemName: string;
    memo: string;
    rawNtsConfirmNo?: string | null;
  }
) {
  const ioType = params.ioType || "SALE";
  const preferredBizClass = selectPreferredBizItem(params.customerBizClass || "");
  const emails = await resolveCustomerTaxEmails(
    client,
    params.customerName,
    params.businessNo || undefined,
    params.customerEmail || undefined,
    params.customerEmail2 || undefined
  );

  let ntsConfirmNo: string | null = params.rawNtsConfirmNo || null;
  let invoiceStatus = ioType === "PURCHASE" ? "SENT_NTS" : "ISSUED";

  if (ioType === "SALE") {
    const popRes = await registIssuePopbill({
      corpNum: params.entity.bizNumRaw,
      supplierCorpName: params.entity.corpName,
      supplierCeoName: params.entity.ceoName,
      supplierAddr: params.entity.address,
      supplierBizType: params.entity.bizType,
      supplierBizClass: params.entity.bizClass,
      supplierEmail: params.entity.email,
      invoicerMgtKey: params.invoiceNo,
      writeDate: params.writeDateStr.replace(/-/g, ""),
      purposeType: params.purposeType || "청구",
      customerName: params.customerName,
      customerBizNo: params.businessNo || "",
      customerCeoName: params.ceoName || "대표자",
      customerAddr: params.customerAddress || "",
      customerBizType: params.customerBizType || "",
      customerBizClass: preferredBizClass,
      customerEmail: emails.email1,
      customerEmail2: emails.email2,
      itemName: params.itemName,
      supplyAmount: params.supplyAmount,
      vatAmount: params.vatAmount,
      totalAmount: params.totalAmount,
      memo: params.memo,
      taxItems: params.taxItems,
    });
    ntsConfirmNo = popRes.ntsConfirmNo || null;
    invoiceStatus = popRes.mode === "REGISTERED_IN_POPBILL" ? "TEMP_SAVED" : "ISSUED";
  }

  const insRes = await client.query(
    `INSERT INTO erp_tax_invoices
     (invoice_no, io_type, source_type, domain_type, ref_id, supplier_entity_type, supplier_corp_num, supplier_corp_name,
      supplier_ceo_name, supplier_address, supplier_biz_type, supplier_biz_class, supplier_email,
      customer_name, business_no, ceo_name, customer_address, customer_biz_type, customer_biz_class,
      customer_email, customer_email2, purpose_type, modify_reason, tax_items,
      issue_date, supply_amount, vat_amount, total_amount, item_name,
      status, nts_confirm_no, memo, settled_amount, settlement_status, matched_bank_tx_ids)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, '해당없음', $23::jsonb, $24, $25, $26, $27, $28, $29, $30, $31, 0, 'UNPAID', '[]'::jsonb)
     RETURNING *`,
    [
      params.invoiceNo, ioType, params.sourceType || "ERP_ISSUED", params.domainType, params.refId ?? null,
      params.entity.key, params.entity.bizNumRaw, params.entity.corpName, params.entity.ceoName,
      params.entity.address, params.entity.bizType, params.entity.bizClass, params.entity.email,
      params.customerName, params.businessNo || "100-00-00000", params.ceoName || "대표자",
      params.customerAddress || "", params.customerBizType || "", preferredBizClass,
      emails.email1, emails.email2, params.purposeType || "청구", JSON.stringify(params.taxItems),
      params.writeDateStr, params.supplyAmount, params.vatAmount, params.totalAmount,
      params.itemName, invoiceStatus, ntsConfirmNo, params.memo,
    ]
  );
  return { invoice: insRes.rows[0], ntsConfirmNo };
}

async function linkGroupBillingsToInvoiceTx(client: any, invoiceId: number, group: any[]) {
  const rentalIds: number[] = [];
  const serviceIds: number[] = [];
  const tradeIds: number[] = [];
  const linkedSaleIds = new Set<number>();

  for (const bItem of group) {
    const billingId = Number(bItem?.billingId);
    if (!Number.isFinite(billingId) || billingId <= 0) continue;

    if (bItem.domainType === "RENTAL") {
      rentalIds.push(billingId);
    } else if (bItem.domainType === "TRADE_SALE" || bItem.domainType === "TRADE") {
      tradeIds.push(billingId);
      if (Number(bItem.contractId) > 0) linkedSaleIds.add(Number(bItem.contractId));
      if (Array.isArray(bItem.saleIds)) {
        for (const sid of bItem.saleIds) {
          if (Number(sid) > 0) linkedSaleIds.add(Number(sid));
        }
      }
    } else {
      serviceIds.push(billingId);
    }
  }

  if (rentalIds.length > 0) {
    await client.query(
      "UPDATE erp_rental_billings SET tax_invoice_id = $1 WHERE id = ANY($2::bigint[])",
      [invoiceId, Array.from(new Set(rentalIds))]
    );
  }
  if (serviceIds.length > 0) {
    await client.query(
      "UPDATE erp_service_billings SET tax_invoice_id = $1 WHERE id = ANY($2::bigint[])",
      [invoiceId, Array.from(new Set(serviceIds))]
    );
  }
  if (tradeIds.length > 0) {
    const tbUpd = await client.query(
      "UPDATE erp_trade_billings SET tax_invoice_id = $1 WHERE id = ANY($2::int[]) RETURNING sale_id, sale_ids",
      [invoiceId, Array.from(new Set(tradeIds))]
    );
    for (const row of tbUpd.rows) {
      if (Number(row.sale_id) > 0) linkedSaleIds.add(Number(row.sale_id));
      if (Array.isArray(row.sale_ids)) {
        for (const sid of row.sale_ids) {
          if (Number(sid) > 0) linkedSaleIds.add(Number(sid));
        }
      }
    }
  }
  if (linkedSaleIds.size > 0) {
    await client.query(
      "UPDATE erp_trade_sales SET tax_invoice_id = $1 WHERE id = ANY($2::bigint[])",
      [invoiceId, Array.from(linkedSaleIds)]
    );
  }
}

const partnerTaxSelectCols = (a: string) => `
          COALESCE(NULLIF(${a}.customer_biz_no, ''), p.business_no, '100-00-00000') as "businessNo",
          COALESCE(NULLIF(${a}.customer_ceo_name, ''), p.ceo_name, '대표자') as "ceoName",
          COALESCE(NULLIF(${a}.customer_address, ''), CONCAT_WS(' ', p.address, p.address_detail), '') as "customerAddress",
          COALESCE(NULLIF(${a}.customer_biz_type, ''), p.biz_type, '') as "customerBizType",
          COALESCE(NULLIF(${a}.customer_biz_class, ''), p.biz_item, '') as "customerBizClass",
          COALESCE(NULLIF(${a}.customer_email, ''), p.main_email, '') as "customerEmail",
          COALESCE(NULLIF(${a}.customer_email2, ''), p.sub_email, '') as "customerEmail2",`;

const taxItemsFallbackCol = (a: string) =>
  `CASE WHEN b.tax_items IS NOT NULL AND jsonb_array_length(b.tax_items) > 0 THEN b.tax_items WHEN ${a}.tax_items IS NOT NULL AND jsonb_array_length(${a}.tax_items) > 0 THEN ${a}.tax_items ELSE '[]'::jsonb END as "taxItems"`;

// GET: List tax invoices or unissued billings
export async function GET(request: Request) {
  try {
    const guard = await requireMenuPermission(
      request,
      ["tax", "TAX", "tax_invoice", "tax_invoices"],
      "view"
    );
    if (!guard.authorized) {
      return guard.response!;
    }

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
          rp.model_name as "modelName",${partnerTaxSelectCols("c")}
          COALESCE(NULLIF(b.tax_purpose, ''), c.tax_purpose, '청구') as "purposeType",
          COALESCE(NULLIF(b.tax_memo, ''), c.tax_memo, CONCAT(c.customer_name, ' ', b.year_month, ' 임대료')) as "taxMemo",
          ${taxItemsFallbackCol("c")},
          ROUND(COALESCE(b.pro_rata_revenue, 0)) as "supplyAmount",
          ROUND(COALESCE(NULLIF(b.vat_amount, 0), COALESCE(b.pro_rata_revenue, 0) * 0.1)) as "vatAmount",
          ROUND(COALESCE(NULLIF(b.total_amount, 0), COALESCE(b.pro_rata_revenue, 0) + COALESCE(NULLIF(b.vat_amount, 0), COALESCE(b.pro_rata_revenue, 0) * 0.1))) as "totalAmount",
          COALESCE(NULLIF(b.tax_items->0->>'itemName', ''), NULLIF(c.tax_items->0->>'itemName', ''), CONCAT(COALESCE(rp.model_name, '임대장비'), ' ', b.year_month, ' 임대료')) as "itemName"
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
          c.id as "contractId", c.contract_no as "contractNo", c.customer_name as "customerName",
          COALESCE(c.entity_type, 'CORP') as "entityType", c.project_name as "projectName",
          b.milestone_name as "milestoneName",${partnerTaxSelectCols("c")}
          COALESCE(NULLIF(b.tax_purpose, ''), c.tax_purpose, '청구') as "purposeType",
          COALESCE(NULLIF(b.tax_memo, ''), c.tax_memo, b.memo, '') as "taxMemo",
          ${taxItemsFallbackCol("c")},
          ROUND(COALESCE(b.supply_amount, 0)) as "supplyAmount",
          ROUND(COALESCE(b.vat_amount, 0)) as "vatAmount",
          ROUND(COALESCE(b.total_amount, 0)) as "totalAmount",
          COALESCE(NULLIF(b.tax_items->0->>'itemName', ''), NULLIF(c.tax_items->0->>'itemName', ''), CONCAT(COALESCE(c.project_name, '용역'), ' ', COALESCE(b.milestone_name, '기성금'))) as "itemName"
        FROM erp_service_billings b
        JOIN erp_service_contracts c ON b.contract_id = c.id
        LEFT JOIN erp_partners p ON c.partner_id = p.id OR (c.partner_id IS NULL AND c.customer_name = p.name)
        WHERE b.tax_invoice_id IS NULL
        ORDER BY b.billing_date DESC, b.id DESC
      `;

      // 1-3. Trade Billings (WHERE tax_invoice_id IS NULL)
      const tradeQuery = `
        SELECT
          b.id as "billingId", CONCAT('TRADE_SALE_', b.id) as "uid", 'TRADE_SALE' as "domainType",
          b.billing_no as "billingNo", COALESCE(b.billing_date, s.sale_date, b.created_at::date) as "billingDate",
          TO_CHAR(COALESCE(b.billing_date, s.sale_date, b.created_at::date), 'YYYY-MM') as "yearMonth",
          s.id as "contractId", COALESCE(b.sale_ids, '[]'::jsonb) as "saleIds", s.sale_no as "contractNo",
          s.customer_name as "customerName", COALESCE(s.entity_type, 'CORP') as "entityType",
          COALESCE(tp.name, b.tax_items->0->>'itemName', s.tax_items->0->>'itemName', '판매품목') as "projectName",
          COALESCE(b.milestone_name, CONCAT(s.qty, COALESCE(tp.unit, 'EA'))) as "milestoneName",${partnerTaxSelectCols("s")}
          COALESCE(NULLIF(b.tax_purpose, ''), s.tax_purpose, '청구') as "purposeType",
          COALESCE(NULLIF(b.tax_memo, ''), s.tax_memo, b.memo, tp.name) as "taxMemo",
          ${taxItemsFallbackCol("s")},
          ROUND(COALESCE(b.supply_amount, s.total_amount, 0)) as "supplyAmount",
          ROUND(COALESCE(NULLIF(b.vat_amount, 0), s.vat_amount, COALESCE(b.supply_amount, s.total_amount, 0) * 0.1)) as "vatAmount",
          ROUND(COALESCE(b.total_amount, COALESCE(b.supply_amount, s.total_amount, 0) * 1.1)) as "totalAmount",
          COALESCE(NULLIF(b.tax_items->0->>'itemName', ''), NULLIF(s.tax_items->0->>'itemName', ''), b.milestone_name, CONCAT(COALESCE(tp.name, '판매품목'), ' (', s.qty, COALESCE(tp.unit, 'EA'), ')')) as "itemName"
        FROM erp_trade_billings b
        LEFT JOIN erp_trade_sales s ON b.sale_id = s.id
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

      const rawBillings = [...rentalRes.rows, ...serviceRes.rows, ...tradeRes.rows];
      const unissuedBillings = rawBillings.map((row: any) => {
        const dateRef = row.yearMonth || (row.billingDate ? String(row.billingDate).slice(0, 10) : "");
        const fallbackFirst = row.modelName || row.projectName || row.itemName || "";
        const { normalizedTaxItems, resolvedMemo, resolvedItemName } = resolveInvoiceContent({
          baseItems: Array.isArray(row.taxItems) ? row.taxItems : [],
          writeDateStr: dateRef,
          fallbackFirstItem: fallbackFirst,
          rawMemoSource: row.taxMemo,
          fallbackTextItem: fallbackFirst,
          computeSummaryTemplate: () => row.itemName || "",
        });
        return {
          ...row,
          customerBizClass: selectPreferredBizItem(row.customerBizClass || ""),
          taxItems: normalizedTaxItems,
          taxMemo: resolvedMemo,
          itemName: resolvedItemName,
        };
      });
      return NextResponse.json({ success: true, billings: unissuedBillings });
    }

    // 2. Issued / Collected Tax Invoices (매출·매입 대장 목록 + 채권/채무 정산 상태)
    const ioType = searchParams.get("ioType"); // 'SALE' | 'PURCHASE' | 'ALL'
    const settlementStatus = searchParams.get("settlementStatus"); // 'UNPAID' | 'PARTIAL' | 'PAID' | 'ALL'

    let query = `
      SELECT 
        id, invoice_no as "invoiceNo",
        COALESCE(io_type, 'SALE') as "ioType", COALESCE(source_type, 'ERP_ISSUED') as "sourceType",
        domain_type as "domainType", ref_id as "refId",
        supplier_entity_type as "supplierEntityType", supplier_corp_num as "supplierCorpNum",
        supplier_corp_name as "supplierCorpName", supplier_ceo_name as "supplierCeoName",
        supplier_address as "supplierAddress", supplier_biz_type as "supplierBizType",
        supplier_biz_class as "supplierBizClass", supplier_email as "supplierEmail",
        customer_name as "customerName", business_no as "businessNo", ceo_name as "ceoName",
        COALESCE(customer_address, '') as "customerAddress", COALESCE(customer_biz_type, '') as "customerBizType",
        COALESCE(customer_biz_class, '') as "customerBizClass", COALESCE(customer_email, '') as "customerEmail",
        COALESCE(customer_email2, '') as "customerEmail2", COALESCE(purpose_type, '청구') as "purposeType",
        COALESCE(modify_reason, '해당없음') as "modifyReason", COALESCE(tax_items, '[]'::jsonb) as "taxItems",
        issue_date as "issueDate", supply_amount as "supplyAmount", vat_amount as "vatAmount", total_amount as "totalAmount",
        COALESCE(settled_amount, 0) as "settledAmount",
        GREATEST(0, COALESCE(total_amount, 0) - COALESCE(settled_amount, 0)) as "unpaidAmount",
        COALESCE(settlement_status, 'UNPAID') as "settlementStatus",
        COALESCE(matched_bank_tx_ids, '[]'::jsonb) as "matchedBankTxIds",
        settled_at as "settledAt", item_name as "itemName", status, nts_confirm_no as "ntsConfirmNo", memo, created_at as "createdAt"
      FROM erp_tax_invoices
      WHERE 1=1
    `;
    const params: any[] = [];
    if (ioType && ioType !== "ALL") {
      params.push(ioType);
      query += ` AND COALESCE(io_type, 'SALE') = $${params.length}`;
    }
    if (settlementStatus && settlementStatus !== "ALL") {
      params.push(settlementStatus);
      query += ` AND COALESCE(settlement_status, 'UNPAID') = $${params.length}`;
    }
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
    const billGuard = await requireMenuPermission(
      request,
      ["tax", "TAX", "tax_invoice", "tax_invoices"],
      "bill"
    );
    if (!billGuard.authorized) {
      const saveGuard = await requireMenuPermission(
        request,
        ["tax", "TAX", "tax_invoice", "tax_invoices"],
        "save"
      );
      if (!saveGuard.authorized) {
        return billGuard.response!;
      }
    }

    const body = await request.json();
    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // CASE A: Batch Issuance from Selected Contract Billings (Supports Consolidated 1-Invoice Issuance per Customer)
      if (body.batchIssue === true && Array.isArray(body.billings)) {
        const { billings } = body;
        const consolidate = body.consolidate === true;
        if (billings.length === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "선택된 청구건이 없습니다." }, { status: 400 });
        }

        const issuedInvoices = [];
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");

        // If consolidate === true, group selected billings by customerName + entityType into consolidated groups
        const billingGroups: any[][] = [];
        if (consolidate) {
          const groupMap = new Map<string, any[]>();
          for (const b of billings) {
            const key = `${(b.customerName || "").trim()}__${b.entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP"}`;
            if (!groupMap.has(key)) groupMap.set(key, []);
            groupMap.get(key)!.push(b);
          }
          for (const grp of groupMap.values()) {
            billingGroups.push(grp);
          }
        } else {
          for (const b of billings) {
            billingGroups.push([b]);
          }
        }

        for (let i = 0; i < billingGroups.length; i++) {
          const group = billingGroups[i];
          const item = group[0];
          await assertPartnerTradable(client, {
            customerName: item.customerName,
            businessNo: item.businessNo,
          });
          const entityType = item.entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
          const entity = getEntity(entityType);

          let supply = 0;
          let vat = 0;
          const combinedBaseTaxItems: any[] = [];

          const writeDateStr = item.issueDate || (item.billingDate ? String(item.billingDate).slice(0, 10) : new Date().toISOString().slice(0, 10));

          for (const bItem of group) {
            const bSupply = Math.round(parseFloat(bItem.supplyAmount) || 0);
            const bVat = Math.round(parseFloat(bItem.vatAmount) || Math.round(bSupply * 0.1));
            supply += bSupply;
            vat += bVat;

            const bDateStr = bItem.issueDate || (bItem.billingDate ? String(bItem.billingDate).slice(0, 10) : writeDateStr);
            const bMm = bDateStr.slice(5, 7);
            const bDd = bDateStr.slice(8, 10);

            if (Array.isArray(bItem.taxItems) && bItem.taxItems.length > 0) {
              for (const ti of bItem.taxItems) {
                combinedBaseTaxItems.push(
                  mapTaxItemInput(ti, {
                    mm: bMm,
                    dd: bDd,
                    itemName: bItem.itemName,
                    supply: bSupply,
                    vat: bVat,
                    remark: group.length > 1 ? bItem.billingNo || "" : "",
                  })
                );
              }
            } else {
              combinedBaseTaxItems.push(
                mapTaxItemInput(
                  {},
                  {
                    mm: bMm,
                    dd: bDd,
                    itemName: bItem.itemName || "렌탈 및 기술용역료",
                    supply: bSupply,
                    vat: bVat,
                    remark: group.length > 1 ? bItem.billingNo || "" : "",
                  }
                )
              );
            }
          }

          const total = supply + vat;

          const { normalizedTaxItems, resolvedMemo, resolvedItemName } = resolveInvoiceContent({
            baseItems: combinedBaseTaxItems,
            writeDateStr,
            fallbackFirstItem:
              combinedBaseTaxItems[0]?.itemName || item.modelName || item.projectName || item.itemName,
            rawMemoSource: group.length > 1 ? "{1번째 아이템} 외" : item.taxMemo || item.memo || "",
            fallbackTextItem: item.itemName,
            computeSummaryTemplate: (items) =>
              group.length === 1 && item.taxMemo && /\{[^}]+\}/.test(item.taxMemo)
                ? item.taxMemo
                : items.length > 1
                  ? "{1번째 아이템} 외"
                  : items[0]?.itemName || item.itemName || "렌탈 및 기술용역료",
          });

          // Unique Invoice No & NTS Mgt Key
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const invoiceNo = `TX${dateStr}-${String(i + 1).padStart(2, "0")}${randomSuffix}`;

          // Popbill Electronic Tax Invoice Issue + DB Insert
          const { invoice: savedInvoice, ntsConfirmNo } = await issueAndRecordTaxInvoiceTx(client, {
            invoiceNo,
            domainType: item.domainType || "RENTAL",
            refId: item.billingId ?? null,
            entity,
            customerName: item.customerName,
            businessNo: item.businessNo,
            ceoName: item.ceoName,
            customerAddress: item.customerAddress,
            customerBizType: item.customerBizType,
            customerBizClass: item.customerBizClass,
            customerEmail: item.customerEmail,
            customerEmail2: item.customerEmail2,
            purposeType: item.purposeType,
            taxItems: normalizedTaxItems,
            writeDateStr,
            supplyAmount: supply,
            vatAmount: vat,
            totalAmount: total,
            itemName: resolvedItemName,
            memo: resolvedMemo,
          });

          // Link to all original billing/sale records in the group (batched per domain table)
          await linkGroupBillingsToInvoiceTx(client, savedInvoice.id, group);

          // 통장 입금 내역이 이미 존재하는 경우 즉시 자동 대사 및 원천 청구 수납 완료 연동
          const reconciledInvoice = await tryAutoReconcileNewInvoice(client, savedInvoice);
          issuedInvoices.push(reconciledInvoice);

          // Audit log for each invoice
          await client.query(
            `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
             VALUES ('TAX_INVOICE', $1, $2, 'ADMIN', $3)`,
            [
              consolidate ? "CONSOLIDATED_ISSUE" : "BATCH_ISSUE",
              invoiceNo,
              JSON.stringify({
                billingIds: group.map((g: any) => g.billingId),
                customerName: item.customerName,
                total,
                ntsConfirmNo,
              }),
            ]
          );
        }

        await client.query("COMMIT");
        return NextResponse.json({
          success: true,
          count: issuedInvoices.length,
          message: consolidate
            ? `선택한 ${billings.length}건의 청구가 고객사별 합산(${issuedInvoices.length}장)으로 묶음 세금계산서 발행되었습니다.`
            : `선택한 ${issuedInvoices.length}건의 청구건에 대해 국세청 전자세금계산서가 성공적으로 일괄 발행되었습니다.`,
          invoices: issuedInvoices,
        });
      }

      // CASE B: Single Issue or Purchase Invoice Registration (Manual or Direct from Domain Table)
      const { 
        ioType: rawIoType, sourceType: rawSourceType, ntsConfirmNo: rawNtsConfirmNo,
        domainType, refId, customerName, businessNo, ceoName,
        customerAddress, customerBizType, customerBizClass, customerEmail, customerEmail2,
        purposeType, taxItems,
        issueDate, supplyAmount, vatAmount, itemName, memo, supplierEntityType 
      } = body;

      const ioType: "SALE" | "PURCHASE" = rawIoType === "PURCHASE" ? "PURCHASE" : "SALE";

      if (!customerName || !supplyAmount || (!itemName && (!Array.isArray(taxItems) || taxItems.length === 0))) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "거래처명, 품목명, 공급가액은 필수입니다." }, { status: 400 });
      }

      await assertPartnerTradable(client, {
        customerName,
        businessNo,
      });

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
      const prefix = ioType === "PURCHASE" ? "PX" : "TX";
      const invoiceNo = `${prefix}${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      const baseSingleItems = Array.isArray(taxItems) && taxItems.length > 0
        ? taxItems.map((ti: any) =>
            mapTaxItemInput(ti, { mm, dd, itemName, supply, vat, remark: "" })
          )
        : [
            mapTaxItemInput(
              {},
              { mm, dd, itemName: (itemName || "물품 및 용역 공급").trim(), supply, vat, remark: "" }
            ),
          ];

      const { normalizedTaxItems, resolvedMemo: resolvedSingleMemo, resolvedItemName } =
        resolveInvoiceContent({
          baseItems: baseSingleItems,
          writeDateStr,
          fallbackFirstItem: itemName,
          rawMemoSource: memo || "",
          fallbackTextItem: itemName,
          computeSummaryTemplate: (items) =>
            itemName && /\{[^}]+\}/.test(itemName)
              ? itemName
              : items.length > 1
                ? "{1번째 아이템} 외"
                : items[0]?.itemName || itemName,
        });

      const { invoice, ntsConfirmNo } = await issueAndRecordTaxInvoiceTx(client, {
        invoiceNo,
        ioType,
        sourceType: rawSourceType || (ioType === "PURCHASE" ? "MANUAL" : "ERP_ISSUED"),
        domainType: domainType || (ioType === "PURCHASE" ? "PURCHASE_EXPENSE" : "TRADE_SALE"),
        refId: refId || null,
        entity,
        customerName: customerName.trim(),
        businessNo,
        ceoName,
        customerAddress,
        customerBizType,
        customerBizClass,
        customerEmail,
        customerEmail2,
        purposeType,
        taxItems: normalizedTaxItems,
        writeDateStr,
        supplyAmount: supply,
        vatAmount: vat,
        totalAmount: total,
        itemName: resolvedItemName.trim(),
        memo: resolvedSingleMemo,
        rawNtsConfirmNo,
      });

      if (refId) {
        if (domainType === "RENTAL") {
          await client.query("UPDATE erp_rental_billings SET tax_invoice_id = $1 WHERE id = $2", [invoice.id, refId]);
        } else if (domainType === "TRADE_SALE") {
          const tbUpd = await client.query("UPDATE erp_trade_billings SET tax_invoice_id = $1 WHERE id = $2 RETURNING sale_id, sale_ids", [invoice.id, refId]);
          if (tbUpd.rows.length > 0) {
            const linkedSaleIds = new Set<number>();
            if (tbUpd.rows[0].sale_id) linkedSaleIds.add(Number(tbUpd.rows[0].sale_id));
            if (Array.isArray(tbUpd.rows[0].sale_ids)) {
              tbUpd.rows[0].sale_ids.forEach((sid: any) => { if (Number(sid) > 0) linkedSaleIds.add(Number(sid)); });
            }
            if (linkedSaleIds.size > 0) {
              await client.query("UPDATE erp_trade_sales SET tax_invoice_id = $1 WHERE id = ANY($2::bigint[])", [invoice.id, Array.from(linkedSaleIds)]);
            }
          } else {
            await client.query("UPDATE erp_trade_sales SET tax_invoice_id = $1 WHERE id = $2", [invoice.id, refId]);
          }
        } else if (domainType === "OP_SERVICE" || domainType === "DEV_SERVICE") {
          await client.query("UPDATE erp_service_billings SET tax_invoice_id = $1 WHERE id = $2", [invoice.id, refId]);
        }
      }

      // 통장 입출금 내역이 이미 존재하는 경우 즉시 자동 대사 및 원천 청구 수납 완료 연동
      const finalInvoice = await tryAutoReconcileNewInvoice(client, invoice);

      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('TAX_INVOICE', 'MANUAL_ISSUE', $1, 'ADMIN', $2)`,
        [invoiceNo, JSON.stringify({ customerName, total, ntsConfirmNo, supplier: entity.shortName })]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true, invoice: finalInvoice });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error instanceof PartnerTradeBlockedError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("POST Tax Invoice Error:", error);
    return NextResponse.json({ error: "세금계산서 발행 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: 세금계산서 삭제 (연결된 청구 수납 및 통장 매칭 해제 포함)
export async function DELETE(request: Request) {
  const guard = await requireMenuPermission(
    request,
    ["tax", "TAX", "tax_invoice", "tax_invoices"],
    "save"
  );
  if (!guard.authorized) {
    return guard.response!;
  }

  const pool = getErpPool();
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 세금계산서 id가 필요합니다." }, { status: 400 });
    }

    await client.query("BEGIN");
    const invRes = await client.query("SELECT * FROM erp_tax_invoices WHERE id = $1 FOR UPDATE", [Number(id)]);
    if (invRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "해당 세금계산서를 찾을 수 없습니다." }, { status: 404 });
    }
    const inv = invRes.rows[0];

    // 1. 연결된 통장 거래 매칭 해제
    const matchedIds: number[] = Array.isArray(inv.matched_bank_tx_ids)
      ? inv.matched_bank_tx_ids.map((n: any) => Number(n)).filter((n: number) => n > 0)
      : [];
    if (matchedIds.length > 0) {
      await client.query(
        `UPDATE erp_bank_transactions
         SET is_matched = false, matched_type = NULL, matched_id = NULL, matched_at = NULL
         WHERE id = ANY($1::bigint[])`,
        [matchedIds]
      );
    }

    // 2. 연결된 원천 청구(렌탈/용역/무역) 세금계산서 ID 및 수납 상태 해제
    await client.query(
      "UPDATE erp_service_billings SET tax_invoice_id = NULL, payment_status = 'UNPAID' WHERE tax_invoice_id = $1",
      [inv.id]
    );
    await client.query(
      "UPDATE erp_rental_billings SET tax_invoice_id = NULL, payment_status = 'UNPAID', paid_amount = 0 WHERE tax_invoice_id = $1",
      [inv.id]
    );
    await client.query(
      "UPDATE erp_trade_billings SET tax_invoice_id = NULL, payment_status = 'UNPAID', paid_amount = 0 WHERE tax_invoice_id = $1",
      [inv.id]
    );
    await client.query("UPDATE erp_trade_sales SET tax_invoice_id = NULL WHERE tax_invoice_id = $1", [inv.id]);

    // 3. 팝빌 임시문서함 문서인 경우 팝빌에서도 삭제 시도
    if (inv.invoice_no && inv.io_type !== "PURCHASE") {
      try {
        await deletePopbillInvoice(
          inv.invoice_no,
          resolvePopbillCorpNum(inv.supplier_corp_num, inv.supplier_entity_type)
        );
      } catch {
        // 팝빌에 없거나 이미 국세청 전송된 경우 무시하고 ERP DB 정리 진행
      }
    }

    await client.query("DELETE FROM erp_tax_invoices WHERE id = $1", [inv.id]);
    await syncBankAccountClosingState(client);
    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: `세금계산서(${inv.invoice_no}) 및 연결된 예정 수납 매칭이 삭제되었습니다.`,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("DELETE Tax Invoice Error:", error);
    return NextResponse.json({ error: "세금계산서 삭제 실패: " + error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
