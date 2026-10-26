import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: 연장근무 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    const pool = getErpPool();
    let query = `
      SELECT 
        o.id,
        o.employee_id as "employeeId",
        e.employee_no as "employeeNo",
        e.name as "employeeName",
        e.department,
        e.position,
        e.duty,
        o.ot_date as "otDate",
        o.start_time as "startTime",
        o.end_time as "endTime",
        o.ot_hours as "otHours",
        o.reason,
        o.status,
        o.approver_id as "approverId",
        a.name as "approverName",
        o.approved_at as "approvedAt",
        o.memo,
        o.created_at as "createdAt"
      FROM erp_overtimes o
      JOIN erp_employees e ON o.employee_id = e.id
      LEFT JOIN erp_employees a ON o.approver_id = a.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (month) {
      params.push(`${month}%`);
      conditions.push(`o.ot_date::text LIKE $${params.length}`);
    }

    if (employeeId) {
      params.push(employeeId);
      conditions.push(`o.employee_id = $${params.length}`);
    }

    if (status && status !== "ALL") {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY o.ot_date DESC, o.id DESC`;

    const result = await pool.query(query, params);
    return NextResponse.json({ success: true, overtimes: result.rows });
  } catch (error: any) {
    console.error("GET Overtimes Error:", error);
    return NextResponse.json({ error: "연장근무 목록 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: 연장근무 신청 등록
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, otDate, startTime, endTime, otHours, reason } = body;

    if (!employeeId || !otDate || !reason) {
      return NextResponse.json({ error: "사원, 근무일자, 사유는 필수 입력 항목입니다." }, { status: 400 });
    }

    const calculatedHours = otHours ? parseFloat(otHours) : 3.0;

    const { data, error } = await supabaseErp
      .from("erp_overtimes")
      .insert({
        employee_id: employeeId,
        ot_date: otDate,
        start_time: startTime || "18:00",
        end_time: endTime || "21:00",
        ot_hours: calculatedHours,
        reason: reason.trim(),
        status: "PENDING",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 결재 연동 (결재선 규칙: OT_REQUEST)
    const pool = getErpPool();
    const ruleRes = await pool.query(`SELECT id, required_tier FROM erp_approval_rules WHERE event_type = 'OT_REQUEST' LIMIT 1`);
    if (ruleRes.rows.length > 0) {
      const rule = ruleRes.rows[0];
      const adminRes = await pool.query(`SELECT id FROM erp_employees WHERE tier_level >= $1 AND employment_status = 'ACTIVE' ORDER BY tier_level DESC LIMIT 1`, [rule.required_tier]);
      const approverId = adminRes.rows.length > 0 ? adminRes.rows[0].id : employeeId;

      const reqRes = await pool.query(
        `INSERT INTO erp_approval_requests (rule_id, target_table, target_id, requester_id, title, payload, status)
         VALUES ($1, 'erp_overtimes', $2, $3, $4, $5, 'PENDING') RETURNING id`,
        [rule.id, data.id, employeeId, `[연장근무] ${otDate} (${calculatedHours}시간)`, { otHours: calculatedHours, reason }]
      );
      if (reqRes.rows.length > 0) {
        await pool.query(
          `INSERT INTO erp_approval_steps (request_id, step_order, approver_id, status) VALUES ($1, 1, $2, 'PENDING')`,
          [reqRes.rows[0].id, approverId]
        );
      }
    }

    return NextResponse.json({ success: true, overtime: data });
  } catch (error: any) {
    console.error("POST Overtime Error:", error);
    return NextResponse.json({ error: "연장근무 신청 실패: " + error.message }, { status: 500 });
  }
}

// PATCH: 승인 또는 반려 처리
export async function PATCH(request: Request) {
  try {
    const { id, action, approverId, memo } = await request.json();

    if (!id || !action || !approverId) {
      return NextResponse.json({ error: "연장근무 ID, 처리 구분, 결재자 ID는 필수입니다." }, { status: 400 });
    }

    const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const now = new Date().toISOString();

    const { data, error } = await supabaseErp
      .from("erp_overtimes")
      .update({
        status: nextStatus,
        approver_id: approverId,
        approved_at: now,
        memo: memo || (nextStatus === "APPROVED" ? "관리자 승인" : "관리자 반려"),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `연장근무가 ${nextStatus === "APPROVED" ? "승인" : "반려"} 처리되었습니다.`,
      overtime: data,
    });
  } catch (error: any) {
    console.error("PATCH Overtime Error:", error);
    return NextResponse.json({ error: "결재 처리 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: 연장근무 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 ID가 누락되었습니다." }, { status: 400 });
    }

    const { error } = await supabaseErp.from("erp_overtimes").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Overtime Error:", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
