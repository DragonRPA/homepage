"use client";

import React, { useMemo, useState } from "react";
import { Calendar, Download, Edit, FileText, Search, Trash2, X } from "lucide-react";
import { formatErpCurrency, sortErpItems } from "@/lib/erpFormat";
import { matchHangulAny } from "@/lib/hangulSearch";
import { SortableTh, useErpTableSort } from "../SortableTh";

export interface ServiceDocViewerState {
  title: string;
  customerName: string;
  url: string;
  fileName: string;
}

export interface ServiceLedgersAndDocModalProps {
  activeType: "OPERATIONAL" | "DEVELOPMENT";
  contracts: any[];
  billings: any[];
  billingContractFilter: string;
  setBillingContractFilter: React.Dispatch<React.SetStateAction<string>>;
  handleOpenEditContract: (c: any) => Promise<void> | void;
  handleDeleteContract: (c: any) => Promise<void> | void;
  handleOpenContractFile: (c: any) => Promise<void> | void;
  handleDeleteBilling: (b: any) => Promise<void> | void;
  activeDocViewer: ServiceDocViewerState | null;
  setActiveDocViewer: React.Dispatch<React.SetStateAction<ServiceDocViewerState | null>>;
}

type TableSortCtrl = ReturnType<typeof useErpTableSort>;

