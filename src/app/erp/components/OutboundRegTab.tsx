"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  Search,
  RefreshCw,
  CheckCircle2,
  Building2,
  Calendar,
  Coins,
  PackageCheck,
  Receipt,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
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
}

interface BillingItem {
  id: number;
  billingNo: string;
  contractId: number;
  contractNo: string;
  customerName: string;
  siteName: string | null;
  entityType: string;
  contractStatus: string;
  assetId: number;
  assetNo: string;
  serialNo: string;
  modelName: string;
  yearMonth: string;
  startDate: string;
  endDate: string;
  operatingDays: number;
  monthlyRate: number;
  proRataRevenue: number;
  depreciationCogs: number;
  netMargin: number;
  paymentStatus: string;
}

interface CustomerBillingSummary {
  customerName: string;
  assetCount: number;
  totalMonthlyRate: number;
  totalProRataRevenue: number;
  items: BillingItem[];
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

export function OutboundRegTab({ currentUser }: { currentUser?: any }) {
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }, []);

  const [yearMonth, setYearMonth] = useState<string>(() => todayStr.slice(0, 7));
  const [assets, setAssets] = useState<RentalAssetItem[]>([]);
  const [billings, setBillings] = useState<BillingItem[]>([]);
  const [customerSummary, setCustomerSummary] = useState<CustomerBillingSummary[]>([]);
  const [logs, setLogs] = useState<InoutLogItem[]>([]);
  const [partners, setPartners] = useState<{ customerName: string; businessNo: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Outbound Registration Form State
  const [customerName, setCustomerName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [assetFilterQuery, setAssetFilterQuery] = useState("");
  const [billingStartDate, setBillingStartDate] = useState<string>(todayStr);
  const [monthlyRate, setMonthlyRate] = useState<string>("");
  const [entityType, setEntityType] = useState<"CORP" | "INDIVIDUAL">("CORP");
  const [useProRata, setUseProRata] = useState<boolean>(false); // 원칙: 월 임대료는 출고 시 입력한 단가로 정함 (특수한 경우에만 일할)
  const [memo, setMemo] = useState("");

  // Active Grid View Tab
  const [activeView, setActiveView] = useState<"BILLINGS" | "AVAILABLE_ASSETS" | "LOGS">("BILLINGS");
  const [customerFilter, setCustomerFilter] = useState<string>("ALL");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // Sorting State
  const [sortKey, setSortKey] = useState<string>("id");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Feedback Modal / Toast
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const showFeedback = (message: string, type: "success" | "error" = "success") => {
    setFeedback({ type, message });
    if (type === "success") {
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const fetchInoutData = async (targetYm?: string) => {
    const ym = targetYm || yearMonth;
    setLoading(true);
    try {
      const res = await fetch(`/api/erp/inout?yearMonth=${encodeURIComponent(ym)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "데이터 로드 실패");
      }
      setAssets(data.assets || []);
      setBillings(data.billings || []);
      setCustomerSummary(data.customerBillingSummary || []);
      setLogs((data.logs || []).filter((l: InoutLogItem) => l.eventType === "OUTBOUND"));
      setPartners(data.partners || []);
    } catch (err: any) {
      showFeedback(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInoutData(yearMonth);
  }, [yearMonth]);

  // Available assets for outbound
  const availableAssets = useMemo(() => {
    return assets.filter((a) => a.status === "AVAILABLE");
  }, [assets]);

  const filteredAvailableAssets = useMemo(() => {
    if (!assetFilterQuery.trim()) return availableAssets;
    const q = assetFilterQuery.trim().toLowerCase();
    return availableAssets.filter(
      (a) =>
        (a.assetNo || "").toLowerCase().includes(q) ||
        (a.serialNo || "").toLowerCase().includes(q) ||
        (a.modelName || "").toLowerCase().includes(q) ||
        (a.manufacturer || "").toLowerCase().includes(q)
    );
  }, [availableAssets, assetFilterQuery]);

  const selectedAssetObj = useMemo(() => {
    if (!selectedAssetId) return null;
    return assets.find((a) => String(a.id) === String(selectedAssetId)) || null;
  }, [assets, selectedAssetId]);

  const handleSelectAsset = (asset: RentalAssetItem) => {
    setSelectedAssetId(String(asset.id));
    if (asset.standardMonthlyRate && Number(asset.standardMonthlyRate) > 0) {
      setMonthlyRate(String(Math.round(Number(asset.standardMonthlyRate))));
    }
  };

  // Real-time billing calculation preview for the billing start month
  const proRataPreview = useMemo(() => {
    const rate = Number(String(monthlyRate).replace(/,/g, "")) || 0;
    if (!billingStartDate || rate <= 0) {
      return {
        targetYm: billingStartDate ? billingStartDate.slice(0, 7) : yearMonth,
        monthEnd: "-",
        operatingDays: 30,
        proRataAmount: 0,
      };
    }
    const ym = billingStartDate.slice(0, 7);
    const [y, m] = ym.split("-").map(Number);
    const monthStart = `${ym}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${ym}-${String(lastDay).padStart(2, "0")}`;

    if (!useProRata) {
      return {
        targetYm: ym,
        monthEnd,
        operatingDays: 30,
        proRataAmount: Math.round(rate),
      };
    }

    const sDate = new Date(`${billingStartDate}T00:00:00`);
    const eDate = new Date(`${monthEnd}T00:00:00`);
    const operatingDays = Math.max(
      0,
      Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const isFullMonth = billingStartDate === monthStart;
    const proRataAmount = isFullMonth
      ? Math.round(rate)
      : Math.min(Math.round(rate), Math.round((rate / 30) * operatingDays));

    return {
      targetYm: ym,
      monthEnd,
      operatingDays,
      proRataAmount,
    };
  }, [billingStartDate, monthlyRate, yearMonth, useProRata]);

  // Unique customer suggestions from partners + existing billings
  const customerSuggestions = useMemo(() => {
    const set = new Set<string>();
    partners.forEach((p) => {
      if (p.customerName) set.add(p.customerName);
    });
    customerSummary.forEach((c) => {
      if (c.customerName) set.add(c.customerName);
    });
    return Array.from(set).sort();
  }, [partners, customerSummary]);

  const handleSubmitOutbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showFeedback("고객사명을 입력해 주십시오.", "error");
      return;
    }
    if (!selectedAssetId) {
      showFeedback("출고할 렌탈자산을 선택해 주십시오.", "error");
      return;
    }
    if (!billingStartDate) {
      showFeedback("청구 시작일을 선택해 주십시오.", "error");
      return;
    }
    const cleanRate = Number(String(monthlyRate).replace(/,/g, ""));
    if (!monthlyRate || isNaN(cleanRate) || cleanRate <= 0) {
      showFeedback("월 단가를 0원보다 크게 입력해 주십시오.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/erp/inout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "OUTBOUND",
          assetId: Number(selectedAssetId),
          customerName: customerName.trim(),
          siteName: siteName.trim(),
          billingStartDate,
          monthlyRate: cleanRate,
          useProRata,
          entityType,
          memo: memo.trim(),
          actorName: currentUser?.name || "출고담당자",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "출고 등록 실패");
      }

      const targetYm = billingStartDate.slice(0, 7);
      setYearMonth(targetYm);
      await fetchInoutData(targetYm);

      showFeedback(
        `[${customerName.trim()}] 단일 임대계약에 자산(${data.assetNo}) 출고 가산(+) 완료 (출고단가 ₩${formatErpNumber(
          cleanRate
        )} ➔ 고객 총 ${data.activeAssetCount || 1}대 / 월 ₩${formatErpNumber(data.totalContractMonthlyRate || cleanRate)})`
      );

      // Reset asset selection & memo while preserving customer/date for consecutive dispatch convenience
      setSelectedAssetId("");
      setMonthlyRate("");
      setMemo("");
      setActiveView("BILLINGS");
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
      className={`py-2.5 px-3 whitespace-nowrap cursor-pointer select-none transition ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } hover:bg-[#d0c6b4] dark:hover:bg-slate-800/60`}
    >
      <div
        className={`inline-flex items-center gap-1 ${
          align === "right"
            ? "justify-end"
            : align === "center"
            ? "justify-center"
            : "justify-start"
        } ${sortKey === colKey ? "text-[#1d4ed8] dark:text-blue-400 font-bold" : ""}`}
      >
        <span>{label}</span>
        {sortKey === colKey ? (
          sortDir === "asc" ? (
            <ArrowUp className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold shrink-0" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 opacity-30 shrink-0" />
        )}
      </div>
    </th>
  );

  const filteredBillings = useMemo(() => {
    const list = billings.filter((b) => {
      if (customerFilter !== "ALL" && b.customerName !== customerFilter) return false;
      if (searchKeyword.trim()) {
        const q = searchKeyword.trim().toLowerCase();
        return (
          (b.customerName || "").toLowerCase().includes(q) ||
          (b.assetNo || "").toLowerCase().includes(q) ||
          (b.serialNo || "").toLowerCase().includes(q) ||
          (b.modelName || "").toLowerCase().includes(q) ||
          (b.siteName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
    return sortErpItems(list, sortKey, sortDir);
  }, [billings, customerFilter, searchKeyword, sortKey, sortDir]);

  const sortedAvailableAssets = useMemo(() => {
    return sortErpItems(filteredAvailableAssets, sortKey, sortDir);
  }, [filteredAvailableAssets, sortKey, sortDir]);

  const sortedLogs = useMemo(() => {
    const list = logs.filter((l) => {
      if (!searchKeyword.trim()) return true;
      const q = searchKeyword.trim().toLowerCase();
      return (
        (l.customerName || "").toLowerCase().includes(q) ||
        (l.assetNo || "").toLowerCase().includes(q) ||
        (l.serialNo || "").toLowerCase().includes(q) ||
        (l.modelName || "").toLowerCase().includes(q)
      );
    });
    return sortErpItems(list, sortKey, sortDir);
  }, [logs, searchKeyword, sortKey, sortDir]);

  const totalMonthRevenue = useMemo(
    () => filteredBillings.reduce((acc, cur) => acc + Number(cur.proRataRevenue || 0), 0),
    [filteredBillings]
  );

  const totalMonthContractRate = useMemo(
    () => filteredBillings.reduce((acc, cur) => acc + Number(cur.monthlyRate || 0), 0),
    [filteredBillings]
  );

  return (
    <div className="space-y-4 font-sans text-[#0f172a] dark:text-slate-100">
      {/* Feedback Alert Banner */}
      {feedback && (
        <div
          className={`px-4 py-3 rounded-lg border flex items-center justify-between text-xs font-bold ${
            feedback.type === "success"
              ? "bg-[#ecfdf5] border-[#047857] text-[#065f46]"
              : "bg-[#fef2f2] border-[#dc2626] text-[#b91c1c]"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#dc2626] shrink-0" />
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

      {/* Top Z-Pattern Bar: Scope (Left) & Pipeline Status (Right) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#e2dbcd] border border-[#b5a894] rounded-xl p-3.5 dark:bg-slate-900/60 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#1d4ed8] dark:text-blue-400 shrink-0" />
            <span className="text-sm font-bold text-[#0f172a] dark:text-white whitespace-nowrap">렌탈자산 출고등록</span>
          </div>
          <div className="h-4 w-px bg-[#b5a894] dark:bg-slate-800" />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#475569] dark:text-slate-400 whitespace-nowrap">임대가능 자산</span>
            <span className="px-2 py-0.5 rounded bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] font-mono font-bold dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
              {formatErpNumber(availableAssets.length)}대
            </span>
            <span className="text-[#475569] dark:text-slate-400 whitespace-nowrap ml-2">대여중 자산</span>
            <span className="px-2 py-0.5 rounded bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] font-mono font-bold dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30">
              {formatErpNumber(assets.filter((a) => a.status === "RENTED").length)}대
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#475569] dark:text-slate-400 font-semibold whitespace-nowrap">
              청구 조회 연월
            </label>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="px-2.5 py-1 bg-[#ebe5d8] border border-[#b5a894] rounded text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => fetchInoutData(yearMonth)}
            disabled={loading}
            className="mt-4 px-3 py-1.5 bg-[#f4efe4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Left Outbound Registration Form (4 cols) + Right Billing & Assets Grid (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Outbound Registration Panel */}
        <form
          onSubmit={handleSubmitOutbound}
          className="lg:col-span-4 bg-[#f4efe4] border border-[#b5a894] rounded-xl p-4 space-y-3.5 dark:bg-slate-900/70 dark:border-slate-800"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-[#b5a894] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
              <h3 className="text-xs font-bold text-[#0f172a] dark:text-white whitespace-nowrap">출고 및 청구 조건 입력</h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] font-semibold whitespace-nowrap dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
              출고 즉시 당월 청구 반영
            </span>
          </div>

          {/* 1. 고객사명 & 계약주체 */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                출고 고객사명 *
              </label>
              <input
                type="text"
                list="outbound-customer-list"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="고객사명 입력 또는 선택"
                className="w-full px-3 py-2 bg-[#ebe5d8] border border-[#b5a894] rounded-lg text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
              />
              <datalist id="outbound-customer-list">
                {customerSuggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                계약 구분
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as "CORP" | "INDIVIDUAL")}
                className="w-full px-2.5 py-2 bg-[#ebe5d8] border border-[#b5a894] rounded-lg text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
              >
                <option value="CORP">법인</option>
                <option value="INDIVIDUAL">개인</option>
              </select>
            </div>
          </div>

          {/* 현장명 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
              투입 현장명
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="현장명 또는 납품처 주소"
              className="w-full px-3 py-2 bg-[#ebe5d8] border border-[#b5a894] rounded-lg text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
            />
          </div>

          {/* 2. 출고 렌탈자산 검색 및 선택 */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                출고 자산 선택 (임대가능 {formatErpNumber(availableAssets.length)}대) *
              </label>
              <button
                type="button"
                onClick={() => setActiveView("AVAILABLE_ASSETS")}
                className="text-[11px] text-[#1d4ed8] hover:underline dark:text-blue-400 font-semibold whitespace-nowrap"
              >
                목록에서 선택 ➔
              </button>
            </div>
            <input
              type="text"
              value={assetFilterQuery}
              onChange={(e) => setAssetFilterQuery(e.target.value)}
              placeholder="자산번호 / 제조번호(S/N) / 모델명 필터"
              className="w-full px-3 py-1.5 bg-[#ebe5d8] border border-[#b5a894] rounded-lg text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1d4ed8] mb-1 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 dark:focus:border-blue-500"
            />
            <select
              required
              value={selectedAssetId}
              onChange={(e) => {
                const idVal = e.target.value;
                setSelectedAssetId(idVal);
                const found = assets.find((a) => String(a.id) === idVal);
                if (found && found.standardMonthlyRate) {
                  setMonthlyRate(String(Math.round(Number(found.standardMonthlyRate))));
                }
              }}
              className="w-full px-3 py-2 bg-[#ebe5d8] border border-[#b5a894] rounded-lg text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
            >
              <option value="">-- 출고할 렌탈자산 선택 --</option>
              {filteredAvailableAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.assetNo}] {a.modelName || "기종미상"} | S/N: {a.serialNo || "-"} | 기준단가:{" "}
                  {formatErpNumber(a.standardMonthlyRate)}원
                </option>
              ))}
            </select>
            {selectedAssetObj && (
              <div className="mt-1 px-2.5 py-1.5 rounded bg-[#ebe5d8] border border-[#b5a894] text-[11px] text-[#334155] flex items-center justify-between dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
                <span className="whitespace-nowrap">
                  선택자산: <strong className="text-[#1d4ed8] dark:text-blue-400 font-mono">{selectedAssetObj.assetNo}</strong>{" "}
                  ({selectedAssetObj.modelName})
                </span>
                <span className="font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                  S/N: {selectedAssetObj.serialNo || "-"}
                </span>
              </div>
            )}
          </div>

          {/* 3. 언제부터 청구할 것인지 (청구 시작일) & 4. 월 단가 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                청구 시작일 (출고일) *
              </label>
              <input
                type="date"
                required
                value={billingStartDate}
                onChange={(e) => setBillingStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#ebe5d8] border border-[#b5a894] rounded-lg text-xs text-[#0f172a] font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                월 단가 (원, VAT별도) *
              </label>
              <input
                type="number"
                required
                min={0}
                step={1000}
                value={monthlyRate}
                onChange={(e) => setMonthlyRate(e.target.value)}
                placeholder="예: 600000"
                className="w-full px-3 py-2 bg-[#ebe5d8] border border-[#b5a894] rounded-lg text-xs text-[#047857] font-mono font-bold text-right focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-emerald-400 dark:focus:border-blue-500"
              />
            </div>
          </div>

          {/* 비고 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
              출고 비고
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="특약사항 또는 출고 메모"
              className="w-full px-3 py-2 bg-[#ebe5d8] border border-[#b5a894] rounded-lg text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
            />
          </div>

          {/* 당월 청구 반영액 자동 계산 요약 (고객단위 가산 & 월 단가 정액 원칙) */}
          <div className="p-3 rounded-lg bg-[#ebe5d8] border border-[#b5a894] space-y-1.5 dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-[#b5a894]/60 dark:border-slate-800">
              <span className="font-semibold text-[#1e40af] dark:text-blue-400">
                고객별 단일 임대계약 자동 가산(+)
              </span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-[#475569] dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={useProRata}
                  onChange={(e) => setUseProRata(e.target.checked)}
                  className="rounded border-[#b5a894]"
                />
                <span>특수 일할계산 적용</span>
              </label>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#475569] dark:text-slate-400 whitespace-nowrap">당월 청구 대상 연월</span>
              <span className="font-mono font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                {proRataPreview.targetYm} ({useProRata ? `${proRataPreview.operatingDays}일 일할` : "월 단가 정액"})
              </span>
            </div>
            <div className="pt-1.5 border-t border-[#b5a894] dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap">
                고객 계약 가산 월임대료
              </span>
              <span className="text-sm font-extrabold font-mono text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                + ₩{formatErpNumber(proRataPreview.proRataAmount)}
              </span>
            </div>
          </div>

          {/* Terminal Action Button (Bottom Right of Form) */}
          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow flex items-center justify-center gap-2 transition whitespace-nowrap"
            >
              <Truck className="w-4 h-4" />
              <span>{submitting ? "출고 및 청구 반영 처리중..." : "출고 등록 및 당월 청구 반영"}</span>
            </button>
          </div>
        </form>

        {/* Right: Customer Monthly Billing Reflection & Assets / Logs Grid */}
        <div className="lg:col-span-8 space-y-3">
          {/* Customer Monthly Billing Summary Cards */}
          <div className="bg-[#f4efe4] border border-[#b5a894] rounded-xl p-3.5 dark:bg-slate-900/70 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#047857] dark:text-emerald-400" />
                <span className="text-xs font-bold text-[#0f172a] dark:text-white whitespace-nowrap">
                  [{yearMonth}] 고객사별 당월 청구액 집계 현황
                </span>
              </div>
              {customerFilter !== "ALL" && (
                <button
                  onClick={() => setCustomerFilter("ALL")}
                  className="text-[11px] text-[#1d4ed8] hover:underline whitespace-nowrap dark:text-blue-400"
                >
                  전체 고객사 보기
                </button>
              )}
            </div>

            {customerSummary.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#475569] dark:text-slate-500">
                해당 연월({yearMonth})에 청구 반영된 출고 내역이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-44 overflow-y-auto pr-1">
                {customerSummary.map((cs) => {
                  const isSelected = customerFilter === cs.customerName;
                  return (
                    <button
                      key={cs.customerName}
                      type="button"
                      onClick={() => {
                        setCustomerFilter(isSelected ? "ALL" : cs.customerName);
                        setActiveView("BILLINGS");
                      }}
                      className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? "bg-[#dbeafe] border-[#2563eb] text-[#1e40af] dark:bg-blue-950/50 dark:border-blue-500 dark:text-white"
                          : "bg-[#ebe5d8] border-[#b5a894] hover:bg-[#f4efe4] text-[#0f172a] dark:bg-slate-950/70 dark:border-slate-800 dark:hover:border-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold truncate">{cs.customerName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#f4efe4] border border-[#b5a894] text-[10px] font-mono text-[#1d4ed8] whitespace-nowrap shrink-0 dark:bg-slate-800 dark:border-transparent dark:text-blue-400">
                          {formatErpNumber(cs.assetCount)}대
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#b5a894] dark:border-slate-800/80">
                        <span className="text-[#475569] dark:text-slate-400 whitespace-nowrap">당월 청구액</span>
                        <span className="font-mono font-bold text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                          ₩{formatErpNumber(cs.totalProRataRevenue)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub-Tabs & Search Bar */}
          <div className="bg-[#ebe5d8] border border-[#b5a894] rounded-xl overflow-hidden dark:bg-slate-900/70 dark:border-slate-800">
            <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] flex flex-wrap items-center justify-between gap-2 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveView("BILLINGS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    activeView === "BILLINGS"
                      ? "bg-[#1d4ed8] text-white shadow-sm"
                      : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
                  }`}
                >
                  당월 청구 반영 명세 ({formatErpNumber(filteredBillings.length)}건)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("AVAILABLE_ASSETS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    activeView === "AVAILABLE_ASSETS"
                      ? "bg-[#1d4ed8] text-white shadow-sm"
                      : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
                  }`}
                >
                  임대가능 자산 선택 ({formatErpNumber(availableAssets.length)}대)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("LOGS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    activeView === "LOGS"
                      ? "bg-[#1d4ed8] text-white shadow-sm"
                      : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
                  }`}
                >
                  출고 이력 대장 ({formatErpNumber(logs.length)}건)
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#475569] dark:text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="고객사 / 자산번호 / S/N 검색"
                  className="pl-8 pr-3 py-1 bg-[#f4efe4] border border-[#b5a894] rounded-lg text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1d4ed8] w-52 dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
                />
              </div>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto max-h-[480px]">
              {activeView === "BILLINGS" && (
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#e2dbcd] text-[#0f172a] border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
                    <tr>
                      {renderSortHeader("고객사명", "customerName")}
                      {renderSortHeader("현장명", "siteName")}
                      {renderSortHeader("자산번호", "assetNo")}
                      {renderSortHeader("제조번호(S/N)", "serialNo")}
                      {renderSortHeader("기종 모델명", "modelName")}
                      {renderSortHeader("청구 시작일", "startDate", "center")}
                      {renderSortHeader("정산 종료일", "endDate", "center")}
                      {renderSortHeader("가동일수", "operatingDays", "right")}
                      {renderSortHeader("월 단가", "monthlyRate", "right")}
                      {renderSortHeader("당월 청구액", "proRataRevenue", "right")}
                      {renderSortHeader("상태", "paymentStatus", "center")}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/70">
                    {filteredBillings.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-10 text-center text-[#475569] dark:text-slate-500">
                          조회된 당월 청구 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredBillings.map((b) => (
                        <tr key={b.id} className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3 font-bold text-[#0f172a] dark:text-white whitespace-nowrap">
                            {b.customerName}
                          </td>
                          <td className="py-2.5 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                            {b.siteName || "-"}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap">
                            {b.assetNo}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#475569] dark:text-slate-300 whitespace-nowrap">
                            {b.serialNo || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                            {b.modelName || "-"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-center text-[#334155] dark:text-slate-300 whitespace-nowrap">
                            {b.startDate}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-center text-[#475569] dark:text-slate-400 whitespace-nowrap">
                            {b.endDate}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-right text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                            {formatErpNumber(b.operatingDays)}일
                          </td>
                          <td className="py-2.5 px-3 font-mono text-right text-[#334155] dark:text-slate-300 whitespace-nowrap">
                            ₩{formatErpNumber(b.monthlyRate)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                            ₩{formatErpNumber(b.proRataRevenue)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.paymentStatus === "PAID"
                                  ? "bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-transparent"
                                  : "bg-[#fffbeb] text-[#b45309] border border-[#fde68a] dark:bg-amber-500/20 dark:text-amber-400 dark:border-transparent"
                              }`}
                            >
                              {b.paymentStatus === "PAID" ? "수납완료" : "청구대기"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeView === "AVAILABLE_ASSETS" && (
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#e2dbcd] text-[#0f172a] border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 whitespace-nowrap">출고 선택</th>
                      {renderSortHeader("자산번호", "assetNo")}
                      {renderSortHeader("제조번호(S/N)", "serialNo")}
                      {renderSortHeader("기종 모델명", "modelName")}
                      {renderSortHeader("제조사", "manufacturer")}
                      {renderSortHeader("분류", "category")}
                      {renderSortHeader("기준 월단가", "standardMonthlyRate", "right")}
                      {renderSortHeader("상태", "status", "center")}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/70">
                    {sortedAvailableAssets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-[#475569] dark:text-slate-500">
                          임대가능 상태인 자산이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      sortedAvailableAssets.map((a) => {
                        const isChosen = String(a.id) === String(selectedAssetId);
                        return (
                          <tr
                            key={a.id}
                            onClick={() => handleSelectAsset(a)}
                            className={`cursor-pointer transition ${
                              isChosen ? "bg-[#dbeafe] dark:bg-blue-950/50" : "hover:bg-[#f4efe4] dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <td className="py-2 px-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectAsset(a);
                                }}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                                  isChosen
                                    ? "bg-[#1d4ed8] text-white"
                                    : "bg-[#e2dbcd] hover:bg-[#1d4ed8] text-[#0f172a] hover:text-white border border-[#b5a894] dark:bg-slate-800 dark:border-transparent dark:hover:bg-blue-600/80 dark:text-slate-200"
                                }`}
                              >
                                {isChosen ? "선택됨" : "선택 ➔"}
                              </button>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap">
                              {a.assetNo}
                            </td>
                            <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-200 whitespace-nowrap">
                              {a.serialNo || "-"}
                            </td>
                            <td className="py-2 px-3 font-semibold text-[#0f172a] dark:text-white whitespace-nowrap">
                              {a.modelName || "-"}
                            </td>
                            <td className="py-2 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                              {a.manufacturer || "-"}
                            </td>
                            <td className="py-2 px-3 text-[#475569] dark:text-slate-400 whitespace-nowrap">
                              {a.category || "-"}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-right text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                              ₩{formatErpNumber(a.standardMonthlyRate)}
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] text-[10px] font-bold dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-transparent">
                                임대가능
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {activeView === "LOGS" && (
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#e2dbcd] text-[#0f172a] border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
                    <tr>
                      {renderSortHeader("출고(청구시작)일", "eventDate", "center")}
                      {renderSortHeader("자산번호", "assetNo")}
                      {renderSortHeader("제조번호(S/N)", "serialNo")}
                      {renderSortHeader("기종 모델명", "modelName")}
                      {renderSortHeader("출고 고객사", "customerName")}
                      {renderSortHeader("현장명", "siteName")}
                      {renderSortHeader("비고", "memo")}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/70">
                    {sortedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-[#475569] dark:text-slate-500">
                          출고 이력이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      sortedLogs.map((l) => (
                        <tr key={l.id} className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3 font-mono text-center text-[#475569] dark:text-slate-300 whitespace-nowrap">
                            {l.eventDate}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap">
                            {l.assetNo}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#475569] dark:text-slate-300 whitespace-nowrap">
                            {l.serialNo || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-[#0f172a] dark:text-white whitespace-nowrap">
                            {l.modelName || "-"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                            {l.customerName || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                            {l.siteName || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-[#475569] dark:text-slate-400 whitespace-nowrap">
                            {l.memo || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Reconciliation Bar (Gutenberg Z-Pattern Terminal Summary) */}
            <div className="p-3 bg-[#e2dbcd] border-t border-[#b5a894] flex flex-wrap items-center justify-between gap-3 text-xs dark:bg-slate-950 dark:border-slate-800">
              <div className="flex items-center gap-2 text-[#475569] dark:text-slate-400">
                <Receipt className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
                <span className="whitespace-nowrap">
                  [{yearMonth}] 청구 대상 건수:{" "}
                  <strong className="text-[#0f172a] dark:text-white font-mono">
                    {formatErpNumber(filteredBillings.length)}건
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-[#475569] dark:text-slate-400 whitespace-nowrap">
                  월 계약단가 합계:{" "}
                  <strong className="text-[#0f172a] dark:text-slate-200">
                    ₩{formatErpNumber(totalMonthContractRate)}
                  </strong>
                </span>
                <span className="text-[#475569] dark:text-slate-400 whitespace-nowrap">
                  당월 청구 총액:{" "}
                  <strong className="text-[#047857] dark:text-emerald-400 text-sm font-extrabold">
                    ₩{formatErpNumber(totalMonthRevenue)}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
