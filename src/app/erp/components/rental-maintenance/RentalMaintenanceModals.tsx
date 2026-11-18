"use client";

import React from "react";
import { ArrowRightLeft, ClipboardCheck, Package, Plus, Trash2, Truck, X } from "lucide-react";
import SearchSelectCombobox, { type SearchSelectOption } from "../SearchSelectCombobox";
import { DEFAULT_WEAR_COMPONENTS, PART_TRANSFER_TYPE_LABELS, type MaintenanceResultStatus, type MaintenanceType, type PartStockSource, type PartTransferType, type PmChecklistItem, type PmChecklistStatus } from "@/lib/rentalMaintenanceDomain";
import { sanitizeDecimalText, type EmployeeOption, type PartDraftLine, type ServiceVehicleRecord } from "./rentalMaintenanceTypes";
import { cleanErpNumber, formatErpInputNumber, formatErpNumber } from "@/lib/erpFormat";

export interface MaintModalProps {
  addMaintPartRow: () => void;
  assetComboOptions: SearchSelectOption[];
  buildPartComboOptions: (sourceType: PartStockSource, vehicleIdStr?: string) => SearchSelectOption[];
  editingMaintId: number | null;
  editingMaintNo: string;
  employeeComboOptions: SearchSelectOption[];
  employees: EmployeeOption[];
  handleSaveMaintenance: () => Promise<void>;
  handleSelectMaintAsset: (newAssetId: string) => void;
  maintFormAssetId: string;
  maintFormChecklist: PmChecklistItem[];
  maintFormDate: string;
  maintFormHours: string;
  maintFormLaborCost: string;
  maintFormNextPm: string;
  maintFormParts: PartDraftLine[];
  maintFormResetCodes: string[];
  maintFormResult: MaintenanceResultStatus;
  maintFormStatusAfter: string;
  maintFormSymptom: string;
  maintFormTechId: string;
  maintFormTechName: string;
  maintFormTitle: string;
  maintFormTravelCost: string;
  maintFormType: MaintenanceType;
  maintFormVehicleId: string;
  maintFormWork: string;
  maintGrandTotalCost: number;
  maintPartsTotalCost: number;
  savingMaint: boolean;
  setMaintFormChecklist: React.Dispatch<React.SetStateAction<PmChecklistItem[]>>;
  setMaintFormDate: React.Dispatch<React.SetStateAction<string>>;
  setMaintFormHours: React.Dispatch<React.SetStateAction<string>>;
  setMaintFormLaborCost: React.Dispatch<React.SetStateAction<string>>;
  setMaintFormNextPm: React.Dispatch<React.SetStateAction<string>>;
  setMaintFormParts: React.Dispatch<React.SetStateAction<PartDraftLine[]>>;
  setMaintFormResetCodes: React.Dispatch<React.SetStateAction<string[]>>;
  setMaintFormResult: React.Dispatch<React.SetStateAction<MaintenanceResultStatus>>;
  setMaintFormStatusAfter: React.Dispatch<React.SetStateAction<string>>;
  setMaintFormSymptom: React.Dispatch<React.SetStateAction<string>>;
  setMaintFormTechId: React.Dispatch<React.SetStateAction<string>>;
  setMaintFormTechName: React.Dispatch<React.SetStateAction<string>>;
  setMaintFormTitle: React.Dispatch<React.SetStateAction<string>>;
  setMaintFormTravelCost: React.Dispatch<React.SetStateAction<string>>;
  setMaintFormType: React.Dispatch<React.SetStateAction<MaintenanceType>>;
  setMaintFormVehicleId: React.Dispatch<React.SetStateAction<string>>;
  setMaintFormWork: React.Dispatch<React.SetStateAction<string>>;
  setShowMaintModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowQuickPartModal: React.Dispatch<React.SetStateAction<boolean>>;
  showMaintModal: boolean;
  updateMaintPartRow: (key: string, patch: Partial<PartDraftLine>) => void;
  vehicleComboOptions: SearchSelectOption[];
  vehicles: ServiceVehicleRecord[];
}

