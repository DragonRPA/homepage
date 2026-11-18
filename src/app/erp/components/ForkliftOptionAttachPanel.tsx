"use client";

import React, { useMemo, useState } from "react";
import { Plus, Trash2, Wrench } from "lucide-react";
import { cleanErpNumber, formatErpCurrency, formatErpInputNumber, toErpInputString } from "@/lib/erpFormat";
import { type AttachedForkliftOption, calculateAttachedOptionsTotals } from "@/lib/forkliftDomain";
import SearchSelectCombobox, { SearchSelectOption } from "./SearchSelectCombobox";

export interface CatalogOptionItem {
  id: number;
  source: "TRADE" | "RENTAL";
  skuCode?: string;
  name: string;
  spec?: string;
  unitPrice?: number;
  installFee?: number;
  monthlyAddonRate?: number;
  dailyAddonRate?: number;
}

interface ForkliftOptionAttachPanelProps {
  mode: "SALE" | "RENTAL";
  options: AttachedForkliftOption[];
  onChange: (next: AttachedForkliftOption[]) => void;
  catalogOptions: CatalogOptionItem[];
  title?: string;
}

export default function ForkliftOptionAttachPanel({
  mode,
  options,
  onChange,
  catalogOptions,
  title,
}: ForkliftOptionAttachPanelProps) {
  const [selectedCatalogKey, setSelectedCatalogKey] = useState("");
  const [customName, setCustomName] = useState("");
  const [qtyStr, setQtyStr] = useState("1");
  const [priceStr, setPriceStr] = useState("0");
  const [installFeeStr, setInstallFeeStr] = useState("0");
  const [monthlyAddonStr, setMonthlyAddonStr] = useState("0");
  const [dailyAddonStr, setDailyAddonStr] = useState("0");

  const comboboxOptions = useMemo<SearchSelectOption[]>(() => {
    return catalogOptions.map((item) => ({
      value: `${item.source}:${item.id}`,
      label: `${item.name}${item.spec ? ` (${item.spec})` : ""}`,
      subLabel:
        mode === "SALE"
          ? `단가 ${formatErpCurrency(item.unitPrice || 0)} + 공임 ${formatErpCurrency(item.installFee || 0)}`
          : `월추가 ${formatErpCurrency(item.monthlyAddonRate || 0)} / 일추가 ${formatErpCurrency(item.dailyAddonRate || 0)}`,
      badgeText: item.skuCode || undefined,
      badgeColor: "amber",
      searchKeywords: [item.name, item.spec, item.skuCode],
    }));
  }, [catalogOptions, mode]);

  const totals = useMemo(() => calculateAttachedOptionsTotals(options), [options]);

  const handleSelectCatalog = (val: string) => {
    setSelectedCatalogKey(val);
    const found = catalogOptions.find((c) => `${c.source}:${c.id}` === val);
    if (found) {
      setCustomName(found.name);
      setPriceStr(toErpInputString(found.unitPrice || 0));
      setInstallFeeStr(toErpInputString(found.installFee || 0));
      setMonthlyAddonStr(toErpInputString(found.monthlyAddonRate || 0));
      setDailyAddonStr(toErpInputString(found.dailyAddonRate || 0));
    }
  };

  const handleAddOption = () => {
    const found = catalogOptions.find((c) => `${c.source}:${c.id}` === selectedCatalogKey);
    const optionName = (customName || found?.name || "").trim();
    if (!optionName) return;

    const qty = Math.max(1, Math.round(cleanErpNumber(qtyStr) || 1));
    const entry: AttachedForkliftOption = {
      optionId: found?.id ?? null,
      source: found?.source ?? "MANUAL",
      skuCode: found?.skuCode || "",
      optionName,
      specSummary: found?.spec || "",
      qty,
      unitPrice: mode === "SALE" ? cleanErpNumber(priceStr) : 0,
      installFee: mode === "SALE" ? cleanErpNumber(installFeeStr) : 0,
      monthlyAddonRate: mode === "RENTAL" ? cleanErpNumber(monthlyAddonStr) : 0,
      dailyAddonRate: mode === "RENTAL" ? cleanErpNumber(dailyAddonStr) : 0,
    };

    onChange([...options, entry]);
    setSelectedCatalogKey("");
    setCustomName("");
    setQtyStr("1");
    setPriceStr("0");
    setInstallFeeStr("0");
    setMonthlyAddonStr("0");
    setDailyAddonStr("0");
  };

  const handleRemove = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  const inputCls =
    "h-7 px-2 border border-[#b5a894] bg-[#f4efe4] text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded text-xs w-full font-mono text-right";

  return (
    <div className="flex flex-col gap-2 p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/75 dark:bg-slate-900/70 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
          <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{title || (mode === "SALE" ? "설치 옵션 추가" : "부착 옵션 추가")}</span>
          {options.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
              {options.length}종
            </span>
          )}
        </div>
        {options.length > 0 && (
          <div className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
            {mode === "SALE"
              ? `옵션+설치 합계 ${formatErpCurrency(totals.totalSaleUnitAndInstall)}`
              : `옵션 월추가 ${formatErpCurrency(totals.totalMonthlyAddon)} / 일추가 ${formatErpCurrency(totals.totalDailyAddon)}`}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
        <div className="md:col-span-5">
          <SearchSelectCombobox
            label="옵션 선택 / 직접 입력"
            allowFreeText
            showChosungBar={false}
            size="sm"
            value={selectedCatalogKey}
            freeTextValue={customName}
            onFreeTextChange={(txt) => {
              setCustomName(txt);
              setSelectedCatalogKey((prev) => {
                const found = catalogOptions.find((c) => `${c.source}:${c.id}` === prev);
                return found && found.name === txt ? prev : "";
              });
            }}
            onChange={(val) => handleSelectCatalog(val)}
            options={comboboxOptions}
            placeholder="옵션명 초성 검색 또는 직접 입력"
          />
        </div>
        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="text-[11px] font-medium whitespace-nowrap text-[#334155] dark:text-slate-300">수량</label>
          <input
            type="text"
            inputMode="numeric"
            value={qtyStr}
            onChange={(e) => setQtyStr(formatErpInputNumber(e.target.value))}
            placeholder="1"
            className={inputCls}
          />
        </div>

        {mode === "SALE" ? (
          <>
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-medium whitespace-nowrap text-[#334155] dark:text-slate-300">
                옵션단가 (원)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={priceStr}
                onChange={(e) => setPriceStr(formatErpInputNumber(e.target.value))}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-medium whitespace-nowrap text-[#334155] dark:text-slate-300">
                설치공임 (원)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={installFeeStr}
                onChange={(e) => setInstallFeeStr(formatErpInputNumber(e.target.value))}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </>
        ) : (
          <>
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-medium whitespace-nowrap text-[#334155] dark:text-slate-300">
                월추가료 (원)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={monthlyAddonStr}
                onChange={(e) => setMonthlyAddonStr(formatErpInputNumber(e.target.value))}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-medium whitespace-nowrap text-[#334155] dark:text-slate-300">
                일추가료 (원)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={dailyAddonStr}
                onChange={(e) => setDailyAddonStr(formatErpInputNumber(e.target.value))}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </>
        )}

        <div className="md:col-span-1 flex items-end">
          <button
            type="button"
            onClick={handleAddOption}
            disabled={!customName.trim()}
            className="w-full h-7 px-2 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>추가</span>
          </button>
        </div>
      </div>

      {options.length > 0 && (
        <div className="flex flex-col gap-1 mt-1 border-t border-[#c4b6a0] dark:border-slate-700 pt-1.5">
          {options.map((opt, idx) => (
            <div
              key={`${opt.optionName}-${idx}`}
              className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 text-[11px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold truncate">{opt.optionName}</span>
                <span className="font-mono opacity-75 shrink-0">x{opt.qty}</span>
                {opt.specSummary && (
                  <span className="opacity-60 truncate hidden sm:inline">{opt.specSummary}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono">
                {mode === "SALE" ? (
                  <span>
                    단가 {formatErpCurrency(opt.unitPrice || 0)} + 공임{" "}
                    {formatErpCurrency(opt.installFee || 0)}
                  </span>
                ) : (
                  <span>
                    월 +{formatErpCurrency((opt.monthlyAddonRate || 0) * opt.qty)} / 일 +
                    {formatErpCurrency((opt.dailyAddonRate || 0) * opt.qty)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-0.5 rounded text-rose-600 hover:bg-rose-500/10"
                  title="제거"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
