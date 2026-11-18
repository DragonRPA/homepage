"use client";

import React from "react";
import { ArrowLeftRight, CheckCircle2, CheckSquare, Link2, Square, Unlink, X } from "lucide-react";
import { formatErpCurrency, type ErpSortState, type SortDirection } from "@/lib/erpFormat";
import { SortableTh } from "../SortableTh";
import { type StandardAccountSubject } from "@/lib/erpAccountSubjects";

export interface ReconcileModalProps {
  bankSearchTerm: string;
  batchSubject: string;
  candBankSort: { sortKey: string; sortDir: SortDirection; sortState: ErpSortState; setSortState: React.Dispatch<React.SetStateAction<ErpSortState>>; handleSort: (colKey: string) => void; resetSort: () => void; };
  filteredCandidateTxs: any[];
  handleClassifyBankTxInModal: (txIds: number[], accountSubject: string) => Promise<void>;
  handleConfirmBankMatch: (forceComplete?: boolean) => Promise<void>;
  handleManualSettleSave: () => Promise<void>;
  handleUnmatchBankTx: (bankTxId?: number) => Promise<void>;
  linkedBankSort: { sortKey: string; sortDir: SortDirection; sortState: ErpSortState; setSortState: React.Dispatch<React.SetStateAction<ErpSortState>>; handleSort: (colKey: string) => void; resetSort: () => void; };
  linkedBankTxs: any[];
  manualSettleInput: string;
  modalAccountSubjects: StandardAccountSubject[];
  reconcileInvoice: any;
  reconcileLoading: boolean;
  reconcileUnpaidBalance: number;
  rowSubjectMap: Record<number, string>;
  selectedBankTxIds: Set<number>;
  selectedBankTxSum: any;
  setBankSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setBatchSubject: React.Dispatch<React.SetStateAction<string>>;
  setManualSettleInput: React.Dispatch<React.SetStateAction<string>>;
  setReconcileInvoice: React.Dispatch<any>;
  setRowSubjectMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setSelectedBankTxIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  setSettleReasonInput: React.Dispatch<React.SetStateAction<string>>;
  settleReasonInput: string;
  sortedLinkedBankTxs: any[];
}

