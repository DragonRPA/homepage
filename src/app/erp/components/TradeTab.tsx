"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Package, Plus, ShoppingCart, TrendingUp, RefreshCw,
  Search, DollarSign, Layers, CheckCircle2, X,
} from "lucide-react";
import {
  formatErpCurrency, formatErpInputNumber, toErpInputString, cleanErpNumber,
} from "@/lib/erpFormat";
import { sortCustomersByName } from "@/lib/hangulSearch";
import {
  getItemClassLabel, normalizeItemClass, parseForkliftSpecData,
  type ForkliftItemClass, type ForkliftSpecData, type AttachedForkliftOption,
} from "@/lib/forkliftDomain";
import { getTodayKstDateString } from "@/lib/tradeInventoryDomain";
import { SortableTh, useErpTableSort } from "./SortableTh";
import { type BuyerTaxSpec, createDefaultTaxSpec, extractPartnerTaxSpec } from "./ContractTaxInvoiceSection";
import { findBlockedPartnerMatch, getPartnerTradeBlockInfo } from "@/lib/partnerStatusClient";
import {
  PurchasesSubTab, SalesSubTab, BillingsSubTab, SettlementSubTab,
} from "./trade/TradeSalesBillingSubTabs";
import {
  TradeScopeFilterBar, TradeInventorySubTab, TradeProductsSubTab, TradeDocViewerModal,
} from "./trade/TradeInventoryAndProductsSubTabs";
import {
  buildConsolidatedTaxBillingPayload, buildCustomerPartnerOptions, buildProductFilterMetadata,
  buildProductUpsertPayload, buildSortedBillings, buildSortedCustomerBreakdown,
  buildSortedInventoryLots, buildSortedPurchases, buildSortedSales,
  buildTradeBillingTemplateValues, buildTradeInventorySummaryRows, buildTradeOptionCatalog,
  buildTradeProductOptions, buildTradeSaleCreatePayload, buildTradeSaleOptions,
  buildTradeSaleTaxSpecSync, buildTradeTaxInvoiceIssuePayload, buildVendorPartnerOptions,
  computeTradeInventoryStats, requestTradeJson, splitPurchaseIntoIntegerUnitRows,
  type TradeDocViewerState, type TradeEntityFilter, type TradeInventoryViewMode,
  type TradeSaleCategory, type TradeSaleItemDraft, type TradeStockScopeFilter, type TradeSubTabKey,
} from "./trade/tradeHelpers";

const ProductModal = dynamic(
  () => import("./trade/TradeProductPurchaseModals").then((m) => m.ProductModal),
  { ssr: false }
);
const PurchaseModal = dynamic(
  () => import("./trade/TradeProductPurchaseModals").then((m) => m.PurchaseModal),
  { ssr: false }
);
const AddSaleModal = dynamic(
  () => import("./trade/TradeSaleBillingModals").then((m) => m.AddSaleModal),
  { ssr: false }
);
const EditSaleModal = dynamic(
  () => import("./trade/TradeSaleBillingModals").then((m) => m.EditSaleModal),
  { ssr: false }
);
const AddBillingModal = dynamic(
  () => import("./trade/TradeSaleBillingModals").then((m) => m.AddBillingModal),
  { ssr: false }
);

interface TradeTabProps {
  currentUser: any;
  selectedEntity?: TradeEntityFilter;
  onNavigateToTax?: () => void;
}

