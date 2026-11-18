"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Package, Plus, ShoppingCart, TrendingUp, RefreshCw, 
  Search, Download, DollarSign, Layers, FileText, CheckCircle2, AlertCircle, X,
  FileUp, Edit, Trash2
} from "lucide-react";
import {
  formatErpNumber,
  formatErpCurrency,
  formatErpQty,
  formatErpInputNumber,
  toErpInputString,
  cleanErpNumber,
  matchHangulAny,
  sortCustomersByName,
  sortErpItems,
  SortDirection,
  cycleErpSort,
  resolveContractItemTemplate,
  resolveContractTaxItemsTemplate,
  ForkliftItemClass,
  ForkliftSpecData,
  FORKLIFT_ITEM_CLASS_OPTIONS,
  AttachedForkliftOption,
  calculateAttachedOptionsTotals,
  getItemClassLabel,
  normalizeItemClass,
  parseForkliftSpecData,
  summarizeForkliftSpec,
  formatAttachedOptionsSummary,
} from "@/lib/erpFormat";
import {
  AGING_TIER_LABELS,
  AgingTier,
  TradeInventoryLotRow,
  filterTradeInventoryItems,
  getTodayKstDateString,
  parseDaysBoundInput,
} from "@/lib/tradeInventoryDomain";
import { SortableTh } from "./SortableTh";
import { SearchSelectCombobox, SearchSelectOption } from "./SearchSelectCombobox";
import { ContractTaxInvoiceSection, BuyerTaxSpec, createDefaultTaxSpec, extractPartnerTaxSpec } from "./ContractTaxInvoiceSection";
import ForkliftSpecEditor from "./ForkliftSpecEditor";
import ForkliftOptionAttachPanel, { CatalogOptionItem } from "./ForkliftOptionAttachPanel";
import { findBlockedPartnerMatch, getPartnerTradeBlockInfo } from "@/lib/partnerStatusClient";
import { PurchasesSubTab, SalesSubTab, BillingsSubTab, SettlementSubTab } from "./trade/TradeSalesBillingSubTabs";
import { ProductModal, PurchaseModal } from "./trade/TradeProductPurchaseModals";
import { AddSaleModal, EditSaleModal, AddBillingModal } from "./trade/TradeSaleBillingModals";

interface TradeTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onNavigateToTax?: () => void;
}