export const MaintModal: React.FC<MaintModalProps> = ({
  addMaintPartRow,
  assetComboOptions,
  buildPartComboOptions,
  editingMaintId,
  editingMaintNo,
  employeeComboOptions,
  employees,
  handleSaveMaintenance,
  handleSelectMaintAsset,
  maintFormAssetId,
  maintFormChecklist,
  maintFormDate,
  maintFormHours,
  maintFormLaborCost,
  maintFormNextPm,
  maintFormParts,
  maintFormResetCodes,
  maintFormResult,
  maintFormStatusAfter,
  maintFormSymptom,
  maintFormTechId,
  maintFormTechName,
  maintFormTitle,
  maintFormTravelCost,
  maintFormType,
  maintFormVehicleId,
  maintFormWork,
  maintGrandTotalCost,
  maintPartsTotalCost,
  savingMaint,
  setMaintFormChecklist,
  setMaintFormDate,
  setMaintFormHours,
  setMaintFormLaborCost,
  setMaintFormNextPm,
  setMaintFormParts,
  setMaintFormResetCodes,
  setMaintFormResult,
  setMaintFormStatusAfter,
  setMaintFormSymptom,
  setMaintFormTechId,
  setMaintFormTechName,
  setMaintFormTitle,
  setMaintFormTravelCost,
  setMaintFormType,
  setMaintFormVehicleId,
  setMaintFormWork,
  setShowMaintModal,
  setShowQuickPartModal,
  showMaintModal,
  updateMaintPartRow,
  vehicleComboOptions,
  vehicles,
}) => {
  return (
    <>
      {showMaintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[92vh] bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg shadow-xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-slate-800 dark:text-amber-400" />
                <h3 className="text-sm font-bold">
                  {editingMaintId ? `정비활동 수정 (${editingMaintNo})` : "정비활동 등록"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMaintModal(false)}
                className="p-1 rounded hover:bg-[#dcd4c4] dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
              {/* Row 1: Asset + Date + Type + Result + Hours */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2 flex flex-col gap-1">
                  <SearchSelectCombobox
                    label="렌탈자산"
                    required
                    options={assetComboOptions}
                    value={maintFormAssetId}
                    onChange={handleSelectMaintAsset}
                    disabled={editingMaintId !== null}
                    placeholder="차대번호·모델·거래처 검색"
                    emptyMessage="일치하는 렌탈자산이 없습니다."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    정비일자
                  </label>
                  <input
                    type="date"
                    value={maintFormDate}
                    onChange={(e) => setMaintFormDate(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    정비유형
                  </label>
                  <select
                    value={maintFormType}
                    onChange={(e) => setMaintFormType(e.target.value as MaintenanceType)}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  >
                    <option value="PREVENTIVE">정기 사전점검</option>
                    <option value="CORRECTIVE">일반 수리</option>
                    <option value="EMERGENCY">긴급 출동정비</option>
                    <option value="OVERHAUL">중정비·오버홀</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    가동시간(h)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={maintFormHours}
                    onChange={(e) => setMaintFormHours(sanitizeDecimalText(e.target.value))}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
              </div>

              {/* Row 2: Tech + Vehicle + Result + Asset Status After + Next PM Due */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="flex flex-col gap-1">
                  <SearchSelectCombobox
                    label="담당 정비인력"
                    options={employeeComboOptions}
                    value={maintFormTechId}
                    onChange={(val) => {
                      setMaintFormTechId(val);
                      const emp = employees.find((e) => String(e.id) === val);
                      if (emp) setMaintFormTechName(emp.name);
                    }}
                    placeholder="직원 검색"
                    clearable
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    담당자명(직접입력)
                  </label>
                  <input
                    type="text"
                    value={maintFormTechName}
                    onChange={(e) => setMaintFormTechName(e.target.value)}
                    placeholder="담당자명"
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <SearchSelectCombobox
                    label="출동 정비차량"
                    options={vehicleComboOptions}
                    value={maintFormVehicleId}
                    onChange={(val) => setMaintFormVehicleId(val)}
                    placeholder="차량 선택"
                    clearable
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    점검·정비 결과
                  </label>
                  <select
                    value={maintFormResult}
                    onChange={(e) => setMaintFormResult(e.target.value as MaintenanceResultStatus)}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  >
                    <option value="COMPLETED">완료</option>
                    <option value="FOLLOW_UP_REQUIRED">추가조치 필요</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    자산상태 전환
                  </label>
                  <select
                    value={maintFormStatusAfter}
                    onChange={(e) => setMaintFormStatusAfter(e.target.value)}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  >
                    <option value="KEEP">현재 상태 유지</option>
                    <option value="RENTED">대여중</option>
                    <option value="AVAILABLE">임대가능</option>
                    <option value="REPAIRING">수리중</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Title, Next PM Date, Labor, Travel */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    정비 작업명 *
                  </label>
                  <input
                    type="text"
                    value={maintFormTitle}
                    onChange={(e) => setMaintFormTitle(e.target.value)}
                    placeholder="정기 사전점검 / 유압호스 교체"
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    차기 사전점검 예정일
                  </label>
                  <input
                    type="date"
                    value={maintFormNextPm}
                    onChange={(e) => setMaintFormNextPm(e.target.value)}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    공임비(원)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maintFormLaborCost}
                    onChange={(e) => setMaintFormLaborCost(formatErpInputNumber(e.target.value))}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    출장비(원)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maintFormTravelCost}
                    onChange={(e) => setMaintFormTravelCost(formatErpInputNumber(e.target.value))}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
              </div>

              {/* Row 4: Symptom & Work Performed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    점검소견·고장증상
                  </label>
                  <textarea
                    rows={2}
                    value={maintFormSymptom}
                    onChange={(e) => setMaintFormSymptom(e.target.value)}
                    className="p-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    조치·작업내용
                  </label>
                  <textarea
                    rows={2}
                    value={maintFormWork}
                    onChange={(e) => setMaintFormWork(e.target.value)}
                    className="p-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Parts Used Section */}
              <div className="border border-[#b5a894] dark:border-slate-700 rounded overflow-hidden">
                <div className="px-3 py-2 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">
                    사용 부품·자재 등록 (재고 소진)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowQuickPartModal(true)}
                      className="px-2 py-1 rounded text-[11px] font-semibold border border-[#b5a894] bg-[#f4efe4] hover:bg-[#dcd4c4] dark:bg-slate-700 whitespace-nowrap"
                    >
                      신규 부품 SKU
                    </button>
                    <button
                      type="button"
                      onClick={addMaintPartRow}
                      className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-900 text-[#f4efe4] dark:bg-amber-600 dark:text-slate-950 flex items-center gap-1 whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>부품 행 추가</span>
                    </button>
                  </div>
                </div>

                {maintFormParts.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-slate-500">
                    사용된 부품이 없으면 행 추가 없이 저장할 수 있습니다.
                  </div>
                ) : (
                  <div className="p-2 flex flex-col gap-2">
                    {maintFormParts.map((line) => {
                      const lineTotal = Math.round(
                        (Number(sanitizeDecimalText(line.qty)) || 0) * cleanErpNumber(line.unitCost)
                      );
                      return (
                        <div
                          key={line.key}
                          className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-[#ebe5d8] dark:bg-slate-800/60 p-2 rounded border border-[#dcd4c4] dark:border-slate-700"
                        >
                          <div className="md:col-span-2 flex flex-col gap-1">
                            <label className="text-[11px] font-semibold">출처</label>
                            <select
                              value={line.sourceType}
                              onChange={(e) =>
                                updateMaintPartRow(line.key, {
                                  sourceType: e.target.value as PartStockSource,
                                })
                              }
                              className="h-8 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-900 text-xs"
                            >
                              <option value="VEHICLE">차량 적재재고</option>
                              <option value="YARD">주기장 재고</option>
                            </select>
                          </div>

                          <div className="md:col-span-2 flex flex-col gap-1">
                            <label className="text-[11px] font-semibold">출고차량</label>
                            <select
                              value={line.vehicleId}
                              disabled={line.sourceType !== "VEHICLE"}
                              onChange={(e) =>
                                updateMaintPartRow(line.key, { vehicleId: e.target.value })
                              }
                              className="h-8 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-900 text-xs disabled:opacity-50"
                            >
                              <option value="">선택</option>
                              {vehicles.map((v) => (
                                <option key={v.id} value={String(v.id)}>
                                  {v.vehicleNo} ({v.driverName || v.vehicleName})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-4 flex flex-col gap-1">
                            <SearchSelectCombobox
                              label="부품 품목"
                              options={buildPartComboOptions(line.sourceType, line.vehicleId)}
                              value={line.productId}
                              onChange={(val) =>
                                updateMaintPartRow(line.key, { productId: val })
                              }
                              controlHeight="32px"
                              placeholder="부품명·품번 검색"
                            />
                          </div>

                          <div className="md:col-span-1 flex flex-col gap-1">
                            <label className="text-[11px] font-semibold">수량</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={line.qty}
                              onChange={(e) =>
                                updateMaintPartRow(line.key, {
                                  qty: sanitizeDecimalText(e.target.value),
                                })
                              }
                              className="h-8 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-900 text-xs font-mono text-right"
                            />
                          </div>

                          <div className="md:col-span-2 flex flex-col gap-1">
                            <label className="text-[11px] font-semibold">
                              단가(합계 ₩{formatErpNumber(lineTotal)})
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={line.unitCost}
                              onChange={(e) =>
                                updateMaintPartRow(line.key, {
                                  unitCost: formatErpInputNumber(e.target.value),
                                })
                              }
                              className="h-8 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-900 text-xs font-mono text-right"
                            />
                          </div>

                          <div className="md:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setMaintFormParts((prev) =>
                                  prev.filter((row) => row.key !== line.key)
                                )
                              }
                              className="h-8 px-2 rounded border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Wear Component Reset Selector */}
              <div className="border border-[#b5a894] dark:border-slate-700 rounded p-3 bg-[#ebe5d8]/60 dark:bg-slate-800/40 flex flex-col gap-2">
                <div className="text-xs font-bold">
                  소모품 교체 완료 항목 (저장 시 열화시간 기준값 리셋)
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_WEAR_COMPONENTS.map((comp) => {
                    const checked = maintFormResetCodes.includes(comp.componentCode);
                    return (
                      <label
                        key={comp.componentCode}
                        className={`px-2.5 py-1.5 rounded border text-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                          checked
                            ? "bg-slate-900 text-[#f4efe4] border-slate-900 dark:bg-amber-600 dark:text-slate-950"
                            : "bg-[#f4efe4] text-slate-800 border-[#b5a894] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMaintFormResetCodes((prev) => [...prev, comp.componentCode]);
                            } else {
                              setMaintFormResetCodes((prev) =>
                                prev.filter((c) => c !== comp.componentCode)
                              );
                            }
                          }}
                          className="accent-slate-900"
                        />
                        <span>{comp.componentName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 7-Item PM Checklist */}
              <div className="border border-[#b5a894] dark:border-slate-700 rounded overflow-hidden">
                <div className="px-3 py-2 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 text-xs font-bold">
                  지게차 사전점검 체크리스트 (7항목)
                </div>
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-[#ebe5d8] dark:bg-slate-800/70 border-b border-[#dcd4c4] dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-bold whitespace-nowrap">점검항목</th>
                      <th className="px-3 py-1.5 text-left font-bold whitespace-nowrap">판정</th>
                      <th className="px-3 py-1.5 text-left font-bold whitespace-nowrap">점검메모</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dcd4c4] dark:divide-slate-800">
                    {maintFormChecklist.map((item) => (
                      <tr key={item.itemCode}>
                        <td className="px-3 py-1.5 font-semibold whitespace-nowrap">
                          {item.itemLabel}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {(
                              [
                                { k: "PASS" as PmChecklistStatus, l: "양호" },
                                { k: "WARN" as PmChecklistStatus, l: "주의" },
                                { k: "FAIL" as PmChecklistStatus, l: "불량" },
                              ] as const
                            ).map((opt) => (
                              <button
                                key={opt.k}
                                type="button"
                                onClick={() =>
                                  setMaintFormChecklist((prev) =>
                                    prev.map((row) =>
                                      row.itemCode === item.itemCode
                                        ? { ...row, status: opt.k }
                                        : row
                                    )
                                  )
                                }
                                className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                                  item.status === opt.k
                                    ? opt.k === "PASS"
                                      ? "bg-emerald-700 text-[#fdfbf7] border-emerald-700"
                                      : opt.k === "WARN"
                                        ? "bg-amber-600 text-[#fdfbf7] border-amber-600"
                                        : "bg-rose-700 text-[#fdfbf7] border-rose-700"
                                    : "bg-[#f4efe4] border-[#b5a894] dark:bg-slate-800 dark:border-slate-700"
                                }`}
                              >
                                {opt.l}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={item.note}
                            onChange={(e) =>
                              setMaintFormChecklist((prev) =>
                                prev.map((row) =>
                                  row.itemCode === item.itemCode
                                    ? { ...row, note: e.target.value }
                                    : row
                                )
                              )
                            }
                            placeholder="특이사항"
                            className="h-7 px-2 w-full rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer: Cost Summary + Save */}
            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-t border-[#b5a894] dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-mono flex flex-wrap items-center gap-3">
                <span>부품비 ₩{formatErpNumber(maintPartsTotalCost)}</span>
                <span>+</span>
                <span>공임 ₩{formatErpNumber(cleanErpNumber(maintFormLaborCost))}</span>
                <span>+</span>
                <span>출장비 ₩{formatErpNumber(cleanErpNumber(maintFormTravelCost))}</span>
                <span>=</span>
                <strong className="text-sm">합계 ₩{formatErpNumber(maintGrandTotalCost)}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMaintModal(false)}
                  className="h-9 px-4 rounded border border-[#b5a894] bg-[#f4efe4] hover:bg-[#dcd4c4] dark:bg-slate-700 text-xs font-semibold"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={savingMaint}
                  onClick={() => void handleSaveMaintenance()}
                  className="h-9 px-5 rounded bg-slate-900 text-[#f4efe4] hover:bg-slate-800 dark:bg-amber-600 dark:text-slate-950 text-xs font-bold"
                >
                  {savingMaint ? "저장 중..." : editingMaintId ? "정비 수정 확정" : "정비 등록 확정"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export interface TransferModalProps {
  handleSaveTransfer: () => Promise<void>;
  savingTransfer: boolean;
  setShowTransferModal: React.Dispatch<React.SetStateAction<boolean>>;
  setTransferDate: React.Dispatch<React.SetStateAction<string>>;
  setTransferFromVehicleId: React.Dispatch<React.SetStateAction<string>>;
  setTransferNote: React.Dispatch<React.SetStateAction<string>>;
  setTransferProductId: React.Dispatch<React.SetStateAction<string>>;
  setTransferQty: React.Dispatch<React.SetStateAction<string>>;
  setTransferTargetQty: React.Dispatch<React.SetStateAction<string>>;
  setTransferToVehicleId: React.Dispatch<React.SetStateAction<string>>;
  setTransferType: React.Dispatch<React.SetStateAction<PartTransferType>>;
  showTransferModal: boolean;
  transferDate: string;
  transferFromVehicleId: string;
  transferNote: string;
  transferProductId: string;
  transferQty: string;
  transferSourcePartOptions: SearchSelectOption[];
  transferTargetQty: string;
  transferToVehicleId: string;
  transferType: PartTransferType;
  vehicleComboOptions: SearchSelectOption[];
}

export const TransferModal: React.FC<TransferModalProps> = ({
  handleSaveTransfer,
  savingTransfer,
  setShowTransferModal,
  setTransferDate,
  setTransferFromVehicleId,
  setTransferNote,
  setTransferProductId,
  setTransferQty,
  setTransferTargetQty,
  setTransferToVehicleId,
  setTransferType,
  showTransferModal,
  transferDate,
  transferFromVehicleId,
  transferNote,
  transferProductId,
  transferQty,
  transferSourcePartOptions,
  transferTargetQty,
  transferToVehicleId,
  transferType,
  vehicleComboOptions,
}) => {
  return (
    <>
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                <h3 className="text-sm font-bold">부품 재고 이동</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="p-1 rounded hover:bg-[#dcd4c4] dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">이동 유형</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      "LOAD_TO_VEHICLE",
                      "RETURN_TO_YARD",
                      "VEHICLE_TRANSFER",
                    ] as PartTransferType[]
                  ).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTransferType(t)}
                      className={`h-8 px-2 rounded border text-xs font-semibold whitespace-nowrap ${
                        transferType === t
                          ? "bg-slate-900 text-[#f4efe4] border-slate-900 dark:bg-amber-600 dark:text-slate-950"
                          : "bg-[#ebe5d8] text-slate-800 border-[#b5a894] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {PART_TRANSFER_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {(transferType === "RETURN_TO_YARD" || transferType === "VEHICLE_TRANSFER") && (
                <div className="flex flex-col gap-1">
                  <SearchSelectCombobox
                    label="출발 정비차량"
                    required
                    options={vehicleComboOptions}
                    value={transferFromVehicleId}
                    onChange={setTransferFromVehicleId}
                    placeholder="출발 차량 선택"
                  />
                </div>
              )}

              {(transferType === "LOAD_TO_VEHICLE" || transferType === "VEHICLE_TRANSFER") && (
                <div className="flex flex-col gap-1">
                  <SearchSelectCombobox
                    label="도착 정비차량"
                    required
                    options={vehicleComboOptions}
                    value={transferToVehicleId}
                    onChange={setTransferToVehicleId}
                    placeholder="도착 차량 선택"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <SearchSelectCombobox
                  label="부품 품목"
                  required
                  options={transferSourcePartOptions}
                  value={transferProductId}
                  onChange={setTransferProductId}
                  placeholder="부품명·품목코드·품번 검색"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">이동수량 *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={transferQty}
                    onChange={(e) => setTransferQty(sanitizeDecimalText(e.target.value))}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">이동일자</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">차량 목표수량</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={transferTargetQty}
                    disabled={transferType === "RETURN_TO_YARD"}
                    onChange={(e) => setTransferTargetQty(sanitizeDecimalText(e.target.value))}
                    placeholder="선택"
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">비고</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-t border-[#b5a894] dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="h-8 px-4 rounded border border-[#b5a894] bg-[#f4efe4] dark:bg-slate-700 text-xs font-semibold"
              >
                취소
              </button>
              <button
                type="button"
                disabled={savingTransfer}
                onClick={() => void handleSaveTransfer()}
                className="h-8 px-4 rounded bg-slate-900 text-[#f4efe4] dark:bg-amber-600 dark:text-slate-950 text-xs font-bold"
              >
                {savingTransfer ? "처리 중..." : "이동 확정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export interface VehicleModalProps {
  editingVehicleId: number | null;
  employeeComboOptions: SearchSelectOption[];
  employees: EmployeeOption[];
  handleSaveVehicle: () => Promise<void>;
  savingVehicle: boolean;
  setShowVehicleModal: React.Dispatch<React.SetStateAction<boolean>>;
  setVehDriverId: React.Dispatch<React.SetStateAction<string>>;
  setVehDriverName: React.Dispatch<React.SetStateAction<string>>;
  setVehDriverPhone: React.Dispatch<React.SetStateAction<string>>;
  setVehMemo: React.Dispatch<React.SetStateAction<string>>;
  setVehName: React.Dispatch<React.SetStateAction<string>>;
  setVehNo: React.Dispatch<React.SetStateAction<string>>;
  setVehRegion: React.Dispatch<React.SetStateAction<string>>;
  setVehStatus: React.Dispatch<React.SetStateAction<"ACTIVE" | "INACTIVE">>;
  showVehicleModal: boolean;
  vehDriverId: string;
  vehDriverName: string;
  vehDriverPhone: string;
  vehMemo: string;
  vehName: string;
  vehNo: string;
  vehRegion: string;
  vehStatus: "ACTIVE" | "INACTIVE";
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  editingVehicleId,
  employeeComboOptions,
  employees,
  handleSaveVehicle,
  savingVehicle,
  setShowVehicleModal,
  setVehDriverId,
  setVehDriverName,
  setVehDriverPhone,
  setVehMemo,
  setVehName,
  setVehNo,
  setVehRegion,
  setVehStatus,
  showVehicleModal,
  vehDriverId,
  vehDriverName,
  vehDriverPhone,
  vehMemo,
  vehName,
  vehNo,
  vehRegion,
  vehStatus,
}) => {
  return (
    <>
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <h3 className="text-sm font-bold">
                  {editingVehicleId ? "정비차량 수정" : "정비차량 등록"}
                </h3>
              </div>
              <button type="button" onClick={() => setShowVehicleModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">차량번호 *</label>
                  <input
                    type="text"
                    value={vehNo}
                    onChange={(e) => setVehNo(e.target.value)}
                    placeholder="80라 1234"
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">차량명칭 *</label>
                  <input
                    type="text"
                    value={vehName}
                    onChange={(e) => setVehName(e.target.value)}
                    placeholder="정비 1호차"
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SearchSelectCombobox
                  label="전담 정비인력"
                  options={employeeComboOptions}
                  value={vehDriverId}
                  onChange={(val) => {
                    setVehDriverId(val);
                    const emp = employees.find((e) => String(e.id) === val);
                    if (emp) {
                      setVehDriverName(emp.name);
                      if (emp.phone) setVehDriverPhone(emp.phone);
                    }
                  }}
                  clearable
                />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">기사명</label>
                  <input
                    type="text"
                    value={vehDriverName}
                    onChange={(e) => setVehDriverName(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">연락처</label>
                  <input
                    type="text"
                    value={vehDriverPhone}
                    onChange={(e) => setVehDriverPhone(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">담당권역</label>
                  <input
                    type="text"
                    value={vehRegion}
                    onChange={(e) => setVehRegion(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">운행상태</label>
                  <select
                    value={vehStatus}
                    onChange={(e) => setVehStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  >
                    <option value="ACTIVE">운행중</option>
                    <option value="INACTIVE">중지</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">비고</label>
                <input
                  type="text"
                  value={vehMemo}
                  onChange={(e) => setVehMemo(e.target.value)}
                  className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-t border-[#b5a894] dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVehicleModal(false)}
                className="h-8 px-4 rounded border border-[#b5a894] bg-[#f4efe4] dark:bg-slate-700 text-xs font-semibold"
              >
                취소
              </button>
              <button
                type="button"
                disabled={savingVehicle}
                onClick={() => void handleSaveVehicle()}
                className="h-8 px-4 rounded bg-slate-900 text-[#f4efe4] dark:bg-amber-600 dark:text-slate-950 text-xs font-bold"
              >
                {savingVehicle ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export interface QuickPartModalProps {
  handleSaveQuickPart: () => Promise<void>;
  qpCategory: string;
  qpCost: string;
  qpInitialStock: string;
  qpName: string;
  qpPartNo: string;
  qpPrice: string;
  qpSafetyStock: string;
  qpSkuCode: string;
  qpUnit: string;
  savingQuickPart: boolean;
  setQpCategory: React.Dispatch<React.SetStateAction<string>>;
  setQpCost: React.Dispatch<React.SetStateAction<string>>;
  setQpInitialStock: React.Dispatch<React.SetStateAction<string>>;
  setQpName: React.Dispatch<React.SetStateAction<string>>;
  setQpPartNo: React.Dispatch<React.SetStateAction<string>>;
  setQpPrice: React.Dispatch<React.SetStateAction<string>>;
  setQpSafetyStock: React.Dispatch<React.SetStateAction<string>>;
  setQpSkuCode: React.Dispatch<React.SetStateAction<string>>;
  setQpUnit: React.Dispatch<React.SetStateAction<string>>;
  setShowQuickPartModal: React.Dispatch<React.SetStateAction<boolean>>;
  showQuickPartModal: boolean;
}

export const QuickPartModal: React.FC<QuickPartModalProps> = ({
  handleSaveQuickPart,
  qpCategory,
  qpCost,
  qpInitialStock,
  qpName,
  qpPartNo,
  qpPrice,
  qpSafetyStock,
  qpSkuCode,
  qpUnit,
  savingQuickPart,
  setQpCategory,
  setQpCost,
  setQpInitialStock,
  setQpName,
  setQpPartNo,
  setQpPrice,
  setQpSafetyStock,
  setQpSkuCode,
  setQpUnit,
  setShowQuickPartModal,
  showQuickPartModal,
}) => {
  return (
    <>
      {showQuickPartModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <h3 className="text-sm font-bold">부품 SKU 등록</h3>
              </div>
              <button type="button" onClick={() => setShowQuickPartModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">부품명 *</label>
                  <input
                    type="text"
                    value={qpName}
                    onChange={(e) => setQpName(e.target.value)}
                    placeholder="엔진오일 필터"
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">품번(P/N)</label>
                  <input
                    type="text"
                    value={qpPartNo}
                    onChange={(e) => setQpPartNo(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">품목코드</label>
                  <input
                    type="text"
                    value={qpSkuCode}
                    onChange={(e) => setQpSkuCode(e.target.value)}
                    placeholder="미입력 시 자동"
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">부품분류</label>
                  <input
                    type="text"
                    value={qpCategory}
                    onChange={(e) => setQpCategory(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">단위</label>
                  <input
                    type="text"
                    value={qpUnit}
                    onChange={(e) => setQpUnit(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">원가(원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={qpCost}
                    onChange={(e) => setQpCost(formatErpInputNumber(e.target.value))}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">단가(원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={qpPrice}
                    onChange={(e) => setQpPrice(formatErpInputNumber(e.target.value))}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">안전재고</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={qpSafetyStock}
                    onChange={(e) => setQpSafetyStock(sanitizeDecimalText(e.target.value))}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">기초재고</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={qpInitialStock}
                    onChange={(e) => setQpInitialStock(sanitizeDecimalText(e.target.value))}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-t border-[#b5a894] dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowQuickPartModal(false)}
                className="h-8 px-4 rounded border border-[#b5a894] bg-[#f4efe4] dark:bg-slate-700 text-xs font-semibold"
              >
                취소
              </button>
              <button
                type="button"
                disabled={savingQuickPart}
                onClick={() => void handleSaveQuickPart()}
                className="h-8 px-4 rounded bg-slate-900 text-[#f4efe4] dark:bg-amber-600 dark:text-slate-950 text-xs font-bold"
              >
                {savingQuickPart ? "등록 중..." : "부품 등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export interface YardReceiptModalProps {
  buildPartComboOptions: (sourceType: PartStockSource, vehicleIdStr?: string) => SearchSelectOption[];
  handleSaveYardReceipt: () => Promise<void>;
  savingYardReceipt: boolean;
  setShowYardReceiptModal: React.Dispatch<React.SetStateAction<boolean>>;
  setYrDate: React.Dispatch<React.SetStateAction<string>>;
  setYrNote: React.Dispatch<React.SetStateAction<string>>;
  setYrProductId: React.Dispatch<React.SetStateAction<string>>;
  setYrQty: React.Dispatch<React.SetStateAction<string>>;
  showYardReceiptModal: boolean;
  yrDate: string;
  yrNote: string;
  yrProductId: string;
  yrQty: string;
}

export const YardReceiptModal: React.FC<YardReceiptModalProps> = ({
  buildPartComboOptions,
  handleSaveYardReceipt,
  savingYardReceipt,
  setShowYardReceiptModal,
  setYrDate,
  setYrNote,
  setYrProductId,
  setYrQty,
  showYardReceiptModal,
  yrDate,
  yrNote,
  yrProductId,
  yrQty,
}) => {
  return (
    <>
      {showYardReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold">주기장 부품 입고</h3>
              <button type="button" onClick={() => setShowYardReceiptModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <SearchSelectCombobox
                label="입고 부품 품목"
                required
                options={buildPartComboOptions("YARD")}
                value={yrProductId}
                onChange={setYrProductId}
                placeholder="부품 선택"
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">입고수량 *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={yrQty}
                    onChange={(e) => setYrQty(sanitizeDecimalText(e.target.value))}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">입고일자</label>
                  <input
                    type="date"
                    value={yrDate}
                    onChange={(e) => setYrDate(e.target.value)}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">비고</label>
                <input
                  type="text"
                  value={yrNote}
                  onChange={(e) => setYrNote(e.target.value)}
                  className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-t border-[#b5a894] dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowYardReceiptModal(false)}
                className="h-8 px-4 rounded border border-[#b5a894] bg-[#f4efe4] dark:bg-slate-700 text-xs font-semibold"
              >
                취소
              </button>
              <button
                type="button"
                disabled={savingYardReceipt}
                onClick={() => void handleSaveYardReceipt()}
                className="h-8 px-4 rounded bg-slate-900 text-[#f4efe4] dark:bg-amber-600 dark:text-slate-950 text-xs font-bold"
              >
                {savingYardReceipt ? "처리 중..." : "입고 확정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
