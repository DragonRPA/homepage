import { AttachedForkliftOption } from "@/lib/erpFormat";

export type AssetSubTab = "SUMMARY" | "DETAIL" | "DEPRECIATION";
export type DepMatrixMode = "NET_PROFIT" | "REVENUE" | "DEPRECIATION";

export interface AssetRecord {
  id: number;
  assetNo: string;
  rentalProductId: number;
  modelCode: string;
  modelName: string;
  category: string;
  manufacturer: string;
  modelSpec: string;
  serialNo: string;
  ownerType: "OWNED" | "RENTED";
  status: "AVAILABLE" | "RENTED" | "OUTBOUND_PENDING" | "REPAIRING" | "DISPOSED";
  acquisitionDate: string;
  disposedDate?: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  usefulLifeMonths?: number;
  depreciationMethod: string;
  accumulatedDepreciation: number;
  bookValue: number;
  monthlyDepreciation: number;
  cumulativeRevenue?: number;
  cumulativeNetProfit?: number;
  operatingHours?: number;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  warrantyHours?: number;
  attachedOptions?: AttachedForkliftOption[];
  supplier: string | null;
  renter: string | null;
  currentCustomer: string | null;
  currentSite: string | null;
  contractNo: string | null;
  customSpec: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetLog {
  id: number;
  assetId: number;
  assetNo: string;
  eventType: string;
  eventDate: string;
  customerName: string | null;
  siteName: string | null;
  memo: string | null;
  createdAt: string;
}

export interface ModelSummaryRow {
  key: string;
  modelCode: string;
  modelName: string;
  totalQty: number;
  disposedQty: number;
  availableQty: number;
  rentedQty: number;
  grossAcquisitionCost: number;
  accumulatedCost: number;
  bookValue: number;
  cumulativeRevenue: number;
  cumulativeNetProfit: number;
  recoveryRatePct: number;
}

export interface ModelSummaryTotals {
  totalQty: number;
  disposedQty: number;
  availableQty: number;
  rentedQty: number;
  grossAcquisitionCost: number;
  accumulatedCost: number;
  bookValue: number;
  cumulativeRevenue: number;
  cumulativeNetProfit: number;
  recoveryRatePct: number;
}

export interface AssetKpiStats {
  totalCount: number;
  ownedCount: number;
  rentedCount: number;
  rentedOpCount: number;
  availableCount: number;
  repairingCount: number;
  totalBookValue: number;
  totalCumulativeRevenue: number;
  totalCumulativeNetProfit: number;
}

export interface NewAssetFormState {
  assetNo: string;
  qty: string;
  rentalProductId: string;
  serialNo: string;
  ownerType: string;
  acquisitionDate: string;
  acquisitionCost: string;
  salvageValue: string;
  usefulLifeYears: string;
  usefulLifeMonths: string;
  operatingHours: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  warrantyHours: string;
  attachedOptions: AttachedForkliftOption[];
  supplier: string;
  renter: string;
  currentCustomer: string;
  currentSite: string;
  contractNo: string;
  customSpec: string;
  memo: string;
}

export interface AssetManagementTabProps {
  currentUser: any;
  defaultFilterModel?: string;
}

// 자산 취득 시 자동채번 헬퍼: "DR" + yymm + 3-digit 순번 (예: DR2610001)
export function computeNextAssetNo(dateStr: string, assetList: AssetRecord[]): string {
  const cleanDate = (dateStr || new Date().toISOString().split("T")[0]).replace(/-/g, "");
  const yymm =
    cleanDate.length >= 6
      ? cleanDate.slice(2, 6)
      : new Date().toISOString().slice(2, 7).replace("-", "");
  const prefix = `DR${yymm}`;
  let maxSeq = 0;
  for (const a of assetList) {
    const no = String(a.assetNo || "").toUpperCase();
    if (no.startsWith(prefix)) {
      const suffix = no.slice(prefix.length).replace(/[^0-9]/g, "");
      const n = parseInt(suffix, 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

export function getAssetNoRangePreview(
  startNo: string,
  qtyStr: string,
  dateStr: string,
  assetList: AssetRecord[]
): string {
  const count = Math.max(1, parseInt(qtyStr || "1", 10) || 1);
  const baseNo = (startNo || "").trim() || computeNextAssetNo(dateStr, assetList);
  if (count === 1) return baseNo;
  const cleanDate = (dateStr || new Date().toISOString().split("T")[0]).replace(/-/g, "");
  const yymm =
    cleanDate.length >= 6
      ? cleanDate.slice(2, 6)
      : new Date().toISOString().slice(2, 7).replace("-", "");
  const prefix = `DR${yymm}`;
  const startSeq = parseInt(baseNo.slice(prefix.length).replace(/[^0-9]/g, ""), 10) || 1;
  const endNo = `${prefix}${String(startSeq + count - 1).padStart(3, "0")}`;
  return `${baseNo} ~ ${endNo} (총 ${count}대)`;
}

export function exportAssetsCsv(assets: AssetRecord[]): boolean {
  if (assets.length === 0) {
    return false;
  }

  const headers = [
    "자산번호",
    "모델명",
    "모델코드",
    "제조사",
    "카테고리",
    "시리얼번호",
    "소유구분",
    "자산상태",
    "취득일자",
    "취득원가(원)",
    "잔존가치(원)",
    "내용연수(년)",
    "감가상각누계(원)",
    "현재장부가액(원)",
    "월감가상각비(원)",
    "누적렌탈매출(원)",
    "누적순수익(원)",
    "현재대여처",
    "배치현장",
    "계약번호",
    "특이사항",
  ];

  const rows = assets.map((a) => [
    a.assetNo,
    a.modelName,
    a.modelCode,
    a.manufacturer,
    a.category,
    a.serialNo || "-",
    a.ownerType === "OWNED" ? "자사자산" : "외부임차",
    a.status,
    a.acquisitionDate ? String(a.acquisitionDate).slice(0, 10) : "-",
    a.acquisitionCost,
    a.salvageValue,
    a.usefulLifeYears,
    a.accumulatedDepreciation,
    a.bookValue,
    a.monthlyDepreciation,
    a.cumulativeRevenue || 0,
    a.cumulativeNetProfit || 0,
    a.currentCustomer || "-",
    a.currentSite || "-",
    a.contractNo || "-",
    a.memo || "-",
  ]);

  const csvContent =
    "\uFEFF" +
    [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `자산종합대장_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
