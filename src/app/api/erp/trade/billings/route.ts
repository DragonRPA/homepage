import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { resolveContractItemTemplate, resolveContractTaxItemsTemplate } from "@/lib/erpFormat";

// GET: List all trade billings (with contract, customer, product, tax invoice details)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    const pool = getErpPool();
    let query = `
      SELECT 
        b.id,
        b.billing_no as "billingNo",
        b.sale_id as "saleId",
        s.sale_no as "saleNo",
        COALESCE(s.entity_type, 'CORP') as "entityType",
        s.partner_id as "partnerId",
        s.customer_name as "customerName",
        s.product_id as "productId",
        tp.sku_code as "skuCode",
        tp.name as "productName",
        tp.spec as "productSpec",
        tp.unit,
        s.qty,
        b.billing_date as "billingDate",
        b.milestone_name as "milestoneName",
        b.supply_amount as "supplyAmount",
        b.vat_amount as "vatAmount",
        b.total_amount as "totalAmount",
        COALESCE(NULLIF(b.tax_purpose, ''), s.tax_purpose, '청구') as "taxPurpose",
        COALESCE(NULLIF(b.tax_memo, ''), s.tax_memo, tp.name, '') as "taxMemo",
        CASE 
          WHEN b.tax_items IS NOT NULL AND jsonb_array_length(b.tax_items) > 0 THEN b.tax_items
          WHEN s.tax_items IS NOT NULL AND jsonb_array_length(s.tax_items) > 0 THEN s.tax_items
          ELSE '[]'::jsonb
        END as "taxItems",
        COALESCE(NULLIF(s.customer_biz_no, ''), p.business_no, '') as "customerBizNo",
        COALESCE(NULLIF(s.customer_ceo_name, ''), p.ceo_name, '') as "customerCeoName",
        COALESCE(NULLIF(s.customer_address, ''), CONCAT_WS(' ', p.address, p.address_detail), '') as "customerAddress",
        COALESCE(NULLIF(s.customer_biz_type, ''), p.biz_type, '') as "customerBizType",
        COALESCE(NULLIF(s.customer_biz_class, ''), p.biz_item, '') as "customerBizClass",
        COALESCE(NULLIF(s.customer_email, ''), p.main_email, '') as "customerEmail",
        COALESCE(s.customer_email2, '') as "customerEmail2",
        b.payment_status as "paymentStatus",
        b.paid_amount as "paidAmount",
        b.tax_invoice_id as "taxInvoiceId",
        ti.invoice_no as "taxInvoiceNo",
        b.memo,
        b.created_at as "createdAt"
      FROM erp_trade_billings b
      JOIN erp_trade_sales s ON b.sale_id = s.id
      LEFT JOIN erp_trade_products tp ON s.product_id = tp.id
      LEFT JOIN erp_partners p ON s.partner_id = p.id OR (s.partner_id IS NULL AND s.customer_name = p.name)
      LEFT JOIN erp_tax_invoices ti ON b.tax_invoice_id = ti.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (entityType && entityType !== "ALL") {
      params.push(entityType);
      query += ` AND s.entity_type = $${params.length}`;
    }
    query += " ORDER BY b.billing_date DESC, b.id DESC";

    const res = await pool.query(query, params);
    return NextResponse.json({ success: true, billings: res.rows });
  } catch (error: any) {
    console.error("GET Trade Billings Error:", error);
    return NextResponse.json({ error: "유통 청구 내역 조회 실패" }, { status: 500 });
  }
}

// POST: Create a trade billing by pulling items from a distribution/sale contract (erp_trade_sales)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      saleId,
      billingDate,
      milestoneName,
      supplyAmount,
      vatAmount,
      taxPurpose,
      taxMemo,
      taxItems,
      memo,
    } = body;

    if (!saleId) {
      return NextResponse.json({ error: "대상 유통/판매 계약을 선택해 주십시오." }, { status: 400 });
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const saleRes = await client.query(
        `SELECT s.*, tp.name as product_name, tp.spec as product_spec
         FROM erp_trade_sales s
         LEFT JOIN erp_trade_products tp ON s.product_id = tp.id
         WHERE s.id = $1`,
        [saleId]
      );
      if (saleRes.rows.length === 0) {
        throw new Error("대상 유통/판매 계약을 찾을 수 없습니다.");
      }
      const s = saleRes.rows[0];

      const resolvedItems = Array.isArray(taxItems) && taxItems.length > 0
        ? taxItems
        : Array.isArray(s.tax_items) && s.tax_items.length > 0
          ? s.tax_items
          : [
              {
                itemName: s.product_name || "판매 물품",
                spec: s.product_spec || "",
                qty: Number(s.qty || 1),
                unitCost: Number(s.unit_price || s.total_amount || 0),
                supplyAmount: Number(s.total_amount || 0),
                vatAmount: Number(s.vat_amount || Math.round(Number(s.total_amount || 0) * 0.1)),
                note: "",
              },
            ];

      const itemsSupplySum = resolvedItems.reduce((acc: number, r: any) => acc + Number(r.supplyAmount || 0), 0);
      const itemsVatSum = resolvedItems.reduce((acc: number, r: any) => acc + Number(r.vatAmount || 0), 0);

      const finalSupply = supplyAmount !== undefined && supplyAmount !== null && supplyAmount !== ""
        ? Math.round(parseFloat(String(supplyAmount)))
        : itemsSupplySum > 0
          ? Math.round(itemsSupplySum)
          : Math.round(parseFloat(s.total_amount || "0"));

      const finalVat = vatAmount !== undefined && vatAmount !== null && vatAmount !== ""
        ? Math.round(parseFloat(String(vatAmount)))
        : itemsVatSum > 0
          ? Math.round(itemsVatSum)
          : Math.round(finalSupply * 0.1);

      const finalTotal = finalSupply + finalVat;

      const effectiveDate = billingDate || new Date().toISOString().slice(0, 10);
      const dateStr = effectiveDate.slice(2, 10).replace(/-/g, "");
      const billingNo = `TB${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

      const fallbackFirst = s.product_name || "판매 물품";
      const finalItems = resolveContractTaxItemsTemplate(resolvedItems, {
        dateStr: effectiveDate,
        fallbackFirstItem: fallbackFirst,
      });

      const rawMilestone = milestoneName || s.tax_memo || "{1번째 아이템} 외";
      const resolvedMilestone = resolveContractItemTemplate(rawMilestone, {
        dateStr: effectiveDate,
        items: finalItems,
        fallbackFirstItem: finalItems[0]?.itemName || fallbackFirst,
      });

      const rawMemo = taxMemo !== undefined ? taxMemo : (s.tax_memo || rawMilestone);
      const resolvedMemo = resolveContractItemTemplate(rawMemo, {
        dateStr: effectiveDate,
        items: finalItems,
        fallbackFirstItem: finalItems[0]?.itemName || fallbackFirst,
      });

      const insRes = await client.query(
        `INSERT INTO erp_trade_billings
         (billing_no, sale_id, billing_date, milestone_name, supply_amount, vat_amount, total_amount,
          tax_purpose, tax_memo, tax_items, payment_status, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, 'UNPAID', $11)
         RETURNING *`,
        [
          billingNo,
          saleId,
          effectiveDate,
          resolvedMilestone,
          finalSupply,
          finalVat,
          finalTotal,
          taxPurpose || s.tax_purpose || "청구",
          resolvedMemo,
          JSON.stringify(finalItems),
          memo || "",
        ]
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
    console.error("POST Trade Billing Error:", error);
    return NextResponse.json({ error: "유통 청구 생성 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: Delete trade billing
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 청구 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const checkRes = await pool.query(
      "SELECT id, billing_no, tax_invoice_id FROM erp_trade_billings WHERE id = $1",
      [parseInt(id, 10)]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: "해당 청구건을 찾을 수 없습니다." }, { status: 404 });
    }

    const billing = checkRes.rows[0];
    if (billing.tax_invoice_id) {
      return NextResponse.json({
        error: "이미 국세청 전자세금계산서가 발행된 청구건은 삭제할 수 없습니다.",
      }, { status: 400 });
    }

    await pool.query("DELETE FROM erp_trade_billings WHERE id = $1", [parseInt(id, 10)]);
    return NextResponse.json({
      success: true,
      message: `유통 청구 [${billing.billing_no}] 내역이 삭제되었습니다.`,
    });
  } catch (error: any) {
    console.error("DELETE Trade Billing Error:", error);
    return NextResponse.json({ error: "유통 청구 삭제 실패: " + error.message }, { status: 500 });
  }
}
