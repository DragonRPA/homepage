"use client";

import React from "react";
import { CheckCircle2, CheckSquare, Database, RefreshCw, Square, Upload } from "lucide-react";
import { formatErpCurrency, type SortDirection } from "@/lib/erpFormat";
import { SortableTh } from "../SortableTh";

export interface HometaxSyncLogItem {
  time: string;
  message: string;
  type: "info" | "warn" | "success";
}

export interface TaxUnissuedSubTabProps {
  sortedUnissued: any[];
  filteredUnissuedCount: number;
  selectedBillingIds: Set<string>;
  getBillingUid: (b: any) => string;
  toggleSelectAll: () => void;
  toggleSelectBilling: (uid: string) => void;
  unissuedSortKey: string;
  unissuedSortDir: SortDirection;
  handleUnissuedSort: (colKey: string) => void;
  handleSingleIssueFromBilling: (billing: any) => Promise<void>;
}

export const TaxUnissuedSubTab: React.FC<TaxUnissuedSubTabProps> = ({
  sortedUnissued,
  filteredUnissuedCount,
  selectedBillingIds,
  getBillingUid,
  toggleSelectAll,
  toggleSelectBilling,
  unissuedSortKey,
  unissuedSortDir,
  handleUnissuedSort,
  handleSingleIssueFromBilling,
}) => {
  return (
    <div className="border border-[#b5a894] rounded bg-[#ebe5d8] overflow-hidden flex flex-col md:h-full shadow-sm">
      <div className="p-2 border-b border-[#b5a894] bg-[#dfd7c7] flex items-center justify-between text-xs font-bold text-[#57534e]">
        <span>계약 청구 발행 대기 목록</span>
        <span className="text-[11px] text-[#78716c]">총 {sortedUnissued.length}건 대기</span>
      </div>

      <div className="flex-1 overflow-x-auto md:overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-[#ded6c5] border-b border-[#b5a894] text-[#44403c] font-bold z-10">
            <tr>
              <th className="p-2 w-10 text-center border-r border-[#b5a894]">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center p-0.5 rounded hover:bg-[#cecaa8]"
                >
                  {selectedBillingIds.size > 0 && selectedBillingIds.size === filteredUnissuedCount ? (
                    <CheckSquare className="w-4 h-4 text-blue-700" />
                  ) : (
                    <Square className="w-4 h-4 text-[#78716c]" />
                  )}
                </button>
              </th>
              <th className="p-2 text-center w-24 border-r border-[#b5a894] whitespace-nowrap">단건발행</th>
              <SortableTh label="매출분과" colKey="domainType" sortKey={unissuedSortKey} sortDir={unissuedSortDir} onSort={handleUnissuedSort} className="p-2 w-20 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label="청구번호" colKey="billingNo" sortKey={unissuedSortKey} sortDir={unissuedSortDir} onSort={handleUnissuedSort} className="p-2 w-28 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label="청구일자" colKey="billingDate" sortKey={unissuedSortKey} sortDir={unissuedSortDir} onSort={handleUnissuedSort} className="p-2 w-24 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label="공급받는자 (거래처)" colKey="customerName" sortKey={unissuedSortKey} sortDir={unissuedSortDir} onSort={handleUnissuedSort} className="p-2 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label="품목명 / 프로젝트" colKey="itemName" sortKey={unissuedSortKey} sortDir={unissuedSortDir} onSort={handleUnissuedSort} className="p-2 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label="공급가액" colKey="supplyAmount" sortKey={unissuedSortKey} sortDir={unissuedSortDir} onSort={handleUnissuedSort} align="right" className="p-2 w-28 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label="세액 (VAT)" colKey="vatAmount" sortKey={unissuedSortKey} sortDir={unissuedSortDir} onSort={handleUnissuedSort} align="right" className="p-2 w-24 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <SortableTh label="합계금액" colKey="totalAmount" sortKey={unissuedSortKey} sortDir={unissuedSortDir} onSort={handleUnissuedSort} align="right" className="p-2 w-28 border-r border-[#b5a894]" iconClassName="w-3 h-3" />
              <th className="p-2 text-center w-28 whitespace-nowrap">발행사업자</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#b5a894]">
            {sortedUnissued.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-[#78716c]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-[#a8a29e]" />
                    <span className="font-semibold text-sm">발행 대기 중인 계약 청구 내역이 없습니다.</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedUnissued.map((b) => {
                const uid = getBillingUid(b);
                const isSelected = selectedBillingIds.has(uid);
                const isRental = b.domainType === "RENTAL";
                return (
                  <tr key={uid} className={`hover:bg-[#dfd7c7] transition ${isSelected ? "bg-blue-50/50" : ""}`}>
                    <td className="p-2 text-center border-r border-[#b5a894]">
                      <button onClick={() => toggleSelectBilling(uid)} className="p-0.5 rounded hover:bg-[#cecaa8]">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-700" />
                        ) : (
                          <Square className="w-4 h-4 text-[#78716c]" />
                        )}
                      </button>
                    </td>
                    <td className="p-2 text-center border-r border-[#b5a894] whitespace-nowrap">
                      <button
                        onClick={() => handleSingleIssueFromBilling(b)}
                        className="px-2 py-1 rounded text-[11px] font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-sm"
                      >
                        즉시 발행
                      </button>
                    </td>
                    <td className="p-2 border-r border-[#b5a894] whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isRental
                            ? "bg-blue-100 text-blue-800"
                            : b.domainType === "DEV_SERVICE"
                            ? "bg-purple-100 text-purple-800"
                            : b.domainType === "TRADE_SALE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-teal-100 text-teal-800"
                        }`}
                      >
                        {isRental
                          ? "장비임대"
                          : b.domainType === "DEV_SERVICE"
                          ? "개발용역"
                          : b.domainType === "TRADE_SALE"
                          ? "유통판매"
                          : "운영용역"}
                      </span>
                    </td>
                    <td className="p-2 border-r border-[#b5a894] font-mono text-[11px] whitespace-nowrap text-[#44403c]">
                      {b.billingNo}
                    </td>
                    <td className="p-2 border-r border-[#b5a894] font-mono text-[11px] whitespace-nowrap text-[#44403c]">
                      {b.billingDate ? String(b.billingDate).slice(0, 10) : b.yearMonth}
                    </td>
                    <td className="p-2 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1c1917]">{b.customerName}</span>
                        <span className="text-[10px] text-[#78716c] font-mono">
                          {b.businessNo || "100-00-00000"} | {b.ceoName || "대표자"}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 border-r border-[#b5a894] whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#1c1917]">{b.itemName}</span>
                        <span className="text-[10px] text-[#78716c]">
                          {b.contractNo} {b.siteName ? `| 현장: ${b.siteName}` : ""}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-right border-r border-[#b5a894] font-mono font-bold whitespace-nowrap text-[#1c1917]">
                      {formatErpCurrency(b.supplyAmount)}
                    </td>
                    <td className="p-2 text-right border-r border-[#b5a894] font-mono text-[#78716c] whitespace-nowrap">
                      {formatErpCurrency(b.vatAmount)}
                    </td>
                    <td className="p-2 text-right border-r border-[#b5a894] font-mono font-bold text-blue-900 whitespace-nowrap">
                      {formatErpCurrency(b.totalAmount)}
                    </td>
                    <td className="p-2 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.entityType === "INDIVIDUAL" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {b.entityType === "INDIVIDUAL" ? "개인사업자" : "(주)법인"}
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

export interface TaxHometaxSyncSubTabProps {
  rpaDeptUserId: string;
  setRpaDeptUserId: React.Dispatch<React.SetStateAction<string>>;
  rpaDeptUserPw: string;
  setRpaDeptUserPw: React.Dispatch<React.SetStateAction<string>>;
  rpaSaving: boolean;
  handleSaveRpaSettings: () => Promise<void>;
  htSyncTarget: "ALL" | "SELL" | "BUY";
  setHtSyncTarget: React.Dispatch<React.SetStateAction<"ALL" | "SELL" | "BUY">>;
  htStartDate: string;
  setHtStartDate: React.Dispatch<React.SetStateAction<string>>;
  htEndDate: string;
  setHtEndDate: React.Dispatch<React.SetStateAction<string>>;
  htSyncing: boolean;
  handleHometaxSync: () => Promise<void>;
  excelUploadIoType: "PURCHASE" | "SALE";
  setExcelUploadIoType: React.Dispatch<React.SetStateAction<"PURCHASE" | "SALE">>;
  excelUploading: boolean;
  excelInputRef: React.RefObject<HTMLInputElement | null>;
  handleHometaxExcelUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  saleCount: number;
  purchaseCount: number;
  arUnpaidCount: number;
  arUnpaidAmount: number;
  apUnpaidCount: number;
  apUnpaidAmount: number;
  htSyncLogs: HometaxSyncLogItem[];
}

export const TaxHometaxSyncSubTab: React.FC<TaxHometaxSyncSubTabProps> = ({
  rpaDeptUserId,
  setRpaDeptUserId,
  rpaDeptUserPw,
  setRpaDeptUserPw,
  rpaSaving,
  handleSaveRpaSettings,
  htSyncTarget,
  setHtSyncTarget,
  htStartDate,
  setHtStartDate,
  htEndDate,
  setHtEndDate,
  htSyncing,
  handleHometaxSync,
  excelUploadIoType,
  setExcelUploadIoType,
  excelUploading,
  excelInputRef,
  handleHometaxExcelUpload,
  saleCount,
  purchaseCount,
  arUnpaidCount,
  arUnpaidAmount,
  apUnpaidCount,
  apUnpaidAmount,
  htSyncLogs,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* Left Card: DragonRPA 자체 무료 수집기 & 홈택스 엑셀 업로드 */}
      <div className="border border-[#b5a894] rounded bg-[#ebe5d8] p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#b5a894] pb-2.5">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-700" />
            <h3 className="font-bold text-sm text-[#1c1917]">자체 홈택스 RPA 수집 설정 (팝빌 과금 없음 · ₩0)</h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
            수집 수수료 ₩0
          </span>
        </div>

        {/* 홈택스 전자세금계산서 조회 전용 부서사용자 ID/PW 설정 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#78716c]">홈택스 부서사용자 ID</label>
            <input
              type="text"
              value={rpaDeptUserId}
              onChange={(e) => setRpaDeptUserId(e.target.value)}
              placeholder="홈택스 부서사용자 ID"
              className="h-8 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-mono text-[#1c1917]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#78716c]">홈택스 부서사용자 비밀번호</label>
            <input
              type="password"
              value={rpaDeptUserPw}
              onChange={(e) => setRpaDeptUserPw(e.target.value)}
              placeholder="비밀번호 입력"
              className="h-8 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-mono text-[#1c1917]"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleSaveRpaSettings}
              disabled={rpaSaving}
              className="w-full h-8 px-3 rounded bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
            >
              {rpaSaving ? "저장 중..." : "RPA 계정 저장"}
            </button>
          </div>
        </div>

        {/* 자체 RPA 수집 실행 (로컬 다운로드 폴더 자동 스캔 & RPA 봇 실행) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-[#d0c6b4]">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#78716c]">수집 대상 구분</label>
            <select
              value={htSyncTarget}
              onChange={(e) => setHtSyncTarget(e.target.value as "ALL" | "SELL" | "BUY")}
              className="h-8 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-bold text-[#1c1917]"
            >
              <option value="ALL">매출 + 매입 전체 수집</option>
              <option value="SELL">매출 세금계산서만 수집</option>
              <option value="BUY">매입 세금계산서만 수집</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#78716c]">조회 시작일자</label>
            <input
              type="date"
              value={htStartDate}
              onChange={(e) => setHtStartDate(e.target.value)}
              className="h-8 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-mono text-[#1c1917]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#78716c]">조회 종료일자</label>
            <input
              type="date"
              value={htEndDate}
              onChange={(e) => setHtEndDate(e.target.value)}
              className="h-8 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-mono text-[#1c1917]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] font-mono text-[#57534e]">
            CLI 명령어: <code className="px-1.5 py-0.5 rounded bg-[#dfd7c7]">node scripts/hometax-rpa-collect.cjs</code>
          </span>
          <button
            type="button"
            onClick={handleHometaxSync}
            disabled={htSyncing}
            className="h-8 px-4 rounded bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${htSyncing ? "animate-spin" : ""}`} />
            <span>{htSyncing ? "자체 RPA 수집 중..." : "자체 RPA 수집기 실행 (폴더 자동 스캔)"}</span>
          </button>
        </div>

        {/* Right below: Hometax Excel Direct Upload Box */}
        <div className="border-t border-[#b5a894] pt-4 mt-1 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-700" />
              <h4 className="font-bold text-sm text-[#1c1917]">홈택스 전자세금계산서 엑셀(.xls / .xlsx / .csv) 일괄 업로드</h4>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs items-end">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[#78716c]">업로드 기본 구분 (사업자번호로도 자동 판별)</label>
              <select
                value={excelUploadIoType}
                onChange={(e) => setExcelUploadIoType(e.target.value as "PURCHASE" | "SALE")}
                className="h-8 px-2 rounded border border-[#b5a894] bg-[#f4efe4] font-bold text-[#1c1917]"
              >
                <option value="PURCHASE">매입 세금계산서 엑셀</option>
                <option value="SALE">매출 세금계산서 엑셀</option>
              </select>
            </div>

            <div>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={handleHometaxExcelUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={excelUploading}
                onClick={() => excelInputRef.current?.click()}
                className="w-full h-8 px-3 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{excelUploading ? "엑셀 분석 및 저장 중..." : "홈택스 엑셀 파일 선택 업로드"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Card: Sync Logs & Quick Reconciliation Summary */}
      <div className="border border-[#b5a894] rounded bg-[#ebe5d8] p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#b5a894] pb-2.5">
          <span className="font-bold text-sm text-[#1c1917]">수집 실행 이력 및 채권·채무 요약</span>
          <span className="text-xs font-mono text-[#78716c]">
            매출 {saleCount}건 / 매입 {purchaseCount}건
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded border border-[#b5a894] bg-[#f4efe4] flex flex-col gap-1">
            <span className="text-[#78716c] font-bold">미수납 매출채권 합계 ({arUnpaidCount}건)</span>
            <span className="text-base font-bold font-mono text-rose-700">{formatErpCurrency(arUnpaidAmount)}</span>
          </div>
          <div className="p-3 rounded border border-[#b5a894] bg-[#f4efe4] flex flex-col gap-1">
            <span className="text-[#78716c] font-bold">미지급 매입채무 합계 ({apUnpaidCount}건)</span>
            <span className="text-base font-bold font-mono text-rose-700">{formatErpCurrency(apUnpaidAmount)}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded border border-[#b5a894] bg-[#f4efe4] p-3 font-mono text-xs space-y-2 min-h-[220px]">
          {htSyncLogs.length === 0 ? (
            <div className="text-[#78716c] text-center py-12">
              좌측에서 [홈택스 세금계산서 자동 수집 실행] 또는 [홈택스 엑셀 파일 선택 업로드]를 실행하면 수집 결과가 여기에 기록됩니다.
            </div>
          ) : (
            htSyncLogs.map((log, i) => (
              <div
                key={i}
                className={`p-2 rounded border ${
                  log.type === "success"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : log.type === "warn"
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-slate-100 border-slate-300 text-slate-800"
                }`}
              >
                <span className="font-bold mr-2">[{log.time}]</span>
                <span>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
