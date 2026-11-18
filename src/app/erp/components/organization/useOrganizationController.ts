"use client";

import { useState, useEffect, useRef } from "react";
import type React from "react";
import { cleanErpNumber } from "@/lib/erpFormat";
import {
  DEFAULT_POSITION_TIERS,
  DEFAULT_DUTY_TIERS,
  getUserEffectiveTier,
  type ApprovalTierConfig,
  type Department,
  type UserNode,
} from "./organizationTypes";

function mapApiDepartment(d: any): Department {
  const parentDepartmentId =
    d.parentDepartmentId !== null && d.parentDepartmentId !== undefined && d.parentDepartmentId !== ""
      ? String(d.parentDepartmentId)
      : d.parentId !== null && d.parentId !== undefined && d.parentId !== ""
      ? String(d.parentId)
      : null;
  const rawTags = d.functionalTags || d.functional_tags;
  const tags = Array.isArray(rawTags) ? rawTags : [];
  return {
    id: String(d.id),
    deptCode: d.deptCode,
    name: d.name || d.deptName || "",
    deptName: d.deptName || d.name || "",
    parentDepartmentId,
    managerName: d.managerName || null,
    sortOrder: d.sortOrder || 10,
    functionalTags: Array.isArray(d.functionalTags) ? d.functionalTags : tags,
    functional_tags: Array.isArray(d.functional_tags) ? d.functional_tags : tags,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function mapApiUser(
  e: any,
  deptLookup?: { validIds: Set<string>; nameToId: Map<string, string>; idToName: Map<string, string> }
): UserNode {
  let resolvedDeptId: string | null =
    e.departmentId !== null && e.departmentId !== undefined && e.departmentId !== ""
      ? String(e.departmentId)
      : null;

  if (deptLookup) {
    if (!resolvedDeptId && e.department && deptLookup.nameToId.has(e.department)) {
      resolvedDeptId = deptLookup.nameToId.get(e.department) || null;
    }
    // 고아(Orphan) 직원 구출: 현재 존재하지 않는 부서 ID를 가진 직원은 '미배정(null)'으로 강제 이동
    if (resolvedDeptId && !deptLookup.validIds.has(resolvedDeptId)) {
      resolvedDeptId = null;
    }
  }

  const rawSt = String(e.status || e.employmentStatus || "ACTIVE").toUpperCase();
  const normStatus: UserNode["status"] =
    rawSt === "LEAVE" || rawSt === "LEAVE_OF_ABSENCE" || rawSt === "ON_LEAVE"
      ? "LEAVE_OF_ABSENCE"
      : rawSt === "RETIRED" || rawSt === "RESIGNED"
      ? "RETIRED"
      : "ACTIVE";

  const resolvedDeptName = deptLookup
    ? resolvedDeptId
      ? deptLookup.idToName.get(resolvedDeptId) || e.department || ""
      : ""
    : e.department || "";

  return {
    id: String(e.id),
    employeeNo: e.employeeNo,
    name: e.name || "",
    departmentId: resolvedDeptId,
    department: resolvedDeptName,
    position: e.position || "사원",
    duty: e.duty || "",
    tier_level: e.tier_level ?? e.tierLevel ?? 0,
    status: normStatus,
    role: e.role === "SUPER_ADMIN" ? "ADMIN" : e.role || "USER",
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
    insEmploymentInsurance:
      e.insEmploymentInsurance !== undefined ? Boolean(e.insEmploymentInsurance) : true,
    insIndustrialAccident:
      e.insIndustrialAccident !== undefined ? Boolean(e.insIndustrialAccident) : true,
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
}

/**
 * 부서 계층 및 정원 기준 관리자 역할(ADMIN / MANAGER / USER) 정책 일괄 정합성 보정.
 */
function enforceManagerPolicies(usersList: UserNode[], deptList: Department[]): UserNode[] {
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
}

/**
 * 인사 및 조직도 마스터 탭의 상태, 드래그앤드롭, 모달, 배치 저장 흐름을 관리하는 컨트롤러 훅.
 */
export function useOrganizationController(currentUser: any) {
  const isSuperAdmin =
    currentUser?.loginId === "admin" ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "ADMIN";
  const canEdit =
    isSuperAdmin || currentUser?.roleCode === "ADMIN" || currentUser?.roleCode === "HR_STAFF";
  const canViewPayroll =
    isSuperAdmin || currentUser?.roleCode === "ACCOUNTANT" || currentUser?.roleCode === "HR_STAFF";
  const isPrivileged = isSuperAdmin;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserNode[]>([]);

  const [dutyConfigs] = useState<ApprovalTierConfig[]>(DEFAULT_DUTY_TIERS);
  const [positionConfigs] = useState<ApprovalTierConfig[]>(DEFAULT_POSITION_TIERS);

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"DEPT" | "UNASSIGNED">("DEPT");

  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState<string>("");

  const [selectedProfile, setSelectedProfile] = useState<UserNode | null>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());

  const [showHandoffModal, setShowHandoffModal] = useState<UserNode | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setIsLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const showErrorModal = (message: string, title: string = "오류 안내") => {
    setErrorModal({ title, message });
  };

  const showToast = (text: string, type: "success" | "error" | "warning" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleRevealPhone = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

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

      const loadedDepts: Department[] = rawDepts.map(mapApiDepartment);
      const deptLookup = {
        validIds: new Set(loadedDepts.map((d) => d.id)),
        nameToId: new Map(loadedDepts.map((d) => [d.name, d.id])),
        idToName: new Map(loadedDepts.map((d) => [d.id, d.name])),
      };
      const loadedUsers: UserNode[] = rawEmps.map((e) => mapApiUser(e, deptLookup));

      setDepartments(loadedDepts);
      setUsers(loadedUsers);

      if (!preserveSelection && loadedDepts.length > 0 && !selectedDeptId) {
        setSelectedDeptId(loadedDepts[0].id);
        setActiveTab("DEPT");
      }

      setIsLoaded(true);
      setTimeout(() => setIsDirty(false), 50);
    } catch (err: any) {
      showErrorModal(
        `조직 및 인사 데이터를 불러오는 중 오류가 발생했습니다:\n${err.message}`,
        "데이터 로드 오류"
      );
    }
  };

  useEffect(() => {
    loadOrganizationData(false);
  }, []);

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
        body: JSON.stringify({ departments: cleanDepts, users: cleanUsers }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "조직도 일괄 저장 실패");
      }

      const savedDepts: Department[] = (data.departments || []).map(mapApiDepartment);
      const savedUsers: UserNode[] = (data.users || []).map((e: any) => mapApiUser(e));

      setDepartments(savedDepts);
      setUsers(savedUsers);
      setIsDirty(false);

      // 선택된 부서가 임시 ID(new-dept-...)였거나 변경된 경우 실제 저장된 DB 부서 ID로 즉시 매핑
      setSelectedDeptId((prevDeptId) => {
        if (!prevDeptId) return prevDeptId;
        if (savedDepts.some((d) => d.id === prevDeptId)) return prevDeptId;
        const prevDeptObj = cleanDepts.find((d) => d.id === prevDeptId);
        if (prevDeptObj) {
          const matched =
            savedDepts.find(
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

  const handleToggleDeptFunctionalTag = async (deptId: string, attrId: string) => {
    if (!canEdit) return;
    const nextDepts = departments.map((d) => {
      if (d.id !== deptId) return d;
      const currentTags = d.functionalTags || d.functional_tags || [];
      const safeTags = Array.isArray(currentTags) ? currentTags : [];
      const exists = safeTags.includes(attrId);
      const nextTags = exists ? safeTags.filter((t) => t !== attrId) : [...safeTags, attrId];
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
    const newDept: Department = {
      id: `new-dept-${Date.now()}`,
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
    const initialTier = getUserEffectiveTier(
      { position: defaultPos, duty: "" },
      dutyConfigs,
      positionConfigs
    ).effectiveTier;
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
    const updated = enforceManagerPolicies([...users, newUser], departments);
    setUsers(updated);
    setActiveTab("UNASSIGNED");
    setSelectedProfile(newUser);
    setShowPasswordInput(false);
    setIsDirty(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedProfile) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setSelectedProfile((prev) =>
            prev ? { ...prev, profileImageUrl: reader.result as string } : null
          );
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

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

  const handleStatusChange = async (userId: string, newStatus: UserNode["status"]) => {
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser && targetUser.loginId === "admin") {
      showErrorModal(
        "관리자(대표이사) 계정은 재직 상태를 변경(퇴사/휴직 처리)할 수 없습니다.",
        "상태 변경 불가"
      );
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

  return {
    activeTab,
    applyProfileChanges,
    canEdit,
    canViewPayroll,
    commitEditDept,
    confirmDeleteDept,
    confirmRetirement,
    departments,
    deptToDelete,
    draggedUserId,
    dutyConfigs,
    editingDeptId,
    editingDeptName,
    enforceManagerPolicies,
    errorModal,
    fileInputRef,
    handleAddDept,
    handleAddUser,
    handleDeleteDept,
    handleDeptKeyDown,
    handleDragOver,
    handleDragStart,
    handleDropToDept,
    handleDropToPool,
    handlePhotoUpload,
    handleSaveAll,
    handleStatusChange,
    handleToggleDeptFunctionalTag,
    handleWageInputChange,
    isDirty,
    isPrivileged,
    isSaving,
    isSuperAdmin,
    openUserProfile,
    positionConfigs,
    revealedPhones,
    selectedDeptId,
    selectedProfile,
    setActiveTab,
    setDeptToDelete,
    setDraggedUserId,
    setEditingDeptName,
    setErrorModal,
    setIsDirty,
    setSelectedDeptId,
    setSelectedProfile,
    setShowHandoffModal,
    setShowPasswordInput,
    setUsers,
    showHandoffModal,
    showPasswordInput,
    showToast,
    startEditDept,
    toastMessage,
    toggleRevealPhone,
    users,
  };
}
