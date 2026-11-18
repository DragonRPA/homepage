"use client";

import React from "react";
import { SortableTh } from "../SortableTh";
import { formatErpNumber, type ErpSortState, type SortDirection } from "@/lib/erpFormat";
import { ASSET_STATUS_BADGE, ASSET_STATUS_LABELS, MOVEMENT_TYPE_LABELS, WEAR_BADGE, sanitizeDecimalText, type AssetWearRow, type FleetStockSummaryRow, type HourLogRow, type PartMovementRow, type ServiceVehicleRecord, type SubTabKey, type VehicleStockItem } from "./rentalMaintenanceTypes";
import { WEAR_SEVERITY_LABELS, type MaintenanceType, type PartTransferType } from "@/lib/rentalMaintenanceDomain";
import { Clock, Gauge, Truck } from "lucide-react";

export interface HoursWearSubTabProps {
  activeSubTab: SubTabKey;
  criticalWearCount: number;
  handleRecordOperatingHours: () => Promise<void>;
  handleSaveWearConfig: () => Promise<void>;
  hourInputDate: string;
  hourInputNote: string;
  hourInputValue: string;
  hourLogSort: { sortKey: string; sortDir: SortDirection; sortState: ErpSortState; setSortState: React.Dispatch<React.SetStateAction<ErpSortState>>; handleSort: (colKey: string) => void; resetSort: () => void; };
  openCreateMaintenanceModal: (preset?: { assetId?: number; maintenanceType?: MaintenanceType; title?: string; resetCodes?: string[]; }) => void;
  savingHours: boolean;
  searchQuery: string;
  selectedWearAsset: AssetWearRow | null;
  selectedWearAssetId: number | null;
  setHourInputDate: React.Dispatch<React.SetStateAction<string>>;
  setHourInputNote: React.Dispatch<React.SetStateAction<string>>;
  setHourInputValue: React.Dispatch<React.SetStateAction<string>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setSelectedWearAssetId: React.Dispatch<React.SetStateAction<number | null>>;
  setWearEditItems: React.Dispatch<React.SetStateAction<{ componentCode: string; componentName: string; intervalHours: string; lastReplacedHours: string; lastReplacedDate: string; memo: string; }[]>>;
  setWearEditPmInterval: React.Dispatch<React.SetStateAction<string>>;
  setWearSeverityFilter: React.Dispatch<React.SetStateAction<string>>;
  sortedHourLogs: HourLogRow[];
  sortedWearAssets: AssetWearRow[];
  warningWearCount: number;
  wearEditItems: { componentCode: string; componentName: string; intervalHours: string; lastReplacedHours: string; lastReplacedDate: string; memo: string; }[];
  wearEditPmInterval: string;
  wearSeverityFilter: string;
  wearSort: { sortKey: string; sortDir: SortDirection; sortState: ErpSortState; setSortState: React.Dispatch<React.SetStateAction<ErpSortState>>; handleSort: (colKey: string) => void; resetSort: () => void; };
}

