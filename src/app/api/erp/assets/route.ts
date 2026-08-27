import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT 
        id,
        asset_code as "code",
        name,
        category,
        model_name as "model",
        status,
        current_location as "location",
        acquisition_price as "price"
      FROM assets
      ORDER BY id ASC
    `;

    return NextResponse.json({ success: true, assets: rows });
  } catch (error: any) {
    console.error("GET Assets Error:", error);
    return NextResponse.json({ error: "자산 목록 조회 실패" }, { status: 500 });
  }
}
