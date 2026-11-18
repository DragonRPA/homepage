import {
  ApprovalDepartmentLike,
  isCeoEmployee,
  resolveWorkImprovementApprovalLine,
} from "@/lib/erpApprovalLine";

export interface NumberedItemsMap {
  currentProcGroup: string[];
  issueGroup: string[];
  solutionGroup: string[];
  quantGroup: string[];
  qualGroup: string[];
  budgetGroup: string[];
}

export interface PhotoItem {
  dataUrl: string;
  caption: string;
}

export interface AttachedFileItem {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface WorkImprovementReport {
  id?: number;
  reportNo?: string;
  summaryTarget: string;
  summaryDate: string;
  department: string;
  improveTypes: string[];
  authorId: number | null;
  roleAuthor: string;
  nameAuthor: string;
  reviewerId: number | null;
  roleReviewer: string;
  nameReviewer: string;
  statusReviewer: "검토완료" | "보완요청" | "대기중";
  dateReviewer: string;
  commentReviewer: string;
  approverId: number | null;
  roleApprover: string;
  nameApprover: string;
  statusApprover: "최종승인" | "반려" | "대기중";
  dateApprover: string;
  commentApprover: string;
  numberedItems: NumberedItemsMap;
  photos: PhotoItem[];
  attachedFiles: AttachedFileItem[];
  overallStatus?: string;
  approvalRequestId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeOption {
  id: number;
  employeeNo: string;
  name: string;
  department: string;
  departmentId?: number | null;
  position: string;
  duty?: string;
  role?: string;
  roleCode?: string;
  tierLevel?: number;
}

export const IMPROVE_TYPE_OPTIONS = [
  "업무 효율화 / 자동화",
  "오류 / 불량 개선",
  "비용 절감",
  "표준화 / 규격화",
  "기타",
];

export function getTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function getTodayDot(): string {
  const d = new Date();
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}`;
  }
  return isoDate;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function createBlankReport(
  currentUser: any,
  employees: EmployeeOption[],
  departments: ApprovalDepartmentLike[] = []
): WorkImprovementReport {
  const matchedAuthor =
    employees.find(
      (e) =>
        (currentUser?.id && Number(e.id) === Number(currentUser.id)) ||
        (currentUser?.name && e.name === currentUser.name)
    ) ||
    (currentUser
      ? {
          id: currentUser.id || 0,
          employeeNo: currentUser.employeeNo || "",
          name: currentUser.name || "",
          department: currentUser.department || "렌탈운영팀",
          departmentId: currentUser.departmentId ?? null,
          position: currentUser.position || "담당",
          duty: currentUser.duty || "",
          role: currentUser.role || "",
          roleCode: currentUser.roleCode || "",
          tierLevel: currentUser.tierLevel ?? currentUser.tier_level ?? 0,
        }
      : null);

  const { reviewer, approver, autoApprove } = resolveWorkImprovementApprovalLine(
    matchedAuthor,
    employees,
    departments
  );

  const authorIsCeo = isCeoEmployee(matchedAuthor);

  return {
    summaryTarget: "",
    summaryDate: getTodayIso(),
    department: currentUser?.department || matchedAuthor?.department || "렌탈운영팀",
    improveTypes: ["업무 효율화 / 자동화"],
    authorId: currentUser?.id ? Number(currentUser.id) : null,
    roleAuthor: currentUser?.duty || currentUser?.position || "담당",
    nameAuthor: currentUser?.name || "",
    reviewerId: reviewer && Number(reviewer.id) > 0 ? Number(reviewer.id) : null,
    roleReviewer:
      reviewer?.duty || reviewer?.position || (autoApprove ? "부서장" : "팀장"),
    nameReviewer: reviewer?.name || "",
    statusReviewer: "대기중",
    dateReviewer: getTodayDot(),
    commentReviewer: "",
    approverId: approver && Number(approver.id) > 0 ? Number(approver.id) : null,
    roleApprover: authorIsCeo ? "전결" : "부서장",
    nameApprover: approver?.name || "",
    statusApprover: "대기중",
    dateApprover: getTodayDot(),
    commentApprover: "",
    numberedItems: {
      currentProcGroup: [""],
      issueGroup: [""],
      solutionGroup: [""],
      quantGroup: [""],
      qualGroup: [""],
      budgetGroup: [""],
    },
    photos: [],
    attachedFiles: [],
    overallStatus: "DRAFT",
  };
}
