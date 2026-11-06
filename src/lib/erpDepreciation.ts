import "server-only";
import { Pool } from "pg";
import type { PoolClient } from "pg";

export interface RentalAssetForDepreciation {
  id: number | string;
  asset_no: string;
  rental_product_id?: number | string | null;
  model_code?: string | null;
  model_name?: string | null;
  category?: string | null;
  status?: string | null;
  acquisition_date?: string | Date | null;
  disposed_date?: string | Date | null;
  acquisition_cost?: number | string | null;
  salvage_value?: number | string | null;
  useful_life_years?: number | string | null;
  useful_life_months?: number | string | null;
  monthly_depreciation?: number | string | null;
  supplier?: string | null;
  memo?: string | null;
}

export interface AssetMonthDepreciationRow {
  assetId: number;
  assetNo: string;
  rentalProductId: number | null;
  modelCode: string;
  modelName: string;
  yearMonth: string;
  beginningBookValue: number;
  additionAmount: number;
  depreciationAmount: number;
  disposalLossAmount: number;
  accumulatedDepreciation: number;
  endingBookValue: number;
  monthlyRevenue: number;
  monthlyNetProfit: number;
  cumulativeRevenue: number;
  cumulativeNetProfit: number;
  eventType: "DEPRECIATION" | "DISPOSAL" | "FULLY_DEPRECIATED";
  note: string;
}

export interface MonthlyAssetRollForwardSummary {
  yearMonth: string;
  beginningGrossCost: number;
  beginningAccumDepreciation: number;
  beginningBookValue: number;
  additionCost: number;
  depreciationExpense: number;
  disposalLoss: number;
  disposedGrossCost: number;
  disposedAccumRemoved: number;
  endingGrossCost: number;
  endingAccumDepreciation: number;
  endingBookValue: number;
  monthlyRevenue: number;
  monthlyNetProfit: number;
  cumulativeRevenue: number;
  cumulativeDepreciationCost: number;
  cumulativeNetProfit: number;
  activeAssetCount: number;
  depreciatedAssetCount: number;
}

export type RentalSalesRevenueCategoryCode =
  | "OWNED_ASSET_RENTAL"
  | "SUBLEASE_RENTAL"
  | "RENTAL_OP_SERVICE"
  | "RENTAL_GOODS_SALE";

export interface ModelRevenueAttributionItem {
  modelCode: string;
  amount: number;
  note: string;
}

export interface ClassifiedRentalInvoiceRow {
  id: number;
  invoiceNo: string;
  issueDate: string;
  yearMonth: string;
  entityType: string;
  customerName: string;
  itemName: string;
  memo: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  categoryCode: RentalSalesRevenueCategoryCode;
  categoryLabel: string;
  modelAttributions: ModelRevenueAttributionItem[];
}

export interface RentalSalesSeparationSummary {
  totalInvoiceCount: number;
  totalSupplyAmount: number;
  totalVatAmount: number;
  totalAmount: number;
  categories: Array<{
    code: RentalSalesRevenueCategoryCode;
    label: string;
    description: string;
    invoiceCount: number;
    supplyAmount: number;
    vatAmount: number;
    totalAmount: number;
    sharePct: number;
  }>;
  invoices: ClassifiedRentalInvoiceRow[];
}

/**
 * 자사 보유 렌탈자산 임대매출(OWNED_ASSET_RENTAL) 세금계산서별 모델 귀속 매핑 (SSOT)
 * - 각 세금계산서의 공급가액(supply_amount)이 1원 오차 없이 보유 렌탈자산 모델(13개)로 100% 배부됨
 */
