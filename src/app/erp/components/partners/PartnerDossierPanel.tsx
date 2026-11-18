"use client";

import React from "react";
import { getNtsBizStateBadgeLabel, getPartnerTradeBlockInfo, isPartnerTradeBlocked } from "@/lib/partnerStatusClient";
import { Ban, Building2, Clock, Copy, CreditCard, Download, Edit2, Eye, FileCheck, FileText, Image as ImageIcon, Landmark, Mail, Phone, Plus, ShieldAlert, Trash2, Upload, UserCheck } from "lucide-react";
import { type ActiveDocumentViewer, type Partner, type PartnerContact } from "./partnerTypes";

export interface PartnerDossierPanelProps {
  contactsLoading: boolean;
  docFetching: boolean;
  dossierBizCertInputRef: React.RefObject<HTMLInputElement | null>;
  dossierBizCertSaving: boolean;
  dossierContractInputRef: React.RefObject<HTMLInputElement | null>;
  dossierContractSaving: boolean;
  dossierMainEmail: string;
  dossierSubEmail: string;
  editingDossierEmail: boolean;
  handleDeleteContact: (id: number, name: string) => Promise<void>;
  handleDeletePartner: (id: number, name: string) => Promise<void>;
  handleDossierBizCertDelete: () => Promise<void>;
  handleDossierBizCertUpload: (file: File) => Promise<void>;
  handleDossierContractDelete: () => Promise<void>;
  handleDossierContractUpload: (file: File) => Promise<void>;
  handleOpenPartnerDoc: (p: Partner, docType: "BIZ_CERT" | "BANK_COPY" | "CONTRACT", mode?: "VIEW" | "DOWNLOAD") => Promise<void>;
  handleRunSingleNtsCheck: (partner: Partner, autoUnblockActive?: boolean) => Promise<void>;
  handleSaveDossierEmail: () => Promise<void>;
  isAdmin: boolean;
  isDossierBizCertDragging: boolean;
  isDossierContractDragging: boolean;
  openCreateContactModal: () => void;
  openEditContactModal: (c: PartnerContact) => void;
  openEditModal: (p: Partner) => Promise<void>;
  partnerContacts: PartnerContact[];
  savingDossierEmail: boolean;
  selectedPartner: Partner;
  setActiveDocument: React.Dispatch<React.SetStateAction<ActiveDocumentViewer | null>>;
  setDossierMainEmail: React.Dispatch<React.SetStateAction<string>>;
  setDossierSubEmail: React.Dispatch<React.SetStateAction<string>>;
  setEditingDossierEmail: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDossierBizCertDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDossierContractDragging: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (text: string, type?: "success" | "error") => void;
  singleNtsCheckingId: number | null;
}

