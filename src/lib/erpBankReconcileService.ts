import "server-only";
import type { PoolClient } from "pg";
import { getErpPool } from "@/lib/supabaseErp";
import {
  ensureBankClosingColumns,
  syncBankAccountClosingState,
} from "@/lib/erpBankClosing";
import type { ParsedBankTransaction } from "@/lib/ibkBankParser";

export interface PayrollClassificationResult {
  matchedType: "PAYROLL";
  matchedId: string;
  holder: string;
  bank: string;
  memo: string;
}

export interface BulkUpsertBankTransactionsResult {
  insertedCount: number;
  duplicateCount: number;
  autoReconciledCount: number;
  newlyClosedAccounts: string[];
}

export const KNOWN_PAYROLL_ACCOUNTS: Record<string, { emp: string; bank: string }> = {
  "01071939811": { emp: "이진규", bank: "기업은행" },
  "36517252302001": { emp: "장종순", bank: "우리은행" },
  "1002408300450": { emp: "장종순", bank: "우리은행" },
  "3333329635820": { emp: "조경찬", bank: "카카오뱅크" },
  "972-028656-01-018": { emp: "김승지", bank: "기업은행" },
  "33291058226607": { emp: "박종환", bank: "하나은행" },
  "1002753824367": { emp: "정세웅", bank: "우리은행" },
  "00600204200039": { emp: "김효진", bank: "국민은행" },
  "27491024160707": { emp: "강주형", bank: "하나은행" },
  "3561014522153": { emp: "정건희", bank: "농협은행" },
};

export function prevYearMonth(transDateStr: string): string {
  const [y, m] = transDateStr.split("-").map(Number);
  if (!y || !m) return "0000";
  if (m === 1) return `${String(y - 1).slice(-2)}12`;
  return `${String(y).slice(-2)}${String(m - 1).padStart(2, "0")}`;
}

