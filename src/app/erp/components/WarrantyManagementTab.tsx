"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  X,
  Save,
  Trash2,
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { SortableTh, useErpTableSort } from "./SortableTh";
import {
  addMonthsMinusOneDay,
  AttachedForkliftOption,
  cleanErpNumber,
  formatAttachedOptionsSummary,
  formatErpCurrency,
  formatErpInputNumber,
  formatErpNumber,
  ForkliftWarrantyStatus,
  getKstTodayIso,
  matchHangulAny,
  normalizeAttachedOptions,
  sortErpItems,
  SortDirection,
  toErpInputString,
} from "@/lib/erpFormat";
import { SearchSelectCombobox, SearchSelectOption } from "./SearchSelectCombobox";

interface WarrantyClaimItem {
  id: number;
  warrantyId: number;
  chassisNo: string;
  claimDate: string;
  operatingHours: number;
  claimType: "WARRANTY_FREE" | "PAID_REPAIR" | "INSPECTION" | string;
  symptom: string;
  resolution: string;
  partsUsed: string[];
  repairCost: number;
  billedAmount: number;
  technicianName: string;
  status: string;
  memo: string;
}

interface WarrantyRecord {
  id: number;
  warrantyNo: string;
  chassisNo: string;
  sourceType: "SALE" | "RENTAL_ASSET" | "MANUAL" | string;
  sourceId: number | null;
  assetId: number | null;
  assetNo: string | null;
  productId: number | null;
  modelName: string;
  manufacturer: string;
  partnerId: number | null;
  customerName: string;
  siteName: string;
  deliveryDate: string;
  warrantyStartDate: string;
  warrantyMonths: number;
  warrantyEndDate: string;
  warrantyHours: number;
  currentOperatingHours: number;
  attachedOptions: AttachedForkliftOption[];
  status: ForkliftWarrantyStatus;
  daysRemaining: number | null;
  hoursRemaining: number | null;
  triggerReason: string;
  claimCount: number;
  totalRepairCost: number;
  totalBilledAmount: number;
  memo: string;
  claims: WarrantyClaimItem[];
}

interface WarrantyManagementTabProps {
  currentUser?: { name?: string; role?: string };
}

const SOURCE_LABELS: Record<string, string> = {
  SALE: "완제품판매",
  RENTAL_ASSET: "렌탈자산",
  MANUAL: "수동등록",
};

const CLAIM_TYPE_LABELS: Record<string, string> = {
  WARRANTY_FREE: "무상보증 AS",
  PAID_REPAIR: "유상수리",
  INSPECTION: "정기점검",
};

