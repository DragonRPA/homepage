"use client";

import React from "react";
import { ArrowLeftRight, FileText } from "lucide-react";
import { formatErpCurrency, type SortDirection } from "@/lib/erpFormat";
import { SortableTh } from "../SortableTh";
import { type TaxLedgerStats } from "./TaxKpiAndFilterBar";

export interface TaxLedgerSubTabProps {
  isPurchaseTab: boolean;
  sortedInvoices: any[];
  activeStats: TaxLedgerStats;
  sortKey: string;
  sortDir: SortDirection;
  onSort: (colKey: string) => void;
  openReconcileModal: (inv: any) => Promise<void>;
  handleQuickFullSettle: (inv: any) => Promise<void>;
  onOpenDetail: (inv: any) => void;
  handleSendToNTS: (inv: any) => Promise<void>;
  sendingNts: boolean;
  handleAutoMatch: (ioType: "SALE" | "PURCHASE" | "ALL") => Promise<void>;
  autoMatching: boolean;
}

function getSettlementBadgeMeta(status: string, isPurchaseTab: boolean) {
  if (status === "PAID") {
    return {
      label: isPurchaseTab ? "지급완료" : "수납완료",
      className: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    };
  }
  if (status === "PARTIAL") {
    return {
      label: isPurchaseTab ? "부분지급" : "부분수납",
      className: "bg-amber-100 text-amber-800 border border-amber-300",
    };
  }
  return {
    label: isPurchaseTab ? "미지급" : "미수납",
    className: "bg-rose-100 text-rose-800 border border-rose-300",
  };
}

function getSourceTypeLabel(sourceType?: string): string {
  if (sourceType === "HOMETAX_RPA" || sourceType === "HOMETAX_SYNC") return "자체RPA수집";
  if (sourceType === "EXCEL_UPLOAD") return "홈택스엑셀";
  if (sourceType === "MANUAL") return "수동등록";
  return "ERP발행";
}