export const PartnerDossierPanel: React.FC<PartnerDossierPanelProps> = ({
  contactsLoading,
  docFetching,
  dossierBizCertInputRef,
  dossierBizCertSaving,
  dossierContractInputRef,
  dossierContractSaving,
  dossierMainEmail,
  dossierSubEmail,
  editingDossierEmail,
  handleDeleteContact,
  handleDeletePartner,
  handleDossierBizCertDelete,
  handleDossierBizCertUpload,
  handleDossierContractDelete,
  handleDossierContractUpload,
  handleOpenPartnerDoc,
  handleRunSingleNtsCheck,
  handleSaveDossierEmail,
  isAdmin,
  isDossierBizCertDragging,
  isDossierContractDragging,
  openCreateContactModal,
  openEditContactModal,
  openEditModal,
  partnerContacts,
  savingDossierEmail,
  selectedPartner,
  setActiveDocument,
  setDossierMainEmail,
  setDossierSubEmail,
  setEditingDossierEmail,
  setIsDossierBizCertDragging,
  setIsDossierContractDragging,
  showToast,
  singleNtsCheckingId,
}) => {
  return (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Dossier Header */}
              <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] flex items-center justify-between shrink-0 dark:bg-slate-800/80 dark:border-slate-700">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400">
                      {selectedPartner.partnerCode}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        selectedPartner.partnerType === "CUSTOMER"
                          ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]"
                          : selectedPartner.partnerType === "VENDOR"
                          ? "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                          : "bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff]"
                      }`}
                    >
                      {selectedPartner.partnerType === "CUSTOMER" ? "고객사" : selectedPartner.partnerType === "VENDOR" ? "매입거래처" : "겸용"}
                    </span>
                    {isPartnerTradeBlocked(selectedPartner) && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#fee2e2] text-[#991b1b] border border-[#f87171] flex items-center gap-1 whitespace-nowrap">
                        <Ban className="w-2.5 h-2.5" />
                        <span>{getPartnerTradeBlockInfo(selectedPartner).badgeText}</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[#0f172a] truncate dark:text-slate-100">
                    {selectedPartner.name}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(selectedPartner)}
                    className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    title="거래처 수정"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeletePartner(selectedPartner.id, selectedPartner.name)}
                      className="p-1.5 bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] rounded border border-[#f87171] transition dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                      title="거래처 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dossier Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* 1. 본사 관리 핵심 속성 */}
                <div className="bg-[#f4efe4] p-3 rounded border border-[#b5a894] space-y-2 dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>본사 관리 및 정산 마감 조건</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-[#ebe5d8] rounded border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800">
                      <span className="text-[10px] text-[#475569] dark:text-slate-500 block mb-0.5">본사의 담당직원</span>
                      <strong className="text-[#0f172a] dark:text-slate-200 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-[#1d4ed8] dark:text-blue-400" />
                        {selectedPartner.managerName || "미배정"}
                      </strong>
                    </div>

                    <div className="p-2 bg-[#ebe5d8] rounded border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800">
                      <span className="text-[10px] text-[#475569] dark:text-slate-500 block mb-0.5">거래명세서 마감일</span>
                      <strong className="text-[#0f172a] dark:text-slate-200 font-mono">
                        {selectedPartner.statementClosingDay}
                      </strong>
                    </div>

                    <div className="p-2 bg-[#ebe5d8] rounded border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800">
                      <span className="text-[10px] text-[#475569] dark:text-slate-500 block mb-0.5">세금계산서 마감일</span>
                      <strong className="text-[#0f172a] dark:text-slate-200 font-mono">
                        {selectedPartner.taxInvoiceClosingDay}
                      </strong>
                    </div>

                    <div className="p-2 bg-[#ebe5d8] rounded border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800">
                      <span className="text-[10px] text-[#475569] dark:text-slate-500 block mb-0.5">약정납기일 (결제일)</span>
                      <strong className="text-[#b45309] dark:text-amber-300 font-mono font-bold">
                        {selectedPartner.paymentDueDay}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 2. 본사 기본 제원 및 주소 */}
                <div className="bg-[#f4efe4] p-3 rounded border border-[#b5a894] space-y-1.5 text-xs dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-[#475569] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>본사 사업자 기본 제원</span>
                  </span>

                  <div className="flex justify-between items-center py-1 border-b border-[#c4b6a0] dark:border-slate-800 gap-2">
                    <span className="text-[#475569] dark:text-slate-500 whitespace-nowrap">사업자등록번호</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                        {selectedPartner.businessNo || "-"}
                      </span>
                      <button
                        type="button"
                        disabled={singleNtsCheckingId === selectedPartner.id || !selectedPartner.businessNo}
                        onClick={() => handleRunSingleNtsCheck(selectedPartner)}
                        className="px-1.5 py-0.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] disabled:opacity-40 text-[#0f172a] rounded border border-[#b5a894] text-[10px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      >
                        <ShieldAlert className="w-3 h-3 text-[#991b1b]" />
                        <span>{singleNtsCheckingId === selectedPartner.id ? "조회중" : "휴폐업 조회"}</span>
                      </button>
                    </div>
                  </div>

                  {(selectedPartner.ntsBizState || selectedPartner.ntsStatusMsg) && (
                    <div className="flex justify-between items-center py-1 border-b border-[#c4b6a0] dark:border-slate-800 gap-2">
                      <span className="text-[#475569] dark:text-slate-500 whitespace-nowrap">국세청 상태</span>
                      <div className="flex items-center gap-1.5 min-w-0 justify-end">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                            selectedPartner.ntsBizState === "CLOSED" || selectedPartner.ntsBizState === "SUSPENDED"
                              ? "bg-[#fee2e2] text-[#991b1b] border border-[#f87171]"
                              : selectedPartner.ntsBizState === "ACTIVE"
                              ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
                              : "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                          }`}
                        >
                          {getNtsBizStateBadgeLabel(selectedPartner.ntsBizState)}
                        </span>
                        {selectedPartner.ntsTaxType && (
                          <span className="text-[11px] text-[#334155] dark:text-slate-300 truncate">
                            {selectedPartner.ntsTaxType}
                          </span>
                        )}
                        {selectedPartner.ntsClosedDate && (
                          <span className="text-[10px] font-mono text-[#991b1b] font-bold whitespace-nowrap">
                            {selectedPartner.ntsClosedDate}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedPartner.corporateNo && (
                    <div className="flex justify-between py-1 border-b border-[#c4b6a0] dark:border-slate-800">
                      <span className="text-[#475569] dark:text-slate-500">법인등록번호</span>
                      <span className="font-mono text-[#0f172a] dark:text-slate-200">{selectedPartner.corporateNo}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 border-b border-[#c4b6a0] dark:border-slate-800">
                    <span className="text-[#475569] dark:text-slate-500">대표자 성명</span>
                    <span className="font-semibold text-[#0f172a] dark:text-slate-200">{selectedPartner.ceoName || "-"}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#c4b6a0] dark:border-slate-800">
                    <span className="text-[#475569] dark:text-slate-500">업태 / 종목</span>
                    <span className="text-[#0f172a] dark:text-slate-200 text-right truncate max-w-xs">
                      {selectedPartner.bizType || "-"} / {selectedPartner.bizItem || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#c4b6a0] dark:border-slate-800">
                    <span className="text-[#475569] dark:text-slate-500">본사 사업장 소재지</span>
                    <span className="text-[#0f172a] dark:text-slate-200 text-right truncate max-w-xs" title={`${selectedPartner.address || ""} ${selectedPartner.addressDetail || ""}`.trim()}>
                      {`${selectedPartner.address || ""} ${selectedPartner.addressDetail || ""}`.trim() || "-"}
                    </span>
                  </div>

                  <div className="py-1.5 border-b border-[#c4b6a0] dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#475569] dark:text-slate-500 flex items-center gap-1 whitespace-nowrap">
                        <Mail className="w-3 h-3 text-[#1d4ed8]" />
                        <span>세금계산서 수신 이메일</span>
                      </span>
                      {!editingDossierEmail && (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="text-right truncate max-w-[200px]">
                            <span className="font-mono font-bold text-[#1d4ed8] dark:text-blue-300 block truncate">
                              {selectedPartner.mainEmail || "미등록"}
                            </span>
                            {selectedPartner.subEmail && (
                              <span className="font-mono text-[10px] text-[#475569] dark:text-slate-400 block truncate">
                                부: {selectedPartner.subEmail}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setDossierMainEmail(selectedPartner.mainEmail || "");
                              setDossierSubEmail(selectedPartner.subEmail || "");
                              setEditingDossierEmail(true);
                            }}
                            className="px-1.5 py-0.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[10px] font-bold shrink-0 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                          >
                            {selectedPartner.mainEmail ? "변경" : "이메일 등록"}
                          </button>
                        </div>
                      )}
                    </div>

                    {editingDossierEmail && (
                      <div className="p-2 bg-[#ebe5d8] rounded border border-[#b5a894] space-y-1.5 dark:bg-slate-950 dark:border-slate-700">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-[#334155] dark:text-slate-400">
                            이메일 1 (주 수신 - 세금계산서 발송 기본)
                          </label>
                          <input
                            type="email"
                            value={dossierMainEmail}
                            onChange={(e) => setDossierMainEmail(e.target.value)}
                            placeholder="tax@company.co.kr"
                            className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[#0f172a] font-mono text-xs focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-[#334155] dark:text-slate-400">
                            이메일 2 (부 수신 - 선택)
                          </label>
                          <input
                            type="email"
                            value={dossierSubEmail}
                            onChange={(e) => setDossierSubEmail(e.target.value)}
                            placeholder="sub@company.co.kr"
                            className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[#0f172a] font-mono text-xs focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            disabled={savingDossierEmail}
                            onClick={() => setEditingDossierEmail(false)}
                            className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] font-bold"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            disabled={savingDossierEmail}
                            onClick={handleSaveDossierEmail}
                            className="px-2.5 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-[11px] font-bold"
                          >
                            {savingDossierEmail ? "저장 중..." : "저장 (계약 동기화)"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-[#475569] dark:text-slate-500">본사 대표 전화</span>
                    <span className="font-mono text-[#0f172a] dark:text-slate-200">{selectedPartner.mainPhone || "-"}</span>
                  </div>
                </div>

                {/* 3. 사업자등록증 원본 보관함 (브라우저 파일 선택 + 드래그앤드롭 + 파일보기/정보수정 직결) */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isDossierBizCertDragging) setIsDossierBizCertDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setIsDossierBizCertDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDossierBizCertDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleDossierBizCertUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`p-3 rounded border space-y-2 text-xs transition ${
                    isDossierBizCertDragging
                      ? "bg-[#f5f3ff] border-[#6d28d9] border-2 border-dashed dark:bg-purple-950/30"
                      : "bg-[#f4efe4] border-[#b5a894] dark:bg-slate-900 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#6d28d9] dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>사업자등록증 원본 서류</span>
                    </span>

                    {selectedPartner.hasBizCert || selectedPartner.bizCertFileUrl ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#f5f3ff] text-[#6d28d9] border border-[#ddd6fe] font-bold whitespace-nowrap">
                        보관 완료
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#e2dbcd] text-[#475569] whitespace-nowrap">
                        미등록
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={dossierBizCertInputRef}
                    accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDossierBizCertUpload(file);
                      e.target.value = "";
                    }}
                  />

                  {selectedPartner.hasBizCert || selectedPartner.bizCertFileUrl ? (
                    <div className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] flex items-center justify-between gap-2 dark:bg-slate-900 dark:border-slate-800">
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <FileText className="w-4 h-4 text-[#6d28d9] dark:text-purple-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block truncate">
                            {selectedPartner.bizCertFileName || "사업자등록증"}
                          </span>
                          <span className="text-[10px] text-[#475569] dark:text-slate-500 font-mono">
                            {dossierBizCertSaving ? "저장 중..." : "파일 드롭으로 교체 가능"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={docFetching || dossierBizCertSaving}
                          onClick={() => handleOpenPartnerDoc(selectedPartner, "BIZ_CERT", "VIEW")}
                          className="px-2 py-1 bg-[#6d28d9] hover:bg-[#5b21b6] text-white rounded text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                          title="사업자등록증 원본 보기 및 고객정보 수정"
                        >
                          <Eye className="w-3 h-3" />
                          <span>파일보기·정보수정</span>
                        </button>
                        <button
                          type="button"
                          disabled={docFetching || dossierBizCertSaving}
                          onClick={() => handleOpenPartnerDoc(selectedPartner, "BIZ_CERT", "DOWNLOAD")}
                          className="p-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          title="다운로드"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={dossierBizCertSaving}
                          onClick={() => dossierBizCertInputRef.current?.click()}
                          className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 whitespace-nowrap dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          title="파일 선택"
                        >
                          <Upload className="w-3 h-3" />
                          <span>변경</span>
                        </button>
                        <button
                          type="button"
                          disabled={dossierBizCertSaving}
                          onClick={handleDossierBizCertDelete}
                          className="p-1 bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] rounded border border-[#f87171] transition"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => dossierBizCertInputRef.current?.click()}
                      className="p-3 bg-[#ebe5d8] hover:bg-[#e2dbcd] rounded border border-dashed border-[#b5a894] text-center cursor-pointer transition dark:bg-slate-900 dark:border-slate-800"
                    >
                      <p className="text-[11px] text-[#475569] dark:text-slate-500 mb-2">
                        {dossierBizCertSaving ? "사업자등록증 업로드 중..." : "파일을 드래그하거나 탐색기에서 선택"}
                      </p>
                      <button
                        type="button"
                        disabled={dossierBizCertSaving}
                        onClick={(e) => {
                          e.stopPropagation();
                          dossierBizCertInputRef.current?.click();
                        }}
                        className="px-2.5 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] inline-flex items-center gap-1 whitespace-nowrap dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        <Upload className="w-3 h-3" />
                        <span>파일 선택</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3-2. 매출처 계약서 원본 보관함 (PDF 즉시 업로드/미리보기/다운로드/삭제) */}
                <div className="bg-[#f4efe4] p-3 rounded border border-[#b5a894] space-y-2 text-xs dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>계약서 원본 서류 (PDF)</span>
                    </span>

                    {selectedPartner.hasContractFile || selectedPartner.contractFileUrl ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] font-bold">
                        보관 완료
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#e2dbcd] text-[#475569]">
                        미등록
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={dossierContractInputRef}
                    accept="application/pdf,.pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDossierContractUpload(file);
                      e.target.value = "";
                    }}
                  />

                  {selectedPartner.hasContractFile || selectedPartner.contractFileUrl ? (
                    <div className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] flex items-center justify-between gap-2 dark:bg-slate-900 dark:border-slate-800">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block truncate">
                            {selectedPartner.contractFileName || `${selectedPartner.name}_계약서.pdf`}
                          </span>
                          <span className="text-[10px] text-[#475569] dark:text-slate-500 font-mono">
                            계약서 원본 파일 보관됨
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={docFetching || dossierContractSaving}
                          onClick={() => handleOpenPartnerDoc(selectedPartner, "CONTRACT", "VIEW")}
                          className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        >
                          <Eye className="w-3 h-3" />
                          <span>미리보기</span>
                        </button>
                        <button
                          type="button"
                          disabled={docFetching || dossierContractSaving}
                          onClick={() => handleOpenPartnerDoc(selectedPartner, "CONTRACT", "DOWNLOAD")}
                          className="p-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          title="다운로드"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={dossierContractSaving}
                          onClick={() => dossierContractInputRef.current?.click()}
                          className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          title="계약서 파일 교체"
                        >
                          <Upload className="w-3 h-3" />
                          <span>변경</span>
                        </button>
                        <button
                          type="button"
                          disabled={dossierContractSaving}
                          onClick={handleDossierContractDelete}
                          className="p-1 bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] rounded border border-[#f87171]"
                          title="계약서 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => !dossierContractSaving && dossierContractInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDossierContractDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDossierContractDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDossierContractDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleDossierContractUpload(file);
                      }}
                      className={`p-3 rounded border border-dashed text-center cursor-pointer transition ${
                        isDossierContractDragging
                          ? "border-[#1d4ed8] bg-[#dbeafe] dark:bg-blue-950/40"
                          : "border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] dark:bg-slate-900 dark:border-slate-800"
                      }`}
                    >
                      <p className="text-[11px] text-[#475569] dark:text-slate-400 mb-2">
                        {dossierContractSaving
                          ? "계약서 PDF 파일을 저장하는 중..."
                          : "계약서 PDF 파일을 드래그하여 놓거나 버튼을 눌러 업로드하세요."}
                      </p>
                      <span className="px-2.5 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-[11px] font-bold inline-flex items-center gap-1 shadow-xs">
                        <Upload className="w-3 h-3" />
                        <span>{dossierContractSaving ? "저장 중..." : "계약서 PDF 업로드"}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* 4. 대금 지급 계좌 및 통장사본 보관함 */}
                <div className="bg-[#f4efe4] p-3 rounded border border-[#b5a894] space-y-2 text-xs dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#047857] dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" />
                      <span>대금 지급 계좌 및 통장사본</span>
                    </span>

                    {selectedPartner.hasBankCopy || selectedPartner.bankCopyFileUrl ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] font-bold">
                        통장사본 보관됨
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#e2dbcd] text-[#475569]">
                        통장사본 미등록
                      </span>
                    )}
                  </div>

                  {/* 계좌 제원 요약 */}
                  <div className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] space-y-1.5 dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex justify-between items-center py-0.5 border-b border-[#c4b6a0] dark:border-slate-800">
                      <span className="text-[#475569] dark:text-slate-400">지급 은행</span>
                      <strong className="text-[#0f172a] dark:text-slate-200">
                        {selectedPartner.bankName || "-"}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center py-0.5 border-b border-[#c4b6a0] dark:border-slate-800">
                      <span className="text-[#475569] dark:text-slate-400">계좌번호</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <strong className="text-[#1d4ed8] dark:text-blue-400 font-bold">
                          {selectedPartner.bankAccountNo || "-"}
                        </strong>
                        {selectedPartner.bankAccountNo && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedPartner.bankAccountNo!);
                              showToast("계좌번호가 클립보드에 복사되었습니다.");
                            }}
                            className="p-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[10px] flex items-center gap-0.5 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                            title="계좌번호 복사"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            <span>복사</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[#475569] dark:text-slate-400">예금주</span>
                      <strong className="text-[#0f172a] dark:text-slate-200">
                        {selectedPartner.bankAccountHolder || "-"}
                      </strong>
                    </div>
                  </div>

                  {/* 통장사본 첨부 파일 */}
                  {selectedPartner.hasBankCopy || selectedPartner.bankCopyFileUrl ? (
                    <div className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
                      <div className="flex items-center gap-2 truncate">
                        <Landmark className="w-4 h-4 text-[#047857] dark:text-emerald-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block truncate">
                            {selectedPartner.bankCopyFileName || `${selectedPartner.bankName || "은행"}_통장사본`}
                          </span>
                          <span className="text-[10px] text-[#475569] dark:text-slate-500 font-mono">
                            대금 지급용 통장사본 서류
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={docFetching}
                          onClick={() => handleOpenPartnerDoc(selectedPartner, "BANK_COPY", "VIEW")}
                          className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        >
                          <Eye className="w-3 h-3" />
                          <span>미리보기</span>
                        </button>
                        <button
                          type="button"
                          disabled={docFetching}
                          onClick={() => handleOpenPartnerDoc(selectedPartner, "BANK_COPY", "DOWNLOAD")}
                          className="p-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          title="다운로드"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-[#ebe5d8] rounded border border-dashed border-[#b5a894] text-center dark:bg-slate-900 dark:border-slate-800">
                      <p className="text-[11px] text-[#475569] dark:text-slate-500 mb-1.5">
                        등록된 통장사본 파일이 없습니다.
                      </p>
                      <button
                        type="button"
                        onClick={() => openEditModal(selectedPartner)}
                        className="px-2.5 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] inline-flex items-center gap-1 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        <Upload className="w-3 h-3" />
                        <span>통장사본 등록하기</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. 거래처 담당자 및 실물 명함 보관함 */}
                <div className="bg-[#f4efe4] p-3 rounded border border-[#b5a894] space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#047857] dark:text-emerald-400" />
                      <span className="text-[11px] font-bold text-[#047857] dark:text-emerald-400 uppercase tracking-wider">
                        거래처 담당자 및 명함 ({partnerContacts.length}명)
                      </span>
                    </div>

                    <button
                      onClick={openCreateContactModal}
                      className="px-2 py-1 bg-[#047857] hover:bg-[#065f46] text-white rounded text-[11px] font-bold flex items-center gap-1 shadow transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>명함·담당자 추가</span>
                    </button>
                  </div>

                  {contactsLoading ? (
                    <div className="p-4 text-center text-[#475569] text-xs">
                      담당자 정보를 불러오는 중...
                    </div>
                  ) : partnerContacts.length === 0 ? (
                    <div className="p-4 bg-[#ebe5d8] rounded border border-[#b5a894] text-center text-[#475569] text-xs dark:bg-slate-900 dark:border-slate-800">
                      등록된 거래처 담당자가 없습니다. 상단 버튼으로 명함을 등록하세요.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {partnerContacts.map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] flex flex-col gap-1.5 dark:bg-slate-900 dark:border-slate-800"
                        >
                          {/* Contact Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#0f172a] dark:text-slate-100">
                                {c.name}
                              </span>
                              {(c.position || c.department) && (
                                <span className="text-[11px] text-[#475569] dark:text-slate-400">
                                  {c.department ? `${c.department} ` : ""}{c.position || ""}
                                </span>
                              )}
                              {c.isPrimary && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]">
                                  대표담당
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditContactModal(c)}
                                className="p-1 hover:bg-[#dcd4c4] text-[#475569] rounded dark:hover:bg-slate-800 dark:text-slate-400"
                                title="수정"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteContact(c.id, c.name)}
                                className="p-1 hover:bg-[#fee2e2] text-[#b91c1c] rounded"
                                title="삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Contact Details */}
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-[#334155] dark:text-slate-300 font-mono">
                            {c.mobile && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Phone className="w-3 h-3 text-[#047857] shrink-0" />
                                <span className="truncate">{c.mobile}</span>
                              </div>
                            )}
                            {c.email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="w-3 h-3 text-[#1d4ed8] shrink-0" />
                                <span className="truncate">{c.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Business Card Preview Box */}
                          {c.businessCardFrontUrl && (
                            <div className="mt-1 pt-1.5 border-t border-[#c4b6a0] dark:border-slate-800 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-[#6d28d9]" />
                                <span className="text-[10px] text-[#475569] font-semibold">
                                  실물 명함 사진 첨부됨
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (c.businessCardFrontUrl) {
                                    setActiveDocument({
                                      title: `${c.name} ${c.position || "담당자"} 명함`,
                                      partnerName: selectedPartner.name,
                                      url: c.businessCardFrontUrl,
                                      fileName: `${selectedPartner.name}_${c.name}_명함.png`,
                                    });
                                  }
                                }}
                                className="px-2 py-0.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#6d28d9] rounded border border-[#b5a894] text-[10px] flex items-center gap-1 font-semibold dark:bg-slate-800 dark:border-slate-700"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                <span>명함 확대보기</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. 비고 */}
                {selectedPartner.memo && (
                  <div className="bg-[#f4efe4] p-3 rounded border border-[#b5a894] text-xs dark:bg-slate-900 dark:border-slate-800">
                    <span className="text-[10px] text-[#475569] block mb-1">비고 및 특이사항</span>
                    <p className="text-[#334155] dark:text-slate-300 whitespace-pre-wrap">{selectedPartner.memo}</p>
                  </div>
                )}
              </div>
            </div>
  );
};
