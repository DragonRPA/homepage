"use client";

import React from "react";
import { Download, Edit, X } from "lucide-react";
import { formatErpCurrency, formatErpNumber, formatErpQty } from "@/lib/erpFormat";
import {
  FORKLIFT_ITEM_CLASS_OPTIONS,
  getItemClassLabel,
  normalizeItemClass,
  type ForkliftItemClass,
} from "@/lib/forkliftDomain";
import {
  AGING_TIER_LABELS,
  type AgingTier,
  type TradeInventoryLotRow,
} from "@/lib/tradeInventoryDomain";
import { SearchSelectCombobox } from "../SearchSelectCombobox";
import {
  getTradeAgingBadgeClass,
  getTradeItemClassBadgeStyle,
  TRADE_ELAPSED_PRESETS,
  type TradeDocViewerState,
  type TradeInventoryStats,
  type TradeInventorySummaryRow,
  type TradeInventoryViewMode,
  type TradeProductFilterMetadata,
  type TradeStockScopeFilter,
  type TradeSubTabKey,
} from "./tradeHelpers";

export interface TradeScopeFilterBarProps {
  subTab: TradeSubTabKey;
  inventoryViewMode: TradeInventoryViewMode;
  onChangeInventoryViewMode: (mode: TradeInventoryViewMode) => void;
  stockScopeFilter: TradeStockScopeFilter;
  onChangeStockScopeFilter: (scope: TradeStockScopeFilter) => void;
  prodItemClassFilter: "ALL" | ForkliftItemClass;
  onChangeProdItemClassFilter: (val: "ALL" | ForkliftItemClass) => void;
  products: any[];
  categoryFilter: string;
  onChangeCategoryFilter: (val: string) => void;
  productFilterMetadata: TradeProductFilterMetadata;
  manufacturerFilter: string;
  onChangeManufacturerFilter: (val: string) => void;
  modelFilter: string;
  onChangeModelFilter: (val: string) => void;
  minElapsedDaysInput: string;
  onChangeMinElapsedDaysInput: (val: string) => void;
  maxElapsedDaysInput: string;
  onChangeMaxElapsedDaysInput: (val: string) => void;
  onSelectElapsedPreset: (min: string, max: string) => void;
  hasActiveTradeFilters: boolean;
  onClearTradeFilters: () => void;
  inventoryRefDate: string;
  inventoryCount: number;
  productsCount: number;
  purchasesCount: number;
}

