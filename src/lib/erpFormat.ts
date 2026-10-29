/**
 * ERP 숫자 / 단가 / 수량 / 공급가액 / 세액 / 합계금액 표준 표기 SSOT
 * 
 * 사용자 표준 요구사항:
 * 1. 콤마(,) 필수 표기 (1,000 단위 구분)
 * 2. 소수점 이하 발생 시 반드시 Math.round()로 정수 반올림 처리
 * 3. 표(Table) 헤더 정렬 및 세로 스크롤 표준 규격
 */

/**
 * 숫자를 반올림하여 천단위 콤마 포맷 문자열로 변환
 */
export function formatErpNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "0";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "0";
  return Math.round(num).toLocaleString("ko-KR");
}

/**
 * 사용자 입력(onChange) 실시간 천단위 콤마 포맷팅 헬퍼
 * 사용자가 숫자를 칠 때 실시간으로 1,000 단위 콤마를 적용
 */
export function formatErpInputNumber(rawInput: string | number): string {
  if (rawInput === null || rawInput === undefined || rawInput === "") return "";
  const digits = String(rawInput).replace(/[^0-9]/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  return isNaN(num) ? "" : num.toLocaleString("ko-KR");
}

/**
 * DB에서 가져온 값(예: '2700000.00' 등 소수점 포함)을 입력창용 천단위 콤마 정수 문자열(예: '2,700,000')로 변환
 */
export function toErpInputString(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return Math.round(num).toLocaleString("ko-KR");
}

/**
 * 콤마가 포함된 문자열을 서버 전송용 정수 숫자로 변환
 */
export function cleanErpNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === "") return 0;
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * 원화 금액 통화 포맷 (₩ 기호 + 반올림 정수 + 콤마)
 */
export function formatErpCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "₩0";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "₩0";
  const rounded = Math.round(num);
  if (rounded < 0) {
    return `-₩${Math.abs(rounded).toLocaleString("ko-KR")}`;
  }
  return `₩${rounded.toLocaleString("ko-KR")}`;
}

/**
 * 수량 포맷 (반올림 정수 + 콤마 + 단위)
 */
export function formatErpQty(val: number | string | null | undefined, unit: string = ""): string {
  const formatted = formatErpNumber(val);
  return unit ? `${formatted} ${unit}` : formatted;
}

export type SortDirection = "asc" | "desc";

export interface SortState<T = string> {
  key: T;
  direction: SortDirection;
}

/**
 * 제네릭 컬럼 정렬 헬퍼
 */
export function sortErpItems<T>(
  items: T[],
  sortKey: keyof T | string,
  direction: SortDirection
): T[] {
  if (!sortKey) return items;

  return [...items].sort((a: any, b: any) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];

    // Handle null/undefined
    if (aVal === null || aVal === undefined) aVal = "";
    if (bVal === null || bVal === undefined) bVal = "";

    // Numeric comparison
    const aNum = Number(aVal);
    const bNum = Number(bVal);
    if (!isNaN(aNum) && !isNaN(bNum) && typeof aVal !== "boolean" && typeof bVal !== "boolean" && aVal !== "" && bVal !== "") {
      return direction === "asc" ? aNum - bNum : bNum - aNum;
    }

    // Date comparison (YYYY-MM-DD...)
    if (typeof aVal === "string" && typeof bVal === "string") {
      const aDate = Date.parse(aVal);
      const bDate = Date.parse(bVal);
      if (!isNaN(aDate) && !isNaN(bDate) && aVal.length >= 8 && bVal.length >= 8) {
        return direction === "asc" ? aDate - bDate : bDate - aDate;
      }
    }

    // String locale comparison
    const aStr = String(aVal);
    const bStr = String(bVal);
    return direction === "asc"
      ? aStr.localeCompare(bStr, "ko")
      : bStr.localeCompare(aStr, "ko");
  });
}

/**
 * 계약 품목명/청구명/세금계산서 비고 치환식(Template Expression) 컨텍스트
 */
export interface ContractTemplateContext {
  /** 기준 일자 ('YYYY-MM-DD') 또는 정산 연월 ('YYYY-MM') */
  dateStr?: string | null;
  /** 계약/청구의 품목 명세 배열 (taxItems) */
  items?: Array<{ itemName?: string | null }>;
  /** taxItems가 비어있거나 1번째 품목명이 없을 때 사용할 대체 1번째 아이템명 (예: 모델명, 상품명, 프로젝트명) */
  fallbackFirstItem?: string | null;
}

/**
 * 계약 품목명/비고 치환식 평가 헬퍼
 * - 규칙 1: 문자열에 중괄호 `{...}` 치환식이 없으면 절대 치환하지 않고 원문 그대로 반환
 * - 규칙 2: `{yymm}`, `{yyyymm}`, `{yyyy-mm}`, `{yy-mm}`, `{yyyy}`, `{yy}`, `{mm}`, `{dd}` 날짜 치환 지원
 * - 규칙 3: `{1번째 아이템}`, `{첫번째 아이템}`, `{firstItem}`, `{item}`, `{품목}` 치환 지원
 * - 규칙 4: 템플릿에 `"{1번째 아이템} 외"` 형태가 있을 때, 아이템 개수가 1개 이하이면 뒤의 `" 외"`를 자동 제거하고, 2개 이상이면 `" 외"` 유지
 */
