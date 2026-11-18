"use client";

import React, { useRef } from "react";
import { Receipt, Check, X, RefreshCw, Upload, FileText, Sparkles } from "lucide-react";
import { formatErpCurrency, formatErpInputNumber, cleanErpNumber, toErpInputString } from "@/lib/erpFormat";

export interface ExpenseReceiptItem {
  id: number;
  employee_id: number;
  employee_no: string;
  employee_name: string;
  department: string;
  position: string;
  duty?: string;
  expense_date: string;
  year_month: string;
  category: string;
  merchant_name: string;
  amount: number;
  payment_method: string;
  description: string;
  receipt_file_name?: string;
  receipt_r2_key?: string;
  receipt_file_url?: string;
  hasReceipt?: boolean;
  has_receipt?: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approved_by?: string;
  approved_at?: string;
  payroll_included?: boolean;
  created_at?: string;
}

export interface EmployeeOption {
  id: number;
  employee_no: string;
  name: string;
  department: string;
  position: string;
  duty?: string;
  status: string;
}

export interface ExpenseCreateFormState {
  selectedEmployeeId: string;
  expenseDate: string;
  yearMonth: string;
  category: string;
  paymentMethod: string;
  merchantName: string;
  amountInput: string;
  descPreset: string;
  description: string;
  receiptFile: File | null;
}

export interface ExpenseCreateAndPreviewModalsProps {
  modalOpen: boolean;
  onCloseCreateModal: () => void;
  form: ExpenseCreateFormState;
  setForm: React.Dispatch<React.SetStateAction<ExpenseCreateFormState>>;
  selectableEmployees: EmployeeOption[];
  categories: readonly string[];
  paymentMethods: readonly string[];
  descriptionPresets: readonly string[];
  isDeptHead: boolean;
  submitting: boolean;
  onDateChange: (dateStr: string) => void;
  onSubmitReceipt: (e: React.FormEvent) => void;
  previewItem: ExpenseReceiptItem | null;
  onClosePreview: () => void;
}

const AMOUNT_QUICK_BUTTONS = [
  { label: "+1만", val: 10000 },
  { label: "+3만", val: 30000 },
  { label: "+5만", val: 50000 },
  { label: "+10만", val: 100000 },
  { label: "초기화", val: 0 },
];

