import {
  cleanErpNumber,
  formatErpCurrency,
  formatErpInputNumber,
  sortErpItems,
  toErpInputString,
  type SortDirection,
} from "@/lib/erpFormat";
import {
  resolveContractItemTemplate,
  resolveContractTaxItemsTemplate,
} from "@/lib/erpContractTemplate";
import { matchHangulAny } from "@/lib/hangulSearch";
import {
  getItemClassLabel,
  normalizeItemClass,
  summarizeForkliftSpec,
  type AttachedForkliftOption,
  type ForkliftItemClass,
  type ForkliftSpecData,
} from "@/lib/forkliftDomain";
import {
  filterTradeInventoryItems,
  getTodayKstDateString,
  type AgingTier,
  type TradeFilterableRow,
  type TradeInventoryLotRow,
} from "@/lib/tradeInventoryDomain";
import { getPartnerTradeBlockInfo } from "@/lib/partnerStatusClient";
import type { BuyerTaxSpec } from "../ContractTaxInvoiceSection";
import type { CatalogOptionItem } from "../ForkliftOptionAttachPanel";
import type { SearchSelectOption } from "../SearchSelectCombobox";

export type TradeSubTabKey =
  | "inventory"
  | "products"
  | "purchases"
  | "sales"
  | "billings"
  | "settlement";

export type TradeEntityFilter = "ALL" | "CORP" | "INDIVIDUAL";
export type TradeInventoryViewMode = "SUMMARY" | "LOT";
export type TradeStockScopeFilter = "IN_STOCK" | "ALL" | "LOW_STOCK";
export type TradeSaleCategory = "FORKLIFT_SALE" | "PART_SALE" | "GENERAL";

export interface TradeDocViewerState {
  title: string;
  customerName: string;
  url: string;
  fileName: string;
}

export interface TradeSaleItemDraft {
  productId: string;
  qty: string;
  unitPrice: string;
  vatAmount: string;
}

export interface TradePurchaseSplitRow {
  qty: number;
  unitCost: number;
  rowTotal: number;
  memo: string;
}

export interface TradePurchaseSplitPreview {
  qty: number;
  supplyTotal: number;
  vatTotal: number;
  grandTotal: number;
  hasRemainder: boolean;
  rows: TradePurchaseSplitRow[];
}

export interface TradeInventorySummaryRow extends TradeFilterableRow {
  id: number;
  sku_code?: string;
  skuCode?: string;
  sku?: string;
  name: string;
  model_name?: string;
  item_class?: string;
  category?: string;
  manufacturer?: string;
  part_no?: string;
  spec?: string;
  spec_data?: ForkliftSpecData | unknown;
  unit?: string;
  standard_cost?: number;
  standard_price?: number;
  install_fee?: number;
  addon_monthly_rate?: number;
  addon_daily_rate?: number;
  warranty_months?: number;
  warranty_hours?: number;
  safety_stock?: number;
  current_stock?: number;
  inbound_date?: string | null;
  oldest_inbound_date?: string | null;
  latest_inbound_date?: string | null;
  created_date?: string | null;
  elapsed_days?: number | null;
  aging_tier?: AgingTier;
  inventory_value?: number;
  status?: string;
  margin: number;
  [key: string]: any;
}

export interface TradeInventoryStats {
  rowCount: number;
  totalQty: number;
  totalValue: number;
  tierNormal: number;
  tierWatch: number;
  tierCaution: number;
  tierLong: number;
}

export interface TradeProductFilterMetadata {
  categories: string[];
  manufacturerOptions: SearchSelectOption[];
  modelOptions: SearchSelectOption[];
}

export interface TradeFilterCriteriaInput {
  minElapsedDaysInput: string;
  maxElapsedDaysInput: string;
  prodItemClassFilter: "ALL" | ForkliftItemClass;
  categoryFilter: string;
  manufacturerFilter: string;
  modelFilter: string;
  stockScopeFilter: TradeStockScopeFilter;
  searchTerm: string;
  sortKey: string;
  sortDir: SortDirection;
}

export const TRADE_ELAPSED_PRESETS: ReadonlyArray<{
  label: string;
  min: string;
  max: string;
}> = [
  { label: "전체", min: "", max: "" },
  { label: "30일 이하", min: "", max: "30" },
  { label: "30일 이상", min: "30", max: "" },
  { label: "60일 이상", min: "60", max: "" },
  { label: "90일 이상", min: "90", max: "" },
];

