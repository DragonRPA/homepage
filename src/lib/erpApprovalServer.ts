import "server-only";
import type { Pool, PoolClient } from "pg";
import {
  ApprovalDepartmentLike,
  ApprovalEmployeeLike,
  isActiveEmployeeRecord,
  isCeoEmployee,
  resolveDepartmentHeadFromList,
  resolveWorkImprovementApprovalLine,
  validateApprovalLineNoInversion,
} from "./erpApprovalLine";

export interface LoadedOrgApprovalContext {
  employees: ApprovalEmployeeLike[];
  allEmployees: ApprovalEmployeeLike[];
  departments: ApprovalDepartmentLike[];
}

export async function loadOrgApprovalContext(
  pool: Pool | PoolClient
): Promise<LoadedOrgApprovalContext> {
  const [empRes, deptRes] = await Promise.all([
    pool.query(
      `SELECT id, employee_no as "employeeNo", name, department, department_id as "departmentId",
              position, duty, role, role_code as "roleCode", tier_level as "tierLevel",
              employment_status as "employmentStatus"
       FROM erp_employees
       ORDER BY tier_level DESC, id ASC`
    ),
    pool.query(
      `SELECT id, dept_name as "deptName", manager_name as "managerName"
       FROM erp_departments
       ORDER BY sort_order ASC, id ASC`
    ),
  ]);

  const allEmployees: ApprovalEmployeeLike[] = empRes.rows || [];
  const employees = allEmployees.filter(isActiveEmployeeRecord);
  const departments: ApprovalDepartmentLike[] = deptRes.rows || [];
  return { employees, allEmployees, departments };
}

function findEmployeeMatch(
  poolList: ApprovalEmployeeLike[],
  id?: number | string | null,
  name?: string | null
): ApprovalEmployeeLike | null {
  const cleanName = String(name || "").trim();
  if (id !== undefined && id !== null && String(id).trim() !== "" && Number(id) > 0) {
    const byId = poolList.find((e) => Number(e.id) === Number(id));
    if (byId) {
      // 성명이 명시적으로 다른 경우(stale ID)에는 성명 기준 재매칭 우선
      if (!cleanName || String(byId.name || "").trim() === cleanName) {
        return byId;
      }
    }
  }
  if (cleanName) {
    return poolList.find((e) => String(e.name || "").trim() === cleanName) || null;
  }
  return null;
}

/**
 * 요청자 ID 기준으로 소속 부서장(대표이사 제외) 전결권자를 산출한다.
 * 부서장 본인 또는 대표이사 본인 상신 시 본인 전결(autoApprove: true)로 반환한다.
 */
export async function resolveServerDepartmentHeadApprover(
  pool: Pool | PoolClient,
  requesterEmpId: number
): Promise<{
  approverId: number;
  approverName: string;
  autoApprove: boolean;
  requester: ApprovalEmployeeLike | null;
  approver: ApprovalEmployeeLike | null;
}> {
  const ctx = await loadOrgApprovalContext(pool);
  const requester = ctx.allEmployees.find((e) => Number(e.id) === Number(requesterEmpId)) || null;
  const resolved = resolveDepartmentHeadFromList(requester, ctx.employees, ctx.departments);
  const approver = resolved.approver || requester;

  return {
    approverId: approver ? Number(approver.id) : Number(requesterEmpId),
    approverName: approver?.name ? String(approver.name) : "",
    autoApprove: resolved.autoApprove,
    requester,
    approver,
  };
}

export interface WorkImprovementLineResolution {
  valid: boolean;
  error?: string;
  authorId: number | null;
  nameAuthor: string;
  roleAuthor: string;
  reviewerId: number | null;
  nameReviewer: string;
  roleReviewer: string;
  approverId: number | null;
  nameApprover: string;
  roleApprover: string;
  autoApprove: boolean;
}

/**
 * 업무개선활동 보고서의 작성자·검토자·승인자 결재선을 서버에서 검증 및 정규화한다.
 * - 퇴사자/대표이사 지정 차단
 * - 작성자 <= 검토자 <= 부서장 서열 단조 증가 검증 (역전 차단)
 * - 미지정 시 부서장 전결 원칙에 맞춰 자동 산출
 */
