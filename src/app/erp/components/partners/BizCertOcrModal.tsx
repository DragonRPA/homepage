"use client";

import React from "react";
import { Check, FileCheck, FileUp, RefreshCw, X } from "lucide-react";
import { getNtsBizStateBadgeLabel } from "@/lib/partnerStatusClient";

export interface BizCertOcrModalProps {
  certFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleApplyOcrToForm: () => void;
  handleBizCertFileUpload: (file: File) => Promise<void>;
  handleCertDragLeave: (e: React.DragEvent) => void;
  handleCertDragOver: (e: React.DragEvent) => void;
  handleCertDrop: (e: React.DragEvent) => void;
  isCertDragging: boolean;
  ocrFileName: string;
  ocrLoading: boolean;
  ocrNtsStatus: any;
  ocrPreviewThumbUrl: string;
  ocrResult: any;
  setOcrResult: React.Dispatch<any>;
  setShowBizCertOcrModal: React.Dispatch<React.SetStateAction<boolean>>;
  setZoomImageUrl: React.Dispatch<React.SetStateAction<string | null>>;
}

export const BizCertOcrModal: React.FC<BizCertOcrModalProps> = ({
  certFileInputRef,
  handleApplyOcrToForm,
  handleBizCertFileUpload,
  handleCertDragLeave,
  handleCertDragOver,
  handleCertDrop,
  isCertDragging,
  ocrFileName,
  ocrLoading,
  ocrNtsStatus,
  ocrPreviewThumbUrl,
  ocrResult,
  setOcrResult,
  setShowBizCertOcrModal,
  setZoomImageUrl,
}) => {
  return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] text-[#0f172a] rounded-lg p-5 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="pb-3 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileUp className="w-4 h-4 text-[#6d28d9] dark:text-purple-400" />
                <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100">
                  사업자등록증 자동 인식 및 간편 거래처 등록
                </h2>
              </div>
              <button
                onClick={() => setShowBizCertOcrModal(false)}
                className="text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs">
              {/* Spacious Full Drag & Drop Zone (샘플데이터 주입 완전 제거) */}
              <div
                onDragOver={handleCertDragOver}
                onDragEnter={handleCertDragOver}
                onDragLeave={handleCertDragLeave}
                onDrop={handleCertDrop}
                onClick={() => certFileInputRef.current?.click()}
                className={`p-6 rounded-lg border-2 border-dashed transition cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
                  isCertDragging
                    ? "border-[#1d4ed8] bg-[#dbeafe] scale-[1.01]"
                    : "border-[#b5a894] bg-[#f4efe4] hover:bg-[#ede6d6] hover:border-[#1d4ed8]"
                } dark:bg-slate-900 dark:border-slate-700`}
              >
                <input
                  ref={certFileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBizCertFileUpload(file);
                  }}
                />

                <div className="pointer-events-none flex flex-col items-center justify-center gap-3 w-full">
                  <div className={`p-3 rounded-full ${isCertDragging ? "bg-[#1d4ed8] text-white" : "bg-[#e2dbcd] text-[#6d28d9] dark:bg-slate-800 dark:text-purple-400"}`}>
                    <FileUp className="w-8 h-8" />
                  </div>

                  <div>
                    <span className="font-bold text-sm text-[#0f172a] dark:text-slate-100 block mb-1">
                      {isCertDragging
                        ? "여기에 사업자등록증 파일을 내려놓으세요!"
                        : "사업자등록증 파일을 여기로 드래그 앤 드롭하세요"}
                    </span>
                    <p className="text-xs text-[#475569] dark:text-slate-400">
                      PDF, PNG, JPG 파일을 마우스로 끌어다 놓거나, 클릭하여 파일을 선택할 수 있습니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[#1d4ed8] text-white rounded font-bold text-xs shadow-xs hover:bg-[#1e40af]">
                      파일 선택
                    </span>
                    {ocrFileName && (
                      <span className="text-xs font-mono text-[#6d28d9] font-bold">
                        선택됨: {ocrFileName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* OCR Loading Indicator */}
              {ocrLoading && (
                <div className="p-6 bg-[#f4efe4] rounded border border-[#b5a894] text-center text-[#6d28d9] flex flex-col items-center justify-center gap-2 dark:bg-slate-950 dark:border-slate-800">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="font-bold">사업자등록증 문서를 정밀 분석하고 있습니다...</span>
                </div>
              )}

              {/* OCR Parsing Result Preview (Editable) */}
              {ocrResult && !ocrLoading && (
                <div className="p-4 bg-[#f4efe4] rounded-lg border border-[#b5a894] space-y-3 dark:bg-slate-950 dark:border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-[#b5a894] dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#047857]" />
                      <strong className="text-[#0f172a] text-sm dark:text-slate-200">
                        {ocrResult.name || "상호명 확인 필요"}
                      </strong>
                      <span className="text-xs font-mono text-[#6d28d9] font-bold">
                        [{ocrResult.businessNo || "사업자번호 확인 필요"}]
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {ocrNtsStatus && (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                            ocrNtsStatus.shouldBlockTrade
                              ? "bg-[#fee2e2] text-[#991b1b] border-[#f87171]"
                              : "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]"
                          }`}
                        >
                          국세청: {getNtsBizStateBadgeLabel(ocrNtsStatus.ntsBizState)}
                          {ocrNtsStatus.shouldBlockTrade ? " (거래불가 대상)" : ""}
                        </span>
                      )}
                      {ocrPreviewThumbUrl && ocrPreviewThumbUrl.startsWith("data:image/") && (
                        <button
                          type="button"
                          onClick={() => setZoomImageUrl(ocrPreviewThumbUrl)}
                          className="text-[11px] font-bold text-[#1d4ed8] hover:underline whitespace-nowrap"
                        >
                          원본 미리보기
                        </button>
                      )}
                      <span className="text-[11px] font-bold text-[#047857] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0] whitespace-nowrap">
                        분석 완료
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">상호명 (법인명)</label>
                      <input
                        type="text"
                        value={ocrResult.name || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, name: e.target.value })}
                        placeholder="상호명 입력"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-bold focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">사업자등록번호</label>
                      <input
                        type="text"
                        value={ocrResult.businessNo || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, businessNo: e.target.value })}
                        placeholder="000-00-00000"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono font-bold focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">대표자 성명</label>
                      <input
                        type="text"
                        value={ocrResult.ceoName || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, ceoName: e.target.value })}
                        placeholder="대표자 성명"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-semibold focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">개업연월일</label>
                      <input
                        type="text"
                        value={ocrResult.openDate || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, openDate: e.target.value })}
                        placeholder="YYYY-MM-DD"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">업태</label>
                      <input
                        type="text"
                        value={ocrResult.bizType || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, bizType: e.target.value })}
                        placeholder="업태"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">종목</label>
                      <input
                        type="text"
                        value={ocrResult.bizItem || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, bizItem: e.target.value })}
                        placeholder="종목"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">본사 사업장 소재지</label>
                      <input
                        type="text"
                        value={ocrResult.address || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, address: e.target.value })}
                        placeholder="사업장 소재지"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">세금계산서 전용 이메일</label>
                      <input
                        type="text"
                        value={ocrResult.email || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, email: e.target.value })}
                        placeholder="tax@company.co.kr"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#1d4ed8] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-blue-300"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">법인등록번호 / 전화번호</label>
                      <input
                        type="text"
                        value={ocrResult.corporateNo || ocrResult.mainPhone || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, corporateNo: e.target.value })}
                        placeholder="-"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
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
                onClick={() => setShowBizCertOcrModal(false)}
                className="px-3.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-semibold dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={!ocrResult}
                onClick={handleApplyOcrToForm}
                className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white font-bold rounded shadow text-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>이 정보로 거래처 등록 양식 채우기</span>
              </button>
            </div>
          </div>
        </div>
  );
};
