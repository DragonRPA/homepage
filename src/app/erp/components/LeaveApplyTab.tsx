"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  RefreshCw,
  Send,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
} from "lucide-react";
import {
  sortErpItems,
  SortDirection,
  formatErpNumber,
  formatErpLeaveDays,
  LeaveTypeCode,
  LEAVE_TYPE_LIST,
  LEAVE_TYPE_MAP,
  isNonDeductingLeaveType,
  getLeaveTypeLabel,
  calculateWeekdayCount,
} from "@/lib/erpFormat";

interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeNo: string;
  employeeName: string;
  department: string;
  position: string;
  leaveType: LeaveTypeCode | string;
  startDate: string;
  endDate: string;
  deductedDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approverId: number | null;
  approverName: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
}

interface Employee {
  id: number;
  employeeNo: string;
  loginId?: string;
  name: string;
  department: string;
  position: string;
  duty?: string;
  status?: string;
  employmentStatus?: string;
  leaveDate?: string | null;
  grantDays: number;
  usedDays: number;
  remainDays: number;
  nonDeductedCount?: number;
}

export const LeaveApplyTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const currentUserId = currentUser?.id;
  const isAdmin =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "MANAGER" ||
    currentUser?.loginId === "admin";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [historyEmpFilter, setHistoryEmpFilter] = useState<string>("ALL");
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string>("startDate");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

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
      className={`py-2.5 px-3 whitespace-nowrap cursor-pointer select-none transition ${
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

  // 연차 대상 재직 임직원 목록 (퇴사자/외주/대표이사 제외)
  const activeEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const st = String(emp.status || emp.employmentStatus || "ACTIVE")
        .trim()
        .toUpperCase();
      if (st === "RETIRED" || st === "RESIGNED" || st === "퇴사" || st === "퇴직") return false;
      if (emp.leaveDate && String(emp.leaveDate).trim() !== "") return false;
      const pos = String(emp.position || "").trim();
      const duty = String(emp.duty || "").trim();
      if (pos.includes("대표이사") || pos === "대표" || duty.includes("대표이사") || duty === "대표")
        return false;
      const dept = String(emp.department || "").trim();
      if (dept.includes("외주")) return false;
      return true;
    });
  }, [employees]);

  const targetEmployee = useMemo(() => {
    if (selectedEmpId) {
      const found = employees.find((e) => Number(e.id) === Number(selectedEmpId));
      if (found) return found;
    }
    const selfFound = employees.find(
      (e) => e.id === currentUserId || e.loginId === currentUser?.loginId
    );
    if (selfFound && !String(selfFound.position || "").includes("대표이사")) {
      return selfFound;
    }
    return activeEmployees[0] || selfFound || null;
  }, [employees, activeEmployees, selectedEmpId, currentUserId, currentUser]);

  const filteredLeaves = useMemo(() => {
    if (!isAdmin) {
      return allLeaves.filter(
        (l) => l.employeeId === currentUserId || l.employeeName === currentUser?.name
      );
    }
    if (historyEmpFilter === "ALL") return allLeaves;
    return allLeaves.filter((l) => String(l.employeeId) === historyEmpFilter);
  }, [allLeaves, isAdmin, currentUserId, currentUser, historyEmpFilter]);

  const sortedLeaves = useMemo(() => {
    return sortErpItems(filteredLeaves, sortKey, sortDir);
  }, [filteredLeaves, sortKey, sortDir]);

  // Form State
  const [leaveType, setLeaveType] = useState<LeaveTypeCode>("ANNUAL");
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [reason, setReason] = useState("");

  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, leaveRes] = await Promise.all([
        fetch("/api/erp/employees"),
        fetch("/api/erp/leaves"),
      ]);
      const empData = await empRes.json();
      const leaveData = await leaveRes.json();

      if (empData.success && empData.employees) {
        setEmployees(empData.employees);
      }

      if (leaveData.success && leaveData.leaves) {
        setAllLeaves(leaveData.leaves);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUserId]);

  const currentTypeMeta = LEAVE_TYPE_MAP[leaveType] || LEAVE_TYPE_LIST[0];
  const isSingleDayOnly = currentTypeMeta.singleDayOnly;
  const isNonDeducting = !currentTypeMeta.deductsAnnualLeave;

  // 실제 휴가 기간 일수 (주말 제외 평일수, 반차는 0.5일)
  const calculatedDurationDays = useMemo(() => {
    if (leaveType === "HALF_AM" || leaveType === "HALF_PM") {
      return 0.5;
    }
    const effectiveEnd = isSingleDayOnly ? startDate : endDate;
    return calculateWeekdayCount(startDate, effectiveEnd);
  }, [leaveType, startDate, endDate, isSingleDayOnly]);

  // 연차 차감 일수 (비차감 휴가는 0일)
  const calculatedDeductedDays = useMemo(() => {
    if (isNonDeducting) return 0;
    return calculatedDurationDays;
  }, [isNonDeducting, calculatedDurationDays]);

  const deductingTypes = useMemo(
    () => LEAVE_TYPE_LIST.filter((t) => t.deductsAnnualLeave),
    []
  );
  const nonDeductingTypes = useMemo(
    () => LEAVE_TYPE_LIST.filter((t) => !t.deductsAnnualLeave),
    []
  );

  const handleSelectLeaveType = (code: LeaveTypeCode) => {
    setLeaveType(code);
    const meta = LEAVE_TYPE_MAP[code];
    if (meta?.singleDayOnly) {
      setEndDate(startDate);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast("신청 사유를 입력해주세요.", "error");
      return;
    }
    if (calculatedDurationDays <= 0) {
      showToast("유효한 휴가 기간(평일 기준)을 선택해주세요.", "error");
      return;
    }
    if (
      !isNonDeducting &&
      targetEmployee &&
      Number(targetEmployee.remainDays) < calculatedDeductedDays
    ) {
      if (!confirm("잔여 연차 일수를 초과합니다. 그래도 상신하시겠습니까?")) return;
    }

    try {
      const finalEndDate = isSingleDayOnly ? startDate : endDate;
      const res = await fetch("/api/erp/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: targetEmployee?.id || currentUserId || 1,
          leaveType,
          startDate,
          endDate: finalEndDate,
          deductedDays: calculatedDeductedDays,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "휴가 신청 실패");

      showToast(
        isNonDeducting
          ? `[${currentTypeMeta.shortLabel}] 연차 미소진(0일 차감) 휴가 신청이 결재함으로 상신되었습니다.`
          : "연차 신청이 제출되어 결재함으로 상신되었습니다."
      );
      setReason("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("해당 휴가 내역을 삭제(취소)하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/erp/leaves?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");

      showToast("휴가 내역이 삭제되었습니다.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
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
      <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
          <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
            연차 및 공가 신청
          </span>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
          title="새로고침"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left: Leave Balance Cards & Application Form (4 cols) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-y-auto">
          {/* Leave Quota Card */}
          <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-4 shadow-xs dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
                {targetEmployee?.name || currentUser?.name} 연차 보유 현황
              </span>
              {Number(targetEmployee?.nonDeductedCount || 0) > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
                  공가/예비군 {targetEmployee?.nonDeductedCount}건 (미차감)
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-[#ebe5d8] rounded border border-[#b5a894] text-center dark:bg-slate-950 dark:border-slate-800">
                <span className="text-[10px] text-[#475569] dark:text-slate-400 block mb-1">
                  부여 연차
                </span>
                <span className="text-lg font-mono font-bold text-[#1d4ed8] dark:text-blue-400">
                  {targetEmployee ? formatErpLeaveDays(targetEmployee.grantDays) : "15"}
                  <span className="text-xs font-normal text-[#475569] dark:text-slate-400 ml-0.5">
                    일
                  </span>
                </span>
              </div>
              <div className="p-3 bg-[#ebe5d8] rounded border border-[#b5a894] text-center dark:bg-slate-950 dark:border-slate-800">
                <span className="text-[10px] text-[#475569] dark:text-slate-400 block mb-1">
                  사용 연차
                </span>
                <span className="text-lg font-mono font-bold text-[#b45309] dark:text-amber-400">
                  {targetEmployee ? formatErpLeaveDays(targetEmployee.usedDays) : "0"}
                  <span className="text-xs font-normal text-[#475569] dark:text-slate-400 ml-0.5">
                    일
                  </span>
                </span>
              </div>
              <div className="p-3 bg-[#ebe5d8] rounded border border-[#b5a894] text-center dark:bg-slate-950 dark:border-slate-800">
                <span className="text-[10px] text-[#475569] dark:text-slate-400 block mb-1">
                  잔여 연차
                </span>
                <span className="text-lg font-mono font-bold text-[#047857] dark:text-emerald-400">
                  {targetEmployee ? formatErpLeaveDays(targetEmployee.remainDays) : "15"}
                  <span className="text-xs font-normal text-[#475569] dark:text-slate-400 ml-0.5">
                    일
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Application Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-[#f4efe4] border border-[#b5a894] rounded p-4 shadow-xs space-y-3 dark:bg-slate-900 dark:border-slate-800"
          >
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 block pb-2 border-b border-[#b5a894] dark:border-slate-800">
              휴가 신청 작성
            </span>

            {isAdmin && activeEmployees.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#334155] dark:text-slate-400 font-bold">
                  대상 사원 선택
                </label>
                <select
                  value={targetEmployee?.id || ""}
                  onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                  className="bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] px-2.5 py-1.5 rounded font-bold focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                >
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department} {emp.position} | 잔여{" "}
                      {formatErpLeaveDays(emp.remainDays)}일)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 1. 연차 소진 휴가 */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#334155] dark:text-slate-400 font-bold">
                연차 소진 휴가 (잔여연차 차감)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {deductingTypes.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelectLeaveType(item.code)}
                    className={`py-1.5 px-2 text-xs font-bold rounded border whitespace-nowrap transition ${
                      leaveType === item.code
                        ? "bg-[#1d4ed8] border-[#1d4ed8] text-white shadow-xs"
                        : "bg-[#dcd4c4] hover:bg-[#d0c6b4] border-[#b5a894] text-[#0f172a] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 잔여연차 미소진 휴가 (예비군훈련 등) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#047857] dark:text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>잔여연차 미소진 휴가 (연차 0일 차감)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {nonDeductingTypes.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelectLeaveType(item.code)}
                    className={`py-1.5 px-2 text-xs font-bold rounded border whitespace-nowrap transition ${
                      leaveType === item.code
                        ? "bg-[#047857] border-[#047857] text-white shadow-xs"
                        : "bg-[#dcd4c4] hover:bg-[#d0c6b4] border-[#b5a894] text-[#0f172a] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 시작/종료 일자 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#334155] dark:text-slate-400 font-bold">
                  시작 일자
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (isSingleDayOnly || e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#334155] dark:text-slate-400 font-bold">
                  종료 일자
                </label>
                <input
                  type="date"
                  disabled={isSingleDayOnly}
                  value={isSingleDayOnly ? startDate : endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] disabled:opacity-50 font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* 휴가 기간 및 차감 일수 안내 */}
            <div
              className={`p-2.5 rounded border text-xs space-y-1 ${
                isNonDeducting
                  ? "bg-[#ecfdf5] border-[#047857] text-[#065f46] dark:bg-emerald-950/30 dark:border-emerald-700"
                  : "bg-[#ebe5d8] border-[#b5a894] text-[#0f172a] dark:bg-slate-950 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">신청 휴가 기간 (평일 기준)</span>
                <span className="font-mono font-bold">
                  {formatErpLeaveDays(calculatedDurationDays)}일
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">연차 차감 일수</span>
                {isNonDeducting ? (
                  <span className="font-mono font-bold text-[#047857] dark:text-emerald-400">
                    0일 (잔여연차 미소진)
                  </span>
                ) : (
                  <span className="font-mono font-bold text-[#b45309] dark:text-amber-400">
                    {formatErpLeaveDays(calculatedDeductedDays)}일 차감
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#334155] dark:text-slate-400 font-bold">
                신청 사유
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={currentTypeMeta.placeholderReason}
                rows={3}
                className="bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-2 text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 shadow transition ${
                isNonDeducting
                  ? "bg-[#047857] hover:bg-[#065f46]"
                  : "bg-[#1d4ed8] hover:bg-[#1e40af]"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isNonDeducting
                  ? `${currentTypeMeta.shortLabel} 신청 제출 (연차 미차감)`
                  : "연차 신청 제출"}
              </span>
            </button>
          </form>
        </div>

        {/* Right: Leave History Table (8 cols) */}
        <div className="col-span-12 lg:col-span-8 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] text-xs font-bold text-[#0f172a] flex flex-wrap items-center justify-between gap-2 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300">
            <span>휴가 사용 및 결재 이력 ({formatErpNumber(filteredLeaves.length)}건)</span>

            {isAdmin && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHistoryEmpFilter("ALL")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                    historyEmpFilter === "ALL"
                      ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                      : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894]"
                  }`}
                >
                  전체 ({allLeaves.length})
                </button>
                {activeEmployees.map((emp) => {
                  const cnt = allLeaves.filter((l) => l.employeeId === emp.id).length;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setHistoryEmpFilter(String(emp.id));
                        setSelectedEmpId(emp.id);
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                        historyEmpFilter === String(emp.id)
                          ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                          : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894]"
                      }`}
                    >
                      {emp.name} ({cnt})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#dcd4c4] text-[#0f172a] font-semibold border-b border-[#b5a894] sticky top-0 z-10 select-none dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap border-r border-[#c4b6a0] dark:border-slate-700">
                    조치
                  </th>
                  {renderSortTh("휴가 일자", "startDate")}
                  {renderSortTh("사원명", "employeeName")}
                  {renderSortTh("휴가 구분", "leaveType")}
                  {renderSortTh("연차 차감", "deductedDays", "center")}
                  {renderSortTh("사유", "reason")}
                  {renderSortTh("결재상태", "status", "center")}
                  {renderSortTh("결재자", "approverName")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
                {sortedLeaves.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-[#475569] dark:text-slate-500 whitespace-nowrap"
                    >
                      신청된 휴가 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedLeaves.map((l) => {
                    const nonDed =
                      Number(l.deductedDays) === 0 || isNonDeductingLeaveType(l.leaveType);
                    return (
                      <tr
                        key={l.id}
                        className="hover:bg-[#ede6d6] dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-2 px-3 text-center whitespace-nowrap border-r border-[#d5cbb8] dark:border-slate-800">
                          {l.status === "PENDING" || isAdmin ? (
                            <button
                              onClick={() => handleDelete(l.id)}
                              className="px-2 py-0.5 bg-[#fef2f2] hover:bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca] rounded text-[11px] font-bold inline-flex items-center gap-1 transition"
                              title="삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>삭제</span>
                            </button>
                          ) : (
                            <span className="text-[#94a3b8]">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                          {l.startDate} {l.startDate !== l.endDate ? `~ ${l.endDate}` : ""}
                        </td>
                        <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                          {l.employeeName}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              nonDed
                                ? "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]"
                                : "bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]"
                            }`}
                          >
                            {getLeaveTypeLabel(l.leaveType)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold whitespace-nowrap">
                          {nonDed ? (
                            <span className="text-[#047857] dark:text-emerald-400">
                              0일 (미소진)
                            </span>
                          ) : (
                            <span className="text-[#b45309] dark:text-amber-400">
                              {formatErpLeaveDays(l.deductedDays)}일 차감
                            </span>
                          )}
                        </td>
                        <td
                          className="py-2 px-3 text-[#334155] dark:text-slate-300 max-w-xs truncate whitespace-nowrap"
                          title={l.reason}
                        >
                          {l.reason}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              l.status === "PENDING"
                                ? "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                                : l.status === "APPROVED"
                                ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
                                : "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]"
                            }`}
                          >
                            {l.status === "PENDING"
                              ? "결재대기"
                              : l.status === "APPROVED"
                              ? "승인완료"
                              : "반려"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {l.approverName || "-"}
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
    </div>
  );
};
