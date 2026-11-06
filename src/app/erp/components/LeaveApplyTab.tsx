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
  UserCheck,
} from "lucide-react";
import {
  sortErpItems,
  SortDirection,
  formatErpNumber,
  formatErpLeaveDays,
  calculateAnnualLeaveEntitlement,
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
  joinDate?: string;
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

  const [employees, setEmployees] = useState<Employee[]>([]);
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

  // 각자 본인의 연차만 상신 및 조회하도록 로그인한 본인 사원 정보로 고정
  const selfEmployee = useMemo(() => {
    return (
      employees.find((e) => Number(e.id) === Number(currentUserId)) ||
      employees.find((e) => e.loginId && e.loginId === currentUser?.loginId) ||
      employees.find((e) => e.name && e.name === currentUser?.name) ||
      null
    );
  }, [employees, currentUserId, currentUser]);

  // 본인 연차 집계 (입사일, 근속연수, 부여연차, 사용연차, 잔여연차, 미차감 건수, 소진율)
  const selfLeaveSummary = useMemo(() => {
    const joinDateStr = selfEmployee?.joinDate
      ? String(selfEmployee.joinDate).substring(0, 10)
      : "-";
    const entitlement = calculateAnnualLeaveEntitlement(selfEmployee?.joinDate);
    const tenure = entitlement.tenureYears;
    const rawGrant = Number(selfEmployee?.grantDays ?? 15);
    const grant =
      tenure === 0 && (rawGrant === 15 || rawGrant === 11)
        ? entitlement.grantDays
        : rawGrant;
    const used = Number(selfEmployee?.usedDays ?? 0);
    const remain = grant - used;
    const nonDedCount = Number(selfEmployee?.nonDeductedCount ?? 0);
    const rate = grant > 0 ? Math.min(100, Math.round((used / grant) * 100)) : 0;

    return {
      joinDateStr,
      tenure,
      formulaLabel: entitlement.formulaLabel,
      grant,
      used,
      remain,
      nonDedCount,
      rate,
    };
  }, [selfEmployee]);

  const myLeaves = useMemo(() => {
    const myEmpId = Number(selfEmployee?.id || currentUserId || 0);
    return allLeaves.filter(
      (l) =>
        Number(l.employeeId) === myEmpId ||
        (currentUser?.name && l.employeeName === currentUser.name)
    );
  }, [allLeaves, selfEmployee, currentUserId, currentUser]);

  const sortedLeaves = useMemo(() => {
    return sortErpItems(myLeaves, sortKey, sortDir);
  }, [myLeaves, sortKey, sortDir]);

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
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, leaveRes] = await Promise.all([
        fetch("/api/erp/employees", { cache: "no-store" }),
        fetch("/api/erp/leaves", { cache: "no-store" }),
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
      selfEmployee &&
      Number(selfEmployee.remainDays) < calculatedDeductedDays
    ) {
      if (!confirm("잔여 연차 일수를 초과합니다. 그래도 상신하시겠습니까?")) return;
    }

    try {
      const finalEndDate = isSingleDayOnly ? startDate : endDate;
      const myEmpId = selfEmployee?.id || currentUserId;
      const res = await fetch("/api/erp/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: myEmpId,
          requesterId: myEmpId,
          leaveType,
          startDate,
          endDate: finalEndDate,
          deductedDays: calculatedDeductedDays,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "휴가 신청 실패");

      const approverLabel = data.approverName ? ` (${data.approverName} 결재함)` : "";
      if (data.autoApproved) {
        showToast(
          isNonDeducting
            ? `[${currentTypeMeta.shortLabel}] 휴가 신청이 부서장 전결로 즉시 승인되었습니다.`
            : `연차 신청이 부서장 전결로 즉시 승인되었습니다.`
        );
      } else {
        showToast(
          isNonDeducting
            ? `[${currentTypeMeta.shortLabel}] 휴가 신청이 부서장 내 결재함${approverLabel}으로 상신되었습니다.`
            : `연차 신청이 부서장 내 결재함${approverLabel}으로 상신되었습니다.`
        );
      }
      setReason("");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("해당 연차 신청을 취소(삭제)하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/erp/leaves?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");

      showToast("연차 신청이 취소되었습니다.");
      await fetchData();
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
      <div className="p-2.5 px-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Calendar className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
              연차 및 공가 신청
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd] whitespace-nowrap">
            <UserCheck className="w-3 h-3" />
            <span>
              신청자: {selfEmployee?.name || currentUser?.name} (
              {selfEmployee?.department || currentUser?.department || "소속부서"}{" "}
              {selfEmployee?.position || currentUser?.position || ""})
            </span>
          </span>

          {/* 상단 헤더 1줄 연차일수·사용일·소진율 집계 바 */}
          <div className="flex flex-wrap items-center gap-2 px-2.5 py-1 rounded bg-[#f4efe4] border border-[#b5a894] text-[11px] whitespace-nowrap shadow-2xs">
            <span className="font-mono text-[#475569]">
              사번 <strong className="text-[#0f172a]">{selfEmployee?.employeeNo || "-"}</strong>
            </span>
            <span className="text-[#cbd5e1]">|</span>
            <span className="font-mono text-[#475569]">
              입사일 <strong className="text-[#0f172a]">{selfLeaveSummary.joinDateStr}</strong>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                selfLeaveSummary.tenure === 0
                  ? "bg-[#eff6ff] border-[#93c5fd] text-[#1d4ed8]"
                  : "bg-[#dcd4c4] border-[#b5a894] text-[#0f172a]"
              }`}
              title={selfLeaveSummary.formulaLabel}
            >
              {selfLeaveSummary.tenure}년차{selfLeaveSummary.tenure === 0 ? " (비례)" : ""}
            </span>
            <span className="text-[#cbd5e1]">|</span>
            <span>
              부여{" "}
              <strong className="font-mono text-[#1d4ed8]">
                {formatErpLeaveDays(selfLeaveSummary.grant)}일
              </strong>
            </span>
            <span className="text-[#cbd5e1]">|</span>
            <span>
              사용{" "}
              <strong className="font-mono text-[#b45309]">
                {formatErpLeaveDays(selfLeaveSummary.used)}일
              </strong>
            </span>
            <span className="text-[#cbd5e1]">|</span>
            <span>
              잔여{" "}
              <strong className="font-mono text-[#047857]">
                {formatErpLeaveDays(selfLeaveSummary.remain)}일
              </strong>
            </span>
            <span className="text-[#cbd5e1]">|</span>
            <span>
              공가/특별(미차감){" "}
              {selfLeaveSummary.nonDedCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] font-mono">
                  {selfLeaveSummary.nonDedCount}건 (0일차감)
                </span>
              ) : (
                <strong className="font-mono text-[#64748b]">0건</strong>
              )}
            </span>
            <span className="text-[#cbd5e1]">|</span>
            <div className="inline-flex items-center gap-1.5">
              <span className="text-[#475569] font-semibold">소진율</span>
              <div className="w-16 bg-[#dcd4c4] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${
                    selfLeaveSummary.rate > 80
                      ? "bg-[#dc2626]"
                      : selfLeaveSummary.rate > 50
                      ? "bg-[#b45309]"
                      : "bg-[#1d4ed8]"
                  }`}
                  style={{ width: `${selfLeaveSummary.rate}%` }}
                />
              </div>
              <span className="font-mono font-bold text-[#0f172a]">
                {formatErpNumber(selfLeaveSummary.rate)}%
              </span>
            </div>
          </div>
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

      {/* 연차관리 동일 규격 1줄 개인 연차 보유/사용/소진율 집계표 */}
      <div className="px-4 pt-3 shrink-0">
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#dcd4c4] text-[#0f172a] font-semibold border-b border-[#b5a894] select-none">
              <tr>
                <th className="py-2 px-3 whitespace-nowrap">사번</th>
                <th className="py-2 px-3 whitespace-nowrap">성명</th>
                <th className="py-2 px-3 whitespace-nowrap">부서</th>
                <th className="py-2 px-3 whitespace-nowrap">직급 / 직책</th>
                <th className="py-2 px-3 whitespace-nowrap">입사일</th>
                <th className="py-2 px-3 text-center whitespace-nowrap">근속연수</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">부여 연차</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">사용 연차</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">잔여 연차</th>
                <th className="py-2 px-3 text-center whitespace-nowrap">공가/특별(미차감)</th>
                <th className="py-2 px-3 text-center whitespace-nowrap">소진율</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#f4efe4] hover:bg-[#ede6d6] transition">
                <td className="py-2 px-3 font-mono text-[#475569] whitespace-nowrap">
                  {selfEmployee?.employeeNo || "-"}
                </td>
                <td className="py-2 px-3 font-bold text-[#0f172a] whitespace-nowrap">
                  {selfEmployee?.name || currentUser?.name || "-"}
                </td>
                <td className="py-2 px-3 text-[#334155] whitespace-nowrap">
                  {selfEmployee?.department || currentUser?.department || "-"}
                </td>
                <td className="py-2 px-3 text-[#334155] whitespace-nowrap">
                  {selfEmployee?.position || currentUser?.position || "-"}{" "}
                  {selfEmployee?.duty ? `(${selfEmployee.duty})` : ""}
                </td>
                <td className="py-2 px-3 font-mono text-[#475569] whitespace-nowrap">
                  {selfLeaveSummary.joinDateStr}
                </td>
                <td
                  className="py-2 px-3 text-center whitespace-nowrap"
                  title={selfLeaveSummary.formulaLabel}
                >
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      selfLeaveSummary.tenure === 0
                        ? "bg-[#eff6ff] border-[#93c5fd] text-[#1d4ed8]"
                        : "bg-[#dcd4c4] border-[#b5a894] text-[#0f172a]"
                    }`}
                  >
                    {selfLeaveSummary.tenure}년차{selfLeaveSummary.tenure === 0 ? " (비례)" : ""}
                  </span>
                </td>
                <td
                  className="py-2 px-3 text-right font-mono font-bold text-[#1d4ed8] whitespace-nowrap"
                  title={`규정 산출값: ${selfLeaveSummary.grant}일 (${selfLeaveSummary.formulaLabel})`}
                >
                  {formatErpLeaveDays(selfLeaveSummary.grant)}일
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-[#b45309] whitespace-nowrap">
                  {formatErpLeaveDays(selfLeaveSummary.used)}일
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-[#047857] whitespace-nowrap">
                  {formatErpLeaveDays(selfLeaveSummary.remain)}일
                </td>
                <td className="py-2 px-3 text-center font-mono whitespace-nowrap">
                  {selfLeaveSummary.nonDedCount > 0 ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
                      {selfLeaveSummary.nonDedCount}건 (0일차감)
                    </span>
                  ) : (
                    <span className="text-[#94a3b8]">-</span>
                  )}
                </td>
                <td className="py-2 px-3 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-16 bg-[#dcd4c4] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${
                          selfLeaveSummary.rate > 80
                            ? "bg-[#dc2626]"
                            : selfLeaveSummary.rate > 50
                            ? "bg-[#b45309]"
                            : "bg-[#1d4ed8]"
                        }`}
                        style={{ width: `${selfLeaveSummary.rate}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-[#475569]">
                      {formatErpNumber(selfLeaveSummary.rate)}%
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 pt-3 overflow-hidden">
        {/* Left: Leave Balance Cards & Application Form (4 cols) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 overflow-y-auto">
          {/* Leave Quota Card */}
          <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
                {selfEmployee?.name || currentUser?.name} 연차 보유 현황
              </span>
              <div className="flex items-center gap-1.5">
                {Number(selfEmployee?.nonDeductedCount || 0) > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
                    공가/예비군 {selfEmployee?.nonDeductedCount}건 (미차감)
                  </span>
                )}
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#ebe5d8] text-[#334155] border border-[#b5a894]">
                  소진율 {formatErpNumber(selfLeaveSummary.rate)}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] text-center dark:bg-slate-950 dark:border-slate-800">
                <span className="text-[10px] text-[#475569] dark:text-slate-400 block mb-0.5">
                  부여 연차
                </span>
                <span className="text-lg font-mono font-bold text-[#1d4ed8] dark:text-blue-400">
                  {formatErpLeaveDays(selfLeaveSummary.grant)}
                  <span className="text-xs font-normal text-[#475569] dark:text-slate-400 ml-0.5">
                    일
                  </span>
                </span>
              </div>
              <div className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] text-center dark:bg-slate-950 dark:border-slate-800">
                <span className="text-[10px] text-[#475569] dark:text-slate-400 block mb-0.5">
                  사용 연차
                </span>
                <span className="text-lg font-mono font-bold text-[#b45309] dark:text-amber-400">
                  {formatErpLeaveDays(selfLeaveSummary.used)}
                  <span className="text-xs font-normal text-[#475569] dark:text-slate-400 ml-0.5">
                    일
                  </span>
                </span>
              </div>
              <div className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] text-center dark:bg-slate-950 dark:border-slate-800">
                <span className="text-[10px] text-[#475569] dark:text-slate-400 block mb-0.5">
                  잔여 연차
                </span>
                <span className="text-lg font-mono font-bold text-[#047857] dark:text-emerald-400">
                  {formatErpLeaveDays(selfLeaveSummary.remain)}
                  <span className="text-xs font-normal text-[#475569] dark:text-slate-400 ml-0.5">
                    일
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Application Form (본인 연차 상신 전용) */}
          <form
            onSubmit={handleSubmit}
            className="bg-[#f4efe4] border border-[#b5a894] rounded p-4 shadow-xs space-y-3 dark:bg-slate-900 dark:border-slate-800"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#b5a894] dark:border-slate-800">
              <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
                휴가 신청 작성
              </span>
              <span className="text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400">
                전결권자: 부서장 (장종순)
              </span>
            </div>

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
                  ? `${currentTypeMeta.shortLabel} 신청 상신`
                  : "연차 신청 상신"}
              </span>
            </button>
          </form>
        </div>

        {/* Right: My Leave History Table (8 cols) */}
        <div className="col-span-12 lg:col-span-8 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] text-xs font-bold text-[#0f172a] flex flex-wrap items-center justify-between gap-2 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300">
            <span>
              {selfEmployee?.name || currentUser?.name} 연차 신청 및 결재 이력 ({formatErpNumber(myLeaves.length)}건)
            </span>
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
                          {l.status === "PENDING" ? (
                            <button
                              onClick={() => handleDelete(l.id)}
                              className="px-2 py-0.5 bg-[#fef2f2] hover:bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca] rounded text-[11px] font-bold inline-flex items-center gap-1 transition"
                              title="상신 취소"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>취소</span>
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
