import { NextResponse } from "next/server";
import { supabaseErp } from "@/lib/supabaseErp";

// GET: List all trade products
export async function GET() {
  try {
    const { data, error } = await supabaseErp
      .from("erp_trade_products")
      .select("*")
      .order("sku_code", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, products: data });
  } catch (error: any) {
    console.error("GET Trade Products Error:", error);
    return NextResponse.json({ error: "상품 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Create new product
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skuCode, name, category, spec, unit, standardCost, standardPrice, safetyStock, initialStock, memo } = body;

    if (!skuCode || !name) {
      return NextResponse.json({ error: "SKU 코드와 상품명은 필수입니다." }, { status: 400 });
    }

    const { data, error } = await supabaseErp
      .from("erp_trade_products")
      .insert({
        sku_code: skuCode.trim(),
        name: name.trim(),
        category: category || "완제품",
        spec: spec || "",
        unit: unit || "EA",
        standard_cost: parseFloat(standardCost || "0"),
        standard_price: parseFloat(standardPrice || "0"),
        safety_stock: parseInt(safetyStock || "10", 10),
        current_stock: parseInt(initialStock || "0", 10),
        status: "ACTIVE",
        memo: memo || "",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 존재하는 SKU 코드입니다." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, product: data });
  } catch (error: any) {
    console.error("POST Trade Product Error:", error);
    return NextResponse.json({ error: "상품 등록 실패: " + error.message }, { status: 500 });
  }
}

// PUT: Update product
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category, spec, unit, standardCost, standardPrice, safetyStock, currentStock, status, memo } = body;

    if (!id) return NextResponse.json({ error: "상품 ID가 누락되었습니다." }, { status: 400 });

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updatePayload.name = name;
    if (category !== undefined) updatePayload.category = category;
    if (spec !== undefined) updatePayload.spec = spec;
    if (unit !== undefined) updatePayload.unit = unit;
    if (standardCost !== undefined) updatePayload.standard_cost = parseFloat(standardCost);
    if (standardPrice !== undefined) updatePayload.standard_price = parseFloat(standardPrice);
    if (safetyStock !== undefined) updatePayload.safety_stock = parseInt(safetyStock, 10);
    if (currentStock !== undefined) updatePayload.current_stock = parseInt(currentStock, 10);
    if (status !== undefined) updatePayload.status = status;
    if (memo !== undefined) updatePayload.memo = memo;

    const { data, error } = await supabaseErp
      .from("erp_trade_products")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, product: data });
  } catch (error: any) {
    console.error("PUT Trade Product Error:", error);
    return NextResponse.json({ error: "상품 수정 실패" }, { status: 500 });
  }
}
