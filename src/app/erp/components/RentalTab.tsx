"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Truck, Plus, Calendar, RefreshCw, FileText, CheckCircle2, 
  RotateCcw, DollarSign, Layers, Search, Wrench, ShieldCheck, X,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { formatErpNumber, formatErpCurrency, formatErpQty, sortErpItems, SortDirection } from "@/lib/erpFormat";

interface RentalTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onNavigateToTax?: () => void;
}

export const RentalTab: React.FC<RentalTabProps> = ({ currentUser, selectedEntity = "ALL", onNavigateToTax }) => {
  const [subTab, setSubTab] = useState<"models" | "assets" | "contracts" | "billings">("assets");
  const [loading, setLoading] = useState(false);

  // Data States
  const [models, setModels] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [billings, setBillings] = useState<any[]>([]);

  // Filter
  const [selectedYm, setSelectedYm] = useState(new Date().toISOString().slice(0, 7));

  // Modals
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [showAcquireAssetModal, setShowAcquireAssetModal] = useState(false);
  const [showDeprecModal, setShowDeprecModal] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showAddBillingModal, setShowAddBillingModal] = useState(false);

  // Contract Form
  const [ctEntityType, setCtEntityType] = useState<"CORP" | "INDIVIDUAL">(
    selectedEntity === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP"
  );

  useEffect(() => {
    if (selectedEntity === "INDIVIDUAL") setCtEntityType("INDIVIDUAL");
    else if (selectedEntity === "CORP") setCtEntityType("CORP");
  }, [selectedEntity]);

  // Model Form
  const [modelCode, setModelCode] = useState("");
  const [modelName, setModelName] = useState("");
  const [manufacturer, setManufacturer] = useState("Skyjack");
  const [modelMonthlyRate, setModelMonthlyRate] = useState("600000");
  const [modelDailyRate, setModelDailyRate] = useState("30000");
  const [modelSpec, setModelSpec] = useState("작업높이 8m / 전폭 0.81m");

  // Asset Form
  const [assetNo, setAssetNo] = useState("");
  const [assetModelId, setAssetModelId] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [acqDate, setAcqDate] = useState(new Date().toISOString().split("T")[0]);
  const [acqCost, setAcqCost] = useState("12000000");
  const [salvageValue, setSalvageValue] = useState("1200000");
  const [usefulLife, setUsefulLife] = useState("5");

  // Contract Form
  const [ctCustomer, setCtCustomer] = useState("");
  const [ctSite, setCtSite] = useState("");
  const [ctAssetId, setCtAssetId] = useState("");
  const [ctStart, setCtStart] = useState(new Date().toISOString().split("T")[0]);
  const [ctEnd, setCtEnd] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [ctMonthlyRate, setCtMonthlyRate] = useState("600000");
  const [ctDeposit, setCtDeposit] = useState("0");

  // Billing Form
  const [blContractId, setBlContractId] = useState("");
  const [blYm, setBlYm] = useState(new Date().toISOString().slice(0, 7));
  const [blStart, setBlStart] = useState(new Date().toISOString().slice(0, 7) + "-01");
  const [blEnd, setBlEnd] = useState(new Date().toISOString().split("T")[0]);
  const [blDays, setBlDays] = useState("30");

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sorting State
  const [sortKey, setSortKey] = useState<string>("id");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => {
    const isActive = sortKey === key;
    return (
      <th
        onClick={() => handleSort(key)}
        className={`py-2.5 px-3 cursor-pointer select-none hover:bg-slate-800 transition text-${align}`}
        title={`${label} 기준 정렬`}
      >
        <div className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start"}`}>
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </span>
        </div>
      </th>
    );
  };

  // Sorted Lists
  const sortedAssets = useMemo(() => sortErpItems(assets, sortKey, sortDir), [assets, sortKey, sortDir]);
  const sortedContracts = useMemo(() => sortErpItems(contracts, sortKey, sortDir), [contracts, sortKey, sortDir]);
  const sortedBillings = useMemo(() => sortErpItems(billings, sortKey, sortDir), [billings, sortKey, sortDir]);
  const sortedModels = useMemo(() => sortErpItems(models, sortKey, sortDir), [models, sortKey, sortDir]);

  // Fetch All Rental Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const contractsUrl = selectedEntity && selectedEntity !== "ALL"
        ? `/api/erp/rental/contracts?entityType=${selectedEntity}`
        : "/api/erp/rental/contracts";

      const [mRes, aRes, cRes, bRes] = await Promise.all([
        fetch("/api/erp/rental/products"),
        fetch("/api/erp/rental/assets"),
        fetch(contractsUrl),
        fetch(`/api/erp/rental/billings?yearMonth=${selectedYm}`)
      ]);

      const mData = await mRes.json();
      const aData = await aRes.json();
      const cData = await cRes.json();
      const bData = await bRes.json();

      if (mData.success) setModels(mData.products);
      if (aData.success) setAssets(aData.assets);
      if (cData.success) setContracts(cData.contracts);
      if (bData.success) setBillings(bData.billings);
    } catch (err: any) {
      console.error(err);
      showToast("데이터 로드 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYm, selectedEntity]);

  // Handle Add Model
  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelCode || !modelName) {
      showToast("모델 코드와 모델명은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/rental/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelCode,
          modelName,
          category: "고소작업대",
          manufacturer,
          standardMonthlyRate: modelMonthlyRate,
          standardDailyRate: modelDailyRate,
          spec: modelSpec,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "모델 등록 실패");

      showToast(`기종 모델 [${modelName}] 등록 완료`);
      setShowAddModelModal(false);
      setModelCode("");
      setModelName("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Acquire Asset
  const handleAcquireAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetNo || !assetModelId || !acqCost) {
      showToast("자산번호, 모델, 취득원가는 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/rental/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetNo,
          rentalProductId: assetModelId,
          serialNo,
          acquisitionDate: acqDate,
          acquisitionCost: acqCost,
          salvageValue,
          usefulLifeYears: usefulLife,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "자산 취득 등록 실패");

      showToast(`자산 [${assetNo}] 취득 완료 (장부가액 ${formatErpCurrency(acqCost)})`);
      setShowAcquireAssetModal(false);
      setAssetNo("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Depreciation Execution
  const handleExecuteDepreciation = async () => {
    if (!window.confirm(`${selectedYm}월 전 자산 정액법 감가상각을 일괄 마감 실행하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/erp/rental/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearMonth: selectedYm,
          actorName: currentUser?.name || "ADMIN",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "감가상각 마감 실패");

      showToast(data.message, "success");
      setShowDeprecModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Add Contract
  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctCustomer || !ctAssetId || !ctStart || !ctEnd) {
      showToast("고객사, 배정자산, 기간은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/rental/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: ctEntityType,
          customerName: ctCustomer,
          siteName: ctSite,
          assetId: ctAssetId,
          startDate: ctStart,
          endDate: ctEnd,
          monthlyRate: ctMonthlyRate,
          deposit: ctDeposit,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "계약 등록 실패");

      showToast(`임대계약 등록 완료 (자산 상태: '대여중 RENTED' 전환)`);
      setShowAddContractModal(false);
      setCtCustomer("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Return Contract
  const handleReturnContract = async (contractId: number) => {
    if (!window.confirm("해당 임대 장비를 현장에서 회수 및 계약 반납 처리하시겠습니까?\n(자산 상태가 '임대가능'으로 롤백됩니다)")) {
      return;
    }
    try {
      const res = await fetch("/api/erp/rental/contracts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId, action: "RETURN" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "반납 처리 실패");

      showToast(data.message);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Add Billing (헌장 4.1 일할 계산)
  const handleAddBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blContractId || !blYm || !blStart || !blEnd) {
      showToast("계약, 연월, 시작일, 종료일은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/rental/billings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: blContractId,
          yearMonth: blYm,
          startDate: blStart,
          endDate: blEnd,
          operatingDays: blDays,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "청구 등록 실패");

      showToast(`임대 일할 정산 청구 등록 완료 (매출원가=감가상각비 매핑)`);
      setShowAddBillingModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Issue Tax from Rental Billing
  const handleIssueTaxFromRental = async (b: any) => {
    const targetCt = contracts.find(c => c.id === b.contractId);
    const supplierType = targetCt?.entityType || "CORP";
    const corpLabel = supplierType === "INDIVIDUAL" ? "드래곤알피에이 [개인]" : "(주)드래곤알피에이 [법인]";

    if (!window.confirm(`[${corpLabel} ➔ ${b.customerName}]\n${formatErpCurrency(b.proRataRevenue)}에 대한 전자세금계산서를 즉시 발행하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch("/api/erp/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainType: "RENTAL",
          supplierEntityType: supplierType,
          refId: b.id,
          customerName: b.customerName,
          itemName: `고소작업대 임대료 (${b.modelName} ${b.assetNo} / ${b.operatingDays}일)`,
          supplyAmount: b.proRataRevenue,
          issueDate: b.billingDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "세금계산서 발행 실패");

      showToast(`세금계산서 [${data.invoice.invoice_no || data.invoice.invoiceNo}] 국세청 발행 완료!`);
      if (onNavigateToTax) onNavigateToTax();
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-slate-950 text-slate-100 overflow-hidden">
      {toast && (
        <div className={`fixed top-16 right-5 z-50 px-4 py-2 rounded text-xs font-bold text-white shadow-xl ${
          toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab("assets")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "assets" ? "bg-blue-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>자산 취득 & 감가상각 ({assets.length})</span>
          </button>
          <button
            onClick={() => setSubTab("contracts")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "contracts" ? "bg-blue-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>임대계약 대장 ({contracts.length})</span>
          </button>
          <button
            onClick={() => setSubTab("billings")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "billings" ? "bg-blue-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>일할 매출정산 & 청구 ({billings.length})</span>
          </button>
          <button
            onClick={() => setSubTab("models")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "models" ? "bg-blue-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>임대 기종 모델 ({models.length})</span>
          </button>
        </div>

        {/* Action Buttons (Pipeline) */}
        <div className="flex items-center gap-2">
          {subTab === "assets" && (
            <>
              <button
                onClick={() => setShowDeprecModal(true)}
                className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-xs font-bold text-amber-300 rounded flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>당월 감가상각 마감 실행</span>
              </button>
              <button
                onClick={() => setShowAcquireAssetModal(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>자산 취득 등록</span>
              </button>
            </>
          )}
          {subTab === "contracts" && (
            <button
              onClick={() => setShowAddContractModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>신규 임대계약</span>
            </button>
          )}
          {subTab === "billings" && (
            <button
              onClick={() => setShowAddBillingModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>일할 청구서 생성</span>
            </button>
          )}
          {subTab === "models" && (
            <button
              onClick={() => setShowAddModelModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>기종 모델 등록</span>
            </button>
          )}
          <button
            onClick={fetchData}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Scope / Filter Bar (Z-Pattern ①) */}
      {subTab === "billings" && (
        <div className="flex items-center gap-3 bg-slate-900/60 p-2.5 rounded border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400 font-semibold">정산 연월:</label>
            <input
              type="month"
              value={selectedYm}
              onChange={(e) => setSelectedYm(e.target.value)}
              className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-xs text-white"
            />
          </div>
          <span className="text-slate-500 text-[11px]">
            ※ 헌장 4.1 일할 계산: 월임대료 / 30 * 가동일수 & 감가상각 매출원가 정밀 매핑
          </span>
        </div>
      )}

      {/* Main Inspection Grid (Z-Pattern ③) */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded overflow-auto shadow-inner">
        {subTab === "assets" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold select-none z-10">
              <tr>
                {renderSortTh("자산번호", "assetNo")}
                {renderSortTh("기종 모델", "modelName")}
                {renderSortTh("제조사", "manufacturer")}
                {renderSortTh("시리얼번호", "serialNo")}
                {renderSortTh("취득일자", "acquisitionDate")}
                {renderSortTh("취득원가", "acquisitionCost", "right")}
                {renderSortTh("잔존가치", "salvageValue", "right")}
                {renderSortTh("내용연수", "usefulLifeYears", "center")}
                {renderSortTh("감가상각누계액", "accumulatedDepreciation", "right")}
                {renderSortTh("현재 장부가액", "bookValue", "right")}
                {renderSortTh("자산상태", "status", "center")}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedAssets.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    등록된 취득 자산이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedAssets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-mono font-bold text-blue-400">{a.assetNo}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{a.modelName}</td>
                    <td className="py-2 px-3 text-slate-300">{a.manufacturer}</td>
                    <td className="py-2 px-3 font-mono text-slate-400">{a.serialNo || "-"}</td>
                    <td className="py-2 px-3 font-mono text-slate-300">{a.acquisitionDate}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-200">{formatErpCurrency(a.acquisitionCost)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{formatErpCurrency(a.salvageValue)}</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-300">{formatErpNumber(a.usefulLifeYears)}년</td>
                    <td className="py-2 px-3 text-right font-mono text-rose-400">{formatErpCurrency(a.accumulatedDepreciation)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatErpCurrency(a.bookValue)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.status === "RENTED" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                        a.status === "AVAILABLE" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                        "bg-slate-800 text-slate-400"
                      }`}>
                        {a.status === "RENTED" ? "대여중" : a.status === "AVAILABLE" ? "임대가능" : a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {subTab === "contracts" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold select-none z-10">
              <tr>
                {renderSortTh("귀속 사업자", "entityType")}
                {renderSortTh("계약번호", "contractNo")}
                {renderSortTh("고객사(임차인)", "customerName")}
                {renderSortTh("현장명", "siteName")}
                {renderSortTh("배정 자산", "assetNo")}
                {renderSortTh("기종 모델", "modelName")}
                {renderSortTh("계약기간", "startDate")}
                {renderSortTh("월임대료", "monthlyRate", "right")}
                {renderSortTh("계약상태", "status", "center")}
                <th className="py-2.5 px-3 text-center">반납 조치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedContracts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    등록된 임대계약이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3">
                      {c.entityType === "INDIVIDUAL" ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          개인
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          법인
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-blue-400">{c.contractNo}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{c.customerName}</td>
                    <td className="py-2 px-3 text-slate-300">{c.siteName}</td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-300">{c.assetNo}</td>
                    <td className="py-2 px-3 text-slate-200">{c.modelName}</td>
                    <td className="py-2 px-3 font-mono text-slate-300">{c.startDate} ~ {c.endDate}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(c.monthlyRate)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.status === "ACTIVE" ? "bg-amber-950 text-amber-400 border border-amber-800" : "bg-slate-800 text-slate-400"
                      }`}>
                        {c.status === "ACTIVE" ? "대여중" : "반납완료"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {c.status === "ACTIVE" ? (
                        <button
                          onClick={() => handleReturnContract(c.id)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[11px] font-semibold transition"
                        >
                          장비회수/반납
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">반납됨</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {subTab === "billings" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold select-none z-10">
              <tr>
                {renderSortTh("청구번호", "billingNo")}
                {renderSortTh("고객사", "customerName")}
                {renderSortTh("자산/기종", "assetNo")}
                {renderSortTh("가동일수", "operatingDays", "center")}
                {renderSortTh("일할매출액", "proRataRevenue", "right")}
                {renderSortTh("감가상각원가(COGS)", "depreciationCogs", "right")}
                {renderSortTh("순마진", "netMargin", "right")}
                {renderSortTh("수납상태", "paymentStatus", "center")}
                <th className="py-2.5 px-3 text-center">세금계산서</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedBillings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    해당 연월에 생성된 임대 정산 청구서가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedBillings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-mono text-blue-400">{b.billingNo}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{b.customerName}</td>
                    <td className="py-2 px-3 text-slate-200">{b.assetNo} ({b.modelName})</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-300">{formatErpNumber(b.operatingDays)}일</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-400">
                      {formatErpCurrency(b.proRataRevenue)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">
                      {formatErpCurrency(b.depreciationCogs)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatErpCurrency(b.netMargin)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        b.paymentStatus === "PAID" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}>
                        {b.paymentStatus === "PAID" ? "완납" : "미수"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {b.taxInvoiceNo ? (
                        <span className="font-mono text-[10px] text-blue-400">{b.taxInvoiceNo}</span>
                      ) : (
                        <button
                          onClick={() => handleIssueTaxFromRental(b)}
                          className="px-2 py-0.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-700 text-blue-300 rounded text-[11px] font-semibold transition"
                        >
                          계산서발행
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {subTab === "models" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold select-none z-10">
              <tr>
                {renderSortTh("모델 코드", "model_code")}
                {renderSortTh("모델명", "model_name")}
                {renderSortTh("제조사", "manufacturer")}
                {renderSortTh("제원 사양", "spec")}
                {renderSortTh("기준 월임대료", "standard_monthly_rate", "right")}
                {renderSortTh("기준 일일단가", "standard_daily_rate", "right")}
                {renderSortTh("상태", "status", "center")}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedModels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    등록된 기종 모델이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedModels.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-mono font-bold text-blue-400">{m.model_code}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{m.model_name}</td>
                    <td className="py-2 px-3 text-slate-300">{m.manufacturer}</td>
                    <td className="py-2 px-3 text-slate-400">{m.spec || "-"}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(m.standard_monthly_rate)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{formatErpCurrency(m.standard_daily_rate)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        정상가동
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Terminal Summary (Z-Pattern ④) */}
      <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-4">
          <span>총 자산: <strong className="text-white">{formatErpNumber(assets.length)}대</strong></span>
          <span>임대중: <strong className="text-amber-400">{formatErpNumber(assets.filter(a => a.status === "RENTED").length)}대</strong></span>
          <span>임대가능: <strong className="text-emerald-400">{formatErpNumber(assets.filter(a => a.status === "AVAILABLE").length)}대</strong></span>
          <span>총 장부가액: <strong className="text-blue-400">{formatErpCurrency(assets.reduce((s, a) => s + Number(a.bookValue || 0), 0))}</strong></span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          ※ 헌장 1.3 출고 승인 마감 시 자산상태 RENTED 전환 원칙 준수
        </div>
      </div>

      {/* Modal: Acquire Asset */}
      {showAcquireAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>장비 구매 및 자산 취득 등록</span>
              </h3>
              <button onClick={() => setShowAcquireAssetModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAcquireAsset} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">자산번호 (필수)</label>
                  <input
                    type="text"
                    value={assetNo}
                    onChange={(e) => setAssetNo(e.target.value)}
                    placeholder="예: AST-001"
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">기종 모델</label>
                  <select
                    value={assetModelId}
                    onChange={(e) => setAssetModelId(e.target.value)}
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  >
                    <option value="">선택하십시오</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>[{m.model_code}] {m.model_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">시리얼 번호</label>
                  <input
                    type="text"
                    value={serialNo}
                    onChange={(e) => setSerialNo(e.target.value)}
                    placeholder="차대번호"
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">취득일자</label>
                  <input
                    type="date"
                    value={acqDate}
                    onChange={(e) => setAcqDate(e.target.value)}
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">취득원가 (원)</label>
                  <input
                    type="number"
                    value={acqCost}
                    onChange={(e) => setAcqCost(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">잔존가치 (원)</label>
                  <input
                    type="number"
                    value={salvageValue}
                    onChange={(e) => setSalvageValue(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">내용연수(년)</label>
                  <input
                    type="number"
                    value={usefulLife}
                    onChange={(e) => setUsefulLife(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAcquireAssetModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded"
                >
                  자산 취득 확정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Model */}
      {showAddModelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>임대 기종 모델 등록</span>
              </h3>
              <button onClick={() => setShowAddModelModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddModel} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">모델 코드</label>
                  <input
                    type="text"
                    value={modelCode}
                    onChange={(e) => setModelCode(e.target.value)}
                    placeholder="예: SJ3219"
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">모델명</label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="예: 스카이잭 8m 배터리형"
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">기준 월임대료</label>
                  <input
                    type="number"
                    value={modelMonthlyRate}
                    onChange={(e) => setModelMonthlyRate(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">기준 일일단가</label>
                  <input
                    type="number"
                    value={modelDailyRate}
                    onChange={(e) => setModelDailyRate(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">제원 사양</label>
                <input
                  type="text"
                  value={modelSpec}
                  onChange={(e) => setModelSpec(e.target.value)}
                  className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModelModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded"
                >
                  모델 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Contract */}
      {showAddContractModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" />
                <span>신규 임대계약 체결</span>
              </h3>
              <button onClick={() => setShowAddContractModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddContract} className="mt-4 flex flex-col gap-3 text-xs">
              {/* 귀속 사업자 선택 */}
              <div className="flex flex-col gap-1 p-2 rounded bg-slate-950 border border-slate-800">
                <label className="text-slate-400 font-semibold text-[11px]">계약 귀속 사업자 선택</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCtEntityType("CORP")}
                    className={`p-2 rounded border text-left transition ${
                      ctEntityType === "CORP"
                        ? "border-blue-500 bg-blue-500/20 text-blue-300 font-bold"
                        : "border-slate-800 text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    <div>(주)드래곤알피에이 [법인]</div>
                    <div className="font-mono text-[10px] opacity-75">806-88-03266</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCtEntityType("INDIVIDUAL")}
                    className={`p-2 rounded border text-left transition ${
                      ctEntityType === "INDIVIDUAL"
                        ? "border-amber-500 bg-amber-500/20 text-amber-300 font-bold"
                        : "border-slate-800 text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    <div>드래곤알피에이 [개인]</div>
                    <div className="font-mono text-[10px] opacity-75">295-03-02683</div>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">임차 고객사</label>
                <input
                  type="text"
                  value={ctCustomer}
                  onChange={(e) => setCtCustomer(e.target.value)}
                  placeholder="예: (주)포스코건설"
                  className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">현장명</label>
                <input
                  type="text"
                  value={ctSite}
                  onChange={(e) => setCtSite(e.target.value)}
                  placeholder="예: 평택 고덕 플랜트 3공구"
                  className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">배정 임대 자산 (임대가능 장비만 노출)</label>
                <select
                  value={ctAssetId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setCtAssetId(id);
                    const ast = assets.find(a => a.id.toString() === id);
                    if (ast) {
                      const mod = models.find(m => m.id === ast.rentalProductId);
                      if (mod) setCtMonthlyRate(mod.standard_monthly_rate?.toString() || "600000");
                    }
                  }}
                  className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                  required
                >
                  <option value="">선택하십시오</option>
                  {assets.filter(a => a.status === "AVAILABLE").map(a => (
                    <option key={a.id} value={a.id}>
                      [{a.assetNo}] {a.modelName} ({a.manufacturer})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">계약 시작일자</label>
                  <input
                    type="date"
                    value={ctStart}
                    onChange={(e) => setCtStart(e.target.value)}
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">계약 종료일자</label>
                  <input
                    type="date"
                    value={ctEnd}
                    onChange={(e) => setCtEnd(e.target.value)}
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">약정 월임대료 (원)</label>
                  <input
                    type="number"
                    value={ctMonthlyRate}
                    onChange={(e) => setCtMonthlyRate(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">임대 보증금 (원)</label>
                  <input
                    type="number"
                    value={ctDeposit}
                    onChange={(e) => setCtDeposit(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddContractModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded"
                >
                  계약 체결
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Billing (헌장 4.1 일할 청구 생성) */}
      {showAddBillingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>일할 정산 청구서 생성 (헌장 4.1)</span>
              </h3>
              <button onClick={() => setShowAddBillingModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBilling} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400">대상 임대계약</label>
                <select
                  value={blContractId}
                  onChange={(e) => setBlContractId(e.target.value)}
                  className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                  required
                >
                  <option value="">선택하십시오</option>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.contractNo}] {c.customerName} - {c.assetNo} (월 {formatErpCurrency(c.monthlyRate)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">정산 연월</label>
                  <input
                    type="month"
                    value={blYm}
                    onChange={(e) => setBlYm(e.target.value)}
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">실제 가동일수 (일)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={blDays}
                    onChange={(e) => setBlDays(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">정산 시작일자</label>
                  <input
                    type="date"
                    value={blStart}
                    onChange={(e) => setBlStart(e.target.value)}
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">정산 종료일자</label>
                  <input
                    type="date"
                    value={blEnd}
                    onChange={(e) => setBlEnd(e.target.value)}
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddBillingModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded"
                >
                  청구 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Depreciation Execution */}
      {showDeprecModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-700/60 w-full max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>당월 정액법 감가상각 마감 실행</span>
              </h3>
              <button onClick={() => setShowDeprecModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs">
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded text-amber-200">
                <p className="font-bold mb-1">⚖️ 감가상각 회계 원칙</p>
                <p className="text-[11px] leading-relaxed text-amber-300/90">
                  - 정액법 공식: (취득원가 - 잔존가치) / (내용연수 × 12개월)<br/>
                  - 실행 대상: 현재 가동 중인 전 자산 (총 {formatErpNumber(assets.length)}대)<br/>
                  - 산출된 월 상각비는 임대 기간별 매출원가로 1:1 매핑됩니다.
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeprecModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDepreciation}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 font-bold text-black rounded"
                >
                  마감 실행
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
