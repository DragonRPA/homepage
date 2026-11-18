export type MajorAccountKey =
  | "REVENUE"
  | "COGS"
  | "PAYROLL"
  | "OPEX"
  | "TAX_DUES"
  | "NON_OP";

export interface FinancialDetailItem {
  id: string;
  source: "TAX_INVOICE" | "BANK_TX" | "TAX_PAYMENT" | "DEPRECIATION";
  entityType: "CORP" | "INDIVIDUAL";
  yearMonth: string;
  date: string;
  majorAccount: MajorAccountKey;
  subAccount: string;
  counterparty: string;
  description: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  refNo: string;
}

export interface AccountRow {
  majorAccount: MajorAccountKey;
  subAccount: string;
  monthly: Record<string, number>;
  total: number;
  count: number;
}

export interface MonthlyTotal {
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

export interface StatementsData {
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

export interface FinancialSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginRate: number;
  payroll: number;
  opex: number;
  operatingProfit: number;
  operatingMarginRate: number;
  taxDues: number;
  netOperatingCash: number;
  nonOp: number;
}

export interface FinancialReportTabProps {
  currentUser?: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
}

export const MAJOR_LABELS: Record<
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

export const CORP_FOUNDING_YEAR = 2024; // 법인 설립연도(제1기 = 2024년)
export const EARLIEST_DATA_YEAR = 2023; // 개인사업자 포함 최초 데이터 연도

export function formatFiscalTermLabel(yrStr: string): string {
  if (yrStr === "ALL") return "전체 연도";
  const yNum = Number(yrStr);
  if (isNaN(yNum)) return yrStr;
  const termNo = yNum - CORP_FOUNDING_YEAR + 1;
  if (termNo >= 1) {
    return `제${termNo}기(${yNum}년)`;
  }
  return `개인(${yNum}년)`;
}

export function exportFinancialReportCsv(params: {
  year: string;
  entityFilter: string;
  months: string[];
  accountRows: AccountRow[];
  monthlyTotals: Record<string, MonthlyTotal>;
  summary: FinancialSummary;
  remarkText: string;
}): void {
  const { year, entityFilter, months, accountRows, monthlyTotals, summary, remarkText } = params;
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
}
