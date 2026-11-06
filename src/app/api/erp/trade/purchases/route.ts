export const dynamic = "force-dynamic";
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

// POST: Register a new purchase (supports single or integer-split multi-row items) and auto-update stock
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { purchaseDate, vendorName, productId, qty, unitCost, memo, splitRows } = body;

    if (!vendorName || !productId) {
      return NextResponse.json({ error: "매입처와 상품은 필수입니다." }, { status: 400 });
    }

    const rowsToInsert: Array<{ qty: number; unitCost: number; memo?: string }> =
      Array.isArray(splitRows) && splitRows.length > 0
        ? splitRows
            .map((r: any) => ({
              qty: Math.max(0, Math.round(Number(r.qty || 0))),
              unitCost: Math.max(0, Math.round(Number(r.unitCost || 0))),
              memo: r.memo || memo || "",
            }))
            .filter((r: any) => r.qty > 0)
        : [
            {
              qty: Math.max(0, Math.round(Number(qty || 0))),
              unitCost: Math.max(0, Math.round(Number(unitCost || 0))),
              memo: memo || "",
            },
          ].filter((r) => r.qty > 0);

    if (rowsToInsert.length === 0) {
      return NextResponse.json({ error: "수량과 매입단가를 확인해주세요." }, { status: 400 });
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const datePart = (purchaseDate || new Date().toISOString().split("T")[0])
        .slice(2, 10)
        .replace(/-/g, "");
      const baseCode = `PO${datePart}-${Math.floor(1000 + Math.random() * 9000)}`;

      const insertedRows: any[] = [];
      let totalQtySum = 0;
      let totalAmountSum = 0;

      for (let i = 0; i < rowsToInsert.length; i++) {
        const row = rowsToInsert[i];
        const purchaseNo =
          rowsToInsert.length > 1 ? `${baseCode}-${i + 1}` : baseCode;
        const rowTotal = row.qty * row.unitCost;
        totalQtySum += row.qty;
        totalAmountSum += rowTotal;

        const insRes = await client.query(
          `INSERT INTO erp_trade_purchases 
           (purchase_no, purchase_date, vendor_name, product_id, qty, unit_cost, total_amount, status, memo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'CONFIRMED', $8)
           RETURNING *`,
          [
            purchaseNo,
            purchaseDate || new Date().toISOString().split("T")[0],
            vendorName,
            productId,
            row.qty,
            row.unitCost,
            rowTotal,
            row.memo || "",
          ]
        );
        insertedRows.push(insRes.rows[0]);
      }

      const avgOrLastUnitCost = Math.round(
        totalAmountSum / Math.max(1, totalQtySum)
      );

      // 2. Increase stock in erp_trade_products
      await client.query(
        `UPDATE erp_trade_products
         SET current_stock = current_stock + $1, standard_cost = $2, updated_at = NOW()
         WHERE id = $3`,
        [totalQtySum, avgOrLastUnitCost, productId]
      );

      // 3. Audit log
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('TRADE', 'PURCHASE', $1, 'ADMIN', $2)`,
        [
          baseCode,
          JSON.stringify({
            vendorName,
            productId,
            qty: totalQtySum,
            totalAmount: totalAmountSum,
            splitCount: rowsToInsert.length,
          }),
        ]
      );

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        purchase: insertedRows[0],
        purchases: insertedRows,
      });
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
