import type { Pool } from "pg";
import { BUSINESS_ENTITIES } from "@/lib/businessEntities";
import {
  computeAssetMonthlyDeprecForYm,
  computeAssetDisposalLossForYm,
  computeAssetAccumDeprecAsOf,
  resolveUsefulLifeMonths,
  buildMonthlyAssetRollForwardSchedule,
  classifyRentalSalesInvoice,
  buildRentalSalesSeparationAndModelRevenue,
  type RentalAssetForDepreciation,
  type MonthlyAssetRollForwardSummary,
} from "@/lib/erpDepreciation";
import {
  type FinancialDetailItem,
  isCapitalizedAssetPurchaseInvoice,
  getPartialCapitalizedInvoiceSupply,
  classifyTaxPaymentSubAccount,
  classifyPurchaseInvoiceSubAccount,
  classifyBankTxAccount,
  isVatInclusiveBankExpense,
} from "./financialReportEngine";
import type {
  AccountRow,
  FinancialSummary,
  MajorAccountKey,
  MonthlyTotal,
  StatementsData,
  UnsettledInvoiceBreakdownItem,
} from "@/app/erp/components/financial-report/financialReportTypes";

export interface FinancialRemarkRow {
  remark_text: string;
  tax_withholding: number | string;
  tax_vat: number | string;
  tax_corporate: number | string;
  tax_payment: number | string;
  updated_at: string | null;
}

export interface FinancialTaxItems {
  withholdingTax: number;
  vatTax: number;
  corporateTax: number;
  taxPayment: number;
}

export interface FinancialTaxInvoiceRow {
  id: number | string;
  invoice_no: string | null;
  io_type: string;
  domain_type: string;
  entity_type: string;
  issue_date: string;
  customer_name: string | null;
  item_name: string | null;
  memo: string | null;
  supply_amount: number | string;
  vat_amount: number | string;
  total_amount: number | string;
  reconciled_amount: number | string;
  settlement_status: string;
}

export interface FinancialBankTxRow {
  id: number | string;
  entity_type: string;
  account_no: string;
  trans_date: string;
  trans_time: string | null;
  trans_type: string | null;
  withdrawal_amount: number | string;
  deposit_amount: number | string;
  balance_after: number | string;
  sender_receiver: string | null;
  counterparty_holder: string | null;
  counterparty_bank: string | null;
  counterparty_account: string | null;
  tx_channel: string | null;
  memo: string | null;
  is_matched: boolean | null;
  matched_type: string | null;
  matched_id: string | null;
}

export interface FinancialTaxPaymentRow {
  id: number | string;
  entity_type: string;
  pay_date: string;
  tax_type: string;
  sub_account: string | null;
  taxpayer_name: string | null;
  pay_amount: number | string;
  electronic_pay_no: string | null;
  attribution_year: string | null;
  tax_office: string | null;
  remark: string | null;
}

export interface BuildFinancialReportInput {
  pool: Pool;
  year: string;
  entityType: string;
  amountBasis: string;
  currentYearStr: string;
  endCutoff: string;
  remarkRow: FinancialRemarkRow;
  taxItems: FinancialTaxItems;
  invRows: FinancialTaxInvoiceRow[];
  bankRows: FinancialBankTxRow[];
  taxPayRows: FinancialTaxPaymentRow[];
  attrTaxPayRows: FinancialTaxPaymentRow[];
  activeRentalAssets: RentalAssetForDepreciation[];
  cashEnding: number;
  cashEndingCorp: number;
  cashEndingIndiv: number;
  cashBeginning: number;
}

export interface FinancialReportPayload {
  success: true;
  year: string;
  entityType: string;
  amountBasis: string;
  months: string[];
  accountRows: AccountRow[];
  monthlyTotals: Record<string, MonthlyTotal>;
  summary: FinancialSummary;
  statements: StatementsData;
  depreciationSchedule: MonthlyAssetRollForwardSummary[];
  details: FinancialDetailItem[];
}

const DEFAULT_SUB_ACCOUNT_GROUPS: Array<[MajorAccountKey, string[]]> = [
  ["REVENUE", ["운영·유지보수 용역매출", "상품·장비 판매매출", "자사 렌탈자산 임대매출", "전대·외부임차 임대매출", "렌탈 단기용역·작업비 매출", "렌탈 부대 상품·장비 판매매출", "SI·개발 용역매출"]],
  ["COGS", ["관계사 매입·용역원가", "외주용역·전대임차원가", "상품·장비·자재매입원가", "임대자산 감가상각비", "무증빙·카드 상품자재매입"]],
  ["PAYROLL", ["임직원급여·수당", "퇴직급여·정산", "일용직급여", "4대보험료(기관납부)"]],
  ["OPEX", ["복리후생비(식대·다과·경조사)", "임차료·관리비", "통신비", "차량유지·렌트비", "세무·인증·수수료", "수도광열비(공과금)", "법인BC카드대금결제", "소모품·플랫폼·IT구독비", "체크카드·현장운영경비", "기타지급수수료·경비"]],
  ["TAX_DUES", ["원천세", "부가세", "법인세", "납부항목"]],
];

const CAPEX_MATCHED_IDS = new Set([
  "PX260309-581912", "PX260311-529669", "PX250801-415385", "PX241120-587365",
  "101", "99", "151", "56",
]);

function toUnsettledBreakdownItem(
  row: FinancialTaxInvoiceRow,
  ent: "CORP" | "INDIVIDUAL",
  supply: number,
  vat: number,
  total: number,
  reconciled: number,
  remain: number,
  fallbackItemName: string
): UnsettledInvoiceBreakdownItem {
  return {
    id: Number(row.id),
    invoiceNo: row.invoice_no || `INV-${row.id}`,
    entityType: ent,
    issueDate: String(row.issue_date || "").slice(0, 10),
    customerName: row.customer_name || "-",
    itemName: row.item_name || row.memo || fallbackItemName,
    supplyAmount: supply,
    vatAmount: vat,
    totalAmount: total,
    settledAmount: reconciled,
    unpaidAmount: remain,
    settlementStatus: row.settlement_status || "UNPAID",
  };
}

