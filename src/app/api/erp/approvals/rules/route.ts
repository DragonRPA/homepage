export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";
import { runSchemaInitOnce } from "@/lib/erpSchemaCache";

async function ensureDeptHeadApprovalRulesPolicy() {
  await runSchemaInitOnce("erp_approval_rules_dept_head_ssot_v1", async () => {
    const pool = getErpPool();
    await pool.query(`
      UPDATE erp_approval_rules
      SET required_tier = 4,
          description = '소속 부서장 전결 (대표이사 결재 제외)'
      WHERE required_tier > 4
         OR (COALESCE(description, '') LIKE '%대표%' AND COALESCE(description, '') NOT LIKE '%제외%')
    `);
  });
}

// GET: 결재선 규칙 목록 조회
export async function GET() {
  try {
    await ensureDeptHeadApprovalRulesPolicy();
    const pool = getErpPool();
    const query = `
      SELECT 
        id,
        event_type as "eventType",
        event_name as "eventName",
        category,
        required_tier as "requiredTier",
        auto_consensus as "autoConsensus",
        description,
        is_active as "isActive",
        created_at as "createdAt"
      FROM erp_approval_rules
      ORDER BY id ASC
    `;
    const result = await pool.query(query);
    return NextResponse.json({ success: true, rules: result.rows });
  } catch (error: any) {
    console.error("GET Approval Rules Error:", error);
    return NextResponse.json({ error: "결재선 규칙 조회 실패: " + error.message }, { status: 500 });
  }
}

// PUT: 결재선 규칙 설정 업데이트 (최대 Tier 4 부서장 전결 제한, 대표이사 결재 제외)
export async function PUT(request: Request) {
  try {
    await ensureDeptHeadApprovalRulesPolicy();
    const body = await request.json();
    const { id, requiredTier, autoConsensus, isActive, description } = body;

    if (!id) {
      return NextResponse.json({ error: "규칙 ID가 누락되었습니다." }, { status: 400 });
    }

    const updatePayload: any = {};
    if (requiredTier !== undefined) {
      const parsedTier = parseInt(String(requiredTier), 10);
      if (Number.isNaN(parsedTier)) {
        return NextResponse.json({ error: "유효하지 않은 결재 티어입니다." }, { status: 400 });
      }
      // 전사 부서장 전결 원칙: 최대 허용 티어를 Tier 4(부서장 전결)로 제한
      updatePayload.required_tier = Math.min(4, Math.max(1, parsedTier));
    }
    if (autoConsensus !== undefined) updatePayload.auto_consensus = !!autoConsensus;
    if (isActive !== undefined) updatePayload.is_active = !!isActive;
    if (description !== undefined) updatePayload.description = description ? String(description).trim() : null;

    const { data, error } = await supabaseErp
      .from("erp_approval_rules")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rule: data });
  } catch (error: any) {
    console.error("PUT Approval Rule Error:", error);
    return NextResponse.json({ error: "결재선 규칙 갱신 실패" }, { status: 500 });
  }
}