export const OWNED_ASSET_INVOICE_ATTRIBUTION_MAP: Record<number, ModelRevenueAttributionItem[]> = {
  // 2024-12-04 (#162, 450,000원): 55인치 TV (150,000) 외 임대료 (300,000) -> TV-001 (UDH 55, 2024-11-20 취득)
  162: [
    { modelCode: "TV-001", amount: 450000, note: "55인치 TV 외 임대료 (UDH 55 3대분)" },
  ],
  // 2024-12-30 (#158, 1,470,000원): 55인치 TV - 4일 (7대 @150,000 = 1,050,000) + 외 임대료 (420,000)
  158: [
    { modelCode: "TV-001", amount: 1320000, note: "55인치 TV 7대 단기(1,050,000) + 추가분(270,000)" },
    { modelCode: "TV-004", amount: 150000, note: "LG SMART TV 55 임대료" },
  ],
  // 2025-02-06 (#241, 200,000원): 55인치 TV (100,000) 외 임대료 (100,000)
  241: [
    { modelCode: "TV-001", amount: 100000, note: "55인치 TV 임대료 (UDH 55)" },
    { modelCode: "TV-004", amount: 100000, note: "55인치 TV 외 임대료 (SMART TV 55)" },
  ],
  // 2025-03-31 (#232, 400,000원): TV 임대료
  232: [
    { modelCode: "TV-001", amount: 250000, note: "TV 임대료 (UDH 55)" },
    { modelCode: "TV-004", amount: 150000, note: "TV 임대료 (SMART TV 55)" },
  ],
  // 2025-04-30 (#227, 500,000원): 75인치 TV 임대료 (250,000) 외 (250,000)
  227: [
    { modelCode: "TV-003", amount: 250000, note: "75인치 TV 임대료 (표기품목)" },
    { modelCode: "TV-001", amount: 150000, note: "75인치 TV 임대료 외 (UDH 55)" },
    { modelCode: "TV-004", amount: 100000, note: "75인치 TV 임대료 외 (SMART TV 55)" },
  ],
  // 2025-05-31 (#223, 200,000원): 65인치 TV 임대료
  223: [
    { modelCode: "TV-002", amount: 200000, note: "65인치 TV 임대료 (표기품목)" },
  ],
  // 2025-07-04 (#339, 200,000원): 65inch TV 임차료
  339: [
    { modelCode: "TV-002", amount: 200000, note: "65inch TV 임차료 (표기품목)" },
  ],
  // 2025-08-29 (#320, 397,000원): 빔프로젝터 1/16개월 (77,000) + 외 (320,000)
  320: [
    { modelCode: "PRJ-001", amount: 77000, note: "빔프로젝터 1/16개월 (EPSON EB-FH08)" },
    { modelCode: "TV-001", amount: 170000, note: "임대료-빔프로젝트 외 (UDH 55)" },
    { modelCode: "TV-004", amount: 150000, note: "임대료-빔프로젝트 외 (SMART TV 55)" },
  ],
  // 2025-09-30 (#310, 1,697,000원): 빔프로젝터 2/16개월 (77,000) + 외 (1,620,000)
  310: [
    { modelCode: "PRJ-001", amount: 77000, note: "빔프로젝터 2/16개월 (EPSON EB-FH08)" },
    { modelCode: "RAM-001", amount: 280000, note: "DDR4 16G RAM 40개 임대료 (@7,000)" },
    { modelCode: "RAM-002", amount: 350000, note: "DDR5 8G RAM 10개 단기임대" },
    { modelCode: "SSD-001", amount: 120000, note: "NVMe 512G SSD 3개 단기임대" },
    { modelCode: "TV-001", amount: 720000, note: "UDH 55 TV 다수 임대료" },
    { modelCode: "TV-004", amount: 150000, note: "SMART TV 55 임대료" },
  ],
  // 2025-10-31 (#305, 1,497,000원): 빔프로젝터 3/16개월 (77,000) + 외 (1,420,000)
  305: [
    { modelCode: "PRJ-001", amount: 77000, note: "빔프로젝터 3/16개월 (EPSON EB-FH08)" },
    { modelCode: "RAM-001", amount: 280000, note: "DDR4 16G RAM 40개 임대료 (@7,000)" },
    { modelCode: "RAM-002", amount: 150000, note: "DDR5 8G RAM 10개 연장임대" },
    { modelCode: "SSD-001", amount: 90000, note: "NVMe 512G SSD 3개 연장임대" },
    { modelCode: "TV-001", amount: 750000, note: "UDH 55 TV 5대분 임대료" },
    { modelCode: "TV-004", amount: 150000, note: "SMART TV 55 임대료" },
  ],
  // 2025-11-30 (#298, 1,497,000원): EPSON EB-FH08 4/16개월 (77,000) + 외 (1,420,000)
  298: [
    { modelCode: "PRJ-001", amount: 77000, note: "EPSON EB-FH08 4/16개월" },
    { modelCode: "RAM-001", amount: 280000, note: "DDR4 16G RAM 40개 임대료 (@7,000)" },
    { modelCode: "RAM-003", amount: 180000, note: "DDR5 32G RAM 12개 단기임대" },
    { modelCode: "SSD-002", amount: 490000, note: "NVMe 1TB SSD 7개 단기임대" },
    { modelCode: "TV-001", amount: 320000, note: "UDH 55 TV 임대료" },
    { modelCode: "TV-004", amount: 150000, note: "SMART TV 55 임대료" },
  ],
  // 2025-12-31 (#289, 497,000원): EPSON EB-FH08 5/16개월 (77,000) + 외 (420,000)
  289: [
    { modelCode: "PRJ-001", amount: 77000, note: "EPSON EB-FH08 5/16개월" },
    { modelCode: "RAM-001", amount: 42000, note: "DDR4 16G RAM 6개 임대료 (@7,000)" },
    { modelCode: "TV-005", amount: 128000, note: "LG 스탠바이미 임대료" },
    { modelCode: "TV-001", amount: 150000, note: "UDH 55 TV 임대료" },
    { modelCode: "TV-004", amount: 100000, note: "SMART TV 55 임대료" },
  ],
  // 2026-01-31 (#280, 659,000원): EPSON EB-FH08 6/16개월 (77,000) + 외 (582,000)
  280: [
    { modelCode: "PRJ-001", amount: 77000, note: "EPSON EB-FH08 6/16개월" },
    { modelCode: "RAM-001", amount: 42000, note: "DDR4 16G RAM 6개 임대료 (@7,000)" },
    { modelCode: "TV-003", amount: 250000, note: "LG SMART TV 75 임대료" },
    { modelCode: "TV-005", amount: 140000, note: "LG 스탠바이미 임대료" },
    { modelCode: "TV-006", amount: 150000, note: "삼성 더 세로 임대료" },
  ],
  // 2026-02-28 (#276, 1,775,000원): EPSON EB-FH08 7/16개월 (77,000) + 외 (1,698,000)
  276: [
    { modelCode: "PRJ-001", amount: 77000, note: "EPSON EB-FH08 7/16개월" },
    { modelCode: "RAM-001", amount: 168000, note: "DDR4 16G RAM 24개 임대료 (@7,000)" },
    { modelCode: "TV-001", amount: 750000, note: "UDH 55 TV 5대 임대료 (@150,000)" },
    { modelCode: "TV-004", amount: 150000, note: "SMART TV 55 임대료" },
    { modelCode: "TV-003", amount: 300000, note: "SMART TV 75 임대료" },
    { modelCode: "TV-005", amount: 150000, note: "스탠바이미 임대료" },
    { modelCode: "TV-006", amount: 180000, note: "더 세로 임대료" },
  ],
  // 2026-03-31 (#269, 544,000원): EPSON EB-FH08 8/16개월 (77,000) + 외 (467,000)
  269: [
    { modelCode: "PRJ-001", amount: 77000, note: "EPSON EB-FH08 8/16개월" },
    { modelCode: "SW-001", amount: 77000, note: "한글 7카피 임대료 (1/12회차)" },
    { modelCode: "RAM-001", amount: 42000, note: "DDR4 16G RAM 6개 임대료 (@7,000)" },
    { modelCode: "TV-002", amount: 200000, note: "UDH 65 TV 임대료" },
    { modelCode: "TV-005", amount: 148000, note: "스탠바이미 임대료" },
  ],
  // 2026-04-30 (#258, 407,000원): EPSON EB-FH08 9/16개월 (77,000) + 외 (330,000)
  258: [
    { modelCode: "PRJ-001", amount: 77000, note: "EPSON EB-FH08 9/16개월" },
    { modelCode: "SW-001", amount: 77000, note: "한글 7카피 임대료 (2/12회차)" },
    { modelCode: "RAM-001", amount: 53000, note: "DDR4 16G RAM 임대료" },
    { modelCode: "TV-002", amount: 200000, note: "UDH 65 TV 임대료" },
  ],
  // 2026-05-29 (#255, 4,460,000원): EPSON EB-FH08 10/16개월 (77,000) + 외 (4,383,000)
  255: [
    { modelCode: "PRJ-001", amount: 77000, note: "EPSON EB-FH08 10/16개월" },
    { modelCode: "SW-001", amount: 77000, note: "한글 7카피 임대료 (3/12회차)" },
    { modelCode: "RAM-001", amount: 280000, note: "DDR4 16G RAM 40개 임대료" },
    { modelCode: "RAM-003", amount: 180000, note: "DDR5 32G RAM 12개 단기임대" },
    { modelCode: "SSD-002", amount: 350000, note: "NVMe 1TB SSD 7개 단기임대" },
    { modelCode: "TV-001", amount: 1500000, note: "UDH 55 TV 10대 행사·단기임대" },
    { modelCode: "TV-002", amount: 800000, note: "UDH 65 TV 4대 행사·단기임대" },
    { modelCode: "TV-003", amount: 450000, note: "SMART TV 75 행사·단기임대" },
    { modelCode: "TV-004", amount: 250000, note: "SMART TV 55 행사·단기임대" },
    { modelCode: "TV-005", amount: 246000, note: "스탠바이미 행사·단기임대" },
    { modelCode: "TV-006", amount: 250000, note: "더 세로 행사·단기임대" },
  ],
  // 2026-06-30 (#249, 4,097,000원): EPSON EB-FH08 11/16개월 (77,000) + 외 (4,020,000)
  249: [
    { modelCode: "PRJ-001", amount: 77000, note: "EPSON EB-FH08 11/16개월" },
    { modelCode: "SW-001", amount: 77000, note: "한글 7카피 임대료 (4/12회차)" },
    { modelCode: "RAM-001", amount: 280000, note: "DDR4 16G RAM 40개 임대료" },
    { modelCode: "RAM-003", amount: 143000, note: "DDR5 32G RAM 12개 단기임대" },
    { modelCode: "SSD-002", amount: 320000, note: "NVMe 1TB SSD 7개 단기임대" },
    { modelCode: "TV-001", amount: 1350000, note: "UDH 55 TV 9대 행사·단기임대" },
    { modelCode: "TV-002", amount: 800000, note: "UDH 65 TV 4대 행사·단기임대" },
    { modelCode: "TV-003", amount: 400000, note: "SMART TV 75 행사·단기임대" },
    { modelCode: "TV-004", amount: 200000, note: "SMART TV 55 행사·단기임대" },
    { modelCode: "TV-005", amount: 200000, note: "스탠바이미 행사·단기임대" },
    { modelCode: "TV-006", amount: 250000, note: "더 세로 행사·단기임대" },
  ],
  // 2026-07-31 (#204, 813,000원): EPSON EB-FH08 12/16개월 (77,000) + 외 (736,000)
  204: [
    { modelCode: "PRJ-001", amount: 77000, note: "EPSON EB-FH08 12/16개월" },
    { modelCode: "SW-001", amount: 77000, note: "한글 7카피 임대료 (5/12회차)" },
    { modelCode: "RAM-001", amount: 59000, note: "DDR4 16G RAM 임대료" },
    { modelCode: "TV-002", amount: 400000, note: "UDH 65 TV 2대 임대료" },
    { modelCode: "TV-006", amount: 200000, note: "더 세로 임대료" },
  ],
  // 2026-08-31 (#194, 613,000원): EPSON EB-FH08 13/16개월 (77,000) + 외 (536,000)
  194: [
    { modelCode: "PRJ-001", amount: 77000, note: "EPSON EB-FH08 13/16개월" },
    { modelCode: "SW-001", amount: 77000, note: "한글 7카피 임대료 (6/12회차)" },
    { modelCode: "RAM-001", amount: 59000, note: "DDR4 16G RAM 임대료" },
    { modelCode: "TV-002", amount: 200000, note: "UDH 65 TV 임대료" },
    { modelCode: "TV-006", amount: 200000, note: "더 세로 임대료" },
  ],
  // 2026-09-30 (#190, 538,000원): EPSON EB-FH08 14/16개월 (77,000) + 외 (461,000)
  190: [
    { modelCode: "PRJ-001", amount: 77000, note: "EPSON EB-FH08 14/16개월" },
    { modelCode: "SW-001", amount: 77000, note: "한글 7카피 임대료 (7/12회차)" },
    { modelCode: "RAM-001", amount: 84000, note: "DDR4 16G RAM 12개 임대료" },
    { modelCode: "TV-002", amount: 150000, note: "UDH 65 TV 임대료" },
    { modelCode: "TV-005", amount: 150000, note: "스탠바이미 임대료" },
  ],
  // 2026-10-31 (#574, 196,000원): NT-DDR4-3200AA-16G (42,000) + EPSON EB-FH08 15/16개월 (77,000) + 한글 7카피 (77,000)
  574: [
    { modelCode: "RAM-001", amount: 42000, note: "NT-DDR4-3200AA-16G 6개 임대료 (@7,000)" },
    { modelCode: "PRJ-001", amount: 77000, note: "EPSON EB-FH08 15/16개월 임대료" },
    { modelCode: "SW-001", amount: 77000, note: "한글 7카피 임대료 (8/12회차)" },
  ],
  // 2026-11-03 (#568, +196,000원 & #573, -196,000원): 수정세금계산서 상계 (순액 0원)
  568: [
    { modelCode: "RAM-001", amount: 42000, note: "[당초발행] NT-DDR4-3200AA-16G 6개" },
    { modelCode: "PRJ-001", amount: 77000, note: "[당초발행] EPSON EB-FH08 1대" },
    { modelCode: "SW-001", amount: 77000, note: "[당초발행] 한글 7카피" },
  ],
  573: [
    { modelCode: "RAM-001", amount: -42000, note: "[수정상계] NT-DDR4-3200AA-16G 6개 취소" },
    { modelCode: "PRJ-001", amount: -77000, note: "[수정상계] EPSON EB-FH08 1대 취소" },
    { modelCode: "SW-001", amount: -77000, note: "[수정상계] 한글 7카피 취소" },
  ],
};

