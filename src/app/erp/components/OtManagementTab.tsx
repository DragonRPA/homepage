"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  formatErpInputNumber,
  toErpInputString,
  cleanErpNumber,
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
  "야간출고 및 배차지원",
  "출장",
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
    startHour: "18",
    startMin: "00",
    endHour: "21",
    endMin: "00",
    otHours: 3.0,
    customOtPay: null as number | null,
    reason: OT_REASONS[0],
    autoApprove: true,
  });

  // 24시간 시/분 키입력 포커스 이동용 Refs
  const startHourRef = useRef<HTMLInputElement>(null);
  const startMinRef = useRef<HTMLInputElement>(null);
  const endHourRef = useRef<HTMLInputElement>(null);
  const endMinRef = useRef<HTMLInputElement>(null);

  const normalizedStartTime = useMemo(() => {
    const h = Math.min(23, Math.max(0, parseInt(otForm.startHour, 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(otForm.startMin, 10) || 0));
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }, [otForm.startHour, otForm.startMin]);

  const normalizedEndTime = useMemo(() => {
    const h = Math.min(23, Math.max(0, parseInt(otForm.endHour, 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(otForm.endMin, 10) || 0));
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }, [otForm.endHour, otForm.endMin]);

  // 4자리 연속 숫자(예: "1830") 또는 시/분 개별 키보드 입력 핸들러
  const handleHourInputChange = (
    rawVal: string,
    hourField: "startHour" | "endHour",
    minField: "startMin" | "endMin",
    nextMinRef: React.RefObject<HTMLInputElement | null>
  ) => {
    const digits = rawVal.replace(/[^0-9]/g, "");
    if (!digits) {
      setOtForm((prev) => ({ ...prev, [hourField]: "", customOtPay: null }));
      return;
    }
    // 3~4자리 연속 타이핑 또는 붙여넣기 시 (예: 1830 -> 18시 30분)
    if (digits.length >= 3) {
      const hRaw = digits.slice(0, 2);
      const mRaw = digits.slice(2, 4);
      const hClamped = String(Math.min(23, parseInt(hRaw, 10) || 0)).padStart(2, "0");
      const mClamped = mRaw.length === 2
        ? String(Math.min(59, parseInt(mRaw, 10) || 0)).padStart(2, "0")
        : mRaw;
      setOtForm((prev) => ({
        ...prev,
        [hourField]: hClamped,
        [minField]: mClamped,
        customOtPay: null,
      }));
      nextMinRef.current?.focus();
      return;
    }
    if (digits.length === 2) {
      const hNum = parseInt(digits, 10);
      const hClamped = String(Math.min(23, isNaN(hNum) ? 0 : hNum)).padStart(2, "0");
      setOtForm((prev) => ({ ...prev, [hourField]: hClamped, customOtPay: null }));
      nextMinRef.current?.focus();
      nextMinRef.current?.select();
      return;
    }
    // 1자리 입력 중: 3~9를 치면 24시간제에서 30시 이상은 불가능하므로 즉시 03~09시로 확정 후 분 칸으로 자동 이동
    const single = parseInt(digits, 10);
    if (single >= 3 && single <= 9) {
      setOtForm((prev) => ({ ...prev, [hourField]: `0${single}`, customOtPay: null }));
      nextMinRef.current?.focus();
      nextMinRef.current?.select();
    } else {
      setOtForm((prev) => ({ ...prev, [hourField]: digits, customOtPay: null }));
    }
  };

  const handleMinInputChange = (
    rawVal: string,
    minField: "startMin" | "endMin",
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    const digits = rawVal.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      setOtForm((prev) => ({ ...prev, [minField]: "", customOtPay: null }));
      return;
    }
    if (digits.length === 2) {
      const mNum = parseInt(digits, 10);
      const mClamped = String(Math.min(59, isNaN(mNum) ? 0 : mNum)).padStart(2, "0");
      setOtForm((prev) => ({ ...prev, [minField]: mClamped, customOtPay: null }));
      if (nextRef?.current) {
        nextRef.current.focus();
        nextRef.current.select();
      }
      return;
    }
    // 1자리 입력 중: 6~9를 치면 60분 이상은 불가능하므로 즉시 06~09분으로 확정
    const single = parseInt(digits, 10);
    if (single >= 6 && single <= 9) {
      setOtForm((prev) => ({ ...prev, [minField]: `0${single}`, customOtPay: null }));
      if (nextRef?.current) {
        nextRef.current.focus();
        nextRef.current.select();
      }
    } else {
      setOtForm((prev) => ({ ...prev, [minField]: digits, customOtPay: null }));
    }
  };

  const padTimeFieldOnBlur = (field: "startHour" | "startMin" | "endHour" | "endMin", maxVal: number) => {
    setOtForm((prev) => {
      const n = Math.min(maxVal, Math.max(0, parseInt(String(prev[field] || "0"), 10) || 0));
      return {
        ...prev,
        [field]: String(n).padStart(2, "0"),
      };
    });
  };

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
    if (selectedModalEmp.hourlyWage !== undefined && selectedModalEmp.hourlyWage !== null) {
      return Math.round(Number(selectedModalEmp.hourlyWage));
    }
    return Math.round((Number(selectedModalEmp.baseSalary) || 3500000) / 209);
  }, [selectedModalEmp]);

  const liveBreakdown = useMemo(() => {
    return calculateOvertimeBreakdown({
      otDate: otForm.otDate,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
      hourlyWage: modalEmpHourlyWage,
      overrideIsHoliday: otForm.isHoliday,
    });
  }, [otForm.otDate, normalizedStartTime, normalizedEndTime, modalEmpHourlyWage, otForm.isHoliday]);

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
          startTime: normalizedStartTime,
          endTime: normalizedEndTime,
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
                startHour: "18",
                startMin: "00",
                endHour: "21",
                endMin: "00",
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
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department || "미배정"} · {emp.position})
                    </option>
                  ))}
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
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">
                    근무일 구분 (요일/공휴일 자동판정)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`flex-1 border text-xs px-3 py-2 rounded font-bold flex items-center justify-between ${
                        otForm.isHoliday
                          ? "bg-[#fef2f2] border-[#dc2626] text-[#b91c1c]"
                          : "bg-[#f0fdf4] border-[#16a34a] text-[#15803d]"
                      }`}
                    >
                      <span>
                        {otForm.isHoliday
                          ? `휴일 출근 (${getDayOfWeekKr(otForm.otDate)}요일/공휴일 · 1.5~2.0배)`
                          : `평일 근무일 (${getDayOfWeekKr(otForm.otDate)}요일 · 1.5배)`}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setOtForm({
                            ...otForm,
                            isHoliday: !otForm.isHoliday,
                            customOtPay: null,
                          })
                        }
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/80 hover:bg-white border border-current font-semibold shrink-0"
                        title="예외 휴일/근무일 수동 전환"
                      >
                        전환
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 24시간제 시/분 키보드 직접 입력 영역 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">
                    시작 시각 (24시간제 시 : 분 키입력)
                  </label>
                  <div className="flex items-center gap-1 bg-[#f4efe4] border border-[#b5a894] px-2.5 py-1.5 rounded focus-within:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800">
                    <input
                      ref={startHourRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={otForm.startHour}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => padTimeFieldOnBlur("startHour", 23)}
                      onChange={(e) => handleHourInputChange(e.target.value, "startHour", "startMin", startMinRef)}
                      onKeyDown={(e) => {
                        if (e.key === ":" || e.key === "ArrowRight" || e.key === "Enter") {
                          e.preventDefault();
                          padTimeFieldOnBlur("startHour", 23);
                          startMinRef.current?.focus();
                          startMinRef.current?.select();
                        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                          const cur = parseInt(otForm.startHour || "0", 10) || 0;
                          const next = e.key === "ArrowUp" ? (cur + 1) % 24 : (cur + 23) % 24;
                          setOtForm((prev) => ({ ...prev, startHour: String(next).padStart(2, "0"), customOtPay: null }));
                        }
                      }}
                      placeholder="18"
                      className="w-11 text-center bg-white dark:bg-slate-900 border border-[#cbd5e1] dark:border-slate-700 rounded py-1 text-sm font-mono font-bold text-[#0f172a] dark:text-slate-100 focus:outline-none focus:border-[#1d4ed8]"
                    />
                    <span className="text-xs font-bold text-[#475569]">시</span>
                    <span className="text-sm font-mono font-bold text-[#475569] px-0.5">:</span>
                    <input
                      ref={startMinRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={otForm.startMin}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => padTimeFieldOnBlur("startMin", 59)}
                      onChange={(e) => handleMinInputChange(e.target.value, "startMin", endHourRef)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otForm.startMin) {
                          startHourRef.current?.focus();
                          startHourRef.current?.select();
                        } else if (e.key === "ArrowRight" || e.key === "Enter") {
                          e.preventDefault();
                          padTimeFieldOnBlur("startMin", 59);
                          endHourRef.current?.focus();
                          endHourRef.current?.select();
                        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                          const cur = parseInt(otForm.startMin || "0", 10) || 0;
                          const next = e.key === "ArrowUp" ? (cur + 10) % 60 : (cur + 50) % 60;
                          setOtForm((prev) => ({ ...prev, startMin: String(next).padStart(2, "0"), customOtPay: null }));
                        }
                      }}
                      placeholder="00"
                      className="w-11 text-center bg-white dark:bg-slate-900 border border-[#cbd5e1] dark:border-slate-700 rounded py-1 text-sm font-mono font-bold text-[#0f172a] dark:text-slate-100 focus:outline-none focus:border-[#1d4ed8]"
                    />
                    <span className="text-xs font-bold text-[#475569]">분</span>
                    <div className="ml-auto flex items-center gap-0.5">
                      {["00", "30"].map((mVal) => (
                        <button
                          key={mVal}
                          type="button"
                          onClick={() => setOtForm((prev) => ({ ...prev, startMin: mVal, customOtPay: null }))}
                          className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${
                            otForm.startMin === mVal
                              ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                              : "bg-[#ebe5d8] text-[#334155] border-[#b5a894] hover:bg-[#dcd4c4]"
                          }`}
                        >
                          :{mVal}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">
                    종료 시각 (24시간제 시 : 분 키입력)
                  </label>
                  <div className="flex items-center gap-1 bg-[#f4efe4] border border-[#b5a894] px-2.5 py-1.5 rounded focus-within:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800">
                    <input
                      ref={endHourRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={otForm.endHour}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => padTimeFieldOnBlur("endHour", 23)}
                      onChange={(e) => handleHourInputChange(e.target.value, "endHour", "endMin", endMinRef)}
                      onKeyDown={(e) => {
                        if (e.key === ":" || e.key === "ArrowRight" || e.key === "Enter") {
                          e.preventDefault();
                          padTimeFieldOnBlur("endHour", 23);
                          endMinRef.current?.focus();
                          endMinRef.current?.select();
                        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                          const cur = parseInt(otForm.endHour || "0", 10) || 0;
                          const next = e.key === "ArrowUp" ? (cur + 1) % 24 : (cur + 23) % 24;
                          setOtForm((prev) => ({ ...prev, endHour: String(next).padStart(2, "0"), customOtPay: null }));
                        }
                      }}
                      placeholder="21"
                      className="w-11 text-center bg-white dark:bg-slate-900 border border-[#cbd5e1] dark:border-slate-700 rounded py-1 text-sm font-mono font-bold text-[#0f172a] dark:text-slate-100 focus:outline-none focus:border-[#1d4ed8]"
                    />
                    <span className="text-xs font-bold text-[#475569]">시</span>
                    <span className="text-sm font-mono font-bold text-[#475569] px-0.5">:</span>
                    <input
                      ref={endMinRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={otForm.endMin}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => padTimeFieldOnBlur("endMin", 59)}
                      onChange={(e) => handleMinInputChange(e.target.value, "endMin")}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otForm.endMin) {
                          endHourRef.current?.focus();
                          endHourRef.current?.select();
                        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                          const cur = parseInt(otForm.endMin || "0", 10) || 0;
                          const next = e.key === "ArrowUp" ? (cur + 10) % 60 : (cur + 50) % 60;
                          setOtForm((prev) => ({ ...prev, endMin: String(next).padStart(2, "0"), customOtPay: null }));
                        }
                      }}
                      placeholder="00"
                      className="w-11 text-center bg-white dark:bg-slate-900 border border-[#cbd5e1] dark:border-slate-700 rounded py-1 text-sm font-mono font-bold text-[#0f172a] dark:text-slate-100 focus:outline-none focus:border-[#1d4ed8]"
                    />
                    <span className="text-xs font-bold text-[#475569]">분</span>
                    <div className="ml-auto flex items-center gap-0.5">
                      {["00", "30"].map((mVal) => (
                        <button
                          key={mVal}
                          type="button"
                          onClick={() => setOtForm((prev) => ({ ...prev, endMin: mVal, customOtPay: null }))}
                          className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${
                            otForm.endMin === mVal
                              ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                              : "bg-[#ebe5d8] text-[#334155] border-[#b5a894] hover:bg-[#dcd4c4]"
                          }`}
                        >
                          :{mVal}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 자주 쓰는 시간대 단축 버튼 & 자동 판정 배지 */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 px-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[11px] font-semibold text-[#475569] mr-1">시간 단축선택:</span>
                  {[
                    { label: "07~09시(2h)", sh: "07", sm: "00", eh: "09", em: "00" },
                    { label: "08~09시(1h)", sh: "08", sm: "00", eh: "09", em: "00" },
                    { label: "18~20시(2h)", sh: "18", sm: "00", eh: "20", em: "00" },
                    { label: "18~21시(3h)", sh: "18", sm: "00", eh: "21", em: "00" },
                    { label: "18~22시(4h)", sh: "18", sm: "00", eh: "22", em: "00" },
                    { label: "18~24시(심야포함)", sh: "18", sm: "00", eh: "00", em: "00" },
                    { label: "09~18시(휴일9h)", sh: "09", sm: "00", eh: "18", em: "00" },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        setOtForm((prev) => ({
                          ...prev,
                          startHour: p.sh,
                          startMin: p.sm,
                          endHour: p.eh,
                          endMin: p.em,
                          customOtPay: null,
                        }))
                      }
                      className="px-2 py-0.5 text-[10.5px] font-bold rounded bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 실시간 초과근무 수당 자동 계산 명세 박스 */}
              <div className="p-3 rounded border border-[#b5a894] bg-[#f4efe4] dark:bg-slate-950 dark:border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#d0c6b4] pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#1d4ed8] dark:text-blue-400">
                      자동 판정:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        liveBreakdown.isHoliday
                          ? "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]"
                          : "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]"
                      }`}
                    >
                      {liveBreakdown.isHoliday ? "휴일(비근무일)" : "평일(근무일)"}
                    </span>
                    {liveBreakdown.nightHours > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#eef2ff] text-[#4338ca] border border-[#c7d2fe]">
                        심야근무 포함 ({liveBreakdown.nightHours}h)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ebe5d8] text-[#475569] border border-[#cbd5e1]">
                        주간/저녁 (심야 없음)
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#0f172a] dark:text-slate-200">
                    1시간 표준임금: {formatErpCurrency(modalEmpHourlyWage)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-[#ebe5d8] dark:bg-slate-900 p-1.5 rounded border border-[#d0c6b4] dark:border-slate-800">
                    <div className="text-[#475569]">총 초과근무 시간</div>
                    <div className="font-mono font-bold text-xs text-[#0f172a] dark:text-slate-100">
                      {liveBreakdown.otHours}시간 ({normalizedStartTime}~{normalizedEndTime})
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
                    type="text"
                    value={toErpInputString(otForm.customOtPay !== null ? otForm.customOtPay : liveBreakdown.otPay)}
                    onChange={(e) => {
                      const formatted = formatErpInputNumber(e.target.value);
                      setOtForm({
                        ...otForm,
                        customOtPay: formatted ? cleanErpNumber(formatted) : 0,
                      });
                    }}
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
