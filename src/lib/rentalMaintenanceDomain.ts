import { getKstTodayIso } from "./forkliftDomain";

export type MaintenanceType = "PREVENTIVE" | "CORRECTIVE" | "EMERGENCY" | "OVERHAUL";
export type MaintenanceResultStatus = "COMPLETED" | "FOLLOW_UP_REQUIRED";
export type PmChecklistStatus = "PASS" | "WARN" | "FAIL";
export type PartStockSource = "YARD" | "VEHICLE";
export type PartTransferType = "LOAD_TO_VEHICLE" | "RETURN_TO_YARD" | "VEHICLE_TRANSFER";
export type PmDueStatus = "OVERDUE" | "DUE_SOON" | "ON_TRACK" | "STANDBY";
export type WearSeverityStatus = "NORMAL" | "WARNING" | "CRITICAL";

export interface PmChecklistItem {
  itemCode: string;
  itemLabel: string;
  status: PmChecklistStatus;
  note: string;
}

export interface WearComponentDefinition {
  componentCode: string;
  componentName: string;
  defaultIntervalHours: number;
  recommendedPartKeywords: string[];
}

export interface AssetWearConfigItem {
  componentCode: string;
  componentName: string;
  intervalHours: number;
  lastReplacedHours: number;
  lastReplacedDate: string | null;
  memo?: string | null;
}

export interface AssetWearComputedItem extends AssetWearConfigItem {
  elapsedHours: number;
  wearPercent: number;
  remainingHours: number;
  severity: WearSeverityStatus;
}

export interface AssetWearSummary {
  items: AssetWearComputedItem[];
  maxWearPercent: number;
  warningCount: number;
  criticalCount: number;
  overallSeverity: WearSeverityStatus;
}

export interface MaintenancePartLineInput {
  productId: number;
  qty: number;
  sourceType: PartStockSource;
  vehicleId?: number | null;
  unitCost?: number | null;
  note?: string | null;
}

export interface MaintenancePartLineRecord {
  id?: number;
  maintenanceId?: number;
  productId: number;
  skuCode: string;
  productName: string;
  partNo?: string | null;
  unit?: string | null;
  qty: number;
  unitCost: number;
  totalCost: number;
  sourceType: PartStockSource;
  vehicleId: number | null;
  vehicleNo?: string | null;
  note?: string | null;
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  PREVENTIVE: "정기 사전점검",
  CORRECTIVE: "일반 수리",
  EMERGENCY: "긴급 출동정비",
  OVERHAUL: "중정비·오버홀",
};

export const MAINTENANCE_RESULT_LABELS: Record<MaintenanceResultStatus, string> = {
  COMPLETED: "완료",
  FOLLOW_UP_REQUIRED: "추가조치 필요",
};

export const PM_DUE_STATUS_LABELS: Record<PmDueStatus, string> = {
  OVERDUE: "기한 초과",
  DUE_SOON: "점검 도래",
  ON_TRACK: "정상",
  STANDBY: "대기",
};

export const WEAR_SEVERITY_LABELS: Record<WearSeverityStatus, string> = {
  NORMAL: "정상",
  WARNING: "교체 예고",
  CRITICAL: "교체 임계",
};

export const PART_TRANSFER_TYPE_LABELS: Record<PartTransferType, string> = {
  LOAD_TO_VEHICLE: "주기장 → 차량 적재",
  RETURN_TO_YARD: "차량 → 주기장 반납",
  VEHICLE_TRANSFER: "차량 → 차량 이동",
};

export const DEFAULT_PM_INTERVAL_DAYS = 30;
export const PM_DUE_SOON_DAYS = 7;

export const DEFAULT_PM_CHECKLIST_TEMPLATES: ReadonlyArray<{
  itemCode: string;
  itemLabel: string;
}> = [
  { itemCode: "MAST_CHAIN", itemLabel: "마스트·체인·리프트 실린더" },
  { itemCode: "HYDRAULIC_OIL", itemLabel: "유압유·호스 누유" },
  { itemCode: "POWER_FLUID_BATTERY", itemLabel: "동력계·오일·배터리" },
  { itemCode: "BRAKE_PARKING", itemLabel: "주행브레이크·주차브레이크" },
  { itemCode: "STEERING_AXLE", itemLabel: "조향장치·리어액슬" },
  { itemCode: "TIRE_WHEEL", itemLabel: "타이어 마모·휠볼트" },
  { itemCode: "SAFETY_LIGHT_HORN", itemLabel: "경광등·전조등·경음기·안전장치" },
];

