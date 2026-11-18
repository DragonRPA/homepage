import { getUserEffectiveTier } from "@/app/erp/components/organization/organizationTypes";

export interface ApprovalEmployeeLike {
  id: number | string;
  name?: string | null;
  department?: string | null;
  departmentId?: number | string | null;
  department_id?: number | string | null;
  position?: string | null;
  duty?: string | null;
  role?: string | null;
  roleCode?: string | null;
  role_code?: string | null;
  tierLevel?: number | string | null;
  tier_level?: number | string | null;
  employmentStatus?: string | null;
  employment_status?: string | null;
}

export interface ApprovalDepartmentLike {
  id?: number | string | null;
  deptName?: string | null;
  dept_name?: string | null;
  name?: string | null;
  managerName?: string | null;
  manager_name?: string | null;
}

const RANK_KEYWORD_RULES: ReadonlyArray<{ pattern: RegExp; rank: number }> = [
  { pattern: /대표이사|대표|사장|부사장|총괄/, rank: 7 },
  { pattern: /상무|전무|본부장/, rank: 6 },
  { pattern: /이사|센터장|공장장/, rank: 5 },
  { pattern: /부서장|팀장|부장|실장/, rank: 4 },
  { pattern: /차장/, rank: 3 },
  { pattern: /과장|파트장/, rank: 2 },
  { pattern: /대리/, rank: 1 },
  { pattern: /주임|사원|담당/, rank: 0 },
];

export function inferApprovalRankFromText(label?: string | null): number {
  const text = String(label || "").trim();
  if (!text) return 0;
  for (const rule of RANK_KEYWORD_RULES) {
    if (rule.pattern.test(text)) {
      return rule.rank;
    }
  }
  return 0;
}

/**
 * 대표이사(CEO) 여부 판정.
 * 대표이사는 결재선(검토자/승인자) 배정 및 결재 실행 대상에서 제외된다.
 */
export function isCeoEmployee(emp?: ApprovalEmployeeLike | null): boolean {
  if (!emp) return false;
  const pos = String(emp.position || "").trim();
  const duty = String(emp.duty || "").trim();
  return /대표/.test(pos) || /대표/.test(duty);
}

/**
 * 직책(duty), 직급(position), DB tier_level을 통합하여 일관된 결재 서열 점수를 산출한다.
 */
export function getEffectiveApprovalRank(
  emp?: ApprovalEmployeeLike | null,
  fallbackRoleLabel?: string | null
): number {
  if (!emp) {
    return inferApprovalRankFromText(fallbackRoleLabel);
  }
  if (isCeoEmployee(emp)) {
    return 7;
  }

  const numericTier = Number(emp.tierLevel ?? emp.tier_level ?? 0);
  const safeTier = Number.isFinite(numericTier) ? numericTier : 0;

  const eff = getUserEffectiveTier({
    duty: emp.duty,
    position: emp.position,
    tier_level: safeTier,
  });

  const dutyRank = inferApprovalRankFromText(emp.duty);
  const posRank = inferApprovalRankFromText(emp.position);

  return Math.max(eff.effectiveTier, dutyRank, posRank, safeTier);
}

/**
 * 대표이사가 아닌 실무 부서장(전결권자) 자격 보유 여부를 판정한다.
 * 과거 데이터 오기로 role='MANAGER'이지만 실제 사원/대리(tier 0~1)인 경우를 걸러낸다.
 */
export function isDepartmentHeadEmployee(
  emp?: ApprovalEmployeeLike | null,
  departments?: ApprovalDepartmentLike[]
): boolean {
  if (!emp || isCeoEmployee(emp)) return false;

  const empName = String(emp.name || "").trim();
  const duty = String(emp.duty || "").trim();
  const pos = String(emp.position || "").trim();
  const roleCode = String(emp.roleCode || emp.role_code || "").toUpperCase();
  const rank = getEffectiveApprovalRank(emp);

  if (departments && empName) {
    const isNamedDeptManager = departments.some((d) => {
      const mgr = String(d.managerName ?? d.manager_name ?? "").trim();
      return mgr && !/대표/.test(mgr) && mgr === empName;
    });
    if (isNamedDeptManager) return true;
  }

  if (/팀장|부서장|실장|본부장|센터장|공장장/.test(duty)) return true;
  if (/팀장|부서장|부장|이사|상무|전무/.test(pos)) return true;
  if (rank >= 4) return true;
  if (roleCode === "MANAGER" && rank >= 3) return true;

  return false;
}

