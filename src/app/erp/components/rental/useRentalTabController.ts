"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { formatErpCurrency, formatErpNumber, toErpInputString, cleanErpNumber } from "@/lib/erpFormat";
import { resolveContractItemTemplate, resolveContractTaxItemsTemplate } from "@/lib/erpContractTemplate";
import {
  type RentalRateBasis,
  calculateAutoDailyRentalFee,
  resolveDailyRentalFee,
  inferRentalRateBasis,
  computeRentalSupplyByBasis,
} from "@/lib/rentalFeeUtils";
import { sortCustomersByName } from "@/lib/hangulSearch";
import { type AttachedForkliftOption, normalizeAttachedOptions, normalizeItemClass } from "@/lib/forkliftDomain";
import { fetchCachedMasterData, useMasterDataSync } from "@/lib/erpMasterDataBus";
import { type BuyerTaxSpec, createDefaultTaxSpec } from "../ContractTaxInvoiceSection";
import { type SearchSelectOption } from "../SearchSelectCombobox";
import { type CatalogOptionItem } from "../ForkliftOptionAttachPanel";
import { findBlockedPartnerMatch, getPartnerTradeBlockInfo } from "@/lib/partnerStatusClient";
import type { RentalDocViewerState, RentalSubTabKey } from "./RentalSubTabGrids";
import type { RentalItemDraft } from "./rentalTypes";

export interface UseRentalTabControllerParams {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onNavigateToTax?: () => void;
}

export function toValidRentalItemsPayload(drafts: RentalItemDraft[]) {
  return drafts
    .filter((r) => r.productId && (cleanErpNumber(r.qty) || 0) > 0)
    .map((r) => ({
      productId: Number(r.productId),
      qty: Math.max(1, cleanErpNumber(r.qty) || 1),
      unitCost: Math.max(0, cleanErpNumber(r.unitCost) || 0),
    }));
}

export function toTaxSpecPayloadFields(spec: BuyerTaxSpec) {
  return {
    customerBizNo: spec.customerBizNo,
    customerCeoName: spec.customerCeoName,
    customerAddress: spec.customerAddress,
    customerBizType: spec.customerBizType,
    customerBizClass: spec.customerBizClass,
    customerEmail: spec.customerEmail,
    customerEmail2: spec.customerEmail2,
    taxPurpose: spec.taxPurpose,
    taxMemo: spec.taxMemo,
    taxItems: spec.taxItems,
  };
}

async function requestRentalJson(url: string, init: RequestInit | undefined, fallbackError: string) {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || fallbackError);
  return data;
}

/**
 * 렌탈 자산 취득·감가상각·임대계약·일할 청구 및 세금계산서 발행 상태·액션 컨트롤러 훅
 */