export function classifyPayrollItem(
  item: ParsedBankTransaction
): PayrollClassificationResult | null {
  const entityType =
    item.entityType || (String(item.accountNo || "").includes("140") ? "INDIVIDUAL" : "CORP");
  if (entityType !== "CORP") return null;

  const sr = String(item.senderReceiver || "").replace(/\u3000/g, " ").trim();
  const holder = String(item.counterpartyHolder || "").replace(/\u3000/g, " ").trim();
  const acc = String(item.counterpartyAccount || "").trim();
  const bank = String(item.counterpartyBank || "").trim();
  const memo = String(item.memo || "").trim();
  const transDate = String(item.transDate || "");
  const wAmt = Number(item.withdrawalAmount || 0);
  const dAmt = Number(item.depositAmount || 0);
  const combined = `${sr} ${holder} ${memo}`;

  if (/가수금|가수근|운영자금|푸드트래블/.test(combined)) {
    return null;
  }

  const EMP_NAMES = [
    "이진규",
    "장종순",
    "조경찬",
    "김승지",
    "박종환",
    "이정용",
    "정세웅",
    "김효진",
    "강주형",
    "정건희",
  ];
  let empName: string | null = null;
  for (const name of EMP_NAMES) {
    if (sr.includes(name) || holder.includes(name) || memo.includes(name)) {
      empName = name;
      break;
    }
  }
  if (!empName && KNOWN_PAYROLL_ACCOUNTS[acc]) {
    empName = KNOWN_PAYROLL_ACCOUNTS[acc].emp;
  }
  // 대량/통합 급여 이체 건 처리 (예: sender_receiver가 '급여', '상여' 등이고 출금액이 발생한 경우)
  if (!empName && wAmt > 0 && (/^(급여|임직원급여|월급여|정기급여)(\s*\d{2,4})?$/.test(sr) || sr.includes("대량급여"))) {
    const m4 = (sr + " " + memo).match(/(24|25|26|27)(0[1-9]|1[0-2])/);
    const ym = m4 ? m4[0] : prevYearMonth(transDate);
    const fullYm = `20${ym.slice(0, 2)}-${ym.slice(2, 4)}`;
    return {
      matchedType: "PAYROLL",
      matchedId: `급여-임직원통합(${ym})`,
      holder: holder || "임직원급여",
      bank: bank || "기업은행",
      memo: memo || `임직원 급여 통합지급 (${fullYm} 귀속)`,
    };
  }
  if (!empName) return null;

  if (sr.includes("조경찬퇴직정산")) {
    const isDiff = sr.includes("차액") || dAmt > 0;
    return {
      matchedType: "PAYROLL",
      matchedId: isDiff ? "퇴직정산환입-조경찬(2609)" : "퇴직금-조경찬(2609)",
      holder: holder || "이정용",
      bank: bank || "우리은행",
      memo: isDiff ? "임직원 퇴직정산 차액 환입 (조경찬)" : "임직원 퇴직금 정산 (조경찬)",
    };
  }

  if (sr.includes("08박종환대체")) {
    return {
      matchedType: "PAYROLL",
      matchedId: "급여대체-박종환(2608)",
      holder: holder || "이정용",
      bank: bank || "우리은행",
      memo: "임직원 급여 대납 정산 (2026-08 귀속 박종환)",
    };
  }

  if (sr.includes("퇴직금")) {
    const ym = transDate.slice(2, 4) + transDate.slice(5, 7);
    return {
      matchedType: "PAYROLL",
      matchedId: `퇴직금-${empName}(${ym})`,
      holder: holder || empName,
      bank: bank || (KNOWN_PAYROLL_ACCOUNTS[acc]?.bank ?? ""),
      memo: `임직원 퇴직금 (${empName})`,
    };
  }

  if (sr.includes("아르바이트") || sr.includes("일용") || ["김효진", "강주형", "정건희"].includes(empName)) {
    const ym = transDate.slice(2, 4) + transDate.slice(5, 7);
    return {
      matchedType: "PAYROLL",
      matchedId: `일용급여-${empName}(${ym})`,
      holder: holder || empName,
      bank: bank || (KNOWN_PAYROLL_ACCOUNTS[acc]?.bank ?? ""),
      memo: `일용/단기 급여 (${empName})`,
    };
  }

  if (sr.includes("중복") && dAmt > 0) {
    return {
      matchedType: "PAYROLL",
      matchedId: `급여환입-${empName}(2510)`,
      holder: holder || empName,
      bank: bank || "우리은행",
      memo: `급여 중복이체 환입 (${empName})`,
    };
  }

  if (dAmt > 0 && empName === "장종순") {
    const ym = prevYearMonth(transDate);
    return {
      matchedType: "PAYROLL",
      matchedId: `급여정산환입-장종순(${ym})`,
      holder: "장종순",
      bank: bank || "우리은행",
      memo: `임직원 급여 차액 정산 환입 (20${ym.slice(0, 2)}-${ym.slice(2, 4)} 귀속 장종순)`,
    };
  }

  if (wAmt <= 0) return null;

  let ym: string | null = null;
  if (sr.includes("2064")) {
    ym = "2604";
  } else if (sr === "이진규07") {
    ym = "2407";
  } else if (sr === "2412이진규" && transDate.startsWith("2024-12")) {
    ym = "2411";
  } else if (sr === "2025.이진규") {
    ym = "2505";
  } else {
    const m4 = (sr + " " + memo).match(/(24|25|26|27)(0[1-9]|1[0-2])/);
    if (m4) {
      ym = m4[0];
    } else {
      ym = prevYearMonth(transDate);
    }
  }

  const fullYm = `20${ym.slice(0, 2)}-${ym.slice(2, 4)}`;
  const isFixedBase = /급여/.test(sr) && [2000000, 4000000, 1950000].includes(wAmt);
  const isSettlementAdd =
    ["장종순", "조경찬", "김승지"].includes(empName) &&
    transDate >= "2026-01-01" &&
    !isFixedBase &&
    wAmt < 1000000;

  const labelPrefix = isSettlementAdd ? "급여정산" : "급여";
  const memoText = isSettlementAdd
    ? `임직원 급여/수당 정산 (${fullYm} 귀속 ${empName})`
    : `임직원 급여 (${fullYm} 귀속 ${empName})`;

  return {
    matchedType: "PAYROLL",
    matchedId: `${labelPrefix}-${empName}(${ym})`,
    holder: holder || empName,
    bank: bank || (KNOWN_PAYROLL_ACCOUNTS[acc]?.bank ?? (empName === "이정용" ? "우리은행" : "")),
    memo: memo || memoText,
  };
}

