import React from "react";
import { ArrowRight, CheckCircle2, Cpu, Database, FileSpreadsheet, ShieldCheck } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 text-white pt-20 pb-24 border-b border-slate-800">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Vision & CTA */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-700 text-blue-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>엔터프라이즈 RPA & 공공데이터 연계 표준 솔루션</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              데이터 연계와 업무 자동화로<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                기업의 비즈니스 편익을 극대화합니다
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              국가 공공데이터포털(data.go.kr) Open API 실시간 수집, 렌탈 자산 및 배차 프로세스 ERP, 반복 서식 자동 생산 파이프라인을 단일 통합 아키텍처로 구축하여 운영 비용을 절감합니다.
            </p>

            {/* CTA Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all"
              >
                <span>도입 및 개발 상담 신청</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#public-data"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span>공공데이터 데모 확인</span>
              </a>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>무누락 DB 이벤트 기록</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>자산 상태 실시간 라이프사이클</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>공공 API 표준 데이터 변환</span>
              </div>
            </div>
          </div>

          {/* Right Column: Architectural Terminal Preview */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-slate-700 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur">
              {/* Window Header */}
              <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-xs font-mono text-slate-400">system.core.status</div>
                <div className="w-12" />
              </div>

              {/* Terminal Body */}
              <div className="p-5 font-mono text-xs space-y-3">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>[DOMAIN_TOPOLOGY]</span>
                  <span className="text-emerald-400 font-semibold">ONLINE</span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
                  <div className="text-blue-400">» HOST: dragonrpa.co.kr (Apex / WWW)</div>
                  <div className="text-slate-400">» ERP : erp.dragonrpa.co.kr</div>
                  <div className="text-slate-400">» API : api.dragonrpa.co.kr</div>
                  <div className="text-slate-400">» MAIL: @dragonrpa.co.kr (DMARC PASS)</div>
                </div>

                <div className="text-slate-400 flex items-center justify-between pt-1">
                  <span>[DATA_GO_KR_PIPELINE]</span>
                  <span className="text-cyan-400 font-semibold">CONNECTED</span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
                  <div>» 국세청 사업자등록 상태조회 API: <span className="text-emerald-400">ACTIVE</span></div>
                  <div>» 기상청 단기예보 실시간 수집: <span className="text-emerald-400">ACTIVE</span></div>
                  <div>» 국토부 장비/건축물대장 ETL: <span className="text-emerald-400">SYNCED</span></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    전사 시스템 표준 헌장 준수
                  </span>
                  <span className="text-slate-400">SSOT v1.0</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}