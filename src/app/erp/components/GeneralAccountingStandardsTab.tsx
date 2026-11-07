"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search,
  BookOpen,
  FileText,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ExternalLink,
  Bookmark,
  Scale,
  Calculator,
} from "lucide-react";
import {
  GENERAL_ACCOUNTING_STANDARDS_META,
  GENERAL_STANDARD_CHAPTERS,
  GENERAL_STANDARD_ARTICLES,
  GENERAL_GUIDANCE_SECTIONS,
  GeneralStandardParagraph,
  GeneralGuidanceSection,
} from "../data/generalAccountingStandardsData";

const QUICK_KEYWORDS = [
  "중소기업 회계처리 특례",
  "유형자산",
  "운용리스",
  "금융리스",
  "수익인식",
  "대손충당금",
  "지분법",
  "무형자산",
  "개발비",
  "퇴직급여충당부채",
  "이연법인세",
  "충당부채",
];

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const trimmed = query.trim();
  if (!trimmed) {
    return <>{text}</>;
  }
  const regex = new RegExp(`(${escapeRegExp(trimmed)})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, idx) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={idx}
            className="bg-amber-300 text-slate-950 font-bold px-0.5 rounded-sm shadow-xs"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function matchesArticle(article: GeneralStandardParagraph, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (article.chapterNo.toLowerCase().includes(q)) return true;
  if (article.chapterTitle.toLowerCase().includes(q)) return true;
  if (article.articleNo.toLowerCase().includes(q)) return true;
  if (article.articleTitle.toLowerCase().includes(q)) return true;
  if (article.keywords.some((k) => k.toLowerCase().includes(q))) return true;
  if (article.paragraphs.some((p) => p.toLowerCase().includes(q))) return true;
  return false;
}

function matchesGuidance(section: GeneralGuidanceSection, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (section.chapterNo.toLowerCase().includes(q)) return true;
  if (section.chapterTitle.toLowerCase().includes(q)) return true;
  if (section.sectionNo.toLowerCase().includes(q)) return true;
  if (section.sectionTitle.toLowerCase().includes(q)) return true;
  if (section.summaryTable && section.summaryTable.toLowerCase().includes(q)) return true;
  if (section.keywords.some((k) => k.toLowerCase().includes(q))) return true;
  if (section.quotedParagraphs.some((a) => a.toLowerCase().includes(q))) return true;
  if (
    section.explanations &&
    section.explanations.some(
      (e) =>
        e.heading.toLowerCase().includes(q) || e.body.toLowerCase().includes(q)
    )
  )
    return true;
  if (
    section.cases &&
    section.cases.some(
      (c) =>
        c.caseNo.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.body.toLowerCase().includes(q)
    )
  )
    return true;
  if (
    section.references &&
    section.references.some(
      (r) =>
        r.title.toLowerCase().includes(q) || r.body.toLowerCase().includes(q)
    )
  )
    return true;
  return false;
}

export default function GeneralAccountingStandardsTab() {
  // 통합 검색어 및 좌/우 개별 검색어 상태
  const [unifiedQuery, setUnifiedQuery] = useState("");
  const [leftQuery, setLeftQuery] = useState("");
  const [rightQuery, setRightQuery] = useState("");

  // 장별 필터 상태
  const [leftChapterFilter, setLeftChapterFilter] = useState("ALL");
  const [rightChapterFilter, setRightChapterFilter] = useState("ALL");

  // 장별 원문 PDF 바로열기 선택 상태
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(
    GENERAL_ACCOUNTING_STANDARDS_META.smeSpecialPdfUrl
  );

  // 검색 결과만 필터링하여 보기 토글 (기본값 false: 전체 조문 스크롤 내 위치 포커스 이동)
  const [leftFilterOnlyMatched, setLeftFilterOnlyMatched] = useState(false);
  const [rightFilterOnlyMatched, setRightFilterOnlyMatched] = useState(false);

  // 현재 포커스된 항목 ID 및 매칭 인덱스
  const [focusedLeftId, setFocusedLeftId] = useState<string>("kgaap-1-1");
  const [focusedRightId, setFocusedRightId] = useState<string>("kgaap-guide-1");
  const [leftMatchIndex, setLeftMatchIndex] = useState<number>(0);
  const [rightMatchIndex, setRightMatchIndex] = useState<number>(0);

  // 좌우 독립 스크롤 컨테이너 Ref
  const leftScrollRef = useRef<HTMLDivElement | null>(null);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);

  // 우측 부록 장별 필터 목록
  const guidanceChapters = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ no: string; title: string }> = [];
    GENERAL_GUIDANCE_SECTIONS.forEach((sec) => {
      if (!seen.has(sec.chapterNo)) {
        seen.add(sec.chapterNo);
        list.push({ no: sec.chapterNo, title: sec.chapterTitle });
      }
    });
    return list;
  }, []);

  // 장별 필터가 적용된 좌측 기준서 목록
  const visibleLeftArticles = useMemo(() => {
    return GENERAL_STANDARD_ARTICLES.filter((art) => {
      if (leftChapterFilter !== "ALL" && !art.chapterNo.includes(leftChapterFilter)) {
        return false;
      }
      if (leftFilterOnlyMatched && leftQuery.trim()) {
        return matchesArticle(art, leftQuery);
      }
      return true;
    });
  }, [leftChapterFilter, leftFilterOnlyMatched, leftQuery]);

  // 장별 필터가 적용된 우측 부록·해설 목록
  const visibleRightSections = useMemo(() => {
    return GENERAL_GUIDANCE_SECTIONS.filter((sec) => {
      if (rightChapterFilter !== "ALL" && sec.chapterNo !== rightChapterFilter) {
        return false;
      }
      if (rightFilterOnlyMatched && rightQuery.trim()) {
        return matchesGuidance(sec, rightQuery);
      }
      return true;
    });
  }, [rightChapterFilter, rightFilterOnlyMatched, rightQuery]);

  // 좌측 검색 매칭 항목 리스트
  const leftMatchedArticles = useMemo(() => {
    if (!leftQuery.trim()) return [];
    return visibleLeftArticles.filter((art) => matchesArticle(art, leftQuery));
  }, [visibleLeftArticles, leftQuery]);

  // 우측 검색 매칭 항목 리스트
  const rightMatchedSections = useMemo(() => {
    if (!rightQuery.trim()) return [];
    return visibleRightSections.filter((sec) => matchesGuidance(sec, rightQuery));
  }, [visibleRightSections, rightQuery]);

  // 좌측 컨테이너 내부 특정 문단 카드로 스크롤 및 포커스
  const scrollToLeftArticle = useCallback((articleId: string) => {
    setFocusedLeftId(articleId);
    requestAnimationFrame(() => {
      const container = leftScrollRef.current;
      const target = document.getElementById(`kgaap-left-card-${articleId}`);
      if (container && target) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offsetTop =
          targetRect.top - containerRect.top + container.scrollTop - 24;
        container.scrollTo({
          top: Math.max(0, offsetTop),
          behavior: "smooth",
        });
      }
    });
  }, []);

  // 우측 컨테이너 내부 특정 부록·해설 섹션 카드로 스크롤 및 포커스
  const scrollToRightSection = useCallback((sectionId: string) => {
    setFocusedRightId(sectionId);
    requestAnimationFrame(() => {
      const container = rightScrollRef.current;
      const target = document.getElementById(`kgaap-right-card-${sectionId}`);
      if (container && target) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offsetTop =
          targetRect.top - containerRect.top + container.scrollTop - 24;
        container.scrollTo({
          top: Math.max(0, offsetTop),
          behavior: "smooth",
        });
      }
    });
  }, []);

  // 좌측 검색어가 변경될 때 첫 번째 매칭 문단으로 자동 포커스 이동
  useEffect(() => {
    if (leftMatchedArticles.length > 0) {
      setLeftMatchIndex(0);
      scrollToLeftArticle(leftMatchedArticles[0].id);
    }
  }, [leftQuery, leftChapterFilter, leftMatchedArticles, scrollToLeftArticle]);

  // 우측 검색어가 변경될 때 첫 번째 매칭 부록·해설로 자동 포커스 이동
  useEffect(() => {
    if (rightMatchedSections.length > 0) {
      setRightMatchIndex(0);
      scrollToRightSection(rightMatchedSections[0].id);
    }
  }, [rightQuery, rightChapterFilter, rightMatchedSections, scrollToRightSection]);

  // 좌측 이전/다음 검색 결과 포커스 이동
  const handleLeftNavigate = (dir: "prev" | "next") => {
    if (leftMatchedArticles.length === 0) return;
    const nextIdx =
      dir === "next"
        ? (leftMatchIndex + 1) % leftMatchedArticles.length
        : (leftMatchIndex - 1 + leftMatchedArticles.length) %
          leftMatchedArticles.length;
    setLeftMatchIndex(nextIdx);
    scrollToLeftArticle(leftMatchedArticles[nextIdx].id);
  };

  // 우측 이전/다음 검색 결과 포커스 이동
  const handleRightNavigate = (dir: "prev" | "next") => {
    if (rightMatchedSections.length === 0) return;
    const nextIdx =
      dir === "next"
        ? (rightMatchIndex + 1) % rightMatchedSections.length
        : (rightMatchIndex - 1 + rightMatchedSections.length) %
          rightMatchedSections.length;
    setRightMatchIndex(nextIdx);
    scrollToRightSection(rightMatchedSections[nextIdx].id);
  };

  // 통합 키워드 실행 (좌우 동시 검색 및 포커스)
  const applyUnifiedSearch = (keyword: string) => {
    setUnifiedQuery(keyword);
    setLeftChapterFilter("ALL");
    setRightChapterFilter("ALL");
    setLeftQuery(keyword);
    setRightQuery(keyword);
  };

  // 전체 초기화
  const handleResetAll = () => {
    setUnifiedQuery("");
    setLeftQuery("");
    setRightQuery("");
    setLeftChapterFilter("ALL");
    setRightChapterFilter("ALL");
    setLeftFilterOnlyMatched(false);
    setRightFilterOnlyMatched(false);
    scrollToLeftArticle("kgaap-1-1");
    scrollToRightSection("kgaap-guide-1");
  };

  // 좌측 본문에서 우측 연계 부록·해설로 점프
  const handleCrossJumpToRight = (guidanceId: string) => {
    setRightChapterFilter("ALL");
    setRightFilterOnlyMatched(false);
    setTimeout(() => {
      scrollToRightSection(guidanceId);
    }, 30);
  };

  // 우측 부록·해설에서 좌측 연계 기준서 본문으로 점프
  const handleCrossJumpToLeft = (articleId: string) => {
    setLeftChapterFilter("ALL");
    setLeftFilterOnlyMatched(false);
    setTimeout(() => {
      scrollToLeftArticle(articleId);
    }, 30);
  };

  // ID로 기준서 문단 조회 헬퍼
  const articleMap = useMemo(() => {
    const map = new Map<string, GeneralStandardParagraph>();
    GENERAL_STANDARD_ARTICLES.forEach((a) => map.set(a.id, a));
    return map;
  }, []);

  // ID로 부록·해설 섹션 조회 헬퍼
  const guidanceMap = useMemo(() => {
    const map = new Map<string, GeneralGuidanceSection>();
    GENERAL_GUIDANCE_SECTIONS.forEach((g) => map.set(g.id, g));
    return map;
  }, []);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 상단 스코프 및 통합 검색 컨트롤 바 */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 whitespace-nowrap">
                  일반기업회계기준 및 해설
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                  {GENERAL_ACCOUNTING_STANDARDS_META.standardEnacted}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                  {GENERAL_ACCOUNTING_STANDARDS_META.legalBasis}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                좌측: 일반기업회계기준 본문(개념체계, 제1장~제33장, 제31장 중소기업 회계처리 특례 전문) · 우측: 일반기업회계기준 부록·해설(결론도출근거, 실무지침, 적용사례, 중소기업회계기준 비교)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <select
                value={selectedPdfUrl}
                onChange={(e) => setSelectedPdfUrl(e.target.value)}
                aria-label="일반기업회계기준 장별 원문 PDF 선택"
                className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {GENERAL_STANDARD_CHAPTERS.map((ch) => (
                  <option key={ch.no} value={ch.pdfUrl}>
                    [원문 PDF] {ch.no} — {ch.title}
                  </option>
                ))}
              </select>
              <a
                href={selectedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                선택 장 PDF 열기
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
            <a
              href={GENERAL_ACCOUNTING_STANDARDS_META.smeSpecialPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              제31장 중소기업 특례 PDF
              <ExternalLink className="w-3 h-3 text-emerald-600" />
            </a>
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              초기화
            </button>
          </div>
        </div>

        {/* 좌우 동시 통합 검색 및 주요 키워드 단축 칩 */}
        <div className="pt-3 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="flex flex-col gap-1 w-full lg:max-w-md">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
              좌우 동시 키워드 검색 (기준서 본문 + 부록·해설 동시 포커스 이동)
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={unifiedQuery}
                onChange={(e) => applyUnifiedSearch(e.target.value)}
                placeholder="예: 중소기업 회계처리 특례, 운용리스, 유형자산, 지분법, 이연법인세, 제31장..."
                className="w-full pl-9 pr-20 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
              />
              {unifiedQuery && (
                <button
                  type="button"
                  onClick={() => applyUnifiedSearch("")}
                  className="absolute right-2 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-200/70 rounded"
                >
                  지우기
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
              빈출 회계주제 바로가기
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_KEYWORDS.map((kw) => {
                const isActive =
                  leftQuery.trim() === kw && rightQuery.trim() === kw;
                return (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => applyUnifiedSearch(kw)}
                    className={`px-2 py-1 text-xs font-semibold rounded border transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    #{kw}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 좌우 분할 영역 (독립 종스크롤 적용) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[calc(100vh-230px)] min-h-[640px]">
        {/* ==================== 좌측 영역: 일반기업회계기준 (본문 문단) ==================== */}
        <div className="flex flex-col bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden h-full">
          {/* 좌측 패널 고정 헤더 & 검색바 */}
          <div className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">
                일반기업회계기준 본문
              </span>
              <span className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded whitespace-nowrap">
                총 {GENERAL_STANDARD_ARTICLES.length}개 항목 (개념체계·제1장~제33장·경과규정)
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {leftQuery.trim() && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950 whitespace-nowrap">
                  검색 {leftMatchedArticles.length > 0 ? `${leftMatchIndex + 1} / ${leftMatchedArticles.length}건` : "0건"}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleLeftNavigate("prev")}
                disabled={leftMatchedArticles.length === 0}
                title="이전 검색 문단 포커스"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleLeftNavigate("next")}
                disabled={leftMatchedArticles.length === 0}
                title="다음 검색 문단 포커스"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 좌측 패널 개별 검색 및 장별 필터 바 (레이블-입력 상하 스택) */}
          <div className="bg-slate-50 border-b border-slate-200 p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 shrink-0">
            <div className="sm:col-span-5 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                회계기준 장별 이동/필터
              </label>
              <select
                value={leftChapterFilter}
                onChange={(e) => setLeftChapterFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
              >
                <option value="ALL">전체 장 보기 (개념체계 · 제1장~제33장 · 경과규정)</option>
                {GENERAL_STANDARD_CHAPTERS.map((ch) => (
                  <option key={ch.no} value={ch.no}>
                    {ch.no} — {ch.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                좌측 회계기준 내 키워드 검색
              </label>
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={leftQuery}
                  onChange={(e) => setLeftQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLeftNavigate("next");
                    }
                  }}
                  placeholder="장·문단번호(문단 31.5) 또는 키워드 입력 (Enter: 다음)"
                  className="w-full pl-8 pr-14 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
                {leftQuery && (
                  <button
                    type="button"
                    onClick={() => setLeftQuery("")}
                    className="absolute right-1.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 rounded"
                  >
                    지우기
                  </button>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1 justify-end">
              <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                표시 방식
              </label>
              <button
                type="button"
                onClick={() => setLeftFilterOnlyMatched((prev) => !prev)}
                className={`w-full px-2 py-1.5 text-xs font-semibold rounded border transition-colors whitespace-nowrap ${
                  leftFilterOnlyMatched
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                {leftFilterOnlyMatched ? "검색문단만" : "전체문단"}
              </button>
            </div>
          </div>

          {/* 좌측 독립 종스크롤 본문 영역 */}
          <div
            ref={leftScrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50"
          >
            {visibleLeftArticles.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                조건에 일치하는 일반기업회계기준 문단이 없습니다.
              </div>
            ) : (
              visibleLeftArticles.map((art) => {
                const isFocused = focusedLeftId === art.id;
                const isMatched =
                  leftQuery.trim().length > 0 && matchesArticle(art, leftQuery);

                return (
                  <div
                    key={art.id}
                    id={`kgaap-left-card-${art.id}`}
                    onClick={() => setFocusedLeftId(art.id)}
                    className={`rounded-lg border p-3.5 transition-all cursor-pointer ${
                      isFocused
                        ? "bg-blue-50/50 border-blue-600 ring-2 ring-blue-500/30 shadow-sm"
                        : isMatched
                        ? "bg-amber-50/40 border-amber-400"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* 문단 카드 상단 배지 및 원문 PDF / 우측 해설 연동 버튼 */}
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-white whitespace-nowrap">
                          <HighlightedText
                            text={`${art.chapterNo} ${art.chapterTitle}`}
                            query={leftQuery}
                          />
                        </span>
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 whitespace-nowrap">
                          <HighlightedText
                            text={art.articleNo}
                            query={leftQuery}
                          />
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">
                          <HighlightedText
                            text={art.articleTitle}
                            query={leftQuery}
                          />
                        </h3>
                      </div>

                      {/* 장별 원문 PDF 열람 & 우측 부록·해설 즉시 포커스 연동 */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <a
                          href={art.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded transition-colors whitespace-nowrap"
                          title={`${art.chapterNo} 한국회계기준원 원문 PDF 열기`}
                        >
                          <FileText className="w-3 h-3 text-blue-600" />
                          <span>원문 PDF</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                        </a>
                        {art.relatedGuidanceIds.map((gId) => {
                          const guide = guidanceMap.get(gId);
                          if (!guide) return null;
                          return (
                            <button
                              key={gId}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCrossJumpToRight(gId);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded transition-colors whitespace-nowrap"
                              title={`우측 부록·해설 ${guide.sectionNo} (${guide.sectionTitle}) 위치로 스크롤 포커스`}
                            >
                              <span>해설 {guide.sectionNo}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 기준서 본문 문단 */}
                    <div className="space-y-1.5 text-xs leading-relaxed text-slate-800">
                      {art.paragraphs.map((para, pIdx) => (
                        <p
                          key={pIdx}
                          className="whitespace-pre-line pl-1 border-l-2 border-slate-200"
                        >
                          <HighlightedText text={para} query={leftQuery} />
                        </p>
                      ))}
                    </div>

                    {/* 하단 핵심 키워드 태그 */}
                    {art.keywords.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1 flex-wrap">
                        <Bookmark className="w-3 h-3 text-slate-400 mr-0.5 shrink-0" />
                        {art.keywords.map((kw, kIdx) => (
                          <button
                            key={kIdx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              applyUnifiedSearch(kw);
                            }}
                            className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 whitespace-nowrap"
                          >
                            #<HighlightedText text={kw} query={leftQuery} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ==================== 우측 영역: 일반기업회계기준 부록·해설 ==================== */}
        <div className="flex flex-col bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden h-full">
          {/* 우측 패널 고정 헤더 & 검색바 */}
          <div className="bg-emerald-950 text-white px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">
                일반기업회계기준 부록·해설
              </span>
              <span className="text-[11px] text-emerald-200 bg-emerald-900 px-2 py-0.5 rounded whitespace-nowrap">
                총 {GENERAL_GUIDANCE_SECTIONS.length}개 주제 (결론도출근거·실무지침·적용사례)
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {rightQuery.trim() && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950 whitespace-nowrap">
                  검색 {rightMatchedSections.length > 0 ? `${rightMatchIndex + 1} / ${rightMatchedSections.length}건` : "0건"}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRightNavigate("prev")}
                disabled={rightMatchedSections.length === 0}
                title="이전 검색 해설 포커스"
                className="p-1 rounded bg-emerald-900 hover:bg-emerald-800 disabled:opacity-40 text-white transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleRightNavigate("next")}
                disabled={rightMatchedSections.length === 0}
                title="다음 검색 해설 포커스"
                className="p-1 rounded bg-emerald-900 hover:bg-emerald-800 disabled:opacity-40 text-white transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 우측 패널 개별 검색 및 장별 필터 바 (레이블-입력 상하 스택) */}
          <div className="bg-slate-50 border-b border-slate-200 p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 shrink-0">
            <div className="sm:col-span-5 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                부록·해설 장별 이동/필터
              </label>
              <select
                value={rightChapterFilter}
                onChange={(e) => setRightChapterFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900"
              >
                <option value="ALL">전체 부록·해설 보기 (개념체계 · 제1장~제33장)</option>
                {guidanceChapters.map((ch) => (
                  <option key={ch.no} value={ch.no}>
                    {ch.no} — {ch.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                우측 실무지침·적용사례 키워드 검색
              </label>
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={rightQuery}
                  onChange={(e) => setRightQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleRightNavigate("next");
                    }
                  }}
                  placeholder="실무지침·분개사례·특례비교 키워드 입력 (Enter: 다음)"
                  className="w-full pl-8 pr-14 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900"
                />
                {rightQuery && (
                  <button
                    type="button"
                    onClick={() => setRightQuery("")}
                    className="absolute right-1.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 rounded"
                  >
                    지우기
                  </button>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1 justify-end">
              <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                표시 방식
              </label>
              <button
                type="button"
                onClick={() => setRightFilterOnlyMatched((prev) => !prev)}
                className={`w-full px-2 py-1.5 text-xs font-semibold rounded border transition-colors whitespace-nowrap ${
                  rightFilterOnlyMatched
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                {rightFilterOnlyMatched ? "검색해설만" : "전체해설"}
              </button>
            </div>
          </div>

          {/* 우측 독립 종스크롤 본문 영역 */}
          <div
            ref={rightScrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50"
          >
            {visibleRightSections.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                조건에 일치하는 일반기업회계기준 부록·해설 항목이 없습니다.
              </div>
            ) : (
              visibleRightSections.map((sec) => {
                const isFocused = focusedRightId === sec.id;
                const isMatched =
                  rightQuery.trim().length > 0 &&
                  matchesGuidance(sec, rightQuery);

                return (
                  <div
                    key={sec.id}
                    id={`kgaap-right-card-${sec.id}`}
                    onClick={() => setFocusedRightId(sec.id)}
                    className={`rounded-lg border p-4 transition-all cursor-pointer ${
                      isFocused
                        ? "bg-emerald-50/40 border-emerald-600 ring-2 ring-emerald-500/30 shadow-sm"
                        : isMatched
                        ? "bg-amber-50/40 border-amber-400"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* 해설 섹션 상단 헤더 및 좌측 관련 본문 바로가기 버튼 */}
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-900 text-white whitespace-nowrap">
                          <HighlightedText
                            text={`${sec.chapterNo} ${sec.chapterTitle}`}
                            query={rightQuery}
                          />
                        </span>
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300 whitespace-nowrap">
                          <HighlightedText
                            text={sec.sectionNo}
                            query={rightQuery}
                          />
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">
                          <HighlightedText
                            text={sec.sectionTitle}
                            query={rightQuery}
                          />
                        </h3>
                      </div>

                      {/* 원문 PDF & 좌측 기준서 본문으로 역방향 점프 */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <a
                          href={sec.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded transition-colors whitespace-nowrap"
                          title={`${sec.chapterNo} 부록 포함 원문 PDF 열기`}
                        >
                          <FileText className="w-3 h-3 text-emerald-700" />
                          <span>원문 PDF</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                        </a>
                        {sec.relatedStandardIds.map((artId) => {
                          const art = articleMap.get(artId);
                          if (!art) return null;
                          return (
                            <button
                              key={artId}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCrossJumpToLeft(artId);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded transition-colors whitespace-nowrap"
                              title={`좌측 기준서 ${art.articleNo}(${art.articleTitle})로 스크롤 포커스`}
                            >
                              <ArrowLeft className="w-3 h-3" />
                              <span>{art.articleNo}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 관련 기준서 핵심 문단 인용 박스 */}
                    {sec.quotedParagraphs.length > 0 && (
                      <div className="mb-3 p-2.5 rounded bg-slate-100 border-l-4 border-slate-600 text-xs text-slate-700 space-y-1">
                        {sec.quotedParagraphs.map((qText, qIdx) => (
                          <p key={qIdx} className="whitespace-pre-line">
                            <HighlightedText text={qText} query={rightQuery} />
                          </p>
                        ))}
                      </div>
                    )}

                    {/* 핵심 요약 비교표 */}
                    {sec.summaryTable && (
                      <div className="mb-3 p-3 rounded-md bg-blue-50/70 border border-blue-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                        <HighlightedText
                          text={sec.summaryTable}
                          query={rightQuery}
                        />
                      </div>
                    )}

                    {/* 상세 해설 본문 */}
                    {sec.explanations && sec.explanations.length > 0 && (
                      <div className="space-y-2.5 text-xs leading-relaxed text-slate-800">
                        {sec.explanations.map((exp, eIdx) => (
                          <div key={eIdx} className="space-y-1">
                            <h4 className="font-bold text-slate-900">
                              <HighlightedText
                                text={exp.heading}
                                query={rightQuery}
                              />
                            </h4>
                            <p className="whitespace-pre-line text-slate-700 pl-2 border-l-2 border-emerald-200">
                              <HighlightedText
                                text={exp.body}
                                query={rightQuery}
                              />
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 실무 회계분개 [적용사례] 박스 */}
                    {sec.cases && sec.cases.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {sec.cases.map((cs, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-3 rounded-md bg-amber-50/70 border border-amber-200 text-xs"
                          >
                            <div className="flex items-center gap-1.5 font-bold text-amber-950 mb-1">
                              <Calculator className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>
                                [
                                <HighlightedText
                                  text={cs.caseNo}
                                  query={rightQuery}
                                />
                                ]{" "}
                                <HighlightedText
                                  text={cs.title}
                                  query={rightQuery}
                                />
                              </span>
                            </div>
                            <p className="whitespace-pre-line text-slate-800 font-mono text-[11px] leading-relaxed">
                              <HighlightedText
                                text={cs.body}
                                query={rightQuery}
                              />
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 관련 규정 [참고] 박스 */}
                    {sec.references && sec.references.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {sec.references.map((ref, rIdx) => (
                          <div
                            key={rIdx}
                            className="p-2.5 rounded-md bg-slate-100/90 border border-slate-300 text-xs"
                          >
                            <div className="font-bold text-slate-900 mb-1">
                              <HighlightedText
                                text={ref.title}
                                query={rightQuery}
                              />
                            </div>
                            <p className="whitespace-pre-line text-slate-700 text-[11px] leading-relaxed">
                              <HighlightedText
                                text={ref.body}
                                query={rightQuery}
                              />
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 하단 키워드 태그 */}
                    {sec.keywords.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1 flex-wrap">
                        <Bookmark className="w-3 h-3 text-slate-400 mr-0.5 shrink-0" />
                        {sec.keywords.map((kw, kIdx) => (
                          <button
                            key={kIdx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              applyUnifiedSearch(kw);
                            }}
                            className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 whitespace-nowrap"
                          >
                            #<HighlightedText text={kw} query={rightQuery} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
