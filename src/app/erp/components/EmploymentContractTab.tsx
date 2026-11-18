"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  RefreshCw,
  Upload,
  Printer,
  Search,
  UserPlus,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  EmploymentContractItem,
  EmployeeOption,
  RightViewMode,
} from "./employment-contracts/employmentContractTypes";
import { ContractDocumentPreviewPanel } from "./employment-contracts/ContractDocumentPreviewPanel";
import {
  EmploymentContractFormAndListPanel,
  type EmploymentContractDraftForm,
} from "./employment-contracts/EmploymentContractFormAndListPanel";

export type { EmploymentContractItem };

interface EmploymentContractTabProps {
  currentUser?: any;
}

const DEFAULT_CONTRACT_TERMS = {
  employerName: "주식회사 드래곤알피에이",
  employerPhone: "010-9224-4097",
  employerAddress: "서울 금천구 서부샛길 528, 547호",
  employerRep: "이정용",
  workplace: "서울시 금천구 벚꽃로278, SJ테크노빌 B155호",
  jobDescription: "주식회사 현대렌탈서비스의 렌탈자산 입/출고/배송 설치 등",
  workStartTime: "09:00",
  workEndTime: "18:00",
  breakMinutes: 60,
  workDays: "매주 월~금요일 근무",
  weeklyHoliday: "주휴일 매주 토~일요일",
  hourlyWageNote: "시급은 통상시급",
  payDay: 10,
  payMethod: "근로자 명의 예금통장에 입금",
};

const YEAR_FILTER_OPTIONS = [
  { key: "ALL", label: "전체 연도" },
  { key: "2026", label: "2026년" },
  { key: "2025", label: "2025년" },
  { key: "2024", label: "2024년" },
  { key: "2023", label: "2023년" },
];

