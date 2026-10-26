"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, Calendar, RefreshCw, Download, Edit3, 
  RotateCcw, Search, Check, AlertCircle, Plus, ShieldCheck,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { sortErpItems, SortDirection, formatErpNumber } from "@/lib/erpFormat";

interface EmployeeLeave {
  id: number;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  duty?: string;
  joinDate: string;
  grantDays: number;
  usedDays: number;
  remainDays: number;
}

export const LeaveManageTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";

  const [employees, setEmployees] = useState<EmployeeLeave[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeLeave | null>(null);
  const [newGrantDays, setNewGrantDays] = useState<number>(15);

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/employees");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "사원 목록 조회 실패");

      setEmployees(data.employees || []);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Calculate tenure years
  const getTenureYears = (joinDateStr?: string) => {
    if (!joinDateStr) return 0;
    const join = new Date(joinDateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - join.getTime());
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
    return diffYears;
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

  const renderSortTh = (label: string, colKey: string, align: "left" | "right" | "center" = "left") => (
    <th
      onClick={() => handleSort(colKey)}
      className={`py-2.5 px-3 whitespace-nowrap cursor-pointer select-none hover:bg-slate-700/60 transition ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      }`}
    >
      <div className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
        <span>{label}</span>
        {sortKey === colKey ? (
          sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
        )}
      </div>
    </th>
  );

  // Filtered
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (deptFilter !== "ALL" && emp.department !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.employeeNo.toLowerCase().includes(q) ||
          (emp.duty || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, deptFilter, searchQuery]);

  const sortedEmployees = useMemo(() => {
    return sortErpItems(filteredEmployees, sortKey, sortDir);
  }, [filteredEmployees, sortKey, sortDir]);

  // Annual Reset & Recalculate
  const handleAnnualReset = async () => {
    if (!confirm("전 사원의 연차를 회계연도 기준(기본 15일 + 홀수년차 가산)으로 일괄 재계산 초기화하시겠습니까?")) return;
    try {
      setLoading(true);
      const res = await fetch("/api/erp/employees/reset-leave", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "연차 재계산 실패");

      showToast("전 사원 연차 재계산이 완료되었습니다.");
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
    const headers = ["사번", "성명", "부서", "직급", "입사일", "근속연수", "부여연차", "사용연차", "잔여연차"];
    const rows = filteredEmployees.map((e) => [
      e.employeeNo,
      e.name,
      e.department,
      e.position,
      e.joinDate ? e.joinDate.substring(0, 10) : "-",
      `${getTenureYears(e.joinDate)}년`,
      e.grantDays,
      e.usedDays,
      e.remainDays,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `연차관리대장_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-200">
              전사 연차 관리 대장
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">전체 부서</option>
              <option value="경영총괄">경영총괄</option>
              <option value="기술개발부">기술개발부</option>
              <option value="영업관리부">영업관리부</option>
              <option value="고객지원부">고객지원부</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="사원명 / 사번 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded w-44 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded flex items-center gap-1.5 border border-slate-700 shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleAnnualReset}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>연 단위 연차 초기화/재계산</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-slate-900 border border-slate-800 rounded shadow-sm overflow-auto max-h-[calc(100vh-230px)]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-700 sticky top-0 z-10 select-none">
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
                {renderSortTh("소진율", "usedDays", "center")}
                <th className="py-2.5 px-3 whitespace-nowrap text-center">조정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedEmployees.map((emp) => {
                const grant = Number(emp.grantDays || 15);
                const used = Number(emp.usedDays || 0);
                const remain = Number(emp.remainDays || (grant - used));
                const rate = grant > 0 ? Math.min(100, Math.round((used / grant) * 100)) : 0;
                const tenure = getTenureYears(emp.joinDate);

                return (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">{emp.employeeNo}</td>
                    <td className="py-2 px-3 font-bold text-slate-100 whitespace-nowrap">{emp.name}</td>
                    <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{emp.department}</td>
                    <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                      {emp.position} {emp.duty ? `(${emp.duty})` : ""}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">
                      {emp.joinDate ? emp.joinDate.substring(0, 10) : "-"}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                        {tenure}년차
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-400 whitespace-nowrap">
                      {formatErpNumber(grant)}일
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                      {formatErpNumber(used)}일
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {formatErpNumber(remain)}일
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${rate > 80 ? "bg-rose-500" : rate > 50 ? "bg-amber-500" : "bg-blue-500"}`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">{formatErpNumber(rate)}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setSelectedEmp(emp);
                            setNewGrantDays(emp.grantDays);
                            setAdjustModalOpen(true);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px] transition"
                        >
                          부여 조정
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-sm shadow-2xl">
            <h2 className="text-sm font-bold text-slate-100 mb-2 pb-2 border-b border-slate-800">
              연차 부여일수 직접 조정 ({selectedEmp.name})
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              입사일: {selectedEmp.joinDate ? selectedEmp.joinDate.substring(0, 10) : "-"} (근속 {getTenureYears(selectedEmp.joinDate)}년차)
            </p>

            <div className="flex flex-col gap-1 mb-4">
              <label className="text-xs text-slate-400 font-semibold">부여 연차 일수</label>
              <input
                type="number"
                step="0.5"
                value={newGrantDays}
                onChange={(e) => setNewGrantDays(parseFloat(e.target.value) || 0)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500 font-mono text-center text-base"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700"
              >
                취소
              </button>
              <button
                onClick={handleSaveAdjustment}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded"
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
