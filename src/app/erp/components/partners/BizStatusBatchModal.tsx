"use client";

import React from "react";
import { Ban, Check, RefreshCw, ShieldAlert, X } from "lucide-react";
import { sortErpItems, type ErpSortState, type SortDirection } from "@/lib/erpFormat";
import { SortableTh } from "../SortableTh";
import { getNtsBizStateBadgeLabel } from "@/lib/partnerStatusClient";
import { type Partner } from "./partnerTypes";

export interface BizStatusBatchModalProps {
  batchAutoBlock: boolean;
  batchLoading: boolean;
  batchResult: { summary: any; results: any[]; } | null;
  batchScope: "CUSTOMER" | "ALL" | "FILTERED";
  handleRunBatchBizStatusCheck: () => Promise<void>;
  handleRunSingleNtsCheck: (partner: Partner, autoUnblockActive?: boolean) => Promise<void>;
  ntsSort: { sortKey: string; sortDir: SortDirection; sortState: ErpSortState; setSortState: React.Dispatch<React.SetStateAction<ErpSortState>>; handleSort: (colKey: string) => void; resetSort: () => void; };
  partners: Partner[];
  setBatchAutoBlock: React.Dispatch<React.SetStateAction<boolean>>;
  setBatchResult: React.Dispatch<React.SetStateAction<{ summary: any; results: any[]; } | null>>;
  setBatchScope: React.Dispatch<React.SetStateAction<"CUSTOMER" | "ALL" | "FILTERED">>;
  setSelectedPartner: React.Dispatch<React.SetStateAction<Partner | null>>;
  setShowBizStatusBatchModal: React.Dispatch<React.SetStateAction<boolean>>;
  singleNtsCheckingId: number | null;
  sortedPartners: Partner[];
}

