"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Scale,
  TrendingUp,
  ArrowLeftRight,
  MessageSquare,
  Upload,
  Save,
} from "lucide-react";
import { formatErpCurrency, formatErpInputNumber, cleanErpNumber } from "@/lib/erpFormat";
import type { StatementsData, UnsettledInvoiceBreakdownItem } from "./financialReportTypes";

interface FinancialStatementsBoardProps {
  statements: StatementsData;
  year: string;
  yearLabel: string;
  entityFilter: "ALL" | "CORP" | "INDIVIDUAL";
  amountBasis: "SUPPLY" | "TOTAL";
  remarkText: string;
  onChangeRemarkText: (val: string) => void;
  taxWithholding: number;
  onChangeTaxWithholding: (val: number) => void;
  taxVat: number;
  onChangeTaxVat: (val: number) => void;
  taxCorporate: number;
  onChangeTaxCorporate: (val: number) => void;
  taxPayment: number;
  onChangeTaxPayment: (val: number) => void;
  savingRemark: boolean;
  uploadingTaxFile: boolean;
  saveMessage: string;
  onTriggerTaxFileUpload: () => void;
  onSaveRemarkAndTax: () => void;
  onOpenStandardModal: (keyOrSubAccount: string, fallbackMajor?: string) => void;
}

interface HoverPopoverState {
  kind: "AR" | "AP";
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
}

