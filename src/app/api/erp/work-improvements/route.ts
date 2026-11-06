import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

async function ensureWorkImprovementsTable() {
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

  // RLS 보안 정책 보장
  await pool.query(`
    ALTER TABLE erp_work_improvements ENABLE ROW LEVEL SECURITY;
  `);

  // 결재선 규칙(WORK_IMPROVEMENT) 자동 시딩
  await pool.query(`
    INSERT INTO erp_approval_rules (event_type, event_name, category, required_tier, description)
    VALUES ('WORK_IMPROVEMENT', '업무개선활동 보고서', '업무개선', 2, '업무개선활동 보고서 검토 및 최종 승인 결재')
    ON CONFLICT (event_type) DO NOTHING;
  `);
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

// GET: 업무개선활동 보고서 목록 또는 단건 조회 + 사원 목록 반환
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

    const [reportsRes, empRes] = await Promise.all([
      pool.query(query, params),
      pool.query(
        `SELECT id, employee_no as "employeeNo", name, department, position, duty, tier_level as "tierLevel"
         FROM erp_employees
         WHERE employment_status = 'ACTIVE'
         ORDER BY tier_level DESC, id ASC`
      ),
    ]);

    return NextResponse.json({
      success: true,
      reports: reportsRes.rows.map(mapRowToReport),
      employees: empRes.rows,
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

    const nowDateStr = new Date().toISOString().slice(0, 10);
    const reportNo = `WIR-${nowDateStr.replace(/-/g, "")}-${String(Date.now()).slice(-4)}`;

    const stRev = statusReviewer || "대기중";
    const stApp = statusApprover || "대기중";
    const overallStatus = computeOverallStatus(
      stRev,
      stApp,
      Boolean(submitApproval),
      submitApproval === false ? "DRAFT" : "PENDING"
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
        authorId ? Number(authorId) : null,
        roleAuthor || "담당",
        nameAuthor || "",
        reviewerId ? Number(reviewerId) : null,
        roleReviewer || "팀장",
        nameReviewer || "",
        stRev,
        dateReviewer || "",
        commentReviewer || "",
        approverId ? Number(approverId) : null,
        roleApprover || "부서장",
        nameApprover || "",
        stApp,
        dateApprover || "",
        commentApprover || "",
        JSON.stringify(numberedItems || {}),
        JSON.stringify(Array.isArray(photos) ? photos : []),
        JSON.stringify(Array.isArray(attachedFiles) ? attachedFiles : []),
        overallStatus,
      ]
    );

    let savedRow = insertRes.rows[0];

    // 결재 상신 시 erp_approval_requests 및 erp_approval_steps 자동 생성
    if (submitApproval !== false) {
      const ruleRes = await pool.query(
        `SELECT id, required_tier FROM erp_approval_rules WHERE event_type = 'WORK_IMPROVEMENT' LIMIT 1`
      );
      const ruleId = ruleRes.rows[0]?.id || null;
      const reqNo = `APPR-WIR-${Date.now()}`;
      const requesterEmpId = authorId ? Number(authorId) : 1;

      const payloadSummary = {
        문서번호: reportNo,
        개선대상: String(summaryTarget).trim(),
        작성일자: summaryDate || nowDateStr,
        작성부서: department || "현장개선팀",
        작성자: `${nameAuthor || "담당자"} (${roleAuthor || "담당"})`,
        개선유형: Array.isArray(improveTypes) ? improveTypes.join(", ") : "",
        검토자: `${nameReviewer || "-"} (${stRev})`,
        승인자: `${nameApprover || "-"} (${stApp})`,
      };

      const reqStatus =
        overallStatus === "APPROVED"
          ? "APPROVED"
          : overallStatus === "REJECTED"
          ? "REJECTED"
          : "PENDING";

      const apprReqRes = await pool.query(
        `INSERT INTO erp_approval_requests (
          request_no, event_type, rule_id, target_table, target_id, requester_id, title, payload, status
        ) VALUES ($1, 'WORK_IMPROVEMENT', $2, 'erp_work_improvements', $3, $4, $5, $6::jsonb, $7)
        RETURNING id`,
        [
          reqNo,
          ruleId,
          savedRow.id,
          requesterEmpId,
          `[업무개선] ${String(summaryTarget).trim()}`,
          JSON.stringify(payloadSummary),
          reqStatus,
        ]
      );

      const approvalRequestId = apprReqRes.rows[0].id;

      // 결재선 Step 생성 (1단계 검토자, 2단계 승인자)
      let stepOrder = 1;
      if (reviewerId) {
        const stepSt =
          stRev === "검토완료" ? "APPROVED" : stRev === "보완요청" ? "REJECTED" : "PENDING";
        await pool.query(
          `INSERT INTO erp_approval_steps (request_id, step_order, approver_id, status, comment, acted_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            approvalRequestId,
            stepOrder++,
            Number(reviewerId),
            stepSt,
            commentReviewer || null,
            stepSt !== "PENDING" ? new Date().toISOString() : null,
          ]
        );
      }

      let finalApproverId = approverId ? Number(approverId) : null;
      if (!finalApproverId) {
        const adminRes = await pool.query(
          `SELECT id FROM erp_employees WHERE employment_status = 'ACTIVE' ORDER BY tier_level DESC, id ASC LIMIT 1`
        );
        finalApproverId = adminRes.rows[0]?.id || requesterEmpId;
      }

      const appStepSt =
        stApp === "최종승인" ? "APPROVED" : stApp === "반려" ? "REJECTED" : "PENDING";
      await pool.query(
        `INSERT INTO erp_approval_steps (request_id, step_order, approver_id, status, comment, acted_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          approvalRequestId,
          stepOrder,
          finalApproverId,
          appStepSt,
          commentApprover || null,
          appStepSt !== "PENDING" ? new Date().toISOString() : null,
        ]
      );

      const updRes = await pool.query(
        `UPDATE erp_work_improvements SET approval_request_id = $1 WHERE id = $2 RETURNING *`,
        [approvalRequestId, savedRow.id]
      );
      savedRow = updRes.rows[0];
    }

    return NextResponse.json({
      success: true,
      report: mapRowToReport(savedRow),
      message: "업무개선활동 보고서가 등록되었습니다.",
    });
  } catch (error: any) {
    console.error("POST Work Improvement Error:", error);
    return NextResponse.json(
      { error: "업무개선활동 보고서 저장 실패: " + error.message },
      { status: 500 }
    );
  }
}

// PUT: 보고서 전체 수정 및 결재 상태/의견 업데이트
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

    const stRev = statusReviewer ?? existing.status_reviewer ?? "대기중";
    const stApp = statusApprover ?? existing.status_approver ?? "대기중";
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
        authorId !== undefined ? (authorId ? Number(authorId) : null) : existing.author_id,
        roleAuthor !== undefined ? roleAuthor : existing.role_author,
        nameAuthor !== undefined ? nameAuthor : existing.name_author,
        reviewerId !== undefined ? (reviewerId ? Number(reviewerId) : null) : existing.reviewer_id,
        roleReviewer !== undefined ? roleReviewer : existing.role_reviewer,
        nameReviewer !== undefined ? nameReviewer : existing.name_reviewer,
        stRev,
        dateReviewer !== undefined ? dateReviewer : existing.date_reviewer,
        commentReviewer !== undefined ? commentReviewer : existing.comment_reviewer,
        approverId !== undefined ? (approverId ? Number(approverId) : null) : existing.approver_id,
        roleApprover !== undefined ? roleApprover : existing.role_approver,
        nameApprover !== undefined ? nameApprover : existing.name_approver,
        stApp,
        dateApprover !== undefined ? dateApprover : existing.date_approver,
        commentApprover !== undefined ? commentApprover : existing.comment_approver,
        JSON.stringify(numberedItems !== undefined ? numberedItems : existing.numbered_items || {}),
        JSON.stringify(Array.isArray(photos) ? photos : existing.photos || []),
        JSON.stringify(
          Array.isArray(attachedFiles) ? attachedFiles : existing.attached_files || []
        ),
        overallStatus,
        Number(id),
      ]
    );

    const updated = updRes.rows[0];

    // 연동된 전자결재 문서가 있으면 상태 및 Payload 동기화
    if (updated.approval_request_id) {
      const reqStatus =
        overallStatus === "APPROVED"
          ? "APPROVED"
          : overallStatus === "REJECTED"
          ? "REJECTED"
          : "PENDING";

      const payloadSummary = {
        문서번호: updated.report_no,
        개선대상: updated.summary_target,
        작성일자: updated.summary_date,
        작성부서: updated.department,
        작성자: `${updated.name_author || "담당자"} (${updated.role_author || "담당"})`,
        개선유형: Array.isArray(updated.improve_types) ? updated.improve_types.join(", ") : "",
        검토자: `${updated.name_reviewer || "-"} (${updated.status_reviewer})`,
        검토의견: updated.comment_reviewer || "-",
        승인자: `${updated.name_approver || "-"} (${updated.status_approver})`,
        승인의견: updated.comment_approver || "-",
      };

      await pool.query(
        `UPDATE erp_approval_requests
         SET title = $1, payload = $2::jsonb, status = $3
         WHERE id = $4`,
        [
          `[업무개선] ${updated.summary_target}`,
          JSON.stringify(payloadSummary),
          reqStatus,
          updated.approval_request_id,
        ]
      );

      if (reqStatus === "APPROVED" || reqStatus === "REJECTED") {
        await pool.query(
          `UPDATE erp_approval_steps
           SET status = $1, comment = $2, acted_at = NOW()
           WHERE request_id = $3`,
          [
            reqStatus,
            updated.comment_approver || updated.comment_reviewer || null,
            updated.approval_request_id,
          ]
        );
      }
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

// PATCH: 검토자 또는 승인자의 빠른 결재 상태/코멘트 처리
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
      actorName,
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
    const todayFormatted =
      dateStr ||
      (() => {
        const d = new Date();
        return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(
          d.getDate()
        ).padStart(2, "0")}`;
      })();

    let stRev = existing.status_reviewer;
    let stApp = existing.status_approver;
    let dtRev = existing.date_reviewer;
    let dtApp = existing.date_approver;
    let cmRev = existing.comment_reviewer;
    let cmApp = existing.comment_approver;
    let nmRev = existing.name_reviewer;
    let nmApp = existing.name_approver;
    let idRev = existing.reviewer_id;
    let idApp = existing.approver_id;

    if (actionRole === "REVIEWER") {
      stRev = statusValue;
      dtRev = todayFormatted;
      if (comment !== undefined) cmRev = comment;
      if (actorName) nmRev = actorName;
      if (actorId) idRev = Number(actorId);
    } else if (actionRole === "APPROVER") {
      stApp = statusValue;
      dtApp = todayFormatted;
      if (comment !== undefined) cmApp = comment;
      if (actorName) nmApp = actorName;
      if (actorId) idApp = Number(actorId);
    }

    const overallStatus = computeOverallStatus(stRev, stApp, true, existing.overall_status);

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

    const updated = updRes.rows[0];

    if (updated.approval_request_id) {
      const reqStatus =
        overallStatus === "APPROVED"
          ? "APPROVED"
          : overallStatus === "REJECTED"
          ? "REJECTED"
          : "PENDING";

      await pool.query(
        `UPDATE erp_approval_requests SET status = $1 WHERE id = $2`,
        [reqStatus, updated.approval_request_id]
      );

      if (reqStatus !== "PENDING") {
        await pool.query(
          `UPDATE erp_approval_steps SET status = $1, comment = $2, acted_at = NOW() WHERE request_id = $3`,
          [reqStatus, cmApp || cmRev || null, updated.approval_request_id]
        );
      }
    }

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
