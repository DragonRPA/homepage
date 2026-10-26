import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: List all rental assets
export async function GET() {
  try {
    const pool = getErpPool();
    const query = `
      SELECT 
        a.id,
        a.asset_no as "assetNo",
        a.rental_product_id as "rentalProductId",
        rp.model_code as "modelCode",
        rp.model_name as "modelName",
        rp.manufacturer,
        a.serial_no as "serialNo",
        a.acquisition_date as "acquisitionDate",
        a.acquisition_cost as "acquisitionCost",
        a.salvage_value as "salvageValue",
        a.useful_life_years as "usefulLifeYears",
        a.depreciation_method as "depreciationMethod",
        a.accumulated_depreciation as "accumulatedDepreciation",
        a.book_value as "bookValue",
        a.status,
        a.memo,
        a.created_at as "createdAt"
      FROM erp_rental_assets a
      JOIN erp_rental_products rp ON a.rental_product_id = rp.id
      ORDER BY a.asset_no ASC
    `;
    const res = await pool.query(query);
    return NextResponse.json({ success: true, assets: res.rows });
  } catch (error: any) {
    console.error("GET Rental Assets Error:", error);
    return NextResponse.json({ error: "자산 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Acquire / Register new asset
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      assetNo, rentalProductId, serialNo, acquisitionDate, 
      acquisitionCost, salvageValue, usefulLifeYears, memo 
    } = body;

    if (!assetNo || !rentalProductId || !acquisitionCost) {
      return NextResponse.json({ error: "자산번호, 모델, 취득원가는 필수입니다." }, { status: 400 });
    }

    const cost = parseFloat(acquisitionCost);
    const salvage = parseFloat(salvageValue || "0");
    const lifeYears = parseInt(usefulLifeYears || "5", 10);

    const { data, error } = await supabaseErp
      .from("erp_rental_assets")
      .insert({
        asset_no: assetNo.trim().toUpperCase(),
        rental_product_id: rentalProductId,
        serial_no: serialNo || "",
        acquisition_date: acquisitionDate || new Date().toISOString().split("T")[0],
        acquisition_cost: cost,
        salvage_value: salvage,
        useful_life_years: lifeYears,
        depreciation_method: "STRAIGHT_LINE",
        accumulated_depreciation: 0,
        book_value: cost,
        status: "AVAILABLE",
        memo: memo || "",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 존재하는 자산번호입니다." }, { status: 409 });
      }
      throw error;
    }

    // Insert Audit log (헌장 1.2 무누락 저장)
    await supabaseErp.from("erp_audit_logs").insert({
      domain: "RENTAL_ASSET",
      action_type: "ACQUIRE",
      record_id: assetNo,
      actor_name: "ADMIN",
      details: { cost, salvage, lifeYears }
    });

    return NextResponse.json({ success: true, asset: data });
  } catch (error: any) {
    console.error("POST Rental Asset Error:", error);
    return NextResponse.json({ error: "자산 등록 실패: " + error.message }, { status: 500 });
  }
}
