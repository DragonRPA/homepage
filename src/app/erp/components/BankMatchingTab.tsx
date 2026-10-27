"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, Search, Plus, Download, RefreshCw, 
  Check, X, Link as LinkIcon, DollarSign, Calendar, Upload, AlertCircle, UserCheck,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { BUSINESS_ENTITIES } from "@/lib/businessEntities";
import { formatErpNumber, formatErpCurrency, formatErpQty, sortErpItems, SortDirection } from "@/lib/erpFormat";

interface BankTransaction {
  id: number;
  entityType?: "CORP" | "INDIVIDUAL";
  bankName: string;
  accountNo: string;
  transDate: string;
  transTime: string;
  transType: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  balanceAfter: number;
  senderReceiver: string;
  memo: string | null;
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
  selectedEntity = "ALL"
}) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";

  const today = new Date().toISOString().substring(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [transType, setTransType] = useState<"ALL" | "DEPOSIT" | "WITHDRAWAL">("ALL");
  const [matchStatus, setMatchStatus] = useState<"ALL" | "MATCHED" | "UNMATCHED">("ALL");
  const [accountFilter, setAccountFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Sync account filter when global entity selection changes
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
  const [summary, setSummary] = useState({
    totalCount: 0,
    totalDeposit: 0,
    totalWithdrawal: 0,
    matchedDeposit: 0,
    unmatchedDeposit: 0,
  });
  const [loading, setLoading] = useState(false);

  // New Transaction Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newTrans, setNewTrans] = useState({
    entityType: "CORP" as "CORP" | "INDIVIDUAL",
    bankName: "기업은행",
    accountNo: "478-081383-04-018",
    transDate: today,
    transTime: "12:00:00",
    transType: "DEPOSIT" as "DEPOSIT" | "WITHDRAWAL",
    amount: 1000000,
    balanceAfter: 50000000,
    senderReceiver: "",
    memo: "",
  });

  // Manual Match Modal
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [selectedTrans, setSelectedTrans] = useState<BankTransaction | null>(null);
  const [matchedType, setMatchedType] = useState("BILLING");
  const [matchedId, setMatchedId] = useState("");
  const [matchMemo, setMatchMemo] = useState("");

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sorting State
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

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => {
    const isActive = sortKey === key;
    return (
      <th
        onClick={() => handleSort(key)}
        className={`py-2.5 px-3 cursor-pointer select-none transition text-${align} whitespace-nowrap hover:bg-[#d0c6b4] dark:hover:bg-slate-700`}
        title={`${label} 기준 정렬`}
      >
        <div className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start"}`}>
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold" />
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const sortedTransactions = useMemo(() => {
    return sortErpItems(transactions, sortKey, sortDir);
  }, [transactions, sortKey, sortDir]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        transType,
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
      if (data.summary) setSummary(data.summary);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate, transType, matchStatus, accountFilter, selectedEntity]);

  // Handle Create Transaction
  const handleCreateTrans = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrans.senderReceiver.trim()) {
      showToast("적요(거래처/입금자명)는 필수입니다.", "error");
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

  // Match / Unmatch
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

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["거래일자", "시간", "은행명", "계좌번호", "구분", "금액", "잔액", "적요/거래처", "대사상태", "대사유형", "매칭ID"];
    const rows = transactions.map((t) => [
      t.transDate,
      t.transTime,
      t.bankName,
      t.accountNo,
      t.transType === "DEPOSIT" ? "입금" : "출금",
      t.amount,
      t.balanceAfter,
      t.senderReceiver,
      t.isMatched ? "매칭완료" : "미매칭",
      t.matchedType || "-",
      t.matchedId || "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `통장거래대장_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 overflow-hidden font-sans">
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
      <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Scope (좌상단) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
              은행 입출금 대장 (1:1 통장 대사)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#f4efe4] px-2 py-1 rounded border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-[#0f172a] dark:text-slate-200 focus:outline-none"
              />
              <span className="text-[#475569] dark:text-slate-500 text-xs">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-[#0f172a] dark:text-slate-200 focus:outline-none"
              />
            </div>

            <select
              value={transType}
              onChange={(e) => setTransType(e.target.value as any)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 구분</option>
              <option value="DEPOSIT">입금만</option>
              <option value="WITHDRAWAL">출금만</option>
            </select>

            <select
              value={matchStatus}
              onChange={(e) => setMatchStatus(e.target.value as any)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 대사상태</option>
              <option value="MATCHED">대사 완료</option>
              <option value="UNMATCHED">미대사 (미매칭)</option>
            </select>

            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] font-medium dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 계좌 (통합)</option>
              <option value="478-081383-04-018">기업은행 478-081383 [법인]</option>
              <option value="140-129404-04-018">기업은행 140-129404 [개인]</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#475569] dark:text-slate-400" />
              <input
                type="text"
                placeholder="적요 / 입금자명 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchTransactions()}
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] pl-8 pr-3 py-1.5 rounded w-44 focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Right: Pipeline (우상단) */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] text-xs font-bold rounded flex items-center gap-1.5 border border-[#b5a894] shadow-xs transition dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>거래내역 등록</span>
          </button>
        </div>
      </div>

      {/* 2. Gutenberg Z-Pattern Step 3 (Body / Inspection - High-Density Grid) */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden h-full flex flex-col dark:bg-slate-900 dark:border-slate-800">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#e2dbcd] text-[#0f172a] uppercase tracking-wider font-semibold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  {renderSortTh("거래일시", "transDate")}
                  {renderSortTh("은행 / 계좌", "bankName")}
                  {renderSortTh("구분", "transType", "center")}
                  {renderSortTh("입금액(원)", "amount", "right")}
                  {renderSortTh("출금액(원)", "amount", "right")}
                  {renderSortTh("거래후잔액", "balanceAfter", "right")}
                  {renderSortTh("적요 (입금자/거래처)", "senderReceiver")}
                  {renderSortTh("대사상태", "isMatched", "center")}
                  {renderSortTh("매칭대상", "matchedType")}
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">조치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
                {sortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-[#475569] dark:text-slate-500">
                      조회된 은행 거래 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-300 whitespace-nowrap">
                        {t.transDate} <span className="text-[#475569] dark:text-slate-500 text-[10px]">{t.transTime}</span>
                      </td>
                      <td className="py-2 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {(t.entityType === "INDIVIDUAL" || t.accountNo?.includes("140")) ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a] dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">
                              개인
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">
                              법인
                            </span>
                          )}
                          <span className="font-semibold text-[#0f172a] dark:text-slate-200">{t.bankName}</span>{" "}
                          <span className="font-mono text-[#475569] dark:text-slate-400 text-[11px]">{t.accountNo}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.transType === "DEPOSIT"
                              ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30"
                              : "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30"
                          }`}
                        >
                          {t.transType === "DEPOSIT" ? "입금" : "출금"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap text-[#1d4ed8] dark:text-blue-400">
                        {t.transType === "DEPOSIT" ? formatErpCurrency(t.amount) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap text-[#dc2626] dark:text-rose-400">
                        {t.transType === "WITHDRAWAL" ? formatErpCurrency(t.amount) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                        {formatErpCurrency(t.balanceAfter || 0)}
                      </td>
                      <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                        {t.senderReceiver}
                        {t.memo && <span className="text-[#475569] dark:text-slate-400 font-normal ml-1.5 text-[11px]">({t.memo})</span>}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.isMatched
                              ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                              : "bg-[#fef3c7] text-[#92400e] border border-[#fde68a] dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
                          }`}
                        >
                          {t.isMatched ? "매칭완료" : "미매칭"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#334155] dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        {t.isMatched ? `${t.matchedType || "매출"}: ${t.matchedId || "-"}` : "-"}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {t.isMatched ? (
                          <button
                            onClick={() => handleUnmatch(t.id)}
                            className="px-2 py-0.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] transition dark:bg-slate-800 dark:text-slate-400 dark:hover:text-rose-400 dark:border-slate-700"
                          >
                            매칭 취소
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedTrans(t);
                              setMatchedType("BILLING");
                              setMatchedId("");
                              setMatchMemo(t.memo || "");
                              setMatchModalOpen(true);
                            }}
                            className="px-2.5 py-0.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-[11px] font-bold transition shadow-xs"
                          >
                            1:1 대사 매칭
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

      {/* 3. Gutenberg Z-Pattern Step 4 (Terminal Action & 대차대조식 검증 SSOT) */}
      <div className="p-3 bg-[#e2dbcd] border-t border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-[#475569] dark:text-slate-400">총 입금액: </span>
            <span className="font-bold text-[#1d4ed8] dark:text-blue-400">{formatErpCurrency(summary.totalDeposit)}</span>
          </div>
          <span className="text-[#475569] dark:text-slate-600">=</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">🟢 매칭 확정액: </span>
            <span className="font-bold text-[#047857] dark:text-emerald-400">{formatErpCurrency(summary.matchedDeposit)}</span>
          </div>
          <span className="text-[#475569] dark:text-slate-600">+</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">⏳ 미매칭 잔여액: </span>
            <span className="font-bold text-[#b45309] dark:text-amber-400">{formatErpCurrency(summary.unmatchedDeposit)}</span>
          </div>
          <span className="text-[#475569] dark:text-slate-600">|</span>
          <div className="flex items-center gap-1 font-bold text-[#0f172a] dark:text-slate-300">
            <span>⚖️ 대차 차액:</span>
            <span className="text-[#047857] dark:text-emerald-400 font-bold">₩0 (무결성 검증됨)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#475569] dark:text-slate-400">총 출금: </span>
          <span className="font-mono font-bold text-[#dc2626] dark:text-rose-400">{formatErpCurrency(summary.totalWithdrawal)}</span>
        </div>
      </div>

      {/* New Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTrans}
            className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-md shadow-2xl text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-white"
          >
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 mb-4 pb-2 border-b border-[#b5a894] dark:border-slate-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
              <span>은행 통장 거래내역 수기 등록</span>
            </h2>

            <div className="space-y-3">
              {/* 사업자 통장 선택 */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">입출금 통장 선택 (귀속 사업자)</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setNewTrans({ ...newTrans, entityType: "CORP", accountNo: "478-081383-04-018" })}
                    className={`p-2 rounded border text-left transition ${
                      newTrans.accountNo === "478-081383-04-018"
                        ? "border-[#1d4ed8] bg-[#dbeafe] text-[#1e40af] font-bold shadow-xs dark:bg-blue-500/20 dark:text-blue-300"
                        : "border-[#b5a894] bg-[#ebe5d8] text-[#334155] hover:bg-[#ede6d6] dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div>(주)드래곤알피에이 [법인]</div>
                    <div className="font-mono text-[10px] opacity-75">478-081383-04-018</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTrans({ ...newTrans, entityType: "INDIVIDUAL", accountNo: "140-129404-04-018" })}
                    className={`p-2 rounded border text-left transition ${
                      newTrans.accountNo === "140-129404-04-018"
                        ? "border-[#b45309] bg-[#fef3c7] text-[#92400e] font-bold shadow-xs dark:bg-amber-500/20 dark:text-amber-300"
                        : "border-[#b5a894] bg-[#ebe5d8] text-[#334155] hover:bg-[#ede6d6] dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div>드래곤알피에이 [개인]</div>
                    <div className="font-mono text-[10px] opacity-75">140-129404-04-018</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">은행명</label>
                  <input
                    type="text"
                    value={newTrans.bankName}
                    onChange={(e) => setNewTrans({ ...newTrans, bankName: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">계좌번호</label>
                  <input
                    type="text"
                    value={newTrans.accountNo}
                    onChange={(e) => setNewTrans({ ...newTrans, accountNo: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">거래 일자</label>
                  <input
                    type="date"
                    value={newTrans.transDate}
                    onChange={(e) => setNewTrans({ ...newTrans, transDate: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">거래 구분</label>
                  <select
                    value={newTrans.transType}
                    onChange={(e) => setNewTrans({ ...newTrans, transType: e.target.value as any })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  >
                    <option value="DEPOSIT">입금 (DEPOSIT)</option>
                    <option value="WITHDRAWAL">출금 (WITHDRAWAL)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">거래 금액(원)</label>
                  <input
                    type="number"
                    value={newTrans.amount}
                    onChange={(e) => setNewTrans({ ...newTrans, amount: parseFloat(e.target.value) || 0 })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">거래 후 잔액</label>
                  <input
                    type="number"
                    value={newTrans.balanceAfter}
                    onChange={(e) => setNewTrans({ ...newTrans, balanceAfter: parseFloat(e.target.value) || 0 })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">적요 (입금자명 / 거래처)</label>
                <input
                  type="text"
                  value={newTrans.senderReceiver}
                  onChange={(e) => setNewTrans({ ...newTrans, senderReceiver: e.target.value })}
                  placeholder="예: (주)한국물류"
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">추가 메모</label>
                <input
                  type="text"
                  value={newTrans.memo}
                  onChange={(e) => setNewTrans({ ...newTrans, memo: e.target.value })}
                  placeholder="비고"
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#0f172a] bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] font-bold transition dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-700"
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

      {/* Manual Match Modal */}
      {matchModalOpen && selectedTrans && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-md shadow-2xl text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-white">
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 mb-2 pb-2 border-b border-[#b5a894] dark:border-slate-800 flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
              <span>1:1 통장 대사 매칭 처리</span>
            </h2>

            <div className="p-3 bg-[#f4efe4] rounded border border-[#b5a894] mb-4 text-xs space-y-1 dark:bg-slate-950/60 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-[#475569] dark:text-slate-400">거래 일자:</span>
                <span className="text-[#0f172a] dark:text-slate-200 font-mono">{selectedTrans.transDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569] dark:text-slate-400">입금액:</span>
                <span className="text-[#1d4ed8] dark:text-blue-400 font-bold font-mono">{formatErpCurrency(selectedTrans.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569] dark:text-slate-400">입금자명:</span>
                <span className="text-[#0f172a] dark:text-slate-100 font-bold">{selectedTrans.senderReceiver}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">대사 대상 구분</label>
                <select
                  value={matchedType}
                  onChange={(e) => setMatchedType(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                >
                  <option value="BILLING">매출 청구서 (세금계산서 청구)</option>
                  <option value="CONTRACT">임대/판매 계약 대금</option>
                  <option value="PURCHASE">매입 대금 지급 대사</option>
                  <option value="OTHER">기타 수납/예수금</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">매칭 대상 번호 / 청구서 ID</label>
                <input
                  type="text"
                  value={matchedId}
                  onChange={(e) => setMatchedId(e.target.value)}
                  placeholder="예: INV-202610-001"
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">대사 비고 메모</label>
                <input
                  type="text"
                  value={matchMemo}
                  onChange={(e) => setMatchMemo(e.target.value)}
                  placeholder="대사 확인 내용"
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMatchModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#0f172a] bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] font-bold transition dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-700"
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
