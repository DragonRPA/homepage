import { cleanErpNumber } from "./erpFormat";

/**
 * 연차 일수 표기 포맷 (정수는 쉼표 표기, 0.5일 반차는 소수점 1자리 표기)
 */
export function formatErpLeaveDays(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "0";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "0";
  const rounded = Math.round(num * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toLocaleString("ko-KR") : rounded.toFixed(1);
}

/**
 * 휴가 구분 코드 및 메타데이터 SSOT (연차 소진 vs 잔여연차 미소진 휴가)
 */
export type LeaveTypeCode =
  | "ANNUAL"
  | "HALF_AM"
  | "HALF_PM"
  | "PUBLIC"
  | "CONGRATULATORY"
  | "SICK"
  | "SPECIAL";

export interface LeaveTypeMeta {
  code: LeaveTypeCode;
  label: string;
  shortLabel: string;
  deductsAnnualLeave: boolean;
  fixedDeductedDays: number | null;
  singleDayOnly: boolean;
  placeholderReason: string;
}

export const LEAVE_TYPE_LIST: LeaveTypeMeta[] = [
  {
    code: "ANNUAL",
    label: "전일 연차 (1일)",
    shortLabel: "연차",
    deductsAnnualLeave: true,
    fixedDeductedDays: null,
    singleDayOnly: false,
    placeholderReason: "개인 사유 연차 신청",
  },
  {
    code: "HALF_AM",
    label: "오전 반차 (0.5)",
    shortLabel: "오전반차",
    deductsAnnualLeave: true,
    fixedDeductedDays: 0.5,
    singleDayOnly: true,
    placeholderReason: "오전 개인 일정으로 인한 반차 신청",
  },
  {
    code: "HALF_PM",
    label: "오후 반차 (0.5)",
    shortLabel: "오후반차",
    deductsAnnualLeave: true,
    fixedDeductedDays: 0.5,
    singleDayOnly: true,
    placeholderReason: "오후 개인 일정으로 인한 반차 신청",
  },
  {
    code: "PUBLIC",
    label: "공가 (예비군/민방위/검진)",
    shortLabel: "공가(예비군등)",
    deductsAnnualLeave: false,
    fixedDeductedDays: 0,
    singleDayOnly: false,
    placeholderReason: "예비군 훈련 / 민방위 훈련 / 건강검진 등 공적 의무 수행",
  },
  {
    code: "CONGRATULATORY",
    label: "경조휴가",
    shortLabel: "경조휴가",
    deductsAnnualLeave: false,
    fixedDeductedDays: 0,
    singleDayOnly: false,
    placeholderReason: "결혼 / 배우자 출산 / 가족 경조사",
  },
  {
    code: "SICK",
    label: "병가",
    shortLabel: "병가",
    deductsAnnualLeave: false,
    fixedDeductedDays: 0,
    singleDayOnly: false,
    placeholderReason: "질병 치료 및 병원 진료",
  },
  {
    code: "SPECIAL",
    label: "특별/포상휴가",
    shortLabel: "특별휴가",
    deductsAnnualLeave: false,
    fixedDeductedDays: 0,
    singleDayOnly: false,
    placeholderReason: "포상휴가 / 대체휴무 / 회사 부여 특별휴가",
  },
];

export const LEAVE_TYPE_MAP: Record<string, LeaveTypeMeta> = Object.fromEntries(
  LEAVE_TYPE_LIST.map((item) => [item.code, item])
);

export function isNonDeductingLeaveType(leaveType?: string | null): boolean {
  if (!leaveType) return false;
  const meta = LEAVE_TYPE_MAP[String(leaveType).toUpperCase()];
  return meta ? !meta.deductsAnnualLeave : false;
}

export function getLeaveTypeLabel(leaveType?: string | null): string {
  if (!leaveType) return "연차";
  const meta = LEAVE_TYPE_MAP[String(leaveType).toUpperCase()];
  return meta ? meta.shortLabel : String(leaveType);
}

export function calculateWeekdayCount(startDate?: string | null, endDate?: string | null): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * 회계연도(1월 1일 ~ 12월 31일) 기준 연차 부여일수 및 연차(0년차, 1년차...) 자동 산출 SSOT
 * - 입사 0년차(입사 연도 == 대상 연도): 15일을 해당 연도의 잔여 일수 비율로 비례 부여 (0.5일 단위 반올림)
 * - 입사 다음 연도(1년차, targetYear - joinYear == 1)부터 매년 1월 1일 ~ 12월 31일 기준:
 *   기본 15일 + 3년차부터 매 2년(3, 5, 7, 9...년차)마다 1일 가산 (최대 25일 한도)
 */
export function calculateAnnualLeaveEntitlement(
  joinDateStr?: string | null,
  targetYear: number = new Date().getFullYear()
): {
  tenureYears: number;
  grantDays: number;
  formulaLabel: string;
  remainingYearDays?: number;
  totalYearDays?: number;
} {
  if (!joinDateStr) {
    return { tenureYears: 1, grantDays: 15, formulaLabel: "기본 15일" };
  }
  const clean = String(joinDateStr).trim().slice(0, 10);
  const parts = clean.split("-").map(Number);
  if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
    return { tenureYears: 1, grantDays: 15, formulaLabel: "기본 15일" };
  }
  const [jy, jm, jd] = parts;
  const tenureYears = Math.max(0, targetYear - jy);

  // 1. 입사 0년차 (해당 연도 중도 입사자): 15개 × (입사일~12/31 잔여일수 / 해당연도 총일수)
  if (tenureYears === 0) {
    const startOfYear = Date.UTC(targetYear, 0, 1);
    const endOfYear = Date.UTC(targetYear, 11, 31);
    const joinUtc = Date.UTC(jy, jm - 1, jd);

    const totalYearDays = Math.round((endOfYear - startOfYear) / 86400000) + 1; // 365 or 366
    const clampedJoin = Math.max(startOfYear, Math.min(endOfYear, joinUtc));
    const remainingYearDays = Math.round((endOfYear - clampedJoin) / 86400000) + 1;

    const rawGrant = (15 * remainingYearDays) / totalYearDays;
    // 반차(0.5일) 단위로 깔끔하게 사용 가능하도록 0.5 단위 반올림 (최소 0.5일 ~ 최대 15일)
    const grantDays = Math.min(15, Math.max(0.5, Math.round(rawGrant * 2) / 2));

    return {
      tenureYears: 0,
      grantDays,
      remainingYearDays,
      totalYearDays,
      formulaLabel: `입사 0년차 잔여비율 (15일 × ${remainingYearDays}/${totalYearDays}일)`,
    };
  }

  // 2. 입사 다음 연도(1년차) 이후: 회계연도(1/1~12/31) 기준 부여 (3, 5, 7, 9...년차 +1일 가산)
  const additionalDays = tenureYears >= 3 ? Math.floor((tenureYears - 1) / 2) : 0;
  const grantDays = Math.min(25, 15 + additionalDays);

  return {
    tenureYears,
    grantDays,
    formulaLabel:
      additionalDays > 0
        ? `${tenureYears}년차 회계연도 부여 (기본 15일 + 근속가산 ${additionalDays}일)`
        : `${tenureYears}년차 회계연도 기본 부여 (15일)`,
  };
}

