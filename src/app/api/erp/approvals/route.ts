export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import {
  getEffectiveApprovalRank,
  isCeoEmployee,
  isDepartmentHeadEmployee,
  validateApprovalLineNoInversion,
} from "@/lib/erpApprovalLine";
import {
  loadOrgApprovalContext,
  resolveServerDepartmentHeadApprover,
} from "@/lib/erpApprovalServer";

function formatDotDate(d = new Date()): string {
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// GET: 내결재함 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status") || "PENDING"; // PENDING, APPROVED, REJECTED, ALL

    const pool = getErpPool();

    let query = `
      SELECT 
        r.id,
        COALESCE(r.rule_id, ar.id) as "ruleId",
        COALESCE(ar.event_type, r.event_type, 'GENERAL') as "eventType",
        COALESCE(ar.event_name, r.event_type, '결재문서') as "eventName",
        COALESCE(ar.category, '일반') as "category",
        LEAST(COALESCE(ar.required_tier, 4), 4) as "requiredTier",
        r.target_table as "targetTable",
        r.target_id as "targetId",
        r.requester_id as "requesterId",
        COALESCE(req.name, '임직원') as "requesterName",
        COALESCE(req.department, '경영총괄') as "requesterDept",
        req.duty as "requesterDuty",
        req.position as "requesterPosition",
        COALESCE(req.tier_level, 0) as "requesterTier",
        r.title,
        r.payload,
        r.status,
        r.created_at as "createdAt",
        s.id as "stepId",
        s.step_order as "stepOrder",
        s.approver_id as "approverId",
        appr.name as "approverName",
        appr.duty as "approverDuty",
        appr.position as "approverPosition",
        COALESCE(appr.tier_level, 0) as "approverTier",
        s.status as "stepStatus",
        s.comment,
        s.acted_at as "actedAt"
      FROM erp_approval_requests r
      LEFT JOIN erp_approval_rules ar ON (r.rule_id = ar.id OR (r.rule_id IS NULL AND r.event_type = ar.event_type))
      LEFT JOIN erp_employees req ON r.requester_id = req.id
      LEFT JOIN erp_approval_steps s ON s.request_id = r.id
      LEFT JOIN erp_employees appr ON s.approver_id = appr.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      conditions.push(`(s.approver_id = $${params.length} OR r.requester_id = $${params.length})`);
    }

    if (status !== "ALL") {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY r.created_at DESC, s.step_order ASC`;

    const result = await pool.query(query, params);

    // Group steps by request
    const requestMap: Record<number, any> = {};
    for (const row of result.rows) {
      if (!requestMap[row.id]) {
        requestMap[row.id] = {
          id: row.id,
          ruleId: row.ruleId,
          eventType: row.eventType,
          eventName: row.eventName,
          category: row.category,
          requiredTier: row.requiredTier,
          targetTable: row.targetTable,
          targetId: row.targetId,
          requesterId: row.requesterId,
          requesterName: row.requesterName,
          requesterDept: row.requesterDept,
          requesterDuty: row.requesterDuty,
          requesterPosition: row.requesterPosition,
          requesterTier: row.requesterTier,
          title: row.title,
          payload: row.payload,
          status: row.status,
          createdAt: row.createdAt,
          steps: [],
        };
      }
      if (row.stepId) {
        requestMap[row.id].steps.push({
          stepId: row.stepId,
          stepOrder: row.stepOrder,
          approverId: row.approverId,
          approverName: row.approverName,
          approverDuty: row.approverDuty,
          approverPosition: row.approverPosition,
          approverTier: row.approverTier,
          status: row.stepStatus,
          comment: row.comment,
          actedAt: row.actedAt,
        });
      }
    }

    return NextResponse.json({ success: true, requests: Object.values(requestMap) });
  } catch (error: any) {
    console.error("GET Approvals Error:", error);
    return NextResponse.json({ error: "결재함 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: 신규 결재 요청 제출 (전사 부서장 전결 · 대표이사 배정 제외 · 결재선 역전 검증)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ruleEventType, targetTable, targetId, requesterId, title, payload, approverId } = body;

    if (!ruleEventType || !requesterId || !title) {
      return NextResponse.json({ error: "필수 결재 요청 정보가 누락되었습니다." }, { status: 400 });
    }

    const pool = getErpPool();

    // 1. Find rule
    const ruleRes = await pool.query(
      `SELECT id, required_tier FROM erp_approval_rules WHERE event_type = $1 LIMIT 1`,
      [ruleEventType]
    );

    if (ruleRes.rows.length === 0) {
      return NextResponse.json({ error: "해당 결재선 규칙이 존재하지 않습니다." }, { status: 404 });
    }

    const rule = ruleRes.rows[0];
    const ctx = await loadOrgApprovalContext(pool);
    const requesterEmp = ctx.allEmployees.find((e) => Number(e.id) === Number(requesterId)) || null;
    if (!requesterEmp) {
      return NextResponse.json({ error: "기안자 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    let assignedApproverId: number;
    let autoApprove = false;

    if (approverId) {
      const explicitApprover = ctx.employees.find((e) => Number(e.id) === Number(approverId)) || null;
      if (!explicitApprover) {
        return NextResponse.json(
          { error: "지정된 결재자는 재직 중인 임직원이 아닙니다." },
          { status: 400 }
        );
      }

      const check = validateApprovalLineNoInversion({
        author: requesterEmp,
        approver: explicitApprover,
        departments: ctx.departments,
      });
      if (!check.valid) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }

      assignedApproverId = Number(explicitApprover.id);
      autoApprove = assignedApproverId === Number(requesterId) || isCeoEmployee(requesterEmp);
    } else {
      const resolved = await resolveServerDepartmentHeadApprover(pool, Number(requesterId));
      assignedApproverId = resolved.approverId;
      autoApprove = resolved.autoApprove;
    }

    // 2. Insert request
    const reqNo = `APPR-${Date.now()}`;
    const initialStatus = autoApprove ? "APPROVED" : "PENDING";
    const reqRes = await pool.query(
      `INSERT INTO erp_approval_requests (request_no, event_type, rule_id, target_table, target_id, requester_id, title, payload, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, status, created_at as "createdAt"`,
      [reqNo, ruleEventType, rule.id, targetTable || null, targetId || null, requesterId, title, payload || {}, initialStatus]
    );

    const newRequest = reqRes.rows[0];

    // 3. Insert step (부서장 전결 기준 배정, 대표이사 미배정)
    await pool.query(
      `INSERT INTO erp_approval_steps (request_id, step_order, approver_id, status, comment, acted_at)
       VALUES ($1, 1, $2, $3, $4, $5)`,
      [
        newRequest.id,
        assignedApproverId,
        initialStatus,
        autoApprove
          ? isCeoEmployee(requesterEmp)
            ? "대표 본인 전결 (자동승인)"
            : "부서장 전결 (자동승인)"
          : null,
        autoApprove ? new Date().toISOString() : null,
      ]
    );

    return NextResponse.json({
      success: true,
      request: newRequest,
      approverId: assignedApproverId,
      autoApproved: autoApprove,
    });
  } catch (error: any) {
    console.error("POST Approval Error:", error);
    return NextResponse.json({ error: "결재 요청 생성 실패: " + error.message }, { status: 500 });
  }
}

// PATCH: 결재 승인 또는 반려 처리 (단계별 순차 결재 · 대표이사 결재 차단 · 하급자 월권 최종승인 차단)
export async function PATCH(request: Request) {
  try {
    const { requestId, stepId, action, approverId, comment } = await request.json();

    if (!requestId || !action || !approverId) {
      return NextResponse.json(
        { error: "결재 ID, 처리 구분(APPROVE/REJECT), 결재자 ID는 필수입니다." },
        { status: 400 }
      );
    }
    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "유효하지 않은 결재 처리 구분입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const ctx = await loadOrgApprovalContext(pool);
    const actorEmp = ctx.employees.find((e) => Number(e.id) === Number(approverId)) || null;
    if (!actorEmp) {
      return NextResponse.json(
        { error: "결재 처리자 정보를 재직 사원 목록에서 찾을 수 없습니다." },
        { status: 403 }
      );
    }

    if (isCeoEmployee(actorEmp)) {
      return NextResponse.json(
        { error: "대표이사는 결재 제외 대상입니다. 모든 결재는 소속 부서장 전결로 처리됩니다." },
        { status: 403 }
      );
    }

    const reqInfoRes = await pool.query(
      `SELECT id, event_type, target_table, target_id, requester_id, status
       FROM erp_approval_requests
       WHERE id = $1 LIMIT 1`,
      [Number(requestId)]
    );
    if (reqInfoRes.rows.length === 0) {
      return NextResponse.json({ error: "결재 문서를 찾을 수 없습니다." }, { status: 404 });
    }
    const reqRow = reqInfoRes.rows[0];

    const stepsRes = await pool.query(
      `SELECT s.id, s.step_order, s.approver_id, s.status, s.comment
       FROM erp_approval_steps s
       WHERE s.request_id = $1
       ORDER BY s.step_order ASC, s.id ASC`,
      [Number(requestId)]
    );
    const steps: Array<{
      id: number;
      step_order: number;
      approver_id: number | null;
      status: string;
      comment: string | null;
    }> = stepsRes.rows;

    if (steps.length === 0) {
      return NextResponse.json({ error: "결재 단계 정보가 존재하지 않습니다." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const isApprove = action === "APPROVE";
    const nextStepStatus = isApprove ? "APPROVED" : "REJECTED";
    const pendingSteps = steps.filter((s) => s.status === "PENDING");
    const currentPendingStep = pendingSteps[0] || steps[steps.length - 1];
    const finalStep = steps[steps.length - 1];

    const finalApproverEmp =
      finalStep.approver_id != null
        ? ctx.allEmployees.find((e) => Number(e.id) === Number(finalStep.approver_id)) || null
        : null;
    const actorIsDeptHead = isDepartmentHeadEmployee(actorEmp, ctx.departments);
    const actorIsFinalStepApprover =
      finalStep.approver_id != null && Number(finalStep.approver_id) === Number(actorEmp.id);
    const actorCanExerciseDeptHeadFinal =
      actorIsFinalStepApprover ||
      (actorIsDeptHead &&
        Number(reqRow.requester_id) !== Number(actorEmp.id) &&
        getEffectiveApprovalRank(actorEmp) >= getEffectiveApprovalRank(finalApproverEmp));

    const requestedStep = stepId
      ? steps.find((s) => Number(s.id) === Number(stepId))
      : actorCanExerciseDeptHeadFinal
      ? finalStep
      : currentPendingStep;
    if (!requestedStep) {
      return NextResponse.json({ error: "대상 결재 단계를 찾을 수 없습니다." }, { status: 404 });
    }

    const actorIsAssignedStepApprover =
      requestedStep.approver_id != null && Number(requestedStep.approver_id) === Number(actorEmp.id);

    // 자기 자신이 기안한 문서를 타인 단계처럼 대리 승인 금지 (단, 본인 전결 최종 단계 예외)
    if (
      Number(reqRow.requester_id) === Number(actorEmp.id) &&
      !(actorIsDeptHead && actorIsFinalStepApprover)
    ) {
      return NextResponse.json(
        { error: "본인이 기안한 결재 문서는 직접 승인/반려할 수 없습니다." },
        { status: 403 }
      );
    }

    // 선행 단계 미완료 시 중간 검토자가 상위 단계로 건너뛰는 순서 역전 차단
    if (
      !actorCanExerciseDeptHeadFinal &&
      Number(requestedStep.step_order) > Number(currentPendingStep.step_order)
    ) {
      return NextResponse.json(
        { error: "결재 순서 오류: 선행 검토 단계가 완료된 후 다음 결재를 진행할 수 있습니다." },
        { status: 403 }
      );
    }

    if (!actorIsAssignedStepApprover && !actorCanExerciseDeptHeadFinal) {
      return NextResponse.json(
        { error: "결재 권한이 없습니다. 지정된 결재자 또는 소속 부서장만 처리할 수 있습니다." },
        { status: 403 }
      );
    }

    // 부서장 전결로 최종 단계(혹은 단일 단계)를 마감하는지, 아니면 1단계 중간 검토만 처리하는지 판별
    const isFinalDecision =
      steps.length === 1 ||
      Number(requestedStep.id) === Number(finalStep.id) ||
      actorCanExerciseDeptHeadFinal;

    const effectiveApproverForRecord =
      requestedStep.approver_id &&
      !isCeoEmployee(ctx.allEmployees.find((e) => Number(e.id) === Number(requestedStep.approver_id)))
        ? Number(requestedStep.approver_id)
        : actorEmp.id;

    if (!isFinalDecision) {
      // 1단계 중간 검토만 처리: 2단계 부서장 스텝 및 요청 상태는 최종 승인으로 건너뛰지 않음
      await pool.query(
        `UPDATE erp_approval_steps
         SET status = $1, comment = $2, acted_at = $3
         WHERE id = $4`,
        [nextStepStatus, comment || null, now, requestedStep.id]
      );

      if (!isApprove) {
        await pool.query(`UPDATE erp_approval_requests SET status = 'REJECTED' WHERE id = $1`, [
          Number(requestId),
        ]);
      }

      if (reqRow.target_table === "erp_work_improvements" && reqRow.target_id) {
        const dateFmt = formatDotDate();
        await pool.query(
          `UPDATE erp_work_improvements
           SET status_reviewer = $1,
               date_reviewer = $2,
               comment_reviewer = COALESCE($3, comment_reviewer),
               overall_status = $4,
               updated_at = $5
           WHERE id = $6`,
          [
            isApprove ? "검토완료" : "보완요청",
            dateFmt,
            comment || null,
            isApprove ? "REVIEWED" : "SUPPLEMENT",
            now,
            reqRow.target_id,
          ]
        );
      }

      return NextResponse.json({
        success: true,
        message: isApprove
          ? "1단계 검토가 완료되어 부서장 결재 단계로 이관되었습니다."
          : "검토 단계에서 보완/반려 요청되었습니다.",
      });
    }

    // 최종 단계 처리 (단일 단계 또는 부서장 전결)
    if (isApprove && steps.length > 1) {
      // 선행 PENDING 검토 단계가 남아 있는 경우 원 검토자의 approver_id를 보존한 채 부서장 전결 마감
      await pool.query(
        `UPDATE erp_approval_steps
         SET status = 'APPROVED',
             comment = COALESCE(comment, '부서장 전결'),
             acted_at = COALESCE(acted_at, $1)
         WHERE request_id = $2 AND id <> $3 AND status = 'PENDING'`,
        [now, Number(requestId), finalStep.id]
      );
    }

    const finalStepApproverToKeep =
      finalStep.approver_id &&
      !isCeoEmployee(ctx.allEmployees.find((e) => Number(e.id) === Number(finalStep.approver_id)))
        ? Number(finalStep.approver_id)
        : Number(actorEmp.id);

    await pool.query(
      `UPDATE erp_approval_steps
       SET status = $1, comment = $2, acted_at = $3, approver_id = $4
       WHERE id = $5`,
      [nextStepStatus, comment || null, now, finalStepApproverToKeep, finalStep.id]
    );

    const reqRes = await pool.query(
      `UPDATE erp_approval_requests
       SET status = $1
       WHERE id = $2
       RETURNING target_table, target_id`,
      [nextStepStatus, Number(requestId)]
    );

    const resolvedEntityApproverId = finalStepApproverToKeep || Number(effectiveApproverForRecord);

    // 3. Cascade update to underlying business entity if exists
    if (reqRes.rows.length > 0) {
      const { target_table, target_id } = reqRes.rows[0];
      if (target_table && target_id) {
        if (target_table === "erp_leave_requests") {
          await pool.query(
            `UPDATE erp_leave_requests 
             SET status = $1, approver_id = $2, approved_at = $3, reject_reason = $4 
             WHERE id = $5`,
            [
              nextStepStatus,
              resolvedEntityApproverId,
              now,
              isApprove ? null : comment || "결재 반려",
              target_id,
            ]
          );
        } else if (target_table === "erp_overtimes") {
          await pool.query(
            `UPDATE erp_overtimes 
             SET status = $1, approver_id = $2, approved_at = $3, memo = $4 
             WHERE id = $5`,
            [nextStepStatus, resolvedEntityApproverId, now, comment || null, target_id]
          );
        } else if (target_table === "erp_payroll_records") {
          await pool.query(
            `UPDATE erp_payroll_records 
             SET status = $1, updated_at = $2 
             WHERE id = $3`,
            [nextStepStatus, now, target_id]
          );
        } else if (target_table === "erp_work_improvements") {
          const dateFmt = formatDotDate();
          const statusApprover = isApprove ? "최종승인" : "반려";
          await pool.query(
            `UPDATE erp_work_improvements
             SET overall_status = $1,
                 status_approver = $2,
                 date_approver = $3,
                 comment_approver = COALESCE($4, comment_approver),
                 status_reviewer = CASE
                   WHEN $5 = true AND status_reviewer IN ('대기중', '보완요청') THEN '검토완료'
                   ELSE status_reviewer
                 END,
                 date_reviewer = CASE
                   WHEN $5 = true AND status_reviewer IN ('대기중', '보완요청') THEN $3
                   ELSE date_reviewer
                 END,
                 updated_at = $6
             WHERE id = $7`,
            [
              nextStepStatus,
              statusApprover,
              dateFmt,
              comment || null,
              isApprove,
              now,
              target_id,
            ]
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `결재가 ${isApprove ? "최종 승인" : "반려"} 처리되었습니다.`,
    });
  } catch (error: any) {
    console.error("PATCH Approval Error:", error);
    return NextResponse.json({ error: "결재 처리 실패: " + error.message }, { status: 500 });
  }
}