export const TradeTab: React.FC<TradeTabProps> = ({ currentUser, selectedEntity = "ALL", onNavigateToTax }) => {
  const canBill =
    currentUser?.roleCode === "ADMIN" ||
    currentUser?.loginId === "admin" ||
    Boolean(currentUser?.canBill);
  const [subTab, setSubTab] = useState<"inventory" | "products" | "purchases" | "sales" | "billings" | "settlement">("inventory");
  const [loading, setLoading] = useState(false);

  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [inventoryLots, setInventoryLots] = useState<TradeInventoryLotRow[]>([]);
  const [inventoryRefDate, setInventoryRefDate] = useState<string>(getTodayKstDateString());
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [billings, setBillings] = useState<any[]>([]);
  const [settlementSummary, setSettlementSummary] = useState<any>(null);
  const [customerBreakdown, setCustomerBreakdown] = useState<any[]>([]);
  const [registeredPartners, setRegisteredPartners] = useState<any[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [inventoryViewMode, setInventoryViewMode] = useState<"SUMMARY" | "LOT">("SUMMARY");
  const [stockScopeFilter, setStockScopeFilter] = useState<"IN_STOCK" | "ALL" | "LOW_STOCK">("IN_STOCK");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("");
  const [modelFilter, setModelFilter] = useState<string>("");
  const [minElapsedDaysInput, setMinElapsedDaysInput] = useState<string>("");
  const [maxElapsedDaysInput, setMaxElapsedDaysInput] = useState<string>("");

  // Sorting State (전사 3단계 순환: 오름차순 ➔ 내림차순 ➔ 정렬안함)
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const handleSort = (key: string) => {
    const next = cycleErpSort(sortKey, sortDir, key);
    setSortKey(next.key);
    setSortDir(next.dir);
  };

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => (
    <SortableTh
      label={label}
      colKey={key}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={handleSort}
      align={align}
      className="py-2.5 px-3"
    />
  );

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [showAddBillingModal, setShowAddBillingModal] = useState(false);
  const [activeDocViewer, setActiveDocViewer] = useState<{ title: string; customerName: string; url: string; fileName: string } | null>(null);
  const saleFileCacheRef = useRef<Record<number, { url: string; fileName: string }>>({});

  // Trade Billing Form (계약 항목 끌어다가 청구 생성)
  const [blSaleId, setBlSaleId] = useState("");
  const [blDate, setBlDate] = useState(new Date().toISOString().split("T")[0]);
  const [blMilestoneName, setBlMilestoneName] = useState("");
  const [blSupplyAmount, setBlSupplyAmount] = useState("0");
  const [blVatAmount, setBlVatAmount] = useState("0");
  const [blTaxSpec, setBlTaxSpec] = useState<BuyerTaxSpec>(() =>
    createDefaultTaxSpec("판매 물품", 0)
  );

  // Add Sale Form
  const [soEntityType, setSoEntityType] = useState<"CORP" | "INDIVIDUAL">(
    selectedEntity === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP"
  );

  useEffect(() => {
    if (selectedEntity === "INDIVIDUAL") setSoEntityType("INDIVIDUAL");
    else if (selectedEntity === "CORP") setSoEntityType("CORP");
  }, [selectedEntity]);

  // Add Product Form
  const [prodItemClassFilter, setProdItemClassFilter] = useState<"ALL" | ForkliftItemClass>("ALL");
  const [prodItemClass, setProdItemClass] = useState<ForkliftItemClass>("FORKLIFT");
  const [skuCode, setSkuCode] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodManufacturer, setProdManufacturer] = useState("두산");
  const [prodCategory, setProdCategory] = useState("지게차 완제품");
  const [prodSpec, setProdSpec] = useState("");
  const [prodSpecData, setProdSpecData] = useState<ForkliftSpecData>({});
  const [prodPartNo, setProdPartNo] = useState("");
  const [prodInstallFee, setProdInstallFee] = useState("0");
  const [prodAddonMonthly, setProdAddonMonthly] = useState("0");
  const [prodAddonDaily, setProdAddonDaily] = useState("0");
  const [prodWarrantyMonths, setProdWarrantyMonths] = useState("12");
  const [prodWarrantyHours, setProdWarrantyHours] = useState("2,000");
  const [prodUnit, setProdUnit] = useState("EA");
  const [prodStandardCost, setProdStandardCost] = useState("0");
  const [prodStandardPrice, setProdStandardPrice] = useState("0");
  const [prodSafetyStock, setProdSafetyStock] = useState("10");
  const [prodInitialStock, setProdInitialStock] = useState("0");
  const [prodInboundDate, setProdInboundDate] = useState(getTodayKstDateString());
  const [editProdId, setEditProdId] = useState<number | null>(null);
  const [showEditProductModal, setShowEditProductModal] = useState(false);

  // Add Purchase Form
  const [poVendor, setPoVendor] = useState("");
  const [poProductId, setPoProductId] = useState("");
  const [poInputMode, setPoInputMode] = useState<"UNIT" | "TOTAL">("UNIT");
  const [poVatIncluded, setPoVatIncluded] = useState<boolean>(true);
  const [poQty, setPoQty] = useState("1");
  const [poUnitCost, setPoUnitCost] = useState("0");
  const [poTotalInput, setPoTotalInput] = useState("0");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);

  // 구매입고 수량분할 정수단가 자동 산출 (소수점 단가 발생 시 수량을 분할하여 정수 단가로 맞춤)
  const poSplitPreview = useMemo(() => {
    const qty = Math.max(0, Math.round(cleanErpNumber(poQty)));
    if (qty <= 0) {
      return {
        qty: 0,
        supplyTotal: 0,
        vatTotal: 0,
        grandTotal: 0,
        hasRemainder: false,
        rows: [] as Array<{ qty: number; unitCost: number; rowTotal: number; memo: string }>,
      };
    }

    if (poInputMode === "UNIT") {
      const unitRaw = cleanErpNumber(poUnitCost);
      const totalSupply = Math.round(qty * unitRaw);
      const baseUnit = Math.floor(totalSupply / qty);
      const remainder = totalSupply - baseUnit * qty;

      const rows: Array<{ qty: number; unitCost: number; rowTotal: number; memo: string }> = [];
      if (remainder === 0) {
        rows.push({
          qty,
          unitCost: baseUnit,
          rowTotal: qty * baseUnit,
          memo: "",
        });
      } else {
        const normalQty = qty - remainder;
        if (normalQty > 0) {
          rows.push({
            qty: normalQty,
            unitCost: baseUnit,
            rowTotal: normalQty * baseUnit,
            memo: `단가 정수화 수량분할 (${normalQty}개 × ₩${baseUnit.toLocaleString()})`,
          });
        }
        rows.push({
          qty: remainder,
          unitCost: baseUnit + 1,
          rowTotal: remainder * (baseUnit + 1),
          memo: `단가 정수화 수량분할 (${remainder}개 × ₩${(baseUnit + 1).toLocaleString()})`,
        });
      }

      const vatTotal = Math.round(totalSupply * 0.1);
      return {
        qty,
        supplyTotal: totalSupply,
        vatTotal,
        grandTotal: totalSupply + vatTotal,
        hasRemainder: remainder > 0,
        rows,
      };
    } else {
      // TOTAL 모드 (수량 + 총액 입력)
      const rawTotal = Math.max(0, Math.round(cleanErpNumber(poTotalInput)));
      const supplyTotal = poVatIncluded ? Math.round(rawTotal / 1.1) : rawTotal;
      const vatTotal = poVatIncluded ? rawTotal - supplyTotal : Math.round(supplyTotal * 0.1);
      const grandTotal = supplyTotal + vatTotal;

      const baseUnit = Math.floor(supplyTotal / qty);
      const remainder = supplyTotal - baseUnit * qty;

      const rows: Array<{ qty: number; unitCost: number; rowTotal: number; memo: string }> = [];
      if (remainder === 0) {
        rows.push({
          qty,
          unitCost: baseUnit,
          rowTotal: qty * baseUnit,
          memo: poVatIncluded ? `총액(부가세포함 ₩${rawTotal.toLocaleString()}) 기준 입고` : `총액(공급가액 ₩${rawTotal.toLocaleString()}) 기준 입고`,
        });
      } else {
        const normalQty = qty - remainder;
        if (normalQty > 0) {
          rows.push({
            qty: normalQty,
            unitCost: baseUnit,
            rowTotal: normalQty * baseUnit,
            memo: `단가 정수화 수량분할 1차 (${normalQty}개 × ₩${baseUnit.toLocaleString()})`,
          });
        }
        rows.push({
          qty: remainder,
          unitCost: baseUnit + 1,
          rowTotal: remainder * (baseUnit + 1),
          memo: `단가 정수화 수량분할 2차 (${remainder}개 × ₩${(baseUnit + 1).toLocaleString()})`,
        });
      }

      return {
        qty,
        supplyTotal,
        vatTotal,
        grandTotal,
        hasRemainder: remainder > 0,
        rows,
      };
    }
  }, [poInputMode, poVatIncluded, poQty, poUnitCost, poTotalInput]);

  // Add Sale Form (Multi-product per outbound contract)
  const [soSaleCategory, setSoSaleCategory] = useState<"FORKLIFT_SALE" | "PART_SALE" | "GENERAL">("FORKLIFT_SALE");
  const [soSiteName, setSoSiteName] = useState("");
  const [soChassisNumbers, setSoChassisNumbers] = useState<string[]>([""]);
  const [soInstalledOptions, setSoInstalledOptions] = useState<AttachedForkliftOption[]>([]);
  const [soWarrantyMonths, setSoWarrantyMonths] = useState("12");
  const [soWarrantyHours, setSoWarrantyHours] = useState("2,000");
  const [soPartnerId, setSoPartnerId] = useState<number | null>(null);
  const [soCustomer, setSoCustomer] = useState("");
  const [soProductId, setSoProductId] = useState("");
  const [soQty, setSoQty] = useState("1");
  const [soUnitPrice, setSoUnitPrice] = useState("0");
  const [soVatAmount, setSoVatAmount] = useState("0");
  const [soItems, setSoItems] = useState<Array<{ productId: string; qty: string; unitPrice: string; vatAmount: string }>>([
    { productId: "", qty: "1", unitPrice: "0", vatAmount: "0" },
  ]);
  const [soDate, setSoDate] = useState(new Date().toISOString().split("T")[0]);
  const [soMemo, setSoMemo] = useState("");
  const [soTaxSpec, setSoTaxSpec] = useState<BuyerTaxSpec>(() =>
    createDefaultTaxSpec("{1번째 아이템} 외", 0)
  );
  const [soFileUrl, setSoFileUrl] = useState("");
  const [soFileName, setSoFileName] = useState("");
  const soFileInputRef = useRef<HTMLInputElement>(null);

  // Selection states for consolidated billing & consolidated tax invoice
  const [selectedSaleIds, setSelectedSaleIds] = useState<number[]>([]);
  const [selectedBillingIds, setSelectedBillingIds] = useState<number[]>([]);

  // Edit Sale Form
  const [editSoId, setEditSoId] = useState<number | null>(null);
  const [editSoSaleNo, setEditSoSaleNo] = useState("");
  const [editSoEntityType, setEditSoEntityType] = useState<"CORP" | "INDIVIDUAL">("CORP");
  const [editSoPartnerId, setEditSoPartnerId] = useState<number | null>(null);
  const [editSoCustomer, setEditSoCustomer] = useState("");
  const [editSoProductId, setEditSoProductId] = useState("");
  const [editSoQty, setEditSoQty] = useState("1");
  const [editSoUnitPrice, setEditSoUnitPrice] = useState("0");
  const [editSoVatAmount, setEditSoVatAmount] = useState("0");
  const [editSoDate, setEditSoDate] = useState("");
  const [editSoStatus, setEditSoStatus] = useState("SHIPPED");
  const [editSoMemo, setEditSoMemo] = useState("");
  const [editSoTaxSpec, setEditSoTaxSpec] = useState<BuyerTaxSpec>(() =>
    createDefaultTaxSpec("판매 상품", 0)
  );
  const [editSoFileUrl, setEditSoFileUrl] = useState("");
  const [editSoFileName, setEditSoFileName] = useState("");
  const editSoFileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch All Trade Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const salesUrl = selectedEntity && selectedEntity !== "ALL"
        ? `/api/erp/trade/sales?entityType=${selectedEntity}`
        : "/api/erp/trade/sales";
      const billingsUrl = selectedEntity && selectedEntity !== "ALL"
        ? `/api/erp/trade/billings?entityType=${selectedEntity}`
        : "/api/erp/trade/billings";

      const [prodRes, purRes, saleRes, billRes, setRes, partRes] = await Promise.all([
        fetch("/api/erp/trade/products", { cache: "no-store" }),
        fetch("/api/erp/trade/purchases", { cache: "no-store" }),
        fetch(salesUrl, { cache: "no-store" }),
        fetch(billingsUrl, { cache: "no-store" }),
        fetch(`/api/erp/trade/settlement?startDate=${startDate}&endDate=${endDate}`, { cache: "no-store" }),
        fetch("/api/erp/partners?type=ALL", { cache: "no-store" })
      ]);

      const pData = await prodRes.json();
      const puData = await purRes.json();
      const sData = await saleRes.json();
      const bData = await billRes.json();
      const seData = await setRes.json();
      const partData = await partRes.json();

      if (pData.success) {
        setProducts(pData.products || []);
        setInventoryLots(pData.inventoryLots || []);
        if (pData.referenceDate) setInventoryRefDate(pData.referenceDate);
      }
      if (puData.success) setPurchases(puData.purchases);
      if (sData.success) setSales(sData.sales);
      if (bData.success) setBillings(bData.billings || []);
      if (partData.success && Array.isArray(partData.partners)) setRegisteredPartners(partData.partners);
      if (seData.success) {
        setSettlementSummary(seData.summary);
        setCustomerBreakdown(seData.customerBreakdown);
      }
    } catch (err: any) {
      console.error(err);
      showToast("데이터 로드 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedEntity]);

  // Filter Option Lists for Trade Inventory & Catalog
  const productFilterMetadata = useMemo(() => {
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
      .map((m) => ({
        value: m,
        label: m,
        searchKeywords: [m],
      }));

    const modelScoped = classScoped.filter((p) => {
      if (categoryFilter !== "ALL" && String(p.category || "").trim() !== categoryFilter) {
        return false;
      }
      if (manufacturerFilter.trim() && !matchHangulAny([p.manufacturer], manufacturerFilter)) {
        return false;
      }
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
  }, [products, prodItemClassFilter, categoryFilter, manufacturerFilter]);

  const clearTradeFilters = () => {
    setProdItemClassFilter("ALL");
    setCategoryFilter("ALL");
    setManufacturerFilter("");
    setModelFilter("");
    setMinElapsedDaysInput("");
    setMaxElapsedDaysInput("");
    setSearchTerm("");
    if (subTab === "inventory") {
      setStockScopeFilter("IN_STOCK");
    }
  };

  const hasActiveTradeFilters =
    prodItemClassFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    manufacturerFilter.trim() !== "" ||
    modelFilter.trim() !== "" ||
    minElapsedDaysInput.trim() !== "" ||
    maxElapsedDaysInput.trim() !== "" ||
    searchTerm.trim() !== "";

  // Sorted & Filtered Data Lists
  const sortedInventorySummary = useMemo(() => {
    const withDerived = products.map((p) => ({
      ...p,
      margin: Number(p.standard_price || 0) - Number(p.standard_cost || 0),
    }));
    const filtered = filterTradeInventoryItems(withDerived, {
      minElapsedDaysText: minElapsedDaysInput,
      maxElapsedDaysText: maxElapsedDaysInput,
      itemClass: prodItemClassFilter,
      category: categoryFilter,
      manufacturer: manufacturerFilter,
      modelKeyword: modelFilter,
      stockScope: stockScopeFilter,
      searchTerm,
    });
    return sortErpItems(filtered, sortKey, sortDir);
  }, [
    products,
    minElapsedDaysInput,
    maxElapsedDaysInput,
    prodItemClassFilter,
    categoryFilter,
    manufacturerFilter,
    modelFilter,
    stockScopeFilter,
    searchTerm,
    sortKey,
    sortDir,
  ]);

  const sortedInventoryLots = useMemo(() => {
    const filtered = filterTradeInventoryItems(inventoryLots, {
      minElapsedDaysText: minElapsedDaysInput,
      maxElapsedDaysText: maxElapsedDaysInput,
      itemClass: prodItemClassFilter,
      category: categoryFilter,
      manufacturer: manufacturerFilter,
      modelKeyword: modelFilter,
      stockScope: stockScopeFilter === "ALL" ? "IN_STOCK" : stockScopeFilter,
      searchTerm,
    });
    return sortErpItems(filtered, sortKey, sortDir);
  }, [
    inventoryLots,
    minElapsedDaysInput,
    maxElapsedDaysInput,
    prodItemClassFilter,
    categoryFilter,
    manufacturerFilter,
    modelFilter,
    stockScopeFilter,
    searchTerm,
    sortKey,
    sortDir,
  ]);

  const inventoryStats = useMemo(() => {
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
      return {
        rowCount: sortedInventorySummary.length,
        totalQty,
        totalValue,
        tierNormal,
        tierWatch,
        tierCaution,
        tierLong,
      };
    }
    for (const lot of sortedInventoryLots) {
      totalQty += Number(lot.remainingQty || 0);
      totalValue += Number(lot.stockValue || 0);
      if (lot.agingTier === "NORMAL") tierNormal++;
      else if (lot.agingTier === "WATCH") tierWatch++;
      else if (lot.agingTier === "CAUTION") tierCaution++;
      else if (lot.agingTier === "LONG_TERM") tierLong++;
    }
    return {
      rowCount: sortedInventoryLots.length,
      totalQty,
      totalValue,
      tierNormal,
      tierWatch,
      tierCaution,
      tierLong,
    };
  }, [inventoryViewMode, sortedInventorySummary, sortedInventoryLots]);

  const sortedProducts = useMemo(() => {
    const withMargin = products.map((p) => ({
      ...p,
      margin: Number(p.standard_price || 0) - Number(p.standard_cost || 0),
    }));
    const filtered = filterTradeInventoryItems(withMargin, {
      minElapsedDaysText: minElapsedDaysInput,
      maxElapsedDaysText: maxElapsedDaysInput,
      itemClass: prodItemClassFilter,
      category: categoryFilter,
      manufacturer: manufacturerFilter,
      modelKeyword: modelFilter,
      stockScope: "ALL",
      searchTerm,
    });
    return sortErpItems(filtered, sortKey, sortDir);
  }, [
    products,
    minElapsedDaysInput,
    maxElapsedDaysInput,
    prodItemClassFilter,
    categoryFilter,
    manufacturerFilter,
    modelFilter,
    searchTerm,
    sortKey,
    sortDir,
  ]);

  const tradeOptionCatalog = useMemo<CatalogOptionItem[]>(() => {
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
  }, [products]);

  const resetProductForm = () => {
    setEditProdId(null);
    setProdItemClass("FORKLIFT");
    setSkuCode("");
    setProdName("");
    setProdManufacturer("두산");
    setProdCategory("지게차 완제품");
    setProdSpec("");
    setProdSpecData({});
    setProdPartNo("");
    setProdInstallFee("0");
    setProdAddonMonthly("0");
    setProdAddonDaily("0");
    setProdWarrantyMonths("12");
    setProdWarrantyHours("2,000");
    setProdUnit("EA");
    setProdStandardCost("0");
    setProdStandardPrice("0");
    setProdSafetyStock("10");
    setProdInitialStock("0");
    setProdInboundDate(getTodayKstDateString());
  };

  const openEditTradeProduct = (p: any) => {
    const ic = normalizeItemClass(p.item_class, p.category);
    setEditProdId(p.id);
    setProdItemClass(ic);
    setSkuCode(p.sku_code || p.skuCode || "");
    setProdName(p.name || "");
    setProdManufacturer(p.manufacturer || "");
    setProdCategory(p.category || getItemClassLabel(ic));
    setProdSpec(p.spec || "");
    setProdSpecData(parseForkliftSpecData(p.spec_data));
    setProdPartNo(p.part_no || "");
    setProdInstallFee(toErpInputString(p.install_fee || 0));
    setProdAddonMonthly(toErpInputString(p.addon_monthly_rate || 0));
    setProdAddonDaily(toErpInputString(p.addon_daily_rate || 0));
    setProdWarrantyMonths(toErpInputString(p.warranty_months ?? (ic === "FORKLIFT" ? 12 : 0)));
    setProdWarrantyHours(toErpInputString(p.warranty_hours ?? (ic === "FORKLIFT" ? 2000 : 0)));
    setProdUnit(p.unit || "EA");
    setProdStandardCost(toErpInputString(p.standard_cost || 0));
    setProdStandardPrice(toErpInputString(p.standard_price || 0));
    setProdSafetyStock(toErpInputString(p.safety_stock || 0));
    setProdInitialStock(toErpInputString(p.current_stock || 0));
    setProdInboundDate(p.inbound_date || p.oldest_inbound_date || p.created_date || "");
    setShowEditProductModal(true);
  };

  const sortedPurchases = useMemo(() => {
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
      minElapsedDaysText: minElapsedDaysInput,
      maxElapsedDaysText: maxElapsedDaysInput,
      itemClass: prodItemClassFilter,
      category: categoryFilter,
      manufacturer: manufacturerFilter,
      modelKeyword: modelFilter,
      stockScope: "ALL",
      searchTerm,
    });
    return sortErpItems(filtered, sortKey, sortDir);
  }, [
    purchases,
    products,
    minElapsedDaysInput,
    maxElapsedDaysInput,
    prodItemClassFilter,
    categoryFilter,
    manufacturerFilter,
    modelFilter,
    searchTerm,
    sortKey,
    sortDir,
  ]);

  const sortedSales = useMemo(() => {
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
  }, [sales, searchTerm, sortKey, sortDir]);

  const sortedBillings = useMemo(() => {
    const filtered = searchTerm.trim()
      ? billings.filter((b) =>
          matchHangulAny(
            [b.billingNo, b.saleNo, b.customerName, b.productName, b.milestoneName],
            searchTerm
          )
        )
      : billings;
    return sortErpItems(filtered, sortKey, sortDir);
  }, [billings, searchTerm, sortKey, sortDir]);

  const sortedCustomerBreakdown = useMemo(() => {
    const filtered = searchTerm.trim()
      ? customerBreakdown.filter((c) =>
          matchHangulAny([c.customerName, c.businessNo], searchTerm)
        )
      : customerBreakdown;
    return sortErpItems(filtered, sortKey, sortDir);
  }, [customerBreakdown, searchTerm, sortKey, sortDir]);

  const customerPartners = useMemo(() => {
    return sortCustomersByName(
      registeredPartners.filter((p) => p.partnerType === "CUSTOMER" || p.partnerType === "BOTH")
    );
  }, [registeredPartners]);

  const vendorPartners = useMemo(() => {
    return sortCustomersByName(
      registeredPartners.filter((p) => p.partnerType === "VENDOR" || p.partnerType === "BOTH")
    );
  }, [registeredPartners]);

  const vendorPartnerOptions = useMemo<SearchSelectOption[]>(() => {
    return vendorPartners.map((p) => {
      const block = getPartnerTradeBlockInfo(p);
      return {
        value: p.name,
        label: p.name,
        subLabel: [p.partnerCode, p.bizType || p.businessNo, p.managerName ? `담당: ${p.managerName}` : null]
          .filter(Boolean)
          .join(" | "),
        badgeText: block.blocked ? block.badgeText : (p.partnerCode || undefined),
        badgeColor: block.blocked ? "rose" : "slate",
        searchKeywords: [p.name, p.businessNo, p.ceoName, p.partnerCode, p.managerName],
        disabled: block.blocked,
      };
    });
  }, [vendorPartners]);

  const customerPartnerOptions = useMemo<SearchSelectOption[]>(() => {
    return customerPartners.map((p) => {
      const block = getPartnerTradeBlockInfo(p);
      return {
        value: String(p.id),
        label: p.name,
        subLabel: `사업자: ${p.businessNo || "-"} | 대표: ${p.ceoName || "-"} | ${p.taxEmail || p.managerEmail || "-"}`,
        badgeText: block.blocked ? block.badgeText : (p.partnerCode || undefined),
        badgeColor: block.blocked ? "rose" : "blue",
        searchKeywords: [p.name, p.businessNo, p.ceoName, p.partnerCode],
        disabled: block.blocked,
      };
    });
  }, [customerPartners]);

  const tradeProductOptions = useMemo<SearchSelectOption[]>(() => {
    return products.map((p) => ({
      value: String(p.id),
      label: `${p.name}${p.spec ? ` (${p.spec})` : ""}`,
      subLabel: `매입 ${formatErpCurrency(Number(p.standard_cost || 0))} / 판매 ${formatErpCurrency(Number(p.standard_price || 0))}`,
      badgeText: p.unit || undefined,
      badgeColor: "slate",
      searchKeywords: [p.name, p.spec, p.skuCode, p.sku, p.category],
    }));
  }, [products]);

  const tradeSaleOptions = useMemo<SearchSelectOption[]>(() => {
    return sales.map((s) => ({
      value: String(s.id),
      label: `[${s.saleNo}] ${s.customerName} - ${s.productName}`,
      subLabel: `${s.qty}${s.unit || "EA"} / ${formatErpCurrency(s.totalAmount)}`,
      badgeText: s.entityType === "INDIVIDUAL" ? "개인" : "법인",
      badgeColor: s.entityType === "INDIVIDUAL" ? "amber" : "blue",
      searchKeywords: [s.saleNo, s.customerName, s.productName, s.productSpec, s.skuCode],
    }));
  }, [sales]);

  const handleSelectSaleCustomer = (p: any) => {
    setSoPartnerId(p.id);
    setSoCustomer(p.name);
    setSoTaxSpec((prev) => extractPartnerTaxSpec(p, prev));
  };

  const handleSaleFileUpload = (file: File, isEdit = false) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || "";
      if (isEdit) {
        setEditSoFileUrl(dataUrl);
        setEditSoFileName(file.name);
      } else {
        setSoFileUrl(dataUrl);
        setSoFileName(file.name);
      }
      showToast(`계약서/발주서 파일(${file.name})이 첨부되었습니다.`);
    };
    reader.onerror = () => showToast("파일 읽기 실패", "error");
    reader.readAsDataURL(file);
  };

  const handleOpenSaleFile = async (s: any) => {
    const cached = saleFileCacheRef.current[s.id];
    if (cached) {
      setActiveDocViewer({
        title: `${s.saleNo} 판매 계약서/발주서`,
        customerName: s.customerName,
        url: cached.url,
        fileName: cached.fileName,
      });
      return;
    }
    try {
      const res = await fetch(`/api/erp/trade/sales?id=${s.id}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.sale?.contractFileUrl) {
        const entry = {
          url: data.sale.contractFileUrl,
          fileName: data.sale.contractFileName || `${s.saleNo}_계약서`,
        };
        saleFileCacheRef.current[s.id] = entry;
        setActiveDocViewer({
          title: `${s.saleNo} 판매 계약서/발주서`,
          customerName: s.customerName,
          url: entry.url,
          fileName: entry.fileName,
        });
      } else {
        showToast("등록된 계약서 파일을 찾을 수 없습니다.", "error");
      }
    } catch (e) {
      showToast("파일 조회 실패", "error");
    }
  };

  // Handle Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showToast("상품명은 필수입니다.", "error");
      return;
    }
    try {
      const computedSpec = summarizeForkliftSpec(prodItemClass, prodSpecData, prodSpec);
      const url = "/api/erp/trade/products";
      const method = editProdId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editProdId ? { id: editProdId } : {}),
          skuCode: skuCode.trim() || undefined,
          name: prodName.trim(),
          itemClass: prodItemClass,
          manufacturer: prodManufacturer.trim(),
          partNo: prodPartNo.trim(),
          category: prodCategory,
          spec: computedSpec,
          specData: prodSpecData,
          unit: prodUnit,
          standardCost: cleanErpNumber(prodStandardCost),
          standardPrice: cleanErpNumber(prodStandardPrice),
          installFee: cleanErpNumber(prodInstallFee),
          addonMonthlyRate: cleanErpNumber(prodAddonMonthly),
          addonDailyRate: cleanErpNumber(prodAddonDaily),
          warrantyMonths: cleanErpNumber(prodWarrantyMonths),
          warrantyHours: cleanErpNumber(prodWarrantyHours),
          safetyStock: cleanErpNumber(prodSafetyStock),
          currentStock: cleanErpNumber(prodInitialStock),
          inboundDate: prodInboundDate.trim() || (editProdId ? "" : undefined),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "상품 저장 실패");

      showToast(editProdId ? `상품 [${prodName}] 수정 완료` : `상품 [${prodName}] 등록 완료`);
      setShowAddProductModal(false);
      setShowEditProductModal(false);
      setEditProdId(null);
      setSkuCode("");
      setProdName("");
      setProdSpec("");
      setProdSpecData({});
      setProdPartNo("");
      setProdInstallFee("0");
      setProdAddonMonthly("0");
      setProdAddonDaily("0");
      setProdStandardCost("0");
      setProdStandardPrice("0");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Add Purchase
  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poVendor || !poProductId || poSplitPreview.qty <= 0 || poSplitPreview.rows.length === 0) {
      showToast("매입처, 상품, 수량 및 금액을 확인해 주십시오.", "error");
      return;
    }
    const blockedVendor = findBlockedPartnerMatch(registeredPartners, { name: poVendor });
    if (blockedVendor) {
      showToast(
        `[${blockedVendor.name}] ${getPartnerTradeBlockInfo(blockedVendor).reason}`,
        "error"
      );
      return;
    }
    try {
      const res = await fetch("/api/erp/trade/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseDate: poDate,
          vendorName: poVendor,
          productId: poProductId,
          qty: poSplitPreview.rows[0].qty,
          unitCost: poSplitPreview.rows[0].unitCost,
          splitRows: poSplitPreview.rows,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "구매 등록 실패");

      showToast(
        poSplitPreview.rows.length > 1
          ? `구매 입고 완료 (단가 정수화를 위해 ${poSplitPreview.rows.length}건으로 수량분할 등록됨)`
          : `구매 입고 완료 (재고 자동 반영)`
      );
      setShowAddPurchaseModal(false);
      setPoVendor("");
      setPoQty("1");
      setPoUnitCost("0");
      setPoTotalInput("0");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Sync multi-product rows (soItems + soInstalledOptions) to soTaxSpec.taxItems
  const syncSoItemsToTaxSpec = (
    rows: Array<{ productId: string; qty: string; unitPrice: string; vatAmount: string }>,
    dateStr = soDate,
    installedOpts: AttachedForkliftOption[] = soInstalledOptions
  ) => {
    const mm = dateStr ? dateStr.slice(5, 7) : "";
    const dd = dateStr ? dateStr.slice(8, 10) : "";
    const primaryTaxItems = rows.map((r) => {
      const prod = products.find((p) => String(p.id) === String(r.productId));
      const q = cleanErpNumber(r.qty) || 1;
      const u = cleanErpNumber(r.unitPrice) || 0;
      const sup = q * u;
      const vat = cleanErpNumber(r.vatAmount) || Math.round(sup * 0.1);
      return {
        month: mm,
        day: dd,
        itemName: prod ? prod.name : "판매 상품",
        spec: prod ? (prod.spec || "") : "",
        qty: q,
        unitCost: u,
        supplyAmount: sup,
        vatAmount: vat,
        note: "",
      };
    });
    const optionTaxItems = installedOpts.map((opt) => {
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
    const firstRow = rows[0] || { productId: "", qty: "1", unitPrice: "0", vatAmount: "0" };
    setSoProductId(firstRow.productId);
    setSoQty(firstRow.qty);
    setSoUnitPrice(firstRow.unitPrice);
    const totalVat = nextTaxItems.reduce((acc, it) => acc + Number(it.vatAmount || 0), 0);
    setSoVatAmount(formatErpInputNumber(String(totalVat)));
    setSoTaxSpec((prev) => ({
      ...prev,
      taxMemo: prev.taxMemo || "{1번째 아이템} 외",
      taxItems: nextTaxItems,
    }));
  };

  // Handle Add Sale (Supports multiple products + add-on options + chassis warranty registration)
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = soItems.filter((r) => r.productId && cleanErpNumber(r.qty) > 0);
    if (!soCustomer || validRows.length === 0) {
      showToast("고객사와 최소 1개 이상의 출고 제품 및 수량을 입력해 주십시오.", "error");
      return;
    }
    const blockedCust = findBlockedPartnerMatch(registeredPartners, {
      partnerId: soPartnerId,
      name: soCustomer,
      businessNo: soTaxSpec.customerBizNo,
    });
    if (blockedCust) {
      showToast(`[${blockedCust.name}] ${getPartnerTradeBlockInfo(blockedCust).reason}`, "error");
      return;
    }
    const cleanChassisList =
      soSaleCategory === "FORKLIFT_SALE"
        ? soChassisNumbers.map((c) => c.trim()).filter(Boolean)
        : [];
    try {
      const payloadItems = validRows.map((r) => {
        const prod = products.find((p) => String(p.id) === String(r.productId));
        const q = cleanErpNumber(r.qty) || 1;
        const u = cleanErpNumber(r.unitPrice) || 0;
        const sup = q * u;
        const vat = cleanErpNumber(r.vatAmount) || Math.round(sup * 0.1);
        return {
          productId: Number(r.productId),
          itemName: prod ? prod.name : "판매 상품",
          spec: prod ? (prod.spec || "") : "",
          qty: q,
          unitPrice: u,
          supplyAmount: sup,
          vatAmount: vat,
        };
      });

      const optionPayloadItems =
        soSaleCategory === "FORKLIFT_SALE"
          ? soInstalledOptions.map((opt) => {
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

      const res = await fetch("/api/erp/trade/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: soEntityType,
          partnerId: soPartnerId,
          saleDate: soDate,
          customerName: soCustomer,
          saleCategory: soSaleCategory,
          siteName: soSiteName.trim() || null,
          chassisNumbers: cleanChassisList,
          installedOptions: soSaleCategory === "FORKLIFT_SALE" ? soInstalledOptions : [],
          warrantyMonths: soSaleCategory === "FORKLIFT_SALE" ? cleanErpNumber(soWarrantyMonths) : 0,
          warrantyHours: soSaleCategory === "FORKLIFT_SALE" ? cleanErpNumber(soWarrantyHours) : 0,
          productId: allPayloadItems[0].productId,
          qty: allPayloadItems.reduce((acc, it) => acc + it.qty, 0),
          unitPrice: allPayloadItems[0].unitPrice,
          vatAmount: allPayloadItems.reduce((acc, it) => acc + it.vatAmount, 0),
          items: allPayloadItems,
          memo: soMemo,
          contractFileUrl: soFileUrl || null,
          contractFileName: soFileName || null,
          customerBizNo: soTaxSpec.customerBizNo,
          customerCeoName: soTaxSpec.customerCeoName,
          customerAddress: soTaxSpec.customerAddress,
          customerBizType: soTaxSpec.customerBizType,
          customerBizClass: soTaxSpec.customerBizClass,
          customerEmail: soTaxSpec.customerEmail,
          customerEmail2: soTaxSpec.customerEmail2,
          taxPurpose: soTaxSpec.taxPurpose,
          taxMemo: soTaxSpec.taxMemo,
          taxItems: soTaxSpec.taxItems,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "판매 등록 실패");

      showToast(
        cleanChassisList.length > 0
          ? `판매 출고 완료 (차대번호 ${cleanChassisList.length}대 보증 자동등록)`
          : allPayloadItems.length > 1
            ? `판매 출고 계약(${allPayloadItems.length}종 항목 포함) 등록 완료`
            : `판매 출고 완료 (재고 차감 및 마진 산출)`
      );
      setShowAddSaleModal(false);
      setSoSaleCategory("FORKLIFT_SALE");
      setSoSiteName("");
      setSoChassisNumbers([""]);
      setSoInstalledOptions([]);
      setSoWarrantyMonths("12");
      setSoWarrantyHours("2,000");
      setSoPartnerId(null);
      setSoCustomer("");
      setSoItems([{ productId: "", qty: "1", unitPrice: "0", vatAmount: "0" }]);
      setSoMemo("");
      setSoFileUrl("");
      setSoFileName("");
      setSoTaxSpec(createDefaultTaxSpec("{1번째 아이템} 외", 0));
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Open Edit Sale Modal
  const handleOpenEditSale = (s: any) => {
    setEditSoId(s.id);
    setEditSoSaleNo(s.saleNo);
    setEditSoEntityType(s.entityType || "CORP");
    setEditSoPartnerId(s.partnerId || null);
    setEditSoCustomer(s.customerName);
    setEditSoProductId(String(s.productId || ""));
    setEditSoQty(toErpInputString(s.qty));
    setEditSoUnitPrice(toErpInputString(s.unitPrice));
    const baseSupply = Number(s.totalAmount || 0);
    const baseVat = s.vatAmount != null ? Number(s.vatAmount) : Math.round(baseSupply * 0.1);
    setEditSoVatAmount(toErpInputString(baseVat));
    setEditSoDate(s.saleDate ? String(s.saleDate).slice(0, 10) : "");
    setEditSoStatus(s.status || "SHIPPED");
    setEditSoMemo(s.memo || "");
    setEditSoFileUrl("");
    setEditSoFileName(s.contractFileName || "");

    const defSpec = createDefaultTaxSpec("{1번째 아이템} 외", baseSupply);
    setEditSoTaxSpec({
      customerBizNo: s.customerBizNo || "",
      customerCeoName: s.customerCeoName || "",
      customerAddress: s.customerAddress || "",
      customerBizType: s.customerBizType || "",
      customerBizClass: s.customerBizClass || "",
      customerEmail: s.customerEmail || "",
      customerEmail2: s.customerEmail2 || "",
      taxPurpose: s.taxPurpose === "영수" ? "영수" : "청구",
      taxMemo: s.taxMemo ?? "{1번째 아이템} 외",
      taxItems:
        Array.isArray(s.taxItems) && s.taxItems.length > 0
          ? s.taxItems
          : [
              {
                ...defSpec.taxItems[0],
                itemName: s.productName || "판매 상품",
                qty: Number(s.qty || 1),
                unitCost: Number(s.unitPrice || baseSupply),
                supplyAmount: baseSupply,
                vatAmount: baseVat,
              },
            ],
    });
    setShowEditSaleModal(true);
  };

  // Handle Update Sale
  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSoId) return;
    try {
      const res = await fetch("/api/erp/trade/sales", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editSoId,
          entityType: editSoEntityType,
          partnerId: editSoPartnerId,
          saleDate: editSoDate,
          customerName: editSoCustomer,
          productId: editSoProductId,
          qty: cleanErpNumber(editSoQty),
          unitPrice: cleanErpNumber(editSoUnitPrice),
          vatAmount: cleanErpNumber(editSoVatAmount),
          status: editSoStatus,
          memo: editSoMemo,
          contractFileUrl: editSoFileUrl || undefined,
          contractFileName: editSoFileName || undefined,
          customerBizNo: editSoTaxSpec.customerBizNo,
          customerCeoName: editSoTaxSpec.customerCeoName,
          customerAddress: editSoTaxSpec.customerAddress,
          customerBizType: editSoTaxSpec.customerBizType,
          customerBizClass: editSoTaxSpec.customerBizClass,
          customerEmail: editSoTaxSpec.customerEmail,
          customerEmail2: editSoTaxSpec.customerEmail2,
          taxPurpose: editSoTaxSpec.taxPurpose,
          taxMemo: editSoTaxSpec.taxMemo,
          taxItems: editSoTaxSpec.taxItems,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "판매 계약 수정 실패");

      showToast(`판매 계약 [${editSoSaleNo}] 수정 완료`);
      setShowEditSaleModal(false);
      if (editSoId) delete saleFileCacheRef.current[editSoId];
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Sale
  const handleDeleteSale = async (s: any) => {
    if (!window.confirm(`[판매 계약 삭제 확인]\n판매번호: ${s.saleNo}\n고객사: ${s.customerName}\n상품: ${s.productName}\n\n삭제 시 출고된 재고 수량이 복원됩니다. 정말 삭제하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/erp/trade/sales?id=${s.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "판매 계약 삭제 실패");

      showToast(data.message || `판매 [${s.saleNo}] 삭제 완료`);
      delete saleFileCacheRef.current[s.id];
      setSelectedSaleIds((prev) => prev.filter((id) => id !== s.id));
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 유통 판매 계약의 치환식({1번째 아이템} 외, {yymm} 등)을 평가하여 청구 폼에 적용하는 헬퍼
  const applyTradeSaleTemplateToBilling = (s: any, dateStr: string) => {
    if (!s) return;
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

    setBlSupplyAmount(toErpInputString(baseSupply));
    setBlVatAmount(toErpInputString(baseVat));
    setBlMilestoneName(resolvedMemo);
    setBlTaxSpec({
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
    });
  };

  // Open Billing Modal from Sale Contract (판매 계약 항목을 끌어다가 청구 생성)
  const handleOpenBillingFromSale = (s: any) => {
    const initialDate = s.saleDate ? String(s.saleDate).slice(0, 10) : new Date().toISOString().split("T")[0];
    setBlSaleId(String(s.id));
    setBlDate(initialDate);
    applyTradeSaleTemplateToBilling(s, initialDate);
    setShowAddBillingModal(true);
  };

  // Handle Add Trade Billing
  const handleAddBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blSaleId || !blSupplyAmount) {
      showToast("대상 판매 계약과 청구 공급가액은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/trade/billings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: blSaleId,
          billingDate: blDate,
          milestoneName: blMilestoneName || "물품대금 청구",
          supplyAmount: cleanErpNumber(blSupplyAmount),
          vatAmount: cleanErpNumber(blVatAmount),
          taxPurpose: blTaxSpec.taxPurpose,
          taxMemo: blTaxSpec.taxMemo,
          taxItems: blTaxSpec.taxItems,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "유통 청구 생성 실패");

      showToast(`유통 판매 계약 항목 기반 청구 생성 완료`);
      setShowAddBillingModal(false);
      setSubTab("billings");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Trade Billing
  const handleDeleteBilling = async (b: any) => {
    if (!window.confirm(`유통 청구번호 [${b.billingNo}] (${b.customerName} - ${formatErpCurrency(b.totalAmount)})\n해당 청구 내역을 삭제하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/erp/trade/billings?id=${b.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "청구 삭제 실패");

      showToast(data.message || "유통 청구 내역이 삭제되었습니다.");
      setSelectedBillingIds((prev) => prev.filter((id) => id !== b.id));
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Issue Tax Invoice from Trade Billing
  const handleIssueTaxFromTradeBilling = async (b: any) => {
    const corpLabel = b.entityType === "INDIVIDUAL" ? "드래곤알피에이 [개인]" : "(주)드래곤알피에이 [법인]";
    if (!window.confirm(`[${corpLabel} ➔ ${b.customerName}]\n청구번호: ${b.billingNo}\n공급가액 ${Number(b.supplyAmount).toLocaleString()}원 (세액 ${Number(b.vatAmount).toLocaleString()}원)\n전자세금계산서를 즉시 발행하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch("/api/erp/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "세금계산서 발행 실패");

      showToast(`세금계산서 [${data.invoice.invoice_no || data.invoice.invoiceNo}] 국세청 발행 완료!`);
      await fetchData();
      if (onNavigateToTax) onNavigateToTax();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 여러 유통계약을 선택하여 1건의 묶음 청구 생성
  const handleCreateConsolidatedBillingFromSales = async () => {
    const selectedSales = sales.filter((s) => selectedSaleIds.includes(s.id));
    if (selectedSales.length === 0) {
      showToast("묶음 청구를 생성할 유통계약을 선택해 주십시오.", "error");
      return;
    }
    const customerSet = new Set(selectedSales.map((s) => (s.customerName || "").trim()));
    if (customerSet.size > 1) {
      showToast("동일 고객사의 유통계약만 묶어서 1건의 청구로 생성할 수 있습니다.", "error");
      return;
    }
    const totalSupply = selectedSales.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);
    const totalVat = selectedSales.reduce((acc, s) => acc + Number(s.vatAmount || Math.round(Number(s.totalAmount || 0) * 0.1)), 0);
    const customerName = selectedSales[0].customerName;

    if (!window.confirm(`[선택 계약 묶음 청구 생성]\n고객사: ${customerName}\n선택 계약: ${selectedSales.length}건 (${selectedSales.map((s) => s.saleNo).join(", ")})\n합산 공급가액: ${formatErpCurrency(totalSupply)} (세액 ${formatErpCurrency(totalVat)})\n\n선택한 계약들을 합쳐 1건의 묶음 청구서를 생성하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch("/api/erp/trade/billings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleIds: selectedSaleIds,
          billingDate: new Date().toISOString().split("T")[0],
          milestoneName: "{1번째 아이템} 외",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "묶음 청구 생성 실패");

      showToast(data.message || `${selectedSales.length}건의 유통계약이 1건의 묶음 청구로 생성되었습니다.`);
      setSelectedSaleIds([]);
      setSubTab("billings");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 여러 유통 청구건을 선택하여 고객사별 1장의 세금계산서로 묶음(합산) 발행
  const handleIssueConsolidatedTaxFromBillings = async () => {
    const selectedBills = billings.filter((b) => selectedBillingIds.includes(b.id) && !b.taxInvoiceId);
    if (selectedBills.length === 0) {
      showToast("묶음 발행할 미발행 청구건을 선택해 주십시오.", "error");
      return;
    }
    const totalSupply = selectedBills.reduce((acc, b) => acc + Number(b.supplyAmount || 0), 0);
    const totalVat = selectedBills.reduce((acc, b) => acc + Number(b.vatAmount || 0), 0);
    const customers = Array.from(new Set(selectedBills.map((b) => b.customerName)));

    if (!window.confirm(`[여러 계약의 청구 묶음 세금계산서 발행]\n선택 청구: ${selectedBills.length}건\n대상 고객사: ${customers.join(", ")} (고객사별 1장으로 합산 발행)\n총 공급가액: ${formatErpCurrency(totalSupply)} (세액 ${formatErpCurrency(totalVat)})\n\n선택한 청구건들을 묶어서 전자세금계산서를 발행하시겠습니까?`)) {
      return;
    }

    try {
      const payloadBillings = selectedBills.map((b) => ({
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

      const res = await fetch("/api/erp/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchIssue: true,
          consolidate: true,
          billings: payloadBillings,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "묶음 세금계산서 발행 실패");

      showToast(data.message || "선택 청구건 묶음 세금계산서 발행 완료!");
      setSelectedBillingIds([]);
      await fetchData();
      if (onNavigateToTax) onNavigateToTax();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-[#ebe5d8] text-[#0f172a] overflow-hidden font-sans dark:bg-slate-950 dark:text-slate-100">
      {toast && (
        <div className={`fixed top-16 right-5 z-50 px-4 py-2 rounded text-xs font-bold text-white shadow-xl ${
          toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-[#b5a894] dark:border-slate-800 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              setSubTab("inventory");
              setSortKey("");
              setSortDir(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              subTab === "inventory"
                ? "bg-[#1d4ed8] text-white shadow"
                : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>유통재고 현황 ({products.filter((p) => Number(p.current_stock || 0) > 0).length})</span>
          </button>
          <button
            onClick={() => {
              setSubTab("products");
              setSortKey("");
              setSortDir(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              subTab === "products" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>상품 마스터 ({products.length})</span>
          </button>
          <button
            onClick={() => {
              setSubTab("purchases");
              setSortKey("");
              setSortDir(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              subTab === "purchases" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>구매 / 입고 대장 ({purchases.length})</span>
          </button>
          <button
            onClick={() => {
              setSubTab("sales");
              setSortKey("");
              setSortDir(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              subTab === "sales" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>유통/판매 계약 대장 ({sales.length})</span>
          </button>
          <button
            onClick={() => {
              setSubTab("billings");
              setSortKey("");
              setSortDir(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              subTab === "billings" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>유통 청구 & 세금계산서 ({billings.length})</span>
          </button>
          <button
            onClick={() => {
              setSubTab("settlement");
              setSortKey("");
              setSortDir(null);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              subTab === "settlement" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>기간별 매출정산</span>
          </button>
        </div>

        {/* Action Buttons (Pipeline) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#78716c] dark:text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="품목·거래처 통합검색 (초성)"
              className="h-8 w-48 sm:w-56 pl-8 pr-7 bg-[#ebe5d8] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded text-xs text-[#0f172a] dark:text-white placeholder-[#78716c] focus:outline-none focus:border-blue-600"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 text-[#78716c] hover:text-[#0f172a] dark:hover:text-white"
                title="검색어 초기화"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {(subTab === "inventory" || subTab === "products") && (
            <button
              onClick={() => {
                resetProductForm();
                setShowAddProductModal(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>상품 등록</span>
            </button>
          )}
          {(subTab === "inventory" || subTab === "purchases") && (
            <button
              onClick={() => setShowAddPurchaseModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>구매 입고 등록</span>
            </button>
          )}
          {subTab === "sales" && (
            <>
              {canBill && selectedSaleIds.length > 0 && (
                <button
                  onClick={handleCreateConsolidatedBillingFromSales}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>선택 계약({selectedSaleIds.length}건) 묶음 청구 생성</span>
                </button>
              )}
              {canBill && (
                <button
                  onClick={() => setShowAddBillingModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>계약 기반 청구 생성</span>
                </button>
              )}
              <button
                onClick={() => setShowAddSaleModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>판매 계약 등록 (다중제품)</span>
              </button>
            </>
          )}
          {subTab === "billings" && canBill && (
            <>
              {selectedBillingIds.length > 0 && (
                <button
                  onClick={handleIssueConsolidatedTaxFromBillings}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>선택 청구({selectedBillingIds.length}건) 묶음 세금계산서 발행</span>
                </button>
              )}
              <button
                onClick={() => setShowAddBillingModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>유통 청구서 생성</span>
              </button>
            </>
          )}
          <button
            onClick={fetchData}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Scope / Filter Bar (Z-Pattern ①: 상하 스택 레이아웃 & 무수식어 건조한 명사) */}
      {(subTab === "inventory" || subTab === "products" || subTab === "purchases") && (
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
                      onClick={() => {
                        setInventoryViewMode("SUMMARY");
                        setSortKey("");
                        setSortDir(null);
                      }}
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
                      onClick={() => {
                        setInventoryViewMode("LOT");
                        setSortKey("");
                        setSortDir(null);
                      }}
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
                    onChange={(e) => setStockScopeFilter(e.target.value as any)}
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
                  onChange={(e) => {
                    setProdItemClassFilter(e.target.value as any);
                    setCategoryFilter("ALL");
                  }}
                  className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-xs font-semibold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  <option value="ALL">전체 ({products.length})</option>
                  {FORKLIFT_ITEM_CLASS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({products.filter((p) => normalizeItemClass(p.item_class, p.category) === opt.value).length})
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
                  onChange={(e) => setCategoryFilter(e.target.value)}
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
                  onFreeTextChange={setManufacturerFilter}
                  onChange={(val) => setManufacturerFilter(val)}
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
                  onFreeTextChange={setModelFilter}
                  onChange={(val) => setModelFilter(val)}
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
                      onChange={(e) => setMinElapsedDaysInput(e.target.value.replace(/[^0-9]/g, ""))}
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
                      onChange={(e) => setMaxElapsedDaysInput(e.target.value.replace(/[^0-9]/g, ""))}
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
                  {[
                    { label: "전체", min: "", max: "" },
                    { label: "30일 이하", min: "", max: "30" },
                    { label: "30일 이상", min: "30", max: "" },
                    { label: "60일 이상", min: "60", max: "" },
                    { label: "90일 이상", min: "90", max: "" },
                  ].map((preset) => {
                    const active =
                      minElapsedDaysInput === preset.min && maxElapsedDaysInput === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setMinElapsedDaysInput(preset.min);
                          setMaxElapsedDaysInput(preset.max);
                        }}
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
                      onClick={clearTradeFilters}
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
                ? `기준일 ${inventoryRefDate} | 조회 ${inventoryViewMode === "SUMMARY" ? sortedInventorySummary.length : sortedInventoryLots.length}건`
                : subTab === "products"
                  ? `조회 ${sortedProducts.length}건`
                  : `조회 ${sortedPurchases.length}건`}
            </div>
          </div>
        </div>
      )}

      {subTab === "settlement" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-semibold">정산 시작일자</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-xs text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-semibold">정산 종료일자</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-xs text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchData}
              className="w-full h-8 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs"
            >
              기간 정산 조회
            </button>
          </div>
        </div>
      )}

      {/* Main Inspection Grid (Z-Pattern ③) */}
      <div className="flex-1 bg-[#f4efe4] border border-[#b5a894] rounded overflow-auto shadow-inner dark:bg-slate-900 dark:border-slate-800 flex flex-col">
        {subTab === "inventory" && (
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
                        <td colSpan={14} className="py-10 text-center text-[#78716c] dark:text-slate-500">
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
                        const agingBadge =
                          tier === "LONG_TERM"
                            ? "bg-rose-500/15 text-rose-700 border-rose-500/40 dark:text-rose-300"
                            : tier === "CAUTION"
                              ? "bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-300"
                              : tier === "WATCH"
                                ? "bg-blue-500/15 text-blue-700 border-blue-500/40 dark:text-blue-300"
                                : tier === "NORMAL"
                                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-300"
                                  : "bg-[#e2dbcd] text-[#64748b] border-[#b5a894] dark:bg-slate-800 dark:text-slate-400";
                        return (
                          <tr key={p.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPoProductId(String(p.id));
                                    setPoUnitCost(formatErpInputNumber(String(Number(p.standard_cost || 0))));
                                    setShowAddPurchaseModal(true);
                                  }}
                                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] whitespace-nowrap"
                                >
                                  입고
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditTradeProduct(p)}
                                  className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] whitespace-nowrap"
                                >
                                  수정
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-3 font-mono text-[#334155] dark:text-slate-300">{p.sku_code}</td>
                            <td className="py-2 px-3">{getItemClassLabel(ic)}</td>
                            <td className="py-2 px-3 text-[#334155] dark:text-slate-300">{p.category || "-"}</td>
                            <td className="py-2 px-3 font-semibold text-[#0f172a] dark:text-slate-200">{p.manufacturer || "-"}</td>
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
                              {p.part_no && <span className="ml-1 font-mono text-[10px]">[{p.part_no}]</span>}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-[#0f172a] dark:text-slate-200">
                              {p.oldest_inbound_date || "-"}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-[#57534e] dark:text-slate-400">
                              {p.latest_inbound_date || "-"}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {elapsed !== null && elapsed !== undefined ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-bold text-[11px] ${agingBadge}`}>
                                  {formatErpNumber(elapsed)}일
                                </span>
                              ) : (
                                <span className="text-[#78716c]">-</span>
                              )}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono font-bold ${isLowStock ? "text-rose-700 dark:text-rose-400" : "text-[#0f172a] dark:text-slate-100"}`}>
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
                        <td colSpan={13} className="py-10 text-center text-[#78716c] dark:text-slate-500">
                          조회 조건에 해당하는 입고 로트가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      sortedInventoryLots.map((lot) => {
                        const agingBadge =
                          lot.agingTier === "LONG_TERM"
                            ? "bg-rose-500/15 text-rose-700 border-rose-500/40 dark:text-rose-300"
                            : lot.agingTier === "CAUTION"
                              ? "bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-300"
                              : lot.agingTier === "WATCH"
                                ? "bg-blue-500/15 text-blue-700 border-blue-500/40 dark:text-blue-300"
                                : "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-300";
                        const targetProd = products.find((p) => Number(p.id) === Number(lot.productId));
                        return (
                          <tr key={lot.lotKey} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              {targetProd && (
                                <button
                                  type="button"
                                  onClick={() => openEditTradeProduct(targetProd)}
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
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-bold text-[11px] ${agingBadge}`}>
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
                              {lot.partNo && <span className="ml-1 font-mono text-[10px]">[{lot.partNo}]</span>}
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
                대상 <strong>{formatErpNumber(inventoryStats.rowCount)}</strong>{inventoryViewMode === "SUMMARY" ? "종" : "건"}
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
        )}

        {subTab === "products" && (
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
                  const badgeStyle =
                    ic === "FORKLIFT"
                      ? "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300"
                      : ic === "OPTION"
                        ? "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300"
                        : ic === "PART"
                          ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300"
                          : "bg-[#e2dbcd] text-[#334155] border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
                  return (
                    <tr key={p.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => openEditTradeProduct(p)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 border border-blue-700 text-white font-bold text-[11px] shadow-xs transition"
                        >
                          <Edit className="w-3 h-3" />
                          <span>수정</span>
                        </button>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${badgeStyle}`}>
                          {getItemClassLabel(ic)}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100">{p.name}</td>
                      <td className="py-2 px-3 text-[#334155] dark:text-slate-300">
                        <span>{p.manufacturer || "-"}</span>
                        {p.part_no && (
                          <span className="ml-1.5 font-mono text-[10px] text-[#57534e] dark:text-slate-400">
                            [{p.part_no}]
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[#334155] dark:text-slate-300">{p.category}</td>
                      <td className="py-2 px-3 text-[#57534e] dark:text-slate-400">
                        <div>{p.spec || "-"}</div>
                        {ic === "OPTION" && (Number(p.install_fee || 0) > 0 || Number(p.addon_monthly_rate || 0) > 0) && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                            공임 {formatErpCurrency(Number(p.install_fee || 0))} / 렌탈월 +{formatErpCurrency(Number(p.addon_monthly_rate || 0))}
                          </div>
                        )}
                        {ic === "FORKLIFT" && Number(p.warranty_months || 0) > 0 && (
                          <div className="text-[10px] text-blue-700 dark:text-blue-300 font-mono">
                            보증 {p.warranty_months}개월 / {formatErpNumber(p.warranty_hours || 0)}hr
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center text-[#57534e] dark:text-slate-400">{p.unit}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#0f172a] dark:text-slate-100">
                        {formatErpQty(Number(p.current_stock || 0), p.unit)}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-[#334155] dark:text-slate-300">
                        {p.oldest_inbound_date || "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#334155] dark:text-slate-300">
                        {p.elapsed_days !== null && p.elapsed_days !== undefined ? `${formatErpNumber(p.elapsed_days)}일` : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#334155] dark:text-slate-300">{formatErpCurrency(cost)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#0f172a] dark:text-slate-100">{formatErpCurrency(price)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400">
                        {formatErpCurrency(margin)} ({marginRate}%)
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                            : "bg-[#e2dbcd] text-[#57534e] dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {p.status === "ACTIVE" ? "판매중" : "단종"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

      <PurchasesSubTab
        renderSortTh={renderSortTh}
        sortedPurchases={sortedPurchases}
        subTab={subTab}
      />

      <SalesSubTab
        canBill={canBill}
        handleDeleteSale={handleDeleteSale}
        handleOpenBillingFromSale={handleOpenBillingFromSale}
        handleOpenEditSale={handleOpenEditSale}
        handleOpenSaleFile={handleOpenSaleFile}
        renderSortTh={renderSortTh}
        selectedSaleIds={selectedSaleIds}
        setSelectedSaleIds={setSelectedSaleIds}
        sortedSales={sortedSales}
        subTab={subTab}
      />

      <BillingsSubTab
        handleDeleteBilling={handleDeleteBilling}
        handleIssueTaxFromTradeBilling={handleIssueTaxFromTradeBilling}
        renderSortTh={renderSortTh}
        selectedBillingIds={selectedBillingIds}
        setSelectedBillingIds={setSelectedBillingIds}
        sortedBillings={sortedBillings}
        subTab={subTab}
      />

      <SettlementSubTab
        renderSortTh={renderSortTh}
        settlementSummary={settlementSummary}
        sortedCustomerBreakdown={sortedCustomerBreakdown}
        subTab={subTab}
      />
      </div>

      {/* Modal: Add / Edit Product */}
      <ProductModal
        editProdId={editProdId}
        handleAddProduct={handleAddProduct}
        prodAddonDaily={prodAddonDaily}
        prodAddonMonthly={prodAddonMonthly}
        prodCategory={prodCategory}
        prodInboundDate={prodInboundDate}
        prodInitialStock={prodInitialStock}
        prodInstallFee={prodInstallFee}
        prodItemClass={prodItemClass}
        prodManufacturer={prodManufacturer}
        prodName={prodName}
        prodPartNo={prodPartNo}
        prodSafetyStock={prodSafetyStock}
        prodSpec={prodSpec}
        prodSpecData={prodSpecData}
        prodStandardCost={prodStandardCost}
        prodStandardPrice={prodStandardPrice}
        prodUnit={prodUnit}
        prodWarrantyHours={prodWarrantyHours}
        prodWarrantyMonths={prodWarrantyMonths}
        setEditProdId={setEditProdId}
        setProdAddonDaily={setProdAddonDaily}
        setProdAddonMonthly={setProdAddonMonthly}
        setProdCategory={setProdCategory}
        setProdInboundDate={setProdInboundDate}
        setProdInitialStock={setProdInitialStock}
        setProdInstallFee={setProdInstallFee}
        setProdItemClass={setProdItemClass}
        setProdManufacturer={setProdManufacturer}
        setProdName={setProdName}
        setProdPartNo={setProdPartNo}
        setProdSafetyStock={setProdSafetyStock}
        setProdSpec={setProdSpec}
        setProdSpecData={setProdSpecData}
        setProdStandardCost={setProdStandardCost}
        setProdStandardPrice={setProdStandardPrice}
        setProdUnit={setProdUnit}
        setProdWarrantyHours={setProdWarrantyHours}
        setProdWarrantyMonths={setProdWarrantyMonths}
        setShowAddProductModal={setShowAddProductModal}
        setShowEditProductModal={setShowEditProductModal}
        setSkuCode={setSkuCode}
        showAddProductModal={showAddProductModal}
        showEditProductModal={showEditProductModal}
        skuCode={skuCode}
      />

      {/* Modal: Add Purchase */}
      <PurchaseModal
        handleAddPurchase={handleAddPurchase}
        poDate={poDate}
        poInputMode={poInputMode}
        poProductId={poProductId}
        poQty={poQty}
        poSplitPreview={poSplitPreview}
        poTotalInput={poTotalInput}
        poUnitCost={poUnitCost}
        poVatIncluded={poVatIncluded}
        poVendor={poVendor}
        products={products}
        setPoDate={setPoDate}
        setPoInputMode={setPoInputMode}
        setPoProductId={setPoProductId}
        setPoQty={setPoQty}
        setPoTotalInput={setPoTotalInput}
        setPoUnitCost={setPoUnitCost}
        setPoVatIncluded={setPoVatIncluded}
        setPoVendor={setPoVendor}
        setShowAddPurchaseModal={setShowAddPurchaseModal}
        showAddPurchaseModal={showAddPurchaseModal}
        tradeProductOptions={tradeProductOptions}
        vendorPartnerOptions={vendorPartnerOptions}
      />

      {/* Modal: Add Sale */}
      <AddSaleModal
        customerPartnerOptions={customerPartnerOptions}
        customerPartners={customerPartners}
        handleAddSale={handleAddSale}
        handleSaleFileUpload={handleSaleFileUpload}
        handleSelectSaleCustomer={handleSelectSaleCustomer}
        products={products}
        setShowAddSaleModal={setShowAddSaleModal}
        setSoChassisNumbers={setSoChassisNumbers}
        setSoCustomer={setSoCustomer}
        setSoDate={setSoDate}
        setSoEntityType={setSoEntityType}
        setSoFileName={setSoFileName}
        setSoFileUrl={setSoFileUrl}
        setSoInstalledOptions={setSoInstalledOptions}
        setSoItems={setSoItems}
        setSoPartnerId={setSoPartnerId}
        setSoQty={setSoQty}
        setSoSaleCategory={setSoSaleCategory}
        setSoSiteName={setSoSiteName}
        setSoTaxSpec={setSoTaxSpec}
        setSoUnitPrice={setSoUnitPrice}
        setSoVatAmount={setSoVatAmount}
        setSoWarrantyHours={setSoWarrantyHours}
        setSoWarrantyMonths={setSoWarrantyMonths}
        showAddSaleModal={showAddSaleModal}
        soChassisNumbers={soChassisNumbers}
        soCustomer={soCustomer}
        soDate={soDate}
        soEntityType={soEntityType}
        soFileInputRef={soFileInputRef}
        soFileName={soFileName}
        soInstalledOptions={soInstalledOptions}
        soItems={soItems}
        soPartnerId={soPartnerId}
        soSaleCategory={soSaleCategory}
        soSiteName={soSiteName}
        soTaxSpec={soTaxSpec}
        soWarrantyHours={soWarrantyHours}
        soWarrantyMonths={soWarrantyMonths}
        syncSoItemsToTaxSpec={syncSoItemsToTaxSpec}
        tradeOptionCatalog={tradeOptionCatalog}
        tradeProductOptions={tradeProductOptions}
      />

      {/* Modal: Edit Sale */}
      <EditSaleModal
        editSoCustomer={editSoCustomer}
        editSoDate={editSoDate}
        editSoEntityType={editSoEntityType}
        editSoFileInputRef={editSoFileInputRef}
        editSoFileName={editSoFileName}
        editSoQty={editSoQty}
        editSoSaleNo={editSoSaleNo}
        editSoTaxSpec={editSoTaxSpec}
        editSoUnitPrice={editSoUnitPrice}
        editSoVatAmount={editSoVatAmount}
        handleSaleFileUpload={handleSaleFileUpload}
        handleUpdateSale={handleUpdateSale}
        setEditSoCustomer={setEditSoCustomer}
        setEditSoDate={setEditSoDate}
        setEditSoEntityType={setEditSoEntityType}
        setEditSoQty={setEditSoQty}
        setEditSoTaxSpec={setEditSoTaxSpec}
        setEditSoUnitPrice={setEditSoUnitPrice}
        setEditSoVatAmount={setEditSoVatAmount}
        setShowEditSaleModal={setShowEditSaleModal}
        showEditSaleModal={showEditSaleModal}
      />

      {/* Add Trade Billing Modal (Pull from Sale Contract) */}
      <AddBillingModal
        applyTradeSaleTemplateToBilling={applyTradeSaleTemplateToBilling}
        blDate={blDate}
        blMilestoneName={blMilestoneName}
        blSaleId={blSaleId}
        blSupplyAmount={blSupplyAmount}
        blTaxSpec={blTaxSpec}
        blVatAmount={blVatAmount}
        handleAddBilling={handleAddBilling}
        sales={sales}
        setBlDate={setBlDate}
        setBlMilestoneName={setBlMilestoneName}
        setBlSaleId={setBlSaleId}
        setBlSupplyAmount={setBlSupplyAmount}
        setBlTaxSpec={setBlTaxSpec}
        setBlVatAmount={setBlVatAmount}
        setShowAddBillingModal={setShowAddBillingModal}
        showAddBillingModal={showAddBillingModal}
        tradeSaleOptions={tradeSaleOptions}
      />

      {/* Document Viewer Modal */}
      {activeDocViewer && (
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
                <button
                  onClick={() => setActiveDocViewer(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
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
      )}
    </div>
  );
};
