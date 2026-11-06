export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";
import {
  isNonDeductingLeaveType,
  getLeaveTypeLabel,
  calculateWeekdayCount,
} from "@/lib/erpFormat";

/**
 * 연차 신청자의 소속 부서장(팀장)을 결재자로 산출하며, 부서장 본인이 상신하는 경우 대표이사 결재 없이 본인 전결(자동 승인)로 처리
 * - 일반 부서원(예: 박종환, 김승지)이 상신 -> 소속 부서(렌탈운영팀)의 부서장(장종순) 배정 (autoApprove: false)
 * - 부서장 본인(예: 장종순) 또는 대표이사가 상신 -> 본인 전결 처리 (autoApprove: true)
 */
async function resolveLeaveApprover(
  pool: any,
  requesterEmpId: number
): Promise<{ approverId: number; autoApprove: boolean }> {
  const empRes = await pool.query(
    `SELECT e.id, e.name, e.role, e.role_code, e.duty, e.position, e.tier_level,
            e.department_id, COALESCE(d.dept_name, e.department, '') AS dept_name,
            d.manager_name, d.parent_id
     FROM erp_employees e
     LEFT JOIN erp_departments d ON e.department_id = d.id OR (e.department_id IS NULL AND e.department = d.dept_name)
     WHERE e.id = $1
     LIMIT 1`,
    [requesterEmpId]
  );

  if (empRes.rows.length > 0) {
    const reqEmp = empRes.rows[0];
    const reqName = String(reqEmp.name || "").trim();
    const deptId = reqEmp.department_id;
    const deptName = String(reqEmp.dept_name || "").trim();
    const deptManagerName = String(reqEmp.manager_name || "").trim();
    const duty = String(reqEmp.duty || "").trim();
    const pos = String(reqEmp.position || "").trim();
    const role = String(reqEmp.role || "").toUpperCase();
    const roleCode = String(reqEmp.role_code || "").toUpperCase();
    const tierLevel = Number(reqEmp.tier_level || 0);

    // 1. 신청자 본인이 부서장(팀장/부장/임원/대표이사)이거나 소속 부서의 manager_name인 경우 -> 대표이사 결재 없이 즉시 전결(자동 승인)
    const isDeptHeadOrExec =
      (deptManagerName && deptManagerName === reqName) ||
      role === "MANAGER" ||
      roleCode === "MANAGER" ||
      role === "ADMIN" ||
      roleCode === "ADMIN" ||
      tierLevel >= 2 ||
      /팀장|부서장|본부장|실장|대표/.test(duty) ||
      /팀장|부서장|부장|이사|대표/.test(pos);

    if (isDeptHeadOrExec) {
      return { approverId: requesterEmpId, autoApprove: true };
    }

    // 2. 소속 부서에 지정된 부서장(manager_name)이 있고, 본인이 아닌 경우 해당 부서장을 결재자로 지정
    if (deptManagerName && deptManagerName !== reqName) {
      const mgrByName = await pool.query(
        `SELECT id FROM erp_employees WHERE name = $1 AND employment_status = 'ACTIVE' AND id <> $2 LIMIT 1`,
        [deptManagerName, requesterEmpId]
      );
      if (mgrByName.rows.length > 0) {
        return { approverId: Number(mgrByName.rows[0].id), autoApprove: false };
      }
    }

    // 3. 동일 부서 내 직책(팀장/부서장/본부장/실장) 또는 역할(MANAGER) 보유자를 탐색 (본인 제외)
    if (deptId || deptName) {
      const deptHeadRes = await pool.query(
        `SELECT id FROM erp_employees
         WHERE employment_status = 'ACTIVE'
           AND id <> $1
           AND (
             ($2::int IS NOT NULL AND department_id = $2::int)
             OR ($3 <> '' AND department = $3)
           )
           AND (
             role = 'MANAGER' OR role_code = 'MANAGER'
             OR duty LIKE '%팀장%' OR duty LIKE '%부서장%' OR duty LIKE '%본부장%' OR duty LIKE '%실장%'
             OR position LIKE '%팀장%' OR position LIKE '%부서장%' OR position LIKE '%부장%'
           )
         ORDER BY tier_level DESC, id ASC
         LIMIT 1`,
        [requesterEmpId, deptId ? Number(deptId) : null, deptName]
      );
      if (deptHeadRes.rows.length > 0) {
        return { approverId: Number(deptHeadRes.rows[0].id), autoApprove: false };
      }
    }
  }

  // 4. 부서 내 팀장이 없는 경우 전사 MANAGER(부서장) 탐색 (대표이사에게 올라가지 않도록 MANAGER 우선 배정)
  const fallbackMgrRes = await pool.query(
    `SELECT id FROM erp_employees
     WHERE employment_status = 'ACTIVE'
       AND id <> $1
       AND (role = 'MANAGER' OR role_code = 'MANAGER' OR duty LIKE '%팀장%' OR position LIKE '%부장%')
     ORDER BY tier_level DESC, id ASC
     LIMIT 1`,
    [requesterEmpId]
  );
  if (fallbackMgrRes.rows.length > 0) {
    return { approverId: Number(fallbackMgrRes.rows[0].id), autoApprove: false };
  }

  return { approverId: requesterEmpId, autoApprove: true };
}

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

