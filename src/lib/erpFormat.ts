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
