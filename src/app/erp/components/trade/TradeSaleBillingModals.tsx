"use client";

import React from "react";
import { CheckCircle2, DollarSign, Edit, FileUp, Layers, Plus, Trash2, X } from "lucide-react";
import { SearchSelectCombobox, type SearchSelectOption } from "../SearchSelectCombobox";
import { cleanErpNumber, formatErpInputNumber, formatErpNumber, normalizeItemClass, toErpInputString, type AttachedForkliftOption } from "@/lib/erpFormat";
import ForkliftOptionAttachPanel, { type CatalogOptionItem } from "../ForkliftOptionAttachPanel";
import { ContractTaxInvoiceSection, type BuyerTaxSpec } from "../ContractTaxInvoiceSection";

export interface AddSaleModalProps {
  customerPartnerOptions: SearchSelectOption[];
  customerPartners: any[];
  handleAddSale: (e: React.FormEvent) => Promise<void>;
  handleSaleFileUpload: (file: File, isEdit?: boolean) => void;
  handleSelectSaleCustomer: (p: any) => void;
  products: any[];
  setShowAddSaleModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSoChassisNumbers: React.Dispatch<React.SetStateAction<string[]>>;
  setSoCustomer: React.Dispatch<React.SetStateAction<string>>;
  setSoDate: React.Dispatch<React.SetStateAction<string>>;
  setSoEntityType: React.Dispatch<React.SetStateAction<"CORP" | "INDIVIDUAL">>;
  setSoFileName: React.Dispatch<React.SetStateAction<string>>;
  setSoFileUrl: React.Dispatch<React.SetStateAction<string>>;
  setSoInstalledOptions: React.Dispatch<React.SetStateAction<AttachedForkliftOption[]>>;
  setSoItems: React.Dispatch<React.SetStateAction<{ productId: string; qty: string; unitPrice: string; vatAmount: string; }[]>>;
  setSoPartnerId: React.Dispatch<React.SetStateAction<number | null>>;
  setSoQty: React.Dispatch<React.SetStateAction<string>>;
  setSoSaleCategory: React.Dispatch<React.SetStateAction<"GENERAL" | "FORKLIFT_SALE" | "PART_SALE">>;
  setSoSiteName: React.Dispatch<React.SetStateAction<string>>;
  setSoTaxSpec: React.Dispatch<React.SetStateAction<BuyerTaxSpec>>;
  setSoUnitPrice: React.Dispatch<React.SetStateAction<string>>;
  setSoVatAmount: React.Dispatch<React.SetStateAction<string>>;
  setSoWarrantyHours: React.Dispatch<React.SetStateAction<string>>;
  setSoWarrantyMonths: React.Dispatch<React.SetStateAction<string>>;
  showAddSaleModal: boolean;
  soChassisNumbers: string[];
  soCustomer: string;
  soDate: string;
  soEntityType: "CORP" | "INDIVIDUAL";
  soFileInputRef: React.RefObject<HTMLInputElement | null>;
  soFileName: string;
  soInstalledOptions: AttachedForkliftOption[];
  soItems: { productId: string; qty: string; unitPrice: string; vatAmount: string; }[];
  soPartnerId: number | null;
  soSaleCategory: "GENERAL" | "FORKLIFT_SALE" | "PART_SALE";
  soSiteName: string;
  soTaxSpec: BuyerTaxSpec;
  soWarrantyHours: string;
  soWarrantyMonths: string;
  syncSoItemsToTaxSpec: (rows: Array<{ productId: string; qty: string; unitPrice: string; vatAmount: string; }>, dateStr?: string, installedOpts?: AttachedForkliftOption[]) => void;
  tradeOptionCatalog: CatalogOptionItem[];
  tradeProductOptions: SearchSelectOption[];
}

