"use client";

import React, { useRef } from "react";
import { Clock } from "lucide-react";
import { cleanErpNumber, formatErpCurrency, formatErpInputNumber, toErpInputString } from "@/lib/erpFormat";
import { isKoreanNonWorkingDay } from "@/lib/erpHrLaborDomain";

export interface OtEmployee {
  id: number;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  duty?: string;
  role?: string;
  roleCode?: string;
  status?: string;
  employmentStatus?: string;
  leaveDate?: string | null;
  baseSalary?: number;
  hourlyWage?: number;
}

export interface OtFormState {
  employeeId: number;
  otDate: string;
  isHoliday: boolean;
  startHour: string;
  startMin: string;
  endHour: string;
  endMin: string;
  otHours: number;
  customOtPay: number | null;
  reason: string;
  autoApprove: boolean;
}

export interface OtLiveBreakdown {
  isHoliday: boolean;
  otHours: number;
  nightHours: number;
  appliedMultiplier: number;
  otPay: number;
  formulaText: string;
}

const OT_REASONS = [
  "야간출고 및 배차지원",
  "출장",
  "휴일 입출고 및 검수",
  "긴급 A/S 및 현장지원",
  "야간 정비 및 재고실사",
];

const OT_TIME_PRESETS = [
  { label: "07~09시(2h)", sh: "07", sm: "00", eh: "09", em: "00" },
  { label: "08~09시(1h)", sh: "08", sm: "00", eh: "09", em: "00" },
  { label: "18~20시(2h)", sh: "18", sm: "00", eh: "20", em: "00" },
  { label: "18~21시(3h)", sh: "18", sm: "00", eh: "21", em: "00" },
  { label: "18~22시(4h)", sh: "18", sm: "00", eh: "22", em: "00" },
  { label: "18~24시(심야포함)", sh: "18", sm: "00", eh: "00", em: "00" },
  { label: "09~18시(휴일9h)", sh: "09", sm: "00", eh: "18", em: "00" },
];

