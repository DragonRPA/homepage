"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { formatErpCurrency, toErpInputString, cleanErpNumber } from "@/lib/erpFormat";
import { calculateServiceEmployeeMonthlyProRata } from "@/lib/erpHrLaborDomain";
import { resolveContractItemTemplate, resolveContractTaxItemsTemplate } from "@/lib/erpContractTemplate";
import { sortCustomersByName } from "@/lib/hangulSearch";
import { type SearchSelectOption } from "../SearchSelectCombobox";
import { type BuyerTaxSpec, createDefaultTaxSpec, extractPartnerTaxSpec } from "../ContractTaxInvoiceSection";
import { findBlockedPartnerMatch, getPartnerTradeBlockInfo } from "@/lib/partnerStatusClient";
import type { ServiceDocViewerState } from "./ServiceLedgersAndDocModal";
import type { AssignedServiceEmployee } from "./serviceTypes";

export interface OtBreakdownState {
  month: string;
  totalHours: number;
  totalOtPay: number;
  byEmp: Record<number, { hours: number; otPay: number; count: number }>;
}

export const EMPTY_OT_BREAKDOWN: OtBreakdownState = { month: "", totalHours: 0, totalOtPay: 0, byEmp: {} };
export const RETIRED_EMP_STATUSES = new Set(["RETIRED", "RESIGNED", "퇴사", "퇴직"]);

export const toTaxSpecPayload = (spec: BuyerTaxSpec) => ({
  customerBizNo: spec.customerBizNo,
  customerCeoName: spec.customerCeoName,
  customerAddress: spec.customerAddress,
  customerBizType: spec.customerBizType,
  customerBizClass: spec.customerBizClass,
  customerEmail: spec.customerEmail,
  customerEmail2: spec.customerEmail2,
  taxPurpose: spec.taxPurpose,
  taxMemo: spec.taxMemo,
  taxItems: spec.taxItems,
});

export interface UseServiceTabControllerParams {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onNavigateToTax?: () => void;
}

async function requestServiceJson(url: string, init: RequestInit | undefined, fallbackError: string) {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || fallbackError);
  return data;
}

function formatOtBreakdownNotes(items: Array<{ employeeName: string; hours: number; otPay: number }>) {
  return items
    .filter((x) => x.otPay > 0 || x.hours > 0)
    .map((x) => `${x.employeeName} ${x.hours}h(${x.otPay.toLocaleString()}원)`)
    .join(", ");
}

/**
 * 용역 계약(운영/개발)·투입 인원 일할계산·초과근무수당 연동 및 청구 관리 컨트롤러 훅
 */
