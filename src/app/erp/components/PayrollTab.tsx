"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  CreditCard, DollarSign, Calendar, RefreshCw, 
  Download, Check, AlertCircle, Edit3, Lock, Upload,
  ArrowUpDown, ArrowUp, ArrowDown, FileText, X, Save
} from "lucide-react";
import { 
  formatErpNumber, 
  formatErpCurrency, 
  formatErpInputNumber,
  toErpInputString,
  cleanErpNumber,
  sortErpItems, 
  SortDirection 
} from "@/lib/erpFormat";

export interface PayrollRecord {
  id: number;
  yearMonth: string;
  payDate: string | null;
  employeeId: number;
  employeeNo: string;
  employeeName: string;
  department: string;
  position: string;
  duty?: string;
  joinDate?: string | null;
  salaryBankName?: string | null;
  salaryAccountNo?: string | null;
  salaryAccountHolder?: string | null;

  // 사용자 요청 항목: 임직원 용역 계약금액
  serviceContractAmount: number;

  // 기본급여 및 제수당
  baseSalary: number;
  mealAllowance: number;
  vehicleAllowance: number;
  otHours: number;
  otPay: number;
  annualLeaveAllowance: number;
  bonus: number;
  totalGross: number;

  // 공제 및 정산 항목
  nationalPension: number;
  healthInsurance: number;
  employmentInsurance: number;
  longTermCareInsurance: number;
  incomeTax: number;
  localTax: number;
  yearEndIncomeTax: number;
  yearEndLocalTax: number;
  nationalPensionSettlement: number;
  healthInsuranceSettlement: number;
  longTermCareSettlement: number;
  allowanceSettlement: number;
  expenseSettlement: number;
  employmentInsuranceSettlement: number;
  totalDeduction: number;

