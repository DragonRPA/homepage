"use client";

import React from "react";
import Link from "next/link";
import { 
  Bot, Layers, ArrowLeft, ExternalLink, Printer, 
  CheckCircle2, Sparkles, Building2, Cpu, ShieldCheck, 
  Zap, Code2, Globe, Mail, Phone, ChevronRight, FileText,
  Award, Terminal, Database, Network, Camera
} from "lucide-react";
import { COMPANY_INFO, BUSINESS_PILLARS } from "@/data/companyData";

export default function AboutCompanyPage() {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      
      {/* 1. Top Global Navigation Bar (Print Hidden) */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 text-slate-300 hover:text-white transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/symbol-192.png"
                alt="DragonRPA CI"
                className="w-8 h-8 rounded-lg bg-white p-0.5 object-contain shadow-md shadow-blue-600/20"
              />
              <div className="flex flex-col">
                <span className="font-bold text-base text-white tracking-tight leading-none">
                  Dragon<span className="text-blue-500">RPA</span>
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">회사소개</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/products"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap"
            >
              스토어
            </Link>

            <Link
              href="/manual-studio"
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>매뉴얼 스튜디오</span>
            </Link>

            <Link
              href="/pc-wiki"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap"
            >
              피씨위키
            </Link>

            <button
              onClick={handlePrint}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-sm"
              title="회사소개서 PDF 저장 및 인쇄"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>PDF / 인쇄</span>
            </button>

            <Link
              href="/portfolio"
              className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>포트폴리오</span>
            </Link>

            <Link
              href="/erp"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap hidden sm:inline-flex"
            >
              사내 ERP ➔
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Company Profile Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-12 my-4">

        {/* SECTION 1: HERO & CORPORATE OVERVIEW */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
            {/* CI Logo Badge */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-white p-4 flex items-center justify-center shrink-0 shadow-2xl border border-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="DragonRPA Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-4 text-center md:text-left flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>실무 경험 중심의 비즈니스 자동화 & ERP 파트너</span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  {COMPANY_INFO.nameKr}
                </h1>
                <p className="text-sm sm:text-base text-slate-400 font-mono mt-1">
                  {COMPANY_INFO.nameEn}
                </p>
              </div>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
                &ldquo;{COMPANY_INFO.slogan}&rdquo;
              </p>

              <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-400 font-mono border-t border-slate-800/80">
                <div><strong className="text-slate-200">대표이사:</strong> {COMPANY_INFO.ceo}</div>
                <div>•</div>
                <div><strong className="text-slate-200">공식 웹사이트:</strong> {COMPANY_INFO.domain}</div>
                <div>•</div>
                <div><strong className="text-slate-200">설립:</strong> {COMPANY_INFO.establishedYear}년</div>
              </div>
            </div>
          </div>

          {/* Mission & Leader Profile Box */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4" /> {COMPANY_INFO.leaderProfile.title}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {COMPANY_INFO.leaderProfile.summary}
              </p>
              <ul className="space-y-1 text-[11px] text-slate-400 pt-1">
                {COMPANY_INFO.leaderProfile.keyStrengths.slice(0, 2).map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> 창업 비전 (Founding Motto)
                </div>
                <p className="text-xs text-slate-200 font-medium leading-relaxed font-sans bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  &ldquo;{COMPANY_INFO.foundingMotto}&rdquo;
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" /> 전사 최우선 개발 사명 (System Core Mission)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  &ldquo;{COMPANY_INFO.missionStatement}&rdquo;
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  단순 코드 완성을 넘어 <strong>임직원의 최소 노력으로 최대 업무 효익과 이익(최대 편익)을 창출하는 것</strong>을 시스템 개발의 절대 원칙으로 삼습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: 4 CORE BUSINESS PILLARS */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Business Portfolio</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                4대 핵심 사업 영역
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              엔터프라이즈 ERP • 지능형 RPA • 생성형 AI • 시스템 엔지니어링
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BUSINESS_PILLARS.map((pillar) => (
              <div
                key={pillar.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono text-blue-500/40">
                      {pillar.number}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-950 border border-slate-800 text-slate-300">
                      {pillar.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {pillar.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">
                      {pillar.subtitle}
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {pillar.description}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="text-[11px] font-bold text-slate-400">주요 구현 규격:</div>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {pillar.highlights.map((h, hi) => (
                        <li key={hi} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {pillar.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {pillar.portfolioLinks && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {pillar.portfolioLinks.map((link, li) => (
                        <Link
                          key={li}
                          href={link.url || "/portfolio"}
                          target={link.url?.startsWith("http") ? "_blank" : undefined}
                          className="text-[11px] font-bold px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
                        >
                          <span>{link.name}</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: 4 CORE VALUES */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Core Values & Principles</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              DragonRPA 4대 핵심 가치
            </h2>
            <p className="text-xs text-slate-400">
              풍부한 실무 경험과 신뢰를 바탕으로 고객사와 함께 성장하는 원칙
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COMPANY_INFO.coreValues.map((val, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-blue-400">
                      CORE-0{idx + 1}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{val.title}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {val.name}
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {val.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: TRACK RECORD BANNER */}
        <section className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-900 border border-blue-800/60 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-900/60 border border-blue-700 text-blue-300 text-[11px] font-bold">
              <Layers className="w-3.5 h-3.5" />
              <span>실전 납품 & 개발 포트폴리오</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              13대 프로젝트 쇼케이스
            </h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              고소작업대 렌탈 ERP, 대기업 사내 IT 헬프데스크, 국세청 세무 자동화 등 현장의 실무 문제를 함께 해결하며 구축해온 프로젝트 구현 결과와 라이브 데모입니다.
            </p>
          </div>

          <Link
            href="/portfolio"
            className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-xl shadow-yellow-400/20 flex items-center gap-2 whitespace-nowrap transition-all transform active:scale-95 shrink-0"
          >
            <span>포트폴리오 쇼케이스 이동 ➔</span>
          </Link>
        </section>

        {/* SECTION 5: CONTACT & PARTNERSHIP */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Building2 className="w-5 h-5 text-blue-500" />
              <span>도입 상담 및 비즈니스 파트너십</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">Contact Info</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" /> 공식 웹사이트
              </div>
              <div className="text-xs font-mono font-bold text-white pt-1">
                https://www.dragonrpa.co.kr
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" /> 대표 이메일
              </div>
              <div className="text-xs font-mono font-bold text-white pt-1">
                contact@dragonrpa.co.kr
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> 주요 지원 영역
              </div>
              <div className="text-xs font-bold text-white pt-1">
                특화 ERP • RPA • AI STT • 유틸리티
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* 3. Minimal Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 mt-12 text-center text-xs text-slate-500 print:hidden">
        <p>© 2026 DragonRPA Co., Ltd. All rights reserved. | <Link href="/products" className="hover:text-slate-400">스토어</Link> | <Link href="/pc-wiki" className="hover:text-slate-400">피씨위키</Link> | <Link href="/portfolio" className="hover:text-slate-400">포트폴리오</Link> | <Link href="/admin/products" className="hover:text-blue-400">관리자 CMS</Link></p>
      </footer>
    </div>
  );
}
