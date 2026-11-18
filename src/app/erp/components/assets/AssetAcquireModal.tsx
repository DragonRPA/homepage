"use client";

import React from "react";
import { Layers, X } from "lucide-react";
import {
  formatErpCurrency,
  formatErpInputNumber,
  cleanErpNumber,
  addMonthsMinusOneDay,
} from "@/lib/erpFormat";
import { SearchSelectCombobox, SearchSelectOption } from "../SearchSelectCombobox";
import ForkliftOptionAttachPanel, { CatalogOptionItem } from "../ForkliftOptionAttachPanel";
import {
  AssetRecord,
  computeNextAssetNo,
  getAssetNoRangePreview,
  NewAssetFormState,
} from "./assetTypes";

interface AssetAcquireModalProps {
  assets: AssetRecord[];
  addForm: NewAssetFormState;
  setAddForm: React.Dispatch<React.SetStateAction<NewAssetFormState>>;
  productComboboxOptions: SearchSelectOption[];
  optionCatalog: CatalogOptionItem[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const AssetAcquireModal: React.FC<AssetAcquireModalProps> = ({
  assets,
  addForm,
  setAddForm,
  productComboboxOptions,
  optionCatalog,
  onSubmit,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-lg border p-5 shadow-2xl erp-login-card flex flex-col gap-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-sm">신규 자산 취득 등록</span>
          </div>
          <button onClick={onClose} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 text-xs">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5 flex flex-col gap-1">
              <label className="font-semibold">시작 자산번호 (DR + yymm + 3자리) *</label>
              <input
                type="text"
                required
                value={addForm.assetNo}
                onChange={(e) => setAddForm({ ...addForm, assetNo: e.target.value })}
                placeholder="예: DR2610001"
                className="h-8 px-2.5 border rounded font-mono font-bold text-blue-700"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="font-semibold">취득 수량 (대) *</label>
              <input
                type="number"
                min={1}
                max={200}
                required
                value={addForm.qty}
                onChange={(e) => setAddForm({ ...addForm, qty: e.target.value })}
                className="h-8 px-2 border rounded font-mono font-bold text-right text-emerald-700"
              />
            </div>
            <div className="col-span-5 flex flex-col gap-1">
              <SearchSelectCombobox
                label="매핑 제품 모델"
                required
                size="sm"
                showChosungBar
                options={productComboboxOptions}
                value={addForm.rentalProductId}
                onChange={(nextVal) => setAddForm({ ...addForm, rentalProductId: nextVal })}
                placeholder="모델명·코드·초성 검색"
              />
            </div>
          </div>

          {parseInt(addForm.qty || "1", 10) > 1 && (
            <div className="px-3 py-1.5 rounded bg-blue-500/10 border border-blue-500/30 text-[11px] font-mono flex items-center justify-between">
              <span className="font-semibold text-blue-700">
                일괄 채번 구간: {getAssetNoRangePreview(addForm.assetNo, addForm.qty, addForm.acquisitionDate, assets)}
              </span>
              <span className="font-bold text-emerald-700">
                총 취득원가 합계: {formatErpCurrency(cleanErpNumber(addForm.acquisitionCost) * (parseInt(addForm.qty || "1", 10) || 1))}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold">차대번호 / S/N (다중 취득 시 쉼표 구분 가능)</label>
              <input
                type="text"
                value={addForm.serialNo}
                onChange={(e) => setAddForm({ ...addForm, serialNo: e.target.value })}
                placeholder={parseInt(addForm.qty || "1", 10) > 1 ? "예: FBC-001, FBC-002 (또는 공란)" : "예: FBC-2026-001"}
                className="h-8 px-2.5 border rounded font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold">소유 구분</label>
              <select
                value={addForm.ownerType}
                onChange={(e) => setAddForm({ ...addForm, ownerType: e.target.value })}
                className="h-8 px-2 border rounded font-bold"
              >
                <option value="OWNED">자사자산 (당사소유 취득)</option>
                <option value="RENTED">외부임차 (전대용 렌탈)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold">취득 일자</label>
              <input
                type="date"
                value={addForm.acquisitionDate}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  const nextNo = computeNextAssetNo(nextDate, assets);
                  setAddForm({ ...addForm, acquisitionDate: nextDate, assetNo: nextNo });
                }}
                className="h-8 px-2 border rounded"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold whitespace-nowrap">대당 취득 원가 (원)</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatErpInputNumber(addForm.acquisitionCost)}
                onChange={(e) => {
                  const raw = String(cleanErpNumber(e.target.value));
                  setAddForm({
                    ...addForm,
                    acquisitionCost: raw,
                    salvageValue: String(Math.round(Number(raw) * 0.1)),
                  });
                }}
                className="h-8 px-2.5 border rounded font-mono font-bold text-right"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold whitespace-nowrap">대당 잔존 가치 (원)</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatErpInputNumber(addForm.salvageValue)}
                onChange={(e) =>
                  setAddForm({ ...addForm, salvageValue: String(cleanErpNumber(e.target.value)) })
                }
                className="h-8 px-2.5 border rounded font-mono font-bold text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold">내용연수 (년)</label>
              <input
                type="number"
                min={1}
                value={addForm.usefulLifeYears}
                onChange={(e) => {
                  const yrs = Math.max(1, parseInt(e.target.value || "1", 10));
                  setAddForm({
                    ...addForm,
                    usefulLifeYears: String(yrs),
                    usefulLifeMonths: String(yrs * 12),
                  });
                }}
                className="h-8 px-2.5 border rounded font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold">내용월수 (개월)</label>
              <input
                type="number"
                min={1}
                value={addForm.usefulLifeMonths}
                onChange={(e) => {
                  const mos = Math.max(1, parseInt(e.target.value || "1", 10));
                  setAddForm({
                    ...addForm,
                    usefulLifeMonths: String(mos),
                    usefulLifeYears: String(Math.max(1, Math.ceil(mos / 12))),
                  });
                }}
                className="h-8 px-2.5 border rounded font-mono font-bold text-purple-700"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold">공급처 / 임차처 명칭</label>
              <input
                type="text"
                value={addForm.supplier}
                onChange={(e) => setAddForm({ ...addForm, supplier: e.target.value })}
                placeholder="예: (주)컴퓨존 B2B"
                className="h-8 px-2.5 border rounded"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold">초기 대여 고객사 및 현장 (옵션)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={addForm.currentCustomer}
                onChange={(e) => setAddForm({ ...addForm, currentCustomer: e.target.value })}
                placeholder="대여 고객사명 (미배치 시 공란)"
                className="h-8 px-2.5 border rounded"
              />
              <input
                type="text"
                value={addForm.currentSite}
                onChange={(e) => setAddForm({ ...addForm, currentSite: e.target.value })}
                placeholder="배치 현장명"
                className="h-8 px-2.5 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70">
            <div className="flex flex-col gap-1">
              <label className="font-semibold">초기 가동시간 (hr)</label>
              <input
                type="text"
                inputMode="numeric"
                value={addForm.operatingHours}
                onChange={(e) =>
                  setAddForm({ ...addForm, operatingHours: formatErpInputNumber(e.target.value) })
                }
                className="h-8 px-2 border rounded bg-[#f4efe4] font-mono text-right"
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold">보증 시작일</label>
              <input
                type="date"
                value={addForm.warrantyStartDate}
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    warrantyStartDate: e.target.value,
                    warrantyEndDate: e.target.value ? addMonthsMinusOneDay(e.target.value, 12) : "",
                  })
                }
                className="h-8 px-2 border rounded bg-[#f4efe4] font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold">보증 만료일</label>
              <input
                type="date"
                value={addForm.warrantyEndDate}
                onChange={(e) => setAddForm({ ...addForm, warrantyEndDate: e.target.value })}
                className="h-8 px-2 border rounded bg-[#f4efe4] font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold">보증 가동시간 (hr)</label>
              <input
                type="text"
                inputMode="numeric"
                value={addForm.warrantyHours}
                onChange={(e) =>
                  setAddForm({ ...addForm, warrantyHours: formatErpInputNumber(e.target.value) })
                }
                className="h-8 px-2 border rounded bg-[#f4efe4] font-mono text-right"
                placeholder="2,000"
              />
            </div>
          </div>

          <ForkliftOptionAttachPanel
            mode="RENTAL"
            options={addForm.attachedOptions}
            onChange={(next) => setAddForm({ ...addForm, attachedOptions: next })}
            catalogOptions={optionCatalog}
            title="초기 부착옵션 선택"
          />

          <div className="flex flex-col gap-1">
            <label className="font-semibold">취득 메모 및 특이사항</label>
            <textarea
              value={addForm.memo}
              onChange={(e) => setAddForm({ ...addForm, memo: e.target.value })}
              placeholder="보증기간, 초기 검수 상태, 설치 메모 등"
              rows={2}
              className="p-2 border rounded"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border text-xs hover:opacity-80"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              {parseInt(addForm.qty || "1", 10) > 1
                ? `자산 ${addForm.qty}대 일괄 취득 확정`
                : "자산 취득 확정"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
