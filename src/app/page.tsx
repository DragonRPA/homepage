import React from "react";
import Link from "next/link";
import { Layers, Camera, Download, FileText, ShoppingBag, Settings, Smartphone } from "lucide-react";
import { getPublishedProducts } from "@/lib/productService";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getPublishedProducts();
  const manualStudio = products.find((p) => p.id === "MANUAL_STUDIO");
  const version = manualStudio?.version || "v1.9.2";
  const downloadUrl = manualStudio?.downloadUrl || "/downloads/ManualStudio.exe";

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

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/products"
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
            <span>스토어</span>
          </Link>

          <Link
            href="/manual-studio"
            className="text-xs font-bold px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>매뉴얼 스튜디오</span>
          </Link>

          <Link
            href="/about"
            className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <span>회사소개</span>
          </Link>

          <Link
            href="/portfolio"
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>포트폴리오</span>
          </Link>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white p-3 flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/10 border border-slate-800">
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

        {/* 📸 매뉴얼 스튜디오 배포 카드 (DB 실시간 연동) */}
        <div className="w-full max-w-xl mx-auto mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-300">신규 배포 소프트웨어</span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/60">
              {version} 최신 릴리즈
            </span>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-400" />
              <span>매뉴얼 스튜디오 (Manual Studio)</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              업무 화면 캡처 ➔ 1·2·3 자동 번호 부여 ➔ 민감정보 블러 ➔ 파워포인트(PPTX) 자동 생성 도구
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
            <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 font-mono">단일 EXE 무설치</span>
            <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Nuitka C 기계어</span>
            <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Cloudflare R2 CDN</span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <a
              href={downloadUrl}
              download="ManualStudio.exe"
              className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>PC 다운로드 ({version})</span>
            </a>
            <a
              href="/downloads/ManualStudioMobile.apk"
              download="ManualStudioMobile.apk"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              title="안드로이드 스마트폰 전용 앱 다운로드 (11.5 MB)"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>모바일 APK (11.5 MB)</span>
            </a>
            <Link
              href="/manual-studio"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>설명서 ➔</span>
            </Link>
          </div>
        </div>
      </main>

      {/* 3. Global Footer with Admin Link */}
      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>Copyright © 2026 DragonRPA Co., Ltd. All rights reserved.</p>
        <div className="flex items-center gap-4 text-slate-400">
          <Link href="/products" className="hover:text-slate-200">스토어</Link>
          <Link href="/portfolio" className="hover:text-slate-200">포트폴리오</Link>
          <Link href="/about" className="hover:text-slate-200">회사소개</Link>
          <span className="text-slate-700">|</span>
          <Link href="/admin/products" className="hover:text-blue-400 flex items-center gap-1 text-slate-500 transition-colors">
            <Settings className="w-3 h-3" />
            <span>관리자 CMS</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}