export function normalizeCompanyForMatch(raw?: string): string {
  if (!raw) return "";
  return String(raw)
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/nbp|엔비피/gi, "네이버클라우드")
    .replace(/\(주\)|주식회사|（주）|\(유\)|유한회사|㈜|사단법인|\(사\)|재단법인|\(재\)/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^가-힣a-zA-Z0-9]/g, "")
    .toLowerCase()
    .trim();
}

export const RECONCILE_DAY_MS = 1000 * 60 * 60 * 24;

export function parseReconcileDayMs(raw: unknown): number {
  return new Date(String(raw ?? "").slice(0, 10)).getTime();
}

export function isBankTxCounterpartyMatch(invName: string, invCeo: string, tx: any): boolean {
  const sr = normalizeCompanyForMatch(tx.sender_receiver);
  const ch = normalizeCompanyForMatch(tx.counterparty_holder);
  const mm = normalizeCompanyForMatch(tx.memo);

  return Boolean(
    (sr && (sr.includes(invName) || invName.includes(sr))) ||
      (ch && (ch.includes(invName) || invName.includes(ch))) ||
      (mm && mm.includes(invName)) ||
      (invCeo && invCeo.length >= 2 && ((sr && sr.includes(invCeo)) || (ch && ch.includes(invCeo))))
  );
}

export interface InvoiceSettlementBatchItem {
  invoiceId: number;
  settledAmount: number;
  settlementStatus: string; // 'PAID' | 'PARTIAL' | 'UNPAID'
  matchedBankTxIds: number[];
  preserveMemo: boolean;
  memo?: string;
  domainType?: string;
  refId?: number;
}

/**
 * 다건 세금계산서 정산 상태(erp_tax_invoices) 및 원천 청구(용역·렌탈·무역) 수납 상태를 일괄 동기화한다.
 */
