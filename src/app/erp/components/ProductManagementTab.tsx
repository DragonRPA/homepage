"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Package, Plus, Search, RefreshCw, Download,
  Trash2, Check, AlertCircle, Layers,
  Cpu, Monitor, Shield
} from "lucide-react";
import { formatErpNumber, formatErpCurrency, toErpInputString, cleanErpNumber, sortErpItems } from "@/lib/erpFormat";
import { resolveDailyRentalFee } from "@/lib/rentalFeeUtils";
import { matchHangulAny } from "@/lib/hangulSearch";
import { type ForkliftItemClass, FORKLIFT_ITEM_CLASS_OPTIONS, getItemClassLabel, normalizeItemClass, summarizeForkliftSpec } from "@/lib/forkliftDomain";
import { SortableTh, useErpTableSort } from "./SortableTh";
import type { ProductAddFormState, ProductModel } from "./products/ProductDossierAndAddModal";

const ProductDossierAndAddModal = dynamic(
  () =>
    import("./products/ProductDossierAndAddModal").then(
      (m) => m.ProductDossierAndAddModal
    ),
  { ssr: false }
);

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
  const [itemClassFilter, setItemClassFilter] = useState<"ALL" | ForkliftItemClass>("ALL");
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
  const [addForm, setAddForm] = useState<ProductAddFormState>({
    modelCode: "",
    modelName: "",
    shortName: "",
    itemClass: "FORKLIFT",
    category: "지게차 완제품",
    manufacturer: "두산",
    standardMonthlyRate: "1,200,000",
    standardDailyRate: "40,000",
    standardPrice: "32,000,000",
    partNo: "",
    installFee: "0",
    warrantyMonths: "12",
    warrantyHours: "2,000",
    cpu: "",
    ram: "",
    storage: "",
    gpu: "",
    spec: "",
    specData: {},
    warrantyType: "12개월 / 2,000시간",
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
      const res = await fetch("/api/erp/products", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "제품 목록 조회 실패");
      const loadedProducts: ProductModel[] = data.products || [];
      setProducts(loadedProducts);
      setSelectedProduct((prev) => {
        if (!prev) return null;
        return loadedProducts.find((p) => p.id === prev.id) || prev;
      });
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
      const res = await fetch(`/api/erp/assets?productId=${productId}`, { cache: "no-store" });
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
    setEditForm({
      ...p,
      standardDailyRate: resolveDailyRentalFee(p.standardMonthlyRate, p.standardDailyRate),
    });
    fetchMappedAssets(p.id);
  };

  // Unique Manufacturers & Categories
  const uniqueManufacturers = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.manufacturer).filter(Boolean)));
  }, [products]);

  const DEFAULT_PRODUCT_CATEGORIES = [
    "지게차 완제품",
    "지게차 옵션",
    "부품·소모품",
    "물류장비",
    "IT/워크스테이션",
    "서버/네트워크",
    "노트북/태블릿",
    "모니터/TV/프로젝터",
    "사무기기/프린터",
    "렌탈장비/특수",
    "소프트웨어/솔루션",
    "기타",
  ];

  const uniqueCategories = useMemo(() => {
    return Array.from(
      new Set([...DEFAULT_PRODUCT_CATEGORIES, ...products.map((p) => p.category).filter(Boolean)])
    );
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const pClass = normalizeItemClass(p.itemClass, p.category);
      if (itemClassFilter !== "ALL" && pClass !== itemClassFilter) return false;
      if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;
      if (manufacturerFilter !== "ALL" && p.manufacturer !== manufacturerFilter) return false;
      if (assetFilter === "WITH_ASSETS" && p.totalAssets === 0) return false;
      if (assetFilter === "NO_ASSETS" && p.totalAssets > 0) return false;

      if (searchTerm.trim()) {
        if (!matchHangulAny([p.modelName, p.modelCode, p.shortName, p.spec, p.manufacturer, p.partNo], searchTerm)) {
          return false;
        }
      }
      return true;
    });
  }, [products, itemClassFilter, categoryFilter, manufacturerFilter, assetFilter, searchTerm]);

  // Sorting State (3단계: asc ➔ desc ➔ null 정렬안함)
  const { sortKey, sortDir, handleSort } = useErpTableSort("modelCode", "asc");

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => (
    <SortableTh
      label={label}
      colKey={key}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={handleSort}
      align={align}
      className="py-2.5 px-3 hover:bg-slate-500/10"
      iconClassName="w-3.5 h-3.5 text-blue-600"
    />
  );

  const sortedFilteredProducts = useMemo(() => {
    return sortErpItems(filteredProducts, sortKey, sortDir);
  }, [filteredProducts, sortKey, sortDir]);

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
      const nextClass = normalizeItemClass(editForm.itemClass ?? selectedProduct.itemClass, editForm.category ?? selectedProduct.category);
      const nextSpecData = editForm.specData ?? selectedProduct.specData ?? {};
      const computedSpec = summarizeForkliftSpec(nextClass, nextSpecData, editForm.spec);
      const res = await fetch("/api/erp/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProduct.id,
          ...editForm,
          itemClass: nextClass,
          specData: nextSpecData,
          spec: computedSpec,
          installFee: cleanErpNumber(editForm.installFee ?? selectedProduct.installFee ?? 0),
          warrantyMonths: cleanErpNumber(editForm.warrantyMonths ?? selectedProduct.warrantyMonths ?? 12),
          warrantyHours: cleanErpNumber(editForm.warrantyHours ?? selectedProduct.warrantyHours ?? 2000),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "수정 저장 실패");

      showToast("제품 모델 정보가 수정되었습니다.");
      setIsEditingDossier(false);
      if (data.product) {
        setProducts((prev) => prev.map((p) => (p.id === selectedProduct.id ? { ...p, ...data.product } : p)));
        setSelectedProduct((prev) => (prev ? { ...prev, ...data.product } : null));
        setEditForm((prev) => ({ ...prev, ...data.product }));
      }
      await fetchProducts();
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
      setProducts((prev) => prev.filter((p) => p.id !== id));
      await fetchProducts();
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
      const computedSpec = summarizeForkliftSpec(addForm.itemClass, addForm.specData, addForm.spec);
      const res = await fetch("/api/erp/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          spec: computedSpec,
          standardMonthlyRate: cleanErpNumber(addForm.standardMonthlyRate),
          standardDailyRate: cleanErpNumber(addForm.standardDailyRate),
          standardPrice: cleanErpNumber(addForm.standardPrice),
          installFee: cleanErpNumber(addForm.installFee),
          warrantyMonths: cleanErpNumber(addForm.warrantyMonths),
          warrantyHours: cleanErpNumber(addForm.warrantyHours),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "제품 등록 실패");

      showToast("신규 제품 모델이 등록되었습니다.");
      setShowAddModal(false);
      await fetchProducts();
      setAddForm({
        modelCode: "",
        modelName: "",
        shortName: "",
        itemClass: "FORKLIFT",
        category: "지게차 완제품",
        manufacturer: "두산",
        standardMonthlyRate: "1,200,000",
        standardDailyRate: "40,000",
        standardPrice: "32,000,000",
        partNo: "",
        installFee: "0",
        warrantyMonths: "12",
        warrantyHours: "2,000",
        cpu: "",
        ram: "",
        storage: "",
        gpu: "",
        spec: "",
        specData: {},
        warrantyType: "12개월 / 2,000시간",
      });
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
            <span className="text-sm font-bold">{formatErpNumber(kpiStats.totalModels)}개</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <Layers className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">총 보유 장비</span>
            <span className="text-sm font-bold text-emerald-700">{formatErpNumber(kpiStats.totalUnits)}대</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <Monitor className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">현장 대여 운용중</span>
            <span className="text-sm font-bold text-blue-700">{formatErpNumber(kpiStats.rentedUnits)}대</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <Shield className="w-5 h-5 text-teal-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">즉시 출고 가능</span>
            <span className="text-sm font-bold text-teal-700">{formatErpNumber(kpiStats.availableUnits)}대</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <Cpu className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">정비/수리중</span>
            <span className="text-sm font-bold text-amber-700">{formatErpNumber(kpiStats.repairingUnits)}대</span>
          </div>
        </div>
      </div>

      {/* 2. Gutenberg Z-Pattern Pipeline: Search & Action Toolbar */}
      <div className="p-3 border-b flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setItemClassFilter("ALL")}
            className={`h-7 px-2.5 rounded border text-xs font-bold whitespace-nowrap transition ${
              itemClassFilter === "ALL"
                ? "bg-blue-600 text-white border-blue-600"
                : "hover:opacity-80"
            }`}
          >
            전체 ({products.length})
          </button>
          {FORKLIFT_ITEM_CLASS_OPTIONS.map((clsOpt) => {
            const cnt = products.filter(
              (p) => normalizeItemClass(p.itemClass, p.category) === clsOpt.value
            ).length;
            const active = itemClassFilter === clsOpt.value;
            return (
              <button
                key={clsOpt.value}
                type="button"
                onClick={() => setItemClassFilter(clsOpt.value)}
                className={`h-7 px-2.5 rounded border text-xs font-bold whitespace-nowrap transition ${
                  active ? "bg-blue-600 text-white border-blue-600" : "hover:opacity-80"
                }`}
              >
                {clsOpt.label} ({cnt})
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
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

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-50" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="모델명 / 코드 / 제원 / 품번 검색"
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
      </div>

      {/* 3. Central Body: High-Density Multi-Column Grid + Slide-over Dossier */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Main Grid Table Area */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 select-none bg-[var(--bg-card)] border-b">
              <tr>
                {renderSortTh("모델코드", "modelCode")}
                {renderSortTh("구분", "itemClass")}
                {renderSortTh("모델명", "modelName")}
                {renderSortTh("제조사", "manufacturer")}
                {renderSortTh("카테고리", "category")}
                {renderSortTh("핵심 제원", "spec")}
                {renderSortTh("표준 월렌탈료", "standardMonthlyRate", "right")}
                {renderSortTh("일할 단가", "standardDailyRate", "right")}
                {renderSortTh("보유 자산", "totalAssets", "center")}
                {renderSortTh("가동 현황", "rentedAssets", "center")}
                <th className="py-2.5 px-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {sortedFilteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-xs opacity-60">
                    {loading ? "제품 목록을 불러오는 중입니다..." : "조건에 해당하는 제품 모델이 없습니다."}
                  </td>
                </tr>
              ) : (
                sortedFilteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  const pClass = normalizeItemClass(p.itemClass, p.category);
                  const clsBadge =
                    pClass === "FORKLIFT"
                      ? "bg-blue-600/15 text-blue-700 border-blue-600/30"
                      : pClass === "OPTION"
                      ? "bg-amber-600/15 text-amber-800 border-amber-600/30"
                      : pClass === "PART"
                      ? "bg-emerald-600/15 text-emerald-700 border-emerald-600/30"
                      : "bg-slate-500/15 text-slate-600 border-slate-500/30";
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
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${clsBadge}`}>
                          {getItemClassLabel(pClass)}
                        </span>
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
                        {p.standardMonthlyRate > 0 ? formatErpCurrency(p.standardMonthlyRate) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap opacity-80">
                        {p.standardDailyRate > 0 ? formatErpCurrency(p.standardDailyRate) : "-"}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            p.totalAssets > 0
                              ? "bg-emerald-600/15 text-emerald-700 border border-emerald-600/30"
                              : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                          }`}
                        >
                          {formatErpNumber(p.totalAssets)}대
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {p.totalAssets > 0 ? (
                          <div className="flex items-center justify-center gap-1 text-[11px] font-mono">
                            <span className="text-blue-700 font-bold" title="대여중">
                              대여 {formatErpNumber(p.rentedAssets)}
                            </span>
                            <span className="opacity-40">/</span>
                            <span className="text-emerald-700 font-bold" title="임대가능">
                              가용 {formatErpNumber(p.availableAssets)}
                            </span>
                            {p.repairingAssets > 0 && (
                              <>
                                <span className="opacity-40">/</span>
                                <span className="text-amber-700 font-bold" title="수리중">
                                  수리 {formatErpNumber(p.repairingAssets)}
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

        {/* 4. Slide-over Dossier Studio & Add Modal (Lazy) */}
        {Boolean(selectedProduct || showAddModal) && (
          <ProductDossierAndAddModal
            selectedProduct={selectedProduct}
            isAdmin={isAdmin}
            isEditingDossier={isEditingDossier}
            setIsEditingDossier={setIsEditingDossier}
            editForm={editForm}
            setEditForm={setEditForm}
            mappedAssets={mappedAssets}
            loadingMappedAssets={loadingMappedAssets}
            uniqueCategories={uniqueCategories}
            onSaveEdit={handleSaveEdit}
            onCloseDossier={() => setSelectedProduct(null)}
            onNavigateToAsset={onNavigateToAsset}
            showAddModal={showAddModal}
            addForm={addForm}
            setAddForm={setAddForm}
            onAddProduct={handleAddProduct}
            onCloseAddModal={() => setShowAddModal(false)}
          />
        )}
      </div>
    </div>
  );
};
