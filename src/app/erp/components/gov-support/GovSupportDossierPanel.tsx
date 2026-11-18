"use client";

import React from "react";
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { CATEGORY_META, GovSupportItem } from "./govSupportTypes";

interface GovSupportDossierPanelProps {
  selectedItem: GovSupportItem | null;
  rightViewMode: "SUMMARY" | "ORIGINAL";
  setRightViewMode: React.Dispatch<React.SetStateAction<"SUMMARY" | "ORIGINAL">>;
  memoDraft: string;
  setMemoDraft: React.Dispatch<React.SetStateAction<string>>;
  fetchingOriginal: boolean;
  formattedOriginalText: string;
  handleQuickUpdate: (
    id: number,
    patch: { status?: string; isBookmarked?: boolean; memo?: string; originalContent?: string }
  ) => void;
  handleDeleteItem: (id: number) => void;
  handleSaveToObsidian: (item: GovSupportItem) => void;
  handleOpenOriginalModal: (item: GovSupportItem) => void;
  handleFetchOriginalContent: (item: GovSupportItem, openModalAfter?: boolean) => void;
  handleCopyUltraPrompt: (
    item: GovSupportItem,
    openExternal?: "GEMINI" | "NOTEBOOKLM"
  ) => void;
  showToast: (text: string, type?: "success" | "error") => void;
}