export async function applyBatchInvoiceSettlementUpdatesTx(
  client: PoolClient,
  items: InvoiceSettlementBatchItem[]
): Promise<void> {
  if (items.length === 0) return;

  // Deduplicate by invoiceId keeping the last/final entry in order
  const dedupMap = new Map<number, InvoiceSettlementBatchItem>();
  for (const item of items) {
    const invId = Number(item.invoiceId);
    if (!Number.isFinite(invId) || invId <= 0) continue;
    dedupMap.delete(invId);
    dedupMap.set(invId, { ...item, invoiceId: invId });
  }
  const deduped = Array.from(dedupMap.values());
  if (deduped.length === 0) return;

  const invIds: number[] = [];
  const settledAmounts: number[] = [];
  const statuses: string[] = [];
  const billStatuses: string[] = [];
  const txIdsJsons: string[] = [];
  const preserveMemos: boolean[] = [];
  const memos: string[] = [];
  const domainTypes: string[] = [];
  const refIds: number[] = [];

  for (const item of deduped) {
    invIds.push(item.invoiceId);
    settledAmounts.push(Number(item.settledAmount || 0));
    statuses.push(item.settlementStatus);
    billStatuses.push(
      item.settlementStatus === "PAID"
        ? "PAID"
        : item.settlementStatus === "PARTIAL"
        ? "PARTIAL"
        : "UNPAID"
    );
    txIdsJsons.push(
      JSON.stringify(Array.isArray(item.matchedBankTxIds) ? item.matchedBankTxIds : [])
    );
    preserveMemos.push(Boolean(item.preserveMemo));
    memos.push(item.memo ?? "");
    domainTypes.push(item.domainType || "");
    refIds.push(item.refId && Number(item.refId) > 0 ? Number(item.refId) : -1);
  }

  await client.query(
    `UPDATE erp_tax_invoices AS t
     SET settled_amount = u.settled_amt,
         settlement_status = u.status,
         matched_bank_tx_ids = u.tx_ids::jsonb,
         memo = CASE WHEN u.preserve_memo THEN t.memo ELSE u.memo END,
         settled_at = CASE WHEN u.status = 'UNPAID' THEN NULL ELSE NOW() END
     FROM UNNEST($1::bigint[], $2::numeric[], $3::varchar[], $4::text[], $5::bool[], $6::text[])
       AS u(id, settled_amt, status, tx_ids, preserve_memo, memo)
     WHERE t.id = u.id`,
    [invIds, settledAmounts, statuses, txIdsJsons, preserveMemos, memos]
  );

  // 원천 청구(용역·렌탈·무역) 수납완료 자동 동기화
  await client.query(
    `UPDATE erp_service_billings AS sb
     SET payment_status = u.bill_status
     FROM UNNEST($1::bigint[], $2::text[], $3::text[], $4::bigint[])
       AS u(inv_id, bill_status, domain_type, ref_id)
     WHERE sb.tax_invoice_id = u.inv_id
        OR (u.ref_id > 0 AND u.domain_type IN ('SERVICE', 'OP_SERVICE', 'DEV_SERVICE') AND sb.id = u.ref_id)`,
    [invIds, billStatuses, domainTypes, refIds]
  );

  await client.query(
    `UPDATE erp_rental_billings AS rb
     SET payment_status = u.bill_status,
         paid_amount = CASE
           WHEN u.bill_status = 'PAID' THEN rb.total_amount
           WHEN u.bill_status = 'UNPAID' THEN 0
           ELSE LEAST(rb.total_amount, u.settled_amt)
         END
     FROM UNNEST($1::bigint[], $2::text[], $3::numeric[], $4::text[], $5::bigint[])
       AS u(inv_id, bill_status, settled_amt, domain_type, ref_id)
     WHERE rb.tax_invoice_id = u.inv_id
        OR (u.ref_id > 0 AND u.domain_type = 'RENTAL' AND rb.id = u.ref_id)`,
    [invIds, billStatuses, settledAmounts, domainTypes, refIds]
  );

  // erp_trade_billings.id and tax_invoice_id are int4 in PostgreSQL
  await client.query(
    `UPDATE erp_trade_billings AS tb
     SET payment_status = u.bill_status,
         paid_amount = CASE
           WHEN u.bill_status = 'PAID' THEN tb.total_amount
           WHEN u.bill_status = 'UNPAID' THEN 0
           ELSE LEAST(tb.total_amount, u.settled_amt)
         END
     FROM UNNEST($1::int[], $2::varchar[], $3::numeric[], $4::text[], $5::int[])
       AS u(inv_id, bill_status, settled_amt, domain_type, ref_id)
     WHERE tb.tax_invoice_id = u.inv_id
        OR (u.ref_id > 0 AND u.domain_type IN ('TRADE', 'TRADE_SALE') AND tb.id = u.ref_id)`,
    [invIds, billStatuses, settledAmounts, domainTypes, refIds]
  );
}

export async function applyBankReconcileMatch(
  client: PoolClient,
  invoices: any[],
  txId: number,
  ioType: string
): Promise<void> {
  const invoiceNos: string[] = [];
  const batchItems: InvoiceSettlementBatchItem[] = [];

  for (const inv of invoices) {
    invoiceNos.push(inv.invoice_no);
    const totalAmt = Number(inv.total_amount || 0);
    const prevIds: number[] = Array.isArray(inv.matched_bank_tx_ids)
      ? inv.matched_bank_tx_ids.map((n: any) => Number(n)).filter((n: number) => n > 0)
      : [];
    const mergedIds = Array.from(new Set([...prevIds, txId]));

    batchItems.push({
      invoiceId: Number(inv.id),
      settledAmount: totalAmt,
      settlementStatus: "PAID",
      matchedBankTxIds: mergedIds,
      preserveMemo: true,
      domainType: inv.domain_type || "",
      refId: inv.ref_id ? Number(inv.ref_id) : -1,
    });
  }

  await applyBatchInvoiceSettlementUpdatesTx(client, batchItems);

  await client.query(
    `UPDATE erp_bank_transactions
     SET is_matched = true,
         matched_type = $1,
         matched_id = $2,
         matched_at = NOW()
     WHERE id = $3`,
    [ioType === "PURCHASE" ? "PURCHASE_INVOICE" : "SALE_INVOICE", invoiceNos.join(","), txId]
  );
}

/**
 * 동일 거래처의 미결 세금계산서 K건(2 <= K <= 6) 미결 잔액 합계가 단일 통장 거래 1건과 일치하는 최적 집합을 탐색한다.
 */
