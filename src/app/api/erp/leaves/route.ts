import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";
import {
  isNonDeductingLeaveType,
  getLeaveTypeLabel,
  calculateWeekdayCount,
} from "@/lib/erpFormat";

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
        l.start_date::text as "startDate",
        l.end_date::text as "endDate",
        l.deducted_days::numeric as "deductedDays",
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

// POST: Submit a leave request (Supports both annual-leave deducting & non-deducting leaves)
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

    const normalizedType = String(leaveType || "ANNUAL").toUpperCase();
    const isNonDeducting = isNonDeductingLeaveType(normalizedType);

    let parsedDeductedDays: number;
    if (isNonDeducting) {
      parsedDeductedDays = 0;
    } else if (deductedDays !== undefined && deductedDays !== null && deductedDays !== "") {
      const num = parseFloat(String(deductedDays));
      parsedDeductedDays = isNaN(num) ? 1.0 : Math.max(0, num);
    } else if (normalizedType === "HALF_AM" || normalizedType === "HALF_PM") {
      parsedDeductedDays = 0.5;
    } else {
      parsedDeductedDays = Math.max(1, calculateWeekdayCount(startDate, endDate));
    }

    const { data, error } = await supabaseErp
      .from("erp_leave_requests")
      .insert({
        employee_id: employeeId,
        leave_type: normalizedType,
        start_date: startDate,
        end_date: endDate,
        deducted_days: parsedDeductedDays,
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
      const ruleRes = await pool.query(
        `SELECT id, required_tier FROM erp_approval_rules WHERE event_type = 'LEAVE_REQUEST' LIMIT 1`
      );
      if (ruleRes.rows.length > 0) {
        const rule = ruleRes.rows[0];
        const adminRes = await pool.query(
          `SELECT id FROM erp_employees WHERE tier_level >= $1 AND employment_status = 'ACTIVE' ORDER BY tier_level DESC LIMIT 1`,
          [rule.required_tier]
        );
        const approverId = adminRes.rows.length > 0 ? adminRes.rows[0].id : employeeId;

        const typeLabel = getLeaveTypeLabel(normalizedType);
        const durationDays =
          normalizedType === "HALF_AM" || normalizedType === "HALF_PM"
            ? 0.5
            : Math.max(1, calculateWeekdayCount(startDate, endDate));
        const deductionSummary = isNonDeducting
          ? `휴가 ${durationDays}일 / 연차 미차감(0일)`
          : `연차 ${parsedDeductedDays}일 차감`;

        const reqNo = `APPR-LV-${String(data.id).padStart(4, "0")}`;
        const reqRes = await pool.query(
          `INSERT INTO erp_approval_requests (request_no, event_type, rule_id, target_table, target_id, requester_id, title, payload, status)
           VALUES ($1, 'LEAVE_REQUEST', $2, 'erp_leave_requests', $3, $4, $5, $6, 'PENDING') RETURNING id`,
          [
            reqNo,
            rule.id,
            data.id,
            employeeId,
            `[${typeLabel}] ${startDate} ~ ${endDate} (${deductionSummary})`,
            {
              leaveType: normalizedType,
              startDate,
              endDate,
              deductedDays: parsedDeductedDays,
              durationDays,
              reason,
            },
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

    // 연동된 결재함 요청도 함께 정리
    try {
      const pool = getErpPool();
      await pool.query(
        `DELETE FROM erp_approval_requests WHERE target_table = 'erp_leave_requests' AND target_id = $1 AND status = 'PENDING'`,
        [id]
      );
    } catch {}

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
    const now = new Date().toISOString();
    const updateData: any = {
      status: nextStatus,
      approver_id: approverId,
      approved_at: now,
      reject_reason: action === "REJECT" ? rejectReason || "관리자 반려" : null,
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

    // 연동된 결재함 상태도 동기화
    try {
      const pool = getErpPool();
      const apprRes = await pool.query(
        `UPDATE erp_approval_requests SET status = $1 WHERE target_table = 'erp_leave_requests' AND target_id = $2 RETURNING id`,
        [nextStatus, requestId]
      );
      if (apprRes.rows.length > 0) {
        await pool.query(
          `UPDATE erp_approval_steps SET status = $1, acted_at = $2 WHERE request_id = $3`,
          [nextStatus, now, apprRes.rows[0].id]
        );
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: `휴가 신청이 ${nextStatus === "APPROVED" ? "승인" : "반려"} 처리되었습니다.`,
      leave: data,
    });
  } catch (error: any) {
    console.error("PATCH Leave Approval Error:", error);
    return NextResponse.json({ error: "결재 처리 실패" }, { status: 500 });
  }
}
