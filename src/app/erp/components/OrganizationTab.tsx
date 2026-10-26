"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, Users, Plus, Edit2, Trash2, Search, 
  Download, RefreshCw, Check, X, Shield, Phone, Mail, MapPin, Calendar, DollarSign
} from "lucide-react";

interface Department {
  id: number;
  deptCode: string;
  deptName: string;
  parentId: number | null;
  managerName: string | null;
  sortOrder: number;
  memberCount: number;
}

interface Employee {
  id: number;
  employeeNo: string;
  loginId: string;
  name: string;
  position: string;
  duty?: string;
  tierLevel?: number;
  department: string;
  role: string;
  roleCode?: string;
  baseSalary?: number;
  email: string | null;
  phone: string | null;
  birthDate?: string | null;
  address?: string | null;
  joinDate: string;
  leaveDate: string | null;
  employmentStatus: "ACTIVE" | "LEAVE" | "RETIRED";
  grantDays: number;
  usedDays: number;
  remainDays: number;
}

interface OrganizationTabProps {
  currentUser: any;
}

export const OrganizationTab: React.FC<OrganizationTabProps> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"MEMBERS" | "DEPTS">("MEMBERS");

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Department Modal
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ id: 0, deptCode: "", deptName: "", managerName: "", sortOrder: 10 });
  const [isEditingDept, setIsEditingDept] = useState(false);

  // Employee Edit / Create Modal
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [isEditingEmp, setIsEditingEmp] = useState(false);
  const [empForm, setEmpForm] = useState({
    id: 0,
    employeeNo: "",
    loginId: "",
    name: "",
    position: "사원",
    duty: "팀원",
    tierLevel: 1,
    department: "기술개발부",
    role: "USER",
    roleCode: "EMPLOYEE",
    baseSalary: 3500000,
    email: "",
    phone: "",
    birthDate: "",
    address: "",
    joinDate: new Date().toISOString().substring(0, 10),
    grantDays: 15,
    employmentStatus: "ACTIVE" as "ACTIVE" | "LEAVE" | "RETIRED",
  });

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, empRes] = await Promise.all([
        fetch("/api/erp/departments"),
        fetch("/api/erp/employees"),
      ]);
      const deptData = await deptRes.json();
      const empData = await empRes.json();

      if (deptData.success) setDepartments(deptData.departments || []);
      if (empData.success) setEmployees(empData.employees || []);
    } catch (err: any) {
      showToast("데이터 로드 실패: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedDept !== "ALL" && emp.department !== selectedDept) return false;
      if (selectedStatus !== "ALL" && emp.employmentStatus !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchNo = emp.employeeNo.toLowerCase().includes(q);
        const matchDuty = (emp.duty || "").toLowerCase().includes(q);
        const matchPos = emp.position.toLowerCase().includes(q);
        if (!matchName && !matchNo && !matchDuty && !matchPos) return false;
      }
      return true;
    });
  }, [employees, selectedDept, selectedStatus, searchQuery]);

  // Handle Save Department
  const handleSaveDept = async () => {
    if (!deptForm.deptCode || !deptForm.deptName) {
      showToast("부서코드와 부서명은 필수입니다.", "error");
      return;
    }
    try {
      const method = isEditingDept ? "PUT" : "POST";
      const res = await fetch("/api/erp/departments", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deptForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "부서 저장 실패");

      showToast(isEditingDept ? "부서 정보 수정 완료" : "신규 부서 등록 완료");
      setDeptModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Department
  const handleDeleteDept = async (id: number) => {
    if (!confirm("해당 부서를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/erp/departments?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");
      showToast("부서가 삭제되었습니다.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Save Employee
  const handleSaveEmp = async () => {
    if (!empForm.employeeNo || !empForm.name || !empForm.loginId) {
      showToast("사번, 아이디, 성명은 필수입니다.", "error");
      return;
    }
    try {
      const method = isEditingEmp ? "PUT" : "POST";
      const res = await fetch("/api/erp/employees", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "사원 저장 실패");

      showToast(isEditingEmp ? "사원 정보 수정 완료" : "신규 사원 등록 완료");
      setEmpModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const openCreateEmpModal = () => {
    setIsEditingEmp(false);
    setEmpForm({
      id: 0,
      employeeNo: `DR-${String(employees.length + 1).padStart(3, "0")}`,
      loginId: `user${employees.length + 1}`,
      name: "",
      position: "사원",
      duty: "팀원",
      tierLevel: 1,
      department: departments[0]?.deptName || "기술개발부",
      role: "USER",
      roleCode: "EMPLOYEE",
      baseSalary: 3500000,
      email: "",
      phone: "",
      birthDate: "",
      address: "",
      joinDate: new Date().toISOString().substring(0, 10),
      grantDays: 15,
      employmentStatus: "ACTIVE",
    });
    setEmpModalOpen(true);
  };

  const openEditEmpModal = (emp: Employee) => {
    setIsEditingEmp(true);
    setEmpForm({
      id: emp.id,
      employeeNo: emp.employeeNo,
      loginId: emp.loginId,
      name: emp.name,
      position: emp.position,
      duty: emp.duty || "팀원",
      tierLevel: emp.tierLevel || 1,
      department: emp.department,
      role: emp.role,
      roleCode: emp.roleCode || "EMPLOYEE",
      baseSalary: emp.baseSalary || 3500000,
      email: emp.email || "",
      phone: emp.phone || "",
      birthDate: emp.birthDate ? emp.birthDate.substring(0, 10) : "",
      address: emp.address || "",
      joinDate: emp.joinDate ? emp.joinDate.substring(0, 10) : "",
      grantDays: emp.grantDays,
      employmentStatus: emp.employmentStatus,
    });
    setEmpModalOpen(true);
  };

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

      {/* Top Action Bar (Gutenberg Z-Pattern) */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded border border-slate-700">
            <button
              onClick={() => setActiveSubTab("MEMBERS")}
              className={`px-3 py-1 text-xs font-bold rounded transition ${
                activeSubTab === "MEMBERS"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              임직원 인사카드 ({filteredEmployees.length}명)
            </button>
            <button
              onClick={() => setActiveSubTab("DEPTS")}
              className={`px-3 py-1 text-xs font-bold rounded transition ${
                activeSubTab === "DEPTS"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              부서 조직도 ({departments.length}개 부서)
            </button>
          </div>

          {activeSubTab === "MEMBERS" && (
            <div className="flex items-center gap-2">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">전체 부서</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.deptName}>
                    {d.deptName}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">전체 재직상태</option>
                <option value="ACTIVE">재직</option>
                <option value="LEAVE">휴직</option>
                <option value="RETIRED">퇴사</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="사원명 / 사번 / 직책 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded w-48 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
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

          {isAdmin && activeSubTab === "MEMBERS" && (
            <button
              onClick={openCreateEmpModal}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>신규 사원 등록</span>
            </button>
          )}

          {isAdmin && activeSubTab === "DEPTS" && (
            <button
              onClick={() => {
                setIsEditingDept(false);
                setDeptForm({
                  id: 0,
                  deptCode: `DEPT-${departments.length + 1}`,
                  deptName: "",
                  managerName: "",
                  sortOrder: (departments.length + 1) * 10,
                });
                setDeptModalOpen(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>신규 부서 등록</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {activeSubTab === "MEMBERS" ? (
          <div className="bg-slate-900 border border-slate-800 rounded shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">사번</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">성명</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">부서</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">직급</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">직책</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-center">결재티어</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">권한역할</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">기본급(월)</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">입사일</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">연락처</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-center">상태</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-500">
                        등록된 사원이 없거나 검색 조건과 일치하는 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-400">
                          {emp.employeeNo}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          {emp.loginId === "admin" && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded border border-amber-500/30">
                              대표
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-300">
                          {emp.department}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-300">
                          {emp.position}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-300">
                          {emp.duty || "-"}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 border border-slate-700 text-blue-300">
                            Tier {emp.tierLevel || 1}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="text-[11px] font-medium text-slate-300">
                            {emp.roleCode || emp.role}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-emerald-400 font-semibold">
                          ₩{(emp.baseSalary || 3500000).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-400">
                          {emp.joinDate ? emp.joinDate.substring(0, 10) : "-"}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {emp.phone || "-"}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              emp.employmentStatus === "ACTIVE"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : emp.employmentStatus === "LEAVE"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {emp.employmentStatus === "ACTIVE" ? "재직" : emp.employmentStatus === "LEAVE" ? "휴직" : "퇴사"}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-center">
                          {isAdmin && (
                            <button
                              onClick={() => openEditEmpModal(emp)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px] transition"
                            >
                              수정
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-blue-400 font-bold">
                      {dept.deptCode}
                    </span>
                    <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">
                      순서 {dept.sortOrder}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>{dept.deptName}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    부서 책임자: <span className="text-slate-200 font-semibold">{dept.managerName || "미지정"}</span>
                  </p>
                  <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400">소속 사원</span>
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {dept.memberCount || 0}명
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setIsEditingDept(true);
                        setDeptForm({
                          id: dept.id,
                          deptCode: dept.deptCode,
                          deptName: dept.deptName,
                          managerName: dept.managerName || "",
                          sortOrder: dept.sortOrder,
                        });
                        setDeptModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteDept(dept.id)}
                      className="px-2.5 py-1 text-xs bg-rose-950 hover:bg-rose-900 text-rose-300 rounded border border-rose-800 transition"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Department Edit/Create Modal */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-md shadow-2xl">
            <h2 className="text-sm font-bold text-slate-100 mb-4 pb-2 border-b border-slate-800">
              {isEditingDept ? "부서 정보 수정" : "신규 부서 등록"}
            </h2>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">부서 코드</label>
                <input
                  type="text"
                  disabled={isEditingDept}
                  value={deptForm.deptCode}
                  onChange={(e) => setDeptForm({ ...deptForm, deptCode: e.target.value })}
                  placeholder="예: SALES"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">부서명</label>
                <input
                  type="text"
                  value={deptForm.deptName}
                  onChange={(e) => setDeptForm({ ...deptForm, deptName: e.target.value })}
                  placeholder="예: 영업관리부"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">부서 책임자 (팀장/부서장)</label>
                <input
                  type="text"
                  value={deptForm.managerName}
                  onChange={(e) => setDeptForm({ ...deptForm, managerName: e.target.value })}
                  placeholder="예: 홍길동 팀장"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">표시 순서</label>
                <input
                  type="number"
                  value={deptForm.sortOrder}
                  onChange={(e) => setDeptForm({ ...deptForm, sortOrder: parseInt(e.target.value) || 1 })}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setDeptModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700"
              >
                취소
              </button>
              <button
                onClick={handleSaveDept}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Edit/Create Modal */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-sm font-bold text-slate-100 mb-4 pb-2 border-b border-slate-800">
              {isEditingEmp ? `사원 정보 수정 (${empForm.name})` : "신규 사원 등록"}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">사번</label>
                <input
                  type="text"
                  disabled={isEditingEmp}
                  value={empForm.employeeNo}
                  onChange={(e) => setEmpForm({ ...empForm, employeeNo: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">로그인 아이디</label>
                <input
                  type="text"
                  disabled={isEditingEmp}
                  value={empForm.loginId}
                  onChange={(e) => setEmpForm({ ...empForm, loginId: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">성명</label>
                <input
                  type="text"
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">소속 부서</label>
                <select
                  value={empForm.department}
                  onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.deptName}>
                      {d.deptName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">직급</label>
                <input
                  type="text"
                  value={empForm.position}
                  onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
                  placeholder="예: 사원 / 대리 / 과장 / 차장 / 부장"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">직책 (단위조직 책임)</label>
                <input
                  type="text"
                  value={empForm.duty}
                  onChange={(e) => setEmpForm({ ...empForm, duty: e.target.value })}
                  placeholder="예: 팀원 / 파트장 / 팀장 / 부서장"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">결재선 티어 (1~5)</label>
                <select
                  value={empForm.tierLevel}
                  onChange={(e) => setEmpForm({ ...empForm, tierLevel: parseInt(e.target.value) })}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value={1}>Tier 1 (팀원/일반)</option>
                  <option value={2}>Tier 2 (팀장/1차승인)</option>
                  <option value={3}>Tier 3 (부서장/중간승인)</option>
                  <option value={4}>Tier 4 (임원/총괄)</option>
                  <option value={5}>Tier 5 (대표이사/최종전결)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">권한 역할 (Role)</label>
                <select
                  value={empForm.roleCode}
                  onChange={(e) => setEmpForm({ ...empForm, roleCode: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="ADMIN">ADMIN (최고관리자)</option>
                  <option value="MANAGER">MANAGER (부서장/매니저)</option>
                  <option value="ACCOUNTANT">ACCOUNTANT (재무회계)</option>
                  <option value="HR_STAFF">HR_STAFF (인사총무)</option>
                  <option value="EMPLOYEE">EMPLOYEE (일반사원)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">기본급 (원/월)</label>
                <input
                  type="number"
                  value={empForm.baseSalary}
                  onChange={(e) => setEmpForm({ ...empForm, baseSalary: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">입사일자</label>
                <input
                  type="date"
                  value={empForm.joinDate}
                  onChange={(e) => setEmpForm({ ...empForm, joinDate: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">연락처</label>
                <input
                  type="text"
                  value={empForm.phone}
                  onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">이메일</label>
                <input
                  type="email"
                  value={empForm.email}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                  placeholder="example@dragonrpa.co.kr"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">생년월일</label>
                <input
                  type="date"
                  value={empForm.birthDate}
                  onChange={(e) => setEmpForm({ ...empForm, birthDate: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">재직 상태</label>
                <select
                  value={empForm.employmentStatus}
                  onChange={(e) => setEmpForm({ ...empForm, employmentStatus: e.target.value as any })}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="ACTIVE">재직 (ACTIVE)</option>
                  <option value="LEAVE">휴직 (LEAVE)</option>
                  <option value="RETIRED">퇴사 (RETIRED)</option>
                </select>
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">주소</label>
                <input
                  type="text"
                  value={empForm.address}
                  onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                  placeholder="거주지 주소"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setEmpModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700"
              >
                취소
              </button>
              <button
                onClick={handleSaveEmp}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
