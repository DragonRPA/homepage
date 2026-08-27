import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT 
        id,
        item_code as "code",
        name,
        specification as "spec",
        unit,
        current_stock as "stock",
        safety_stock as "safety",
        standard_unit_price as "unitPrice"
      FROM consumable_items
      ORDER BY id ASC
    `;

    return NextResponse.json({ success: true, consumables: rows });
  } catch (error: any) {
    console.error("GET Consumables Error:", error);
    return NextResponse.json({ error: "소모품 목록 조회 실패" }, { status: 500 });
  }
}
