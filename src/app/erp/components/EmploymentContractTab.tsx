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
import { formatErpCurrency, toErpInputString, cleanErpNumber, matchHangulAny, sortErpItems } from "@/lib/erpFormat";
import { SortableTh, useErpTableSort } from "./SortableTh";

import {
  EmploymentContractItem,
  EmployeeOption,
  RightViewMode,
  EmploymentContractFormState,
  CONTRACT_TYPE_LABELS,
  formatKoreanDateParts,
} from "./employment-contracts/employmentContractTypes";
import { ContractDocumentPreviewPanel } from "./employment-contracts/ContractDocumentPreviewPanel";

export type { EmploymentContractItem };

interface EmploymentContractTabProps {
  currentUser?: any;
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
      if (form.employeeId) {
        sessionStorage.setItem("dragonrpa_erp_selected_emp_id", String(form.employeeId));
      }
      if (form.employeeName) {
        sessionStorage.setItem("dragonrpa_erp_selected_emp_name", form.employeeName);
      }
    } catch (e) {}
  }, [form, selectedContractId, rightViewMode, yearFilter, typeFilter]);

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

  const fetchAllData = async (explicitTargetContractId?: number | null) => {
    setLoading(true);
    try {
      const [cRes, eRes] = await Promise.all([
        fetch(`/api/erp/employment-contracts?year=${yearFilter}&contractType=${typeFilter}`, { cache: "no-store" }),
        fetch("/api/erp/employees?includePii=1", { cache: "no-store" }),
      ]);
      const cData = await cRes.json();
      const eData = await eRes.json();

      const loadedEmps: EmployeeOption[] =
        eData.success && Array.isArray(eData.employees) ? eData.employees : [];
      if (loadedEmps.length > 0) {
        setEmployees(loadedEmps);
      }

      const loadedContracts: EmploymentContractItem[] =
        cData.success && Array.isArray(cData.contracts) ? cData.contracts : [];
      if (cData.success && Array.isArray(cData.contracts)) {
        setContracts(loadedContracts);
      }

      // 최초 마운트 시에만 초기 선택 복원 수행 (필터·탭·모드 변경 시 기존 선택된 사원이 풀리지 않도록 보호)
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        let restored = false;

        try {
          const savedEmpId = sessionStorage.getItem("dragonrpa_erp_selected_emp_id");
          const savedEmpName = sessionStorage.getItem("dragonrpa_erp_selected_emp_name");
          const savedDraftStr = sessionStorage.getItem("dragonrpa_erp_contract_draft");
          const savedDraft = savedDraftStr ? JSON.parse(savedDraftStr) : null;

          // 1) 직전에 근로계약서 화면에서 작성 중이던 사원과 조직 인사관리에서 선택한 사원이 동일한 경우 드래프트 복원
          if (
            savedDraft &&
            savedDraft.form &&
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
            // 2) 조직 인사관리 등에서 선택/신규등록한 직원이 있는 경우 해당 직원을 최우선 자동 선택
            const matchedEmp =
              loadedEmps.find((e) => savedEmpId && String(e.id) === String(savedEmpId)) ||
              loadedEmps.find((e) => savedEmpName && e.name === savedEmpName);
            if (matchedEmp) {
              const empContract = loadedContracts.find((c) => c.employeeId === matchedEmp.id);
              if (empContract) {
                loadContractIntoForm(empContract);
              } else {
                populateEmployeeIntoNewDraft(matchedEmp, loadedContracts, "NEW_HIRE");
              }
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
        // 이미 초기화된 상태에서 저장 직후이거나 연도/유형 필터를 변경한 경우:
        const targetId = explicitTargetContractId !== undefined ? explicitTargetContractId : selectedContractId;
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
          if (sameEmpContract) {
            loadContractIntoForm(sameEmpContract);
          }
        } else if (explicitTargetContractId === null) {
          if (loadedContracts.length > 0) {
            loadContractIntoForm(loadedContracts[0]);
          } else {
            setSelectedContractId(null);
            setForm((prev) => ({
              ...prev,
              id: 0,
              contractNo: "",
            }));
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

  const loadContractIntoForm = (c: EmploymentContractItem) => {
    setSelectedContractId(c.id);
    try {
      if (c.employeeId) {
        sessionStorage.setItem("dragonrpa_erp_selected_emp_id", String(c.employeeId));
      }
      if (c.employeeName) {
        sessionStorage.setItem("dragonrpa_erp_selected_emp_name", c.employeeName);
      }
    } catch (e) {}
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
                  ? {
                      ...item,
                      scanFileUrl: full.scanFileUrl,
                      pledgeScanUrl: full.pledgeScanUrl,
                    }
                  : item
              )
            );
          }
        })
        .catch(() => {});
    }
  };

  // 신입 채용 기본 양식 전환 (현재 선택된 사원이 있으면 선택 해제하지 않고 그대로 유지!)
  const handleStartNewHire = () => {
    const targetEmp =
      employees.find((e) => String(e.id) === String(form.employeeId)) ||
      employees.find((e) => form.employeeName && e.name.replace(" 대표이사", "") === form.employeeName);

    const existingWithPledge = targetEmp
      ? contracts.find((c) => c.employeeId === targetEmp.id && (c.pledgeScanUrl || c.residentRegNo))
      : null;

    const joinDt = targetEmp?.joinDate ? String(targetEmp.joinDate).slice(0, 10) : todayStr;
    const targetYear =
      yearFilter !== "ALL" ? yearFilter : joinDt.slice(0, 4) || currentYearStr;

    setSelectedContractId(null);
    setRightViewMode("DOCUMENT");
    setStatusMsg(
      targetEmp
        ? `[${targetEmp.name}] 신입 채용 근로계약서(및 입사 시 1회 보안서약서) 작성 모드입니다. (미등록 신규 입사자는 사원 선택에서 '직접 입력'을 선택하세요)`
        : "신입 직원 채용 근로계약서(및 입사 시 1회 보안서약서) 작성 모드입니다."
    );
    setForm((prev) => ({
      ...prev,
      id: 0,
      contractNo: "",
      contractYear: targetYear,
      contractType: "NEW_HIRE",
      status: "SIGNED",
      employeeId: targetEmp ? targetEmp.id : prev.employeeId,
      employeeName: targetEmp ? targetEmp.name.replace(" 대표이사", "") : prev.employeeName,
      employeePhone: targetEmp?.phone || prev.employeePhone,
      employeeAddress: targetEmp?.address || prev.employeeAddress,
      residentRegNo: existingWithPledge?.residentRegNo || prev.residentRegNo,
      employerName: "주식회사 드래곤알피에이",
      employerPhone: "010-9224-4097",
      employerAddress: "서울 금천구 서부샛길 528, 547호",
      employerRep: "이정용",
      startDate: joinDt,
      endDate: "",
      workplace: "서울시 금천구 벚꽃로278, SJ테크노빌 B155호",
      jobDescription: "주식회사 현대렌탈서비스의 렌탈자산 입/출고/배송 설치 등",
      workStartTime: "09:00",
      workEndTime: "18:00",
      breakMinutes: 60,
      workDays: "매주 월~금요일 근무",
      weeklyHoliday: "주휴일 매주 토~일요일",
      baseSalary: targetEmp ? Number(targetEmp.baseSalary || 2800000) : prev.baseSalary || 2800000,
      hourlyWageNote: "시급은 통상시급",
      mealAllowance: targetEmp ? Number(targetEmp.mealAllowance || 200000) : prev.mealAllowance || 200000,
      vehicleAllowance: targetEmp ? Number(targetEmp.vehicleAllowance || 0) : prev.vehicleAllowance || 0,
      otherAllowance: 0,
      otherAllowanceLabel: "",
      payDay: 10,
      payMethod: "근로자 명의 예금통장에 입금",
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

  // 입사 시 1회 정보보호(보안)서약서 전용 작성 모드 (현재 선택된 사원 유지)
  const handleStartSecurityPledge = () => {
    const targetEmp =
      employees.find((e) => String(e.id) === String(form.employeeId)) ||
      employees.find((e) => form.employeeName && e.name.replace(" 대표이사", "") === form.employeeName);

    const joinDt = targetEmp?.joinDate ? String(targetEmp.joinDate).slice(0, 10) : form.startDate || todayStr;
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
      employeeId: targetEmp ? targetEmp.id : prev.employeeId,
      employeeName: targetEmp ? targetEmp.name.replace(" 대표이사", "") : prev.employeeName,
      employeePhone: targetEmp?.phone || prev.employeePhone,
      employeeAddress: targetEmp?.address || prev.employeeAddress,
      startDate: joinDt,
      contractDate: joinDt,
      pledgeDate: joinDt,
      memo: "입사 시 정보보호(보안) 서약서 1회 작성 보관",
    }));
  };

  // 연봉협상 재계약 기본 양식 전환 (현재 선택된 사원 및 선택 연도 유지)
  const handleStartRenewal = (empId?: number) => {
    const targetEmp =
      (empId ? employees.find((e) => e.id === empId) : undefined) ||
      employees.find((e) => String(e.id) === String(form.employeeId)) ||
      employees.find((e) => form.employeeName && e.name.replace(" 대표이사", "") === form.employeeName);

    const targetYear =
      yearFilter !== "ALL" ? yearFilter : form.contractYear || currentYearStr;

    setSelectedContractId(null);
    setRightViewMode("DOCUMENT");
    setStatusMsg(
      targetEmp
        ? `[${targetEmp.name}] ${targetYear}년 연봉협상 재계약 작성 모드입니다. 변경된 기본급/식대를 입력하세요.`
        : `${targetYear}년 연봉협상 재계약 작성 모드입니다. 변경된 기본급/식대를 입력하세요.`
    );

    const janFirst = `${targetYear}-01-01`;
    setForm((prev) => ({
      ...prev,
      id: 0,
      contractNo: "",
      contractYear: targetYear,
      contractType: "RENEWAL",
      status: "SIGNED",
      employeeId: targetEmp ? targetEmp.id : prev.employeeId,
      employeeName: targetEmp ? targetEmp.name.replace(" 대표이사", "") : prev.employeeName,
      employeePhone: targetEmp?.phone || prev.employeePhone,
      employeeAddress: targetEmp?.address || prev.employeeAddress,
      startDate: janFirst,
      endDate: `${targetYear}-12-31`,
      workplace: "서울시 금천구 벚꽃로278, SJ테크노빌 B155호",
      jobDescription: "주식회사 현대렌탈서비스의 렌탈자산 입/출고/배송 설치 등",
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

    try {
      sessionStorage.setItem("dragonrpa_erp_selected_emp_id", String(emp.id));
      sessionStorage.setItem("dragonrpa_erp_selected_emp_name", emp.name);
    } catch (e) {}

    // 해당 사원의 기존 계약 중 보안서약서나 주민번호가 있는 레코드 참조
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

  // 근로계약서 & 보안서약서 DB 저장 (직접 저장 및 스캔 파일 업로드 시 즉시 자동 저장 공용)
  const saveContractFormToDb = async (
    targetForm: typeof form,
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
      const payloadId =
        targetForm.id > 0 ? targetForm.id : selectedContractId || 0;

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

  // 근로계약서 스캔 파일 업로드 및 AI OCR 자동 판독 + 즉시 DB 자동 저장
  const handleScanFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setStatusMsg("스캔된 문서를 분석하고 자동 저장하고 있습니다...");

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

      let nextForm = { ...form };
      let autoSaveMsg = "스캔 파일이 첨부 및 자동 저장되었습니다.";

      if (data.success && data.parsed) {
        const p = data.parsed;
        const isPledge = p.docKind === "PLEDGE" || /보안|서약|정보보호/.test(file.name);
        const matchedEmp = employees.find(
          (emp) => p.employeeName && emp.name.includes(p.employeeName)
        );

        if (isPledge) {
          nextForm = {
            ...form,
            employeeId: matchedEmp ? matchedEmp.id : form.employeeId,
            employeeName: p.employeeName || form.employeeName,
            residentRegNo: p.residentRegNo || form.residentRegNo,
            pledgeDate: p.contractDate || p.startDate || form.pledgeDate,
            pledgeScanName: file.name,
            pledgeScanUrl: dataUrl,
          };
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
            mealAllowance:
              p.mealAllowance !== undefined ? p.mealAllowance : form.mealAllowance,
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
          nextForm = {
            ...form,
            pledgeScanName: file.name,
            pledgeScanUrl: dataUrl,
          };
          setForm(nextForm);
          setRightViewMode("PLEDGE_SCAN");
          autoSaveMsg = "보안서약서 스캔본이 첨부 및 자동 저장되었습니다.";
        } else {
          nextForm = {
            ...form,
            scanFileName: file.name,
            scanFileUrl: dataUrl,
          };
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

      let nextForm = { ...form };
      if (data.success && data.parsed) {
        const p = data.parsed;
        const matchedEmp = employees.find(
          (emp) => p.employeeName && emp.name.includes(p.employeeName)
        );
        nextForm = {
          ...form,
          employeeId: matchedEmp ? matchedEmp.id : form.employeeId,
          employeeName: p.employeeName || form.employeeName,
          residentRegNo: p.residentRegNo || form.residentRegNo,
          pledgeDate: p.contractDate || p.startDate || form.pledgeDate,
          pledgeScanName: file.name,
          pledgeScanUrl: dataUrl,
        };
      } else {
        nextForm = {
          ...form,
          pledgeScanName: file.name,
          pledgeScanUrl: dataUrl,
        };
      }

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

  // 근로계약서 & 보안서약서 수동 DB 저장
  const handleSaveContract = async () => {
    setStatusMsg("");
    await saveContractFormToDb(form);
  };

  const handleDeleteContract = async (id: number, name: string) => {
    if (!confirm(`${name} 문서를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/erp/employment-contracts?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        const wasSelected = selectedContractId === id || form.id === id;
        if (wasSelected) {
          setSelectedContractId(null);
        }
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

  const contractSort = useErpTableSort("", null);

  const filteredContracts = useMemo(() => {
    const list = contracts.filter((c) => {
      if (searchQuery.trim()) {
        return matchHangulAny(
          [
            c.employeeName,
            c.contractNo,
            c.jobDescription,
            c.memo,
          ],
          searchQuery
        );
      }
      return true;
    });
    return sortErpItems(list, contractSort.sortKey, contractSort.sortDir);
  }, [contracts, searchQuery, contractSort.sortKey, contractSort.sortDir]);

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
            onClick={() => fetchAllData()}
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
                      if (nextType === "NEW_HIRE") {
                        handleStartNewHire();
                      } else if (nextType === "RENEWAL") {
                        handleStartRenewal();
                      } else if (nextType === "SECURITY_PLEDGE") {
                        handleStartSecurityPledge();
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
                          memo:
                            isValidYear && isRenewal
                              ? `${val}년 연봉협상 재계약 체결`
                              : prev.memo,
                        };
                      });
                    }}
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
                      type="text"
                      inputMode="numeric"
                      value={form.baseSalary ? toErpInputString(form.baseSalary) : ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          baseSalary: cleanErpNumber(e.target.value),
                        }))
                      }
                      placeholder="0"
                      className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono font-bold text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                      식대 (원)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.mealAllowance ? toErpInputString(form.mealAllowance) : ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mealAllowance: cleanErpNumber(e.target.value),
                        }))
                      }
                      placeholder="0"
                      className="bg-white dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded px-2 py-1 text-right font-mono font-bold text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400 whitespace-nowrap">
                      차량보조금 (원)
                    </label>
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