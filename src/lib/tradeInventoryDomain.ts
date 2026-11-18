import { matchHangulAny } from "@/lib/erpFormat";
import {
  ForkliftItemClass,
  ForkliftSpecData,
  getItemClassLabel,
  normalizeItemClass,
  parseForkliftSpecData,
} from "@/lib/forkliftDomain";

export type AgingTier = "NONE" | "NORMAL" | "WATCH" | "CAUTION" | "LONG_TERM";

export const AGING_TIER_LABELS: Record<AgingTier, string> = {
  NONE: "재고없음",
  NORMAL: "30일 이하",
  WATCH: "31~60일",
  CAUTION: "61~90일",
  LONG_TERM: "90일 초과",
};

export interface TradeInboundProductInput {
  id: number;
  sku_code?: string;
  name: string;
  category?: string;
  spec?: string;
  unit?: string;
  standard_cost?: number;
  standard_price?: number;
  safety_stock?: number;
  current_stock?: number;
  status?: string;
  memo?: string;
  item_class?: string;
  manufacturer?: string;
  part_no?: string;
  spec_data?: ForkliftSpecData | unknown;
  inbound_date?: string | null;
  created_date?: string | null;
}

export interface TradeInboundPurchaseEventInput {
  id: number;
  purchaseNo?: string;
  purchaseDate?: string | null;
  vendorName?: string;
  productId: number;
  qty: number;
  unitCost?: number;
  status?: string;
  memo?: string;
}

export interface TradeYardReceiptEventInput {
  id: number;
  movementDate?: string | null;
  productId: number;
  qty: number;
  actorName?: string;
  note?: string;
}

export interface TradeInventoryLotRow {
  lotKey: string;
  productId: number;
  skuCode: string;
  productName: string;
  modelName: string;
  itemClass: ForkliftItemClass;
  itemClassLabel: string;
  category: string;
  manufacturer: string;
  partNo: string;
  spec: string;
  unit: string;
  lotSource: "PURCHASE" | "YARD_RECEIPT" | "INITIAL";
  lotRefNo: string;
  vendorName: string;
  inboundDate: string;
  elapsedDays: number;
  agingTier: AgingTier;
  originalQty: number;
  remainingQty: number;
  unitCost: number;
  stockValue: number;
  safetyStock: number;
  totalProductStock: number;
}

export interface TradeProductInventorySummary {
  productId: number;
  modelName: string;
  itemClass: ForkliftItemClass;
  inboundDate: string | null;
  oldestInboundDate: string | null;
  latestInboundDate: string | null;
  elapsedDays: number | null;
  minElapsedDays: number | null;
  weightedAvgElapsedDays: number | null;
  activeLotCount: number;
  inventoryValue: number;
  agingTier: AgingTier;
}

export interface TradeInventoryFilterCriteria {
  minElapsedDaysText?: string;
  maxElapsedDaysText?: string;
  itemClass?: string;
  category?: string;
  manufacturer?: string;
  modelKeyword?: string;
  stockScope?: "IN_STOCK" | "ALL" | "LOW_STOCK";
  searchTerm?: string;
}

const MS_PER_DAY = 86_400_000;

