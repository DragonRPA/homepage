"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Printer,
  QrCode,
  Zap,
  Layers,
  ArrowRight,
  Download,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  FileSpreadsheet,
  Globe,
  Sliders,
  Sparkles,
  Barcode,
  Keyboard,
  Lock,
  ExternalLink,
  ChevronRight,
  CreditCard
} from "lucide-react";
import PaymentModal from "@/components/PaymentModal";

export default function LabelStationClient() {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"PERSONAL" | "BUSINESS">("PERSONAL");

  const handleOpenPayment = (plan: "PERSONAL" | "BUSINESS") => {
    setSelectedPlan(plan);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white">
      {/* 1. Hero Section */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden border-b border-slate-800/80">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-sky-600/20 via-indigo-600/10 to-transparent blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>2026 차세대 올인원 라벨 자동화 시스템</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            바코드 스캔 즉시 <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400">1초 직통 라벨 출력</span>
            <br />
            엑셀에서 ERP 자동 등록까지 한 번에
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            비싼 외산 프로그램(BarTender)은 이제 그만. 블루투스 바코드 스캐너 연동부터
            웹 캔버스 자유 라벨 디자이너, 엑셀 ➔ 웹 ERP 무인 타이핑 자동화까지 단 하나의 솔루션으로 완결합니다.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleOpenPayment("PERSONAL")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-base bg-sky-500 hover:bg-sky-400 text-white shadow-xl shadow-sky-500/25 transition"
            >
              <CreditCard className="w-5 h-5" />
              <span>정품 라이선스 구매하기</span>
            </button>
            <a
              href="/downloads/LabelStation_Setup_v1.0.0.exe"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-base bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
            >
              <Download className="w-5 h-5 text-slate-400" />
              <span>14일 무료 체험판 다운로드</span>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zebra GK420d / ZD420 / ZT411 완벽 지원</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zero-Focus 0.1초 초고속 스캔</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1회 결제 평생 영구 소장</div>
          </div>
        </div>
      </section>

      {/* 2. 3대 킬러 기능 섹션 */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Core Capabilities</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">
            실무자의 시간을 90% 아껴주는 3대 핵심 혁신
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-8 transition space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Zero-Focus 1초 고속 출력</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              화면을 클릭하고 포커스를 맞출 필요가 없습니다. 블루투스 스캐너로 실물 바코드를 콕 찍는 순간, 0.1초 만에 DB를 조회하고 Zebra 프린터로 1초 만에 라벨이 튀어나옵니다.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-8 transition space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">웹 캔버스 비주얼 디자이너</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              자산 대형(72×40), 소형 QR(50×25), 시리얼 전용 라벨 등 다양한 규격을 마우스 드래그 앤 드롭으로 1분 만에 디자인하고, Zebra 표준 ZPL 코드로 자동 변환 저장합니다.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-8 transition space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">엑셀 ➔ ERP 무인 자동 입력 RPA</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              엑셀 시트를 넣으면 Edge/Chrome 브라우저를 띄워 사내 ERP 로그인부터 입고 폼 1행씩 자동 타이핑, 저장 및 확인 알럿 수락까지 완벽하게 대신 처리합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Pricing Section */}
      <section className="py-20 px-4 bg-slate-900/40 border-t border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Transparent Pricing</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">
              합리적인 1회 결제 영구 소장 라이선스
            </h2>
            <p className="text-sm text-slate-400 mt-2">매달 나가는 구독료 부담 없이, 단 한 번의 결제로 영구 사용하세요.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Personal Plan */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">스탠다드 플랜</h3>
                    <p className="text-xs text-slate-400 mt-1">개인 실무자 및 1인 작업장 추천</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-800 text-slate-300">1 PC 영구</span>
                </div>

                <div className="mt-6 mb-8">
                  <span className="text-4xl font-black text-white">₩55,000</span>
                  <span className="text-xs text-slate-400 ml-2">/ 영구 소장 (VAT 포함)</span>
                </div>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" /> 1대 PC 고속 직통 라벨 출력</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" /> 웹 캔버스 비주얼 서식 디자이너</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" /> 기본 3종 프리셋 라벨 서식</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" /> 엑셀 데이터 일괄 라벨 출력</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" /> PC 교체 시 1회 무료 기기 이전 지원</li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenPayment("PERSONAL")}
                className="mt-8 w-full py-3.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
              >
                스탠다드 라이선스 구매하기
              </button>
            </div>

            {/* Business Plan */}
            <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute -top-3.5 right-8 bg-emerald-500 text-slate-950 text-xs font-black px-3 py-1 rounded-full uppercase">
                Best Popular
              </div>

              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">비즈니스 플랜</h3>
                    <p className="text-xs text-slate-400 mt-1">기업 물류창고, 렌탈/제조사 추천</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">3 PC 동시 인증</span>
                </div>

                <div className="mt-6 mb-8">
                  <span className="text-4xl font-black text-emerald-400">₩165,000</span>
                  <span className="text-xs text-slate-400 ml-2">/ 영구 소장 (VAT 포함)</span>
                </div>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> <strong>3대 PC 동시 정품 인증</strong> (작업대별 설치)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> <strong>엑셀 ➔ ERP 무인 자동 입력 RPA 엔진</strong> 포함</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 무제한 커스텀 서식 생성 및 영구 저장</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 복수 프린터(GK420/ZD420/ZT411) 네트워크 출력</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 우선 고객 기술지원 & 세금계산서 발행 지원</li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenPayment("BUSINESS")}
                className="mt-8 w-full py-3.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition"
              >
                비즈니스 라이선스 구매하기
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        defaultProductId="LABEL_STATION"
        defaultPlanType={selectedPlan}
      />
    </div>
  );
}
