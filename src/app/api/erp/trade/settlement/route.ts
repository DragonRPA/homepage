import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// GET: Periodic sales settlement summary
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || "2020-01-01";
    const endDate = searchParams.get("endDate") || "2099-12-31";

    const pool = getErpPool();

    // 1. Overall Aggregates
    const aggQuery = `
      SELECT 
        COUNT(id) as "totalOrders",
        COALESCE(SUM(qty), 0) as "totalQty",
        COALESCE(SUM(total_amount), 0) as "totalRevenue",
        COALESCE(SUM(cogs_amount), 0) as "totalCogs",
        COALESCE(SUM(margin_amount), 0) as "totalMargin",
        CASE WHEN SUM(total_amount) > 0 
          THEN ROUND((SUM(margin_amount) / SUM(total_amount)) * 100, 1) 
          ELSE 0 END as "marginRate"
      FROM erp_trade_sales
      WHERE sale_date >= $1 AND sale_date <= $2 AND status != 'CANCELLED'
    `;
    const aggRes = await pool.query(aggQuery, [startDate, endDate]);

    // 2. Customer Breakdown
    const custQuery = `
      SELECT 
        customer_name as "customerName",
        COUNT(id) as "orderCount",
        SUM(total_amount) as "revenue",
        SUM(cogs_amount) as "cogs",
        SUM(margin_amount) as "margin",
        ROUND((SUM(margin_amount) / NULLIF(SUM(total_amount), 0)) * 100, 1) as "marginRate"
      FROM erp_trade_sales
      WHERE sale_date >= $1 AND sale_date <= $2 AND status != 'CANCELLED'
      GROUP BY customer_name
      ORDER BY revenue DESC
    `;
    const custRes = await pool.query(custQuery, [startDate, endDate]);

    return NextResponse.json({
      success: true,
      summary: aggRes.rows[0],
      customerBreakdown: custRes.rows,
    });
  } catch (error: any) {
    console.error("GET Trade Settlement Error:", error);
    return NextResponse.json({ error: "매출정산 집계 실패" }, { status: 500 });
  }
}
