"use client";

import React from "react";
import { cleanErpNumber, formatErpInputNumber, toErpInputString } from "@/lib/erpFormat";
import { type ForkliftItemClass, type ForkliftSpecData, FORKLIFT_MAST_TYPES, FORKLIFT_OPTION_GROUPS, FORKLIFT_PART_GROUPS, FORKLIFT_POWER_TYPES, FORKLIFT_TIRE_TYPES, summarizeForkliftSpec } from "@/lib/forkliftDomain";

interface ForkliftSpecEditorProps {
  itemClass: ForkliftItemClass;
  specData: ForkliftSpecData;
  onChangeSpecData: (next: ForkliftSpecData) => void;
  partNo?: string;
  onChangePartNo?: (val: string) => void;
  fallbackSpec?: string;
  onChangeFallbackSpec?: (val: string) => void;
  compact?: boolean;
}

export default function ForkliftSpecEditor({
  itemClass,
  specData,
  onChangeSpecData,
  partNo,
  onChangePartNo,
  fallbackSpec,
  onChangeFallbackSpec,
  compact = false,
}: ForkliftSpecEditorProps) {
  const inputCls =
    "h-7 px-2 border border-[#b5a894] bg-[#f4efe4] text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded text-xs w-full";
  const labelCls = "text-[11px] font-medium whitespace-nowrap text-[#334155] dark:text-slate-300";

  const setField = <K extends keyof ForkliftSpecData>(key: K, val: ForkliftSpecData[K]) => {
    onChangeSpecData({
      ...specData,
      [key]: val,
    });
  };

  const setNumField = (key: keyof ForkliftSpecData, raw: string) => {
    const cleaned = raw.trim() === "" ? null : cleanErpNumber(raw);
    onChangeSpecData({
      ...specData,
      [key]: cleaned && cleaned > 0 ? cleaned : null,
    });
  };

  const summary = summarizeForkliftSpec(itemClass, specData, fallbackSpec);

  if (itemClass === "GENERAL") {
    return (
      <div className="flex flex-col gap-2 p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70 dark:bg-slate-900/60 dark:border-slate-700">
        {onChangeFallbackSpec && (
          <div className="flex flex-col gap-1">
            <label className={labelCls}>세부 제원</label>
            <input
              type="text"
              value={fallbackSpec || ""}
              onChange={(e) => onChangeFallbackSpec(e.target.value)}
              placeholder="장비 세부 규격·제원 입력"
              className={inputCls}
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className={labelCls}>비고</label>
          <input
            type="text"
            value={specData.notes || ""}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="스펙 참고사항"
            className={inputCls}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70 dark:bg-slate-900/60 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2 border-b border-[#c4b6a0] dark:border-slate-700 pb-1">
        <span className="text-[11px] font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
          {itemClass === "FORKLIFT"
            ? "지게차 완제품 스펙"
            : itemClass === "OPTION"
            ? "지게차 옵션 스펙"
            : "부품·소모품 스펙"}
        </span>
        {summary && (
          <span className="text-[10px] font-mono text-blue-700 dark:text-blue-400 truncate max-w-[260px]" title={summary}>
            {summary}
          </span>
        )}
      </div>

      {itemClass === "FORKLIFT" && (
        <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-3"} gap-2`}>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>동력원</label>
            <select
              value={specData.powerType || ""}
              onChange={(e) => setField("powerType", e.target.value)}
              className={inputCls}
            >
              <option value="">선택</option>
              {FORKLIFT_POWER_TYPES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>정격하중 (kg)</label>
            <input
              type="text"
              inputMode="numeric"
              value={toErpInputString(specData.ratedCapacityKg)}
              onChange={(e) => setNumField("ratedCapacityKg", formatErpInputNumber(e.target.value))}
              placeholder="예: 3,000"
              className={`${inputCls} text-right font-mono`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>마스트</label>
            <select
              value={specData.mastType || ""}
              onChange={(e) => setField("mastType", e.target.value)}
              className={inputCls}
            >
              <option value="">선택</option>
              {FORKLIFT_MAST_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>최대인상고 (mm)</label>
            <input
              type="text"
              inputMode="numeric"
              value={toErpInputString(specData.maxLiftHeightMm)}
              onChange={(e) => setNumField("maxLiftHeightMm", formatErpInputNumber(e.target.value))}
              placeholder="예: 4,700"
              className={`${inputCls} text-right font-mono`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>포크길이 (mm)</label>
            <input
              type="text"
              inputMode="numeric"
              value={toErpInputString(specData.forkLengthMm)}
              onChange={(e) => setNumField("forkLengthMm", formatErpInputNumber(e.target.value))}
              placeholder="예: 1,200"
              className={`${inputCls} text-right font-mono`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>타이어</label>
            <select
              value={specData.tireType || ""}
              onChange={(e) => setField("tireType", e.target.value)}
              className={inputCls}
            >
              <option value="">선택</option>
              {FORKLIFT_TIRE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>전압 (V)</label>
            <input
              type="text"
              inputMode="numeric"
              value={toErpInputString(specData.batteryVoltageV)}
              onChange={(e) => setNumField("batteryVoltageV", formatErpInputNumber(e.target.value))}
              placeholder="예: 80"
              className={`${inputCls} text-right font-mono`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>배터리용량 (Ah)</label>
            <input
              type="text"
              inputMode="numeric"
              value={toErpInputString(specData.batteryCapacityAh)}
              onChange={(e) => setNumField("batteryCapacityAh", formatErpInputNumber(e.target.value))}
              placeholder="예: 560"
              className={`${inputCls} text-right font-mono`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>자체중량 (kg)</label>
            <input
              type="text"
              inputMode="numeric"
              value={toErpInputString(specData.overallWeightKg)}
              onChange={(e) => setNumField("overallWeightKg", formatErpInputNumber(e.target.value))}
              placeholder="예: 4,650"
              className={`${inputCls} text-right font-mono`}
            />
          </div>
        </div>
      )}

      {itemClass === "OPTION" && (
        <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-3"} gap-2`}>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>옵션 구분</label>
            <select
              value={specData.optionGroup || ""}
              onChange={(e) => setField("optionGroup", e.target.value)}
              className={inputCls}
            >
              <option value="">선택</option>
              {FORKLIFT_OPTION_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>호환 기종</label>
            <input
              type="text"
              value={specData.compatibleModels || ""}
              onChange={(e) => setField("compatibleModels", e.target.value)}
              placeholder="예: 2.5~3.5톤 공용"
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>유압스풀·배관</label>
            <input
              type="text"
              value={specData.hydraulicChannels || ""}
              onChange={(e) => setField("hydraulicChannels", e.target.value)}
              placeholder="예: 3스풀 / 전기배선"
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>옵션중량 (kg)</label>
            <input
              type="text"
              inputMode="numeric"
              value={toErpInputString(specData.optionWeightKg)}
              onChange={(e) => setNumField("optionWeightKg", formatErpInputNumber(e.target.value))}
              placeholder="예: 120"
              className={`${inputCls} text-right font-mono`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>장착공수 (분)</label>
            <input
              type="text"
              inputMode="numeric"
              value={toErpInputString(specData.installDurationMin)}
              onChange={(e) => setNumField("installDurationMin", formatErpInputNumber(e.target.value))}
              placeholder="예: 90"
              className={`${inputCls} text-right font-mono`}
            />
          </div>
        </div>
      )}

      {itemClass === "PART" && (
        <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-3"} gap-2`}>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>부품 분류</label>
            <select
              value={specData.partGroup || ""}
              onChange={(e) => setField("partGroup", e.target.value)}
              className={inputCls}
            >
              <option value="">선택</option>
              {FORKLIFT_PART_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>품번 / OEM No</label>
            <input
              type="text"
              value={partNo !== undefined ? partNo : specData.partNo || ""}
              onChange={(e) => {
                const v = e.target.value;
                if (onChangePartNo) onChangePartNo(v);
                setField("partNo", v);
              }}
              placeholder="예: OEM-94102"
              className={`${inputCls} font-mono`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>적용 차종</label>
            <input
              type="text"
              value={specData.compatibleModels || ""}
              onChange={(e) => setField("compatibleModels", e.target.value)}
              placeholder="예: D30S-7, 30D-9"
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>교체주기 (시간)</label>
            <input
              type="text"
              inputMode="numeric"
              value={toErpInputString(specData.replaceIntervalHours)}
              onChange={(e) => setNumField("replaceIntervalHours", formatErpInputNumber(e.target.value))}
              placeholder="예: 500"
              className={`${inputCls} text-right font-mono`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>교체주기 (개월)</label>
            <input
              type="text"
              inputMode="numeric"
              value={toErpInputString(specData.replaceIntervalMonths)}
              onChange={(e) => setNumField("replaceIntervalMonths", formatErpInputNumber(e.target.value))}
              placeholder="예: 6"
              className={`${inputCls} text-right font-mono`}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className={labelCls}>세부 규격 비고</label>
        <input
          type="text"
          value={specData.notes || ""}
          onChange={(e) => setField("notes", e.target.value)}
          placeholder="추가 스펙·호환 안내 등"
          className={inputCls}
        />
      </div>
    </div>
  );
}
