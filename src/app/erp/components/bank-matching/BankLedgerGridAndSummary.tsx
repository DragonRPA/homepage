"use client";

import React, { useMemo } from "react";
import { CheckSquare, Square, CheckCircle2 } from "lucide-react";
import { formatErpCurrency, type SortDirection } from "@/lib/erpFormat";
import { SortableTh } from "../SortableTh";
import { STANDARD_ACCOUNT_SUBJECTS, recommendAccountSubjectForTx } from "@/lib/erpAccountSubjects";
import { BankTransaction, BankSummary } from "./bankMatchingTypes";

export interface BankLedgerGridAndSummaryProps {
  sortedTransactions: BankTransaction[];
  summary: BankSummary;
  matchStatus: "UNCLOSED" | "ALL" | "MATCHED" | "UNMATCHED" | "PAYROLL" | "INVOICE";
  search: string;
  onShowAllStatus: () => void;
  selectedTxIds: Set<number>;
  setSelectedTxIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  rowAccountMap: Record<number, string>;
  setRowAccountMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  sortKey: string;
  sortDir: SortDirection;
  onSort: (colKey: string) => void;
  onUnmatch: (id: number) => void;
  onOpenMatchModal: (t: BankTransaction) => void;
  onAssignAccountSubject: (ids: number[], subjectLabel: string, customMemo?: string) => void;
}

