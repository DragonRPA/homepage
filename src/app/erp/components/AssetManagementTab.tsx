"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Plus,
  Search,
  RefreshCw,
  Download,
  Check,
  AlertCircle,
  Package,
  Clock,
  DollarSign,
  Wrench,
  Shield,
  CheckCircle2,
  Calculator,
} from "lucide-react";
import {
  formatErpNumber,
  formatErpCurrency,
  cleanErpNumber,
  sortErpItems,
  resolveDailyRentalFee,
  matchHangulAny,
  AttachedForkliftOption,
  normalizeAttachedOptions,
  normalizeItemClass,
  addMonthsMinusOneDay,
} from "@/lib/erpFormat";
import { useErpTableSort } from "./SortableTh";
import { SearchSelectOption } from "./SearchSelectCombobox";
import { CatalogOptionItem } from "./ForkliftOptionAttachPanel";
import {
  AssetKpiStats,
  AssetLog,
  AssetManagementTabProps,
  AssetRecord,
  AssetSubTab,
  computeNextAssetNo,
  DepMatrixMode,
  exportAssetsCsv,
  ModelSummaryRow,
  ModelSummaryTotals,
  NewAssetFormState,
} from "./assets/assetTypes";
import { AssetSummaryTable, AssetDetailTable } from "./assets/AssetSummaryAndDetailTables";
import { AssetDepreciationLedgerView } from "./assets/AssetDepreciationLedgerView";
import { AssetDossierDrawer } from "./assets/AssetDossierDrawer";
import { AssetAcquireModal } from "./assets/AssetAcquireModal";