export const ServiceLedgersAndDocModal: React.FC<ServiceLedgersAndDocModalProps> = ({
  activeType,
  contracts,
  billings,
  billingContractFilter,
  setBillingContractFilter,
  handleOpenEditContract,
  handleDeleteContract,
  handleOpenContractFile,
  handleDeleteBilling,
  activeDocViewer,
  setActiveDocViewer,
}) => {
  // 하단 청구 및 수납 내역 기간/검색 필터 상태
  const [billingStartDate, setBillingStartDate] = useState<string>("");
  const [billingEndDate, setBillingEndDate] = useState<string>("");
  const [billingPeriodPreset, setBillingPeriodPreset] = useState<
    "ALL" | "THIS_MONTH" | "LAST_MONTH" | "3M" | "THIS_YEAR" | "CUSTOM"
  >("ALL");
  const [billingSearchQuery, setBillingSearchQuery] = useState<string>("");

  const applyBillingPeriodPreset = (preset: "ALL" | "THIS_MONTH" | "LAST_MONTH" | "3M" | "THIS_YEAR") => {
    setBillingPeriodPreset(preset);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad2 = (n: number) => String(n).padStart(2, "0");

    if (preset === "ALL") {
      setBillingStartDate("");
      setBillingEndDate("");
      return;
    }
    if (preset === "THIS_MONTH") {
      const lastDay = new Date(y, m + 1, 0).getDate();
      setBillingStartDate(`${y}-${pad2(m + 1)}-01`);
      setBillingEndDate(`${y}-${pad2(m + 1)}-${pad2(lastDay)}`);
      return;
    }
    if (preset === "LAST_MONTH") {
      const prev = new Date(y, m - 1, 1);
      const py = prev.getFullYear();
      const pm = prev.getMonth();
      const lastDay = new Date(py, pm + 1, 0).getDate();
      setBillingStartDate(`${py}-${pad2(pm + 1)}-01`);
      setBillingEndDate(`${py}-${pad2(pm + 1)}-${pad2(lastDay)}`);
      return;
    }
    if (preset === "3M") {
      const startObj = new Date(y, m - 2, 1);
      const sy = startObj.getFullYear();
      const sm = startObj.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      setBillingStartDate(`${sy}-${pad2(sm + 1)}-01`);
      setBillingEndDate(`${y}-${pad2(m + 1)}-${pad2(lastDay)}`);
      return;
    }
    if (preset === "THIS_YEAR") {
      setBillingStartDate(`${y}-01-01`);
      setBillingEndDate(`${y}-12-31`);
    }
  };

  // Sorting State (3단계: asc ➔ desc ➔ null 정렬안함)
  const contractSort = useErpTableSort("id", "desc");
  const billingSort = useErpTableSort("id", "desc");

  const renderLedgerSortTh = (
    sortCtrl: TableSortCtrl,
    label: string,
    key: string,
    align: "left" | "right" | "center" = "left"
  ) => {
    const isActive = sortCtrl.sortKey === key && sortCtrl.sortDir !== null;
    return (
      <SortableTh
        label={label}
        colKey={key}
        sortKey={sortCtrl.sortKey}
        sortDir={sortCtrl.sortDir}
        onSort={sortCtrl.handleSort}
        align={align}
        className={`py-2 px-2.5 hover:bg-[#d0c6b4] ${isActive ? "text-blue-800 font-bold" : "text-[#44403c]"}`}
        iconClassName="w-3.5 h-3.5 text-blue-800"
      />
    );
  };

  const sortedContracts = useMemo(
    () => sortErpItems(contracts, contractSort.sortKey, contractSort.sortDir),
    [contracts, contractSort.sortKey, contractSort.sortDir]
  );

  const filteredBillings = useMemo(() => {
    return billings.filter((b) => {
      const bDate = b.billingDate ? String(b.billingDate).slice(0, 10) : "";
      if (billingStartDate && (!bDate || bDate < billingStartDate)) return false;
      if (billingEndDate && (!bDate || bDate > billingEndDate)) return false;
      if (billingContractFilter !== "ALL" && String(b.contractId) !== String(billingContractFilter)) {
        return false;
      }
      if (billingSearchQuery.trim()) {
        if (
          !matchHangulAny(
            [b.billingNo, b.customerName, b.projectName, b.milestoneName, b.taxInvoiceNo],
            billingSearchQuery
          )
        ) {
          return false;
        }
      }
      return true;
    });
  }, [billings, billingStartDate, billingEndDate, billingContractFilter, billingSearchQuery]);

  const sortedBillings = useMemo(
    () => sortErpItems(filteredBillings, billingSort.sortKey, billingSort.sortDir),
    [filteredBillings, billingSort.sortKey, billingSort.sortDir]
  );

  const billingSupplySum = sortedBillings.reduce((s, b) => s + Number(b.supplyAmount || 0), 0);
  const billingTotalSum = sortedBillings.reduce((s, b) => s + Number(b.totalAmount || 0), 0);

  return (
    <>
      {/* Main Vertical Split Layout: Top Contracts | Bottom Billings with Period Filter */}
      <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
        {/* Top: Contracts Ledger */}
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col basis-[45%] min-h-[190px] overflow-hidden shadow-sm">
          <div className="px-3 py-2 border-b border-[#b5a894] bg-[#dfd7c7] text-xs font-bold text-[#57534e] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span>체결 계약 대장 ({contracts.length}건)</span>
              {billingContractFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setBillingContractFilter("ALL")}
                  className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-bold hover:bg-blue-200 transition"
                >
                  선택계약 필터 해제
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#78716c]">
              {activeType === "OPERATIONAL" && (
                <span>
                  월 용역료 합계:{" "}
                  <strong className="text-[#1c1917] font-mono">
                    {formatErpCurrency(contracts.reduce((s, c) => s + Number(c.monthlyFee || 0), 0))}
                  </strong>
                </span>
              )}
              <span>
                총 계약고:{" "}
                <strong className="text-[#1c1917] font-mono">
                  {formatErpCurrency(contracts.reduce((s, c) => s + Number(c.contractAmount || 0), 0))}
                </strong>
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead className="bg-[#ded6c5] text-[#44403c] sticky top-0 border-b border-[#b5a894] font-bold select-none z-10">
                <tr>
                  <th className="py-2 px-2.5 text-center sticky left-0 bg-[#ded6c5] z-20 border-r border-[#b5a894]">
                    관리
                  </th>
                  {renderLedgerSortTh(contractSort, "귀속", "entityType")}
                  {renderLedgerSortTh(contractSort, "계약번호", "contractNo")}
                  {renderLedgerSortTh(contractSort, "고객사", "customerName")}
                  {renderLedgerSortTh(contractSort, "용역/프로젝트명", "projectName")}
                  {renderLedgerSortTh(
                    contractSort,
                    activeType === "OPERATIONAL" ? "월 용역료" : "총 계약금",
                    activeType === "OPERATIONAL" ? "monthlyFee" : "contractAmount",
                    "right"
                  )}
                  {renderLedgerSortTh(contractSort, "청구일", "billingDay", "center")}
                  {renderLedgerSortTh(contractSort, "계약기간", "startDate")}
                  <th className="py-2 px-2.5 text-center">계약서</th>
                  {renderLedgerSortTh(contractSort, "상태", "status", "center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b5a894]">
                {sortedContracts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-[#78716c]">
                      등록된 용역 계약이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedContracts.map((c) => {
                    const isContractSelected = String(billingContractFilter) === String(c.id);
                    return (
                      <tr
                        key={c.id}
                        onClick={() =>
                          setBillingContractFilter((prev) =>
                            String(prev) === String(c.id) ? "ALL" : String(c.id)
                          )
                        }
                        className={`cursor-pointer transition ${
                          isContractSelected ? "bg-blue-50/80 ring-1 ring-inset ring-blue-400" : "hover:bg-[#dfd7c7]"
                        }`}
                        title="클릭하면 하단 청구 내역에서 해당 계약 건만 필터링합니다"
                      >
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="py-2 px-2.5 text-center border-r border-[#b5a894] sticky left-0 bg-[#ebe5d8] z-10 shadow-sm"
                        >
                          <div className="inline-flex items-center gap-1">
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
                              title="계약 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>삭제</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894]">
                          {c.entityType === "INDIVIDUAL" ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              개인
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              법인
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894] font-mono text-blue-800 font-bold">
                          {c.contractNo}
                        </td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894] font-bold text-[#1c1917]">
                          {c.customerName}
                        </td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894] text-[#1c1917]">
                          <div className="flex items-center gap-1.5">
                            <span>{c.projectName}</span>
                            {c.includeOtInBilling && (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                초과근무수당 반영
                              </span>
                            )}
                          </div>
                          {Array.isArray(c.assignedEmployees) && c.assignedEmployees.length > 0 && (
                            <div className="text-[10px] font-semibold text-blue-800 mt-0.5">
                              투입 {c.assignedEmployees.length}명:{" "}
                              {c.assignedEmployees.map((emp: any) => emp.name).join(", ")}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894] text-right font-mono font-bold text-[#1c1917]">
                          {formatErpCurrency(activeType === "OPERATIONAL" ? c.monthlyFee : c.contractAmount)}
                        </td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894] text-center font-mono text-[11px] text-[#57534e]">
                          매월 {c.billingDay || 25}일
                        </td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894] font-mono text-[#78716c] text-[11px]">
                          {c.startDate ? String(c.startDate).slice(0, 10) : "-"} ~{" "}
                          {c.endDate ? String(c.endDate).slice(0, 10) : "-"}
                        </td>
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="py-2 px-2.5 border-r border-[#b5a894] text-center"
                        >
                          {c.hasContractFile ? (
                            <button
                              type="button"
                              onClick={() => handleOpenContractFile(c)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f5f3ff] hover:bg-[#ede9fe] text-[#6d28d9] border border-[#ddd6fe] inline-flex items-center gap-1 transition"
                              title={c.contractFileName || "계약서 열람"}
                            >
                              <FileText className="w-3 h-3" />
                              <span>열람</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#78716c]">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              c.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-[#ded6c5] text-[#78716c]"
                            }`}
                          >
                            {c.status === "ACTIVE" ? "진행중" : "종결"}
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

        {/* Bottom: Billings Ledger with Date Range & Search Filter */}
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col basis-[55%] min-h-[220px] flex-1 overflow-hidden shadow-sm">
          {/* Header & Period Filter Bar */}
          <div className="px-3 py-2 border-b border-[#b5a894] bg-[#dfd7c7] text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[#57534e]">
                청구 및 수납 내역 ({sortedBillings.length}건
                {sortedBillings.length !== billings.length ? ` / 전체 ${billings.length}건` : ""})
              </span>

              {/* 조회 기간 설정 */}
              <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-[#b5a894]">
                <Calendar className="w-3.5 h-3.5 text-[#57534e]" />
                <span className="text-[11px] font-bold text-[#57534e]">청구기간</span>
                <input
                  type="date"
                  value={billingStartDate}
                  onChange={(e) => {
                    setBillingStartDate(e.target.value);
                    setBillingPeriodPreset("CUSTOM");
                  }}
                  className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[11px] font-mono text-[#1c1917]"
                />
                <span className="text-[#78716c] font-bold">~</span>
                <input
                  type="date"
                  value={billingEndDate}
                  onChange={(e) => {
                    setBillingEndDate(e.target.value);
                    setBillingPeriodPreset("CUSTOM");
                  }}
                  className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[11px] font-mono text-[#1c1917]"
                />
                <div className="inline-flex items-center gap-1 ml-1">
                  {(
                    [
                      { key: "ALL", label: "전체기간" },
                      { key: "THIS_MONTH", label: "당월" },
                      { key: "LAST_MONTH", label: "전월" },
                      { key: "3M", label: "최근3개월" },
                      { key: "THIS_YEAR", label: "올해" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyBillingPeriodPreset(p.key)}
                      className={`h-7 px-2 rounded text-[11px] font-bold border transition ${
                        billingPeriodPreset === p.key
                          ? "bg-blue-700 text-white border-blue-900"
                          : "bg-[#f4efe4] text-[#57534e] border-[#b5a894] hover:bg-[#e2dbcd]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 계약별 필터 및 검색어 */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-[#b5a894]">
                <select
                  value={billingContractFilter}
                  onChange={(e) => setBillingContractFilter(e.target.value)}
                  className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[11px] font-semibold text-[#1c1917]"
                >
                  <option value="ALL">전체 계약</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      [{c.contractNo}] {c.customerName}
                    </option>
                  ))}
                </select>
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-[#78716c] absolute left-2 pointer-events-none" />
                  <input
                    type="text"
                    value={billingSearchQuery}
                    onChange={(e) => setBillingSearchQuery(e.target.value)}
                    placeholder="고객사, 용역명, 청구번호 검색"
                    className="h-7 pl-7 pr-6 rounded border border-[#b5a894] bg-[#f4efe4] text-[11px] text-[#1c1917] w-44"
                  />
                  {billingSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBillingSearchQuery("")}
                      className="absolute right-1.5 text-[#78716c] hover:text-[#1c1917]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#78716c]">
              <span>
                공급가액 합계:{" "}
                <strong className="text-[#1c1917] font-mono">{formatErpCurrency(billingSupplySum)}</strong>
              </span>
              <span>
                총 청구액(VAT포함):{" "}
                <strong className="text-blue-900 font-mono">{formatErpCurrency(billingTotalSum)}</strong>
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead className="bg-[#ded6c5] text-[#44403c] sticky top-0 border-b border-[#b5a894] font-bold select-none z-10">
                <tr>
                  <th className="py-2 px-2.5 text-center sticky left-0 bg-[#ded6c5] z-20 border-r border-[#b5a894]">
                    관리
                  </th>
                  {renderLedgerSortTh(billingSort, "청구일자", "billingDate", "center")}
                  {renderLedgerSortTh(billingSort, "청구번호", "billingNo")}
                  {renderLedgerSortTh(billingSort, "고객사 / 용역명", "customerName")}
                  {renderLedgerSortTh(billingSort, "구분 / 마일스톤", "milestoneName")}
                  {renderLedgerSortTh(billingSort, "공급가액", "supplyAmount", "right")}
                  {renderLedgerSortTh(billingSort, "세액(VAT)", "vatAmount", "right")}
                  {renderLedgerSortTh(billingSort, "총 청구액", "totalAmount", "right")}
                  <th className="py-2 px-2.5 text-center">세금계산서</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b5a894]">
                {sortedBillings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#78716c]">
                      조회 조건에 해당하는 청구 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedBillings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#dfd7c7] transition">
                      <td className="py-2 px-2.5 text-center border-r border-[#b5a894] sticky left-0 bg-[#ebe5d8] z-10 shadow-sm">
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
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-center font-mono font-bold text-[#1c1917]">
                        {b.billingDate ? String(b.billingDate).slice(0, 10) : "-"}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] font-mono text-[#78716c]">
                        {b.billingNo}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] font-bold text-[#1c1917]">
                        <div>{b.customerName}</div>
                        <div className="text-[10px] text-[#78716c] font-normal">{b.projectName}</div>
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-[#1c1917]">
                        {b.milestoneName}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-right font-mono font-bold text-[#1c1917]">
                        {formatErpCurrency(b.supplyAmount)}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-right font-mono text-[#57534e]">
                        {formatErpCurrency(b.vatAmount ?? Math.round(Number(b.supplyAmount || 0) * 0.1))}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-right font-mono font-bold text-blue-900">
                        {formatErpCurrency(b.totalAmount)}
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        {b.taxInvoiceId ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            발행완료 ({b.taxInvoiceNo})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            미발행 (세금계산서 탭에서 일괄발행)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer Summary Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#dfd7c7] border border-[#b5a894] rounded text-xs text-[#57534e]">
        <div className="flex items-center gap-4">
          <span>
            {activeType === "OPERATIONAL" ? "운영용역" : "개발용역"} 계약:{" "}
            <strong>{contracts.length}건</strong>
          </span>
          <span>
            조회 청구건수: <strong>{sortedBillings.length}건</strong>
          </span>
          <span>
            조회 청구 공급가액: <strong>{formatErpCurrency(billingSupplySum)}</strong>
          </span>
        </div>
        <div className="text-[11px] text-[#78716c]">
          * 계약 및 청구 생성 ➔ 전자세금계산서 1-Way 자동 발행 파이프라인
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 4: DOCUMENT VIEWER                                       */}
      {/* ============================================================== */}
      {activeDocViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-3xl w-full h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#b5a894] bg-[#dfd7c7]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">{activeDocViewer.title}</h3>
                <span className="text-xs text-[#78716c]">({activeDocViewer.customerName})</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeDocViewer.url}
                  download={activeDocViewer.fileName}
                  className="px-2 py-1 rounded text-xs font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>다운로드</span>
                </a>
                <button
                  onClick={() => setActiveDocViewer(null)}
                  className="text-[#78716c] hover:text-[#1c1917]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-2 bg-[#ded6c5] overflow-hidden">
              {activeDocViewer.url.startsWith("data:application/pdf") ? (
                <iframe
                  src={activeDocViewer.url}
                  className="w-full h-full rounded border border-[#b5a894]"
                  title="PDF Viewer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center overflow-auto">
                  <img
                    src={activeDocViewer.url}
                    alt="Contract Doc"
                    className="max-w-full max-h-full object-contain rounded border border-[#b5a894]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
