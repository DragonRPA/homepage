import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: 결재선 규칙 목록 조회
export async function GET() {
  try {
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

// PUT: 결재선 규칙 설정 업데이트
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, requiredTier, autoConsensus, isActive, description } = body;

    if (!id) {
      return NextResponse.json({ error: "규칙 ID가 누락되었습니다." }, { status: 400 });
    }

    const updatePayload: any = {};
    if (requiredTier !== undefined) updatePayload.required_tier = parseInt(requiredTier);
    if (autoConsensus !== undefined) updatePayload.auto_consensus = !!autoConsensus;
    if (isActive !== undefined) updatePayload.is_active = !!isActive;
    if (description !== undefined) updatePayload.description = description ? description.trim() : null;

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
