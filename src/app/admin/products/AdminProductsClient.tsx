"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  DollarSign,
  Layers,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit3,
  Sliders,
  ChevronRight,
  Shield,
  FileText,
  Printer,
  Download
} from "lucide-react";
import { Product, ProductPlan } from "@/lib/productService";

export default function AdminProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // New Product Form State
  const [newProductId, setNewProductId] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductNameEn, setNewProductNameEn] = useState("");
  const [newVersion, setNewVersion] = useState("v1.0.0");
  const [newBadge, setNewBadge] = useState("신규 출시");
  const [newSummary, setNewSummary] = useState("");
  const [newDetailUrl, setNewDetailUrl] = useState("");
  const [newDownloadUrl, setNewDownloadUrl] = useState("");
  const [newFeatures, setNewFeatures] = useState("");

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/products?admin=true");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("상품 목록 로딩 오류:", err);
      setStatusMessage({ type: "error", text: "상품 목록을 불러오는데 실패했습니다." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  };

  // Toggle Product Visibility
  const handleToggleProductPublish = async (productId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateProduct",
          productId,
          updates: { isPublished: !currentStatus },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, isPublished: !currentStatus } : p))
        );
        showToast("success", `상품 노출 상태가 [${!currentStatus ? "게시" : "숨김"}]으로 변경되었습니다.`);
      } else {
        showToast("error", data.message || "상태 변경 실패");
      }
    } catch (err: any) {
      showToast("error", err.message || "통신 오류");
    }
  };

  // Toggle Plan Active
  const handleTogglePlanActive = async (productId: string, planType: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePlan",
          productId,
          planType,
          updates: { isActive: !currentActive },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id !== productId) return p;
            return {
              ...p,
              plans: p.plans.map((pl) =>
                pl.planType === planType ? { ...pl, isActive: !currentActive } : pl
              ),
            };
          })
        );
        showToast("success", `플랜 판매 상태가 [${!currentActive ? "판매 활성" : "판매 중단"}]으로 변경되었습니다.`);
      } else {
        showToast("error", data.message || "플랜 변경 실패");
      }
    } catch (err: any) {
      showToast("error", err.message || "통신 오류");
    }
  };

  // Save Plan Price & Limits
  const handleSavePlan = async (productId: string, plan: ProductPlan) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePlan",
          productId,
          planType: plan.planType,
          updates: {
            planName: plan.planName,
            planBadge: plan.planBadge,
            priceKrw: Number(plan.priceKrw),
            priceUsd: Number(plan.priceUsd),
            maxActivations: Number(plan.maxActivations),
            deviceDesc: plan.deviceDesc,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `[${productId} - ${plan.planName}] 가격 및 설정이 저장되었습니다.`);
      } else {
        showToast("error", data.message || "플랜 저장 실패");
      }
    } catch (err: any) {
      showToast("error", err.message || "통신 오류");
    }
  };

  // Save Product Basic Info
  const handleSaveProduct = async (product: Product) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateProduct",
          productId: product.id,
          updates: {
            name: product.name,
            nameEn: product.nameEn,
            version: product.version,
            badge: product.badge,
            summary: product.summary,
            detailUrl: product.detailUrl,
            downloadUrl: product.downloadUrl,
            sortOrder: Number(product.sortOrder),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `[${product.name}] 기본 정보가 저장되었습니다.`);
      } else {
        showToast("error", data.message || "상품 저장 실패");
      }
    } catch (err: any) {
      showToast("error", err.message || "통신 오류");
    }
  };

  // Delete Product
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`정말로 상품 [${productName}]을(를) 영구 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteProduct",
          id: productId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        showToast("success", `상품 [${productName}]이(가) 삭제되었습니다.`);
      } else {
        showToast("error", data.message || "상품 삭제 실패");
      }
    } catch (err: any) {
      showToast("error", err.message || "통신 오류");
    }
  };

  // Handle Add New Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductId || !newProductName) {
      showToast("error", "상품 코드와 상품명을 입력해주세요.");
      return;
    }

    const featureList = newFeatures
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const newProd: Product = {
      id: newProductId.trim().toUpperCase(),
      name: newProductName.trim(),
      nameEn: newProductNameEn.trim(),
      version: newVersion.trim(),
      badge: newBadge.trim(),
      summary: newSummary.trim(),
      features: featureList,
      iconType: "file",
      detailUrl: newDetailUrl.trim(),
      downloadUrl: newDownloadUrl.trim(),
      isPublished: true,
      sortOrder: products.length + 1,
      plans: [
        {
          productId: newProductId.trim().toUpperCase(),
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
          productId: newProductId.trim().toUpperCase(),
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
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsertProduct",
          product: newProd,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `신규 상품 [${newProductName}]이(가) 등록되었습니다.`);
        setIsAddingProduct(false);
        // Reset form
        setNewProductId("");
        setNewProductName("");
        setNewProductNameEn("");
        setNewSummary("");
        setNewFeatures("");
        fetchProducts();
      } else {
        showToast("error", data.message || "상품 등록 실패");
      }
    } catch (err: any) {
      showToast("error", err.message || "통신 오류");
    }
  };

  // Inline state updates
  const updateProductField = (productId: string, field: keyof Product, value: any) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, [field]: value } : p))
    );
  };

  const updatePlanField = (
    productId: string,
    planType: string,
    field: keyof ProductPlan,
    value: any
  ) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          plans: p.plans.map((pl) =>
            pl.planType === planType ? { ...pl, [field]: value } : pl
          ),
        };
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400 mb-1">
              <span>ADMINISTRATION STUDIO</span>
              <span>•</span>
              <span>CATALOG CMS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              소프트웨어 카탈로그 및 가격 관리
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              쇼핑몰 페이지 노출/숨김 여부 및 플랜별 원화(KRW)/달러(USD) 가격을 실시간으로 제어합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/products"
              target="_blank"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-bold text-slate-200 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>스토어 화면 바로가기</span>
            </Link>

            <button
              onClick={() => setIsAddingProduct(!isAddingProduct)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>신규 상품 추가</span>
            </button>

            <button
              onClick={fetchProducts}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Release & Upload Workflow Guide Banner */}
        <div className="mt-6 bg-blue-950/40 border border-blue-800/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0 mt-0.5">
              <Download className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>최신 실행 파일(EXE) 배포 및 Cloudflare R2 업로드 방법</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/60">원클릭 자동화</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <code className="text-sky-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">D:\01.AntiGravity\999.매뉴얼제작\배포_Cloudflare업로드.bat</code>을 더블클릭하면 최신 바이너리가 Cloudflare R2로 자동 업로드되며, 이 관리자 페이지의 버전 번호 및 다운로드 URL도 실시간 자동 갱신됩니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://pub-4bd1b65a7bcc4eef8993da27e7362727.r2.dev/releases/ManualStudio_latest.exe"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <span>현재 R2 최신 파일 확인</span>
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
            </a>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`mt-4 p-4 rounded-xl flex items-center gap-3 text-xs font-bold border transition ${
              statusMessage.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                : "bg-rose-950/80 border-rose-500/50 text-rose-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Add Product Modal / Panel */}
        {isAddingProduct && (
          <div className="bg-slate-900 border-2 border-sky-500/60 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">신규 소프트웨어 등록</h2>
              </div>
              <button
                onClick={() => setIsAddingProduct(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-400">상품 코드 (ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="예: UNIVERSAL_RPA"
                    value={newProductId}
                    onChange={(e) => setNewProductId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-400">상품명 (한국어)</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 유니버설 RPA"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-400">상품명 (영문)</label>
                  <input
                    type="text"
                    placeholder="예: Universal RPA Studio"
                    value={newProductNameEn}
                    onChange={(e) => setNewProductNameEn(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-400">버전 (Version)</label>
                  <input
                    type="text"
                    placeholder="v1.0.0"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-400">뱃지 라벨</label>
                  <input
                    type="text"
                    placeholder="Best Seller / New Release"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-400">상세 설명 랜딩 링크</label>
                  <input
                    type="text"
                    placeholder="/manual-studio"
                    value={newDetailUrl}
                    onChange={(e) => setNewDetailUrl(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400">상품 한 줄 요약</label>
                <input
                  type="text"
                  placeholder="상품의 핵심 가치와 기능을 설명하는 문장입니다."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400">특장점 목록 (줄바꿈으로 구분)</label>
                <textarea
                  rows={3}
                  placeholder="특장점 1&#10;특장점 2&#10;특장점 3"
                  value={newFeatures}
                  onChange={(e) => setNewFeatures(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingProduct(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow"
                >
                  상품 등록 완료
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Product Cards List */}
        {products.map((product) => (
          <div
            key={product.id}
            className={`bg-slate-900 border rounded-3xl p-6 sm:p-8 transition shadow-xl space-y-6 ${
              product.isPublished
                ? "border-slate-800 hover:border-slate-700"
                : "border-rose-900/60 bg-slate-950/60 opacity-80"
            }`}
          >
            {/* Product Header Row */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold text-lg">
                  {product.iconType === "printer" ? (
                    <Printer className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <FileText className="w-6 h-6 text-sky-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-black text-white">{product.name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      {product.id}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        product.isPublished
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      }`}
                    >
                      {product.isPublished ? "스토어 게시 중 (ON)" : "스토어 숨김 (OFF)"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {product.nameEn || product.name} • {product.version}
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleProductPublish(product.id, product.isPublished)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                    product.isPublished
                      ? "bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-rose-900/60"
                      : "bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/60"
                  }`}
                >
                  {product.isPublished ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>상품 숨기기 (내리기)</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>상품 스토어에 게시하기</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleSaveProduct(product)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition"
                >
                  <Save className="w-4 h-4 text-sky-400" />
                  <span>정보 저장</span>
                </button>

                <button
                  onClick={() => handleDeleteProduct(product.id, product.name)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-rose-900/30 text-slate-500 hover:text-rose-400 transition"
                  title="상품 영구 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Product Metadata Editable Form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400">표시 상품명</label>
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) => updateProductField(product.id, "name", e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400">버전 번호</label>
                <input
                  type="text"
                  value={product.version}
                  onChange={(e) => updateProductField(product.id, "version", e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400">뱃지 라벨</label>
                <input
                  type="text"
                  value={product.badge}
                  onChange={(e) => updateProductField(product.id, "badge", e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400">정렬 순서</label>
                <input
                  type="number"
                  value={product.sortOrder}
                  onChange={(e) => updateProductField(product.id, "sortOrder", e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-4 flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400">요약 설명</label>
                <input
                  type="text"
                  value={product.summary}
                  onChange={(e) => updateProductField(product.id, "summary", e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400">
                    최신 설치/실행 파일 다운로드 링크 (Cloudflare R2 URL)
                  </label>
                  {product.downloadUrl && (
                    <a
                      href={product.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline flex items-center gap-0.5 text-[10px]"
                    >
                      <span>링크 열기</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={product.downloadUrl || ""}
                  onChange={(e) => updateProductField(product.id, "downloadUrl", e.target.value)}
                  placeholder="https://pub-4bd1b65a7bcc4eef8993da27e7362727.r2.dev/releases/ManualStudio_latest.exe"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400">제품 상세 설명 랜딩 페이지 링크</label>
                <input
                  type="text"
                  value={product.detailUrl || ""}
                  onChange={(e) => updateProductField(product.id, "detailUrl", e.target.value)}
                  placeholder="/manual-studio"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Plans Management Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>라이선스 플랜 및 가격 정책 ({product.plans.length}개)</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.plans.map((plan) => (
                  <div
                    key={plan.planType}
                    className={`p-5 rounded-2xl border transition space-y-4 ${
                      plan.isActive
                        ? "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                        : "bg-slate-950/30 border-rose-950/60 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{plan.planName}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {plan.planType}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePlanActive(product.id, plan.planType, plan.isActive)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                            plan.isActive
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-700 hover:bg-emerald-900/60"
                              : "bg-rose-950/60 text-rose-300 border-rose-700 hover:bg-rose-900/60"
                          }`}
                        >
                          {plan.isActive ? "판매 중 (ON)" : "판매 중지 (OFF)"}
                        </button>
                      </div>
                    </div>

                    {/* Price Inputs: KRW & USD */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-400">
                          대한민국 원화 (KRW ₩)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">₩</span>
                          <input
                            type="number"
                            step="1000"
                            value={plan.priceKrw}
                            onChange={(e) =>
                              updatePlanField(product.id, plan.planType, "priceKrw", e.target.value)
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm font-bold text-white focus:border-sky-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-400">
                          글로벌 달러 (USD $)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">$</span>
                          <input
                            type="number"
                            step="1"
                            value={plan.priceUsd}
                            onChange={(e) =>
                              updatePlanField(product.id, plan.planType, "priceUsd", e.target.value)
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Device Limit and Description */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-400">
                          허용 기기 대수 (PC Slot)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={plan.maxActivations}
                          onChange={(e) =>
                            updatePlanField(product.id, plan.planType, "maxActivations", e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:border-sky-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-400">
                          기기 설명 문구
                        </label>
                        <input
                          type="text"
                          value={plan.deviceDesc}
                          onChange={(e) =>
                            updatePlanField(product.id, plan.planType, "deviceDesc", e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleSavePlan(product.id, plan)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition shadow"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>가격 적용</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
