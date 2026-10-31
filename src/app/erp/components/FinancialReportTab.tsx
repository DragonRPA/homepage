"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  Search,
  BarChart3,
  FileText,
  Landmark,
} from "lucide-react";
import { formatErpCurrency } from "@/lib/erpFormat";

interface FinancialDetailItem {
  id: string;
  source: "TAX_INVOICE" | "BANK_TX";
  entityType: "CORP" | "INDIVIDUAL";
  yearMonth: string;
  date: string;
  majorAccount: "REVENUE" | "COGS" | "PAYROLL" | "OPEX" | "TAX_DUES" | "NON_OP";
  subAccount: string;
  counterparty: string;
  description: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  refNo: string;
}

interface AccountRow {
  majorAccount: "REVENUE" | "COGS" | "PAYROLL" | "OPEX" | "TAX_DUES" | "NON_OP";
  subAccount: string;
  monthly: Record<string, number>;
  total: number;
  count: number;
}

interface MonthlyTotal {
  revenue: number;
  cogs: number;
  grossProfit: number;
  payroll: number;
  opex: number;
  operatingProfit: number;
  taxDues: number;
  netOperatingCash: number;
  nonOp: number;
}

interface FinancialReportTabProps {
  currentUser?: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
}

const MAJOR_LABELS: Record<
  AccountRow["majorAccount"],
  { title: string; badge: string; badgeClass: string; rowClass: string }
