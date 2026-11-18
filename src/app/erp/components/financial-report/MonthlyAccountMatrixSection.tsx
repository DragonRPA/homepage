"use client";

import React from "react";
import { ChevronDown, ChevronRight, BarChart3, Scale } from "lucide-react";
import { formatErpCurrency } from "@/lib/erpFormat";
import {
  AccountRow,
  FinancialSummary,
  MAJOR_LABELS,
  MonthlyTotal,
} from "./financialReportTypes";

interface MonthlyAccountMatrixSectionProps {
  year: string;
  entityFilter: "ALL" | "CORP" | "INDIVIDUAL";
  amountBasis: "SUPPLY" | "TOTAL";
  months: string[];
  accountRows: AccountRow[];
  monthlyTotals: Record<string, MonthlyTotal>;
  summary: FinancialSummary;
  depreciationSchedule: any[];
  expandedMajors: Record<string, boolean>;
  onToggleMajor: (key: string) => void;
  selectedMonth: string;
  onToggleSelectedMonth: (month: string) => void;
  selectedMajor: string;
  selectedSub: string;
  onCellDrilldown: (major: string, sub: string, month: string) => void;
  onOpenStandardModal: (keyOrSubAccount: string, fallbackMajor?: string) => void;
}

export const MonthlyAccountMatrixSection: React.FC<MonthlyAccountMatrixSectionProps> = ({
  year,
  entityFilter,
  amountBasis,
  months,
  accountRows,
  monthlyTotals,
  summary,
  depreciationSchedule,
  expandedMajors,
  onToggleMajor,
  selectedMonth,
  onToggleSelectedMonth,
  selectedMajor,
  selectedSub,
  onCellDrilldown,
  onOpenStandardModal,
}) => {
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
          onClick={() => onToggleMajor(majorKey)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onOpenStandardModal(majorKey, majorKey);
          }}
          title="더블클릭: 준용 중소기업회계기준 조문·해설 보기"
          className={`cursor-pointer border-b border-[#b5a894] dark:border-slate-700 transition ${meta.rowClass}`}
        >
          <td
            onDoubleClick={(e) => {
              e.stopPropagation();
              onOpenStandardModal(majorKey, majorKey);
            }}
            className="py-2 px-3 whitespace-nowrap sticky left-0 z-10 bg-inherit border-r border-[#b5a894] dark:border-slate-700"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{meta.title}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenStandardModal(majorKey, majorKey);
                }}
                title="준용 중소기업회계기준 설명 보기"
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/80 hover:bg-white text-[#1e3a8a] border border-[#b5a894] dark:bg-slate-800 dark:text-blue-300 dark:border-slate-600 shrink-0 transition"
              >
                기준
              </button>
            </div>
          </td>
          {months.map((m) => {
            const val = monthlyTotals[m] ? totalSelector(monthlyTotals[m]) : 0;
            return (
              <td
                key={m}
                onClick={(e) => {
                  e.stopPropagation();
                  onCellDrilldown(majorKey, "ALL", m);
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
              onCellDrilldown(majorKey, "ALL", "ALL");
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
                  onClick={() => onCellDrilldown(r.majorAccount, r.subAccount, "ALL")}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onOpenStandardModal(r.subAccount, r.majorAccount);
                  }}
                  title="클릭: 하단 전표 필터 / 더블클릭: 준용 중소기업회계기준 설명 모달"
                  className="py-1.5 pl-7 pr-3 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800 cursor-pointer hover:text-[#1d4ed8] font-medium select-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="underline decoration-dotted underline-offset-2">
                      · {r.subAccount}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono text-[#64748b] dark:text-slate-400">
                        {r.count > 0 ? `(${r.count}건)` : isTaxRow ? "(세무항목)" : `(0건)`}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenStandardModal(r.subAccount, r.majorAccount);
                        }}
                        title="준용 중소기업회계기준 설명 보기"
                        className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#f4efe4] hover:bg-[#1d4ed8] hover:text-white text-[#475569] border border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 transition"
                      >
                        기준
                      </button>
                    </div>
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
                      onClick={() => onCellDrilldown(r.majorAccount, r.subAccount, m)}
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
                  onClick={() => onCellDrilldown(r.majorAccount, r.subAccount, "ALL")}
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

  return (
    <>
      {/* 3-1. 월별 손익·계정 매트릭스 테이블 */}
      <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <BarChart3 className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400 shrink-0" />
            <span className="whitespace-nowrap">월별 계정과목 손익·수지 집계표</span>
            <span className="hidden lg:inline text-[11px] font-normal text-[#475569] dark:text-slate-400 whitespace-nowrap">
              (계정과목 분류 항목 더블클릭: 준용 중소기업회계기준 설명 모달 / 금액 셀 클릭: 하단 전표 조회)
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
                  <div className="flex items-center justify-between gap-1">
                    <span>계정과목 분류</span>
                    <span className="text-[10px] font-normal text-[#1d4ed8] dark:text-blue-400">
                      (더블클릭: 회계기준)
                    </span>
                  </div>
                </th>
                {months.map((m) => (
                  <th
                    key={m}
                    onClick={() => onToggleSelectedMonth(m)}
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
                <td
                  onDoubleClick={() => onOpenStandardModal("SUMMARY_GROSS_PROFIT")}
                  title="더블클릭: 중소기업회계기준 제23조·제28조(매출총손익) 설명 모달"
                  className="py-2 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#d1fae5] dark:bg-emerald-950 border-r border-[#b5a894] dark:border-slate-700 cursor-pointer select-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>★ 매출총이익 (Ⅰ - Ⅱ)</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStandardModal("SUMMARY_GROSS_PROFIT");
                      }}
                      className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/80 hover:bg-[#047857] hover:text-white text-[#065f46] border border-[#059669]/50 transition"
                    >
                      기준
                    </button>
                  </div>
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
                <td
                  onDoubleClick={() => onOpenStandardModal("SUMMARY_OPERATING_PROFIT")}
                  title="더블클릭: 중소기업회계기준 제23조·제29조(영업손익) 설명 모달"
                  className="py-2 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#dbeafe] dark:bg-blue-950 border-r border-[#b5a894] dark:border-slate-700 cursor-pointer select-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>★★ 영업이익 (매출총이익 - Ⅲ - Ⅳ)</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStandardModal("SUMMARY_OPERATING_PROFIT");
                      }}
                      className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/80 hover:bg-[#1d4ed8] hover:text-white text-[#1e3a8a] border border-[#1d4ed8]/50 transition"
                    >
                      기준
                    </button>
                  </div>
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
                <td
                  onDoubleClick={() => onOpenStandardModal("SUMMARY_NET_INCOME")}
                  title="더블클릭: 중소기업회계기준 제23조·제34조·제35조(당기순이익) 설명 모달"
                  className="py-2 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#e2dbcd] dark:bg-slate-800 border-r border-[#b5a894] dark:border-slate-700 cursor-pointer select-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      ★★★ {amountBasis === "SUPPLY" ? "당기순이익 (부가세·선급세액 제외)" : "당기순이익 / 세후 순영업수지 (영업이익 - Ⅴ)"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStandardModal("SUMMARY_NET_INCOME");
                      }}
                      className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#f4efe4] hover:bg-[#1d4ed8] hover:text-white text-[#334155] border border-[#b5a894] transition"
                    >
                      기준
                    </button>
                  </div>
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
          <div
            onDoubleClick={() => onOpenStandardModal("DEPREC_SCHEDULE")}
            title="더블클릭: 중소기업회계기준 제11조·제38조·제55조(유형자산 변동 및 감가상각 주석) 설명"
            className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              <Scale className="w-4 h-4 text-[#7c3aed] dark:text-purple-400 shrink-0" />
              <span className="whitespace-nowrap">월별 유형자산(임대자산) 가치 변동 및 감가상각 명세표</span>
            </div>
            <div className="text-[11px] font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
              기초장부가 + 당월취득 - 당월상각 - 파손폐기 = 기말장부가 (항목 더블클릭: 회계기준)
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
                        <td
                          onDoubleClick={() => onOpenStandardModal("DEPREC_SCHEDULE")}
                          title="더블클릭: 중소기업회계기준 제11조·제38조 설명"
                          className="py-1.5 px-3 font-semibold whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800 cursor-pointer select-none"
                        >
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
                        <td
                          onDoubleClick={() => onOpenStandardModal("임대자산취득(자산화)", "NON_OP")}
                          title="더블클릭: 중소기업회계기준 제11조·제38조(임대자산 취득 자산화) 설명"
                          className="py-1.5 px-3 font-semibold text-[#047857] dark:text-emerald-400 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800 cursor-pointer select-none"
                        >
                          · 당월 신규취득원가 (+)
                        </td>
                        {months.map((m) => {
                          const v = byMonth.get(m)?.additionCost || 0;
                          return (
                            <td
                              key={m}
                              onClick={() => onCellDrilldown("NON_OP", "임대자산취득(자산화)", m)}
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
                        <td
                          onDoubleClick={() => onOpenStandardModal("자사 렌탈자산 임대매출", "REVENUE")}
                          title="더블클릭: 중소기업회계기준 제24조·제49조(자사 렌탈자산 임대매출) 설명"
                          className="py-1.5 px-3 font-semibold text-[#047857] dark:text-emerald-400 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800 cursor-pointer select-none"
                        >
                          · 당월 자사 렌탈자산 임대매출 (PL) (+)
                        </td>
                        {months.map((m) => {
                          const v = byMonth.get(m)?.monthlyRevenue || 0;
                          return (
                            <td
                              key={m}
                              onClick={() => onCellDrilldown("REVENUE", "자사 렌탈자산 임대매출", m)}
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
                        <td
                          onDoubleClick={() => onOpenStandardModal("임대자산 감가상각비", "COGS")}
                          title="더블클릭: 중소기업회계기준 제11조·제28조·제38조(임대자산 감가상각비) 설명"
                          className="py-1.5 px-3 font-semibold text-[#dc2626] dark:text-rose-400 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800 cursor-pointer select-none"
                        >
                          · 당월 감가상각비 (PL 원가) (-)
                        </td>
                        {months.map((m) => {
                          const v = byMonth.get(m)?.depreciationExpense || 0;
                          return (
                            <td
                              key={m}
                              onClick={() => onCellDrilldown("COGS", "임대자산 감가상각비", m)}
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
                          <td
                            onDoubleClick={() => onOpenStandardModal("임대자산 감가상각비", "COGS")}
                            className="py-1.5 px-3 font-semibold text-[#b45309] dark:text-amber-400 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800 cursor-pointer select-none"
                          >
                            · 당월 파손·폐기손실 (PL 원가) (-)
                          </td>
                          {months.map((m) => {
                            const v = byMonth.get(m)?.disposalLoss || 0;
                            return (
                              <td
                                key={m}
                                onClick={() => onCellDrilldown("COGS", "임대자산 감가상각비", m)}
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
                        <td
                          onDoubleClick={() => onOpenStandardModal("DEPREC_SCHEDULE")}
                          className="py-1.5 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#ecfdf5] dark:bg-emerald-950 border-r border-[#c4b6a0] dark:border-slate-800 cursor-pointer select-none"
                        >
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
                        <td
                          onDoubleClick={() => onOpenStandardModal("BS_TANGIBLE_ASSETS")}
                          title="더블클릭: 중소기업회계기준 제11조·제38조(유형자산 취득가액) 설명"
                          className="py-1.5 px-3 font-medium text-[#475569] dark:text-slate-400 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800 cursor-pointer select-none"
                        >
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
                        <td
                          onDoubleClick={() => onOpenStandardModal("BS_ACCUM_DEPREC")}
                          title="더블클릭: 중소기업회계기준 제6조제3항·제38조(감가상각누계액) 설명"
                          className="py-1.5 px-3 font-medium text-[#64748b] dark:text-slate-400 whitespace-nowrap sticky left-0 z-10 bg-[#ebe5d8] dark:bg-slate-900 border-r border-[#c4b6a0] dark:border-slate-800 cursor-pointer select-none"
                        >
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
                        <td
                          onDoubleClick={() => onOpenStandardModal("DEPREC_SCHEDULE")}
                          className="py-2 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#dbeafe] dark:bg-blue-950 border-r border-[#b5a894] dark:border-slate-700 cursor-pointer select-none"
                        >
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
    </>
  );
};
