"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle, ArrowLeft, RefreshCw, Mail, Home } from "lucide-react";

function FailContent() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get("message") || "사용자에 의해 결제가 취소되었거나 승인이 실패했습니다.";
  const errorCode = searchParams.get("code") || "PAYMENT_CANCELLED";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 py-16">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center relative overflow-hidden">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-6 shadow-lg shadow-rose-500/10">
          <XCircle className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 uppercase tracking-widest">
          Payment Incomplete
        </span>

        <h1 className="text-2xl font-extrabold text-white mt-3 mb-2">
          결제가 완료되지 않았습니다
        </h1>

        <p className="text-sm text-slate-400 mb-6">
          {errorMessage}
        </p>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 mb-8 text-left space-y-1">
          <div>• 오류 코드: <span className="font-mono text-slate-300">{errorCode}</span></div>
          <div>• 결제 수단 한도 초과 또는 창 닫힘 여부를 확인해주세요.</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Home className="w-4 h-4" />
            <span>메인으로 이동</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>다시 시도하기</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500">
          지속적으로 문제가 발생할 경우 <a href="mailto:contact@dragonrpa.co.kr" className="text-sky-400 hover:underline">contact@dragonrpa.co.kr</a>로 문의주시기 바랍니다.
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>}>
      <FailContent />
    </Suspense>
  );
}
