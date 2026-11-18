"use client";

import React from "react";
import { Building2, Receipt, Search } from "lucide-react";
import { formatErpNumber, type SortDirection } from "@/lib/erpFormat";
import { resolveDailyRentalFee } from "@/lib/rentalFeeUtils";
import { type AttachedForkliftOption } from "@/lib/forkliftDomain";
import { SortableTh } from "../SortableTh";

export interface RentalAssetItem {
  id: number;
  assetNo: string;
  serialNo: string;
  rentalProductId: number;
  modelCode: string;
  modelName: string;
  category: string;
  manufacturer: string;
  standardMonthlyRate: number;
  standardDailyRate: number;
  productSpec: string;
  customSpec: string;
  ownerType: string;
  status: string;
  currentCustomer: string | null;
  currentSite: string | null;
  contractNo: string | null;
  operatingHours?: number;
  attachedOptions?: AttachedForkliftOption[];
}

export interface BillingItem {
  id: number;
  billingNo: string;
  contractId: number;
  contractNo: string;
  customerName: string;
  siteName: string | null;
  entityType: string;
  contractStatus: string;
  assetId: number;
  assetNo: string;
  serialNo: string;
  modelName: string;
  yearMonth: string;
  startDate: string;
  endDate: string;
  operatingDays: number;
  monthlyRate: number;
  proRataRevenue: number;
  depreciationCogs: number;
  netMargin: number;
  paymentStatus: string;
}

export interface CustomerBillingSummary {
  customerName: string;
  assetCount: number;
  totalMonthlyRate: number;
  totalProRataRevenue: number;
  items: BillingItem[];
}

export interface InoutLogItem {
  id: number;
  assetId: number;
  assetNo: string;
  serialNo: string;
  modelName: string;
  manufacturer: string;
  eventType: string;
  eventDate: string;
  customerName: string;
  siteName: string | null;
  memo: string | null;
  createdAt: string;
}

export type OutboundActiveView = "BILLINGS" | "AVAILABLE_ASSETS" | "LOGS";

export interface TableSortControl {
  sortKey: string;
  sortDir: SortDirection;
  onSort: (colKey: string) => void;
}

export interface OutboundBillingAndLogsPanelProps {
  yearMonth: string;
  customerSummary: CustomerBillingSummary[];
  customerFilter: string;
  onCustomerFilterChange: (customerName: string) => void;
  activeView: OutboundActiveView;
  onActiveViewChange: (view: OutboundActiveView) => void;
  searchKeyword: string;
  onSearchKeywordChange: (keyword: string) => void;
  filteredBillings: BillingItem[];
  availableAssetCount: number;
  sortedAvailableAssets: RentalAssetItem[];
  totalLogsCount: number;
  sortedLogs: InoutLogItem[];
  selectedAssetId: string;
  onSelectAsset: (asset: RentalAssetItem) => void;
  billingSort: TableSortControl;
  availSort: TableSortControl;
  logsSort: TableSortControl;
  totalMonthContractRate: number;
  totalMonthRevenue: number;
}

const TH_CLASS = "py-2.5 px-3 hover:bg-[#d0c6b4] dark:hover:bg-slate-800/60";

