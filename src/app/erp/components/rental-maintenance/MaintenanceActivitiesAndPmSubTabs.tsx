"use client";

import React, { useMemo } from "react";
import { CalendarClock, Search } from "lucide-react";
import { SortableTh, useErpTableSort } from "../SortableTh";
import { formatErpNumber, sortErpItems } from "@/lib/erpFormat";
import {
  MAINTENANCE_RESULT_LABELS,
  MAINTENANCE_TYPE_LABELS,
  PM_DUE_STATUS_LABELS,
  type MaintenanceType,
} from "@/lib/rentalMaintenanceDomain";
import {
  ASSET_STATUS_BADGE,
  ASSET_STATUS_LABELS,
  PM_BADGE,
  type MaintenanceRecord,
  type MaintenanceSummaryStats,
  type PmScheduleRow,
  type SubTabKey,
} from "./rentalMaintenanceTypes";

export interface MaintenanceActivitiesAndPmSubTabsProps {
  activeSubTab: SubTabKey;
  maintenances: MaintenanceRecord[];
  pmSchedules: PmScheduleRow[];
  summary: MaintenanceSummaryStats;
  today: string;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  typeFilter: string;
  setTypeFilter: React.Dispatch<React.SetStateAction<string>>;
  resultFilter: string;
  setResultFilter: React.Dispatch<React.SetStateAction<string>>;
  pmStatusFilter: string;
  setPmStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  startDateFilter: string;
  setStartDateFilter: React.Dispatch<React.SetStateAction<string>>;
  endDateFilter: string;
  setEndDateFilter: React.Dispatch<React.SetStateAction<string>>;
  openCreateMaintenanceModal: (preset?: {
    assetId?: number;
    maintenanceType?: MaintenanceType;
    title?: string;
    resetCodes?: string[];
  }) => void;
  openEditMaintenanceModal: (rec: MaintenanceRecord) => void;
}

