"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  PackagePlus,
  Search,
  RefreshCw,
  CheckCircle2,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Barcode,
  Wrench,
  RotateCcw,
} from "lucide-react";
import { formatErpNumber, sortErpItems, SortDirection } from "@/lib/erpFormat";

interface RentalAssetItem {
  id: number;
  assetNo: string;
  serialNo: string;
  rentalProductId: number;
  modelCode: string;
  modelName: string;
  category: string;
  manufacturer: string;
  standardMonthlyRate: number;
  standardDailyRate: number;
  productSpec: string;
  customSpec: string;
  ownerType: string;
  status: string;
  currentCustomer: string | null;
  currentSite: string | null;
  contractNo: string | null;
  activeContractId: number | null;
  activeContractNo: string | null;
  activeCustomerName: string | null;
  activeSiteName: string | null;
  activeEntityType: string | null;
  activeStartDate: string | null;
  activeEndDate: string | null;
  activeMonthlyRate: number;
}

interface InoutLogItem {
  id: number;
  assetId: number;
  assetNo: string;
  serialNo: string;
  modelName: string;
  manufacturer: string;
  eventType: string;
  eventDate: string;
  customerName: string;
  siteName: string | null;
  memo: string | null;
  createdAt: string;
}

export function InboundRegTab({ currentUser }: { currentUser?: any }) {
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }, []);

  const [assets, setAssets] = useState<RentalAssetItem[]>([]);
  const [inboundLogs, setInboundLogs] = useState<InoutLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Inbound Auto-Lookup State
  const [lookupInput, setLookupInput] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [inboundDate, setInboundDate] = useState<string>(todayStr);
  const [nextStatus, setNextStatus] = useState<"AVAILABLE" | "REPAIRING">("AVAILABLE");
  const [memo, setMemo] = useState("");

  // Grid View State
  const [activeView, setActiveView] = useState<"RENTED_ASSETS" | "INBOUND_LOGS">("RENTED_ASSETS");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortKey, setSortKey] = useState<string>("assetNo");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  // Feedback Banner
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const showFeedback = (message: string, type: "success" | "error" = "success") => {
    setFeedback({ type, message });
    if (type === "success") {
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/inout?mode=INBOUND");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "입고 데이터 조회 실패");
      }
      setAssets(data.assets || []);
      setInboundLogs(
        (data.logs || []).filter((l: InoutLogItem) => l.eventType === "INBOUND")
      );
    } catch (err: any) {
      showFeedback(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Currently rented assets
  const rentedAssets = useMemo(() => {
    return assets.filter((a) => a.status === "RENTED");
  }, [assets]);

  // Automatic asset & customer matching when lookupInput or selectedAssetId changes
  const matchedAsset = useMemo(() => {
    if (selectedAssetId) {
      const byId = assets.find((a) => a.id === selectedAssetId);
      if (byId) return byId;
    }
    const q = lookupInput.trim().toUpperCase();
    if (!q) return null;

    // 1. Exact match on assetNo or serialNo (prioritize RENTED)
    const exactRented = assets.find(
      (a) =>
        a.status === "RENTED" &&
        ((a.assetNo && a.assetNo.toUpperCase() === q) ||
          (a.serialNo && a.serialNo.toUpperCase() === q))
    );
    if (exactRented) return exactRented;

    const exactAny = assets.find(
      (a) =>
        (a.assetNo && a.assetNo.toUpperCase() === q) ||
        (a.serialNo && a.serialNo.toUpperCase() === q)
    );
    if (exactAny) return exactAny;

    // 2. Partial match on RENTED assets (if >= 2 chars)
    if (q.length >= 2) {
      const partialRented = assets.find(
        (a) =>
          a.status === "RENTED" &&
          ((a.assetNo && a.assetNo.toUpperCase().includes(q)) ||
            (a.serialNo && a.serialNo.toUpperCase().includes(q)))
      );
      if (partialRented) return partialRented;

      const partialAny = assets.find(
        (a) =>
          (a.assetNo && a.assetNo.toUpperCase().includes(q)) ||
          (a.serialNo && a.serialNo.toUpperCase().includes(q))
      );
      if (partialAny) return partialAny;
    }

    return null;
  }, [assets, lookupInput, selectedAssetId]);

  // Candidate list when typing partial query
  const candidateMatches = useMemo(() => {
    const q = lookupInput.trim().toUpperCase();
    if (!q) return [];
    return assets
      .filter(
        (a) =>
          (a.assetNo && a.assetNo.toUpperCase().includes(q)) ||
          (a.serialNo && a.serialNo.toUpperCase().includes(q))
      )
      .slice(0, 6);
  }, [assets, lookupInput]);

  // Derived auto-filled customer & contract info
  const autoCustomerName = useMemo(() => {
    if (!matchedAsset) return "";
    return matchedAsset.activeCustomerName || matchedAsset.currentCustomer || "미지정 고객사";
  }, [matchedAsset]);

  const autoSiteName = useMemo(() => {
    if (!matchedAsset) return "";
    return matchedAsset.activeSiteName || matchedAsset.currentSite || "-";
  }, [matchedAsset]);

  const autoContractNo = useMemo(() => {
    if (!matchedAsset) return "";
    return matchedAsset.activeContractNo || matchedAsset.contractNo || "-";
  }, [matchedAsset]);

  const handleSelectRentedAsset = (asset: RentalAssetItem) => {
    setSelectedAssetId(asset.id);
    setLookupInput(asset.assetNo || asset.serialNo || "");
  };

  const handleInboundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedAsset && !lookupInput.trim()) {
      showFeedback("자산번호 또는 제조번호(S/N)를 입력해 주십시오.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/erp/inout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INBOUND",
          assetId: matchedAsset?.id || null,
          queryKey: lookupInput.trim(),
          inboundDate,
          nextStatus,
          memo: memo.trim(),
          actorName: currentUser?.name || "입고담당자",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "입고 등록 처리 실패");
      }

      // Update local state immediately without waiting for another full GET round-trip
      setAssets((prev) =>
        prev.map((a) =>
          a.id === data.assetId || a.assetNo === data.assetNo
            ? {
                ...a,
                status: data.nextStatus,
                currentCustomer: null,
                currentSite: null,
                contractNo: null,
                activeContractId: null,
                activeContractNo: null,
                activeCustomerName: null,
                activeSiteName: null,
              }
            : a
        )
      );
      if (data.createdLog) {
        setInboundLogs((prev) => [data.createdLog, ...prev]);
      }

      showFeedback(
        `[${data.fromCustomer}] 출고 자산(${data.assetNo}) 입고 등록 완료 (상태: ${
          data.nextStatus === "AVAILABLE" ? "임대가능" : "정비/수리중"
        })`
      );

      setLookupInput("");
      setSelectedAssetId(null);
      setMemo("");
      setActiveView("INBOUND_LOGS");
    } catch (err: any) {
      showFeedback(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const renderSortHeader = (
    label: string,
    colKey: string,
    align: "left" | "right" | "center" = "left"
  ) => (
    <th
      onClick={() => handleSort(colKey)}
      className={`py-2.5 px-3 whitespace-nowrap cursor-pointer select-none hover:bg-slate-800/60 transition ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      }`}
    >
      <div
        className={`inline-flex items-center gap-1 ${
          align === "right"
            ? "justify-end"
            : align === "center"
            ? "justify-center"
            : "justify-start"
        }`}
      >
        <span>{label}</span>
        {sortKey === colKey ? (
          sortDir === "asc" ? (
            <ArrowUp className="w-3 h-3 text-blue-400 shrink-0" />
          ) : (
            <ArrowDown className="w-3 h-3 text-blue-400 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30 shrink-0" />
        )}
      </div>
    </th>
  );

  const sortedRentedAssets = useMemo(() => {
    const list = rentedAssets.filter((a) => {
      if (!searchKeyword.trim()) return true;
      const q = searchKeyword.trim().toLowerCase();
      return (
        (a.assetNo || "").toLowerCase().includes(q) ||
        (a.serialNo || "").toLowerCase().includes(q) ||
        (a.modelName || "").toLowerCase().includes(q) ||
        (a.activeCustomerName || a.currentCustomer || "").toLowerCase().includes(q) ||
        (a.activeSiteName || a.currentSite || "").toLowerCase().includes(q)
      );
    });
    return sortErpItems(list, sortKey, sortDir);
  }, [rentedAssets, searchKeyword, sortKey, sortDir]);

  const sortedInboundLogs = useMemo(() => {
    const list = inboundLogs.filter((l) => {
      if (!searchKeyword.trim()) return true;
      const q = searchKeyword.trim().toLowerCase();
      return (
        (l.assetNo || "").toLowerCase().includes(q) ||
        (l.serialNo || "").toLowerCase().includes(q) ||
        (l.customerName || "").toLowerCase().includes(q) ||
        (l.modelName || "").toLowerCase().includes(q)
      );
    });
    return sortErpItems(list, sortKey, sortDir);
  }, [inboundLogs, searchKeyword, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`px-4 py-3 rounded-lg border flex items-center justify-between text-xs font-bold ${
            feedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
              : "bg-rose-950/70 border-rose-500/60 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] underline ml-4 whitespace-nowrap"
          >
            닫기
          </button>
        </div>
      )}

      {/* Top Z-Pattern Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-bold text-white whitespace-nowrap">렌탈자산 입고등록</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 whitespace-nowrap">현재 대여중(입고대상)</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono font-bold">
              {formatErpNumber(rentedAssets.length)}대
            </span>
            <span className="text-slate-400 whitespace-nowrap ml-2">누적 입고이력</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
              {formatErpNumber(inboundLogs.length)}건
            </span>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>새로고침</span>
        </button>
      </div>

      {/* Main Content: Left Inbound Auto-Lookup & Form (5 cols) + Right Rented Assets / Inbound Logs (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Inbound Auto-Lookup & Registration Form */}
        <form
          onSubmit={handleInboundSubmit}
          className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Barcode className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white whitespace-nowrap">
                자산번호 / 제조번호 기반 자동 입고 조회
              </h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold whitespace-nowrap">
              출고처 자동 매칭
            </span>
          </div>

          {/* 1. 자산번호 또는 제조번호 입력칸 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              자산번호 또는 제조번호(S/N) 입력 *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                list="inbound-asset-datalist"
                value={lookupInput}
                onChange={(e) => {
                  setLookupInput(e.target.value);
                  setSelectedAssetId(null);
                }}
                placeholder="자산번호(예: RNT-0001) 또는 제조번호(S/N) 입력"
                className="w-full pl-9 pr-16 py-2.5 bg-slate-950 border-2 border-blue-500/60 focus:border-blue-400 rounded-lg text-xs text-white font-mono font-bold focus:outline-none"
              />
              {lookupInput && (
                <button
                  type="button"
                  onClick={() => {
                    setLookupInput("");
                    setSelectedAssetId(null);
                  }}
                  className="absolute right-2.5 top-2 px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 hover:text-white"
                >
                  초기화
                </button>
              )}
              <datalist id="inbound-asset-datalist">
                {rentedAssets.map((a) => (
                  <option
                    key={`dl-${a.id}`}
                    value={a.assetNo}
                    label={`[대여중: ${a.activeCustomerName || a.currentCustomer || "-"}] ${
                      a.modelName || ""
                    } (S/N: ${a.serialNo || "-"})`}
                  />
                ))}
                {rentedAssets
                  .filter((a) => a.serialNo)
                  .map((a) => (
                    <option
                      key={`dl-sn-${a.id}`}
                      value={a.serialNo}
                      label={`[자산번호: ${a.assetNo}] 고객: ${
                        a.activeCustomerName || a.currentCustomer || "-"
                      } (${a.modelName || ""})`}
                    />
                  ))}
              </datalist>
            </div>

            {/* Quick Candidate Chips if multiple matches */}
            {candidateMatches.length > 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {candidateMatches.map((cand) => (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => handleSelectRentedAsset(cand)}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition whitespace-nowrap ${
                      matchedAsset?.id === cand.id
                        ? "bg-blue-600 text-white border-blue-400"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600"
                    }`}
                  >
                    {cand.assetNo} ({cand.serialNo || "S/N없음"}) -{" "}
                    {cand.activeCustomerName || cand.currentCustomer || "보관중"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. 자동 채움 영역: 어느 고객에서 입고되었는지 자동 표시 */}
          <div
            className={`p-3.5 rounded-xl border transition space-y-3 ${
              matchedAsset
                ? "bg-slate-950/90 border-emerald-500/50"
                : "bg-slate-950/40 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Building2
                  className={`w-4 h-4 ${
                    matchedAsset ? "text-emerald-400" : "text-slate-500"
                  }`}
                />
                <span className="text-xs font-bold text-slate-200 whitespace-nowrap">
                  자동 조회된 출고 고객사 및 계약 정보
                </span>
              </div>
              {matchedAsset && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                    matchedAsset.status === "RENTED"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  현재상태: {matchedAsset.status === "RENTED" ? "대여중(출고상태)" : matchedAsset.status}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                  입고 고객사 (자동채움)
                </label>
                <input
                  type="text"
                  readOnly
                  value={matchedAsset ? autoCustomerName : ""}
                  placeholder="자산번호/제조번호 입력 시 자동 채움"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-emerald-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                  회수 현장명 (자동채움)
                </label>
                <input
                  type="text"
                  readOnly
                  value={matchedAsset ? autoSiteName : ""}
                  placeholder="-"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                  자산번호 / 제조번호(S/N)
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    matchedAsset
                      ? `${matchedAsset.assetNo} / ${matchedAsset.serialNo || "-"}`
                      : ""
                  }
                  placeholder="-"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-blue-400 font-bold focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                  기종 모델명 / 제조사
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    matchedAsset
                      ? `${matchedAsset.modelName || "-"} (${matchedAsset.manufacturer || "-"})`
                      : ""
                  }
                  placeholder="-"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                  출고(청구시작)일 / 계약번호
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    matchedAsset
                      ? `${matchedAsset.activeStartDate || "-"} (${autoContractNo})`
                      : ""
                  }
                  placeholder="-"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                  적용 월 단가
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    matchedAsset
                      ? `₩${formatErpNumber(matchedAsset.activeMonthlyRate)}`
                      : ""
                  }
                  placeholder="-"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-200 text-right focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. 입고 일자 & 입고 후 상태 선택 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                입고 일자 (청구 마감일) *
              </label>
              <input
                type="date"
                required
                value={inboundDate}
                onChange={(e) => setInboundDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                입고 후 자산 상태 *
              </label>
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as "AVAILABLE" | "REPAIRING")}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="AVAILABLE">임대가능 (즉시 재출고 가능)</option>
                <option value="REPAIRING">정비/수리중 (점검 필요)</option>
              </select>
            </div>
          </div>

          {/* 입고 비고 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              입고 검수 메모
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="장비 외관 상태 또는 특이사항 기록"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Terminal Action Button */}
          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !matchedAsset}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg shadow flex items-center justify-center gap-2 transition whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {submitting
                  ? "입고 처리중..."
                  : matchedAsset
                  ? `[${autoCustomerName}] 자산(${matchedAsset.assetNo}) 입고 등록 실행`
                  : "자산번호 또는 제조번호를 입력해 주십시오"}
              </span>
            </button>
          </div>
        </form>

        {/* Right: Currently Rented Assets Grid & Inbound History Grid */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveView("RENTED_ASSETS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  activeView === "RENTED_ASSETS"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                현재 대여중 자산 ({formatErpNumber(rentedAssets.length)}대)
              </button>
              <button
                type="button"
                onClick={() => setActiveView("INBOUND_LOGS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  activeView === "INBOUND_LOGS"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                입고 완료 이력 ({formatErpNumber(inboundLogs.length)}건)
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="자산번호 / S/N / 고객사 검색"
                className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 w-52"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[540px]">
            {activeView === "RENTED_ASSETS" ? (
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">입고 선택</th>
                    {renderSortHeader("자산번호", "assetNo")}
                    {renderSortHeader("제조번호(S/N)", "serialNo")}
                    {renderSortHeader("현재 출고 고객사", "activeCustomerName")}
                    {renderSortHeader("현장명", "activeSiteName")}
                    {renderSortHeader("기종 모델명", "modelName")}
                    {renderSortHeader("출고(청구시작)일", "activeStartDate", "center")}
                    {renderSortHeader("월 단가", "activeMonthlyRate", "right")}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {sortedRentedAssets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        현재 대여중(출고 상태)인 자산이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    sortedRentedAssets.map((a) => {
                      const isSelected = matchedAsset?.id === a.id;
                      const cust = a.activeCustomerName || a.currentCustomer || "-";
                      const site = a.activeSiteName || a.currentSite || "-";
                      return (
                        <tr
                          key={a.id}
                          onClick={() => handleSelectRentedAsset(a)}
                          className={`cursor-pointer transition ${
                            isSelected ? "bg-emerald-950/40" : "hover:bg-slate-800/40"
                          }`}
                        >
                          <td className="py-2 px-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRentedAsset(a);
                              }}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                                isSelected
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-800 hover:bg-emerald-600/80 text-slate-200 hover:text-white"
                              }`}
                            >
                              {isSelected ? "선택됨" : "선택 ➔"}
                            </button>
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-400 whitespace-nowrap">
                            {a.assetNo}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-200 whitespace-nowrap">
                            {a.serialNo || "-"}
                          </td>
                          <td className="py-2 px-3 font-bold text-emerald-400 whitespace-nowrap">
                            {cust}
                          </td>
                          <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{site}</td>
                          <td className="py-2 px-3 text-white whitespace-nowrap">
                            {a.modelName || "-"}
                          </td>
                          <td className="py-2 px-3 font-mono text-center text-slate-300 whitespace-nowrap">
                            {a.activeStartDate || "-"}
                          </td>
                          <td className="py-2 px-3 font-mono text-right text-slate-200 whitespace-nowrap">
                            ₩{formatErpNumber(a.activeMonthlyRate)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    {renderSortHeader("입고일자", "eventDate", "center")}
                    {renderSortHeader("자산번호", "assetNo")}
                    {renderSortHeader("제조번호(S/N)", "serialNo")}
                    {renderSortHeader("기종 모델명", "modelName")}
                    {renderSortHeader("입고 고객사(회수처)", "customerName")}
                    {renderSortHeader("현장명", "siteName")}
                    {renderSortHeader("비고", "memo")}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {sortedInboundLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        입고 등록 이력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    sortedInboundLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono text-center text-slate-300 whitespace-nowrap">
                          {l.eventDate}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-400 whitespace-nowrap">
                          {l.assetNo}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                          {l.serialNo || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-white whitespace-nowrap">
                          {l.modelName || "-"}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400 whitespace-nowrap">
                          {l.customerName || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                          {l.siteName || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {l.memo || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