export async function requestTradeJson<T = any>(
  url: string,
  options: { method: "POST" | "PUT" | "DELETE"; body?: unknown; fallbackError: string }
): Promise<T> {
  const res = await fetch(url, {
    method: options.method,
    ...(options.body !== undefined
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(options.body) }
      : {}),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || options.fallbackError);
  }
  return data as T;
}

export function getTradeAgingBadgeClass(tier: AgingTier): string {
  if (tier === "LONG_TERM") return "bg-rose-500/15 text-rose-700 border-rose-500/40 dark:text-rose-300";
  if (tier === "CAUTION") return "bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-300";
  if (tier === "WATCH") return "bg-blue-500/15 text-blue-700 border-blue-500/40 dark:text-blue-300";
  if (tier === "NORMAL") return "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-300";
  return "bg-[#e2dbcd] text-[#64748b] border-[#b5a894] dark:bg-slate-800 dark:text-slate-400";
}

export function getTradeItemClassBadgeStyle(ic: ForkliftItemClass): string {
  if (ic === "FORKLIFT") return "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300";
  if (ic === "OPTION") return "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300";
  if (ic === "PART") return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300";
  return "bg-[#e2dbcd] text-[#334155] border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
}

function distributeSupplyIntoIntegerUnitRows(
  qty: number,
  supplyTotal: number,
  zeroRemainderMemo: string,
  primarySplitLabel: string,
  remainderSplitLabel: string
): { hasRemainder: boolean; rows: TradePurchaseSplitRow[] } {
  const baseUnit = Math.floor(supplyTotal / qty);
  const remainder = supplyTotal - baseUnit * qty;
  const rows: TradePurchaseSplitRow[] = [];

  if (remainder === 0) {
    rows.push({ qty, unitCost: baseUnit, rowTotal: qty * baseUnit, memo: zeroRemainderMemo });
  } else {
    const normalQty = qty - remainder;
    if (normalQty > 0) {
      rows.push({
        qty: normalQty,
        unitCost: baseUnit,
        rowTotal: normalQty * baseUnit,
        memo: `${primarySplitLabel} (${normalQty}개 × ₩${baseUnit.toLocaleString()})`,
      });
    }
    rows.push({
      qty: remainder,
      unitCost: baseUnit + 1,
      rowTotal: remainder * (baseUnit + 1),
      memo: `${remainderSplitLabel} (${remainder}개 × ₩${(baseUnit + 1).toLocaleString()})`,
    });
  }

  return { hasRemainder: remainder > 0, rows };
}

/**
 * 구매입고 수량분할 정수단가 자동 산출 (소수점 단가 발생 시 수량을 분할하여 정수 단가로 맞춤)
 */
export function splitPurchaseIntoIntegerUnitRows(params: {
  inputMode: "UNIT" | "TOTAL";
  vatIncluded: boolean;
  qtyInput: string | number;
  unitCostInput: string | number;
  totalInput: string | number;
}): TradePurchaseSplitPreview {
  const qty = Math.max(0, Math.round(cleanErpNumber(params.qtyInput)));
  if (qty <= 0) {
    return { qty: 0, supplyTotal: 0, vatTotal: 0, grandTotal: 0, hasRemainder: false, rows: [] };
  }

  if (params.inputMode === "UNIT") {
    const unitRaw = cleanErpNumber(params.unitCostInput);
    const totalSupply = Math.round(qty * unitRaw);
    const { hasRemainder, rows } = distributeSupplyIntoIntegerUnitRows(
      qty,
      totalSupply,
      "",
      "단가 정수화 수량분할",
      "단가 정수화 수량분할"
    );
    const vatTotal = Math.round(totalSupply * 0.1);
    return { qty, supplyTotal: totalSupply, vatTotal, grandTotal: totalSupply + vatTotal, hasRemainder, rows };
  }

  const rawTotal = Math.max(0, Math.round(cleanErpNumber(params.totalInput)));
  const supplyTotal = params.vatIncluded ? Math.round(rawTotal / 1.1) : rawTotal;
  const vatTotal = params.vatIncluded ? rawTotal - supplyTotal : Math.round(supplyTotal * 0.1);
  const zeroMemo = params.vatIncluded
    ? `총액(부가세포함 ₩${rawTotal.toLocaleString()}) 기준 입고`
    : `총액(공급가액 ₩${rawTotal.toLocaleString()}) 기준 입고`;
  const { hasRemainder, rows } = distributeSupplyIntoIntegerUnitRows(
    qty,
    supplyTotal,
    zeroMemo,
    "단가 정수화 수량분할 1차",
    "단가 정수화 수량분할 2차"
  );

  return { qty, supplyTotal, vatTotal, grandTotal: supplyTotal + vatTotal, hasRemainder, rows };
}

