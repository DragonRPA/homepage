"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Briefcase, Plus, RefreshCw, FileText, CheckCircle2, 
  Layers, Search, DollarSign, Calendar, X,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { formatErpNumber, formatErpCurrency, formatErpQty, sortErpItems, SortDirection } from "@/lib/erpFormat";

interface ServiceTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onNavigateToTax?: () => void;
}

export const ServiceTab: React.FC<ServiceTabProps> = ({ currentUser, selectedEntity = "ALL", onNavigateToTax }) => {
  const [activeType, setActiveType] = useState<"OPERATIONAL" | "DEVELOPMENT">("OPERATIONAL");
  const [loading, setLoading] = useState(false);

  // Data States
  const [contracts, setContracts] = useState<any[]>([]);
  const [billings, setBillings] = useState<any[]>([]);

  // Modals
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

  const [ctCustomer, setCtCustomer] = useState("");
  const [ctProject, setCtProject] = useState("");
  const [ctAmount, setCtAmount] = useState("10000000");
  const [ctMonthlyFee, setCtMonthlyFee] = useState("1000000");
  const [ctStart, setCtStart] = useState(new Date().toISOString().split("T")[0]);
  const [ctEnd, setCtEnd] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [ctBillingDay, setCtBillingDay] = useState("25");

  // Billing Form
  const [blContractId, setBlContractId] = useState("");
  const [blMilestoneName, setBlMilestoneName] = useState("");
  const [blSupplyAmount, setBlSupplyAmount] = useState("1000000");
  const [blDate, setBlDate] = useState(new Date().toISOString().split("T")[0]);

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
        className={`py-2.5 px-3 cursor-pointer select-none hover:bg-[#d0c6b4] dark:hover:bg-slate-800 transition text-${align} ${isActive ? "text-[#1d4ed8] dark:text-blue-400 font-bold" : ""}`}
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

  const sortedContracts = useMemo(() => sortErpItems(contracts, sortKey, sortDir), [contracts, sortKey, sortDir]);
  const sortedBillings = useMemo(() => sortErpItems(billings, sortKey, sortDir), [billings, sortKey, sortDir]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const contractsUrl = selectedEntity && selectedEntity !== "ALL"
        ? `/api/erp/services/contracts?serviceType=${activeType}&entityType=${selectedEntity}`
        : `/api/erp/services/contracts?serviceType=${activeType}`;

      const [cRes, bRes] = await Promise.all([
        fetch(contractsUrl),
        fetch(`/api/erp/services/billings?serviceType=${activeType}`)
      ]);
      const cData = await cRes.json();
      const bData = await bRes.json();

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
  }, [activeType, selectedEntity]);

  // Handle Add Contract
  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctCustomer || !ctProject || !ctStart || !ctEnd) {
      showToast("고객사, 프로젝트명, 계약 기간은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/services/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: ctEntityType,
          serviceType: activeType,
          customerName: ctCustomer,
          projectName: ctProject,
          contractAmount: ctAmount,
          monthlyFee: ctMonthlyFee,
          startDate: ctStart,
          endDate: ctEnd,
          billingDay: ctBillingDay,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "계약 등록 실패");

      showToast(`[${activeType === "OPERATIONAL" ? "운영용역" : "개발용역"}] 계약 등록 완료`);
      setShowAddContractModal(false);
      setCtCustomer("");
      setCtProject("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Add Billing
  const handleAddBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blContractId || !blSupplyAmount) {
      showToast("계약과 공급가액은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/services/billings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: blContractId,
          billingType: activeType === "OPERATIONAL" ? "MONTHLY_RETAINER" : "MILESTONE",
          milestoneName: blMilestoneName || (activeType === "OPERATIONAL" ? "정기 용역료" : "중도금"),
          billingDate: blDate,
          supplyAmount: blSupplyAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "청구 등록 실패");

      showToast(`용역 청구 등록 완료`);
      setShowAddBillingModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Issue Tax
  const handleIssueTax = async (b: any) => {
    const targetCt = contracts.find(c => c.id === b.contractId);
    const supplierType = targetCt?.entityType || "CORP";
    const corpLabel = supplierType === "INDIVIDUAL" ? "드래곤알피에이 [개인]" : "(주)드래곤알피에이 [법인]";

    if (!window.confirm(`[${corpLabel} ➔ ${b.customerName}]\n${formatErpCurrency(b.totalAmount)}에 대한 전자세금계산서를 즉시 발행하시겠습니까?`)) {
      return;
    }
    try {
      const domainType = activeType === "OPERATIONAL" ? "OP_SERVICE" : "DEV_SERVICE";
      const res = await fetch("/api/erp/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainType,
          supplierEntityType: supplierType,
          refId: b.id,
          customerName: b.customerName,
          itemName: `${b.projectName} (${b.milestoneName})`,
          supplyAmount: b.supplyAmount,
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
    <div className="flex flex-col h-full gap-3 p-4 bg-[#ebe5d8] text-[#0f172a] overflow-hidden font-sans dark:bg-slate-950 dark:text-slate-100">
      {toast && (
        <div className={`fixed top-16 right-5 z-50 px-4 py-2 rounded text-xs font-bold text-white shadow-xl ${
          toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-[#b5a894] dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveType("OPERATIONAL")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              activeType === "OPERATIONAL" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>운영용역 (월 정기 유지보수)</span>
          </button>
          <button
            onClick={() => setActiveType("DEVELOPMENT")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              activeType === "DEVELOPMENT" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>개발용역 (SI 프로젝트 / 마일스톤)</span>
          </button>
        </div>

        {/* Action Buttons (Pipeline) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddBillingModal(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeType === "OPERATIONAL" ? "정기 청구 생성" : "마일스톤 청구 생성"}</span>
          </button>
          <button
            onClick={() => setShowAddContractModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>신규 계약 체결</span>
          </button>
          <button
            onClick={fetchData}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Inspection Grid (Z-Pattern ③) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-hidden">
        {/* Left: Contracts Ledger */}
        <div className="bg-slate-900 border border-slate-800 rounded flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-between">
            <span>체결 계약 대장 ({contracts.length}건)</span>
            <span className="text-[11px] text-slate-400">
              총 계약고: {formatErpCurrency(contracts.reduce((s, c) => s + Number(c.contractAmount || 0), 0))}
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
                <tr>
                  {renderSortTh("귀속", "entityType")}
                  {renderSortTh("계약번호", "contractNo")}
                  {renderSortTh("고객사", "customerName")}
                  {renderSortTh("용역/프로젝트명", "projectName")}
                  {renderSortTh(activeType === "OPERATIONAL" ? "월 용역료" : "총 계약금", activeType === "OPERATIONAL" ? "monthlyFee" : "contractAmount", "right")}
                  {renderSortTh("계약기간", "startDate")}
                  {renderSortTh("상태", "status", "center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
                {sortedContracts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      등록된 용역 계약이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedContracts.map((c) => (
                    <tr key={c.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
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
                      <td className="py-2 px-3 text-slate-200">{c.projectName}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">
                        {formatErpCurrency(activeType === "OPERATIONAL" ? c.monthlyFee : c.contractAmount)}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">
                        {c.startDate} ~ {c.endDate}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                          진행중
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Billings Ledger */}
        <div className="bg-slate-900 border border-slate-800 rounded flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-between">
            <span>청구 및 수납 내역 ({billings.length}건)</span>
            <span className="text-[11px] text-slate-400">
              총 청구액: {formatErpCurrency(billings.reduce((s, b) => s + Number(b.totalAmount || 0), 0))}
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
                <tr>
                  {renderSortTh("청구번호", "billingNo")}
                  {renderSortTh("고객사 / 용역명", "customerName")}
                  {renderSortTh("구분 / 마일스톤", "milestoneName")}
                  {renderSortTh("공급가액", "supplyAmount", "right")}
                  {renderSortTh("총 청구액", "totalAmount", "right")}
                  <th className="py-2.5 px-3 text-center">세금계산서</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
                {sortedBillings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      생성된 청구 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedBillings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                      <td className="py-2 px-3 font-mono text-blue-400">{b.billingNo}</td>
                      <td className="py-2 px-3 font-bold text-slate-100">{b.customerName}</td>
                      <td className="py-2 px-3 text-slate-300">{b.milestoneName}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-300">{formatErpCurrency(b.supplyAmount)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(b.totalAmount)}</td>
                      <td className="py-2 px-3 text-center">
                        {b.taxInvoiceNo ? (
                          <span className="font-mono text-[10px] text-blue-400">{b.taxInvoiceNo}</span>
                        ) : (
                          <button
                            onClick={() => handleIssueTax(b)}
                            className="px-2 py-0.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-700 text-blue-300 rounded text-[11px] font-semibold transition"
                          >
                            발행
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Terminal Summary (Z-Pattern ④) */}
      <div className="bg-[#e2dbcd] border border-[#b5a894] px-4 py-2.5 rounded flex items-center justify-between text-xs text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">
        <div className="flex items-center gap-4">
          <span>{activeType === "OPERATIONAL" ? "운영용역" : "개발용역"} 계약: <strong className="text-white">{formatErpNumber(contracts.length)}건</strong></span>
          <span>누적 청구건수: <strong className="text-blue-400">{formatErpNumber(billings.length)}건</strong></span>
          <span>총 청구 공급가액: <strong className="text-emerald-400">{formatErpCurrency(billings.reduce((s, b) => s + Number(b.supplyAmount || 0), 0))}</strong></span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          ※ 계약 및 청구관리 ➔ 전자세금계산서 1-Way 자동 발행 파이프라인
        </div>
      </div>

      {/* Modal: Add Contract */}
      {showAddContractModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] w-full text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <span>{activeType === "OPERATIONAL" ? "운영용역" : "개발용역"} 계약 등록</span>
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
                <label className="text-slate-400">발주 고객사</label>
                <input
                  type="text"
                  value={ctCustomer}
                  onChange={(e) => setCtCustomer(e.target.value)}
                  placeholder="예: 한국전력공사"
                  className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">용역 / 프로젝트명</label>
                <input
                  type="text"
                  value={ctProject}
                  onChange={(e) => setCtProject(e.target.value)}
                  placeholder="예: RPA 시스템 통합 운영 및 기술지원"
                  className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                />
              </div>

              {activeType === "OPERATIONAL" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-400">월 정기 용역료 (원)</label>
                    <input
                      type="number"
                      value={ctMonthlyFee}
                      onChange={(e) => setCtMonthlyFee(e.target.value)}
                      className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-400">정기 청구일 (일)</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={ctBillingDay}
                      onChange={(e) => setCtBillingDay(e.target.value)}
                      className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">총 계약금액 (원)</label>
                  <input
                    type="number"
                    value={ctAmount}
                    onChange={(e) => setCtAmount(e.target.value)}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">계약 시작일자</label>
                  <input
                    type="date"
                    value={ctStart}
                    onChange={(e) => setCtStart(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">계약 종료일자</label>
                  <input
                    type="date"
                    value={ctEnd}
                    onChange={(e) => setCtEnd(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddContractModal(false)}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
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

      {/* Modal: Add Billing */}
      {showAddBillingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] w-full text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>{activeType === "OPERATIONAL" ? "정기 청구서 생성" : "마일스톤 청구서 생성"}</span>
              </h3>
              <button onClick={() => setShowAddBillingModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBilling} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400">대상 계약</label>
                <select
                  value={blContractId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setBlContractId(id);
                    const ct = contracts.find(c => c.id.toString() === id);
                    if (ct && activeType === "OPERATIONAL") {
                      setBlSupplyAmount(ct.monthlyFee?.toString() || "1000000");
                    }
                  }}
                  className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                >
                  <option value="">선택하십시오</option>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.contractNo}] {c.customerName} - {c.projectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">
                  {activeType === "OPERATIONAL" ? "청구 명목 (월분)" : "마일스톤 단계명"}
                </label>
                <input
                  type="text"
                  value={blMilestoneName}
                  onChange={(e) => setBlMilestoneName(e.target.value)}
                  placeholder={activeType === "OPERATIONAL" ? "예: 2026년 10월분 정기유지보수료" : "예: 1차 착수금 (30%)"}
                  className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">공급가액 (원)</label>
                  <input
                    type="number"
                    value={blSupplyAmount}
                    onChange={(e) => setBlSupplyAmount(e.target.value)}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">청구일자</label>
                  <input
                    type="date"
                    value={blDate}
                    onChange={(e) => setBlDate(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddBillingModal(false)}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded"
                >
                  청구 확정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
