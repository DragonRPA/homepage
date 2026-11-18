"use client";

import React from "react";
import { CheckCircle2, Edit, FileText, FileUp, Layers, Plus, Trash2, Truck, X } from "lucide-react";
import { SearchSelectCombobox, type SearchSelectOption } from "../SearchSelectCombobox";
import { extractPartnerTaxSpec, type BuyerTaxSpec } from "../ContractTaxInvoiceSection";
import { RENTAL_RATE_BASIS_OPTIONS, RentalRateBasis, calculateAttachedOptionsTotals, calculateAutoDailyRentalFee, cleanErpNumber, formatErpCurrency, formatErpInputNumber, formatErpNumber, toErpInputString, type AttachedForkliftOption } from "@/lib/erpFormat";
import ForkliftOptionAttachPanel, { type CatalogOptionItem } from "../ForkliftOptionAttachPanel";
import { type RentalItemDraft } from "./rentalTypes";

export interface AddContractModalProps {
  contractComboboxOptions: SearchSelectOption[];
  contracts: any[];
  ctAttachedOptions: AttachedForkliftOption[];
  ctBaseContractId: string;
  ctBillingDay: string;
  ctCustomer: string;
  ctDailyRate: string;
  ctDeposit: string;
  ctEnd: string;
  ctEntityType: "CORP" | "INDIVIDUAL";
  ctFileInputRef: React.RefObject<HTMLInputElement | null>;
  ctFileName: string;
  ctMonthlyRate: string;
  ctPartnerId: number | null;
  ctRateBasis: RentalRateBasis;
  ctRentalItems: RentalItemDraft[];
  ctStart: string;
  ctTaxSpec: BuyerTaxSpec;
  ctVatAmount: string;
  handleAddContract: (e: React.FormEvent) => Promise<void>;
  handleContractFileUpload: (file: File) => void;
  inStockProductComboboxOptions: SearchSelectOption[];
  inStockProducts: { id: number; modelCode: string; modelName: string; manufacturer: string; standardMonthlyRate: number; standardDailyRate: number; availableCount: number; }[];
  isCtFileDragging: boolean;
  optionCatalog: CatalogOptionItem[];
  partnerComboboxOptions: SearchSelectOption[];
  partners: any[];
  recalcDraftItemsTotals: (drafts: RentalItemDraft[], isEditMode?: boolean, existingTaxItems?: any[], basisOverride?: RentalRateBasis) => void;
  setCtAttachedOptions: React.Dispatch<React.SetStateAction<AttachedForkliftOption[]>>;
  setCtBaseContractId: React.Dispatch<React.SetStateAction<string>>;
  setCtBillingDay: React.Dispatch<React.SetStateAction<string>>;
  setCtCustomer: React.Dispatch<React.SetStateAction<string>>;
  setCtDailyRate: React.Dispatch<React.SetStateAction<string>>;
  setCtDeposit: React.Dispatch<React.SetStateAction<string>>;
  setCtEnd: React.Dispatch<React.SetStateAction<string>>;
  setCtEntityType: React.Dispatch<React.SetStateAction<"CORP" | "INDIVIDUAL">>;
  setCtFileName: React.Dispatch<React.SetStateAction<string>>;
  setCtFileUrl: React.Dispatch<React.SetStateAction<string>>;
  setCtMonthlyRate: React.Dispatch<React.SetStateAction<string>>;
  setCtPartnerId: React.Dispatch<React.SetStateAction<number | null>>;
  setCtRateBasis: React.Dispatch<React.SetStateAction<RentalRateBasis>>;
  setCtRentalItems: React.Dispatch<React.SetStateAction<RentalItemDraft[]>>;
  setCtStart: React.Dispatch<React.SetStateAction<string>>;
  setCtTaxSpec: React.Dispatch<React.SetStateAction<BuyerTaxSpec>>;
  setCtVatAmount: React.Dispatch<React.SetStateAction<string>>;
  setIsCtFileDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAddContractModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAddContractModal: boolean;
}

