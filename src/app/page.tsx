import React from "react";
import { Bot, LogIn, ExternalLink } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-10 selection:bg-blue-600 selection:text-white">
      {/* 1. Top Navigation Bar */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <Bot className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-white tracking-tight leading-none">
              Dragon<span className="text-blue-500">RPA</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-1">
              (주)드래곤알피에이
            </span>
          </div>
        </div>

        {/* Right: Employee Login Button */}
        <div>
          <a
            href="https://erp.dragonrpa.co.kr"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition-all border border-blue-500"
          >
            <LogIn className="w-4 h-4" />
            <span className="whitespace-nowrap">임직원 로그인</span>
          </a>
        </div>
      </header>

      {/* 2. Main Content Area (Minimal Blank Space) */}
      <main className="flex-1 flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto shadow-inner">
            <Bot className="w-8 h-8" />
          </div>
          <div className="text-slate-400 text-xs tracking-widest uppercase font-mono">
            dragonrpa.co.kr
          </div>
        </div>
      </main>

      {/* 3. Minimal Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-400 border-t border-slate-900 pt-6">
        <p>Copyright © 2026 DragonRPA Co., Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
}