"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, Clock, Check, X, AlertCircle, RefreshCw, 
  Send, Trash2, Info, ChevronRight, User
} from "lucide-react";

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

      {/* Top Header */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-slate-200">
            연차 신청 (근태 휴가 상신)
          </span>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
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
          <div className="bg-slate-900 border border-slate-800 rounded p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-400 block mb-3">
              {myInfo?.name || currentUser?.name} 님의 연차 보유 현황
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-slate-950/60 rounded border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block mb-1">부여 연차</span>
                <span className="text-lg font-mono font-bold text-blue-400">
                  {myInfo ? Number(myInfo.grantDays).toFixed(1) : "15.0"}
                  <span className="text-xs font-normal text-slate-400 ml-0.5">일</span>
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block mb-1">사용 연차</span>
                <span className="text-lg font-mono font-bold text-amber-400">
                  {myInfo ? Number(myInfo.usedDays).toFixed(1) : "0.0"}
                  <span className="text-xs font-normal text-slate-400 ml-0.5">일</span>
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block mb-1">잔여 연차</span>
                <span className="text-lg font-mono font-bold text-emerald-400">
                  {myInfo ? Number(myInfo.remainDays).toFixed(1) : "15.0"}
                  <span className="text-xs font-normal text-slate-400 ml-0.5">일</span>
                </span>
              </div>
            </div>
          </div>

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded p-4 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-200 block pb-2 border-b border-slate-800">
              신규 연차 상신 작성
            </span>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">휴가 구분</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setLeaveType("ANNUAL")}
                  className={`py-1.5 text-xs font-bold rounded border transition ${
                    leaveType === "ANNUAL"
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  전일 연차 (1일)
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveType("HALF_AM")}
                  className={`py-1.5 text-xs font-bold rounded border transition ${
                    leaveType === "HALF_AM"
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  오전 반차 (0.5)
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveType("HALF_PM")}
                  className={`py-1.5 text-xs font-bold rounded border transition ${
                    leaveType === "HALF_PM"
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  오후 반차 (0.5)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">시작 일자</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (leaveType !== "ANNUAL" || e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">종료 일자</label>
                <input
                  type="date"
                  disabled={leaveType !== "ANNUAL"}
                  value={leaveType === "ANNUAL" ? endDate : startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">차감 예정 일수</span>
              <span className="font-mono font-bold text-amber-400">
                {calculatedDeductedDays}일 (주말 제외)
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">신청 사유</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="연차 사유를 구체적으로 작성해주세요."
                rows={3}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 shadow transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>연차 신청 제출</span>
            </button>
          </form>
        </div>

        {/* Right: My Leave History Table (8 cols) */}
        <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded flex flex-col overflow-hidden">
          <div className="p-3 bg-slate-800/80 border-b border-slate-700 text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>내 연차 신청 및 결재 이력 ({leaves.length}건)</span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-700 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">신청일시</th>
                  <th className="py-2.5 px-3">구분</th>
                  <th className="py-2.5 px-3">휴가 기간</th>
                  <th className="py-2.5 px-3 text-center">차감일수</th>
                  <th className="py-2.5 px-3">사유</th>
                  <th className="py-2.5 px-3 text-center">결재상태</th>
                  <th className="py-2.5 px-3">결재자</th>
                  <th className="py-2.5 px-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      신청된 연차 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {l.createdAt ? l.createdAt.substring(0, 10) : "-"}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-blue-300">
                          {l.leaveType === "ANNUAL" ? "연차" : l.leaveType === "HALF_AM" ? "오전반차" : "오후반차"}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-200 whitespace-nowrap">
                        {l.startDate} {l.startDate !== l.endDate ? `~ ${l.endDate}` : ""}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-amber-400 whitespace-nowrap">
                        {l.deductedDays}일
                      </td>
                      <td className="py-2 px-3 text-slate-300 max-w-xs truncate" title={l.reason}>
                        {l.reason}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.status === "PENDING"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : l.status === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {l.status === "PENDING" ? "결재대기" : l.status === "APPROVED" ? "승인완료" : "반려"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                        {l.approverName || "-"}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {l.status === "PENDING" ? (
                          <button
                            onClick={() => handleDelete(l.id)}
                            className="p-1 hover:bg-rose-950 text-rose-400 rounded transition"
                            title="신청 취소"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-600">-</span>
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