export const FinancialStatementsBoard: React.FC<FinancialStatementsBoardProps> = ({
  statements,
  year,
  yearLabel,
  entityFilter,
  amountBasis,
  remarkText,
  onChangeRemarkText,
  taxWithholding,
  onChangeTaxWithholding,
  taxVat,
  onChangeTaxVat,
  taxCorporate,
  onChangeTaxCorporate,
  taxPayment,
  onChangeTaxPayment,
  savingRemark,
  uploadingTaxFile,
  saveMessage,
  onTriggerTaxFileUpload,
  onSaveRemarkAndTax,
  onOpenStandardModal,
}) => {
  const arItems: UnsettledInvoiceBreakdownItem[] = statements.bs.assets.accountsReceivableItems ?? [];
  const apItems: UnsettledInvoiceBreakdownItem[] = statements.bs.liabilities.accountsPayableItems ?? [];

  const [hoverPopover, setHoverPopover] = useState<HoverPopoverState | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const cancelCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClosePopover = useCallback(() => {
    cancelCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setHoverPopover(null);
    }, 140);
  }, [cancelCloseTimer]);

  const closePopoverImmediately = useCallback(() => {
    cancelCloseTimer();
    setHoverPopover(null);
  }, [cancelCloseTimer]);

  const openHoverPopover = useCallback(
    (kind: "AR" | "AP", el: HTMLElement) => {
      cancelCloseTimer();
      const rect = el.getBoundingClientRect();
      const width = Math.min(660, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const placeAbove = spaceBelow < 260 && spaceAbove > spaceBelow;

      setHoverPopover({
        kind,
        left,
        width,
        maxHeight: Math.max(180, (placeAbove ? spaceAbove : spaceBelow) - 18),
        ...(placeAbove
          ? { bottom: Math.max(12, window.innerHeight - rect.top + 6) }
          : { top: Math.max(12, rect.bottom + 6) }),
      });
    },
    [cancelCloseTimer]
  );

  useEffect(() => {
    if (!hoverPopover) return;
    const handleScroll = (e: Event) => {
      if (popoverRef.current && e.target instanceof Node && popoverRef.current.contains(e.target)) {
        return;
      }
      closePopoverImmediately();
    };
    const handleResize = () => closePopoverImmediately();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [hoverPopover, closePopoverImmediately]);

  useEffect(() => {
    return () => cancelCloseTimer();
  }, [cancelCloseTimer]);

  const activePopoverItems = hoverPopover?.kind === "AR" ? arItems : apItems;
  const activePopoverTotal =
    hoverPopover?.kind === "AR"
      ? statements.bs.assets.accountsReceivable
      : statements.bs.liabilities.accountsPayable;
  const isArPopover = hoverPopover?.kind === "AR";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* ① 재무상태표 (BS - Balance Sheet) */}
      <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 flex flex-col">
        <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Scale className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400 shrink-0" />
            <span className="whitespace-nowrap">① 재무상태표 (BS - Balance Sheet)</span>
          </div>
          <span className="text-[11px] font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
            {yearLabel} 기말 기준
          </span>
        </div>

        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 text-xs">
          {/* 좌측: 자산 (Assets) */}
          <div className="bg-[#f4efe4] border border-[#c4b6a0] rounded p-2.5 dark:bg-slate-950 dark:border-slate-800 flex flex-col justify-between">
            <div className="space-y-1">
              <div
                onDoubleClick={() => onOpenStandardModal("BS_CURRENT_ASSETS")}
                title="더블클릭: 중소기업회계기준 제7조(유동자산과 비유동자산 구분) 설명"
                className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#1e3a8a] dark:text-blue-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>Ⅰ. 유동자산</span>
                <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.bs.assets.currentAssets)}</span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("BS_CASH")}
                title="더블클릭: 중소기업회계기준 제8조(당좌자산)·별지 제1호 현금및현금성자산 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 현금및현금성자산</span>
                <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                  {formatErpCurrency(statements.bs.assets.cashAndEquivalents)}
                </span>
              </div>
              {entityFilter === "ALL" && (
                <div className="py-1 pl-6 pr-2 flex items-center justify-between text-xs text-[#64748b] dark:text-slate-400 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                  <span>└ 법인 / 개인 계좌잔액</span>
                  <span className="font-mono tabular-nums text-right">
                    {formatErpCurrency(statements.bs.assets.cashCorp)} /{" "}
                    {formatErpCurrency(statements.bs.assets.cashIndiv)}
                  </span>
                </div>
              )}
              <div
                onMouseEnter={(e) => openHoverPopover("AR", e.currentTarget)}
                onMouseLeave={scheduleClosePopover}
                onDoubleClick={() => {
                  closePopoverImmediately();
                  onOpenStandardModal("BS_AR");
                }}
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span className="flex items-center gap-1">
                  <span>· 매출채권 (미수금)</span>
                  {arItems.length > 0 && (
                    <span className="text-[10px] font-mono text-[#1d4ed8] dark:text-blue-400">
                      ({arItems.length}건)
                    </span>
                  )}
                </span>
                <span
                  className={`font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right ${
                    arItems.length > 0 ? "underline decoration-dotted underline-offset-2" : ""
                  }`}
                >
                  {formatErpCurrency(statements.bs.assets.accountsReceivable)}
                </span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("BS_VAT_PREPAID")}
                title="더블클릭: 중소기업회계기준 제8조·제34조(부가세대급금·선급법인세) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 부가세대급금·선급법인세</span>
                <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">{formatErpCurrency(statements.bs.assets.vatPrepaid)}</span>
              </div>

              <div
                onDoubleClick={() => onOpenStandardModal("BS_NON_CURRENT_ASSETS")}
                title="더블클릭: 중소기업회계기준 제7조·제10조~제13조(비유동자산) 설명"
                className="py-1 px-2 pt-2 flex items-center justify-between font-bold text-xs text-[#1e3a8a] dark:text-blue-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>Ⅱ. 비유동자산</span>
                <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.bs.assets.nonCurrentAssets)}</span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("BS_LEASE_DEPOSIT")}
                title="더블클릭: 중소기업회계기준 제13조·제40조(기타비유동자산 임차보증금) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 임차보증금</span>
                <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                  {formatErpCurrency(statements.bs.assets.leaseDeposit || 0)}
                </span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("BS_TANGIBLE_ASSETS")}
                title="더블클릭: 중소기업회계기준 제11조·제38조(유형자산 취득가액) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 유형자산 (취득가액)</span>
                <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">{formatErpCurrency(statements.bs.assets.tangibleAssets)}</span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("BS_ACCUM_DEPREC")}
                title="더블클릭: 중소기업회계기준 제6조제3항·제38조(감가상각누계액 차감표시) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#64748b] dark:text-slate-400 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 감가상각누계액</span>
                <span className="font-mono tabular-nums text-right">
                  {statements.bs.assets.accumDepreciation > 0
                    ? `-${formatErpCurrency(statements.bs.assets.accumDepreciation)}`
                    : "₩0"}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 px-2 border-t-2 border-[#1d4ed8] flex items-center justify-between font-extrabold text-xs text-[#1e3a8a] dark:text-blue-300 whitespace-nowrap">
              <span>자산총계</span>
              <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.bs.assets.totalAssets)}</span>
            </div>
          </div>

          {/* 우측: 부채 및 자본 (Liabilities & Equity) */}
          <div className="bg-[#f4efe4] border border-[#c4b6a0] rounded p-2.5 dark:bg-slate-950 dark:border-slate-800 flex flex-col justify-between">
            <div className="space-y-1">
              <div
                onDoubleClick={() => onOpenStandardModal("BS_LIABILITIES")}
                title="더블클릭: 중소기업회계기준 제14조~제15조(유동부채) 설명"
                className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#991b1b] dark:text-rose-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>Ⅰ. 부채 (유동부채)</span>
                <span className="font-mono tabular-nums text-right">
                  {formatErpCurrency(statements.bs.liabilities.totalLiabilities)}
                </span>
              </div>
              <div
                onMouseEnter={(e) => openHoverPopover("AP", e.currentTarget)}
                onMouseLeave={scheduleClosePopover}
                onDoubleClick={() => {
                  closePopoverImmediately();
                  onOpenStandardModal("BS_AP");
                }}
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span className="flex items-center gap-1">
                  <span>· 매입채무 (미지급금)</span>
                  {apItems.length > 0 && (
                    <span className="text-[10px] font-mono text-[#dc2626] dark:text-rose-400">
                      ({apItems.length}건)
                    </span>
                  )}
                </span>
                <span
                  className={`font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right ${
                    apItems.length > 0 ? "underline decoration-dotted underline-offset-2" : ""
                  }`}
                >
                  {formatErpCurrency(statements.bs.liabilities.accountsPayable)}
                </span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("BS_WTH_PAYABLE")}
                title="더블클릭: 중소기업회계기준 제15조(원천세 예수금) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 원천세 (예수금)</span>
                <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">
                  {formatErpCurrency(statements.bs.liabilities.withholdingTaxPayable)}
                </span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("BS_VAT_PAYABLE")}
                title="더블클릭: 중소기업회계기준 제15조(부가세예수금) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 부가세 (예수금)</span>
                <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">
                  {formatErpCurrency(statements.bs.liabilities.vatTaxPayable)}
                </span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("BS_CORP_TAX_PAYABLE")}
                title="더블클릭: 중소기업회계기준 제15조·제34조(미지급법인세) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 법인세 (미지급)</span>
                <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">
                  {formatErpCurrency(statements.bs.liabilities.corporateTaxPayable)}
                </span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("납부항목", "TAX_DUES")}
                title="더블클릭: 중소기업회계기준 제15조·제29조(세무 납부항목) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 납부항목 (세무)</span>
                <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">
                  {formatErpCurrency(statements.bs.liabilities.taxPaymentPayable)}
                </span>
              </div>

              <div
                onDoubleClick={() => onOpenStandardModal("BS_EQUITY")}
                title="더블클릭: 중소기업회계기준 제18조~제21조(자본의 분류) 설명"
                className="py-1 px-2 pt-2 flex items-center justify-between font-bold text-xs text-[#065f46] dark:text-emerald-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>Ⅱ. 자본</span>
                <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.bs.equity.totalEquity)}</span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("BS_CAPITAL_STOCK")}
                title="더블클릭: 중소기업회계기준 제19조(자본금) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 자본금</span>
                <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">{formatErpCurrency(statements.bs.equity.capitalStock)}</span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("BS_RETAINED_EARNINGS")}
                title="더블클릭: 중소기업회계기준 제21조(이익잉여금) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 전기이월이익잉여금</span>
                <span className="font-mono tabular-nums text-[#0f172a] dark:text-slate-100 text-right">
                  {formatErpCurrency(statements.bs.equity.retainedEarningsBefore)}
                </span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("SUMMARY_NET_INCOME")}
                title="더블클릭: 중소기업회계기준 제21조·제35조(당기순이익) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs font-bold text-[#047857] dark:text-emerald-400 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 당기순이익</span>
                <span className="font-mono tabular-nums text-right">
                  {formatErpCurrency(statements.bs.equity.currentTermNetIncome)}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 px-2 border-t-2 border-[#047857] flex items-center justify-between font-extrabold text-xs text-[#065f46] dark:text-emerald-300 whitespace-nowrap">
              <span>부채와자본총계</span>
              <span className="font-mono tabular-nums text-right">
                {formatErpCurrency(
                  statements.bs.liabilities.totalLiabilities + statements.bs.equity.totalEquity
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="px-3 py-1 bg-[#e2dbcd]/70 dark:bg-slate-800/60 border-t border-[#c4b6a0] dark:border-slate-800 text-[10px] text-[#475569] dark:text-slate-400 flex items-center justify-between whitespace-nowrap">
          <span>※ 이 대차대조표(재무상태표)는 중소기업회계기준(법무부고시 제2013-0029호 제4조제3항·별지 제1호)에 따라 작성되었습니다.</span>
          <span className="hidden sm:inline text-[#1d4ed8] dark:text-blue-400 font-semibold">항목 더블클릭: 회계기준 상세</span>
        </div>
      </div>

      {/* ② 손익계산서 (PL - Income Statement) */}
      <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 flex flex-col">
        <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <TrendingUp className="w-4 h-4 text-[#047857] dark:text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap">② 손익계산서 (PL - Income Statement)</span>
          </div>
          <span className="text-[11px] font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
            {yearLabel} 누적 손익
          </span>
        </div>

        <div className="p-2.5 flex-1 flex flex-col justify-between text-xs bg-[#f4efe4] dark:bg-slate-950 m-2.5 rounded border border-[#c4b6a0] dark:border-slate-800">
          <div className="space-y-1">
            <div
              onDoubleClick={() => onOpenStandardModal("REVENUE")}
              title="더블클릭: 중소기업회계기준 제24조~제26조(매출액 수익인식) 설명"
              className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#1e3a8a] dark:text-blue-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
            >
              <span>Ⅰ. 매출액 (수익)</span>
              <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.revenue)}</span>
            </div>
            <div
              onDoubleClick={() => onOpenStandardModal("COGS")}
              title="더블클릭: 중소기업회계기준 제27조~제28조(매출원가) 설명"
              className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#92400e] dark:text-amber-300 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
            >
              <span>Ⅱ. 매출원가 (매입·외주)</span>
              <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.cogs)}</span>
            </div>
            <div
              onDoubleClick={() => onOpenStandardModal("SUMMARY_GROSS_PROFIT")}
              title="더블클릭: 중소기업회계기준 제23조·제28조(매출총손익) 설명"
              className="py-1 px-2 flex items-center justify-between font-extrabold text-xs text-[#065f46] bg-[#d1fae5]/70 dark:bg-emerald-950/50 dark:text-emerald-300 rounded whitespace-nowrap cursor-pointer select-none"
            >
              <span>★ 매출총이익 (이익률 {statements.pl.grossMarginRate}%)</span>
              <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.grossProfit)}</span>
            </div>

            <div
              onDoubleClick={() => onOpenStandardModal("PAYROLL")}
              title="더블클릭: 중소기업회계기준 제17조·제29조(급여·퇴직급여·복리후생비) 설명"
              className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#5b21b6] dark:text-violet-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
            >
              <span>Ⅲ. 급여·인건비 (급여·퇴직·4대보험)</span>
              <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.payroll)}</span>
            </div>
            <div
              onDoubleClick={() => onOpenStandardModal("OPEX")}
              title="더블클릭: 중소기업회계기준 제29조(판매비와관리비) 설명"
              className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#991b1b] dark:text-rose-300 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
            >
              <span>Ⅳ. 판매비와관리비 (운영비용)</span>
              <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.opex)}</span>
            </div>
            <div
              onDoubleClick={() => onOpenStandardModal("SUMMARY_OPERATING_PROFIT")}
              title="더블클릭: 중소기업회계기준 제23조·제29조(영업손익) 설명"
              className="py-1 px-2 flex items-center justify-between font-extrabold text-xs text-[#1e3a8a] bg-[#dbeafe]/80 dark:bg-blue-950/60 dark:text-blue-200 rounded whitespace-nowrap cursor-pointer select-none"
            >
              <span>★★ 영업이익 (이익률 {statements.pl.operatingMarginRate}%)</span>
              <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.operatingProfit)}</span>
            </div>

            {/* 세무 4대 항목 (원천세, 부가세, 법인세, 납부항목 - 우측 금액 열 수직 정렬 통일) */}
            <div className="pt-1 border-t border-[#d5cbb8] dark:border-slate-800 space-y-0.5">
              <div
                onDoubleClick={() => onOpenStandardModal("TAX_DUES")}
                title="더블클릭: 중소기업회계기준 제15조·제29조·제34조(세무 항목) 설명"
                className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#334155] dark:text-slate-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>Ⅴ. 세무 항목 (원천세·부가세·법인세·납부항목)</span>
                <span className="font-mono tabular-nums text-right">
                  {formatErpCurrency(statements.pl.taxItems.totalTax)}
                </span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("원천세", "TAX_DUES")}
                title="더블클릭: 중소기업회계기준 제15조(원천세 예수금) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 원천세</span>
                <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                  {formatErpCurrency(statements.pl.taxItems.withholdingTax)}
                </span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("부가세", "TAX_DUES")}
                title="더블클릭: 중소기업회계기준 제8조·제15조(부가가치세 정산) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 부가세 {amountBasis === "SUPPLY" ? "(예수금정산)" : ""}</span>
                <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                  {formatErpCurrency(statements.pl.taxItems.vatTax)}
                </span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("법인세", "TAX_DUES")}
                title="더블클릭: 중소기업회계기준 제34조(법인세비용·중간예납 선급법인세) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 법인세 {year !== "ALL" && Number(year) >= 2026 ? "(중간예납 선급제외)" : ""}</span>
                <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                  {formatErpCurrency(statements.pl.taxItems.corporateTax)}
                </span>
              </div>
              <div
                onDoubleClick={() => onOpenStandardModal("납부항목", "TAX_DUES")}
                title="더블클릭: 중소기업회계기준 제29조(세금과공과 납부항목) 설명"
                className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-[#ebe5d8] dark:hover:bg-slate-900 select-none"
              >
                <span>· 납부항목</span>
                <span className="font-mono tabular-nums font-semibold text-[#0f172a] dark:text-slate-100 text-right">
                  {formatErpCurrency(statements.pl.taxItems.taxPayment)}
                </span>
              </div>
            </div>
          </div>

          <div
            onDoubleClick={() => onOpenStandardModal("SUMMARY_NET_INCOME")}
            title="더블클릭: 중소기업회계기준 제23조·제34조·제35조(당기순이익) 설명"
            className="mt-2 pt-2 px-2 border-t-2 border-[#047857] flex items-center justify-between font-extrabold text-xs text-[#047857] dark:text-emerald-400 whitespace-nowrap cursor-pointer select-none"
          >
            <span>★★★ 당기순이익 (순이익률 {statements.pl.netMarginRate}%)</span>
            <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.pl.netIncome)}</span>
          </div>
        </div>
        <div className="px-3 py-1 bg-[#e2dbcd]/70 dark:bg-slate-800/60 border-t border-[#c4b6a0] dark:border-slate-800 text-[10px] text-[#475569] dark:text-slate-400 flex items-center justify-between whitespace-nowrap">
          <span>※ 이 손익계산서는 중소기업회계기준(법무부고시 제2013-0029호 제4조제3항·별지 제2호)에 따라 작성되었습니다.</span>
          <span className="hidden sm:inline text-[#047857] dark:text-emerald-400 font-semibold">항목 더블클릭: 회계기준 상세</span>
        </div>
      </div>

      {/* ③ 현금흐름표 (CF - Cash Flow Statement) */}
      <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 flex flex-col">
        <div
          onDoubleClick={() => onOpenStandardModal("CF_STATEMENT")}
          title="더블클릭: 중소기업회계기준 제4조(소규모 기업 현금흐름표 면제 특례 및 당사 자발적 직접법 작성 기준) 설명"
          className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <ArrowLeftRight className="w-4 h-4 text-[#b45309] dark:text-amber-400 shrink-0" />
            <span className="whitespace-nowrap">③ 현금흐름표 (CF - Cash Flow Statement)</span>
          </div>
          <span className="text-[11px] font-mono text-[#475569] dark:text-slate-400 whitespace-nowrap">
            {yearLabel} 통장 실집행 기준 (더블클릭: 기준 설명)
          </span>
        </div>

        <div className="p-2.5 flex-1 flex flex-col justify-between text-xs bg-[#f4efe4] dark:bg-slate-950 m-2.5 rounded border border-[#c4b6a0] dark:border-slate-800">
          <div className="space-y-1">
            <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#334155] dark:text-slate-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap">
              <span>Ⅰ. 기초 현금및현금성자산</span>
              <span className="font-mono tabular-nums text-right">{formatErpCurrency(statements.cf.beginningCash)}</span>
            </div>

            <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#1e3a8a] dark:text-blue-300 border-b border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap">
              <span>Ⅱ. 영업활동 현금흐름</span>
              <span className="font-mono tabular-nums text-right">
                {formatErpCurrency(statements.cf.operating.netOperatingCashFlow)}
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                <span>· 매출수납 유입 (+)</span>
                <span className="font-mono tabular-nums font-semibold text-[#1d4ed8] dark:text-blue-400 text-right">
                  {formatErpCurrency(statements.cf.operating.saleInflow)}
                </span>
              </div>
              <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                <span>· 매입·외주 지출 (-)</span>
                <span className="font-mono tabular-nums font-semibold text-[#dc2626] dark:text-rose-400 text-right">
                  {formatErpCurrency(statements.cf.operating.purchaseOutflow)}
                </span>
              </div>
              <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                <span>· 급여·인건비 지출 (-)</span>
                <span className="font-mono tabular-nums font-semibold text-[#dc2626] dark:text-rose-400 text-right">
                  {formatErpCurrency(statements.cf.operating.payrollOutflow)}
                </span>
              </div>
              <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 border-b border-dotted border-[#d5cbb8]/80 dark:border-slate-800/80 whitespace-nowrap">
                <span>· 운영경비 지출 (-)</span>
                <span className="font-mono tabular-nums font-semibold text-[#dc2626] dark:text-rose-400 text-right">
                  {formatErpCurrency(statements.cf.operating.opexOutflow)}
                </span>
              </div>
              <div className="py-1 pl-4 pr-2 flex items-center justify-between text-xs text-[#334155] dark:text-slate-300 whitespace-nowrap">
                <span>· 세무 유출 (원천세·부가세·법인세·납부항목) (-)</span>
                <span className="font-mono tabular-nums font-semibold text-[#dc2626] dark:text-rose-400 text-right">
                  {formatErpCurrency(
                    statements.cf.operating.withholdingTaxOutflow +
                      statements.cf.operating.vatTaxOutflow +
                      statements.cf.operating.corporateTaxOutflow +
                      statements.cf.operating.taxPaymentOutflow
                  )}
                </span>
              </div>
            </div>

            <div className="py-1 px-2 pt-1.5 flex items-center justify-between font-bold text-xs text-[#92400e] dark:text-amber-300 border-t border-[#d5cbb8] dark:border-slate-800 whitespace-nowrap">
              <span>Ⅲ. 투자활동 현금흐름 (자산취득·처분)</span>
              <span className="font-mono tabular-nums text-right">
                {formatErpCurrency(statements.cf.investing.netInvestingCashFlow)}
              </span>
            </div>

            <div className="py-1 px-2 flex items-center justify-between font-bold text-xs text-[#5b21b6] dark:text-violet-300 whitespace-nowrap">
              <span>Ⅳ. 재무활동 현금흐름 (가수금·자금이동)</span>
              <span className="font-mono tabular-nums text-right">
                {formatErpCurrency(statements.cf.financing.netFinancingCashFlow)}
              </span>
            </div>
          </div>

          <div className="mt-2 pt-2 px-2 border-t-2 border-[#b45309] flex items-center justify-between font-extrabold text-xs text-[#0f172a] dark:text-white whitespace-nowrap">
            <span>Ⅴ. 기말 현금및현금성자산</span>
            <span className="font-mono tabular-nums text-[#1d4ed8] dark:text-blue-400 text-right">
              {formatErpCurrency(statements.cf.endingCash)}
            </span>
          </div>
        </div>
      </div>

      {/* ④ 연도별 주석 (Remark) 및 세무일정 항목 관리 보드 */}
      <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 flex flex-col">
        <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <MessageSquare className="w-4 h-4 text-[#6d28d9] dark:text-violet-400 shrink-0" />
            <span className="whitespace-nowrap">
              ④ 연도별 재무제표 주석 (Remark) 및 세무 항목 ({yearLabel})
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saveMessage && (
              <span className="text-[11px] font-bold text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                {saveMessage}
              </span>
            )}
            <button
              type="button"
              onClick={onTriggerTaxFileUpload}
              disabled={uploadingTaxFile}
              className="px-2.5 py-1 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingTaxFile ? "업로드 중..." : "납부내역 엑셀 업로드"}</span>
            </button>
            <button
              type="button"
              onClick={onSaveRemarkAndTax}
              disabled={savingRemark}
              className="px-2.5 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingRemark ? "저장 중..." : "주석·세무 저장"}</span>
            </button>
          </div>
        </div>

        <div className="p-2.5 flex-1 flex flex-col gap-2.5 text-xs">
          {/* 세무 4대 항목 (원천세, 부가세, 법인세, 납부항목 - 초기값 0원) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#f4efe4] dark:bg-slate-950 p-2 rounded border border-[#c4b6a0] dark:border-slate-800">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                원천세 (원)
              </label>
              <input
                type="text"
                value={formatErpInputNumber(taxWithholding)}
                onChange={(e) => onChangeTaxWithholding(cleanErpNumber(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono tabular-nums font-bold text-xs focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                부가세 (원)
              </label>
              <input
                type="text"
                value={formatErpInputNumber(taxVat)}
                onChange={(e) => onChangeTaxVat(cleanErpNumber(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono tabular-nums font-bold text-xs focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                법인세 (원)
              </label>
              <input
                type="text"
                value={formatErpInputNumber(taxCorporate)}
                onChange={(e) => onChangeTaxCorporate(cleanErpNumber(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono tabular-nums font-bold text-xs focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                납부항목 (원)
              </label>
              <input
                type="text"
                value={formatErpInputNumber(taxPayment)}
                onChange={(e) => onChangeTaxPayment(cleanErpNumber(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono tabular-nums font-bold text-xs focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>
          </div>

          {/* 연도별 주석(Remark) 자유 입력 */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              {yearLabel} 재무제표 주석 (Remark) — 특이사항 자유 입력
            </label>
            <textarea
              rows={5}
              value={remarkText}
              onChange={(e) => onChangeRemarkText(e.target.value)}
              placeholder={`${yearLabel} 결산 특이사항, 세무일정 메모, 주요 거래 변동 내역 등을 자유롭게 입력 후 [주석·세무 저장]을 클릭하세요.`}
              className="w-full flex-1 bg-[#f4efe4] dark:bg-slate-950 border border-[#b5a894] dark:border-slate-800 rounded p-2 text-xs leading-relaxed focus:outline-none focus:border-[#1d4ed8] resize-y"
            />
          </div>
        </div>
      </div>

      {/* 매출채권(미수금) / 매입채무(미지급금) 마우스오버 상세 내역 팝오버 */}
      {hoverPopover &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseEnter={cancelCloseTimer}
            onMouseLeave={scheduleClosePopover}
            style={{
              position: "fixed",
              left: `${hoverPopover.left}px`,
              width: `${hoverPopover.width}px`,
              maxHeight: `${hoverPopover.maxHeight}px`,
              ...(hoverPopover.top !== undefined ? { top: `${hoverPopover.top}px` } : {}),
              ...(hoverPopover.bottom !== undefined ? { bottom: `${hoverPopover.bottom}px` } : {}),
            }}
            className="z-[9999] flex flex-col bg-[#f4efe4] dark:bg-slate-900 border-2 border-[#b5a894] dark:border-slate-700 rounded shadow-2xl overflow-hidden text-[#0f172a] dark:text-slate-100"
          >
            {/* 상단 헤더 바 */}
            <div className="shrink-0 bg-[#e2dbcd] dark:bg-slate-800 px-3 py-1.5 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between gap-2">
              <span className="text-xs font-bold whitespace-nowrap">
                {isArPopover
                  ? `매출채권 미수금 내역 (${activePopoverItems.length}건)`
                  : `매입채무 미지급금 내역 (${activePopoverItems.length}건)`}
              </span>
              <span
                className={`text-xs font-mono font-extrabold tabular-nums whitespace-nowrap ${
                  isArPopover
                    ? "text-[#1d4ed8] dark:text-blue-400"
                    : "text-[#dc2626] dark:text-rose-400"
                }`}
              >
                {isArPopover ? "미수합계 " : "미지급합계 "}
                {formatErpCurrency(activePopoverTotal)}
              </span>
            </div>

            {/* 본문 영역 */}
            {activePopoverItems.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-[#64748b] dark:text-slate-400">
                {isArPopover ? "미수 내역 없음" : "미지급 내역 없음"}
              </div>
            ) : (
              <div className="flex-1 min-h-0 max-h-64 overflow-y-auto overflow-x-auto">
                <table className="text-[11px] w-full border-collapse">
                  <thead className="sticky top-0 bg-[#ebe5d8] dark:bg-slate-800/95 border-b border-[#b5a894] dark:border-slate-700 text-[#334155] dark:text-slate-300 font-bold">
                    <tr>
                      <th className="py-1.5 px-2 text-left whitespace-nowrap">작성일자</th>
                      <th className="py-1.5 px-2 text-left whitespace-nowrap">거래처명</th>
                      <th className="py-1.5 px-2 text-left whitespace-nowrap">품목</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">합계금액</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">
                        {isArPopover ? "기수납액" : "기지급액"}
                      </th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">
                        {isArPopover ? "미수잔액" : "미지급잔액"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d5cbb8] dark:divide-slate-800">
                    {activePopoverItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[#ebe5d8]/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-1.5 px-2 font-mono whitespace-nowrap">
                          {item.issueDate}
                        </td>
                        <td className="py-1.5 px-2 max-w-[140px] truncate font-semibold whitespace-nowrap">
                          {entityFilter === "ALL" && (
                            <span
                              className={`mr-1 px-1 py-0.5 rounded text-[9px] font-bold ${
                                item.entityType === "CORP"
                                  ? "bg-[#dbeafe] text-[#1e40af] dark:bg-blue-500/20 dark:text-blue-300"
                                  : "bg-[#fef3c7] text-[#92400e] dark:bg-amber-500/20 dark:text-amber-300"
                              }`}
                            >
                              {item.entityType === "CORP" ? "법인" : "개인"}
                            </span>
                          )}
                          <span>{item.customerName}</span>
                        </td>
                        <td className="py-1.5 px-2 max-w-[190px] truncate whitespace-nowrap">
                          {item.itemName}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                          {formatErpCurrency(item.totalAmount)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                          {item.settledAmount > 0 ? (
                            <span className="text-[#047857] dark:text-emerald-400 font-semibold">
                              {formatErpCurrency(item.settledAmount)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td
                          className={`py-1.5 px-2 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                            isArPopover
                              ? "text-[#1d4ed8] dark:text-blue-400"
                              : "text-[#dc2626] dark:text-rose-400"
                          }`}
                        >
                          {formatErpCurrency(item.unpaidAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 하단 푸터 바 */}
            <div className="shrink-0 bg-[#e2dbcd]/80 dark:bg-slate-800/80 px-3 py-1 border-t border-[#c4b6a0] dark:border-slate-700 flex items-center justify-between text-[10px] text-[#475569] dark:text-slate-400 whitespace-nowrap">
              <span>부가세 포함 청구합계 기준</span>
              <span>더블클릭: 회계기준 상세</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
