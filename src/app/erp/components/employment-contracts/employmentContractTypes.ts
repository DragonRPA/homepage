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
  hasScanFile?: boolean;
  pledgeDate: string | null;
  pledgeScanName: string | null;
  pledgeScanUrl: string | null;
  hasPledgeScan?: boolean;
  memo: string | null;
  employeeNo?: string;
  department?: string;
  position?: string;
}

export interface EmployeeOption {
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
  residentRegNo?: string;
  joinDate: string;
  status: string;
}

export type RightViewMode =
  | "DOCUMENT"
  | "SCAN"
  | "PLEDGE_DOC"
  | "PLEDGE_SCAN";

export interface EmploymentContractFormState {
  id: number;
  contractNo: string;
  contractYear: string;
  contractType: "NEW_HIRE" | "RENEWAL" | "SECURITY_PLEDGE";
  status: "SIGNED" | "PENDING" | "TERMINATED";
  employeeId: number | string;
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

export const CONTRACT_TYPE_LABELS: Record<
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

export const formatKoreanDateParts = (dateStr: string) => {
  if (!dateStr) return { y: "2026", m: "01", d: "01" };
  const parts = dateStr.slice(0, 10).split("-");
  return {
    y: parts[0] || "2026",
    m: parts[1] || "01",
    d: parts[2] || "01",
  };
};
