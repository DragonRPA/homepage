"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  CreditCard, RefreshCw,
  Download, Check, AlertCircle, Lock, Upload,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { formatErpNumber, formatErpCurrency, formatErpInputNumber, toErpInputString, cleanErpNumber, sortErpItems } from "@/lib/erpFormat";
import { SortableTh, useErpTableSort } from "./SortableTh";
import type { OcrPayrollResult, PayrollRecord } from "./payroll/PayrollEditAndOcrModals";

export type { PayrollRecord } from "./payroll/PayrollEditAndOcrModals";

const PayrollEditAndOcrModals = dynamic(
  () =>
    import("./payroll/PayrollEditAndOcrModals").then(
      (m) => m.PayrollEditAndOcrModals
    ),
  { ssr: false }
);

export const PayrollTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";

  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const shiftMonth = (delta: number) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    if (!y || !m) return;
    const d = new Date(y, m - 1 + delta, 1);
    const nextY = d.getFullYear();
    const nextM = String(d.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${nextY}-${nextM}`);
  };
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState({
    count: 0,
    totalGrossSum: 0,
    totalDeductionSum: 0,
    netSalarySum: 0,
    totalServiceContractSum: 0,
    totalPersonalExpenseSum: 0,
  });
  const [loading, setLoading] = useState(false);

  // 용역 계약금액 인라인 수정 상태 관리 (employeeId -> 금액)
  const [editingServiceAmts, setEditingServiceAmts] = useState<Record<number, string>>({});
  const [savingServiceAmtId, setSavingServiceAmtId] = useState<number | null>(null);

  // Edit Single Modal (전체 급여 상세 수정용)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [inputBaseSalary, setInputBaseSalary] = useState("0");
  const [inputMealAllowance, setInputMealAllowance] = useState("0");
  const [inputVehicleAllowance, setInputVehicleAllowance] = useState("0");
  const [inputBonus, setInputBonus] = useState("0");
  const [inputPersonalExpense, setInputPersonalExpense] = useState("0");
  const [inputServiceAmount, setInputServiceAmount] = useState("0");

  // OCR Upload Modal
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrPayrollResult | null>(null);

  const openEditModal = (r: PayrollRecord) => {
    setEditingRecord(r);
    setInputBaseSalary(toErpInputString(r.baseSalary));
    setInputMealAllowance(toErpInputString(r.mealAllowance ?? 200000));
    setInputVehicleAllowance(toErpInputString(r.vehicleAllowance ?? 0));
    setInputBonus(toErpInputString(r.bonus));
    setInputPersonalExpense(toErpInputString(r.personalExpenseAmount ?? 0));
    setInputServiceAmount(toErpInputString(r.serviceContractAmount));
    setEditModalOpen(true);
  };

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sorting State (3단계: asc ➔ desc ➔ null 정렬안함)
  const { sortKey, sortDir, handleSort } = useErpTableSort("employeeNo", "asc");

  const renderSortTh = (
    label: string, 
    key: string, 
    align: "left" | "right" | "center" = "left", 
    extraClass: string = ""
  ) => (
    <SortableTh
      label={label}
      colKey={key}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={handleSort}
      align={align}
      className={`py-2 px-2.5 hover:bg-[#d0c6b4] dark:hover:bg-slate-700 ${extraClass} ${sortKey === key && sortDir !== null ? "text-[#1d4ed8] dark:text-blue-400 font-bold" : ""}`}
      iconClassName="w-3 h-3 text-blue-400"
    />
  );

  const sortedRecords = useMemo(() => {
    return sortErpItems(records, sortKey, sortDir);
  }, [records, sortKey, sortDir]);

  const fetchPayroll = async (targetMonth = selectedMonth) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/erp/payroll?yearMonth=${targetMonth}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "급여 대장 조회 실패");

      const recs: PayrollRecord[] = data.records || [];
      setRecords(recs);

      // 인라인 용역 계약금액 초기화
      const serviceMap: Record<number, string> = {};
      recs.forEach((r) => {
        serviceMap[r.id] = toErpInputString(r.serviceContractAmount);
      });
      setEditingServiceAmts(serviceMap);

      if (data.summary) setSummary(data.summary);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll(selectedMonth);
  }, [selectedMonth]);

  // 임직원 용역 계약금액 단독 인라인 저장
  const handleSaveServiceContractAmount = async (recordId: number) => {
    const rawVal = editingServiceAmts[recordId];
    const amount = cleanErpNumber(rawVal);
    try {
      setSavingServiceAmtId(recordId);
      const res = await fetch("/api/erp/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recordId,
          serviceContractAmount: amount,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "저장 실패");

      showToast("용역 계약금액이 저장되었습니다.");
      await fetchPayroll(selectedMonth);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSavingServiceAmtId(null);
    }
  };

  // 급여 자동 계산
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
      await fetchPayroll(selectedMonth);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // 전체 마감 상태 일괄 변경
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
      await fetchPayroll(selectedMonth);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 단건 상세 수정 저장
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      const res = await fetch("/api/erp/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRecord.id,
          baseSalary: cleanErpNumber(inputBaseSalary),
          mealAllowance: cleanErpNumber(inputMealAllowance),
          vehicleAllowance: cleanErpNumber(inputVehicleAllowance),
          bonus: cleanErpNumber(inputBonus),
          personalExpenseAmount: cleanErpNumber(inputPersonalExpense),
          serviceContractAmount: cleanErpNumber(inputServiceAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "수정 실패");

      showToast("급여 정보가 갱신되었습니다.");
      setEditModalOpen(false);
      setEditingRecord(null);
      await fetchPayroll(selectedMonth);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // OCR 파일 업로드 및 분석 요청
  const processOcrFile = async (file: File) => {
    setOcrFile(file);
    setOcrLoading(true);
    setOcrResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/erp/payroll/ocr", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "OCR 파싱 실패");

      setOcrResult(data);
      showToast(`${file.name} 분석이 완료되었습니다. (${data.employees?.length || 0}명 인식)`);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setOcrLoading(false);
    }
  };

  // OCR 결과에서 임직원 용역계약금액 인라인 수정 처리
  const handleOcrServiceAmountChange = (index: number, val: string) => {
    if (!ocrResult) return;
    const formatted = formatErpInputNumber(val);
    const updatedEmployees = [...ocrResult.employees];
    updatedEmployees[index] = {
      ...updatedEmployees[index],
      serviceContractAmount: cleanErpNumber(formatted),
    };
    setOcrResult({
      ...ocrResult,
      employees: updatedEmployees,
    });
  };

  // OCR 결과 일괄 DB 저장
  const handleSaveOcrPayroll = async () => {
    if (!ocrResult || !ocrResult.employees || ocrResult.employees.length === 0) return;

    try {
      setOcrLoading(true);
      const res = await fetch("/api/erp/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BATCH_SAVE",
          yearMonth: ocrResult.yearMonth || selectedMonth,
          payDate: ocrResult.payDate,
          pdfFileName: ocrResult.fileName,
          records: ocrResult.employees,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "저장 실패");

      showToast(data.message || "급여 대장이 성공적으로 저장되었습니다.");
      setOcrModalOpen(false);
      setOcrResult(null);
      setOcrFile(null);

      const targetYm = ocrResult.yearMonth || selectedMonth;
      if (targetYm !== selectedMonth) {
        setSelectedMonth(targetYm);
      }
      await fetchPayroll(targetYm);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setOcrLoading(false);
    }
  };

  // CSV 내보내기
  const handleExportCsv = () => {
    const headers = [
      "귀속월", "지급일자", "사번", "성명", "부서", "직급", "입사일", "퇴사일", "주휴일할",
      "용역계약금액", "기본급", "식대(비과세)", "차량보조금", "초과근무수당", "연차수당", "퇴직급여", "상여금", "개인경비정산", "총지급액",
      "국민연금", "건강보험", "고용보험", "장기요양보험료", "소득세", "지방소득세",
      "연말정산소득세", "연말정산지방세", "고용보험정산분", "총공제액", "차인지급액", "상태"
    ];
    const rows = records.map((r) => [
      r.yearMonth,
      r.payDate || "-",
      r.employeeNo,
      r.employeeName,
      r.department,
      r.position,
      r.joinDate ? String(r.joinDate).slice(0, 10) : "-",
      r.leaveDate ? String(r.leaveDate).slice(0, 10) : "-",
      r.wageProRataBadge || "만근",
      r.serviceContractAmount,
      r.baseSalary,
      r.mealAllowance,
      r.vehicleAllowance,
      r.otPay,
      r.annualLeaveAllowance,
      r.severancePay || 0,
      r.bonus,
      r.personalExpenseAmount || 0,
      r.totalGross,
      r.nationalPension,
      r.healthInsurance,
      r.employmentInsurance,
      r.longTermCareInsurance,
      r.incomeTax,
      r.localTax,
      r.yearEndIncomeTax,
      r.yearEndLocalTax,
      r.employmentInsuranceSettlement,
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
    link.setAttribute("download", `급여대장_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 은행 자동이체 등록용 엑셀(.xlsx) 생성 (A:입금은행, B:입금계좌번호, C:이체금액, D:받는사람)
  const handleExportBankTransferExcel = async () => {
    if (sortedRecords.length === 0) {
      showToast("다운로드할 급여 내역이 없습니다.", "error");
      return;
    }

    const XLSX = await import("xlsx");
    const sheetData: (string | number)[][] = [
      ["입금은행", "입금계좌번호", "이체금액", "받는사람"],
      ...sortedRecords
        .filter((r) => Number(r.netSalary || 0) > 0)
        .map((r) => [
          String(r.salaryBankName || "").trim(),
          String(r.salaryAccountNo || "").trim(),
          Math.round(Number(r.netSalary || 0)),
          String(r.salaryAccountHolder || r.employeeName || "")
            .replace(/\s+대표이사$/, "")
            .trim(),
        ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `급여자동이체_${selectedMonth}.xlsx`);
  };

  return (
    <div className="flex flex-col min-h-full md:h-full bg-[#ebe5d8] text-[#0f172a] md:overflow-hidden font-sans dark:bg-slate-950 dark:text-slate-100">
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
      <div className="p-2.5 md:p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <img
              src="/ci-dragonrpa.png"
              alt="주식회사 드래곤알피에이 CI"
              className="w-5 h-5 rounded bg-white border border-[#b5a894] p-0.5 object-contain shrink-0"
            />
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
              월별 임직원 급여 정산
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-1.5 bg-[#f4efe4] hover:bg-[#ebe5d8] text-[#334155] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700"
              title="이전 달"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            />
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-1.5 bg-[#f4efe4] hover:bg-[#ebe5d8] text-[#334155] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700"
              title="다음 달"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => fetchPayroll(selectedMonth)}
            disabled={loading}
            className="p-1.5 bg-[#f4efe4] hover:bg-[#ebe5d8] text-[#334155] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setOcrModalOpen(true)}
            className="px-2.5 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded flex items-center gap-1 shadow transition whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>PDF OCR 등록</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-2.5 py-1.5 bg-[#f4efe4] hover:bg-[#ebe5d8] text-[#0f172a] text-xs font-bold rounded flex items-center gap-1 border border-[#b5a894] shadow transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀</span>
          </button>

          <button
            onClick={handleExportBankTransferExcel}
            className="px-2.5 py-1.5 bg-[#f4efe4] hover:bg-[#ebe5d8] text-[#047857] text-xs font-bold rounded flex items-center gap-1 border border-[#059669] shadow transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-emerald-400 dark:border-emerald-600 whitespace-nowrap"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>자동이체 엑셀</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={handleAutoCalculate}
                className="px-2.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1 shadow transition whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>급여 자동 계산</span>
              </button>

              <button
                onClick={() => handleSetStatusAll("APPROVED")}
                className="px-2.5 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded flex items-center gap-1 shadow transition whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>전체 승인</span>
              </button>

              <button
                onClick={() => handleSetStatusAll("PAID")}
                className="px-2.5 py-1.5 bg-[#6b21a8] hover:bg-[#581c87] text-white text-xs font-bold rounded flex items-center gap-1 shadow transition whitespace-nowrap"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>지급 마감</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Gutenberg Z-Pattern Step 3 (Body / High-Density Grid) */}
      <div className="flex-1 md:overflow-auto p-2.5 md:p-3">
        <div className="bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded shadow-sm overflow-hidden md:h-full flex flex-col">
          {/* 모바일 전용 임직원 급여 명세 카드 (가로폭 100% 최적화) */}
          <div className="md:hidden divide-y divide-[#c4b6a0] dark:divide-slate-800">
            {sortedRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#475569]">
                {selectedMonth} 급여 대장이 생성되지 않았습니다.
              </div>
            ) : (
              sortedRecords.map((r) => (
                <div key={r.id} className="p-3 bg-[#f4efe4] dark:bg-slate-900 flex flex-col gap-2">
                  {/* 1행: 성명 + 부서/직급 + 상태/수정 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[#0f172a] dark:text-slate-100">
                        {r.employeeName}
                      </span>
                      <span className="text-[11px] text-[#475569] dark:text-slate-400">
                        ({r.department || "-"} · {r.position})
                      </span>
                      {r.wageProRataBadge && (
                        <span
                          title={r.wageProRataFormula || r.wageProRataBadge}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                            r.weeklyHolidayEligible
                              ? "bg-amber-100 text-amber-900 border-amber-400"
                              : "bg-slate-200 text-slate-800 border-slate-400"
                          }`}
                        >
                          {r.wageProRataBadge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : r.status === "APPROVED"
                            ? "bg-blue-100 text-blue-800 border border-blue-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {r.status === "PAID" ? "지급완료" : r.status === "APPROVED" ? "승인완료" : "작성중"}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => openEditModal(r)}
                          className="px-2 py-0.5 bg-[#ebe5d8] text-[#334155] rounded border border-[#b5a894] text-[10px] font-bold"
                        >
                          수정
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2행: 지급합계 / 공제합계 / 차인지급액 */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded bg-[#ebe5d8] border border-[#c4b6a0] text-[11px]">
                    <div>
                      <span className="block text-[10px] text-[#475569]">지급합계</span>
                      <span className="font-mono font-bold text-[#1d4ed8]">
                        {formatErpCurrency(r.totalGross)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#475569]">공제합계</span>
                      <span className="font-mono font-bold text-[#dc2626]">
                        {formatErpCurrency(r.totalDeduction)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#475569]">차인지급액</span>
                      <span className="font-mono font-extrabold text-[#047857]">
                        {formatErpCurrency(r.netSalary)}
                      </span>
                    </div>
                  </div>

                  {/* 3행: 세부 내역 요약 */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-[#475569]">
                    <span>기본급 {formatErpCurrency(r.baseSalary)}</span>
                    <span>식대 {formatErpCurrency(r.mealAllowance)}</span>
                    {r.vehicleAllowance > 0 && <span>차량 {formatErpCurrency(r.vehicleAllowance)}</span>}
                    {r.otPay > 0 && <span>초과근무 {formatErpCurrency(r.otPay)}</span>}
                    {r.annualLeaveAllowance > 0 && (
                      <span className="text-[#1d4ed8] font-bold">연차수당 {formatErpCurrency(r.annualLeaveAllowance)}</span>
                    )}
                    {Number(r.severancePay || 0) > 0 && (
                      <span className="text-[#6b21a8] font-bold">퇴직급여 {formatErpCurrency(r.severancePay || 0)}</span>
                    )}
                    {Number(r.personalExpenseAmount || 0) > 0 && (
                      <span className="text-[#047857] font-bold">개인경비 {formatErpCurrency(r.personalExpenseAmount || 0)}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PC 전용 고밀도 테이블 */}
          <div className="hidden md:block flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#e2dbcd] text-[#0f172a] uppercase tracking-wider font-semibold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  {/* 핵심 액션 컬럼 좌측 고정 (헌장 3.2조) */}
                  <th className="py-2 px-2.5 whitespace-nowrap text-center sticky left-0 bg-[#e2dbcd] z-20 border-r border-[#b5a894] dark:bg-slate-800 dark:border-slate-700">
                    관리
                  </th>
                  {renderSortTh("사번", "employeeNo")}
                  {renderSortTh("성명", "employeeName")}
                  {renderSortTh("입사/퇴사일", "joinDate", "center")}
                  {renderSortTh("부서", "department")}
                  {renderSortTh("직급/직책", "position")}

                  {/* 사용자 요청 추가 항목: 임직원 용역 계약금액 */}
                  <th className="py-2 px-2.5 text-right whitespace-nowrap bg-[#fef3c7] text-[#92400e] font-bold border-l-2 border-r-2 border-[#f59e0b] dark:bg-amber-950/40 dark:text-amber-300">
                    용역 계약금액 (별도입력)
                  </th>

                  {/* 기본급여 및 제수당 */}
                  {renderSortTh("기본급", "baseSalary", "right")}
                  {renderSortTh("식대", "mealAllowance", "right")}
                  {renderSortTh("차량보조금", "vehicleAllowance", "right")}
                  {renderSortTh("초과근무수당", "otPay", "right")}
                  {renderSortTh("연차수당", "annualLeaveAllowance", "right")}
                  {renderSortTh("퇴직급여", "severancePay", "right")}
                  {renderSortTh("상여금", "bonus", "right")}
                  {renderSortTh("개인경비 정산", "personalExpenseAmount", "right", "text-[#047857] font-bold bg-[#ecfdf5]/70 dark:text-emerald-300")}
                  {renderSortTh("지급합계", "totalGross", "right", "text-[#1d4ed8] font-bold bg-[#e2dbcd]/70 dark:text-blue-300 dark:bg-slate-800/90")}
                  <th className="py-2 px-2.5 text-right whitespace-nowrap bg-[#ecfdf5] text-[#065f46] font-bold border-l border-r border-[#10b981] dark:bg-emerald-950/40 dark:text-emerald-300">
                    순 용역 수익
                  </th>

                  {/* 공제 및 정산 항목 */}
                  {renderSortTh("국민연금", "nationalPension", "right")}
                  {renderSortTh("건강보험", "healthInsurance", "right")}
                  {renderSortTh("고용보험", "employmentInsurance", "right")}
                  {renderSortTh("장기요양", "longTermCareInsurance", "right")}
                  {renderSortTh("소득세", "incomeTax", "right")}
                  {renderSortTh("지방소득세", "localTax", "right")}
                  {renderSortTh("정산/환급액", "employmentInsuranceSettlement", "right")}
                  {renderSortTh("공제합계", "totalDeduction", "right", "text-[#dc2626] font-bold bg-[#e2dbcd]/70 dark:text-rose-300 dark:bg-slate-800/90")}

                  {/* 차인지급액 및 상태 */}
                  {renderSortTh("차인지급액", "netSalary", "right", "text-[#047857] font-bold bg-[#e2dbcd]/70 dark:text-emerald-400 dark:bg-slate-800/90")}
                  {renderSortTh("상태", "status", "center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] font-mono text-[11px] dark:divide-slate-800">
                {sortedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={23} className="py-16 text-center text-[#475569] font-sans text-xs dark:text-slate-500">
                      {selectedMonth} 급여 대장이 생성되지 않았습니다. 상단 &apos;급여대장 PDF OCR 등록&apos; 또는 &apos;급여 자동 계산&apos; 버튼을 클릭하세요.
                    </td>
                  </tr>
                ) : (
                  sortedRecords.map((r) => {
                    const settlementsSum = 
                      Number(r.yearEndIncomeTax || 0) + 
                      Number(r.yearEndLocalTax || 0) + 
                      Number(r.employmentInsuranceSettlement || 0) + 
                      Number(r.nationalPensionSettlement || 0) + 
                      Number(r.healthInsuranceSettlement || 0) + 
                      Number(r.longTermCareSettlement || 0) + 
                      Number(r.allowanceSettlement || 0) + 
                      Number(r.expenseSettlement || 0);

                    return (
                      <tr key={r.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/40 transition">
                        {/* 관리 버튼 컬럼 sticky left (헌장 3.2조) */}
                        <td className="py-1.5 px-2.5 text-center whitespace-nowrap font-sans sticky left-0 bg-[#f4efe4] dark:bg-slate-900 border-r border-[#b5a894] dark:border-slate-700">
                          {isAdmin && (
                            <button
                              onClick={() => openEditModal(r)}
                              className="px-2 py-0.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894] text-[10px] font-bold transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700"
                            >
                              수정
                            </button>
                          )}
                        </td>

                        <td className="py-1.5 px-2.5 text-[#475569] dark:text-slate-400 whitespace-nowrap font-sans font-medium">
                          {r.employeeNo}
                        </td>
                        <td className="py-1.5 px-2.5 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap font-sans">
                          {r.employeeName}
                        </td>
                        <td className="py-1.5 px-2.5 text-center text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 whitespace-nowrap">
                            <span>{r.joinDate ? String(r.joinDate).slice(0, 10) : "-"}</span>
                            {r.leaveDate && (
                              <span className="px-1 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-sans font-bold">
                                퇴사 {String(r.leaveDate).slice(0, 10)}
                              </span>
                            )}
                            {r.wageProRataBadge && (
                              <span
                                title={r.wageProRataFormula || r.wageProRataBadge}
                                className={`px-1 py-0.5 rounded text-[10px] font-sans font-bold border ${
                                  r.weeklyHolidayEligible
                                    ? "bg-amber-100 text-amber-900 border-amber-400"
                                    : "bg-slate-200 text-slate-800 border-slate-400"
                                }`}
                              >
                                {r.wageProRataBadge}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-1.5 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap font-sans">
                          {r.department || "-"}
                        </td>
                        <td className="py-1.5 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap font-sans">
                          {r.position} {r.duty ? `(${r.duty})` : ""}
                        </td>

                        {/* 사용자 요청 추가 항목: 임직원 용역 계약금액 인라인 입력창 */}
                        <td className="py-1 px-2 text-right whitespace-nowrap bg-[#fffbeb] border-l-2 border-r-2 border-[#f59e0b] dark:bg-amber-950/20">
                          <div className="flex items-center justify-end gap-1">
                            {r.serviceContractLabel && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-[#fef3c7] border border-[#f59e0b] text-[#92400e] text-[10px] font-sans font-bold"
                                title={`연결 용역계약: ${r.serviceContractLabel}`}
                              >
                                {r.serviceContractLabel}
                              </span>
                            )}
                            <span className="text-[#92400e] text-[10px] font-bold">₩</span>
                            <input
                              type="text"
                              value={editingServiceAmts[r.id] ?? toErpInputString(r.serviceContractAmount)}
                              onChange={(e) => {
                                const formatted = formatErpInputNumber(e.target.value);
                                setEditingServiceAmts((prev) => ({ ...prev, [r.id]: formatted }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveServiceContractAmount(r.id);
                                }
                              }}
                              className="w-28 text-right bg-white border border-[#d97706] rounded px-1.5 py-0.5 text-xs font-mono font-bold text-[#b45309] focus:outline-none focus:ring-1 focus:ring-[#b45309] dark:bg-slate-900 dark:border-amber-600 dark:text-amber-400"
                              placeholder="0"
                            />
                            <button
                              onClick={() => handleSaveServiceContractAmount(r.id)}
                              disabled={savingServiceAmtId === r.id}
                              className="px-1.5 py-0.5 bg-[#d97706] hover:bg-[#b45309] text-white text-[10px] font-bold rounded transition"
                              title="용역계약금액 저장"
                            >
                              {savingServiceAmtId === r.id ? "..." : "저장"}
                            </button>
                          </div>
                        </td>

                        {/* 기본급여 및 제수당 */}
                        <td className="py-1.5 px-2.5 text-right text-[#0f172a] dark:text-slate-300 whitespace-nowrap">
                          {formatErpCurrency(r.baseSalary)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {formatErpCurrency(r.mealAllowance)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {formatErpCurrency(r.vehicleAllowance)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#b45309] dark:text-amber-400 whitespace-nowrap">
                          {formatErpCurrency(r.otPay)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#0f172a] dark:text-slate-300 whitespace-nowrap">
                          {formatErpCurrency(r.annualLeaveAllowance)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#6b21a8] dark:text-purple-400 font-bold whitespace-nowrap">
                          {formatErpCurrency(r.severancePay || 0)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {formatErpCurrency(r.bonus)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-[#047857] bg-[#ecfdf5]/50 dark:text-emerald-300 dark:bg-emerald-950/20 whitespace-nowrap">
                          {formatErpCurrency(r.personalExpenseAmount || 0)}
                          {(r.expenseReceiptCount || 0) > 0 && (
                            <span className="ml-1 text-[9px] font-sans px-1 py-0.5 bg-[#d1fae5] text-[#047857] rounded border border-[#6ee7b7]">
                              {r.expenseReceiptCount}건
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-[#1d4ed8] bg-[#dbeafe]/40 dark:text-blue-300 dark:bg-blue-950/20 whitespace-nowrap">
                          {formatErpCurrency(r.totalGross)}
                        </td>
                        {(() => {
                          const netMargin = Number(r.serviceContractAmount || 0) - Number(r.totalGross || 0);
                          return (
                            <td
                              className={`py-1.5 px-2.5 text-right font-bold whitespace-nowrap border-l border-r border-[#10b981]/50 ${
                                netMargin > 0
                                  ? "text-[#047857] bg-[#ecfdf5]/60 dark:text-emerald-400 dark:bg-emerald-950/20"
                                  : netMargin < 0
                                  ? "text-[#dc2626] bg-[#fef2f2]/60 dark:text-rose-400 dark:bg-rose-950/20"
                                  : "text-[#64748b] bg-[#f8fafc] dark:text-slate-400"
                              }`}
                            >
                              {netMargin > 0 ? `+${formatErpCurrency(netMargin)}` : formatErpCurrency(netMargin)}
                            </td>
                          );
                        })()}

                        {/* 공제 및 정산 항목 */}
                        <td className="py-1.5 px-2.5 text-right text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {formatErpCurrency(r.nationalPension)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {formatErpCurrency(r.healthInsurance)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {formatErpCurrency(r.employmentInsurance)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {formatErpCurrency(r.longTermCareInsurance)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {formatErpCurrency(r.incomeTax)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {formatErpCurrency(r.localTax)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {settlementsSum !== 0 ? (
                            <span className={settlementsSum < 0 ? "text-[#0284c7] font-bold" : "text-[#dc2626]"}>
                              {formatErpCurrency(settlementsSum)}
                            </span>
                          ) : (
                            "0"
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-[#dc2626] bg-[#fee2e2]/40 dark:text-rose-300 dark:bg-rose-950/20 whitespace-nowrap">
                          {formatErpCurrency(r.totalDeduction)}
                        </td>

                        {/* 차인지급액 및 상태 */}
                        <td className="py-1.5 px-2.5 text-right font-bold text-[#047857] bg-[#d1fae5]/40 dark:text-emerald-400 dark:bg-emerald-950/20 whitespace-nowrap text-xs">
                          {formatErpCurrency(r.netSalary)}
                        </td>
                        <td className="py-1.5 px-2.5 text-center whitespace-nowrap font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === "DRAFT"
                                ? "bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                : r.status === "APPROVED"
                                ? "bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                                : "bg-[#f3e8ff] text-[#6b21a8] border border-[#d8b4fe] dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30"
                            }`}
                          >
                            {r.status === "DRAFT" ? "작성중" : r.status === "APPROVED" ? "승인됨" : "지급완료"}
                          </span>
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

      {/* 3. Gutenberg Z-Pattern Step 4 (Terminal Action & 종단 대차대조식 무결성 검증 - 헌장 3.5, 5.5조) */}
      <div className="p-3 bg-[#e2dbcd] border-t border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* 용역 수지 차액 (Income - Outcome = Net Margin) */}
          {(() => {
            const netServiceMargin = Number(summary.totalServiceContractSum || 0) - Number(summary.totalGrossSum || 0);
            return (
              <div className="flex items-center gap-2 bg-[#fffbeb] px-2.5 py-1 rounded border border-[#f59e0b] dark:bg-amber-950/40 whitespace-nowrap">
                <span>
                  <span className="text-[#92400e] dark:text-amber-400 font-bold">💼 용역계약총액: </span>
                  <span className="font-bold text-[#b45309] dark:text-amber-300">{formatErpCurrency(summary.totalServiceContractSum)}</span>
                </span>
                <span className="text-[#92400e] font-bold">-</span>
                <span>
                  <span className="text-[#475569] dark:text-slate-400 font-bold">총지급액: </span>
                  <span className="font-bold text-[#1d4ed8] dark:text-blue-400">{formatErpCurrency(summary.totalGrossSum)}</span>
                </span>
                <span className="text-[#92400e] font-bold">=</span>
                <span
                  className={`px-1.5 py-0.5 rounded font-bold border ${
                    netServiceMargin >= 0
                      ? "bg-[#ecfdf5] text-[#047857] border-[#10b981] dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-[#fef2f2] text-[#dc2626] border-[#ef4444] dark:bg-rose-950/60 dark:text-rose-300"
                  }`}
                >
                  순 용역 수익: {netServiceMargin > 0 ? `+${formatErpCurrency(netServiceMargin)}` : formatErpCurrency(netServiceMargin)}
                </span>
              </div>
            );
          })()}

          <div className="flex items-center gap-1.5 bg-[#ecfdf5] px-2.5 py-1 rounded border border-[#10b981] dark:bg-emerald-950/40 whitespace-nowrap">
            <span className="text-[#047857] dark:text-emerald-400 font-bold">🧾 개인경비총액: </span>
            <span className="font-bold text-[#047857] dark:text-emerald-300">{formatErpCurrency(summary.totalPersonalExpenseSum || 0)}</span>
          </div>

          <span className="text-[#94a3b8] dark:text-slate-600">|</span>

          <div className="whitespace-nowrap">
            <span className="text-[#475569] dark:text-slate-400">📄 총지급액: </span>
            <span className="font-bold text-[#1d4ed8] dark:text-blue-400">{formatErpCurrency(summary.totalGrossSum)}</span>
          </div>
          <span className="text-[#94a3b8] dark:text-slate-600">=</span>
          <div className="whitespace-nowrap">
            <span className="text-[#475569] dark:text-slate-400">🛡️ 총공제액: </span>
            <span className="font-bold text-[#dc2626] dark:text-rose-400">{formatErpCurrency(summary.totalDeductionSum)}</span>
          </div>
          <span className="text-[#94a3b8] dark:text-slate-600">+</span>
          <div className="whitespace-nowrap">
            <span className="text-[#475569] dark:text-slate-400">💳 실지급총액: </span>
            <span className="font-bold text-[#047857] dark:text-emerald-400">{formatErpCurrency(summary.netSalarySum)}</span>
          </div>
          <span className="text-[#94a3b8] dark:text-slate-600">|</span>
          <div className="flex items-center gap-1 font-bold text-[#0f172a] dark:text-slate-300 whitespace-nowrap">
            <span>⚖️ 수지 차액:</span>
            <span className="text-[#047857] dark:text-emerald-400">
              {formatErpCurrency(Math.abs(summary.totalGrossSum - (summary.totalDeductionSum + summary.netSalarySum)))} (1원도 틀림없이 보존)
            </span>
          </div>
        </div>

        <div className="text-xs text-[#475569] dark:text-slate-400">
          대상 사원: <span className="text-[#0f172a] dark:text-slate-100 font-bold font-mono">{formatErpNumber(summary.count)}명</span>
        </div>
      </div>

      {/* OCR PDF Upload Modal & Edit Salary Modal (Lazy) */}
      {(ocrModalOpen || (editModalOpen && !!editingRecord)) && (
        <PayrollEditAndOcrModals
          ocrModalOpen={ocrModalOpen}
          ocrLoading={ocrLoading}
          ocrFile={ocrFile}
          ocrResult={ocrResult}
          onCloseOcrModal={() => {
            setOcrModalOpen(false);
            setOcrResult(null);
            setOcrFile(null);
          }}
          onProcessOcrFile={processOcrFile}
          onOcrServiceAmountChange={handleOcrServiceAmountChange}
          onSaveOcrPayroll={handleSaveOcrPayroll}
          editModalOpen={editModalOpen}
          editingRecord={editingRecord}
          inputServiceAmount={inputServiceAmount}
          setInputServiceAmount={setInputServiceAmount}
          inputBaseSalary={inputBaseSalary}
          setInputBaseSalary={setInputBaseSalary}
          inputMealAllowance={inputMealAllowance}
          setInputMealAllowance={setInputMealAllowance}
          inputVehicleAllowance={inputVehicleAllowance}
          setInputVehicleAllowance={setInputVehicleAllowance}
          inputBonus={inputBonus}
          setInputBonus={setInputBonus}
          inputPersonalExpense={inputPersonalExpense}
          setInputPersonalExpense={setInputPersonalExpense}
          onCloseEditModal={() => setEditModalOpen(false)}
          onSaveEdit={handleSaveEdit}
        />
      )}
    </div>
  );
};
