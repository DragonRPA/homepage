"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, Clock, Check, X, AlertCircle, RefreshCw, 
  Send, Trash2, Info, ChevronRight, User,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { sortErpItems, SortDirection, formatErpNumber, formatErpLeaveDays } from "@/lib/erpFormat";

interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeNo: string;
  employeeName: string;
  department: string;
  position: string;
  leaveType: "ANNUAL" | "HALF_AM" | "HALF_PM";
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
  name: string;
  department: string;
  position: string;
  grantDays: number;
  usedDays: number;
  remainDays: number;
}

export const LeaveApplyTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const currentUserId = currentUser?.id;

  const [myInfo, setMyInfo] = useState<Employee | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const renderSortTh = (label: string, colKey: string, align: "left" | "right" | "center" = "left") => (
    <th
      onClick={() => handleSort(colKey)}
      className={`py-2.5 px-3 whitespace-nowrap cursor-pointer select-none transition ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } hover:bg-[#d0c6b4] dark:hover:bg-slate-700/60`}
    >
      <div className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
        <span>{label}</span>
        {sortKey === colKey ? (
          sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100" />
        )}
      </div>
    </th>
  );

  const sortedLeaves = useMemo(() => {
    return sortErpItems(leaves, sortKey, sortDir);
  }, [leaves, sortKey, sortDir]);

  // Form State
  const [leaveType, setLeaveType] = useState<"ANNUAL" | "HALF_AM" | "HALF_PM">("ANNUAL");
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [reason, setReason] = useState("");

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
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
        const found = empData.employees.find((e: any) => e.id === currentUserId || e.loginId === currentUser?.loginId);
        if (found) setMyInfo(found);
      }

      if (leaveData.success && leaveData.leaves) {
        // filter by my requests if not admin or view scope
        const myLeaves = leaveData.leaves.filter(
          (l: any) => l.employeeId === currentUserId || l.employeeName === currentUser?.name
        );
        setLeaves(myLeaves);
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

  // Calculate business days between startDate and endDate
  const calculatedDeductedDays = useMemo(() => {
    if (leaveType === "HALF_AM" || leaveType === "HALF_PM") {
      return 0.5;
    }
    if (!startDate || !endDate) return 1.0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;

    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [leaveType, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast("신청 사유를 입력해주세요.", "error");
      return;
    }
    if (calculatedDeductedDays <= 0) {
      showToast("유효한 연차 사용 일수가 아닙니다.", "error");
      return;
    }
    if (myInfo && myInfo.remainDays < calculatedDeductedDays) {
      if (!confirm("잔여 연차 일수를 초과합니다. 그래도 상신하시겠습니까?")) return;
    }

    try {
      const finalEndDate = (leaveType === "HALF_AM" || leaveType === "HALF_PM") ? startDate : endDate;
      const res = await fetch("/api/erp/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: myInfo?.id || currentUserId || 1,
          leaveType,
          startDate,
          endDate: finalEndDate,
          deductedDays: calculatedDeductedDays,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "연차 신청 실패");

      showToast("연차 신청이 제출되어 결재함으로 자동 상신되었습니다.");
      setReason("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("연차 신청을 취소하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/erp/leaves?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "취소 실패");

      showToast("연차 신청이 취소되었습니다.");
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
            연차 신청 (근태 휴가 상신)
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
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 block mb-3">
              {myInfo?.name || currentUser?.name} 님의 연차 보유 현황
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-[#ebe5d8] rounded border border-[#b5a894] text-center dark:bg-slate-950 dark:border-slate-800">
                <span className="text-[10px] text-[#475569] dark:text-slate-400 block mb-1">부여 연차</span>
                <span className="text-lg font-mono font-bold text-[#1d4ed8] dark:text-blue-400">
                  {myInfo ? formatErpLeaveDays(myInfo.grantDays) : "15"}
                  <span className="text-xs font-normal text-[#475569] dark:text-slate-400 ml-0.5">일</span>
                </span>
              </div>
              <div className="p-3 bg-[#ebe5d8] rounded border border-[#b5a894] text-center dark:bg-slate-950 dark:border-slate-800">
                <span className="text-[10px] text-[#475569] dark:text-slate-400 block mb-1">사용 연차</span>
                <span className="text-lg font-mono font-bold text-[#b45309] dark:text-amber-400">
                  {myInfo ? formatErpLeaveDays(myInfo.usedDays) : "0"}
                  <span className="text-xs font-normal text-[#475569] dark:text-slate-400 ml-0.5">일</span>
                </span>
              </div>
              <div className="p-3 bg-[#ebe5d8] rounded border border-[#b5a894] text-center dark:bg-slate-950 dark:border-slate-800">
                <span className="text-[10px] text-[#475569] dark:text-slate-400 block mb-1">잔여 연차</span>
                <span className="text-lg font-mono font-bold text-[#047857] dark:text-emerald-400">
                  {myInfo ? formatErpLeaveDays(myInfo.remainDays) : "15"}
                  <span className="text-xs font-normal text-[#475569] dark:text-slate-400 ml-0.5">일</span>
                </span>
              </div>
            </div>
          </div>

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="bg-[#f4efe4] border border-[#b5a894] rounded p-4 shadow-xs space-y-3 dark:bg-slate-900 dark:border-slate-800">
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 block pb-2 border-b border-[#b5a894] dark:border-slate-800">
              신규 연차 상신 작성
            </span>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">휴가 구분</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setLeaveType("ANNUAL")}
                  className={`py-1.5 text-xs font-bold rounded border transition ${
                    leaveType === "ANNUAL"
                      ? "bg-[#1d4ed8] border-[#1d4ed8] text-white shadow-xs"
                      : "bg-[#dcd4c4] hover:bg-[#d0c6b4] border-[#b5a894] text-[#0f172a] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  전일 연차 (1일)
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveType("HALF_AM")}
                  className={`py-1.5 text-xs font-bold rounded border transition ${
                    leaveType === "HALF_AM"
                      ? "bg-[#1d4ed8] border-[#1d4ed8] text-white shadow-xs"
                      : "bg-[#dcd4c4] hover:bg-[#d0c6b4] border-[#b5a894] text-[#0f172a] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  오전 반차 (0.5)
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveType("HALF_PM")}
                  className={`py-1.5 text-xs font-bold rounded border transition ${
                    leaveType === "HALF_PM"
                      ? "bg-[#1d4ed8] border-[#1d4ed8] text-white shadow-xs"
                      : "bg-[#dcd4c4] hover:bg-[#d0c6b4] border-[#b5a894] text-[#0f172a] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  오후 반차 (0.5)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">시작 일자</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (leaveType !== "ANNUAL" || e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">종료 일자</label>
                <input
                  type="date"
                  disabled={leaveType !== "ANNUAL"}
                  value={leaveType === "ANNUAL" ? endDate : startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] flex items-center justify-between text-xs dark:bg-slate-950 dark:border-slate-800">
              <span className="text-[#334155] dark:text-slate-400 font-semibold">차감 예정 일수</span>
              <span className="font-mono font-bold text-[#b45309] dark:text-amber-400">
                {formatErpLeaveDays(calculatedDeductedDays)}일 (주말 제외)
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">신청 사유</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="연차 사유를 구체적으로 작성해주세요."
                rows={3}
                className="bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 shadow transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>연차 신청 제출</span>
            </button>
          </form>
        </div>

        {/* Right: My Leave History Table (8 cols) */}
        <div className="col-span-12 lg:col-span-8 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] text-xs font-bold text-[#0f172a] flex items-center justify-between dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300">
            <span>내 연차 신청 및 결재 이력 ({formatErpNumber(leaves.length)}건)</span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#dcd4c4] text-[#0f172a] uppercase tracking-wider font-semibold border-b border-[#b5a894] sticky top-0 z-10 select-none dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  {renderSortTh("신청일시", "createdAt")}
                  {renderSortTh("구분", "leaveType")}
                  {renderSortTh("휴가 기간", "startDate")}
                  {renderSortTh("차감일수", "deductedDays", "center")}
                  {renderSortTh("사유", "reason")}
                  {renderSortTh("결재상태", "status", "center")}
                  {renderSortTh("결재자", "approverName")}
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
                {sortedLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#475569] dark:text-slate-500">
                      신청된 연차 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedLeaves.map((l) => (
                    <tr key={l.id} className="hover:bg-[#ede6d6] dark:hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                        {l.createdAt ? l.createdAt.substring(0, 10) : "-"}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]">
                          {l.leaveType === "ANNUAL" ? "연차" : l.leaveType === "HALF_AM" ? "오전반차" : "오후반차"}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                        {l.startDate} {l.startDate !== l.endDate ? `~ ${l.endDate}` : ""}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-[#b45309] dark:text-amber-400 whitespace-nowrap">
                        {formatErpLeaveDays(l.deductedDays)}일
                      </td>
                      <td className="py-2 px-3 text-[#334155] dark:text-slate-300 max-w-xs truncate" title={l.reason}>
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
                          {l.status === "PENDING" ? "결재대기" : l.status === "APPROVED" ? "승인완료" : "반려"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#475569] dark:text-slate-400 whitespace-nowrap">
                        {l.approverName || "-"}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {l.status === "PENDING" ? (
                          <button
                            onClick={() => handleDelete(l.id)}
                            className="p-1 hover:bg-[#fee2e2] text-[#b91c1c] rounded transition dark:hover:bg-rose-950 dark:text-rose-400"
                            title="신청 취소"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[#94a3b8]">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
