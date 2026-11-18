"use client";

import React from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  CheckSquare,
  Database,
  Download,
  ExternalLink,
  FileText,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { type EntityType } from "@/lib/businessEntities";
import { formatErpCurrency } from "@/lib/erpFormat";

export type TaxSubTab = "UNISSUED" | "SALE_LEDGER" | "PURCHASE_LEDGER" | "HOMETAX_SYNC";
export type SettlementFilter = "ALL" | "UNPAID" | "PARTIAL" | "PAID";

export interface TaxLedgerStats {
  count: number;
  totalGross: number;
  totalSupply: number;
  settled: number;
  unpaid: number;
  unpaidCount: number;
  paidCount: number;
  diff: number;
}

export interface UnpaidPartnerSummary {
  customerName: string;
  businessNo: string;
  count: number;
  unpaidAmount: number;
  oldestDate: string;
}

export interface SelectedBillingSummary {
  count: number;
  supply: number;
  vat: number;
  total: number;
}

export interface PopbillLiveStatus {
  isLiveProduction: boolean;
  partnerBalance: number;
  certRegistered: boolean;
  certMessage?: string;
  corpCertRegistered?: boolean;
  individualCertRegistered?: boolean;
}

export interface TaxKpiAndFilterBarProps {
  activeSubTab: TaxSubTab;
  setActiveSubTab: React.Dispatch<React.SetStateAction<TaxSubTab>>;
  unissuedCount: number;
  saleCount: number;
  purchaseCount: number;
  arStats: TaxLedgerStats;
  apStats: TaxLedgerStats;
  activeStats: TaxLedgerStats;
  isPurchaseTab: boolean;
  autoMatching: boolean;
  handleAutoMatch: (ioType: "SALE" | "PURCHASE" | "ALL") => Promise<void>;
  onOpenIssueModal: (ioType: "SALE" | "PURCHASE") => void;
  handleOpenPopbillPortal: (
    actionType: "PORTAL_URL" | "CERT_URL" | "CHARGE_URL",
    overrideEntity?: EntityType
  ) => Promise<void>;
  popbillLive: PopbillLiveStatus | null;
  settlementFilter: SettlementFilter;
  setSettlementFilter: React.Dispatch<React.SetStateAction<SettlementFilter>>;
  unpaidByPartner: UnpaidPartnerSummary[];
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  entityFilter: "ALL" | "CORP" | "INDIVIDUAL";
  onChangeEntityFilter: (val: "ALL" | "CORP" | "INDIVIDUAL") => void;
  domainFilter: string;
  setDomainFilter: React.Dispatch<React.SetStateAction<string>>;
  isRefreshing: boolean;
  onRefresh: () => void;
  selectedSummary: SelectedBillingSummary;
  batchIssuing: boolean;
  handleBatchIssue: (consolidate?: boolean) => Promise<void>;
  pendingNtsCount: number;
  sendingNts: boolean;
  handleBatchSendToNTS: () => Promise<void>;
  sortedInvoices: any[];
  showToast: (text: string, type?: "success" | "error") => void;
}

function exportTaxInvoicesCsv(
  sortedInvoices: any[],
  isPurchaseTab: boolean,
  showToast: (text: string, type?: "success" | "error") => void
) {
  if (sortedInvoices.length === 0) {
    showToast("내보낼 세금계산서 데이터가 없습니다.", "error");
    return;
  }
  const csvHeader =
    "구분,계산서번호,작성일자,거래처명,사업자번호,품목명,공급가액,세액,합계금액,정산완료액,미수납_미지급잔액,정산상태,국세청승인번호\n";
  const csvRows = sortedInvoices
    .map((i) =>
      [
        i.ioType === "PURCHASE" ? "매입" : "매출",
        i.invoiceNo,
        i.issueDate ? String(i.issueDate).slice(0, 10) : "",
        `"${(i.customerName || "").replace(/"/g, '""')}"`,
        i.businessNo || "",
        `"${(i.itemName || "").replace(/"/g, '""')}"`,
        Math.round(i.supplyAmount || 0),
        Math.round(i.vatAmount || 0),
        Math.round(i.totalAmount || 0),
        Math.round(i.settledAmount || 0),
        Math.round(Math.max(0, Number(i.totalAmount || 0) - Number(i.settledAmount || 0))),
        i.settlementStatus || "UNPAID",
        i.ntsConfirmNo || "",
      ].join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvHeader + csvRows], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${isPurchaseTab ? "매입세금계산서_채무대장" : "매출세금계산서_채권대장"}_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("엑셀(CSV) 내보내기가 완료되었습니다.");
}

