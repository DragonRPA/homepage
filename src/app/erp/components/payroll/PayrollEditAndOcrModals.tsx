"use client";

import React, { useRef } from "react";
import { Upload, X, FileText, RefreshCw, Save } from "lucide-react";
import { formatErpCurrency, formatErpInputNumber, toErpInputString } from "@/lib/erpFormat";

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
  leaveDate?: string | null;
  wageProRataBadge?: string;
  wageProRataFormula?: string;
  weeklyHolidayEligible?: boolean;
  salaryBankName?: string | null;
  salaryAccountNo?: string | null;
  salaryAccountHolder?: string | null;

  // 사용자 요청 항목: 임직원 용역 계약금액
  serviceContractAmount: number;
  serviceContractLabel?: string;

  // 기본급여 및 제수당
  baseSalary: number;
  mealAllowance: number;
  vehicleAllowance: number;
  otHours: number;
  otPay: number;
  annualLeaveAllowance: number;
  severancePay?: number;
  bonus: number;
  personalExpenseAmount?: number;
  expenseReceiptCount?: number;
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
  hasPdfFile?: boolean;
}

export interface OcrPayrollResult {
  fileName: string;
  yearMonth: string;
  payDate: string;
  companyName: string;
  employees: any[];
  summary: any;
}

interface PayrollEditAndOcrModalsProps {
  ocrModalOpen: boolean;
  ocrLoading: boolean;
  ocrFile: File | null;
  ocrResult: OcrPayrollResult | null;
  onCloseOcrModal: () => void;
  onProcessOcrFile: (file: File) => void;
  onOcrServiceAmountChange: (index: number, val: string) => void;
  onSaveOcrPayroll: () => void;
  editModalOpen: boolean;
  editingRecord: PayrollRecord | null;
  inputServiceAmount: string;
  setInputServiceAmount: (val: string) => void;
  inputBaseSalary: string;
  setInputBaseSalary: (val: string) => void;
  inputMealAllowance: string;
  setInputMealAllowance: (val: string) => void;
  inputVehicleAllowance: string;
  setInputVehicleAllowance: (val: string) => void;
  inputBonus: string;
  setInputBonus: (val: string) => void;
  inputPersonalExpense: string;
  setInputPersonalExpense: (val: string) => void;
  onCloseEditModal: () => void;
  onSaveEdit: () => void;
}

export const PayrollEditAndOcrModals: React.FC<PayrollEditAndOcrModalsProps> = ({
  ocrModalOpen,
  ocrLoading,
  ocrFile,
  ocrResult,
  onCloseOcrModal,
  onProcessOcrFile,
  onOcrServiceAmountChange,
  onSaveOcrPayroll,
  editModalOpen,
  editingRecord,
  inputServiceAmount,
  setInputServiceAmount,
  inputBaseSalary,
  setInputBaseSalary,
  inputMealAllowance,
  setInputMealAllowance,
  inputVehicleAllowance,
  setInputVehicleAllowance,
  inputBonus,
  setInputBonus,
  inputPersonalExpense,
  setInputPersonalExpense,
  onCloseEditModal,
  onSaveEdit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onProcessOcrFile(file);
  };

  const stdEditInputCls =
    "bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200";

  return (
    <>
      {/* OCR PDF Upload Modal */}
      {ocrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded-lg p-5 w-full max-w-4xl shadow-2xl text-[#0f172a] dark:text-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#0284c7]" />
                <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100">월별 급여대장 PDF 파일 OCR 등록</h2>
              </div>
              <button onClick={onCloseOcrModal} className="p-1 hover:bg-[#ebe5d8] rounded dark:hover:bg-slate-800 transition">
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
                  if (file) onProcessOcrFile(file);
                }}
                className="border-2 border-dashed border-[#b5a894] hover:border-[#0284c7] bg-[#ebe5d8]/50 rounded-lg p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 dark:bg-slate-800/40 dark:border-slate-700"
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" className="hidden" />
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
                    <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
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
                                onChange={(e) => onOcrServiceAmountChange(idx, e.target.value)}
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
                onClick={onCloseOcrModal}
                className="px-3 py-1.5 text-xs text-[#334155] hover:text-[#0f172a] bg-[#ebe5d8] hover:bg-[#d0c6b4] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-700 whitespace-nowrap"
              >
                닫기
              </button>
              {ocrResult && (
                <button
                  onClick={onSaveOcrPayroll}
                  disabled={ocrLoading}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#047857] hover:bg-[#065f46] rounded transition flex items-center gap-1.5 shadow whitespace-nowrap"
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
                <label className="text-xs text-[#92400e] dark:text-amber-400 font-bold">임직원 용역 계약금액 (원)</label>
                <input
                  type="text"
                  value={inputServiceAmount}
                  onChange={(e) => setInputServiceAmount(formatErpInputNumber(e.target.value))}
                  className="bg-[#fffbeb] border border-[#f59e0b] text-xs text-[#b45309] font-bold px-3 py-2 rounded focus:outline-none focus:border-[#d97706] font-mono dark:bg-slate-950 dark:border-amber-600 dark:text-amber-300"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">기본급 (원)</label>
                <input type="text" value={inputBaseSalary} onChange={(e) => setInputBaseSalary(formatErpInputNumber(e.target.value))} className={stdEditInputCls} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">식대 (원) [수당]</label>
                  <input type="text" value={inputMealAllowance} onChange={(e) => setInputMealAllowance(formatErpInputNumber(e.target.value))} className={stdEditInputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">차량보조금 (원) [수당]</label>
                  <input type="text" value={inputVehicleAllowance} onChange={(e) => setInputVehicleAllowance(formatErpInputNumber(e.target.value))} className={stdEditInputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">상여금 (원)</label>
                  <input type="text" value={inputBonus} onChange={(e) => setInputBonus(formatErpInputNumber(e.target.value))} className={stdEditInputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#047857] dark:text-emerald-400 font-bold">개인경비 정산 (원) [비과세]</label>
                  <input
                    type="text"
                    value={inputPersonalExpense}
                    onChange={(e) => setInputPersonalExpense(formatErpInputNumber(e.target.value))}
                    className="bg-[#ecfdf5] border border-[#10b981] text-xs text-[#047857] font-bold px-3 py-2 rounded focus:outline-none focus:border-[#047857] font-mono dark:bg-slate-950 dark:border-emerald-700 dark:text-emerald-300"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={onCloseEditModal}
                className="px-3 py-1.5 text-xs text-[#334155] hover:text-[#0f172a] bg-[#ebe5d8] hover:bg-[#d0c6b4] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-700 whitespace-nowrap"
              >
                취소
              </button>
              <button onClick={onSaveEdit} className="px-4 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded transition whitespace-nowrap">
                재계산 및 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
