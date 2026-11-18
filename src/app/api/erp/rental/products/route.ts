export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { ensureForkliftSchema } from "@/lib/forkliftSchemaInit";
import {
  normalizeItemClass,
  parseForkliftSpecData,
  summarizeForkliftSpec,
} from "@/lib/forkliftDomain";
import { parseNumericInput, resolveDailyRentalFee } from "@/lib/rentalFeeUtils";

// GET: List all rental products (models)
export async function GET() {
  try {
    const pool = getErpPool();
    await ensureForkliftSchema(pool);

    const res = await pool.query(`
      SELECT *
      FROM erp_rental_products
      ORDER BY model_code ASC, id ASC
    `);

    const normalized = (res.rows || []).map((row: any) => {
      const mRate = Math.round(parseNumericInput(row.standard_monthly_rate));
      return {
        ...row,
        standard_monthly_rate: mRate,
        standard_daily_rate: resolveDailyRentalFee(mRate, row.standard_daily_rate),
        item_class: normalizeItemClass(row.item_class, row.category),
        part_no: row.part_no || "",
        install_fee: Number(row.install_fee || 0),
        warranty_months: Number(row.warranty_months ?? 12),
        warranty_hours: Number(row.warranty_hours ?? 2000),
        spec_data: parseForkliftSpecData(row.spec_data),
      };
    });
    return NextResponse.json({ success: true, products: normalized });
  } catch (error: any) {
    console.error("GET Rental Products Error:", error);
    return NextResponse.json({ error: "임대 모델 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Register rental model
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      modelCode,
      modelName,
      category,
      manufacturer,
      standardMonthlyRate,
      standardDailyRate,
      spec,
      itemClass,
      partNo,
      installFee,
      warrantyMonths,
      warrantyHours,
      specData,
    } = body;

    if (!modelCode || !modelName) {
      return NextResponse.json({ error: "모델 코드와 모델명은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    await ensureForkliftSchema(pool);

    const parsedMonthly = Math.round(parseNumericInput(standardMonthlyRate));
    const resolvedDaily = resolveDailyRentalFee(parsedMonthly, standardDailyRate);
    const resolvedItemClass = normalizeItemClass(itemClass, category);
    const parsedSpecData = parseForkliftSpecData(specData);
    const computedSpec = summarizeForkliftSpec(resolvedItemClass, parsedSpecData, spec);

    const res = await pool.query(
      `INSERT INTO erp_rental_products
       (model_code, model_name, category, manufacturer, standard_monthly_rate, standard_daily_rate, spec, status,
        item_class, part_no, install_fee, warranty_months, warranty_hours, spec_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $9, $10, $11, $12, $13::jsonb)
       RETURNING *`,
      [
        modelCode.trim(),
        modelName.trim(),
        category || "지게차",
        manufacturer || "",
        parsedMonthly,
        resolvedDaily,
        computedSpec,
        resolvedItemClass,
        partNo || "",
        Math.round(parseNumericInput(installFee)),
        Math.max(0, Math.round(Number(warrantyMonths ?? 12) || 0)),
        Math.max(0, Math.round(Number(warrantyHours ?? 2000) || 0)),
        JSON.stringify(parsedSpecData),
      ]
    );

    return NextResponse.json({ success: true, product: res.rows[0] });
  } catch (error: any) {
    console.error("POST Rental Product Error:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 존재하는 모델 코드입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "임대 모델 등록 실패: " + error.message }, { status: 500 });
  }
}