export function buildProductFilterMetadata(
  products: any[],
  prodItemClassFilter: "ALL" | ForkliftItemClass,
  categoryFilter: string,
  manufacturerFilter: string
): TradeProductFilterMetadata {
  const classScoped =
    prodItemClassFilter === "ALL"
      ? products
      : products.filter((p) => normalizeItemClass(p.item_class, p.category) === prodItemClassFilter);

  const categorySet = new Set<string>();
  const mfgSet = new Set<string>();
  for (const p of classScoped) {
    if (p.category && String(p.category).trim()) categorySet.add(String(p.category).trim());
    if (p.manufacturer && String(p.manufacturer).trim()) mfgSet.add(String(p.manufacturer).trim());
  }

  const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b, "ko"));
  const manufacturerOptions: SearchSelectOption[] = Array.from(mfgSet)
    .sort((a, b) => a.localeCompare(b, "ko"))
    .map((m) => ({ value: m, label: m, searchKeywords: [m] }));

  const modelScoped = classScoped.filter((p) => {
    if (categoryFilter !== "ALL" && String(p.category || "").trim() !== categoryFilter) return false;
    if (manufacturerFilter.trim() && !matchHangulAny([p.manufacturer], manufacturerFilter)) return false;
    return true;
  });

  const modelOptions: SearchSelectOption[] = modelScoped.map((p) => ({
    value: String(p.model_name || p.name || ""),
    label: String(p.model_name || p.name || ""),
    subLabel: [p.manufacturer, p.spec, p.part_no].filter(Boolean).join(" | "),
    badgeText: getItemClassLabel(normalizeItemClass(p.item_class, p.category)),
    badgeColor: "slate",
    searchKeywords: [p.name, p.model_name, p.spec, p.part_no, p.sku_code, p.manufacturer],
  }));

  return { categories, manufacturerOptions, modelOptions };
}

export function buildTradeInventorySummaryRows(
  products: any[],
  criteria: TradeFilterCriteriaInput
): TradeInventorySummaryRow[] {
  const withDerived: TradeInventorySummaryRow[] = products.map((p) => ({
    ...p,
    margin: Number(p.standard_price || 0) - Number(p.standard_cost || 0),
  }));
  const filtered = filterTradeInventoryItems(withDerived, {
    minElapsedDaysText: criteria.minElapsedDaysInput,
    maxElapsedDaysText: criteria.maxElapsedDaysInput,
    itemClass: criteria.prodItemClassFilter,
    category: criteria.categoryFilter,
    manufacturer: criteria.manufacturerFilter,
    modelKeyword: criteria.modelFilter,
    stockScope: criteria.stockScopeFilter,
    searchTerm: criteria.searchTerm,
  });
  return sortErpItems(filtered, criteria.sortKey, criteria.sortDir);
}

export function buildSortedInventoryLots(
  inventoryLots: TradeInventoryLotRow[],
  criteria: TradeFilterCriteriaInput
): TradeInventoryLotRow[] {
  const filtered = filterTradeInventoryItems(inventoryLots, {
    minElapsedDaysText: criteria.minElapsedDaysInput,
    maxElapsedDaysText: criteria.maxElapsedDaysInput,
    itemClass: criteria.prodItemClassFilter,
    category: criteria.categoryFilter,
    manufacturer: criteria.manufacturerFilter,
    modelKeyword: criteria.modelFilter,
    stockScope: criteria.stockScopeFilter === "ALL" ? "IN_STOCK" : criteria.stockScopeFilter,
    searchTerm: criteria.searchTerm,
  });
  return sortErpItems(filtered, criteria.sortKey, criteria.sortDir);
}