// ============================================================================
// ⏱️ 초과근무(Overtime) 일시 조건별 수당 자동 산정 엔진 (SSOT)
// ============================================================================

const KOREAN_SOLAR_HOLIDAYS = new Set([
  "01-01", // 신정
  "03-01", // 삼일절
  "05-01", // 근로자의 날
  "05-05", // 어린이날
  "06-06", // 현충일
  "08-15", // 광복절
  "10-03", // 개천절
  "10-09", // 한글날
  "12-25", // 성탄절
]);

// 연도별 음력 공휴일(설날, 추석, 부처님오신날) 및 대체공휴일/임시공휴일 포함 전체 비근무 공휴일 테이블
const KOREAN_YEARLY_HOLIDAYS: Record<string, string[]> = {
  "2025": [
    "2025-01-27", "2025-01-28", "2025-01-29", "2025-01-30", // 설날 연휴
    "2025-03-03", // 삼일절 대체공휴일
    "2025-05-05", "2025-05-06", // 어린이날·부처님오신날 대체공휴일
    "2025-06-03", // 대통령선거일
    "2025-10-05", "2025-10-06", "2025-10-07", "2025-10-08", // 추석 연휴 및 대체공휴일
  ],
  "2026": [
    "2026-02-16", "2026-02-17", "2026-02-18", // 설날 연휴
    "2026-03-02", // 삼일절 대체공휴일
    "2026-05-24", "2026-05-25", // 부처님오신날 및 대체공휴일
    "2026-06-03", // 전국동시지방선거
    "2026-08-17", // 광복절 대체공휴일
    "2026-09-24", "2026-09-25", "2026-09-26", // 추석 연휴
    "2026-10-05", // 개천절 대체공휴일
  ],
  "2027": [
    "2027-02-06", "2027-02-07", "2027-02-08", "2027-02-09", // 설날 연휴 및 대체공휴일
    "2027-05-13", // 부처님오신날
    "2027-08-16", // 광복절 대체공휴일
    "2027-09-14", "2027-09-15", "2027-09-16", // 추석 연휴
    "2027-10-04", // 개천절 대체공휴일
    "2027-10-11", // 한글날 대체공휴일
    "2027-12-27", // 성탄절 대체공휴일
  ],
  "2028": [
    "2028-01-26", "2028-01-27", "2028-01-28", // 설날 연휴
    "2028-05-02", // 부처님오신날
    "2028-10-02", "2028-10-03", "2028-10-04", "2028-10-05", // 추석 연휴 및 대체공휴일
  ],
};