export function findConsolidatedUnpaidSubsetForTx(
  groupInvs: any[],
  tx: any,
  ioType: string
): any[] | null {
  const txAmt = ioType === "PURCHASE" ? Number(tx.withdrawal_amount) : Number(tx.deposit_amount);
  if (txAmt <= 0) return null;
  const txDate = parseReconcileDayMs(tx.trans_date);
  if (Number.isNaN(txDate)) return null;

  const MAX_K = 6;
  const MAX_POOL = 12;
  const maxPruningSum = txAmt + Math.max(100, MAX_K * 500);

  let bestSubset: any[] | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let startIdx = 0; startIdx < groupInvs.length; startIdx++) {
    const pool = groupInvs.slice(startIdx, startIdx + MAX_POOL);
    if (pool.length < 2) break;

    const dfs = (
      idx: number,
      chosen: any[],
      sumRemaining: number,
      earliestDate: number,
      latestDate: number
    ) => {
      if (chosen.length >= 2) {
        const tolerance = Math.max(100, chosen.length * 500);
        const diff = Math.abs(txAmt - sumRemaining);
        if (
          diff <= tolerance &&
          txDate >= earliestDate - 35 * RECONCILE_DAY_MS &&
          txDate <= latestDate + 90 * RECONCILE_DAY_MS
        ) {
          if (
            diff < bestDiff ||
            (diff === bestDiff && bestSubset !== null && chosen.length < bestSubset.length)
          ) {
            bestDiff = diff;
            bestSubset = [...chosen];
          }
        }
      }
      if (chosen.length >= MAX_K || sumRemaining > maxPruningSum) return;

      for (let i = idx; i < pool.length; i++) {
        const inv = pool[i];
        const rem = Math.max(0, Number(inv.total_amount || 0) - Number(inv.settled_amount || 0));
        if (rem <= 0 || sumRemaining + rem > maxPruningSum) continue;
        const invDate = parseReconcileDayMs(inv.issue_date);
        if (Number.isNaN(invDate)) continue;

        chosen.push(inv);
        dfs(
          i + 1,
          chosen,
          sumRemaining + rem,
          Math.min(earliestDate, invDate),
          Math.max(latestDate, invDate)
        );
        chosen.pop();
      }
    };

    const firstRem = Math.max(0, Number(pool[0].total_amount || 0) - Number(pool[0].settled_amount || 0));
    const firstDate = parseReconcileDayMs(pool[0].issue_date);
    if (firstRem > 0 && firstRem <= maxPruningSum && !Number.isNaN(firstDate)) {
      dfs(1, [pool[0]], firstRem, firstDate, firstDate);
    }
  }

  return bestSubset;
}