export function computeTradeInventoryStats(
  inventoryViewMode: TradeInventoryViewMode,
  sortedInventorySummary: TradeInventorySummaryRow[],
  sortedInventoryLots: TradeInventoryLotRow[]
): TradeInventoryStats {
  let totalQty = 0;
  let totalValue = 0;
  let tierNormal = 0;
  let tierWatch = 0;
  let tierCaution = 0;
  let tierLong = 0;

  if (inventoryViewMode === "SUMMARY") {
    for (const p of sortedInventorySummary) {
      totalQty += Number(p.current_stock || 0);
      totalValue += Number(p.inventory_value || 0);
      const tier = p.aging_tier as AgingTier;
      if (tier === "NORMAL") tierNormal++;
      else if (tier === "WATCH") tierWatch++;
      else if (tier === "CAUTION") tierCaution++;
      else if (tier === "LONG_TERM") tierLong++;
    }
    return { rowCount: sortedInventorySummary.length, totalQty, totalValue, tierNormal, tierWatch, tierCaution, tierLong };
  }

  for (const lot of sortedInventoryLots) {
    totalQty += Number(lot.remainingQty || 0);
    totalValue += Number(lot.stockValue || 0);
    if (lot.agingTier === "NORMAL") tierNormal++;
    else if (lot.agingTier === "WATCH") tierWatch++;
    else if (lot.agingTier === "CAUTION") tierCaution++;
    else if (lot.agingTier === "LONG_TERM") tierLong++;
  }
  return { rowCount: sortedInventoryLots.length, totalQty, totalValue, tierNormal, tierWatch, tierCaution, tierLong };
}

export function buildTradeOptionCatalog(products: any[]): CatalogOptionItem[] {
  return products
    .filter((p) => normalizeItemClass(p.item_class, p.category) === "OPTION")
    .map((p) => ({
      id: p.id,
      source: "TRADE" as const,
      skuCode: p.sku_code || p.skuCode || undefined,
      name: p.name,
      spec: p.spec || undefined,
      unitPrice: Number(p.standard_price || 0),
      installFee: Number(p.install_fee || 0),
      monthlyAddonRate: Number(p.addon_monthly_rate || 0),
      dailyAddonRate: Number(p.addon_daily_rate || 0),
    }));
}

export function buildSortedPurchases(
  purchases: any[],
  products: any[],
  criteria: Omit<TradeFilterCriteriaInput, "stockScopeFilter">
): any[] {
  const prodById = new Map<number, any>(products.map((p) => [Number(p.id), p]));
  const enriched = purchases.map((pu) => {
    const prod = prodById.get(Number(pu.productId));
    return {
      ...pu,
      itemClass: pu.itemClass || prod?.item_class || "GENERAL",
      category: pu.category || prod?.category || "",
      manufacturer: pu.manufacturer || prod?.manufacturer || "",
      partNo: pu.partNo || prod?.part_no || "",
      spec: pu.spec || prod?.spec || "",
      specData: pu.specData || prod?.spec_data || {},
    };
  });
  const filtered = filterTradeInventoryItems(enriched, {
    minElapsedDaysText: criteria.minElapsedDaysInput,
    maxElapsedDaysText: criteria.maxElapsedDaysInput,
    itemClass: criteria.prodItemClassFilter,
    category: criteria.categoryFilter,
    manufacturer: criteria.manufacturerFilter,
    modelKeyword: criteria.modelFilter,
    stockScope: "ALL",
    searchTerm: criteria.searchTerm,
  });
  return sortErpItems(filtered, criteria.sortKey, criteria.sortDir);
}

export function buildSortedSales(sales: any[], searchTerm: string, sortKey: string, sortDir: SortDirection): any[] {
  const filtered = searchTerm.trim()
    ? sales.filter((s) =>
        matchHangulAny(
          [
            s.saleNo,
            s.customerName,
            s.siteName,
            s.productName,
            s.productSpec,
            s.skuCode,
            s.memo,
            s.taxInvoiceNo,
            ...(Array.isArray(s.chassisNumbers) ? s.chassisNumbers : []),
          ],
          searchTerm
        )
      )
    : sales;
  return sortErpItems(filtered, sortKey, sortDir);
}

export function buildSortedBillings(billings: any[], searchTerm: string, sortKey: string, sortDir: SortDirection): any[] {
  const filtered = searchTerm.trim()
    ? billings.filter((b) =>
        matchHangulAny([b.billingNo, b.saleNo, b.customerName, b.productName, b.milestoneName], searchTerm)
      )
    : billings;
  return sortErpItems(filtered, sortKey, sortDir);
}

