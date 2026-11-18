"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { EntityType, getEntity } from "@/lib/businessEntities";
import { formatErpCurrency, sortErpItems } from "@/lib/erpFormat";
import { matchHangulAny, sortCustomersByName } from "@/lib/hangulSearch";
import { useErpTableSort } from "../SortableTh";
import { STANDARD_ACCOUNT_SUBJECTS } from "@/lib/erpAccountSubjects";
import { type SearchSelectOption } from "../SearchSelectCombobox";
import { type BuyerTaxSpec, createDefaultTaxSpec } from "../ContractTaxInvoiceSection";
import { findBlockedPartnerMatch, getPartnerTradeBlockInfo } from "@/lib/partnerStatusClient";
import {
  type PopbillLiveStatus,
  type SettlementFilter,
  type TaxLedgerStats,
  type TaxSubTab,
} from "./TaxKpiAndFilterBar";
import { type HometaxSyncLogItem } from "./TaxUnissuedAndSyncSubTabs";

export interface UseTaxInvoiceControllerParams {
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onSelectEntity?: (entity: "ALL" | "CORP" | "INDIVIDUAL") => void;
}

export function computeTaxLedgerStats(list: any[]): TaxLedgerStats {
  const count = list.length;
  const totalGross = list.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const totalSupply = list.reduce((s, i) => s + Number(i.supplyAmount || 0), 0);
  const settled = list.reduce((s, i) => s + Number(i.settledAmount || 0), 0);
  const unpaid = list.reduce(
    (s, i) => s + Math.max(0, Number(i.totalAmount || 0) - Number(i.settledAmount || 0)),
    0
  );
  const unpaidCount = list.filter((i) => (i.settlementStatus || "UNPAID") !== "PAID").length;
  const paidCount = list.filter((i) => i.settlementStatus === "PAID").length;
  const diff = totalGross - (settled + unpaid);
  return { count, totalGross, totalSupply, settled, unpaid, unpaidCount, paidCount, diff };
}

const getBillingUid = (b: any) => b.uid || `${b.domainType}_${b.billingId}`;

async function postTaxJson(url: string, payload: Record<string, unknown>, fallbackError: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || fallbackError);
  return data;
}

/**
 * 세금계산서 대장·미발행·홈택스 수집·팝빌 연동·입출금 대사 상태 및 액션 컨트롤러 훅
 */
