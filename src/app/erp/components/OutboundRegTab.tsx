"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  RefreshCw,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
} from "lucide-react";
import { formatErpNumber, formatErpInputNumber, toErpInputString, cleanErpNumber, sortErpItems } from "@/lib/erpFormat";
import { type RentalRateBasis, RENTAL_RATE_BASIS_OPTIONS, calculateAutoDailyRentalFee, resolveDailyRentalFee, computeRentalSupplyByBasis } from "@/lib/rentalFeeUtils";
import { matchHangulAny, sortCustomersByName } from "@/lib/hangulSearch";
import { type AttachedForkliftOption, calculateAttachedOptionsTotals, formatAttachedOptionsSummary, normalizeAttachedOptions, normalizeItemClass } from "@/lib/forkliftDomain";
import { useErpTableSort } from "./SortableTh";
import { SearchSelectCombobox, SearchSelectOption } from "./SearchSelectCombobox";
import ForkliftOptionAttachPanel, { CatalogOptionItem } from "./ForkliftOptionAttachPanel";
import { findBlockedPartnerMatch, getPartnerTradeBlockInfo } from "@/lib/partnerStatusClient";
import {
  OutboundBillingAndLogsPanel,
  type BillingItem,
  type CustomerBillingSummary,
  type InoutLogItem,
  type OutboundActiveView,
  type RentalAssetItem,
} from "./outbound/OutboundBillingAndLogsPanel";

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
  const [partners, setPartners] = useState<
    {
      id?: number;
      customerName: string;
      businessNo: string;
      ceoName?: string;
      status?: string;
      ntsBizState?: string | null;
      ntsClosedDate?: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Outbound Registration Form State
  const [customerName, setCustomerName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [billingStartDate, setBillingStartDate] = useState<string>(todayStr);
  const [rateBasis, setRateBasis] = useState<RentalRateBasis>("MONTHLY");
  const [monthlyRate, setMonthlyRate] = useState<string>("");
  const [dailyRate, setDailyRate] = useState<string>("");
  const [entityType, setEntityType] = useState<"CORP" | "INDIVIDUAL">("CORP");
  const [useProRata, setUseProRata] = useState<boolean>(false); // 원칙: 월 임대료는 출고 시 입력한 단가로 정함 (특수한 경우에만 일할)
  const [attachedOptions, setAttachedOptions] = useState<AttachedForkliftOption[]>([]);
  const [optionCatalog, setOptionCatalog] = useState<CatalogOptionItem[]>([]);
  const [memo, setMemo] = useState("");

  // Active Grid View Tab
  const [activeView, setActiveView] = useState<OutboundActiveView>("BILLINGS");
  const [customerFilter, setCustomerFilter] = useState<string>("ALL");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // Sorting State (3단계: asc ➔ desc ➔ null 정렬안함)
  const { sortKey, sortDir, handleSort } = useErpTableSort("id", "desc");
  const availSort = useErpTableSort("assetNo", "asc");
  const logsSort = useErpTableSort("eventDate", "desc");

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
      const [res, prodRes, tradeRes] = await Promise.all([
        fetch(`/api/erp/inout?yearMonth=${encodeURIComponent(ym)}`, { cache: "no-store" }),
        fetch("/api/erp/products", { cache: "no-store" }).catch(() => null),
        fetch("/api/erp/trade/products", { cache: "no-store" }).catch(() => null),
      ]);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "데이터 로드 실패");
      }
      setAssets(data.assets || []);
      setBillings(data.billings || []);
      setCustomerSummary(data.customerBillingSummary || []);
      setLogs((data.logs || []).filter((l: InoutLogItem) => l.eventType === "OUTBOUND"));
      setPartners(data.partners || []);

      const catalogList: CatalogOptionItem[] = [];
      const prodData = prodRes ? await prodRes.json().catch(() => null) : null;
      const tradeData = tradeRes ? await tradeRes.json().catch(() => null) : null;
      if (prodData?.success && Array.isArray(prodData.products)) {
        for (const p of prodData.products) {
          if (normalizeItemClass(p.itemClass || p.item_class, p.category) === "OPTION") {
            catalogList.push({
              id: p.id,
              source: "RENTAL",
              skuCode: p.modelCode || p.model_code || undefined,
              name: p.modelName || p.model_name || p.name,
              spec: p.spec || undefined,
              unitPrice: 0,
              installFee: Number(p.installFee ?? p.install_fee ?? 0),
              monthlyAddonRate: Number(p.standardMonthlyRate ?? p.standard_monthly_rate ?? 0),
              dailyAddonRate: Number(p.standardDailyRate ?? p.standard_daily_rate ?? 0),
            });
          }
        }
      }
      if (tradeData?.success && Array.isArray(tradeData.products)) {
        for (const p of tradeData.products) {
          if (normalizeItemClass(p.item_class, p.category) === "OPTION") {
            catalogList.push({
              id: p.id,
              source: "TRADE",
              skuCode: p.sku_code || undefined,
              name: p.name,
              spec: p.spec || undefined,
              unitPrice: Number(p.standard_price || 0),
              installFee: Number(p.install_fee || 0),
              monthlyAddonRate: Number(p.addon_monthly_rate || 0),
              dailyAddonRate: Number(p.addon_daily_rate || 0),
            });
          }
        }
      }
      setOptionCatalog(catalogList);
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

  const availableAssetComboboxOptions = useMemo<SearchSelectOption[]>(() => {
    return availableAssets.map((a) => {
      const resolvedDaily = resolveDailyRentalFee(a.standardMonthlyRate, a.standardDailyRate);
      return {
        value: String(a.id),
        label: `[${a.assetNo}] ${a.modelName || "기종미상"}`,
        subLabel: `S/N: ${a.serialNo || "-"} · 월 ${formatErpNumber(a.standardMonthlyRate)}원 · 일 ${formatErpNumber(resolvedDaily)}원`,
        badgeText: a.manufacturer || undefined,
        badgeColor: "slate",
        searchKeywords: [a.assetNo, a.serialNo, a.modelCode, a.modelName, a.manufacturer],
      };
    });
  }, [availableAssets]);

  const customerComboboxOptions = useMemo<SearchSelectOption[]>(() => {
    const partnerMap = new Map<string, (typeof partners)[number]>();
    for (const p of partners) {
      if (p.customerName) {
        partnerMap.set(p.customerName, p);
      }
    }
    for (const c of customerSummary) {
      if (c.customerName && !partnerMap.has(c.customerName)) {
        partnerMap.set(c.customerName, { customerName: c.customerName, businessNo: "" });
      }
    }
    const items = Array.from(partnerMap.entries()).map(([name, partner]) => ({
      name,
      partner,
    }));
    return sortCustomersByName(items).map((item) => {
      const block = getPartnerTradeBlockInfo(item.partner);
      return {
        value: item.name,
        label: item.name,
        subLabel: item.partner.businessNo ? `사업자번호: ${item.partner.businessNo}` : undefined,
        badgeText: block.blocked ? block.badgeText : undefined,
        badgeColor: block.blocked ? "rose" : undefined,
        searchKeywords: [item.name, item.partner.businessNo],
        disabled: block.blocked,
      };
    });
  }, [partners, customerSummary]);

  const selectedAssetObj = useMemo(() => {
    if (!selectedAssetId) return null;
    return assets.find((a) => String(a.id) === String(selectedAssetId)) || null;
  }, [assets, selectedAssetId]);

  const optionTotals = useMemo(
    () => calculateAttachedOptionsTotals(attachedOptions),
    [attachedOptions]
  );

  const handleSelectAsset = (asset: RentalAssetItem) => {
    setSelectedAssetId(String(asset.id));
    setAttachedOptions(normalizeAttachedOptions(asset.attachedOptions));
    const monthly = Number(asset.standardMonthlyRate || 0);
    if (monthly > 0) {
      setMonthlyRate(toErpInputString(Math.round(monthly)));
    }
    if (rateBasis !== "DAILY_MANUAL") {
      setDailyRate(toErpInputString(resolveDailyRentalFee(monthly, asset.standardDailyRate)));
    }
  };

  // Real-time billing calculation preview for the billing start month
  const proRataPreview = useMemo(() => {
    const rate = cleanErpNumber(monthlyRate) + optionTotals.totalMonthlyAddon;
    const manualDaily = cleanErpNumber(dailyRate) + optionTotals.totalDailyAddon;
    const applyDaily = rateBasis === "DAILY_MANUAL" || rateBasis === "DAILY_AUTO" || useProRata;
    if (!billingStartDate || (rate <= 0 && (!applyDaily || manualDaily <= 0))) {
      return {
        targetYm: billingStartDate ? billingStartDate.slice(0, 7) : yearMonth,
        monthEnd: "-",
        operatingDays: 30,
        effectiveDailyRate: resolveDailyRentalFee(rate, manualDaily),
        proRataAmount: 0,
      };
    }
    const ym = billingStartDate.slice(0, 7);
    const [y, m] = ym.split("-").map(Number);
    const monthStart = `${ym}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${ym}-${String(lastDay).padStart(2, "0")}`;

    if (!applyDaily) {
      return {
        targetYm: ym,
        monthEnd,
        operatingDays: 30,
        effectiveDailyRate: resolveDailyRentalFee(rate, manualDaily),
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
    if (rateBasis === "MONTHLY" && isFullMonth && rate > 0) {
      return {
        targetYm: ym,
        monthEnd,
        operatingDays,
        effectiveDailyRate: resolveDailyRentalFee(rate, manualDaily),
        proRataAmount: Math.round(rate),
      };
    }
    const computed = computeRentalSupplyByBasis({
      monthlyRate: rate,
      dailyRate: manualDaily,
      rateBasis,
      operatingDays,
      useProRata: true,
    });
    const proRataAmount =
      rateBasis === "MONTHLY" && rate > 0
        ? Math.min(Math.round(rate), computed.supplyAmount)
        : computed.supplyAmount;

    return {
      targetYm: ym,
      monthEnd,
      operatingDays,
      effectiveDailyRate: computed.effectiveDailyRate,
      proRataAmount,
    };
  }, [billingStartDate, monthlyRate, dailyRate, rateBasis, yearMonth, useProRata, optionTotals]);

  const handleSubmitOutbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showFeedback("고객사명을 입력해 주십시오.", "error");
      return;
    }
    const blockedCust = findBlockedPartnerMatch(partners, { name: customerName.trim() });
    if (blockedCust) {
      showFeedback(
        `[${blockedCust.customerName}] ${getPartnerTradeBlockInfo(blockedCust).reason}`,
        "error"
      );
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
    const cleanRate = cleanErpNumber(monthlyRate) + optionTotals.totalMonthlyAddon;
    const cleanDaily = cleanErpNumber(dailyRate) + optionTotals.totalDailyAddon;
    if (cleanRate <= 0 && !(rateBasis !== "MONTHLY" && cleanDaily > 0)) {
      showFeedback("월단가 또는 일단가를 0원보다 크게 입력해 주십시오.", "error");
      return;
    }

    const effectiveUseProRata =
      rateBasis === "DAILY_MANUAL" || rateBasis === "DAILY_AUTO" || useProRata;

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
          rateBasis,
          monthlyRate: cleanRate,
          dailyRate: cleanDaily,
          useProRata: effectiveUseProRata,
          attachedOptions,
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
        `[${customerName.trim()}] 단일 임대계약에 자산(${data.assetNo}) 출고 가산(+) 완료 (월단가 ₩${formatErpNumber(
          cleanRate
        )} · 일단가 ₩${formatErpNumber(
          cleanDaily || calculateAutoDailyRentalFee(cleanRate)
        )} ➔ 고객 총 ${data.activeAssetCount || 1}대)`
      );

      // Reset asset selection & memo while preserving customer/date for consecutive dispatch convenience
      setSelectedAssetId("");
      setMonthlyRate("");
      setDailyRate("");
      setAttachedOptions([]);
      setMemo("");
      setActiveView("BILLINGS");
    } catch (err: any) {
      showFeedback(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBillings = useMemo(() => {
    const list = billings.filter((b) => {
      if (customerFilter !== "ALL" && b.customerName !== customerFilter) return false;
      if (searchKeyword.trim()) {
        return matchHangulAny(
          [b.customerName, b.assetNo, b.serialNo, b.modelName, b.siteName],
          searchKeyword
        );
      }
      return true;
    });
    return sortErpItems(list, sortKey, sortDir);
  }, [billings, customerFilter, searchKeyword, sortKey, sortDir]);

  const sortedAvailableAssets = useMemo(() => {
    const list = searchKeyword.trim()
      ? availableAssets.filter((a) =>
          matchHangulAny(
            [a.assetNo, a.serialNo, a.modelName, a.modelCode, a.manufacturer, a.category],
            searchKeyword
          )
        )
      : availableAssets;
    return sortErpItems(list, availSort.sortKey, availSort.sortDir);
  }, [availableAssets, searchKeyword, availSort.sortKey, availSort.sortDir]);

  const sortedLogs = useMemo(() => {
    const list = logs.filter((l) => {
      if (!searchKeyword.trim()) return true;
      return matchHangulAny(
        [l.customerName, l.assetNo, l.serialNo, l.modelName, l.siteName],
        searchKeyword
      );
    });
    return sortErpItems(list, logsSort.sortKey, logsSort.sortDir);
  }, [logs, searchKeyword, logsSort.sortKey, logsSort.sortDir]);

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
              <SearchSelectCombobox
                label="출고 고객사명"
                required
                size="sm"
                allowFreeText
                showChosungBar
                options={customerComboboxOptions}
                value={customerName}
                freeTextValue={customerName}
                onFreeTextChange={(val) => setCustomerName(val)}
                onChange={(nextVal) => setCustomerName(nextVal)}
                placeholder="고객사명·초성·사업자번호 검색"
              />
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

          {/* 2. 출고 렌탈자산 검색 및 선택 */}
          <div className="flex flex-col gap-1">
            <SearchSelectCombobox
              label={`출고 자산 선택 (임대가능 ${formatErpNumber(availableAssets.length)}대)`}
              required
              size="sm"
              showChosungBar
              options={availableAssetComboboxOptions}
              value={selectedAssetId}
              onChange={(idVal) => {
                setSelectedAssetId(idVal);
                const found = assets.find((a) => String(a.id) === idVal);
                if (found) {
                  handleSelectAsset(found);
                }
              }}
              placeholder="자산번호·제조번호·모델명·초성 검색"
              headerRight={
                <button
                  type="button"
                  onClick={() => setActiveView("AVAILABLE_ASSETS")}
                  className="text-[11px] text-[#1d4ed8] hover:underline dark:text-blue-400 font-semibold whitespace-nowrap shrink-0"
                >
                  목록 보기
                </button>
              }
            />
            {selectedAssetObj && (
              <div className="mt-1 px-2.5 py-1.5 rounded bg-[#ebe5d8] border border-[#b5a894] text-[11px] text-[#334155] flex items-center justify-between gap-2 flex-wrap dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
                <span className="whitespace-nowrap">
                  선택자산: <strong className="text-[#1d4ed8] dark:text-blue-400 font-mono">{selectedAssetObj.assetNo}</strong>{" "}
                  ({selectedAssetObj.modelName})
                  {attachedOptions.length > 0 && (
                    <span
                      className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-800 text-[10px] font-bold"
                      title={formatAttachedOptionsSummary(attachedOptions)}
                    >
                      부착옵션 {attachedOptions.length}종
                    </span>
                  )}
                </span>
                <span className="font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                  차대/S/N: {selectedAssetObj.serialNo || "-"}
                </span>
              </div>
            )}
          </div>

          {/* 3. 청구 시작일 · 과금 기준 · 월단가 · 일단가 */}
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
                과금 기준 *
              </label>
              <select
                value={rateBasis}
                onChange={(e) => {
                  const nextBasis = e.target.value as RentalRateBasis;
                  setRateBasis(nextBasis);
                  setUseProRata(nextBasis === "DAILY_MANUAL" || nextBasis === "DAILY_AUTO");
                  if (nextBasis === "DAILY_AUTO" || (nextBasis === "MONTHLY" && !dailyRate)) {
                    setDailyRate(
                      toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(monthlyRate)))
                    );
                  }
                }}
                className="w-full px-2.5 py-2 bg-[#ebe5d8] border border-[#b5a894] rounded-lg text-xs text-[#0f172a] font-semibold focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
              >
                {RENTAL_RATE_BASIS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                월단가 (원, VAT별도) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                required={rateBasis === "MONTHLY"}
                value={monthlyRate}
                onChange={(e) => {
                  const formatted = formatErpInputNumber(e.target.value);
                  setMonthlyRate(formatted);
                  if (rateBasis !== "DAILY_MANUAL") {
                    setDailyRate(
                      toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(formatted)))
                    );
                  }
                }}
                placeholder="600,000"
                className="w-full px-3 py-2 bg-[#ebe5d8] border border-[#b5a894] rounded-lg text-xs text-[#047857] font-mono font-bold text-right focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-emerald-400 dark:focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-1">
                <label className="text-xs font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                  일단가 (원)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRateBasis("DAILY_AUTO");
                    setUseProRata(true);
                    setDailyRate(
                      toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(monthlyRate)))
                    );
                  }}
                  className="text-[11px] font-bold text-[#1d4ed8] hover:underline whitespace-nowrap shrink-0"
                >
                  자동계산
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={dailyRate}
                onChange={(e) => {
                  setRateBasis("DAILY_MANUAL");
                  setUseProRata(true);
                  setDailyRate(formatErpInputNumber(e.target.value));
                }}
                placeholder="20,000"
                className="w-full px-3 py-2 bg-[#ebe5d8] border border-[#b5a894] rounded-lg text-xs text-[#1d4ed8] font-mono font-bold text-right focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-blue-400 dark:focus:border-blue-500"
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

          {/* 부착옵션 추가 및 렌탈 과금 합산 */}
          <ForkliftOptionAttachPanel
            mode="RENTAL"
            options={attachedOptions}
            onChange={setAttachedOptions}
            catalogOptions={optionCatalog}
            title="부착옵션 선택 및 출고 반영"
          />

          {/* 당월 청구 반영액 계산 요약 */}
          <div className="p-3 rounded-lg bg-[#ebe5d8] border border-[#b5a894] space-y-1.5 dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-[#b5a894]/60 dark:border-slate-800">
              <span className="font-semibold text-[#1e40af] dark:text-blue-400 whitespace-nowrap">
                당월 청구 예상액
              </span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-[#475569] dark:text-slate-400 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={useProRata}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseProRata(checked);
                    if (checked && rateBasis === "MONTHLY") {
                      setRateBasis("DAILY_AUTO");
                      setDailyRate(
                        toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(monthlyRate)))
                      );
                    } else if (!checked) {
                      setRateBasis("MONTHLY");
                    }
                  }}
                  className="rounded border-[#b5a894]"
                />
                <span>일할 계산 적용</span>
              </label>
            </div>
            {optionTotals.totalMonthlyAddon > 0 && (
              <div className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                <span className="whitespace-nowrap">적용 월단가 합산 (기본 + 옵션)</span>
                <span className="font-mono whitespace-nowrap">
                  ₩{formatErpNumber(cleanErpNumber(monthlyRate))} + ₩{formatErpNumber(optionTotals.totalMonthlyAddon)} = ₩
                  {formatErpNumber(cleanErpNumber(monthlyRate) + optionTotals.totalMonthlyAddon)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#475569] dark:text-slate-400 whitespace-nowrap">적용 기준 / 일수</span>
              <span className="font-mono font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                {proRataPreview.targetYm} (
                {rateBasis !== "MONTHLY" || useProRata
                  ? `일 ₩${formatErpNumber(proRataPreview.effectiveDailyRate)} × ${proRataPreview.operatingDays}일`
                  : "월단가 정액"}
                )
              </span>
            </div>
            <div className="pt-1.5 border-t border-[#b5a894] dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap">
                청구 반영 공급가
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
        <OutboundBillingAndLogsPanel
          yearMonth={yearMonth}
          customerSummary={customerSummary}
          customerFilter={customerFilter}
          onCustomerFilterChange={setCustomerFilter}
          activeView={activeView}
          onActiveViewChange={setActiveView}
          searchKeyword={searchKeyword}
          onSearchKeywordChange={setSearchKeyword}
          filteredBillings={filteredBillings}
          availableAssetCount={availableAssets.length}
          sortedAvailableAssets={sortedAvailableAssets}
          totalLogsCount={logs.length}
          sortedLogs={sortedLogs}
          selectedAssetId={selectedAssetId}
          onSelectAsset={handleSelectAsset}
          billingSort={{ sortKey, sortDir, onSort: handleSort }}
          availSort={{ sortKey: availSort.sortKey, sortDir: availSort.sortDir, onSort: availSort.handleSort }}
          logsSort={{ sortKey: logsSort.sortKey, sortDir: logsSort.sortDir, onSort: logsSort.handleSort }}
          totalMonthContractRate={totalMonthContractRate}
          totalMonthRevenue={totalMonthRevenue}
        />
      </div>
    </div>
  );
}
