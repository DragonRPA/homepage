"use client";

import React from "react";
import { DollarSign, Layers, ShieldCheck, X } from "lucide-react";
import { SearchSelectCombobox, type SearchSelectOption } from "../SearchSelectCombobox";
import { cleanErpNumber, formatErpInputNumber, toErpInputString } from "@/lib/erpFormat";
import { RENTAL_RATE_BASIS_OPTIONS, type RentalRateBasis, calculateAutoDailyRentalFee } from "@/lib/rentalFeeUtils";
import { ContractTaxInvoiceSection, type BuyerTaxSpec } from "../ContractTaxInvoiceSection";

export interface AcquireAssetModalProps {
  acqCost: string;
  acqDate: string;
  assetModelId: string;
  assetNo: string;
  assetQty: string;
  assets: any[];
  computeNextRentalAssetNo: (dateStr: string, assetList?: any[]) => string;
  handleAcquireAsset: (e: React.FormEvent) => Promise<void>;
  modelComboboxOptions: SearchSelectOption[];
  salvageValue: string;
  serialNo: string;
  setAcqCost: React.Dispatch<React.SetStateAction<string>>;
  setAcqDate: React.Dispatch<React.SetStateAction<string>>;
  setAssetModelId: React.Dispatch<React.SetStateAction<string>>;
  setAssetNo: React.Dispatch<React.SetStateAction<string>>;
  setAssetQty: React.Dispatch<React.SetStateAction<string>>;
  setSalvageValue: React.Dispatch<React.SetStateAction<string>>;
  setSerialNo: React.Dispatch<React.SetStateAction<string>>;
  setShowAcquireAssetModal: React.Dispatch<React.SetStateAction<boolean>>;
  setUsefulLife: React.Dispatch<React.SetStateAction<string>>;
  showAcquireAssetModal: boolean;
  usefulLife: string;
}