// 통장 거래내역 업로드/등록 직후 미수납/미지급 세금계산서(erp_tax_invoices) 및 원천 청구와 자동 대사 수행
export async function autoReconcileUnpaidInvoicesWithBank(client: PoolClient): Promise<number> {
  const unpaidInvs = (
    await client.query(`
      SELECT id, invoice_no, COALESCE(io_type, 'SALE') AS io_type,
             COALESCE(supplier_entity_type, 'CORP') AS entity_type,
             domain_type, ref_id,
             customer_name, ceo_name, issue_date::text AS issue_date,
             COALESCE(total_amount, 0)::numeric AS total_amount,
             COALESCE(settled_amount, 0)::numeric AS settled_amount,
             COALESCE(matched_bank_tx_ids, '[]'::jsonb) AS matched_bank_tx_ids
      FROM erp_tax_invoices
      WHERE COALESCE(settlement_status, 'UNPAID') != 'PAID'
        AND COALESCE(total_amount, 0) > 0
      ORDER BY issue_date ASC, id ASC
    `)
  ).rows;

  if (unpaidInvs.length === 0) return 0;

  const unmatchedTxs = (
    await client.query(`
      SELECT id,
             COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) AS entity_type,
             trans_date::text AS trans_date,
             COALESCE(deposit_amount, 0)::numeric AS deposit_amount,
             COALESCE(withdrawal_amount, 0)::numeric AS withdrawal_amount,
             sender_receiver, counterparty_holder, memo
      FROM erp_bank_transactions
      WHERE COALESCE(is_matched, false) = false
      ORDER BY trans_date ASC, id ASC
    `)
  ).rows;

  if (unmatchedTxs.length === 0) return 0;

  const usedTxIds = new Set<number>();
  const matchedInvIds = new Set<number>();
  let newlyReconciledCount = 0;

  // 1단계: 1:1 자동 대사
  for (const inv of unpaidInvs) {
    const ioType = inv.io_type || "SALE";
    const entityType = inv.entity_type || "CORP";
    const totalAmt = Number(inv.total_amount || 0);
    const prevSettled = Number(inv.settled_amount || 0);
    const remainingAmt = Math.max(0, totalAmt - prevSettled);
    if (remainingAmt <= 0) continue;

    const invName = normalizeCompanyForMatch(inv.customer_name);
    const invCeo = normalizeCompanyForMatch(inv.ceo_name);
    if (!invName || invName.length < 2) continue;

    const invDate = parseReconcileDayMs(inv.issue_date);
    let matchedTx: any = null;

    for (const tx of unmatchedTxs) {
      if (usedTxIds.has(Number(tx.id))) continue;
      if (tx.entity_type !== entityType) continue;

      const txAmt = ioType === "PURCHASE" ? Number(tx.withdrawal_amount) : Number(tx.deposit_amount);
      if (txAmt <= 0) continue;
      if (Math.abs(txAmt - remainingAmt) > 1000 && Math.abs(txAmt - totalAmt) > 1000) continue;

      const txDate = parseReconcileDayMs(tx.trans_date);
      const diffDays = Math.round((txDate - invDate) / RECONCILE_DAY_MS);
      if (diffDays < -35 || diffDays > 60) continue;

      if (isBankTxCounterpartyMatch(invName, invCeo, tx)) {
        matchedTx = tx;
        break;
      }
    }

    if (matchedTx) {
      const txId = Number(matchedTx.id);
      usedTxIds.add(txId);
      matchedInvIds.add(Number(inv.id));
      await applyBankReconcileMatch(client, [inv], txId, ioType);
      newlyReconciledCount++;
    }
  }

  // 2단계: 다개월 합산 이체 (2 <= K <= 6) 자동 대사
  const consolidatedGroups = new Map<string, any[]>();
  for (const inv of unpaidInvs) {
    if (matchedInvIds.has(Number(inv.id))) continue;
    const totalAmt = Number(inv.total_amount || 0);
    const prevSettled = Number(inv.settled_amount || 0);
    if (totalAmt - prevSettled <= 0) continue;

    const invName = normalizeCompanyForMatch(inv.customer_name);
    if (!invName || invName.length < 2) continue;

    const entityType = inv.entity_type || "CORP";
    const ioType = inv.io_type || "SALE";
    const key = `${entityType}::${ioType}::${invName}`;
    const list = consolidatedGroups.get(key) || [];
    list.push(inv);
    consolidatedGroups.set(key, list);
  }

  for (const groupInvs of consolidatedGroups.values()) {
    if (groupInvs.length < 2) continue;
    const entityType = groupInvs[0].entity_type || "CORP";
    const ioType = groupInvs[0].io_type || "SALE";
    const invName = normalizeCompanyForMatch(groupInvs[0].customer_name);

    for (const tx of unmatchedTxs) {
      if (usedTxIds.has(Number(tx.id))) continue;
      if (tx.entity_type !== entityType) continue;

      const remGroupInvs = groupInvs.filter((i: any) => !matchedInvIds.has(Number(i.id)));
      if (remGroupInvs.length < 2) break;

      const nameMatched = remGroupInvs.some((i: any) =>
        isBankTxCounterpartyMatch(invName, normalizeCompanyForMatch(i.ceo_name), tx)
      );
      if (!nameMatched) continue;

      const bestSubset = findConsolidatedUnpaidSubsetForTx(remGroupInvs, tx, ioType);
      if (bestSubset && bestSubset.length >= 2) {
        const txId = Number(tx.id);
        usedTxIds.add(txId);
        for (const mInv of bestSubset) {
          matchedInvIds.add(Number(mInv.id));
        }
        await applyBankReconcileMatch(client, bestSubset, txId, ioType);
        newlyReconciledCount += bestSubset.length;
      }
    }
  }

  return newlyReconciledCount;
}