export const TradeTab: React.FC<TradeTabProps> = ({
  currentUser,
  selectedEntity = "ALL",
  onNavigateToTax,
}) => {
  const canBill =
    currentUser?.roleCode === "ADMIN" ||
    currentUser?.loginId === "admin" ||
    Boolean(currentUser?.canBill);
  const [subTab, setSubTab] = useState<TradeSubTabKey>("inventory");
  const [loading, setLoading] = useState(false);

  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [inventoryLots, setInventoryLots] = useState<any[]>([]);
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
  const [inventoryViewMode, setInventoryViewMode] = useState<TradeInventoryViewMode>("SUMMARY");
  const [stockScopeFilter, setStockScopeFilter] = useState<TradeStockScopeFilter>("IN_STOCK");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("");
  const [modelFilter, setModelFilter] = useState<string>("");
  const [minElapsedDaysInput, setMinElapsedDaysInput] = useState<string>("");
  const [maxElapsedDaysInput, setMaxElapsedDaysInput] = useState<string>("");

  // Sorting State (전사 3단계 순환: 오름차순 ➔ 내림차순 ➔ 정렬안함)
  const { sortKey, sortDir, handleSort, resetSort } = useErpTableSort();
  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => (
    <SortableTh
      label={label} colKey={key} sortKey={sortKey} sortDir={sortDir}
      onSort={handleSort} align={align} className="py-2.5 px-3"
    />
  );

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [showAddBillingModal, setShowAddBillingModal] = useState(false);
  const [activeDocViewer, setActiveDocViewer] = useState<TradeDocViewerState | null>(null);
  const saleFileCacheRef = useRef<Record<number, { url: string; fileName: string }>>({});

  // Trade Billing Form (계약 항목 끌어다가 청구 생성)
  const [blSaleId, setBlSaleId] = useState("");
  const [blDate, setBlDate] = useState(new Date().toISOString().split("T")[0]);
  const [blMilestoneName, setBlMilestoneName] = useState("");
  const [blSupplyAmount, setBlSupplyAmount] = useState("0");
  const [blVatAmount, setBlVatAmount] = useState("0");
  const [blTaxSpec, setBlTaxSpec] = useState<BuyerTaxSpec>(() => createDefaultTaxSpec("판매 물품", 0));

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

  const poSplitPreview = useMemo(
    () => splitPurchaseIntoIntegerUnitRows({
      inputMode: poInputMode, vatIncluded: poVatIncluded,
      qtyInput: poQty, unitCostInput: poUnitCost, totalInput: poTotalInput,
    }),
    [poInputMode, poVatIncluded, poQty, poUnitCost, poTotalInput]
  );

  // Add Sale Form (Multi-product per outbound contract)
  const [soSaleCategory, setSoSaleCategory] = useState<TradeSaleCategory>("FORKLIFT_SALE");
  const [soSiteName, setSoSiteName] = useState("");
  const [soChassisNumbers, setSoChassisNumbers] = useState<string[]>([""]);
  const [soInstalledOptions, setSoInstalledOptions] = useState<AttachedForkliftOption[]>([]);
  const [soWarrantyMonths, setSoWarrantyMonths] = useState("12");
  const [soWarrantyHours, setSoWarrantyHours] = useState("2,000");
  const [soPartnerId, setSoPartnerId] = useState<number | null>(null);
  const [soCustomer, setSoCustomer] = useState("");
  const [, setSoProductId] = useState("");
  const [, setSoQty] = useState("1");
  const [, setSoUnitPrice] = useState("0");
  const [, setSoVatAmount] = useState("0");
  const [soItems, setSoItems] = useState<TradeSaleItemDraft[]>([
    { productId: "", qty: "1", unitPrice: "0", vatAmount: "0" },
  ]);
  const [soDate, setSoDate] = useState(new Date().toISOString().split("T")[0]);
  const [soMemo, setSoMemo] = useState("");
  const [soTaxSpec, setSoTaxSpec] = useState<BuyerTaxSpec>(() => createDefaultTaxSpec("{1번째 아이템} 외", 0));
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
  const [editSoTaxSpec, setEditSoTaxSpec] = useState<BuyerTaxSpec>(() => createDefaultTaxSpec("판매 상품", 0));
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
      const entityQ = selectedEntity && selectedEntity !== "ALL" ? `?entityType=${selectedEntity}` : "";
      const [prodRes, purRes, saleRes, billRes, setRes, partRes] = await Promise.all([
        fetch("/api/erp/trade/products", { cache: "no-store" }),
        fetch("/api/erp/trade/purchases", { cache: "no-store" }),
        fetch(`/api/erp/trade/sales${entityQ}`, { cache: "no-store" }),
        fetch(`/api/erp/trade/billings${entityQ}`, { cache: "no-store" }),
        fetch(`/api/erp/trade/settlement?startDate=${startDate}&endDate=${endDate}`, { cache: "no-store" }),
        fetch("/api/erp/partners?type=ALL", { cache: "no-store" }),
      ]);
      const [pData, puData, sData, bData, seData, partData] = await Promise.all([
        prodRes.json(), purRes.json(), saleRes.json(), billRes.json(), setRes.json(), partRes.json(),
      ]);
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

  const productFilterMetadata = useMemo(
    () => buildProductFilterMetadata(products, prodItemClassFilter, categoryFilter, manufacturerFilter),
    [products, prodItemClassFilter, categoryFilter, manufacturerFilter]
  );

  const clearTradeFilters = () => {
    setProdItemClassFilter("ALL");
    setCategoryFilter("ALL");
    setManufacturerFilter("");
    setModelFilter("");
    setMinElapsedDaysInput("");
    setMaxElapsedDaysInput("");
    setSearchTerm("");
    if (subTab === "inventory") setStockScopeFilter("IN_STOCK");
  };

  const hasActiveTradeFilters =
    prodItemClassFilter !== "ALL" || categoryFilter !== "ALL" || manufacturerFilter.trim() !== "" ||
    modelFilter.trim() !== "" || minElapsedDaysInput.trim() !== "" || maxElapsedDaysInput.trim() !== "" ||
    searchTerm.trim() !== "";

  const filterCriteriaBase = useMemo(
    () => ({
      minElapsedDaysInput, maxElapsedDaysInput, prodItemClassFilter, categoryFilter,
      manufacturerFilter, modelFilter, searchTerm, sortKey, sortDir,
    }),
    [minElapsedDaysInput, maxElapsedDaysInput, prodItemClassFilter, categoryFilter, manufacturerFilter, modelFilter, searchTerm, sortKey, sortDir]
  );

  const sortedInventorySummary = useMemo(
    () => buildTradeInventorySummaryRows(products, { ...filterCriteriaBase, stockScopeFilter }),
    [products, filterCriteriaBase, stockScopeFilter]
  );
  const sortedInventoryLots = useMemo(
    () => buildSortedInventoryLots(inventoryLots, { ...filterCriteriaBase, stockScopeFilter }),
    [inventoryLots, filterCriteriaBase, stockScopeFilter]
  );
  const inventoryStats = useMemo(
    () => computeTradeInventoryStats(inventoryViewMode, sortedInventorySummary, sortedInventoryLots),
    [inventoryViewMode, sortedInventorySummary, sortedInventoryLots]
  );
  const sortedProducts = useMemo(
    () => buildTradeInventorySummaryRows(products, { ...filterCriteriaBase, stockScopeFilter: "ALL" }),
    [products, filterCriteriaBase]
  );
  const tradeOptionCatalog = useMemo(() => buildTradeOptionCatalog(products), [products]);

  const resetProductForm = () => {
    setEditProdId(null); setProdItemClass("FORKLIFT"); setSkuCode(""); setProdName("");
    setProdManufacturer("두산"); setProdCategory("지게차 완제품"); setProdSpec(""); setProdSpecData({});
    setProdPartNo(""); setProdInstallFee("0"); setProdAddonMonthly("0"); setProdAddonDaily("0");
    setProdWarrantyMonths("12"); setProdWarrantyHours("2,000"); setProdUnit("EA");
    setProdStandardCost("0"); setProdStandardPrice("0"); setProdSafetyStock("10");
    setProdInitialStock("0"); setProdInboundDate(getTodayKstDateString());
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

  const sortedPurchases = useMemo(
    () => buildSortedPurchases(purchases, products, filterCriteriaBase),
    [purchases, products, filterCriteriaBase]
  );
  const sortedSales = useMemo(
    () => buildSortedSales(sales, searchTerm, sortKey, sortDir),
    [sales, searchTerm, sortKey, sortDir]
  );
  const sortedBillings = useMemo(
    () => buildSortedBillings(billings, searchTerm, sortKey, sortDir),
    [billings, searchTerm, sortKey, sortDir]
  );
  const sortedCustomerBreakdown = useMemo(
    () => buildSortedCustomerBreakdown(customerBreakdown, searchTerm, sortKey, sortDir),
    [customerBreakdown, searchTerm, sortKey, sortDir]
  );

  const customerPartners = useMemo(
    () => sortCustomersByName(registeredPartners.filter((p) => p.partnerType === "CUSTOMER" || p.partnerType === "BOTH")),
    [registeredPartners]
  );
  const vendorPartners = useMemo(
    () => sortCustomersByName(registeredPartners.filter((p) => p.partnerType === "VENDOR" || p.partnerType === "BOTH")),
    [registeredPartners]
  );
  const vendorPartnerOptions = useMemo(() => buildVendorPartnerOptions(vendorPartners), [vendorPartners]);
  const customerPartnerOptions = useMemo(() => buildCustomerPartnerOptions(customerPartners), [customerPartners]);
  const tradeProductOptions = useMemo(() => buildTradeProductOptions(products), [products]);
  const tradeSaleOptions = useMemo(() => buildTradeSaleOptions(sales), [sales]);

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
        title: `${s.saleNo} 판매 계약서/발주서`, customerName: s.customerName,
        url: cached.url, fileName: cached.fileName,
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
          title: `${s.saleNo} 판매 계약서/발주서`, customerName: s.customerName,
          url: entry.url, fileName: entry.fileName,
        });
      } else {
        showToast("등록된 계약서 파일을 찾을 수 없습니다.", "error");
      }
    } catch {
      showToast("파일 조회 실패", "error");
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showToast("상품명은 필수입니다.", "error");
      return;
    }
    try {
      const body = buildProductUpsertPayload({
        editProdId, skuCode, prodName, prodItemClass, prodManufacturer, prodPartNo, prodCategory,
        prodSpec, prodSpecData, prodUnit, prodStandardCost, prodStandardPrice, prodInstallFee,
        prodAddonMonthly, prodAddonDaily, prodWarrantyMonths, prodWarrantyHours, prodSafetyStock,
        prodInitialStock, prodInboundDate,
      });
      await requestTradeJson("/api/erp/trade/products", {
        method: editProdId ? "PUT" : "POST", body, fallbackError: "상품 저장 실패",
      });
      showToast(editProdId ? `상품 [${prodName}] 수정 완료` : `상품 [${prodName}] 등록 완료`);
      setShowAddProductModal(false); setShowEditProductModal(false); setEditProdId(null);
      setSkuCode(""); setProdName(""); setProdSpec(""); setProdSpecData({}); setProdPartNo("");
      setProdInstallFee("0"); setProdAddonMonthly("0"); setProdAddonDaily("0");
      setProdStandardCost("0"); setProdStandardPrice("0");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poVendor || !poProductId || poSplitPreview.qty <= 0 || poSplitPreview.rows.length === 0) {
      showToast("매입처, 상품, 수량 및 금액을 확인해 주십시오.", "error");
      return;
    }
    const blockedVendor = findBlockedPartnerMatch(registeredPartners, { name: poVendor });
    if (blockedVendor) {
      showToast(`[${blockedVendor.name}] ${getPartnerTradeBlockInfo(blockedVendor).reason}`, "error");
      return;
    }
    try {
      await requestTradeJson("/api/erp/trade/purchases", {
        method: "POST",
        body: {
          purchaseDate: poDate, vendorName: poVendor, productId: poProductId,
          qty: poSplitPreview.rows[0].qty, unitCost: poSplitPreview.rows[0].unitCost,
          splitRows: poSplitPreview.rows,
        },
        fallbackError: "구매 등록 실패",
      });
      showToast(
        poSplitPreview.rows.length > 1
          ? `구매 입고 완료 (단가 정수화를 위해 ${poSplitPreview.rows.length}건으로 수량분할 등록됨)`
          : `구매 입고 완료 (재고 자동 반영)`
      );
      setShowAddPurchaseModal(false);
      setPoVendor(""); setPoQty("1"); setPoUnitCost("0"); setPoTotalInput("0");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const syncSoItemsToTaxSpec = (
    rows: TradeSaleItemDraft[],
    dateStr = soDate,
    installedOpts: AttachedForkliftOption[] = soInstalledOptions
  ) => {
    const synced = buildTradeSaleTaxSpecSync({ rows, products, dateStr, installedOpts });
    setSoProductId(synced.firstRow.productId);
    setSoQty(synced.firstRow.qty);
    setSoUnitPrice(synced.firstRow.unitPrice);
    setSoVatAmount(synced.totalVatFormatted);
    setSoTaxSpec((prev) => ({
      ...prev,
      taxMemo: prev.taxMemo || "{1번째 아이템} 외",
      taxItems: synced.nextTaxItems,
    }));
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = soItems.filter((r) => r.productId && cleanErpNumber(r.qty) > 0);
    if (!soCustomer || validRows.length === 0) {
      showToast("고객사와 최소 1개 이상의 출고 제품 및 수량을 입력해 주십시오.", "error");
      return;
    }
    const blockedCust = findBlockedPartnerMatch(registeredPartners, {
      partnerId: soPartnerId, name: soCustomer, businessNo: soTaxSpec.customerBizNo,
    });
    if (blockedCust) {
      showToast(`[${blockedCust.name}] ${getPartnerTradeBlockInfo(blockedCust).reason}`, "error");
      return;
    }
    try {
      const { cleanChassisList, allPayloadItems, requestBody } = buildTradeSaleCreatePayload({
        validRows, products, soEntityType, soPartnerId, soDate, soCustomer, soSaleCategory,
        soSiteName, soChassisNumbers, soInstalledOptions, soWarrantyMonths, soWarrantyHours,
        soMemo, soFileUrl, soFileName, soTaxSpec,
      });
      await requestTradeJson("/api/erp/trade/sales", {
        method: "POST", body: requestBody, fallbackError: "판매 등록 실패",
      });
      showToast(
        cleanChassisList.length > 0
          ? `판매 출고 완료 (차대번호 ${cleanChassisList.length}대 보증 자동등록)`
          : allPayloadItems.length > 1
            ? `판매 출고 계약(${allPayloadItems.length}종 항목 포함) 등록 완료`
            : `판매 출고 완료 (재고 차감 및 마진 산출)`
      );
      setShowAddSaleModal(false); setSoSaleCategory("FORKLIFT_SALE"); setSoSiteName("");
      setSoChassisNumbers([""]); setSoInstalledOptions([]); setSoWarrantyMonths("12");
      setSoWarrantyHours("2,000"); setSoPartnerId(null); setSoCustomer("");
      setSoItems([{ productId: "", qty: "1", unitPrice: "0", vatAmount: "0" }]);
      setSoMemo(""); setSoFileUrl(""); setSoFileName("");
      setSoTaxSpec(createDefaultTaxSpec("{1번째 아이템} 외", 0));
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleOpenEditSale = (s: any) => {
    setEditSoId(s.id); setEditSoSaleNo(s.saleNo); setEditSoEntityType(s.entityType || "CORP");
    setEditSoPartnerId(s.partnerId || null); setEditSoCustomer(s.customerName);
    setEditSoProductId(String(s.productId || "")); setEditSoQty(toErpInputString(s.qty));
    setEditSoUnitPrice(toErpInputString(s.unitPrice));
    const baseSupply = Number(s.totalAmount || 0);
    const baseVat = s.vatAmount != null ? Number(s.vatAmount) : Math.round(baseSupply * 0.1);
    setEditSoVatAmount(toErpInputString(baseVat));
    setEditSoDate(s.saleDate ? String(s.saleDate).slice(0, 10) : "");
    setEditSoStatus(s.status || "SHIPPED"); setEditSoMemo(s.memo || "");
    setEditSoFileUrl(""); setEditSoFileName(s.contractFileName || "");

    const defSpec = createDefaultTaxSpec("{1번째 아이템} 외", baseSupply);
    setEditSoTaxSpec({
      customerBizNo: s.customerBizNo || "", customerCeoName: s.customerCeoName || "",
      customerAddress: s.customerAddress || "", customerBizType: s.customerBizType || "",
      customerBizClass: s.customerBizClass || "", customerEmail: s.customerEmail || "",
      customerEmail2: s.customerEmail2 || "",
      taxPurpose: s.taxPurpose === "영수" ? "영수" : "청구",
      taxMemo: s.taxMemo ?? "{1번째 아이템} 외",
      taxItems:
        Array.isArray(s.taxItems) && s.taxItems.length > 0
          ? s.taxItems
          : [{
              ...defSpec.taxItems[0],
              itemName: s.productName || "판매 상품",
              qty: Number(s.qty || 1),
              unitCost: Number(s.unitPrice || baseSupply),
              supplyAmount: baseSupply,
              vatAmount: baseVat,
            }],
    });
    setShowEditSaleModal(true);
  };

  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSoId) return;
    try {
      await requestTradeJson("/api/erp/trade/sales", {
        method: "PUT",
        body: {
          id: editSoId, entityType: editSoEntityType, partnerId: editSoPartnerId,
          saleDate: editSoDate, customerName: editSoCustomer, productId: editSoProductId,
          qty: cleanErpNumber(editSoQty), unitPrice: cleanErpNumber(editSoUnitPrice),
          vatAmount: cleanErpNumber(editSoVatAmount), status: editSoStatus, memo: editSoMemo,
          contractFileUrl: editSoFileUrl || undefined, contractFileName: editSoFileName || undefined,
          customerBizNo: editSoTaxSpec.customerBizNo, customerCeoName: editSoTaxSpec.customerCeoName,
          customerAddress: editSoTaxSpec.customerAddress, customerBizType: editSoTaxSpec.customerBizType,
          customerBizClass: editSoTaxSpec.customerBizClass, customerEmail: editSoTaxSpec.customerEmail,
          customerEmail2: editSoTaxSpec.customerEmail2, taxPurpose: editSoTaxSpec.taxPurpose,
          taxMemo: editSoTaxSpec.taxMemo, taxItems: editSoTaxSpec.taxItems,
        },
        fallbackError: "판매 계약 수정 실패",
      });
      showToast(`판매 계약 [${editSoSaleNo}] 수정 완료`);
      setShowEditSaleModal(false);
      if (editSoId) delete saleFileCacheRef.current[editSoId];
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteSale = async (s: any) => {
    if (!window.confirm(`[판매 계약 삭제 확인]\n판매번호: ${s.saleNo}\n고객사: ${s.customerName}\n상품: ${s.productName}\n\n삭제 시 출고된 재고 수량이 복원됩니다. 정말 삭제하시겠습니까?`)) {
      return;
    }
    try {
      const data = await requestTradeJson(`/api/erp/trade/sales?id=${s.id}`, {
        method: "DELETE", fallbackError: "판매 계약 삭제 실패",
      });
      showToast(data.message || `판매 [${s.saleNo}] 삭제 완료`);
      delete saleFileCacheRef.current[s.id];
      setSelectedSaleIds((prev) => prev.filter((id) => id !== s.id));
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const applyTradeSaleTemplateToBilling = (s: any, dateStr: string) => {
    if (!s) return;
    const tpl = buildTradeBillingTemplateValues(s, dateStr);
    setBlSupplyAmount(tpl.supplyAmount);
    setBlVatAmount(tpl.vatAmount);
    setBlMilestoneName(tpl.milestoneName);
    setBlTaxSpec(tpl.taxSpec);
  };

  const handleOpenBillingFromSale = (s: any) => {
    const initialDate = s.saleDate ? String(s.saleDate).slice(0, 10) : new Date().toISOString().split("T")[0];
    setBlSaleId(String(s.id));
    setBlDate(initialDate);
    applyTradeSaleTemplateToBilling(s, initialDate);
    setShowAddBillingModal(true);
  };

  const handleAddBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blSaleId || !blSupplyAmount) {
      showToast("대상 판매 계약과 청구 공급가액은 필수입니다.", "error");
      return;
    }
    try {
      await requestTradeJson("/api/erp/trade/billings", {
        method: "POST",
        body: {
          saleId: blSaleId, billingDate: blDate, milestoneName: blMilestoneName || "물품대금 청구",
          supplyAmount: cleanErpNumber(blSupplyAmount), vatAmount: cleanErpNumber(blVatAmount),
          taxPurpose: blTaxSpec.taxPurpose, taxMemo: blTaxSpec.taxMemo, taxItems: blTaxSpec.taxItems,
        },
        fallbackError: "유통 청구 생성 실패",
      });
      showToast(`유통 판매 계약 항목 기반 청구 생성 완료`);
      setShowAddBillingModal(false);
      setSubTab("billings");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteBilling = async (b: any) => {
    if (!window.confirm(`유통 청구번호 [${b.billingNo}] (${b.customerName} - ${formatErpCurrency(b.totalAmount)})\n해당 청구 내역을 삭제하시겠습니까?`)) {
      return;
    }
    try {
      const data = await requestTradeJson(`/api/erp/trade/billings?id=${b.id}`, {
        method: "DELETE", fallbackError: "청구 삭제 실패",
      });
      showToast(data.message || "유통 청구 내역이 삭제되었습니다.");
      setSelectedBillingIds((prev) => prev.filter((id) => id !== b.id));
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleIssueTaxFromTradeBilling = async (b: any) => {
    const corpLabel = b.entityType === "INDIVIDUAL" ? "드래곤알피에이 [개인]" : "(주)드래곤알피에이 [법인]";
    if (!window.confirm(`[${corpLabel} ➔ ${b.customerName}]\n청구번호: ${b.billingNo}\n공급가액 ${Number(b.supplyAmount).toLocaleString()}원 (세액 ${Number(b.vatAmount).toLocaleString()}원)\n전자세금계산서를 즉시 발행하시겠습니까?`)) {
      return;
    }
    try {
      const data = await requestTradeJson("/api/erp/tax-invoices", {
        method: "POST", body: buildTradeTaxInvoiceIssuePayload(b), fallbackError: "세금계산서 발행 실패",
      });
      showToast(`세금계산서 [${data.invoice.invoice_no || data.invoice.invoiceNo}] 국세청 발행 완료!`);
      await fetchData();
      if (onNavigateToTax) onNavigateToTax();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

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
    const totalVat = selectedSales.reduce(
      (acc, s) => acc + Number(s.vatAmount || Math.round(Number(s.totalAmount || 0) * 0.1)), 0
    );
    const customerName = selectedSales[0].customerName;

    if (!window.confirm(`[선택 계약 묶음 청구 생성]\n고객사: ${customerName}\n선택 계약: ${selectedSales.length}건 (${selectedSales.map((s) => s.saleNo).join(", ")})\n합산 공급가액: ${formatErpCurrency(totalSupply)} (세액 ${formatErpCurrency(totalVat)})\n\n선택한 계약들을 합쳐 1건의 묶음 청구서를 생성하시겠습니까?`)) {
      return;
    }
    try {
      const data = await requestTradeJson("/api/erp/trade/billings", {
        method: "POST",
        body: { saleIds: selectedSaleIds, billingDate: new Date().toISOString().split("T")[0], milestoneName: "{1번째 아이템} 외" },
        fallbackError: "묶음 청구 생성 실패",
      });
      showToast(data.message || `${selectedSales.length}건의 유통계약이 1건의 묶음 청구로 생성되었습니다.`);
      setSelectedSaleIds([]);
      setSubTab("billings");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

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
      const data = await requestTradeJson("/api/erp/tax-invoices", {
        method: "POST",
        body: { batchIssue: true, consolidate: true, billings: buildConsolidatedTaxBillingPayload(selectedBills) },
        fallbackError: "묶음 세금계산서 발행 실패",
      });
      showToast(data.message || "선택 청구건 묶음 세금계산서 발행 완료!");
      setSelectedBillingIds([]);
      await fetchData();
      if (onNavigateToTax) onNavigateToTax();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const subTabItems: Array<{ key: TradeSubTabKey; label: string; icon: React.ReactNode }> = [
    { key: "inventory", label: `유통재고 현황 (${products.filter((p) => Number(p.current_stock || 0) > 0).length})`, icon: <Layers className="w-3.5 h-3.5" /> },
    { key: "products", label: `상품 마스터 (${products.length})`, icon: <Package className="w-3.5 h-3.5" /> },
    { key: "purchases", label: `구매 / 입고 대장 (${purchases.length})`, icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { key: "sales", label: `유통/판매 계약 대장 (${sales.length})`, icon: <Layers className="w-3.5 h-3.5" /> },
    { key: "billings", label: `유통 청구 & 세금계산서 (${billings.length})`, icon: <DollarSign className="w-3.5 h-3.5" /> },
    { key: "settlement", label: "기간별 매출정산", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-[#ebe5d8] text-[#0f172a] overflow-hidden font-sans dark:bg-slate-950 dark:text-slate-100">
      {toast && (
        <div className={`fixed top-16 right-5 z-50 px-4 py-2 rounded text-xs font-bold text-white shadow-xl ${toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"}`}>
          {toast.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-[#b5a894] dark:border-slate-800 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {subTabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setSubTab(tab.key); resetSort(); }}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                subTab === tab.key
                  ? "bg-[#1d4ed8] text-white shadow"
                  : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Action Buttons (Pipeline) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#78716c] dark:text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="품목·거래처 통합검색 (초성)"
              className="h-8 w-48 sm:w-56 pl-8 pr-7 bg-[#ebe5d8] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded text-xs text-[#0f172a] dark:text-white placeholder-[#78716c] focus:outline-none focus:border-blue-600"
            />
            {searchTerm && (
              <button
                type="button" onClick={() => setSearchTerm("")}
                className="absolute right-2 text-[#78716c] hover:text-[#0f172a] dark:hover:text-white"
                title="검색어 초기화"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {(subTab === "inventory" || subTab === "products") && (
            <button
              onClick={() => { resetProductForm(); setShowAddProductModal(true); }}
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

      {/* Scope / Filter Bar (Z-Pattern ①) */}
      <TradeScopeFilterBar
        subTab={subTab} inventoryViewMode={inventoryViewMode}
        onChangeInventoryViewMode={(mode) => { setInventoryViewMode(mode); resetSort(); }}
        stockScopeFilter={stockScopeFilter} onChangeStockScopeFilter={setStockScopeFilter}
        prodItemClassFilter={prodItemClassFilter}
        onChangeProdItemClassFilter={(val) => { setProdItemClassFilter(val); setCategoryFilter("ALL"); }}
        products={products} categoryFilter={categoryFilter} onChangeCategoryFilter={setCategoryFilter}
        productFilterMetadata={productFilterMetadata}
        manufacturerFilter={manufacturerFilter} onChangeManufacturerFilter={setManufacturerFilter}
        modelFilter={modelFilter} onChangeModelFilter={setModelFilter}
        minElapsedDaysInput={minElapsedDaysInput} onChangeMinElapsedDaysInput={setMinElapsedDaysInput}
        maxElapsedDaysInput={maxElapsedDaysInput} onChangeMaxElapsedDaysInput={setMaxElapsedDaysInput}
        onSelectElapsedPreset={(min, max) => { setMinElapsedDaysInput(min); setMaxElapsedDaysInput(max); }}
        hasActiveTradeFilters={hasActiveTradeFilters} onClearTradeFilters={clearTradeFilters}
        inventoryRefDate={inventoryRefDate}
        inventoryCount={inventoryViewMode === "SUMMARY" ? sortedInventorySummary.length : sortedInventoryLots.length}
        productsCount={sortedProducts.length} purchasesCount={sortedPurchases.length}
      />

      {subTab === "settlement" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-semibold">정산 시작일자</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-xs text-white" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-semibold">정산 종료일자</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-xs text-white" />
          </div>
          <div className="flex items-end">
            <button onClick={fetchData} className="w-full h-8 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs">
              기간 정산 조회
            </button>
          </div>
        </div>
      )}

      {/* Main Inspection Grid (Z-Pattern ③) */}
      <div className="flex-1 bg-[#f4efe4] border border-[#b5a894] rounded overflow-auto shadow-inner dark:bg-slate-900 dark:border-slate-800 flex flex-col">
        <TradeInventorySubTab
          subTab={subTab} inventoryViewMode={inventoryViewMode} renderSortTh={renderSortTh}
          sortedInventorySummary={sortedInventorySummary} sortedInventoryLots={sortedInventoryLots}
          products={products} inventoryStats={inventoryStats}
          onQuickPurchaseInbound={(p) => {
            setPoProductId(String(p.id));
            setPoUnitCost(formatErpInputNumber(String(Number(p.standard_cost || 0))));
            setShowAddPurchaseModal(true);
          }}
          onOpenEditProduct={openEditTradeProduct}
        />

        <TradeProductsSubTab
          subTab={subTab} renderSortTh={renderSortTh}
          sortedProducts={sortedProducts} onOpenEditProduct={openEditTradeProduct}
        />

        <PurchasesSubTab renderSortTh={renderSortTh} sortedPurchases={sortedPurchases} subTab={subTab} />

        <SalesSubTab
          canBill={canBill} handleDeleteSale={handleDeleteSale}
          handleOpenBillingFromSale={handleOpenBillingFromSale} handleOpenEditSale={handleOpenEditSale}
          handleOpenSaleFile={handleOpenSaleFile} renderSortTh={renderSortTh}
          selectedSaleIds={selectedSaleIds} setSelectedSaleIds={setSelectedSaleIds}
          sortedSales={sortedSales} subTab={subTab}
        />

        <BillingsSubTab
          handleDeleteBilling={handleDeleteBilling}
          handleIssueTaxFromTradeBilling={handleIssueTaxFromTradeBilling}
          renderSortTh={renderSortTh} selectedBillingIds={selectedBillingIds}
          setSelectedBillingIds={setSelectedBillingIds} sortedBillings={sortedBillings} subTab={subTab}
        />

        <SettlementSubTab
          renderSortTh={renderSortTh} settlementSummary={settlementSummary}
          sortedCustomerBreakdown={sortedCustomerBreakdown} subTab={subTab}
        />
      </div>

      {(showAddProductModal || showEditProductModal) && (
        <ProductModal
          editProdId={editProdId} handleAddProduct={handleAddProduct}
          prodAddonDaily={prodAddonDaily} prodAddonMonthly={prodAddonMonthly} prodCategory={prodCategory}
          prodInboundDate={prodInboundDate} prodInitialStock={prodInitialStock} prodInstallFee={prodInstallFee}
          prodItemClass={prodItemClass} prodManufacturer={prodManufacturer} prodName={prodName}
          prodPartNo={prodPartNo} prodSafetyStock={prodSafetyStock} prodSpec={prodSpec}
          prodSpecData={prodSpecData} prodStandardCost={prodStandardCost} prodStandardPrice={prodStandardPrice}
          prodUnit={prodUnit} prodWarrantyHours={prodWarrantyHours} prodWarrantyMonths={prodWarrantyMonths}
          setEditProdId={setEditProdId} setProdAddonDaily={setProdAddonDaily} setProdAddonMonthly={setProdAddonMonthly}
          setProdCategory={setProdCategory} setProdInboundDate={setProdInboundDate} setProdInitialStock={setProdInitialStock}
          setProdInstallFee={setProdInstallFee} setProdItemClass={setProdItemClass} setProdManufacturer={setProdManufacturer}
          setProdName={setProdName} setProdPartNo={setProdPartNo} setProdSafetyStock={setProdSafetyStock}
          setProdSpec={setProdSpec} setProdSpecData={setProdSpecData} setProdStandardCost={setProdStandardCost}
          setProdStandardPrice={setProdStandardPrice} setProdUnit={setProdUnit} setProdWarrantyHours={setProdWarrantyHours}
          setProdWarrantyMonths={setProdWarrantyMonths} setShowAddProductModal={setShowAddProductModal}
          setShowEditProductModal={setShowEditProductModal} setSkuCode={setSkuCode}
          showAddProductModal={showAddProductModal} showEditProductModal={showEditProductModal} skuCode={skuCode}
        />
      )}

      {showAddPurchaseModal && (
        <PurchaseModal
          handleAddPurchase={handleAddPurchase} poDate={poDate} poInputMode={poInputMode}
          poProductId={poProductId} poQty={poQty} poSplitPreview={poSplitPreview}
          poTotalInput={poTotalInput} poUnitCost={poUnitCost} poVatIncluded={poVatIncluded}
          poVendor={poVendor} products={products} setPoDate={setPoDate} setPoInputMode={setPoInputMode}
          setPoProductId={setPoProductId} setPoQty={setPoQty} setPoTotalInput={setPoTotalInput}
          setPoUnitCost={setPoUnitCost} setPoVatIncluded={setPoVatIncluded} setPoVendor={setPoVendor}
          setShowAddPurchaseModal={setShowAddPurchaseModal} showAddPurchaseModal={showAddPurchaseModal}
          tradeProductOptions={tradeProductOptions} vendorPartnerOptions={vendorPartnerOptions}
        />
      )}

      {showAddSaleModal && (
        <AddSaleModal
          customerPartnerOptions={customerPartnerOptions} customerPartners={customerPartners}
          handleAddSale={handleAddSale} handleSaleFileUpload={handleSaleFileUpload}
          handleSelectSaleCustomer={handleSelectSaleCustomer} products={products}
          setShowAddSaleModal={setShowAddSaleModal} setSoChassisNumbers={setSoChassisNumbers}
          setSoCustomer={setSoCustomer} setSoDate={setSoDate} setSoEntityType={setSoEntityType}
          setSoFileName={setSoFileName} setSoFileUrl={setSoFileUrl} setSoInstalledOptions={setSoInstalledOptions}
          setSoItems={setSoItems} setSoPartnerId={setSoPartnerId} setSoQty={setSoQty}
          setSoSaleCategory={setSoSaleCategory} setSoSiteName={setSoSiteName} setSoTaxSpec={setSoTaxSpec}
          setSoUnitPrice={setSoUnitPrice} setSoVatAmount={setSoVatAmount} setSoWarrantyHours={setSoWarrantyHours}
          setSoWarrantyMonths={setSoWarrantyMonths} showAddSaleModal={showAddSaleModal}
          soChassisNumbers={soChassisNumbers} soCustomer={soCustomer} soDate={soDate} soEntityType={soEntityType}
          soFileInputRef={soFileInputRef} soFileName={soFileName} soInstalledOptions={soInstalledOptions}
          soItems={soItems} soPartnerId={soPartnerId} soSaleCategory={soSaleCategory} soSiteName={soSiteName}
          soTaxSpec={soTaxSpec} soWarrantyHours={soWarrantyHours} soWarrantyMonths={soWarrantyMonths}
          syncSoItemsToTaxSpec={syncSoItemsToTaxSpec} tradeOptionCatalog={tradeOptionCatalog}
          tradeProductOptions={tradeProductOptions}
        />
      )}

      {showEditSaleModal && (
        <EditSaleModal
          editSoCustomer={editSoCustomer} editSoDate={editSoDate} editSoEntityType={editSoEntityType}
          editSoFileInputRef={editSoFileInputRef} editSoFileName={editSoFileName} editSoQty={editSoQty}
          editSoSaleNo={editSoSaleNo} editSoTaxSpec={editSoTaxSpec} editSoUnitPrice={editSoUnitPrice}
          editSoVatAmount={editSoVatAmount} handleSaleFileUpload={handleSaleFileUpload}
          handleUpdateSale={handleUpdateSale} setEditSoCustomer={setEditSoCustomer}
          setEditSoDate={setEditSoDate} setEditSoEntityType={setEditSoEntityType} setEditSoQty={setEditSoQty}
          setEditSoTaxSpec={setEditSoTaxSpec} setEditSoUnitPrice={setEditSoUnitPrice}
          setEditSoVatAmount={setEditSoVatAmount} setShowEditSaleModal={setShowEditSaleModal}
          showEditSaleModal={showEditSaleModal}
        />
      )}

      {showAddBillingModal && (
        <AddBillingModal
          applyTradeSaleTemplateToBilling={applyTradeSaleTemplateToBilling}
          blDate={blDate} blMilestoneName={blMilestoneName} blSaleId={blSaleId}
          blSupplyAmount={blSupplyAmount} blTaxSpec={blTaxSpec} blVatAmount={blVatAmount}
          handleAddBilling={handleAddBilling} sales={sales} setBlDate={setBlDate}
          setBlMilestoneName={setBlMilestoneName} setBlSaleId={setBlSaleId}
          setBlSupplyAmount={setBlSupplyAmount} setBlTaxSpec={setBlTaxSpec} setBlVatAmount={setBlVatAmount}
          setShowAddBillingModal={setShowAddBillingModal} showAddBillingModal={showAddBillingModal}
          tradeSaleOptions={tradeSaleOptions}
        />
      )}

      {activeDocViewer && (
        <TradeDocViewerModal activeDocViewer={activeDocViewer} onClose={() => setActiveDocViewer(null)} />
      )}
    </div>
  );
};
