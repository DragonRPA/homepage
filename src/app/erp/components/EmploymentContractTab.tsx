"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileSignature,
  RefreshCw,
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
  ShieldCheck,
} from "lucide-react";
import { formatErpCurrency } from "@/lib/erpFormat";

export interface EmploymentContractItem {
  id: number;
  contractNo: string;
  contractYear: string;
  contractType: "NEW_HIRE" | "RENEWAL" | "SECURITY_PLEDGE";
  status: "DRAFT" | "SIGNED" | "ARCHIVED" | "EXPIRED";
  employeeId: number | null;
  employeeName: string;
  employeePhone: string;
  employeeAddress: string;
  residentRegNo: string;
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
  pledgeDate: string | null;
  pledgeScanName: string | null;
  pledgeScanUrl: string | null;
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
  "NEW_HIRE" | "RENEWAL" | "SECURITY_PLEDGE",
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
  SECURITY_PLEDGE: {
    label: "보안서약서(입사1회)",
    badgeClass:
      "bg-[#ede9fe] text-[#5b21b6] border border-[#c4b5fd] dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30",
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

  // 선택된 계약서 및 우측 뷰 모드: DOCUMENT(근로계약서) | SCAN(근로계약서 스캔) | PLEDGE_DOC(정보보호서약서 양식) | PLEDGE_SCAN(보안서약서 스캔)
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [rightViewMode, setRightViewMode] = useState<
    "DOCUMENT" | "SCAN" | "PLEDGE_DOC" | "PLEDGE_SCAN"
  >("DOCUMENT");

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentYearStr = todayStr.slice(0, 4);

  const [form, setForm] = useState({
    id: 0,
    contractNo: "",
    contractYear: currentYearStr,
    contractType: "NEW_HIRE" as "NEW_HIRE" | "RENEWAL" | "SECURITY_PLEDGE",
    status: "SIGNED" as "DRAFT" | "SIGNED" | "ARCHIVED" | "EXPIRED",
    employeeId: "" as string | number,
    employeeName: "박종환",
    employeePhone: "010-8683-9775",
    employeeAddress: "서울 금천구 시흥대로146길 25-19",
    residentRegNo: "",
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
    pledgeDate: "2026-04-20",
    pledgeScanName: "",
    pledgeScanUrl: "",
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
  const pledgeFileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (c.contractType === "SECURITY_PLEDGE") {
      setRightViewMode(c.pledgeScanUrl || c.scanFileUrl ? "PLEDGE_SCAN" : "PLEDGE_DOC");
    } else if (rightViewMode === "PLEDGE_SCAN" && !c.pledgeScanUrl) {
      setRightViewMode("DOCUMENT");
    }
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
      residentRegNo: c.residentRegNo || "",
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
      pledgeDate: c.pledgeDate || c.contractDate || c.startDate || todayStr,
      pledgeScanName: c.pledgeScanName || "",
      pledgeScanUrl: c.pledgeScanUrl || "",
      memo: c.memo || "",
      syncEmployeeMaster: true,
      registerNewEmployee: false,
      newEmployeePosition: c.position || "사원",
      newEmployeeDepartment: c.department || "렌탈운영팀",
    });
  };

