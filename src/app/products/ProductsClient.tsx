"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Download,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Globe,
  Zap,
  Printer,
  FileText,
  Bot,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  Laptop,
  Check,
  Package,
  Star,
  Award,
  SlidersHorizontal,
  RefreshCw,
  Camera
} from "lucide-react";
import PaymentModal from "@/components/PaymentModal";
import { Product } from "@/lib/productService";

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "MANUAL_STUDIO",
    name: "매뉴얼 스튜디오",
    nameEn: "Manual Studio",
    version: "v1.4.0",
    badge: "Best Seller",
    summary: "화면 캡처부터 1·2·3 자동 번호 스탬프, 스포트라이트 주석, 파워포인트(PPTX)·구글 슬라이드·Markdown·HTML 원클릭 자동 생성까지. AI 에이전트(MCP)를 지원하는 차세대 매뉴얼 저작 소프트웨어.",
    features: [
      "F9 원클릭 고속 캡처 & 1·2·3 자동 번호 스탬프",
      "파워포인트(F10) & 구글 슬라이드(F11) 1초 자동 슬라이드 주입",
      "Anthropic 표준 MCP 서버 및 헤드리스 CLI 완벽 지원",
      "27.97MB 단일 무설치 포터블 실행 파일 (Nuitka C 컴파일)",
    ],
    iconType: "file",
    detailUrl: "/manual-studio",
    downloadUrl: "/downloads/ManualStudio.exe",
    isPublished: true,
    sortOrder: 1,
    plans: [
      {
        productId: "MANUAL_STUDIO",
        planType: "PERSONAL",
        planName: "개인용 (1 PC)",
        planBadge: "영구 소장",
        priceKrw: 33000,
        priceUsd: 29.0,
        maxActivations: 1,
        deviceDesc: "1 PC 영구 소장",
        isActive: true,
        sortOrder: 1,
      },
      {
        productId: "MANUAL_STUDIO",
        planType: "BUSINESS",
        planName: "기업용 (3 PC)",
        planBadge: "추천",
        priceKrw: 110000,
        priceUsd: 89.0,
        maxActivations: 3,
        deviceDesc: "3 PC 동시 인증",
        isActive: true,
        sortOrder: 2,
      },
    ],
  },
  {
    id: "LABEL_STATION",
    name: "라벨스테이션",
    nameEn: "Label Print Station",
    version: "v1.0.0",
    badge: "New Release",
    summary: "블루투스 바코드 스캔 즉시 0.1초 DB 매칭 및 1초 Zebra 고속 라벨 직통 출력. 웹 캔버스 비주얼 서식 디자이너와 엑셀 ➔ 웹 ERP 무인 타이핑 자동화 RPA를 통합한 올인원 솔루션.",
    features: [
      "Zero-Focus 블루투스 스캔 감지 & 1초 직통 Zebra 출력",
      "Zebra GK420d, ZD420, ZT411 (203/300 DPI) ZPL 완벽 지원",
      "웹 브라우저 기반 마우스 드래그앤드롭 서식 디자이너",
      "엑셀 데이터 ➔ 웹 ERP 무인 타이핑 자동화 (비즈니스 플랜)",
    ],
    iconType: "printer",
    detailUrl: "/label-station",
    downloadUrl: "/downloads/LabelStation_Setup_v1.0.0.exe",
    isPublished: true,
    sortOrder: 2,
    plans: [
      {
        productId: "LABEL_STATION",
        planType: "PERSONAL",
        planName: "스탠다드 (1 PC)",
        planBadge: "영구 소장",
        priceKrw: 55000,
        priceUsd: 49.0,
        maxActivations: 1,
        deviceDesc: "1 PC / 1 프린터",
        isActive: true,
        sortOrder: 1,
      },
      {
        productId: "LABEL_STATION",
        planType: "BUSINESS",
        planName: "비즈니스 (3 PC)",
        planBadge: "RPA 내장",
        priceKrw: 165000,
        priceUsd: 129.0,
        maxActivations: 3,
        deviceDesc: "3 PC / 무제한 출력",
        isActive: true,
        sortOrder: 2,
      },
    ],
  },
];

