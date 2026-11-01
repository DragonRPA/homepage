"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Receipt,
  Plus,
  Check,
  X,
  Trash2,
  RefreshCw,
  Upload,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  formatErpCurrency,
  formatErpNumber,
  formatErpInputNumber,
  cleanErpNumber,
  toErpInputString,
  sortErpItems,
  SortDirection,
} from "@/lib/erpFormat";

interface ExpenseReceiptItem {
  id: number;
  employee_id: number;
  employee_no: string;
  employee_name: string;
  department: string;
  position: string;
  duty?: string;
  expense_date: string;
  year_month: string;
  category: string;
  merchant_name: string;
  amount: number;
  payment_method: string;
  description: string;
  receipt_file_name?: string;
  receipt_r2_key?: string;
  receipt_file_url?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approved_by?: string;
  approved_at?: string;
  payroll_included?: boolean;
  created_at?: string;
}

interface EmployeeOption {
  id: number;
  employee_no: string;
  name: string;
  department: string;
  position: string;
  duty?: string;
  status: string;
}

interface DeptOption {
  id: number;
  dept_code: string;
  dept_name: string;
  manager_name: string;
}

interface ExpenseReceiptTabProps {
  currentUser: any;
}

const EXPENSE_CATEGORIES = [
  "식대·회식비",
  "유류비·주차·통행료",
  "출장·교통비",
  "소모품·현장자재",
  "접대·업무추진비",
  "기타 업무경비",
];

const PAYMENT_METHODS = ["개인카드", "현금영수증", "개인계좌이체"];

const DESCRIPTION_PRESETS = [
  "야간·휴일 근무 식대",
  "현장 출장 유류비·통행료",
  "렌탈장비 소모품·부자재 구매",
  "부서 업무협의·식대",
  "직접 입력",
];