export const AcquireAssetModal: React.FC<AcquireAssetModalProps> = ({
  acqCost,
  acqDate,
  assetModelId,
  assetNo,
  assetQty,
  assets,
  computeNextRentalAssetNo,
  handleAcquireAsset,
  modelComboboxOptions,
  salvageValue,
  serialNo,
  setAcqCost,
  setAcqDate,
  setAssetModelId,
  setAssetNo,
  setAssetQty,
  setSalvageValue,
  setSerialNo,
  setShowAcquireAssetModal,
  setUsefulLife,
  showAcquireAssetModal,
  usefulLife,
}) => {
  return (
    <>
      {showAcquireAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] w-full text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>장비 구매 및 자산 취득 등록</span>
              </h3>
              <button onClick={() => setShowAcquireAssetModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAcquireAsset} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5 flex flex-col gap-1">
                  <label className="text-slate-400">시작 자산번호 (DR + yymm + 3자리)</label>
                  <input
                    type="text"
                    value={assetNo}
                    onChange={(e) => setAssetNo(e.target.value)}
                    placeholder="예: DR2610001"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-slate-400">취득 수량(대)</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={assetQty}
                    onChange={(e) => setAssetQty(e.target.value)}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono font-bold text-right dark:bg-slate-800 dark:border-slate-700 dark:text-emerald-400"
                    required
                  />
                </div>
                <div className="col-span-5 flex flex-col gap-1">
                  <SearchSelectCombobox
                    label="기종 모델"
                    required
                    size="sm"
                    options={modelComboboxOptions}
                    value={assetModelId}
                    onChange={(nextVal) => setAssetModelId(nextVal)}
                    placeholder="모델명·코드·초성 검색"
                    showChosungBar
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">시리얼 번호</label>
                  <input
                    type="text"
                    value={serialNo}
                    onChange={(e) => setSerialNo(e.target.value)}
                    placeholder="차대번호"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">취득일자</label>
                  <input
                    type="date"
                    value={acqDate}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      setAcqDate(nextDate);
                      setAssetNo(computeNextRentalAssetNo(nextDate, assets));
                    }}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 whitespace-nowrap">취득원가 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={acqCost}
                    onChange={(e) => setAcqCost(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="12,000,000"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 whitespace-nowrap">잔존가치 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={salvageValue}
                    onChange={(e) => setSalvageValue(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="1,200,000"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">내용연수(년)</label>
                  <input
                    type="number"
                    value={usefulLife}
                    onChange={(e) => setUsefulLife(e.target.value)}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAcquireAssetModal(false)}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded"
                >
                  자산 취득 확정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export interface AddModelModalProps {
  handleAddModel: (e: React.FormEvent) => Promise<void>;
  modelCode: string;
  modelDailyManual: boolean;
  modelDailyRate: string;
  modelMonthlyRate: string;
  modelName: string;
  modelSpec: string;
  setModelCode: React.Dispatch<React.SetStateAction<string>>;
  setModelDailyManual: React.Dispatch<React.SetStateAction<boolean>>;
  setModelDailyRate: React.Dispatch<React.SetStateAction<string>>;
  setModelMonthlyRate: React.Dispatch<React.SetStateAction<string>>;
  setModelName: React.Dispatch<React.SetStateAction<string>>;
  setModelSpec: React.Dispatch<React.SetStateAction<string>>;
  setShowAddModelModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAddModelModal: boolean;
}

export const AddModelModal: React.FC<AddModelModalProps> = ({
  handleAddModel,
  modelCode,
  modelDailyManual,
  modelDailyRate,
  modelMonthlyRate,
  modelName,
  modelSpec,
  setModelCode,
  setModelDailyManual,
  setModelDailyRate,
  setModelMonthlyRate,
  setModelName,
  setModelSpec,
  setShowAddModelModal,
  showAddModelModal,
}) => {
  return (
    <>
      {showAddModelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] w-full text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>임대 기종 모델 등록</span>
              </h3>
              <button onClick={() => setShowAddModelModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddModel} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">모델 코드</label>
                  <input
                    type="text"
                    value={modelCode}
                    onChange={(e) => setModelCode(e.target.value)}
                    placeholder="예: SJ3219"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">모델명</label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="예: 스카이잭 8m 배터리형"
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 whitespace-nowrap">기준 월임대료 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={modelMonthlyRate}
                    onChange={(e) => {
                      const formatted = formatErpInputNumber(e.target.value);
                      setModelMonthlyRate(formatted);
                      if (!modelDailyManual) {
                        setModelDailyRate(
                          toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(formatted)))
                        );
                      }
                    }}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="600,000"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-slate-400 whitespace-nowrap">기준 일단가 (원)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setModelDailyManual(false);
                        setModelDailyRate(
                          toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(modelMonthlyRate)))
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
                    value={modelDailyRate}
                    onChange={(e) => {
                      setModelDailyManual(true);
                      setModelDailyRate(formatErpInputNumber(e.target.value));
                    }}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="20,000"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">제원 사양</label>
                <input
                  type="text"
                  value={modelSpec}
                  onChange={(e) => setModelSpec(e.target.value)}
                  className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModelModal(false)}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded"
                >
                  모델 등록
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
  applyRentalContractTemplateToBilling: (ct: any, ymStr: string) => void;
  blContractId: string;
  blDailyRate: string;
  blDays: string;
  blEnd: string;
  blRateBasis: RentalRateBasis;
  blStart: string;
  blSupplyAmount: string;
  blTaxSpec: BuyerTaxSpec;
  blUseProRata: boolean;
  blVatAmount: string;
  blYm: string;
  contractComboboxOptions: SearchSelectOption[];
  contracts: any[];
  handleAddBilling: (e: React.FormEvent) => Promise<void>;
  recalcBillingAmounts: (params: { contract?: any; basis: RentalRateBasis; dailyRateStr: string; daysStr: string; useProRata: boolean; }) => void;
  setBlContractId: React.Dispatch<React.SetStateAction<string>>;
  setBlDailyRate: React.Dispatch<React.SetStateAction<string>>;
  setBlDays: React.Dispatch<React.SetStateAction<string>>;
  setBlEnd: React.Dispatch<React.SetStateAction<string>>;
  setBlRateBasis: React.Dispatch<React.SetStateAction<RentalRateBasis>>;
  setBlStart: React.Dispatch<React.SetStateAction<string>>;
  setBlSupplyAmount: React.Dispatch<React.SetStateAction<string>>;
  setBlTaxSpec: React.Dispatch<React.SetStateAction<BuyerTaxSpec>>;
  setBlUseProRata: React.Dispatch<React.SetStateAction<boolean>>;
  setBlVatAmount: React.Dispatch<React.SetStateAction<string>>;
  setBlYm: React.Dispatch<React.SetStateAction<string>>;
  setShowAddBillingModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAddBillingModal: boolean;
}