// POST: Submit a leave request (각자 본인의 연차만 상신하며, 부서장의 '내 결재함'으로 결재 요청 생성)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, requesterId, leaveType, startDate, endDate, deductedDays, reason } = body;

    if (!employeeId || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: "사원 ID, 시작일, 종료일, 사유는 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    // 본인 연차만 상신 가능 원칙 검증
    if (requesterId && Number(requesterId) !== Number(employeeId)) {
      return NextResponse.json(
        { error: "연차 신청은 본인만 직접 상신할 수 있습니다." },
        { status: 403 }
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

    const pool = getErpPool();
    const { approverId, autoApprove } = await resolveLeaveApprover(pool, Number(employeeId));
    const initialStatus = autoApprove ? "APPROVED" : "PENDING";
    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseErp
      .from("erp_leave_requests")
      .insert({
        employee_id: Number(employeeId),
        leave_type: normalizedType,
        start_date: startDate,
        end_date: endDate,
        deducted_days: parsedDeductedDays,
        reason: reason.trim(),
        status: initialStatus,
        approver_id: approverId,
        approved_at: autoApprove ? nowIso : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 결재 연동 (부서원은 부서장의 '내 결재함'으로 PENDING 상신, 부서장 본인은 대표이사 결재 없이 즉시 전결 APPROVED 기록)
    let approverName = "";
    try {
      const ruleRes = await pool.query(
        `SELECT id, required_tier FROM erp_approval_rules WHERE event_type = 'LEAVE_REQUEST' LIMIT 1`
      );
      const ruleId = ruleRes.rows.length > 0 ? ruleRes.rows[0].id : null;

      const apprNameRes = await pool.query(`SELECT name, duty, position FROM erp_employees WHERE id = $1 LIMIT 1`, [
        approverId,
      ]);
      if (apprNameRes.rows.length > 0) {
        approverName = apprNameRes.rows[0].name;
      }

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
         VALUES ($1, 'LEAVE_REQUEST', $2, 'erp_leave_requests', $3, $4, $5, $6, $7) RETURNING id`,
        [
          reqNo,
          ruleId,
          data.id,
          Number(employeeId),
          `[${typeLabel}] ${startDate} ~ ${endDate} (${deductionSummary})`,
          {
            휴가구분: typeLabel,
            휴가기간: startDate === endDate ? startDate : `${startDate} ~ ${endDate} (${durationDays}일)`,
            연차차감: isNonDeducting ? "0일 (미차감)" : `${parsedDeductedDays}일 차감`,
            신청사유: reason.trim(),
            leaveType: normalizedType,
            startDate,
            endDate,
            deductedDays: parsedDeductedDays,
            durationDays,
            reason: reason.trim(),
          },
          initialStatus,
        ]
      );
      if (reqRes.rows.length > 0) {
        await pool.query(
          `INSERT INTO erp_approval_steps (request_id, step_order, approver_id, status, comment, acted_at)
           VALUES ($1, 1, $2, $3, $4, $5)`,
          [
            reqRes.rows[0].id,
            approverId,
            initialStatus,
            autoApprove ? "부서장 전결 (자동승인)" : null,
            autoApprove ? nowIso : null,
          ]
        );
      }
    } catch (apprErr) {
      console.warn("연차 결재요청 자동등록 실패:", apprErr);
    }

    return NextResponse.json({
      success: true,
      leave: data,
      approverId,
      approverName,
      autoApproved: autoApprove,
    });
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
      reject_reason: action === "REJECT" ? rejectReason || "결재자 반려" : null,
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
