import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: List all purchases
export async function GET() {
  try {
    const pool = getErpPool();
    const query = `
      SELECT 
        p.id,
        p.purchase_no as "purchaseNo",
        p.purchase_date as "purchaseDate",
        p.vendor_name as "vendorName",
        p.product_id as "productId",
        tp.sku_code as "skuCode",
        tp.name as "productName",
        tp.unit,
        p.qty,
        p.unit_cost as "unitCost",
        p.total_amount as "totalAmount",
        p.status,
        p.memo,
        p.created_at as "createdAt"
      FROM erp_trade_purchases p
      JOIN erp_trade_products tp ON p.product_id = tp.id
      ORDER BY p.purchase_date DESC, p.id DESC
    `;
    const res = await pool.query(query);
    return NextResponse.json({ success: true, purchases: res.rows });
  } catch (error: any) {
    console.error("GET Purchases Error:", error);
    return NextResponse.json({ error: "구매 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Register a new purchase and auto-update stock
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { purchaseDate, vendorName, productId, qty, unitCost, memo } = body;

    if (!vendorName || !productId || !qty || !unitCost) {
      return NextResponse.json({ error: "매입처, 상품, 수량, 매입단가는 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const purchaseNo = `PO${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      const parsedQty = parseInt(qty, 10);
      const parsedUnitCost = parseFloat(unitCost);
      const totalAmount = parsedQty * parsedUnitCost;

      // 1. Insert purchase
      const insRes = await client.query(
        `INSERT INTO erp_trade_purchases 
         (purchase_no, purchase_date, vendor_name, product_id, qty, unit_cost, total_amount, status, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'CONFIRMED', $8)
         RETURNING *`,
        [purchaseNo, purchaseDate || new Date().toISOString().split("T")[0], vendorName, productId, parsedQty, parsedUnitCost, totalAmount, memo || ""]
      );

      // 2. Increase stock in erp_trade_products
      await client.query(
        `UPDATE erp_trade_products
         SET current_stock = current_stock + $1, standard_cost = $2, updated_at = NOW()
         WHERE id = $3`,
        [parsedQty, parsedUnitCost, productId]
      );

      // 3. Audit log
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('TRADE', 'PURCHASE', $1, 'ADMIN', $2)`,
        [purchaseNo, JSON.stringify({ vendorName, productId, qty: parsedQty, totalAmount })]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true, purchase: insRes.rows[0] });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST Purchase Error:", error);
    return NextResponse.json({ error: "구매 등록 실패: " + error.message }, { status: 500 });
  }
}
