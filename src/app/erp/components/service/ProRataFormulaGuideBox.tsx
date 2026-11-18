"use client";

import React from "react";
import { formatErpCurrency } from "@/lib/erpFormat";
import { calculateServiceEmployeeMonthlyProRata, type ServiceEmployeeProRataResult } from "@/lib/erpHrLaborDomain";
import { type AssignedServiceEmployee } from "./serviceTypes";

export interface ProRataFormulaGuideBoxProps {
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
