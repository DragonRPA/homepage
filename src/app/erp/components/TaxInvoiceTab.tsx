"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  FileText, Plus, RefreshCw, Download, Upload, Search, 
  CheckCircle2, Printer, AlertCircle, X, ExternalLink, Send,
  Building2, UserCheck, ShieldCheck, Check,
  ArrowUpDown, CheckSquare, Square,
  Layers, ArrowLeftRight, Sparkles, Unlink, Link2, Database
} from "lucide-react";
import { EntityType, getEntity } from "@/lib/businessEntities";
import { formatErpNumber, formatErpCurrency, sortErpItems, SortDirection } from "@/lib/erpFormat";
import { ContractTaxInvoiceSection, BuyerTaxSpec, createDefaultTaxSpec, extractPartnerTaxSpec } from "./ContractTaxInvoiceSection";

interface TaxInvoiceTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onSelectEntity?: (entity: "ALL" | "CORP" | "INDIVIDUAL") => void;
}

type TaxSubTab = "UNISSUED" | "SALE_LEDGER" | "PURCHASE_LEDGER" | "HOMETAX_SYNC";

export const TaxInvoiceTab: React.FC<TaxInvoiceTabProps> = ({ 
  currentUser,
  selectedEntity = "ALL",
  onSelectEntity
}) => {
  // 4 Sub-tabs:
  // 1) UNISSUED (발행 대기 청구 목록)
  // 2) SALE_LEDGER (매출 세금계산서 & 미수납 채권)
  // 3) PURCHASE_LEDGER (매입 세금계산서 & 미지급 채무)
  // 4) HOMETAX_SYNC (홈택스 자동 수집 & 엑셀 업로드)
  const [activeSubTab, setActiveSubTab] = useState<TaxSubTab>("SALE_LEDGER");

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
  const [autoMatching, setAutoMatching] = useState(false);

  // Filters & Sorting
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [settlementFilter, setSettlementFilter] = useState<"ALL" | "UNPAID" | "PARTIAL" | "PAID">("ALL");
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

  useEffect(() => {
    setEntityFilter(selectedEntity);
  }, [selectedEntity]);

  // Modal State for Manual Issuance (SALE or PURCHASE)
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [modalIoType, setModalIoType] = useState<"SALE" | "PURCHASE">("SALE");
  const [modalSupplierEntity, setModalSupplierEntity] = useState<EntityType>(
    selectedEntity === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP"
  );
  const [custName, setCustName] = useState("");
  const [custSearch, setCustSearch] = useState("");
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [domainType, setDomainType] = useState("TRADE_SALE");
  const [manualNtsConfirmNo, setManualNtsConfirmNo] = useState("");
  const [manualTaxSpec, setManualTaxSpec] = useState<BuyerTaxSpec>(() =>
    createDefaultTaxSpec("용역/판매 품목", 1000000)
  );

  // Bank Reconciliation Modal State (1:1 / 1:N 입출금 비교 대사)
  const [reconcileInvoice, setReconcileInvoice] = useState<any | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [linkedBankTxs, setLinkedBankTxs] = useState<any[]>([]);
  const [candidateBankTxs, setCandidateBankTxs] = useState<any[]>([]);
  const [selectedBankTxIds, setSelectedBankTxIds] = useState<Set<number>>(new Set());
  const [bankSearchTerm, setBankSearchTerm] = useState("");
  const [manualSettleInput, setManualSettleInput] = useState<string>("");

  // Hometax Free Self-RPA & Excel Upload State (No Popbill Paid Scraping)
  const [htStartDate, setHtStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().slice(0, 10);
  });
  const [htEndDate, setHtEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [htSyncTarget, setHtSyncTarget] = useState<"ALL" | "SELL" | "BUY">("ALL");
  const [htSyncing, setHtSyncing] = useState(false);
  const [htSyncLogs, setHtSyncLogs] = useState<Array<{ time: string; message: string; type: "info" | "warn" | "success" }>>([]);
  const [excelUploadIoType, setExcelUploadIoType] = useState<"PURCHASE" | "SALE">("PURCHASE");
  const [excelUploading, setExcelUploading] = useState(false);
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const [rpaDeptUserId, setRpaDeptUserId] = useState("");
  const [rpaDeptUserPw, setRpaDeptUserPw] = useState("");
  const [rpaSaving, setRpaSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3800);
  };

  // 1. Fetch All Tax Invoices (매출 + 매입 통합 로드 후 탭별 필터링)
  const fetchIssuedInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
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

  // 2. Fetch Unissued Billings
  const fetchUnissuedBillings = async () => {
    setUnissuedLoading(true);
    try {
      const res = await fetch("/api/erp/tax-invoices?type=UNISSUED_BILLINGS");
      const data = await res.json();
      if (data.success) {
        setUnissuedBillings(data.billings || []);
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

  const fetchRpaSettings = async () => {
    try {
      const ent = entityFilter === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
      const res = await fetch(`/api/erp/tax-invoices/hometax?entityType=${ent}`);
      const data = await res.json();
      if (data.success && data.settings) {
        setRpaDeptUserId(data.settings.deptUserId || "");
        setRpaDeptUserPw(data.settings.deptUserPwMasked || "");
      }
    } catch (e) {
      console.error("Failed to fetch RPA settings:", e);
    }
  };

  useEffect(() => {
    fetchIssuedInvoices();
    fetchUnissuedBillings();
    fetchPartners();
    fetchRpaSettings();
  }, [entityFilter]);

  // Separate SALE and PURCHASE invoices
  const saleInvoices = useMemo(
    () => invoices.filter((i) => (i.ioType || "SALE") === "SALE"),
    [invoices]
  );
  const purchaseInvoices = useMemo(
    () => invoices.filter((i) => i.ioType === "PURCHASE"),
    [invoices]
  );

  const currentLedgerInvoices = useMemo(() => {
    const base = activeSubTab === "PURCHASE_LEDGER" ? purchaseInvoices : saleInvoices;
    return base.filter((i) => {
      if (activeSubTab === "SALE_LEDGER" && domainFilter !== "ALL" && i.domainType !== domainFilter) {
        return false;
      }
      if (settlementFilter !== "ALL") {
        const st = i.settlementStatus || "UNPAID";
        if (settlementFilter === "UNPAID" && st === "PAID") return false; // UNPAID filter shows UNPAID + PARTIAL (미수납/미지급 잔액 보유건)
        if (settlementFilter === "PARTIAL" && st !== "PARTIAL") return false;
        if (settlementFilter === "PAID" && st !== "PAID") return false;
      }
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
  }, [activeSubTab, saleInvoices, purchaseInvoices, domainFilter, settlementFilter, searchTerm]);

  const sortedInvoices = useMemo(() => {
    return sortErpItems(currentLedgerInvoices, sortKey, sortDir);
  }, [currentLedgerInvoices, sortKey, sortDir]);

  // Filtered Unissued Billings
  const filteredUnissued = useMemo(() => {
    return unissuedBillings.filter((b) => {
      if (domainFilter !== "ALL") {
        if (domainFilter === "RENTAL" && b.domainType !== "RENTAL") return false;
        if (domainFilter === "OP_SERVICE" && b.domainType !== "OP_SERVICE") return false;
        if (domainFilter === "DEV_SERVICE" && b.domainType !== "DEV_SERVICE") return false;
        if (domainFilter === "TRADE_SALE" && b.domainType !== "TRADE_SALE") return false;
      }
      if (entityFilter !== "ALL" && b.entityType !== entityFilter) return false;
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

  const sortedUnissued = useMemo(() => {
    return sortErpItems(filteredUnissued, unissuedSortKey, unissuedSortDir);
  }, [filteredUnissued, unissuedSortKey, unissuedSortDir]);

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

  const selectedSummary = useMemo(() => {
    const list = unissuedBillings.filter((b) => selectedBillingIds.has(getBillingUid(b)));
    const count = list.length;
    const supply = list.reduce((acc, cur) => acc + Number(cur.supplyAmount || 0), 0);
    const vat = list.reduce((acc, cur) => acc + Number(cur.vatAmount || 0), 0);
    const total = list.reduce((acc, cur) => acc + Number(cur.totalAmount || 0), 0);
    return { count, supply, vat, total };
  }, [unissuedBillings, selectedBillingIds]);

  // AR (매출채권) & AP (매입채무) KPI Stats (헌장 3.5 & 4.1 보존 법칙)
  const arStats = useMemo(() => {
    const count = saleInvoices.length;
    const totalGross = saleInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
    const totalSupply = saleInvoices.reduce((s, i) => s + Number(i.supplyAmount || 0), 0);
    const settled = saleInvoices.reduce((s, i) => s + Number(i.settledAmount || 0), 0);
    const unpaid = saleInvoices.reduce((s, i) => s + Math.max(0, Number(i.totalAmount || 0) - Number(i.settledAmount || 0)), 0);
    const unpaidCount = saleInvoices.filter((i) => (i.settlementStatus || "UNPAID") !== "PAID").length;
    const paidCount = saleInvoices.filter((i) => i.settlementStatus === "PAID").length;
    const diff = totalGross - (settled + unpaid);
    return { count, totalGross, totalSupply, settled, unpaid, unpaidCount, paidCount, diff };
  }, [saleInvoices]);

  const apStats = useMemo(() => {
    const count = purchaseInvoices.length;
    const totalGross = purchaseInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
    const totalSupply = purchaseInvoices.reduce((s, i) => s + Number(i.supplyAmount || 0), 0);
    const settled = purchaseInvoices.reduce((s, i) => s + Number(i.settledAmount || 0), 0);
    const unpaid = purchaseInvoices.reduce((s, i) => s + Math.max(0, Number(i.totalAmount || 0) - Number(i.settledAmount || 0)), 0);
    const unpaidCount = purchaseInvoices.filter((i) => (i.settlementStatus || "UNPAID") !== "PAID").length;
    const paidCount = purchaseInvoices.filter((i) => i.settlementStatus === "PAID").length;
    const diff = totalGross - (settled + unpaid);
    return { count, totalGross, totalSupply, settled, unpaid, unpaidCount, paidCount, diff };
  }, [purchaseInvoices]);

  // 거래처별 미수납 매출채권 / 미지급 매입채무 잔액 그룹핑 요약
  const unpaidByPartner = useMemo(() => {
    const base = activeSubTab === "PURCHASE_LEDGER" ? purchaseInvoices : saleInvoices;
    const map = new Map<
      string,
      { customerName: string; businessNo: string; count: number; unpaidAmount: number; oldestDate: string }
    >();
    for (const inv of base) {
      if ((inv.settlementStatus || "UNPAID") === "PAID") continue;
      const unpaidAmt = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.settledAmount || 0));
      if (unpaidAmt <= 0) continue;
      const name = (inv.customerName || "미지정").trim();
      const dateStr = inv.issueDate ? String(inv.issueDate).slice(0, 10) : "";
      const prev = map.get(name);
      if (!prev) {
        map.set(name, {
          customerName: name,
          businessNo: inv.businessNo || "",
          count: 1,
          unpaidAmount: unpaidAmt,
          oldestDate: dateStr,
        });
      } else {
        prev.count += 1;
        prev.unpaidAmount += unpaidAmt;
        if (dateStr && (!prev.oldestDate || dateStr < prev.oldestDate)) {
          prev.oldestDate = dateStr;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.unpaidAmount - a.unpaidAmount);
  }, [activeSubTab, saleInvoices, purchaseInvoices]);

  // 인라인 1클릭 완납(카드/현금/자동이체 기결제) 처리
  const handleQuickFullSettle = async (inv: any) => {
    const totalAmt = Math.round(Number(inv.totalAmount || 0));
    const label = inv.ioType === "PURCHASE" ? "지급완료" : "수납완료";
    if (
      !window.confirm(
        `[${inv.customerName}] ${inv.issueDate ? String(inv.issueDate).slice(0, 10) : ""}\n합계금액: ${formatErpCurrency(totalAmt)}\n해당 건을 전액 ${label} 처리하시겠습니까?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/erp/tax-invoices/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MANUAL_SETTLE",
          invoiceId: inv.id,
          settledAmount: totalAmt,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "완납 처리 실패");
      showToast(`${inv.customerName} (${formatErpCurrency(totalAmt)}) ${label} 처리되었습니다.`);
      await fetchIssuedInvoices();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Open Reconcile Modal (세금계산서 ↔ 통장 입출금 대사)
  const openReconcileModal = async (inv: any) => {
    setReconcileInvoice(inv);
    setSelectedBankTxIds(new Set());
    setBankSearchTerm("");
    setManualSettleInput(String(Math.round(Number(inv.settledAmount || 0))));
    setReconcileLoading(true);
    try {
      const res = await fetch(`/api/erp/tax-invoices/reconcile?invoiceId=${inv.id}`);
      const data = await res.json();
      if (data.success) {
        setLinkedBankTxs(data.linkedTransactions || []);
        setCandidateBankTxs(data.candidateTransactions || []);
      } else {
        throw new Error(data.error || "입출금 대사 후보 조회 실패");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setReconcileLoading(false);
    }
  };

  // Run Auto-Match (세금계산서 ↔ 통장 입출금 일괄 비교 대사)
  const handleAutoMatch = async (ioType: "SALE" | "PURCHASE" | "ALL") => {
    setAutoMatching(true);
    try {
      const res = await fetch("/api/erp/tax-invoices/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "AUTO_MATCH", ioType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "자동 대사 실패");
      showToast(data.message);
      await fetchIssuedInvoices();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setAutoMatching(false);
    }
  };

  // Match Selected Bank Transactions in Reconcile Modal
  const handleConfirmBankMatch = async () => {
    if (!reconcileInvoice || selectedBankTxIds.size === 0) {
      showToast("연결할 통장 입출금 내역을 1건 이상 선택해 주십시오.", "error");
      return;
    }
    try {
      setReconcileLoading(true);
      const res = await fetch("/api/erp/tax-invoices/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MATCH",
          invoiceId: reconcileInvoice.id,
          bankTxIds: Array.from(selectedBankTxIds),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "입출금 대사 연결 실패");
      showToast(data.message);
      await fetchIssuedInvoices();
      await openReconcileModal({
        ...reconcileInvoice,
        settledAmount: data.settledAmount,
        settlementStatus: data.settlementStatus,
      });
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setReconcileLoading(false);
    }
  };

  // Unmatch Bank Transaction
  const handleUnmatchBankTx = async (bankTxId?: number) => {
    if (!reconcileInvoice) return;
    try {
      setReconcileLoading(true);
      const res = await fetch("/api/erp/tax-invoices/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UNMATCH",
          invoiceId: reconcileInvoice.id,
          bankTxId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "대사 해제 실패");
      showToast(data.message);
      await fetchIssuedInvoices();
      await openReconcileModal({
        ...reconcileInvoice,
        settledAmount: data.settledAmount,
        settlementStatus: data.settlementStatus,
      });
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setReconcileLoading(false);
    }
  };

  // Manual Settlement Amount Override
  const handleManualSettleSave = async () => {
    if (!reconcileInvoice) return;
    const amt = Number(String(manualSettleInput).replace(/[^0-9]/g, "")) || 0;
    try {
      setReconcileLoading(true);
      const res = await fetch("/api/erp/tax-invoices/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MANUAL_SETTLE",
          invoiceId: reconcileInvoice.id,
          settledAmount: amt,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "수동 정산 반영 실패");
      showToast(data.message);
      await fetchIssuedInvoices();
      setReconcileInvoice(null);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setReconcileLoading(false);
    }
  };

  // Handle Free DragonRPA Local/Self-Hosted Hometax Collection (No Popbill Paid Scraping)
  const handleHometaxSync = async () => {
    setHtSyncing(true);
    const nowTime = new Date().toLocaleTimeString("ko-KR");
    setHtSyncLogs((prev) => [
      {
        time: nowTime,
        message: `[자체 RPA 수집] 팝빌 유료 API 미사용(₩0) · 자체 홈택스 수집기 실행 (${htStartDate} ~ ${htEndDate})`,
        type: "info",
      },
      ...prev,
    ]);
    try {
      const res = await fetch("/api/erp/tax-invoices/hometax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RUN_LOCAL_RPA",
          entityType: entityFilter === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP",
          startDate: htStartDate,
          endDate: htEndDate,
          syncTarget: htSyncTarget,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "자체 RPA 수집 실행 실패");

      const doneTime = new Date().toLocaleTimeString("ko-KR");
      setHtSyncLogs((prev) => [
        {
          time: doneTime,
          message: data.message,
          type: data.isServerlessHint ? "info" : "success",
        },
        ...prev,
      ]);
      showToast(data.message);
      await fetchIssuedInvoices();
    } catch (err: any) {
      const errTime = new Date().toLocaleTimeString("ko-KR");
      setHtSyncLogs((prev) => [{ time: errTime, message: err.message, type: "warn" }, ...prev]);
      showToast(err.message, "error");
    } finally {
      setHtSyncing(false);
    }
  };

  // Save Free DragonRPA Hometax Dept User Credentials
  const handleSaveRpaSettings = async () => {
    setRpaSaving(true);
    try {
      const res = await fetch("/api/erp/tax-invoices/hometax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_RPA_SETTINGS",
          entityType: entityFilter === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP",
          deptUserId: rpaDeptUserId,
          deptUserPw: rpaDeptUserPw,
          autoReconcile: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "설정 저장 실패");
      showToast(data.message);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setRpaSaving(false);
    }
  };

  // Handle Hometax Excel Upload
  const handleHometaxExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("ioType", excelUploadIoType);
      fd.append("entityType", entityFilter === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP");

      const res = await fetch("/api/erp/tax-invoices/hometax", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "홈택스 엑셀 업로드 실패");

      const doneTime = new Date().toLocaleTimeString("ko-KR");
      setHtSyncLogs((prev) => [
        { time: doneTime, message: `[엑셀 업로드] ${file.name} ➔ ${data.message}`, type: "success" },
        ...prev,
      ]);
      showToast(data.message);
      await fetchIssuedInvoices();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setExcelUploading(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  // Handle Batch Issue from Selected Contract Billings
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

      showToast(data.message || `선택한 ${selectedList.length}건의 전자세금계산서가 발행되었습니다.`);
      setSelectedBillingIds(new Set());
      await fetchUnissuedBillings();
      await fetchIssuedInvoices();
      setActiveSubTab("SALE_LEDGER");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setBatchIssuing(false);
    }
  };

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
      setActiveSubTab("SALE_LEDGER");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Manual Issue / Purchase Invoice Registration Modal Submit
  const handleManualIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalSupply = manualTaxSpec.taxItems.reduce((s, r) => s + Number(r.supplyAmount || 0), 0);
    const totalVat = manualTaxSpec.taxItems.reduce((s, r) => s + Number(r.vatAmount || 0), 0);
    const firstItemName = manualTaxSpec.taxItems[0]?.itemName || (modalIoType === "PURCHASE" ? "매입 품목" : "용역/판매 품목");
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
          ioType: modalIoType,
          sourceType: "MANUAL",
          ntsConfirmNo: manualNtsConfirmNo.trim() || undefined,
          supplierEntityType: modalSupplierEntity,
          domainType: modalIoType === "PURCHASE" ? "PURCHASE_EXPENSE" : domainType,
          customerName: custName.trim(),
          businessNo: manualTaxSpec.customerBizNo || "100-00-00000",
          ceoName: manualTaxSpec.customerCeoName || "대표자",
          customerAddress: manualTaxSpec.customerAddress || "",
          customerBizType: manualTaxSpec.customerBizType || "",
          customerBizClass: manualTaxSpec.customerBizClass || "",
          customerEmail: manualTaxSpec.customerEmail || "",
          customerEmail2: manualTaxSpec.customerEmail2 || "",
          purposeType: manualTaxSpec.taxPurpose || "청구",
          itemName: summaryItemName,
          supplyAmount: totalSupply,
          vatAmount: totalVat,
          issueDate,
          memo: manualTaxSpec.taxMemo || summaryItemName,
          taxItems: manualTaxSpec.taxItems,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "등록 실패");

      showToast(
        modalIoType === "PURCHASE"
          ? `매입 세금계산서 [${data.invoice.invoice_no || data.invoice.invoiceNo}] 등록 완료 (미지급 매입채무 반영)`
          : `매출 전자세금계산서 [${data.invoice.invoice_no || data.invoice.invoiceNo}] 발행 완료`
      );
      setShowIssueModal(false);
      setCustName("");
      setCustSearch("");
      setManualNtsConfirmNo("");
      setManualTaxSpec(createDefaultTaxSpec("용역/판매 품목", 1000000));
      fetchIssuedInvoices();
      setActiveSubTab(modalIoType === "PURCHASE" ? "PURCHASE_LEDGER" : "SALE_LEDGER");
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

  const handleOpenPopbillPortal = async (actionType: "PORTAL_URL" | "CERT_URL") => {
    try {
      const res = await fetch("/api/erp/tax-invoices/popbill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "팝빌 테스트베드 URL 생성 실패");
      window.open(data.url, "_blank", "width=1100,height=820,scrollbars=yes");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

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

  const [sendingNts, setSendingNts] = useState(false);

  const handleSendToNTS = async (inv: any) => {
    if (
      !window.confirm(
        `[${inv.invoiceNo}] ${inv.customerName}\n공급가액: ${formatErpCurrency(inv.supplyAmount)}\n발행완료(전송전) 상태의 세금계산서를 국세청으로 즉시전송 처리하시겠습니까?`
      )
    ) {
      return;
    }
    try {
      setSendingNts(true);
      const res = await fetch("/api/erp/tax-invoices/popbill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_TO_NTS",
          mgtKey: inv.invoiceNo,
          corpNum: inv.supplierCorpNum,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "국세청 즉시전송 실패");

      showToast(data.message || `[${inv.invoiceNo}] 국세청 즉시전송 완료`);
      await fetchIssuedInvoices();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSendingNts(false);
    }
  };

  const pendingNtsInvoices = useMemo(
    () => saleInvoices.filter((i) => i.status !== "SENT_NTS"),
    [saleInvoices]
  );

  const handleBatchSendToNTS = async () => {
    if (pendingNtsInvoices.length === 0) {
      showToast("전송 대기 중인 세금계산서가 없습니다.", "error");
      return;
    }
    if (
      !window.confirm(
        `발행후 전송전 상태인 세금계산서 ${pendingNtsInvoices.length}건을 국세청으로 일괄 즉시전송 하시겠습니까?`
      )
    ) {
      return;
    }
    try {
      setSendingNts(true);
      const res = await fetch("/api/erp/tax-invoices/popbill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_TO_NTS",
          mgtKeys: pendingNtsInvoices.map((i) => i.invoiceNo),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "국세청 일괄 즉시전송 실패");

      showToast(data.message || `${data.sentCount}건 국세청 즉시전송 완료`);
      await fetchIssuedInvoices();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSendingNts(false);
    }
  };

  const filteredCandidateTxs = useMemo(() => {
    const q = bankSearchTerm.trim().toLowerCase();
    if (!q) return candidateBankTxs;
    return candidateBankTxs.filter((tx) =>
      [tx.senderReceiver, tx.counterpartyHolder, tx.memo, tx.transDate, String(tx.depositAmount || tx.withdrawalAmount || "")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [candidateBankTxs, bankSearchTerm]);

  const activeStats = activeSubTab === "PURCHASE_LEDGER" ? apStats : arStats;
  const isPurchaseTab = activeSubTab === "PURCHASE_LEDGER";

  return (
    <div className="flex flex-col min-h-full md:h-full md:overflow-hidden select-none bg-[#f4efe4] text-[#1c1917]">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-16 right-4 md:right-6 z-50 px-4 py-2.5 rounded shadow text-xs font-bold flex items-center gap-2 border ${
            toast.type === "error"
              ? "bg-rose-950 border-rose-800 text-rose-200"
              : "bg-emerald-950 border-emerald-800 text-emerald-200"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1. Top Sub-Tabs Navigation (4 Sub-Tabs) */}
      <div className="px-2.5 md:px-3 pt-2 pb-1.5 md:pb-0 border-b border-[#b5a894] bg-[#ebe5d8] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full">
          <button
            onClick={() => setActiveSubTab("UNISSUED")}
            className={`flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-t font-bold text-xs transition border-t border-l border-r whitespace-nowrap shrink-0 ${
              activeSubTab === "UNISSUED"
                ? "bg-[#f4efe4] border-[#b5a894] text-[#1c1917] border-b-transparent shadow-sm"
                : "bg-[#e2dbcd] border-transparent text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span>발행 대기</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
              {unissuedBillings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("SALE_LEDGER")}
            className={`flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-t font-bold text-xs transition border-t border-l border-r whitespace-nowrap shrink-0 ${
              activeSubTab === "SALE_LEDGER"
                ? "bg-[#f4efe4] border-[#b5a894] text-[#1c1917] border-b-transparent shadow-sm"
                : "bg-[#e2dbcd] border-transparent text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>매출 · 채권</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
              {saleInvoices.length}
            </span>
            {arStats.unpaidCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 font-mono">
                미수 {arStats.unpaidCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("PURCHASE_LEDGER")}
            className={`flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-t font-bold text-xs transition border-t border-l border-r whitespace-nowrap shrink-0 ${
              activeSubTab === "PURCHASE_LEDGER"
                ? "bg-[#f4efe4] border-[#b5a894] text-[#1c1917] border-b-transparent shadow-sm"
                : "bg-[#e2dbcd] border-transparent text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>매입 · 채무</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
              {purchaseInvoices.length}
            </span>
            {apStats.unpaidCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 font-mono">
                미지급 {apStats.unpaidCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("HOMETAX_SYNC")}
            className={`flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-t font-bold text-xs transition border-t border-l border-r whitespace-nowrap shrink-0 ${
              activeSubTab === "HOMETAX_SYNC"
                ? "bg-[#f4efe4] border-[#b5a894] text-[#1c1917] border-b-transparent shadow-sm"
                : "bg-[#e2dbcd] border-transparent text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
            <span>홈택스 수집</span>
          </button>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-1.5 pb-1 text-[11px] overflow-x-auto max-w-full">
          <button
            onClick={() => handleAutoMatch("ALL")}
            disabled={autoMatching}
            className="flex items-center gap-1 h-7 px-2 rounded text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 border border-teal-900 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
            title="매출/매입 세금계산서와 통장 입출금 내역 자동 비교 대사"
          >
            <ArrowLeftRight className={`w-3.5 h-3.5 shrink-0 ${autoMatching ? "animate-spin" : ""}`} />
            <span>자동대사</span>
          </button>

          <button
            onClick={() => {
              setModalIoType("PURCHASE");
              setShowIssueModal(true);
            }}
            className="flex items-center gap-1 h-7 px-2 rounded text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-500 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>매입등록</span>
          </button>

          <button
            onClick={() => {
              setModalIoType("SALE");
              setShowIssueModal(true);
            }}
            className="flex items-center gap-1 h-7 px-2 rounded text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 border border-blue-900 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>매출발행</span>
          </button>

          <button
            onClick={() => handleOpenPopbillPortal("PORTAL_URL")}
            className="hidden sm:flex items-center gap-1 h-7 px-2.5 rounded text-xs font-bold text-indigo-800 bg-indigo-100 hover:bg-indigo-200 border border-indigo-400 shadow-sm whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>팝빌 문서함</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards: Shown in SALE_LEDGER & PURCHASE_LEDGER */}
      {(activeSubTab === "SALE_LEDGER" || activeSubTab === "PURCHASE_LEDGER") && (
        <div className="p-3 border-b border-[#b5a894] bg-[#ebe5d8] grid grid-cols-1 md:grid-cols-4 gap-2.5 shrink-0">
          {/* Card 1: 총 발행/수취 합계 */}
          <div
            onClick={() => setSettlementFilter("ALL")}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded border border-[#b5a894] cursor-pointer transition ${
              settlementFilter === "ALL" ? "ring-2 ring-blue-600 bg-[#f4efe4]" : "bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#78716c]">
                {isPurchaseTab ? "총 매입 세금계산서 합계" : "총 매출 세금계산서 합계"} ({activeStats.count}건)
              </span>
              <span className="text-base font-bold text-[#1c1917] font-mono">
                {formatErpCurrency(activeStats.totalGross)}
              </span>
              <span className="text-[10px] text-[#78716c] font-mono">
                공급가액 {formatErpCurrency(activeStats.totalSupply)}
              </span>
            </div>
            <FileText className="w-7 h-7 text-blue-700 opacity-80 shrink-0" />
          </div>

          {/* Card 2: 수납완료 / 지급완료 */}
          <div
            onClick={() => setSettlementFilter("PAID")}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded border border-[#b5a894] cursor-pointer transition ${
              settlementFilter === "PAID" ? "ring-2 ring-emerald-600 bg-[#f4efe4]" : "bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-emerald-800">
                {isPurchaseTab ? "지급 완료 금액 (통장 출금 확인)" : "수납 완료 금액 (통장 입금 확인)"} ({activeStats.paidCount}건)
              </span>
              <span className="text-base font-bold text-emerald-800 font-mono">
                {formatErpCurrency(activeStats.settled)}
              </span>
              <span className="text-[10px] text-[#78716c] font-mono">
                정산율 {activeStats.totalGross > 0 ? Math.round((activeStats.settled / activeStats.totalGross) * 100) : 0}%
              </span>
            </div>
            <CheckCircle2 className="w-7 h-7 text-emerald-700 opacity-80 shrink-0" />
          </div>

          {/* Card 3: 미수납 매출채권 / 미지급 매입채무 */}
          <div
            onClick={() => setSettlementFilter((prev) => (prev === "UNPAID" ? "ALL" : "UNPAID"))}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded border border-[#b5a894] cursor-pointer transition ${
              settlementFilter === "UNPAID" ? "ring-2 ring-rose-600 bg-[#f4efe4]" : "bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-rose-800">
                {isPurchaseTab ? "미지급 매입채무 잔액" : "미수납 매출채권 잔액"} ({activeStats.unpaidCount}건)
              </span>
              <span className="text-base font-bold text-rose-700 font-mono">
                {formatErpCurrency(activeStats.unpaid)}
              </span>
              <span className="text-[10px] text-[#78716c]">
                {settlementFilter === "UNPAID" ? "미정산 필터 적용중 (재클릭시 해제)" : "클릭 시 미정산 대상 및 거래처별 잔액 표시"}
              </span>
            </div>
            <AlertCircle className="w-7 h-7 text-rose-700 opacity-80 shrink-0" />
          </div>

          {/* Card 4: 대차대조 보존 검증 */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded border border-[#b5a894] bg-[#f4efe4]">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#78716c]">
                {isPurchaseTab ? "매입채무 대차 보존 검증" : "매출채권 대차 보존 검증"}
              </span>
              <span className="text-sm font-bold text-emerald-800 font-mono">
                대차 차액 {formatErpCurrency(activeStats.diff)}
              </span>
              <span className="text-[10px] text-[#78716c] font-mono">
                총액 = {isPurchaseTab ? "지급완료 + 미지급채무" : "수납완료 + 미수납채권"}
              </span>
            </div>
            <ShieldCheck className="w-7 h-7 text-emerald-700 opacity-80 shrink-0" />
          </div>

          {/* 거래처별 미수납 매출채권 / 미지급 매입채무 원클릭 요약 바 */}
          {unpaidByPartner.length > 0 && (
            <div className="md:col-span-4 px-3 py-2 rounded border border-[#b5a894] bg-[#f4efe4] flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-[11px] text-rose-800 whitespace-nowrap">
                {isPurchaseTab ? "거래처별 미지급 채무 요약:" : "거래처별 미수납 채권 요약:"}
              </span>
              {unpaidByPartner.map((p) => {
                const isSelected = searchTerm === p.customerName && settlementFilter === "UNPAID";
                return (
                  <button
                    key={p.customerName}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSearchTerm("");
                      } else {
                        setSettlementFilter("UNPAID");
                        setSearchTerm(p.customerName);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] whitespace-nowrap transition cursor-pointer ${
                      isSelected
                        ? "bg-rose-700 text-white border-rose-900 font-bold"
                        : "bg-[#ebe5d8] hover:bg-[#dfd7c7] text-[#1c1917] border-[#b5a894]"
                    }`}
                  >
                    <span className="font-bold">{p.customerName}</span>
                    <span className="font-mono opacity-80">({p.count}건)</span>
                    <span className={`font-mono font-extrabold ${isSelected ? "text-white" : "text-rose-700"}`}>
                      {formatErpCurrency(p.unpaidAmount)}
                    </span>
                  </button>
                );
              })}
              {(settlementFilter === "UNPAID" || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setSettlementFilter("ALL");
                    setSearchTerm("");
                  }}
                  className="ml-auto px-2 py-0.5 rounded bg-[#dfd7c7] hover:bg-[#d0c6b4] border border-[#b5a894] text-[11px] font-bold text-[#44403c] whitespace-nowrap"
                >
                  필터 초기화
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Filter & Pipeline Toolbar (Gutenberg Z-Pattern Top Left Scope + Top Right Pipeline) */}
      {activeSubTab !== "HOMETAX_SYNC" && (
        <div className="p-3 border-b border-[#b5a894] bg-[#f4efe4] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 사업자 구분 */}
            <div className="flex flex-col gap-1">
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

            {/* 매출 분과 (매출 탭 및 발행대기 탭에서만 노출) */}
            {activeSubTab !== "PURCHASE_LEDGER" && (
              <div className="flex flex-col gap-1">
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
            )}

            {/* 채권/채무 정산 상태 필터 */}
            {(activeSubTab === "SALE_LEDGER" || activeSubTab === "PURCHASE_LEDGER") && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#78716c]">
                  {isPurchaseTab ? "지급 상태" : "수납 상태"}
                </span>
                <select
                  value={settlementFilter}
                  onChange={(e) => setSettlementFilter(e.target.value as any)}
                  className="h-8 px-2 rounded text-xs font-bold border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                >
                  <option value="ALL">전체 상태</option>
                  <option value="UNPAID">{isPurchaseTab ? "미지급 채무 보유 (미지급+부분)" : "미수납 채권 보유 (미수납+부분)"}</option>
                  <option value="PARTIAL">{isPurchaseTab ? "부분 지급" : "부분 수납"}</option>
                  <option value="PAID">{isPurchaseTab ? "지급 완료" : "수납 완료"}</option>
                </select>
              </div>
            )}

            {/* 검색 */}
            <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[160px]">
              <span className="text-[10px] font-bold text-[#78716c]">검색</span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#78716c]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="거래처명, 품목, 계산서번호"
                  className="h-8 pl-8 pr-3 rounded text-xs border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] w-full sm:w-56"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (activeSubTab === "UNISSUED") fetchUnissuedBillings();
                else fetchIssuedInvoices();
              }}
              className="flex items-center gap-1 h-8 px-2.5 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] mt-4"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(loading || unissuedLoading) ? "animate-spin" : ""}`} />
              <span>조회</span>
            </button>
          </div>

          {/* Right Pipeline Actions per Sub-Tab */}
          {activeSubTab === "UNISSUED" && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#b5a894] bg-[#ebe5d8] text-xs font-medium">
                <span className="text-[#78716c]">선택:</span>
                <span className="font-bold text-blue-800 font-mono">{selectedSummary.count}건</span>
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
              >
                <Layers className="w-3.5 h-3.5" />
                <span>선택 청구 묶음 발행 ({selectedSummary.count}건)</span>
              </button>

              <button
                onClick={() => handleBatchIssue(false)}
                disabled={selectedSummary.count === 0 || batchIssuing}
                className={`flex items-center gap-1.5 h-8 px-3.5 rounded text-xs font-bold shadow-sm transition ${
                  selectedSummary.count > 0 && !batchIssuing
                    ? "bg-blue-700 hover:bg-blue-800 text-white border border-blue-900 cursor-pointer"
                    : "bg-[#d8d0c2] text-[#a8a29e] border border-[#b5a894] cursor-not-allowed"
                }`}
              >
                <Send className={`w-3.5 h-3.5 ${batchIssuing ? "animate-pulse" : ""}`} />
                <span>선택 청구 일괄 발행 ({selectedSummary.count}건)</span>
              </button>
            </div>
          )}

          {(activeSubTab === "SALE_LEDGER" || activeSubTab === "PURCHASE_LEDGER") && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleAutoMatch(isPurchaseTab ? "PURCHASE" : "SALE")}
                disabled={autoMatching}
                className="flex items-center gap-1.5 h-8 px-3 rounded text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white border border-teal-900 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isPurchaseTab ? "출금 내역 자동 비교 대사" : "입금 내역 자동 비교 대사"}</span>
              </button>

              {activeSubTab === "SALE_LEDGER" && pendingNtsInvoices.length > 0 && (
                <button
                  onClick={handleBatchSendToNTS}
                  disabled={sendingNts}
                  className="flex items-center gap-1.5 h-8 px-3 rounded text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-900 shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>전송전 일괄 즉시전송 ({pendingNtsInvoices.length}건)</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (sortedInvoices.length === 0) {
                    showToast("내보낼 세금계산서 데이터가 없습니다.", "error");
                    return;
                  }
                  const csvHeader = "구분,계산서번호,작성일자,거래처명,사업자번호,품목명,공급가액,세액,합계금액,정산완료액,미수납_미지급잔액,정산상태,국세청승인번호\n";
                  const csvRows = sortedInvoices.map((i) => [
                    i.ioType === "PURCHASE" ? "매입" : "매출",
                    i.invoiceNo,
                    i.issueDate ? String(i.issueDate).slice(0, 10) : "",
                    `"${(i.customerName || "").replace(/"/g, '""')}"`,
                    i.businessNo || "",
                    `"${(i.itemName || "").replace(/"/g, '""')}"`,
                    Math.round(i.supplyAmount || 0),
                    Math.round(i.vatAmount || 0),
                    Math.round(i.totalAmount || 0),
                    Math.round(i.settledAmount || 0),
                    Math.round(Math.max(0, Number(i.totalAmount || 0) - Number(i.settledAmount || 0))),
                    i.settlementStatus || "UNPAID",
                    i.ntsConfirmNo || "",
                  ].join(",")).join("\n");

                  const blob = new Blob(["\uFEFF" + csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${isPurchaseTab ? "매입세금계산서_채무대장" : "매출세금계산서_채권대장"}_${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast("엑셀(CSV) 내보내기가 완료되었습니다.");
                }}
                className="flex items-center gap-1 h-8 px-2.5 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>엑셀 내보내기</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Body Content Area */}
      <div className="flex-1 md:overflow-auto p-2.5 md:p-3">
        {/* ============================================================== */}
        {/* SUB-TAB 1: UNISSUED BILLINGS (발행 대기 청구 목록)            */}
        {/* ============================================================== */}
        {activeSubTab === "UNISSUED" && (
          <div className="border border-[#b5a894] rounded bg-[#ebe5d8] overflow-hidden flex flex-col md:h-full shadow-sm">
            <div className="p-2 border-b border-[#b5a894] bg-[#dfd7c7] flex items-center justify-between text-xs font-bold text-[#57534e]">
              <span>계약 청구 발행 대기 목록</span>
              <span className="text-[11px] text-[#78716c]">총 {sortedUnissued.length}건 대기</span>
            </div>

            <div className="flex-1 overflow-x-auto md:overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-[#ded6c5] border-b border-[#b5a894] text-[#44403c] font-bold z-10">
                  <tr>
                    <th className="p-2 w-10 text-center border-r border-[#b5a894]">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center p-0.5 rounded hover:bg-[#cecaa8]"
                      >
                        {selectedBillingIds.size > 0 && selectedBillingIds.size === filteredUnissued.length ? (
                          <CheckSquare className="w-4 h-4 text-blue-700" />
                        ) : (
                          <Square className="w-4 h-4 text-[#78716c]" />
                        )}
                      </button>
                    </th>
                    <th className="p-2 text-center w-24 border-r border-[#b5a894] whitespace-nowrap">단건발행</th>
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
                    <th className="p-2 text-center w-28 whitespace-nowrap">발행사업자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#b5a894]">
                  {sortedUnissued.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-[#78716c]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-[#a8a29e]" />
                          <span className="font-semibold text-sm">발행 대기 중인 계약 청구 내역이 없습니다.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedUnissued.map((b) => {
                      const uid = getBillingUid(b);
                      const isSelected = selectedBillingIds.has(uid);
                      const isRental = b.domainType === "RENTAL";
                      return (
                        <tr key={uid} className={`hover:bg-[#dfd7c7] transition ${isSelected ? "bg-blue-50/50" : ""}`}>
                          <td className="p-2 text-center border-r border-[#b5a894]">
                            <button onClick={() => toggleSelectBilling(uid)} className="p-0.5 rounded hover:bg-[#cecaa8]">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-700" />
                              ) : (
                                <Square className="w-4 h-4 text-[#78716c]" />
                              )}
                            </button>
                          </td>
                          <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                            <button
                              onClick={() => handleSingleIssueFromBilling(b)}
                              className="px-2 py-1 rounded text-[11px] font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-sm"
                            >
                              즉시 발행
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
                          <td className="p-2 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.entityType === "INDIVIDUAL" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                            }`}>
                              {b.entityType === "INDIVIDUAL" ? "개인사업자" : "(주)법인"}
                            </span>
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
        {/* SUB-TAB 2 & 3: SALE_LEDGER (매출/채권) & PURCHASE_LEDGER (매입/채무) */}
        {/* ============================================================== */}
        {(activeSubTab === "SALE_LEDGER" || activeSubTab === "PURCHASE_LEDGER") && (
          <div className="border border-[#b5a894] rounded bg-[#ebe5d8] overflow-hidden flex flex-col md:h-full shadow-sm">
            <div className="p-2 border-b border-[#b5a894] bg-[#dfd7c7] flex items-center justify-between text-xs font-bold text-[#57534e]">
              <div className="flex items-center gap-2">
                <span>
                  {isPurchaseTab
                    ? "매입 세금계산서 및 미지급 매입채무 대장"
                    : "매출 세금계산서 및 미수납 매출채권 대장"}
                </span>
              </div>
              <div className="text-[11px] text-[#78716c] font-mono">
                조회 {sortedInvoices.length}건
              </div>
            </div>

            {/* 모바일 전용 카드형 대장 (가로폭 100% 최적화) */}
            <div className="md:hidden divide-y divide-[#b5a894]">
              {sortedInvoices.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#78716c]">
                  조회된 세금계산서 내역이 없습니다.
                </div>
              ) : (
                sortedInvoices.map((inv) => {
                  const totalAmt = Number(inv.totalAmount || 0);
                  const settledAmt = Number(inv.settledAmount || 0);
                  const unpaidAmt = Math.max(0, totalAmt - settledAmt);
                  const st = inv.settlementStatus || "UNPAID";
                  const txIds: number[] = Array.isArray(inv.matchedBankTxIds) ? inv.matchedBankTxIds : [];

                  return (
                    <div key={inv.id} className="p-3 bg-[#ebe5d8] flex flex-col gap-2">
                      {/* 1행: 거래처명 + 상태 배지 */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              inv.supplierEntityType === "INDIVIDUAL"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-blue-100 text-blue-900 border border-blue-300"
                            }`}
                          >
                            {inv.supplierEntityType === "INDIVIDUAL" ? "개인" : "법인"}
                          </span>
                          <span className="font-bold text-xs text-[#1c1917] truncate">
                            {inv.customerName}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            st === "PAID"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : st === "PARTIAL"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-rose-100 text-rose-800 border border-rose-300"
                          }`}
                        >
                          {st === "PAID"
                            ? isPurchaseTab ? "지급완료" : "수납완료"
                            : st === "PARTIAL"
                            ? isPurchaseTab ? "부분지급" : "부분수납"
                            : isPurchaseTab ? "미지급" : "미수납"}
                        </span>
                      </div>

                      {/* 2행: 작성일자 + 품목명 */}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#57534e]">
                        <span className="truncate font-medium text-[#1c1917]">{inv.itemName}</span>
                        <span className="font-mono shrink-0">
                          {inv.issueDate ? String(inv.issueDate).slice(0, 10) : "-"}
                        </span>
                      </div>

                      {/* 3행: 합계금액 / 정산액 / 미결잔액 */}
                      <div className="grid grid-cols-3 gap-1.5 p-2 rounded bg-[#f4efe4] border border-[#c4b6a0] text-[11px]">
                        <div>
                          <span className="block text-[10px] text-[#78716c]">합계금액</span>
                          <span className="font-mono font-bold text-[#1c1917]">
                            {formatErpCurrency(totalAmt)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-[#78716c]">
                            {isPurchaseTab ? "지급완료" : "수납완료"}
                          </span>
                          <span className="font-mono font-bold text-emerald-800">
                            {formatErpCurrency(settledAmt)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-[#78716c]">
                            {isPurchaseTab ? "미지급잔액" : "미수납잔액"}
                          </span>
                          <span
                            className={`font-mono font-extrabold ${
                              unpaidAmt > 0 ? "text-rose-700" : "text-[#a8a29e]"
                            }`}
                          >
                            {formatErpCurrency(unpaidAmt)}
                          </span>
                        </div>
                      </div>

                      {/* 4행: 액션 버튼 바 */}
                      <div className="flex items-center justify-between gap-1.5 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openReconcileModal(inv)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold border flex items-center gap-1 ${
                              st === "PAID"
                                ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                                : "border-teal-800 bg-teal-700 text-white"
                            }`}
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>{isPurchaseTab ? "출금 대사" : "입금 대사"}</span>
                            {txIds.length > 0 && <span className="font-mono">({txIds.length})</span>}
                          </button>

                          {st !== "PAID" && (
                            <button
                              onClick={() => handleQuickFullSettle(inv)}
                              className="px-2.5 py-1 rounded text-[11px] font-bold border border-amber-700 bg-amber-100 text-amber-900"
                            >
                              완납확정
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => setDetailInvoice(inv)}
                          className="px-2.5 py-1 rounded text-[11px] font-bold border border-blue-700 bg-blue-600 text-white"
                        >
                          상세보기
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* PC 전용 고밀도 테이블 */}
            <div className="hidden md:block flex-1 overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-[#ded6c5] border-b border-[#b5a894] text-[#44403c] font-bold z-10">
                  <tr>
                    {/* 헌장 3.2: 핵심 액션 컬럼 좌측 제1컬럼 배치 */}
                    <th className="p-2 text-center w-48 border-r border-[#b5a894] whitespace-nowrap">
                      <span>입출금 대사 · 세금계산서 조치</span>
                    </th>
                    <th className="p-2 text-center w-24 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 cursor-pointer" onClick={() => handleSort("settlementStatus")}>
                        <span>{isPurchaseTab ? "지급상태" : "수납상태"}</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-left w-24 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort("issueDate")}>
                        <span>작성일자</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-left border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort("customerName")}>
                        <span>{isPurchaseTab ? "공급자 (매입거래처)" : "공급받는자 (매출거래처)"}</span>
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
                        <span>세액</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-right w-28 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort("totalAmount")}>
                        <span>합계금액</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-right w-28 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort("settledAmount")}>
                        <span>{isPurchaseTab ? "지급완료액" : "수납완료액"}</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-right w-32 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort("unpaidAmount")}>
                        <span>{isPurchaseTab ? "미지급 채무잔액" : "미수납 채권잔액"}</span>
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      </div>
                    </th>
                    <th className="p-2 text-center w-24 border-r border-[#b5a894] whitespace-nowrap">
                      <span>수집/발행출처</span>
                    </th>
                    <th className="p-2 text-left w-36 whitespace-nowrap">
                      <span>계산서번호 / 승인번호</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#b5a894]">
                  {sortedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-[#78716c]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText className="w-8 h-8 text-[#a8a29e]" />
                          <span className="font-semibold text-sm">
                            {isPurchaseTab
                              ? "등록된 매입 세금계산서 내역이 없습니다."
                              : "조회된 매출 세금계산서 내역이 없습니다."}
                          </span>
                          <span className="text-xs text-[#78716c]">
                            {isPurchaseTab
                              ? "우측 상단 [매입 세금계산서 등록] 또는 [홈택스 자동 수집 · 엑셀 업로드] 탭에서 매입 세금계산서를 등록해 주십시오."
                              : "상단 [발행 대기 청구 목록] 또는 [홈택스 자동 수집]을 통해 매출 세금계산서를 등록해 주십시오."}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedInvoices.map((inv) => {
                      const totalAmt = Number(inv.totalAmount || 0);
                      const settledAmt = Number(inv.settledAmount || 0);
                      const unpaidAmt = Math.max(0, totalAmt - settledAmt);
                      const st = inv.settlementStatus || "UNPAID";
                      const txIds: number[] = Array.isArray(inv.matchedBankTxIds) ? inv.matchedBankTxIds : [];

                      return (
                        <tr key={inv.id} className="hover:bg-[#dfd7c7] transition">
                          {/* 1. 좌측 제1컬럼: 입출금 대사 및 세금계산서 액션 */}
                          <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openReconcileModal(inv)}
                                className={`px-2 py-1 rounded text-[10px] font-bold border shadow-xs flex items-center gap-1 cursor-pointer ${
                                  st === "PAID"
                                    ? "border-emerald-700 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                    : "border-teal-800 bg-teal-700 text-white hover:bg-teal-800"
                                }`}
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span>{isPurchaseTab ? "출금 대사" : "입금 대사"}</span>
                                {txIds.length > 0 && <span className="font-mono">({txIds.length})</span>}
                              </button>

                              {st !== "PAID" && (
                                <button
                                  onClick={() => handleQuickFullSettle(inv)}
                                  className="px-1.5 py-1 rounded text-[10px] font-bold border border-amber-700 bg-amber-100 text-amber-900 hover:bg-amber-200 cursor-pointer"
                                  title="통장 외 카드자동납부·현금·상계 등으로 이미 결제 완료된 건을 즉시 완납 확정"
                                >
                                  완납확정
                                </button>
                              )}

                              <button
                                onClick={() => setDetailInvoice(inv)}
                                className="px-1.5 py-1 rounded text-[10px] font-bold border border-blue-700 bg-blue-600 text-white hover:bg-blue-700"
                              >
                                상세
                              </button>

                              {!isPurchaseTab && inv.status !== "SENT_NTS" && (
                                <button
                                  onClick={() => handleSendToNTS(inv)}
                                  disabled={sendingNts}
                                  className="px-1.5 py-1 rounded text-[10px] font-bold border border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800"
                                >
                                  전송
                                </button>
                              )}

                              {!isPurchaseTab && (
                                <button
                                  onClick={() => handleOpenPopbillPrint(inv)}
                                  className="px-1.5 py-1 rounded text-[10px] font-semibold border border-[#b5a894] bg-[#f4efe4] hover:bg-[#e2dbcd]"
                                >
                                  인쇄
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 2. 수납/지급 상태 */}
                          <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                            {st === "PAID" ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                {isPurchaseTab ? "지급완료" : "수납완료"}
                              </span>
                            ) : st === "PARTIAL" ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                {isPurchaseTab ? "부분지급" : "부분수납"}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                {isPurchaseTab ? "미지급" : "미수납"}
                              </span>
                            )}
                          </td>

                          {/* 3. 작성일자 */}
                          <td className="p-2 border-r border-[#b5a894] font-mono text-[11px] whitespace-nowrap text-[#44403c]">
                            {inv.issueDate ? String(inv.issueDate).slice(0, 10) : "-"}
                          </td>

                          {/* 4. 거래처 */}
                          <td className="p-2 border-r border-[#b5a894] whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-[#1c1917]">{inv.customerName}</span>
                              <span className="text-[10px] text-[#78716c] font-mono">
                                {inv.businessNo || "-"} {inv.ceoName ? `| ${inv.ceoName}` : ""}
                              </span>
                            </div>
                          </td>

                          {/* 5. 품목명 */}
                          <td className="p-2 border-r border-[#b5a894] whitespace-nowrap font-medium text-[#1c1917]">
                            {inv.itemName}
                          </td>

                          {/* 6. 공급가액 */}
                          <td className="p-2 text-right border-r border-[#b5a894] font-mono whitespace-nowrap text-[#1c1917]">
                            {formatErpCurrency(inv.supplyAmount)}
                          </td>

                          {/* 7. 세액 */}
                          <td className="p-2 text-right border-r border-[#b5a894] font-mono text-[#78716c] whitespace-nowrap">
                            {formatErpCurrency(inv.vatAmount)}
                          </td>

                          {/* 8. 합계금액 */}
                          <td className="p-2 text-right border-r border-[#b5a894] font-mono font-bold whitespace-nowrap text-[#1c1917]">
                            {formatErpCurrency(totalAmt)}
                          </td>

                          {/* 9. 수납/지급 완료액 */}
                          <td className="p-2 text-right border-r border-[#b5a894] font-mono font-bold text-emerald-800 whitespace-nowrap">
                            {formatErpCurrency(settledAmt)}
                          </td>

                          {/* 10. 미수납 채권 / 미지급 채무 잔액 */}
                          <td className={`p-2 text-right border-r border-[#b5a894] font-mono font-bold whitespace-nowrap ${
                            unpaidAmt > 0 ? "text-rose-700 bg-rose-50/40" : "text-[#a8a29e]"
                          }`}>
                            {formatErpCurrency(unpaidAmt)}
                          </td>

                          {/* 11. 수집/발행 출처 */}
                          <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#dfd7c7] text-[#44403c]">
                              {inv.sourceType === "HOMETAX_RPA" || inv.sourceType === "HOMETAX_SYNC"
                                ? "자체RPA수집"
                                : inv.sourceType === "EXCEL_UPLOAD"
                                ? "홈택스엑셀"
                                : inv.sourceType === "MANUAL"
                                ? "수동등록"
                                : "ERP발행"}
                            </span>
                          </td>

                          {/* 12. 계산서번호 / 승인번호 */}
                          <td className="p-2 font-mono text-[10px] whitespace-nowrap text-[#44403c]">
                            <div className="font-bold text-[#1c1917]">{inv.invoiceNo}</div>
                            <div className="text-[#78716c]">{inv.ntsConfirmNo || "-"}</div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 헌장 3.5: 우하단 대차대조 검증식 푸터 바 */}
            <div className="px-4 py-2.5 border-t border-[#b5a894] bg-[#ded6c5] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center gap-3 font-mono flex-wrap">
                <span className="font-bold text-[#1c1917]">
                  {isPurchaseTab ? "총 매입세금계산서" : "총 매출세금계산서"}: {formatErpCurrency(activeStats.totalGross)}
                </span>
                <span className="text-[#78716c]">=</span>
                <span className="font-bold text-emerald-800">
                  {isPurchaseTab ? "지급완료액" : "수납완료액"} {formatErpCurrency(activeStats.settled)}
                </span>
                <span className="text-[#78716c]">+</span>
                <span className="font-bold text-rose-700">
                  {isPurchaseTab ? "미지급 매입채무" : "미수납 매출채권"} {formatErpCurrency(activeStats.unpaid)}
                </span>
                <span className="text-[#78716c]">|</span>
                <span className="font-bold text-blue-900">
                  대차 차액 {formatErpCurrency(activeStats.diff)}
                </span>
              </div>

              <button
                onClick={() => handleAutoMatch(isPurchaseTab ? "PURCHASE" : "SALE")}
                disabled={autoMatching}
                className="px-3.5 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>{isPurchaseTab ? "미지급 매입채무 일괄 대사 실행" : "미수납 매출채권 일괄 대사 실행"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUB-TAB 4: HOMETAX_SYNC (자체 무료 RPA 수집 및 홈택스 엑셀 업로드) */}
        {/* ============================================================== */}
        {activeSubTab === "HOMETAX_SYNC" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* Left Card: DragonRPA 자체 무료 수집기 & 홈택스 엑셀 업로드 */}
            <div className="border border-[#b5a894] rounded bg-[#ebe5d8] p-4 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#b5a894] pb-2.5">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-700" />
                  <h3 className="font-bold text-sm text-[#1c1917]">자체 홈택스 RPA 수집 설정 (팝빌 과금 없음 · ₩0)</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                  수집 수수료 ₩0
                </span>
              </div>

              {/* 홈택스 전자세금계산서 조회 전용 부서사용자 ID/PW 설정 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">홈택스 부서사용자 ID</label>
                  <input
                    type="text"
                    value={rpaDeptUserId}
                    onChange={(e) => setRpaDeptUserId(e.target.value)}
                    placeholder="홈택스 부서사용자 ID"
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-mono text-[#1c1917]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">홈택스 부서사용자 비밀번호</label>
                  <input
                    type="password"
                    value={rpaDeptUserPw}
                    onChange={(e) => setRpaDeptUserPw(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-mono text-[#1c1917]"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleSaveRpaSettings}
                    disabled={rpaSaving}
                    className="w-full h-8 px-3 rounded bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
                  >
                    {rpaSaving ? "저장 중..." : "RPA 계정 저장"}
                  </button>
                </div>
              </div>

              {/* 자체 RPA 수집 실행 (로컬 다운로드 폴더 자동 스캔 & RPA 봇 실행) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-[#d0c6b4]">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">수집 대상 구분</label>
                  <select
                    value={htSyncTarget}
                    onChange={(e) => setHtSyncTarget(e.target.value as any)}
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-bold text-[#1c1917]"
                  >
                    <option value="ALL">매출 + 매입 전체 수집</option>
                    <option value="SELL">매출 세금계산서만 수집</option>
                    <option value="BUY">매입 세금계산서만 수집</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">조회 시작일자</label>
                  <input
                    type="date"
                    value={htStartDate}
                    onChange={(e) => setHtStartDate(e.target.value)}
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-mono text-[#1c1917]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">조회 종료일자</label>
                  <input
                    type="date"
                    value={htEndDate}
                    onChange={(e) => setHtEndDate(e.target.value)}
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-mono text-[#1c1917]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-mono text-[#57534e]">
                  CLI 명령어: <code className="px-1.5 py-0.5 rounded bg-[#dfd7c7]">node scripts/hometax-rpa-collect.cjs</code>
                </span>
                <button
                  type="button"
                  onClick={handleHometaxSync}
                  disabled={htSyncing}
                  className="h-8 px-4 rounded bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${htSyncing ? "animate-spin" : ""}`} />
                  <span>{htSyncing ? "자체 RPA 수집 중..." : "자체 RPA 수집기 실행 (폴더 자동 스캔)"}</span>
                </button>
              </div>

              {/* Right below: Hometax Excel Direct Upload Box */}
              <div className="border-t border-[#b5a894] pt-4 mt-1 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-700" />
                    <h4 className="font-bold text-sm text-[#1c1917]">홈택스 전자세금계산서 엑셀(.xls / .xlsx / .csv) 일괄 업로드</h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs items-end">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#78716c]">업로드 기본 구분 (사업자번호로도 자동 판별)</label>
                    <select
                      value={excelUploadIoType}
                      onChange={(e) => setExcelUploadIoType(e.target.value as any)}
                      className="h-8 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-bold text-[#1c1917]"
                    >
                      <option value="PURCHASE">매입 세금계산서 엑셀</option>
                      <option value="SALE">매출 세금계산서 엑셀</option>
                    </select>
                  </div>

                  <div>
                    <input
                      ref={excelInputRef}
                      type="file"
                      accept=".xls,.xlsx,.csv"
                      onChange={handleHometaxExcelUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={excelUploading}
                      onClick={() => excelInputRef.current?.click()}
                      className="w-full h-8 px-3 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{excelUploading ? "엑셀 분석 및 저장 중..." : "홈택스 엑셀 파일 선택 업로드"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Sync Logs & Quick Reconciliation Summary */}
            <div className="border border-[#b5a894] rounded bg-[#ebe5d8] p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#b5a894] pb-2.5">
                <span className="font-bold text-sm text-[#1c1917]">수집 실행 이력 및 채권·채무 요약</span>
                <span className="text-xs font-mono text-[#78716c]">
                  매출 {saleInvoices.length}건 / 매입 {purchaseInvoices.length}건
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded border border-[#b5a894] bg-[#f4efe4] flex flex-col gap-1">
                  <span className="text-[#78716c] font-bold">미수납 매출채권 합계 ({arStats.unpaidCount}건)</span>
                  <span className="text-base font-bold font-mono text-rose-700">{formatErpCurrency(arStats.unpaid)}</span>
                </div>
                <div className="p-3 rounded border border-[#b5a894] bg-[#f4efe4] flex flex-col gap-1">
                  <span className="text-[#78716c] font-bold">미지급 매입채무 합계 ({apStats.unpaidCount}건)</span>
                  <span className="text-base font-bold font-mono text-rose-700">{formatErpCurrency(apStats.unpaid)}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto rounded border border-[#b5a894] bg-[#f4efe4] p-3 font-mono text-xs space-y-2 min-h-[220px]">
                {htSyncLogs.length === 0 ? (
                  <div className="text-[#78716c] text-center py-12">
                    좌측에서 [홈택스 세금계산서 자동 수집 실행] 또는 [홈택스 엑셀 파일 선택 업로드]를 실행하면 수집 결과가 여기에 기록됩니다.
                  </div>
                ) : (
                  htSyncLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded border ${
                        log.type === "success"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : log.type === "warn"
                          ? "bg-amber-50 border-amber-300 text-amber-900"
                          : "bg-slate-100 border-slate-300 text-slate-800"
                      }`}
                    >
                      <span className="font-bold mr-2">[{log.time}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: 세금계산서 ↔ 통장 입출금 1:1 / 1:N 비교 대사 모달              */}
      {/* ===================================================================== */}
      {reconcileInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-4xl w-full p-5 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] shrink-0">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-teal-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">
                  {reconcileInvoice.ioType === "PURCHASE"
                    ? "매입 세금계산서 ↔ 통장 출금 내역 비교 대사 (매입채무 관리)"
                    : "매출 세금계산서 ↔ 통장 입금 내역 비교 대사 (매출채권 관리)"}
                </h3>
              </div>
              <button onClick={() => setReconcileInvoice(null)} className="text-[#78716c] hover:text-[#1c1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Invoice Summary Banner */}
            <div className="my-3 p-3 rounded border border-[#b5a894] bg-[#ebe5d8] grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716c] font-bold">거래처명</span>
                <span className="font-bold text-[#1c1917] truncate">{reconcileInvoice.customerName}</span>
                <span className="text-[10px] font-mono text-[#78716c]">{reconcileInvoice.businessNo}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716c] font-bold">작성일자 / 품목</span>
                <span className="font-mono font-bold text-[#1c1917]">
                  {reconcileInvoice.issueDate ? String(reconcileInvoice.issueDate).slice(0, 10) : "-"}
                </span>
                <span className="text-[10px] truncate text-[#57534e]">{reconcileInvoice.itemName}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716c] font-bold">세금계산서 합계금액</span>
                <span className="font-mono font-bold text-sm text-[#1c1917]">
                  {formatErpCurrency(reconcileInvoice.totalAmount)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716c] font-bold">
                  {reconcileInvoice.ioType === "PURCHASE" ? "지급 완료 금액" : "수납 완료 금액"}
                </span>
                <span className="font-mono font-bold text-sm text-emerald-800">
                  {formatErpCurrency(reconcileInvoice.settledAmount || 0)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716c] font-bold">
                  {reconcileInvoice.ioType === "PURCHASE" ? "미지급 채무 잔액" : "미수납 채권 잔액"}
                </span>
                <span className="font-mono font-bold text-sm text-rose-700">
                  {formatErpCurrency(
                    Math.max(0, Number(reconcileInvoice.totalAmount || 0) - Number(reconcileInvoice.settledAmount || 0))
                  )}
                </span>
              </div>
            </div>

            {/* Body: Linked Transactions + Candidate Bank Transactions */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* 1. Already Linked Bank Transactions */}
              <div className="border border-[#b5a894] rounded bg-[#ebe5d8] overflow-hidden">
                <div className="px-3 py-2 bg-[#dfd7c7] border-b border-[#b5a894] flex items-center justify-between font-bold">
                  <span>연결 완료된 통장 입출금 내역 ({linkedBankTxs.length}건)</span>
                  {linkedBankTxs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleUnmatchBankTx()}
                      className="px-2 py-0.5 rounded bg-rose-700 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-rose-800"
                    >
                      <Unlink className="w-3 h-3" />
                      <span>전체 연결 해제</span>
                    </button>
                  )}
                </div>
                {linkedBankTxs.length === 0 ? (
                  <div className="p-3 text-center text-[#78716c]">아직 연결된 통장 입출금 내역이 없습니다.</div>
                ) : (
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-[#ded6c5] border-b border-[#b5a894] font-bold">
                      <tr>
                        <th className="p-2 text-center w-20 border-r border-[#b5a894]">조치</th>
                        <th className="p-2 text-left w-28 border-r border-[#b5a894]">거래일자</th>
                        <th className="p-2 text-left border-r border-[#b5a894]">기재내용 / 예금주</th>
                        <th className="p-2 text-right w-32 border-r border-[#b5a894]">
                          {reconcileInvoice.ioType === "PURCHASE" ? "출금금액" : "입금금액"}
                        </th>
                        <th className="p-2 text-left">계좌번호</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#b5a894]">
                      {linkedBankTxs.map((tx) => (
                        <tr key={tx.id} className="bg-emerald-50/40">
                          <td className="p-2 text-center border-r border-[#b5a894]">
                            <button
                              type="button"
                              onClick={() => handleUnmatchBankTx(Number(tx.id))}
                              className="px-2 py-0.5 rounded border border-rose-600 text-rose-700 hover:bg-rose-100 font-bold text-[10px]"
                            >
                              해제
                            </button>
                          </td>
                          <td className="p-2 font-mono border-r border-[#b5a894]">{tx.transDate}</td>
                          <td className="p-2 border-r border-[#b5a894] font-bold">
                            {tx.senderReceiver} {tx.counterpartyHolder ? `(${tx.counterpartyHolder})` : ""}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-800 border-r border-[#b5a894]">
                            {formatErpCurrency(
                              reconcileInvoice.ioType === "PURCHASE" ? tx.withdrawalAmount || tx.amount : tx.depositAmount || tx.amount
                            )}
                          </td>
                          <td className="p-2 font-mono text-[#78716c]">{tx.accountNo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* 2. Candidate Bank Transactions from IBK erp_bank_transactions */}
              <div className="border border-[#b5a894] rounded bg-[#ebe5d8] overflow-hidden">
                <div className="px-3 py-2 bg-[#dfd7c7] border-b border-[#b5a894] flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">
                    통장 {reconcileInvoice.ioType === "PURCHASE" ? "출금" : "입금"} 후보 목록 (거래처명·금액 유사도 순 정렬)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bankSearchTerm}
                      onChange={(e) => setBankSearchTerm(e.target.value)}
                      placeholder="입출금자명, 금액, 일자 검색..."
                      className="h-7 px-2.5 rounded border border-[#b5a894] bg-[#f4efe4] text-xs w-52"
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#ded6c5] border-b border-[#b5a894] font-bold">
                      <tr>
                        <th className="p-2 text-center w-12 border-r border-[#b5a894]">선택</th>
                        <th className="p-2 text-center w-28 border-r border-[#b5a894]">매칭 분석</th>
                        <th className="p-2 text-left w-24 border-r border-[#b5a894]">거래일자</th>
                        <th className="p-2 text-left border-r border-[#b5a894]">기재내용 / 상대예금주</th>
                        <th className="p-2 text-right w-32 border-r border-[#b5a894]">
                          {reconcileInvoice.ioType === "PURCHASE" ? "출금금액" : "입금금액"}
                        </th>
                        <th className="p-2 text-left">비고/계좌</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#b5a894]">
                      {reconcileLoading ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-[#78716c]">
                            통장 입출금 내역을 비교 분석하는 중입니다...
                          </td>
                        </tr>
                      ) : filteredCandidateTxs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-[#78716c]">
                            조건에 해당하는 미매칭 통장 입출금 내역이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        filteredCandidateTxs.map((tx) => {
                          const checked = selectedBankTxIds.has(Number(tx.id));
                          const amt = reconcileInvoice.ioType === "PURCHASE"
                            ? Number(tx.withdrawalAmount || tx.amount || 0)
                            : Number(tx.depositAmount || tx.amount || 0);
                          return (
                            <tr
                              key={tx.id}
                              onClick={() => {
                                setSelectedBankTxIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(Number(tx.id))) next.delete(Number(tx.id));
                                  else next.add(Number(tx.id));
                                  return next;
                                });
                              }}
                              className={`cursor-pointer hover:bg-[#dfd7c7] transition ${
                                checked ? "bg-teal-50" : tx.matchScore >= 50 ? "bg-amber-50/40" : ""
                              }`}
                            >
                              <td className="p-2 text-center border-r border-[#b5a894]">
                                {checked ? (
                                  <CheckSquare className="w-4 h-4 text-teal-700 mx-auto" />
                                ) : (
                                  <Square className="w-4 h-4 text-[#78716c] mx-auto" />
                                )}
                              </td>
                              <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                                {tx.matchScore >= 80 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    강력추천 ({tx.matchReasons?.join("·")})
                                  </span>
                                ) : tx.matchScore >= 40 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    유사후보 ({tx.matchReasons?.join("·")})
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-[#78716c]">일반내역</span>
                                )}
                              </td>
                              <td className="p-2 font-mono border-r border-[#b5a894] whitespace-nowrap">{tx.transDate}</td>
                              <td className="p-2 border-r border-[#b5a894] whitespace-nowrap">
                                <span className="font-bold text-[#1c1917]">{tx.senderReceiver}</span>
                                {tx.counterpartyHolder && (
                                  <span className="text-[10px] text-[#78716c] ml-1.5">({tx.counterpartyHolder})</span>
                                )}
                              </td>
                              <td className="p-2 text-right font-mono font-bold border-r border-[#b5a894] whitespace-nowrap text-blue-900">
                                {formatErpCurrency(amt)}
                              </td>
                              <td className="p-2 text-[10px] text-[#78716c] font-mono whitespace-nowrap">
                                {tx.accountNo}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Manual Settle Amount Adjustment */}
              <div className="p-3 rounded border border-[#b5a894] bg-[#ebe5d8] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#57534e]">직접 정산액 지정 (현금·상계·카드결제 등):</span>
                  <input
                    type="text"
                    value={manualSettleInput}
                    onChange={(e) => setManualSettleInput(e.target.value)}
                    className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-mono font-bold w-36 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setManualSettleInput(String(Math.round(Number(reconcileInvoice.totalAmount || 0))))}
                    className="px-2 py-1 rounded border border-[#b5a894] bg-[#f4efe4] hover:bg-[#dfd7c7] text-[10px] font-bold"
                  >
                    전액 완납 입력
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleManualSettleSave}
                  className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs"
                >
                  직접 정산액 저장
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 mt-3 border-t border-[#b5a894] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setReconcileInvoice(null)}
                className="h-8 px-4 rounded border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] font-bold text-xs"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={selectedBankTxIds.size === 0 || reconcileLoading}
                onClick={handleConfirmBankMatch}
                className={`h-8 px-4 rounded font-bold text-xs flex items-center gap-1.5 shadow ${
                  selectedBankTxIds.size > 0
                    ? "bg-teal-700 hover:bg-teal-800 text-white cursor-pointer"
                    : "bg-[#d8d0c2] text-[#a8a29e] cursor-not-allowed"
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>선택한 통장 내역 ({selectedBankTxIds.size}건) 대사 연결 확정</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: 매출 세금계산서 수동 발행 / 매입 세금계산서 수동 등록 모달     */}
      {/* ===================================================================== */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-3xl w-full p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">
                  {modalIoType === "PURCHASE" ? "매입 세금계산서 등록 (미지급 매입채무 생성)" : "매출 세금계산서 수동 발행"}
                </h3>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="text-[#78716c] hover:text-[#1c1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualIssue} className="flex flex-col gap-3 text-xs">
              {/* 구분 선택 (매출 vs 매입) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModalIoType("SALE")}
                  className={`p-2 rounded border font-bold text-center transition ${
                    modalIoType === "SALE"
                      ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                      : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                  }`}
                >
                  매출 세금계산서 발행 (매출채권)
                </button>
                <button
                  type="button"
                  onClick={() => setModalIoType("PURCHASE")}
                  className={`p-2 rounded border font-bold text-center transition ${
                    modalIoType === "PURCHASE"
                      ? "border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500"
                      : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                  }`}
                >
                  매입 세금계산서 등록 (매입채무)
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">당사 사업자 주체</label>
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
                {modalIoType === "SALE" ? (
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
                ) : (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#78716c]">국세청 승인번호 (선택)</label>
                    <input
                      type="text"
                      value={manualNtsConfirmNo}
                      onChange={(e) => setManualNtsConfirmNo(e.target.value)}
                      placeholder="예: 20261030-10000000-00000000"
                      className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono"
                    />
                  </div>
                )}
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

              {/* 등록 거래처 조회 선택 */}
              <div className="flex flex-col gap-1 relative">
                <label className="font-bold text-[#78716c]">
                  {modalIoType === "PURCHASE" ? "공급자 상호 (매입거래처 조회 선택) *" : "공급받는자 상호 (매출고객사 조회 선택) *"}
                </label>
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
                    placeholder="거래처명, 사업자번호 검색하여 선택 또는 직접 입력"
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
                      .filter((p) =>
                        modalIoType === "PURCHASE"
                          ? p.partnerType === "VENDOR" || p.partnerType === "BOTH"
                          : p.partnerType === "CUSTOMER" || p.partnerType === "BOTH"
                      )
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
                              사업자: {p.businessNo || "-"} | 대표: {p.ceoName || "-"}
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
                domainLabel={modalIoType === "PURCHASE" ? "매입 세금계산서" : "매출 세금계산서"}
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
                  {modalIoType === "PURCHASE" ? "매입 세금계산서 저장" : "국세청 전자세금계산서 발행"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: 전자세금계산서 상세조회 Modal (Hometax / Popbill Style)       */}
      {/* ===================================================================== */}
      {detailInvoice && (() => {
        const inv = detailInvoice;
        const isPurchase = inv.ioType === "PURCHASE";
        const ourEntity = getEntity(inv.supplierEntityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP");
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

        const supplierBizNo = isPurchase ? (inv.businessNo || "-") : (inv.supplierCorpNum || ourEntity.bizNum);
        const supplierName = isPurchase ? inv.customerName : (inv.supplierCorpName || ourEntity.corpName);
        const supplierCeo = isPurchase ? (inv.ceoName || "-") : (inv.supplierCeoName || ourEntity.ceoName);
        const supplierAddr = isPurchase ? (inv.customerAddress || "-") : ourEntity.address;

        const buyerBizNo = isPurchase ? ourEntity.bizNum : (inv.businessNo || "-");
        const buyerName = isPurchase ? ourEntity.corpName : inv.customerName;
        const buyerCeo = isPurchase ? ourEntity.ceoName : (inv.ceoName || "-");
        const buyerAddr = isPurchase ? ourEntity.address : (inv.customerAddress || "-");

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white border border-slate-300 rounded shadow-2xl max-w-4xl w-full max-h-[94vh] overflow-y-auto text-slate-900">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">
                  전자세금계산서 상세조회 ({isPurchase ? "매입" : "매출"})
                </h3>
                <button
                  onClick={() => setDetailInvoice(null)}
                  className="text-slate-500 hover:text-slate-900 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-3 text-xs">
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

                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <tbody>
                    <tr>
                      <th rowSpan={4} className="w-9 bg-[#f8d7da] text-[#842029] border border-red-300 font-bold text-center leading-tight p-1">
                        공<br />급<br />자
                      </th>
                      <th className="w-20 bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">등록번호</th>
                      <td className="border border-red-200 p-2 font-mono font-bold text-center text-slate-900">
                        {supplierBizNo}
                      </td>
                      <th className="w-16 bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">종사업장</th>
                      <td className="w-20 border border-red-200 p-2 text-center text-slate-600">-</td>

                      <th rowSpan={4} className="w-9 bg-[#cfe2ff] text-[#084298] border border-blue-300 font-bold text-center leading-tight p-1">
                        공<br />급<br />받<br />는<br />자
                      </th>
                      <th className="w-20 bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">등록번호</th>
                      <td className="border border-blue-200 p-2 font-mono font-bold text-center text-slate-900">
                        {buyerBizNo}
                      </td>
                      <th className="w-16 bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">종사업장</th>
                      <td className="w-20 border border-blue-200 p-2 text-center text-slate-600">-</td>
                    </tr>
                    <tr>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">상호</th>
                      <td className="border border-red-200 p-2 font-semibold text-slate-900">{supplierName}</td>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">성명</th>
                      <td className="border border-red-200 p-2 text-slate-900">{supplierCeo}</td>

                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">상호</th>
                      <td className="border border-blue-200 p-2 font-semibold text-slate-900">{buyerName}</td>
                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">성명</th>
                      <td className="border border-blue-200 p-2 text-slate-900">{buyerCeo}</td>
                    </tr>
                    <tr>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">사업장</th>
                      <td colSpan={3} className="border border-red-200 p-2 text-slate-800">{supplierAddr}</td>

                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">사업장</th>
                      <td colSpan={3} className="border border-blue-200 p-2 text-slate-800">{buyerAddr}</td>
                    </tr>
                    <tr>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">이메일</th>
                      <td colSpan={3} className="border border-red-200 p-2 font-mono text-slate-800">
                        {isPurchase ? (inv.customerEmail || "-") : ourEntity.email}
                      </td>

                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">이메일</th>
                      <td colSpan={3} className="border border-blue-200 p-2 font-mono text-slate-800">
                        {isPurchase ? ourEntity.email : (inv.customerEmail || "-")}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-[#ebf7f6] text-slate-800 font-bold">
                      <th className="border border-slate-300 p-2 text-center w-28">작성일자</th>
                      <th className="border border-slate-300 p-2 text-center w-36">공급가액</th>
                      <th className="border border-slate-300 p-2 text-center w-32">세액</th>
                      <th className="border border-slate-300 p-2 text-center w-36">합계금액</th>
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
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold text-blue-900">
                        {Number(inv.totalAmount || 0).toLocaleString("ko-KR")}
                      </td>
                      <td className="border border-slate-300 p-2 text-left">{inv.memo || inv.itemName || ""}</td>
                    </tr>
                  </tbody>
                </table>

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
                    onClick={() => {
                      const target = detailInvoice;
                      setDetailInvoice(null);
                      openReconcileModal(target);
                    }}
                    className="px-4 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
                  >
                    통장 입출금 대사 연결
                  </button>
                  {!isPurchase && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
