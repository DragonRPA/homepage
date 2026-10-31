"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, Calendar, RefreshCw, Download, Edit3, 
  RotateCcw, Search, Check, AlertCircle, Plus, ShieldCheck,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { 
  sortErpItems, 
  SortDirection, 
  formatErpNumber, 
  formatErpLeaveDays, 
  calculateAnnualLeaveEntitlement 
} from "@/lib/erpFormat";

interface EmployeeLeave {
  id: number;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  duty?: string;
  joinDate: string;
  leaveDate?: string | null;
  status?: string;
  employmentStatus?: string;
  grantDays: number;
  usedDays: number;
  remainDays: number;
}

export const LeaveManageTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const isAdmin =
    currentUser?.canSave !== undefined
      ? Boolean(currentUser.canSave)
      : currentUser?.role === "ADMIN" ||
        currentUser?.role === "SUPER_ADMIN" ||
        currentUser?.role === "MANAGER" ||
        currentUser?.loginId === "admin";

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

  // 회계연도(1월 1일 ~ 12월 31일) 기준 연차/근속연수(0년차, 1년차...) 산출
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

  // 연차관리 대상자 필터링 (대표이사, 외주 조직 직원, 퇴사자 제외)
  const eligibleEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. 퇴사자 제외
      const st = String(emp.status || emp.employmentStatus || "ACTIVE").trim().toUpperCase();
      if (st === "RETIRED" || st === "RESIGNED" || st === "퇴사" || st === "퇴직") return false;
      if (emp.leaveDate && String(emp.leaveDate).trim() !== "") return false;

      // 2. 대표이사 제외
      const pos = String(emp.position || "").trim();
      const duty = String(emp.duty || "").trim();
      if (pos.includes("대표이사") || pos === "대표" || duty.includes("대표이사") || duty === "대표") return false;

      // 3. 조직이 외주인 직원 제외
      const dept = String(emp.department || "").trim();
      if (dept.includes("외주")) return false;

      return true;
    });
  }, [employees]);

  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(eligibleEmployees.map((e) => e.department).filter(Boolean)));
  }, [eligibleEmployees]);

  // Filtered
  const filteredEmployees = useMemo(() => {
    return eligibleEmployees.filter((emp) => {
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
  }, [eligibleEmployees, deptFilter, searchQuery]);

  const sortedEmployees = useMemo(() => {
    return sortErpItems(filteredEmployees, sortKey, sortDir);
  }, [filteredEmployees, sortKey, sortDir]);

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
              전사 연차 관리 대장
            </span>
          </div>

          <div className="flex items-center gap-2">
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

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#475569] dark:text-slate-400" />
              <input
                type="text"
                placeholder="사원명 / 사번 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] pl-8 pr-3 py-1.5 rounded w-44 focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
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
            className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] text-xs font-bold rounded flex items-center gap-1.5 border border-[#b5a894] shadow transition dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleAnnualReset}
              className="px-3 py-1.5 bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>연 단위 연차 초기화/재계산</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-auto max-h-[calc(100vh-230px)] dark:bg-slate-900 dark:border-slate-800">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#dcd4c4] text-[#0f172a] uppercase tracking-wider font-semibold border-b border-[#b5a894] sticky top-0 z-10 select-none dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
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
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
              {sortedEmployees.map((emp) => {
                const grant = Number(emp.grantDays || 15);
                const used = Number(emp.usedDays || 0);
                const remain = Number(emp.remainDays ?? grant - used);
                const rate = grant > 0 ? Math.min(100, Math.round((used / grant) * 100)) : 0;
                const entitlement = calculateAnnualLeaveEntitlement(emp.joinDate);
                const tenure = entitlement.tenureYears;

                return (
                  <tr key={emp.id} className="hover:bg-[#ede6d6] dark:hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">{emp.employeeNo}</td>
                    <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">{emp.name}</td>
                    <td className="py-2 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">{emp.department}</td>
                    <td className="py-2 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                      {emp.position} {emp.duty ? `(${emp.duty})` : ""}
                    </td>
                    <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                      {emp.joinDate ? emp.joinDate.substring(0, 10) : "-"}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap" title={entitlement.formulaLabel}>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          tenure === 0
                            ? "bg-[#eff6ff] border-[#93c5fd] text-[#1d4ed8] dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300"
                            : "bg-[#dcd4c4] border-[#b5a894] text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
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
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-16 bg-[#dcd4c4] dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${rate > 80 ? "bg-[#dc2626]" : rate > 50 ? "bg-[#b45309]" : "bg-[#1d4ed8]"}`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-[#475569] dark:text-slate-400">{formatErpNumber(rate)}%</span>
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
                          className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
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
                    입사일: {selectedEmp.joinDate ? selectedEmp.joinDate.substring(0, 10) : "-"} ({ent.tenureYears}년차)
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
              <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">부여 연차 일수</label>
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