export const BizStatusBatchModal: React.FC<BizStatusBatchModalProps> = ({
  batchAutoBlock,
  batchLoading,
  batchResult,
  batchScope,
  handleRunBatchBizStatusCheck,
  handleRunSingleNtsCheck,
  ntsSort,
  partners,
  setBatchAutoBlock,
  setBatchResult,
  setBatchScope,
  setSelectedPartner,
  setShowBizStatusBatchModal,
  singleNtsCheckingId,
  sortedPartners,
}) => {
  return (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6"
          onClick={() => !batchLoading && setShowBizStatusBatchModal(false)}
        >
          <div
            className="w-full max-w-6xl max-h-[90vh] bg-[#ebe5d8] rounded-lg border-2 border-[#b5a894] shadow-2xl flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-[#e2dbcd] border-b border-[#b5a894] flex items-center justify-between gap-3 shrink-0 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-4 h-4 text-[#b91c1c] dark:text-rose-400 shrink-0" />
                <h3 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                  휴폐업 일괄조회
                </h3>
              </div>
              <button
                type="button"
                disabled={batchLoading}
                onClick={() => setShowBizStatusBatchModal(false)}
                className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Z-Pattern Top Control Bar: Scope (Left) -> Pipeline Action (Right) */}
            <div className="px-4 py-3 bg-[#f4efe4] border-b border-[#b5a894] flex flex-wrap items-end justify-between gap-3 shrink-0 dark:bg-slate-900/70 dark:border-slate-800">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                    조회 범위
                  </label>
                  <select
                    value={batchScope}
                    disabled={batchLoading}
                    onChange={(e) =>
                      setBatchScope(e.target.value as "CUSTOMER" | "FILTERED" | "ALL")
                    }
                    className="h-8 px-2.5 text-xs font-semibold bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                  >
                    <option value="CUSTOMER">매출처 전체</option>
                    <option value="FILTERED">
                      현재 필터 목록 ({sortedPartners.length}건)
                    </option>
                    <option value="ALL">전체 거래처</option>
                  </select>
                </div>

                <label className="h-8 flex items-center gap-2 text-xs font-semibold text-[#0f172a] dark:text-slate-200 cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={batchAutoBlock}
                    disabled={batchLoading}
                    onChange={(e) => setBatchAutoBlock(e.target.checked)}
                    className="w-4 h-4 accent-[#b91c1c] rounded border-[#b5a894]"
                  />
                  <span>휴업·폐업 거래불가 자동적용</span>
                </label>
              </div>

              <button
                type="button"
                disabled={batchLoading}
                onClick={handleRunBatchBizStatusCheck}
                className="h-8 px-3.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-[#fdfbf7] rounded border border-[#1e40af] text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${batchLoading ? "animate-spin" : ""}`} />
                <span>{batchLoading ? "조회 실행중" : "일괄조회 실행"}</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 flex flex-col bg-[#f4efe4] dark:bg-slate-950 overflow-hidden">
              {!batchResult ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 p-10 text-center">
                  <ShieldAlert className="w-8 h-8 text-[#64748b] dark:text-slate-500" />
                  <p className="text-xs font-semibold text-[#475569] dark:text-slate-400">
                    조회 범위를 선택하고 일괄조회 실행을 누르세요.
                  </p>
                </div>
              ) : (() => {
                const summary = batchResult.summary || {};
                const rawResults = Array.isArray(batchResult.results) ? batchResult.results : [];
                const results = sortErpItems(rawResults, ntsSort.sortKey, ntsSort.sortDir);
                const otherCount =
                  Number(summary.unregisteredCount || 0) +
                  Number(summary.invalidBizNoCount || 0) +
                  Number(summary.errorCount || 0);
                const inactiveBizCount =
                  Number(summary.suspendedCount || 0) + Number(summary.closedCount || 0);

                return (
                  <>
                    {/* KPI Strip */}
                    <div className="px-4 py-2.5 bg-[#ebe5d8] border-b border-[#b5a894] flex flex-wrap items-center gap-2 shrink-0 dark:bg-slate-900 dark:border-slate-800">
                      <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#dcd4c4] text-[#0f172a] border border-[#b5a894] whitespace-nowrap shrink-0 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                        조회대상 {summary.targetCount || 0}
                      </span>
                      <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#dcfce7] text-[#166534] border border-[#86efac] whitespace-nowrap shrink-0 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                        정상(계속) {summary.activeCount || 0}
                      </span>
                      <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fcd34d] whitespace-nowrap shrink-0 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                        휴업자 {summary.suspendedCount || 0}
                      </span>
                      <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5] whitespace-nowrap shrink-0 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                        폐업자 {summary.closedCount || 0}
                      </span>
                      <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#e2e8f0] text-[#334155] border border-[#cbd5e1] whitespace-nowrap shrink-0 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        미등록/오류 {otherCount}
                      </span>
                      <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#fecdd3] text-[#9f1239] border border-[#fda4af] whitespace-nowrap shrink-0 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800">
                        신규 거래불가 {summary.newlyBlockedCount || 0}
                      </span>
                    </div>

                    {/* High-Density Results Table (Charter 3.2: leftmost action column, nowrap) */}
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-[#e2dbcd] text-[#0f172a] border-b border-[#b5a894] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold whitespace-nowrap">상세</th>
                            <SortableTh label="상호명" colKey="partnerName" sortKey={ntsSort.sortKey} sortDir={ntsSort.sortDir} onSort={ntsSort.handleSort} className="px-3 py-2 font-bold" />
                            <SortableTh label="사업자등록번호" colKey="businessNo" sortKey={ntsSort.sortKey} sortDir={ntsSort.sortDir} onSort={ntsSort.handleSort} className="px-3 py-2 font-bold" />
                            <SortableTh label="국세청 상태" colKey="ntsBizState" sortKey={ntsSort.sortKey} sortDir={ntsSort.sortDir} onSort={ntsSort.handleSort} className="px-3 py-2 font-bold" />
                            <SortableTh label="과세유형/사유" colKey="ntsTaxType" sortKey={ntsSort.sortKey} sortDir={ntsSort.sortDir} onSort={ntsSort.handleSort} className="px-3 py-2 font-bold" />
                            <SortableTh label="ERP 거래상태" colKey="nextStatus" sortKey={ntsSort.sortKey} sortDir={ntsSort.sortDir} onSort={ntsSort.handleSort} className="px-3 py-2 font-bold" />
                            <th className="px-3 py-2 text-left font-bold whitespace-nowrap">상태 조치</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#d6ccb8] dark:divide-slate-800">
                          {results.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-4 py-8 text-center text-xs text-[#64748b] dark:text-slate-400"
                              >
                                조회 결과가 없습니다.
                              </td>
                            </tr>
                          ) : (
                            results.map((r: any) => {
                              const matchedPartner = partners.find((p) => p.id === r.partnerId);
                              const canRestoreActive =
                                (r.nextStatus === "BLOCKED" || r.prevStatus === "BLOCKED") &&
                                r.ntsBizState === "ACTIVE" &&
                                Boolean(matchedPartner);
                              const isAlertState =
                                r.ntsBizState === "CLOSED" || r.ntsBizState === "SUSPENDED";

                              return (
                                <tr
                                  key={`${r.partnerId}-${r.businessNo}`}
                                  className={`h-10 transition ${
                                    isAlertState
                                      ? "bg-[#fef2f2]/80 dark:bg-rose-950/25"
                                      : "hover:bg-[#ebe5d8]/70 dark:hover:bg-slate-900/70"
                                  }`}
                                >
                                  <td className="px-3 py-1.5 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (matchedPartner) setSelectedPartner(matchedPartner);
                                        setShowBizStatusBatchModal(false);
                                      }}
                                      className="px-2 py-1 rounded text-[11px] font-bold bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] whitespace-nowrap shrink-0 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                                    >
                                      상세 ➔
                                    </button>
                                  </td>
                                  <td className="px-3 py-1.5 font-semibold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                                    {r.partnerName}
                                  </td>
                                  <td className="px-3 py-1.5 font-mono text-[#334155] dark:text-slate-300 whitespace-nowrap">
                                    {r.businessNo || "-"}
                                  </td>
                                  <td className="px-3 py-1.5 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                                        r.ntsBizState === "ACTIVE"
                                          ? "bg-[#dcfce7] text-[#166534] border-[#86efac] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                          : r.ntsBizState === "SUSPENDED"
                                          ? "bg-[#fef3c7] text-[#92400e] border-[#fcd34d] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                          : r.ntsBizState === "CLOSED"
                                          ? "bg-[#fee2e2] text-[#991b1b] border-[#fca5a5] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                          : "bg-[#e2e8f0] text-[#334155] border-[#cbd5e1] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                      }`}
                                    >
                                      {getNtsBizStateBadgeLabel(r.ntsBizState)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-1.5 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                                    <span>{r.ntsTaxType || r.ntsStatusMsg || "-"}</span>
                                    {r.ntsClosedDate && (
                                      <span className="ml-1.5 font-mono text-[11px] text-[#991b1b] dark:text-rose-400">
                                        ({r.ntsClosedDate})
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                                          r.nextStatus === "BLOCKED"
                                            ? "bg-[#fee2e2] text-[#991b1b] border-[#fca5a5] dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                                            : "bg-[#dcfce7] text-[#166534] border-[#86efac] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                        }`}
                                      >
                                        {r.nextStatus === "BLOCKED" ? (
                                          <Ban className="w-3 h-3" />
                                        ) : (
                                          <Check className="w-3 h-3" />
                                        )}
                                        <span>
                                          {r.prevStatus !== r.nextStatus
                                            ? `${r.prevStatus} ➔ ${r.nextStatus}`
                                            : r.nextStatus === "BLOCKED"
                                            ? "거래불가"
                                            : r.nextStatus}
                                        </span>
                                      </span>
                                      {r.newlyBlocked && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#b91c1c] text-[#fdfbf7] whitespace-nowrap shrink-0">
                                          신규차단
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-1.5 whitespace-nowrap">
                                    {canRestoreActive ? (
                                      <button
                                        type="button"
                                        disabled={singleNtsCheckingId === r.partnerId}
                                        onClick={async () => {
                                          if (!matchedPartner) return;
                                          await handleRunSingleNtsCheck(matchedPartner, true);
                                          setBatchResult((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  results: prev.results.map((item) =>
                                                    item.partnerId === r.partnerId
                                                      ? {
                                                          ...item,
                                                          prevStatus: item.nextStatus,
                                                          nextStatus: "ACTIVE",
                                                          newlyBlocked: false,
                                                        }
                                                      : item
                                                  ),
                                                }
                                              : prev
                                          );
                                        }}
                                        className="px-2 py-1 rounded text-[11px] font-bold bg-[#15803d] hover:bg-[#166534] text-[#fdfbf7] border border-[#166534] disabled:opacity-50 whitespace-nowrap shrink-0"
                                      >
                                        정상 복원
                                      </button>
                                    ) : (
                                      <span className="text-[11px] text-[#64748b] dark:text-slate-500 whitespace-nowrap">
                                        -
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Z-Pattern Bottom Terminal Audit Strip */}
                    <div className="px-4 py-2.5 bg-[#e2dbcd] border-t border-[#b5a894] flex flex-wrap items-center justify-between gap-2 shrink-0 dark:bg-slate-800 dark:border-slate-700">
                      <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                        대상 {summary.targetCount || 0}건 = 정상 {summary.activeCount || 0}건 + 휴·폐업{" "}
                        {inactiveBizCount}건 + 기타 {otherCount}건
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBizStatusBatchModal(false)}
                        className="px-3 py-1.5 rounded text-xs font-bold bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] whitespace-nowrap shrink-0 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                      >
                        닫기
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
  );
};