  // 신입 채용 기본 양식 초기화 (입사 시 근로계약서 + 정보보호서약서 1회 동시 작성 가능)
  const handleStartNewHire = () => {
    setSelectedContractId(null);
    setRightViewMode("DOCUMENT");
    setStatusMsg("신입 직원 채용 근로계약서(및 입사 시 1회 보안서약서) 작성 모드입니다.");
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
      residentRegNo: "",
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
      pledgeDate: todayStr,
      pledgeScanName: "",
      pledgeScanUrl: "",
      memo: `${currentYearStr}년 신입 직원 채용 근로계약 및 정보보호 서약`,
      syncEmployeeMaster: true,
      registerNewEmployee: true,
      newEmployeePosition: "사원",
      newEmployeeDepartment: "렌탈운영팀",
    });
  };

  // 입사 시 1회 정보보호(보안)서약서 전용 작성 모드
  const handleStartSecurityPledge = () => {
    const targetEmp =
      employees.find((e) => e.id === Number(form.employeeId)) ||
      employees.find((e) => e.status === "ACTIVE" && e.id !== 1) ||
      employees[0];

    const joinDt = targetEmp?.joinDate || todayStr;
    setSelectedContractId(null);
    setRightViewMode("PLEDGE_DOC");
    setStatusMsg("입사 시 1회 작성하는 정보보호(보안) 서약서 작성 및 보관 모드입니다.");
    setForm((prev) => ({
      ...prev,
      id: 0,
      contractNo: "",
      contractYear: joinDt.slice(0, 4) || currentYearStr,
      contractType: "SECURITY_PLEDGE",
      status: "SIGNED",
      employeeId: targetEmp ? targetEmp.id : "",
      employeeName: targetEmp ? targetEmp.name.replace(" 대표이사", "") : prev.employeeName,
      employeePhone: targetEmp?.phone || prev.employeePhone,
      employeeAddress: targetEmp?.address || prev.employeeAddress,
      startDate: joinDt,
      contractDate: joinDt,
      pledgeDate: joinDt,
      memo: "입사 시 정보보호(보안) 서약서 1회 작성 보관",
    }));
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
    setForm((prev) => ({
      ...prev,
      id: 0,
      contractNo: "",
      contractYear: currentYearStr,
      contractType: "RENEWAL",
      status: "SIGNED",
      employeeId: targetEmp ? targetEmp.id : "",
      employeeName: targetEmp ? targetEmp.name.replace(" 대표이사", "") : "",
      employeePhone: targetEmp?.phone || "",
      employeeAddress: targetEmp?.address || "",
      startDate: janFirst,
      endDate: `${currentYearStr}-12-31`,
      workplace: "서울시 금천구 벚꽃로278, SJ테크노빌 B155호",
      jobDescription: "주식회사 현대렌탈서비스의 렌탈자산 입/출고/배송 설치 등",
      baseSalary: targetEmp ? Number(targetEmp.baseSalary || 2800000) : 2800000,
      mealAllowance: targetEmp ? Number(targetEmp.mealAllowance || 200000) : 200000,
      vehicleAllowance: targetEmp ? Number(targetEmp.vehicleAllowance || 0) : 0,
      contractDate: janFirst,
      scanFileName: "",
      scanFileUrl: "",
      memo: `${currentYearStr}년 연봉협상 재계약 체결`,
      syncEmployeeMaster: true,
      registerNewEmployee: false,
    }));
  };

  // 사원 드롭다운 선택 시 사원 기본 정보 및 기존 보안서약서 정보 자동 로드
  const handleSelectEmployee = (empIdStr: string) => {
    if (!empIdStr) {
      setForm((prev) => ({ ...prev, employeeId: "" }));
      return;
    }
    const emp = employees.find((e) => String(e.id) === empIdStr);
    if (!emp) return;

    // 해당 사원의 기존 계약 중 보안서약서나 주민번호가 있는 레코드 참조
    const existingWithPledge = contracts.find(
      (c) => c.employeeId === emp.id && (c.pledgeScanUrl || c.residentRegNo)
    );

    setForm((prev) => ({
      ...prev,
      employeeId: emp.id,
      employeeName: emp.name.replace(" 대표이사", ""),
      employeePhone: emp.phone || prev.employeePhone,
      employeeAddress: emp.address || prev.employeeAddress,
      residentRegNo: existingWithPledge?.residentRegNo || prev.residentRegNo,
      pledgeDate: existingWithPledge?.pledgeDate || emp.joinDate || prev.pledgeDate,
      pledgeScanName: existingWithPledge?.pledgeScanName || prev.pledgeScanName,
      pledgeScanUrl: existingWithPledge?.pledgeScanUrl || prev.pledgeScanUrl,
      baseSalary: Number(emp.baseSalary || prev.baseSalary),
      mealAllowance: Number(emp.mealAllowance || prev.mealAllowance),
      vehicleAllowance: Number(emp.vehicleAllowance || prev.vehicleAllowance),
      registerNewEmployee: false,
    }));
  };

  // 근로계약서 스캔 파일 업로드 및 AI OCR 자동 판독
  const handleScanFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setStatusMsg("스캔된 문서를 분석하고 있습니다...");

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
        const isPledge = p.docKind === "PLEDGE" || /보안|서약|정보보호/.test(file.name);
        const matchedEmp = employees.find(
          (emp) => p.employeeName && emp.name.includes(p.employeeName)
        );

        if (isPledge) {
          setForm((prev) => ({
            ...prev,
            employeeId: matchedEmp ? matchedEmp.id : prev.employeeId,
            employeeName: p.employeeName || prev.employeeName,
            residentRegNo: p.residentRegNo || prev.residentRegNo,
            pledgeDate: p.contractDate || p.startDate || prev.pledgeDate,
            pledgeScanName: file.name,
            pledgeScanUrl: dataUrl,
          }));
          setRightViewMode("PLEDGE_SCAN");
          setStatusMsg(
            `${p.employeeName || ""} 보안서약서 스캔본이 첨부되었습니다. [저장]을 눌러 보관하세요.`
          );
        } else {
          setForm((prev) => ({
            ...prev,
            employeeId: matchedEmp ? matchedEmp.id : prev.employeeId,
            employeeName: p.employeeName || prev.employeeName,
            employeePhone: p.employeePhone || matchedEmp?.phone || prev.employeePhone,
            employeeAddress: p.employeeAddress || matchedEmp?.address || prev.employeeAddress,
            residentRegNo: p.residentRegNo || prev.residentRegNo,
            startDate: p.startDate || prev.startDate,
            endDate: p.endDate || prev.endDate,
            contractYear:
              p.contractYear || (p.startDate ? p.startDate.slice(0, 4) : prev.contractYear),
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
            data.message ||
              "근로계약서 스캔본 첨부 및 항목 추출이 완료되었습니다. [저장]을 눌러 보관하세요."
          );
        }
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

  // 보안서약서 전용 스캔 파일 업로드 핸들러
  const handlePledgeScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setStatusMsg("보안서약서 스캔 파일을 분석하고 있습니다...");

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
          residentRegNo: p.residentRegNo || prev.residentRegNo,
          pledgeDate: p.contractDate || p.startDate || prev.pledgeDate,
          pledgeScanName: file.name,
          pledgeScanUrl: dataUrl,
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          pledgeScanName: file.name,
          pledgeScanUrl: dataUrl,
        }));
      }
      setRightViewMode("PLEDGE_SCAN");
      setStatusMsg(
        "보안서약서 스캔본이 등록되었습니다. [계약서·보안서약서 저장] 버튼을 눌러 DB에 보관하세요."
      );
    } catch (err: any) {
      setStatusMsg("보안서약서 업로드 오류: " + err.message);
    } finally {
      setOcrLoading(false);
      if (pledgeFileInputRef.current) pledgeFileInputRef.current.value = "";
    }
  };

  // 근로계약서 & 보안서약서 DB 저장
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
        setStatusMsg(data.message || "저장되었습니다.");
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
    if (!confirm(`${name} 문서를 삭제하시겠습니까?`)) return;
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

  const handlePrintDocument = () => {
    if (rightViewMode === "SCAN") {
      setRightViewMode("DOCUMENT");
      setTimeout(() => window.print(), 100);
    } else if (rightViewMode === "PLEDGE_SCAN") {
      setRightViewMode("PLEDGE_DOC");
      setTimeout(() => window.print(), 100);
    } else {
      window.print();
    }
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

  const formatKoreanDateParts = (dateStr: string) => {
    if (!dateStr || !dateStr.includes("-")) {
      return { y: "2026", m: "01", d: "01" };
    }
    const [y, m, d] = dateStr.split("-");
    return { y: y || "2026", m: m || "01", d: d || "01" };
  };

  const startParts = formatKoreanDateParts(form.startDate);
  const contractParts = formatKoreanDateParts(form.contractDate);
  const pledgeParts = formatKoreanDateParts(form.pledgeDate || form.contractDate);
  const totalMonthly =
    Number(form.baseSalary || 0) +
    Number(form.mealAllowance || 0) +
    Number(form.vehicleAllowance || 0) +
    Number(form.otherAllowance || 0);
  const totalAnnual = totalMonthly * 12;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 overflow-y-auto lg:overflow-hidden font-sans">
      {/* 인쇄 시 현재 선택된 A4 양식(근로계약서 또는 정보보호서약서)만 출력 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 14mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-active-document,
          #printable-active-document * {
            visibility: visible !important;
          }
          #printable-active-document {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            padding: 4mm 6mm !important;
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
              연도별 조회
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

          {/* 계약/서약 유형 필터 */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              문서 유형
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs px-2 py-1.5 rounded font-semibold focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 (계약서+보안서약서)</option>
              <option value="NEW_HIRE">신입 직원 채용 계약</option>
              <option value="RENEWAL">연봉협상 재계약</option>
              <option value="SECURITY_PLEDGE">보안서약서 (입사 1회)</option>
            </select>
          </div>

          {/* 검색어 */}
          <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[160px]">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              사원명 검색
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#475569]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="성명, 메모 검색"
                className="bg-[#f4efe4] border border-[#b5a894] text-xs pl-8 pr-2.5 py-1.5 rounded w-full focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>
        </div>

        {/* 우측 상단 액션 버튼군 */}
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
            className="px-2.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ 신입 채용 작성</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartRenewal()}
            className="px-2.5 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+ 연봉 재계약 작성</span>
          </button>

          <button
            type="button"
            onClick={handleStartSecurityPledge}
            className="px-2.5 py-1.5 bg-[#5b21b6] hover:bg-[#4c1d95] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>+ 보안서약서 작성</span>
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
            className="px-2.5 py-1.5 bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{ocrLoading ? "스캔 분석 중..." : "계약서·서약서 스캔 등록"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintDocument}
            className="px-2.5 py-1.5 bg-[#334155] hover:bg-[#1e293b] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>인쇄</span>
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

      {/* 2. 본문 마스터-디테일 스튜디오 */}
      <div className="flex-1 min-h-0 lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 p-2.5 md:p-3">
        {/* 좌측 (5열): 연도별 근로계약서·보안서약서 보관 대장 + 편집 폼 */}
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
                    <th className="py-1.5 px-2 whitespace-nowrap">연도</th>
                    <th className="py-1.5 px-2 whitespace-nowrap">구분</th>
                    <th className="py-1.5 px-2 whitespace-nowrap">성명</th>
                    <th className="py-1.5 px-2 text-right whitespace-nowrap">기본급(월)</th>
                    <th className="py-1.5 px-2 whitespace-nowrap">개시/서약일</th>
                    <th className="py-1.5 px-2 text-center whitespace-nowrap">계약스캔</th>
                    <th className="py-1.5 px-2 text-center whitespace-nowrap">보안서약(입사1회)</th>
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
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tMeta.badgeClass}`}
                            >
                              {tMeta.label}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 font-bold whitespace-nowrap">
                            {c.employeeName}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                            {c.contractType === "SECURITY_PLEDGE"
                              ? "-"
                              : formatErpCurrency(c.baseSalary)}
                          </td>
                          <td className="py-1.5 px-2 font-mono whitespace-nowrap">
                            {c.startDate}
                          </td>
                          <td className="py-1.5 px-2 text-center whitespace-nowrap">
                            {c.scanFileUrl && c.contractType !== "SECURITY_PLEDGE" ? (
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
                            {c.pledgeScanUrl ? (
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
                <span>
                  {saving
                    ? "저장 중..."
                    : selectedContractId
                    ? "계약서·보안서약 수정 저장"
                    : "신규 저장"}
                </span>
              </button>
            </div>

            <div className="p-3 space-y-2.5 text-xs">
              {/* 1행: 문서 구분 / 귀속연도 / 기존사원 불러오기 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    문서 구분
                  </label>
                  <select
                    value={form.contractType}
                    onChange={(e) => {
                      const nextType = e.target.value as
                        | "NEW_HIRE"
                        | "RENEWAL"
                        | "SECURITY_PLEDGE";
                      setForm((prev) => ({
                        ...prev,
                        contractType: nextType,
                      }));
                      if (nextType === "SECURITY_PLEDGE") {
                        setRightViewMode("PLEDGE_DOC");
                      } else if (rightViewMode.startsWith("PLEDGE")) {
                        setRightViewMode("DOCUMENT");
                      }
                    }}
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 font-bold text-xs"
                  >
                    <option value="NEW_HIRE">신입 직원 채용</option>
                    <option value="RENEWAL">연봉협상 재계약</option>
                    <option value="SECURITY_PLEDGE">보안서약서 (입사 1회)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    귀속연도
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

              {/* 2행: 근로자 성명 / 주민등록번호(보안서약서용) / 연락처 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                    근로자(서약자) 성명
                  </label>
                  <input
                    type="text"
                    value={form.employeeName}
                    onChange={(e) => setForm((prev) => ({ ...prev, employeeName: e.target.value }))}
                    placeholder="예: 장종순"
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 font-bold text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#5b21b6] dark:text-violet-300 whitespace-nowrap">
                    주민등록번호 (보안서약서 표기)
                  </label>
                  <input
                    type="text"
                    value={form.residentRegNo}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, residentRegNo: e.target.value }))
                    }
                    placeholder="예: 780217-1241810"
                    className="bg-white dark:bg-slate-950 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1.5 font-mono text-xs"
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
              </div>

              {/* 3행: 입사 시 1회 보안서약서 전용 보관 박s */}
              <div className="p-2.5 rounded bg-[#f5f3ff] dark:bg-violet-950/30 border border-[#c4b5fd] dark:border-violet-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#5b21b6] dark:text-violet-300">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">
                      입사 시 1회 정보보호(보안) 서약서 관리
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRightViewMode("PLEDGE_DOC")}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-[#c4b5fd] text-[#5b21b6] dark:text-violet-300 text-[11px] font-bold hover:bg-[#ede9fe]"
                    >
                      서약서 양식 보기
                    </button>
                    {form.pledgeScanUrl && (
                      <button
                        type="button"
                        onClick={() => setRightViewMode("PLEDGE_SCAN")}
                        className="px-2 py-0.5 rounded bg-[#5b21b6] text-white text-[11px] font-bold hover:bg-[#4c1d95]"
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
                      className="px-2 py-0.5 rounded bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-[11px] font-bold flex items-center gap-1"
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
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, pledgeDate: e.target.value }))
                      }
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

              {/* 5행: 근로계약기간 (개시일 / 종료일 / 체결일) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                    종료일 (무기계약 시 비움)
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
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

              {/* 6행: 근무장소 & 업무의 내용 */}
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

              {/* 8행: 비고 메모 및 사원대장 동기화 옵션 */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                  계약 · 보안서약 이력 메모
                </label>
                <input
                  type="text"
                  value={form.memo}
                  onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
                  placeholder="예: 2025년 11월 입사 근로계약서 및 정보보호서약서 스캔 보관"
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
                  <span>저장 시 사원대장(급여·주소·주민번호·보안서약서) 자동 동기화</span>
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

                <button
                  type="button"
                  onClick={handleSaveContract}
                  disabled={saving}
                  className="ml-auto px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {saving
                      ? "저장 중..."
                      : selectedContractId
                      ? "계약서·보안서약 수정 저장"
                      : "신규 저장"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 우측 (7열): 근로계약서 양식 / 근로계약서 스캔본 / 정보보호서약서 양식 / 보안서약서 스캔본 4탭 뷰어 */}
        <div className="lg:col-span-7 flex flex-col min-h-0 lg:h-full bg-[#f4efe4] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          {/* 우측 상단 4종 뷰 전환 탭 */}
          <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setRightViewMode("DOCUMENT")}
                className={`px-2.5 py-1 rounded text-xs font-bold border whitespace-nowrap transition ${
                  rightViewMode === "DOCUMENT"
                    ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                    : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                }`}
              >
                ① 근로계약서 양식
              </button>

              <button
                type="button"
                onClick={() => setRightViewMode("SCAN")}
                className={`px-2.5 py-1 rounded text-xs font-bold border whitespace-nowrap transition flex items-center gap-1 ${
                  rightViewMode === "SCAN"
                    ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                    : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>② 근로계약서 스캔본 {form.scanFileUrl ? "(보유)" : "(미첨부)"}</span>
              </button>

              <button
                type="button"
                onClick={() => setRightViewMode("PLEDGE_DOC")}
                className={`px-2.5 py-1 rounded text-xs font-bold border whitespace-nowrap transition flex items-center gap-1 ${
                  rightViewMode === "PLEDGE_DOC"
                    ? "bg-[#5b21b6] text-white border-[#4c1d95]"
                    : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>③ 정보보호서약서 양식 (입사 1회)</span>
              </button>

              <button
                type="button"
                onClick={() => setRightViewMode("PLEDGE_SCAN")}
                className={`px-2.5 py-1 rounded text-xs font-bold border whitespace-nowrap transition flex items-center gap-1 ${
                  rightViewMode === "PLEDGE_SCAN"
                    ? "bg-[#5b21b6] text-white border-[#4c1d95]"
                    : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>④ 보안서약서 스캔본 {form.pledgeScanUrl ? "(보유)" : "(미첨부)"}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {rightViewMode === "SCAN" && form.scanFileUrl && (
                <a
                  href={
                    form.scanFileUrl.startsWith("/api/erp/vault")
                      ? `${form.scanFileUrl}&download=1&filename=${encodeURIComponent(
                          form.scanFileName || `근로계약서_${form.employeeName}.pdf`
                        )}`
                      : form.scanFileUrl
                  }
                  download={form.scanFileName || `근로계약서_${form.employeeName}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded whitespace-nowrap"
                >
                  계약스캔 다운로드
                </a>
              )}
              {rightViewMode === "PLEDGE_SCAN" && form.pledgeScanUrl && (
                <a
                  href={
                    form.pledgeScanUrl.startsWith("/api/erp/vault")
                      ? `${form.pledgeScanUrl}&download=1&filename=${encodeURIComponent(
                          form.pledgeScanName || `보안서약서_${form.employeeName}.pdf`
                        )}`
                      : form.pledgeScanUrl
                  }
                  download={form.pledgeScanName || `보안서약서_${form.employeeName}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-[#5b21b6] hover:bg-[#4c1d95] text-white text-xs font-bold rounded whitespace-nowrap"
                >
                  서약스캔 다운로드
                </a>
              )}
              <button
                type="button"
                onClick={handlePrintDocument}
                className="px-2.5 py-1 bg-[#334155] hover:bg-[#1e293b] text-white text-xs font-bold rounded flex items-center gap-1 whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>A4 출력</span>
              </button>
            </div>
          </div>

          {/* 우측 본문 영역 */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-5 bg-[#dcd4c4] dark:bg-slate-950 flex justify-center items-start">
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
                    등록된 근로계약서 스캔본이 없습니다 ({form.employeeName} · {form.contractYear}년)
                  </div>
                  <p className="text-xs text-[#475569] dark:text-slate-400">
                    서명 완료된 근로계약서 스캔본(PDF 또는 이미지)을 업로드하면 연도별로 영구 보관하고 언제든 조회할 수 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>근로계약서 스캔본 파일 업로드</span>
                  </button>
                </div>
              )
            ) : rightViewMode === "PLEDGE_SCAN" ? (
              form.pledgeScanUrl ? (
                <div className="w-full h-full min-h-[650px] bg-white rounded border border-[#b5a894] overflow-hidden flex flex-col">
                  {form.pledgeScanUrl.startsWith("data:image/") ||
                  /\.(png|jpg|jpeg|webp)$/i.test(form.pledgeScanUrl) ? (
                    <img
                      src={form.pledgeScanUrl}
                      alt="보안서약서 스캔본"
                      className="max-w-full h-auto mx-auto p-4"
                    />
                  ) : (
                    <iframe
                      src={form.pledgeScanUrl}
                      title="보안서약서 스캔 PDF"
                      className="w-full flex-1 min-h-[680px]"
                    />
                  )}
                </div>
              ) : (
                <div className="w-full max-w-lg my-auto p-8 bg-[#f4efe4] dark:bg-slate-900 rounded border border-[#b5a894] dark:border-slate-800 text-center space-y-3">
                  <ShieldCheck className="w-10 h-10 mx-auto text-[#5b21b6]" />
                  <div className="text-sm font-bold">
                    등록된 보안서약서 스캔본이 없습니다 ({form.employeeName})
                  </div>
                  <p className="text-xs text-[#475569] dark:text-slate-400">
                    입사 시 1회 작성한 정보보호(보안) 서약서 스캔본을 업로드하면 해당 사원의 인사/계약 기록에 영구 보관됩니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => pledgeFileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#5b21b6] hover:bg-[#4c1d95] text-white text-xs font-bold rounded inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>보안서약서 스캔본 업로드</span>
                  </button>
                </div>
              )
            ) : rightViewMode === "PLEDGE_DOC" ? (
              /* ③ 정보보호 서약서 A4 표준 양식 (제공된 장종순 정보보호 서약서 원본 100% 재현 + 공식 CI 포함) */
              <div
                id="printable-active-document"
                className="w-full max-w-[760px] bg-white text-black p-8 md:p-12 rounded shadow-md border border-[#b5a894] font-serif leading-relaxed text-[14px]"
              >
                {/* 공식 발행 문서 상단 CI 헤더 */}
                <div className="flex items-center justify-between border-b border-neutral-300 pb-3 mb-6">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/ci-dragonrpa.png"
                      alt="주식회사 드래곤알피에이 CI"
                      className="w-11 h-11 object-contain"
                    />
                    <div className="font-sans leading-tight">
                      <div className="text-xs font-extrabold text-neutral-900">
                        {form.employerName}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        DRAGON RPA CO., LTD. · 공식 인사/보안 서식
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[10.5px] text-neutral-500">
                    문서번호: {form.contractNo || "SP-OFFICIAL"}
                  </div>
                </div>

                <div className="text-center mb-8 pt-2">
                  <h1 className="text-2xl font-bold tracking-[0.25em] underline underline-offset-8">
                    정보보호 서약서
                  </h1>
                </div>

                <p className="mb-6 leading-7 text-[14.5px]">
                  본인은 {form.employerName}(이하 &ldquo;회사&rdquo;)의 정보보호와 관련하여 다음의
                  각 사항을 준수할 것을 서약합니다.
                </p>

                <div className="text-center font-bold my-6 tracking-widest">- 다 음 -</div>

                <div className="space-y-4 text-[14px] leading-7">
                  <div className="flex gap-2">
                    <span className="font-semibold shrink-0">1.</span>
                    <span>
                      정보통신망 이용촉진 및 정보보호 등에 관한 법률에 따른 회사의 정보보호 지침을
                      준수하겠습니다.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-semibold shrink-0">2.</span>
                    <span>
                      업무를 수행함에 있어서 취득한 정보에 대한 모든 권리가 회사 소유임을
                      확약합니다.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-semibold shrink-0">3.</span>
                    <span>
                      업무 수행 중 알게 된 고객에 관한 일체의 정보 및 회사의 영업비밀(경영정보,
                      재무정보, 고객정보 등)을 회사 및 고객의 승인 없이 제 3자에게 판매, 대여, 유통
                      등을 하지 않겠습니다.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-semibold shrink-0">4.</span>
                    <span>
                      고객의 정보를 수집할 때에는 업무상 필요한 정보 이외의 것을 확인하지 않으며,
                      본인에게 접근이 허용되지 않은 정보에 대한 접근통제 규칙을 준수하겠습니다.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-semibold shrink-0">5.</span>
                    <span>
                      업무 프로그램, 전산기기, 시설물 등을 훼손하거나 외부로 유출되지 않도록 하고,
                      보안 구역에 대한 접근통제 규칙을 준수하겠습니다.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-semibold shrink-0">6.</span>
                    <span>
                      고객의 정보유출이나 정보보호 위반사례를 발견할 때에는 지체없이 회사에
                      보고하겠습니다.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <span className="font-semibold shrink-0">7.</span>
                    <span>
                      만약 서약사항을 위반하여 회사의 업무에 손해를 끼친 경우 민형사상의 책임과
                      관계법령 및 회사의 규정에 의한 조치를 따르겠습니다.
                    </span>
                  </div>
                </div>

                {/* 서약일자 */}
                <div className="text-right font-bold text-[15px] my-12 pr-12 tracking-widest">
                  {pledgeParts.y} 년 {pledgeParts.m} 월 {pledgeParts.d} 일
                </div>

                {/* 주민등록번호 / 성명 / 귀중 */}
                <div className="flex flex-col items-end space-y-4 text-[15px] pr-4">
                  <div className="w-80 flex items-center justify-between">
                    <span className="font-semibold">주민등록번호 :</span>
                    <span className="font-mono font-bold tracking-wider">
                      {form.residentRegNo || "______ - _______"}
                    </span>
                  </div>

                  <div className="w-80 flex items-center justify-between">
                    <span className="font-semibold">
                      성 명 :{" "}
                      <span className="font-bold text-lg ml-2">
                        {form.employeeName || "          "}
                      </span>
                    </span>
                    <span className="text-neutral-700">(서명/날인)</span>
                  </div>

                  <div className="w-80 pt-4 flex items-center gap-2.5 text-left font-bold text-base tracking-wide">
                    <img
                      src="/ci-dragonrpa.png"
                      alt="주식회사 드래곤알피에이 CI"
                      className="w-7 h-7 object-contain"
                    />
                    <span>{form.employerName} 귀중</span>
                  </div>
                </div>
              </div>
            ) : (
              /* ① 표준 근로계약서 A4 문서 양식 (공식 CI 포함) */
              <div
                id="printable-active-document"
                className="w-full max-w-[760px] bg-white text-black p-6 md:px-9 md:py-7 rounded shadow-md border border-[#b5a894] font-serif leading-snug text-[13.5px]"
              >
                {/* 공식 발행 문서 상단 CI 헤더 */}
                <div className="flex items-center justify-between border-b border-neutral-300 pb-2 mb-3.5">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/ci-dragonrpa.png"
                      alt="주식회사 드래곤알피에이 CI"
                      className="w-9 h-9 object-contain"
                    />
                    <div className="font-sans leading-tight">
                      <div className="text-xs font-extrabold text-neutral-900">
                        {form.employerName}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        DRAGON RPA CO., LTD. · 표준 근로계약서
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[10.5px] text-neutral-500">
                    계약번호: {form.contractNo || "신규발행"}
                  </div>
                </div>

                {/* 타이틀 박스 */}
                <div className="border border-black py-2 px-8 mx-auto w-64 text-center mb-4">
                  <h1 className="text-xl font-bold tracking-[0.25em]">근 로 계 약 서</h1>
                </div>

                {/* 전문 */}
                <p className="mb-3.5 leading-6 text-[13.5px]">
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
                <div className="space-y-2.5 text-[13.5px]">
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
                    <div className="font-semibold mb-0.5">6. 임 금</div>
                    <div className="pl-4 space-y-0.5">
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
                <div className="text-center font-bold text-[14.5px] my-4 tracking-widest">
                  {contractParts.y} 년 {contractParts.m} 월 {contractParts.d} 일
                </div>

                {/* 사업주 & 근로자 서명란 */}
                <div className="space-y-2.5 text-[13.5px] pt-2 pb-2 border-t border-neutral-300">
                  <div className="grid grid-cols-12 gap-y-0.5">
                    <div className="col-span-2 font-bold">(사업주)</div>
                    <div className="col-span-10 space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <img
                            src="/ci-dragonrpa.png"
                            alt="CI"
                            className="w-5 h-5 object-contain inline-block"
                          />
                          <span>사업체명 : {form.employerName}</span>
                        </span>
                        <span>(전화 : {form.employerPhone})</span>
                      </div>
                      <div>주 소 : {form.employerAddress}</div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span>대 표 자 : {form.employerRep}</span>
                        <span className="pr-8 font-semibold">(서명)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-y-0.5 pt-1.5">
                    <div className="col-span-2 font-bold">(근로자)</div>
                    <div className="col-span-10 space-y-0.5">
                      <div>주 소 : {form.employeeAddress}</div>
                      <div>연 락 처 : {form.employeePhone}</div>
                      <div className="flex items-center justify-between pt-0.5">
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