export function getTodayKstDateString(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function normalizeDateStr(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function parseUtcDayMs(dateStr: string): number | null {
  const norm = normalizeDateStr(dateStr);
  if (!norm) return null;
  const [y, m, d] = norm.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * 입고일(YYYY-MM-DD) 대비 기준일 경과일수 계산 (KST 날짜 자정 기준, 음수 방지)
 */
export function computeElapsedDays(
  inboundDate: string | null | undefined,
  referenceDate: string = getTodayKstDateString()
): number | null {
  if (!inboundDate) return null;
  const inMs = parseUtcDayMs(inboundDate);
  const refMs = parseUtcDayMs(referenceDate);
  if (inMs === null || refMs === null) return null;
  const diff = Math.floor((refMs - inMs) / MS_PER_DAY);
  return diff < 0 ? 0 : diff;
}

export function resolveAgingTier(elapsedDays: number | null, hasStock = true): AgingTier {
  if (!hasStock || elapsedDays === null) return "NONE";
  if (elapsedDays <= 30) return "NORMAL";
  if (elapsedDays <= 60) return "WATCH";
  if (elapsedDays <= 90) return "CAUTION";
  return "LONG_TERM";
}

export function extractTradeProductModelName(product: {
  name?: string | null;
  spec?: string | null;
  spec_data?: unknown;
  specData?: unknown;
}): string {
  const sd = parseForkliftSpecData(product.spec_data ?? product.specData) as ForkliftSpecData & {
    modelSeries?: string;
    model?: string;
  };
  const explicitModel = String(sd?.modelSeries || sd?.model || "").trim();
  if (explicitModel) return explicitModel;
  return String(product.name || "").trim();
}

export function parseDaysBoundInput(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).replace(/[^0-9]/g, "").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

interface InternalInboundEvent {
  sortId: number;
  inboundDate: string;
  qty: number;
  unitCost: number;
  lotSource: "PURCHASE" | "YARD_RECEIPT";
  lotRefNo: string;
  vendorName: string;
}

/**
 * Reverse-FIFO(선입선출 잔여 로트 역산) 기반 유통재고 경과일수 계산
 * - 모든 보유재고 품목(current_stock > 0)에 대해 sum(lot.remainingQty) === current_stock 보장
 */
export function buildTradeInventoryAging(params: {
  products: TradeInboundProductInput[];
  purchases: TradeInboundPurchaseEventInput[];
  yardReceipts?: TradeYardReceiptEventInput[];
  referenceDate?: string;
}): {
  referenceDate: string;
  lots: TradeInventoryLotRow[];
  productSummaries: Record<number, TradeProductInventorySummary>;
} {
  const referenceDate = normalizeDateStr(params.referenceDate) || getTodayKstDateString();
  const eventsByProduct = new Map<number, InternalInboundEvent[]>();

  for (const po of params.purchases || []) {
    if (String(po.status || "").toUpperCase() === "CANCELLED") continue;
    const qty = Number(po.qty || 0);
    const pid = Number(po.productId);
    const pDate = normalizeDateStr(po.purchaseDate);
    if (!pid || qty <= 0 || !pDate) continue;
    const list = eventsByProduct.get(pid) || [];
    list.push({
      sortId: Number(po.id || 0),
      inboundDate: pDate,
      qty,
      unitCost: Number(po.unitCost || 0),
      lotSource: "PURCHASE",
      lotRefNo: po.purchaseNo || `PO-${po.id}`,
      vendorName: po.vendorName || "",
    });
    eventsByProduct.set(pid, list);
  }

  for (const yr of params.yardReceipts || []) {
    const qty = Number(yr.qty || 0);
    const pid = Number(yr.productId);
    const mDate = normalizeDateStr(yr.movementDate);
    if (!pid || qty <= 0 || !mDate) continue;
    const list = eventsByProduct.get(pid) || [];
    list.push({
      sortId: Number(yr.id || 0),
      inboundDate: mDate,
      qty,
      unitCost: -1, // fill from product standard_cost
      lotSource: "YARD_RECEIPT",
      lotRefNo: `YARD-${yr.id}`,
      vendorName: yr.actorName ? `주기장(${yr.actorName})` : "주기장입고",
    });
    eventsByProduct.set(pid, list);
  }

  const allLots: TradeInventoryLotRow[] = [];
  const productSummaries: Record<number, TradeProductInventorySummary> = {};

  for (const prod of params.products || []) {
    const pid = Number(prod.id);
    const stock = Math.max(0, Number(prod.current_stock || 0));
    const stdCost = Number(prod.standard_cost || 0);
    const safetyStock = Number(prod.safety_stock || 0);
    const itemClass = normalizeItemClass(prod.item_class, prod.category);
    const itemClassLabel = getItemClassLabel(itemClass);
    const modelName = extractTradeProductModelName(prod);
    const explicitInboundDate = normalizeDateStr(prod.inbound_date);
    const fallbackCreatedDate = normalizeDateStr(prod.created_date) || referenceDate;

    const rawEvents = (eventsByProduct.get(pid) || []).slice().sort((a, b) => {
      if (a.inboundDate !== b.inboundDate) {
        return b.inboundDate.localeCompare(a.inboundDate);
      }
      return b.sortId - a.sortId;
    });

    if (stock <= 0) {
      const lastKnownDate = explicitInboundDate || rawEvents[0]?.inboundDate || null;
      productSummaries[pid] = {
        productId: pid,
        modelName,
        itemClass,
        inboundDate: explicitInboundDate,
        oldestInboundDate: lastKnownDate,
        latestInboundDate: rawEvents[0]?.inboundDate || explicitInboundDate || null,
        elapsedDays: null,
        minElapsedDays: null,
        weightedAvgElapsedDays: null,
        activeLotCount: 0,
        inventoryValue: 0,
        agingTier: "NONE",
      };
      continue;
    }

    let unallocated = stock;
    const productLots: TradeInventoryLotRow[] = [];

    for (const ev of rawEvents) {
      if (unallocated <= 0) break;
      const alloc = Math.min(unallocated, ev.qty);
      if (alloc <= 0) continue;
      const elapsed = computeElapsedDays(ev.inboundDate, referenceDate) ?? 0;
      const uCost = ev.unitCost >= 0 ? ev.unitCost : stdCost;
      productLots.push({
        lotKey: `${pid}-${ev.lotSource}-${ev.sortId}-${ev.inboundDate}`,
        productId: pid,
        skuCode: prod.sku_code || "",
        productName: prod.name || "",
        modelName,
        itemClass,
        itemClassLabel,
        category: prod.category || "",
        manufacturer: prod.manufacturer || "",
        partNo: prod.part_no || "",
        spec: prod.spec || "",
        unit: prod.unit || "EA",
        lotSource: ev.lotSource,
        lotRefNo: ev.lotRefNo,
        vendorName: ev.vendorName,
        inboundDate: ev.inboundDate,
        elapsedDays: elapsed,
        agingTier: resolveAgingTier(elapsed, true),
        originalQty: ev.qty,
        remainingQty: alloc,
        unitCost: uCost,
        stockValue: Math.round(alloc * uCost),
        safetyStock,
        totalProductStock: stock,
      });
      unallocated = Number((unallocated - alloc).toFixed(4));
    }

    // 구매전표 없이 기초재고로 남은 수량은 explicit inbound_date 또는 created_at 사용
    if (unallocated > 0) {
      const initDate = explicitInboundDate || fallbackCreatedDate;
      const elapsed = computeElapsedDays(initDate, referenceDate) ?? 0;
      productLots.push({
        lotKey: `${pid}-INITIAL`,
        productId: pid,
        skuCode: prod.sku_code || "",
        productName: prod.name || "",
        modelName,
        itemClass,
        itemClassLabel,
        category: prod.category || "",
        manufacturer: prod.manufacturer || "",
        partNo: prod.part_no || "",
        spec: prod.spec || "",
        unit: prod.unit || "EA",
        lotSource: "INITIAL",
        lotRefNo: "기초재고",
        vendorName: "자사기초",
        inboundDate: initDate,
        elapsedDays: elapsed,
        agingTier: resolveAgingTier(elapsed, true),
        originalQty: unallocated,
        remainingQty: unallocated,
        unitCost: stdCost,
        stockValue: Math.round(unallocated * stdCost),
        safetyStock,
        totalProductStock: stock,
      });
    }

    // 최선입(가장 오래된 입고일) ➔ 최근순 정렬
    productLots.sort((a, b) => a.inboundDate.localeCompare(b.inboundDate));

    let oldestDate = productLots[0]?.inboundDate || explicitInboundDate || fallbackCreatedDate;
    let latestDate = productLots[productLots.length - 1]?.inboundDate || oldestDate;
    let maxElapsed = 0;
    let minElapsed = Number.MAX_SAFE_INTEGER;
    let weightedDaysSum = 0;
    let totalLotQty = 0;
    let totalValue = 0;

    for (const lot of productLots) {
      if (lot.inboundDate < oldestDate) oldestDate = lot.inboundDate;
      if (lot.inboundDate > latestDate) latestDate = lot.inboundDate;
      if (lot.elapsedDays > maxElapsed) maxElapsed = lot.elapsedDays;
      if (lot.elapsedDays < minElapsed) minElapsed = lot.elapsedDays;
      weightedDaysSum += lot.remainingQty * lot.elapsedDays;
      totalLotQty += lot.remainingQty;
      totalValue += lot.stockValue;
    }

    allLots.push(...productLots);
    productSummaries[pid] = {
      productId: pid,
      modelName,
      itemClass,
      inboundDate: explicitInboundDate,
      oldestInboundDate: oldestDate,
      latestInboundDate: latestDate,
      elapsedDays: maxElapsed,
      minElapsedDays: minElapsed === Number.MAX_SAFE_INTEGER ? maxElapsed : minElapsed,
      weightedAvgElapsedDays:
        totalLotQty > 0 ? Math.round(weightedDaysSum / totalLotQty) : maxElapsed,
      activeLotCount: productLots.length,
      inventoryValue: Math.round(totalValue),
      agingTier: resolveAgingTier(maxElapsed, true),
    };
  }

  return {
    referenceDate,
    lots: allLots,
    productSummaries,
  };
}

export interface TradeFilterableRow {
  skuCode?: string;
  sku_code?: string;
  name?: string;
  productName?: string;
  modelName?: string;
  model_name?: string;
  itemClass?: string;
  item_class?: string;
  category?: string;
  manufacturer?: string;
  partNo?: string;
  part_no?: string;
  spec?: string;
  specData?: unknown;
  spec_data?: unknown;
  vendorName?: string;
  lotRefNo?: string;
  purchaseNo?: string;
  elapsedDays?: number | null;
  elapsed_days?: number | null;
  currentStock?: number;
  current_stock?: number;
  remainingQty?: number;
  safetyStock?: number;
  safety_stock?: number;
}

export function matchesTradeElapsedDaysRange(
  elapsedDays: number | null | undefined,
  minDays: number | null,
  maxDays: number | null
): boolean {
  if (minDays === null && maxDays === null) return true;
  if (elapsedDays === null || elapsedDays === undefined || !Number.isFinite(Number(elapsedDays))) {
    return false;
  }
  const d = Number(elapsedDays);
  if (minDays !== null && d < minDays) return false;
  if (maxDays !== null && d > maxDays) return false;
  return true;
}

export function filterTradeInventoryItems<T extends TradeFilterableRow>(
  items: T[],
  criteria: TradeInventoryFilterCriteria
): T[] {
  const minDays = parseDaysBoundInput(criteria.minElapsedDaysText);
  const maxDays = parseDaysBoundInput(criteria.maxElapsedDaysText);
  const targetClass = String(criteria.itemClass || "ALL").trim().toUpperCase();
  const targetCategory = String(criteria.category || "ALL").trim();
  const targetMfg = String(criteria.manufacturer || "").trim();
  const targetModel = String(criteria.modelKeyword || "").trim();
  const stockScope = criteria.stockScope || "ALL";
  const searchTerm = String(criteria.searchTerm || "").trim();

  return (items || []).filter((item) => {
    const cls = normalizeItemClass(item.itemClass ?? item.item_class, item.category);
    const stock = Number(
      item.remainingQty !== undefined
        ? item.remainingQty
        : item.currentStock !== undefined
          ? item.currentStock
          : item.current_stock ?? 0
    );
    const safety = Number(item.safetyStock ?? item.safety_stock ?? 0);
    const elapsed =
      item.elapsedDays !== undefined ? item.elapsedDays : item.elapsed_days ?? null;
    const cat = String(item.category || "").trim();
    const mfg = String(item.manufacturer || "").trim();
    const pName = String(item.productName ?? item.name ?? "").trim();
    const sku = String(item.skuCode ?? item.sku_code ?? "").trim();
    const partNo = String(item.partNo ?? item.part_no ?? "").trim();
    const spec = String(item.spec || "").trim();
    const model =
      String(item.modelName ?? item.model_name ?? "").trim() ||
      extractTradeProductModelName({
        name: pName,
        spec,
        spec_data: item.spec_data ?? item.specData,
      });

    if (stockScope === "IN_STOCK" && stock <= 0) return false;
    if (stockScope === "LOW_STOCK" && !(safety > 0 && stock <= safety)) return false;

    if (targetClass !== "ALL" && cls !== targetClass) return false;
    if (targetCategory && targetCategory !== "ALL" && cat !== targetCategory) return false;

    if (targetMfg && !matchHangulAny([mfg], targetMfg)) return false;

    if (targetModel && !matchHangulAny([model, pName, spec, partNo, sku], targetModel)) {
      return false;
    }

    if (!matchesTradeElapsedDaysRange(elapsed, minDays, maxDays)) return false;

    if (
      searchTerm &&
      !matchHangulAny(
        [sku, pName, model, cls, cat, mfg, partNo, spec, item.vendorName, item.lotRefNo, item.purchaseNo],
        searchTerm
      )
    ) {
      return false;
    }

    return true;
  });
}