export function isActiveEmployeeRecord(emp?: ApprovalEmployeeLike | null): boolean {
  if (!emp) return false;
  const st = emp.employmentStatus ?? emp.employment_status;
  if (!st) return true;
  return String(st).toUpperCase() === "ACTIVE";
}

function getDepartmentManagerNameForEmployee(
  emp: ApprovalEmployeeLike,
  departments?: ApprovalDepartmentLike[]
): string {
  if (!departments || departments.length === 0) return "";
  const empDeptId = emp.departmentId ?? emp.department_id;
  const empDeptName = String(emp.department || "").trim();

  const matched = departments.find((d) => {
    if (empDeptId !== undefined && empDeptId !== null && d.id !== undefined && d.id !== null) {
      if (String(d.id) === String(empDeptId)) return true;
    }
    const dName = String(d.deptName ?? d.dept_name ?? d.name ?? "").trim();
    return Boolean(empDeptName && dName && dName === empDeptName);
  });

  return String(matched?.managerName ?? matched?.manager_name ?? "").trim();
}

/**
 * 기안자 기준 소속 부서장(대표이사 제외)을 전결권자로 산출한다.
 * - 기안자가 대표이사인 경우: 하급자에게 결재를 요청하는 역전을 막기 위해 본인 전결 처리
 * - 기안자가 부서장 이상인 경우: 본인 전결(autoApprove: true)
 */
export function resolveDepartmentHeadFromList<T extends ApprovalEmployeeLike>(
  requester: T | null | undefined,
  employees: T[],
  departments?: ApprovalDepartmentLike[]
): { approver: T | null; autoApprove: boolean } {
  const activeEmps = employees.filter(isActiveEmployeeRecord);
  const nonCeoActive = activeEmps.filter((e) => !isCeoEmployee(e));

  if (!requester) {
    const anyDeptHead =
      nonCeoActive
        .filter((e) => isDepartmentHeadEmployee(e, departments))
        .sort((a, b) => getEffectiveApprovalRank(b) - getEffectiveApprovalRank(a) || Number(a.id) - Number(b.id))[0] ||
      nonCeoActive[0] ||
      null;
    return { approver: anyDeptHead, autoApprove: false };
  }

  const reqRank = getEffectiveApprovalRank(requester);

  // 대표이사 본인 상신 시 하급자 결재 역전 방지 및 결재 부담 배제: 즉시 본인 전결
  if (isCeoEmployee(requester)) {
    return { approver: requester, autoApprove: true };
  }

  // 1. 소속 부서 manager_name(대표이사 제외) 우선 매칭
  const deptManagerName = getDepartmentManagerNameForEmployee(requester, departments);
  if (deptManagerName && !/대표/.test(deptManagerName)) {
    const byName = nonCeoActive.find((e) => String(e.name || "").trim() === deptManagerName);
    if (byName && getEffectiveApprovalRank(byName) >= reqRank) {
      return {
        approver: byName,
        autoApprove: Number(byName.id) === Number(requester.id),
      };
    }
  }

  // 2. 동일 부서 내 비대표 부서장 탐색 (기안자 이상 서열, 하위 부서장 제외)
  const reqDept = String(requester.department || "").trim();
  const reqDeptId = requester.departmentId ?? requester.department_id;
  const sameDeptHeads = nonCeoActive
    .filter((e) => {
      const sameId =
        reqDeptId !== undefined &&
        reqDeptId !== null &&
        (e.departmentId ?? e.department_id) !== undefined &&
        (e.departmentId ?? e.department_id) !== null &&
        String(e.departmentId ?? e.department_id) === String(reqDeptId);
      const sameName = Boolean(reqDept && String(e.department || "").trim() === reqDept);
      return (sameId || sameName) && isDepartmentHeadEmployee(e, departments) && getEffectiveApprovalRank(e) >= reqRank;
    })
    .sort((a, b) => getEffectiveApprovalRank(b) - getEffectiveApprovalRank(a) || Number(a.id) - Number(b.id));

  if (sameDeptHeads.length > 0) {
    const chosen = sameDeptHeads.find((e) => Number(e.id) === Number(requester.id)) || sameDeptHeads[0];
    return {
      approver: chosen,
      autoApprove: Number(chosen.id) === Number(requester.id),
    };
  }

  // 3. 신청자 본인이 부서장 자격을 가진 경우 본인 전결
  if (isDepartmentHeadEmployee(requester, departments)) {
    return { approver: requester, autoApprove: true };
  }

  // 4. 부서 내 부서장 공석인 경우 전사 비대표 부서장 중 기안자 이상 서열자 탐색
  const globalDeptHeads = nonCeoActive
    .filter((e) => isDepartmentHeadEmployee(e, departments) && getEffectiveApprovalRank(e) >= reqRank)
    .sort((a, b) => getEffectiveApprovalRank(b) - getEffectiveApprovalRank(a) || Number(a.id) - Number(b.id));

  if (globalDeptHeads.length > 0) {
    const chosen = globalDeptHeads[0];
    return {
      approver: chosen,
      autoApprove: Number(chosen.id) === Number(requester.id),
    };
  }

  return { approver: requester, autoApprove: true };
}

