"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileSignature,
  RefreshCw,
  Plus,
  Upload,
  Printer,
  Save,
  Trash2,
  Eye,
  Search,
  UserPlus,
  TrendingUp,
  FileText,
  CheckCircle2,
  X,
  Calendar,
} from "lucide-react";
import { formatErpCurrency } from "@/lib/erpFormat";

export interface EmploymentContractItem {
  id: number;
  contractNo: string;
  contractYear: string;
  contractType: "NEW_HIRE" | "RENEWAL";
  status: "DRAFT" | "SIGNED" | "ARCHIVED" | "EXPIRED";
  employeeId: number | null;
  employeeName: string;
  employeePhone: string;
  employeeAddress: string;
  employerName: string;
  employerPhone: string;
  employerAddress: string;
  employerRep: string;
  startDate: string;
  endDate: string | null;
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
  totalMonthlyPay: number;
  payDay: number;
  payMethod: string;
  contractDate: string;
  scanFileName: string | null;
  scanFileUrl: string | null;
  memo: string | null;
  employeeNo?: string;
  department?: string;
  position?: string;
}

interface EmployeeOption {
  id: number;
  employeeNo: string;
  name: string;
  position: string;
  department: string;
  baseSalary: number;
  mealAllowance: number;
  vehicleAllowance: number;
  phone: string;
  address: string;
  joinDate: string;
  status: string;
}

interface EmploymentContractTabProps {
  currentUser?: any;
}

const CONTRACT_TYPE_LABELS: Record<
  "NEW_HIRE" | "RENEWAL",
  { label: string; badgeClass: string }
> = {
  NEW_HIRE: {
    label: "신입 채용",
    badgeClass:
      "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
  },
  RENEWAL: {
    label: "연봉 재계약",
    badgeClass:
      "bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  },
};

const STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
  SIGNED: {
    label: "체결완료",
    badgeClass: "bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]",
  },
  ARCHIVED: {
    label: "보관(이력)",
    badgeClass: "bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1]",
  },
  EXPIRED: {
    label: "기간만료/퇴사",
    badgeClass: "bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]",
  },
  DRAFT: {
    label: "작성중",
    badgeClass: "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]",
  },
};

