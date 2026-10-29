"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Plus,
  Download,
  RefreshCw,
  Search,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Moon,
  Calendar,
} from "lucide-react";
import {
  formatErpNumber,
  formatErpCurrency,
  sortErpItems,
  SortDirection,
  calculateOvertimeBreakdown,
  isKoreanNonWorkingDay,
} from "@/lib/erpFormat";

interface Overtime {
  id: number;
  employeeId: number;
  employeeNo: string;
  employeeName: string;
  department: string;
  position: string;
  duty?: string;
  otDate: string;
  startTime: string;
  endTime: string;
  otHours: number;
  otType: string;
  otTypeLabel: string;
  isHoliday: boolean;
  regularOtHours: number;
  holidayHours: number;
  holidayOver8Hours: number;
  nightHours: number;
  hourlyWage: number;
  appliedMultiplier: number;
  otPay: number;
  formulaText?: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approverId: number | null;
  approverName: string | null;
  approvedAt: string | null;
  memo: string | null;
  createdAt: string;
}

interface Employee {
  id: number;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  baseSalary?: number;
  hourlyWage?: number;
}

const OT_REASONS = [
  "야간 출고 및 배차 지원",
  "긴급 RPA 시스템 장애 조치",
  "고객사 현장 긴급 기술지원",
  "월말 결산 및 세금계산서 마감",
  "비근무일 장비 점검 및 입고 검수",
  "신규 프로젝트 릴리즈 배포",
];

const getDayOfWeekKr = (dateStr: string) => {
  if (!dateStr) return "";
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const clean = String(dateStr).slice(0, 10);
  const [y, m, d] = clean.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  return days[dt.getDay()] || "";
};

