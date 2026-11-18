"use client";

import React, { useMemo } from "react";
import { DollarSign, Calculator, Layers } from "lucide-react";
import {
  formatErpNumber,
  formatErpCurrency,
  formatErpQty,
  sortErpItems,
} from "@/lib/erpFormat";
import { SortableTh, useErpTableSort } from "../SortableTh";
import { DepMatrixMode } from "./assetTypes";

interface AssetDepreciationLedgerViewProps {
  depYear: string;
  depLoading: boolean;
  depMonths: string[];
  depRollForward: any[];
  depModelRows: any[];
  depSalesSeparation: any | null;
  depAllTimeSalesSeparation: any | null;
  depMatrixMode: DepMatrixMode;
  onChangeDepMatrixMode: (mode: DepMatrixMode) => void;
  depLogStats: { totalLogCount: number; lastSyncedAt: string | null };
  onDrilldownModel: (modelName: string) => void;
}

export const AssetDepreciationLedgerView: React.FC<AssetDepreciationLedgerViewProps> = ({
  depYear,
  depLoading,
  depMonths,
  depRollForward,
  depModelRows,
  depSalesSeparation,
  depAllTimeSalesSeparation,
  depMatrixMode,
  onChangeDepMatrixMode,
  depLogStats,
  onDrilldownModel,
}) => {
  const depRollSort = useErpTableSort("", null);
  const depModelSort = useErpTableSort("", null);
  const depMatrixSort = useErpTableSort("", null);

  const sortedDepRollForward = useMemo(
    () => sortErpItems(depRollForward, depRollSort.sortKey, depRollSort.sortDir),
    [depRollForward, depRollSort.sortKey, depRollSort.sortDir]
  );

  const sortedDepModelRows = useMemo(
    () =>
      sortErpItems(depModelRows, depModelSort.sortKey, depModelSort.sortDir, (m, k) => {
        if (k === "periodCost") return (m.periodDepreciationTotal || 0) + (m.periodDisposalLossTotal || 0);
        return m?.[k];
      }),
    [depModelRows, depModelSort.sortKey, depModelSort.sortDir]
  );

  const sortedDepMatrixRows = useMemo(
    () =>
      sortErpItems(depModelRows, depMatrixSort.sortKey, depMatrixSort.sortDir, (m, k) => {
        if (k === "periodSum") {
          return depMatrixMode === "NET_PROFIT"
            ? m.periodNetProfitTotal || 0
            : depMatrixMode === "REVENUE"
            ? m.periodRevenueTotal || 0
            : (m.periodDepreciationTotal || 0) + (m.periodDisposalLossTotal || 0);
        }
        if (k === "cumSum") {
          return depMatrixMode === "NET_PROFIT"
            ? m.cumulativeNetProfit || 0
            : depMatrixMode === "REVENUE"
            ? m.cumulativeRevenue || 0
            : m.cumulativeTotalCost || 0;
        }
        if (k.startsWith("month:")) {
          const ym = k.slice(6);
          return depMatrixMode === "NET_PROFIT"
            ? m.monthlyNetProfitMap?.[ym] || 0
            : depMatrixMode === "REVENUE"
            ? m.monthlyRevenueMap?.[ym] || 0
            : (m.monthlyDepreciationMap?.[ym] || 0) + (m.monthlyDisposalLossMap?.[ym] || 0);
        }
        return m?.[k];
      }),
    [depModelRows, depMatrixSort.sortKey, depMatrixSort.sortDir, depMatrixMode]
  );

  return (
    <div className="p-2.5 flex flex-col gap-3 text-xs">
      {/* 0) 매출세금계산서 기준 렌탈사업부 매출 유형 분리 (4대 매출 유형) */}
      {depSalesSeparation?.categories && depSalesSeparation.categories.length > 0 && (
        <div className="border rounded overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-500/10 border-b flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold whitespace-nowrap">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>렌탈 매출세금계산서 매출 유형 분리 ({depYear === "ALL" ? "전체 누적" : `${depYear}년`})</span>
            </div>
            <div className="text-[11px] font-mono opacity-75 whitespace-nowrap">
              전체 누적 렌탈 세금계산서 합계:{" "}
              {formatErpCurrency(depAllTimeSalesSeparation?.totalSupplyAmount || 0)} (
              {depAllTimeSalesSeparation?.totalInvoiceCount || 0}건)
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x">
            {depSalesSeparation.categories.map((cat: any) => {
              const allTimeCat = depAllTimeSalesSeparation?.categories?.find((x: any) => x.code === cat.code);
              const isOwnedRental = cat.code === "OWNED_ASSET_RENTAL";
              return (
                <div
                  key={cat.code}
                  className={`p-2.5 flex flex-col gap-1 ${
                    isOwnedRental ? "bg-emerald-500/10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 whitespace-nowrap">
                    <span className={`font-bold ${isOwnedRental ? "text-emerald-800" : ""}`}>
                      {cat.label}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono border">
                      {cat.invoiceCount}건 ({(cat.sharePct || 0).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-sm font-mono font-extrabold text-right whitespace-nowrap">
                    {formatErpCurrency(cat.supplyAmount)}
                  </div>
                  <div className="text-[10px] opacity-75 truncate" title={cat.description}>
                    {cat.description}
                  </div>
                  {depYear !== "ALL" && allTimeCat && (
                    <div className="text-[10px] font-mono opacity-65 text-right whitespace-nowrap border-t pt-1 mt-0.5">
                      전체 누적: {formatErpCurrency(allTimeCat.supplyAmount)} ({allTimeCat.invoiceCount}건)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1) 월별 유형자산(임대자산) 가치 변동 · 월별 렌탈매출 · 월별 순수익 정산표 */}
      <div className="border rounded overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-500/10 border-b flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold whitespace-nowrap">
            <Calculator className="w-3.5 h-3.5 text-purple-600" />
            <span>월별 유형자산 가치 변동 · 렌탈매출 · 순수익 정산표 ({depYear === "ALL" ? "전체기간" : `${depYear}년`})</span>
          </div>
          <div className="text-[11px] font-mono opacity-75 whitespace-nowrap">
            원장 적재: {formatErpNumber(depLogStats.totalLogCount)}건
            {depLogStats.lastSyncedAt ? ` | 최종 정산: ${String(depLogStats.lastSyncedAt).slice(0, 16)}` : ""}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[var(--bg-card)] border-b select-none">
              <tr>
                <SortableTh label="귀속연월" colKey="yearMonth" sortKey={depRollSort.sortKey} sortDir={depRollSort.sortDir} onSort={depRollSort.handleSort} className="py-1.5 px-2 hover:bg-slate-500/10" iconClassName="w-3 h-3 text-blue-600" />
                <SortableTh label="기초장부가액" colKey="beginningBookValue" sortKey={depRollSort.sortKey} sortDir={depRollSort.sortDir} onSort={depRollSort.handleSort} align="right" className="py-1.5 px-2 hover:bg-slate-500/10" iconClassName="w-3 h-3 text-blue-600" />
                <SortableTh label="당월취득원가 (+)" colKey="additionCost" sortKey={depRollSort.sortKey} sortDir={depRollSort.sortDir} onSort={depRollSort.handleSort} align="right" className="py-1.5 px-2 hover:bg-slate-500/10" iconClassName="w-3 h-3 text-blue-600" />
                <SortableTh label="당월렌탈매출 (+)" colKey="monthlyRevenue" sortKey={depRollSort.sortKey} sortDir={depRollSort.sortDir} onSort={depRollSort.handleSort} align="right" className="py-1.5 px-2 hover:bg-slate-500/10" iconClassName="w-3 h-3 text-blue-600" />
                <SortableTh label="당월감가상각비 (-)" colKey="depreciationExpense" sortKey={depRollSort.sortKey} sortDir={depRollSort.sortDir} onSort={depRollSort.handleSort} align="right" className="py-1.5 px-2 hover:bg-slate-500/10" iconClassName="w-3 h-3 text-blue-600" />
                <SortableTh label="파손·폐기손실 (-)" colKey="disposalLoss" sortKey={depRollSort.sortKey} sortDir={depRollSort.sortDir} onSort={depRollSort.handleSort} align="right" className="py-1.5 px-2 hover:bg-slate-500/10" iconClassName="w-3 h-3 text-blue-600" />
                <SortableTh label="당월순수익 (매출-상각)" colKey="monthlyNetProfit" sortKey={depRollSort.sortKey} sortDir={depRollSort.sortDir} onSort={depRollSort.handleSort} align="right" className="py-1.5 px-2 hover:bg-slate-500/10" iconClassName="w-3 h-3 text-blue-600" />
                <SortableTh label="누적순수익" colKey="cumulativeNetProfit" sortKey={depRollSort.sortKey} sortDir={depRollSort.sortDir} onSort={depRollSort.handleSort} align="right" className="py-1.5 px-2 hover:bg-slate-500/10" iconClassName="w-3 h-3 text-blue-600" />
                <SortableTh label="기말취득원가 (BS)" colKey="endingGrossCost" sortKey={depRollSort.sortKey} sortDir={depRollSort.sortDir} onSort={depRollSort.handleSort} align="right" className="py-1.5 px-2 hover:bg-slate-500/10" iconClassName="w-3 h-3 text-blue-600" />
                <SortableTh label="감가상각누계액 (BS)" colKey="endingAccumDepreciation" sortKey={depRollSort.sortKey} sortDir={depRollSort.sortDir} onSort={depRollSort.handleSort} align="right" className="py-1.5 px-2 hover:bg-slate-500/10" iconClassName="w-3 h-3 text-blue-600" />
                <SortableTh label="기말장부가액 (BS)" colKey="endingBookValue" sortKey={depRollSort.sortKey} sortDir={depRollSort.sortDir} onSort={depRollSort.handleSort} align="right" className="py-1.5 px-2 hover:bg-slate-500/10" iconClassName="w-3 h-3 text-blue-600" />
                <SortableTh label="가동수량" colKey="activeAssetCount" sortKey={depRollSort.sortKey} sortDir={depRollSort.sortDir} onSort={depRollSort.handleSort} align="right" className="py-1.5 px-2 hover:bg-slate-500/10" iconClassName="w-3 h-3 text-blue-600" />
              </tr>
            </thead>
            <tbody>
              {depLoading ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center opacity-60">
                    감가상각 및 매출·수익 원장을 불러오는 중입니다...
                  </td>
                </tr>
              ) : depRollForward.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center opacity-60">
                    해당 연도에 집계된 감가상각 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                <>
                  {sortedDepRollForward.map((r) => (
                    <tr key={r.yearMonth} className="border-b hover:bg-black/5">
                      <td className="py-1 px-2 font-mono font-bold whitespace-nowrap">{r.yearMonth}</td>
                      <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                        {r.beginningBookValue > 0 ? formatErpCurrency(r.beginningBookValue) : "-"}
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">
                        {r.additionCost > 0 ? `+${formatErpCurrency(r.additionCost)}` : "-"}
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-emerald-700 font-bold whitespace-nowrap">
                        {r.monthlyRevenue > 0 ? `+${formatErpCurrency(r.monthlyRevenue)}` : "-"}
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-rose-700 font-bold whitespace-nowrap">
                        {r.depreciationExpense > 0 ? `-${formatErpCurrency(r.depreciationExpense)}` : "-"}
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-amber-700 font-bold whitespace-nowrap">
                        {r.disposalLoss > 0 ? `-${formatErpCurrency(r.disposalLoss)}` : "-"}
                      </td>
                      <td className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap ${(r.monthlyNetProfit || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                        {(r.monthlyNetProfit || 0) > 0
                          ? `+${formatErpCurrency(r.monthlyNetProfit)}`
                          : (r.monthlyNetProfit || 0) < 0
                          ? formatErpCurrency(r.monthlyNetProfit)
                          : "₩0"}
                      </td>
                      <td className={`py-1 px-2 text-right font-mono font-semibold whitespace-nowrap ${(r.cumulativeNetProfit || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                        {(r.cumulativeNetProfit || 0) > 0
                          ? `+${formatErpCurrency(r.cumulativeNetProfit)}`
                          : formatErpCurrency(r.cumulativeNetProfit || 0)}
                      </td>
                      <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                        {r.endingGrossCost > 0 ? formatErpCurrency(r.endingGrossCost) : "-"}
                      </td>
                      <td className="py-1 px-2 text-right font-mono opacity-80 whitespace-nowrap">
                        {r.endingAccumDepreciation > 0 ? `-${formatErpCurrency(r.endingAccumDepreciation)}` : "-"}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-purple-800 whitespace-nowrap">
                        {r.endingBookValue > 0 ? formatErpCurrency(r.endingBookValue) : "₩0"}
                      </td>
                      <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                        {formatErpQty(r.activeAssetCount, "대")}
                      </td>
                    </tr>
                  ))}
                  {(() => {
                    const first = depRollForward[0];
                    const last = depRollForward[depRollForward.length - 1];
                    const sumAdd = depRollForward.reduce((s, x) => s + (x.additionCost || 0), 0);
                    const sumRev = depRollForward.reduce((s, x) => s + (x.monthlyRevenue || 0), 0);
                    const sumDep = depRollForward.reduce((s, x) => s + (x.depreciationExpense || 0), 0);
                    const sumLoss = depRollForward.reduce((s, x) => s + (x.disposalLoss || 0), 0);
                    const sumProfit = depRollForward.reduce((s, x) => s + (x.monthlyNetProfit || 0), 0);
                    return (
                      <tr className="bg-purple-500/10 font-bold border-t-2">
                        <td className="py-1.5 px-2 whitespace-nowrap">기간 합계 / 기말 잔액</td>
                        <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                          {formatErpCurrency(first?.beginningBookValue || 0)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                          +{formatErpCurrency(sumAdd)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                          +{formatErpCurrency(sumRev)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-rose-700 whitespace-nowrap">
                          -{formatErpCurrency(sumDep)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-amber-700 whitespace-nowrap">
                          -{formatErpCurrency(sumLoss)}
                        </td>
                        <td className={`py-1.5 px-2 text-right font-mono whitespace-nowrap ${sumProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                          {sumProfit >= 0 ? `+${formatErpCurrency(sumProfit)}` : formatErpCurrency(sumProfit)}
                        </td>
                        <td className={`py-1.5 px-2 text-right font-mono whitespace-nowrap ${(last?.cumulativeNetProfit || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                          {(last?.cumulativeNetProfit || 0) >= 0
                            ? `+${formatErpCurrency(last?.cumulativeNetProfit || 0)}`
                            : formatErpCurrency(last?.cumulativeNetProfit || 0)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                          {formatErpCurrency(last?.endingGrossCost || 0)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                          -{formatErpCurrency(last?.endingAccumDepreciation || 0)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-purple-800 whitespace-nowrap">
                          {formatErpCurrency(last?.endingBookValue || 0)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                          {formatErpQty(last?.activeAssetCount || 0, "대")}
                        </td>
                      </tr>
                    );
                  })()}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2) 품목 모델별 취득원가 · 내용월수 · 감가상각 · 누적매출 · 순수익 명세표 */}
      <div className="border rounded overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-500/10 border-b flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold whitespace-nowrap">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>모델별 취득원가 · 감가상각 · 누적매출 · 순수익 명세 ({formatErpNumber(depModelRows.length)}개 모델)</span>
          </div>
          <span className="text-[11px] font-mono opacity-75 whitespace-nowrap">
            순수익 = 자사 렌탈자산 임대매출 - 감가상각비 - 파손·폐기손실
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[var(--bg-card)] border-b select-none">
              <tr>
                <SortableTh label="모델명 (코드)" colKey="modelName" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} className="py-1.5 px-2" />
                <SortableTh label="공급처" colKey="supplier" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} className="py-1.5 px-2" />
                <SortableTh label="취득일자" colKey="acquisitionDate" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} align="center" className="py-1.5 px-2" />
                <SortableTh label="수량(가동/폐기)" colKey="totalQty" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} align="right" className="py-1.5 px-2" />
                <SortableTh label="총취득원가" colKey="grossAcquisitionCost" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} align="right" className="py-1.5 px-2" />
                <SortableTh label="내용월수" colKey="usefulLifeMonths" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} align="center" className="py-1.5 px-2" />
                <SortableTh label="당기렌탈매출" colKey="periodRevenueTotal" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} align="right" className="py-1.5 px-2" />
                <SortableTh label="당기상각·손실" colKey="periodCost" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} align="right" className="py-1.5 px-2" />
                <SortableTh label="당기순수익" colKey="periodNetProfitTotal" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} align="right" className="py-1.5 px-2" />
                <SortableTh label="누적렌탈매출" colKey="cumulativeRevenue" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} align="right" className="py-1.5 px-2" />
                <SortableTh label="누적상각·손실" colKey="cumulativeTotalCost" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} align="right" className="py-1.5 px-2" />
                <SortableTh label="기말장부가액" colKey="endingBookValue" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} align="right" className="py-1.5 px-2" />
                <SortableTh label="누적순수익" colKey="cumulativeNetProfit" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} align="right" className="py-1.5 px-2" />
                <SortableTh label="원가회수율" colKey="recoveryRatePct" sortKey={depModelSort.sortKey} sortDir={depModelSort.sortDir} onSort={depModelSort.handleSort} align="right" className="py-1.5 px-2" />
              </tr>
            </thead>
            <tbody>
              {depModelRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center opacity-60">
                    취득원가가 등록된 임대자산 모델이 없습니다.
                  </td>
                </tr>
              ) : (
                <>
                  {sortedDepModelRows.map((m) => {
                    const periodCost = (m.periodDepreciationTotal || 0) + (m.periodDisposalLossTotal || 0);
                    return (
                      <tr
                        key={m.modelKey}
                        onClick={() => onDrilldownModel(m.modelName)}
                        className="border-b hover:bg-black/5 cursor-pointer"
                        title="클릭 시 해당 모델의 자산 상세목록 조회"
                      >
                        <td className="py-1 px-2 whitespace-nowrap">
                          <span className="font-bold">{m.modelName}</span>{" "}
                          <span className="text-[10px] font-mono opacity-60">({m.modelCode})</span>
                        </td>
                        <td className="py-1 px-2 whitespace-nowrap">{m.supplier}</td>
                        <td className="py-1 px-2 text-center font-mono whitespace-nowrap">{m.acquisitionDate}</td>
                        <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                          {m.totalQty}대 ({m.activeQty}/{m.disposedQty})
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-semibold whitespace-nowrap">
                          {formatErpCurrency(m.grossAcquisitionCost)}
                        </td>
                        <td className="py-1 px-2 text-center font-mono whitespace-nowrap">
                          {m.usefulLifeMonths <= 1
                            ? "1개월(즉시)"
                            : m.usefulLifeMonths % 12 === 0
                            ? `${m.usefulLifeMonths / 12}년(${m.usefulLifeMonths}개월)`
                            : `${m.usefulLifeMonths}개월`}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {(m.periodRevenueTotal || 0) > 0 ? `+${formatErpCurrency(m.periodRevenueTotal)}` : "-"}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                          {periodCost > 0 ? `-${formatErpCurrency(periodCost)}` : "-"}
                        </td>
                        <td className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap ${(m.periodNetProfitTotal || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                          {(m.periodNetProfitTotal || 0) > 0
                            ? `+${formatErpCurrency(m.periodNetProfitTotal)}`
                            : (m.periodNetProfitTotal || 0) < 0
                            ? formatErpCurrency(m.periodNetProfitTotal)
                            : "₩0"}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {formatErpCurrency(m.cumulativeRevenue || 0)}
                        </td>
                        <td className="py-1 px-2 text-right font-mono opacity-80 text-rose-700 whitespace-nowrap">
                          -{formatErpCurrency(m.cumulativeTotalCost || 0)}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-semibold text-purple-800 whitespace-nowrap">
                          {formatErpCurrency(m.endingBookValue)}
                        </td>
                        <td className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap ${(m.cumulativeNetProfit || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                          {(m.cumulativeNetProfit || 0) >= 0
                            ? `+${formatErpCurrency(m.cumulativeNetProfit)}`
                            : formatErpCurrency(m.cumulativeNetProfit)}
                        </td>
                        <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${(m.recoveryRatePct || 0) >= 100 ? "bg-emerald-600/15 text-emerald-700" : "bg-amber-600/15 text-amber-700"}`}>
                            {(m.recoveryRatePct || 0).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(() => {
                    const totQty = depModelRows.reduce((s, x) => s + (x.totalQty || 0), 0);
                    const totAct = depModelRows.reduce((s, x) => s + (x.activeQty || 0), 0);
                    const totDisp = depModelRows.reduce((s, x) => s + (x.disposedQty || 0), 0);
                    const totGross = depModelRows.reduce((s, x) => s + (x.grossAcquisitionCost || 0), 0);
                    const totActGross = depModelRows.reduce((s, x) => s + (x.activeGrossCost || 0), 0);
                    const totPeriodRev = depModelRows.reduce((s, x) => s + (x.periodRevenueTotal || 0), 0);
                    const totPeriodDep = depModelRows.reduce((s, x) => s + (x.periodDepreciationTotal || 0), 0);
                    const totPeriodLoss = depModelRows.reduce((s, x) => s + (x.periodDisposalLossTotal || 0), 0);
                    const totPeriodProfit = depModelRows.reduce((s, x) => s + (x.periodNetProfitTotal || 0), 0);
                    const totCumRev = depModelRows.reduce((s, x) => s + (x.cumulativeRevenue || 0), 0);
                    const totCumCost = depModelRows.reduce((s, x) => s + (x.cumulativeTotalCost || 0), 0);
                    const totEndBook = depModelRows.reduce((s, x) => s + (x.endingBookValue || 0), 0);
                    const totCumProfit = depModelRows.reduce((s, x) => s + (x.cumulativeNetProfit || 0), 0);
                    const totRecPct = totGross > 0 ? Number(((totCumRev / totGross) * 100).toFixed(1)) : 0;
                    return (
                      <tr className="bg-slate-500/10 font-bold border-t-2">
                        <td className="py-1.5 px-2 whitespace-nowrap" colSpan={3}>
                          합계 (기말 가동자산 취득가액: {formatErpCurrency(totActGross)})
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                          {totQty}대 ({totAct}/{totDisp})
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                          {formatErpCurrency(totGross)}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono whitespace-nowrap">-</td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                          +{formatErpCurrency(totPeriodRev)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-rose-700 whitespace-nowrap">
                          -{formatErpCurrency(totPeriodDep + totPeriodLoss)}
                        </td>
                        <td className={`py-1.5 px-2 text-right font-mono whitespace-nowrap ${totPeriodProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                          {totPeriodProfit >= 0 ? `+${formatErpCurrency(totPeriodProfit)}` : formatErpCurrency(totPeriodProfit)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                          {formatErpCurrency(totCumRev)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-rose-700 whitespace-nowrap">
                          -{formatErpCurrency(totCumCost)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-purple-800 whitespace-nowrap">
                          {formatErpCurrency(totEndBook)}
                        </td>
                        <td className={`py-1.5 px-2 text-right font-mono whitespace-nowrap ${totCumProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                          {totCumProfit >= 0 ? `+${formatErpCurrency(totCumProfit)}` : formatErpCurrency(totCumProfit)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600/15 text-emerald-700">
                            {totRecPct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })()}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3) 모델별 × 월별 렌탈매출 / 감가상각비 / 순수익 매트릭스 */}
      {depMonths.length > 0 && depModelRows.length > 0 && (
        <div className="border rounded overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-500/10 border-b flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold whitespace-nowrap">
              <Calculator className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                모델별 월별 {depMatrixMode === "NET_PROFIT" ? "순수익(매출-상각)" : depMatrixMode === "REVENUE" ? "렌탈매출" : "감가상각·손실"} 집계표 ({depYear === "ALL" ? "전체기간" : `${depYear}년`})
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[
                { key: "NET_PROFIT", label: "월별 순수익" },
                { key: "REVENUE", label: "월별 렌탈매출" },
                { key: "DEPRECIATION", label: "월별 상각·손실" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onChangeDepMatrixMode(tab.key as DepMatrixMode)}
                  className={`h-6 px-2 rounded text-[11px] font-bold border whitespace-nowrap transition ${
                    depMatrixMode === tab.key
                      ? "bg-blue-600 text-white border-blue-700"
                      : "hover:bg-black/5 opacity-75"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[var(--bg-card)] border-b select-none">
                <tr>
                  <SortableTh
                    label="모델명 (코드)"
                    colKey="modelName"
                    sortKey={depMatrixSort.sortKey}
                    sortDir={depMatrixSort.sortDir}
                    onSort={depMatrixSort.handleSort}
                    className="py-1.5 px-2 sticky left-0 bg-[var(--bg-card)] border-r"
                  />
                  {depMonths.map((ym) => (
                    <SortableTh
                      key={ym}
                      label={depYear === "ALL" ? ym : `${Number(ym.slice(5, 7))}월`}
                      colKey={`month:${ym}`}
                      sortKey={depMatrixSort.sortKey}
                      sortDir={depMatrixSort.sortDir}
                      onSort={depMatrixSort.handleSort}
                      align="right"
                      className="py-1.5 px-2 font-mono"
                    />
                  ))}
                  <SortableTh
                    label="기간 합계"
                    colKey="periodSum"
                    sortKey={depMatrixSort.sortKey}
                    sortDir={depMatrixSort.sortDir}
                    onSort={depMatrixSort.handleSort}
                    align="right"
                    className="py-1.5 px-2 font-mono border-l"
                  />
                  <SortableTh
                    label="전체 누적"
                    colKey="cumSum"
                    sortKey={depMatrixSort.sortKey}
                    sortDir={depMatrixSort.sortDir}
                    onSort={depMatrixSort.handleSort}
                    align="right"
                    className="py-1.5 px-2 font-mono"
                  />
                </tr>
              </thead>
              <tbody>
                {sortedDepMatrixRows.map((m) => {
                  const periodSum =
                    depMatrixMode === "NET_PROFIT"
                      ? m.periodNetProfitTotal || 0
                      : depMatrixMode === "REVENUE"
                      ? m.periodRevenueTotal || 0
                      : (m.periodDepreciationTotal || 0) + (m.periodDisposalLossTotal || 0);
                  const cumSum =
                    depMatrixMode === "NET_PROFIT"
                      ? m.cumulativeNetProfit || 0
                      : depMatrixMode === "REVENUE"
                      ? m.cumulativeRevenue || 0
                      : m.cumulativeTotalCost || 0;
                  return (
                    <tr key={m.modelKey} className="border-b hover:bg-black/5">
                      <td className="py-1 px-2 whitespace-nowrap sticky left-0 bg-[var(--bg-card)] border-r">
                        <span className="font-bold">{m.modelName}</span>{" "}
                        <span className="text-[10px] font-mono opacity-60">({m.modelCode})</span>
                      </td>
                      {depMonths.map((ym) => {
                        const val =
                          depMatrixMode === "NET_PROFIT"
                            ? m.monthlyNetProfitMap?.[ym] || 0
                            : depMatrixMode === "REVENUE"
                            ? m.monthlyRevenueMap?.[ym] || 0
                            : (m.monthlyDepreciationMap?.[ym] || 0) + (m.monthlyDisposalLossMap?.[ym] || 0);
                        return (
                          <td
                            key={ym}
                            className={`py-1 px-2 text-right font-mono whitespace-nowrap ${
                              val === 0
                                ? "opacity-30"
                                : depMatrixMode === "REVENUE"
                                ? "text-emerald-700 font-semibold"
                                : depMatrixMode === "DEPRECIATION"
                                ? "text-rose-700"
                                : val > 0
                                ? "text-blue-700 font-semibold"
                                : "text-rose-700 font-semibold"
                            }`}
                          >
                            {val === 0
                              ? "-"
                              : depMatrixMode === "NET_PROFIT" && val > 0
                              ? `+${formatErpCurrency(val)}`
                              : formatErpCurrency(val)}
                          </td>
                        );
                      })}
                      <td
                        className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap border-l ${
                          depMatrixMode === "REVENUE"
                            ? "text-emerald-700"
                            : depMatrixMode === "DEPRECIATION"
                            ? "text-rose-700"
                            : periodSum >= 0
                            ? "text-blue-700"
                            : "text-rose-700"
                        }`}
                      >
                        {depMatrixMode === "NET_PROFIT" && periodSum > 0
                          ? `+${formatErpCurrency(periodSum)}`
                          : formatErpCurrency(periodSum)}
                      </td>
                      <td
                        className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap ${
                          depMatrixMode === "REVENUE"
                            ? "text-emerald-700"
                            : depMatrixMode === "DEPRECIATION"
                            ? "text-rose-700"
                            : cumSum >= 0
                            ? "text-blue-700"
                            : "text-rose-700"
                        }`}
                      >
                        {depMatrixMode === "NET_PROFIT" && cumSum > 0
                          ? `+${formatErpCurrency(cumSum)}`
                          : formatErpCurrency(cumSum)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