export const MaintenanceActivitiesAndPmSubTabs: React.FC<MaintenanceActivitiesAndPmSubTabsProps> = ({
  activeSubTab,
  maintenances,
  pmSchedules,
  summary,
  today,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  resultFilter,
  setResultFilter,
  pmStatusFilter,
  setPmStatusFilter,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  openCreateMaintenanceModal,
  openEditMaintenanceModal,
}) => {
  const maintSort = useErpTableSort("", null);
  const pmSort = useErpTableSort("", null);

  const sortedMaintenances = useMemo(
    () =>
      sortErpItems(
        maintenances,
        maintSort.sortKey,
        maintSort.sortDir,
        (m, k) => (k === "parts" ? m.parts?.length || 0 : undefined)
      ),
    [maintenances, maintSort.sortKey, maintSort.sortDir]
  );

  const sortedPmSchedules = useMemo(
    () => sortErpItems(pmSchedules, pmSort.sortKey, pmSort.sortDir),
    [pmSchedules, pmSort.sortKey, pmSort.sortDir]
  );

  return (
    <>
      {/* ==================== SUB-TAB 1: 정비활동 관리 ==================== */}
      {activeSubTab === "ACTIVITIES" && (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Top-Left Scope Filter + Top-Right Summary KPIs */}
          <div className="bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg p-3 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  통합검색
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="차대번호·모델·거래처·작업명·담당자"
                    className="h-8 pl-8 pr-2.5 w-60 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  정비유형
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-8 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                >
                  <option value="ALL">전체 유형</option>
                  <option value="PREVENTIVE">정기 사전점검</option>
                  <option value="CORRECTIVE">일반 수리</option>
                  <option value="EMERGENCY">긴급 출동정비</option>
                  <option value="OVERHAUL">중정비·오버홀</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  정비결과
                </label>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                  className="h-8 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                >
                  <option value="ALL">전체 결과</option>
                  <option value="COMPLETED">완료</option>
                  <option value="FOLLOW_UP_REQUIRED">추가조치 필요</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  시작일
                </label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="h-8 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  종료일
                </label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="h-8 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                />
              </div>

              {(searchQuery || typeFilter !== "ALL" || resultFilter !== "ALL" || startDateFilter || endDateFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("ALL");
                    setResultFilter("ALL");
                    setStartDateFilter("");
                    setEndDateFilter("");
                  }}
                  className="h-8 px-2.5 rounded border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:border-slate-700 text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  필터 초기화
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="px-2.5 py-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 whitespace-nowrap">
                <span className="text-slate-600 dark:text-slate-400 mr-1.5">조회건수</span>
                <span className="font-bold">{formatErpNumber(summary.totalMaintenances)}건</span>
              </div>
              <div className="px-2.5 py-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 whitespace-nowrap">
                <span className="text-slate-600 dark:text-slate-400 mr-1.5">사전점검</span>
                <span className="font-bold">{formatErpNumber(summary.preventiveCount)}건</span>
              </div>
              <div className="px-2.5 py-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 whitespace-nowrap">
                <span className="text-slate-600 dark:text-slate-400 mr-1.5">부품비용</span>
                <span className="font-bold">₩{formatErpNumber(summary.partsCostSum)}</span>
              </div>
            </div>
          </div>

          {/* Center High-Density Grid (Action Column Leftmost) */}
          <div className="flex-1 bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <tr>
                    <th className="px-2.5 py-2 text-left font-bold whitespace-nowrap">관리</th>
                    <SortableTh label="정비번호" colKey="maintenanceNo" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="정비일자" colKey="maintenanceDate" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="유형" colKey="maintenanceType" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="차대번호" colKey="serialNo" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="모델" colKey="modelName" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="거래처·현장" colKey="customerName" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="작업명" colKey="title" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="담당자·차량" colKey="technicianName" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="가동시간" colKey="operatingHours" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                    <SortableTh label="사용부품 내역" colKey="parts" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="합계비용" colKey="totalCost" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                    <SortableTh label="결과" colKey="resultStatus" sortKey={maintSort.sortKey} sortDir={maintSort.sortDir} onSort={maintSort.handleSort} className="px-2.5 py-2 font-bold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dcd4c4] dark:divide-slate-800">
                  {sortedMaintenances.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                        등록된 정비활동 이력이 없습니다. 우측 상단 정비활동 등록 버튼을 눌러 등록하세요.
                      </td>
                    </tr>
                  ) : (
                    sortedMaintenances.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-[#ebe5d8]/70 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditMaintenanceModal(m)}
                            className="px-2 py-1 rounded text-[11px] font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                          >
                            상세·수정 ➔
                          </button>
                        </td>
                        <td className="px-2.5 py-2 font-mono font-semibold whitespace-nowrap">
                          {m.maintenanceNo}
                        </td>
                        <td className="px-2.5 py-2 font-mono whitespace-nowrap">{m.maintenanceDate}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                              m.maintenanceType === "PREVENTIVE"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                : m.maintenanceType === "EMERGENCY"
                                  ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                  : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                            }`}
                          >
                            {MAINTENANCE_TYPE_LABELS[m.maintenanceType]}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 font-mono font-bold whitespace-nowrap">
                          {m.serialNo || "-"}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{m.modelName || "-"}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {m.customerName ? (
                            <span>
                              {m.customerName}
                              {m.siteName ? ` / ${m.siteName}` : ""}
                            </span>
                          ) : (
                            <span className="text-slate-500">주기장</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 max-w-[220px] truncate font-medium" title={m.title}>
                          {m.title}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {m.technicianName || "-"}
                          {m.vehicleNo ? ` (${m.vehicleNo})` : ""}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                          {formatErpNumber(m.operatingHours)}h
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {m.parts.length === 0 ? (
                            <span className="text-slate-400">없음</span>
                          ) : (
                            <span
                              className="inline-block max-w-[220px] truncate"
                              title={m.parts
                                .map(
                                  (p) =>
                                    `${p.productName} x${p.qty} (${
                                      p.sourceType === "VEHICLE" ? p.vehicleNo || "차량" : "주기장"
                                    })`
                                )
                                .join(", ")}
                            >
                              {m.parts[0].productName} x{m.parts[0].qty}
                              {m.parts[0].sourceType === "VEHICLE"
                                ? ` [${m.parts[0].vehicleNo || "차량"}]`
                                : " [주기장]"}
                              {m.parts.length > 1 ? ` 외 ${m.parts.length - 1}건` : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono font-bold whitespace-nowrap">
                          ₩{formatErpNumber(m.totalCost)}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                              m.resultStatus === "COMPLETED"
                                ? "bg-slate-800 text-[#f4efe4] border-slate-800 dark:bg-slate-700"
                                : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300"
                            }`}
                          >
                            {MAINTENANCE_RESULT_LABELS[m.resultStatus]}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom-Right Terminal Audit Equation */}
            <div className="px-3 py-2 border-t border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800/80 flex items-center justify-end gap-4 text-xs font-mono">
              <span className="whitespace-nowrap">
                건수 <strong>{formatErpNumber(summary.totalMaintenances)}</strong>건
              </span>
              <span className="whitespace-nowrap">
                부품비 <strong>₩{formatErpNumber(summary.partsCostSum)}</strong> + 공임·출장{" "}
                <strong>₩{formatErpNumber(summary.totalCostSum - summary.partsCostSum)}</strong> = 총 정비비{" "}
                <strong>₩{formatErpNumber(summary.totalCostSum)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: 정기 사전점검 ==================== */}
      {activeSubTab === "PREVENTIVE_PM" && (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg p-3 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  점검상태
                </label>
                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      { key: "ALL", label: "전체" },
                      { key: "OVERDUE", label: `기한 초과 (${summary.pmOverdueCount})` },
                      { key: "DUE_SOON", label: `점검 도래 (${summary.pmDueSoonCount})` },
                      { key: "ON_TRACK", label: `정상 (${summary.pmOnTrackCount})` },
                      { key: "STANDBY", label: "대기" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setPmStatusFilter(opt.key)}
                      className={`h-8 px-2.5 rounded text-xs font-semibold border whitespace-nowrap shrink-0 ${
                        pmStatusFilter === opt.key
                          ? "bg-slate-900 text-[#f4efe4] border-slate-900 dark:bg-amber-600 dark:text-slate-950"
                          : "bg-[#ebe5d8] text-slate-800 border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  자산·거래처 검색
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="차대번호·모델·거래처"
                  className="h-8 px-2.5 w-52 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <CalendarClock className="w-4 h-4 text-slate-700 dark:text-amber-400 shrink-0" />
              <span className="font-semibold whitespace-nowrap">기준일: {today}</span>
            </div>
          </div>

          <div className="flex-1 bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700">
                  <tr>
                    <th className="px-2.5 py-2 text-left font-bold whitespace-nowrap">조치</th>
                    <SortableTh label="차대번호" colKey="serialNo" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="모델" colKey="modelName" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="자산상태" colKey="assetStatus" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="거래처·현장" colKey="currentCustomer" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="점검상태" colKey="pmStatus" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="차기 예정일" colKey="nextPmDueDate" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="잔여일" colKey="daysUntilDue" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                    <SortableTh label="최종 점검일" colKey="lastPmDate" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} className="px-2.5 py-2 font-bold" />
                    <SortableTh label="점검주기" colKey="pmIntervalDays" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                    <SortableTh label="누적 가동시간" colKey="operatingHours" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                    <SortableTh label="누적 점검" colKey="pmCount" sortKey={pmSort.sortKey} sortDir={pmSort.sortDir} onSort={pmSort.handleSort} align="right" className="px-2.5 py-2 font-bold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dcd4c4] dark:divide-slate-800">
                  {sortedPmSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                        조건에 해당하는 사전점검 대상 자산이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    sortedPmSchedules.map((row) => (
                      <tr
                        key={row.assetId}
                        className="hover:bg-[#ebe5d8]/70 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              openCreateMaintenanceModal({
                                assetId: row.assetId,
                                maintenanceType: "PREVENTIVE",
                                title: `${today.slice(0, 7)} 월간 정기 사전점검`,
                              })
                            }
                            className="px-2 py-1 rounded text-[11px] font-bold bg-slate-900 text-[#f4efe4] hover:bg-slate-800 dark:bg-amber-600 dark:text-slate-950 whitespace-nowrap shrink-0"
                          >
                            점검 등록 ➔
                          </button>
                        </td>
                        <td className="px-2.5 py-2 font-mono font-bold whitespace-nowrap">
                          {row.serialNo}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{row.modelName || "-"}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                              ASSET_STATUS_BADGE[row.assetStatus] || ""
                            }`}
                          >
                            {ASSET_STATUS_LABELS[row.assetStatus] || row.assetStatus}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {row.currentCustomer ? (
                            <span>
                              {row.currentCustomer}
                              {row.currentSite ? ` / ${row.currentSite}` : ""}
                            </span>
                          ) : (
                            <span className="text-slate-500">주기장</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                              PM_BADGE[row.pmStatus]
                            }`}
                          >
                            {PM_DUE_STATUS_LABELS[row.pmStatus]}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 font-mono font-semibold whitespace-nowrap">
                          {row.nextPmDueDate || "-"}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono font-bold whitespace-nowrap">
                          {row.daysUntilDue === null ? (
                            "-"
                          ) : row.daysUntilDue < 0 ? (
                            <span className="text-rose-700 dark:text-rose-400">
                              +{Math.abs(row.daysUntilDue)}일 초과
                            </span>
                          ) : (
                            <span>D-{row.daysUntilDue}일</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 font-mono whitespace-nowrap">
                          {row.lastPmDate || "미실시"}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                          {row.pmIntervalDays}일
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                          {formatErpNumber(row.operatingHours)}h
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                          {formatErpNumber(row.pmCount)}회
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-3 py-2 border-t border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800/80 flex items-center justify-end gap-4 text-xs font-mono">
              <span className="whitespace-nowrap">
                표시대상 <strong>{formatErpNumber(pmSchedules.length)}</strong>대
              </span>
              <span className="whitespace-nowrap text-rose-700 dark:text-rose-400">
                기한초과 <strong>{summary.pmOverdueCount}</strong>
              </span>
              <span className="whitespace-nowrap text-amber-700 dark:text-amber-400">
                점검도래(7일내) <strong>{summary.pmDueSoonCount}</strong>
              </span>
              <span className="whitespace-nowrap text-emerald-700 dark:text-emerald-400">
                정상 <strong>{summary.pmOnTrackCount}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
