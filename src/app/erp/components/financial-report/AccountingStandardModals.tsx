"use client";

import React from "react";
import {
  BookOpen,
  ShieldCheck,
  X,
  CheckCircle2,
  Scale,
  ExternalLink,
  FileText,
} from "lucide-react";
import {
  ACCOUNTING_STANDARDS_META,
  type StandardArticle,
  type CommentarySection,
} from "../../data/accountingStandardsMeta";
import type {
  AccountSubjectStandardInfo,
  SMEAccountingAuditItem,
} from "../../data/accountSubjectStandardsMap";

interface AccountingStandardModalsProps {
  standardModalInfo: AccountSubjectStandardInfo | null;
  standardLinkedDetail: {
    articles: StandardArticle[];
    commentaries: CommentarySection[];
  };
  onCloseStandardModal: () => void;
  onOpenStandardModal: (keyOrSubAccount: string, fallbackMajor?: string) => void;
  showComplianceAuditModal: boolean;
  complianceAuditSummary: SMEAccountingAuditItem[];
  onOpenComplianceAuditModal: () => void;
  onCloseComplianceAuditModal: () => void;
}

export const AccountingStandardModals: React.FC<AccountingStandardModalsProps> = ({
  standardModalInfo,
  standardLinkedDetail,
  onCloseStandardModal,
  onOpenStandardModal,
  showComplianceAuditModal,
  complianceAuditSummary,
  onOpenComplianceAuditModal,
  onCloseComplianceAuditModal,
}) => {
  return (
    <>
      {/* 5. 계정과목 분류 더블클릭 ➔ 준용 중소기업회계기준 설명 모달 */}
      {standardModalInfo && (
        <div
          onClick={onCloseStandardModal}
          className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-2.5 md:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl max-h-[90vh] bg-[#ebe5d8] dark:bg-slate-900 border-2 border-[#b5a894] dark:border-slate-700 rounded shadow-2xl flex flex-col overflow-hidden text-[#0f172a] dark:text-slate-100"
          >
            {/* 모달 헤더 */}
            <div className="px-4 py-3 bg-[#0f172a] text-white border-b border-[#334155] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpen className="w-5 h-5 text-[#38bdf8] shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#1e293b] text-[#93c5fd] border border-[#3b82f6]/40 whitespace-nowrap">
                      {standardModalInfo.categoryLabel}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                        standardModalInfo.complianceStatus === "적합"
                          ? "bg-[#065f46] text-[#a7f3d0] border border-[#10b981]/50"
                          : "bg-[#78350f] text-[#fde68a] border border-[#f59e0b]/50"
                      }`}
                    >
                      {standardModalInfo.complianceBadge} ({standardModalInfo.complianceStatus})
                    </span>
                    <span className="text-[11px] font-mono text-slate-300 whitespace-nowrap">
                      {ACCOUNTING_STANDARDS_META.standardNoticeNo}
                    </span>
                  </div>
                  <h3 className="text-sm md:text-base font-extrabold text-white mt-1 truncate">
                    {standardModalInfo.title} — 준용 중소기업회계기준 및 회계처리 해설
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onCloseStandardModal();
                    onOpenComplianceAuditModal();
                  }}
                  className="px-2.5 py-1 rounded text-xs font-bold bg-[#1e293b] hover:bg-[#334155] text-[#fde68a] border border-[#b45309] flex items-center gap-1 whitespace-nowrap transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#34d399]" />
                  <span>전체 부합 검증표</span>
                </button>
                <button
                  type="button"
                  onClick={onCloseStandardModal}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  title="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 모달 본문 */}
            {(() => {
              const { articles, commentaries } = standardLinkedDetail;
              return (
                <div className="flex-1 overflow-y-auto p-3.5 md:p-5 space-y-4 text-xs leading-relaxed">
                  {/* ① 당사 ERP 회계처리 및 중소기업회계기준 준용 핵심 요약 */}
                  <div className="bg-[#f4efe4] dark:bg-slate-950 border border-[#b5a894] dark:border-slate-800 rounded p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-[#d5cbb8] dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 font-extrabold text-xs text-[#1e3a8a] dark:text-blue-300">
                        <CheckCircle2 className="w-4 h-4 text-[#047857] dark:text-emerald-400 shrink-0" />
                        <span>1. 당사 회계처리 기준 및 중소기업회계기준 준용 요약</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                        준거 조문: {articles.map((a) => `${a.articleNo}(${a.articleTitle})`).join(" · ")}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-[#0f172a] dark:text-slate-100 bg-[#ebe5d8]/70 dark:bg-slate-900 p-2.5 rounded border border-[#c4b6a0] dark:border-slate-800">
                      {standardModalInfo.appliedBasisSummary}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div className="p-2.5 rounded bg-white/80 dark:bg-slate-900 border border-[#d5cbb8] dark:border-slate-800">
                        <div className="text-[11px] font-extrabold text-[#1d4ed8] dark:text-blue-400 mb-1 whitespace-nowrap">
                          · 인식 기준 및 시점 (Recognition)
                        </div>
                        <div className="text-xs text-[#334155] dark:text-slate-300">
                          {standardModalInfo.recognitionTiming}
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-white/80 dark:bg-slate-900 border border-[#d5cbb8] dark:border-slate-800">
                        <div className="text-[11px] font-extrabold text-[#047857] dark:text-emerald-400 mb-1 whitespace-nowrap">
                          · 측정 및 평가 원칙 (Measurement)
                        </div>
                        <div className="text-xs text-[#334155] dark:text-slate-300">
                          {standardModalInfo.measurementPrinciple}
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-white/80 dark:bg-slate-900 border border-[#d5cbb8] dark:border-slate-800">
                        <div className="text-[11px] font-extrabold text-[#6d28d9] dark:text-violet-400 mb-1 whitespace-nowrap">
                          · 당사 ERP 집계 산식 및 전표 매핑 로직
                        </div>
                        <div className="text-xs font-mono text-[#0f172a] dark:text-slate-200">
                          {standardModalInfo.erpFormulaOrLogic}
                        </div>
                      </div>

                      {standardModalInfo.taxLawHarmonization && (
                        <div className="p-2.5 rounded bg-[#fef3c7]/60 dark:bg-amber-950/30 border border-[#f59e0b]/50 dark:border-amber-800">
                          <div className="text-[11px] font-extrabold text-[#92400e] dark:text-amber-300 mb-1 whitespace-nowrap">
                            · 세법(법인세법·부가가치세법) 조화 및 소규모 기업 특례
                          </div>
                          <div className="text-xs text-[#78350f] dark:text-amber-200">
                            {standardModalInfo.taxLawHarmonization}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ② 관련 중소기업회계기준 조문 원문 (법무부고시 제2013-0029호) */}
                  <div className="bg-[#f4efe4] dark:bg-slate-950 border border-[#b5a894] dark:border-slate-800 rounded p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 border-b border-[#d5cbb8] dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 font-extrabold text-xs text-[#0f172a] dark:text-slate-100">
                        <Scale className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400 shrink-0" />
                        <span>
                          2. 준용 중소기업회계기준 조문 원문 ({ACCOUNTING_STANDARDS_META.standardTitle} · 총{" "}
                          {articles.length}개 조문)
                        </span>
                      </div>
                      <a
                        href={ACCOUNTING_STANDARDS_META.standardPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 hover:underline whitespace-nowrap"
                      >
                        <span>법무부고시 원문 PDF</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="space-y-2.5">
                      {articles.map((art) => (
                        <div
                          key={art.id}
                          className="p-3 rounded bg-white dark:bg-slate-900 border border-[#c4b6a0] dark:border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-[#1e3a8a] dark:text-blue-300">
                              {art.articleNo} ({art.articleTitle})
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ebe5d8] dark:bg-slate-800 text-[#475569] dark:text-slate-400">
                              {art.chapterNo} · {art.chapterTitle}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-[#1e293b] dark:text-slate-200">
                            {art.paragraphs.map((p, idx) => (
                              <p key={idx} className="leading-relaxed">
                                {p}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ③ 관련 중소기업회계기준 해설서 (법무부·회계기준원 2013 해설서) */}
                  {commentaries.length > 0 && (
                    <div className="bg-[#f4efe4] dark:bg-slate-950 border border-[#b5a894] dark:border-slate-800 rounded p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 border-b border-[#d5cbb8] dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5 font-extrabold text-xs text-[#0f172a] dark:text-slate-100">
                          <FileText className="w-4 h-4 text-[#047857] dark:text-emerald-400 shrink-0" />
                          <span>
                            3. 중소기업회계기준 해설서 실무 지침 및 분개 사례 ({commentaries.length}개 해설 섹션)
                          </span>
                        </div>
                        <a
                          href={ACCOUNTING_STANDARDS_META.commentaryPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#047857] dark:text-emerald-400 hover:underline whitespace-nowrap"
                        >
                          <span>해설서 원문 PDF</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="space-y-3">
                        {commentaries.map((com) => (
                          <div
                            key={com.id}
                            className="p-3 rounded bg-white dark:bg-slate-900 border border-[#c4b6a0] dark:border-slate-800 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#ebe5d8] dark:border-slate-800 pb-1.5">
                              <span className="font-extrabold text-xs text-[#065f46] dark:text-emerald-300">
                                {com.sectionNo} {com.sectionTitle}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ecfdf5] dark:bg-emerald-950 text-[#047857] dark:text-emerald-300 border border-[#a7f3d0]/60">
                                {com.chapterNo} {com.chapterTitle}
                              </span>
                            </div>

                            {com.explanations && com.explanations.length > 0 && (
                              <div className="space-y-1.5 text-xs text-[#334155] dark:text-slate-300">
                                {com.explanations.map((exp, idx) => (
                                  <div key={idx} className="leading-relaxed">
                                    <span className="font-bold text-[#0f172a] dark:text-slate-100">
                                      · {exp.heading}:{" "}
                                    </span>
                                    <span className="whitespace-pre-line">{exp.body}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {com.summaryTable && (
                              <div className="pt-1">
                                <div className="text-[11px] font-bold text-[#475569] dark:text-slate-400 mb-1">
                                  [핵심 비교·요약표]
                                </div>
                                <pre className="p-2 rounded bg-[#ebe5d8]/70 dark:bg-slate-800 border border-[#c4b6a0] dark:border-slate-700 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap text-[#0f172a] dark:text-slate-200">
                                  {com.summaryTable}
                                </pre>
                              </div>
                            )}

                            {com.cases && com.cases.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                {com.cases.map((cs, ci) => (
                                  <div
                                    key={ci}
                                    className="p-2 rounded bg-[#f4efe4] dark:bg-slate-950 border border-[#d5cbb8] dark:border-slate-800 text-[11px]"
                                  >
                                    <div className="font-bold text-[#1e3a8a] dark:text-blue-300 mb-0.5">
                                      [{cs.caseNo}] {cs.title}
                                    </div>
                                    <pre className="p-1.5 rounded bg-[#0f172a] text-[#e2e8f0] font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                                      {cs.body}
                                    </pre>
                                  </div>
                                ))}
                              </div>
                            )}

                            {com.references && com.references.length > 0 && (
                              <div className="space-y-1 pt-1">
                                {com.references.map((ref, ri) => (
                                  <div
                                    key={ri}
                                    className="p-2 rounded bg-[#fef3c7]/50 dark:bg-amber-950/30 border border-[#fde68a] dark:border-amber-800/60 text-[11px]"
                                  >
                                    <div className="font-bold text-[#92400e] dark:text-amber-300">
                                      {ref.title}
                                    </div>
                                    <div className="text-[#78350f] dark:text-amber-200 mt-0.5 whitespace-pre-line">
                                      {ref.body}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 모달 푸터: 빠른 계정 전환 & 닫기 */}
            <div className="px-4 py-2.5 bg-[#e2dbcd] dark:bg-slate-800 border-t border-[#b5a894] dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
                  대분류 바로가기:
                </span>
                {[
                  { key: "REVENUE", label: "Ⅰ.매출액" },
                  { key: "COGS", label: "Ⅱ.매출원가" },
                  { key: "PAYROLL", label: "Ⅲ.급여·인건비" },
                  { key: "OPEX", label: "Ⅳ.판관비" },
                  { key: "TAX_DUES", label: "Ⅴ.세금과공과" },
                  { key: "NON_OP", label: "Ⅵ.영업외·자금" },
                  { key: "DEPREC_SCHEDULE", label: "유형자산·감가상각" },
                ].map((btn) => (
                  <button
                    key={btn.key}
                    type="button"
                    onClick={() => onOpenStandardModal(btn.key)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border whitespace-nowrap transition ${
                      standardModalInfo.key === btn.key
                        ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                        : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onCloseStandardModal}
                className="px-3.5 py-1 rounded bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold text-xs whitespace-nowrap transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 당사 회계처리 중소기업회계기준 부합성 검증 총괄 보고서 모달 */}
      {showComplianceAuditModal && (
        <div
          onClick={onCloseComplianceAuditModal}
          className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-2.5 md:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl max-h-[90vh] bg-[#ebe5d8] dark:bg-slate-900 border-2 border-[#b5a894] dark:border-slate-700 rounded shadow-2xl flex flex-col overflow-hidden text-[#0f172a] dark:text-slate-100"
          >
            <div className="px-4 py-3 bg-[#0f172a] text-white border-b border-[#334155] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#34d399] shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#065f46] text-[#a7f3d0] border border-[#10b981]/50">
                      전 항목 적합 (6대 영역 · 제1조~제56조)
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">
                      {ACCOUNTING_STANDARDS_META.standardNoticeNo}
                    </span>
                  </div>
                  <h3 className="text-sm md:text-base font-extrabold text-white mt-0.5">
                    주식회사 드래곤알피에이 회계처리 — 중소기업회계기준 부합성 검증 보고서
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseComplianceAuditModal}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 md:p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded bg-[#ecfdf5] dark:bg-emerald-950/40 border border-[#059669] text-[#065f46] dark:text-emerald-200">
                <div className="font-extrabold text-xs mb-1">
                  ■ 종합 검증 의견: 중소기업회계기준(법무부고시 제2013-0029호) 적정 부합
                </div>
                <p className="leading-relaxed">
                  당사((주)드래곤알피에이 및 개인사업자 드래곤알피에이)의 결산재무제표 및 월별 손익·유형자산 집계 로직을 중소기업회계기준 본문 제1조~제56조 및 해설서 제1장~제18장과 대조 검증한 결과, 재무제표의 체계·수익인식·임대자산 자산화 및 감가상각·확정기여형 퇴직급여·세법 조화 특례(현재가치평가 면제, 이연법인세 면제, 법인세법 내용연수 적용) 전 항목이 기준에 부합합니다.
                </p>
              </div>

              <div className="space-y-2.5">
                {complianceAuditSummary.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded bg-[#f4efe4] dark:bg-slate-950 border border-[#b5a894] dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#d5cbb8] dark:border-slate-800 pb-1.5">
                      <span className="font-extrabold text-xs text-[#1e3a8a] dark:text-blue-300">
                        {idx + 1}. {item.standardTopic}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-[#c4b6a0] dark:border-slate-700 text-[#334155] dark:text-slate-300">
                          {item.chapterAndArticle}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#d1fae5] text-[#065f46] border border-[#059669]/40">
                          ✓ {item.verdict}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-0.5">
                      <div className="p-2 rounded bg-white/80 dark:bg-slate-900 border border-[#d5cbb8] dark:border-slate-800">
                        <div className="text-[10px] font-bold text-[#64748b] mb-0.5">
                          중소기업회계기준 요구사항
                        </div>
                        <div className="text-[#334155] dark:text-slate-300 leading-relaxed">
                          {item.smeRequirement}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-white/80 dark:bg-slate-900 border border-[#d5cbb8] dark:border-slate-800">
                        <div className="text-[10px] font-bold text-[#047857] dark:text-emerald-400 mb-0.5">
                          당사 ERP 실제 회계처리 및 검증 결과
                        </div>
                        <div className="text-[#0f172a] dark:text-slate-200 leading-relaxed">
                          {item.erpImplementation}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 py-2.5 bg-[#e2dbcd] dark:bg-slate-800 border-t border-[#b5a894] dark:border-slate-700 flex items-center justify-between gap-2 shrink-0 text-xs">
              <span className="text-[11px] text-[#475569] dark:text-slate-400">
                * 경영지표보고서 내 각 계정과목 분류 항목을 더블클릭하면 개별 계정의 조문·해설·산식을 확인할 수 있습니다.
              </span>
              <button
                type="button"
                onClick={onCloseComplianceAuditModal}
                className="px-3.5 py-1 rounded bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold text-xs whitespace-nowrap transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
