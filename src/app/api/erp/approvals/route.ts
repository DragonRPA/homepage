import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

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
        COALESCE(ar.required_tier, 2) as "requiredTier",
        r.target_table as "targetTable",
        r.target_id as "targetId",
        r.requester_id as "requesterId",
        COALESCE(req.name, '임직원') as "requesterName",
        COALESCE(req.department, '경영총괄') as "requesterDept",
        req.duty as "requesterDuty",
        r.title,
        r.payload,
        r.status,
        r.created_at as "createdAt",
        s.id as "stepId",
        s.step_order as "stepOrder",
        s.approver_id as "approverId",
        appr.name as "approverName",
        appr.duty as "approverDuty",
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

// POST: 신규 결재 요청 제출
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

    // 2. Insert request
    const reqNo = `APPR-${Date.now()}`;
    const reqRes = await pool.query(
      `INSERT INTO erp_approval_requests (request_no, event_type, rule_id, target_table, target_id, requester_id, title, payload, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
       RETURNING id, title, status, created_at as "createdAt"`,
      [reqNo, ruleEventType, rule.id, targetTable || null, targetId || null, requesterId, title, payload || {}]
    );

    const newRequest = reqRes.rows[0];

    // 3. Insert step (assign approver: if not provided, assign super admin)
    let assignedApprover = approverId;
    if (!assignedApprover) {
      const adminRes = await pool.query(
        `SELECT id FROM erp_employees WHERE tier_level >= $1 AND employment_status = 'ACTIVE' ORDER BY tier_level DESC LIMIT 1`,
        [rule.required_tier]
      );
      if (adminRes.rows.length > 0) {
        assignedApprover = adminRes.rows[0].id;
      } else {
        assignedApprover = requesterId;
      }
    }

    await pool.query(
      `INSERT INTO erp_approval_steps (request_id, step_order, approver_id, status)
       VALUES ($1, 1, $2, 'PENDING')`,
      [newRequest.id, assignedApprover]
    );

    return NextResponse.json({ success: true, request: newRequest });
  } catch (error: any) {
    console.error("POST Approval Error:", error);
    return NextResponse.json({ error: "결재 요청 생성 실패: " + error.message }, { status: 500 });
  }
}

// PATCH: 결재 승인 또는 반려 처리
export async function PATCH(request: Request) {
  try {
    const { requestId, stepId, action, approverId, comment } = await request.json();

    if (!requestId || !action || !approverId) {
      return NextResponse.json({ error: "결재 ID, 처리 구분(APPROVE/REJECT), 결재자 ID는 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const now = new Date().toISOString();
    const isApprove = action === "APPROVE";
    const nextStatus = isApprove ? "APPROVED" : "REJECTED";

    // 1. Update step
    if (stepId) {
      await pool.query(
        `UPDATE erp_approval_steps 
         SET status = $1, comment = $2, acted_at = $3 
         WHERE id = $4 AND approver_id = $5`,
        [nextStatus, comment || null, now, stepId, approverId]
      );
    } else {
      await pool.query(
        `UPDATE erp_approval_steps 
         SET status = $1, comment = $2, acted_at = $3 
         WHERE request_id = $4 AND approver_id = $5 AND status = 'PENDING'`,
        [nextStatus, comment || null, now, requestId, approverId]
      );
    }

    // 2. Update request
    const reqRes = await pool.query(
      `UPDATE erp_approval_requests 
       SET status = $1 
       WHERE id = $2 
       RETURNING target_table, target_id`,
      [nextStatus, requestId]
    );

    // 3. Cascade update to underlying business entity if exists
    if (reqRes.rows.length > 0) {
      const { target_table, target_id } = reqRes.rows[0];
      if (target_table && target_id) {
        if (target_table === "erp_leave_requests") {
          await pool.query(
            `UPDATE erp_leave_requests 
             SET status = $1, approver_id = $2, approved_at = $3, reject_reason = $4 
             WHERE id = $5`,
            [nextStatus, approverId, now, isApprove ? null : (comment || "결재 반려"), target_id]
          );
        } else if (target_table === "erp_overtimes") {
          await pool.query(
            `UPDATE erp_overtimes 
             SET status = $1, approver_id = $2, approved_at = $3, memo = $4 
             WHERE id = $5`,
            [nextStatus, approverId, now, comment || null, target_id]
          );
        } else if (target_table === "erp_payroll_records") {
          await pool.query(
            `UPDATE erp_payroll_records 
             SET status = $1, updated_at = $2 
             WHERE id = $3`,
            [nextStatus, now, target_id]
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `결재가 ${isApprove ? "승인" : "반려"} 처리되었습니다.`,
    });
  } catch (error: any) {
    console.error("PATCH Approval Error:", error);
    return NextResponse.json({ error: "결재 처리 실패: " + error.message }, { status: 500 });
  }
}
