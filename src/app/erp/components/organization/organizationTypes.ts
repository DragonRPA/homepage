export interface ApprovalTierConfig {
  id?: string;
  category: "POSITION" | "DUTY";
  title: string;
  tier_level: number;
  description?: string;
  seq_order?: number;
}

export const DEFAULT_POSITION_TIERS: ApprovalTierConfig[] = [
  { category: "POSITION", title: "사원", tier_level: 0, description: "일반 실무 사원", seq_order: 1 },
  { category: "POSITION", title: "주임", tier_level: 0, description: "초임 실무 주임", seq_order: 2 },
  { category: "POSITION", title: "대리", tier_level: 1, description: "실무 담당 대리", seq_order: 3 },
  { category: "POSITION", title: "과장", tier_level: 2, description: "중간 실무 과장", seq_order: 4 },
  { category: "POSITION", title: "차장", tier_level: 3, description: "선임 차장", seq_order: 5 },
  { category: "POSITION", title: "부장", tier_level: 4, description: "부서 실무 총괄", seq_order: 6 },
  { category: "POSITION", title: "팀장", tier_level: 4, description: "부서/팀 운영 책임자", seq_order: 7 },
  { category: "POSITION", title: "이사", tier_level: 5, description: "임원 이사", seq_order: 8 },
  { category: "POSITION", title: "상무", tier_level: 6, description: "임원 상무", seq_order: 9 },
  { category: "POSITION", title: "전무", tier_level: 6, description: "임원 전무", seq_order: 10 },
  { category: "POSITION", title: "부사장", tier_level: 7, description: "최고 경영진 부사장", seq_order: 11 },
  { category: "POSITION", title: "사장", tier_level: 7, description: "최고 경영진 사장", seq_order: 12 },
  { category: "POSITION", title: "대표", tier_level: 7, description: "대표이사", seq_order: 13 },
  { category: "POSITION", title: "대표이사", tier_level: 7, description: "대표이사", seq_order: 14 },
];

export const DEFAULT_DUTY_TIERS: ApprovalTierConfig[] = [
  { category: "DUTY", title: "파트장", tier_level: 2, description: "단위 업무 파트 리더", seq_order: 1 },
  { category: "DUTY", title: "팀장", tier_level: 4, description: "부서/팀 운영 책임자", seq_order: 2 },
  { category: "DUTY", title: "센터장", tier_level: 5, description: "운영/서비스 센터 책임자", seq_order: 3 },
  { category: "DUTY", title: "공장장", tier_level: 5, description: "생산/정비 공장 책임자", seq_order: 4 },
  { category: "DUTY", title: "본부장", tier_level: 6, description: "사업 본부 총괄", seq_order: 5 },
  { category: "DUTY", title: "총괄", tier_level: 7, description: "전사 사업 부문 총괄", seq_order: 6 },
  { category: "DUTY", title: "대표이사", tier_level: 7, description: "최고 경영자", seq_order: 7 },
];

export function getUserEffectiveTier(
  user: { duty?: string | null; position?: string | null; tier_level?: number | null },
  dutyConfigs: ApprovalTierConfig[] = DEFAULT_DUTY_TIERS,
  positionConfigs: ApprovalTierConfig[] = DEFAULT_POSITION_TIERS
): {
  effectiveTier: number;
  source: "DUTY" | "POSITION" | "DEFAULT";
  title: string;
} {
  // 1. 직책 우선 판정 (R&R 단위 조직 책임자 권한 우선)
  if (user.duty && user.duty.trim()) {
    const trimmedDuty = user.duty.trim().toLowerCase();
    const matchedDuty = dutyConfigs.find((d) => d.title.trim().toLowerCase() === trimmedDuty);
    if (matchedDuty) {
      return {
        effectiveTier: matchedDuty.tier_level,
        source: "DUTY",
        title: matchedDuty.title,
      };
    }
  }

  // 2. 직급 판정 (Fallback for 소규모 기업 및 일반 사원)
  if (user.position && user.position.trim()) {
    const trimmedPos = user.position.trim().toLowerCase();
    const matchedPos = positionConfigs.find((p) => p.title.trim().toLowerCase() === trimmedPos);
    if (matchedPos) {
      return {
        effectiveTier: matchedPos.tier_level,
        source: "POSITION",
        title: matchedPos.title,
      };
    }
  }

  // 3. 교차 상호 판정
  if (user.position && user.position.trim()) {
    const trimmedPos = user.position.trim().toLowerCase();
    const matchedDutyFromPos = dutyConfigs.find((d) => d.title.trim().toLowerCase() === trimmedPos);
    if (matchedDutyFromPos) {
      return {
        effectiveTier: matchedDutyFromPos.tier_level,
        source: "DUTY",
        title: matchedDutyFromPos.title,
      };
    }
  }

  if (user.duty && user.duty.trim()) {
    const trimmedDuty = user.duty.trim().toLowerCase();
    const matchedPosFromDuty = positionConfigs.find((p) => p.title.trim().toLowerCase() === trimmedDuty);
    if (matchedPosFromDuty) {
      return {
        effectiveTier: matchedPosFromDuty.tier_level,
        source: "POSITION",
        title: matchedPosFromDuty.title,
      };
    }
  }

  return {
    effectiveTier: user.tier_level ?? 0,
    source: "DEFAULT",
    title: user.position || "사원",
  };
}

