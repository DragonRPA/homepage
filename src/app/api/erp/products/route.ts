import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: 제품 목록 및 각 모델별 보유 자산 통계 집계 조회
export async function GET() {
  try {
    const pool = getErpPool();
    const query = `
      SELECT 
        p.id,
        p.model_code as "modelCode",
        p.model_name as "modelName",
        p.short_name as "shortName",
        p.category,
        p.manufacturer,
        p.standard_monthly_rate as "standardMonthlyRate",
        p.standard_daily_rate as "standardDailyRate",
        p.standard_price as "standardPrice",
        p.cpu,
        p.ram,
        p.storage,
        p.gpu,
        p.spec,
        p.warranty_type as "warrantyType",
        p.status,
        p.created_at as "createdAt",
        COALESCE(COUNT(a.id), 0)::integer as "totalAssets",
        COALESCE(SUM(CASE WHEN a.owner_type = 'OWNED' THEN 1 ELSE 0 END), 0)::integer as "ownedAssets",
        COALESCE(SUM(CASE WHEN a.owner_type = 'RENTED' THEN 1 ELSE 0 END), 0)::integer as "subleasedAssets",
        COALESCE(SUM(CASE WHEN a.status = 'AVAILABLE' THEN 1 ELSE 0 END), 0)::integer as "availableAssets",
        COALESCE(SUM(CASE WHEN a.status = 'RENTED' THEN 1 ELSE 0 END), 0)::integer as "rentedAssets",
        COALESCE(SUM(CASE WHEN a.status = 'REPAIRING' THEN 1 ELSE 0 END), 0)::integer as "repairingAssets"
      FROM erp_rental_products p
      LEFT JOIN erp_rental_assets a ON p.id = a.rental_product_id
      GROUP BY p.id
      ORDER BY p.id ASC
    `;
    const res = await pool.query(query);
    return NextResponse.json({ success: true, products: res.rows });
  } catch (error: any) {
    console.error("GET Products Error:", error);
    return NextResponse.json({ error: "제품 목록 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: 신규 제품 모델 등록
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      modelCode, modelName, shortName, category, manufacturer, 
      standardMonthlyRate, standardDailyRate, standardPrice,
      cpu, ram, storage, gpu, spec, warrantyType 
    } = body;

    if (!modelCode || !modelName) {
      return NextResponse.json({ error: "모델 코드와 모델명은 필수 입력 항목입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const insertQuery = `
      INSERT INTO erp_rental_products (
        model_code, model_name, short_name, category, manufacturer,
        standard_monthly_rate, standard_daily_rate, standard_price,
        cpu, ram, storage, gpu, spec, warranty_type, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'ACTIVE')
      RETURNING *
    `;

    const res = await pool.query(insertQuery, [
      modelCode.trim().toUpperCase(),
      modelName.trim(),
      shortName ? shortName.trim() : null,
      category || "IT/워크스테이션",
      manufacturer || "기타",
      parseFloat(standardMonthlyRate || "0"),
      parseFloat(standardDailyRate || "0"),
      parseFloat(standardPrice || "0"),
      cpu || null,
      ram || null,
      storage || null,
      gpu || null,
      spec || "",
      warrantyType || "1년 무상",
    ]);

    return NextResponse.json({ success: true, product: res.rows[0] });
  } catch (error: any) {
    console.error("POST Product Error:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 동일한 모델 코드가 존재합니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "제품 등록 실패: " + error.message }, { status: 500 });
  }
}

// PUT: 제품 모델 정보 수정
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, modelCode, modelName, shortName, category, manufacturer, 
      standardMonthlyRate, standardDailyRate, standardPrice,
      cpu, ram, storage, gpu, spec, warrantyType, status 
    } = body;

    if (!id) {
      return NextResponse.json({ error: "제품 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const updateQuery = `
      UPDATE erp_rental_products
      SET 
        model_code = COALESCE($1, model_code),
        model_name = COALESCE($2, model_name),
        short_name = $3,
        category = COALESCE($4, category),
        manufacturer = COALESCE($5, manufacturer),
        standard_monthly_rate = COALESCE($6, standard_monthly_rate),
        standard_daily_rate = COALESCE($7, standard_daily_rate),
        standard_price = COALESCE($8, standard_price),
        cpu = $9,
        ram = $10,
        storage = $11,
        gpu = $12,
        spec = COALESCE($13, spec),
        warranty_type = $14,
        status = COALESCE($15, status)
      WHERE id = $16
      RETURNING *
    `;

    const res = await pool.query(updateQuery, [
      modelCode ? modelCode.trim().toUpperCase() : null,
      modelName ? modelName.trim() : null,
      shortName || null,
      category,
      manufacturer,
      standardMonthlyRate !== undefined ? parseFloat(standardMonthlyRate) : null,
      standardDailyRate !== undefined ? parseFloat(standardDailyRate) : null,
      standardPrice !== undefined ? parseFloat(standardPrice) : null,
      cpu || null,
      ram || null,
      storage || null,
      gpu || null,
      spec,
      warrantyType || null,
      status,
      id
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "해당 제품을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: res.rows[0] });
  } catch (error: any) {
    console.error("PUT Product Error:", error);
    return NextResponse.json({ error: "제품 수정 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: 제품 모델 삭제 (매핑 자산 존재 시 삭제 차단)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 제품 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    // Check if assets exist
    const assetCheck = await pool.query("SELECT COUNT(*) FROM erp_rental_assets WHERE rental_product_id = $1", [id]);
    const assetCount = parseInt(assetCheck.rows[0].count, 10);
    if (assetCount > 0) {
      return NextResponse.json({ 
        error: `해당 제품 모델에 등록된 실제 자산이 ${assetCount}대 존재하여 삭제할 수 없습니다. 자산을 먼저 정리해 주십시오.` 
      }, { status: 400 });
    }

    await pool.query("DELETE FROM erp_rental_products WHERE id = $1", [id]);
    return NextResponse.json({ success: true, message: "제품 모델이 성공적으로 삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Product Error:", error);
    return NextResponse.json({ error: "제품 삭제 실패: " + error.message }, { status: 500 });
  }
}
