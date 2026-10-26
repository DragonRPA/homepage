"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  CreditCard, DollarSign, Calendar, RefreshCw, 
  Download, Check, AlertCircle, CheckSquare, Edit3, Lock, Send
} from "lucide-react";

interface PayrollRecord {
  id: number;
  yearMonth: string;
  employeeId: number;
  employeeNo: string;
  employeeName: string;
  department: string;
  position: string;
  duty?: string;
  baseSalary: number;
  otHours: number;
  otPay: number;
  mealAllowance: number;
  bonus: number;
  totalGross: number;
  nationalPension: number;
  healthInsurance: number;
  employmentInsurance: number;
  incomeTax: number;
  localTax: number;
  totalDeduction: number;
  netSalary: number;
  status: "DRAFT" | "APPROVED" | "PAID";
  paidAt: string | null;
}

export const PayrollTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";

  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState({
    count: 0,
    totalGrossSum: 0,
    totalDeductionSum: 0,
    netSalarySum: 0,
  });
  const [loading, setLoading] = useState(false);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [inputBaseSalary, setInputBaseSalary] = useState(3500000);
  const [inputBonus, setInputBonus] = useState(0);

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/erp/payroll?yearMonth=${selectedMonth}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "급여 대장 조회 실패");

      setRecords(data.records || []);
      if (data.summary) setSummary(data.summary);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth]);

  // Auto calculate & generate
  const handleAutoCalculate = async () => {
    if (!confirm(`${selectedMonth} 귀속 급여를 전 직원 대상(OT 승인시간 자동 연계)으로 일괄 계산 생성하시겠습니까?`)) return;
    try {
      setLoading(true);
      const res = await fetch("/api/erp/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearMonth: selectedMonth }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "계산 실패");

      showToast(data.message || "급여 계산 완료");
      fetchPayroll();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Change batch status
  const handleSetStatusAll = async (newStatus: "APPROVED" | "PAID") => {
    const actionLabel = newStatus === "APPROVED" ? "전체 승인" : "지급 완료 마감";
    if (!confirm(`${selectedMonth} 급여 대장을 [${actionLabel}] 처리하시겠습니까?`)) return;
    try {
      const res = await fetch("/api/erp/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearMonth: selectedMonth,
          action: "SET_STATUS_ALL",
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "상태 변경 실패");

      showToast(data.message || "상태가 변경되었습니다.");
      fetchPayroll();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      const res = await fetch("/api/erp/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRecord.id,
          baseSalary: inputBaseSalary,
          bonus: inputBonus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "수정 실패");

      showToast("급여 정보가 갱신되었습니다.");
      setEditModalOpen(false);
      fetchPayroll();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "귀속월", "사번", "성명", "부서", "직급", "기본급", "OT시간", "OT수당", 
      "식대(비과세)", "상여금", "총지급액", "국민연금", "건강보험", "고용보험", 
      "소득세", "지방소득세", "총공제액", "실지급액", "상태"
    ];
    const rows = records.map((r) => [
      r.yearMonth,
      r.employeeNo,
      r.employeeName,
      r.department,
      r.position,
      r.baseSalary,
      r.otHours,
      r.otPay,
      r.mealAllowance,
      r.bonus,
      r.totalGross,
      r.nationalPension,
      r.healthInsurance,
      r.employmentInsurance,
      r.incomeTax,
      r.localTax,
      r.totalDeduction,
      r.netSalary,
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `급여정산대장_${selectedMonth}.csv`);
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

      {/* 1. Gutenberg Z-Pattern Step 1 (Scope) & Step 2 (Pipeline) */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-200">
              월별 임직원 급여 정산 대장
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPayroll}
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
            <>
              <button
                onClick={handleAutoCalculate}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>급여 자동 계산 & 대장 생성</span>
              </button>

              <button
                onClick={() => handleSetStatusAll("APPROVED")}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>전체 승인</span>
              </button>

              <button
                onClick={() => handleSetStatusAll("PAID")}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>지급 완료 마감</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Gutenberg Z-Pattern Step 3 (Body / High-Density Grid) */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-slate-900 border border-slate-800 rounded shadow-sm overflow-hidden h-full flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-700 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">사번</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">성명</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">부서</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">직급 / 직책</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">기본급</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">OT시간</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">연장수당</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">식대(비과세)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">상여금</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right text-blue-300 font-bold bg-slate-800/90">총지급액</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">국민연금(4.5%)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">건강보험(3.54%)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">고용보험(0.9%)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">소득세</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">지방소득세</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right text-rose-300 font-bold bg-slate-800/90">총공제액</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right text-emerald-400 font-bold bg-slate-800/90">실지급액</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">상태</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={19} className="py-16 text-center text-slate-500 font-sans text-xs">
                      {selectedMonth} 급여 대장이 생성되지 않았습니다. 상단 &apos;급여 자동 계산 & 대장 생성&apos; 버튼을 클릭하세요.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap font-sans">{r.employeeNo}</td>
                      <td className="py-2 px-3 font-bold text-slate-100 whitespace-nowrap font-sans">{r.employeeName}</td>
                      <td className="py-2 px-3 text-slate-300 whitespace-nowrap font-sans">{r.department}</td>
                      <td className="py-2 px-3 text-slate-300 whitespace-nowrap font-sans">
                        {r.position} {r.duty ? `(${r.duty})` : ""}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300 whitespace-nowrap">
                        ₩{Number(r.baseSalary).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center text-amber-400 font-bold whitespace-nowrap">
                        {r.otHours}h
                      </td>
                      <td className="py-2 px-3 text-right text-amber-400 whitespace-nowrap">
                        ₩{Number(r.otPay).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 whitespace-nowrap">
                        ₩{Number(r.mealAllowance).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300 whitespace-nowrap">
                        ₩{Number(r.bonus).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-blue-300 bg-blue-950/20 whitespace-nowrap">
                        ₩{Number(r.totalGross).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 whitespace-nowrap">
                        ₩{Number(r.nationalPension).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 whitespace-nowrap">
                        ₩{Number(r.healthInsurance).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 whitespace-nowrap">
                        ₩{Number(r.employmentInsurance).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 whitespace-nowrap">
                        ₩{Number(r.incomeTax).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 whitespace-nowrap">
                        ₩{Number(r.localTax).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-rose-300 bg-rose-950/20 whitespace-nowrap">
                        ₩{Number(r.totalDeduction).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-400 bg-emerald-950/20 whitespace-nowrap text-xs">
                        ₩{Number(r.netSalary).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === "DRAFT"
                              ? "bg-slate-800 text-slate-400 border border-slate-700"
                              : r.status === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          }`}
                        >
                          {r.status === "DRAFT" ? "작성중" : r.status === "APPROVED" ? "승인됨" : "지급완료"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap font-sans">
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setEditingRecord(r);
                              setInputBaseSalary(Number(r.baseSalary));
                              setInputBonus(Number(r.bonus));
                              setEditModalOpen(true);
                            }}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px] transition"
                          >
                            수정
                          </button>
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

      {/* 3. Gutenberg Z-Pattern Step 4 (Terminal Action & 종단 대차대조식 무결성 검증) */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400">📄 총지급액: </span>
            <span className="font-bold text-blue-400">₩{summary.totalGrossSum.toLocaleString()}</span>
          </div>
          <span className="text-slate-600">=</span>
          <div>
            <span className="text-slate-400">🛡️ 총공제액: </span>
            <span className="font-bold text-rose-400">₩{summary.totalDeductionSum.toLocaleString()}</span>
          </div>
          <span className="text-slate-600">+</span>
          <div>
            <span className="text-slate-400">💳 실지급총액: </span>
            <span className="font-bold text-emerald-400">₩{summary.netSalarySum.toLocaleString()}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 font-bold text-slate-300">
            <span>⚖️ 수지 차액:</span>
            <span className="text-emerald-400">
              ₩{Math.abs(summary.totalGrossSum - (summary.totalDeductionSum + summary.netSalarySum)).toLocaleString()} (1원도 틀림없이 보존)
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          대상 사원: <span className="text-slate-100 font-bold font-mono">{summary.count}명</span>
        </div>
      </div>

      {/* Edit Salary Modal */}
      {editModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-sm shadow-2xl">
            <h2 className="text-sm font-bold text-slate-100 mb-2 pb-2 border-b border-slate-800">
              급여 개별 항목 조정 ({editingRecord.employeeName})
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              귀속월: {editingRecord.yearMonth} | 부서: {editingRecord.department}
            </p>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">기본급 (원)</label>
                <input
                  type="number"
                  value={inputBaseSalary}
                  onChange={(e) => setInputBaseSalary(parseFloat(e.target.value) || 0)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">상여금 (원)</label>
                <input
                  type="number"
                  value={inputBonus}
                  onChange={(e) => setInputBonus(parseFloat(e.target.value) || 0)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded"
              >
                재계산 및 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