export const DEFAULT_WEAR_COMPONENTS: ReadonlyArray<WearComponentDefinition> = [
  {
    componentCode: "ENGINE_OIL_FILTER",
    componentName: "엔진오일·필터",
    defaultIntervalHours: 250,
    recommendedPartKeywords: ["엔진오일", "오일필터"],
  },
  {
    componentCode: "HYDRAULIC_OIL_FILTER",
    componentName: "유압유·리턴필터",
    defaultIntervalHours: 1000,
    recommendedPartKeywords: ["유압유", "유압필터", "리턴필터"],
  },
  {
    componentCode: "TRANSMISSION_OIL",
    componentName: "미션·액슬 오일",
    defaultIntervalHours: 1000,
    recommendedPartKeywords: ["미션오일", "액슬오일", "기어오일"],
  },
  {
    componentCode: "AIR_ELEMENT",
    componentName: "에어클리너 엘리먼트",
    defaultIntervalHours: 500,
    recommendedPartKeywords: ["에어클리너", "엘리먼트"],
  },
  {
    componentCode: "BRAKE_LINING",
    componentName: "브레이크 라이닝·패드",
    defaultIntervalHours: 1500,
    recommendedPartKeywords: ["브레이크", "라이닝", "패드"],
  },
  {
    componentCode: "MAST_ROLLER_TIRE",
    componentName: "타이어·마스트 롤러",
    defaultIntervalHours: 2000,
    recommendedPartKeywords: ["타이어", "마스트", "롤러"],
  },
];

export function createDefaultPmChecklist(): PmChecklistItem[] {
  return DEFAULT_PM_CHECKLIST_TEMPLATES.map((item) => ({
    itemCode: item.itemCode,
    itemLabel: item.itemLabel,
    status: "PASS",
    note: "",
  }));
}

export function normalizePmChecklist(raw: unknown): PmChecklistItem[] {
  if (!Array.isArray(raw)) {
    return createDefaultPmChecklist();
  }
  const byCode = new Map<string, PmChecklistItem>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const obj = row as Record<string, unknown>;
    const itemCode = String(obj.itemCode || obj.code || "").trim();
    if (!itemCode) continue;
    const rawStatus = String(obj.status || "PASS").trim().toUpperCase();
    const status: PmChecklistStatus =
      rawStatus === "FAIL" ? "FAIL" : rawStatus === "WARN" ? "WARN" : "PASS";
    byCode.set(itemCode, {
      itemCode,
      itemLabel: String(obj.itemLabel || obj.label || itemCode).trim(),
      status,
      note: String(obj.note || "").trim(),
    });
  }
  if (byCode.size === 0) {
    return createDefaultPmChecklist();
  }
  const merged: PmChecklistItem[] = [];
  for (const tpl of DEFAULT_PM_CHECKLIST_TEMPLATES) {
    const found = byCode.get(tpl.itemCode);
    if (found) {
      merged.push({
        itemCode: tpl.itemCode,
        itemLabel: found.itemLabel || tpl.itemLabel,
        status: found.status,
        note: found.note,
      });
      byCode.delete(tpl.itemCode);
    } else {
      merged.push({
        itemCode: tpl.itemCode,
        itemLabel: tpl.itemLabel,
        status: "PASS",
        note: "",
      });
    }
  }
  for (const extra of byCode.values()) {
    merged.push(extra);
  }
  return merged;
}

export function clampPmIntervalDays(value: unknown, fallback = DEFAULT_PM_INTERVAL_DAYS): number {
  const num = Math.round(Number(value));
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.max(7, Math.min(365, num));
}

export function normalizeIsoDate(value: unknown): string | null {
  const str = String(value || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : null;
}

export function addDaysIso(dateStr: string, days: number): string {
  const clean = normalizeIsoDate(dateStr);
  if (!clean) return "";
  const [y, m, d] = clean.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Math.trunc(Number(days) || 0));
  return dt.toISOString().slice(0, 10);
}

export function diffDaysIso(targetDateStr: string | null | undefined, baseDateStr?: string | null): number | null {
  const target = normalizeIsoDate(targetDateStr);
  const base = normalizeIsoDate(baseDateStr || getKstTodayIso());
  if (!target || !base) return null;
  const [ty, tm, td] = target.split("-").map(Number);
  const [by, bm, bd] = base.split("-").map(Number);
  const targetMs = Date.UTC(ty, tm - 1, td);
  const baseMs = Date.UTC(by, bm - 1, bd);
  return Math.round((targetMs - baseMs) / 86_400_000);
}