export function resolveContractItemTemplate(
  template: string | null | undefined,
  ctx: ContractTemplateContext = {}
): string {
  if (template === null || template === undefined) return "";
  const rawTemplate = String(template);
  // 품목명에 {} 가 없으면 절대 치환 안 함
  if (!/\{[^}]+\}/.test(rawTemplate)) {
    return rawTemplate;
  }

  // 1. 날짜(연월일) 파싱
  const now = new Date();
  const digits = String(ctx.dateStr || "").replace(/[^0-9]/g, "");
  const yyyy = digits.length >= 4 ? digits.slice(0, 4) : String(now.getFullYear());
  const yy = yyyy.slice(2, 4);
  const mm = digits.length >= 6 ? digits.slice(4, 6) : String(now.getMonth() + 1).padStart(2, "0");
  const dd = digits.length >= 8 ? digits.slice(6, 8) : String(now.getDate()).padStart(2, "0");

  const replaceDateTokens = (str: string): string =>
    str
      .replace(/\{yymm\}/gi, `${yy}${mm}`)
      .replace(/\{yyyymm\}/gi, `${yyyy}${mm}`)
      .replace(/\{yyyy-mm\}/gi, `${yyyy}-${mm}`)
      .replace(/\{yy-mm\}/gi, `${yy}-${mm}`)
      .replace(/\{yyyy\.mm\}/gi, `${yyyy}.${mm}`)
      .replace(/\{yy\.mm\}/gi, `${yy}.${mm}`)
      .replace(/\{yyyy\}/gi, yyyy)
      .replace(/\{yy\}/gi, yy)
      .replace(/\{mm\}/gi, mm)
      .replace(/\{dd\}/gi, dd);

  // 2. 유효 아이템 목록 및 1번째 아이템 파악
  const validItems = (ctx.items || []).filter(
    (it) => it && it.itemName && String(it.itemName).trim() !== ""
  );
  const itemCount =
    validItems.length > 0 ? validItems.length : ctx.fallbackFirstItem ? 1 : 0;

  // 1번째 아이템 원문 추출 (만약 1번째 아이템 자체가 '{1번째 아이템}' 자기참조라면 fallbackFirstItem 사용)
  let firstItemRaw = validItems[0]?.itemName?.trim() || "";
  const selfRefPattern = /^\{(1번째\s*아이템|첫번째\s*아이템|1번째\s*품목|첫번째\s*품목|firstItem|item|품목)\}(\s*외)?$/i;
  if (!firstItemRaw || selfRefPattern.test(firstItemRaw)) {
    firstItemRaw = (ctx.fallbackFirstItem || "").trim();
  }
  const firstItemResolved = replaceDateTokens(firstItemRaw);

  // 3. 날짜 토큰 먼저 치환
  let result = replaceDateTokens(rawTemplate);

  // 4. {1번째 아이템} 계열 토큰 치환 (아이템이 1개 이하이면 뒤의 " 외" 제거)
  const itemTokenSource = "1번째\\s*아이템|첫번째\\s*아이템|1번째\\s*품목|첫번째\\s*품목|firstItem|item|품목";
  const itemTokenRegex = new RegExp(`\\{(${itemTokenSource})\\}`, "gi");

  if (itemTokenRegex.test(result)) {
    if (itemCount <= 1) {
      // "{1번째 아이템} 외" 또는 "{1번째 아이템}외" -> " 외" 제거
      const withExtraRegex = new RegExp(`\\{(${itemTokenSource})\\}\\s*외(\\s*\\d*건?)?`, "gi");
      result = result.replace(withExtraRegex, firstItemResolved);
    }
    result = result.replace(new RegExp(`\\{(${itemTokenSource})\\}`, "gi"), firstItemResolved);
  }

  return result.trim();
}

/**
 * 세금계산서 품목 배열(taxItems) 내부의 각 itemName 및 month/day를 기준일자로 치환하는 헬퍼
 * - 각 품목의 itemName에 `{}` 치환식이 있을 때만 치환하며, `{}`가 없으면 원문 보존
 */
export function resolveContractTaxItemsTemplate<T extends Record<string, any> = any>(
  items: T[] | null | undefined,
  ctx: ContractTemplateContext = {}
): T[] {
  if (!Array.isArray(items)) return [];
  const now = new Date();
  const digits = String(ctx.dateStr || "").replace(/[^0-9]/g, "");
  const mm = digits.length >= 6 ? digits.slice(4, 6) : String(now.getMonth() + 1).padStart(2, "0");
  const dd = digits.length >= 8 ? digits.slice(6, 8) : String(now.getDate()).padStart(2, "0");

  return items.map((it) => {
    const resolvedName = resolveContractItemTemplate(it?.itemName, {
      ...ctx,
      items,
    });
    return {
      ...it,
      month: digits.length >= 6 ? mm : it?.month || mm,
      day: digits.length >= 8 ? dd : it?.day || dd,
      itemName: resolvedName,
    };
  });
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

/**
 * 일자('YYYY-MM-DD')가 비근무일(주말 토/일 또는 주요 법정공휴일)인지 자동 판별
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
  return KOREAN_SOLAR_HOLIDAYS.has(mmdd);
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


