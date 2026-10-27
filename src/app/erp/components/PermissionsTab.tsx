"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Shield, Check, Lock, Save, Plus, Users, 
  Search, RefreshCw, Key, CheckSquare, Square, Info,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { sortErpItems, SortDirection, formatErpNumber } from "@/lib/erpFormat";

interface CustomRole {
  id: number;
  roleCode: string;
  roleName: string;
  description: string | null;
  assignedCount: number;
}

interface RolePermission {
  id: number;
  roleCode: string;
  menuKey: string;
  canView: boolean;
  canSave: boolean;
}

interface Employee {
  id: number;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  duty?: string;
  roleCode?: string;
}

const MENU_DEFS = [
  { key: "org", name: "조직 인사관리", category: "인사" },
  { key: "users", name: "사용자 및 권한", category: "인사" },
  { key: "leave_apply", name: "연차 신청", category: "근태" },
  { key: "leave_manage", name: "연차 관리", category: "근태" },
  { key: "ot_manage", name: "연장근무 관리", category: "근태" },
  { key: "approval_inbox", name: "내 결재함", category: "결재" },
  { key: "approval_rules", name: "결재선 규칙 설정", category: "결재" },
  { key: "bank_matching", name: "은행 입출금 대장", category: "회계" },
  { key: "payroll", name: "급여 정산", category: "회계" },
  { key: "tax_invoice", name: "세금계산서 발행", category: "회계" },
  { key: "customer", name: "고객 관리 (매출처)", category: "거래처" },
  { key: "vendor", name: "매입거래처 관리", category: "거래처" },
  { key: "trade", name: "판매용 (커머스)", category: "영업" },
  { key: "rental", name: "임대용 (렌탈자산)", category: "영업" },
  { key: "service", name: "용역 관리 (운영/개발)", category: "영업" },
];