export function useTaxInvoiceController({
  selectedEntity = "ALL",
  onSelectEntity,
}: UseTaxInvoiceControllerParams = {}) {
  // 4 Sub-tabs: UNISSUED | SALE_LEDGER | PURCHASE_LEDGER | HOMETAX_SYNC
  const [activeSubTab, setActiveSubTab] = useState<TaxSubTab>("SALE_LEDGER");

  // Invoices & Billings State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [unissuedBillings, setUnissuedBillings] = useState<any[]>([]);
  const [selectedBillingIds, setSelectedBillingIds] = useState<Set<string>>(new Set());
  const [registeredPartners, setRegisteredPartners] = useState<any[]>([]);
  const [detailInvoice, setDetailInvoice] = useState<any | null>(null);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [unissuedLoading, setUnissuedLoading] = useState(false);
  const [batchIssuing, setBatchIssuing] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);

  // Filters & Sorting
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [settlementFilter, setSettlementFilter] = useState<SettlementFilter>("ALL");
  const [entityFilter, setEntityFilter] = useState<"ALL" | "CORP" | "INDIVIDUAL">(selectedEntity);
  const [searchTerm, setSearchTerm] = useState("");
  const { sortKey, sortDir, handleSort } = useErpTableSort("issueDate", "desc");

  // Unissued Sorting & Reconciliation Modal Sub-Table Sorting (3단계: asc ➔ desc ➔ null)
  const {
    sortKey: unissuedSortKey,
    sortDir: unissuedSortDir,
    handleSort: handleUnissuedSort,
  } = useErpTableSort("billingDate", "desc");
  const linkedBankSort = useErpTableSort("", null);
  const candBankSort = useErpTableSort("", null);

  // Modal State for Manual Issuance (SALE or PURCHASE)
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [modalIoType, setModalIoType] = useState<"SALE" | "PURCHASE">("SALE");
  const [modalSupplierEntity, setModalSupplierEntity] = useState<EntityType>(
    selectedEntity === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP"
  );
  const [custName, setCustName] = useState("");
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
  const [settleReasonInput, setSettleReasonInput] = useState<string>("수수료/단수절사 차액 상계 완납");
  const [rowSubjectMap, setRowSubjectMap] = useState<Record<number, string>>({});
  const [batchSubject, setBatchSubject] = useState<string>("");

  // Hometax Free Self-RPA & Excel Upload State (No Popbill Paid Scraping)
  const [htStartDate, setHtStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().slice(0, 10);
  });
  const [htEndDate, setHtEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [htSyncTarget, setHtSyncTarget] = useState<"ALL" | "SELL" | "BUY">("ALL");
  const [htSyncing, setHtSyncing] = useState(false);
  const [htSyncLogs, setHtSyncLogs] = useState<HometaxSyncLogItem[]>([]);
  const [excelUploadIoType, setExcelUploadIoType] = useState<"PURCHASE" | "SALE">("PURCHASE");
  const [excelUploading, setExcelUploading] = useState(false);
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const [rpaDeptUserId, setRpaDeptUserId] = useState("");
  const [rpaDeptUserPw, setRpaDeptUserPw] = useState("");
  const [rpaSaving, setRpaSaving] = useState(false);
  const [sendingNts, setSendingNts] = useState(false);

  // Popbill Live Production Status (파트너 잔여포인트, 법인/개인 공동인증서 등록여부)
  const [popbillLive, setPopbillLive] = useState<PopbillLiveStatus | null>(null);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3800);
  };

  useEffect(() => {
    setEntityFilter(selectedEntity);
    if (selectedEntity === "INDIVIDUAL" || selectedEntity === "CORP") {
      setModalSupplierEntity(selectedEntity);
    }
  }, [selectedEntity]);

  useEffect(() => {
    if (entityFilter === "INDIVIDUAL" || entityFilter === "CORP") {
      setModalSupplierEntity(entityFilter);
    }
  }, [entityFilter]);

  const fetchPopbillLiveStatus = async () => {
    try {
      const targetEntity = entityFilter === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
      const res = await fetch("/api/erp/tax-invoices/popbill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LIVE_STATUS",
          entityType: targetEntity,
          corpNum: getEntity(targetEntity).bizNumRaw,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPopbillLive({
          isLiveProduction: Boolean(data.isLiveProduction),
          partnerBalance: Number(data.partnerBalance || 0),
          certRegistered: Boolean(data.certRegistered),
          certMessage: data.certMessage || "",
          corpCertRegistered:
            data.corpCertRegistered !== undefined ? Boolean(data.corpCertRegistered) : Boolean(data.certRegistered),
          individualCertRegistered:
            data.individualCertRegistered !== undefined
              ? Boolean(data.individualCertRegistered)
              : Boolean(data.certRegistered),
        });
      }
    } catch (e) {
      console.error("Failed to fetch Popbill live status:", e);
    }
  };

  // 1. Fetch All Tax Invoices (매출 + 매입 통합 로드 후 탭별 필터링)
  const fetchIssuedInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter !== "ALL") params.set("supplierEntityType", entityFilter);

      const url = `/api/erp/tax-invoices${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        const list = data.invoices || [];
        setInvoices(list);
        setDetailInvoice((prev: any) => (prev ? list.find((i: any) => i.id === prev.id) || prev : null));
        setReconcileInvoice((prev: any) => (prev ? list.find((i: any) => i.id === prev.id) || prev : null));
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
      const res = await fetch("/api/erp/tax-invoices?type=UNISSUED_BILLINGS", { cache: "no-store" });
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
      const res = await fetch("/api/erp/partners?type=ALL", { cache: "no-store" });
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
      const res = await fetch(`/api/erp/tax-invoices/hometax?entityType=${ent}`, { cache: "no-store" });
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
    fetchPopbillLiveStatus();
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
        if (settlementFilter === "UNPAID" && st === "PAID") return false;
        if (settlementFilter === "PARTIAL" && st !== "PARTIAL") return false;
        if (settlementFilter === "PAID" && st !== "PAID") return false;
      }
      if (!searchTerm.trim()) return true;
      return matchHangulAny(
        [i.customerName, i.itemName, i.invoiceNo, i.ntsConfirmNo, i.supplierCorpName, i.businessNo],
        searchTerm
      );
    });
  }, [activeSubTab, saleInvoices, purchaseInvoices, domainFilter, settlementFilter, searchTerm]);

  const sortedInvoices = useMemo(
    () => sortErpItems(currentLedgerInvoices, sortKey, sortDir),
    [currentLedgerInvoices, sortKey, sortDir]
  );

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
      if (!searchTerm.trim()) return true;
      return matchHangulAny(
        [b.customerName, b.itemName, b.billingNo, b.contractNo, b.businessNo, b.siteName, b.projectName],
        searchTerm
      );
    });
  }, [unissuedBillings, domainFilter, entityFilter, searchTerm]);

  const sortedUnissued = useMemo(
    () => sortErpItems(filteredUnissued, unissuedSortKey, unissuedSortDir),
    [filteredUnissued, unissuedSortKey, unissuedSortDir]
  );

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
  const arStats = useMemo(() => computeTaxLedgerStats(saleInvoices), [saleInvoices]);
  const apStats = useMemo(() => computeTaxLedgerStats(purchaseInvoices), [purchaseInvoices]);

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

  // Shared API / guard helpers
  const postTaxReconcile = (payload: Record<string, unknown>, fallbackError: string) =>
    postTaxJson("/api/erp/tax-invoices/reconcile", payload, fallbackError);

  const postPopbillAction = (payload: Record<string, unknown>, fallbackError: string) =>
    postTaxJson("/api/erp/tax-invoices/popbill", payload, fallbackError);

  const checkBlockedPartner = (partner: { partnerId?: any; name?: string; businessNo?: string }) => {
    const blocked = findBlockedPartnerMatch(registeredPartners, partner);
    if (blocked) {
      showToast(`[${blocked.name}] ${getPartnerTradeBlockInfo(blocked).reason}`, "error");
      return true;
    }
    return false;
  };

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
      await postTaxReconcile(
        { action: "MANUAL_SETTLE", invoiceId: inv.id, settledAmount: totalAmt },
        "완납 처리 실패"
      );
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
      const res = await fetch(`/api/erp/tax-invoices/reconcile?invoiceId=${inv.id}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        if (data.invoice) {
          const nextSettled = Number(
            data.invoice.settled_amount ?? data.invoice.settledAmount ?? inv.settledAmount ?? 0
          );
          setReconcileInvoice((prev: any) =>
            prev
              ? {
                  ...prev,
                  settledAmount: nextSettled,
                  settlementStatus: data.invoice.settlement_status ?? data.invoice.settlementStatus ?? prev.settlementStatus,
                  matchedBankTxIds:
                    data.invoice.matched_bank_tx_ids ?? data.invoice.matchedBankTxIds ?? prev.matchedBankTxIds,
                }
              : prev
          );
          setManualSettleInput(String(Math.round(nextSettled)));
        }
        const cands = data.candidateTransactions || [];
        setLinkedBankTxs(data.linkedTransactions || []);
        setCandidateBankTxs(cands);
        const initSubjMap: Record<number, string> = {};
        for (const tx of cands) {
          if (tx.recommendedAccount) {
            initSubjMap[Number(tx.id)] = tx.recommendedAccount;
          }
        }
        setRowSubjectMap(initSubjMap);
      } else {
        throw new Error(data.error || "입출금 대사 후보 조회 실패");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setReconcileLoading(false);
    }
  };

  const withReconcileLoading = async (task: () => Promise<void>) => {
    try {
      setReconcileLoading(true);
      await task();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setReconcileLoading(false);
    }
  };

  const refreshReconcileAfterChange = async (data: any) => {
    showToast(data.message);
    await fetchIssuedInvoices();
    await openReconcileModal({
      ...reconcileInvoice,
      settledAmount: data.settledAmount,
      settlementStatus: data.settlementStatus,
    });
  };

  // Run Auto-Match (세금계산서 ↔ 통장 입출금 일괄 비교 대사)
  const handleAutoMatch = async (ioType: "SALE" | "PURCHASE" | "ALL") => {
    setAutoMatching(true);
    try {
      const data = await postTaxReconcile({ action: "AUTO_MATCH", ioType }, "자동 대사 실패");
      showToast(data.message);
      await fetchIssuedInvoices();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setAutoMatching(false);
    }
  };

  // Match Selected Bank Transactions in Reconcile Modal (forceComplete: 금액 불일치 시에도 차액 상계/완납 종결)
  const handleConfirmBankMatch = async (forceComplete = false) => {
    if (!reconcileInvoice || selectedBankTxIds.size === 0) {
      showToast("연결할 통장 입출금 내역을 1건 이상 선택해 주십시오.", "error");
      return;
    }
    await withReconcileLoading(async () => {
      const data = await postTaxReconcile(
        {
          action: "MATCH",
          invoiceId: reconcileInvoice.id,
          bankTxIds: Array.from(selectedBankTxIds),
          forceComplete,
          settleReason: forceComplete ? settleReasonInput : undefined,
        },
        "입출금 대사 연결 실패"
      );
      await refreshReconcileAfterChange(data);
    });
  };

  // 세금계산서 외 일반 입출금 내역에 계정과목을 지정하여 미결(미매칭) 후보에서 즉시 정리·소거
  const handleClassifyBankTxInModal = async (txIds: number[], accountSubject: string) => {
    if (!reconcileInvoice || txIds.length === 0 || !accountSubject) {
      showToast("계정과목을 선택해 주십시오.", "error");
      return;
    }
    await withReconcileLoading(async () => {
      const data = await postTaxReconcile(
        { action: "CLASSIFY_BANK_TX", bankTxIds: txIds, accountSubject },
        "계정과목 정리 실패"
      );
      showToast(data.message);
      setSelectedBankTxIds((prev) => {
        const next = new Set(prev);
        for (const id of txIds) next.delete(id);
        return next;
      });
      await openReconcileModal(reconcileInvoice);
    });
  };

  // Unmatch Bank Transaction
  const handleUnmatchBankTx = async (bankTxId?: number) => {
    if (!reconcileInvoice) return;
    await withReconcileLoading(async () => {
      const data = await postTaxReconcile(
        { action: "UNMATCH", invoiceId: reconcileInvoice.id, bankTxId },
        "대사 해제 실패"
      );
      await refreshReconcileAfterChange(data);
    });
  };

  // Manual Settlement Amount Override
  const handleManualSettleSave = async () => {
    if (!reconcileInvoice) return;
    const amt = Number(String(manualSettleInput).replace(/[^0-9]/g, "")) || 0;
    await withReconcileLoading(async () => {
      const data = await postTaxReconcile(
        { action: "MANUAL_SETTLE", invoiceId: reconcileInvoice.id, settledAmount: amt },
        "수동 정산 반영 실패"
      );
      showToast(data.message);
      await fetchIssuedInvoices();
      setReconcileInvoice(null);
    });
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
      const data = await postTaxJson(
        "/api/erp/tax-invoices/hometax",
        {
          action: "SAVE_RPA_SETTINGS",
          entityType: entityFilter === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP",
          deptUserId: rpaDeptUserId,
          deptUserPw: rpaDeptUserPw,
          autoReconcile: true,
        },
        "설정 저장 실패"
      );
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
    for (const b of selectedList) {
      if (
        checkBlockedPartner({
          partnerId: b.partnerId,
          name: b.customerName,
          businessNo: b.customerBizNo || b.businessNo,
        })
      ) {
        return;
      }
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
      const data = await postTaxJson(
        "/api/erp/tax-invoices",
        { batchIssue: true, consolidate, billings: selectedList },
        "일괄 세금계산서 발행 실패"
      );
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
    if (
      checkBlockedPartner({
        partnerId: billing.partnerId,
        name: billing.customerName,
        businessNo: billing.customerBizNo || billing.businessNo,
      })
    ) {
      return;
    }

    if (
      !window.confirm(
        `[${billing.customerName}] ${billing.itemName}\n공급가액: ${formatErpCurrency(billing.supplyAmount)} (합계: ${formatErpCurrency(billing.totalAmount)})\n국세청 전자세금계산서를 즉시 발행하시겠습니까?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await postTaxJson(
        "/api/erp/tax-invoices",
        { batchIssue: true, billings: [billing] },
        "세금계산서 발행 실패"
      );
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
    const firstItemName =
      manualTaxSpec.taxItems[0]?.itemName || (modalIoType === "PURCHASE" ? "매입 품목" : "용역/판매 품목");
    const summaryItemName = manualTaxSpec.taxItems.length > 1 ? `${firstItemName} 외` : firstItemName;

    if (!custName.trim() || !firstItemName.trim() || totalSupply <= 0) {
      showToast("거래처명, 품목, 공급가액은 필수 항목입니다.", "error");
      return;
    }

    if (checkBlockedPartner({ name: custName.trim(), businessNo: manualTaxSpec.customerBizNo })) {
      return;
    }

    try {
      const data = await postTaxJson(
        "/api/erp/tax-invoices",
        {
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
        },
        "등록 실패"
      );

      showToast(
        modalIoType === "PURCHASE"
          ? `매입 세금계산서 [${data.invoice.invoice_no || data.invoice.invoiceNo}] 등록 완료 (미지급 매입채무 반영)`
          : `매출 전자세금계산서 [${data.invoice.invoice_no || data.invoice.invoiceNo}] 발행 완료`
      );
      setShowIssueModal(false);
      setCustName("");
      setManualNtsConfirmNo("");
      setManualTaxSpec(createDefaultTaxSpec("용역/판매 품목", 1000000));
      await fetchIssuedInvoices();
      setActiveSubTab(modalIoType === "PURCHASE" ? "PURCHASE_LEDGER" : "SALE_LEDGER");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Open Popbill Viewer / Direct Print / Portal
  const openPopbillInvoicePopup = async (inv: any, action: "VIEW_URL" | "PRINT_URL", fallbackError: string) => {
    try {
      const data = await postPopbillAction(
        {
          action,
          mgtKey: inv.invoiceNo,
          corpNum: inv.supplierCorpNum || getEntity(inv.supplierEntityType).bizNumRaw,
          entityType: inv.supplierEntityType || "CORP",
        },
        fallbackError
      );
      window.open(data.url, "_blank", "width=880,height=760,scrollbars=yes");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleOpenPopbillView = (inv: any) => openPopbillInvoicePopup(inv, "VIEW_URL", "뷰어 URL 생성 실패");
  const handleOpenPopbillPrint = (inv: any) => openPopbillInvoicePopup(inv, "PRINT_URL", "인쇄 URL 생성 실패");

  const handleOpenPopbillPortal = async (
    actionType: "PORTAL_URL" | "CERT_URL" | "CHARGE_URL",
    overrideEntity?: EntityType
  ) => {
    try {
      const targetEntity: EntityType =
        overrideEntity || (entityFilter === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP");
      const data = await postPopbillAction(
        {
          action: actionType,
          entityType: targetEntity,
          corpNum: getEntity(targetEntity).bizNumRaw,
        },
        "팝빌 포털 URL 생성 실패"
      );
      window.open(data.url, "_blank", "width=1100,height=820,scrollbars=yes");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteInvoice = async (inv: any) => {
    if (
      !window.confirm(
        `[${inv.invoiceNo}] ${inv.customerName} (${formatErpCurrency(inv.totalAmount)})\n해당 세금계산서 데이터 및 연결된 예정 수납 매칭을 삭제하시겠습니까?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/erp/tax-invoices?id=${inv.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");
      showToast(data.message || "세금계산서가 삭제되었습니다.");
      setDetailInvoice(null);
      await fetchIssuedInvoices();
      await fetchUnissuedBillings();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const sendToNtsAndRefresh = async (
    payload: Record<string, unknown>,
    fallbackError: string,
    getSuccessMsg: (data: any) => string
  ) => {
    try {
      setSendingNts(true);
      const data = await postPopbillAction(payload, fallbackError);
      showToast(getSuccessMsg(data));
      await fetchIssuedInvoices();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSendingNts(false);
    }
  };

  const handleSendToNTS = async (inv: any) => {
    if (
      !window.confirm(
        `[${inv.invoiceNo}] ${inv.customerName}\n공급가액: ${formatErpCurrency(inv.supplyAmount)}\n발행완료(전송전) 상태의 세금계산서를 국세청으로 즉시전송 처리하시겠습니까?`
      )
    ) {
      return;
    }
    await sendToNtsAndRefresh(
      {
        action: "SEND_TO_NTS",
        mgtKey: inv.invoiceNo,
        corpNum: inv.supplierCorpNum || getEntity(inv.supplierEntityType).bizNumRaw,
        entityType: inv.supplierEntityType || "CORP",
      },
      "국세청 즉시전송 실패",
      (data) => data.message || `[${inv.invoiceNo}] 국세청 즉시전송 완료`
    );
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
    await sendToNtsAndRefresh(
      {
        action: "SEND_TO_NTS",
        mgtKeys: pendingNtsInvoices.map((i) => i.invoiceNo),
      },
      "국세청 일괄 즉시전송 실패",
      (data) => data.message || `${data.sentCount}건 국세청 즉시전송 완료`
    );
  };

  const sortedLinkedBankTxs = useMemo(
    () =>
      sortErpItems(linkedBankTxs, linkedBankSort.sortKey, linkedBankSort.sortDir, (tx, k) => {
        if (k === "amount") {
          return reconcileInvoice?.ioType === "PURCHASE"
            ? tx.withdrawalAmount || tx.amount
            : tx.depositAmount || tx.amount;
        }
        return undefined;
      }),
    [linkedBankTxs, linkedBankSort.sortKey, linkedBankSort.sortDir, reconcileInvoice?.ioType]
  );

  const filteredCandidateTxs = useMemo(() => {
    const base = !bankSearchTerm.trim()
      ? candidateBankTxs
      : candidateBankTxs.filter((tx) =>
          matchHangulAny(
            [tx.senderReceiver, tx.counterpartyHolder, tx.memo, tx.transDate, tx.depositAmount || tx.withdrawalAmount],
            bankSearchTerm
          )
        );
    return sortErpItems(base, candBankSort.sortKey, candBankSort.sortDir, (tx, k) => {
      if (k === "amount") {
        return reconcileInvoice?.ioType === "PURCHASE"
          ? tx.withdrawalAmount || tx.amount
          : tx.depositAmount || tx.amount;
      }
      return tx?.[k];
    });
  }, [candidateBankTxs, bankSearchTerm, candBankSort.sortKey, candBankSort.sortDir, reconcileInvoice?.ioType]);

  const manualPartners = useMemo(() => {
    const filtered = registeredPartners.filter((p) =>
      modalIoType === "PURCHASE"
        ? p.partnerType === "VENDOR" || p.partnerType === "BOTH"
        : p.partnerType === "CUSTOMER" || p.partnerType === "BOTH"
    );
    return sortCustomersByName(filtered);
  }, [registeredPartners, modalIoType]);

  const manualPartnerOptions = useMemo<SearchSelectOption[]>(() => {
    return manualPartners.map((p) => {
      const block = getPartnerTradeBlockInfo(p);
      return {
        value: String(p.id),
        label: p.name,
        subLabel: `사업자: ${p.businessNo || "-"} | 대표: ${p.ceoName || "-"}`,
        badgeText: block.blocked ? block.badgeText : p.partnerCode || undefined,
        badgeColor: block.blocked ? "rose" : "blue",
        searchKeywords: [p.name, p.businessNo, p.ceoName, p.partnerCode],
        disabled: block.blocked,
      };
    });
  }, [manualPartners]);

  const selectedManualPartnerId = useMemo(() => {
    if (!custName) return "";
    const found = manualPartners.find((p) => p.name === custName);
    return found ? String(found.id) : "";
  }, [manualPartners, custName]);

  const modalAccountSubjects = useMemo(() => {
    const isPurchase = reconcileInvoice?.ioType === "PURCHASE";
    const dir = isPurchase ? "WITHDRAWAL" : "DEPOSIT";
    return STANDARD_ACCOUNT_SUBJECTS.filter((s) => s.direction === dir || s.direction === "BOTH");
  }, [reconcileInvoice]);

  const selectedBankTxSum = useMemo(() => {
    if (!reconcileInvoice || selectedBankTxIds.size === 0) return 0;
    const isPurchase = reconcileInvoice.ioType === "PURCHASE";
    return candidateBankTxs.reduce((sum, tx) => {
      if (!selectedBankTxIds.has(Number(tx.id))) return sum;
      const amt = isPurchase
        ? Number(tx.withdrawalAmount || tx.amount || 0)
        : Number(tx.depositAmount || tx.amount || 0);
      return sum + amt;
    }, 0);
  }, [reconcileInvoice, candidateBankTxs, selectedBankTxIds]);

  const reconcileUnpaidBalance = useMemo(() => {
    if (!reconcileInvoice) return 0;
    return Math.max(0, Number(reconcileInvoice.totalAmount || 0) - Number(reconcileInvoice.settledAmount || 0));
  }, [reconcileInvoice]);

  const activeStats = activeSubTab === "PURCHASE_LEDGER" ? apStats : arStats;
  const isPurchaseTab = activeSubTab === "PURCHASE_LEDGER";

  const openIssueModal = (ioType: "SALE" | "PURCHASE") => {
    setModalIoType(ioType);
    setShowIssueModal(true);
  };

  const handleChangeEntityFilter = (val: "ALL" | "CORP" | "INDIVIDUAL") => {
    setEntityFilter(val);
    if (onSelectEntity) onSelectEntity(val);
  };

  const handleRefresh = () => {
    if (activeSubTab === "UNISSUED") fetchUnissuedBillings();
    else fetchIssuedInvoices();
  };

  return {
    toast, showToast,
    activeSubTab, setActiveSubTab,
    unissuedBillings, saleInvoices, purchaseInvoices,
    arStats, apStats, activeStats, isPurchaseTab,
    autoMatching, handleAutoMatch, openIssueModal, handleOpenPopbillPortal, popbillLive,
    settlementFilter, setSettlementFilter, unpaidByPartner,
    searchTerm, setSearchTerm, entityFilter, handleChangeEntityFilter,
    domainFilter, setDomainFilter, isRefreshing: loading || unissuedLoading, handleRefresh,
    selectedSummary, batchIssuing, handleBatchIssue,
    pendingNtsCount: pendingNtsInvoices.length, sendingNts, handleBatchSendToNTS,
    sortedInvoices,
    sortedUnissued, filteredUnissuedCount: filteredUnissued.length,
    selectedBillingIds, getBillingUid, toggleSelectAll, toggleSelectBilling,
    unissuedSortKey, unissuedSortDir, handleUnissuedSort, handleSingleIssueFromBilling,
    sortKey, sortDir, handleSort, openReconcileModal, handleQuickFullSettle,
    detailInvoice, setDetailInvoice, handleSendToNTS,
    rpaDeptUserId, setRpaDeptUserId, rpaDeptUserPw, setRpaDeptUserPw,
    rpaSaving, handleSaveRpaSettings,
    htSyncTarget, setHtSyncTarget, htStartDate, setHtStartDate, htEndDate, setHtEndDate,
    htSyncing, handleHometaxSync,
    excelUploadIoType, setExcelUploadIoType, excelUploading, excelInputRef, handleHometaxExcelUpload,
    htSyncLogs,
    reconcileInvoice, setReconcileInvoice, reconcileLoading, reconcileUnpaidBalance,
    bankSearchTerm, setBankSearchTerm, batchSubject, setBatchSubject,
    candBankSort, filteredCandidateTxs, linkedBankSort, linkedBankTxs, sortedLinkedBankTxs,
    manualSettleInput, setManualSettleInput, modalAccountSubjects,
    rowSubjectMap, setRowSubjectMap, selectedBankTxIds, setSelectedBankTxIds, selectedBankTxSum,
    settleReasonInput, setSettleReasonInput,
    handleClassifyBankTxInModal, handleConfirmBankMatch, handleManualSettleSave, handleUnmatchBankTx,
    showIssueModal, setShowIssueModal, custName, setCustName, domainType, setDomainType,
    handleManualIssue, issueDate, setIssueDate, manualNtsConfirmNo, setManualNtsConfirmNo,
    manualPartnerOptions, manualPartners, manualTaxSpec, setManualTaxSpec,
    modalIoType, setModalIoType, modalSupplierEntity, setModalSupplierEntity, selectedManualPartnerId,
    handleDeleteInvoice, handleOpenPopbillPrint, handleOpenPopbillView,
  };
}
