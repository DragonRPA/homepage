"use client";

import React, { useMemo } from "react";
import { ShieldCheck, X, Save, Trash2, Wrench, Clock, Plus } from "lucide-react";
import {
  cleanErpNumber,
  formatErpCurrency,
  formatErpInputNumber,
  formatErpNumber,
  toErpInputString,
} from "@/lib/erpFormat";
import {
  addMonthsMinusOneDay,
  type AttachedForkliftOption,
  type ForkliftWarrantyStatus,
} from "@/lib/forkliftDomain";
import { SearchSelectCombobox, type SearchSelectOption } from "../SearchSelectCombobox";

export interface WarrantyClaimItem {
  id: number;
  warrantyId: number;
  chassisNo: string;
  claimDate: string;
  operatingHours: number;
  claimType: "WARRANTY_FREE" | "PAID_REPAIR" | "INSPECTION" | string;
  symptom: string;
  resolution: string;
  partsUsed: string[];
  repairCost: number;
  billedAmount: number;
  technicianName: string;
  status: string;
  memo: string;
}

export interface WarrantyRecord {
  id: number;
  warrantyNo: string;
  chassisNo: string;
  sourceType: "SALE" | "RENTAL_ASSET" | "MANUAL" | string;
  sourceId: number | null;
  assetId: number | null;
  assetNo: string | null;
  productId: number | null;
  modelName: string;
  manufacturer: string;
  partnerId: number | null;
  customerName: string;
  siteName: string;
  deliveryDate: string;
  warrantyStartDate: string;
  warrantyMonths: number;
  warrantyEndDate: string;
  warrantyHours: number;
  currentOperatingHours: number;
  attachedOptions: AttachedForkliftOption[];
  status: ForkliftWarrantyStatus;
  daysRemaining: number | null;
  hoursRemaining: number | null;
  triggerReason: string;
  claimCount: number;
  totalRepairCost: number;
  totalBilledAmount: number;
  memo: string;
  claims: WarrantyClaimItem[];
}

export interface WarrantyEditFormState {
  chassisNo: string;
  modelName: string;
  manufacturer: string;
  customerName: string;
  siteName: string;
  deliveryDate: string;
  warrantyStartDate: string;
  warrantyMonths: string;
  warrantyEndDate: string;
  warrantyHours: string;
  currentOperatingHours: string;
  memo: string;
}

export interface WarrantyClaimFormState {
  claimDate: string;
  claimType: "WARRANTY_FREE" | "PAID_REPAIR" | "INSPECTION";
  claimHours: string;
  claimSymptom: string;
  claimCausePart: string;
  claimResolution: string;
  claimRepairCost: string;
  claimBilledAmount: string;
  claimTechName: string;
  claimMemo: string;
}

export interface WarrantyAddFormState {
  assetId: string;
  partnerId: number | null;
  chassisNo: string;
  modelName: string;
  manufacturer: string;
  customerName: string;
  siteName: string;
  deliveryDate: string;
  startDate: string;
  months: string;
  endDate: string;
  warrantyHours: string;
  operatingHours: string;
  memo: string;
}

interface WarrantyDossierAndAddModalProps {
  selectedWarranty: WarrantyRecord | null;
  showAddModal: boolean;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  editForm: WarrantyEditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<WarrantyEditFormState>>;
  populateEditForm: (w: WarrantyRecord) => void;
  onCloseDossier: () => void;
  onSaveWarrantyEdit: (e: React.FormEvent) => void;
  onDeleteWarranty: () => void;
  showClaimForm: boolean;
  setShowClaimForm: React.Dispatch<React.SetStateAction<boolean>>;
  claimForm: WarrantyClaimFormState;
  setClaimForm: React.Dispatch<React.SetStateAction<WarrantyClaimFormState>>;
  onAddClaim: (e: React.FormEvent) => void;
  onDeleteClaim: (claimId: number) => void;
  assets: any[];
  partners: any[];
  addForm: WarrantyAddFormState;
  setAddForm: React.Dispatch<React.SetStateAction<WarrantyAddFormState>>;
  onSelectAssetForAdd: (idVal: string) => void;
  onCreateWarranty: (e: React.FormEvent) => void;
  onCloseAddModal: () => void;
  renderStatusBadge: (status: ForkliftWarrantyStatus) => React.ReactNode;
  sourceLabels: Record<string, string>;
}

const CLAIM_TYPE_LABELS: Record<string, string> = {
  WARRANTY_FREE: "무상보증 AS",
  PAID_REPAIR: "유상수리",
  INSPECTION: "정기점검",
};

const inputCls =
  "h-8 px-2.5 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs";

