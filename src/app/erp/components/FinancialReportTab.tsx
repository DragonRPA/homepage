"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  RefreshCw,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  BarChart3,
  FileText,
  Landmark,
  Save,
  Scale,
  TrendingUp,
  ArrowLeftRight,
  MessageSquare,
  Printer,
} from "lucide-react";
import { formatErpCurrency, formatErpInputNumber, cleanErpNumber } from "@/lib/erpFormat";

interface FinancialDetailItem {
  id: string;
  source: "TAX_INVOICE" | "BANK_TX" | "TAX_PAYMENT" | "DEPRECIATION";
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

interface StatementsData {
  bs: {
    assets: {
      cashAndEquivalents: number;
      cashCorp: number;
      cashIndiv: number;
      accountsReceivable: number;
      vatPrepaid: number;
      currentAssets: number;
      leaseDeposit?: number;
      tangibleAssets: number;
      accumDepreciation: number;
      nonCurrentAssets: number;
      totalAssets: number;
    };
    liabilities: {
      accountsPayable: number;
      withholdingTaxPayable: number;
      vatTaxPayable: number;
      corporateTaxPayable: number;
      taxPaymentPayable: number;
      currentLiabilities: number;
      nonCurrentLiabilities: number;
      totalLiabilities: number;
    };
    equity: {
      capitalStock: number;
      retainedEarningsBefore: number;
      currentTermNetIncome: number;
      totalEquity: number;
    };
  };
  pl: {
    revenue: number;
    revenueSub: AccountRow[];
    cogs: number;
    cogsSub: AccountRow[];
    grossProfit: number;
    grossMarginRate: number;
    payroll: number;
    payrollSub: AccountRow[];
    opex: number;
    opexSub: AccountRow[];
    operatingProfit: number;
    operatingMarginRate: number;
    taxItems: {
      withholdingTax: number;
      vatTax: number;
      corporateTax: number;
      taxPayment: number;
      totalTax: number;
    };
    netIncome: number;
    netMarginRate: number;
  };
  cf: {
    beginningCash: number;
    operating: {
      saleInflow: number;
      otherInflow: number;
      purchaseOutflow: number;
      payrollOutflow: number;
      opexOutflow: number;
      withholdingTaxOutflow: number;
      vatTaxOutflow: number;
      corporateTaxOutflow: number;
      taxPaymentOutflow: number;
      netOperatingCashFlow: number;
    };
    investing: {
      inflow: number;
      outflow: number;
      netInvestingCashFlow: number;
    };
    financing: {
      inflow: number;
      outflow: number;
      netFinancingCashFlow: number;
    };
    netCashChange: number;
    endingCash: number;
  };
  remark: {
    text: string;
    taxWithholding: number;
    taxVat: number;
    taxCorporate: number;
    taxPayment: number;
    updatedAt: string | null;
  };
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
    title: "Ⅴ. 세금과공과 (원천세·부가세·법인세·납부항목)",
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

const CORP_FOUNDING_YEAR = 2024; // 법인 설립연도(제1기 = 2024년)
const EARLIEST_DATA_YEAR = 2023; // 개인사업자 포함 최초 데이터 연도

function formatFiscalTermLabel(yrStr: string): string {
  if (yrStr === "ALL") return "전체 연도";
  const yNum = Number(yrStr);
  if (isNaN(yNum)) return yrStr;
  const termNo = yNum - CORP_FOUNDING_YEAR + 1;
  if (termNo >= 1) {
    return `제${termNo}기(${yNum}년)`;
  }
  return `개인(${yNum}년)`;
}

export const FinancialReportTab: React.FC<FinancialReportTabProps> = ({
  currentUser,
  selectedEntity = "ALL",
}) => {
  const currentYearNum = useMemo(() => new Date().getFullYear(), []);
  const currentYearStr = String(currentYearNum);

  // 당기(현재 연도)부터 역순으로 회계기수 버튼 목록 동적 생성 (연도가 바뀌어도 코드 수정 불필요)
  const fiscalYearList = useMemo(() => {
    const list: Array<{ key: string; label: string; termNo: number }> = [];
    const maxYr = Math.max(currentYearNum, 2026);
    for (let y = maxYr; y >= EARLIEST_DATA_YEAR; y--) {
      const termNo = y - CORP_FOUNDING_YEAR + 1;
      list.push({
        key: String(y),
        label: formatFiscalTermLabel(String(y)),
        termNo,
      });
    }
    return list;
  }, [currentYearNum]);

  const [year, setYear] = useState<string>(() => String(new Date().getFullYear()));
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
  const [statements, setStatements] = useState<StatementsData | null>(null);
  const [depreciationSchedule, setDepreciationSchedule] = useState<any[]>([]);
  const [details, setDetails] = useState<FinancialDetailItem[]>([]);

  // 연도별 주석(Remark) 및 세무 4대 항목 상태 (초기값 0)
  const [remarkText, setRemarkText] = useState<string>("");
  const [taxWithholding, setTaxWithholding] = useState<number>(0);
  const [taxVat, setTaxVat] = useState<number>(0);
  const [taxCorporate, setTaxCorporate] = useState<number>(0);
  const [taxPayment, setTaxPayment] = useState<number>(0);
  const [savingRemark, setSavingRemark] = useState<boolean>(false);
  const [uploadingTaxFile, setUploadingTaxFile] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const taxFileInputRef = useRef<HTMLInputElement | null>(null);

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
    setSaveMessage("");
    try {
      const params = new URLSearchParams({
        year,
        entityType: entityFilter,
        amountBasis,
      });
      const res = await fetch(`/api/erp/financial-report?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setMonths(data.months || []);
        setAccountRows(data.accountRows || []);
        setMonthlyTotals(data.monthlyTotals || {});
        if (data.summary) setSummary(data.summary);
        if (data.statements) {
          setStatements(data.statements);
          setRemarkText(data.statements.remark?.text || "");
          setTaxWithholding(Number(data.statements.remark?.taxWithholding || 0));
          setTaxVat(Number(data.statements.remark?.taxVat || 0));
          setTaxCorporate(Number(data.statements.remark?.taxCorporate || 0));
          setTaxPayment(Number(data.statements.remark?.taxPayment || 0));
        }
        setDepreciationSchedule(data.depreciationSchedule || []);
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

  const handleSaveRemarkAndTax = async () => {
    setSavingRemark(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/erp/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          entityType: entityFilter,
          remarkText,
          taxWithholding: Number(taxWithholding || 0),
          taxVat: Number(taxVat || 0),
          taxCorporate: Number(taxCorporate || 0),
          taxPayment: Number(taxPayment || 0),
          updatedBy: currentUser?.name || "ADMIN",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage(data.message || "저장 완료");
        await fetchReport();
      } else {
        setSaveMessage(data.error || "저장 실패");
      }
    } catch (e: any) {
      setSaveMessage("저장 오류: " + e.message);
    } finally {
      setSavingRemark(false);
    }
  };

  const handleTaxPaymentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingTaxFile(true);
    setSaveMessage("");
    try {
      let totalUpserted = 0;
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append(
          "entityType",
          entityFilter === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP"
        );
        const res = await fetch("/api/erp/financial-report", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || `${files[i].name} 업로드 실패`);
        }
        totalUpserted += Number(data.upsertedCount || 0);
      }
      setSaveMessage(`국세청 납부세액 ${totalUpserted}건 업로드 완료`);
      await fetchReport();
    } catch (err: any) {
      setSaveMessage("업로드 오류: " + err.message);
    } finally {
      setUploadingTaxFile(false);
      if (taxFileInputRef.current) taxFileInputRef.current.value = "";
    }
  };

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
      "당기순이익 (영업이익 - 세금과공과)",
      ...months.map((m) => monthlyTotals[m]?.netOperatingCash || 0),
      summary.netOperatingCash,
    ]);

    if (remarkText.trim()) {
      csvRows.push(["주석(Remark)", year + "년 특이사항", remarkText]);
    }

    const csvBody = [
      headers.map(escapeCsv).join(","),
      ...csvRows.map((r) => r.map(escapeCsv).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvBody], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `재무제표_경영지표보고서_${year}_${entityFilter}.csv`);
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
                {val !== 0 ? formatErpCurrency(val) : majorKey === "TAX_DUES" ? "₩0" : "-"}
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
          rows.map((r) => {
            const isTaxRow = r.majorAccount === "TAX_DUES";
            return (
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
                      {r.count > 0 ? `(${r.count}건)` : isTaxRow ? "(세무항목)" : `(0건)`}
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
                      {v !== 0 ? formatErpCurrency(v) : isTaxRow ? "₩0" : "-"}
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
            );
          })}
      </React.Fragment>
    );
  };

  const yearLabel = year === "ALL" ? "전체 연도 누적" : formatFiscalTermLabel(year);

  // 1기 단위 좌우 이동 핸들러
  // 버튼 배열이 [당기(최신) ➔ 전기 ➔ 전전기 ... ➔ 2023년] 순서이므로:
  // ◀(좌측 버튼): 상위/최신 기수로 1기 이동 (예: 제2기 ➔ 제3기)
  // ▶(우측 버튼): 이전/과거 기수로 1기 이동 (예: 제3기 ➔ 제2기 ➔ 제1기)
  const currentYearIdx = useMemo(
    () => fiscalYearList.findIndex((item) => item.key === year),
    [fiscalYearList, year]
  );

  const canStepNewer = year === "ALL" ? true : currentYearIdx > 0;
  const canStepOlder =
    year === "ALL"
      ? fiscalYearList.length > 0
      : currentYearIdx >= 0 && currentYearIdx < fiscalYearList.length - 1;

  const handleStepNewerTerm = () => {
    setSelectedMonth("ALL");
    if (year === "ALL") {
      setYear(currentYearStr);
      return;
    }
    if (currentYearIdx > 0) {
      setYear(fiscalYearList[currentYearIdx - 1].key);
    }
  };

  const handleStepOlderTerm = () => {
    setSelectedMonth("ALL");
    if (year === "ALL") {
      if (fiscalYearList.length > 1) {
        setYear(fiscalYearList[1].key);
      } else if (fiscalYearList.length === 1) {
        setYear(fiscalYearList[0].key);
      }
      return;
    }
    if (currentYearIdx >= 0 && currentYearIdx < fiscalYearList.length - 1) {
      setYear(fiscalYearList[currentYearIdx + 1].key);
    }
  };

  return (
    <div className="erp-print-report-root flex flex-col min-h-full md:h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 md:overflow-hidden font-sans">
      {/* 1. 상단 조회 조건 & 파이프라인 바 (헌장 3.4, 3.5 준수) */}
      <div className="p-2.5 md:p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-end justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-end gap-2 w-full sm:w-auto">
          {/* 조회 회계기수 (연도) */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              조회 회계기수 (연도)
            </label>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {/* ◀ 1기 최신(당기 방향) 이동 버튼 */}
              <button
                type="button"
                onClick={handleStepNewerTerm}
                disabled={!canStepNewer}
                title="다음 기수(최신 기수 방향)로 1기 이동"
                className="px-1.5 py-1.5 text-xs font-bold rounded border bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] disabled:opacity-40 disabled:pointer-events-none shrink-0 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {fiscalYearList.map((y) => (
                <button
                  key={y.key}
                  type="button"
                  onClick={() => {
                    setYear(y.key);
                    setSelectedMonth("ALL");
                  }}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded border whitespace-nowrap shrink-0 transition ${
                    year === y.key
                      ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                      : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  }`}
                >
                  {y.label}
                </button>
              ))}