const createInitialContractForm = (yearStr: string): EmploymentContractDraftForm => ({
  id: 0,
  contractNo: "",
  contractYear: yearStr,
  contractType: "NEW_HIRE",
  status: "SIGNED",
  employeeId: "",
  employeeName: "박종환",
  employeePhone: "010-8683-9775",
  employeeAddress: "서울 금천구 시흥대로146길 25-19",
  residentRegNo: "",
  ...DEFAULT_CONTRACT_TERMS,
  startDate: "2026-04-20",
  endDate: "",
  baseSalary: 2800000,
  mealAllowance: 200000,
  vehicleAllowance: 0,
  otherAllowance: 0,
  otherAllowanceLabel: "",
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

function persistSelectedEmployeeSession(
  empId?: string | number | null,
  empName?: string | null
) {
  try {
    if (empId) sessionStorage.setItem("dragonrpa_erp_selected_emp_id", String(empId));
    if (empName) sessionStorage.setItem("dragonrpa_erp_selected_emp_name", empName);
  } catch (e) {}
}

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

  // 선택된 계약서 및 우측 뷰 모드: DOCUMENT | SCAN | PLEDGE_DOC | PLEDGE_SCAN
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [rightViewMode, setRightViewMode] = useState<RightViewMode>("DOCUMENT");

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentYearStr = todayStr.slice(0, 4);

  const [form, setForm] = useState<EmploymentContractDraftForm>(() =>
    createInitialContractForm(currentYearStr)
  );

  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pledgeFileInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedRef = useRef<boolean>(false);

  // 세션 스토리지 저장 (민감 개인정보 제외 후 선택 직원 및 작성 양식 유지)
  useEffect(() => {
    if (!hasInitializedRef.current) return;
    try {
      const {
        residentRegNo: _omitResidentRegNo,
        employeePhone: _omitPhone,
        employeeAddress: _omitAddress,
        ...sanitizedForm
      } = form;
      sessionStorage.setItem(
        "dragonrpa_erp_contract_draft",
        JSON.stringify({
          selectedContractId,
          rightViewMode,
          yearFilter,
          typeFilter,
          form: sanitizedForm,
        })
      );
      persistSelectedEmployeeSession(form.employeeId, form.employeeName);
    } catch (e) {}
  }, [form, selectedContractId, rightViewMode, yearFilter, typeFilter]);

  const resolveCurrentTargetEmployee = (empId?: number) =>
    (empId ? employees.find((e) => e.id === empId) : undefined) ||
    employees.find((e) => String(e.id) === String(form.employeeId)) ||
    employees.find((e) => form.employeeName && e.name.replace(" 대표이사", "") === form.employeeName);

  const getEmployeeContactPatch = (
    targetEmp: EmployeeOption | undefined,
    prev: EmploymentContractDraftForm
  ) => ({
    employeeId: targetEmp ? targetEmp.id : prev.employeeId,
    employeeName: targetEmp ? targetEmp.name.replace(" 대표이사", "") : prev.employeeName,
    employeePhone: targetEmp?.phone || prev.employeePhone,
    employeeAddress: targetEmp?.address || prev.employeeAddress,
  });

  const buildPledgeOcrPatch = (p: any, fileName: string, dataUrl: string) => {
    const matchedEmp = employees.find(
      (emp) => p.employeeName && emp.name.includes(p.employeeName)
    );
    return {
      ...form,
      employeeId: matchedEmp ? matchedEmp.id : form.employeeId,
      employeeName: p.employeeName || form.employeeName,
      residentRegNo: p.residentRegNo || form.residentRegNo,
      pledgeDate: p.contractDate || p.startDate || form.pledgeDate,
      pledgeScanName: fileName,
      pledgeScanUrl: dataUrl,
    };
  };

  const populateEmployeeIntoNewDraft = (
    emp: EmployeeOption,
    allContracts: EmploymentContractItem[],
    mode: "NEW_HIRE" | "RENEWAL" | "SECURITY_PLEDGE" = "NEW_HIRE"
  ) => {
    const existingWithPledge = allContracts.find(
      (c) => c.employeeId === emp.id && (c.pledgeScanUrl || c.residentRegNo)
    );
    const joinDt = emp.joinDate ? String(emp.joinDate).slice(0, 10) : todayStr;
    const janFirst = `${currentYearStr}-01-01`;
    const isRenewal = mode === "RENEWAL";
    const startDt = isRenewal ? janFirst : joinDt;

    setSelectedContractId(null);
    setRightViewMode(mode === "SECURITY_PLEDGE" ? "PLEDGE_DOC" : "DOCUMENT");
    setForm((prev) => ({
      ...prev,
      id: 0,
      contractNo: "",
      contractYear: startDt.slice(0, 4) || currentYearStr,
      contractType: mode,
      status: "SIGNED",
      employeeId: emp.id,
      employeeName: emp.name.replace(" 대표이사", ""),
      employeePhone: emp.phone || "",
      employeeAddress: emp.address || "",
      residentRegNo: existingWithPledge?.residentRegNo || prev.residentRegNo || "",
      startDate: startDt,
      endDate: isRenewal ? `${currentYearStr}-12-31` : "",
      contractDate: startDt,
      pledgeDate: existingWithPledge?.pledgeDate || joinDt,
      pledgeScanName: existingWithPledge?.pledgeScanName || "",
      pledgeScanUrl: existingWithPledge?.pledgeScanUrl || "",
      baseSalary: Number(emp.baseSalary || 2800000),
      mealAllowance: Number(emp.mealAllowance || 200000),
      vehicleAllowance: Number(emp.vehicleAllowance || 0),
      scanFileName: "",
      scanFileUrl: "",
      memo:
        mode === "RENEWAL"
          ? `${currentYearStr}년 연봉협상 재계약 체결`
          : mode === "SECURITY_PLEDGE"
          ? "입사 시 정보보호(보안) 서약서 1회 작성 보관"
          : `${startDt.slice(0, 4)}년 신입 직원 채용 근로계약 및 정보보호 서약`,
      syncEmployeeMaster: true,
      registerNewEmployee: false,
      newEmployeePosition: emp.position || "사원",
      newEmployeeDepartment: emp.department || "렌탈운영팀",
    }));
  };

  const loadContractIntoForm = (c: EmploymentContractItem) => {
    setSelectedContractId(c.id);
    persistSelectedEmployeeSession(c.employeeId, c.employeeName);
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
      employerName: c.employerName || DEFAULT_CONTRACT_TERMS.employerName,
      employerPhone: c.employerPhone || DEFAULT_CONTRACT_TERMS.employerPhone,
      employerAddress: c.employerAddress || DEFAULT_CONTRACT_TERMS.employerAddress,
      employerRep: c.employerRep || DEFAULT_CONTRACT_TERMS.employerRep,
      startDate: c.startDate || todayStr,
      endDate: c.endDate || "",
      workplace: c.workplace || DEFAULT_CONTRACT_TERMS.workplace,
      jobDescription: c.jobDescription || DEFAULT_CONTRACT_TERMS.jobDescription,
      workStartTime: c.workStartTime || DEFAULT_CONTRACT_TERMS.workStartTime,
      workEndTime: c.workEndTime || DEFAULT_CONTRACT_TERMS.workEndTime,
      breakMinutes: c.breakMinutes ?? DEFAULT_CONTRACT_TERMS.breakMinutes,
      workDays: c.workDays || DEFAULT_CONTRACT_TERMS.workDays,
      weeklyHoliday: c.weeklyHoliday || DEFAULT_CONTRACT_TERMS.weeklyHoliday,
      baseSalary: Number(c.baseSalary || 0),
      hourlyWageNote: c.hourlyWageNote || DEFAULT_CONTRACT_TERMS.hourlyWageNote,
      mealAllowance: Number(c.mealAllowance || 0),
      vehicleAllowance: Number(c.vehicleAllowance || 0),
      otherAllowance: Number(c.otherAllowance || 0),
      otherAllowanceLabel: c.otherAllowanceLabel || "",
      payDay: Number(c.payDay || DEFAULT_CONTRACT_TERMS.payDay),
      payMethod: c.payMethod || DEFAULT_CONTRACT_TERMS.payMethod,
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

    // 스캔본/서약서 지연 로딩 (대용량 파일 페이로드 분리 대응)
    if ((!c.scanFileUrl && c.hasScanFile) || (!c.pledgeScanUrl && c.hasPledgeScan)) {
      fetch(`/api/erp/employment-contracts?id=${c.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.contract) {
            const full = data.contract;
            setForm((prev) => ({
              ...prev,
              scanFileUrl: full.scanFileUrl || prev.scanFileUrl,
              pledgeScanUrl: full.pledgeScanUrl || prev.pledgeScanUrl,
            }));
            setContracts((prev) =>
              prev.map((item) =>
                item.id === c.id
                  ? { ...item, scanFileUrl: full.scanFileUrl, pledgeScanUrl: full.pledgeScanUrl }
                  : item
              )
            );
          }
        })
        .catch(() => {});
    }
  };

  const fetchAllData = async (explicitTargetContractId?: number | null) => {
    setLoading(true);
    try {
      const [cRes, eRes] = await Promise.all([
        fetch(`/api/erp/employment-contracts?year=${yearFilter}&contractType=${typeFilter}`, {
          cache: "no-store",
        }),
        fetch("/api/erp/employees?includePii=1", { cache: "no-store" }),
      ]);
      const cData = await cRes.json();
      const eData = await eRes.json();

      const loadedEmps: EmployeeOption[] =
        eData.success && Array.isArray(eData.employees) ? eData.employees : [];
      if (loadedEmps.length > 0) setEmployees(loadedEmps);

      const loadedContracts: EmploymentContractItem[] =
        cData.success && Array.isArray(cData.contracts) ? cData.contracts : [];
      if (cData.success && Array.isArray(cData.contracts)) setContracts(loadedContracts);

      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        let restored = false;

        try {
          const savedEmpId = sessionStorage.getItem("dragonrpa_erp_selected_emp_id");
          const savedEmpName = sessionStorage.getItem("dragonrpa_erp_selected_emp_name");
          const savedDraftStr = sessionStorage.getItem("dragonrpa_erp_contract_draft");
          const savedDraft = savedDraftStr ? JSON.parse(savedDraftStr) : null;

          if (
            savedDraft?.form &&
            (!savedEmpId || String(savedDraft.form.employeeId) === String(savedEmpId))
          ) {
            const ctMatch = loadedContracts.find((c) => c.id === savedDraft.selectedContractId);
            const empMatch = loadedEmps.find(
              (e) => String(e.id) === String(savedDraft.form.employeeId)
            );
            setForm({
              ...savedDraft.form,
              residentRegNo: ctMatch?.residentRegNo || empMatch?.residentRegNo || "",
              employeePhone: ctMatch?.employeePhone || empMatch?.phone || "",
              employeeAddress: ctMatch?.employeeAddress || empMatch?.address || "",
            });
            setSelectedContractId(savedDraft.selectedContractId ?? null);
            if (savedDraft.rightViewMode) setRightViewMode(savedDraft.rightViewMode);
            restored = true;
          } else if (savedEmpId || savedEmpName) {
            const matchedEmp =
              loadedEmps.find((e) => savedEmpId && String(e.id) === String(savedEmpId)) ||
              loadedEmps.find((e) => savedEmpName && e.name === savedEmpName);
            if (matchedEmp) {
              const empContract = loadedContracts.find((c) => c.employeeId === matchedEmp.id);
              if (empContract) loadContractIntoForm(empContract);
              else populateEmployeeIntoNewDraft(matchedEmp, loadedContracts, "NEW_HIRE");
              restored = true;
            }
          }
        } catch (e) {}

        if (!restored && loadedContracts.length > 0) {
          const defaultTarget =
            loadedContracts.find((c: EmploymentContractItem) => c.employeeName === "박종환") ||
            loadedContracts[0];
          loadContractIntoForm(defaultTarget);
        }
      } else {
        const targetId =
          explicitTargetContractId !== undefined ? explicitTargetContractId : selectedContractId;
        if (targetId) {
          const exactContract = loadedContracts.find((c) => c.id === targetId);
          if (exactContract) {
            loadContractIntoForm(exactContract);
            return;
          }
        }
        if (targetId !== null && (form.employeeId || form.employeeName)) {
          const sameEmpContract = loadedContracts.find(
            (c) =>
              (form.employeeId && String(c.employeeId) === String(form.employeeId)) ||
              (form.employeeName && c.employeeName === form.employeeName)
          );
          if (sameEmpContract) loadContractIntoForm(sameEmpContract);
        } else if (explicitTargetContractId === null) {
          if (loadedContracts.length > 0) {
            loadContractIntoForm(loadedContracts[0]);
          } else {
            setSelectedContractId(null);
            setForm((prev) => ({ ...prev, id: 0, contractNo: "" }));
          }
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

  // 신입 채용 기본 양식 전환
  const handleStartNewHire = () => {
    const targetEmp = resolveCurrentTargetEmployee();
    const existingWithPledge = targetEmp
      ? contracts.find((c) => c.employeeId === targetEmp.id && (c.pledgeScanUrl || c.residentRegNo))
      : null;
    const joinDt = targetEmp?.joinDate ? String(targetEmp.joinDate).slice(0, 10) : todayStr;
    const targetYear = yearFilter !== "ALL" ? yearFilter : joinDt.slice(0, 4) || currentYearStr;

    setSelectedContractId(null);
    setRightViewMode("DOCUMENT");
    setStatusMsg(
      targetEmp
        ? `[${targetEmp.name}] 신입 채용 근로계약서(및 입사 시 1회 보안서약서) 작성 모드입니다. (미등록 신규 입사자는 사원 선택에서 '직접 입력'을 선택하세요)`
        : "신입 직원 채용 근로계약서(및 입사 시 1회 보안서약서) 작성 모드입니다."
    );
    setForm((prev) => ({
      ...prev,
      ...DEFAULT_CONTRACT_TERMS,
      ...getEmployeeContactPatch(targetEmp, prev),
      id: 0,
      contractNo: "",
      contractYear: targetYear,
      contractType: "NEW_HIRE",
      status: "SIGNED",
      residentRegNo: existingWithPledge?.residentRegNo || prev.residentRegNo,
      startDate: joinDt,
      endDate: "",
      baseSalary: targetEmp ? Number(targetEmp.baseSalary || 2800000) : prev.baseSalary || 2800000,
      mealAllowance: targetEmp ? Number(targetEmp.mealAllowance || 200000) : prev.mealAllowance || 200000,
      vehicleAllowance: targetEmp ? Number(targetEmp.vehicleAllowance || 0) : prev.vehicleAllowance || 0,
      otherAllowance: 0,
      otherAllowanceLabel: "",
      contractDate: joinDt,
      scanFileName: "",
      scanFileUrl: "",
      pledgeDate: existingWithPledge?.pledgeDate || joinDt,
      pledgeScanName: existingWithPledge?.pledgeScanName || prev.pledgeScanName || "",
      pledgeScanUrl: existingWithPledge?.pledgeScanUrl || prev.pledgeScanUrl || "",
      memo: `${targetYear}년 신입 직원 채용 근로계약 및 정보보호 서약`,
      syncEmployeeMaster: true,
      registerNewEmployee: !targetEmp,
      newEmployeePosition: targetEmp?.position || "사원",
      newEmployeeDepartment: targetEmp?.department || "렌탈운영팀",
    }));
  };

  // 입사 시 1회 정보보호(보안)서약서 전용 작성 모드
  const handleStartSecurityPledge = () => {
    const targetEmp = resolveCurrentTargetEmployee();
    const joinDt = targetEmp?.joinDate ? String(targetEmp.joinDate).slice(0, 10) : form.startDate || todayStr;
    setSelectedContractId(null);
    setRightViewMode("PLEDGE_DOC");
    setStatusMsg("입사 시 1회 작성하는 정보보호(보안) 서약서 작성 및 보관 모드입니다.");
    setForm((prev) => ({
      ...prev,
      ...getEmployeeContactPatch(targetEmp, prev),
      id: 0,
      contractNo: "",
      contractYear: joinDt.slice(0, 4) || currentYearStr,
      contractType: "SECURITY_PLEDGE",
      status: "SIGNED",
      startDate: joinDt,
      contractDate: joinDt,
      pledgeDate: joinDt,
      memo: "입사 시 정보보호(보안) 서약서 1회 작성 보관",
    }));
  };

  // 연봉협상 재계약 기본 양식 전환
  const handleStartRenewal = (empId?: number) => {
    const targetEmp = resolveCurrentTargetEmployee(empId);
    const targetYear = yearFilter !== "ALL" ? yearFilter : form.contractYear || currentYearStr;
    const janFirst = `${targetYear}-01-01`;

    setSelectedContractId(null);
    setRightViewMode("DOCUMENT");
    setStatusMsg(
      targetEmp
        ? `[${targetEmp.name}] ${targetYear}년 연봉협상 재계약 작성 모드입니다. 변경된 기본급/식대를 입력하세요.`
        : `${targetYear}년 연봉협상 재계약 작성 모드입니다. 변경된 기본급/식대를 입력하세요.`
    );
    setForm((prev) => ({
      ...prev,
      ...getEmployeeContactPatch(targetEmp, prev),
      id: 0,
      contractNo: "",
      contractYear: targetYear,
      contractType: "RENEWAL",
      status: "SIGNED",
      startDate: janFirst,
      endDate: `${targetYear}-12-31`,
      workplace: DEFAULT_CONTRACT_TERMS.workplace,
      jobDescription: DEFAULT_CONTRACT_TERMS.jobDescription,
      baseSalary: targetEmp ? Number(targetEmp.baseSalary || prev.baseSalary || 2800000) : prev.baseSalary || 2800000,
      mealAllowance: targetEmp ? Number(targetEmp.mealAllowance || prev.mealAllowance || 200000) : prev.mealAllowance || 200000,
      vehicleAllowance: targetEmp ? Number(targetEmp.vehicleAllowance || prev.vehicleAllowance || 0) : prev.vehicleAllowance || 0,
      contractDate: janFirst,
      scanFileName: "",
      scanFileUrl: "",
      memo: `${targetYear}년 연봉협상 재계약 체결`,
      syncEmployeeMaster: true,
      registerNewEmployee: false,
    }));
  };

  // 사원 드롭다운 선택 시 사원 기본 정보 및 기존 보안서약서 정보 자동 로드
  const handleSelectEmployee = (empIdStr: string) => {
    if (!empIdStr) {
      try {
        sessionStorage.removeItem("dragonrpa_erp_selected_emp_id");
        sessionStorage.removeItem("dragonrpa_erp_selected_emp_name");
      } catch (e) {}
      setSelectedContractId(null);
      setForm((prev) => ({
        ...prev,
        id: 0,
        contractNo: "",
        contractType: "NEW_HIRE",
        employeeId: "",
        employeeName: "",
        employeePhone: "",
        employeeAddress: "",
        residentRegNo: "",
        startDate: todayStr,
        endDate: "",
        contractDate: todayStr,
        pledgeDate: todayStr,
        scanFileName: "",
        scanFileUrl: "",
        pledgeScanName: "",
        pledgeScanUrl: "",
        registerNewEmployee: true,
      }));
      return;
    }
    const emp = employees.find((e) => String(e.id) === empIdStr);
    if (!emp) return;

    persistSelectedEmployeeSession(emp.id, emp.name);

    const existingWithPledge = contracts.find(
      (c) => c.employeeId === emp.id && (c.pledgeScanUrl || c.residentRegNo)
    );
    const joinDt = emp.joinDate ? String(emp.joinDate).slice(0, 10) : todayStr;

    setForm((prev) => ({
      ...prev,
      employeeId: emp.id,
      employeeName: emp.name.replace(" 대표이사", ""),
      employeePhone: emp.phone || prev.employeePhone,
      employeeAddress: emp.address || prev.employeeAddress,
      residentRegNo: existingWithPledge?.residentRegNo || prev.residentRegNo,
      startDate: prev.contractType === "NEW_HIRE" ? joinDt : prev.startDate,
      contractDate: prev.contractType === "NEW_HIRE" ? joinDt : prev.contractDate,
      pledgeDate: existingWithPledge?.pledgeDate || joinDt || prev.pledgeDate,
      pledgeScanName: existingWithPledge?.pledgeScanName || prev.pledgeScanName,
      pledgeScanUrl: existingWithPledge?.pledgeScanUrl || prev.pledgeScanUrl,
      baseSalary: Number(emp.baseSalary || prev.baseSalary),
      mealAllowance: Number(emp.mealAllowance || prev.mealAllowance),
      vehicleAllowance: Number(emp.vehicleAllowance || prev.vehicleAllowance),
      newEmployeePosition: emp.position || prev.newEmployeePosition,
      newEmployeeDepartment: emp.department || prev.newEmployeeDepartment,
      registerNewEmployee: false,
    }));
  };

  // 근로계약서 & 보안서약서 DB 저장
  const saveContractFormToDb = async (
    targetForm: EmploymentContractDraftForm,
    customSuccessMsg?: string
  ): Promise<boolean> => {
    if (!targetForm.employeeName.trim()) {
      alert("근로자 성명을 입력해 주십시오.");
      return false;
    }

    setSaving(true);
    try {
      const isUpdate = Boolean(
        (selectedContractId && selectedContractId > 0) || targetForm.id > 0
      );
      const method = isUpdate ? "PUT" : "POST";
      const payloadId = targetForm.id > 0 ? targetForm.id : selectedContractId || 0;

      const res = await fetch("/api/erp/employment-contracts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...targetForm,
          id: payloadId,
          createdBy: currentUser?.name || "ADMIN",
        }),
      });
      const data = await res.json();
      if (data.success) {
        const savedId = isUpdate ? payloadId : data.contract?.id;
        if (savedId) {
          setSelectedContractId(savedId);
          setForm((prev) => ({
            ...prev,
            id: savedId,
            employeeId: data.employeeId || data.contract?.employeeId || prev.employeeId,
            contractNo: data.contract?.contractNo || prev.contractNo,
            registerNewEmployee: false,
          }));
        }
        setStatusMsg(customSuccessMsg || data.message || "저장되었습니다.");
        await fetchAllData(savedId);
        return true;
      } else {
        alert(data.error || "저장 실패");
        return false;
      }
    } catch (err: any) {
      alert("저장 중 오류 발생: " + err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // 공용 스캔 파일 DataURL 변환 및 OCR 판독 요청
  const readFileAndParseOcr = async (file: File) => {
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
    return { dataUrl, data };
  };

  // 근로계약서 스캔 파일 업로드 및 AI OCR 자동 판독 + 즉시 DB 자동 저장
  const handleScanFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setStatusMsg("스캔된 문서를 분석하고 자동 저장하고 있습니다...");

    try {
      const { dataUrl, data } = await readFileAndParseOcr(file);
      let nextForm = { ...form };
      let autoSaveMsg = "스캔 파일이 첨부 및 자동 저장되었습니다.";

      if (data.success && data.parsed) {
        const p = data.parsed;
        const isPledge = p.docKind === "PLEDGE" || /보안|서약|정보보호/.test(file.name);
        const matchedEmp = employees.find(
          (emp) => p.employeeName && emp.name.includes(p.employeeName)
        );

        if (isPledge) {
          nextForm = buildPledgeOcrPatch(p, file.name, dataUrl);
          setForm(nextForm);
          setRightViewMode("PLEDGE_SCAN");
          autoSaveMsg = `${nextForm.employeeName || ""} 보안서약서 스캔본이 첨부 및 자동 저장되었습니다.`;
        } else {
          nextForm = {
            ...form,
            employeeId: matchedEmp ? matchedEmp.id : form.employeeId,
            employeeName: p.employeeName || form.employeeName,
            employeePhone: p.employeePhone || matchedEmp?.phone || form.employeePhone,
            employeeAddress: p.employeeAddress || matchedEmp?.address || form.employeeAddress,
            residentRegNo: p.residentRegNo || form.residentRegNo,
            startDate: p.startDate || form.startDate,
            endDate: p.endDate || form.endDate,
            contractYear:
              p.contractYear || (p.startDate ? p.startDate.slice(0, 4) : form.contractYear),
            workplace: p.workplace || form.workplace,
            jobDescription: p.jobDescription || form.jobDescription,
            workStartTime: p.workStartTime || form.workStartTime,
            workEndTime: p.workEndTime || form.workEndTime,
            breakMinutes: p.breakMinutes || form.breakMinutes,
            baseSalary: p.baseSalary > 0 ? p.baseSalary : form.baseSalary,
            hourlyWageNote: p.hourlyWageNote || form.hourlyWageNote,
            mealAllowance: p.mealAllowance !== undefined ? p.mealAllowance : form.mealAllowance,
            vehicleAllowance:
              p.vehicleAllowance !== undefined ? p.vehicleAllowance : form.vehicleAllowance,
            payDay: p.payDay || form.payDay,
            contractDate: p.contractDate || p.startDate || form.contractDate,
            scanFileName: file.name,
            scanFileUrl: dataUrl,
          };
          setForm(nextForm);
          setRightViewMode("SCAN");
          autoSaveMsg = `${nextForm.employeeName || ""} 근로계약서 스캔본 첨부 및 자동 저장이 완료되었습니다.`;
        }
      } else {
        const isPledgeName = /보안|서약|정보보호/.test(file.name);
        if (isPledgeName) {
          nextForm = { ...form, pledgeScanName: file.name, pledgeScanUrl: dataUrl };
          setForm(nextForm);
          setRightViewMode("PLEDGE_SCAN");
          autoSaveMsg = "보안서약서 스캔본이 첨부 및 자동 저장되었습니다.";
        } else {
          nextForm = { ...form, scanFileName: file.name, scanFileUrl: dataUrl };
          setForm(nextForm);
          setRightViewMode("SCAN");
          autoSaveMsg = "근로계약서 스캔본이 첨부 및 자동 저장되었습니다.";
        }
      }

      if (nextForm.employeeName.trim()) {
        await saveContractFormToDb(nextForm, autoSaveMsg);
      } else {
        setStatusMsg("스캔 파일이 첨부되었습니다. 성명 입력 후 저장해 주십시오.");
      }
    } catch (err: any) {
      console.error("Scan upload error:", err);
      setStatusMsg("스캔 파일 처리 중 오류: " + err.message);
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 보안서약서 전용 스캔 파일 업로드 핸들러 + 즉시 DB 자동 저장
  const handlePledgeScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setStatusMsg("보안서약서 스캔 파일을 분석하고 자동 저장하고 있습니다...");

    try {
      const { dataUrl, data } = await readFileAndParseOcr(file);
      const nextForm =
        data.success && data.parsed
          ? buildPledgeOcrPatch(data.parsed, file.name, dataUrl)
          : { ...form, pledgeScanName: file.name, pledgeScanUrl: dataUrl };

      setForm(nextForm);
      setRightViewMode("PLEDGE_SCAN");

      if (nextForm.employeeName.trim()) {
        await saveContractFormToDb(
          nextForm,
          `${nextForm.employeeName} 보안서약서 스캔본이 첨부 및 자동 저장되었습니다.`
        );
      } else {
        setStatusMsg("보안서약서 스캔본이 첨부되었습니다. 성명 입력 후 저장해 주십시오.");
      }
    } catch (err: any) {
      setStatusMsg("보안서약서 업로드 오류: " + err.message);
    } finally {
      setOcrLoading(false);
      if (pledgeFileInputRef.current) pledgeFileInputRef.current.value = "";
    }
  };

  const handleSaveContract = async () => {
    setStatusMsg("");
    await saveContractFormToDb(form);
  };

  const handleDeleteContract = async (id: number, name: string) => {
    if (!confirm(`${name} 문서를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/erp/employment-contracts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        const wasSelected = selectedContractId === id || form.id === id;
        if (wasSelected) setSelectedContractId(null);
        await fetchAllData(wasSelected ? null : selectedContractId);
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

  const draftModeButtons = [
    { label: "+ 신입 채용 작성", onClick: handleStartNewHire, icon: UserPlus, cls: "bg-[#1d4ed8] hover:bg-[#1e40af]" },
    { label: "+ 연봉 재계약 작성", onClick: () => handleStartRenewal(), icon: TrendingUp, cls: "bg-[#047857] hover:bg-[#065f46]" },
    { label: "+ 보안서약서 작성", onClick: handleStartSecurityPledge, icon: ShieldCheck, cls: "bg-[#5b21b6] hover:bg-[#4c1d95]" },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 overflow-y-auto lg:overflow-hidden font-sans">
      {/* 인쇄 시 현재 선택된 A4 양식(근로계약서 또는 정보보호서약서)만 출력 */}
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 14mm; }
          body * { visibility: hidden !important; }
          #printable-active-document, #printable-active-document * { visibility: visible !important; }
          #printable-active-document {
            position: fixed !important; left: 0 !important; top: 0 !important;
            width: 100% !important; max-width: 100% !important; min-height: auto !important;
            padding: 4mm 6mm !important; margin: 0 !important;
            background: #ffffff !important; color: #000000 !important;
            box-shadow: none !important; border: none !important; z-index: 99999 !important;
          }
        }
      `}</style>

      {/* 1. 상단 조회 조건(좌상단) & 작성/스캔 액션 파이프라인(우상단) 바 */}
      <div className="p-2.5 md:p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-end justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-end gap-2 w-full lg:w-auto">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
              연도별 조회
            </label>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {YEAR_FILTER_OPTIONS.map((y) => (
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
            onClick={() => fetchAllData()}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          {draftModeButtons.map(({ label, onClick, icon: Icon, cls }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`px-2.5 py-1.5 ${cls} text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}

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
          <button type="button" onClick={() => setStatusMsg("")} className="text-xs hover:underline">
            닫기
          </button>
        </div>
      )}

      {/* 2. 본문 마스터-디테일 스튜디오 */}
      <div className="flex-1 min-h-0 lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 p-2.5 md:p-3">
        {/* 좌측 (5열): 연도별 근로계약서·보안서약서 보관 대장 + 편집 폼 */}
        <EmploymentContractFormAndListPanel
          contracts={contracts}
          employees={employees}
          searchQuery={searchQuery}
          selectedContractId={selectedContractId}
          form={form}
          setForm={setForm}
          saving={saving}
          pledgeFileInputRef={pledgeFileInputRef}
          setRightViewMode={setRightViewMode}
          loadContractIntoForm={loadContractIntoForm}
          handleDeleteContract={handleDeleteContract}
          handleSaveContract={handleSaveContract}
          handleStartNewHire={handleStartNewHire}
          handleStartRenewal={handleStartRenewal}
          handleStartSecurityPledge={handleStartSecurityPledge}
          handleSelectEmployee={handleSelectEmployee}
          handlePledgeScanUpload={handlePledgeScanUpload}
        />

        {/* 우측 (7열): 근로계약서 양식 / 근로계약서 스캔본 / 정보보호서약서 양식 / 보안서약서 스캔본 4탭 뷰어 */}
        <div className="lg:col-span-7 flex flex-col min-h-0 lg:h-full bg-[#f4efe4] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <ContractDocumentPreviewPanel
            form={form as any}
            rightViewMode={rightViewMode}
            setRightViewMode={setRightViewMode}
            fileInputRef={fileInputRef}
            pledgeFileInputRef={pledgeFileInputRef}
            handlePrintDocument={handlePrintDocument}
          />
        </div>
      </div>
    </div>
  );
};