> = {
  REVENUE: {
    title: "Ⅰ. 매출액 (수익)",
    badge: "매출",
    badgeClass:
      "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
    rowClass: "bg-[#eff6ff]/70 dark:bg-blue-950/30 font-bold text-[#1e3a8a] dark:text-blue-200",
  },
  COGS: {
    title: "Ⅱ. 매입·원가 (매출원가)",
    badge: "매입·원가",
    badgeClass:
      "bg-[#fef3c7] text-[#92400e] border border-[#fde68a] dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
    rowClass: "bg-[#fffbeb]/70 dark:bg-amber-950/30 font-bold text-[#92400e] dark:text-amber-200",
  },
  PAYROLL: {
    title: "Ⅲ. 급여·인건비 (급여·퇴직·4대보험)",
    badge: "급여",
    badgeClass:
      "bg-[#ede9fe] text-[#5b21b6] border border-[#c4b5fd] dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30",
    rowClass: "bg-[#f5f3ff]/70 dark:bg-violet-950/30 font-bold text-[#5b21b6] dark:text-violet-200",
  },
  OPEX: {
    title: "Ⅳ. 판매비와관리비 (운영비용)",
    badge: "비용",
    badgeClass:
      "bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30",
    rowClass: "bg-[#fef2f2]/70 dark:bg-rose-950/30 font-bold text-[#991b1b] dark:text-rose-200",
  },
  TAX_DUES: {
    title: "Ⅴ. 세금과공과 (국세·부가세·지방세)",
    badge: "세금",
    badgeClass:
      "bg-[#e2e8f0] text-[#334155] border border-[#cbd5e1] dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600",
    rowClass: "bg-[#f1f5f9] dark:bg-slate-800/60 font-bold text-[#334155] dark:text-slate-200",
  },
  NON_OP: {
    title: "Ⅵ. 영업외·자금이동 (가수금·대표자이체·기타)",
    badge: "자금이동",
    badgeClass:
      "bg-[#e5e7eb] text-[#374151] border border-[#d1d5db] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    rowClass: "bg-[#f3f4f6] dark:bg-slate-800/40 font-bold text-[#374151] dark:text-slate-300",
  },
};

export const FinancialReportTab: React.FC<FinancialReportTabProps> = ({
  selectedEntity = "ALL",
}) => {
  const [year, setYear] = useState<string>("2026");
  const [entityFilter, setEntityFilter] = useState<"ALL" | "CORP" | "INDIVIDUAL">(selectedEntity);
  const [amountBasis, setAmountBasis] = useState<"SUPPLY" | "TOTAL">("SUPPLY");
  const [loading, setLoading] = useState(false);

  const [months, setMonths] = useState<string[]>([]);
  const [accountRows, setAccountRows] = useState<AccountRow[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<Record<string, MonthlyTotal>>({});
  const [summary, setSummary] = useState({
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    grossMarginRate: 0,
    payroll: 0,
    opex: 0,
    operatingProfit: 0,
    operatingMarginRate: 0,
    taxDues: 0,
    netOperatingCash: 0,
    nonOp: 0,
  });
  const [details, setDetails] = useState<FinancialDetailItem[]>([]);

  // 상세 전표 드릴다운 필터 상태
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedMajor, setSelectedMajor] = useState<string>("ALL");
  const [selectedSub, setSelectedSub] = useState<string>("ALL");
  const [detailSearch, setDetailSearch] = useState<string>("");

  const [expandedMajors, setExpandedMajors] = useState<Record<string, boolean>>({
    REVENUE: true,
    COGS: true,
    PAYROLL: true,
    OPEX: true,
    TAX_DUES: true,
    NON_OP: false,
  });

  useEffect(() => {
    setEntityFilter(selectedEntity);
  }, [selectedEntity]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year,
        entityType: entityFilter,
        amountBasis,
      });
      const res = await fetch(`/api/erp/financial-report?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMonths(data.months || []);
        setAccountRows(data.accountRows || []);
        setMonthlyTotals(data.monthlyTotals || {});
        if (data.summary) setSummary(data.summary);
        setDetails(data.details || []);
      }
    } catch (e) {
      console.error("Failed to fetch financial report:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [year, entityFilter, amountBasis]);

  const toggleMajor = (key: string) => {
    setExpandedMajors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredDetails = useMemo(() => {
    return details
      .filter((d) => {
        if (selectedMonth !== "ALL" && d.yearMonth !== selectedMonth) return false;
        if (selectedMajor !== "ALL" && d.majorAccount !== selectedMajor) return false;
        if (selectedSub !== "ALL" && d.subAccount !== selectedSub) return false;
        if (detailSearch.trim()) {
          const q = detailSearch.trim().toLowerCase();
          return (
            d.counterparty.toLowerCase().includes(q) ||
            d.description.toLowerCase().includes(q) ||
            d.subAccount.toLowerCase().includes(q) ||
            d.refNo.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [details, selectedMonth, selectedMajor, selectedSub, detailSearch]);

  const handleCellDrilldown = (major: string, sub: string, m: string) => {
    setSelectedMajor(major);
    setSelectedSub(sub);
    setSelectedMonth(m);
  };

  const handleExportCsv = () => {
    const headers = ["계정대분류", "계정세목", ...months.map((m) => `${m}월`), "합계"];
    const escapeCsv = (val: any) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows: any[][] = [];
    const majorOrder: AccountRow["majorAccount"][] = [
      "REVENUE",
      "COGS",
      "PAYROLL",
      "OPEX",
      "TAX_DUES",
      "NON_OP",
    ];

    for (const maj of majorOrder) {
      const majTitle = MAJOR_LABELS[maj].title;
      const subRows = accountRows.filter((r) => r.majorAccount === maj);
      for (const r of subRows) {
        csvRows.push([
          majTitle,
          r.subAccount,
          ...months.map((m) => r.monthly[m] || 0),
          r.total || 0,
        ]);
      }
    }

    csvRows.push([
      "요약",
      "매출총이익 (매출 - 매입원가)",
      ...months.map((m) => monthlyTotals[m]?.grossProfit || 0),
      summary.grossProfit,
    ]);
    csvRows.push([
      "요약",
      "영업이익 (매출총이익 - 급여 - 판관비)",
      ...months.map((m) => monthlyTotals[m]?.operatingProfit || 0),
      summary.operatingProfit,
    ]);
    csvRows.push([
      "요약",
      "세후영업수지 (영업이익 - 세금과공과)",
      ...months.map((m) => monthlyTotals[m]?.netOperatingCash || 0),
      summary.netOperatingCash,
    ]);

    const csvBody = [
      headers.map(escapeCsv).join(","),
      ...csvRows.map((r) => r.map(escapeCsv).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvBody], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `경영지표보고서_${year}_${entityFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderMajorGroup = (
    majorKey: AccountRow["majorAccount"],
    totalSelector: (mt: MonthlyTotal) => number,
    grandTotal: number
  ) => {
    const meta = MAJOR_LABELS[majorKey];
    const rows = accountRows.filter((r) => r.majorAccount === majorKey);
    const isExpanded = expandedMajors[majorKey];

    return (
      <React.Fragment key={majorKey}>
        {/* 대분류 합계 행 */}
        <tr
          onClick={() => toggleMajor(majorKey)}
          className={`cursor-pointer border-b border-[#b5a894] dark:border-slate-700 transition ${meta.rowClass}`}
        >
          <td className="py-2 px-3 whitespace-nowrap sticky left-0 z-10 bg-inherit border-r border-[#b5a894] dark:border-slate-700">
            <div className="flex items-center gap-1.5">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{meta.title}</span>
            </div>
          </td>
          {months.map((m) => {
            const val = monthlyTotals[m] ? totalSelector(monthlyTotals[m]) : 0;
            return (
              <td
                key={m}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCellDrilldown(majorKey, "ALL", m);
                }}
                className="py-2 px-2.5 text-right font-mono whitespace-nowrap hover:underline"
              >
                {val !== 0 ? formatErpCurrency(val) : "-"}
              </td>
            );
          })}
          <td
            onClick={(e) => {
              e.stopPropagation();
              handleCellDrilldown(majorKey, "ALL", "ALL");
            }}
            className="py-2 px-3 text-right font-mono font-extrabold whitespace-nowrap border-l border-[#b5a894] dark:border-slate-700 hover:underline"
          >
            {formatErpCurrency(grandTotal)}
          </td>
        </tr>

        {/* 세목 행 */}
        {isExpanded &&
          rows.map((r) => (
            <tr
              key={`${r.majorAccount}-${r.subAccount}`}
              className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/50 border-b border-[#d5cbb8] dark:border-slate-800 transition"
            >
              <td
                onClick={() => handleCellDrilldown(r.majorAccount, r.subAccount, "ALL")}
                className="py-1.5 pl-7 pr-3 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800 cursor-pointer hover:text-[#1d4ed8] font-medium"
              >
                <div className="flex items-center justify-between gap-2">
                  <span>· {r.subAccount}</span>
                  <span className="text-[10px] font-mono text-[#64748b] dark:text-slate-400">
                    ({r.count}건)
                  </span>
                </div>
              </td>
              {months.map((m) => {
                const v = r.monthly[m] || 0;
                const isSelectedCell =
                  selectedMajor === r.majorAccount &&
                  selectedSub === r.subAccount &&
                  selectedMonth === m;
                return (
                  <td
                    key={m}
                    onClick={() => handleCellDrilldown(r.majorAccount, r.subAccount, m)}
                    className={`py-1.5 px-2.5 text-right font-mono whitespace-nowrap cursor-pointer transition ${
                      isSelectedCell
                        ? "bg-[#dbeafe] text-[#1e40af] font-bold dark:bg-blue-900/50 dark:text-blue-200"
                        : v !== 0
                        ? "text-[#0f172a] dark:text-slate-200 hover:bg-[#e2dbcd] dark:hover:bg-slate-800"
                        : "text-[#94a3b8] dark:text-slate-600"
                    }`}
                  >
                    {v !== 0 ? formatErpCurrency(v) : "-"}
                  </td>
                );
              })}
              <td
                onClick={() => handleCellDrilldown(r.majorAccount, r.subAccount, "ALL")}
                className="py-1.5 px-3 text-right font-mono font-bold whitespace-nowrap border-l border-[#c4b6a0] dark:border-slate-800 cursor-pointer hover:bg-[#e2dbcd] dark:hover:bg-slate-800"
              >
                {formatErpCurrency(r.total)}
              </td>
            </tr>
          ))}
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 overflow-hidden font-sans">
      {/* 1. 상단 조회 조건 & 파이프라인 바 (헌장 3.4, 3.5 준수) */}
      <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-end justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-end gap-2.5">
          {/* 조회 연도 */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              조회 연도
            </label>
            <div className="flex items-center gap-1">
              {[
                { key: "2026", label: "2026년" },
                { key: "2025", label: "2025년" },
                { key: "2024", label: "2024년" },
                { key: "2023", label: "2023년" },
                { key: "ALL", label: "전체 연도(월별)" },
              ].map((y) => (
                <button
                  key={y.key}
                  type="button"
                  onClick={() => {
                    setYear(y.key);
                    setSelectedMonth("ALL");
                  }}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded border whitespace-nowrap transition ${
                    year === y.key
                      ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                      : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  }`}
                >
                  {y.label}
                </button>
              ))}
            </div>
          </div>

          {/* 사업자 구분 */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              사업자 구분
            </label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as any)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2.5 py-1.5 rounded font-semibold focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 사업자 (법인 + 개인 통합)</option>
              <option value="CORP">(주)드래곤알피에이 [법인]</option>
              <option value="INDIVIDUAL">드래곤알피에이 [개인]</option>
            </select>
          </div>

          {/* 금액 집계 기준 */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              세금계산서 금액 기준
            </label>
            <select
              value={amountBasis}
              onChange={(e) => setAmountBasis(e.target.value as any)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2.5 py-1.5 rounded font-semibold focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="SUPPLY">공급가액 기준 (손익 기준)</option>
              <option value="TOTAL">합계금액 기준 (부가세 포함)</option>
            </select>
          </div>
        </div>

        {/* 우측 액션 버튼 */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            title="조회"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>
        </div>
      </div>

      {/* 2. 핵심 경영지표 요약 바 (5대 계정 KPI) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 px-3 py-2 bg-[#dcd4c4] border-b border-[#b5a894] dark:bg-slate-900/90 dark:border-slate-800 shrink-0 text-xs">
        <div
          onClick={() => handleCellDrilldown("REVENUE", "ALL", "ALL")}
          className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:border-[#1d4ed8]"
        >
          <div className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
            Ⅰ. 총 매출액 (예정포함)
          </div>
          <div className="text-sm font-extrabold font-mono text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap mt-0.5">
            {formatErpCurrency(summary.revenue)}
          </div>
        </div>

        <div
          onClick={() => handleCellDrilldown("COGS", "ALL", "ALL")}
          className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:border-[#b45309]"
        >
          <div className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
            Ⅱ. 매입·원가 합계
          </div>
          <div className="text-sm font-extrabold font-mono text-[#b45309] dark:text-amber-400 whitespace-nowrap mt-0.5">
            {formatErpCurrency(summary.cogs)}
          </div>
        </div>

        <div className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
              매출총이익
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
              이익률 {summary.grossMarginRate}%
            </span>
          </div>
          <div className="text-sm font-extrabold font-mono text-[#047857] dark:text-emerald-400 whitespace-nowrap mt-0.5">
            {formatErpCurrency(summary.grossProfit)}
          </div>
        </div>

        <div
          onClick={() => handleCellDrilldown("PAYROLL", "ALL", "ALL")}
          className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:border-[#6d28d9]"
        >
          <div className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
            Ⅲ. 급여·인건비 (4대보험포함)
          </div>
          <div className="text-sm font-extrabold font-mono text-[#5b21b6] dark:text-violet-400 whitespace-nowrap mt-0.5">
            {formatErpCurrency(summary.payroll)}
          </div>
        </div>

        <div
          onClick={() => handleCellDrilldown("OPEX", "ALL", "ALL")}
          className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:border-[#dc2626]"
        >
          <div className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
            Ⅳ. 운영비용 (판관비)
          </div>
          <div className="text-sm font-extrabold font-mono text-[#dc2626] dark:text-rose-400 whitespace-nowrap mt-0.5">
            {formatErpCurrency(summary.opex)}
          </div>
        </div>

        <div className="p-2 rounded bg-[#ecfdf5] border border-[#047857] dark:bg-emerald-950/40 dark:border-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#065f46] dark:text-emerald-300 whitespace-nowrap">
              영업이익 (Operating Profit)
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/80 text-[#065f46]">
              {summary.operatingMarginRate}%
            </span>
          </div>
          <div
            className={`text-sm font-extrabold font-mono whitespace-nowrap mt-0.5 ${
              summary.operatingProfit >= 0
                ? "text-[#047857] dark:text-emerald-400"
                : "text-[#dc2626] dark:text-rose-400"
            }`}
          >
            {formatErpCurrency(summary.operatingProfit)}
          </div>
        </div>
      </div>

      {/* 3. 본문: 상단 월별 계정 손익 매트릭스 + 하단 선택 계정/월 상세 전표 내역 */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* 3-1. 월별 손익·계정 매트릭스 테이블 */}
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold">
              <BarChart3 className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
              <span>월별 계정과목 손익·수지 집계표</span>
              <span className="text-[11px] font-normal text-[#475569] dark:text-slate-400">
                (각 금액 셀을 클릭하면 하단에 해당 월·계정의 상세 내역이 조회됩니다)
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#475569] dark:text-slate-400">
              단위: 원 ({amountBasis === "SUPPLY" ? "공급가액 기준" : "부가세포함 총액 기준"})
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#dcd4c4] text-[#0f172a] font-bold border-b border-[#b5a894] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3 whitespace-nowrap sticky left-0 z-20 bg-[#dcd4c4] dark:bg-slate-800 border-r border-[#b5a894] dark:border-slate-700 min-w-[230px]">
                    계정과목 분류
                  </th>
                  {months.map((m) => (
                    <th
                      key={m}
                      onClick={() =>
                        setSelectedMonth((prev) => (prev === m ? "ALL" : m))
                      }
                      className={`py-2 px-2.5 text-right font-mono whitespace-nowrap cursor-pointer hover:bg-[#d0c6b4] dark:hover:bg-slate-700 min-w-[105px] ${
                        selectedMonth === m ? "bg-[#dbeafe] text-[#1e40af] dark:bg-blue-900/60" : ""
                      }`}
                    >
                      {year === "ALL" ? m : `${Number(m.slice(5, 7))}월`}
                    </th>
                  ))}
                  <th className="py-2 px-3 text-right font-mono whitespace-nowrap border-l border-[#b5a894] dark:border-slate-700 min-w-[125px] bg-[#d5cbb8] dark:bg-slate-800">
                    연간 합계
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* I. 매출액 */}
                {renderMajorGroup("REVENUE", (mt) => mt.revenue, summary.revenue)}

                {/* II. 매입·원가 */}
                {renderMajorGroup("COGS", (mt) => mt.cogs, summary.cogs)}

                {/* 매출총이익 요약행 */}
                <tr className="bg-[#d1fae5] dark:bg-emerald-950/60 font-extrabold text-[#065f46] dark:text-emerald-300 border-b-2 border-[#059669]">
                  <td className="py-2 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#d1fae5] dark:bg-emerald-950 border-r border-[#b5a894] dark:border-slate-700">
                    ★ 매출총이익 (Ⅰ - Ⅱ)
                  </td>
                  {months.map((m) => {
                    const gp = monthlyTotals[m]?.grossProfit || 0;
                    return (
                      <td
                        key={m}
                        className={`py-2 px-2.5 text-right font-mono whitespace-nowrap ${
                          gp < 0 ? "text-[#dc2626] dark:text-rose-400" : ""
                        }`}
                      >
                        {gp !== 0 ? formatErpCurrency(gp) : "-"}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right font-mono whitespace-nowrap border-l border-[#b5a894] dark:border-slate-700">
                    {formatErpCurrency(summary.grossProfit)}
                  </td>
                </tr>

                {/* III. 급여·인건비 */}
                {renderMajorGroup("PAYROLL", (mt) => mt.payroll, summary.payroll)}

                {/* IV. 판매비와관리비 (비용) */}
                {renderMajorGroup("OPEX", (mt) => mt.opex, summary.opex)}

                {/* 영업이익 요약행 */}
                <tr className="bg-[#dbeafe] dark:bg-blue-950/70 font-extrabold text-[#1e3a8a] dark:text-blue-200 border-b-2 border-[#1d4ed8]">
                  <td className="py-2 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#dbeafe] dark:bg-blue-950 border-r border-[#b5a894] dark:border-slate-700">
                    ★★ 영업이익 (매출총이익 - Ⅲ - Ⅳ)
                  </td>
                  {months.map((m) => {
                    const op = monthlyTotals[m]?.operatingProfit || 0;
                    return (
                      <td
                        key={m}
                        className={`py-2 px-2.5 text-right font-mono whitespace-nowrap ${
                          op < 0 ? "text-[#dc2626] dark:text-rose-400" : ""
                        }`}
                      >
                        {op !== 0 ? formatErpCurrency(op) : "-"}
                      </td>
                    );
                  })}
                  <td
                    className={`py-2 px-3 text-right font-mono whitespace-nowrap border-l border-[#b5a894] dark:border-slate-700 ${
                      summary.operatingProfit < 0 ? "text-[#dc2626] dark:text-rose-400" : ""
                    }`}
                  >
                    {formatErpCurrency(summary.operatingProfit)}
                  </td>
                </tr>

                {/* V. 세금과공과 */}
                {renderMajorGroup("TAX_DUES", (mt) => mt.taxDues, summary.taxDues)}

                {/* 세후 영업수지 */}
                <tr className="bg-[#e2dbcd] dark:bg-slate-800 font-extrabold text-[#0f172a] dark:text-white border-b border-[#b5a894]">
                  <td className="py-2 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#e2dbcd] dark:bg-slate-800 border-r border-[#b5a894] dark:border-slate-700">
                    ★★★ 세후 순영업수지 (영업이익 - Ⅴ)
                  </td>
                  {months.map((m) => {
                    const nc = monthlyTotals[m]?.netOperatingCash || 0;
                    return (
                      <td
                        key={m}
                        className={`py-2 px-2.5 text-right font-mono whitespace-nowrap ${
                          nc < 0 ? "text-[#dc2626] dark:text-rose-400" : "text-[#047857] dark:text-emerald-400"
                        }`}
                      >
                        {nc !== 0 ? formatErpCurrency(nc) : "-"}
                      </td>
                    );
                  })}
                  <td
                    className={`py-2 px-3 text-right font-mono whitespace-nowrap border-l border-[#b5a894] dark:border-slate-700 ${
                      summary.netOperatingCash < 0
                        ? "text-[#dc2626] dark:text-rose-400"
                        : "text-[#047857] dark:text-emerald-400"
                    }`}
                  >
                    {formatErpCurrency(summary.netOperatingCash)}
                  </td>
                </tr>

                {/* VI. 영업외·자금이동 (가수금/대표자이체 등) */}
                {renderMajorGroup("NON_OP", (mt) => mt.nonOp, summary.nonOp)}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3-2. 하단 계정·월별 상세 전표 내역 (세금계산서 + 통장집행 통합 조회) */}
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="p-2.5 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold">계정별 상세 내역</span>
              <select
                value={selectedMajor}
                onChange={(e) => {
                  setSelectedMajor(e.target.value);
                  setSelectedSub("ALL");
                }}
                className="bg-[#f4efe4] border border-[#b5a894] text-xs px-2 py-1 rounded font-semibold dark:bg-slate-900 dark:border-slate-700"
              >
                <option value="ALL">전체 계정대분류</option>
                <option value="REVENUE">Ⅰ. 매출액</option>
                <option value="COGS">Ⅱ. 매입·원가</option>
                <option value="PAYROLL">Ⅲ. 급여·인건비</option>
                <option value="OPEX">Ⅳ. 운영비용(판관비)</option>
                <option value="TAX_DUES">Ⅴ. 세금과공과</option>
                <option value="NON_OP">Ⅵ. 영업외·자금이동</option>
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-[#f4efe4] border border-[#b5a894] text-xs px-2 py-1 rounded font-mono dark:bg-slate-900 dark:border-slate-700"
              >
                <option value="ALL">전체 월</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {selectedSub !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedSub("ALL")}
                  className="px-2 py-0.5 bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd] rounded text-[11px] font-bold"
                >
                  세목: {selectedSub} ✕
                </button>
              )}

              <span className="text-[11px] font-mono text-[#475569] dark:text-slate-400">
                (총 {filteredDetails.length.toLocaleString()}건)
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1.5 text-[#475569]" />
              <input
                type="text"
                value={detailSearch}
                onChange={(e) => setDetailSearch(e.target.value)}
                placeholder="거래처, 적요, 세목 검색"
                className="bg-[#f4efe4] border border-[#b5a894] text-xs pl-8 pr-3 py-1 rounded w-56 focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#dcd4c4] text-[#0f172a] font-semibold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  <th className="py-1.5 px-2.5 whitespace-nowrap">일자</th>
                  <th className="py-1.5 px-2.5 whitespace-nowrap">사업자</th>
                  <th className="py-1.5 px-2.5 whitespace-nowrap">원천</th>
                  <th className="py-1.5 px-2.5 whitespace-nowrap">계정분류</th>
                  <th className="py-1.5 px-2.5 whitespace-nowrap">계정세목</th>
                  <th className="py-1.5 px-2.5 whitespace-nowrap">거래처·대상자</th>
                  <th className="py-1.5 px-2.5 whitespace-nowrap">적요·품목</th>
                  <th className="py-1.5 px-2.5 text-right whitespace-nowrap">공급가액(집행액)</th>
                  <th className="py-1.5 px-2.5 text-right whitespace-nowrap">부가세</th>
                  <th className="py-1.5 px-2.5 text-right whitespace-nowrap">합계금액</th>
                  <th className="py-1.5 px-2.5 text-center whitespace-nowrap">처리상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
                {filteredDetails.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="py-10 text-center text-[#475569] dark:text-slate-500 whitespace-nowrap"
                    >
                      조건에 해당하는 상세 전표 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredDetails.slice(0, 300).map((d) => {
                    const majMeta = MAJOR_LABELS[d.majorAccount];
                    return (
                      <tr
                        key={d.id}
                        className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-1.5 px-2.5 font-mono whitespace-nowrap">{d.date}</td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              d.entityType === "CORP"
                                ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]"
                                : "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                            }`}
                          >
                            {d.entityType === "CORP" ? "법인" : "개인"}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          {d.source === "TAX_INVOICE" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1d4ed8] dark:text-blue-400">
                              <FileText className="w-3 h-3" />
                              세금계산서
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#047857] dark:text-emerald-400">
                              <Landmark className="w-3 h-3" />
                              통장입출금
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${majMeta.badgeClass}`}
                          >
                            {majMeta.badge}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 font-semibold whitespace-nowrap">
                          {d.subAccount}
                        </td>
                        <td className="py-1.5 px-2.5 font-bold whitespace-nowrap">
                          {d.counterparty}
                        </td>
                        <td className="py-1.5 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap max-w-[280px] truncate">
                          {d.description}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold whitespace-nowrap">
                          {formatErpCurrency(d.supplyAmount)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-[#64748b] whitespace-nowrap">
                          {d.vatAmount ? formatErpCurrency(d.vatAmount) : "-"}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold whitespace-nowrap">
                          {formatErpCurrency(d.totalAmount)}
                        </td>
                        <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] dark:bg-emerald-500/20 dark:text-emerald-300">
                            {d.status}
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
      </div>

      {/* 4. 최하단 수지 보존 검증 바 (헌장 3.5 & 5.5 수지 보존식) */}
      <div className="p-2.5 bg-[#e2dbcd] border-t border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            📄 매출({formatErpCurrency(summary.revenue)}) - 매입원가({formatErpCurrency(summary.cogs)}) ={" "}
            <b className="text-[#047857] dark:text-emerald-400">
              매출총이익 {formatErpCurrency(summary.grossProfit)}
            </b>
          </span>
          <span className="text-[#b5a894]">|</span>
          <span>
            매출총이익 - 급여({formatErpCurrency(summary.payroll)}) - 비용({formatErpCurrency(summary.opex)}) ={" "}
            <b className="text-[#1d4ed8] dark:text-blue-400">
              영업이익 {formatErpCurrency(summary.operatingProfit)}
            </b>
          </span>
        </div>
        <div className="text-[11px] text-[#475569] dark:text-slate-400">
          * 예정 매출/매입 세금계산서 정상 수납·지급 가정 반영 | 세금계산서 매칭 입출금 이중집계 자동 제외
        </div>
      </div>
    </div>
  );
};
