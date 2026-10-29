"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Network,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  GripVertical,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Upload,
  Save,
  X,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Download,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

// ============================================================================
// 🏛️ eBro ERP SSOT Types & Constants (인사 및 조직도 마스터 설정 표준)
// ============================================================================

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

function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return "-";
  const cleaned = String(phone).trim();
  return cleaned.replace(/(\d{2,3})-?(\d{3,4})-?(\d{4})/, "$1-****-$3");
}

function maskEmail(email?: string | null): string {
  if (!email) return "-";
  const parts = String(email).split("@");
  if (parts.length !== 2) return email;
  const id = parts[0];
  const maskedId = id.length <= 2 ? id[0] + "*" : id.slice(0, 2) + "***";
  return `${maskedId}@${parts[1]}`;
}

function maskName(name?: string | null): string {
  if (!name) return "-";
  if (name.length <= 2) return name[0] + "*";
  return name[0] + "*" + name.slice(2);
}

function maskAddress(addr?: string | null): string {
  if (!addr) return "-";
  return addr.slice(0, 8) + " ***";
}

interface OrganizationTabProps {
  currentUser: any;
}

export const OrganizationTab: React.FC<OrganizationTabProps> = ({ currentUser }) => {
  const isSuperAdmin =
    currentUser?.loginId === "admin" ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "ADMIN";
  const canEdit = isSuperAdmin || currentUser?.roleCode === "ADMIN" || currentUser?.roleCode === "HR_STAFF";
  const canViewPayroll = isSuperAdmin || currentUser?.roleCode === "ACCOUNTANT" || currentUser?.roleCode === "HR_STAFF";
  const isPrivileged = isSuperAdmin;

  // --- States ---
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserNode[]>([]);

  const [dutyConfigs] = useState<ApprovalTierConfig[]>(DEFAULT_DUTY_TIERS);
  const [positionConfigs] = useState<ApprovalTierConfig[]>(DEFAULT_POSITION_TIERS);

  // Enforce manager policies across departments (eBro ERP 표준 로직)
  const enforceManagerPolicies = (usersList: UserNode[], deptList: Department[]) => {
    let updated = [...usersList];
    deptList.forEach((dept) => {
      const deptUsers = updated.filter((u) => u.departmentId === dept.id);
      if (deptUsers.length === 0) return;
      const managers = deptUsers.filter((u) => u.role === "MANAGER");
      const isTop = dept.parentDepartmentId === null;
      if (isTop) {
        if (managers.length > 0) {
          const first = managers[0];
          updated = updated.map((u) => {
            if (u.loginId === "admin" || u.role === "SUPER_ADMIN") return u;
            if (u.id === first.id) return { ...u, role: "ADMIN" };
            if (u.role === "MANAGER" && u.departmentId === dept.id) return { ...u, role: "USER" };
            return u;
          });
        } else if (deptUsers.length === 1) {
          const sole = deptUsers[0];
          if (sole.loginId !== "admin" && sole.role !== "SUPER_ADMIN") {
            updated = updated.map((u) => (u.id === sole.id ? { ...u, role: "ADMIN" } : u));
          }
        }
      } else {
        if (managers.length > 1) {
          const first = managers[0];
          updated = updated.map((u) => {
            if (u.loginId === "admin" || u.role === "SUPER_ADMIN") return u;
            if (u.id === first.id) return u;
            if (u.role === "MANAGER" && u.departmentId === dept.id) return { ...u, role: "USER" };
            return u;
          });
        } else if (managers.length === 0 && deptUsers.length === 1) {
          const sole = deptUsers[0];
          if (sole.loginId !== "admin" && sole.role !== "SUPER_ADMIN" && sole.role !== "ADMIN") {
            updated = updated.map((u) => (u.id === sole.id ? { ...u, role: "MANAGER" } : u));
          }
        }
      }
    });
    return updated;
  };

  // Selection States
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"DEPT" | "UNASSIGNED">("DEPT");

  // Editing Dept States
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState<string>("");

  // Profile Modal State (Slide-out)
  const [selectedProfile, setSelectedProfile] = useState<UserNode | null>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());

  const toggleRevealPhone = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Handoff Modal State (퇴사 처리 및 업무 이관)
  const [showHandoffModal, setShowHandoffModal] = useState<UserNode | null>(null);

  // 부서 삭제 확인 모달 상태 (헌장 5.2: 브라우저 confirm 퇴출)
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

  // 오류 모달 상태 (헌장 5.2: showErrorModal)
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const showErrorModal = (message: string, title: string = "오류 안내") => {
    setErrorModal({ title, message });
  };

  // 토스트 알림 상태
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" | "warning" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Hidden File Input Ref for photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data load status
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 전사 조직 및 구성원 현황 대차대조 집계 (헌장 3.5 & 5.5)
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.status === "ACTIVE").length;
  const leaveUsersCount = users.filter((u) => u.status === "LEAVE_OF_ABSENCE").length;
  const retiredUsersCount = users.filter((u) => u.status === "RETIRED").length;
  const assignedUsersCount = users.filter((u) => u.departmentId !== null).length;
  const unassignedUsersCount = users.filter((u) => u.departmentId === null).length;
  const totalDeptsCount = departments.length;
  const userStatusSum = activeUsersCount + leaveUsersCount + retiredUsersCount;
  const userBalanceDiff = Math.abs(totalUsersCount - userStatusSum);

  // --- Persistence Load from DB ---
  const loadOrganizationData = async (preserveSelection = false) => {
    try {
      const [deptRes, empRes] = await Promise.all([
        fetch("/api/erp/departments"),
        fetch("/api/erp/employees"),
      ]);
      const deptData = await deptRes.json();
      const empData = await empRes.json();

      const rawDepts: any[] = deptData.departments || [];
      const rawEmps: any[] = empData.employees || [];

      const loadedDepts: Department[] = rawDepts.map((d) => ({
        id: String(d.id),
        deptCode: d.deptCode,
        name: d.name || d.deptName || "",
        deptName: d.deptName || d.name || "",
        parentDepartmentId:
          d.parentDepartmentId !== null && d.parentDepartmentId !== undefined && d.parentDepartmentId !== ""
            ? String(d.parentDepartmentId)
            : d.parentId !== null && d.parentId !== undefined && d.parentId !== ""
            ? String(d.parentId)
            : null,
        managerName: d.managerName || null,
        sortOrder: d.sortOrder || 10,
        functionalTags: Array.isArray(d.functionalTags || d.functional_tags) ? (d.functionalTags || d.functional_tags) : [],
        functional_tags: Array.isArray(d.functional_tags || d.functionalTags) ? (d.functional_tags || d.functionalTags) : [],
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));

      const validDeptIds = new Set(loadedDepts.map((d) => d.id));
      const deptNameToId = new Map(loadedDepts.map((d) => [d.name, d.id]));

      const loadedUsers: UserNode[] = rawEmps.map((e) => {
        let resolvedDeptId: string | null =
          e.departmentId !== null && e.departmentId !== undefined && e.departmentId !== ""
            ? String(e.departmentId)
            : null;
        if (!resolvedDeptId && e.department && deptNameToId.has(e.department)) {
          resolvedDeptId = deptNameToId.get(e.department) || null;
        }
        // 고아(Orphan) 직원 구출: 현재 존재하지 않는 부서 ID를 가진 직원은 '미배정(null)'으로 강제 이동
        if (resolvedDeptId && !validDeptIds.has(resolvedDeptId)) {
          resolvedDeptId = null;
        }

        const rawSt = String(e.status || e.employmentStatus || "ACTIVE").toUpperCase();
        const normStatus: UserNode["status"] =
          rawSt === "LEAVE" || rawSt === "LEAVE_OF_ABSENCE" || rawSt === "ON_LEAVE"
            ? "LEAVE_OF_ABSENCE"
            : rawSt === "RETIRED" || rawSt === "RESIGNED"
            ? "RETIRED"
            : "ACTIVE";

        return {
          id: String(e.id),
          employeeNo: e.employeeNo,
          name: e.name || "",
          departmentId: resolvedDeptId,
          department: resolvedDeptId ? (loadedDepts.find((d) => d.id === resolvedDeptId)?.name || e.department || "") : "",
          position: e.position || "사원",
          duty: e.duty || "",
          tier_level: e.tier_level ?? e.tierLevel ?? 0,
          status: normStatus,
          role: e.role === "SUPER_ADMIN" ? "ADMIN" : (e.role || "USER"),
          roleCode: e.roleCode || "EMPLOYEE",
          loginId: e.loginId || "",
          passwordHash: "__HASHED__",
          birthDate: e.birthDate ? String(e.birthDate).substring(0, 10) : "",
          joinDate: e.joinDate ? String(e.joinDate).substring(0, 10) : "",
          leaveDate: e.leaveDate ? String(e.leaveDate).substring(0, 10) : "",
          baseSalary: Number(e.baseSalary ?? 3500000),
          hourlyWage:
            Number(e.hourlyWage) > 0
              ? Number(e.hourlyWage)
              : Math.round(Number(e.baseSalary ?? 3500000) / 209),
          mealAllowance: Number(e.mealAllowance ?? 200000),
          vehicleAllowance: Number(e.vehicleAllowance ?? 0),
          salaryBankName: e.salaryBankName || "",
          salaryAccountNo: e.salaryAccountNo || "",
          salaryAccountHolder: e.salaryAccountHolder || "",
          address: e.address || "",
          phone: e.phone || "",
          email: e.email || "",
          profileImageUrl: e.profileImageUrl || undefined,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        };
      });

      setDepartments(loadedDepts);
      setUsers(loadedUsers);

      if (!preserveSelection && loadedDepts.length > 0 && !selectedDeptId) {
        setSelectedDeptId(loadedDepts[0].id);
        setActiveTab("DEPT");
      }

      setIsLoaded(true);
      setTimeout(() => setIsDirty(false), 50);
    } catch (err: any) {
      showErrorModal(`조직 및 인사 데이터를 불러오는 중 오류가 발생했습니다:\n${err.message}`, "데이터 로드 오류");
    }
  };

  useEffect(() => {
    loadOrganizationData(false);
  }, []);

  // --- Unload Warning ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // --- Batch Save Helper (Syncs Departments & Users to PostgreSQL) ---
  const syncOrganizationBatchToDb = async (
    nextDepts: Department[],
    nextUsers: UserNode[],
    silentToast = false
  ): Promise<{ departments: Department[]; users: UserNode[] } | null> => {
    try {
      setIsSaving(true);
      const cleanDepts = nextDepts.map((d, idx) => ({
        ...d,
        name: d.name?.trim() || "새 부서",
        deptName: d.name?.trim() || "새 부서",
        sortOrder: d.sortOrder ?? (idx + 1) * 10,
        functional_tags: d.functional_tags || d.functionalTags || [],
        functionalTags: d.functionalTags || d.functional_tags || [],
      }));

      const cleanUsers = nextUsers.map((u) => {
        const dept = cleanDepts.find((d) => d.id === u.departmentId);
        const eff = getUserEffectiveTier(u, dutyConfigs, positionConfigs);
        return {
          ...u,
          tier_level: eff.effectiveTier,
          department: dept ? dept.name : "",
        };
      });

      const res = await fetch("/api/erp/organization/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departments: cleanDepts,
          users: cleanUsers,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "조직도 일괄 저장 실패");
      }

      const savedDepts: Department[] = (data.departments || []).map((d: any) => ({
        id: String(d.id),
        deptCode: d.deptCode,
        name: d.name || d.deptName || "",
        deptName: d.deptName || d.name || "",
        parentDepartmentId:
          d.parentDepartmentId !== null && d.parentDepartmentId !== undefined && d.parentDepartmentId !== ""
            ? String(d.parentDepartmentId)
            : null,
        managerName: d.managerName || null,
        sortOrder: d.sortOrder || 10,
        functionalTags: Array.isArray(d.functionalTags) ? d.functionalTags : [],
        functional_tags: Array.isArray(d.functional_tags) ? d.functional_tags : [],
      }));

      const savedUsers: UserNode[] = (data.users || []).map((e: any) => ({
        id: String(e.id),
        employeeNo: e.employeeNo,
        name: e.name || "",
        departmentId:
          e.departmentId !== null && e.departmentId !== undefined && e.departmentId !== ""
            ? String(e.departmentId)
            : null,
        department: e.department || "",
        position: e.position || "사원",
        duty: e.duty || "",
        tier_level: e.tier_level ?? e.tierLevel ?? 0,
        status: e.status || "ACTIVE",
        role: e.role === "SUPER_ADMIN" ? "ADMIN" : (e.role || "USER"),
        roleCode: e.roleCode || "EMPLOYEE",
        loginId: e.loginId || "",
        passwordHash: "__HASHED__",
        birthDate: e.birthDate ? String(e.birthDate).substring(0, 10) : "",
        joinDate: e.joinDate ? String(e.joinDate).substring(0, 10) : "",
        leaveDate: e.leaveDate ? String(e.leaveDate).substring(0, 10) : "",
        baseSalary: Number(e.baseSalary ?? 3500000),
        hourlyWage:
          Number(e.hourlyWage) > 0
            ? Number(e.hourlyWage)
            : Math.round(Number(e.baseSalary ?? 3500000) / 209),
        mealAllowance: Number(e.mealAllowance ?? 200000),
        vehicleAllowance: Number(e.vehicleAllowance ?? 0),
        salaryBankName: e.salaryBankName || "",
        salaryAccountNo: e.salaryAccountNo || "",
        salaryAccountHolder: e.salaryAccountHolder || "",
        address: e.address || "",
        phone: e.phone || "",
        email: e.email || "",
        profileImageUrl: e.profileImageUrl || undefined,
      }));

      setDepartments(savedDepts);
      setUsers(savedUsers);
      setIsDirty(false);

      if (!silentToast) {
        showToast("조직도 및 구성원 마스터 데이터가 데이터베이스에 성공적으로 저장되었습니다.");
      }
      return { departments: savedDepts, users: savedUsers };
    } catch (err: any) {
      console.error("Organization batch save error:", err);
      showErrorModal(
        `조직도 및 구성원 저장 중 DB 동기화 오류가 발생했습니다:\n${err.message || JSON.stringify(err)}`,
        "조직도 DB 저장 오류"
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // --- Manual Save (Batch to Supabase/DB) ---
  const handleSaveAll = async () => {
    await syncOrganizationBatchToDb(departments, users, false);
  };

  // --- Action Handlers ---
  const handleToggleDeptFunctionalTag = (deptId: string, attrId: string) => {
    if (!canEdit) return;
    const nextDepts = departments.map((d) => {
      if (d.id !== deptId) return d;
      const currentTags = getDepartmentFunctionalTags(d);
      const exists = currentTags.includes(attrId);
      const nextTags = exists ? currentTags.filter((t) => t !== attrId) : [...currentTags, attrId];
      return {
        ...d,
        functional_tags: nextTags,
        functionalTags: nextTags,
        updatedAt: new Date().toISOString(),
      };
    });
    setDepartments(nextDepts);
    setIsDirty(true);
  };

  const handleAddDept = (forceRoot: boolean = false) => {
    if (!canEdit) return;
    const nowIso = new Date().toISOString();
    const newId = `new-dept-${Date.now()}`;
    const newDept: Department = {
      id: newId,
      name: "",
      parentDepartmentId: forceRoot ? null : selectedDeptId || null,
      functional_tags: [],
      functionalTags: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setDepartments([...departments, newDept]);
    setEditingDeptId(newDept.id);
    setEditingDeptName("");
    setIsDirty(true);
  };

  const handleDeleteDept = (e: React.MouseEvent, deptId: string) => {
    e.stopPropagation();
    if (!canEdit) return;
    const targetDept = departments.find((d) => d.id === deptId);
    if (!targetDept) return;

    const hasChildren = departments.some((d) => d.parentDepartmentId === deptId);
    const hasUsers = users.some((u) => u.departmentId === deptId);
    if (hasChildren || hasUsers) {
      showErrorModal(
        `소속된 하위 부서나 직원이 존재하여 부서 [${targetDept.name || targetDept.id}]을(를) 삭제할 수 없습니다.\n` +
          `소속 직원을 먼저 인사이동하거나 하위 부서를 먼저 정리해 주십시오.`,
        "부서 삭제 불가"
      );
      return;
    }
    setDeptToDelete(targetDept);
  };

  const confirmDeleteDept = async () => {
    if (!deptToDelete) return;
    const deptId = deptToDelete.id;
    const deletedName = deptToDelete.name || deptToDelete.id;
    const nextDepts = departments.filter((d) => d.id !== deptId);
    setDepartments(nextDepts);
    if (selectedDeptId === deptId) {
      setSelectedDeptId(null);
      setActiveTab("UNASSIGNED");
    }
    setDeptToDelete(null);
    setIsDirty(true);
    await syncOrganizationBatchToDb(nextDepts, users, true);
    showToast(`부서 [${deletedName}]이(가) 정상 삭제되었습니다.`);
  };

  const handleAddUser = () => {
    if (!canEdit) return;
    const nowIso = new Date().toISOString();
    const defaultPos = positionConfigs[0]?.title || "사원";
    const initialTier = getUserEffectiveTier({ position: defaultPos, duty: "" }, dutyConfigs, positionConfigs).effectiveTier;
    const newUser: UserNode = {
      id: `new-user-${Date.now()}`,
      name: "",
      departmentId: null, // eBro ERP 표준: 무조건 미배정 인력풀로 생성
      department: "",
      position: defaultPos,
      duty: "",
      tier_level: initialTier,
      status: "ACTIVE",
      role: "USER",
      loginId: "",
      passwordHash: "",
      baseSalary: 3500000,
      hourlyWage: Math.round(3500000 / 209),
      mealAllowance: 200000,
      vehicleAllowance: 0,
      salaryBankName: "",
      salaryAccountNo: "",
      salaryAccountHolder: "",
      joinDate: nowIso.substring(0, 10),
      leaveDate: "",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    let updated = [...users, newUser];
    updated = enforceManagerPolicies(updated, departments);
    setUsers(updated);
    setActiveTab("UNASSIGNED");
    setSelectedProfile(newUser);
    setShowPasswordInput(false);
    setIsDirty(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedProfile) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setSelectedProfile((prev) => (prev ? { ...prev, profileImageUrl: reader.result as string } : null));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Drag & Drop Handlers (임직원 카드 드래그 ➔ 부서 트리 / 미배정 인력풀 드롭 배속) ---
  const handleDragStart = (e: React.DragEvent, userId: string) => {
    if (!canEdit) return;
    setDraggedUserId(userId);
    e.dataTransfer.setData("text/plain", userId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropToDept = async (e: React.DragEvent, targetDeptId: string) => {
    e.preventDefault();
    const droppedUserId = draggedUserId || e.dataTransfer.getData("text/plain");
    if (!canEdit || !droppedUserId) return;

    const targetDept = departments.find((d) => d.id === targetDeptId);
    const targetUser = users.find((u) => u.id === droppedUserId);
    let updated = users.map((u) =>
      u.id === droppedUserId ? { ...u, departmentId: targetDeptId, department: targetDept?.name || "" } : u
    );
    updated = enforceManagerPolicies(updated, departments);
    setUsers(updated);
    setDraggedUserId(null);
    setIsDirty(true);
    showToast(
      `[${targetUser?.name || "신규직원"}] 님이 [${targetDept?.name || "선택 부서"}] 소속으로 배속되었습니다.`
    );
  };

  const handleDropToPool = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedUserId = draggedUserId || e.dataTransfer.getData("text/plain");
    if (!canEdit || !droppedUserId) return;

    const targetUser = users.find((u) => u.id === droppedUserId);
    let updated = users.map((u) =>
      u.id === droppedUserId ? { ...u, departmentId: null, department: "" } : u
    );
    updated = enforceManagerPolicies(updated, departments);
    setUsers(updated);
    setDraggedUserId(null);
    setIsDirty(true);
    showToast(`[${targetUser?.name || "직원"}] 님이 미배정 인력 목록으로 이동되었습니다.`);
  };

  // --- Department Inline Edit Handlers ---
  const startEditDept = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation();
    if (!canEdit) return;
    setEditingDeptId(dept.id);
    setEditingDeptName(dept.name);
  };

  const commitEditDept = () => {
    if (!editingDeptId) return;
    const trimmed = editingDeptName.trim();
    if (trimmed) {
      setDepartments((prev) =>
        prev.map((d) => (d.id === editingDeptId ? { ...d, name: trimmed, deptName: trimmed } : d))
      );
      setIsDirty(true);
    } else {
      // 이름 미입력 상태로 생성 직후 취소된 빈 신규 부서는 제거
      const target = departments.find((d) => d.id === editingDeptId);
      if (target && !target.name && String(target.id).startsWith("new-dept-")) {
        setDepartments((prev) => prev.filter((d) => d.id !== editingDeptId));
      }
    }
    setEditingDeptId(null);
  };

  const handleDeptKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEditDept();
    if (e.key === "Escape") {
      const target = departments.find((d) => d.id === editingDeptId);
      if (target && !target.name && String(target.id).startsWith("new-dept-")) {
        setDepartments((prev) => prev.filter((d) => d.id !== editingDeptId));
      }
      setEditingDeptId(null);
    }
  };

  // --- Profile Handlers ---
  const handleStatusChange = async (userId: string, newStatus: UserNode["status"]) => {
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser && targetUser.loginId === "admin") {
      showErrorModal("관리자(대표이사) 계정은 재직 상태를 변경(퇴사/휴직 처리)할 수 없습니다.", "상태 변경 불가");
      return;
    }

    if (newStatus === "RETIRED") {
      if (targetUser) setShowHandoffModal(targetUser);
    } else {
      const nextUsers = users.map((u) =>
        u.id === userId
          ? { ...u, status: newStatus, leaveDate: newStatus === "ACTIVE" ? "" : u.leaveDate }
          : u
      );
      setUsers(nextUsers);
      if (selectedProfile && selectedProfile.id === userId) {
        setSelectedProfile({
          ...selectedProfile,
          status: newStatus,
          leaveDate: newStatus === "ACTIVE" ? "" : selectedProfile.leaveDate,
        });
      }
      setIsDirty(true);
      showToast(
        `재직 상태가 [${
          newStatus === "ACTIVE" ? "재직" : newStatus === "LEAVE_OF_ABSENCE" ? "휴직" : "퇴사"
        }] (으)로 변경되었습니다.`
      );
    }
  };

  const confirmRetirement = async () => {
    if (showHandoffModal) {
      if (showHandoffModal.loginId === "admin") {
        showErrorModal("관리자 계정은 퇴사 처리가 불가능합니다.", "퇴사 처리 불가");
        setShowHandoffModal(null);
        return;
      }
      const defaultRetireDate =
        showHandoffModal.leaveDate ||
        (selectedProfile?.id === showHandoffModal.id && selectedProfile.leaveDate) ||
        new Date().toISOString().substring(0, 10);
      const retiredUser: UserNode = {
        ...showHandoffModal,
        status: "RETIRED",
        leaveDate: defaultRetireDate,
      };
      const nextUsers = users.map((u) => (u.id === showHandoffModal.id ? retiredUser : u));
      setUsers(nextUsers);
      if (selectedProfile?.id === showHandoffModal.id) {
        setSelectedProfile((prev) =>
          prev ? { ...prev, status: "RETIRED", leaveDate: defaultRetireDate } : null
        );
      }
      setShowHandoffModal(null);
      setIsDirty(true);
      await syncOrganizationBatchToDb(departments, nextUsers, true);
      showToast(`${showHandoffModal.name} 직원의 퇴사 및 업무 이관 처리가 완료되었습니다.`);
    }
  };

  const applyProfileChanges = async () => {
    if (selectedProfile) {
      if (!selectedProfile.name || !selectedProfile.name.trim()) {
        showErrorModal("임직원 성명을 입력해 주십시오.", "필수값 누락");
        return;
      }
      if (selectedProfile.loginId === "admin" && selectedProfile.role !== "ADMIN") {
        showErrorModal("시스템 대표 관리자의 시스템 역할은 변경할 수 없습니다.", "역할 변경 불가");
        return;
      }
      if (selectedProfile.role === "ADMIN" && !isSuperAdmin) {
        showErrorModal("ADMIN 시스템 역할은 관리자 계정만 부여할 수 있습니다.", "권한 부여 제한");
        return;
      }
      const eff = getUserEffectiveTier(
        { position: selectedProfile.position, duty: selectedProfile.duty },
        dutyConfigs,
        positionConfigs
      );
      const profileWithTier: UserNode = {
        ...selectedProfile,
        name: selectedProfile.name.trim(),
        tier_level: eff.effectiveTier,
      };

      let updated = users.map((u) => (u.id === selectedProfile.id ? profileWithTier : u));
      updated = enforceManagerPolicies(updated, departments);

      setUsers(updated);
      setSelectedProfile(null);

      // 즉시 DB 동기화 수행하여 새로고침 시에도 완벽 보존
      const saved = await syncOrganizationBatchToDb(departments, updated, true);
      if (saved) {
        showToast("임직원 프로필 및 시스템 역할 설정이 성공적으로 저장되었습니다.");
      }
    }
  };

  // 임직원 대장 엑셀(CSV) 내보내기
  const handleExportOrgExcel = () => {
    if (users.length === 0) {
      showToast("내보낼 임직원 데이터가 없습니다.", "error");
      return;
    }
    const deptMap = new Map(departments.map((d) => [d.id, d.name]));
    const headers = [
      "순번",
      "성명",
      "아이디",
      "소속부서",
      "직급",
      "직책",
      "결재티어",
      "역할/권한",
      "재직상태",
      "입사일",
      "퇴사일",
      "생년월일",
      "연락처",
      "이메일",
      "주소",
      "급여은행",
      "급여계좌번호",
      "예금주",
      ...(canViewPayroll || canEdit ? ["기본급(원)", "식대(원)", "차량보조금(원)", "1시간 표준임금(원)"] : []),
    ];

    const csvRows = [headers.join(",")];
    users.forEach((u, idx) => {
      const deptName = u.departmentId
        ? deptMap.get(u.departmentId) || u.department || "미지정"
        : u.department || "미배치";
      const statusLabel = u.status === "ACTIVE" ? "재직" : u.status === "RETIRED" ? "퇴사" : "휴직";
      const eff = getUserEffectiveTier(u, dutyConfigs, positionConfigs);
      const cols = [
        idx + 1,
        isPrivileged ? u.name || "-" : maskName(u.name),
        u.loginId || "-",
        deptName,
        u.position || "-",
        u.duty || "-",
        `${eff.effectiveTier}티어`,
        u.role || "USER",
        statusLabel,
        u.joinDate || "-",
        u.leaveDate || "-",
        isPrivileged ? u.birthDate || "-" : u.birthDate ? `${u.birthDate.slice(0, 7)}-**` : "-",
        isPrivileged ? u.phone || "-" : maskPhoneNumber(u.phone),
        isPrivileged ? u.email || "-" : maskEmail(u.email),
        `"${(isPrivileged ? u.address || "-" : maskAddress(u.address)).replace(/"/g, '""')}"`,
        u.salaryBankName || "-",
        isPrivileged || canViewPayroll ? (u.salaryAccountNo || "-") : (u.salaryAccountNo ? u.salaryAccountNo.slice(0, 4) + "-****" : "-"),
        isPrivileged || canViewPayroll ? (u.salaryAccountHolder || u.name || "-") : maskName(u.salaryAccountHolder || u.name),
        ...(canViewPayroll || canEdit
          ? [
              u.baseSalary || 0,
              u.mealAllowance ?? 200000,
              u.vehicleAllowance ?? 0,
              u.hourlyWage || Math.round((u.baseSalary || 3500000) / 209),
            ]
          : []),
      ];
      csvRows.push(cols.join(","));
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `임직원대장_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`임직원 대장 ${users.length}명 엑셀 내보내기 완료 (${isPrivileged ? "전체 정보" : "마스킹 적용"})`);
  };

  // --- Renders ---
  const renderDeptTree = (parentId: string | null, depth: number = 0) => {
    const children = departments.filter((d) => d.parentDepartmentId === parentId);
    if (children.length === 0) return null;

    return (
      <div
        data-hs-observe="organizationsettings"
        data-mid="org-header"
        data-subview="organization"
        style={{ marginLeft: depth > 0 ? "16px" : "0" }}
      >
        {children.map((dept) => {
          const isSelected = selectedDeptId === dept.id && activeTab === "DEPT";
          const userCount = users.filter((u) => u.departmentId === dept.id).length;

          return (
            <div key={dept.id}>
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropToDept(e, dept.id)}
                onClick={() => {
                  if (editingDeptId !== dept.id) {
                    setSelectedDeptId(dept.id);
                    setActiveTab("DEPT");
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 12px",
                  margin: "3px 0",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: isSelected ? "var(--primary-light)" : "transparent",
                  color: isSelected ? "var(--primary)" : "var(--text-main)",
                  border: isSelected ? "1px solid var(--primary-border)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  borderStyle: draggedUserId ? "dashed" : "solid",
                  whiteSpace: "nowrap",
                }}
                className={draggedUserId ? "drop-target-active" : ""}
              >
                <span
                  style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    color: isSelected ? "var(--primary)" : "var(--text-muted)",
                  }}
                >
                  {departments.some((d) => d.parentDepartmentId === dept.id) ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </span>

                {editingDeptId === dept.id ? (
                  <input
                    type="text"
                    placeholder="부서명 입력 (예: 영남영업소)"
                    value={editingDeptName}
                    onChange={(e) => setEditingDeptName(e.target.value)}
                    onBlur={commitEditDept}
                    onKeyDown={handleDeptKeyDown}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      padding: "2px 6px",
                      fontSize: "13.5px",
                      height: "auto",
                      borderRadius: "4px",
                    }}
                  />
                ) : (
                  <>
                    <span
                      style={{
                        fontWeight: isSelected ? "600" : "500",
                        flex: "1 1 auto",
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: dept.name ? "inherit" : "var(--text-muted)",
                        fontSize: "13.5px",
                      }}
                      title={dept.name || "새 부서(명칭 미입력)"}
                    >
                      {dept.name || "새 부서(명칭 미입력)"}
                    </span>

                    <div
                      style={{
                        display: "flex",
                        gap: "3px",
                        alignItems: "center",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getDepartmentFunctionalTags(dept)
                        .slice(0, 3)
                        .map((tagId) => {
                          const attr = UNIVERSAL_FUNCTIONAL_ATTRIBUTES.find(
                            (a) => a.id === tagId || a.code === tagId
                          );
                          if (!attr) return null;
                          return (
                            <span
                              key={attr.id}
                              style={{
                                fontSize: "10.5px",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                backgroundColor: attr.badgeBg,
                                color: attr.badgeText,
                                border: `1px solid ${attr.color}33`,
                                whiteSpace: "nowrap",
                                fontWeight: "600",
                                flexShrink: 0,
                              }}
                              title={attr.description}
                            >
                              {attr.label}
                            </span>
                          );
                        })}
                      {getDepartmentFunctionalTags(dept).length > 3 && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          +{getDepartmentFunctionalTags(dept).length - 3}
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        backgroundColor: isSelected ? "rgba(59, 130, 246, 0.15)" : "var(--bg-card)",
                        borderRadius: "10px",
                        color: isSelected ? "var(--primary)" : "var(--text-secondary)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        fontWeight: 600,
                      }}
                    >
                      {userCount}명
                    </span>

                    {canEdit && isSelected && (
                      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        <button
                          onClick={(e) => startEditDept(e, dept)}
                          style={{ padding: "4px", background: "transparent", color: "var(--text-muted)" }}
                          title="부서명 수정"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          data-hs-trigger="Delete"
                          onClick={(e) => handleDeleteDept(e, dept.id)}
                          style={{ padding: "4px", background: "transparent", color: "var(--danger)" }}
                          title="부서 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              {renderDeptTree(dept.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const openUserProfile = (user: UserNode) => {
    setSelectedProfile({
      ...user,
      passwordHash: user.passwordHash ? "__HASHED__" : "",
    });
    setShowPasswordInput(false);
  };

  const renderUserCard = (user: UserNode) => {
    const eff = getUserEffectiveTier(user, dutyConfigs, positionConfigs);
    return (
      <div
        data-mid="org-user-card"
        key={user.id}
        draggable={canEdit}
        onDragStart={(e) => handleDragStart(e, user.id)}
        onDragEnd={() => setDraggedUserId(null)}
        onDoubleClick={() => openUserProfile(user)}
        onClick={() => openUserProfile(user)}
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          padding: "16px",
          backgroundColor: "var(--bg-card)",
          cursor: canEdit ? "grab" : "pointer",
          opacity: draggedUserId === user.id ? 0.5 : 1,
          position: "relative",
          transition: "all 0.2s ease",
        }}
        title="드래그하여 좌측 부서로 배속 이동 / 클릭하여 상세 프로필 수정"
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          {canEdit && (
            <GripVertical size={16} color="var(--text-muted)" style={{ cursor: "grab", marginTop: "4px" }} />
          )}

          {/* Avatar */}
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "var(--primary-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary)",
              fontWeight: 700,
              backgroundImage: user.profileImageUrl ? `url(${user.profileImageUrl})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              flexShrink: 0,
            }}
          >
            {!user.profileImageUrl && (user.name ? user.name.substring(0, 1) : "신")}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: "700",
                    fontSize: "15px",
                    color: user.name ? "var(--text-main)" : "var(--text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.name || "신규직원(이름 미입력)"}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background:
                      eff.source === "DUTY" ? "rgba(15, 118, 110, 0.15)" : "rgba(21, 128, 61, 0.15)",
                    color: eff.source === "DUTY" ? "#0f766e" : "#15803d",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {eff.effectiveTier}티어
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  backgroundColor:
                    user.status === "ACTIVE"
                      ? "var(--success-light)"
                      : user.status === "RETIRED"
                      ? "var(--danger-light)"
                      : "var(--warning-light)",
                  color:
                    user.status === "ACTIVE"
                      ? "var(--success)"
                      : user.status === "RETIRED"
                      ? "var(--danger)"
                      : "var(--warning)",
                }}
              >
                {user.status === "ACTIVE" ? "재직" : user.status === "RETIRED" ? "퇴사" : "휴직"}
              </span>
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", whiteSpace: "nowrap" }}>
              {user.position || "직급 미지정"}
              {user.duty ? ` (${user.duty})` : ""} | {user.role}
              {(canEdit || canViewPayroll) && (
                <span style={{ marginLeft: "6px", fontSize: "11.5px", color: "var(--primary)", fontWeight: 600 }}>
                  · 표준시급 {(user.hourlyWage || Math.round((user.baseSalary || 3500000) / 209)).toLocaleString()}원
                </span>
              )}
            </div>
            {(user.joinDate || user.leaveDate) && (
              <div
                style={{
                  fontSize: "11.5px",
                  color: user.status === "RETIRED" && user.leaveDate ? "var(--danger)" : "var(--text-muted)",
                  marginTop: "2px",
                  whiteSpace: "nowrap",
                  fontWeight: user.status === "RETIRED" && user.leaveDate ? 600 : 400,
                }}
              >
                {user.joinDate ? `입사: ${user.joinDate}` : ""}
                {user.joinDate && user.leaveDate ? " · " : ""}
                {user.leaveDate ? `퇴사: ${user.leaveDate}` : ""}
              </div>
            )}
            {user.phone && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "2px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onClick={(e) => toggleRevealPhone(user.id, e)}
                title="클릭하여 마스킹 해제/적용"
              >
                <span>
                  {isPrivileged || revealedPhones.has(user.id) ? user.phone : maskPhoneNumber(user.phone)}
                </span>
                <span
                  style={{
                    cursor: "pointer",
                    opacity: 0.6,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {isPrivileged || revealedPhones.has(user.id) ? <EyeOff size={11} /> : <Eye size={11} />}
                </span>
              </div>
            )}
            {(user.salaryBankName || user.salaryAccountNo) && (
              <div
                style={{
                  fontSize: "11.5px",
                  color: "var(--text-muted)",
                  marginTop: "2px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                급여계좌: {user.salaryBankName || "-"}{" "}
                {isPrivileged || canViewPayroll || revealedPhones.has(user.id)
                  ? user.salaryAccountNo || ""
                  : user.salaryAccountNo
                  ? `${user.salaryAccountNo.slice(0, 4)}-****`
                  : ""}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const displayedUsers =
    activeTab === "DEPT"
      ? users.filter((u) => u.departmentId === selectedDeptId)
      : users.filter((u) => u.departmentId === null);

  const unassignedCount = users.filter((u) => u.departmentId === null).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        position: "relative",
        padding: "12px 16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
          paddingBottom: "6px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: "var(--text-main)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: 0,
            }}
          >
            <Network size={22} color="var(--primary)" />
            인사 및 조직도 마스터 설정
          </h2>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportOrgExcel}
            style={{
              padding: "8px 14px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
            }}
          >
            <Download size={15} /> 엑셀 내보내기
          </button>

          {/* Global Save Button */}
          {canEdit && (
            <button
              data-hs-trigger="Save"
              className={`btn-primary ${isDirty ? "pulse-animation" : ""}`}
              data-mid="org-save-all"
              onClick={handleSaveAll}
              disabled={isSaving}
              style={{
                padding: "8px 18px",
                backgroundColor: isDirty ? "var(--danger)" : "var(--primary)",
                borderColor: isDirty ? "var(--danger)" : "var(--primary)",
                transition: "all 0.3s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Save size={15} /> {isSaving ? "저장 중..." : isDirty ? "전체 저장 (변경됨)" : "전체 저장"}
            </button>
          )}
        </div>
      </div>

      {/* 📊 조직 및 임직원 현황 요약 바 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "6px 12px",
            backgroundColor: "var(--bg-card)",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", fontWeight: 600 }}>
            총 조직 부서
          </span>
          <strong style={{ fontSize: "15px", color: "var(--primary)" }}>{departments.length}개 부서</strong>
        </div>
        <div
          style={{
            padding: "6px 12px",
            backgroundColor: "var(--bg-card)",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", fontWeight: 600 }}>
            재직 임직원
          </span>
          <strong style={{ fontSize: "15px", color: "var(--success)" }}>{activeUsersCount}명</strong>
        </div>
        <div
          style={{
            padding: "6px 12px",
            backgroundColor: "var(--bg-card)",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", fontWeight: 600 }}>
            부서 미배치 / 휴·퇴사
          </span>
          <strong
            style={{
              fontSize: "15px",
              color:
                unassignedCount + leaveUsersCount + retiredUsersCount > 0 ? "#d97706" : "var(--text-muted)",
            }}
          >
            {unassignedCount + leaveUsersCount + retiredUsersCount}명
          </strong>
        </div>
      </div>

      {/* Main Split Studio: 좌측 조직 트리 + 중앙 직원 리스트 뷰 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          gap: "10px",
          alignItems: "stretch",
        }}
      >
        {/* 좌측: 조직 트리 */}
        <div
          data-mid="org-tree-panel"
          className="card"
          style={{
            width: "380px",
            minWidth: "340px",
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            padding: "12px",
            margin: 0,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "6px",
              flexShrink: 0,
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: "700", margin: 0 }}>조직 구조도</h3>
            {canEdit && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {selectedDeptId && (
                  <button
                    type="button"
                    onClick={() => handleAddDept(true)}
                    style={{
                      background: "transparent",
                      padding: "2px 6px",
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    title="최상위(Root) 부서 추가"
                  >
                    + 최상위
                  </button>
                )}
                <button
                  data-mid="org-btn-add-dept"
                  onClick={() => handleAddDept(false)}
                  style={{
                    background: "transparent",
                    padding: "4px",
                    color: "var(--primary)",
                    cursor: "pointer",
                  }}
                  title="선택된 부서 아래에 하위 부서 추가"
                >
                  <Plus size={18} />
                </button>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto", paddingRight: "4px" }}>
            {renderDeptTree(null)}
          </div>

          {/* 미배정 임직원 풀 버튼 (클릭 시 조회 + 드래그앤드롭 시 부서 배속 해제) */}
          <div
            onClick={() => setActiveTab("UNASSIGNED")}
            onDragOver={handleDragOver}
            onDrop={handleDropToPool}
            style={{
              marginTop: "8px",
              padding: "8px 10px",
              border: "1px dashed var(--border-color)",
              flexShrink: 0,
              borderRadius: "var(--radius-md)",
              backgroundColor: activeTab === "UNASSIGNED" ? "var(--primary-light)" : "var(--bg-app)",
              color: activeTab === "UNASSIGNED" ? "var(--primary)" : "var(--text-secondary)",
              cursor: "pointer",
              textAlign: "center",
              fontWeight: "600",
              fontSize: "13.5px",
              transition: "all 0.2s ease",
              borderStyle: draggedUserId ? "solid" : "dashed",
              borderColor: draggedUserId ? "var(--primary)" : "var(--border-color)",
            }}
            className={draggedUserId ? "drop-target-active" : ""}
          >
            미배정 인력 목록
            <div style={{ fontSize: "11.5px", color: "var(--danger)", marginTop: "2px" }}>
              {unassignedCount}명 대기 중
            </div>
          </div>
        </div>

        {/* 중앙: 직원 리스트 뷰 */}
        <div
          data-mid="org-users-panel"
          className="card"
          style={{
            flex: 1,
            minWidth: "420px",
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            padding: "12px",
            margin: 0,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "6px",
              flexShrink: 0,
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>
              {activeTab === "DEPT"
                ? `${
                    departments.find((d) => d.id === selectedDeptId)?.name || "선택된 부서"
                  } 소속원 (${displayedUsers.length}명)`
                : `미배정 대기 임직원 (${displayedUsers.length}명)`}
            </h3>
            {canEdit && (
              <button
                data-mid="org-btn-add-user"
                data-hs-trigger="Register"
                className="btn-secondary"
                onClick={handleAddUser}
                style={{ padding: "6px 12px", fontSize: "13px" }}
              >
                <Plus size={14} style={{ marginRight: "4px" }} /> 신규 직원 등록
              </button>
            )}
          </div>

          {/* 부서 보편 기능 속성 매핑 (9대 보편 기능 칩 버튼) */}
          {activeTab === "DEPT" &&
            selectedDeptId &&
            (() => {
              const currentSelectedDept = departments.find((d) => d.id === selectedDeptId);
              if (!currentSelectedDept) return null;
              const currentDeptTags = getDepartmentFunctionalTags(currentSelectedDept);

              const allAssignedTags = new Set(departments.flatMap((d) => getDepartmentFunctionalTags(d)));
              const unassignedCompanyAttributes = UNIVERSAL_FUNCTIONAL_ATTRIBUTES.filter(
                (attr) => !allAssignedTags.has(attr.id) && !allAssignedTags.has(attr.code)
              );

              return (
                <div
                  style={{
                    marginBottom: "8px",
                    padding: "8px 12px",
                    backgroundColor: "var(--bg-app)",
                    flexShrink: 0,
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-main)" }}>
                        조직 기능 매핑
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        (복수 겸임 지원 • 직무별 ToDo 피드 자동 라우팅)
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                      할당 기능: <strong>{currentDeptTags.length}개</strong>
                    </div>
                  </div>

                  {/* 9대 보편 기능 칩 버튼 목록 */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {UNIVERSAL_FUNCTIONAL_ATTRIBUTES.map((attr) => {
                      const isAssigned =
                        currentDeptTags.includes(attr.id) || currentDeptTags.includes(attr.code);
                      return (
                        <button
                          key={attr.id}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleToggleDeptFunctionalTag(currentSelectedDept.id, attr.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: isAssigned ? "700" : "500",
                            backgroundColor: isAssigned ? attr.badgeBg : "var(--bg-card)",
                            color: isAssigned ? attr.badgeText : "var(--text-secondary)",
                            border: isAssigned ? `1.5px solid ${attr.color}` : "1px solid var(--border-color)",
                            cursor: canEdit ? "pointer" : "default",
                            transition: "all 0.15s ease",
                            whiteSpace: "nowrap",
                          }}
                          title={`${attr.label}: ${attr.description}`}
                        >
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              backgroundColor: isAssigned ? attr.color : "var(--border-color)",
                            }}
                          />
                          {attr.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* 미할당 기능 공용 큐 안내 */}
                  {unassignedCompanyAttributes.length > 0 && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        paddingTop: "4px",
                        borderTop: "1px dashed var(--border-color)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>
                        전사 미할당 기능: {unassignedCompanyAttributes.map((a) => a.label).join(", ")}
                      </span>
                      <span style={{ color: "var(--primary)" }}>(전사 공용 업무 대기열로 자동 개방됨)</span>
                    </div>
                  )}
                </div>
              );
            })()}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "10px",
              alignContent: "start",
              overflowY: "auto",
              flex: 1,
              minHeight: 0,
              padding: "4px",
            }}
          >
            {displayedUsers.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                {activeTab === "UNASSIGNED"
                  ? "현재 미배정 대기 중인 임직원이 없습니다. 우측 상단 [+ 신규 직원 등록]을 누르면 미배정 인력풀에 생성됩니다."
                  : "이 부서에 배속된 직원이 없습니다. 미배정 인력 목록에서 직원을 드래그하여 좌측 부서에 드롭하거나 상세 프로필에서 소속 부서를 지정하십시오."}
              </div>
            ) : (
              displayedUsers.map((user) => renderUserCard(user))
            )}
          </div>
        </div>
      </div>

      {/* 우측: Slide-out 상세 프로필 모달 (eBro ERP 표준) */}
      {selectedProfile && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedProfile(null)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
              zIndex: 40,
            }}
          />

          {/* Panel */}
          <div
            className="card slide-in-right"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "360px",
              margin: 0,
              borderRadius: 0,
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              borderLeft: "1px solid var(--border-color)",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "8px",
              }}
            >
              <h3 style={{ fontSize: "15px", fontWeight: "700", margin: 0 }}>상세 프로필</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {canEdit && (
                  <>
                    <button
                      className="btn-secondary"
                      style={{ padding: "4px 8px", fontSize: "12px" }}
                      onClick={() => setSelectedProfile(null)}
                    >
                      취소
                    </button>
                    <button
                      data-hs-trigger="Save"
                      className="btn-primary"
                      style={{ padding: "4px 10px", fontSize: "12px" }}
                      onClick={applyProfileChanges}
                    >
                      <CheckCircle size={13} style={{ marginRight: "3px" }} /> 저장 (적용)
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedProfile(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    padding: "4px",
                    cursor: "pointer",
                  }}
                  title="닫기"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
              {/* Profile Image Upload Area */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "var(--primary-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "var(--primary)",
                    backgroundImage: selectedProfile.profileImageUrl
                      ? `url(${selectedProfile.profileImageUrl})`
                      : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    marginBottom: "6px",
                    border: "2px solid var(--border-color)",
                  }}
                >
                  {!selectedProfile.profileImageUrl &&
                    (selectedProfile.name ? selectedProfile.name.substring(0, 1) : "신")}
                </div>
                {canEdit && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ fontSize: "11px", padding: "3px 8px" }}
                    >
                      <Upload size={12} style={{ marginRight: "4px" }} /> 사진 변경
                    </button>
                  </>
                )}
              </div>

              {/* Form Fields (헌장 3.4 상하 스택 배치 원칙) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ color: "var(--primary)", fontWeight: "bold", fontSize: "12px" }}>
                      로그인 아이디
                    </label>
                    <input
                      type="text"
                      style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                      placeholder="시스템 로그인 ID"
                      value={selectedProfile.loginId || ""}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, loginId: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <label style={{ color: "var(--primary)", fontWeight: "bold", fontSize: "12px" }}>
                        비밀번호 변경
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPasswordInput((prev) => !prev)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        {showPasswordInput ? <EyeOff size={12} /> : <Eye size={12} />}
                        {showPasswordInput ? "숨기기" : "입력보기"}
                      </button>
                    </div>
                    <input
                      type={showPasswordInput ? "text" : "password"}
                      style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                      placeholder="변경 시 입력 (기본: 1111)"
                      value={
                        selectedProfile.passwordHash?.startsWith("__HASHED__")
                          ? ""
                          : selectedProfile.passwordHash || ""
                      }
                      onChange={(e) =>
                        setSelectedProfile({ ...selectedProfile, passwordHash: e.target.value })
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600 }}>이름</label>
                    <input
                      type="text"
                      style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                      placeholder="이름 입력 (예: 홍길동)"
                      value={selectedProfile.name}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, name: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600 }}>상태</label>
                    <select
                      value={selectedProfile.status}
                      onChange={(e) =>
                        handleStatusChange(selectedProfile.id, e.target.value as UserNode["status"])
                      }
                      disabled={!canEdit}
                      style={{
                        padding: "5px 8px",
                        fontSize: "12px",
                        borderRadius: "4px",
                        width: "100%",
                        color:
                          selectedProfile.status === "ACTIVE"
                            ? "var(--success)"
                            : selectedProfile.status === "RETIRED"
                            ? "var(--danger)"
                            : "var(--warning)",
                        fontWeight: "bold",
                      }}
                    >
                      <option value="ACTIVE">재직</option>
                      <option value="LEAVE_OF_ABSENCE">휴직</option>
                      <option value="RETIRED">퇴사 처리</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600 }}>직급 (결재 티어 매핑)</label>
                    <select
                      style={{
                        padding: "5px 8px",
                        fontSize: "12px",
                        width: "100%",
                        borderRadius: "4px",
                      }}
                      value={selectedProfile.position || ""}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, position: e.target.value })}
                      disabled={!canEdit}
                    >
                      <option value="">(직급 선택)</option>
                      {selectedProfile.position &&
                        !positionConfigs.some(
                          (p) => p.title.trim().toLowerCase() === selectedProfile.position.trim().toLowerCase()
                        ) && <option value={selectedProfile.position}>{selectedProfile.position} (미등록 직급)</option>}
                      {[...positionConfigs]
                        .sort((a, b) => a.tier_level - b.tier_level)
                        .map((p) => (
                          <option key={p.title} value={p.title}>
                            {p.title} ({p.tier_level}티어)
                          </option>
                        ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600 }}>직책 (R&R 결재 우선)</label>
                    <select
                      style={{
                        padding: "5px 8px",
                        fontSize: "12px",
                        width: "100%",
                        borderRadius: "4px",
                      }}
                      value={selectedProfile.duty || ""}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, duty: e.target.value })}
                      disabled={!canEdit}
                    >
                      <option value="">(미지정 / 팀원)</option>
                      {selectedProfile.duty &&
                        !dutyConfigs.some(
                          (d) => d.title.trim().toLowerCase() === selectedProfile.duty?.trim().toLowerCase()
                        ) && (
                          <option value={selectedProfile.duty}>
                            {selectedProfile.duty} (사용자 정의 직책)
                          </option>
                        )}
                      {[...dutyConfigs]
                        .sort((a, b) => a.tier_level - b.tier_level)
                        .map((d) => (
                          <option key={d.title} value={d.title}>
                            {d.title} ({d.tier_level}티어{d.description ? ` · ${d.description}` : ""})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* 🛡️ 결재 권한 티어 실시간 연동 인포 박스 */}
                {(() => {
                  const eff = getUserEffectiveTier(
                    { position: selectedProfile.position, duty: selectedProfile.duty },
                    dutyConfigs,
                    positionConfigs
                  );
                  return (
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <ShieldCheck size={14} color={eff.source === "DUTY" ? "#0f766e" : "#15803d"} />
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>결재 권한 티어</span>
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "8px",
                          background: eff.source === "DUTY" ? "#0f766e" : "#15803d",
                          color: "#fff",
                          fontSize: "11px",
                        }}
                      >
                        {eff.effectiveTier}티어 (
                        {eff.source === "DUTY" ? `직책 우선: ${eff.title}` : `직급 기준: ${eff.title}`})
                      </span>
                    </div>
                  );
                })()}

                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>시스템 역할</label>
                  <select
                    value={selectedProfile.role}
                    style={{ padding: "5px 8px", fontSize: "12px", width: "100%", borderRadius: "4px" }}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, role: e.target.value })}
                    disabled={!canEdit || selectedProfile.loginId === "admin"}
                  >
                    {isSuperAdmin && <option value="ADMIN">ADMIN</option>}
                    <option value="MANAGER">MANAGER</option>
                    <option value="USER">USER</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-main)" }}>
                    소속 부서 (부서 이동)
                  </label>
                  <select
                    value={selectedProfile.departmentId || ""}
                    style={{
                      padding: "5px 8px",
                      fontSize: "12px",
                      width: "100%",
                      borderRadius: "4px",
                    }}
                    onChange={(e) => {
                      const newDeptId = e.target.value || null;
                      const targetDept = departments.find((d) => d.id === newDeptId);
                      setSelectedProfile({
                        ...selectedProfile,
                        departmentId: newDeptId,
                        department: targetDept?.name || "",
                      });
                      let updated = users.map((u) =>
                        u.id === selectedProfile.id
                          ? { ...u, departmentId: newDeptId, department: targetDept?.name || "" }
                          : u
                      );
                      updated = enforceManagerPolicies(updated, departments);
                      setUsers(updated);
                      setIsDirty(true);
                      showToast(
                        `소속 부서가 [${targetDept?.name || "미배정"}] (으)로 변경되었습니다. 저장을 눌러 확정하세요.`,
                        "warning"
                      );
                    }}
                    disabled={!canEdit}
                  >
                    <option value="">(미배정 인재풀)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name || "새 부서"}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px" }}>
                      <Calendar
                        size={12}
                        style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }}
                      />
                      입사일
                    </label>
                    <input
                      type="date"
                      style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                      value={selectedProfile.joinDate || ""}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, joinDate: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label
                        style={{
                          fontSize: "12px",
                          color: selectedProfile.leaveDate ? "var(--danger)" : "inherit",
                          fontWeight: selectedProfile.leaveDate ? 600 : 400,
                        }}
                      >
                        <Calendar
                          size={12}
                          style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }}
                        />
                        퇴사일
                      </label>
                      {canEdit && selectedProfile.leaveDate && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProfile({
                              ...selectedProfile,
                              leaveDate: "",
                            })
                          }
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            fontSize: "10.5px",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                          }}
                          title="퇴사일 초기화"
                        >
                          초기화
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      style={{
                        padding: "5px 8px",
                        fontSize: "12px",
                        borderRadius: "4px",
                        width: "100%",
                        borderColor: selectedProfile.leaveDate ? "var(--danger)" : undefined,
                      }}
                      value={selectedProfile.leaveDate || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedProfile({
                          ...selectedProfile,
                          leaveDate: val,
                          status: val ? "RETIRED" : selectedProfile.status,
                        });
                      }}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px" }}>
                      <Phone
                        size={12}
                        style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }}
                      />
                      휴대전화
                    </label>
                    <input
                      type="text"
                      style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                      placeholder="010-0000-0000"
                      value={selectedProfile.phone || ""}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, phone: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px" }}>
                      <Calendar
                        size={12}
                        style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }}
                      />
                      생년월일
                    </label>
                    <input
                      type="date"
                      style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                      value={selectedProfile.birthDate || ""}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, birthDate: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <label style={{ fontSize: "12px" }}>
                    <Mail
                      size={12}
                      style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }}
                    />
                    이메일
                  </label>
                  <input
                    type="email"
                    style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                    placeholder="example@dragonrpa.co.kr"
                    value={selectedProfile.email || ""}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, email: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <label style={{ fontSize: "12px" }}>
                    <MapPin
                      size={12}
                      style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }}
                    />
                    자택 주소
                  </label>
                  <input
                    type="text"
                    style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                    placeholder="자택 주소 입력"
                    value={selectedProfile.address || ""}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, address: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>

                {/* 급여계좌 정보 */}
                <div
                  style={{
                    marginTop: "2px",
                    padding: "10px",
                    backgroundColor: "var(--bg-app)",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "var(--text-main)",
                      display: "block",
                    }}
                  >
                    급여계좌 정보
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>은행명</label>
                      <select
                        style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                        value={selectedProfile.salaryBankName || ""}
                        onChange={(e) =>
                          setSelectedProfile({
                            ...selectedProfile,
                            salaryBankName: e.target.value,
                            salaryAccountHolder:
                              selectedProfile.salaryAccountHolder || selectedProfile.name || "",
                          })
                        }
                        disabled={!canEdit}
                      >
                        <option value="">(은행 선택)</option>
                        {[
                          "기업은행",
                          "국민은행",
                          "신한은행",
                          "우리은행",
                          "하나은행",
                          "농협은행",
                          "카카오뱅크",
                          "토스뱅크",
                          "케이뱅크",
                          "SC제일은행",
                          "한국씨티은행",
                          "우체국",
                          "새마을금고",
                          "신협",
                          "수협은행",
                          "부산은행",
                          "대구은행(iM뱅크)",
                          "경남은행",
                          "광주은행",
                          "전북은행",
                          "제주은행",
                        ].map((bank) => (
                          <option key={bank} value={bank}>
                            {bank}
                          </option>
                        ))}
                        {selectedProfile.salaryBankName &&
                          ![
                            "기업은행",
                            "국민은행",
                            "신한은행",
                            "우리은행",
                            "하나은행",
                            "농협은행",
                            "카카오뱅크",
                            "토스뱅크",
                            "케이뱅크",
                            "SC제일은행",
                            "한국씨티은행",
                            "우체국",
                            "새마을금고",
                            "신협",
                            "수협은행",
                            "부산은행",
                            "대구은행(iM뱅크)",
                            "경남은행",
                            "광주은행",
                            "전북은행",
                            "제주은행",
                          ].includes(selectedProfile.salaryBankName) && (
                            <option value={selectedProfile.salaryBankName}>
                              {selectedProfile.salaryBankName}
                            </option>
                          )}
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>예금주</label>
                      <input
                        type="text"
                        style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                        placeholder="예금주 성명"
                        value={selectedProfile.salaryAccountHolder || ""}
                        onChange={(e) =>
                          setSelectedProfile({ ...selectedProfile, salaryAccountHolder: e.target.value })
                        }
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>계좌번호</label>
                    <input
                      type="text"
                      style={{
                        padding: "5px 8px",
                        fontSize: "12px",
                        borderRadius: "4px",
                        width: "100%",
                        fontFamily: "monospace",
                      }}
                      placeholder="계좌번호 입력 (예: 110-123-456789)"
                      value={selectedProfile.salaryAccountNo || ""}
                      onChange={(e) =>
                        setSelectedProfile({ ...selectedProfile, salaryAccountNo: e.target.value })
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                {/* 급여 및 1시간 표준임금 설정 (초과근무 수당 자동산정 기준) */}
                {(canViewPayroll || canEdit) && (
                  <div
                    style={{
                      marginTop: "4px",
                      padding: "10px",
                      backgroundColor: "var(--bg-app)",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label
                          style={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "var(--primary)",
                          }}
                        >
                          1시간 표준임금 (원) [초과근무 산정 기준]
                        </label>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              const calc = Math.round((selectedProfile.baseSalary || 3500000) / 209);
                              setSelectedProfile({
                                ...selectedProfile,
                                hourlyWage: calc,
                              });
                            }}
                            style={{
                              fontSize: "10.5px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              border: "1px solid var(--border-color)",
                              backgroundColor: "var(--bg-card)",
                              color: "var(--text-secondary)",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                            title="계약 기본급 ÷ 209시간으로 자동 계산"
                          >
                            기본급÷209h 적용
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        style={{
                          padding: "6px 10px",
                          fontSize: "13px",
                          fontWeight: "bold",
                          width: "100%",
                          borderRadius: "4px",
                        }}
                        placeholder="1시간 표준임금 입력 (예: 16746)"
                        value={
                          selectedProfile.hourlyWage !== undefined
                            ? selectedProfile.hourlyWage
                            : Math.round((selectedProfile.baseSalary || 3500000) / 209)
                        }
                        onChange={(e) =>
                          setSelectedProfile({
                            ...selectedProfile,
                            hourlyWage: parseInt(e.target.value) || 0,
                          })
                        }
                        disabled={!canEdit}
                      />
                      {(() => {
                        const hw =
                          selectedProfile.hourlyWage && selectedProfile.hourlyWage > 0
                            ? selectedProfile.hourlyWage
                            : Math.round((selectedProfile.baseSalary || 3500000) / 209);
                        return (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--text-secondary)",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                              marginTop: "2px",
                              padding: "4px 6px",
                              backgroundColor: "var(--bg-card)",
                              borderRadius: "4px",
                              border: "1px dashed var(--border-color)",
                            }}
                          >
                            <span>평일초과(1.5x): <strong>{Math.round(hw * 1.5).toLocaleString()}원/h</strong></span>
                            <span>·</span>
                            <span>비근무일(1.5x/2.0x): <strong>{Math.round(hw * 1.5).toLocaleString()} / {Math.round(hw * 2.0).toLocaleString()}원/h</strong></span>
                            <span>·</span>
                            <span>심야가산(+0.5x): <strong>+{Math.round(hw * 0.5).toLocaleString()}원/h</strong></span>
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <label
                        style={{
                          fontSize: "12px",
                          fontWeight: "bold",
                          color: "var(--text-main)",
                          display: "block",
                        }}
                      >
                        계약 기본급 (원)
                      </label>
                      <input
                        type="number"
                        step="10000"
                        min="0"
                        style={{
                          padding: "6px 10px",
                          fontSize: "13px",
                          fontWeight: "bold",
                          width: "100%",
                          borderRadius: "4px",
                        }}
                        placeholder="기본급 입력 (예: 3500000)"
                        value={selectedProfile.baseSalary || ""}
                        onChange={(e) => {
                          const nextBase = parseInt(e.target.value) || 0;
                          const prevAuto = Math.round((selectedProfile.baseSalary || 3500000) / 209);
                          const shouldAutoUpdateHourly =
                            !selectedProfile.hourlyWage || selectedProfile.hourlyWage === prevAuto;
                          setSelectedProfile({
                            ...selectedProfile,
                            baseSalary: nextBase,
                            hourlyWage: shouldAutoUpdateHourly
                              ? Math.round(nextBase / 209)
                              : selectedProfile.hourlyWage,
                          });
                        }}
                        disabled={!canEdit}
                      />
                    </div>

                    {/* 수당 항목: 식대 및 차량보조금 */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "2px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label
                          style={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "var(--text-main)",
                            display: "block",
                            whiteSpace: "nowrap",
                          }}
                        >
                          식대 (원) <span style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-secondary)" }}>[수당]</span>
                        </label>
                        <input
                          type="number"
                          step="10000"
                          min="0"
                          style={{
                            padding: "6px 10px",
                            fontSize: "13px",
                            fontWeight: "bold",
                            width: "100%",
                            borderRadius: "4px",
                          }}
                          placeholder="식대 입력 (예: 200000)"
                          value={selectedProfile.mealAllowance ?? 200000}
                          onChange={(e) =>
                            setSelectedProfile({
                              ...selectedProfile,
                              mealAllowance: e.target.value === "" ? 0 : parseInt(e.target.value) || 0,
                            })
                          }
                          disabled={!canEdit}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label
                          style={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "var(--text-main)",
                            display: "block",
                            whiteSpace: "nowrap",
                          }}
                        >
                          차량보조금 (원) <span style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-secondary)" }}>[수당]</span>
                        </label>
                        <input
                          type="number"
                          step="10000"
                          min="0"
                          style={{
                            padding: "6px 10px",
                            fontSize: "13px",
                            fontWeight: "bold",
                            width: "100%",
                            borderRadius: "4px",
                          }}
                          placeholder="차량보조금 입력 (예: 200000)"
                          value={selectedProfile.vehicleAllowance ?? 0}
                          onChange={(e) =>
                            setSelectedProfile({
                              ...selectedProfile,
                              vehicleAllowance: e.target.value === "" ? 0 : parseInt(e.target.value) || 0,
                            })
                          }
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    {/* 월 고정 급여 + 수당 합계 요약 */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "5px 8px",
                        backgroundColor: "var(--bg-card)",
                        borderRadius: "4px",
                        border: "1px solid var(--border-color)",
                        fontSize: "11.5px",
                      }}
                    >
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                        월 급여 합계 (기본급 + 식대 + 차량보조금)
                      </span>
                      <strong style={{ color: "var(--primary)", fontSize: "12.5px" }}>
                        {(
                          Number(selectedProfile.baseSalary || 0) +
                          Number(selectedProfile.mealAllowance ?? 200000) +
                          Number(selectedProfile.vehicleAllowance ?? 0)
                        ).toLocaleString()}
                        원
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hand-off Alert Modal for Retirement (퇴사 처리 및 업무 이관) */}
      {showHandoffModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div className="card" style={{ width: "450px", padding: "24px" }}>
            <div style={{ display: "flex", gap: "12px", color: "var(--danger)", marginBottom: "16px" }}>
              <AlertCircle size={28} />
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginTop: "2px" }}>
                퇴사 처리 및 업무 이관
              </h3>
            </div>

            <p style={{ fontSize: "14px", color: "var(--text-main)", lineHeight: "1.5" }}>
              <strong>{showHandoffModal.name}</strong> 직원을 &apos;퇴사&apos; 상태로 변경하시겠습니까?
              <br />
              <br />
              현재 이 직원이 담당하고 있는{" "}
              <span style={{ color: "var(--danger)", fontWeight: "bold" }}>
                진행 중인 미결 업무가 발견
              </span>
              되었습니다.
              <br />
              퇴사 처리 시 해당 미결 업무는 직속 상급자(부서장)에게 강제 이관됩니다.
            </p>

            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                퇴사일 지정
              </label>
              <input
                type="date"
                style={{ padding: "6px 10px", fontSize: "13px", borderRadius: "4px", width: "100%" }}
                value={showHandoffModal.leaveDate || new Date().toISOString().substring(0, 10)}
                onChange={(e) =>
                  setShowHandoffModal((prev) => (prev ? { ...prev, leaveDate: e.target.value } : null))
                }
              />
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                className="btn-secondary"
                style={{ padding: "8px 14px" }}
                onClick={() => setShowHandoffModal(null)}
              >
                취소
              </button>
              <button
                data-hs-trigger="Confirm"
                className="btn-primary"
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--danger)",
                  borderColor: "var(--danger)",
                }}
                onClick={confirmRetirement}
              >
                확인 및 이관 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 부서 삭제 확인 모달 (헌장 5.2: 브라우저 confirm 전면 퇴출) */}
      {deptToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div className="card" style={{ width: "420px", padding: "24px" }}>
            <div style={{ display: "flex", gap: "12px", color: "var(--danger)", marginBottom: "16px" }}>
              <AlertCircle size={28} />
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginTop: "2px" }}>부서 삭제 확인</h3>
            </div>

            <p style={{ fontSize: "14px", color: "var(--text-main)", lineHeight: "1.5" }}>
              부서 <strong>[{deptToDelete.name || deptToDelete.id}]</strong>을(를) 정말 삭제하시겠습니까?
              <br />
              현재 소속된 직원 및 하위 부서가 없으므로 안전하게 삭제됩니다.
            </p>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                className="btn-secondary"
                style={{ padding: "8px 14px" }}
                onClick={() => setDeptToDelete(null)}
              >
                취소
              </button>
              <button
                data-hs-trigger="Delete"
                className="btn-primary"
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--danger)",
                  borderColor: "var(--danger)",
                }}
                onClick={confirmDeleteDept}
              >
                부서 삭제 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 오류 안내 모달 (헌장 5.2) */}
      {errorModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
          }}
        >
          <div className="card" style={{ width: "420px", padding: "24px" }}>
            <div style={{ display: "flex", gap: "12px", color: "var(--danger)", marginBottom: "12px" }}>
              <AlertCircle size={24} />
              <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>{errorModal.title}</h3>
            </div>
            <p
              style={{
                fontSize: "13.5px",
                color: "var(--text-main)",
                lineHeight: "1.5",
                whiteSpace: "pre-line",
              }}
            >
              {errorModal.message}
            </p>
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn-primary"
                style={{ padding: "6px 16px" }}
                onClick={() => setErrorModal(null)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚖️ 헌장 3.5 Gutenberg Z-패턴 4단계 조직/인사 대차대조 검증 바 */}
      <div
        style={{
          marginTop: 0,
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "4px",
          padding: "0 14px",
          height: "36px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "var(--text-main)" }}>
            조직 및 인사 대차대조 검증:
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            총 임직원 <strong style={{ color: "var(--text-main)" }}>{totalUsersCount}명</strong>
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>=</span>
          <span style={{ fontSize: "12px", color: "#10b981" }}>
            재직 <strong>{activeUsersCount}명</strong>
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>+</span>
          <span style={{ fontSize: "12px", color: "#f59e0b" }}>
            휴직 <strong>{leaveUsersCount}명</strong>
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>+</span>
          <span style={{ fontSize: "12px", color: "var(--danger)" }}>
            퇴사 <strong>{retiredUsersCount}명</strong>
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>|</span>
          <span style={{ fontSize: "12px", color: "var(--primary)" }}>
            부서 {totalDeptsCount}개 (배정 {assignedUsersCount}명 / 미배정 {unassignedUsersCount}명)
          </span>
        </div>
        {userBalanceDiff !== 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            <span
              style={{
                fontSize: "11px",
                padding: "3px 10px",
                borderRadius: "6px",
                fontWeight: "bold",
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
              }}
            >
              대차 차액 {userBalanceDiff}명 (불일치)
            </span>
          </div>
        )}
      </div>

      {/* 토스트 알림 팝업 (헌장 5.2) */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            padding: "12px 20px",
            borderRadius: "8px",
            backgroundColor:
              toastMessage.type === "error"
                ? "#ef4444"
                : toastMessage.type === "warning"
                ? "#f59e0b"
                : "#10b981",
            color: "#fff",
            fontWeight: 700,
            fontSize: "13px",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {toastMessage.text}
        </div>
      )}
    </div>
  );
};