export const HoursWearSubTab: React.FC<HoursWearSubTabProps> = ({
  activeSubTab,
  criticalWearCount,
  handleRecordOperatingHours,
  handleSaveWearConfig,
  hourInputDate,
  hourInputNote,
  hourInputValue,
  hourLogSort,
  openCreateMaintenanceModal,
  savingHours,
  searchQuery,
  selectedWearAsset,
  selectedWearAssetId,
  setHourInputDate,
  setHourInputNote,
  setHourInputValue,
  setSearchQuery,
  setSelectedWearAssetId,
  setWearEditItems,
  setWearEditPmInterval,
  setWearSeverityFilter,
  sortedHourLogs,
  sortedWearAssets,
  warningWearCount,
  wearEditItems,
  wearEditPmInterval,
  wearSeverityFilter,
  wearSort,
}) => {
  return (
    <>
      {activeSubTab === "HOURS_WEAR" && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
          {/* Left Master List */}
          <div className="lg:col-span-5 bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg flex flex-col overflow-hidden min-h-0">
            <div className="p-2.5 border-b border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 flex flex-wrap items-end justify-between gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  열화등급 필터
                </label>
                <div className="flex items-center gap-1">
                  {(
                    [
                      { key: "ALL", label: "전체" },
                      { key: "CRITICAL", label: "교체 임계" },
                      { key: "WARNING", label: "교체 예고" },
                      { key: "NORMAL", label: "정상" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setWearSeverityFilter(opt.key)}
                      className={`h-7 px-2 rounded text-[11px] font-semibold border whitespace-nowrap shrink-0 ${
                        wearSeverityFilter === opt.key
                          ? "bg-slate-900 text-[#f4efe4] border-slate-900 dark:bg-amber-600 dark:text-slate-950"
                          : "bg-[#f4efe4] text-slate-800 border-[#b5a894] dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="차대번호·거래처"
                className="h-7 px-2 w-36 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700">
                  <tr>
                    <SortableTh label="차대번호" colKey="serialNo" sortKey={wearSort.sortKey} sortDir={wearSort.sortDir} onSort={wearSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="거래처" colKey="currentCustomer" sortKey={wearSort.sortKey} sortDir={wearSort.sortDir} onSort={wearSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="가동시간" colKey="operatingHours" sortKey={wearSort.sortKey} sortDir={wearSort.sortDir} onSort={wearSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                    <SortableTh label="최고열화율" colKey="wearSummary.maxWearPercent" sortKey={wearSort.sortKey} sortDir={wearSort.sortDir} onSort={wearSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                    <SortableTh label="등급" colKey="wearSummary.overallSeverity" sortKey={wearSort.sortKey} sortDir={wearSort.sortDir} onSort={wearSort.handleSort} className="px-2.5 py-2 font-bold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dcd4c4] dark:divide-slate-800">
                  {sortedWearAssets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        조회된 자산이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    sortedWearAssets.map((a) => {
                      const isSel = a.assetId === selectedWearAssetId;
                      return (
                        <tr
                          key={a.assetId}
                          onClick={() => setSelectedWearAssetId(a.assetId)}
                          className={`cursor-pointer transition-colors ${
                            isSel
                              ? "bg-[#dcd4c4] dark:bg-slate-800 font-semibold"
                              : "hover:bg-[#ebe5d8]/70 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <td className="px-2.5 py-2 font-mono whitespace-nowrap">
                            <div>{a.serialNo}</div>
                            <div className="text-[10px] text-slate-500 font-sans">
                              {a.modelName || "-"}
                            </div>
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap max-w-[130px] truncate">
                            {a.currentCustomer || "주기장"}
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                            {formatErpNumber(a.operatingHours)}h
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono font-bold whitespace-nowrap">
                            {a.wearSummary.maxWearPercent}%
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                                WEAR_BADGE[a.wearSummary.overallSeverity]
                              }`}
                            >
                              {WEAR_SEVERITY_LABELS[a.wearSummary.overallSeverity]}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Dossier: Selected Asset Hour Meter + Proportional Component Wear + Logs */}
          <div className="lg:col-span-7 bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg flex flex-col overflow-hidden min-h-0">
            {!selectedWearAsset ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                좌측 목록에서 렌탈자산을 선택하세요.
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">
                {/* Asset Header + Hour Recording Bar */}
                <div className="bg-[#ebe5d8] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded p-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-slate-800 dark:text-amber-400" />
                      <span className="font-mono font-bold text-sm">
                        {selectedWearAsset.serialNo}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {selectedWearAsset.modelName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                          ASSET_STATUS_BADGE[selectedWearAsset.status] || ""
                        }`}
                      >
                        {ASSET_STATUS_LABELS[selectedWearAsset.status] || selectedWearAsset.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      현재 누적 가동시간:{" "}
                      <strong className="font-mono text-slate-900 dark:text-slate-100">
                        {formatErpNumber(selectedWearAsset.operatingHours)}h
                      </strong>
                      {" · "}
                      {selectedWearAsset.currentCustomer || "주기장"}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold whitespace-nowrap">신규 가동시간</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={hourInputValue}
                        onChange={(e) => setHourInputValue(sanitizeDecimalText(e.target.value))}
                        className="h-8 px-2.5 w-28 rounded border border-[#b5a894] dark:border-slate-600 bg-[#fdfbf7] dark:bg-slate-900 text-xs font-mono text-right"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold whitespace-nowrap">측정일자</label>
                      <input
                        type="date"
                        value={hourInputDate}
                        onChange={(e) => setHourInputDate(e.target.value)}
                        className="h-8 px-2 rounded border border-[#b5a894] dark:border-slate-600 bg-[#fdfbf7] dark:bg-slate-900 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold whitespace-nowrap">기록비고</label>
                      <input
                        type="text"
                        value={hourInputNote}
                        onChange={(e) => setHourInputNote(e.target.value)}
                        placeholder="현장 확인 메모"
                        className="h-8 px-2 w-36 rounded border border-[#b5a894] dark:border-slate-600 bg-[#fdfbf7] dark:bg-slate-900 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={savingHours}
                      onClick={() => void handleRecordOperatingHours()}
                      className="h-8 px-3 rounded text-xs font-bold bg-slate-900 text-[#f4efe4] hover:bg-slate-800 dark:bg-amber-600 dark:text-slate-950 whitespace-nowrap shrink-0"
                    >
                      가동시간 저장
                    </button>
                  </div>
                </div>

                {/* Proportional Wear Table & Configurable Intervals */}
                <div className="border border-[#b5a894] dark:border-slate-700 rounded overflow-hidden">
                  <div className="px-3 py-2 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold">
                      부품별 가동시간 비례 열화율 현황
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold whitespace-nowrap">사전점검 주기(일)</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={wearEditPmInterval}
                          onChange={(e) => setWearEditPmInterval(sanitizeDecimalText(e.target.value))}
                          className="h-7 px-2 w-14 rounded border border-[#b5a894] dark:border-slate-600 bg-[#fdfbf7] dark:bg-slate-900 text-xs font-mono text-right"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={savingHours}
                        onClick={() => void handleSaveWearConfig()}
                        className="h-7 px-2.5 rounded text-xs font-bold border border-[#b5a894] bg-[#f4efe4] hover:bg-[#dcd4c4] dark:bg-slate-700 dark:border-slate-600 whitespace-nowrap shrink-0"
                      >
                        주기 설정 저장
                      </button>
                    </div>
                  </div>

                  <table className="w-full border-collapse text-xs">
                    <thead className="bg-[#ebe5d8] dark:bg-slate-800/70 border-b border-[#dcd4c4] dark:border-slate-700">
                      <tr>
                        <th className="px-2.5 py-2 text-left font-bold whitespace-nowrap">조치</th>
                        <th className="px-2.5 py-2 text-left font-bold whitespace-nowrap">소모품·부품군</th>
                        <th className="px-2.5 py-2 text-right font-bold whitespace-nowrap">교체기준(h)</th>
                        <th className="px-2.5 py-2 text-right font-bold whitespace-nowrap">직전교체(h)</th>
                        <th className="px-2.5 py-2 text-right font-bold whitespace-nowrap">경과 / 잔여</th>
                        <th className="px-2.5 py-2 text-left font-bold whitespace-nowrap">열화율</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dcd4c4] dark:divide-slate-800">
                      {selectedWearAsset.wearSummary.items.map((comp) => {
                        const editIdx = wearEditItems.findIndex(
                          (e) => e.componentCode === comp.componentCode
                        );
                        const editRow = editIdx >= 0 ? wearEditItems[editIdx] : null;
                        const barWidth = Math.min(100, Math.max(0, comp.wearPercent));
                        const barColor =
                          comp.severity === "CRITICAL"
                            ? "bg-rose-600"
                            : comp.severity === "WARNING"
                              ? "bg-amber-500"
                              : "bg-emerald-600";
                        return (
                          <tr key={comp.componentCode}>
                            <td className="px-2.5 py-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() =>
                                  openCreateMaintenanceModal({
                                    assetId: selectedWearAsset.assetId,
                                    maintenanceType: "PREVENTIVE",
                                    title: `${comp.componentName} 점검·교체`,
                                    resetCodes: [comp.componentCode],
                                  })
                                }
                                className="px-2 py-1 rounded text-[11px] font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-600 whitespace-nowrap shrink-0"
                              >
                                교체등록 ➔
                              </button>
                            </td>
                            <td className="px-2.5 py-2 font-semibold whitespace-nowrap">
                              {comp.componentName}
                              {comp.lastReplacedDate && (
                                <div className="text-[10px] text-slate-500 font-normal">
                                  최종교체 {comp.lastReplacedDate}
                                </div>
                              )}
                            </td>
                            <td className="px-2.5 py-2 text-right whitespace-nowrap">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editRow ? editRow.intervalHours : String(comp.intervalHours)}
                                onChange={(e) => {
                                  const v = sanitizeDecimalText(e.target.value);
                                  setWearEditItems((prev) =>
                                    prev.map((row) =>
                                      row.componentCode === comp.componentCode
                                        ? { ...row, intervalHours: v }
                                        : row
                                    )
                                  );
                                }}
                                className="h-7 px-1.5 w-16 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                              />
                            </td>
                            <td className="px-2.5 py-2 text-right whitespace-nowrap">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={
                                  editRow ? editRow.lastReplacedHours : String(comp.lastReplacedHours)
                                }
                                onChange={(e) => {
                                  const v = sanitizeDecimalText(e.target.value);
                                  setWearEditItems((prev) =>
                                    prev.map((row) =>
                                      row.componentCode === comp.componentCode
                                        ? { ...row, lastReplacedHours: v }
                                        : row
                                    )
                                  );
                                }}
                                className="h-7 px-1.5 w-20 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                              />
                            </td>
                            <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                              <div>+{formatErpNumber(comp.elapsedHours)}h</div>
                              <div
                                className={`text-[10px] ${
                                  comp.remainingHours <= 0
                                    ? "text-rose-700 dark:text-rose-400 font-bold"
                                    : "text-slate-500"
                                }`}
                              >
                                {comp.remainingHours <= 0
                                  ? `${formatErpNumber(Math.abs(comp.remainingHours))}h 초과`
                                  : `잔여 ${formatErpNumber(comp.remainingHours)}h`}
                              </div>
                            </td>
                            <td className="px-2.5 py-2 min-w-[140px]">
                              <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                                <span className="font-bold">{comp.wearPercent}%</span>
                                <span
                                  className={`px-1.5 py-0 rounded border text-[10px] font-semibold ${
                                    WEAR_BADGE[comp.severity]
                                  }`}
                                >
                                  {WEAR_SEVERITY_LABELS[comp.severity]}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded bg-[#dcd4c4] dark:bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full ${barColor} transition-all duration-150`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Recent Hour Meter Logs */}
                <div className="border border-[#b5a894] dark:border-slate-700 rounded overflow-hidden">
                  <div className="px-3 py-1.5 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 text-xs font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>가동시간 기록 이력</span>
                  </div>
                  <table className="w-full border-collapse text-xs">
                    <thead className="bg-[#ebe5d8] dark:bg-slate-800/70 border-b border-[#dcd4c4] dark:border-slate-700">
                      <tr>
                        <SortableTh label="기록일" colKey="recordedDate" sortKey={hourLogSort.sortKey} sortDir={hourLogSort.sortDir} onSort={hourLogSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="입력경로" colKey="sourceType" sortKey={hourLogSort.sortKey} sortDir={hourLogSort.sortDir} onSort={hourLogSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="이전(h)" colKey="previousHours" sortKey={hourLogSort.sortKey} sortDir={hourLogSort.sortDir} onSort={hourLogSort.handleSort} align="right" className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="기록(h)" colKey="recordedHours" sortKey={hourLogSort.sortKey} sortDir={hourLogSort.sortDir} onSort={hourLogSort.handleSort} align="right" className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="증분" colKey="deltaHours" sortKey={hourLogSort.sortKey} sortDir={hourLogSort.sortDir} onSort={hourLogSort.handleSort} align="right" className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="담당자" colKey="recordedBy" sortKey={hourLogSort.sortKey} sortDir={hourLogSort.sortDir} onSort={hourLogSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="비고" colKey="note" sortKey={hourLogSort.sortKey} sortDir={hourLogSort.sortDir} onSort={hourLogSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dcd4c4] dark:divide-slate-800">
                      {sortedHourLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                            기록된 가동시간 이력이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        sortedHourLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="px-2.5 py-1.5 font-mono whitespace-nowrap">
                              {log.recordedDate}
                            </td>
                            <td className="px-2.5 py-1.5 whitespace-nowrap">{log.sourceType}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono whitespace-nowrap">
                              {formatErpNumber(log.previousHours)}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono font-bold whitespace-nowrap">
                              {formatErpNumber(log.recordedHours)}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              +{formatErpNumber(log.deltaHours)}
                            </td>
                            <td className="px-2.5 py-1.5 whitespace-nowrap">{log.recordedBy || "-"}</td>
                            <td className="px-2.5 py-1.5">{log.note || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Audit Formula Footer */}
                <div className="px-3 py-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800/80 flex items-center justify-end text-xs font-mono">
                  <span>
                    부품 열화율 = (현재시간 − 최종교체시간) ÷ 교체주기 × 100 | 임계 {criticalWearCount}대 · 예고{" "}
                    {warningWearCount}대
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export interface VehicleStockSubTabProps {
  activeSubTab: SubTabKey;
  fleetStockSort: { sortKey: string; sortDir: SortDirection; sortState: ErpSortState; setSortState: React.Dispatch<React.SetStateAction<ErpSortState>>; handleSort: (colKey: string) => void; resetSort: () => void; };
  fleetStockTotals: { yard: number; vehicle: number; total: number; };
  movementSort: { sortKey: string; sortDir: SortDirection; sortState: ErpSortState; setSortState: React.Dispatch<React.SetStateAction<ErpSortState>>; handleSort: (colKey: string) => void; resetSort: () => void; };
  movementTypeFilter: string;
  openTransferModal: (preset?: { type?: PartTransferType; fromVehicleId?: number; toVehicleId?: number; productId?: number; }) => void;
  openVehicleModal: (veh?: ServiceVehicleRecord) => void;
  selectedVehicle: ServiceVehicleRecord | null;
  selectedVehicleId: number | null;
  setMovementTypeFilter: React.Dispatch<React.SetStateAction<string>>;
  setSelectedVehicleId: React.Dispatch<React.SetStateAction<number | null>>;
  setShowYardReceiptModal: React.Dispatch<React.SetStateAction<boolean>>;
  sortedFleetStockSummary: FleetStockSummaryRow[];
  sortedMovements: PartMovementRow[];
  sortedSelectedVehicleStocks: VehicleStockItem[];
  sortedVehicles: ServiceVehicleRecord[];
  vehStockSort: { sortKey: string; sortDir: SortDirection; sortState: ErpSortState; setSortState: React.Dispatch<React.SetStateAction<ErpSortState>>; handleSort: (colKey: string) => void; resetSort: () => void; };
  vehicleSort: { sortKey: string; sortDir: SortDirection; sortState: ErpSortState; setSortState: React.Dispatch<React.SetStateAction<ErpSortState>>; handleSort: (colKey: string) => void; resetSort: () => void; };
}

export const VehicleStockSubTab: React.FC<VehicleStockSubTabProps> = ({
  activeSubTab,
  fleetStockSort,
  fleetStockTotals,
  movementSort,
  movementTypeFilter,
  openTransferModal,
  openVehicleModal,
  selectedVehicle,
  selectedVehicleId,
  setMovementTypeFilter,
  setSelectedVehicleId,
  setShowYardReceiptModal,
  sortedFleetStockSummary,
  sortedMovements,
  sortedSelectedVehicleStocks,
  sortedVehicles,
  vehStockSort,
  vehicleSort,
}) => {
  return (
    <>
      {activeSubTab === "VEHICLE_STOCK" && (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Action Toolbar */}
          <div className="bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openVehicleModal()}
                className="h-8 px-3 rounded text-xs font-bold bg-slate-900 text-[#f4efe4] hover:bg-slate-800 dark:bg-amber-600 dark:text-slate-950 flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>정비차량 등록</span>
              </button>
              <button
                type="button"
                onClick={() => openTransferModal({ type: "LOAD_TO_VEHICLE" })}
                className="h-8 px-3 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:border-slate-700 whitespace-nowrap shrink-0"
              >
                주기장 → 차량 적재
              </button>
              <button
                type="button"
                onClick={() =>
                  openTransferModal({
                    type: "RETURN_TO_YARD",
                    fromVehicleId: selectedVehicleId || undefined,
                  })
                }
                className="h-8 px-3 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:border-slate-700 whitespace-nowrap shrink-0"
              >
                차량 → 주기장 반납
              </button>
              <button
                type="button"
                onClick={() =>
                  openTransferModal({
                    type: "VEHICLE_TRANSFER",
                    fromVehicleId: selectedVehicleId || undefined,
                  })
                }
                className="h-8 px-3 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:border-slate-700 whitespace-nowrap shrink-0"
              >
                차량 → 차량 이동
              </button>
              <button
                type="button"
                onClick={() => setShowYardReceiptModal(true)}
                className="h-8 px-3 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:border-slate-700 whitespace-nowrap shrink-0"
              >
                주기장 부품 입고
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span>
                주기장 재고합 <strong>{formatErpNumber(fleetStockTotals.yard)}</strong>
              </span>
              <span>+</span>
              <span>
                차량 적재합 <strong>{formatErpNumber(fleetStockTotals.vehicle)}</strong>
              </span>
              <span>=</span>
              <span>
                전사 총보유 <strong>{formatErpNumber(fleetStockTotals.total)}</strong>
              </span>
            </div>
          </div>

          {/* Grid: Vehicles (Left) + Selected Vehicle Stocks & Fleet Ledger (Right) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
            {/* Vehicles List */}
            <div className="lg:col-span-4 bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg flex flex-col overflow-hidden min-h-0">
              <div className="px-3 py-2 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 text-xs font-bold">
                정비차량 목록
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-[#ebe5d8] dark:bg-slate-800/70 border-b border-[#dcd4c4] dark:border-slate-700">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-bold whitespace-nowrap">관리</th>
                      <SortableTh label="차량번호" colKey="vehicleNo" sortKey={vehicleSort.sortKey} sortDir={vehicleSort.sortDir} onSort={vehicleSort.handleSort} className="px-2 py-1.5 font-bold" />
                      <SortableTh label="전담기사" colKey="driverName" sortKey={vehicleSort.sortKey} sortDir={vehicleSort.sortDir} onSort={vehicleSort.handleSort} className="px-2 py-1.5 font-bold" />
                      <SortableTh label="적재품목" colKey="qtySum" sortKey={vehicleSort.sortKey} sortDir={vehicleSort.sortDir} onSort={vehicleSort.handleSort} align="right" className="px-2 py-1.5 font-bold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dcd4c4] dark:divide-slate-800">
                    {sortedVehicles.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                          등록된 정비차량이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      sortedVehicles.map((v) => {
                        const isSel = v.id === selectedVehicleId;
                        const qtySum = v.stocks.reduce((s, item) => s + Number(item.currentQty || 0), 0);
                        return (
                          <tr
                            key={v.id}
                            onClick={() => setSelectedVehicleId(v.id)}
                            className={`cursor-pointer ${
                              isSel
                                ? "bg-[#dcd4c4] dark:bg-slate-800 font-semibold"
                                : "hover:bg-[#ebe5d8]/70 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            <td className="px-2 py-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openVehicleModal(v);
                                }}
                                className="px-1.5 py-0.5 rounded border border-[#b5a894] bg-[#f4efe4] hover:bg-[#e2dbcd] dark:bg-slate-700 text-[11px] font-semibold"
                              >
                                수정
                              </button>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <div className="font-mono font-bold">{v.vehicleNo}</div>
                              <div className="text-[10px] text-slate-500">{v.vehicleName}</div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {v.driverName || "-"}
                              {v.region ? ` (${v.region})` : ""}
                            </td>
                            <td className="px-2 py-2 text-right font-mono whitespace-nowrap">
                              {v.stocks.filter((s) => s.currentQty > 0).length}종 / {formatErpNumber(qtySum)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Selected Vehicle Inventory + Fleet Comparison + Movements */}
            <div className="lg:col-span-8 flex flex-col gap-3 min-h-0 overflow-auto">
              {/* Selected Vehicle Stock Table */}
              <div className="bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold">
                    {selectedVehicle
                      ? `차량 적재부품 현황: ${selectedVehicle.vehicleNo} (${selectedVehicle.vehicleName})`
                      : "차량을 선택하세요"}
                  </span>
                  {selectedVehicle && (
                    <button
                      type="button"
                      onClick={() =>
                        openTransferModal({
                          type: "LOAD_TO_VEHICLE",
                          toVehicleId: selectedVehicle.id,
                        })
                      }
                      className="px-2 py-1 rounded text-[11px] font-bold bg-slate-900 text-[#f4efe4] dark:bg-amber-600 dark:text-slate-950 whitespace-nowrap"
                    >
                      이 차량에 적재
                    </button>
                  )}
                </div>
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-[#ebe5d8] dark:bg-slate-800/70 border-b border-[#dcd4c4] dark:border-slate-700">
                    <tr>
                      <th className="px-2.5 py-1.5 text-left font-bold whitespace-nowrap">조치</th>
                      <SortableTh label="품목코드" colKey="skuCode" sortKey={vehStockSort.sortKey} sortDir={vehStockSort.sortDir} onSort={vehStockSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                      <SortableTh label="부품명" colKey="productName" sortKey={vehStockSort.sortKey} sortDir={vehStockSort.sortDir} onSort={vehStockSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                      <SortableTh label="P/N" colKey="partNo" sortKey={vehStockSort.sortKey} sortDir={vehStockSort.sortDir} onSort={vehStockSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                      <SortableTh label="적재수량" colKey="currentQty" sortKey={vehStockSort.sortKey} sortDir={vehStockSort.sortDir} onSort={vehStockSort.handleSort} align="right" className="px-2.5 py-1.5 font-bold" />
                      <SortableTh label="목표재고" colKey="targetQty" sortKey={vehStockSort.sortKey} sortDir={vehStockSort.sortDir} onSort={vehStockSort.handleSort} align="right" className="px-2.5 py-1.5 font-bold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dcd4c4] dark:divide-slate-800">
                    {!selectedVehicle || sortedSelectedVehicleStocks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                          적재된 부품 재고가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      sortedSelectedVehicleStocks.map((s) => (
                        <tr key={s.productId}>
                          <td className="px-2.5 py-1.5 whitespace-nowrap flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                openTransferModal({
                                  type: "RETURN_TO_YARD",
                                  fromVehicleId: selectedVehicle.id,
                                  productId: s.productId,
                                })
                              }
                              className="px-1.5 py-0.5 rounded border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#dcd4c4] dark:bg-slate-800 text-[11px] font-semibold"
                            >
                              반납
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                openTransferModal({
                                  type: "VEHICLE_TRANSFER",
                                  fromVehicleId: selectedVehicle.id,
                                  productId: s.productId,
                                })
                              }
                              className="px-1.5 py-0.5 rounded border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#dcd4c4] dark:bg-slate-800 text-[11px] font-semibold"
                            >
                              이동
                            </button>
                          </td>
                          <td className="px-2.5 py-1.5 font-mono whitespace-nowrap">{s.skuCode}</td>
                          <td className="px-2.5 py-1.5 font-semibold whitespace-nowrap">
                            {s.productName}
                          </td>
                          <td className="px-2.5 py-1.5 font-mono whitespace-nowrap">
                            {s.partNo || "-"}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono font-bold whitespace-nowrap">
                            {formatErpNumber(s.currentQty)} {s.unit}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatErpNumber(s.targetQty)} {s.unit}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Fleet Yard + Vehicle Stock Ledger */}
              <div className="bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 text-xs font-bold">
                  주기장·차량 통합 부품재고 현황
                </div>
                <div className="max-h-52 overflow-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 bg-[#ebe5d8] dark:bg-slate-800 border-b border-[#dcd4c4] dark:border-slate-700">
                      <tr>
                        <SortableTh label="품목코드" colKey="skuCode" sortKey={fleetStockSort.sortKey} sortDir={fleetStockSort.sortDir} onSort={fleetStockSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="품목명" colKey="name" sortKey={fleetStockSort.sortKey} sortDir={fleetStockSort.sortDir} onSort={fleetStockSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="구분" colKey="itemClass" sortKey={fleetStockSort.sortKey} sortDir={fleetStockSort.sortDir} onSort={fleetStockSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="주기장 재고" colKey="yardQty" sortKey={fleetStockSort.sortKey} sortDir={fleetStockSort.sortDir} onSort={fleetStockSort.handleSort} align="right" className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="차량 합계" colKey="vehicleQtySum" sortKey={fleetStockSort.sortKey} sortDir={fleetStockSort.sortDir} onSort={fleetStockSort.handleSort} align="right" className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="전사 총보유" colKey="totalFleetQty" sortKey={fleetStockSort.sortKey} sortDir={fleetStockSort.sortDir} onSort={fleetStockSort.handleSort} align="right" className="px-2.5 py-1.5 font-bold" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dcd4c4] dark:divide-slate-800">
                      {sortedFleetStockSummary.map((row) => (
                        <tr key={row.productId}>
                          <td className="px-2.5 py-1.5 font-mono whitespace-nowrap">{row.skuCode}</td>
                          <td className="px-2.5 py-1.5 font-semibold whitespace-nowrap">{row.name}</td>
                          <td className="px-2.5 py-1.5 whitespace-nowrap">
                            {row.itemClass === "PART" ? "부품" : row.category || row.itemClass}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono whitespace-nowrap">
                            {formatErpNumber(row.yardQty)} {row.unit}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono whitespace-nowrap">
                            {formatErpNumber(row.vehicleQtySum)} {row.unit}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono font-bold whitespace-nowrap">
                            {formatErpNumber(row.totalFleetQty)} {row.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Part Movement Audit Log */}
              <div className="bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">부품 이동·소진 이력</span>
                  <select
                    value={movementTypeFilter}
                    onChange={(e) => setMovementTypeFilter(e.target.value)}
                    className="h-7 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-900 text-xs"
                  >
                    <option value="ALL">전체 이력</option>
                    <option value="LOAD_TO_VEHICLE">주기장 → 차량 적재</option>
                    <option value="RETURN_TO_YARD">차량 → 주기장 반납</option>
                    <option value="VEHICLE_TRANSFER">차량 → 차량 이동</option>
                    <option value="MAINTENANCE_CONSUME">정비 사용 소진</option>
                    <option value="MAINTENANCE_REVERSAL">정비 수정 환입</option>
                    <option value="YARD_RECEIPT">주기장 입고</option>
                  </select>
                </div>
                <div className="max-h-56 overflow-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 bg-[#ebe5d8] dark:bg-slate-800 border-b border-[#dcd4c4] dark:border-slate-700">
                      <tr>
                        <SortableTh label="이동일" colKey="movementDate" sortKey={movementSort.sortKey} sortDir={movementSort.sortDir} onSort={movementSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="구분" colKey="movementType" sortKey={movementSort.sortKey} sortDir={movementSort.sortDir} onSort={movementSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="부품명" colKey="productName" sortKey={movementSort.sortKey} sortDir={movementSort.sortDir} onSort={movementSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="수량" colKey="qty" sortKey={movementSort.sortKey} sortDir={movementSort.sortDir} onSort={movementSort.handleSort} align="right" className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="출발" colKey="fromLocationType" sortKey={movementSort.sortKey} sortDir={movementSort.sortDir} onSort={movementSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="도착" colKey="toLocationType" sortKey={movementSort.sortKey} sortDir={movementSort.sortDir} onSort={movementSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                        <SortableTh label="연계건·비고" colKey="maintenanceNo" sortKey={movementSort.sortKey} sortDir={movementSort.sortDir} onSort={movementSort.handleSort} className="px-2.5 py-1.5 font-bold" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dcd4c4] dark:divide-slate-800">
                      {sortedMovements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                            부품 이동 이력이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        sortedMovements.map((mv) => (
                          <tr key={mv.id}>
                            <td className="px-2.5 py-1.5 font-mono whitespace-nowrap">
                              {mv.movementDate}
                            </td>
                            <td className="px-2.5 py-1.5 whitespace-nowrap">
                              {MOVEMENT_TYPE_LABELS[mv.movementType] || mv.movementType}
                            </td>
                            <td className="px-2.5 py-1.5 font-semibold whitespace-nowrap">
                              {mv.productName}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono font-bold whitespace-nowrap">
                              {formatErpNumber(mv.qty)} {mv.unit}
                            </td>
                            <td className="px-2.5 py-1.5 whitespace-nowrap">
                              {mv.fromLocationType === "YARD"
                                ? "주기장"
                                : mv.fromLocationType === "VEHICLE"
                                  ? mv.fromVehicleNo || "정비차량"
                                  : mv.fromLocationType === "ASSET"
                                    ? mv.assetSerialNo || "자산"
                                    : "외부입고"}
                            </td>
                            <td className="px-2.5 py-1.5 whitespace-nowrap">
                              {mv.toLocationType === "YARD"
                                ? "주기장"
                                : mv.toLocationType === "VEHICLE"
                                  ? mv.toVehicleNo || "정비차량"
                                  : mv.assetSerialNo || "정비차감"}
                            </td>
                            <td className="px-2.5 py-1.5 whitespace-nowrap">
                              {[mv.maintenanceNo, mv.note].filter(Boolean).join(" · ") || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
