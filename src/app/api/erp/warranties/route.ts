export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { ensureForkliftSchema } from "@/lib/forkliftSchemaInit";
import {
  addMonthsMinusOneDay,
  computeWarrantyStatus,
  getKstTodayIso,
  normalizeAttachedOptions,
} from "@/lib/forkliftDomain";
import { parseNumericInput } from "@/lib/rentalFeeUtils";

function formatWarrantyRow(r: any, today: string) {
  const startDate = r.warrantyStartDate ? String(r.warrantyStartDate).slice(0, 10) : "";
  const endDate = r.warrantyEndDate ? String(r.warrantyEndDate).slice(0, 10) : "";
  const deliveryDate = r.deliveryDate ? String(r.deliveryDate).slice(0, 10) : "";
  const warrantyHours = Number(r.warrantyHours ?? 2000);
  const currentOperatingHours = Number(r.currentOperatingHours || 0);
  const computed = computeWarrantyStatus({
    warrantyEndDate: endDate,
    warrantyHours,
    currentOperatingHours,
    today,
  });

  const claims = Array.isArray(r.claims) ? r.claims : [];
  const totalRepairCost = claims.reduce((sum: number, c: any) => sum + Number(c.repairCost || 0), 0);
  const totalBilledAmount = claims.reduce((sum: number, c: any) => sum + Number(c.billedAmount || 0), 0);

  return {
    ...r,
    deliveryDate,
    warrantyStartDate: startDate,
    warrantyEndDate: endDate,
    warrantyMonths: Number(r.warrantyMonths ?? 12),
    warrantyHours,
    currentOperatingHours,
    attachedOptions: normalizeAttachedOptions(r.attachedOptions),
    status: computed.status,
    daysRemaining: computed.daysRemaining,
    hoursRemaining: computed.hoursRemaining,
    triggerReason: computed.triggerReason,
    claimCount: claims.length,
    totalRepairCost,
    totalBilledAmount,
    claims,
  };
}

