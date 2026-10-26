import { NextResponse } from "next/server";
import { supabaseErp } from "@/lib/supabaseErp";

// GET: List all rental products (models)
export async function GET() {
  try {
    const { data, error } = await supabaseErp
      .from("erp_rental_products")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, products: data });
  } catch (error: any) {
    console.error("GET Rental Products Error:", error);
    return NextResponse.json({ error: "임대 모델 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Register rental model
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { modelCode, modelName, category, manufacturer, standardMonthlyRate, standardDailyRate, spec } = body;

    if (!modelCode || !modelName) {
      return NextResponse.json({ error: "모델 코드와 모델명은 필수입니다." }, { status: 400 });
    }

    const { data, error } = await supabaseErp
      .from("erp_rental_products")
      .insert({
        model_code: modelCode.trim(),
        model_name: modelName.trim(),
        category: category || "고소작업대",
        manufacturer: manufacturer || "Skyjack",
        standard_monthly_rate: parseFloat(standardMonthlyRate || "0"),
        standard_daily_rate: parseFloat(standardDailyRate || "0"),
        spec: spec || "",
        status: "ACTIVE",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 존재하는 모델 코드입니다." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, product: data });
  } catch (error: any) {
    console.error("POST Rental Product Error:", error);
    return NextResponse.json({ error: "임대 모델 등록 실패: " + error.message }, { status: 500 });
  }
}