export const BankLedgerGridAndSummary: React.FC<BankLedgerGridAndSummaryProps> = ({
  sortedTransactions,
  summary,
  matchStatus,
  search,
  onShowAllStatus,
  selectedTxIds,
  setSelectedTxIds,
  rowAccountMap,
  setRowAccountMap,
  sortKey,
  sortDir,
  onSort,
  onUnmatch,
  onOpenMatchModal,
  onAssignAccountSubject,
}) => {
  const unmatchedVisibleTransactions = useMemo(
    () => sortedTransactions.filter((t) => !t.isMatched),
    [sortedTransactions]
  );

  const renderSortTh = (
    label: string,
    key: string,
    align: "left" | "right" | "center" = "left"
  ) => (
    <SortableTh
      label={label}
      colKey={key}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      align={align}
      className="py-2 px-2.5 hover:bg-[#d0c6b4] dark:hover:bg-slate-700"
      iconClassName="w-3 h-3 text-[#1d4ed8] dark:text-blue-400"
    />
  );

  const renderMatchBadge = (t: BankTransaction) => {
    if (t.matchedType === "PAYROLL") {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ede9fe] text-[#5b21b6] border border-[#c4b5fd] dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40 whitespace-nowrap">
          {t.isClosed ? `기마감 · ${t.matchedId || "급여"}` : t.matchedId || "급여"}
        </span>
      );
    }
    if (!t.isMatched) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a] dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 whitespace-nowrap">
          미매칭
        </span>
      );
    }
    const label = t.matchedId || t.matchedType || "확정";
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 whitespace-nowrap">
        {t.isClosed ? `기마감 · ${label}` : `매칭완료 (${label})`}
      </span>
    );
  };

  const renderEmptyStateNotice = () => {
    const excludedCnt = Number(summary.excludedClosedCount || 0);
    if (matchStatus === "UNCLOSED" && excludedCnt > 0) {
      const hasSearch = Boolean(search.trim());
      return (
        <div className="flex flex-col items-center justify-center gap-2.5 py-6 px-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] text-xs font-bold whitespace-nowrap">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{hasSearch ? "미마감 내역 중 검색 결과 없음" : "대사 마감 완료"}</span>
          </div>
          <p className="text-xs text-[#334155] dark:text-slate-300 font-medium">
            기마감 {excludedCnt.toLocaleString()}건 조회 제외 · 최종 거래일시:{" "}
            <span className="font-mono font-bold text-[#0f172a] dark:text-slate-100">
              {summary.latestTxDatetime || "-"}
            </span>{" "}
            · 현재 잔액:{" "}
            <span className="font-mono font-bold text-[#047857] dark:text-emerald-400">
              {formatErpCurrency(summary.latestBalance)}
            </span>
          </p>
          <button
            type="button"
            onClick={onShowAllStatus}
            className="px-3 py-1.5 rounded bg-[#f4efe4] hover:bg-[#dcd4c4] text-[#0f172a] border border-[#b5a894] text-xs font-bold transition whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          >
            {hasSearch ? "기마감 내역 포함 검색" : "기마감 내역 포함 조회"}
          </button>
        </div>
      );
    }

    return (
      <span className="text-xs text-[#475569] dark:text-slate-500 whitespace-nowrap">
        조회된 은행 입출금 내역이 없습니다.
      </span>
    );
  };

  return (
    <>
      {/* 2. Gutenberg Z-Pattern Step 3 (Body / High-Density Grid) */}
      <div className="flex-1 md:overflow-auto p-2.5 md:p-3">
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden md:h-full flex flex-col dark:bg-slate-900 dark:border-slate-800">
          {/* 모바일 전용 카드형 입출금 대장 (가로폭 100% 최적화) */}
          <div className="md:hidden divide-y divide-[#c4b6a0] dark:divide-slate-800">
            {sortedTransactions.length === 0 ? (
              <div className="p-6 text-center">{renderEmptyStateNotice()}</div>
            ) : (
              sortedTransactions.slice(0, 200).map((t) => {
                const isDep = t.depositAmount > 0;
                const amt = isDep ? t.depositAmount : t.withdrawalAmount;
                return (
                  <div key={t.id} className="p-3 bg-[#ebe5d8] dark:bg-slate-900 flex flex-col gap-1.5">
                    {/* 1행: 거래일시 + 구분/사업자 배지 */}
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 font-mono text-[#334155] dark:text-slate-300">
                        <span>{t.transDate}</span>
                        <span className="text-[#64748b] text-[10px]">{t.transTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]">
                          {t.entityType === "INDIVIDUAL" || t.accountNo?.includes("140") ? "개인" : "법인"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isDep
                              ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]"
                              : "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]"
                          }`}
                        >
                          {isDep ? "입금" : "출금"} · {t.txChannel || "-"}
                        </span>
                      </div>
                    </div>

                    {/* 2행: 거래내용 + 금액 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {t.matchedType === "PAYROLL" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ede9fe] text-[#5b21b6] border border-[#c4b5fd] shrink-0">
                            급여
                          </span>
                        )}
                        <span className="font-bold text-xs text-[#0f172a] dark:text-slate-100 truncate">
                          {t.senderReceiver}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-sm font-extrabold shrink-0 ${
                          isDep ? "text-[#1d4ed8]" : "text-[#dc2626]"
                        }`}
                      >
                        {isDep ? "+" : "-"}
                        {formatErpCurrency(amt)}
                      </span>
                    </div>

                    {/* 3행: 거래후 잔액 + 대사상태/조치 버튼 */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#d5cbb8] dark:border-slate-800 text-[11px]">
                      <span className="font-mono text-[#475569] dark:text-slate-400">
                        잔액:{" "}
                        <b className="text-[#0f172a] dark:text-slate-200">
                          {formatErpCurrency(t.balanceAfter || 0)}
                        </b>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {renderMatchBadge(t)}

                        {t.isMatched ? (
                          <button
                            onClick={() => onUnmatch(t.id)}
                            className="px-2 py-0.5 bg-[#dcd4c4] text-[#0f172a] rounded border border-[#b5a894] text-[10px] font-bold"
                          >
                            취소
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenMatchModal(t)}
                            className="px-2 py-0.5 bg-[#1d4ed8] text-white rounded text-[10px] font-bold"
                          >
                            매칭·계정정리
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PC 전용 고밀도 테이블 */}
          <div className="hidden md:block flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#e2dbcd] text-[#0f172a] font-semibold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-2 whitespace-nowrap text-center border-r border-[#c4b6a0] dark:border-slate-700 w-10">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          unmatchedVisibleTransactions.length > 0 &&
                          unmatchedVisibleTransactions.every((t) => selectedTxIds.has(t.id))
                        ) {
                          setSelectedTxIds(new Set());
                        } else {
                          setSelectedTxIds(new Set(unmatchedVisibleTransactions.map((t) => t.id)));
                        }
                      }}
                      title="미매칭 항목 전체 선택"
                      className="inline-flex items-center justify-center"
                    >
                      {unmatchedVisibleTransactions.length > 0 &&
                      unmatchedVisibleTransactions.every((t) => selectedTxIds.has(t.id)) ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[#1d4ed8]" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-[#475569]" />
                      )}
                    </button>
                  </th>
                  <th className="py-2 px-2.5 whitespace-nowrap text-center border-r border-[#c4b6a0] dark:border-slate-700">
                    조치 / 빠른 계정정리
                  </th>
                  {renderSortTh("거래일시", "transDate")}
                  {renderSortTh("구분", "transType", "center")}
                  {renderSortTh("거래구분", "txChannel", "center")}
                  {renderSortTh("출금액(원)", "withdrawalAmount", "right")}
                  {renderSortTh("입금액(원)", "depositAmount", "right")}
                  {renderSortTh("거래후 잔액(원)", "balanceAfter", "right")}
                  {renderSortTh("거래내용", "senderReceiver")}
                  {renderSortTh("상대계좌예금주명", "counterpartyHolder")}
                  {renderSortTh("상대은행", "counterpartyBank")}
                  {renderSortTh("상대계좌번호", "counterpartyAccount")}
                  {renderSortTh("메모", "memo")}
                  {renderSortTh("대사상태", "isMatched", "center")}
                  {renderSortTh("계좌번호", "accountNo")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
                {sortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center">
                      {renderEmptyStateNotice()}
                    </td>
                  </tr>
                ) : (
                  sortedTransactions.map((t) => {
                    const isChecked = selectedTxIds.has(t.id);
                    const isDep = t.depositAmount > 0;
                    const dir = isDep ? "DEPOSIT" : "WITHDRAWAL";
                    const subjectOptions = STANDARD_ACCOUNT_SUBJECTS.filter(
                      (s) => s.direction === dir || s.direction === "BOTH"
                    );
                    const recommendedSubj =
                      rowAccountMap[t.id] ||
                      recommendAccountSubjectForTx(t) ||
                      subjectOptions[0]?.label ||
                      "";
                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-[#f4efe4] dark:hover:bg-slate-800/40 transition ${
                          isChecked ? "bg-amber-50/70" : ""
                        }`}
                      >
                        <td className="py-1.5 px-2 text-center whitespace-nowrap border-r border-[#d5cbb8] dark:border-slate-800">
                          {!t.isMatched ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedTxIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(t.id)) next.delete(t.id);
                                  else next.add(t.id);
                                  return next;
                                })
                              }
                            >
                              {isChecked ? (
                                <CheckSquare className="w-3.5 h-3.5 text-[#1d4ed8] mx-auto" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-[#64748b] mx-auto" />
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#047857] font-bold">✓</span>
                          )}
                        </td>

                        {/* 핵심 액션 컬럼 좌측 배치 (헌장 3.2 준수) */}
                        <td className="py-1.5 px-2.5 text-center whitespace-nowrap border-r border-[#d5cbb8] dark:border-slate-800">
                          {t.isMatched ? (
                            <button
                              onClick={() => onUnmatch(t.id)}
                              className="px-2 py-0.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] font-bold transition dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            >
                              매칭 취소
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => onOpenMatchModal(t)}
                                className="px-2 py-0.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-[11px] font-bold transition shadow-xs"
                              >
                                대사 매칭
                              </button>
                              <select
                                value={recommendedSubj}
                                onChange={(e) =>
                                  setRowAccountMap((prev) => ({
                                    ...prev,
                                    [t.id]: e.target.value,
                                  }))
                                }
                                className="h-5 px-1 rounded border border-[#b5a894] bg-[#f4efe4] text-[10px] font-bold text-[#0f172a] max-w-[130px]"
                              >
                                {subjectOptions.map((s) => (
                                  <option key={s.code} value={s.label}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => onAssignAccountSubject([t.id], recommendedSubj)}
                                className="px-1.5 py-0.5 bg-[#334155] hover:bg-[#1e293b] text-white rounded text-[10px] font-bold transition"
                                title="선택한 계정과목으로 즉시 미결 정리"
                              >
                                계정정리
                              </button>
                            </div>
                          )}
                        </td>

                        {/* 거래일시 */}
                        <td className="py-1.5 px-2.5 font-mono text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          {t.transDate}{" "}
                          <span className="text-[#64748b] dark:text-slate-500 text-[11px]">
                            {t.transTime}
                          </span>
                        </td>

                        {/* 입출금 구분 */}
                        <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                          {t.depositAmount > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">
                              입금
                            </span>
                          ) : t.withdrawalAmount > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30">
                              출금
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e2e8f0] text-[#334155] border border-[#cbd5e1]">
                              신규
                            </span>
                          )}
                        </td>

                        {/* 거래구분 (타행이체, 체크, 인터넷 등) */}
                        <td className="py-1.5 px-2.5 text-center whitespace-nowrap text-[#334155] dark:text-slate-300 font-medium">
                          {t.txChannel || "-"}
                        </td>

                        {/* 출금액 */}
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold whitespace-nowrap text-[#dc2626] dark:text-rose-400">
                          {t.withdrawalAmount > 0 ? formatErpCurrency(t.withdrawalAmount) : "-"}
                        </td>

                        {/* 입금액 */}
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold whitespace-nowrap text-[#1d4ed8] dark:text-blue-400">
                          {t.depositAmount > 0 ? formatErpCurrency(t.depositAmount) : "-"}
                        </td>

                        {/* 거래후 잔액 */}
                        <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                          {formatErpCurrency(t.balanceAfter || 0)}
                        </td>

                        {/* 거래내용 */}
                        <td className="py-1.5 px-2.5 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {t.matchedType === "PAYROLL" && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ede9fe] text-[#5b21b6] border border-[#c4b5fd] dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40 whitespace-nowrap">
                                급여
                              </span>
                            )}
                            <span>{t.senderReceiver}</span>
                          </div>
                        </td>

                        {/* 상대계좌예금주명 */}
                        <td className="py-1.5 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          {t.counterpartyHolder || "-"}
                        </td>

                        {/* 상대은행 */}
                        <td className="py-1.5 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          {t.counterpartyBank || "-"}
                        </td>

                        {/* 상대계좌번호 */}
                        <td className="py-1.5 px-2.5 font-mono text-[11px] text-[#475569] dark:text-slate-400 whitespace-nowrap">
                          {t.counterpartyAccount || "-"}
                        </td>

                        {/* 메모 */}
                        <td className="py-1.5 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          {t.memo || "-"}
                        </td>

                        {/* 대사상태 */}
                        <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                          {renderMatchBadge(t)}
                        </td>

                        {/* 계좌번호 */}
                        <td className="py-1.5 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]">
                              {t.entityType === "INDIVIDUAL" || t.accountNo?.includes("140")
                                ? "개인"
                                : "법인"}
                            </span>
                            <span className="font-mono text-[11px] text-[#475569] dark:text-slate-400">
                              {t.accountNo}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Gutenberg Z-Pattern Step 4 (Terminal Action & 대차대조 합계 검증식) */}
      <div className="p-3 bg-[#e2dbcd] border-t border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <span className="text-[#475569] dark:text-slate-400">조회 건수: </span>
            <span className="font-bold text-[#0f172a] dark:text-slate-100">
              {summary.totalCount.toLocaleString()}건
            </span>
            {matchStatus === "UNCLOSED" && (summary.excludedClosedCount || 0) > 0 && (
              <span className="ml-1.5 text-[11px] font-semibold text-[#047857] dark:text-emerald-400">
                (기마감 {(summary.excludedClosedCount || 0).toLocaleString()}건 제외)
              </span>
            )}
          </div>
          <span className="text-[#b5a894]">|</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">총 입금액({summary.depositCount}건): </span>
            <span className="font-bold text-[#1d4ed8] dark:text-blue-400">
              {formatErpCurrency(summary.totalDeposit)}
            </span>
          </div>
          <span className="text-[#475569]">=</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">🟢 매칭 확정액: </span>
            <span className="font-bold text-[#047857] dark:text-emerald-400">
              {formatErpCurrency(summary.matchedDeposit)}
            </span>
          </div>
          <span className="text-[#475569]">+</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">⏳ 미매칭 잔여액: </span>
            <span className="font-bold text-[#b45309] dark:text-amber-400">
              {formatErpCurrency(summary.unmatchedDeposit)}
            </span>
          </div>
          <span className="text-[#b5a894]">|</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">⚖️ 대차 차액: </span>
            <span className="font-bold text-[#047857] dark:text-emerald-400">₩0</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-[#475569] dark:text-slate-400">
              총 출금액({summary.withdrawalCount}건):{" "}
            </span>
            <span className="font-bold text-[#dc2626] dark:text-rose-400">
              {formatErpCurrency(summary.totalWithdrawal)}
            </span>
          </div>
          <span className="text-[#b5a894]">|</span>
          <div>
            <span className="text-[#475569] dark:text-slate-400">현재 잔액: </span>
            <span className="font-bold text-[#0f172a] dark:text-white">
              {formatErpCurrency(summary.latestBalance)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
