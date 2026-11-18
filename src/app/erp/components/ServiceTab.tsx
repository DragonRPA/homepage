"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Briefcase, Plus, RefreshCw, FileText, CheckCircle2, 
  Layers, Search, DollarSign, Calendar, X,
  Building2, FileUp, Eye, Download,
  Edit, Trash2, AlertCircle, Users, UserPlus
} from "lucide-react";
import {
  formatErpNumber,
  formatErpCurrency,
  formatErpQty,
  formatErpInputNumber,
  toErpInputString,
  cleanErpNumber,
  matchHangulAny,
  sortCustomersByName,
  sortErpItems,
  resolveContractItemTemplate,
  resolveContractTaxItemsTemplate,
  calculateServiceEmployeeMonthlyProRata,
} from "@/lib/erpFormat";
import { SortableTh, useErpTableSort } from "./SortableTh";
import { SearchSelectCombobox, SearchSelectOption } from "./SearchSelectCombobox";
import { ContractTaxInvoiceSection, BuyerTaxSpec, createDefaultTaxSpec, extractPartnerTaxSpec } from "./ContractTaxInvoiceSection";
import { findBlockedPartnerMatch, getPartnerTradeBlockInfo } from "@/lib/partnerStatusClient";
import { AddContractModal, EditContractModal } from "./service/ServiceContractModals";
import { AddBillingModal } from "./service/ServiceBillingModal";

import type { AssignedServiceEmployee } from "./service/serviceTypes";

interface ServiceTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onNavigateToTax?: () => void;
}

