"use client";

import React from "react";
import { Link as LinkIcon, X, CheckSquare, Square, CheckCircle2 } from "lucide-react";
import { formatErpCurrency } from "@/lib/erpFormat";
import { SortableTh } from "../SortableTh";
import { STANDARD_ACCOUNT_SUBJECTS } from "@/lib/erpAccountSubjects";
import { BankTransaction } from "./bankMatchingTypes";

export interface BankMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTrans: BankTransaction | null;
  matchModalTab: "ACCOUNT" | "INVOICE";
  setMatchModalTab: (tab: "ACCOUNT" | "INVOICE") => void;
  matchedType: string;
  setMatchedType: (type: string) => void;
  matchedId: string;
  setMatchedId: (id: string) => void;
  matchMemo: string;
  setMatchMemo: (memo: string) => void;
  invoiceSearchTerm: string;
  setInvoiceSearchTerm: (term: string) => void;
  filteredModalInvoices: any[];
  selectedInvoiceIds: Set<number>;
  setSelectedInvoiceIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  selectedInvoicesSum: number;
  settleReason: string;
  setSettleReason: (reason: string) => void;
  modalInvSort: any;
  handleManualMatch: () => void;
  handleMatchWithInvoices: (forceComplete: boolean) => void;
}

export const BankMatchModal: React.FC<BankMatchModalProps> = ({
  isOpen,
  onClose,
  selectedTrans,
  matchModalTab,
  setMatchModalTab,
  matchedType,
  setMatchedType,
  matchedId,
  setMatchedId,
  matchMemo,
  setMatchMemo,
  invoiceSearchTerm,
  setInvoiceSearchTerm,
  filteredModalInvoices,
  selectedInvoiceIds,
  setSelectedInvoiceIds,
  selectedInvoicesSum,
  settleReason,
  setSettleReason,
  modalInvSort,
  handleManualMatch,
  handleMatchWithInvoices,
}) => {
  if (!isOpen || !selectedTrans) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-2xl shadow-2xl text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-white max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#b5a894] dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 flex items-center gap-1.5">
            <LinkIcon className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
            <span>통장 입출금 대사 · 계정과목 지정 및 미결 세금계산서 연결</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#dcd4c4] dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 선택한 통장 거래 요약 배너 */}
        <div className="p-3 bg-[#f4efe4] rounded border border-[#b5a894] mb-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0 dark:bg-slate-950/60 dark:border-slate-800">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#475569] font-bold">거래일시</span>
            <span className="text-[#0f172a] dark:text-slate-200 font-mono font-bold">
              {selectedTrans.transDate} {selectedTrans.transTime}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#475569] font-bold">구분 / 거래구분</span>
            <span className="font-bold text-[#0f172a] dark:text-slate-200">
              {selectedTrans.depositAmount > 0 ? "입금" : "출금"} ({selectedTrans.txChannel || "-"})
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#475569] font-bold">거래금액</span>
            <span
              className={`font-bold font-mono text-sm ${
                selectedTrans.depositAmount > 0 ? "text-[#1d4ed8]" : "text-[#dc2626]"
              }`}
            >
              {formatErpCurrency(
                selectedTrans.depositAmount > 0
                  ? selectedTrans.depositAmount
                  : selectedTrans.withdrawalAmount
              )}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#475569] font-bold">거래내용 / 예금주</span>
            <span className="text-[#0f172a] dark:text-slate-100 font-bold truncate">
              {selectedTrans.senderReceiver}{" "}
              {selectedTrans.counterpartyHolder ? `(${selectedTrans.counterpartyHolder})` : ""}
            </span>
          </div>
        </div>

        {/* 상단 모드 전환 탭 */}
        <div className="grid grid-cols-2 gap-1.5 mb-3 shrink-0">
          <button
            type="button"
            onClick={() => setMatchModalTab("ACCOUNT")}
            className={`py-2 px-3 rounded text-xs font-bold border transition ${
              matchModalTab === "ACCOUNT"
                ? "bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-xs"
                : "bg-[#f4efe4] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd]"
            }`}
          >
            ① 계정과목 지정하여 미결 정리
          </button>
          <button
            type="button"
            onClick={() => setMatchModalTab("INVOICE")}
            className={`py-2 px-3 rounded text-xs font-bold border transition ${
              matchModalTab === "INVOICE"
                ? "bg-[#047857] text-white border-[#047857] shadow-xs"
                : "bg-[#f4efe4] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd]"
            }`}
          >
            ② 미결 세금계산서와 엮어 매칭 완결 ({filteredModalInvoices.length}건)
          </button>
        </div>

        {/* 탭 본문 */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {matchModalTab === "ACCOUNT" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400">
                  {selectedTrans.depositAmount > 0 ? "입금" : "출금"} 표준 계정과목 빠른 선택
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {STANDARD_ACCOUNT_SUBJECTS.filter(
                    (s) =>
                      s.direction ===
                        (selectedTrans.depositAmount > 0 ? "DEPOSIT" : "WITHDRAWAL") ||
                      s.direction === "BOTH"
                  ).map((subj) => {
                    const active =
                      matchedType === "ACCOUNT_SUBJECT" && matchedId === subj.label;
                    return (
                      <button
                        key={subj.code}
                        type="button"
                        onClick={() => {
                          setMatchedType("ACCOUNT_SUBJECT");
                          setMatchedId(subj.label);
                        }}
                        className={`p-2 rounded border text-left text-[11px] font-bold transition truncate ${
                          active
                            ? "bg-[#dbeafe] border-[#1d4ed8] text-[#1e40af] shadow-xs"
                            : "bg-[#f4efe4] border-[#b5a894] text-[#0f172a] hover:bg-[#e2dbcd]"
                        }`}
                      >
                        {subj.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#c4b6a0]">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                    대사 분류 구분
                  </label>
                  <select
                    value={matchedType}
                    onChange={(e) => setMatchedType(e.target.value)}
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
                  >
                    <option value="ACCOUNT_SUBJECT">계정과목 지정 (재무제표 직접 반영)</option>
                    <option value="PAYROLL">급여/4대보험/원천세</option>
                    <option value="CONTRACT">임대/유통/용역 계약</option>
                    <option value="OTHER">기타 수납/가수금</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                    지정 계정과목명 / 매칭 대상 번호
                  </label>
                  <input
                    type="text"
                    value={matchedId}
                    onChange={(e) => setMatchedId(e.target.value)}
                    placeholder="계정과목명 또는 관리번호"
                    className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded font-bold focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#334155] dark:text-slate-400">
                  비고 / 적요 메모
                </label>
                <input
                  type="text"
                  value={matchMemo}
                  onChange={(e) => setMatchMemo(e.target.value)}
                  placeholder="특이사항 또는 상세 적요 입력"
                  className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#334155]">
                  미결 {selectedTrans.depositAmount > 0 ? "매출" : "매입"} 세금계산서 선택 (복수 선택 가능)
                </span>
                <input
                  type="text"
                  value={invoiceSearchTerm}
                  onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                  placeholder="거래처명, 품목, 금액 검색..."
                  className="h-7 px-2.5 rounded border border-[#b5a894] bg-[#f4efe4] text-xs w-52"
                />
              </div>

              <div className="max-h-56 overflow-y-auto border border-[#b5a894] rounded bg-[#f4efe4]">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#ded6c5] border-b border-[#b5a894] font-bold">
                    <tr>
                      <th className="p-2 text-center w-10 border-r border-[#b5a894] whitespace-nowrap">선택</th>
                      <SortableTh label="작성일자" colKey="issueDate" sortKey={modalInvSort.sortKey} sortDir={modalInvSort.sortDir} onSort={modalInvSort.handleSort} className="p-2 w-24 border-r border-[#b5a894]" iconClassName="w-3 h-3 text-[#1d4ed8]" />
                      <SortableTh label="거래처명 / 품목" colKey="customerName" sortKey={modalInvSort.sortKey} sortDir={modalInvSort.sortDir} onSort={modalInvSort.handleSort} className="p-2 border-r border-[#b5a894]" iconClassName="w-3 h-3 text-[#1d4ed8]" />
                      <SortableTh label="합계금액" colKey="totalAmount" sortKey={modalInvSort.sortKey} sortDir={modalInvSort.sortDir} onSort={modalInvSort.handleSort} align="right" className="p-2 w-28 border-r border-[#b5a894]" iconClassName="w-3 h-3 text-[#1d4ed8]" />
                      <SortableTh label="미결잔액" colKey="unpaidAmt" sortKey={modalInvSort.sortKey} sortDir={modalInvSort.sortDir} onSort={modalInvSort.handleSort} align="right" className="p-2 w-28" iconClassName="w-3 h-3 text-[#1d4ed8]" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#b5a894]">
                    {filteredModalInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-[#64748b]">
                          연결 가능한 미수납/미지급 세금계산서가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredModalInvoices.map((inv) => {
                        const invId = Number(inv.id);
                        const checked = selectedInvoiceIds.has(invId);
                        return (
                          <tr
                            key={inv.id}
                            onClick={() =>
                              setSelectedInvoiceIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(invId)) next.delete(invId);
                                else next.add(invId);
                                return next;
                              })
                            }
                            className={`cursor-pointer hover:bg-[#e2dbcd] transition ${
                              checked ? "bg-emerald-50" : inv.matchScore >= 45 ? "bg-amber-50/50" : ""
                            }`}
                          >
                            <td className="p-2 text-center border-r border-[#b5a894]">
                              {checked ? (
                                <CheckSquare className="w-4 h-4 text-[#047857] mx-auto" />
                              ) : (
                                <Square className="w-4 h-4 text-[#64748b] mx-auto" />
                              )}
                            </td>
                            <td className="p-2 font-mono border-r border-[#b5a894] whitespace-nowrap">
                              {String(inv.issueDate || "").slice(0, 10)}
                            </td>
                            <td className="p-2 border-r border-[#b5a894]">
                              <div className="font-bold text-[#0f172a]">{inv.customerName}</div>
                              <div className="text-[10px] text-[#64748b] truncate">{inv.itemName}</div>
                            </td>
                            <td className="p-2 text-right font-mono border-r border-[#b5a894] whitespace-nowrap">
                              {formatErpCurrency(inv.totalAmount)}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-[#dc2626] whitespace-nowrap">
                              {formatErpCurrency(inv.unpaidAmt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {selectedInvoiceIds.size > 0 && (
                <div className="p-2.5 rounded border border-[#047857] bg-[#ecfdf5] flex flex-wrap items-center justify-between gap-2">
                  <div className="font-mono text-[11px] flex flex-wrap items-center gap-2">
                    <span>
                      통장 거래금액:{" "}
                      <b>
                        {formatErpCurrency(
                          selectedTrans.depositAmount > 0
                            ? selectedTrans.depositAmount
                            : selectedTrans.withdrawalAmount
                        )}
                      </b>
                    </span>
                    <span>|</span>
                    <span>
                      선택 세금계산서 미결합계 ({selectedInvoiceIds.size}건):{" "}
                      <b className="text-[#047857]">{formatErpCurrency(selectedInvoicesSum)}</b>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold">차액 종결 사유:</span>
                    <select
                      value={settleReason}
                      onChange={(e) => setSettleReason(e.target.value)}
                      className="h-6 px-2 rounded border border-[#b5a894] bg-white text-[11px] font-bold"
                    >
                      <option value="수수료/단수절사 차액 상계 완납">수수료/단수절사 차액 상계 완납</option>
                      <option value="합산이체/복합결제 정산 완납">합산이체/복합결제 정산 완납</option>
                      <option value="일부 감액/에누리 합의 완납">일부 감액/에누리 합의 완납</option>
                      <option value="원천징수/공제 후 입금 완납">원천징수/공제 후 입금 완납</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[#b5a894] dark:border-slate-800 flex flex-wrap justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#0f172a] bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] font-bold transition"
          >
            취소
          </button>

          {matchModalTab === "ACCOUNT" ? (
            <button
              type="button"
              onClick={handleManualMatch}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded shadow-xs transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>[{matchedId || "계정과목"}] 대사 확정</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {selectedInvoiceIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => handleMatchWithInvoices(false)}
                  className="px-3 py-1.5 text-xs font-bold text-[#047857] bg-[#f4efe4] hover:bg-[#ecfdf5] rounded border border-[#047857] transition"
                >
                  통장 금액만큼만 부분정산 연결
                </button>
              )}
              <button
                type="button"
                disabled={selectedInvoiceIds.size === 0}
                onClick={() => handleMatchWithInvoices(true)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#047857] hover:bg-[#065f46] disabled:opacity-50 rounded shadow-xs transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>선택 세금계산서 ({selectedInvoiceIds.size}건) 엮어 완납 종결</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
