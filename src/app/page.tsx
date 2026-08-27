import React from "react";
import { Bot, Mail, ShieldCheck, Clock } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-12">
      {/* Top Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">
            Dragon<span className="text-blue-500">RPA</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>도메인 보안 인증 완료</span>
        </div>
      </header>

      {/* Center Hero Card */}
      <section className="max-w-xl mx-auto w-full text-center py-16 space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 mx-auto shadow-inner">
          <Clock className="w-7 h-7" />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            (주)드래곤알피에이
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            현재 사내 기간계 시스템 연동 및 정식 서비스 준비 중입니다.<br />
            업무 자동화 및 공공데이터 파이프라인 구축을 위한 준비를 진행하고 있습니다.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 inline-flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-400" />
          <span>대표 문의:</span>
          <span className="text-white font-mono font-semibold">contact@dragonrpa.co.kr</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-400 border-t border-slate-900 pt-6">
        <p>Copyright © 2026 DragonRPA Co., Ltd. All rights reserved.</p>
      </footer>
    </main>
  );
}