export default function WarrantyManagementTab({ currentUser }: WarrantyManagementTabProps) {
  const todayIso = useMemo(() => getKstTodayIso(), []);
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Sorting
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "SALE" | "RENTAL_ASSET" | "MANUAL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ForkliftWarrantyStatus>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const { sortKey, sortDir, handleSort } = useErpTableSort("warrantyEndDate", "asc");

  // Slide-over Dossier State
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    chassisNo: "",
    modelName: "",
    manufacturer: "",
    customerName: "",
    siteName: "",
    deliveryDate: "",
    warrantyStartDate: "",
    warrantyMonths: "12",
    warrantyEndDate: "",
    warrantyHours: "2,000",
    currentOperatingHours: "0",
    memo: "",
  });

  // Inline AS Claim Form
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimDate, setClaimDate] = useState(todayIso);
  const [claimType, setClaimType] = useState<"WARRANTY_FREE" | "PAID_REPAIR" | "INSPECTION">("WARRANTY_FREE");
  const [claimHours, setClaimHours] = useState("0");
  const [claimSymptom, setClaimSymptom] = useState("");
  const [claimCausePart, setClaimCausePart] = useState("");
  const [claimResolution, setClaimResolution] = useState("");
  const [claimRepairCost, setClaimRepairCost] = useState("0");
  const [claimBilledAmount, setClaimBilledAmount] = useState("0");
  const [claimTechName, setClaimTechName] = useState(currentUser?.name || "");
  const [claimMemo, setClaimMemo] = useState("");

  // Manual Registration Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAssetId, setAddAssetId] = useState("");
  const [addPartnerId, setAddPartnerId] = useState<number | null>(null);
  const [addChassisNo, setAddChassisNo] = useState("");
  const [addModelName, setAddModelName] = useState("");
  const [addManufacturer, setAddManufacturer] = useState("두산");
  const [addCustomerName, setAddCustomerName] = useState("");
  const [addSiteName, setAddSiteName] = useState("");
  const [addDeliveryDate, setAddDeliveryDate] = useState(todayIso);
  const [addStartDate, setAddStartDate] = useState(todayIso);
  const [addMonths, setAddMonths] = useState("12");
  const [addEndDate, setAddEndDate] = useState(() => addMonthsMinusOneDay(todayIso, 12));
  const [addWarrantyHours, setAddWarrantyHours] = useState("2,000");
  const [addOperatingHours, setAddOperatingHours] = useState("0");
  const [addMemo, setAddMemo] = useState("");

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [wRes, aRes, pRes] = await Promise.all([
        fetch("/api/erp/warranties", { cache: "no-store" }),
        fetch("/api/erp/assets", { cache: "no-store" }).catch(() => null),
        fetch("/api/erp/partners?type=ALL", { cache: "no-store" }).catch(() => null),
      ]);
      const wData = await wRes.json();
      if (!wRes.ok || !wData.success) throw new Error(wData.error || "보증 목록 조회 실패");
      setWarranties(wData.warranties || []);

      const aData = aRes ? await aRes.json().catch(() => null) : null;
      if (aData?.success) setAssets(aData.assets || []);

      const pData = pRes ? await pRes.json().catch(() => null) : null;
      if (pData?.success) setPartners(pData.partners || []);
    } catch (err: any) {
      showToast(err.message || "데이터 로드 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const selectedWarranty = useMemo(() => {
    if (!selectedId) return null;
    return warranties.find((w) => w.id === selectedId) || null;
  }, [warranties, selectedId]);

  const populateEditForm = (w: WarrantyRecord) => {
    setEditForm({
      chassisNo: w.chassisNo || "",
      modelName: w.modelName || "",
      manufacturer: w.manufacturer || "",
      customerName: w.customerName || "",
      siteName: w.siteName || "",
      deliveryDate: w.deliveryDate || "",
      warrantyStartDate: w.warrantyStartDate || "",
      warrantyMonths: toErpInputString(w.warrantyMonths ?? 12),
      warrantyEndDate: w.warrantyEndDate || "",
      warrantyHours: toErpInputString(w.warrantyHours ?? 2000),
      currentOperatingHours: toErpInputString(w.currentOperatingHours || 0),
      memo: w.memo || "",
    });
  };

  const handleSelectWarranty = (w: WarrantyRecord) => {
    setSelectedId(w.id);
    setIsEditing(false);
    setShowClaimForm(false);
    populateEditForm(w);
    setClaimHours(toErpInputString(w.currentOperatingHours || 0));
  };

  // KPIs
  const kpiStats = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;
    let claimCount = 0;
    for (const w of warranties) {
      if (w.status === "ACTIVE") active++;
      else if (w.status === "EXPIRING") expiring++;
      else expired++;
      claimCount += Number(w.claimCount || 0);
    }
    return { total: warranties.length, active, expiring, expired, claimCount };
  }, [warranties]);

  // Filtered & Sorted list
  const sortedWarranties = useMemo(() => {
    const filtered = warranties.filter((w) => {
      if (sourceFilter !== "ALL" && w.sourceType !== sourceFilter) return false;
      if (statusFilter !== "ALL" && w.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        return matchHangulAny(
          [
            w.chassisNo,
            w.warrantyNo,
            w.modelName,
            w.manufacturer,
            w.customerName,
            w.siteName,
            w.assetNo,
          ],
          searchTerm
        );
      }
      return true;
    });
    return sortErpItems(filtered, sortKey, sortDir);
  }, [warranties, sourceFilter, statusFilter, searchTerm, sortKey, sortDir]);

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => (
    <SortableTh
      label={label}
      colKey={key}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={handleSort}
      align={align}
      className="py-2 px-2.5 hover:bg-black/5"
      iconClassName="w-3 h-3 text-[#1d4ed8]"
    />
  );

  // Combobox options for Manual Modal
  const assetOptions = useMemo<SearchSelectOption[]>(() => {
    return assets.map((a) => ({
      value: String(a.id),
      label: `[${a.assetNo}] ${a.modelName} ${a.serialNo ? `(차대: ${a.serialNo})` : ""}`,
      subLabel: `${a.manufacturer || "-"} · 가동 ${formatErpNumber(a.operatingHours || 0)}hr · ${a.currentCustomer || "미배치"}`,
      searchKeywords: [a.assetNo, a.serialNo, a.modelName, a.manufacturer, a.currentCustomer],
    }));
  }, [assets]);

  const partnerOptions = useMemo<SearchSelectOption[]>(() => {
    return partners.map((p) => ({
      value: String(p.id),
      label: p.name,
      subLabel: p.businessNo || p.ceoName || undefined,
      searchKeywords: [p.name, p.businessNo, p.ceoName],
    }));
  }, [partners]);

  const handleSelectAssetForAdd = (idVal: string) => {
    setAddAssetId(idVal);
    const asset = assets.find((a) => String(a.id) === idVal);
    if (!asset) return;
    if (asset.serialNo) setAddChassisNo(asset.serialNo);
    else if (!addChassisNo) setAddChassisNo(asset.assetNo || "");
    if (asset.modelName) setAddModelName(asset.modelName);
    if (asset.manufacturer) setAddManufacturer(asset.manufacturer);
    if (asset.currentCustomer) setAddCustomerName(asset.currentCustomer);
    if (asset.currentSite) setAddSiteName(asset.currentSite);
    if (asset.acquisitionDate) setAddDeliveryDate(String(asset.acquisitionDate).slice(0, 10));
    const start = asset.warrantyStartDate
      ? String(asset.warrantyStartDate).slice(0, 10)
      : asset.acquisitionDate
      ? String(asset.acquisitionDate).slice(0, 10)
      : todayIso;
    setAddStartDate(start);
    if (asset.warrantyEndDate) {
      setAddEndDate(String(asset.warrantyEndDate).slice(0, 10));
    } else {
      setAddEndDate(addMonthsMinusOneDay(start, cleanErpNumber(addMonths) || 12));
    }
    if (asset.warrantyHours) setAddWarrantyHours(toErpInputString(asset.warrantyHours));
    if (asset.operatingHours !== undefined) setAddOperatingHours(toErpInputString(asset.operatingHours));
  };

  // Manual Register Submit
  const handleCreateWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addChassisNo.trim()) {
      showToast("차대번호는 필수 입력 항목입니다.", "error");
      return;
    }
    try {
      const selectedAsset = addAssetId ? assets.find((a) => String(a.id) === addAssetId) : null;
      const res = await fetch("/api/erp/warranties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chassisNo: addChassisNo.trim(),
          sourceType: addAssetId ? "RENTAL_ASSET" : "MANUAL",
          assetId: addAssetId ? Number(addAssetId) : null,
          modelName: addModelName.trim(),
          manufacturer: addManufacturer.trim(),
          partnerId: addPartnerId,
          customerName: addCustomerName.trim(),
          siteName: addSiteName.trim(),
          deliveryDate: addDeliveryDate || null,
          warrantyStartDate: addStartDate || todayIso,
          warrantyMonths: cleanErpNumber(addMonths),
          warrantyEndDate: addEndDate || addMonthsMinusOneDay(addStartDate || todayIso, cleanErpNumber(addMonths) || 12),
          warrantyHours: cleanErpNumber(addWarrantyHours),
          currentOperatingHours: cleanErpNumber(addOperatingHours),
          attachedOptions: selectedAsset ? normalizeAttachedOptions(selectedAsset.attachedOptions) : [],
          memo: addMemo.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "보증 등록 실패");

      showToast(`차대번호 [${addChassisNo.trim().toUpperCase()}] 보증 등록 완료`);
      setShowAddModal(false);
      setAddAssetId("");
      setAddPartnerId(null);
      setAddChassisNo("");
      setAddModelName("");
      setAddCustomerName("");
      setAddSiteName("");
      setAddOperatingHours("0");
      setAddMemo("");
      await fetchAll();
      if (data.warrantyId) setSelectedId(data.warrantyId);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Save Dossier Edit
  const handleSaveWarrantyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty) return;
    try {
      const res = await fetch("/api/erp/warranties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedWarranty.id,
          chassisNo: editForm.chassisNo.trim(),
          modelName: editForm.modelName.trim(),
          manufacturer: editForm.manufacturer.trim(),
          customerName: editForm.customerName.trim(),
          siteName: editForm.siteName.trim(),
          deliveryDate: editForm.deliveryDate || null,
          warrantyStartDate: editForm.warrantyStartDate,
          warrantyMonths: cleanErpNumber(editForm.warrantyMonths),
          warrantyEndDate: editForm.warrantyEndDate,
          warrantyHours: cleanErpNumber(editForm.warrantyHours),
          currentOperatingHours: cleanErpNumber(editForm.currentOperatingHours),
          memo: editForm.memo.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "보증 수정 실패");
      showToast("보증 카드 정보가 갱신되었습니다.");
      setIsEditing(false);
      await fetchAll();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteWarranty = async () => {
    if (!selectedWarranty) return;
    if (!window.confirm(`차대번호 [${selectedWarranty.chassisNo}] 보증 카드를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/erp/warranties?id=${selectedWarranty.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "보증 삭제 실패");
      showToast("보증 카드가 삭제되었습니다.");
      setSelectedId(null);
      await fetchAll();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Claim Submit
  const handleAddClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty) return;
    if (!claimSymptom.trim()) {
      showToast("증상 / 점검 내용은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/warranties/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warrantyId: selectedWarranty.id,
          claimDate,
          claimType,
          operatingHours: cleanErpNumber(claimHours),
          symptom: claimSymptom.trim(),
          partsUsed: claimCausePart.trim() ? [claimCausePart.trim()] : [],
          resolution: claimResolution.trim(),
          repairCost: cleanErpNumber(claimRepairCost),
          billedAmount: cleanErpNumber(claimBilledAmount),
          technicianName: claimTechName.trim(),
          memo: claimMemo.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "AS 클레임 등록 실패");
      showToast("AS 클레임 및 가동시간 이력이 반영되었습니다.");
      setShowClaimForm(false);
      setClaimSymptom("");
      setClaimCausePart("");
      setClaimResolution("");
      setClaimRepairCost("0");
      setClaimBilledAmount("0");
      setClaimMemo("");
      await fetchAll();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteClaim = async (claimId: number) => {
    if (!window.confirm("해당 AS 클레임 이력을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/erp/warranties/claims?id=${claimId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "AS 이력 삭제 실패");
      showToast("AS 이력이 삭제되었습니다.");
      await fetchAll();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const renderStatusBadge = (status: ForkliftWarrantyStatus) => {
    if (status === "ACTIVE") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-emerald-600/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3" />
          <span>보증유효</span>
        </span>
      );
    }
    if (status === "EXPIRING") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-600/35 bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-bold whitespace-nowrap">
          <AlertTriangle className="w-3 h-3" />
          <span>만료임박</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-rose-600/35 bg-rose-500/15 text-rose-800 dark:text-rose-300 text-[10px] font-bold whitespace-nowrap">
        <XCircle className="w-3 h-3" />
        <span>보증만료</span>
      </span>
    );
  };

  const inputCls =
    "h-8 px-2.5 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs";

  return (
    <div className="flex flex-col gap-3 h-full text-[#0f172a] dark:text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded shadow-lg text-xs font-bold border ${
            toast.type === "error"
              ? "bg-rose-700 text-white border-rose-900"
              : "bg-emerald-700 text-white border-emerald-900"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Header & KPI Bar (Z-Pattern Top) */}
      <div className="flex items-start justify-between gap-3 flex-wrap bg-[#f4efe4] border border-[#b5a894] rounded p-3 dark:bg-slate-900 dark:border-slate-800">
        {/* ① Top-Left: Scope Filters */}
        <div className="flex flex-col gap-2 flex-1 min-w-[300px]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1d4ed8] shrink-0" />
            <h2 className="text-sm font-bold whitespace-nowrap">차대번호 보증 대장</h2>
            <span className="text-[11px] font-mono text-[#57534e] dark:text-slate-400 whitespace-nowrap">
              기준일 {todayIso}
            </span>
          </div>

          <div className="flex items-end gap-2.5 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                등록 출처
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                {(
                  [
                    { value: "ALL", label: "전체" },
                    { value: "SALE", label: "완제품판매" },
                    { value: "RENTAL_ASSET", label: "렌탈자산" },
                    { value: "MANUAL", label: "수동등록" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSourceFilter(item.value)}
                    className={`h-7 px-2 rounded border text-[11px] font-semibold whitespace-nowrap transition ${
                      sourceFilter === item.value
                        ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                        : "bg-[#ebe5d8] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                보증상태
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                {(
                  [
                    { value: "ALL", label: "전체" },
                    { value: "ACTIVE", label: "보증유효" },
                    { value: "EXPIRING", label: "만료임박" },
                    { value: "EXPIRED", label: "보증만료" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStatusFilter(item.value)}
                    className={`h-7 px-2 rounded border text-[11px] font-semibold whitespace-nowrap transition ${
                      statusFilter === item.value
                        ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                        : "bg-[#ebe5d8] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                차대번호·모델·수요처 검색
              </label>
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-[#57534e] absolute left-2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="초성·차대번호·현장명"
                  className="h-7 w-52 pl-7 pr-6 bg-[#ebe5d8] border border-[#b5a894] rounded text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-1.5 text-[#57534e] hover:text-[#0f172a]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ② Top-Right: KPI Chips & Pipeline Actions */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-1 rounded bg-[#ebe5d8] border border-[#b5a894] text-[11px] font-semibold whitespace-nowrap dark:bg-slate-800 dark:border-slate-700">
              전체 {formatErpNumber(kpiStats.total)}대
            </span>
            <span className="px-2 py-1 rounded bg-emerald-500/15 border border-emerald-600/30 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold whitespace-nowrap">
              보증유효 {formatErpNumber(kpiStats.active)}
            </span>
            <span className="px-2 py-1 rounded bg-amber-500/15 border border-amber-600/35 text-amber-800 dark:text-amber-300 text-[11px] font-bold whitespace-nowrap">
              만료임박 {formatErpNumber(kpiStats.expiring)}
            </span>
            <span className="px-2 py-1 rounded bg-rose-500/15 border border-rose-600/35 text-rose-800 dark:text-rose-300 text-[11px] font-bold whitespace-nowrap">
              보증만료 {formatErpNumber(kpiStats.expired)}
            </span>
            <span className="px-2 py-1 rounded bg-[#ebe5d8] border border-[#b5a894] text-[11px] font-semibold whitespace-nowrap dark:bg-slate-800 dark:border-slate-700">
              AS이력 {formatErpNumber(kpiStats.claimCount)}건
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAll}
              className="h-8 px-2.5 rounded bg-[#ebe5d8] hover:bg-[#e2dbcd] border border-[#b5a894] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap dark:bg-slate-800 dark:border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>새로고침</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="h-8 px-3 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>보증 수동등록</span>
            </button>
          </div>
        </div>
      </div>

      {/* ③ Center High-Density Inspection Grid + Slide-Over Dossier */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        <div className="flex-1 bg-[#f4efe4] border border-[#b5a894] rounded overflow-auto dark:bg-slate-900 dark:border-slate-800">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] border-b border-[#b5a894] sticky top-0 z-10 font-semibold dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800">
              <tr>
                <th className="py-2 px-2.5 text-center sticky left-0 bg-[#e2dbcd] dark:bg-slate-950 z-10 border-r border-[#b5a894] dark:border-slate-800">
                  상세
                </th>
                {renderSortTh("보증상태", "status", "center")}
                {renderSortTh("차대번호", "chassisNo")}
                {renderSortTh("출처", "sourceType")}
                {renderSortTh("모델명 / 제조사", "modelName")}
                {renderSortTh("수요처 / 현장", "customerName")}
                {renderSortTh("보증기간", "warrantyEndDate")}
                {renderSortTh("잔여일수", "daysRemaining", "right")}
                {renderSortTh("가동시간 / 한도", "currentOperatingHours", "right")}
                <th className="py-2 px-2.5 text-left">부착옵션</th>
                {renderSortTh("AS클레임", "claimCount", "right")}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
              {sortedWarranties.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-[#57534e] dark:text-slate-400">
                    {loading ? "보증 대장을 불러오는 중입니다." : "조건에 해당하는 차대번호 보증 내역이 없습니다."}
                  </td>
                </tr>
              ) : (
                sortedWarranties.map((w) => {
                  const isSel = selectedWarranty?.id === w.id;
                  const opts = normalizeAttachedOptions(w.attachedOptions);
                  const dDay = w.daysRemaining;
                  return (
                    <tr
                      key={w.id}
                      onClick={() => handleSelectWarranty(w)}
                      className={`cursor-pointer transition ${
                        isSel
                          ? "bg-blue-600/10 font-medium"
                          : "hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <td className="py-1.5 px-2.5 text-center sticky left-0 bg-[#f4efe4] dark:bg-slate-900 border-r border-[#b5a894] dark:border-slate-800">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectWarranty(w);
                          }}
                          className="px-2 py-0.5 rounded bg-[#ebe5d8] hover:bg-[#e2dbcd] border border-[#b5a894] text-[11px] font-bold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                        >
                          상세
                        </button>
                      </td>
                      <td className="py-1.5 px-2.5 text-center">{renderStatusBadge(w.status)}</td>
                      <td className="py-1.5 px-2.5 font-mono font-bold text-[#1d4ed8] dark:text-blue-400">
                        {w.chassisNo}
                      </td>
                      <td className="py-1.5 px-2.5">
                        <div className="inline-flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-[#ebe5d8] border border-[#b5a894] text-[10px] font-semibold dark:bg-slate-800 dark:border-slate-700">
                            {SOURCE_LABELS[w.sourceType] || w.sourceType}
                          </span>
                          {w.assetNo && (
                            <span className="font-mono text-[10px] text-[#57534e] dark:text-slate-400">
                              {w.assetNo}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span className="font-semibold">{w.modelName || "-"}</span>
                        {w.manufacturer && (
                          <span className="ml-1.5 text-[11px] text-[#57534e] dark:text-slate-400">
                            ({w.manufacturer})
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span className="font-semibold">{w.customerName || "-"}</span>
                        {w.siteName && (
                          <span className="ml-1 text-[11px] text-[#57534e] dark:text-slate-400">
                            / {w.siteName}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono">
                        {w.warrantyStartDate || "-"} ~ {w.warrantyEndDate || "-"}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold">
                        {dDay === null ? (
                          "-"
                        ) : dDay >= 0 ? (
                          <span className={dDay <= 30 ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-400"}>
                            D-{formatErpNumber(dDay)}
                          </span>
                        ) : (
                          <span className="text-rose-700 dark:text-rose-400">
                            경과 +{formatErpNumber(Math.abs(dDay))}일
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono">
                        <span>{formatErpNumber(w.currentOperatingHours || 0)}</span>
                        <span className="text-[#57534e] dark:text-slate-400">
                          {" "}
                          / {w.warrantyHours > 0 ? `${formatErpNumber(w.warrantyHours)} hr` : "무제한"}
                        </span>
                        {w.hoursRemaining !== null && w.warrantyHours > 0 && (
                          <div className="text-[10px] text-[#57534e] dark:text-slate-400">
                            잔여 {formatErpNumber(w.hoursRemaining)} hr
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5">
                        {opts.length > 0 ? (
                          <span
                            className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 text-[10px] font-bold"
                            title={formatAttachedOptionsSummary(opts)}
                          >
                            옵션 {opts.length}종
                          </span>
                        ) : (
                          <span className="text-[#78716c]">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono">
                        <span className={w.claimCount > 0 ? "font-bold text-[#1d4ed8]" : "text-[#78716c]"}>
                          {formatErpNumber(w.claimCount)}건
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Slide-Over Dossier */}
        {selectedWarranty && (
          <aside className="w-[460px] shrink-0 bg-[#f4efe4] border border-[#b5a894] rounded flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            {/* Dossier Header */}
            <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] flex items-center justify-between gap-2 dark:bg-slate-950 dark:border-slate-800">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-[#1d4ed8] truncate">
                    {selectedWarranty.chassisNo}
                  </span>
                  {renderStatusBadge(selectedWarranty.status)}
                </div>
                <span className="text-[11px] text-[#57534e] dark:text-slate-400 truncate">
                  {selectedWarranty.modelName || "-"} · {selectedWarranty.warrantyNo}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      populateEditForm(selectedWarranty);
                      setIsEditing(true);
                    }}
                    className="h-7 px-2 rounded bg-[#ebe5d8] hover:bg-[#dcd4c4] border border-[#b5a894] text-[11px] font-bold"
                  >
                    수정
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeleteWarranty}
                  className="h-7 px-2 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-600/35 text-rose-800 dark:text-rose-300 text-[11px] font-bold"
                >
                  삭제
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="p-1 rounded hover:bg-black/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 text-xs">
              {isEditing ? (
                <form onSubmit={handleSaveWarrantyEdit} className="flex flex-col gap-2.5 p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70 dark:bg-slate-800/40 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">차대번호 *</label>
                      <input
                        type="text"
                        required
                        value={editForm.chassisNo}
                        onChange={(e) => setEditForm({ ...editForm, chassisNo: e.target.value })}
                        className={`${inputCls} font-mono font-bold`}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">모델명</label>
                      <input
                        type="text"
                        value={editForm.modelName}
                        onChange={(e) => setEditForm({ ...editForm, modelName: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">제조사</label>
                      <input
                        type="text"
                        value={editForm.manufacturer}
                        onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">납품/출고일</label>
                      <input
                        type="date"
                        value={editForm.deliveryDate}
                        onChange={(e) => setEditForm({ ...editForm, deliveryDate: e.target.value })}
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">고객사</label>
                      <input
                        type="text"
                        value={editForm.customerName}
                        onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">현장명</label>
                      <input
                        type="text"
                        value={editForm.siteName}
                        onChange={(e) => setEditForm({ ...editForm, siteName: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">보증 시작일</label>
                      <input
                        type="date"
                        value={editForm.warrantyStartDate}
                        onChange={(e) => {
                          const s = e.target.value;
                          const m = cleanErpNumber(editForm.warrantyMonths) || 12;
                          setEditForm({
                            ...editForm,
                            warrantyStartDate: s,
                            warrantyEndDate: s ? addMonthsMinusOneDay(s, m) : editForm.warrantyEndDate,
                          });
                        }}
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">보증 기간 (개월)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editForm.warrantyMonths}
                        onChange={(e) => {
                          const val = formatErpInputNumber(e.target.value);
                          const m = cleanErpNumber(val);
                          setEditForm({
                            ...editForm,
                            warrantyMonths: val,
                            warrantyEndDate:
                              editForm.warrantyStartDate && m > 0
                                ? addMonthsMinusOneDay(editForm.warrantyStartDate, m)
                                : editForm.warrantyEndDate,
                          });
                        }}
                        className={`${inputCls} font-mono text-right`}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">보증 만료일</label>
                      <input
                        type="date"
                        value={editForm.warrantyEndDate}
                        onChange={(e) => setEditForm({ ...editForm, warrantyEndDate: e.target.value })}
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">보증 가동시간 한도 (hr)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editForm.warrantyHours}
                        onChange={(e) =>
                          setEditForm({ ...editForm, warrantyHours: formatErpInputNumber(e.target.value) })
                        }
                        className={`${inputCls} font-mono text-right`}
                      />
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[11px] font-semibold">현재 누적 가동시간 (hr)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editForm.currentOperatingHours}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            currentOperatingHours: formatErpInputNumber(e.target.value),
                          })
                        }
                        className={`${inputCls} font-mono text-right font-bold`}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">메모</label>
                    <textarea
                      rows={2}
                      value={editForm.memo}
                      onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                      className="p-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="h-7 px-3 rounded border border-[#b5a894] bg-[#f4efe4] text-xs font-semibold"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="h-7 px-3 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>저장</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70 dark:bg-slate-800/40 dark:border-slate-700 flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#57534e] dark:text-slate-400">출처 / 연결자산</span>
                    <span className="font-semibold">
                      {SOURCE_LABELS[selectedWarranty.sourceType] || selectedWarranty.sourceType}
                      {selectedWarranty.assetNo ? ` (${selectedWarranty.assetNo})` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534e] dark:text-slate-400">수요처 / 현장</span>
                    <span className="font-semibold">
                      {selectedWarranty.customerName || "-"}
                      {selectedWarranty.siteName ? ` / ${selectedWarranty.siteName}` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534e] dark:text-slate-400">납품·출고일</span>
                    <span className="font-mono">{selectedWarranty.deliveryDate || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534e] dark:text-slate-400">보증기간</span>
                    <span className="font-mono font-bold">
                      {selectedWarranty.warrantyStartDate} ~ {selectedWarranty.warrantyEndDate} (
                      {selectedWarranty.warrantyMonths}개월)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534e] dark:text-slate-400">가동시간 / 한도</span>
                    <span className="font-mono font-bold">
                      {formatErpNumber(selectedWarranty.currentOperatingHours)} /{" "}
                      {formatErpNumber(selectedWarranty.warrantyHours)} hr
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534e] dark:text-slate-400">판정 사유</span>
                    <span className="font-semibold text-[#334155] dark:text-slate-300">
                      {selectedWarranty.triggerReason}
                    </span>
                  </div>
                  {selectedWarranty.attachedOptions.length > 0 && (
                    <div className="pt-1 border-t border-[#b5a894]/70 flex flex-col gap-1">
                      <span className="text-[#57534e] dark:text-slate-400">장착 부착옵션</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedWarranty.attachedOptions.map((opt, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 text-[10px] font-semibold"
                          >
                            {opt.optionName} ×{opt.qty}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedWarranty.memo && (
                    <div className="pt-1 border-t border-[#b5a894]/70 text-[#334155] dark:text-slate-300">
                      {selectedWarranty.memo}
                    </div>
                  )}
                </div>
              )}

              {/* AS / Periodic Check Claims Section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Wrench className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    <span>AS·정비 클레임 이력 ({selectedWarranty.claims.length}건)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setClaimHours(toErpInputString(selectedWarranty.currentOperatingHours || 0));
                      setShowClaimForm((prev) => !prev);
                    }}
                    className="h-7 px-2.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>클레임 등록</span>
                  </button>
                </div>

                {showClaimForm && (
                  <form
                    onSubmit={handleAddClaim}
                    className="p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8] dark:bg-slate-800/70 dark:border-slate-700 flex flex-col gap-2"
                  >
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold">접수일</label>
                        <input
                          type="date"
                          value={claimDate}
                          onChange={(e) => setClaimDate(e.target.value)}
                          className={`${inputCls} font-mono`}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold">구분</label>
                        <select
                          value={claimType}
                          onChange={(e) => setClaimType(e.target.value as any)}
                          className={inputCls}
                        >
                          <option value="WARRANTY_FREE">무상보증 AS</option>
                          <option value="PAID_REPAIR">유상수리</option>
                          <option value="INSPECTION">정기점검</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold">가동시간 (hr)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={claimHours}
                          onChange={(e) => setClaimHours(formatErpInputNumber(e.target.value))}
                          className={`${inputCls} font-mono text-right font-bold`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">증상 / 점검내용 *</label>
                      <input
                        type="text"
                        required
                        value={claimSymptom}
                        onChange={(e) => setClaimSymptom(e.target.value)}
                        placeholder="예: 마스트 상승 실린더 누유 점검"
                        className={inputCls}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold">원인부품 / 사용부품</label>
                        <input
                          type="text"
                          value={claimCausePart}
                          onChange={(e) => setClaimCausePart(e.target.value)}
                          placeholder="예: 씰키트"
                          className={inputCls}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold">담당 기사</label>
                        <input
                          type="text"
                          value={claimTechName}
                          onChange={(e) => setClaimTechName(e.target.value)}
                          placeholder="담당자 성명"
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">조치 내역</label>
                      <input
                        type="text"
                        value={claimResolution}
                        onChange={(e) => setClaimResolution(e.target.value)}
                        placeholder="예: 씰키트 교체 및 작동 시험 완료"
                        className={inputCls}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold">투입원가 (원)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={claimRepairCost}
                          onChange={(e) => setClaimRepairCost(formatErpInputNumber(e.target.value))}
                          className={`${inputCls} font-mono text-right`}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold">고객청구액 (원)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={claimBilledAmount}
                          onChange={(e) => setClaimBilledAmount(formatErpInputNumber(e.target.value))}
                          className={`${inputCls} font-mono text-right`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowClaimForm(false)}
                        className="h-7 px-2.5 rounded border border-[#b5a894] bg-[#f4efe4] text-[11px] font-semibold"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="h-7 px-3 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold"
                      >
                        AS 이력 저장
                      </button>
                    </div>
                  </form>
                )}

                {selectedWarranty.claims.length === 0 ? (
                  <div className="py-6 text-center rounded border border-dashed border-[#b5a894] text-[#57534e] dark:text-slate-400">
                    등록된 AS 클레임 이력이 없습니다.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {selectedWarranty.claims.map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70 dark:bg-slate-800/50 dark:border-slate-700 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold">{c.claimDate}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#e2dbcd] border border-[#b5a894] text-[10px] font-bold dark:bg-slate-700">
                              {CLAIM_TYPE_LABELS[c.claimType] || c.claimType}
                            </span>
                            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-[#57534e] dark:text-slate-400">
                              <Clock className="w-3 h-3" />
                              {formatErpNumber(c.operatingHours)}hr
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteClaim(c.id)}
                            className="text-rose-700 hover:text-rose-600 p-0.5"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="font-semibold">{c.symptom}</div>
                        {c.resolution && (
                          <div className="text-[11px] text-[#334155] dark:text-slate-300">
                            조치: {c.resolution}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-[#57534e] dark:text-slate-400 pt-0.5">
                          <span>
                            {Array.isArray(c.partsUsed) && c.partsUsed.length > 0
                              ? `부품: ${c.partsUsed.join(", ")}`
                              : ""}
                            {c.technicianName ? ` · 담당: ${c.technicianName}` : ""}
                          </span>
                          <span className="font-mono">
                            원가 {formatErpCurrency(c.repairCost)} / 청구 {formatErpCurrency(c.billedAmount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Modal: Manual Warranty Registration */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded border border-[#b5a894] bg-[#f4efe4] text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#1d4ed8]" />
                <span>차대번호 보증 수동등록</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#57534e] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWarranty} className="mt-4 flex flex-col gap-3 text-xs">
              <SearchSelectCombobox
                label="기존 렌탈자산 연동 선택 (선택)"
                showChosungBar
                size="sm"
                value={addAssetId}
                options={assetOptions}
                onChange={handleSelectAssetForAdd}
                placeholder="자산번호·차대번호·모델명으로 검색 시 자동입력"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">차대번호 *</label>
                  <input
                    type="text"
                    required
                    value={addChassisNo}
                    onChange={(e) => setAddChassisNo(e.target.value)}
                    placeholder="예: FBC-2026-001"
                    className={`${inputCls} font-mono font-bold`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">모델명</label>
                  <input
                    type="text"
                    value={addModelName}
                    onChange={(e) => setAddModelName(e.target.value)}
                    placeholder="예: D30S-9"
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">제조사</label>
                  <input
                    type="text"
                    value={addManufacturer}
                    onChange={(e) => setAddManufacturer(e.target.value)}
                    placeholder="두산 / 현대"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <SearchSelectCombobox
                  label="수요처 (고객사)"
                  allowFreeText
                  showChosungBar
                  size="sm"
                  value={addPartnerId ? String(addPartnerId) : ""}
                  freeTextValue={addCustomerName}
                  onFreeTextChange={(txt) => {
                    setAddCustomerName(txt);
                    setAddPartnerId(null);
                  }}
                  onChange={(val) => {
                    if (!val) {
                      setAddPartnerId(null);
                      setAddCustomerName("");
                      return;
                    }
                    const found = partners.find((p) => String(p.id) === val);
                    if (found) {
                      setAddPartnerId(found.id);
                      setAddCustomerName(found.name);
                    }
                  }}
                  options={partnerOptions}
                  placeholder="고객사 검색 또는 직접 입력"
                />
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">현장명</label>
                  <input
                    type="text"
                    value={addSiteName}
                    onChange={(e) => setAddSiteName(e.target.value)}
                    placeholder="가동 현장명"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70 dark:bg-slate-800/40 dark:border-slate-700">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">납품·출고일</label>
                  <input
                    type="date"
                    value={addDeliveryDate}
                    onChange={(e) => setAddDeliveryDate(e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">보증 시작일</label>
                  <input
                    type="date"
                    value={addStartDate}
                    onChange={(e) => {
                      const s = e.target.value;
                      setAddStartDate(s);
                      const m = cleanErpNumber(addMonths);
                      if (s && m > 0) setAddEndDate(addMonthsMinusOneDay(s, m));
                    }}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">보증 기간 (개월)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={addMonths}
                    onChange={(e) => {
                      const val = formatErpInputNumber(e.target.value);
                      setAddMonths(val);
                      const m = cleanErpNumber(val);
                      if (addStartDate && m > 0) setAddEndDate(addMonthsMinusOneDay(addStartDate, m));
                    }}
                    className={`${inputCls} font-mono text-right`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">보증 만료일</label>
                  <input
                    type="date"
                    value={addEndDate}
                    onChange={(e) => setAddEndDate(e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[11px] font-semibold">보증 가동시간 한도 (hr)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={addWarrantyHours}
                    onChange={(e) => setAddWarrantyHours(formatErpInputNumber(e.target.value))}
                    className={`${inputCls} font-mono text-right font-bold`}
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[11px] font-semibold">현재 가동시간 (hr)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={addOperatingHours}
                    onChange={(e) => setAddOperatingHours(formatErpInputNumber(e.target.value))}
                    className={`${inputCls} font-mono text-right font-bold`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold">메모</label>
                <textarea
                  rows={2}
                  value={addMemo}
                  onChange={(e) => setAddMemo(e.target.value)}
                  className="p-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#b5a894] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-8 px-3 rounded border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] text-xs font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold"
                >
                  보증 등록 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