export async function resolveAndValidateServerWorkImprovementLine(
  pool: Pool | PoolClient,
  params: {
    authorId?: number | null;
    nameAuthor?: string | null;
    roleAuthor?: string | null;
    reviewerId?: number | null;
    nameReviewer?: string | null;
    roleReviewer?: string | null;
    approverId?: number | null;
    nameApprover?: string | null;
    roleApprover?: string | null;
  }
): Promise<WorkImprovementLineResolution> {
  const ctx = await loadOrgApprovalContext(pool);

  const authorEmp = findEmployeeMatch(ctx.allEmployees, params.authorId, params.nameAuthor);
  const cleanNameReviewer = String(params.nameReviewer || "").trim();
  const cleanNameApprover = String(params.nameApprover || "").trim();

  let reviewerEmp =
    cleanNameReviewer || params.reviewerId
      ? findEmployeeMatch(ctx.allEmployees, params.reviewerId, cleanNameReviewer)
      : null;
  let approverEmp =
    cleanNameApprover || params.approverId
      ? findEmployeeMatch(ctx.allEmployees, params.approverId, cleanNameApprover)
      : null;

  // 입력된 성명이 존재하는데 재직 직원 목록에서 찾을 수 없거나 퇴사자인 경우 확인
  if (reviewerEmp && !isActiveEmployeeRecord(reviewerEmp)) {
    return {
      valid: false,
      error: `검토자(${reviewerEmp.name})는 현재 재직(ACTIVE) 상태가 아닙니다. 재직 중인 상급자 또는 부서장을 지정하세요.`,
      authorId: authorEmp ? Number(authorEmp.id) : params.authorId || null,
      nameAuthor: String(authorEmp?.name || params.nameAuthor || ""),
      roleAuthor: String(params.roleAuthor || authorEmp?.duty || authorEmp?.position || "담당"),
      reviewerId: null,
      nameReviewer: cleanNameReviewer,
      roleReviewer: String(params.roleReviewer || "팀장"),
      approverId: approverEmp ? Number(approverEmp.id) : null,
      nameApprover: cleanNameApprover,
      roleApprover: String(params.roleApprover || "부서장"),
      autoApprove: false,
    };
  }
  if (approverEmp && !isActiveEmployeeRecord(approverEmp)) {
    return {
      valid: false,
      error: `승인자(${approverEmp.name})는 현재 재직(ACTIVE) 상태가 아닙니다. 현 소속 부서장을 지정하세요.`,
      authorId: authorEmp ? Number(authorEmp.id) : params.authorId || null,
      nameAuthor: String(authorEmp?.name || params.nameAuthor || ""),
      roleAuthor: String(params.roleAuthor || authorEmp?.duty || authorEmp?.position || "담당"),
      reviewerId: reviewerEmp ? Number(reviewerEmp.id) : null,
      nameReviewer: cleanNameReviewer,
      roleReviewer: String(params.roleReviewer || "팀장"),
      approverId: null,
      nameApprover: cleanNameApprover,
      roleApprover: String(params.roleApprover || "부서장"),
      autoApprove: false,
    };
  }

  // 성명을 직접 타이핑했는데 재직 사원 테이블에 매칭되지 않는 경우 오입력·우회 차단
  if (cleanNameReviewer && !reviewerEmp) {
    return {
      valid: false,
      error: /이정용|대표/.test(cleanNameReviewer)
        ? "대표이사는 검토자로 지정할 수 없습니다. (전사 부서장 전결 정책)"
        : `검토자('${cleanNameReviewer}')를 재직 중인 사원 목록에서 찾을 수 없습니다. 사원 목록에서 선택하세요.`,
      authorId: authorEmp ? Number(authorEmp.id) : params.authorId || null,
      nameAuthor: String(authorEmp?.name || params.nameAuthor || ""),
      roleAuthor: String(params.roleAuthor || "담당"),
      reviewerId: null,
      nameReviewer: cleanNameReviewer,
      roleReviewer: String(params.roleReviewer || "팀장"),
      approverId: null,
      nameApprover: cleanNameApprover,
      roleApprover: String(params.roleApprover || "부서장"),
      autoApprove: false,
    };
  }
  if (cleanNameApprover && !approverEmp) {
    return {
      valid: false,
      error: /이정용|대표/.test(cleanNameApprover)
        ? "대표이사는 승인자(전결권자)로 지정할 수 없습니다. 소속 부서장을 지정하세요."
        : `승인자('${cleanNameApprover}')를 재직 중인 사원 목록에서 찾을 수 없습니다. 소속 부서장을 선택하세요.`,
      authorId: authorEmp ? Number(authorEmp.id) : params.authorId || null,
      nameAuthor: String(authorEmp?.name || params.nameAuthor || ""),
      roleAuthor: String(params.roleAuthor || "담당"),
      reviewerId: reviewerEmp ? Number(reviewerEmp.id) : null,
      nameReviewer: cleanNameReviewer,
      roleReviewer: String(params.roleReviewer || "팀장"),
      approverId: null,
      nameApprover: cleanNameApprover,
      roleApprover: String(params.roleApprover || "부서장"),
      autoApprove: false,
    };
  }

  const autoLine = resolveWorkImprovementApprovalLine(authorEmp, ctx.employees, ctx.departments);

  if (!approverEmp && !cleanNameApprover) {
    approverEmp = autoLine.approver;
  }
  if (!reviewerEmp && !cleanNameReviewer) {
    reviewerEmp = autoLine.reviewer || approverEmp;
  }

  const authorIsCeo = isCeoEmployee(authorEmp);
  const autoApprove =
    Boolean(authorEmp && approverEmp && Number(authorEmp.id) === Number(approverEmp.id)) ||
    Boolean(authorIsCeo);

  const check = validateApprovalLineNoInversion({
    author: authorEmp,
    reviewer: reviewerEmp,
    approver: approverEmp,
    roleAuthor: params.roleAuthor || authorEmp?.duty || authorEmp?.position || "담당",
    roleReviewer: params.roleReviewer || reviewerEmp?.duty || reviewerEmp?.position || "팀장",
    roleApprover: params.roleApprover || approverEmp?.duty || approverEmp?.position || "부서장",
    departments: ctx.departments,
  });

  if (!check.valid) {
    return {
      valid: false,
      error: check.error,
      authorId: authorEmp ? Number(authorEmp.id) : params.authorId || null,
      nameAuthor: String(authorEmp?.name || params.nameAuthor || ""),
      roleAuthor: String(params.roleAuthor || authorEmp?.duty || authorEmp?.position || "담당"),
      reviewerId: reviewerEmp ? Number(reviewerEmp.id) : null,
      nameReviewer: String(reviewerEmp?.name || cleanNameReviewer || ""),
      roleReviewer: String(params.roleReviewer || reviewerEmp?.duty || reviewerEmp?.position || "팀장"),
      approverId: approverEmp ? Number(approverEmp.id) : null,
      nameApprover: String(approverEmp?.name || cleanNameApprover || ""),
      roleApprover: String(params.roleApprover || "부서장"),
      autoApprove,
    };
  }

  return {
    valid: true,
    authorId: authorEmp ? Number(authorEmp.id) : params.authorId ? Number(params.authorId) : null,
    nameAuthor: String(authorEmp?.name || params.nameAuthor || ""),
    roleAuthor: String(params.roleAuthor || authorEmp?.duty || authorEmp?.position || "담당"),
    reviewerId: reviewerEmp ? Number(reviewerEmp.id) : null,
    nameReviewer: String(reviewerEmp?.name || cleanNameReviewer || ""),
    roleReviewer: String(
      params.roleReviewer || reviewerEmp?.duty || reviewerEmp?.position || (autoApprove ? "부서장" : "팀장")
    ),
    approverId: approverEmp ? Number(approverEmp.id) : null,
    nameApprover: String(approverEmp?.name || cleanNameApprover || ""),
    roleApprover: String(params.roleApprover || (authorIsCeo ? "전결" : "부서장")),
    autoApprove,
  };
}
