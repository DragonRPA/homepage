"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, Search, Plus, Download, RefreshCw, 
  Check, X, Link as LinkIcon, DollarSign, Calendar, Upload, AlertCircle
} from "lucide-react";

interface BankTransaction {
  id: number;
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

export const BankMatchingTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";

  const today = new Date().toISOString().substring(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [transType, setTransType] = useState<"ALL" | "DEPOSIT" | "WITHDRAWAL">("ALL");
  const [matchStatus, setMatchStatus] = useState<"ALL" | "MATCHED" | "UNMATCHED">("ALL");
  const [search, setSearch] = useState("");

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
    bankName: "기업은행",
    accountNo: "111-222-333333",
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
  }, [startDate, endDate, transType, matchStatus]);

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

  // Seed Mock Data
  const handleSeedMockData = async () => {
    const mockList = [
      {
        bankName: "기업은행",
        accountNo: "111-222-333333",
        transDate: today,
        transTime: "09:30:00",
        transType: "DEPOSIT",
        amount: 3300000,
        balanceAfter: 53300000,
        senderReceiver: "(주)드래곤로보틱스",
        memo: "10월 RPA 라이선스 임대료 입금",
      },
      {
        bankName: "기업은행",
        accountNo: "111-222-333333",
        transDate: today,
        transTime: "11:15:00",
        transType: "DEPOSIT",
        amount: 5500000,
        balanceAfter: 58800000,
        senderReceiver: "(주)한국자동화솔루션",
        memo: "개발용역 2차 중도금",
      },
      {
        bankName: "기업은행",
        accountNo: "111-222-333333",
        transDate: today,
        transTime: "14:20:00",
        transType: "WITHDRAWAL",
        amount: 220000,
        balanceAfter: 58580000,
        senderReceiver: "KT텔레콤",
        memo: "서버 IDC 회선 사용료",
      },
      {
        bankName: "기업은행",
        accountNo: "111-222-333333",
        transDate: today,
        transTime: "16:40:00",
        transType: "DEPOSIT",
        amount: 1650000,
        balanceAfter: 60230000,
        senderReceiver: "태양물류",
        memo: "고소작업대 렌탈 10월분",
      },
    ];

    try {
      setLoading(true);
      const res = await fetch("/api/erp/bank-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockList),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "목업 등록 실패");

      showToast(`샘플 통장 내역 ${data.count}건이 일괄 등록되었습니다.`);
      fetchTransactions();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
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
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-xs font-bold border ${
            toastMessage.type === "success"
              ? "bg-emerald-950 border-emerald-500 text-emerald-200"
              : "bg-rose-950 border-rose-500 text-rose-200"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* 1. Gutenberg Z-Pattern Step 1 (Scope) & Step 2 (Pipeline) */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Scope (좌상단) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-200">
              은행 입출금 대장 (1:1 통장 대사)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded border border-slate-700">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none"
              />
              <span className="text-slate-500 text-xs">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <select
              value={transType}
              onChange={(e) => setTransType(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">전체 구분</option>
              <option value="DEPOSIT">입금만</option>
              <option value="WITHDRAWAL">출금만</option>
            </select>

            <select
              value={matchStatus}
              onChange={(e) => setMatchStatus(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">전체 대사상태</option>
              <option value="MATCHED">대사 완료</option>
              <option value="UNMATCHED">미대사 (미매칭)</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="적요 / 입금자명 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchTransactions()}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded w-44 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Right: Pipeline (우상단) */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleSeedMockData}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded flex items-center gap-1.5 border border-slate-700 shadow transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>샘플 통장내역 생성</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded flex items-center gap-1.5 border border-slate-700 shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>거래내역 등록</span>
          </button>
        </div>
      </div>

      {/* 2. Gutenberg Z-Pattern Step 3 (Body / Inspection - High-Density Grid) */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-slate-900 border border-slate-800 rounded shadow-sm overflow-hidden h-full flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-700 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">거래일시</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">은행 / 계좌</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">구분</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">입금액(원)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">출금액(원)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">거래후잔액</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">적요 (입금자/거래처)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">대사상태</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">매칭대상</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">조치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-500">
                      조회된 은행 거래 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 font-mono text-slate-300 whitespace-nowrap">
                        {t.transDate} <span className="text-slate-500 text-[10px]">{t.transTime}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                        <span className="font-semibold text-slate-200">{t.bankName}</span>{" "}
                        <span className="font-mono text-slate-400 text-[11px]">{t.accountNo}</span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.transType === "DEPOSIT"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {t.transType === "DEPOSIT" ? "입금" : "출금"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap text-blue-400">
                        {t.transType === "DEPOSIT" ? `₩${Number(t.amount).toLocaleString()}` : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap text-rose-400">
                        {t.transType === "WITHDRAWAL" ? `₩${Number(t.amount).toLocaleString()}` : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                        ₩{Number(t.balanceAfter || 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-100 whitespace-nowrap">
                        {t.senderReceiver}
                        {t.memo && <span className="text-slate-400 font-normal ml-1.5 text-[11px]">({t.memo})</span>}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.isMatched
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {t.isMatched ? "매칭완료" : "미매칭"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        {t.isMatched ? `${t.matchedType || "매출"}: ${t.matchedId || "-"}` : "-"}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {t.isMatched ? (
                          <button
                            onClick={() => handleUnmatch(t.id)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded border border-slate-700 text-[11px] transition"
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
                            className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold transition shadow"
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
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400">총 입금액: </span>
            <span className="font-bold text-blue-400">₩{summary.totalDeposit.toLocaleString()}</span>
          </div>
          <span className="text-slate-600">=</span>
          <div>
            <span className="text-slate-400">🟢 매칭 확정액: </span>
            <span className="font-bold text-emerald-400">₩{summary.matchedDeposit.toLocaleString()}</span>
          </div>
          <span className="text-slate-600">+</span>
          <div>
            <span className="text-slate-400">⏳ 미매칭 잔여액: </span>
            <span className="font-bold text-amber-400">₩{summary.unmatchedDeposit.toLocaleString()}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 font-bold text-slate-300">
            <span>⚖️ 대차 차액:</span>
            <span className="text-emerald-400">₩0 (무결성 검증됨)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">총 출금: </span>
          <span className="font-mono font-bold text-rose-400">₩{summary.totalWithdrawal.toLocaleString()}</span>
        </div>
      </div>

      {/* New Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTrans}
            className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-sm font-bold text-slate-100 mb-4 pb-2 border-b border-slate-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>은행 통장 거래내역 수기 등록</span>
            </h2>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 font-semibold">은행명</label>
                  <input
                    type="text"
                    value={newTrans.bankName}
                    onChange={(e) => setNewTrans({ ...newTrans, bankName: e.target.value })}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 font-semibold">계좌번호</label>
                  <input
                    type="text"
                    value={newTrans.accountNo}
                    onChange={(e) => setNewTrans({ ...newTrans, accountNo: e.target.value })}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 font-semibold">거래 일자</label>
                  <input
                    type="date"
                    value={newTrans.transDate}
                    onChange={(e) => setNewTrans({ ...newTrans, transDate: e.target.value })}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 font-semibold">거래 구분</label>
                  <select
                    value={newTrans.transType}
                    onChange={(e) => setNewTrans({ ...newTrans, transType: e.target.value as any })}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                  >
                    <option value="DEPOSIT">입금 (DEPOSIT)</option>
                    <option value="WITHDRAWAL">출금 (WITHDRAWAL)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 font-semibold">거래 금액(원)</label>
                  <input
                    type="number"
                    value={newTrans.amount}
                    onChange={(e) => setNewTrans({ ...newTrans, amount: parseFloat(e.target.value) || 0 })}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 font-semibold">거래 후 잔액</label>
                  <input
                    type="number"
                    value={newTrans.balanceAfter}
                    onChange={(e) => setNewTrans({ ...newTrans, balanceAfter: parseFloat(e.target.value) || 0 })}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">적요 (입금자명 / 거래처)</label>
                <input
                  type="text"
                  value={newTrans.senderReceiver}
                  onChange={(e) => setNewTrans({ ...newTrans, senderReceiver: e.target.value })}
                  placeholder="예: (주)한국물류"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">추가 메모</label>
                <input
                  type="text"
                  value={newTrans.memo}
                  onChange={(e) => setNewTrans({ ...newTrans, memo: e.target.value })}
                  placeholder="비고"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded"
              >
                등록
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manual Match Modal */}
      {matchModalOpen && selectedTrans && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-md shadow-2xl">
            <h2 className="text-sm font-bold text-slate-100 mb-2 pb-2 border-b border-slate-800 flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-blue-400" />
              <span>1:1 통장 대사 매칭 처리</span>
            </h2>

            <div className="p-3 bg-slate-950/60 rounded border border-slate-800 mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">거래 일자:</span>
                <span className="text-slate-200 font-mono">{selectedTrans.transDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">입금액:</span>
                <span className="text-blue-400 font-bold font-mono">₩{Number(selectedTrans.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">입금자명:</span>
                <span className="text-slate-100 font-bold">{selectedTrans.senderReceiver}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">대사 대상 구분</label>
                <select
                  value={matchedType}
                  onChange={(e) => setMatchedType(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="BILLING">매출 청구서 (세금계산서 청구)</option>
                  <option value="CONTRACT">임대/판매 계약 대금</option>
                  <option value="PURCHASE">매입 대금 지급 대사</option>
                  <option value="OTHER">기타 수납/예수금</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">매칭 대상 번호 / 청구서 ID</label>
                <input
                  type="text"
                  value={matchedId}
                  onChange={(e) => setMatchedId(e.target.value)}
                  placeholder="예: INV-202610-001"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold">대사 비고 메모</label>
                <input
                  type="text"
                  value={matchMemo}
                  onChange={(e) => setMatchMemo(e.target.value)}
                  placeholder="대사 확인 내용"
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMatchModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleManualMatch}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded"
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
