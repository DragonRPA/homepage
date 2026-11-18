"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Truck, Plus, Calendar, RefreshCw, FileText, CheckCircle2, 
  RotateCcw, DollarSign, Layers, Search, Wrench, ShieldCheck, X,
  Building2, FileUp, Download,
  Edit, Trash2
} from "lucide-react";
import {
  formatErpNumber,
  formatErpCurrency,
  formatErpQty,
  formatErpInputNumber,
  toErpInputString,
  cleanErpNumber,
  sortErpItems,
  SortDirection,
  cycleErpSort,
  resolveContractItemTemplate,
  resolveContractTaxItemsTemplate,
  RentalRateBasis,
  RENTAL_RATE_BASIS_OPTIONS,
  calculateAutoDailyRentalFee,
  resolveDailyRentalFee,
  inferRentalRateBasis,
  getRentalRateBasisShortLabel,
  computeRentalSupplyByBasis,
  createHangulMatcher,
  sortCustomersByName,
  AttachedForkliftOption,
  calculateAttachedOptionsTotals,
  formatAttachedOptionsSummary,
  normalizeAttachedOptions,
  normalizeItemClass,
} from "@/lib/erpFormat";
import { fetchCachedMasterData, useMasterDataSync } from "@/lib/erpMasterDataBus";
import { SortableTh } from "./SortableTh";
import { ContractTaxInvoiceSection, BuyerTaxSpec, createDefaultTaxSpec, extractPartnerTaxSpec } from "./ContractTaxInvoiceSection";
import { SearchSelectCombobox, SearchSelectOption } from "./SearchSelectCombobox";
import ForkliftOptionAttachPanel, { CatalogOptionItem } from "./ForkliftOptionAttachPanel";
import { findBlockedPartnerMatch, getPartnerTradeBlockInfo } from "@/lib/partnerStatusClient";
import { AcquireAssetModal, AddModelModal, AddBillingModal } from "./rental/RentalAssetModelModals";
import { AddContractModal, EditContractModal } from "./rental/RentalContractModals";

import type { RentalItemDraft } from "./rental/rentalTypes";

interface RentalTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onNavigateToTax?: () => void;
}