export interface FunctionalAttributeConfig {
  id: string;
  code: string;
  label: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export const UNIVERSAL_FUNCTIONAL_ATTRIBUTES: FunctionalAttributeConfig[] = [
  { id: "ATTR_PRODUCTION", code: "PRODUCTION", label: "생산", description: "신규 장비 검수, 제작, 조립, 부품 볼팅, 초기 셋업", color: "#6366f1", badgeBg: "#eef2ff", badgeText: "#4338ca" },
  { id: "ATTR_SALES", code: "SALES", label: "영업", description: "고객 견적, 계약 체결, 대차 요구 의뢰 발의", color: "#2563eb", badgeBg: "#eff6ff", badgeText: "#1d4ed8" },
  { id: "ATTR_DISPATCH", code: "DISPATCH", label: "배차", description: "운송 차량 섭외, 배차 지시, 배차 대장 관리, 운송료 정산", color: "#d97706", badgeBg: "#fffbeb", badgeText: "#b45309" },
  { id: "ATTR_OUTBOUND", code: "OUTBOUND", label: "출고", description: "출고 전 점검, 안전옵션 장착, 출고 검수 승인", color: "#059669", badgeBg: "#ecfdf5", badgeText: "#047857" },
  { id: "ATTR_AFTER_SERVICE", code: "AFTER_SERVICE", label: "현장AS", description: "출동 수리, 긴급 고장 조치, 현장 경정비, 순회 점검", color: "#e11d48", badgeBg: "#fff1f2", badgeText: "#be123c" },
  { id: "ATTR_INBOUND", code: "INBOUND", label: "입고정비", description: "반납 장비 입고 확인, 세척, 입고 검사, 공장 정비 및 부품 교체", color: "#0891b2", badgeBg: "#ecfeff", badgeText: "#0e7490" },
  { id: "ATTR_ASSET", code: "ASSET", label: "자산", description: "장비 등록, 타사 임차(전대) 매핑, 장비 매각/폐기, 자산 현황", color: "#9333ea", badgeBg: "#faf5ff", badgeText: "#7e22ce" },
  { id: "ATTR_BILLING", code: "BILLING", label: "청구", description: "월말 정산, 전자세금계산서 발행, 외상매출금 관리, 통장 대사", color: "#0d9488", badgeBg: "#f0fdfa", badgeText: "#0f766e" },
  { id: "ATTR_ADMIN", code: "ADMIN", label: "총무/관리", description: "급여, 법인카드, 소모품, 일반 행정, 사용자/부서 관리", color: "#475569", badgeBg: "#f8fafc", badgeText: "#334155" },
];

export interface Department {
  id: string;
  deptCode?: string;
  name: string;
  deptName?: string;
  parentDepartmentId: string | null;
  parentId?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  sortOrder?: number;
  functionalTags?: string[];
  functional_tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export function getDepartmentFunctionalTags(dept: Department | null | undefined): string[] {
  if (!dept) return [];
  const tags = dept.functionalTags || dept.functional_tags || [];
  return Array.isArray(tags) ? tags : [];
}

export interface UserNode {
  id: string;
  employeeNo?: string;
  name: string;
  departmentId: string | null;
  department?: string;
  position: string;
  duty?: string;
  tier_level?: number;
  status: "ACTIVE" | "LEAVE_OF_ABSENCE" | "RETIRED";
  role: string;
  roleCode?: string;
  loginId?: string;
  passwordHash?: string;
  birthDate?: string;
  joinDate?: string;
  leaveDate?: string;
  baseSalary?: number;
  hourlyWage?: number;
  mealAllowance?: number;
  vehicleAllowance?: number;
  insNationalPension?: boolean;
  insHealthInsurance?: boolean;
  insEmploymentInsurance?: boolean;
  insIndustrialAccident?: boolean;
  salaryBankName?: string;
  salaryAccountNo?: string;
  salaryAccountHolder?: string;
  address?: string;
  phone?: string;
  email?: string;
  profileImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return "-";
  const cleaned = String(phone).trim();
  return cleaned.replace(/(\d{2,3})-?(\d{3,4})-?(\d{4})/, "$1-****-$3");
}

export function maskEmail(email?: string | null): string {
  if (!email) return "-";
  const parts = String(email).split("@");
  if (parts.length !== 2) return email;
  const id = parts[0];
  const maskedId = id.length <= 2 ? id[0] + "*" : id.slice(0, 2) + "***";
  return `${maskedId}@${parts[1]}`;
}

export function maskName(name?: string | null): string {
  if (!name) return "-";
  if (name.length <= 2) return name[0] + "*";
  return name[0] + "*" + name.slice(2);
}

export function maskAddress(addr?: string | null): string {
  if (!addr) return "-";
  return addr.slice(0, 8) + " ***";
}

export interface OrganizationTabProps {
  currentUser: any;
}
