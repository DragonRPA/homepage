/**
 * 렌탈료 과금 기준 3원칙 및 월단가 / 일단가 계산 단일 표준 유틸리티 (SSOT)
 *
 * 전사 표준 규칙:
 * 1. 월단가 (의도적 입력): MONTHLY 기준 계약/정산 시 월단가 정액 적용
 * 2. 일단가 (의도적 입력 시): DAILY_MANUAL — 사용자가 직접 입력한 일단가(> 0)를 그대로 보존 및 일할 계산에 적용
 * 3. 일단가 (월단가 ÷ 30의 1,000원 단위 반올림): DAILY_AUTO — 일단가 미입력(0/공란) 또는 자동 계산 선택 시
 *    Math.round((월단가 / 30) / 1000) * 1000 적용
 */

export type RentalRateBasis = "MONTHLY" | "DAILY_MANUAL" | "DAILY_AUTO";

export const RENTAL_RATE_BASIS_OPTIONS: ReadonlyArray<{
  value: RentalRateBasis;
  label: string;
  shortLabel: string;
}> = [
  { value: "MONTHLY", label: "월단가", shortLabel: "월단가" },
  { value: "DAILY_MANUAL", label: "일단가 (직접입력)", shortLabel: "일단가 지정" },
  { value: "DAILY_AUTO", label: "일단가 (월단가÷30 천원반올림)", shortLabel: "월÷30 천원" },
];

export function parseNumericInput(val?: number | string | null): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-") return 0;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

/**
 * 월단가 기준 자동 일단가 계산 (월단가 ÷ 30, 1,000원 단위 반올림)
 */
export function calculateAutoDailyRentalFee(
  monthlyRentalFee?: number | string | null
): number {
  const m = parseNumericInput(monthlyRentalFee);
  if (m <= 0) return 0;
  return Math.round(m / 30 / 1000) * 1000;
}

/**
 * 과거 레거시(1원 / 100원 단위 나눗셈) 자동 계산 잔재 여부 판별
 */
export function isLegacyAutoDividedDailyFee(
  monthlyRentalFee?: number | string | null,
  dailyRentalFee?: number | string | null
): boolean {
  const m = parseNumericInput(monthlyRentalFee);
  const d = Math.round(parseNumericInput(dailyRentalFee));
  if (m <= 0 || d <= 0 || d % 1000 === 0) return false;

  const legacyRound = Math.round(m / 30);
  const legacyFloor = Math.floor(m / 30);
  const legacyCeil = Math.ceil(m / 30);
  const legacyRound100 = Math.round(m / 30 / 100) * 100;
  const legacyCeil100 = Math.ceil(m / 30 / 100) * 100;

  return (
    d === legacyRound ||
    d === legacyFloor ||
    d === legacyCeil ||
    d === legacyRound100 ||
    d === legacyCeil100
  );
}

/**
 * 의도적 일단가 입력 여부에 따라 최종 일단가 확정
 * - explicitDailyRentalFee > 0 이고 레거시 자동 나눗셈 잔재가 아니면 의도적 입력값 그대로 반환
 * - 미입력(0/공란/null/undefined)이거나 레거시 나눗셈 잔재면 월단가 ÷ 30의 1,000원 단위 반올림 반환
 */
export function resolveDailyRentalFee(
  monthlyRentalFee?: number | string | null,
  explicitDailyRentalFee?: number | string | null
): number {
  const m = parseNumericInput(monthlyRentalFee);
  if (
    explicitDailyRentalFee !== undefined &&
    explicitDailyRentalFee !== null &&
    String(explicitDailyRentalFee).trim() !== ""
  ) {
    const d = Math.round(parseNumericInput(explicitDailyRentalFee));
    if (d > 0) {
      if (isLegacyAutoDividedDailyFee(m, d)) {
        return calculateAutoDailyRentalFee(m);
      }
      return d;
    }
  }
  return calculateAutoDailyRentalFee(m);
}

export function normalizeRentalRateBasis(
  basis?: string | null
): RentalRateBasis | null {
  const upper = String(basis || "").trim().toUpperCase();
  if (upper === "MONTHLY" || upper === "DAILY_MANUAL" || upper === "DAILY_AUTO") {
    return upper as RentalRateBasis;
  }
  return null;
}

/**
 * 저장된 과금 기준 및 월단가/일단가 수치로부터 유효한 과금 기준 추론
 */
export function inferRentalRateBasis(
  monthlyRentalFee?: number | string | null,
  explicitDailyRentalFee?: number | string | null,
  storedBasis?: string | null
): RentalRateBasis {
  const normalized = normalizeRentalRateBasis(storedBasis);
  if (normalized) return normalized;

  const m = parseNumericInput(monthlyRentalFee);
  const d = Math.round(parseNumericInput(explicitDailyRentalFee));
  const autoD = calculateAutoDailyRentalFee(m);

  if (d > 0 && d !== autoD && !isLegacyAutoDividedDailyFee(m, d)) {
    return "DAILY_MANUAL";
  }
  return "MONTHLY";
}

export function getRentalRateBasisLabel(basis?: string | null): string {
  const normalized = normalizeRentalRateBasis(basis) || "MONTHLY";
  return (
    RENTAL_RATE_BASIS_OPTIONS.find((o) => o.value === normalized)?.label || "월단가"
  );
}

export function getRentalRateBasisShortLabel(basis?: string | null): string {
  const normalized = normalizeRentalRateBasis(basis) || "MONTHLY";
  return (
    RENTAL_RATE_BASIS_OPTIONS.find((o) => o.value === normalized)?.shortLabel ||
    "월단가"
  );
}

/**
 * 과금 기준(MONTHLY / DAILY_MANUAL / DAILY_AUTO) 및 가동일수 기반 공급가액 산출
 */
export function computeRentalSupplyByBasis(params: {
  monthlyRate: number | string | null | undefined;
  dailyRate?: number | string | null | undefined;
  rateBasis?: RentalRateBasis | string | null | undefined;
  operatingDays: number;
  useProRata?: boolean;
}): {
  monthlyRate: number;
  effectiveDailyRate: number;
  supplyAmount: number;
  rateBasis: RentalRateBasis;
} {
  const m = Math.round(parseNumericInput(params.monthlyRate));
  const d = Math.round(parseNumericInput(params.dailyRate));
  const basis = inferRentalRateBasis(m, d, params.rateBasis);
  const autoDaily = calculateAutoDailyRentalFee(m);
  const effectiveDailyRate =
    basis === "DAILY_AUTO" ? autoDaily : resolveDailyRentalFee(m, d);

  const days = Math.max(0, Math.round(Number(params.operatingDays) || 0));
  const applyDaily =
    basis === "DAILY_MANUAL" || basis === "DAILY_AUTO" || Boolean(params.useProRata);

  const supplyAmount = applyDaily ? Math.round(effectiveDailyRate * days) : m;

  return {
    monthlyRate: m,
    effectiveDailyRate,
    supplyAmount,
    rateBasis: basis,
  };
}