  // 차인지급액 및 상태
  netSalary: number;
  status: "DRAFT" | "APPROVED" | "PAID";
  paidAt: string | null;
  pdfFileName?: string | null;
  pdfFileUrl?: string | null;
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
    totalServiceContractSum: 0,
  });
  const [loading, setLoading] = useState(false);

  // 용역 계약금액 인라인 수정 상태 관리 (employeeId -> 금액)
  const [editingServiceAmts, setEditingServiceAmts] = useState<Record<number, string>>({});
  const [savingServiceAmtId, setSavingServiceAmtId] = useState<number | null>(null);

  // Edit Single Modal (전체 급여 상세 수정용)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [inputBaseSalary, setInputBaseSalary] = useState("0");
  const [inputBonus, setInputBonus] = useState("0");
  const [inputServiceAmount, setInputServiceAmount] = useState("0");

  // OCR Upload Modal
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<{
    fileName: string;
    yearMonth: string;
    payDate: string;
    companyName: string;
    employees: any[];
    summary: any;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sorting State
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

  const renderSortTh = (
    label: string, 
    key: string, 
    align: "left" | "right" | "center" = "left", 
    extraClass: string = ""
  ) => {
    const isActive = sortKey === key;
    return (
      <th
        onClick={() => handleSort(key)}
        className={`py-2 px-2.5 cursor-pointer select-none hover:bg-[#d0c6b4] dark:hover:bg-slate-700 transition text-${align} whitespace-nowrap ${extraClass} ${isActive ? "text-[#1d4ed8] dark:text-blue-400 font-bold" : ""}`}
        title={`${label} 기준 정렬`}
      >
        <div className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start"}`}>
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
            ) : (
              <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const sortedRecords = useMemo(() => {
    return sortErpItems(records, sortKey, sortDir);
  }, [records, sortKey, sortDir]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/erp/payroll?yearMonth=${selectedMonth}`);
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
    fetchPayroll();
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
      fetchPayroll();
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
      fetchPayroll();
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
      fetchPayroll();
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
          bonus: cleanErpNumber(inputBonus),
          serviceContractAmount: cleanErpNumber(inputServiceAmount),
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

  // OCR 파일 업로드 및 분석 요청
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processOcrFile(file);
  };

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

      if (ocrResult.yearMonth) {
        setSelectedMonth(ocrResult.yearMonth);
      } else {
        fetchPayroll();
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setOcrLoading(false);
    }
  };

  // CSV 내보내기
  const handleExportCsv = () => {
    const headers = [
      "귀속월", "지급일자", "사번", "성명", "부서", "직급", "입사일",
      "용역계약금액", "기본급", "식대(비과세)", "차량보조금", "초과근무수당", "연차수당", "상여금", "총지급액",
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
      r.serviceContractAmount,
      r.baseSalary,
      r.mealAllowance,
      r.vehicleAllowance,
      r.otPay,
      r.annualLeaveAllowance,
      r.bonus,
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

  return (
    <div className="flex flex-col h-full bg-[#ebe5d8] text-[#0f172a] overflow-hidden font-sans dark:bg-slate-950 dark:text-slate-100">
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
      <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#1d4ed8]" />
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
              월별 임직원 급여 정산 대장
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPayroll}
            disabled={loading}
            className="p-1.5 bg-[#f4efe4] hover:bg-[#ebe5d8] text-[#334155] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setOcrModalOpen(true)}
            className="px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>급여대장 PDF OCR 등록</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#f4efe4] hover:bg-[#ebe5d8] text-[#0f172a] text-xs font-bold rounded flex items-center gap-1.5 border border-[#b5a894] shadow transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={handleAutoCalculate}
                className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>급여 자동 계산 & 대장 생성</span>
              </button>

              <button
                onClick={() => handleSetStatusAll("APPROVED")}
                className="px-3 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>전체 승인</span>
              </button>

              <button
                onClick={() => handleSetStatusAll("PAID")}
                className="px-3 py-1.5 bg-[#6b21a8] hover:bg-[#581c87] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition whitespace-nowrap"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>지급 완료 마감</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Gutenberg Z-Pattern Step 3 (Body / High-Density Grid) */}
      <div className="flex-1 overflow-auto p-3">
        <div className="bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded shadow-sm overflow-hidden h-full flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#e2dbcd] text-[#0f172a] uppercase tracking-wider font-semibold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  {/* 핵심 액션 컬럼 좌측 고정 (헌장 3.2조) */}
                  <th className="py-2 px-2.5 whitespace-nowrap text-center sticky left-0 bg-[#e2dbcd] z-20 border-r border-[#b5a894] dark:bg-slate-800 dark:border-slate-700">
                    관리
                  </th>
                  {renderSortTh("사번", "employeeNo")}
                  {renderSortTh("성명", "employeeName")}
                  {renderSortTh("입사일", "joinDate", "center")}
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
                  {renderSortTh("상여금", "bonus", "right")}
                  {renderSortTh("지급합계", "totalGross", "right", "text-[#1d4ed8] font-bold bg-[#e2dbcd]/70 dark:text-blue-300 dark:bg-slate-800/90")}

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
                    <td colSpan={22} className="py-16 text-center text-[#475569] font-sans text-xs dark:text-slate-500">
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
                              onClick={() => {
                                setEditingRecord(r);
                                setInputBaseSalary(toErpInputString(r.baseSalary));
                                setInputBonus(toErpInputString(r.bonus));
                                setInputServiceAmount(toErpInputString(r.serviceContractAmount));
                                setEditModalOpen(true);
                              }}
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
                          {r.joinDate ? String(r.joinDate).slice(0, 10) : "-"}
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
                        <td className="py-1.5 px-2.5 text-right text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {formatErpCurrency(r.bonus)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-[#1d4ed8] bg-[#dbeafe]/40 dark:text-blue-300 dark:bg-blue-950/20 whitespace-nowrap">
                          {formatErpCurrency(r.totalGross)}
                        </td>

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
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-[#fef3c7] px-2.5 py-1 rounded border border-[#f59e0b] dark:bg-amber-950/40">
            <span className="text-[#92400e] dark:text-amber-400 font-bold">💼 용역계약총액: </span>
            <span className="font-bold text-[#b45309] dark:text-amber-300">{formatErpCurrency(summary.totalServiceContractSum)}</span>
          </div>

          <span className="text-[#94a3b8] dark:text-slate-600">|</span>

          <div>
            <span className="text-[#475569] dark:text-slate-400">📄 총지급액: </span>
            <span className="font-bold text-[#1d4ed8] dark:text-blue-400">{formatErpCurrency(summary.totalGrossSum)}</span>
          </div>
          <span className="text-[#94a3b8] dark:text-slate-600">=</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">🛡️ 총공제액: </span>
            <span className="font-bold text-[#dc2626] dark:text-rose-400">{formatErpCurrency(summary.totalDeductionSum)}</span>
          </div>
          <span className="text-[#94a3b8] dark:text-slate-600">+</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">💳 실지급총액: </span>
            <span className="font-bold text-[#047857] dark:text-emerald-400">{formatErpCurrency(summary.netSalarySum)}</span>
          </div>
          <span className="text-[#94a3b8] dark:text-slate-600">|</span>
          <div className="flex items-center gap-1 font-bold text-[#0f172a] dark:text-slate-300">
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

      {/* OCR PDF Upload Modal */}
      {ocrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded-lg p-5 w-full max-w-4xl shadow-2xl text-[#0f172a] dark:text-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#0284c7]" />
                <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100">
                  월별 급여대장 PDF 파일 OCR 등록
                </h2>
              </div>
              <button
                onClick={() => {
                  setOcrModalOpen(false);
                  setOcrResult(null);
                  setOcrFile(null);
                }}
                className="p-1 hover:bg-[#ebe5d8] rounded dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4 text-[#475569]" />
              </button>
            </div>

            <div className="flex-1 overflow-auto py-4 space-y-4">
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) processOcrFile(file);
                }}
                className="border-2 border-dashed border-[#b5a894] hover:border-[#0284c7] bg-[#ebe5d8]/50 rounded-lg p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 dark:bg-slate-800/40 dark:border-slate-700"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,image/*"
                  className="hidden"
                />
                <FileText className="w-8 h-8 text-[#0284c7]" />
                <p className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
                  {ocrFile ? ocrFile.name : "급여대장 PDF 파일을 마우스로 끌어다 놓거나 클릭하여 선택하세요."}
                </p>
                <p className="text-[11px] text-[#475569] dark:text-slate-400">
                  (주)드래곤알피에이 월별 급여대장 PDF 지원 (자동 표 구조 해석 및 직원별 항목 추출)
                </p>
              </div>

              {ocrLoading && (
                <div className="py-8 text-center text-xs text-[#0284c7] font-bold flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>급여대장 서식 정밀 OCR 분석 중... 잠시만 기다려주세요.</span>
                </div>
              )}

              {/* OCR Result Preview */}
              {ocrResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs bg-[#e2dbcd] p-2.5 rounded border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700">
                    <div className="flex items-center gap-4 font-mono">
                      <span>귀속: <strong className="text-[#1d4ed8]">{ocrResult.yearMonth}</strong></span>
                      <span>지급일: <strong className="text-[#047857]">{ocrResult.payDate || "-"}</strong></span>
                      <span>회사: <strong>{ocrResult.companyName}</strong></span>
                      <span>인식: <strong>{ocrResult.employees?.length}명</strong></span>
                    </div>
                    <span className="text-[11px] text-[#b45309] font-bold bg-[#fef3c7] px-2 py-0.5 rounded border border-[#f59e0b]">
                      * 각 임직원의 용역 계약금액을 직접 입력한 후 하단 저장 버튼을 클릭하세요.
                    </span>
                  </div>

                  <div className="overflow-auto border border-[#b5a894] rounded dark:border-slate-700 max-h-64">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#e2dbcd] text-[#0f172a] font-semibold sticky top-0 dark:bg-slate-800 dark:text-slate-200">
                        <tr>
                          <th className="py-1.5 px-2">사번</th>
                          <th className="py-1.5 px-2">성명</th>
                          <th className="py-1.5 px-2">입사일</th>
                          <th className="py-1.5 px-2 text-right bg-[#fef3c7] text-[#92400e] border-l border-r border-[#f59e0b]">
                            용역 계약금액 (직접입력)
                          </th>
                          <th className="py-1.5 px-2 text-right">기본급</th>
                          <th className="py-1.5 px-2 text-right">식대</th>
                          <th className="py-1.5 px-2 text-right">차량</th>
                          <th className="py-1.5 px-2 text-right">초과근무</th>
                          <th className="py-1.5 px-2 text-right">연차</th>
                          <th className="py-1.5 px-2 text-right text-[#1d4ed8]">지급합계</th>
                          <th className="py-1.5 px-2 text-right text-[#dc2626]">공제합계</th>
                          <th className="py-1.5 px-2 text-right text-[#047857]">차인지급액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c4b6a0] font-mono text-[11px] dark:divide-slate-800">
                        {ocrResult.employees?.map((emp: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/40">
                            <td className="py-1.5 px-2">{emp.employeeNo}</td>
                            <td className="py-1.5 px-2 font-bold font-sans">{emp.employeeName}</td>
                            <td className="py-1.5 px-2 text-center">{emp.joinDate || "-"}</td>
                            <td className="py-1 px-2 text-right bg-[#fffbeb] border-l border-r border-[#f59e0b]">
                              <input
                                type="text"
                                value={toErpInputString(emp.serviceContractAmount)}
                                onChange={(e) => handleOcrServiceAmountChange(idx, e.target.value)}
                                className="w-24 text-right bg-white border border-[#d97706] rounded px-1.5 py-0.5 text-xs font-mono font-bold text-[#b45309] focus:outline-none"
                                placeholder="0"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-right">{formatErpCurrency(emp.baseSalary)}</td>
                            <td className="py-1.5 px-2 text-right">{formatErpCurrency(emp.mealAllowance)}</td>
                            <td className="py-1.5 px-2 text-right">{formatErpCurrency(emp.vehicleAllowance)}</td>
                            <td className="py-1.5 px-2 text-right">{formatErpCurrency(emp.otPay)}</td>
                            <td className="py-1.5 px-2 text-right">{formatErpCurrency(emp.annualLeaveAllowance)}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-[#1d4ed8]">{formatErpCurrency(emp.totalGross)}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-[#dc2626]">{formatErpCurrency(emp.totalDeduction)}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-[#047857]">{formatErpCurrency(emp.netSalary)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  setOcrModalOpen(false);
                  setOcrResult(null);
                  setOcrFile(null);
                }}
                className="px-3 py-1.5 text-xs text-[#334155] hover:text-[#0f172a] bg-[#ebe5d8] hover:bg-[#d0c6b4] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-700"
              >
                닫기
              </button>
              {ocrResult && (
                <button
                  onClick={handleSaveOcrPayroll}
                  disabled={ocrLoading}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#047857] hover:bg-[#065f46] rounded transition flex items-center gap-1.5 shadow"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>급여대장 일괄 저장</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Salary Modal */}
      {editModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded-lg p-5 w-full max-w-sm shadow-2xl text-[#0f172a] dark:text-slate-100">
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 mb-2 pb-2 border-b border-[#b5a894] dark:border-slate-800">
              급여 개별 항목 조정 ({editingRecord.employeeName})
            </h2>
            <p className="text-xs text-[#475569] dark:text-slate-400 mb-4">
              귀속월: {editingRecord.yearMonth} | 부서: {editingRecord.department}
            </p>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#92400e] dark:text-amber-400 font-bold">
                  임직원 용역 계약금액 (원)
                </label>
                <input
                  type="text"
                  value={inputServiceAmount}
                  onChange={(e) => setInputServiceAmount(formatErpInputNumber(e.target.value))}
                  className="bg-[#fffbeb] border border-[#f59e0b] text-xs text-[#b45309] font-bold px-3 py-2 rounded focus:outline-none focus:border-[#d97706] font-mono dark:bg-slate-950 dark:border-amber-600 dark:text-amber-300"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">
                  기본급 (원)
                </label>
                <input
                  type="text"
                  value={inputBaseSalary}
                  onChange={(e) => setInputBaseSalary(formatErpInputNumber(e.target.value))}
                  className="bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">
                  상여금 (원)
                </label>
                <input
                  type="text"
                  value={inputBonus}
                  onChange={(e) => setInputBonus(formatErpInputNumber(e.target.value))}
                  className="bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#334155] hover:text-[#0f172a] bg-[#ebe5d8] hover:bg-[#d0c6b4] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-700"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded transition"
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
