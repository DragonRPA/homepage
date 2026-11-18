"use client";

import React from "react";
import { Check, Eye, Landmark, RefreshCw, X } from "lucide-react";
import { KOREAN_BANKS, type ActiveDocumentViewer } from "./partnerTypes";

export interface BankCopyOcrModalProps {
  bankOcrFileName: string;
  bankOcrLoading: boolean;
  bankOcrModalFileInputRef: React.RefObject<HTMLInputElement | null>;
  bankOcrPreviewUrl: string;
  bankOcrResult: any;
  handleApplyBankOcrToForm: () => void;
  handleBankModalFileUpload: (file: File) => Promise<void>;
  handleBankOcrDragLeave: (e: React.DragEvent) => void;
  handleBankOcrDragOver: (e: React.DragEvent) => void;
  handleBankOcrDrop: (e: React.DragEvent) => void;
  isBankOcrModalDragging: boolean;
  setActiveDocument: React.Dispatch<React.SetStateAction<ActiveDocumentViewer | null>>;
  setBankOcrResult: React.Dispatch<any>;
  setShowBankOcrModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const BankCopyOcrModal: React.FC<BankCopyOcrModalProps> = ({
  bankOcrFileName,
  bankOcrLoading,
  bankOcrModalFileInputRef,
  bankOcrPreviewUrl,
  bankOcrResult,
  handleApplyBankOcrToForm,
  handleBankModalFileUpload,
  handleBankOcrDragLeave,
  handleBankOcrDragOver,
  handleBankOcrDrop,
  isBankOcrModalDragging,
  setActiveDocument,
  setBankOcrResult,
  setShowBankOcrModal,
}) => {
  return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] text-[#0f172a] rounded-lg p-5 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="pb-3 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#047857] dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100">
                  통장사본 자동 인식 및 간편 매입거래처 등록
                </h2>
              </div>
              <button
                onClick={() => setShowBankOcrModal(false)}
                className="text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs">
              {/* Spacious Full Drag & Drop Zone */}
              <div
                onDragOver={handleBankOcrDragOver}
                onDragEnter={handleBankOcrDragOver}
                onDragLeave={handleBankOcrDragLeave}
                onDrop={handleBankOcrDrop}
                onClick={() => bankOcrModalFileInputRef.current?.click()}
                className={`p-6 rounded-lg border-2 border-dashed transition cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
                  isBankOcrModalDragging
                    ? "border-[#047857] bg-[#ecfdf5] scale-[1.01]"
                    : "border-[#b5a894] bg-[#f4efe4] hover:bg-[#ede6d6] hover:border-[#047857]"
                } dark:bg-slate-900 dark:border-slate-700`}
              >
                <input
                  ref={bankOcrModalFileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBankModalFileUpload(file);
                  }}
                />

                <div className="pointer-events-none flex flex-col items-center justify-center gap-3 w-full">
                  <div
                    className={`p-3 rounded-full ${
                      isBankOcrModalDragging
                        ? "bg-[#047857] text-white"
                        : "bg-[#e2dbcd] text-[#047857] dark:bg-slate-800 dark:text-emerald-400"
                    }`}
                  >
                    <Landmark className="w-8 h-8" />
                  </div>

                  <div>
                    <span className="font-bold text-sm text-[#0f172a] dark:text-slate-100 block mb-1">
                      {isBankOcrModalDragging
                        ? "여기에 통장사본 파일을 내려놓으세요!"
                        : "통장사본 파일을 여기로 드래그 앤 드롭하세요"}
                    </span>
                    <p className="text-xs text-[#475569] dark:text-slate-400">
                      은행명, 계좌번호, 예금주를 AI OCR로 자동 분석하여 매입거래처 양식에 채워 넣습니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[#047857] text-white rounded font-bold text-xs shadow-xs hover:bg-[#065f46]">
                      파일 선택
                    </span>
                    {bankOcrFileName && (
                      <span className="text-xs font-mono text-[#047857] font-bold">
                        선택됨: {bankOcrFileName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* OCR Loading Indicator */}
              {bankOcrLoading && (
                <div className="p-6 bg-[#f4efe4] rounded border border-[#b5a894] text-center text-[#047857] flex flex-col items-center justify-center gap-2 dark:bg-slate-950 dark:border-slate-800">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="font-bold">통장사본을 정밀 분석하여 계좌 정보를 추출하고 있습니다...</span>
                </div>
              )}

              {/* OCR Parsing Result Preview (Editable) */}
              {bankOcrResult && !bankOcrLoading && (
                <div className="p-4 bg-[#f4efe4] rounded-lg border border-[#b5a894] space-y-3 dark:bg-slate-950 dark:border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-[#b5a894] dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-[#047857]" />
                      <strong className="text-[#0f172a] text-sm dark:text-slate-200">
                        {bankOcrResult.bankName || "은행 확인 필요"}
                      </strong>
                      <span className="text-xs font-mono text-[#1d4ed8] font-bold">
                        [{bankOcrResult.bankAccountNo || "계좌번호 확인 필요"}]
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {bankOcrPreviewUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDocument({
                              title: "통장사본 원본",
                              partnerName: bankOcrResult.bankAccountHolder || "통장사본",
                              url: bankOcrPreviewUrl,
                              fileName: bankOcrFileName,
                            });
                          }}
                          className="text-[11px] font-bold text-[#1d4ed8] hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>원본 미리보기</span>
                        </button>
                      )}
                      <span className="text-[11px] font-bold text-[#047857] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0]">
                        분석 완료
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">지급 은행명</label>
                      <input
                        type="text"
                        list="korean-bank-list-modal"
                        value={bankOcrResult.bankName || ""}
                        onChange={(e) => setBankOcrResult({ ...bankOcrResult, bankName: e.target.value })}
                        placeholder="은행명 선택 또는 입력"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-bold focus:outline-none focus:border-[#047857] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                      <datalist id="korean-bank-list-modal">
                        {KOREAN_BANKS.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">계좌번호</label>
                      <input
                        type="text"
                        value={bankOcrResult.bankAccountNo || ""}
                        onChange={(e) => setBankOcrResult({ ...bankOcrResult, bankAccountNo: e.target.value })}
                        placeholder="000-00-000000"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono font-bold focus:outline-none focus:border-[#047857] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">예금주 (상호 / 성명)</label>
                      <input
                        type="text"
                        value={bankOcrResult.bankAccountHolder || ""}
                        onChange={(e) => setBankOcrResult({ ...bankOcrResult, bankAccountHolder: e.target.value })}
                        placeholder="예금주 입력"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-semibold focus:outline-none focus:border-[#047857] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">개설 지점 (관리점)</label>
                      <input
                        type="text"
                        value={bankOcrResult.branchName || ""}
                        onChange={(e) => setBankOcrResult({ ...bankOcrResult, branchName: e.target.value })}
                        placeholder="지점명 (선택사항)"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded focus:outline-none focus:border-[#047857] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowBankOcrModal(false)}
                className="px-3.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-semibold dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={!bankOcrResult}
                onClick={handleApplyBankOcrToForm}
                className="px-4 py-1.5 bg-[#047857] hover:bg-[#065f46] disabled:opacity-50 text-white font-bold rounded shadow text-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>이 정보로 매입거래처 등록 양식 채우기</span>
              </button>
            </div>
          </div>
        </div>
  );
};