export function useServiceTabController({
  currentUser,
  selectedEntity = "ALL",
  onNavigateToTax: _onNavigateToTax,
}: UseServiceTabControllerParams) {
  const canBill =
    currentUser?.roleCode === "ADMIN" ||
    currentUser?.loginId === "admin" ||
    Boolean(currentUser?.canBill);
  const [activeType, setActiveType] = useState<"OPERATIONAL" | "DEVELOPMENT">("OPERATIONAL");
  const [loading, setLoading] = useState(false);

  // Data States
  const [contracts, setContracts] = useState<any[]>([]);
  const [billings, setBillings] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Modals
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showEditContractModal, setShowEditContractModal] = useState(false);
  const [showAddBillingModal, setShowAddBillingModal] = useState(false);
  const [activeDocViewer, setActiveDocViewer] = useState<ServiceDocViewerState | null>(null);
  const contractFileCacheRef = useRef<Record<number, { url: string; fileName: string }>>({});

  // Contract Form (Add)
  const [ctEntityType, setCtEntityType] = useState<"CORP" | "INDIVIDUAL">(
    selectedEntity === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP"
  );

  useEffect(() => {
    if (selectedEntity === "INDIVIDUAL") setCtEntityType("INDIVIDUAL");
    else if (selectedEntity === "CORP") setCtEntityType("CORP");
  }, [selectedEntity]);

  const [ctPartnerId, setCtPartnerId] = useState<number | null>(null);
  const [ctCustomer, setCtCustomer] = useState("");
  const [ctProject, setCtProject] = useState("");
  const [ctAmount, setCtAmount] = useState("0");
  const [ctMonthlyFee, setCtMonthlyFee] = useState("0");
  const [ctStart, setCtStart] = useState(new Date().toISOString().split("T")[0]);
  const [ctEnd, setCtEnd] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [ctBillingDay, setCtBillingDay] = useState("25");
  const [ctMemo, setCtMemo] = useState("");
  const [ctVatAmount, setCtVatAmount] = useState("0");
  const [ctTaxSpec, setCtTaxSpec] = useState<BuyerTaxSpec>(() =>
    createDefaultTaxSpec("{yyyy}년 {mm}월 용역료", 0)
  );
  const [ctFileUrl, setCtFileUrl] = useState("");
  const [ctFileName, setCtFileName] = useState("");
  const [isCtFileDragging, setIsCtFileDragging] = useState(false);
  const ctFileInputRef = useRef<HTMLInputElement>(null);
  const [ctAssignedEmployees, setCtAssignedEmployees] = useState<AssignedServiceEmployee[]>([]);
  const [ctSelectedEmpId, setCtSelectedEmpId] = useState<string>("");
  const [ctIncludeOtInBilling, setCtIncludeOtInBilling] = useState<boolean>(false);
  const [ctApplyProRata, setCtApplyProRata] = useState<boolean>(true);
  const [ctProRataMonth, setCtProRataMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [ctOtBreakdown, setCtOtBreakdown] = useState<OtBreakdownState>(EMPTY_OT_BREAKDOWN);

  // Contract Form (Edit)
  const [editCtId, setEditCtId] = useState<number | null>(null);
  const [editCtContractNo, setEditCtContractNo] = useState("");
  const [editCtEntityType, setEditCtEntityType] = useState<"CORP" | "INDIVIDUAL">("CORP");
  const [editCtPartnerId, setEditCtPartnerId] = useState<number | null>(null);
  const [editCtCustomer, setEditCtCustomer] = useState("");
  const [editCtProject, setEditCtProject] = useState("");
  const [editCtAmount, setEditCtAmount] = useState("0");
  const [editCtMonthlyFee, setEditCtMonthlyFee] = useState("0");
  const [editCtVatAmount, setEditCtVatAmount] = useState("0");
  const [editCtStart, setEditCtStart] = useState("");
  const [editCtEnd, setEditCtEnd] = useState("");
  const [editCtBillingDay, setEditCtBillingDay] = useState("25");
  const [editCtStatus, setEditCtStatus] = useState("ACTIVE");
  const [editCtMemo, setEditCtMemo] = useState("");
  const [editCtTaxSpec, setEditCtTaxSpec] = useState<BuyerTaxSpec>(() =>
    createDefaultTaxSpec("용역료", 0)
  );
  const [editCtFileUrl, setEditCtFileUrl] = useState("");
  const [editCtFileName, setEditCtFileName] = useState("");
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editCtAssignedEmployees, setEditCtAssignedEmployees] = useState<AssignedServiceEmployee[]>([]);
  const [editCtSelectedEmpId, setEditCtSelectedEmpId] = useState<string>("");
  const [editCtIncludeOtInBilling, setEditCtIncludeOtInBilling] = useState<boolean>(false);
  const [editCtApplyProRata, setEditCtApplyProRata] = useState<boolean>(true);
  const [editCtProRataMonth, setEditCtProRataMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [editCtOtBreakdown, setEditCtOtBreakdown] = useState<OtBreakdownState>(EMPTY_OT_BREAKDOWN);

  // Billing Form
  const [blContractId, setBlContractId] = useState("");
  const [blMilestoneName, setBlMilestoneName] = useState("");
  const [blSupplyAmount, setBlSupplyAmount] = useState("0");
  const [blVatAmount, setBlVatAmount] = useState("0");
  const [blDate, setBlDate] = useState(new Date().toISOString().split("T")[0]);
  const [blTaxSpec, setBlTaxSpec] = useState<BuyerTaxSpec>(() =>
    createDefaultTaxSpec("정기 용역료", 0)
  );
  const [blIncludeOtInBilling, setBlIncludeOtInBilling] = useState<boolean>(false);
  const [blApplyProRata, setBlApplyProRata] = useState<boolean>(true);
  const [blOtSummary, setBlOtSummary] = useState<{
    loading: boolean;
    month: string;
    totalHours: number;
    totalOtPay: number;
    items: Array<{ employeeId: number; employeeName: string; hours: number; otPay: number; count: number }>;
  }>({ loading: false, month: "", totalHours: 0, totalOtPay: 0, items: [] });

  // 하단 청구 내역 계약별 필터 상태
  const [billingContractFilter, setBillingContractFilter] = useState<string>("ALL");

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sortedPartners = useMemo(() => sortCustomersByName(partners), [partners]);

  const servicePartnerOptions = useMemo<SearchSelectOption[]>(() => {
    return sortedPartners.map((p) => {
      const block = getPartnerTradeBlockInfo(p);
      return {
        value: String(p.id),
        label: p.name,
        subLabel: `사업자: ${p.businessNo || "-"}${p.ceoName ? ` | 대표: ${p.ceoName}` : ""}`,
        badgeText: block.blocked ? block.badgeText : (p.partnerCode || undefined),
        badgeColor: block.blocked ? "rose" : "blue",
        searchKeywords: [p.name, p.businessNo, p.ceoName, p.partnerCode],
        disabled: block.blocked,
      };
    });
  }, [sortedPartners]);

  const serviceContractOptions = useMemo<SearchSelectOption[]>(() => {
    return contracts.map((c) => ({
      value: String(c.id),
      label: `[${c.contractNo}] ${c.customerName} - ${c.projectName}`,
      subLabel:
        activeType === "OPERATIONAL"
          ? `월 ${formatErpCurrency(c.monthlyFee)}`
          : `총 ${formatErpCurrency(c.contractAmount)}`,
      badgeText: c.entityType === "INDIVIDUAL" ? "개인" : "법인",
      badgeColor: c.entityType === "INDIVIDUAL" ? "amber" : "blue",
      searchKeywords: [c.contractNo, c.customerName, c.projectName],
    }));
  }, [contracts, activeType]);

  // Fetch Partners & Employees for Auto-complete and Operational Staffing
  const fetchPartners = async () => {
    try {
      const [pRes, eRes] = await Promise.all([
        fetch("/api/erp/partners?type=CUSTOMER", { cache: "no-store" }),
        fetch("/api/erp/employees", { cache: "no-store" }),
      ]);
      const [pData, eData] = await Promise.all([pRes.json(), eRes.json()]);
      if (pData.success) {
        setPartners(pData.partners || []);
      }
      if (eData.success) {
        const rawEmployees = Array.isArray(eData.employees) ? eData.employees : [];
        const isRetiredEmp = (emp: any) => {
          const st = String(emp.status || "").toUpperCase();
          const empSt = String(emp.employmentStatus || "").toUpperCase();
          const hasLeaveDate = Boolean(emp.leaveDate && String(emp.leaveDate).trim() !== "");
          return hasLeaveDate || RETIRED_EMP_STATUSES.has(st) || RETIRED_EMP_STATUSES.has(empSt);
        };
        const sortedAll = [...rawEmployees].sort((a, b) => {
          const aRet = isRetiredEmp(a) ? 1 : 0;
          const bRet = isRetiredEmp(b) ? 1 : 0;
          if (aRet !== bRet) return aRet - bRet;
          return String(a.name || "").localeCompare(String(b.name || ""), "ko");
        });
        setAllEmployees(sortedAll);
        setEmployees(sortedAll);
      }
    } catch (e) {
      console.warn("고객사/임직원 목록 로드 실패:", e);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  // 투입 임직원들의 특정 연월(YYYY-MM) 초과근무수당 합산 조회 헬퍼
  const fetchAssignedOvertimeBreakdown = async (
    list: AssignedServiceEmployee[],
    monthStr: string
  ) => {
    const targetMonth = (monthStr || new Date().toISOString().slice(0, 7)).slice(0, 7);
    const emptyResult = () => ({
      month: targetMonth,
      totalHours: 0,
      totalOtPay: 0,
      byEmp: {} as Record<number, { hours: number; otPay: number; count: number }>,
      items: [] as Array<{ employeeId: number; employeeName: string; hours: number; otPay: number; count: number }>,
    });

    if (!Array.isArray(list) || list.length === 0) return emptyResult();
    const empIds = list.map((e) => Number(e.employeeId)).filter((id) => !isNaN(id) && id > 0);
    if (empIds.length === 0) return emptyResult();

    try {
      const res = await fetch(
        `/api/erp/overtimes?month=${encodeURIComponent(targetMonth)}&employeeIds=${empIds.join(",")}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const rows: any[] = data.overtimes || [];

      const byEmp: Record<number, { hours: number; otPay: number; count: number }> = {};
      empIds.forEach((id) => {
        byEmp[id] = { hours: 0, otPay: 0, count: 0 };
      });

      let totalHours = 0;
      let totalOtPay = 0;

      rows.forEach((r) => {
        if (r.status === "REJECTED") return;
        const eid = Number(r.employeeId);
        if (!byEmp[eid]) byEmp[eid] = { hours: 0, otPay: 0, count: 0 };
        const h = Number(r.otHours || 0);
        const p = Number(r.otPay || 0);
        byEmp[eid].hours = Math.round((byEmp[eid].hours + h) * 100) / 100;
        byEmp[eid].otPay += p;
        byEmp[eid].count += 1;
        totalHours = Math.round((totalHours + h) * 100) / 100;
        totalOtPay += p;
      });

      const items = list.map((emp) => ({
        employeeId: emp.employeeId,
        employeeName: emp.name,
        hours: byEmp[emp.employeeId]?.hours || 0,
        otPay: byEmp[emp.employeeId]?.otPay || 0,
        count: byEmp[emp.employeeId]?.count || 0,
      }));

      return { month: targetMonth, totalHours, totalOtPay, byEmp, items };
    } catch (e) {
      console.warn("투입 임직원 초과근무 조회 실패:", e);
      return emptyResult();
    }
  };

  // 투입 임직원 엔트리에 사원대장(allEmployees, 퇴사자 포함)의 입사일/퇴사일 메타데이터 보강 헬퍼
  const enrichAssignedEmployeeJoinDates = (list: AssignedServiceEmployee[]): AssignedServiceEmployee[] => {
    if (!Array.isArray(list)) return [];
    const sourceList = allEmployees.length > 0 ? allEmployees : employees;
    return list.map((item) => {
      const matched = sourceList.find(
        (emp) =>
          (item.employeeId && Number(emp.id) === Number(item.employeeId)) ||
          (item.employeeNo && String(emp.employeeNo || "").trim() === String(item.employeeNo).trim()) ||
          (item.name && String(emp.name || "").trim() === String(item.name).trim())
      );
      const joinDate = item.joinDate
        ? String(item.joinDate).slice(0, 10)
        : matched?.joinDate
        ? String(matched.joinDate).slice(0, 10)
        : "";
      const leaveDate = item.leaveDate
        ? String(item.leaveDate).slice(0, 10)
        : matched?.leaveDate
        ? String(matched.leaveDate).slice(0, 10)
        : "";
      const baseSalary = Math.round(Number(item.baseSalary || matched?.baseSalary || 0));
      return {
        ...item,
        joinDate,
        leaveDate,
        baseSalary,
        proRataEnabled: item.proRataEnabled !== false,
      };
    });
  };

  // 투입 임직원 일할계산 평가 및 주석 생성 공통 헬퍼
  const evaluateAssignedProRata = (
    list: AssignedServiceEmployee[],
    targetMonth: string,
    applyProRata: boolean
  ) => {
    const details = list.map((item) => ({
      item,
      calc: calculateServiceEmployeeMonthlyProRata(
        item.contractRate,
        targetMonth,
        item.joinDate,
        item.leaveDate,
        applyProRata && item.proRataEnabled !== false,
        true
      ),
    }));
    const totalBaseRate = list.reduce((acc, item) => acc + (Number(item.contractRate) || 0), 0);
    const totalEffectiveRate = details.reduce((acc, x) => acc + x.calc.effectiveAmount, 0);
    const activeHeadcount = details.filter(
      (x) => !x.calc.isAfterLeft && !x.calc.isNotYetJoined
    ).length;
    const proRatedNotes = details
      .filter((x) => x.calc.isProRated && !x.calc.isAfterLeft)
      .map((x) =>
        x.calc.isNotYetJoined
          ? `${x.item.name} 미투입(${x.item.joinDate?.slice(5).replace("-", "/")} 입사전 0원)`
          : `${x.item.name} 일할(${x.calc.shortBadge}: ${x.calc.effectiveAmount.toLocaleString()}원)`
      );
    const hasAnyProRated = details.some((x) => x.calc.isProRated);
    return { details, totalBaseRate, totalEffectiveRate, activeHeadcount, proRatedNotes, hasAnyProRated };
  };

  // 투입 임직원 목록, 일할계산 옵션 또는 초과근무수당 반영 옵션이 변경될 때 월 정기 용역료 및 세금계산서 품목 동기화
  const syncAssignedEmployeesToContract = async (
    rawList: AssignedServiceEmployee[],
    isEdit: boolean,
    overrideIncludeOt?: boolean,
    overrideApplyProRata?: boolean,
    overrideTargetMonth?: string
  ) => {
    const list = enrichAssignedEmployeeJoinDates(rawList);
    const includeOt =
      overrideIncludeOt !== undefined
        ? overrideIncludeOt
        : isEdit
        ? editCtIncludeOtInBilling
        : ctIncludeOtInBilling;

    const applyProRata =
      overrideApplyProRata !== undefined
        ? overrideApplyProRata
        : isEdit
        ? editCtApplyProRata
        : ctApplyProRata;

    const curMonth = (
      overrideTargetMonth ||
      (isEdit ? editCtProRataMonth : ctProRataMonth) ||
      new Date().toISOString().slice(0, 7)
    ).slice(0, 7);

    const { totalBaseRate, totalEffectiveRate, activeHeadcount, proRatedNotes } =
      evaluateAssignedProRata(list, curMonth, applyProRata);

    const totalRate = applyProRata ? totalEffectiveRate : totalBaseRate;
    const baseVat = Math.round(totalRate * 0.1);
    const countSpec = list.length > 0 ? `${applyProRata ? activeHeadcount : list.length}인` : "";

    const otBreakdown = await fetchAssignedOvertimeBreakdown(list, curMonth);

    if (isEdit) {
      setEditCtAssignedEmployees(list);
      setEditCtOtBreakdown(otBreakdown);
    } else {
      setCtAssignedEmployees(list);
      setCtOtBreakdown(otBreakdown);
    }

    const otPayToAdd = includeOt ? otBreakdown.totalOtPay : 0;
    const otVatToAdd = Math.round(otPayToAdd * 0.1);
    const combinedSupply = totalRate + otPayToAdd;
    const combinedVat = Math.round(combinedSupply * 0.1);

    const buildUpdatedTaxItems = (prevItems: any[]) => {
      const nonOtItems = prevItems.filter(
        (it) => !String(it?.itemName || "").includes("초과근무수당")
      );
      const updatedBase = nonOtItems.map((it, idx) =>
        idx === 0 && list.length > 0
          ? {
              ...it,
              spec: countSpec || it.spec,
              qty: 1,
              unitCost: totalRate,
              supplyAmount: totalRate,
              vatAmount: baseVat,
              note:
                proRatedNotes.length > 0
                  ? proRatedNotes.join(", ")
                  : String(it.note || "").includes("일할(")
                  ? ""
                  : it.note,
            }
          : it
      );

      if (includeOt && list.length > 0) {
        const noteStr = formatOtBreakdownNotes(otBreakdown.items);
        updatedBase.push({
          month: curMonth.slice(5, 7),
          day: "25",
          itemName: "{yyyy}년 {mm}월 초과근무수당",
          spec: `${applyProRata && activeHeadcount > 0 ? activeHeadcount : list.length}인 (${otBreakdown.totalHours}h)`,
          qty: 1,
          unitCost: otPayToAdd,
          supplyAmount: otPayToAdd,
          vatAmount: otVatToAdd,
          note: noteStr || "투입인원 초과근무수당 자동합산",
        });
      }
      return updatedBase;
    };

    if (activeType === "OPERATIONAL" && list.length > 0) {
      const setFee = isEdit ? setEditCtMonthlyFee : setCtMonthlyFee;
      const setVat = isEdit ? setEditCtVatAmount : setCtVatAmount;
      const setSpec = isEdit ? setEditCtTaxSpec : setCtTaxSpec;
      setFee(toErpInputString(combinedSupply));
      setVat(toErpInputString(combinedVat));
      setSpec((prev) => ({ ...prev, taxItems: buildUpdatedTaxItems(prev.taxItems) }));
    }
  };

  const handleSelectPartner = (p: any) => {
    setCtPartnerId(p.id);
    setCtCustomer(p.name);
    setCtTaxSpec((prev) => extractPartnerTaxSpec(p, prev));
  };

  const readContractFile = (file: File, onLoaded: (dataUrl: string, fileName: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onLoaded((e.target?.result as string) || "", file.name);
    reader.onerror = () => showToast("계약서 파일 읽기 실패", "error");
    reader.readAsDataURL(file);
  };

  const handleContractFileUpload = (file: File) => {
    readContractFile(file, (dataUrl, name) => {
      setCtFileUrl(dataUrl);
      setCtFileName(name);
      showToast(`계약서 파일(${name})이 첨부되었습니다.`);
    });
  };

  const handleEditFileUpload = (file: File) => {
    readContractFile(file, (dataUrl, name) => {
      setEditCtFileUrl(dataUrl);
      setEditCtFileName(name);
      showToast(`새 계약서 파일(${name})이 첨부되었습니다.`);
    });
  };

  const handleOpenContractFile = async (c: any) => {
    const openViewer = (url: string, fileName: string) =>
      setActiveDocViewer({
        title: `${c.contractNo} 계약서 원본`,
        customerName: c.customerName,
        url,
        fileName,
      });

    const cached = contractFileCacheRef.current[c.id];
    if (cached) {
      openViewer(cached.url, cached.fileName);
      return;
    }
    try {
      const res = await fetch(`/api/erp/services/contracts?id=${c.id}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.contract?.contractFileUrl) {
        const entry = {
          url: data.contract.contractFileUrl,
          fileName: data.contract.contractFileName || `${c.contractNo}_계약서`,
        };
        contractFileCacheRef.current[c.id] = entry;
        openViewer(entry.url, entry.fileName);
      } else {
        showToast("등록된 계약서 파일을 찾을 수 없습니다.", "error");
      }
    } catch {
      showToast("계약서 파일 조회 실패", "error");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const entityQuery = selectedEntity && selectedEntity !== "ALL" ? `&entityType=${selectedEntity}` : "";
      const [cRes, bRes] = await Promise.all([
        fetch(`/api/erp/services/contracts?serviceType=${activeType}${entityQuery}`, { cache: "no-store" }),
        fetch(`/api/erp/services/billings?serviceType=${activeType}${entityQuery}`, { cache: "no-store" }),
      ]);
      const [cData, bData] = await Promise.all([cRes.json(), bRes.json()]);

      if (cData.success) setContracts(cData.contracts || []);
      if (bData.success) setBillings(bData.billings || []);
    } catch (err: any) {
      console.error(err);
      showToast("데이터 로드 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeType, selectedEntity]);

  // Handle Add Contract
  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctCustomer || !ctProject || !ctStart || !ctEnd) {
      showToast("고객사, 프로젝트명, 계약 기간은 필수입니다.", "error");
      return;
    }
    const blockedCust = findBlockedPartnerMatch(partners, {
      partnerId: ctPartnerId,
      name: ctCustomer,
      businessNo: ctTaxSpec.customerBizNo,
    });
    if (blockedCust) {
      showToast(`[${blockedCust.name}] ${getPartnerTradeBlockInfo(blockedCust).reason}`, "error");
      return;
    }
    try {
      await requestServiceJson(
        "/api/erp/services/contracts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: ctEntityType,
            serviceType: activeType,
            partnerId: ctPartnerId,
            customerName: ctCustomer,
            projectName: ctProject,
            contractAmount: cleanErpNumber(ctAmount),
            monthlyFee: cleanErpNumber(ctMonthlyFee),
            vatAmount: cleanErpNumber(ctVatAmount),
            startDate: ctStart,
            endDate: ctEnd,
            billingDay: ctBillingDay,
            memo: ctMemo,
            contractFileUrl: ctFileUrl || null,
            contractFileName: ctFileName || null,
            ...toTaxSpecPayload(ctTaxSpec),
            assignedEmployees: ctAssignedEmployees,
            includeOtInBilling: ctIncludeOtInBilling,
          }),
        },
        "계약 등록 실패"
      );

      showToast(`[${activeType === "OPERATIONAL" ? "운영용역" : "개발용역"}] 계약 등록 완료`);
      setShowAddContractModal(false);
      setCtPartnerId(null);
      setCtCustomer("");
      setCtProject("");
      setCtMemo("");
      setCtFileUrl("");
      setCtFileName("");
      setCtAssignedEmployees([]);
      setCtSelectedEmpId("");
      setCtIncludeOtInBilling(false);
      setCtOtBreakdown(EMPTY_OT_BREAKDOWN);
      setCtAmount("0");
      setCtMonthlyFee("0");
      setCtVatAmount("0");
      setCtTaxSpec(createDefaultTaxSpec("{yyyy}년 {mm}월 용역료", 0));
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Open Edit Contract Modal
  const handleOpenEditContract = async (c: any) => {
    setEditCtId(c.id);
    setEditCtContractNo(c.contractNo);
    setEditCtEntityType(c.entityType || "CORP");
    setEditCtPartnerId(c.partnerId || null);
    setEditCtCustomer(c.customerName);
    setEditCtProject(c.projectName);
    setEditCtAmount(toErpInputString(c.contractAmount));
    setEditCtMonthlyFee(toErpInputString(c.monthlyFee));
    const baseSupply = activeType === "OPERATIONAL" ? Number(c.monthlyFee || 0) : Number(c.contractAmount || 0);
    const baseVat = c.vatAmount != null ? Number(c.vatAmount) : Math.round(baseSupply * 0.1);
    setEditCtVatAmount(toErpInputString(baseVat));
    setEditCtStart(c.startDate ? String(c.startDate).slice(0, 10) : "");
    setEditCtEnd(c.endDate ? String(c.endDate).slice(0, 10) : "");
    setEditCtBillingDay(String(c.billingDay || "25"));
    setEditCtStatus(c.status || "ACTIVE");
    setEditCtMemo(c.memo || "");
    setEditCtFileUrl("");
    setEditCtFileName(c.contractFileName || "");
    const assignedList: AssignedServiceEmployee[] = enrichAssignedEmployeeJoinDates(
      Array.isArray(c.assignedEmployees) ? c.assignedEmployees.map((emp: any) => ({ ...emp })) : []
    );
    const curMonth = new Date().toISOString().slice(0, 7);
    setEditCtProRataMonth(curMonth);
    setEditCtApplyProRata(true);
    setEditCtAssignedEmployees(assignedList);
    setEditCtSelectedEmpId("");
    setEditCtIncludeOtInBilling(Boolean(c.includeOtInBilling));

    // 중도입퇴사자가 당월에 존재할 경우 주휴/일할계산 반영 금액으로 초기 표시
    const {
      totalEffectiveRate: proRatedSum,
      proRatedNotes,
      hasAnyProRated: hasProRatedInCurMonth,
    } = evaluateAssignedProRata(assignedList, curMonth, true);

    const effectiveInitialSupply =
      activeType === "OPERATIONAL" && assignedList.length > 0 && hasProRatedInCurMonth
        ? proRatedSum
        : baseSupply;
    const effectiveInitialVat = Math.round(effectiveInitialSupply * 0.1);
    if (activeType === "OPERATIONAL" && assignedList.length > 0 && hasProRatedInCurMonth) {
      setEditCtMonthlyFee(toErpInputString(effectiveInitialSupply));
      setEditCtVatAmount(toErpInputString(effectiveInitialVat));
    }

    const baseProjectName = (c.projectName || "용역료").trim();
    const defaultTemplate = /\{[^}]+\}/.test(baseProjectName)
      ? baseProjectName
      : `{yyyy}년 {mm}월 ${baseProjectName.endsWith("료") || baseProjectName.endsWith("비") ? baseProjectName : `${baseProjectName}료`}`;
    const defaultSpec = createDefaultTaxSpec(defaultTemplate, effectiveInitialSupply);
    const savedMemo = (c.taxMemo ?? "").trim();
    const resolvedInitialMemo =
      !savedMemo || savedMemo === baseProjectName ? defaultTemplate : savedMemo;
    const matchedPartner = partners.find(
      (p) => (c.partnerId && p.id === c.partnerId) || p.name === c.customerName || (c.customerBizNo && p.businessNo === c.customerBizNo)
    );
    const partnerAddr = matchedPartner
      ? [matchedPartner.address, matchedPartner.addressDetail].filter(Boolean).join(" ")
      : "";
    const proRatedNoteStr = proRatedNotes.join(", ");
    setEditCtTaxSpec({
      customerBizNo: c.customerBizNo || matchedPartner?.businessNo || "",
      customerCeoName: c.customerCeoName || matchedPartner?.ceoName || "",
      customerAddress: c.customerAddress || partnerAddr || "",
      customerBizType: c.customerBizType || matchedPartner?.bizType || "",
      customerBizClass: c.customerBizClass || matchedPartner?.bizItem || "",
      customerEmail: c.customerEmail || matchedPartner?.mainEmail || matchedPartner?.primaryContact?.email || "",
      customerEmail2: c.customerEmail2 || matchedPartner?.subEmail || "",
      taxPurpose: c.taxPurpose === "영수" ? "영수" : "청구",
      taxMemo: resolvedInitialMemo,
      taxItems:
        Array.isArray(c.taxItems) && c.taxItems.length > 0
          ? c.taxItems.map((it: any, idx: number) =>
              idx === 0
                ? {
                    ...it,
                    itemName: !it.itemName || it.itemName === baseProjectName ? resolvedInitialMemo : it.itemName,
                    ...(hasProRatedInCurMonth
                      ? {
                          unitCost: effectiveInitialSupply,
                          supplyAmount: effectiveInitialSupply,
                          vatAmount: effectiveInitialVat,
                          note: proRatedNoteStr || it.note,
                        }
                      : {}),
                  }
                : it
            )
          : [
              {
                ...defaultSpec.taxItems[0],
                itemName: resolvedInitialMemo,
                unitCost: effectiveInitialSupply,
                supplyAmount: effectiveInitialSupply,
                vatAmount: effectiveInitialVat,
                note: proRatedNoteStr || "",
              },
            ],
    });
    setShowEditContractModal(true);

    if (assignedList.length > 0) {
      const breakdown = await fetchAssignedOvertimeBreakdown(assignedList, curMonth);
      setEditCtOtBreakdown(breakdown);
    } else {
      setEditCtOtBreakdown(EMPTY_OT_BREAKDOWN);
    }
  };

  // Handle Update Contract
  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCtId) return;
    if (!editCtCustomer || !editCtProject || !editCtStart || !editCtEnd) {
      showToast("고객사, 프로젝트명, 계약 기간은 필수입니다.", "error");
      return;
    }

    try {
      await requestServiceJson(
        "/api/erp/services/contracts",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editCtId,
            serviceType: activeType,
            entityType: editCtEntityType,
            partnerId: editCtPartnerId,
            customerName: editCtCustomer,
            projectName: editCtProject,
            contractAmount: cleanErpNumber(editCtAmount),
            monthlyFee: cleanErpNumber(editCtMonthlyFee),
            vatAmount: cleanErpNumber(editCtVatAmount),
            startDate: editCtStart,
            endDate: editCtEnd,
            billingDay: editCtBillingDay,
            status: editCtStatus,
            memo: editCtMemo,
            contractFileUrl: editCtFileUrl || undefined,
            contractFileName: editCtFileName || undefined,
            ...toTaxSpecPayload(editCtTaxSpec),
            assignedEmployees: editCtAssignedEmployees,
            includeOtInBilling: editCtIncludeOtInBilling,
          }),
        },
        "계약 수정 실패"
      );

      showToast(`계약 [${editCtContractNo}] 수정 완료`);
      setShowEditContractModal(false);
      if (editCtId) delete contractFileCacheRef.current[editCtId];
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Contract
  const handleDeleteContract = async (c: any) => {
    if (
      !window.confirm(
        `[계약 삭제 확인]\n계약번호: ${c.contractNo}\n고객사: ${c.customerName}\n프로젝트: ${c.projectName}\n\n해당 계약과 연계된 미발행 청구 내역이 함께 삭제됩니다.\n정말 삭제하시겠습니까?`
      )
    ) {
      return;
    }

    try {
      const data = await requestServiceJson(`/api/erp/services/contracts?id=${c.id}`, { method: "DELETE" }, "계약 삭제 실패");

      showToast(data.message || `계약 [${c.contractNo}] 삭제 완료`);
      delete contractFileCacheRef.current[c.id];
      if (String(billingContractFilter) === String(c.id)) {
        setBillingContractFilter("ALL");
      }
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 선택된 용역계약의 치환식, 입사일 기준 일할계산 및 투입인원 초과근무수당을 기준일자(dateStr)로 평가하여 청구 폼 상태에 즉시 반영하는 헬퍼
  const applyServiceContractTemplateToBilling = async (
    ct: any,
    dateStr: string,
    overrideIncludeOt?: boolean,
    overrideApplyProRata?: boolean
  ) => {
    if (!ct) return;
    const includeOt =
      overrideIncludeOt !== undefined ? overrideIncludeOt : Boolean(ct.includeOtInBilling);
    setBlIncludeOtInBilling(includeOt);

    const applyProRata =
      overrideApplyProRata !== undefined ? overrideApplyProRata : blApplyProRata;
    setBlApplyProRata(applyProRata);

    const targetMonth = (dateStr || new Date().toISOString().slice(0, 10)).slice(0, 7);
    const assignedList: AssignedServiceEmployee[] = enrichAssignedEmployeeJoinDates(
      Array.isArray(ct.assignedEmployees) ? ct.assignedEmployees : []
    );

    const {
      totalBaseRate: empContractSum,
      totalEffectiveRate: empEffectiveSum,
      activeHeadcount,
      proRatedNotes,
    } = evaluateAssignedProRata(assignedList, targetMonth, applyProRata);

    // 기본 계약 월 용역료 (투입 인원이 등록된 운영용역은 해당 청구월의 직원별 단가/일할합계를 최우선 적용)
    const rawTaxItems = Array.isArray(ct.taxItems) ? ct.taxItems : [];
    const nonOtTemplateItems = rawTaxItems.filter(
      (it: any) => !String(it?.itemName || "").includes("초과근무수당")
    );
    const nonOtSupplySum = nonOtTemplateItems.reduce(
      (acc: number, it: any) => acc + (Number(it.supplyAmount) || 0),
      0
    );

    const contractBaseFee =
      activeType === "OPERATIONAL"
        ? Number(ct.monthlyFee || 0)
        : Number(ct.contractAmount || 0);

    const baseSupply =
      activeType === "OPERATIONAL" && assignedList.length > 0 && empContractSum > 0
        ? applyProRata
          ? empEffectiveSum
          : empContractSum
        : contractBaseFee > 0
        ? contractBaseFee
        : empContractSum > 0
        ? empContractSum
        : nonOtSupplySum > 0
        ? nonOtSupplySum
        : 0;
    const baseVat = Math.round(baseSupply * 0.1);
    const headcountSpec =
      assignedList.length > 0
        ? applyProRata && activeHeadcount !== assignedList.length
          ? `${activeHeadcount}인`
          : `${assignedList.length}인`
        : "";

    const rawTemplateName =
      ct.taxMemo || ct.projectName || (activeType === "OPERATIONAL" ? "정기 용역료" : "기성금");
    const rawItems =
      nonOtTemplateItems.length > 0
        ? nonOtTemplateItems.length === 1 && (contractBaseFee > 0 || empContractSum > 0)
          ? [
              {
                ...nonOtTemplateItems[0],
                spec: headcountSpec || nonOtTemplateItems[0].spec,
                qty: Number(nonOtTemplateItems[0].qty) || 1,
                unitCost: Math.round(baseSupply / (Number(nonOtTemplateItems[0].qty) || 1)),
                supplyAmount: baseSupply,
                vatAmount: baseVat,
                note:
                  proRatedNotes.length > 0
                    ? proRatedNotes.join(", ")
                    : String(nonOtTemplateItems[0].note || "").includes("일할(")
                    ? ""
                    : nonOtTemplateItems[0].note,
              },
            ]
          : nonOtTemplateItems
        : [
            {
              month: dateStr.slice(5, 7),
              day: dateStr.slice(8, 10),
              itemName: ct.projectName || rawTemplateName,
              spec: headcountSpec,
              qty: 1,
              unitCost: baseSupply,
              supplyAmount: baseSupply,
              vatAmount: baseVat,
              note: proRatedNotes.join(", "),
            },
          ];

    const resolvedItems: any[] = resolveContractTaxItemsTemplate(rawItems, {
      dateStr,
      fallbackFirstItem: ct.projectName,
    });

    let totalOtPay = 0;

    if (assignedList.length > 0) {
      setBlOtSummary((prev) => ({ ...prev, loading: true, month: targetMonth }));
      const otData = await fetchAssignedOvertimeBreakdown(assignedList, targetMonth);
      setBlOtSummary({
        loading: false,
        month: otData.month,
        totalHours: otData.totalHours,
        totalOtPay: otData.totalOtPay,
        items: otData.items,
      });

      if (includeOt) {
        totalOtPay = otData.totalOtPay;
        const otVat = Math.round(totalOtPay * 0.1);
        const noteStr = formatOtBreakdownNotes(otData.items);

        resolvedItems.push({
          month: dateStr.slice(5, 7),
          day: dateStr.slice(8, 10),
          itemName: `초과근무수당 (${targetMonth})`,
          spec: `투입인원 ${activeHeadcount > 0 ? activeHeadcount : assignedList.length}인 (${otData.totalHours}h)`,
          qty: 1,
          unitCost: totalOtPay,
          supplyAmount: totalOtPay,
          vatAmount: otVat,
          note: noteStr || `${targetMonth} 투입인원 초과근무수당 합산`,
        });
      }
    } else {
      setBlOtSummary({ loading: false, month: targetMonth, totalHours: 0, totalOtPay: 0, items: [] });
    }

    const finalSupply = baseSupply + totalOtPay;
    const finalVat = Math.round(finalSupply * 0.1);

    const resolvedMilestone = resolveContractItemTemplate(rawTemplateName, {
      dateStr,
      items: resolvedItems,
      fallbackFirstItem: resolvedItems[0]?.itemName || ct.projectName,
    });
    const resolvedMemo = resolveContractItemTemplate(ct.taxMemo || rawTemplateName, {
      dateStr,
      items: resolvedItems,
      fallbackFirstItem: resolvedItems[0]?.itemName || ct.projectName,
    });

    setBlSupplyAmount(toErpInputString(finalSupply));
    setBlVatAmount(toErpInputString(finalVat));
    setBlMilestoneName(resolvedMilestone);
    const defSpec = createDefaultTaxSpec(resolvedMilestone, finalSupply);
    setBlTaxSpec({
      ...defSpec,
      taxPurpose: ct.taxPurpose === "영수" ? "영수" : "청구",
      taxMemo: resolvedMemo,
      taxItems: resolvedItems as any,
    });
  };

  // Handle Add Billing
  const handleAddBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blContractId || !blSupplyAmount) {
      showToast("계약과 공급가액은 필수입니다.", "error");
      return;
    }
    try {
      await requestServiceJson(
        "/api/erp/services/billings",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contractId: blContractId,
            billingType: activeType === "OPERATIONAL" ? "MONTHLY_RETAINER" : "MILESTONE",
            milestoneName: blMilestoneName || (activeType === "OPERATIONAL" ? "정기 용역료" : "중도금"),
            billingDate: blDate,
            supplyAmount: cleanErpNumber(blSupplyAmount),
            vatAmount: cleanErpNumber(blVatAmount),
            taxPurpose: blTaxSpec.taxPurpose,
            taxMemo: blTaxSpec.taxMemo,
            taxItems: blTaxSpec.taxItems,
          }),
        },
        "청구 등록 실패"
      );

      showToast(`용역 청구 등록 완료`);
      setShowAddBillingModal(false);
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Billing
  const handleDeleteBilling = async (b: any) => {
    if (
      !window.confirm(
        `청구번호 [${b.billingNo}] (${b.customerName} ₩${formatErpCurrency(b.totalAmount)})\n해당 청구 내역을 삭제하시겠습니까?`
      )
    ) {
      return;
    }

    try {
      const data = await requestServiceJson(`/api/erp/services/billings?id=${b.id}`, { method: "DELETE" }, "청구 삭제 실패");

      showToast(data.message || "청구 내역이 삭제되었습니다.");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return {
    canBill, activeType, setActiveType, loading, toast, showToast,
    contracts, billings, partners, employees,
    showAddContractModal, setShowAddContractModal, showEditContractModal, setShowEditContractModal,
    showAddBillingModal, setShowAddBillingModal, activeDocViewer, setActiveDocViewer,
    billingContractFilter, setBillingContractFilter,
    // Add Contract States
    ctEntityType, setCtEntityType, ctPartnerId, setCtPartnerId, ctCustomer, setCtCustomer,
    ctProject, setCtProject, ctAmount, setCtAmount, ctMonthlyFee, setCtMonthlyFee,
    ctStart, setCtStart, ctEnd, setCtEnd, ctBillingDay, setCtBillingDay, ctMemo, setCtMemo,
    ctVatAmount, setCtVatAmount, ctTaxSpec, setCtTaxSpec, setCtFileUrl, ctFileName, setCtFileName,
    isCtFileDragging, setIsCtFileDragging, ctFileInputRef,
    ctAssignedEmployees, setCtAssignedEmployees, ctSelectedEmpId, setCtSelectedEmpId,
    ctIncludeOtInBilling, setCtIncludeOtInBilling, ctApplyProRata, setCtApplyProRata,
    ctProRataMonth, setCtProRataMonth, ctOtBreakdown,
    // Edit Contract States
    editCtContractNo, editCtEntityType, setEditCtEntityType, editCtPartnerId, setEditCtPartnerId,
    editCtCustomer, setEditCtCustomer, editCtProject, setEditCtProject,
    editCtAmount, setEditCtAmount, editCtMonthlyFee, setEditCtMonthlyFee,
    editCtVatAmount, setEditCtVatAmount, editCtStart, setEditCtStart, editCtEnd, setEditCtEnd,
    editCtBillingDay, setEditCtBillingDay, editCtStatus, setEditCtStatus, editCtMemo, setEditCtMemo,
    editCtTaxSpec, setEditCtTaxSpec, editCtFileName, editFileInputRef,
    editCtAssignedEmployees, setEditCtAssignedEmployees, editCtSelectedEmpId, setEditCtSelectedEmpId,
    editCtIncludeOtInBilling, setEditCtIncludeOtInBilling, editCtApplyProRata, setEditCtApplyProRata,
    editCtProRataMonth, setEditCtProRataMonth, editCtOtBreakdown,
    // Billing States
    blContractId, setBlContractId, blMilestoneName, setBlMilestoneName,
    blSupplyAmount, setBlSupplyAmount, blVatAmount, setBlVatAmount, blDate, setBlDate,
    blTaxSpec, setBlTaxSpec, blIncludeOtInBilling, setBlIncludeOtInBilling,
    blApplyProRata, setBlApplyProRata, blOtSummary,
    // Options
    servicePartnerOptions, serviceContractOptions,
    // Handlers
    fetchData, enrichAssignedEmployeeJoinDates, syncAssignedEmployeesToContract,
    handleSelectPartner, handleContractFileUpload, handleEditFileUpload, handleOpenContractFile,
    handleAddContract, handleOpenEditContract, handleUpdateContract, handleDeleteContract,
    applyServiceContractTemplateToBilling, handleAddBilling, handleDeleteBilling,
  };
}
