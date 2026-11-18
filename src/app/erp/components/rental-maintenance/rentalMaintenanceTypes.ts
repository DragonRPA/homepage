import {
  DEFAULT_PM_INTERVAL_DAYS,
  DEFAULT_WEAR_COMPONENTS,
  MAINTENANCE_RESULT_LABELS,
  MAINTENANCE_TYPE_LABELS,
  PART_TRANSFER_TYPE_LABELS,
  PM_DUE_STATUS_LABELS,
  WEAR_SEVERITY_LABELS,
  createDefaultPmChecklist,
  type AssetWearComputedItem,
  type AssetWearSummary,
  type MaintenancePartLineRecord,
  type MaintenanceResultStatus,
  type MaintenanceType,
  type PartStockSource,
  type PartTransferType,
  type PmChecklistItem,
  type PmChecklistStatus,
  type PmDueStatus,
  type WearSeverityStatus,
} from "@/lib/rentalMaintenanceDomain";

export type SubTabKey = "ACTIVITIES" | "PREVENTIVE_PM" | "HOURS_WEAR" | "VEHICLE_STOCK";

export interface CurrentUserInfo {
  name?: string;
  role?: string;
  username?: string;
}

export interface MaintenanceAssetOption {
  id: number;
  serialNo: string;
  modelName: string | null;
  category: string | null;
  brand: string | null;
  status: string;
  currentCustomer: string | null;
  currentSite: string | null;
  contractNo: string | null;
  outboundDate: string | null;
  operatingHours: number;
  pmIntervalDays: number;
  lastPmDate: string | null;
  lastPmHours: number;
  nextPmDueDate: string | null;
}

export interface EmployeeOption {
  id: number;
  employeeNo: string | null;
  name: string;
  position: string | null;
  department: string | null;
  phone: string | null;
}

export interface VehicleStockItem {
  id: number;
  productId: number;
  skuCode: string;
  productName: string;
  partNo: string | null;
  unit: string;
  currentQty: number;
  targetQty: number;
  standardCost: number;
}

export interface ServiceVehicleRecord {
  id: number;
  vehicleNo: string;
  vehicleName: string;
  driverEmployeeId: number | null;
  driverName: string | null;
  driverPhone: string | null;
  region: string | null;
  status: "ACTIVE" | "INACTIVE";
  memo: string | null;
  stocks: VehicleStockItem[];
}

export interface PartCatalogItem {
  id: number;
  skuCode: string;
  name: string;
  itemClass: string;
  category: string | null;
  partNo: string | null;
  spec: string | null;
  unit: string;
  standardCost: number;
  standardPrice: number;
  safetyStock: number;
  currentStock: number;
  vehicleTotalStock: number;
  totalFleetStock: number;
  manufacturer: string | null;
  status: string;
}

export interface MaintenanceRecord {
  id: number;
  maintenanceNo: string;
  assetId: number;
  serialNo: string | null;
  modelName: string | null;
  customerName: string | null;
  siteName: string | null;
  contractNo: string | null;
  maintenanceDate: string;
  maintenanceType: MaintenanceType;
  resultStatus: MaintenanceResultStatus;
  operatingHours: number;
  technicianEmployeeId: number | null;
  technicianName: string | null;
  vehicleId: number | null;
  vehicleNo: string | null;
  vehicleName: string | null;
  title: string;
  symptom: string | null;
  workPerformed: string | null;
  checklist: PmChecklistItem[];
  resetComponentCodes: string[];
  partsCost: number;
  laborCost: number;
  travelCost: number;
  totalCost: number;
  nextPmDueDate: string | null;
  assetStatusBefore: string | null;
  assetStatusAfter: string | null;
  parts: MaintenancePartLineRecord[];
}

export interface PmScheduleRow {
  assetId: number;
  serialNo: string;
  modelName: string | null;
  assetStatus: string;
  currentCustomer: string | null;
  currentSite: string | null;
  contractNo: string | null;
  outboundDate: string | null;
  operatingHours: number;
  lastPmHours: number;
  pmCount: number;
  pmIntervalDays: number;
  lastPmDate: string | null;
  nextPmDueDate: string | null;
  daysUntilDue: number | null;
  pmStatus: PmDueStatus;
}

export interface AssetWearRow {
  assetId: number;
  serialNo: string;
  modelName: string | null;
  status: string;
  currentCustomer: string | null;
  currentSite: string | null;
  contractNo: string | null;
  operatingHours: number;
  pmSchedule: {
    pmIntervalDays: number;
    lastPmDate: string | null;
    nextPmDueDate: string | null;
    daysUntilDue: number | null;
    pmStatus: PmDueStatus;
  };
  wearSummary: AssetWearSummary;
}

export interface HourLogRow {
  id: number;
  assetId: number;
  serialNo: string;
  modelName: string | null;
  recordedDate: string;
  previousHours: number;
  recordedHours: number;
  deltaHours: number;
  sourceType: string;
  recordedBy: string | null;
  note: string | null;
}

export interface PartMovementRow {
  id: number;
  movementType: string;
  movementDate: string;
  productId: number;
  skuCode: string;
  productName: string;
  partNo: string | null;
  unit: string;
  qty: number;
  fromLocationType: string;
  fromVehicleId: number | null;
  fromVehicleNo: string | null;
  toLocationType: string;
  toVehicleId: number | null;
  toVehicleNo: string | null;
  maintenanceNo: string | null;
  assetSerialNo: string | null;
  actorName: string | null;
  note: string | null;
}

export interface FleetStockSummaryRow {
  productId: number;
  skuCode: string;
  name: string;
  itemClass: string;
  category: string | null;
  partNo: string | null;
  unit: string;
  standardCost: number;
  safetyStock: number;
  yardQty: number;
  vehicleQtySum: number;
  totalFleetQty: number;
}

export interface PartDraftLine {
  key: string;
  productId: string;
  sourceType: PartStockSource;
  vehicleId: string;
  qty: string;
  unitCost: string;
  note: string;
}

export interface MaintenanceSummaryStats {
  totalMaintenances: number;
  preventiveCount: number;
  correctiveCount: number;
  partsCostSum: number;
  totalCostSum: number;
  pmOverdueCount: number;
  pmDueSoonCount: number;
  pmOnTrackCount: number;
}

export const ASSET_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "임대가능",
  RENTED: "대여중",
  REPAIRING: "수리중",
  DISPOSED: "폐기",
};

export const ASSET_STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  RENTED: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  REPAIRING: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  DISPOSED: "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export const PM_BADGE: Record<PmDueStatus, string> = {
  OVERDUE: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  DUE_SOON: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  ON_TRACK: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  STANDBY: "bg-[#e2dbcd] text-slate-700 border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export const WEAR_BADGE: Record<WearSeverityStatus, string> = {
  CRITICAL: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  WARNING: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  NORMAL: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  LOAD_TO_VEHICLE: "주기장 → 차량 적재",
  RETURN_TO_YARD: "차량 → 주기장 반납",
  VEHICLE_TRANSFER: "차량 → 차량 이동",
  MAINTENANCE_CONSUME: "정비 사용 소진",
  MAINTENANCE_REVERSAL: "정비 수정 환입",
  YARD_RECEIPT: "주기장 입고",
};

export function sanitizeDecimalText(val: string): string {
  const cleaned = val.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}
