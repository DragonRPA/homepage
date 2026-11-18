export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { ensureForkliftSchema } from "@/lib/forkliftSchemaInit";
import { computeWarrantyStatus, getKstTodayIso } from "@/lib/forkliftDomain";
import { parseNumericInput } from "@/lib/rentalFeeUtils";

// GET: List AS / repair claims for a warranty card
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const warrantyId = searchParams.get("warrantyId");

    const pool = getErpPool();
    await ensureForkliftSchema(pool);

    const params: any[] = [];
    let where = "";
    if (warrantyId) {
      params.push(parseInt(warrantyId, 10));
      where = `WHERE warranty_id = $1`;
    }

    const res = await pool.query(
      `SELECT
         id,
         warranty_id AS "warrantyId",
         chassis_no AS "chassisNo",
         TO_CHAR(claim_date, 'YYYY-MM-DD') AS "claimDate",
         operating_hours AS "operatingHours",
         claim_type AS "claimType",
         symptom,
         resolution,
         parts_used AS "partsUsed",
         repair_cost AS "repairCost",
         billed_amount AS "billedAmount",
         technician_name AS "technicianName",
         status,
         memo,
         created_at AS "createdAt"
       FROM erp_forklift_warranty_claims
       ${where}
       ORDER BY claim_date DESC, id DESC`,
      params
    );

    return NextResponse.json({ success: true, claims: res.rows });
  } catch (error: any) {
    console.error("GET Warranty Claims Error:", error);
    return NextResponse.json({ error: "AS 이력 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: Register a new AS / repair / periodic check claim and update operating hours
export async function POST(request: Request) {
  const pool = getErpPool();
  await ensureForkliftSchema(pool);
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      warrantyId,
      claimDate,
      operatingHours,
      claimType,
      symptom,
      resolution,
      partsUsed,
      repairCost,
      billedAmount,
      technicianName,
      status,
      memo,
    } = body;

    if (!warrantyId || !String(symptom || "").trim()) {
      return NextResponse.json(
        { error: "보증 카드와 증상/점검 내용은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    const today = getKstTodayIso();
    const effectiveClaimDate = String(claimDate || today).slice(0, 10);
    const claimOpHours = Math.max(0, Number(parseNumericInput(operatingHours ?? 0)) || 0);
    const cleanCost = Math.max(0, Math.round(parseNumericInput(repairCost ?? 0)));
    const cleanBilled = Math.max(0, Math.round(parseNumericInput(billedAmount ?? 0)));
    const safeParts = Array.isArray(partsUsed) ? partsUsed : [];

    await client.query("BEGIN");

    const wRes = await client.query(
      `SELECT id, chassis_no, asset_id, current_operating_hours, warranty_hours,
              TO_CHAR(warranty_end_date, 'YYYY-MM-DD') AS warranty_end_date
       FROM erp_forklift_warranties
       WHERE id = $1
       FOR UPDATE`,
      [parseInt(String(warrantyId), 10)]
    );

    if (wRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "해당 차대번호 보증 카드를 찾을 수 없습니다." }, { status: 404 });
    }
    const w = wRes.rows[0];

    const ins = await client.query(
      `INSERT INTO erp_forklift_warranty_claims
       (warranty_id, chassis_no, claim_date, operating_hours, claim_type,
        symptom, resolution, parts_used, repair_cost, billed_amount,
        technician_name, status, memo)
       VALUES ($1, $2, $3, $4, $5,
               $6, $7, $8::jsonb, $9, $10,
               $11, $12, $13)
       RETURNING
         id,
         warranty_id AS "warrantyId",
         chassis_no AS "chassisNo",
         TO_CHAR(claim_date, 'YYYY-MM-DD') AS "claimDate",
         operating_hours AS "operatingHours",
         claim_type AS "claimType",
         symptom,
         resolution,
         parts_used AS "partsUsed",
         repair_cost AS "repairCost",
         billed_amount AS "billedAmount",
         technician_name AS "technicianName",
         status,
         memo,
         created_at AS "createdAt"`,
      [
        w.id,
        w.chassis_no,
        effectiveClaimDate,
        claimOpHours,
        claimType || "WARRANTY_FREE",
        String(symptom || "").trim(),
        String(resolution || "").trim(),
        JSON.stringify(safeParts),
        cleanCost,
        cleanBilled,
        String(technicianName || "").trim(),
        status || "COMPLETED",
        String(memo || "").trim(),
      ]
    );

    const nextHours = Math.max(Number(w.current_operating_hours || 0), claimOpHours);
    const computed = computeWarrantyStatus({
      warrantyEndDate: w.warranty_end_date,
      warrantyHours: w.warranty_hours,
      currentOperatingHours: nextHours,
      today,
    });

    await client.query(
      `UPDATE erp_forklift_warranties
       SET current_operating_hours = GREATEST(current_operating_hours, $1),
           status = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [nextHours, computed.status, w.id]
    );

    if (w.asset_id) {
      await client.query(
        `UPDATE erp_rental_assets
         SET operating_hours = GREATEST(COALESCE(operating_hours, 0), $1),
             updated_at = NOW()
         WHERE id = $2`,
        [nextHours, w.asset_id]
      );
    }

    await client.query(
      `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
       VALUES ('WARRANTY', 'CLAIM', $1, $2, $3)`,
      [
        w.chassis_no,
        String(technicianName || "서비스팀").trim() || "서비스팀",
        JSON.stringify({
          warrantyId: w.id,
          claimId: ins.rows[0].id,
          claimType: claimType || "WARRANTY_FREE",
          operatingHours: nextHours,
          repairCost: cleanCost,
          billedAmount: cleanBilled,
        }),
      ]
    );

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      claim: ins.rows[0],
      currentOperatingHours: nextHours,
      warrantyStatus: computed.status,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("POST Warranty Claim Error:", error);
    return NextResponse.json({ error: "AS 이력 등록 실패: " + error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE: Delete a claim record
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 AS 이력 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    await ensureForkliftSchema(pool);
    await pool.query("DELETE FROM erp_forklift_warranty_claims WHERE id = $1", [parseInt(id, 10)]);
    return NextResponse.json({ success: true, message: "AS 이력이 삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Warranty Claim Error:", error);
    return NextResponse.json({ error: "AS 이력 삭제 실패: " + error.message }, { status: 500 });
  }
}
