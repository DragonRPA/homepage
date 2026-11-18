export type ForkliftItemClass = "FORKLIFT" | "OPTION" | "PART" | "GENERAL";

export type ForkliftWarrantyStatus = "ACTIVE" | "EXPIRING" | "EXPIRED";

export const FORKLIFT_ITEM_CLASS_OPTIONS: ReadonlyArray<{
  value: ForkliftItemClass;
  label: string;
  shortLabel: string;
}> = [
  { value: "FORKLIFT", label: "지게차 완제품", shortLabel: "완제품" },
  { value: "OPTION", label: "지게차 옵션", shortLabel: "옵션" },
  { value: "PART", label: "부품·소모품", shortLabel: "부품" },
  { value: "GENERAL", label: "일반·IT장비", shortLabel: "일반" },
];

export const FORKLIFT_POWER_TYPES = [
  "전동(리튬)",
  "전동(납산)",
  "디젤",
  "LPG",
  "가솔린",
  "하이브리드",
] as const;

export const FORKLIFT_MAST_TYPES = [
  "2단(STD)",
  "2단(FFL)",
  "3단(TFV)",
  "3단(FFL)",
  "특수마스트",
] as const;

export const FORKLIFT_TIRE_TYPES = [
  "솔리드(통고무)",
  "에어(공기입)",
  "우레탄",
  "논마킹",
] as const;

export const FORKLIFT_OPTION_GROUPS = [
  "사이드쉬프트",
  "포지셔너",
  "어태치먼트",
  "캐빈·냉난방",
  "배터리·충전기",
  "안전장치",
  "기타",
] as const;

export const FORKLIFT_PART_GROUPS = [
  "타이어·휠",
  "배터리·전장",
  "유압·호스",
  "마스트·체인",
  "필터·오일류",
  "소모품",
  "기타",
] as const;

export interface ForkliftSpecData {
  // FORKLIFT (지게차 완제품)
  powerType?: string;
  ratedCapacityKg?: number | null;
  maxLiftHeightMm?: number | null;
  mastType?: string;
  forkLengthMm?: number | null;
  batteryVoltageV?: number | null;
  batteryCapacityAh?: number | null;
  tireType?: string;
  turningRadiusMm?: number | null;
  overallWeightKg?: number | null;

  // OPTION (지게차 옵션)
  optionGroup?: string;
  compatibleModels?: string;
  hydraulicChannels?: string;
  optionWeightKg?: number | null;
  installDurationMin?: number | null;

  // PART (부품·소모품)
  partGroup?: string;
  partNo?: string;
  replaceIntervalHours?: number | null;
  replaceIntervalMonths?: number | null;

  // 공통 비고
  notes?: string;
}

export interface AttachedForkliftOption {
  optionId?: number | null;
  source?: "TRADE" | "RENTAL" | "MANUAL";
  skuCode?: string;
  optionName: string;
  specSummary?: string;
  qty: number;
  unitPrice?: number;
  installFee?: number;
  monthlyAddonRate?: number;
  dailyAddonRate?: number;
  installedDate?: string;
  memo?: string;
}

export function normalizeItemClass(
  raw?: string | null,
  fallbackCategory?: string | null,
): ForkliftItemClass {
  const upper = String(raw || "").trim().toUpperCase();
  if (upper === "FORKLIFT" || upper === "OPTION" || upper === "PART" || upper === "GENERAL") {
    return upper;
  }

  const probe = `${String(raw || "")} ${String(fallbackCategory || "")}`.trim();
  if (!probe) return "GENERAL";

  if (/옵션|어태치|사이드쉬프트|포지셔너|안전장치|캐빈|블루스팟/.test(probe)) {
    return "OPTION";
  }
  if (/부품|소모품|타이어|필터|오일|호스|체인|정비품|부분품/.test(probe)) {
    return "PART";
  }
  if (/지게차|전동|리치|입승|좌승|디젤|카운터밸런스/.test(probe)) {
    return "FORKLIFT";
  }
  return "GENERAL";
}

export function getItemClassLabel(cls?: string | null): string {
  const normalized = normalizeItemClass(cls);
  const found = FORKLIFT_ITEM_CLASS_OPTIONS.find((item) => item.value === normalized);
  return found ? found.label : "일반·IT장비";
}

function fmtNum(val: unknown): string {
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toLocaleString("ko-KR");
}

export function parseForkliftSpecData(raw: unknown): ForkliftSpecData {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as ForkliftSpecData) : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") {
    return raw as ForkliftSpecData;
  }
  return {};
}

