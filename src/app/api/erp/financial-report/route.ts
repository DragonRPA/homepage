import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

export interface FinancialDetailItem {
  id: string;
  source: "TAX_INVOICE" | "BANK_TX";
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
  majorAccount: "COGS" | "PAYROLL" | "OPEX" | "TAX_DUES" | "NON_OP";
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
      // 급여 정산환입 또는 중복환입은 급여 차감(-1)
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
  if (/가수금|가수근|운영자금|법인준비/.test(combined)) {
    return {
      majorAccount: "NON_OP",
      subAccount: dAmt > 0 ? "가수금입금" : "가수금반환·자금이동",
      sign: 1,
    };
  }
  if (entityType === "INDIVIDUAL" && (sr === "이정용" || holder === "이정용")) {
    return {
      majorAccount: "NON_OP",
      subAccount: dAmt > 0 ? "대표자입금(개인계좌)" : "대표자인출(개인계좌)",
      sign: 1,
    };
  }

  // 5. 예금이자 / 카드취소·정정 환급 등 입금
  if (dAmt > 0) {
    if (txChannel === "이자" || /결산이자|이자/.test(combined)) {
      return { majorAccount: "NON_OP", subAccount: "이자수익", sign: 1 };
    }
    if (txChannel === "취소" || txChannel === "정정") {
      return { majorAccount: "OPEX", subAccount: "체크·법인카드결제(취소환급)", sign: -1 };
    }
    return { majorAccount: "NON_OP", subAccount: "기타미매칭입금", sign: 1 };
  }

  if (wAmt <= 0) return null;

  // 6. 세금과공과 (국세, 부가세, 주민세, 지방세, 세무서, 국고)
  if (
    txChannel === "국세" ||
    txChannel === "지로" ||
    /국세|부가세|주민세|지방세|금천|노원|국고|세무서/.test(combined)
  ) {
    return { majorAccount: "TAX_DUES", subAccount: "국세·부가세·지방세", sign: 1 };
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
    const amountBasis = searchParams.get("amountBasis") || "SUPPLY"; // 'SUPPLY' (공급가액 기준) | 'TOTAL' (부가세포함 총액 기준)

    const pool = getErpPool();

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
              sender_receiver, counterparty_holder, counterparty_bank, counterparty_account,
              tx_channel, memo, is_matched, matched_type, matched_id
       FROM erp_bank_transactions
       ${bankWhere}
       ORDER BY trans_date ASC, id ASC`,
      bankParams
    );

    const details: FinancialDetailItem[] = [];

    // 3. 세금계산서 분류 적재 (예정/미수금 포함 정상 처리 가정)
    for (const row of invRes.rows) {
      const ym = String(row.issue_date).slice(0, 7);
      const supply = Number(row.supply_amount || 0);
      const vat = Number(row.vat_amount || 0);
      const total = Number(row.total_amount || supply + vat);
      const ent = (row.entity_type === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP") as "CORP" | "INDIVIDUAL";

      if (row.io_type === "SALE") {
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

    // 4. 통장 입출금(급여, 4대보험, 카드/경비, 국세 등) 분류 적재
    for (const row of bankRes.rows) {
      const cls = classifyBankTxAccount(row);
      if (!cls) continue;

      const ym = String(row.trans_date).slice(0, 7);
      const rawAmt = Number(row.withdrawal_amount || 0) > 0
        ? Number(row.withdrawal_amount)
        : Number(row.deposit_amount || 0);
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

    // 기본 표준 하위계정 미리 생성하여 표 구조 일관성 유지
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
      ["OPEX", "임차료·관리비"],
      ["OPEX", "통신비"],
      ["OPEX", "차량유지·렌트비"],
      ["OPEX", "세무·인증·수수료"],
      ["OPEX", "수도광열비(공과금)"],
      ["OPEX", "법인BC카드대금결제"],
      ["OPEX", "소모품·플랫폼·IT구독비"],
      ["OPEX", "체크카드·현장운영경비"],
      ["OPEX", "기타지급수수료·경비"],
      ["TAX_DUES", "국세·부가세·지방세"],
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

    let grandRevenue = 0;
    let grandCogs = 0;
    let grandPayroll = 0;
    let grandOpex = 0;
    let grandTaxDues = 0;
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
      grandTaxDues += mt.taxDues;
      grandNonOp += mt.nonOp;
    }

    const grandGrossProfit = grandRevenue - grandCogs;
    const grandOperatingProfit = grandGrossProfit - grandPayroll - grandOpex;
    const grandNetOperatingCash = grandOperatingProfit - grandTaxDues;

    return NextResponse.json({
      success: true,
      year,
      entityType,
      amountBasis,
      months,
      accountRows: Array.from(rowMap.values()).filter((r) => r.count > 0 || r.total !== 0),
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
        netOperatingCash: grandNetOperatingCash,
        nonOp: grandNonOp,
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