/**
 * 일자('YYYY-MM-DD')가 휴일(주말 토/일, 양력/음력 법정공휴일, 대체공휴일)인지 자동 판별
 */
export function isKoreanNonWorkingDay(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const clean = String(dateStr).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return false;
  const [y, m, d] = clean.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay(); // 0: 일, 6: 토
  if (dow === 0 || dow === 6) return true;

  const mmdd = clean.slice(5, 10);
  if (KOREAN_SOLAR_HOLIDAYS.has(mmdd)) return true;
  const yearlyList = KOREAN_YEARLY_HOLIDAYS[String(y)];
  if (yearlyList && yearlyList.includes(clean)) return true;
  return false;
}

export interface OvertimeBreakdownResult {
  isHoliday: boolean;
  otType: "WEEKDAY_OT" | "WEEKDAY_NIGHT_OT" | "NIGHT_OT" | "HOLIDAY_OT" | "HOLIDAY_NIGHT_OT";
  otTypeLabel: string;
  otHours: number;
  regularOtHours: number;
  holidayHours: number;
  holidayOver8Hours: number;
  nightHours: number;
  hourlyWage: number;
  appliedMultiplier: number;
  otPay: number;
  formulaText: string;
}

/**
 * 근무일자, 시작~종료시각, 1시간 표준임금, 비근무일 여부를 기반으로
 * 평일 초과근무 / 비근무일 출근(8h이내·8h초과) / 심야근무(22:00~06:00) 시간 및 수당액을 자동 계산
 */
