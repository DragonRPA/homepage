export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { runSchemaInitOnce } from "@/lib/erpSchemaCache";
import {
  getEffectiveApprovalRank,
  isCeoEmployee,
  isDepartmentHeadEmployee,
} from "@/lib/erpApprovalLine";
import {
  loadOrgApprovalContext,
  resolveAndValidateServerWorkImprovementLine,
} from "@/lib/erpApprovalServer";

function formatDotDate(d = new Date()): string {
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

async function ensureWorkImprovementsTable() {
  await runSchemaInitOnce("erp_work_improvements_schema_v2", async () => {
    const pool = getErpPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_work_improvements (
        id SERIAL PRIMARY KEY,
        report_no VARCHAR(50) UNIQUE NOT NULL,
        summary_target TEXT NOT NULL,
        summary_date VARCHAR(20) NOT NULL,
        department VARCHAR(100) NOT NULL DEFAULT '현장개선팀',
        improve_types JSONB NOT NULL DEFAULT '[]'::jsonb,
        author_id INTEGER,
        role_author VARCHAR(50) NOT NULL DEFAULT '담당',
        name_author VARCHAR(100) NOT NULL DEFAULT '',
        reviewer_id INTEGER,
        role_reviewer VARCHAR(50) NOT NULL DEFAULT '팀장',
        name_reviewer VARCHAR(100) NOT NULL DEFAULT '',
        status_reviewer VARCHAR(30) NOT NULL DEFAULT '대기중',
        date_reviewer VARCHAR(30) NOT NULL DEFAULT '',
        comment_reviewer TEXT NOT NULL DEFAULT '',
        approver_id INTEGER,
        role_approver VARCHAR(50) NOT NULL DEFAULT '부서장',
        name_approver VARCHAR(100) NOT NULL DEFAULT '',
        status_approver VARCHAR(30) NOT NULL DEFAULT '대기중',
        date_approver VARCHAR(30) NOT NULL DEFAULT '',
        comment_approver TEXT NOT NULL DEFAULT '',
        numbered_items JSONB NOT NULL DEFAULT '{}'::jsonb,
        photos JSONB NOT NULL DEFAULT '[]'::jsonb,
        attached_files JSONB NOT NULL DEFAULT '[]'::jsonb,
        overall_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        approval_request_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      ALTER TABLE erp_work_improvements ENABLE ROW LEVEL SECURITY;
    `);

    // 결재선 규칙(WORK_IMPROVEMENT) 자동 시딩 (전사 부서장 전결 · 대표이사 결재 제외)
    await pool.query(`
      INSERT INTO erp_approval_rules (event_type, event_name, category, required_tier, description)
      VALUES ('WORK_IMPROVEMENT', '업무개선활동 보고서', '업무개선', 4, '소속 부서장 전결 (대표이사 결재 제외)')
      ON CONFLICT (event_type) DO UPDATE SET description = '소속 부서장 전결 (대표이사 결재 제외)', required_tier = 4;
    `);
  });
}

function computeOverallStatus(
  statusReviewer: string,
  statusApprover: string,
  requestedSubmit?: boolean,
  currentOverall?: string
): string {
  if (statusApprover === "최종승인") return "APPROVED";
  if (statusApprover === "반려") return "REJECTED";
  if (statusReviewer === "보완요청") return "SUPPLEMENT";
  if (statusReviewer === "검토완료") return "REVIEWED";
  if (requestedSubmit) return "PENDING";
  if (currentOverall && currentOverall !== "DRAFT") return currentOverall;
  return "PENDING";
}

function mapReviewerStepStatus(statusReviewer: string): "APPROVED" | "REJECTED" | "PENDING" {
  if (statusReviewer === "검토완료") return "APPROVED";
  if (statusReviewer === "보완요청") return "REJECTED";
  return "PENDING";
}

function mapApproverStepStatus(statusApprover: string): "APPROVED" | "REJECTED" | "PENDING" {
  if (statusApprover === "최종승인") return "APPROVED";
  if (statusApprover === "반려") return "REJECTED";
  return "PENDING";
}

function mapRowToReport(row: any) {
  return {
    id: row.id,
    reportNo: row.report_no,
    summaryTarget: row.summary_target || "",
    summaryDate: row.summary_date || "",
    department: row.department || "",
    improveTypes: Array.isArray(row.improve_types) ? row.improve_types : [],
    authorId: row.author_id,
    roleAuthor: row.role_author || "담당",
    nameAuthor: row.name_author || "",
    reviewerId: row.reviewer_id,
    roleReviewer: row.role_reviewer || "팀장",
    nameReviewer: row.name_reviewer || "",
    statusReviewer: row.status_reviewer || "대기중",
    dateReviewer: row.date_reviewer || "",
    commentReviewer: row.comment_reviewer || "",
    approverId: row.approver_id,
    roleApprover: row.role_approver || "부서장",
    nameApprover: row.name_approver || "",
    statusApprover: row.status_approver || "대기중",
    dateApprover: row.date_approver || "",
    commentApprover: row.comment_approver || "",
    numberedItems: row.numbered_items || {
      currentProcGroup: [""],
      issueGroup: [""],
      solutionGroup: [""],
      quantGroup: [""],
      qualGroup: [""],
      budgetGroup: [""],
    },
    photos: Array.isArray(row.photos) ? row.photos : [],
    attachedFiles: Array.isArray(row.attached_files) ? row.attached_files : [],
    overallStatus: row.overall_status || "PENDING",
    approvalRequestId: row.approval_request_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildStepDefinitions(row: any): Array<{
  stepOrder: number;
  approverId: number;
  status: "APPROVED" | "REJECTED" | "PENDING";
  comment: string | null;
}> {
  const revId = row.reviewer_id ? Number(row.reviewer_id) : null;
  const appId = row.approver_id ? Number(row.approver_id) : null;
  const authId = row.author_id ? Number(row.author_id) : null;
  const steps: Array<{
    stepOrder: number;
    approverId: number;
    status: "APPROVED" | "REJECTED" | "PENDING";
    comment: string | null;
  }> = [];

  const revSt = mapReviewerStepStatus(row.status_reviewer);
  const appSt = mapApproverStepStatus(row.status_approver);

  if (revId && appId && revId !== appId && revId !== authId) {
    steps.push({
      stepOrder: 1,
      approverId: revId,
      status: appSt === "APPROVED" && revSt === "PENDING" ? "APPROVED" : revSt,
      comment:
        row.comment_reviewer ||
        (appSt === "APPROVED" && revSt === "PENDING" ? "부서장 전결" : null),
    });
    steps.push({
      stepOrder: 2,
      approverId: appId,
      status: appSt,
      comment: row.comment_approver || null,
    });
  } else if (appId || revId) {
    steps.push({
      stepOrder: 1,
      approverId: (appId || revId) as number,
      status: appSt !== "PENDING" ? appSt : revSt,
      comment: row.comment_approver || row.comment_reviewer || null,
    });
  }

  return steps;
}

/**
 * 업무개선 보고서와 erp_approval_requests / erp_approval_steps 를 생성 또는 단계별 동기화한다.
 * 임시저장(approval_request_id = null) 상태에서 본상신 전환 시 누락 없이 결재 요청을 생성한다.
 */
async function syncWorkImprovementApprovalRequest(pool: any, row: any): Promise<any> {
  const reqStatus =
    row.overall_status === "APPROVED"
      ? "APPROVED"
      : row.overall_status === "REJECTED"
      ? "REJECTED"
      : "PENDING";

  const payloadSummary = {
    문서번호: row.report_no,
    개선대상: row.summary_target,
    작성일자: row.summary_date,
    작성부서: row.department,
    작성자: `${row.name_author || "담당자"} (${row.role_author || "담당"})`,
    개선유형: Array.isArray(row.improve_types) ? row.improve_types.join(", ") : "",
    검토자: `${row.name_reviewer || "-"} (${row.status_reviewer})`,
    검토의견: row.comment_reviewer || "-",
    승인자: `${row.name_approver || "-"} (${row.status_approver})`,
    승인의견: row.comment_approver || "-",
  };

  let approvalRequestId = row.approval_request_id ? Number(row.approval_request_id) : null;
  const nowIso = new Date().toISOString();
  const desiredSteps = buildStepDefinitions(row);

  if (!approvalRequestId) {
    const ruleRes = await pool.query(
      `SELECT id FROM erp_approval_rules WHERE event_type = 'WORK_IMPROVEMENT' LIMIT 1`
    );
    const ruleId = ruleRes.rows[0]?.id || null;
    const reqNo = `APPR-WIR-${Date.now()}-${row.id}`;
    const fallbackCtx = await loadOrgApprovalContext(pool);
    const defaultRequester =
      fallbackCtx.employees.find((e) => !isCeoEmployee(e))?.id || 1;
    const requesterEmpId = row.author_id ? Number(row.author_id) : Number(defaultRequester);

    const apprReqRes = await pool.query(
      `INSERT INTO erp_approval_requests (
        request_no, event_type, rule_id, target_table, target_id, requester_id, title, payload, status
      ) VALUES ($1, 'WORK_IMPROVEMENT', $2, 'erp_work_improvements', $3, $4, $5, $6::jsonb, $7)
      RETURNING id`,
      [
        reqNo,
        ruleId,
        row.id,
        requesterEmpId,
        `[업무개선] ${String(row.summary_target).trim()}`,
        JSON.stringify(payloadSummary),
        reqStatus,
      ]
    );

    approvalRequestId = Number(apprReqRes.rows[0].id);

    for (const st of desiredSteps) {
      await pool.query(
        `INSERT INTO erp_approval_steps (request_id, step_order, approver_id, status, comment, acted_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          approvalRequestId,
          st.stepOrder,
          st.approverId,
          st.status,
          st.comment,
          st.status !== "PENDING" ? nowIso : null,
        ]
      );
    }

    const updRes = await pool.query(
      `UPDATE erp_work_improvements SET approval_request_id = $1 WHERE id = $2 RETURNING *`,
      [approvalRequestId, row.id]
    );
    return updRes.rows[0];
  }

  await pool.query(
    `UPDATE erp_approval_requests
     SET title = $1, payload = $2::jsonb, status = $3
     WHERE id = $4`,
    [
      `[업무개선] ${row.summary_target}`,
      JSON.stringify(payloadSummary),
      reqStatus,
      approvalRequestId,
    ]
  );

  // 기존 steps 조회 후 결재선/단계별 상태 동기화
  const existingStepsRes = await pool.query(
    `SELECT id, step_order, approver_id, status FROM erp_approval_steps WHERE request_id = $1 ORDER BY step_order ASC, id ASC`,
    [approvalRequestId]
  );
  const existingSteps = existingStepsRes.rows;

  const sameStructure =
    existingSteps.length === desiredSteps.length &&
    desiredSteps.every(
      (ds, idx) =>
        Number(existingSteps[idx]?.approver_id) === Number(ds.approverId) &&
        Number(existingSteps[idx]?.step_order) === Number(ds.stepOrder)
    );

  if (!sameStructure) {
    await pool.query(`DELETE FROM erp_approval_steps WHERE request_id = $1`, [approvalRequestId]);
    for (const st of desiredSteps) {
      await pool.query(
        `INSERT INTO erp_approval_steps (request_id, step_order, approver_id, status, comment, acted_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          approvalRequestId,
          st.stepOrder,
          st.approverId,
          st.status,
          st.comment,
          st.status !== "PENDING" ? nowIso : null,
        ]
      );
    }
  } else {
    for (let i = 0; i < desiredSteps.length; i++) {
      const ds = desiredSteps[i];
      const ex = existingSteps[i];
      await pool.query(
        `UPDATE erp_approval_steps
         SET status = $1,
             comment = COALESCE($2, comment),
             acted_at = CASE WHEN $1 = 'PENDING' THEN NULL ELSE COALESCE(acted_at, $3) END
         WHERE id = $4`,
        [ds.status, ds.comment, nowIso, ex.id]
      );
    }
  }

  return row;
}

// GET: 업무개선활동 보고서 목록 또는 단건 조회 + 사원/부서 목록 반환
export async function GET(request: Request) {
  try {
    await ensureWorkImprovementsTable();
    const pool = getErpPool();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    if (id) {
      const singleRes = await pool.query(
        `SELECT * FROM erp_work_improvements WHERE id = $1 LIMIT 1`,
        [Number(id)]
      );
      if (singleRes.rows.length === 0) {
        return NextResponse.json({ error: "보고서를 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        report: mapRowToReport(singleRes.rows[0]),
      });
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (status && status !== "ALL") {
      params.push(status);
      conditions.push(`overall_status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(
        `(summary_target ILIKE $${params.length} OR name_author ILIKE $${params.length} OR department ILIKE $${params.length} OR report_no ILIKE $${params.length})`
      );
    }

    let query = `SELECT * FROM erp_work_improvements`;
    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }
    query += ` ORDER BY id DESC`;

    const [reportsRes, empRes, deptRes] = await Promise.all([
      pool.query(query, params),
      pool.query(
        `SELECT id, employee_no as "employeeNo", name, department, department_id as "departmentId",
                position, duty, role, role_code as "roleCode", tier_level as "tierLevel"
         FROM erp_employees
         WHERE employment_status = 'ACTIVE'
         ORDER BY tier_level DESC, id ASC`
      ),
      pool.query(
        `SELECT id, dept_name as "deptName", manager_name as "managerName"
         FROM erp_departments
         ORDER BY sort_order ASC, id ASC`
      ),
    ]);

    return NextResponse.json({
      success: true,
      reports: reportsRes.rows.map(mapRowToReport),
      employees: empRes.rows,
      departments: deptRes.rows,
    });
  } catch (error: any) {
    console.error("GET Work Improvements Error:", error);
    return NextResponse.json(
      { error: "업무개선활동 보고서 조회 실패: " + error.message },
      { status: 500 }
    );
  }
}

// POST: 신규 업무개선활동 보고서 생성 및 결재함 연동
export async function POST(request: Request) {
  try {
    await ensureWorkImprovementsTable();
    const pool = getErpPool();
    const body = await request.json();

    const {
      summaryTarget,
      summaryDate,
      department,
      improveTypes,
      authorId,
      roleAuthor,
      nameAuthor,
      reviewerId,
      roleReviewer,
      nameReviewer,
      statusReviewer,
      dateReviewer,
      commentReviewer,
      approverId,
      roleApprover,
      nameApprover,
      statusApprover,
      dateApprover,
      commentApprover,
      numberedItems,
      photos,
      attachedFiles,
      submitApproval,
    } = body;

    if (!summaryTarget || !String(summaryTarget).trim()) {
      return NextResponse.json(
        { error: "개선 대상 업무명(1-가. 대상)을 입력해주세요." },
        { status: 400 }
      );
    }

    const lineRes = await resolveAndValidateServerWorkImprovementLine(pool, {
      authorId,
      nameAuthor,
      roleAuthor,
      reviewerId,
      nameReviewer,
      roleReviewer,
      approverId,
      nameApprover,
      roleApprover,
    });

    if (!lineRes.valid) {
      return NextResponse.json({ error: lineRes.error }, { status: 400 });
    }

    const nowDateStr = new Date().toISOString().slice(0, 10);
    const todayDot = formatDotDate();
    const reportNo = `WIR-${nowDateStr.replace(/-/g, "")}-${String(Date.now()).slice(-4)}`;

    const isSubmitting = submitApproval !== false;
    let stRev = statusReviewer || "대기중";
    let stApp = statusApprover || "대기중";
    let dtRev = dateReviewer || "";
    let dtApp = dateApprover || "";
    let cmApp = commentApprover || "";

    // 부서장 본인 또는 대표이사 본인 상신 시 즉시 전결 완결
    if (isSubmitting && lineRes.autoApprove) {
      stRev = "검토완료";
      stApp = "최종승인";
      dtRev = dtRev || todayDot;
      dtApp = dtApp || todayDot;
      if (!cmApp) {
        cmApp = lineRes.authorId === 1 || /대표/.test(lineRes.roleAuthor)
          ? "대표 본인 전결"
          : "부서장 전결";
      }
    }

    // 단계 순서 역전 방지: 검토 대기중 상태에서 단독 최종승인 시 검토완료 자동 동기화
    if (stApp === "최종승인" && stRev === "대기중") {
      stRev = "검토완료";
      dtRev = dtRev || todayDot;
    }

    const overallStatus = computeOverallStatus(
      stRev,
      stApp,
      isSubmitting,
      !isSubmitting ? "DRAFT" : "PENDING"
    );

    const insertRes = await pool.query(
      `INSERT INTO erp_work_improvements (
        report_no, summary_target, summary_date, department, improve_types,
        author_id, role_author, name_author,
        reviewer_id, role_reviewer, name_reviewer, status_reviewer, date_reviewer, comment_reviewer,
        approver_id, role_approver, name_approver, status_approver, date_approver, comment_approver,
        numbered_items, photos, attached_files, overall_status
      ) VALUES (
        $1, $2, $3, $4, $5::jsonb,
        $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20,
        $21::jsonb, $22::jsonb, $23::jsonb, $24
      ) RETURNING *`,
      [
        reportNo,
        String(summaryTarget).trim(),
        summaryDate || nowDateStr,
        department || "현장개선팀",
        JSON.stringify(Array.isArray(improveTypes) ? improveTypes : []),
        lineRes.authorId,
        lineRes.roleAuthor,
        lineRes.nameAuthor,
        lineRes.reviewerId,
        lineRes.roleReviewer,
        lineRes.nameReviewer,
        stRev,
        dtRev,
        commentReviewer || "",
        lineRes.approverId,
        lineRes.roleApprover,
        lineRes.nameApprover,
        stApp,
        dtApp,
        cmApp,
        JSON.stringify(numberedItems || {}),
        JSON.stringify(Array.isArray(photos) ? photos : []),
        JSON.stringify(Array.isArray(attachedFiles) ? attachedFiles : []),
        overallStatus,
      ]
    );

    let savedRow = insertRes.rows[0];

    if (isSubmitting) {
      savedRow = await syncWorkImprovementApprovalRequest(pool, savedRow);
    }

    return NextResponse.json({
      success: true,
      report: mapRowToReport(savedRow),
      autoApproved: isSubmitting && lineRes.autoApprove,
      message:
        isSubmitting && lineRes.autoApprove
          ? "부서장 전결로 업무개선활동 보고서가 즉시 승인되었습니다."
          : "업무개선활동 보고서가 등록되었습니다.",
    });
  } catch (error: any) {
    console.error("POST Work Improvement Error:", error);
    return NextResponse.json(
      { error: "업무개선활동 보고서 저장 실패: " + error.message },
      { status: 500 }
    );
  }
}

// PUT: 보고서 전체 수정 및 결재 상태/의견/결재선 연동 업데이트
export async function PUT(request: Request) {
  try {
    await ensureWorkImprovementsTable();
    const pool = getErpPool();
    const body = await request.json();

    const {
      id,
      summaryTarget,
      summaryDate,
      department,
      improveTypes,
      authorId,
      roleAuthor,
      nameAuthor,
      reviewerId,
      roleReviewer,
      nameReviewer,
      statusReviewer,
      dateReviewer,
      commentReviewer,
      approverId,
      roleApprover,
      nameApprover,
      statusApprover,
      dateApprover,
      commentApprover,
      numberedItems,
      photos,
      attachedFiles,
      submitApproval,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "보고서 ID가 필요합니다." }, { status: 400 });
    }

    const existingRes = await pool.query(
      `SELECT * FROM erp_work_improvements WHERE id = $1 LIMIT 1`,
      [Number(id)]
    );
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "대상 보고서를 찾을 수 없습니다." }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    const lineRes = await resolveAndValidateServerWorkImprovementLine(pool, {
      authorId: authorId !== undefined ? authorId : existing.author_id,
      nameAuthor: nameAuthor !== undefined ? nameAuthor : existing.name_author,
      roleAuthor: roleAuthor !== undefined ? roleAuthor : existing.role_author,
      reviewerId: reviewerId !== undefined ? reviewerId : existing.reviewer_id,
      nameReviewer: nameReviewer !== undefined ? nameReviewer : existing.name_reviewer,
      roleReviewer: roleReviewer !== undefined ? roleReviewer : existing.role_reviewer,
      approverId: approverId !== undefined ? approverId : existing.approver_id,
      nameApprover: nameApprover !== undefined ? nameApprover : existing.name_approver,
      roleApprover: roleApprover !== undefined ? roleApprover : existing.role_approver,
    });

    if (!lineRes.valid) {
      return NextResponse.json({ error: lineRes.error }, { status: 400 });
    }

    const todayDot = formatDotDate();
    let stRev = statusReviewer ?? existing.status_reviewer ?? "대기중";
    let stApp = statusApprover ?? existing.status_approver ?? "대기중";
    let dtRev = dateReviewer !== undefined ? dateReviewer : existing.date_reviewer;
    let dtApp = dateApprover !== undefined ? dateApprover : existing.date_approver;
    let cmApp = commentApprover !== undefined ? commentApprover : existing.comment_approver;

    const isSubmitting = submitApproval === true;
    if (isSubmitting && lineRes.autoApprove && stApp !== "반려") {
      stRev = "검토완료";
      stApp = "최종승인";
      dtRev = dtRev || todayDot;
      dtApp = dtApp || todayDot;
      if (!cmApp) {
        cmApp = lineRes.authorId === 1 || /대표/.test(lineRes.roleAuthor)
          ? "대표 본인 전결"
          : "부서장 전결";
      }
    }

    if (stApp === "최종승인" && stRev === "대기중") {
      stRev = "검토완료";
      dtRev = dtRev || todayDot;
    }

    const overallStatus = computeOverallStatus(
      stRev,
      stApp,
      Boolean(submitApproval),
      existing.overall_status
    );

    const updRes = await pool.query(
      `UPDATE erp_work_improvements SET
        summary_target = $1,
        summary_date = $2,
        department = $3,
        improve_types = $4::jsonb,
        author_id = $5,
        role_author = $6,
        name_author = $7,
        reviewer_id = $8,
        role_reviewer = $9,
        name_reviewer = $10,
        status_reviewer = $11,
        date_reviewer = $12,
        comment_reviewer = $13,
        approver_id = $14,
        role_approver = $15,
        name_approver = $16,
        status_approver = $17,
        date_approver = $18,
        comment_approver = $19,
        numbered_items = $20::jsonb,
        photos = $21::jsonb,
        attached_files = $22::jsonb,
        overall_status = $23,
        updated_at = NOW()
      WHERE id = $24
      RETURNING *`,
      [
        summaryTarget !== undefined ? String(summaryTarget).trim() : existing.summary_target,
        summaryDate !== undefined ? summaryDate : existing.summary_date,
        department !== undefined ? department : existing.department,
        JSON.stringify(
          Array.isArray(improveTypes) ? improveTypes : existing.improve_types || []
        ),
        lineRes.authorId,
        lineRes.roleAuthor,
        lineRes.nameAuthor,
        lineRes.reviewerId,
        lineRes.roleReviewer,
        lineRes.nameReviewer,
        stRev,
        dtRev,
        commentReviewer !== undefined ? commentReviewer : existing.comment_reviewer,
        lineRes.approverId,
        lineRes.roleApprover,
        lineRes.nameApprover,
        stApp,
        dtApp,
        cmApp,
        JSON.stringify(numberedItems !== undefined ? numberedItems : existing.numbered_items || {}),
        JSON.stringify(Array.isArray(photos) ? photos : existing.photos || []),
        JSON.stringify(
          Array.isArray(attachedFiles) ? attachedFiles : existing.attached_files || []
        ),
        overallStatus,
        Number(id),
      ]
    );

    let updated = updRes.rows[0];

    // 이미 결재 연동되었거나, 이번 저장에서 본상신(submitApproval = true)으로 전환된 경우 결재함 동기화
    if (updated.approval_request_id || isSubmitting || existing.overall_status !== "DRAFT") {
      updated = await syncWorkImprovementApprovalRequest(pool, updated);
    }

    return NextResponse.json({
      success: true,
      report: mapRowToReport(updated),
      message: "보고서 및 결재 정보가 저장되었습니다.",
    });
  } catch (error: any) {
    console.error("PUT Work Improvement Error:", error);
    return NextResponse.json(
      { error: "보고서 수정 실패: " + error.message },
      { status: 500 }
    );
  }
}

