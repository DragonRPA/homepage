import { resolveExplicitAccountSubject } from "@/lib/erpAccountSubjects";
import { BUSINESS_ENTITIES } from "@/lib/businessEntities";

export interface FinancialDetailItem {
  id: string;
  source: "TAX_INVOICE" | "BANK_TX" | "TAX_PAYMENT" | "DEPRECIATION";
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

export function isCapitalizedAssetPurchaseInvoice(
  customerName: string,
  itemName: string,
  memo: string,
  invoiceNo?: string
): boolean {
  const c = (customerName || "").trim();
  const text = `${c} ${itemName || ""} ${memo || ""} ${invoiceNo || ""}`;
  // 임대용 자산으로 100% 자산화(Capitalization)된 매입세금계산서:
  // 1) 주식회사 삼원아이엔지 (65인치 TV 4대, PX260309-581912)
  // 2) 주식회사 진진씨앤씨 (한글과컴퓨터 한글 ALA + 한컴어시스턴트 연간계약 7카피, PX260311-529669)
  // 3) 주식회사에이브이랜드 (EPSON EB-FH08 프로젝터 1대, PX250801-415385)
  // 4) 주식회사 키타드에스이 (55인치 TV 10대, PX241120-587365)
  // 5) 주식회사 비엔솔루션 (NVMe 1TB SSD 7개 @ 60,000 = 420,000 + DDR5 32GB RAM 12개 @ 5,000 = 60,000 => 공급가 480,000원 전액, PX251128-f3631k)
  if (/삼원아이엔지/.test(c) && /65인치/.test(text)) return true;
  if (/진진씨앤씨/.test(c) && /한글과컴퓨터|한컴어시스턴트/.test(text)) return true;
  if (/에이브이랜드/.test(c) && /영상기기|EB-FH08/.test(text)) return true;
  if (/키타드에스이/.test(c) && /55인치/.test(text)) return true;
  if (/비엔솔루션/.test(c) && /1TB SSD/i.test(text)) return true;
  if (
    invoiceNo &&
    (invoiceNo === "PX260309-581912" ||
      invoiceNo === "PX260311-529669" ||
      invoiceNo === "PX250801-415385" ||
      invoiceNo === "PX241120-587365" ||
      invoiceNo === "PX251128-f3631k")
  ) {
    return true;
  }
  return false;
}

export function getPartialCapitalizedInvoiceSupply(
  customerName: string,
  itemName: string,
  invoiceNo?: string,
  supplyAmount?: number
): number {
  const c = (customerName || "").trim();
  // 1) 주식회사 엠디케이팩토리 PX250904-e4wcph (총 공급가 2,640,000원 중 RAM-001 40개 @ 33,000원 = 1,320,000원 + RAM-002 10개 @ 33,000원 = 330,000원 => 합계 1,650,000원 자산화)
  if (
    invoiceNo === "PX250904-e4wcph" ||
    (/엠디케이팩토리/.test(c) && /컴퓨터 및 주변기기/.test(itemName || "") && Number(supplyAmount || 0) === 2640000)
  ) {
    return 1650000;
  }
  // 2) 주식회사 엠디케이팩토리 PX250904-jt555a (총 공급가 1,440,000원 중 SSD-001 3개 @ 36,000원 = 108,000원 자산화)
  if (
    invoiceNo === "PX250904-jt555a" ||
    (/엠디케이팩토리/.test(c) && /컴퓨터 및 주변기기/.test(itemName || "") && Number(supplyAmount || 0) === 1440000)
  ) {
    return 108000;
  }
  return 0;
}

export function isCapitalizedBankCardTx(row: any): boolean {
  const id = Number(row.id || 0);
  // 임대용 TV 자산으로 자산화(Capitalization)된 쿠팡 체크카드 결제 건:
  // - #1171 (2024-12-25, 722,590원: LG 55인치 SMART TV 55, TV-004)
  // - #1727 (2025-12-16, 1,120,810원: LG 스탠바이미, TV-005)
  // - #1046 (2026-01-07, 1,414,080원: LG 75인치 SMART TV 75, TV-003)
  // - #1015 (2026-01-26, 2,090,000원: 삼성 더 세로, TV-006)
  if (id === 1171 || id === 1727 || id === 1046 || id === 1015) return true;
  return false;
}

export function classifyTaxPaymentSubAccount(taxTypeRaw: string): "원천세" | "부가세" | "법인세" | "납부항목" {
  const s = String(taxTypeRaw || "").trim();
  if (/근로소득|사업소득|퇴직소득|이자소득|배당소득|기타소득|원천|특별징수/.test(s)) return "원천세";
  if (/부가가치|부가세/.test(s)) return "부가세";
  if (/법인세|법인지방소득/.test(s)) return "법인세";
  return "납부항목";
}

export function parseTaxPayDate(raw: any): string | null {
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

export function parseTaxPayNum(raw: any): number {
  if (typeof raw === "number") return Math.round(raw);
  const cleaned = String(raw || "").replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n);
}

export interface ParsedTaxPaymentRow {
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

export function parseHometaxTaxPaymentRows(rows: string[][], defaultEntity: "CORP" | "INDIVIDUAL"): ParsedTaxPaymentRow[] {
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

export function classifyPurchaseInvoiceSubAccount(customerName: string, itemName: string, memo: string): {
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

export function classifyBankTxAccount(row: any): {
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

  // 1-A. 임대용 자산으로 자산화(Capitalization)된 카드 결제 건 (TV-003, TV-004, TV-005, TV-006)
  if (isCapitalizedBankCardTx(row)) {
    return {
      majorAccount: "NON_OP",
      subAccount: "임대자산취득(자산화)",
      sign: 1,
    };
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

  // 2. 급여(PAYROLL) 매칭 건 또는 통장 적요 '급여' 통합지급 건
  if (matchedType === "PAYROLL" || (wAmt > 0 && /^(급여|임직원급여|월급여|정기급여)(\s*\d{2,4})?$/.test(sr))) {
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

  // 3. 4대보험 (국민연금, 국민건강, 고용보험, 산재보험, 국민건강보험공단) 및 퇴직연금(중소기업퇴직연금기금 푸른씨앗 등)
  if (
    wAmt > 0 &&
    (/퇴직연금|푸른씨앗|중소기업퇴직|퇴직급여/.test(combined))
  ) {
    return { majorAccount: "PAYROLL", subAccount: "퇴직급여·정산", sign: 1 };
  }
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

export function isVatInclusiveBankExpense(
  row: any,
  cls: { majorAccount: string; subAccount: string }
): boolean {
  if (cls.majorAccount !== "COGS" && cls.majorAccount !== "OPEX") return false;
  if (cls.subAccount === "무증빙·카드 상품자재매입") return true;
  if (cls.subAccount === "임차료·관리비" || cls.subAccount === "임차료·관리비·공과금(이체)") return true;
  const txChannel = String(row.tx_channel || "").trim();
  const sr = String(row.sender_receiver || "").trim();
  const holder = String(row.counterparty_holder || "").trim();
  const memo = String(row.memo || "").trim();
  const combined = `${sr} ${holder} ${memo}`;
  if (
    txChannel === "체크" ||
    txChannel === "CC" ||
    txChannel === "BC" ||
    txChannel === "취소" ||
    txChannel === "정정" ||
    /비씨카드|BC체크|컴퓨존|옥션|G마켓|11번가|쿠팡|네이버|카카오/.test(combined)
  ) {
    return true;
  }
  return false;
}