export const TaxKpiAndFilterBar: React.FC<TaxKpiAndFilterBarProps> = ({
  activeSubTab,
  setActiveSubTab,
  unissuedCount,
  saleCount,
  purchaseCount,
  arStats,
  apStats,
  activeStats,
  isPurchaseTab,
  autoMatching,
  handleAutoMatch,
  onOpenIssueModal,
  handleOpenPopbillPortal,
  popbillLive,
  settlementFilter,
  setSettlementFilter,
  unpaidByPartner,
  searchTerm,
  setSearchTerm,
  entityFilter,
  onChangeEntityFilter,
  domainFilter,
  setDomainFilter,
  isRefreshing,
  onRefresh,
  selectedSummary,
  batchIssuing,
  handleBatchIssue,
  pendingNtsCount,
  sendingNts,
  handleBatchSendToNTS,
  sortedInvoices,
  showToast,
}) => {
  return (
    <>
      {/* 1. Top Sub-Tabs Navigation (4 Sub-Tabs) */}
      <div className="px-2.5 md:px-3 pt-2 pb-1.5 md:pb-0 border-b border-[#b5a894] bg-[#ebe5d8] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full">
          <button
            onClick={() => setActiveSubTab("UNISSUED")}
            className={`flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-t font-bold text-xs transition border-t border-l border-r whitespace-nowrap shrink-0 ${
              activeSubTab === "UNISSUED"
                ? "bg-[#f4efe4] border-[#b5a894] text-[#1c1917] border-b-transparent shadow-sm"
                : "bg-[#e2dbcd] border-transparent text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span>발행 대기</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
              {unissuedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("SALE_LEDGER")}
            className={`flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-t font-bold text-xs transition border-t border-l border-r whitespace-nowrap shrink-0 ${
              activeSubTab === "SALE_LEDGER"
                ? "bg-[#f4efe4] border-[#b5a894] text-[#1c1917] border-b-transparent shadow-sm"
                : "bg-[#e2dbcd] border-transparent text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>매출 · 채권</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
              {saleCount}
            </span>
            {arStats.unpaidCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 font-mono">
                미수 {arStats.unpaidCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("PURCHASE_LEDGER")}
            className={`flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-t font-bold text-xs transition border-t border-l border-r whitespace-nowrap shrink-0 ${
              activeSubTab === "PURCHASE_LEDGER"
                ? "bg-[#f4efe4] border-[#b5a894] text-[#1c1917] border-b-transparent shadow-sm"
                : "bg-[#e2dbcd] border-transparent text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>매입 · 채무</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
              {purchaseCount}
            </span>
            {apStats.unpaidCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 font-mono">
                미지급 {apStats.unpaidCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("HOMETAX_SYNC")}
            className={`flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-t font-bold text-xs transition border-t border-l border-r whitespace-nowrap shrink-0 ${
              activeSubTab === "HOMETAX_SYNC"
                ? "bg-[#f4efe4] border-[#b5a894] text-[#1c1917] border-b-transparent shadow-sm"
                : "bg-[#e2dbcd] border-transparent text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
            <span>홈택스 수집</span>
          </button>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-1.5 pb-1 text-[11px] overflow-x-auto max-w-full">
          <button
            onClick={() => handleAutoMatch("ALL")}
            disabled={autoMatching}
            className="flex items-center gap-1 h-7 px-2 rounded text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 border border-teal-900 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
            title="매출/매입 세금계산서와 통장 입출금 내역 자동 비교 대사"
          >
            <ArrowLeftRight className={`w-3.5 h-3.5 shrink-0 ${autoMatching ? "animate-spin" : ""}`} />
            <span>자동대사</span>
          </button>

          <button
            onClick={() => onOpenIssueModal("PURCHASE")}
            className="flex items-center gap-1 h-7 px-2 rounded text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-500 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>매입등록</span>
          </button>

          <button
            onClick={() => onOpenIssueModal("SALE")}
            className="flex items-center gap-1 h-7 px-2 rounded text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 border border-blue-900 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>매출발행</span>
          </button>

          <button
            onClick={() => handleOpenPopbillPortal("CHARGE_URL")}
            className="hidden sm:flex items-center gap-1 h-7 px-2.5 rounded text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-400 shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
            title="팝빌 파트너 포인트 충전 및 잔액 확인"
          >
            <span>포인트 충전</span>
            {popbillLive && (
              <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-emerald-700 text-white">
                {popbillLive.partnerBalance.toLocaleString()}P
              </span>
            )}
          </button>

          <button
            onClick={() => handleOpenPopbillPortal("CERT_URL")}
            className={`hidden sm:flex items-center gap-1 h-7 px-2.5 rounded text-xs font-bold border shadow-sm whitespace-nowrap shrink-0 cursor-pointer ${
              popbillLive && !popbillLive.certRegistered
                ? "text-rose-900 bg-rose-100 hover:bg-rose-200 border-rose-500"
                : "text-slate-800 bg-slate-200 hover:bg-slate-300 border-slate-400"
            }`}
            title="팝빌 공동인증서 관리 (법인 806-88-03266 / 개인 295-03-02683)"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>공동인증서 관리</span>
            {popbillLive && (
              <>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                    popbillLive.corpCertRegistered ? "bg-emerald-700 text-white" : "bg-rose-700 text-white"
                  }`}
                >
                  법인 {popbillLive.corpCertRegistered ? "등록" : "미등록"}
                </span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                    popbillLive.individualCertRegistered ? "bg-emerald-700 text-white" : "bg-rose-700 text-white"
                  }`}
                >
                  개인 {popbillLive.individualCertRegistered ? "등록" : "미등록"}
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => handleOpenPopbillPortal("PORTAL_URL", "CORP")}
            className="hidden sm:flex items-center gap-1 h-7 px-2 rounded text-xs font-bold text-indigo-800 bg-indigo-100 hover:bg-indigo-200 border border-indigo-400 shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
            title="주식회사 드래곤알피에이 (806-88-03266) 팝빌 문서함 열기"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>법인 문서함</span>
          </button>

          <button
            onClick={() => handleOpenPopbillPortal("PORTAL_URL", "INDIVIDUAL")}
            className="hidden sm:flex items-center gap-1 h-7 px-2 rounded text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-400 shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
            title="드래곤알피에이 개인사업자 (295-03-02683) 팝빌 문서함 열기"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>개인 문서함</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards: Shown in SALE_LEDGER & PURCHASE_LEDGER */}
      {(activeSubTab === "SALE_LEDGER" || activeSubTab === "PURCHASE_LEDGER") && (
        <div className="p-3 border-b border-[#b5a894] bg-[#ebe5d8] grid grid-cols-1 md:grid-cols-4 gap-2.5 shrink-0">
          {/* Card 1: 총 발행/수취 합계 */}
          <div
            onClick={() => setSettlementFilter("ALL")}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded border border-[#b5a894] cursor-pointer transition ${
              settlementFilter === "ALL" ? "ring-2 ring-blue-600 bg-[#f4efe4]" : "bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#78716c]">
                {isPurchaseTab ? "총 매입 세금계산서 합계" : "총 매출 세금계산서 합계"} ({activeStats.count}건)
              </span>
              <span className="text-base font-bold text-[#1c1917] font-mono">
                {formatErpCurrency(activeStats.totalGross)}
              </span>
              <span className="text-[10px] text-[#78716c] font-mono">
                공급가액 {formatErpCurrency(activeStats.totalSupply)}
              </span>
            </div>
            <FileText className="w-7 h-7 text-blue-700 opacity-80 shrink-0" />
          </div>

          {/* Card 2: 수납완료 / 지급완료 */}
          <div
            onClick={() => setSettlementFilter("PAID")}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded border border-[#b5a894] cursor-pointer transition ${
              settlementFilter === "PAID" ? "ring-2 ring-emerald-600 bg-[#f4efe4]" : "bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-emerald-800">
                {isPurchaseTab ? "지급 완료 금액 (통장 출금 확인)" : "수납 완료 금액 (통장 입금 확인)"} ({activeStats.paidCount}건)
              </span>
              <span className="text-base font-bold text-emerald-800 font-mono">
                {formatErpCurrency(activeStats.settled)}
              </span>
              <span className="text-[10px] text-[#78716c] font-mono">
                정산율 {activeStats.totalGross > 0 ? Math.round((activeStats.settled / activeStats.totalGross) * 100) : 0}%
              </span>
            </div>
            <CheckCircle2 className="w-7 h-7 text-emerald-700 opacity-80 shrink-0" />
          </div>

          {/* Card 3: 미수납 매출채권 / 미지급 매입채무 */}
          <div
            onClick={() => setSettlementFilter((prev) => (prev === "UNPAID" ? "ALL" : "UNPAID"))}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded border border-[#b5a894] cursor-pointer transition ${
              settlementFilter === "UNPAID" ? "ring-2 ring-rose-600 bg-[#f4efe4]" : "bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-rose-800">
                {isPurchaseTab ? "미지급 매입채무 잔액" : "미수납 매출채권 잔액"} ({activeStats.unpaidCount}건)
              </span>
              <span className="text-base font-bold text-rose-700 font-mono">
                {formatErpCurrency(activeStats.unpaid)}
              </span>
              <span className="text-[10px] text-[#78716c]">
                {settlementFilter === "UNPAID"
                  ? "미정산 필터 적용중 (재클릭시 해제)"
                  : "클릭 시 미정산 대상 및 거래처별 잔액 표시"}
              </span>
            </div>
            <AlertCircle className="w-7 h-7 text-rose-700 opacity-80 shrink-0" />
          </div>

          {/* Card 4: 대차대조 보존 검증 */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded border border-[#b5a894] bg-[#f4efe4]">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#78716c]">
                {isPurchaseTab ? "매입채무 대차 보존 검증" : "매출채권 대차 보존 검증"}
              </span>
              <span className="text-sm font-bold text-emerald-800 font-mono">
                대차 차액 {formatErpCurrency(activeStats.diff)}
              </span>
              <span className="text-[10px] text-[#78716c] font-mono">
                총액 = {isPurchaseTab ? "지급완료 + 미지급채무" : "수납완료 + 미수납채권"}
              </span>
            </div>
            <ShieldCheck className="w-7 h-7 text-emerald-700 opacity-80 shrink-0" />
          </div>

          {/* 거래처별 미수납 매출채권 / 미지급 매입채무 원클릭 요약 바 */}
          {unpaidByPartner.length > 0 && (
            <div className="md:col-span-4 px-3 py-2 rounded border border-[#b5a894] bg-[#f4efe4] flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-[11px] text-rose-800 whitespace-nowrap">
                {isPurchaseTab ? "거래처별 미지급 채무 요약:" : "거래처별 미수납 채권 요약:"}
              </span>
              {unpaidByPartner.map((p) => {
                const isSelected = searchTerm === p.customerName && settlementFilter === "UNPAID";
                return (
                  <button
                    key={p.customerName}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSearchTerm("");
                      } else {
                        setSettlementFilter("UNPAID");
                        setSearchTerm(p.customerName);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] whitespace-nowrap transition cursor-pointer ${
                      isSelected
                        ? "bg-rose-700 text-white border-rose-900 font-bold"
                        : "bg-[#ebe5d8] hover:bg-[#dfd7c7] text-[#1c1917] border-[#b5a894]"
                    }`}
                  >
                    <span className="font-bold">{p.customerName}</span>
                    <span className="font-mono opacity-80">({p.count}건)</span>
                    <span className={`font-mono font-extrabold ${isSelected ? "text-white" : "text-rose-700"}`}>
                      {formatErpCurrency(p.unpaidAmount)}
                    </span>
                  </button>
                );
              })}
              {(settlementFilter === "UNPAID" || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setSettlementFilter("ALL");
                    setSearchTerm("");
                  }}
                  className="ml-auto px-2 py-0.5 rounded bg-[#dfd7c7] hover:bg-[#d0c6b4] border border-[#b5a894] text-[11px] font-bold text-[#44403c] whitespace-nowrap"
                >
                  필터 초기화
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Filter & Pipeline Toolbar (Gutenberg Z-Pattern Top Left Scope + Top Right Pipeline) */}
      {activeSubTab !== "HOMETAX_SYNC" && (
        <div className="p-3 border-b border-[#b5a894] bg-[#f4efe4] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 사업자 구분 */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-[#78716c]">사업자 구분</span>
              <select
                value={entityFilter}
                onChange={(e) => onChangeEntityFilter(e.target.value as "ALL" | "CORP" | "INDIVIDUAL")}
                className="h-8 px-2.5 rounded text-xs font-bold border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
              >
                <option value="ALL">전체 사업자 (통합)</option>
                <option value="CORP">(주)드래곤알피에이 [법인]</option>
                <option value="INDIVIDUAL">드래곤알피에이 [개인]</option>
              </select>
            </div>

            {/* 매출 분과 (매출 탭 및 발행대기 탭에서만 노출) */}
            {activeSubTab !== "PURCHASE_LEDGER" && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#78716c]">매출 분과</span>
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="h-8 px-2 rounded text-xs border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                >
                  <option value="ALL">전체 매출 분과</option>
                  <option value="RENTAL">임대 (장비 렌탈)</option>
                  <option value="OP_SERVICE">운영용역 (정기유지보수)</option>
                  <option value="DEV_SERVICE">개발용역 (SI 프로젝트)</option>
                  <option value="TRADE_SALE">판매 (유통 커머스)</option>
                </select>
              </div>
            )}

            {/* 채권/채무 정산 상태 필터 */}
            {(activeSubTab === "SALE_LEDGER" || activeSubTab === "PURCHASE_LEDGER") && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#78716c]">
                  {isPurchaseTab ? "지급 상태" : "수납 상태"}
                </span>
                <select
                  value={settlementFilter}
                  onChange={(e) => setSettlementFilter(e.target.value as SettlementFilter)}
                  className="h-8 px-2 rounded text-xs font-bold border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                >
                  <option value="ALL">전체 상태</option>
                  <option value="UNPAID">
                    {isPurchaseTab ? "미지급 채무 보유 (미지급+부분)" : "미수납 채권 보유 (미수납+부분)"}
                  </option>
                  <option value="PARTIAL">{isPurchaseTab ? "부분 지급" : "부분 수납"}</option>
                  <option value="PAID">{isPurchaseTab ? "지급 완료" : "수납 완료"}</option>
                </select>
              </div>
            )}

            {/* 검색 */}
            <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[160px]">
              <span className="text-[10px] font-bold text-[#78716c]">검색</span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#78716c]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="거래처명, 품목, 계산서번호"
                  className="h-8 pl-8 pr-3 rounded text-xs border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] w-full sm:w-56"
                />
              </div>
            </div>

            <button
              onClick={onRefresh}
              className="flex items-center gap-1 h-8 px-2.5 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] mt-4"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>조회</span>
            </button>
          </div>

          {/* Right Pipeline Actions per Sub-Tab */}
          {activeSubTab === "UNISSUED" && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#b5a894] bg-[#ebe5d8] text-xs font-medium">
                <span className="text-[#78716c]">선택:</span>
                <span className="font-bold text-blue-800 font-mono">{selectedSummary.count}건</span>
                <span className="text-[#b5a894]">|</span>
                <span className="text-[#78716c]">합계:</span>
                <span className="font-bold text-emerald-800 font-mono">{formatErpCurrency(selectedSummary.total)}</span>
              </div>

              <button
                onClick={() => handleBatchIssue(true)}
                disabled={selectedSummary.count < 2 || batchIssuing}
                className={`flex items-center gap-1.5 h-8 px-3 rounded text-xs font-bold shadow-sm transition ${
                  selectedSummary.count >= 2 && !batchIssuing
                    ? "bg-indigo-700 hover:bg-indigo-800 text-white border border-indigo-900 cursor-pointer"
                    : "bg-[#d8d0c2] text-[#a8a29e] border border-[#b5a894] cursor-not-allowed"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>선택 청구 묶음 발행 ({selectedSummary.count}건)</span>
              </button>

              <button
                onClick={() => handleBatchIssue(false)}
                disabled={selectedSummary.count === 0 || batchIssuing}
                className={`flex items-center gap-1.5 h-8 px-3.5 rounded text-xs font-bold shadow-sm transition ${
                  selectedSummary.count > 0 && !batchIssuing
                    ? "bg-blue-700 hover:bg-blue-800 text-white border border-blue-900 cursor-pointer"
                    : "bg-[#d8d0c2] text-[#a8a29e] border border-[#b5a894] cursor-not-allowed"
                }`}
              >
                <Send className={`w-3.5 h-3.5 ${batchIssuing ? "animate-pulse" : ""}`} />
                <span>선택 청구 일괄 발행 ({selectedSummary.count}건)</span>
              </button>
            </div>
          )}

          {(activeSubTab === "SALE_LEDGER" || activeSubTab === "PURCHASE_LEDGER") && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleAutoMatch(isPurchaseTab ? "PURCHASE" : "SALE")}
                disabled={autoMatching}
                className="flex items-center gap-1.5 h-8 px-3 rounded text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white border border-teal-900 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isPurchaseTab ? "출금 내역 자동 비교 대사" : "입금 내역 자동 비교 대사"}</span>
              </button>

              {activeSubTab === "SALE_LEDGER" && pendingNtsCount > 0 && (
                <button
                  onClick={handleBatchSendToNTS}
                  disabled={sendingNts}
                  className="flex items-center gap-1.5 h-8 px-3 rounded text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-900 shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>전송전 일괄 즉시전송 ({pendingNtsCount}건)</span>
                </button>
              )}

              <button
                onClick={() => exportTaxInvoicesCsv(sortedInvoices, isPurchaseTab, showToast)}
                className="flex items-center gap-1 h-8 px-2.5 rounded text-xs font-semibold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>엑셀 내보내기</span>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
