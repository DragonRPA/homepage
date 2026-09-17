"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Download,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Key,
  Laptop,
  Mail,
  Home
} from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNo = searchParams.get("orderNo") || "ORD_SAMPLE_12345";
  const licenseKey = searchParams.get("licenseKey") || "DRAGON-MS-PERM-8F92-K3D1-C19A";
  const productId = searchParams.get("productId") || "MANUAL_STUDIO";
  const planType = searchParams.get("planType") || "PERSONAL";
  const customerEmail = searchParams.get("email") || "buyer@example.com";

  const [copied, setCopied] = useState(false);

  const productName = productId === "LABEL_STATION" ? "라벨스테이션 (Label Print Station)" : "매뉴얼 스튜디오 (Manual Studio)";
  const planName = planType === "BUSINESS" ? "기업용 영구 라이선스 (3 PC)" : "개인용 영구 라이선스 (1 PC)";
  const downloadUrl = productId === "LABEL_STATION" 
    ? "/downloads/LabelStation_Setup_v1.0.0.exe"
    : "/downloads/ManualStudio_Setup_v1.4.0.exe";

  const handleCopy = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 py-16">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-sky-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Icon & Heading */}
        <div className="text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-6 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 uppercase tracking-widest">
            Payment & License Completed
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-3 mb-2">
            결제가 성공적으로 완료되었습니다!
          </h1>
          <p className="text-sm text-slate-400">
            고객님의 정품 라이선스 키가 즉시 발급되었으며, <strong>{customerEmail}</strong>(으)로 확인 메일이 발송되었습니다.
          </p>
        </div>

        {/* License Key Box */}
        <div className="mt-8 bg-slate-950/80 border-2 border-sky-500/80 rounded-2xl p-6 relative z-10 text-center shadow-xl shadow-sky-500/5">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider mb-2">
            <Key className="w-4 h-4" />
            <span>공식 정품 라이선스 키</span>
          </div>

          <div className="font-mono text-xl sm:text-2xl font-black text-amber-300 tracking-wider py-3 px-4 bg-slate-900 rounded-xl border border-slate-800 select-all break-all">
            {licenseKey}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
            <button
              onClick={handleCopy}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20"
              }`}
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? "클립보드에 복사됨!" : "라이선스 키 복사하기"}</span>
            </button>
            <a
              href={downloadUrl}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
            >
              <Download className="w-4 h-4" />
              <span>설치 프로그램 다운로드</span>
            </a>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
            <div>제품: <strong className="text-slate-200">{productName}</strong></div>
            <div>플랜: <strong className="text-slate-200">{planName}</strong></div>
            <div>주문번호: <span className="font-mono text-slate-400">{orderNo}</span></div>
          </div>
        </div>

        {/* 3-Step Activation Guide */}
        <div className="mt-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative z-10 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Laptop className="w-4 h-4 text-sky-400" />
            <span>3단계 초간단 정품 인증 방법</span>
          </h3>
          <ol className="space-y-2 text-xs sm:text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="font-bold text-sky-400 shrink-0">1.</span>
              <span>다운로드받은 설치 프로그램(EXE)을 실행하여 소프트웨어를 설치합니다.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-sky-400 shrink-0">2.</span>
              <span>프로그램 상단 메뉴에서 <strong>'라이선스 등록'</strong> 창을 엽니다.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-sky-400 shrink-0">3.</span>
              <span>위에서 복사한 라이선스 키를 붙여넣으시면 0.1초 만에 영구 정품 인증이 완료됩니다!</span>
            </li>
          </ol>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 relative z-10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>영구 라이선스 인증 정보가 안전하게 보존되었습니다.</span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-bold text-sky-400 hover:text-sky-300 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>홈페이지 메인으로</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading payment details...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
