"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, Plus, RefreshCw, Download, Search, 
  CheckCircle2, Printer, AlertCircle, X, ExternalLink, Send,
  Building2, UserCheck, ShieldCheck, Check, Info,
  ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square,
  Layers, Briefcase, Truck, ShoppingCart
} from "lucide-react";
import { BUSINESS_ENTITIES, EntityType, getEntity } from "@/lib/businessEntities";
import { formatErpNumber, formatErpCurrency, formatErpInputNumber, cleanErpNumber, sortErpItems, SortDirection } from "@/lib/erpFormat";
import { ContractTaxInvoiceSection, BuyerTaxSpec, createDefaultTaxSpec, extractPartnerTaxSpec } from "./ContractTaxInvoiceSection";

interface TaxInvoiceTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onSelectEntity?: (entity: "ALL" | "CORP" | "INDIVIDUAL") => void;
}

export const TaxInvoiceTab: React.FC<TaxInvoiceTabProps> = ({ 
  currentUser,
  selectedEntity = "ALL",
  onSelectEntity
}) => {
  // Sub-tabs: UNISSUED (발행 대기 청구건) | ISSUED (발행 완료 대장)
  const [activeSubTab, setActiveSubTab] = useState<"UNISSUED" | "ISSUED">("UNISSUED");

  // Invoices & Billings State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [unissuedBillings, setUnissuedBillings] = useState<any[]>([]);
  const [selectedBillingIds, setSelectedBillingIds] = useState<Set<string>>(new Set());
  const [registeredPartners, setRegisteredPartners] = useState<any[]>([]);
  const [detailInvoice, setDetailInvoice] = useState<any | null>(null);

  const getBillingUid = (b: any) => b.uid || `${b.domainType}_${b.billingId}`;

  // Loading States
  const [loading, setLoading] = useState(false);
  const [unissuedLoading, setUnissuedLoading] = useState(false);
  const [batchIssuing, setBatchIssuing] = useState(false);

  // Filters & Sorting
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState<"ALL" | "CORP" | "INDIVIDUAL">(selectedEntity);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string>("issueDate");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Unissued Sorting
  const [unissuedSortKey, setUnissuedSortKey] = useState<string>("billingDate");
  const [unissuedSortDir, setUnissuedSortDir] = useState<SortDirection>("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleUnissuedSort = (key: string) => {
    if (unissuedSortKey === key) {
      setUnissuedSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setUnissuedSortKey(key);
      setUnissuedSortDir("desc");
    }
  };

  // Keep entityFilter in sync when parent header changes
  useEffect(() => {
    setEntityFilter(selectedEntity);
  }, [selectedEntity]);

  // Modal State for Manual Issuance
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [modalSupplierEntity, setModalSupplierEntity] = useState<EntityType>(
    selectedEntity === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP"
  );
  const [custName, setCustName] = useState("");
  const [custSearch, setCustSearch] = useState("");
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [domainType, setDomainType] = useState("TRADE_SALE");
  const [manualTaxSpec, setManualTaxSpec] = useState<BuyerTaxSpec>(() =>
    createDefaultTaxSpec("용역/판매 품목", 1000000)
  );

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Issued Tax Invoices (대장)
  const fetchIssuedInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (domainFilter !== "ALL") params.set("domainType", domainFilter);
      if (entityFilter !== "ALL") params.set("supplierEntityType", entityFilter);

      const url = `/api/erp/tax-invoices${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices || []);
      } else {
        throw new Error(data.error || "세금계산서 대장 조회 실패");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "세금계산서 대장 조회 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Unissued Billings (계약 청구 대기 목록)
  const fetchUnissuedBillings = async () => {
    setUnissuedLoading(true);
    try {
      const res = await fetch("/api/erp/tax-invoices?type=UNISSUED_BILLINGS");
      const data = await res.json();
      if (data.success) {
        setUnissuedBillings(data.billings || []);
        // Retain only valid selected UIDs
        const existingUids = new Set((data.billings || []).map((b: any) => getBillingUid(b)));
        setSelectedBillingIds((prev) => {
          const next = new Set<string>();
          prev.forEach((uid) => {
            if (existingUids.has(uid)) next.add(uid);
          });
          return next;
        });
      } else {
        throw new Error(data.error || "미발행 청구 목록 조회 실패");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "미발행 청구 목록 조회 실패", "error");
    } finally {
      setUnissuedLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/erp/partners?type=ALL");
      const data = await res.json();
      if (data.success && Array.isArray(data.partners)) {
        setRegisteredPartners(data.partners);
      }
    } catch (e) {
      console.error("Failed to fetch partners:", e);
    }
  };

  // Initial load & filter change
  useEffect(() => {
    fetchIssuedInvoices();
    fetchUnissuedBillings();
    fetchPartners();
  }, [domainFilter, entityFilter]);

  // Filtered Unissued Billings
  const filteredUnissued = useMemo(() => {
    return unissuedBillings.filter((b) => {
      // Domain filter
      if (domainFilter !== "ALL") {
        if (domainFilter === "RENTAL" && b.domainType !== "RENTAL") return false;
        if (domainFilter === "OP_SERVICE" && b.domainType !== "OP_SERVICE") return false;
        if (domainFilter === "DEV_SERVICE" && b.domainType !== "DEV_SERVICE") return false;
        if (domainFilter === "TRADE_SALE" && b.domainType !== "TRADE_SALE") return false;
      }
      // Entity filter
      if (entityFilter !== "ALL" && b.entityType !== entityFilter) return false;

      // Search term
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        b.customerName?.toLowerCase().includes(term) ||
        b.itemName?.toLowerCase().includes(term) ||
        b.billingNo?.toLowerCase().includes(term) ||
        b.contractNo?.toLowerCase().includes(term) ||
        b.businessNo?.includes(term) ||
        b.siteName?.toLowerCase().includes(term) ||
        b.projectName?.toLowerCase().includes(term)
      );
    });
  }, [unissuedBillings, domainFilter, entityFilter, searchTerm]);

  // Sorted Unissued Billings
  const sortedUnissued = useMemo(() => {
    return sortErpItems(filteredUnissued, unissuedSortKey, unissuedSortDir);
  }, [filteredUnissued, unissuedSortKey, unissuedSortDir]);

  // Filtered Issued Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      const term = searchTerm.toLowerCase();
      return (
        !term ||
        i.customerName?.toLowerCase().includes(term) ||
        i.itemName?.toLowerCase().includes(term) ||
        i.invoiceNo?.toLowerCase().includes(term) ||
        i.ntsConfirmNo?.toLowerCase().includes(term) ||
        i.supplierCorpName?.toLowerCase().includes(term) ||
        i.businessNo?.includes(term)
      );
    });
  }, [invoices, searchTerm]);

  // Sorted Issued Invoices
  const sortedInvoices = useMemo(() => {
    return sortErpItems(filteredInvoices, sortKey, sortDir);
  }, [filteredInvoices, sortKey, sortDir]);

  // Selection Logic for Unissued Billings
  const toggleSelectAll = () => {
    if (selectedBillingIds.size === filteredUnissued.length && filteredUnissued.length > 0) {
      setSelectedBillingIds(new Set());
    } else {
      setSelectedBillingIds(new Set(filteredUnissued.map((b) => getBillingUid(b))));
    }
  };

  const toggleSelectBilling = (uid: string) => {
    setSelectedBillingIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  // Selected Summary
  const selectedSummary = useMemo(() => {
    const list = unissuedBillings.filter((b) => selectedBillingIds.has(getBillingUid(b)));
    const count = list.length;
    const supply = list.reduce((acc, cur) => acc + Number(cur.supplyAmount || 0), 0);
    const vat = list.reduce((acc, cur) => acc + Number(cur.vatAmount || 0), 0);
    const total = list.reduce((acc, cur) => acc + Number(cur.totalAmount || 0), 0);
    return { count, supply, vat, total };
  }, [unissuedBillings, selectedBillingIds]);

  // KPI Calculations for Issued Invoices (헌장 4.1 회계 보존: 통합 = 법인 + 개인)
  const kpiStats = useMemo(() => {
    const totalCount = invoices.length;
    const totalSupply = invoices.reduce((s, i) => s + Number(i.supplyAmount || 0), 0);
    const totalVat = invoices.reduce((s, i) => s + Number(i.vatAmount || 0), 0);
    const totalGross = invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const corpInvoices = invoices.filter((i) => (i.supplierEntityType || "CORP") === "CORP");
    const corpSupply = corpInvoices.reduce((s, i) => s + Number(i.supplyAmount || 0), 0);
    const corpGross = corpInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const indivInvoices = invoices.filter((i) => i.supplierEntityType === "INDIVIDUAL");
    const indivSupply = indivInvoices.reduce((s, i) => s + Number(i.supplyAmount || 0), 0);
    const indivGross = indivInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const diff = totalGross - (corpGross + indivGross);

    return {
      totalCount,
      totalSupply,
      totalVat,
      totalGross,
      corpCount: corpInvoices.length,
      corpSupply,
      corpGross,
      indivCount: indivInvoices.length,
      indivSupply,
      indivGross,
      balanceDiff: diff,
    };
  }, [invoices]);

  // Handle Batch Issue from Selected Contract Billings (Supports Consolidate Mode)
  const handleBatchIssue = async (consolidate = false) => {
    const selectedList = unissuedBillings.filter((b) => selectedBillingIds.has(getBillingUid(b)));
    if (selectedList.length === 0) {
      showToast("발행할 청구건을 1건 이상 선택해주세요.", "error");
      return;
    }

    const totalSumFormatted = formatErpCurrency(selectedSummary.total);
    const confirmMsg = consolidate
      ? `선택한 ${selectedList.length}건의 청구를 묶어서(동일 고객사별 1장으로 합산) 전자세금계산서를 발행하시겠습니까?\n\n- 선택 청구: ${selectedList.length}건\n- 총 공급가액: ${formatErpCurrency(selectedSummary.supply)}\n- 총 부가세: ${formatErpCurrency(selectedSummary.vat)}\n- 총 합계금액: ${totalSumFormatted}`
      : `선택한 ${selectedList.length}건의 계약 청구건에 대해 국세청 전자세금계산서를 즉시 일괄 발행하시겠습니까?\n\n- 발행 대상: ${selectedList.length}건\n- 총 공급가액: ${formatErpCurrency(selectedSummary.supply)}\n- 총 부가세: ${formatErpCurrency(selectedSummary.vat)}\n- 총 합계금액: ${totalSumFormatted}`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setBatchIssuing(true);
    try {
      const res = await fetch("/api/erp/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchIssue: true,
          consolidate,
          billings: selectedList,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "일괄 세금계산서 발행 실패");

      showToast(data.message || `선택한 ${selectedList.length}건의 전자세금계산서가 성공적으로 발행되었습니다.`);
      setSelectedBillingIds(new Set());
      await fetchUnissuedBillings();
      await fetchIssuedInvoices();
      setActiveSubTab("ISSUED"); // Automatically switch to issued tab to view results
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setBatchIssuing(false);
    }
  };

  // Handle Single Issue from Unissued Table
  const handleSingleIssueFromBilling = async (billing: any) => {
    if (!window.confirm(
      `[${billing.customerName}] ${billing.itemName}\n공급가액: ${formatErpCurrency(billing.supplyAmount)} (합계: ${formatErpCurrency(billing.totalAmount)})\n국세청 전자세금계산서를 즉시 발행하시겠습니까?`
    )) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/erp/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchIssue: true,
          billings: [billing],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "세금계산서 발행 실패");

      showToast(`[${billing.customerName}] 전자세금계산서 발행 완료`);
      await fetchUnissuedBillings();
      await fetchIssuedInvoices();
      setActiveSubTab("ISSUED");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Manual Issue Modal Submit
  const handleManualIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalSupply = manualTaxSpec.taxItems.reduce((s, r) => s + Number(r.supplyAmount || 0), 0);
    const totalVat = manualTaxSpec.taxItems.reduce((s, r) => s + Number(r.vatAmount || 0), 0);
    const firstItemName = manualTaxSpec.taxItems[0]?.itemName || "용역/판매 품목";
    const summaryItemName =
      manualTaxSpec.taxItems.length > 1 ? `${firstItemName} 외` : firstItemName;

    if (!custName.trim() || !firstItemName.trim() || totalSupply <= 0) {
      showToast("거래처명, 품목, 공급가액은 필수 항목입니다.", "error");
      return;
    }

    try {
      const res = await fetch("/api/erp/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierEntityType: modalSupplierEntity,
          domainType,
          customerName: custName.trim(),
          businessNo: manualTaxSpec.customerBizNo || "100-00-00000",
          ceoName: manualTaxSpec.customerCeoName || "대표자",
          customerAddress: manualTaxSpec.customerAddress || "",
          customerBizType: manualTaxSpec.customerBizType || "",
          customerBizClass: manualTaxSpec.customerBizClass || "",
          customerEmail: manualTaxSpec.customerEmail || "",
          customerEmail2: manualTaxSpec.customerEmail2 || "",
          taxPurpose: manualTaxSpec.taxPurpose || "청구",
          itemName: summaryItemName,
          supplyAmount: totalSupply,
          vatAmount: totalVat,
          issueDate,
          memo: manualTaxSpec.taxMemo || summaryItemName,
          taxItems: manualTaxSpec.taxItems,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "발행 실패");

      showToast(`전자세금계산서 [${data.invoice.invoice_no || data.invoice.invoiceNo}] 국세청 발행 완료`);
      setShowIssueModal(false);
      setCustName("");
      setCustSearch("");
      setManualTaxSpec(createDefaultTaxSpec("용역/판매 품목", 1000000));
      fetchIssuedInvoices();
      setActiveSubTab("ISSUED");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Popbill Electronic Issue API
  const handlePopbillIssue = async (inv: any) => {
    const supplier = inv.supplierCorpName || (inv.supplierEntityType === "INDIVIDUAL" ? "드래곤알피에이" : "주식회사 드래곤알피에이");
    if (!window.confirm(`[${supplier} ➔ ${inv.customerName}]\n팝빌 API를 통해 국세청 전자세금계산서를 즉시 발행 전송하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch("/api/erp/tax-invoices/popbill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ISSUE_POPBILL",
          invoiceId: inv.id,
          mgtKey: inv.invoiceNo,
          corpNum: inv.supplierCorpNum,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "팝빌 전자발행 실패");

      showToast(data.message);
      fetchIssuedInvoices();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Open Popbill Viewer
  const handleOpenPopbillView = async (inv: any) => {
    try {
      const res = await fetch("/api/erp/tax-invoices/popbill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VIEW_URL",
          mgtKey: inv.invoiceNo,
          corpNum: inv.supplierCorpNum,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "뷰어 URL 생성 실패");

      window.open(data.url, "_blank", "width=880,height=760,scrollbars=yes");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Open Popbill Direct Print
  const handleOpenPopbillPrint = async (inv: any) => {
    try {
      const res = await fetch("/api/erp/tax-invoices/popbill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PRINT_URL",
          mgtKey: inv.invoiceNo,
          corpNum: inv.supplierCorpNum,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "인쇄 URL 생성 실패");

      window.open(data.url, "_blank", "width=880,height=760,scrollbars=yes");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Synchronize status
  const handleSyncStatus = async (inv: any) => {
    try {
      const res = await fetch("/api/erp/tax-invoices/popbill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SYNC_STATUS",
          mgtKey: inv.invoiceNo,
          corpNum: inv.supplierCorpNum,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "상태 동기화 실패");

      showToast(`[${inv.invoiceNo}] 팝빌 국세청 상태 동기화 완료`);
      fetchIssuedInvoices();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const activeSupplier = getEntity(modalSupplierEntity);

  return (
    <div className="flex flex-col h-full overflow-hidden select-none bg-[#f4efe4] text-[#1c1917]">
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

      {/* 1. Top Sub-Tabs Navigation (선택 청구 발행 vs 기발행 대장) */}
      <div className="px-3 pt-2.5 pb-0 border-b border-[#b5a894] bg-[#ebe5d8] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab("UNISSUED")}
            className={`flex items-center gap-2 px-4 py-2 rounded-t font-bold text-xs transition border-t border-l border-r ${
              activeSubTab === "UNISSUED"
                ? "bg-[#f4efe4] border-[#b5a894] text-[#1c1917] border-b-transparent shadow-sm"
                : "bg-[#e2dbcd] border-transparent text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <CheckSquare className="w-4 h-4 text-blue-700" />
            <span>발행 대기 청구 목록</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
              {unissuedBillings.length}건
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("ISSUED")}
            className={`flex items-center gap-2 px-4 py-2 rounded-t font-bold text-xs transition border-t border-l border-r ${
              activeSubTab === "ISSUED"
                ? "bg-[#f4efe4] border-[#b5a894] text-[#1c1917] border-b-transparent shadow-sm"
                : "bg-[#e2dbcd] border-transparent text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>세금계산서 발행 대장</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
              {invoices.length}건
            </span>
          </button>
        </div>

        {/* Popbill Mode & Status Badge */}
        <div className="flex items-center gap-2 pb-1.5 text-[11px]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#b5a894] bg-[#ebe5d8]">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="font-semibold text-[#57534e]">팝빌 연동:</span>
            <span className="font-mono font-bold text-blue-700">DRAGONRP (테스트 모드)</span>
          </div>
          <button
            onClick={() => setShowIssueModal(true)}
            className="flex items-center gap-1 h-7 px-2.5 rounded text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 border border-blue-900 shadow-sm"
            title="계약 외 수동 직접 발행"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>수동 직접 발행</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards: Shown in ISSUED tab */}
      {activeSubTab === "ISSUED" && (
        <div className="p-3 border-b border-[#b5a894] bg-[#ebe5d8] flex flex-wrap items-center gap-3 shrink-0">
          {/* 통합 합계 카드 */}
          <div 
            onClick={() => {
              setEntityFilter("ALL");
              if (onSelectEntity) onSelectEntity("ALL");
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded border border-[#b5a894] flex-1 min-w-[200px] cursor-pointer transition ${
              entityFilter === "ALL" ? "ring-2 ring-blue-600 bg-[#f4efe4]" : "bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            }`}
          >
            <div className="w-9 h-9 rounded bg-blue-600 flex items-center justify-center text-white shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#78716c] flex items-center gap-1 font-semibold">
                통합 세금계산서 전체
                <span className="text-[10px] px-1 rounded bg-blue-100 text-blue-800 font-bold font-mono">
                  {kpiStats.totalCount}건
                </span>
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-blue-800 font-mono">
                  {formatErpCurrency(kpiStats.totalGross)}
                </span>
                <span className="text-[10px] text-[#78716c] font-mono">
                  (공급가 {formatErpCurrency(kpiStats.totalSupply)})
                </span>
              </div>
            </div>
          </div>

          {/* 주식회사 드래곤알피에이 [법인] 카드 */}
          <div 
            onClick={() => {
              setEntityFilter("CORP");
              if (onSelectEntity) onSelectEntity("CORP");
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded border border-[#b5a894] flex-1 min-w-[220px] cursor-pointer transition ${
              entityFilter === "CORP" ? "ring-2 ring-indigo-600 bg-[#f4efe4]" : "bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            }`}
          >
            <div className="w-9 h-9 rounded bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#78716c] flex items-center gap-1 font-semibold">
                (주)드래곤알피에이 [법인]
                <span className="text-[10px] px-1 rounded bg-indigo-100 text-indigo-800 font-bold font-mono">
                  {formatErpNumber(kpiStats.corpCount)}건
                </span>
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-indigo-800 font-mono">
                  {formatErpCurrency(kpiStats.corpGross)}
                </span>
                <span className="text-[10px] text-[#78716c] font-mono">
                  806-88-03266
                </span>
              </div>
            </div>
          </div>

          {/* 드래곤알피에이 [개인] 카드 */}
          <div 
            onClick={() => {
              setEntityFilter("INDIVIDUAL");
              if (onSelectEntity) onSelectEntity("INDIVIDUAL");
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded border border-[#b5a894] flex-1 min-w-[220px] cursor-pointer transition ${
              entityFilter === "INDIVIDUAL" ? "ring-2 ring-amber-600 bg-[#f4efe4]" : "bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            }`}
          >
            <div className="w-9 h-9 rounded bg-amber-600 flex items-center justify-center text-white shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#78716c] flex items-center gap-1 font-semibold">
                드래곤알피에이 [개인]
                <span className="text-[10px] px-1 rounded bg-amber-100 text-amber-800 font-bold font-mono">
                  {formatErpNumber(kpiStats.indivCount)}건
                </span>
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-amber-800 font-mono">
                  {formatErpCurrency(kpiStats.indivGross)}
                </span>
                <span className="text-[10px] text-[#78716c] font-mono">
                  295-03-02683
                </span>
              </div>
            </div>
          </div>

          {/* 회계 보존 대차 차액 검증 배지 */}
          <div className="hidden 2xl:flex items-center gap-2 px-3 py-2 rounded border border-[#b5a894] shrink-0 bg-[#ebe5d8]">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <div className="flex flex-col text-[11px]">
              <span className="text-[#78716c]">대차대조 보존검증</span>
              <span className="font-bold text-emerald-800 font-mono">
                대차차액 {formatErpCurrency(kpiStats.balanceDiff)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Filter & Pipeline Toolbar */}
      <div className="p-3 border-b border-[#b5a894] bg-[#f4efe4] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Entity Filter Dropdown */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-[#78716c]">사업자 구분</span>
            <select
              value={entityFilter}
              onChange={(e) => {
                const val = e.target.value as any;
                setEntityFilter(val);
                if (onSelectEntity) onSelectEntity(val);
              }}
              className="h-8 px-2.5 rounded text-xs font-bold border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
            >
              <option value="ALL">전체 사업자 (통합)</option>
              <option value="CORP">(주)드래곤알피에이 [법인]</option>
              <option value="INDIVIDUAL">드래곤알피에이 [개인]</option>
            </select>
          </div>

          {/* Domain Filter */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-[#78716c]">매출 분과</span>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="h-8 px-2 rounded text-xs border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
            >
              <option value="ALL">전체 매출 분과</option>
              <option value="RENTAL">임대 (장비 렌탈)</option>
              <option value="OP_SERVICE">운영용역 (정기유지보수)</option>
              <option value="DEV_SERVICE">개발용역 (SI 프로젝트)</option>
              <option value="TRADE_SALE">판매 (유통 커머스)</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-[#78716c]">검색</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#78716c]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="거래처명, 품목, 관리번호 검색..."
                className="h-8 pl-8 pr-3 rounded text-xs border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] w-64"
              />
            </div>
          </div>

          <button
            onClick={() => {
              if (activeSubTab === "UNISSUED") fetchUnissuedBillings();
              else fetchIssuedInvoices();
            }}
            className="flex items-center gap-1 h-8 px-2.5 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] mt-4"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || unissuedLoading) ? "animate-spin" : ""}`} />
            <span>조회</span>
          </button>
        </div>

        {/* Sub-tab 1 Specific Actions: Batch Issue Summary Bar & Button */}
        {activeSubTab === "UNISSUED" && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#b5a894] bg-[#ebe5d8] text-xs font-medium">
              <span className="text-[#78716c]">선택:</span>
              <span className="font-bold text-blue-800 font-mono">{selectedSummary.count}건</span>
              <span className="text-[#b5a894]">|</span>
              <span className="text-[#78716c]">공급가액:</span>
              <span className="font-bold font-mono">{formatErpCurrency(selectedSummary.supply)}</span>
              <span className="text-[#b5a894]">|</span>
              <span className="text-[#78716c]">세액:</span>
              <span className="font-bold font-mono">{formatErpCurrency(selectedSummary.vat)}</span>
              <span className="text-[#b5a894]">|</span>
              <span className="text-[#78716c]">합계:</span>
              <span className="font-bold text-emerald-800 font-mono">{formatErpCurrency(selectedSummary.total)}</span>
            </div>

            <button
              onClick={() => handleBatchIssue(true)}
              disabled={selectedSummary.count < 2 || batchIssuing}
              className={`flex items-center gap-1.5 h-8 px-3 rounded text-xs font-bold shadow-sm transition ${
                selectedSummary.count >= 2 && !batchIssuing
                  ? "bg-indigo-700 hover:bg-indigo-800 text-white border border-indigo-900 cursor-pointer"
                  : "bg-[#d8d0c2] text-[#a8a29e] border border-[#b5a894] cursor-not-allowed"
              }`}
              title="여러 계약의 청구를 고객사별 1장으로 묶어서 합산 세금계산서 발행"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>선택 청구 묶음(합산) 발행 ({selectedSummary.count}건)</span>
            </button>

            <button
              onClick={() => handleBatchIssue(false)}
              disabled={selectedSummary.count === 0 || batchIssuing}
              className={`flex items-center gap-1.5 h-8 px-4 rounded text-xs font-bold shadow-sm transition ${
                selectedSummary.count > 0 && !batchIssuing
                  ? "bg-blue-700 hover:bg-blue-800 text-white border border-blue-900 cursor-pointer"
                  : "bg-[#d8d0c2] text-[#a8a29e] border border-[#b5a894] cursor-not-allowed"
              }`}
            >
              <Send className={`w-3.5 h-3.5 ${batchIssuing ? "animate-pulse" : ""}`} />
              <span>선택 청구건 세금계산서 일괄 발행 ({selectedSummary.count}건)</span>
            </button>
          </div>
        )}

        {/* Sub-tab 2 Specific Actions */}
        {activeSubTab === "ISSUED" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (invoices.length === 0) {
                  showToast("내보낼 세금계산서 데이터가 없습니다.", "error");
                  return;
                }
                const csvHeader = "계산서번호,발행일자,공급자,매출분과,공급받는자,사업자번호,품목명,공급가액,세액,합계금액,국세청승인번호,상태\n";
                const csvRows = invoices.map(i => [
                  i.invoiceNo,
                  i.issueDate ? i.issueDate.slice(0, 10) : "",
                  i.supplierCorpName || "",
                  i.domainType || "",
                  `"${(i.customerName || '').replace(/"/g, '""')}"`,
                  i.businessNo || "",
                  `"${(i.itemName || '').replace(/"/g, '""')}"`,
                  Math.round(i.supplyAmount || 0),
                  Math.round(i.vatAmount || 0),
                  Math.round(i.totalAmount || 0),
                  i.ntsConfirmNo || "",
                  i.status || "",
                ].join(",")).join("\n");

                const blob = new Blob(["\uFEFF" + csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `세금계산서_대장_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                showToast("세금계산서 대장이 CSV로 내보내졌습니다.");
              }}
              className="flex items-center gap-1 h-8 px-2.5 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>엑셀 내보내기</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Body Content Area */}
      <div className="flex-1 overflow-auto p-3">
        {/* ============================================================== */}
        {/* SUB-TAB 1: UNISSUED BILLINGS (발행 대기 청구 목록)            */}
        {/* ============================================================== */}
        {activeSubTab === "UNISSUED" && (
          <div className="border border-[#b5a894] rounded bg-[#ebe5d8] overflow-hidden flex flex-col h-full shadow-sm">
            <div className="p-2 border-b border-[#b5a894] bg-[#dfd7c7] flex items-center justify-between text-xs font-bold text-[#57534e]">
              <div className="flex items-center gap-2">
                <span>계약 청구 발행 대기 목록</span>
                <span className="text-[11px] font-normal text-[#78716c]">
                  (실제 렌탈/용역 계약에서 생성된 청구 중 미발행 건)
                </span>
              </div>
              <div className="text-[11px] text-[#78716c]">
                총 {sortedUnissued.length}건 대기 중
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-[#ded6c5] border-b border-[#b5a894] text-[#44403c] font-bold z-10">
                  <tr>
                    <th className="p-2 w-10 text-center border-r border-[#b5a894]">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center p-0.5 rounded hover:bg-[#cecaa8]"
                        title={selectedBillingIds.size === filteredUnissued.length ? "전체 해제" : "전체 선택"}
                      >
                        {selectedBillingIds.size > 0 && selectedBillingIds.size === filteredUnissued.length ? (
                          <CheckSquare className="w-4 h-4 text-blue-700" />
                        ) : (
                          <Square className="w-4 h-4 text-[#78716c]" />
                        )}
                      </button>
                    </th>
                    <th className="p-2 text-left w-20 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleUnissuedSort("domainType")}>
                        <span>매출분과</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-left w-28 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleUnissuedSort("billingNo")}>
                        <span>청구번호</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-left w-24 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleUnissuedSort("billingDate")}>
                        <span>청구일자</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-left border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleUnissuedSort("customerName")}>
                        <span>공급받는자 (거래처)</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-left border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleUnissuedSort("itemName")}>
                        <span>품목명 / 프로젝트</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-right w-28 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleUnissuedSort("supplyAmount")}>
                        <span>공급가액</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-right w-24 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleUnissuedSort("vatAmount")}>
                        <span>세액 (VAT)</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-right w-28 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleUnissuedSort("totalAmount")}>
                        <span>합계금액</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-center w-28 border-r border-[#b5a894] whitespace-nowrap">
                      <span>발행사업자</span>
                    </th>
                    <th className="p-2 text-center w-24 whitespace-nowrap">
                      <span>단건발행</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#b5a894]">
                  {sortedUnissued.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-[#78716c]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-[#a8a29e]" />
                          <span className="font-semibold text-sm">발행 대기 중인 계약 청구 내역이 없습니다.</span>
                          <span className="text-xs text-[#78716c]">
                            임대 계약/청구 및 용역 관리 메뉴에서 청구를 생성하면 자동으로 이곳에 반영됩니다.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedUnissued.map((b) => {
                      const uid = getBillingUid(b);
                      const isSelected = selectedBillingIds.has(uid);
                      const isRental = b.domainType === "RENTAL";
                      return (
                        <tr 
                          key={uid}
                          className={`hover:bg-[#dfd7c7] transition ${
                            isSelected ? "bg-blue-50/50" : ""
                          }`}
                        >
                          <td className="p-2 text-center border-r border-[#b5a894]">
                            <button
                              onClick={() => toggleSelectBilling(uid)}
                              className="p-0.5 rounded hover:bg-[#cecaa8]"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-700" />
                              ) : (
                                <Square className="w-4 h-4 text-[#78716c]" />
                              )}
                            </button>
                          </td>
                          <td className="p-2 border-r border-[#b5a894] whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isRental 
                                ? "bg-blue-100 text-blue-800" 
                                : b.domainType === "DEV_SERVICE" 
                                ? "bg-purple-100 text-purple-800" 
                                : b.domainType === "TRADE_SALE"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-teal-100 text-teal-800"
                            }`}>
                              {isRental ? "장비임대" : b.domainType === "DEV_SERVICE" ? "개발용역" : b.domainType === "TRADE_SALE" ? "유통판매" : "운영용역"}
                            </span>
                          </td>
                          <td className="p-2 border-r border-[#b5a894] font-mono text-[11px] whitespace-nowrap text-[#44403c]">
                            {b.billingNo}
                          </td>
                          <td className="p-2 border-r border-[#b5a894] font-mono text-[11px] whitespace-nowrap text-[#44403c]">
                            {b.billingDate ? String(b.billingDate).slice(0, 10) : b.yearMonth}
                          </td>
                          <td className="p-2 border-r border-[#b5a894] whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-[#1c1917]">{b.customerName}</span>
                              <span className="text-[10px] text-[#78716c] font-mono">
                                {b.businessNo || "100-00-00000"} | {b.ceoName || "대표자"}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 border-r border-[#b5a894] whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#1c1917]">{b.itemName}</span>
                              <span className="text-[10px] text-[#78716c]">
                                {b.contractNo} {b.siteName ? `| 현장: ${b.siteName}` : ""}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 text-right border-r border-[#b5a894] font-mono font-bold whitespace-nowrap text-[#1c1917]">
                            {formatErpCurrency(b.supplyAmount)}
                          </td>
                          <td className="p-2 text-right border-r border-[#b5a894] font-mono text-[#78716c] whitespace-nowrap">
                            {formatErpCurrency(b.vatAmount)}
                          </td>
                          <td className="p-2 text-right border-r border-[#b5a894] font-mono font-bold text-blue-900 whitespace-nowrap">
                            {formatErpCurrency(b.totalAmount)}
                          </td>
                          <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.entityType === "INDIVIDUAL" 
                                ? "bg-amber-100 text-amber-800" 
                                : "bg-indigo-100 text-indigo-800"
                            }`}>
                              {b.entityType === "INDIVIDUAL" ? "개인사업자" : "(주)법인"}
                            </span>
                          </td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleSingleIssueFromBilling(b)}
                              className="px-2 py-1 rounded text-[11px] font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-sm"
                            >
                              즉시 발행
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUB-TAB 2: ISSUED TAX INVOICES (세금계산서 발행 대장)          */}
        {/* ============================================================== */}
        {activeSubTab === "ISSUED" && (
          <div className="border border-[#b5a894] rounded bg-[#ebe5d8] overflow-hidden flex flex-col h-full shadow-sm">
            <div className="p-2 border-b border-[#b5a894] bg-[#dfd7c7] flex items-center justify-between text-xs font-bold text-[#57534e]">
              <div className="flex items-center gap-2">
                <span>국세청 세금계산서 발행 대장</span>
                <span className="text-[11px] font-normal text-[#78716c]">
                  (팝빌 API 실시간 연동 및 국세청 승인번호 완결)
                </span>
              </div>
              <div className="text-[11px] text-[#78716c]">
                총 {sortedInvoices.length}건 발행 완료
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-[#ded6c5] border-b border-[#b5a894] text-[#44403c] font-bold z-10">
                  <tr>
                    <th className="p-2 text-center w-24 border-r border-[#b5a894] whitespace-nowrap">
                      <span>발행 사업자</span>
                    </th>
                    <th className="p-2 text-left w-32 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort("invoiceNo")}>
                        <span>계산서번호</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-left w-24 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort("issueDate")}>
                        <span>발행일자</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-left w-20 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort("domainType")}>
                        <span>매출 분과</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-left border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort("customerName")}>
                        <span>공급받는자 (거래처)</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-left border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort("itemName")}>
                        <span>품목명</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-right w-28 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort("supplyAmount")}>
                        <span>공급가액</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-right w-24 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort("vatAmount")}>
                        <span>세액 (VAT)</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-right w-28 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort("totalAmount")}>
                        <span>합계금액</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-left w-40 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort("ntsConfirmNo")}>
                        <span>국세청 승인번호</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-center w-24 border-r border-[#b5a894] whitespace-nowrap">
                      <span>전송상태</span>
                    </th>
                    <th className="p-2 text-center w-36 whitespace-nowrap">
                      <span>팝빌 연동 조치</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#b5a894]">
                  {sortedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-[#78716c]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText className="w-8 h-8 text-[#a8a29e]" />
                          <span className="font-semibold text-sm">발행된 세금계산서 내역이 없습니다.</span>
                          <span className="text-xs text-[#78716c]">
                            상단의 [발행 대기 청구 목록]에서 청구건을 선택하여 일괄 발행해 주십시오.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedInvoices.map((inv) => {
                      const isCorp = (inv.supplierEntityType || "CORP") === "CORP";
                      return (
                        <tr key={inv.id} className="hover:bg-[#dfd7c7] transition">
                          <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCorp 
                                ? "bg-indigo-100 text-indigo-800" 
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {isCorp ? "드래곤알피에이 [법인]" : "드래곤알피에이 [개인]"}
                            </span>
                          </td>
                          <td className="p-2 border-r border-[#b5a894] font-mono font-bold text-[11px] whitespace-nowrap text-[#1c1917]">
                            {inv.invoiceNo}
                          </td>
                          <td className="p-2 border-r border-[#b5a894] font-mono text-[11px] whitespace-nowrap text-[#44403c]">
                            {inv.issueDate ? String(inv.issueDate).slice(0, 10) : "-"}
                          </td>
                          <td className="p-2 border-r border-[#b5a894] whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#dfd7c7] text-[#44403c]">
                              {inv.domainType === "RENTAL" ? "장비임대" : inv.domainType === "DEV_SERVICE" ? "개발용역" : inv.domainType === "OP_SERVICE" ? "운영용역" : "판매"}
                            </span>
                          </td>
                          <td className="p-2 border-r border-[#b5a894] whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-[#1c1917]">{inv.customerName}</span>
                              <span className="text-[10px] text-[#78716c] font-mono">
                                {inv.businessNo || "-"}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 border-r border-[#b5a894] whitespace-nowrap font-medium text-[#1c1917]">
                            {inv.itemName}
                          </td>
                          <td className="p-2 text-right border-r border-[#b5a894] font-mono font-bold whitespace-nowrap text-[#1c1917]">
                            {formatErpCurrency(inv.supplyAmount)}
                          </td>
                          <td className="p-2 text-right border-r border-[#b5a894] font-mono text-[#78716c] whitespace-nowrap">
                            {formatErpCurrency(inv.vatAmount)}
                          </td>
                          <td className="p-2 text-right border-r border-[#b5a894] font-mono font-bold text-emerald-900 whitespace-nowrap">
                            {formatErpCurrency(inv.totalAmount)}
                          </td>
                          <td className="p-2 border-r border-[#b5a894] font-mono text-[11px] whitespace-nowrap text-[#44403c]">
                            {inv.ntsConfirmNo ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                                {inv.ntsConfirmNo}
                              </span>
                            ) : (
                              <span className="text-[#a8a29e]">-</span>
                            )}
                          </td>
                          <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              국세청전송완료
                            </span>
                          </td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setDetailInvoice(inv)}
                                className="px-1.5 py-1 rounded text-[10px] font-bold border border-blue-700 bg-blue-600 text-white hover:bg-blue-700"
                                title="전자세금계산서 상세조회"
                              >
                                상세조회
                              </button>
                              <button
                                onClick={() => handleOpenPopbillView(inv)}
                                className="px-1.5 py-1 rounded text-[10px] font-semibold border border-[#b5a894] bg-[#f4efe4] hover:bg-[#e2dbcd]"
                                title="국세청 서식 뷰어"
                              >
                                서식
                              </button>
                              <button
                                onClick={() => handleOpenPopbillPrint(inv)}
                                className="px-1.5 py-1 rounded text-[10px] font-semibold border border-[#b5a894] bg-[#f4efe4] hover:bg-[#e2dbcd]"
                                title="인쇄 및 PDF"
                              >
                                인쇄
                              </button>
                              <button
                                onClick={() => handleSyncStatus(inv)}
                                className="px-1.5 py-1 rounded text-[10px] font-semibold border border-[#b5a894] bg-[#f4efe4] hover:bg-[#e2dbcd]"
                                title="상태 동기화"
                              >
                                동기화
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Manual Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-3xl w-full p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">수동 직접 세금계산서 발행</h3>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="text-[#78716c] hover:text-[#1c1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualIssue} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">발행 사업자 주체</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalSupplierEntity("CORP")}
                    className={`p-2 rounded border text-left font-bold transition ${
                      modalSupplierEntity === "CORP"
                        ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                        : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                    }`}
                  >
                    <div>(주)드래곤알피에이 [법인]</div>
                    <div className="text-[10px] font-normal font-mono opacity-80">806-88-03266</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalSupplierEntity("INDIVIDUAL")}
                    className={`p-2 rounded border text-left font-bold transition ${
                      modalSupplierEntity === "INDIVIDUAL"
                        ? "border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500"
                        : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                    }`}
                  >
                    <div>드래곤알피에이 [개인]</div>
                    <div className="text-[10px] font-normal font-mono opacity-80">295-03-02683</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">매출 분과</label>
                  <select
                    value={domainType}
                    onChange={(e) => setDomainType(e.target.value)}
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  >
                    <option value="TRADE_SALE">판매 (유통 커머스)</option>
                    <option value="RENTAL">임대 (장비 렌탈)</option>
                    <option value="OP_SERVICE">운영용역 (유지보수)</option>
                    <option value="DEV_SERVICE">개발용역 (SI 구축)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">작성/발행일자</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono"
                  />
                </div>
              </div>

              {/* 등록 고객사 조회 선택 */}
              <div className="flex flex-col gap-1 relative">
                <label className="font-bold text-[#78716c]">공급받는자 상호 (등록 고객사 조회 선택) *</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#78716c] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={custSearch}
                    onFocus={() => setShowCustDropdown(true)}
                    onChange={(e) => {
                      setCustSearch(e.target.value);
                      setCustName(e.target.value);
                      setShowCustDropdown(true);
                    }}
                    placeholder="고객사명, 사업자번호 검색하여 선택 또는 직접 입력"
                    required
                    className="w-full h-8 pl-8 pr-8 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-semibold"
                  />
                  {custSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustSearch("");
                        setCustName("");
                        setShowCustDropdown(true);
                      }}
                      className="absolute right-2 top-2 text-[#78716c] hover:text-[#1c1917]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {showCustDropdown && (
                  <div className="absolute top-[56px] left-0 right-0 z-30 max-h-48 overflow-y-auto rounded border border-[#b5a894] bg-[#f4efe4] shadow-xl divide-y divide-[#d0c6b4]">
                    {registeredPartners
                      .filter((p) => p.partnerType === "CUSTOMER" || p.partnerType === "BOTH")
                      .filter((p) => {
                        const q = custSearch.trim().toLowerCase();
                        if (!q) return true;
                        return [p.name, p.businessNo, p.ceoName, p.partnerCode]
                          .filter(Boolean)
                          .join(" ")
                          .toLowerCase()
                          .includes(q);
                      })
                      .map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => {
                            setCustName(p.name);
                            setCustSearch(p.name);
                            setShowCustDropdown(false);
                            setManualTaxSpec((prev) => extractPartnerTaxSpec(p, prev));
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-[#e2dbcd] flex items-center justify-between gap-2 transition"
                        >
                          <div className="flex flex-col">
                            <div className="font-bold text-[#1c1917] flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                              <span>{p.name}</span>
                              <span className="text-[10px] font-mono text-blue-700">({p.partnerCode})</span>
                            </div>
                            <div className="text-[10px] text-[#78716c] font-mono">
                              사업자: {p.businessNo || "-"} | 대표: {p.ceoName || "-"} | 업태/종목: {p.bizType || "-"} / {p.bizCategory || "-"}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] shrink-0">
                            선택
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <ContractTaxInvoiceSection
                spec={manualTaxSpec}
                onChange={setManualTaxSpec}
                domainLabel="세금계산서"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#b5a894] mt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="h-8 px-3 rounded font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-sm"
                >
                  국세청 전자세금계산서 발행
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 전자세금계산서 상세조회 Modal (Hometax / Popbill Style) */}
      {detailInvoice && (() => {
        const inv = detailInvoice;
        const supplierEntity = getEntity(inv.supplierEntityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP");
        const writeDateStr = inv.issueDate ? String(inv.issueDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
        const [, mm = "10", dd = "29"] = writeDateStr.split("-");
        const rawItems = Array.isArray(inv.taxItems) && inv.taxItems.length > 0
          ? inv.taxItems
          : [
              {
                month: mm,
                day: dd,
                itemName: inv.itemName || "용역/렌탈/판매 공급",
                spec: "",
                qty: 1,
                unitCost: Number(inv.supplyAmount || 0),
                supplyAmount: Number(inv.supplyAmount || 0),
                vatAmount: Number(inv.vatAmount || 0),
                remark: "",
              },
            ];
        const paddedRows = [...rawItems];
        while (paddedRows.length < 4) {
          paddedRows.push({ isBlank: true });
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white border border-slate-300 rounded shadow-2xl max-w-4xl w-full max-h-[94vh] overflow-y-auto text-slate-900">
              {/* Top Title Bar */}
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">전자세금계산서 상세조회</h3>
                <button
                  onClick={() => setDetailInvoice(null)}
                  className="text-slate-500 hover:text-slate-900 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-3 text-xs">
                {/* 승인번호 & 관리번호 헤더 */}
                <div className="flex items-center justify-between text-[11px] text-slate-600 px-1">
                  <div>
                    <span className="font-bold text-slate-800">계산서번호:</span>{" "}
                    <span className="font-mono">{inv.invoiceNo}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">국세청 승인번호:</span>{" "}
                    <span className="font-mono text-blue-700 font-semibold">{inv.ntsConfirmNo || "-"}</span>
                  </div>
                </div>

                {/* 공급자 / 공급받는자 Table */}
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <tbody>
                    <tr>
                      <th rowSpan={4} className="w-9 bg-[#f8d7da] text-[#842029] border border-red-300 font-bold text-center leading-tight p-1">
                        공<br />급<br />자
                      </th>
                      <th className="w-20 bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">등록번호</th>
                      <td className="border border-red-200 p-2 font-mono font-bold text-center text-slate-900">
                        {inv.supplierCorpNum || supplierEntity.bizNum}
                      </td>
                      <th className="w-16 bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">종사업장</th>
                      <td className="w-20 border border-red-200 p-2 text-center text-slate-600">-</td>

                      <th rowSpan={5} className="w-9 bg-[#cfe2ff] text-[#084298] border border-blue-300 font-bold text-center leading-tight p-1">
                        공<br />급<br />받<br />는<br />자
                      </th>
                      <th className="w-20 bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">등록번호</th>
                      <td className="border border-blue-200 p-2 font-mono font-bold text-center text-slate-900">
                        {inv.businessNo || "-"}
                      </td>
                      <th className="w-16 bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">종사업장</th>
                      <td className="w-20 border border-blue-200 p-2 text-center text-slate-600">-</td>
                    </tr>
                    <tr>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">상호</th>
                      <td className="border border-red-200 p-2 font-semibold text-slate-900">
                        {inv.supplierCorpName || supplierEntity.corpName}
                      </td>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">성명</th>
                      <td className="border border-red-200 p-2 text-slate-900">
                        {inv.supplierCeoName || supplierEntity.ceoName}
                      </td>

                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">상호</th>
                      <td className="border border-blue-200 p-2 font-semibold text-slate-900">
                        {inv.customerName}
                      </td>
                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">성명</th>
                      <td className="border border-blue-200 p-2 text-slate-900">
                        {inv.ceoName || "-"}
                      </td>
                    </tr>
                    <tr>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">사업장</th>
                      <td colSpan={3} className="border border-red-200 p-2 text-slate-800">
                        {supplierEntity.address}
                      </td>

                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">사업장</th>
                      <td colSpan={3} className="border border-blue-200 p-2 text-slate-800">
                        {inv.customerAddress || "-"}
                      </td>
                    </tr>
                    <tr>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">업태</th>
                      <td className="border border-red-200 p-2 text-slate-800">{supplierEntity.bizType}</td>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">종목</th>
                      <td className="border border-red-200 p-2 text-slate-800">{supplierEntity.bizClass}</td>

                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">업태</th>
                      <td className="border border-blue-200 p-2 text-slate-800">{inv.customerBizType || "-"}</td>
                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">종목</th>
                      <td className="border border-blue-200 p-2 text-slate-800">{inv.customerBizClass || "-"}</td>
                    </tr>
                    <tr>
                      <th className="bg-[#f8d7da] border border-red-300"></th>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">이메일</th>
                      <td colSpan={3} className="border border-red-200 p-2 font-mono text-slate-800">
                        {supplierEntity.email}
                      </td>

                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">이메일</th>
                      <td colSpan={3} className="border border-blue-200 p-2 font-mono text-slate-800">
                        <div>{inv.customerEmail || "-"}</div>
                        {inv.customerEmail2 && <div className="mt-0.5 text-slate-600">{inv.customerEmail2}</div>}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 작성일자 / 공급가액 / 세액 / 수정사유 / 비고 */}
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-[#ebf7f6] text-slate-800 font-bold">
                      <th className="border border-slate-300 p-2 text-center w-28">작성일자</th>
                      <th className="border border-slate-300 p-2 text-center w-36">공급가액</th>
                      <th className="border border-slate-300 p-2 text-center w-32">세액</th>
                      <th className="border border-slate-300 p-2 text-center w-28">수정사유</th>
                      <th className="border border-slate-300 p-2 text-center">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2 text-center font-mono">{writeDateStr}</td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                        {Number(inv.supplyAmount || 0).toLocaleString("ko-KR")}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                        {Number(inv.vatAmount || 0).toLocaleString("ko-KR")}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">해당없음</td>
                      <td className="border border-slate-300 p-2 text-left">{inv.memo || inv.itemName || ""}</td>
                    </tr>
                  </tbody>
                </table>

                {/* 품목 명세 테이블 */}
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-[#ebf7f6] text-slate-800 font-bold">
                      <th className="border border-slate-300 p-2 text-center w-10">월</th>
                      <th className="border border-slate-300 p-2 text-center w-10">일</th>
                      <th className="border border-slate-300 p-2 text-center">품목</th>
                      <th className="border border-slate-300 p-2 text-center w-24">규격</th>
                      <th className="border border-slate-300 p-2 text-center w-16">수량</th>
                      <th className="border border-slate-300 p-2 text-center w-28">단가</th>
                      <th className="border border-slate-300 p-2 text-center w-28">공급가액</th>
                      <th className="border border-slate-300 p-2 text-center w-24">세액</th>
                      <th className="border border-slate-300 p-2 text-center w-28">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paddedRows.map((row: any, idx: number) =>
                      row.isBlank ? (
                        <tr key={idx} className="h-8">
                          <td className="border border-slate-300 p-2">&nbsp;</td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                        </tr>
                      ) : (
                        <tr key={idx}>
                          <td className="border border-slate-300 p-2 text-center font-mono">{row.month || mm}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{row.day || dd}</td>
                          <td className="border border-slate-300 p-2 font-medium">{row.itemName}</td>
                          <td className="border border-slate-300 p-2 text-center">{row.spec || ""}</td>
                          <td className="border border-slate-300 p-2 text-right font-mono">
                            {row.qty != null ? Number(row.qty).toLocaleString("ko-KR") : "1"}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-mono">
                            {row.unitCost != null ? Number(row.unitCost).toLocaleString("ko-KR") : ""}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-semibold">
                            {row.supplyAmount != null ? Number(row.supplyAmount).toLocaleString("ko-KR") : ""}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-mono">
                            {row.vatAmount != null ? Number(row.vatAmount).toLocaleString("ko-KR") : ""}
                          </td>
                          <td className="border border-slate-300 p-2">{row.remark || ""}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>

                {/* 합계금액 / 현금 / 수표 / 어음 / 외상미수금 / 영수·청구 */}
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-[#ebf7f6] text-slate-800 font-bold">
                      <th className="border border-slate-300 p-2 text-center">합계금액</th>
                      <th className="border border-slate-300 p-2 text-center">현금</th>
                      <th className="border border-slate-300 p-2 text-center">수표</th>
                      <th className="border border-slate-300 p-2 text-center">어음</th>
                      <th className="border border-slate-300 p-2 text-center">외상미수금</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2.5 text-right font-mono font-bold text-sm">
                        {Number(inv.totalAmount || 0).toLocaleString("ko-KR")}
                      </td>
                      <td className="border border-slate-300 p-2.5"></td>
                      <td className="border border-slate-300 p-2.5"></td>
                      <td className="border border-slate-300 p-2.5"></td>
                      <td className="border border-slate-300 p-2.5"></td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-right text-xs text-slate-700 font-semibold pr-1">
                  이 금액을 ( <span className="font-bold text-slate-900">{inv.taxPurpose || "청구"}</span> ) 함
                </div>

                {/* 하단 액션 버튼 바 */}
                <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-200 mt-1">
                  <button
                    type="button"
                    onClick={() => setDetailInvoice(null)}
                    className="px-4 py-1.5 rounded border border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold text-xs"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPopbillView(inv)}
                    className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    국세청 서식 창 열기
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPopbillPrint(inv)}
                    className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    출력 (인쇄)
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