export function calculateOvertimeBreakdown(params: {
  otDate: string;
  startTime: string;
  endTime: string;
  hourlyWage: number;
  overrideIsHoliday?: boolean | null;
}): OvertimeBreakdownResult {
  const { otDate, startTime, endTime, overrideIsHoliday } = params;
  const hourlyWage = Math.max(0, Math.round(Number(params.hourlyWage) || 0));
  const isHoliday =
    overrideIsHoliday !== undefined && overrideIsHoliday !== null
      ? Boolean(overrideIsHoliday)
      : isKoreanNonWorkingDay(otDate);

  const [sh, sm] = String(startTime || "18:00").split(":").map((v) => parseInt(v, 10) || 0);
  const [eh, em] = String(endTime || "20:00").split(":").map((v) => parseInt(v, 10) || 0);

  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) {
    // 자정(00:00)을 넘기는 익일 새벽 종료 근무 (예: 21:00 ~ 02:00)
    endMin += 24 * 60;
  }

  const totalMin = Math.max(0, endMin - startMin);
  let nightMin = 0;

  for (let m = startMin; m < endMin; m++) {
    const clock = ((m % 1440) + 1440) % 1440;
    // 심야근무 시간대: 22:00 (1320분) ~ 익일 06:00 (360분)
    if (clock >= 22 * 60 || clock < 6 * 60) {
      nightMin++;
    }
  }

  const otHours = Math.round((totalMin / 60) * 100) / 100;
  const nightHours = Math.round((nightMin / 60) * 100) / 100;

  let regularOtHours = 0;
  let holidayHours = 0;
  let holidayOver8Hours = 0;
  let otPay = 0;
  let otType: OvertimeBreakdownResult["otType"] = "WEEKDAY_OT";
  let otTypeLabel = "평일 초과근무 (1.5배)";
  const formulaParts: string[] = [];

  if (!isHoliday) {
    regularOtHours = otHours;
    const baseOtPay = regularOtHours * hourlyWage * 1.5;
    const nightExtraPay = nightHours * hourlyWage * 0.5;
    otPay = Math.round(baseOtPay + nightExtraPay);

    if (nightHours > 0 && nightHours >= otHours) {
      otType = "NIGHT_OT";
      otTypeLabel = "심야 초과근무 (2.0배)";
    } else if (nightHours > 0) {
      otType = "WEEKDAY_NIGHT_OT";
      otTypeLabel = "평일 초과 + 심야근무";
    } else {
      otType = "WEEKDAY_OT";
      otTypeLabel = "평일 초과근무 (1.5배)";
    }

    if (regularOtHours > 0) {
      formulaParts.push(`평일초과 ${regularOtHours}h × ${hourlyWage.toLocaleString()}원 × 1.5배`);
    }
    if (nightHours > 0) {
      formulaParts.push(`심야가산(22~06시) ${nightHours}h × ${hourlyWage.toLocaleString()}원 × 0.5배`);
    }
  } else {
    holidayHours = Math.min(8, otHours);
    holidayOver8Hours = Math.max(0, Math.round((otHours - 8) * 100) / 100);
    const holBasePay = holidayHours * hourlyWage * 1.5;
    const holOver8Pay = holidayOver8Hours * hourlyWage * 2.0;
    const nightExtraPay = nightHours * hourlyWage * 0.5;
    otPay = Math.round(holBasePay + holOver8Pay + nightExtraPay);

    if (nightHours > 0) {
      otType = "HOLIDAY_NIGHT_OT";
      otTypeLabel = "비근무일 출근 + 심야";
    } else {
      otType = "HOLIDAY_OT";
      otTypeLabel = holidayOver8Hours > 0 ? "비근무일 출근 (8h초과 포함)" : "비근무일 출근 (1.5배)";
    }

    if (holidayHours > 0) {
      formulaParts.push(`비근무일(8h이내) ${holidayHours}h × ${hourlyWage.toLocaleString()}원 × 1.5배`);
    }
    if (holidayOver8Hours > 0) {
      formulaParts.push(`비근무일(8h초과) ${holidayOver8Hours}h × ${hourlyWage.toLocaleString()}원 × 2.0배`);
    }
    if (nightHours > 0) {
      formulaParts.push(`심야가산(22~06시) ${nightHours}h × ${hourlyWage.toLocaleString()}원 × 0.5배`);
    }
  }

  const appliedMultiplier =
    otHours > 0 && hourlyWage > 0
      ? Math.round((otPay / (otHours * hourlyWage)) * 100) / 100
      : 1.5;

  return {
    isHoliday,
    otType,
    otTypeLabel,
    otHours,
    regularOtHours,
    holidayHours,
    holidayOver8Hours,
    nightHours,
    hourlyWage,
    appliedMultiplier,
    otPay,
    formulaText: formulaParts.length > 0 ? formulaParts.join(" + ") : "근무시간을 선택하세요",
  };
}

export interface ServiceEmployeeProRataResult {
  baseRate: number;
  effectiveAmount: number;
  diffAmount: number;
  totalMonthDays: number;
  activeDays: number;
  startDay: number;
  endDay: number;
  isProRated: boolean;
  isNotYetJoined: boolean;
  isAfterLeft: boolean;
  formulaLabel: string;
  shortBadge: string;
  workWeekdays: number;
  paidWeeklyHolidayDays: number;
  paidDays: number;
  paidHours: number;
  standardMonthlyHours: number;
  weeklyHolidayEligible: boolean;
  weeklyHolidayStatusLabel: "만근" | "주휴대상" | "주휴미대상" | "미투입" | "퇴사";
  totalTenureDays: number | null;
}

const SERVICE_DAY_MS = 86400000;
const STANDARD_MONTHLY_PAID_HOURS = 209;

function parseYmdToUtc(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  const [y, m, d] = clean.split("-").map(Number);
  if (!y || !m || !d) return null;
  const utc = Date.UTC(y, m - 1, d);
  const check = new Date(utc);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return utc;
}

function countWeekdaysUtc(startUtc: number, endUtc: number): number {
  if (endUtc < startUtc) return 0;
  let count = 0;
  for (let cur = startUtc; cur <= endUtc; cur += SERVICE_DAY_MS) {
    const dow = new Date(cur).getUTCDay();
    if (dow >= 1 && dow <= 5) {
      count += 1;
    }
  }
  return count;
}