              {/* ▶ 1기 과거(전기 방향) 이동 버튼 */}
              <button
                type="button"
                onClick={handleStepOlderTerm}
                disabled={!canStepOlder}
                title="이전 기수(전기 방향)로 1기 이동"
                className="px-1.5 py-1.5 text-xs font-bold rounded border bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] disabled:opacity-40 disabled:pointer-events-none shrink-0 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* 전체 연도 버튼 유지 */}
              <button
                type="button"
                onClick={() => {
                  setYear("ALL");
                  setSelectedMonth("ALL");
                }}
                className={`px-2.5 py-1.5 text-xs font-bold rounded border whitespace-nowrap shrink-0 transition ${
                  year === "ALL"
                    ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                    : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                }`}
              >
                전체 연도
              </button>
            </div>
          </div>

          {/* 사업자 구분 */}
          <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[140px]">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              사업자 구분
            </label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as any)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded font-semibold focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full"
            >
              <option value="ALL">전체 사업자 (통합)</option>
              <option value="CORP">(주)드래곤알피에이 [법인]</option>
              <option value="INDIVIDUAL">드래곤알피에이 [개인]</option>
            </select>
          </div>

          {/* 금액 집계 기준 */}
          <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[130px]">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              세금계산서 금액 기준
            </label>
            <select
              value={amountBasis}
              onChange={(e) => setAmountBasis(e.target.value as any)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded font-semibold focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full"
            >
              <option value="SUPPLY">공급가액 기준</option>
              <option value="TOTAL">부가세 포함 총액</option>
            </select>
          </div>
        </div>

        {/* 우측 액션 버튼 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700">
            <img
              src="/ci-dragonrpa.png"
              alt="주식회사 드래곤알피에이 CI"
              className="w-5 h-5 object-contain"
            />
            <span className="text-[11px] font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
              주식회사 드래곤알피에이 결산재무제표
            </span>
          </div>

          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            title="조회"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <input
            ref={taxFileInputRef}
            type="file"
            accept=".xls,.xlsx,.csv"
            multiple
            onChange={handleTaxPaymentFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => taxFileInputRef.current?.click()}
            disabled={uploadingTaxFile}
            className="px-2.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{uploadingTaxFile ? "업로드 중..." : "국세청 납부세액 업로드"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-2.5 py-1.5 bg-[#334155] hover:bg-[#1e293b] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>보고서 인쇄</span>
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

      {/* 3. 본문: 재무제표 4대 보드 (BS / PL / CF / Remark) + 월별 계정 손익 매트릭스 + 상세 전표 내역 */}
      <div className="erp-print-report-body flex-1 md:overflow-auto p-2.5 md:p-3 space-y-3">
        {/* 3-0. 연도별 재무제표 4대 보드 (BS · PL · CF · Remark) */}
        {statements && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* ① 재무상태표 (BS - Balance Sheet) */}
            <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 flex flex-col">
              <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Scale className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400 shrink-0" />
                  <span className="whitespace-nowrap">① 재무상태표 (BS - Balance Sheet)</span>
                </div>
                <span className="text-[11px] font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                  {yearLabel} 기말 기준
                </span>
              </div>

              <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 text-xs">
                {/* 좌측: 자산 (Assets) */}
                <div className="bg-[#f4efe4] border border-[#c4b6a0] rounded p-2.5 dark:bg-slate-950 dark:border-slate-800 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#1e3a8a] dark:text-blue-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap">
                      <span>Ⅰ. 유동자산</span>
                      <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.bs.assets.currentAssets)}</span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 현금및현금성자산</span>
                      <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.bs.assets.cashAndEquivalents)}
                      </span>
                    </div>
                    {entityFilter === "ALL" && (
                      <div className="py-1 pl-6 pr-2 flex items-center justify-between text-xs text-[#64748b] dark:text-slate-400 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                        <span>└ 법인 / 개인 계좌잔액</span>
                        <span className="font-mono tabular-nums text-right">
                          {formatErpCurrency(statements.bs.assets.cashCorp)} /{" "}
                          {formatErpCurrency(statements.bs.assets.cashIndiv)}
                        </span>
                      </div>
                    )}
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 매출채권 (미수금)</span>
                      <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.bs.assets.accountsReceivable)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 whitespace-nowrap">
                      <span>· 부가세대급금·선급법인세</span>
                      <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">{formatErpCurrency(statements.bs.assets.vatPrepaid)}</span>
                    </div>

                    <div className="py-1 px-2 pt-2 flex items-center justify-between font-bold text-xs text-[#1e3a8a] dark:text-blue-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap">
                      <span>Ⅱ. 비유동자산</span>
                      <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.bs.assets.nonCurrentAssets)}</span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 임차보증금</span>
                      <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.bs.assets.leaseDeposit || 0)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 유형자산 (취득가액)</span>
                      <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">{formatErpCurrency(statements.bs.assets.tangibleAssets)}</span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#64748b] dark:text-slate-400 whitespace-nowrap">
                      <span>· 감가상각누계액</span>
                      <span className="font-mono tabular-nums text-right">
                        {statements.bs.assets.accumDepreciation > 0
                          ? `-${formatErpCurrency(statements.bs.assets.accumDepreciation)}`
                          : "₩0"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 px-2 border-t-2 border-[#1d4ed8] flex items-center justify-between font-extrabold text-xs text-[#1e3a8a] dark:text-blue-300 whitespace-nowrap">
                    <span>자산총계</span>
                    <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.bs.assets.totalAssets)}</span>
                  </div>
                </div>

                {/* 우측: 부채 및 자본 (Liabilities & Equity) */}
                <div className="bg-[#f4efe4] border border-[#c4b6a0] rounded p-2.5 dark:bg-slate-950 dark:border-slate-800 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#991b1b] dark:text-rose-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap">
                      <span>Ⅰ. 부채 (유동부채)</span>
                      <span className="font-mono tabular-nums text-right">
                        {formatErpCurrency(statements.bs.liabilities.totalLiabilities)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 매입채무 (미지급금)</span>
                      <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.bs.liabilities.accountsPayable)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 원천세 (예수금)</span>
                      <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.bs.liabilities.withholdingTaxPayable)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 부가세 (예수금)</span>
                      <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.bs.liabilities.vatTaxPayable)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 법인세 (미지급)</span>
                      <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.bs.liabilities.corporateTaxPayable)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 whitespace-nowrap">
                      <span>· 납부항목 (세무)</span>
                      <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.bs.liabilities.taxPaymentPayable)}
                      </span>
                    </div>

                    <div className="py-1 px-2 pt-2 flex items-center justify-between font-bold text-xs text-[#065f46] dark:text-emerald-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap">
                      <span>Ⅱ. 자본</span>
                      <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.bs.equity.totalEquity)}</span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 자본금</span>
                      <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">{formatErpCurrency(statements.bs.equity.capitalStock)}</span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 전기이월이익잉여금</span>
                      <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.bs.equity.retainedEarningsBefore)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs font-bold text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                      <span>· 당기순이익</span>
                      <span className="font-mono tabular-nums text-right">
                        {formatErpCurrency(statements.bs.equity.currentTermNetIncome)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 px-2 border-t-2 border-[#047857] flex items-center justify-between font-extrabold text-xs text-[#065f46] dark:text-emerald-300 whitespace-nowrap">
                    <span>부채와자본총계</span>
                    <span className="font-mono tabular-nums text-right">
                      {formatErpCurrency(
                        statements.bs.liabilities.totalLiabilities + statements.bs.equity.totalEquity
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ② 손익계산서 (PL - Income Statement) */}
            <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 flex flex-col">
              <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <TrendingUp className="w-4 h-4 text-[#047857] dark:text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap">② 손익계산서 (PL - Income Statement)</span>
                </div>
                <span className="text-[11px] font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                  {yearLabel} 누적 손익
                </span>
              </div>

              <div className="p-2.5 flex-1 flex flex-col justify-between text-xs bg-[#f4efe4] dark:bg-slate-950 m-2.5 rounded border border-[#c4b6a0] dark:border-slate-800">
                <div className="space-y-1">
                  <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#1e3a8a] dark:text-blue-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                    <span>Ⅰ. 매출액 (수익)</span>
                    <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.revenue)}</span>
                  </div>
                  <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#92400e] dark:text-amber-300 whitespace-nowrap">
                    <span>Ⅱ. 매출원가 (매입·외주)</span>
                    <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.cogs)}</span>
                  </div>
                  <div className="py-1 px-2 flex items-center justify-between font-extrabold text-xs text-[#065f46] bg-[#d1fae5]/70 dark:bg-emerald-950/50 dark:text-emerald-300 rounded whitespace-nowrap">
                    <span>★ 매출총이익 (이익률 {statements.pl.grossMarginRate}%)</span>
                    <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.grossProfit)}</span>
                  </div>

                  <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#5b21b6] dark:text-violet-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                    <span>Ⅲ. 급여·인건비 (급여·퇴직·4대보험)</span>
                    <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.payroll)}</span>
                  </div>
                  <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#991b1b] dark:text-rose-300 whitespace-nowrap">
                    <span>Ⅳ. 판매비와관리비 (운영비용)</span>
                    <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.opex)}</span>
                  </div>
                  <div className="py-1 px-2 flex items-center justify-between font-extrabold text-xs text-[#1e3a8a] bg-[#dbeafe]/80 dark:bg-blue-950/60 dark:text-blue-200 rounded whitespace-nowrap">
                    <span>★★ 영업이익 (이익률 {statements.pl.operatingMarginRate}%)</span>
                    <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.operatingProfit)}</span>
                  </div>

                  {/* 세무 4대 항목 (원천세, 부가세, 법인세, 납부항목 - 우측 금액 열 수직 정렬 통일) */}
                  <div className="pt-1 border-t border-[#d5cbb8] dark:border-slate-800 space-y-0.5">
                    <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#334155] dark:text-slate-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap">
                      <span>Ⅴ. 세무 항목 (원천세·부가세·법인세·납부항목)</span>
                      <span className="font-mono tabular-nums text-right">
                        {formatErpCurrency(statements.pl.taxItems.totalTax)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 원천세</span>
                      <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.pl.taxItems.withholdingTax)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 부가세 {amountBasis === "SUPPLY" ? "(예수금정산)" : ""}</span>
                      <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.pl.taxItems.vatTax)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 법인세 {year !== "ALL" && Number(year) >= 2026 ? "(중간예납 선급제외)" : ""}</span>
                      <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.pl.taxItems.corporateTax)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 whitespace-nowrap">
                      <span>· 납부항목</span>
                      <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                        {formatErpCurrency(statements.pl.taxItems.taxPayment)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 px-2 border-t-2 border-[#047857] flex items-center justify-between font-extrabold text-xs text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                  <span>★★★ 당기순이익 (순이익률 {statements.pl.netMarginRate}%)</span>
                  <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.netIncome)}</span>
                </div>
              </div>
            </div>

            {/* ③ 현금흐름표 (CF - Cash Flow Statement) */}
            <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 flex flex-col">
              <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <ArrowLeftRight className="w-4 h-4 text-[#b45309] dark:text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap">③ 현금흐름표 (CF - Cash Flow Statement)</span>
                </div>
                <span className="text-[11px] font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                  {yearLabel} 통장 실집행 기준
                </span>
              </div>

              <div className="p-2.5 flex-1 flex flex-col justify-between text-xs bg-[#f4efe4] dark:bg-slate-950 m-2.5 rounded border border-[#c4b6a0] dark:border-slate-800">
                <div className="space-y-1">
                  <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#334155] dark:text-slate-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap">
                    <span>Ⅰ. 기초 현금및현금성자산</span>
                    <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.cf.beginningCash)}</span>
                  </div>

                  <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#1e3a8a] dark:text-blue-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap">
                    <span>Ⅱ. 영업활동 현금흐름</span>
                    <span className="font-mono tabular-nums text-right">
                      {formatErpCurrency(statements.cf.operating.netOperatingCashFlow)}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 매출수납 유입 (+)</span>
                      <span className="font-mono tabular-nums font-semibold text-[#1d4ed8] dark:text-blue-400 text-right">
                        {formatErpCurrency(statements.cf.operating.saleInflow)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 매입·외주 지출 (-)</span>
                      <span className="font-mono tabular-nums font-semibold text-[#dc2626] dark:text-rose-400 text-right">
                        {formatErpCurrency(statements.cf.operating.purchaseOutflow)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 급여·인건비 지출 (-)</span>
                      <span className="font-mono tabular-nums font-semibold text-[#dc2626] dark:text-rose-400 text-right">
                        {formatErpCurrency(statements.cf.operating.payrollOutflow)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                      <span>· 운영경비 지출 (-)</span>
                      <span className="font-mono tabular-nums font-semibold text-[#dc2626] dark:text-rose-400 text-right">
                        {formatErpCurrency(statements.cf.operating.opexOutflow)}
                      </span>
                    </div>
                    <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 whitespace-nowrap">
                      <span>· 세무 유출 (원천세·부가세·법인세·납부항목) (-)</span>
                      <span className="font-mono tabular-nums font-semibold text-[#dc2626] dark:text-rose-400 text-right">
                        {formatErpCurrency(
                          statements.cf.operating.withholdingTaxOutflow +
                            statements.cf.operating.vatTaxOutflow +
                            statements.cf.operating.corporateTaxOutflow +
                            statements.cf.operating.taxPaymentOutflow
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="py-1 px-2 pt-1.5 flex items-center justify-between font-bold text-xs text-[#92400e] dark:text-amber-300 border-t border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap">
                    <span>Ⅲ. 투자활동 현금흐름 (자산취득·처분)</span>
                    <span className="font-mono tabular-nums text-right">
                      {formatErpCurrency(statements.cf.investing.netInvestingCashFlow)}
                    </span>
                  </div>

                  <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#5b21b6] dark:text-violet-300 whitespace-nowrap">
                    <span>Ⅳ. 재무활동 현금흐름 (가수금·자금이동)</span>
                    <span className="font-mono tabular-nums text-right">
                      {formatErpCurrency(statements.cf.financing.netFinancingCashFlow)}
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-2 px-2 border-t-2 border-[#b45309] flex items-center justify-between font-extrabold text-xs text-[#0f172a] dark:text-white whitespace-nowrap">
                  <span>Ⅴ. 기말 현금및현금성자산</span>
                  <span className="font-mono tabular-nums text-[#1d4ed8] dark:text-blue-400 text-right">
                    {formatErpCurrency(statements.cf.endingCash)}
                  </span>
                </div>
              </div>
            </div>

            {/* ④ 연도별 주석 (Remark) 및 세무일정 항목 관리 보드 */}
            <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 flex flex-col">
              <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <MessageSquare className="w-4 h-4 text-[#6d28d9] dark:text-violet-400 shrink-0" />
                  <span className="whitespace-nowrap">
                    ④ 연도별 재무제표 주석 (Remark) 및 세무 항목 ({yearLabel})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {saveMessage && (
                    <span className="text-[11px] font-bold text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                      {saveMessage}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => taxFileInputRef.current?.click()}
                    disabled={uploadingTaxFile}
                    className="px-2.5 py-1 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingTaxFile ? "업로드 중..." : "납부내역 엑셀 업로드"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRemarkAndTax}
                    disabled={savingRemark}
                    className="px-2.5 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingRemark ? "저장 중..." : "주석·세무 저장"}</span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 flex-1 flex flex-col gap-2.5 text-xs">
                {/* 세무 4대 항목 (원천세, 부가세, 법인세, 납부항목 - 초기값 0원) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#f4efe4] dark:bg-slate-950 p-2 rounded border border-[#c4b6a0] dark:border-slate-800">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                      원천세 (원)
                    </label>
                    <input
                      type="text"
                      value={formatErpInputNumber(taxWithholding)}
                      onChange={(e) => setTaxWithholding(cleanErpNumber(e.target.value))}
                      className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono tabular-nums font-bold text-xs focus:outline-none focus:border-[#1d4ed8]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                      부가세 (원)
                    </label>
                    <input
                      type="text"
                      value={formatErpInputNumber(taxVat)}
                      onChange={(e) => setTaxVat(cleanErpNumber(e.target.value))}
                      className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono tabular-nums font-bold text-xs focus:outline-none focus:border-[#1d4ed8]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                      법인세 (원)
                    </label>
                    <input
                      type="text"
                      value={formatErpInputNumber(taxCorporate)}
                      onChange={(e) => setTaxCorporate(cleanErpNumber(e.target.value))}
                      className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono tabular-nums font-bold text-xs focus:outline-none focus:border-[#1d4ed8]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                      납부항목 (원)
                    </label>
                    <input
                      type="text"
                      value={formatErpInputNumber(taxPayment)}
                      onChange={(e) => setTaxPayment(cleanErpNumber(e.target.value))}
                      className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono tabular-nums font-bold text-xs focus:outline-none focus:border-[#1d4ed8]"
                    />
                  </div>
                </div>

                {/* 연도별 주석(Remark) 자유 입력 */}
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    {yearLabel} 재무제표 주석 (Remark) — 특이사항 자유 입력
                  </label>
                  <textarea
                    rows={5}
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                    placeholder={`${yearLabel} 결산 특이사항, 세무일정 메모, 주요 거래 변동 내역 등을 자유롭게 입력 후 [주석·세무 저장]을 클릭하세요.`}
                    className="w-full flex-1 bg-[#f4efe4] dark:bg-slate-950 border border-[#b5a894] dark:border-slate-800 rounded p-2 text-xs leading-relaxed focus:outline-none focus:border-[#1d4ed8] resize-y"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3-1. 월별 손익·계정 매트릭스 테이블 */}
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold">
              <BarChart3 className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400 shrink-0" />
              <span className="whitespace-nowrap">월별 계정과목 손익·수지 집계표</span>
              <span className="hidden lg:inline text-[11px] font-normal text-[#475569] dark:text-slate-400 whitespace-nowrap">
                (각 금액 셀을 클릭하면 하단에 해당 월·계정의 상세 내역이 조회됩니다)
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
              단위: 원 ({amountBasis === "SUPPLY" ? "공급가액" : "부가세포함"})
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#dcd4c4] text-[#0f172a] font-bold border-b border-[#b5a894] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-2.5 md:px-3 whitespace-nowrap sticky left-0 z-20 bg-[#dcd4c4] dark:bg-slate-800 border-r border-[#b5a894] dark:border-slate-700 min-w-[155px] md:min-w-[230px]">
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

                {/* V. 세금과공과 (원천세, 부가세, 법인세, 납부항목) */}
                {renderMajorGroup("TAX_DUES", (mt) => mt.taxDues, summary.taxDues)}

                {/* 당기순이익 / 세후 영업수지 */}
                <tr className="bg-[#e2dbcd] dark:bg-slate-800 font-extrabold text-[#0f172a] dark:text-white border-b border-[#b5a894]">
                  <td className="py-2 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#e2dbcd] dark:bg-slate-800 border-r border-[#b5a894] dark:border-slate-700">
                    ★★★ {amountBasis === "SUPPLY" ? "당기순이익 (부가세·선급세액 제외)" : "당기순이익 / 세후 순영업수지 (영업이익 - Ⅴ)"}
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

        {/* 3-1B. 월별 유형자산(임대자산) 가치 변동 및 감가상각 명세표 (BS 유형자산 · PL 감가상각비 1:1 정합) */}
        {depreciationSchedule.length > 0 && entityFilter !== "INDIVIDUAL" && (
          <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Scale className="w-4 h-4 text-[#7c3aed] dark:text-purple-400 shrink-0" />
                <span className="whitespace-nowrap">월별 유형자산(임대자산) 가치 변동 및 감가상각 명세표</span>
              </div>
              <div className="text-[11px] font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                기초장부가 + 당월취득 - 당월상각 - 파손폐기 = 기말장부가 (BS 유형자산·누계액 100% 일치)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#dcd4c4] text-[#0f172a] font-bold border-b border-[#b5a894] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-1.5 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#dcd4c4] dark:bg-slate-800 border-r border-[#b5a894] dark:border-slate-700 min-w-[180px]">
                      유형자산 변동 구분
                    </th>
                    {months.map((m) => (
                      <th key={m} className="py-1.5 px-2.5 text-right font-mono whitespace-nowrap min-w-[100px]">
                        {year === "ALL" ? m : `${Number(m.slice(5, 7))}월`}
                      </th>
                    ))}
                    <th className="py-1.5 px-3 text-right font-mono whitespace-nowrap border-l border-[#b5a894] dark:border-slate-700 min-w-[125px] bg-[#d5cbb8] dark:bg-slate-800">
                      연간 합계 / 기말
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d5cbb8] dark:divide-slate-800">
                  {(() => {
                    const byMonth = new Map<string, any>();
                    for (const r of depreciationSchedule) byMonth.set(r.yearMonth, r);
                    const first = depreciationSchedule[0];
                    const last = depreciationSchedule[depreciationSchedule.length - 1];
                    const sumAdd = depreciationSchedule.reduce((s, x) => s + (x.additionCost || 0), 0);
                    const sumRev = depreciationSchedule.reduce((s, x) => s + (x.monthlyRevenue || 0), 0);
                    const sumDep = depreciationSchedule.reduce((s, x) => s + (x.depreciationExpense || 0), 0);
                    const sumLoss = depreciationSchedule.reduce((s, x) => s + (x.disposalLoss || 0), 0);
                    const sumProfit = depreciationSchedule.reduce((s, x) => s + (x.monthlyNetProfit || 0), 0);

                    return (
                      <>
                        <tr className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 font-semibold whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800">
                            · 기초 순장부가액
                          </td>
                          {months.map((m) => {
                            const v = byMonth.get(m)?.beginningBookValue || 0;
                            return (
                              <td key={m} className="py-1.5 px-2.5 text-right font-mono whitespace-nowrap">
                                {v > 0 ? formatErpCurrency(v) : "-"}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-3 text-right font-mono font-bold whitespace-nowrap border-l border-[#c4b6a0] dark:border-slate-800">
                            {formatErpCurrency(first?.beginningBookValue || 0)}
                          </td>
                        </tr>

                        <tr className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 font-semibold text-[#047857] dark:text-emerald-400 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800">
                            · 당월 신규취득원가 (+)
                          </td>
                          {months.map((m) => {
                            const v = byMonth.get(m)?.additionCost || 0;
                            return (
                              <td
                                key={m}
                                onClick={() => handleCellDrilldown("NON_OP", "임대자산취득(자산화)", m)}
                                className="py-1.5 px-2.5 text-right font-mono text-[#047857] dark:text-emerald-400 font-semibold whitespace-nowrap cursor-pointer hover:underline"
                              >
                                {v > 0 ? `+${formatErpCurrency(v)}` : "-"}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-[#047857] dark:text-emerald-400 whitespace-nowrap border-l border-[#c4b6a0] dark:border-slate-800">
                            +{formatErpCurrency(sumAdd)}
                          </td>
                        </tr>

                        <tr className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 font-semibold text-[#047857] dark:text-emerald-400 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800">
                            · 당월 자사 렌탈자산 임대매출 (PL) (+)
                          </td>
                          {months.map((m) => {
                            const v = byMonth.get(m)?.monthlyRevenue || 0;
                            return (
                              <td
                                key={m}
                                onClick={() => handleCellDrilldown("REVENUE", "자사 렌탈자산 임대매출", m)}
                                className="py-1.5 px-2.5 text-right font-mono text-[#047857] dark:text-emerald-400 font-bold whitespace-nowrap cursor-pointer hover:underline"
                              >
                                {v > 0 ? `+${formatErpCurrency(v)}` : "-"}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-[#047857] dark:text-emerald-400 whitespace-nowrap border-l border-[#c4b6a0] dark:border-slate-800">
                            +{formatErpCurrency(sumRev)}
                          </td>
                        </tr>

                        <tr className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 font-semibold text-[#dc2626] dark:text-rose-400 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800">
                            · 당월 감가상각비 (PL 원가) (-)
                          </td>
                          {months.map((m) => {
                            const v = byMonth.get(m)?.depreciationExpense || 0;
                            return (
                              <td
                                key={m}
                                onClick={() => handleCellDrilldown("COGS", "임대자산 감가상각비", m)}
                                className="py-1.5 px-2.5 text-right font-mono text-[#dc2626] dark:text-rose-400 font-bold whitespace-nowrap cursor-pointer hover:underline"
                              >
                                {v > 0 ? `-${formatErpCurrency(v)}` : "-"}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-[#dc2626] dark:text-rose-400 whitespace-nowrap border-l border-[#c4b6a0] dark:border-slate-800">
                            -{formatErpCurrency(sumDep)}
                          </td>
                        </tr>

                        {sumLoss > 0 && (
                          <tr className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40">
                            <td className="py-1.5 px-3 font-semibold text-[#b45309] dark:text-amber-400 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800">
                              · 당월 파손·폐기손실 (PL 원가) (-)
                            </td>
                            {months.map((m) => {
                              const v = byMonth.get(m)?.disposalLoss || 0;
                              return (
                                <td
                                  key={m}
                                  onClick={() => handleCellDrilldown("COGS", "임대자산 감가상각비", m)}
                                  className="py-1.5 px-2.5 text-right font-mono text-[#b45309] dark:text-amber-400 font-bold whitespace-nowrap cursor-pointer hover:underline"
                                >
                                  {v > 0 ? `-${formatErpCurrency(v)}` : "-"}
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-[#b45309] dark:text-amber-400 whitespace-nowrap border-l border-[#c4b6a0] dark:border-slate-800">
                              -{formatErpCurrency(sumLoss)}
                            </td>
                          </tr>
                        )}

                        <tr className="bg-[#ecfdf5]/70 dark:bg-emerald-950/40 font-bold text-[#065f46] dark:text-emerald-300">
                          <td className="py-1.5 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#ecfdf5] dark:bg-emerald-950 border-r border-[#c4b6a0] dark:border-slate-800">
                            ★ 당월 렌탈자산 순수익 (매출-상각)
                          </td>
                          {months.map((m) => {
                            const v = byMonth.get(m)?.monthlyNetProfit || 0;
                            return (
                              <td
                                key={m}
                                className={`py-1.5 px-2.5 text-right font-mono whitespace-nowrap ${
                                  v > 0 ? "text-[#047857] dark:text-emerald-300" : v < 0 ? "text-[#dc2626] dark:text-rose-400" : "opacity-50"
                                }`}
                              >
                                {v > 0 ? `+${formatErpCurrency(v)}` : v < 0 ? formatErpCurrency(v) : "₩0"}
                              </td>
                            );
                          })}
                          <td
                            className={`py-1.5 px-3 text-right font-mono font-extrabold whitespace-nowrap border-l border-[#c4b6a0] dark:border-slate-800 ${
                              sumProfit >= 0 ? "text-[#047857] dark:text-emerald-300" : "text-[#dc2626] dark:text-rose-400"
                            }`}
                          >
                            {sumProfit >= 0 ? `+${formatErpCurrency(sumProfit)}` : formatErpCurrency(sumProfit)}
                          </td>
                        </tr>

                        <tr className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 font-medium text-[#475569] dark:text-slate-400 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800">
                            · 기말 유형자산 취득가액 (BS)
                          </td>
                          {months.map((m) => {
                            const v = byMonth.get(m)?.endingGrossCost || 0;
                            return (
                              <td key={m} className="py-1.5 px-2.5 text-right font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
                                {v > 0 ? formatErpCurrency(v) : "-"}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-3 text-right font-mono font-bold whitespace-nowrap border-l border-[#c4b6a0] dark:border-slate-800">
                            {formatErpCurrency(last?.endingGrossCost || 0)}
                          </td>
                        </tr>

                        <tr className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 font-medium text-[#64748b] dark:text-slate-400 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800">
                            · 기말 감가상각누계액 (BS)
                          </td>
                          {months.map((m) => {
                            const v = byMonth.get(m)?.endingAccumDepreciation || 0;
                            return (
                              <td key={m} className="py-1.5 px-2.5 text-right font-mono text-[#64748b] dark:text-slate-400 whitespace-nowrap">
                                {v > 0 ? `-${formatErpCurrency(v)}` : "-"}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-[#64748b] dark:text-slate-400 whitespace-nowrap border-l border-[#c4b6a0] dark:border-slate-800">
                            -{formatErpCurrency(last?.endingAccumDepreciation || 0)}
                          </td>
                        </tr>

                        <tr className="bg-[#dbeafe]/70 dark:bg-blue-950/60 font-extrabold text-[#1e3a8a] dark:text-blue-200 border-t-2 border-[#1d4ed8]">
                          <td className="py-2 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#dbeafe] dark:bg-blue-950 border-r border-[#b5a894] dark:border-slate-700">
                            ★ 기말 유형자산 순장부가액 (BS)
                          </td>
                          {months.map((m) => {
                            const v = byMonth.get(m)?.endingBookValue || 0;
                            return (
                              <td key={m} className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
                                {v > 0 ? formatErpCurrency(v) : "₩0"}
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 text-right font-mono whitespace-nowrap border-l border-[#b5a894] dark:border-slate-700">
                            {formatErpCurrency(last?.endingBookValue || 0)}
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

            <div className="relative w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1.5 text-[#475569]" />
              <input
                type="text"
                value={detailSearch}
                onChange={(e) => setDetailSearch(e.target.value)}
                placeholder="거래처, 적요, 세목 검색"
                className="bg-[#f4efe4] border border-[#b5a894] text-xs pl-8 pr-3 py-1 rounded w-full sm:w-56 focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
          </div>

          {/* 모바일 전용 전표 카드 리스트 (가로폭 100% 최적화) */}
          <div className="md:hidden divide-y divide-[#c4b6a0] dark:divide-slate-800">
            {filteredDetails.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#475569]">
                조건에 해당하는 상세 전표 내역이 없습니다.
              </div>
            ) : (
              filteredDetails.slice(0, 150).map((d) => {
                const majMeta = MAJOR_LABELS[d.majorAccount];
                return (
                  <div key={d.id} className="p-3 bg-[#ebe5d8] dark:bg-slate-900 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[#334155] dark:text-slate-300">{d.date}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            d.entityType === "CORP"
                              ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]"
                              : "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                          }`}
                        >
                          {d.entityType === "CORP" ? "법인" : "개인"}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${majMeta.badgeClass}`}>
                          {majMeta.badge} · {d.subAccount}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-[#475569]">
                        {d.source === "TAX_INVOICE"
                          ? "세금계산서"
                          : d.source === "TAX_PAYMENT"
                          ? "국세청납부"
                          : d.source === "DEPRECIATION"
                          ? "감가상각"
                          : "통장입출금"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[#0f172a] dark:text-slate-100 truncate">
                        {d.counterparty}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-[#0f172a] dark:text-slate-100 shrink-0">
                        {formatErpCurrency(d.supplyAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#475569] dark:text-slate-400">
                      <span className="truncate">{d.description}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] shrink-0">
                        {d.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PC 전용 상세 전표 테이블 */}
          <div className="hidden md:block max-h-[360px] overflow-auto">
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
                          ) : d.source === "TAX_PAYMENT" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#475569] dark:text-slate-300">
                              <Scale className="w-3 h-3" />
                              국세청납부
                            </span>
                          ) : d.source === "DEPRECIATION" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7c3aed] dark:text-purple-400">
                              <TrendingUp className="w-3 h-3" />
                              감가상각
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
            영업이익({formatErpCurrency(summary.operatingProfit)}) - 세무({formatErpCurrency(summary.taxDues)}) ={" "}
            <b className="text-[#1d4ed8] dark:text-blue-400">
              당기순이익 {formatErpCurrency(summary.netOperatingCash)}
            </b>
          </span>
        </div>
        <div className="text-[11px] text-[#475569] dark:text-slate-400">
          * 원천세·부가세·법인세·납부항목 기본값 ₩0 반영 | 연도별 주석(Remark) DB 연동
        </div>
      </div>
    </div>
  );
};
