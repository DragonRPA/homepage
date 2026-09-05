"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Bot, Layers, ArrowLeft, Search, ExternalLink, 
  Calendar, CheckCircle2, ChevronRight, Image as ImageIcon,
  FileCode, Terminal, Sparkles, Folder, Eye, Tag, Github, Zap,
  Smartphone, Download, X, Share, PlusSquare, Monitor, HelpCircle
} from "lucide-react";
import { 
  PORTFOLIO_PROJECTS, 
  PORTFOLIO_CATEGORIES, 
  PortfolioProject 
} from "@/data/portfolioData";

export default function PortfolioPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(PORTFOLIO_PROJECTS[0].id);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // PWA Web App Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        setShowInstallGuideModal(true);
      }
    } else {
      // Show manual install guide for iOS Safari, Chrome Desktop, etc.
      setShowInstallGuideModal(true);
    }
  };

  // Filter projects by category and search query
  const filteredProjects = useMemo(() => {
    return PORTFOLIO_PROJECTS.filter((p) => {
      const matchCategory = selectedCategory === "ALL" || p.category === selectedCategory;
      const matchSearch = 
        searchQuery.trim() === "" ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.techStack.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Currently selected project
  const currentProject: PortfolioProject = useMemo(() => {
    return (
      PORTFOLIO_PROJECTS.find((p) => p.id === selectedProjectId) ||
      PORTFOLIO_PROJECTS[0]
    );
  }, [selectedProjectId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      
      {/* Top Global Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 text-slate-300 hover:text-white transition-colors">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-white tracking-tight leading-none">
                  Dragon<span className="text-blue-500">RPA</span>
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">포트폴리오</span>
              </div>
            </Link>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <span className="text-xs font-semibold text-slate-400 hidden sm:block whitespace-nowrap">
              프로젝트 쇼케이스
            </span>
          </div>

          {/* Quick Category Tabs */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {PORTFOLIO_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-md font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Top Actions: Install WebApp + ERP */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 📲 WEB APP INSTALL BUTTON (상단 웹앱 등록 버튼) */}
            <button
              onClick={handleInstallClick}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all transform active:scale-95 whitespace-nowrap"
              title="스마트폰 홈화면이나 바탕화면에 바로가기 웹앱으로 등록"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{isInstalled ? "앱 설치됨" : "앱으로 등록"}</span>
            </button>

            <Link
              href="/erp"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap hidden sm:inline-flex"
            >
              사내 ERP ➔
            </Link>
          </div>
        </div>
      </header>

      {/* Main Showcase Layout (2-Column Master-Detail) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Project Tree & List Navigator (4 Cols) */}
        {/* ========================================================= */}
        <aside className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 lg:sticky lg:top-20">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  프로젝트 트리 ({filteredProjects.length})
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">총 {PORTFOLIO_PROJECTS.length}개 과제</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="프로젝트명, 기술 태그 검색..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Mobile Category Selector */}
            <div className="flex md:hidden overflow-x-auto gap-1 pb-1 text-xs">
              {PORTFOLIO_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white font-bold"
                      : "bg-slate-950 text-slate-400 border border-slate-800"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Project List */}
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredProjects.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                검색 조건에 맞는 프로젝트가 없습니다.
              </div>
            ) : (
              filteredProjects.map((p, idx) => {
                const isSelected = p.id === currentProject.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-blue-950/70 border-blue-600 shadow-md shadow-blue-600/10"
                        : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-mono font-bold ${isSelected ? "text-blue-400" : "text-slate-500"}`}>
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        {p.liveUrl && (
                          <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-yellow-400 text-slate-950 flex items-center gap-0.5 whitespace-nowrap shadow-sm">
                            <Zap className="w-2.5 h-2.5 fill-current" />
                            <span>라이브</span>
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded border whitespace-nowrap ${
                          p.category === "ERP" 
                            ? "bg-purple-950/80 text-purple-300 border-purple-800"
                            : p.category === "RPA"
                            ? "bg-cyan-950/80 text-cyan-300 border-cyan-800"
                            : p.category === "AI"
                            ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                            : "bg-slate-900 text-slate-400 border-slate-700"
                        }`}>
                          {p.categoryName}
                        </span>
                      </div>
                    </div>

                    <div className={`font-bold text-xs leading-snug ${isSelected ? "text-white" : "text-slate-200"}`}>
                      {p.title}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {p.subtitle}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {p.techStack.slice(0, 3).map((t) => (
                        <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {t}
                        </span>
                      ))}
                      {p.techStack.length > 3 && (
                        <span className="text-[9px] font-mono text-slate-500 self-center">
                          +{p.techStack.length - 3}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Project Detailed Showcase & Captures (8 Cols) */}
        {/* ========================================================= */}
        <main className="lg:col-span-8 space-y-6">
          
          {/* 1. Project Title & Metadata Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                currentProject.category === "ERP" 
                  ? "bg-purple-950 text-purple-300 border-purple-800"
                  : currentProject.category === "RPA"
                  ? "bg-cyan-950 text-cyan-300 border-cyan-800"
                  : currentProject.category === "AI"
                  ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                  : "bg-slate-950 text-slate-300 border-slate-700"
              }`}>
                {currentProject.categoryName}
              </span>

              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" /> {currentProject.period}
                </span>
                <span>•</span>
                <span>{currentProject.clientOrTarget}</span>
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {currentProject.title}
              </h1>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                {currentProject.subtitle}
              </p>
            </div>

            {/* 🌟 BRIGHT YELLOW DIRECT ACCESS LINK (제목 하단 노란색 바로가기 링크) 🌟 */}
            {currentProject.liveUrl && (
              <div className="pt-2">
                <a
                  href={currentProject.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-3 px-5 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-yellow-400/20 hover:shadow-yellow-400/30 transition-all transform active:scale-[0.98] group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-950 text-yellow-400 flex items-center justify-center font-black text-xs">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <span className="tracking-tight">배포 사이트 바로가기:</span>
                    <span className="underline underline-offset-2 font-mono text-[11px] sm:text-xs">
                      {currentProject.liveUrl}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </a>
              </div>
            )}

            {/* Tech Stack & GitHub Chips */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
                  <Tag className="w-3.5 h-3.5 text-blue-500" /> 기술:
                </span>
                {currentProject.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {currentProject.githubUrl && (
                <a
                  href={currentProject.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
              )}
            </div>
          </div>

          {/* 2. Core Markdown Summary (.MD) Viewer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-white font-bold text-sm">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span>프로젝트 기획 및 핵심 설계 요약 (Architecture & Value)</span>
            </div>

            {/* Markdown Body Formatted Layout */}
            <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 space-y-4 leading-relaxed font-sans">
              {currentProject.summaryMarkdown.split("\n\n").map((block, i) => {
                const trimmed = block.trim();
                if (trimmed.startsWith("### ")) {
                  return (
                    <h3 key={i} className="text-sm sm:text-base font-bold text-white mt-5 mb-2 border-l-2 border-blue-500 pl-2.5">
                      {trimmed.replace("### ", "")}
                    </h3>
                  );
                }
                if (trimmed.startsWith("1. ") || trimmed.startsWith("- ")) {
                  return (
                    <ul key={i} className="space-y-1.5 pl-4 list-disc text-slate-300">
                      {trimmed.split("\n").map((line, li) => (
                        <li key={li} className="leading-relaxed">
                          {line.replace(/^(\d+\.\s|-\s)/, "")}
                        </li>
                      ))}
                    </ul>
                  );
                }
                return <p key={i} className="leading-relaxed">{trimmed}</p>;
              })}
            </div>
          </div>

          {/* 3. Captures & Screenshots Gallery Slot */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>시스템 화면 캡처 및 워크플로우 갤러리</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentProject.captures.length}개 슬롯 준비됨
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentProject.captures.map((cap, cIdx) => (
                <div
                  key={cap.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between group hover:border-slate-700 transition-all"
                >
                  {/* Image Display or Placeholder Slot */}
                  <div className="relative aspect-video bg-slate-900 flex flex-col items-center justify-center p-4 text-center border-b border-slate-800/80 overflow-hidden">
                    {cap.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cap.imageUrl}
                        alt={cap.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="space-y-2 text-slate-500 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          [ 캡처 슬롯 #{cIdx + 1} ]
                        </div>
                        <span className="text-[10px] text-slate-500">
                          실제 운영 화면 이미지 추가 대기 중
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Caption Info */}
                  <div className="p-4 space-y-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                      {cap.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>

      {/* Web App Installation Guide Modal */}
      {showInstallGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Smartphone className="w-5 h-5 text-blue-500" />
                <span>홈 화면 바로가기 웹앱(PWA) 등록 방법</span>
              </div>
              <button
                onClick={() => setShowInstallGuideModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              본 포트폴리오를 스마트폰 홈 화면이나 PC 바탕화면에 독립 앱으로 등록하면, 브라우저 주소창 없이 네이티브 앱처럼 0초 만에 바로 실행하실 수 있습니다.
            </p>

            <div className="space-y-3 text-xs">
              {/* iPhone / iPad Safari Guide */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-blue-400 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>아이폰 / 아이패드 (Safari)</span>
                </div>
                <p className="text-slate-400 pl-6.5 leading-relaxed">
                  하단 도구 모음의 <strong className="text-blue-400">공유 버튼(사각형에 위 화살표)</strong>을 누른 후, 메뉴에서 <strong className="text-emerald-400">[홈 화면에 추가]</strong>를 누르시면 완료됩니다.
                </p>
              </div>

              {/* Android Chrome / Samsung Guide */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-blue-400 flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>안드로이드 (Chrome / 삼성 인터넷)</span>
                </div>
                <p className="text-slate-400 pl-6.5 leading-relaxed">
                  우측 상단 <strong className="text-blue-400">메뉴(점 3개 또는 선 3개)</strong>를 누른 후 <strong className="text-emerald-400">[앱 설치]</strong> 또는 <strong className="text-emerald-400">[홈 화면에 추가]</strong>를 누르시면 완료됩니다.
                </p>
              </div>

              {/* PC Desktop Chrome / Edge Guide */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-blue-400 flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>PC 컴퓨터 (Chrome / Edge)</span>
                </div>
                <p className="text-slate-400 pl-6.5 leading-relaxed">
                  브라우저 주소창 우측 끝의 <strong className="text-blue-400">[설치 (⊕)] 아이콘</strong>을 누르시거나, 브라우저 메뉴 ➔ <strong className="text-emerald-400">[DragonRPA 앱 설치]</strong>를 클릭하시면 바탕화면에 생성됩니다.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowInstallGuideModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 mt-12 text-center text-xs text-slate-500">
        <p>© 2026 DragonRPA Co., Ltd. All rights reserved. | <Link href="/erp" className="hover:text-slate-400">사내 ERP</Link></p>
      </footer>
    </div>
  );
}
