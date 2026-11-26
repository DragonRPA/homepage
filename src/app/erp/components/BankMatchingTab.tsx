"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  Plus,
  Download,
  RefreshCw,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatErpCurrency, cleanErpNumber, sortErpItems } from "@/lib/erpFormat";
import { matchHangulAny } from "@/lib/hangulSearch";
import { useErpTableSort } from "./SortableTh";
import { STANDARD_ACCOUNT_SUBJECTS, recommendAccountSubjectForTx } from "@/lib/erpAccountSubjects";
import {
  BankTransaction,
  BankMatchingTabProps,
  AccountStatusItem,
  BankSummary,
  NewTransactionState,
  UploadResultState,
} from "./bank-matching/bankMatchingTypes";
import { BankLedgerGridAndSummary } from "./bank-matching/BankLedgerGridAndSummary";

const BankUploadModal = dynamic(
  () => import("./bank-matching/BankUploadModal").then((m) => m.BankUploadModal),
  { ssr: false }
);
const ManualTransactionModal = dynamic(
  () =>
    import("./bank-matching/ManualTransactionModal").then(
      (m) => m.ManualTransactionModal
    ),
  { ssr: false }
);
const BankMatchModal = dynamic(
  () => import("./bank-matching/BankMatchModal").then((m) => m.BankMatchModal),
  { ssr: false }
);

