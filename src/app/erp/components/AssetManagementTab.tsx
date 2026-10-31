"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Layers, Plus, Search, RefreshCw, Download, Edit2, 
  Trash2, X, Check, Eye, AlertCircle, Save, Package, 
  Clock, DollarSign, Wrench, Shield, CheckCircle2, History,
  Building2, MapPin, Calculator, Calendar,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { formatErpNumber, formatErpCurrency, formatErpQty, sortErpItems, SortDirection } from "@/lib/erpFormat";

interface AssetRecord {
  id: number;
  assetNo: string;
  rentalProductId: number;
  modelCode: string;
  modelName: string;
  category: string;
  manufacturer: string;
  modelSpec: string;
  serialNo: string;
  ownerType: "OWNED" | "RENTED";
  status: "AVAILABLE" | "RENTED" | "OUTBOUND_PENDING" | "REPAIRING" | "DISPOSED";
  acquisitionDate: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  depreciationMethod: string;
  accumulatedDepreciation: number;
  bookValue: number;
  monthlyDepreciation: number;
  supplier: string | null;
  renter: string | null;
  currentCustomer: string | null;
  currentSite: string | null;
  contractNo: string | null;
  customSpec: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AssetLog {
  id: number;
  assetId: number;
  assetNo: string;
  eventType: string;
  eventDate: string;
  customerName: string | null;
  siteName: string | null;
  memo: string | null;
  createdAt: string;
}

interface AssetManagementTabProps {
  currentUser: any;
  defaultFilterModel?: string;
}

export const AssetManagementTab: React.FC<AssetManagementTabProps> = ({ 
  currentUser,
  defaultFilterModel 
}) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";

  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Sub-Tab State: 요약표 (SUMMARY) vs 상세목록 (DETAIL)
  const [activeSubTab, setActiveSubTab] = useState<"SUMMARY" | "DETAIL">("SUMMARY");

  // Filters
  const [searchTerm, setSearchTerm] = useState(defaultFilterModel || "");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [manufacturerFilter, setManufacturerFilter] = useState("ALL");

  // Slide-over Dossier State
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [editForm, setEditForm] = useState<Partial<AssetRecord>>({});
  const [assetLogs, setAssetLogs] = useState<AssetLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [newLogMemo, setNewLogMemo] = useState("");

