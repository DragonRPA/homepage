"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, UserPlus, RefreshCw, Calendar, CheckCircle2, XCircle, 
  Clock, AlertCircle, Search, Edit2, Shield, FileText, Check, X,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { formatErpNumber, formatErpCurrency, formatErpQty, sortErpItems, SortDirection } from "@/lib/erpFormat";

interface EmployeeTabProps {
  currentUser: any;
}

export const EmployeeTab: React.FC<EmployeeTabProps> = ({ currentUser }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"directory" | "leaves">("directory");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  // Modals
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [showResetLeaveModal, setShowResetLeaveModal] = useState(false);
  const [showLeaveApplyModal, setShowLeaveApplyModal] = useState(false);

  // New Emp Form State
  const [empNo, setEmpNo] = useState("");
  const [empLoginId, setEmpLoginId] = useState("");
  const [empName, setEmpName] = useState("");
  const [empDept, setEmpDept] = useState("기술개발부");
  const [empPosition, setEmpPosition] = useState("사원");
  const [empRole, setEmpRole] = useState("USER");
  const [empEmail, setEmpEmail] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empSalaryBankName, setEmpSalaryBankName] = useState("");
  const [empSalaryAccountNo, setEmpSalaryAccountNo] = useState("");
  const [empSalaryAccountHolder, setEmpSalaryAccountHolder] = useState("");
  const [empJoinDate, setEmpJoinDate] = useState(new Date().toISOString().split("T")[0]);
  const [empGrantDays, setEmpGrantDays] = useState("15.0");

  // Leave Apply Form State
  const [leaveEmpId, setLeaveEmpId] = useState<string>("");
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [leaveStart, setLeaveStart] = useState(new Date().toISOString().split("T")[0]);
  const [leaveEnd, setLeaveEnd] = useState(new Date().toISOString().split("T")[0]);
  const [deductedDays, setDeductedDays] = useState("1.0");
  const [leaveReason, setLeaveReason] = useState("");

  // Toast State
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Employees & Leaves
  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, leaveRes] = await Promise.all([
        fetch("/api/erp/employees"),
        fetch("/api/erp/leaves")
      ]);
      const empData = await empRes.json();
      const leaveData = await leaveRes.json();

      if (empData.success) setEmployees(empData.employees);
      if (leaveData.success) setLeaves(leaveData.leaves);
    } catch (err) {
      console.error(err);
      showToast("데이터 조회 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch = 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.employeeNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.loginId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = deptFilter === "ALL" || e.department === deptFilter;
      const matchesStatus = statusFilter === "ALL" || e.employmentStatus === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchTerm, deptFilter, statusFilter]);

  // Sorting State
  const [sortKey, setSortKey] = useState<string>("employeeNo");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => {
    const isActive = sortKey === key;
    return (
      <th
        onClick={() => handleSort(key)}
        className={`py-2.5 px-3 cursor-pointer select-none transition text-${align} whitespace-nowrap hover:bg-[#d0c6b4] dark:hover:bg-slate-800`}
        title={`${label} 기준 정렬`}
      >
        <div className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start"}`}>
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold" />
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const sortedEmployees = useMemo(() => {
    return sortErpItems(filteredEmployees, sortKey, sortDir);
  }, [filteredEmployees, sortKey, sortDir]);

  const sortedLeaves = useMemo(() => {
    return sortErpItems(leaves, sortKey, sortDir);
  }, [leaves, sortKey, sortDir]);

  // Handle Add Employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNo || !empLoginId || !empName) {
      showToast("사번, 아이디, 성명은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeNo: empNo,
          loginId: empLoginId,
          name: empName,
          department: empDept,
          position: empPosition,
          role: empRole,
          email: empEmail,
          phone: empPhone,
          salaryBankName: empSalaryBankName,
          salaryAccountNo: empSalaryAccountNo,
          salaryAccountHolder: empSalaryAccountHolder || empName,
          joinDate: empJoinDate,
          grantDays: empGrantDays
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "사원 등록 실패");

      showToast(`사원 [${empName}] 등록 완료`);
      setShowAddEmpModal(false);
      setEmpNo("");
      setEmpLoginId("");
      setEmpName("");
      setEmpSalaryBankName("");
      setEmpSalaryAccountNo("");
      setEmpSalaryAccountHolder("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Annual Leave Reset (대표님 확정 규정: 3, 5, 7, 9년차 가산)
  const handleResetAnnualLeave = async () => {
    const currentYear = new Date().getFullYear();
    if (!window.confirm(`${currentYear}년도 전 사원 연차를 일괄 계산 및 초기화하시겠습니까?\n(3·5·7·9년차 가산 규정 적용)`)) {
      return;
    }

    try {
      const res = await fetch("/api/erp/employees/reset-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetYear: currentYear,
          executedBy: currentUser?.name || "ADMIN"
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "연차 초기화 실패");

      showToast(data.message, "success");
      setShowResetLeaveModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Leave Apply
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const empId = leaveEmpId || currentUser?.id;
    if (!empId || !leaveStart || !leaveEnd || !leaveReason) {
      showToast("사원, 기간, 사유는 필수 입력입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: empId,
          leaveType,
          startDate: leaveStart,
          endDate: leaveEnd,
          deductedDays,
          reason: leaveReason
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "연차 신청 실패");

      showToast("연차 신청이 접수되었습니다. 결재 대기 중입니다.");
      setShowLeaveApplyModal(false);
      setLeaveReason("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Approve / Reject Leave
  const handleDecideLeave = async (requestId: number, action: "APPROVE" | "REJECT") => {
    const actionText = action === "APPROVE" ? "승인" : "반려";
    if (!window.confirm(`선택한 연차 신청을 ${actionText}하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/erp/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          approverId: currentUser?.id || 1,
          rejectReason: action === "REJECT" ? "관리자 반려" : null
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "결재 처리 실패");

      showToast(data.message);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 overflow-hidden font-sans">
      {toast && (
        <div className={`fixed top-16 right-5 z-50 px-4 py-2 rounded text-xs font-bold text-white shadow-xl ${
          toast.type === "error" ? "bg-[#dc2626]" : "bg-[#047857]"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-[#b5a894] dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("directory")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              activeSubTab === "directory" 
                ? "bg-[#1d4ed8] text-white shadow-xs" 
                : "bg-[#dcd4c4] text-[#334155] hover:bg-[#d0c6b4] border border-[#b5a894] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>사원 대장 & 연차 현황</span>
          </button>
          <button
            onClick={() => setActiveSubTab("leaves")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              activeSubTab === "leaves" 
                ? "bg-[#1d4ed8] text-white shadow-xs" 
                : "bg-[#dcd4c4] text-[#334155] hover:bg-[#d0c6b4] border border-[#b5a894] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>연차 신청 및 결재함</span>
            {leaves.filter(l => l.status === "PENDING").length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#b45309] text-[10px] text-white font-bold">
                {leaves.filter(l => l.status === "PENDING").length}
              </span>
            )}
          </button>
        </div>

        {/* Action Buttons (Pipeline) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLeaveApplyModal(true)}
            className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] border border-[#b5a894] text-xs font-bold text-[#0f172a] rounded flex items-center gap-1.5 transition dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          >
            <Calendar className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400" />
            <span>연차 신청</span>
          </button>
          {currentUser?.role !== "USER" && (
            <>
              <button
                onClick={() => setShowResetLeaveModal(true)}
                className="px-3 py-1.5 bg-[#fef3c7] hover:bg-[#fde68a] border border-[#fde68a] text-xs font-bold text-[#92400e] rounded flex items-center gap-1.5 transition dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-300"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>연 단위 연차 초기화</span>
              </button>
              <button
                onClick={() => setShowAddEmpModal(true)}
                className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>사원 등록</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scope / Filter Bar (Gutenberg Z-Pattern ①) */}
      {activeSubTab === "directory" && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-[#f4efe4] p-2.5 rounded border border-[#b5a894] text-xs dark:bg-slate-900/60 dark:border-slate-800">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#334155] dark:text-slate-400 font-semibold">검색 (성명/사번/아이디)</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#475569] dark:text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="검색어 입력..."
                className="w-full h-8 pl-8 pr-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#334155] dark:text-slate-400 font-semibold">소속 부서</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              <option value="ALL">전체 부서</option>
              <option value="경영총괄">경영총괄</option>
              <option value="기술개발부">기술개발부</option>
              <option value="영업관리부">영업관리부</option>
              <option value="고객지원부">고객지원부</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#334155] dark:text-slate-400 font-semibold">재직 상태</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              <option value="ALL">전체 상태</option>
              <option value="ACTIVE">재직</option>
              <option value="ON_LEAVE">휴직</option>
              <option value="RESIGNED">퇴사</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchData}
              className="w-full h-8 bg-[#dcd4c4] hover:bg-[#d0c6b4] border border-[#b5a894] rounded text-xs font-bold text-[#0f172a] flex items-center justify-center gap-1.5 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>새로고침</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Inspection Grid (Gutenberg Z-Pattern ③) */}
      <div className="flex-1 bg-[#ebe5d8] border border-[#b5a894] rounded overflow-auto shadow-xs dark:bg-slate-900 dark:border-slate-800">
        {activeSubTab === "directory" ? (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] font-semibold select-none z-10 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
              <tr>
                {renderSortTh("사번", "employeeNo")}
                {renderSortTh("성명", "name")}
                {renderSortTh("부서", "department")}
                {renderSortTh("직급", "position")}
                {renderSortTh("권한", "role")}
                {renderSortTh("입사일자", "joinDate")}
                {renderSortTh("재직상태", "employmentStatus")}
                {renderSortTh("부여연차", "grantDays", "right")}
                {renderSortTh("사용연차", "usedDays", "right")}
                {renderSortTh("잔여연차", "remainDays", "right")}
                {renderSortTh("급여계좌", "salaryBankName")}
                {renderSortTh("연락처 / 이메일", "email")}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-[#475569] dark:text-slate-500">
                    {loading ? "사원 데이터를 불러오는 중..." : "등록된 사원 데이터가 없습니다."}
                  </td>
                </tr>
              ) : (
                sortedEmployees.map((e) => (
                  <tr key={e.id} className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-mono text-[#1d4ed8] dark:text-blue-400 font-semibold">{e.employeeNo}</td>
                    <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100">{e.name}</td>
                    <td className="py-2 px-3 text-[#334155] dark:text-slate-300">{e.department}</td>
                    <td className="py-2 px-3 text-[#334155] dark:text-slate-300">{e.position}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        e.role === "SUPER_ADMIN" ? "bg-[#f3e8ff] text-[#6b21a8] border border-[#d8b4fe] dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800" :
                        e.role === "ADMIN" ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800" :
                        "bg-[#dcd4c4] text-[#0f172a] border border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      }`}>
                        {e.role}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-400">{e.joinDate}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        e.employmentStatus === "ACTIVE" ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" :
                        e.employmentStatus === "ON_LEAVE" ? "bg-[#fef3c7] text-[#92400e] border border-[#fde68a] dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" :
                        "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"
                      }`}>
                        {e.employmentStatus === "ACTIVE" ? "재직" : e.employmentStatus === "ON_LEAVE" ? "휴직" : "퇴사"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#0f172a] dark:text-slate-200">{formatErpNumber(e.grantDays)}일</td>
                    <td className="py-2 px-3 text-right font-mono text-[#b45309] dark:text-amber-400">{formatErpNumber(e.usedDays)}일</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#047857] dark:text-emerald-400">
                      {formatErpNumber(e.remainDays)}일
                    </td>
                    <td className="py-2 px-3 text-[#334155] dark:text-slate-300 text-[11px] font-mono">
                      {e.salaryBankName || e.salaryAccountNo ? `${e.salaryBankName || "-"} ${e.salaryAccountNo || "-"}` : "-"}
                    </td>
                    <td className="py-2 px-3 text-[#475569] dark:text-slate-400 text-[11px]">
                      {e.phone || "-"} / {e.email || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] font-semibold select-none z-10 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
              <tr>
                {renderSortTh("신청일", "createdAt")}
                {renderSortTh("사원명", "employeeName")}
                {renderSortTh("부서 / 직급", "department")}
                {renderSortTh("연차 구분", "leaveType")}
                {renderSortTh("기간", "startDate")}
                {renderSortTh("차감일수", "deductedDays", "right")}
                {renderSortTh("신청 사유", "reason")}
                {renderSortTh("결재 상태", "status")}
                {renderSortTh("결재자", "approverName")}
                <th className="py-2.5 px-3 text-center">결재 조치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedLeaves.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#475569] dark:text-slate-500">
                    신청된 연차 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-400">{l.createdAt?.split("T")[0]}</td>
                    <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100">{l.employeeName}</td>
                    <td className="py-2 px-3 text-[#334155] dark:text-slate-300">{l.department} {l.position}</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] text-[10px] font-semibold dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                        {l.leaveType === "ANNUAL" ? "연차" : l.leaveType === "HALF_AM" ? "오전반차" : l.leaveType === "HALF_PM" ? "오후반차" : "특별휴가"}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[#334155] dark:text-slate-300">
                      {l.startDate} ~ {l.endDate}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#b45309] dark:text-amber-400">
                      {formatErpNumber(l.deductedDays)}일
                    </td>
                    <td className="py-2 px-3 text-[#0f172a] dark:text-slate-200 max-w-xs truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.status === "APPROVED" ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" :
                        l.status === "REJECTED" ? "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800" :
                        "bg-[#fef3c7] text-[#92400e] border border-[#fde68a] dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
                      }`}>
                        {l.status === "APPROVED" ? "승인완료" : l.status === "REJECTED" ? "반려" : "결재대기"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[#475569] dark:text-slate-400">{l.approverName || "-"}</td>
                    <td className="py-2 px-3 text-center">
                      {l.status === "PENDING" && currentUser?.role !== "USER" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleDecideLeave(l.id, "APPROVE")}
                            className="px-2 py-1 bg-[#047857] hover:bg-[#065f46] text-white rounded text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
                          >
                            <Check className="w-3 h-3" />
                            <span>승인</span>
                          </button>
                          <button
                            onClick={() => handleDecideLeave(l.id, "REJECT")}
                            className="px-2 py-1 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
                          >
                            <X className="w-3 h-3" />
                            <span>반려</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#475569] dark:text-slate-500 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Terminal Summary (Gutenberg Z-Pattern ④) */}
      <div className="bg-[#e2dbcd] border border-[#b5a894] px-4 py-2.5 rounded flex items-center justify-between text-xs text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">
        <div className="flex items-center gap-4">
          <span>총 재직 사원: <strong className="text-[#0f172a] dark:text-white">{filteredEmployees.filter(e => e.employmentStatus === "ACTIVE").length}명</strong></span>
          <span>총 부여 연차: <strong className="text-[#1d4ed8] dark:text-blue-400">{filteredEmployees.reduce((s, e) => s + Number(e.grantDays || 0), 0).toFixed(1)}일</strong></span>
          <span>총 사용 연차: <strong className="text-[#b45309] dark:text-amber-400">{filteredEmployees.reduce((s, e) => s + Number(e.usedDays || 0), 0).toFixed(1)}일</strong></span>
          <span>총 잔여 연차: <strong className="text-[#047857] dark:text-emerald-400">{filteredEmployees.reduce((s, e) => s + Number(e.remainDays || 0), 0).toFixed(1)}일</strong></span>
        </div>
        <div className="text-[11px] text-[#475569] dark:text-slate-500 font-mono">
          ※ 연차 가산 규정: 3, 5, 7, 9년차 +1일 가산 자동 계산 적용됨
        </div>
      </div>

      {/* Modal: Add Employee */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] w-full max-w-lg rounded-lg shadow-2xl p-5 text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] dark:border-slate-800">
              <h3 className="font-bold text-sm text-[#0f172a] dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
                <span>신규 사원 등록</span>
              </h3>
              <button onClick={() => setShowAddEmpModal(false)} className="text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">사번 (필수)</label>
                <input
                  type="text"
                  value={empNo}
                  onChange={(e) => setEmpNo(e.target.value)}
                  placeholder="예: EMP002"
                  className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">로그인 아이디 (필수)</label>
                <input
                  type="text"
                  value={empLoginId}
                  onChange={(e) => setEmpLoginId(e.target.value)}
                  placeholder="예: gildong"
                  className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">성명 (필수)</label>
                <input
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">소속 부서</label>
                <select
                  value={empDept}
                  onChange={(e) => setEmpDept(e.target.value)}
                  className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  <option value="기술개발부">기술개발부</option>
                  <option value="영업관리부">영업관리부</option>
                  <option value="경영총괄">경영총괄</option>
                  <option value="고객지원부">고객지원부</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">직급</label>
                <input
                  type="text"
                  value={empPosition}
                  onChange={(e) => setEmpPosition(e.target.value)}
                  placeholder="예: 대리 / 과장"
                  className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">시스템 권한</label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  <option value="USER">일반 사원 (USER)</option>
                  <option value="ADMIN">관리자 (ADMIN)</option>
                  <option value="SUPER_ADMIN">슈퍼 관리자 (SUPER_ADMIN)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">입사일자</label>
                <input
                  type="date"
                  value={empJoinDate}
                  onChange={(e) => setEmpJoinDate(e.target.value)}
                  className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">초기 부여 연차 (일)</label>
                <input
                  type="number"
                  step="0.5"
                  value={empGrantDays}
                  onChange={(e) => setEmpGrantDays(e.target.value)}
                  className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">이메일</label>
                <input
                  type="email"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  placeholder="email@dragonrpa.co.kr"
                  className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">연락처</label>
                <input
                  type="text"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">급여은행</label>
                <input
                  type="text"
                  value={empSalaryBankName}
                  onChange={(e) => setEmpSalaryBankName(e.target.value)}
                  placeholder="예: 기업은행"
                  className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">예금주</label>
                <input
                  type="text"
                  value={empSalaryAccountHolder}
                  onChange={(e) => setEmpSalaryAccountHolder(e.target.value)}
                  placeholder="미입력 시 성명 자동 적용"
                  className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">급여계좌번호</label>
                <input
                  type="text"
                  value={empSalaryAccountNo}
                  onChange={(e) => setEmpSalaryAccountNo(e.target.value)}
                  placeholder="계좌번호 입력"
                  className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                />
              </div>

              <div className="col-span-2 flex justify-end gap-2 mt-3 pt-3 border-t border-[#b5a894] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-bold transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] font-bold text-white rounded text-xs shadow-xs transition"
                >
                  사원 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Annual Leave */}
      {showResetLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] w-full max-w-md rounded-lg shadow-2xl p-5 text-[#0f172a] dark:bg-slate-900 dark:border-amber-700/60 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] dark:border-slate-800">
              <h3 className="font-bold text-sm text-[#b45309] dark:text-amber-300 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#b45309] dark:text-amber-400" />
                <span>연 단위 연차 일괄 초기화</span>
              </h3>
              <button onClick={() => setShowResetLeaveModal(false)} className="text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs">
              <div className="p-3 bg-[#fef3c7] border border-[#fde68a] rounded text-[#92400e] dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-200">
                <p className="font-bold mb-1">⚖️ 확정 가산 연차 규정</p>
                <p className="text-[11px] leading-relaxed text-[#92400e]/90 dark:text-amber-300/90">
                  - 기본 15일 부여<br/>
                  - 재직 3, 5, 7, 9... 홀수 년차마다 +1일씩 가산<br/>
                  - 예: 1~2년차 15일, 3년차 16일, 5년차 17일, <strong>13년차 21일 (15+6개)</strong><br/>
                  - 대상: 현재 [재직(ACTIVE)] 상태인 전 사원
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[#b5a894] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetLeaveModal(false)}
                  className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-bold transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleResetAnnualLeave}
                  className="px-4 py-1.5 bg-[#b45309] hover:bg-[#92400e] font-bold text-white rounded text-xs shadow-xs transition"
                >
                  지금 일괄 초기화 실행
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Apply Leave */}
      {showLeaveApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] w-full max-w-md rounded-lg shadow-2xl p-5 text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] dark:border-slate-800">
              <h3 className="font-bold text-sm text-[#0f172a] dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
                <span>연차 신청서 작성</span>
              </h3>
              <button onClick={() => setShowLeaveApplyModal(false)} className="text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">신청 사원</label>
                <select
                  value={leaveEmpId || currentUser?.id}
                  onChange={(e) => setLeaveEmpId(e.target.value)}
                  className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.department} {e.position} / 잔여 {Number(e.remainDays).toFixed(1)}일)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">휴가 구분</label>
                <select
                  value={leaveType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLeaveType(val);
                    if (val === "HALF_AM" || val === "HALF_PM") setDeductedDays("0.5");
                    else if (val === "ANNUAL") setDeductedDays("1.0");
                  }}
                  className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  <option value="ANNUAL">전일 연차 (1일)</option>
                  <option value="HALF_AM">오전 반차 (0.5일)</option>
                  <option value="HALF_PM">오후 반차 (0.5일)</option>
                  <option value="SPECIAL">경조사 및 특별휴가</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">시작일</label>
                  <input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">종료일</label>
                  <input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">차감 일수</label>
                <input
                  type="number"
                  step="0.5"
                  value={deductedDays}
                  onChange={(e) => setDeductedDays(e.target.value)}
                  className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">신청 사유</label>
                <textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="휴가 사유를 건조하고 명확하게 입력하십시오."
                  rows={3}
                  className="p-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-[#b5a894] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLeaveApplyModal(false)}
                  className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-bold transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] font-bold text-white rounded text-xs shadow-xs transition"
                >
                  신청 제출
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
