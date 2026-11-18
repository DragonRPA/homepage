"use client";

import React from "react";
import { FileSpreadsheet, X, Check, Upload } from "lucide-react";
import { AccountStatusItem, UploadResultState } from "./bankMatchingTypes";

export interface BankUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  accountStatus: AccountStatusItem[];
  uploadAccountNo: string;
  setUploadAccountNo: (val: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  rawPasteText: string;
  setRawPasteText: (val: string) => void;
  uploading: boolean;
  uploadResult: UploadResultState | null;
}

export const BankUploadModal: React.FC<BankUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accountStatus,
  uploadAccountNo,
  setUploadAccountNo,
  fileInputRef,
  selectedFiles,
  setSelectedFiles,
  rawPasteText,
  setRawPasteText,
  uploading,
  uploadResult,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-lg shadow-2xl text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-white"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#b5a894] dark:border-slate-800">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-[#047857]" />
            <span>통장 입출금내역 파일 업로드</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#dcd4c4] dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {accountStatus.length > 0 && (
            <div className="p-2.5 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800 space-y-1.5">
              <div className="text-[11px] font-bold text-[#334155] dark:text-slate-400">
                계좌별 마지막 업로드 거래데이터 일시
              </div>
              {accountStatus.map((acc) => (
                <div
                  key={acc.accountNo}
                  className="flex items-center justify-between text-[11px] font-mono"
                >
                  <span className="text-[#0f172a] dark:text-slate-200 font-semibold">
                    [{acc.entityType === "INDIVIDUAL" ? "개인" : "법인"}] {acc.bankName}{" "}
                    {acc.accountNo}
                  </span>
                  {acc.latestTransDatetime ? (
                    <span className="font-bold text-[#047857] dark:text-emerald-400">
                      최종 거래: {acc.latestTransDatetime}
                    </span>
                  ) : (
                    <span className="text-[#dc2626] dark:text-rose-400">업로드 내역 없음</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400">
              귀속 계좌 설정
            </label>
            <select
              value={uploadAccountNo}
              onChange={(e) => setUploadAccountNo(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
            >
              <option value="AUTO">파일 내 계좌번호 자동 인식 (기본: 478-081383-04-018)</option>
              <option value="478-081383-04-018">
                기업은행 478-081383-04-018 [(주)드래곤알피에이 법인]
              </option>
              <option value="140-129404-04-018">
                기업은행 140-129404-04-018 [드래곤알피에이 개인]
              </option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400">
              거래내역 파일 선택 (.xlsx, .xls, .csv, .txt 복수 선택 가능)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  setSelectedFiles(Array.from(e.target.files));
                }
              }}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#1d4ed8] file:text-white hover:file:bg-[#1e40af] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
            />
            {selectedFiles.length > 0 && (
              <div className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] text-[11px] space-y-1 font-mono">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="truncate">{f.name}</span>
                    <span className="text-[#64748b] shrink-0">
                      {(f.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400">
              엑셀/CSV 텍스트 직접 붙여넣기 (선택)
            </label>
            <textarea
              rows={4}
              value={rawPasteText}
              onChange={(e) => setRawPasteText(e.target.value)}
              placeholder="거래내역조회_입출식 예금 CSV 또는 엑셀 복사 내용을 붙여넣으세요."
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] p-2.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
            />
          </div>

          {uploadResult && (
            <div className="p-3 rounded bg-[#ecfdf5] border border-[#047857] text-[#065f46] text-xs space-y-1">
              <div className="font-bold flex items-center gap-1">
                <Check className="w-4 h-4" />
                <span>DB 반영 결과</span>
              </div>
              <div className="font-mono text-[11px]">
                분석 건수: {uploadResult.totalParsed}건 | 신규 저장:{" "}
                <b>{uploadResult.insertedCount}건</b> | 중복 제외:{" "}
                {uploadResult.duplicateCount}건
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#0f172a] bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] font-bold transition dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
          >
            닫기
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#047857] hover:bg-[#065f46] disabled:opacity-50 rounded shadow-xs transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? "업로드 처리중..." : "DB 저장 실행"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
