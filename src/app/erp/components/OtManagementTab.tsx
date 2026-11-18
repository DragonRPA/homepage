"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Clock,
  Plus,
  Download,
  RefreshCw,
  Search,
  Trash2,
  Moon,
  Calendar,
} from "lucide-react";
import { formatErpNumber, formatErpCurrency, sortErpItems } from "@/lib/erpFormat";
import { calculateOvertimeBreakdown, isKoreanNonWorkingDay } from "@/lib/erpHrLaborDomain";
import { SortableTh, useErpTableSort } from "./SortableTh";
import type { OtEmployee, OtFormState } from "./overtime/OtRequestModal";

const OtRequestModal = dynamic(
  () => import("./overtime/OtRequestModal").then((m) => m.OtRequestModal),
  { ssr: false }
);

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

interface DepartmentItem {
  id: string;
  deptName: string;
  managerName: string | null;
}

const DEFAULT_OT_REASON = "야간출고 및 배차지원";

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
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  const [employees, setEmployees] = useState<OtEmployee[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(false);

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

  const currentUserId = Number(currentEmpRecord?.id || currentUser?.id || 1);
  const currentUserDept = String(
    currentEmpRecord?.department || currentUser?.department || ""
  ).trim();

  // 최고관리자 / 대표이사 여부
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

  // 부서장(팀장) 여부 판정
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

  // 부서장(팀장) 또는 최고관리자는 소속 부서 구성원의 초과근무 입력 및 승인 가능
  const isAdmin = isSuperAdmin || isDeptHead;

  // 초과근무 입력 가능 대상 임직원 목록 (퇴사자/대표이사/외주 제외 + 부서장은 소속 부서 구성원 전원, 일반 구성원은 본인)
  const selectableEmployees = useMemo(() => {
    const activeList = employees.filter((emp) => {
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

      if (isSuperAdmin) return true;
      if (isDeptHead) {
        return !currentUserDept || dept === currentUserDept;
      }
      return Number(emp.id) === currentUserId;
    });
    return activeList.length > 0 ? activeList : employees;
  }, [employees, isSuperAdmin, isDeptHead, currentUserDept, currentUserId]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // New OT Modal
  const [otModalOpen, setOtModalOpen] = useState(false);
  const todayStr = new Date().toISOString().substring(0, 10);
  const [otForm, setOtForm] = useState<OtFormState>({
    employeeId: currentUserId || 1,
    otDate: todayStr,
    isHoliday: isKoreanNonWorkingDay(todayStr),
    startHour: "18",
    startMin: "00",
    endHour: "21",
    endMin: "00",
    otHours: 3.0,
    customOtPay: null,
    reason: DEFAULT_OT_REASON,
    autoApprove: true,
  });

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

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchData = async (targetMonth = selectedMonth) => {
    setLoading(true);
    try {
      const [otRes, empRes, deptRes] = await Promise.all([
        fetch(`/api/erp/overtimes?month=${targetMonth}`, { cache: "no-store" }),
        fetch("/api/erp/employees", { cache: "no-store" }),
        fetch("/api/erp/departments", { cache: "no-store" }),
      ]);
      const otData = await otRes.json();
      const empData = await empRes.json();
      const deptData = await deptRes.json().catch(() => ({ success: false }));

      if (otData.success) setOvertimes(otData.overtimes || []);
      if (empData.success) setEmployees(empData.employees || []);
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
    fetchData(selectedMonth);
  }, [selectedMonth]);

  // Unique departments from employees + overtimes
  const departmentList = useMemo(() => {
    const s = new Set<string>();
    selectableEmployees.forEach((e) => {
      if (e.department) s.add(e.department);
    });
    return Array.from(s);
  }, [selectableEmployees]);

  // Selected employee in modal & real-time overtime breakdown calculation
  const selectedModalEmp = useMemo(() => {
    return (
      selectableEmployees.find((e) => Number(e.id) === Number(otForm.employeeId)) ||
      employees.find((e) => Number(e.id) === Number(otForm.employeeId)) ||
      selectableEmployees[0] ||
      employees[0] ||
      null
    );
  }, [selectableEmployees, employees, otForm.employeeId]);

  const modalEmpHourlyWage = useMemo(() => {
    if (!selectedModalEmp) return 0;
    return Math.round(Number(selectedModalEmp.hourlyWage ?? 0) || 0);
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

  // 권한 범위 내 초과근무 내역
  const scopedOvertimes = useMemo(() => {
    if (isSuperAdmin) return overtimes;
    if (isDeptHead) {
      const allowedIds = new Set(selectableEmployees.map((e) => Number(e.id)));
      return overtimes.filter(
        (ot) =>
          allowedIds.has(Number(ot.employeeId)) ||
          (currentUserDept && String(ot.department || "").trim() === currentUserDept)
      );
    }
    return overtimes.filter((ot) => Number(ot.employeeId) === currentUserId);
  }, [overtimes, isSuperAdmin, isDeptHead, selectableEmployees, currentUserDept, currentUserId]);

  // Filtered
  const filteredOvertimes = useMemo(() => {
    return scopedOvertimes.filter((ot) => {
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
  }, [scopedOvertimes, statusFilter, deptFilter, searchQuery]);

  // Sorting State (3단계: asc ➔ desc ➔ null 정렬안함)
  const { sortKey, sortDir, handleSort } = useErpTableSort("otDate", "desc");

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => (
    <SortableTh
      label={label}
      colKey={key}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={handleSort}
      align={align}
      className="py-2.5 px-3 hover:bg-[#d0c6b4] dark:hover:bg-slate-700"
      iconClassName="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400"
    />
  );

  const sortedFilteredOvertimes = useMemo(() => {
    return sortErpItems(filteredOvertimes, sortKey, sortDir);
  }, [filteredOvertimes, sortKey, sortDir]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCount = scopedOvertimes.length;
    let approvedHours = 0;
    let approvedOtPay = 0;
    let totalOtPay = 0;
    let pendingCount = 0;

    scopedOvertimes.forEach((o) => {
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
  }, [scopedOvertimes]);

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
      const submitMonth = otForm.otDate ? otForm.otDate.slice(0, 7) : selectedMonth;
      if (submitMonth && submitMonth !== selectedMonth) {
        setSelectedMonth(submitMonth);
        await fetchData(submitMonth);
      } else {
        await fetchData(selectedMonth);
      }
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
      await fetchData(selectedMonth);
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
      await fetchData(selectedMonth);
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
      "통상임금(원)",
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
            onClick={() => fetchData(selectedMonth)}
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
              const defaultEmp =
                selectableEmployees.find((e) => Number(e.id) === currentUserId) ||
                selectableEmployees[0] ||
                employees[0];
              const defaultEmpId = defaultEmp ? Number(defaultEmp.id) : currentUserId || 1;
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
                reason: DEFAULT_OT_REASON,
                autoApprove: isDeptHead && !isSuperAdmin ? true : false,
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
                {renderSortTh("통상임금", "hourlyWage", "right")}
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

      {/* New OT Modal (Lazy) */}
      {otModalOpen && (
        <OtRequestModal
          otForm={otForm}
          setOtForm={setOtForm}
          selectableEmployees={selectableEmployees}
          isAdmin={isAdmin}
          isDeptHead={isDeptHead}
          currentUserId={currentUserId}
          currentUserDept={currentUserDept}
          normalizedStartTime={normalizedStartTime}
          normalizedEndTime={normalizedEndTime}
          modalEmpHourlyWage={modalEmpHourlyWage}
          liveBreakdown={liveBreakdown}
          getDayOfWeekKr={getDayOfWeekKr}
          onSubmit={handleSubmitOt}
          onClose={() => setOtModalOpen(false)}
        />
      )}
    </div>
  );
};
