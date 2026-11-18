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
import { toErpInputString, cleanErpNumber } from "@/lib/erpFormat";
import {
  DEFAULT_POSITION_TIERS,
  DEFAULT_DUTY_TIERS,
  getUserEffectiveTier,
  UNIVERSAL_FUNCTIONAL_ATTRIBUTES,
  getDepartmentFunctionalTags,
  maskPhoneNumber,
  maskEmail,
  maskName,
  maskAddress,
  type ApprovalTierConfig,
  type Department,
  type UserNode,
  type OrganizationTabProps,
} from "./organization/organizationTypes";
import { SelectedProfilePanel } from "./organization/SelectedProfilePanel";

// ============================================================================
// 🏛️ eBro ERP SSOT Types & Constants (인사 및 조직도 마스터 설정 표준)
// ============================================================================

export {
  DEFAULT_POSITION_TIERS,
  DEFAULT_DUTY_TIERS,
  getUserEffectiveTier,
  UNIVERSAL_FUNCTIONAL_ATTRIBUTES,
  getDepartmentFunctionalTags,
  maskPhoneNumber,
  maskEmail,
  maskName,
  maskAddress,
  type ApprovalTierConfig,
  type FunctionalAttributeConfig,
  type Department,
  type UserNode,
  type OrganizationTabProps,
} from "./organization/organizationTypes";

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
        fetch("/api/erp/departments", { cache: "no-store" }),
        fetch("/api/erp/employees?includePii=1", { cache: "no-store" }),
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
            e.hourlyWage !== undefined && e.hourlyWage !== null && e.hourlyWage !== ""
              ? Math.round(Number(e.hourlyWage) || 0)
              : 0,
          mealAllowance: Number(e.mealAllowance ?? 200000),
          vehicleAllowance: Number(e.vehicleAllowance ?? 0),
          insNationalPension: e.insNationalPension !== undefined ? Boolean(e.insNationalPension) : true,
          insHealthInsurance: e.insHealthInsurance !== undefined ? Boolean(e.insHealthInsurance) : true,
          insEmploymentInsurance: e.insEmploymentInsurance !== undefined ? Boolean(e.insEmploymentInsurance) : true,
          insIndustrialAccident: e.insIndustrialAccident !== undefined ? Boolean(e.insIndustrialAccident) : true,
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
          baseSalary: cleanErpNumber(u.baseSalary),
          hourlyWage: cleanErpNumber(u.hourlyWage),
          mealAllowance: cleanErpNumber(u.mealAllowance),
          vehicleAllowance: cleanErpNumber(u.vehicleAllowance),
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
          e.hourlyWage !== undefined && e.hourlyWage !== null && e.hourlyWage !== ""
            ? Math.round(Number(e.hourlyWage) || 0)
            : 0,
        mealAllowance: Number(e.mealAllowance ?? 200000),
        vehicleAllowance: Number(e.vehicleAllowance ?? 0),
        insNationalPension: e.insNationalPension !== undefined ? Boolean(e.insNationalPension) : true,
        insHealthInsurance: e.insHealthInsurance !== undefined ? Boolean(e.insHealthInsurance) : true,
        insEmploymentInsurance: e.insEmploymentInsurance !== undefined ? Boolean(e.insEmploymentInsurance) : true,
        insIndustrialAccident: e.insIndustrialAccident !== undefined ? Boolean(e.insIndustrialAccident) : true,
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

      // 선택된 부서가 임시 ID(new-dept-...)였거나 변경된 경우 실제 저장된 DB 부서 ID로 즉시 매핑
      setSelectedDeptId((prevDeptId) => {
        if (!prevDeptId) return prevDeptId;
        if (savedDepts.some((d) => d.id === prevDeptId)) return prevDeptId;
        const prevDeptObj = cleanDepts.find((d) => d.id === prevDeptId);
        if (prevDeptObj) {
          const matched = savedDepts.find(
            (d) =>
              d.name === prevDeptObj.name &&
              String(d.parentDepartmentId || "") === String(prevDeptObj.parentDepartmentId || "")
          ) || savedDepts.find((d) => d.name === prevDeptObj.name);
          if (matched) return matched.id;
        }
        return savedDepts[0]?.id || null;
      });

      // 프로필 드로어가 열려 있는 경우 최신 DB 데이터로 동기화
      setSelectedProfile((prevProfile) => {
        if (!prevProfile) return null;
        return (
          savedUsers.find(
            (u) =>
              u.id === prevProfile.id ||
              (prevProfile.employeeNo && u.employeeNo === prevProfile.employeeNo) ||
              (prevProfile.loginId && u.loginId === prevProfile.loginId) ||
              u.name === prevProfile.name
          ) || prevProfile
        );
      });

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

  const prepareProfileForSave = (profile: UserNode): UserNode | null => {
    if (!profile.name || !profile.name.trim()) {
      showErrorModal("임직원 성명을 입력해 주십시오.", "필수값 누락");
      return null;
    }
    if (profile.loginId === "admin" && profile.role !== "ADMIN") {
      showErrorModal("시스템 대표 관리자의 시스템 역할은 변경할 수 없습니다.", "역할 변경 불가");
      return null;
    }
    if (profile.role === "ADMIN" && !isSuperAdmin) {
      showErrorModal("ADMIN 시스템 역할은 관리자 계정만 부여할 수 있습니다.", "권한 부여 제한");
      return null;
    }
    const eff = getUserEffectiveTier(
      { position: profile.position, duty: profile.duty },
      dutyConfigs,
      positionConfigs
    );
    return {
      ...profile,
      name: profile.name.trim(),
      baseSalary: cleanErpNumber(profile.baseSalary),
      hourlyWage: cleanErpNumber(profile.hourlyWage),
      mealAllowance: cleanErpNumber(profile.mealAllowance),
      vehicleAllowance: cleanErpNumber(profile.vehicleAllowance),
      tier_level: eff.effectiveTier,
    };
  };

  // --- Manual Save (Batch to Supabase/DB) ---
  const handleSaveAll = async () => {
    let targetUsers = users;
    if (selectedProfile) {
      const normalized = prepareProfileForSave(selectedProfile);
      if (!normalized) return;
      targetUsers = enforceManagerPolicies(
        users.map((u) => (u.id === selectedProfile.id ? normalized : u)),
        departments
      );
      setUsers(targetUsers);
    }
    await syncOrganizationBatchToDb(departments, targetUsers, false);
  };

  // --- Action Handlers ---
  const handleToggleDeptFunctionalTag = async (deptId: string, attrId: string) => {
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
    await syncOrganizationBatchToDb(nextDepts, users, true);
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
      hourlyWage: 0,
      mealAllowance: 200000,
      vehicleAllowance: 0,
      insNationalPension: true,
      insHealthInsurance: true,
      insEmploymentInsurance: true,
      insIndustrialAccident: true,
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
    await syncOrganizationBatchToDb(departments, updated, true);
    showToast(
      `[${targetUser?.name || "신규직원"}] 님이 [${targetDept?.name || "선택 부서"}] 소속으로 배속 및 저장되었습니다.`
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
    await syncOrganizationBatchToDb(departments, updated, true);
    showToast(`[${targetUser?.name || "직원"}] 님이 미배정 인력 목록으로 이동 및 저장되었습니다.`);
  };

  // --- Department Inline Edit Handlers ---
  const startEditDept = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation();
    if (!canEdit) return;
    setEditingDeptId(dept.id);
    setEditingDeptName(dept.name);
  };

  const commitEditDept = async () => {
    if (!editingDeptId) return;
    const targetId = editingDeptId;
    const trimmed = editingDeptName.trim();
    setEditingDeptId(null);
    if (trimmed) {
      const nextDepts = departments.map((d) =>
        d.id === targetId ? { ...d, name: trimmed, deptName: trimmed } : d
      );
      setDepartments(nextDepts);
      await syncOrganizationBatchToDb(nextDepts, users, true);
      showToast(`부서 [${trimmed}] 정보가 저장되었습니다.`);
    } else {
      // 이름 미입력 상태로 생성 직후 취소된 빈 신규 부서는 제거
      const target = departments.find((d) => d.id === targetId);
      if (target && !target.name && String(target.id).startsWith("new-dept-")) {
        setDepartments((prev) => prev.filter((d) => d.id !== targetId));
      }
    }
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
      if (!String(userId).startsWith("new-user-")) {
        await syncOrganizationBatchToDb(departments, nextUsers, true);
      } else {
        setIsDirty(true);
      }
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

  const handleWageInputChange = (
    field: "baseSalary" | "hourlyWage" | "mealAllowance" | "vehicleAllowance",
    rawValue: string
  ) => {
    if (!selectedProfile) return;
    const digits = rawValue.replace(/[^0-9]/g, "");
    setSelectedProfile({
      ...selectedProfile,
      [field]: digits === "" ? undefined : parseInt(digits, 10) || 0,
    });
    setIsDirty(true);
  };

  const applyProfileChanges = async () => {
    if (selectedProfile) {
      const profileWithTier = prepareProfileForSave(selectedProfile);
      if (!profileWithTier) return;

      let updated = users.map((u) => (u.id === selectedProfile.id ? profileWithTier : u));
      updated = enforceManagerPolicies(updated, departments);

      setUsers(updated);
      setSelectedProfile(null);

      // 즉시 DB 동기화 수행하여 새로고침 시에도 완벽 보존
      const saved = await syncOrganizationBatchToDb(departments, updated, true);
      if (saved) {
        try {
          const savedEmp =
            saved.users.find(
              (u) =>
                u.id === profileWithTier.id ||
                (profileWithTier.employeeNo && u.employeeNo === profileWithTier.employeeNo) ||
                (profileWithTier.loginId && u.loginId === profileWithTier.loginId)
            ) ||
            saved.users.filter((u) => u.name === profileWithTier.name).pop() ||
            profileWithTier;
          if (savedEmp.id && !String(savedEmp.id).startsWith("new-user-")) {
            sessionStorage.setItem("dragonrpa_erp_selected_emp_id", String(savedEmp.id));
          } else {
            sessionStorage.removeItem("dragonrpa_erp_selected_emp_id");
          }
          if (savedEmp.name) {
            sessionStorage.setItem("dragonrpa_erp_selected_emp_name", savedEmp.name);
          }
        } catch (e) {}
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
      ...(canViewPayroll || canEdit
        ? [
            "기본급(원)",
            "식대(원)",
            "차량보조금(원)",
            "통상임금(원)",
            "국민연금",
            "건강보험",
            "고용보험",
            "산재보험",
          ]
        : []),
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
              cleanErpNumber(u.hourlyWage),
              u.insNationalPension !== false ? "가입" : "미가입",
              u.insHealthInsurance !== false ? "가입" : "미가입",
              u.insEmploymentInsurance !== false ? "가입" : "미가입",
              u.insIndustrialAccident !== false ? "가입" : "미가입",
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
    try {
      if (user.id && !String(user.id).startsWith("new-user-")) {
        sessionStorage.setItem("dragonrpa_erp_selected_emp_id", String(user.id));
      }
      if (user.name) {
        sessionStorage.setItem("dragonrpa_erp_selected_emp_name", user.name);
      }
    } catch (e) {}
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
                  · 통상임금 {cleanErpNumber(user.hourlyWage).toLocaleString()}원
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
        <SelectedProfilePanel
          applyProfileChanges={applyProfileChanges}
          canEdit={canEdit}
          canViewPayroll={canViewPayroll}
          departments={departments}
          dutyConfigs={dutyConfigs}
          enforceManagerPolicies={enforceManagerPolicies}
          fileInputRef={fileInputRef}
          handlePhotoUpload={handlePhotoUpload}
          handleStatusChange={handleStatusChange}
          handleWageInputChange={handleWageInputChange}
          isSuperAdmin={isSuperAdmin}
          positionConfigs={positionConfigs}
          selectedProfile={selectedProfile}
          setIsDirty={setIsDirty}
          setSelectedProfile={setSelectedProfile}
          setShowPasswordInput={setShowPasswordInput}
          setUsers={setUsers}
          showPasswordInput={showPasswordInput}
          showToast={showToast}
          users={users}
        />
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
