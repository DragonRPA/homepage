export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getErpPool } from "@/lib/supabaseErp";
import { resolveExplicitAccountSubject } from "@/lib/erpAccountSubjects";
import { BUSINESS_ENTITIES } from "@/lib/businessEntities";
import {
  parseXlsxBufferToRows,
  decodeTextBuffer,
  parseCsvOrTsvTextToRows,
} from "@/lib/ibkBankParser";

interface FinancialDetailItem {
  id: string;
  source: "TAX_INVOICE" | "BANK_TX" | "TAX_PAYMENT";
  entityType: "CORP" | "INDIVIDUAL";
  yearMonth: string;
  date: string;
  majorAccount: "REVENUE" | "COGS" | "PAYROLL" | "OPEX" | "TAX_DUES" | "NON_OP";
  subAccount: string;
  counterparty: string;
  description: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  refNo: string;
}

function classifyTaxPaymentSubAccount(taxTypeRaw: string): "원천세" | "부가세" | "법인세" | "납부항목" {
  const s = String(taxTypeRaw || "").trim();
  if (/근로소득|사업소득|퇴직소득|이자소득|배당소득|기타소득|원천|특별징수/.test(s)) return "원천세";
  if (/부가가치|부가세/.test(s)) return "부가세";
  if (/법인세|법인지방소득/.test(s)) return "법인세";
  return "납부항목";
}

function parseTaxPayDate(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "number") {
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  const digits = s.replace(/[^0-9]/g, "");
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return null;
}

function parseTaxPayNum(raw: any): number {
  if (typeof raw === "number") return Math.round(raw);
  const cleaned = String(raw || "").replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n);
}

interface ParsedTaxPaymentRow {
  entityType: "CORP" | "INDIVIDUAL";
  payDate: string;
  taxType: string;
  subAccount: "원천세" | "부가세" | "법인세" | "납부항목";
  taxpayerName: string;
  payAmount: number;
  electronicPayNo: string;
  attributionYear: string;
  taxOffice: string;
  nationalTax: number;
  educationTax: number;
  defenseTax: number;
  ruralSpecialTax: number;
  surcharge: number;
  remark: string;
}

function parseHometaxTaxPaymentRows(rows: string[][], defaultEntity: "CORP" | "INDIVIDUAL"): ParsedTaxPaymentRow[] {
  const results: ParsedTaxPaymentRow[] = [];
  if (!rows || rows.length === 0) return results;

  // Header indices (support multiple header rows in concatenated CSV/Excel)
  let colPayDate = 0;
  let colTaxType = 1;
  let colTaxpayer = 2;
  let colPayAmount = 3;
  let colEpayNo = 4;
  let colAttrYear = 5;
  let colOffice = 6;
  let colNational = 7;
  let colEdu = 8;
  let colDef = 9;
  let colRural = 10;
  let colSurcharge = 11;
  let colRemark = 12;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const joined = row.map((c) => String(c || "").replace(/\s+/g, "")).join("|");
    if (joined.includes("납부일자") && (joined.includes("세목") || joined.includes("납부세액"))) {
      const headers = row.map((h) => String(h || "").replace(/\s+/g, ""));
      const idxOf = (kws: string[], fallback: number) => {
        for (const kw of kws) {
          const idx = headers.findIndex((h) => h.includes(kw));
          if (idx >= 0) return idx;
        }
        return fallback;
      };
      colPayDate = idxOf(["납부일자", "납부일", "수납일자"], 0);
      colTaxType = idxOf(["세목"], 1);
      colTaxpayer = idxOf(["납세자명", "상호", "성명"], 2);
      colPayAmount = idxOf(["납부세액", "수납세액", "납부금액"], 3);
      colEpayNo = idxOf(["전자납부번호", "납부번호"], 4);
      colAttrYear = idxOf(["귀속연도", "귀속년도"], 5);
      colOffice = idxOf(["수납관서", "관할세무서", "세무서"], 6);
      colNational = idxOf(["내국세액", "본세"], 7);
      colEdu = idxOf(["교육세액"], 8);
      colDef = idxOf(["방위세액"], 9);
      colRural = idxOf(["농어촌특별세액", "농특세"], 10);
      colSurcharge = idxOf(["가산금", "가산세"], 11);
      colRemark = idxOf(["비고"], 12);
      continue;
    }

    const payDate = parseTaxPayDate(row[colPayDate]);
    const taxType = String(row[colTaxType] || "").trim();
    const payAmount = parseTaxPayNum(row[colPayAmount]);
    if (!payDate || !taxType || payAmount === 0) continue;

    const taxpayerName = String(row[colTaxpayer] || "").trim();
    const epayRaw = String(row[colEpayNo] || "").trim();
    const electronicPayNo = epayRaw || `NTS-${payDate.replace(/-/g, "")}-${taxType}-${payAmount}-${r}`;
    const attrRaw = String(row[colAttrYear] || "").replace(/[^0-9]/g, "");
    const attributionYear = attrRaw.length === 4 ? attrRaw : payDate.slice(0, 4);
    const taxOffice = String(row[colOffice] || "").trim();
    const entityType: "CORP" | "INDIVIDUAL" = /주식회사|\(주\)|㈜/.test(taxpayerName)
      ? "CORP"
      : /\([^)]*\*+\)|이정용/.test(taxpayerName) || (taxpayerName.includes("드래곤알피에이") && !/주식회사|\(주\)|㈜/.test(taxpayerName))
      ? "INDIVIDUAL"
      : defaultEntity;

    results.push({
      entityType,
      payDate,
      taxType,
      subAccount: classifyTaxPaymentSubAccount(taxType),
      taxpayerName: taxpayerName || (entityType === "CORP" ? "주식회사 드래곤알피에이" : "드래곤알피에이"),
      payAmount,
      electronicPayNo,
      attributionYear,
      taxOffice,
      nationalTax: parseTaxPayNum(row[colNational]),
      educationTax: parseTaxPayNum(row[colEdu]),
      defenseTax: parseTaxPayNum(row[colDef]),
      ruralSpecialTax: parseTaxPayNum(row[colRural]),
      surcharge: parseTaxPayNum(row[colSurcharge]),
      remark: String(row[colRemark] || "").trim(),
    });
  }

  return results;
}