export const OtManagementTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const isAdmin =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.loginId === "admin";
  const currentUserId = currentUser?.id;

  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // New OT Modal
  const [otModalOpen, setOtModalOpen] = useState(false);
  const todayStr = new Date().toISOString().substring(0, 10);
  const [otForm, setOtForm] = useState({
    employeeId: currentUserId || 1,
    otDate: todayStr,
    isHoliday: isKoreanNonWorkingDay(todayStr),
    startTime: "18:00",
    endTime: "21:00",
    otHours: 3.0,
    customOtPay: null as number | null,
    reason: OT_REASONS[0],
    autoApprove: true,
  });

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [otRes, empRes] = await Promise.all([
        fetch(`/api/erp/overtimes?month=${selectedMonth}`),
        fetch("/api/erp/employees"),
      ]);
      const otData = await otRes.json();
      const empData = await empRes.json();

      if (otData.success) setOvertimes(otData.overtimes || []);
      if (empData.success) setEmployees(empData.employees || []);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  // Unique departments from employees + overtimes
  const departmentList = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => {
      if (e.department) s.add(e.department);
    });
    overtimes.forEach((o) => {
      if (o.department) s.add(o.department);
    });
    return Array.from(s);
  }, [employees, overtimes]);

  // Selected employee in modal & real-time overtime breakdown calculation
  const selectedModalEmp = useMemo(() => {
    return employees.find((e) => Number(e.id) === Number(otForm.employeeId)) || employees[0] || null;
  }, [employees, otForm.employeeId]);

  const modalEmpHourlyWage = useMemo(() => {
    if (!selectedModalEmp) return 16746;
    if (selectedModalEmp.hourlyWage && Number(selectedModalEmp.hourlyWage) > 0) {
      return Math.round(Number(selectedModalEmp.hourlyWage));
    }
    return Math.round((Number(selectedModalEmp.baseSalary) || 3500000) / 209);
  }, [selectedModalEmp]);

  const liveBreakdown = useMemo(() => {
    return calculateOvertimeBreakdown({
      otDate: otForm.otDate,
      startTime: otForm.startTime,
      endTime: otForm.endTime,
      hourlyWage: modalEmpHourlyWage,
      overrideIsHoliday: otForm.isHoliday,
    });
  }, [otForm.otDate, otForm.startTime, otForm.endTime, modalEmpHourlyWage, otForm.isHoliday]);

  // Filtered
  const filteredOvertimes = useMemo(() => {
    return overtimes.filter((ot) => {
      if (statusFilter !== "ALL" && ot.status !== statusFilter) return false;
      if (deptFilter !== "ALL" && ot.department !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          ot.employeeName.toLowerCase().includes(q) ||
          ot.employeeNo.toLowerCase().includes(q) ||
          ot.reason.toLowerCase().includes(q) ||
          (ot.otTypeLabel || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [overtimes, statusFilter, deptFilter, searchQuery]);

  // Sorting State
  const [sortKey, setSortKey] = useState<string>("otDate");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => {
    const isActive = sortKey === key;
    return (
      <th
        onClick={() => handleSort(key)}
        className={`py-2.5 px-3 cursor-pointer select-none transition text-${align} whitespace-nowrap hover:bg-[#d0c6b4] dark:hover:bg-slate-700`}
        title={`${label} 기준 정렬`}
      >
        <div
          className={`inline-flex items-center gap-1.5 ${
            align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start"
          }`}
        >
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              sortDir === "asc" ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold" />
              )
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const sortedFilteredOvertimes = useMemo(() => {
    return sortErpItems(filteredOvertimes, sortKey, sortDir);
  }, [filteredOvertimes, sortKey, sortDir]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCount = overtimes.length;
    let approvedHours = 0;
    let approvedOtPay = 0;
    let totalOtPay = 0;
    let pendingCount = 0;

    overtimes.forEach((o) => {
      const pay = Number(o.otPay || 0);
      if (o.status !== "REJECTED") {
        totalOtPay += pay;
      }
      if (o.status === "APPROVED") {
        approvedHours += Number(o.otHours || 0);
        approvedOtPay += pay;
      } else if (o.status === "PENDING") {
        pendingCount++;
      }
    });

    return { totalCount, approvedHours, approvedOtPay, totalOtPay, pendingCount };
  }, [overtimes]);

  // Submit OT Form
  const handleSubmitOt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otForm.reason.trim()) {
      showToast("근무 사유를 입력해주세요.", "error");
      return;
    }
    try {
      const finalPay = otForm.customOtPay !== null ? otForm.customOtPay : liveBreakdown.otPay;
      const res = await fetch("/api/erp/overtimes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: otForm.employeeId,
          otDate: otForm.otDate,
          isHoliday: otForm.isHoliday,
          startTime: otForm.startTime,
          endTime: otForm.endTime,
          otHours: liveBreakdown.otHours,
          hourlyWage: modalEmpHourlyWage,
          otPay: finalPay,
          reason: otForm.reason,
          autoApprove: isAdmin ? otForm.autoApprove : false,
          approverId: currentUserId || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "신청 실패");

      showToast(
        isAdmin && otForm.autoApprove
          ? `초과근무 등록 및 승인 완료 (수당 ${formatErpCurrency(finalPay)})`
          : `초과근무 신청이 등록되었습니다 (산정 수당 ${formatErpCurrency(finalPay)})`
      );
      setOtModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 1-Click Approve / Reject
  const handleAction = async (id: number, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch("/api/erp/overtimes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          approverId: currentUserId || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "처리 실패");

      showToast(data.message || "처리되었습니다.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/erp/overtimes?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");

      showToast("초과근무 내역이 삭제되었습니다.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "근무일자",
      "요일",
      "사번",
      "성명",
      "부서",
      "근무구분",
      "시작시간",
      "종료시간",
      "인정시간",
      "심야시간",
      "1시간표준임금(원)",
      "초과근무수당(원)",
      "근무사유",
      "상태",
      "승인자",
    ];
    const rows = filteredOvertimes.map((o) => [
      o.otDate ? o.otDate.substring(0, 10) : "-",
      getDayOfWeekKr(o.otDate),
      o.employeeNo,
      o.employeeName,
      o.department,
      o.otTypeLabel || (o.isHoliday ? "비근무일 출근" : "평일 초과근무"),
      o.startTime,
      o.endTime,
      `${o.otHours}시간`,
      `${o.nightHours || 0}시간`,
      o.hourlyWage || 0,
      o.otPay || 0,
      `"${(o.reason || "").replace(/"/g, '""')}"`,
      o.status,
      o.approverName || "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `초과근무대장_${selectedMonth}.csv`);
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

      {/* Top Header & Scope (Gutenberg Z-Pattern) */}
      <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
              초과근무 관리 대장
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 상태</option>
              <option value="PENDING">결재 대기</option>
              <option value="APPROVED">승인 완료</option>
              <option value="REJECTED">반려</option>
            </select>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 부서</option>
              {departmentList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#475569] dark:text-slate-400" />
              <input
                type="text"
                placeholder="사원명 / 사유 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] pl-8 pr-3 py-1.5 rounded w-44 focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] text-xs font-bold rounded flex items-center gap-1.5 border border-[#b5a894] shadow transition dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>

          <button
            onClick={() => {
              const initDate = new Date().toISOString().substring(0, 10);
              const defaultEmpId = currentUserId || employees[0]?.id || 1;
              setOtForm({
                employeeId: defaultEmpId,
                otDate: initDate,
                isHoliday: isKoreanNonWorkingDay(initDate),
                startTime: "18:00",
                endTime: "21:00",
                otHours: 3.0,
                customOtPay: null,
                reason: OT_REASONS[0],
                autoApprove: true,
              });
              setOtModalOpen(true);
            }}
            className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>초과근무 신청</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-4 pt-3 pb-1 grid grid-cols-4 gap-3 shrink-0">
        <div className="bg-[#f4efe4] border border-[#b5a894] p-2.5 rounded flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
          <span className="text-xs text-[#475569] dark:text-slate-400">당월 총 신청 건수</span>
          <span className="text-base font-bold font-mono text-[#0f172a] dark:text-slate-100">
            {formatErpNumber(kpis.totalCount)}건
          </span>
        </div>
        <div className="bg-[#f4efe4] border border-[#b5a894] p-2.5 rounded flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
          <span className="text-xs text-[#475569] dark:text-slate-400">당월 승인 초과근무 합계</span>
          <span className="text-base font-bold font-mono text-[#047857] dark:text-emerald-400">
            {kpis.approvedHours}시간
          </span>
        </div>
        <div className="bg-[#f4efe4] border border-[#b5a894] p-2.5 rounded flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
          <span className="text-xs text-[#475569] dark:text-slate-400">당월 승인 초과근무수당 합계</span>
          <span className="text-base font-bold font-mono text-[#1d4ed8] dark:text-blue-400">
            {formatErpCurrency(kpis.approvedOtPay)}
          </span>
        </div>
        <div className="bg-[#f4efe4] border border-[#b5a894] p-2.5 rounded flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
          <span className="text-xs text-[#475569] dark:text-slate-400">결재 대기</span>
          <span className="text-base font-bold font-mono text-[#b45309] dark:text-amber-400">
            {formatErpNumber(kpis.pendingCount)}건
          </span>
        </div>
      </div>

      {/* Main Table (High Density) */}
      <div className="flex-1 overflow-auto p-4 pt-2">
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#dcd4c4] text-[#0f172a] uppercase tracking-wider font-semibold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              <tr>
                {renderSortTh("근무일자 (요일)", "otDate")}
                {renderSortTh("사번", "employeeNo")}
                {renderSortTh("성명", "employeeName")}
                {renderSortTh("부서", "department")}
                {renderSortTh("근무구분 (조건)", "otType")}
                {renderSortTh("근무 시간", "startTime")}
                {renderSortTh("인정시간 (심야)", "otHours", "center")}
                {renderSortTh("1시간 표준임금", "hourlyWage", "right")}
                {renderSortTh("산정 수당액", "otPay", "right")}
                {renderSortTh("근무 사유", "reason")}
                {renderSortTh("결재상태", "status", "center")}
                {renderSortTh("승인자", "approverName")}
                <th className="py-2.5 px-3 whitespace-nowrap text-center">조치 / 관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
              {sortedFilteredOvertimes.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-[#475569] dark:text-slate-500">
                    해당 월에 신청된 초과근무 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedFilteredOvertimes.map((ot) => (
                  <tr key={ot.id} className="hover:bg-[#ede6d6] dark:hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-mono text-[#0f172a] dark:text-slate-300 whitespace-nowrap">
                      {ot.otDate ? ot.otDate.substring(0, 10) : "-"}{" "}
                      <span
                        className={`font-sans font-bold ${
                          ot.isHoliday ? "text-[#dc2626] dark:text-red-400" : "text-[#475569] dark:text-slate-500"
                        }`}
                      >
                        ({getDayOfWeekKr(ot.otDate)})
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                      {ot.employeeNo}
                    </td>
                    <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                      {ot.employeeName}
                    </td>
                    <td className="py-2 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                      {ot.department}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                          ot.isHoliday
                            ? "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]"
                            : ot.nightHours > 0
                            ? "bg-[#eef2ff] text-[#4338ca] border-[#c7d2fe]"
                            : "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]"
                        }`}
                      >
                        {ot.isHoliday ? <Calendar className="w-3 h-3" /> : ot.nightHours > 0 ? <Moon className="w-3 h-3" /> : null}
                        {ot.otTypeLabel || (ot.isHoliday ? "비근무일 출근" : "평일 초과근무")}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[#0f172a] dark:text-slate-300 whitespace-nowrap">
                      {ot.startTime} ~ {ot.endTime}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-[#b45309] dark:text-amber-400 whitespace-nowrap">
                      <span>{ot.otHours}h</span>
                      {Number(ot.nightHours) > 0 && (
                        <span className="ml-1 text-[10.5px] text-[#4338ca] dark:text-indigo-400">
                          (심야 {ot.nightHours}h)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[#334155] dark:text-slate-300 whitespace-nowrap">
                      {formatErpCurrency(ot.hourlyWage)}
                    </td>
                    <td
                      className="py-2 px-3 text-right font-mono font-bold text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap"
                      title={ot.formulaText || ""}
                    >
                      {formatErpCurrency(ot.otPay)}
                    </td>
                    <td className="py-2 px-3 text-[#334155] dark:text-slate-300 max-w-xs truncate" title={ot.reason}>
                      {ot.reason}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ot.status === "PENDING"
                            ? "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                            : ot.status === "APPROVED"
                            ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
                            : "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]"
                        }`}
                      >
                        {ot.status === "PENDING" ? "대기" : ot.status === "APPROVED" ? "승인" : "반려"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[#475569] dark:text-slate-400 whitespace-nowrap">
                      {ot.approverName || "-"}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {isAdmin && ot.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleAction(ot.id, "APPROVE")}
                              className="px-2 py-0.5 bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#065f46] rounded border border-[#a7f3d0] text-[11px] transition font-bold"
                            >
                              승인
                            </button>
                            <button
                              onClick={() => handleAction(ot.id, "REJECT")}
                              className="px-2 py-0.5 bg-[#fef2f2] hover:bg-[#fee2e2] text-[#991b1b] rounded border border-[#fecaca] text-[11px] transition font-bold"
                            >
                              반려
                            </button>
                          </>
                        )}
                        {(isAdmin || ot.employeeId === currentUserId) && (
                          <button
                            onClick={() => handleDelete(ot.id)}
                            className="p-1 hover:bg-[#fee2e2] text-[#b91c1c] rounded transition"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New OT Modal */}
      {otModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitOt}
            className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-lg shadow-2xl dark:bg-slate-900 dark:border-slate-800"
          >
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 mb-4 pb-2 border-b border-[#b5a894] dark:border-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#1d4ed8]" />
              <span>초과근무 신청 및 수당 자동 계산</span>
            </h2>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">대상 임직원</label>
                <select
                  value={otForm.employeeId}
                  onChange={(e) =>
                    setOtForm({
                      ...otForm,
                      employeeId: parseInt(e.target.value),
                      customOtPay: null,
                    })
                  }
                  disabled={!isAdmin}
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-bold dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                >
                  {employees.map((emp) => {
                    const hw =
                      emp.hourlyWage && Number(emp.hourlyWage) > 0
                        ? Math.round(Number(emp.hourlyWage))
                        : Math.round((Number(emp.baseSalary) || 3500000) / 209);
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department || "미배정"} · {emp.position}) — 1시간 표준임금:{" "}
                        {hw.toLocaleString()}원
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">근무 일자</label>
                  <input
                    type="date"
                    value={otForm.otDate}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      setOtForm({
                        ...otForm,
                        otDate: nextDate,
                        isHoliday: isKoreanNonWorkingDay(nextDate),
                        customOtPay: null,
                      });
                    }}
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">근무일 구분 (자동/수동)</label>
                  <select
                    value={otForm.isHoliday ? "HOLIDAY" : "WEEKDAY"}
                    onChange={(e) =>
                      setOtForm({
                        ...otForm,
                        isHoliday: e.target.value === "HOLIDAY",
                        customOtPay: null,
                      })
                    }
                    className={`border text-xs px-3 py-2 rounded font-bold focus:outline-none ${
                      otForm.isHoliday
                        ? "bg-[#fef2f2] border-[#dc2626] text-[#b91c1c]"
                        : "bg-[#f4efe4] border-[#b5a894] text-[#0f172a]"
                    }`}
                  >
                    <option value="WEEKDAY">보통 근무일 (평일 초과 1.5배)</option>
                    <option value="HOLIDAY">비근무일 출근 (8h이내 1.5배 / 초과 2.0배)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">
                    시작 시각 (22:00~06:00 심야 자동인식)
                  </label>
                  <input
                    type="time"
                    value={otForm.startTime}
                    onChange={(e) =>
                      setOtForm({
                        ...otForm,
                        startTime: e.target.value,
                        customOtPay: null,
                      })
                    }
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">
                    종료 시각 (자정 경과 자동계산)
                  </label>
                  <input
                    type="time"
                    value={otForm.endTime}
                    onChange={(e) =>
                      setOtForm({
                        ...otForm,
                        endTime: e.target.value,
                        customOtPay: null,
                      })
                    }
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* 실시간 초과근무 수당 자동 계산 명세 박스 */}
              <div className="p-3 rounded border border-[#b5a894] bg-[#f4efe4] dark:bg-slate-950 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between border-b border-[#d0c6b4] pb-1.5">
                  <span className="text-xs font-bold text-[#1d4ed8] dark:text-blue-400">
                    초과근무수당 자동 산정 내역 ({liveBreakdown.otTypeLabel})
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#0f172a] dark:text-slate-200">
                    1시간 표준임금: {formatErpCurrency(modalEmpHourlyWage)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-[#ebe5d8] dark:bg-slate-900 p-1.5 rounded border border-[#d0c6b4] dark:border-slate-800">
                    <div className="text-[#475569]">총 초과근무 시간</div>
                    <div className="font-mono font-bold text-xs text-[#0f172a] dark:text-slate-100">
                      {liveBreakdown.otHours}시간
                    </div>
                  </div>
                  <div className="bg-[#ebe5d8] dark:bg-slate-900 p-1.5 rounded border border-[#d0c6b4] dark:border-slate-800">
                    <div className="text-[#475569]">심야 구간 (22~06시)</div>
                    <div className="font-mono font-bold text-xs text-[#4338ca] dark:text-indigo-400">
                      {liveBreakdown.nightHours}시간 (+0.5배)
                    </div>
                  </div>
                  <div className="bg-[#ebe5d8] dark:bg-slate-900 p-1.5 rounded border border-[#d0c6b4] dark:border-slate-800">
                    <div className="text-[#475569]">적용 평균 배율</div>
                    <div className="font-mono font-bold text-xs text-[#047857] dark:text-emerald-400">
                      {liveBreakdown.appliedMultiplier}배
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-[#334155] dark:text-slate-400 font-mono bg-[#ebe5d8] dark:bg-slate-900 px-2 py-1.5 rounded border border-dashed border-[#b5a894]">
                  산식: {liveBreakdown.formulaText}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
                      최종 초과근무수당 (원)
                    </label>
                    {otForm.customOtPay !== null && (
                      <button
                        type="button"
                        onClick={() => setOtForm({ ...otForm, customOtPay: null })}
                        className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#dcd4c4] text-[#0f172a] border border-[#b5a894] font-semibold"
                      >
                        자동계산 복원
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="100"
                    value={otForm.customOtPay !== null ? otForm.customOtPay : liveBreakdown.otPay}
                    onChange={(e) =>
                      setOtForm({
                        ...otForm,
                        customOtPay: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-40 text-right bg-white dark:bg-slate-900 border border-[#1d4ed8] text-sm font-bold font-mono text-[#1d4ed8] px-2.5 py-1 rounded"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">근무 사유 프리셋</label>
                <select
                  value={OT_REASONS.includes(otForm.reason) ? otForm.reason : OT_REASONS[0]}
                  onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })}
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                >
                  {OT_REASONS.map((r, idx) => (
                    <option key={idx} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">상세 근무 사유 입력</label>
                <input
                  type="text"
                  value={otForm.reason}
                  onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })}
                  placeholder="구체적인 업무 내용 입력"
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>

              {isAdmin && (
                <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={otForm.autoApprove}
                    onChange={(e) => setOtForm({ ...otForm, autoApprove: e.target.checked })}
                    className="w-4 h-4 accent-[#1d4ed8]"
                  />
                  <span className="text-xs font-bold text-[#047857]">
                    등록 즉시 승인 완료 처리 (급여 정산 및 용역 청구에 즉시 반영)
                  </span>
                </label>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOtModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#0f172a] bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded shadow"
              >
                {isAdmin && otForm.autoApprove ? "초과근무 등록 및 승인" : "초과근무 신청 제출"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
