import React from "react";
import Link from "next/link";
import { Layers } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-10 selection:bg-blue-600 selection:text-white">
      {/* 1. Top Navigation Bar */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/symbol-192.png"
            alt="DragonRPA CI"
            className="w-10 h-10 rounded-xl bg-white p-1 object-contain shadow-lg shadow-blue-600/20"
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg text-white tracking-tight leading-none">
              Dragon<span className="text-blue-500">RPA</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-1">
              (주)드래곤알피에이
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/portfolio"
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>포트폴리오</span>
          </Link>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-20">
        <div className="text-center space-y-5">
          <div className="w-24 h-24 rounded-3xl bg-white p-3 flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/10 border border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="DragonRPA Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-extrabold text-white tracking-tight">
              (주)드래곤알피에이
            </h1>
            <p className="text-slate-400 text-xs tracking-widest uppercase font-mono">
              dragonrpa.co.kr
            </p>
          </div>
        </div>
      </main>

      {/* 3. Minimal Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
        <p>Copyright © 2026 DragonRPA Co., Ltd. All rights reserved. | <Link href="/portfolio" className="hover:text-slate-400">포트폴리오</Link></p>
      </footer>
    </div>
  );
}