export function summarizeForkliftSpec(
  cls: ForkliftItemClass | string | null | undefined,
  rawSpecData?: ForkliftSpecData | unknown,
  fallbackSpec?: string | null,
): string {
  const itemClass = normalizeItemClass(cls);
  const s = parseForkliftSpecData(rawSpecData);
  const parts: string[] = [];

  if (itemClass === "FORKLIFT") {
    if (s.powerType) parts.push(String(s.powerType).trim());
    const cap = fmtNum(s.ratedCapacityKg);
    if (cap) parts.push(`${cap}kg`);
    const mastLift = [s.mastType ? String(s.mastType).trim() : "", fmtNum(s.maxLiftHeightMm) ? `${fmtNum(s.maxLiftHeightMm)}mm` : ""]
      .filter(Boolean)
      .join(" ");
    if (mastLift) parts.push(mastLift);
    const fork = fmtNum(s.forkLengthMm);
    if (fork) parts.push(`포크 ${fork}mm`);
    const v = fmtNum(s.batteryVoltageV);
    const ah = fmtNum(s.batteryCapacityAh);
    if (v || ah) {
      parts.push([v ? `${v}V` : "", ah ? `${ah}Ah` : ""].filter(Boolean).join(" "));
    }
    if (s.tireType) parts.push(String(s.tireType).trim());
    const turn = fmtNum(s.turningRadiusMm);
    if (turn) parts.push(`회전 ${turn}mm`);
    const wt = fmtNum(s.overallWeightKg);
    if (wt) parts.push(`자중 ${wt}kg`);
  } else if (itemClass === "OPTION") {
    if (s.optionGroup) parts.push(String(s.optionGroup).trim());
    if (s.compatibleModels) parts.push(`호환:${String(s.compatibleModels).trim()}`);
    if (s.hydraulicChannels) parts.push(String(s.hydraulicChannels).trim());
    const wt = fmtNum(s.optionWeightKg);
    if (wt) parts.push(`${wt}kg`);
    const mins = fmtNum(s.installDurationMin);
    if (mins) parts.push(`장착 ${mins}분`);
  } else if (itemClass === "PART") {
    if (s.partGroup) parts.push(String(s.partGroup).trim());
    if (s.partNo) parts.push(`품번:${String(s.partNo).trim()}`);
    if (s.compatibleModels) parts.push(`적용:${String(s.compatibleModels).trim()}`);
    const rh = fmtNum(s.replaceIntervalHours);
    const rm = fmtNum(s.replaceIntervalMonths);
    if (rh || rm) {
      parts.push(`주기 ${[rh ? `${rh}hr` : "", rm ? `${rm}개월` : ""].filter(Boolean).join("/")}`);
    }
  }

  if (s.notes && String(s.notes).trim()) {
    parts.push(String(s.notes).trim());
  }

  const built = parts.filter(Boolean).join(" / ");
  if (built) return built;
  return String(fallbackSpec || "").trim();
}

export function normalizeAttachedOptions(raw: unknown): AttachedForkliftOption[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      return [];
    }
  }
  return list
    .map((entry): AttachedForkliftOption | null => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const optionName = String(e.optionName || e.name || "").trim();
      if (!optionName) return null;
      const qtyNum = Number(e.qty);
      const qty = Number.isFinite(qtyNum) && qtyNum > 0 ? Math.floor(qtyNum) : 1;
      const sourceRaw = String(e.source || "").toUpperCase();
      const source: "TRADE" | "RENTAL" | "MANUAL" =
        sourceRaw === "TRADE" || sourceRaw === "RENTAL" ? sourceRaw : "MANUAL";
      return {
        optionId: e.optionId != null && Number.isFinite(Number(e.optionId)) ? Number(e.optionId) : null,
        source,
        skuCode: e.skuCode ? String(e.skuCode).trim() : "",
        optionName,
        specSummary: e.specSummary ? String(e.specSummary).trim() : "",
        qty,
        unitPrice: Math.max(0, Number(e.unitPrice) || 0),
        installFee: Math.max(0, Number(e.installFee) || 0),
        monthlyAddonRate: Math.max(0, Number(e.monthlyAddonRate) || 0),
        dailyAddonRate: Math.max(0, Number(e.dailyAddonRate) || 0),
        installedDate: e.installedDate ? String(e.installedDate).slice(0, 10) : undefined,
        memo: e.memo ? String(e.memo).trim() : "",
      };
    })
    .filter((x): x is AttachedForkliftOption => x !== null);
}