export const AddSaleModal: React.FC<AddSaleModalProps> = ({
  customerPartnerOptions,
  customerPartners,
  handleAddSale,
  handleSaleFileUpload,
  handleSelectSaleCustomer,
  products,
  setShowAddSaleModal,
  setSoChassisNumbers,
  setSoCustomer,
  setSoDate,
  setSoEntityType,
  setSoFileName,
  setSoFileUrl,
  setSoInstalledOptions,
  setSoItems,
  setSoPartnerId,
  setSoQty,
  setSoSaleCategory,
  setSoSiteName,
  setSoTaxSpec,
  setSoUnitPrice,
  setSoVatAmount,
  setSoWarrantyHours,
  setSoWarrantyMonths,
  showAddSaleModal,
  soChassisNumbers,
  soCustomer,
  soDate,
  soEntityType,
  soFileInputRef,
  soFileName,
  soInstalledOptions,
  soItems,
  soPartnerId,
  soSaleCategory,
  soSiteName,
  soTaxSpec,
  soWarrantyHours,
  soWarrantyMonths,
  syncSoItemsToTaxSpec,
  tradeOptionCatalog,
  tradeProductOptions,
}) => {
  return (
    <>
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

              {/* 판매유형 & 납품현장 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] dark:bg-slate-950/70 dark:border-slate-800">
                <div className="sm:col-span-7 flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300">판매유형</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { value: "FORKLIFT_SALE", label: "지게차 완제품 판매" },
                        { value: "PART_SALE", label: "부품·소모품 판매" },
                        { value: "GENERAL", label: "일반 상품 판매" },
                      ] as const
                    ).map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setSoSaleCategory(cat.value);
                          syncSoItemsToTaxSpec(
                            soItems,
                            soDate,
                            cat.value === "FORKLIFT_SALE" ? soInstalledOptions : []
                          );
                        }}
                        className={`h-8 px-2 rounded border text-[11px] font-semibold transition whitespace-nowrap ${
                          soSaleCategory === cat.value
                            ? "bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-xs"
                            : "bg-[#f4efe4] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-5 flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300">납품현장명</label>
                  <input
                    type="text"
                    value={soSiteName}
                    onChange={(e) => setSoSiteName(e.target.value)}
                    placeholder="납품 공장·물류센터명"
                    className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* 고객사 조회 선택 */}
              <SearchSelectCombobox
                label="등록 고객사 조회 선택"
                required
                allowFreeText
                showChosungBar
                size="sm"
                value={soPartnerId ? String(soPartnerId) : ""}
                freeTextValue={soCustomer}
                onFreeTextChange={(txt) => {
                  setSoCustomer(txt);
                  setSoPartnerId((prevId) => {
                    const cur = customerPartners.find((p) => p.id === prevId);
                    return cur && cur.name === txt ? prevId : null;
                  });
                }}
                onChange={(val) => {
                  if (!val) {
                    setSoPartnerId(null);
                    setSoCustomer("");
                    return;
                  }
                  const found = customerPartners.find((p) => String(p.id) === val);
                  if (found) handleSelectSaleCustomer(found);
                }}
                options={customerPartnerOptions}
                placeholder="고객사명, 사업자번호, 대표자 초성 검색 또는 직접 입력"
              />

              {/* 판매일자 & 다중 제품 출고 선택 섹션 */}
              <div className="flex flex-col gap-2 p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold text-xs">출고 제품 목록 (1건의 계약에 여러 종의 제품 포함 가능)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-slate-400 font-bold text-[11px]">판매(출고)일자</label>
                    <input
                      type="date"
                      value={soDate}
                      onChange={(e) => {
                        setSoDate(e.target.value);
                        syncSoItemsToTaxSpec(soItems, e.target.value);
                      }}
                      className="h-7 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...soItems, { productId: "", qty: "1", unitPrice: "0", vatAmount: "0" }];
                        setSoItems(next);
                        syncSoItemsToTaxSpec(next);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>제품 행 추가</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  {soItems.map((row, rIdx) => {
                    const rowSupply = (cleanErpNumber(row.qty) || 0) * (cleanErpNumber(row.unitPrice) || 0);
                    return (
                      <div key={rIdx} className="grid grid-cols-12 gap-1.5 items-end bg-slate-900/70 p-2 rounded border border-slate-800">
                        <div className="col-span-5 flex flex-col gap-1">
                          <SearchSelectCombobox
                            label={`제품 #${rIdx + 1}`}
                            required
                            clearable={false}
                            size="xs"
                            value={row.productId}
                            options={tradeProductOptions}
                            placeholder="출고 제품 검색"
                            onChange={(pid) => {
                              const prod = products.find((p) => String(p.id) === pid);
                              const unitP = prod ? Number(prod.standard_price || 0) : 0;
                              const q = cleanErpNumber(row.qty) || 1;
                              const sup = unitP * q;
                              const vat = Math.round(sup * 0.1);
                              if (prod && normalizeItemClass(prod.item_class, prod.category) === "FORKLIFT") {
                                if (Number(prod.warranty_months || 0) > 0) {
                                  setSoWarrantyMonths(toErpInputString(prod.warranty_months));
                                }
                                if (Number(prod.warranty_hours || 0) > 0) {
                                  setSoWarrantyHours(toErpInputString(prod.warranty_hours));
                                }
                              }
                              const next = soItems.map((it, idx) =>
                                idx === rIdx
                                  ? {
                                      productId: pid,
                                      qty: formatErpInputNumber(String(q)),
                                      unitPrice: formatErpInputNumber(String(unitP)),
                                      vatAmount: formatErpInputNumber(String(vat)),
                                    }
                                  : it
                              );
                              setSoItems(next);
                              syncSoItemsToTaxSpec(next);
                            }}
                          />
                        </div>

                        <div className="col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400 font-semibold">수량 *</label>
                          <input
                            type="text"
                            value={row.qty}
                            onChange={(e) => {
                              const formatted = formatErpInputNumber(e.target.value);
                              const q = cleanErpNumber(formatted);
                              const u = cleanErpNumber(row.unitPrice);
                              const sup = q * u;
                              const vat = Math.round(sup * 0.1);
                              const next = soItems.map((it, idx) =>
                                idx === rIdx
                                  ? { ...it, qty: formatted, vatAmount: formatErpInputNumber(String(vat)) }
                                  : it
                              );
                              setSoItems(next);
                              syncSoItemsToTaxSpec(next);
                            }}
                            className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs"
                            required
                          />
                        </div>

                        <div className="col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400 font-semibold">단가 (원) *</label>
                          <input
                            type="text"
                            value={row.unitPrice}
                            onChange={(e) => {
                              const formatted = formatErpInputNumber(e.target.value);
                              const u = cleanErpNumber(formatted);
                              const q = cleanErpNumber(row.qty);
                              const sup = q * u;
                              const vat = Math.round(sup * 0.1);
                              const next = soItems.map((it, idx) =>
                                idx === rIdx
                                  ? { ...it, unitPrice: formatted, vatAmount: formatErpInputNumber(String(vat)) }
                                  : it
                              );
                              setSoItems(next);
                              syncSoItemsToTaxSpec(next);
                            }}
                            className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs"
                            required
                          />
                        </div>

                        <div className="col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400 font-semibold">공급가액</label>
                          <div className="h-8 px-2 flex items-center justify-end bg-slate-950 border border-slate-800 rounded font-mono text-emerald-400 font-bold text-xs">
                            {formatErpNumber(rowSupply)}
                          </div>
                        </div>

                        <div className="col-span-1 flex items-center justify-center">
                          {soItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = soItems.filter((_, idx) => idx !== rIdx);
                                setSoItems(next);
                                syncSoItemsToTaxSpec(next);
                              }}
                              className="h-8 w-8 flex items-center justify-center rounded bg-rose-900/40 hover:bg-rose-900/70 text-rose-300 border border-rose-700/40"
                              title="제품 행 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 지게차 완제품 판매: 차대번호별 보증등록 & 부대 옵션 추가설치 */}
              {soSaleCategory === "FORKLIFT_SALE" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8] dark:bg-slate-900/70 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#0f172a] dark:text-slate-100">
                        차대번호 및 보증 조건 (출고 확정 시 보증대장 자동등록)
                      </span>
                      <button
                        type="button"
                        onClick={() => setSoChassisNumbers((prev) => [...prev, ""])}
                        className="px-2 py-1 rounded bg-[#f4efe4] hover:bg-[#e2dbcd] border border-[#b5a894] text-[11px] font-semibold text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                      >
                        + 차대번호 추가
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {soChassisNumbers.map((ch, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={ch}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSoChassisNumbers((prev) => prev.map((c, i) => (i === idx ? val : c)));
                            }}
                            placeholder={`차대번호 #${idx + 1} (예: FBC-2026-001)`}
                            className="flex-1 h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-mono text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                          {soChassisNumbers.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setSoChassisNumbers((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="h-8 px-2 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[11px]"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">보증기간 (개월)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={soWarrantyMonths}
                          onChange={(e) => setSoWarrantyMonths(formatErpInputNumber(e.target.value))}
                          className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          placeholder="12"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-[#334155] dark:text-slate-300">보증가동시간 (hr)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={soWarrantyHours}
                          onChange={(e) => setSoWarrantyHours(formatErpInputNumber(e.target.value))}
                          className="h-8 px-2.5 bg-[#f4efe4] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          placeholder="2,000"
                        />
                      </div>
                    </div>
                  </div>

                  <ForkliftOptionAttachPanel
                    mode="SALE"
                    options={soInstalledOptions}
                    onChange={(next) => {
                      setSoInstalledOptions(next);
                      syncSoItemsToTaxSpec(soItems, soDate, next);
                    }}
                    catalogOptions={tradeOptionCatalog}
                    title="부대 옵션 추가설치 (단가 + 설치공임)"
                  />
                </div>
              )}

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
    </>
  );
};

export interface EditSaleModalProps {
  editSoCustomer: string;
  editSoDate: string;
  editSoEntityType: "CORP" | "INDIVIDUAL";
  editSoFileInputRef: React.RefObject<HTMLInputElement | null>;
  editSoFileName: string;
  editSoQty: string;
  editSoSaleNo: string;
  editSoTaxSpec: BuyerTaxSpec;
  editSoUnitPrice: string;
  editSoVatAmount: string;
  handleSaleFileUpload: (file: File, isEdit?: boolean) => void;
  handleUpdateSale: (e: React.FormEvent) => Promise<void>;
  setEditSoCustomer: React.Dispatch<React.SetStateAction<string>>;
  setEditSoDate: React.Dispatch<React.SetStateAction<string>>;
  setEditSoEntityType: React.Dispatch<React.SetStateAction<"CORP" | "INDIVIDUAL">>;
  setEditSoQty: React.Dispatch<React.SetStateAction<string>>;
  setEditSoTaxSpec: React.Dispatch<React.SetStateAction<BuyerTaxSpec>>;
  setEditSoUnitPrice: React.Dispatch<React.SetStateAction<string>>;
  setEditSoVatAmount: React.Dispatch<React.SetStateAction<string>>;
  setShowEditSaleModal: React.Dispatch<React.SetStateAction<boolean>>;
  showEditSaleModal: boolean;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  editSoCustomer,
  editSoDate,
  editSoEntityType,
  editSoFileInputRef,
  editSoFileName,
  editSoQty,
  editSoSaleNo,
  editSoTaxSpec,
  editSoUnitPrice,
  editSoVatAmount,
  handleSaleFileUpload,
  handleUpdateSale,
  setEditSoCustomer,
  setEditSoDate,
  setEditSoEntityType,
  setEditSoQty,
  setEditSoTaxSpec,
  setEditSoUnitPrice,
  setEditSoVatAmount,
  setShowEditSaleModal,
  showEditSaleModal,
}) => {
  return (
    <>
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
    </>
  );
};

export interface AddBillingModalProps {
  applyTradeSaleTemplateToBilling: (s: any, dateStr: string) => void;
  blDate: string;
  blMilestoneName: string;
  blSaleId: string;
  blSupplyAmount: string;
  blTaxSpec: BuyerTaxSpec;
  blVatAmount: string;
  handleAddBilling: (e: React.FormEvent) => Promise<void>;
  sales: any[];
  setBlDate: React.Dispatch<React.SetStateAction<string>>;
  setBlMilestoneName: React.Dispatch<React.SetStateAction<string>>;
  setBlSaleId: React.Dispatch<React.SetStateAction<string>>;
  setBlSupplyAmount: React.Dispatch<React.SetStateAction<string>>;
  setBlTaxSpec: React.Dispatch<React.SetStateAction<BuyerTaxSpec>>;
  setBlVatAmount: React.Dispatch<React.SetStateAction<string>>;
  setShowAddBillingModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAddBillingModal: boolean;
  tradeSaleOptions: SearchSelectOption[];
}

export const AddBillingModal: React.FC<AddBillingModalProps> = ({
  applyTradeSaleTemplateToBilling,
  blDate,
  blMilestoneName,
  blSaleId,
  blSupplyAmount,
  blTaxSpec,
  blVatAmount,
  handleAddBilling,
  sales,
  setBlDate,
  setBlMilestoneName,
  setBlSaleId,
  setBlSupplyAmount,
  setBlTaxSpec,
  setBlVatAmount,
  setShowAddBillingModal,
  showAddBillingModal,
  tradeSaleOptions,
}) => {
  return (
    <>
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
                <div className="md:col-span-2">
                  <SearchSelectCombobox
                    label="대상 유통/판매 계약 선택"
                    required
                    clearable={false}
                    showChosungBar
                    size="sm"
                    value={blSaleId}
                    options={tradeSaleOptions}
                    placeholder="판매번호, 고객사, 품목 초성 검색 선택"
                    onChange={(val) => {
                      setBlSaleId(val);
                      const target = sales.find((s) => String(s.id) === val);
                      if (target) {
                        applyTradeSaleTemplateToBilling(target, blDate);
                      }
                    }}
                  />
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
    </>
  );
};