export const PermissionsTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";

  const [activeSubTab, setActiveSubTab] = useState<"ROLES" | "USERS">("ROLES");
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>("ADMIN");
  const [loading, setLoading] = useState(false);

  // Editable permission matrix for selected role
  const [workingPerms, setWorkingPerms] = useState<Record<string, { canView: boolean; canSave: boolean }>>({});
  const [isDirty, setIsDirty] = useState(false);

  // New Role Modal
  const [newRoleModal, setNewRoleModal] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  // Employee search
  const [userSearch, setUserSearch] = useState("");
  const [userDeptFilter, setUserDeptFilter] = useState("ALL");

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [permRes, empRes] = await Promise.all([
        fetch("/api/erp/permissions"),
        fetch("/api/erp/employees"),
      ]);
      const permData = await permRes.json();
      const empData = await empRes.json();

      if (permData.success) {
        setRoles(permData.roles || []);
        setPermissions(permData.permissions || []);
        if (permData.roles?.length > 0 && !selectedRoleCode) {
          setSelectedRoleCode(permData.roles[0].roleCode);
        }
      }
      if (empData.success) {
        setEmployees(empData.employees || []);
      }
    } catch (err: any) {
      showToast("권한 데이터 로드 실패: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update working permissions when selected role or permissions change
  useEffect(() => {
    if (!selectedRoleCode) return;
    const currentRolePerms = permissions.filter((p) => p.roleCode === selectedRoleCode);
    const map: Record<string, { canView: boolean; canSave: boolean }> = {};

    MENU_DEFS.forEach((m) => {
      const found = currentRolePerms.find((p) => p.menuKey === m.key);
      map[m.key] = {
        canView: found ? found.canView : false,
        canSave: found ? found.canSave : false,
      };
    });

    setWorkingPerms(map);
    setIsDirty(false);
  }, [selectedRoleCode, permissions]);

  const handleToggle = (menuKey: string, field: "canView" | "canSave") => {
    if (!isAdmin) return;
    setWorkingPerms((prev) => {
      const curr = prev[menuKey] || { canView: false, canSave: false };
      const nextVal = !curr[field];
      let updated = { ...curr, [field]: nextVal };
      // If saving enabled, view must also be enabled
      if (field === "canSave" && nextVal) {
        updated.canView = true;
      }
      // If view disabled, save must also be disabled
      if (field === "canView" && !nextVal) {
        updated.canSave = false;
      }
      return { ...prev, [menuKey]: updated };
    });
    setIsDirty(true);
  };

  const handleSelectAll = (field: "canView" | "canSave", val: boolean) => {
    if (!isAdmin) return;
    setWorkingPerms((prev) => {
      const updated = { ...prev };
      MENU_DEFS.forEach((m) => {
        const curr = updated[m.key] || { canView: false, canSave: false };
        if (field === "canSave") {
          updated[m.key] = { canView: val ? true : curr.canView, canSave: val };
        } else {
          updated[m.key] = { canView: val, canSave: val ? curr.canSave : false };
        }
      });
      return updated;
    });
    setIsDirty(true);
  };

  const handleSavePerms = async () => {
    try {
      const permArray = Object.entries(workingPerms).map(([menuKey, val]) => ({
        menuKey,
        canView: val.canView,
        canSave: val.canSave,
      }));

      const res = await fetch("/api/erp/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleCode: selectedRoleCode,
          permissions: permArray,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "권한 갱신 실패");

      showToast(`[${selectedRoleCode}] 권한 설정이 성공적으로 저장되었습니다.`);
      setIsDirty(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleCode || !newRoleName) {
      showToast("역할 코드와 역할명은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleCode: newRoleCode.toUpperCase(),
          roleName: newRoleName,
          description: newRoleDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "역할 생성 실패");

      showToast("신규 역할이 등록되었습니다.");
      setNewRoleModal(false);
      setSelectedRoleCode(newRoleCode.toUpperCase());
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleAssignRole = async (employeeId: number, roleCode: string) => {
    try {
      const res = await fetch("/api/erp/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, roleCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "역할 배정 실패");

      showToast("사원의 권한 역할이 변경되었습니다.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const [userSortKey, setUserSortKey] = useState<string>("employeeNo");
  const [userSortDir, setUserSortDir] = useState<SortDirection>("asc");

  const handleUserSort = (key: string) => {
    if (userSortKey === key) {
      setUserSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setUserSortKey(key);
      setUserSortDir("asc");
    }
  };

  const renderSortTh = (label: string, colKey: string, align: "left" | "right" | "center" = "left") => (
    <th
      onClick={() => handleUserSort(colKey)}
      className={`py-2.5 px-3 whitespace-nowrap cursor-pointer select-none hover:bg-slate-700/60 transition ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      }`}
    >
      <div className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
        <span>{label}</span>
        {userSortKey === colKey ? (
          userSortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
        )}
      </div>
    </th>
  );

  const filteredEmployees = employees.filter((emp) => {
    if (userDeptFilter !== "ALL" && emp.department !== userDeptFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.employeeNo.toLowerCase().includes(q) ||
        (emp.duty || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sortedFilteredEmployees = useMemo(() => {
    return sortErpItems(filteredEmployees, userSortKey, userSortDir);
  }, [filteredEmployees, userSortKey, userSortDir]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-xs font-bold border ${
            toastMessage.type === "success"
              ? "bg-emerald-950 border-emerald-500 text-emerald-200"
              : "bg-rose-950 border-rose-500 text-rose-200"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Top Header & Sub-Navigation */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded border border-slate-700">
            <button
              onClick={() => setActiveSubTab("ROLES")}
              className={`px-3 py-1 text-xs font-bold rounded transition ${
                activeSubTab === "ROLES" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              역할 권한 매트릭스 ({formatErpNumber(roles.length)}개 역할)
            </button>
            <button
              onClick={() => setActiveSubTab("USERS")}
              className={`px-3 py-1 text-xs font-bold rounded transition ${
                activeSubTab === "USERS" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              사원 권한 배정 ({formatErpNumber(employees.length)}명)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          {isAdmin && activeSubTab === "ROLES" && (
            <>
              <button
                onClick={() => {
                  setNewRoleCode("");
                  setNewRoleName("");
                  setNewRoleDesc("");
                  setNewRoleModal(true);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded flex items-center gap-1.5 border border-slate-700 shadow transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>신규 역할 생성</span>
              </button>

              <button
                onClick={handleSavePerms}
                disabled={!isDirty}
                className={`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 shadow transition ${
                  isDirty
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>권한 변경사항 저장</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-hidden p-4">
        {activeSubTab === "ROLES" ? (
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Left: Role List (3 cols) */}
            <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-slate-900 border border-slate-800 rounded p-3 flex flex-col gap-2 overflow-y-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                역할(Role) 마스터
              </span>
              {roles.map((r) => (
                <button
                  key={r.roleCode}
                  onClick={() => setSelectedRoleCode(r.roleCode)}
                  className={`p-3 rounded text-left border transition flex flex-col gap-1 ${
                    selectedRoleCode === r.roleCode
                      ? "bg-blue-950/60 border-blue-500 text-white"
                      : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{r.roleName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                      {r.roleCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {r.description || "설명 없음"}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span>배정 인원</span>
                    <span className="font-bold text-slate-300 font-mono">{formatErpNumber(r.assignedCount || 0)}명</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Right: Menu Permission Matrix (9 cols) */}
            <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-slate-900 border border-slate-800 rounded flex flex-col overflow-hidden">
              <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-slate-200">
                    [{selectedRoleCode}] 메뉴별 접근 및 조작 권한 설정
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectAll("canView", true)}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                    >
                      전체 조회 허용
                    </button>
                    <button
                      onClick={() => handleSelectAll("canSave", true)}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                    >
                      전체 저장 허용
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-700 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">카테고리</th>
                      <th className="py-2.5 px-3">메뉴명 (기능 모듈)</th>
                      <th className="py-2.5 px-3 text-center w-28">조회 권한 (View)</th>
                      <th className="py-2.5 px-3 text-center w-28">저장/수정 권한 (Save)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {MENU_DEFS.map((m) => {
                      const cur = workingPerms[m.key] || { canView: false, canSave: false };
                      return (
                        <tr key={m.key} className="hover:bg-slate-800/40 transition">
                          <td className="py-2 px-3 text-slate-400 font-medium">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700">
                              {m.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-200">
                            {m.name}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => handleToggle(m.key, "canView")}
                              disabled={!isAdmin}
                              className={`p-1.5 rounded transition ${
                                cur.canView
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => handleToggle(m.key, "canSave")}
                              disabled={!isAdmin}
                              className={`p-1.5 rounded transition ${
                                cur.canSave
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded flex flex-col h-full overflow-hidden">
            {/* Filter */}
            <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="사원명 / 사번 검색"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded w-48 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <span className="text-xs text-slate-400">
                총 {formatErpNumber(filteredEmployees.length)}명
              </span>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-700 sticky top-0 z-10 select-none">
                  <tr>
                    {renderSortTh("사번", "employeeNo")}
                    {renderSortTh("성명", "name")}
                    {renderSortTh("소속 부서", "department")}
                    {renderSortTh("직급 / 직책", "position")}
                    {renderSortTh("현재 배정된 권한 역할", "roleCode")}
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">권한 역할 변경</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sortedFilteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 font-mono text-slate-400">{emp.employeeNo}</td>
                      <td className="py-2 px-3 font-bold text-slate-100">{emp.name}</td>
                      <td className="py-2 px-3 text-slate-300">{emp.department}</td>
                      <td className="py-2 px-3 text-slate-300">
                        {emp.position} {emp.duty ? `(${emp.duty})` : ""}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-950/60 border border-blue-800 text-blue-300">
                          {emp.roleCode || "EMPLOYEE"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {isAdmin ? (
                          <select
                            value={emp.roleCode || "EMPLOYEE"}
                            onChange={(e) => handleAssignRole(emp.id, e.target.value)}
                            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2 py-1 rounded focus:outline-none focus:border-blue-500"
                          >
                            {roles.map((r) => (
                              <option key={r.roleCode} value={r.roleCode}>
                                {r.roleName} ({r.roleCode})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-500 text-[11px]">수정 권한 없음</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {newRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-md shadow-2xl">
            <h2 className="text-sm font-bold text-slate-100 mb-4 pb-2 border-b border-slate-800">
              신규 역할(Role) 등록
            </h2>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">역할 코드 (영문 대문자)</label>
                <input
                  type="text"
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  placeholder="예: AUDITOR"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">역할 명칭</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="예: 내부감사 담당자"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">역할 설명</label>
                <textarea
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="역할에 대한 상세 권한 설명"
                  rows={3}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setNewRoleModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700"
              >
                취소
              </button>
              <button
                onClick={handleCreateRole}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
