"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Package, Plus, Search, RefreshCw, Download, Edit2, 
  Trash2, X, Check, Eye, AlertCircle, Save, Layers,
  ExternalLink, Building2, Cpu, HardDrive, Monitor, Shield
} from "lucide-react";

interface ProductModel {
  id: number;
  modelCode: string;
  modelName: string;
  shortName: string | null;
  category: string;
  manufacturer: string;
  standardMonthlyRate: number;
  standardDailyRate: number;
  standardPrice: number;
  cpu: string | null;
  ram: string | null;
  storage: string | null;
  gpu: string | null;
  spec: string;
  warrantyType: string | null;
  status: string;
  createdAt: string;
  totalAssets: number;
  ownedAssets: number;
  subleasedAssets: number;
  availableAssets: number;
  rentedAssets: number;
  repairingAssets: number;
}

interface ProductManagementTabProps {
  currentUser: any;
  onNavigateToAsset?: (modelName?: string) => void;
}

export const ProductManagementTab: React.FC<ProductManagementTabProps> = ({ 
  currentUser,
  onNavigateToAsset 
}) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";

  const [products, setProducts] = useState<ProductModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [manufacturerFilter, setManufacturerFilter] = useState("ALL");
  const [assetFilter, setAssetFilter] = useState<"ALL" | "WITH_ASSETS" | "NO_ASSETS">("ALL");

  // Slide-over Dossier Panel State
  const [selectedProduct, setSelectedProduct] = useState<ProductModel | null>(null);
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProductModel>>({});
  const [mappedAssets, setMappedAssets] = useState<any[]>([]);
  const [loadingMappedAssets, setLoadingMappedAssets] = useState(false);

  // New Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    modelCode: "",
    modelName: "",
    shortName: "",
    category: "IT/워크스테이션",
    manufacturer: "DragonRPA",
    standardMonthlyRate: "350000",
    standardDailyRate: "18000",
    standardPrice: "3200000",
    cpu: "",
    ram: "",
    storage: "",
    gpu: "",
    spec: "",
    warrantyType: "3년 무상",
  });

  // Toast State
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/products");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "제품 목록 조회 실패");
      setProducts(data.products || []);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch Mapped Assets for Dossier
  const fetchMappedAssets = async (productId: number) => {
    setLoadingMappedAssets(true);
    try {
      const res = await fetch(`/api/erp/assets?productId=${productId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMappedAssets(data.assets || []);
      }
    } catch (err) {
      console.error("Failed to load mapped assets:", err);
    } finally {
      setLoadingMappedAssets(false);
    }
  };

  const handleSelectProduct = (p: ProductModel) => {
    setSelectedProduct(p);
    setIsEditingDossier(false);
    setEditForm({ ...p });
    fetchMappedAssets(p.id);
  };

  // Unique Manufacturers & Categories
  const uniqueManufacturers = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.manufacturer).filter(Boolean)));
  }, [products]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;
      if (manufacturerFilter !== "ALL" && p.manufacturer !== manufacturerFilter) return false;
      if (assetFilter === "WITH_ASSETS" && p.totalAssets === 0) return false;
      if (assetFilter === "NO_ASSETS" && p.totalAssets > 0) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const mName = p.modelName.toLowerCase();
        const mCode = p.modelCode.toLowerCase();
        const sName = (p.shortName || "").toLowerCase();
        const spec = (p.spec || "").toLowerCase();
        const mf = p.manufacturer.toLowerCase();
        if (!mName.includes(q) && !mCode.includes(q) && !sName.includes(q) && !spec.includes(q) && !mf.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [products, categoryFilter, manufacturerFilter, assetFilter, searchTerm]);

  // KPI Metrics
  const kpiStats = useMemo(() => {
    const totalModels = products.length;
    let withAssetsCount = 0;
    let totalUnits = 0;
    let rentedUnits = 0;
    let availableUnits = 0;
    let repairingUnits = 0;

    for (const p of products) {
      if (p.totalAssets > 0) withAssetsCount++;
      totalUnits += p.totalAssets;
      rentedUnits += p.rentedAssets;
      availableUnits += p.availableAssets;
      repairingUnits += p.repairingAssets;
    }

    return { totalModels, withAssetsCount, totalUnits, rentedUnits, availableUnits, repairingUnits };
  }, [products]);

  // Handle Save (Dossier Edit)
  const handleSaveEdit = async () => {
    if (!selectedProduct) return;
    try {
      const res = await fetch("/api/erp/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProduct.id,
          ...editForm,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "수정 저장 실패");

      showToast("제품 모델 정보가 수정되었습니다.");
      setIsEditingDossier(false);
      fetchProducts();
      // Update selected product state
      setSelectedProduct((prev) => (prev ? { ...prev, ...editForm } : null));
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`제품 모델 [${name}]을(를) 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/erp/products?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");

      showToast("제품 모델이 삭제되었습니다.");
      if (selectedProduct?.id === id) {
        setSelectedProduct(null);
      }
      fetchProducts();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.modelCode.trim() || !addForm.modelName.trim()) {
      showToast("모델코드와 모델명은 필수 입력 항목입니다.", "error");
      return;
    }

    try {
      const res = await fetch("/api/erp/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "제품 등록 실패");

      showToast("신규 제품 모델이 등록되었습니다.");
      setShowAddModal(false);
      setAddForm({
        modelCode: "",
        modelName: "",
        shortName: "",
        category: "IT/워크스테이션",
        manufacturer: "DragonRPA",
        standardMonthlyRate: "350000",
        standardDailyRate: "18000",
        standardPrice: "3200000",
        cpu: "",
        ram: "",
        storage: "",
        gpu: "",
        spec: "",
        warrantyType: "3년 무상",
      });
      fetchProducts();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (products.length === 0) {
      showToast("내보낼 데이터가 없습니다.", "error");
      return;
    }

    const headers = [
      "모델코드", "모델명", "단축명", "제조사", "카테고리", 
      "월렌탈료(원)", "일할단가(원)", "판매가(원)", "CPU", "RAM", 
      "저장장치", "GPU", "제원", "보증구분", "총자산수", "대여중수", "임대가능수"
    ];

    const rows = products.map((p) => [
      p.modelCode,
      p.modelName,
      p.shortName || "-",
      p.manufacturer,
      p.category,
      p.standardMonthlyRate,
      p.standardDailyRate,
      p.standardPrice,
      p.cpu || "-",
      p.ram || "-",
      p.storage || "-",
      p.gpu || "-",
      p.spec || "-",
      p.warrantyType || "-",
      p.totalAssets,
      p.rentedAssets,
      p.availableAssets,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `제품모델대장_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("제품 대장이 CSV 파일로 다운로드되었습니다.");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded shadow text-xs font-bold flex items-center gap-2 border ${
            toast.type === "error"
              ? "bg-rose-950 border-rose-800 text-rose-200"
              : "bg-emerald-950 border-emerald-800 text-emerald-200"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1. Gutenberg Z-Pattern Scope: KPI Top Metrics Bar */}
      <div className="p-3 border-b flex flex-wrap items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <Package className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">전체 등록 모델</span>
            <span className="text-sm font-bold">{kpiStats.totalModels.toLocaleString()}개</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <Layers className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">총 보유 장비</span>
            <span className="text-sm font-bold text-emerald-700">{kpiStats.totalUnits.toLocaleString()}대</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <Monitor className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">현장 대여 운용중</span>
            <span className="text-sm font-bold text-blue-700">{kpiStats.rentedUnits.toLocaleString()}대</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <Shield className="w-5 h-5 text-teal-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">즉시 출고 가능</span>
            <span className="text-sm font-bold text-teal-700">{kpiStats.availableUnits.toLocaleString()}대</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <Cpu className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">정비/수리중</span>
            <span className="text-sm font-bold text-amber-700">{kpiStats.repairingUnits.toLocaleString()}대</span>
          </div>
        </div>
      </div>

      {/* 2. Gutenberg Z-Pattern Pipeline: Search & Action Toolbar */}
      <div className="p-3 border-b flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <div className="flex flex-col gap-1">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-2 rounded text-xs border"
            >
              <option value="ALL">전체 카테고리</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Manufacturer Filter */}
          <div className="flex flex-col gap-1">
            <select
              value={manufacturerFilter}
              onChange={(e) => setManufacturerFilter(e.target.value)}
              className="h-8 px-2 rounded text-xs border"
            >
              <option value="ALL">전체 제조사</option>
              {uniqueManufacturers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Asset Presence Filter */}
          <div className="flex flex-col gap-1">
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value as any)}
              className="h-8 px-2 rounded text-xs border"
            >
              <option value="ALL">보유 자산 전체</option>
              <option value="WITH_ASSETS">자산 보유 모델만</option>
              <option value="NO_ASSETS">미보유 모델만</option>
            </select>
          </div>

          {/* Full-text Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="모델명 / 코드 / 제원 검색"
              className="h-8 pl-8 pr-3 rounded text-xs border w-56"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="h-8 px-2.5 rounded border text-xs flex items-center gap-1.5 font-medium hover:opacity-80 transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>새로고침</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="h-8 px-2.5 rounded border text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition text-emerald-700"
            title="엑셀 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 다운로드</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="h-8 px-3 rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span className="text-white">신규 제품 등록</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Central Body: High-Density Multi-Column Grid + Slide-over Dossier */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Main Grid Table Area */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 select-none">
              <tr>
                <th className="py-2.5 px-3">모델코드</th>
                <th className="py-2.5 px-3">모델명</th>
                <th className="py-2.5 px-3">제조사</th>
                <th className="py-2.5 px-3">카테고리</th>
                <th className="py-2.5 px-3">핵심 제원</th>
                <th className="py-2.5 px-3 text-right">표준 월렌탈료</th>
                <th className="py-2.5 px-3 text-right">일할 단가</th>
                <th className="py-2.5 px-3 text-center">보유 자산</th>
                <th className="py-2.5 px-3 text-center">가동 현황</th>
                <th className="py-2.5 px-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs opacity-60">
                    {loading ? "제품 목록을 불러오는 중입니다..." : "조건에 해당하는 제품 모델이 없습니다."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className={`cursor-pointer transition border-b ${
                        isSelected ? "bg-blue-600/10 font-medium" : "hover:bg-black/5"
                      }`}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {p.modelCode}
                      </td>
                      <td className="py-2 px-3 font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{p.modelName}</span>
                          {p.shortName && (
                            <span className="text-[10px] px-1 rounded border opacity-75 font-mono">
                              {p.shortName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">{p.manufacturer}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 max-w-xs truncate" title={p.spec}>
                        {p.spec || "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                        {p.standardMonthlyRate > 0 ? `${p.standardMonthlyRate.toLocaleString()}원` : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap opacity-80">
                        {p.standardDailyRate > 0 ? `${p.standardDailyRate.toLocaleString()}원` : "-"}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            p.totalAssets > 0
                              ? "bg-emerald-600/15 text-emerald-700 border border-emerald-600/30"
                              : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                          }`}
                        >
                          {p.totalAssets}대
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {p.totalAssets > 0 ? (
                          <div className="flex items-center justify-center gap-1 text-[11px] font-mono">
                            <span className="text-blue-700 font-bold" title="대여중">
                              대여 {p.rentedAssets}
                            </span>
                            <span className="opacity-40">/</span>
                            <span className="text-emerald-700 font-bold" title="임대가능">
                              가용 {p.availableAssets}
                            </span>
                            {p.repairingAssets > 0 && (
                              <>
                                <span className="opacity-40">/</span>
                                <span className="text-amber-700 font-bold" title="수리중">
                                  수리 {p.repairingAssets}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] opacity-40">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSelectProduct(p)}
                            className="px-2 py-1 rounded border text-[11px] hover:bg-black/5"
                            title="상세 장부"
                          >
                            상세
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.modelName)}
                              className="p-1 rounded text-rose-600 hover:bg-rose-500/10"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Slide-over Dossier Studio (마스터-디테일) */}
        {selectedProduct && (
          <aside className="w-96 border-l flex flex-col h-full shrink-0 shadow-lg overflow-hidden select-none bg-[var(--bg-card)]">
            {/* Dossier Header */}
            <div className="p-3 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">{selectedProduct.modelName}</span>
                  <span className="text-[10px] font-mono opacity-70 truncate">{selectedProduct.modelCode}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isEditingDossier ? (
                  <button
                    onClick={handleSaveEdit}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">저장</span>
                  </button>
                ) : (
                  isAdmin && (
                    <button
                      onClick={() => setIsEditingDossier(true)}
                      className="px-2 py-1 rounded border text-xs font-semibold flex items-center gap-1 hover:opacity-80"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>수정</span>
                    </button>
                  )
                )}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-1 rounded hover:bg-black/10 opacity-70"
                  title="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dossier Content Body */}
            <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-4 text-xs">
              {/* Product Specifications Section */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-[11px] opacity-75 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  <span>제품 기본 제원</span>
                </span>

                {isEditingDossier ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium">모델명</label>
                      <input
                        type="text"
                        value={editForm.modelName || ""}
                        onChange={(e) => setEditForm({ ...editForm, modelName: e.target.value })}
                        className="h-7 px-2 border rounded text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">단축명</label>
                        <input
                          type="text"
                          value={editForm.shortName || ""}
                          onChange={(e) => setEditForm({ ...editForm, shortName: e.target.value })}
                          className="h-7 px-2 border rounded text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">제조사</label>
                        <input
                          type="text"
                          value={editForm.manufacturer || ""}
                          onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
                          className="h-7 px-2 border rounded text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">월 렌탈료 (원)</label>
                        <input
                          type="number"
                          value={editForm.standardMonthlyRate || 0}
                          onChange={(e) => setEditForm({ ...editForm, standardMonthlyRate: parseFloat(e.target.value) })}
                          className="h-7 px-2 border rounded text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">일할 단가 (원)</label>
                        <input
                          type="number"
                          value={editForm.standardDailyRate || 0}
                          onChange={(e) => setEditForm({ ...editForm, standardDailyRate: parseFloat(e.target.value) })}
                          className="h-7 px-2 border rounded text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium">상세 제원</label>
                      <textarea
                        value={editForm.spec || ""}
                        onChange={(e) => setEditForm({ ...editForm, spec: e.target.value })}
                        rows={2}
                        className="p-1.5 border rounded text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded border flex flex-col gap-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="opacity-60">제조사 / 분류</span>
                      <span className="font-semibold">{selectedProduct.manufacturer} ({selectedProduct.category})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">월 표준 렌탈료</span>
                      <span className="font-bold text-blue-700">{selectedProduct.standardMonthlyRate.toLocaleString()}원 / 월</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">일할 기준 단가</span>
                      <span>{selectedProduct.standardDailyRate.toLocaleString()}원 / 일</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">표준 장비 판매가</span>
                      <span>{selectedProduct.standardPrice.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">보증 구분</span>
                      <span>{selectedProduct.warrantyType || "표준 워런티"}</span>
                    </div>
                    <div className="border-t pt-1.5 mt-1 flex flex-col gap-0.5">
                      <span className="opacity-60">제원 상세</span>
                      <span className="font-sans leading-relaxed">{selectedProduct.spec || "-"}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time Mapped Assets Section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] opacity-75 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>실제 보유 자산 목록 ({mappedAssets.length}대)</span>
                  </span>
                  {onNavigateToAsset && (
                    <button
                      onClick={() => onNavigateToAsset(selectedProduct.modelName)}
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                    >
                      <span>자산관리 이동</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {loadingMappedAssets ? (
                  <div className="p-4 text-center opacity-60 text-xs font-mono">자산 목록 조회 중...</div>
                ) : mappedAssets.length === 0 ? (
                  <div className="p-4 text-center border rounded opacity-60 text-xs">
                    등록된 실제 자산이 없습니다. 자산 취득 등록을 진행해 주십시오.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                    {mappedAssets.map((a: any) => (
                      <div key={a.id} className="p-2 rounded border flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold font-mono text-blue-700">{a.assetNo}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              a.status === "RENTED"
                                ? "bg-blue-600 text-white"
                                : a.status === "AVAILABLE"
                                ? "bg-emerald-600 text-white"
                                : "bg-amber-600 text-white"
                            }`}
                          >
                            {a.status === "RENTED"
                              ? "대여중"
                              : a.status === "AVAILABLE"
                              ? "임대가능"
                              : a.status === "REPAIRING"
                              ? "수리중"
                              : a.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] opacity-75">
                          <span>S/N: {a.serialNo || "-"}</span>
                          <span>{a.ownerType === "OWNED" ? "자사자산" : "외부임차"}</span>
                        </div>
                        {a.currentCustomer && (
                          <div className="text-[10px] opacity-90 truncate text-emerald-800">
                            대여처: {a.currentCustomer} ({a.currentSite || "-"})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* 5. Modal: Add New Product Model */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg border p-5 shadow-2xl erp-login-card flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-sm">신규 제품 모델 등록</span>
              </div>
              <button onClick={() => setShowAddModal(false)} className="opacity-70 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">모델 코드 (고유 식별자) *</label>
                  <input
                    type="text"
                    required
                    value={addForm.modelCode}
                    onChange={(e) => setAddForm({ ...addForm, modelCode: e.target.value })}
                    placeholder="예: RPA-BOT-2026"
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">모델명 (공식 명칭) *</label>
                  <input
                    type="text"
                    required
                    value={addForm.modelName}
                    onChange={(e) => setAddForm({ ...addForm, modelName: e.target.value })}
                    placeholder="예: Dragon RPA Workstation Gen5"
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">단축명 (Short Name)</label>
                  <input
                    type="text"
                    value={addForm.shortName}
                    onChange={(e) => setAddForm({ ...addForm, shortName: e.target.value })}
                    placeholder="예: DR-X5"
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">카테고리</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="h-8 px-2 border rounded"
                  >
                    <option value="IT/워크스테이션">IT/워크스테이션</option>
                    <option value="서버/네트워크">서버/네트워크</option>
                    <option value="노트북/태블릿">노트북/태블릿</option>
                    <option value="사무기기/프린터">사무기기/프린터</option>
                    <option value="렌탈장비/특수">렌탈장비/특수</option>
                    <option value="소프트웨어/솔루션">소프트웨어/솔루션</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">제조사</label>
                  <input
                    type="text"
                    value={addForm.manufacturer}
                    onChange={(e) => setAddForm({ ...addForm, manufacturer: e.target.value })}
                    placeholder="예: DragonRPA"
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">표준 월 렌탈료 (원)</label>
                  <input
                    type="number"
                    value={addForm.standardMonthlyRate}
                    onChange={(e) => setAddForm({ ...addForm, standardMonthlyRate: e.target.value })}
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">표준 일할 단가 (원)</label>
                  <input
                    type="number"
                    value={addForm.standardDailyRate}
                    onChange={(e) => setAddForm({ ...addForm, standardDailyRate: e.target.value })}
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">표준 장비 판매가 (원)</label>
                  <input
                    type="number"
                    value={addForm.standardPrice}
                    onChange={(e) => setAddForm({ ...addForm, standardPrice: e.target.value })}
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">CPU / 프로세서</label>
                  <input
                    type="text"
                    value={addForm.cpu}
                    onChange={(e) => setAddForm({ ...addForm, cpu: e.target.value })}
                    placeholder="예: Intel Core i9-14900K"
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">RAM / 메모리</label>
                  <input
                    type="text"
                    value={addForm.ram}
                    onChange={(e) => setAddForm({ ...addForm, ram: e.target.value })}
                    placeholder="예: 64GB DDR5"
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">상세 제원 / 작업 규격</label>
                <textarea
                  value={addForm.spec}
                  onChange={(e) => setAddForm({ ...addForm, spec: e.target.value })}
                  placeholder="상세 제원 및 특이사항을 입력해 주십시오."
                  rows={2}
                  className="p-2 border rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded border text-xs hover:opacity-80"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  제품 등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