/**
 * 렌탈 도메인(domain_type = 'RENTAL') 매출세금계산서 매출 유형 분리 함수
 */
export function classifyRentalSalesInvoice(row: {
  id: number | string;
  invoice_no?: string | null;
  issue_date?: string | Date | null;
  supplier_entity_type?: string | null;
  customer_name?: string | null;
  item_name?: string | null;
  memo?: string | null;
  supply_amount?: number | string | null;
  vat_amount?: number | string | null;
  total_amount?: number | string | null;
}): ClassifiedRentalInvoiceRow {
  const id = Number(row.id || 0);
  const issueDate = row.issue_date ? String(row.issue_date).slice(0, 10) : "";
  const yearMonth = issueDate.slice(0, 7);
  const customerName = String(row.customer_name || "").trim();
  const itemName = String(row.item_name || "").trim();
  const memo = String(row.memo || "").trim();
  const text = `${customerName} ${itemName} ${memo}`;
  const supplyAmount = Number(row.supply_amount || 0);
  const vatAmount = Number(row.vat_amount || 0);
  const totalAmount = Number(row.total_amount || supplyAmount + vatAmount);

  // 1) 명시적 자사 보유 렌탈자산 임대매출 매핑 대상
  if (OWNED_ASSET_INVOICE_ATTRIBUTION_MAP[id]) {
    return {
      id,
      invoiceNo: String(row.invoice_no || `INV-${id}`),
      issueDate,
      yearMonth,
      entityType: String(row.supplier_entity_type || "CORP"),
      customerName,
      itemName,
      memo,
      supplyAmount,
      vatAmount,
      totalAmount,
      categoryCode: "OWNED_ASSET_RENTAL",
      categoryLabel: "자사 렌탈자산 임대매출",
      modelAttributions: OWNED_ASSET_INVOICE_ATTRIBUTION_MAP[id],
    };
  }

  // 2) 전대·외부임차 임대매출 (AJ네트웍스 노트북 150대 임대료, 자사 TV 최초 취득일 2024-11-20 이전 TV 전대 렌탈료)
  if (
    id === 178 ||
    id === 175 ||
    id === 541 ||
    id === 533 ||
    id === 527 ||
    id === 170 ||
    /AJ네트웍스/.test(customerName) ||
    (issueDate < "2024-11-20" && /렌탈료|임대료|TV/.test(text))
  ) {
    return {
      id,
      invoiceNo: String(row.invoice_no || `INV-${id}`),
      issueDate,
      yearMonth,
      entityType: String(row.supplier_entity_type || "CORP"),
      customerName,
      itemName,
      memo,
      supplyAmount,
      vatAmount,
      totalAmount,
      categoryCode: "SUBLEASE_RENTAL",
      categoryLabel: "전대·외부임차 임대매출",
      modelAttributions: [],
    };
  }

  // 3) 렌탈 부대 상품·장비 판매매출 (스탠드, 거치대, 모니터, 리모컨, 레노보 리전7, 43" TV 납품, NEO QLED 납품, 중고 TV 판매 등)
  if (
    id === 169 ||
    id === 163 ||
    id === 516 ||
    id === 472 ||
    id === 316 ||
    id === 315 ||
    id === 308 ||
    id === 272 ||
    id === 264 ||
    /스탠드|거치대|모니터|리모컨|레노보|43"|NEO QLED|중고/.test(text)
  ) {
    return {
      id,
      invoiceNo: String(row.invoice_no || `INV-${id}`),
      issueDate,
      yearMonth,
      entityType: String(row.supplier_entity_type || "CORP"),
      customerName,
      itemName,
      memo,
      supplyAmount,
      vatAmount,
      totalAmount,
      categoryCode: "RENTAL_GOODS_SALE",
      categoryLabel: "렌탈 부대 상품·장비 판매매출",
      modelAttributions: [],
    };
  }

  // 4) 렌탈 단기용역·작업비 매출 (현대렌탈서비스_단기, 2.5개월 용역, 노트북작업비, 납품설치, 정리 등)
  return {
    id,
    invoiceNo: String(row.invoice_no || `INV-${id}`),
    issueDate,
    yearMonth,
    entityType: String(row.supplier_entity_type || "CORP"),
    customerName,
    itemName,
    memo,
    supplyAmount,
    vatAmount,
    totalAmount,
    categoryCode: "RENTAL_OP_SERVICE",
    categoryLabel: "렌탈 단기용역·작업비 매출",
    modelAttributions: [],
  };
}