  // Modal: Acquire / Register New Asset
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    assetNo: "",
    qty: "1",
    rentalProductId: "",
    serialNo: "",
    ownerType: "OWNED",
    acquisitionDate: new Date().toISOString().split("T")[0],
    acquisitionCost: "3200000",
    salvageValue: "320000",
    usefulLifeYears: "4",
    supplier: "(주)컴퓨존 B2B",
    renter: "",
    currentCustomer: "",
    currentSite: "",
    contractNo: "",
    customSpec: "",
    memo: "",
  });

  // Toast State
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Assets & Products
  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetRes, prodRes] = await Promise.all([
        fetch("/api/erp/assets"),
        fetch("/api/erp/products")
      ]);

      const assetData = await assetRes.json();
      const prodData = await prodRes.json();

      if (assetData.success) {
        setAssets(assetData.assets || []);
      }
      if (prodData.success) {
        setProducts(prodData.products || []);
        if (prodData.products.length > 0 && !addForm.rentalProductId) {
          setAddForm((prev) => ({ ...prev, rentalProductId: prodData.products[0].id.toString() }));
        }
      }
    } catch (err: any) {
      showToast("데이터를 불러오지 못했습니다: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch Lifecycle Logs for Dossier
  const fetchAssetLogs = async (assetNo: string, assetId: number) => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/erp/assets/logs?assetNo=${encodeURIComponent(assetNo)}&assetId=${assetId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAssetLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load asset logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSelectAsset = (asset: AssetRecord) => {
    setSelectedAsset(asset);
    setIsEditingDossier(false);
    setEditForm({ ...asset });
    fetchAssetLogs(asset.assetNo, asset.id);
  };

  // Unique Manufacturers
  const uniqueManufacturers = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.manufacturer).filter(Boolean)));
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (ownerFilter !== "ALL" && a.ownerType !== ownerFilter) return false;
      if (manufacturerFilter !== "ALL" && a.manufacturer !== manufacturerFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const no = a.assetNo.toLowerCase();
        const model = a.modelName.toLowerCase();
        const sn = (a.serialNo || "").toLowerCase();
        const cust = (a.currentCustomer || "").toLowerCase();
        const site = (a.currentSite || "").toLowerCase();
        const ctr = (a.contractNo || "").toLowerCase();
        if (!no.includes(q) && !model.includes(q) && !sn.includes(q) && !cust.includes(q) && !site.includes(q) && !ctr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [assets, statusFilter, ownerFilter, manufacturerFilter, searchTerm]);

  // Sorting State
  const [sortKey, setSortKey] = useState<string>("assetNo");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => {
    const isActive = sortKey === key;
    return (
      <th
        onClick={() => handleSort(key)}
        className={`py-2.5 px-3 cursor-pointer select-none hover:bg-slate-500/10 transition text-${align} whitespace-nowrap`}
        title={`${label} 기준 정렬`}
      >
        <div className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start"}`}>
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const sortedFilteredAssets = useMemo(() => {
    return sortErpItems(filteredAssets, sortKey, sortDir);
  }, [filteredAssets, sortKey, sortDir]);

  // Summary Table Sorting State & Aggregation
  const [summarySortKey, setSummarySortKey] = useState<string>("modelName");
  const [summarySortDir, setSummarySortDir] = useState<SortDirection>("asc");

  const handleSummarySort = (key: string) => {
    if (summarySortKey === key) {
      setSummarySortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSummarySortKey(key);
      setSummarySortDir("asc");
    }
  };

  const renderSummarySortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => {
    const isActive = summarySortKey === key;
    return (
      <th
        onClick={() => handleSummarySort(key)}
        className={`py-2.5 px-3 cursor-pointer select-none hover:bg-slate-500/10 transition text-${align} whitespace-nowrap`}
        title={`${label} 기준 정렬`}
      >
        <div className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start"}`}>
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              summarySortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </span>
        </div>
      </th>
    );
  };

  // 모델별 수량 집계 (총수량, 임대가능, 임대중)
  const modelSummaryRows = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        modelCode: string;
        modelName: string;
        totalQty: number;
        availableQty: number;
        rentedQty: number;
      }
    >();

    for (const a of assets) {
      const mCode = a.modelCode || "-";
      const mName = a.modelName || "미지정 모델";
      const k = `${mCode}__${mName}`;
      const existing = map.get(k) || {
        key: k,
        modelCode: mCode,
        modelName: mName,
        totalQty: 0,
        availableQty: 0,
        rentedQty: 0,
      };
      existing.totalQty += 1;
      if (a.status === "AVAILABLE") {
        existing.availableQty += 1;
      } else if (a.status === "RENTED") {
        existing.rentedQty += 1;
      }
      map.set(k, existing);
    }

    let list = Array.from(map.values());
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.modelName.toLowerCase().includes(q) ||
          r.modelCode.toLowerCase().includes(q)
      );
    }

    return sortErpItems(list, summarySortKey, summarySortDir);
  }, [assets, searchTerm, summarySortKey, summarySortDir]);

  const summaryTotals = useMemo(() => {
    let totalQty = 0;
    let availableQty = 0;
    let rentedQty = 0;
    for (const r of modelSummaryRows) {
      totalQty += r.totalQty;
      availableQty += r.availableQty;
      rentedQty += r.rentedQty;
    }
    return { totalQty, availableQty, rentedQty };
  }, [modelSummaryRows]);

  // KPI Metrics (단일 패스 계산)
  const kpiStats = useMemo(() => {
    const totalCount = assets.length;
    let ownedCount = 0;
    let rentedCount = 0;
    let rentedOpCount = 0;
    let availableCount = 0;
    let repairingCount = 0;
    let totalBookValue = 0;

    for (const a of assets) {
      if (a.ownerType === "OWNED") {
        ownedCount++;
        totalBookValue += a.bookValue || 0;
      } else {
        rentedCount++;
      }

      if (a.status === "RENTED") rentedOpCount++;
      else if (a.status === "AVAILABLE") availableCount++;
      else if (a.status === "REPAIRING") repairingCount++;
    }

    return { totalCount, ownedCount, rentedCount, rentedOpCount, availableCount, repairingCount, totalBookValue };
  }, [assets]);

  // Handle Save Dossier Edit
  const handleSaveDossier = async () => {
    if (!selectedAsset) return;
    try {
      const res = await fetch("/api/erp/assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAsset.id,
          ...editForm,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "자산 정보 수정 실패");

      showToast("자산 정보 및 상태가 성공적으로 갱신되었습니다.");
      setIsEditingDossier(false);
      fetchData();
      setSelectedAsset((prev) => (prev ? { ...prev, ...data.asset } : null));
      fetchAssetLogs(selectedAsset.assetNo, selectedAsset.id);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Add Lifecycle Log
  const handleAddLog = async () => {
    if (!selectedAsset || !newLogMemo.trim()) return;
    try {
      const res = await fetch("/api/erp/assets/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          assetNo: selectedAsset.assetNo,
          eventType: "REPAIR",
          eventDate: new Date().toISOString().split("T")[0],
          customerName: selectedAsset.currentCustomer,
          siteName: selectedAsset.currentSite,
          memo: newLogMemo.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "이력 등록 실패");

      showToast("정비 및 관리 이력이 기록되었습니다.");
      setNewLogMemo("");
      fetchAssetLogs(selectedAsset.assetNo, selectedAsset.id);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Asset
  const handleDeleteAsset = async (id: number, assetNo: string) => {
    if (!confirm(`자산번호 [${assetNo}]을(를) 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/erp/assets?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");

      showToast("자산이 삭제되었습니다.");
      if (selectedAsset?.id === id) setSelectedAsset(null);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 자산 취득 시 자동채번 헬퍼: "DR" + yymm + 3-digit 순번 (예: DR2610001)
  const computeNextAssetNo = (dateStr: string, assetList: AssetRecord[] = assets) => {
    const cleanDate = (dateStr || new Date().toISOString().split("T")[0]).replace(/-/g, "");
    const yymm = cleanDate.length >= 6 ? cleanDate.slice(2, 6) : new Date().toISOString().slice(2, 7).replace("-", "");
    const prefix = `DR${yymm}`;
    let maxSeq = 0;
    for (const a of assetList) {
      const no = String(a.assetNo || "").toUpperCase();
      if (no.startsWith(prefix)) {
        const suffix = no.slice(prefix.length).replace(/[^0-9]/g, "");
        const n = parseInt(suffix, 10);
        if (!isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
    return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
  };

  const getAssetNoRangePreview = (startNo: string, qtyStr: string, dateStr: string) => {
    const count = Math.max(1, parseInt(qtyStr || "1", 10) || 1);
    const baseNo = (startNo || "").trim() || computeNextAssetNo(dateStr);
    if (count === 1) return baseNo;
    const cleanDate = (dateStr || new Date().toISOString().split("T")[0]).replace(/-/g, "");
    const yymm = cleanDate.length >= 6 ? cleanDate.slice(2, 6) : new Date().toISOString().slice(2, 7).replace("-", "");
    const prefix = `DR${yymm}`;
    const startSeq = parseInt(baseNo.slice(prefix.length).replace(/[^0-9]/g, ""), 10) || 1;
    const endNo = `${prefix}${String(startSeq + count - 1).padStart(3, "0")}`;
    return `${baseNo} ~ ${endNo} (총 ${count}대)`;
  };

  // Handle Add New Asset
  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAssetNo = addForm.assetNo.trim() || computeNextAssetNo(addForm.acquisitionDate);
    const batchCount = Math.max(1, parseInt(addForm.qty || "1", 10) || 1);
    if (!addForm.rentalProductId) {
      showToast("제품 모델을 선택해 주십시오.", "error");
      return;
    }

    try {
      const res = await fetch("/api/erp/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, assetNo: targetAssetNo, qty: batchCount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "자산 취득 등록 실패");

      const createdList = Array.isArray(data.assets) ? data.assets : [data.asset];
      const firstNo = createdList[0]?.assetNo || createdList[0]?.asset_no || targetAssetNo;
      const lastNo = createdList[createdList.length - 1]?.assetNo || createdList[createdList.length - 1]?.asset_no || firstNo;
      showToast(
        createdList.length > 1
          ? `자산 ${createdList.length}대([${firstNo} ~ ${lastNo}])가 일괄 취득 등록되었습니다.`
          : `자산 [${firstNo}]이(가) 신규 취득 등록되었습니다.`
      );
      setShowAddModal(false);
      if (createdList.length > 0 && createdList[0]?.assetNo) {
        setAssets((prev) => [...prev, ...createdList]);
      } else {
        fetchData();
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (assets.length === 0) {
      showToast("내보낼 자산 데이터가 없습니다.", "error");
      return;
    }

    const headers = [
      "자산번호", "모델명", "모델코드", "제조사", "카테고리", 
      "시리얼번호", "소유구분", "자산상태", "취득일자", "취득원가(원)", 
      "잔존가치(원)", "내용연수(년)", "감가상각누계(원)", "현재장부가액(원)", 
      "월감가상각비(원)", "현재대여처", "배치현장", "계약번호", "특이사항"
    ];

    const rows = assets.map((a) => [
      a.assetNo,
      a.modelName,
      a.modelCode,
      a.manufacturer,
      a.category,
      a.serialNo || "-",
      a.ownerType === "OWNED" ? "자사자산" : "외부임차",
      a.status,
      a.acquisitionDate,
      a.acquisitionCost,
      a.salvageValue,
      a.usefulLifeYears,
      a.accumulatedDepreciation,
      a.bookValue,
      a.monthlyDepreciation,
      a.currentCustomer || "-",
      a.currentSite || "-",
      a.contractNo || "-",
      a.memo || "-",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `자산종합대장_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("자산 종합 대장이 다운로드되었습니다.");
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
          <Layers className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">총 자산 대수</span>
            <span className="text-sm font-bold">{formatErpNumber(kpiStats.totalCount)}대</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">자사 / 외부임차</span>
            <span className="text-sm font-bold">
              <span className="text-emerald-700">{formatErpNumber(kpiStats.ownedCount)}</span> / <span className="text-indigo-700">{formatErpNumber(kpiStats.rentedCount)}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">현장 대여 운용중</span>
            <span className="text-sm font-bold text-blue-700">{formatErpNumber(kpiStats.rentedOpCount)}대</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <Clock className="w-5 h-5 text-teal-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">즉시 임대 가용</span>
            <span className="text-sm font-bold text-teal-700">{formatErpNumber(kpiStats.availableCount)}대</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[140px]">
          <Wrench className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">점검/수리중</span>
            <span className="text-sm font-bold text-amber-700">{formatErpNumber(kpiStats.repairingCount)}대</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded border flex-1 min-w-[180px]">
          <DollarSign className="w-5 h-5 text-purple-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] opacity-70">자사자산 총 장부가액</span>
            <span className="text-sm font-bold font-mono text-purple-800">
              {formatErpCurrency(kpiStats.totalBookValue)}
            </span>
          </div>
        </div>
      </div>

      {/* 1.5 Sub-Tab Switcher: 요약표 vs 상세목록 */}
      <div className="px-3 pt-2.5 border-b flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("SUMMARY");
              setSelectedAsset(null);
            }}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === "SUMMARY"
                ? "border-blue-600 text-blue-700 bg-blue-600/5"
                : "border-transparent opacity-65 hover:opacity-100"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>요약표</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-600/15 text-blue-700">
              {formatErpNumber(modelSummaryRows.length)}개 모델
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("DETAIL")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === "DETAIL"
                ? "border-blue-600 text-blue-700 bg-blue-600/5"
                : "border-transparent opacity-65 hover:opacity-100"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>상세목록</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-500/15">
              {formatErpNumber(filteredAssets.length)}대
            </span>
          </button>
        </div>
      </div>

      {/* 2. Gutenberg Z-Pattern Pipeline: Search & Action Toolbar */}
      <div className="p-3 border-b flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {activeSubTab === "DETAIL" && (
            <>
              {/* Status Filter */}
              <div className="flex flex-col gap-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 px-2 rounded text-xs border font-medium"
                >
                  <option value="ALL">전체 자산 상태</option>
                  <option value="AVAILABLE">임대가능 (가용)</option>
                  <option value="RENTED">대여중 (현장운용)</option>
                  <option value="OUTBOUND_PENDING">출고대기</option>
                  <option value="REPAIRING">정비/수리중</option>
                  <option value="DISPOSED">폐기/매각완료</option>
                </select>
              </div>

              {/* Owner Filter */}
              <div className="flex flex-col gap-1">
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="h-8 px-2 rounded text-xs border font-medium"
                >
                  <option value="ALL">전체 소유구분</option>
                  <option value="OWNED">자사자산 (당사소유)</option>
                  <option value="RENTED">외부임차 (전대용)</option>
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
            </>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeSubTab === "SUMMARY"
                  ? "모델명 / 모델코드 검색"
                  : "자산번호 / 모델명 / 시리얼 / 고객사 검색"
              }
              className="h-8 pl-8 pr-3 rounded text-xs border w-60"
            />
          </div>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={fetchData}
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
              onClick={() => {
                const todayStr = new Date().toISOString().split("T")[0];
                const autoNo = computeNextAssetNo(todayStr, assets);
                setAddForm((prev) => ({
                  ...prev,
                  assetNo: autoNo,
                  qty: "1",
                  acquisitionDate: todayStr,
                  rentalProductId: prev.rentalProductId || (products.length > 0 ? products[0].id.toString() : ""),
                  serialNo: "",
                  currentCustomer: "",
                  currentSite: "",
                  memo: "",
                }));
                setShowAddModal(true);
              }}
              className="h-8 px-3 rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span className="text-white">신규 자산 취득</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Central Body: High-Density Multi-Column Grid + Slide-over Dossier */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Main Grid Table Area */}
        <div className="flex-1 overflow-auto">
          {activeSubTab === "SUMMARY" ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 select-none bg-[var(--bg-card)] border-b">
                <tr>
                  {renderSummarySortTh("제품 모델명", "modelName")}
                  {renderSummarySortTh("모델코드", "modelCode")}
                  {renderSummarySortTh("총수량", "totalQty", "right")}
                  {renderSummarySortTh("임대가능", "availableQty", "right")}
                  {renderSummarySortTh("임대중", "rentedQty", "right")}
                </tr>
              </thead>
              <tbody>
                {modelSummaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs opacity-60">
                      {loading ? "자산 요약표를 집계하는 중입니다..." : "집계된 모델 자산이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  <>
                    {modelSummaryRows.map((row) => (
                      <tr
                        key={row.key}
                        onClick={() => {
                          setSearchTerm(row.modelName);
                          setActiveSubTab("DETAIL");
                        }}
                        className="cursor-pointer transition border-b hover:bg-black/5"
                        title="클릭 시 해당 모델의 상세목록 조회"
                      >
                        <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                          {row.modelName}
                        </td>
                        <td className="py-2.5 px-3 font-mono opacity-75 whitespace-nowrap">
                          {row.modelCode}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {formatErpQty(row.totalQty, "대")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {formatErpQty(row.availableQty, "대")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                          {formatErpQty(row.rentedQty, "대")}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-500/10 font-bold border-t-2">
                      <td className="py-2.5 px-3 whitespace-nowrap" colSpan={2}>
                        합계 ({formatErpNumber(modelSummaryRows.length)}개 모델)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                        {formatErpQty(summaryTotals.totalQty, "대")}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                        {formatErpQty(summaryTotals.availableQty, "대")}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-700 whitespace-nowrap">
                        {formatErpQty(summaryTotals.rentedQty, "대")}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 select-none bg-[var(--bg-card)] border-b">
                <tr>
                  {renderSortTh("자산번호", "assetNo")}
                  {renderSortTh("제품 모델명", "modelName")}
                  {renderSortTh("시리얼번호 (S/N)", "serialNo")}
                  {renderSortTh("소유구분", "ownerType", "center")}
                  {renderSortTh("현재상태", "status", "center")}
                  {renderSortTh("현재 대여처 / 배치현장", "currentCustomer")}
                  {renderSortTh("취득일자", "acquisitionDate", "right")}
                  {renderSortTh("취득원가", "acquisitionCost", "right")}
                  {renderSortTh("현재 장부가액", "bookValue", "right")}
                  <th className="py-2.5 px-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-xs opacity-60">
                      {loading ? "자산 대장을 불러오는 중입니다..." : "조회 조건에 일치하는 자산이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  sortedFilteredAssets.map((a) => {
                    const isSelected = selectedAsset?.id === a.id;
                    return (
                      <tr
                        key={a.id}
                        onClick={() => handleSelectAsset(a)}
                        className={`cursor-pointer transition border-b ${
                          isSelected ? "bg-blue-600/10 font-medium" : "hover:bg-black/5"
                        }`}
                      >
                        <td className="py-2 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {a.assetNo}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold">{a.modelName}</span>
                            <span className="text-[10px] opacity-60 font-mono">{a.modelCode}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono opacity-80 whitespace-nowrap">
                          {a.serialNo || "-"}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              a.ownerType === "OWNED"
                                ? "bg-emerald-600/10 text-emerald-700 border-emerald-600/30"
                                : "bg-indigo-600/10 text-indigo-700 border-indigo-600/30"
                            }`}
                          >
                            {a.ownerType === "OWNED" ? "자사자산" : "외부임차"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.status === "RENTED"
                                ? "bg-blue-600 text-white"
                                : a.status === "AVAILABLE"
                                ? "bg-emerald-600 text-white"
                                : a.status === "REPAIRING"
                                ? "bg-amber-600 text-white"
                                : a.status === "OUTBOUND_PENDING"
                                ? "bg-sky-600 text-white"
                                : "bg-slate-600 text-white"
                            }`}
                          >
                            {a.status === "RENTED"
                              ? "대여중"
                              : a.status === "AVAILABLE"
                              ? "임대가능"
                              : a.status === "REPAIRING"
                              ? "수리중"
                              : a.status === "OUTBOUND_PENDING"
                              ? "출고대기"
                              : a.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap max-w-xs truncate">
                          {a.currentCustomer ? (
                            <div className="flex flex-col truncate">
                              <span className="font-medium text-emerald-800 truncate">{a.currentCustomer}</span>
                              <span className="text-[10px] opacity-60 truncate">{a.currentSite || "-"}</span>
                            </div>
                          ) : (
                            <span className="opacity-40">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono opacity-75 whitespace-nowrap">
                          {a.acquisitionDate}
                        </td>
                        <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                          {a.acquisitionCost > 0 ? formatErpCurrency(a.acquisitionCost) : "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                          {a.bookValue > 0 ? formatErpCurrency(a.bookValue) : "-"}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleSelectAsset(a)}
                              className="px-2 py-1 rounded border text-[11px] hover:bg-black/5"
                              title="상세 장부"
                            >
                              상세
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteAsset(a.id, a.assetNo)}
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
          )}
        </div>

        {/* 4. Slide-over Dossier Studio (마스터-디테일 & 360도 장부) */}
        {activeSubTab === "DETAIL" && selectedAsset && (
          <aside className="w-[420px] border-l flex flex-col h-full shrink-0 shadow-lg overflow-hidden select-none bg-[var(--bg-card)]">
            {/* Dossier Header */}
            <div className="p-3 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-mono text-blue-700 truncate">{selectedAsset.assetNo}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        selectedAsset.status === "RENTED"
                          ? "bg-blue-600 text-white"
                          : selectedAsset.status === "AVAILABLE"
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                    >
                      {selectedAsset.status === "RENTED"
                        ? "대여중"
                        : selectedAsset.status === "AVAILABLE"
                        ? "임대가능"
                        : selectedAsset.status}
                    </span>
                  </div>
                  <span className="text-[10px] opacity-70 truncate">{selectedAsset.modelName}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isEditingDossier ? (
                  <button
                    onClick={handleSaveDossier}
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
                  onClick={() => setSelectedAsset(null)}
                  className="p-1 rounded hover:bg-black/10 opacity-70"
                  title="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dossier Content Body */}
            <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-4 text-xs">
              {/* Asset Information Form / Display */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-[11px] opacity-75 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span>자산 식별 및 소유 속성</span>
                </span>

                {isEditingDossier ? (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">자산 상태</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                          className="h-7 px-2 border rounded text-xs font-semibold"
                        >
                          <option value="AVAILABLE">임대가능</option>
                          <option value="RENTED">대여중</option>
                          <option value="OUTBOUND_PENDING">출고대기</option>
                          <option value="REPAIRING">정비/수리중</option>
                          <option value="DISPOSED">폐기/매각</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">소유 구분</label>
                        <select
                          value={editForm.ownerType}
                          onChange={(e) => setEditForm({ ...editForm, ownerType: e.target.value as any })}
                          className="h-7 px-2 border rounded text-xs"
                        >
                          <option value="OWNED">자사자산</option>
                          <option value="RENTED">외부임차</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">시리얼번호 (S/N)</label>
                        <input
                          type="text"
                          value={editForm.serialNo || ""}
                          onChange={(e) => setEditForm({ ...editForm, serialNo: e.target.value })}
                          className="h-7 px-2 border rounded text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">계약번호</label>
                        <input
                          type="text"
                          value={editForm.contractNo || ""}
                          onChange={(e) => setEditForm({ ...editForm, contractNo: e.target.value })}
                          className="h-7 px-2 border rounded text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">대여 고객사</label>
                        <input
                          type="text"
                          value={editForm.currentCustomer || ""}
                          onChange={(e) => setEditForm({ ...editForm, currentCustomer: e.target.value })}
                          className="h-7 px-2 border rounded text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">배치 현장명</label>
                        <input
                          type="text"
                          value={editForm.currentSite || ""}
                          onChange={(e) => setEditForm({ ...editForm, currentSite: e.target.value })}
                          className="h-7 px-2 border rounded text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium">특이사항 및 메모</label>
                      <textarea
                        value={editForm.memo || ""}
                        onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                        rows={2}
                        className="p-1.5 border rounded text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded border flex flex-col gap-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="opacity-60">소유 / 공급처</span>
                      <span className="font-semibold">
                        {selectedAsset.ownerType === "OWNED" ? "자사자산" : "외부임차"} ({selectedAsset.supplier || selectedAsset.renter || "본사"})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">기물 시리얼 S/N</span>
                      <span className="font-bold">{selectedAsset.serialNo || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">현재 대여 고객사</span>
                      <span className="text-emerald-800 font-bold">{selectedAsset.currentCustomer || "미배치 (창고보관)"}</span>
                    </div>
                    {selectedAsset.currentSite && (
                      <div className="flex justify-between">
                        <span className="opacity-60">배치 현장</span>
                        <span>{selectedAsset.currentSite}</span>
                      </div>
                    )}
                    {selectedAsset.contractNo && (
                      <div className="flex justify-between">
                        <span className="opacity-60">연결 계약번호</span>
                        <span className="text-blue-700 font-bold">{selectedAsset.contractNo}</span>
                      </div>
                    )}
                    {selectedAsset.customSpec && (
                      <div className="flex justify-between">
                        <span className="opacity-60">개별 커스텀 사양</span>
                        <span>{selectedAsset.customSpec}</span>
                      </div>
                    )}
                    {selectedAsset.memo && (
                      <div className="border-t pt-1 mt-1 flex flex-col gap-0.5 font-sans">
                        <span className="opacity-60">관리 메모</span>
                        <span>{selectedAsset.memo}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Depreciation Calculator & Financial Audit */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-[11px] opacity-75 flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5 text-purple-600" />
                  <span>감가상각 정액법 실시간 회계 대차대조</span>
                </span>

                <div className="p-2.5 rounded border flex flex-col gap-1.5 font-mono text-[11px] bg-purple-500/5">
                  <div className="flex justify-between">
                    <span className="opacity-60">취득일자 / 내용연수</span>
                    <span>{selectedAsset.acquisitionDate} ({selectedAsset.usefulLifeYears}년)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">취득원가</span>
                    <span className="font-bold">{formatErpCurrency(selectedAsset.acquisitionCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">잔존가치 (10%)</span>
                    <span>{formatErpCurrency(selectedAsset.salvageValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">월 감가상각비</span>
                    <span className="text-rose-700 font-bold">{formatErpCurrency(selectedAsset.monthlyDepreciation)} / 월</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">감가상각 누계액</span>
                    <span className="text-rose-700">{formatErpCurrency(selectedAsset.accumulatedDepreciation)}</span>
                  </div>
                  <div className="border-t pt-1 mt-1 flex justify-between text-xs">
                    <span className="font-bold opacity-80">현재 잔존 장부가액</span>
                    <span className="font-bold text-blue-700 font-mono">
                      {formatErpCurrency(selectedAsset.bookValue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lifecycle Audit History Timeline */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] opacity-75 flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-blue-600" />
                    <span>자산 생애주기 통합 감사 이력 ({formatErpNumber(assetLogs.length)}건)</span>
                  </span>
                </div>

                {/* Add Quick Maintenance Log Input */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newLogMemo}
                    onChange={(e) => setNewLogMemo(e.target.value)}
                    placeholder="정비 조치 / 입출고 메모 입력"
                    className="h-7 px-2 border rounded text-xs flex-1"
                  />
                  <button
                    onClick={handleAddLog}
                    disabled={!newLogMemo.trim()}
                    className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold disabled:opacity-50"
                  >
                    이력 기록
                  </button>
                </div>

                {loadingLogs ? (
                  <div className="p-3 text-center text-xs opacity-60 font-mono">이력 조회 중...</div>
                ) : assetLogs.length === 0 ? (
                  <div className="p-3 text-center border rounded text-xs opacity-60">등록된 이력이 없습니다.</div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                    {assetLogs.map((log) => (
                      <div key={log.id} className="p-2 rounded border flex flex-col gap-0.5 text-[11px]">
                        <div className="flex items-center justify-between font-mono">
                          <span
                            className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                              log.eventType === "ACQUISITION"
                                ? "bg-emerald-600 text-white"
                                : log.eventType === "OUTBOUND"
                                ? "bg-blue-600 text-white"
                                : log.eventType === "INBOUND"
                                ? "bg-teal-600 text-white"
                                : log.eventType === "REPAIR"
                                ? "bg-amber-600 text-white"
                                : "bg-slate-600 text-white"
                            }`}
                          >
                            {log.eventType === "ACQUISITION"
                              ? "자산취득"
                              : log.eventType === "OUTBOUND"
                              ? "출고대여"
                              : log.eventType === "INBOUND"
                              ? "회수입고"
                              : log.eventType === "REPAIR"
                              ? "정비조치"
                              : log.eventType}
                          </span>
                          <span className="opacity-60">{log.eventDate}</span>
                        </div>
                        <span className="font-sans leading-relaxed">{log.memo || "-"}</span>
                        {log.customerName && (
                          <span className="text-[10px] opacity-70">
                            거래처: {log.customerName} {log.siteName ? `(${log.siteName})` : ""}
                          </span>
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

      {/* 5. Modal: Acquire / Register New Asset */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg border p-5 shadow-2xl erp-login-card flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-sm">신규 자산 취득 등록</span>
              </div>
              <button onClick={() => setShowAddModal(false)} className="opacity-70 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-5 flex flex-col gap-1">
                  <label className="font-semibold">시작 자산번호 (DR + yymm + 3자리) *</label>
                  <input
                    type="text"
                    required
                    value={addForm.assetNo}
                    onChange={(e) => setAddForm({ ...addForm, assetNo: e.target.value })}
                    placeholder="예: DR2610001"
                    className="h-8 px-2.5 border rounded font-mono font-bold text-blue-700"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="font-semibold">취득 수량 (대) *</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={addForm.qty}
                    onChange={(e) => setAddForm({ ...addForm, qty: e.target.value })}
                    className="h-8 px-2 border rounded font-mono font-bold text-right text-emerald-700"
                  />
                </div>
                <div className="col-span-5 flex flex-col gap-1">
                  <label className="font-semibold">매핑 제품 모델 *</label>
                  <select
                    required
                    value={addForm.rentalProductId}
                    onChange={(e) => setAddForm({ ...addForm, rentalProductId: e.target.value })}
                    className="h-8 px-2 border rounded font-medium"
                  >
                    <option value="">제품 모델을 선택하십시오</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.modelName} ({p.modelCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {parseInt(addForm.qty || "1", 10) > 1 && (
                <div className="px-3 py-1.5 rounded bg-blue-500/10 border border-blue-500/30 text-[11px] font-mono flex items-center justify-between">
                  <span className="font-semibold text-blue-700">
                    일괄 채번 구간: {getAssetNoRangePreview(addForm.assetNo, addForm.qty, addForm.acquisitionDate)}
                  </span>
                  <span className="font-bold text-emerald-700">
                    총 취득원가 합계: {formatErpCurrency((parseFloat(addForm.acquisitionCost || "0") || 0) * (parseInt(addForm.qty || "1", 10) || 1))}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">기물 시리얼 번호 (S/N, 다중 취득 시 쉼표 구분 가능)</label>
                  <input
                    type="text"
                    value={addForm.serialNo}
                    onChange={(e) => setAddForm({ ...addForm, serialNo: e.target.value })}
                    placeholder={parseInt(addForm.qty || "1", 10) > 1 ? "예: SN-001, SN-002 (또는 공란)" : "예: SN-2026-9918"}
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">소유 구분</label>
                  <select
                    value={addForm.ownerType}
                    onChange={(e) => setAddForm({ ...addForm, ownerType: e.target.value })}
                    className="h-8 px-2 border rounded font-bold"
                  >
                    <option value="OWNED">자사자산 (당사소유 취득)</option>
                    <option value="RENTED">외부임차 (전대용 렌탈)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">취득 일자</label>
                  <input
                    type="date"
                    value={addForm.acquisitionDate}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      const nextNo = computeNextAssetNo(nextDate, assets);
                      setAddForm({ ...addForm, acquisitionDate: nextDate, assetNo: nextNo });
                    }}
                    className="h-8 px-2 border rounded"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">대당 취득 원가 (원)</label>
                  <input
                    type="text"
                    value={formatErpNumber(addForm.acquisitionCost)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setAddForm({
                        ...addForm,
                        acquisitionCost: raw,
                        salvageValue: Math.round(parseFloat(raw || "0") * 0.1).toString(),
                      });
                    }}
                    className="h-8 px-2.5 border rounded font-mono font-bold text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">대당 잔존 가치 (원)</label>
                  <input
                    type="text"
                    value={formatErpNumber(addForm.salvageValue)}
                    onChange={(e) => setAddForm({ ...addForm, salvageValue: e.target.value.replace(/[^0-9]/g, "") })}
                    className="h-8 px-2.5 border rounded font-mono text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">내용연수 (년)</label>
                  <input
                    type="number"
                    value={addForm.usefulLifeYears}
                    onChange={(e) => setAddForm({ ...addForm, usefulLifeYears: e.target.value })}
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">공급처 / 임차처 명칭</label>
                  <input
                    type="text"
                    value={addForm.supplier}
                    onChange={(e) => setAddForm({ ...addForm, supplier: e.target.value })}
                    placeholder="예: (주)컴퓨존 B2B"
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">초기 대여 고객사 및 현장 (옵션)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={addForm.currentCustomer}
                    onChange={(e) => setAddForm({ ...addForm, currentCustomer: e.target.value })}
                    placeholder="대여 고객사명 (미배치 시 공란)"
                    className="h-8 px-2.5 border rounded"
                  />
                  <input
                    type="text"
                    value={addForm.currentSite}
                    onChange={(e) => setAddForm({ ...addForm, currentSite: e.target.value })}
                    placeholder="배치 현장명"
                    className="h-8 px-2.5 border rounded"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold">취득 메모 및 특이사항</label>
                <textarea
                  value={addForm.memo}
                  onChange={(e) => setAddForm({ ...addForm, memo: e.target.value })}
                  placeholder="보증기간, 초기 검수 상태, 설치 메모 등"
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
                  {parseInt(addForm.qty || "1", 10) > 1
                    ? `자산 ${addForm.qty}대 일괄 취득 확정`
                    : "자산 취득 확정"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
