"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  CreditCard,
  Globe,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Zap,
  Sparkles,
  ArrowRight,
  Smartphone,
  Cpu,
  Mail,
  User,
  ExternalLink
} from "lucide-react";
import { Product, ProductPlan } from "@/lib/productService";

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProductId?: string;
  defaultPlanType?: string;
  productsList?: Product[];
}

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "MANUAL_STUDIO",
    name: "매뉴얼 스튜디오",
    nameEn: "Manual Studio",
    version: "v1.4.0",
    badge: "초고속 매뉴얼 저작 도구",
    summary: "화면 캡처부터 1·2·3 자동 번호 스탬프, PPTX·구글 슬라이드 자동 생성",
    features: [],
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
    badge: "1초 바코드 출력 & ERP 연동",
    summary: "블루투스 바코드 스캔 즉시 0.1초 DB 매칭 및 1초 Zebra 고속 라벨 직통 출력",
    features: [],
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

export default function PaymentModal({
  isOpen,
  onClose,
  defaultProductId = "MANUAL_STUDIO",
  defaultPlanType = "PERSONAL",
  productsList,
}: PaymentModalProps) {
  const router = useRouter();
  const [currency, setCurrency] = useState<"KRW" | "USD">("KRW");
  const [products, setProducts] = useState<Product[]>(productsList || FALLBACK_PRODUCTS);
  const [productId, setProductId] = useState<string>(defaultProductId);
  const [planType, setPlanType] = useState<string>(defaultPlanType);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [countryCode, setCountryCode] = useState("KR");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Sync props when opening
  useEffect(() => {
    if (defaultProductId) setProductId(defaultProductId);
    if (defaultPlanType) setPlanType(defaultPlanType);
  }, [defaultProductId, defaultPlanType, isOpen]);

  // Fetch live products if not passed
  useEffect(() => {
    if (!productsList && isOpen) {
      fetch("/api/products")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.products && data.products.length > 0) {
            setProducts(data.products);
          }
        })
        .catch((err) => console.error("Error loading products:", err));
    } else if (productsList) {
      setProducts(productsList);
    }
  }, [productsList, isOpen]);

  if (!isOpen) return null;

  // Active products only
  const activeProducts = products.filter((p) => p.isPublished);
  const currentProduct = activeProducts.find((p) => p.id === productId) || activeProducts[0] || FALLBACK_PRODUCTS[0];
  const activePlans = currentProduct.plans?.filter((pl) => pl.isActive) || [];
  const currentPlan = activePlans.find((pl) => pl.planType === planType) || activePlans[0] || {
    productId: currentProduct.id,
    planType: "PERSONAL",
    planName: "기본 플랜",
    priceKrw: 33000,
    priceUsd: 29.0,
    maxActivations: 1,
    deviceDesc: "1 PC 영구 소장",
    isActive: true,
    sortOrder: 1,
  };

  const priceDisplay = currency === "KRW" 
    ? `₩${Number(currentPlan.priceKrw).toLocaleString()}` 
    : `$${currentPlan.priceUsd}`;

  const handleCheckout = async (isTestSimulate: boolean = false) => {
    if (!customerEmail || !customerEmail.includes("@")) {
      setErrorMessage("유효한 이메일 주소를 입력해주세요. 라이선스 키가 이 메일로 즉시 발송됩니다.");
      return;
    }

    setErrorMessage("");
    setIsProcessing(true);

    try {
      if (isTestSimulate || currency === "KRW") {
        // Direct Checkout / Test Simulator
        const res = await fetch("/api/payments/test-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: currentProduct.id,
            planType: currentPlan.planType,
            customerName: customerName || (currency === "KRW" ? "구매 고객" : "Global Customer"),
            customerEmail,
            countryCode: currency === "KRW" ? "KR" : countryCode,
            languageCode: currency === "KRW" ? "ko" : countryCode === "JP" ? "ja" : "en",
            amount: currency === "KRW" ? currentPlan.priceKrw : currentPlan.priceUsd,
            currency,
          }),
        });

        const data = await res.json();
        if (data.success) {
          onClose();
          router.push(
            `/payment/success?orderNo=${encodeURIComponent(data.orderNo)}&licenseKey=${encodeURIComponent(
              data.licenseKey
            )}&productId=${currentProduct.id}&planType=${currentPlan.planType}&email=${encodeURIComponent(customerEmail)}`
          );
        } else {
          setErrorMessage(data.message || "결제 처리에 실패했습니다.");
        }
      } else {
        // USD Global Lemon Squeezy / Stripe Simulation
        const res = await fetch("/api/payments/global/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: currentProduct.id,
            planType: currentPlan.planType,
            customerName: customerName || "Global Customer",
            customerEmail,
            countryCode,
            amount: currentPlan.priceUsd,
            currency: "USD",
          }),
        });

        const data = await res.json();
        if (data.success) {
          onClose();
          router.push(
            `/payment/success?orderNo=${encodeURIComponent(data.orderNo)}&licenseKey=${encodeURIComponent(
              data.licenseKey
            )}&productId=${currentProduct.id}&planType=${currentPlan.planType}&email=${encodeURIComponent(customerEmail)}`
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "통신 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-sky-400 tracking-tight">DRAGON<span className="text-white">RPA</span></span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
              정품 라이선스 결제
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Currency Toggle */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              결제 통화 / 결제 국가 선택 (Currency)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrency("KRW");
                  setCountryCode("KR");
                }}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border text-sm font-bold transition ${
                  currency === "KRW"
                    ? "bg-sky-600 text-white border-sky-500 shadow-lg shadow-sky-600/30"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                }`}
              >
                <span>🇰🇷 대한민국 원화 (KRW ₩)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrency("USD");
                  setCountryCode("US");
                }}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border text-sm font-bold transition ${
                  currency === "USD"
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>🌐 글로벌 결제 (USD $)</span>
              </button>
            </div>
          </div>

          {/* Product Selection */}
          {activeProducts.length > 1 && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                구매 대상 소프트웨어 (Software)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {activeProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProductId(p.id);
                      if (p.plans && p.plans.length > 0) {
                        setPlanType(p.plans[0].planType);
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      currentProduct.id === p.id
                        ? "bg-slate-800 border-sky-500 ring-1 ring-sky-500"
                        : "bg-slate-950/40 border-slate-800 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="text-sm font-bold text-white">{p.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.badge || p.version}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Plan Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              라이선스 플랜 선택 (Plan)
            </label>
            <div className={`grid ${activePlans.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-3`}>
              {activePlans.map((plan) => {
                const isSelected = currentPlan.planType === plan.planType;
                return (
                  <button
                    key={plan.planType}
                    type="button"
                    onClick={() => setPlanType(plan.planType)}
                    className={`p-4 rounded-xl border text-left transition ${
                      isSelected
                        ? "bg-slate-800/90 border-sky-500 ring-2 ring-sky-500/50"
                        : "bg-slate-950/40 border-slate-800 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-bold text-white">{plan.planName}</div>
                      {plan.planBadge && (
                        <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium">
                          {plan.planBadge}
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-black text-sky-400 mt-2">
                      {currency === "KRW" ? `₩${Number(plan.priceKrw).toLocaleString()}` : `$${plan.priceUsd}`}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{plan.deviceDesc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              구매자 정보 (라이선스 키 수신용)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">구매자 / 회사명</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="홍길동 / (주)회사명"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  이메일 주소 <span className="text-rose-400">*필수</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="buyer@example.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            {currency === "USD" && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">국가 (Country for Localization)</label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="US">United States (English)</option>
                  <option value="JP">Japan (日本語)</option>
                  <option value="CN">China (简体中文)</option>
                  <option value="DE">Germany (Deutsch)</option>
                  <option value="FR">France (Français)</option>
                  <option value="ES">Spain (Español)</option>
                  <option value="GB">United Kingdom (English)</option>
                  <option value="KR">South Korea (한국어)</option>
                </select>
              </div>
            )}
          </div>

          {/* Payment Methods Notice */}
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/40 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                {currency === "KRW"
                  ? "토스페이먼츠 보안 결제 (카카오페이, 네이버페이, 카드, 계좌이체)"
                  : "글로벌 보안 결제 (Apple Pay, Google Pay, Visa, Mastercard, PayPal)"}
              </span>
            </div>
            <span className="text-slate-500 font-mono">256-bit SSL</span>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400 font-medium">
              ⚠️ {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400">총 결제 금액 (VAT 포함)</div>
            <div className="text-2xl font-extrabold text-white">{priceDisplay}</div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleCheckout(false)}
              disabled={isProcessing}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white shadow-lg transition ${
                currency === "KRW"
                  ? "bg-sky-500 hover:bg-sky-400 shadow-sky-500/25"
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25"
              } disabled:opacity-50`}
            >
              {isProcessing ? (
                <span>결제 처리 중...</span>
              ) : (
                <>
                  <span>{priceDisplay} 결제하기</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