/**
 * 업무개선활동 보고서의 결재선(작성자 <= 검토자 <= 부서장)을 역전 없이 자동 산출한다.
 * - 부서장/대표이사 본인 기안 시 하급자를 검토자에 배정하지 않고 본인 전결 처리
 * - 일반 부서원 기안 시, 작성자 < 검토자 < 부서장 직급을 만족하는 중간직급자만 검토자로 선정, 없으면 부서장 단일 결재선 구성
 */
export function resolveWorkImprovementApprovalLine<T extends ApprovalEmployeeLike>(
  author: T | null | undefined,
  employees: T[],
  departments?: ApprovalDepartmentLike[]
): {
  reviewer: T | null;
  approver: T | null;
  autoApprove: boolean;
} {
  const { approver, autoApprove } = resolveDepartmentHeadFromList(author, employees, departments);
  if (!author) {
    return { reviewer: approver, approver, autoApprove };
  }

  if (autoApprove || !approver || Number(author.id) === Number(approver.id)) {
    return {
      reviewer: author,
      approver: approver || author,
      autoApprove: true,
    };
  }

  const authorRank = getEffectiveApprovalRank(author);
  const approverRank = getEffectiveApprovalRank(approver);
  const authorDept = String(author.department || "").trim();
  const nonCeoActive = employees.filter((e) => isActiveEmployeeRecord(e) && !isCeoEmployee(e));

  // 작성자보다 명백히 상급이면서 최종 부서장보다는 하위인 동일 부서 중간 검토자 탐색
  const intermediateReviewers = nonCeoActive
    .filter((e) => {
      if (Number(e.id) === Number(author.id) || Number(e.id) === Number(approver.id)) return false;
      const sameDept = !authorDept || String(e.department || "").trim() === authorDept;
      if (!sameDept) return false;
      const r = getEffectiveApprovalRank(e);
      return r > authorRank && r < approverRank;
    })
    .sort((a, b) => getEffectiveApprovalRank(a) - getEffectiveApprovalRank(b) || Number(a.id) - Number(b.id));

  const reviewer = intermediateReviewers.length > 0 ? intermediateReviewers[intermediateReviewers.length - 1] : approver;

  return {
    reviewer,
    approver,
    autoApprove: false,
  };
}