export const ServiceTab: React.FC<ServiceTabProps> = ({ currentUser, selectedEntity = "ALL", onNavigateToTax }) => {
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
  const [activeDocViewer, setActiveDocViewer] = useState<{ title: string; customerName: string; url: string; fileName: string } | null>(null);
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
  const [ctOtBreakdown, setCtOtBreakdown] = useState<{
    month: string;
    totalHours: number;
    totalOtPay: number;
    byEmp: Record<number, { hours: number; otPay: number; count: number }>;
  }>({ month: "", totalHours: 0, totalOtPay: 0, byEmp: {} });

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
  const [isEditFileDragging, setIsEditFileDragging] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editCtAssignedEmployees, setEditCtAssignedEmployees] = useState<AssignedServiceEmployee[]>([]);
  const [editCtSelectedEmpId, setEditCtSelectedEmpId] = useState<string>("");
  const [editCtIncludeOtInBilling, setEditCtIncludeOtInBilling] = useState<boolean>(false);
  const [editCtApplyProRata, setEditCtApplyProRata] = useState<boolean>(true);
  const [editCtProRataMonth, setEditCtProRataMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [editCtOtBreakdown, setEditCtOtBreakdown] = useState<{
    month: string;
    totalHours: number;
    totalOtPay: number;
    byEmp: Record<number, { hours: number; otPay: number; count: number }>;
  }>({ month: "", totalHours: 0, totalOtPay: 0, byEmp: {} });

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

  // 하단 청구 및 수납 내역 기간/계약/검색 필터 상태
  const [billingStartDate, setBillingStartDate] = useState<string>("");
  const [billingEndDate, setBillingEndDate] = useState<string>("");
  const [billingPeriodPreset, setBillingPeriodPreset] = useState<"ALL" | "THIS_MONTH" | "LAST_MONTH" | "3M" | "THIS_YEAR" | "CUSTOM">("ALL");
  const [billingContractFilter, setBillingContractFilter] = useState<string>("ALL");
  const [billingSearchQuery, setBillingSearchQuery] = useState<string>("");

  const applyBillingPeriodPreset = (preset: "ALL" | "THIS_MONTH" | "LAST_MONTH" | "3M" | "THIS_YEAR") => {
    setBillingPeriodPreset(preset);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed
    const pad2 = (n: number) => String(n).padStart(2, "0");

    if (preset === "ALL") {
      setBillingStartDate("");
      setBillingEndDate("");
      return;
    }
    if (preset === "THIS_MONTH") {
      const lastDay = new Date(y, m + 1, 0).getDate();
      setBillingStartDate(`${y}-${pad2(m + 1)}-01`);
      setBillingEndDate(`${y}-${pad2(m + 1)}-${pad2(lastDay)}`);
      return;
    }
    if (preset === "LAST_MONTH") {
      const prev = new Date(y, m - 1, 1);
      const py = prev.getFullYear();
      const pm = prev.getMonth();
      const lastDay = new Date(py, pm + 1, 0).getDate();
      setBillingStartDate(`${py}-${pad2(pm + 1)}-01`);
      setBillingEndDate(`${py}-${pad2(pm + 1)}-${pad2(lastDay)}`);
      return;
    }
    if (preset === "3M") {
      const startObj = new Date(y, m - 2, 1);
      const sy = startObj.getFullYear();
      const sm = startObj.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      setBillingStartDate(`${sy}-${pad2(sm + 1)}-01`);
      setBillingEndDate(`${y}-${pad2(m + 1)}-${pad2(lastDay)}`);
      return;
    }
    if (preset === "THIS_YEAR") {
      setBillingStartDate(`${y}-01-01`);
      setBillingEndDate(`${y}-12-31`);
      return;
    }
  };

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sorting State (3단계: asc ➔ desc ➔ null 정렬안함)
  const { sortKey, sortDir, handleSort } = useErpTableSort("id", "desc");
  const billingSort = useErpTableSort("id", "desc");

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => {
    const isActive = sortKey === key && sortDir !== null;
    return (
      <SortableTh
        label={label}
        colKey={key}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        align={align}
        className={`py-2 px-2.5 hover:bg-[#d0c6b4] ${isActive ? "text-blue-800 font-bold" : "text-[#44403c]"}`}
        iconClassName="w-3.5 h-3.5 text-blue-800"
      />
    );
  };

  const renderBillingSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => {
    const isActive = billingSort.sortKey === key && billingSort.sortDir !== null;
    return (
      <SortableTh
        label={label}
        colKey={key}
        sortKey={billingSort.sortKey}
        sortDir={billingSort.sortDir}
        onSort={billingSort.handleSort}
        align={align}
        className={`py-2 px-2.5 hover:bg-[#d0c6b4] ${isActive ? "text-blue-800 font-bold" : "text-[#44403c]"}`}
        iconClassName="w-3.5 h-3.5 text-blue-800"
      />
    );
  };

  const sortedContracts = useMemo(() => sortErpItems(contracts, sortKey, sortDir), [contracts, sortKey, sortDir]);

  const filteredBillings = useMemo(() => {
    return billings.filter((b) => {
      const bDate = b.billingDate ? String(b.billingDate).slice(0, 10) : "";
      if (billingStartDate && (!bDate || bDate < billingStartDate)) return false;
      if (billingEndDate && (!bDate || bDate > billingEndDate)) return false;
      if (billingContractFilter !== "ALL" && String(b.contractId) !== String(billingContractFilter)) {
        return false;
      }
      if (billingSearchQuery.trim()) {
        if (
          !matchHangulAny(
            [
              b.billingNo,
              b.customerName,
              b.projectName,
              b.milestoneName,
              b.taxInvoiceNo,
            ],
            billingSearchQuery
          )
        ) {
          return false;
        }
      }
      return true;
    });
  }, [billings, billingStartDate, billingEndDate, billingContractFilter, billingSearchQuery]);

  const sortedBillings = useMemo(
    () => sortErpItems(filteredBillings, billingSort.sortKey, billingSort.sortDir),
    [filteredBillings, billingSort.sortKey, billingSort.sortDir]
  );

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
      const pData = await pRes.json();
      const eData = await eRes.json();
      if (pData.success) {
        setPartners(pData.partners || []);
      }
      if (eData.success) {
        const rawEmployees = Array.isArray(eData.employees) ? eData.employees : [];
        const isRetiredEmp = (emp: any) => {
          const st = String(emp.status || "").toUpperCase();
          const empSt = String(emp.employmentStatus || "").toUpperCase();
          const hasLeaveDate = Boolean(emp.leaveDate && String(emp.leaveDate).trim() !== "");
          return (
            hasLeaveDate ||
            st === "RETIRED" ||
            st === "RESIGNED" ||
            st === "퇴사" ||
            st === "퇴직" ||
            empSt === "RETIRED" ||
            empSt === "RESIGNED" ||
            empSt === "퇴사" ||
            empSt === "퇴직"
          );
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
    if (!Array.isArray(list) || list.length === 0) {
      return {
        month: targetMonth,
        totalHours: 0,
        totalOtPay: 0,
        byEmp: {} as Record<number, { hours: number; otPay: number; count: number }>,
        items: [] as Array<{ employeeId: number; employeeName: string; hours: number; otPay: number; count: number }>,
      };
    }

    const empIds = list.map((e) => Number(e.employeeId)).filter((id) => !isNaN(id) && id > 0);
    if (empIds.length === 0) {
      return {
        month: targetMonth,
        totalHours: 0,
        totalOtPay: 0,
        byEmp: {} as Record<number, { hours: number; otPay: number; count: number }>,
        items: [] as Array<{ employeeId: number; employeeName: string; hours: number; otPay: number; count: number }>,
      };
    }

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
      return {
        month: targetMonth,
        totalHours: 0,
        totalOtPay: 0,
        byEmp: {} as Record<number, { hours: number; otPay: number; count: number }>,
        items: [] as Array<{ employeeId: number; employeeName: string; hours: number; otPay: number; count: number }>,
      };
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

    const proRataDetails = list.map((item) => {
      const enabled = applyProRata && item.proRataEnabled !== false;
      const calc = calculateServiceEmployeeMonthlyProRata(
        item.contractRate,
        curMonth,
        item.joinDate,
        item.leaveDate,
        enabled,
        true
      );
      return { item, calc };
    });

    const totalBaseRate = list.reduce((acc, item) => acc + (Number(item.contractRate) || 0), 0);
    const totalEffectiveRate = proRataDetails.reduce((acc, x) => acc + x.calc.effectiveAmount, 0);
    const totalRate = applyProRata ? totalEffectiveRate : totalBaseRate;
    const baseVat = Math.round(totalRate * 0.1);
    const activeHeadcount = proRataDetails.filter(
      (x) => !x.calc.isAfterLeft && !x.calc.isNotYetJoined
    ).length;
    const countSpec =
      list.length > 0 ? `${applyProRata ? activeHeadcount : list.length}인` : "";

    const proRatedNotes = proRataDetails
      .filter((x) => x.calc.isProRated && !x.calc.isAfterLeft)
      .map((x) =>
        x.calc.isNotYetJoined
          ? `${x.item.name} 미투입(${x.item.joinDate?.slice(5).replace("-", "/")} 입사전 0원)`
          : `${x.item.name} 일할(${x.calc.shortBadge}: ${x.calc.effectiveAmount.toLocaleString()}원)`
      );

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
        const noteStr = otBreakdown.items
          .filter((x) => x.otPay > 0 || x.hours > 0)
          .map((x) => `${x.employeeName} ${x.hours}h(${x.otPay.toLocaleString()}원)`)
          .join(", ");
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

    if (isEdit) {
      if (activeType === "OPERATIONAL" && list.length > 0) {
        setEditCtMonthlyFee(toErpInputString(combinedSupply));
        setEditCtVatAmount(toErpInputString(combinedVat));
        setEditCtTaxSpec((prev) => ({
          ...prev,
          taxItems: buildUpdatedTaxItems(prev.taxItems),
        }));
      }
    } else {
      if (activeType === "OPERATIONAL" && list.length > 0) {
        setCtMonthlyFee(toErpInputString(combinedSupply));
        setCtVatAmount(toErpInputString(combinedVat));
        setCtTaxSpec((prev) => ({
          ...prev,
          taxItems: buildUpdatedTaxItems(prev.taxItems),
        }));
      }
    }
  };

  const handleSelectPartner = (p: any) => {
    setCtPartnerId(p.id);
    setCtCustomer(p.name);
    setCtTaxSpec((prev) => extractPartnerTaxSpec(p, prev));
  };

  const handleContractFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || "";
      setCtFileUrl(dataUrl);
      setCtFileName(file.name);
      showToast(`계약서 파일(${file.name})이 첨부되었습니다.`);
    };
    reader.onerror = () => showToast("계약서 파일 읽기 실패", "error");
    reader.readAsDataURL(file);
  };

  const handleEditFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || "";
      setEditCtFileUrl(dataUrl);
      setEditCtFileName(file.name);
      showToast(`새 계약서 파일(${file.name})이 첨부되었습니다.`);
    };
    reader.onerror = () => showToast("계약서 파일 읽기 실패", "error");
    reader.readAsDataURL(file);
  };

  const handleOpenContractFile = async (c: any) => {
    const cached = contractFileCacheRef.current[c.id];
    if (cached) {
      setActiveDocViewer({
        title: `${c.contractNo} 계약서 원본`,
        customerName: c.customerName,
        url: cached.url,
        fileName: cached.fileName,
      });
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
        setActiveDocViewer({
          title: `${c.contractNo} 계약서 원본`,
          customerName: c.customerName,
          url: entry.url,
          fileName: entry.fileName,
        });
      } else {
        showToast("등록된 계약서 파일을 찾을 수 없습니다.", "error");
      }
    } catch (e) {
      showToast("계약서 파일 조회 실패", "error");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const contractsUrl = selectedEntity && selectedEntity !== "ALL"
        ? `/api/erp/services/contracts?serviceType=${activeType}&entityType=${selectedEntity}`
        : `/api/erp/services/contracts?serviceType=${activeType}`;

      const billingsUrl = selectedEntity && selectedEntity !== "ALL"
        ? `/api/erp/services/billings?serviceType=${activeType}&entityType=${selectedEntity}`
        : `/api/erp/services/billings?serviceType=${activeType}`;

      const [cRes, bRes] = await Promise.all([
        fetch(contractsUrl, { cache: "no-store" }),
        fetch(billingsUrl, { cache: "no-store" })
      ]);
      const cData = await cRes.json();
      const bData = await bRes.json();

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
      const res = await fetch("/api/erp/services/contracts", {
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
          customerBizNo: ctTaxSpec.customerBizNo,
          customerCeoName: ctTaxSpec.customerCeoName,
          customerAddress: ctTaxSpec.customerAddress,
          customerBizType: ctTaxSpec.customerBizType,
          customerBizClass: ctTaxSpec.customerBizClass,
          customerEmail: ctTaxSpec.customerEmail,
          customerEmail2: ctTaxSpec.customerEmail2,
          taxPurpose: ctTaxSpec.taxPurpose,
          taxMemo: ctTaxSpec.taxMemo,
          taxItems: ctTaxSpec.taxItems,
          assignedEmployees: ctAssignedEmployees,
          includeOtInBilling: ctIncludeOtInBilling,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "계약 등록 실패");

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
      setCtOtBreakdown({ month: "", totalHours: 0, totalOtPay: 0, byEmp: {} });
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
    const proRataDetails = assignedList.map((item) =>
      calculateServiceEmployeeMonthlyProRata(
        item.contractRate,
        curMonth,
        item.joinDate,
        item.leaveDate,
        item.proRataEnabled !== false,
        true
      )
    );
    const hasProRatedInCurMonth = proRataDetails.some((d) => d.isProRated);
    const proRatedSum = proRataDetails.reduce((s, d) => s + d.effectiveAmount, 0);
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
    const proRatedNoteStr = assignedList
      .map((item, idx) => ({ item, calc: proRataDetails[idx] }))
      .filter((x) => x.calc.isProRated && !x.calc.isAfterLeft)
      .map((x) =>
        x.calc.isNotYetJoined
          ? `${x.item.name} 미투입(${x.item.joinDate?.slice(5).replace("-", "/")} 입사전 0원)`
          : `${x.item.name} 일할(${x.calc.shortBadge}: ${x.calc.effectiveAmount.toLocaleString()}원)`
      )
      .join(", ");
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
      setEditCtOtBreakdown({ month: "", totalHours: 0, totalOtPay: 0, byEmp: {} });
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
      const res = await fetch("/api/erp/services/contracts", {
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
          customerBizNo: editCtTaxSpec.customerBizNo,
          customerCeoName: editCtTaxSpec.customerCeoName,
          customerAddress: editCtTaxSpec.customerAddress,
          customerBizType: editCtTaxSpec.customerBizType,
          customerBizClass: editCtTaxSpec.customerBizClass,
          customerEmail: editCtTaxSpec.customerEmail,
          customerEmail2: editCtTaxSpec.customerEmail2,
          taxPurpose: editCtTaxSpec.taxPurpose,
          taxMemo: editCtTaxSpec.taxMemo,
          taxItems: editCtTaxSpec.taxItems,
          assignedEmployees: editCtAssignedEmployees,
          includeOtInBilling: editCtIncludeOtInBilling,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "계약 수정 실패");

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
    if (!window.confirm(
      `[계약 삭제 확인]\n계약번호: ${c.contractNo}\n고객사: ${c.customerName}\n프로젝트: ${c.projectName}\n\n해당 계약과 연계된 미발행 청구 내역이 함께 삭제됩니다.\n정말 삭제하시겠습니까?`
    )) {
      return;
    }

    try {
      const res = await fetch(`/api/erp/services/contracts?id=${c.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "계약 삭제 실패");

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

    const proRataDetails = assignedList.map((item) => {
      const enabled = applyProRata && item.proRataEnabled !== false;
      const calc = calculateServiceEmployeeMonthlyProRata(
        item.contractRate,
        targetMonth,
        item.joinDate,
        item.leaveDate,
        enabled,
        true
      );
      return { item, calc };
    });

    const empContractSum = assignedList.reduce((acc, e) => acc + (Number(e.contractRate) || 0), 0);
    const empEffectiveSum = proRataDetails.reduce((acc, x) => acc + x.calc.effectiveAmount, 0);
    const activeHeadcount = proRataDetails.filter(
      (x) => !x.calc.isAfterLeft && !x.calc.isNotYetJoined
    ).length;
    const proRatedNotes = proRataDetails
      .filter((x) => x.calc.isProRated && !x.calc.isAfterLeft)
      .map((x) =>
        x.calc.isNotYetJoined
          ? `${x.item.name} 미투입(${x.item.joinDate?.slice(5).replace("-", "/")} 입사전 0원)`
          : `${x.item.name} 일할(${x.calc.shortBadge}: ${x.calc.effectiveAmount.toLocaleString()}원)`
      );

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
        const noteStr = otData.items
          .filter((x) => x.otPay > 0 || x.hours > 0)
          .map((x) => `${x.employeeName} ${x.hours}h(${x.otPay.toLocaleString()}원)`)
          .join(", ");

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
      const res = await fetch("/api/erp/services/billings", {
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
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "청구 등록 실패");

      showToast(`용역 청구 등록 완료`);
      setShowAddBillingModal(false);
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Billing
  const handleDeleteBilling = async (b: any) => {
    if (!window.confirm(`청구번호 [${b.billingNo}] (${b.customerName} ₩${formatErpCurrency(b.totalAmount)})\n해당 청구 내역을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/erp/services/billings?id=${b.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "청구 삭제 실패");

      showToast(data.message || "청구 내역이 삭제되었습니다.");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-[#f4efe4] text-[#1c1917] overflow-hidden select-none">
      {toast && (
        <div className={`fixed top-16 right-5 z-50 px-4 py-2 rounded text-xs font-bold text-white shadow-xl ${
          toast.type === "error" ? "bg-rose-700" : "bg-emerald-700"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-[#b5a894] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveType("OPERATIONAL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition border ${
              activeType === "OPERATIONAL"
                ? "bg-blue-700 text-white border-blue-900 shadow-sm"
                : "bg-[#ebe5d8] border-[#b5a894] text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>운영용역 (월 정기 유지보수)</span>
          </button>
          <button
            onClick={() => setActiveType("DEVELOPMENT")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition border ${
              activeType === "DEVELOPMENT"
                ? "bg-purple-700 text-white border-purple-900 shadow-sm"
                : "bg-[#ebe5d8] border-[#b5a894] text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>개발용역 (SI 프로젝트 / 마일스톤)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canBill && (
            <button
              onClick={() => setShowAddBillingModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-900 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{activeType === "OPERATIONAL" ? "정기 청구 생성" : "기성금 청구 생성"}</span>
            </button>
          )}
          <button
            onClick={() => setShowAddContractModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white border border-blue-900 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>신규 계약 체결</span>
          </button>
          <button
            onClick={fetchData}
            className="p-1.5 rounded border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Vertical Split Layout: Top Contracts | Bottom Billings with Period Filter */}
      <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
        {/* Top: Contracts Ledger */}
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col basis-[45%] min-h-[190px] overflow-hidden shadow-sm">
          <div className="px-3 py-2 border-b border-[#b5a894] bg-[#dfd7c7] text-xs font-bold text-[#57534e] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span>체결 계약 대장 ({contracts.length}건)</span>
              {billingContractFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setBillingContractFilter("ALL")}
                  className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-bold hover:bg-blue-200 transition"
                >
                  선택계약 필터 해제
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#78716c]">
              {activeType === "OPERATIONAL" && (
                <span>
                  월 용역료 합계:{" "}
                  <strong className="text-[#1c1917] font-mono">
                    {formatErpCurrency(contracts.reduce((s, c) => s + Number(c.monthlyFee || 0), 0))}
                  </strong>
                </span>
              )}
              <span>
                총 계약고:{" "}
                <strong className="text-[#1c1917] font-mono">
                  {formatErpCurrency(contracts.reduce((s, c) => s + Number(c.contractAmount || 0), 0))}
                </strong>
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead className="bg-[#ded6c5] text-[#44403c] sticky top-0 border-b border-[#b5a894] font-bold select-none z-10">
                <tr>
                  <th className="py-2 px-2.5 text-center sticky left-0 bg-[#ded6c5] z-20 border-r border-[#b5a894]">관리</th>
                  {renderSortTh("귀속", "entityType")}
                  {renderSortTh("계약번호", "contractNo")}
                  {renderSortTh("고객사", "customerName")}
                  {renderSortTh("용역/프로젝트명", "projectName")}
                  {renderSortTh(activeType === "OPERATIONAL" ? "월 용역료" : "총 계약금", activeType === "OPERATIONAL" ? "monthlyFee" : "contractAmount", "right")}
                  {renderSortTh("청구일", "billingDay", "center")}
                  {renderSortTh("계약기간", "startDate")}
                  <th className="py-2 px-2.5 text-center">계약서</th>
                  {renderSortTh("상태", "status", "center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b5a894]">
                {sortedContracts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-[#78716c]">
                      등록된 용역 계약이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedContracts.map((c) => {
                    const isContractSelected = String(billingContractFilter) === String(c.id);
                    return (
                      <tr
                        key={c.id}
                        onClick={() =>
                          setBillingContractFilter((prev) =>
                            String(prev) === String(c.id) ? "ALL" : String(c.id)
                          )
                        }
                        className={`cursor-pointer transition ${
                          isContractSelected ? "bg-blue-50/80 ring-1 ring-inset ring-blue-400" : "hover:bg-[#dfd7c7]"
                        }`}
                        title="클릭하면 하단 청구 내역에서 해당 계약 건만 필터링합니다"
                      >
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="py-2 px-2.5 text-center border-r border-[#b5a894] sticky left-0 bg-[#ebe5d8] z-10 shadow-sm"
                        >
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditContract(c)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-400 inline-flex items-center gap-1 transition"
                              title="계약 정보 수정"
                            >
                              <Edit className="w-3 h-3" />
                              <span>수정</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteContract(c)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-400 inline-flex items-center gap-1 transition"
                              title="계약 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>삭제</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894]">
                          {c.entityType === "INDIVIDUAL" ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              개인
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              법인
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894] font-mono text-blue-800 font-bold">{c.contractNo}</td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894] font-bold text-[#1c1917]">{c.customerName}</td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894] text-[#1c1917]">
                          <div className="flex items-center gap-1.5">
                            <span>{c.projectName}</span>
                            {c.includeOtInBilling && (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                초과근무수당 반영
                              </span>
                            )}
                          </div>
                          {Array.isArray(c.assignedEmployees) && c.assignedEmployees.length > 0 && (
                            <div className="text-[10px] font-semibold text-blue-800 mt-0.5">
                              투입 {c.assignedEmployees.length}명:{" "}
                              {c.assignedEmployees.map((emp: any) => emp.name).join(", ")}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894] text-right font-mono font-bold text-[#1c1917]">
                          {formatErpCurrency(activeType === "OPERATIONAL" ? c.monthlyFee : c.contractAmount)}
                        </td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894] text-center font-mono text-[11px] text-[#57534e]">
                          매월 {c.billingDay || 25}일
                        </td>
                        <td className="py-2 px-2.5 border-r border-[#b5a894] font-mono text-[#78716c] text-[11px]">
                          {c.startDate ? String(c.startDate).slice(0, 10) : "-"} ~ {c.endDate ? String(c.endDate).slice(0, 10) : "-"}
                        </td>
                        <td onClick={(e) => e.stopPropagation()} className="py-2 px-2.5 border-r border-[#b5a894] text-center">
                          {c.hasContractFile ? (
                            <button
                              type="button"
                              onClick={() => handleOpenContractFile(c)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f5f3ff] hover:bg-[#ede9fe] text-[#6d28d9] border border-[#ddd6fe] inline-flex items-center gap-1 transition"
                              title={c.contractFileName || "계약서 열람"}
                            >
                              <FileText className="w-3 h-3" />
                              <span>열람</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#78716c]">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-[#ded6c5] text-[#78716c]"
                          }`}>
                            {c.status === "ACTIVE" ? "진행중" : "종결"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom: Billings Ledger with Date Range & Search Filter */}
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col basis-[55%] min-h-[220px] flex-1 overflow-hidden shadow-sm">
          {/* Header & Period Filter Bar */}
          <div className="px-3 py-2 border-b border-[#b5a894] bg-[#dfd7c7] text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[#57534e]">
                청구 및 수납 내역 ({sortedBillings.length}건
                {sortedBillings.length !== billings.length ? ` / 전체 ${billings.length}건` : ""})
              </span>

              {/* 조회 기간 설정 */}
              <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-[#b5a894]">
                <Calendar className="w-3.5 h-3.5 text-[#57534e]" />
                <span className="text-[11px] font-bold text-[#57534e]">청구기간</span>
                <input
                  type="date"
                  value={billingStartDate}
                  onChange={(e) => {
                    setBillingStartDate(e.target.value);
                    setBillingPeriodPreset("CUSTOM");
                  }}
                  className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[11px] font-mono text-[#1c1917]"
                />
                <span className="text-[#78716c] font-bold">~</span>
                <input
                  type="date"
                  value={billingEndDate}
                  onChange={(e) => {
                    setBillingEndDate(e.target.value);
                    setBillingPeriodPreset("CUSTOM");
                  }}
                  className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[11px] font-mono text-[#1c1917]"
                />
                <div className="inline-flex items-center gap-1 ml-1">
                  {(
                    [
                      { key: "ALL", label: "전체기간" },
                      { key: "THIS_MONTH", label: "당월" },
                      { key: "LAST_MONTH", label: "전월" },
                      { key: "3M", label: "최근3개월" },
                      { key: "THIS_YEAR", label: "올해" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyBillingPeriodPreset(p.key)}
                      className={`h-7 px-2 rounded text-[11px] font-bold border transition ${
                        billingPeriodPreset === p.key
                          ? "bg-blue-700 text-white border-blue-900"
                          : "bg-[#f4efe4] text-[#57534e] border-[#b5a894] hover:bg-[#e2dbcd]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 계약별 필터 및 검색어 */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-[#b5a894]">
                <select
                  value={billingContractFilter}
                  onChange={(e) => setBillingContractFilter(e.target.value)}
                  className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[11px] font-semibold text-[#1c1917]"
                >
                  <option value="ALL">전체 계약</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      [{c.contractNo}] {c.customerName}
                    </option>
                  ))}
                </select>
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-[#78716c] absolute left-2 pointer-events-none" />
                  <input
                    type="text"
                    value={billingSearchQuery}
                    onChange={(e) => setBillingSearchQuery(e.target.value)}
                    placeholder="고객사, 용역명, 청구번호 검색"
                    className="h-7 pl-7 pr-6 rounded border border-[#b5a894] bg-[#f4efe4] text-[11px] text-[#1c1917] w-44"
                  />
                  {billingSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBillingSearchQuery("")}
                      className="absolute right-1.5 text-[#78716c] hover:text-[#1c1917]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#78716c]">
              <span>
                공급가액 합계:{" "}
                <strong className="text-[#1c1917] font-mono">
                  {formatErpCurrency(sortedBillings.reduce((s, b) => s + Number(b.supplyAmount || 0), 0))}
                </strong>
              </span>
              <span>
                총 청구액(VAT포함):{" "}
                <strong className="text-blue-900 font-mono">
                  {formatErpCurrency(sortedBillings.reduce((s, b) => s + Number(b.totalAmount || 0), 0))}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead className="bg-[#ded6c5] text-[#44403c] sticky top-0 border-b border-[#b5a894] font-bold select-none z-10">
                <tr>
                  <th className="py-2 px-2.5 text-center sticky left-0 bg-[#ded6c5] z-20 border-r border-[#b5a894]">관리</th>
                  {renderBillingSortTh("청구일자", "billingDate", "center")}
                  {renderBillingSortTh("청구번호", "billingNo")}
                  {renderBillingSortTh("고객사 / 용역명", "customerName")}
                  {renderBillingSortTh("구분 / 마일스톤", "milestoneName")}
                  {renderBillingSortTh("공급가액", "supplyAmount", "right")}
                  {renderBillingSortTh("세액(VAT)", "vatAmount", "right")}
                  {renderBillingSortTh("총 청구액", "totalAmount", "right")}
                  <th className="py-2 px-2.5 text-center">세금계산서</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b5a894]">
                {sortedBillings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#78716c]">
                      조회 조건에 해당하는 청구 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedBillings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#dfd7c7] transition">
                      <td className="py-2 px-2.5 text-center border-r border-[#b5a894] sticky left-0 bg-[#ebe5d8] z-10 shadow-sm">
                        {!b.taxInvoiceId ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteBilling(b)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-400 inline-flex items-center gap-1 transition"
                            title="청구 내역 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>삭제</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#78716c] font-mono">발행확정</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-center font-mono font-bold text-[#1c1917]">
                        {b.billingDate ? String(b.billingDate).slice(0, 10) : "-"}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] font-mono text-[#78716c]">{b.billingNo}</td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] font-bold text-[#1c1917]">
                        <div>{b.customerName}</div>
                        <div className="text-[10px] text-[#78716c] font-normal">{b.projectName}</div>
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-[#1c1917]">{b.milestoneName}</td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-right font-mono font-bold text-[#1c1917]">
                        {formatErpCurrency(b.supplyAmount)}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-right font-mono text-[#57534e]">
                        {formatErpCurrency(b.vatAmount ?? Math.round(Number(b.supplyAmount || 0) * 0.1))}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-right font-mono font-bold text-blue-900">
                        {formatErpCurrency(b.totalAmount)}
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        {b.taxInvoiceId ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            발행완료 ({b.taxInvoiceNo})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            미발행 (세금계산서 탭에서 일괄발행)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer Summary Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#dfd7c7] border border-[#b5a894] rounded text-xs text-[#57534e]">
        <div className="flex items-center gap-4">
          <span>{activeType === "OPERATIONAL" ? "운영용역" : "개발용역"} 계약: <strong>{contracts.length}건</strong></span>
          <span>조회 청구건수: <strong>{sortedBillings.length}건</strong></span>
          <span>조회 청구 공급가액: <strong>{formatErpCurrency(sortedBillings.reduce((s, b) => s + Number(b.supplyAmount || 0), 0))}</strong></span>
        </div>
        <div className="text-[11px] text-[#78716c]">
          * 계약 및 청구 생성 ➔ 전자세금계산서 1-Way 자동 발행 파이프라인
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: ADD CONTRACT                                          */}
      {/* ============================================================== */}
      <AddContractModal
        activeType={activeType}
        ctAmount={ctAmount}
        ctApplyProRata={ctApplyProRata}
        ctAssignedEmployees={ctAssignedEmployees}
        ctBillingDay={ctBillingDay}
        ctCustomer={ctCustomer}
        ctEnd={ctEnd}
        ctEntityType={ctEntityType}
        ctFileInputRef={ctFileInputRef}
        ctFileName={ctFileName}
        ctIncludeOtInBilling={ctIncludeOtInBilling}
        ctMemo={ctMemo}
        ctMonthlyFee={ctMonthlyFee}
        ctOtBreakdown={ctOtBreakdown}
        ctPartnerId={ctPartnerId}
        ctProRataMonth={ctProRataMonth}
        ctProject={ctProject}
        ctSelectedEmpId={ctSelectedEmpId}
        ctStart={ctStart}
        ctTaxSpec={ctTaxSpec}
        ctVatAmount={ctVatAmount}
        employees={employees}
        enrichAssignedEmployeeJoinDates={enrichAssignedEmployeeJoinDates}
        handleAddContract={handleAddContract}
        handleContractFileUpload={handleContractFileUpload}
        handleSelectPartner={handleSelectPartner}
        isCtFileDragging={isCtFileDragging}
        partners={partners}
        servicePartnerOptions={servicePartnerOptions}
        setCtAmount={setCtAmount}
        setCtApplyProRata={setCtApplyProRata}
        setCtAssignedEmployees={setCtAssignedEmployees}
        setCtBillingDay={setCtBillingDay}
        setCtCustomer={setCtCustomer}
        setCtEnd={setCtEnd}
        setCtEntityType={setCtEntityType}
        setCtFileName={setCtFileName}
        setCtFileUrl={setCtFileUrl}
        setCtIncludeOtInBilling={setCtIncludeOtInBilling}
        setCtMemo={setCtMemo}
        setCtMonthlyFee={setCtMonthlyFee}
        setCtPartnerId={setCtPartnerId}
        setCtProRataMonth={setCtProRataMonth}
        setCtProject={setCtProject}
        setCtSelectedEmpId={setCtSelectedEmpId}
        setCtStart={setCtStart}
        setCtTaxSpec={setCtTaxSpec}
        setCtVatAmount={setCtVatAmount}
        setIsCtFileDragging={setIsCtFileDragging}
        setShowAddContractModal={setShowAddContractModal}
        showAddContractModal={showAddContractModal}
        showToast={showToast}
        syncAssignedEmployeesToContract={syncAssignedEmployeesToContract}
      />

      {/* ============================================================== */}
      {/* MODAL 2: EDIT CONTRACT                                         */}
      {/* ============================================================== */}
      <EditContractModal
        activeType={activeType}
        editCtAmount={editCtAmount}
        editCtApplyProRata={editCtApplyProRata}
        editCtAssignedEmployees={editCtAssignedEmployees}
        editCtBillingDay={editCtBillingDay}
        editCtContractNo={editCtContractNo}
        editCtCustomer={editCtCustomer}
        editCtEnd={editCtEnd}
        editCtEntityType={editCtEntityType}
        editCtFileName={editCtFileName}
        editCtIncludeOtInBilling={editCtIncludeOtInBilling}
        editCtMemo={editCtMemo}
        editCtMonthlyFee={editCtMonthlyFee}
        editCtOtBreakdown={editCtOtBreakdown}
        editCtPartnerId={editCtPartnerId}
        editCtProRataMonth={editCtProRataMonth}
        editCtProject={editCtProject}
        editCtSelectedEmpId={editCtSelectedEmpId}
        editCtStart={editCtStart}
        editCtStatus={editCtStatus}
        editCtTaxSpec={editCtTaxSpec}
        editCtVatAmount={editCtVatAmount}
        editFileInputRef={editFileInputRef}
        employees={employees}
        enrichAssignedEmployeeJoinDates={enrichAssignedEmployeeJoinDates}
        handleEditFileUpload={handleEditFileUpload}
        handleUpdateContract={handleUpdateContract}
        partners={partners}
        servicePartnerOptions={servicePartnerOptions}
        setEditCtAmount={setEditCtAmount}
        setEditCtApplyProRata={setEditCtApplyProRata}
        setEditCtAssignedEmployees={setEditCtAssignedEmployees}
        setEditCtBillingDay={setEditCtBillingDay}
        setEditCtCustomer={setEditCtCustomer}
        setEditCtEnd={setEditCtEnd}
        setEditCtEntityType={setEditCtEntityType}
        setEditCtIncludeOtInBilling={setEditCtIncludeOtInBilling}
        setEditCtMemo={setEditCtMemo}
        setEditCtMonthlyFee={setEditCtMonthlyFee}
        setEditCtPartnerId={setEditCtPartnerId}
        setEditCtProRataMonth={setEditCtProRataMonth}
        setEditCtProject={setEditCtProject}
        setEditCtSelectedEmpId={setEditCtSelectedEmpId}
        setEditCtStart={setEditCtStart}
        setEditCtStatus={setEditCtStatus}
        setEditCtTaxSpec={setEditCtTaxSpec}
        setEditCtVatAmount={setEditCtVatAmount}
        setShowEditContractModal={setShowEditContractModal}
        showEditContractModal={showEditContractModal}
        showToast={showToast}
        syncAssignedEmployeesToContract={syncAssignedEmployeesToContract}
      />

      {/* ============================================================== */}
      {/* MODAL 3: ADD BILLING                                           */}
      {/* ============================================================== */}
      <AddBillingModal
        activeType={activeType}
        applyServiceContractTemplateToBilling={applyServiceContractTemplateToBilling}
        blApplyProRata={blApplyProRata}
        blContractId={blContractId}
        blDate={blDate}
        blIncludeOtInBilling={blIncludeOtInBilling}
        blMilestoneName={blMilestoneName}
        blOtSummary={blOtSummary}
        blSupplyAmount={blSupplyAmount}
        blTaxSpec={blTaxSpec}
        blVatAmount={blVatAmount}
        contracts={contracts}
        enrichAssignedEmployeeJoinDates={enrichAssignedEmployeeJoinDates}
        handleAddBilling={handleAddBilling}
        serviceContractOptions={serviceContractOptions}
        setBlApplyProRata={setBlApplyProRata}
        setBlContractId={setBlContractId}
        setBlDate={setBlDate}
        setBlIncludeOtInBilling={setBlIncludeOtInBilling}
        setBlMilestoneName={setBlMilestoneName}
        setBlSupplyAmount={setBlSupplyAmount}
        setBlTaxSpec={setBlTaxSpec}
        setBlVatAmount={setBlVatAmount}
        setShowAddBillingModal={setShowAddBillingModal}
        showAddBillingModal={showAddBillingModal}
      />

      {/* ============================================================== */}
      {/* MODAL 4: DOCUMENT VIEWER                                       */}
      {/* ============================================================== */}
      {activeDocViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-3xl w-full h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#b5a894] bg-[#dfd7c7]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">{activeDocViewer.title}</h3>
                <span className="text-xs text-[#78716c]">({activeDocViewer.customerName})</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeDocViewer.url}
                  download={activeDocViewer.fileName}
                  className="px-2 py-1 rounded text-xs font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>다운로드</span>
                </a>
                <button onClick={() => setActiveDocViewer(null)} className="text-[#78716c] hover:text-[#1c1917]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-2 bg-[#ded6c5] overflow-hidden">
              {activeDocViewer.url.startsWith("data:application/pdf") ? (
                <iframe src={activeDocViewer.url} className="w-full h-full rounded border border-[#b5a894]" title="PDF Viewer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center overflow-auto">
                  <img src={activeDocViewer.url} alt="Contract Doc" className="max-w-full max-h-full object-contain rounded border border-[#b5a894]" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
