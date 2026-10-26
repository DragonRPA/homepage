import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: List all leave requests
export async function GET() {
  try {
    const pool = getErpPool();
    const query = `
      SELECT 
        l.id,
        l.employee_id as "employeeId",
        e.employee_no as "employeeNo",
        e.name as "employeeName",
        e.department,
        e.position,
        l.leave_type as "leaveType",
        l.start_date as "startDate",
        l.end_date as "endDate",
        l.deducted_days as "deductedDays",
        l.reason,
        l.status,
        l.approver_id as "approverId",
        a.name as "approverName",
        l.approved_at as "approvedAt",
        l.reject_reason as "rejectReason",
        l.created_at as "createdAt"
      FROM erp_leave_requests l
      JOIN erp_employees e ON l.employee_id = e.id
      LEFT JOIN erp_employees a ON l.approver_id = a.id
      ORDER BY l.created_at DESC
    `;
    const result = await pool.query(query);
    return NextResponse.json({ success: true, leaves: result.rows });
  } catch (error: any) {
    console.error("GET Leaves Error:", error);
    return NextResponse.json({ error: "연차 신청 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Submit a leave request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, leaveType, startDate, endDate, deductedDays, reason } = body;

    if (!employeeId || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: "사원 ID, 시작일, 종료일, 사유는 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseErp
      .from("erp_leave_requests")
      .insert({
        employee_id: employeeId,
        leave_type: leaveType || "ANNUAL",
        start_date: startDate,
        end_date: endDate,
        deducted_days: parseFloat(deductedDays || "1.0"),
        reason: reason.trim(),
        status: "PENDING",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 결재 연동 (결재선 규칙: LEAVE_REQUEST)
    try {
      const pool = getErpPool();
      const ruleRes = await pool.query(`SELECT id, required_tier FROM erp_approval_rules WHERE event_type = 'LEAVE_REQUEST' LIMIT 1`);
      if (ruleRes.rows.length > 0) {
        const rule = ruleRes.rows[0];
        const adminRes = await pool.query(
          `SELECT id FROM erp_employees WHERE tier_level >= $1 AND employment_status = 'ACTIVE' ORDER BY tier_level DESC LIMIT 1`,
          [rule.required_tier]
        );
        const approverId = adminRes.rows.length > 0 ? adminRes.rows[0].id : employeeId;

        const typeLabel = leaveType === 'HALF_AM' ? '오전반차' : leaveType === 'HALF_PM' ? '오후반차' : '연차';
        const reqRes = await pool.query(
          `INSERT INTO erp_approval_requests (rule_id, target_table, target_id, requester_id, title, payload, status)
           VALUES ($1, 'erp_leave_requests', $2, $3, $4, $5, 'PENDING') RETURNING id`,
          [
            rule.id,
            data.id,
            employeeId,
            `[${typeLabel}] ${startDate} ~ ${endDate} (${deductedDays}일)`,
            { leaveType, startDate, endDate, deductedDays, reason }
          ]
        );
        if (reqRes.rows.length > 0) {
          await pool.query(
            `INSERT INTO erp_approval_steps (request_id, step_order, approver_id, status) VALUES ($1, 1, $2, 'PENDING')`,
            [reqRes.rows[0].id, approverId]
          );
        }
      }
    } catch (apprErr) {
      console.warn("연차 결재요청 자동등록 실패(무시가능):", apprErr);
    }

    return NextResponse.json({ success: true, leave: data });
  } catch (error: any) {
    console.error("POST Leave Request Error:", error);
    return NextResponse.json({ error: "연차 신청 등록 실패" }, { status: 500 });
  }
}

// DELETE: 연차 신청 삭제/취소
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 연차 신청 ID가 누락되었습니다." }, { status: 400 });
    }

    const { error } = await supabaseErp.from("erp_leave_requests").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Leave Error:", error);
    return NextResponse.json({ error: "연차 삭제 실패" }, { status: 500 });
  }
}

// PATCH: Approve or Reject leave request (1-click approval workflow)
export async function PATCH(request: Request) {
  try {
    const { requestId, action, approverId, rejectReason } = await request.json();

    if (!requestId || !action || !approverId) {
      return NextResponse.json(
        { error: "결재 대상 ID, 승인/반려 구분, 결재자 ID는 필수입니다." },
        { status: 400 }
      );
    }

    const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const updateData: any = {
      status: nextStatus,
      approver_id: approverId,
      approved_at: new Date().toISOString(),
      reject_reason: action === "REJECT" ? (rejectReason || "관리자 반려") : null,
    };

    const { data, error } = await supabaseErp
      .from("erp_leave_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `연차 신청이 ${nextStatus === "APPROVED" ? "승인" : "반려"} 처리되었습니다.`,
      leave: data,
    });
  } catch (error: any) {
    console.error("PATCH Leave Approval Error:", error);
    return NextResponse.json({ error: "결재 처리 실패" }, { status: 500 });
  }
}