export function buildSortedCustomerBreakdown(
  customerBreakdown: any[],
  searchTerm: string,
  sortKey: string,
  sortDir: SortDirection
): any[] {
  const filtered = searchTerm.trim()
    ? customerBreakdown.filter((c) => matchHangulAny([c.customerName, c.businessNo], searchTerm))
    : customerBreakdown;
  return sortErpItems(filtered, sortKey, sortDir);
}

export function buildVendorPartnerOptions(vendorPartners: any[]): SearchSelectOption[] {
  return vendorPartners.map((p) => {
    const block = getPartnerTradeBlockInfo(p);
    return {
      value: p.name,
      label: p.name,
      subLabel: [p.partnerCode, p.bizType || p.businessNo, p.managerName ? `담당: ${p.managerName}` : null]
        .filter(Boolean)
        .join(" | "),
      badgeText: block.blocked ? block.badgeText : p.partnerCode || undefined,
      badgeColor: block.blocked ? "rose" : "slate",
      searchKeywords: [p.name, p.businessNo, p.ceoName, p.partnerCode, p.managerName],
      disabled: block.blocked,
    };
  });
}

export function buildCustomerPartnerOptions(customerPartners: any[]): SearchSelectOption[] {
  return customerPartners.map((p) => {
    const block = getPartnerTradeBlockInfo(p);
    return {
      value: String(p.id),
      label: p.name,
      subLabel: `사업자: ${p.businessNo || "-"} | 대표: ${p.ceoName || "-"} | ${p.taxEmail || p.managerEmail || "-"}`,
      badgeText: block.blocked ? block.badgeText : p.partnerCode || undefined,
      badgeColor: block.blocked ? "rose" : "blue",
      searchKeywords: [p.name, p.businessNo, p.ceoName, p.partnerCode],
      disabled: block.blocked,
    };
  });
}

export function buildTradeProductOptions(products: any[]): SearchSelectOption[] {
  return products.map((p) => ({
    value: String(p.id),
    label: `${p.name}${p.spec ? ` (${p.spec})` : ""}`,
    subLabel: `매입 ${formatErpCurrency(Number(p.standard_cost || 0))} / 판매 ${formatErpCurrency(Number(p.standard_price || 0))}`,
    badgeText: p.unit || undefined,
    badgeColor: "slate",
    searchKeywords: [p.name, p.spec, p.skuCode, p.sku, p.category],
  }));
}

export function buildTradeSaleOptions(sales: any[]): SearchSelectOption[] {
  return sales.map((s) => ({
    value: String(s.id),
    label: `[${s.saleNo}] ${s.customerName} - ${s.productName}`,
    subLabel: `${s.qty}${s.unit || "EA"} / ${formatErpCurrency(s.totalAmount)}`,
    badgeText: s.entityType === "INDIVIDUAL" ? "개인" : "법인",
    badgeColor: s.entityType === "INDIVIDUAL" ? "amber" : "blue",
    searchKeywords: [s.saleNo, s.customerName, s.productName, s.productSpec, s.skuCode],
  }));
}

export function buildProductUpsertPayload(params: {
  editProdId: number | null;
  skuCode: string;
  prodName: string;
  prodItemClass: ForkliftItemClass;
  prodManufacturer: string;
  prodPartNo: string;
  prodCategory: string;
  prodSpec: string;
  prodSpecData: ForkliftSpecData;
  prodUnit: string;
  prodStandardCost: string;
  prodStandardPrice: string;
  prodInstallFee: string;
  prodAddonMonthly: string;
  prodAddonDaily: string;
  prodWarrantyMonths: string;
  prodWarrantyHours: string;
  prodSafetyStock: string;
  prodInitialStock: string;
  prodInboundDate: string;
}) {
  const computedSpec = summarizeForkliftSpec(params.prodItemClass, params.prodSpecData, params.prodSpec);
  return {
    ...(params.editProdId ? { id: params.editProdId } : {}),
    skuCode: params.skuCode.trim() || undefined,
    name: params.prodName.trim(),
    itemClass: params.prodItemClass,
    manufacturer: params.prodManufacturer.trim(),
    partNo: params.prodPartNo.trim(),
    category: params.prodCategory,
    spec: computedSpec,
    specData: params.prodSpecData,
    unit: params.prodUnit,
    standardCost: cleanErpNumber(params.prodStandardCost),
    standardPrice: cleanErpNumber(params.prodStandardPrice),
    installFee: cleanErpNumber(params.prodInstallFee),
    addonMonthlyRate: cleanErpNumber(params.prodAddonMonthly),
    addonDailyRate: cleanErpNumber(params.prodAddonDaily),
    warrantyMonths: cleanErpNumber(params.prodWarrantyMonths),
    warrantyHours: cleanErpNumber(params.prodWarrantyHours),
    safetyStock: cleanErpNumber(params.prodSafetyStock),
    currentStock: cleanErpNumber(params.prodInitialStock),
    inboundDate: params.prodInboundDate.trim() || (params.editProdId ? "" : undefined),
  };
}