export const ReconcileModal: React.FC<ReconcileModalProps> = ({
  bankSearchTerm,
  batchSubject,
  candBankSort,
  filteredCandidateTxs,
  handleClassifyBankTxInModal,
  handleConfirmBankMatch,
  handleManualSettleSave,
  handleUnmatchBankTx,
  linkedBankSort,
  linkedBankTxs,
  manualSettleInput,
  modalAccountSubjects,
  reconcileInvoice,
  reconcileLoading,
  reconcileUnpaidBalance,
  rowSubjectMap,
  selectedBankTxIds,
  selectedBankTxSum,
  setBankSearchTerm,
  setBatchSubject,
  setManualSettleInput,
  setReconcileInvoice,
  setRowSubjectMap,
  setSelectedBankTxIds,
  setSettleReasonInput,
  settleReasonInput,
  sortedLinkedBankTxs,
}) => {
  return (
    <>
      {reconcileInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-4xl w-full p-5 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] shrink-0">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-teal-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">
                  {reconcileInvoice.ioType === "PURCHASE"
                    ? "매입 세금계산서 ↔ 통장 출금 내역 비교 대사 (매입채무 관리)"
                    : "매출 세금계산서 ↔ 통장 입금 내역 비교 대사 (매출채권 관리)"}
                </h3>
              </div>
              <button onClick={() => setReconcileInvoice(null)} className="text-[#78716c] hover:text-[#1c1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Invoice Summary Banner */}
            <div className="my-3 p-3 rounded border border-[#b5a894] bg-[#ebe5d8] grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716c] font-bold">거래처명</span>
                <span className="font-bold text-[#1c1917] truncate">{reconcileInvoice.customerName}</span>
                <span className="text-[10px] font-mono text-[#78716c]">{reconcileInvoice.businessNo}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716c] font-bold">작성일자 / 품목</span>
                <span className="font-mono font-bold text-[#1c1917]">
                  {reconcileInvoice.issueDate ? String(reconcileInvoice.issueDate).slice(0, 10) : "-"}
                </span>
                <span className="text-[10px] truncate text-[#57534e]">{reconcileInvoice.itemName}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716c] font-bold">세금계산서 합계금액</span>
                <span className="font-mono font-bold text-sm text-[#1c1917]">
                  {formatErpCurrency(reconcileInvoice.totalAmount)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716c] font-bold">
                  {reconcileInvoice.ioType === "PURCHASE" ? "지급 완료 금액" : "수납 완료 금액"}
                </span>
                <span className="font-mono font-bold text-sm text-emerald-800">
                  {formatErpCurrency(reconcileInvoice.settledAmount || 0)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716c] font-bold">
                  {reconcileInvoice.ioType === "PURCHASE" ? "미지급 채무 잔액" : "미수납 채권 잔액"}
                </span>
                <span className="font-mono font-bold text-sm text-rose-700">
                  {formatErpCurrency(
                    Math.max(0, Number(reconcileInvoice.totalAmount || 0) - Number(reconcileInvoice.settledAmount || 0))
                  )}
                </span>
              </div>
            </div>

            {/* Body: Linked Transactions + Candidate Bank Transactions */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* 1. Already Linked Bank Transactions */}
              <div className="border border-[#b5a894] rounded bg-[#ebe5d8] overflow-hidden">
                <div className="px-3 py-2 bg-[#dfd7c7] border-b border-[#b5a894] flex items-center justify-between font-bold">
                  <span>연결 완료된 통장 입출금 내역 ({linkedBankTxs.length}건)</span>
                  {linkedBankTxs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleUnmatchBankTx()}
                      className="px-2 py-0.5 rounded bg-rose-700 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-rose-800"
                    >
                      <Unlink className="w-3 h-3" />
                      <span>전체 연결 해제</span>
                    </button>
                  )}
                </div>
                {linkedBankTxs.length === 0 ? (
                  <div className="p-3 text-center text-[#78716c]">아직 연결된 통장 입출금 내역이 없습니다.</div>
                ) : (
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-[#ded6c5] border-b border-[#b5a894] font-bold">
                      <tr>
                        <th className="p-2 text-center w-20 border-r border-[#b5a894] whitespace-nowrap">조치</th>
                        <SortableTh label="거래일자" colKey="transDate" sortKey={linkedBankSort.sortKey} sortDir={linkedBankSort.sortDir} onSort={linkedBankSort.handleSort} className="p-2 w-28 border-r border-[#b5a894]" />
                        <SortableTh label="기재내용 / 예금주" colKey="senderReceiver" sortKey={linkedBankSort.sortKey} sortDir={linkedBankSort.sortDir} onSort={linkedBankSort.handleSort} className="p-2 border-r border-[#b5a894]" />
                        <SortableTh label={reconcileInvoice.ioType === "PURCHASE" ? "출금금액" : "입금금액"} colKey="amount" sortKey={linkedBankSort.sortKey} sortDir={linkedBankSort.sortDir} onSort={linkedBankSort.handleSort} align="right" className="p-2 w-32 border-r border-[#b5a894]" />
                        <SortableTh label="계좌번호" colKey="accountNo" sortKey={linkedBankSort.sortKey} sortDir={linkedBankSort.sortDir} onSort={linkedBankSort.handleSort} className="p-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#b5a894]">
                      {sortedLinkedBankTxs.map((tx) => (
                        <tr key={tx.id} className="bg-emerald-50/40">
                          <td className="p-2 text-center border-r border-[#b5a894]">
                            <button
                              type="button"
                              onClick={() => handleUnmatchBankTx(Number(tx.id))}
                              className="px-2 py-0.5 rounded border border-rose-600 text-rose-700 hover:bg-rose-100 font-bold text-[10px]"
                            >
                              해제
                            </button>
                          </td>
                          <td className="p-2 font-mono border-r border-[#b5a894]">{tx.transDate}</td>
                          <td className="p-2 border-r border-[#b5a894] font-bold">
                            {tx.senderReceiver} {tx.counterpartyHolder ? `(${tx.counterpartyHolder})` : ""}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-800 border-r border-[#b5a894]">
                            {formatErpCurrency(
                              reconcileInvoice.ioType === "PURCHASE" ? tx.withdrawalAmount || tx.amount : tx.depositAmount || tx.amount
                            )}
                          </td>
                          <td className="p-2 font-mono text-[#78716c]">{tx.accountNo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* 2. Candidate Bank Transactions from IBK erp_bank_transactions */}
              <div className="border border-[#b5a894] rounded bg-[#ebe5d8] overflow-hidden">
                <div className="px-3 py-2 bg-[#dfd7c7] border-b border-[#b5a894] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">
                      통장 {reconcileInvoice.ioType === "PURCHASE" ? "출금" : "입금"} 후보 목록 ({filteredCandidateTxs.length}건)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedBankTxIds.size === filteredCandidateTxs.length && filteredCandidateTxs.length > 0) {
                          setSelectedBankTxIds(new Set());
                        } else {
                          setSelectedBankTxIds(new Set(filteredCandidateTxs.map((t) => Number(t.id))));
                        }
                      }}
                      className="px-2 py-0.5 rounded border border-[#b5a894] bg-[#f4efe4] hover:bg-[#e2dbcd] text-[10px] font-bold"
                    >
                      {selectedBankTxIds.size === filteredCandidateTxs.length && filteredCandidateTxs.length > 0
                        ? "전체 선택 해제"
                        : "현재 목록 전체 선택"}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 선택 건 일괄 계정과목 정리 바 (세금계산서 외 일반 입출금 일괄 소거) */}
                    {selectedBankTxIds.size > 0 && (
                      <div className="flex items-center gap-1.5 bg-[#f4efe4] px-2 py-1 rounded border border-[#b5a894]">
                        <span className="text-[10px] font-bold text-[#44403c] whitespace-nowrap">
                          선택 {selectedBankTxIds.size}건 계정과목 정리:
                        </span>
                        <select
                          value={batchSubject || modalAccountSubjects[0]?.label || ""}
                          onChange={(e) => setBatchSubject(e.target.value)}
                          className="h-6 px-1.5 rounded border border-[#b5a894] bg-white text-[11px] font-bold text-[#1c1917]"
                        >
                          {modalAccountSubjects.map((s) => (
                            <option key={s.code} value={s.label}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            handleClassifyBankTxInModal(
                              Array.from(selectedBankTxIds),
                              batchSubject || modalAccountSubjects[0]?.label || ""
                            )
                          }
                          className="h-6 px-2 rounded bg-indigo-700 hover:bg-indigo-800 text-white text-[10px] font-bold whitespace-nowrap"
                        >
                          일괄 정리 확정
                        </button>
                      </div>
                    )}
                    <input
                      type="text"
                      value={bankSearchTerm}
                      onChange={(e) => setBankSearchTerm(e.target.value)}
                      placeholder="입출금자명, 금액, 일자 검색..."
                      className="h-7 px-2.5 rounded border border-[#b5a894] bg-[#f4efe4] text-xs w-48"
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#ded6c5] border-b border-[#b5a894] font-bold z-10">
                      <tr>
                        <th className="p-2 text-center w-10 border-r border-[#b5a894] whitespace-nowrap">선택</th>
                        <SortableTh label="매칭 분석" colKey="matchScore" sortKey={candBankSort.sortKey} sortDir={candBankSort.sortDir} onSort={candBankSort.handleSort} align="center" className="p-2 w-24 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
                        <SortableTh label="거래일자" colKey="transDate" sortKey={candBankSort.sortKey} sortDir={candBankSort.sortDir} onSort={candBankSort.handleSort} className="p-2 w-24 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
                        <SortableTh label="기재내용 / 상대예금주" colKey="senderReceiver" sortKey={candBankSort.sortKey} sortDir={candBankSort.sortDir} onSort={candBankSort.handleSort} className="p-2 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
                        <SortableTh label={reconcileInvoice.ioType === "PURCHASE" ? "출금금액" : "입금금액"} colKey="amount" sortKey={candBankSort.sortKey} sortDir={candBankSort.sortDir} onSort={candBankSort.handleSort} align="right" className="p-2 w-28 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
                        <th className="p-2 text-left w-64 border-r border-[#b5a894] whitespace-nowrap">
                          세금계산서 외 계정과목 지정 정리
                        </th>
                        <SortableTh label="계좌번호" colKey="accountNo" sortKey={candBankSort.sortKey} sortDir={candBankSort.sortDir} onSort={candBankSort.handleSort} className="p-2" iconClassName="w-3 h-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#b5a894]">
                      {reconcileLoading ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-[#78716c]">
                            통장 입출금 내역을 비교 분석하는 중입니다...
                          </td>
                        </tr>
                      ) : filteredCandidateTxs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-[#78716c]">
                            조건에 해당하는 미매칭 통장 입출금 내역이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        filteredCandidateTxs.map((tx) => {
                          const txId = Number(tx.id);
                          const checked = selectedBankTxIds.has(txId);
                          const amt = reconcileInvoice.ioType === "PURCHASE"
                            ? Number(tx.withdrawalAmount || tx.amount || 0)
                            : Number(tx.depositAmount || tx.amount || 0);
                          const currentSubj =
                            rowSubjectMap[txId] || tx.recommendedAccount || modalAccountSubjects[0]?.label || "";
                          return (
                            <tr
                              key={tx.id}
                              onClick={() => {
                                setSelectedBankTxIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(txId)) next.delete(txId);
                                  else next.add(txId);
                                  return next;
                                });
                              }}
                              className={`cursor-pointer hover:bg-[#dfd7c7] transition ${
                                checked ? "bg-teal-50" : tx.matchScore >= 50 ? "bg-amber-50/40" : ""
                              }`}
                            >
                              <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                                {checked ? (
                                  <CheckSquare className="w-4 h-4 text-teal-700 mx-auto" />
                                ) : (
                                  <Square className="w-4 h-4 text-[#78716c] mx-auto" />
                                )}
                              </td>
                              <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                                {tx.matchScore >= 80 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    강력추천 ({tx.matchReasons?.join("·")})
                                  </span>
                                ) : tx.matchScore >= 40 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    유사후보 ({tx.matchReasons?.join("·")})
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-[#78716c]">일반내역</span>
                                )}
                              </td>
                              <td className="p-2 font-mono border-r border-[#b5a894] whitespace-nowrap">{tx.transDate}</td>
                              <td className="p-2 border-r border-[#b5a894] whitespace-nowrap">
                                <span className="font-bold text-[#1c1917]">{tx.senderReceiver}</span>
                                {tx.counterpartyHolder && (
                                  <span className="text-[10px] text-[#78716c] ml-1.5">({tx.counterpartyHolder})</span>
                                )}
                              </td>
                              <td className="p-2 text-right font-mono font-bold border-r border-[#b5a894] whitespace-nowrap text-blue-900">
                                {formatErpCurrency(amt)}
                              </td>
                              <td
                                className="p-1.5 border-r border-[#b5a894] whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1">
                                  <select
                                    value={currentSubj}
                                    onChange={(e) =>
                                      setRowSubjectMap((prev) => ({
                                        ...prev,
                                        [txId]: e.target.value,
                                      }))
                                    }
                                    className="h-6 px-1.5 rounded border border-[#b5a894] bg-[#f4efe4] text-[10px] font-bold text-[#1c1917] flex-1 min-w-[140px]"
                                  >
                                    {modalAccountSubjects.map((s) => (
                                      <option key={s.code} value={s.label}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleClassifyBankTxInModal([txId], currentSubj)}
                                    className="h-6 px-2 rounded bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold shrink-0"
                                  >
                                    계정정리
                                  </button>
                                </div>
                              </td>
                              <td className="p-2 text-[10px] text-[#78716c] font-mono whitespace-nowrap">
                                {tx.accountNo}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2-B. 선택 통장내역 금액 비교 및 차액 정산 사유 바 */}
              {selectedBankTxIds.size > 0 && (
                <div className="p-2.5 rounded border border-teal-700 bg-teal-50/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-3 font-mono">
                    <span>
                      미결 잔액: <b className="text-rose-700">{formatErpCurrency(reconcileUnpaidBalance)}</b>
                    </span>
                    <span>|</span>
                    <span>
                      선택 통장합계 ({selectedBankTxIds.size}건):{" "}
                      <b className="text-teal-800">{formatErpCurrency(selectedBankTxSum)}</b>
                    </span>
                    <span>|</span>
                    <span>
                      차액:{" "}
                      <b
                        className={
                          Math.abs(reconcileUnpaidBalance - selectedBankTxSum) <= 1000
                            ? "text-emerald-700"
                            : "text-amber-800"
                        }
                      >
                        {formatErpCurrency(reconcileUnpaidBalance - selectedBankTxSum)}
                      </b>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#44403c] whitespace-nowrap">차액 종결 사유:</span>
                    <select
                      value={settleReasonInput}
                      onChange={(e) => setSettleReasonInput(e.target.value)}
                      className="h-6 px-2 rounded border border-[#b5a894] bg-white text-[11px] font-bold text-[#1c1917]"
                    >
                      <option value="수수료/단수절사 차액 상계 완납">수수료/단수절사 차액 상계 완납</option>
                      <option value="합산이체/복합결제 정산 완납">합산이체/복합결제 정산 완납</option>
                      <option value="일부 감액/에누리 합의 완납">일부 감액/에누리 합의 완납</option>
                      <option value="원천징수/공제 후 입금 완납">원천징수/공제 후 입금 완납</option>
                      <option value="타계좌/카드 분할정산 완납">타계좌/카드 분할정산 완납</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 3. Manual Settle Amount Adjustment */}
              <div className="p-3 rounded border border-[#b5a894] bg-[#ebe5d8] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#57534e]">직접 정산액 지정 (현금·상계·카드결제 등):</span>
                  <input
                    type="text"
                    value={manualSettleInput}
                    onChange={(e) => setManualSettleInput(e.target.value)}
                    className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-mono font-bold w-36 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setManualSettleInput(String(Math.round(Number(reconcileInvoice.totalAmount || 0))))}
                    className="px-2 py-1 rounded border border-[#b5a894] bg-[#f4efe4] hover:bg-[#dfd7c7] text-[10px] font-bold"
                  >
                    전액 완납 입력
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleManualSettleSave}
                  className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs"
                >
                  직접 정산액 저장
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 mt-3 border-t border-[#b5a894] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setReconcileInvoice(null)}
                className="h-8 px-4 rounded border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] font-bold text-xs"
              >
                닫기
              </button>
              <div className="flex flex-wrap items-center gap-2">
                {selectedBankTxIds.size > 0 && selectedBankTxSum < reconcileUnpaidBalance - 1000 && (
                  <button
                    type="button"
                    disabled={reconcileLoading}
                    onClick={() => handleConfirmBankMatch(false)}
                    className="h-8 px-3 rounded border border-teal-700 bg-[#f4efe4] hover:bg-teal-50 text-teal-900 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>선택 금액({formatErpCurrency(selectedBankTxSum)})만큼만 부분수납 반영</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={selectedBankTxIds.size === 0 || reconcileLoading}
                  onClick={() => handleConfirmBankMatch(true)}
                  className={`h-8 px-4 rounded font-bold text-xs flex items-center gap-1.5 shadow ${
                    selectedBankTxIds.size > 0
                      ? "bg-teal-700 hover:bg-teal-800 text-white cursor-pointer"
                      : "bg-[#d8d0c2] text-[#a8a29e] cursor-not-allowed"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {selectedBankTxIds.size > 0 && Math.abs(reconcileUnpaidBalance - selectedBankTxSum) > 1000
                      ? `선택 통장내역 (${selectedBankTxIds.size}건) 엮어 전액 완납 종결 확정`
                      : `선택한 통장 내역 (${selectedBankTxIds.size}건) 대사 완결 확정`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