// PATCH: 검토자 또는 승인자의 빠른 결재 상태/코멘트 처리 (단계 권한 분리 · 대표이사 결재 차단 · 역전 방지)
export async function PATCH(request: Request) {
  try {
    await ensureWorkImprovementsTable();
    const pool = getErpPool();
    const body = await request.json();
    const {
      id,
      actionRole, // 'REVIEWER' | 'APPROVER'
      statusValue, // '검토완료' | '보완요청' | '대기중' | '최종승인' | '반려'
      comment,
      dateStr,
      actorId,
    } = body;

    if (!id || !actionRole || !statusValue) {
      return NextResponse.json(
        { error: "보고서 ID, 결재 구분, 상태값은 필수입니다." },
        { status: 400 }
      );
    }

    const existingRes = await pool.query(
      `SELECT * FROM erp_work_improvements WHERE id = $1 LIMIT 1`,
      [Number(id)]
    );
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "대상 보고서를 찾을 수 없습니다." }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    const ctx = await loadOrgApprovalContext(pool);
    const actorEmp = actorId
      ? ctx.employees.find((e) => Number(e.id) === Number(actorId)) || null
      : null;

    if (!actorEmp) {
      return NextResponse.json(
        { error: "결재 처리자 계정이 유효하지 않거나 재직 상태가 아닙니다." },
        { status: 403 }
      );
    }

    if (isCeoEmployee(actorEmp)) {
      return NextResponse.json(
        { error: "대표이사는 결재 제외 대상입니다. 소속 부서장이 전결 처리해야 합니다." },
        { status: 403 }
      );
    }

    const authorEmp = existing.author_id
      ? ctx.allEmployees.find((e) => Number(e.id) === Number(existing.author_id)) || null
      : null;
    const approverEmp = existing.approver_id
      ? ctx.allEmployees.find((e) => Number(e.id) === Number(existing.approver_id)) || null
      : null;

    const actorIsDeptHead = isDepartmentHeadEmployee(actorEmp, ctx.departments);
    const actorIsAuthor = existing.author_id && Number(actorEmp.id) === Number(existing.author_id);
    const actorIsReviewer =
      existing.reviewer_id && Number(actorEmp.id) === Number(existing.reviewer_id);
    const actorIsApprover =
      existing.approver_id && Number(actorEmp.id) === Number(existing.approver_id);

    if (actorIsAuthor && !(actorIsDeptHead && actorIsApprover)) {
      return NextResponse.json(
        { error: "작성자 본인은 자신의 보고서를 검토 또는 승인할 수 없습니다." },
        { status: 403 }
      );
    }

    const todayFormatted = dateStr || formatDotDate();

    let stRev = existing.status_reviewer;
    let stApp = existing.status_approver;
    let dtRev = existing.date_reviewer;
    let dtApp = existing.date_approver;
    let cmRev = existing.comment_reviewer;
    let cmApp = existing.comment_approver;

    if (actionRole === "REVIEWER") {
      if (!["검토완료", "보완요청", "대기중"].includes(statusValue)) {
        return NextResponse.json({ error: "유효하지 않은 검토 상태값입니다." }, { status: 400 });
      }
      if (!actorIsReviewer && !actorIsApprover && !actorIsDeptHead) {
        return NextResponse.json(
          { error: "지정된 검토자 또는 소속 부서장만 검토 처리할 수 있습니다." },
          { status: 403 }
        );
      }
      if (stApp === "최종승인" && !actorIsDeptHead) {
        return NextResponse.json(
          { error: "최종승인이 완료된 문서는 검토 상태를 되돌릴 수 없습니다." },
          { status: 403 }
        );
      }
      if (
        authorEmp &&
        getEffectiveApprovalRank(actorEmp) < getEffectiveApprovalRank(authorEmp)
      ) {
        return NextResponse.json(
          { error: "결재선 역전 오류: 작성자보다 하위 직급자는 검토를 확정할 수 없습니다." },
          { status: 403 }
        );
      }

      stRev = statusValue;
      dtRev = todayFormatted;
      if (comment !== undefined) cmRev = comment;
    } else if (actionRole === "APPROVER") {
      if (!["최종승인", "반려", "대기중"].includes(statusValue)) {
        return NextResponse.json({ error: "유효하지 않은 승인 상태값입니다." }, { status: 400 });
      }

      const canApproveFinal =
        actorIsApprover ||
        (actorIsDeptHead &&
          getEffectiveApprovalRank(actorEmp) >= getEffectiveApprovalRank(approverEmp));

      if (!canApproveFinal) {
        return NextResponse.json(
          {
            error:
              "최종승인 권한이 없습니다. 전결권자(부서장)만 최종승인 또는 반려를 확정할 수 있습니다.",
          },
          { status: 403 }
        );
      }

      if (
        authorEmp &&
        getEffectiveApprovalRank(actorEmp) < getEffectiveApprovalRank(authorEmp)
      ) {
        return NextResponse.json(
          { error: "결재선 역전 오류: 작성자보다 하위 직급자는 승인할 수 없습니다." },
          { status: 403 }
        );
      }

      stApp = statusValue;
      dtApp = todayFormatted;
      if (comment !== undefined) cmApp = comment;

      // 부서장 전결 마감 시 선행 검토 단계가 대기중이면 함께 검토완료로 정합 처리
      if (statusValue === "최종승인" && (stRev === "대기중" || stRev === "보완요청")) {
        stRev = "검토완료";
        dtRev = dtRev || todayFormatted;
      }
    } else {
      return NextResponse.json({ error: "유효하지 않은 결재 역할(actionRole)입니다." }, { status: 400 });
    }

    const overallStatus = computeOverallStatus(stRev, stApp, true, existing.overall_status);

    // 기존 보고서의 reviewer_id/approver_id가 비어있는 경우에만 유효 처리자 채움 (역전 시에는 저장 차단 유지)
    const idRev = existing.reviewer_id || Number(actorEmp.id);
    const nmRev = existing.name_reviewer || actorEmp.name;
    const idApp =
      existing.approver_id ||
      (actionRole === "APPROVER" ? Number(actorEmp.id) : existing.approver_id);
    const nmApp =
      existing.name_approver ||
      (actionRole === "APPROVER" ? actorEmp.name : existing.name_approver);

    const updRes = await pool.query(
      `UPDATE erp_work_improvements SET
        reviewer_id = $1,
        name_reviewer = $2,
        status_reviewer = $3,
        date_reviewer = $4,
        comment_reviewer = $5,
        approver_id = $6,
        name_approver = $7,
        status_approver = $8,
        date_approver = $9,
        comment_approver = $10,
        overall_status = $11,
        updated_at = NOW()
      WHERE id = $12
      RETURNING *`,
      [
        idRev,
        nmRev,
        stRev,
        dtRev,
        cmRev,
        idApp,
        nmApp,
        stApp,
        dtApp,
        cmApp,
        overallStatus,
        Number(id),
      ]
    );

    let updated = updRes.rows[0];
    updated = await syncWorkImprovementApprovalRequest(pool, updated);

    return NextResponse.json({
      success: true,
      report: mapRowToReport(updated),
      message: `결재 상태가 [${statusValue}](으)로 반영되었습니다.`,
    });
  } catch (error: any) {
    console.error("PATCH Work Improvement Error:", error);
    return NextResponse.json(
      { error: "결재 상태 반영 실패: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE: 보고서 삭제
export async function DELETE(request: Request) {
  try {
    await ensureWorkImprovementsTable();
    const pool = getErpPool();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 보고서 ID가 필요합니다." }, { status: 400 });
    }

    const existingRes = await pool.query(
      `SELECT approval_request_id FROM erp_work_improvements WHERE id = $1 LIMIT 1`,
      [Number(id)]
    );

    if (existingRes.rows.length > 0 && existingRes.rows[0].approval_request_id) {
      const reqId = existingRes.rows[0].approval_request_id;
      await pool.query(`DELETE FROM erp_approval_steps WHERE request_id = $1`, [reqId]);
      await pool.query(`DELETE FROM erp_approval_requests WHERE id = $1`, [reqId]);
    }

    await pool.query(`DELETE FROM erp_work_improvements WHERE id = $1`, [Number(id)]);

    return NextResponse.json({
      success: true,
      message: "업무개선활동 보고서가 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("DELETE Work Improvement Error:", error);
    return NextResponse.json(
      { error: "보고서 삭제 실패: " + error.message },
      { status: 500 }
    );
  }
}
