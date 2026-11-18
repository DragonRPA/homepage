"use client";

import React, { useMemo, useState } from "react";
import { Download, Edit, FileText, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { formatErpCurrency, formatErpNumber, sortErpItems, cycleErpSort, type SortDirection } from "@/lib/erpFormat";
import { createHangulMatcher } from "@/lib/hangulSearch";
import {
  formatAttachedOptionsSummary,
  normalizeAttachedOptions,
} from "@/lib/forkliftDomain";
import {
  getRentalRateBasisShortLabel,
  inferRentalRateBasis,
  resolveDailyRentalFee,
} from "@/lib/rentalFeeUtils";
import { SortableTh } from "../SortableTh";

export type RentalSubTabKey = "models" | "assets" | "contracts" | "billings";

export interface RentalDocViewerState {
  title: string;
  customerName: string;
  url: string;
  fileName: string;
}

export interface RentalSubTabGridsProps {
  subTab: RentalSubTabKey;
  selectedYm: string;
  setSelectedYm: React.Dispatch<React.SetStateAction<string>>;
  rentalSearchQuery: string;
  setRentalSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  assets: any[];
  contracts: any[];
  billings: any[];
  models: any[];
  canBill: boolean;
  handleOpenBillingFromContract: (ct: any) => void;
  handleOpenEditContract: (c: any) => void;
  handleDeleteContract: (c: any) => void;
  handleOpenContractFile: (c: any) => void;
  handleReturnContract: (contractId: number) => void;
  handleDeleteBilling: (b: any) => void;
  handleIssueTaxFromRental: (b: any) => void;
}

export const RentalSubTabGrids: React.FC<RentalSubTabGridsProps> = ({
  subTab,
  selectedYm,
  setSelectedYm,
  rentalSearchQuery,
  setRentalSearchQuery,
  assets,
  contracts,
  billings,
  models,
  canBill,
  handleOpenBillingFromContract,
  handleOpenEditContract,
  handleDeleteContract,
  handleOpenContractFile,
  handleReturnContract,
  handleDeleteBilling,
  handleIssueTaxFromRental,
}) => {
  // Sorting State (탭별 기본 정렬 키/방향 자동 적용 · 3단계: asc ➔ desc ➔ null 정렬안함)
  const [sortStateByTab, setSortStateByTab] = useState<
    Record<RentalSubTabKey, { key: string; dir: SortDirection }>
  >({
    assets: { key: "assetNo", dir: "asc" },
    contracts: { key: "contractNo", dir: "desc" },
    billings: { key: "billingNo", dir: "desc" },
    models: { key: "model_code", dir: "asc" },
  });

  const sortKey = sortStateByTab[subTab].key;
  const sortDir = sortStateByTab[subTab].dir;

  const handleSort = (key: string) => {
    setSortStateByTab((prev) => {
      const current = prev[subTab];
      return {
        ...prev,
        [subTab]: cycleErpSort(current.key, current.dir, key),
      };
    });
  };

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => {
    const isActive = sortKey === key && sortDir !== null;
    return (
      <SortableTh
        label={label}
        colKey={key}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        align={align}
        className={`py-2.5 px-3 hover:bg-[#d0c6b4] dark:hover:bg-slate-800 ${isActive ? "text-[#1d4ed8] dark:text-blue-400 font-bold" : ""}`}
        iconClassName="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
      />
    );
  };

  // Filtered & Sorted Lists (통합 초성검색 + 정렬)
  const searchMatcher = useMemo(
    () => createHangulMatcher(rentalSearchQuery),
    [rentalSearchQuery]
  );

  const filteredAssets = useMemo(() => {
    if (!rentalSearchQuery.trim()) return assets;
    return assets.filter((a) =>
      searchMatcher.testAny([a.assetNo, a.modelName, a.modelCode, a.manufacturer, a.serialNo, a.status])
    );
  }, [assets, rentalSearchQuery, searchMatcher]);

  const filteredContracts = useMemo(() => {
    if (!rentalSearchQuery.trim()) return contracts;
    return contracts.filter((c) =>
      searchMatcher.testAny([c.contractNo, c.customerName, c.modelName, c.assetNo, c.siteName, c.memo])
    );
  }, [contracts, rentalSearchQuery, searchMatcher]);

  const filteredBillings = useMemo(() => {
    if (!rentalSearchQuery.trim()) return billings;
    return billings.filter((b) =>
      searchMatcher.testAny([b.billingNo, b.customerName, b.assetNo, b.modelName, b.taxInvoiceNo])
    );
  }, [billings, rentalSearchQuery, searchMatcher]);

  const filteredModels = useMemo(() => {
    if (!rentalSearchQuery.trim()) return models;
    return models.filter((m) =>
      searchMatcher.testAny([m.model_code, m.modelCode, m.model_name, m.modelName, m.manufacturer, m.spec])
    );
  }, [models, rentalSearchQuery, searchMatcher]);

  const sortedAssets = useMemo(
    () => sortErpItems(filteredAssets, sortStateByTab.assets.key, sortStateByTab.assets.dir),
    [filteredAssets, sortStateByTab.assets]
  );
  const sortedContracts = useMemo(
    () => sortErpItems(filteredContracts, sortStateByTab.contracts.key, sortStateByTab.contracts.dir),
    [filteredContracts, sortStateByTab.contracts]
  );
  const sortedBillings = useMemo(
    () => sortErpItems(filteredBillings, sortStateByTab.billings.key, sortStateByTab.billings.dir),
    [filteredBillings, sortStateByTab.billings]
  );
  const sortedModels = useMemo(
    () => sortErpItems(filteredModels, sortStateByTab.models.key, sortStateByTab.models.dir),
    [filteredModels, sortStateByTab.models]
  );

  return (
    <>
      {/* Scope / Filter Bar (Z-Pattern ①) */}
      <div className="flex flex-wrap items-end gap-3 bg-[#e2dbcd] p-2.5 rounded border border-[#b5a894] text-xs text-[#0f172a] dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-200">
        {subTab === "billings" && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold whitespace-nowrap">정산 연월</label>
            <input
              type="month"
              value={selectedYm}
              onChange={(e) => setSelectedYm(e.target.value)}
              className="h-8 px-2 bg-[#f4efe4] border border-[#b5a894] rounded text-xs text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>
        )}
        <div className="flex flex-col gap-1 min-w-[260px] flex-1 max-w-md">
          <label className="text-[11px] font-semibold whitespace-nowrap">통합 검색</label>
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={rentalSearchQuery}
              onChange={(e) => setRentalSearchQuery(e.target.value)}
              placeholder="초성·고객사·자산번호·모델명 검색"
              className="w-full h-8 pl-8 pr-7 bg-[#f4efe4] border border-[#b5a894] rounded text-xs text-[#0f172a] font-medium focus:outline-none focus:border-[#1d4ed8]"
            />
            {rentalSearchQuery && (
              <button
                type="button"
                onClick={() => setRentalSearchQuery("")}
                className="absolute right-2 text-[#64748b] hover:text-[#0f172a]"
                title="검색어 초기화"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {subTab === "billings" && (
          <span className="text-[#475569] text-[11px] whitespace-nowrap pb-1">
            과금 기준 3원칙 적용: 월단가 · 일단가 지정 · 월단가÷30 천원반올림
          </span>
        )}
      </div>

      {/* Main Inspection Grid (Z-Pattern ③) */}
      <div className="flex-1 bg-[#f4efe4] border border-[#b5a894] rounded overflow-auto shadow-inner dark:bg-slate-900 dark:border-slate-800">
        {subTab === "assets" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                {renderSortTh("자산번호", "assetNo")}
                {renderSortTh("기종 모델", "modelName")}
                {renderSortTh("제조사", "manufacturer")}
                {renderSortTh("시리얼번호", "serialNo")}
                {renderSortTh("취득일자", "acquisitionDate")}
                {renderSortTh("취득원가", "acquisitionCost", "right")}
                {renderSortTh("잔존가치", "salvageValue", "right")}
                {renderSortTh("내용연수", "usefulLifeYears", "center")}
                {renderSortTh("감가상각누계액", "accumulatedDepreciation", "right")}
                {renderSortTh("현재 장부가액", "bookValue", "right")}
                {renderSortTh("자산상태", "status", "center")}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedAssets.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    등록된 취득 자산이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedAssets.map((a) => (
                  <tr key={a.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-mono font-bold text-blue-400">{a.assetNo}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{a.modelName}</td>
                    <td className="py-2 px-3 text-slate-300">{a.manufacturer}</td>
                    <td className="py-2 px-3 font-mono text-slate-400">{a.serialNo || "-"}</td>
                    <td className="py-2 px-3 font-mono text-slate-300">{a.acquisitionDate}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-200">{formatErpCurrency(a.acquisitionCost)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{formatErpCurrency(a.salvageValue)}</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-300">{formatErpNumber(a.usefulLifeYears)}년</td>
                    <td className="py-2 px-3 text-right font-mono text-rose-400">{formatErpCurrency(a.accumulatedDepreciation)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatErpCurrency(a.bookValue)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.status === "RENTED" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                        a.status === "AVAILABLE" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                        "bg-slate-800 text-slate-400"
                      }`}>
                        {a.status === "RENTED" ? "대여중" : a.status === "AVAILABLE" ? "임대가능" : a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {subTab === "contracts" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                <th className="py-2.5 px-3 text-center sticky left-0 bg-[#e2dbcd] dark:bg-slate-950 z-20 border-r border-[#b5a894] dark:border-slate-800">관리 (CRUD)</th>
                {renderSortTh("귀속 사업자", "entityType")}
                {renderSortTh("계약번호", "contractNo")}
                {renderSortTh("고객사(임차인)", "customerName")}
                {renderSortTh("임대 제품 및 수량", "modelName")}
                {renderSortTh("배정 자산", "assetNo")}
                {renderSortTh("계약기간", "startDate")}
                {renderSortTh("월임대료", "monthlyRate", "right")}
                {renderSortTh("일단가 / 과금기준", "dailyRate", "right")}
                <th className="py-2.5 px-3 text-center">계약서</th>
                {renderSortTh("계약상태", "status", "center")}
                <th className="py-2.5 px-3 text-center">반납 조치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedContracts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500">
                    등록된 임대계약이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedContracts.map((c) => {
                  const taxItemsArr = Array.isArray(c.taxItems) ? c.taxItems : [];
                  const totalQty = taxItemsArr.reduce((acc: number, it: any) => acc + (Number(it.qty) || 1), 0);
                  const productSummary =
                    taxItemsArr.length > 1
                      ? `${taxItemsArr[0]?.itemName || c.modelName || "제품"} 외 ${taxItemsArr.length - 1}종 (총 ${formatErpNumber(totalQty)}대)`
                      : taxItemsArr.length === 1
                      ? `${taxItemsArr[0]?.itemName || c.modelName || "제품"} (${formatErpNumber(taxItemsArr[0]?.qty || 1)}대)`
                      : c.modelName || "-";

                  return (
                    <tr key={c.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                      <td className="py-2 px-3 text-center sticky left-0 bg-[#f4efe4] dark:bg-slate-900 border-r border-[#b5a894] dark:border-slate-800 z-10 shadow-sm">
                        <div className="inline-flex items-center gap-1">
                          {canBill && (
                            <button
                              type="button"
                              onClick={() => handleOpenBillingFromContract(c)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-400 inline-flex items-center gap-1 transition"
                              title="이 임대계약의 품목을 끌어와 청구서 생성"
                            >
                              <Plus className="w-3 h-3" />
                              <span>청구생성</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditContract(c)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-400 inline-flex items-center gap-1 transition"
                            title="계약 정보 수정"
                          >
                            <Edit className="w-3 h-3" />
                            <span>수정</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContract(c)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-400 inline-flex items-center gap-1 transition"
                            title="계약 삭제 및 자산 복구"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>삭제</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {c.entityType === "INDIVIDUAL" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            개인
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            법인
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-blue-400">{c.contractNo}</td>
                      <td className="py-2 px-3 font-bold text-slate-100">{c.customerName}</td>
                      <td className="py-2 px-3 font-semibold text-slate-200">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{productSummary}</span>
                          {normalizeAttachedOptions(c.attachedOptions).length > 0 && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300"
                              title={formatAttachedOptionsSummary(c.attachedOptions)}
                            >
                              부착옵션 {normalizeAttachedOptions(c.attachedOptions).length}종
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-300">
                        {c.activeAssetCount > 1
                          ? `${c.assetNo || "-"} 외 ${c.activeAssetCount - 1}대 (총 ${c.activeAssetCount}대)`
                          : c.assetNo || (taxItemsArr.length > 0 ? `품목 ${taxItemsArr.length}건` : "출고 대기")}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-300">{c.startDate ? String(c.startDate).slice(0, 10) : "-"} ~ {c.endDate ? String(c.endDate).slice(0, 10) : "-"}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(c.monthlyRate)}</td>
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-bold text-[#1e3a8a] dark:text-blue-300">
                            {formatErpCurrency(resolveDailyRentalFee(c.monthlyRate, c.dailyRate))}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e2dbcd] text-[#334155] border border-[#b5a894] whitespace-nowrap shrink-0">
                            {getRentalRateBasisShortLabel(inferRentalRateBasis(c.monthlyRate, c.dailyRate, c.rateBasis))}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {c.hasContractFile ? (
                          <button
                            onClick={() => handleOpenContractFile(c)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd] hover:bg-[#bfdbfe] dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900 inline-flex items-center gap-1 transition"
                            title={c.contractFileName || "계약서 열람"}
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>열람</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#64748b] dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === "ACTIVE" ? "bg-amber-950 text-amber-400 border border-amber-800" : "bg-slate-800 text-slate-400"
                        }`}>
                          {c.status === "ACTIVE" ? "대여중" : "반납완료"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {c.status === "ACTIVE" ? (
                          <button
                            onClick={() => handleReturnContract(c.id)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[11px] font-semibold transition"
                          >
                            장비회수/반납
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px]">반납됨</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {subTab === "billings" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                <th className="py-2.5 px-3 text-center sticky left-0 bg-[#e2dbcd] dark:bg-slate-950 z-20 border-r border-[#b5a894] dark:border-slate-800">관리</th>
                {renderSortTh("청구번호", "billingNo")}
                {renderSortTh("고객사", "customerName")}
                {renderSortTh("자산/기종", "assetNo")}
                {renderSortTh("가동일수", "operatingDays", "center")}
                {renderSortTh("일할매출액", "proRataRevenue", "right")}
                {renderSortTh("감가상각원가(COGS)", "depreciationCogs", "right")}
                {renderSortTh("순마진", "netMargin", "right")}
                {renderSortTh("수납상태", "paymentStatus", "center")}
                <th className="py-2.5 px-3 text-center">세금계산서</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedBillings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    해당 연월에 생성된 임대 정산 청구서가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedBillings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 text-center sticky left-0 bg-[#f4efe4] dark:bg-slate-900 border-r border-[#b5a894] dark:border-slate-800 z-10 shadow-sm">
                      {!b.taxInvoiceId ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteBilling(b)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-400 inline-flex items-center gap-1 transition"
                          title="청구 내역 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>삭제</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#78716c] font-mono">발행확정</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-blue-400">{b.billingNo}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{b.customerName}</td>
                    <td className="py-2 px-3 text-slate-200">{b.assetNo} ({b.modelName})</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-300">{formatErpNumber(b.operatingDays)}일</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-400">
                      {formatErpCurrency(b.proRataRevenue)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">
                      {formatErpCurrency(b.depreciationCogs)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatErpCurrency(b.netMargin)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        b.paymentStatus === "PAID" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}>
                        {b.paymentStatus === "PAID" ? "완납" : "미수"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {b.taxInvoiceNo ? (
                        <span className="font-mono text-[10px] text-blue-400">{b.taxInvoiceNo}</span>
                      ) : (
                        <button
                          onClick={() => handleIssueTaxFromRental(b)}
                          className="px-2 py-0.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-700 text-blue-300 rounded text-[11px] font-semibold transition"
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

        {subTab === "models" && (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#e2dbcd] text-[#0f172a] sticky top-0 border-b border-[#b5a894] dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 font-semibold select-none z-10">
              <tr>
                {renderSortTh("모델 코드", "model_code")}
                {renderSortTh("모델명", "model_name")}
                {renderSortTh("제조사", "manufacturer")}
                {renderSortTh("제원 사양", "spec")}
                {renderSortTh("기준 월임대료", "standard_monthly_rate", "right")}
                {renderSortTh("기준 일일단가", "standard_daily_rate", "right")}
                {renderSortTh("상태", "status", "center")}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800/60">
              {sortedModels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    등록된 기종 모델이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedModels.map((m) => (
                  <tr key={m.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-mono font-bold text-blue-400">{m.model_code}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{m.model_name}</td>
                    <td className="py-2 px-3 text-slate-300">{m.manufacturer}</td>
                    <td className="py-2 px-3 text-slate-400">{m.spec || "-"}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatErpCurrency(m.standard_monthly_rate)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      {formatErpCurrency(resolveDailyRentalFee(m.standard_monthly_rate, m.standard_daily_rate))}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        정상가동
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Terminal Summary (Z-Pattern ④) */}
      <div className="bg-[#e2dbcd] border border-[#b5a894] px-4 py-2.5 rounded flex items-center justify-between text-xs text-[#0f172a] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">
        <div className="flex items-center gap-4">
          <span>총 자산: <strong className="text-white">{formatErpNumber(assets.length)}대</strong></span>
          <span>임대중: <strong className="text-amber-400">{formatErpNumber(assets.filter(a => a.status === "RENTED").length)}대</strong></span>
          <span>임대가능: <strong className="text-emerald-400">{formatErpNumber(assets.filter(a => a.status === "AVAILABLE").length)}대</strong></span>
          <span>총 장부가액: <strong className="text-blue-400">{formatErpCurrency(assets.reduce((s, a) => s + Number(a.bookValue || 0), 0))}</strong></span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          ※ 헌장 1.3 출고 승인 마감 시 자산상태 RENTED 전환 원칙 준수
        </div>
      </div>
    </>
  );
};

export const RentalDeprecModal: React.FC<{
  assetCount: number;
  onClose: () => void;
  onExecute: () => void;
}> = ({ assetCount, onClose, onExecute }) => (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-amber-700/60 w-full max-w-md rounded shadow-2xl p-5 text-white">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-amber-400" />
          <span>당월 정액법 감가상각 마감 실행</span>
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 text-xs">
        <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded text-amber-200">
          <p className="font-bold mb-1">⚖️ 감가상각 회계 원칙</p>
          <p className="text-[11px] leading-relaxed text-amber-300/90">
            - 정액법 공식: (취득원가 - 잔존가치) / (내용연수 × 12개월)<br/>
            - 실행 대상: 현재 가동 중인 전 자산 (총 {formatErpNumber(assetCount)}대)<br/>
            - 산출된 월 상각비는 임대 기간별 매출원가로 1:1 매핑됩니다.
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-[#334155] rounded border border-[#b5a894] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onExecute}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 font-bold text-black rounded"
          >
            마감 실행
          </button>
        </div>
      </div>
    </div>
  </div>
);

export const RentalDocViewerModal: React.FC<{
  activeDocViewer: RentalDocViewerState;
  onClose: () => void;
}> = ({ activeDocViewer, onClose }) => (
  <div
    className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-700 w-full max-w-4xl h-[85vh] rounded shadow-2xl flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#b5a894] dark:border-slate-800 bg-[#ebe5d8] dark:bg-slate-950">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400 shrink-0" />
          <span className="font-bold text-xs text-[#0f172a] dark:text-slate-100 truncate">
            {activeDocViewer.title}
          </span>
          <span className="text-[11px] text-[#475569] dark:text-slate-400 font-mono truncate">
            ({activeDocViewer.fileName})
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeDocViewer.url && (
            <a
              href={activeDocViewer.url}
              download={activeDocViewer.fileName}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>다운로드</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1 text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-auto p-4">
        {activeDocViewer.url.startsWith("data:application/pdf") ||
        activeDocViewer.fileName.toLowerCase().endsWith(".pdf") ? (
          <iframe
            src={activeDocViewer.url}
            className="w-full h-full rounded border border-slate-800 bg-white"
            title={activeDocViewer.fileName}
          />
        ) : activeDocViewer.url.startsWith("data:image/") ? (
          <img
            src={activeDocViewer.url}
            alt={activeDocViewer.fileName}
            className="max-w-full max-h-full object-contain rounded shadow-lg"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center p-6 bg-slate-900 border border-slate-800 rounded">
            <FileText className="w-10 h-10 text-blue-400" />
            <div className="text-xs text-slate-200 font-semibold">{activeDocViewer.fileName}</div>
            <div className="text-[11px] text-slate-400">
              브라우저 내 직접 미리보기를 지원하지 않는 문서 형식입니다. 다운로드하여 확인하십시오.
            </div>
            <a
              href={activeDocViewer.url}
              download={activeDocViewer.fileName}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>계약서 파일 다운로드</span>
            </a>
          </div>
        )}
      </div>
    </div>
  </div>
);
