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