export const TradeScopeFilterBar: React.FC<TradeScopeFilterBarProps> = ({
  subTab,
  inventoryViewMode,
  onChangeInventoryViewMode,
  stockScopeFilter,
  onChangeStockScopeFilter,
  prodItemClassFilter,
  onChangeProdItemClassFilter,
  products,
  categoryFilter,
  onChangeCategoryFilter,
  productFilterMetadata,
  manufacturerFilter,
  onChangeManufacturerFilter,
  modelFilter,
  onChangeModelFilter,
  minElapsedDaysInput,
  onChangeMinElapsedDaysInput,
  maxElapsedDaysInput,
  onChangeMaxElapsedDaysInput,
  onSelectElapsedPreset,
  hasActiveTradeFilters,
  onClearTradeFilters,
  inventoryRefDate,
  inventoryCount,
  productsCount,
  purchasesCount,
}) => {
  if (subTab !== "inventory" && subTab !== "products" && subTab !== "purchases") {
    return null;
  }

  return (
    <div className="bg-[#f4efe4] dark:bg-slate-900/70 px-3 py-2.5 rounded border border-[#b5a894] dark:border-slate-800 text-xs flex flex-col gap-2">
      <div className="flex flex-wrap items-end justify-between gap-2.5">
        <div className="flex flex-wrap items-end gap-2">
          {subTab === "inventory" && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                조회기준
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChangeInventoryViewMode("SUMMARY")}
                  className={`h-8 px-2.5 rounded border text-xs font-semibold whitespace-nowrap transition ${
                    inventoryViewMode === "SUMMARY"
                      ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                      : "bg-[#ebe5d8] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                  }`}
                >
                  품목별 재고
                </button>
                <button
                  type="button"
                  onClick={() => onChangeInventoryViewMode("LOT")}
                  className={`h-8 px-2.5 rounded border text-xs font-semibold whitespace-nowrap transition ${
                    inventoryViewMode === "LOT"
                      ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                      : "bg-[#ebe5d8] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                  }`}
                >
                  입고건별 재고
                </button>
              </div>
            </div>
          )}

          {subTab === "inventory" && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                재고범위
              </label>
              <select
                value={stockScopeFilter}
                onChange={(e) => onChangeStockScopeFilter(e.target.value as TradeStockScopeFilter)}
                className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-xs font-semibold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              >
                <option value="IN_STOCK">보유재고</option>
                <option value="ALL">전체 품목</option>
                <option value="LOW_STOCK">안전재고 미달</option>
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
              제품유형
            </label>
            <select
              value={prodItemClassFilter}
              onChange={(e) =>
                onChangeProdItemClassFilter(e.target.value as "ALL" | ForkliftItemClass)
              }
              className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-xs font-semibold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              <option value="ALL">전체 ({products.length})</option>
              {FORKLIFT_ITEM_CLASS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} (
                  {
                    products.filter(
                      (p) => normalizeItemClass(p.item_class, p.category) === opt.value
                    ).length
                  }
                  )
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
              세부분류
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => onChangeCategoryFilter(e.target.value)}
              className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-xs font-semibold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              <option value="ALL">전체</option>
              {productFilterMetadata.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 w-40">
            <SearchSelectCombobox
              label="제조사"
              allowFreeText
              size="sm"
              value={manufacturerFilter}
              freeTextValue={manufacturerFilter}
              onFreeTextChange={onChangeManufacturerFilter}
              onChange={(val) => onChangeManufacturerFilter(val)}
              options={productFilterMetadata.manufacturerOptions}
              placeholder="제조사 전체"
            />
          </div>

          <div className="flex flex-col gap-1 w-48">
            <SearchSelectCombobox
              label="모델"
              allowFreeText
              size="sm"
              value={modelFilter}
              freeTextValue={modelFilter}
              onFreeTextChange={onChangeModelFilter}
              onChange={(val) => onChangeModelFilter(val)}
              options={productFilterMetadata.modelOptions}
              placeholder="모델명·규격·품번"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
              입고 경과일수
            </label>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={minElapsedDaysInput}
                  onChange={(e) =>
                    onChangeMinElapsedDaysInput(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="0"
                  className="h-8 w-16 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-right font-mono font-bold text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                <span className="text-[11px] font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                  일 이상
                </span>
              </div>
              <span className="text-[#78716c]">~</span>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={maxElapsedDaysInput}
                  onChange={(e) =>
                    onChangeMaxElapsedDaysInput(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="999"
                  className="h-8 w-16 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-right font-mono font-bold text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                <span className="text-[11px] font-semibold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                  일 이하
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
              경과구간
            </label>
            <div className="flex items-center gap-1 flex-wrap">
              {TRADE_ELAPSED_PRESETS.map((preset) => {
                const active =
                  minElapsedDaysInput === preset.min && maxElapsedDaysInput === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onSelectElapsedPreset(preset.min, preset.max)}
                    className={`h-8 px-2 rounded border text-[11px] font-semibold whitespace-nowrap transition ${
                      active
                        ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                        : "bg-[#ebe5d8] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
              {hasActiveTradeFilters && (
                <button
                  type="button"
                  onClick={onClearTradeFilters}
                  className="h-8 px-2 rounded border border-[#b5a894] bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 text-[11px] font-bold whitespace-nowrap"
                >
                  초기화
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-[11px] font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap self-end">
          {subTab === "inventory"
            ? `기준일 ${inventoryRefDate} | 조회 ${inventoryCount}건`
            : subTab === "products"
              ? `조회 ${productsCount}건`
              : `조회 ${purchasesCount}건`}
        </div>
      </div>
    </div>
  );
};

export interface TradeInventorySubTabProps {
  subTab: TradeSubTabKey;
  inventoryViewMode: TradeInventoryViewMode;
  renderSortTh: (
    label: string,
    key: string,
    align?: "left" | "right" | "center"
  ) => React.JSX.Element;
  sortedInventorySummary: TradeInventorySummaryRow[];
  sortedInventoryLots: TradeInventoryLotRow[];
  products: any[];
  inventoryStats: TradeInventoryStats;
  onQuickPurchaseInbound: (product: any) => void;
  onOpenEditProduct: (product: any) => void;
}

export const TradeInventorySubTab: React.FC<TradeInventorySubTabProps> = ({
  subTab,
  inventoryViewMode,
  renderSortTh,
  sortedInventorySummary,
  sortedInventoryLots,
  products,
  inventoryStats,
  onQuickPurchaseInbound,
  onOpenEditProduct,
}) => {
  if (subTab !== "inventory") return null;

  return (
    <>
      <div className="flex-1 overflow-auto">
        {inventoryViewMode === "SUMMARY" ? (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">관리</th>
                {renderSortTh("SKU 코드", "sku_code")}
                {renderSortTh("제품유형", "item_class")}
                {renderSortTh("세부분류", "category")}
                {renderSortTh("제조사", "manufacturer")}
                {renderSortTh("모델 / 상품명", "name")}
                {renderSortTh("규격 / 품번", "spec")}
                {renderSortTh("최선입 입고일", "oldest_inbound_date", "center")}
                {renderSortTh("최근 입고일", "latest_inbound_date", "center")}
                {renderSortTh("경과일수", "elapsed_days", "right")}
                {renderSortTh("현재재고", "current_stock", "right")}
                {renderSortTh("안전재고", "safety_stock", "right")}
                {renderSortTh("기준매입단가", "standard_cost", "right")}
                {renderSortTh("재고자산액", "inventory_value", "right")}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedInventorySummary.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="py-10 text-center text-[#78716c] dark:text-slate-500"
                  >
                    조회 조건에 해당하는 유통재고가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedInventorySummary.map((p) => {
                  const ic = normalizeItemClass(p.item_class, p.category);
                  const stock = Number(p.current_stock || 0);
                  const safety = Number(p.safety_stock || 0);
                  const isLowStock = safety > 0 && stock <= safety;
                  const elapsed = p.elapsed_days;
                  const tier = (p.aging_tier || "NONE") as AgingTier;
                  const agingBadge = getTradeAgingBadgeClass(tier);
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onQuickPurchaseInbound(p)}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] whitespace-nowrap"
                          >
                            입고
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenEditProduct(p)}
                            className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] whitespace-nowrap"
                          >
                            수정
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-[#334155] dark:text-slate-300">
                        {p.sku_code}
                      </td>
                      <td className="py-2 px-3">{getItemClassLabel(ic)}</td>
                      <td className="py-2 px-3 text-[#334155] dark:text-slate-300">
                        {p.category || "-"}
                      </td>
                      <td className="py-2 px-3 font-semibold text-[#0f172a] dark:text-slate-200">
                        {p.manufacturer || "-"}
                      </td>
                      <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-white">
                        <div>{p.name}</div>
                        {p.model_name && p.model_name !== p.name && (
                          <div className="text-[10px] font-normal text-[#57534e] dark:text-slate-400">
                            모델: {p.model_name}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[#57534e] dark:text-slate-400">
                        <span>{p.spec || "-"}</span>
                        {p.part_no && (
                          <span className="ml-1 font-mono text-[10px]">[{p.part_no}]</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-[#0f172a] dark:text-slate-200">
                        {p.oldest_inbound_date || "-"}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-[#57534e] dark:text-slate-400">
                        {p.latest_inbound_date || "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {elapsed !== null && elapsed !== undefined ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-bold text-[11px] ${agingBadge}`}
                          >
                            {formatErpNumber(elapsed)}일
                          </span>
                        ) : (
                          <span className="text-[#78716c]">-</span>
                        )}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono font-bold ${
                          isLowStock
                            ? "text-rose-700 dark:text-rose-400"
                            : "text-[#0f172a] dark:text-slate-100"
                        }`}
                      >
                        {formatErpQty(stock, p.unit)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#57534e] dark:text-slate-400">
                        {formatErpQty(safety, p.unit)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#334155] dark:text-slate-300">
                        {formatErpCurrency(Number(p.standard_cost || 0))}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#1d4ed8] dark:text-blue-400">
                        {formatErpCurrency(Number(p.inventory_value || 0))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">관리</th>
                {renderSortTh("입고일", "inboundDate", "center")}
                {renderSortTh("경과일수", "elapsedDays", "right")}
                {renderSortTh("입고번호 / 구분", "lotRefNo")}
                {renderSortTh("매입처", "vendorName")}
                {renderSortTh("제품유형", "itemClass")}
                {renderSortTh("제조사", "manufacturer")}
                {renderSortTh("모델 / 상품명", "productName")}
                {renderSortTh("규격 / 품번", "spec")}
                {renderSortTh("잔여수량", "remainingQty", "right")}
                {renderSortTh("입고수량", "originalQty", "right")}
                {renderSortTh("입고단가", "unitCost", "right")}
                {renderSortTh("로트 자산액", "stockValue", "right")}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedInventoryLots.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="py-10 text-center text-[#78716c] dark:text-slate-500"
                  >
                    조회 조건에 해당하는 입고 로트가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedInventoryLots.map((lot) => {
                  const agingBadge = getTradeAgingBadgeClass(lot.agingTier);
                  const targetProd = products.find(
                    (p) => Number(p.id) === Number(lot.productId)
                  );
                  return (
                    <tr
                      key={lot.lotKey}
                      className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {targetProd && (
                          <button
                            type="button"
                            onClick={() => onOpenEditProduct(targetProd)}
                            className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px]"
                          >
                            상품수정
                          </button>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-[#0f172a] dark:text-slate-100">
                        {lot.inboundDate}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-bold text-[11px] ${agingBadge}`}
                        >
                          {formatErpNumber(lot.elapsedDays)}일
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[#1d4ed8] dark:text-blue-400">
                        {lot.lotRefNo}
                      </td>
                      <td className="py-2 px-3 text-[#334155] dark:text-slate-300">
                        {lot.vendorName || "-"}
                      </td>
                      <td className="py-2 px-3">{lot.itemClassLabel}</td>
                      <td className="py-2 px-3 font-semibold">{lot.manufacturer || "-"}</td>
                      <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-white">
                        {lot.productName}
                      </td>
                      <td className="py-2 px-3 text-[#57534e] dark:text-slate-400">
                        <span>{lot.spec || "-"}</span>
                        {lot.partNo && (
                          <span className="ml-1 font-mono text-[10px]">[{lot.partNo}]</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#0f172a] dark:text-white">
                        {formatErpQty(lot.remainingQty, lot.unit)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#57534e] dark:text-slate-400">
                        {formatErpQty(lot.originalQty, lot.unit)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#334155] dark:text-slate-300">
                        {formatErpCurrency(lot.unitCost)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#1d4ed8] dark:text-blue-400">
                        {formatErpCurrency(lot.stockValue)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom-Right Terminal Summary Strip (헌장 3.5④) */}
      <div className="px-3 py-2 border-t border-[#b5a894] dark:border-slate-800 bg-[#ebe5d8] dark:bg-slate-950 flex flex-wrap items-center justify-end gap-4 text-xs font-mono shrink-0">
        <span className="whitespace-nowrap">
          대상 <strong>{formatErpNumber(inventoryStats.rowCount)}</strong>
          {inventoryViewMode === "SUMMARY" ? "종" : "건"}
        </span>
        <span className="whitespace-nowrap">
          재고수량 합계 <strong>{formatErpNumber(inventoryStats.totalQty)}</strong>
        </span>
        <span className="whitespace-nowrap text-emerald-700 dark:text-emerald-400">
          {AGING_TIER_LABELS.NORMAL} <strong>{inventoryStats.tierNormal}</strong>
        </span>
        <span className="whitespace-nowrap text-blue-700 dark:text-blue-400">
          {AGING_TIER_LABELS.WATCH} <strong>{inventoryStats.tierWatch}</strong>
        </span>
        <span className="whitespace-nowrap text-amber-700 dark:text-amber-400">
          {AGING_TIER_LABELS.CAUTION} <strong>{inventoryStats.tierCaution}</strong>
        </span>
        <span className="whitespace-nowrap text-rose-700 dark:text-rose-400">
          {AGING_TIER_LABELS.LONG_TERM} <strong>{inventoryStats.tierLong}</strong>
        </span>
        <span className="whitespace-nowrap font-bold text-[#0f172a] dark:text-white">
          재고자산 합계 <strong>{formatErpCurrency(inventoryStats.totalValue)}</strong>
        </span>
      </div>
    </>
  );
};

export interface TradeProductsSubTabProps {
  subTab: TradeSubTabKey;
  renderSortTh: (
    label: string,
    key: string,
    align?: "left" | "right" | "center"
  ) => React.JSX.Element;
  sortedProducts: TradeInventorySummaryRow[];
  onOpenEditProduct: (product: any) => void;
}

export const TradeProductsSubTab: React.FC<TradeProductsSubTabProps> = ({
  subTab,
  renderSortTh,
  sortedProducts,
  onOpenEditProduct,
}) => {
  if (subTab !== "products") return null;

  return (
    <table className="w-full text-left text-xs whitespace-nowrap">
      <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
        <tr>
          <th className="py-2.5 px-3 text-center">관리</th>
          {renderSortTh("품목구분", "item_class")}
          {renderSortTh("상품명", "name")}
          {renderSortTh("제조사 / 품번", "manufacturer")}
          {renderSortTh("분류", "category")}
          {renderSortTh("규격 / 제원", "spec")}
          {renderSortTh("단위", "unit", "center")}
          {renderSortTh("현재재고", "current_stock", "right")}
          {renderSortTh("최선입 입고일", "oldest_inbound_date", "center")}
          {renderSortTh("경과일수", "elapsed_days", "right")}
          {renderSortTh("기준매입단가", "standard_cost", "right")}
          {renderSortTh("기준판매단가", "standard_price", "right")}
          {renderSortTh("예상마진", "margin", "right")}
          <th className="py-2.5 px-3 text-center">상태</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
        {sortedProducts.length === 0 ? (
          <tr>
            <td colSpan={14} className="py-8 text-center text-[#78716c] dark:text-slate-500">
              등록된 판매 상품이 없습니다.
            </td>
          </tr>
        ) : (
          sortedProducts.map((p) => {
            const ic = normalizeItemClass(p.item_class, p.category);
            const cost = Number(p.standard_cost || 0);
            const price = Number(p.standard_price || 0);
            const margin = price - cost;
            const marginRate = price > 0 ? ((margin / price) * 100).toFixed(1) : "0.0";
            const badgeStyle = getTradeItemClassBadgeStyle(ic);
            return (
              <tr
                key={p.id}
                className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition"
              >
                <td className="py-2 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => onOpenEditProduct(p)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 border border-blue-700 text-white font-bold text-[11px] shadow-xs transition"
                  >
                    <Edit className="w-3 h-3" />
                    <span>수정</span>
                  </button>
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${badgeStyle}`}
                  >
                    {getItemClassLabel(ic)}
                  </span>
                </td>
                <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100">
                  {p.name}
                </td>
                <td className="py-2 px-3 text-[#334155] dark:text-slate-300">
                  <span>{p.manufacturer || "-"}</span>
                  {p.part_no && (
                    <span className="ml-1.5 font-mono text-[10px] text-[#57534e] dark:text-slate-400">
                      [{p.part_no}]
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-[#334155] dark:text-slate-300">
                  {p.category}
                </td>
                <td className="py-2 px-3 text-[#57534e] dark:text-slate-400">
                  <div>{p.spec || "-"}</div>
                  {ic === "OPTION" &&
                    (Number(p.install_fee || 0) > 0 ||
                      Number(p.addon_monthly_rate || 0) > 0) && (
                      <div className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                        공임 {formatErpCurrency(Number(p.install_fee || 0))} / 렌탈월 +
                        {formatErpCurrency(Number(p.addon_monthly_rate || 0))}
                      </div>
                    )}
                  {ic === "FORKLIFT" && Number(p.warranty_months || 0) > 0 && (
                    <div className="text-[10px] text-blue-700 dark:text-blue-300 font-mono">
                      보증 {p.warranty_months}개월 /{" "}
                      {formatErpNumber(p.warranty_hours || 0)}hr
                    </div>
                  )}
                </td>
                <td className="py-2 px-3 text-center text-[#57534e] dark:text-slate-400">
                  {p.unit}
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-[#0f172a] dark:text-slate-100">
                  {formatErpQty(Number(p.current_stock || 0), p.unit)}
                </td>
                <td className="py-2 px-3 text-center font-mono text-[#334155] dark:text-slate-300">
                  {p.oldest_inbound_date || "-"}
                </td>
                <td className="py-2 px-3 text-right font-mono text-[#334155] dark:text-slate-300">
                  {p.elapsed_days !== null && p.elapsed_days !== undefined
                    ? `${formatErpNumber(p.elapsed_days)}일`
                    : "-"}
                </td>
                <td className="py-2 px-3 text-right font-mono text-[#334155] dark:text-slate-300">
                  {formatErpCurrency(cost)}
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-[#0f172a] dark:text-slate-100">
                  {formatErpCurrency(price)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400">
                  {formatErpCurrency(margin)} ({marginRate}%)
                </td>
                <td className="py-2 px-3 text-center">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      p.status === "ACTIVE"
                        ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                        : "bg-[#e2dbcd] text-[#57534e] dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {p.status === "ACTIVE" ? "판매중" : "단종"}
                  </span>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
};

export interface TradeDocViewerModalProps {
  activeDocViewer: TradeDocViewerState | null;
  onClose: () => void;
}

export const TradeDocViewerModal: React.FC<TradeDocViewerModalProps> = ({
  activeDocViewer,
  onClose,
}) => {
  if (!activeDocViewer) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-700 rounded shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{activeDocViewer.title}</h3>
            <p className="text-[11px] text-slate-400">
              {activeDocViewer.customerName} | {activeDocViewer.fileName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={activeDocViewer.url}
              download={activeDocViewer.fileName}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>다운로드</span>
            </a>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-slate-950 overflow-auto flex items-center justify-center p-4">
          {activeDocViewer.url.startsWith("data:image/") ? (
            <img
              src={activeDocViewer.url}
              alt={activeDocViewer.fileName}
              className="max-w-full max-h-full object-contain rounded shadow"
            />
          ) : (
            <iframe
              src={activeDocViewer.url}
              title={activeDocViewer.fileName}
              className="w-full h-full border-0 rounded bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
};
