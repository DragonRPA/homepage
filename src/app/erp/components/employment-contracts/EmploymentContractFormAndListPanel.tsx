"use client";

import React, { useMemo } from "react";
import { FileSignature, Upload, Save, Trash2, ShieldCheck } from "lucide-react";
import {
  formatErpCurrency,
  toErpInputString,
  cleanErpNumber,
  sortErpItems,
} from "@/lib/erpFormat";
import { matchHangulAny } from "@/lib/hangulSearch";
import { SortableTh, useErpTableSort } from "../SortableTh";
import {
  EmploymentContractItem,
  EmployeeOption,
  RightViewMode,
  CONTRACT_TYPE_LABELS,
} from "./employmentContractTypes";

export interface EmploymentContractDraftForm {
  id: number;
  contractNo: string;
  contractYear: string;
  contractType: "NEW_HIRE" | "RENEWAL" | "SECURITY_PLEDGE";
  status: "DRAFT" | "SIGNED" | "ARCHIVED" | "EXPIRED";
  employeeId: string | number;
  employeeName: string;
  employeePhone: string;
  employeeAddress: string;
  residentRegNo: string;
  employerName: string;
  employerPhone: string;
  employerAddress: string;
  employerRep: string;
  startDate: string;
  endDate: string;
  workplace: string;
  jobDescription: string;
  workStartTime: string;
  workEndTime: string;
  breakMinutes: number;
  workDays: string;
  weeklyHoliday: string;
  baseSalary: number;
  hourlyWageNote: string;
  mealAllowance: number;
  vehicleAllowance: number;
  otherAllowance: number;
  otherAllowanceLabel: string;
  payDay: number;
  payMethod: string;
  contractDate: string;
  scanFileName: string;
  scanFileUrl: string;
  pledgeDate: string;
  pledgeScanName: string;
  pledgeScanUrl: string;
  memo: string;
  syncEmployeeMaster: boolean;
  registerNewEmployee: boolean;
  newEmployeePosition: string;
  newEmployeeDepartment: string;
}