export const ExpenseReceiptTab: React.FC<ExpenseReceiptTabProps> = ({ currentUser }) => {
  const [receipts, setReceipts] = useState<ExpenseReceiptItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // 등록 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [yearMonth, setYearMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [merchantName, setMerchantName] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [descPreset, setDescPreset] = useState(DESCRIPTION_PRESETS[0]);
  const [description, setDescription] = useState(DESCRIPTION_PRESETS[0]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 영수증 스캔본 미리보기 모달
  const [previewItem, setPreviewItem] = useState<ExpenseReceiptItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const [sortKey, setSortKey] = useState<string>("expense_date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 권한 및 부서장 판별
  const isSuperAdmin =
    currentUser?.role === "ADMIN" ||
    currentUser?.duty?.includes("대표이사") ||
    currentUser?.position?.includes("대표이사");

  const currentEmployee = useMemo(() => {
    if (!currentUser) return null;
    return (
      employees.find(
        (e) =>
          (currentUser.id && Number(e.id) === Number(currentUser.id)) ||
          (currentUser.employee_no && e.employee_no === currentUser.employee_no) ||
          (currentUser.name && e.name === currentUser.name)
      ) || null
    );
  }, [employees, currentUser]);

  const userDepartment = currentEmployee?.department || currentUser?.department || "";
  const userDuty = currentEmployee?.duty || currentUser?.duty || "";
  const userPosition = currentEmployee?.position || currentUser?.position || "";
  const userName = currentEmployee?.name || currentUser?.name || "";

  const isDeptHead = useMemo(() => {
    if (isSuperAdmin) return true;
    if (
      userDuty.includes("팀장") ||
      userDuty.includes("부서장") ||
      userDuty.includes("본부장") ||
      userDuty.includes("실장") ||
      userDuty.includes("센터장") ||
      userPosition.includes("팀장") ||
      userPosition.includes("부서장") ||
      userPosition.includes("본부장") ||
      currentUser?.role === "MANAGER"
    ) {
      return true;
    }
    if (
      userName &&
      departments.some((d) => d.manager_name && d.manager_name.trim() === userName.trim())
    ) {
      return true;
    }
    return false;
  }, [isSuperAdmin, userDuty, userPosition, currentUser, userName, departments]);

  const targetDeptNames = useMemo(() => {
    const set = new Set<string>();
    if (userDepartment) set.add(userDepartment.trim());
    if (userName) {
      departments.forEach((d) => {
        if (d.manager_name && d.manager_name.trim() === userName.trim() && d.dept_name) {
          set.add(d.dept_name.trim());
        }
      });
    }
    return Array.from(set);
  }, [userDepartment, userName, departments]);

  // 등록 모달에서 퀵버튼으로 선택 가능한 임직원 목록
  const selectableEmployees = useMemo(() => {
    if (isSuperAdmin) return employees;
    if (isDeptHead) {
      const deptEmps = employees.filter(
        (e) =>
          targetDeptNames.includes((e.department || "").trim()) ||
          (currentEmployee && Number(e.id) === Number(currentEmployee.id))
      );
      return deptEmps.length > 0 ? deptEmps : employees;
    }
    if (currentEmployee) return [currentEmployee];
    return employees;
  }, [isSuperAdmin, isDeptHead, employees, targetDeptNames, currentEmployee]);

  // 열람 범위 필터링 (최고관리자: 전체, 부서장: 해당 부서 전원, 일반사원: 본인)
  const scopedReceipts = useMemo(() => {
    let base = receipts;
    if (!isSuperAdmin) {
      if (isDeptHead) {
        base = receipts.filter((r) => {
          const empDept = (r.department || "").trim();
          const isMyDept = targetDeptNames.length > 0 ? targetDeptNames.includes(empDept) : true;
          const isMe =
            (currentEmployee && Number(r.employee_id) === Number(currentEmployee.id)) ||
            (userName && r.employee_name === userName);
          return isMyDept || isMe;
        });
      } else {
        base = receipts.filter(
          (r) =>
            (currentEmployee && Number(r.employee_id) === Number(currentEmployee.id)) ||
            (userName && r.employee_name === userName)
        );
      }
    }

    return base.filter((r) => {
      const matchCat = filterCategory === "ALL" || r.category === filterCategory;
      const matchStatus = filterStatus === "ALL" || r.status === filterStatus;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (r.employee_name || "").toLowerCase().includes(q) ||
        (r.merchant_name || "").toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q);
      return matchCat && matchStatus && matchSearch;
    });
  }, [
    receipts,
    isSuperAdmin,
    isDeptHead,
    targetDeptNames,
    currentEmployee,
    userName,
    filterCategory,
    filterStatus,
    searchTerm,
  ]);

  const sortedReceipts = useMemo<ExpenseReceiptItem[]>(() => {
    return sortErpItems(scopedReceipts, sortKey, sortDir);
  }, [scopedReceipts, sortKey, sortDir]);

  const summary = useMemo(() => {
    const totalCount = scopedReceipts.length;
    const approvedItems = scopedReceipts.filter((r) => r.status === "APPROVED");
    const pendingItems = scopedReceipts.filter((r) => r.status === "PENDING");
    const withFileItems = scopedReceipts.filter((r) => Boolean(r.receipt_r2_key || r.receipt_file_name));

    const approvedSum = approvedItems.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const pendingSum = pendingItems.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const totalSum = scopedReceipts.reduce((acc, r) => acc + Number(r.amount || 0), 0);

    return {
      totalCount,
      approvedCount: approvedItems.length,
      approvedSum,
      pendingCount: pendingItems.length,
      pendingSum,
      withFileCount: withFileItems.length,
      totalSum,
    };
  }, [scopedReceipts]);

  const shiftMonth = (delta: number) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    if (!y || !m) return;
    const d = new Date(y, m - 1 + delta, 1);
    const nextYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(nextYm);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, empRes, deptRes] = await Promise.all([
        fetch(`/api/erp/expenses?yearMonth=${selectedMonth}`),
        fetch("/api/erp/employees"),
        fetch("/api/erp/departments"),
      ]);

      const expData = await expRes.json();
      const empData = await empRes.json();
      const deptData = await deptRes.json().catch(() => ({ departments: [] }));

      if (expData.success) {
        setReceipts(expData.receipts || []);
      }
      if (empData.success) {
        const activeEmps = (empData.employees || []).filter((e: any) => e.status === "ACTIVE");
        setEmployees(activeEmps);
      }
      if (deptData.success && Array.isArray(deptData.departments)) {
        setDepartments(deptData.departments);
      }
    } catch (err: any) {
      showToast(err.message || "데이터 조회 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  // 기본 선택 사원 세팅
  useEffect(() => {
    if (selectableEmployees.length > 0) {
      const exists = selectableEmployees.some((e) => String(e.id) === String(selectedEmployeeId));
      if (!selectedEmployeeId || !exists) {
        const defaultEmp =
          selectableEmployees.find((e) => currentEmployee && Number(e.id) === Number(currentEmployee.id)) ||
          selectableEmployees[0];
        if (defaultEmp) {
          setSelectedEmployeeId(String(defaultEmp.id));
        }
      }
    }
  }, [selectableEmployees, currentEmployee, selectedEmployeeId]);

  // 사용일자 변경 시 급여 귀속월 자동 연동
  const handleDateChange = (dateStr: string) => {
    setExpenseDate(dateStr);
    if (dateStr && dateStr.length >= 7) {
      setYearMonth(dateStr.slice(0, 7));
    }
  };

  const handleOpenCreateModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setExpenseDate(today);
    setYearMonth(selectedMonth || today.slice(0, 7));
    setCategory(EXPENSE_CATEGORIES[0]);
    setPaymentMethod(PAYMENT_METHODS[0]);
    setMerchantName("");
    setAmountInput("");
    setDescPreset(DESCRIPTION_PRESETS[0]);
    setDescription(DESCRIPTION_PRESETS[0]);
    setReceiptFile(null);
    setModalOpen(true);
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      showToast("대상 임직원을 선택해주세요.", "error");
      return;
    }

    const numericAmount = cleanErpNumber(amountInput);
    if (numericAmount <= 0 && !receiptFile) {
      showToast("결제 금액을 입력하거나 영수증 파일을 첨부해주세요.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("employee_id", String(selectedEmployeeId));
      formData.append("expense_date", expenseDate);
      formData.append("year_month", yearMonth);
      formData.append("category", category);
      formData.append("payment_method", paymentMethod);
      formData.append("merchant_name", merchantName);
      formData.append("amount", String(numericAmount));
      formData.append("description", description);
      formData.append("auto_approve", isDeptHead ? "true" : "false");
      formData.append("approved_by", currentUser?.name || "관리자");
      if (receiptFile) {
        formData.append("file", receiptFile);
      }

      const res = await fetch("/api/erp/expenses", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "개인경비 등록 실패");

      showToast(data.message || "개인경비 영수증이 등록되었습니다.");
      setModalOpen(false);
      if (yearMonth !== selectedMonth) {
        setSelectedMonth(yearMonth);
      } else {
        fetchData();
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/erp/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: newStatus,
          approved_by: currentUser?.name || "부서장",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "결재 처리 실패");

      showToast(data.message || "처리되었습니다.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleApproveAllPending = async () => {
    if (summary.pendingCount === 0) {
      showToast("결재 대기 중인 영수증이 없습니다.", "error");
      return;
    }
    if (!confirm(`${selectedMonth} 결재 대기 중인 영수증 ${summary.pendingCount}건을 일괄 승인하여 급여 정산에 즉시 반영하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch("/api/erp/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE_ALL",
          yearMonth: selectedMonth,
          approved_by: currentUser?.name || "관리자",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "일괄 승인 실패");

      showToast(data.message || "일괄 승인 및 급여 정산 동기화가 완료되었습니다.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("해당 개인경비 영수증 내역을 삭제하시겠습니까? (급여정산 반영액도 즉시 차감 갱신됩니다)")) return;
    try {
      const res = await fetch(`/api/erp/expenses?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");

      showToast("삭제 및 급여 정산 재동기화가 완료되었습니다.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "사용일자",
      "급여귀속월",
      "사번",
      "성명",
      "부서",
      "직급",
      "경비구분",
      "가맹점/사용처",
      "결제수단",
      "결제금액(원)",
      "사용목적",
      "영수증파일",
      "결재상태",
      "승인자",
    ];
    const rows = sortedReceipts.map((r) => [
      r.expense_date ? String(r.expense_date).slice(0, 10) : "-",
      r.year_month,
      r.employee_no || "-",
      r.employee_name,
      r.department || "-",
      r.position || "-",
      r.category,
      `"${(r.merchant_name || "").replace(/"/g, '""')}"`,
      r.payment_method,
      r.amount,
      `"${(r.description || "").replace(/"/g, '""')}"`,
      r.receipt_file_name || "미첨부",
      r.status === "APPROVED" ? "승인(급여반영)" : r.status === "REJECTED" ? "반려" : "결재대기",
      r.approved_by || "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `개인경비영수증대장_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const renderSortTh = (
    label: string,
    key: string,
    align: "left" | "center" | "right" = "left",
    extraClass = ""
  ) => {
    const active = sortKey === key;
    const alignCls =
      align === "right"
        ? "justify-end text-right"
        : align === "center"
        ? "justify-center text-center"
        : "justify-start text-left";
    return (
      <th
        onClick={() => toggleSort(key)}
        className={`py-2 px-2.5 whitespace-nowrap cursor-pointer select-none hover:bg-[#d8d0c0] dark:hover:bg-slate-700/60 transition ${extraClass}`}
      >
        <div className={`inline-flex items-center gap-1 w-full ${alignCls}`}>
          <span>{label}</span>
          <span
            className={`text-[9px] leading-none ${
              active ? "text-[#1d4ed8] font-extrabold" : "text-[#94a3b8]"
            }`}
          >
            {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#ebe5d8] text-[#0f172a] overflow-hidden font-sans dark:bg-slate-950 dark:text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-xs font-bold border ${
            toastMessage.type === "success"
              ? "bg-emerald-950 border-emerald-500 text-emerald-200"
              : "bg-rose-950 border-rose-500 text-rose-200"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* 1. 상단 필터 및 액션 바 (Gutenberg Z-Pattern Step 1 & Step 2) */}
      <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-[#047857]" />
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
              개인경비 영수증 등록 · 급여정산 연동
            </span>
          </div>

          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold border whitespace-nowrap ${
              isSuperAdmin
                ? "bg-[#dbeafe] text-[#1d4ed8] border-[#93c5fd]"
                : isDeptHead
                ? "bg-[#ecfdf5] text-[#047857] border-[#6ee7b7]"
                : "bg-[#fef3c7] text-[#b45309] border-[#fcd34d]"
            }`}
          >
            {isSuperAdmin
              ? "전사 구성원 경비 등록·승인 (최고관리자)"
              : isDeptHead
              ? `${targetDeptNames.join("·") || "소속부서"} 구성원 경비 등록·승인 (부서장)`
              : `${userName || "본인"} 개인경비 등록·조회`}
          </span>

          {/* 귀속연월 선택 */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-1.5 bg-[#f4efe4] hover:bg-[#ebe5d8] text-[#334155] rounded border border-[#b5a894] transition"
              title="이전 달"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1 rounded focus:outline-none focus:border-[#047857] font-mono"
            />
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-1.5 bg-[#f4efe4] hover:bg-[#ebe5d8] text-[#334155] rounded border border-[#b5a894] transition"
              title="다음 달"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 경비 구분 필터 */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1 rounded focus:outline-none"
          >
            <option value="ALL">전체 경비구분</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* 결재 상태 필터 */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1 rounded focus:outline-none"
          >
            <option value="ALL">전체 결재상태</option>
            <option value="APPROVED">승인완료 (급여반영)</option>
            <option value="PENDING">결재대기</option>
            <option value="REJECTED">반려</option>
          </select>

          <input
            type="text"
            placeholder="사원명, 가맹점, 사용목적 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2.5 py-1 rounded w-44 focus:outline-none focus:border-[#047857]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 bg-[#f4efe4] hover:bg-[#ebe5d8] text-[#334155] rounded border border-[#b5a894] transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-2.5 py-1.5 bg-[#f4efe4] hover:bg-[#ebe5d8] text-[#0f172a] text-xs font-bold rounded flex items-center gap-1 border border-[#b5a894] shadow transition whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>

          {isDeptHead && summary.pendingCount > 0 && (
            <button
              onClick={handleApproveAllPending}
              className="px-2.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1 shadow transition whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5" />
              <span>대기건 일괄 승인 ({summary.pendingCount}건)</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="px-3 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded flex items-center gap-1 shadow transition whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>개인경비 영수증 등록</span>
          </button>
        </div>
      </div>

      {/* 2. 상단 KPI 요약 바 */}
      <div className="grid grid-cols-4 gap-3 p-3 shrink-0 bg-[#ebe5d8] border-b border-[#b5a894] dark:bg-slate-950 dark:border-slate-800">
        <div className="bg-[#f4efe4] border border-[#b5a894] p-2.5 rounded flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
          <div>
            <p className="text-[11px] text-[#475569] dark:text-slate-400">당월 등록 영수증 건수</p>
            <p className="text-base font-bold font-mono text-[#0f172a] dark:text-slate-100">
              {formatErpNumber(summary.totalCount)}건
            </p>
          </div>
          <Receipt className="w-6 h-6 text-[#64748b]" />
        </div>

        <div className="bg-[#ecfdf5] border border-[#10b981] p-2.5 rounded flex items-center justify-between dark:bg-emerald-950/30 dark:border-emerald-800">
          <div>
            <p className="text-[11px] font-bold text-[#047857] dark:text-emerald-400">
              승인 완료 (급여정산 자동 포함액)
            </p>
            <p className="text-base font-bold font-mono text-[#047857] dark:text-emerald-300">
              {formatErpCurrency(summary.approvedSum)}{" "}
              <span className="text-xs font-sans">({summary.approvedCount}건)</span>
            </p>
          </div>
          <Check className="w-6 h-6 text-[#047857]" />
        </div>

        <div className="bg-[#f4efe4] border border-[#b5a894] p-2.5 rounded flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
          <div>
            <p className="text-[11px] text-[#475569] dark:text-slate-400">결재 대기 금액</p>
            <p className="text-base font-bold font-mono text-[#b45309] dark:text-amber-400">
              {formatErpCurrency(summary.pendingSum)}{" "}
              <span className="text-xs font-sans">({summary.pendingCount}건)</span>
            </p>
          </div>
          <RefreshCw className="w-6 h-6 text-[#d97706]" />
        </div>

        <div className="bg-[#f4efe4] border border-[#b5a894] p-2.5 rounded flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
          <div>
            <p className="text-[11px] text-[#475569] dark:text-slate-400">영수증 증빙 스캔 보관 (R2 볼트)</p>
            <p className="text-base font-bold font-mono text-[#1d4ed8] dark:text-blue-400">
              {formatErpNumber(summary.withFileCount)}건 첨부
            </p>
          </div>
          <Lock className="w-6 h-6 text-[#1d4ed8]" />
        </div>
      </div>

      {/* 3. 중앙 본문 고밀도 테이블 (Gutenberg Z-Pattern Step 3) */}
      <div className="flex-1 overflow-auto p-3">
        <div className="bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded shadow-sm overflow-hidden h-full flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#e2dbcd] text-[#0f172a] uppercase tracking-wider font-semibold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center sticky left-0 bg-[#e2dbcd] z-20 border-r border-[#b5a894]">
                    결재 / 관리
                  </th>
                  {renderSortTh("사용 일자", "expense_date")}
                  {renderSortTh("급여 귀속월", "year_month", "center")}
                  {renderSortTh("사번", "employee_no")}
                  {renderSortTh("성명", "employee_name")}
                  {renderSortTh("부서", "department")}
                  {renderSortTh("경비 구분", "category")}
                  {renderSortTh("가맹점 / 사용처", "merchant_name")}
                  {renderSortTh("결제 수단", "payment_method", "center")}
                  {renderSortTh("결제 금액 (원)", "amount", "right", "text-[#047857] font-bold")}
                  {renderSortTh("사용 목적 / 상세 사유", "description")}
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">영수증 증빙</th>
                  {renderSortTh("상태 (급여반영)", "status", "center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] font-mono text-[11px] dark:divide-slate-800">
                {sortedReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-[#475569] font-sans text-xs">
                      {selectedMonth} 귀속 개인경비 영수증 내역이 없습니다. 우측 상단 [개인경비 영수증 등록] 버튼으로 등록하세요.
                    </td>
                  </tr>
                ) : (
                  sortedReceipts.map((r) => (
                    <tr key={r.id} className="hover:bg-[#ebe5d8] dark:hover:bg-slate-800/40 transition">
                      {/* 좌측 고정 액션 컬럼 (헌장 3.2조) */}
                      <td className="py-2 px-3 text-center whitespace-nowrap font-sans sticky left-0 bg-[#f4efe4] dark:bg-slate-900 border-r border-[#b5a894]">
                        <div className="flex items-center justify-center gap-1">
                          {isDeptHead && r.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleStatusChange(r.id, "APPROVED")}
                                className="px-2 py-0.5 bg-[#047857] hover:bg-[#065f46] text-white rounded text-[10px] font-bold transition"
                                title="승인 및 급여정산 반영"
                              >
                                승인
                              </button>
                              <button
                                onClick={() => handleStatusChange(r.id, "REJECTED")}
                                className="px-2 py-0.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded text-[10px] font-bold transition"
                                title="반려"
                              >
                                반려
                              </button>
                            </>
                          )}
                          {(isDeptHead || r.status === "PENDING") && (
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="p-1 text-[#475569] hover:text-[#dc2626] transition"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-2.5 text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                        {r.expense_date ? String(r.expense_date).slice(0, 10) : "-"}
                      </td>
                      <td className="py-2 px-2.5 text-center font-bold text-[#1d4ed8] dark:text-blue-400 whitespace-nowrap">
                        {r.year_month}
                      </td>
                      <td className="py-2 px-2.5 text-[#475569] dark:text-slate-400 whitespace-nowrap font-sans">
                        {r.employee_no || "-"}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap font-sans">
                        {r.employee_name}
                      </td>
                      <td className="py-2 px-2.5 text-[#334155] dark:text-slate-300 whitespace-nowrap font-sans">
                        {r.department || "-"}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap font-sans">
                        <span className="px-2 py-0.5 rounded bg-[#e2dbcd] text-[#0f172a] font-bold text-[10px] border border-[#b5a894]">
                          {r.category}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-[#0f172a] dark:text-slate-200 font-bold whitespace-nowrap font-sans">
                        {r.merchant_name || "-"}
                      </td>
                      <td className="py-2 px-2.5 text-center text-[#475569] dark:text-slate-300 whitespace-nowrap font-sans">
                        {r.payment_method}
                      </td>
                      <td className="py-2 px-2.5 text-right font-extrabold text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                        {formatErpCurrency(r.amount)}
                      </td>
                      <td className="py-2 px-2.5 text-[#334155] dark:text-slate-300 font-sans max-w-xs truncate">
                        {r.description || "-"}
                      </td>
                      <td className="py-2 px-2.5 text-center whitespace-nowrap font-sans">
                        {r.receipt_r2_key || r.receipt_file_url ? (
                          <button
                            onClick={() => setPreviewItem(r)}
                            className="px-2 py-0.5 bg-[#dbeafe] hover:bg-[#bfdbfe] text-[#1d4ed8] border border-[#93c5fd] rounded text-[10px] font-bold inline-flex items-center gap-1 transition"
                          >
                            <Eye className="w-3 h-3" />
                            <span>영수증 보기</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#94a3b8]">미첨부</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-center whitespace-nowrap font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === "APPROVED"
                              ? "bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]"
                              : r.status === "REJECTED"
                              ? "bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]"
                              : "bg-[#fef3c7] text-[#b45309] border border-[#fde68a]"
                          }`}
                        >
                          {r.status === "APPROVED"
                            ? "승인 · 급여반영"
                            : r.status === "REJECTED"
                            ? "반려"
                            : "결재대기"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. 하단 대차대조 요약 바 (Gutenberg Z-Pattern Step 4) */}
      <div className="p-3 bg-[#e2dbcd] border-t border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            📄 청구총액:{" "}
            <strong className="text-[#0f172a] dark:text-slate-100">
              {formatErpCurrency(summary.totalSum)}
            </strong>
          </span>
          <span className="text-[#94a3b8]">=</span>
          <span>
            🟢 급여정산 반영 확정액:{" "}
            <strong className="text-[#047857] dark:text-emerald-400">
              {formatErpCurrency(summary.approvedSum)}
            </strong>
          </span>
          <span className="text-[#94a3b8]">+</span>
          <span>
            ⏳ 결재대기/제외액:{" "}
            <strong className="text-[#b45309] dark:text-amber-400">
              {formatErpCurrency(summary.totalSum - summary.approvedSum)}
            </strong>
          </span>
        </div>
        <div className="text-[11px] font-sans text-[#047857] font-bold">
          * 승인된 개인경비는 [{selectedMonth} 급여 정산]의 &apos;개인경비 정산(비과세)&apos; 항목 및 실지급액에 자동 합산됩니다.
        </div>
      </div>

      {/* 5. 개인경비 영수증 등록 모달 (퀵버튼 전면 적용) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded-lg p-5 w-full max-w-2xl shadow-2xl text-[#0f172a] dark:text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#b5a894] dark:border-slate-800">
              <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#047857]" />
                <span>개인경비 영수증 등록 및 급여정산 연동</span>
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-[#ebe5d8] rounded transition"
              >
                <X className="w-4 h-4 text-[#475569]" />
              </button>
            </div>

            <form onSubmit={handleSubmitReceipt} className="space-y-3.5 text-xs">
              {/* 1) 영수증 스캔본 첨부 (R2 볼트 암호화 보관 + AI 자동인식) */}
              <div className="flex flex-col gap-1">
                <label className="text-[#334155] dark:text-slate-300 font-bold flex items-center justify-between">
                  <span>영수증 사진 / PDF 첨부 (Cloudflare R2 보안 볼트 저장 · AI 금액 자동인식)</span>
                  {receiptFile && (
                    <button
                      type="button"
                      onClick={() => setReceiptFile(null)}
                      className="text-[11px] text-[#dc2626] font-bold hover:underline"
                    >
                      첨부 취소
                    </button>
                  )}
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) setReceiptFile(file);
                  }}
                  className="border-2 border-dashed border-[#10b981] bg-[#ecfdf5]/60 hover:bg-[#d1fae5]/60 rounded p-3 text-center cursor-pointer transition flex items-center justify-center gap-2.5"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setReceiptFile(f);
                    }}
                    className="hidden"
                  />
                  <Upload className="w-4 h-4 text-[#047857] shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#047857]">
                      {receiptFile
                        ? `첨부됨: ${receiptFile.name} (${Math.round(receiptFile.size / 1024)} KB)`
                        : "영수증 이미지 또는 PDF를 클릭/드래그하여 첨부하세요"}
                    </p>
                    <p className="text-[10px] text-[#475569] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#047857]" />
                      <span>결제금액이나 가맹점명을 비워두어도 영수증 이미지에서 AI가 자동 추출합니다.</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 2) 대상 임직원 퀵버튼 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#334155] dark:text-slate-300 font-bold">
                  대상 임직원 (퀵선택)
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-[#ebe5d8] border border-[#b5a894] rounded dark:bg-slate-950 dark:border-slate-800">
                  {selectableEmployees.map((e) => {
                    const isSelected = String(selectedEmployeeId) === String(e.id);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setSelectedEmployeeId(String(e.id))}
                        className={`px-2.5 py-1.5 rounded text-xs font-bold border transition whitespace-nowrap ${
                          isSelected
                            ? "bg-[#047857] text-white border-[#047857] shadow-sm"
                            : "bg-[#f4efe4] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {e.name}
                        <span
                          className={`ml-1 text-[10px] font-normal ${
                            isSelected ? "text-emerald-100" : "text-[#64748b]"
                          }`}
                        >
                          ({e.department} · {e.position})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3) 사용 일자 및 급여 정산 귀속연월 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">
                    영수증 결제(사용) 일자
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#047857] dark:text-emerald-400 font-bold">
                    급여 정산 반영 귀속연월
                  </label>
                  <input
                    type="month"
                    value={yearMonth}
                    onChange={(e) => setYearMonth(e.target.value)}
                    className="bg-[#ecfdf5] border border-[#10b981] text-[#047857] font-bold px-2.5 py-1.5 rounded font-mono"
                    required
                  />
                </div>
              </div>

              {/* 4) 경비 구분 퀵버튼 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#334155] dark:text-slate-300 font-bold">
                  경비 구분 (퀵선택)
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-[#ebe5d8] border border-[#b5a894] rounded dark:bg-slate-950 dark:border-slate-800">
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition whitespace-nowrap ${
                          isSelected
                            ? "bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-sm"
                            : "bg-[#f4efe4] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd]"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5) 결제 수단 퀵버튼 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#334155] dark:text-slate-300 font-bold">
                  결제 수단 (퀵선택)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((pm) => {
                    const isSelected = paymentMethod === pm;
                    return (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setPaymentMethod(pm)}
                        className={`px-3 py-1 rounded text-[11px] font-bold border transition whitespace-nowrap ${
                          isSelected
                            ? "bg-[#0f172a] text-white border-[#0f172a]"
                            : "bg-[#ebe5d8] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd]"
                        }`}
                      >
                        {pm}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6) 가맹점명 및 결제금액 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">
                    가맹점 / 사용처 상호
                  </label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="예: GS칼텍스 금천주유소, 한솥도시락"
                    className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#047857] dark:text-emerald-400 font-bold">
                    결제 금액 (원) [급여 비과세 정산액]
                  </label>
                  <input
                    type="text"
                    value={amountInput}
                    onChange={(e) => setAmountInput(formatErpInputNumber(e.target.value))}
                    placeholder="0"
                    className="bg-[#ecfdf5] border border-[#10b981] text-[#047857] font-extrabold px-2.5 py-1.5 rounded text-right font-mono text-sm"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[
                      { label: "+1만", val: 10000 },
                      { label: "+3만", val: 30000 },
                      { label: "+5만", val: 50000 },
                      { label: "+10만", val: 100000 },
                      { label: "초기화", val: 0 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => {
                          if (btn.val === 0) {
                            setAmountInput("");
                          } else {
                            const cur = cleanErpNumber(amountInput);
                            setAmountInput(toErpInputString(cur + btn.val));
                          }
                        }}
                        className="px-2 py-0.5 bg-[#e2dbcd] hover:bg-[#d5cbb8] text-[#334155] rounded border border-[#b5a894] text-[10px] font-bold"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 7) 사용 목적 프리셋 퀵버튼 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#334155] dark:text-slate-300 font-bold">
                  사용 목적 프리셋 (퀵선택)
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-[#ebe5d8] border border-[#b5a894] rounded dark:bg-slate-950 dark:border-slate-800">
                  {DESCRIPTION_PRESETS.map((preset) => {
                    const isSelected = descPreset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setDescPreset(preset);
                          if (preset !== "직접 입력") {
                            setDescription(preset);
                          } else {
                            setDescription("");
                          }
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition whitespace-nowrap ${
                          isSelected
                            ? "bg-[#047857] text-white border-[#047857] shadow-sm"
                            : "bg-[#f4efe4] text-[#334155] border-[#b5a894] hover:bg-[#e2dbcd]"
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 8) 상세 사유 입력 */}
              <div className="flex flex-col gap-1">
                <label className="text-[#334155] dark:text-slate-300 font-semibold">
                  상세 사용 목적 / 메모
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="사용 목적을 입력하세요"
                  className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded"
                  required
                />
              </div>

              <div className="pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#334155] bg-[#ebe5d8] hover:bg-[#d0c6b4] rounded border border-[#b5a894]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#047857] hover:bg-[#065f46] rounded shadow flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>저장 및 급여정산 반영 중...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {isDeptHead ? "영수증 등록 및 즉시 승인 (급여반영)" : "개인경비 영수증 제출"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. 영수증 스캔본 미리보기 모달 */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border border-[#b5a894] rounded-lg p-4 w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#b5a894]">
              <div className="flex items-center gap-2 text-xs font-bold">
                <FileText className="w-4 h-4 text-[#1d4ed8]" />
                <span>
                  영수증 증빙 조회 — {previewItem.employee_name} ({previewItem.expense_date?.slice(0, 10)} ·{" "}
                  {previewItem.merchant_name} · {formatErpCurrency(previewItem.amount)})
                </span>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 hover:bg-[#ebe5d8] rounded"
              >
                <X className="w-4 h-4 text-[#475569]" />
              </button>
            </div>

            <div className="flex-1 overflow-auto py-3 flex items-center justify-center bg-[#ebe5d8] rounded my-2 min-h-[380px]">
              {previewItem.receipt_r2_key ? (
                previewItem.receipt_file_name?.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={`/api/erp/contracts/file?key=${encodeURIComponent(previewItem.receipt_r2_key)}`}
                    className="w-full h-[65vh] border-0"
                    title="영수증 PDF"
                  />
                ) : (
                  <img
                    src={`/api/erp/contracts/file?key=${encodeURIComponent(previewItem.receipt_r2_key)}`}
                    alt="영수증 스캔본"
                    className="max-w-full max-h-[65vh] object-contain rounded shadow"
                  />
                )
              ) : previewItem.receipt_file_url ? (
                <img
                  src={previewItem.receipt_file_url}
                  alt="영수증 이미지"
                  className="max-w-full max-h-[65vh] object-contain rounded shadow"
                />
              ) : (
                <p className="text-xs text-[#64748b]">영수증 이미지가 없습니다.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#b5a894]">
              {previewItem.receipt_r2_key && (
                <a
                  href={`/api/erp/contracts/file?key=${encodeURIComponent(previewItem.receipt_r2_key)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-[#1d4ed8] text-white text-xs font-bold rounded"
                >
                  새 창에서 원본 열기
                </a>
              )}
              <button
                onClick={() => setPreviewItem(null)}
                className="px-3 py-1.5 bg-[#ebe5d8] text-[#334155] text-xs font-bold rounded border border-[#b5a894]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
