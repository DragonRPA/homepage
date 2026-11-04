"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  RefreshCw,
  Download,
  RotateCcw,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import {
  sortErpItems,
  SortDirection,
  formatErpNumber,
  formatErpLeaveDays,
  calculateAnnualLeaveEntitlement,
  isNonDeductingLeaveType,
  getLeaveTypeLabel,
} from "@/lib/erpFormat";

interface EmployeeLeave {
  id: number;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  duty?: string;
  role?: string;
  roleCode?: string;
  joinDate: string;
  leaveDate?: string | null;
  status?: string;
  employmentStatus?: string;
  grantDays: number;
  usedDays: number;
  remainDays: number;
  nonDeductedCount?: number;
}

interface LeaveHistoryItem {
  id: number;
  employeeId: number;
  employeeNo: string;
  employeeName: string;
  department: string;
  position: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  deductedDays: number;
  reason: string;
  status: string;
  approverName: string | null;
}

interface DepartmentItem {
  id: string;
  deptName: string;
  managerName: string | null;
}

export const LeaveManageTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const [employees, setEmployees] = useState<EmployeeLeave[]>([]);
  const [leaves, setLeaves] = useState<LeaveHistoryItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [selectedHistoryEmpId, setSelectedHistoryEmpId] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeLeave | null>(null);
  const [newGrantDays, setNewGrantDays] = useState<number>(15);

  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const [empRes, leaveRes, deptRes] = await Promise.all([
        fetch("/api/erp/employees"),
        fetch("/api/erp/leaves"),
        fetch("/api/erp/departments"),
      ]);
      const empData = await empRes.json();
      const leaveData = await leaveRes.json();
      const deptData = await deptRes.json().catch(() => ({ success: false }));
      if (!empRes.ok || !empData.success)
        throw new Error(empData.error || "사원 목록 조회 실패");

      setEmployees(empData.employees || []);
      if (leaveData.success && leaveData.leaves) {
        setLeaves(leaveData.leaves);
      }
      if (deptData.success && Array.isArray(deptData.departments)) {
        setDepartments(deptData.departments);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // 현재 로그인한 임직원 레코드 매핑
  const currentEmpRecord = useMemo(() => {
    if (!currentUser) return null;
    return (
      employees.find((e) => Number(e.id) === Number(currentUser.id)) ||
      employees.find((e) => e.employeeNo && e.employeeNo === currentUser.employeeNo) ||
      employees.find((e) => e.name && e.name === currentUser.name) ||
      null
    );
  }, [employees, currentUser]);

  const currentUserId = Number(currentEmpRecord?.id || currentUser?.id || 0);
  const currentUserDept = String(
    currentEmpRecord?.department || currentUser?.department || ""
  ).trim();

  // 1) 전사 최고관리자 / 대표이사 여부
  const isSuperAdmin = useMemo(() => {
    const roleUpper = String(currentEmpRecord?.role || currentUser?.role || "").toUpperCase();
    const roleCodeUpper = String(
      currentEmpRecord?.roleCode || currentUser?.roleCode || ""
    ).toUpperCase();
    const pos = String(currentEmpRecord?.position || currentUser?.position || "").trim();
    const duty = String(currentEmpRecord?.duty || currentUser?.duty || "").trim();
    return (
      currentUser?.loginId === "admin" ||
      roleUpper === "ADMIN" ||
      roleUpper === "SUPER_ADMIN" ||
      roleCodeUpper === "ADMIN" ||
      pos.includes("대표이사") ||
      pos === "대표" ||
      duty.includes("대표이사") ||
      duty === "대표"
    );
  }, [currentEmpRecord, currentUser]);

  // 2) 부서장(팀장) 여부 판정 (직책이 팀장/부서장/본부장/실장이거나, MANAGER 역할이거나, 부서 테이블의 managerName에 지정된 경우)
  const isDeptHead = useMemo(() => {
    if (isSuperAdmin) return false;
    const roleUpper = String(currentEmpRecord?.role || currentUser?.role || "").toUpperCase();
    const roleCodeUpper = String(
      currentEmpRecord?.roleCode || currentUser?.roleCode || ""
    ).toUpperCase();
    const duty = String(currentEmpRecord?.duty || currentUser?.duty || "").trim();
    const pos = String(currentEmpRecord?.position || currentUser?.position || "").trim();
    const myName = String(currentEmpRecord?.name || currentUser?.name || "").trim();

    const isNamedManagerInDept = departments.some(
      (d) => d.managerName && myName && d.managerName.trim() === myName
    );

    return (
      duty.includes("팀장") ||
      duty.includes("부서장") ||
      duty.includes("본부장") ||
      duty.includes("실장") ||
      duty.includes("센터장") ||
      pos.includes("팀장") ||
      pos.includes("부서장") ||
      roleUpper === "MANAGER" ||
      roleCodeUpper === "MANAGER" ||
      isNamedManagerInDept
    );
  }, [isSuperAdmin, currentEmpRecord, currentUser, departments]);

  // 3) 조회 권한 스코프: ALL (대표이사/최고관리자) | DEPT (부서장/팀장 -> 본인 부서 구성원 전원) | SELF (일반 구성원 -> 본인만)
  const viewScope: "ALL" | "DEPT" | "SELF" = useMemo(() => {
    if (isSuperAdmin) return "ALL";
    if (isDeptHead) return "DEPT";
    return "SELF";
  }, [isSuperAdmin, isDeptHead]);

  const isAdmin = isSuperAdmin;

  const getTenureYears = (joinDateStr?: string) => {
    return calculateAnnualLeaveEntitlement(joinDateStr).tenureYears;
  };

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

  const renderSortTh = (
    label: string,
    colKey: string,
    align: "left" | "right" | "center" = "left"
  ) => (
    <th
      onClick={() => handleSort(colKey)}
      className={`py-2 px-3 whitespace-nowrap cursor-pointer select-none transition ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } hover:bg-[#d0c6b4] dark:hover:bg-slate-700/60`}
    >
      <div
        className={`inline-flex items-center gap-1.5 ${
          align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"
        }`}
      >
        <span>{label}</span>
        {sortKey === colKey ? (
          sortDir === "asc" ? (
            <ArrowUp className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100" />
        )}
      </div>
    </th>
  );

  // 연차관리 대상자 필터링 (대표이사, 외주 조직 직원, 퇴사자 제외 + 권한 스코프 적용)
  const eligibleEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const st = String(emp.status || emp.employmentStatus || "ACTIVE")
        .trim()
        .toUpperCase();
      if (st === "RETIRED" || st === "RESIGNED" || st === "퇴사" || st === "퇴직") return false;
      if (emp.leaveDate && String(emp.leaveDate).trim() !== "") return false;

      const pos = String(emp.position || "").trim();
      const duty = String(emp.duty || "").trim();
      if (
        pos.includes("대표이사") ||
        pos === "대표" ||
        duty.includes("대표이사") ||
        duty === "대표"
      )
        return false;

      const dept = String(emp.department || "").trim();
      if (dept.includes("외주")) return false;

      // 권한별 연차 조회 범위 제한
      if (viewScope === "DEPT") {
        // 부서장(팀장): 해당 부서 구성원의 모든 연차 표시
        if (currentUserDept && dept !== currentUserDept) return false;
      } else if (viewScope === "SELF") {
        // 부서장이 아닌 일반 구성원: 본인만 표시
        if (Number(emp.id) !== currentUserId) return false;
      }

      return true;
    });
  }, [employees, viewScope, currentUserDept, currentUserId]);

  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(eligibleEmployees.map((e) => e.department).filter(Boolean)));
  }, [eligibleEmployees]);

  const filteredEmployees = useMemo(() => {
    return eligibleEmployees.filter((emp) => {
      if (viewScope === "ALL" && deptFilter !== "ALL" && emp.department !== deptFilter) return false;
      if (viewScope !== "SELF" && searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.employeeNo.toLowerCase().includes(q) ||
          (emp.duty || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [eligibleEmployees, viewScope, deptFilter, searchQuery]);

  const sortedEmployees = useMemo(() => {
    return sortErpItems(filteredEmployees, sortKey, sortDir);
  }, [filteredEmployees, sortKey, sortDir]);

  // 권한 범위 내 허용된 연차 사용내역만 필터링
  const scopedLeaves = useMemo(() => {
    const allowedEmpIds = new Set(eligibleEmployees.map((e) => Number(e.id)));
    if (viewScope === "SELF") {
      return leaves.filter((l) => Number(l.employeeId) === currentUserId);
    }
    if (viewScope === "DEPT") {
      return leaves.filter(
        (l) =>
          allowedEmpIds.has(Number(l.employeeId)) ||
          (currentUserDept && String(l.department || "").trim() === currentUserDept)
      );
    }
    return leaves.filter((l) => allowedEmpIds.size === 0 || allowedEmpIds.has(Number(l.employeeId)));
  }, [leaves, eligibleEmployees, viewScope, currentUserId, currentUserDept]);

  // 상세 사용내역 필터링 및 일자 오름차순 정렬
  const filteredLeaveHistory = useMemo(() => {
    const list =
      viewScope === "SELF"
        ? scopedLeaves
        : selectedHistoryEmpId === "ALL"
        ? scopedLeaves
        : scopedLeaves.filter((l) => String(l.employeeId) === selectedHistoryEmpId);
    return [...list].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [scopedLeaves, selectedHistoryEmpId, viewScope]);

  // Annual Reset & Recalculate
  const handleAnnualReset = async () => {
    const currentYr = new Date().getFullYear();
    if (
      !confirm(
        `${currentYr}년도 회계연도(1/1~12/31) 기준으로 전 사원의 연차를 재계산하시겠습니까?\n\n· 입사 0년차(${currentYr}년 입사자): 15일 × 당해 잔여일수 비율 비례 부여\n· 입사 다음 연도(1년차 이상): 15일 + 근속가산(3·5·7년차...) 부여`
      )
    )
      return;
    try {
      setLoading(true);
      const res = await fetch("/api/erp/employees/reset-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetYear: currentYr }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "연차 재계산 실패");

      showToast(data.message || "전 사원 연차 재계산이 완료되었습니다.");
      fetchEmployees();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Save Manual Adjustment
  const handleSaveAdjustment = async () => {
    if (!selectedEmp) return;
    try {
      const res = await fetch("/api/erp/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEmp.id,
          grantDays: newGrantDays,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "수정 실패");

      showToast(`[${selectedEmp.name}] 부여 연차가 ${newGrantDays}일로 조정되었습니다.`);
      setAdjustModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      "사번",
      "성명",
      "부서",
      "직급",
      "입사일",
      "근속연수",
      "부여연차",
      "사용연차",
      "잔여연차",
      "공가(미차감)건수",
    ];
    const rows = filteredEmployees.map((e) => {
      const ent = calculateAnnualLeaveEntitlement(e.joinDate);
      const rawGrant = Number(e.grantDays || 15);
      const effGrant =
        ent.tenureYears === 0 && (rawGrant === 15 || rawGrant === 11)
          ? ent.grantDays
          : rawGrant;
      const used = Number(e.usedDays || 0);
      const remain = effGrant - used;
      return [
        e.employeeNo,
        e.name,
        e.department,
        e.position,
        e.joinDate ? e.joinDate.substring(0, 10) : "-",
        `${ent.tenureYears}년차${ent.tenureYears === 0 ? "(비례)" : ""}`,
        effGrant,
        used,
        remain,
        e.nonDeductedCount || 0,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `연차관리대장_${new Date().toISOString().substring(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Detailed Leave History to CSV
  const handleExportHistoryCsv = () => {
    const headers = [
      "순번",
      "사용일자",
      "사번",
      "성명",
      "부서",
      "직급",
      "휴가구분",
      "연차차감일수",
      "사유",
      "결재상태",
    ];
    const rows = filteredLeaveHistory.map((item, idx) => {
      const nonDed =
        Number(item.deductedDays) === 0 || isNonDeductingLeaveType(item.leaveType);
      const dateRange =
        item.endDate && item.endDate !== item.startDate
          ? `${item.startDate} ~ ${item.endDate}`
          : item.startDate;
      const safeReason = `"${String(item.reason || "").replace(/"/g, '""')}"`;
      return [
        idx + 1,
        dateRange,
        item.employeeNo || "",
        item.employeeName || "",
        item.department || "",
        item.position || "",
        getLeaveTypeLabel(item.leaveType),
        nonDed ? "0" : formatErpLeaveDays(item.deductedDays),
        safeReason,
        item.status === "APPROVED" ? "승인완료" : item.status || "승인완료",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const targetEmp =
      selectedHistoryEmpId === "ALL"
        ? "전체"
        : eligibleEmployees.find((e) => String(e.id) === selectedHistoryEmpId)?.name || "선택";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `연차사용상세내역_${targetEmp}_${new Date().toISOString().substring(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-xs font-bold border ${
            toastMessage.type === "success"
              ? "bg-[#ecfdf5] border-[#047857] text-[#065f46]"
              : "bg-[#fef2f2] border-[#dc2626] text-[#b91c1c]"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Top Header */}
      <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
              {viewScope === "ALL"
                ? "전사 연차 관리 대장"
                : viewScope === "DEPT"
                ? `${currentUserDept || "소속 부서"} 구성원 연차 관리 대장`
                : `${currentEmpRecord?.name || currentUser?.name || "본인"} 연차 사용내역`}
            </span>
          </div>

          {/* 권한 스코프 안내 배지 */}
          {viewScope === "DEPT" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd] whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>부서장(팀장) 권한 · {currentUserDept} 구성원 전체 조회</span>
            </span>
          )}
          {viewScope === "SELF" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] whitespace-nowrap">
              <UserCheck className="w-3.5 h-3.5" />
              <span>개인 연차 조회 · 본인 연차 및 사용내역 전용</span>
            </span>
          )}

          {viewScope !== "SELF" && (
            <div className="flex items-center gap-2">
              {viewScope === "ALL" && (
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  <option value="ALL">전체 부서</option>
                  {uniqueDepartments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#475569] dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="부서 구성원 성명 / 사번 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] pl-8 pr-3 py-1.5 rounded w-48 focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] text-xs font-bold rounded flex items-center gap-1.5 border border-[#b5a894] shadow transition dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleAnnualReset}
              className="px-3 py-1.5 bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>연 단위 연차 초기화/재계산</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Summary Table + Detailed Leave Ledger */}
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
        {/* 1. 임직원별 연차 보유/사용 집계표 */}
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-auto shrink-0 dark:bg-slate-900 dark:border-slate-800">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#dcd4c4] text-[#0f172a] font-semibold border-b border-[#b5a894] sticky top-0 z-10 select-none dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              <tr>
                {renderSortTh("사번", "employeeNo")}
                {renderSortTh("성명", "name")}
                {renderSortTh("부서", "department")}
                {renderSortTh("직급 / 직책", "position")}
                {renderSortTh("입사일", "joinDate")}
                {renderSortTh("근속연수", "joinDate", "center")}
                {renderSortTh("부여 연차", "grantDays", "right")}
                {renderSortTh("사용 연차", "usedDays", "right")}
                {renderSortTh("잔여 연차", "remainDays", "right")}
                {renderSortTh("공가/특별(미차감)", "nonDeductedCount", "center")}
                {renderSortTh("소진율", "usedDays", "center")}
                {isAdmin && <th className="py-2 px-3 whitespace-nowrap text-center">조정</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
              {sortedEmployees.map((emp) => {
                const entitlement = calculateAnnualLeaveEntitlement(emp.joinDate);
                const tenure = entitlement.tenureYears;
                const rawGrant = Number(emp.grantDays || 15);
                const grant =
                  tenure === 0 && (rawGrant === 15 || rawGrant === 11)
                    ? entitlement.grantDays
                    : rawGrant;
                const used = Number(emp.usedDays || 0);
                const remain = grant - used;
                const nonDedCount = Number(emp.nonDeductedCount || 0);
                const rate = grant > 0 ? Math.min(100, Math.round((used / grant) * 100)) : 0;

                return (
                  <tr
                    key={emp.id}
                    onClick={() => {
                      if (viewScope === "SELF") return;
                      setSelectedHistoryEmpId((prev) =>
                        prev === String(emp.id) ? "ALL" : String(emp.id)
                      );
                    }}
                    className={`transition ${
                      viewScope !== "SELF" ? "cursor-pointer" : ""
                    } ${
                      selectedHistoryEmpId === String(emp.id)
                        ? "bg-[#dbeafe]/60 dark:bg-blue-950/30"
                        : "hover:bg-[#ede6d6] dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                      {emp.employeeNo}
                    </td>
                    <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                      {emp.name}
                    </td>
                    <td className="py-2 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                      {emp.department}
                    </td>
                    <td className="py-2 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                      {emp.position} {emp.duty ? `(${emp.duty})` : ""}
                    </td>
                    <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                      {emp.joinDate ? emp.joinDate.substring(0, 10) : "-"}
                    </td>
                    <td
                      className="py-2 px-3 text-center whitespace-nowrap"
                      title={entitlement.formulaLabel}
                    >
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          tenure === 0
                            ? "bg-[#eff6ff] border-[#93c5fd] text-[#1d4ed8]"
                            : "bg-[#dcd4c4] border-[#b5a894] text-[#0f172a]"
                        }`}
                      >
                        {tenure}년차{tenure === 0 ? " (비례)" : ""}
                      </span>
                    </td>
                    <td
                      className="py-2 px-3 text-right font-mono font-bold text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap"
                      title={`규정 산출값: ${entitlement.grantDays}일 (${entitlement.formulaLabel})`}
                    >
                      {formatErpLeaveDays(grant)}일
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#b45309] dark:text-amber-400 whitespace-nowrap">
                      {formatErpLeaveDays(used)}일
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                      {formatErpLeaveDays(remain)}일
                    </td>
                    <td className="py-2 px-3 text-center font-mono whitespace-nowrap">
                      {nonDedCount > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
                          {nonDedCount}건 (0일차감)
                        </span>
                      ) : (
                        <span className="text-[#94a3b8]">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-16 bg-[#dcd4c4] dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${
                              rate > 80
                                ? "bg-[#dc2626]"
                                : rate > 50
                                ? "bg-[#b45309]"
                                : "bg-[#1d4ed8]"
                            }`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-[#475569] dark:text-slate-400">
                          {formatErpNumber(rate)}%
                        </span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td
                        className="py-2 px-3 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setSelectedEmp(emp);
                            setNewGrantDays(grant);
                            setAdjustModalOpen(true);
                          }}
                          className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        >
                          부여 조정
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 2. 연차 및 공가 사용 상세 내역 대장 */}
        <div className="flex-1 bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs flex flex-col overflow-hidden min-h-[280px] dark:bg-slate-900 dark:border-slate-800">
          <div className="p-2.5 bg-[#e2dbcd] border-b border-[#b5a894] flex flex-wrap items-center justify-between gap-2 shrink-0 dark:bg-slate-800 dark:border-slate-700">
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
              {viewScope === "SELF"
                ? `본인 연차 및 공가 사용 상세 내역 (${filteredLeaveHistory.length}건)`
                : viewScope === "DEPT"
                ? `${currentUserDept} 구성원 연차 및 공가 사용 상세 내역 (${filteredLeaveHistory.length}건)`
                : `연차 및 공가 사용 상세 내역 (${filteredLeaveHistory.length}건)`}
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportHistoryCsv}
                className="px-2.5 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] text-[11px] font-bold rounded flex items-center gap-1.5 border border-[#b5a894] shadow-xs transition dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>엑셀 내보내기</span>
              </button>

              {viewScope !== "SELF" && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryEmpId("ALL")}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold border transition whitespace-nowrap ${
                      selectedHistoryEmpId === "ALL"
                        ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                        : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894]"
                    }`}
                  >
                    {viewScope === "DEPT" ? `${currentUserDept} 전체` : "전체"} ({scopedLeaves.length})
                  </button>
                  {eligibleEmployees.map((emp) => {
                    const cnt = scopedLeaves.filter((l) => Number(l.employeeId) === Number(emp.id)).length;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => setSelectedHistoryEmpId(String(emp.id))}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition whitespace-nowrap ${
                          selectedHistoryEmpId === String(emp.id)
                            ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                            : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894]"
                        }`}
                      >
                        {emp.name} ({cnt})
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#dcd4c4] text-[#0f172a] font-semibold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3 whitespace-nowrap">순번</th>
                  <th className="py-2 px-3 whitespace-nowrap">사용 일자</th>
                  <th className="py-2 px-3 whitespace-nowrap">성명</th>
                  <th className="py-2 px-3 whitespace-nowrap">부서 / 직급</th>
                  <th className="py-2 px-3 whitespace-nowrap">휴가 구분</th>
                  <th className="py-2 px-3 whitespace-nowrap text-center">연차 차감 일수</th>
                  <th className="py-2 px-3 whitespace-nowrap">사유</th>
                  <th className="py-2 px-3 whitespace-nowrap text-center">결재상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
                {filteredLeaveHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-[#475569] whitespace-nowrap"
                    >
                      등록된 휴가 사용 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredLeaveHistory.map((item, idx) => {
                    const nonDed =
                      Number(item.deductedDays) === 0 ||
                      isNonDeductingLeaveType(item.leaveType);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#ede6d6] dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-1.5 px-3 font-mono text-[#64748b] whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 font-mono font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                          {item.startDate}
                          {item.endDate && item.endDate !== item.startDate
                            ? ` ~ ${item.endDate}`
                            : ""}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                          {item.employeeName}
                        </td>
                        <td className="py-1.5 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          {item.department} {item.position}
                        </td>
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              nonDed
                                ? "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]"
                                : "bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]"
                            }`}
                          >
                            {getLeaveTypeLabel(item.leaveType)}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono font-bold whitespace-nowrap">
                          {nonDed ? (
                            <span className="text-[#047857] dark:text-emerald-400">
                              0일 (미소진)
                            </span>
                          ) : (
                            <span className="text-[#b45309] dark:text-amber-400">
                              {formatErpLeaveDays(item.deductedDays)}일 차감
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          {item.reason}
                        </td>
                        <td className="py-1.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                            승인완료
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-sm shadow-2xl dark:bg-slate-900 dark:border-slate-800">
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 mb-2 pb-2 border-b border-[#b5a894] dark:border-slate-800">
              연차 부여일수 직접 조정 ({selectedEmp.name})
            </h2>
            {(() => {
              const ent = calculateAnnualLeaveEntitlement(selectedEmp.joinDate);
              return (
                <div className="mb-4 space-y-1.5 text-xs">
                  <p className="text-[#475569] dark:text-slate-400">
                    입사일:{" "}
                    {selectedEmp.joinDate ? selectedEmp.joinDate.substring(0, 10) : "-"} (
                    {ent.tenureYears}년차)
                  </p>
                  <div className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] flex items-center justify-between dark:bg-slate-950 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-[#1d4ed8] dark:text-blue-400">
                      규정 산출: {formatErpLeaveDays(ent.grantDays)}일 ({ent.formulaLabel})
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewGrantDays(ent.grantDays)}
                      className="px-2 py-0.5 text-[10.5px] font-bold rounded bg-[#dcd4c4] hover:bg-[#d0c6b4] border border-[#b5a894] text-[#0f172a] shrink-0"
                    >
                      규정값 적용
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col gap-1 mb-4">
              <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">
                부여 연차 일수
              </label>
              <input
                type="number"
                step="0.5"
                value={newGrantDays}
                onChange={(e) => setNewGrantDays(parseFloat(e.target.value) || 0)}
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono text-center text-base dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#0f172a] bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              >
                취소
              </button>
              <button
                onClick={handleSaveAdjustment}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded shadow"
              >
                조정 반영
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