// GET: List all forklift per-chassis warranties with computed status & claims
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const statusFilter = searchParams.get("status");

    const pool = getErpPool();
    await ensureForkliftSchema(pool);
    const today = getKstTodayIso();

    let query = `
      SELECT
        w.id,
        w.warranty_no AS "warrantyNo",
        w.chassis_no AS "chassisNo",
        w.source_type AS "sourceType",
        w.source_id AS "sourceId",
        w.asset_id AS "assetId",
        a.asset_no AS "assetNo",
        w.product_id AS "productId",
        w.model_name AS "modelName",
        w.manufacturer,
        w.partner_id AS "partnerId",
        w.customer_name AS "customerName",
        w.site_name AS "siteName",
        TO_CHAR(w.delivery_date, 'YYYY-MM-DD') AS "deliveryDate",
        TO_CHAR(w.warranty_start_date, 'YYYY-MM-DD') AS "warrantyStartDate",
        w.warranty_months AS "warrantyMonths",
        TO_CHAR(w.warranty_end_date, 'YYYY-MM-DD') AS "warrantyEndDate",
        w.warranty_hours AS "warrantyHours",
        w.current_operating_hours AS "currentOperatingHours",
        COALESCE(w.attached_options, '[]'::jsonb) AS "attachedOptions",
        w.status,
        w.memo,
        w.created_at AS "createdAt",
        w.updated_at AS "updatedAt",
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', c.id,
              'warrantyId', c.warranty_id,
              'chassisNo', c.chassis_no,
              'claimDate', TO_CHAR(c.claim_date, 'YYYY-MM-DD'),
              'operatingHours', c.operating_hours,
              'claimType', c.claim_type,
              'symptom', c.symptom,
              'resolution', c.resolution,
              'partsUsed', c.parts_used,
              'repairCost', c.repair_cost,
              'billedAmount', c.billed_amount,
              'technicianName', c.technician_name,
              'status', c.status,
              'memo', c.memo,
              'createdAt', c.created_at
            )
            ORDER BY c.claim_date DESC, c.id DESC
          )
          FROM erp_forklift_warranty_claims c
          WHERE c.warranty_id = w.id
        ), '[]'::json) AS claims
      FROM erp_forklift_warranties w
      LEFT JOIN erp_rental_assets a ON w.asset_id = a.id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (idParam) {
      params.push(parseInt(idParam, 10));
      query += ` AND w.id = $${params.length}`;
    }

    query += ` ORDER BY w.warranty_end_date ASC, w.id DESC`;

    const res = await pool.query(query, params);
    let rows = (res.rows || []).map((r: any) => formatWarrantyRow(r, today));

    if (statusFilter && statusFilter !== "ALL") {
      rows = rows.filter((r: any) => r.status === statusFilter);
    }

    return NextResponse.json({
      success: true,
      today,
      warranties: rows,
    });
  } catch (error: any) {
    console.error("GET Warranties Error:", error);
    return NextResponse.json({ error: "차대번호 보증 목록 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: Manually register a chassis warranty record
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      chassisNo,
      sourceType,
      sourceId,
      assetId,
      productId,
      modelName,
      manufacturer,
      partnerId,
      customerName,
      siteName,
      deliveryDate,
      warrantyStartDate,
      warrantyMonths,
      warrantyEndDate,
      warrantyHours,
      currentOperatingHours,
      attachedOptions,
      memo,
    } = body;

    const cleanChassis = String(chassisNo || "").trim().toUpperCase();
    if (!cleanChassis) {
      return NextResponse.json({ error: "차대번호는 필수 입력 항목입니다." }, { status: 400 });
    }

    const today = getKstTodayIso();
    const startDate = String(warrantyStartDate || deliveryDate || today).slice(0, 10);
    const months = Math.max(0, Math.round(Number(warrantyMonths ?? 12) || 0));
    const endDate = warrantyEndDate
      ? String(warrantyEndDate).slice(0, 10)
      : months > 0
      ? addMonthsMinusOneDay(startDate, months)
      : startDate;
    const hoursLimit = Math.max(0, Math.round(parseNumericInput(warrantyHours ?? 2000)));
    const curHours = Math.max(0, Number(parseNumericInput(currentOperatingHours ?? 0)) || 0);
    const cleanOptions = normalizeAttachedOptions(attachedOptions);

    const computed = computeWarrantyStatus({
      warrantyEndDate: endDate,
      warrantyHours: hoursLimit,
      currentOperatingHours: curHours,
      today,
    });

    const pool = getErpPool();
    await ensureForkliftSchema(pool);

    const warrantyNo = `WR${startDate.slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const ins = await pool.query(
      `INSERT INTO erp_forklift_warranties
       (warranty_no, chassis_no, source_type, source_id, asset_id, product_id,
        model_name, manufacturer, partner_id, customer_name, site_name,
        delivery_date, warranty_start_date, warranty_months, warranty_end_date,
        warranty_hours, current_operating_hours, attached_options, status, memo)
       VALUES ($1, $2, $3, $4, $5, $6,
               $7, $8, $9, $10, $11,
               $12, $13, $14, $15,
               $16, $17, $18::jsonb, $19, $20)
       RETURNING id`,
      [
        warrantyNo,
        cleanChassis,
        sourceType || (assetId ? "RENTAL_ASSET" : "MANUAL"),
        sourceId ? Number(sourceId) : null,
        assetId ? Number(assetId) : null,
        productId ? Number(productId) : null,
        String(modelName || "").trim(),
        String(manufacturer || "").trim(),
        partnerId ? Number(partnerId) : null,
        String(customerName || "").trim(),
        String(siteName || "").trim(),
        deliveryDate ? String(deliveryDate).slice(0, 10) : startDate,
        startDate,
        months,
        endDate,
        hoursLimit,
        curHours,
        JSON.stringify(cleanOptions),
        computed.status,
        String(memo || "").trim(),
      ]
    );

    if (assetId) {
      await pool.query(
        `UPDATE erp_rental_assets
         SET operating_hours = GREATEST(COALESCE(operating_hours, 0), $1),
             warranty_start_date = COALESCE($2::date, warranty_start_date),
             warranty_end_date = COALESCE($3::date, warranty_end_date),
             warranty_hours = $4,
             attached_options = CASE WHEN jsonb_array_length($5::jsonb) > 0 THEN $5::jsonb ELSE attached_options END,
             updated_at = NOW()
         WHERE id = $6`,
        [curHours, startDate, endDate, hoursLimit, JSON.stringify(cleanOptions), Number(assetId)]
      );
    }

    return NextResponse.json({
      success: true,
      warrantyId: ins.rows[0].id,
      warrantyNo,
      status: computed.status,
    });
  } catch (error: any) {
    console.error("POST Warranty Error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "이미 등록된 차대번호 보증 카드가 존재합니다." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "보증 등록 실패: " + error.message }, { status: 500 });
  }
}