export function buildTradeSaleTaxSpecSync(params: {
  rows: TradeSaleItemDraft[];
  products: any[];
  dateStr: string;
  installedOpts: AttachedForkliftOption[];
}) {
  const mm = params.dateStr ? params.dateStr.slice(5, 7) : "";
  const dd = params.dateStr ? params.dateStr.slice(8, 10) : "";

  const primaryTaxItems = params.rows.map((r) => {
    const prod = params.products.find((p) => String(p.id) === String(r.productId));
    const q = cleanErpNumber(r.qty) || 1;
    const u = cleanErpNumber(r.unitPrice) || 0;
    const sup = q * u;
    const vat = cleanErpNumber(r.vatAmount) || Math.round(sup * 0.1);
    return {
      month: mm,
      day: dd,
      itemName: prod ? prod.name : "판매 상품",
      spec: prod ? prod.spec || "" : "",
      qty: q,
      unitCost: u,
      supplyAmount: sup,
      vatAmount: vat,
      note: "",
    };
  });

  const optionTaxItems = params.installedOpts.map((opt) => {
    const q = Math.max(1, Number(opt.qty || 1));
    const u = Math.max(0, Number(opt.unitPrice || 0)) + Math.max(0, Number(opt.installFee || 0));
    const sup = q * u;
    const vat = Math.round(sup * 0.1);
    return {
      month: mm,
      day: dd,
      itemName: `[옵션설치] ${opt.optionName}`,
      spec: opt.specSummary || (Number(opt.installFee || 0) > 0 ? `공임 ${formatErpCurrency(Number(opt.installFee || 0))}` : ""),
      qty: q,
      unitCost: u,
      supplyAmount: sup,
      vatAmount: vat,
      note: Number(opt.installFee || 0) > 0 ? "설치공임 포함" : "",
    };
  });

  const nextTaxItems = [...primaryTaxItems, ...optionTaxItems];
  const firstRow = params.rows[0] || { productId: "", qty: "1", unitPrice: "0", vatAmount: "0" };
  const totalVat = nextTaxItems.reduce((acc, it) => acc + Number(it.vatAmount || 0), 0);

  return { firstRow, totalVatFormatted: formatErpInputNumber(String(totalVat)), nextTaxItems };
}