/**
 * 렌탈 도메인 매출세금계산서 목록을 받아 4대 매출 유형 분리 요약 및 모델별·월별 매출 맵을 생성
 */
export function buildRentalSalesSeparationAndModelRevenue(
  rentalInvoiceRows: any[]
): {
  separationSummary: RentalSalesSeparationSummary;
  modelMonthRevenueMap: Record<string, Record<string, number>>;
  modelTotalRevenueMap: Record<string, number>;
  monthTotalOwnedRevenueMap: Record<string, number>;
} {
  const classified: ClassifiedRentalInvoiceRow[] = rentalInvoiceRows.map((r) =>
    classifyRentalSalesInvoice(r)
  );

  const catMeta: Record<
    RentalSalesRevenueCategoryCode,
    { label: string; description: string; count: number; supply: number; vat: number; total: number }
  > = {
    OWNED_ASSET_RENTAL: {
      label: "자사 렌탈자산 임대매출",
      description: "당사 보유 13개 렌탈자산 모델(98대)에서 발생한 순수 장비·라이선스 월 임대매출",
      count: 0,
      supply: 0,
      vat: 0,
      total: 0,
    },
    SUBLEASE_RENTAL: {
      label: "전대·외부임차 임대매출",
      description: "외부 조달 장비 전대차(AJ네트웍스 노트북 150대 임대 등) 및 자사 자산 취득 이전 전대 매출",
      count: 0,
      supply: 0,
      vat: 0,
      total: 0,
    },
    RENTAL_OP_SERVICE: {
      label: "렌탈 단기용역·작업비 매출",
      description: "렌탈 부서 수행 단기 프로젝트 용역, 노트북 세팅·클리닝·정리 및 납품설치 작업비 매출",
      count: 0,
      supply: 0,
      vat: 0,
      total: 0,
    },
    RENTAL_GOODS_SALE: {
      label: "렌탈 부대 상품·장비 판매매출",
      description: "TV 거치대·스탠드, 모니터, 리모컨, 고객사 납품용 TV·노트북 등 일회성 물품 판매매출",
      count: 0,
      supply: 0,
      vat: 0,
      total: 0,
    },
  };

  const modelMonthRevenueMap: Record<string, Record<string, number>> = {};
  const modelTotalRevenueMap: Record<string, number> = {};
  const monthTotalOwnedRevenueMap: Record<string, number> = {};

  let totalSupplyAmount = 0;
  let totalVatAmount = 0;
  let totalAmount = 0;

  for (const item of classified) {
    totalSupplyAmount += item.supplyAmount;
    totalVatAmount += item.vatAmount;
    totalAmount += item.totalAmount;

    const bucket = catMeta[item.categoryCode];
    bucket.count += 1;
    bucket.supply += item.supplyAmount;
    bucket.vat += item.vatAmount;
    bucket.total += item.totalAmount;

    if (item.categoryCode === "OWNED_ASSET_RENTAL") {
      monthTotalOwnedRevenueMap[item.yearMonth] =
        (monthTotalOwnedRevenueMap[item.yearMonth] || 0) + item.supplyAmount;
      for (const attr of item.modelAttributions) {
        if (!modelMonthRevenueMap[attr.modelCode]) {
          modelMonthRevenueMap[attr.modelCode] = {};
        }
        modelMonthRevenueMap[attr.modelCode][item.yearMonth] =
          (modelMonthRevenueMap[attr.modelCode][item.yearMonth] || 0) + attr.amount;
        modelTotalRevenueMap[attr.modelCode] =
          (modelTotalRevenueMap[attr.modelCode] || 0) + attr.amount;
      }
    }
  }

  const order: RentalSalesRevenueCategoryCode[] = [
    "OWNED_ASSET_RENTAL",
    "SUBLEASE_RENTAL",
    "RENTAL_OP_SERVICE",
    "RENTAL_GOODS_SALE",
  ];

  const categories = order.map((code) => {
    const b = catMeta[code];
    return {
      code,
      label: b.label,
      description: b.description,
      invoiceCount: b.count,
      supplyAmount: b.supply,
      vatAmount: b.vat,
      totalAmount: b.total,
      sharePct:
        totalSupplyAmount > 0 ? Number(((b.supply / totalSupplyAmount) * 100).toFixed(1)) : 0,
    };
  });

  return {
    separationSummary: {
      totalInvoiceCount: classified.length,
      totalSupplyAmount,
      totalVatAmount,
      totalAmount,
      categories,
      invoices: classified,
    },
    modelMonthRevenueMap,
    modelTotalRevenueMap,
    monthTotalOwnedRevenueMap,
  };
}