function classifyPurchaseInvoiceSubAccount(customerName: string, itemName: string, memo: string): {
  majorAccount: "COGS" | "OPEX";
  subAccount: string;
} {
  const c = (customerName || "").trim();
  const text = `${c} ${itemName || ""} ${memo || ""}`;

  // 판관비/고정비 성격 매입세금계산서
  if (/이명옥|관리단|공인중개사/.test(text)) {
    return { majorAccount: "OPEX", subAccount: "임차료·관리비" };
  }
  if (/귀뚜라미|에너지|도시가스|전력|수도/.test(text)) {
    return { majorAccount: "OPEX", subAccount: "수도광열비(공과금)" };
  }
  if (/세무회계|회계법인|법무|노무|한국정보인증/.test(text)) {
    return { majorAccount: "OPEX", subAccount: "세무·인증·수수료" };
  }
  if (/텔레콤|브로드밴드|케이티|엘지유플러스|통신/.test(text)) {
    return { majorAccount: "OPEX", subAccount: "통신비" };
  }
  if (/렌터카|자동차|금천서부자동차|주유|하이패스/.test(text)) {
    return { majorAccount: "OPEX", subAccount: "차량유지·렌트비" };
  }

  // 나머지는 상품·장비·외주·임차 원가 (COGS)
  if (/드래곤알피에이/.test(c)) {
    return { majorAccount: "COGS", subAccount: "관계사 매입·용역원가" };
  }
  if (/현대렌탈|엠디케이|에이브이랜드|탑렌탈|AJ네트웍스|비엔솔루션|어피니티/.test(c)) {
    return { majorAccount: "COGS", subAccount: "외주용역·전대임차원가" };
  }
  return { majorAccount: "COGS", subAccount: "상품·장비·자재매입원가" };
}

