"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { formatErpNumber, formatErpCurrency, formatErpQty, type SortDirection } from "@/lib/erpFormat";
import { formatAttachedOptionsSummary, normalizeAttachedOptions } from "@/lib/forkliftDomain";
import { SortableTh } from "../SortableTh";
import { AssetRecord, ModelSummaryRow, ModelSummaryTotals } from "./assetTypes";

interface AssetSummaryTableProps {
  loading: boolean;
  modelSummaryRows: ModelSummaryRow[];
  summaryTotals: ModelSummaryTotals;
  summarySortKey: string;
  summarySortDir: SortDirection;
  onSummarySort: (key: string) => void;
  onSelectModel: (modelName: string) => void;
}

export const AssetSummaryTable: React.FC<AssetSummaryTableProps> = ({
  loading,
  modelSummaryRows,
  summaryTotals,
  summarySortKey,
  summarySortDir,
  onSummarySort,
  onSelectModel,
}) => {
  const renderSummarySortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => (
    <SortableTh
      label={label}
      colKey={key}
      sortKey={summarySortKey}
      sortDir={summarySortDir}
      onSort={onSummarySort}
      align={align}
      className="py-1.5 px-2 hover:bg-slate-500/10"
      iconClassName="w-3 h-3 text-blue-600"
    />
  );

  return (
    <table className="w-full text-left text-xs border-collapse">
      <thead className="sticky top-0 z-10 select-none bg-[var(--bg-card)] border-b">
        <tr>
          {renderSummarySortTh("제품 모델명", "modelName")}
          {renderSummarySortTh("모델코드", "modelCode")}
          {renderSummarySortTh("가동수량", "totalQty", "right")}
          {renderSummarySortTh("임대가능", "availableQty", "right")}
          {renderSummarySortTh("임대중", "rentedQty", "right")}
          {renderSummarySortTh("총취득원가", "grossAcquisitionCost", "right")}
          {renderSummarySortTh("누적상각·손실", "accumulatedCost", "right")}
          {renderSummarySortTh("현재장부가액", "bookValue", "right")}
          {renderSummarySortTh("누적렌탈매출", "cumulativeRevenue", "right")}
          {renderSummarySortTh("누적순수익(매출-상각)", "cumulativeNetProfit", "right")}
          {renderSummarySortTh("원가회수율", "recoveryRatePct", "right")}
        </tr>
      </thead>
      <tbody>
        {modelSummaryRows.length === 0 ? (
          <tr>
            <td colSpan={11} className="py-10 text-center text-xs opacity-60">
              {loading ? "자산 요약표를 집계하는 중입니다..." : "집계된 모델 자산이 없습니다."}
            </td>
          </tr>
        ) : (
          <>
            {modelSummaryRows.map((row) => (
              <tr
                key={row.key}
                onClick={() => onSelectModel(row.modelName)}
                className="cursor-pointer transition border-b hover:bg-black/5"
                title="클릭 시 해당 모델의 상세목록 조회"
              >
                <td className="py-1 px-2 font-semibold whitespace-nowrap">
                  {row.modelName}
                </td>
                <td className="py-1 px-2 font-mono opacity-75 whitespace-nowrap">
                  {row.modelCode}
                </td>
                <td className="py-1 px-2 text-right font-mono font-bold whitespace-nowrap">
                  {formatErpQty(row.totalQty, "대")}
                  {row.disposedQty > 0 && (
                    <span className="text-[10px] text-amber-700 ml-1">(폐기{row.disposedQty})</span>
                  )}
                </td>
                <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                  {formatErpQty(row.availableQty, "대")}
                </td>
                <td className="py-1 px-2 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                  {formatErpQty(row.rentedQty, "대")}
                </td>
                <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                  {formatErpCurrency(row.grossAcquisitionCost)}
                </td>
                <td className="py-1 px-2 text-right font-mono text-rose-700 whitespace-nowrap">
                  -{formatErpCurrency(row.accumulatedCost)}
                </td>
                <td className="py-1 px-2 text-right font-mono font-semibold text-purple-800 whitespace-nowrap">
                  {formatErpCurrency(row.bookValue)}
                </td>
                <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                  {row.cumulativeRevenue > 0 ? formatErpCurrency(row.cumulativeRevenue) : "₩0"}
                </td>
                <td className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap ${row.cumulativeNetProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                  {row.cumulativeNetProfit >= 0
                    ? `+${formatErpCurrency(row.cumulativeNetProfit)}`
                    : formatErpCurrency(row.cumulativeNetProfit)}
                </td>
                <td className="py-1 px-2 text-right font-mono font-semibold whitespace-nowrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${row.recoveryRatePct >= 100 ? "bg-emerald-600/15 text-emerald-700" : "bg-amber-600/15 text-amber-700"}`}>
                    {row.recoveryRatePct.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
            <tr className="bg-slate-500/10 font-bold border-t-2">
              <td className="py-1.5 px-2 whitespace-nowrap" colSpan={2}>
                합계 ({formatErpNumber(modelSummaryRows.length)}개 모델)
              </td>
              <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                {formatErpQty(summaryTotals.totalQty, "대")}
                {summaryTotals.disposedQty > 0 && (
                  <span className="text-[10px] text-amber-700 ml-1">(폐기{summaryTotals.disposedQty})</span>
                )}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                {formatErpQty(summaryTotals.availableQty, "대")}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-blue-700 whitespace-nowrap">
                {formatErpQty(summaryTotals.rentedQty, "대")}
              </td>
              <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                {formatErpCurrency(summaryTotals.grossAcquisitionCost)}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-rose-700 whitespace-nowrap">
                -{formatErpCurrency(summaryTotals.accumulatedCost)}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-purple-800 whitespace-nowrap">
                {formatErpCurrency(summaryTotals.bookValue)}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                {formatErpCurrency(summaryTotals.cumulativeRevenue)}
              </td>
              <td className={`py-1.5 px-2 text-right font-mono whitespace-nowrap ${summaryTotals.cumulativeNetProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                {summaryTotals.cumulativeNetProfit >= 0
                  ? `+${formatErpCurrency(summaryTotals.cumulativeNetProfit)}`
                  : formatErpCurrency(summaryTotals.cumulativeNetProfit)}
              </td>
              <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600/15 text-emerald-700">
                  {summaryTotals.recoveryRatePct.toFixed(1)}%
                </span>
              </td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  );
};

interface AssetDetailTableProps {
  loading: boolean;
  sortedFilteredAssets: AssetRecord[];
  selectedAssetId: number | null;
  isAdmin: boolean;
  sortKey: string;
  sortDir: SortDirection;
  onSort: (key: string) => void;
  onSelectAsset: (asset: AssetRecord) => void;
  onDeleteAsset: (id: number, assetNo: string) => void;
}

export const AssetDetailTable: React.FC<AssetDetailTableProps> = ({
  loading,
  sortedFilteredAssets,
  selectedAssetId,
  isAdmin,
  sortKey,
  sortDir,
  onSort,
  onSelectAsset,
  onDeleteAsset,
}) => {
  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => (
    <SortableTh
      label={label}
      colKey={key}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      align={align}
      className="py-1.5 px-2 hover:bg-slate-500/10"
      iconClassName="w-3 h-3 text-blue-600"
    />
  );

  return (
    <table className="w-full text-left text-xs border-collapse">
      <thead className="sticky top-0 z-10 select-none bg-[var(--bg-card)] border-b">
        <tr>
          {renderSortTh("자산번호", "assetNo")}
          {renderSortTh("제품 모델명", "modelName")}
          {renderSortTh("차대번호 / S/N", "serialNo")}
          {renderSortTh("소유구분", "ownerType", "center")}
          {renderSortTh("현재상태", "status", "center")}
          {renderSortTh("현재 대여처 / 배치현장", "currentCustomer")}
          {renderSortTh("가동시간", "operatingHours", "right")}
          {renderSortTh("취득일자", "acquisitionDate", "right")}
          {renderSortTh("취득원가", "acquisitionCost", "right")}
          {renderSortTh("현재 장부가액", "bookValue", "right")}
          {renderSortTh("누적 렌탈매출", "cumulativeRevenue", "right")}
          {renderSortTh("누적 순수익", "cumulativeNetProfit", "right")}
          <th className="py-1.5 px-2 text-center whitespace-nowrap">관리</th>
        </tr>
      </thead>
      <tbody>
        {sortedFilteredAssets.length === 0 ? (
          <tr>
            <td colSpan={13} className="py-10 text-center text-xs opacity-60">
              {loading ? "자산 대장을 불러오는 중입니다..." : "조회 조건에 일치하는 자산이 없습니다."}
            </td>
          </tr>
        ) : (
          sortedFilteredAssets.map((a) => {
            const isSelected = selectedAssetId === a.id;
            const formattedDate = a.acquisitionDate ? String(a.acquisitionDate).slice(0, 10) : "-";
            const opts = normalizeAttachedOptions(a.attachedOptions);
            return (
              <tr
                key={a.id}
                onClick={() => onSelectAsset(a)}
                className={`cursor-pointer transition border-b ${
                  isSelected ? "bg-blue-600/10 font-medium" : "hover:bg-black/5"
                }`}
              >
                <td className="py-1 px-2 font-mono font-bold text-blue-700 whitespace-nowrap">
                  {a.assetNo}
                </td>
                <td className="py-1 px-2 whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <span className="font-semibold">{a.modelName}</span>
                    {a.modelCode && (
                      <span className="text-[10px] opacity-60 font-mono">({a.modelCode})</span>
                    )}
                    {opts.length > 0 && (
                      <span
                        className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-800 text-[10px] font-bold"
                        title={formatAttachedOptionsSummary(opts)}
                      >
                        부착옵션 {opts.length}종
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-1 px-2 font-mono opacity-80 whitespace-nowrap">
                  {a.serialNo || "-"}
                </td>
                <td className="py-1 px-2 text-center whitespace-nowrap">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                      a.ownerType === "OWNED"
                        ? "bg-emerald-600/10 text-emerald-700 border-emerald-600/30"
                        : "bg-indigo-600/10 text-indigo-700 border-indigo-600/30"
                    }`}
                  >
                    {a.ownerType === "OWNED" ? "자사자산" : "외부임차"}
                  </span>
                </td>
                <td className="py-1 px-2 text-center whitespace-nowrap">
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      a.status === "RENTED"
                        ? "bg-blue-600 text-white"
                        : a.status === "AVAILABLE"
                        ? "bg-emerald-600 text-white"
                        : a.status === "REPAIRING"
                        ? "bg-amber-600 text-white"
                        : a.status === "OUTBOUND_PENDING"
                        ? "bg-sky-600 text-white"
                        : "bg-slate-600 text-white"
                    }`}
                  >
                    {a.status === "RENTED"
                      ? "대여중"
                      : a.status === "AVAILABLE"
                      ? "임대가능"
                      : a.status === "REPAIRING"
                      ? "수리중"
                      : a.status === "OUTBOUND_PENDING"
                      ? "출고대기"
                      : a.status}
                  </span>
                </td>
                <td className="py-1 px-2 whitespace-nowrap max-w-xs truncate">
                  {a.currentCustomer ? (
                    <div className="inline-flex items-baseline gap-1.5 truncate">
                      <span className="font-medium text-emerald-800 truncate">{a.currentCustomer}</span>
                      {a.currentSite && (
                        <span className="text-[10px] opacity-65 truncate">/ {a.currentSite}</span>
                      )}
                    </div>
                  ) : (
                    <span className="opacity-40">-</span>
                  )}
                </td>
                <td className="py-1 px-2 text-right font-mono opacity-85 whitespace-nowrap">
                  {formatErpNumber(a.operatingHours || 0)} hr
                </td>
                <td className="py-1 px-2 text-right font-mono opacity-80 whitespace-nowrap">
                  {formattedDate}
                </td>
                <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                  {a.acquisitionCost > 0 ? formatErpCurrency(a.acquisitionCost) : "-"}
                </td>
                <td className="py-1 px-2 text-right font-mono font-bold text-purple-800 whitespace-nowrap">
                  {a.bookValue > 0 ? formatErpCurrency(a.bookValue) : "₩0"}
                </td>
                <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                  {(a.cumulativeRevenue || 0) > 0 ? formatErpCurrency(a.cumulativeRevenue) : "₩0"}
                </td>
                <td className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap ${(a.cumulativeNetProfit || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                  {(a.cumulativeNetProfit || 0) >= 0
                    ? `+${formatErpCurrency(a.cumulativeNetProfit || 0)}`
                    : formatErpCurrency(a.cumulativeNetProfit || 0)}
                </td>
                <td className="py-1 px-2 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectAsset(a)}
                      className="px-1.5 py-0.5 rounded border text-[10px] hover:bg-black/5"
                      title="상세 장부"
                    >
                      상세
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => onDeleteAsset(a.id, a.assetNo)}
                        className="p-0.5 rounded text-rose-600 hover:bg-rose-500/10"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
};
