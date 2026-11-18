"use client";

import React from "react";
import { formatErpCurrency, formatErpNumber, formatErpQty } from "@/lib/erpFormat";
import { formatAttachedOptionsSummary, getItemClassLabel } from "@/lib/forkliftDomain";
import { Edit, FileText, Plus, Trash2 } from "lucide-react";

export interface PurchasesSubTabProps {
  renderSortTh: (label: string, key: string, align?: "left" | "right" | "center") => React.JSX.Element;
  sortedPurchases: any[];
  subTab: "inventory" | "products" | "purchases" | "sales" | "billings" | "settlement";
}

export const PurchasesSubTab: React.FC<PurchasesSubTabProps> = ({
  renderSortTh,
  sortedPurchases,
  subTab,
}) => {
  return (
    <>
        {subTab === "purchases" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                {renderSortTh("구매번호", "purchaseNo")}
                {renderSortTh("입고일자", "purchaseDate", "center")}
                {renderSortTh("경과일수", "elapsedDays", "right")}
                {renderSortTh("제품유형", "itemClass")}
                {renderSortTh("제조사", "manufacturer")}
                {renderSortTh("매입처(공급자)", "vendorName")}
                {renderSortTh("모델 / 상품명", "productName")}
                {renderSortTh("수량", "qty", "right")}
                {renderSortTh("매입단가", "unitCost", "right")}
                {renderSortTh("총 매입금액", "totalAmount", "right")}
                <th className="py-2.5 px-3 text-center">입고상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    구매 입고 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedPurchases.map((pu) => (
                  <tr key={pu.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400">{pu.purchaseNo}</td>
                    <td className="py-2 px-3 text-center font-mono text-[#334155] dark:text-slate-300">{pu.purchaseDate}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#0f172a] dark:text-slate-200">
                      {pu.elapsedDays !== null && pu.elapsedDays !== undefined ? `${formatErpNumber(pu.elapsedDays)}일` : "-"}
                    </td>
                    <td className="py-2 px-3">{getItemClassLabel(pu.itemClass)}</td>
                    <td className="py-2 px-3">{pu.manufacturer || "-"}</td>
                    <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100">{pu.vendorName}</td>
                    <td className="py-2 px-3 text-[#0f172a] dark:text-slate-200">{pu.productName}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#0f172a] dark:text-slate-200">{formatErpQty(pu.qty, pu.unit)}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#334155] dark:text-slate-300">{formatErpCurrency(pu.unitCost)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400">{formatErpCurrency(pu.totalAmount)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 text-[10px] font-bold">
                        입고완료
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
    </>
  );
};

export interface SalesSubTabProps {
  canBill: boolean;
  handleDeleteSale: (s: any) => Promise<void>;
  handleOpenBillingFromSale: (s: any) => void;
  handleOpenEditSale: (s: any) => void;
  handleOpenSaleFile: (s: any) => Promise<void>;
  renderSortTh: (label: string, key: string, align?: "left" | "right" | "center") => React.JSX.Element;
  selectedSaleIds: number[];
  setSelectedSaleIds: React.Dispatch<React.SetStateAction<number[]>>;
  sortedSales: any[];
  subTab: "inventory" | "products" | "purchases" | "sales" | "billings" | "settlement";
}

export const SalesSubTab: React.FC<SalesSubTabProps> = ({
  canBill,
  handleDeleteSale,
  handleOpenBillingFromSale,
  handleOpenEditSale,
  handleOpenSaleFile,
  renderSortTh,
  selectedSaleIds,
  setSelectedSaleIds,
  sortedSales,
  subTab,
}) => {
  return (
    <>
        {subTab === "sales" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                <th className="py-2.5 px-2 text-center w-8">
                  <input
                    type="checkbox"
                    checked={sortedSales.length > 0 && selectedSaleIds.length === sortedSales.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedSaleIds(sortedSales.map((s) => s.id));
                      else setSelectedSaleIds([]);
                    }}
                    className="rounded border-slate-700"
                    title="전체 선택 (묶음 청구 생성용)"
                  />
                </th>
                <th className="py-2.5 px-3 text-center">관리</th>
                {renderSortTh("귀속 사업자", "entityType")}
                {renderSortTh("판매번호", "saleNo")}
                {renderSortTh("판매일자", "saleDate")}
                {renderSortTh("고객사(수요처)", "customerName")}
                {renderSortTh("판매상품 (출고품목)", "productName")}
                {renderSortTh("수량", "qty", "right")}
                {renderSortTh("판매단가", "unitPrice", "right")}
                {renderSortTh("공급가액", "totalAmount", "right")}
                {renderSortTh("매출원가", "cogsAmount", "right")}
                {renderSortTh("마진(이익률)", "marginAmount", "right")}
                <th className="py-2.5 px-3 text-center">계약서</th>
                <th className="py-2.5 px-3 text-center">청구 / 계산서</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-500">
                    판매 계약 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedSales.map((s) => {
                  const itemCount = Array.isArray(s.taxItems) ? s.taxItems.length : 1;
                  const firstItemName =
                    (Array.isArray(s.taxItems) && s.taxItems[0]?.itemName) || s.productName || "판매상품";
                  return (
                    <tr key={s.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedSaleIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSaleIds((prev) => [...prev, s.id]);
                            else setSelectedSaleIds((prev) => prev.filter((id) => id !== s.id));
                          }}
                          className="rounded border-slate-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          {canBill && (
                            <button
                              onClick={() => handleOpenBillingFromSale(s)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-bold text-[11px] shadow-xs transition"
                              title="이 판매 계약의 항목을 끌어와 청구서 생성"
                            >
                              <Plus className="w-3 h-3" />
                              <span>청구생성</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditSale(s)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 border border-blue-700 text-white font-bold text-[11px] shadow-xs transition"
                            title="판매 계약 및 세금계산서 제원 수정"
                          >
                            <Edit className="w-3 h-3" />
                            <span>수정</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSale(s)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 border border-rose-700 text-white font-bold text-[11px] shadow-xs transition"
                            title="판매 계약 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>삭제</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {s.entityType === "INDIVIDUAL" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            개인
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            법인
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-blue-400">{s.saleNo}</td>
                      <td className="py-2 px-3 font-mono text-slate-300">{s.saleDate ? String(s.saleDate).slice(0, 10) : "-"}</td>
                      <td className="py-2 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#0f172a] dark:text-slate-100">{s.customerName}</span>
                          {s.siteName && (
                            <span className="text-[10px] text-[#57534e] dark:text-slate-300">현장: {s.siteName}</span>
                          )}
                          {s.customerBizNo && (
                            <span className="text-[10px] font-mono text-[#78716c] dark:text-slate-400">
                              {s.customerBizNo} {s.customerEmail ? `| ${s.customerEmail}` : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[#0f172a] dark:text-slate-200">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {s.saleCategory === "FORKLIFT_SALE" && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300">
                                지게차판매
                              </span>
                            )}
                            {s.saleCategory === "PART_SALE" && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                                부품·소모품
                              </span>
                            )}
                            <span>{firstItemName}</span>
                            {itemCount > 1 && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                외 {itemCount - 1}종 (총 {itemCount}종)
                              </span>
                            )}
                          </div>
                          {(Array.isArray(s.chassisNumbers) && s.chassisNumbers.length > 0) ||
                          (Array.isArray(s.installedOptions) && s.installedOptions.length > 0) ? (
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                              {Array.isArray(s.chassisNumbers) && s.chassisNumbers.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-[#ebe5d8] border border-[#b5a894] font-mono text-[#334155] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                                  차대: {s.chassisNumbers.join(", ")}
                                </span>
                              )}
                              {Array.isArray(s.installedOptions) && s.installedOptions.length > 0 && (
                                <span
                                  className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-semibold"
                                  title={formatAttachedOptionsSummary(s.installedOptions)}
                                >
                                  설치옵션 {s.installedOptions.length}종
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-200">{formatErpQty(s.qty, s.unit)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-300">{formatErpCurrency(s.unitPrice)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(s.totalAmount)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">{formatErpCurrency(s.cogsAmount)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                        {formatErpCurrency(s.marginAmount)} ({s.marginRate}%)
                      </td>
                      <td className="py-2 px-3 text-center">
                        {s.hasContractFile ? (
                          <button
                            onClick={() => handleOpenSaleFile(s)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500/40 text-indigo-300 rounded text-[11px] font-semibold transition"
                          >
                            <FileText className="w-3 h-3" />
                            <span>열람</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">미첨부</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {s.taxInvoiceId ? (
                          <span className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[11px] font-semibold font-mono">
                            발행완료 ({s.taxInvoiceNo || `#${s.taxInvoiceId}`})
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">미청구</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
    </>
  );
};

export interface BillingsSubTabProps {
  handleDeleteBilling: (b: any) => Promise<void>;
  handleIssueTaxFromTradeBilling: (b: any) => Promise<void>;
  renderSortTh: (label: string, key: string, align?: "left" | "right" | "center") => React.JSX.Element;
  selectedBillingIds: number[];
  setSelectedBillingIds: React.Dispatch<React.SetStateAction<number[]>>;
  sortedBillings: any[];
  subTab: "inventory" | "products" | "purchases" | "sales" | "billings" | "settlement";
}

export const BillingsSubTab: React.FC<BillingsSubTabProps> = ({
  handleDeleteBilling,
  handleIssueTaxFromTradeBilling,
  renderSortTh,
  selectedBillingIds,
  setSelectedBillingIds,
  sortedBillings,
  subTab,
}) => {
  return (
    <>
        {subTab === "billings" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                <th className="py-2.5 px-2 text-center w-8">
                  <input
                    type="checkbox"
                    checked={
                      sortedBillings.filter((b) => !b.taxInvoiceId).length > 0 &&
                      selectedBillingIds.length === sortedBillings.filter((b) => !b.taxInvoiceId).length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBillingIds(sortedBillings.filter((b) => !b.taxInvoiceId).map((b) => b.id));
                      } else {
                        setSelectedBillingIds([]);
                      }
                    }}
                    className="rounded border-slate-700"
                    title="미발행 청구 전체 선택 (묶음 세금계산서 발행용)"
                  />
                </th>
                <th className="py-2.5 px-3 text-center">관리</th>
                {renderSortTh("귀속 사업자", "entityType")}
                {renderSortTh("청구번호", "billingNo")}
                {renderSortTh("청구일자", "billingDate")}
                {renderSortTh("원계약번호", "saleNo")}
                {renderSortTh("고객사(수요처)", "customerName")}
                {renderSortTh("청구명 / 세금계산서 품목", "milestoneName")}
                {renderSortTh("공급가액", "supplyAmount", "right")}
                {renderSortTh("부가세액", "vatAmount", "right")}
                {renderSortTh("합계금액", "totalAmount", "right")}
                <th className="py-2.5 px-3 text-center">세금계산서</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedBillings.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500">
                    생성된 유통 청구 내역이 없습니다. 판매 계약 대장에서 [+ 청구생성]을 눌러 청구를 생성하세요.
                  </td>
                </tr>
              ) : (
                sortedBillings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-2 text-center">
                      {!b.taxInvoiceId && (
                        <input
                          type="checkbox"
                          checked={selectedBillingIds.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedBillingIds((prev) => [...prev, b.id]);
                            else setSelectedBillingIds((prev) => prev.filter((id) => id !== b.id));
                          }}
                          className="rounded border-slate-700"
                        />
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleDeleteBilling(b)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 border border-rose-700 text-white font-bold text-[11px] shadow-xs transition"
                        title="청구 내역 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>삭제</span>
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      {b.entityType === "INDIVIDUAL" ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          개인
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          법인
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-blue-400 font-bold">{b.billingNo}</td>
                    <td className="py-2 px-3 font-mono text-slate-300">{b.billingDate}</td>
                    <td className="py-2 px-3 font-mono text-slate-400">
                      {b.saleNo}
                      {Array.isArray(b.saleIds) && b.saleIds.length > 1 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold">
                          외 {b.saleIds.length - 1}건 묶음
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-100">{b.customerName}</span>
                        {b.customerBizNo && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {b.customerBizNo} {b.customerEmail ? `| ${b.customerEmail}` : ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-200">
                      <div className="flex flex-col">
                        <span className="font-semibold">{b.milestoneName || b.productName}</span>
                        {Array.isArray(b.taxItems) && b.taxItems.length > 0 && (
                          <span className="text-[10px] text-emerald-400">
                            품목 {b.taxItems.length}건 ({b.taxItems[0]?.itemName}{b.taxItems.length > 1 ? ` 외 ${b.taxItems.length - 1}건` : ""})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(b.supplyAmount)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{formatErpCurrency(b.vatAmount)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">{formatErpCurrency(b.totalAmount)}</td>
                    <td className="py-2 px-3 text-center">
                      {b.taxInvoiceId ? (
                        <span className="px-2 py-0.5 bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 rounded text-[11px] font-semibold font-mono">
                          발행완료 (#{b.taxInvoiceId})
                        </span>
                      ) : (
                        <button
                          onClick={() => handleIssueTaxFromTradeBilling(b)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold transition shadow"
                        >
                          계산서발행
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
    </>
  );
};

export interface SettlementSubTabProps {
  renderSortTh: (label: string, key: string, align?: "left" | "right" | "center") => React.JSX.Element;
  settlementSummary: any;
  sortedCustomerBreakdown: any[];
  subTab: "inventory" | "products" | "purchases" | "sales" | "billings" | "settlement";
}

export const SettlementSubTab: React.FC<SettlementSubTabProps> = ({
  renderSortTh,
  settlementSummary,
  sortedCustomerBreakdown,
  subTab,
}) => {
  return (
    <>
        {subTab === "settlement" && (
          <div className="p-4 flex flex-col gap-4">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <span className="text-[11px] text-slate-400">총 판매 건수 / 수량</span>
                <div className="text-base font-bold text-white mt-1">
                  {formatErpNumber(settlementSummary?.totalOrders || 0)}건 / {formatErpQty(settlementSummary?.totalQty || 0, "개")}
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <span className="text-[11px] text-slate-400">총 매출액</span>
                <div className="text-base font-bold text-blue-400 mt-1">
                  {formatErpCurrency(settlementSummary?.totalRevenue || 0)}
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <span className="text-[11px] text-slate-400">총 매출원가 (COGS)</span>
                <div className="text-base font-bold text-slate-400 mt-1">
                  {formatErpCurrency(settlementSummary?.totalCogs || 0)}
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <span className="text-[11px] text-slate-400">총 매출총이익 (마진율)</span>
                <div className="text-base font-bold text-emerald-400 mt-1">
                  {formatErpCurrency(settlementSummary?.totalMargin || 0)} ({settlementSummary?.marginRate || 0}%)
                </div>
              </div>
            </div>

            {/* Customer Breakdown Grid */}
            <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 text-xs font-bold text-slate-200">
                거래처별 매출 및 마진 집계
              </div>
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    {renderSortTh("거래처명", "customerName")}
                    {renderSortTh("주문건수", "orderCount", "right")}
                    {renderSortTh("매출액", "revenue", "right")}
                    {renderSortTh("매출원가", "cogs", "right")}
                    {renderSortTh("매출총이익", "margin", "right")}
                    {renderSortTh("마진율", "marginRate", "right")}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
                  {sortedCustomerBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        해당 기간 정산 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    sortedCustomerBreakdown.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-bold text-slate-100">{c.customerName}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatErpNumber(c.orderCount)}건</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-400">
                          {formatErpCurrency(c.revenue)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">
                          {formatErpCurrency(c.cogs)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                          {formatErpCurrency(c.margin)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-300">
                          {c.marginRate}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </>
  );
};