/**
 * 특정 연월(ym)에 특정 모델(modelCode)의 매출액을 소속 자산들의 가동상태에 따라 개별 자산에 정밀 배분
 * - 마지막 자산에 단수차이를 보정하여 모델 월매출 합계와 개별 자산 월매출 합계가 1원 오차 없이 100% 일치하도록 보장
 */
export function allocateModelMonthRevenueToAssets(
  modelAssets: RentalAssetForDepreciation[],
  ym: string,
  modelMonthRevenue: number
): Map<number, number> {
  const result = new Map<number, number>();
  if (!modelMonthRevenue || modelAssets.length === 0) {
    for (const a of modelAssets) result.set(Number(a.id), 0);
    return result;
  }

  // 해당 월에 파손·폐기되지 않은 자산(또는 모든 자산)을 대상으로 균등 배분
  const eligible = modelAssets.filter((a) => {
    const dispYm = a.disposed_date ? String(a.disposed_date).slice(0, 7) : "";
    return !dispYm || dispYm > ym;
  });
  const targets = eligible.length > 0 ? eligible : modelAssets;
  const count = targets.length;
  const unitRev = Math.floor(modelMonthRevenue / count);
  let allocatedSum = 0;

  for (const a of modelAssets) {
    result.set(Number(a.id), 0);
  }
  for (let i = 0; i < targets.length; i++) {
    const astId = Number(targets[i].id);
    if (i === targets.length - 1) {
      result.set(astId, modelMonthRevenue - allocatedSum);
    } else {
      result.set(astId, unitRev);
      allocatedSum += unitRev;
    }
  }
  return result;
}

export function resolveUsefulLifeMonths(asset: RentalAssetForDepreciation): number {
  const cost = Number(asset.acquisition_cost || 0);
  const salvage = Number(asset.salvage_value || 0);
  const depAmount = Math.max(0, cost - salvage);
  const explicitMonths = Number(asset.useful_life_months || 0);
  if (explicitMonths > 0) return explicitMonths;

  const monthlyDep = Number(asset.monthly_depreciation || 0);
  if (depAmount > 0 && monthlyDep >= depAmount) {
    return 1;
  }

  const lifeYears = Math.max(1, Number(asset.useful_life_years || 4));
  return lifeYears * 12;
}

export function resolveBaseMonthlyDepreciation(asset: RentalAssetForDepreciation): number {
  const cost = Number(asset.acquisition_cost || 0);
  const salvage = Number(asset.salvage_value || 0);
  const depAmount = Math.max(0, cost - salvage);
  if (depAmount <= 0) return 0;

  const totalMonths = resolveUsefulLifeMonths(asset);
  if (totalMonths <= 1) return depAmount;

  const explicitMonthly = Number(asset.monthly_depreciation || 0);
  if (explicitMonthly > 0 && explicitMonthly <= depAmount) {
    return explicitMonthly;
  }
  return Math.round(depAmount / totalMonths);
}

/**
 * 특정 자산(asset)의 특정 연월(ym: 'YYYY-MM') 당월 정기 감가상각비 산출
 * - 취득월(acqYm) 포함 월할 정액상각 (monthIdx = 0부터 시작)
 * - 파손/폐기월(dispYm)부터는 정기 감가상각을 중단하고 파손·폐기손실로 일시 인식
 * - 마지막 상각월(monthIdx === totalMonths - 1)에는 단수차이를 보정하여 잔존가치까지 정확히 상각
 */
export function computeAssetMonthlyDeprecForYm(
  asset: RentalAssetForDepreciation,
  ym: string
): number {
  const cost = Number(asset.acquisition_cost || 0);
  const salvage = Number(asset.salvage_value || 0);
  const depAmount = Math.max(0, cost - salvage);
  if (depAmount <= 0 || !asset.acquisition_date) return 0;

  const acqYm = String(asset.acquisition_date).slice(0, 7);
  if (ym < acqYm) return 0;

  const dispYm = asset.disposed_date ? String(asset.disposed_date).slice(0, 7) : "";
  if (dispYm && ym >= dispYm) return 0;

  const [acqY, acqM] = acqYm.split("-").map(Number);
  const [curY, curM] = ym.split("-").map(Number);
  const monthIdx = (curY - acqY) * 12 + (curM - acqM);

  const totalMonths = resolveUsefulLifeMonths(asset);
  const monthlyDep = resolveBaseMonthlyDepreciation(asset);

  if (totalMonths <= 1 || monthlyDep >= depAmount) {
    return monthIdx === 0 ? depAmount : 0;
  }

  if (monthIdx < 0 || monthIdx >= totalMonths) return 0;

  if (monthIdx === totalMonths - 1) {
    const prevAccum = Math.min(depAmount, monthlyDep * (totalMonths - 1));
    return Math.max(0, depAmount - prevAccum);
  }
  const prevAccum = Math.min(depAmount, monthlyDep * monthIdx);
  return Math.max(0, Math.min(monthlyDep, depAmount - prevAccum));
}

/**
 * 특정 자산(asset)이 특정 연월(ym: 'YYYY-MM')에 파손·폐기(disposed_date)된 경우
 * 폐기 시점의 미상각 잔여 장부가액을 당월 파손·폐기손실로 산출
 */
export function computeAssetDisposalLossForYm(
  asset: RentalAssetForDepreciation,
  ym: string
): number {
  if (!asset.disposed_date) return 0;
  const dispYm = String(asset.disposed_date).slice(0, 7);
  if (dispYm !== ym) return 0;

  const cost = Number(asset.acquisition_cost || 0);
  const salvage = Number(asset.salvage_value || 0);
  const depAmount = Math.max(0, cost - salvage);
  if (depAmount <= 0 || !asset.acquisition_date) return 0;

  const acqYm = String(asset.acquisition_date).slice(0, 7);
  const [acqY, acqM] = acqYm.split("-").map(Number);
  const [dispY, dispM] = dispYm.split("-").map(Number);
  const monthsBeforeDisposal = Math.max(0, (dispY - acqY) * 12 + (dispM - acqM));

  const totalMonths = resolveUsefulLifeMonths(asset);
  const monthlyDep = resolveBaseMonthlyDepreciation(asset);
  const accumBeforeDisposal =
    monthsBeforeDisposal >= totalMonths
      ? depAmount
      : Math.min(depAmount, monthlyDep * monthsBeforeDisposal);
  return Math.max(0, cost - accumBeforeDisposal);
}

/**
 * 기준일(cutoffDate: 'YYYY-MM-DD') 시점의 누적 감가상각비(파손·폐기손실 포함 누적 비용화 금액) 산출
 */
