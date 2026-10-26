import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// GET: List all sales
export async function GET() {
  try {
    const pool = getErpPool();
    const query = `
      SELECT 
        s.id,
        s.sale_no as "saleNo",
        s.sale_date as "saleDate",
        s.customer_name as "customerName",
        s.product_id as "productId",
        tp.sku_code as "skuCode",
        tp.name as "productName",
        tp.unit,
        s.qty,
        s.unit_price as "unitPrice",
        s.total_amount as "totalAmount",
        s.cogs_amount as "cogsAmount",
        s.margin_amount as "marginAmount",
        CASE WHEN s.total_amount > 0 THEN ROUND((s.margin_amount / s.total_amount) * 100, 1) ELSE 0 END as "marginRate",
        s.status,
        s.memo,
        s.created_at as "createdAt"
      FROM erp_trade_sales s
      JOIN erp_trade_products tp ON s.product_id = tp.id
      ORDER BY s.sale_date DESC, s.id DESC
    `;
    const res = await pool.query(query);
    return NextResponse.json({ success: true, sales: res.rows });
  } catch (error: any) {
    console.error("GET Sales Error:", error);
    return NextResponse.json({ error: "판매 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Register a sale, calculate COGS & Margin, deduct stock
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { saleDate, customerName, productId, qty, unitPrice, memo } = body;

    if (!customerName || !productId || !qty || !unitPrice) {
      return NextResponse.json({ error: "고객사, 상품, 수량, 판매단가는 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Fetch product to get current unit standard_cost and check stock
      const prodRes = await client.query(
        "SELECT id, standard_cost, current_stock, name FROM erp_trade_products WHERE id = $1 FOR UPDATE",
        [productId]
      );
      if (prodRes.rows.length === 0) {
        throw new Error("상품을 찾을 수 없습니다.");
      }

      const prod = prodRes.rows[0];
      const parsedQty = parseInt(qty, 10);
      const parsedUnitPrice = parseFloat(unitPrice);
      const unitCost = parseFloat(prod.standard_cost || "0");

      const totalAmount = parsedQty * parsedUnitPrice;
      const cogsAmount = parsedQty * unitCost;
      const marginAmount = totalAmount - cogsAmount;
      const saleNo = `SO${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 2. Insert sale
      const insRes = await client.query(
        `INSERT INTO erp_trade_sales 
         (sale_no, sale_date, customer_name, product_id, qty, unit_price, total_amount, cogs_amount, margin_amount, status, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CONFIRMED', $10)
         RETURNING *`,
        [saleNo, saleDate || new Date().toISOString().split("T")[0], customerName, productId, parsedQty, parsedUnitPrice, totalAmount, cogsAmount, marginAmount, memo || ""]
      );

      // 3. Deduct stock
      await client.query(
        `UPDATE erp_trade_products
         SET current_stock = current_stock - $1, updated_at = NOW()
         WHERE id = $2`,
        [parsedQty, productId]
      );

      // 4. Audit log
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('TRADE', 'SALE', $1, 'ADMIN', $2)`,
        [saleNo, JSON.stringify({ customerName, productId, qty: parsedQty, totalAmount, marginAmount })]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true, sale: insRes.rows[0] });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST Sale Error:", error);
    return NextResponse.json({ error: "판매 등록 실패: " + error.message }, { status: 500 });
  }
}
