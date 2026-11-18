"use client";

import React from "react";
import { DollarSign, X } from "lucide-react";
import { SearchSelectCombobox, type SearchSelectOption } from "../SearchSelectCombobox";
import { calculateServiceEmployeeMonthlyProRata, cleanErpNumber, formatErpCurrency, formatErpInputNumber, toErpInputString } from "@/lib/erpFormat";
import { type AssignedServiceEmployee } from "./serviceTypes";
import { ProRataFormulaGuideBox } from "./ServiceContractModals";
import { ContractTaxInvoiceSection, type BuyerTaxSpec } from "../ContractTaxInvoiceSection";

export interface AddBillingModalProps {
  activeType: "OPERATIONAL" | "DEVELOPMENT";
  applyServiceContractTemplateToBilling: (ct: any, dateStr: string, overrideIncludeOt?: boolean, overrideApplyProRata?: boolean) => Promise<void>;
  blApplyProRata: boolean;
  blContractId: string;
  blDate: string;
  blIncludeOtInBilling: boolean;
  blMilestoneName: string;
  blOtSummary: { loading: boolean; month: string; totalHours: number; totalOtPay: number; items: Array<{ employeeId: number; employeeName: string; hours: number; otPay: number; count: number; }>; };
  blSupplyAmount: string;
  blTaxSpec: BuyerTaxSpec;
  blVatAmount: string;
  contracts: any[];
  enrichAssignedEmployeeJoinDates: (list: AssignedServiceEmployee[]) => AssignedServiceEmployee[];
  handleAddBilling: (e: React.FormEvent) => Promise<void>;
  serviceContractOptions: SearchSelectOption[];
  setBlApplyProRata: React.Dispatch<React.SetStateAction<boolean>>;
  setBlContractId: React.Dispatch<React.SetStateAction<string>>;
  setBlDate: React.Dispatch<React.SetStateAction<string>>;
  setBlIncludeOtInBilling: React.Dispatch<React.SetStateAction<boolean>>;
  setBlMilestoneName: React.Dispatch<React.SetStateAction<string>>;
  setBlSupplyAmount: React.Dispatch<React.SetStateAction<string>>;
  setBlTaxSpec: React.Dispatch<React.SetStateAction<BuyerTaxSpec>>;
  setBlVatAmount: React.Dispatch<React.SetStateAction<string>>;
  setShowAddBillingModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAddBillingModal: boolean;
}