export interface ApprovalLineValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 결재선 역전 및 대표이사 배정 금지 규칙 검증.
 * 1) 대표이사를 타인의 검토자/승인자로 지정할 수 없음
 * 2) 작성자 서열 <= 검토자 서열 <= 승인자 서열 단조 증가 필수
 * 3) 기안자 본인과 다른 중간 검토자는 반드시 기안자보다 상위 서열이어야 함 (하급자·동급자 검토 차단)
 * 4) 전결권자(승인자)는 대표이사가 아닌 부서장 자격 보유자여야 함 (대표이사 본인 전결 예외)
 */
export function validateApprovalLineNoInversion(params: {
  author?: ApprovalEmployeeLike | null;
  reviewer?: ApprovalEmployeeLike | null;
  approver?: ApprovalEmployeeLike | null;
  roleAuthor?: string | null;
  roleReviewer?: string | null;
  roleApprover?: string | null;
  departments?: ApprovalDepartmentLike[];
}): ApprovalLineValidationResult {
  const { author, reviewer, approver, roleAuthor, roleReviewer, roleApprover, departments } = params;

  const authorIsCeo = isCeoEmployee(author);
  const reviewerIsCeo = isCeoEmployee(reviewer) || (!reviewer && /대표/.test(String(roleReviewer || "")));
  const approverIsCeo = isCeoEmployee(approver) || (!approver && /대표/.test(String(roleApprover || "")));

  // 대표이사 본인 기안 전결 예외가 아닌 이상 대표이사는 결재선에 포함될 수 없음
  if (reviewerIsCeo && !(authorIsCeo && reviewer && author && Number(reviewer.id) === Number(author.id))) {
    return {
      valid: false,
      error: "대표이사는 검토자로 지정할 수 없습니다. (전사 부서장 전결 정책)",
    };
  }
  if (approverIsCeo && !(authorIsCeo && approver && author && Number(approver.id) === Number(author.id))) {
    return {
      valid: false,
      error: "대표이사는 승인자(전결권자)로 지정할 수 없습니다. 소속 부서장을 지정하세요.",
    };
  }

  const authorRank = getEffectiveApprovalRank(author, roleAuthor);
  const reviewerRank = reviewer
    ? getEffectiveApprovalRank(reviewer, roleReviewer)
    : inferApprovalRankFromText(roleReviewer);
  const approverRank = approver
    ? getEffectiveApprovalRank(approver, roleApprover)
    : inferApprovalRankFromText(roleApprover);

  if (reviewer || roleReviewer) {
    if (reviewerRank < authorRank) {
      return {
        valid: false,
        error: "결재선 역전 오류: 검토자는 작성자보다 하위 직급일 수 없습니다.",
      };
    }

    const isSameAsAuthor = Boolean(author && reviewer && Number(author.id) === Number(reviewer.id));
    const isSameAsApprover = Boolean(approver && reviewer && Number(approver.id) === Number(reviewer.id));
    if (author && reviewer && !isSameAsAuthor && !isSameAsApprover && reviewerRank === authorRank) {
      return {
        valid: false,
        error: "결재선 역전 오류: 중간 검토자는 작성자보다 상위 직급이어야 합니다.",
      };
    }
  }

  if (approver || roleApprover) {
    if (approverRank < authorRank) {
      return {
        valid: false,
        error: "결재선 역전 오류: 승인자는 작성자보다 하위 직급일 수 없습니다.",
      };
    }

    if ((reviewer || roleReviewer) && reviewerRank > approverRank) {
      return {
        valid: false,
        error: "결재선 역전 오류: 검토자가 승인자(전결권자)보다 상위 직급일 수 없습니다.",
      };
    }

    if (approver && !authorIsCeo && !isDepartmentHeadEmployee(approver, departments)) {
      return {
        valid: false,
        error: `결재 권한 오류: 승인자(${approver.name || ""})는 부서장(팀장/부장) 직책이 아닙니다. 모든 결재의 전결권자는 부서장이어야 합니다.`,
      };
    }
  }

  return { valid: true };
}