export function computeAssetAccumDeprecAsOf(
  asset: RentalAssetForDepreciation,
  cutoffDate: string
): number {
  const cost = Number(asset.acquisition_cost || 0);
  const salvage = Number(asset.salvage_value || 0);
  const depAmount = Math.max(0, cost - salvage);
  if (depAmount <= 0 || !asset.acquisition_date) return 0;

  const acqDateStr = String(asset.acquisition_date).slice(0, 10);
  if (cutoffDate < acqDateStr) return 0;

  if (asset.disposed_date && String(asset.disposed_date).slice(0, 10) <= cutoffDate) {
    return cost;
  }

  const acqYm = acqDateStr.slice(0, 7);
  const cutYm = cutoffDate.slice(0, 7);
  const [acqY, acqM] = acqYm.split("-").map(Number);
  const [cutY, cutM] = cutYm.split("-").map(Number);

  const totalMonths = resolveUsefulLifeMonths(asset);
  const monthlyDep = resolveBaseMonthlyDepreciation(asset);
  if (totalMonths <= 1 || monthlyDep >= depAmount) return depAmount;

  const monthsCount = Math.min(totalMonths, Math.max(0, (cutY - acqY) * 12 + (cutM - acqM) + 1));
  if (monthsCount >= totalMonths) return depAmount;
  return Math.min(depAmount, monthlyDep * monthsCount);
}

/**
 * 특정 연월 말(ym: 'YYYY-MM') 기준 개별 자산의 상태 산출
 */
export function computeAssetMonthState(
  asset: RentalAssetForDepreciation,
  ym: string,
  monthlyRevenue = 0,
  prevCumulativeRevenue = 0,
  prevCumulativeNetProfit = 0
): AssetMonthDepreciationRow | null {
  const cost = Number(asset.acquisition_cost || 0);
  const salvage = Number(asset.salvage_value || 0);
  const depAmount = Math.max(0, cost - salvage);
  if (cost <= 0 || !asset.acquisition_date) return null;

  const acqDateStr = String(asset.acquisition_date).slice(0, 10);
  const acqYm = acqDateStr.slice(0, 7);
  if (ym < acqYm && monthlyRevenue === 0) return null;

  const dispDateStr = asset.disposed_date ? String(asset.disposed_date).slice(0, 10) : "";
  const dispYm = dispDateStr ? dispDateStr.slice(0, 7) : "";
  if (dispYm && ym > dispYm && monthlyRevenue === 0) return null;

  const [curY, curM] = ym.split("-").map(Number);
  const prevY = curM === 1 ? curY - 1 : curY;
  const prevM = curM === 1 ? 12 : curM - 1;
  const prevCutoff = `${prevY}-${String(prevM).padStart(2, "0")}-31`;

  const isBeforeAcq = ym < acqYm;
  const isAcqMonth = ym === acqYm;
  const prevAccum = isBeforeAcq || isAcqMonth ? 0 : computeAssetAccumDeprecAsOf(asset, prevCutoff);
  const beginningBookValue = isBeforeAcq || isAcqMonth ? 0 : Math.max(0, cost - prevAccum);
  const additionAmount = isAcqMonth ? cost : 0;

  const depreciationAmount = isBeforeAcq ? 0 : computeAssetMonthlyDeprecForYm(asset, ym);
  const disposalLossAmount = isBeforeAcq ? 0 : computeAssetDisposalLossForYm(asset, ym);

  const isDisposedThisMonth = dispYm === ym;
  const isAfterDisposed = Boolean(dispYm && ym > dispYm);
  const accumulatedDepreciation =
    isBeforeAcq || isDisposedThisMonth || isAfterDisposed
      ? 0
      : Math.min(depAmount, prevAccum + depreciationAmount);
  const endingBookValue =
    isBeforeAcq || isDisposedThisMonth || isAfterDisposed
      ? 0
      : Math.max(0, cost - accumulatedDepreciation);

  const monthlyNetProfit = monthlyRevenue - depreciationAmount - disposalLossAmount;
  const cumulativeRevenue = prevCumulativeRevenue + monthlyRevenue;
  const cumulativeNetProfit = prevCumulativeNetProfit + monthlyNetProfit;

  const totalMonths = resolveUsefulLifeMonths(asset);
  const eventType: AssetMonthDepreciationRow["eventType"] = isDisposedThisMonth
    ? "DISPOSAL"
    : endingBookValue <= salvage && depreciationAmount === 0
    ? "FULLY_DEPRECIATED"
    : "DEPRECIATION";

  const lifeLabel =
    totalMonths % 12 === 0 ? `${totalMonths / 12}년(${totalMonths}개월)` : `${totalMonths}개월`;

  const revSuffix =
    monthlyRevenue !== 0
      ? ` | 당월매출 ₩${monthlyRevenue.toLocaleString()}, 순수익 ₩${monthlyNetProfit.toLocaleString()}`
      : "";

  const note = isDisposedThisMonth
    ? `${ym} 파손·폐기 제각 (미상각 잔여장부가 ₩${disposalLossAmount.toLocaleString()} 일시 손실 처리)${revSuffix}`
    : depreciationAmount > 0
    ? `${ym} 정액법 월할상각 (${lifeLabel}, 당월상각 ₩${depreciationAmount.toLocaleString()})${revSuffix}`
    : `${ym} 상각완료 (장부가액 ₩${endingBookValue.toLocaleString()} 유지)${revSuffix}`;

  return {
    assetId: Number(asset.id),
    assetNo: String(asset.asset_no || ""),
    rentalProductId: asset.rental_product_id ? Number(asset.rental_product_id) : null,
    modelCode: String(asset.model_code || ""),
    modelName: String(asset.model_name || ""),
    yearMonth: ym,
    beginningBookValue,
    additionAmount,
    depreciationAmount,
    disposalLossAmount,
    accumulatedDepreciation,
    endingBookValue,
    monthlyRevenue,
    monthlyNetProfit,
    cumulativeRevenue,
    cumulativeNetProfit,
    eventType,
    note,
  };
}

/**
 * 지정된 월 배열(months: ['2026-01', ...])에 대한 전사 유형자산(임대자산) 가치 변동 및 월별 매출·순수익 Roll-Forward 스케줄 산출
 */
