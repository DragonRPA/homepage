"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Printer,
  CheckCircle2,
  Bookmark,
  Scale,
} from "lucide-react";
import {
  MOEL_STANDARD_WORK_RULES,
  WORK_RULES_REVISION_DATE,
  type WorkRuleChapter,
} from "../data/workRulesStandardData";

interface WorkRulesTabProps {
  currentUser?: any;
}

export const WorkRulesTab: React.FC<WorkRulesTabProps> = () => {
  const [selectedChapterNo, setSelectedChapterNo] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [reqFilter, setReqFilter] = useState<"ALL" | "필수" | "선택">("ALL");

  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOEL_STANDARD_WORK_RULES.map((chapter) => {
      if (selectedChapterNo !== "ALL" && chapter.chapterNo !== selectedChapterNo) {
        return null;
      }
      const matchedArticles = chapter.articles.filter((art) => {
        if (reqFilter !== "ALL" && art.requirementType !== reqFilter) {
          return false;
        }
        if (!q) return true;
        const inTitle = art.title.toLowerCase().includes(q);
        const inBasis = (art.legalBasis || "").toLowerCase().includes(q);
        const inChapter = chapter.chapterTitle.toLowerCase().includes(q);
        const inParagraphs = art.paragraphs.some((p) => p.toLowerCase().includes(q));
        const inArtNo = `제${art.articleNo}조`.includes(q);
        return inTitle || inBasis || inChapter || inParagraphs || inArtNo;
      });
      if (matchedArticles.length === 0) return null;
      return {
        ...chapter,
        articles: matchedArticles,
      };
    }).filter((c): c is WorkRuleChapter => c !== null);
  }, [selectedChapterNo, searchQuery, reqFilter]);

  const totalArticlesCount = useMemo(
    () => MOEL_STANDARD_WORK_RULES.reduce((acc, ch) => acc + ch.articles.length, 0),
    []
  );

  const mandatoryCount = useMemo(
    () =>
      MOEL_STANDARD_WORK_RULES.reduce(
        (acc, ch) => acc + ch.articles.filter((a) => a.requirementType === "필수").length,
        0
      ),
    []
  );

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-[#f4efe4] text-[#1c1917] dark:bg-slate-950 dark:text-slate-100 overflow-hidden select-text">
      {/* Top Header & Scope Bar (Gutenberg Z-Pattern ① & ②) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded border border-[#b5a894] bg-[#ebe5d8] dark:bg-slate-900 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-blue-700 text-white shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-[#0f172a] dark:text-white">
                표준 취업규칙 (고용노동부 최신 표준안)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                전 임직원 상시 열람 (근로기준법 제14조·제93조)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                취업규칙 개정일자: {WORK_RULES_REVISION_DATE}
              </span>
            </div>
            <p className="text-[11px] text-[#57534e] dark:text-slate-400 mt-0.5">
              총 17장 {totalArticlesCount}조 (법정 필수기재사항 {mandatoryCount}개 조항 포함 · 최신 개정일자: {WORK_RULES_REVISION_DATE} · 2025~2026 육아지원 3법 및 산업안전보건법 개정사항 반영)
            </p>
          </div>
        </div>

        {/* Filter & Search Pipeline */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[#57534e] dark:text-slate-400">
              구분 필터
            </label>
            <div className="inline-flex rounded border border-[#b5a894] dark:border-slate-700 overflow-hidden bg-[#f4efe4] dark:bg-slate-800 h-8">
              {(["ALL", "필수", "선택"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReqFilter(type)}
                  className={`px-2.5 text-xs font-bold transition whitespace-nowrap ${
                    reqFilter === type
                      ? "bg-blue-700 text-white"
                      : "text-[#44403c] hover:bg-[#e2dbcd] dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {type === "ALL" ? "전체 조항" : `${type} 기재사항`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[#57534e] dark:text-slate-400">
              조문·키워드 검색
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#78716c]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="연차, 육아휴직, 임금, 괴롭힘, 정년 검색"
                className="h-8 w-64 pl-8 pr-2.5 rounded border border-[#b5a894] bg-[#f4efe4] text-xs text-[#1c1917] font-medium focus:outline-none focus:border-blue-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-transparent select-none">인쇄</label>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-8 px-3 rounded border border-[#b5a894] bg-[#dfd7c7] hover:bg-[#d0c6b4] text-[#1c1917] text-xs font-bold inline-flex items-center gap-1.5 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>취업규칙 인쇄</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Split View: Left Chapter Navigation + Right Full Text Reader */}
      <div className="flex flex-1 min-h-0 gap-3 overflow-hidden">
        {/* Left Chapter Index */}
        <div className="w-64 bg-[#ebe5d8] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-2.5 border-b border-[#b5a894] bg-[#dfd7c7] dark:bg-slate-950 dark:border-slate-800 text-xs font-bold text-[#44403c] dark:text-slate-300 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-blue-700" />
              <span>장별 목차 (제1장~제17장)</span>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            <button
              type="button"
              onClick={() => setSelectedChapterNo("ALL")}
              className={`w-full text-left px-2.5 py-2 rounded text-xs font-bold transition flex items-center justify-between ${
                selectedChapterNo === "ALL"
                  ? "bg-blue-700 text-white shadow-xs"
                  : "text-[#1c1917] hover:bg-[#dfd7c7] dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span>전체 장 열람 (제1장~제17장)</span>
              <span className="text-[10px] font-mono opacity-80">{totalArticlesCount}조</span>
            </button>

            {MOEL_STANDARD_WORK_RULES.map((ch) => {
              const isSelected = selectedChapterNo === ch.chapterNo;
              return (
                <button
                  key={ch.chapterNo}
                  type="button"
                  onClick={() => setSelectedChapterNo(ch.chapterNo)}
                  className={`w-full text-left px-2.5 py-2 rounded text-xs transition block ${
                    isSelected
                      ? "bg-blue-700 text-white font-bold shadow-xs"
                      : "text-[#1c1917] hover:bg-[#dfd7c7] dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate font-semibold">{ch.chapterTitle}</span>
                    <span className="text-[10px] font-mono opacity-75 shrink-0">
                      {ch.articles.length}조
                    </span>
                  </div>
                  <div
                    className={`text-[10px] truncate mt-0.5 ${
                      isSelected ? "text-blue-100" : "text-[#78716c] dark:text-slate-500"
                    }`}
                  >
                    {ch.summary}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Document Body */}
        <div className="flex-1 bg-[#ebe5d8] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded flex flex-col overflow-hidden min-w-0">
          <div className="px-4 py-2.5 border-b border-[#b5a894] bg-[#dfd7c7] dark:bg-slate-950 dark:border-slate-800 text-xs font-bold text-[#44403c] dark:text-slate-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <img
                src="/ci-dragonrpa.png"
                alt="주식회사 드래곤알피에이 CI"
                className="w-6 h-6 rounded bg-white border border-[#b5a894] p-0.5 object-contain shrink-0"
              />
              <span>
                주식회사 드래곤알피에이 취업규칙 전문 (고용노동부 표준취업규칙 기준)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono font-bold text-blue-900 dark:text-blue-300">
                개정일자: {WORK_RULES_REVISION_DATE}
              </span>
              <span className="text-[11px] font-mono text-[#57534e] dark:text-slate-400">
                조회된 장: {filteredChapters.length}개 / 조문:{" "}
                {filteredChapters.reduce((s, c) => s + c.articles.length, 0)}개
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {filteredChapters.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#78716c]">
                검색 조건에 일치하는 취업규칙 조문이 없습니다.
              </div>
            ) : (
              filteredChapters.map((chapter) => (
                <div
                  key={chapter.chapterNo}
                  className="bg-[#f4efe4] dark:bg-slate-950 border border-[#b5a894] dark:border-slate-800 rounded shadow-xs"
                >
                  {/* Chapter Banner */}
                  <div className="px-4 py-3 bg-[#ded6c5] dark:bg-slate-900 border-b border-[#b5a894] dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 rounded-t">
                    <div>
                      <h3 className="text-sm font-bold text-[#0f172a] dark:text-white">
                        {chapter.chapterTitle}
                      </h3>
                      <p className="text-[11px] text-[#57534e] dark:text-slate-400 mt-0.5">
                        {chapter.summary}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-[#ebe5d8] text-[#44403c] border border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shrink-0">
                      총 {chapter.articles.length}개 조문
                    </span>
                  </div>

                  {/* Articles List */}
                  <div className="divide-y divide-[#d0c6b4] dark:divide-slate-800">
                    {chapter.articles.map((art) => {
                      let mainParaCount = 0;
                      const circledNumbers = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
                      const totalMainParas = art.paragraphs.filter((p) => !/^\d+\./.test(p.trim())).length;

                      return (
                        <div key={art.articleNo} className="p-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-blue-900 dark:text-blue-400">
                                제{art.articleNo}조 ({art.title})
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  art.requirementType === "필수"
                                    ? "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                                    : "bg-[#ebe5d8] text-[#57534e] border-[#b5a894] dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                }`}
                              >
                                {art.requirementType}
                              </span>
                            </div>
                            {art.legalBasis && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-[#57534e] dark:text-slate-400 bg-[#ebe5d8] dark:bg-slate-900 px-2 py-0.5 rounded border border-[#c4b6a0] dark:border-slate-800">
                                <Scale className="w-3 h-3 text-blue-700 shrink-0" />
                                <span>근거: {art.legalBasis}</span>
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 pl-1 text-xs leading-relaxed text-[#1c1917] dark:text-slate-200">
                            {art.paragraphs.map((p, idx) => {
                              const isSubList = /^\d+\./.test(p.trim());
                              let prefix = "";
                              if (!isSubList && totalMainParas > 1) {
                                prefix = circledNumbers[mainParaCount] ? `${circledNumbers[mainParaCount]} ` : "";
                                mainParaCount++;
                              }
                              return (
                                <p
                                  key={idx}
                                  className={
                                    isSubList
                                      ? "pl-4 text-xs text-[#334155] dark:text-slate-300"
                                      : ""
                                  }
                                >
                                  {prefix}
                                  {p}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Audit / Legal Compliance Bar (Gutenberg Z-Pattern ④) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded border border-[#b5a894] bg-[#dfd7c7] dark:bg-slate-900 dark:border-slate-800 text-xs text-[#44403c] dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="font-bold">
            법정 게시 의무 준수: 근로기준법 제14조(법령 요지 등의 게시) 및 제93조(취업규칙의 작성·신고)에 의거하여 전 임직원에게 상시 공개됩니다.
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#57534e] dark:text-slate-400">
          취업규칙 개정일자: {WORK_RULES_REVISION_DATE} · 고용노동부 표준취업규칙 기준
        </span>
      </div>
    </div>
  );
};
