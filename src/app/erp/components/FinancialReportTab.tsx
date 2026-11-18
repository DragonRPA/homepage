"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  RefreshCw,
  Download,
  Upload,
  ChevronRight,
  ChevronLeft,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { formatErpCurrency, sortErpItems } from "@/lib/erpFormat";
import { useErpTableSort } from "./SortableTh";
import type { StandardArticle, CommentarySection } from "../data/accountingStandardsMeta";
import type {
  AccountSubjectStandardInfo,
  SMEAccountingAuditItem,
} from "../data/accountSubjectStandardsMap";
import {
  AccountRow,
  CORP_FOUNDING_YEAR,
  EARLIEST_DATA_YEAR,
  exportFinancialReportCsv,
  FinancialDetailItem,
  FinancialReportTabProps,
  FinancialSummary,
  formatFiscalTermLabel,
  MonthlyTotal,
  StatementsData,
} from "./financial-report/financialReportTypes";
import { FinancialStatementsBoard } from "./financial-report/FinancialStatementsBoard";
import { MonthlyAccountMatrixSection } from "./financial-report/MonthlyAccountMatrixSection";
import { FinancialDetailLedgerSection } from "./financial-report/FinancialDetailLedgerSection";

const AccountingStandardModals = dynamic(
  () =>
    import("./financial-report/AccountingStandardModals").then(
      (m) => m.AccountingStandardModals
    ),
  { ssr: false }
);

