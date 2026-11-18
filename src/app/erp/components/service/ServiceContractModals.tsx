"use client";

import React from "react";
import { Briefcase, Edit, FileUp, Trash2, UserPlus, Users, X } from "lucide-react";
import { SearchSelectCombobox, type SearchSelectOption } from "../SearchSelectCombobox";
import {
  calculateServiceEmployeeMonthlyProRata,
  type ServiceEmployeeProRataResult,
  cleanErpNumber,
  formatErpCurrency,
  formatErpInputNumber,
  toErpInputString,
} from "@/lib/erpFormat";
import { type AssignedServiceEmployee } from "./serviceTypes";
import { ContractTaxInvoiceSection, extractPartnerTaxSpec, type BuyerTaxSpec } from "../ContractTaxInvoiceSection";

interface ProRataFormulaGuideBoxProps {
  targetMonth: string;
  employeesList: AssignedServiceEmployee[];
  calcs: ServiceEmployeeProRataResult[];
  applyProRata: boolean;
}

export const ProRataFormulaGuideBox: React.FC<ProRataFormulaGuideBoxProps> = ({
  targetMonth,
  employeesList,
  calcs,
  applyProRata,
}) => {
  const targets = employeesList
    .map((emp, idx) => ({ emp, calc: calcs[idx] }))
    .filter(({ calc }) => calc && calc.isProRated && !calc.isAfterLeft && !calc.isNotYetJoined)
    .sort((a, b) => {
      const aLeft = a.emp.leaveDate ? 0 : 1;
      const bLeft = b.emp.leaveDate ? 0 : 1;
      return aLeft - bLeft;
    });

  return (
    <div className="border border-amber-400/90 bg-[#f4efe4] rounded px-2.5 py-1.5 text-[11px] flex flex-col justify-center gap-1">
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-amber-300/70 pb-1">
        <span className="font-bold text-amber-950 whitespace-nowrap">
          단기·중도퇴사 정산 산식 (209h · 소수점 반올림)
        </span>
        <span className="font-mono text-[10.5px] font-bold text-[#1c1917] whitespace-nowrap">
          산식: round(월기준액 × [(재직평일 + 유급주휴) × 8h] ÷ 209h)
        </span>
      </div>
      <div className="text-[10.5px] text-[#57534e] font-mono">
        주휴기준: 연속 7일 재직 시 7일마다 +1일(8h) · 7일 미만 구간 0일(미대상)
      </div>
      {!applyProRata ? (
        <div className="text-[10.5px] font-mono text-[#78716c]">
          상태: 일할계산 미적용 (만근 기준 합산)
        </div>
      ) : targets.length === 0 ? (
        <div className="text-[10.5px] font-mono text-[#78716c]">
          당월({targetMonth}) 단기·중도퇴사 일할 대상 없음
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {targets.map(({ emp, calc }) => {
            const joinLabel = emp.joinDate ? emp.joinDate.slice(5).replace("-", "/") : "-";
            const leaveLabel = emp.leaveDate ? emp.leaveDate.slice(5).replace("-", "/") : "재직";
            const tenureText =
              calc.totalTenureDays !== null ? `총${calc.totalTenureDays}일` : `${calc.activeDays}일`;
            const holidayStatus = calc.weeklyHolidayEligible ? "주휴대상" : "주휴미대상";
            const baseSalNum = Math.round(Number(emp.baseSalary || 0));
            const baseSalCalc =
              baseSalNum > 0
                ? calculateServiceEmployeeMonthlyProRata(
                    baseSalNum,
                    targetMonth,
                    emp.joinDate,
                    emp.leaveDate,
                    true,
                    true
                  )
                : null;
            return (
              <div
                key={emp.employeeId}
                className="pt-1 border-t border-amber-300/60 flex flex-col gap-0.5 font-mono text-[10.5px]"
              >
                <div className="flex flex-wrap items-center gap-1 text-[#1c1917]">
                  <strong className="font-sans text-amber-950">{emp.name}</strong>
                  <span>
                    ({joinLabel}~{leaveLabel} · {tenureText} ➔ 평일{calc.workWeekdays}일 + 주휴
                    {calc.paidWeeklyHolidayDays}일[{holidayStatus}] = {calc.paidHours}h)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[#1c1917]">
                  <span>
                    청구 용역료: round({calc.baseRate.toLocaleString()} × {calc.paidHours} ÷ 209) ={" "}
                    <strong className="text-blue-900">{formatErpCurrency(calc.effectiveAmount)}</strong>
                  </span>
                  {baseSalCalc && (
                    <span>
                      {emp.leaveDate ? "퇴사자 기본급" : "기본급"}: round({baseSalNum.toLocaleString()} ×{" "}
                      {baseSalCalc.paidHours} ÷ 209) ={" "}
                      <strong className="text-emerald-900">
                        {formatErpCurrency(baseSalCalc.effectiveAmount)}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export interface AddContractModalProps {
  activeType: "OPERATIONAL" | "DEVELOPMENT";
  ctAmount: string;
  ctApplyProRata: boolean;
  ctAssignedEmployees: AssignedServiceEmployee[];
  ctBillingDay: string;
  ctCustomer: string;
  ctEnd: string;
  ctEntityType: "CORP" | "INDIVIDUAL";
  ctFileInputRef: React.RefObject<HTMLInputElement | null>;
  ctFileName: string;
  ctIncludeOtInBilling: boolean;
  ctMemo: string;
  ctMonthlyFee: string;
  ctOtBreakdown: { month: string; totalHours: number; totalOtPay: number; byEmp: Record<number, { hours: number; otPay: number; count: number; }>; };
  ctPartnerId: number | null;
  ctProRataMonth: string;
  ctProject: string;
  ctSelectedEmpId: string;
  ctStart: string;
  ctTaxSpec: BuyerTaxSpec;
  ctVatAmount: string;
  employees: any[];
  enrichAssignedEmployeeJoinDates: (list: AssignedServiceEmployee[]) => AssignedServiceEmployee[];
  handleAddContract: (e: React.FormEvent) => Promise<void>;
  handleContractFileUpload: (file: File) => void;
  handleSelectPartner: (p: any) => void;
  isCtFileDragging: boolean;
  partners: any[];
  servicePartnerOptions: SearchSelectOption[];
  setCtAmount: React.Dispatch<React.SetStateAction<string>>;
  setCtApplyProRata: React.Dispatch<React.SetStateAction<boolean>>;
  setCtAssignedEmployees: React.Dispatch<React.SetStateAction<AssignedServiceEmployee[]>>;
  setCtBillingDay: React.Dispatch<React.SetStateAction<string>>;
  setCtCustomer: React.Dispatch<React.SetStateAction<string>>;
  setCtEnd: React.Dispatch<React.SetStateAction<string>>;
  setCtEntityType: React.Dispatch<React.SetStateAction<"CORP" | "INDIVIDUAL">>;
  setCtFileName: React.Dispatch<React.SetStateAction<string>>;
  setCtFileUrl: React.Dispatch<React.SetStateAction<string>>;
  setCtIncludeOtInBilling: React.Dispatch<React.SetStateAction<boolean>>;
  setCtMemo: React.Dispatch<React.SetStateAction<string>>;
  setCtMonthlyFee: React.Dispatch<React.SetStateAction<string>>;
  setCtPartnerId: React.Dispatch<React.SetStateAction<number | null>>;
  setCtProRataMonth: React.Dispatch<React.SetStateAction<string>>;
  setCtProject: React.Dispatch<React.SetStateAction<string>>;
  setCtSelectedEmpId: React.Dispatch<React.SetStateAction<string>>;
  setCtStart: React.Dispatch<React.SetStateAction<string>>;
  setCtTaxSpec: React.Dispatch<React.SetStateAction<BuyerTaxSpec>>;
  setCtVatAmount: React.Dispatch<React.SetStateAction<string>>;
  setIsCtFileDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAddContractModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAddContractModal: boolean;
  showToast: (text: string, type?: "success" | "error") => void;
  syncAssignedEmployeesToContract: (rawList: AssignedServiceEmployee[], isEdit: boolean, overrideIncludeOt?: boolean, overrideApplyProRata?: boolean, overrideTargetMonth?: string) => Promise<void>;
}

export const AddContractModal: React.FC<AddContractModalProps> = ({
  activeType,
  ctAmount,
  ctApplyProRata,
  ctAssignedEmployees,
  ctBillingDay,
  ctCustomer,
  ctEnd,
  ctEntityType,
  ctFileInputRef,
  ctFileName,
  ctIncludeOtInBilling,
  ctMemo,
  ctMonthlyFee,
  ctOtBreakdown,
  ctPartnerId,
  ctProRataMonth,
  ctProject,
  ctSelectedEmpId,
  ctStart,
  ctTaxSpec,
  ctVatAmount,
  employees,
  enrichAssignedEmployeeJoinDates,
  handleAddContract,
  handleContractFileUpload,
  handleSelectPartner,
  isCtFileDragging,
  partners,
  servicePartnerOptions,
  setCtAmount,
  setCtApplyProRata,
  setCtAssignedEmployees,
  setCtBillingDay,
  setCtCustomer,
  setCtEnd,
  setCtEntityType,
  setCtFileName,
  setCtFileUrl,
  setCtIncludeOtInBilling,
  setCtMemo,
  setCtMonthlyFee,
  setCtPartnerId,
  setCtProRataMonth,
  setCtProject,
  setCtSelectedEmpId,
  setCtStart,
  setCtTaxSpec,
  setCtVatAmount,
  setIsCtFileDragging,
  setShowAddContractModal,
  showAddContractModal,
  showToast,
  syncAssignedEmployeesToContract,
}) => {
  return (
    <>
      {showAddContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-5xl w-full max-h-[92vh] overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">
                  신규 {activeType === "OPERATIONAL" ? "운영용역" : "개발용역"} 계약 등록
                </h3>
              </div>
              <button onClick={() => setShowAddContractModal(false)} className="text-[#78716c] hover:text-[#1c1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContract} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 귀속 사업자</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCtEntityType("CORP")}
                      className={`p-2 rounded border text-left font-bold transition ${
                        ctEntityType === "CORP"
                          ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                          : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                      }`}
                    >
                      <div>(주)드래곤알피에이 [법인]</div>
                      <div className="text-[10px] font-normal font-mono opacity-80">806-88-03266</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCtEntityType("INDIVIDUAL")}
                      className={`p-2 rounded border text-left font-bold transition ${
                        ctEntityType === "INDIVIDUAL"
                          ? "border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500"
                          : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                      }`}
                    >
                      <div>드래곤알피에이 [개인]</div>
                      <div className="text-[10px] font-normal font-mono opacity-80">295-03-02683</div>
                    </button>
                  </div>
                </div>

                <SearchSelectCombobox
                  label="고객사 (등록 매출처 조회)"
                  required
                  allowFreeText
                  showChosungBar
                  size="sm"
                  headerRight={
                    ctPartnerId ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                        거래처 제원 연동됨
                      </span>
                    ) : undefined
                  }
                  value={ctPartnerId ? String(ctPartnerId) : ""}
                  freeTextValue={ctCustomer}
                  onFreeTextChange={(txt) => {
                    setCtCustomer(txt);
                    setCtPartnerId((prevId) => {
                      const cur = partners.find((p) => p.id === prevId);
                      return cur && cur.name === txt ? prevId : null;
                    });
                  }}
                  onChange={(val) => {
                    if (!val) {
                      setCtPartnerId(null);
                      setCtCustomer("");
                      return;
                    }
                    const found = partners.find((p) => String(p.id) === val);
                    if (found) handleSelectPartner(found);
                  }}
                  options={servicePartnerOptions}
                  placeholder="등록 고객사명, 사업자번호 초성 검색 또는 직접 입력"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-bold text-[#78716c]">용역 / 프로젝트명 *</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const base = (ctProject || "용역")
                            .replace(/\{yyyy\}년\s*\{mm\}월\s*/gi, "")
                            .replace(/\s*\{yymm\}/gi, "")
                            .replace(/\s*\{yyyy-mm\}/gi, "")
                            .trim();
                          const nextTpl = `{yyyy}년 {mm}월 ${base.endsWith("료") || base.endsWith("비") ? base : `${base}료`}`;
                          setCtTaxSpec((prev) => ({
                            ...prev,
                            taxMemo: nextTpl,
                            taxItems: prev.taxItems.map((it, idx) =>
                              idx === 0 ? { ...it, itemName: nextTpl } : it
                            ),
                          }));
                        }}
                        className="px-1.5 py-0.5 rounded border border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-900 font-mono font-bold text-[10px]"
                        title="세금계산서 상단 비고 및 1번째 품목에 '{yyyy}년 {mm}월 ...료' 치환식 적용"
                      >
                        &#123;yyyy&#125;년 &#123;mm&#125;월
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = ctProject
                            ? `${ctProject.replace(/\s*\{yymm\}/gi, "")} {yymm}`.trim()
                            : "용역료 {yymm}";
                          setCtProject(next);
                          setCtTaxSpec((prev) => ({
                            ...prev,
                            taxMemo: next,
                            taxItems: prev.taxItems.map((it, idx) =>
                              idx === 0 ? { ...it, itemName: next } : it
                            ),
                          }));
                        }}
                        className="px-1.5 py-0.5 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-mono font-bold text-[10px]"
                        title="청구 생성 시 연월(예: 2610)로 자동 치환"
                      >
                        + &#123;yymm&#125;
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = ctProject
                            ? `${ctProject.replace(/\s*\{yyyy-mm\}/gi, "")} {yyyy-mm}`.trim()
                            : "용역료 {yyyy-mm}";
                          setCtProject(next);
                          setCtTaxSpec((prev) => ({
                            ...prev,
                            taxMemo: next,
                            taxItems: prev.taxItems.map((it, idx) =>
                              idx === 0 ? { ...it, itemName: next } : it
                            ),
                          }));
                        }}
                        className="px-1.5 py-0.5 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-mono font-bold text-[10px]"
                        title="청구 생성 시 연-월(예: 2026-10)로 자동 치환"
                      >
                        + &#123;yyyy-mm&#125;
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={ctProject}
                    onChange={(e) => {
                      const val = e.target.value;
                      const prevVal = ctProject;
                      const prevAuto = prevVal
                        ? `{yyyy}년 {mm}월 ${prevVal.endsWith("료") || prevVal.endsWith("비") ? prevVal : `${prevVal}료`}`
                        : "";
                      const nextAuto = val
                        ? /\{[^}]+\}/.test(val)
                          ? val
                          : `{yyyy}년 {mm}월 ${val.endsWith("료") || val.endsWith("비") ? val : `${val}료`}`
                        : "{yyyy}년 {mm}월 용역료";
                      setCtProject(val);
                      setCtTaxSpec((prev) => ({
                        ...prev,
                        taxMemo:
                          !prev.taxMemo ||
                          prev.taxMemo === "{yyyy}년 {mm}월 용역료" ||
                          prev.taxMemo === "용역료 {yymm}" ||
                          prev.taxMemo === "정기 유지보수 용역" ||
                          prev.taxMemo === prevVal ||
                          prev.taxMemo === prevAuto
                            ? nextAuto
                            : prev.taxMemo,
                        taxItems: prev.taxItems.map((it, idx) =>
                          idx === 0 &&
                          (!it.itemName ||
                            it.itemName === "{yyyy}년 {mm}월 용역료" ||
                            it.itemName === "용역료 {yymm}" ||
                            it.itemName === "정기 유지보수 용역" ||
                            it.itemName === prevVal ||
                            it.itemName === prevAuto)
                            ? { ...it, itemName: nextAuto }
                            : it
                        ),
                      }));
                    }}
                    placeholder="예: RPA 유지보수 (입력 시 세금계산서에 '{yyyy}년 {mm}월 RPA 유지보수료' 치환식 자동 생성)"
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-semibold"
                  />
                </div>

                {activeType === "OPERATIONAL" ? (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#78716c]">월 정기 용역료 (공급가액)</label>
                    <input
                      type="text"
                      value={ctMonthlyFee}
                      onChange={(e) => {
                        const formatted = formatErpInputNumber(e.target.value);
                        setCtMonthlyFee(formatted);
                        const num = cleanErpNumber(formatted);
                        const vat = Math.round(num * 0.1);
                        setCtVatAmount(toErpInputString(vat));
                        setCtTaxSpec((prev) => ({
                          ...prev,
                          taxItems: prev.taxItems.map((it, idx) =>
                            idx === 0
                              ? {
                                  ...it,
                                  unitCost: Math.round(num / (Number(it.qty) || 1)),
                                  supplyAmount: num,
                                  vatAmount: vat,
                                }
                              : it
                          ),
                        }));
                      }}
                      placeholder="예: 300,000"
                      required
                      className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right font-bold"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#78716c]">총 수주 계약금 (공급가액)</label>
                    <input
                      type="text"
                      value={ctAmount}
                      onChange={(e) => {
                        const formatted = formatErpInputNumber(e.target.value);
                        setCtAmount(formatted);
                        const num = cleanErpNumber(formatted);
                        const vat = Math.round(num * 0.1);
                        setCtVatAmount(toErpInputString(vat));
                        setCtTaxSpec((prev) => ({
                          ...prev,
                          taxItems: prev.taxItems.map((it, idx) =>
                            idx === 0
                              ? {
                                  ...it,
                                  unitCost: Math.round(num / (Number(it.qty) || 1)),
                                  supplyAmount: num,
                                  vatAmount: vat,
                                }
                              : it
                          ),
                        }));
                      }}
                      placeholder="예: 10,000,000"
                      required
                      className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right font-bold"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">세액 (VAT)</label>
                  <input
                    type="text"
                    value={ctVatAmount}
                    onChange={(e) => setCtVatAmount(formatErpInputNumber(e.target.value))}
                    placeholder="예: 100,000"
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">정기 청구일 (매월)</label>
                  <select
                    value={ctBillingDay}
                    onChange={(e) => setCtBillingDay(e.target.value)}
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  >
                    <option value="5">매월 5일</option>
                    <option value="10">매월 10일</option>
                    <option value="15">매월 15일</option>
                    <option value="20">매월 20일</option>
                    <option value="25">매월 25일</option>
                    <option value="31">매월 말일</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 시작일 *</label>
                  <input
                    type="date"
                    value={ctStart}
                    onChange={(e) => setCtStart(e.target.value)}
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 종료일 *</label>
                  <input
                    type="date"
                    value={ctEnd}
                    onChange={(e) => setCtEnd(e.target.value)}
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 특약 메모</label>
                  <input
                    type="text"
                    value={ctMemo}
                    onChange={(e) => setCtMemo(e.target.value)}
                    placeholder="특약 또는 메모"
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
              </div>

              {/* 운영용역 투입 임직원 및 직원별 계약금액(받는금액) 구성 섹션 */}
              <div className="p-3 rounded border border-blue-300 bg-[#ebe5d8] flex flex-col gap-2">
                {(() => {
                  const enrichedAddList = enrichAssignedEmployeeJoinDates(ctAssignedEmployees);
                  const baseRateSum = enrichedAddList.reduce((s, e) => s + (Number(e.contractRate) || 0), 0);
                  const proRataCalcs = enrichedAddList.map((e) =>
                    calculateServiceEmployeeMonthlyProRata(
                      e.contractRate,
                      ctProRataMonth,
                      e.joinDate,
                      e.leaveDate,
                      ctApplyProRata && e.proRataEnabled !== false,
                      true
                    )
                  );
                  const proRatedSum = proRataCalcs.reduce((s, c) => s + c.effectiveAmount, 0);
                  const hasProRatedDiff = ctApplyProRata && proRatedSum !== baseRateSum;

                  return (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#b5a894] pb-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Users className="w-4 h-4 text-blue-800" />
                          <span className="font-bold text-xs text-[#1c1917]">
                            투입 임직원 및 직원별 월 계약금액(받는금액) 편성
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 font-bold text-[10px]">
                            총 {enrichedAddList.length}명 | 기본 합계 {formatErpCurrency(baseRateSum)}
                            {hasProRatedDiff && (
                              <span className="ml-1 text-amber-900 font-extrabold">
                                ➔ 일할반영({ctProRataMonth}) {formatErpCurrency(proRatedSum)}
                              </span>
                            )}
                            {ctIncludeOtInBilling && (
                              <span className="ml-1 text-indigo-800">
                                + 초과근무수당 {formatErpCurrency(ctOtBreakdown.totalOtPay)}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-stretch border-b border-[#b5a894] pb-2.5">
                        <div className="lg:col-span-5 flex flex-col justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-amber-400 bg-amber-50 text-amber-950 font-bold text-[11px]">
                              <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={ctApplyProRata}
                                  onChange={(e) => {
                                    const nextVal = e.target.checked;
                                    setCtApplyProRata(nextVal);
                                    syncAssignedEmployeesToContract(
                                      ctAssignedEmployees,
                                      false,
                                      undefined,
                                      nextVal,
                                      ctProRataMonth
                                    );
                                  }}
                                  className="w-3.5 h-3.5 accent-amber-700"
                                />
                                <span>입퇴사 일할계산 반영</span>
                              </label>
                              <input
                                type="month"
                                value={ctProRataMonth}
                                onChange={(e) => {
                                  const nextMonth = e.target.value;
                                  if (!nextMonth) return;
                                  setCtProRataMonth(nextMonth);
                                  syncAssignedEmployeesToContract(
                                    ctAssignedEmployees,
                                    false,
                                    undefined,
                                    ctApplyProRata,
                                    nextMonth
                                  );
                                }}
                                className="h-5 px-1 rounded border border-amber-400 bg-white text-[10px] font-mono text-amber-950"
                                title="일할계산 기준 연월"
                              />
                            </div>
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-indigo-300 bg-indigo-50 text-indigo-900 font-bold text-[11px] cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={ctIncludeOtInBilling}
                                onChange={(e) => {
                                  const nextVal = e.target.checked;
                                  setCtIncludeOtInBilling(nextVal);
                                  syncAssignedEmployeesToContract(ctAssignedEmployees, false, nextVal);
                                }}
                                className="w-3.5 h-3.5 accent-indigo-700"
                              />
                              <span>초과근무수당 반영</span>
                            </label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={ctSelectedEmpId}
                              onChange={(e) => setCtSelectedEmpId(e.target.value)}
                              className="h-7 flex-1 min-w-0 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[#1c1917] text-xs font-semibold"
                            >
                              <option value="">-- 투입할 임직원 선택 --</option>
                              {employees
                                .filter((emp) => !ctAssignedEmployees.some((a) => a.employeeId === emp.id))
                                .map((emp) => {
                                  const joinStr = emp.joinDate ? String(emp.joinDate).slice(0, 10) : "-";
                                  const leaveStr = emp.leaveDate ? String(emp.leaveDate).slice(0, 10) : "";
                                  return (
                                    <option key={emp.id} value={emp.id}>
                                      [{emp.employeeNo || `EMP-${emp.id}`}] {emp.name} ({emp.position || "사원"} / 입사 {joinStr}
                                      {leaveStr ? ` · 퇴사 ${leaveStr}` : ""})
                                    </option>
                                  );
                                })}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                if (!ctSelectedEmpId) {
                                  showToast("추가할 임직원을 선택하세요.", "error");
                                  return;
                                }
                                const emp = employees.find((x) => String(x.id) === String(ctSelectedEmpId));
                                if (!emp) return;
                                if (ctAssignedEmployees.some((x) => x.employeeId === emp.id)) {
                                  showToast("이미 추가된 임직원입니다.", "error");
                                  return;
                                }
                                const defaultRate =
                                  Number(emp.serviceContractAmount) > 0
                                    ? Number(emp.serviceContractAmount)
                                    : Number(emp.baseSalary) > 0
                                    ? Number(emp.baseSalary)
                                    : 3000000;
                                const nextList: AssignedServiceEmployee[] = [
                                  ...ctAssignedEmployees,
                                  {
                                    employeeId: emp.id,
                                    employeeNo: emp.employeeNo || "",
                                    name: emp.name,
                                    position: emp.position || "",
                                    department: emp.department || "",
                                    joinDate: emp.joinDate ? String(emp.joinDate).slice(0, 10) : "",
                                    leaveDate: emp.leaveDate ? String(emp.leaveDate).slice(0, 10) : "",
                                    baseSalary: Math.round(Number(emp.baseSalary || 0)),
                                    contractRate: defaultRate,
                                    proRataEnabled: true,
                                    note: "",
                                  },
                                ];
                                syncAssignedEmployeesToContract(nextList, false);
                                setCtSelectedEmpId("");
                              }}
                              className="h-7 px-2.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-sm shrink-0 whitespace-nowrap"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>임직원 투입 추가</span>
                            </button>
                          </div>
                        </div>
                        <div className="lg:col-span-7">
                          <ProRataFormulaGuideBox
                            targetMonth={ctProRataMonth}
                            employeesList={enrichedAddList}
                            calcs={proRataCalcs}
                            applyProRata={ctApplyProRata}
                          />
                        </div>
                      </div>

                      {enrichedAddList.length === 0 ? (
                        <div className="py-3 text-center text-[#78716c] text-[11px]">
                          상단에서 투입할 임직원을 선택하고 [임직원 투입 추가] 버튼을 누르면 직원별 계약단가(받는금액)가 합산되어 월 정기 용역료 및 세금계산서 품목에 자동 반영됩니다.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                            <thead className="bg-[#dfd7c7] text-[#44403c] border-b border-[#b5a894] font-bold">
                              <tr>
                                <th className="py-1.5 px-2 w-10 text-center">제외</th>
                                <th className="py-1.5 px-2">사번</th>
                                <th className="py-1.5 px-2">성명 / 직급</th>
                                <th className="py-1.5 px-2">입사일</th>
                                <th className="py-1.5 px-2">퇴사일</th>
                                <th className="py-1.5 px-2 text-right w-36">월 기준금액 (원)</th>
                                <th className="py-1.5 px-2 text-right w-48">당월 일할적용액 ({ctProRataMonth})</th>
                                <th className="py-1.5 px-2 text-right w-32">당월 초과근무수당</th>
                                <th className="py-1.5 px-2">업무/역할 비고</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#b5a894] bg-[#f4efe4]">
                              {enrichedAddList.map((row, idx) => {
                                const empOt = ctOtBreakdown.byEmp[row.employeeId] || { hours: 0, otPay: 0, count: 0 };
                                const prCalc = proRataCalcs[idx];
                                return (
                                  <tr key={row.employeeId} className={prCalc.isProRated ? "bg-amber-50/60" : ""}>
                                    <td className="py-1.5 px-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextList = ctAssignedEmployees.filter((_, i) => i !== idx);
                                          syncAssignedEmployeesToContract(nextList, false);
                                        }}
                                        className="p-1 text-rose-700 hover:bg-rose-100 rounded"
                                        title="투입 제외"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                    <td className="py-1.5 px-2 font-mono text-[#78716c]">{row.employeeNo || "-"}</td>
                                    <td className="py-1.5 px-2 font-bold text-[#1c1917]">
                                      {row.name}{" "}
                                      <span className="text-[10px] font-normal text-[#78716c]">
                                        ({row.position || "사원"})
                                      </span>
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <input
                                        type="date"
                                        value={row.joinDate || ""}
                                        onChange={(e) => {
                                          const nextJoin = e.target.value;
                                          const nextList = enrichedAddList.map((it, i) =>
                                            i === idx ? { ...it, joinDate: nextJoin } : it
                                          );
                                          syncAssignedEmployeesToContract(nextList, false);
                                        }}
                                        className="h-7 px-1.5 rounded border border-[#b5a894] bg-white font-mono text-[11px] text-[#1c1917]"
                                      />
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <input
                                        type="date"
                                        value={row.leaveDate || ""}
                                        onChange={(e) => {
                                          const nextLeave = e.target.value;
                                          const nextList = enrichedAddList.map((it, i) =>
                                            i === idx ? { ...it, leaveDate: nextLeave } : it
                                          );
                                          syncAssignedEmployeesToContract(nextList, false);
                                        }}
                                        className="h-7 px-1.5 rounded border border-[#b5a894] bg-white font-mono text-[11px] text-[#1c1917]"
                                      />
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <input
                                        type="text"
                                        value={toErpInputString(row.contractRate)}
                                        onChange={(e) => {
                                          const rate = cleanErpNumber(formatErpInputNumber(e.target.value));
                                          const nextList = enrichedAddList.map((it, i) =>
                                            i === idx ? { ...it, contractRate: rate } : it
                                          );
                                          syncAssignedEmployeesToContract(nextList, false);
                                        }}
                                        className="w-full h-7 px-2 rounded border border-[#b5a894] bg-white text-right font-mono font-bold text-blue-900"
                                      />
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <input
                                          type="checkbox"
                                          checked={row.proRataEnabled !== false}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            const nextList = enrichedAddList.map((it, i) =>
                                              i === idx ? { ...it, proRataEnabled: checked } : it
                                            );
                                            syncAssignedEmployeesToContract(nextList, false);
                                          }}
                                          className="w-3.5 h-3.5 accent-amber-700"
                                          title="입퇴사 일할계산 적용"
                                        />
                                        <span
                                          title={prCalc.formulaLabel}
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                            prCalc.isProRated
                                              ? "bg-amber-100 text-amber-900 border-amber-400"
                                              : "bg-[#ebe5d8] text-[#78716c] border-[#b5a894]"
                                          }`}
                                        >
                                          {prCalc.shortBadge}
                                        </span>
                                        <span
                                          className={
                                            prCalc.isProRated
                                              ? "font-extrabold text-amber-900"
                                              : "font-bold text-[#1c1917]"
                                          }
                                        >
                                          {formatErpCurrency(prCalc.effectiveAmount)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono">
                                      <span
                                        className={
                                          ctIncludeOtInBilling && empOt.otPay > 0
                                            ? "font-bold text-indigo-800"
                                            : "text-[#78716c]"
                                        }
                                      >
                                        {formatErpCurrency(empOt.otPay)}
                                      </span>
                                      <span className="ml-1 text-[10px] text-[#78716c]">({empOt.hours}h)</span>
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <input
                                        type="text"
                                        value={row.note}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setCtAssignedEmployees((prev) =>
                                            prev.map((it, i) => (i === idx ? { ...it, note: val } : it))
                                          );
                                        }}
                                        placeholder="담당 업무 또는 비고"
                                        className="w-full h-7 px-2 rounded border border-[#b5a894] bg-white text-[#1c1917]"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* 전자세금계산서 발행 제원 및 품목 명세 섹션 */}
              <ContractTaxInvoiceSection
                spec={ctTaxSpec}
                onChange={setCtTaxSpec}
                onTotalChange={(totalSupply, totalVat) => {
                  if (activeType === "OPERATIONAL") {
                    setCtMonthlyFee(toErpInputString(totalSupply));
                  } else {
                    setCtAmount(toErpInputString(totalSupply));
                  }
                  setCtVatAmount(toErpInputString(totalVat));
                }}
                domainLabel={activeType === "OPERATIONAL" ? "운영용역" : "개발용역"}
              />

              {/* 계약서 원본 첨부 */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">용역계약서 원본 첨부 (선택)</label>
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
                  <div className="flex items-center justify-between px-3 py-1.5 rounded bg-blue-50 border border-blue-300">
                    <span className="font-semibold text-blue-900 truncate">{ctFileName}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => ctFileInputRef.current?.click()}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ebe5d8] border border-[#b5a894]"
                      >
                        변경
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCtFileUrl("");
                          setCtFileName("");
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300"
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
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded border border-dashed cursor-pointer ${
                      isCtFileDragging ? "border-blue-600 bg-blue-50" : "border-[#b5a894] bg-[#ebe5d8]"
                    }`}
                  >
                    <FileUp className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-[#57534e] font-medium">계약서 파일(PDF, 이미지, 문서) 클릭 또는 드래그 첨부</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#b5a894] mt-1">
                <button
                  type="button"
                  onClick={() => setShowAddContractModal(false)}
                  className="h-8 px-3 rounded font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-sm"
                >
                  계약 체결 등록
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
  activeType: "OPERATIONAL" | "DEVELOPMENT";
  editCtAmount: string;
  editCtApplyProRata: boolean;
  editCtAssignedEmployees: AssignedServiceEmployee[];
  editCtBillingDay: string;
  editCtContractNo: string;
  editCtCustomer: string;
  editCtEnd: string;
  editCtEntityType: "CORP" | "INDIVIDUAL";
  editCtFileName: string;
  editCtIncludeOtInBilling: boolean;
  editCtMemo: string;
  editCtMonthlyFee: string;
  editCtOtBreakdown: { month: string; totalHours: number; totalOtPay: number; byEmp: Record<number, { hours: number; otPay: number; count: number; }>; };
  editCtPartnerId: number | null;
  editCtProRataMonth: string;
  editCtProject: string;
  editCtSelectedEmpId: string;
  editCtStart: string;
  editCtStatus: string;
  editCtTaxSpec: BuyerTaxSpec;
  editCtVatAmount: string;
  editFileInputRef: React.RefObject<HTMLInputElement | null>;
  employees: any[];
  enrichAssignedEmployeeJoinDates: (list: AssignedServiceEmployee[]) => AssignedServiceEmployee[];
  handleEditFileUpload: (file: File) => void;
  handleUpdateContract: (e: React.FormEvent) => Promise<void>;
  partners: any[];
  servicePartnerOptions: SearchSelectOption[];
  setEditCtAmount: React.Dispatch<React.SetStateAction<string>>;
  setEditCtApplyProRata: React.Dispatch<React.SetStateAction<boolean>>;
  setEditCtAssignedEmployees: React.Dispatch<React.SetStateAction<AssignedServiceEmployee[]>>;
  setEditCtBillingDay: React.Dispatch<React.SetStateAction<string>>;
  setEditCtCustomer: React.Dispatch<React.SetStateAction<string>>;
  setEditCtEnd: React.Dispatch<React.SetStateAction<string>>;
  setEditCtEntityType: React.Dispatch<React.SetStateAction<"CORP" | "INDIVIDUAL">>;
  setEditCtIncludeOtInBilling: React.Dispatch<React.SetStateAction<boolean>>;
  setEditCtMemo: React.Dispatch<React.SetStateAction<string>>;
  setEditCtMonthlyFee: React.Dispatch<React.SetStateAction<string>>;
  setEditCtPartnerId: React.Dispatch<React.SetStateAction<number | null>>;
  setEditCtProRataMonth: React.Dispatch<React.SetStateAction<string>>;
  setEditCtProject: React.Dispatch<React.SetStateAction<string>>;
  setEditCtSelectedEmpId: React.Dispatch<React.SetStateAction<string>>;
  setEditCtStart: React.Dispatch<React.SetStateAction<string>>;
  setEditCtStatus: React.Dispatch<React.SetStateAction<string>>;
  setEditCtTaxSpec: React.Dispatch<React.SetStateAction<BuyerTaxSpec>>;
  setEditCtVatAmount: React.Dispatch<React.SetStateAction<string>>;
  setShowEditContractModal: React.Dispatch<React.SetStateAction<boolean>>;
  showEditContractModal: boolean;
  showToast: (text: string, type?: "success" | "error") => void;
  syncAssignedEmployeesToContract: (rawList: AssignedServiceEmployee[], isEdit: boolean, overrideIncludeOt?: boolean, overrideApplyProRata?: boolean, overrideTargetMonth?: string) => Promise<void>;
}

export const EditContractModal: React.FC<EditContractModalProps> = ({
  activeType,
  editCtAmount,
  editCtApplyProRata,
  editCtAssignedEmployees,
  editCtBillingDay,
  editCtContractNo,
  editCtCustomer,
  editCtEnd,
  editCtEntityType,
  editCtFileName,
  editCtIncludeOtInBilling,
  editCtMemo,
  editCtMonthlyFee,
  editCtOtBreakdown,
  editCtPartnerId,
  editCtProRataMonth,
  editCtProject,
  editCtSelectedEmpId,
  editCtStart,
  editCtStatus,
  editCtTaxSpec,
  editCtVatAmount,
  editFileInputRef,
  employees,
  enrichAssignedEmployeeJoinDates,
  handleEditFileUpload,
  handleUpdateContract,
  partners,
  servicePartnerOptions,
  setEditCtAmount,
  setEditCtApplyProRata,
  setEditCtAssignedEmployees,
  setEditCtBillingDay,
  setEditCtCustomer,
  setEditCtEnd,
  setEditCtEntityType,
  setEditCtIncludeOtInBilling,
  setEditCtMemo,
  setEditCtMonthlyFee,
  setEditCtPartnerId,
  setEditCtProRataMonth,
  setEditCtProject,
  setEditCtSelectedEmpId,
  setEditCtStart,
  setEditCtStatus,
  setEditCtTaxSpec,
  setEditCtVatAmount,
  setShowEditContractModal,
  showEditContractModal,
  showToast,
  syncAssignedEmployeesToContract,
}) => {
  return (
    <>
      {showEditContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-5xl w-full max-h-[92vh] overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] mb-4">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">
                  용역 계약 정보 수정 [{editCtContractNo}]
                </h3>
              </div>
              <button onClick={() => setShowEditContractModal(false)} className="text-[#78716c] hover:text-[#1c1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateContract} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 귀속 사업자</label>
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

                <SearchSelectCombobox
                  label="고객사 (상호명)"
                  required
                  allowFreeText
                  showChosungBar
                  size="sm"
                  headerRight={
                    editCtPartnerId ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                        거래처 연동
                      </span>
                    ) : undefined
                  }
                  value={editCtPartnerId ? String(editCtPartnerId) : ""}
                  freeTextValue={editCtCustomer}
                  onFreeTextChange={(txt) => {
                    setEditCtCustomer(txt);
                    setEditCtPartnerId((prevId) => {
                      const cur = partners.find((p) => p.id === prevId);
                      return cur && cur.name === txt ? prevId : null;
                    });
                  }}
                  onChange={(val) => {
                    if (!val) {
                      setEditCtPartnerId(null);
                      setEditCtCustomer("");
                      return;
                    }
                    const pid = Number(val) || null;
                    setEditCtPartnerId(pid);
                    const found = partners.find((p) => p.id === pid);
                    if (found) {
                      setEditCtCustomer(found.name);
                      setEditCtTaxSpec((prev) => extractPartnerTaxSpec(found, prev));
                    }
                  }}
                  options={servicePartnerOptions}
                  placeholder="고객사명, 사업자번호 초성 검색 또는 직접 입력"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-bold text-[#78716c]">용역 / 프로젝트명 *</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const base = (editCtProject || "용역")
                            .replace(/\{yyyy\}년\s*\{mm\}월\s*/gi, "")
                            .replace(/\s*\{yymm\}/gi, "")
                            .replace(/\s*\{yyyy-mm\}/gi, "")
                            .trim();
                          const nextTpl = `{yyyy}년 {mm}월 ${base.endsWith("료") || base.endsWith("비") ? base : `${base}료`}`;
                          setEditCtTaxSpec((prev) => ({
                            ...prev,
                            taxMemo: nextTpl,
                            taxItems: prev.taxItems.map((it, idx) =>
                              idx === 0 ? { ...it, itemName: nextTpl } : it
                            ),
                          }));
                        }}
                        className="px-1.5 py-0.5 rounded border border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-900 font-mono font-bold text-[10px]"
                        title="세금계산서 상단 비고 및 1번째 품목에 '{yyyy}년 {mm}월 ...료' 치환식 적용"
                      >
                        &#123;yyyy&#125;년 &#123;mm&#125;월
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = editCtProject
                            ? `${editCtProject.replace(/\s*\{yymm\}/gi, "")} {yymm}`.trim()
                            : "용역료 {yymm}";
                          setEditCtProject(next);
                          setEditCtTaxSpec((prev) => ({
                            ...prev,
                            taxMemo: next,
                            taxItems: prev.taxItems.map((it, idx) =>
                              idx === 0 ? { ...it, itemName: next } : it
                            ),
                          }));
                        }}
                        className="px-1.5 py-0.5 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-mono font-bold text-[10px]"
                        title="청구 생성 시 연월(예: 2610)로 자동 치환"
                      >
                        + &#123;yymm&#125;
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = editCtProject
                            ? `${editCtProject.replace(/\s*\{yyyy-mm\}/gi, "")} {yyyy-mm}`.trim()
                            : "용역료 {yyyy-mm}";
                          setEditCtProject(next);
                          setEditCtTaxSpec((prev) => ({
                            ...prev,
                            taxMemo: next,
                            taxItems: prev.taxItems.map((it, idx) =>
                              idx === 0 ? { ...it, itemName: next } : it
                            ),
                          }));
                        }}
                        className="px-1.5 py-0.5 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-mono font-bold text-[10px]"
                        title="청구 생성 시 연-월(예: 2026-10)로 자동 치환"
                      >
                        + &#123;yyyy-mm&#125;
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={editCtProject}
                    onChange={(e) => {
                      const val = e.target.value;
                      const prevProject = editCtProject;
                      const prevAuto = prevProject
                        ? `{yyyy}년 {mm}월 ${prevProject.endsWith("료") || prevProject.endsWith("비") ? prevProject : `${prevProject}료`}`
                        : "";
                      const nextAuto = val
                        ? /\{[^}]+\}/.test(val)
                          ? val
                          : `{yyyy}년 {mm}월 ${val.endsWith("료") || val.endsWith("비") ? val : `${val}료`}`
                        : "{yyyy}년 {mm}월 용역료";
                      setEditCtProject(val);
                      setEditCtTaxSpec((prev) => ({
                        ...prev,
                        taxMemo:
                          !prev.taxMemo || prev.taxMemo === prevProject || prev.taxMemo === prevAuto
                            ? nextAuto
                            : prev.taxMemo,
                        taxItems: prev.taxItems.map((it, idx) =>
                          idx === 0 && (!it.itemName || it.itemName === prevProject || it.itemName === prevAuto)
                            ? { ...it, itemName: nextAuto }
                            : it
                        ),
                      }));
                    }}
                    placeholder="예: RPA 유지보수 (입력 시 세금계산서에 '{yyyy}년 {mm}월 RPA 유지보수료' 치환식 자동 생성)"
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-semibold"
                  />
                </div>

                {activeType === "OPERATIONAL" ? (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#78716c]">월 정기 용역료 (공급가액)</label>
                    <input
                      type="text"
                      value={editCtMonthlyFee}
                      onChange={(e) => {
                        const formatted = formatErpInputNumber(e.target.value);
                        setEditCtMonthlyFee(formatted);
                        const num = cleanErpNumber(formatted);
                        const vat = Math.round(num * 0.1);
                        setEditCtVatAmount(toErpInputString(vat));
                        setEditCtTaxSpec((prev) => ({
                          ...prev,
                          taxItems: prev.taxItems.map((it, idx) =>
                            idx === 0
                              ? {
                                  ...it,
                                  unitCost: Math.round(num / (Number(it.qty) || 1)),
                                  supplyAmount: num,
                                  vatAmount: vat,
                                }
                              : it
                          ),
                        }));
                      }}
                      placeholder="예: 300,000"
                      required
                      className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right font-bold"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#78716c]">총 계약금 (공급가액)</label>
                    <input
                      type="text"
                      value={editCtAmount}
                      onChange={(e) => {
                        const formatted = formatErpInputNumber(e.target.value);
                        setEditCtAmount(formatted);
                        const num = cleanErpNumber(formatted);
                        const vat = Math.round(num * 0.1);
                        setEditCtVatAmount(toErpInputString(vat));
                        setEditCtTaxSpec((prev) => ({
                          ...prev,
                          taxItems: prev.taxItems.map((it, idx) =>
                            idx === 0
                              ? {
                                  ...it,
                                  unitCost: Math.round(num / (Number(it.qty) || 1)),
                                  supplyAmount: num,
                                  vatAmount: vat,
                                }
                              : it
                          ),
                        }));
                      }}
                      placeholder="예: 10,000,000"
                      required
                      className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right font-bold"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">세액 (VAT)</label>
                  <input
                    type="text"
                    value={editCtVatAmount}
                    onChange={(e) => setEditCtVatAmount(formatErpInputNumber(e.target.value))}
                    placeholder="예: 272,727"
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">정기 청구일 (매월)</label>
                  <select
                    value={editCtBillingDay}
                    onChange={(e) => setEditCtBillingDay(e.target.value)}
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  >
                    <option value="5">매월 5일</option>
                    <option value="10">매월 10일</option>
                    <option value="15">매월 15일</option>
                    <option value="20">매월 20일</option>
                    <option value="25">매월 25일</option>
                    <option value="31">매월 말일</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 시작일 *</label>
                  <input
                    type="date"
                    value={editCtStart}
                    onChange={(e) => setEditCtStart(e.target.value)}
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 종료일 *</label>
                  <input
                    type="date"
                    value={editCtEnd}
                    onChange={(e) => setEditCtEnd(e.target.value)}
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 상태</label>
                  <select
                    value={editCtStatus}
                    onChange={(e) => setEditCtStatus(e.target.value)}
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  >
                    <option value="ACTIVE">진행중 (ACTIVE)</option>
                    <option value="TERMINATED">중도해지 (TERMINATED)</option>
                    <option value="COMPLETED">정상종결 (COMPLETED)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">비고</label>
                  <input
                    type="text"
                    value={editCtMemo}
                    onChange={(e) => setEditCtMemo(e.target.value)}
                    placeholder="특약 메모"
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
              </div>

              {/* 운영용역 투입 임직원 및 직원별 계약금액(받는금액) 수정 섹션 */}
              <div className="p-3 rounded border border-blue-300 bg-[#ebe5d8] flex flex-col gap-2">
                {(() => {
                  const enrichedEditList = enrichAssignedEmployeeJoinDates(editCtAssignedEmployees);
                  const baseRateSum = enrichedEditList.reduce((s, e) => s + (Number(e.contractRate) || 0), 0);
                  const proRataCalcs = enrichedEditList.map((e) =>
                    calculateServiceEmployeeMonthlyProRata(
                      e.contractRate,
                      editCtProRataMonth,
                      e.joinDate,
                      e.leaveDate,
                      editCtApplyProRata && e.proRataEnabled !== false,
                      true
                    )
                  );
                  const proRatedSum = proRataCalcs.reduce((s, c) => s + c.effectiveAmount, 0);
                  const hasProRatedDiff = editCtApplyProRata && proRatedSum !== baseRateSum;

                  return (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#b5a894] pb-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Users className="w-4 h-4 text-blue-800" />
                          <span className="font-bold text-xs text-[#1c1917]">
                            투입 임직원 및 직원별 월 계약금액(받는금액) 편성
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 font-bold text-[10px]">
                            총 {enrichedEditList.length}명 | 기본 합계 {formatErpCurrency(baseRateSum)}
                            {hasProRatedDiff && (
                              <span className="ml-1 text-amber-900 font-extrabold">
                                ➔ 일할반영({editCtProRataMonth}) {formatErpCurrency(proRatedSum)}
                              </span>
                            )}
                            {editCtIncludeOtInBilling && (
                              <span className="ml-1 text-indigo-800">
                                + 초과근무수당 {formatErpCurrency(editCtOtBreakdown.totalOtPay)}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-stretch border-b border-[#b5a894] pb-2.5">
                        <div className="lg:col-span-5 flex flex-col justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-amber-400 bg-amber-50 text-amber-950 font-bold text-[11px]">
                              <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={editCtApplyProRata}
                                  onChange={(e) => {
                                    const nextVal = e.target.checked;
                                    setEditCtApplyProRata(nextVal);
                                    syncAssignedEmployeesToContract(
                                      editCtAssignedEmployees,
                                      true,
                                      undefined,
                                      nextVal,
                                      editCtProRataMonth
                                    );
                                  }}
                                  className="w-3.5 h-3.5 accent-amber-700"
                                />
                                <span>입퇴사 일할계산 반영</span>
                              </label>
                              <input
                                type="month"
                                value={editCtProRataMonth}
                                onChange={(e) => {
                                  const nextMonth = e.target.value;
                                  if (!nextMonth) return;
                                  setEditCtProRataMonth(nextMonth);
                                  syncAssignedEmployeesToContract(
                                    editCtAssignedEmployees,
                                    true,
                                    undefined,
                                    editCtApplyProRata,
                                    nextMonth
                                  );
                                }}
                                className="h-5 px-1 rounded border border-amber-400 bg-white text-[10px] font-mono text-amber-950"
                                title="일할계산 기준 연월"
                              />
                            </div>
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-indigo-300 bg-indigo-50 text-indigo-900 font-bold text-[11px] cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={editCtIncludeOtInBilling}
                                onChange={(e) => {
                                  const nextVal = e.target.checked;
                                  setEditCtIncludeOtInBilling(nextVal);
                                  syncAssignedEmployeesToContract(editCtAssignedEmployees, true, nextVal);
                                }}
                                className="w-3.5 h-3.5 accent-indigo-700"
                              />
                              <span>초과근무수당 반영</span>
                            </label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={editCtSelectedEmpId}
                              onChange={(e) => setEditCtSelectedEmpId(e.target.value)}
                              className="h-7 flex-1 min-w-0 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[#1c1917] text-xs font-semibold"
                            >
                              <option value="">-- 투입할 임직원 선택 --</option>
                              {employees
                                .filter((emp) => !editCtAssignedEmployees.some((a) => a.employeeId === emp.id))
                                .map((emp) => {
                                  const joinStr = emp.joinDate ? String(emp.joinDate).slice(0, 10) : "-";
                                  const leaveStr = emp.leaveDate ? String(emp.leaveDate).slice(0, 10) : "";
                                  return (
                                    <option key={emp.id} value={emp.id}>
                                      [{emp.employeeNo || `EMP-${emp.id}`}] {emp.name} ({emp.position || "사원"} / 입사 {joinStr}
                                      {leaveStr ? ` · 퇴사 ${leaveStr}` : ""})
                                    </option>
                                  );
                                })}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                if (!editCtSelectedEmpId) {
                                  showToast("추가할 임직원을 선택하세요.", "error");
                                  return;
                                }
                                const emp = employees.find((x) => String(x.id) === String(editCtSelectedEmpId));
                                if (!emp) return;
                                if (editCtAssignedEmployees.some((x) => x.employeeId === emp.id)) {
                                  showToast("이미 추가된 임직원입니다.", "error");
                                  return;
                                }
                                const defaultRate =
                                  Number(emp.serviceContractAmount) > 0
                                    ? Number(emp.serviceContractAmount)
                                    : Number(emp.baseSalary) > 0
                                    ? Number(emp.baseSalary)
                                    : 3000000;
                                const nextList: AssignedServiceEmployee[] = [
                                  ...editCtAssignedEmployees,
                                  {
                                    employeeId: emp.id,
                                    employeeNo: emp.employeeNo || "",
                                    name: emp.name,
                                    position: emp.position || "",
                                    department: emp.department || "",
                                    joinDate: emp.joinDate ? String(emp.joinDate).slice(0, 10) : "",
                                    leaveDate: emp.leaveDate ? String(emp.leaveDate).slice(0, 10) : "",
                                    baseSalary: Math.round(Number(emp.baseSalary || 0)),
                                    contractRate: defaultRate,
                                    proRataEnabled: true,
                                    note: "",
                                  },
                                ];
                                syncAssignedEmployeesToContract(nextList, true);
                                setEditCtSelectedEmpId("");
                              }}
                              className="h-7 px-2.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-sm shrink-0 whitespace-nowrap"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>임직원 투입 추가</span>
                            </button>
                          </div>
                        </div>
                        <div className="lg:col-span-7">
                          <ProRataFormulaGuideBox
                            targetMonth={editCtProRataMonth}
                            employeesList={enrichedEditList}
                            calcs={proRataCalcs}
                            applyProRata={editCtApplyProRata}
                          />
                        </div>
                      </div>

                      {enrichedEditList.length === 0 ? (
                        <div className="py-3 text-center text-[#78716c] text-[11px]">
                          등록된 투입 임직원이 없습니다. 상단에서 임직원을 선택하고 [임직원 투입 추가]를 클릭하세요.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                            <thead className="bg-[#dfd7c7] text-[#44403c] border-b border-[#b5a894] font-bold">
                              <tr>
                                <th className="py-1.5 px-2 w-10 text-center">제외</th>
                                <th className="py-1.5 px-2">사번</th>
                                <th className="py-1.5 px-2">성명 / 직급</th>
                                <th className="py-1.5 px-2">입사일</th>
                                <th className="py-1.5 px-2">퇴사일</th>
                                <th className="py-1.5 px-2 text-right w-36">월 기준금액 (원)</th>
                                <th className="py-1.5 px-2 text-right w-48">당월 일할적용액 ({editCtProRataMonth})</th>
                                <th className="py-1.5 px-2 text-right w-32">당월 초과근무수당</th>
                                <th className="py-1.5 px-2">업무/역할 비고</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#b5a894] bg-[#f4efe4]">
                              {enrichedEditList.map((row, idx) => {
                                const empOt = editCtOtBreakdown.byEmp[row.employeeId] || { hours: 0, otPay: 0, count: 0 };
                                const prCalc = proRataCalcs[idx];
                                return (
                                  <tr key={row.employeeId} className={prCalc.isProRated ? "bg-amber-50/60" : ""}>
                                    <td className="py-1.5 px-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextList = editCtAssignedEmployees.filter((_, i) => i !== idx);
                                          syncAssignedEmployeesToContract(nextList, true);
                                        }}
                                        className="p-1 text-rose-700 hover:bg-rose-100 rounded"
                                        title="투입 제외"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                    <td className="py-1.5 px-2 font-mono text-[#78716c]">{row.employeeNo || "-"}</td>
                                    <td className="py-1.5 px-2 font-bold text-[#1c1917]">
                                      {row.name}{" "}
                                      <span className="text-[10px] font-normal text-[#78716c]">
                                        ({row.position || "사원"})
                                      </span>
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <input
                                        type="date"
                                        value={row.joinDate || ""}
                                        onChange={(e) => {
                                          const nextJoin = e.target.value;
                                          const nextList = enrichedEditList.map((it, i) =>
                                            i === idx ? { ...it, joinDate: nextJoin } : it
                                          );
                                          syncAssignedEmployeesToContract(nextList, true);
                                        }}
                                        className="h-7 px-1.5 rounded border border-[#b5a894] bg-white font-mono text-[11px] text-[#1c1917]"
                                      />
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <input
                                        type="date"
                                        value={row.leaveDate || ""}
                                        onChange={(e) => {
                                          const nextLeave = e.target.value;
                                          const nextList = enrichedEditList.map((it, i) =>
                                            i === idx ? { ...it, leaveDate: nextLeave } : it
                                          );
                                          syncAssignedEmployeesToContract(nextList, true);
                                        }}
                                        className="h-7 px-1.5 rounded border border-[#b5a894] bg-white font-mono text-[11px] text-[#1c1917]"
                                      />
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <input
                                        type="text"
                                        value={toErpInputString(row.contractRate)}
                                        onChange={(e) => {
                                          const rate = cleanErpNumber(formatErpInputNumber(e.target.value));
                                          const nextList = enrichedEditList.map((it, i) =>
                                            i === idx ? { ...it, contractRate: rate } : it
                                          );
                                          syncAssignedEmployeesToContract(nextList, true);
                                        }}
                                        className="w-full h-7 px-2 rounded border border-[#b5a894] bg-white text-right font-mono font-bold text-blue-900"
                                      />
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <input
                                          type="checkbox"
                                          checked={row.proRataEnabled !== false}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            const nextList = enrichedEditList.map((it, i) =>
                                              i === idx ? { ...it, proRataEnabled: checked } : it
                                            );
                                            syncAssignedEmployeesToContract(nextList, true);
                                          }}
                                          className="w-3.5 h-3.5 accent-amber-700"
                                          title="입퇴사 일할계산 적용"
                                        />
                                        <span
                                          title={prCalc.formulaLabel}
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                            prCalc.isProRated
                                              ? "bg-amber-100 text-amber-900 border-amber-400"
                                              : "bg-[#ebe5d8] text-[#78716c] border-[#b5a894]"
                                          }`}
                                        >
                                          {prCalc.shortBadge}
                                        </span>
                                        <span
                                          className={
                                            prCalc.isProRated
                                              ? "font-extrabold text-amber-900"
                                              : "font-bold text-[#1c1917]"
                                          }
                                        >
                                          {formatErpCurrency(prCalc.effectiveAmount)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono">
                                      <span
                                        className={
                                          editCtIncludeOtInBilling && empOt.otPay > 0
                                            ? "font-bold text-indigo-800"
                                            : "text-[#78716c]"
                                        }
                                      >
                                        {formatErpCurrency(empOt.otPay)}
                                      </span>
                                      <span className="ml-1 text-[10px] text-[#78716c]">({empOt.hours}h)</span>
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <input
                                        type="text"
                                        value={row.note}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setEditCtAssignedEmployees((prev) =>
                                            prev.map((it, i) => (i === idx ? { ...it, note: val } : it))
                                          );
                                        }}
                                        placeholder="담당 업무 또는 비고"
                                        className="w-full h-7 px-2 rounded border border-[#b5a894] bg-white text-[#1c1917]"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* 전자세금계산서 발행 제원 및 품목 명세 섹션 */}
              <ContractTaxInvoiceSection
                spec={editCtTaxSpec}
                onChange={setEditCtTaxSpec}
                onTotalChange={(totalSupply, totalVat) => {
                  if (activeType === "OPERATIONAL") {
                    setEditCtMonthlyFee(toErpInputString(totalSupply));
                  } else {
                    setEditCtAmount(toErpInputString(totalSupply));
                  }
                  setEditCtVatAmount(toErpInputString(totalVat));
                }}
                domainLabel={activeType === "OPERATIONAL" ? "운영용역" : "개발용역"}
              />

              {/* 계약서 원본 변경/첨부 */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">용역계약서 파일 (선택)</label>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.hwp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleEditFileUpload(file);
                  }}
                  className="hidden"
                />
                <div className="flex items-center justify-between px-3 py-1.5 rounded bg-[#ebe5d8] border border-[#b5a894]">
                  <span className="text-[#44403c] truncate">
                    {editCtFileName ? `첨부파일: ${editCtFileName}` : "첨부된 계약서 파일 없음"}
                  </span>
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-700 text-white"
                  >
                    파일 업로드/변경
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#b5a894] mt-1">
                <button
                  type="button"
                  onClick={() => setShowEditContractModal(false)}
                  className="h-8 px-3 rounded font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-sm"
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
