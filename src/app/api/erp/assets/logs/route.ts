import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// GET: 특정 자산의 누적 생애주기 이력 로그 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetNo = searchParams.get("assetNo");
    const assetId = searchParams.get("assetId");

    if (!assetNo && !assetId) {
      return NextResponse.json({ error: "assetNo 또는 assetId가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    let query = `
      SELECT 
        id,
        asset_id as "assetId",
        asset_no as "assetNo",
        event_type as "eventType",
        event_date as "eventDate",
        customer_name as "customerName",
        site_name as "siteName",
        memo,
        created_at as "createdAt"
      FROM erp_asset_inout_logs
      WHERE 1=1
    `;

    const params: any[] = [];
    if (assetId) {
      params.push(assetId);
      query += ` AND asset_id = $${params.length}`;
    } else if (assetNo) {
      params.push(assetNo);
      query += ` AND asset_no = $${params.length}`;
    }

    query += ` ORDER BY event_date DESC, created_at DESC`;

    const res = await pool.query(query, params);
    return NextResponse.json({ success: true, logs: res.rows });
  } catch (error: any) {
    console.error("GET Asset Logs Error:", error);
    return NextResponse.json({ error: "자산 이력 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: 자산 이력 수동 등록 (정비, 출고, 입고 등)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId, assetNo, eventType, eventDate, customerName, siteName, memo } = body;

    if (!assetNo || !eventType) {
      return NextResponse.json({ error: "자산번호와 이벤트 구분은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const res = await pool.query(`
      INSERT INTO erp_asset_inout_logs 
      (asset_id, asset_no, event_type, event_date, customer_name, site_name, memo)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      assetId || null,
      assetNo,
      eventType,
      eventDate || new Date().toISOString().split("T")[0],
      customerName || null,
      siteName || null,
      memo || null
    ]);

    return NextResponse.json({ success: true, log: res.rows[0] });
  } catch (error: any) {
    console.error("POST Asset Log Error:", error);
    return NextResponse.json({ error: "이력 등록 실패: " + error.message }, { status: 500 });
  }
}