export function buildMonthlyAssetRollForwardSchedule(
  assets: RentalAssetForDepreciation[],
  months: string[],
  monthOwnedRevenueMap: Record<string, number> = {}
): MonthlyAssetRollForwardSummary[] {
  const sortedMonths = [...months].sort();
  let runningCumRev = 0;
  let runningCumDepCost = 0;

  // 만약 조회 시작월(sortedMonths[0]) 이전에 발생한 매출/상각이 있다면 기초 누적치 계산
  if (sortedMonths.length > 0) {
    const firstYm = sortedMonths[0];
    const [fy, fm] = firstYm.split("-").map(Number);
    const prevY = fm === 1 ? fy - 1 : fy;
    const prevM = fm === 1 ? 12 : fm - 1;
    const priorCutoff = `${prevY}-${String(prevM).padStart(2, "0")}-31`;

    for (const [ymKey, revVal] of Object.entries(monthOwnedRevenueMap)) {
      if (ymKey < firstYm) {
        runningCumRev += Number(revVal || 0);
      }
    }
    for (const ast of assets) {
      runningCumDepCost += computeAssetAccumDeprecAsOf(ast, priorCutoff);
    }
  }

  return sortedMonths.map((ym) => {
    const [curY, curM] = ym.split("-").map(Number);
    const prevY = curM === 1 ? curY - 1 : curY;
    const prevM = curM === 1 ? 12 : curM - 1;
    const prevYm = `${prevY}-${String(prevM).padStart(2, "0")}`;
    const prevCutoff = `${prevYm}-31`;
    const endCutoff = `${ym}-31`;

    let beginningGrossCost = 0;
    let beginningAccumDepreciation = 0;
    let additionCost = 0;
    let depreciationExpense = 0;
    let disposalLoss = 0;
    let disposedGrossCost = 0;
    let disposedAccumRemoved = 0;
    let endingGrossCost = 0;
    let endingAccumDepreciation = 0;
    let activeAssetCount = 0;
    let depreciatedAssetCount = 0;

    for (const ast of assets) {
      const cost = Number(ast.acquisition_cost || 0);
      if (cost <= 0 || !ast.acquisition_date) continue;

      const acqYm = String(ast.acquisition_date).slice(0, 7);
      const dispYm = ast.disposed_date ? String(ast.disposed_date).slice(0, 7) : "";

      if (acqYm <= prevYm && (!dispYm || dispYm > prevYm)) {
        beginningGrossCost += cost;
        beginningAccumDepreciation += computeAssetAccumDeprecAsOf(ast, prevCutoff);
      }

      if (acqYm === ym) {
        additionCost += cost;
      }

      const dep = computeAssetMonthlyDeprecForYm(ast, ym);
      const loss = computeAssetDisposalLossForYm(ast, ym);
      depreciationExpense += dep;
      disposalLoss += loss;
      if (dep > 0 || loss > 0) {
        depreciatedAssetCount += 1;
      }

      if (dispYm === ym) {
        disposedGrossCost += cost;
        disposedAccumRemoved += Math.max(0, cost - loss);
      }

      if (acqYm <= ym && (!dispYm || dispYm > ym)) {
        endingGrossCost += cost;
        endingAccumDepreciation += computeAssetAccumDeprecAsOf(ast, endCutoff);
        activeAssetCount += 1;
      }
    }

    const beginningBookValue = Math.max(0, beginningGrossCost - beginningAccumDepreciation);
    const endingBookValue = Math.max(0, endingGrossCost - endingAccumDepreciation);
    const monthlyRevenue = Number(monthOwnedRevenueMap[ym] || 0);
    const monthlyNetProfit = monthlyRevenue - depreciationExpense - disposalLoss;

    runningCumRev += monthlyRevenue;
    runningCumDepCost += depreciationExpense + disposalLoss;
    const cumulativeNetProfit = runningCumRev - runningCumDepCost;

    return {
      yearMonth: ym,
      beginningGrossCost,
      beginningAccumDepreciation,
      beginningBookValue,
      additionCost,
      depreciationExpense,
      disposalLoss,
      disposedGrossCost,
      disposedAccumRemoved,
      endingGrossCost,
      endingAccumDepreciation,
      endingBookValue,
      monthlyRevenue,
      monthlyNetProfit,
      cumulativeRevenue: runningCumRev,
      cumulativeDepreciationCost: runningCumDepCost,
      cumulativeNetProfit,
      activeAssetCount,
      depreciatedAssetCount,
    };
  });
}

export function generateMonthRange(startYm: string, endYm: string): string[] {
  const [sy, sm] = startYm.split("-").map(Number);
  const [ey, em] = endYm.split("-").map(Number);
  const result: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return result;
}

/**
 * DB 동기화 엔진:
 * - 모든 자산화 렌탈자산(acquisition_cost > 0)에 대해 최초 취득월(2024-11)부터 기준월(targetYm, 기본 현재월)까지
 *   월별 감가상각 및 월별 매출·순수익 원장(erp_asset_depreciation_logs)을 멱등(UPSERT) 생성/갱신하고,
 * - erp_rental_assets 테이블의 useful_life_months, monthly_depreciation, accumulated_depreciation, book_value,
 *   cumulative_revenue, cumulative_net_profit를 기준월 말 기준으로 1원 오차 없이 동기화한다.
 */