export const AddContractModal: React.FC<AddContractModalProps> = ({
  contractComboboxOptions,
  contracts,
  ctAttachedOptions,
  ctBaseContractId,
  ctBillingDay,
  ctCustomer,
  ctDailyRate,
  ctDeposit,
  ctEnd,
  ctEntityType,
  ctFileInputRef,
  ctFileName,
  ctMonthlyRate,
  ctPartnerId,
  ctRateBasis,
  ctRentalItems,
  ctStart,
  ctTaxSpec,
  ctVatAmount,
  handleAddContract,
  handleContractFileUpload,
  inStockProductComboboxOptions,
  inStockProducts,
  isCtFileDragging,
  optionCatalog,
  partnerComboboxOptions,
  partners,
  recalcDraftItemsTotals,
  setCtAttachedOptions,
  setCtBaseContractId,
  setCtBillingDay,
  setCtCustomer,
  setCtDailyRate,
  setCtDeposit,
  setCtEnd,
  setCtEntityType,
  setCtFileName,
  setCtFileUrl,
  setCtMonthlyRate,
  setCtPartnerId,
  setCtRateBasis,
  setCtRentalItems,
  setCtStart,
  setCtTaxSpec,
  setCtVatAmount,
  setIsCtFileDragging,
  setShowAddContractModal,
  showAddContractModal,
}) => {
  return (
    <>
      {showAddContractModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] w-full text-[#0f172a] max-w-3xl max-h-[92vh] overflow-y-auto rounded shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894]">
              <h3 className="font-bold text-sm text-[#0f172a] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#1d4ed8]" />
                <span>신규 임대계약 체결</span>
              </h3>
              <button onClick={() => setShowAddContractModal(false)} className="text-[#475569] hover:text-[#0f172a]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddContract} className="mt-4 flex flex-col gap-3 text-xs">
              {/* 1. 귀속 사업자 & 기본 계약(고객사) 선택 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5 flex flex-col gap-1 p-2 rounded bg-[#ebe5d8] border border-[#b5a894]">
                  <label className="text-[#1e293b] font-semibold text-[11px]">계약 귀속 사업자</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCtEntityType("CORP")}
                      className={`p-2 rounded border text-left transition ${
                        ctEntityType === "CORP"
                          ? "border-[#1d4ed8] bg-[#dbeafe] text-[#1e40af] font-bold"
                          : "border-[#b5a894] bg-[#f4efe4] text-[#475569] hover:bg-[#e2dbcd]"
                      }`}
                    >
                      <div className="whitespace-nowrap">(주)드래곤알피에이 [법인]</div>
                      <div className="font-mono text-[10px] opacity-75">806-88-03266</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCtEntityType("INDIVIDUAL")}
                      className={`p-2 rounded border text-left transition ${
                        ctEntityType === "INDIVIDUAL"
                          ? "border-[#d97706] bg-[#fef3c7] text-[#92400e] font-bold"
                          : "border-[#b5a894] bg-[#f4efe4] text-[#475569] hover:bg-[#e2dbcd]"
                      }`}
                    >
                      <div className="whitespace-nowrap">드래곤알피에이 [개인]</div>
                      <div className="font-mono text-[10px] opacity-75">295-03-02683</div>
                    </button>
                  </div>
                </div>

                {/* 기본 계약 선택 & 임차 고객사 */}
                <div className="md:col-span-7 flex flex-col gap-2 p-2 rounded bg-[#ebe5d8] border border-[#b5a894]">
                  <SearchSelectCombobox
                    label="기본 계약 선택 *"
                    size="sm"
                    clearable
                    options={contractComboboxOptions}
                    value={ctBaseContractId}
                    onChange={(cid) => {
                      setCtBaseContractId(cid);
                      if (cid) {
                        const foundCt = contracts.find((c) => String(c.id) === cid);
                        if (foundCt) {
                          setCtEntityType(foundCt.entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP");
                          setCtPartnerId(foundCt.partnerId || null);
                          setCtCustomer(foundCt.customerName || "");
                          setCtBillingDay(String(foundCt.billingDay || "25"));
                          if (foundCt.startDate) setCtStart(String(foundCt.startDate).slice(0, 10));
                          if (foundCt.endDate) setCtEnd(String(foundCt.endDate).slice(0, 10));
                          const matchedPartner = partners.find(
                            (p) => p.id === foundCt.partnerId || p.name === foundCt.customerName
                          );
                          if (matchedPartner) {
                            setCtTaxSpec((prev) => extractPartnerTaxSpec(matchedPartner, prev));
                          }
                        }
                      } else {
                        setCtPartnerId(null);
                        setCtCustomer("");
                      }
                    }}
                    placeholder="신규 기본 계약 또는 기존 계약 검색"
                    showChosungBar
                  />

                  <SearchSelectCombobox
                    label="임차 고객사 *"
                    size="sm"
                    allowFreeText
                    showChosungBar
                    options={partnerComboboxOptions}
                    value={ctPartnerId ? String(ctPartnerId) : ""}
                    freeTextValue={ctCustomer}
                    onFreeTextChange={(val) => {
                      setCtCustomer(val);
                      setCtPartnerId(null);
                    }}
                    onChange={(nextId) => {
                      const p = partners.find((item) => String(item.id) === nextId);
                      if (!p) {
                        setCtPartnerId(null);
                        setCtCustomer("");
                        setCtBaseContractId("");
                        return;
                      }
                      setCtPartnerId(p.id);
                      setCtCustomer(p.name);
                      setCtTaxSpec((prev) => extractPartnerTaxSpec(p, prev));
                      const existingCt = contracts.find(
                        (c) => c.partnerId === p.id || c.customerName === p.name
                      );
                      if (existingCt) {
                        setCtBaseContractId(String(existingCt.id));
                      }
                    }}
                    placeholder="고객사명·초성·사업자번호 검색"
                    headerRight={
                      ctPartnerId ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dcfce7] text-[#166534] border border-[#86efac] inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>거래처 연동</span>
                        </span>
                      ) : null
                    }
                  />
                </div>
              </div>

              {/* 2. 계약 기간 및 정기 청구일 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[#1e293b] font-semibold">계약 시작일 *</label>
                  <input
                    type="date"
                    value={ctStart}
                    onChange={(e) => setCtStart(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[#1e293b] font-semibold">계약 종료일 *</label>
                  <input
                    type="date"
                    value={ctEnd}
                    onChange={(e) => setCtEnd(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[#1e293b] font-semibold">정기 청구일</label>
                  <select
                    value={ctBillingDay}
                    onChange={(e) => setCtBillingDay(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a]"
                  >
                    <option value="5">매월 5일</option>
                    <option value="10">매월 10일</option>
                    <option value="15">매월 15일</option>
                    <option value="20">매월 20일</option>
                    <option value="25">매월 25일</option>
                    <option value="31">매월 말일</option>
                  </select>
                </div>
              </div>

              {/* 3. 재고가 있는 제품 선택 + 수량 + 단가 입력 */}
              <div className="flex flex-col gap-2 p-3 rounded border border-[#b5a894] bg-[#ebe5d8]/90">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1d4ed8]" />
                    <span className="font-bold text-[#1e3a8a]">임대 제품 및 수량·단가 입력</span>
                    <span className="text-[11px] text-[#475569]">
                      (가용 재고 보유 제품 {formatErpNumber(inStockProducts.length)}종)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...ctRentalItems, { productId: "", qty: "1", unitCost: "0" }];
                      setCtRentalItems(next);
                    }}
                    className="px-2.5 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>제품 추가</span>
                  </button>
                </div>

                {inStockProducts.length === 0 ? (
                  <div className="p-3 rounded bg-[#f4efe4] border border-[#b5a894] text-center text-[#64748b]">
                    현재 임대가능(AVAILABLE) 재고가 있는 제품이 없습니다. (제품 미지정 상태로 기본 계약만 선체결 가능)
                  </div>
                ) : (
                  <table className="w-full text-xs border-collapse bg-[#f4efe4] rounded overflow-hidden border border-[#b5a894]">
                    <thead className="bg-[#e2dbcd] text-[#1e293b] border-b border-[#b5a894] font-semibold">
                      <tr>
                        <th className="py-2 px-2.5 text-left">재고 보유 제품 선택</th>
                        <th className="py-2 px-2 text-center w-24">가용 재고</th>
                        <th className="py-2 px-2 text-right w-24">수량</th>
                        <th className="py-2 px-2 text-right w-36">단가 (원)</th>
                        <th className="py-2 px-2.5 text-right w-36">공급가액</th>
                        <th className="py-2 px-2 text-center w-12">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d0c6b4]">
                      {ctRentalItems.map((row, idx) => {
                        const selectedProd = inStockProducts.find((p) => String(p.id) === String(row.productId));
                        const maxStock = selectedProd?.availableCount || 999;
                        const qtyNum = Math.max(0, cleanErpNumber(row.qty) || 0);
                        const unitNum = Math.max(0, cleanErpNumber(row.unitCost) || 0);
                        const rowSupply = Math.round(qtyNum * unitNum);

                        return (
                          <tr key={idx}>
                            <td className="py-1.5 px-2">
                              <SearchSelectCombobox
                                size="sm"
                                options={inStockProductComboboxOptions}
                                value={row.productId}
                                onChange={(pid) => {
                                  const prod = inStockProducts.find((p) => String(p.id) === pid);
                                  const defaultRate = prod ? prod.standardMonthlyRate : 0;
                                  const next = ctRentalItems.map((r, i) =>
                                    i === idx
                                      ? {
                                          productId: pid,
                                          qty: "1",
                                          unitCost: toErpInputString(defaultRate),
                                        }
                                      : r
                                  );
                                  setCtRentalItems(next);
                                  recalcDraftItemsTotals(next, false);
                                }}
                                placeholder="재고 제품 검색"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono font-bold text-[#047857]">
                              {selectedProd ? `${formatErpNumber(selectedProd.availableCount)}대` : "-"}
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={row.qty}
                                onChange={(e) => {
                                  const raw = cleanErpNumber(e.target.value);
                                  const clamped = Math.min(maxStock, Math.max(1, raw || 1));
                                  const next = ctRentalItems.map((r, i) =>
                                    i === idx ? { ...r, qty: formatErpInputNumber(String(clamped)) } : r
                                  );
                                  setCtRentalItems(next);
                                  recalcDraftItemsTotals(next, false);
                                }}
                                className="w-full h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono font-bold text-right"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={row.unitCost}
                                onChange={(e) => {
                                  const formatted = formatErpInputNumber(e.target.value);
                                  const next = ctRentalItems.map((r, i) =>
                                    i === idx ? { ...r, unitCost: formatted } : r
                                  );
                                  setCtRentalItems(next);
                                  recalcDraftItemsTotals(next, false);
                                }}
                                placeholder="0"
                                className="w-full h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono font-bold text-right"
                              />
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-[#1e3a8a]">
                              {formatErpCurrency(rowSupply)}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (ctRentalItems.length <= 1) {
                                    const reset = [{ productId: "", qty: "1", unitCost: "0" }];
                                    setCtRentalItems(reset);
                                    recalcDraftItemsTotals(reset, false);
                                    return;
                                  }
                                  const next = ctRentalItems.filter((_, i) => i !== idx);
                                  setCtRentalItems(next);
                                  recalcDraftItemsTotals(next, false);
                                }}
                                className="p-1 text-rose-600 hover:bg-rose-100 rounded transition"
                                title="행 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* 합계 및 과금기준 요약 바 */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[#1e293b] font-semibold text-[11px] whitespace-nowrap">과금 기준 *</label>
                    <select
                      value={ctRateBasis}
                      onChange={(e) => {
                        const nextBasis = e.target.value as RentalRateBasis;
                        setCtRateBasis(nextBasis);
                        if (nextBasis === "DAILY_AUTO" || nextBasis === "MONTHLY") {
                          setCtDailyRate(
                            toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(ctMonthlyRate)))
                          );
                        }
                      }}
                      className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-semibold"
                    >
                      {RENTAL_RATE_BASIS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[#1e293b] font-semibold text-[11px] whitespace-nowrap">월단가 (공급가)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ctMonthlyRate}
                      onChange={(e) => {
                        const formatted = formatErpInputNumber(e.target.value);
                        setCtMonthlyRate(formatted);
                        const num = cleanErpNumber(formatted);
                        setCtVatAmount(toErpInputString(Math.round(num * 0.1)));
                        if (ctRateBasis !== "DAILY_MANUAL") {
                          setCtDailyRate(toErpInputString(calculateAutoDailyRentalFee(num)));
                        }
                      }}
                      className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-1">
                      <label className="text-[#1e293b] font-semibold text-[11px] whitespace-nowrap">일단가 (원)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setCtRateBasis("DAILY_AUTO");
                          setCtDailyRate(
                            toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(ctMonthlyRate)))
                          );
                        }}
                        className="text-[10px] font-bold text-[#1d4ed8] hover:underline whitespace-nowrap shrink-0"
                      >
                        자동계산
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ctDailyRate}
                      onChange={(e) => {
                        setCtRateBasis("DAILY_MANUAL");
                        setCtDailyRate(formatErpInputNumber(e.target.value));
                      }}
                      className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[#1e293b] font-semibold text-[11px] whitespace-nowrap">세액 (VAT)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ctVatAmount}
                      onChange={(e) => setCtVatAmount(formatErpInputNumber(e.target.value))}
                      className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[#1e293b] font-semibold text-[11px] whitespace-nowrap">보증금 (원)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ctDeposit}
                      onChange={(e) => setCtDeposit(formatErpInputNumber(e.target.value))}
                      className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 3-1. 부착옵션 선택 (렌탈 과금 가산) */}
              <div className="flex flex-col gap-2">
                <ForkliftOptionAttachPanel
                  mode="RENTAL"
                  options={ctAttachedOptions}
                  onChange={setCtAttachedOptions}
                  catalogOptions={optionCatalog}
                  title="부착옵션 선택 (저장 시 계약 월임대료·품목에 합산)"
                />
                {ctAttachedOptions.length > 0 && (() => {
                  const optTotals = calculateAttachedOptionsTotals(ctAttachedOptions);
                  const baseMonthly = cleanErpNumber(ctMonthlyRate);
                  return (
                    <div className="px-3 py-1.5 rounded border border-amber-500/40 bg-[#ebe5d8] text-[11px] flex items-center justify-between flex-wrap gap-2 text-[#0f172a]">
                      <span>
                        기본 월임대료 {formatErpCurrency(baseMonthly)} + 부착옵션 월추가{" "}
                        {formatErpCurrency(optTotals.totalMonthlyAddon)}
                      </span>
                      <span className="font-mono font-bold text-amber-800">
                        예상 최종 월임대료: {formatErpCurrency(baseMonthly + optTotals.totalMonthlyAddon)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* 4. 공급받는자 전자세금계산서 수신 이메일 및 사업자 제원 */}
              <div className="flex flex-col gap-2 p-3 rounded border border-[#b5a894] bg-[#ebe5d8]/90">
                <div className="flex items-center justify-between border-b border-[#b5a894] pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#1e3a8a]">
                    <FileText className="w-4 h-4 text-blue-700" />
                    <span>공급받는자 세금계산서 수신 설정 및 사업자 제원 (팝빌 발송 연동)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#57534e]">영수/청구 구분</span>
                    <div className="inline-flex rounded border border-[#b5a894] overflow-hidden bg-[#f4efe4]">
                      <button
                        type="button"
                        onClick={() => setCtTaxSpec({ ...ctTaxSpec, taxPurpose: "청구" })}
                        className={`px-2.5 py-0.5 text-[11px] font-bold transition ${
                          ctTaxSpec.taxPurpose === "청구"
                            ? "bg-blue-700 text-white"
                            : "text-[#57534e] hover:bg-[#e2dbcd]"
                        }`}
                      >
                        청구
                      </button>
                      <button
                        type="button"
                        onClick={() => setCtTaxSpec({ ...ctTaxSpec, taxPurpose: "영수" })}
                        className={`px-2.5 py-0.5 text-[11px] font-bold transition ${
                          ctTaxSpec.taxPurpose === "영수"
                            ? "bg-blue-700 text-white"
                            : "text-[#57534e] hover:bg-[#e2dbcd]"
                        }`}
                      >
                        영수
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">등록번호 (사업자번호)</label>
                    <input
                      type="text"
                      value={ctTaxSpec.customerBizNo}
                      onChange={(e) => setCtTaxSpec({ ...ctTaxSpec, customerBizNo: e.target.value })}
                      placeholder="000-00-00000"
                      className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[#1c1917] font-mono text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">성명 (대표자)</label>
                    <input
                      type="text"
                      value={ctTaxSpec.customerCeoName}
                      onChange={(e) => setCtTaxSpec({ ...ctTaxSpec, customerCeoName: e.target.value })}
                      placeholder="대표자 성명"
                      className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[#1c1917] text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">업태</label>
                    <input
                      type="text"
                      value={ctTaxSpec.customerBizType}
                      onChange={(e) => setCtTaxSpec({ ...ctTaxSpec, customerBizType: e.target.value })}
                      placeholder="예: 도매업, 서비스"
                      className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[#1c1917] text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">종목</label>
                    <input
                      type="text"
                      value={ctTaxSpec.customerBizClass}
                      onChange={(e) => setCtTaxSpec({ ...ctTaxSpec, customerBizClass: e.target.value })}
                      placeholder="예: 소프트웨어 개발, 전자제품"
                      className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[#1c1917] text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6 flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">사업장 주소</label>
                    <input
                      type="text"
                      value={ctTaxSpec.customerAddress}
                      onChange={(e) => setCtTaxSpec({ ...ctTaxSpec, customerAddress: e.target.value })}
                      placeholder="사업장 소재지 주소"
                      className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[#1c1917] text-xs"
                    />
                  </div>
                  <div className="col-span-3 flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#1e3a8a] whitespace-nowrap">이메일 1 (주 수신)</label>
                    <input
                      type="email"
                      value={ctTaxSpec.customerEmail}
                      onChange={(e) => setCtTaxSpec({ ...ctTaxSpec, customerEmail: e.target.value })}
                      placeholder="tax@company.co.kr"
                      className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[#1c1917] font-mono text-xs"
                    />
                  </div>
                  <div className="col-span-3 flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">이메일 2 (부 수신)</label>
                    <input
                      type="email"
                      value={ctTaxSpec.customerEmail2}
                      onChange={(e) => setCtTaxSpec({ ...ctTaxSpec, customerEmail2: e.target.value })}
                      placeholder="보조 이메일 (선택)"
                      className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[#1c1917] font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 계약서 첨부 영역 */}
              <div className="flex flex-col gap-1">
                <label className="text-[#1e293b] font-semibold">임대계약서 파일 첨부 (선택)</label>
                <input
                  ref={ctFileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.hwp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleContractFileUpload(file);
                  }}
                  className="hidden"
                />
                {ctFileName ? (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded bg-[#dbeafe]/60 border border-[#93c5fd]">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                      <span className="font-semibold text-[#1e3a8a] truncate">{ctFileName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => ctFileInputRef.current?.click()}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894]"
                      >
                        변경
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCtFileUrl("");
                          setCtFileName("");
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 border border-rose-500/30"
                      >
                        제거
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsCtFileDragging(true);
                    }}
                    onDragLeave={() => setIsCtFileDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsCtFileDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleContractFileUpload(file);
                    }}
                    onClick={() => ctFileInputRef.current?.click()}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded border border-dashed cursor-pointer transition ${
                      isCtFileDragging
                        ? "border-[#1d4ed8] bg-[#dbeafe]/50"
                        : "border-[#b5a894] bg-[#ebe5d8]/70 hover:bg-[#e2dbcd]"
                    }`}
                  >
                    <FileUp className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    <span className="text-[#334155] font-medium">
                      클릭하거나 계약서 파일을 드래그하여 첨부
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-1 pt-3 border-t border-[#b5a894]">
                <button
                  type="button"
                  onClick={() => setShowAddContractModal(false)}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded"
                >
                  계약 체결
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export interface EditContractModalProps {
  editCtAddItems: RentalItemDraft[];
  editCtAttachedOptions: AttachedForkliftOption[];
  editCtBillingDay: string;
  editCtContractNo: string;
  editCtCustomer: string;
  editCtDailyRate: string;
  editCtDeposit: string;
  editCtEnd: string;
  editCtEntityType: "CORP" | "INDIVIDUAL";
  editCtMemo: string;
  editCtMonthlyRate: string;
  editCtPartnerId: number | null;
  editCtRateBasis: RentalRateBasis;
  editCtStart: string;
  editCtStatus: string;
  editCtTaxSpec: BuyerTaxSpec;
  editCtVatAmount: string;
  handleUpdateContract: (e: React.FormEvent) => Promise<void>;
  inStockProductComboboxOptions: SearchSelectOption[];
  inStockProducts: { id: number; modelCode: string; modelName: string; manufacturer: string; standardMonthlyRate: number; standardDailyRate: number; availableCount: number; }[];
  optionCatalog: CatalogOptionItem[];
  partnerComboboxOptions: SearchSelectOption[];
  partners: any[];
  recalcDraftItemsTotals: (drafts: RentalItemDraft[], isEditMode?: boolean, existingTaxItems?: any[], basisOverride?: RentalRateBasis) => void;
  setEditCtAddItems: React.Dispatch<React.SetStateAction<RentalItemDraft[]>>;
  setEditCtAttachedOptions: React.Dispatch<React.SetStateAction<AttachedForkliftOption[]>>;
  setEditCtBillingDay: React.Dispatch<React.SetStateAction<string>>;
  setEditCtCustomer: React.Dispatch<React.SetStateAction<string>>;
  setEditCtDailyRate: React.Dispatch<React.SetStateAction<string>>;
  setEditCtDeposit: React.Dispatch<React.SetStateAction<string>>;
  setEditCtEnd: React.Dispatch<React.SetStateAction<string>>;
  setEditCtEntityType: React.Dispatch<React.SetStateAction<"CORP" | "INDIVIDUAL">>;
  setEditCtMemo: React.Dispatch<React.SetStateAction<string>>;
  setEditCtMonthlyRate: React.Dispatch<React.SetStateAction<string>>;
  setEditCtPartnerId: React.Dispatch<React.SetStateAction<number | null>>;
  setEditCtRateBasis: React.Dispatch<React.SetStateAction<RentalRateBasis>>;
  setEditCtStart: React.Dispatch<React.SetStateAction<string>>;
  setEditCtStatus: React.Dispatch<React.SetStateAction<string>>;
  setEditCtTaxSpec: React.Dispatch<React.SetStateAction<BuyerTaxSpec>>;
  setEditCtVatAmount: React.Dispatch<React.SetStateAction<string>>;
  setShowEditContractModal: React.Dispatch<React.SetStateAction<boolean>>;
  showEditContractModal: boolean;
}

export const EditContractModal: React.FC<EditContractModalProps> = ({
  editCtAddItems,
  editCtAttachedOptions,
  editCtBillingDay,
  editCtContractNo,
  editCtCustomer,
  editCtDailyRate,
  editCtDeposit,
  editCtEnd,
  editCtEntityType,
  editCtMemo,
  editCtMonthlyRate,
  editCtPartnerId,
  editCtRateBasis,
  editCtStart,
  editCtStatus,
  editCtTaxSpec,
  editCtVatAmount,
  handleUpdateContract,
  inStockProductComboboxOptions,
  inStockProducts,
  optionCatalog,
  partnerComboboxOptions,
  partners,
  recalcDraftItemsTotals,
  setEditCtAddItems,
  setEditCtAttachedOptions,
  setEditCtBillingDay,
  setEditCtCustomer,
  setEditCtDailyRate,
  setEditCtDeposit,
  setEditCtEnd,
  setEditCtEntityType,
  setEditCtMemo,
  setEditCtMonthlyRate,
  setEditCtPartnerId,
  setEditCtRateBasis,
  setEditCtStart,
  setEditCtStatus,
  setEditCtTaxSpec,
  setEditCtVatAmount,
  setShowEditContractModal,
  showEditContractModal,
}) => {
  return (
    <>
      {showEditContractModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] w-full text-[#1c1917] max-w-3xl max-h-[92vh] overflow-y-auto rounded shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894]">
              <h3 className="font-bold text-sm text-[#1c1917] flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-700" />
                <span>임대계약 수정 [{editCtContractNo}]</span>
              </h3>
              <button onClick={() => setShowEditContractModal(false)} className="text-[#78716c] hover:text-[#1c1917]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateContract} className="flex flex-col gap-3 mt-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#78716c] font-semibold">계약 귀속 사업자</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditCtEntityType("CORP")}
                      className={`p-2 rounded border text-left font-bold transition ${
                        editCtEntityType === "CORP"
                          ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                          : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                      }`}
                    >
                      <div>(주)드래곤알피에이 [법인]</div>
                      <div className="text-[10px] font-normal font-mono opacity-80">806-88-03266</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCtEntityType("INDIVIDUAL")}
                      className={`p-2 rounded border text-left font-bold transition ${
                        editCtEntityType === "INDIVIDUAL"
                          ? "border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500"
                          : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                      }`}
                    >
                      <div>드래곤알피에이 [개인]</div>
                      <div className="text-[10px] font-normal font-mono opacity-80">295-03-02683</div>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <SearchSelectCombobox
                    label="고객사(임차인) 상호명"
                    required
                    size="sm"
                    allowFreeText
                    showChosungBar
                    options={partnerComboboxOptions}
                    value={editCtPartnerId ? String(editCtPartnerId) : ""}
                    freeTextValue={editCtCustomer}
                    onFreeTextChange={(val) => {
                      setEditCtCustomer(val);
                      setEditCtPartnerId(null);
                    }}
                    onChange={(nextId) => {
                      const pid = Number(nextId) || null;
                      setEditCtPartnerId(pid);
                      const found = partners.find((p) => p.id === pid);
                      if (found) {
                        setEditCtCustomer(found.name);
                        setEditCtTaxSpec((prev) => extractPartnerTaxSpec(found, prev));
                      }
                    }}
                    placeholder="고객사명·초성·사업자번호 검색"
                    headerRight={
                      editCtPartnerId ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dcfce7] text-[#166534] border border-[#86efac] whitespace-nowrap shrink-0">
                          거래처 연동
                        </span>
                      ) : null
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[#78716c] font-semibold">계약 시작일 *</label>
                  <input
                    type="date"
                    value={editCtStart}
                    onChange={(e) => setEditCtStart(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917] font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[#78716c] font-semibold">계약 종료일 *</label>
                  <input
                    type="date"
                    value={editCtEnd}
                    onChange={(e) => setEditCtEnd(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917] font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[#78716c] font-semibold">정기 청구일</label>
                  <select
                    value={editCtBillingDay}
                    onChange={(e) => setEditCtBillingDay(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917]"
                  >
                    <option value="5">매월 5일</option>
                    <option value="10">매월 10일</option>
                    <option value="15">매월 15일</option>
                    <option value="20">매월 20일</option>
                    <option value="25">매월 25일</option>
                    <option value="31">매월 말일</option>
                  </select>
                </div>
              </div>

              {/* 현재 배정된 임대 제품 명세 및 수량/단가 수정 */}
              <div className="flex flex-col gap-2 p-3 rounded border border-[#b5a894] bg-[#ebe5d8]/80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1e3a8a]">현재 임대 제품 및 수량·단가 명세</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#57534e]">대표 품목 치환식:</span>
                    <input
                      type="text"
                      value={editCtTaxSpec.taxMemo}
                      onChange={(e) => setEditCtTaxSpec({ ...editCtTaxSpec, taxMemo: e.target.value })}
                      className="h-7 px-2 w-44 rounded border border-[#b5a894] bg-[#f4efe4] text-[#1c1917] font-semibold text-xs"
                    />
                  </div>
                </div>

                <table className="w-full text-xs border-collapse bg-[#f4efe4] rounded overflow-hidden border border-[#b5a894]">
                  <thead className="bg-[#e2dbcd] text-[#1e293b] border-b border-[#b5a894] font-semibold">
                    <tr>
                      <th className="py-1.5 px-2.5 text-left">제품명 (품목)</th>
                      <th className="py-1.5 px-2 text-right w-24">수량</th>
                      <th className="py-1.5 px-2 text-right w-36">단가 (원)</th>
                      <th className="py-1.5 px-2.5 text-right w-36">공급가액</th>
                      <th className="py-1.5 px-2 text-center w-12">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d0c6b4]">
                    {editCtTaxSpec.taxItems.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={it.itemName}
                            onChange={(e) => {
                              const nextItems = editCtTaxSpec.taxItems.map((row, i) =>
                                i === idx ? { ...row, itemName: e.target.value } : row
                              );
                              setEditCtTaxSpec({ ...editCtTaxSpec, taxItems: nextItems });
                            }}
                            className="w-full h-7 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917] font-semibold"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={toErpInputString(it.qty)}
                            onChange={(e) => {
                              const q = Math.max(1, cleanErpNumber(e.target.value) || 1);
                              const nextItems = editCtTaxSpec.taxItems.map((row, i) => {
                                if (i !== idx) return row;
                                const sup = Math.round(q * (Number(row.unitCost) || 0));
                                return { ...row, qty: q, supplyAmount: sup, vatAmount: Math.round(sup * 0.1) };
                              });
                              setEditCtTaxSpec({ ...editCtTaxSpec, taxItems: nextItems });
                              recalcDraftItemsTotals(editCtAddItems, true, nextItems);
                            }}
                            className="w-full h-7 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917] font-mono text-right font-bold"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={toErpInputString(it.unitCost)}
                            onChange={(e) => {
                              const u = cleanErpNumber(e.target.value) || 0;
                              const nextItems = editCtTaxSpec.taxItems.map((row, i) => {
                                if (i !== idx) return row;
                                const sup = Math.round((Number(row.qty) || 1) * u);
                                return { ...row, unitCost: u, supplyAmount: sup, vatAmount: Math.round(sup * 0.1) };
                              });
                              setEditCtTaxSpec({ ...editCtTaxSpec, taxItems: nextItems });
                              recalcDraftItemsTotals(editCtAddItems, true, nextItems);
                            }}
                            className="w-full h-7 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917] font-mono text-right font-bold"
                          />
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-[#1e3a8a]">
                          {formatErpCurrency(it.supplyAmount)}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (editCtTaxSpec.taxItems.length <= 1) return;
                              const nextItems = editCtTaxSpec.taxItems.filter((_, i) => i !== idx);
                              setEditCtTaxSpec({ ...editCtTaxSpec, taxItems: nextItems });
                              recalcDraftItemsTotals(editCtAddItems, true, nextItems);
                            }}
                            className="p-1 text-rose-600 hover:bg-rose-100 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 재고 제품 추가 배정 */}
                <div className="flex items-center justify-between pt-2 border-t border-[#c4b6a0]">
                  <span className="font-semibold text-[#334155]">재고 보유 제품 추가 배정</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditCtAddItems([...editCtAddItems, { productId: "", qty: "1", unitCost: "0" }])
                    }
                    className="px-2.5 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>재고 제품 추가</span>
                  </button>
                </div>

                {editCtAddItems.length > 0 && (
                  <table className="w-full text-xs border-collapse bg-[#f4efe4] rounded overflow-hidden border border-[#b5a894]">
                    <tbody className="divide-y divide-[#d0c6b4]">
                      {editCtAddItems.map((row, idx) => {
                        const selectedProd = inStockProducts.find((p) => String(p.id) === String(row.productId));
                        const maxStock = selectedProd?.availableCount || 999;
                        const qtyNum = Math.max(0, cleanErpNumber(row.qty) || 0);
                        const unitNum = Math.max(0, cleanErpNumber(row.unitCost) || 0);
                        const rowSupply = Math.round(qtyNum * unitNum);

                        return (
                          <tr key={idx}>
                            <td className="py-1.5 px-2">
                              <SearchSelectCombobox
                                size="xs"
                                options={inStockProductComboboxOptions}
                                value={row.productId}
                                onChange={(pid) => {
                                  const prod = inStockProducts.find((p) => String(p.id) === pid);
                                  const defaultRate = prod ? prod.standardMonthlyRate : 0;
                                  const next = editCtAddItems.map((r, i) =>
                                    i === idx
                                      ? { productId: pid, qty: "1", unitCost: toErpInputString(defaultRate) }
                                      : r
                                  );
                                  setEditCtAddItems(next);
                                  recalcDraftItemsTotals(next, true, editCtTaxSpec.taxItems);
                                }}
                                placeholder="추가할 재고 제품 검색"
                              />
                            </td>
                            <td className="py-1.5 px-2 w-24">
                              <input
                                type="text"
                                value={row.qty}
                                onChange={(e) => {
                                  const raw = cleanErpNumber(e.target.value);
                                  const clamped = Math.min(maxStock, Math.max(1, raw || 1));
                                  const next = editCtAddItems.map((r, i) =>
                                    i === idx ? { ...r, qty: formatErpInputNumber(String(clamped)) } : r
                                  );
                                  setEditCtAddItems(next);
                                  recalcDraftItemsTotals(next, true, editCtTaxSpec.taxItems);
                                }}
                                className="w-full h-7 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono font-bold text-right"
                              />
                            </td>
                            <td className="py-1.5 px-2 w-36">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={row.unitCost}
                                onChange={(e) => {
                                  const formatted = formatErpInputNumber(e.target.value);
                                  const next = editCtAddItems.map((r, i) =>
                                    i === idx ? { ...r, unitCost: formatted } : r
                                  );
                                  setEditCtAddItems(next);
                                  recalcDraftItemsTotals(next, true, editCtTaxSpec.taxItems);
                                }}
                                className="w-full h-7 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono font-bold text-right"
                              />
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-[#047857] w-36">
                              + {formatErpCurrency(rowSupply)}
                            </td>
                            <td className="py-1.5 px-2 text-center w-12">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = editCtAddItems.filter((_, i) => i !== idx);
                                  setEditCtAddItems(next);
                                  recalcDraftItemsTotals(next, true, editCtTaxSpec.taxItems);
                                }}
                                className="p-1 text-rose-600 hover:bg-rose-100 rounded transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[#78716c] font-semibold whitespace-nowrap">과금 기준 *</label>
                  <select
                    value={editCtRateBasis}
                    onChange={(e) => {
                      const nextBasis = e.target.value as RentalRateBasis;
                      setEditCtRateBasis(nextBasis);
                      if (nextBasis === "DAILY_AUTO" || nextBasis === "MONTHLY") {
                        setEditCtDailyRate(
                          toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(editCtMonthlyRate)))
                        );
                      }
                    }}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917] font-semibold"
                  >
                    {RENTAL_RATE_BASIS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[#78716c] font-semibold whitespace-nowrap">약정 월단가 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editCtMonthlyRate}
                    onChange={(e) => {
                      const formatted = formatErpInputNumber(e.target.value);
                      setEditCtMonthlyRate(formatted);
                      const num = cleanErpNumber(formatted);
                      setEditCtVatAmount(toErpInputString(Math.round(num * 0.1)));
                      if (editCtRateBasis !== "DAILY_MANUAL") {
                        setEditCtDailyRate(toErpInputString(calculateAutoDailyRentalFee(num)));
                      }
                    }}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917] font-mono text-right font-bold"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-[#78716c] font-semibold whitespace-nowrap">일단가 (원)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setEditCtRateBasis("DAILY_AUTO");
                        setEditCtDailyRate(
                          toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(editCtMonthlyRate)))
                        );
                      }}
                      className="text-[10px] font-bold text-[#1d4ed8] hover:underline whitespace-nowrap shrink-0"
                    >
                      자동계산
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editCtDailyRate}
                    onChange={(e) => {
                      setEditCtRateBasis("DAILY_MANUAL");
                      setEditCtDailyRate(formatErpInputNumber(e.target.value));
                    }}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917] font-mono text-right font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[#78716c] font-semibold whitespace-nowrap">세액 (VAT)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editCtVatAmount}
                    onChange={(e) => setEditCtVatAmount(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917] font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[#78716c] font-semibold whitespace-nowrap">보증금</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editCtDeposit}
                    onChange={(e) => setEditCtDeposit(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917] font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[#78716c] font-semibold whitespace-nowrap">계약 상태</label>
                  <select
                    value={editCtStatus}
                    onChange={(e) => setEditCtStatus(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917]"
                  >
                    <option value="ACTIVE">대여중 (ACTIVE)</option>
                    <option value="RETURNED">반납완료 (RETURNED)</option>
                    <option value="TERMINATED">중도해지 (TERMINATED)</option>
                  </select>
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[#78716c] font-semibold whitespace-nowrap">비고</label>
                  <input
                    type="text"
                    value={editCtMemo}
                    onChange={(e) => setEditCtMemo(e.target.value)}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#1c1917]"
                  />
                </div>
              </div>

              {/* 부착옵션 관리 */}
              <div className="flex flex-col gap-2">
                <ForkliftOptionAttachPanel
                  mode="RENTAL"
                  options={editCtAttachedOptions}
                  onChange={setEditCtAttachedOptions}
                  catalogOptions={optionCatalog}
                  title="장착 부착옵션 관리 (옵션 품목·월임대료 반영)"
                />
                {editCtAttachedOptions.length > 0 && (() => {
                  const optTotals = calculateAttachedOptionsTotals(editCtAttachedOptions);
                  const baseMonthly = cleanErpNumber(editCtMonthlyRate);
                  return (
                    <div className="px-3 py-1.5 rounded border border-amber-500/40 bg-[#ebe5d8] text-[11px] flex items-center justify-between flex-wrap gap-2 text-[#0f172a]">
                      <span>
                        입력 월단가 {formatErpCurrency(baseMonthly)} / 부착옵션 월추가 합계{" "}
                        {formatErpCurrency(optTotals.totalMonthlyAddon)}
                      </span>
                      <span className="font-mono font-bold text-amber-800">
                        옵션 일추가 합계: {formatErpCurrency(optTotals.totalDailyAddon)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* 공급받는자 세금계산서 수신 설정 및 사업자 제원 (용역계약과 동일 구조) */}
              <div className="flex flex-col gap-2 p-3 rounded border border-[#b5a894] bg-[#ebe5d8]/80">
                <div className="flex items-center justify-between border-b border-[#b5a894] pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#1e3a8a]">
                    <FileText className="w-4 h-4 text-blue-700" />
                    <span>전자세금계산서 발행 제원 (임대계약 · 고객 이메일 연동)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#57534e]">영수/청구 구분</span>
                    <div className="inline-flex rounded border border-[#b5a894] overflow-hidden bg-[#f4efe4]">
                      <button
                        type="button"
                        onClick={() => setEditCtTaxSpec({ ...editCtTaxSpec, taxPurpose: "청구" })}
                        className={`px-2.5 py-0.5 text-[11px] font-bold transition ${
                          editCtTaxSpec.taxPurpose === "청구"
                            ? "bg-blue-700 text-white"
                            : "text-[#57534e] hover:bg-[#e2dbcd]"
                        }`}
                      >
                        청구
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditCtTaxSpec({ ...editCtTaxSpec, taxPurpose: "영수" })}
                        className={`px-2.5 py-0.5 text-[11px] font-bold transition ${
                          editCtTaxSpec.taxPurpose === "영수"
                            ? "bg-blue-700 text-white"
                            : "text-[#57534e] hover:bg-[#e2dbcd]"
                        }`}
                      >
                        영수
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 bg-[#f4efe4] p-2.5 rounded border border-[#c4b6a0]">
                  <div className="text-[11px] font-bold text-[#1e3a8a] flex items-center justify-between">
                    <span>공급받는자 세금계산서 제원</span>
                    <span className="text-[10px] font-normal text-[#78716c]">고객 선택 시 자동 입력 / 직접 수정 가능</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">등록번호 (사업자번호)</label>
                      <input
                        type="text"
                        value={editCtTaxSpec.customerBizNo}
                        onChange={(e) => setEditCtTaxSpec({ ...editCtTaxSpec, customerBizNo: e.target.value })}
                        placeholder="000-00-00000"
                        className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">성명 (대표자)</label>
                      <input
                        type="text"
                        value={editCtTaxSpec.customerCeoName}
                        onChange={(e) => setEditCtTaxSpec({ ...editCtTaxSpec, customerCeoName: e.target.value })}
                        placeholder="대표자 성명"
                        className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">업태</label>
                      <input
                        type="text"
                        value={editCtTaxSpec.customerBizType}
                        onChange={(e) => setEditCtTaxSpec({ ...editCtTaxSpec, customerBizType: e.target.value })}
                        placeholder="예: 도매업, 서비스"
                        className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">종목</label>
                      <input
                        type="text"
                        value={editCtTaxSpec.customerBizClass}
                        onChange={(e) => setEditCtTaxSpec({ ...editCtTaxSpec, customerBizClass: e.target.value })}
                        placeholder="예: 소프트웨어 개발, 전자제품"
                        className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6 flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">사업장 주소</label>
                      <input
                        type="text"
                        value={editCtTaxSpec.customerAddress}
                        onChange={(e) => setEditCtTaxSpec({ ...editCtTaxSpec, customerAddress: e.target.value })}
                        placeholder="사업장 소재지 주소"
                        className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] text-xs"
                      />
                    </div>
                    <div className="col-span-3 flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-[#1e3a8a] whitespace-nowrap">이메일 1 (주 수신)</label>
                      <input
                        type="email"
                        value={editCtTaxSpec.customerEmail}
                        onChange={(e) => setEditCtTaxSpec({ ...editCtTaxSpec, customerEmail: e.target.value })}
                        placeholder="account@company.co.kr"
                        className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-xs"
                      />
                    </div>
                    <div className="col-span-3 flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">이메일 2 (부 수신)</label>
                      <input
                        type="email"
                        value={editCtTaxSpec.customerEmail2}
                        onChange={(e) => setEditCtTaxSpec({ ...editCtTaxSpec, customerEmail2: e.target.value })}
                        placeholder="보조 이메일 (선택)"
                        className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-1 pt-3 border-t border-[#b5a894]">
                <button
                  type="button"
                  onClick={() => setShowEditContractModal(false)}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#1c1917] rounded border border-[#b5a894]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 font-bold text-white rounded shadow-sm"
                >
                  수정 내용 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