export function formatAttachedOptionsSummary(options?: AttachedForkliftOption[] | null): string {
  const list = normalizeAttachedOptions(options);
  if (list.length === 0) return "";
  return list.map((o) => `${o.optionName} x${o.qty}`).join(", ");
}

export function calculateAttachedOptionsTotals(options?: AttachedForkliftOption[] | null) {
  const list = normalizeAttachedOptions(options);
  let totalOptionPrice = 0;
  let totalInstallFee = 0;
  let totalMonthlyAddon = 0;
  let totalDailyAddon = 0;

  for (const o of list) {
    const qty = Math.max(1, Number(o.qty) || 1);
    totalOptionPrice += Math.round((Number(o.unitPrice) || 0) * qty);
    totalInstallFee += Math.round((Number(o.installFee) || 0) * qty);
    totalMonthlyAddon += Math.round((Number(o.monthlyAddonRate) || 0) * qty);
    totalDailyAddon += Math.round((Number(o.dailyAddonRate) || 0) * qty);
  }

  return {
    totalOptionPrice,
    totalInstallFee,
    totalSaleUnitAndInstall: totalOptionPrice + totalInstallFee,
    totalMonthlyAddon,
    totalDailyAddon,
  };
}

export function getKstTodayIso(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

export function addMonthsMinusOneDay(startDateStr: string, months: number): string {
  const clean = String(startDateStr || "").slice(0, 10);
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const safeMonths = Math.floor(Number(months) || 0);
  if (safeMonths <= 0) return clean;

  const totalMonths = (m - 1) + safeMonths;
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const maxDayInTarget = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const clampedDay = Math.min(d, maxDayInTarget);

  const endDt = new Date(Date.UTC(targetYear, targetMonth - 1, clampedDay));
  endDt.setUTCDate(endDt.getUTCDate() - 1);
  return endDt.toISOString().slice(0, 10);
}

export function computeWarrantyStatus(params: {
  warrantyEndDate?: string | null;
  warrantyHours?: number | null;
  currentOperatingHours?: number | null;
  today?: string | null;
}): {
  status: ForkliftWarrantyStatus;
  daysRemaining: number | null;
  hoursRemaining: number | null;
  triggerReason:
    | "DATE_EXPIRED"
    | "HOURS_EXPIRED"
    | "DATE_EXPIRING"
    | "HOURS_EXPIRING"
    | "WITHIN_WARRANTY";
} {
  const todayStr = String(params.today || getKstTodayIso()).slice(0, 10);
  let daysRemaining: number | null = null;
  const endStr = params.warrantyEndDate ? String(params.warrantyEndDate).slice(0, 10) : "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(endStr) && /^\d{4}-\d{2}-\d{2}$/.test(todayStr)) {
    const [ey, em, ed] = endStr.split("-").map(Number);
    const [ty, tm, td] = todayStr.split("-").map(Number);
    const endMs = Date.UTC(ey, em - 1, ed);
    const todayMs = Date.UTC(ty, tm - 1, td);
    daysRemaining = Math.round((endMs - todayMs) / 86_400_000);
  }

  const limitHours =
    params.warrantyHours != null && Number.isFinite(Number(params.warrantyHours)) && Number(params.warrantyHours) > 0
      ? Number(params.warrantyHours)
      : null;
  const currentHours = Math.max(0, Number(params.currentOperatingHours) || 0);
  const hoursRemaining = limitHours !== null ? Math.round((limitHours - currentHours) * 10) / 10 : null;

  if (daysRemaining !== null && daysRemaining < 0) {
    return { status: "EXPIRED", daysRemaining, hoursRemaining, triggerReason: "DATE_EXPIRED" };
  }
  if (hoursRemaining !== null && hoursRemaining <= 0) {
    return { status: "EXPIRED", daysRemaining, hoursRemaining, triggerReason: "HOURS_EXPIRED" };
  }
  if (daysRemaining !== null && daysRemaining <= 30) {
    return { status: "EXPIRING", daysRemaining, hoursRemaining, triggerReason: "DATE_EXPIRING" };
  }
  if (hoursRemaining !== null && hoursRemaining <= 200) {
    return { status: "EXPIRING", daysRemaining, hoursRemaining, triggerReason: "HOURS_EXPIRING" };
  }

  return { status: "ACTIVE", daysRemaining, hoursRemaining, triggerReason: "WITHIN_WARRANTY" };
}