export const RentalTab: React.FC<RentalTabProps> = ({ currentUser, selectedEntity = "ALL", onNavigateToTax }) => {
  const canBill =
    currentUser?.roleCode === "ADMIN" ||
    currentUser?.loginId === "admin" ||
    Boolean(currentUser?.canBill);
  const [subTab, setSubTab] = useState<"models" | "assets" | "contracts" | "billings">("assets");
  const [loading, setLoading] = useState(false);

  // Data States
  const [models, setModels] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [billings, setBillings] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);

  // Filter
  const [selectedYm, setSelectedYm] = useState(new Date().toISOString().slice(0, 7));
  const [rentalSearchQuery, setRentalSearchQuery] = useState("");

  // Modals
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [showAcquireAssetModal, setShowAcquireAssetModal] = useState(false);
  const [showDeprecModal, setShowDeprecModal] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showEditContractModal, setShowEditContractModal] = useState(false);
  const [showAddBillingModal, setShowAddBillingModal] = useState(false);
  const [activeDocViewer, setActiveDocViewer] = useState<{ title: string; customerName: string; url: string; fileName: string } | null>(null);
  const contractFileCacheRef = useRef<Record<number, { url: string; fileName: string }>>({});

  // Contract Edit Form States
  const [editCtId, setEditCtId] = useState<number | null>(null);
  const [editCtContractNo, setEditCtContractNo] = useState("");
  const [editCtEntityType, setEditCtEntityType] = useState<"CORP" | "INDIVIDUAL">("CORP");
  const [editCtPartnerId, setEditCtPartnerId] = useState<number | null>(null);
  const [editCtCustomer, setEditCtCustomer] = useState("");
  const [editCtSite, setEditCtSite] = useState("");
  const [editCtStart, setEditCtStart] = useState("");
  const [editCtEnd, setEditCtEnd] = useState("");
  const [editCtMonthlyRate, setEditCtMonthlyRate] = useState("0");
  const [editCtDailyRate, setEditCtDailyRate] = useState("0");
  const [editCtRateBasis, setEditCtRateBasis] = useState<RentalRateBasis>("MONTHLY");
  const [editCtDeposit, setEditCtDeposit] = useState("0");
  const [editCtVatAmount, setEditCtVatAmount] = useState("0");
  const [editCtBillingDay, setEditCtBillingDay] = useState("25");
  const [editCtStatus, setEditCtStatus] = useState("ACTIVE");
  const [editCtMemo, setEditCtMemo] = useState("");
  const [editCtTaxSpec, setEditCtTaxSpec] = useState<BuyerTaxSpec>(() =>
    createDefaultTaxSpec("장비 임대료", 0)
  );
  const [editCtFileUrl, setEditCtFileUrl] = useState("");
  const [editCtFileName, setEditCtFileName] = useState("");
  const [editCtAddItems, setEditCtAddItems] = useState<RentalItemDraft[]>([]);
  const [editCtAttachedOptions, setEditCtAttachedOptions] = useState<AttachedForkliftOption[]>([]);
  const [ctAttachedOptions, setCtAttachedOptions] = useState<AttachedForkliftOption[]>([]);
  const [optionCatalog, setOptionCatalog] = useState<CatalogOptionItem[]>([]);

  // Contract Form
  const [ctEntityType, setCtEntityType] = useState<"CORP" | "INDIVIDUAL">(
    selectedEntity === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP"
  );

  useEffect(() => {
    if (selectedEntity === "INDIVIDUAL") setCtEntityType("INDIVIDUAL");
    else if (selectedEntity === "CORP") setCtEntityType("CORP");
  }, [selectedEntity]);

  // Model Form
  const [modelCode, setModelCode] = useState("");
  const [modelName, setModelName] = useState("");
  const [manufacturer, setManufacturer] = useState("Skyjack");
  const [modelMonthlyRate, setModelMonthlyRate] = useState("600,000");
  const [modelDailyRate, setModelDailyRate] = useState("20,000");
  const [modelDailyManual, setModelDailyManual] = useState(false);
  const [modelSpec, setModelSpec] = useState("작업높이 8m / 전폭 0.81m");

  // Asset Form
  const [assetNo, setAssetNo] = useState("");
  const [assetQty, setAssetQty] = useState("1");
  const [assetModelId, setAssetModelId] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [acqDate, setAcqDate] = useState(new Date().toISOString().split("T")[0]);
  const [acqCost, setAcqCost] = useState("12,000,000");
  const [salvageValue, setSalvageValue] = useState("1,200,000");
  const [usefulLife, setUsefulLife] = useState("5");

  // Contract Form (기본 계약 선택 + 재고 제품·수량·단가 간략 구성)
  const [ctBaseContractId, setCtBaseContractId] = useState<string>("");
  const [ctPartnerId, setCtPartnerId] = useState<number | null>(null);
  const [ctCustomer, setCtCustomer] = useState("");
  const [ctSite, setCtSite] = useState("");
  const [ctAssetId, setCtAssetId] = useState("");
  const [ctRentalItems, setCtRentalItems] = useState<RentalItemDraft[]>([
    { productId: "", qty: "1", unitCost: "0" },
  ]);
  const [ctStart, setCtStart] = useState(new Date().toISOString().split("T")[0]);
  const [ctEnd, setCtEnd] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [ctRateBasis, setCtRateBasis] = useState<RentalRateBasis>("MONTHLY");
  const [ctMonthlyRate, setCtMonthlyRate] = useState("0");
  const [ctDailyRate, setCtDailyRate] = useState("0");
  const [ctVatAmount, setCtVatAmount] = useState("0");
  const [ctBillingDay, setCtBillingDay] = useState("25");
  const [ctDeposit, setCtDeposit] = useState("0");
  const [ctTaxSpec, setCtTaxSpec] = useState<BuyerTaxSpec>(() =>
    createDefaultTaxSpec("{1번째 아이템} 외", 0)
  );
  const [ctFileUrl, setCtFileUrl] = useState("");
  const [ctFileName, setCtFileName] = useState("");
  const [isCtFileDragging, setIsCtFileDragging] = useState(false);
  const ctFileInputRef = useRef<HTMLInputElement>(null);

  // Billing Form
  const [blContractId, setBlContractId] = useState("");
  const [blYm, setBlYm] = useState(new Date().toISOString().slice(0, 7));
  const [blStart, setBlStart] = useState(new Date().toISOString().slice(0, 7) + "-01");
  const [blEnd, setBlEnd] = useState(new Date().toISOString().split("T")[0]);
  const [blDays, setBlDays] = useState("30");
  const [blRateBasis, setBlRateBasis] = useState<RentalRateBasis>("MONTHLY");
  const [blDailyRate, setBlDailyRate] = useState("20,000");
  const [blUseProRata, setBlUseProRata] = useState(false); // 원칙: 특별한 경우가 아니면 일할 계산하지 않고 월 임대료 정액 적용
  const [blSupplyAmount, setBlSupplyAmount] = useState("600,000");
  const [blVatAmount, setBlVatAmount] = useState("60,000");
  const [blTaxSpec, setBlTaxSpec] = useState<BuyerTaxSpec>(() =>
    createDefaultTaxSpec("장비 임대료", 600000)
  );

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sorting State (탭별 기본 정렬 키/방향 자동 적용 · 3단계: asc ➔ desc ➔ null 정렬안함)
  const [sortStateByTab, setSortStateByTab] = useState<
    Record<"assets" | "contracts" | "billings" | "models", { key: string; dir: SortDirection }>
  >({
    assets: { key: "assetNo", dir: "asc" },
    contracts: { key: "contractNo", dir: "desc" },
    billings: { key: "billingNo", dir: "desc" },
    models: { key: "model_code", dir: "asc" },
  });

  const sortKey = sortStateByTab[subTab].key;
  const sortDir = sortStateByTab[subTab].dir;

  const handleSort = (key: string) => {
    setSortStateByTab((prev) => {
      const current = prev[subTab];
      return {
        ...prev,
        [subTab]: cycleErpSort(current.key, current.dir, key),
      };
    });
  };

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => {
    const isActive = sortKey === key && sortDir !== null;
    return (
      <SortableTh
        label={label}
        colKey={key}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        align={align}
        className={`py-2.5 px-3 hover:bg-[#d0c6b4] dark:hover:bg-slate-800 ${isActive ? "text-[#1d4ed8] dark:text-blue-400 font-bold" : ""}`}
        iconClassName="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
      />
    );
  };

  // Filtered & Sorted Lists (통합 초성검색 + 정렬)
  const searchMatcher = useMemo(
    () => createHangulMatcher(rentalSearchQuery),
    [rentalSearchQuery]
  );

  const filteredAssets = useMemo(() => {
    if (!rentalSearchQuery.trim()) return assets;
    return assets.filter((a) =>
      searchMatcher.testAny([
        a.assetNo,
        a.modelName,
        a.modelCode,
        a.manufacturer,
        a.serialNo,
        a.status,
      ])
    );
  }, [assets, rentalSearchQuery, searchMatcher]);

  const filteredContracts = useMemo(() => {
    if (!rentalSearchQuery.trim()) return contracts;
    return contracts.filter((c) =>
      searchMatcher.testAny([
        c.contractNo,
        c.customerName,
        c.modelName,
        c.assetNo,
        c.siteName,
        c.memo,
      ])
    );
  }, [contracts, rentalSearchQuery, searchMatcher]);

  const filteredBillings = useMemo(() => {
    if (!rentalSearchQuery.trim()) return billings;
    return billings.filter((b) =>
      searchMatcher.testAny([
        b.billingNo,
        b.customerName,
        b.assetNo,
        b.modelName,
        b.taxInvoiceNo,
      ])
    );
  }, [billings, rentalSearchQuery, searchMatcher]);

  const filteredModels = useMemo(() => {
    if (!rentalSearchQuery.trim()) return models;
    return models.filter((m) =>
      searchMatcher.testAny([
        m.model_code,
        m.modelCode,
        m.model_name,
        m.modelName,
        m.manufacturer,
        m.spec,
      ])
    );
  }, [models, rentalSearchQuery, searchMatcher]);

  const sortedAssets = useMemo(
    () => sortErpItems(filteredAssets, sortStateByTab.assets.key, sortStateByTab.assets.dir),
    [filteredAssets, sortStateByTab.assets]
  );
  const sortedContracts = useMemo(
    () => sortErpItems(filteredContracts, sortStateByTab.contracts.key, sortStateByTab.contracts.dir),
    [filteredContracts, sortStateByTab.contracts]
  );
  const sortedBillings = useMemo(
    () => sortErpItems(filteredBillings, sortStateByTab.billings.key, sortStateByTab.billings.dir),
    [filteredBillings, sortStateByTab.billings]
  );
  const sortedModels = useMemo(
    () => sortErpItems(filteredModels, sortStateByTab.models.key, sortStateByTab.models.dir),
    [filteredModels, sortStateByTab.models]
  );

  // 재고(AVAILABLE)가 1대 이상 있는 제품 모델만 집계
  const inStockProducts = useMemo(() => {
    const countMap: Record<string, { count: number; sampleModelName: string; sampleModelCode: string; manufacturer: string }> = {};
    for (const a of assets) {
      if (a.status === "AVAILABLE") {
        const pid = String(a.rentalProductId || "");
        if (!pid) continue;
        if (!countMap[pid]) {
          countMap[pid] = {
            count: 0,
            sampleModelName: a.modelName || "",
            sampleModelCode: a.modelCode || "",
            manufacturer: a.manufacturer || "",
          };
        }
        countMap[pid].count += 1;
      }
    }

    const result: Array<{
      id: number;
      modelCode: string;
      modelName: string;
      manufacturer: string;
      standardMonthlyRate: number;
      standardDailyRate: number;
      availableCount: number;
    }> = [];

    for (const m of models) {
      const pid = String(m.id);
      const info = countMap[pid];
      if (info && info.count > 0) {
        const monthly = Number(m.standard_monthly_rate ?? m.standardMonthlyRate ?? 0);
        const daily = resolveDailyRentalFee(
          monthly,
          Number(m.standard_daily_rate ?? m.standardDailyRate ?? 0)
        );
        result.push({
          id: Number(m.id),
          modelCode: m.model_code || m.modelCode || info.sampleModelCode || "",
          modelName: m.model_name || m.modelName || info.sampleModelName || "제품",
          manufacturer: m.manufacturer || info.manufacturer || "",
          standardMonthlyRate: monthly,
          standardDailyRate: daily,
          availableCount: info.count,
        });
      }
    }
    return result;
  }, [models, assets]);

  // SearchSelectCombobox 옵션 목록 (초성검색 지원)
  const partnerComboboxOptions = useMemo<SearchSelectOption[]>(() => {
    return sortCustomersByName(partners).map((p: any) => {
      const block = getPartnerTradeBlockInfo(p);
      return {
        value: String(p.id),
        label: p.name || "",
        subLabel: [p.businessNo, p.ceoName].filter(Boolean).join(" · ") || undefined,
        badgeText: block.blocked ? block.badgeText : undefined,
        badgeColor: block.blocked ? "rose" : undefined,
        searchKeywords: [p.name, p.businessNo, p.ceoName, p.partnerCode],
        disabled: block.blocked,
      };
    });
  }, [partners]);

  const modelComboboxOptions = useMemo<SearchSelectOption[]>(() => {
    return models.map((m: any) => {
      const code = m.model_code || m.modelCode || "";
      const name = m.model_name || m.modelName || "";
      const monthly = Number(m.standard_monthly_rate ?? m.standardMonthlyRate ?? 0);
      const daily = resolveDailyRentalFee(
        monthly,
        Number(m.standard_daily_rate ?? m.standardDailyRate ?? 0)
      );
      return {
        value: String(m.id),
        label: `[${code}] ${name}`,
        subLabel: [m.manufacturer, `월 ${formatErpCurrency(monthly)}`, `일 ${formatErpCurrency(daily)}`]
          .filter(Boolean)
          .join(" · "),
        searchKeywords: [code, name, m.manufacturer, m.spec],
      };
    });
  }, [models]);

  const inStockProductComboboxOptions = useMemo<SearchSelectOption[]>(() => {
    return inStockProducts.map((p) => ({
      value: String(p.id),
      label: `[${p.modelCode}] ${p.modelName}`,
      subLabel: `월 ${formatErpCurrency(p.standardMonthlyRate)} · 일 ${formatErpCurrency(p.standardDailyRate)}`,
      badgeText: `재고 ${formatErpNumber(p.availableCount)}대`,
      badgeColor: "emerald",
      searchKeywords: [p.modelCode, p.modelName, p.manufacturer],
    }));
  }, [inStockProducts]);

  const contractComboboxOptions = useMemo<SearchSelectOption[]>(() => {
    return contracts.map((c: any) => {
      const daily = resolveDailyRentalFee(c.monthlyRate, c.dailyRate);
      return {
        value: String(c.id),
        label: `[${c.contractNo}] ${c.customerName}`,
        subLabel: `${c.assetNo || c.modelName || "장비"} · 월 ${formatErpCurrency(c.monthlyRate)} · 일 ${formatErpCurrency(daily)}`,
        badgeText: c.entityType === "INDIVIDUAL" ? "개인" : "법인",
        badgeColor: c.entityType === "INDIVIDUAL" ? "amber" : "blue",
        searchKeywords: [c.contractNo, c.customerName, c.assetNo, c.modelName],
      };
    });
  }, [contracts]);

  // 선택된 재고 제품 행들의 합계 계산 헬퍼
  const recalcDraftItemsTotals = (
    drafts: RentalItemDraft[],
    isEditMode = false,
    existingTaxItems: any[] = [],
    basisOverride?: RentalRateBasis
  ) => {
    let draftSupplySum = 0;
    let draftVatSum = 0;
    const validLines: any[] = [];

    for (const row of drafts) {
      if (!row.productId) continue;
      const prod = inStockProducts.find((p) => String(p.id) === String(row.productId));
      const qtyNum = Math.max(1, cleanErpNumber(row.qty) || 1);
      const unitNum = Math.max(0, cleanErpNumber(row.unitCost) || 0);
      const sup = Math.round(qtyNum * unitNum);
      const vat = Math.round(sup * 0.1);
      draftSupplySum += sup;
      draftVatSum += vat;
      validLines.push({
        productId: Number(row.productId),
        itemName: prod?.modelName || "임대장비",
        spec: prod?.modelCode || `${qtyNum}대`,
        qty: qtyNum,
        unitCost: unitNum,
        supplyAmount: sup,
        vatAmount: vat,
      });
    }

    if (!isEditMode) {
      setCtMonthlyRate(toErpInputString(draftSupplySum));
      setCtVatAmount(toErpInputString(draftVatSum));
      if ((basisOverride ?? ctRateBasis) !== "DAILY_MANUAL") {
        setCtDailyRate(toErpInputString(calculateAutoDailyRentalFee(draftSupplySum)));
      }
      setCtTaxSpec((prev) => ({
        ...prev,
        taxMemo: prev.taxMemo || "{1번째 아이템} 외",
        taxItems: validLines.length > 0 ? validLines : prev.taxItems,
      }));
    } else {
      const baseSup = existingTaxItems.reduce((acc, it) => acc + Number(it.supplyAmount || 0), 0);
      const baseVat = existingTaxItems.reduce((acc, it) => acc + Number(it.vatAmount || 0), 0);
      const totalSup = baseSup + draftSupplySum;
      const totalVat = baseVat + draftVatSum;
      setEditCtMonthlyRate(toErpInputString(totalSup));
      setEditCtVatAmount(toErpInputString(totalVat));
      if ((basisOverride ?? editCtRateBasis) !== "DAILY_MANUAL") {
        setEditCtDailyRate(toErpInputString(calculateAutoDailyRentalFee(totalSup)));
      }
    }
  };

  const fetchPartners = async () => {
    try {
      const data = await fetchCachedMasterData("partners_customer", async () => {
        const res = await fetch("/api/erp/partners?type=CUSTOMER", { cache: "no-store" });
        return res.json();
      });
      if (data.success && Array.isArray(data.partners)) {
        setPartners(data.partners);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useMasterDataSync("partners", fetchPartners);

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleContractFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || "";
      setCtFileUrl(dataUrl);
      setCtFileName(file.name);
      showToast(`임대계약서 파일(${file.name})이 첨부되었습니다.`);
    };
    reader.onerror = () => showToast("계약서 파일 읽기 실패", "error");
    reader.readAsDataURL(file);
  };

  const handleOpenContractFile = async (c: any) => {
    const cached = contractFileCacheRef.current[c.id];
    if (cached) {
      setActiveDocViewer({
        title: `${c.contractNo} 임대계약서 원본`,
        customerName: c.customerName,
        url: cached.url,
        fileName: cached.fileName,
      });
      return;
    }
    try {
      const res = await fetch(`/api/erp/rental/contracts?id=${c.id}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.contract?.contractFileUrl) {
        const entry = {
          url: data.contract.contractFileUrl,
          fileName: data.contract.contractFileName || `${c.contractNo}_임대계약서`,
        };
        contractFileCacheRef.current[c.id] = entry;
        setActiveDocViewer({
          title: `${c.contractNo} 임대계약서 원본`,
          customerName: c.customerName,
          url: entry.url,
          fileName: entry.fileName,
        });
      } else {
        showToast("등록된 임대계약서 파일을 찾을 수 없습니다.", "error");
      }
    } catch (e) {
      showToast("임대계약서 파일 조회 실패", "error");
    }
  };

  // Fetch All Rental Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const contractsUrl = selectedEntity && selectedEntity !== "ALL"
        ? `/api/erp/rental/contracts?entityType=${selectedEntity}`
        : "/api/erp/rental/contracts";

      const [mRes, aRes, cRes, bRes, tRes] = await Promise.all([
        fetch("/api/erp/rental/products", { cache: "no-store" }),
        fetch("/api/erp/rental/assets", { cache: "no-store" }),
        fetch(contractsUrl, { cache: "no-store" }),
        fetch(`/api/erp/rental/billings?yearMonth=${selectedYm}`, { cache: "no-store" }),
        fetch("/api/erp/trade/products", { cache: "no-store" }).catch(() => null),
      ]);

      const mData = await mRes.json();
      const aData = await aRes.json();
      const cData = await cRes.json();
      const bData = await bRes.json();
      const tData = tRes ? await tRes.json().catch(() => null) : null;

      const catalogList: CatalogOptionItem[] = [];
      if (mData.success) {
        setModels(mData.products);
        for (const m of mData.products || []) {
          if (normalizeItemClass(m.itemClass || m.item_class, m.category) === "OPTION") {
            catalogList.push({
              id: m.id,
              source: "RENTAL",
              skuCode: m.modelCode || m.model_code || undefined,
              name: m.modelName || m.model_name || m.name,
              spec: m.spec || undefined,
              unitPrice: 0,
              installFee: Number(m.installFee ?? m.install_fee ?? 0),
              monthlyAddonRate: Number(m.standardMonthlyRate ?? m.standard_monthly_rate ?? 0),
              dailyAddonRate: Number(m.standardDailyRate ?? m.standard_daily_rate ?? 0),
            });
          }
        }
      }
      if (tData?.success && Array.isArray(tData.products)) {
        for (const p of tData.products) {
          if (normalizeItemClass(p.item_class, p.category) === "OPTION") {
            catalogList.push({
              id: p.id,
              source: "TRADE",
              skuCode: p.sku_code || undefined,
              name: p.name,
              spec: p.spec || undefined,
              unitPrice: Number(p.standard_price || 0),
              installFee: Number(p.install_fee || 0),
              monthlyAddonRate: Number(p.addon_monthly_rate || 0),
              dailyAddonRate: Number(p.addon_daily_rate || 0),
            });
          }
        }
      }
      setOptionCatalog(catalogList);
      if (aData.success) setAssets(aData.assets);
      if (cData.success) setContracts(cData.contracts);
      if (bData.success) setBillings(bData.billings);
    } catch (err: any) {
      console.error(err);
      showToast("데이터 로드 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYm, selectedEntity]);

  // Handle Add Model
  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelCode || !modelName) {
      showToast("모델 코드와 모델명은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/rental/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelCode,
          modelName,
          category: "고소작업대",
          manufacturer,
          standardMonthlyRate: cleanErpNumber(modelMonthlyRate),
          standardDailyRate: cleanErpNumber(modelDailyRate),
          spec: modelSpec,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "모델 등록 실패");

      showToast(`기종 모델 [${modelName}] 등록 완료`);
      setShowAddModelModal(false);
      setModelCode("");
      setModelName("");
      setModelMonthlyRate("600,000");
      setModelDailyRate("20,000");
      setModelDailyManual(false);
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 자산 취득 시 자동채번 헬퍼: "DR" + yymm + 3-digit 순번 (예: DR2610001)
  const computeNextRentalAssetNo = (dateStr: string, assetList: any[] = assets) => {
    const cleanDate = (dateStr || new Date().toISOString().split("T")[0]).replace(/-/g, "");
    const yymm = cleanDate.length >= 6 ? cleanDate.slice(2, 6) : new Date().toISOString().slice(2, 7).replace("-", "");
    const prefix = `DR${yymm}`;
    let maxSeq = 0;
    for (const a of assetList) {
      const no = String(a.assetNo || a.asset_no || "").toUpperCase();
      if (no.startsWith(prefix)) {
        const suffix = no.slice(prefix.length).replace(/[^0-9]/g, "");
        const n = parseInt(suffix, 10);
        if (!isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
    return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
  };

  // Handle Acquire Asset (supports batch acquisition by assetQty)
  const handleAcquireAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAssetNo = assetNo.trim() || computeNextRentalAssetNo(acqDate, assets);
    const batchCount = Math.max(1, parseInt(assetQty || "1", 10) || 1);
    if (!assetModelId || !acqCost) {
      showToast("모델과 취득원가는 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/rental/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetNo: targetAssetNo,
          qty: batchCount,
          rentalProductId: assetModelId,
          serialNo,
          acquisitionDate: acqDate,
          acquisitionCost: cleanErpNumber(acqCost),
          salvageValue: cleanErpNumber(salvageValue),
          usefulLifeYears: cleanErpNumber(usefulLife),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "자산 취득 등록 실패");

      const createdList = Array.isArray(data.assets) ? data.assets : [data.asset];
      const firstNo = createdList[0]?.assetNo || createdList[0]?.asset_no || targetAssetNo;
      const lastNo = createdList[createdList.length - 1]?.assetNo || createdList[createdList.length - 1]?.asset_no || firstNo;
      showToast(
        createdList.length > 1
          ? `자산 ${createdList.length}대([${firstNo} ~ ${lastNo}]) 일괄 취득 완료`
          : `자산 [${firstNo}] 취득 완료 (장부가액 ${formatErpCurrency(cleanErpNumber(acqCost))})`
      );
      setShowAcquireAssetModal(false);
      setAssetNo("");
      setAssetQty("1");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Depreciation Execution
  const handleExecuteDepreciation = async () => {
    if (!window.confirm(`${selectedYm}월 전 자산 정액법 감가상각을 일괄 마감 실행하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/erp/rental/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearMonth: selectedYm,
          actorName: currentUser?.name || "ADMIN",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "감가상각 마감 실패");

      showToast(data.message, "success");
      setShowDeprecModal(false);
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Add Contract (기본 계약 선택 + 재고 제품 선택 + 수량 + 단가 입력 구조)
  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!ctCustomer && !ctBaseContractId) || !ctStart || !ctEnd) {
      showToast("기본 계약(고객사), 계약 시작일, 종료일은 필수입니다.", "error");
      return;
    }
    const blockedCust = findBlockedPartnerMatch(partners, {
      partnerId: ctPartnerId,
      name: ctCustomer,
      businessNo: ctTaxSpec.customerBizNo,
    });
    if (blockedCust) {
      showToast(`[${blockedCust.name}] ${getPartnerTradeBlockInfo(blockedCust).reason}`, "error");
      return;
    }

    const validRentalItems = ctRentalItems
      .filter((r) => r.productId && (cleanErpNumber(r.qty) || 0) > 0)
      .map((r) => ({
        productId: Number(r.productId),
        qty: Math.max(1, cleanErpNumber(r.qty) || 1),
        unitCost: Math.max(0, cleanErpNumber(r.unitCost) || 0),
      }));

    try {
      const res = await fetch("/api/erp/rental/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseContractId: ctBaseContractId || null,
          entityType: ctEntityType,
          partnerId: ctPartnerId,
          customerName: ctCustomer,
          siteName: "",
          assetId: ctAssetId || null,
          rentalItems: validRentalItems,
          attachedOptions: ctAttachedOptions,
          startDate: ctStart,
          endDate: ctEnd,
          rateBasis: ctRateBasis,
          monthlyRate: cleanErpNumber(ctMonthlyRate),
          dailyRate: cleanErpNumber(ctDailyRate),
          vatAmount: cleanErpNumber(ctVatAmount),
          billingDay: ctBillingDay,
          deposit: cleanErpNumber(ctDeposit),
          contractFileUrl: ctFileUrl || null,
          contractFileName: ctFileName || null,
          customerBizNo: ctTaxSpec.customerBizNo,
          customerCeoName: ctTaxSpec.customerCeoName,
          customerAddress: ctTaxSpec.customerAddress,
          customerBizType: ctTaxSpec.customerBizType,
          customerBizClass: ctTaxSpec.customerBizClass,
          customerEmail: ctTaxSpec.customerEmail,
          customerEmail2: ctTaxSpec.customerEmail2,
          taxPurpose: ctTaxSpec.taxPurpose,
          taxMemo: ctTaxSpec.taxMemo,
          taxItems: ctTaxSpec.taxItems,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "계약 등록 실패");

      showToast(
        data.assignedCount > 0
          ? `임대계약 등록 및 재고 제품 ${data.assignedCount}대 배정 완료`
          : `기본 임대계약 등록 완료`
      );
      setShowAddContractModal(false);
      setCtBaseContractId("");
      setCtPartnerId(null);
      setCtCustomer("");
      setCtSite("");
      setCtAssetId("");
      setCtRentalItems([{ productId: "", qty: "1", unitCost: "0" }]);
      setCtAttachedOptions([]);
      setCtRateBasis("MONTHLY");
      setCtMonthlyRate("0");
      setCtDailyRate("0");
      setCtVatAmount("0");
      setCtFileUrl("");
      setCtFileName("");
      setCtTaxSpec(createDefaultTaxSpec("{1번째 아이템} 외", 0));
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Return Contract
  const handleReturnContract = async (contractId: number) => {
    if (!window.confirm("해당 임대 장비를 회수 및 계약 반납 처리하시겠습니까?\n(자산 상태가 '임대가능'으로 롤백됩니다)")) {
      return;
    }
    try {
      const res = await fetch("/api/erp/rental/contracts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId, action: "RETURN" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "반납 처리 실패");

      showToast(data.message);
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Open Edit Contract Modal
  const handleOpenEditContract = (c: any) => {
    setEditCtId(c.id);
    setEditCtContractNo(c.contractNo);
    setEditCtEntityType(c.entityType || "CORP");
    setEditCtPartnerId(c.partnerId || null);
    setEditCtCustomer(c.customerName);
    setEditCtSite("");
    setEditCtStart(c.startDate ? String(c.startDate).slice(0, 10) : "");
    setEditCtEnd(c.endDate ? String(c.endDate).slice(0, 10) : "");
    const resolvedBasis = inferRentalRateBasis(c.monthlyRate, c.dailyRate, c.rateBasis);
    const resolvedDaily = resolveDailyRentalFee(c.monthlyRate, c.dailyRate);
    setEditCtMonthlyRate(toErpInputString(c.monthlyRate));
    setEditCtDailyRate(toErpInputString(resolvedDaily));
    setEditCtRateBasis(resolvedBasis);
    setEditCtDeposit(toErpInputString(c.deposit));
    const baseSupply = Number(c.monthlyRate || 0);
    const baseVat = c.vatAmount != null ? Number(c.vatAmount) : Math.round(baseSupply * 0.1);
    setEditCtVatAmount(toErpInputString(baseVat));
    setEditCtBillingDay(String(c.billingDay || "25"));
    setEditCtStatus(c.status || "ACTIVE");
    setEditCtMemo(c.memo || "");
    setEditCtFileUrl("");
    setEditCtFileName(c.contractFileName || "");
    setEditCtAddItems([]);
    setEditCtAttachedOptions(normalizeAttachedOptions(c.attachedOptions));

    const defaultItemLabel = "{1번째 아이템} 외";
    const defSpec = createDefaultTaxSpec(defaultItemLabel, baseSupply);
    const matchedPartner = partners.find(
      (p) => (c.partnerId && p.id === c.partnerId) || p.name === c.customerName || (c.customerBizNo && p.businessNo === c.customerBizNo)
    );
    const partnerAddr = matchedPartner
      ? [matchedPartner.address, matchedPartner.addressDetail].filter(Boolean).join(" ")
      : "";
    setEditCtTaxSpec({
      customerBizNo: c.customerBizNo || matchedPartner?.businessNo || "",
      customerCeoName: c.customerCeoName || matchedPartner?.ceoName || "",
      customerAddress: c.customerAddress || partnerAddr || "",
      customerBizType: c.customerBizType || matchedPartner?.bizType || "",
      customerBizClass: c.customerBizClass || matchedPartner?.bizItem || "",
      customerEmail: c.customerEmail || matchedPartner?.mainEmail || matchedPartner?.primaryContact?.email || "",
      customerEmail2: c.customerEmail2 || matchedPartner?.subEmail || "",
      taxPurpose: c.taxPurpose === "영수" ? "영수" : "청구",
      taxMemo: c.taxMemo ?? defaultItemLabel,
      taxItems:
        Array.isArray(c.taxItems) && c.taxItems.length > 0
          ? c.taxItems
          : [
              {
                ...defSpec.taxItems[0],
                itemName: c.modelName || "장비 임대료",
                unitCost: baseSupply,
                supplyAmount: baseSupply,
                vatAmount: baseVat,
              },
            ],
    });
    setShowEditContractModal(true);
  };

  // Handle Update Contract
  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCtId) return;
    if (!editCtCustomer || !editCtStart || !editCtEnd) {
      showToast("고객사, 계약 시작일, 종료일은 필수입니다.", "error");
      return;
    }

    const validAddItems = editCtAddItems
      .filter((r) => r.productId && (cleanErpNumber(r.qty) || 0) > 0)
      .map((r) => ({
        productId: Number(r.productId),
        qty: Math.max(1, cleanErpNumber(r.qty) || 1),
        unitCost: Math.max(0, cleanErpNumber(r.unitCost) || 0),
      }));

    try {
      const res = await fetch("/api/erp/rental/contracts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editCtId,
          entityType: editCtEntityType,
          partnerId: editCtPartnerId,
          customerName: editCtCustomer,
          siteName: "",
          rentalItems: validAddItems,
          attachedOptions: editCtAttachedOptions,
          startDate: editCtStart,
          endDate: editCtEnd,
          rateBasis: editCtRateBasis,
          monthlyRate: cleanErpNumber(editCtMonthlyRate),
          dailyRate: cleanErpNumber(editCtDailyRate),
          vatAmount: cleanErpNumber(editCtVatAmount),
          billingDay: editCtBillingDay,
          deposit: cleanErpNumber(editCtDeposit),
          status: editCtStatus,
          memo: editCtMemo,
          contractFileUrl: editCtFileUrl || undefined,
          contractFileName: editCtFileName || undefined,
          customerBizNo: editCtTaxSpec.customerBizNo,
          customerCeoName: editCtTaxSpec.customerCeoName,
          customerAddress: editCtTaxSpec.customerAddress,
          customerBizType: editCtTaxSpec.customerBizType,
          customerBizClass: editCtTaxSpec.customerBizClass,
          customerEmail: editCtTaxSpec.customerEmail,
          customerEmail2: editCtTaxSpec.customerEmail2,
          taxPurpose: editCtTaxSpec.taxPurpose,
          taxMemo: editCtTaxSpec.taxMemo,
          taxItems: editCtTaxSpec.taxItems,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "임대계약 수정 실패");

      showToast(`임대계약 [${editCtContractNo}] 수정 완료`);
      setShowEditContractModal(false);
      if (editCtId) delete contractFileCacheRef.current[editCtId];
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Contract
  const handleDeleteContract = async (c: any) => {
    if (!window.confirm(
      `[임대계약 삭제 확인]\n계약번호: ${c.contractNo}\n고객사: ${c.customerName}\n배정자산: ${c.assetNo || "-"} (${c.modelName || "-"})\n\n해당 임대계약이 삭제되며, 배정된 자산은 '대여가능(AVAILABLE)' 상태로 자동 복구됩니다.\n정말 삭제하시겠습니까?`
    )) {
      return;
    }

    try {
      const res = await fetch(`/api/erp/rental/contracts?id=${c.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "임대계약 삭제 실패");

      showToast(data.message || `계약 [${c.contractNo}] 삭제 완료`);
      delete contractFileCacheRef.current[c.id];
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Billing
  const handleDeleteBilling = async (b: any) => {
    if (!window.confirm(`임대 청구번호 [${b.billingNo}] (${b.customerName} - ₩${formatErpCurrency(b.proRataRevenue)})\n해당 청구 내역을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/erp/rental/billings?id=${b.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "청구 삭제 실패");

      showToast(data.message || "임대 청구 내역이 삭제되었습니다.");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const recalcBillingAmounts = (params: {
    contract?: any;
    basis: RentalRateBasis;
    dailyRateStr: string;
    daysStr: string;
    useProRata: boolean;
  }) => {
    const monthlyNum = Number(params.contract?.monthlyRate ?? 0);
    const dailyNum = cleanErpNumber(params.dailyRateStr);
    const daysNum = Math.max(1, parseInt(params.daysStr || "30", 10) || 30);
    const computed = computeRentalSupplyByBasis({
      monthlyRate: monthlyNum,
      dailyRate: dailyNum,
      rateBasis: params.basis,
      operatingDays: daysNum,
      useProRata: params.useProRata,
    });
    const nextVat =
      params.basis === "MONTHLY" &&
      !params.useProRata &&
      daysNum === 30 &&
      params.contract?.vatAmount != null
        ? Number(params.contract.vatAmount)
        : Math.round(computed.supplyAmount * 0.1);
    setBlSupplyAmount(toErpInputString(computed.supplyAmount));
    setBlVatAmount(toErpInputString(nextVat));
  };

  // 임대계약의 치환식({1번째 아이템} 외, {yymm} 등)을 평가하여 청구 폼에 적용하는 헬퍼
  const applyRentalContractTemplateToBilling = (ct: any, ymStr: string) => {
    if (!ct) return;
    const contractMonthly = Number(ct.monthlyRate || 600000);
    const basis = inferRentalRateBasis(contractMonthly, ct.dailyRate, ct.rateBasis);
    const dailyNum = resolveDailyRentalFee(contractMonthly, ct.dailyRate);
    const useDailyDefault = basis === "DAILY_MANUAL" || basis === "DAILY_AUTO";
    const supplyResult = computeRentalSupplyByBasis({
      monthlyRate: contractMonthly,
      dailyRate: dailyNum,
      rateBasis: basis,
      operatingDays: 30,
      useProRata: useDailyDefault,
    });
    const baseSupply = supplyResult.supplyAmount;
    const baseVat =
      !useDailyDefault && ct.vatAmount != null
        ? Number(ct.vatAmount)
        : Math.round(baseSupply * 0.1);
    const fallbackFirst = ct.modelName ? `${ct.modelName} (${ct.assetNo || ""})` : (ct.assetNo || "장비 임대료");
    const rawItems =
      Array.isArray(ct.taxItems) && ct.taxItems.length > 0
        ? ct.taxItems
        : [
            {
              month: ymStr.slice(5, 7) || String(new Date().getMonth() + 1).padStart(2, "0"),
              day: String(ct.billingDay || "25").padStart(2, "0"),
              itemName: fallbackFirst,
              spec: "",
              qty: 1,
              unitCost: baseSupply,
              supplyAmount: baseSupply,
              vatAmount: baseVat,
              note: "",
            },
          ];

    const resolvedItems = resolveContractTaxItemsTemplate(rawItems, {
      dateStr: ymStr,
      fallbackFirstItem: fallbackFirst,
    });
    const rawMemoTemplate = ct.taxMemo || "{1번째 아이템} 외";
    const resolvedMemo = resolveContractItemTemplate(rawMemoTemplate, {
      dateStr: ymStr,
      items: resolvedItems,
      fallbackFirstItem: resolvedItems[0]?.itemName || fallbackFirst,
    });

    setBlDays("30");
    setBlRateBasis(basis);
    setBlDailyRate(toErpInputString(dailyNum));
    setBlUseProRata(useDailyDefault);
    setBlSupplyAmount(toErpInputString(baseSupply));
    setBlVatAmount(toErpInputString(baseVat));
    setBlTaxSpec({
      customerBizNo: ct.customerBizNo || "",
      customerCeoName: ct.customerCeoName || "",
      customerAddress: ct.customerAddress || "",
      customerBizType: ct.customerBizType || "",
      customerBizClass: ct.customerBizClass || "",
      customerEmail: ct.customerEmail || "",
      customerEmail2: ct.customerEmail2 || "",
      taxPurpose: ct.taxPurpose === "영수" ? "영수" : "청구",
      taxMemo: resolvedMemo,
      taxItems: resolvedItems,
    });
  };

  // Handle Open Add Billing from Contract row (계약 항목 끌어다가 청구 생성)
  const handleOpenBillingFromContract = (ct: any) => {
    setBlContractId(String(ct.id));
    applyRentalContractTemplateToBilling(ct, blYm);
    setShowAddBillingModal(true);
  };

  // Handle Add Billing (헌장 4.1 일할 계산)
  const handleAddBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blContractId || !blYm || !blStart || !blEnd) {
      showToast("계약, 연월, 시작일, 종료일은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/rental/billings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: blContractId,
          yearMonth: blYm,
          startDate: blStart,
          endDate: blEnd,
          operatingDays: blDays,
          rateBasis: blRateBasis,
          dailyRate: cleanErpNumber(blDailyRate),
          useProRata: blUseProRata,
          supplyAmount: cleanErpNumber(blSupplyAmount),
          vatAmount: cleanErpNumber(blVatAmount),
          taxPurpose: blTaxSpec.taxPurpose,
          taxMemo: blTaxSpec.taxMemo,
          taxItems: blTaxSpec.taxItems,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "청구 등록 실패");

      showToast(`임대 계약 항목 기반 청구 생성 완료`);
      setShowAddBillingModal(false);
      setSubTab("billings");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Issue Tax from Rental Billing
  const handleIssueTaxFromRental = async (b: any) => {
    const targetCt = contracts.find(c => c.id === b.contractId);
    const supplierType = targetCt?.entityType || "CORP";
    const corpLabel = supplierType === "INDIVIDUAL" ? "드래곤알피에이 [개인]" : "(주)드래곤알피에이 [법인]";

    if (!window.confirm(`[${corpLabel} ➔ ${b.customerName}]\n${formatErpCurrency(b.proRataRevenue)}에 대한 전자세금계산서를 즉시 발행하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch("/api/erp/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainType: "RENTAL",
          supplierEntityType: supplierType,
          refId: b.id,
          customerName: b.customerName,
          businessNo: targetCt?.customerBizNo || "100-00-00000",
          ceoName: targetCt?.customerCeoName || "대표자",
          customerAddress: targetCt?.customerAddress || "",
          customerBizType: targetCt?.customerBizType || "",
          customerBizClass: targetCt?.customerBizClass || "",
          customerEmail: targetCt?.customerEmail || "",
          customerEmail2: targetCt?.customerEmail2 || "",
          purposeType: b.taxPurpose || targetCt?.taxPurpose || "청구",
          memo: b.taxMemo || targetCt?.taxMemo || "",
          taxItems: b.taxItems || targetCt?.taxItems || [],
          itemName: b.taxMemo || `장비 임대료 (${b.modelName} ${b.assetNo} / ${b.operatingDays}일)`,
          supplyAmount: b.proRataRevenue,
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
      <div className="flex items-center justify-between border-b border-[#b5a894] dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab("assets")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "assets" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>자산 취득 & 감가상각 ({assets.length})</span>
          </button>
          <button
            onClick={() => setSubTab("contracts")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "contracts" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>임대계약 대장 ({contracts.length})</span>
          </button>
          <button
            onClick={() => setSubTab("billings")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "billings" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>일할 매출정산 & 청구 ({billings.length})</span>
          </button>
          <button
            onClick={() => setSubTab("models")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "models" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>임대 기종 모델 ({models.length})</span>
          </button>
        </div>

        {/* Action Buttons (Pipeline) */}
        <div className="flex items-center gap-2">
          {subTab === "assets" && (
            <>
              <button
                onClick={() => setShowDeprecModal(true)}
                className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-xs font-bold text-amber-300 rounded flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>당월 감가상각 마감 실행</span>
              </button>
              <button
                onClick={() => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  setAcqDate(todayStr);
                  setAssetNo(computeNextRentalAssetNo(todayStr, assets));
                  setShowAcquireAssetModal(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>자산 취득 등록</span>
              </button>
            </>
          )}
          {subTab === "contracts" && (
            <button
              onClick={() => setShowAddContractModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>신규 임대계약</span>
            </button>
          )}
          {subTab === "billings" && canBill && (
            <button
              onClick={() => setShowAddBillingModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>일할 청구서 생성</span>
            </button>
          )}
          {subTab === "models" && (
            <button
              onClick={() => {
                setModelDailyManual(false);
                setModelDailyRate(
                  toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(modelMonthlyRate)))
                );
                setShowAddModelModal(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>기종 모델 등록</span>
            </button>
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
      <div className="flex flex-wrap items-end gap-3 bg-[#e2dbcd] p-2.5 rounded border border-[#b5a894] text-xs text-[#0f172a] dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-200">
        {subTab === "billings" && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold whitespace-nowrap">정산 연월</label>
            <input
              type="month"
              value={selectedYm}
              onChange={(e) => setSelectedYm(e.target.value)}
              className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>
        )}
        <div className="flex flex-col gap-1 min-w-[260px] flex-1 max-w-md">
          <label className="text-[11px] font-semibold whitespace-nowrap">통합 검색</label>
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={rentalSearchQuery}
              onChange={(e) => setRentalSearchQuery(e.target.value)}
              placeholder="초성·고객사·자산번호·모델명 검색"
              className="w-full h-8 pl-8 pr-7 bg-[#f4efe4] border border-[#b5a894] rounded text-xs text-[#0f172a] font-medium focus:outline-none focus:border-[#1d4ed8]"
            />
            {rentalSearchQuery && (
              <button
                type="button"
                onClick={() => setRentalSearchQuery("")}
                className="absolute right-2 text-[#64748b] hover:text-[#0f172a]"
                title="검색어 초기화"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {subTab === "billings" && (
          <span className="text-[#475569] text-[11px] whitespace-nowrap pb-1">
            과금 기준 3원칙 적용: 월단가 · 일단가 지정 · 월단가÷30 천원반올림
          </span>
        )}
      </div>

      {/* Main Inspection Grid (Z-Pattern ③) */}
      <div className="flex-1 bg-[#f4efe4] border border-[#b5a894] rounded overflow-auto shadow-inner dark:bg-slate-900 dark:border-slate-800">
        {subTab === "assets" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                {renderSortTh("자산번호", "assetNo")}
                {renderSortTh("기종 모델", "modelName")}
                {renderSortTh("제조사", "manufacturer")}
                {renderSortTh("시리얼번호", "serialNo")}
                {renderSortTh("취득일자", "acquisitionDate")}
                {renderSortTh("취득원가", "acquisitionCost", "right")}
                {renderSortTh("잔존가치", "salvageValue", "right")}
                {renderSortTh("내용연수", "usefulLifeYears", "center")}
                {renderSortTh("감가상각누계액", "accumulatedDepreciation", "right")}
                {renderSortTh("현재 장부가액", "bookValue", "right")}
                {renderSortTh("자산상태", "status", "center")}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedAssets.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    등록된 취득 자산이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedAssets.map((a) => (
                  <tr key={a.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-mono font-bold text-blue-400">{a.assetNo}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{a.modelName}</td>
                    <td className="py-2 px-3 text-slate-300">{a.manufacturer}</td>
                    <td className="py-2 px-3 font-mono text-slate-400">{a.serialNo || "-"}</td>
                    <td className="py-2 px-3 font-mono text-slate-300">{a.acquisitionDate}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-200">{formatErpCurrency(a.acquisitionCost)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{formatErpCurrency(a.salvageValue)}</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-300">{formatErpNumber(a.usefulLifeYears)}년</td>
                    <td className="py-2 px-3 text-right font-mono text-rose-400">{formatErpCurrency(a.accumulatedDepreciation)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatErpCurrency(a.bookValue)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.status === "RENTED" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                        a.status === "AVAILABLE" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                        "bg-slate-800 text-slate-400"
                      }`}>
                        {a.status === "RENTED" ? "대여중" : a.status === "AVAILABLE" ? "임대가능" : a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {subTab === "contracts" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                <th className="py-2.5 px-3 text-center sticky left-0 bg-[#e2dbcd] dark:bg-slate-950 z-20 border-r border-[#b5a894] dark:border-slate-800">관리 (CRUD)</th>
                {renderSortTh("귀속 사업자", "entityType")}
                {renderSortTh("계약번호", "contractNo")}
                {renderSortTh("고객사(임차인)", "customerName")}
                {renderSortTh("임대 제품 및 수량", "modelName")}
                {renderSortTh("배정 자산", "assetNo")}
                {renderSortTh("계약기간", "startDate")}
                {renderSortTh("월임대료", "monthlyRate", "right")}
                {renderSortTh("일단가 / 과금기준", "dailyRate", "right")}
                <th className="py-2.5 px-3 text-center">계약서</th>
                {renderSortTh("계약상태", "status", "center")}
                <th className="py-2.5 px-3 text-center">반납 조치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedContracts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500">
                    등록된 임대계약이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedContracts.map((c) => {
                  const taxItemsArr = Array.isArray(c.taxItems) ? c.taxItems : [];
                  const totalQty = taxItemsArr.reduce((acc: number, it: any) => acc + (Number(it.qty) || 1), 0);
                  const productSummary =
                    taxItemsArr.length > 1
                      ? `${taxItemsArr[0]?.itemName || c.modelName || "제품"} 외 ${taxItemsArr.length - 1}종 (총 ${formatErpNumber(totalQty)}대)`
                      : taxItemsArr.length === 1
                      ? `${taxItemsArr[0]?.itemName || c.modelName || "제품"} (${formatErpNumber(taxItemsArr[0]?.qty || 1)}대)`
                      : c.modelName || "-";

                  return (
                    <tr key={c.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                      <td className="py-2 px-3 text-center sticky left-0 bg-[#f4efe4] dark:bg-slate-900 border-r border-[#b5a894] dark:border-slate-800 z-10 shadow-sm">
                        <div className="inline-flex items-center gap-1">
                          {canBill && (
                            <button
                              type="button"
                              onClick={() => handleOpenBillingFromContract(c)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-400 inline-flex items-center gap-1 transition"
                              title="이 임대계약의 품목을 끌어와 청구서 생성"
                            >
                              <Plus className="w-3 h-3" />
                              <span>청구생성</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditContract(c)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-400 inline-flex items-center gap-1 transition"
                            title="계약 정보 수정"
                          >
                            <Edit className="w-3 h-3" />
                            <span>수정</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContract(c)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-400 inline-flex items-center gap-1 transition"
                            title="계약 삭제 및 자산 복구"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>삭제</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {c.entityType === "INDIVIDUAL" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            개인
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            법인
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-blue-400">{c.contractNo}</td>
                      <td className="py-2 px-3 font-bold text-slate-100">{c.customerName}</td>
                      <td className="py-2 px-3 font-semibold text-slate-200">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{productSummary}</span>
                          {normalizeAttachedOptions(c.attachedOptions).length > 0 && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300"
                              title={formatAttachedOptionsSummary(c.attachedOptions)}
                            >
                              부착옵션 {normalizeAttachedOptions(c.attachedOptions).length}종
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-300">
                        {c.activeAssetCount > 1
                          ? `${c.assetNo || "-"} 외 ${c.activeAssetCount - 1}대 (총 ${c.activeAssetCount}대)`
                          : c.assetNo || (taxItemsArr.length > 0 ? `품목 ${taxItemsArr.length}건` : "출고 대기")}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-300">{c.startDate ? String(c.startDate).slice(0, 10) : "-"} ~ {c.endDate ? String(c.endDate).slice(0, 10) : "-"}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(c.monthlyRate)}</td>
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-bold text-[#1e3a8a] dark:text-blue-300">
                            {formatErpCurrency(resolveDailyRentalFee(c.monthlyRate, c.dailyRate))}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e2dbcd] text-[#334155] border border-[#b5a894] whitespace-nowrap shrink-0">
                            {getRentalRateBasisShortLabel(inferRentalRateBasis(c.monthlyRate, c.dailyRate, c.rateBasis))}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {c.hasContractFile ? (
                          <button
                            onClick={() => handleOpenContractFile(c)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd] hover:bg-[#bfdbfe] dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900 inline-flex items-center gap-1 transition"
                            title={c.contractFileName || "계약서 열람"}
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>열람</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#64748b] dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === "ACTIVE" ? "bg-amber-950 text-amber-400 border border-amber-800" : "bg-slate-800 text-slate-400"
                        }`}>
                          {c.status === "ACTIVE" ? "대여중" : "반납완료"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {c.status === "ACTIVE" ? (
                          <button
                            onClick={() => handleReturnContract(c.id)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[11px] font-semibold transition"
                          >
                            장비회수/반납
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px]">반납됨</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {subTab === "billings" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                <th className="py-2.5 px-3 text-center sticky left-0 bg-[#e2dbcd] dark:bg-slate-950 z-20 border-r border-[#b5a894] dark:border-slate-800">관리</th>
                {renderSortTh("청구번호", "billingNo")}
                {renderSortTh("고객사", "customerName")}
                {renderSortTh("자산/기종", "assetNo")}
                {renderSortTh("가동일수", "operatingDays", "center")}
                {renderSortTh("일할매출액", "proRataRevenue", "right")}
                {renderSortTh("감가상각원가(COGS)", "depreciationCogs", "right")}
                {renderSortTh("순마진", "netMargin", "right")}
                {renderSortTh("수납상태", "paymentStatus", "center")}
                <th className="py-2.5 px-3 text-center">세금계산서</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedBillings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    해당 연월에 생성된 임대 정산 청구서가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedBillings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 text-center sticky left-0 bg-[#f4efe4] dark:bg-slate-900 border-r border-[#b5a894] dark:border-slate-800 z-10 shadow-sm">
                      {!b.taxInvoiceId ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteBilling(b)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-400 inline-flex items-center gap-1 transition"
                          title="청구 내역 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>삭제</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#78716c] font-mono">발행확정</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-blue-400">{b.billingNo}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{b.customerName}</td>
                    <td className="py-2 px-3 text-slate-200">{b.assetNo} ({b.modelName})</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-300">{formatErpNumber(b.operatingDays)}일</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-400">
                      {formatErpCurrency(b.proRataRevenue)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">
                      {formatErpCurrency(b.depreciationCogs)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatErpCurrency(b.netMargin)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        b.paymentStatus === "PAID" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}>
                        {b.paymentStatus === "PAID" ? "완납" : "미수"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {b.taxInvoiceNo ? (
                        <span className="font-mono text-[10px] text-blue-400">{b.taxInvoiceNo}</span>
                      ) : (
                        <button
                          onClick={() => handleIssueTaxFromRental(b)}
                          className="px-2 py-0.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-700 text-blue-300 rounded text-[11px] font-semibold transition"
                        >
                          계산서발행
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {subTab === "models" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                {renderSortTh("모델 코드", "model_code")}
                {renderSortTh("모델명", "model_name")}
                {renderSortTh("제조사", "manufacturer")}
                {renderSortTh("제원 사양", "spec")}
                {renderSortTh("기준 월임대료", "standard_monthly_rate", "right")}
                {renderSortTh("기준 일일단가", "standard_daily_rate", "right")}
                {renderSortTh("상태", "status", "center")}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedModels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    등록된 기종 모델이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedModels.map((m) => (
                  <tr key={m.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-mono font-bold text-blue-400">{m.model_code}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{m.model_name}</td>
                    <td className="py-2 px-3 text-slate-300">{m.manufacturer}</td>
                    <td className="py-2 px-3 text-slate-400">{m.spec || "-"}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(m.standard_monthly_rate)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      {formatErpCurrency(resolveDailyRentalFee(m.standard_monthly_rate, m.standard_daily_rate))}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        정상가동
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Terminal Summary (Z-Pattern ④) */}
      <div className="bg-[#e2dbcd] border border-[#b5a894] px-4 py-2.5 rounded flex items-center justify-between text-xs text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">
        <div className="flex items-center gap-4">
          <span>총 자산: <strong className="text-white">{formatErpNumber(assets.length)}대</strong></span>
          <span>임대중: <strong className="text-amber-400">{formatErpNumber(assets.filter(a => a.status === "RENTED").length)}대</strong></span>
          <span>임대가능: <strong className="text-emerald-400">{formatErpNumber(assets.filter(a => a.status === "AVAILABLE").length)}대</strong></span>
          <span>총 장부가액: <strong className="text-blue-400">{formatErpCurrency(assets.reduce((s, a) => s + Number(a.bookValue || 0), 0))}</strong></span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          ※ 헌장 1.3 출고 승인 마감 시 자산상태 RENTED 전환 원칙 준수
        </div>
      </div>

      {/* Modal: Acquire Asset */}
      <AcquireAssetModal
        acqCost={acqCost}
        acqDate={acqDate}
        assetModelId={assetModelId}
        assetNo={assetNo}
        assetQty={assetQty}
        assets={assets}
        computeNextRentalAssetNo={computeNextRentalAssetNo}
        handleAcquireAsset={handleAcquireAsset}
        modelComboboxOptions={modelComboboxOptions}
        salvageValue={salvageValue}
        serialNo={serialNo}
        setAcqCost={setAcqCost}
        setAcqDate={setAcqDate}
        setAssetModelId={setAssetModelId}
        setAssetNo={setAssetNo}
        setAssetQty={setAssetQty}
        setSalvageValue={setSalvageValue}
        setSerialNo={setSerialNo}
        setShowAcquireAssetModal={setShowAcquireAssetModal}
        setUsefulLife={setUsefulLife}
        showAcquireAssetModal={showAcquireAssetModal}
        usefulLife={usefulLife}
      />

      {/* Modal: Add Model */}
      <AddModelModal
        handleAddModel={handleAddModel}
        modelCode={modelCode}
        modelDailyManual={modelDailyManual}
        modelDailyRate={modelDailyRate}
        modelMonthlyRate={modelMonthlyRate}
        modelName={modelName}
        modelSpec={modelSpec}
        setModelCode={setModelCode}
        setModelDailyManual={setModelDailyManual}
        setModelDailyRate={setModelDailyRate}
        setModelMonthlyRate={setModelMonthlyRate}
        setModelName={setModelName}
        setModelSpec={setModelSpec}
        setShowAddModelModal={setShowAddModelModal}
        showAddModelModal={showAddModelModal}
      />

      {/* Modal: Add Contract (기본 계약 선택 + 재고 제품 선택 + 수량 + 단가 입력 간략 구성) */}
      <AddContractModal
        contractComboboxOptions={contractComboboxOptions}
        contracts={contracts}
        ctAttachedOptions={ctAttachedOptions}
        ctBaseContractId={ctBaseContractId}
        ctBillingDay={ctBillingDay}
        ctCustomer={ctCustomer}
        ctDailyRate={ctDailyRate}
        ctDeposit={ctDeposit}
        ctEnd={ctEnd}
        ctEntityType={ctEntityType}
        ctFileInputRef={ctFileInputRef}
        ctFileName={ctFileName}
        ctMonthlyRate={ctMonthlyRate}
        ctPartnerId={ctPartnerId}
        ctRateBasis={ctRateBasis}
        ctRentalItems={ctRentalItems}
        ctStart={ctStart}
        ctTaxSpec={ctTaxSpec}
        ctVatAmount={ctVatAmount}
        handleAddContract={handleAddContract}
        handleContractFileUpload={handleContractFileUpload}
        inStockProductComboboxOptions={inStockProductComboboxOptions}
        inStockProducts={inStockProducts}
        isCtFileDragging={isCtFileDragging}
        optionCatalog={optionCatalog}
        partnerComboboxOptions={partnerComboboxOptions}
        partners={partners}
        recalcDraftItemsTotals={recalcDraftItemsTotals}
        setCtAttachedOptions={setCtAttachedOptions}
        setCtBaseContractId={setCtBaseContractId}
        setCtBillingDay={setCtBillingDay}
        setCtCustomer={setCtCustomer}
        setCtDailyRate={setCtDailyRate}
        setCtDeposit={setCtDeposit}
        setCtEnd={setCtEnd}
        setCtEntityType={setCtEntityType}
        setCtFileName={setCtFileName}
        setCtFileUrl={setCtFileUrl}
        setCtMonthlyRate={setCtMonthlyRate}
        setCtPartnerId={setCtPartnerId}
        setCtRateBasis={setCtRateBasis}
        setCtRentalItems={setCtRentalItems}
        setCtStart={setCtStart}
        setCtTaxSpec={setCtTaxSpec}
        setCtVatAmount={setCtVatAmount}
        setIsCtFileDragging={setIsCtFileDragging}
        setShowAddContractModal={setShowAddContractModal}
        showAddContractModal={showAddContractModal}
      />

      {/* Modal: Edit Rental Contract */}
      <EditContractModal
        editCtAddItems={editCtAddItems}
        editCtAttachedOptions={editCtAttachedOptions}
        editCtBillingDay={editCtBillingDay}
        editCtContractNo={editCtContractNo}
        editCtCustomer={editCtCustomer}
        editCtDailyRate={editCtDailyRate}
        editCtDeposit={editCtDeposit}
        editCtEnd={editCtEnd}
        editCtEntityType={editCtEntityType}
        editCtMemo={editCtMemo}
        editCtMonthlyRate={editCtMonthlyRate}
        editCtPartnerId={editCtPartnerId}
        editCtRateBasis={editCtRateBasis}
        editCtStart={editCtStart}
        editCtStatus={editCtStatus}
        editCtTaxSpec={editCtTaxSpec}
        editCtVatAmount={editCtVatAmount}
        handleUpdateContract={handleUpdateContract}
        inStockProductComboboxOptions={inStockProductComboboxOptions}
        inStockProducts={inStockProducts}
        optionCatalog={optionCatalog}
        partnerComboboxOptions={partnerComboboxOptions}
        partners={partners}
        recalcDraftItemsTotals={recalcDraftItemsTotals}
        setEditCtAddItems={setEditCtAddItems}
        setEditCtAttachedOptions={setEditCtAttachedOptions}
        setEditCtBillingDay={setEditCtBillingDay}
        setEditCtCustomer={setEditCtCustomer}
        setEditCtDailyRate={setEditCtDailyRate}
        setEditCtDeposit={setEditCtDeposit}
        setEditCtEnd={setEditCtEnd}
        setEditCtEntityType={setEditCtEntityType}
        setEditCtMemo={setEditCtMemo}
        setEditCtMonthlyRate={setEditCtMonthlyRate}
        setEditCtPartnerId={setEditCtPartnerId}
        setEditCtRateBasis={setEditCtRateBasis}
        setEditCtStart={setEditCtStart}
        setEditCtStatus={setEditCtStatus}
        setEditCtTaxSpec={setEditCtTaxSpec}
        setEditCtVatAmount={setEditCtVatAmount}
        setShowEditContractModal={setShowEditContractModal}
        showEditContractModal={showEditContractModal}
      />

      {/* Modal: Add Billing (헌장 4.1 일할 청구 생성) */}
      <AddBillingModal
        applyRentalContractTemplateToBilling={applyRentalContractTemplateToBilling}
        blContractId={blContractId}
        blDailyRate={blDailyRate}
        blDays={blDays}
        blEnd={blEnd}
        blRateBasis={blRateBasis}
        blStart={blStart}
        blSupplyAmount={blSupplyAmount}
        blTaxSpec={blTaxSpec}
        blUseProRata={blUseProRata}
        blVatAmount={blVatAmount}
        blYm={blYm}
        contractComboboxOptions={contractComboboxOptions}
        contracts={contracts}
        handleAddBilling={handleAddBilling}
        recalcBillingAmounts={recalcBillingAmounts}
        setBlContractId={setBlContractId}
        setBlDailyRate={setBlDailyRate}
        setBlDays={setBlDays}
        setBlEnd={setBlEnd}
        setBlRateBasis={setBlRateBasis}
        setBlStart={setBlStart}
        setBlSupplyAmount={setBlSupplyAmount}
        setBlTaxSpec={setBlTaxSpec}
        setBlUseProRata={setBlUseProRata}
        setBlVatAmount={setBlVatAmount}
        setBlYm={setBlYm}
        setShowAddBillingModal={setShowAddBillingModal}
        showAddBillingModal={showAddBillingModal}
      />

      {/* Modal: Depreciation Execution */}
      {showDeprecModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-700/60 w-full max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>당월 정액법 감가상각 마감 실행</span>
              </h3>
              <button onClick={() => setShowDeprecModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs">
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded text-amber-200">
                <p className="font-bold mb-1">⚖️ 감가상각 회계 원칙</p>
                <p className="text-[11px] leading-relaxed text-amber-300/90">
                  - 정액법 공식: (취득원가 - 잔존가치) / (내용연수 × 12개월)<br/>
                  - 실행 대상: 현재 가동 중인 전 자산 (총 {formatErpNumber(assets.length)}대)<br/>
                  - 산출된 월 상각비는 임대 기간별 매출원가로 1:1 매핑됩니다.
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeprecModal(false)}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDepreciation}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 font-bold text-black rounded"
                >
                  마감 실행
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Contract Document Viewer */}
      {activeDocViewer && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={() => setActiveDocViewer(null)}
        >
          <div
            className="bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-700 w-full max-w-4xl h-[85vh] rounded shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#b5a894] dark:border-slate-800 bg-[#ebe5d8] dark:bg-slate-950">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400 shrink-0" />
                <span className="font-bold text-xs text-[#0f172a] dark:text-slate-100 truncate">
                  {activeDocViewer.title}
                </span>
                <span className="text-[11px] text-[#475569] dark:text-slate-400 font-mono truncate">
                  ({activeDocViewer.fileName})
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeDocViewer.url && (
                  <a
                    href={activeDocViewer.url}
                    download={activeDocViewer.fileName}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>다운로드</span>
                  </a>
                )}
                <button
                  onClick={() => setActiveDocViewer(null)}
                  className="p-1 text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-auto p-4">
              {activeDocViewer.url.startsWith("data:application/pdf") ||
              activeDocViewer.fileName.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={activeDocViewer.url}
                  className="w-full h-full rounded border border-slate-800 bg-white"
                  title={activeDocViewer.fileName}
                />
              ) : activeDocViewer.url.startsWith("data:image/") ? (
                <img
                  src={activeDocViewer.url}
                  alt={activeDocViewer.fileName}
                  className="max-w-full max-h-full object-contain rounded shadow-lg"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-6 bg-slate-900 border border-slate-800 rounded">
                  <FileText className="w-10 h-10 text-blue-400" />
                  <div className="text-xs text-slate-200 font-semibold">{activeDocViewer.fileName}</div>
                  <div className="text-[11px] text-slate-400">
                    브라우저 내 직접 미리보기를 지원하지 않는 문서 형식입니다. 다운로드하여 확인하십시오.
                  </div>
                  <a
                    href={activeDocViewer.url}
                    download={activeDocViewer.fileName}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>계약서 파일 다운로드</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
