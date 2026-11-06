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
  disposedDate?: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  usefulLifeMonths?: number;
  depreciationMethod: string;
  accumulatedDepreciation: number;
  bookValue: number;
  monthlyDepreciation: number;
  cumulativeRevenue?: number;
  cumulativeNetProfit?: number;
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

  // Sub-Tab State: 요약표 (SUMMARY) vs 상세목록 (DETAIL) vs 월별 감가상각 대장 (DEPRECIATION)
  const [activeSubTab, setActiveSubTab] = useState<"SUMMARY" | "DETAIL" | "DEPRECIATION">("SUMMARY");

  // Depreciation Ledger State
  const [depYear, setDepYear] = useState<string>("2026");
  const [depLoading, setDepLoading] = useState<boolean>(false);
  const [depSyncing, setDepSyncing] = useState<boolean>(false);
  const [depMonths, setDepMonths] = useState<string[]>([]);
  const [depRollForward, setDepRollForward] = useState<any[]>([]);
  const [depModelRows, setDepModelRows] = useState<any[]>([]);
  const [depSalesSeparation, setDepSalesSeparation] = useState<any | null>(null);
  const [depAllTimeSalesSeparation, setDepAllTimeSalesSeparation] = useState<any | null>(null);
  const [depMatrixMode, setDepMatrixMode] = useState<"NET_PROFIT" | "REVENUE" | "DEPRECIATION">("NET_PROFIT");
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
    salvageValue: "0",
    usefulLifeYears: "4",
    usefulLifeMonths: "48",
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
        fetch("/api/erp/assets", { cache: "no-store" }),
        fetch("/api/erp/products", { cache: "no-store" })
      ]);

      const assetData = await assetRes.json();
      const prodData = await prodRes.json();

      if (assetData.success) {
        const loadedAssets: AssetRecord[] = assetData.assets || [];
        setAssets(loadedAssets);
        setSelectedAsset((prev) => {
          if (!prev) return null;
          return loadedAssets.find((a) => a.id === prev.id) || prev;
        });
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
        className={`py-1.5 px-2 cursor-pointer select-none hover:bg-slate-500/10 transition text-${align} whitespace-nowrap`}
        title={`${label} 기준 정렬`}
      >
        <div className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start"}`}>
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
            ) : (
              <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />
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
        className={`py-1.5 px-2 cursor-pointer select-none hover:bg-slate-500/10 transition text-${align} whitespace-nowrap`}
        title={`${label} 기준 정렬`}
      >
        <div className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start"}`}>
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              summarySortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
            ) : (
              <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />
            )}
          </span>
        </div>
      </th>
    );
  };

  // 모델별 수량 및 재무·수익 집계 (총수량, 임대가능, 임대중, 총취득원가, 누적상각/손실, 현재장부가, 누적렌탈매출, 누적순수익, 회수율)
  const modelSummaryRows = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        modelCode: string;
        modelName: string;
        totalQty: number;
        disposedQty: number;
        availableQty: number;
        rentedQty: number;
        grossAcquisitionCost: number;
        accumulatedCost: number;
        bookValue: number;
        cumulativeRevenue: number;
        cumulativeNetProfit: number;
        recoveryRatePct: number;
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

  // KPI Metrics (단일 패스 계산 - 폐기 자산은 현 가동 보유수량에서 제외하되 누적매출·누적순수익은 전 자산 합산)
  const kpiStats = useMemo(() => {
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
      await fetchData();
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
      "월감가상각비(원)", "누적렌탈매출(원)", "누적순수익(원)", "현재대여처", "배치현장", "계약번호", "특이사항"
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
      a.acquisitionDate ? String(a.acquisitionDate).slice(0, 10) : "-",
      a.acquisitionCost,
      a.salvageValue,
      a.usefulLifeYears,
      a.accumulatedDepreciation,
      a.bookValue,
      a.monthlyDepreciation,
      a.cumulativeRevenue || 0,
      a.cumulativeNetProfit || 0,
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
        {/* Main Grid Table Area */}
        <div className="flex-1 overflow-auto">
          {activeSubTab === "SUMMARY" ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 select-none bg-[var(--bg-card)] border-b">
                <tr>
                  {renderSummarySortTh("제품 모델명", "modelName")}
                  {renderSummarySortTh("모델코드", "modelCode")}
                  {renderSummarySortTh("가동수량", "totalQty", "right")}
                  {renderSummarySortTh("임대가능", "availableQty", "right")}
                  {renderSummarySortTh("임대중", "rentedQty", "right")}
                  {renderSummarySortTh("총취득원가", "grossAcquisitionCost", "right")}
                  {renderSummarySortTh("누적상각·손실", "accumulatedCost", "right")}
                  {renderSummarySortTh("현재장부가액", "bookValue", "right")}
                  {renderSummarySortTh("누적렌탈매출", "cumulativeRevenue", "right")}
                  {renderSummarySortTh("누적순수익(매출-상각)", "cumulativeNetProfit", "right")}
                  {renderSummarySortTh("원가회수율", "recoveryRatePct", "right")}
                </tr>
              </thead>
              <tbody>
                {modelSummaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-xs opacity-60">
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
                        <td className="py-1 px-2 font-semibold whitespace-nowrap">
                          {row.modelName}
                        </td>
                        <td className="py-1 px-2 font-mono opacity-75 whitespace-nowrap">
                          {row.modelCode}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold whitespace-nowrap">
                          {formatErpQty(row.totalQty, "대")}
                          {row.disposedQty > 0 && (
                            <span className="text-[10px] text-amber-700 ml-1">(폐기{row.disposedQty})</span>
                          )}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {formatErpQty(row.availableQty, "대")}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                          {formatErpQty(row.rentedQty, "대")}
                        </td>
                        <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                          {formatErpCurrency(row.grossAcquisitionCost)}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-rose-700 whitespace-nowrap">
                          -{formatErpCurrency(row.accumulatedCost)}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-semibold text-purple-800 whitespace-nowrap">
                          {formatErpCurrency(row.bookValue)}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {row.cumulativeRevenue > 0 ? formatErpCurrency(row.cumulativeRevenue) : "₩0"}
                        </td>
                        <td className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap ${row.cumulativeNetProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                          {row.cumulativeNetProfit >= 0
                            ? `+${formatErpCurrency(row.cumulativeNetProfit)}`
                            : formatErpCurrency(row.cumulativeNetProfit)}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-semibold whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${row.recoveryRatePct >= 100 ? "bg-emerald-600/15 text-emerald-700" : "bg-amber-600/15 text-amber-700"}`}>
                            {row.recoveryRatePct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-500/10 font-bold border-t-2">
                      <td className="py-1.5 px-2 whitespace-nowrap" colSpan={2}>
                        합계 ({formatErpNumber(modelSummaryRows.length)}개 모델)
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                        {formatErpQty(summaryTotals.totalQty, "대")}
                        {summaryTotals.disposedQty > 0 && (
                          <span className="text-[10px] text-amber-700 ml-1">(폐기{summaryTotals.disposedQty})</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                        {formatErpQty(summaryTotals.availableQty, "대")}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-blue-700 whitespace-nowrap">
                        {formatErpQty(summaryTotals.rentedQty, "대")}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                        {formatErpCurrency(summaryTotals.grossAcquisitionCost)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-rose-700 whitespace-nowrap">
                        -{formatErpCurrency(summaryTotals.accumulatedCost)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-purple-800 whitespace-nowrap">
                        {formatErpCurrency(summaryTotals.bookValue)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                        {formatErpCurrency(summaryTotals.cumulativeRevenue)}
                      </td>
                      <td className={`py-1.5 px-2 text-right font-mono whitespace-nowrap ${summaryTotals.cumulativeNetProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                        {summaryTotals.cumulativeNetProfit >= 0
                          ? `+${formatErpCurrency(summaryTotals.cumulativeNetProfit)}`
                          : formatErpCurrency(summaryTotals.cumulativeNetProfit)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600/15 text-emerald-700">
                          {summaryTotals.recoveryRatePct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          ) : activeSubTab === "DEPRECIATION" ? (
            <div className="p-2.5 flex flex-col gap-3 text-xs">
              {/* 0) 매출세금계산서 기준 렌탈사업부 매출 유형 분리 (4대 매출 유형) */}
              {depSalesSeparation?.categories && depSalesSeparation.categories.length > 0 && (
                <div className="border rounded overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-500/10 border-b flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold whitespace-nowrap">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>렌탈 매출세금계산서 매출 유형 분리 ({depYear === "ALL" ? "전체 누적" : `${depYear}년`})</span>
                    </div>
                    <div className="text-[11px] font-mono opacity-75 whitespace-nowrap">
                      전체 누적 렌탈 세금계산서 합계:{" "}
                      {formatErpCurrency(depAllTimeSalesSeparation?.totalSupplyAmount || 0)} (
                      {depAllTimeSalesSeparation?.totalInvoiceCount || 0}건)
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x">
                    {depSalesSeparation.categories.map((cat: any) => {
                      const allTimeCat = depAllTimeSalesSeparation?.categories?.find((x: any) => x.code === cat.code);
                      const isOwnedRental = cat.code === "OWNED_ASSET_RENTAL";
                      return (
                        <div
                          key={cat.code}
                          className={`p-2.5 flex flex-col gap-1 ${
                            isOwnedRental ? "bg-emerald-500/10" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 whitespace-nowrap">
                            <span className={`font-bold ${isOwnedRental ? "text-emerald-800" : ""}`}>
                              {cat.label}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono border">
                              {cat.invoiceCount}건 ({(cat.sharePct || 0).toFixed(1)}%)
                            </span>
                          </div>
                          <div className="text-sm font-mono font-extrabold text-right whitespace-nowrap">
                            {formatErpCurrency(cat.supplyAmount)}
                          </div>
                          <div className="text-[10px] opacity-75 truncate" title={cat.description}>
                            {cat.description}
                          </div>
                          {depYear !== "ALL" && allTimeCat && (
                            <div className="text-[10px] font-mono opacity-65 text-right whitespace-nowrap border-t pt-1 mt-0.5">
                              전체 누적: {formatErpCurrency(allTimeCat.supplyAmount)} ({allTimeCat.invoiceCount}건)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 1) 월별 유형자산(임대자산) 가치 변동 · 월별 렌탈매출 · 월별 순수익 정산표 */}
              <div className="border rounded overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-500/10 border-b flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold whitespace-nowrap">
                    <Calculator className="w-3.5 h-3.5 text-purple-600" />
                    <span>월별 유형자산 가치 변동 · 렌탈매출 · 순수익 정산표 ({depYear === "ALL" ? "전체기간" : `${depYear}년`})</span>
                  </div>
                  <div className="text-[11px] font-mono opacity-75 whitespace-nowrap">
                    원장 적재: {formatErpNumber(depLogStats.totalLogCount)}건
                    {depLogStats.lastSyncedAt ? ` | 최종 정산: ${String(depLogStats.lastSyncedAt).slice(0, 16)}` : ""}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[var(--bg-card)] border-b select-none">
                      <tr>
                        <th className="py-1.5 px-2 whitespace-nowrap">귀속연월</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">기초장부가액</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">당월취득원가 (+)</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">당월렌탈매출 (+)</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">당월감가상각비 (-)</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">파손·폐기손실 (-)</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">당월순수익 (매출-상각)</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">누적순수익</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">기말취득원가 (BS)</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">감가상각누계액 (BS)</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">기말장부가액 (BS)</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">가동수량</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depLoading ? (
                        <tr>
                          <td colSpan={12} className="py-8 text-center opacity-60">
                            감가상각 및 매출·수익 원장을 불러오는 중입니다...
                          </td>
                        </tr>
                      ) : depRollForward.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-8 text-center opacity-60">
                            해당 연도에 집계된 감가상각 내역이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {depRollForward.map((r) => (
                            <tr key={r.yearMonth} className="border-b hover:bg-black/5">
                              <td className="py-1 px-2 font-mono font-bold whitespace-nowrap">{r.yearMonth}</td>
                              <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                                {r.beginningBookValue > 0 ? formatErpCurrency(r.beginningBookValue) : "-"}
                              </td>
                              <td className="py-1 px-2 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">
                                {r.additionCost > 0 ? `+${formatErpCurrency(r.additionCost)}` : "-"}
                              </td>
                              <td className="py-1 px-2 text-right font-mono text-emerald-700 font-bold whitespace-nowrap">
                                {r.monthlyRevenue > 0 ? `+${formatErpCurrency(r.monthlyRevenue)}` : "-"}
                              </td>
                              <td className="py-1 px-2 text-right font-mono text-rose-700 font-bold whitespace-nowrap">
                                {r.depreciationExpense > 0 ? `-${formatErpCurrency(r.depreciationExpense)}` : "-"}
                              </td>
                              <td className="py-1 px-2 text-right font-mono text-amber-700 font-bold whitespace-nowrap">
                                {r.disposalLoss > 0 ? `-${formatErpCurrency(r.disposalLoss)}` : "-"}
                              </td>
                              <td className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap ${(r.monthlyNetProfit || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                                {(r.monthlyNetProfit || 0) > 0
                                  ? `+${formatErpCurrency(r.monthlyNetProfit)}`
                                  : (r.monthlyNetProfit || 0) < 0
                                  ? formatErpCurrency(r.monthlyNetProfit)
                                  : "₩0"}
                              </td>
                              <td className={`py-1 px-2 text-right font-mono font-semibold whitespace-nowrap ${(r.cumulativeNetProfit || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                                {(r.cumulativeNetProfit || 0) > 0
                                  ? `+${formatErpCurrency(r.cumulativeNetProfit)}`
                                  : formatErpCurrency(r.cumulativeNetProfit || 0)}
                              </td>
                              <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                                {r.endingGrossCost > 0 ? formatErpCurrency(r.endingGrossCost) : "-"}
                              </td>
                              <td className="py-1 px-2 text-right font-mono opacity-80 whitespace-nowrap">
                                {r.endingAccumDepreciation > 0 ? `-${formatErpCurrency(r.endingAccumDepreciation)}` : "-"}
                              </td>
                              <td className="py-1 px-2 text-right font-mono font-bold text-purple-800 whitespace-nowrap">
                                {r.endingBookValue > 0 ? formatErpCurrency(r.endingBookValue) : "₩0"}
                              </td>
                              <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                                {formatErpQty(r.activeAssetCount, "대")}
                              </td>
                            </tr>
                          ))}
                          {(() => {
                            const first = depRollForward[0];
                            const last = depRollForward[depRollForward.length - 1];
                            const sumAdd = depRollForward.reduce((s, x) => s + (x.additionCost || 0), 0);
                            const sumRev = depRollForward.reduce((s, x) => s + (x.monthlyRevenue || 0), 0);
                            const sumDep = depRollForward.reduce((s, x) => s + (x.depreciationExpense || 0), 0);
                            const sumLoss = depRollForward.reduce((s, x) => s + (x.disposalLoss || 0), 0);
                            const sumProfit = depRollForward.reduce((s, x) => s + (x.monthlyNetProfit || 0), 0);
                            return (
                              <tr className="bg-purple-500/10 font-bold border-t-2">
                                <td className="py-1.5 px-2 whitespace-nowrap">기간 합계 / 기말 잔액</td>
                                <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                                  {formatErpCurrency(first?.beginningBookValue || 0)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                                  +{formatErpCurrency(sumAdd)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                                  +{formatErpCurrency(sumRev)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-rose-700 whitespace-nowrap">
                                  -{formatErpCurrency(sumDep)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-amber-700 whitespace-nowrap">
                                  -{formatErpCurrency(sumLoss)}
                                </td>
                                <td className={`py-1.5 px-2 text-right font-mono whitespace-nowrap ${sumProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                                  {sumProfit >= 0 ? `+${formatErpCurrency(sumProfit)}` : formatErpCurrency(sumProfit)}
                                </td>
                                <td className={`py-1.5 px-2 text-right font-mono whitespace-nowrap ${(last?.cumulativeNetProfit || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                                  {(last?.cumulativeNetProfit || 0) >= 0
                                    ? `+${formatErpCurrency(last?.cumulativeNetProfit || 0)}`
                                    : formatErpCurrency(last?.cumulativeNetProfit || 0)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                                  {formatErpCurrency(last?.endingGrossCost || 0)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                                  -{formatErpCurrency(last?.endingAccumDepreciation || 0)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-purple-800 whitespace-nowrap">
                                  {formatErpCurrency(last?.endingBookValue || 0)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                                  {formatErpQty(last?.activeAssetCount || 0, "대")}
                                </td>
                              </tr>
                            );
                          })()}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2) 품목 모델별 취득원가 · 내용월수 · 감가상각 · 누적매출 · 순수익 명세표 */}
              <div className="border rounded overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-500/10 border-b flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold whitespace-nowrap">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>모델별 취득원가 · 감가상각 · 누적매출 · 순수익 명세 ({formatErpNumber(depModelRows.length)}개 모델)</span>
                  </div>
                  <span className="text-[11px] font-mono opacity-75 whitespace-nowrap">
                    순수익 = 자사 렌탈자산 임대매출 - 감가상각비 - 파손·폐기손실
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[var(--bg-card)] border-b select-none">
                      <tr>
                        <th className="py-1.5 px-2 whitespace-nowrap">모델명 (코드)</th>
                        <th className="py-1.5 px-2 whitespace-nowrap">공급처</th>
                        <th className="py-1.5 px-2 text-center whitespace-nowrap">취득일자</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">수량(가동/폐기)</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">총취득원가</th>
                        <th className="py-1.5 px-2 text-center whitespace-nowrap">내용월수</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">당기렌탈매출</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">당기상각·손실</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">당기순수익</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">누적렌탈매출</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">누적상각·손실</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">기말장부가액</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">누적순수익</th>
                        <th className="py-1.5 px-2 text-right whitespace-nowrap">원가회수율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depModelRows.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="py-8 text-center opacity-60">
                            취득원가가 등록된 임대자산 모델이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {depModelRows.map((m) => {
                            const periodCost = (m.periodDepreciationTotal || 0) + (m.periodDisposalLossTotal || 0);
                            return (
                              <tr
                                key={m.modelKey}
                                onClick={() => {
                                  setSearchTerm(m.modelName);
                                  setActiveSubTab("DETAIL");
                                }}
                                className="border-b hover:bg-black/5 cursor-pointer"
                                title="클릭 시 해당 모델의 자산 상세목록 조회"
                              >
                                <td className="py-1 px-2 whitespace-nowrap">
                                  <span className="font-bold">{m.modelName}</span>{" "}
                                  <span className="text-[10px] font-mono opacity-60">({m.modelCode})</span>
                                </td>
                                <td className="py-1 px-2 whitespace-nowrap">{m.supplier}</td>
                                <td className="py-1 px-2 text-center font-mono whitespace-nowrap">{m.acquisitionDate}</td>
                                <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                                  {m.totalQty}대 ({m.activeQty}/{m.disposedQty})
                                </td>
                                <td className="py-1 px-2 text-right font-mono font-semibold whitespace-nowrap">
                                  {formatErpCurrency(m.grossAcquisitionCost)}
                                </td>
                                <td className="py-1 px-2 text-center font-mono whitespace-nowrap">
                                  {m.usefulLifeMonths <= 1
                                    ? "1개월(즉시)"
                                    : m.usefulLifeMonths % 12 === 0
                                    ? `${m.usefulLifeMonths / 12}년(${m.usefulLifeMonths}개월)`
                                    : `${m.usefulLifeMonths}개월`}
                                </td>
                                <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                  {(m.periodRevenueTotal || 0) > 0 ? `+${formatErpCurrency(m.periodRevenueTotal)}` : "-"}
                                </td>
                                <td className="py-1 px-2 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                                  {periodCost > 0 ? `-${formatErpCurrency(periodCost)}` : "-"}
                                </td>
                                <td className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap ${(m.periodNetProfitTotal || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                                  {(m.periodNetProfitTotal || 0) > 0
                                    ? `+${formatErpCurrency(m.periodNetProfitTotal)}`
                                    : (m.periodNetProfitTotal || 0) < 0
                                    ? formatErpCurrency(m.periodNetProfitTotal)
                                    : "₩0"}
                                </td>
                                <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                  {formatErpCurrency(m.cumulativeRevenue || 0)}
                                </td>
                                <td className="py-1 px-2 text-right font-mono opacity-80 text-rose-700 whitespace-nowrap">
                                  -{formatErpCurrency(m.cumulativeTotalCost || 0)}
                                </td>
                                <td className="py-1 px-2 text-right font-mono font-semibold text-purple-800 whitespace-nowrap">
                                  {formatErpCurrency(m.endingBookValue)}
                                </td>
                                <td className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap ${(m.cumulativeNetProfit || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                                  {(m.cumulativeNetProfit || 0) >= 0
                                    ? `+${formatErpCurrency(m.cumulativeNetProfit)}`
                                    : formatErpCurrency(m.cumulativeNetProfit)}
                                </td>
                                <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${(m.recoveryRatePct || 0) >= 100 ? "bg-emerald-600/15 text-emerald-700" : "bg-amber-600/15 text-amber-700"}`}>
                                    {(m.recoveryRatePct || 0).toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {(() => {
                            const totQty = depModelRows.reduce((s, x) => s + (x.totalQty || 0), 0);
                            const totAct = depModelRows.reduce((s, x) => s + (x.activeQty || 0), 0);
                            const totDisp = depModelRows.reduce((s, x) => s + (x.disposedQty || 0), 0);
                            const totGross = depModelRows.reduce((s, x) => s + (x.grossAcquisitionCost || 0), 0);
                            const totActGross = depModelRows.reduce((s, x) => s + (x.activeGrossCost || 0), 0);
                            const totPeriodRev = depModelRows.reduce((s, x) => s + (x.periodRevenueTotal || 0), 0);
                            const totPeriodDep = depModelRows.reduce((s, x) => s + (x.periodDepreciationTotal || 0), 0);
                            const totPeriodLoss = depModelRows.reduce((s, x) => s + (x.periodDisposalLossTotal || 0), 0);
                            const totPeriodProfit = depModelRows.reduce((s, x) => s + (x.periodNetProfitTotal || 0), 0);
                            const totCumRev = depModelRows.reduce((s, x) => s + (x.cumulativeRevenue || 0), 0);
                            const totCumCost = depModelRows.reduce((s, x) => s + (x.cumulativeTotalCost || 0), 0);
                            const totEndBook = depModelRows.reduce((s, x) => s + (x.endingBookValue || 0), 0);
                            const totCumProfit = depModelRows.reduce((s, x) => s + (x.cumulativeNetProfit || 0), 0);
                            const totRecPct = totGross > 0 ? Number(((totCumRev / totGross) * 100).toFixed(1)) : 0;
                            return (
                              <tr className="bg-slate-500/10 font-bold border-t-2">
                                <td className="py-1.5 px-2 whitespace-nowrap" colSpan={3}>
                                  합계 (기말 가동자산 취득가액: {formatErpCurrency(totActGross)})
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                                  {totQty}대 ({totAct}/{totDisp})
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                                  {formatErpCurrency(totGross)}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono whitespace-nowrap">-</td>
                                <td className="py-1.5 px-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                                  +{formatErpCurrency(totPeriodRev)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-rose-700 whitespace-nowrap">
                                  -{formatErpCurrency(totPeriodDep + totPeriodLoss)}
                                </td>
                                <td className={`py-1.5 px-2 text-right font-mono whitespace-nowrap ${totPeriodProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                                  {totPeriodProfit >= 0 ? `+${formatErpCurrency(totPeriodProfit)}` : formatErpCurrency(totPeriodProfit)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                                  {formatErpCurrency(totCumRev)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-rose-700 whitespace-nowrap">
                                  -{formatErpCurrency(totCumCost)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-purple-800 whitespace-nowrap">
                                  {formatErpCurrency(totEndBook)}
                                </td>
                                <td className={`py-1.5 px-2 text-right font-mono whitespace-nowrap ${totCumProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                                  {totCumProfit >= 0 ? `+${formatErpCurrency(totCumProfit)}` : formatErpCurrency(totCumProfit)}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600/15 text-emerald-700">
                                    {totRecPct.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })()}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3) 모델별 × 월별 렌탈매출 / 감가상각비 / 순수익 매트릭스 */}
              {depMonths.length > 0 && depModelRows.length > 0 && (
                <div className="border rounded overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-500/10 border-b flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold whitespace-nowrap">
                      <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        모델별 월별 {depMatrixMode === "NET_PROFIT" ? "순수익(매출-상각)" : depMatrixMode === "REVENUE" ? "렌탈매출" : "감가상각·손실"} 집계표 ({depYear === "ALL" ? "전체기간" : `${depYear}년`})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[
                        { key: "NET_PROFIT", label: "월별 순수익" },
                        { key: "REVENUE", label: "월별 렌탈매출" },
                        { key: "DEPRECIATION", label: "월별 상각·손실" },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setDepMatrixMode(tab.key as any)}
                          className={`h-6 px-2 rounded text-[11px] font-bold border whitespace-nowrap transition ${
                            depMatrixMode === tab.key
                              ? "bg-blue-600 text-white border-blue-700"
                              : "hover:bg-black/5 opacity-75"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[var(--bg-card)] border-b select-none">
                        <tr>
                          <th className="py-1.5 px-2 whitespace-nowrap sticky left-0 bg-[var(--bg-card)] border-r">
                            모델명 (코드)
                          </th>
                          {depMonths.map((ym) => (
                            <th key={ym} className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                              {depYear === "ALL" ? ym : `${Number(ym.slice(5, 7))}월`}
                            </th>
                          ))}
                          <th className="py-1.5 px-2 text-right font-mono whitespace-nowrap border-l">
                            기간 합계
                          </th>
                          <th className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                            전체 누적
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {depModelRows.map((m) => {
                          const periodSum =
                            depMatrixMode === "NET_PROFIT"
                              ? m.periodNetProfitTotal || 0
                              : depMatrixMode === "REVENUE"
                              ? m.periodRevenueTotal || 0
                              : (m.periodDepreciationTotal || 0) + (m.periodDisposalLossTotal || 0);
                          const cumSum =
                            depMatrixMode === "NET_PROFIT"
                              ? m.cumulativeNetProfit || 0
                              : depMatrixMode === "REVENUE"
                              ? m.cumulativeRevenue || 0
                              : m.cumulativeTotalCost || 0;
                          return (
                            <tr key={m.modelKey} className="border-b hover:bg-black/5">
                              <td className="py-1 px-2 whitespace-nowrap sticky left-0 bg-[var(--bg-card)] border-r">
                                <span className="font-bold">{m.modelName}</span>{" "}
                                <span className="text-[10px] font-mono opacity-60">({m.modelCode})</span>
                              </td>
                              {depMonths.map((ym) => {
                                const val =
                                  depMatrixMode === "NET_PROFIT"
                                    ? m.monthlyNetProfitMap?.[ym] || 0
                                    : depMatrixMode === "REVENUE"
                                    ? m.monthlyRevenueMap?.[ym] || 0
                                    : (m.monthlyDepreciationMap?.[ym] || 0) + (m.monthlyDisposalLossMap?.[ym] || 0);
                                return (
                                  <td
                                    key={ym}
                                    className={`py-1 px-2 text-right font-mono whitespace-nowrap ${
                                      val === 0
                                        ? "opacity-30"
                                        : depMatrixMode === "REVENUE"
                                        ? "text-emerald-700 font-semibold"
                                        : depMatrixMode === "DEPRECIATION"
                                        ? "text-rose-700"
                                        : val > 0
                                        ? "text-blue-700 font-semibold"
                                        : "text-rose-700 font-semibold"
                                    }`}
                                  >
                                    {val === 0
                                      ? "-"
                                      : depMatrixMode === "NET_PROFIT" && val > 0
                                      ? `+${formatErpCurrency(val)}`
                                      : formatErpCurrency(val)}
                                  </td>
                                );
                              })}
                              <td
                                className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap border-l ${
                                  depMatrixMode === "REVENUE"
                                    ? "text-emerald-700"
                                    : depMatrixMode === "DEPRECIATION"
                                    ? "text-rose-700"
                                    : periodSum >= 0
                                    ? "text-blue-700"
                                    : "text-rose-700"
                                }`}
                              >
                                {depMatrixMode === "NET_PROFIT" && periodSum > 0
                                  ? `+${formatErpCurrency(periodSum)}`
                                  : formatErpCurrency(periodSum)}
                              </td>
                              <td
                                className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap ${
                                  depMatrixMode === "REVENUE"
                                    ? "text-emerald-700"
                                    : depMatrixMode === "DEPRECIATION"
                                    ? "text-rose-700"
                                    : cumSum >= 0
                                    ? "text-blue-700"
                                    : "text-rose-700"
                                }`}
                              >
                                {depMatrixMode === "NET_PROFIT" && cumSum > 0
                                  ? `+${formatErpCurrency(cumSum)}`
                                  : formatErpCurrency(cumSum)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
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
                  {renderSortTh("누적 렌탈매출", "cumulativeRevenue", "right")}
                  {renderSortTh("누적 순수익", "cumulativeNetProfit", "right")}
                  <th className="py-1.5 px-2 text-center whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-xs opacity-60">
                      {loading ? "자산 대장을 불러오는 중입니다..." : "조회 조건에 일치하는 자산이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  sortedFilteredAssets.map((a) => {
                    const isSelected = selectedAsset?.id === a.id;
                    const formattedDate = a.acquisitionDate ? String(a.acquisitionDate).slice(0, 10) : "-";
                    return (
                      <tr
                        key={a.id}
                        onClick={() => handleSelectAsset(a)}
                        className={`cursor-pointer transition border-b ${
                          isSelected ? "bg-blue-600/10 font-medium" : "hover:bg-black/5"
                        }`}
                      >
                        <td className="py-1 px-2 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {a.assetNo}
                        </td>
                        <td className="py-1 px-2 whitespace-nowrap">
                          <div className="inline-flex items-baseline gap-1.5">
                            <span className="font-semibold">{a.modelName}</span>
                            {a.modelCode && (
                              <span className="text-[10px] opacity-60 font-mono">({a.modelCode})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-1 px-2 font-mono opacity-80 whitespace-nowrap">
                          {a.serialNo || "-"}
                        </td>
                        <td className="py-1 px-2 text-center whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                              a.ownerType === "OWNED"
                                ? "bg-emerald-600/10 text-emerald-700 border-emerald-600/30"
                                : "bg-indigo-600/10 text-indigo-700 border-indigo-600/30"
                            }`}
                          >
                            {a.ownerType === "OWNED" ? "자사자산" : "외부임차"}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-center whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
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
                        <td className="py-1 px-2 whitespace-nowrap max-w-xs truncate">
                          {a.currentCustomer ? (
                            <div className="inline-flex items-baseline gap-1.5 truncate">
                              <span className="font-medium text-emerald-800 truncate">{a.currentCustomer}</span>
                              {a.currentSite && (
                                <span className="text-[10px] opacity-65 truncate">/ {a.currentSite}</span>
                              )}
                            </div>
                          ) : (
                            <span className="opacity-40">-</span>
                          )}
                        </td>
                        <td className="py-1 px-2 text-right font-mono opacity-80 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                          {a.acquisitionCost > 0 ? formatErpCurrency(a.acquisitionCost) : "-"}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-purple-800 whitespace-nowrap">
                          {a.bookValue > 0 ? formatErpCurrency(a.bookValue) : "₩0"}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {(a.cumulativeRevenue || 0) > 0 ? formatErpCurrency(a.cumulativeRevenue) : "₩0"}
                        </td>
                        <td className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap ${(a.cumulativeNetProfit || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                          {(a.cumulativeNetProfit || 0) >= 0
                            ? `+${formatErpCurrency(a.cumulativeNetProfit || 0)}`
                            : formatErpCurrency(a.cumulativeNetProfit || 0)}
                        </td>
                        <td className="py-1 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleSelectAsset(a)}
                              className="px-1.5 py-0.5 rounded border text-[10px] hover:bg-black/5"
                              title="상세 장부"
                            >
                              상세
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteAsset(a.id, a.assetNo)}
                                className="p-0.5 rounded text-rose-600 hover:bg-rose-500/10"
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

                {isEditingDossier ? (
                  <div className="p-2.5 rounded border flex flex-col gap-2 bg-purple-500/5 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">취득일자</label>
                        <input
                          type="date"
                          value={editForm.acquisitionDate ? String(editForm.acquisitionDate).slice(0, 10) : ""}
                          onChange={(e) => setEditForm({ ...editForm, acquisitionDate: e.target.value })}
                          className="h-7 px-2 border rounded text-xs font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">취득원가 (원)</label>
                        <input
                          type="number"
                          value={editForm.acquisitionCost ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, acquisitionCost: Number(e.target.value || 0) })}
                          className="h-7 px-2 border rounded text-xs font-mono text-right font-bold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">내용연수 (년)</label>
                        <input
                          type="number"
                          min={1}
                          value={editForm.usefulLifeYears ?? 4}
                          onChange={(e) => {
                            const yrs = Math.max(1, parseInt(e.target.value || "1", 10));
                            setEditForm({ ...editForm, usefulLifeYears: yrs, usefulLifeMonths: yrs * 12 });
                          }}
                          className="h-7 px-2 border rounded text-xs font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">내용월수 (개월)</label>
                        <input
                          type="number"
                          min={1}
                          value={editForm.usefulLifeMonths ?? (editForm.usefulLifeYears || 4) * 12}
                          onChange={(e) => {
                            const mos = Math.max(1, parseInt(e.target.value || "1", 10));
                            setEditForm({
                              ...editForm,
                              usefulLifeMonths: mos,
                              usefulLifeYears: Math.max(1, Math.ceil(mos / 12)),
                            });
                          }}
                          className="h-7 px-2 border rounded text-xs font-mono font-bold text-purple-700"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium">잔존가치 (원)</label>
                        <input
                          type="number"
                          min={0}
                          value={editForm.salvageValue ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, salvageValue: Number(e.target.value || 0) })}
                          className="h-7 px-2 border rounded text-xs font-mono text-right"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded border flex flex-col gap-1.5 font-mono text-[11px] bg-purple-500/5">
                    <div className="flex justify-between">
                      <span className="opacity-60">취득일자 / 내용월수</span>
                      <span>
                        {selectedAsset.acquisitionDate ? String(selectedAsset.acquisitionDate).slice(0, 10) : "-"} (
                        {(selectedAsset.usefulLifeMonths || selectedAsset.usefulLifeYears * 12) <= 1
                          ? "1개월 전액상각"
                          : `${selectedAsset.usefulLifeYears}년 / ${selectedAsset.usefulLifeMonths || selectedAsset.usefulLifeYears * 12}개월`}
                        )
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">취득원가</span>
                      <span className="font-bold">{formatErpCurrency(selectedAsset.acquisitionCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">잔존가치</span>
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
                      <span className="font-bold text-purple-800 font-mono">
                        {formatErpCurrency(selectedAsset.bookValue)}
                      </span>
                    </div>
                    <div className="border-t pt-1 mt-1 flex justify-between text-xs">
                      <span className="font-bold opacity-80">누적 렌탈매출 기여액</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {formatErpCurrency(selectedAsset.cumulativeRevenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold opacity-80">누적 순수익 (매출-상각)</span>
                      <span className={`font-bold font-mono ${(selectedAsset.cumulativeNetProfit || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                        {(selectedAsset.cumulativeNetProfit || 0) >= 0
                          ? `+${formatErpCurrency(selectedAsset.cumulativeNetProfit || 0)}`
                          : formatErpCurrency(selectedAsset.cumulativeNetProfit || 0)}
                      </span>
                    </div>
                  </div>
                )}
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

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">내용연수 (년)</label>
                  <input
                    type="number"
                    min={1}
                    value={addForm.usefulLifeYears}
                    onChange={(e) => {
                      const yrs = Math.max(1, parseInt(e.target.value || "1", 10));
                      setAddForm({
                        ...addForm,
                        usefulLifeYears: String(yrs),
                        usefulLifeMonths: String(yrs * 12),
                      });
                    }}
                    className="h-8 px-2.5 border rounded font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">내용월수 (개월)</label>
                  <input
                    type="number"
                    min={1}
                    value={addForm.usefulLifeMonths}
                    onChange={(e) => {
                      const mos = Math.max(1, parseInt(e.target.value || "1", 10));
                      setAddForm({
                        ...addForm,
                        usefulLifeMonths: String(mos),
                        usefulLifeYears: String(Math.max(1, Math.ceil(mos / 12))),
                      });
                    }}
                    className="h-8 px-2.5 border rounded font-mono font-bold text-purple-700"
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