interface OtRequestModalProps {
  otForm: OtFormState;
  setOtForm: React.Dispatch<React.SetStateAction<OtFormState>>;
  selectableEmployees: OtEmployee[];
  isAdmin: boolean;
  isDeptHead: boolean;
  currentUserId: number;
  currentUserDept: string;
  normalizedStartTime: string;
  normalizedEndTime: string;
  modalEmpHourlyWage: number;
  liveBreakdown: OtLiveBreakdown;
  getDayOfWeekKr: (dateStr: string) => string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const OtRequestModal: React.FC<OtRequestModalProps> = ({
  otForm,
  setOtForm,
  selectableEmployees,
  isAdmin,
  isDeptHead,
  currentUserId,
  currentUserDept,
  normalizedStartTime,
  normalizedEndTime,
  modalEmpHourlyWage,
  liveBreakdown,
  getDayOfWeekKr,
  onSubmit,
  onClose,
}) => {
  const startHourRef = useRef<HTMLInputElement>(null);
  const startMinRef = useRef<HTMLInputElement>(null);
  const endHourRef = useRef<HTMLInputElement>(null);
  const endMinRef = useRef<HTMLInputElement>(null);

  const handleHourInputChange = (
    rawVal: string,
    hourField: "startHour" | "endHour",
    minField: "startMin" | "endMin",
    nextMinRef: React.RefObject<HTMLInputElement | null>
  ) => {
    const digits = rawVal.replace(/[^0-9]/g, "");
    if (!digits) {
      setOtForm((prev) => ({ ...prev, [hourField]: "", customOtPay: null }));
      return;
    }
    if (digits.length >= 3) {
      const hClamped = String(Math.min(23, parseInt(digits.slice(0, 2), 10) || 0)).padStart(2, "0");
      const mRaw = digits.slice(2, 4);
      const mClamped = mRaw.length === 2 ? String(Math.min(59, parseInt(mRaw, 10) || 0)).padStart(2, "0") : mRaw;
      setOtForm((prev) => ({ ...prev, [hourField]: hClamped, [minField]: mClamped, customOtPay: null }));
      nextMinRef.current?.focus();
      return;
    }
    if (digits.length === 2) {
      const hNum = parseInt(digits, 10);
      const hClamped = String(Math.min(23, isNaN(hNum) ? 0 : hNum)).padStart(2, "0");
      setOtForm((prev) => ({ ...prev, [hourField]: hClamped, customOtPay: null }));
      nextMinRef.current?.focus();
      nextMinRef.current?.select();
      return;
    }
    const single = parseInt(digits, 10);
    if (single >= 3 && single <= 9) {
      setOtForm((prev) => ({ ...prev, [hourField]: `0${single}`, customOtPay: null }));
      nextMinRef.current?.focus();
      nextMinRef.current?.select();
    } else {
      setOtForm((prev) => ({ ...prev, [hourField]: digits, customOtPay: null }));
    }
  };

  const handleMinInputChange = (
    rawVal: string,
    minField: "startMin" | "endMin",
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    const digits = rawVal.replace(/[^0-9]/g, "").slice(0, 2);
    if (!digits) {
      setOtForm((prev) => ({ ...prev, [minField]: "", customOtPay: null }));
      return;
    }
    if (digits.length === 2) {
      const mNum = parseInt(digits, 10);
      const mClamped = String(Math.min(59, isNaN(mNum) ? 0 : mNum)).padStart(2, "0");
      setOtForm((prev) => ({ ...prev, [minField]: mClamped, customOtPay: null }));
      nextRef?.current?.focus();
      nextRef?.current?.select();
      return;
    }
    const single = parseInt(digits, 10);
    if (single >= 6 && single <= 9) {
      setOtForm((prev) => ({ ...prev, [minField]: `0${single}`, customOtPay: null }));
      nextRef?.current?.focus();
      nextRef?.current?.select();
    } else {
      setOtForm((prev) => ({ ...prev, [minField]: digits, customOtPay: null }));
    }
  };

  const padTimeFieldOnBlur = (field: "startHour" | "startMin" | "endHour" | "endMin", maxVal: number) => {
    setOtForm((prev) => {
      const n = Math.min(maxVal, Math.max(0, parseInt(String(prev[field] || "0"), 10) || 0));
      return { ...prev, [field]: String(n).padStart(2, "0") };
    });
  };

  const timeFields = [
    { label: "시작 시각 (24시간제 시 : 분 키입력)", hourField: "startHour" as const, minField: "startMin" as const, hourRef: startHourRef, minRef: startMinRef, nextHourRef: endHourRef, hourPlaceholder: "18" },
    { label: "종료 시각 (24시간제 시 : 분 키입력)", hourField: "endHour" as const, minField: "endMin" as const, hourRef: endHourRef, minRef: endMinRef, nextHourRef: undefined, hourPlaceholder: "21" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-lg shadow-2xl dark:bg-slate-900 dark:border-slate-800">
        <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 mb-4 pb-2 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#1d4ed8]" />
            <span>초과근무 신청 및 수당 자동 계산</span>
          </div>
          <span className="text-[11px] font-bold text-[#1d4ed8] bg-[#dbeafe] border border-[#93c5fd] px-2 py-0.5 rounded whitespace-nowrap">
            결재권자: 부서장 (장종순)
          </span>
        </h2>

        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">대상 임직원 (퀵선택)</label>
              {isDeptHead && (
                <span className="text-[10.5px] font-bold text-[#1d4ed8] dark:text-blue-400">
                  부서장(팀장) 권한 · {currentUserDept} 구성원 입력 가능
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800">
              {selectableEmployees.map((emp) => {
                const isSelected = Number(otForm.employeeId) === Number(emp.id);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    disabled={!isAdmin && Number(emp.id) !== currentUserId}
                    onClick={() => setOtForm({ ...otForm, employeeId: Number(emp.id), customOtPay: null })}
                    className={`px-2.5 py-1.5 rounded text-xs font-bold border whitespace-nowrap transition ${
                      isSelected
                        ? "bg-[#1d4ed8] text-white border-[#1e40af] shadow-xs"
                        : "bg-[#ebe5d8] hover:bg-[#dcd4c4] text-[#0f172a] border-[#b5a894] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    } disabled:opacity-50`}
                  >
                    {emp.name} ({emp.department || "미배정"} · {emp.position})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">근무 일자</label>
              <input
                type="date"
                value={otForm.otDate}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setOtForm({ ...otForm, otDate: nextDate, isHoliday: isKoreanNonWorkingDay(nextDate), customOtPay: null });
                }}
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">근무일 구분 (요일/공휴일 자동판정)</label>
              <div className="flex items-center gap-1.5">
                <div className={`flex-1 border text-xs px-3 py-2 rounded font-bold flex items-center justify-between ${otForm.isHoliday ? "bg-[#fef2f2] border-[#dc2626] text-[#b91c1c]" : "bg-[#f0fdf4] border-[#16a34a] text-[#15803d]"}`}>
                  <span>
                    {otForm.isHoliday
                      ? `휴일 출근 (${getDayOfWeekKr(otForm.otDate)}요일/공휴일 · 1.5~2.0배)`
                      : `평일 근무일 (${getDayOfWeekKr(otForm.otDate)}요일 · 1.5배)`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtForm({ ...otForm, isHoliday: !otForm.isHoliday, customOtPay: null })}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white/80 hover:bg-white border border-current font-semibold shrink-0 whitespace-nowrap"
                    title="예외 휴일/근무일 수동 전환"
                  >
                    전환
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 24시간제 시/분 키보드 직접 입력 영역 */}
          <div className="grid grid-cols-2 gap-2">
            {timeFields.map((tf) => (
              <div key={tf.hourField} className="flex flex-col gap-1">
                <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">{tf.label}</label>
                <div className="flex items-center gap-1 bg-[#f4efe4] border border-[#b5a894] px-2.5 py-1.5 rounded focus-within:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800">
                  <input
                    ref={tf.hourRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={otForm[tf.hourField]}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => padTimeFieldOnBlur(tf.hourField, 23)}
                    onChange={(e) => handleHourInputChange(e.target.value, tf.hourField, tf.minField, tf.minRef)}
                    onKeyDown={(e) => {
                      if (e.key === ":" || e.key === "ArrowRight" || e.key === "Enter") {
                        e.preventDefault();
                        padTimeFieldOnBlur(tf.hourField, 23);
                        tf.minRef.current?.focus();
                        tf.minRef.current?.select();
                      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                        e.preventDefault();
                        const cur = parseInt(otForm[tf.hourField] || "0", 10) || 0;
                        const next = e.key === "ArrowUp" ? (cur + 1) % 24 : (cur + 23) % 24;
                        setOtForm((prev) => ({ ...prev, [tf.hourField]: String(next).padStart(2, "0"), customOtPay: null }));
                      }
                    }}
                    placeholder={tf.hourPlaceholder}
                    className="w-11 text-center bg-white dark:bg-slate-900 border border-[#cbd5e1] dark:border-slate-700 rounded py-1 text-sm font-mono font-bold text-[#0f172a] dark:text-slate-100 focus:outline-none focus:border-[#1d4ed8]"
                  />
                  <span className="text-xs font-bold text-[#475569]">시</span>
                  <span className="text-sm font-mono font-bold text-[#475569] px-0.5">:</span>
                  <input
                    ref={tf.minRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={otForm[tf.minField]}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => padTimeFieldOnBlur(tf.minField, 59)}
                    onChange={(e) => handleMinInputChange(e.target.value, tf.minField, tf.nextHourRef)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otForm[tf.minField]) {
                        tf.hourRef.current?.focus();
                        tf.hourRef.current?.select();
                      } else if (tf.nextHourRef && (e.key === "ArrowRight" || e.key === "Enter")) {
                        e.preventDefault();
                        padTimeFieldOnBlur(tf.minField, 59);
                        tf.nextHourRef.current?.focus();
                        tf.nextHourRef.current?.select();
                      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                        e.preventDefault();
                        const cur = parseInt(otForm[tf.minField] || "0", 10) || 0;
                        const next = e.key === "ArrowUp" ? (cur + 10) % 60 : (cur + 50) % 60;
                        setOtForm((prev) => ({ ...prev, [tf.minField]: String(next).padStart(2, "0"), customOtPay: null }));
                      }
                    }}
                    placeholder="00"
                    className="w-11 text-center bg-white dark:bg-slate-900 border border-[#cbd5e1] dark:border-slate-700 rounded py-1 text-sm font-mono font-bold text-[#0f172a] dark:text-slate-100 focus:outline-none focus:border-[#1d4ed8]"
                  />
                  <span className="text-xs font-bold text-[#475569]">분</span>
                  <div className="ml-auto flex items-center gap-0.5">
                    {["00", "30"].map((mVal) => (
                      <button
                        key={mVal}
                        type="button"
                        onClick={() => setOtForm((prev) => ({ ...prev, [tf.minField]: mVal, customOtPay: null }))}
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border whitespace-nowrap ${
                          otForm[tf.minField] === mVal ? "bg-[#1d4ed8] text-white border-[#1d4ed8]" : "bg-[#ebe5d8] text-[#334155] border-[#b5a894] hover:bg-[#dcd4c4]"
                        }`}
                      >
                        :{mVal}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 자주 쓰는 시간대 단축 버튼 & 자동 판정 배지 */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 px-1">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-semibold text-[#475569] mr-1">시간 단축선택:</span>
              {OT_TIME_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setOtForm((prev) => ({ ...prev, startHour: p.sh, startMin: p.sm, endHour: p.eh, endMin: p.em, customOtPay: null }))}
                  className="px-2 py-0.5 text-[10.5px] font-bold rounded bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] transition whitespace-nowrap"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 초과근무 수당 자동 계산 명세 박스 */}
          <div className="p-3 rounded border border-[#b5a894] bg-[#f4efe4] dark:bg-slate-950 dark:border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#d0c6b4] pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#1d4ed8] dark:text-blue-400">자동 판정:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border whitespace-nowrap ${liveBreakdown.isHoliday ? "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]" : "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]"}`}>
                  {liveBreakdown.isHoliday ? "휴일(비근무일)" : "평일(근무일)"}
                </span>
                {liveBreakdown.nightHours > 0 ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#eef2ff] text-[#4338ca] border border-[#c7d2fe] whitespace-nowrap">
                    심야근무 포함 ({liveBreakdown.nightHours}h)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ebe5d8] text-[#475569] border border-[#cbd5e1] whitespace-nowrap">
                    주간/저녁 (심야 없음)
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                통상임금: {formatErpCurrency(modalEmpHourlyWage)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="bg-[#ebe5d8] dark:bg-slate-900 p-1.5 rounded border border-[#d0c6b4] dark:border-slate-800">
                <div className="text-[#475569]">총 초과근무 시간</div>
                <div className="font-mono font-bold text-xs text-[#0f172a] dark:text-slate-100">
                  {liveBreakdown.otHours}시간 ({normalizedStartTime}~{normalizedEndTime})
                </div>
              </div>
              <div className="bg-[#ebe5d8] dark:bg-slate-900 p-1.5 rounded border border-[#d0c6b4] dark:border-slate-800">
                <div className="text-[#475569]">심야 구간 (22~06시)</div>
                <div className="font-mono font-bold text-xs text-[#4338ca] dark:text-indigo-400">
                  {liveBreakdown.nightHours}시간 (+0.5배)
                </div>
              </div>
              <div className="bg-[#ebe5d8] dark:bg-slate-900 p-1.5 rounded border border-[#d0c6b4] dark:border-slate-800">
                <div className="text-[#475569]">적용 평균 배율</div>
                <div className="font-mono font-bold text-xs text-[#047857] dark:text-emerald-400">
                  {liveBreakdown.appliedMultiplier}배
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#334155] dark:text-slate-400 font-mono bg-[#ebe5d8] dark:bg-slate-900 px-2 py-1.5 rounded border border-dashed border-[#b5a894]">
              산식: {liveBreakdown.formulaText}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#0f172a] dark:text-slate-200">최종 초과근무수당 (원)</label>
                {otForm.customOtPay !== null && (
                  <button
                    type="button"
                    onClick={() => setOtForm({ ...otForm, customOtPay: null })}
                    className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#dcd4c4] text-[#0f172a] border border-[#b5a894] font-semibold whitespace-nowrap"
                  >
                    자동계산 복원
                  </button>
                )}
              </div>
              <input
                type="text"
                value={toErpInputString(otForm.customOtPay !== null ? otForm.customOtPay : liveBreakdown.otPay)}
                onChange={(e) => {
                  const formatted = formatErpInputNumber(e.target.value);
                  setOtForm({ ...otForm, customOtPay: formatted ? cleanErpNumber(formatted) : 0 });
                }}
                className="w-40 text-right bg-white dark:bg-slate-900 border border-[#1d4ed8] text-sm font-bold font-mono text-[#1d4ed8] px-2.5 py-1 rounded"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">근무 사유 프리셋 (퀵선택)</label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800">
              {OT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setOtForm({ ...otForm, reason: r })}
                  className={`px-2.5 py-1.5 rounded text-xs font-bold border whitespace-nowrap transition ${
                    otForm.reason === r
                      ? "bg-[#1d4ed8] text-white border-[#1e40af] shadow-xs"
                      : "bg-[#ebe5d8] hover:bg-[#dcd4c4] text-[#0f172a] border-[#b5a894] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#334155] dark:text-slate-400 font-semibold">상세 근무 사유 입력</label>
            <input
              type="text"
              value={otForm.reason}
              onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })}
              placeholder="구체적인 업무 내용 입력"
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
            />
          </div>

          {isAdmin && (
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={otForm.autoApprove}
                onChange={(e) => setOtForm({ ...otForm, autoApprove: e.target.checked })}
                className="w-4 h-4 accent-[#1d4ed8]"
              />
              <span className="text-xs font-bold text-[#047857]">
                부서장(장종순) 전결 즉시 승인 완료 처리 (급여 정산 및 용역 청구에 즉시 반영)
              </span>
            </label>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-[#0f172a] bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 whitespace-nowrap">
            취소
          </button>
          <button type="submit" className="px-4 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded shadow whitespace-nowrap">
            {isAdmin && otForm.autoApprove ? "초과근무 등록 및 승인" : "초과근무 신청 제출"}
          </button>
        </div>
      </form>
    </div>
  );
};