export default function ProductsClient() {
  const [currency, setCurrency] = useState<"KRW" | "USD">("KRW");
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("MANUAL_STUDIO");
  const [selectedPlanType, setSelectedPlanType] = useState<string>("PERSONAL");

  // Fetch live products from DB
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.products && data.products.length > 0) {
          setProducts(data.products);
        }
      })
      .catch((err) => console.error("Error loading products:", err));
  }, []);

  const handleOpenPayment = (productId: string, planType: string) => {
    setSelectedProductId(productId);
    setSelectedPlanType(planType);
    setIsPaymentModalOpen(true);
  };

  const publishedProducts = products.filter((p) => p.isPublished);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white">
      {/* 0. Global Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
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
                <span className="text-[10px] text-slate-400 mt-0.5">공식 스토어</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
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

            <Link
              href="/license-lookup"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap"
            >
              키 찾기/기기관리
            </Link>

            <Link
              href="/about"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap"
            >
              회사소개
            </Link>

            <Link
              href="/portfolio"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap hidden sm:inline-flex"
            >
              포트폴리오
            </Link>
          </div>
        </div>
      </header>

      {/* 1. Store Hero */}
      <section className="relative pt-20 pb-16 px-4 overflow-hidden border-b border-slate-800">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-gradient-to-tr from-sky-600/20 via-blue-600/10 to-indigo-600/15 blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>DragonRPA Official Software Store</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            실무자의 반복 작업을 <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-300 to-emerald-400">0으로 줄여주는</span>
            <br />
            정품 소프트웨어 라인업
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
            매달 청구되는 구독료 부담 없이, 단 1회 결제로 평생 영구 소장하세요.
            국내(원화) 및 해외(달러) 결제 즉시 0초 만에 정품 라이선스 키가 발급됩니다.
          </p>

          {/* Currency Switcher */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <button
              onClick={() => setCurrency("KRW")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                currency === "KRW"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🇰🇷 대한민국 원화 (KRW ₩)</span>
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                currency === "USD"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>🌐 글로벌 결제 (USD $)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Flagship Products Grid */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        {publishedProducts.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/60 rounded-3xl border border-slate-800 p-8">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-300">현재 게시 준비 중인 상품입니다</h3>
            <p className="text-xs text-slate-500 mt-1">새로운 소프트웨어 업데이트를 준비하고 있습니다.</p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${publishedProducts.length > 1 ? "lg:grid-cols-2" : "max-w-2xl mx-auto"} gap-8`}>
            {publishedProducts.map((product) => {
              const activePlans = product.plans?.filter((pl) => pl.isActive) || [];
              const isPrinter = product.iconType === "printer";

              return (
                <div
                  key={product.id}
                  className={`bg-slate-900/90 border rounded-3xl p-8 transition-all flex flex-col justify-between shadow-2xl relative overflow-hidden group ${
                    isPrinter
                      ? "border-slate-800 hover:border-emerald-500/60"
                      : "border-slate-800 hover:border-sky-500/60"
                  }`}
                >
                  <div
                    className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl transition-colors pointer-events-none ${
                      isPrinter
                        ? "bg-emerald-500/5 group-hover:bg-emerald-500/10"
                        : "bg-sky-500/5 group-hover:bg-sky-500/10"
                    }`}
                  />

                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
                            isPrinter
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-sky-500/10 border-sky-500/30 text-sky-400"
                          }`}
                        >
                          {isPrinter ? <Printer className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">{product.name}</h2>
                          <p className="text-xs text-slate-400">
                            {product.nameEn || product.name} {product.version}
                          </p>
                        </div>
                      </div>
                      {product.badge && (
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            isPrinter
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : "bg-sky-500/20 text-sky-300 border-sky-500/30"
                          }`}
                        >
                          {product.badge}
                        </span>
                      )}
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-slate-300 leading-relaxed mb-6">
                      {product.summary}
                    </p>

                    {/* Dynamic Plans Grid */}
                    <div className={`grid grid-cols-1 ${activePlans.length > 1 ? "sm:grid-cols-2" : ""} gap-4 mb-6`}>
                      {activePlans.map((plan, idx) => {
                        const isPrimary = idx === 1 || plan.planType === "BUSINESS";
                        const priceText = currency === "KRW"
                          ? `₩${Number(plan.priceKrw).toLocaleString()}`
                          : `$${plan.priceUsd}`;

                        return (
                          <div
                            key={plan.planType}
                            className={`p-4 rounded-2xl bg-slate-950/60 border space-y-2 relative ${
                              isPrimary
                                ? isPrinter
                                  ? "border-emerald-500/40"
                                  : "border-sky-500/40"
                                : "border-slate-800"
                            }`}
                          >
                            <div className="flex justify-between text-xs font-semibold">
                              <span className={isPrimary ? (isPrinter ? "text-emerald-400" : "text-sky-400") : "text-slate-400"}>
                                {plan.planName}
                              </span>
                              {plan.planBadge && (
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${
                                    isPrimary
                                      ? isPrinter
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : "bg-sky-500/20 text-sky-300"
                                      : "text-slate-300"
                                  }`}
                                >
                                  {plan.planBadge}
                                </span>
                              )}
                            </div>

                            <div
                              className={`text-2xl font-black ${
                                isPrimary
                                  ? isPrinter
                                    ? "text-emerald-400"
                                    : "text-sky-400"
                                  : "text-white"
                              }`}
                            >
                              {priceText}
                            </div>

                            <button
                              onClick={() => handleOpenPayment(product.id, plan.planType)}
                              className={`w-full py-2.5 rounded-xl font-bold text-xs transition ${
                                isPrimary
                                  ? isPrinter
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                                    : "bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20"
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                              }`}
                            >
                              {plan.planName.split(" ")[0]} 구매하기
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Features List */}
                    {product.features && product.features.length > 0 && (
                      <ul className="space-y-2.5 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                        {product.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-2">
                            <Check
                              className={`w-4 h-4 shrink-0 ${
                                isPrinter ? "text-emerald-400" : "text-sky-400"
                              }`}
                            />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Card Footer Links */}
                  <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
                    {product.detailUrl && (
                      <Link
                        href={product.detailUrl}
                        className={`hover:underline flex items-center gap-1 font-semibold ${
                          isPrinter ? "text-emerald-400" : "text-sky-400"
                        }`}
                      >
                        <span>상세 기능 및 제원 보기</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {product.downloadUrl && (
                      <a
                        href={product.downloadUrl}
                        className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>무료 체험판 다운로드</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Trust & Guarantees */}
      <section className="py-16 px-4 bg-slate-900/40 border-t border-b border-slate-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <ShieldCheck className="w-8 h-8 text-sky-400 mb-1" />
            <h3 className="text-sm font-bold text-white">1회 결제 영구 소장</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              매달 청구되는 구독료가 없습니다. 단 한 번의 결제로 평생 정품으로 사용하세요.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <Zap className="w-8 h-8 text-amber-400 mb-1" />
            <h3 className="text-sm font-bold text-white">0초 즉시 라이선스 발급</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              결제 완료 즉시 화면에 라이선스 키가 표출되며, 고객 이메일로도 자동 전송됩니다.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <Laptop className="w-8 h-8 text-emerald-400 mb-1" />
            <h3 className="text-sm font-bold text-white">무료 PC 이전 지원</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              PC를 포맷하거나 새로 교체했을 때, 기존 기기를 해제하고 새 PC로 이전 등록할 수 있습니다.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <Award className="w-8 h-8 text-purple-400 mb-1" />
            <h3 className="text-sm font-bold text-white">100% 세금계산서 발행</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              기업 고객을 위한 전자세금계산서 및 현금영수증, 구매 증빙 인보이스를 완벽 지원합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 4. FAQ Section */}
      <section className="py-20 px-4 max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Help Center</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            자주 묻는 질문 (FAQ)
          </h2>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>라이선스 키를 분실하면 어떻게 하나요?</span>
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              홈페이지 상단의 <strong>[라이선스 키 찾기]</strong> 메뉴에서 구매 시 입력하셨던 이메일만 입력하시면, 0초 만에 보유 중인 모든 라이선스 키를 조회하고 이메일로 다시 보내드립니다.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>새로운 컴퓨터를 구매했을 때 라이선스를 옮길 수 있나요?</span>
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              네, 가능합니다. 기존 컴퓨터에서 라이선스 등록을 해제하거나 라이선스 조회 페이지에서 기기 등록을 초기화한 후 새 컴퓨터에서 라이선스 키를 다시 입력하시면 정상 인증됩니다.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>해외 카드(Visa, Master, AMEX) 및 PayPal로도 결제가 가능한가요?</span>
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              네, 상단의 [글로벌 결제 (USD $)] 탭을 선택하시면 Apple Pay, Google Pay, 해외 신용카드, PayPal을 통해 전 세계 어디서든 안전하게 달러로 결제하실 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-8 text-xs text-slate-400 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/symbol-192.png" alt="DragonRPA" className="w-5 h-5 rounded bg-white p-0.5 object-contain" />
            <span>(주)드래곤알피에이 | 대표이사: 이정용 | 사업자등록번호: 312-87-03310</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>문의: contact@dragonrpa.co.kr</span>
            <Link href="/license-lookup" className="hover:text-slate-200">라이선스키조회</Link>
            <Link href="/pc-wiki" className="hover:text-slate-200">피씨위키</Link>
            <Link href="/about" className="hover:text-slate-200">회사소개</Link>
            <Link href="/portfolio" className="hover:text-slate-200">포트폴리오</Link>
            <span className="text-slate-700">|</span>
            <Link href="/admin/products" className="hover:text-blue-400 text-slate-500">관리자 CMS</Link>
          </div>
        </div>
      </footer>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        defaultProductId={selectedProductId}
        defaultPlanType={selectedPlanType}
        productsList={publishedProducts}
      />
    </div>
  );
}
