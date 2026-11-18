"use client";

import React from "react";
import { Camera, Paperclip } from "lucide-react";
import {
  EmployeeOption,
  IMPROVE_TYPE_OPTIONS,
  NumberedItemsMap,
  WorkImprovementReport,
  formatFileSize,
  formatShortDate,
} from "./workImprovementTypes";

interface WorkImprovementA4StudioProps {
  form: WorkImprovementReport;
  setForm: React.Dispatch<React.SetStateAction<WorkImprovementReport>>;
  selectedId: number | null;
  saving: boolean;
  employees: EmployeeOption[];
  reviewerCandidates: EmployeeOption[];
  approverCandidates: EmployeeOption[];
  canActReviewer: boolean;
  canActApprover: boolean;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  printAreaRef: React.RefObject<HTMLDivElement | null>;
  toggleImproveType: (label: string) => void;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleQuickDecision: (
    actionRole: "REVIEWER" | "APPROVER",
    statusValue: "검토완료" | "보완요청" | "대기중" | "최종승인" | "반려"
  ) => void;
  zoomPhotoUrl: string | null;
  setZoomPhotoUrl: React.Dispatch<React.SetStateAction<string | null>>;
}

export const WorkImprovementA4Studio: React.FC<WorkImprovementA4StudioProps> = ({
  form,
  setForm,
  selectedId,
  saving,
  employees,
  reviewerCandidates,
  approverCandidates,
  canActReviewer,
  canActApprover,
  photoInputRef,
  fileInputRef,
  printAreaRef,
  toggleImproveType,
  handlePhotoUpload,
  handleFileUpload,
  handleQuickDecision,
  zoomPhotoUrl,
  setZoomPhotoUrl,
}) => {
  const updateNumberedItem = (
    groupKey: keyof NumberedItemsMap,
    idx: number,
    value: string
  ) => {
    setForm((prev) => {
      const nextArr = [...(prev.numberedItems[groupKey] || [""])];
      nextArr[idx] = value;
      return {
        ...prev,
        numberedItems: {
          ...prev.numberedItems,
          [groupKey]: nextArr,
        },
      };
    });
  };

  const addNumberedItem = (groupKey: keyof NumberedItemsMap) => {
    setForm((prev) => ({
      ...prev,
      numberedItems: {
        ...prev.numberedItems,
        [groupKey]: [...(prev.numberedItems[groupKey] || []), ""],
      },
    }));
  };

  const removeNumberedItem = (groupKey: keyof NumberedItemsMap, idx: number) => {
    setForm((prev) => {
      const current = prev.numberedItems[groupKey] || [""];
      if (current.length <= 1) {
        return {
          ...prev,
          numberedItems: {
            ...prev.numberedItems,
            [groupKey]: [""],
          },
        };
      }
      const nextArr = current.filter((_, i) => i !== idx);
      return {
        ...prev,
        numberedItems: {
          ...prev.numberedItems,
          [groupKey]: nextArr,
        },
      };
    });
  };

  const renderNumberedSection = (
    groupKey: keyof NumberedItemsMap,
    placeholderText: string
  ) => {
    const items = form.numberedItems[groupKey] || [""];
    return (
      <div className="space-y-1.5">
        {items.map((text, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="font-bold text-xs text-[#1e3a8a] dark:text-blue-400 min-w-[22px] pt-1.5 select-none">
              {idx + 1})
            </span>
            <textarea
              value={text}
              onChange={(e) => updateNumberedItem(groupKey, idx, e.target.value)}
              rows={Math.max(1, Math.ceil((text?.length || 1) / 52))}
              placeholder={placeholderText}
              className="flex-1 text-xs leading-relaxed px-2.5 py-1.5 rounded border border-transparent hover:border-[#cbd5e1] focus:border-[#2563eb] bg-transparent focus:bg-white dark:focus:bg-slate-900 text-[#0f172a] dark:text-slate-100 focus:outline-none resize-y"
            />
            <button
              type="button"
              onClick={() => removeNumberedItem(groupKey, idx)}
              className="print:hidden px-1.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition shrink-0"
              title="항목 삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };

  const hasDecisionFeedback =
    form.statusReviewer === "보완요청" ||
    form.statusReviewer === "검토완료" ||
    form.statusApprover === "최종승인" ||
    form.statusApprover === "반려" ||
    Boolean(form.commentReviewer?.trim()) ||
    Boolean(form.commentApprover?.trim());

  const showFeedbackSection =
    Boolean(selectedId) && (hasDecisionFeedback || canActReviewer || canActApprover);

  return (
    <>
      {/* 우측: 업무개선활동보고서 v3 원본 스타일 양식 및 결재 스튜디오 */}
      <div className="col-span-12 lg:col-span-9 overflow-y-auto pr-0.5">
        <div
          ref={printAreaRef}
          className="max-w-[920px] mx-auto bg-white dark:bg-slate-900 text-[#1a202c] dark:text-slate-100 border border-[#cbd5e0] dark:border-slate-700 rounded shadow-md p-5 md:p-8 print:shadow-none print:border-0 print:p-0"
        >
          {/* 문서 헤더 & 우상단 3단 결재란 */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-double border-[#1a365d] dark:border-blue-400 pb-4 mb-5 gap-4">
            <div>
              <div className="text-[11px] font-bold text-[#2c5282] dark:text-blue-400 tracking-wider mb-1">
                CONTINUOUS IMPROVEMENT REPORT
              </div>
              <h1 className="text-2xl md:text-[26px] font-extrabold text-[#1a365d] dark:text-slate-100 tracking-widest">
                업무개선활동 보고서
              </h1>
            </div>

            {/* 결재란 테이블 (작성 / 검토 / 승인) */}
            <table className="border-collapse border border-[#cbd5e0] dark:border-slate-700 text-center text-xs w-full md:w-[300px] shrink-0">
              <thead>
                <tr className="bg-[#edf2f7] dark:bg-slate-800">
                  <th className="border border-[#cbd5e0] dark:border-slate-700 p-1 w-1/3">
                    <input
                      type="text"
                      value={form.roleAuthor}
                      onChange={(e) => setForm({ ...form, roleAuthor: e.target.value })}
                      className="w-full text-center font-bold bg-transparent focus:outline-none"
                      title="작성자 직책"
                    />
                  </th>
                  <th className="border border-[#cbd5e0] dark:border-slate-700 p-1 w-1/3">
                    <input
                      type="text"
                      value={form.roleReviewer}
                      onChange={(e) => setForm({ ...form, roleReviewer: e.target.value })}
                      className="w-full text-center font-bold bg-transparent focus:outline-none"
                      title="검토자 직책"
                    />
                  </th>
                  <th className="border border-[#cbd5e0] dark:border-slate-700 p-1 w-1/3">
                    <input
                      type="text"
                      value={form.roleApprover}
                      onChange={(e) => setForm({ ...form, roleApprover: e.target.value })}
                      className="w-full text-center font-bold bg-transparent focus:outline-none"
                      title="승인자 직책"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-[62px]">
                  {/* 작성자 */}
                  <td className="border border-[#cbd5e0] dark:border-slate-700 p-1.5 align-middle">
                    <input
                      type="text"
                      value={form.nameAuthor}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matched = employees.find((emp) => emp.name === val.trim());
                        setForm({
                          ...form,
                          nameAuthor: val,
                          authorId: matched ? matched.id : null,
                          roleAuthor: matched
                            ? matched.duty || matched.position || form.roleAuthor
                            : form.roleAuthor,
                        });
                      }}
                      placeholder="작성자 성명"
                      className="w-full text-center font-bold text-xs bg-transparent focus:outline-none"
                    />
                    <div className="text-[11px] text-[#718096] mt-1 font-mono">
                      {formatShortDate(form.summaryDate)}
                    </div>
                  </td>

                  {/* 검토자 */}
                  <td className="border border-[#cbd5e0] dark:border-slate-700 p-1.5 align-middle">
                    <input
                      type="text"
                      list="erp-reviewer-emp-list"
                      value={form.nameReviewer}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matched = employees.find((emp) => emp.name === val.trim());
                        setForm({
                          ...form,
                          nameReviewer: val,
                          reviewerId: matched ? matched.id : null,
                          roleReviewer: matched
                            ? matched.duty || matched.position || form.roleReviewer
                            : form.roleReviewer,
                        });
                      }}
                      placeholder="검토자 성명"
                      className="w-full text-center font-bold text-xs bg-transparent focus:outline-none"
                    />
                    {canActReviewer ? (
                      <select
                        value={form.statusReviewer}
                        onChange={(e) =>
                          handleQuickDecision("REVIEWER", e.target.value as any)
                        }
                        className={`mt-1 text-[11px] font-bold rounded px-1.5 py-0.5 border cursor-pointer focus:outline-none ${
                          form.statusReviewer === "검토완료"
                            ? "bg-[#ebf8ff] text-[#2b6cb0] border-[#90cdf4]"
                            : form.statusReviewer === "보완요청"
                            ? "bg-[#fffaf0] text-[#dd6b20] border-[#fbd38d]"
                            : "bg-[#f7fafc] text-[#718096] border-[#cbd5e0]"
                        }`}
                      >
                        <option value="검토완료">검토완료</option>
                        <option value="보완요청">보완요청</option>
                        <option value="대기중">대기중</option>
                      </select>
                    ) : (
                      <div
                        className={`mt-1 inline-block text-[11px] font-bold rounded px-2 py-0.5 border ${
                          form.statusReviewer === "검토완료"
                            ? "bg-[#ebf8ff] text-[#2b6cb0] border-[#90cdf4]"
                            : form.statusReviewer === "보완요청"
                            ? "bg-[#fffaf0] text-[#dd6b20] border-[#fbd38d]"
                            : "bg-[#f7fafc] text-[#718096] border-[#cbd5e0]"
                        }`}
                      >
                        {form.statusReviewer}
                      </div>
                    )}
                  </td>

                  {/* 승인자 (부서장 전결) */}
                  <td className="border border-[#cbd5e0] dark:border-slate-700 p-1.5 align-middle">
                    <input
                      type="text"
                      list="erp-approver-emp-list"
                      value={form.nameApprover}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matched = employees.find((emp) => emp.name === val.trim());
                        setForm({
                          ...form,
                          nameApprover: val,
                          approverId: matched ? matched.id : null,
                          roleApprover: "부서장",
                        });
                      }}
                      placeholder="부서장 성명"
                      className="w-full text-center font-bold text-xs bg-transparent focus:outline-none"
                    />
                    {canActApprover ? (
                      <select
                        value={form.statusApprover}
                        onChange={(e) =>
                          handleQuickDecision("APPROVER", e.target.value as any)
                        }
                        className={`mt-1 text-[11px] font-bold rounded px-1.5 py-0.5 border cursor-pointer focus:outline-none ${
                          form.statusApprover === "최종승인"
                            ? "bg-[#f0fff4] text-[#2f855a] border-[#9ae6b4]"
                            : form.statusApprover === "반려"
                            ? "bg-[#fff5f5] text-[#e53e3e] border-[#feb2b2]"
                            : "bg-[#f7fafc] text-[#718096] border-[#cbd5e0]"
                        }`}
                      >
                        <option value="최종승인">최종승인</option>
                        <option value="반려">반려</option>
                        <option value="대기중">대기중</option>
                      </select>
                    ) : (
                      <div
                        className={`mt-1 inline-block text-[11px] font-bold rounded px-2 py-0.5 border ${
                          form.statusApprover === "최종승인"
                            ? "bg-[#f0fff4] text-[#2f855a] border-[#9ae6b4]"
                            : form.statusApprover === "반려"
                            ? "bg-[#fff5f5] text-[#e53e3e] border-[#feb2b2]"
                            : "bg-[#f7fafc] text-[#718096] border-[#cbd5e0]"
                        }`}
                      >
                        {form.statusApprover}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <datalist id="erp-reviewer-emp-list">
              {reviewerCandidates.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.department} {emp.duty || emp.position}
                </option>
              ))}
            </datalist>
            <datalist id="erp-approver-emp-list">
              {approverCandidates.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.department} {emp.duty || emp.position} (부서장)
                </option>
              ))}
            </datalist>
          </header>

          {/* 1. 개 요 (Summary) */}
          <section className="mb-4">
            <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
              <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                1.
              </span>
              <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                개 요 (Summary)
              </span>
            </div>

            <div className="border border-[#cbd5e0] dark:border-slate-700 rounded p-3 space-y-2.5">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-bold text-xs text-[#2d3748] dark:text-slate-200 whitespace-nowrap">
                    가. 대 상 :
                  </span>
                  <input
                    type="text"
                    value={form.summaryTarget}
                    onChange={(e) => setForm({ ...form, summaryTarget: e.target.value })}
                    placeholder="개선 대상 업무명 또는 공정명을 입력하세요"
                    className="flex-1 text-xs font-semibold px-2.5 py-1.5 rounded border border-[#cbd5e0] dark:border-slate-700 bg-transparent focus:border-[#2c5282] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-xs text-[#2d3748] dark:text-slate-200 whitespace-nowrap">
                    나. 작성일 :
                  </span>
                  <input
                    type="date"
                    value={form.summaryDate}
                    onChange={(e) => setForm({ ...form, summaryDate: e.target.value })}
                    className="text-xs font-mono px-2.5 py-1.5 rounded border border-[#cbd5e0] dark:border-slate-700 bg-transparent focus:border-[#2c5282] focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-dashed border-[#cbd5e0] dark:border-slate-700 pt-2.5 flex flex-wrap items-center gap-3">
                <span className="font-bold text-xs text-[#2d3748] dark:text-slate-200 whitespace-nowrap">
                  다. 개선 유형 :
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  {IMPROVE_TYPE_OPTIONS.map((typeLabel) => {
                    const checked = form.improveTypes.includes(typeLabel);
                    return (
                      <label
                        key={typeLabel}
                        className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleImproveType(typeLabel)}
                          className="w-3.5 h-3.5 accent-[#1a365d]"
                        />
                        <span>{typeLabel}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 2. 현황 및 문제점 (Current State & Issues) */}
          <section className="mb-4">
            <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
              <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                2.
              </span>
              <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                현황 및 문제점 (Current State &amp; Issues)
              </span>
            </div>

            <div className="border border-[#cbd5e0] dark:border-slate-700 rounded p-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                    <span className="text-[#2c5282] dark:text-blue-400">가.</span>
                    <span>현재 프로세스</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addNumberedItem("currentProcGroup")}
                    className="print:hidden px-2 py-0.5 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold"
                  >
                    + 항목 추가
                  </button>
                </div>
                <div className="pl-2">
                  {renderNumberedSection(
                    "currentProcGroup",
                    "현재 업무 진행 방식 및 현황을 입력하세요."
                  )}
                </div>
              </div>

              <div className="border-t border-dashed border-[#cbd5e0] dark:border-slate-700 pt-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                    <span className="text-[#2c5282] dark:text-blue-400">나.</span>
                    <span>주요 문제점</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addNumberedItem("issueGroup")}
                    className="print:hidden px-2 py-0.5 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold"
                  >
                    + 항목 추가
                  </button>
                </div>
                <div className="pl-2">
                  {renderNumberedSection(
                    "issueGroup",
                    "발생하고 있는 문제점 및 비효율 요인을 입력하세요."
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 3. 개선 방안 (Proposed Solutions) */}
          <section className="mb-4">
            <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
              <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                3.
              </span>
              <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                개선 방안 (Proposed Solutions)
              </span>
            </div>

            <div className="border border-[#cbd5e0] dark:border-slate-700 rounded p-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                    <span className="text-[#2c5282] dark:text-blue-400">가.</span>
                    <span>개선 내용</span>
                  </div>
                  <div className="print:hidden flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => addNumberedItem("solutionGroup")}
                      className="px-2 py-0.5 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold"
                    >
                      + 항목 추가
                    </button>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="px-2 py-0.5 rounded bg-[#ebf8ff] hover:bg-[#bee3f8] text-[#2b6cb0] border border-[#90cdf4] text-[11px] font-bold flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      <span>사진 첨부</span>
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>
                </div>

                <div className="pl-2">
                  {renderNumberedSection(
                    "solutionGroup",
                    "구체적인 실행 방안 및 개선 조치를 입력하세요."
                  )}
                </div>

                {/* 사진 첨부 그리드 */}
                {form.photos.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pl-2">
                    {form.photos.map((photo, pIdx) => (
                      <div
                        key={pIdx}
                        className="border border-[#cbd5e0] dark:border-slate-700 rounded overflow-hidden bg-white dark:bg-slate-950 relative group"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              photos: prev.photos.filter((_, i) => i !== pIdx),
                            }))
                          }
                          className="print:hidden absolute top-2 right-2 w-6 h-6 rounded-full bg-black/65 hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center z-10"
                          title="사진 삭제"
                        >
                          ×
                        </button>
                        <img
                          src={photo.dataUrl}
                          alt={photo.caption || `첨부사진 ${pIdx + 1}`}
                          onClick={() => setZoomPhotoUrl(photo.dataUrl)}
                          className="w-full h-[185px] object-contain bg-[#f7fafc] dark:bg-slate-900 border-b border-[#e2e8f0] dark:border-slate-800 cursor-zoom-in"
                        />
                        <input
                          type="text"
                          value={photo.caption}
                          onChange={(e) => {
                            const nextPhotos = [...form.photos];
                            nextPhotos[pIdx] = {
                              ...nextPhotos[pIdx],
                              caption: e.target.value,
                            };
                            setForm({ ...form, photos: nextPhotos });
                          }}
                          placeholder="사진 설명 입력 (예: 개선 전 / 개선 후 비교)"
                          className="w-full px-2.5 py-1.5 text-xs font-semibold text-center bg-transparent focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 4. 기대 효과 (Expected Effects) */}
          <section className="mb-4">
            <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
              <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                4.
              </span>
              <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                기대 효과 (Expected Effects)
              </span>
            </div>

            <div className="border border-[#cbd5e0] dark:border-slate-700 rounded p-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                    <span className="text-[#2c5282] dark:text-blue-400">가.</span>
                    <span>정량적 효과</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addNumberedItem("quantGroup")}
                    className="print:hidden px-2 py-0.5 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold"
                  >
                    + 항목 추가
                  </button>
                </div>
                <div className="pl-2">
                  {renderNumberedSection(
                    "quantGroup",
                    "시간 단축, 비용 절감 등 수치화된 기대 효과를 입력하세요."
                  )}
                </div>
              </div>

              <div className="border-t border-dashed border-[#cbd5e0] dark:border-slate-700 pt-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                    <span className="text-[#2c5282] dark:text-blue-400">나.</span>
                    <span>정성적 효과</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addNumberedItem("qualGroup")}
                    className="print:hidden px-2 py-0.5 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold"
                  >
                    + 항목 추가
                  </button>
                </div>
                <div className="pl-2">
                  {renderNumberedSection(
                    "qualGroup",
                    "업무 편의성, 품질 향상, 고객 만족도 등 정성적 효과를 입력하세요."
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 5. 소요 예산 및 협조 사항 (Budget & Request) */}
          <section className="mb-4">
            <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
              <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                5.
              </span>
              <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                소요 예산 및 협조 사항 (Budget &amp; Request)
              </span>
            </div>

            <div className="border border-[#cbd5e0] dark:border-slate-700 rounded p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                  <span className="text-[#2c5282] dark:text-blue-400">가.</span>
                  <span>필요 예산 및 협조 사항</span>
                </div>
                <button
                  type="button"
                  onClick={() => addNumberedItem("budgetGroup")}
                  className="print:hidden px-2 py-0.5 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold"
                >
                  + 항목 추가
                </button>
              </div>
              <div className="pl-2">
                {renderNumberedSection(
                  "budgetGroup",
                  "소요 예산 내역 및 타 부서 협조 요청 사항을 입력하세요."
                )}
              </div>
            </div>
          </section>

          {/* 6. 파일첨부 */}
          <section className="mb-4">
            <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
              <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                6.
              </span>
              <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                파일첨부
              </span>
            </div>

            <div className="border border-[#cbd5e0] dark:border-slate-700 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2d3748] dark:text-slate-200">
                  <span className="text-[#2c5282] dark:text-blue-400">가.</span>
                  <span>관련 참고 자료 및 증빙 문서</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="print:hidden px-2.5 py-1 rounded bg-[#edf2f7] hover:bg-[#e2e8f0] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e0] dark:border-slate-700 text-[11px] font-bold flex items-center gap-1"
                >
                  <Paperclip className="w-3 h-3" />
                  <span>파일 추가</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {form.attachedFiles.length === 0 ? (
                <div className="text-xs text-[#a0aec0] pl-2 py-1">
                  첨부된 파일이 없습니다.
                </div>
              ) : (
                <div className="space-y-1.5 pl-2">
                  {form.attachedFiles.map((f, fIdx) => (
                    <div
                      key={fIdx}
                      className="flex items-center justify-between px-3 py-1.5 rounded bg-[#f8fafc] dark:bg-slate-800 border border-[#cbd5e0] dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-3.5 h-3.5 text-[#2c5282] shrink-0" />
                        <a
                          href={f.dataUrl}
                          download={f.name}
                          className="font-semibold text-[#1a202c] dark:text-slate-100 hover:text-[#2b6cb0] hover:underline truncate"
                        >
                          {f.name}
                        </a>
                        <span className="text-[11px] text-[#718096] shrink-0">
                          ({formatFileSize(f.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            attachedFiles: prev.attachedFiles.filter(
                              (_, i) => i !== fIdx
                            ),
                          }))
                        }
                        className="print:hidden text-rose-600 hover:bg-rose-50 px-1.5 py-0.5 rounded font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 7. 검토 및 승인 의견 */}
          {showFeedbackSection && (
            <section className="mb-3">
              <div className="flex items-center bg-[#f8fafc] dark:bg-slate-800 border-l-4 border-[#1a365d] dark:border-blue-400 border-b border-[#cbd5e0] dark:border-slate-700 px-3 py-1.5 mb-2">
                <span className="font-bold text-sm text-[#1a365d] dark:text-blue-300 mr-1.5">
                  7.
                </span>
                <span className="font-bold text-sm text-[#1a365d] dark:text-slate-100">
                  검토 및 승인 의견 (Review &amp; Approval Feedback)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 검토자 의견 카드 */}
                <div className="border border-[#cbd5e0] dark:border-slate-700 rounded bg-[#f8fafc] dark:bg-slate-800/60 p-3 flex flex-col">
                  <div className="flex items-center justify-between border-b border-dashed border-[#cbd5e0] dark:border-slate-700 pb-1.5 mb-2">
                    <span className="font-bold text-xs text-[#2c5282] dark:text-blue-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2b6cb0]" />
                      <span>검토자 의견 ({form.nameReviewer || "검토자"})</span>
                    </span>
                    <input
                      type="text"
                      value={form.dateReviewer}
                      readOnly={!canActReviewer}
                      onChange={(e) =>
                        setForm({ ...form, dateReviewer: e.target.value })
                      }
                      placeholder="일자"
                      className="text-[11px] text-[#718096] text-right w-24 bg-transparent focus:outline-none"
                    />
                  </div>
                  <textarea
                    value={form.commentReviewer}
                    readOnly={!canActReviewer}
                    onChange={(e) =>
                      setForm({ ...form, commentReviewer: e.target.value })
                    }
                    rows={3}
                    placeholder={
                      canActReviewer
                        ? "검토 의견 또는 보완 요청 사항을 기재하세요."
                        : "등록된 검토 의견이 없습니다."
                    }
                    className="w-full text-xs leading-relaxed p-2 rounded border border-transparent focus:border-[#2c5282] bg-white/70 dark:bg-slate-900 focus:outline-none resize-y"
                  />
                  {canActReviewer && (
                    <div className="print:hidden flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-[#e2e8f0] dark:border-slate-700">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleQuickDecision("REVIEWER", "보완요청")}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                          form.statusReviewer === "보완요청"
                            ? "bg-[#dd6b20] text-white border-[#c05621]"
                            : "bg-white dark:bg-slate-900 text-[#dd6b20] border-[#fbd38d] hover:bg-[#fffaf0]"
                        }`}
                      >
                        보완요청 확정
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleQuickDecision("REVIEWER", "검토완료")}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                          form.statusReviewer === "검토완료"
                            ? "bg-[#2b6cb0] text-white border-[#2c5282]"
                            : "bg-white dark:bg-slate-900 text-[#2b6cb0] border-[#90cdf4] hover:bg-[#ebf8ff]"
                        }`}
                      >
                        검토완료 확정
                      </button>
                    </div>
                  )}
                </div>

                {/* 승인자 의견 카드 */}
                <div className="border border-[#cbd5e0] dark:border-slate-700 rounded bg-[#f8fafc] dark:bg-slate-800/60 p-3 flex flex-col">
                  <div className="flex items-center justify-between border-b border-dashed border-[#cbd5e0] dark:border-slate-700 pb-1.5 mb-2">
                    <span className="font-bold text-xs text-[#1a365d] dark:text-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2f855a]" />
                      <span>승인자 의견 ({form.nameApprover || "승인자"})</span>
                    </span>
                    <input
                      type="text"
                      value={form.dateApprover}
                      readOnly={!canActApprover}
                      onChange={(e) =>
                        setForm({ ...form, dateApprover: e.target.value })
                      }
                      placeholder="일자"
                      className="text-[11px] text-[#718096] text-right w-24 bg-transparent focus:outline-none"
                    />
                  </div>
                  <textarea
                    value={form.commentApprover}
                    readOnly={!canActApprover}
                    onChange={(e) =>
                      setForm({ ...form, commentApprover: e.target.value })
                    }
                    rows={3}
                    placeholder={
                      canActApprover
                        ? "최종 승인 의견 또는 반려 사유를 기재하세요."
                        : "등록된 승인 의견이 없습니다."
                    }
                    className="w-full text-xs leading-relaxed p-2 rounded border border-transparent focus:border-[#2c5282] bg-white/70 dark:bg-slate-900 focus:outline-none resize-y"
                  />
                  {canActApprover && (
                    <div className="print:hidden flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-[#e2e8f0] dark:border-slate-700">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleQuickDecision("APPROVER", "반려")}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                          form.statusApprover === "반려"
                            ? "bg-[#e53e3e] text-white border-[#c53030]"
                            : "bg-white dark:bg-slate-900 text-[#e53e3e] border-[#feb2b2] hover:bg-[#fff5f5]"
                        }`}
                      >
                        반려 확정
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleQuickDecision("APPROVER", "최종승인")}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                          form.statusApprover === "최종승인"
                            ? "bg-[#2f855a] text-white border-[#276749]"
                            : "bg-white dark:bg-slate-900 text-[#2f855a] border-[#9ae6b4] hover:bg-[#f0fff4]"
                        }`}
                      >
                        최종승인 확정
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 푸터 */}
          <footer className="mt-4 pt-2.5 border-t border-[#cbd5e0] dark:border-slate-700 flex items-center justify-between text-[11px] text-[#718096]">
            <span>문서양식: WIR-2026-REV3 ({form.reportNo || "신규 작성"})</span>
            <span className="flex items-center gap-1">
              <span>작성부서:</span>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-28 border-b border-transparent hover:border-[#cbd5e0] focus:border-[#2c5282] bg-transparent text-[#4a5568] dark:text-slate-300 text-[11px] focus:outline-none"
              />
            </span>
          </footer>
        </div>
      </div>

      {/* 사진 클릭 확대 모달 */}
      {zoomPhotoUrl && (
        <div
          onClick={() => setZoomPhotoUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={zoomPhotoUrl}
            alt="확대 이미지"
            className="max-w-[92vw] max-h-[90vh] rounded shadow-2xl"
          />
        </div>
      )}
    </>
  );
};