/**
 * 운영용역 투입 임직원 및 급여대장 월별 입퇴사 일할계산 SSOT 헬퍼 (근로기준법 주휴수당 판별 및 소수점 반올림)
 * - 주 5일(월~금, 1일 8h, 주 40h), 월 소정근로시간 209시간(유급 주휴 포함) 기준
 * - 고용노동부 행정해석 임금근로시간과-1736(2021.08.04) 및 임금근로시간과-234(2022.01.26) 반영
 * - 수식: Math.round(baseRate × paidHours / 209)
 */
export function calculateServiceEmployeeMonthlyProRata(
  contractRate: number | string | null | undefined,
  targetYearMonth?: string | null,
  joinDateStr?: string | null,
  leaveDateStr?: string | null,
  proRataEnabled: boolean = true,
  excludeBeforeJoin: boolean = true
): ServiceEmployeeProRataResult {
  const baseRate = Math.max(0, Math.round(cleanErpNumber(contractRate)));
  const ym = (targetYearMonth || new Date().toISOString().slice(0, 7)).trim().slice(0, 7);
  const ymParts = ym.split("-").map(Number);
  const year = ymParts[0] || new Date().getUTCFullYear();
  const month = ymParts[1] || new Date().getUTCMonth() + 1;
  const totalMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const monthStartUtc = Date.UTC(year, month - 1, 1);
  const monthEndUtc = Date.UTC(year, month - 1, totalMonthDays);
  const prevMonthStartUtc = Date.UTC(year, month - 2, 1);
  const fullMonthWeekdays = countWeekdaysUtc(monthStartUtc, monthEndUtc);

  const cleanJoin = joinDateStr ? String(joinDateStr).trim().slice(0, 10) : "";
  const cleanLeave = leaveDateStr ? String(leaveDateStr).trim().slice(0, 10) : "";
  const joinUtc = parseYmdToUtc(cleanJoin);
  const leaveUtc = parseYmdToUtc(cleanLeave);
  const totalTenureDays =
    joinUtc !== null && leaveUtc !== null && leaveUtc >= joinUtc
      ? Math.round((leaveUtc - joinUtc) / SERVICE_DAY_MS) + 1
      : null;

  if (!proRataEnabled || baseRate <= 0) {
    return {
      baseRate,
      effectiveAmount: baseRate,
      diffAmount: 0,
      totalMonthDays,
      activeDays: totalMonthDays,
      startDay: 1,
      endDay: totalMonthDays,
      isProRated: false,
      isNotYetJoined: false,
      isAfterLeft: false,
      formulaLabel: `만근 (209/209h)`,
      shortBadge: `만근 (209h)`,
      workWeekdays: fullMonthWeekdays,
      paidWeeklyHolidayDays: 4,
      paidDays: fullMonthWeekdays + 4,
      paidHours: STANDARD_MONTHLY_PAID_HOURS,
      standardMonthlyHours: STANDARD_MONTHLY_PAID_HOURS,
      weeklyHolidayEligible: baseRate > 0,
      weeklyHolidayStatusLabel: "만근",
      totalTenureDays,
    };
  }

  // 비정상 역전 날짜(퇴사일 < 입사일) 방어
  if (joinUtc !== null && leaveUtc !== null && leaveUtc < joinUtc) {
    return {
      baseRate,
      effectiveAmount: 0,
      diffAmount: -baseRate,
      totalMonthDays,
      activeDays: 0,
      startDay: 0,
      endDay: 0,
      isProRated: true,
      isNotYetJoined: false,
      isAfterLeft: true,
      formulaLabel: `퇴사 (${cleanLeave.slice(5).replace("-", "/")} 퇴사 · 0/209h)`,
      shortBadge: `0h (${cleanLeave.slice(5).replace("-", "/")} 퇴사)`,
      workWeekdays: 0,
      paidWeeklyHolidayDays: 0,
      paidDays: 0,
      paidHours: 0,
      standardMonthlyHours: STANDARD_MONTHLY_PAID_HOURS,
      weeklyHolidayEligible: false,
      weeklyHolidayStatusLabel: "퇴사",
      totalTenureDays: 0,
    };
  }

  let startDay = 1;
  let endDay = totalMonthDays;
  let joinNote = "";
  let leaveNote = "";

  if (joinUtc !== null) {
    if (joinUtc > monthEndUtc) {
      if (excludeBeforeJoin) {
        const joinMmDd = cleanJoin.slice(5).replace("-", "/");
        return {
          baseRate,
          effectiveAmount: 0,
          diffAmount: -baseRate,
          totalMonthDays,
          activeDays: 0,
          startDay: 0,
          endDay: 0,
          isProRated: true,
          isNotYetJoined: true,
          isAfterLeft: false,
          formulaLabel: `미투입 (${joinMmDd} 입사전 · 0/209h)`,
          shortBadge: `0h (${joinMmDd} 입사전)`,
          workWeekdays: 0,
          paidWeeklyHolidayDays: 0,
          paidDays: 0,
          paidHours: 0,
          standardMonthlyHours: STANDARD_MONTHLY_PAID_HOURS,
          weeklyHolidayEligible: false,
          weeklyHolidayStatusLabel: "미투입",
          totalTenureDays,
        };
      }
    } else if (joinUtc > monthStartUtc && joinUtc <= monthEndUtc) {
      const jd = new Date(joinUtc).getUTCDate();
      if (jd > 1) {
        startDay = jd;
        joinNote = `${cleanJoin.slice(5).replace("-", "/")} 입사`;
      }
    }
  }

  if (leaveUtc !== null) {
    if (leaveUtc < monthStartUtc) {
      const leaveMmDd = cleanLeave.slice(5).replace("-", "/");
      return {
        baseRate,
        effectiveAmount: 0,
        diffAmount: -baseRate,
        totalMonthDays,
        activeDays: 0,
        startDay: 0,
        endDay: 0,
        isProRated: true,
        isNotYetJoined: false,
        isAfterLeft: true,
        formulaLabel: `퇴사 (${leaveMmDd} 퇴사 · 0/209h)`,
        shortBadge: `0h (${leaveMmDd} 퇴사)`,
        workWeekdays: 0,
        paidWeeklyHolidayDays: 0,
        paidDays: 0,
        paidHours: 0,
        standardMonthlyHours: STANDARD_MONTHLY_PAID_HOURS,
        weeklyHolidayEligible: false,
        weeklyHolidayStatusLabel: "퇴사",
        totalTenureDays,
      };
    } else if (leaveUtc >= monthStartUtc && leaveUtc < monthEndUtc) {
      const ld = new Date(leaveUtc).getUTCDate();
      if (ld < totalMonthDays) {
        endDay = ld;
        leaveNote = `${cleanLeave.slice(5).replace("-", "/")} 퇴사`;
      }
    }
  }

  const activeDays = Math.max(0, endDay - startDay + 1);
  if (activeDays === 0) {
    const mmdd = cleanLeave ? cleanLeave.slice(5).replace("-", "/") : "-";
    return {
      baseRate,
      effectiveAmount: 0,
      diffAmount: -baseRate,
      totalMonthDays,
      activeDays: 0,
      startDay: 0,
      endDay: 0,
      isProRated: true,
      isNotYetJoined: false,
      isAfterLeft: true,
      formulaLabel: `퇴사 (${mmdd} · 0/209h)`,
      shortBadge: `0h (${mmdd} 퇴사)`,
      workWeekdays: 0,
      paidWeeklyHolidayDays: 0,
      paidDays: 0,
      paidHours: 0,
      standardMonthlyHours: STANDARD_MONTHLY_PAID_HOURS,
      weeklyHolidayEligible: false,
      weeklyHolidayStatusLabel: "퇴사",
      totalTenureDays,
    };
  }

  const isProRated = activeDays < totalMonthDays;
  if (!isProRated) {
    return {
      baseRate,
      effectiveAmount: baseRate,
      diffAmount: 0,
      totalMonthDays,
      activeDays: totalMonthDays,
      startDay: 1,
      endDay: totalMonthDays,
      isProRated: false,
      isNotYetJoined: false,
      isAfterLeft: false,
      formulaLabel: `만근 (209/209h)`,
      shortBadge: `만근 (209h)`,
      workWeekdays: fullMonthWeekdays,
      paidWeeklyHolidayDays: 4,
      paidDays: fullMonthWeekdays + 4,
      paidHours: STANDARD_MONTHLY_PAID_HOURS,
      standardMonthlyHours: STANDARD_MONTHLY_PAID_HOURS,
      weeklyHolidayEligible: true,
      weeklyHolidayStatusLabel: "만근",
      totalTenureDays,
    };
  }

  const effStartUtc = Date.UTC(year, month - 1, startDay);
  const effEndUtc = Date.UTC(year, month - 1, endDay);
  const workWeekdays = countWeekdaysUtc(effStartUtc, effEndUtc);

  let paidWeeklyHolidayDays = 0;

  if (joinUtc !== null && leaveUtc !== null && totalTenureDays !== null && totalTenureDays < 7) {
    // (A) 총 재직기간 7일 미만 단기 퇴사자: 1주 근로관계 미존속 -> 주휴수당 미대상
    paidWeeklyHolidayDays = 0;
  } else if (joinUtc !== null && joinUtc > prevMonthStartUtc && joinUtc <= monthEndUtc) {
    // (B) 당월 또는 직전월 중도입사자(1개월 미만 단기 및 월 경계 포함): 입사일 기준 연속 7일 단위 기산
    const careerEndUtc = leaveUtc !== null ? leaveUtc : monthEndUtc;
    for (
      let blockStart = joinUtc;
      blockStart + 6 * SERVICE_DAY_MS <= careerEndUtc;
      blockStart += 7 * SERVICE_DAY_MS
    ) {
      const blockEnd = blockStart + 6 * SERVICE_DAY_MS;
      if (blockEnd >= monthStartUtc && blockEnd <= monthEndUtc) {
        paidWeeklyHolidayDays += 1;
      }
    }
  } else {
    // (C) 기존 계속근로자의 당월 중도퇴사: 사업장 주휴일(일요일) 기준 직전 월~일(7일) 전체 재직 여부 판정
    for (let dUtc = monthStartUtc; dUtc <= effEndUtc; dUtc += SERVICE_DAY_MS) {
      if (new Date(dUtc).getUTCDay() === 0) {
        const monUtc = dUtc - 6 * SERVICE_DAY_MS;
        if ((joinUtc === null || joinUtc <= monUtc) && dUtc <= effEndUtc) {
          paidWeeklyHolidayDays += 1;
        }
      }
    }
  }

  const paidDays = workWeekdays + paidWeeklyHolidayDays;
  const paidHours = Math.min(STANDARD_MONTHLY_PAID_HOURS, paidDays * 8);
  const effectiveAmount = Math.min(
    baseRate,
    Math.round((baseRate * paidHours) / STANDARD_MONTHLY_PAID_HOURS)
  );
  const diffAmount = Math.round(effectiveAmount - baseRate);
  const weeklyHolidayEligible = paidWeeklyHolidayDays > 0;
  const weeklyHolidayStatusLabel = weeklyHolidayEligible ? "주휴대상" : "주휴미대상";

  const rangeStr = `${String(month).padStart(2, "0")}/${String(startDay).padStart(2, "0")}~${String(month).padStart(2, "0")}/${String(endDay).padStart(2, "0")}`;
  const reasonText = [joinNote, leaveNote].filter(Boolean).join(", ");
  const formulaLabel = weeklyHolidayEligible
    ? `일할 ${paidHours}/209h (근로 ${workWeekdays}일 + 주휴 ${paidWeeklyHolidayDays}일 [주휴대상] · ${rangeStr}${reasonText ? ` · ${reasonText}` : ""})`
    : `일할 ${paidHours}/209h (근로 ${workWeekdays}일 + 주휴 0일 [주휴미대상] · ${rangeStr}${reasonText ? ` · ${reasonText}` : ""})`;
  const shortBadge = weeklyHolidayEligible
    ? `근로${workWeekdays}일+주휴${paidWeeklyHolidayDays}일 (${paidHours}/209h)`
    : `근로${workWeekdays}일·주휴미대상 (${paidHours}/209h)`;

  return {
    baseRate,
    effectiveAmount,
    diffAmount,
    totalMonthDays,
    activeDays,
    startDay,
    endDay,
    isProRated: true,
    isNotYetJoined: false,
    isAfterLeft: false,
    formulaLabel,
    shortBadge,
    workWeekdays,
    paidWeeklyHolidayDays,
    paidDays,
    paidHours,
    standardMonthlyHours: STANDARD_MONTHLY_PAID_HOURS,
    weeklyHolidayEligible,
    weeklyHolidayStatusLabel,
    totalTenureDays,
  };
}
