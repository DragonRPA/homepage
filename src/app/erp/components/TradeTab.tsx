"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Package, Plus, ShoppingCart, TrendingUp, RefreshCw, 
  Search, Download, DollarSign, Layers, FileText, CheckCircle2, AlertCircle, X,
  ArrowUpDown, ArrowUp, ArrowDown, Building2, FileUp, Edit, Trash2
} from "lucide-react";
import { formatErpNumber, formatErpCurrency, formatErpQty, formatErpInputNumber, toErpInputString, cleanErpNumber, sortErpItems, SortDirection, resolveContractItemTemplate, resolveContractTaxItemsTemplate } from "@/lib/erpFormat";
import { ContractTaxInvoiceSection, BuyerTaxSpec, createDefaultTaxSpec, extractPartnerTaxSpec } from "./ContractTaxInvoiceSection";

interface TradeTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onNavigateToTax?: () => void;
}

export const TradeTab: React.FC<TradeTabProps> = ({ currentUser, selectedEntity = "ALL", onNavigateToTax }) => {
  const [subTab, setSubTab] = useState<"products" | "purchases" | "sales" | "billings" | "settlement">("sales");
  const [loading, setLoading] = useState(false);

  // Data States
  const [products, setProducts] = useState<any[]>([]);
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

  // Sorting State
  const [sortKey, setSortKey] = useState<string>("id");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => {
    const isActive = sortKey === key;
    return (
      <th
        onClick={() => handleSort(key)}
        className={`py-2.5 px-3 cursor-pointer select-none hover:bg-[#d0c6b4] dark:hover:bg-slate-800 transition text-${align} ${isActive ? "text-[#1d4ed8] dark:text-blue-400 font-bold" : ""}`}
        title={`${label} 기준 정렬`}
      >
        <div className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start"}`}>
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </span>
        </div>
      </th>
    );
  };

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
  const [skuCode, setSkuCode] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState("완제품");
  const [prodSpec, setProdSpec] = useState("");
  const [prodUnit, setProdUnit] = useState("EA");
  const [prodStandardCost, setProdStandardCost] = useState("0");
  const [prodStandardPrice, setProdStandardPrice] = useState("0");
  const [prodSafetyStock, setProdSafetyStock] = useState("10");
  const [prodInitialStock, setProdInitialStock] = useState("0");

  // Add Purchase Form
  const [poVendor, setPoVendor] = useState("");
  const [poProductId, setPoProductId] = useState("");
  const [poQty, setPoQty] = useState("1");
  const [poUnitCost, setPoUnitCost] = useState("0");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);

  // Add Sale Form
  const [soPartnerId, setSoPartnerId] = useState<number | null>(null);
  const [soCustomer, setSoCustomer] = useState("");
  const [soCustomerSearch, setSoCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [soProductId, setSoProductId] = useState("");
  const [soQty, setSoQty] = useState("1");
  const [soUnitPrice, setSoUnitPrice] = useState("0");
  const [soVatAmount, setSoVatAmount] = useState("0");
  const [soDate, setSoDate] = useState(new Date().toISOString().split("T")[0]);
  const [soMemo, setSoMemo] = useState("");
  const [soTaxSpec, setSoTaxSpec] = useState<BuyerTaxSpec>(() =>
    createDefaultTaxSpec("{1번째 아이템} 외", 0)
  );
  const [soFileUrl, setSoFileUrl] = useState("");
  const [soFileName, setSoFileName] = useState("");
  const soFileInputRef = useRef<HTMLInputElement>(null);

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
        fetch("/api/erp/trade/products"),
        fetch("/api/erp/trade/purchases"),
        fetch(salesUrl),
        fetch(billingsUrl),
        fetch(`/api/erp/trade/settlement?startDate=${startDate}&endDate=${endDate}`),
        fetch("/api/erp/partners?type=ALL")
      ]);

      const pData = await prodRes.json();
      const puData = await purRes.json();
      const sData = await saleRes.json();
      const bData = await billRes.json();
      const seData = await setRes.json();
      const partData = await partRes.json();

      if (pData.success) setProducts(pData.products);
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

  // Sorted Data Lists
  const sortedProducts = useMemo(() => {
    return sortErpItems(products, sortKey, sortDir);
  }, [products, sortKey, sortDir]);

  const sortedPurchases = useMemo(() => {
    return sortErpItems(purchases, sortKey, sortDir);
  }, [purchases, sortKey, sortDir]);

  const sortedSales = useMemo(() => {
    return sortErpItems(sales, sortKey, sortDir);
  }, [sales, sortKey, sortDir]);

  const sortedBillings = useMemo(() => {
    return sortErpItems(billings, sortKey, sortDir);
  }, [billings, sortKey, sortDir]);

  const sortedCustomerBreakdown = useMemo(() => {
    return sortErpItems(customerBreakdown, sortKey, sortDir);
  }, [customerBreakdown, sortKey, sortDir]);

  const customerPartners = useMemo(() => {
    return registeredPartners.filter((p) => p.partnerType === "CUSTOMER" || p.partnerType === "BOTH");
  }, [registeredPartners]);

  const filteredCustomerPartners = useMemo(() => {
    const q = soCustomerSearch.trim().toLowerCase();
    if (!q) return customerPartners;
    return customerPartners.filter((p) => {
      const hay = [p.name, p.businessNo, p.ceoName, p.partnerCode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [customerPartners, soCustomerSearch]);

  const handleSelectSaleCustomer = (p: any) => {
    setSoPartnerId(p.id);
    setSoCustomer(p.name);
    setSoCustomerSearch(p.name);
    setShowCustomerDropdown(false);
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
      const res = await fetch(`/api/erp/trade/sales?id=${s.id}`);
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
    if (!skuCode || !prodName) {
      showToast("SKU 코드와 상품명은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/trade/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skuCode,
          name: prodName,
          category: prodCategory,
          spec: prodSpec,
          unit: prodUnit,
          standardCost: cleanErpNumber(prodStandardCost),
          standardPrice: cleanErpNumber(prodStandardPrice),
          safetyStock: cleanErpNumber(prodSafetyStock),
          initialStock: cleanErpNumber(prodInitialStock),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "상품 등록 실패");

      showToast(`상품 [${prodName}] 등록 완료`);
      setShowAddProductModal(false);
      setSkuCode("");
      setProdName("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Add Purchase
  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poVendor || !poProductId || !poQty) {
      showToast("매입처, 상품, 수량은 필수입니다.", "error");
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
          qty: cleanErpNumber(poQty),
          unitCost: cleanErpNumber(poUnitCost),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "구매 등록 실패");

      showToast(`구매 입고 완료 (재고 자동 반영)`);
      setShowAddPurchaseModal(false);
      setPoVendor("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Add Sale
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soCustomer || !soProductId || !soQty) {
      showToast("고객사, 상품, 수량은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/trade/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: soEntityType,
          partnerId: soPartnerId,
          saleDate: soDate,
          customerName: soCustomer,
          productId: soProductId,
          qty: cleanErpNumber(soQty),
          unitPrice: cleanErpNumber(soUnitPrice),
          vatAmount: cleanErpNumber(soVatAmount),
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

      showToast(`판매 출고 완료 (재고 차감 및 마진 산출)`);
      setShowAddSaleModal(false);
      setSoPartnerId(null);
      setSoCustomer("");
      setSoCustomerSearch("");
      setSoMemo("");
      setSoFileUrl("");
      setSoFileName("");
      setSoTaxSpec(createDefaultTaxSpec("{1번째 아이템} 외", 0));
      fetchData();
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
      fetchData();
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
      fetchData();
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
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Trade Billing
  const handleDeleteBilling = async (b: any) => {
    if (!window.confirm(`유통 청구번호 [${b.billingNo}] (${b.customerName} - ₩${formatErpCurrency(b.totalAmount)})\n해당 청구 내역을 삭제하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/erp/trade/billings?id=${b.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "청구 삭제 실패");

      showToast(data.message || "유통 청구 내역이 삭제되었습니다.");
      fetchData();
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
      if (onNavigateToTax) onNavigateToTax();
      fetchData();
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
            onClick={() => setSubTab("products")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "products" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>상품 마스터 ({products.length})</span>
          </button>
          <button
            onClick={() => setSubTab("purchases")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "purchases" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>구매 / 입고 대장 ({purchases.length})</span>
          </button>
          <button
            onClick={() => setSubTab("sales")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "sales" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>유통/판매 계약 대장 ({sales.length})</span>
          </button>
          <button
            onClick={() => setSubTab("billings")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "billings" ? "bg-[#1d4ed8] text-white shadow" : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>유통 청구 & 세금계산서 ({billings.length})</span>
          </button>
          <button
            onClick={() => setSubTab("settlement")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "settlement" ? "bg-blue-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>기간별 매출정산</span>
          </button>
        </div>

        {/* Action Buttons (Pipeline) */}
        <div className="flex items-center gap-2">
          {subTab === "products" && (
            <button
              onClick={() => setShowAddProductModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>상품 등록</span>
            </button>
          )}
          {subTab === "purchases" && (
            <button
              onClick={() => setShowAddPurchaseModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>구매 입고 등록</span>
            </button>
          )}
          {subTab === "sales" && (
            <>
              <button
                onClick={() => setShowAddBillingModal(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>계약 기반 청구 생성</span>
              </button>
              <button
                onClick={() => setShowAddSaleModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>판매 계약 등록</span>
              </button>
            </>
          )}
          {subTab === "billings" && (
            <button
              onClick={() => setShowAddBillingModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>유통 청구서 생성</span>
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
      <div className="flex-1 bg-[#f4efe4] border border-[#b5a894] rounded overflow-auto shadow-inner dark:bg-slate-900 dark:border-slate-800">
        {subTab === "products" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                {renderSortTh("SKU 코드", "sku_code")}
                {renderSortTh("상품명", "name")}
                {renderSortTh("분류", "category")}
                {renderSortTh("규격", "spec")}
                {renderSortTh("단위", "unit", "center")}
                {renderSortTh("기준매입단가", "standard_cost", "right")}
                {renderSortTh("기준판매단가", "standard_price", "right")}
                {renderSortTh("예상마진", "margin", "right")}
                {renderSortTh("안전재고", "safety_stock", "right")}
                {renderSortTh("현재재고", "current_stock", "right")}
                <th className="py-2.5 px-3 text-center">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    등록된 판매 상품이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedProducts.map((p) => {
                  const cost = Number(p.standard_cost || 0);
                  const price = Number(p.standard_price || 0);
                  const margin = price - cost;
                  const marginRate = price > 0 ? ((margin / price) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={p.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                      <td className="py-2 px-3 font-mono text-blue-400 font-semibold">{p.sku_code}</td>
                      <td className="py-2 px-3 font-bold text-slate-100">{p.name}</td>
                      <td className="py-2 px-3 text-slate-300">{p.category}</td>
                      <td className="py-2 px-3 text-slate-400">{p.spec || "-"}</td>
                      <td className="py-2 px-3 text-center text-slate-400">{p.unit}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-300">{formatErpCurrency(cost)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(price)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-400">
                        {formatErpCurrency(margin)} ({marginRate}%)
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">{formatErpQty(p.safety_stock, p.unit)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        <span className={p.current_stock < p.safety_stock ? "text-rose-400" : "text-emerald-400"}>
                          {formatErpQty(p.current_stock, p.unit)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          p.status === "ACTIVE" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-slate-800 text-slate-400"
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

        {subTab === "purchases" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                {renderSortTh("구매번호", "purchaseNo")}
                {renderSortTh("구매일자", "purchaseDate")}
                {renderSortTh("매입처(공급자)", "vendorName")}
                {renderSortTh("상품명", "productName")}
                {renderSortTh("수량", "qty", "right")}
                {renderSortTh("매입단가", "unitCost", "right")}
                {renderSortTh("총 매입금액", "totalAmount", "right")}
                <th className="py-2.5 px-3 text-center">입고상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    구매 입고 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedPurchases.map((pu) => (
                  <tr key={pu.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-mono text-blue-400">{pu.purchaseNo}</td>
                    <td className="py-2 px-3 font-mono text-slate-300">{pu.purchaseDate}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{pu.vendorName}</td>
                    <td className="py-2 px-3 text-slate-200">[{pu.skuCode}] {pu.productName}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-200">{formatErpQty(pu.qty, pu.unit)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{formatErpCurrency(pu.unitCost)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">{formatErpCurrency(pu.totalAmount)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        입고완료
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {subTab === "sales" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                <th className="py-2.5 px-3 text-center">관리</th>
                {renderSortTh("귀속 사업자", "entityType")}
                {renderSortTh("판매번호", "saleNo")}
                {renderSortTh("판매일자", "saleDate")}
                {renderSortTh("고객사(수요처)", "customerName")}
                {renderSortTh("판매상품", "productName")}
                {renderSortTh("수량", "qty", "right")}
                {renderSortTh("판매단가", "unitPrice", "right")}
                {renderSortTh("공급가액", "totalAmount", "right")}
                {renderSortTh("매출원가", "cogsAmount", "right")}
                {renderSortTh("마진(이익률)", "marginAmount", "right")}
                <th className="py-2.5 px-3 text-center">계약서</th>
                <th className="py-2.5 px-3 text-center">청구 / 계산서</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-500">
                    판매 계약 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedSales.map((s) => (
                  <tr key={s.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenBillingFromSale(s)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] transition"
                          title="이 판매 계약의 항목을 끌어와 청구서 생성"
                        >
                          <Plus className="w-3 h-3" />
                          <span>청구생성</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditSale(s)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 font-bold text-[11px] transition"
                          title="판매 계약 및 세금계산서 제원 수정"
                        >
                          <Edit className="w-3 h-3" />
                          <span>수정</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSale(s)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-300 font-bold text-[11px] transition"
                          title="판매 계약 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>삭제</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      {s.entityType === "INDIVIDUAL" ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          개인
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          법인
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-blue-400">{s.saleNo}</td>
                    <td className="py-2 px-3 font-mono text-slate-300">{s.saleDate ? String(s.saleDate).slice(0, 10) : "-"}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-100">{s.customerName}</span>
                        {s.customerBizNo && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {s.customerBizNo} {s.customerEmail ? `| ${s.customerEmail}` : ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-200">[{s.skuCode}] {s.productName}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-200">{formatErpQty(s.qty, s.unit)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{formatErpCurrency(s.unitPrice)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(s.totalAmount)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{formatErpCurrency(s.cogsAmount)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatErpCurrency(s.marginAmount)} ({s.marginRate}%)
                    </td>
                    <td className="py-2 px-3 text-center">
                      {s.hasContractFile ? (
                        <button
                          onClick={() => handleOpenSaleFile(s)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500/40 text-indigo-300 rounded text-[11px] font-semibold transition"
                        >
                          <FileText className="w-3 h-3" />
                          <span>열람</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">미첨부</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {s.taxInvoiceId ? (
                        <span className="px-2 py-0.5 bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 rounded text-[11px] font-semibold font-mono">
                          발행완료 ({s.taxInvoiceNo || `#${s.taxInvoiceId}`})
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenBillingFromSale(s)}
                          className="px-2 py-0.5 bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-600/50 text-emerald-300 rounded text-[11px] font-semibold transition"
                        >
                          + 청구생성
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {subTab === "billings" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                <th className="py-2.5 px-3 text-center">관리</th>
                {renderSortTh("귀속 사업자", "entityType")}
                {renderSortTh("청구번호", "billingNo")}
                {renderSortTh("청구일자", "billingDate")}
                {renderSortTh("원계약번호", "saleNo")}
                {renderSortTh("고객사(수요처)", "customerName")}
                {renderSortTh("청구명 / 세금계산서 품목", "milestoneName")}
                {renderSortTh("공급가액", "supplyAmount", "right")}
                {renderSortTh("부가세액", "vatAmount", "right")}
                {renderSortTh("합계금액", "totalAmount", "right")}
                <th className="py-2.5 px-3 text-center">세금계산서</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedBillings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    생성된 유통 청구 내역이 없습니다. 판매 계약 대장에서 [+ 청구생성]을 눌러 청구를 생성하세요.
                  </td>
                </tr>
              ) : (
                sortedBillings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleDeleteBilling(b)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-300 font-bold text-[11px] transition"
                        title="청구 내역 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>삭제</span>
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      {b.entityType === "INDIVIDUAL" ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          개인
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          법인
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-blue-400 font-bold">{b.billingNo}</td>
                    <td className="py-2 px-3 font-mono text-slate-300">{b.billingDate}</td>
                    <td className="py-2 px-3 font-mono text-slate-400">{b.saleNo}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-100">{b.customerName}</span>
                        {b.customerBizNo && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {b.customerBizNo} {b.customerEmail ? `| ${b.customerEmail}` : ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-200">
                      <div className="flex flex-col">
                        <span className="font-semibold">{b.milestoneName || b.productName}</span>
                        {Array.isArray(b.taxItems) && b.taxItems.length > 0 && (
                          <span className="text-[10px] text-emerald-400">
                            품목 {b.taxItems.length}건 ({b.taxItems[0]?.itemName}{b.taxItems.length > 1 ? ` 외 ${b.taxItems.length - 1}건` : ""})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(b.supplyAmount)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{formatErpCurrency(b.vatAmount)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">{formatErpCurrency(b.totalAmount)}</td>
                    <td className="py-2 px-3 text-center">
                      {b.taxInvoiceId ? (
                        <span className="px-2 py-0.5 bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 rounded text-[11px] font-semibold font-mono">
                          발행완료 (#{b.taxInvoiceId})
                        </span>
                      ) : (
                        <button
                          onClick={() => handleIssueTaxFromTradeBilling(b)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold transition shadow"
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

        {subTab === "settlement" && (
          <div className="p-4 flex flex-col gap-4">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <span className="text-[11px] text-slate-400">총 판매 건수 / 수량</span>
                <div className="text-base font-bold text-white mt-1">
                  {formatErpNumber(settlementSummary?.totalOrders || 0)}건 / {formatErpQty(settlementSummary?.totalQty || 0, "개")}
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <span className="text-[11px] text-slate-400">총 매출액</span>
                <div className="text-base font-bold text-blue-400 mt-1">
                  {formatErpCurrency(settlementSummary?.totalRevenue || 0)}
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <span className="text-[11px] text-slate-400">총 매출원가 (COGS)</span>
                <div className="text-base font-bold text-slate-400 mt-1">
                  {formatErpCurrency(settlementSummary?.totalCogs || 0)}
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <span className="text-[11px] text-slate-400">총 매출총이익 (마진율)</span>
                <div className="text-base font-bold text-emerald-400 mt-1">
                  {formatErpCurrency(settlementSummary?.totalMargin || 0)} ({settlementSummary?.marginRate || 0}%)
                </div>
              </div>
            </div>

            {/* Customer Breakdown Grid */}
            <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 text-xs font-bold text-slate-200">
                거래처별 매출 및 마진 집계
              </div>
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    {renderSortTh("거래처명", "customerName")}
                    {renderSortTh("주문건수", "orderCount", "right")}
                    {renderSortTh("매출액", "revenue", "right")}
                    {renderSortTh("매출원가", "cogs", "right")}
                    {renderSortTh("매출총이익", "margin", "right")}
                    {renderSortTh("마진율", "marginRate", "right")}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
                  {sortedCustomerBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        해당 기간 정산 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    sortedCustomerBreakdown.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-bold text-slate-100">{c.customerName}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatErpNumber(c.orderCount)}건</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-400">
                          {formatErpCurrency(c.revenue)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">
                          {formatErpCurrency(c.cogs)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                          {formatErpCurrency(c.margin)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-300">
                          {c.marginRate}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] w-full text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span>판매용 신규 상품 등록</span>
              </h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">SKU 코드 (필수)</label>
                  <input
                    type="text"
                    value={skuCode}
                    onChange={(e) => setSkuCode(e.target.value)}
                    placeholder="예: SKU001"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">분류</label>
                  <input
                    type="text"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="예: 완제품 / 라이선스"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">상품명 (필수)</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="예: 매뉴얼 스튜디오 기업용 라이선스"
                  className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">규격 / 버전</label>
                  <input
                    type="text"
                    value={prodSpec}
                    onChange={(e) => setProdSpec(e.target.value)}
                    placeholder="예: v2.1.0 Nuitka-C"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">단위</label>
                  <input
                    type="text"
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    placeholder="EA / SET / COPY"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">기준매입단가 (원)</label>
                  <input
                    type="text"
                    value={prodStandardCost}
                    onChange={(e) => setProdStandardCost(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="예: 0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">기준판매단가 (원)</label>
                  <input
                    type="text"
                    value={prodStandardPrice}
                    onChange={(e) => setProdStandardPrice(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="예: 0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">안전재고 기준</label>
                  <input
                    type="number"
                    value={prodSafetyStock}
                    onChange={(e) => setProdSafetyStock(e.target.value)}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">초기 보유재고</label>
                  <input
                    type="number"
                    value={prodInitialStock}
                    onChange={(e) => setProdInitialStock(e.target.value)}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded"
                >
                  상품 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Purchase */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] w-full text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-400" />
                <span>구매 입고 등록 (발주)</span>
              </h3>
              <button onClick={() => setShowAddPurchaseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPurchase} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400">매입처 (공급자명) *</label>
                <input
                  type="text"
                  list="vendor-datalist"
                  value={poVendor}
                  onChange={(e) => setPoVendor(e.target.value)}
                  placeholder="예: (주)케이티정보통신 (등록 거래처 선택 가능)"
                  className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                />
                <datalist id="vendor-datalist">
                  {registeredPartners
                    .filter((p) => p.partnerType === "VENDOR" || p.partnerType === "BOTH")
                    .map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.partnerCode} | {p.bizType || ""} | 담당: {p.managerName || "미지정"}
                      </option>
                    ))}
                </datalist>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">입고 상품</label>
                <select
                  value={poProductId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPoProductId(id);
                    const prod = products.find(p => p.id.toString() === id);
                    if (prod) setPoUnitCost(prod.standard_cost?.toString() || "0");
                  }}
                  className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  required
                >
                  <option value="">선택하십시오</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>[{p.sku_code}] {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">입고 수량</label>
                  <input
                    type="text"
                    value={poQty}
                    onChange={(e) => setPoQty(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="예: 1"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">매입 단가 (원)</label>
                  <input
                    type="text"
                    value={poUnitCost}
                    onChange={(e) => setPoUnitCost(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="예: 0"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">구매일자</label>
                <input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPurchaseModal(false)}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded"
                >
                  입고 확정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Sale */}
      {showAddSaleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] w-full text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white max-w-3xl rounded shadow-2xl p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>판매 출고 계약 등록 (수주 및 세금계산서 제원)</span>
              </h3>
              <button onClick={() => setShowAddSaleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSale} className="mt-4 flex flex-col gap-3 text-xs">
              {/* 귀속 사업자 선택 */}
              <div className="flex flex-col gap-1 p-2 rounded bg-slate-950 border border-slate-800">
                <label className="text-slate-400 font-semibold text-[11px]">매출 귀속 사업자 선택</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSoEntityType("CORP")}
                    className={`p-2 rounded border text-left transition ${
                      soEntityType === "CORP"
                        ? "border-blue-500 bg-blue-500/20 text-blue-300 font-bold"
                        : "border-slate-800 text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    <div>(주)드래곤알피에이 [법인]</div>
                    <div className="font-mono text-[10px] opacity-75">806-88-03266</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoEntityType("INDIVIDUAL")}
                    className={`p-2 rounded border text-left transition ${
                      soEntityType === "INDIVIDUAL"
                        ? "border-amber-500 bg-amber-500/20 text-amber-300 font-bold"
                        : "border-slate-800 text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    <div>드래곤알피에이 [개인]</div>
                    <div className="font-mono text-[10px] opacity-75">295-03-02683</div>
                  </button>
                </div>
              </div>

              {/* 고객사 조회 선택 */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-slate-400 font-bold">등록 고객사 조회 선택 *</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={soCustomerSearch}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onChange={(e) => {
                      setSoCustomerSearch(e.target.value);
                      setSoCustomer(e.target.value);
                      setSoPartnerId(null);
                      setShowCustomerDropdown(true);
                    }}
                    placeholder="고객사명, 사업자번호, 대표자 검색하여 선택"
                    className="w-full h-8 pl-8 pr-8 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-semibold"
                    required
                  />
                  {soCustomerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setSoCustomerSearch("");
                        setSoCustomer("");
                        setSoPartnerId(null);
                        setShowCustomerDropdown(true);
                      }}
                      className="absolute right-2 top-2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {showCustomerDropdown && (
                  <div className="absolute top-[56px] left-0 right-0 z-30 max-h-48 overflow-y-auto rounded border border-[#b5a894] bg-[#f4efe4] dark:bg-slate-900 dark:border-slate-700 shadow-xl divide-y divide-[#d0c6b4] dark:divide-slate-800">
                    {filteredCustomerPartners.length === 0 ? (
                      <div className="p-2.5 text-slate-400 text-[11px] flex items-center justify-between">
                        <span>검색 결과가 없습니다. 입력한 상호명으로 등록됩니다.</span>
                        <button
                          type="button"
                          onClick={() => setShowCustomerDropdown(false)}
                          className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold"
                        >
                          직접입력 확인
                        </button>
                      </div>
                    ) : (
                      filteredCustomerPartners.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => handleSelectSaleCustomer(p)}
                          className="w-full px-3 py-2 text-left hover:bg-[#e2dbcd] dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition"
                        >
                          <div className="flex flex-col">
                            <div className="font-bold text-[#0f172a] dark:text-white flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{p.name}</span>
                              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">({p.partnerCode})</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              사업자: {p.businessNo || "-"} | 대표: {p.ceoName || "-"} | 이메일: {p.taxEmail || p.managerEmail || "-"}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-600 dark:text-blue-300 font-bold text-[10px] shrink-0">
                            선택
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">판매 상품 *</label>
                  <select
                    value={soProductId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSoProductId(id);
                      const prod = products.find((p) => p.id.toString() === id);
                      if (prod) {
                        const unitP = Number(prod.standard_price || 0);
                        const qtyN = cleanErpNumber(soQty) || 1;
                        const sup = unitP * qtyN;
                        const vat = Math.round(sup * 0.1);
                        setSoUnitPrice(formatErpInputNumber(String(unitP)));
                        setSoVatAmount(formatErpInputNumber(String(vat)));
                        setSoTaxSpec((prev) => ({
                          ...prev,
                          taxMemo: prev.taxMemo && prev.taxMemo !== "판매 상품" ? prev.taxMemo : "{1번째 아이템} 외",
                          taxItems: prev.taxItems.map((it, idx) =>
                            idx === 0
                              ? {
                                  ...it,
                                  itemName: prod.name,
                                  spec: prod.spec || "",
                                  qty: qtyN,
                                  unitCost: unitP,
                                  supplyAmount: sup,
                                  vatAmount: vat,
                                }
                              : it
                          ),
                        }));
                      }
                    }}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  >
                    <option value="">선택하십시오</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku_code}] {p.name} (현재고: {formatErpQty(p.current_stock, p.unit)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">판매일자</label>
                  <input
                    type="date"
                    value={soDate}
                    onChange={(e) => setSoDate(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">판매 수량 *</label>
                  <input
                    type="text"
                    value={soQty}
                    onChange={(e) => {
                      const formatted = formatErpInputNumber(e.target.value);
                      setSoQty(formatted);
                      const qtyN = cleanErpNumber(formatted);
                      const unitP = cleanErpNumber(soUnitPrice);
                      const sup = qtyN * unitP;
                      const vat = Math.round(sup * 0.1);
                      setSoVatAmount(formatErpInputNumber(String(vat)));
                      setSoTaxSpec((prev) => ({
                        ...prev,
                        taxItems: prev.taxItems.map((it, idx) =>
                          idx === 0
                            ? { ...it, qty: qtyN, unitCost: unitP, supplyAmount: sup, vatAmount: vat }
                            : it
                        ),
                      }));
                    }}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="예: 1"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">판매 단가 (원) *</label>
                  <input
                    type="text"
                    value={soUnitPrice}
                    onChange={(e) => {
                      const formatted = formatErpInputNumber(e.target.value);
                      setSoUnitPrice(formatted);
                      const unitP = cleanErpNumber(formatted);
                      const qtyN = cleanErpNumber(soQty);
                      const sup = qtyN * unitP;
                      const vat = Math.round(sup * 0.1);
                      setSoVatAmount(formatErpInputNumber(String(vat)));
                      setSoTaxSpec((prev) => ({
                        ...prev,
                        taxItems: prev.taxItems.map((it, idx) =>
                          idx === 0
                            ? { ...it, qty: qtyN, unitCost: unitP, supplyAmount: sup, vatAmount: vat }
                            : it
                        ),
                      }));
                    }}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="예: 50,000"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">세액 (부가세)</label>
                  <input
                    type="text"
                    value={soVatAmount}
                    onChange={(e) => setSoVatAmount(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              {/* 세금계산서 발행 필수 제원 및 다중 품목 명세 */}
              <ContractTaxInvoiceSection
                spec={soTaxSpec}
                onChange={(next) => {
                  setSoTaxSpec(next);
                  const totalSup = next.taxItems.reduce((s, r) => s + Number(r.supplyAmount || 0), 0);
                  const totalVat = next.taxItems.reduce((s, r) => s + Number(r.vatAmount || 0), 0);
                  if (totalVat > 0) setSoVatAmount(formatErpInputNumber(String(totalVat)));
                  if (next.taxItems.length === 1 && totalSup > 0) {
                    const first = next.taxItems[0];
                    if (first.qty > 0) setSoQty(formatErpInputNumber(String(first.qty)));
                    if (first.unitCost > 0) setSoUnitPrice(formatErpInputNumber(String(first.unitCost)));
                  }
                }}
                domainLabel="판매 계약"
              />

              {/* 판매 계약서 / 발주서 파일 첨부 */}
              <div className="flex flex-col gap-1 p-2.5 rounded border border-dashed border-[#b5a894] bg-[#ebe5d8]/60 dark:bg-slate-950/60 dark:border-slate-700">
                <label className="text-slate-400 font-bold text-[11px]">판매 계약서 / 발주서 스캔본 첨부 (선택)</label>
                <input
                  type="file"
                  ref={soFileInputRef}
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSaleFileUpload(f, false);
                  }}
                  className="hidden"
                />
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="text-[11px] text-slate-300 truncate">
                    {soFileName ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{soFileName}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">첨부된 계약서/발주서 파일 없음 (PDF, 이미지 지원)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {soFileName && (
                      <button
                        type="button"
                        onClick={() => {
                          setSoFileUrl("");
                          setSoFileName("");
                        }}
                        className="px-2 py-1 rounded bg-rose-900/40 text-rose-300 text-[11px] hover:bg-rose-900/60"
                      >
                        제거
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => soFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 font-semibold text-[11px]"
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      <span>파일 선택</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSaleModal(false)}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded"
                >
                  판매 계약 및 출고 확정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Sale */}
      {showEditSaleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] w-full text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white max-w-3xl rounded shadow-2xl p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-400" />
                <span>판매 계약 정보 수정 [{editSoSaleNo}]</span>
              </h3>
              <button onClick={() => setShowEditSaleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSale} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1 p-2 rounded bg-slate-950 border border-slate-800">
                <label className="text-slate-400 font-semibold text-[11px]">매출 귀속 사업자</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditSoEntityType("CORP")}
                    className={`p-2 rounded border text-left transition ${
                      editSoEntityType === "CORP"
                        ? "border-blue-500 bg-blue-500/20 text-blue-300 font-bold"
                        : "border-slate-800 text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    <div>(주)드래곤알피에이 [법인]</div>
                    <div className="font-mono text-[10px] opacity-75">806-88-03266</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditSoEntityType("INDIVIDUAL")}
                    className={`p-2 rounded border text-left transition ${
                      editSoEntityType === "INDIVIDUAL"
                        ? "border-amber-500 bg-amber-500/20 text-amber-300 font-bold"
                        : "border-slate-800 text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    <div>드래곤알피에이 [개인]</div>
                    <div className="font-mono text-[10px] opacity-75">295-03-02683</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">고객사 (수요처명) *</label>
                  <input
                    type="text"
                    value={editSoCustomer}
                    onChange={(e) => setEditSoCustomer(e.target.value)}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-semibold"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">판매일자</label>
                  <input
                    type="date"
                    value={editSoDate}
                    onChange={(e) => setEditSoDate(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">판매 수량 *</label>
                  <input
                    type="text"
                    value={editSoQty}
                    onChange={(e) => {
                      const formatted = formatErpInputNumber(e.target.value);
                      setEditSoQty(formatted);
                      const qtyN = cleanErpNumber(formatted);
                      const unitP = cleanErpNumber(editSoUnitPrice);
                      const sup = qtyN * unitP;
                      const vat = Math.round(sup * 0.1);
                      setEditSoVatAmount(formatErpInputNumber(String(vat)));
                      setEditSoTaxSpec((prev) => ({
                        ...prev,
                        taxItems: prev.taxItems.map((it, idx) =>
                          idx === 0
                            ? { ...it, qty: qtyN, unitCost: unitP, supplyAmount: sup, vatAmount: vat }
                            : it
                        ),
                      }));
                    }}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">판매 단가 (원) *</label>
                  <input
                    type="text"
                    value={editSoUnitPrice}
                    onChange={(e) => {
                      const formatted = formatErpInputNumber(e.target.value);
                      setEditSoUnitPrice(formatted);
                      const unitP = cleanErpNumber(formatted);
                      const qtyN = cleanErpNumber(editSoQty);
                      const sup = qtyN * unitP;
                      const vat = Math.round(sup * 0.1);
                      setEditSoVatAmount(formatErpInputNumber(String(vat)));
                      setEditSoTaxSpec((prev) => ({
                        ...prev,
                        taxItems: prev.taxItems.map((it, idx) =>
                          idx === 0
                            ? { ...it, qty: qtyN, unitCost: unitP, supplyAmount: sup, vatAmount: vat }
                            : it
                        ),
                      }));
                    }}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold">세액 (부가세)</label>
                  <input
                    type="text"
                    value={editSoVatAmount}
                    onChange={(e) => setEditSoVatAmount(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <ContractTaxInvoiceSection
                spec={editSoTaxSpec}
                onChange={(next) => {
                  setEditSoTaxSpec(next);
                  const totalSup = next.taxItems.reduce((s, r) => s + Number(r.supplyAmount || 0), 0);
                  const totalVat = next.taxItems.reduce((s, r) => s + Number(r.vatAmount || 0), 0);
                  if (totalVat > 0) setEditSoVatAmount(formatErpInputNumber(String(totalVat)));
                  if (next.taxItems.length === 1 && totalSup > 0) {
                    const first = next.taxItems[0];
                    if (first.qty > 0) setEditSoQty(formatErpInputNumber(String(first.qty)));
                    if (first.unitCost > 0) setEditSoUnitPrice(formatErpInputNumber(String(first.unitCost)));
                  }
                }}
                domainLabel="판매 계약"
              />

              {/* 계약서/발주서 첨부 교체 */}
              <div className="flex flex-col gap-1 p-2.5 rounded border border-dashed border-[#b5a894] bg-[#ebe5d8]/60 dark:bg-slate-950/60 dark:border-slate-700">
                <label className="text-slate-400 font-bold text-[11px]">판매 계약서 / 발주서 파일</label>
                <input
                  type="file"
                  ref={editSoFileInputRef}
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSaleFileUpload(f, true);
                  }}
                  className="hidden"
                />
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="text-[11px] text-slate-300 truncate">
                    {editSoFileName ? (
                      <span className="text-emerald-400 font-semibold">{editSoFileName}</span>
                    ) : (
                      <span className="text-slate-500">첨부된 파일 없음</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => editSoFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 font-semibold text-[11px]"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>파일 변경/첨부</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditSaleModal(false)}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded"
                >
                  수정 내용 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Trade Billing Modal (Pull from Sale Contract) */}
      {showAddBillingModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-700 rounded shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#f4efe4] dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">유통 판매 계약 항목 기반 청구 생성</h3>
              </div>
              <button onClick={() => setShowAddBillingModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddBilling} className="p-4 flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded border border-slate-800">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[11px] text-slate-400 font-semibold">대상 유통/판매 계약 선택 * (선택 시 계약의 품목/세금계산서 제원 자동 연동)</label>
                  <select
                    value={blSaleId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBlSaleId(val);
                      const target = sales.find((s) => String(s.id) === val);
                      if (target) {
                        applyTradeSaleTemplateToBilling(target, blDate);
                      }
                    }}
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                    required
                  >
                    <option value="">-- 유통/판매 계약 선택 --</option>
                    {sales.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.saleNo}] {s.customerName} - {s.productName} ({s.qty}{s.unit || "EA"} / ₩{formatErpCurrency(s.totalAmount)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 font-semibold">청구일자 (세금계산서 작성일자) *</label>
                  <input
                    type="date"
                    value={blDate}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      setBlDate(nextDate);
                      const target = sales.find((s) => String(s.id) === blSaleId);
                      if (target && nextDate) {
                        applyTradeSaleTemplateToBilling(target, nextDate);
                      }
                    }}
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 font-semibold">청구명 (비고/기성 구분)</label>
                  <input
                    type="text"
                    value={blMilestoneName}
                    onChange={(e) => setBlMilestoneName(e.target.value)}
                    placeholder="예: 물품대금 청구"
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 font-semibold">청구 공급가액 (원) *</label>
                  <input
                    type="text"
                    value={blSupplyAmount}
                    onChange={(e) => {
                      const formatted = formatErpInputNumber(e.target.value);
                      setBlSupplyAmount(formatted);
                      const num = cleanErpNumber(formatted);
                      setBlVatAmount(toErpInputString(Math.round(num * 0.1)));
                    }}
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white font-mono text-right"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400 font-semibold">부가세액 (원)</label>
                  <input
                    type="text"
                    value={blVatAmount}
                    onChange={(e) => setBlVatAmount(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white font-mono text-right"
                  />
                </div>
              </div>

              {blSaleId && (
                <ContractTaxInvoiceSection
                  spec={blTaxSpec}
                  onChange={(next) => {
                    setBlTaxSpec(next);
                    const sumSupply = (next.taxItems || []).reduce((acc, it) => acc + (Number(it.supplyAmount) || 0), 0);
                    const sumVat = (next.taxItems || []).reduce((acc, it) => acc + (Number(it.vatAmount) || 0), 0);
                    if (sumSupply > 0) {
                      setBlSupplyAmount(toErpInputString(sumSupply));
                      setBlVatAmount(toErpInputString(sumVat));
                    }
                    if (next.taxMemo) {
                      setBlMilestoneName(next.taxMemo);
                    }
                  }}
                  domainLabel="유통 청구 세금계산서 품목 명세 (계약 항목 자동 연동 및 편집)"
                />
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddBillingModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded"
                >
                  청구 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