export const WarrantyDossierAndAddModal: React.FC<WarrantyDossierAndAddModalProps> = ({
  selectedWarranty,
  showAddModal,
  isEditing,
  setIsEditing,
  editForm,
  setEditForm,
  populateEditForm,
  onCloseDossier,
  onSaveWarrantyEdit,
  onDeleteWarranty,
  showClaimForm,
  setShowClaimForm,
  claimForm,
  setClaimForm,
  onAddClaim,
  onDeleteClaim,
  assets,
  partners,
  addForm,
  setAddForm,
  onSelectAssetForAdd,
  onCreateWarranty,
  onCloseAddModal,
  renderStatusBadge,
  sourceLabels,
}) => {
  const assetOptions = useMemo<SearchSelectOption[]>(() => {
    return assets.map((a) => ({
      value: String(a.id),
      label: `[${a.assetNo}] ${a.modelName} ${a.serialNo ? `(차대: ${a.serialNo})` : ""}`,
      subLabel: `${a.manufacturer || "-"} · 가동 ${formatErpNumber(a.operatingHours || 0)}hr · ${a.currentCustomer || "미배치"}`,
      searchKeywords: [a.assetNo, a.serialNo, a.modelName, a.manufacturer, a.currentCustomer],
    }));
  }, [assets]);

  const partnerOptions = useMemo<SearchSelectOption[]>(() => {
    return partners.map((p) => ({
      value: String(p.id),
      label: p.name,
      subLabel: p.businessNo || p.ceoName || undefined,
      searchKeywords: [p.name, p.businessNo, p.ceoName],
    }));
  }, [partners]);

  return (
    <>
      {/* Slide-Over Dossier */}
      {selectedWarranty && (
        <aside className="w-[460px] shrink-0 bg-[#f4efe4] border border-[#b5a894] rounded flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          {/* Dossier Header */}
          <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] flex items-center justify-between gap-2 dark:bg-slate-950 dark:border-slate-800">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-[#1d4ed8] truncate">
                  {selectedWarranty.chassisNo}
                </span>
                {renderStatusBadge(selectedWarranty.status)}
              </div>
              <span className="text-[11px] text-[#57534e] dark:text-slate-400 truncate">
                {selectedWarranty.modelName || "-"} · {selectedWarranty.warrantyNo}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    populateEditForm(selectedWarranty);
                    setIsEditing(true);
                  }}
                  className="h-7 px-2 rounded bg-[#ebe5d8] hover:bg-[#dcd4c4] border border-[#b5a894] text-[11px] font-bold whitespace-nowrap"
                >
                  수정
                </button>
              )}
              <button
                type="button"
                onClick={onDeleteWarranty}
                className="h-7 px-2 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-600/35 text-rose-800 dark:text-rose-300 text-[11px] font-bold whitespace-nowrap"
              >
                삭제
              </button>
              <button type="button" onClick={onCloseDossier} className="p-1 rounded hover:bg-black/10">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dossier Body */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 text-xs">
            {isEditing ? (
              <form
                onSubmit={onSaveWarrantyEdit}
                className="flex flex-col gap-2.5 p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70 dark:bg-slate-800/40 dark:border-slate-700"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">차대번호 *</label>
                    <input type="text" required value={editForm.chassisNo} onChange={(e) => setEditForm({ ...editForm, chassisNo: e.target.value })} className={`${inputCls} font-mono font-bold`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">모델명</label>
                    <input type="text" value={editForm.modelName} onChange={(e) => setEditForm({ ...editForm, modelName: e.target.value })} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">제조사</label>
                    <input type="text" value={editForm.manufacturer} onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">납품/출고일</label>
                    <input type="date" value={editForm.deliveryDate} onChange={(e) => setEditForm({ ...editForm, deliveryDate: e.target.value })} className={`${inputCls} font-mono`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">고객사</label>
                    <input type="text" value={editForm.customerName} onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">현장명</label>
                    <input type="text" value={editForm.siteName} onChange={(e) => setEditForm({ ...editForm, siteName: e.target.value })} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">보증 시작일</label>
                    <input
                      type="date"
                      value={editForm.warrantyStartDate}
                      onChange={(e) => {
                        const s = e.target.value;
                        const m = cleanErpNumber(editForm.warrantyMonths) || 12;
                        setEditForm({
                          ...editForm,
                          warrantyStartDate: s,
                          warrantyEndDate: s ? addMonthsMinusOneDay(s, m) : editForm.warrantyEndDate,
                        });
                      }}
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">보증 기간 (개월)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editForm.warrantyMonths}
                      onChange={(e) => {
                        const val = formatErpInputNumber(e.target.value);
                        const m = cleanErpNumber(val);
                        setEditForm({
                          ...editForm,
                          warrantyMonths: val,
                          warrantyEndDate:
                            editForm.warrantyStartDate && m > 0
                              ? addMonthsMinusOneDay(editForm.warrantyStartDate, m)
                              : editForm.warrantyEndDate,
                        });
                      }}
                      className={`${inputCls} font-mono text-right`}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">보증 만료일</label>
                    <input type="date" value={editForm.warrantyEndDate} onChange={(e) => setEditForm({ ...editForm, warrantyEndDate: e.target.value })} className={`${inputCls} font-mono`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">보증 가동시간 한도 (hr)</label>
                    <input type="text" inputMode="numeric" value={editForm.warrantyHours} onChange={(e) => setEditForm({ ...editForm, warrantyHours: formatErpInputNumber(e.target.value) })} className={`${inputCls} font-mono text-right`} />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-[11px] font-semibold">현재 누적 가동시간 (hr)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editForm.currentOperatingHours}
                      onChange={(e) => setEditForm({ ...editForm, currentOperatingHours: formatErpInputNumber(e.target.value) })}
                      className={`${inputCls} font-mono text-right font-bold`}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">메모</label>
                  <textarea
                    rows={2}
                    value={editForm.memo}
                    onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                    className="p-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs"
                  />
                </div>
                <div className="flex justify-end gap-1.5 pt-1">
                  <button type="button" onClick={() => setIsEditing(false)} className="h-7 px-3 rounded border border-[#b5a894] bg-[#f4efe4] text-xs font-semibold whitespace-nowrap">
                    취소
                  </button>
                  <button type="submit" className="h-7 px-3 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                    <Save className="w-3.5 h-3.5" />
                    <span>저장</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70 dark:bg-slate-800/40 dark:border-slate-700 flex flex-col gap-1.5">
                {[
                  [
                    "출처 / 연결자산",
                    `${sourceLabels[selectedWarranty.sourceType] || selectedWarranty.sourceType}${selectedWarranty.assetNo ? ` (${selectedWarranty.assetNo})` : ""}`,
                    "font-semibold",
                  ],
                  [
                    "수요처 / 현장",
                    `${selectedWarranty.customerName || "-"}${selectedWarranty.siteName ? ` / ${selectedWarranty.siteName}` : ""}`,
                    "font-semibold",
                  ],
                  ["납품·출고일", selectedWarranty.deliveryDate || "-", "font-mono"],
                  [
                    "보증기간",
                    `${selectedWarranty.warrantyStartDate} ~ ${selectedWarranty.warrantyEndDate} (${selectedWarranty.warrantyMonths}개월)`,
                    "font-mono font-bold",
                  ],
                  [
                    "가동시간 / 한도",
                    `${formatErpNumber(selectedWarranty.currentOperatingHours)} / ${formatErpNumber(selectedWarranty.warrantyHours)} hr`,
                    "font-mono font-bold",
                  ],
                  ["판정 사유", selectedWarranty.triggerReason, "font-semibold text-[#334155] dark:text-slate-300"],
                ].map(([label, val, cls]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-[#57534e] dark:text-slate-400">{label}</span>
                    <span className={cls}>{val}</span>
                  </div>
                ))}
                {selectedWarranty.attachedOptions.length > 0 && (
                  <div className="pt-1 border-t border-[#b5a894]/70 flex flex-col gap-1">
                    <span className="text-[#57534e] dark:text-slate-400">장착 부착옵션</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedWarranty.attachedOptions.map((opt, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                          {opt.optionName} ×{opt.qty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedWarranty.memo && (
                  <div className="pt-1 border-t border-[#b5a894]/70 text-[#334155] dark:text-slate-300">
                    {selectedWarranty.memo}
                  </div>
                )}
              </div>
            )}

            {/* AS / Periodic Check Claims Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold">
                  <Wrench className="w-3.5 h-3.5 text-[#1d4ed8]" />
                  <span>AS·정비 클레임 이력 ({selectedWarranty.claims.length}건)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClaimForm((prev) => ({
                      ...prev,
                      claimHours: toErpInputString(selectedWarranty.currentOperatingHours || 0),
                    }));
                    setShowClaimForm((prev) => !prev);
                  }}
                  className="h-7 px-2.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3 h-3" />
                  <span>클레임 등록</span>
                </button>
              </div>

              {showClaimForm && (
                <form onSubmit={onAddClaim} className="p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8] dark:bg-slate-800/70 dark:border-slate-700 flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">접수일</label>
                      <input type="date" value={claimForm.claimDate} onChange={(e) => setClaimForm({ ...claimForm, claimDate: e.target.value })} className={`${inputCls} font-mono`} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">구분</label>
                      <select value={claimForm.claimType} onChange={(e) => setClaimForm({ ...claimForm, claimType: e.target.value as any })} className={inputCls}>
                        <option value="WARRANTY_FREE">무상보증 AS</option>
                        <option value="PAID_REPAIR">유상수리</option>
                        <option value="INSPECTION">정기점검</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">가동시간 (hr)</label>
                      <input type="text" inputMode="numeric" value={claimForm.claimHours} onChange={(e) => setClaimForm({ ...claimForm, claimHours: formatErpInputNumber(e.target.value) })} className={`${inputCls} font-mono text-right font-bold`} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">증상 / 점검내용 *</label>
                    <input type="text" required value={claimForm.claimSymptom} onChange={(e) => setClaimForm({ ...claimForm, claimSymptom: e.target.value })} placeholder="예: 마스트 상승 실린더 누유 점검" className={inputCls} />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">원인부품 / 사용부품</label>
                      <input type="text" value={claimForm.claimCausePart} onChange={(e) => setClaimForm({ ...claimForm, claimCausePart: e.target.value })} placeholder="예: 씰키트" className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">담당 기사</label>
                      <input type="text" value={claimForm.claimTechName} onChange={(e) => setClaimForm({ ...claimForm, claimTechName: e.target.value })} placeholder="담당자 성명" className={inputCls} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold">조치 내역</label>
                    <input type="text" value={claimForm.claimResolution} onChange={(e) => setClaimForm({ ...claimForm, claimResolution: e.target.value })} placeholder="예: 씰키트 교체 및 작동 시험 완료" className={inputCls} />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">투입원가 (원)</label>
                      <input type="text" inputMode="numeric" value={claimForm.claimRepairCost} onChange={(e) => setClaimForm({ ...claimForm, claimRepairCost: formatErpInputNumber(e.target.value) })} className={`${inputCls} font-mono text-right`} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold">고객청구액 (원)</label>
                      <input type="text" inputMode="numeric" value={claimForm.claimBilledAmount} onChange={(e) => setClaimForm({ ...claimForm, claimBilledAmount: formatErpInputNumber(e.target.value) })} className={`${inputCls} font-mono text-right`} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-1">
                    <button type="button" onClick={() => setShowClaimForm(false)} className="h-7 px-2.5 rounded border border-[#b5a894] bg-[#f4efe4] text-[11px] font-semibold whitespace-nowrap">
                      취소
                    </button>
                    <button type="submit" className="h-7 px-3 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold whitespace-nowrap">
                      AS 이력 저장
                    </button>
                  </div>
                </form>
              )}

              {selectedWarranty.claims.length === 0 ? (
                <div className="py-6 text-center rounded border border-dashed border-[#b5a894] text-[#57534e] dark:text-slate-400">
                  등록된 AS 클레임 이력이 없습니다.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {selectedWarranty.claims.map((c) => (
                    <div key={c.id} className="p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70 dark:bg-slate-800/50 dark:border-slate-700 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold">{c.claimDate}</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#e2dbcd] border border-[#b5a894] text-[10px] font-bold dark:bg-slate-700">
                            {CLAIM_TYPE_LABELS[c.claimType] || c.claimType}
                          </span>
                          <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-[#57534e] dark:text-slate-400">
                            <Clock className="w-3 h-3" />
                            {formatErpNumber(c.operatingHours)}hr
                          </span>
                        </div>
                        <button type="button" onClick={() => onDeleteClaim(c.id)} className="text-rose-700 hover:text-rose-600 p-0.5" title="삭제">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="font-semibold">{c.symptom}</div>
                      {c.resolution && <div className="text-[11px] text-[#334155] dark:text-slate-300">조치: {c.resolution}</div>}
                      <div className="flex items-center justify-between text-[10px] text-[#57534e] dark:text-slate-400 pt-0.5">
                        <span>
                          {Array.isArray(c.partsUsed) && c.partsUsed.length > 0 ? `부품: ${c.partsUsed.join(", ")}` : ""}
                          {c.technicianName ? ` · 담당: ${c.technicianName}` : ""}
                        </span>
                        <span className="font-mono">
                          원가 {formatErpCurrency(c.repairCost)} / 청구 {formatErpCurrency(c.billedAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Modal: Manual Warranty Registration */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded border border-[#b5a894] bg-[#f4efe4] text-[#0f172a] dark:bg-slate-900 dark:border-slate-700 dark:text-white p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#1d4ed8]" />
                <span>차대번호 보증 수동등록</span>
              </div>
              <button type="button" onClick={onCloseAddModal} className="text-[#57534e] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onCreateWarranty} className="mt-4 flex flex-col gap-3 text-xs">
              <SearchSelectCombobox
                label="기존 렌탈자산 연동 선택 (선택)"
                showChosungBar
                size="sm"
                value={addForm.assetId}
                options={assetOptions}
                onChange={onSelectAssetForAdd}
                placeholder="자산번호·차대번호·모델명으로 검색 시 자동입력"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">차대번호 *</label>
                  <input type="text" required value={addForm.chassisNo} onChange={(e) => setAddForm({ ...addForm, chassisNo: e.target.value })} placeholder="예: FBC-2026-001" className={`${inputCls} font-mono font-bold`} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">모델명</label>
                  <input type="text" value={addForm.modelName} onChange={(e) => setAddForm({ ...addForm, modelName: e.target.value })} placeholder="예: D30S-9" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">제조사</label>
                  <input type="text" value={addForm.manufacturer} onChange={(e) => setAddForm({ ...addForm, manufacturer: e.target.value })} placeholder="두산 / 현대" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <SearchSelectCombobox
                  label="수요처 (고객사)"
                  allowFreeText
                  showChosungBar
                  size="sm"
                  value={addForm.partnerId ? String(addForm.partnerId) : ""}
                  freeTextValue={addForm.customerName}
                  onFreeTextChange={(txt) => setAddForm({ ...addForm, customerName: txt, partnerId: null })}
                  onChange={(val) => {
                    if (!val) {
                      setAddForm({ ...addForm, partnerId: null, customerName: "" });
                      return;
                    }
                    const found = partners.find((p) => String(p.id) === val);
                    if (found) setAddForm({ ...addForm, partnerId: found.id, customerName: found.name });
                  }}
                  options={partnerOptions}
                  placeholder="고객사 검색 또는 직접 입력"
                />
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">현장명</label>
                  <input type="text" value={addForm.siteName} onChange={(e) => setAddForm({ ...addForm, siteName: e.target.value })} placeholder="가동 현장명" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded border border-[#b5a894] bg-[#ebe5d8]/70 dark:bg-slate-800/40 dark:border-slate-700">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">납품·출고일</label>
                  <input type="date" value={addForm.deliveryDate} onChange={(e) => setAddForm({ ...addForm, deliveryDate: e.target.value })} className={`${inputCls} font-mono`} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">보증 시작일</label>
                  <input
                    type="date"
                    value={addForm.startDate}
                    onChange={(e) => {
                      const s = e.target.value;
                      const m = cleanErpNumber(addForm.months);
                      setAddForm({ ...addForm, startDate: s, endDate: s && m > 0 ? addMonthsMinusOneDay(s, m) : addForm.endDate });
                    }}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">보증 기간 (개월)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={addForm.months}
                    onChange={(e) => {
                      const val = formatErpInputNumber(e.target.value);
                      const m = cleanErpNumber(val);
                      setAddForm({ ...addForm, months: val, endDate: addForm.startDate && m > 0 ? addMonthsMinusOneDay(addForm.startDate, m) : addForm.endDate });
                    }}
                    className={`${inputCls} font-mono text-right`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold">보증 만료일</label>
                  <input type="date" value={addForm.endDate} onChange={(e) => setAddForm({ ...addForm, endDate: e.target.value })} className={`${inputCls} font-mono`} />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[11px] font-semibold">보증 가동시간 한도 (hr)</label>
                  <input type="text" inputMode="numeric" value={addForm.warrantyHours} onChange={(e) => setAddForm({ ...addForm, warrantyHours: formatErpInputNumber(e.target.value) })} className={`${inputCls} font-mono text-right font-bold`} />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[11px] font-semibold">현재 가동시간 (hr)</label>
                  <input type="text" inputMode="numeric" value={addForm.operatingHours} onChange={(e) => setAddForm({ ...addForm, operatingHours: formatErpInputNumber(e.target.value) })} className={`${inputCls} font-mono text-right font-bold`} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold">메모</label>
                <textarea
                  rows={2}
                  value={addForm.memo}
                  onChange={(e) => setAddForm({ ...addForm, memo: e.target.value })}
                  className="p-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#b5a894] dark:border-slate-800">
                <button type="button" onClick={onCloseAddModal} className="h-8 px-3 rounded border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] text-xs font-semibold whitespace-nowrap">
                  취소
                </button>
                <button type="submit" className="h-8 px-4 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold whitespace-nowrap">
                  보증 등록 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