export const EmploymentContractTab: React.FC<EmploymentContractTabProps> = ({
  currentUser,
}) => {
  const [contracts, setContracts] = useState<EmploymentContractItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);

  // 조회 필터
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 선택된 계약서 및 편집 폼 상태
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [rightViewMode, setRightViewMode] = useState<"DOCUMENT" | "SCAN">("DOCUMENT");

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentYearStr = todayStr.slice(0, 4);

  const [form, setForm] = useState({
    id: 0,
    contractNo: "",
    contractYear: currentYearStr,
    contractType: "NEW_HIRE" as "NEW_HIRE" | "RENEWAL",
    status: "SIGNED" as "DRAFT" | "SIGNED" | "ARCHIVED" | "EXPIRED",
    employeeId: "" as string | number,
    employeeName: "박종환",
    employeePhone: "010-8683-9775",
    employeeAddress: "서울 금천구 시흥대로146길 25-19",
    employerName: "주식회사 드래곤알피에이",
    employerPhone: "010-9224-4097",
    employerAddress: "서울 금천구 서부샛길 528, 547호",
    employerRep: "이정용",
    startDate: "2026-04-20",
    endDate: "",
    workplace: "서울시 금천구 벚꽃로278, SJ테크노빌 B155호",
    jobDescription: "주식회사 현대렌탈서비스의 렌탈자산 입/출고/배송 설치 등",
    workStartTime: "09:00",
    workEndTime: "18:00",
    breakMinutes: 60,
    workDays: "매주 월~금요일 근무",
    weeklyHoliday: "주휴일 매주 토~일요일",
    baseSalary: 2800000,
    hourlyWageNote: "시급은 통상시급",
    mealAllowance: 200000,
    vehicleAllowance: 0,
    otherAllowance: 0,
    otherAllowanceLabel: "",
    payDay: 10,
    payMethod: "근로자 명의 예금통장에 입금",
    contractDate: "2026-04-20",
    scanFileName: "",
    scanFileUrl: "",
    memo: "",
    syncEmployeeMaster: true,
    registerNewEmployee: false,
    newEmployeePosition: "사원",
    newEmployeeDepartment: "렌탈운영팀",
  });

  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [cRes, eRes] = await Promise.all([
        fetch(`/api/erp/employment-contracts?year=${yearFilter}&contractType=${typeFilter}`),
        fetch("/api/erp/employees"),
      ]);
      const cData = await cRes.json();
      const eData = await eRes.json();

      if (eData.success && Array.isArray(eData.employees)) {
        setEmployees(eData.employees);
      }

      if (cData.success && Array.isArray(cData.contracts)) {
        setContracts(cData.contracts);
        if (cData.contracts.length > 0 && !selectedContractId) {
          // 기본적으로 박종환(2026) 또는 첫 번째 계약 선택
          const defaultTarget =
            cData.contracts.find((c: EmploymentContractItem) => c.employeeName === "박종환") ||
            cData.contracts[0];
          loadContractIntoForm(defaultTarget);
        }
      }
    } catch (err) {
      console.error("Failed to fetch employment contracts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [yearFilter, typeFilter]);

  const loadContractIntoForm = (c: EmploymentContractItem) => {
    setSelectedContractId(c.id);
    setForm({
      id: c.id,
      contractNo: c.contractNo || "",
      contractYear: c.contractYear || currentYearStr,
      contractType: c.contractType || "NEW_HIRE",
      status: c.status || "SIGNED",
      employeeId: c.employeeId ?? "",
      employeeName: c.employeeName || "",
      employeePhone: c.employeePhone || "",
      employeeAddress: c.employeeAddress || "",
      employerName: c.employerName || "주식회사 드래곤알피에이",
      employerPhone: c.employerPhone || "010-9224-4097",
      employerAddress: c.employerAddress || "서울 금천구 서부샛길 528, 547호",
      employerRep: c.employerRep || "이정용",
      startDate: c.startDate || todayStr,
      endDate: c.endDate || "",
      workplace: c.workplace || "서울시 금천구 벚꽃로278, SJ테크노빌 B155호",
      jobDescription:
        c.jobDescription || "주식회사 현대렌탈서비스의 렌탈자산 입/출고/배송 설치 등",
      workStartTime: c.workStartTime || "09:00",
      workEndTime: c.workEndTime || "18:00",
      breakMinutes: c.breakMinutes ?? 60,
      workDays: c.workDays || "매주 월~금요일 근무",
      weeklyHoliday: c.weeklyHoliday || "주휴일 매주 토~일요일",
      baseSalary: Number(c.baseSalary || 0),
      hourlyWageNote: c.hourlyWageNote || "시급은 통상시급",
      mealAllowance: Number(c.mealAllowance || 0),
      vehicleAllowance: Number(c.vehicleAllowance || 0),
      otherAllowance: Number(c.otherAllowance || 0),
      otherAllowanceLabel: c.otherAllowanceLabel || "",
      payDay: Number(c.payDay || 10),
      payMethod: c.payMethod || "근로자 명의 예금통장에 입금",
      contractDate: c.contractDate || c.startDate || todayStr,
      scanFileName: c.scanFileName || "",
      scanFileUrl: c.scanFileUrl || "",
      memo: c.memo || "",
      syncEmployeeMaster: true,
      registerNewEmployee: false,
      newEmployeePosition: c.position || "사원",
      newEmployeeDepartment: c.department || "렌탈운영팀",
    });
  };

  // 신입 채용 기본 양식 초기화
  const handleStartNewHire = () => {
    setSelectedContractId(null);
    setRightViewMode("DOCUMENT");
    setStatusMsg("신입 직원 채용 근로계약서 작성 모드입니다.");
    setForm({
      id: 0,
      contractNo: "",
      contractYear: currentYearStr,
      contractType: "NEW_HIRE",
      status: "SIGNED",
      employeeId: "",
      employeeName: "",
      employeePhone: "",
      employeeAddress: "",
      employerName: "주식회사 드래곤알피에이",
      employerPhone: "010-9224-4097",
      employerAddress: "서울 금천구 서부샛길 528, 547호",
      employerRep: "이정용",
      startDate: todayStr,
      endDate: "",
      workplace: "서울시 금천구 벚꽃로278, SJ테크노빌 B155호",
      jobDescription: "주식회사 현대렌탈서비스의 렌탈자산 입/출고/배송 설치 등",
      workStartTime: "09:00",
      workEndTime: "18:00",
      breakMinutes: 60,
      workDays: "매주 월~금요일 근무",
      weeklyHoliday: "주휴일 매주 토~일요일",
      baseSalary: 2800000,
      hourlyWageNote: "시급은 통상시급",
      mealAllowance: 200000,
      vehicleAllowance: 0,
      otherAllowance: 0,
      otherAllowanceLabel: "",
      payDay: 10,
      payMethod: "근로자 명의 예금통장에 입금",
      contractDate: todayStr,
      scanFileName: "",
      scanFileUrl: "",
      memo: `${currentYearStr}년 신입 직원 채용 근로계약`,
      syncEmployeeMaster: true,
      registerNewEmployee: true,
      newEmployeePosition: "사원",
      newEmployeeDepartment: "렌탈운영팀",
    });
  };

  // 연봉협상 재계약 기본 양식 초기화
  const handleStartRenewal = (empId?: number) => {
    const targetEmp =
      employees.find((e) => e.id === empId) ||
      employees.find((e) => e.id === Number(form.employeeId)) ||
      employees.find((e) => e.status === "ACTIVE" && e.id !== 1) ||
      employees[0];

    setSelectedContractId(null);
    setRightViewMode("DOCUMENT");
    setStatusMsg("연봉협상 후 재계약 체결 작성 모드입니다. 변경된 기본급/식대를 입력하세요.");

    const janFirst = `${currentYearStr}-01-01`;
    setForm({
      id: 0,
      contractNo: "",
      contractYear: currentYearStr,
      contractType: "RENEWAL",
      status: "SIGNED",
      employeeId: targetEmp ? targetEmp.id : "",
      employeeName: targetEmp ? targetEmp.name.replace(" 대표이사", "") : "",
      employeePhone: targetEmp?.phone || "",
      employeeAddress: targetEmp?.address || "",
      employerName: "주식회사 드래곤알피에이",
      employerPhone: "010-9224-4097",
      employerAddress: "서울 금천구 서부샛길 528, 547호",
      employerRep: "이정용",
      startDate: janFirst,
      endDate: `${currentYearStr}-12-31`,
      workplace: "서울시 금천구 벚꽃로278, SJ테크노빌 B155호",
      jobDescription: "주식회사 현대렌탈서비스의 렌탈자산 입/출고/배송 설치 등",
      workStartTime: "09:00",
      workEndTime: "18:00",
      breakMinutes: 60,
      workDays: "매주 월~금요일 근무",
      weeklyHoliday: "주휴일 매주 토~일요일",
      baseSalary: targetEmp ? Number(targetEmp.baseSalary || 2800000) : 2800000,
      hourlyWageNote: "시급은 통상시급",
      mealAllowance: targetEmp ? Number(targetEmp.mealAllowance || 200000) : 200000,
      vehicleAllowance: targetEmp ? Number(targetEmp.vehicleAllowance || 0) : 0,
      otherAllowance: 0,
      otherAllowanceLabel: "",
      payDay: 10,
      payMethod: "근로자 명의 예금통장에 입금",
      contractDate: janFirst,
      scanFileName: "",
      scanFileUrl: "",
      memo: `${currentYearStr}년 연봉협상 재계약 체결`,
      syncEmployeeMaster: true,
      registerNewEmployee: false,
      newEmployeePosition: targetEmp?.position || "사원",
      newEmployeeDepartment: targetEmp?.department || "렌탈운영팀",
    });
  };

  // 사원 드롭다운 선택 시 사원 기본 정보 자동 로드
  const handleSelectEmployee = (empIdStr: string) => {
    if (!empIdStr) {
      setForm((prev) => ({ ...prev, employeeId: "" }));
      return;
    }
    const emp = employees.find((e) => String(e.id) === empIdStr);
    if (!emp) return;

    setForm((prev) => ({
      ...prev,
      employeeId: emp.id,
      employeeName: emp.name.replace(" 대표이사", ""),
      employeePhone: emp.phone || prev.employeePhone,
      employeeAddress: emp.address || prev.employeeAddress,
      baseSalary: Number(emp.baseSalary || prev.baseSalary),
      mealAllowance: Number(emp.mealAllowance || prev.mealAllowance),
      vehicleAllowance: Number(emp.vehicleAllowance || prev.vehicleAllowance),
      registerNewEmployee: false,
    }));
  };

  // 스캔 파일 업로드 및 AI OCR 자동 판독
  const handleScanFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setStatusMsg("스캔된 근로계약서 파일을 분석하고 있습니다...");

    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/erp/employment-contracts/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: dataUrl,
          imageBase64: dataUrl.startsWith("data:image/") ? dataUrl : undefined,
          fileName: file.name,
        }),
      });
      const data = await res.json();

      if (data.success && data.parsed) {
        const p = data.parsed;
        const matchedEmp = employees.find(
          (emp) => p.employeeName && emp.name.includes(p.employeeName)
        );

        setForm((prev) => ({
          ...prev,
          employeeId: matchedEmp ? matchedEmp.id : prev.employeeId,
          employeeName: p.employeeName || prev.employeeName,
          employeePhone: p.employeePhone || matchedEmp?.phone || prev.employeePhone,
          employeeAddress: p.employeeAddress || matchedEmp?.address || prev.employeeAddress,
          startDate: p.startDate || prev.startDate,
          endDate: p.endDate || prev.endDate,
          contractYear: p.contractYear || (p.startDate ? p.startDate.slice(0, 4) : prev.contractYear),
          workplace: p.workplace || prev.workplace,
          jobDescription: p.jobDescription || prev.jobDescription,
          workStartTime: p.workStartTime || prev.workStartTime,
          workEndTime: p.workEndTime || prev.workEndTime,
          breakMinutes: p.breakMinutes || prev.breakMinutes,
          baseSalary: p.baseSalary > 0 ? p.baseSalary : prev.baseSalary,
          hourlyWageNote: p.hourlyWageNote || prev.hourlyWageNote,
          mealAllowance:
            p.mealAllowance !== undefined ? p.mealAllowance : prev.mealAllowance,
          vehicleAllowance:
            p.vehicleAllowance !== undefined ? p.vehicleAllowance : prev.vehicleAllowance,
          payDay: p.payDay || prev.payDay,
          contractDate: p.contractDate || p.startDate || prev.contractDate,
          scanFileName: file.name,
          scanFileUrl: dataUrl,
        }));
        setRightViewMode("SCAN");
        setStatusMsg(
          data.message || "근로계약서 스캔본 첨부 및 항목 추출이 완료되었습니다. [저장]을 눌러 보관하세요."
        );
      } else {
        setForm((prev) => ({
          ...prev,
          scanFileName: file.name,
          scanFileUrl: dataUrl,
        }));
        setRightViewMode("SCAN");
        setStatusMsg("스캔 파일이 첨부되었습니다.");
      }
    } catch (err: any) {
      console.error("Scan upload error:", err);
      setStatusMsg("스캔 파일 처리 중 오류: " + err.message);
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 근로계약서 DB 저장 (신규 등록 또는 수정)
  const handleSaveContract = async () => {
    if (!form.employeeName.trim()) {
      alert("근로자 성명을 입력해 주십시오.");
      return;
    }

    setSaving(true);
    setStatusMsg("");
    try {
      const isUpdate = Boolean(selectedContractId && form.id > 0);
      const method = isUpdate ? "PUT" : "POST";

      const res = await fetch("/api/erp/employment-contracts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          createdBy: currentUser?.name || "ADMIN",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(data.message || "근로계약서가 저장되었습니다.");
        await fetchAllData();
        if (!isUpdate && data.contract?.id) {
          setSelectedContractId(data.contract.id);
        }
      } else {
        alert(data.error || "저장 실패");
      }
    } catch (err: any) {
      alert("저장 중 오류 발생: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContract = async (id: number, name: string) => {
    if (!confirm(`${name} 근로계약서를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/erp/employment-contracts?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (selectedContractId === id) {
          setSelectedContractId(null);
        }
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 근로계약서 인쇄 (A4 표준 양식)
  const handlePrintContract = () => {
    window.print();
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          c.employeeName.toLowerCase().includes(q) ||
          c.contractNo.toLowerCase().includes(q) ||
          (c.jobDescription || "").toLowerCase().includes(q) ||
          (c.memo || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [contracts, searchQuery]);

  // 날짜 포맷 헬퍼 (YYYY-MM-DD -> 2026 년 04 월 20 일)
  const formatKoreanDateParts = (dateStr: string) => {
    if (!dateStr || !dateStr.includes("-")) {
      return { y: "2026", m: "01", d: "01" };
    }
    const [y, m, d] = dateStr.split("-");
    return { y: y || "2026", m: m || "01", d: d || "01" };
  };

  const startParts = formatKoreanDateParts(form.startDate);
  const contractParts = formatKoreanDateParts(form.contractDate);
  const totalMonthly =
    Number(form.baseSalary || 0) +
    Number(form.mealAllowance || 0) +
    Number(form.vehicleAllowance || 0) +
    Number(form.otherAllowance || 0);
  const totalAnnual = totalMonthly * 12;

  return (
    <div className="flex flex-col min-h-full md:h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 md:overflow-hidden font-sans">
      {/* 인쇄 시에만 보이는 A4 근로계약서 전용 스타일 */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-employment-contract,
          #printable-employment-contract * {
            visibility: visible !important;
          }
          #printable-employment-contract {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 18mm 20mm !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 99999 !important;
          }
        }
      `}</style>

      {/* 1. 상단 조회 조건(좌상단) & 작성/스캔 액션 파이프라인(우상단) 바 */}
      <div className="p-2.5 md:p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-end justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-end gap-2 w-full lg:w-auto">
          {/* 연도별 조회 */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              계약 연도별 조회
            </label>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {[
                { key: "ALL", label: "전체 연도" },
                { key: "2026", label: "2026년" },
                { key: "2025", label: "2025년" },
                { key: "2024", label: "2024년" },
                { key: "2023", label: "2023년" },
              ].map((y) => (
                <button
                  key={y.key}
                  type="button"
                  onClick={() => setYearFilter(y.key)}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded border whitespace-nowrap shrink-0 transition ${
                    yearFilter === y.key
                      ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                      : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  }`}
                >
                  {y.label}
                </button>
              ))}
            </div>
          </div>

          {/* 계약 구분 필터 */}
          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              계약 유형
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs px-2 py-1.5 rounded font-semibold focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 (신입+재계약)</option>
              <option value="NEW_HIRE">신입 직원 채용</option>
              <option value="RENEWAL">연봉협상 재계약</option>
            </select>
          </div>

          {/* 검색어 */}
          <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[170px]">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              사원명·계약번호 검색
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#475569]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="성명, 업무내용 검색"
                className="bg-[#f4efe4] border border-[#b5a894] text-xs pl-8 pr-2.5 py-1.5 rounded w-full focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>
        </div>

        {/* 우측 상단 액션 버튼군: 신입채용 작성 / 연봉협상 재계약 / 과거 계약서 스캔 등록 / 인쇄 */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={fetchAllData}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleStartNewHire}
            className="px-2.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ 신입 채용 계약서 작성</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartRenewal()}
            className="px-2.5 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap transition"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+ 연봉협상 재계약 작성</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={handleScanFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={ocrLoading}
            className="px-2.5 py-1.5 bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap transition disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{ocrLoading ? "스캔 분석 중..." : "과거 계약서 스캔 등록"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintContract}
            className="px-2.5 py-1.5 bg-[#334155] hover:bg-[#1e293b] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>계약서 인쇄</span>
          </button>
        </div>
      </div>

      {/* 상태 알림 바 */}
      {statusMsg && (
        <div className="px-3 py-1.5 bg-[#dbeafe] border-b border-[#93c5fd] text-[#1e40af] text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg("")}
            className="text-xs hover:underline"
          >
            닫기
          </button>
        </div>
      )}

      {/* 2. 본문 마스터-디테일 스튜디오 (좌측: 연도별 이력 & 입력 폼 / 우측: 표준 근로계약서 양식 & 스캔본 뷰어) */}
      <div className="flex-1 md:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 p-2.5 md:p-3">
        {/* 좌측 (5열): 연도별 근로계약서 보관 대장 + 근로조건 편집 폼 */}
        <div className="lg:col-span-5 flex flex-col gap-3 md:overflow-y-auto pr-0.5">
          {/* 2-1. 연도별 근로계약서 보관 목록 */}
          <div className="bg-[#f4efe4] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 shrink-0">
            <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <FileSignature className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
                <span className="whitespace-nowrap">
                  연도별 근로계약서 보관 대장 ({filteredContracts.length}건)
                </span>
              </div>
              <span className="text-[11px] text-[#475569] dark:text-slate-400 whitespace-nowrap">
                행 클릭 시 양식/스캔본 조회
              </span>
            </div>

            <div className="max-h-[230px] overflow-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#dcd4c4] text-[#0f172a] font-bold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-1.5 px-2.5 whitespace-nowrap">연도</th>
                    <th className="py-1.5 px-2.5 whitespace-nowrap">구분</th>
                    <th className="py-1.5 px-2.5 whitespace-nowrap">성명</th>
                    <th className="py-1.5 px-2.5 text-right whitespace-nowrap">기본급(월)</th>
                    <th className="py-1.5 px-2.5 text-right whitespace-nowrap">식대/수당</th>
                    <th className="py-1.5 px-2.5 whitespace-nowrap">계약개시일</th>
                    <th className="py-1.5 px-2.5 text-center whitespace-nowrap">스캔본</th>
                    <th className="py-1.5 px-2 text-center whitespace-nowrap">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d5cbb8] dark:divide-slate-800">
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-[#64748b] whitespace-nowrap">
                        조회된 근로계약서가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((c) => {
                      const isSelected = selectedContractId === c.id;
                      const tMeta =
                        CONTRACT_TYPE_LABELS[c.contractType] || CONTRACT_TYPE_LABELS.NEW_HIRE;
                      const allowanceSum =
                        Number(c.mealAllowance || 0) +
                        Number(c.vehicleAllowance || 0) +
                        Number(c.otherAllowance || 0);

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
                          <td className="py-1.5 px-2.5 font-mono font-bold whitespace-nowrap">
                            {c.contractYear}년
                          </td>
                          <td className="py-1.5 px-2.5 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tMeta.badgeClass}`}
                            >
                              {tMeta.label}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5 font-bold whitespace-nowrap">
                            {c.employeeName}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono whitespace-nowrap">
                            {formatErpCurrency(c.baseSalary)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono whitespace-nowrap">
                            {formatErpCurrency(allowanceSum)}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono whitespace-nowrap">
                            {c.startDate}
                          </td>
                          <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                            {c.scanFileUrl ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadContractIntoForm(c);
                                  setRightViewMode("SCAN");
                                }}
                                className="px-1.5 py-0.5 rounded bg-[#ede9fe] text-[#5b21b6] border border-[#c4b5fd] text-[10px] font-bold hover:bg-[#ddd6fe]"
                              >
                                스캔보기
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#94a3b8]">-</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center whitespace-nowrap">
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

          {/* 2-2. 근로계약 상세 입력·편집 패널 (헌장 3.4 상하 스택 레이아웃 준수) */}
          <div className="bg-[#f4efe4] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 flex flex-col">
            <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span>
                  {selectedContractId
                    ? `근로계약 조건 편집 (${form.employeeName} · ${form.contractYear}년)`
                    : form.contractType === "NEW_HIRE"
                    ? "신입 직원 채용 근로계약 조건 입력"
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
                <span>{saving ? "저장 중..." : selectedContractId ? "계약서 수정 저장" : "신규 계약서 저장"}</span>
              </button>
            </div>

            <div className="p-3 space-y-2.5 text-xs">
              {/* 1행: 계약유형 / 귀속연도 / 기존사원 불러오기 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    계약 구분
                  </label>
                  <select
                    value={form.contractType}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        contractType: e.target.value as "NEW_HIRE" | "RENEWAL",
                      }))
                    }
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 font-bold text-xs"
                  >
                    <option value="NEW_HIRE">신입 직원 채용</option>
                    <option value="RENEWAL">연봉협상 재계약</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    계약 귀속연도
                  </label>
                  <input
                    type="text"
                    value={form.contractYear}
                    onChange={(e) => setForm((prev) => ({ ...prev, contractYear: e.target.value }))}
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 font-mono font-bold text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    기존 사원 선택 (자동완성)
                  </label>
                  <select
                    value={String(form.employeeId || "")}
                    onChange={(e) => handleSelectEmployee(e.target.value)}
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 text-xs font-semibold"
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

              {/* 2행: 근로자 성명 / 연락처 / 계약체결일 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    근로자 성명
                  </label>
                  <input
                    type="text"
                    value={form.employeeName}
                    onChange={(e) => setForm((prev) => ({ ...prev, employeeName: e.target.value }))}
                    placeholder="예: 박종환"
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 font-bold text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    근로자 연락처
                  </label>
                  <input
                    type="text"
                    value={form.employeePhone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, employeePhone: e.target.value }))
                    }
                    placeholder="010-0000-0000"
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 font-mono text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    계약 체결일
                  </label>
                  <input
                    type="date"
                    value={form.contractDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, contractDate: e.target.value }))
                    }
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 font-mono text-xs"
                  />
                </div>
              </div>

              {/* 3행: 근로자 주소 */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                  근로자 주소
                </label>
                <input
                  type="text"
                  value={form.employeeAddress}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, employeeAddress: e.target.value }))
                  }
                  placeholder="서울 금천구 시흥대로146길 25-19"
                  className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 text-xs"
                />
              </div>

              {/* 4행: 근로계약기간 (개시일 / 종료일) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    1. 근로계약 개시일
                  </label>
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
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 font-mono text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    근로계약 종료일 (정함이 없으면 비움)
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 font-mono text-xs"
                  />
                </div>
              </div>

              {/* 5행: 근무장소 & 업무의 내용 */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                  2. 근무장소
                </label>
                <input
                  type="text"
                  value={form.workplace}
                  onChange={(e) => setForm((prev) => ({ ...prev, workplace: e.target.value }))}
                  className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                  3. 업무의 내용
                </label>
                <input
                  type="text"
                  value={form.jobDescription}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, jobDescription: e.target.value }))
                  }
                  className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 text-xs"
                />
              </div>

              {/* 6행: 임금 (기본급, 식대, 차량보조금, 시급표기) */}
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
                    <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                      월 기본급 (원)
                    </label>
                    <input
                      type="number"
                      step={10000}
                      value={form.baseSalary}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          baseSalary: Number(e.target.value || 0),
                        }))
                      }
                      className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono font-bold text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                      식대 (원)
                    </label>
                    <input
                      type="number"
                      step={10000}
                      value={form.mealAllowance}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mealAllowance: Number(e.target.value || 0),
                        }))
                      }
                      className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono font-bold text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                      차량보조금 (원)
                    </label>
                    <input
                      type="number"
                      step={10000}
                      value={form.vehicleAllowance}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          vehicleAllowance: Number(e.target.value || 0),
                        }))
                      }
                      className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono font-bold text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                      시급 표기
                    </label>
                    <input
                      type="text"
                      value={form.hourlyWageNote}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, hourlyWageNote: e.target.value }))
                      }
                      className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 7행: 근로시간 및 임금지급일 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    시업 시각
                  </label>
                  <input
                    type="text"
                    value={form.workStartTime}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, workStartTime: e.target.value }))
                    }
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    종업 시각
                  </label>
                  <input
                    type="text"
                    value={form.workEndTime}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, workEndTime: e.target.value }))
                    }
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    임금지급일 (매월)
                  </label>
                  <input
                    type="number"
                    value={form.payDay}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, payDay: Number(e.target.value || 10) }))
                    }
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 font-mono text-xs"
                  />
                </div>
              </div>

              {/* 8행: 비고 메모 및 사원대장 동기화 옵션 */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                  계약 이력 메모 (특이사항)
                </label>
                <input
                  type="text"
                  value={form.memo}
                  onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
                  placeholder="예: 2026년 연봉협상 인상 재계약 체결"
                  className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 text-xs"
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
                  <span>저장 시 인사/급여 사원대장의 기본급·식대·주소 자동 업데이트</span>
                </label>

                {!form.employeeId && (
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-[#047857] dark:text-emerald-400">
                    <input
                      type="checkbox"
                      checked={form.registerNewEmployee}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          registerNewEmployee: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span>신규 입사자로 사원대장 동시 등록</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 우측 (7열): 표준 근로계약서 양식 실시간 프리뷰 / 스캔 원본 뷰어 */}
        <div className="lg:col-span-7 flex flex-col bg-[#f4efe4] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          {/* 우측 상단 뷰 전환 탭 */}
          <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRightViewMode("DOCUMENT")}
                className={`px-3 py-1 rounded text-xs font-bold border transition ${
                  rightViewMode === "DOCUMENT"
                    ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                    : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                }`}
              >
                표준 근로계약서 양식 (인쇄용)
              </button>
              <button
                type="button"
                onClick={() => setRightViewMode("SCAN")}
                className={`px-3 py-1 rounded text-xs font-bold border transition flex items-center gap-1 ${
                  rightViewMode === "SCAN"
                    ? "bg-[#6d28d9] text-white border-[#5b21b6]"
                    : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>
                  스캔 원본 조회 {form.scanFileUrl ? `(보유: ${form.scanFileName || "파일"})` : "(미첨부)"}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {rightViewMode === "SCAN" && form.scanFileUrl && (
                <a
                  href={form.scanFileUrl}
                  download={form.scanFileName || `근로계약서_${form.employeeName}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded"
                >
                  스캔본 다운로드
                </a>
              )}
              <button
                type="button"
                onClick={handlePrintContract}
                className="px-2.5 py-1 bg-[#334155] hover:bg-[#1e293b] text-white text-xs font-bold rounded flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>A4 출력</span>
              </button>
            </div>
          </div>

          {/* 우측 본문 영역 */}
          <div className="flex-1 overflow-y-auto p-3 md:p-5 bg-[#dcd4c4] dark:bg-slate-950 flex justify-center">
            {rightViewMode === "SCAN" ? (
              form.scanFileUrl ? (
                <div className="w-full h-full min-h-[650px] bg-white rounded border border-[#b5a894] overflow-hidden flex flex-col">
                  {form.scanFileUrl.startsWith("data:image/") ||
                  /\.(png|jpg|jpeg|webp)$/i.test(form.scanFileUrl) ? (
                    <img
                      src={form.scanFileUrl}
                      alt="근로계약서 스캔본"
                      className="max-w-full h-auto mx-auto p-4"
                    />
                  ) : (
                    <iframe
                      src={form.scanFileUrl}
                      title="근로계약서 스캔 PDF"
                      className="w-full flex-1 min-h-[680px]"
                    />
                  )}
                </div>
              ) : (
                <div className="w-full max-w-lg my-auto p-8 bg-[#f4efe4] dark:bg-slate-900 rounded border border-[#b5a894] dark:border-slate-800 text-center space-y-3">
                  <FileText className="w-10 h-10 mx-auto text-[#64748b]" />
                  <div className="text-sm font-bold">
                    등록된 스캔본 파일이 없습니다 ({form.employeeName} · {form.contractYear}년)
                  </div>
                  <p className="text-xs text-[#475569] dark:text-slate-400">
                    서명 완료된 근로계약서 스캔본(PDF 또는 이미지)을 업로드하면 연도별로 영구 보관하고 언제든 조회할 수 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-xs font-bold rounded inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>이 계약서의 스캔본 파일 업로드</span>
                  </button>
                </div>
              )
            ) : (
              /* 표준 근로계약서 A4 문서 양식 (제공된 박종환/장종순/김승지 계약서 양식 100% 재현) */
              <div
                id="printable-employment-contract"
                className="w-full max-w-[760px] bg-white text-black p-6 md:p-10 rounded shadow-md border border-[#b5a894] font-serif leading-relaxed text-[13.5px]"
              >
                {/* 타이틀 박스 */}
                <div className="border border-black py-2.5 px-8 mx-auto w-64 text-center mb-7">
                  <h1 className="text-xl font-bold tracking-[0.25em]">근 로 계 약 서</h1>
                </div>

                {/* 전문 */}
                <p className="mb-5 leading-7 text-[14px]">
                  <span className="inline-block border-b border-black px-2 font-bold">
                    {form.employerName}
                  </span>{" "}
                  (이하 &ldquo;사업주&rdquo;라 함)과(와){" "}
                  <span className="inline-block border-b border-black px-3 font-bold">
                    {form.employeeName || "          "}
                  </span>{" "}
                  (이하 &ldquo;근로자&rdquo;라 함)은 다음과 같이 근로계약을 체결한다.
                </p>

                {/* 조항 1 ~ 9 */}
                <div className="space-y-3.5 text-[13.5px]">
                  <div>
                    <div className="font-semibold">
                      1. 근로계약기간 :{" "}
                      <span className="font-bold">
                        {startParts.y} 년 {startParts.m} 월 {startParts.d} 일부터
                      </span>
                      {form.endDate ? (
                        <span className="font-bold">
                          {" "}
                          ~ {formatKoreanDateParts(form.endDate).y} 년{" "}
                          {formatKoreanDateParts(form.endDate).m} 월{" "}
                          {formatKoreanDateParts(form.endDate).d} 일까지
                        </span>
                      ) : (
                        ""
                      )}
                    </div>
                    <div className="text-[11.5px] text-neutral-700 pl-4 mt-0.5">
                      ※ 근로계약기간을 정하지 않는 경우에는 &ldquo;근로개시일&rdquo;만 기재
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold">2. 근 무 장 소 : </span>
                    <span>{form.workplace}</span>
                  </div>

                  <div>
                    <span className="font-semibold">3. 업무의 내용 : </span>
                    <span>{form.jobDescription}</span>
                  </div>

                  <div>
                    <span className="font-semibold">4. 소정근로시간 : </span>
                    <span className="underline underline-offset-4">
                      {form.workStartTime.split(":")[0] || "09"} 시{" "}
                      {form.workStartTime.split(":")[1] || "00"} 분
                    </span>
                    부터{" "}
                    <span className="underline underline-offset-4">
                      {form.workEndTime.split(":")[0] || "18"} 시{" "}
                      {form.workEndTime.split(":")[1] || "00"} 분
                    </span>
                    까지 (휴게시간 : 총 {form.breakMinutes}분)
                  </div>

                  <div>
                    <span className="font-semibold">5. 근무일/휴일 : </span>
                    <span>
                      {form.workDays}, {form.weeklyHoliday}
                    </span>
                  </div>

                  <div>
                    <div className="font-semibold mb-1">6. 임 금</div>
                    <div className="pl-4 space-y-1">
                      <div>
                        - 월(일, 시간)급 :{" "}
                        <span className="font-bold underline underline-offset-4">
                          월 {Number(form.baseSalary || 0).toLocaleString()} 원
                        </span>{" "}
                        ({form.hourlyWageNote || "시급은 통상시급"})
                      </div>
                      <div>
                        - 기타급여(제수당 등) :{" "}
                        <span>
                          식대 월 {Number(form.mealAllowance || 0).toLocaleString()} 원
                          {Number(form.vehicleAllowance || 0) > 0
                            ? `, 차량보조금 월 ${Number(
                                form.vehicleAllowance
                              ).toLocaleString()} 원`
                            : ""}
                          {Number(form.otherAllowance || 0) > 0
                            ? `, ${form.otherAllowanceLabel || "기타수당"} 월 ${Number(
                                form.otherAllowance
                              ).toLocaleString()} 원`
                            : ""}
                        </span>
                      </div>
                      <div>
                        - 임금지급일 : 매월(매주 또는 매일){" "}
                        <span className="font-bold underline underline-offset-4">
                          {form.payDay} 일
                        </span>
                        (휴일의 경우는 전일 지급)
                      </div>
                      <div>- 지급방법 : {form.payMethod}</div>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold">7. 연차유급휴가</div>
                    <div className="pl-4">
                      - 연차유급휴가는 근로기준법에서 정하는 바에 따라 부여함
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold">8. 근로계약서 교부</div>
                    <div className="pl-4">
                      - 사업주는 근로계약을 체결함과 동시에 본 계약서를 사본하여 근로자의
                      교부요구와 관계없이 근로자에게 교부함(근로기준법 제17조 이행)
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold">9. 기 타</div>
                    <div className="pl-4">
                      - 이 계약에 정함이 없는 사항은 근로기준법령에 의함
                    </div>
                  </div>
                </div>

                {/* 계약 체결일 */}
                <div className="text-center font-bold text-[15px] my-7 tracking-widest">
                  {contractParts.y} 년 {contractParts.m} 월 {contractParts.d} 일
                </div>

                {/* 사업주 & 근로자 서명란 */}
                <div className="space-y-4 text-[13.5px] pt-2 border-t border-neutral-300">
                  <div className="grid grid-cols-12 gap-y-1">
                    <div className="col-span-2 font-bold">(사업주)</div>
                    <div className="col-span-10 space-y-1">
                      <div className="flex justify-between">
                        <span>사업체명 : {form.employerName}</span>
                        <span>(전화 : {form.employerPhone})</span>
                      </div>
                      <div>주 소 : {form.employerAddress}</div>
                      <div className="flex items-center justify-between pt-1">
                        <span>대 표 자 : {form.employerRep}</span>
                        <span className="pr-8 font-semibold">(서명)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-y-1 pt-2">
                    <div className="col-span-2 font-bold">(근로자)</div>
                    <div className="col-span-10 space-y-1">
                      <div>주 소 : {form.employeeAddress}</div>
                      <div>연 락 처 : {form.employeePhone}</div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold">성 명 : {form.employeeName}</span>
                        <span className="pr-8 font-semibold">(서명)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