export const AddBillingModal: React.FC<AddBillingModalProps> = ({
  activeType,
  applyServiceContractTemplateToBilling,
  blApplyProRata,
  blContractId,
  blDate,
  blIncludeOtInBilling,
  blMilestoneName,
  blOtSummary,
  blSupplyAmount,
  blTaxSpec,
  blVatAmount,
  contracts,
  enrichAssignedEmployeeJoinDates,
  handleAddBilling,
  serviceContractOptions,
  setBlApplyProRata,
  setBlContractId,
  setBlDate,
  setBlIncludeOtInBilling,
  setBlMilestoneName,
  setBlSupplyAmount,
  setBlTaxSpec,
  setBlVatAmount,
  setShowAddBillingModal,
  showAddBillingModal,
}) => {
  return (
    <>
      {showAddBillingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-4xl w-full max-h-[92vh] overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">
                  {activeType === "OPERATIONAL" ? "정기 용역료 청구 생성" : "기성금 청구 생성"}
                </h3>
              </div>
              <button onClick={() => setShowAddBillingModal(false)} className="text-[#78716c] hover:text-[#1c1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBilling} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SearchSelectCombobox
                  label="대상 체결 계약 선택"
                  required
                  clearable={false}
                  showChosungBar
                  size="sm"
                  value={blContractId}
                  options={serviceContractOptions}
                  placeholder="계약번호, 고객사, 프로젝트명 초성 검색 선택"
                  onChange={(cid) => {
                    setBlContractId(cid);
                    const ct = contracts.find((c) => String(c.id) === cid);
                    if (ct) {
                      applyServiceContractTemplateToBilling(ct, blDate);
                    }
                  }}
                />

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">청구 구분 / 회차명 *</label>
                  <input
                    type="text"
                    value={blMilestoneName}
                    onChange={(e) => setBlMilestoneName(e.target.value)}
                    placeholder={activeType === "OPERATIONAL" ? "예: 2026-09 운영용역비 외" : "예: 1차 착수금 (30%)"}
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">청구일자 (작성일자) *</label>
                  <input
                    type="date"
                    value={blDate}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      setBlDate(nextDate);
                      const ct = contracts.find((c) => String(c.id) === blContractId);
                      if (ct && nextDate) {
                        applyServiceContractTemplateToBilling(ct, nextDate);
                      }
                    }}
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">공급가액 *</label>
                  <input
                    type="text"
                    value={blSupplyAmount}
                    onChange={(e) => {
                      const formatted = formatErpInputNumber(e.target.value);
                      setBlSupplyAmount(formatted);
                      const num = cleanErpNumber(formatted);
                      setBlVatAmount(toErpInputString(Math.round(num * 0.1)));
                    }}
                    placeholder="예: 20,424,877"
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">세액 (VAT)</label>
                  <input
                    type="text"
                    value={blVatAmount}
                    onChange={(e) => setBlVatAmount(formatErpInputNumber(e.target.value))}
                    placeholder="예: 2,042,487"
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right"
                  />
                </div>
              </div>

              {/* 투입인원 월 용역료 및 중도입사 일할계산 / 초과근무수당 자동합산 반영 섹션 */}
              {blContractId && (
                <div className="flex flex-col gap-2">
                  {(() => {
                    const selectedCt = contracts.find((c) => String(c.id) === blContractId);
                    const assignedList: AssignedServiceEmployee[] = enrichAssignedEmployeeJoinDates(
                      Array.isArray(selectedCt?.assignedEmployees) ? selectedCt.assignedEmployees : []
                    );
                    if (assignedList.length === 0) return null;
                    const targetYm = (blDate || new Date().toISOString().slice(0, 10)).slice(0, 7);
                    const details = assignedList.map((emp) => ({
                      emp,
                      calc: calculateServiceEmployeeMonthlyProRata(
                        emp.contractRate,
                        targetYm,
                        emp.joinDate,
                        emp.leaveDate,
                        blApplyProRata && emp.proRataEnabled !== false,
                        true
                      ),
                    }));
                    const baseSum = assignedList.reduce((s, e) => s + (Number(e.contractRate) || 0), 0);
                    const effSum = details.reduce((s, d) => s + d.calc.effectiveAmount, 0);

                    return (
                      <div className="p-3 rounded border border-amber-400 bg-[#ebe5d8] flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="inline-flex items-center gap-2 font-bold text-xs text-amber-950 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={blApplyProRata}
                              onChange={(e) => {
                                const nextVal = e.target.checked;
                                if (selectedCt) {
                                  applyServiceContractTemplateToBilling(
                                    selectedCt,
                                    blDate,
                                    blIncludeOtInBilling,
                                    nextVal
                                  );
                                } else {
                                  setBlApplyProRata(nextVal);
                                }
                              }}
                              className="w-4 h-4 accent-amber-700"
                            />
                            <span>
                              투입인원 입퇴사 일할계산 반영 ({targetYm})
                            </span>
                          </label>
                          <div className="text-xs font-mono font-bold text-[#1c1917]">
                            월 기본합계: {formatErpCurrency(baseSum)} ➔{" "}
                            <span className="text-amber-900 font-extrabold">
                              당월 적용합계: {formatErpCurrency(blApplyProRata ? effSum : baseSum)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#b5a894] text-[11px]">
                          {details.map(({ emp, calc }) => {
                            const periodLabel =
                              emp.joinDate || emp.leaveDate
                                ? `${emp.joinDate || "-"} ~ ${emp.leaveDate || "재직"}`
                                : "입사일미상";
                            return (
                              <span
                                key={emp.employeeId}
                                title={calc.formulaLabel}
                                className={`px-2 py-0.5 rounded border font-mono ${
                                  calc.isProRated
                                    ? "bg-amber-50 border-amber-400 text-amber-950 font-bold"
                                    : "bg-[#f4efe4] border-[#b5a894] text-[#1c1917]"
                                }`}
                              >
                                <strong>{emp.name}</strong> ({periodLabel}):{" "}
                                {calc.shortBadge} ➔ {formatErpCurrency(calc.effectiveAmount)}
                              </span>
                            );
                          })}
                        </div>
                        <ProRataFormulaGuideBox
                          targetMonth={targetYm}
                          employeesList={assignedList}
                          calcs={details.map((d) => d.calc)}
                          applyProRata={blApplyProRata}
                        />
                      </div>
                    );
                  })()}

                  <div className="p-3 rounded border border-indigo-300 bg-[#ebe5d8] flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 font-bold text-xs text-indigo-900 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={blIncludeOtInBilling}
                          onChange={(e) => {
                            const nextVal = e.target.checked;
                            const ct = contracts.find((c) => String(c.id) === blContractId);
                            if (ct) {
                              applyServiceContractTemplateToBilling(ct, blDate, nextVal);
                            } else {
                              setBlIncludeOtInBilling(nextVal);
                            }
                          }}
                          className="w-4 h-4 accent-indigo-700"
                        />
                        <span>
                          초과근무수당 청구 반영 ({blOtSummary.month || blDate.slice(0, 7)} 투입인원 초과근무수당 자동합산)
                        </span>
                      </label>
                      <div className="text-xs font-mono font-bold text-indigo-900">
                        합산 초과근무: {blOtSummary.totalHours}시간 | 합산 수당액:{" "}
                        <span className="text-blue-800">{formatErpCurrency(blOtSummary.totalOtPay)}</span>
                      </div>
                    </div>
                    {blOtSummary.items.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#b5a894] text-[11px]">
                        {blOtSummary.items.map((it) => (
                          <span
                            key={it.employeeId}
                            className="px-2 py-0.5 rounded bg-[#f4efe4] border border-[#b5a894] font-mono text-[#1c1917]"
                          >
                            <strong>{it.employeeName}</strong>: {it.hours}h ({formatErpCurrency(it.otPay)})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 청구별 세금계산서 다중 품목 명세 (예: 운영용역비 + 초과근무 + 퇴직금 + 연차수당) */}
              <ContractTaxInvoiceSection
                spec={blTaxSpec}
                onChange={setBlTaxSpec}
                hideBuyerFields={true}
                onTotalChange={(totalSupply, totalVat) => {
                  setBlSupplyAmount(toErpInputString(totalSupply));
                  setBlVatAmount(toErpInputString(totalVat));
                }}
                domainLabel="당월 청구 품목"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#b5a894] mt-1">
                <button
                  type="button"
                  onClick={() => setShowAddBillingModal(false)}
                  className="h-8 px-3 rounded font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm"
                >
                  청구 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
