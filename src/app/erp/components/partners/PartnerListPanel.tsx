"use client";

import React from "react";
import { Building2, CreditCard, FileCheck, FileText, Landmark, UserCheck } from "lucide-react";
import { formatErpNumber } from "@/lib/erpFormat";
import { getPartnerTradeBlockInfo } from "@/lib/partnerStatusClient";
import { type Partner } from "./partnerTypes";

export interface PartnerListPanelProps {
  docFetching: boolean;
  handleOpenPartnerDoc: (p: Partner, docType: "BIZ_CERT" | "BANK_COPY" | "CONTRACT", mode?: "VIEW" | "DOWNLOAD") => Promise<void>;
  kpi: { totalCount: number; customerCount: number; vendorCount: number; activeCount: number; blockedCount: number; withBizCertCount: number; withContractCount: number; };
  loading: boolean;
  partnerTypeTab: "CUSTOMER" | "VENDOR" | "ALL";
  renderSortTh: (label: string, colKey: string, align?: "left" | "right" | "center") => React.JSX.Element;
  selectedPartner: Partner | null;
  setSelectedPartner: React.Dispatch<React.SetStateAction<Partner | null>>;
  sortedPartners: Partner[];
}

export const PartnerListPanel: React.FC<PartnerListPanelProps> = ({
  docFetching,
  handleOpenPartnerDoc,
  kpi,
  loading,
  partnerTypeTab,
  renderSortTh,
  selectedPartner,
  setSelectedPartner,
  sortedPartners,
}) => {
  return (
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden shadow-xs dark:bg-slate-900 dark:border-slate-800">
          {/* Header Summary */}
          <div className="p-2.5 bg-[#e2dbcd] border-b border-[#b5a894] text-xs font-bold text-[#0f172a] flex items-center justify-between dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
              <span>
                {partnerTypeTab === "CUSTOMER"
                  ? "고객 (매출처) 대장"
                  : partnerTypeTab === "VENDOR"
                  ? "매입거래처 대장"
                  : "전체 거래처 대장"}
              </span>
              <span className="text-[#475569] font-normal dark:text-slate-400">
                (조회 {formatErpNumber(sortedPartners.length)}개사)
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#475569] dark:text-slate-400 font-mono">
              <span>계약서 보관: <strong className="text-[#1d4ed8] dark:text-blue-400">{formatErpNumber(kpi.withContractCount || 0)}</strong>개사</span>
              <span>사업자등록증 보관: <strong className="text-[#6d28d9] dark:text-purple-300">{formatErpNumber(kpi.withBizCertCount)}</strong>개사</span>
              <span>정상거래: <strong className="text-[#047857] dark:text-emerald-400">{formatErpNumber(kpi.activeCount)}</strong>개사</span>
              <span>거래불가: <strong className="text-[#b91c1c] dark:text-rose-400">{formatErpNumber(kpi.blockedCount || 0)}</strong>개사</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#e2dbcd] text-[#0f172a] uppercase tracking-wider font-semibold border-b-2 border-[#a89a84] sticky top-0 z-10 select-none dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap w-12">선택</th>
                  {renderSortTh("거래처코드", "partnerCode")}
                  {renderSortTh("상호명 (법인명)", "name")}
                  {renderSortTh("구분", "partnerType")}
                  {renderSortTh("사업자등록번호", "businessNo")}
                  {renderSortTh("대표자", "ceoName")}
                  {renderSortTh("본사 담당직원", "managerName")}
                  {renderSortTh("거래명세서 마감", "statementClosingDay")}
                  {renderSortTh("세금계산서 마감", "taxInvoiceClosingDay")}
                  {renderSortTh("약정납기일(결제)", "paymentDueDay")}
                  {renderSortTh("담당자/명함", "contactCount", "center")}
                  {renderSortTh("상태", "status", "center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
                {sortedPartners.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-[#475569] dark:text-slate-500">
                      {loading ? "거래처 데이터를 불러오는 중..." : "등록된 거래처가 없습니다. 상단 [신규 등록] 또는 [사업자등록증 간편등록]을 진행하세요."}
                    </td>
                  </tr>
                ) : (
                  sortedPartners.map((p) => {
                    const isSelected = selectedPartner?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPartner(p)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? "bg-[#dcd4c4] border-l-4 border-[#1d4ed8] dark:bg-blue-950/60 dark:border-blue-500"
                            : "hover:bg-[#f4efe4] dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setSelectedPartner(p)}
                            className="rounded-full text-[#1d4ed8]"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-400 font-bold whitespace-nowrap">
                          {p.partnerCode}
                        </td>
                        <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {(p.hasBizCert || p.bizCertFileUrl) && (
                              <button
                                type="button"
                                disabled={docFetching}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPartnerDoc(p, "BIZ_CERT", "VIEW");
                                }}
                                title="사업자등록증 열기"
                                className="px-1.5 py-0.2 rounded text-[10px] bg-[#f5f3ff] hover:bg-[#ede9fe] text-[#6d28d9] border border-[#ddd6fe] font-bold dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 flex items-center gap-1 transition"
                              >
                                <FileCheck className="w-3 h-3" />
                                <span>등록증</span>
                              </button>
                            )}
                            {(p.hasBankCopy || p.bankCopyFileUrl) && (
                              <button
                                type="button"
                                disabled={docFetching}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPartnerDoc(p, "BANK_COPY", "VIEW");
                                }}
                                title="통장사본 열기"
                                className="px-1.5 py-0.2 rounded text-[10px] bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0] font-bold dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1 transition"
                              >
                                <Landmark className="w-3 h-3" />
                                <span>통장</span>
                              </button>
                            )}
                            {(p.hasContractFile || p.contractFileUrl) && (
                              <button
                                type="button"
                                disabled={docFetching}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPartnerDoc(p, "CONTRACT", "VIEW");
                                }}
                                title="계약서 원본 열기"
                                className="px-1.5 py-0.2 rounded text-[10px] bg-[#dbeafe] hover:bg-[#bfdbfe] text-[#1e40af] border border-[#93c5fd] font-bold dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 flex items-center gap-1 transition"
                              >
                                <FileText className="w-3 h-3" />
                                <span>계약서</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.partnerType === "CUSTOMER"
                                ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                                : p.partnerType === "VENDOR"
                                ? "bg-[#fef3c7] text-[#92400e] border border-[#fde68a] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                : "bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff] dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                            }`}
                          >
                            {p.partnerType === "CUSTOMER" ? "고객" : p.partnerType === "VENDOR" ? "매입처" : "겸용"}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[#0f172a] dark:text-slate-300 whitespace-nowrap">
                          {p.businessNo || "-"}
                        </td>
                        <td className="py-2 px-3 text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                          {p.ceoName || "-"}
                        </td>
                        <td className="py-2 px-3 font-semibold whitespace-nowrap">
                          <span className="flex items-center gap-1 text-[#1d4ed8] dark:text-blue-300">
                            <UserCheck className="w-3 h-3 text-[#1d4ed8] dark:text-blue-400" />
                            {p.managerName || "미지정"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#334155] dark:text-slate-300 font-medium whitespace-nowrap">
                          {p.statementClosingDay}
                        </td>
                        <td className="py-2 px-3 text-[#334155] dark:text-slate-300 font-medium whitespace-nowrap">
                          {p.taxInvoiceClosingDay}
                        </td>
                        <td className="py-2 px-3 font-mono text-[#b45309] dark:text-amber-300 font-bold whitespace-nowrap">
                          {p.paymentDueDay}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 font-mono text-[11px] text-[#0f172a] dark:text-slate-300 bg-[#e2dbcd] dark:bg-slate-800 px-2 py-0.5 rounded border border-[#b5a894] dark:border-slate-700">
                            <CreditCard className="w-3 h-3 text-[#047857] dark:text-emerald-400" />
                            <span>{formatErpNumber(p.contactCount || 0)}명</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {(() => {
                            const blockInfo = getPartnerTradeBlockInfo(p);
                            return (
                              <div className="inline-flex items-center gap-1 whitespace-nowrap">
                                <span
                                  title={blockInfo.reason || undefined}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                                    blockInfo.blocked
                                      ? "bg-[#fee2e2] text-[#991b1b] border border-[#f87171] dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                                      : p.status === "ACTIVE"
                                      ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                                      : "bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                  }`}
                                >
                                  {blockInfo.blocked ? blockInfo.badgeText : p.status === "ACTIVE" ? "정상" : "휴면"}
                                </span>
                                {p.ntsBizState === "ACTIVE" && (
                                  <span
                                    title={p.ntsStatusMsg || p.ntsTaxType || "국세청 계속사업자"}
                                    className="px-1 py-0.5 rounded text-[9px] font-semibold bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] whitespace-nowrap"
                                  >
                                    계속
                                  </span>
                                )}
                                {p.ntsBizState === "UNREGISTERED" && (
                                  <span
                                    title={p.ntsStatusMsg || "국세청 미등록"}
                                    className="px-1 py-0.5 rounded text-[9px] font-semibold bg-[#fef3c7] text-[#92400e] border border-[#fde68a] whitespace-nowrap"
                                  >
                                    미등록
                                  </span>
                                )}
                              </div>
                            );
                          })()}
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