function classifyTaxInvoices(invRows: FinancialTaxInvoiceRow[], details: FinancialDetailItem[]) {
  let accountsReceivable = 0;
  let accountsPayable = 0;
  const accountsReceivableItems: UnsettledInvoiceBreakdownItem[] = [];
  const accountsPayableItems: UnsettledInvoiceBreakdownItem[] = [];

  const pushInvDetail = (
    row: FinancialTaxInvoiceRow,
    ent: "CORP" | "INDIVIDUAL",
    ym: string,
    opts: {
      id?: string;
      majorAccount: MajorAccountKey;
      subAccount: string;
      description: string;
      supplyAmount: number;
      vatAmount: number;
      totalAmount: number;
      status: string;
    }
  ) => {
    details.push({
      id: opts.id ?? `INV-${row.id}`,
      source: "TAX_INVOICE",
      entityType: ent,
      yearMonth: ym,
      date: row.issue_date,
      majorAccount: opts.majorAccount,
      subAccount: opts.subAccount,
      counterparty: row.customer_name || "-",
      description: opts.description,
      supplyAmount: opts.supplyAmount,
      vatAmount: opts.vatAmount,
      totalAmount: opts.totalAmount,
      status: opts.status,
      refNo: row.invoice_no || `INV-${row.id}`,
    });
  };

  for (const row of invRows) {
    const ym = String(row.issue_date).slice(0, 7);
    const supply = Number(row.supply_amount || 0);
    const vat = Number(row.vat_amount || 0);
    const total = Number(row.total_amount || supply + vat);
    const reconciled = Number(row.reconciled_amount || 0);
    const remain = row.settlement_status === "PAID" ? 0 : Math.max(0, total - reconciled);
    const ent = (row.entity_type === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP") as "CORP" | "INDIVIDUAL";

    if (row.io_type === "SALE") {
      accountsReceivable += remain;
      if (remain > 0) {
        accountsReceivableItems.push(
          toUnsettledBreakdownItem(row, ent, supply, vat, total, reconciled, remain, "매출 세금계산서")
        );
      }
      let subAccount = "운영·유지보수 용역매출";
      let rentalTypeBadge = "";
      if (row.domain_type === "RENTAL") {
        const rentalCls = classifyRentalSalesInvoice(row);
        if (rentalCls.categoryCode === "OWNED_ASSET_RENTAL") {
          subAccount = "자사 렌탈자산 임대매출";
          const modelSummary = rentalCls.modelAttributions
            .map((a) => `${a.modelCode}(₩${a.amount.toLocaleString()})`)
            .join(", ");
          rentalTypeBadge = modelSummary ? ` [귀속모델: ${modelSummary}]` : "";
        } else if (rentalCls.categoryCode === "SUBLEASE_RENTAL") {
          subAccount = "전대·외부임차 임대매출";
        } else if (rentalCls.categoryCode === "RENTAL_OP_SERVICE") {
          subAccount = "렌탈 단기용역·작업비 매출";
        } else {
          subAccount = "렌탈 부대 상품·장비 판매매출";
        }
      } else if (row.domain_type === "TRADE_SALE") subAccount = "상품·장비 판매매출";
      else if (row.domain_type === "DEV_SERVICE") subAccount = "SI·개발 용역매출";

      pushInvDetail(row, ent, ym, {
        majorAccount: "REVENUE",
        subAccount,
        description: `${row.item_name || row.memo || "매출 세금계산서"}${rentalTypeBadge}`,
        supplyAmount: supply,
        vatAmount: vat,
        totalAmount: total,
        status: row.settlement_status === "PAID" ? "수납완료" : "수납예정(정상가정)",
      });
    } else {
      accountsPayable += remain;
      if (remain > 0) {
        accountsPayableItems.push(
          toUnsettledBreakdownItem(row, ent, supply, vat, total, reconciled, remain, "매입 세금계산서")
        );
      }
      const cName = row.customer_name || "";
      const iName = row.item_name || "";
      const mText = row.memo || "";
      const invNo = row.invoice_no || "";
      const isCapex = isCapitalizedAssetPurchaseInvoice(cName, iName, mText, invNo);
      const partialCapSupply = !isCapex
        ? getPartialCapitalizedInvoiceSupply(cName, iName, invNo, supply)
        : 0;

      if (isCapex) {
        // 임대용 유형/무형자산 취득(CAPEX) 건은 즉시 COGS 비용 처리하지 않고 BS 자산 등록 후 월별 감가상각비로 인식
        pushInvDetail(row, ent, ym, {
          majorAccount: "NON_OP",
          subAccount: "임대자산취득(자산화)",
          description: `${iName || mText || "매입 세금계산서"} [임대자산 자산화 → 월별 감가상각 반영]`,
          supplyAmount: supply,
          vatAmount: vat,
          totalAmount: total,
          status: "자산화(감가상각대상)",
        });
      } else if (partialCapSupply > 0 && partialCapSupply < supply) {
        const capVat = Math.round(partialCapSupply * 0.1);
        const capTotal = partialCapSupply + capVat;
        const cls = classifyPurchaseInvoiceSubAccount(cName, iName, mText);
        pushInvDetail(row, ent, ym, {
          id: `INV-${row.id}-CAPEX`,
          majorAccount: "NON_OP",
          subAccount: "임대자산취득(자산화)",
          description: `${iName || mText || "매입 세금계산서"} (임대자산 자산화분) [임대자산 자산화 → 월별 감가상각 반영]`,
          supplyAmount: partialCapSupply,
          vatAmount: capVat,
          totalAmount: capTotal,
          status: "자산화(감가상각대상)",
        });
        pushInvDetail(row, ent, ym, {
          majorAccount: cls.majorAccount,
          subAccount: cls.subAccount,
          description: `${iName || mText || "매입 세금계산서"} (자산화 외 잔여분)`,
          supplyAmount: supply - partialCapSupply,
          vatAmount: vat - capVat,
          totalAmount: total - capTotal,
          status: row.settlement_status === "PAID" ? "지급완료" : "지급예정(정상가정)",
        });
      } else {
        const cls = classifyPurchaseInvoiceSubAccount(cName, iName, mText);
        pushInvDetail(row, ent, ym, {
          majorAccount: cls.majorAccount,
          subAccount: cls.subAccount,
          description: iName || mText || "매입 세금계산서",
          supplyAmount: supply,
          vatAmount: vat,
          totalAmount: total,
          status: row.settlement_status === "PAID" ? "지급완료" : "지급예정(정상가정)",
        });
      }
    }
  }

  return { accountsReceivable, accountsPayable, accountsReceivableItems, accountsPayableItems };
}

function accumulateBankTransactions(bankRows: FinancialBankTxRow[], details: FinancialDetailItem[]) {
  let cfSaleInflow = 0;
  let cfOtherOperatingInflow = 0;
  let cfPurchaseOutflow = 0;
  let cfPayrollOutflow = 0;
  let cfOpexOutflow = 0;
  let cfInvestingInflow = 0;
  let cfInvestingOutflow = 0;
  let cfFinancingInflow = 0;
  let cfFinancingOutflow = 0;

  for (const row of bankRows) {
    const wAmt = Number(row.withdrawal_amount || 0);
    const dAmt = Number(row.deposit_amount || 0);
    const isMatched = Boolean(row.is_matched);
    const matchedType = String(row.matched_type || "");
    const matchedId = String(row.matched_id || "");
    const sr = String(row.sender_receiver || "").replace(/\u3000/g, " ").trim();
    const holder = String(row.counterparty_holder || "").replace(/\u3000/g, " ").trim();
    const memo = String(row.memo || "").trim();
    const combined = `${sr} ${holder} ${memo}`;

    const cls = classifyBankTxAccount(row);
    if (isMatched && matchedType === "SALE_INVOICE") {
      cfSaleInflow += dAmt;
    } else if (isMatched && matchedType === "PURCHASE_INVOICE") {
      // 2024-07-09 이명옥 출금 2,660,000원(#128)은 임차보증금 잔금 2,000,000원 + 1회차 선납임차료 660,000원 복합 지급건
      if (Number(row.id) === 128 && wAmt === 2660000) {
        cfPurchaseOutflow += 660000;
        cfInvestingOutflow += 2000000;
      } else if (
        /삼원아이엔지|진진씨앤씨|에이브이랜드|키타드에스이/.test(combined) ||
        CAPEX_MATCHED_IDS.has(matchedId)
      ) {
        cfInvestingOutflow += wAmt;
      } else if (matchedId === "PX250904-e4wcph" || matchedId === "137" || Number(row.id) === 259) {
        // 엠디케이팩토리 2025-09-08 이체분 중 RAM-001 + RAM-002 자산화분(1,815,000원)은 투자활동 현금유출
        const capPortion = Math.min(wAmt, 1815000);
        cfInvestingOutflow += capPortion;
        cfPurchaseOutflow += Math.max(0, wAmt - capPortion);
      } else if (matchedId === "PX250904-jt555a" || matchedId === "138" || Number(row.id) === 247) {
        // 엠디케이팩토리 2025-09-10 이체분 중 SSD-001 자산화분(118,800원)은 투자활동 현금유출
        const capPortion = Math.min(wAmt, 118800);
        cfInvestingOutflow += capPortion;
        cfPurchaseOutflow += Math.max(0, wAmt - capPortion);
      } else if (matchedId === "PX251128-f3631k" || matchedId === "120" || Number(row.id) === 171) {
        cfInvestingOutflow += wAmt;
      } else {
        cfPurchaseOutflow += wAmt;
      }
    } else if (cls && (/보증금/.test(cls.subAccount) || cls.subAccount === "임대자산취득(자산화)")) {
      cfInvestingInflow += dAmt;
      cfInvestingOutflow += wAmt;
    } else if (cls && /자본금|가수금|대표자/.test(cls.subAccount)) {
      cfFinancingInflow += dAmt;
      cfFinancingOutflow += wAmt;
    } else if (cls) {
      if (cls.majorAccount === "PAYROLL") cfPayrollOutflow += wAmt - dAmt;
      else if (cls.majorAccount === "COGS") cfPurchaseOutflow += wAmt - dAmt;
      else if (cls.majorAccount === "OPEX") cfOpexOutflow += wAmt - dAmt;
      else if (cls.majorAccount === "NON_OP") cfOtherOperatingInflow += dAmt;
    }

    if (!cls) continue;

    const ym = String(row.trans_date).slice(0, 7);
    const rawAmt = wAmt > 0 ? wAmt : dAmt;
    const signedAmt = rawAmt * cls.sign;
    const ent = (row.entity_type === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP") as "CORP" | "INDIVIDUAL";
    const bankVat = isVatInclusiveBankExpense(row, cls) ? Math.round(signedAmt / 11) : 0;

    details.push({
      id: `BANK-${row.id}`,
      source: "BANK_TX",
      entityType: ent,
      yearMonth: ym,
      date: row.trans_date,
      majorAccount: cls.majorAccount,
      subAccount: cls.subAccount,
      counterparty: row.counterparty_holder || row.sender_receiver || "-",
      description: `${row.sender_receiver}${row.memo ? ` (${row.memo})` : ""}`,
      supplyAmount: signedAmt - bankVat,
      vatAmount: bankVat,
      totalAmount: signedAmt,
      status: row.is_matched ? `매칭완료 (${row.matched_id || row.matched_type})` : "통장집행",
      refNo: row.matched_id || `${row.tx_channel || "통장"}-${row.id}`,
    });
  }

  return {
    cfSaleInflow, cfOtherOperatingInflow, cfPurchaseOutflow, cfPayrollOutflow,
    cfOpexOutflow, cfInvestingInflow, cfInvestingOutflow, cfFinancingInflow, cfFinancingOutflow,
  };
}

function appendTaxPaymentDetails(
  attrTaxPayRows: FinancialTaxPaymentRow[],
  year: string,
  details: FinancialDetailItem[]
): number {
  let interimPrepaidCorpTax = 0;
  for (const row of attrTaxPayRows) {
    const payYr = String(row.pay_date).slice(0, 4);
    const attrYr = String(row.attribution_year || payYr);
    // 다음 해 초(1~4월)에 확정 납부된 전년도 귀속 세액은 해당 귀속연도의 12월 결산월에 귀속 표시
    const ym =
      year !== "ALL" && payYr !== String(year) && attrYr === String(year)
        ? `${year}-12`
        : String(row.pay_date).slice(0, 7);
    const amt = Number(row.pay_amount || 0);
    const ent = (row.entity_type === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP") as "CORP" | "INDIVIDUAL";
    const subAcc = (row.sub_account || classifyTaxPaymentSubAccount(row.tax_type)) as
      | "원천세"
      | "부가세"
      | "법인세"
      | "납부항목";

    const isInterimCorpTax =
      subAcc === "법인세" &&
      (/중간예납/.test(String(row.tax_type || "")) || String(row.pay_date).slice(5, 7) === "08");
    if (isInterimCorpTax) interimPrepaidCorpTax += amt;

    details.push({
      id: `TAXPAY-${row.id}`,
      source: "TAX_PAYMENT",
      entityType: ent,
      yearMonth: ym,
      date: row.pay_date,
      majorAccount: "TAX_DUES",
      subAccount: subAcc,
      counterparty: row.tax_office ? `국세청 (${row.tax_office})` : "국세청",
      description: `${row.tax_type}${row.attribution_year ? ` [귀속:${row.attribution_year}년]` : ""}${payYr !== attrYr ? ` (실납부:${row.pay_date})` : ""}${row.electronic_pay_no ? ` (${row.electronic_pay_no})` : ""}`,
      supplyAmount: amt,
      vatAmount: 0,
      totalAmount: amt,
      status: isInterimCorpTax ? "선급법인세(중간예납)" : "납부완료",
      refNo: row.electronic_pay_no || `TAX-${row.id}`,
    });
  }
  return interimPrepaidCorpTax;
}

function appendRentalDepreciationDetails(
  activeRentalAssets: RentalAssetForDepreciation[],
  months: string[],
  details: FinancialDetailItem[]
) {
  for (const ym of months) {
    // 모델별로 당월 감가상각비를 묶어 전표 가독성 향상
    const modelGroup = new Map<
      string,
      {
        modelName: string;
        supplier: string;
        count: number;
        depSum: number;
        lifeMonths: number;
        firstNo: string;
        lastNo: string;
      }
    >();
    for (const ast of activeRentalAssets) {
      const dep = computeAssetMonthlyDeprecForYm(ast, ym);
      if (dep <= 0) continue;
      const key = `${ast.rental_product_id || ast.model_code || ast.model_name}`;
      const cur = modelGroup.get(key);
      if (!cur) {
        modelGroup.set(key, {
          modelName: ast.model_name || ast.model_code || "임대자산",
          supplier: ast.supplier || "자사보유",
          count: 1,
          depSum: dep,
          lifeMonths: resolveUsefulLifeMonths(ast),
          firstNo: ast.asset_no,
          lastNo: ast.asset_no,
        });
      } else {
        cur.count += 1;
        cur.depSum += dep;
        cur.lastNo = ast.asset_no;
      }
    }
    for (const [key, grp] of modelGroup.entries()) {
      const rangeLabel =
        grp.count > 1 ? `${grp.firstNo}~${grp.lastNo} (${grp.count}대)` : `${grp.firstNo} (1대)`;
      const lifeLabel =
        grp.lifeMonths <= 1
          ? "1개월 전액상각"
          : grp.lifeMonths % 12 === 0
          ? `내용연수 ${grp.lifeMonths / 12}년(${grp.lifeMonths}개월) 정액법 월할상각`
          : `내용월수 ${grp.lifeMonths}개월 정액법 월할상각`;
      details.push({
        id: `DEP-${ym}-${key}`,
        source: "DEPRECIATION",
        entityType: "CORP",
        yearMonth: ym,
        date: `${ym}-28`,
        majorAccount: "COGS",
        subAccount: "임대자산 감가상각비",
        counterparty: grp.supplier,
        description: `[감가상각] ${grp.modelName} ${rangeLabel} (${lifeLabel})`,
        supplyAmount: grp.depSum,
        vatAmount: 0,
        totalAmount: grp.depSum,
        status: "상각계상(비현금)",
        refNo: grp.firstNo,
      });
    }

    // 파손/폐기(DISPOSED) 자산의 폐기월 잔여 미상각 장부가액 일시 손실 처리
    for (const ast of activeRentalAssets) {
      const lossAmt = computeAssetDisposalLossForYm(ast, ym);
      if (lossAmt <= 0) continue;
      details.push({
        id: `DISP-LOSS-${ym}-${ast.asset_no}`,
        source: "DEPRECIATION",
        entityType: "CORP",
        yearMonth: ym,
        date: String(ast.disposed_date || `${ym}-28`).slice(0, 10),
        majorAccount: "COGS",
        subAccount: "임대자산 감가상각비",
        counterparty: ast.supplier || "자사보유",
        description: `[자산파손·폐기손실] ${ast.model_name || ast.model_code || "임대자산"} ${ast.asset_no} (파손시점 미상각 잔여장부가 일시 비용 반영)`,
        supplyAmount: lossAmt,
        vatAmount: 0,
        totalAmount: lossAmt,
        status: "파손폐기손실(비현금)",
        refNo: ast.asset_no,
      });
    }
  }
}

async function computePriorRetainedEarnings(params: {
  pool: Pool;
  year: string;
  entityType: string;
  useTotal: boolean;
  activeRentalAssets: RentalAssetForDepreciation[];
}): Promise<number> {
  const { pool, year, entityType, useTotal, activeRentalAssets } = params;
  const priorCutoff = `${Number(year) - 1}-12-31`;
  const priorParams: any[] = [priorCutoff];
  let priorInvEntitySql = "";
  let priorBankEntitySql = "";
  if (entityType !== "ALL") {
    priorParams.push(entityType);
    priorInvEntitySql = ` AND COALESCE(supplier_entity_type, 'CORP') = $2`;
    priorBankEntitySql = ` AND COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) = $2`;
  }

  const [priorInvRes, priorBankRes, priorTaxPayRes, priorRemarkRes] = await Promise.all([
    pool.query(
      `SELECT COALESCE(io_type, 'SALE') AS io_type, customer_name, item_name, memo,
              COALESCE(supply_amount, 0)::numeric AS supply_amount,
              COALESCE(vat_amount, 0)::numeric AS vat_amount,
              COALESCE(total_amount, 0)::numeric AS total_amount
       FROM erp_tax_invoices WHERE issue_date <= $1::date ${priorInvEntitySql}`,
      priorParams
    ),
    pool.query(
      `SELECT id,
              COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) AS entity_type,
              trans_date::text AS trans_date,
              COALESCE(withdrawal_amount, 0)::numeric AS withdrawal_amount,
              COALESCE(deposit_amount, 0)::numeric AS deposit_amount,
              sender_receiver, counterparty_holder, tx_channel, memo, is_matched, matched_type, matched_id
       FROM erp_bank_transactions WHERE trans_date <= $1::date ${priorBankEntitySql}`,
      priorParams
    ),
    pool.query(
      `SELECT COALESCE(attribution_year, SUBSTRING(pay_date::text, 1, 4)) AS pyear,
              pay_date::text AS pay_date, sub_account, tax_type,
              COALESCE(pay_amount, 0)::numeric AS pay_amount
       FROM erp_tax_payments
       WHERE COALESCE(attribution_year, SUBSTRING(pay_date::text, 1, 4))::int < $1::int ${
         entityType !== "ALL" ? `AND COALESCE(entity_type, 'CORP') = $2` : ""
       }`,
      entityType !== "ALL" ? [Number(year), entityType] : [Number(year)]
    ),
    pool.query(
      `SELECT year,
              COALESCE(tax_withholding, 0)::numeric AS tax_withholding,
              COALESCE(tax_vat, 0)::numeric AS tax_vat,
              COALESCE(tax_corporate, 0)::numeric AS tax_corporate,
              COALESCE(tax_payment, 0)::numeric AS tax_payment
       FROM erp_financial_remarks
       WHERE year != 'ALL' AND year::int < $1::int AND entity_type = $2`,
      [Number(year), entityType]
    ),
  ]);

  let priorRev = 0;
  let priorCogs = 0;
  let priorPayroll = 0;
  let priorOpex = 0;

  for (const r of priorInvRes.rows) {
    const supply = Number(r.supply_amount || 0);
    const vat = Number(r.vat_amount || 0);
    const total = Number(r.total_amount || supply + vat);
    const val = useTotal ? total : supply;
    if (r.io_type === "SALE") {
      priorRev += val;
    } else {
      const cName = r.customer_name || "";
      const iName = r.item_name || "";
      const mText = r.memo || "";
      if (isCapitalizedAssetPurchaseInvoice(cName, iName, mText)) continue;
      const partialCapSupply = getPartialCapitalizedInvoiceSupply(cName, iName, "", supply);
      const adjVal =
        partialCapSupply > 0
          ? Math.max(0, val - (useTotal ? Math.round(partialCapSupply * 1.1) : partialCapSupply))
          : val;
      const cls = classifyPurchaseInvoiceSubAccount(cName, iName, mText);
      if (cls.majorAccount === "COGS") priorCogs += adjVal;
      else if (cls.majorAccount === "OPEX") priorOpex += adjVal;
    }
  }

  for (const ast of activeRentalAssets) {
    priorCogs += computeAssetAccumDeprecAsOf(ast, priorCutoff);
  }

  for (const r of priorBankRes.rows) {
    const cls = classifyBankTxAccount(r);
    if (!cls) continue;
    const wAmt = Number(r.withdrawal_amount || 0);
    const dAmt = Number(r.deposit_amount || 0);
    const signedAmt = (wAmt > 0 ? wAmt : dAmt) * cls.sign;
    const bankVat = isVatInclusiveBankExpense(r, cls) ? Math.round(signedAmt / 11) : 0;
    const val = useTotal ? signedAmt : signedAmt - bankVat;
    if (cls.majorAccount === "REVENUE") priorRev += val;
    else if (cls.majorAccount === "COGS") priorCogs += val;
    else if (cls.majorAccount === "PAYROLL") priorPayroll += val;
    else if (cls.majorAccount === "OPEX") priorOpex += val;
  }

  // 연도별 세무 항목 합산 (erp_tax_payments가 있는 항목은 실납부액, 없으면 remark 저장값)
  const startYr = entityType === "CORP" ? 2024 : 2023;
  let priorTaxTotal = 0;
  for (let y = startYr; y < Number(year); y++) {
    const yStr = String(y);
    const rem = priorRemarkRes.rows.find((x: any) => String(x.year) === yStr);
    const sums = { 원천세: 0, 부가세: 0, 법인세: 0, 납부항목: 0 };
    const counts = { 원천세: 0, 부가세: 0, 법인세: 0, 납부항목: 0 };
    let interimCorp = 0;

    for (const x of priorTaxPayRes.rows) {
      if (String(x.pyear) !== yStr) continue;
      const sub = (x.sub_account || classifyTaxPaymentSubAccount(x.tax_type)) as keyof typeof sums;
      const amt = Number(x.pay_amount || 0);
      sums[sub] += amt;
      counts[sub] += 1;
      if (
        sub === "법인세" &&
        (/중간예납/.test(String(x.tax_type || "")) || String(x.pay_date || "").slice(5, 7) === "08")
      ) {
        interimCorp += amt;
      }
    }

    const wth = counts.원천세 > 0 ? sums.원천세 : Number(rem?.tax_withholding || 0);
    const vat = counts.부가세 > 0 ? sums.부가세 : Number(rem?.tax_vat || 0);
    const corp = counts.법인세 > 0 ? sums.법인세 : Number(rem?.tax_corporate || 0);
    const pay = counts.납부항목 > 0 ? sums.납부항목 : Number(rem?.tax_payment || 0);
    const dedCorp = Math.max(0, corp - interimCorp);
    priorTaxTotal += useTotal ? wth + vat + dedCorp + pay : wth + dedCorp + pay;
  }

  return priorRev - priorCogs - priorPayroll - priorOpex - priorTaxTotal;
}

export async function buildFinancialReportPayload(
  input: BuildFinancialReportInput
): Promise<FinancialReportPayload> {
  const {
    pool, year, entityType, amountBasis, currentYearStr, endCutoff, remarkRow,
    invRows, bankRows, taxPayRows, attrTaxPayRows, activeRentalAssets,
    cashEnding, cashEndingCorp, cashEndingIndiv, cashBeginning,
  } = input;

  const taxItems: FinancialTaxItems = { ...input.taxItems };
  const details: FinancialDetailItem[] = [];

  // 3. 세금계산서 분류 적재 (예정/미수금 포함 정상 처리 가정)
  const { accountsReceivable, accountsPayable, accountsReceivableItems, accountsPayableItems } =
    classifyTaxInvoices(invRows, details);

  // 4. 통장 입출금(급여, 4대보험, 카드/경비 등) 분류 적재 및 현금흐름(CF) 집계
  const cfFlows = accumulateBankTransactions(bankRows, details);

  // 4-2. 국세청 납부세액(erp_tax_payments) 전표 적재 (귀속연도 기준 매칭)
  const interimPrepaidCorpTax = appendTaxPaymentDetails(attrTaxPayRows, year, details);

  // 5. 대상 월 목록 구성
  const monthSet = new Set<string>();
  if (year !== "ALL") {
    for (let m = 1; m <= 12; m++) monthSet.add(`${year}-${String(m).padStart(2, "0")}`);
  } else {
    for (const d of details) if (d.yearMonth) monthSet.add(d.yearMonth);
    for (const ast of activeRentalAssets) {
      if (ast.acquisition_date) monthSet.add(String(ast.acquisition_date).slice(0, 7));
    }
  }
  const months = Array.from(monthSet).sort();
  const lastReportYm = months.length > 0 ? months[months.length - 1] : `${currentYearStr}-12`;
  const bsDepreciationCutoff = year === "ALL" ? `${lastReportYm}-31` : endCutoff;

  let tangibleAssets = 0;
  let accumDepreciation = 0;
  for (const ast of activeRentalAssets) {
    // 기준일 이전에 파손/폐기 완료된 자산은 기말 BS 총유형자산 및 감가상각누계액에서 제각
    if (ast.disposed_date && String(ast.disposed_date).slice(0, 7) <= bsDepreciationCutoff.slice(0, 7)) {
      continue;
    }
    tangibleAssets += Number(ast.acquisition_cost || 0);
    accumDepreciation += computeAssetAccumDeprecAsOf(ast, bsDepreciationCutoff);
  }

  // 5-2. 임대용 자산 월별 감가상각비(정액법) 전표 생성 및 매출원가(임대자산 감가상각비) 반영
  const rentalSaleInvoicesForSchedule = invRows.filter(
    (r) => r.io_type === "SALE" && r.domain_type === "RENTAL"
  );
  const { monthTotalOwnedRevenueMap } = buildRentalSalesSeparationAndModelRevenue(
    rentalSaleInvoicesForSchedule
  );
  const depreciationSchedule = buildMonthlyAssetRollForwardSchedule(
    activeRentalAssets,
    months,
    monthTotalOwnedRevenueMap
  );
  appendRentalDepreciationDetails(activeRentalAssets, months, details);

  // 6. 계정과목별 월별 매트릭스 집계
  const useTotal = amountBasis === "TOTAL";
  const rowMap = new Map<string, AccountRow>();
  const ensureRow = (majorAccount: MajorAccountKey, subAccount: string): AccountRow => {
    const key = `${majorAccount}__${subAccount}`;
    if (!rowMap.has(key)) {
      const monthly: Record<string, number> = {};
      for (const m of months) monthly[m] = 0;
      rowMap.set(key, { majorAccount, subAccount, monthly, total: 0, count: 0 });
    }
    return rowMap.get(key)!;
  };

  for (const [maj, subs] of DEFAULT_SUB_ACCOUNT_GROUPS) {
    for (const sub of subs) ensureRow(maj, sub);
  }

  const monthlyTotals: Record<string, MonthlyTotal> = {};
  for (const m of months) {
    monthlyTotals[m] = {
      revenue: 0, cogs: 0, grossProfit: 0, payroll: 0, opex: 0,
      operatingProfit: 0, taxDues: 0, netOperatingCash: 0, nonOp: 0,
    };
  }

  for (const d of details) {
    if (!monthlyTotals[d.yearMonth]) continue;
    const val = useTotal ? d.totalAmount : d.supplyAmount;
    const r = ensureRow(d.majorAccount, d.subAccount);
    r.monthly[d.yearMonth] = (r.monthly[d.yearMonth] || 0) + val;
    r.total += val;
    r.count += 1;

    const mt = monthlyTotals[d.yearMonth];
    if (d.majorAccount === "REVENUE") mt.revenue += val;
    else if (d.majorAccount === "COGS") mt.cogs += val;
    else if (d.majorAccount === "PAYROLL") mt.payroll += val;
    else if (d.majorAccount === "OPEX") mt.opex += val;
    else if (d.majorAccount === "TAX_DUES") mt.taxDues += val;
    else if (d.majorAccount === "NON_OP") mt.nonOp += val;
  }

  // 세무 항목: 국세청 납부내역(erp_tax_payments)이 있으면 해당 합계를 우선 반영, 없으면 remark 기본값 반영
  const rWth = ensureRow("TAX_DUES", "원천세");
  const rVat = ensureRow("TAX_DUES", "부가세");
  const rCorp = ensureRow("TAX_DUES", "법인세");
  const rPay = ensureRow("TAX_DUES", "납부항목");

  if (rWth.count > 0) taxItems.withholdingTax = rWth.total;
  else rWth.total = taxItems.withholdingTax;
  if (rVat.count > 0) taxItems.vatTax = rVat.total;
  else rVat.total = taxItems.vatTax;
  if (rCorp.count > 0) taxItems.corporateTax = rCorp.total;
  else rCorp.total = taxItems.corporateTax;
  if (rPay.count > 0) taxItems.taxPayment = rPay.total;
  else rPay.total = taxItems.taxPayment;

  let grandRevenue = 0;
  let grandCogs = 0;
  let grandPayroll = 0;
  let grandOpex = 0;
  const grandTaxDues =
    taxItems.withholdingTax + taxItems.vatTax + taxItems.corporateTax + taxItems.taxPayment;

  // CF(현금흐름표) 세무 유출은 실제 해당 연도 통장 납부일(pay_date) 기준 집계
  let cfWthOutflow = 0;
  let cfVatOutflow = 0;
  let cfCorpOutflow = 0;
  let cfPayOutflow = 0;
  if (taxPayRows.length > 0) {
    for (const r of taxPayRows) {
      const sub = r.sub_account || classifyTaxPaymentSubAccount(r.tax_type);
      const amt = Number(r.pay_amount || 0);
      if (sub === "원천세") cfWthOutflow += amt;
      else if (sub === "부가세") cfVatOutflow += amt;
      else if (sub === "법인세") cfCorpOutflow += amt;
      else cfPayOutflow += amt;
    }
  } else {
    cfWthOutflow = taxItems.withholdingTax;
    cfVatOutflow = taxItems.vatTax;
    cfCorpOutflow = taxItems.corporateTax;
    cfPayOutflow = taxItems.taxPayment;
  }
  const cfTaxOutflow = cfWthOutflow + cfVatOutflow + cfCorpOutflow + cfPayOutflow;

  const deductibleCorpTax = Math.max(0, taxItems.corporateTax - interimPrepaidCorpTax);
  const plDeductibleTaxTotal = useTotal
    ? grandTaxDues - interimPrepaidCorpTax
    : taxItems.withholdingTax + deductibleCorpTax + taxItems.taxPayment;
  let grandNonOp = 0;

  for (const m of months) {
    const mt = monthlyTotals[m];
    mt.grossProfit = mt.revenue - mt.cogs;
    mt.operatingProfit = mt.grossProfit - mt.payroll - mt.opex;
    const mWthTax = rWth.monthly[m] || 0;
    const mRawCorpTax = rCorp.monthly[m] || 0;
    const mCorpTax =
      m.endsWith("-08") && interimPrepaidCorpTax > 0
        ? Math.max(0, mRawCorpTax - interimPrepaidCorpTax)
        : mRawCorpTax;
    const mPayTax = rPay.monthly[m] || 0;
    const mDeductibleTax = useTotal
      ? (rVat.monthly[m] || 0) + mWthTax + mCorpTax + mPayTax
      : mWthTax + mCorpTax + mPayTax;
    mt.netOperatingCash = mt.operatingProfit - mDeductibleTax;

    grandRevenue += mt.revenue;
    grandCogs += mt.cogs;
    grandPayroll += mt.payroll;
    grandOpex += mt.opex;
    grandNonOp += mt.nonOp;
  }

  const grandGrossProfit = grandRevenue - grandCogs;
  const grandOperatingProfit = grandGrossProfit - grandPayroll - grandOpex;
  const grandNetIncome = grandOperatingProfit - plDeductibleTaxTotal;

  // 7. 재무제표 (BS / PL / CF / Remark) 구조 생성
  const allRows = Array.from(rowMap.values());
  const plStatement: StatementsData["pl"] = {
    revenue: grandRevenue,
    revenueSub: allRows.filter((r) => r.majorAccount === "REVENUE"),
    cogs: grandCogs,
    cogsSub: allRows.filter((r) => r.majorAccount === "COGS"),
    grossProfit: grandGrossProfit,
    grossMarginRate: grandRevenue > 0 ? Number(((grandGrossProfit / grandRevenue) * 100).toFixed(1)) : 0,
    payroll: grandPayroll,
    payrollSub: allRows.filter((r) => r.majorAccount === "PAYROLL"),
    opex: grandOpex,
    opexSub: allRows.filter((r) => r.majorAccount === "OPEX"),
    operatingProfit: grandOperatingProfit,
    operatingMarginRate:
      grandRevenue > 0 ? Number(((grandOperatingProfit / grandRevenue) * 100).toFixed(1)) : 0,
    taxItems: {
      withholdingTax: taxItems.withholdingTax,
      vatTax: taxItems.vatTax,
      corporateTax: taxItems.corporateTax,
      taxPayment: taxItems.taxPayment,
      totalTax: grandTaxDues,
    },
    netIncome: grandNetIncome,
    netMarginRate: grandRevenue > 0 ? Number(((grandNetIncome / grandRevenue) * 100).toFixed(1)) : 0,
  };

  // [BS: 재무상태표]
  const isBeforeCorpEstablishment = endCutoff < BUSINESS_ENTITIES.CORP.openDate;
  const isOpeningYear =
    year === "ALL" ||
    (entityType === "CORP" && Number(year) <= 2024) ||
    (entityType !== "CORP" && Number(year) <= 2023);

  const retainedEarningsBefore =
    !isOpeningYear && year !== "ALL"
      ? await computePriorRetainedEarnings({ pool, year, entityType, useTotal, activeRentalAssets })
      : 0;

  const capitalStock =
    entityType === "INDIVIDUAL" || isBeforeCorpEstablishment
      ? BUSINESS_ENTITIES.INDIVIDUAL.capitalStock
      : BUSINESS_ENTITIES.CORP.capitalStock;
  const currentTermNetIncome = grandNetIncome;
  const totalEquity = capitalStock + retainedEarningsBefore + currentTermNetIncome;

  // 당기 2기(07~12월) 실제 매출세액 - 매입세액 - 기납부세액(예정고지)으로 부가세 예수금/대급금 산출
  let q2SaleVat = 0;
  let q2PurchaseVat = 0;
  for (const row of invRows) {
    if (Number(String(row.issue_date || "").slice(5, 7)) >= 7) {
      const v = Number(row.vat_amount || 0);
      if (row.io_type === "SALE") q2SaleVat += v;
      else q2PurchaseVat += v;
    }
  }
  let q2CardDeductibleVat = 0;
  for (const row of bankRows) {
    if (Number(String(row.trans_date || "").slice(5, 7)) < 7) continue;
    const mType = String(row.matched_type || "");
    if (mType === "SALE_INVOICE" || mType === "PURCHASE_INVOICE" || mType === "PAYROLL") continue;
    const ch = String(row.tx_channel || "").trim();
    const sr = String(row.sender_receiver || "").trim();
    if (
      ch === "체크" ||
      ch === "CC" ||
      ch === "BC" ||
      /비씨카드|컴퓨존|옥션|G마켓|11번가|쿠팡|네이버/.test(sr)
    ) {
      q2CardDeductibleVat += Math.round(
        (Number(row.withdrawal_amount || 0) - Number(row.deposit_amount || 0)) / 11
      );
    }
  }
  let q2PrepaidVatTax = 0;
  for (const row of taxPayRows) {
    const mo = Number(String(row.pay_date || "").slice(5, 7));
    const subAcc = row.sub_account || classifyTaxPaymentSubAccount(row.tax_type);
    if (mo >= 10 && subAcc === "부가세") q2PrepaidVatTax += Number(row.pay_amount || 0);
  }

  const netQ2Vat = q2SaleVat - q2PurchaseVat - q2CardDeductibleVat - q2PrepaidVatTax;
  const vatPrepaid = (netQ2Vat < 0 ? Math.abs(netQ2Vat) : 0) + interimPrepaidCorpTax;
  const vatTaxPayable = netQ2Vat > 0 ? netQ2Vat : 0;

  let endWthTaxPayable = 0;
  let endCorpTaxPayable = 0;
  if (year !== "ALL") {
    for (const row of attrTaxPayRows) {
      const payYr = String(row.pay_date || "").slice(0, 4);
      const attrYr = String(row.attribution_year || payYr);
      if (attrYr === String(year) && Number(payYr) > Number(year)) {
        const subAcc = row.sub_account || classifyTaxPaymentSubAccount(row.tax_type);
        const amt = Number(row.pay_amount || 0);
        if (subAcc === "원천세") endWthTaxPayable += amt;
        else if (subAcc === "법인세") endCorpTaxPayable += amt;
      }
    }
  }

  const leaseDeposit =
    !isBeforeCorpEstablishment && (entityType === "CORP" || entityType === "ALL") ? 5000000 : 0;
  const nonCurrentAssets = leaseDeposit + Math.max(0, tangibleAssets - accumDepreciation);
  const currentAssets = cashEnding + accountsReceivable + vatPrepaid;
  const totalAssets = currentAssets + nonCurrentAssets;
  const currentLiabilities = accountsPayable + endWthTaxPayable + vatTaxPayable + endCorpTaxPayable;
  const totalLiabilities = currentLiabilities;

  const bsStatement: StatementsData["bs"] = {
    assets: {
      cashAndEquivalents: cashEnding, cashCorp: cashEndingCorp, cashIndiv: cashEndingIndiv,
      accountsReceivable, accountsReceivableItems, vatPrepaid, currentAssets,
      leaseDeposit, tangibleAssets, accumDepreciation, nonCurrentAssets, totalAssets,
    },
    liabilities: {
      accountsPayable, accountsPayableItems, withholdingTaxPayable: endWthTaxPayable,
      vatTaxPayable, corporateTaxPayable: endCorpTaxPayable, taxPaymentPayable: 0,
      currentLiabilities, nonCurrentLiabilities: 0, totalLiabilities,
    },
    equity: { capitalStock, retainedEarningsBefore, currentTermNetIncome, totalEquity },
  };

  // [CF: 현금흐름표]
  const operatingCashFlow =
    cfFlows.cfSaleInflow + cfFlows.cfOtherOperatingInflow -
    cfFlows.cfPurchaseOutflow - cfFlows.cfPayrollOutflow - cfFlows.cfOpexOutflow - cfTaxOutflow;

  const cfStatement: StatementsData["cf"] = {
    beginningCash: cashBeginning,
    operating: {
      saleInflow: cfFlows.cfSaleInflow, otherInflow: cfFlows.cfOtherOperatingInflow,
      purchaseOutflow: cfFlows.cfPurchaseOutflow, payrollOutflow: cfFlows.cfPayrollOutflow,
      opexOutflow: cfFlows.cfOpexOutflow, withholdingTaxOutflow: cfWthOutflow,
      vatTaxOutflow: cfVatOutflow, corporateTaxOutflow: cfCorpOutflow,
      taxPaymentOutflow: cfPayOutflow, netOperatingCashFlow: operatingCashFlow,
    },
    investing: {
      inflow: cfFlows.cfInvestingInflow, outflow: cfFlows.cfInvestingOutflow,
      netInvestingCashFlow: cfFlows.cfInvestingInflow - cfFlows.cfInvestingOutflow,
    },
    financing: {
      inflow: cfFlows.cfFinancingInflow, outflow: cfFlows.cfFinancingOutflow,
      netFinancingCashFlow: cfFlows.cfFinancingInflow - cfFlows.cfFinancingOutflow,
    },
    netCashChange: cashEnding - cashBeginning,
    endingCash: cashEnding,
  };

  return {
    success: true,
    year,
    entityType,
    amountBasis,
    months,
    accountRows: allRows.filter(
      (r) => r.majorAccount === "TAX_DUES" || r.count > 0 || r.total !== 0
    ),
    monthlyTotals,
    summary: {
      revenue: grandRevenue,
      cogs: grandCogs,
      grossProfit: grandGrossProfit,
      grossMarginRate: grandRevenue > 0 ? Number(((grandGrossProfit / grandRevenue) * 100).toFixed(1)) : 0,
      payroll: grandPayroll,
      opex: grandOpex,
      operatingProfit: grandOperatingProfit,
      operatingMarginRate:
        grandRevenue > 0 ? Number(((grandOperatingProfit / grandRevenue) * 100).toFixed(1)) : 0,
      taxDues: grandTaxDues,
      netOperatingCash: grandNetIncome,
      nonOp: grandNonOp,
    },
    statements: {
      bs: bsStatement,
      pl: plStatement,
      cf: cfStatement,
      remark: {
        text: remarkRow.remark_text || "",
        taxWithholding: taxItems.withholdingTax,
        taxVat: taxItems.vatTax,
        taxCorporate: taxItems.corporateTax,
        taxPayment: taxItems.taxPayment,
        updatedAt: remarkRow.updated_at || null,
      },
    },
    depreciationSchedule,
    details,
  };
}