export const ExpenseCreateAndPreviewModals: React.FC<ExpenseCreateAndPreviewModalsProps> = ({
  modalOpen,
  onCloseCreateModal,
  form,
  setForm,
  selectableEmployees,
  categories,
  paymentMethods,
  descriptionPresets,
  isDeptHead,
  submitting,
  onDateChange,
  onSubmitReceipt,
  previewItem,
  onClosePreview,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const renderPreviewModal = () => {
    if (!previewItem) return null;
    const previewUrl = previewItem.receipt_r2_key
      ? `/api/erp/vault?key=${encodeURIComponent(previewItem.receipt_r2_key)}`
      : previewItem.receipt_file_url || "";
    const isPdf =
      Boolean(previewItem.receipt_file_name?.toLowerCase().endsWith(".pdf")) ||
      previewUrl.toLowerCase().includes(".pdf");

    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
        <div className="bg-[#f4efe4] border border-[#b5a894] rounded-lg p-4 w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#b5a894]">
            <div className="flex items-center gap-2 text-xs font-bold">
              <FileText className="w-4 h-4 text-[#1d4ed8]" />
              <span>
                영수증 증빙 조회 — {previewItem.employee_name} ({previewItem.expense_date?.slice(0, 10)} ·{" "}
                {previewItem.merchant_name} · {formatErpCurrency(previewItem.amount)})
              </span>
            </div>
            <button onClick={onClosePreview} className="p-1 hover:bg-[#ebe5d8] rounded">
              <X className="w-4 h-4 text-[#475569]" />
            </button>
          </div>

          <div className="flex-1 overflow-auto py-3 flex items-center justify-center bg-[#ebe5d8] rounded my-2 min-h-[380px]">
            {previewUrl ? (
              isPdf ? (
                <iframe src={previewUrl} className="w-full h-[65vh] border-0" title="영수증 PDF" />
              ) : (
                <img
                  src={previewUrl}
                  alt="영수증 스캔본"
                  className="max-w-full max-h-[65vh] object-contain rounded shadow"
                />
              )
            ) : (
              <p className="text-xs text-[#64748b]">영수증 이미지가 없습니다.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#b5a894]">
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-[#1d4ed8] text-white text-xs font-bold rounded"
              >
                새 창에서 원본 열기
              </a>
            )}
            <button
              onClick={onClosePreview}
              className="px-3 py-1.5 bg-[#ebe5d8] text-[#334155] text-xs font-bold rounded border border-[#b5a894]"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 5. 개인경비 영수증 등록 모달 (퀵버튼 전면 적용) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded-lg p-5 w-full max-w-2xl shadow-2xl text-[#0f172a] dark:text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#b5a894] dark:border-slate-800">
              <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#047857]" />
                <span>개인경비 영수증 등록 및 급여정산 연동</span>
              </h2>
              <button
                type="button"
                onClick={onCloseCreateModal}
                className="p-1 hover:bg-[#ebe5d8] rounded transition"
              >
                <X className="w-4 h-4 text-[#475569]" />
              </button>
            </div>

            <form onSubmit={onSubmitReceipt} className="space-y-3.5 text-xs">
              {/* 1) 영수증 스캔본 첨부 (R2 볼트 암호화 보관 + AI 자동인식) */}
              <div className="flex flex-col gap-1">
                <label className="text-[#334155] dark:text-slate-300 font-bold flex items-center justify-between">
                  <span>영수증 사진 / PDF 첨부 (Cloudflare R2 보안 볼트 저장 · AI 금액 자동인식)</span>
                  {form.receiptFile && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, receiptFile: null }))}
                      className="text-[11px] text-[#dc2626] font-bold hover:underline"
                    >
                      첨부 취소
                    </button>
                  )}
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) setForm((prev) => ({ ...prev, receiptFile: file }));
                  }}
                  className="border-2 border-dashed border-[#10b981] bg-[#ecfdf5]/60 hover:bg-[#d1fae5]/60 rounded p-3 text-center cursor-pointer transition flex items-center justify-center gap-2.5"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setForm((prev) => ({ ...prev, receiptFile: f }));
                    }}
                    className="hidden"
                  />
                  <Upload className="w-4 h-4 text-[#047857] shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#047857]">
                      {form.receiptFile
                        ? `첨부됨: ${form.receiptFile.name} (${Math.round(form.receiptFile.size / 1024)} KB)`
                        : "영수증 이미지 또는 PDF를 클릭/드래그하여 첨부하세요"}
                    </p>
                    <p className="text-[10px] text-[#475569] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#047857]" />
                      <span>결제금액이나 가맹점명을 비워두어도 영수증 이미지에서 AI가 자동 추출합니다.</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 2) 대상 임직원 퀵버튼 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#334155] dark:text-slate-300 font-bold">대상 임직원 (퀵선택)</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-[#ebe5d8] border border-[#b5a894] rounded dark:bg-slate-950 dark:border-slate-800">
                  {selectableEmployees.map((e) => {
                    const isSelected = String(form.selectedEmployeeId) === String(e.id);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, selectedEmployeeId: String(e.id) }))}
                        className={`px-2.5 py-1.5 rounded text-xs font-bold border transition whitespace-nowrap ${
                          isSelected
                            ? "bg-[#047857] text-white border-[#047857] shadow-sm"
                            : "bg-[#f4efe4] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {e.name}
                        <span className={`ml-1 text-[10px] font-normal ${isSelected ? "text-emerald-100" : "text-[#64748b]"}`}>
                          ({e.department} · {e.position})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3) 사용 일자 및 급여 정산 귀속연월 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">영수증 결제(사용) 일자</label>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => onDateChange(e.target.value)}
                    className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[#047857] dark:text-emerald-400 font-bold">급여 정산 반영 귀속연월</label>
                  <input
                    type="month"
                    value={form.yearMonth}
                    onChange={(e) => setForm((prev) => ({ ...prev, yearMonth: e.target.value }))}
                    className="bg-[#ecfdf5] border border-[#10b981] text-[#047857] font-bold px-2.5 py-1.5 rounded font-mono"
                    required
                  />
                </div>
              </div>

              {/* 4) 경비 구분 퀵버튼 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#334155] dark:text-slate-300 font-bold">경비 구분 (퀵선택)</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-[#ebe5d8] border border-[#b5a894] rounded dark:bg-slate-950 dark:border-slate-800">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, category: cat }))}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold border transition whitespace-nowrap ${
                        form.category === cat
                          ? "bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-sm"
                          : "bg-[#f4efe4] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5) 결제 수단 퀵버튼 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#334155] dark:text-slate-300 font-bold">결제 수단 (퀵선택)</label>
                <div className="flex flex-wrap gap-1.5">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, paymentMethod: pm }))}
                      className={`px-3 py-1 rounded text-[11px] font-bold border transition whitespace-nowrap ${
                        form.paymentMethod === pm
                          ? "bg-[#0f172a] text-white border-[#0f172a]"
                          : "bg-[#ebe5d8] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd]"
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6) 가맹점명 및 결제금액 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">가맹점 / 사용처 상호</label>
                  <input
                    type="text"
                    value={form.merchantName}
                    onChange={(e) => setForm((prev) => ({ ...prev, merchantName: e.target.value }))}
                    placeholder="예: GS칼텍스 금천주유소, 한솥도시락"
                    className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#047857] dark:text-emerald-400 font-bold">
                    결제 금액 (원) [급여 비과세 정산액]
                  </label>
                  <input
                    type="text"
                    value={form.amountInput}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, amountInput: formatErpInputNumber(e.target.value) }))
                    }
                    placeholder="0"
                    className="bg-[#ecfdf5] border border-[#10b981] text-[#047857] font-extrabold px-2.5 py-1.5 rounded text-right font-mono text-sm"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {AMOUNT_QUICK_BUTTONS.map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            amountInput:
                              btn.val === 0
                                ? ""
                                : toErpInputString(cleanErpNumber(prev.amountInput) + btn.val),
                          }))
                        }
                        className="px-2 py-0.5 bg-[#e2dbcd] hover:bg-[#d5cbb8] text-[#334155] rounded border border-[#b5a894] text-[10px] font-bold"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 7) 사용 목적 프리셋 퀵버튼 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#334155] dark:text-slate-300 font-bold">사용 목적 프리셋 (퀵선택)</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-[#ebe5d8] border border-[#b5a894] rounded dark:bg-slate-950 dark:border-slate-800">
                  {descriptionPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          descPreset: preset,
                          description: preset !== "직접 입력" ? preset : "",
                        }))
                      }
                      className={`px-2.5 py-1 rounded text-[11px] font-bold border transition whitespace-nowrap ${
                        form.descPreset === preset
                          ? "bg-[#047857] text-white border-[#047857] shadow-sm"
                          : "bg-[#f4efe4] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd]"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 8) 상세 사유 입력 */}
              <div className="flex flex-col gap-1">
                <label className="text-[#334155] dark:text-slate-300 font-semibold">상세 사용 목적 / 메모</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="사용 목적을 입력하세요"
                  className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded"
                  required
                />
              </div>

              <div className="pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCloseCreateModal}
                  className="px-3 py-1.5 text-xs text-[#334155] bg-[#ebe5d8] hover:bg-[#d0c6b4] rounded border border-[#b5a894]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#047857] hover:bg-[#065f46] rounded shadow flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>저장 및 급여정산 반영 중...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {isDeptHead ? "영수증 등록 및 즉시 승인 (급여반영)" : "개인경비 영수증 제출"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. 영수증 스캔본 미리보기 모달 */}
      {renderPreviewModal()}
    </>
  );
};
