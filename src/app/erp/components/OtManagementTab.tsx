"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Clock, Check, X, Plus, Download, RefreshCw, 
  Search, Calendar, AlertCircle, FileSpreadsheet, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { formatErpNumber, formatErpCurrency, formatErpQty, sortErpItems, SortDirection } from "@/lib/erpFormat";

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
}

const OT_REASONS = [
  "야간 출고 및 배차 지원",
  "긴급 RPA 시스템 장애 조치",
  "고객사 현장 긴급 기술지원",
  "월말 결산 및 세금계산서 마감",
  "주말 장비 점검 및 입고 검수",
  "신규 프로젝트 릴리즈 배포",
];

const getDayOfWeekKr = (dateStr: string) => {
  if (!dateStr) return "";
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dt = new Date(dateStr);
  return days[dt.getDay()] || "";
};

export const OtManagementTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";
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
  const [otForm, setOtForm] = useState({
    employeeId: currentUserId || 1,
    otDate: new Date().toISOString().substring(0, 10),
    startTime: "18:00",
    endTime: "21:00",
    otHours: 3.0,
    reason: OT_REASONS[0],
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
          ot.reason.toLowerCase().includes(q)
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

  const sortedFilteredOvertimes = useMemo(() => {
    return sortErpItems(filteredOvertimes, sortKey, sortDir);
  }, [filteredOvertimes, sortKey, sortDir]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCount = overtimes.length;
    let approvedHours = 0;
    let pendingCount = 0;

    overtimes.forEach((o) => {
      if (o.status === "APPROVED") {
        approvedHours += Number(o.otHours || 0);
      } else if (o.status === "PENDING") {
        pendingCount++;
      }
    });

    return { totalCount, approvedHours, pendingCount };
  }, [overtimes]);

  // Submit OT Form
  const handleSubmitOt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otForm.reason.trim()) {
      showToast("근무 사유를 입력해주세요.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/overtimes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(otForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "신청 실패");

      showToast("연장근무 신청이 등록되었습니다.");
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
    if (!confirm("연장근무 신청 내역을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/erp/overtimes?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");

      showToast("삭제되었습니다.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["근무일자", "요일", "사번", "성명", "부서", "시작시간", "종료시간", "인정시간", "근무사유", "상태", "승인자"];
    const rows = filteredOvertimes.map((o) => [
      o.otDate ? o.otDate.substring(0, 10) : "-",
      getDayOfWeekKr(o.otDate),
      o.employeeNo,
      o.employeeName,
      o.department,
      o.startTime,
      o.endTime,
      `${o.otHours}시간`,
      o.reason,
      o.status,
      o.approverName || "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `연장근무대장_${selectedMonth}.csv`);
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
              연장근무(OT) 관리 대장
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
              <option value="경영총괄">경영총괄</option>
              <option value="기술개발부">기술개발부</option>
              <option value="영업관리부">영업관리부</option>
              <option value="고객지원부">고객지원부</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#475569] dark:text-slate-400" />
              <input
                type="text"
                placeholder="사원명 / 사유 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] pl-8 pr-3 py-1.5 rounded w-40 focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
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
              setOtForm({
                employeeId: currentUserId || 1,
                otDate: new Date().toISOString().substring(0, 10),
                startTime: "18:00",
                endTime: "21:00",
                otHours: 3.0,
                reason: OT_REASONS[0],
              });
              setOtModalOpen(true);
            }}
            className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>연장근무 신청</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-4 pt-3 pb-1 grid grid-cols-3 gap-3 shrink-0">
        <div className="bg-[#f4efe4] border border-[#b5a894] p-2.5 rounded flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
          <span className="text-xs text-[#475569] dark:text-slate-400">당월 총 신청 건수</span>
          <span className="text-base font-bold font-mono text-[#0f172a] dark:text-slate-100">{formatErpNumber(kpis.totalCount)}건</span>
        </div>
        <div className="bg-[#f4efe4] border border-[#b5a894] p-2.5 rounded flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
          <span className="text-xs text-[#475569] dark:text-slate-400">당월 승인 연장근무 합계</span>
          <span className="text-base font-bold font-mono text-[#047857] dark:text-emerald-400">{formatErpNumber(kpis.approvedHours)}시간</span>
        </div>
        <div className="bg-[#f4efe4] border border-[#b5a894] p-2.5 rounded flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
          <span className="text-xs text-[#475569] dark:text-slate-400">결재 대기</span>
          <span className="text-base font-bold font-mono text-[#b45309] dark:text-amber-400">{formatErpNumber(kpis.pendingCount)}건</span>
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
                {renderSortTh("근무 시간", "startTime")}
                {renderSortTh("인정시간", "otHours", "center")}
                {renderSortTh("근무 사유", "reason")}
                {renderSortTh("결재상태", "status", "center")}
                {renderSortTh("승인자", "approverName")}
                <th className="py-2.5 px-3 whitespace-nowrap text-center">조치 / 관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
              {sortedFilteredOvertimes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#475569] dark:text-slate-500">
                    해당 월에 신청된 연장근무 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedFilteredOvertimes.map((ot) => (
                  <tr key={ot.id} className="hover:bg-[#ede6d6] dark:hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-mono text-[#0f172a] dark:text-slate-300 whitespace-nowrap">
                      {ot.otDate ? ot.otDate.substring(0, 10) : "-"}{" "}
                      <span className="text-[#475569] dark:text-slate-500 font-sans">({getDayOfWeekKr(ot.otDate)})</span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">{ot.employeeNo}</td>
                    <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">{ot.employeeName}</td>
                    <td className="py-2 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">{ot.department}</td>
                    <td className="py-2 px-3 font-mono text-[#0f172a] dark:text-slate-300 whitespace-nowrap">
                      {ot.startTime} ~ {ot.endTime}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-[#b45309] dark:text-amber-400 whitespace-nowrap">
                      {formatErpNumber(ot.otHours)}h
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
            className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-md shadow-2xl dark:bg-slate-900 dark:border-slate-800"
          >
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 mb-4 pb-2 border-b border-[#b5a894] dark:border-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#1d4ed8]" />
              <span>연장근무(OT) 신청서 작성</span>
            </h2>

            <div className="space-y-3">
              {isAdmin && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">대상 사원</label>
                  <select
                    value={otForm.employeeId}
                    onChange={(e) => setOtForm({ ...otForm, employeeId: parseInt(e.target.value) })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department} - {emp.employeeNo})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">근무 일자</label>
                <input
                  type="date"
                  value={otForm.otDate}
                  onChange={(e) => setOtForm({ ...otForm, otDate: e.target.value })}
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">시작 시간</label>
                  <input
                    type="time"
                    value={otForm.startTime}
                    onChange={(e) => setOtForm({ ...otForm, startTime: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">종료 시간</label>
                  <input
                    type="time"
                    value={otForm.endTime}
                    onChange={(e) => setOtForm({ ...otForm, endTime: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">인정 시간 (h)</label>
                <input
                  type="number"
                  step="0.5"
                  value={otForm.otHours}
                  onChange={(e) => setOtForm({ ...otForm, otHours: parseFloat(e.target.value) || 0 })}
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">근무 사유 프리셋</label>
                <select
                  value={otForm.reason}
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
                상신 제출
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