export function OutboundBillingAndLogsPanel({
  yearMonth,
  customerSummary,
  customerFilter,
  onCustomerFilterChange,
  activeView,
  onActiveViewChange,
  searchKeyword,
  onSearchKeywordChange,
  filteredBillings,
  availableAssetCount,
  sortedAvailableAssets,
  totalLogsCount,
  sortedLogs,
  selectedAssetId,
  onSelectAsset,
  billingSort,
  availSort,
  logsSort,
  totalMonthContractRate,
  totalMonthRevenue,
}: OutboundBillingAndLogsPanelProps) {
  const renderSortTh = (sort: TableSortControl, label: string, colKey: string, align: "left" | "right" | "center" = "left") => (
    <SortableTh label={label} colKey={colKey} sortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.onSort} align={align} className={TH_CLASS} iconClassName="w-3.5 h-3.5" />
  );

  const subTabs: { key: OutboundActiveView; label: string }[] = [
    { key: "BILLINGS", label: `당월 청구 반영 명세 (${formatErpNumber(filteredBillings.length)}건)` },
    { key: "AVAILABLE_ASSETS", label: `임대가능 자산 선택 (${formatErpNumber(availableAssetCount)}대)` },
    { key: "LOGS", label: `출고 이력 대장 (${formatErpNumber(totalLogsCount)}건)` },
  ];

  return (
    <div className="lg:col-span-8 space-y-3">
      {/* Customer Monthly Billing Summary Cards */}
      <div className="bg-[#f4efe4] border border-[#b5a894] rounded-xl p-3.5 dark:bg-slate-900/70 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#047857] dark:text-emerald-400" />
            <span className="text-xs font-bold text-[#0f172a] dark:text-white whitespace-nowrap">[{yearMonth}] 고객사별 당월 청구액 집계 현황</span>
          </div>
          {customerFilter !== "ALL" && (
            <button onClick={() => onCustomerFilterChange("ALL")} className="text-[11px] text-[#1d4ed8] hover:underline whitespace-nowrap dark:text-blue-400">
              전체 고객사 보기
            </button>
          )}
        </div>

        {customerSummary.length === 0 ? (
          <div className="py-4 text-center text-xs text-[#475569] dark:text-slate-500">
            해당 연월({yearMonth})에 청구 반영된 출고 내역이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-44 overflow-y-auto pr-1">
            {customerSummary.map((cs) => {
              const isSelected = customerFilter === cs.customerName;
              return (
                <button
                  key={cs.customerName}
                  type="button"
                  onClick={() => {
                    onCustomerFilterChange(isSelected ? "ALL" : cs.customerName);
                    onActiveViewChange("BILLINGS");
                  }}
                  className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? "bg-[#dbeafe] border-[#2563eb] text-[#1e40af] dark:bg-blue-950/50 dark:border-blue-500 dark:text-white"
                      : "bg-[#ebe5d8] border-[#b5a894] hover:bg-[#f4efe4] text-[#0f172a] dark:bg-slate-950/70 dark:border-slate-800 dark:hover:border-slate-700 dark:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold truncate">{cs.customerName}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#f4efe4] border border-[#b5a894] text-[10px] font-mono text-[#1d4ed8] whitespace-nowrap shrink-0 dark:bg-slate-800 dark:border-transparent dark:text-blue-400">
                      {formatErpNumber(cs.assetCount)}대
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#b5a894] dark:border-slate-800/80">
                    <span className="text-[#475569] dark:text-slate-400 whitespace-nowrap">당월 청구액</span>
                    <span className="font-mono font-bold text-[#047857] dark:text-emerald-400 whitespace-nowrap">₩{formatErpNumber(cs.totalProRataRevenue)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sub-Tabs & Search Bar */}
      <div className="bg-[#ebe5d8] border border-[#b5a894] rounded-xl overflow-hidden dark:bg-slate-900/70 dark:border-slate-800">
        <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] flex flex-wrap items-center justify-between gap-2 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            {subTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onActiveViewChange(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  activeView === tab.key
                    ? "bg-[#1d4ed8] text-white shadow-sm"
                    : "bg-[#f4efe4] text-[#334155] border border-[#b5a894] hover:bg-[#ebe5d8] dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white dark:border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#475569] dark:text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => onSearchKeywordChange(e.target.value)}
              placeholder="고객사 / 자산번호 / S/N 검색"
              className="pl-8 pr-3 py-1 bg-[#f4efe4] border border-[#b5a894] rounded-lg text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1d4ed8] w-52 dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto max-h-[480px]">
          {activeView === "BILLINGS" && (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#e2dbcd] text-[#0f172a] border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
                <tr>
                  {renderSortTh(billingSort, "고객사명", "customerName")}
                  {renderSortTh(billingSort, "자산번호", "assetNo")}
                  {renderSortTh(billingSort, "제조번호(S/N)", "serialNo")}
                  {renderSortTh(billingSort, "기종 모델명", "modelName")}
                  {renderSortTh(billingSort, "청구 시작일", "startDate", "center")}
                  {renderSortTh(billingSort, "정산 종료일", "endDate", "center")}
                  {renderSortTh(billingSort, "가동일수", "operatingDays", "right")}
                  {renderSortTh(billingSort, "월 단가", "monthlyRate", "right")}
                  {renderSortTh(billingSort, "당월 청구액", "proRataRevenue", "right")}
                  {renderSortTh(billingSort, "상태", "paymentStatus", "center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/70">
                {filteredBillings.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-[#475569] dark:text-slate-500">조회된 당월 청구 내역이 없습니다.</td>
                  </tr>
                ) : (
                  filteredBillings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-bold text-[#0f172a] dark:text-white whitespace-nowrap">{b.customerName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap">{b.assetNo}</td>
                      <td className="py-2.5 px-3 font-mono text-[#475569] dark:text-slate-300 whitespace-nowrap">{b.serialNo || "-"}</td>
                      <td className="py-2.5 px-3 text-[#0f172a] dark:text-slate-200 whitespace-nowrap">{b.modelName || "-"}</td>
                      <td className="py-2.5 px-3 font-mono text-center text-[#334155] dark:text-slate-300 whitespace-nowrap">{b.startDate}</td>
                      <td className="py-2.5 px-3 font-mono text-center text-[#475569] dark:text-slate-400 whitespace-nowrap">{b.endDate}</td>
                      <td className="py-2.5 px-3 font-mono text-right text-[#0f172a] dark:text-slate-200 whitespace-nowrap">{formatErpNumber(b.operatingDays)}일</td>
                      <td className="py-2.5 px-3 font-mono text-right text-[#334155] dark:text-slate-300 whitespace-nowrap">₩{formatErpNumber(b.monthlyRate)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-right text-[#047857] dark:text-emerald-400 whitespace-nowrap">₩{formatErpNumber(b.proRataRevenue)}</td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.paymentStatus === "PAID" ? "bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-transparent" : "bg-[#fffbeb] text-[#b45309] border border-[#fde68a] dark:bg-amber-500/20 dark:text-amber-400 dark:border-transparent"}`}>
                          {b.paymentStatus === "PAID" ? "수납완료" : "청구대기"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeView === "AVAILABLE_ASSETS" && (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#e2dbcd] text-[#0f172a] border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">출고 선택</th>
                  {renderSortTh(availSort, "자산번호", "assetNo")}
                  {renderSortTh(availSort, "제조번호(S/N)", "serialNo")}
                  {renderSortTh(availSort, "기종 모델명", "modelName")}
                  {renderSortTh(availSort, "제조사", "manufacturer")}
                  {renderSortTh(availSort, "분류", "category")}
                  {renderSortTh(availSort, "기준 월단가", "standardMonthlyRate", "right")}
                  {renderSortTh(availSort, "기준 일단가", "standardDailyRate", "right")}
                  {renderSortTh(availSort, "상태", "status", "center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/70">
                {sortedAvailableAssets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-[#475569] dark:text-slate-500">임대가능 상태인 자산이 없습니다.</td>
                  </tr>
                ) : (
                  sortedAvailableAssets.map((a) => {
                    const isChosen = String(a.id) === String(selectedAssetId);
                    const resolvedDaily = resolveDailyRentalFee(a.standardMonthlyRate, a.standardDailyRate);
                    return (
                      <tr key={a.id} onClick={() => onSelectAsset(a)} className={`cursor-pointer transition ${isChosen ? "bg-[#dbeafe] dark:bg-blue-950/50" : "hover:bg-[#f4efe4] dark:hover:bg-slate-800/40"}`}>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onSelectAsset(a); }}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${isChosen ? "bg-[#1d4ed8] text-white" : "bg-[#e2dbcd] hover:bg-[#1d4ed8] text-[#0f172a] hover:text-white border border-[#b5a894] dark:bg-slate-800 dark:border-transparent dark:hover:bg-blue-600/80 dark:text-slate-200"}`}
                          >
                            {isChosen ? "선택됨" : "선택 ➔"}
                          </button>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap">{a.assetNo}</td>
                        <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-200 whitespace-nowrap">{a.serialNo || "-"}</td>
                        <td className="py-2 px-3 font-semibold text-[#0f172a] dark:text-white whitespace-nowrap">{a.modelName || "-"}</td>
                        <td className="py-2 px-3 text-[#334155] dark:text-slate-300 whitespace-nowrap">{a.manufacturer || "-"}</td>
                        <td className="py-2 px-3 text-[#475569] dark:text-slate-400 whitespace-nowrap">{a.category || "-"}</td>
                        <td className="py-2 px-3 font-mono font-bold text-right text-[#047857] dark:text-emerald-400 whitespace-nowrap">₩{formatErpNumber(a.standardMonthlyRate)}</td>
                        <td className="py-2 px-3 font-mono font-bold text-right text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap">₩{formatErpNumber(resolvedDaily)}</td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] text-[10px] font-bold dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-transparent">임대가능</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeView === "LOGS" && (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#e2dbcd] text-[#0f172a] border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
                <tr>
                  {renderSortTh(logsSort, "출고(청구시작)일", "eventDate", "center")}
                  {renderSortTh(logsSort, "자산번호", "assetNo")}
                  {renderSortTh(logsSort, "제조번호(S/N)", "serialNo")}
                  {renderSortTh(logsSort, "기종 모델명", "modelName")}
                  {renderSortTh(logsSort, "출고 고객사", "customerName")}
                  {renderSortTh(logsSort, "비고", "memo")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/70">
                {sortedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#475569] dark:text-slate-500">출고 이력이 없습니다.</td>
                  </tr>
                ) : (
                  sortedLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono text-center text-[#475569] dark:text-slate-300 whitespace-nowrap">{l.eventDate}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap">{l.assetNo}</td>
                      <td className="py-2.5 px-3 font-mono text-[#475569] dark:text-slate-300 whitespace-nowrap">{l.serialNo || "-"}</td>
                      <td className="py-2.5 px-3 text-[#0f172a] dark:text-white whitespace-nowrap">{l.modelName || "-"}</td>
                      <td className="py-2.5 px-3 font-bold text-[#047857] dark:text-emerald-400 whitespace-nowrap">{l.customerName || "-"}</td>
                      <td className="py-2.5 px-3 text-[#475569] dark:text-slate-400 whitespace-nowrap">{l.memo || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Reconciliation Bar (Gutenberg Z-Pattern Terminal Summary) */}
        <div className="p-3 bg-[#e2dbcd] border-t border-[#b5a894] flex flex-wrap items-center justify-between gap-3 text-xs dark:bg-slate-950 dark:border-slate-800">
          <div className="flex items-center gap-2 text-[#475569] dark:text-slate-400">
            <Receipt className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
            <span className="whitespace-nowrap">
              [{yearMonth}] 청구 대상 건수: <strong className="text-[#0f172a] dark:text-white font-mono">{formatErpNumber(filteredBillings.length)}건</strong>
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span className="text-[#475569] dark:text-slate-400 whitespace-nowrap">
              월 계약단가 합계: <strong className="text-[#0f172a] dark:text-slate-200">₩{formatErpNumber(totalMonthContractRate)}</strong>
            </span>
            <span className="text-[#475569] dark:text-slate-400 whitespace-nowrap">
              당월 청구 총액: <strong className="text-[#047857] dark:text-emerald-400 text-sm font-extrabold">₩{formatErpNumber(totalMonthRevenue)}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