export const AddBillingModal: React.FC<AddBillingModalProps> = ({
  applyRentalContractTemplateToBilling,
  blContractId,
  blDailyRate,
  blDays,
  blEnd,
  blRateBasis,
  blStart,
  blSupplyAmount,
  blTaxSpec,
  blUseProRata,
  blVatAmount,
  blYm,
  contractComboboxOptions,
  contracts,
  handleAddBilling,
  recalcBillingAmounts,
  setBlContractId,
  setBlDailyRate,
  setBlDays,
  setBlEnd,
  setBlRateBasis,
  setBlStart,
  setBlSupplyAmount,
  setBlTaxSpec,
  setBlUseProRata,
  setBlVatAmount,
  setBlYm,
  setShowAddBillingModal,
  showAddBillingModal,
}) => {
  return (
    <>
      {showAddBillingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] w-full text-[#0f172a] max-w-4xl max-h-[92vh] overflow-y-auto rounded shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894]">
              <h3 className="font-bold text-sm text-[#0f172a] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                <span>일할 정산 청구서 생성 (헌장 4.1)</span>
              </h3>
              <button onClick={() => setShowAddBillingModal(false)} className="text-[#78716c] hover:text-[#0f172a]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBilling} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <SearchSelectCombobox
                    label="대상 임대계약 선택"
                    required
                    size="sm"
                    showChosungBar
                    options={contractComboboxOptions}
                    value={blContractId}
                    onChange={(cid) => {
                      setBlContractId(cid);
                      const ct = contracts.find((c) => String(c.id) === cid);
                      if (ct) {
                        applyRentalContractTemplateToBilling(ct, blYm);
                      }
                    }}
                    placeholder="계약번호·고객사·초성 검색"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[#57534e] font-bold whitespace-nowrap">정산 연월</label>
                    <input
                      type="month"
                      value={blYm}
                      onChange={(e) => {
                        const nextYm = e.target.value;
                        setBlYm(nextYm);
                        const ct = contracts.find((c) => String(c.id) === blContractId);
                        if (ct && nextYm) {
                          applyRentalContractTemplateToBilling(ct, nextYm);
                        }
                      }}
                      className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a]"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-1">
                      <label className="text-[#57534e] font-bold whitespace-nowrap">가동일수</label>
                      <label className="inline-flex items-center gap-1 cursor-pointer text-[10px] text-blue-700 whitespace-nowrap shrink-0">
                        <input
                          type="checkbox"
                          checked={blUseProRata}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setBlUseProRata(checked);
                            const ct = contracts.find((c) => String(c.id) === blContractId);
                            const nextBasis: RentalRateBasis =
                              checked && blRateBasis === "MONTHLY"
                                ? "DAILY_AUTO"
                                : !checked && (blRateBasis === "DAILY_MANUAL" || blRateBasis === "DAILY_AUTO")
                                ? "MONTHLY"
                                : blRateBasis;
                            if (nextBasis !== blRateBasis) {
                              setBlRateBasis(nextBasis);
                            }
                            if (ct || cleanErpNumber(blDailyRate) > 0) {
                              recalcBillingAmounts({
                                contract: ct,
                                basis: nextBasis,
                                dailyRateStr: blDailyRate,
                                daysStr: blDays,
                                useProRata: checked,
                              });
                            }
                          }}
                        />
                        <span>일할 적용</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={blDays}
                      onChange={(e) => {
                        const d = e.target.value;
                        setBlDays(d);
                        const ct = contracts.find((c) => String(c.id) === blContractId);
                        if (ct || cleanErpNumber(blDailyRate) > 0) {
                          recalcBillingAmounts({
                            contract: ct,
                            basis: blRateBasis,
                            dailyRateStr: blDailyRate,
                            daysStr: d,
                            useProRata: blUseProRata,
                          });
                        }
                      }}
                      className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a]"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[#57534e] font-bold whitespace-nowrap">정산 시작일</label>
                    <input
                      type="date"
                      value={blStart}
                      onChange={(e) => setBlStart(e.target.value)}
                      className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a]"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[#57534e] font-bold whitespace-nowrap">정산 종료일</label>
                    <input
                      type="date"
                      value={blEnd}
                      onChange={(e) => setBlEnd(e.target.value)}
                      className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#57534e] font-bold whitespace-nowrap">과금 기준 *</label>
                  <select
                    value={blRateBasis}
                    onChange={(e) => {
                      const nextBasis = e.target.value as RentalRateBasis;
                      const ct = contracts.find((c) => String(c.id) === blContractId);
                      const autoDailyStr = toErpInputString(
                        calculateAutoDailyRentalFee(Number(ct?.monthlyRate ?? 0))
                      );
                      const nextDailyStr =
                        nextBasis === "DAILY_AUTO" && ct ? autoDailyStr : blDailyRate;
                      const nextUseProRata =
                        nextBasis === "DAILY_MANUAL" || nextBasis === "DAILY_AUTO";
                      setBlRateBasis(nextBasis);
                      if (nextBasis === "DAILY_AUTO" && ct) {
                        setBlDailyRate(autoDailyStr);
                      }
                      setBlUseProRata(nextUseProRata);
                      if (ct || cleanErpNumber(nextDailyStr) > 0) {
                        recalcBillingAmounts({
                          contract: ct,
                          basis: nextBasis,
                          dailyRateStr: nextDailyStr,
                          daysStr: blDays,
                          useProRata: nextUseProRata,
                        });
                      }
                    }}
                    className="h-8 px-2 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-semibold"
                  >
                    {RENTAL_RATE_BASIS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-[#57534e] font-bold whitespace-nowrap">적용 일단가 (원)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const ct = contracts.find((c) => String(c.id) === blContractId);
                        const autoDailyStr = toErpInputString(
                          calculateAutoDailyRentalFee(Number(ct?.monthlyRate ?? 0))
                        );
                        setBlRateBasis("DAILY_AUTO");
                        setBlDailyRate(autoDailyStr);
                        setBlUseProRata(true);
                        if (ct) {
                          recalcBillingAmounts({
                            contract: ct,
                            basis: "DAILY_AUTO",
                            dailyRateStr: autoDailyStr,
                            daysStr: blDays,
                            useProRata: true,
                          });
                        }
                      }}
                      className="text-[10px] font-bold text-[#1d4ed8] hover:underline whitespace-nowrap shrink-0"
                    >
                      자동계산
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={blDailyRate}
                    onChange={(e) => {
                      const formatted = formatErpInputNumber(e.target.value);
                      const ct = contracts.find((c) => String(c.id) === blContractId);
                      setBlRateBasis("DAILY_MANUAL");
                      setBlDailyRate(formatted);
                      setBlUseProRata(true);
                      recalcBillingAmounts({
                        contract: ct,
                        basis: "DAILY_MANUAL",
                        dailyRateStr: formatted,
                        daysStr: blDays,
                        useProRata: true,
                      });
                    }}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[#57534e] font-bold whitespace-nowrap">청구 공급가액 (원) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={blSupplyAmount}
                    onChange={(e) => {
                      const formatted = formatErpInputNumber(e.target.value);
                      setBlSupplyAmount(formatted);
                      const num = cleanErpNumber(formatted);
                      setBlVatAmount(toErpInputString(Math.round(num * 0.1)));
                    }}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[#57534e] font-bold whitespace-nowrap">청구 세액 (VAT)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={blVatAmount}
                    onChange={(e) => setBlVatAmount(formatErpInputNumber(e.target.value))}
                    className="h-8 px-2.5 bg-[#ebe5d8] border border-[#b5a894] rounded text-[#0f172a] font-mono text-right font-bold"
                  />
                </div>
              </div>

              <ContractTaxInvoiceSection
                spec={blTaxSpec}
                onChange={setBlTaxSpec}
                hideBuyerFields={true}
                onTotalChange={(totalSupply, totalVat) => {
                  setBlSupplyAmount(toErpInputString(totalSupply));
                  setBlVatAmount(toErpInputString(totalVat));
                }}
                domainLabel="당월 임대 청구 품목"
              />

              <div className="flex justify-end gap-2 mt-1 pt-3 border-t border-[#b5a894]">
                <button
                  type="button"
                  onClick={() => setShowAddBillingModal(false)}
                  className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894]"
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