export const BankMatchingTab: React.FC<BankMatchingTabProps> = ({
  currentUser,
  selectedEntity = "ALL",
  onSelectEntity,
  isActive = true,
}) => {
  const today = new Date().toISOString().substring(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .substring(0, 10);

  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState(today);
  const [transType, setTransType] = useState<"ALL" | "DEPOSIT" | "WITHDRAWAL">("ALL");
  const [txChannel, setTxChannel] = useState("ALL");
  const [matchStatus, setMatchStatus] = useState<
    "UNCLOSED" | "ALL" | "MATCHED" | "UNMATCHED" | "PAYROLL" | "INVOICE"
  >("UNCLOSED");
  const [accountFilter, setAccountFilter] = useState<string>(() =>
    selectedEntity === "CORP"
      ? "478-081383-04-018"
      : selectedEntity === "INDIVIDUAL"
      ? "140-129404-04-018"
      : "ALL"
  );
  const [search, setSearch] = useState("");
  const prevActiveRef = useRef(isActive);

  useEffect(() => {
    if (selectedEntity === "CORP") {
      setAccountFilter("478-081383-04-018");
    } else if (selectedEntity === "INDIVIDUAL") {
      setAccountFilter("140-129404-04-018");
    } else {
      setAccountFilter("ALL");
    }
  }, [selectedEntity]);

  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [accountStatus, setAccountStatus] = useState<AccountStatusItem[]>([]);
  const [summary, setSummary] = useState<BankSummary>({
    totalCount: 0,
    depositCount: 0,
    withdrawalCount: 0,
    totalDeposit: 0,
    totalWithdrawal: 0,
    matchedDeposit: 0,
    unmatchedDeposit: 0,
    latestBalance: 0,
    latestTxDatetime: null,
    excludedClosedCount: 0,
  });
  const [loading, setLoading] = useState(false);

  // 수기 단건 등록 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [newTrans, setNewTrans] = useState<NewTransactionState>({
    entityType: "CORP",
    bankName: "기업은행",
    accountNo: "478-081383-04-018",
    transDate: today,
    transTime: "12:00:00",
    transType: "DEPOSIT",
    amount: "",
    balanceAfter: "",
    senderReceiver: "",
    counterpartyBank: "",
    counterpartyAccount: "",
    counterpartyHolder: "",
    txChannel: "타행이체",
    memo: "",
  });

  // 통장내역 파일 업로드 모달
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadAccountNo, setUploadAccountNo] = useState("AUTO");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [rawPasteText, setRawPasteText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResultState | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1:1 대사 매칭 모달 (탭 1: 계정과목 지정 정리 / 탭 2: 미결 세금계산서와 엮어 매칭 완결)
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchModalTab, setMatchModalTab] = useState<"ACCOUNT" | "INVOICE">("ACCOUNT");
  const [selectedTrans, setSelectedTrans] = useState<BankTransaction | null>(null);
  const [matchedType, setMatchedType] = useState("ACCOUNT_SUBJECT");
  const [matchedId, setMatchedId] = useState("");
  const [matchMemo, setMatchMemo] = useState("");
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<number>>(new Set());
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState("");
  const [settleReason, setSettleReason] = useState("수수료/단수절사 차액 상계 완납");

  // 미매칭 통장 내역 다중 선택 및 일괄 계정과목 정리 상태
  const [selectedTxIds, setSelectedTxIds] = useState<Set<number>>(new Set());
  const [batchAccountSubject, setBatchAccountSubject] = useState<string>(
    STANDARD_ACCOUNT_SUBJECTS[0]?.label || ""
  );
  const [rowAccountMap, setRowAccountMap] = useState<Record<number, string>>({});

  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 정렬 상태
  const { sortKey, sortDir, handleSort } = useErpTableSort("transDate", "desc");
  const modalInvSort = useErpTableSort("", null);

  const sortedTransactions = useMemo(() => {
    if (sortKey === "transDate" && sortDir !== null) {
      return [...transactions].sort((a, b) => {
        const dtA = `${a.transDate} ${a.transTime || "00:00:00"}`;
        const dtB = `${b.transDate} ${b.transTime || "00:00:00"}`;
        return sortDir === "asc" ? dtA.localeCompare(dtB) : dtB.localeCompare(dtA);
      });
    }
    return sortErpItems(transactions, sortKey, sortDir);
  }, [transactions, sortKey, sortDir]);

  const filteredModalInvoices = useMemo(() => {
    if (!selectedTrans) return [];
    const isDep = selectedTrans.depositAmount > 0;
    const expectedIo = isDep ? "SALE" : "PURCHASE";
    const txEntity =
      selectedTrans.entityType || (selectedTrans.accountNo?.includes("140") ? "INDIVIDUAL" : "CORP");
    const txAmt = isDep ? selectedTrans.depositAmount : selectedTrans.withdrawalAmount;
    const srNorm = (selectedTrans.senderReceiver || "").replace(/\s+/g, "").toLowerCase();
    const holderNorm = (selectedTrans.counterpartyHolder || "").replace(/\s+/g, "").toLowerCase();
    const q = invoiceSearchTerm.trim().toLowerCase();

    const base = unpaidInvoices
      .filter((inv) => {
        const io = inv.ioType || "SALE";
        if (io !== expectedIo) return false;
        const ent = inv.supplierEntityType || "CORP";
        if (ent !== txEntity) return false;
        if (!q) return true;
        return matchHangulAny(
          [
            inv.customerName,
            inv.itemName,
            inv.invoiceNo,
            inv.totalAmount,
            inv.issueDate,
          ],
          q
        );
      })
      .map((inv) => {
        const unpaidAmt = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.settledAmount || 0));
        const custNorm = String(inv.customerName || "")
          .replace(/\(주\)|주식회사|㈜|\s+/g, "")
          .toLowerCase();
        let score = 0;
        if (
          custNorm.length >= 2 &&
          (srNorm.includes(custNorm) || custNorm.includes(srNorm) || holderNorm.includes(custNorm))
        ) {
          score += 50;
        }
        if (Math.abs(unpaidAmt - txAmt) <= 1000) score += 45;
        return { ...inv, unpaidAmt, matchScore: score };
      })
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return String(b.issueDate || "").localeCompare(String(a.issueDate || ""));
      });
    return sortErpItems(base, modalInvSort.sortKey, modalInvSort.sortDir);
  }, [selectedTrans, unpaidInvoices, invoiceSearchTerm, modalInvSort.sortKey, modalInvSort.sortDir]);

  const selectedInvoicesSum = useMemo(() => {
    return filteredModalInvoices.reduce((acc, inv) => {
      if (!selectedInvoiceIds.has(Number(inv.id))) return acc;
      return acc + Number(inv.unpaidAmt || 0);
    }, 0);
  }, [filteredModalInvoices, selectedInvoiceIds]);

  const handleAccountFilterChange = (nextAccountNo: string) => {
    setAccountFilter(nextAccountNo);
    if (!onSelectEntity) return;
    if (nextAccountNo === "ALL") {
      onSelectEntity("ALL");
      return;
    }
    const accMeta = accountStatus.find((a) => a.accountNo === nextAccountNo);
    const isIndiv =
      accMeta?.entityType === "INDIVIDUAL" || nextAccountNo.includes("140");
    onSelectEntity(isIndiv ? "INDIVIDUAL" : "CORP");
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        transType,
        txChannel,
        matchStatus,
        search,
      });
      if (accountFilter !== "ALL") {
        params.set("accountNo", accountFilter);
      }
      const res = await fetch(`/api/erp/bank-matching?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "조회 실패");

      setTransactions(data.transactions || []);
      if (Array.isArray(data.accountStatus)) setAccountStatus(data.accountStatus);
      if (data.summary) setSummary(data.summary);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate, transType, txChannel, matchStatus, accountFilter]);

  // 타 메뉴 이동 후 재진입 시 기마감 내역을 기본 제외한 최신 미마감 상태로 복귀
  useEffect(() => {
    const wasInactive = !prevActiveRef.current;
    prevActiveRef.current = isActive;
    if (wasInactive && isActive) {
      const needsFilterReset =
        matchStatus !== "UNCLOSED" || startDate !== "2023-01-01" || endDate !== today;
      if (needsFilterReset) {
        setStartDate("2023-01-01");
        setEndDate(today);
        setMatchStatus("UNCLOSED");
      } else {
        fetchTransactions();
      }
    }
  }, [isActive]);

  const formatMonthRange = (year: number, monthIndex0: number) => {
    const first = new Date(year, monthIndex0, 1);
    const last = new Date(year, monthIndex0 + 1, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = first.getFullYear();
    const m = pad(first.getMonth() + 1);
    return {
      start: `${y}-${m}-01`,
      end: `${y}-${m}-${pad(last.getDate())}`,
      label: `${y}-${m}`,
    };
  };

  const shiftMonthPeriod = (delta: number) => {
    // 현재 startDate가 특정 월의 1일이면 그 월을 기준으로, 아니면 현재 월을 기준으로 이동
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em] = endDate.split("-").map(Number);
    const isSingleMonthView = sy === ey && sm === em && sd === 1;
    const baseYear = isSingleMonthView ? sy : new Date().getFullYear();
    const baseMonth0 = isSingleMonthView ? sm - 1 : new Date().getMonth();
    const range = formatMonthRange(baseYear, baseMonth0 + delta);
    if (matchStatus === "UNCLOSED") setMatchStatus("ALL");
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const activeMonthLabel = useMemo(() => {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em] = endDate.split("-").map(Number);
    if (sy && sm && sy === ey && sm === em && sd === 1) {
      return `${sy}.${String(sm).padStart(2, "0")}월`;
    }
    return "당월";
  }, [startDate, endDate]);

  const setPeriodPreset = (
    preset: "UNCLOSED" | "ALL" | "2026" | "2025" | "2024" | "2023" | "MONTH"
  ) => {
    if (preset === "UNCLOSED") {
      setStartDate("2023-01-01");
      setEndDate(today);
      setMatchStatus("UNCLOSED");
      return;
    }
    if (matchStatus === "UNCLOSED") {
      setMatchStatus("ALL");
    }
    if (preset === "ALL") {
      setStartDate("2023-01-01");
      setEndDate(today);
    } else if (preset === "2026") {
      setStartDate("2026-01-01");
      setEndDate("2026-12-31");
    } else if (preset === "2025") {
      setStartDate("2025-01-01");
      setEndDate("2025-12-31");
    } else if (preset === "2024") {
      setStartDate("2024-01-01");
      setEndDate("2024-12-31");
    } else if (preset === "2023") {
      setStartDate("2023-01-01");
      setEndDate("2023-12-31");
    } else if (preset === "MONTH") {
      const now = new Date();
      const range = formatMonthRange(now.getFullYear(), now.getMonth());
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  // 파일 업로드 또는 텍스트 붙여넣기 실행
  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 && !rawPasteText.trim()) {
      showToast("업로드할 파일을 선택하거나 거래내역 텍스트를 입력해 주세요.", "error");
      return;
    }

    setUploading(true);
    setUploadResult(null);
    try {
      let res: Response;
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        formData.append("accountNo", uploadAccountNo);
        for (const f of selectedFiles) {
          formData.append("files", f);
        }
        res = await fetch("/api/erp/bank-matching", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/erp/bank-matching", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawText: rawPasteText,
            accountNo: uploadAccountNo,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "파일 업로드 실패");
      }

      setUploadResult({
        totalParsed: data.totalParsed,
        insertedCount: data.insertedCount,
        duplicateCount: data.duplicateCount,
        meta: data.meta,
      });
      const closedMsg =
        Array.isArray(data.newlyClosedAccounts) && data.newlyClosedAccounts.length > 0
          ? " · 전건 매칭 완료(마감 확정)"
          : "";
      showToast(
        `업로드 완료: 총 ${data.totalParsed}건 확인 (신규 저장 ${data.insertedCount}건 / 중복 제외 ${data.duplicateCount}건${closedMsg})`
      );
      setSelectedFiles([]);
      setRawPasteText("");
      await fetchTransactions();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // 단건 등록
  const handleCreateTrans = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrans.senderReceiver.trim()) {
      showToast("거래내용(입금자/거래처)을 입력해 주세요.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/bank-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTrans,
          amount: cleanErpNumber(newTrans.amount),
          balanceAfter: cleanErpNumber(newTrans.balanceAfter),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "등록 실패");

      showToast("은행 거래내역이 등록되었습니다.");
      setModalOpen(false);
      await fetchTransactions();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 미결 세금계산서 목록 로드 (통장 입출금 ➔ 세금계산서 역방향 매칭용)
  const fetchUnpaidInvoicesForMatch = async (tx?: BankTransaction) => {
    try {
      const targetEntity =
        tx?.entityType ||
        (tx?.accountNo?.includes("140") ? "INDIVIDUAL" : selectedEntity !== "ALL" ? selectedEntity : "ALL");
      const params = new URLSearchParams();
      if (targetEntity !== "ALL") params.set("supplierEntityType", targetEntity);
      const res = await fetch(`/api/erp/tax-invoices?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.invoices)) {
        const list = data.invoices.filter((inv: any) => (inv.settlementStatus || "UNPAID") !== "PAID");
        setUnpaidInvoices(list);
      }
    } catch (e) {
      console.error("Failed to fetch unpaid invoices:", e);
    }
  };

  const getEffectiveRowAccountSubject = (t: BankTransaction): string => {
    if (rowAccountMap[t.id]) return rowAccountMap[t.id];
    const rec = recommendAccountSubjectForTx(t);
    if (rec) return rec;
    const dir = t.depositAmount > 0 ? "DEPOSIT" : "WITHDRAWAL";
    return (
      STANDARD_ACCOUNT_SUBJECTS.find(
        (s) => s.direction === dir || s.direction === "BOTH"
      )?.label || ""
    );
  };

  // 단건 또는 다건 단일 계정과목 즉시 지정 정리
  const handleAssignAccountSubject = async (ids: number[], subjectLabel: string, customMemo?: string) => {
    if (ids.length === 0 || !subjectLabel.trim()) {
      showToast("거래내역과 지정할 계정과목을 선택해 주십시오.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/bank-matching", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BATCH_ASSIGN_ACCOUNT",
          ids,
          accountSubject: subjectLabel.trim(),
          memo: customMemo,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "계정과목 지정 실패");

      showToast(data.message || "계정과목 정리가 완료되었습니다.");
      setSelectedTxIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      setRowAccountMap((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
      setMatchModalOpen(false);
      await fetchTransactions();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 다중 선택된 거래내역을 각 행의 추천 또는 수동 변경 계정과목대로 일괄 확정
  const handleAssignPerRowAccountSubjects = async (ids: number[]) => {
    if (ids.length === 0) {
      showToast("정리할 거래내역을 선택해 주십시오.", "error");
      return;
    }
    const txById = new Map(transactions.map((t) => [t.id, t]));
    const items = ids
      .map((txId) => {
        const tx = txById.get(txId);
        if (!tx) return null;
        const accountSubject = getEffectiveRowAccountSubject(tx).trim();
        if (!accountSubject) return null;
        return { id: txId, accountSubject };
      })
      .filter((it): it is { id: number; accountSubject: string } => it !== null);

    if (items.length === 0) {
      showToast("선택된 거래의 추천·지정 계정과목을 확인할 수 없습니다.", "error");
      return;
    }

    try {
      const res = await fetch("/api/erp/bank-matching", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BATCH_ASSIGN_ACCOUNT",
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "일괄 계정과목 지정 실패");

      showToast(data.message || "행별 추천·지정 계정과목 일괄 정리가 완료되었습니다.");
      setSelectedTxIds((prev) => {
        const next = new Set(prev);
        for (const it of items) next.delete(it.id);
        return next;
      });
      setRowAccountMap((prev) => {
        const next = { ...prev };
        for (const it of items) delete next[it.id];
        return next;
      });
      await fetchTransactions();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 통장 거래내역과 선택한 미결 세금계산서(1~N건)를 엮어 매칭 완결
  const handleMatchWithInvoices = async (forceComplete: boolean) => {
    if (!selectedTrans || selectedInvoiceIds.size === 0) {
      showToast("연결할 미결 세금계산서를 1건 이상 선택해 주십시오.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/bank-matching", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MATCH_INVOICES",
          ids: [selectedTrans.id],
          invoiceIds: Array.from(selectedInvoiceIds),
          forceComplete,
          settleReason: forceComplete ? settleReason : undefined,
          memo: matchMemo.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "세금계산서 연동 대사 실패");

      showToast(data.message);
      setSelectedTxIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedTrans.id);
        return next;
      });
      setMatchModalOpen(false);
      setSelectedInvoiceIds(new Set());
      await fetchTransactions();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 대사 매칭 모달 열기
  const openMatchModal = (t: BankTransaction) => {
    setSelectedTrans(t);
    const rec = recommendAccountSubjectForTx(t);
    const isDep = t.depositAmount > 0;
    const defaultSubj =
      rec ||
      STANDARD_ACCOUNT_SUBJECTS.find((s) => s.direction === (isDep ? "DEPOSIT" : "WITHDRAWAL"))?.label ||
      "";
    setMatchedType("ACCOUNT_SUBJECT");
    setMatchedId(defaultSubj);
    setMatchMemo(t.memo || "");
    setMatchModalTab("ACCOUNT");
    setSelectedInvoiceIds(new Set());
    setInvoiceSearchTerm("");
    setMatchModalOpen(true);
    fetchUnpaidInvoicesForMatch(t);
  };

  // 대사 매칭 확정
  const handleManualMatch = async () => {
    if (!selectedTrans) return;
    if (matchModalTab === "INVOICE") {
      await handleMatchWithInvoices(true);
      return;
    }
    try {
      const res = await fetch("/api/erp/bank-matching", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTrans.id,
          matchedType,
          matchedId: matchedId.trim() || "기타지급수수료·현장운영경비",
          memo: matchMemo.trim() || selectedTrans.memo,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "대사 매칭 실패");

      showToast("대사 매칭이 완료되었습니다.");
      setSelectedTxIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedTrans.id);
        return next;
      });
      setMatchModalOpen(false);
      await fetchTransactions();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleUnmatch = async (id: number) => {
    if (!confirm("해당 거래의 대사 매칭을 취소하시겠습니까?")) return;
    try {
      const res = await fetch("/api/erp/bank-matching", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "UNMATCH" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "취소 실패");

      showToast("대사가 취소되었습니다.");
      await fetchTransactions();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 엑셀(CSV) 내보내기 (IBK 13열 표준 포맷 호환)
  const handleExportCsv = () => {
    const headers = [
      "순번",
      "거래일시",
      "출금",
      "입금",
      "거래후 잔액",
      "거래내용",
      "상대계좌번호",
      "상대은행",
      "메모",
      "거래구분",
      "수표어음금액",
      "CMS코드",
      "상대계좌예금주명",
      "계좌번호",
      "대사상태",
      "매칭ID",
    ];
    const escapeCsv = (val: any) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = sortedTransactions.map((t, idx) => [
      idx + 1,
      `${t.transDate} ${t.transTime || "00:00:00"}`,
      t.withdrawalAmount || 0,
      t.depositAmount || 0,
      t.balanceAfter || 0,
      t.senderReceiver || "",
      t.counterpartyAccount || "",
      t.counterpartyBank || "",
      t.memo || "",
      t.txChannel || "",
      t.checkAmount || 0,
      t.cmsCode || "",
      t.counterpartyHolder || "",
      t.accountNo || "",
      t.isMatched ? (t.isClosed ? "기마감" : "매칭완료") : "미매칭",
      t.matchedId || "",
    ]);

    const csvBody = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r) => r.map(escapeCsv).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvBody], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `거래내역조회_입출식_예금_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-full md:h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 md:overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-xs font-bold border ${
            toastMessage.type === "success"
              ? "bg-[#ecfdf5] border-[#047857] text-[#065f46]"
              : "bg-[#fef2f2] border-[#dc2626] text-[#b91c1c]"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* 1. Gutenberg Z-Pattern Step 1 (Scope) & Step 2 (Pipeline) */}
      <div className="p-2.5 md:p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-end justify-between gap-2.5 shrink-0">
        {/* Left: Scope (좌상단 조회 조건 - 상하 스택 배치 원칙 3.4 준수) */}
        <div className="flex flex-wrap items-end gap-2 w-full sm:w-auto">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              조회 기간
            </label>
            <div className="flex items-center gap-1 bg-[#f4efe4] px-2 py-1 rounded border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 w-full sm:w-auto justify-between">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  if (matchStatus === "UNCLOSED") setMatchStatus("ALL");
                  setStartDate(e.target.value);
                }}
                className="bg-transparent text-xs text-[#0f172a] dark:text-slate-200 focus:outline-none font-mono min-w-0"
              />
              <span className="text-[#475569] dark:text-slate-500 text-xs">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  if (matchStatus === "UNCLOSED") setMatchStatus("ALL");
                  setEndDate(e.target.value);
                }}
                className="bg-transparent text-xs text-[#0f172a] dark:text-slate-200 focus:outline-none font-mono min-w-0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              기간 선택
            </label>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setPeriodPreset("UNCLOSED")}
                className={`px-2 py-1.5 text-[11px] font-bold rounded border whitespace-nowrap shrink-0 transition ${
                  matchStatus === "UNCLOSED"
                    ? "border-[#1d4ed8] bg-[#1d4ed8] text-white"
                    : "border-[#b5a894] bg-[#f4efe4] hover:bg-[#dcd4c4] text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                }`}
              >
                미마감
              </button>
              {[
                { key: "ALL", label: "전체" },
                { key: "2026", label: "2026년" },
                { key: "2025", label: "2025년" },
                { key: "2024", label: "2024년" },
                { key: "2023", label: "2023년" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriodPreset(p.key as any)}
                  className="px-2 py-1.5 text-[11px] font-bold rounded border border-[#b5a894] bg-[#f4efe4] hover:bg-[#dcd4c4] text-[#0f172a] whitespace-nowrap shrink-0 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  {p.label}
                </button>
              ))}
              <div className="inline-flex items-center rounded border border-[#b5a894] bg-[#f4efe4] shrink-0 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => shiftMonthPeriod(-1)}
                  className="px-1.5 py-1.5 text-[#0f172a] hover:bg-[#dcd4c4] border-r border-[#b5a894] transition dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                  title="이전 월 (1개월 이동)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodPreset("MONTH")}
                  className="px-2 py-1.5 text-[11px] font-bold text-[#0f172a] hover:bg-[#dcd4c4] whitespace-nowrap transition dark:text-slate-200 dark:hover:bg-slate-700"
                  title="당월 초기화"
                >
                  {activeMonthLabel}
                </button>
                <button
                  type="button"
                  onClick={() => shiftMonthPeriod(1)}
                  className="px-1.5 py-1.5 text-[#0f172a] hover:bg-[#dcd4c4] border-l border-[#b5a894] transition dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                  title="다음 월 (1개월 이동)"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              입출금 구분
            </label>
            <select
              value={transType}
              onChange={(e) => setTransType(e.target.value as any)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 구분</option>
              <option value="DEPOSIT">입금</option>
              <option value="WITHDRAWAL">출금</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              거래구분
            </label>
            <select
              value={txChannel}
              onChange={(e) => setTxChannel(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 거래구분</option>
              <option value="타행이체">타행이체</option>
              <option value="체크">체크</option>
              <option value="인터넷">인터넷</option>
              <option value="펌이체">펌이체</option>
              <option value="대체">대체</option>
              <option value="국세">국세</option>
              <option value="BC">BC</option>
              <option value="월이체">월이체</option>
              <option value="지로">지로</option>
              <option value="이자">이자</option>
              <option value="취소">취소</option>
              <option value="정정">정정</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              대사상태
            </label>
            <select
              value={matchStatus}
              onChange={(e) => setMatchStatus(e.target.value as any)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 font-semibold"
            >
              <option value="UNCLOSED">미마감 내역 (기마감 제외)</option>
              <option value="UNMATCHED">미매칭</option>
              <option value="ALL">전체 상태 (기마감 포함)</option>
              <option value="MATCHED">매칭완료 (기마감 포함)</option>
              <option value="PAYROLL">급여 항목 (기마감 포함)</option>
              <option value="INVOICE">세금계산서 매칭 (기마감 포함)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[140px]">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              계좌 선택
            </label>
            <select
              value={accountFilter}
              onChange={(e) => handleAccountFilterChange(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] font-medium whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 max-w-[210px] sm:max-w-none truncate"
            >
              <option value="ALL">전체 계좌</option>
              <option value="478-081383-04-018">
                기업은행 478-081383-04-018 [법인]
                {accountStatus.find((a) => a.accountNo === "478-081383-04-018")?.latestTransDate
                  ? ` (최종: ${accountStatus.find((a) => a.accountNo === "478-081383-04-018")?.latestTransDate})`
                  : ""}
              </option>
              <option value="140-129404-04-018">
                기업은행 140-129404-04-018 [개인]
                {accountStatus.find((a) => a.accountNo === "140-129404-04-018")?.latestTransDate
                  ? ` (최종: ${accountStatus.find((a) => a.accountNo === "140-129404-04-018")?.latestTransDate})`
                  : ""}
              </option>
            </select>
          </div>

          <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[150px]">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              검색어
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#475569] dark:text-slate-400" />
              <input
                type="text"
                placeholder="거래내용, 예금주, 계좌, 메모"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchTransactions()}
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] pl-8 pr-3 py-1.5 rounded w-full sm:w-48 focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Right: Pipeline (우상단 데이터 유입 버튼군) */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            title="조회"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => {
              setUploadResult(null);
              setSelectedFiles([]);
              setRawPasteText("");
              setUploadModalOpen(true);
            }}
            className="px-3 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>통장내역 업로드</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] text-xs font-bold rounded flex items-center gap-1.5 border border-[#b5a894] shadow-xs whitespace-nowrap transition dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>거래내역 등록</span>
          </button>
        </div>
      </div>

      {/* 계좌별 마지막 업로드 데이터 기준일시 현황 바 */}
      {accountStatus.length > 0 && (
        <div className="px-3 py-2 bg-[#dcd4c4] border-b border-[#b5a894] dark:bg-slate-900/90 dark:border-slate-800 flex flex-wrap items-center gap-2.5 shrink-0 text-xs">
          <span className="font-bold text-[11px] text-[#334155] dark:text-slate-400 whitespace-nowrap">
            계좌별 마지막 업로드 데이터:
          </span>
          {accountStatus.map((acc) => {
            const isSelected = accountFilter === acc.accountNo;
            const isCorp = acc.entityType !== "INDIVIDUAL";
            const uploadedAtStr = acc.lastUploadedAt
              ? new Date(acc.lastUploadedAt).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })
              : null;
            return (
              <button
                key={acc.accountNo}
                type="button"
                onClick={() =>
                  handleAccountFilterChange(accountFilter === acc.accountNo ? "ALL" : acc.accountNo)
                }
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded border text-[11px] whitespace-nowrap transition ${
                  isSelected
                    ? "bg-[#dbeafe] border-[#1d4ed8] text-[#0f172a] shadow-xs dark:bg-blue-950/60 dark:border-blue-500 dark:text-white"
                    : "bg-[#f4efe4] border-[#b5a894] text-[#0f172a] hover:bg-[#ebe5d8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                }`}
                title="클릭하여 해당 계좌만 필터링"
              >
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isCorp
                      ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]"
                      : "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                  }`}
                >
                  {isCorp ? "법인" : "개인"}
                </span>
                <span className="font-semibold">{acc.bankName}</span>
                <span className="font-mono font-bold text-[#1e293b] dark:text-slate-100">
                  {acc.accountNo}
                </span>
                <span className="text-[#94a3b8]">|</span>
                {acc.latestTransDatetime ? (
                  <>
                    <span className="text-[#475569] dark:text-slate-400">마지막 거래일시:</span>
                    <span className="font-mono font-bold text-[#047857] dark:text-emerald-400">
                      {acc.latestTransDatetime}
                    </span>
                    <span className="text-[#64748b] dark:text-slate-400 font-mono">
                      (잔액 {formatErpCurrency(acc.latestBalance)} / 총 {acc.totalCount.toLocaleString()}건
                      {uploadedAtStr ? ` · 업로드: ${uploadedAtStr}` : ""})
                    </span>
                    {acc.isAllClosed ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] whitespace-nowrap">
                        대사마감 완료
                      </span>
                    ) : (acc.unmatchedCount || 0) > 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a] whitespace-nowrap">
                        미매칭 {(acc.unmatchedCount || 0).toLocaleString()}건
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="font-semibold text-[#dc2626] dark:text-rose-400">
                    업로드된 거래데이터 없음
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 미매칭 항목 다중 선택 시 일괄 계정과목 지정 바 */}
      {selectedTxIds.size > 0 && (
        <div className="px-3 py-2 bg-[#fef3c7] border-b border-[#b5a894] dark:bg-amber-950/60 dark:border-amber-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#92400e] dark:text-amber-300">
              선택된 미매칭 거래 {selectedTxIds.size}건
            </span>
            <button
              type="button"
              onClick={() => setSelectedTxIds(new Set())}
              className="px-2 py-0.5 rounded border border-[#b5a894] bg-[#f4efe4] text-[11px] font-bold text-[#0f172a]"
            >
              선택 해제
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleAssignPerRowAccountSubjects(Array.from(selectedTxIds))}
              className="px-3 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs shadow-xs whitespace-nowrap"
            >
              선택 {selectedTxIds.size}건 추천·지정 계정 일괄 확정
            </button>
            <span className="text-[#b5a894] hidden sm:inline">|</span>
            <span className="font-bold text-[11px] text-[#334155] dark:text-slate-300 whitespace-nowrap">
              단일 계정 덮어쓰기:
            </span>
            <select
              value={batchAccountSubject}
              onChange={(e) => setBatchAccountSubject(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs font-bold text-[#0f172a] px-2.5 py-1 rounded focus:outline-none focus:border-[#1d4ed8]"
            >
              {STANDARD_ACCOUNT_SUBJECTS.map((s) => (
                <option key={s.code} value={s.label}>
                  [{s.direction === "DEPOSIT" ? "입금" : "출금"}] {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                handleAssignAccountSubject(Array.from(selectedTxIds), batchAccountSubject)
              }
              className="px-2.5 py-1 rounded bg-[#334155] hover:bg-[#1e293b] text-white font-bold text-xs shadow-xs whitespace-nowrap"
            >
              동일 계정 적용
            </button>
          </div>
        </div>
      )}

      <BankLedgerGridAndSummary
        sortedTransactions={sortedTransactions}
        summary={summary}
        matchStatus={matchStatus}
        search={search}
        onShowAllStatus={() => setMatchStatus("ALL")}
        selectedTxIds={selectedTxIds}
        setSelectedTxIds={setSelectedTxIds}
        rowAccountMap={rowAccountMap}
        setRowAccountMap={setRowAccountMap}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onUnmatch={handleUnmatch}
        onOpenMatchModal={openMatchModal}
        onAssignAccountSubject={handleAssignAccountSubject}
      />

      {/* 통장내역 파일 업로드 모달 */}
      {uploadModalOpen && (
        <BankUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onSubmit={handleFileUploadSubmit}
          accountStatus={accountStatus}
          uploadAccountNo={uploadAccountNo}
          setUploadAccountNo={setUploadAccountNo}
          fileInputRef={fileInputRef}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          rawPasteText={rawPasteText}
          setRawPasteText={setRawPasteText}
          uploading={uploading}
          uploadResult={uploadResult}
        />
      )}

      {/* 단건 수기 등록 모달 */}
      {modalOpen && (
        <ManualTransactionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreateTrans}
          newTrans={newTrans}
          setNewTrans={setNewTrans}
        />
      )}

      {/* 1:1 / 1:N 대사 매칭 및 계정과목 정리 모달 */}
      {matchModalOpen && !!selectedTrans && (
        <BankMatchModal
          isOpen={matchModalOpen && !!selectedTrans}
          onClose={() => setMatchModalOpen(false)}
          selectedTrans={selectedTrans}
          matchModalTab={matchModalTab}
          setMatchModalTab={setMatchModalTab}
          matchedType={matchedType}
          setMatchedType={setMatchedType}
          matchedId={matchedId}
          setMatchedId={setMatchedId}
          matchMemo={matchMemo}
          setMatchMemo={setMatchMemo}
          invoiceSearchTerm={invoiceSearchTerm}
          setInvoiceSearchTerm={setInvoiceSearchTerm}
          filteredModalInvoices={filteredModalInvoices}
          selectedInvoiceIds={selectedInvoiceIds}
          setSelectedInvoiceIds={setSelectedInvoiceIds}
          selectedInvoicesSum={selectedInvoicesSum}
          settleReason={settleReason}
          setSettleReason={setSettleReason}
          modalInvSort={modalInvSort}
          handleManualMatch={handleManualMatch}
          handleMatchWithInvoices={handleMatchWithInvoices}
        />
      )}
    </div>
  );
};
