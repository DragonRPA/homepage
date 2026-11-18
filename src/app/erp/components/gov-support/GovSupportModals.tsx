"use client";

import React from "react";
import {
  BookOpen,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import {
  AiIntelSettings,
  CATEGORY_META,
  GovSupportCreateForm,
  GovSupportItem,
} from "./govSupportTypes";

interface GovSupportModalsProps {
  originalModalOpen: boolean;
  setOriginalModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedItem: GovSupportItem | null;
  formattedOriginalText: string;
  fetchingOriginal: boolean;
  handleFetchOriginalContent: (item: GovSupportItem, openModalAfter?: boolean) => void;
  handleCopyUltraPrompt: (
    item: GovSupportItem,
    openExternal?: "GEMINI" | "NOTEBOOKLM"
  ) => void;
  showToast: (text: string, type?: "success" | "error") => void;
  settingsModalOpen: boolean;
  setSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSaveSettings: (e: React.FormEvent) => void;
  settings: AiIntelSettings;
  apiKeyInput: string;
  setApiKeyInput: React.Dispatch<React.SetStateAction<string>>;
  modelInput: string;
  setModelInput: React.Dispatch<React.SetStateAction<string>>;
  profileInput: string;
  setProfileInput: React.Dispatch<React.SetStateAction<string>>;
  keywordsInput: string;
  setKeywordsInput: React.Dispatch<React.SetStateAction<string>>;
  createModalOpen: boolean;
  setCreateModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleCreateItem: (e: React.FormEvent) => void;
  newForm: GovSupportCreateForm;
  setNewForm: React.Dispatch<React.SetStateAction<GovSupportCreateForm>>;
}

export const GovSupportModals: React.FC<GovSupportModalsProps> = ({
  originalModalOpen,
  setOriginalModalOpen,
  selectedItem,
  formattedOriginalText,
  fetchingOriginal,
  handleFetchOriginalContent,
  handleCopyUltraPrompt,
  showToast,
  settingsModalOpen,
  setSettingsModalOpen,
  handleSaveSettings,
  settings,
  apiKeyInput,
  setApiKeyInput,
  modelInput,
  setModelInput,
  profileInput,
  setProfileInput,
  keywordsInput,
  setKeywordsInput,
  createModalOpen,
  setCreateModalOpen,
  handleCreateItem,
  newForm,
  setNewForm,
}) => {
  return (
    <>
      {/* 모달 0: 수집 원문 전체보기 (Original Content Reader Modal) */}
      {originalModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg w-full max-w-4xl max-h-[88vh] shadow-2xl flex flex-col overflow-hidden">
            {/* 모달 헤더 */}
            <div className="px-4 py-3 bg-[#e2dbcd] border-b border-[#b5a894] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                <span
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold border shrink-0 ${
                    (CATEGORY_META[selectedItem.category] || CATEGORY_META.SUPPORT).badgeClass
                  }`}
                >
                  {(CATEGORY_META[selectedItem.category] || CATEGORY_META.SUPPORT).label}
                </span>
                <h2 className="text-sm font-bold text-[#0f172a] truncate">
                  {selectedItem.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOriginalModalOpen(false)}
                className="p-1 hover:bg-black/10 rounded shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 모달 툴바 */}
            <div className="px-4 py-2 bg-[#f4efe4] border-b border-[#b5a894] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#334155]">
                <span>
                  주관기관/출처: <strong className="text-[#0f172a]">{selectedItem.agency}</strong>
                </span>
                <span>|</span>
                <span>
                  지원규모:{" "}
                  <strong className="font-mono text-[#1d4ed8]">
                    {selectedItem.supportAmount || "-"}
                  </strong>
                </span>
                <span>|</span>
                <span>
                  기간:{" "}
                  <strong className="font-mono text-[#0f172a]">
                    {selectedItem.startDate || "-"} ~ {selectedItem.endDate || "-"}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={fetchingOriginal}
                  onClick={() => handleFetchOriginalContent(selectedItem, true)}
                  className="px-2.5 py-1 rounded bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] text-xs font-bold flex items-center gap-1 whitespace-nowrap transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fetchingOriginal ? "animate-spin" : ""}`} />
                  <span>{fetchingOriginal ? "웹 원문 추출 중..." : "웹페이지 원문 실시간 추출"}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(formattedOriginalText);
                    showToast("수집 원문 전체가 클립보드에 복사되었습니다.");
                  }}
                  className="px-2.5 py-1 rounded bg-white hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#93c5fd] text-xs font-bold flex items-center gap-1 whitespace-nowrap transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>원문 전체 복사</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyUltraPrompt(selectedItem, "GEMINI")}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>원문 포함 Gemini Ultra 분석</span>
                </button>

                {selectedItem.sourceUrl && (
                  <a
                    href={selectedItem.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap transition"
                  >
                    <span>공식 원문 웹페이지 열기</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* 모달 본문 (수집 원문 전문 리더) */}
            <div className="flex-1 overflow-y-auto p-5 bg-white text-[#0f172a]">
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="p-4 rounded bg-[#f8fafc] border border-[#cbd5e1] text-xs leading-relaxed whitespace-pre-wrap font-sans select-text">
                  {formattedOriginalText}
                </div>

                {selectedItem.eligibilityDetail && (
                  <div className="p-3.5 rounded bg-[#f4efe4] border border-[#b5a894] text-xs space-y-1">
                    <div className="font-bold text-[#0f172a]">신청 자격 및 우대사항 상세</div>
                    <div className="whitespace-pre-line text-[#334155] leading-relaxed">
                      {selectedItem.eligibilityDetail}
                    </div>
                  </div>
                )}

                {selectedItem.actionPlan && (
                  <div className="p-3.5 rounded bg-[#ecfdf5] border border-[#a7f3d0] text-xs space-y-1">
                    <div className="font-bold text-[#065f46]">
                      (주)드래곤알피에이 실무 실행 체크리스트
                    </div>
                    <div className="whitespace-pre-line text-[#065f46] leading-relaxed">
                      {selectedItem.actionPlan}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-4 py-2.5 bg-[#e2dbcd] border-t border-[#b5a894] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-[#475569] font-mono truncate max-w-xl">
                출처 URL: {selectedItem.sourceUrl || "-"}
              </span>
              <button
                type="button"
                onClick={() => setOriginalModalOpen(false)}
                className="px-4 py-1.5 rounded bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달 1: Google AI 연동 및 당사 맞춤 프로필 설정 */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSettings}
            className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-lg shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#b5a894]">
              <div className="flex items-center gap-1.5 font-bold text-sm text-[#0f172a]">
                <Settings className="w-4 h-4 text-[#1d4ed8]" />
                <span>Google AI (Gemini) 연동 및 맞춤 기업 프로필 설정</span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="p-1 hover:bg-black/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded bg-[#f4efe4] border border-[#b5a894] text-[11px] text-[#334155] space-y-1">
                <div>
                  • <strong>실시간 뉴스·공고 RSS 수집</strong> 및{" "}
                  <strong>Google AI Ultra 프롬프트 브릿지(Gemini / NotebookLM)</strong>는 별도 API 키 없이도 즉시 작동합니다.
                </div>
                <div>
                  • Google AI Studio에서 발급한 <strong>Gemini API Key</strong>를 등록하시면 ERP 내에서 Gemini 2.5 Pro + Google 검색 그라운딩이 직접 실행되어 적합도 점수와 원문·요약을 자동 생성합니다.
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">
                  Google Gemini API Key{" "}
                  {settings.hasApiKey
                    ? `(현재 등록됨: ${settings.maskedApiKey})`
                    : "(선택사항)"}
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={
                    settings.hasApiKey
                      ? "변경할 경우에만 새 API Key 입력 (비워두면 기존 키 유지)"
                      : "AIzaSy... (Google AI Studio API Key 입력)"
                  }
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-1.5 text-xs font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">기본 분석 AI 모델</label>
                <select
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-1.5 text-xs font-bold"
                >
                  <option value="gemini-2.5-pro">
                    gemini-2.5-pro (심층 추론 · 사업계획서 분석 최적화)
                  </option>
                  <option value="gemini-2.5-flash">
                    gemini-2.5-flash (고속 탐색 · 대량 뉴스 요약)
                  </option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">
                  당사 기업 프로필 (AI 적합도 산출 기준)
                </label>
                <textarea
                  rows={3}
                  value={profileInput}
                  onChange={(e) => setProfileInput(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-1.5 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">
                  핵심 탐색 키워드 (쉼표 구분)
                </label>
                <textarea
                  rows={2}
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#b5a894]">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="px-3 py-1.5 rounded bg-[#dcd4c4] hover:bg-[#d0c6b4] text-xs font-bold border border-[#b5a894]"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold shadow"
              >
                설정 저장
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 모달 2: 수동 공고/뉴스/트렌드 등록 */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateItem}
            className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-lg shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#b5a894]">
              <div className="flex items-center gap-1.5 font-bold text-sm text-[#0f172a]">
                <Plus className="w-4 h-4 text-[#1d4ed8]" />
                <span>정부지원사업 · 뉴스 · 트렌드 직접 등록</span>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 hover:bg-black/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155]">분류</label>
                  <select
                    value={newForm.category}
                    onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5"
                  >
                    <option value="SUPPORT">정부지원·바우처</option>
                    <option value="PROCUREMENT">나라장터·공공입찰</option>
                    <option value="NEWS">정책·산업뉴스</option>
                    <option value="TREND">AI·렌탈 트렌드</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155]">주관기관 / 출처</label>
                  <input
                    type="text"
                    value={newForm.agency}
                    onChange={(e) => setNewForm({ ...newForm, agency: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">공고 / 뉴스 제목</label>
                <input
                  type="text"
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  placeholder="공고명 또는 뉴스 제목 입력"
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155]">지원규모 / 핵심지표</label>
                  <input
                    type="text"
                    value={newForm.supportAmount}
                    onChange={(e) =>
                      setNewForm({ ...newForm, supportAmount: e.target.value })
                    }
                    placeholder="예: 최대 6,000만원 (국비 70%)"
                    className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155]">마감일 (또는 상시)</label>
                  <input
                    type="text"
                    value={newForm.endDate}
                    onChange={(e) => setNewForm({ ...newForm, endDate: e.target.value })}
                    placeholder="예: 2026-12-15 또는 상시"
                    className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">원문 URL</label>
                <input
                  type="text"
                  value={newForm.sourceUrl}
                  onChange={(e) => setNewForm({ ...newForm, sourceUrl: e.target.value })}
                  placeholder="https://..."
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">핵심 요약</label>
                <textarea
                  rows={2}
                  value={newForm.summary}
                  onChange={(e) => setNewForm({ ...newForm, summary: e.target.value })}
                  placeholder="핵심 요약 내용 입력"
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">
                  수집 원문 전문 (공고문/기사 본문 전체 붙여넣기)
                </label>
                <textarea
                  rows={4}
                  value={newForm.originalContent}
                  onChange={(e) =>
                    setNewForm({ ...newForm, originalContent: e.target.value })
                  }
                  placeholder="공고문 원문이나 뉴스 기사 본문을 붙여넣으시면 원문 보기에서 언제든 열람 가능합니다."
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#b5a894]">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3 py-1.5 rounded bg-[#dcd4c4] hover:bg-[#d0c6b4] text-xs font-bold border border-[#b5a894]"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold shadow"
              >
                등록 저장
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