// PUT: Update warranty card fields, operating hours, attached options, or dates
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      chassisNo,
      modelName,
      manufacturer,
      partnerId,
      customerName,
      siteName,
      deliveryDate,
      warrantyStartDate,
      warrantyMonths,
      warrantyEndDate,
      warrantyHours,
      currentOperatingHours,
      attachedOptions,
      memo,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "보증 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    await ensureForkliftSchema(pool);
    const today = getKstTodayIso();

    const prevRes = await pool.query(`SELECT * FROM erp_forklift_warranties WHERE id = $1`, [
      parseInt(String(id), 10),
    ]);
    if (prevRes.rows.length === 0) {
      return NextResponse.json({ error: "보증 카드를 찾을 수 없습니다." }, { status: 404 });
    }
    const prev = prevRes.rows[0];

    const nextChassis = chassisNo ? String(chassisNo).trim().toUpperCase() : prev.chassis_no;
    const nextStart = warrantyStartDate
      ? String(warrantyStartDate).slice(0, 10)
      : String(prev.warranty_start_date).slice(0, 10);
    const nextMonths =
      warrantyMonths !== undefined ? Math.max(0, Math.round(Number(warrantyMonths) || 0)) : Number(prev.warranty_months || 12);
    const nextEnd = warrantyEndDate
      ? String(warrantyEndDate).slice(0, 10)
      : warrantyStartDate !== undefined || warrantyMonths !== undefined
      ? nextMonths > 0
        ? addMonthsMinusOneDay(nextStart, nextMonths)
        : nextStart
      : String(prev.warranty_end_date).slice(0, 10);
    const nextHoursLimit =
      warrantyHours !== undefined
        ? Math.max(0, Math.round(parseNumericInput(warrantyHours)))
        : Number(prev.warranty_hours ?? 2000);
    const nextCurHours =
      currentOperatingHours !== undefined
        ? Math.max(0, Number(parseNumericInput(currentOperatingHours)) || 0)
        : Number(prev.current_operating_hours || 0);
    const nextOptions =
      attachedOptions !== undefined
        ? normalizeAttachedOptions(attachedOptions)
        : normalizeAttachedOptions(prev.attached_options);

    const computed = computeWarrantyStatus({
      warrantyEndDate: nextEnd,
      warrantyHours: nextHoursLimit,
      currentOperatingHours: nextCurHours,
      today,
    });

    await pool.query(
      `UPDATE erp_forklift_warranties
       SET chassis_no = $1,
           model_name = $2,
           manufacturer = $3,
           partner_id = $4,
           customer_name = $5,
           site_name = $6,
           delivery_date = $7,
           warranty_start_date = $8,
           warranty_months = $9,
           warranty_end_date = $10,
           warranty_hours = $11,
           current_operating_hours = $12,
           attached_options = $13::jsonb,
           status = $14,
           memo = $15,
           updated_at = NOW()
       WHERE id = $16`,
      [
        nextChassis,
        modelName !== undefined ? String(modelName || "").trim() : prev.model_name,
        manufacturer !== undefined ? String(manufacturer || "").trim() : prev.manufacturer,
        partnerId !== undefined ? (partnerId ? Number(partnerId) : null) : prev.partner_id,
        customerName !== undefined ? String(customerName || "").trim() : prev.customer_name,
        siteName !== undefined ? String(siteName || "").trim() : prev.site_name,
        deliveryDate !== undefined
          ? deliveryDate
            ? String(deliveryDate).slice(0, 10)
            : null
          : prev.delivery_date,
        nextStart,
        nextMonths,
        nextEnd,
        nextHoursLimit,
        nextCurHours,
        JSON.stringify(nextOptions),
        computed.status,
        memo !== undefined ? String(memo || "").trim() : prev.memo,
        parseInt(String(id), 10),
      ]
    );

    if (prev.asset_id) {
      await pool.query(
        `UPDATE erp_rental_assets
         SET operating_hours = $1,
             warranty_start_date = $2::date,
             warranty_end_date = $3::date,
             warranty_hours = $4,
             attached_options = $5::jsonb,
             updated_at = NOW()
         WHERE id = $6`,
        [nextCurHours, nextStart, nextEnd, nextHoursLimit, JSON.stringify(nextOptions), prev.asset_id]
      );
    }

    return NextResponse.json({ success: true, status: computed.status });
  } catch (error: any) {
    console.error("PUT Warranty Error:", error);
    return NextResponse.json({ error: "보증 정보 수정 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: Delete warranty card (and cascading claims)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 보증 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    await ensureForkliftSchema(pool);
    await pool.query("DELETE FROM erp_forklift_warranties WHERE id = $1", [parseInt(id, 10)]);
    return NextResponse.json({ success: true, message: "보증 카드가 삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Warranty Error:", error);
    return NextResponse.json({ error: "보증 카드 삭제 실패: " + error.message }, { status: 500 });
  }
}