export function useRentalTabController({
  currentUser,
  selectedEntity = "ALL",
  onNavigateToTax,
}: UseRentalTabControllerParams) {
  const canBill =
    currentUser?.roleCode === "ADMIN" ||
    currentUser?.loginId === "admin" ||
    Boolean(currentUser?.canBill);
  const [subTab, setSubTab] = useState<RentalSubTabKey>("assets");
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
  const [activeDocViewer, setActiveDocViewer] = useState<RentalDocViewerState | null>(null);
  const contractFileCacheRef = useRef<Record<number, { url: string; fileName: string }>>({});

  // Contract Edit Form States
  const [editCtId, setEditCtId] = useState<number | null>(null);
  const [editCtContractNo, setEditCtContractNo] = useState("");
  const [editCtEntityType, setEditCtEntityType] = useState<"CORP" | "INDIVIDUAL">("CORP");
  const [editCtPartnerId, setEditCtPartnerId] = useState<number | null>(null);
  const [editCtCustomer, setEditCtCustomer] = useState("");
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
  const [editCtTaxSpec, setEditCtTaxSpec] = useState<BuyerTaxSpec>(() => createDefaultTaxSpec("장비 임대료", 0));
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
  const [manufacturer] = useState("Skyjack");
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
  const [ctAssetId, setCtAssetId] = useState("");
  const [ctRentalItems, setCtRentalItems] = useState<RentalItemDraft[]>([{ productId: "", qty: "1", unitCost: "0" }]);
  const [ctStart, setCtStart] = useState(new Date().toISOString().split("T")[0]);
  const [ctEnd, setCtEnd] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [ctRateBasis, setCtRateBasis] = useState<RentalRateBasis>("MONTHLY");
  const [ctMonthlyRate, setCtMonthlyRate] = useState("0");
  const [ctDailyRate, setCtDailyRate] = useState("0");
  const [ctVatAmount, setCtVatAmount] = useState("0");
  const [ctBillingDay, setCtBillingDay] = useState("25");
  const [ctDeposit, setCtDeposit] = useState("0");
  const [ctTaxSpec, setCtTaxSpec] = useState<BuyerTaxSpec>(() => createDefaultTaxSpec("{1번째 아이템} 외", 0));
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
  const [blTaxSpec, setBlTaxSpec] = useState<BuyerTaxSpec>(() => createDefaultTaxSpec("장비 임대료", 600000));

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

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
        const daily = resolveDailyRentalFee(monthly, Number(m.standard_daily_rate ?? m.standardDailyRate ?? 0));
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
      const daily = resolveDailyRentalFee(monthly, Number(m.standard_daily_rate ?? m.standardDailyRate ?? 0));
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
    const openViewer = (url: string, fileName: string) =>
      setActiveDocViewer({
        title: `${c.contractNo} 임대계약서 원본`,
        customerName: c.customerName,
        url,
        fileName,
      });

    const cached = contractFileCacheRef.current[c.id];
    if (cached) {
      openViewer(cached.url, cached.fileName);
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
        openViewer(entry.url, entry.fileName);
      } else {
        showToast("등록된 임대계약서 파일을 찾을 수 없습니다.", "error");
      }
    } catch {
      showToast("임대계약서 파일 조회 실패", "error");
    }
  };

  // Fetch All Rental Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const contractsUrl =
        selectedEntity && selectedEntity !== "ALL"
          ? `/api/erp/rental/contracts?entityType=${selectedEntity}`
          : "/api/erp/rental/contracts";

      const [mRes, aRes, cRes, bRes, tRes] = await Promise.all([
        fetch("/api/erp/rental/products", { cache: "no-store" }),
        fetch("/api/erp/rental/assets", { cache: "no-store" }),
        fetch(contractsUrl, { cache: "no-store" }),
        fetch(`/api/erp/rental/billings?yearMonth=${selectedYm}`, { cache: "no-store" }),
        fetch("/api/erp/trade/products", { cache: "no-store" }).catch(() => null),
      ]);

      const [mData, aData, cData, bData, tData] = await Promise.all([
        mRes.json(),
        aRes.json(),
        cRes.json(),
        bRes.json(),
        tRes ? tRes.json().catch(() => null) : Promise.resolve(null),
      ]);

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
      await requestRentalJson(
        "/api/erp/rental/products",
        {
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
        },
        "모델 등록 실패"
      );

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
      const data = await requestRentalJson(
        "/api/erp/rental/assets",
        {
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
        },
        "자산 취득 등록 실패"
      );

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
      const data = await requestRentalJson(
        "/api/erp/rental/depreciation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ yearMonth: selectedYm, actorName: currentUser?.name || "ADMIN" }),
        },
        "감가상각 마감 실패"
      );

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

    try {
      const data = await requestRentalJson(
        "/api/erp/rental/contracts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseContractId: ctBaseContractId || null,
            entityType: ctEntityType,
            partnerId: ctPartnerId,
            customerName: ctCustomer,
            siteName: "",
            assetId: ctAssetId || null,
            rentalItems: toValidRentalItemsPayload(ctRentalItems),
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
            ...toTaxSpecPayloadFields(ctTaxSpec),
          }),
        },
        "계약 등록 실패"
      );

      showToast(data.assignedCount > 0 ? `임대계약 등록 및 재고 제품 ${data.assignedCount}대 배정 완료` : `기본 임대계약 등록 완료`);
      setShowAddContractModal(false);
      setCtBaseContractId("");
      setCtPartnerId(null);
      setCtCustomer("");
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
      const data = await requestRentalJson(
        "/api/erp/rental/contracts",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contractId, action: "RETURN" }),
        },
        "반납 처리 실패"
      );

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
    const partnerAddr = matchedPartner ? [matchedPartner.address, matchedPartner.addressDetail].filter(Boolean).join(" ") : "";
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
          : [{ ...defSpec.taxItems[0], itemName: c.modelName || "장비 임대료", unitCost: baseSupply, supplyAmount: baseSupply, vatAmount: baseVat }],
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

    try {
      await requestRentalJson(
        "/api/erp/rental/contracts",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editCtId,
            entityType: editCtEntityType,
            partnerId: editCtPartnerId,
            customerName: editCtCustomer,
            siteName: "",
            rentalItems: toValidRentalItemsPayload(editCtAddItems),
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
            ...toTaxSpecPayloadFields(editCtTaxSpec),
          }),
        },
        "임대계약 수정 실패"
      );

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
      const data = await requestRentalJson(`/api/erp/rental/contracts?id=${c.id}`, { method: "DELETE" }, "임대계약 삭제 실패");

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
      const data = await requestRentalJson(`/api/erp/rental/billings?id=${b.id}`, { method: "DELETE" }, "청구 삭제 실패");

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
      params.basis === "MONTHLY" && !params.useProRata && daysNum === 30 && params.contract?.vatAmount != null
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
    const baseVat = !useDailyDefault && ct.vatAmount != null ? Number(ct.vatAmount) : Math.round(baseSupply * 0.1);
    const fallbackFirst = ct.modelName ? `${ct.modelName} (${ct.assetNo || ""})` : (ct.assetNo || "장비 임대료");
    const rawItems =
      Array.isArray(ct.taxItems) && ct.taxItems.length > 0
        ? ct.taxItems
        : [{
            month: ymStr.slice(5, 7) || String(new Date().getMonth() + 1).padStart(2, "0"),
            day: String(ct.billingDay || "25").padStart(2, "0"),
            itemName: fallbackFirst,
            spec: "",
            qty: 1,
            unitCost: baseSupply,
            supplyAmount: baseSupply,
            vatAmount: baseVat,
            note: "",
          }];

    const resolvedItems = resolveContractTaxItemsTemplate(rawItems, { dateStr: ymStr, fallbackFirstItem: fallbackFirst });
    const resolvedMemo = resolveContractItemTemplate(ct.taxMemo || "{1번째 아이템} 외", {
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
      await requestRentalJson(
        "/api/erp/rental/billings",
        {
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
        },
        "청구 등록 실패"
      );

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
    const targetCt = contracts.find((c) => c.id === b.contractId);
    const supplierType = targetCt?.entityType || "CORP";
    const corpLabel = supplierType === "INDIVIDUAL" ? "드래곤알피에이 [개인]" : "(주)드래곤알피에이 [법인]";

    if (!window.confirm(`[${corpLabel} ➔ ${b.customerName}]\n${formatErpCurrency(b.proRataRevenue)}에 대한 전자세금계산서를 즉시 발행하시겠습니까?`)) {
      return;
    }
    try {
      const data = await requestRentalJson(
        "/api/erp/tax-invoices",
        {
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
        },
        "세금계산서 발행 실패"
      );

      showToast(`세금계산서 [${data.invoice.invoice_no || data.invoice.invoiceNo}] 국세청 발행 완료!`);
      await fetchData();
      if (onNavigateToTax) onNavigateToTax();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const openAcquireAssetModal = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    setAcqDate(todayStr);
    setAssetNo(computeNextRentalAssetNo(todayStr, assets));
    setShowAcquireAssetModal(true);
  };

  const openAddModelModal = () => {
    setModelDailyManual(false);
    setModelDailyRate(toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(modelMonthlyRate))));
    setShowAddModelModal(true);
  };

  return {
    canBill, subTab, setSubTab, loading, toast,
    models, assets, contracts, billings, partners,
    selectedYm, setSelectedYm, rentalSearchQuery, setRentalSearchQuery,
    showAddModelModal, setShowAddModelModal, showAcquireAssetModal, setShowAcquireAssetModal,
    showDeprecModal, setShowDeprecModal, showAddContractModal, setShowAddContractModal,
    showEditContractModal, setShowEditContractModal, showAddBillingModal, setShowAddBillingModal,
    activeDocViewer, setActiveDocViewer,
    // Edit Contract States
    editCtContractNo, editCtEntityType, setEditCtEntityType, editCtPartnerId, setEditCtPartnerId,
    editCtCustomer, setEditCtCustomer, editCtStart, setEditCtStart, editCtEnd, setEditCtEnd,
    editCtMonthlyRate, setEditCtMonthlyRate, editCtDailyRate, setEditCtDailyRate,
    editCtRateBasis, setEditCtRateBasis, editCtDeposit, setEditCtDeposit,
    editCtVatAmount, setEditCtVatAmount, editCtBillingDay, setEditCtBillingDay,
    editCtStatus, setEditCtStatus, editCtMemo, setEditCtMemo, editCtTaxSpec, setEditCtTaxSpec,
    editCtAddItems, setEditCtAddItems, editCtAttachedOptions, setEditCtAttachedOptions,
    ctAttachedOptions, setCtAttachedOptions, optionCatalog,
    // Model States
    modelCode, setModelCode, modelName, setModelName, modelMonthlyRate, setModelMonthlyRate,
    modelDailyRate, setModelDailyRate, modelDailyManual, setModelDailyManual, modelSpec, setModelSpec,
    // Asset States
    assetNo, setAssetNo, assetQty, setAssetQty, assetModelId, setAssetModelId,
    serialNo, setSerialNo, acqDate, setAcqDate, acqCost, setAcqCost,
    salvageValue, setSalvageValue, usefulLife, setUsefulLife,
    // Add Contract States
    ctEntityType, setCtEntityType, ctBaseContractId, setCtBaseContractId,
    ctPartnerId, setCtPartnerId, ctCustomer, setCtCustomer, ctRentalItems, setCtRentalItems,
    ctStart, setCtStart, ctEnd, setCtEnd, ctRateBasis, setCtRateBasis,
    ctMonthlyRate, setCtMonthlyRate, ctDailyRate, setCtDailyRate, ctVatAmount, setCtVatAmount,
    ctBillingDay, setCtBillingDay, ctDeposit, setCtDeposit, ctTaxSpec, setCtTaxSpec,
    setCtFileUrl, ctFileName, setCtFileName, isCtFileDragging, setIsCtFileDragging, ctFileInputRef,
    // Billing States
    blContractId, setBlContractId, blYm, setBlYm, blStart, setBlStart, blEnd, setBlEnd,
    blDays, setBlDays, blRateBasis, setBlRateBasis, blDailyRate, setBlDailyRate,
    blUseProRata, setBlUseProRata, blSupplyAmount, setBlSupplyAmount,
    blVatAmount, setBlVatAmount, blTaxSpec, setBlTaxSpec,
    // Memoized Options
    inStockProducts, partnerComboboxOptions, modelComboboxOptions,
    inStockProductComboboxOptions, contractComboboxOptions,
    // Handlers
    fetchData, recalcDraftItemsTotals, handleContractFileUpload, handleOpenContractFile,
    handleAddModel, computeNextRentalAssetNo, handleAcquireAsset, handleExecuteDepreciation,
    handleAddContract, handleReturnContract, handleOpenEditContract, handleUpdateContract,
    handleDeleteContract, handleDeleteBilling, recalcBillingAmounts,
    applyRentalContractTemplateToBilling, handleOpenBillingFromContract,
    handleAddBilling, handleIssueTaxFromRental, openAcquireAssetModal, openAddModelModal,
  };
}