export interface EmploymentContractFormAndListPanelProps {
  contracts: EmploymentContractItem[];
  employees: EmployeeOption[];
  searchQuery: string;
  selectedContractId: number | null;
  form: EmploymentContractDraftForm;
  setForm: React.Dispatch<React.SetStateAction<EmploymentContractDraftForm>>;
  saving: boolean;
  pledgeFileInputRef: React.RefObject<HTMLInputElement | null>;
  setRightViewMode: React.Dispatch<React.SetStateAction<RightViewMode>>;
  loadContractIntoForm: (c: EmploymentContractItem) => void;
  handleDeleteContract: (id: number, name: string) => Promise<void>;
  handleSaveContract: () => Promise<void>;
  handleStartNewHire: () => void;
  handleStartRenewal: (empId?: number) => void;
  handleStartSecurityPledge: () => void;
  handleSelectEmployee: (empIdStr: string) => void;
  handlePledgeScanUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

const INPUT_CLASS =
  "bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 text-xs";
const LABEL_CLASS =
  "text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap";

export const EmploymentContractFormAndListPanel: React.FC<
  EmploymentContractFormAndListPanelProps
> = ({
  contracts,
  employees,
  searchQuery,
  selectedContractId,
  form,
  setForm,
  saving,
  pledgeFileInputRef,
  setRightViewMode,
  loadContractIntoForm,
  handleDeleteContract,
  handleSaveContract,
  handleStartNewHire,
  handleStartRenewal,
  handleStartSecurityPledge,
  handleSelectEmployee,
  handlePledgeScanUpload,
}) => {
  const contractSort = useErpTableSort("", null);

  const filteredContracts = useMemo(() => {
    const list = contracts.filter((c) => {
      if (searchQuery.trim()) {
        return matchHangulAny(
          [c.employeeName, c.contractNo, c.jobDescription, c.memo],
          searchQuery
        );
      }
      return true;
    });
    return sortErpItems(list, contractSort.sortKey, contractSort.sortDir);
  }, [contracts, searchQuery, contractSort.sortKey, contractSort.sortDir]);

  const totalMonthly =
    Number(form.baseSalary || 0) +
    Number(form.mealAllowance || 0) +
    Number(form.vehicleAllowance || 0) +
    Number(form.otherAllowance || 0);
  const totalAnnual = totalMonthly * 12;

  const saveLabel = saving
    ? "저장 중..."
    : selectedContractId
    ? "계약서·보안서약 수정 저장"
    : "신규 저장";

  return (
    <div className="lg:col-span-5 flex flex-col gap-3 min-h-0 lg:h-full lg:overflow-y-auto pr-1 pb-6">
      {/* 2-1. 연도별 근로계약서 & 보안서약서 보관 목록 */}
      <div className="bg-[#f4efe4] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 shrink-0">
        <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <FileSignature className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
            <span className="whitespace-nowrap">
              연도별 근로계약서 · 보안서약서 보관 대장 ({filteredContracts.length}건)
            </span>
          </div>
          <span className="text-[11px] text-[#475569] dark:text-slate-400 whitespace-nowrap">
            행 클릭 시 조회
          </span>
        </div>

        <div className="max-h-[195px] overflow-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#dcd4c4] text-[#0f172a] font-bold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
              <tr>
                <SortableTh
                  label="연도"
                  colKey="contractYear"
                  sortKey={contractSort.sortKey}
                  sortDir={contractSort.sortDir}
                  onSort={contractSort.handleSort}
                  className="py-1.5 px-2"
                />
                <SortableTh
                  label="구분"
                  colKey="contractType"
                  sortKey={contractSort.sortKey}
                  sortDir={contractSort.sortDir}
                  onSort={contractSort.handleSort}
                  className="py-1.5 px-2"
                />
                <SortableTh
                  label="성명"
                  colKey="employeeName"
                  sortKey={contractSort.sortKey}
                  sortDir={contractSort.sortDir}
                  onSort={contractSort.handleSort}
                  className="py-1.5 px-2"
                />
                <SortableTh
                  label="기본급(월)"
                  colKey="baseSalary"
                  sortKey={contractSort.sortKey}
                  sortDir={contractSort.sortDir}
                  onSort={contractSort.handleSort}
                  align="right"
                  className="py-1.5 px-2"
                />
                <SortableTh
                  label="개시/서약일"
                  colKey="startDate"
                  sortKey={contractSort.sortKey}
                  sortDir={contractSort.sortDir}
                  onSort={contractSort.handleSort}
                  className="py-1.5 px-2"
                />
                <SortableTh
                  label="계약스캔"
                  colKey="scanFileUrl"
                  sortKey={contractSort.sortKey}
                  sortDir={contractSort.sortDir}
                  onSort={contractSort.handleSort}
                  align="center"
                  className="py-1.5 px-2"
                />
                <SortableTh
                  label="보안서약(입사1회)"
                  colKey="pledgeScanUrl"
                  sortKey={contractSort.sortKey}
                  sortDir={contractSort.sortDir}
                  onSort={contractSort.handleSort}
                  align="center"
                  className="py-1.5 px-2"
                />
                <th className="py-1.5 px-1.5 text-center whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5cbb8] dark:divide-slate-800">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[#64748b] whitespace-nowrap">
                    조회된 문서가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => {
                  const isSelected = selectedContractId === c.id;
                  const tMeta =
                    CONTRACT_TYPE_LABELS[c.contractType] || CONTRACT_TYPE_LABELS.NEW_HIRE;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => loadContractIntoForm(c)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? "bg-[#dbeafe] dark:bg-blue-950/60 font-bold"
                          : "hover:bg-[#ebe5d8] dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <td className="py-1.5 px-2 font-mono font-bold whitespace-nowrap">
                        {c.contractYear}년
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tMeta.badgeClass}`}>
                          {tMeta.label}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 font-bold whitespace-nowrap">{c.employeeName}</td>
                      <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                        {c.contractType === "SECURITY_PLEDGE" ? "-" : formatErpCurrency(c.baseSalary)}
                      </td>
                      <td className="py-1.5 px-2 font-mono whitespace-nowrap">{c.startDate}</td>
                      <td className="py-1.5 px-2 text-center whitespace-nowrap">
                        {(c.scanFileUrl || c.hasScanFile) && c.contractType !== "SECURITY_PLEDGE" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadContractIntoForm(c);
                              setRightViewMode("SCAN");
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd] text-[10px] font-bold hover:bg-[#bfdbfe]"
                          >
                            계약스캔
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#94a3b8]">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center whitespace-nowrap">
                        {c.pledgeScanUrl || c.hasPledgeScan ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadContractIntoForm(c);
                              setRightViewMode("PLEDGE_SCAN");
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#ede9fe] text-[#5b21b6] border border-[#c4b5fd] text-[10px] font-bold hover:bg-[#ddd6fe]"
                          >
                            서약스캔
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadContractIntoForm(c);
                              setRightViewMode("PLEDGE_DOC");
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] text-[10px] font-semibold hover:bg-[#e2e8f0]"
                          >
                            서약양식
                          </button>
                        )}
                      </td>
                      <td className="py-1.5 px-1.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContract(c.id, c.employeeName);
                          }}
                          className="p-1 text-[#dc2626] hover:bg-rose-100 rounded"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-2. 근로계약 및 입사 보안서약서 상세 입력·편집 패널 */}
      <div className="bg-[#f4efe4] border border-[#b5a894] rounded shadow-xs dark:bg-slate-900 dark:border-slate-800 flex flex-col shrink-0">
        <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between sticky top-0 z-10 rounded-t">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span>
              {selectedContractId
                ? `근로계약 · 보안서약 편집 (${form.employeeName} · ${form.contractYear}년)`
                : form.contractType === "SECURITY_PLEDGE"
                ? "입사 시 1회 정보보호(보안) 서약서 작성"
                : form.contractType === "NEW_HIRE"
                ? "신입 직원 채용 근로계약 · 보안서약 입력"
                : "연봉협상 재계약 근로조건 입력"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveContract}
            disabled={saving}
            className="px-3 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveLabel}</span>
          </button>
        </div>

        <div className="p-3 space-y-2.5 text-xs">
          {/* 1행: 문서 구분 / 귀속연도 / 기존사원 불러오기 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className={LABEL_CLASS}>문서 구분</label>
              <select
                value={form.contractType}
                onChange={(e) => {
                  const nextType = e.target.value as "NEW_HIRE" | "RENEWAL" | "SECURITY_PLEDGE";
                  if (nextType === "NEW_HIRE") handleStartNewHire();
                  else if (nextType === "RENEWAL") handleStartRenewal();
                  else if (nextType === "SECURITY_PLEDGE") handleStartSecurityPledge();
                }}
                className={`${INPUT_CLASS} font-bold`}
              >
                <option value="NEW_HIRE">신입 직원 채용</option>
                <option value="RENEWAL">연봉협상 재계약</option>
                <option value="SECURITY_PLEDGE">보안서약서 (입사 1회)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={LABEL_CLASS}>귀속연도</label>
              <input
                type="text"
                value={form.contractYear}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => {
                    const isValidYear = /^\d{4}$/.test(val);
                    const isRenewal = prev.contractType === "RENEWAL";
                    return {
                      ...prev,
                      contractYear: val,
                      startDate: isValidYear && isRenewal ? `${val}-01-01` : prev.startDate,
                      endDate: isValidYear && isRenewal ? `${val}-12-31` : prev.endDate,
                      contractDate: isValidYear && isRenewal ? `${val}-01-01` : prev.contractDate,
                      memo: isValidYear && isRenewal ? `${val}년 연봉협상 재계약 체결` : prev.memo,
                    };
                  });
                }}
                className={`${INPUT_CLASS} font-mono font-bold`}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={LABEL_CLASS}>기존 사원 선택 (자동완성)</label>
              <select
                value={String(form.employeeId || "")}
                onChange={(e) => handleSelectEmployee(e.target.value)}
                className={`${INPUT_CLASS} font-semibold`}
              >
                <option value="">-- 직접 입력 (신입 채용) --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.name} ({emp.position} / {emp.department || "미지정"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2행: 근로자 성명 / 주민등록번호(보안서약서용) / 연락처 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className={LABEL_CLASS}>근로자(서약자) 성명</label>
              <input
                type="text"
                value={form.employeeName}
                onChange={(e) => setForm((prev) => ({ ...prev, employeeName: e.target.value }))}
                placeholder="예: 장종순"
                className={`${INPUT_CLASS} font-bold`}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#5b21b6] dark:text-violet-300 whitespace-nowrap">
                주민등록번호 (보안서약서 표기)
              </label>
              <input
                type="text"
                value={form.residentRegNo}
                onChange={(e) => setForm((prev) => ({ ...prev, residentRegNo: e.target.value }))}
                placeholder="예: 780217-1241810"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={LABEL_CLASS}>근로자 연락처</label>
              <input
                type="text"
                value={form.employeePhone}
                onChange={(e) => setForm((prev) => ({ ...prev, employeePhone: e.target.value }))}
                placeholder="010-0000-0000"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
          </div>

          {/* 3행: 입사 시 1회 보안서약서 전용 보관 박스 */}
          <div className="p-2.5 rounded bg-[#f5f3ff] dark:bg-violet-950/30 border border-[#c4b5fd] dark:border-violet-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-[#5b21b6] dark:text-violet-300">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">입사 시 1회 정보보호(보안) 서약서 관리</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRightViewMode("PLEDGE_DOC")}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-[#c4b5fd] text-[#5b21b6] dark:text-violet-300 text-[11px] font-bold hover:bg-[#ede9fe] whitespace-nowrap"
                >
                  서약서 양식 보기
                </button>
                {form.pledgeScanUrl && (
                  <button
                    type="button"
                    onClick={() => setRightViewMode("PLEDGE_SCAN")}
                    className="px-2 py-0.5 rounded bg-[#5b21b6] text-white text-[11px] font-bold hover:bg-[#4c1d95] whitespace-nowrap"
                  >
                    서약서 스캔본 열람
                  </button>
                )}
                <input
                  ref={pledgeFileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handlePledgeScanUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => pledgeFileInputRef.current?.click()}
                  className="px-2 py-0.5 rounded bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                >
                  <Upload className="w-3 h-3" />
                  <span>보안서약서 스캔 첨부</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
                  보안서약서 작성일 (입사 시 1회)
                </label>
                <input
                  type="date"
                  value={form.pledgeDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, pledgeDate: e.target.value }))}
                  className="bg-white dark:bg-slate-900 border border-[#c4b5fd] dark:border-slate-700 rounded px-2 py-1 font-mono text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
                  보관된 보안서약서 스캔 파일명
                </label>
                <input
                  type="text"
                  readOnly
                  value={form.pledgeScanName || "미첨부 (우측 상단 버튼으로 스캔본 첨부 가능)"}
                  className="bg-white/70 dark:bg-slate-900 border border-[#c4b5fd] dark:border-slate-700 rounded px-2 py-1 text-[11px] text-[#475569]"
                />
              </div>
            </div>
          </div>

          {/* 4행: 근로자 주소 */}
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS}>근로자 주소</label>
            <input
              type="text"
              value={form.employeeAddress}
              onChange={(e) => setForm((prev) => ({ ...prev, employeeAddress: e.target.value }))}
              placeholder="서울 금천구 시흥대로146길 25-19"
              className={INPUT_CLASS}
            />
          </div>

          {/* 5행: 근로계약기간 (개시일 / 종료일 / 체결일) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className={LABEL_CLASS}>1. 근로계약 개시일</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    startDate: val,
                    contractYear: val ? val.slice(0, 4) : prev.contractYear,
                  }));
                }}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={LABEL_CLASS}>종료일 (무기계약 시 비움)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={LABEL_CLASS}>계약 체결일</label>
              <input
                type="date"
                value={form.contractDate}
                onChange={(e) => setForm((prev) => ({ ...prev, contractDate: e.target.value }))}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
          </div>

          {/* 6행: 근무장소 & 업무의 내용 */}
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS}>2. 근무장소</label>
            <input
              type="text"
              value={form.workplace}
              onChange={(e) => setForm((prev) => ({ ...prev, workplace: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS}>3. 업무의 내용</label>
            <input
              type="text"
              value={form.jobDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, jobDescription: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>

          {/* 7행: 임금 (기본급, 식대, 차량보조금, 시급표기) */}
          <div className="p-2.5 rounded bg-[#ebe5d8] dark:bg-slate-950 border border-[#c4b6a0] dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1e3a8a] dark:text-blue-300">
                6. 임금 및 연봉 조건
              </span>
              <span className="font-mono font-extrabold text-[#047857] dark:text-emerald-400">
                월 합계 {formatErpCurrency(totalMonthly)} (연 환산 {formatErpCurrency(totalAnnual)})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS}>월 기본급 (원)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.baseSalary ? toErpInputString(form.baseSalary) : ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, baseSalary: cleanErpNumber(e.target.value) }))
                  }
                  placeholder="0"
                  className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono font-bold text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS}>식대 (원)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.mealAllowance ? toErpInputString(form.mealAllowance) : ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, mealAllowance: cleanErpNumber(e.target.value) }))
                  }
                  placeholder="0"
                  className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono font-bold text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS}>차량보조금 (원)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.vehicleAllowance ? toErpInputString(form.vehicleAllowance) : ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      vehicleAllowance: cleanErpNumber(e.target.value),
                    }))
                  }
                  placeholder="0"
                  className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono font-bold text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS}>시급 표기</label>
                <input
                  type="text"
                  value={form.hourlyWageNote}
                  onChange={(e) => setForm((prev) => ({ ...prev, hourlyWageNote: e.target.value }))}
                  className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 8행: 비고 메모 및 사원대장 동기화 옵션 */}
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS}>계약 · 보안서약 이력 메모</label>
            <input
              type="text"
              value={form.memo}
              onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
              placeholder="예: 2025년 11월 입사 근로계약서 및 정보보호서약서 스캔 보관"
              className={INPUT_CLASS}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#d5cbb8] dark:border-slate-800">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-[#1e3a8a] dark:text-blue-300">
              <input
                type="checkbox"
                checked={form.syncEmployeeMaster}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, syncEmployeeMaster: e.target.checked }))
                }
                className="rounded"
              />
              <span>저장 시 사원대장(급여·주소·주민번호·보안서약서) 자동 동기화</span>
            </label>

            {!form.employeeId && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-[#047857] dark:text-emerald-400">
                <input
                  type="checkbox"
                  checked={form.registerNewEmployee}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, registerNewEmployee: e.target.checked }))
                  }
                  className="rounded"
                />
                <span>신규 입사자로 사원대장 동시 등록</span>
              </label>
            )}

            <button
              type="button"
              onClick={handleSaveContract}
              disabled={saving}
              className="ml-auto px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