export const TaxLedgerSubTab: React.FC<TaxLedgerSubTabProps> = ({
  isPurchaseTab,
  sortedInvoices,
  activeStats,
  sortKey,
  sortDir,
  onSort,
  openReconcileModal,
  handleQuickFullSettle,
  onOpenDetail,
  handleSendToNTS,
  sendingNts,
  handleAutoMatch,
  autoMatching,
}) => {
  return (
    <div className="border border-[#b5a894] rounded bg-[#ebe5d8] overflow-hidden flex flex-col md:h-full shadow-sm">
      <div className="p-2 border-b border-[#b5a894] bg-[#dfd7c7] flex items-center justify-between text-xs font-bold text-[#57534e]">
        <div className="flex items-center gap-2">
          <span>
            {isPurchaseTab
              ? "매입 세금계산서 및 미지급 매입채무 대장"
              : "매출 세금계산서 및 미수납 매출채권 대장"}
          </span>
        </div>
        <div className="text-[11px] text-[#78716c] font-mono">
          조회 {sortedInvoices.length}건
        </div>
      </div>

      {/* 모바일 전용 카드형 대장 (가로폭 100% 최적화) */}
      <div className="md:hidden divide-y divide-[#b5a894]">
        {sortedInvoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#78716c]">
            조회된 세금계산서 내역이 없습니다.
          </div>
        ) : (
          sortedInvoices.map((inv) => {
            const totalAmt = Number(inv.totalAmount || 0);
            const settledAmt = Number(inv.settledAmount || 0);
            const unpaidAmt = Math.max(0, totalAmt - settledAmt);
            const st = inv.settlementStatus || "UNPAID";
            const badge = getSettlementBadgeMeta(st, isPurchaseTab);
            const txIds: number[] = Array.isArray(inv.matchedBankTxIds) ? inv.matchedBankTxIds : [];

            return (
              <div key={inv.id} className="p-3 bg-[#ebe5d8] flex flex-col gap-2">
                {/* 1행: 거래처명 + 상태 배지 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        inv.supplierEntityType === "INDIVIDUAL"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-blue-100 text-blue-900 border border-blue-300"
                      }`}
                    >
                      {inv.supplierEntityType === "INDIVIDUAL" ? "개인" : "법인"}
                    </span>
                    <span className="font-bold text-xs text-[#1c1917] truncate">
                      {inv.customerName}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                {/* 2행: 작성일자 + 품목명 */}
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#57534e]">
                  <span className="truncate font-medium text-[#1c1917]">{inv.itemName}</span>
                  <span className="font-mono shrink-0">
                    {inv.issueDate ? String(inv.issueDate).slice(0, 10) : "-"}
                  </span>
                </div>

                {/* 3행: 합계금액 / 정산액 / 미결잔액 */}
                <div className="grid grid-cols-3 gap-1.5 p-2 rounded bg-[#f4efe4] border border-[#c4b6a0] text-[11px]">
                  <div>
                    <span className="block text-[10px] text-[#78716c]">합계금액</span>
                    <span className="font-mono font-bold text-[#1c1917]">
                      {formatErpCurrency(totalAmt)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#78716c]">
                      {isPurchaseTab ? "지급완료" : "수납완료"}
                    </span>
                    <span className="font-mono font-bold text-emerald-800">
                      {formatErpCurrency(settledAmt)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#78716c]">
                      {isPurchaseTab ? "미지급잔액" : "미수납잔액"}
                    </span>
                    <span
                      className={`font-mono font-extrabold ${
                        unpaidAmt > 0 ? "text-rose-700" : "text-[#a8a29e]"
                      }`}
                    >
                      {formatErpCurrency(unpaidAmt)}
                    </span>
                  </div>
                </div>

                {/* 4행: 액션 버튼 바 */}
                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    {st !== "PAID" && (
                      <>
                        <button
                          onClick={() => openReconcileModal(inv)}
                          className="px-2.5 py-1 rounded text-[11px] font-bold border border-teal-800 bg-teal-700 text-white flex items-center gap-1"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>{isPurchaseTab ? "출금 대사" : "입금 대사"}</span>
                          {txIds.length > 0 && <span className="font-mono">({txIds.length})</span>}
                        </button>

                        <button
                          onClick={() => handleQuickFullSettle(inv)}
                          className="px-2.5 py-1 rounded text-[11px] font-bold border border-amber-700 bg-amber-100 text-amber-900"
                        >
                          완납확정
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenDetail(inv)}
                    className="px-2.5 py-1 rounded text-[11px] font-bold border border-blue-700 bg-blue-600 text-white"
                  >
                    상세보기
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PC 전용 고밀도 테이블 */}
      <div className="hidden md:block flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-[#ded6c5] border-b border-[#b5a894] text-[#44403c] font-bold z-10">
            <tr>
              {/* 헌장 3.2: 핵심 액션 컬럼 좌측 제1컬럼 배치 */}
              <th className="p-2 text-center w-48 border-r border-[#b5a894] whitespace-nowrap">
                <span>입출금 대사 · 세금계산서 조치</span>
              </th>
              <SortableTh label={isPurchaseTab ? "지급상태" : "수납상태"} colKey="settlementStatus" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="center" className="p-2 w-24 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label="작성일자" colKey="issueDate" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="p-2 w-24 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label={isPurchaseTab ? "공급자 (매입거래처)" : "공급받는자 (매출거래처)"} colKey="customerName" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="p-2 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label="품목명" colKey="itemName" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="p-2 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label="공급가액" colKey="supplyAmount" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" className="p-2 w-28 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label="세액" colKey="vatAmount" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" className="p-2 w-24 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label="합계금액" colKey="totalAmount" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" className="p-2 w-28 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label={isPurchaseTab ? "지급완료액" : "수납완료액"} colKey="settledAmount" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" className="p-2 w-28 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label={isPurchaseTab ? "미지급 채무잔액" : "미수납 채권잔액"} colKey="unpaidAmount" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" className="p-2 w-32 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <th className="p-2 text-center w-24 border-r border-[#b5a894] whitespace-nowrap">
                <span>수집/발행출처</span>
              </th>
              <th className="p-2 text-left w-36 whitespace-nowrap">
                <span>계산서번호 / 승인번호</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#b5a894]">
            {sortedInvoices.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-[#78716c]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-[#a8a29e]" />
                    <span className="font-semibold text-sm">
                      {isPurchaseTab
                        ? "등록된 매입 세금계산서 내역이 없습니다."
                        : "조회된 매출 세금계산서 내역이 없습니다."}
                    </span>
                    <span className="text-xs text-[#78716c]">
                      {isPurchaseTab
                        ? "우측 상단 [매입 세금계산서 등록] 또는 [홈택스 자동 수집 · 엑셀 업로드] 탭에서 매입 세금계산서를 등록해 주십시오."
                        : "상단 [발행 대기 청구 목록] 또는 [홈택스 자동 수집]을 통해 매출 세금계산서를 등록해 주십시오."}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedInvoices.map((inv) => {
                const totalAmt = Number(inv.totalAmount || 0);
                const settledAmt = Number(inv.settledAmount || 0);
                const unpaidAmt = Math.max(0, totalAmt - settledAmt);
                const st = inv.settlementStatus || "UNPAID";
                const badge = getSettlementBadgeMeta(st, isPurchaseTab);
                const txIds: number[] = Array.isArray(inv.matchedBankTxIds) ? inv.matchedBankTxIds : [];

                return (
                  <tr key={inv.id} className="hover:bg-[#dfd7c7] transition">
                    {/* 1. 좌측 제1컬럼: 입출금 대사 및 세금계산서 액션 */}
                    <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {st !== "PAID" && (
                          <>
                            <button
                              onClick={() => openReconcileModal(inv)}
                              className="px-2 py-1 rounded text-[10px] font-bold border border-teal-800 bg-teal-700 text-white hover:bg-teal-800 shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              <span>{isPurchaseTab ? "출금 대사" : "입금 대사"}</span>
                              {txIds.length > 0 && <span className="font-mono">({txIds.length})</span>}
                            </button>

                            <button
                              onClick={() => handleQuickFullSettle(inv)}
                              className="px-1.5 py-1 rounded text-[10px] font-bold border border-amber-700 bg-amber-100 text-amber-900 hover:bg-amber-200 cursor-pointer"
                              title="통장 외 카드자동납부·현금·상계 등으로 이미 결제 완료된 건을 즉시 완납 확정"
                            >
                              완납확정
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => onOpenDetail(inv)}
                          className="px-1.5 py-1 rounded text-[10px] font-bold border border-blue-700 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                        >
                          상세
                        </button>

                        {!isPurchaseTab && inv.status !== "SENT_NTS" && (
                          <button
                            onClick={() => handleSendToNTS(inv)}
                            disabled={sendingNts}
                            className="px-1.5 py-1 rounded text-[10px] font-bold border border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800"
                          >
                            전송
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 2. 수납/지급 상태 */}
                    <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* 3. 작성일자 */}
                    <td className="p-2 border-r border-[#b5a894] font-mono text-[11px] whitespace-nowrap text-[#44403c]">
                      {inv.issueDate ? String(inv.issueDate).slice(0, 10) : "-"}
                    </td>

                    {/* 4. 거래처 */}
                    <td className="p-2 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold shrink-0 ${
                              inv.supplierEntityType === "INDIVIDUAL"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-indigo-100 text-indigo-900 border border-indigo-300"
                            }`}
                          >
                            {inv.supplierEntityType === "INDIVIDUAL" ? "개인" : "법인"}
                          </span>
                          <span className="font-bold text-[#1c1917]">{inv.customerName}</span>
                        </div>
                        <span className="text-[10px] text-[#78716c] font-mono">
                          {inv.businessNo || "-"} {inv.ceoName ? `| ${inv.ceoName}` : ""}
                        </span>
                      </div>
                    </td>

                    {/* 5. 품목명 */}
                    <td className="p-2 border-r border-[#b5a894] whitespace-nowrap font-medium text-[#1c1917]">
                      {inv.itemName}
                    </td>

                    {/* 6. 공급가액 */}
                    <td className="p-2 text-right border-r border-[#b5a894] font-mono whitespace-nowrap text-[#1c1917]">
                      {formatErpCurrency(inv.supplyAmount)}
                    </td>

                    {/* 7. 세액 */}
                    <td className="p-2 text-right border-r border-[#b5a894] font-mono text-[#78716c] whitespace-nowrap">
                      {formatErpCurrency(inv.vatAmount)}
                    </td>

                    {/* 8. 합계금액 */}
                    <td className="p-2 text-right border-r border-[#b5a894] font-mono font-bold whitespace-nowrap text-[#1c1917]">
                      {formatErpCurrency(totalAmt)}
                    </td>

                    {/* 9. 수납/지급 완료액 */}
                    <td className="p-2 text-right border-r border-[#b5a894] font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {formatErpCurrency(settledAmt)}
                    </td>

                    {/* 10. 미수납 채권 / 미지급 채무 잔액 */}
                    <td
                      className={`p-2 text-right border-r border-[#b5a894] font-mono font-bold whitespace-nowrap ${
                        unpaidAmt > 0 ? "text-rose-700 bg-rose-50/40" : "text-[#a8a29e]"
                      }`}
                    >
                      {formatErpCurrency(unpaidAmt)}
                    </td>

                    {/* 11. 수집/발행 출처 */}
                    <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#dfd7c7] text-[#44403c]">
                        {getSourceTypeLabel(inv.sourceType)}
                      </span>
                    </td>

                    {/* 12. 계산서번호 / 승인번호 */}
                    <td className="p-2 font-mono text-[10px] whitespace-nowrap text-[#44403c]">
                      <div className="font-bold text-[#1c1917]">{inv.invoiceNo}</div>
                      <div className="text-[#78716c]">{inv.ntsConfirmNo || "-"}</div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 헌장 3.5: 우하단 대차대조 검증식 푸터 바 */}
      <div className="px-4 py-2.5 border-t border-[#b5a894] bg-[#ded6c5] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-3 font-mono flex-wrap">
          <span className="font-bold text-[#1c1917]">
            {isPurchaseTab ? "총 매입세금계산서" : "총 매출세금계산서"}: {formatErpCurrency(activeStats.totalGross)}
          </span>
          <span className="text-[#78716c]">=</span>
          <span className="font-bold text-emerald-800">
            {isPurchaseTab ? "지급완료액" : "수납완료액"} {formatErpCurrency(activeStats.settled)}
          </span>
          <span className="text-[#78716c]">+</span>
          <span className="font-bold text-rose-700">
            {isPurchaseTab ? "미지급 매입채무" : "미수납 매출채권"} {formatErpCurrency(activeStats.unpaid)}
          </span>
          <span className="text-[#78716c]">|</span>
          <span className="font-bold text-blue-900">
            대차 차액 {formatErpCurrency(activeStats.diff)}
          </span>
        </div>

        <button
          onClick={() => handleAutoMatch(isPurchaseTab ? "PURCHASE" : "SALE")}
          disabled={autoMatching}
          className="px-3.5 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>{isPurchaseTab ? "미지급 매입채무 일괄 대사 실행" : "미수납 매출채권 일괄 대사 실행"}</span>
        </button>
      </div>
    </div>
  );
};
