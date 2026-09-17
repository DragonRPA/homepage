import { NextRequest, NextResponse } from "next/server";
import {
  getPublishedProducts,
  getAllProductsForAdmin,
  updateProduct,
  updateProductPlan,
  upsertProductWithPlans,
  deleteProduct,
} from "@/lib/productService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get("admin") === "true";

    if (isAdmin) {
      const products = await getAllProductsForAdmin();
      return NextResponse.json({ success: true, products });
    }

    const products = await getPublishedProducts();
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error("[API Products GET] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, product, plan, productId, planType, updates, id } = body;

    // 1. Toggle Product Publish / Update Product Basic Info
    if (action === "updateProduct" && productId) {
      await updateProduct(productId, updates);
      return NextResponse.json({ success: true, message: "상품 정보가 업데이트되었습니다." });
    }

    // 2. Update Plan Pricing / Status
    if (action === "updatePlan" && productId && planType) {
      await updateProductPlan(productId, planType, updates);
      return NextResponse.json({ success: true, message: "플랜 및 가격 정보가 업데이트되었습니다." });
    }

    // 3. Upsert Product with Plans
    if (action === "upsertProduct" && product) {
      await upsertProductWithPlans(product);
      return NextResponse.json({ success: true, message: "상품 및 플랜이 저장되었습니다." });
    }

    // 4. Delete Product
    if (action === "deleteProduct" && id) {
      await deleteProduct(id);
      return NextResponse.json({ success: true, message: "상품이 삭제되었습니다." });
    }

    return NextResponse.json(
      { success: false, message: "유효하지 않은 요청 액션입니다." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[API Products POST] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process product action" },
      { status: 500 }
    );
  }
}
