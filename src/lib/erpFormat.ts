/**
 * ERP 숫자 / 단가 / 수량 / 공급가액 / 세액 / 합계금액 및 테이블 3단계 정렬 표준 SSOT
 *
 * 사용자 표준 요구사항:
 * 1. 콤마(,) 필수 표기 (1,000 단위 구분)
 * 2. 소수점 이하 발생 시 반드시 Math.round()로 정수 반올림 처리
 * 3. 표(Table) 헤더 정렬(오름차순 -> 내림차순 -> 정렬안함)
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
 * 사용자 입력(onChange) 천단위 콤마 포맷팅 헬퍼
 */
export function formatErpInputNumber(rawInput: string | number): string {
  if (rawInput === null || rawInput === undefined || rawInput === "") return "";
  const digits = String(rawInput).replace(/[^0-9]/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  return isNaN(num) ? "" : num.toLocaleString("ko-KR");
}

/**
 * 부호(+/-) 포함 숫자 입력 천단위 콤마 포맷팅 헬퍼
 */
export function formatErpSignedInputNumber(rawInput: string | number): string {
  if (rawInput === null || rawInput === undefined || rawInput === "") return "";
  const str = String(rawInput).trim();
  const isNeg = str.startsWith("-");
  const digits = str.replace(/[^0-9]/g, "");
  if (!digits) return isNeg ? "-" : "";
  const num = parseInt(digits, 10);
  if (isNaN(num)) return "";
  const formatted = num.toLocaleString("ko-KR");
  return isNeg ? `-${formatted}` : formatted;
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

export type SortDirection = "asc" | "desc" | null;

export interface SortState<T = string> {
  key: T;
  direction: SortDirection;
}

export interface ErpSortState {
  key: string;
  dir: SortDirection;
}

/**
 * 3단계 정렬 순환 헬퍼 (오름차순 ➔ 내림차순 ➔ 정렬안함)
 */
export function cycleErpSort(
  currentKey: string,
  currentDir: SortDirection,
  clickedKey: string
): ErpSortState {
  if (!currentKey || currentKey !== clickedKey || !currentDir) {
    return { key: clickedKey, dir: "asc" };
  }
  if (currentDir === "asc") {
    return { key: clickedKey, dir: "desc" };
  }
  return { key: "", dir: null };
}

function resolveSortFieldValue(item: any, sortKey: string): unknown {
  if (item === null || item === undefined || !sortKey) return "";
  if (Object.prototype.hasOwnProperty.call(item, sortKey)) {
    return item[sortKey];
  }
  if (sortKey.includes(".")) {
    let cur: any = item;
    for (const part of sortKey.split(".")) {
      if (cur === null || cur === undefined) return "";
      cur = cur[part];
    }
    return cur;
  }
  return item[sortKey];
}

function parseSortableNumber(val: unknown): number | null {
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === "-") return null;

  // 순수 정수/실수
  if (/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }

  // 통화/천단위 콤마/단위 접미사 문자열 (날짜 2026-11-15, 사업자번호, 코드류 오인 방지)
  if (
    /^[+-]?[₩$]?\s*\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*(?:[%원개대건회일h]|hr|EA|개월)?$/i.test(trimmed) ||
    /^[+-]?[₩$]\s*\d+(?:,\d{3})*(?:\.\d+)?$/.test(trimmed) ||
    /^[+-]?\d+(?:\.\d+)?\s*(?:%|일|h|hr|건|개|대|원)$/i.test(trimmed)
  ) {
    const cleaned = trimmed.replace(/[₩$,\s원개대건회일h개월a-zA-Z%]/g, "");
    const n = Number(cleaned);
    return cleaned !== "" && Number.isFinite(n) ? n : null;
  }

  return null;
}

/**
 * 제네릭 컬럼 3단계 정렬 헬퍼 (direction === null 또는 sortKey === "" 시 원본 조회 순서 유지)
 */
export function sortErpItems<T>(
  items: T[],
  sortKey: keyof T | string,
  direction: SortDirection,
  customAccessor?: (item: T, key: string) => unknown
): T[] {
  const keyStr = String(sortKey || "");
  if (!keyStr || !direction) return items;

  return [...items].sort((a: T, b: T) => {
    let aVal = customAccessor ? customAccessor(a, keyStr) : resolveSortFieldValue(a, keyStr);
    let bVal = customAccessor ? customAccessor(b, keyStr) : resolveSortFieldValue(b, keyStr);

    if (aVal === null || aVal === undefined) aVal = "";
    if (bVal === null || bVal === undefined) bVal = "";

    const aEmpty = aVal === "";
    const bEmpty = bVal === "";
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    if (typeof aVal === "boolean" && typeof bVal === "boolean") {
      if (aVal === bVal) return 0;
      return direction === "asc" ? (aVal ? 1 : -1) : aVal ? -1 : 1;
    }

    const aNum = parseSortableNumber(aVal);
    const bNum = parseSortableNumber(bVal);
    if (aNum !== null && bNum !== null) {
      return direction === "asc" ? aNum - bNum : bNum - aNum;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      const aDateMatch = /^\d{4}-\d{2}-\d{2}/.test(aVal.trim());
      const bDateMatch = /^\d{4}-\d{2}-\d{2}/.test(bVal.trim());
      if (aDateMatch && bDateMatch) {
        const aDate = Date.parse(aVal);
        const bDate = Date.parse(bVal);
        if (!isNaN(aDate) && !isNaN(bDate)) {
          return direction === "asc" ? aDate - bDate : bDate - aDate;
        }
      }
    }

    const aStr = String(aVal);
    const bStr = String(bVal);
    return direction === "asc"
      ? aStr.localeCompare(bStr, "ko")
      : bStr.localeCompare(aStr, "ko");
  });
}
