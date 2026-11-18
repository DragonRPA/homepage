"use client";

import React from "react";
import { Search, FileText, Scale, TrendingUp, Landmark } from "lucide-react";
import { formatErpCurrency } from "@/lib/erpFormat";
import { SortableTh, useErpTableSort } from "../SortableTh";
import { FinancialDetailItem, MAJOR_LABELS } from "./financialReportTypes";

interface FinancialDetailLedgerSectionProps {
  months: string[];
  filteredDetails: FinancialDetailItem[];
  selectedMajor: string;
  onSelectMajor: (major: string) => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  selectedSub: string;
  onClearSub: () => void;
  detailSearch: string;
  onChangeDetailSearch: (val: string) => void;
  detailSort: ReturnType<typeof useErpTableSort>;
  onOpenStandardModal: (keyOrSubAccount: string, fallbackMajor?: string) => void;
}

export const FinancialDetailLedgerSection: React.FC<FinancialDetailLedgerSectionProps> = ({
  months,
  filteredDetails,
  selectedMajor,
  onSelectMajor,
  selectedMonth,
  onSelectMonth,
  selectedSub,
  onClearSub,
  detailSearch,
  onChangeDetailSearch,
  detailSort,
  onOpenStandardModal,
}) => {
  return (
    <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
      <div className="p-2.5 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold">계정별 상세 내역</span>
          <select
            value={selectedMajor}
            onChange={(e) => onSelectMajor(e.target.value)}
            className="bg-[#f4efe4] border border-[#b5a894] text-xs px-2 py-1 rounded font-semibold dark:bg-slate-900 dark:border-slate-700"
          >
            <option value="ALL">전체 계정대분류</option>
            <option value="REVENUE">Ⅰ. 매출액</option>
            <option value="COGS">Ⅱ. 매입·원가</option>
            <option value="PAYROLL">Ⅲ. 급여·인건비</option>
            <option value="OPEX">Ⅳ. 운영비용(판관비)</option>
            <option value="TAX_DUES">Ⅴ. 세금과공과</option>
            <option value="NON_OP">Ⅵ. 영업외·자금이동</option>
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => onSelectMonth(e.target.value)}
            className="bg-[#f4efe4] border border-[#b5a894] text-xs px-2 py-1 rounded font-mono dark:bg-slate-900 dark:border-slate-700"
          >
            <option value="ALL">전체 월</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {selectedSub !== "ALL" && (
            <button
              type="button"
              onClick={onClearSub}
              className="px-2 py-0.5 bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd] rounded text-[11px] font-bold"
            >
              세목: {selectedSub} ✕
            </button>
          )}

          <span className="text-[11px] font-mono text-[#475569] dark:text-slate-400">
            (총 {filteredDetails.length.toLocaleString()}건)
          </span>
        </div>

        <div className="relative w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1.5 text-[#475569]" />
          <input
            type="text"
            value={detailSearch}
            onChange={(e) => onChangeDetailSearch(e.target.value)}
            placeholder="거래처, 적요, 세목 검색"
            className="bg-[#f4efe4] border border-[#b5a894] text-xs pl-8 pr-3 py-1 rounded w-full sm:w-56 focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700"
          />
        </div>
      </div>

      {/* 모바일 전용 전표 카드 리스트 (가로폭 100% 최적화) */}
      <div className="md:hidden divide-y divide-[#c4b6a0] dark:divide-slate-800">
        {filteredDetails.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#475569]">
            조건에 해당하는 상세 전표 내역이 없습니다.
          </div>
        ) : (
          filteredDetails.slice(0, 150).map((d) => {
            const majMeta = MAJOR_LABELS[d.majorAccount];
            return (
              <div key={d.id} className="p-3 bg-[#ebe5d8] dark:bg-slate-900 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[#334155] dark:text-slate-300">{d.date}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        d.entityType === "CORP"
                          ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]"
                          : "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                      }`}
                    >
                      {d.entityType === "CORP" ? "법인" : "개인"}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${majMeta.badgeClass}`}>
                      {majMeta.badge} · {d.subAccount}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#475569]">
                    {d.source === "TAX_INVOICE"
                      ? "세금계산서"
                      : d.source === "TAX_PAYMENT"
                      ? "국세청납부"
                      : d.source === "DEPRECIATION"
                      ? "감가상각"
                      : "통장입출금"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-[#0f172a] dark:text-slate-100 truncate">
                    {d.counterparty}
                  </span>
                  <span className="font-mono text-sm font-extrabold text-[#0f172a] dark:text-slate-100 shrink-0">
                    {formatErpCurrency(d.supplyAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] text-[#475569] dark:text-slate-400">
                  <span className="truncate">{d.description}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] shrink-0">
                    {d.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PC 전용 상세 전표 테이블 */}
      <div className="hidden md:block max-h-[360px] overflow-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-[#dcd4c4] text-[#0f172a] font-semibold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <tr>
              <SortableTh label="일자" colKey="date" sortKey={detailSort.sortKey} sortDir={detailSort.sortDir} onSort={detailSort.handleSort} className="py-1.5 px-2.5" />
              <SortableTh label="사업자" colKey="entityType" sortKey={detailSort.sortKey} sortDir={detailSort.sortDir} onSort={detailSort.handleSort} className="py-1.5 px-2.5" />
              <SortableTh label="원천" colKey="source" sortKey={detailSort.sortKey} sortDir={detailSort.sortDir} onSort={detailSort.handleSort} className="py-1.5 px-2.5" />
              <SortableTh label="계정분류" colKey="majorAccount" sortKey={detailSort.sortKey} sortDir={detailSort.sortDir} onSort={detailSort.handleSort} className="py-1.5 px-2.5" />
              <SortableTh label="계정세목" colKey="subAccount" sortKey={detailSort.sortKey} sortDir={detailSort.sortDir} onSort={detailSort.handleSort} className="py-1.5 px-2.5" />
              <SortableTh label="거래처·대상자" colKey="counterparty" sortKey={detailSort.sortKey} sortDir={detailSort.sortDir} onSort={detailSort.handleSort} className="py-1.5 px-2.5" />
              <SortableTh label="적요·품목" colKey="description" sortKey={detailSort.sortKey} sortDir={detailSort.sortDir} onSort={detailSort.handleSort} className="py-1.5 px-2.5" />
              <SortableTh label="공급가액(집행액)" colKey="supplyAmount" sortKey={detailSort.sortKey} sortDir={detailSort.sortDir} onSort={detailSort.handleSort} align="right" className="py-1.5 px-2.5" />
              <SortableTh label="부가세" colKey="vatAmount" sortKey={detailSort.sortKey} sortDir={detailSort.sortDir} onSort={detailSort.handleSort} align="right" className="py-1.5 px-2.5" />
              <SortableTh label="합계금액" colKey="totalAmount" sortKey={detailSort.sortKey} sortDir={detailSort.sortDir} onSort={detailSort.handleSort} align="right" className="py-1.5 px-2.5" />
              <SortableTh label="처리상태" colKey="status" sortKey={detailSort.sortKey} sortDir={detailSort.sortDir} onSort={detailSort.handleSort} align="center" className="py-1.5 px-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
            {filteredDetails.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="py-10 text-center text-[#475569] dark:text-slate-500 whitespace-nowrap"
                >
                  조건에 해당하는 상세 전표 내역이 없습니다.
                </td>
              </tr>
            ) : (
              filteredDetails.slice(0, 300).map((d) => {
                const majMeta = MAJOR_LABELS[d.majorAccount];
                return (
                  <tr
                    key={d.id}
                    className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-1.5 px-2.5 font-mono whitespace-nowrap">{d.date}</td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          d.entityType === "CORP"
                            ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]"
                            : "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                        }`}
                      >
                        {d.entityType === "CORP" ? "법인" : "개인"}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      {d.source === "TAX_INVOICE" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1d4ed8] dark:text-blue-400">
                          <FileText className="w-3 h-3" />
                          세금계산서
                        </span>
                      ) : d.source === "TAX_PAYMENT" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#475569] dark:text-slate-300">
                          <Scale className="w-3 h-3" />
                          국세청납부
                        </span>
                      ) : d.source === "DEPRECIATION" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7c3aed] dark:text-purple-400">
                          <TrendingUp className="w-3 h-3" />
                          감가상각
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#047857] dark:text-emerald-400">
                          <Landmark className="w-3 h-3" />
                          통장입출금
                        </span>
                      )}
                    </td>
                    <td
                      onDoubleClick={() => onOpenStandardModal(d.majorAccount)}
                      title="더블클릭: 계정대분류 준용 중소기업회계기준 설명"
                      className="py-1.5 px-2.5 whitespace-nowrap cursor-pointer select-none"
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${majMeta.badgeClass}`}
                      >
                        {majMeta.badge}
                      </span>
                    </td>
                    <td
                      onDoubleClick={() => onOpenStandardModal(d.subAccount, d.majorAccount)}
                      title="더블클릭: 계정세목 준용 중소기업회계기준 설명"
                      className="py-1.5 px-2.5 font-semibold whitespace-nowrap cursor-pointer hover:text-[#1d4ed8] hover:underline decoration-dotted select-none"
                    >
                      {d.subAccount}
                    </td>
                    <td className="py-1.5 px-2.5 font-bold whitespace-nowrap">
                      {d.counterparty}
                    </td>
                    <td className="py-1.5 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap max-w-[280px] truncate">
                      {d.description}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-bold whitespace-nowrap">
                      {formatErpCurrency(d.supplyAmount)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-[#64748b] whitespace-nowrap">
                      {d.vatAmount ? formatErpCurrency(d.vatAmount) : "-"}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-bold whitespace-nowrap">
                      {formatErpCurrency(d.totalAmount)}
                    </td>
                    <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] dark:bg-emerald-500/20 dark:text-emerald-300">
                        {d.status}
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
  );
};
