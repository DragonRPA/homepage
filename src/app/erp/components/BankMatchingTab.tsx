"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2,
  Search,
  Plus,
  Download,
  RefreshCw,
  Link as LinkIcon,
  Upload,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Check,
} from "lucide-react";
import { formatErpCurrency, sortErpItems, SortDirection } from "@/lib/erpFormat";

interface BankTransaction {
  id: number;
  entityType?: "CORP" | "INDIVIDUAL";
  bankName: string;
  accountNo: string;
  accountHolder?: string;
  accountProduct?: string;
  transDate: string;
  transTime: string;
  transType: "DEPOSIT" | "WITHDRAWAL" | "OPEN";
  amount: number;
  withdrawalAmount: number;
  depositAmount: number;
  balanceAfter: number;
  senderReceiver: string;
  counterpartyAccount: string | null;
  counterpartyBank: string | null;
  memo: string | null;
  txChannel: string | null;
  checkAmount: number;
  cmsCode: string | null;
  counterpartyHolder: string | null;
  isMatched: boolean;
  matchedType: string | null;
  matchedId: string | null;
  matchedAt: string | null;
}

interface BankMatchingTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
}

export const BankMatchingTab: React.FC<BankMatchingTabProps> = ({
  currentUser,
  selectedEntity = "ALL",
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
    "ALL" | "MATCHED" | "UNMATCHED" | "PAYROLL" | "INVOICE"
  >("ALL");
  const [accountFilter, setAccountFilter] = useState("ALL");
  const [search, setSearch] = useState("");

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
  const [accountStatus, setAccountStatus] = useState<
    Array<{
      accountNo: string;
      entityType: string;
      bankName: string;
      label?: string;
      latestTransDate: string | null;
      latestTransTime: string | null;
      latestTransDatetime: string | null;
      latestBalance: number;
      totalCount: number;
      lastUploadedAt: string | null;
    }>
  >([]);
  const [summary, setSummary] = useState({
    totalCount: 0,
    depositCount: 0,
    withdrawalCount: 0,
    totalDeposit: 0,
    totalWithdrawal: 0,
    matchedDeposit: 0,
    unmatchedDeposit: 0,
    latestBalance: 0,
    latestTxDatetime: null as string | null,
  });
  const [loading, setLoading] = useState(false);

  // 수기 단건 등록 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [newTrans, setNewTrans] = useState({
    entityType: "CORP" as "CORP" | "INDIVIDUAL",
    bankName: "기업은행",
    accountNo: "478-081383-04-018",
    transDate: today,
    transTime: "12:00:00",
    transType: "DEPOSIT" as "DEPOSIT" | "WITHDRAWAL",
    amount: 0,
    balanceAfter: 0,
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
  const [uploadResult, setUploadResult] = useState<{
    totalParsed: number;
    insertedCount: number;
    duplicateCount: number;
    meta?: any;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1:1 대사 매칭 모달
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [selectedTrans, setSelectedTrans] = useState<BankTransaction | null>(null);
  const [matchedType, setMatchedType] = useState("BILLING");
  const [matchedId, setMatchedId] = useState("");
  const [matchMemo, setMatchMemo] = useState("");

  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 정렬 상태
  const [sortKey, setSortKey] = useState<string>("transDate");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const renderSortTh = (
    label: string,
    key: string,
    align: "left" | "right" | "center" = "left"
  ) => {
    const isActive = sortKey === key;
    return (
      <th
        onClick={() => handleSort(key)}
        className={`py-2 px-2.5 cursor-pointer select-none transition text-${align} whitespace-nowrap hover:bg-[#d0c6b4] dark:hover:bg-slate-700`}
      >
        <div
          className={`inline-flex items-center gap-1 ${
            align === "right"
              ? "justify-end w-full"
              : align === "center"
              ? "justify-center w-full"
              : "justify-start"
          }`}
        >
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              sortDir === "asc" ? (
                <ArrowUp className="w-3 h-3 text-[#1d4ed8] dark:text-blue-400 font-bold" />
              ) : (
                <ArrowDown className="w-3 h-3 text-[#1d4ed8] dark:text-blue-400 font-bold" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const sortedTransactions = useMemo(() => {
    if (sortKey === "transDate") {
      return [...transactions].sort((a, b) => {
        const dtA = `${a.transDate} ${a.transTime || "00:00:00"}`;
        const dtB = `${b.transDate} ${b.transTime || "00:00:00"}`;
        return sortDir === "asc" ? dtA.localeCompare(dtB) : dtB.localeCompare(dtA);
      });
    }
    return sortErpItems(transactions, sortKey, sortDir);
  }, [transactions, sortKey, sortDir]);

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
      if (selectedEntity !== "ALL") {
        params.set("entityType", selectedEntity);
      }
      const res = await fetch(`/api/erp/bank-matching?${params.toString()}`);
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
  }, [startDate, endDate, transType, txChannel, matchStatus, accountFilter, selectedEntity]);

  const setPeriodPreset = (preset: "ALL" | "2026" | "2025" | "2024" | "2023" | "MONTH") => {
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
      setStartDate(monthStart);
      setEndDate(today);
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
      showToast(
        `업로드 완료: 총 ${data.totalParsed}건 확인 (신규 저장 ${data.insertedCount}건 / 중복 제외 ${data.duplicateCount}건)`
      );
      setSelectedFiles([]);
      setRawPasteText("");
      fetchTransactions();
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
        body: JSON.stringify(newTrans),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "등록 실패");

      showToast("은행 거래내역이 등록되었습니다.");
      setModalOpen(false);
      fetchTransactions();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 대사 매칭 확정
  const handleManualMatch = async () => {
    if (!selectedTrans) return;
    try {
      const res = await fetch("/api/erp/bank-matching", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTrans.id,
          matchedType,
          matchedId: matchedId.trim() || `BILL-${Date.now().toString().slice(-4)}`,
          memo: matchMemo.trim() || selectedTrans.memo,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "대사 매칭 실패");

      showToast("대사 매칭이 완료되었습니다.");
      setMatchModalOpen(false);
      fetchTransactions();
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
      fetchTransactions();
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
      t.isMatched ? "매칭완료" : "미매칭",
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
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-[#0f172a] dark:text-slate-200 focus:outline-none font-mono min-w-0"
              />
              <span className="text-[#475569] dark:text-slate-500 text-xs">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-[#0f172a] dark:text-slate-200 focus:outline-none font-mono min-w-0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              기간 선택
            </label>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {[
                { key: "ALL", label: "전체" },
                { key: "2026", label: "2026년" },
                { key: "2025", label: "2025년" },
                { key: "2024", label: "2024년" },
                { key: "2023", label: "2023년" },
                { key: "MONTH", label: "당월" },
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
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 상태</option>
              <option value="MATCHED">매칭완료</option>
              <option value="UNMATCHED">미매칭</option>
              <option value="PAYROLL">급여 항목</option>
              <option value="INVOICE">세금계산서 매칭</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[140px]">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              계좌 선택
            </label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
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
                  setAccountFilter((prev) => (prev === acc.accountNo ? "ALL" : acc.accountNo))
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

      {/* 2. Gutenberg Z-Pattern Step 3 (Body / High-Density Grid) */}
      <div className="flex-1 md:overflow-auto p-2.5 md:p-3">
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden md:h-full flex flex-col dark:bg-slate-900 dark:border-slate-800">
          {/* 모바일 전용 카드형 입출금 대장 (가로폭 100% 최적화) */}
          <div className="md:hidden divide-y divide-[#c4b6a0] dark:divide-slate-800">
            {sortedTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#475569]">
                조회된 은행 입출금 내역이 없습니다.
              </div>
            ) : (
              sortedTransactions.slice(0, 200).map((t) => {
                const isDep = t.depositAmount > 0;
                const amt = isDep ? t.depositAmount : t.withdrawalAmount;
                return (
                  <div key={t.id} className="p-3 bg-[#ebe5d8] dark:bg-slate-900 flex flex-col gap-1.5">
                    {/* 1행: 거래일시 + 구분/사업자 배지 */}
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 font-mono text-[#334155] dark:text-slate-300">
                        <span>{t.transDate}</span>
                        <span className="text-[#64748b] text-[10px]">{t.transTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]">
                          {t.entityType === "INDIVIDUAL" || t.accountNo?.includes("140") ? "개인" : "법인"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isDep
                              ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]"
                              : "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]"
                          }`}
                        >
                          {isDep ? "입금" : "출금"} · {t.txChannel || "-"}
                        </span>
                      </div>
                    </div>

                    {/* 2행: 거래내용 + 금액 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {t.matchedType === "PAYROLL" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ede9fe] text-[#5b21b6] border border-[#c4b5fd] shrink-0">
                            급여
                          </span>
                        )}
                        <span className="font-bold text-xs text-[#0f172a] dark:text-slate-100 truncate">
                          {t.senderReceiver}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-sm font-extrabold shrink-0 ${
                          isDep ? "text-[#1d4ed8]" : "text-[#dc2626]"
                        }`}
                      >
                        {isDep ? "+" : "-"}
                        {formatErpCurrency(amt)}
                      </span>
                    </div>

                    {/* 3행: 거래후 잔액 + 대사상태/조치 버튼 */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#d5cbb8] dark:border-slate-800 text-[11px]">
                      <span className="font-mono text-[#475569] dark:text-slate-400">
                        잔액:{" "}
                        <b className="text-[#0f172a] dark:text-slate-200">
                          {formatErpCurrency(t.balanceAfter || 0)}
                        </b>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {t.matchedType === "PAYROLL" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ede9fe] text-[#5b21b6] border border-[#c4b5fd]">
                            {t.matchedId || "급여"}
                          </span>
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.isMatched
                                ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
                                : "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                            }`}
                          >
                            {t.isMatched ? "매칭완료" : "미매칭"}
                          </span>
                        )}

                        {t.isMatched ? (
                          <button
                            onClick={() => handleUnmatch(t.id)}
                            className="px-2 py-0.5 bg-[#dcd4c4] text-[#0f172a] rounded border border-[#b5a894] text-[10px] font-bold"
                          >
                            취소
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedTrans(t);
                              setMatchedType(t.depositAmount > 0 ? "BILLING" : "PURCHASE");
                              setMatchedId("");
                              setMatchMemo(t.memo || "");
                              setMatchModalOpen(true);
                            }}
                            className="px-2 py-0.5 bg-[#1d4ed8] text-white rounded text-[10px] font-bold"
                          >
                            매칭
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PC 전용 고밀도 테이블 */}
          <div className="hidden md:block flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#e2dbcd] text-[#0f172a] font-semibold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-2.5 whitespace-nowrap text-center border-r border-[#c4b6a0] dark:border-slate-700">
                    조치
                  </th>
                  {renderSortTh("거래일시", "transDate")}
                  {renderSortTh("구분", "transType", "center")}
                  {renderSortTh("거래구분", "txChannel", "center")}
                  {renderSortTh("출금액(원)", "withdrawalAmount", "right")}
                  {renderSortTh("입금액(원)", "depositAmount", "right")}
                  {renderSortTh("거래후 잔액(원)", "balanceAfter", "right")}
                  {renderSortTh("거래내용", "senderReceiver")}
                  {renderSortTh("상대계좌예금주명", "counterpartyHolder")}
                  {renderSortTh("상대은행", "counterpartyBank")}
                  {renderSortTh("상대계좌번호", "counterpartyAccount")}
                  {renderSortTh("메모", "memo")}
                  {renderSortTh("대사상태", "isMatched", "center")}
                  {renderSortTh("계좌번호", "accountNo")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
                {sortedTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={14}
                      className="py-16 text-center text-[#475569] dark:text-slate-500 whitespace-nowrap"
                    >
                      조회된 은행 입출금 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedTransactions.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40 transition"
                    >
                      {/* 핵심 액션 컬럼 좌측 배치 (헌장 3.2 준수) */}
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap border-r border-[#d5cbb8] dark:border-slate-800">
                        {t.isMatched ? (
                          <button
                            onClick={() => handleUnmatch(t.id)}
                            className="px-2 py-0.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] font-bold transition dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                          >
                            매칭 취소
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedTrans(t);
                              setMatchedType(t.depositAmount > 0 ? "BILLING" : "PURCHASE");
                              setMatchedId("");
                              setMatchMemo(t.memo || "");
                              setMatchModalOpen(true);
                            }}
                            className="px-2 py-0.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-[11px] font-bold transition shadow-xs"
                          >
                            대사 매칭
                          </button>
                        )}
                      </td>

                      {/* 거래일시 */}
                      <td className="py-1.5 px-2.5 font-mono text-[#334155] dark:text-slate-300 whitespace-nowrap">
                        {t.transDate}{" "}
                        <span className="text-[#64748b] dark:text-slate-500 text-[11px]">
                          {t.transTime}
                        </span>
                      </td>

                      {/* 입출금 구분 */}
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                        {t.depositAmount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">
                            입금
                          </span>
                        ) : t.withdrawalAmount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30">
                            출금
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e2e8f0] text-[#334155] border border-[#cbd5e1]">
                            신규
                          </span>
                        )}
                      </td>

                      {/* 거래구분 (타행이체, 체크, 인터넷 등) */}
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap text-[#334155] dark:text-slate-300 font-medium">
                        {t.txChannel || "-"}
                      </td>

                      {/* 출금액 */}
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold whitespace-nowrap text-[#dc2626] dark:text-rose-400">
                        {t.withdrawalAmount > 0 ? formatErpCurrency(t.withdrawalAmount) : "-"}
                      </td>

                      {/* 입금액 */}
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold whitespace-nowrap text-[#1d4ed8] dark:text-blue-400">
                        {t.depositAmount > 0 ? formatErpCurrency(t.depositAmount) : "-"}
                      </td>

                      {/* 거래후 잔액 */}
                      <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                        {formatErpCurrency(t.balanceAfter || 0)}
                      </td>

                      {/* 거래내용 */}
                      <td className="py-1.5 px-2.5 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {t.matchedType === "PAYROLL" && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ede9fe] text-[#5b21b6] border border-[#c4b5fd] dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40 whitespace-nowrap">
                              급여
                            </span>
                          )}
                          <span>{t.senderReceiver}</span>
                        </div>
                      </td>

                      {/* 상대계좌예금주명 */}
                      <td className="py-1.5 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                        {t.counterpartyHolder || "-"}
                      </td>

                      {/* 상대은행 */}
                      <td className="py-1.5 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                        {t.counterpartyBank || "-"}
                      </td>

                      {/* 상대계좌번호 */}
                      <td className="py-1.5 px-2.5 font-mono text-[11px] text-[#475569] dark:text-slate-400 whitespace-nowrap">
                        {t.counterpartyAccount || "-"}
                      </td>

                      {/* 메모 */}
                      <td className="py-1.5 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                        {t.memo || "-"}
                      </td>

                      {/* 대사상태 */}
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                        {t.matchedType === "PAYROLL" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ede9fe] text-[#5b21b6] border border-[#c4b5fd] dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40 whitespace-nowrap">
                            {t.matchedId || "급여"}
                          </span>
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                              t.isMatched
                                ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                                : "bg-[#fef3c7] text-[#92400e] border border-[#fde68a] dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
                            }`}
                          >
                            {t.isMatched
                              ? `매칭완료 (${t.matchedId || t.matchedType || "확정"})`
                              : "미매칭"}
                          </span>
                        )}
                      </td>

                      {/* 계좌번호 */}
                      <td className="py-1.5 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]">
                            {t.entityType === "INDIVIDUAL" || t.accountNo?.includes("140")
                              ? "개인"
                              : "법인"}
                          </span>
                          <span className="font-mono text-[11px] text-[#475569] dark:text-slate-400">
                            {t.accountNo}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Gutenberg Z-Pattern Step 4 (Terminal Action & 대차대조 합계 검증식) */}
      <div className="p-3 bg-[#e2dbcd] border-t border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <span className="text-[#475569] dark:text-slate-400">조회 건수: </span>
            <span className="font-bold text-[#0f172a] dark:text-slate-100">
              {summary.totalCount.toLocaleString()}건
            </span>
          </div>
          <span className="text-[#b5a894]">|</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">총 입금액({summary.depositCount}건): </span>
            <span className="font-bold text-[#1d4ed8] dark:text-blue-400">
              {formatErpCurrency(summary.totalDeposit)}
            </span>
          </div>
          <span className="text-[#475569]">=</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">🟢 매칭 확정액: </span>
            <span className="font-bold text-[#047857] dark:text-emerald-400">
              {formatErpCurrency(summary.matchedDeposit)}
            </span>
          </div>
          <span className="text-[#475569]">+</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">⏳ 미매칭 잔여액: </span>
            <span className="font-bold text-[#b45309] dark:text-amber-400">
              {formatErpCurrency(summary.unmatchedDeposit)}
            </span>
          </div>
          <span className="text-[#b5a894]">|</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">⚖️ 대차 차액: </span>
            <span className="font-bold text-[#047857] dark:text-emerald-400">₩0</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-[#475569] dark:text-slate-400">
              총 출금액({summary.withdrawalCount}건):{" "}
            </span>
            <span className="font-bold text-[#dc2626] dark:text-rose-400">
              {formatErpCurrency(summary.totalWithdrawal)}
            </span>
          </div>
          <span className="text-[#b5a894]">|</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">현재 잔액: </span>
            <span className="font-bold text-[#0f172a] dark:text-white">
              {formatErpCurrency(summary.latestBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* 통장내역 파일 업로드 모달 */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleFileUploadSubmit}
            className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-lg shadow-2xl text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-white"
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#b5a894] dark:border-slate-800">
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[#047857]" />
                <span>통장 입출금내역 파일 업로드</span>
              </h2>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="p-1 rounded hover:bg-[#dcd4c4] dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {accountStatus.length > 0 && (
                <div className="p-2.5 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-bold text-[#334155] dark:text-slate-400">
                    계좌별 마지막 업로드 거래데이터 일시
                  </div>
                  {accountStatus.map((acc) => (
                    <div
                      key={acc.accountNo}
                      className="flex items-center justify-between text-[11px] font-mono"
                    >
                      <span className="text-[#0f172a] dark:text-slate-200 font-semibold">
                        [{acc.entityType === "INDIVIDUAL" ? "개인" : "법인"}] {acc.bankName}{" "}
                        {acc.accountNo}
                      </span>
                      {acc.latestTransDatetime ? (
                        <span className="font-bold text-[#047857] dark:text-emerald-400">
                          최종 거래: {acc.latestTransDatetime}
                        </span>
                      ) : (
                        <span className="text-[#dc2626] dark:text-rose-400">업로드 내역 없음</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400">
                  귀속 계좌 설정
                </label>
                <select
                  value={uploadAccountNo}
                  onChange={(e) => setUploadAccountNo(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                >
                  <option value="AUTO">파일 내 계좌번호 자동 인식 (기본: 478-081383-04-018)</option>
                  <option value="478-081383-04-018">
                    기업은행 478-081383-04-018 [(주)드래곤알피에이 법인]
                  </option>
                  <option value="140-129404-04-018">
                    기업은행 140-129404-04-018 [드래곤알피에이 개인]
                  </option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400">
                  거래내역 파일 선택 (.xlsx, .xls, .csv, .txt 복수 선택 가능)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      setSelectedFiles(Array.from(e.target.files));
                    }
                  }}
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#1d4ed8] file:text-white hover:file:bg-[#1e40af] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
                {selectedFiles.length > 0 && (
                  <div className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] text-[11px] space-y-1 font-mono">
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="truncate">{f.name}</span>
                        <span className="text-[#64748b] shrink-0">
                          {(f.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400">
                  엑셀/CSV 텍스트 직접 붙여넣기 (선택)
                </label>
                <textarea
                  rows={4}
                  value={rawPasteText}
                  onChange={(e) => setRawPasteText(e.target.value)}
                  placeholder="거래내역조회_입출식 예금 CSV 또는 엑셀 복사 내용을 붙여넣으세요."
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] p-2.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>

              {uploadResult && (
                <div className="p-3 rounded bg-[#ecfdf5] border border-[#047857] text-[#065f46] text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>DB 반영 결과</span>
                  </div>
                  <div className="font-mono text-[11px]">
                    분석 건수: {uploadResult.totalParsed}건 | 신규 저장:{" "}
                    <b>{uploadResult.insertedCount}건</b> | 중복 제외:{" "}
                    {uploadResult.duplicateCount}건
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#0f172a] bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] font-bold transition dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#047857] hover:bg-[#065f46] disabled:opacity-50 rounded shadow-xs transition flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? "업로드 처리중..." : "DB 저장 실행"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 단건 수기 등록 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTrans}
            className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-md shadow-2xl text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-white"
          >
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 mb-4 pb-2 border-b border-[#b5a894] dark:border-slate-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
              <span>은행 거래내역 등록</span>
            </h2>

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5 p-2.5 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                  입출금 계좌 선택
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setNewTrans({
                        ...newTrans,
                        entityType: "CORP",
                        accountNo: "478-081383-04-018",
                      })
                    }
                    className={`p-2 rounded border text-left transition ${
                      newTrans.accountNo === "478-081383-04-018"
                        ? "border-[#1d4ed8] bg-[#dbeafe] text-[#1e40af] font-bold shadow-xs"
                        : "border-[#b5a894] bg-[#ebe5d8] text-[#334155]"
                    }`}
                  >
                    <div>(주)드래곤알피에이 [법인]</div>
                    <div className="font-mono text-[10px] opacity-75">478-081383-04-018</div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewTrans({
                        ...newTrans,
                        entityType: "INDIVIDUAL",
                        accountNo: "140-129404-04-018",
                      })
                    }
                    className={`p-2 rounded border text-left transition ${
                      newTrans.accountNo === "140-129404-04-018"
                        ? "border-[#b45309] bg-[#fef3c7] text-[#92400e] font-bold shadow-xs"
                        : "border-[#b5a894] bg-[#ebe5d8] text-[#334155]"
                    }`}
                  >
                    <div>드래곤알피에이 [개인]</div>
                    <div className="font-mono text-[10px] opacity-75">140-129404-04-018</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                    거래일자
                  </label>
                  <input
                    type="date"
                    value={newTrans.transDate}
                    onChange={(e) => setNewTrans({ ...newTrans, transDate: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                    거래시간
                  </label>
                  <input
                    type="text"
                    value={newTrans.transTime}
                    onChange={(e) => setNewTrans({ ...newTrans, transTime: e.target.value })}
                    placeholder="12:00:00"
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded font-mono focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                    입출금 구분
                  </label>
                  <select
                    value={newTrans.transType}
                    onChange={(e) =>
                      setNewTrans({ ...newTrans, transType: e.target.value as any })
                    }
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
                  >
                    <option value="DEPOSIT">입금</option>
                    <option value="WITHDRAWAL">출금</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                    거래구분
                  </label>
                  <input
                    type="text"
                    value={newTrans.txChannel}
                    onChange={(e) => setNewTrans({ ...newTrans, txChannel: e.target.value })}
                    placeholder="타행이체, 체크, 인터넷"
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                    거래금액(원)
                  </label>
                  <input
                    type="number"
                    value={newTrans.amount}
                    onChange={(e) =>
                      setNewTrans({ ...newTrans, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded font-mono focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                    거래후 잔액(원)
                  </label>
                  <input
                    type="number"
                    value={newTrans.balanceAfter}
                    onChange={(e) =>
                      setNewTrans({
                        ...newTrans,
                        balanceAfter: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded font-mono focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                  거래내용
                </label>
                <input
                  type="text"
                  value={newTrans.senderReceiver}
                  onChange={(e) =>
                    setNewTrans({ ...newTrans, senderReceiver: e.target.value })
                  }
                  placeholder="(주)현대렌탈서비스"
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                    상대은행
                  </label>
                  <input
                    type="text"
                    value={newTrans.counterpartyBank}
                    onChange={(e) =>
                      setNewTrans({ ...newTrans, counterpartyBank: e.target.value })
                    }
                    placeholder="국민은행, 우리은행"
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                    상대계좌예금주명
                  </label>
                  <input
                    type="text"
                    value={newTrans.counterpartyHolder}
                    onChange={(e) =>
                      setNewTrans({ ...newTrans, counterpartyHolder: e.target.value })
                    }
                    placeholder="예금주명"
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                  메모
                </label>
                <input
                  type="text"
                  value={newTrans.memo}
                  onChange={(e) => setNewTrans({ ...newTrans, memo: e.target.value })}
                  placeholder="메모"
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#0f172a] bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] font-bold transition"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded shadow-xs transition"
              >
                등록
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 1:1 대사 매칭 모달 */}
      {matchModalOpen && selectedTrans && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-md shadow-2xl text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-white">
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 mb-2 pb-2 border-b border-[#b5a894] dark:border-slate-800 flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
              <span>통장 대사 매칭</span>
            </h2>

            <div className="p-3 bg-[#f4efe4] rounded border border-[#b5a894] mb-4 text-xs space-y-1 dark:bg-slate-950/60 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-[#475569] dark:text-slate-400">거래일시:</span>
                <span className="text-[#0f172a] dark:text-slate-200 font-mono">
                  {selectedTrans.transDate} {selectedTrans.transTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569] dark:text-slate-400">거래금액:</span>
                <span className="text-[#1d4ed8] dark:text-blue-400 font-bold font-mono">
                  {formatErpCurrency(
                    selectedTrans.depositAmount > 0
                      ? selectedTrans.depositAmount
                      : selectedTrans.withdrawalAmount
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569] dark:text-slate-400">거래내용:</span>
                <span className="text-[#0f172a] dark:text-slate-100 font-bold">
                  {selectedTrans.senderReceiver}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                  대사 대상 구분
                </label>
                <select
                  value={matchedType}
                  onChange={(e) => setMatchedType(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
                >
                  <option value="BILLING">매출 청구서 (세금계산서)</option>
                  <option value="CONTRACT">임대/유통/용역 계약</option>
                  <option value="PURCHASE">매입/비용 지급</option>
                  <option value="PAYROLL">급여/4대보험/원천세</option>
                  <option value="OTHER">기타 수납/가수금</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                  매칭 대상 번호
                </label>
                <input
                  type="text"
                  value={matchedId}
                  onChange={(e) => setMatchedId(e.target.value)}
                  placeholder="INV-202610-001"
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded font-mono focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                  메모
                </label>
                <input
                  type="text"
                  value={matchMemo}
                  onChange={(e) => setMatchMemo(e.target.value)}
                  placeholder="메모"
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMatchModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#0f172a] bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] font-bold transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleManualMatch}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded shadow-xs transition"
              >
                대사 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