export function buildTradeSaleCreatePayload(params: {
  validRows: TradeSaleItemDraft[];
  products: any[];
  soEntityType: "CORP" | "INDIVIDUAL";
  soPartnerId: number | null;
  soDate: string;
  soCustomer: string;
  soSaleCategory: TradeSaleCategory;
  soSiteName: string;
  soChassisNumbers: string[];
  soInstalledOptions: AttachedForkliftOption[];
  soWarrantyMonths: string;
  soWarrantyHours: string;
  soMemo: string;
  soFileUrl: string;
  soFileName: string;
  soTaxSpec: BuyerTaxSpec;
}) {
  const cleanChassisList =
    params.soSaleCategory === "FORKLIFT_SALE"
      ? params.soChassisNumbers.map((c) => c.trim()).filter(Boolean)
      : [];

  const payloadItems = params.validRows.map((r) => {
    const prod = params.products.find((p) => String(p.id) === String(r.productId));
    const q = cleanErpNumber(r.qty) || 1;
    const u = cleanErpNumber(r.unitPrice) || 0;
    const sup = q * u;
    const vat = cleanErpNumber(r.vatAmount) || Math.round(sup * 0.1);
    return {
      productId: Number(r.productId),
      itemName: prod ? prod.name : "판매 상품",
      spec: prod ? prod.spec || "" : "",
      qty: q,
      unitPrice: u,
      supplyAmount: sup,
      vatAmount: vat,
    };
  });

  const optionPayloadItems =
    params.soSaleCategory === "FORKLIFT_SALE"
      ? params.soInstalledOptions.map((opt) => {
          const q = Math.max(1, Number(opt.qty || 1));
          const u = Math.max(0, Number(opt.unitPrice || 0)) + Math.max(0, Number(opt.installFee || 0));
          const sup = q * u;
          const vat = Math.round(sup * 0.1);
          return {
            productId: opt.source === "TRADE" && opt.optionId ? Number(opt.optionId) : null,
            itemName: `[옵션설치] ${opt.optionName}`,
            spec: opt.specSummary || "",
            qty: q,
            unitPrice: u,
            supplyAmount: sup,
            vatAmount: vat,
          };
        })
      : [];

  const allPayloadItems = [...payloadItems, ...optionPayloadItems];

  return {
    cleanChassisList,
    allPayloadItems,
    requestBody: {
      entityType: params.soEntityType,
      partnerId: params.soPartnerId,
      saleDate: params.soDate,
      customerName: params.soCustomer,
      saleCategory: params.soSaleCategory,
      siteName: params.soSiteName.trim() || null,
      chassisNumbers: cleanChassisList,
      installedOptions: params.soSaleCategory === "FORKLIFT_SALE" ? params.soInstalledOptions : [],
      warrantyMonths: params.soSaleCategory === "FORKLIFT_SALE" ? cleanErpNumber(params.soWarrantyMonths) : 0,
      warrantyHours: params.soSaleCategory === "FORKLIFT_SALE" ? cleanErpNumber(params.soWarrantyHours) : 0,
      productId: allPayloadItems[0].productId,
      qty: allPayloadItems.reduce((acc, it) => acc + it.qty, 0),
      unitPrice: allPayloadItems[0].unitPrice,
      vatAmount: allPayloadItems.reduce((acc, it) => acc + it.vatAmount, 0),
      items: allPayloadItems,
      memo: params.soMemo,
      contractFileUrl: params.soFileUrl || null,
      contractFileName: params.soFileName || null,
      customerBizNo: params.soTaxSpec.customerBizNo,
      customerCeoName: params.soTaxSpec.customerCeoName,
      customerAddress: params.soTaxSpec.customerAddress,
      customerBizType: params.soTaxSpec.customerBizType,
      customerBizClass: params.soTaxSpec.customerBizClass,
      customerEmail: params.soTaxSpec.customerEmail,
      customerEmail2: params.soTaxSpec.customerEmail2,
      taxPurpose: params.soTaxSpec.taxPurpose,
      taxMemo: params.soTaxSpec.taxMemo,
      taxItems: params.soTaxSpec.taxItems,
    },
  };
}

export function buildTradeBillingTemplateValues(s: any, dateStr: string): {
  supplyAmount: string;
  vatAmount: string;
  milestoneName: string;
  taxSpec: BuyerTaxSpec;
} {
  const baseSupply = Number(s.totalAmount || 0);
  const baseVat = s.vatAmount != null ? Number(s.vatAmount) : Math.round(baseSupply * 0.1);
  const fallbackFirst = s.productName || "판매 상품";
  const rawItems =
    Array.isArray(s.taxItems) && s.taxItems.length > 0
      ? s.taxItems
      : [
          {
            month: dateStr.slice(5, 7),
            day: dateStr.slice(8, 10),
            itemName: fallbackFirst,
            spec: s.productSpec || s.skuCode || "",
            qty: Number(s.qty || 1),
            unitCost: Number(s.unitPrice || baseSupply),
            supplyAmount: baseSupply,
            vatAmount: baseVat,
            note: "",
          },
        ];

  const resolvedItems = resolveContractTaxItemsTemplate(rawItems, {
    dateStr,
    fallbackFirstItem: fallbackFirst,
  });
  const rawTemplate = s.taxMemo || "{1번째 아이템} 외";
  const resolvedMemo = resolveContractItemTemplate(rawTemplate, {
    dateStr,
    items: resolvedItems,
    fallbackFirstItem: resolvedItems[0]?.itemName || fallbackFirst,
  });

  return {
    supplyAmount: toErpInputString(baseSupply),
    vatAmount: toErpInputString(baseVat),
    milestoneName: resolvedMemo,
    taxSpec: {
      customerBizNo: s.customerBizNo || "",
      customerCeoName: s.customerCeoName || "",
      customerAddress: s.customerAddress || "",
      customerBizType: s.customerBizType || "",
      customerBizClass: s.customerBizClass || "",
      customerEmail: s.customerEmail || "",
      customerEmail2: s.customerEmail2 || "",
      taxPurpose: s.taxPurpose === "영수" ? "영수" : "청구",
      taxMemo: resolvedMemo,
      taxItems: resolvedItems,
    },
  };
}