export const FinancialReportTab: React.FC<FinancialReportTabProps> = ({
  currentUser,
  selectedEntity = "ALL",
}) => {
  const currentYearNum = useMemo(() => new Date().getFullYear(), []);
  const currentYearStr = String(currentYearNum);

  // 당기(현재 연도)부터 역순으로 회계기수 버튼 목록 동적 생성 (연도가 바뀌어도 코드 수정 불필요)
  const fiscalYearList = useMemo(() => {
    const list: Array<{ key: string; label: string; termNo: number }> = [];
    const maxYr = Math.max(currentYearNum, 2026);
    for (let y = maxYr; y >= EARLIEST_DATA_YEAR; y--) {
      const termNo = y - CORP_FOUNDING_YEAR + 1;
      list.push({
        key: String(y),
        label: formatFiscalTermLabel(String(y)),
        termNo,
      });
    }
    return list;
  }, [currentYearNum]);

  const [year, setYear] = useState<string>(() => String(new Date().getFullYear()));
  const [entityFilter, setEntityFilter] = useState<"ALL" | "CORP" | "INDIVIDUAL">(selectedEntity);
  const [amountBasis, setAmountBasis] = useState<"SUPPLY" | "TOTAL">("SUPPLY");
  const [loading, setLoading] = useState(false);

  const [months, setMonths] = useState<string[]>([]);
  const [accountRows, setAccountRows] = useState<AccountRow[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<Record<string, MonthlyTotal>>({});
  const [summary, setSummary] = useState<FinancialSummary>({
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    grossMarginRate: 0,
    payroll: 0,
    opex: 0,
    operatingProfit: 0,
    operatingMarginRate: 0,
    taxDues: 0,
    netOperatingCash: 0,
    nonOp: 0,
  });
  const [statements, setStatements] = useState<StatementsData | null>(null);
  const [depreciationSchedule, setDepreciationSchedule] = useState<any[]>([]);
  const [details, setDetails] = useState<FinancialDetailItem[]>([]);

  // 연도별 주석(Remark) 및 세무 4대 항목 상태 (초기값 0)
  const [remarkText, setRemarkText] = useState<string>("");
  const [taxWithholding, setTaxWithholding] = useState<number>(0);
  const [taxVat, setTaxVat] = useState<number>(0);
  const [taxCorporate, setTaxCorporate] = useState<number>(0);
  const [taxPayment, setTaxPayment] = useState<number>(0);
  const [savingRemark, setSavingRemark] = useState<boolean>(false);
  const [uploadingTaxFile, setUploadingTaxFile] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const taxFileInputRef = useRef<HTMLInputElement | null>(null);

  // 상세 전표 드릴다운 필터 상태
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedMajor, setSelectedMajor] = useState<string>("ALL");
  const [selectedSub, setSelectedSub] = useState<string>("ALL");
  const [detailSearch, setDetailSearch] = useState<string>("");

  const [expandedMajors, setExpandedMajors] = useState<Record<string, boolean>>({
    REVENUE: true,
    COGS: true,
    PAYROLL: true,
    OPEX: true,
    TAX_DUES: true,
    NON_OP: false,
  });

  // 계정과목 더블클릭 시 준용 중소기업회계기준 설명 모달 상태 (동적 지연 로딩)
  const [standardModalInfo, setStandardModalInfo] = useState<AccountSubjectStandardInfo | null>(null);
  const [standardLinkedDetail, setStandardLinkedDetail] = useState<{
    articles: StandardArticle[];
    commentaries: CommentarySection[];
  }>({ articles: [], commentaries: [] });
  const [showComplianceAuditModal, setShowComplianceAuditModal] = useState<boolean>(false);
  const [complianceAuditSummary, setComplianceAuditSummary] = useState<SMEAccountingAuditItem[]>([]);

  const openAccountStandardModal = async (keyOrSubAccount: string, fallbackMajor?: string) => {
    const mod = await import("../data/accountSubjectStandardsMap");
    const info = mod.resolveAccountSubjectStandard(keyOrSubAccount, fallbackMajor);
    const linked = await mod.fetchLinkedArticlesAndCommentaries(info);
    setStandardLinkedDetail(linked);
    setStandardModalInfo(info);
  };

  const openComplianceAuditModal = async () => {
    if (complianceAuditSummary.length === 0) {
      const mod = await import("../data/accountSubjectStandardsMap");
      setComplianceAuditSummary(mod.SME_ACCOUNTING_COMPLIANCE_SUMMARY);
    }
    setShowComplianceAuditModal(true);
  };

  useEffect(() => {
    setEntityFilter(selectedEntity);
  }, [selectedEntity]);

  const fetchReport = async () => {
    setLoading(true);
    setSaveMessage("");
    try {
      const params = new URLSearchParams({
        year,
        entityType: entityFilter,
        amountBasis,
      });
      const res = await fetch(`/api/erp/financial-report?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setMonths(data.months || []);
        setAccountRows(data.accountRows || []);
        setMonthlyTotals(data.monthlyTotals || {});
        if (data.summary) setSummary(data.summary);
        if (data.statements) {
          setStatements(data.statements);
          setRemarkText(data.statements.remark?.text || "");
          setTaxWithholding(Number(data.statements.remark?.taxWithholding || 0));
          setTaxVat(Number(data.statements.remark?.taxVat || 0));
          setTaxCorporate(Number(data.statements.remark?.taxCorporate || 0));
          setTaxPayment(Number(data.statements.remark?.taxPayment || 0));
        }
        setDepreciationSchedule(data.depreciationSchedule || []);
        setDetails(data.details || []);
      }
    } catch (e) {
      console.error("Failed to fetch financial report:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [year, entityFilter, amountBasis]);

  const handleSaveRemarkAndTax = async () => {
    setSavingRemark(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/erp/financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          entityType: entityFilter,
          remarkText,
          taxWithholding: Number(taxWithholding || 0),
          taxVat: Number(taxVat || 0),
          taxCorporate: Number(taxCorporate || 0),
          taxPayment: Number(taxPayment || 0),
          updatedBy: currentUser?.name || "ADMIN",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage(data.message || "저장 완료");
        await fetchReport();
      } else {
        setSaveMessage(data.error || "저장 실패");
      }
    } catch (e: any) {
      setSaveMessage("저장 오류: " + e.message);
    } finally {
      setSavingRemark(false);
    }
  };

  const handleTaxPaymentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingTaxFile(true);
    setSaveMessage("");
    try {
      let totalUpserted = 0;
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append(
          "entityType",
          entityFilter === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP"
        );
        const res = await fetch("/api/erp/financial-report", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || `${files[i].name} 업로드 실패`);
        }
        totalUpserted += Number(data.upsertedCount || 0);
      }
      setSaveMessage(`국세청 납부세액 ${totalUpserted}건 업로드 완료`);
      await fetchReport();
    } catch (err: any) {
      setSaveMessage("업로드 오류: " + err.message);
    } finally {
      setUploadingTaxFile(false);
      if (taxFileInputRef.current) taxFileInputRef.current.value = "";
    }
  };

  const toggleMajor = (key: string) => {
    setExpandedMajors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const detailSort = useErpTableSort("date", "desc");

  const filteredDetails = useMemo(() => {
    const filtered = details.filter((d) => {
      if (selectedMonth !== "ALL" && d.yearMonth !== selectedMonth) return false;
      if (selectedMajor !== "ALL" && d.majorAccount !== selectedMajor) return false;
      if (selectedSub !== "ALL" && d.subAccount !== selectedSub) return false;
      if (detailSearch.trim()) {
        const q = detailSearch.trim().toLowerCase();
        return (
          d.counterparty.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.subAccount.toLowerCase().includes(q) ||
          d.refNo.toLowerCase().includes(q)
        );
      }
      return true;
    });
    return sortErpItems(filtered, detailSort.sortKey, detailSort.sortDir);
  }, [details, selectedMonth, selectedMajor, selectedSub, detailSearch, detailSort.sortKey, detailSort.sortDir]);

  const handleCellDrilldown = (major: string, sub: string, m: string) => {
    setSelectedMajor(major);
    setSelectedSub(sub);
    setSelectedMonth(m);
  };

  const handleExportCsv = () => {
    exportFinancialReportCsv({
      year,
      entityFilter,
      months,
      accountRows,
      monthlyTotals,
      summary,
      remarkText,
    });
  };

  const yearLabel = year === "ALL" ? "전체 연도 누적" : formatFiscalTermLabel(year);

  const currentYearIdx = useMemo(
    () => fiscalYearList.findIndex((item) => item.key === year),
    [fiscalYearList, year]
  );

  const canStepNewer = year === "ALL" ? true : currentYearIdx > 0;
  const canStepOlder =
    year === "ALL"
      ? fiscalYearList.length > 0
      : currentYearIdx >= 0 && currentYearIdx < fiscalYearList.length - 1;

  const handleStepNewerTerm = () => {
    setSelectedMonth("ALL");
    if (year === "ALL") {
      setYear(currentYearStr);
      return;
    }
    if (currentYearIdx > 0) {
      setYear(fiscalYearList[currentYearIdx - 1].key);
    }
  };

  const handleStepOlderTerm = () => {
    setSelectedMonth("ALL");
    if (year === "ALL") {
      if (fiscalYearList.length > 1) {
        setYear(fiscalYearList[1].key);
      } else if (fiscalYearList.length === 1) {
        setYear(fiscalYearList[0].key);
      }
      return;
    }
    if (currentYearIdx >= 0 && currentYearIdx < fiscalYearList.length - 1) {
      setYear(fiscalYearList[currentYearIdx + 1].key);
    }
  };

  return (
    <div className="erp-print-report-root flex flex-col min-h-full md:h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 md:overflow-hidden font-sans">
      {/* 1. 상단 조회 조건 & 파이프라인 바 (헌장 3.4, 3.5 준수) */}
      <div className="p-2.5 md:p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-end justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-end gap-2 w-full sm:w-auto">
          {/* 조회 회계기수 (연도) */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              조회 회계기수 (연도)
            </label>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {/* ◀ 1기 최신(당기 방향) 이동 버튼 */}
              <button
                type="button"
                onClick={handleStepNewerTerm}
                disabled={!canStepNewer}
                title="다음 기수(최신 기수 방향)로 1기 이동"
                className="px-1.5 py-1.5 text-xs font-bold rounded border bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] disabled:opacity-40 disabled:pointer-events-none shrink-0 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {fiscalYearList.map((y) => (
                <button
                  key={y.key}
                  type="button"
                  onClick={() => {
                    setYear(y.key);
                    setSelectedMonth("ALL");
                  }}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded border whitespace-nowrap shrink-0 transition ${
                    year === y.key
                      ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                      : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  }`}
                >
                  {y.label}
                </button>
              ))}

              {/* ▶ 1기 과거(전기 방향) 이동 버튼 */}
              <button
                type="button"
                onClick={handleStepOlderTerm}
                disabled={!canStepOlder}
                title="이전 기수(전기 방향)로 1기 이동"
                className="px-1.5 py-1.5 text-xs font-bold rounded border bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] disabled:opacity-40 disabled:pointer-events-none shrink-0 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* 전체 연도 버튼 유지 */}
              <button
                type="button"
                onClick={() => {
                  setYear("ALL");
                  setSelectedMonth("ALL");
                }}
                className={`px-2.5 py-1.5 text-xs font-bold rounded border whitespace-nowrap shrink-0 transition ${
                  year === "ALL"
                    ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                    : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                }`}
              >
                전체 연도
              </button>
            </div>
          </div>

          {/* 사업자 구분 */}
          <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[140px]">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              사업자 구분
            </label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as any)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded font-semibold focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full"
            >
              <option value="ALL">전체 사업자 (통합)</option>
              <option value="CORP">(주)드래곤알피에이 [법인]</option>
              <option value="INDIVIDUAL">드래곤알피에이 [개인]</option>
            </select>
          </div>

          {/* 금액 집계 기준 */}
          <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[130px]">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              세금계산서 금액 기준
            </label>
            <select
              value={amountBasis}
              onChange={(e) => setAmountBasis(e.target.value as any)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1.5 rounded font-semibold focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 w-full"
            >
              <option value="SUPPLY">공급가액 기준</option>
              <option value="TOTAL">부가세 포함 총액</option>
            </select>
          </div>
        </div>

        {/* 우측 액션 버튼 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700">
            <img
              src="/ci-dragonrpa.png"
              alt="주식회사 드래곤알피에이 CI"
              className="w-5 h-5 object-contain"
            />
            <span className="text-[11px] font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
              주식회사 드래곤알피에이 결산재무제표
            </span>
          </div>

          <button
            type="button"
            onClick={() => openComplianceAuditModal()}
            className="px-2.5 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-[#fde68a] border border-[#b45309] text-xs font-bold rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap transition"
            title="당사 회계처리의 중소기업회계기준(법무부고시 제2013-0029호) 부합성 검증 보고서 열기"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#34d399]" />
            <span>중소기업회계기준 부합 검증</span>
          </button>

          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            title="조회"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <input
            ref={taxFileInputRef}
            type="file"
            accept=".xls,.xlsx,.csv"
            multiple
            onChange={handleTaxPaymentFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => taxFileInputRef.current?.click()}
            disabled={uploadingTaxFile}
            className="px-2.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{uploadingTaxFile ? "업로드 중..." : "국세청 납부세액 업로드"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-2.5 py-1.5 bg-[#334155] hover:bg-[#1e293b] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>보고서 인쇄</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>
        </div>
      </div>

      {/* 2. 핵심 경영지표 요약 바 (5대 계정 KPI) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 px-3 py-2 bg-[#dcd4c4] border-b border-[#b5a894] dark:bg-slate-900/90 dark:border-slate-800 shrink-0 text-xs">
        <div
          onClick={() => handleCellDrilldown("REVENUE", "ALL", "ALL")}
          onDoubleClick={() => openAccountStandardModal("REVENUE")}
          title="클릭: 매출 전표 필터 / 더블클릭: 중소기업회계기준 수익인식(제24~26조) 설명"
          className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:border-[#1d4ed8] select-none"
        >
          <div className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
            Ⅰ. 총 매출액 (예정포함)
          </div>
          <div className="text-sm font-extrabold font-mono text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap mt-0.5">
            {formatErpCurrency(summary.revenue)}
          </div>
        </div>

        <div
          onClick={() => handleCellDrilldown("COGS", "ALL", "ALL")}
          onDoubleClick={() => openAccountStandardModal("COGS")}
          title="클릭: 매입·원가 전표 필터 / 더블클릭: 중소기업회계기준 매출원가(제27~28조) 설명"
          className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:border-[#b45309] select-none"
        >
          <div className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
            Ⅱ. 매입·원가 합계
          </div>
          <div className="text-sm font-extrabold font-mono text-[#b45309] dark:text-amber-400 whitespace-nowrap mt-0.5">
            {formatErpCurrency(summary.cogs)}
          </div>
        </div>

        <div
          onDoubleClick={() => openAccountStandardModal("SUMMARY_GROSS_PROFIT")}
          title="더블클릭: 중소기업회계기준 매출총손익(제23조·제28조) 설명"
          className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:border-[#047857] select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
              매출총이익
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
              이익률 {summary.grossMarginRate}%
            </span>
          </div>
          <div className="text-sm font-extrabold font-mono text-[#047857] dark:text-emerald-400 whitespace-nowrap mt-0.5">
            {formatErpCurrency(summary.grossProfit)}
          </div>
        </div>

        <div
          onClick={() => handleCellDrilldown("PAYROLL", "ALL", "ALL")}
          onDoubleClick={() => openAccountStandardModal("PAYROLL")}
          title="클릭: 급여·인건비 전표 필터 / 더블클릭: 중소기업회계기준 급여·퇴직급여(제17·29조) 설명"
          className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:border-[#6d28d9] select-none"
        >
          <div className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
            Ⅲ. 급여·인건비 (4대보험포함)
          </div>
          <div className="text-sm font-extrabold font-mono text-[#5b21b6] dark:text-violet-400 whitespace-nowrap mt-0.5">
            {formatErpCurrency(summary.payroll)}
          </div>
        </div>

        <div
          onClick={() => handleCellDrilldown("OPEX", "ALL", "ALL")}
          onDoubleClick={() => openAccountStandardModal("OPEX")}
          title="클릭: 운영비용 전표 필터 / 더블클릭: 중소기업회계기준 판매비와관리비(제29조) 설명"
          className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 cursor-pointer hover:border-[#dc2626] select-none"
        >
          <div className="text-[11px] font-bold text-[#475569] dark:text-slate-400 whitespace-nowrap">
            Ⅳ. 운영비용 (판관비)
          </div>
          <div className="text-sm font-extrabold font-mono text-[#dc2626] dark:text-rose-400 whitespace-nowrap mt-0.5">
            {formatErpCurrency(summary.opex)}
          </div>
        </div>

        <div
          onDoubleClick={() => openAccountStandardModal("SUMMARY_OPERATING_PROFIT")}
          title="더블클릭: 중소기업회계기준 영업손익(제23조·제29조) 설명"
          className="p-2 rounded bg-[#ecfdf5] border border-[#047857] dark:bg-emerald-950/40 dark:border-emerald-600 cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#065f46] dark:text-emerald-300 whitespace-nowrap">
              영업이익 (Operating Profit)
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/80 text-[#065f46]">
              {summary.operatingMarginRate}%
            </span>
          </div>
          <div
            className={`text-sm font-extrabold font-mono whitespace-nowrap mt-0.5 ${
              summary.operatingProfit >= 0
                ? "text-[#047857] dark:text-emerald-400"
                : "text-[#dc2626] dark:text-rose-400"
            }`}
          >
            {formatErpCurrency(summary.operatingProfit)}
          </div>
        </div>
      </div>

      {/* 3. 본문: 재무제표 4대 보드 (BS / PL / CF / Remark) + 월별 계정 손익 매트릭스 + 상세 전표 내역 */}
      <div className="erp-print-report-body flex-1 md:overflow-auto p-2.5 md:p-3 space-y-3">
        {statements && (
          <FinancialStatementsBoard
            statements={statements}
            year={year}
            yearLabel={yearLabel}
            entityFilter={entityFilter}
            amountBasis={amountBasis}
            remarkText={remarkText}
            onChangeRemarkText={setRemarkText}
            taxWithholding={taxWithholding}
            onChangeTaxWithholding={setTaxWithholding}
            taxVat={taxVat}
            onChangeTaxVat={setTaxVat}
            taxCorporate={taxCorporate}
            onChangeTaxCorporate={setTaxCorporate}
            taxPayment={taxPayment}
            onChangeTaxPayment={setTaxPayment}
            savingRemark={savingRemark}
            uploadingTaxFile={uploadingTaxFile}
            saveMessage={saveMessage}
            onTriggerTaxFileUpload={() => taxFileInputRef.current?.click()}
            onSaveRemarkAndTax={handleSaveRemarkAndTax}
            onOpenStandardModal={openAccountStandardModal}
          />
        )}

        <MonthlyAccountMatrixSection
          year={year}
          entityFilter={entityFilter}
          amountBasis={amountBasis}
          months={months}
          accountRows={accountRows}
          monthlyTotals={monthlyTotals}
          summary={summary}
          depreciationSchedule={depreciationSchedule}
          expandedMajors={expandedMajors}
          onToggleMajor={toggleMajor}
          selectedMonth={selectedMonth}
          onToggleSelectedMonth={(m) => setSelectedMonth((prev) => (prev === m ? "ALL" : m))}
          selectedMajor={selectedMajor}
          selectedSub={selectedSub}
          onCellDrilldown={handleCellDrilldown}
          onOpenStandardModal={openAccountStandardModal}
        />

        <FinancialDetailLedgerSection
          months={months}
          filteredDetails={filteredDetails}
          selectedMajor={selectedMajor}
          onSelectMajor={(maj) => {
            setSelectedMajor(maj);
            setSelectedSub("ALL");
          }}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          selectedSub={selectedSub}
          onClearSub={() => setSelectedSub("ALL")}
          detailSearch={detailSearch}
          onChangeDetailSearch={setDetailSearch}
          detailSort={detailSort}
          onOpenStandardModal={openAccountStandardModal}
        />
      </div>

      {/* 4. 최하단 수지 보존 검증 바 (헌장 3.5 & 5.5 수지 보존식) */}
      <div className="p-2.5 bg-[#e2dbcd] border-t border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            📄 매출({formatErpCurrency(summary.revenue)}) - 매입원가({formatErpCurrency(summary.cogs)}) ={" "}
            <b className="text-[#047857] dark:text-emerald-400">
              매출총이익 {formatErpCurrency(summary.grossProfit)}
            </b>
          </span>
          <span className="text-[#b5a894]">|</span>
          <span>
            영업이익({formatErpCurrency(summary.operatingProfit)}) - 세무({formatErpCurrency(summary.taxDues)}) ={" "}
            <b className="text-[#1d4ed8] dark:text-blue-400">
              당기순이익 {formatErpCurrency(summary.netOperatingCash)}
            </b>
          </span>
        </div>
        <div className="text-[11px] text-[#475569] dark:text-slate-400">
          * 원천세·부가세·법인세·납부항목 기본값 ₩0 반영 | 계정과목 분류 더블클릭 시 중소기업회계기준 상세 모달 표출
        </div>
      </div>

      {/* 5 & 6. 준용 중소기업회계기준 설명 모달 & 부합성 검증 총괄 보고서 모달 */}
      {(standardModalInfo || showComplianceAuditModal) && (
        <AccountingStandardModals
          standardModalInfo={standardModalInfo}
          standardLinkedDetail={standardLinkedDetail}
          onCloseStandardModal={() => setStandardModalInfo(null)}
          onOpenStandardModal={(k, maj) => {
            void openAccountStandardModal(k, maj);
          }}
          showComplianceAuditModal={showComplianceAuditModal}
          complianceAuditSummary={complianceAuditSummary}
          onOpenComplianceAuditModal={() => {
            void openComplianceAuditModal();
          }}
          onCloseComplianceAuditModal={() => setShowComplianceAuditModal(false)}
        />
      )}
    </div>
  );
};