export const AssetManagementTab: React.FC<AssetManagementTabProps> = ({
  currentUser,
  defaultFilterModel,
}) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";

  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Sub-Tab State: 요약표 (SUMMARY) vs 상세목록 (DETAIL) vs 월별 감가상각 대장 (DEPRECIATION)
  const [activeSubTab, setActiveSubTab] = useState<AssetSubTab>("SUMMARY");

  // Depreciation Ledger State
  const [depYear, setDepYear] = useState<string>("2026");
  const [depLoading, setDepLoading] = useState<boolean>(false);
  const [depSyncing, setDepSyncing] = useState<boolean>(false);
  const [depMonths, setDepMonths] = useState<string[]>([]);
  const [depRollForward, setDepRollForward] = useState<any[]>([]);
  const [depModelRows, setDepModelRows] = useState<any[]>([]);
  const [depSalesSeparation, setDepSalesSeparation] = useState<any | null>(null);
  const [depAllTimeSalesSeparation, setDepAllTimeSalesSeparation] = useState<any | null>(null);
  const [depMatrixMode, setDepMatrixMode] = useState<DepMatrixMode>("NET_PROFIT");
  const [depLogStats, setDepLogStats] = useState<{ totalLogCount: number; lastSyncedAt: string | null }>({
    totalLogCount: 0,
    lastSyncedAt: null,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState(defaultFilterModel || "");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [manufacturerFilter, setManufacturerFilter] = useState("ALL");

  // Slide-over Dossier State
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [editForm, setEditForm] = useState<Partial<AssetRecord>>({});
  const [optionCatalog, setOptionCatalog] = useState<CatalogOptionItem[]>([]);
  const [assetLogs, setAssetLogs] = useState<AssetLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [newLogMemo, setNewLogMemo] = useState("");

  // Modal: Acquire / Register New Asset
  const [showAddModal, setShowAddModal] = useState(false);
  const todayIso = new Date().toISOString().split("T")[0];
  const [addForm, setAddForm] = useState<NewAssetFormState>({
    assetNo: "",
    qty: "1",
    rentalProductId: "",
    serialNo: "",
    ownerType: "OWNED",
    acquisitionDate: todayIso,
    acquisitionCost: "3200000",
    salvageValue: "0",
    usefulLifeYears: "4",
    usefulLifeMonths: "48",
    operatingHours: "0",
    warrantyStartDate: todayIso,
    warrantyEndDate: addMonthsMinusOneDay(todayIso, 12),
    warrantyHours: "2,000",
    attachedOptions: [] as AttachedForkliftOption[],
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
      const [assetRes, prodRes, tradeRes] = await Promise.all([
        fetch("/api/erp/assets", { cache: "no-store" }),
        fetch("/api/erp/products", { cache: "no-store" }),
        fetch("/api/erp/trade/products", { cache: "no-store" }).catch(() => null),
      ]);

      const assetData = await assetRes.json();
      const prodData = await prodRes.json();
      const tradeData = tradeRes ? await tradeRes.json().catch(() => null) : null;

      if (assetData.success) {
        const loadedAssets: AssetRecord[] = assetData.assets || [];
        setAssets(loadedAssets);
        setSelectedAsset((prev) => {
          if (!prev) return null;
          return loadedAssets.find((a) => a.id === prev.id) || prev;
        });
      }
      const catalogList: CatalogOptionItem[] = [];
      if (prodData.success) {
        const prods = prodData.products || [];
        setProducts(prods);
        if (prods.length > 0 && !addForm.rentalProductId) {
          setAddForm((prev) => ({ ...prev, rentalProductId: prods[0].id.toString() }));
        }
        for (const p of prods) {
          if (normalizeItemClass(p.itemClass || p.item_class, p.category) === "OPTION") {
            catalogList.push({
              id: p.id,
              source: "RENTAL",
              skuCode: p.modelCode || p.model_code || undefined,
              name: p.modelName || p.model_name || p.name,
              spec: p.spec || undefined,
              unitPrice: 0,
              installFee: Number(p.installFee ?? p.install_fee ?? 0),
              monthlyAddonRate: Number(p.standardMonthlyRate ?? p.standard_monthly_rate ?? 0),
              dailyAddonRate: Number(p.standardDailyRate ?? p.standard_daily_rate ?? 0),
            });
          }
        }
      }
      if (tradeData?.success && Array.isArray(tradeData.products)) {
        for (const p of tradeData.products) {
          if (normalizeItemClass(p.item_class, p.category) === "OPTION") {
            catalogList.push({
              id: p.id,
              source: "TRADE",
              skuCode: p.sku_code || undefined,
              name: p.name,
              spec: p.spec || undefined,
              unitPrice: Number(p.standard_price || 0),
              installFee: Number(p.install_fee || 0),
              monthlyAddonRate: Number(p.addon_monthly_rate || 0),
              dailyAddonRate: Number(p.addon_daily_rate || 0),
            });
          }
        }
      }
      setOptionCatalog(catalogList);
    } catch (err: any) {
      showToast("데이터를 불러오지 못했습니다: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchDepreciationLedger = async (targetYr = depYear) => {
    setDepLoading(true);
    try {
      const res = await fetch(`/api/erp/assets/depreciation?year=${encodeURIComponent(targetYr)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDepMonths(data.months || []);
        setDepRollForward(data.rollForwardSchedule || []);
        setDepModelRows(data.modelRows || []);
        setDepSalesSeparation(data.salesSeparation || null);
        setDepAllTimeSalesSeparation(data.allTimeSalesSeparation || null);
        if (data.logStats) setDepLogStats(data.logStats);
      }
    } catch (err) {
      console.error("Failed to fetch depreciation ledger:", err);
    } finally {
      setDepLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "DEPRECIATION") {
      fetchDepreciationLedger(depYear);
    }
  }, [activeSubTab, depYear]);

  const handleSyncDepreciation = async () => {
    setDepSyncing(true);
    try {
      const res = await fetch("/api/erp/assets/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "감가상각 원장 정산 실패");
      }
      showToast(data.message || "월별 감가상각 원장 동기화 완료");
      await Promise.all([fetchData(), fetchDepreciationLedger(depYear)]);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setDepSyncing(false);
    }
  };

  // Fetch Lifecycle Logs for Dossier
  const fetchAssetLogs = async (assetNo: string, assetId: number) => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/erp/assets/logs?assetNo=${encodeURIComponent(assetNo)}&assetId=${assetId}`, { cache: "no-store" });
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
    setEditForm({
      ...asset,
      attachedOptions: normalizeAttachedOptions(asset.attachedOptions),
      warrantyStartDate: asset.warrantyStartDate ? String(asset.warrantyStartDate).slice(0, 10) : "",
      warrantyEndDate: asset.warrantyEndDate ? String(asset.warrantyEndDate).slice(0, 10) : "",
    });
    fetchAssetLogs(asset.assetNo, asset.id);
  };

  // Unique Manufacturers
  const uniqueManufacturers = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.manufacturer).filter(Boolean)));
  }, [assets]);

  const productComboboxOptions = useMemo<SearchSelectOption[]>(() => {
    return products.map((p: any) => {
      const monthly = Number(p.standardMonthlyRate ?? p.standard_monthly_rate ?? 0);
      const daily = resolveDailyRentalFee(
        monthly,
        Number(p.standardDailyRate ?? p.standard_daily_rate ?? 0)
      );
      return {
        value: String(p.id),
        label: `${p.modelName} (${p.modelCode})`,
        subLabel: [
          p.manufacturer,
          `월 ${formatErpNumber(monthly)}원`,
          `일 ${formatErpNumber(daily)}원`,
        ]
          .filter(Boolean)
          .join(" · "),
        searchKeywords: [p.modelName, p.modelCode, p.shortName, p.manufacturer],
      };
    });
  }, [products]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (ownerFilter !== "ALL" && a.ownerType !== ownerFilter) return false;
      if (manufacturerFilter !== "ALL" && a.manufacturer !== manufacturerFilter) return false;

      if (searchTerm.trim()) {
        if (
          !matchHangulAny(
            [
              a.assetNo,
              a.modelName,
              a.modelCode,
              a.serialNo,
              a.currentCustomer,
              a.currentSite,
              a.contractNo,
            ],
            searchTerm
          )
        ) {
          return false;
        }
      }
      return true;
    });
  }, [assets, statusFilter, ownerFilter, manufacturerFilter, searchTerm]);

  // Sorting State (3단계: asc ➔ desc ➔ null 정렬안함)
  const { sortKey, sortDir, handleSort } = useErpTableSort("assetNo", "asc");

  const sortedFilteredAssets = useMemo(() => {
    return sortErpItems(filteredAssets, sortKey, sortDir);
  }, [filteredAssets, sortKey, sortDir]);

  // Summary Table Sorting State & Aggregation (3단계)
  const {
    sortKey: summarySortKey,
    sortDir: summarySortDir,
    handleSort: handleSummarySort,
  } = useErpTableSort("modelName", "asc");

  // 모델별 수량 및 재무·수익 집계
  const modelSummaryRows = useMemo<ModelSummaryRow[]>(() => {
    const map = new Map<string, ModelSummaryRow>();

    for (const a of assets) {
      const mCode = a.modelCode || "-";
      const mName = a.modelName || "미지정 모델";
      const k = `${mCode}__${mName}`;
      const existing = map.get(k) || {
        key: k,
        modelCode: mCode,
        modelName: mName,
        totalQty: 0,
        disposedQty: 0,
        availableQty: 0,
        rentedQty: 0,
        grossAcquisitionCost: 0,
        accumulatedCost: 0,
        bookValue: 0,
        cumulativeRevenue: 0,
        cumulativeNetProfit: 0,
        recoveryRatePct: 0,
      };
      const cost = Number(a.acquisitionCost || 0);
      const book = Number(a.bookValue || 0);
      const rev = Number(a.cumulativeRevenue || 0);
      const prof = Number(a.cumulativeNetProfit || 0);

      existing.grossAcquisitionCost += cost;
      existing.accumulatedCost += Math.max(0, cost - book);
      existing.bookValue += book;
      existing.cumulativeRevenue += rev;
      existing.cumulativeNetProfit += prof;

      if (a.status !== "DISPOSED") {
        existing.totalQty += 1;
        if (a.status === "AVAILABLE") {
          existing.availableQty += 1;
        } else if (a.status === "RENTED") {
          existing.rentedQty += 1;
        }
      } else {
        existing.disposedQty += 1;
      }
      existing.recoveryRatePct =
        existing.grossAcquisitionCost > 0
          ? Number(((existing.cumulativeRevenue / existing.grossAcquisitionCost) * 100).toFixed(1))
          : 0;
      map.set(k, existing);
    }

    let list = Array.from(map.values());
    if (searchTerm.trim()) {
      list = list.filter((r) => matchHangulAny([r.modelName, r.modelCode], searchTerm));
    }

    return sortErpItems(list, summarySortKey, summarySortDir);
  }, [assets, searchTerm, summarySortKey, summarySortDir]);

  const summaryTotals = useMemo<ModelSummaryTotals>(() => {
    let totalQty = 0;
    let disposedQty = 0;
    let availableQty = 0;
    let rentedQty = 0;
    let grossAcquisitionCost = 0;
    let accumulatedCost = 0;
    let bookValue = 0;
    let cumulativeRevenue = 0;
    let cumulativeNetProfit = 0;
    for (const r of modelSummaryRows) {
      totalQty += r.totalQty;
      disposedQty += r.disposedQty;
      availableQty += r.availableQty;
      rentedQty += r.rentedQty;
      grossAcquisitionCost += r.grossAcquisitionCost;
      accumulatedCost += r.accumulatedCost;
      bookValue += r.bookValue;
      cumulativeRevenue += r.cumulativeRevenue;
      cumulativeNetProfit += r.cumulativeNetProfit;
    }
    const recoveryRatePct =
      grossAcquisitionCost > 0
        ? Number(((cumulativeRevenue / grossAcquisitionCost) * 100).toFixed(1))
        : 0;
    return {
      totalQty,
      disposedQty,
      availableQty,
      rentedQty,
      grossAcquisitionCost,
      accumulatedCost,
      bookValue,
      cumulativeRevenue,
      cumulativeNetProfit,
      recoveryRatePct,
    };
  }, [modelSummaryRows]);

  // KPI Metrics
  const kpiStats = useMemo<AssetKpiStats>(() => {
    const activeAssets = assets.filter((a) => a.status !== "DISPOSED");
    const totalCount = activeAssets.length;
    let ownedCount = 0;
    let rentedCount = 0;
    let rentedOpCount = 0;
    let availableCount = 0;
    let repairingCount = 0;
    let totalBookValue = 0;
    let totalCumulativeRevenue = 0;
    let totalCumulativeNetProfit = 0;

    for (const a of assets) {
      totalCumulativeRevenue += Number(a.cumulativeRevenue || 0);
      totalCumulativeNetProfit += Number(a.cumulativeNetProfit || 0);
    }

    for (const a of activeAssets) {
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

    return {
      totalCount,
      ownedCount,
      rentedCount,
      rentedOpCount,
      availableCount,
      repairingCount,
      totalBookValue,
      totalCumulativeRevenue,
      totalCumulativeNetProfit,
    };
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
          operatingHours: cleanErpNumber(String(editForm.operatingHours ?? 0)),
          warrantyHours: cleanErpNumber(String(editForm.warrantyHours ?? 2000)),
          warrantyStartDate: editForm.warrantyStartDate || null,
          warrantyEndDate: editForm.warrantyEndDate || null,
          attachedOptions: normalizeAttachedOptions(editForm.attachedOptions),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "자산 정보 수정 실패");

      showToast("자산 정보 및 상태가 성공적으로 갱신되었습니다.");
      setIsEditingDossier(false);
      if (data.asset) {
        setSelectedAsset((prev) => (prev ? { ...prev, ...data.asset } : null));
        setEditForm((prev) => ({ ...prev, ...data.asset }));
      }
      await fetchData();
      await fetchAssetLogs(selectedAsset.assetNo, selectedAsset.id);
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
      await fetchAssetLogs(selectedAsset.assetNo, selectedAsset.id);
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
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Add New Asset
  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAssetNo = addForm.assetNo.trim() || computeNextAssetNo(addForm.acquisitionDate, assets);
    const batchCount = Math.max(1, parseInt(addForm.qty || "1", 10) || 1);
    if (!addForm.rentalProductId) {
      showToast("제품 모델을 선택해 주십시오.", "error");
      return;
    }

    try {
      const res = await fetch("/api/erp/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          assetNo: targetAssetNo,
          qty: batchCount,
          acquisitionCost: String(cleanErpNumber(addForm.acquisitionCost)),
          salvageValue: String(cleanErpNumber(addForm.salvageValue)),
          operatingHours: cleanErpNumber(addForm.operatingHours),
          warrantyHours: cleanErpNumber(addForm.warrantyHours),
          warrantyStartDate: addForm.warrantyStartDate || null,
          warrantyEndDate: addForm.warrantyEndDate || null,
          attachedOptions: addForm.attachedOptions,
        }),
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
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (!exportAssetsCsv(assets)) {
      showToast("내보낼 자산 데이터가 없습니다.", "error");
      return;
    }
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

      {/* 1. Gutenberg Z-Pattern Scope: Compact 1-Line KPI Metrics Strip */}
      <div className="px-2.5 py-1.5 border-b flex flex-wrap items-center gap-2 shrink-0 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border flex-1 min-w-[120px] whitespace-nowrap">
          <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-[11px] opacity-70">총 자산</span>
          <span className="font-bold ml-auto">{formatErpNumber(kpiStats.totalCount)}대</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border flex-1 min-w-[130px] whitespace-nowrap">
          <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-[11px] opacity-70">자사/임차</span>
          <span className="font-bold ml-auto">
            <span className="text-emerald-700">{formatErpNumber(kpiStats.ownedCount)}</span> / <span className="text-indigo-700">{formatErpNumber(kpiStats.rentedCount)}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border flex-1 min-w-[125px] whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-[11px] opacity-70">대여운용중</span>
          <span className="font-bold text-blue-700 ml-auto">{formatErpNumber(kpiStats.rentedOpCount)}대</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border flex-1 min-w-[125px] whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span className="text-[11px] opacity-70">임대가용</span>
          <span className="font-bold text-teal-700 ml-auto">{formatErpNumber(kpiStats.availableCount)}대</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border flex-1 min-w-[120px] whitespace-nowrap">
          <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-[11px] opacity-70">점검/수리</span>
          <span className="font-bold text-amber-700 ml-auto">{formatErpNumber(kpiStats.repairingCount)}대</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border flex-1 min-w-[155px] whitespace-nowrap">
          <DollarSign className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span className="text-[11px] opacity-70">총 장부가액</span>
          <span className="font-bold font-mono text-purple-800 ml-auto">
            {formatErpCurrency(kpiStats.totalBookValue)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border flex-1 min-w-[165px] whitespace-nowrap">
          <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-[11px] opacity-70">누적 렌탈매출</span>
          <span className="font-bold font-mono text-emerald-700 ml-auto">
            {formatErpCurrency(kpiStats.totalCumulativeRevenue)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border flex-1 min-w-[165px] whitespace-nowrap">
          <Calculator className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-[11px] opacity-70">누적 순수익</span>
          <span className={`font-bold font-mono ml-auto ${kpiStats.totalCumulativeNetProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
            {kpiStats.totalCumulativeNetProfit >= 0 ? `+${formatErpCurrency(kpiStats.totalCumulativeNetProfit)}` : formatErpCurrency(kpiStats.totalCumulativeNetProfit)}
          </span>
        </div>
      </div>

      {/* 2. Gutenberg Z-Pattern Unified Sub-Tab + Search & Action Toolbar */}
      <div className="px-2.5 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Sub-Tab Switcher Inline */}
          <div className="flex items-center gap-1 pr-2 border-r mr-0.5">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab("SUMMARY");
                setSelectedAsset(null);
              }}
              className={`h-7 px-2.5 rounded text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap border ${
                activeSubTab === "SUMMARY"
                  ? "border-blue-600 text-blue-700 bg-blue-600/10"
                  : "border-transparent opacity-65 hover:opacity-100"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>요약표</span>
              <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-blue-600/15 text-blue-700">
                {formatErpNumber(modelSummaryRows.length)}개 모델
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("DETAIL")}
              className={`h-7 px-2.5 rounded text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap border ${
                activeSubTab === "DETAIL"
                  ? "border-blue-600 text-blue-700 bg-blue-600/10"
                  : "border-transparent opacity-65 hover:opacity-100"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>상세목록</span>
              <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-slate-500/15">
                {formatErpNumber(filteredAssets.length)}대
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab("DEPRECIATION");
                setSelectedAsset(null);
              }}
              className={`h-7 px-2.5 rounded text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap border ${
                activeSubTab === "DEPRECIATION"
                  ? "border-purple-600 text-purple-700 bg-purple-600/10"
                  : "border-transparent opacity-65 hover:opacity-100"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>월별 감가상각 대장</span>
              <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-purple-600/15 text-purple-700">
                재무제표 연동
              </span>
            </button>
          </div>

          {activeSubTab === "DEPRECIATION" && (
            <div className="flex items-center gap-1">
              {[
                { key: "2026", label: "2026년" },
                { key: "2025", label: "2025년" },
                { key: "2024", label: "2024년" },
                { key: "ALL", label: "전체기간" },
              ].map((y) => (
                <button
                  key={y.key}
                  type="button"
                  onClick={() => setDepYear(y.key)}
                  className={`h-7 px-2 rounded text-xs font-bold border whitespace-nowrap transition ${
                    depYear === y.key
                      ? "bg-purple-600 text-white border-purple-700"
                      : "hover:bg-black/5 opacity-75"
                  }`}
                >
                  {y.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleSyncDepreciation}
                  disabled={depSyncing}
                  className="h-7 px-2.5 rounded text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 flex items-center gap-1 whitespace-nowrap ml-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${depSyncing ? "animate-spin" : ""}`} />
                  <span>{depSyncing ? "정산 동기화 중..." : "감가상각 원장 정산"}</span>
                </button>
              )}
            </div>
          )}

          {activeSubTab === "DETAIL" && (
            <>
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-7 px-2 rounded text-xs border font-medium"
              >
                <option value="ALL">전체 자산 상태</option>
                <option value="AVAILABLE">임대가능 (가용)</option>
                <option value="RENTED">대여중 (현장운용)</option>
                <option value="OUTBOUND_PENDING">출고대기</option>
                <option value="REPAIRING">정비/수리중</option>
                <option value="DISPOSED">폐기/매각완료</option>
              </select>

              {/* Owner Filter */}
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="h-7 px-2 rounded text-xs border font-medium"
              >
                <option value="ALL">전체 소유구분</option>
                <option value="OWNED">자사자산 (당사소유)</option>
                <option value="RENTED">외부임차 (전대용)</option>
              </select>

              {/* Manufacturer Filter */}
              <select
                value={manufacturerFilter}
                onChange={(e) => setManufacturerFilter(e.target.value)}
                className="h-7 px-2 rounded text-xs border"
              >
                <option value="ALL">전체 제조사</option>
                {uniqueManufacturers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 opacity-50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeSubTab === "SUMMARY"
                  ? "모델명 / 모델코드 검색"
                  : "자산번호 / 모델명 / 시리얼 / 고객사 검색"
              }
              className="h-7 pl-7 pr-2.5 rounded text-xs border w-56"
            />
          </div>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={fetchData}
            disabled={loading}
            className="h-7 px-2 rounded border text-xs flex items-center gap-1 font-medium hover:opacity-80 transition whitespace-nowrap"
            title="새로고침"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>새로고침</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="h-7 px-2 rounded border text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition text-emerald-700 whitespace-nowrap"
            title="엑셀 다운로드"
          >
            <Download className="w-3 h-3" />
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
              className="h-7 px-2.5 rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1 shadow-sm transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span className="text-white">신규 자산 취득</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Central Body: High-Density Multi-Column Grid + Slide-over Dossier */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <div className="flex-1 overflow-auto">
          {activeSubTab === "SUMMARY" ? (
            <AssetSummaryTable
              loading={loading}
              modelSummaryRows={modelSummaryRows}
              summaryTotals={summaryTotals}
              summarySortKey={summarySortKey}
              summarySortDir={summarySortDir}
              onSummarySort={handleSummarySort}
              onSelectModel={(modelName) => {
                setSearchTerm(modelName);
                setActiveSubTab("DETAIL");
              }}
            />
          ) : activeSubTab === "DEPRECIATION" ? (
            <AssetDepreciationLedgerView
              depYear={depYear}
              depLoading={depLoading}
              depMonths={depMonths}
              depRollForward={depRollForward}
              depModelRows={depModelRows}
              depSalesSeparation={depSalesSeparation}
              depAllTimeSalesSeparation={depAllTimeSalesSeparation}
              depMatrixMode={depMatrixMode}
              onChangeDepMatrixMode={setDepMatrixMode}
              depLogStats={depLogStats}
              onDrilldownModel={(modelName) => {
                setSearchTerm(modelName);
                setActiveSubTab("DETAIL");
              }}
            />
          ) : (
            <AssetDetailTable
              loading={loading}
              sortedFilteredAssets={sortedFilteredAssets}
              selectedAssetId={selectedAsset?.id ?? null}
              isAdmin={isAdmin}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onSelectAsset={handleSelectAsset}
              onDeleteAsset={handleDeleteAsset}
            />
          )}
        </div>

        {/* 4. Slide-over Dossier Studio (마스터-디테일 & 360도 장부) */}
        {activeSubTab === "DETAIL" && selectedAsset && (
          <AssetDossierDrawer
            selectedAsset={selectedAsset}
            isAdmin={isAdmin}
            isEditingDossier={isEditingDossier}
            onStartEdit={() => setIsEditingDossier(true)}
            onSaveDossier={handleSaveDossier}
            onClose={() => setSelectedAsset(null)}
            editForm={editForm}
            setEditForm={setEditForm}
            optionCatalog={optionCatalog}
            assetLogs={assetLogs}
            loadingLogs={loadingLogs}
            newLogMemo={newLogMemo}
            onChangeNewLogMemo={setNewLogMemo}
            onAddLog={handleAddLog}
          />
        )}
      </div>

      {/* 5. Modal: Acquire / Register New Asset */}
      {showAddModal && (
        <AssetAcquireModal
          assets={assets}
          addForm={addForm}
          setAddForm={setAddForm}
          productComboboxOptions={productComboboxOptions}
          optionCatalog={optionCatalog}
          onSubmit={handleAddAsset}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};