function classifyBankTxAccount(row: any): {
  majorAccount: "REVENUE" | "COGS" | "PAYROLL" | "OPEX" | "TAX_DUES" | "NON_OP";
  subAccount: string;
  sign: 1 | -1;
} | null {
  const entityType =
    row.entity_type || (String(row.account_no || "").includes("140") ? "INDIVIDUAL" : "CORP");
  const isMatched = Boolean(row.is_matched);
  const matchedType = String(row.matched_type || "");
  const matchedId = String(row.matched_id || "");
  const sr = String(row.sender_receiver || "").replace(/\u3000/g, " ").trim();
  const holder = String(row.counterparty_holder || "").replace(/\u3000/g, " ").trim();
  const txChannel = String(row.tx_channel || "").trim();
  const memo = String(row.memo || "").trim();
  const wAmt = Number(row.withdrawal_amount || 0);
  const dAmt = Number(row.deposit_amount || 0);
  const combined = `${sr} ${holder} ${memo}`;

  // 1. 이미 매출/매입 세금계산서와 매칭된 입출금은 세금계산서(발생주의)에서 집계하므로 이중집계 제외
  if (isMatched && (matchedType === "SALE_INVOICE" || matchedType === "PURCHASE_INVOICE")) {
    return null;
  }

  // 1-B. 사용자가 통장 입출금에 명시적으로 지정한 계정과목(ACCOUNT_SUBJECT)이 있으면 최우선 반영
  if (isMatched && matchedType === "ACCOUNT_SUBJECT" && matchedId) {
    // 세금과공과(원천세·부가세·법인세·납부항목)는 국세청 별도 조회값(초기 0원)으로 관리하므로 통장 자동합산에서 분리
    if (matchedId.includes("세금과공과") || matchedId === "WTH_TAX_PUBLIC") {
      return null;
    }
    const resolved = resolveExplicitAccountSubject(matchedId, dAmt > 0);
    if (resolved) {
      return resolved;
    }
  }

  // 2. 급여(PAYROLL) 매칭 건
  if (matchedType === "PAYROLL") {
    const isSeverance = /퇴직/.test(matchedId) || /퇴직/.test(sr);
    const isDaily = /일용|아르바이트/.test(matchedId) || /일용|아르바이트/.test(sr);
    const subAccount = isSeverance
      ? "퇴직급여·정산"
      : isDaily
      ? "일용직급여"
      : "임직원급여·수당";
    if (wAmt > 0) {
      return { majorAccount: "PAYROLL", subAccount, sign: 1 };
    }
    if (dAmt > 0) {
      return { majorAccount: "PAYROLL", subAccount, sign: -1 };
    }
    return null;
  }

  // 3. 4대보험 (국민연금, 국민건강, 고용보험, 산재보험, 국민건강보험공단)
  if (
    wAmt > 0 &&
    (/국민연금|국민건강|건강보험|고용보험|산재보험/.test(combined) ||
      holder.includes("국민건강보험공단"))
  ) {
    return { majorAccount: "PAYROLL", subAccount: "4대보험료(기관납부)", sign: 1 };
  }

  // 4. 가수금 / 대표자 자금 이동 / 법인전환 준비금 (자본·차입 이동 -> NON_OP)
  if (
    String(row.trans_date) === "2024-07-08" &&
    dAmt === BUSINESS_ENTITIES.CORP.capitalStock &&
    txChannel === "대체"
  ) {
    return {
      majorAccount: "NON_OP",
      subAccount: "자본금납입",
      sign: 1,
    };
  }
  if (/가수금|가수근|운영자금|법인준비/.test(combined)) {
    return {
      majorAccount: "NON_OP",
      subAccount: dAmt > 0 ? "가수금입금" : "가수금반환·자금이동",
      sign: 1,
    };
  }
  if (sr === "이정용" || holder === "이정용") {
    if (entityType === "INDIVIDUAL") {
      return {
        majorAccount: "NON_OP",
        subAccount: dAmt > 0 ? "대표자입금(개인계좌)" : "대표자인출(개인계좌)",
        sign: 1,
      };
    }
    if (dAmt > 0) {
      return {
        majorAccount: "NON_OP",
        subAccount: "가수금입금",
        sign: 1,
      };
    }
  }

  // 5. 예금이자 / 카드취소·정정 환급 등 입금
  if (dAmt > 0) {
    if (txChannel === "이자" || /결산이자|이자/.test(combined)) {
      return { majorAccount: "NON_OP", subAccount: "이자수익", sign: 1 };
    }
    if (txChannel === "취소" || txChannel === "정정" || /취소/.test(combined)) {
      if (/우정사업본부|우체국|SKT|케이티|KT|LGU|브로드밴드/.test(combined)) {
        return { majorAccount: "OPEX", subAccount: "통신비", sign: -1 };
      }
      if (/주유|석유|에너지|칼텍스|오일뱅크|주차|하이패스|쏘카|렌터카/.test(combined)) {
        return { majorAccount: "OPEX", subAccount: "차량유지·렌트비", sign: -1 };
      }
      if (/저작권|수수료|세무|회계|법무|등기|인증/.test(combined)) {
        return { majorAccount: "OPEX", subAccount: "세무·인증·수수료", sign: -1 };
      }
      return { majorAccount: "COGS", subAccount: "무증빙·카드 상품자재매입", sign: -1 };
    }
    if (/과오납|환급/.test(combined)) {
      return { majorAccount: "NON_OP", subAccount: "세금환급·과오납환입", sign: 1 };
    }
    return { majorAccount: "NON_OP", subAccount: "기타미매칭입금", sign: 1 };
  }

  if (wAmt <= 0) return null;

  // 6. 세금과공과 (부가세, 법인세, 원천세, 납부항목은 사용자 요청에 따라 0으로 초기화하고 국세청 별도 조회값으로 관리하므로 자동집계에서 분리)
  if (
    txChannel === "국세" ||
    txChannel === "지로" ||
    /국세|부가세|주민세|지방세|금천|노원|국고|세무서|서울시세입금/.test(combined)
  ) {
    // 사용자 요청: "원천세, 부가세와 법인세도 항목을 만들어서 포함해줘. 부가세, 법인세, 원천세, 납부항목은 값을 0으로 먼저 채워줘, 세무일정에 따른 값은 내가 국세청에서 따로 조회해서 요청할게."
    return null;
  }

  // 7. 미매칭 출금 중 하드웨어/전자상거래 자재 매입 (체크카드 등) vs 일반 판관비
  if (/컴퓨존|옥션|G마켓|11번가|지앤지커머스|도매꾹|메가커피|현대홈쇼핑|65 TV/.test(combined)) {
    return { majorAccount: "COGS", subAccount: "무증빙·카드 상품자재매입", sign: 1 };
  }

  if (txChannel === "BC" || /비씨카드|BC카드선결제/.test(combined)) {
    return { majorAccount: "OPEX", subAccount: "법인BC카드대금결제", sign: 1 };
  }

  if (/쿠팡|네이버페이|구글페이먼트|카카오/.test(combined)) {
    return { majorAccount: "OPEX", subAccount: "소모품·플랫폼·IT구독비", sign: 1 };
  }

  if (/도시가스|관리비|미소지움|이명옥/.test(combined)) {
    return { majorAccount: "OPEX", subAccount: "임차료·관리비·공과금(이체)", sign: 1 };
  }

  if (txChannel === "체크" || txChannel === "CC") {
    return { majorAccount: "OPEX", subAccount: "체크카드·현장운영경비", sign: 1 };
  }

  return { majorAccount: "OPEX", subAccount: "기타지급수수료·경비", sign: 1 };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || "2026"; // '2026' | '2025' | '2024' | '2023' | 'ALL'
    const entityType = searchParams.get("entityType") || "ALL"; // 'ALL' | 'CORP' | 'INDIVIDUAL'
    const amountBasis = searchParams.get("amountBasis") || "SUPPLY"; // 'SUPPLY' | 'TOTAL'

    const pool = getErpPool();

    // 0. 연도별 주석(remark) 및 세무 항목(원천세, 부가세, 법인세, 납부항목) 조회
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_financial_remarks (
        id SERIAL PRIMARY KEY,
        year VARCHAR(10) NOT NULL,
        entity_type VARCHAR(20) NOT NULL DEFAULT 'ALL',
        remark_text TEXT DEFAULT '',
        tax_withholding NUMERIC DEFAULT 0,
        tax_vat NUMERIC DEFAULT 0,
        tax_corporate NUMERIC DEFAULT 0,
        tax_payment NUMERIC DEFAULT 0,
        updated_by VARCHAR(100),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (year, entity_type)
      )
    `);

    const remarkRes = await pool.query(
      `SELECT remark_text,
              COALESCE(tax_withholding, 0)::numeric AS tax_withholding,
              COALESCE(tax_vat, 0)::numeric AS tax_vat,
              COALESCE(tax_corporate, 0)::numeric AS tax_corporate,
              COALESCE(tax_payment, 0)::numeric AS tax_payment,
              updated_at
       FROM erp_financial_remarks
       WHERE year = $1 AND entity_type = $2
       LIMIT 1`,
      [year, entityType]
    );

    const remarkRow = remarkRes.rows[0] || {
      remark_text: "",
      tax_withholding: 0,
      tax_vat: 0,
      tax_corporate: 0,
      tax_payment: 0,
      updated_at: null,
    };

    const taxItems = {
      withholdingTax: Number(remarkRow.tax_withholding || 0), // 원천세 (초기값 0)
      vatTax: Number(remarkRow.tax_vat || 0),                 // 부가세 (초기값 0)
      corporateTax: Number(remarkRow.tax_corporate || 0),     // 법인세 (초기값 0)
      taxPayment: Number(remarkRow.tax_payment || 0),         // 납부항목 (초기값 0)
    };

    // 0-2. 국세청 납부세액(erp_tax_payments) 테이블 생성 보장 및 조회
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_tax_payments (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(20) NOT NULL DEFAULT 'CORP',
        pay_date DATE NOT NULL,
        tax_type VARCHAR(100) NOT NULL,
        sub_account VARCHAR(50) NOT NULL,
        taxpayer_name VARCHAR(150),
        pay_amount NUMERIC DEFAULT 0,
        electronic_pay_no VARCHAR(100) UNIQUE,
        attribution_year VARCHAR(10),
        tax_office VARCHAR(100),
        national_tax NUMERIC DEFAULT 0,
        education_tax NUMERIC DEFAULT 0,
        defense_tax NUMERIC DEFAULT 0,
        rural_special_tax NUMERIC DEFAULT 0,
        surcharge NUMERIC DEFAULT 0,
        remark TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const taxPayParams: any[] = [];
    let taxPayWhere = `WHERE 1=1`;
    if (year !== "ALL") {
      taxPayParams.push(`${year}-%`);
      taxPayWhere += ` AND pay_date::text LIKE $${taxPayParams.length}`;
    }
    if (entityType !== "ALL") {
      taxPayParams.push(entityType);
      taxPayWhere += ` AND COALESCE(entity_type, 'CORP') = $${taxPayParams.length}`;
    }

    const taxPayRes = await pool.query(
      `SELECT id,
              COALESCE(entity_type, 'CORP') AS entity_type,
              pay_date::text AS pay_date,
              tax_type,
              sub_account,
              taxpayer_name,
              COALESCE(pay_amount, 0)::numeric AS pay_amount,
              electronic_pay_no,
              attribution_year,
              tax_office,
              remark
       FROM erp_tax_payments
       ${taxPayWhere}
       ORDER BY pay_date ASC, id ASC`,
      taxPayParams
    );

    // 1. 세금계산서 조회 (매출 + 매입)
    const invParams: any[] = [];
    let invWhere = `WHERE 1=1`;
    if (year !== "ALL") {
      invParams.push(`${year}-%`);
      invWhere += ` AND issue_date::text LIKE $${invParams.length}`;
    }
    if (entityType !== "ALL") {
      invParams.push(entityType);
      invWhere += ` AND COALESCE(supplier_entity_type, 'CORP') = $${invParams.length}`;
    }

    const invRes = await pool.query(
      `SELECT id, invoice_no, COALESCE(io_type, 'SALE') AS io_type,
              COALESCE(domain_type, 'OP_SERVICE') AS domain_type,
              COALESCE(supplier_entity_type, 'CORP') AS entity_type,
              issue_date::text AS issue_date,
              customer_name, item_name, memo,
              COALESCE(supply_amount, 0)::numeric AS supply_amount,
              COALESCE(vat_amount, 0)::numeric AS vat_amount,
              COALESCE(total_amount, 0)::numeric AS total_amount,
              COALESCE(settled_amount, 0)::numeric AS reconciled_amount,
              COALESCE(settlement_status, 'UNPAID') AS settlement_status
       FROM erp_tax_invoices
       ${invWhere}
       ORDER BY issue_date ASC, id ASC`,
      invParams
    );

    // 2. 통장 입출금 조회
    const bankParams: any[] = [];
    let bankWhere = `WHERE 1=1`;
    if (year !== "ALL") {
      bankParams.push(`${year}-%`);
      bankWhere += ` AND trans_date::text LIKE $${bankParams.length}`;
    }
    if (entityType !== "ALL") {
      bankParams.push(entityType);
      bankWhere += ` AND COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) = $${bankParams.length}`;
    }

    const bankRes = await pool.query(
      `SELECT id,
              COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) AS entity_type,
              account_no, trans_date::text AS trans_date, trans_time, trans_type,
              COALESCE(withdrawal_amount, 0)::numeric AS withdrawal_amount,
              COALESCE(deposit_amount, 0)::numeric AS deposit_amount,
              COALESCE(balance_after, 0)::numeric AS balance_after,
              sender_receiver, counterparty_holder, counterparty_bank, counterparty_account,
              tx_channel, memo, is_matched, matched_type, matched_id
       FROM erp_bank_transactions
       ${bankWhere}
       ORDER BY trans_date ASC, trans_time ASC, id ASC`,
      bankParams
    );

    // 2-2. BS/CF 구성을 위한 기초·기말 통장 잔액 조회 (연도 기준)
    const endCutoff = year === "ALL" ? "2099-12-31" : `${year}-12-31`;
    const startCutoff = year === "ALL" ? "1900-01-01" : `${Number(year) - 1}-12-31`;

    const balEndRes = await pool.query(
      `SELECT DISTINCT ON (account_no)
              account_no,
              COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) AS entity_type,
              COALESCE(balance_after, 0)::numeric AS balance_after,
              trans_date::text AS trans_date
       FROM erp_bank_transactions
       WHERE trans_date <= $1
       ORDER BY account_no, trans_date DESC, trans_time DESC, id DESC`,
      [endCutoff]
    );

    const balStartRes = await pool.query(
      `SELECT DISTINCT ON (account_no)
              account_no,
              COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) AS entity_type,
              COALESCE(balance_after, 0)::numeric AS balance_after,
              trans_date::text AS trans_date
       FROM erp_bank_transactions
       WHERE trans_date <= $1
       ORDER BY account_no, trans_date DESC, trans_time DESC, id DESC`,
      [startCutoff]
    );

    let cashEnding = 0;
    let cashEndingCorp = 0;
    let cashEndingIndiv = 0;
    for (const r of balEndRes.rows) {
      if (entityType !== "ALL" && r.entity_type !== entityType) continue;
      const b = Number(r.balance_after || 0);
      cashEnding += b;
      if (r.entity_type === "CORP") cashEndingCorp += b;
      else cashEndingIndiv += b;
    }

    let cashBeginning = 0;
    for (const r of balStartRes.rows) {
      if (entityType !== "ALL" && r.entity_type !== entityType) continue;
      cashBeginning += Number(r.balance_after || 0);
    }

    // 2-3. 유형자산(렌탈자산) 조회 (BS 비유동자산용, 기준일 이전 취득분)
    const rentalAssetRes = await pool
      .query(
        `
        SELECT COALESCE(SUM(acquisition_cost), 0)::numeric AS rental_assets,
               COALESCE(SUM(accumulated_depreciation), 0)::numeric AS accum_dep
        FROM erp_rental_assets
        WHERE acquisition_date <= $1::date
      `,
        [endCutoff]
      )
      .catch(() => ({ rows: [{ rental_assets: 0, accum_dep: 0 }] }));

    const tangibleAssets = Number(rentalAssetRes.rows[0]?.rental_assets || 0);
    const accumDepreciation = Number(rentalAssetRes.rows[0]?.accum_dep || 0);

    const details: FinancialDetailItem[] = [];

    // 채권(매출 미수금) / 채무(매입 미지급금) 집계 (BS용)
    let accountsReceivable = 0;
    let accountsPayable = 0;

    // 3. 세금계산서 분류 적재 (예정/미수금 포함 정상 처리 가정)
    for (const row of invRes.rows) {
      const ym = String(row.issue_date).slice(0, 7);
      const supply = Number(row.supply_amount || 0);
      const vat = Number(row.vat_amount || 0);
      const total = Number(row.total_amount || supply + vat);
      const reconciled = Number(row.reconciled_amount || 0);
      const remain = row.settlement_status === "PAID" ? 0 : Math.max(0, total - reconciled);
      const ent = (row.entity_type === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP") as "CORP" | "INDIVIDUAL";

      if (row.io_type === "SALE") {
        accountsReceivable += remain;
        let subAccount = "운영·유지보수 용역매출";
        if (row.domain_type === "RENTAL") subAccount = "렌탈·임대 매출";
        else if (row.domain_type === "TRADE_SALE") subAccount = "상품·장비 판매매출";
        else if (row.domain_type === "DEV_SERVICE") subAccount = "SI·개발 용역매출";

        details.push({
          id: `INV-${row.id}`,
          source: "TAX_INVOICE",
          entityType: ent,
          yearMonth: ym,
          date: row.issue_date,
          majorAccount: "REVENUE",
          subAccount,
          counterparty: row.customer_name || "-",
          description: row.item_name || row.memo || "매출 세금계산서",
          supplyAmount: supply,
          vatAmount: vat,
          totalAmount: total,
          status: row.settlement_status === "PAID" ? "수납완료" : "수납예정(정상가정)",
          refNo: row.invoice_no || `INV-${row.id}`,
        });
      } else {
        accountsPayable += remain;
        const cls = classifyPurchaseInvoiceSubAccount(
          row.customer_name || "",
          row.item_name || "",
          row.memo || ""
        );
        details.push({
          id: `INV-${row.id}`,
          source: "TAX_INVOICE",
          entityType: ent,
          yearMonth: ym,
          date: row.issue_date,
          majorAccount: cls.majorAccount,
          subAccount: cls.subAccount,
          counterparty: row.customer_name || "-",
          description: row.item_name || row.memo || "매입 세금계산서",
          supplyAmount: supply,
          vatAmount: vat,
          totalAmount: total,
          status: row.settlement_status === "PAID" ? "지급완료" : "지급예정(정상가정)",
          refNo: row.invoice_no || `INV-${row.id}`,
        });
      }
    }

    // 4. 통장 입출금(급여, 4대보험, 카드/경비 등) 분류 적재 및 현금흐름(CF) 집계
    let cfSaleInflow = 0;
    let cfOtherOperatingInflow = 0;
    let cfPurchaseOutflow = 0;
    let cfPayrollOutflow = 0;
    let cfOpexOutflow = 0;
    let cfTaxOutflow = taxItems.withholdingTax + taxItems.vatTax + taxItems.corporateTax + taxItems.taxPayment;
    let cfInvestingInflow = 0;
    let cfInvestingOutflow = 0;
    let cfFinancingInflow = 0;
    let cfFinancingOutflow = 0;

    for (const row of bankRes.rows) {
      const wAmt = Number(row.withdrawal_amount || 0);
      const dAmt = Number(row.deposit_amount || 0);
      const isMatched = Boolean(row.is_matched);
      const matchedType = String(row.matched_type || "");
      const sr = String(row.sender_receiver || "").replace(/\u3000/g, " ").trim();
      const holder = String(row.counterparty_holder || "").replace(/\u3000/g, " ").trim();
      const memo = String(row.memo || "").trim();
      const combined = `${sr} ${holder} ${memo}`;

      // CF (현금흐름표) 실제 통장 입출금 기준 집계
      const cls = classifyBankTxAccount(row);
      if (isMatched && matchedType === "SALE_INVOICE") {
        cfSaleInflow += dAmt;
      } else if (isMatched && matchedType === "PURCHASE_INVOICE") {
        cfPurchaseOutflow += wAmt;
      } else if (
        cls &&
        /자본금|가수금|대표자/.test(cls.subAccount)
      ) {
        cfFinancingInflow += dAmt;
        cfFinancingOutflow += wAmt;
      } else if (cls) {
        if (cls.majorAccount === "PAYROLL") {
          cfPayrollOutflow += wAmt - dAmt;
        } else if (cls.majorAccount === "COGS") {
          cfPurchaseOutflow += wAmt - dAmt;
        } else if (cls.majorAccount === "OPEX") {
          cfOpexOutflow += wAmt - dAmt;
        } else if (cls.majorAccount === "NON_OP") {
          cfOtherOperatingInflow += dAmt;
        }
      }

      if (!cls) continue;

      const ym = String(row.trans_date).slice(0, 7);
      const rawAmt = wAmt > 0 ? wAmt : dAmt;
      const signedAmt = rawAmt * cls.sign;
      const ent = (row.entity_type === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP") as "CORP" | "INDIVIDUAL";

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
        supplyAmount: signedAmt,
        vatAmount: 0,
        totalAmount: signedAmt,
        status: row.is_matched ? `매칭완료 (${row.matched_id || row.matched_type})` : "통장집행",
        refNo: row.matched_id || `${row.tx_channel || "통장"}-${row.id}`,
      });
    }

    // 4-2. 국세청 납부세액(erp_tax_payments) 전표 적재
    for (const row of taxPayRes.rows) {
      const ym = String(row.pay_date).slice(0, 7);
      const amt = Number(row.pay_amount || 0);
      const ent = (row.entity_type === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP") as "CORP" | "INDIVIDUAL";
      const subAcc = (row.sub_account || classifyTaxPaymentSubAccount(row.tax_type)) as
        | "원천세"
        | "부가세"
        | "법인세"
        | "납부항목";

      details.push({
        id: `TAXPAY-${row.id}`,
        source: "TAX_PAYMENT",
        entityType: ent,
        yearMonth: ym,
        date: row.pay_date,
        majorAccount: "TAX_DUES",
        subAccount: subAcc,
        counterparty: row.tax_office ? `국세청 (${row.tax_office})` : "국세청",
        description: `${row.tax_type}${row.attribution_year ? ` [귀속:${row.attribution_year}년]` : ""}${row.electronic_pay_no ? ` (${row.electronic_pay_no})` : ""}`,
        supplyAmount: amt,
        vatAmount: 0,
        totalAmount: amt,
        status: "납부완료",
        refNo: row.electronic_pay_no || `TAX-${row.id}`,
      });
    }

    // 5. 대상 월 목록 구성
    const monthSet = new Set<string>();
    if (year !== "ALL") {
      for (let m = 1; m <= 12; m++) {
        monthSet.add(`${year}-${String(m).padStart(2, "0")}`);
      }
    } else {
      for (const d of details) {
        if (d.yearMonth) monthSet.add(d.yearMonth);
      }
    }
    const months = Array.from(monthSet).sort();

    // 6. 계정과목별 월별 매트릭스 집계
    const useTotal = amountBasis === "TOTAL";
    const getVal = (d: FinancialDetailItem) => (useTotal ? d.totalAmount : d.supplyAmount);

    interface AccountRow {
      majorAccount: "REVENUE" | "COGS" | "PAYROLL" | "OPEX" | "TAX_DUES" | "NON_OP";
      subAccount: string;
      monthly: Record<string, number>;
      total: number;
      count: number;
    }

    const rowMap = new Map<string, AccountRow>();
    const ensureRow = (
      majorAccount: AccountRow["majorAccount"],
      subAccount: string
    ): AccountRow => {
      const key = `${majorAccount}__${subAccount}`;
      if (!rowMap.has(key)) {
        const monthly: Record<string, number> = {};
        for (const m of months) monthly[m] = 0;
        rowMap.set(key, { majorAccount, subAccount, monthly, total: 0, count: 0 });
      }
      return rowMap.get(key)!;
    };

    // 기본 표준 하위계정 미리 생성하여 표 구조 일관성 유지 (원천세, 부가세, 법인세, 납부항목 기본 0원 포함)
    const defaultSubAccounts: Array<[AccountRow["majorAccount"], string]> = [
      ["REVENUE", "운영·유지보수 용역매출"],
      ["REVENUE", "상품·장비 판매매출"],
      ["REVENUE", "렌탈·임대 매출"],
      ["REVENUE", "SI·개발 용역매출"],
      ["COGS", "관계사 매입·용역원가"],
      ["COGS", "외주용역·전대임차원가"],
      ["COGS", "상품·장비·자재매입원가"],
      ["COGS", "무증빙·카드 상품자재매입"],
      ["PAYROLL", "임직원급여·수당"],
      ["PAYROLL", "퇴직급여·정산"],
      ["PAYROLL", "일용직급여"],
      ["PAYROLL", "4대보험료(기관납부)"],
      ["OPEX", "복리후생비(식대·다과·경조사)"],
      ["OPEX", "임차료·관리비"],
      ["OPEX", "통신비"],
      ["OPEX", "차량유지·렌트비"],
      ["OPEX", "세무·인증·수수료"],
      ["OPEX", "수도광열비(공과금)"],
      ["OPEX", "법인BC카드대금결제"],
      ["OPEX", "소모품·플랫폼·IT구독비"],
      ["OPEX", "체크카드·현장운영경비"],
      ["OPEX", "기타지급수수료·경비"],
      ["TAX_DUES", "원천세"],
      ["TAX_DUES", "부가세"],
      ["TAX_DUES", "법인세"],
      ["TAX_DUES", "납부항목"],
    ];
    for (const [maj, sub] of defaultSubAccounts) {
      ensureRow(maj, sub);
    }

    const monthlyTotals: Record<
      string,
      {
        revenue: number;
        cogs: number;
        grossProfit: number;
        payroll: number;
        opex: number;
        operatingProfit: number;
        taxDues: number;
        netOperatingCash: number;
        nonOp: number;
      }
    > = {};

    for (const m of months) {
      monthlyTotals[m] = {
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        payroll: 0,
        opex: 0,
        operatingProfit: 0,
        taxDues: 0,
        netOperatingCash: 0,
        nonOp: 0,
      };
    }

    for (const d of details) {
      if (!monthlyTotals[d.yearMonth]) continue;
      const val = getVal(d);
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

    // 세무 항목(원천세, 부가세, 법인세, 납부항목): 국세청 납부내역(erp_tax_payments)이 있으면 해당 합계를 우선 반영하고, 없으면 수동 입력(remark) 기본값을 반영
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
    let grandTaxDues =
      taxItems.withholdingTax +
      taxItems.vatTax +
      taxItems.corporateTax +
      taxItems.taxPayment;
    cfTaxOutflow = grandTaxDues;
    let grandNonOp = 0;

    for (const m of months) {
      const mt = monthlyTotals[m];
      mt.grossProfit = mt.revenue - mt.cogs;
      mt.operatingProfit = mt.grossProfit - mt.payroll - mt.opex;
      mt.netOperatingCash = mt.operatingProfit - mt.taxDues;

      grandRevenue += mt.revenue;
      grandCogs += mt.cogs;
      grandPayroll += mt.payroll;
      grandOpex += mt.opex;
      grandNonOp += mt.nonOp;
    }

    const grandGrossProfit = grandRevenue - grandCogs;
    const grandOperatingProfit = grandGrossProfit - grandPayroll - grandOpex;
    const grandNetIncome = grandOperatingProfit - grandTaxDues;

    // 7. 재무제표 (BS / PL / CF / Remark) 구조 생성
    // [PL: 손익계산서]
    const plStatement = {
      revenue: grandRevenue,
      revenueSub: Array.from(rowMap.values()).filter((r) => r.majorAccount === "REVENUE"),
      cogs: grandCogs,
      cogsSub: Array.from(rowMap.values()).filter((r) => r.majorAccount === "COGS"),
      grossProfit: grandGrossProfit,
      grossMarginRate: grandRevenue > 0 ? Number(((grandGrossProfit / grandRevenue) * 100).toFixed(1)) : 0,
      payroll: grandPayroll,
      payrollSub: Array.from(rowMap.values()).filter((r) => r.majorAccount === "PAYROLL"),
      opex: grandOpex,
      opexSub: Array.from(rowMap.values()).filter((r) => r.majorAccount === "OPEX"),
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

    // [BS: 재무상태표 (자산 = 부채 + 자본 보존 항등식)]
    // 국세청 납부세액(taxItems)은 이미 통장에서 납부 완료된 세액(PL 비용 및 CF 유출)이므로 기말 미지급 유동부채에는 가산하지 않음
    const currentAssets = cashEnding + accountsReceivable;
    const nonCurrentAssets = Math.max(0, tangibleAssets - accumDepreciation);
    const totalAssets = currentAssets + nonCurrentAssets;

    const currentLiabilities = accountsPayable;
    const nonCurrentLiabilities = 0; // 가수금 1회 반환 완료로 0원
    const totalLiabilities = currentLiabilities + nonCurrentLiabilities;

    const isBeforeCorpEstablishment = endCutoff < BUSINESS_ENTITIES.CORP.openDate;
    const capitalStock =
      entityType === "INDIVIDUAL" || isBeforeCorpEstablishment
        ? BUSINESS_ENTITIES.INDIVIDUAL.capitalStock
        : BUSINESS_ENTITIES.CORP.capitalStock;
    const currentTermNetIncome = grandNetIncome;
    const retainedEarningsBefore = totalAssets - totalLiabilities - capitalStock - currentTermNetIncome;
    const totalEquity = totalAssets - totalLiabilities;

    const bsStatement = {
      assets: {
        cashAndEquivalents: cashEnding,
        cashCorp: cashEndingCorp,
        cashIndiv: cashEndingIndiv,
        accountsReceivable,
        vatPrepaid: 0, // 부가세 대급금 (초기 0)
        currentAssets,
        tangibleAssets,
        accumDepreciation,
        nonCurrentAssets,
        totalAssets,
      },
      liabilities: {
        accountsPayable,
        withholdingTaxPayable: 0, // 기납부 세액은 PL/CF 반영 완료 (기말 미지급 예수금 0)
        vatTaxPayable: 0,
        corporateTaxPayable: 0,
        taxPaymentPayable: 0,
        currentLiabilities,
        nonCurrentLiabilities,
        totalLiabilities,
      },
      equity: {
        capitalStock,
        retainedEarningsBefore,
        currentTermNetIncome,
        totalEquity,
      },
    };

    // [CF: 현금흐름표]
    const operatingCashFlow =
      cfSaleInflow +
      cfOtherOperatingInflow -
      cfPurchaseOutflow -
      cfPayrollOutflow -
      cfOpexOutflow -
      cfTaxOutflow;
    const investingCashFlow = cfInvestingInflow - cfInvestingOutflow;
    const financingCashFlow = cfFinancingInflow - cfFinancingOutflow;
    const netCashChange = cashEnding - cashBeginning;

    const cfStatement = {
      beginningCash: cashBeginning,
      operating: {
        saleInflow: cfSaleInflow,
        otherInflow: cfOtherOperatingInflow,
        purchaseOutflow: cfPurchaseOutflow,
        payrollOutflow: cfPayrollOutflow,
        opexOutflow: cfOpexOutflow,
        withholdingTaxOutflow: taxItems.withholdingTax,
        vatTaxOutflow: taxItems.vatTax,
        corporateTaxOutflow: taxItems.corporateTax,
        taxPaymentOutflow: taxItems.taxPayment,
        netOperatingCashFlow: operatingCashFlow,
      },
      investing: {
        inflow: cfInvestingInflow,
        outflow: cfInvestingOutflow,
        netInvestingCashFlow: investingCashFlow,
      },
      financing: {
        inflow: cfFinancingInflow,
        outflow: cfFinancingOutflow,
        netFinancingCashFlow: financingCashFlow,
      },
      netCashChange,
      endingCash: cashEnding,
    };

    return NextResponse.json({
      success: true,
      year,
      entityType,
      amountBasis,
      months,
      accountRows: Array.from(rowMap.values()).filter(
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
      details,
    });
  } catch (error: any) {
    console.error("GET Financial Report Error:", error);
    return NextResponse.json(
      { error: "경영지표 보고서 조회 실패: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const pool = getErpPool();

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const defaultEntityRaw = String(formData.get("entityType") || "CORP").toUpperCase();
      const defaultEntity: "CORP" | "INDIVIDUAL" =
        defaultEntityRaw === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";

      if (!file) {
        return NextResponse.json(
          { error: "업로드할 국세청 납부세액 엑셀/CSV 파일이 없습니다." },
          { status: 400 }
        );
      }

      const fileName = file.name.toLowerCase();
      const arrayBuf = await file.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      const uint8 = new Uint8Array(arrayBuf);

      let rows: string[][] = [];
      const isZipXlsx = uint8.length >= 2 && uint8[0] === 0x50 && uint8[1] === 0x4b;
      const isOleXls = uint8.length >= 4 && uint8[0] === 0xd0 && uint8[1] === 0xcf;

      if (isZipXlsx || isOleXls) {
        try {
          const wb = XLSX.read(buf, { type: "buffer", raw: false });
          const sheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[sheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          rows = rawRows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "").trim()) : []));
        } catch {
          rows = parseXlsxBufferToRows(buf);
        }
      } else {
        const text = decodeTextBuffer(buf);
        if (text.includes("<table") || text.includes("<tr")) {
          const wb = XLSX.read(text, { type: "string", raw: false });
          const sheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[sheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          rows = rawRows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "").trim()) : []));
        } else {
          rows = parseCsvOrTsvTextToRows(text);
        }
      }

      const parsedRows = parseHometaxTaxPaymentRows(rows, defaultEntity);
      if (parsedRows.length === 0) {
        return NextResponse.json(
          {
            error:
              "파일에서 유효한 국세청 납부세액 내역(납부일자, 세목, 납부세액)을 찾지 못했습니다.",
          },
          { status: 400 }
        );
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS erp_tax_payments (
          id SERIAL PRIMARY KEY,
          entity_type VARCHAR(20) NOT NULL DEFAULT 'CORP',
          pay_date DATE NOT NULL,
          tax_type VARCHAR(100) NOT NULL,
          sub_account VARCHAR(50) NOT NULL,
          taxpayer_name VARCHAR(150),
          pay_amount NUMERIC DEFAULT 0,
          electronic_pay_no VARCHAR(100),
          attribution_year VARCHAR(10),
          tax_office VARCHAR(100),
          national_tax NUMERIC DEFAULT 0,
          education_tax NUMERIC DEFAULT 0,
          defense_tax NUMERIC DEFAULT 0,
          rural_special_tax NUMERIC DEFAULT 0,
          surcharge NUMERIC DEFAULT 0,
          remark TEXT DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (electronic_pay_no, pay_date, pay_amount)
        )
      `);

      await pool.query(`
        ALTER TABLE erp_tax_payments
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      `);
      await pool.query(`
        ALTER TABLE erp_tax_payments
        DROP CONSTRAINT IF EXISTS erp_tax_payments_electronic_pay_no_key;
      `);
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'erp_tax_payments_epay_date_amt_key'
          ) THEN
            ALTER TABLE erp_tax_payments
            ADD CONSTRAINT erp_tax_payments_epay_date_amt_key UNIQUE (electronic_pay_no, pay_date, pay_amount);
          END IF;
        END $$;
      `);

      let upsertedCount = 0;
      const touchedYears = new Set<string>();

      for (const item of parsedRows) {
        await pool.query(
          `INSERT INTO erp_tax_payments (
            entity_type, pay_date, tax_type, sub_account, taxpayer_name, pay_amount,
            electronic_pay_no, attribution_year, tax_office,
            national_tax, education_tax, defense_tax, rural_special_tax, surcharge, remark, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
          ON CONFLICT (electronic_pay_no, pay_date, pay_amount)
          DO UPDATE SET
            entity_type = EXCLUDED.entity_type,
            tax_type = EXCLUDED.tax_type,
            sub_account = EXCLUDED.sub_account,
            taxpayer_name = EXCLUDED.taxpayer_name,
            attribution_year = EXCLUDED.attribution_year,
            tax_office = EXCLUDED.tax_office,
            national_tax = EXCLUDED.national_tax,
            education_tax = EXCLUDED.education_tax,
            defense_tax = EXCLUDED.defense_tax,
            rural_special_tax = EXCLUDED.rural_special_tax,
            surcharge = EXCLUDED.surcharge,
            remark = EXCLUDED.remark,
            updated_at = NOW()`,
          [
            item.entityType,
            item.payDate,
            item.taxType,
            item.subAccount,
            item.taxpayerName,
            item.payAmount,
            item.electronicPayNo,
            item.attributionYear,
            item.taxOffice,
            item.nationalTax,
            item.educationTax,
            item.defenseTax,
            item.ruralSpecialTax,
            item.surcharge,
            item.remark,
          ]
        );
        upsertedCount++;
        touchedYears.add(item.payDate.slice(0, 4));
      }

      // 연도별 합계를 사업자별 및 전체('ALL')로 erp_financial_remarks에 동기화
      const syncRes = await pool.query(`
        SELECT SUBSTRING(pay_date::text, 1, 4) AS yr,
               entity_type,
               SUM(CASE WHEN sub_account = '원천세' THEN pay_amount ELSE 0 END)::numeric AS wth,
               SUM(CASE WHEN sub_account = '부가세' THEN pay_amount ELSE 0 END)::numeric AS vat,
               SUM(CASE WHEN sub_account = '법인세' THEN pay_amount ELSE 0 END)::numeric AS corp,
               SUM(CASE WHEN sub_account = '납부항목' THEN pay_amount ELSE 0 END)::numeric AS etc
        FROM erp_tax_payments
        GROUP BY SUBSTRING(pay_date::text, 1, 4), entity_type
      `);

      for (const s of syncRes.rows) {
        await pool.query(
          `INSERT INTO erp_financial_remarks (
            year, entity_type, remark_text, tax_withholding, tax_vat, tax_corporate, tax_payment, updated_by, updated_at
          ) VALUES ($1, $2, '', $3, $4, $5, $6, 'TAX_UPLOAD', NOW())
          ON CONFLICT (year, entity_type)
          DO UPDATE SET
            tax_withholding = EXCLUDED.tax_withholding,
            tax_vat = EXCLUDED.tax_vat,
            tax_corporate = EXCLUDED.tax_corporate,
            tax_payment = EXCLUDED.tax_payment,
            updated_by = 'TAX_UPLOAD',
            updated_at = NOW()`,
          [s.yr, s.entity_type, s.wth, s.vat, s.corp, s.etc]
        );
      }

      const syncAllRes = await pool.query(`
        SELECT SUBSTRING(pay_date::text, 1, 4) AS yr,
               SUM(CASE WHEN sub_account = '원천세' THEN pay_amount ELSE 0 END)::numeric AS wth,
               SUM(CASE WHEN sub_account = '부가세' THEN pay_amount ELSE 0 END)::numeric AS vat,
               SUM(CASE WHEN sub_account = '법인세' THEN pay_amount ELSE 0 END)::numeric AS corp,
               SUM(CASE WHEN sub_account = '납부항목' THEN pay_amount ELSE 0 END)::numeric AS etc
        FROM erp_tax_payments
        GROUP BY SUBSTRING(pay_date::text, 1, 4)
      `);

      for (const s of syncAllRes.rows) {
        await pool.query(
          `INSERT INTO erp_financial_remarks (
            year, entity_type, remark_text, tax_withholding, tax_vat, tax_corporate, tax_payment, updated_by, updated_at
          ) VALUES ($1, 'ALL', '', $2, $3, $4, $5, 'TAX_UPLOAD', NOW())
          ON CONFLICT (year, entity_type)
          DO UPDATE SET
            tax_withholding = EXCLUDED.tax_withholding,
            tax_vat = EXCLUDED.tax_vat,
            tax_corporate = EXCLUDED.tax_corporate,
            tax_payment = EXCLUDED.tax_payment,
            updated_by = 'TAX_UPLOAD',
            updated_at = NOW()`,
          [s.yr, s.wth, s.vat, s.corp, s.etc]
        );
      }

      return NextResponse.json({
        success: true,
        parsedCount: parsedRows.length,
        upsertedCount,
        years: Array.from(touchedYears).sort(),
        message: `국세청 납부세액 ${upsertedCount}건 업로드 및 세무 계정 집계가 완료되었습니다.`,
      });
    }

    const body = await request.json();
    const {
      year = "2026",
      entityType = "ALL",
      remarkText = "",
      taxWithholding = 0,
      taxVat = 0,
      taxCorporate = 0,
      taxPayment = 0,
      updatedBy = "ADMIN",
    } = body;

    await pool.query(
      `INSERT INTO erp_financial_remarks (
        year, entity_type, remark_text, tax_withholding, tax_vat, tax_corporate, tax_payment, updated_by, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (year, entity_type)
      DO UPDATE SET
        remark_text = EXCLUDED.remark_text,
        tax_withholding = EXCLUDED.tax_withholding,
        tax_vat = EXCLUDED.tax_vat,
        tax_corporate = EXCLUDED.tax_corporate,
        tax_payment = EXCLUDED.tax_payment,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()`,
      [
        year,
        entityType,
        remarkText,
        Number(taxWithholding || 0),
        Number(taxVat || 0),
        Number(taxCorporate || 0),
        Number(taxPayment || 0),
        updatedBy,
      ]
    );

    return NextResponse.json({
      success: true,
      message: `${year === "ALL" ? "전체 연도" : year + "년"} 재무제표 주석(Remark) 및 세무 항목이 저장되었습니다.`,
    });
  } catch (error: any) {
    console.error("POST Financial Remark Error:", error);
    return NextResponse.json(
      { error: "주석 및 세무 항목 저장 실패: " + error.message },
      { status: 500 }
    );
  }
}
