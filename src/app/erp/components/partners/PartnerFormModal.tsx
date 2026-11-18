"use client";

import React from "react";
import { Building2, Check, Eye, FileCheck, FileText, FileUp, Landmark, RefreshCw, Sparkles, Upload, X } from "lucide-react";
import { isPdfDocument } from "./partnerPdfUtils";
import { getNtsBizStateBadgeLabel } from "@/lib/partnerStatusClient";
import { KOREAN_BANKS, type ActiveDocumentViewer } from "./partnerTypes";

export interface PartnerFormModalProps {
  bankCopyInputRef: React.RefObject<HTMLInputElement | null>;
  bankOcrLoading: boolean;
  directBizCertInputRef: React.RefObject<HTMLInputElement | null>;
  directBizCertOcrLoading: boolean;
  directBizCertSuggestion: any;
  directContractInputRef: React.RefObject<HTMLInputElement | null>;
  employees: any[];
  formNtsChecking: boolean;
  handleApplyDirectBizCertSuggestion: () => void;
  handleBankCopyFileUpload: (file: File) => Promise<void>;
  handleDirectBizCertUpload: (file: File) => Promise<void>;
  handleDirectContractUpload: (file: File) => Promise<void>;
  handleFormCheckNtsStatus: () => Promise<void>;
  handlePartnerFormReRunOcr: () => Promise<void>;
  handleReRunBankOcr: () => Promise<void>;
  handleSavePartner: (e: React.FormEvent) => Promise<void>;
  isBankCopyDragging: boolean;
  isDirectBizCertDragging: boolean;
  isDirectContractDragging: boolean;
  partnerForm: any;
  partnerModalMode: "CREATE" | "EDIT";
  setActiveDocument: React.Dispatch<React.SetStateAction<ActiveDocumentViewer | null>>;
  setDirectBizCertSuggestion: React.Dispatch<any>;
  setIsBankCopyDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDirectBizCertDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDirectContractDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setPartnerForm: React.Dispatch<any>;
  setShowPartnerModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PartnerFormModal: React.FC<PartnerFormModalProps> = ({
  bankCopyInputRef,
  bankOcrLoading,
  directBizCertInputRef,
  directBizCertOcrLoading,
  directBizCertSuggestion,
  directContractInputRef,
  employees,
  formNtsChecking,
  handleApplyDirectBizCertSuggestion,
  handleBankCopyFileUpload,
  handleDirectBizCertUpload,
  handleDirectContractUpload,
  handleFormCheckNtsStatus,
  handlePartnerFormReRunOcr,
  handleReRunBankOcr,
  handleSavePartner,
  isBankCopyDragging,
  isDirectBizCertDragging,
  isDirectContractDragging,
  partnerForm,
  partnerModalMode,
  setActiveDocument,
  setDirectBizCertSuggestion,
  setIsBankCopyDragging,
  setIsDirectBizCertDragging,
  setIsDirectContractDragging,
  setPartnerForm,
  setShowPartnerModal,
}) => {
  return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] text-[#0f172a] rounded-lg p-5 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
            {/* Modal Header */}
            <div className="pb-3 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1d4ed8]" />
                <span>
                  {partnerModalMode === "CREATE"
                    ? partnerForm.partnerType === "VENDOR" ? "신규 매입거래처 등록" : "신규 거래처 등록"
                    : `거래처 정보 수정 (${partnerForm.name})`}
                </span>
              </h2>
              <button
                onClick={() => setShowPartnerModal(false)}
                className="text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSavePartner} className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs">
              {/* 최상단: 사업자등록증 첨부 (파일 선택 탐색기 + 드래그앤드롭 + 자동인식) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isDirectBizCertDragging) setIsDirectBizCertDragging(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isDirectBizCertDragging) setIsDirectBizCertDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setIsDirectBizCertDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDirectBizCertDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleDirectBizCertUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`p-3 rounded-lg border space-y-2 transition ${
                  isDirectBizCertDragging
                    ? "bg-[#f5f3ff] border-2 border-dashed border-[#6d28d9] dark:bg-purple-950/40"
                    : "bg-[#e2dbcd] border-[#b5a894] dark:bg-slate-900 dark:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between pb-1 border-b border-[#b5a894] dark:border-slate-700">
                  <span className="text-xs font-bold text-[#6d28d9] dark:text-purple-400 flex items-center gap-1.5 whitespace-nowrap">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>사업자등록증 첨부</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {directBizCertOcrLoading && (
                      <span className="text-[11px] font-bold text-[#6d28d9] flex items-center gap-1 whitespace-nowrap">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>판독중</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => directBizCertInputRef.current?.click()}
                      className="px-2.5 py-1 bg-[#6d28d9] hover:bg-[#5b21b6] text-white rounded text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Upload className="w-3 h-3" />
                      <span>파일 선택</span>
                    </button>
                  </div>
                </div>

                <input
                  type="file"
                  ref={directBizCertInputRef}
                  accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleDirectBizCertUpload(e.target.files[0]);
                    }
                    e.target.value = "";
                  }}
                />

                {partnerForm.bizCertFileUrl && partnerForm.bizCertFileUrl !== "__DELETE__" ? (
                  <div className="p-2.5 bg-[#f4efe4] rounded border border-[#b5a894] flex flex-wrap items-center justify-between gap-2 dark:bg-slate-950 dark:border-slate-700">
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <FileText className="w-4 h-4 text-[#6d28d9] shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 block truncate">
                          {partnerForm.bizCertFileName || "사업자등록증"}
                        </span>
                        <span className="text-[10px] text-[#475569] dark:text-slate-400 font-mono">
                          {isPdfDocument(partnerForm.bizCertFileUrl, partnerForm.bizCertFileName) ? "PDF 문서" : "이미지 파일"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={directBizCertOcrLoading}
                        onClick={handlePartnerFormReRunOcr}
                        className="px-2 py-1 bg-[#047857] hover:bg-[#065f46] disabled:opacity-50 text-white rounded text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>OCR 판독</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDocument({
                            title: "사업자등록증 원본",
                            partnerName: partnerForm.name || "거래처",
                            url: partnerForm.bizCertFileUrl,
                            fileName: partnerForm.bizCertFileName || "사업자등록증",
                            partnerId: partnerModalMode === "EDIT" && partnerForm.id ? partnerForm.id : undefined,
                            docType: "BIZ_CERT",
                          });
                        }}
                        className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 whitespace-nowrap dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        <Eye className="w-3 h-3" />
                        <span>원본 보기</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => directBizCertInputRef.current?.click()}
                        className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 whitespace-nowrap dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        <Upload className="w-3 h-3" />
                        <span>파일 변경</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDirectBizCertSuggestion(null);
                          setPartnerForm({ ...partnerForm, bizCertFileUrl: "__DELETE__", bizCertFileName: "", hasBizCert: false });
                        }}
                        className="p-1 bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] rounded border border-[#f87171] transition"
                        title="삭제"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => directBizCertInputRef.current?.click()}
                    className="p-3 border-2 border-dashed border-[#b5a894] bg-[#f4efe4] hover:bg-[#ebe5d8] rounded text-center cursor-pointer transition dark:border-slate-700 dark:bg-slate-950"
                  >
                    <FileUp className="w-5 h-5 mx-auto mb-1 text-[#6d28d9] dark:text-purple-400" />
                    <p className="text-xs font-semibold text-[#0f172a] dark:text-slate-200">
                      사업자등록증 파일을 드래그하여 놓거나 클릭하여 파일 선택
                    </p>
                    <p className="text-[10px] text-[#475569] dark:text-slate-400 font-mono mt-0.5">
                      PDF / JPG / PNG 지원 · 첨부 시 사업자 정보 자동 인식 및 국세청 휴폐업 확인
                    </p>
                  </div>
                )}

                {directBizCertSuggestion && (
                  <div className="p-2 bg-[#f4efe4] border border-[#b5a894] rounded flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <Check className="w-3.5 h-3.5 text-[#047857] shrink-0" />
                      <span className="font-semibold text-[#0f172a] truncate">
                        추출 정보: {directBizCertSuggestion.name || "-"} / {directBizCertSuggestion.businessNo || "-"} / {directBizCertSuggestion.ceoName || "-"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyDirectBizCertSuggestion}
                      className="px-2 py-0.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded font-bold whitespace-nowrap shrink-0"
                    >
                      인식값 반영
                    </button>
                  </div>
                )}
              </div>

              {/* 구분 & 코드 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">거래처 구분 *</label>
                  <select
                    value={partnerForm.partnerType}
                    onChange={(e) => setPartnerForm({ ...partnerForm, partnerType: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  >
                    <option value="CUSTOMER">고객 (매출처)</option>
                    <option value="VENDOR">매입거래처 (공급처)</option>
                    <option value="BOTH">고객 및 매입거래처 겸용</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">거래처 코드 (미입력 시 자동 채번)</label>
                  <input
                    type="text"
                    placeholder="예: CUST-2026-001"
                    value={partnerForm.partnerCode}
                    onChange={(e) => setPartnerForm({ ...partnerForm, partnerCode: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* 상호 & 사업자번호 & 대표자 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">상호명 (법인명) *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: (주)한국알피에이"
                    value={partnerForm.name}
                    onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-bold focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold whitespace-nowrap">사업자등록번호</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="000-00-00000"
                      value={partnerForm.businessNo}
                      onChange={(e) => setPartnerForm({ ...partnerForm, businessNo: e.target.value })}
                      className="min-w-0 flex-1 bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    />
                    <button
                      type="button"
                      disabled={formNtsChecking}
                      onClick={handleFormCheckNtsStatus}
                      className="px-2 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] disabled:opacity-50 text-[#0f172a] rounded border border-[#b5a894] text-[10px] font-bold whitespace-nowrap shrink-0 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      title="국세청 휴폐업 조회"
                    >
                      {formNtsChecking ? "조회중" : "휴폐업"}
                    </button>
                  </div>
                  {partnerForm.ntsBizState && (
                    <span
                      className={`text-[10px] font-bold whitespace-nowrap ${
                        partnerForm.ntsBizState === "CLOSED" || partnerForm.ntsBizState === "SUSPENDED"
                          ? "text-[#b91c1c]"
                          : partnerForm.ntsBizState === "ACTIVE"
                          ? "text-[#047857]"
                          : "text-[#b45309]"
                      }`}
                    >
                      국세청: {getNtsBizStateBadgeLabel(partnerForm.ntsBizState)}
                      {partnerForm.ntsTaxType ? ` (${partnerForm.ntsTaxType})` : ""}
                      {partnerForm.ntsClosedDate ? ` · ${partnerForm.ntsClosedDate}` : ""}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">대표자 성명</label>
                  <input
                    type="text"
                    placeholder="홍길동"
                    value={partnerForm.ceoName}
                    onChange={(e) => setPartnerForm({ ...partnerForm, ceoName: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* 업태 & 종목 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">업태</label>
                  <input
                    type="text"
                    placeholder="예: 정보통신업, 건설업, 도소매업"
                    value={partnerForm.bizType}
                    onChange={(e) => setPartnerForm({ ...partnerForm, bizType: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">종목</label>
                  <input
                    type="text"
                    placeholder="예: 소프트웨어 개발, 컴퓨터시설관리"
                    value={partnerForm.bizItem}
                    onChange={(e) => setPartnerForm({ ...partnerForm, bizItem: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* 본사 주소 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">본사 사업장 소재지 (기본주소)</label>
                  <input
                    type="text"
                    placeholder="예: 서울특별시 송파구 동남로11길 26-11"
                    value={partnerForm.address}
                    onChange={(e) => setPartnerForm({ ...partnerForm, address: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">상세주소</label>
                  <input
                    type="text"
                    placeholder="예: 3층 301호"
                    value={partnerForm.addressDetail}
                    onChange={(e) => setPartnerForm({ ...partnerForm, addressDetail: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* 대표 연락처 & 세금계산서 수신 이메일 (주/부) */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold whitespace-nowrap">본사 대표 전화번호</label>
                  <input
                    type="text"
                    placeholder="02-0000-0000"
                    value={partnerForm.mainPhone}
                    onChange={(e) => setPartnerForm({ ...partnerForm, mainPhone: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold whitespace-nowrap">세금계산서 이메일 1 (주 수신)</label>
                  <input
                    type="email"
                    placeholder="tax@company.co.kr"
                    value={partnerForm.mainEmail}
                    onChange={(e) => setPartnerForm({ ...partnerForm, mainEmail: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold whitespace-nowrap">세금계산서 이메일 2 (부 수신)</label>
                  <input
                    type="email"
                    placeholder="sub@company.co.kr (선택)"
                    value={partnerForm.subEmail || ""}
                    onChange={(e) => setPartnerForm({ ...partnerForm, subEmail: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* 본사 관리 및 정산 마감 조건 설정 */}
              <div className="p-3 bg-[#e2dbcd] border border-[#b5a894] rounded-lg space-y-3 dark:bg-slate-900 dark:border-slate-700">
                <span className="text-xs font-bold text-[#1d4ed8] dark:text-blue-400 block pb-1 border-b border-[#b5a894] dark:border-slate-700">
                  🏛️ 본사 관리 및 정산 약정 설정 (필수 항목)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">본사의 담당직원 *</label>
                    <select
                      value={partnerForm.managerEmployeeId}
                      onChange={(e) => {
                        const empId = e.target.value;
                        const emp = employees.find((x) => String(x.id) === empId);
                        setPartnerForm({
                          ...partnerForm,
                          managerEmployeeId: empId,
                          managerName: emp ? emp.name : "",
                        });
                      }}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] font-semibold dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    >
                      <option value="">직접 입력 또는 선택</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.department} {emp.position || ""})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">거래 상태</label>
                    <select
                      value={partnerForm.status}
                      onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    >
                      <option value="ACTIVE">정상 거래 (ACTIVE)</option>
                      <option value="BLOCKED">거래불가 (BLOCKED)</option>
                      <option value="INACTIVE">거래 중지 (INACTIVE)</option>
                      <option value="DORMANT">휴면 (DORMANT)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">거래명세서 마감일 *</label>
                    <select
                      value={partnerForm.statementClosingDay}
                      onChange={(e) => setPartnerForm({ ...partnerForm, statementClosingDay: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    >
                      <option value="매월 25일">매월 25일 (기본)</option>
                      <option value="당월말일">당월 말일</option>
                      <option value="매월 20일">매월 20일</option>
                      <option value="매월 15일">매월 15일</option>
                      <option value="수시">수시 (건별)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">세금계산서 마감일 *</label>
                    <select
                      value={partnerForm.taxInvoiceClosingDay}
                      onChange={(e) => setPartnerForm({ ...partnerForm, taxInvoiceClosingDay: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    >
                      <option value="익월 10일">익월 10일 (국세청 기본)</option>
                      <option value="당월말일">당월 말일</option>
                      <option value="매월 25일">매월 25일</option>
                      <option value="수시">수시 (건별)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">약정납기일 (결제일) *</label>
                    <select
                      value={partnerForm.paymentDueDay}
                      onChange={(e) => setPartnerForm({ ...partnerForm, paymentDueDay: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#b45309] font-bold px-2 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-amber-300"
                    >
                      <option value="익월 15일">익월 15일</option>
                      <option value="익월말일">익월 말일</option>
                      <option value="청구 후 30일">청구 후 30일</option>
                      <option value="당월 25일">당월 25일</option>
                      <option value="당월말일">당월 말일</option>
                      <option value="익익월 10일">익익월 10일</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 대금 지급 계좌 및 통장사본 (매입거래처 / 공급처) */}
              <div className="p-3 bg-[#e2dbcd] border border-[#b5a894] rounded-lg space-y-3 dark:bg-slate-900 dark:border-slate-700">
                <div className="flex items-center justify-between pb-1 border-b border-[#b5a894] dark:border-slate-700">
                  <span className="text-xs font-bold text-[#047857] dark:text-emerald-400 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>대금 지급 계좌 및 통장사본 관리 (매입거래처 필수)</span>
                  </span>
                  {partnerForm.partnerType === "CUSTOMER" && (
                    <span className="text-[10px] text-[#475569] dark:text-slate-400">
                      (고객사는 환불/정산용 계좌 필요 시 입력)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">지급 은행</label>
                    <input
                      type="text"
                      list="korean-bank-list"
                      placeholder="은행명 선택 또는 직접입력"
                      value={partnerForm.bankName || ""}
                      onChange={(e) => setPartnerForm({ ...partnerForm, bankName: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    />
                    <datalist id="korean-bank-list">
                      {KOREAN_BANKS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">계좌번호</label>
                    <input
                      type="text"
                      placeholder="000-000000-00000"
                      value={partnerForm.bankAccountNo || ""}
                      onChange={(e) => setPartnerForm({ ...partnerForm, bankAccountNo: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">예금주</label>
                    <input
                      type="text"
                      placeholder={partnerForm.name || "상호명 또는 대표자"}
                      value={partnerForm.bankAccountHolder || ""}
                      onChange={(e) => setPartnerForm({ ...partnerForm, bankAccountHolder: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Bank OCR Loading indicator */}
                {bankOcrLoading && (
                  <div className="p-2.5 bg-[#ecfdf5] border border-[#a7f3d0] rounded text-[#065f46] flex items-center justify-center gap-2 text-xs font-bold dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>통장사본 AI 판독 중... (은행명, 계좌번호, 예금주 자동 추출)</span>
                  </div>
                )}

                {/* 통장사본 드롭존 / 첨부 파일 */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold block">
                      통장사본 원본 파일 (PDF 또는 이미지)
                    </label>
                    <span className="text-[10px] text-[#047857] dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>AI OCR 자동 입력 지원</span>
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={bankCopyInputRef}
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleBankCopyFileUpload(e.target.files[0]);
                      }
                    }}
                  />

                  {partnerForm.bankCopyFileUrl && partnerForm.bankCopyFileUrl !== "__DELETE__" ? (
                    <div className="p-2.5 bg-[#f4efe4] rounded border border-[#b5a894] flex items-center justify-between dark:bg-slate-950 dark:border-slate-700">
                      <div className="flex items-center gap-2 truncate">
                        <Landmark className="w-4 h-4 text-[#047857] shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 block truncate">
                            {partnerForm.bankCopyFileName || "통장사본"}
                          </span>
                          <span className="text-[10px] text-[#475569] dark:text-slate-500 font-mono">
                            {isPdfDocument(partnerForm.bankCopyFileUrl, partnerForm.bankCopyFileName) ? "PDF 문서" : "이미지 서류"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={bankOcrLoading}
                          onClick={handleReRunBankOcr}
                          className="px-2 py-1 bg-[#047857] hover:bg-[#065f46] disabled:opacity-50 text-white rounded text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
                          title="통장사본 OCR 재판독 및 계좌정보 자동추출"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{bankOcrLoading ? "판독 중..." : "OCR 재판독"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDocument({
                              title: "통장사본 원본",
                              partnerName: partnerForm.name || "거래처",
                              url: partnerForm.bankCopyFileUrl,
                              fileName: partnerForm.bankCopyFileName || "통장사본",
                            });
                          }}
                          className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        >
                          <Eye className="w-3 h-3" />
                          <span>열어보기</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => bankCopyInputRef.current?.click()}
                          className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        >
                          <Upload className="w-3 h-3" />
                          <span>파일 변경</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPartnerForm({ ...partnerForm, bankCopyFileUrl: "__DELETE__", bankCopyFileName: "", hasBankCopy: false })}
                          className="p-1 bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] rounded border border-[#f87171] transition"
                          title="삭제"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => bankCopyInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsBankCopyDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsBankCopyDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsBankCopyDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleBankCopyFileUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`p-3.5 border-2 border-dashed rounded text-center cursor-pointer transition ${
                        isBankCopyDragging
                          ? "border-[#047857] bg-[#ecfdf5] dark:bg-emerald-950/40"
                          : "border-[#b5a894] bg-[#f4efe4] hover:bg-[#ebe5d8] dark:border-slate-700 dark:bg-slate-950"
                      }`}
                    >
                      <Landmark className="w-5 h-5 mx-auto mb-1 text-[#047857] dark:text-emerald-400" />
                      <p className="text-xs font-semibold text-[#0f172a] dark:text-slate-200">
                        통장사본 파일을 드래그하여 놓거나 클릭하여 선택
                      </p>
                      <p className="text-[10px] text-[#047857] dark:text-emerald-400 font-bold mt-0.5">
                        ✨ 파일 첨부 즉시 AI OCR로 은행명·계좌번호·예금주 자동 추출 및 채움
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 계약서 원본 (PDF) 직접 첨부/수정 */}
              <div className="p-3 bg-[#e2dbcd] border border-[#b5a894] rounded-lg space-y-2 dark:bg-slate-900 dark:border-slate-700">
                <span className="text-xs font-bold text-[#1d4ed8] dark:text-blue-400 flex items-center gap-1.5 pb-1 border-b border-[#b5a894] dark:border-slate-700">
                  <FileText className="w-3.5 h-3.5" />
                  <span>계약서 원본 서류 관리 (PDF)</span>
                </span>

                <input
                  type="file"
                  ref={directContractInputRef}
                  accept="application/pdf,.pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleDirectContractUpload(e.target.files[0]);
                    }
                    e.target.value = "";
                  }}
                />

                {partnerForm.contractFileUrl && partnerForm.contractFileUrl !== "__DELETE__" ? (
                  <div className="p-2.5 bg-[#f4efe4] rounded border border-[#b5a894] flex items-center justify-between dark:bg-slate-950 dark:border-slate-700">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 block truncate">
                          {partnerForm.contractFileName || "계약서.pdf"}
                        </span>
                        <span className="text-[10px] text-[#475569] dark:text-slate-500 font-mono">
                          {isPdfDocument(partnerForm.contractFileUrl, partnerForm.contractFileName) ? "PDF 문서" : "이미지 서류"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDocument({
                            title: "계약서 원본",
                            partnerName: partnerForm.name || "거래처",
                            url: partnerForm.contractFileUrl,
                            fileName: partnerForm.contractFileName || "계약서.pdf",
                          });
                        }}
                        className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        <Eye className="w-3 h-3" />
                        <span>열어보기</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => directContractInputRef.current?.click()}
                        className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        <Upload className="w-3 h-3" />
                        <span>파일 변경</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPartnerForm({
                            ...partnerForm,
                            contractFileUrl: "__DELETE__",
                            contractFileName: "",
                            hasContractFile: false,
                          })
                        }
                        className="p-1 bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] rounded border border-[#f87171] transition"
                        title="삭제"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => directContractInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDirectContractDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDirectContractDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDirectContractDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleDirectContractUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`p-3 border-2 border-dashed rounded text-center cursor-pointer transition ${
                      isDirectContractDragging
                        ? "border-[#1d4ed8] bg-[#dbeafe] dark:bg-blue-950/40"
                        : "border-[#b5a894] bg-[#f4efe4] hover:bg-[#ebe5d8] dark:border-slate-700 dark:bg-slate-950"
                    }`}
                  >
                    <FileUp className="w-5 h-5 mx-auto mb-1 text-[#1d4ed8] dark:text-blue-400" />
                    <p className="text-xs font-semibold text-[#0f172a] dark:text-slate-200">
                      계약서 PDF 파일을 드래그하여 놓거나 클릭하여 직접 첨부
                    </p>
                    <p className="text-[10px] text-[#475569] dark:text-slate-500 font-mono mt-0.5">
                      PDF 문서, JPG, PNG 파일 지원
                    </p>
                  </div>
                )}
              </div>

              {/* 비고 */}
              <div className="flex flex-col gap-1">
                <label className="text-[#334155] dark:text-slate-300 font-semibold">특이사항 및 메모</label>
                <textarea
                  rows={2}
                  placeholder="거래 특이사항, 취급 품목 등"
                  value={partnerForm.memo}
                  onChange={(e) => setPartnerForm({ ...partnerForm, memo: e.target.value })}
                  className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPartnerModal(false)}
                  className="px-3.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold rounded shadow transition"
                >
                  {partnerModalMode === "CREATE" ? "거래처 등록 완료" : "수정사항 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
  );
};
