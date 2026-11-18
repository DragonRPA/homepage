"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { SortableTh, useErpTableSort } from "./SortableTh";
import { cleanErpNumber, formatErpNumber, sortErpItems, toErpInputString } from "@/lib/erpFormat";
import { matchHangulAny } from "@/lib/hangulSearch";
import { addMonthsMinusOneDay, formatAttachedOptionsSummary, type ForkliftWarrantyStatus, getKstTodayIso, normalizeAttachedOptions } from "@/lib/forkliftDomain";
import type {
  WarrantyAddFormState,
  WarrantyClaimFormState,
  WarrantyEditFormState,
  WarrantyRecord,
} from "./warranty/WarrantyDossierAndAddModal";

const WarrantyDossierAndAddModal = dynamic(
  () =>
    import("./warranty/WarrantyDossierAndAddModal").then(
      (m) => m.WarrantyDossierAndAddModal
    ),
  { ssr: false }
);

interface WarrantyManagementTabProps {
  currentUser?: { name?: string; role?: string };
}

const SOURCE_LABELS: Record<string, string> = {
  SALE: "완제품판매",
  RENTAL_ASSET: "렌탈자산",
  MANUAL: "수동등록",
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
  const [editForm, setEditForm] = useState<WarrantyEditFormState>({
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
  const [claimForm, setClaimForm] = useState<WarrantyClaimFormState>({
    claimDate: todayIso,
    claimType: "WARRANTY_FREE",
    claimHours: "0",
    claimSymptom: "",
    claimCausePart: "",
    claimResolution: "",
    claimRepairCost: "0",
    claimBilledAmount: "0",
    claimTechName: currentUser?.name || "",
    claimMemo: "",
  });

  // Manual Registration Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<WarrantyAddFormState>(() => ({
    assetId: "",
    partnerId: null,
    chassisNo: "",
    modelName: "",
    manufacturer: "두산",
    customerName: "",
    siteName: "",
    deliveryDate: todayIso,
    startDate: todayIso,
    months: "12",
    endDate: addMonthsMinusOneDay(todayIso, 12),
    warrantyHours: "2,000",
    operatingHours: "0",
    memo: "",
  }));

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
    setClaimForm((prev) => ({
      ...prev,
      claimHours: toErpInputString(w.currentOperatingHours || 0),
    }));
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

  const handleSelectAssetForAdd = (idVal: string) => {
    const asset = assets.find((a) => String(a.id) === idVal);
    if (!asset) {
      setAddForm((prev) => ({ ...prev, assetId: idVal }));
      return;
    }
    const start = asset.warrantyStartDate
      ? String(asset.warrantyStartDate).slice(0, 10)
      : asset.acquisitionDate
      ? String(asset.acquisitionDate).slice(0, 10)
      : todayIso;
    setAddForm((prev) => ({
      ...prev,
      assetId: idVal,
      chassisNo: asset.serialNo || prev.chassisNo || asset.assetNo || "",
      modelName: asset.modelName || prev.modelName,
      manufacturer: asset.manufacturer || prev.manufacturer,
      customerName: asset.currentCustomer || prev.customerName,
      siteName: asset.currentSite || prev.siteName,
      deliveryDate: asset.acquisitionDate ? String(asset.acquisitionDate).slice(0, 10) : prev.deliveryDate,
      startDate: start,
      endDate: asset.warrantyEndDate
        ? String(asset.warrantyEndDate).slice(0, 10)
        : addMonthsMinusOneDay(start, cleanErpNumber(prev.months) || 12),
      warrantyHours: asset.warrantyHours ? toErpInputString(asset.warrantyHours) : prev.warrantyHours,
      operatingHours:
        asset.operatingHours !== undefined ? toErpInputString(asset.operatingHours) : prev.operatingHours,
    }));
  };

  // Manual Register Submit
  const handleCreateWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.chassisNo.trim()) {
      showToast("차대번호는 필수 입력 항목입니다.", "error");
      return;
    }
    try {
      const selectedAsset = addForm.assetId ? assets.find((a) => String(a.id) === addForm.assetId) : null;
      const res = await fetch("/api/erp/warranties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chassisNo: addForm.chassisNo.trim(),
          sourceType: addForm.assetId ? "RENTAL_ASSET" : "MANUAL",
          assetId: addForm.assetId ? Number(addForm.assetId) : null,
          modelName: addForm.modelName.trim(),
          manufacturer: addForm.manufacturer.trim(),
          partnerId: addForm.partnerId,
          customerName: addForm.customerName.trim(),
          siteName: addForm.siteName.trim(),
          deliveryDate: addForm.deliveryDate || null,
          warrantyStartDate: addForm.startDate || todayIso,
          warrantyMonths: cleanErpNumber(addForm.months),
          warrantyEndDate:
            addForm.endDate ||
            addMonthsMinusOneDay(addForm.startDate || todayIso, cleanErpNumber(addForm.months) || 12),
          warrantyHours: cleanErpNumber(addForm.warrantyHours),
          currentOperatingHours: cleanErpNumber(addForm.operatingHours),
          attachedOptions: selectedAsset ? normalizeAttachedOptions(selectedAsset.attachedOptions) : [],
          memo: addForm.memo.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "보증 등록 실패");

      showToast(`차대번호 [${addForm.chassisNo.trim().toUpperCase()}] 보증 등록 완료`);
      setShowAddModal(false);
      setAddForm((prev) => ({
        ...prev,
        assetId: "",
        partnerId: null,
        chassisNo: "",
        modelName: "",
        customerName: "",
        siteName: "",
        operatingHours: "0",
        memo: "",
      }));
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
    if (!claimForm.claimSymptom.trim()) {
      showToast("증상 / 점검 내용은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/warranties/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warrantyId: selectedWarranty.id,
          claimDate: claimForm.claimDate,
          claimType: claimForm.claimType,
          operatingHours: cleanErpNumber(claimForm.claimHours),
          symptom: claimForm.claimSymptom.trim(),
          partsUsed: claimForm.claimCausePart.trim() ? [claimForm.claimCausePart.trim()] : [],
          resolution: claimForm.claimResolution.trim(),
          repairCost: cleanErpNumber(claimForm.claimRepairCost),
          billedAmount: cleanErpNumber(claimForm.claimBilledAmount),
          technicianName: claimForm.claimTechName.trim(),
          memo: claimForm.claimMemo.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "AS 클레임 등록 실패");
      showToast("AS 클레임 및 가동시간 이력이 반영되었습니다.");
      setShowClaimForm(false);
      setClaimForm((prev) => ({
        ...prev,
        claimSymptom: "",
        claimCausePart: "",
        claimResolution: "",
        claimRepairCost: "0",
        claimBilledAmount: "0",
        claimMemo: "",
      }));
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

        {/* Slide-Over Dossier & Manual Warranty Registration Modal (Lazy) */}
        {Boolean(selectedWarranty || showAddModal) && (
          <WarrantyDossierAndAddModal
            selectedWarranty={selectedWarranty}
            showAddModal={showAddModal}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            editForm={editForm}
            setEditForm={setEditForm}
            populateEditForm={populateEditForm}
            onCloseDossier={() => setSelectedId(null)}
            onSaveWarrantyEdit={handleSaveWarrantyEdit}
            onDeleteWarranty={handleDeleteWarranty}
            showClaimForm={showClaimForm}
            setShowClaimForm={setShowClaimForm}
            claimForm={claimForm}
            setClaimForm={setClaimForm}
            onAddClaim={handleAddClaim}
            onDeleteClaim={handleDeleteClaim}
            assets={assets}
            partners={partners}
            addForm={addForm}
            setAddForm={setAddForm}
            onSelectAssetForAdd={handleSelectAssetForAdd}
            onCreateWarranty={handleCreateWarranty}
            onCloseAddModal={() => setShowAddModal(false)}
            renderStatusBadge={renderStatusBadge}
            sourceLabels={SOURCE_LABELS}
          />
        )}
      </div>
    </div>
  );
}