export function buildTradeTaxInvoiceIssuePayload(b: any) {
  return {
    domainType: "TRADE_SALE",
    supplierEntityType: b.entityType || "CORP",
    refId: b.id,
    customerName: b.customerName,
    businessNo: b.customerBizNo || "100-00-00000",
    ceoName: b.customerCeoName || "대표자",
    customerAddress: b.customerAddress || "",
    customerBizType: b.customerBizType || "",
    customerBizClass: b.customerBizClass || "",
    customerEmail: b.customerEmail || "",
    customerEmail2: b.customerEmail2 || "",
    purposeType: b.taxPurpose || "청구",
    memo: b.taxMemo || b.milestoneName || b.productName || "",
    taxItems: b.taxItems || [],
    itemName: b.taxMemo || b.milestoneName || `${b.productName} (${b.qty}${b.unit || "EA"})`,
    supplyAmount: b.supplyAmount,
    vatAmount: b.vatAmount,
    issueDate: b.billingDate,
  };
}

export function buildConsolidatedTaxBillingPayload(selectedBills: any[]) {
  return selectedBills.map((b) => ({
    billingId: b.id,
    domainType: "TRADE_SALE",
    billingNo: b.billingNo,
    billingDate: b.billingDate,
    contractId: b.saleId,
    saleIds: b.saleIds || [],
    customerName: b.customerName,
    entityType: b.entityType || "CORP",
    businessNo: b.customerBizNo || "100-00-00000",
    ceoName: b.customerCeoName || "대표자",
    customerAddress: b.customerAddress || "",
    customerBizType: b.customerBizType || "",
    customerBizClass: b.customerBizClass || "",
    customerEmail: b.customerEmail || "",
    customerEmail2: b.customerEmail2 || "",
    purposeType: b.taxPurpose || "청구",
    taxMemo: b.taxMemo || b.milestoneName || "",
    taxItems: b.taxItems || [],
    supplyAmount: b.supplyAmount,
    vatAmount: b.vatAmount,
    totalAmount: b.totalAmount,
    itemName: b.milestoneName || b.productName || "판매 물품",
  }));
}

function escapeTradeCsvCell(val: unknown): string {
  const s = val === null || val === undefined ? "" : String(val);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildTradeInventoryCsv(rows: TradeInventorySummaryRow[]): string {
  const headers = [
    "SKU코드", "제품유형", "세부분류", "제조사", "상품명", "규격", "품번",
    "최선입입고일", "최근입고일", "경과일수", "현재재고", "안전재고", "기준매입단가", "재고자산액",
  ];
  const csvRows = rows.map((p) => [
    p.sku_code || "",
    getItemClassLabel(normalizeItemClass(p.item_class, p.category)),
    p.category || "",
    p.manufacturer || "",
    p.name || "",
    p.spec || "",
    p.part_no || "",
    p.oldest_inbound_date || "",
    p.latest_inbound_date || "",
    p.elapsed_days ?? "",
    Number(p.current_stock || 0),
    Number(p.safety_stock || 0),
    Number(p.standard_cost || 0),
    Number(p.inventory_value || 0),
  ]);
  return (
    "\uFEFF" +
    [
      headers.map(escapeTradeCsvCell).join(","),
      ...csvRows.map((row) => row.map(escapeTradeCsvCell).join(",")),
    ].join("\n")
  );
}

export function exportTradeInventoryCsv(
  rows: TradeInventorySummaryRow[],
  referenceDate: string = getTodayKstDateString()
): boolean {
  if (typeof window === "undefined" || rows.length === 0) return false;
  const csvContent = buildTradeInventoryCsv(rows);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `유통재고현황_${referenceDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