export async function bulkUpsertBankTransactions(
  items: ParsedBankTransaction[]
): Promise<BulkUpsertBankTransactionsResult> {
  const pool = getErpPool();
  await ensureBankClosingColumns(pool);
  const client = await pool.connect();
  let insertedCount = 0;
  let duplicateCount = 0;
  let autoReconciledCount = 0;
  let newlyClosedAccounts: string[] = [];

  try {
    await client.query("BEGIN");

    const BATCH_SIZE = 100;
    const nowIso = new Date().toISOString();
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const values: any[] = [];
      const placeholders: string[] = [];

      batch.forEach((item, idx) => {
        const payroll = classifyPayrollItem(item);
        const isMatched = Boolean(payroll);
        const matchedType = payroll ? payroll.matchedType : null;
        const matchedId = payroll ? payroll.matchedId : null;
        const matchedAt = payroll ? nowIso : null;
        const finalMemo = item.memo || (payroll ? payroll.memo : null);
        const finalHolder = item.counterpartyHolder || (payroll ? payroll.holder : null);
        const finalBank = item.counterpartyBank || (payroll ? payroll.bank : null);

        const base = idx * 25;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17}, $${base + 18}, $${base + 19}, $${base + 20}, $${base + 21}, $${base + 22}, $${base + 23}, $${base + 24}, $${base + 25})`
        );
        values.push(
          item.entityType,
          item.bankName,
          item.accountNo,
          item.accountHolder,
          item.accountProduct,
          item.transDate,
          item.transTime,
          item.transType,
          item.amount,
          item.withdrawalAmount,
          item.depositAmount,
          item.balanceAfter,
          item.senderReceiver,
          item.counterpartyAccount,
          finalBank,
          finalMemo,
          item.txChannel,
          item.checkAmount,
          item.cmsCode,
          finalHolder,
          item.txHash,
          isMatched,
          matchedType,
          matchedId,
          matchedAt
        );
      });

      const res = await client.query(
        `INSERT INTO erp_bank_transactions (
          entity_type, bank_name, account_no, account_holder, account_product,
          trans_date, trans_time, trans_type, amount, withdrawal_amount, deposit_amount,
          balance_after, sender_receiver, counterparty_account, counterparty_bank,
          memo, tx_channel, check_amount, cms_code, counterparty_holder, tx_hash,
          is_matched, matched_type, matched_id, matched_at
        ) VALUES ${placeholders.join(", ")}
        ON CONFLICT (tx_hash) DO UPDATE SET
          memo = COALESCE(NULLIF(EXCLUDED.memo, ''), erp_bank_transactions.memo),
          counterparty_account = COALESCE(NULLIF(EXCLUDED.counterparty_account, ''), erp_bank_transactions.counterparty_account),
          counterparty_bank = COALESCE(NULLIF(EXCLUDED.counterparty_bank, ''), erp_bank_transactions.counterparty_bank),
          tx_channel = COALESCE(NULLIF(EXCLUDED.tx_channel, ''), erp_bank_transactions.tx_channel),
          counterparty_holder = COALESCE(NULLIF(EXCLUDED.counterparty_holder, ''), erp_bank_transactions.counterparty_holder),
          is_matched = CASE WHEN erp_bank_transactions.is_matched THEN true ELSE EXCLUDED.is_matched END,
          matched_type = COALESCE(erp_bank_transactions.matched_type, EXCLUDED.matched_type),
          matched_id = COALESCE(erp_bank_transactions.matched_id, EXCLUDED.matched_id),
          matched_at = COALESCE(erp_bank_transactions.matched_at, EXCLUDED.matched_at)
        RETURNING (xmax = 0) AS inserted`,
        values
      );

      for (const r of res.rows) {
        if (r.inserted) insertedCount++;
        else duplicateCount++;
      }
    }

    // 신규 통장 입출금 반영 후 미수납/미지급 세금계산서와 자동 대사 실행 및 계좌별 전건 매칭 자동 마감 동기화
    autoReconciledCount = await autoReconcileUnpaidInvoicesWithBank(client);
    const closingSync = await syncBankAccountClosingState(client);
    newlyClosedAccounts = closingSync.newlyClosedAccounts;

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { insertedCount, duplicateCount, autoReconciledCount, newlyClosedAccounts };
}
