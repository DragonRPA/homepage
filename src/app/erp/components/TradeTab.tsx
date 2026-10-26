"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Package, Plus, ShoppingCart, TrendingUp, RefreshCw, 
  Search, Download, DollarSign, Layers, FileText, CheckCircle2, AlertCircle, X,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { formatErpNumber, formatErpCurrency, formatErpQty, sortErpItems, SortDirection } from "@/lib/erpFormat";

interface TradeTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onNavigateToTax?: () => void;
}

export const TradeTab: React.FC<TradeTabProps> = ({ currentUser, selectedEntity = "ALL", onNavigateToTax }) => {
  const [subTab, setSubTab] = useState<"products" | "purchases" | "sales" | "settlement">("products");
  const [loading, setLoading] = useState(false);

  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [settlementSummary, setSettlementSummary] = useState<any>(null);
  const [customerBreakdown, setCustomerBreakdown] = useState<any[]>([]);

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
        className={`py-2.5 px-3 cursor-pointer select-none hover:bg-slate-800 transition text-${align}`}
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
  const [soCustomer, setSoCustomer] = useState("");
  const [soProductId, setSoProductId] = useState("");
  const [soQty, setSoQty] = useState("1");
  const [soUnitPrice, setSoUnitPrice] = useState("0");
  const [soDate, setSoDate] = useState(new Date().toISOString().split("T")[0]);

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

      const [prodRes, purRes, saleRes, setRes] = await Promise.all([
        fetch("/api/erp/trade/products"),
        fetch("/api/erp/trade/purchases"),
        fetch(salesUrl),
        fetch(`/api/erp/trade/settlement?startDate=${startDate}&endDate=${endDate}`)
      ]);

      const pData = await prodRes.json();
      const puData = await purRes.json();
      const sData = await saleRes.json();
      const seData = await setRes.json();

      if (pData.success) setProducts(pData.products);
      if (puData.success) setPurchases(puData.purchases);
      if (sData.success) setSales(sData.sales);
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

  const sortedCustomerBreakdown = useMemo(() => {
    return sortErpItems(customerBreakdown, sortKey, sortDir);
  }, [customerBreakdown, sortKey, sortDir]);

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
          standardCost: prodStandardCost,
          standardPrice: prodStandardPrice,
          safetyStock: prodSafetyStock,
          initialStock: prodInitialStock,
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
          qty: poQty,
          unitCost: poUnitCost,
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
          saleDate: soDate,
          customerName: soCustomer,
          productId: soProductId,
          qty: soQty,
          unitPrice: soUnitPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "판매 등록 실패");

      showToast(`판매 출고 완료 (재고 차감 및 마진 산출)`);
      setShowAddSaleModal(false);
      setSoCustomer("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Issue Tax Invoice from Sale
  const handleIssueTaxFromSale = async (sale: any) => {
    const corpLabel = sale.entityType === "INDIVIDUAL" ? "드래곤알피에이 [개인]" : "(주)드래곤알피에이 [법인]";
    if (!window.confirm(`[${corpLabel} ➔ ${sale.customerName}]\n${Number(sale.totalAmount).toLocaleString()}원에 대한 전자세금계산서를 즉시 발행하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch("/api/erp/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainType: "TRADE_SALE",
          supplierEntityType: sale.entityType || "CORP",
          refId: sale.id,
          customerName: sale.customerName,
          itemName: `${sale.productName} (${sale.qty}${sale.unit})`,
          supplyAmount: sale.totalAmount,
          issueDate: sale.saleDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "세금계산서 발행 실패");

      showToast(`세금계산서 [${data.invoice.invoice_no || data.invoice.invoiceNo}] 국세청 발행 완료!`);
      if (onNavigateToTax) onNavigateToTax();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-slate-950 text-slate-100 overflow-hidden">
      {toast && (
        <div className={`fixed top-16 right-5 z-50 px-4 py-2 rounded text-xs font-bold text-white shadow-xl ${
          toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab("products")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "products" ? "bg-blue-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>상품 마스터 ({products.length})</span>
          </button>
          <button
            onClick={() => setSubTab("purchases")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "purchases" ? "bg-blue-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>구매 / 입고 대장 ({purchases.length})</span>
          </button>
          <button
            onClick={() => setSubTab("sales")}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              subTab === "sales" ? "bg-blue-600 text-white shadow" : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>판매 / 출고 대장 ({sales.length})</span>
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
            <button
              onClick={() => setShowAddSaleModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>판매 출고 등록</span>
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
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded overflow-auto shadow-inner">
        {subTab === "products" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold select-none z-10">
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
            <tbody className="divide-y divide-slate-800/60">
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
                    <tr key={p.id} className="hover:bg-slate-800/50 transition">
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
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold select-none z-10">
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
            <tbody className="divide-y divide-slate-800/60">
              {sortedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    구매 입고 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedPurchases.map((pu) => (
                  <tr key={pu.id} className="hover:bg-slate-800/50 transition">
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
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold select-none z-10">
              <tr>
                {renderSortTh("귀속 사업자", "entityType")}
                {renderSortTh("판매번호", "saleNo")}
                {renderSortTh("판매일자", "saleDate")}
                {renderSortTh("고객사(수요처)", "customerName")}
                {renderSortTh("판매상품", "productName")}
                {renderSortTh("수량", "qty", "right")}
                {renderSortTh("판매단가", "unitPrice", "right")}
                {renderSortTh("매출액", "totalAmount", "right")}
                {renderSortTh("매출원가", "cogsAmount", "right")}
                {renderSortTh("마진(이익률)", "marginAmount", "right")}
                <th className="py-2.5 px-3 text-center">세금계산서</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    판매 출고 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/50 transition">
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
                    <td className="py-2 px-3 font-mono text-slate-300">{s.saleDate}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{s.customerName}</td>
                    <td className="py-2 px-3 text-slate-200">[{s.skuCode}] {s.productName}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-200">{formatErpQty(s.qty, s.unit)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{formatErpCurrency(s.unitPrice)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(s.totalAmount)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{formatErpCurrency(s.cogsAmount)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatErpCurrency(s.marginAmount)} ({s.marginRate}%)
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleIssueTaxFromSale(s)}
                        className="px-2 py-0.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-700 text-blue-300 rounded text-[11px] font-semibold transition"
                      >
                        계산서발행
                      </button>
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
                <tbody className="divide-y divide-slate-800/60">
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
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded shadow-2xl p-5 text-white">
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
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
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
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
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
                  className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
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
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">단위</label>
                  <input
                    type="text"
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    placeholder="EA / SET / COPY"
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">기준매입단가 (원)</label>
                  <input
                    type="number"
                    value={prodStandardCost}
                    onChange={(e) => setProdStandardCost(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">기준판매단가 (원)</label>
                  <input
                    type="number"
                    value={prodStandardPrice}
                    onChange={(e) => setProdStandardPrice(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
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
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">초기 보유재고</label>
                  <input
                    type="number"
                    value={prodInitialStock}
                    onChange={(e) => setProdInitialStock(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
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
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded shadow-2xl p-5 text-white">
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
                <label className="text-slate-400">매입처 (공급자명)</label>
                <input
                  type="text"
                  value={poVendor}
                  onChange={(e) => setPoVendor(e.target.value)}
                  placeholder="예: (주)테크솔루션"
                  className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  required
                />
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
                  className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
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
                    type="number"
                    min="1"
                    value={poQty}
                    onChange={(e) => setPoQty(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">매입 단가 (원)</label>
                  <input
                    type="number"
                    value={poUnitCost}
                    onChange={(e) => setPoUnitCost(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
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
                  className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPurchaseModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
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
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>판매 출고 등록 (수주)</span>
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

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">고객사 (수요처명)</label>
                <input
                  type="text"
                  value={soCustomer}
                  onChange={(e) => setSoCustomer(e.target.value)}
                  placeholder="예: 현대건설(주)"
                  className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">판매 상품</label>
                <select
                  value={soProductId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSoProductId(id);
                    const prod = products.find(p => p.id.toString() === id);
                    if (prod) setSoUnitPrice(prod.standard_price?.toString() || "0");
                  }}
                  className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                  required
                >
                  <option value="">선택하십시오</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.sku_code}] {p.name} (현재고: {formatErpQty(p.current_stock, p.unit)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">판매 수량</label>
                  <input
                    type="number"
                    min="1"
                    value={soQty}
                    onChange={(e) => setSoQty(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">판매 단가 (원)</label>
                  <input
                    type="number"
                    value={soUnitPrice}
                    onChange={(e) => setSoUnitPrice(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">판매일자</label>
                <input
                  type="date"
                  value={soDate}
                  onChange={(e) => setSoDate(e.target.value)}
                  className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSaleModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded"
                >
                  출고 확정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
