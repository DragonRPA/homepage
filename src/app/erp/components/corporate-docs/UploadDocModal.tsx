"use client";

import React from "react";
import { X } from "lucide-react";
import { CorporateDocItem, DOC_CATEGORIES } from "./corporateDocTypes";

interface UploadDocModalProps {
  uploadTargetDoc: CorporateDocItem | null;
  formEntityType: "CORP" | "INDIVIDUAL";
  setFormEntityType: React.Dispatch<React.SetStateAction<"CORP" | "INDIVIDUAL">>;
  formCategory: string;
  setFormCategory: React.Dispatch<React.SetStateAction<string>>;
  formTitle: string;
  setFormTitle: React.Dispatch<React.SetStateAction<string>>;
  formDesc: string;
  setFormDesc: React.Dispatch<React.SetStateAction<string>>;
  formEffectiveDate: string;
  setFormEffectiveDate: React.Dispatch<React.SetStateAction<string>>;
  formChangeNote: string;
  setFormChangeNote: React.Dispatch<React.SetStateAction<string>>;
  setFormFile: React.Dispatch<React.SetStateAction<File | null>>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const UploadDocModal: React.FC<UploadDocModalProps> = ({
  uploadTargetDoc,
  formEntityType,
  setFormEntityType,
  formCategory,
  setFormCategory,
  formTitle,
  setFormTitle,
  formDesc,
  setFormDesc,
  formEffectiveDate,
  setFormEffectiveDate,
  formChangeNote,
  setFormChangeNote,
  setFormFile,
  submitting,
  onClose,
  onSubmit,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#ebe5d8] dark:bg-slate-900 border-2 border-[#b5a894] dark:border-slate-700 rounded-lg shadow-xl w-full max-w-md overflow-hidden text-xs">
        <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-950 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between font-bold">
          <span>
            {uploadTargetDoc
              ? `[${uploadTargetDoc.title}] 신규 개정 버전(v${uploadTargetDoc.currentVersion + 1}.0) 업로드`
              : "신규 중요문서 마스터 등록"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[#334155] dark:text-slate-300">사업장 구분</label>
              <select
                value={formEntityType}
                onChange={(e) => setFormEntityType(e.target.value as "CORP" | "INDIVIDUAL")}
                disabled={Boolean(uploadTargetDoc)}
                className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-semibold"
              >
                <option value="CORP">법인사업장 ((주)드래곤알피에이)</option>
                <option value="INDIVIDUAL">개인사업장 (드래곤알피에이)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-[#334155] dark:text-slate-300">문서 분류</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-semibold"
              >
                {DOC_CATEGORIES.filter((c) => c !== "전체").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#334155] dark:text-slate-300">문서명</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="예: 정관, 주주서면결의서, 주주명부, 등기사항전부증명서"
              required
              className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#334155] dark:text-slate-300">문서 설명</label>
            <input
              type="text"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="문서 개요 또는 관리 목적"
              className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[#334155] dark:text-slate-300">
                시행일 / 발급일
              </label>
              <input
                type="date"
                value={formEffectiveDate}
                onChange={(e) => setFormEffectiveDate(e.target.value)}
                className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[#334155] dark:text-slate-300">부여 버전</label>
              <input
                type="text"
                readOnly
                value={
                  uploadTargetDoc
                    ? `v${uploadTargetDoc.currentVersion + 1}.0`
                    : "v1.0"
                }
                className="bg-[#dcd4c4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#334155] dark:text-slate-300">
              제·개정 사유 및 버전 메모
            </label>
            <input
              type="text"
              value={formChangeNote}
              onChange={(e) => setFormChangeNote(e.target.value)}
              placeholder="예: 2026.09.14 사업목적 추가에 따른 정관 개정본"
              className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#334155] dark:text-slate-300">
              파일 선택 (PDF, DOCX, XLSX, 이미지 등)
            </label>
            <input
              type="file"
              onChange={(e) => setFormFile(e.target.files?.[0] || null)}
              required
              className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-[#b5a894] bg-[#dcd4c4] font-bold"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold disabled:opacity-50"
            >
              {submitting ? "업로드 중..." : "버전 등록 완료"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
