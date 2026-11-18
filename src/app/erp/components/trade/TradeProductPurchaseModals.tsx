"use client";

import React from "react";
import { Package, ShoppingCart, X } from "lucide-react";
import { FORKLIFT_ITEM_CLASS_OPTIONS, formatErpCurrency, formatErpInputNumber, type ForkliftItemClass, type ForkliftSpecData } from "@/lib/erpFormat";
import ForkliftSpecEditor from "../ForkliftSpecEditor";
import { SearchSelectCombobox, type SearchSelectOption } from "../SearchSelectCombobox";

export interface ProductModalProps {
  editProdId: number | null;
  handleAddProduct: (e: React.FormEvent) => Promise<void>;
  prodAddonDaily: string;
  prodAddonMonthly: string;
  prodCategory: string;
  prodInboundDate: string;
  prodInitialStock: string;
  prodInstallFee: string;
  prodItemClass: ForkliftItemClass;
  prodManufacturer: string;
  prodName: string;
  prodPartNo: string;
  prodSafetyStock: string;
  prodSpec: string;
  prodSpecData: ForkliftSpecData;
  prodStandardCost: string;
  prodStandardPrice: string;
  prodUnit: string;
  prodWarrantyHours: string;
  prodWarrantyMonths: string;
  setEditProdId: React.Dispatch<React.SetStateAction<number | null>>;
  setProdAddonDaily: React.Dispatch<React.SetStateAction<string>>;
  setProdAddonMonthly: React.Dispatch<React.SetStateAction<string>>;
  setProdCategory: React.Dispatch<React.SetStateAction<string>>;
  setProdInboundDate: React.Dispatch<React.SetStateAction<string>>;
  setProdInitialStock: React.Dispatch<React.SetStateAction<string>>;
  setProdInstallFee: React.Dispatch<React.SetStateAction<string>>;
  setProdItemClass: React.Dispatch<React.SetStateAction<ForkliftItemClass>>;
  setProdManufacturer: React.Dispatch<React.SetStateAction<string>>;
  setProdName: React.Dispatch<React.SetStateAction<string>>;
  setProdPartNo: React.Dispatch<React.SetStateAction<string>>;
  setProdSafetyStock: React.Dispatch<React.SetStateAction<string>>;
  setProdSpec: React.Dispatch<React.SetStateAction<string>>;
  setProdSpecData: React.Dispatch<React.SetStateAction<ForkliftSpecData>>;
  setProdStandardCost: React.Dispatch<React.SetStateAction<string>>;
  setProdStandardPrice: React.Dispatch<React.SetStateAction<string>>;
  setProdUnit: React.Dispatch<React.SetStateAction<string>>;
  setProdWarrantyHours: React.Dispatch<React.SetStateAction<string>>;
  setProdWarrantyMonths: React.Dispatch<React.SetStateAction<string>>;
  setShowAddProductModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowEditProductModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSkuCode: React.Dispatch<React.SetStateAction<string>>;
  showAddProductModal: boolean;
  showEditProductModal: boolean;
  skuCode: string;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  editProdId,
  handleAddProduct,
  prodAddonDaily,
  prodAddonMonthly,
  prodCategory,
  prodInboundDate,
  prodInitialStock,
  prodInstallFee,
  prodItemClass,
  prodManufacturer,
  prodName,
  prodPartNo,
  prodSafetyStock,
  prodSpec,
  prodSpecData,
  prodStandardCost,
  prodStandardPrice,
  prodUnit,
  prodWarrantyHours,
  prodWarrantyMonths,
  setEditProdId,
  setProdAddonDaily,
  setProdAddonMonthly,
  setProdCategory,
  setProdInboundDate,
  setProdInitialStock,
  setProdInstallFee,
  setProdItemClass,
  setProdManufacturer,
  setProdName,
  setProdPartNo,
  setProdSafetyStock,
  setProdSpec,
  setProdSpecData,
  setProdStandardCost,
  setProdStandardPrice,
  setProdUnit,
  setProdWarrantyHours,
  setProdWarrantyMonths,
  setShowAddProductModal,
  setShowEditProductModal,
  setSkuCode,
  showAddProductModal,
  showEditProductModal,
  skuCode,
}) => {
  return (
    <>
      {(showAddProductModal || showEditProductModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] w-full text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white max-w-2xl max-h-[92vh] overflow-y-auto rounded shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] dark:border-slate-800">
              <h3 className="font-bold text-sm text-[#0f172a] dark:text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{editProdId ? "판매 상품 및 스펙 수정" : "판매용 신규 상품·부품 등록"}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddProductModal(false);
                  setShowEditProductModal(false);
                  setEditProdId(null);
                }}
                className="text-[#57534e] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300">품목구분</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {FORKLIFT_ITEM_CLASS_OPTIONS.map((opt) => {
                    const active = prodItemClass === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setProdItemClass(opt.value);
                          if (
                            !prodCategory ||
                            FORKLIFT_ITEM_CLASS_OPTIONS.some((o) => o.label === prodCategory)
                          ) {
                            setProdCategory(opt.label);
                          }
                        }}
                        className={`h-8 px-2 rounded border font-semibold text-xs transition ${
                          active
                            ? "bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-xs"
                            : "bg-[#ebe5d8] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">상품명 (필수)</label>
                  <input
                    type="text"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="예: 두산 D30S-9 3톤 디젤지게차 / 사이드쉬프트"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">SKU 코드 (선택)</label>
                  <input
                    type="text"
                    value={skuCode}
                    onChange={(e) => setSkuCode(e.target.value)}
                    placeholder="자동생성 가능"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">제조사</label>
                  <input
                    type="text"
                    value={prodManufacturer}
                    onChange={(e) => setProdManufacturer(e.target.value)}
                    placeholder="두산 / 현대 / 클라크"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">세부분류</label>
                  <input
                    type="text"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="예: 3톤급 디젤 / 필터류"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">단위</label>
                  <input
                    type="text"
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    placeholder="대 / EA / SET"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <ForkliftSpecEditor
                itemClass={prodItemClass}
                specData={prodSpecData}
                onChangeSpecData={setProdSpecData}
                partNo={prodPartNo}
                onChangePartNo={setProdPartNo}
                fallbackSpec={prodSpec}
                onChangeFallbackSpec={setProdSpec}
                compact
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">기준매입단가 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={prodStandardCost}
                    onChange={(e) => setProdStandardCost(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">기준판매단가 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={prodStandardPrice}
                    onChange={(e) => setProdStandardPrice(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">안전재고</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={prodSafetyStock}
                    onChange={(e) => setProdSafetyStock(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="10"
                  />
                </div>
                {!editProdId && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">기초재고</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={prodInitialStock}
                      onChange={(e) => setProdInitialStock(formatErpInputNumber(e.target.value))}
                      className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">
                    기초재고 입고일
                  </label>
                  <input
                    type="date"
                    value={prodInboundDate}
                    onChange={(e) => setProdInboundDate(e.target.value)}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              {prodItemClass === "OPTION" && (
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70 dark:bg-slate-800/50 dark:border-slate-700">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">옵션 설치공임 (원)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={prodInstallFee}
                      onChange={(e) => setProdInstallFee(formatErpInputNumber(e.target.value))}
                      className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">렌탈 월 추가단가 (원)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={prodAddonMonthly}
                      onChange={(e) => setProdAddonMonthly(formatErpInputNumber(e.target.value))}
                      className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">렌탈 일 추가단가 (원)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={prodAddonDaily}
                      onChange={(e) => setProdAddonDaily(formatErpInputNumber(e.target.value))}
                      className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}

              {prodItemClass === "FORKLIFT" && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70 dark:bg-slate-800/50 dark:border-slate-700">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">기본 보증개월 (개월)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={prodWarrantyMonths}
                      onChange={(e) => setProdWarrantyMonths(formatErpInputNumber(e.target.value))}
                      className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                      placeholder="12"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">기본 보증가동시간 (hr)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={prodWarrantyHours}
                      onChange={(e) => setProdWarrantyHours(formatErpInputNumber(e.target.value))}
                      className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                      placeholder="2,000"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-[#b5a894] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProductModal(false);
                    setShowEditProductModal(false);
                    setEditProdId(null);
                  }}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded"
                >
                  {editProdId ? "상품 정보 저장" : "상품 등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export interface PurchaseModalProps {
  handleAddPurchase: (e: React.FormEvent) => Promise<void>;
  poDate: string;
  poInputMode: "UNIT" | "TOTAL";
  poProductId: string;
  poQty: string;
  poSplitPreview: { qty: number; supplyTotal: number; vatTotal: number; grandTotal: number; hasRemainder: boolean; rows: Array<{ qty: number; unitCost: number; rowTotal: number; memo: string; }>; };
  poTotalInput: string;
  poUnitCost: string;
  poVatIncluded: boolean;
  poVendor: string;
  products: any[];
  setPoDate: React.Dispatch<React.SetStateAction<string>>;
  setPoInputMode: React.Dispatch<React.SetStateAction<"UNIT" | "TOTAL">>;
  setPoProductId: React.Dispatch<React.SetStateAction<string>>;
  setPoQty: React.Dispatch<React.SetStateAction<string>>;
  setPoTotalInput: React.Dispatch<React.SetStateAction<string>>;
  setPoUnitCost: React.Dispatch<React.SetStateAction<string>>;
  setPoVatIncluded: React.Dispatch<React.SetStateAction<boolean>>;
  setPoVendor: React.Dispatch<React.SetStateAction<string>>;
  setShowAddPurchaseModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAddPurchaseModal: boolean;
  tradeProductOptions: SearchSelectOption[];
  vendorPartnerOptions: SearchSelectOption[];
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  handleAddPurchase,
  poDate,
  poInputMode,
  poProductId,
  poQty,
  poSplitPreview,
  poTotalInput,
  poUnitCost,
  poVatIncluded,
  poVendor,
  products,
  setPoDate,
  setPoInputMode,
  setPoProductId,
  setPoQty,
  setPoTotalInput,
  setPoUnitCost,
  setPoVatIncluded,
  setPoVendor,
  setShowAddPurchaseModal,
  showAddPurchaseModal,
  tradeProductOptions,
  vendorPartnerOptions,
}) => {
  return (
    <>
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
              <SearchSelectCombobox
                label="매입처 (공급자명)"
                required
                allowFreeText
                showChosungBar
                size="sm"
                value={poVendor}
                freeTextValue={poVendor}
                onFreeTextChange={setPoVendor}
                onChange={(val) => setPoVendor(val)}
                options={vendorPartnerOptions}
                placeholder="매입처명, 사업자번호 초성 검색 또는 직접 입력"
              />

              <SearchSelectCombobox
                label="입고 상품"
                required
                clearable={false}
                size="sm"
                value={poProductId}
                options={tradeProductOptions}
                placeholder="입고 상품 초성·명칭 검색 선택"
                onChange={(id) => {
                  setPoProductId(id);
                  const prod = products.find((p) => p.id.toString() === id);
                  if (prod) {
                    const stdCost = Number(prod.standard_cost || 0);
                    setPoUnitCost(formatErpInputNumber(String(stdCost)));
                  }
                }}
              />

              {/* 입력 방식 전환 탭: 수량 × 단가 입력 vs 수량 + 총액 입력 */}
              <div className="flex flex-col gap-1.5 p-2 rounded bg-[#ebe5d8]/70 dark:bg-slate-950 border border-[#b5a894] dark:border-slate-800">
                <label className="text-slate-400 font-semibold text-[11px]">금액 입력 방식 선택</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPoInputMode("UNIT")}
                    className={`py-1.5 px-2 rounded border text-xs font-bold transition ${
                      poInputMode === "UNIT"
                        ? "bg-blue-600 text-white border-blue-500 shadow"
                        : "bg-[#f4efe4] text-[#334155] border-[#b5a894] dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                    }`}
                  >
                    수량 × 단가 입력
                  </button>
                  <button
                    type="button"
                    onClick={() => setPoInputMode("TOTAL")}
                    className={`py-1.5 px-2 rounded border text-xs font-bold transition ${
                      poInputMode === "TOTAL"
                        ? "bg-blue-600 text-white border-blue-500 shadow"
                        : "bg-[#f4efe4] text-[#334155] border-[#b5a894] dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                    }`}
                  >
                    수량 + 총액 입력
                  </button>
                </div>

                {poInputMode === "TOTAL" && (
                  <div className="flex items-center justify-between pt-1 mt-1 border-t border-[#c4b6a0] dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 font-semibold">입력 총액 부가세(VAT) 구분</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPoVatIncluded(true)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                          poVatIncluded
                            ? "bg-emerald-600 text-white border-emerald-500"
                            : "bg-[#f4efe4] text-[#334155] border-[#b5a894] dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700"
                        }`}
                      >
                        부가세 포함 (결제총액)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPoVatIncluded(false)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                          !poVatIncluded
                            ? "bg-amber-600 text-white border-amber-500"
                            : "bg-[#f4efe4] text-[#334155] border-[#b5a894] dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700"
                        }`}
                      >
                        부가세 별도 (공급가액)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {poInputMode === "UNIT" ? (
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
                    <label className="text-slate-400">매입 단가 (공급가, 원)</label>
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
              ) : (
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
                    <label className="text-slate-400">
                      {poVatIncluded ? "매입 총액 (부가세 포함, 원)" : "매입 총액 (부가세 별도, 원)"}
                    </label>
                    <input
                      type="text"
                      value={poTotalInput}
                      onChange={(e) => setPoTotalInput(formatErpInputNumber(e.target.value))}
                      className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      placeholder="예: 100,000"
                      required
                    />
                  </div>
                </div>
              )}

              {/* 산출 요약 및 소수점 발생 시 수량분할 정수단가 미리보기 */}
              {poSplitPreview.qty > 0 && poSplitPreview.supplyTotal > 0 && (
                <div className="p-2.5 rounded bg-[#ebe5d8] dark:bg-slate-950 border border-[#b5a894] dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold">산출 공급가액 합계</span>
                    <span className="font-mono font-bold text-[#0f172a] dark:text-white">
                      {formatErpCurrency(poSplitPreview.supplyTotal)}
                      <span className="text-slate-400 font-normal ml-1">
                        (VAT {formatErpCurrency(poSplitPreview.vatTotal)} / 합계 {formatErpCurrency(poSplitPreview.grandTotal)})
                      </span>
                    </span>
                  </div>

                  {poSplitPreview.hasRemainder ? (
                    <div className="pt-1.5 border-t border-dashed border-[#b5a894] dark:border-slate-800 space-y-1">
                      <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        단가 소수점 방지를 위해 아래와 같이 정수 단가로 수량 분할 입고됩니다:
                      </div>
                      {poSplitPreview.rows.map((r, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] font-mono bg-[#f4efe4] dark:bg-slate-900 px-2 py-1 rounded border border-[#c4b6a0] dark:border-slate-800"
                        >
                          <span>
                            #{idx + 1}) 수량 <strong>{r.qty}</strong>개 × 정수단가{" "}
                            <strong className="text-blue-600 dark:text-blue-400">
                              {formatErpCurrency(r.unitCost)}
                            </strong>
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            = {formatErpCurrency(r.rowTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-dashed border-[#b5a894] dark:border-slate-800 font-mono">
                      <span className="text-slate-400">적용 정수 매입단가</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {poSplitPreview.qty}개 × {formatErpCurrency(poSplitPreview.rows[0]?.unitCost || 0)} ={" "}
                        {formatErpCurrency(poSplitPreview.supplyTotal)}
                      </span>
                    </div>
                  )}
                </div>
              )}

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
    </>
  );
};