export function computePreventivePmSchedule(params: {
  assetStatus?: string | null;
  pmIntervalDays?: number | null;
  lastPmDate?: string | null;
  nextPmDueDate?: string | null;
  outboundDate?: string | null;
  today?: string | null;
}): {
  pmIntervalDays: number;
  lastPmDate: string | null;
  nextPmDueDate: string | null;
  daysUntilDue: number | null;
  pmStatus: PmDueStatus;
} {
  const today = normalizeIsoDate(params.today || getKstTodayIso()) || getKstTodayIso();
  const interval = clampPmIntervalDays(params.pmIntervalDays, DEFAULT_PM_INTERVAL_DAYS);
  const lastPmDate = normalizeIsoDate(params.lastPmDate);
  const outboundDate = normalizeIsoDate(params.outboundDate);
  let nextPmDueDate = normalizeIsoDate(params.nextPmDueDate);

  if (!nextPmDueDate) {
    if (lastPmDate) {
      nextPmDueDate = addDaysIso(lastPmDate, interval);
    } else if (outboundDate) {
      nextPmDueDate = addDaysIso(outboundDate, interval);
    }
  }

  const normalizedAssetStatus = String(params.assetStatus || "").trim().toUpperCase();
  if (!nextPmDueDate) {
    if (normalizedAssetStatus === "RENTED") {
      nextPmDueDate = addDaysIso(today, interval);
    } else {
      return {
        pmIntervalDays: interval,
        lastPmDate,
        nextPmDueDate: null,
        daysUntilDue: null,
        pmStatus: "STANDBY",
      };
    }
  }

  const daysUntilDue = diffDaysIso(nextPmDueDate, today);
  if (daysUntilDue === null) {
    return {
      pmIntervalDays: interval,
      lastPmDate,
      nextPmDueDate,
      daysUntilDue: null,
      pmStatus: "STANDBY",
    };
  }
  if (daysUntilDue < 0) {
    return {
      pmIntervalDays: interval,
      lastPmDate,
      nextPmDueDate,
      daysUntilDue,
      pmStatus: "OVERDUE",
    };
  }
  if (daysUntilDue <= PM_DUE_SOON_DAYS) {
    return {
      pmIntervalDays: interval,
      lastPmDate,
      nextPmDueDate,
      daysUntilDue,
      pmStatus: "DUE_SOON",
    };
  }
  return {
    pmIntervalDays: interval,
    lastPmDate,
    nextPmDueDate,
    daysUntilDue,
    pmStatus: "ON_TRACK",
  };
}

export function computeComponentWearStatus(params: {
  componentCode: string;
  componentName: string;
  currentHours: number;
  lastReplacedHours: number;
  intervalHours: number;
  lastReplacedDate?: string | null;
  memo?: string | null;
}): AssetWearComputedItem {
  const safeCurrent = Math.max(0, Number(params.currentHours) || 0);
  const safeLast = Math.max(0, Number(params.lastReplacedHours) || 0);
  const safeInterval = Math.max(1, Number(params.intervalHours) || 1);
  const elapsedHours = Math.max(0, Math.round((safeCurrent - safeLast) * 10) / 10);
  const wearPercent = Math.max(0, Math.round((elapsedHours / safeInterval) * 100));
  const remainingHours = Math.round((safeInterval - elapsedHours) * 10) / 10;

  let severity: WearSeverityStatus = "NORMAL";
  if (wearPercent >= 100) {
    severity = "CRITICAL";
  } else if (wearPercent >= 80) {
    severity = "WARNING";
  }

  return {
    componentCode: params.componentCode,
    componentName: params.componentName,
    intervalHours: safeInterval,
    lastReplacedHours: safeLast,
    lastReplacedDate: normalizeIsoDate(params.lastReplacedDate),
    memo: params.memo ?? null,
    elapsedHours,
    wearPercent,
    remainingHours,
    severity,
  };
}

export function buildAssetWearSummary(params: {
  currentHours: number;
  savedStates?: Partial<AssetWearConfigItem>[] | null;
}): AssetWearSummary {
  const byCode = new Map<string, Partial<AssetWearConfigItem>>();
  for (const row of params.savedStates || []) {
    if (!row || !row.componentCode) continue;
    byCode.set(String(row.componentCode), row);
  }

  const items: AssetWearComputedItem[] = [];
  for (const def of DEFAULT_WEAR_COMPONENTS) {
    const saved = byCode.get(def.componentCode);
    byCode.delete(def.componentCode);
    items.push(
      computeComponentWearStatus({
        componentCode: def.componentCode,
        componentName: saved?.componentName || def.componentName,
        currentHours: params.currentHours,
        lastReplacedHours: Number(saved?.lastReplacedHours ?? 0),
        intervalHours: Number(saved?.intervalHours ?? def.defaultIntervalHours),
        lastReplacedDate: saved?.lastReplacedDate ?? null,
        memo: saved?.memo ?? null,
      })
    );
  }

  for (const extra of byCode.values()) {
    if (!extra.componentCode) continue;
    items.push(
      computeComponentWearStatus({
        componentCode: extra.componentCode,
        componentName: extra.componentName || extra.componentCode,
        currentHours: params.currentHours,
        lastReplacedHours: Number(extra.lastReplacedHours ?? 0),
        intervalHours: Number(extra.intervalHours ?? 500),
        lastReplacedDate: extra.lastReplacedDate ?? null,
        memo: extra.memo ?? null,
      })
    );
  }

  let maxWearPercent = 0;
  let warningCount = 0;
  let criticalCount = 0;
  for (const item of items) {
    if (item.wearPercent > maxWearPercent) maxWearPercent = item.wearPercent;
    if (item.severity === "CRITICAL") criticalCount += 1;
    else if (item.severity === "WARNING") warningCount += 1;
  }

  const overallSeverity: WearSeverityStatus =
    criticalCount > 0 ? "CRITICAL" : warningCount > 0 ? "WARNING" : "NORMAL";

  return {
    items,
    maxWearPercent,
    warningCount,
    criticalCount,
    overallSeverity,
  };
}