export async function syncAllRentalAssetDepreciationLogs(
  poolOrClient: Pool | PoolClient,
  targetYm?: string
): Promise<{
  targetYm: string;
  assetCount: number;
  upsertedLogCount: number;
  totalGrossCost: number;
  totalAccumDepreciation: number;
  totalBookValue: number;
  totalCumulativeRevenue: number;
  totalCumulativeNetProfit: number;
}> {
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const effectiveTargetYm = targetYm || nowKst.toISOString().slice(0, 7);
  const targetCutoffDate = `${effectiveTargetYm}-31`;

  // Ensure revenue & profit columns exist on erp_asset_depreciation_logs and erp_rental_assets
  await poolOrClient.query(`
    ALTER TABLE erp_asset_depreciation_logs
      ADD COLUMN IF NOT EXISTS monthly_revenue NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS monthly_net_profit NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cumulative_revenue NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cumulative_net_profit NUMERIC DEFAULT 0;
  `);
  await poolOrClient.query(`
    ALTER TABLE erp_rental_assets
      ADD COLUMN IF NOT EXISTS cumulative_revenue NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cumulative_net_profit NUMERIC DEFAULT 0;
  `);

  const [assetsRes, rentalInvRes] = await Promise.all([
    poolOrClient.query(`
      SELECT a.id,
             a.asset_no,
             a.rental_product_id,
             rp.model_code,
             rp.model_name,
             rp.category,
             a.status,
             a.acquisition_date::text AS acquisition_date,
             a.disposed_date::text AS disposed_date,
             COALESCE(a.acquisition_cost, 0)::numeric AS acquisition_cost,
             COALESCE(a.salvage_value, 0)::numeric AS salvage_value,
             COALESCE(a.useful_life_years, 4)::int AS useful_life_years,
             a.useful_life_months,
             COALESCE(a.monthly_depreciation, 0)::numeric AS monthly_depreciation,
             a.supplier,
             a.memo
      FROM erp_rental_assets a
      LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
      WHERE COALESCE(a.acquisition_cost, 0) > 0
      ORDER BY a.id ASC
    `),
    poolOrClient.query(`
      SELECT id, invoice_no, issue_date::text AS issue_date, supplier_entity_type,
             customer_name, item_name, memo,
             COALESCE(supply_amount, 0)::numeric AS supply_amount,
             COALESCE(vat_amount, 0)::numeric AS vat_amount,
             COALESCE(total_amount, 0)::numeric AS total_amount
      FROM erp_tax_invoices
      WHERE io_type = 'SALE' AND domain_type = 'RENTAL'
        AND SUBSTRING(issue_date::text, 1, 7) <= $1
      ORDER BY issue_date ASC, id ASC
    `, [effectiveTargetYm]),
  ]);

  const assets: RentalAssetForDepreciation[] = assetsRes.rows;
  const { modelMonthRevenueMap } = buildRentalSalesSeparationAndModelRevenue(rentalInvRes.rows);

  // Group assets by model_code for exact per-asset monthly revenue allocation
  const assetsByModel = new Map<string, RentalAssetForDepreciation[]>();
  for (const ast of assets) {
    const mc = String(ast.model_code || "");
    if (!assetsByModel.has(mc)) assetsByModel.set(mc, []);
    assetsByModel.get(mc)!.push(ast);
  }

  // Precompute assetId -> (ym -> allocatedRevenue)
  const allMonths = generateMonthRange("2024-11", effectiveTargetYm);
  const assetMonthRevMap = new Map<number, Record<string, number>>();
  for (const ast of assets) {
    assetMonthRevMap.set(Number(ast.id), {});
  }

  for (const [mc, modelAssets] of assetsByModel.entries()) {
    const mRevByYm = modelMonthRevenueMap[mc] || {};
    for (const ym of allMonths) {
      const mRev = Number(mRevByYm[ym] || 0);
      if (mRev !== 0) {
        const alloc = allocateModelMonthRevenueToAssets(modelAssets, ym, mRev);
        for (const [astId, revAmt] of alloc.entries()) {
          const rec = assetMonthRevMap.get(astId);
          if (rec) rec[ym] = revAmt;
        }
      }
    }
  }

  let upsertedLogCount = 0;
  let totalGrossCost = 0;
  let totalAccumDepreciation = 0;
  let totalBookValue = 0;
  let totalCumulativeRevenue = 0;
  let totalCumulativeNetProfit = 0;

  for (const ast of assets) {
    const astId = Number(ast.id);
    const acqYm = String(ast.acquisition_date || "").slice(0, 7);
    if (!acqYm || acqYm > effectiveTargetYm) continue;

    const revByYm = assetMonthRevMap.get(astId) || {};
    let firstRevYm = acqYm;
    for (const ymKey of Object.keys(revByYm)) {
      if (revByYm[ymKey] !== 0 && ymKey < firstRevYm) {
        firstRevYm = ymKey;
      }
    }

    const dispYm = ast.disposed_date ? String(ast.disposed_date).slice(0, 7) : "";
    const endYmForAsset = dispYm && dispYm < effectiveTargetYm ? dispYm : effectiveTargetYm;
    const assetMonths = generateMonthRange(firstRevYm, endYmForAsset);

    let runningCumRev = 0;
    let runningCumNetProfit = 0;

    for (const ym of assetMonths) {
      const mRev = Number(revByYm[ym] || 0);
      const state = computeAssetMonthState(ast, ym, mRev, runningCumRev, runningCumNetProfit);
      if (!state) continue;

      runningCumRev = state.cumulativeRevenue;
      runningCumNetProfit = state.cumulativeNetProfit;

      if (
        state.depreciationAmount > 0 ||
        state.disposalLossAmount > 0 ||
        state.monthlyRevenue !== 0 ||
        ym === acqYm ||
        state.endingBookValue > 0
      ) {
        await poolOrClient.query(
          `
          INSERT INTO erp_asset_depreciation_logs (
            asset_id,
            asset_no,
            year_month,
            beginning_book_value,
            monthly_depreciation,
            disposal_loss_amount,
            accumulated_depreciation,
            book_value_after,
            monthly_revenue,
            monthly_net_profit,
            cumulative_revenue,
            cumulative_net_profit,
            event_type,
            note,
            executed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
          ON CONFLICT (asset_id, year_month) DO UPDATE SET
            asset_no = EXCLUDED.asset_no,
            beginning_book_value = EXCLUDED.beginning_book_value,
            monthly_depreciation = EXCLUDED.monthly_depreciation,
            disposal_loss_amount = EXCLUDED.disposal_loss_amount,
            accumulated_depreciation = EXCLUDED.accumulated_depreciation,
            book_value_after = EXCLUDED.book_value_after,
            monthly_revenue = EXCLUDED.monthly_revenue,
            monthly_net_profit = EXCLUDED.monthly_net_profit,
            cumulative_revenue = EXCLUDED.cumulative_revenue,
            cumulative_net_profit = EXCLUDED.cumulative_net_profit,
            event_type = EXCLUDED.event_type,
            note = EXCLUDED.note,
            executed_at = NOW()
        `,
          [
            state.assetId,
            state.assetNo,
            state.yearMonth,
            state.beginningBookValue,
            state.depreciationAmount,
            state.disposalLossAmount,
            state.accumulatedDepreciation,
            state.endingBookValue,
            state.monthlyRevenue,
            state.monthlyNetProfit,
            state.cumulativeRevenue,
            state.cumulativeNetProfit,
            state.eventType,
            state.note,
          ]
        );
        upsertedLogCount += 1;
      }
    }

    // Update erp_rental_assets summary columns as of effectiveTargetYm
    const cost = Number(ast.acquisition_cost || 0);
    const salvage = Number(ast.salvage_value || 0);
    const depAmount = Math.max(0, cost - salvage);
    const lifeMonths = resolveUsefulLifeMonths(ast);
    const baseMonthly = resolveBaseMonthlyDepreciation(ast);
    const isDisposedByTarget =
      ast.disposed_date && String(ast.disposed_date).slice(0, 10) <= targetCutoffDate;

    let currentAccum = 0;
    let currentBook = 0;
    if (isDisposedByTarget) {
      const dispYmStr = String(ast.disposed_date).slice(0, 7);
      const lossAmt = computeAssetDisposalLossForYm(ast, dispYmStr);
      currentAccum = Math.max(0, cost - lossAmt);
      currentBook = 0;
    } else {
      currentAccum = Math.min(depAmount, computeAssetAccumDeprecAsOf(ast, targetCutoffDate));
      currentBook = Math.max(0, cost - currentAccum);
      totalGrossCost += cost;
      totalAccumDepreciation += currentAccum;
      totalBookValue += currentBook;
    }

    totalCumulativeRevenue += runningCumRev;
    totalCumulativeNetProfit += runningCumNetProfit;

    await poolOrClient.query(
      `
      UPDATE erp_rental_assets
      SET useful_life_months = $1,
          monthly_depreciation = $2,
          accumulated_depreciation = $3,
          book_value = $4,
          cumulative_revenue = $5,
          cumulative_net_profit = $6,
          updated_at = NOW()
      WHERE id = $7
    `,
      [
        lifeMonths,
        baseMonthly,
        currentAccum,
        currentBook,
        runningCumRev,
        runningCumNetProfit,
        ast.id,
      ]
    );
  }

  return {
    targetYm: effectiveTargetYm,
    assetCount: assets.length,
    upsertedLogCount,
    totalGrossCost,
    totalAccumDepreciation,
    totalBookValue,
    totalCumulativeRevenue,
    totalCumulativeNetProfit,
  };
}
