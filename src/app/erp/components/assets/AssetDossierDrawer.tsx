"use client";

import React from "react";
import {
  Layers,
  Save,
  Edit2,
  X,
  Package,
  Calculator,
  History,
} from "lucide-react";
import {
  formatErpNumber,
  formatErpCurrency,
  formatErpInputNumber,
  toErpInputString,
  cleanErpNumber,
  formatAttachedOptionsSummary,
  normalizeAttachedOptions,
} from "@/lib/erpFormat";
import ForkliftOptionAttachPanel, { CatalogOptionItem } from "../ForkliftOptionAttachPanel";
import { AssetLog, AssetRecord } from "./assetTypes";

interface AssetDossierDrawerProps {
  selectedAsset: AssetRecord;
  isAdmin: boolean;
  isEditingDossier: boolean;
  onStartEdit: () => void;
  onSaveDossier: () => void;
  onClose: () => void;
  editForm: Partial<AssetRecord>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<AssetRecord>>>;
  optionCatalog: CatalogOptionItem[];
  assetLogs: AssetLog[];
  loadingLogs: boolean;
  newLogMemo: string;
  onChangeNewLogMemo: (val: string) => void;
  onAddLog: () => void;
}

export const AssetDossierDrawer: React.FC<AssetDossierDrawerProps> = ({
  selectedAsset,
  isAdmin,
  isEditingDossier,
  onStartEdit,
  onSaveDossier,
  onClose,
  editForm,
  setEditForm,
  optionCatalog,
  assetLogs,
  loadingLogs,
  newLogMemo,
  onChangeNewLogMemo,
  onAddLog,
}) => {
  return (
    <aside className="w-[420px] border-l flex flex-col h-full shrink-0 shadow-lg overflow-hidden select-none bg-[var(--bg-card)]">
      {/* Dossier Header */}
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold font-mono text-blue-700 truncate">{selectedAsset.assetNo}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  selectedAsset.status === "RENTED"
                    ? "bg-blue-600 text-white"
                    : selectedAsset.status === "AVAILABLE"
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-600 text-white"
                }`}
              >
                {selectedAsset.status === "RENTED"
                  ? "대여중"
                  : selectedAsset.status === "AVAILABLE"
                  ? "임대가능"
                  : selectedAsset.status}
              </span>
            </div>
            <span className="text-[10px] opacity-70 truncate">{selectedAsset.modelName}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isEditingDossier ? (
            <button
              onClick={onSaveDossier}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <Save className="w-3.5 h-3.5 text-white" />
              <span className="text-white">저장</span>
            </button>
          ) : (
            isAdmin && (
              <button
                onClick={onStartEdit}
                className="px-2 py-1 rounded border text-xs font-semibold flex items-center gap-1 hover:opacity-80"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>수정</span>
              </button>
            )
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10 opacity-70"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dossier Content Body */}
      <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-4 text-xs">
        {/* Asset Information Form / Display */}
        <div className="flex flex-col gap-2">
          <span className="font-bold text-[11px] opacity-75 flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-blue-600" />
            <span>자산 식별 및 소유 속성</span>
          </span>

          {isEditingDossier ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">자산 상태</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="h-7 px-2 border rounded text-xs font-semibold"
                  >
                    <option value="AVAILABLE">임대가능</option>
                    <option value="RENTED">대여중</option>
                    <option value="OUTBOUND_PENDING">출고대기</option>
                    <option value="REPAIRING">정비/수리중</option>
                    <option value="DISPOSED">폐기/매각</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">소유 구분</label>
                  <select
                    value={editForm.ownerType}
                    onChange={(e) => setEditForm({ ...editForm, ownerType: e.target.value as any })}
                    className="h-7 px-2 border rounded text-xs"
                  >
                    <option value="OWNED">자사자산</option>
                    <option value="RENTED">외부임차</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">차대번호 / S/N</label>
                  <input
                    type="text"
                    value={editForm.serialNo || ""}
                    onChange={(e) => setEditForm({ ...editForm, serialNo: e.target.value })}
                    className="h-7 px-2 border rounded text-xs font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">계약번호</label>
                  <input
                    type="text"
                    value={editForm.contractNo || ""}
                    onChange={(e) => setEditForm({ ...editForm, contractNo: e.target.value })}
                    className="h-7 px-2 border rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">누적 가동시간 (hr)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatErpInputNumber(String(editForm.operatingHours ?? 0))}
                    onChange={(e) =>
                      setEditForm({ ...editForm, operatingHours: cleanErpNumber(e.target.value) })
                    }
                    className="h-7 px-2 border rounded text-xs font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">보증 가동시간 (hr)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatErpInputNumber(String(editForm.warrantyHours ?? 2000))}
                    onChange={(e) =>
                      setEditForm({ ...editForm, warrantyHours: cleanErpNumber(e.target.value) })
                    }
                    className="h-7 px-2 border rounded text-xs font-mono text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">보증 시작일</label>
                  <input
                    type="date"
                    value={editForm.warrantyStartDate ? String(editForm.warrantyStartDate).slice(0, 10) : ""}
                    onChange={(e) => setEditForm({ ...editForm, warrantyStartDate: e.target.value })}
                    className="h-7 px-2 border rounded text-xs font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">보증 만료일</label>
                  <input
                    type="date"
                    value={editForm.warrantyEndDate ? String(editForm.warrantyEndDate).slice(0, 10) : ""}
                    onChange={(e) => setEditForm({ ...editForm, warrantyEndDate: e.target.value })}
                    className="h-7 px-2 border rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">대여 고객사</label>
                  <input
                    type="text"
                    value={editForm.currentCustomer || ""}
                    onChange={(e) => setEditForm({ ...editForm, currentCustomer: e.target.value })}
                    className="h-7 px-2 border rounded text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">배치 현장명</label>
                  <input
                    type="text"
                    value={editForm.currentSite || ""}
                    onChange={(e) => setEditForm({ ...editForm, currentSite: e.target.value })}
                    className="h-7 px-2 border rounded text-xs"
                  />
                </div>
              </div>

              <ForkliftOptionAttachPanel
                mode="RENTAL"
                options={normalizeAttachedOptions(editForm.attachedOptions)}
                onChange={(next) => setEditForm({ ...editForm, attachedOptions: next })}
                catalogOptions={optionCatalog}
                title="장착 부착옵션 (렌탈 과금 가산)"
              />

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium">특이사항 및 메모</label>
                <textarea
                  value={editForm.memo || ""}
                  onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                  rows={2}
                  className="p-1.5 border rounded text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded border flex flex-col gap-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="opacity-60">소유 / 공급처</span>
                <span className="font-semibold">
                  {selectedAsset.ownerType === "OWNED" ? "자사자산" : "외부임차"} ({selectedAsset.supplier || selectedAsset.renter || "본사"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">차대번호 / S/N</span>
                <span className="font-bold">{selectedAsset.serialNo || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">누적 가동시간</span>
                <span className="font-bold text-blue-700">
                  {formatErpNumber(selectedAsset.operatingHours || 0)} hr
                </span>
              </div>
              {(selectedAsset.warrantyStartDate || selectedAsset.warrantyEndDate) && (
                <div className="flex justify-between">
                  <span className="opacity-60">보증기간 / 보증시간</span>
                  <span className="font-semibold">
                    {selectedAsset.warrantyStartDate ? String(selectedAsset.warrantyStartDate).slice(0, 10) : "-"} ~{" "}
                    {selectedAsset.warrantyEndDate ? String(selectedAsset.warrantyEndDate).slice(0, 10) : "-"} (
                    {formatErpNumber(selectedAsset.warrantyHours || 2000)}hr)
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="opacity-60">현재 대여 고객사</span>
                <span className="text-emerald-800 font-bold">{selectedAsset.currentCustomer || "미배치 (창고보관)"}</span>
              </div>
              {selectedAsset.currentSite && (
                <div className="flex justify-between">
                  <span className="opacity-60">배치 현장</span>
                  <span>{selectedAsset.currentSite}</span>
                </div>
              )}
              {selectedAsset.contractNo && (
                <div className="flex justify-between">
                  <span className="opacity-60">연결 계약번호</span>
                  <span className="text-blue-700 font-bold">{selectedAsset.contractNo}</span>
                </div>
              )}
              {selectedAsset.customSpec && (
                <div className="flex justify-between">
                  <span className="opacity-60">개별 커스텀 사양</span>
                  <span>{selectedAsset.customSpec}</span>
                </div>
              )}
              {normalizeAttachedOptions(selectedAsset.attachedOptions).length > 0 && (
                <div className="border-t pt-1 mt-1 flex flex-col gap-0.5 font-sans">
                  <span className="opacity-60">장착 부착옵션</span>
                  <span className="font-semibold text-amber-800">
                    {formatAttachedOptionsSummary(selectedAsset.attachedOptions)}
                  </span>
                </div>
              )}
              {selectedAsset.memo && (
                <div className="border-t pt-1 mt-1 flex flex-col gap-0.5 font-sans">
                  <span className="opacity-60">관리 메모</span>
                  <span>{selectedAsset.memo}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Depreciation Calculator & Financial Audit */}
        <div className="flex flex-col gap-2">
          <span className="font-bold text-[11px] opacity-75 flex items-center gap-1">
            <Calculator className="w-3.5 h-3.5 text-purple-600" />
            <span>감가상각 정액법 실시간 회계 대차대조</span>
          </span>

          {isEditingDossier ? (
            <div className="p-2.5 rounded border flex flex-col gap-2 bg-purple-500/5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">취득일자</label>
                  <input
                    type="date"
                    value={editForm.acquisitionDate ? String(editForm.acquisitionDate).slice(0, 10) : ""}
                    onChange={(e) => setEditForm({ ...editForm, acquisitionDate: e.target.value })}
                    className="h-7 px-2 border rounded text-xs font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium whitespace-nowrap">취득원가 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.acquisitionCost ? toErpInputString(editForm.acquisitionCost) : ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        acquisitionCost: cleanErpNumber(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="h-7 px-2 border rounded text-xs font-mono text-right font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">내용연수 (년)</label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.usefulLifeYears ?? 4}
                    onChange={(e) => {
                      const yrs = Math.max(1, parseInt(e.target.value || "1", 10));
                      setEditForm({ ...editForm, usefulLifeYears: yrs, usefulLifeMonths: yrs * 12 });
                    }}
                    className="h-7 px-2 border rounded text-xs font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">내용월수 (개월)</label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.usefulLifeMonths ?? (editForm.usefulLifeYears || 4) * 12}
                    onChange={(e) => {
                      const mos = Math.max(1, parseInt(e.target.value || "1", 10));
                      setEditForm({
                        ...editForm,
                        usefulLifeMonths: mos,
                        usefulLifeYears: Math.max(1, Math.ceil(mos / 12)),
                      });
                    }}
                    className="h-7 px-2 border rounded text-xs font-mono font-bold text-purple-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium whitespace-nowrap">잔존가치 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.salvageValue ? toErpInputString(editForm.salvageValue) : ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        salvageValue: cleanErpNumber(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="h-7 px-2 border rounded text-xs font-mono text-right font-bold"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded border flex flex-col gap-1.5 font-mono text-[11px] bg-purple-500/5">
              <div className="flex justify-between">
                <span className="opacity-60">취득일자 / 내용월수</span>
                <span>
                  {selectedAsset.acquisitionDate ? String(selectedAsset.acquisitionDate).slice(0, 10) : "-"} (
                  {(selectedAsset.usefulLifeMonths || selectedAsset.usefulLifeYears * 12) <= 1
                    ? "1개월 전액상각"
                    : `${selectedAsset.usefulLifeYears}년 / ${selectedAsset.usefulLifeMonths || selectedAsset.usefulLifeYears * 12}개월`}
                  )
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">취득원가</span>
                <span className="font-bold">{formatErpCurrency(selectedAsset.acquisitionCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">잔존가치</span>
                <span>{formatErpCurrency(selectedAsset.salvageValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">월 감가상각비</span>
                <span className="text-rose-700 font-bold">{formatErpCurrency(selectedAsset.monthlyDepreciation)} / 월</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">감가상각 누계액</span>
                <span className="text-rose-700">{formatErpCurrency(selectedAsset.accumulatedDepreciation)}</span>
              </div>
              <div className="border-t pt-1 mt-1 flex justify-between text-xs">
                <span className="font-bold opacity-80">현재 잔존 장부가액</span>
                <span className="font-bold text-purple-800 font-mono">
                  {formatErpCurrency(selectedAsset.bookValue)}
                </span>
              </div>
              <div className="border-t pt-1 mt-1 flex justify-between text-xs">
                <span className="font-bold opacity-80">누적 렌탈매출 기여액</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {formatErpCurrency(selectedAsset.cumulativeRevenue || 0)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold opacity-80">누적 순수익 (매출-상각)</span>
                <span className={`font-bold font-mono ${(selectedAsset.cumulativeNetProfit || 0) >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                  {(selectedAsset.cumulativeNetProfit || 0) >= 0
                    ? `+${formatErpCurrency(selectedAsset.cumulativeNetProfit || 0)}`
                    : formatErpCurrency(selectedAsset.cumulativeNetProfit || 0)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Lifecycle Audit History Timeline */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] opacity-75 flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>자산 생애주기 통합 감사 이력 ({formatErpNumber(assetLogs.length)}건)</span>
            </span>
          </div>

          {/* Add Quick Maintenance Log Input */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newLogMemo}
              onChange={(e) => onChangeNewLogMemo(e.target.value)}
              placeholder="정비 조치 / 입출고 메모 입력"
              className="h-7 px-2 border rounded text-xs flex-1"
            />
            <button
              onClick={onAddLog}
              disabled={!newLogMemo.trim()}
              className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold disabled:opacity-50"
            >
              이력 기록
            </button>
          </div>

          {loadingLogs ? (
            <div className="p-3 text-center text-xs opacity-60 font-mono">이력 조회 중...</div>
          ) : assetLogs.length === 0 ? (
            <div className="p-3 text-center border rounded text-xs opacity-60">등록된 이력이 없습니다.</div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
              {assetLogs.map((log) => (
                <div key={log.id} className="p-2 rounded border flex flex-col gap-0.5 text-[11px]">
                  <div className="flex items-center justify-between font-mono">
                    <span
                      className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                        log.eventType === "ACQUISITION"
                          ? "bg-emerald-600 text-white"
                          : log.eventType === "OUTBOUND"
                          ? "bg-blue-600 text-white"
                          : log.eventType === "INBOUND"
                          ? "bg-teal-600 text-white"
                          : log.eventType === "REPAIR"
                          ? "bg-amber-600 text-white"
                          : "bg-slate-600 text-white"
                      }`}
                    >
                      {log.eventType === "ACQUISITION"
                        ? "자산취득"
                        : log.eventType === "OUTBOUND"
                        ? "출고대여"
                        : log.eventType === "INBOUND"
                        ? "회수입고"
                        : log.eventType === "REPAIR"
                        ? "정비조치"
                        : log.eventType}
                    </span>
                    <span className="opacity-60">{log.eventDate}</span>
                  </div>
                  <span className="font-sans leading-relaxed">{log.memo || "-"}</span>
                  {log.customerName && (
                    <span className="text-[10px] opacity-70">
                      거래처: {log.customerName} {log.siteName ? `(${log.siteName})` : ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