export const GovSupportDossierPanel: React.FC<GovSupportDossierPanelProps> = ({
  selectedItem,
  rightViewMode,
  setRightViewMode,
  memoDraft,
  setMemoDraft,
  fetchingOriginal,
  formattedOriginalText,
  handleQuickUpdate,
  handleDeleteItem,
  handleSaveToObsidian,
  handleOpenOriginalModal,
  handleFetchOriginalContent,
  handleCopyUltraPrompt,
  showToast,
}) => {
  return (
    <div className="col-span-12 lg:col-span-5 bg-[#f4efe4] border border-[#b5a894] rounded flex flex-col overflow-hidden">
      {selectedItem ? (
        <div className="flex flex-col h-full overflow-hidden">
          {/* 상세 헤더 */}
          <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${
                    (CATEGORY_META[selectedItem.category] || CATEGORY_META.SUPPORT).badgeClass
                  }`}
                >
                  {(CATEGORY_META[selectedItem.category] || CATEGORY_META.SUPPORT).label}
                </span>
                <span className="text-xs font-bold text-[#334155]">
                  {selectedItem.agency}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
                  당사 적합도 {selectedItem.fitScore}%
                </span>
              </div>

              <div className="flex items-center gap-1">
                <select
                  value={selectedItem.status}
                  onChange={(e) =>
                    handleQuickUpdate(selectedItem.id, { status: e.target.value })
                  }
                  className="bg-[#f4efe4] border border-[#b5a894] text-[11px] font-bold text-[#0f172a] px-2 py-1 rounded focus:outline-none focus:border-[#1d4ed8]"
                >
                  <option value="DISCOVERED">발굴됨</option>
                  <option value="BOOKMARKED">관심검토</option>
                  <option value="PREPARING">신청준비중</option>
                  <option value="APPLIED">접수완료</option>
                  <option value="ARCHIVED">마감/보류</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(selectedItem.id)}
                  className="p-1 hover:bg-[#fee2e2] text-[#b91c1c] rounded border border-transparent hover:border-[#fecaca] transition"
                  title="항목 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h3 className="text-sm font-bold text-[#0f172a] leading-snug">
              {selectedItem.title}
            </h3>

            {/* 우측 패널 보기 모드 전환 탭 (요약·전략 브리핑 vs 수집 원문 전문 보기) + 전체화면 원문 모달 버튼 */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1 bg-[#ebe5d8] p-0.5 rounded border border-[#b5a894]">
                <button
                  type="button"
                  onClick={() => setRightViewMode("SUMMARY")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition ${
                    rightViewMode === "SUMMARY"
                      ? "bg-[#1d4ed8] text-white shadow-2xs"
                      : "text-[#334155] hover:bg-[#dcd4c4]"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>요약 · 실행전략</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightViewMode("ORIGINAL")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition ${
                    rightViewMode === "ORIGINAL"
                      ? "bg-[#1d4ed8] text-white shadow-2xs"
                      : "text-[#334155] hover:bg-[#dcd4c4]"
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  <span>수집 원문 보기</span>
                </button>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSaveToObsidian(selectedItem)}
                  className="px-2.5 py-1 rounded bg-violet-700 hover:bg-violet-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs whitespace-nowrap transition"
                  title="이 공고 및 원문을 옵시디언 노트(.md) 보관소로 즉시 저장합니다"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>옵시디언 노트 저장</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenOriginalModal(selectedItem)}
                  className="px-2.5 py-1 rounded bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs whitespace-nowrap transition"
                >
                  <Eye className="w-3 h-3" />
                  <span>원문 크게 보기</span>
                </button>

                {selectedItem.sourceUrl && (
                  <a
                    href={selectedItem.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-[#f4efe4] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#93c5fd] text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap transition"
                  >
                    <span>원문 사이트 이동</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 상세 바디 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
            {rightViewMode === "ORIGINAL" ? (
              /* === [모드 2: 수집 원문 전문 보기 뷰] === */
              <div className="flex flex-col gap-2.5 h-full">
                <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#ebe5d8] p-2 rounded border border-[#b5a894]">
                  <span className="text-[11px] font-bold text-[#0f172a] flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    <span>수집된 공고 / 기사 원문 텍스트</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={fetchingOriginal}
                      onClick={() => handleFetchOriginalContent(selectedItem, false)}
                      className="px-2 py-1 rounded bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] text-[10.5px] font-bold flex items-center gap-1 whitespace-nowrap transition"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${fetchingOriginal ? "animate-spin" : ""}`}
                      />
                      <span>{fetchingOriginal ? "추출 중..." : "웹페이지 원문 재수집"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(formattedOriginalText);
                        showToast("원문 전체 텍스트가 복사되었습니다.");
                      }}
                      className="px-2 py-1 rounded bg-white hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#93c5fd] text-[10.5px] font-bold flex items-center gap-1 whitespace-nowrap transition"
                    >
                      <Copy className="w-3 h-3" />
                      <span>원문 복사</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-white border border-[#b5a894] rounded p-3.5 font-sans text-xs text-[#0f172a] leading-relaxed whitespace-pre-wrap overflow-y-auto select-text shadow-inner">
                  {formattedOriginalText}
                </div>
              </div>
            ) : (
              /* === [모드 1: 요약·실행전략 & 원문 미리보기 통합 뷰] === */
              <>
                {/* 핵심 제원 2x2 그리드 */}
                <div className="grid grid-cols-2 gap-2 bg-[#ebe5d8] p-2.5 rounded border border-[#b5a894]">
                  <div>
                    <span className="text-[10.5px] text-[#475569] block">지원규모 / 예산</span>
                    <span className="font-mono font-bold text-[#1d4ed8]">
                      {selectedItem.supportAmount || "공고문 참조"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-[#475569] block">접수기간 / 구분</span>
                    <span className="font-mono font-bold text-[#0f172a]">
                      {selectedItem.startDate || "-"} ~ {selectedItem.endDate || "-"}{" "}
                      {selectedItem.ddayLabel ? `(${selectedItem.ddayLabel})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-[#475569] block">대상 지역</span>
                    <span className="font-semibold text-[#0f172a]">
                      {selectedItem.region || "전국"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-[#475569] block">지원 대상</span>
                    <span className="font-semibold text-[#0f172a]">
                      {selectedItem.targetAudience || "중소기업"}
                    </span>
                  </div>
                </div>

                {/* Google AI Ultra 원클릭 연동 브릿지 박스 */}
                <div className="p-2.5 rounded border border-[#93c5fd] bg-[#eff6ff] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#1e40af] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        Google AI Ultra (Gemini Deep Research · NotebookLM) 즉시 활용
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyUltraPrompt(selectedItem)}
                      className="px-2 py-1.5 rounded bg-white hover:bg-[#dbeafe] text-[#1e3a8a] border border-[#93c5fd] text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap transition"
                    >
                      <Copy className="w-3 h-3" />
                      <span>사업계획서 프롬프트 복사</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyUltraPrompt(selectedItem, "GEMINI")}
                      className="px-2 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap transition"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Gemini Ultra 열기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyUltraPrompt(selectedItem, "NOTEBOOKLM")}
                      className="px-2 py-1.5 rounded bg-[#047857] hover:bg-[#065f46] text-white text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap transition"
                    >
                      <FileText className="w-3 h-3" />
                      <span>NotebookLM 열기</span>
                    </button>
                  </div>
                </div>

                {/* 핵심 요약 및 당사 활용 포인트 */}
                <div className="bg-[#ebe5d8] p-2.5 rounded border border-[#b5a894] space-y-1">
                  <div className="font-bold text-[#0f172a] text-[11px]">
                    핵심 요약 및 (주)드래곤알피에이 활용 포인트
                  </div>
                  <p className="text-[#334155] leading-relaxed whitespace-pre-line">
                    {selectedItem.summary || "요약 정보가 없습니다."}
                  </p>
                </div>

                {/* 수집 원문 본문 섹션 (요약 탭에서도 바로 확인 가능) */}
                <div className="bg-white p-3 rounded border border-[#b5a894] space-y-1.5">
                  <div className="flex items-center justify-between border-b border-[#e2dbcd] pb-1.5">
                    <span className="font-bold text-[#1e3a8a] text-[11px] flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>수집된 공고 / 뉴스 원문 내용</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenOriginalModal(selectedItem)}
                        className="px-2 py-0.5 rounded bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#93c5fd] text-[10.5px] font-bold"
                      >
                        원문 전체화면 열기
                      </button>
                    </div>
                  </div>
                  <div className="text-[#0f172a] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto pr-1 text-[11.5px]">
                    {formattedOriginalText}
                  </div>
                </div>

                {/* 신청 자격 및 요건 */}
                {selectedItem.eligibilityDetail && (
                  <div className="bg-[#ebe5d8] p-2.5 rounded border border-[#b5a894] space-y-1">
                    <div className="font-bold text-[#0f172a] text-[11px]">
                      신청 자격 및 우대 요건
                    </div>
                    <p className="text-[#334155] leading-relaxed whitespace-pre-line">
                      {selectedItem.eligibilityDetail}
                    </p>
                  </div>
                )}

                {/* 단계별 실행 플랜 */}
                {selectedItem.actionPlan && (
                  <div className="bg-[#ebe5d8] p-2.5 rounded border border-[#b5a894] space-y-1">
                    <div className="font-bold text-[#047857] text-[11px]">
                      권장 실행 플랜 (Action Plan)
                    </div>
                    <p className="text-[#334155] leading-relaxed whitespace-pre-line">
                      {selectedItem.actionPlan}
                    </p>
                  </div>
                )}

                {/* 사내 검토 메모 (즉시 저장) */}
                <div className="bg-[#ebe5d8] p-2.5 rounded border border-[#b5a894] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#0f172a] text-[11px]">
                      사내 검토 및 준비 메모
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickUpdate(selectedItem.id, { memo: memoDraft })
                      }
                      className="px-2.5 py-0.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[10.5px] font-bold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>메모 저장</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={memoDraft}
                    onChange={(e) => setMemoDraft(e.target.value)}
                    placeholder="담당자 배정, 필요 서류, 컨소시엄 대상 고객사 등 메모 기록"
                    className="w-full bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-xs text-[#475569]">
          좌측 목록에서 정부지원사업 또는 뉴스/트렌드 항목을 선택하세요.
        </div>
      )}
    </div>
  );
};
