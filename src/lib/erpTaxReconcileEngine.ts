import "server-only";
import type { PoolClient } from "pg";

export const DAY_MS = 86400 * 1000;

export interface CompanyAliasMatchResult {
  matched: boolean;
  reason: string;
  score: number;
}

export interface MatchScoreResult {
  score: number;
  reasons: string[];
  nameMatched: boolean;
  amountExact: boolean;
}

export interface InvoiceMatchPartitionItem {
  txIds: number[];
  method: string;
  newlyMatched: boolean;
}

export interface PartitionAutoMatchOutput {
  matchedInvMap: Map<number, InvoiceMatchPartitionItem>;
  txToInvsMap: Map<number, string[]>;
  subTxMap: Map<number, any>;
}

export interface AutoMatchResultItem {
  invoiceId: number;
  invoiceNo: string;
  entityType: string;
  ioType: string;
  customerName: string;
  totalAmount: number;
  bankTxIds: number[];
  txDate: string;
  txAmount: number;
  settlementStatus: string;
  matchMethod: string;
}

export interface LinkedBillingSyncTarget {
  invoiceId: number;
  domainType?: string | null;
  refId?: number | null;
}

const VENDOR_ALIAS_RULES: ReadonlyArray<{
  invKeys: string[];
  senderKeys: string[];
  holderKeys?: string[];
  reason: string;
}> = [
  { invKeys: ["aj솔루션테크", "aj렌탈"], senderKeys: ["aj", "에이제이"], holderKeys: ["aj", "에이제이"], reason: "AJ계열사(솔루션테크/렌탈서비스) 일치" },
  { invKeys: ["푸드트래블"], senderKeys: ["푸드트래블"], reason: "푸드트래블(대납정산 포함) 일치" },
  { invKeys: ["sk텔레콤", "sk브로드밴드"], senderKeys: ["skt", "sk브로드", "에스케이"], reason: "SKT/SKB 통신요금 자동납부" },
  { invKeys: ["중소기업은행", "기업은행"], senderKeys: ["수수료", "기업은행", "ibk"], reason: "은행 수수료 일치" },
  { invKeys: ["귀뚜라미에너지"], senderKeys: ["도시가스", "귀뚜라미"], holderKeys: ["도시가스"], reason: "도시가스 요금 일치" },
  { invKeys: ["가산미소지움관리단"], senderKeys: ["관리비", "미소지움"], holderKeys: ["미소지움"], reason: "관리비 일치" },
  { invKeys: ["이명옥"], senderKeys: ["임차료", "월세", "이명옥"], holderKeys: ["이명옥"], reason: "임차료(이명옥) 일치" },
  { invKeys: ["세종세무회계"], senderKeys: ["세무", "기장", "세종"], holderKeys: ["세종"], reason: "세무기장료 일치" },
  { invKeys: ["한국정보인증"], senderKeys: ["인증", "한국정보인증"], holderKeys: ["한국정보인증"], reason: "인증서 수수료 일치" },
];

const DRAGON_EXCLUDE_KEYS = ["급여", "가수금", "가수근", "퇴직"];
const DRAGON_INCLUDE_KEYS = ["드래곤", "용역", "착수금", "단기", "매입", "노트북", "ssd", "대납", "민주당"];

/** YYYY-MM-DD 앞 10자리 기준 UTC 자정 타임스탬프(ms)를 반환한다. */
export function parseIsoDayMs(raw: unknown): number {
  return new Date(String(raw ?? "").slice(0, 10)).getTime();
}

/** jsonb ID 배열에서 양의 정수 ID 목록만 안전하게 추출한다. */
export function extractPositiveIds(rawIds: unknown): number[] {
  if (!Array.isArray(rawIds)) return [];
  return rawIds.map((n: any) => Number(n)).filter((n: number) => n > 0);
}

/** 법인격 접두·접미어, 괄호 부가정보, 특수문자를 제거하여 거래처명을 정규화한다. */
export function normalizeCompanyName(raw?: string): string {
  if (!raw) return "";
  return String(raw)
    .replace(/\(주\)|주식회사|（주）|\(유\)|유한회사|㈜|사단법인|\(사\)|재단법인|\(재\)/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/（[^）]*）/g, "")
    .replace(/에스케이/g, "sk")
    .replace(/에이제이/g, "aj")
    .replace(/케이티/g, "kt")
    .replace(/엘지/g, "lg")
    .replace(/칵케일미디/g, "칵테일미디어")
    .replace(/[^가-힣a-zA-Z0-9]/g, "")
    .toLowerCase()
    .trim();
}

/** 세금계산서 거래처명·대표자명과 통장 적요·입출금자명의 별칭/계열사/고정거래처 일치 여부를 판정한다. */
export function checkCompanyAliasMatch(
  invNameRaw?: string,
  invCeoRaw?: string,
  txSenderRaw?: string,
  txHolderRaw?: string,
  txMemoRaw?: string
): CompanyAliasMatchResult {
  const invName = normalizeCompanyName(invNameRaw);
  const invCeo = normalizeCompanyName(invCeoRaw);
  const txSender = normalizeCompanyName(txSenderRaw);
  const txHolder = normalizeCompanyName(txHolderRaw);
  const txMemo = normalizeCompanyName(txMemoRaw);

  if (invName && invName.length >= 2) {
    // 1. Strict rule for inter-entity DragonRPA transactions:
    // Exclude CEO personal salary ("이정용급여", "2507이정용"), advance repayment ("가수금반환"), retirement ("퇴직정산")
    if (invName.includes("드래곤알피에이")) {
      const isSalaryOrPersonal =
        txSender && (DRAGON_EXCLUDE_KEYS.some((k) => txSender.includes(k)) || /^\d{4}이정용$/.test(txSender));
      if (isSalaryOrPersonal) return { matched: false, reason: "", score: 0 };
      if ((txSender && DRAGON_INCLUDE_KEYS.some((k) => txSender.includes(k))) || (txHolder && txHolder.includes("드래곤"))) {
        return { matched: true, reason: "내부거래처(드래곤알피에이) 일치", score: 55 };
      }
      return { matched: false, reason: "", score: 0 };
    }

    if (
      (txSender && (txSender.includes(invName) || invName.includes(txSender))) ||
      (txHolder && (txHolder.includes(invName) || invName.includes(txHolder)))
    ) {
      return { matched: true, reason: "거래처명 일치", score: 55 };
    }
    if (txMemo && (txMemo.includes(invName) || invName.includes(txMemo))) {
      return { matched: true, reason: "적요 거래처명 포함", score: 40 };
    }
    const prefix3 = invName.slice(0, 3);
    if (prefix3.length >= 3) {
      if ((txSender && txSender.includes(prefix3)) || (txHolder && txHolder.includes(prefix3))) {
        return { matched: true, reason: "거래처 약칭 일치", score: 50 };
      }
    }

    for (const rule of VENDOR_ALIAS_RULES) {
      if (!rule.invKeys.some((k) => invName.includes(k))) continue;
      const hitSender = rule.senderKeys.some((k) => txSender.includes(k));
      const hitHolder = Boolean(rule.holderKeys?.some((k) => txHolder.includes(k)));
      if (hitSender || hitHolder) {
        return { matched: true, reason: rule.reason, score: 50 };
      }
    }
  }

  if (invCeo && invCeo.length >= 2) {
    if ((txSender && txSender.includes(invCeo)) || (txHolder && txHolder.includes(invCeo))) {
      return { matched: true, reason: "대표자명 일치", score: 35 };
    }
  }
  return { matched: false, reason: "", score: 0 };
}

/** 세금계산서 1건과 통장 입출금 1건의 후보 추천 점수(거래처·금액·일자 근접도)를 계산한다. */
export function computeMatchScore(inv: any, tx: any): MatchScoreResult {
  const ioType = inv.io_type || inv.ioType || "SALE";
  const unpaid = Math.max(
    0,
    Number(inv.total_amount ?? inv.totalAmount ?? 0) - Number(inv.settled_amount ?? inv.settledAmount ?? 0)
  );
  const totalAmt = Number(inv.total_amount ?? inv.totalAmount ?? 0);
  const txAmt =
    ioType === "PURCHASE"
      ? Number(tx.withdrawal_amount ?? tx.withdrawalAmount ?? tx.amount ?? 0)
      : Number(tx.deposit_amount ?? tx.depositAmount ?? tx.amount ?? 0);

  let score = 0;
  const reasons: string[] = [];

  const aliasCheck = checkCompanyAliasMatch(
    inv.customer_name ?? inv.customerName,
    inv.ceo_name ?? inv.ceoName,
    tx.sender_receiver ?? tx.senderReceiver,
    tx.counterparty_holder ?? tx.counterpartyHolder,
    tx.memo
  );
  const nameMatched = aliasCheck.matched;
  if (nameMatched) {
    score += aliasCheck.score;
    reasons.push(aliasCheck.reason);
  }

  let amountExact = false;
  if (txAmt > 0) {
    if (Math.abs(txAmt - unpaid) <= 10 || Math.abs(txAmt - totalAmt) <= 10) {
      score += 45;
      amountExact = true;
      reasons.push("금액 100% 일치");
    } else if (Math.abs(txAmt - unpaid) <= 1000 || Math.abs(txAmt - totalAmt) <= 1000) {
      score += 35;
      amountExact = true;
      reasons.push("금액 근사 일치(절사차이)");
    } else if (txAmt < unpaid && nameMatched) {
      score += 15;
      reasons.push("부분 수납/지급 후보");
    }
  }

  const invDate = parseIsoDayMs(inv.issue_date ?? inv.issueDate);
  const txDate = parseIsoDayMs(tx.trans_date ?? tx.transDate);
  if (!isNaN(invDate) && !isNaN(txDate)) {
    const diffDays = Math.round((txDate - invDate) / DAY_MS);
    if (diffDays >= -5 && diffDays <= 45) {
      score += 10;
      reasons.push(diffDays === 0 ? "당일 입출금" : `발행 후 ${diffDays}일`);
    } else if (diffDays > 45 && diffDays <= 120) {
      score += 4;
    }
  }

  return { score, reasons, nameMatched, amountExact };
}

/**
 * 동일 거래처의 미매칭 양수 세금계산서 K건(2 <= K <= 6, 발행일 간격 180일 이내)을 조합해
 * 단일 합산 이체 거래내역 1건과 오차 범위 내에서 가장 근사하게 일치하는 최적 집합을 탐색한다.
 */
export function findConsolidatedInvoicesForTx(custInvs: any[], tx: any, io: string): any[] | null {
  const txAmt = io === "SALE" ? Number(tx.deposit_amount) : Number(tx.withdrawal_amount);
  if (txAmt <= 0) return null;
  const txDate = parseIsoDayMs(tx.trans_date);
  if (Number.isNaN(txDate)) return null;

  const MAX_K = 6;
  const MAX_POOL = 12;
  const MAX_SPAN_MS = 180 * DAY_MS;
  const maxPruningSum = txAmt + Math.max(100, MAX_K * 500);

  let bestSubset: any[] | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let startIdx = 0; startIdx < custInvs.length; startIdx++) {
    const anchorDate = parseIsoDayMs(custInvs[startIdx].issue_date);
    if (Number.isNaN(anchorDate)) continue;

    const pool: any[] = [];
    for (let p = startIdx; p < custInvs.length && pool.length < MAX_POOL; p++) {
      const d = parseIsoDayMs(custInvs[p].issue_date);
      if (Number.isNaN(d)) continue;
      if (d - anchorDate > MAX_SPAN_MS) break;
      pool.push(custInvs[p]);
    }
    if (pool.length < 2) continue;

    const dfs = (idx: number, chosen: any[], sumAmt: number, minDate: number, maxDate: number) => {
      if (chosen.length >= 2) {
        const tolerance = Math.max(100, chosen.length * 500);
        const diff = Math.abs(txAmt - sumAmt);
        if (diff <= tolerance && txDate >= minDate - 15 * DAY_MS && txDate <= maxDate + 60 * DAY_MS) {
          if (
            diff < bestDiff ||
            (diff === bestDiff && bestSubset !== null && chosen.length < bestSubset.length)
          ) {
            bestDiff = diff;
            bestSubset = [...chosen];
          }
        }
      }
      if (chosen.length >= MAX_K || sumAmt > maxPruningSum) return;

      for (let i = idx; i < pool.length; i++) {
        const inv = pool[i];
        const invAmt = Number(inv.total_amount);
        const invDate = parseIsoDayMs(inv.issue_date);
        const nextMin = Math.min(minDate, invDate);
        const nextMax = Math.max(maxDate, invDate);
        if (nextMax - nextMin > MAX_SPAN_MS || sumAmt + invAmt > maxPruningSum) continue;

        chosen.push(inv);
        dfs(i + 1, chosen, sumAmt + invAmt, nextMin, nextMax);
        chosen.pop();
      }
    };

    const firstAmt = Number(pool[0].total_amount);
    if (firstAmt <= maxPruningSum) {
      dfs(1, [pool[0]], firstAmt, anchorDate, anchorDate);
    }
  }

  return bestSubset;
}

function getTxDirectionalAmount(tx: any, io: string): number {
  return io === "SALE" ? Number(tx.deposit_amount) : Number(tx.withdrawal_amount);
}

function matchInvoiceAlias(inv: any, tx: any): CompanyAliasMatchResult {
  return checkCompanyAliasMatch(
    inv.customer_name,
    inv.ceo_name,
    tx.sender_receiver,
    tx.counterparty_holder,
    tx.memo
  );
}

function findTxSubsetMatchingAmount(
  candTxs: any[],
  io: string,
  targetSum: number,
  minCount: number,
  maxCount: number,
  maxCandLen: number
): any[] | null {
  if (candTxs.length < minCount || candTxs.length > maxCandLen) return null;
  let foundSubset: any[] | null = null;
  const dfs = (idx: number, currentList: any[], currentSum: number) => {
    if (foundSubset) return;
    if (Math.abs(currentSum - targetSum) <= 100 && currentList.length >= minCount) {
      foundSubset = [...currentList];
      return;
    }
    if (currentSum > targetSum + 100 || idx >= candTxs.length || currentList.length >= maxCount) return;
    for (let i = idx; i < candTxs.length; i++) {
      currentList.push(candTxs[i]);
      dfs(i + 1, currentList, currentSum + getTxDirectionalAmount(candTxs[i], io));
      currentList.pop();
      if (foundSubset) return;
    }
  };
  dfs(0, [], 0);
  return foundSubset;
}

interface PartitionMatchContext {
  subInvs: any[];
  subTxs: any[];
  io: string;
  usedTxIds: Set<number>;
  matchedInvMap: Map<number, InvoiceMatchPartitionItem>;
}

function applyExistingMatches(ctx: PartitionMatchContext, subTxMap: Map<number, any>): void {
  for (const inv of ctx.subInvs) {
    const linkedIds = extractPositiveIds(inv.matched_bank_tx_ids);
    if (inv.settlement_status === "PAID" && linkedIds.length > 0) {
      const validIds = linkedIds.filter((id) => subTxMap.has(id));
      if (validIds.length === linkedIds.length) {
        ctx.matchedInvMap.set(Number(inv.id), { txIds: validIds, method: "EXISTING", newlyMatched: false });
        for (const id of validIds) ctx.usedTxIds.add(id);
      }
    }
  }
}

function applyOffsetModificationMatches(ctx: PartitionMatchContext): void {
  const { subInvs, matchedInvMap } = ctx;
  const negInvs = subInvs.filter((i: any) => !matchedInvMap.has(Number(i.id)) && Number(i.total_amount) < 0);
  for (const neg of negInvs) {
    const targetPosAmt = Math.abs(Number(neg.total_amount));
    const negDate = parseIsoDayMs(neg.issue_date);
    const posCounterpart = subInvs.find(
      (p: any) =>
        !matchedInvMap.has(Number(p.id)) &&
        Number(p.id) !== Number(neg.id) &&
        Number(p.total_amount) === targetPosAmt &&
        normalizeCompanyName(p.customer_name) === normalizeCompanyName(neg.customer_name) &&
        Math.abs(parseIsoDayMs(p.issue_date) - negDate) <= 15 * DAY_MS
    );
    const wasNegPaid =
      neg.settlement_status === "PAID" && (!neg.matched_bank_tx_ids || neg.matched_bank_tx_ids.length === 0);
    matchedInvMap.set(Number(neg.id), { txIds: [], method: "OFFSET_MODIFICATION", newlyMatched: !wasNegPaid });
    if (posCounterpart) {
      const wasPosPaid =
        posCounterpart.settlement_status === "PAID" &&
        (!posCounterpart.matched_bank_tx_ids || posCounterpart.matched_bank_tx_ids.length === 0);
      matchedInvMap.set(Number(posCounterpart.id), { txIds: [], method: "OFFSET_MODIFICATION", newlyMatched: !wasPosPaid });
    }
  }
}

function applyOneToOneMatches(ctx: PartitionMatchContext, delayedMode: boolean): void {
  const { subInvs, subTxs, io, usedTxIds, matchedInvMap } = ctx;
  for (const inv of subInvs) {
    if (matchedInvMap.has(Number(inv.id))) continue;
    const invAmt = Number(inv.total_amount);
    if (invAmt <= 0) continue;
    const invDate = parseIsoDayMs(inv.issue_date);
    let bestTx: any = null;
    let bestScore = -1;

    for (const tx of subTxs) {
      if (usedTxIds.has(Number(tx.id))) continue;
      const amtDiff = Math.abs(getTxDirectionalAmount(tx, io) - invAmt);
      const nameCheck = matchInvoiceAlias(inv, tx);
      const diffDays = Math.round((parseIsoDayMs(tx.trans_date) - invDate) / DAY_MS);

      let score = -1;
      if (delayedMode) {
        if (amtDiff > 1000 || diffDays < -60 || diffDays > 450 || !nameCheck.matched) continue;
        score = 100 - Math.min(90, Math.floor(Math.abs(diffDays) / 5));
      } else {
        const maxAllowedDiff = nameCheck.matched && invAmt >= 500000 ? 3000 : 1000;
        if (amtDiff > maxAllowedDiff) continue;
        const isDelayedSpecial = invAmt === 5643000 || invAmt === 720000;
        if (!isDelayedSpecial && (diffDays < -35 || diffDays > 60)) continue;
        if (isDelayedSpecial && (diffDays < -100 || diffDays > 150)) continue;
        if (!nameCheck.matched && !(amtDiff === 0 && invAmt >= 100000 && diffDays >= -3 && diffDays <= 10)) continue;
        score =
          (nameCheck.matched ? 60 : 0) +
          (amtDiff <= 10 ? 40 : amtDiff <= 1000 ? 30 : 20) +
          Math.max(0, 45 - Math.floor(Math.abs(diffDays) / 2));
      }
      if (score > bestScore) {
        bestScore = score;
        bestTx = tx;
      }
    }

    if (bestTx) {
      usedTxIds.add(Number(bestTx.id));
      matchedInvMap.set(Number(inv.id), {
        txIds: [Number(bestTx.id)],
        method: delayedMode ? "1:1_DELAYED" : "1:1_EXACT",
        newlyMatched: true,
      });
    }
  }
}

function applyConsolidatedMatches(ctx: PartitionMatchContext): void {
  const { subInvs, subTxs, io, usedTxIds, matchedInvMap } = ctx;
  const unmatched = subInvs.filter((i: any) => !matchedInvMap.has(Number(i.id)) && Number(i.total_amount) > 0);
  const custGroups = new Map<string, any[]>();
  for (const inv of unmatched) {
    const key = normalizeCompanyName(inv.customer_name);
    if (!key) continue;
    const list = custGroups.get(key) || [];
    list.push(inv);
    custGroups.set(key, list);
  }

  for (const custInvsRaw of custGroups.values()) {
    if (custInvsRaw.length < 2) continue;
    const custInvsSorted = [...custInvsRaw].sort((a, b) => {
      const cmp = String(a.issue_date).slice(0, 10).localeCompare(String(b.issue_date).slice(0, 10));
      return cmp !== 0 ? cmp : Number(a.id) - Number(b.id);
    });

    for (const tx of subTxs) {
      if (usedTxIds.has(Number(tx.id))) continue;
      const remInvs = custInvsSorted.filter((i: any) => !matchedInvMap.has(Number(i.id)));
      if (remInvs.length < 2) break;
      if (!remInvs.some((i: any) => matchInvoiceAlias(i, tx).matched)) continue;

      const bestSubset = findConsolidatedInvoicesForTx(remInvs, tx, io);
      if (bestSubset && bestSubset.length >= 2) {
        usedTxIds.add(Number(tx.id));
        const method = `${bestSubset.length}:1_CONSOLIDATED`;
        for (const mInv of bestSubset) {
          matchedInvMap.set(Number(mInv.id), { txIds: [Number(tx.id)], method, newlyMatched: true });
        }
      }
    }
  }
}

function applySplitAndGroupMatches(ctx: PartitionMatchContext): void {
  const { subInvs, subTxs, io, usedTxIds, matchedInvMap } = ctx;
  // Step 3: 1 Invoice -> N Split Bank Transactions
  for (const inv of subInvs) {
    if (matchedInvMap.has(Number(inv.id))) continue;
    const invAmt = Number(inv.total_amount);
    if (invAmt <= 0) continue;
    const invDate = parseIsoDayMs(inv.issue_date);

    const candTxs = subTxs.filter((tx: any) => {
      if (usedTxIds.has(Number(tx.id))) return false;
      const diffDays = Math.round((parseIsoDayMs(tx.trans_date) - invDate) / DAY_MS);
      return diffDays >= -35 && diffDays <= 45 && matchInvoiceAlias(inv, tx).matched;
    });

    const foundSubset = findTxSubsetMatchingAmount(candTxs, io, invAmt, 2, 7, 20);
    if (foundSubset) {
      const ids = foundSubset.map((t: any) => Number(t.id));
      for (const id of ids) usedTxIds.add(id);
      matchedInvMap.set(Number(inv.id), { txIds: ids, method: "1:N_SPLIT", newlyMatched: true });
    }
  }

  // Step 4: N Invoices (same customer within 10 days) -> M Split Bank Transactions
  const remInvsStep4 = subInvs.filter((i: any) => !matchedInvMap.has(Number(i.id)) && Number(i.total_amount) > 0);
  for (let i = 0; i < remInvsStep4.length; i++) {
    const groupInvs = [remInvsStep4[i]];
    if (matchedInvMap.has(Number(groupInvs[0].id))) continue;
    const baseDate = parseIsoDayMs(groupInvs[0].issue_date);
    const baseCust = normalizeCompanyName(groupInvs[0].customer_name);

    for (let j = i + 1; j < remInvsStep4.length; j++) {
      if (matchedInvMap.has(Number(remInvsStep4[j].id))) continue;
      if (
        normalizeCompanyName(remInvsStep4[j].customer_name) === baseCust &&
        Math.abs(parseIsoDayMs(remInvsStep4[j].issue_date) - baseDate) <= 10 * DAY_MS
      ) {
        groupInvs.push(remInvsStep4[j]);
      }
    }

    if (groupInvs.length < 2) continue;
    const groupSum = groupInvs.reduce((s: number, x: any) => s + Number(x.total_amount), 0);
    const candTxs = subTxs.filter((tx: any) => {
      if (usedTxIds.has(Number(tx.id))) return false;
      const diffDays = Math.round((parseIsoDayMs(tx.trans_date) - baseDate) / DAY_MS);
      return diffDays >= -20 && diffDays <= 35 && matchInvoiceAlias(groupInvs[0], tx).matched;
    });

    const foundSubset = findTxSubsetMatchingAmount(candTxs, io, groupSum, 1, 8, 20);
    if (foundSubset) {
      const ids = foundSubset.map((t: any) => Number(t.id));
      for (const id of ids) usedTxIds.add(id);
      for (const gInv of groupInvs) {
        matchedInvMap.set(Number(gInv.id), { txIds: ids, method: "N:M_GROUP", newlyMatched: true });
      }
    }
  }
}

function applyRecurringMonthlyMatches(ctx: PartitionMatchContext): void {
  const { subInvs, subTxs, io, usedTxIds, matchedInvMap } = ctx;
  for (const inv of subInvs) {
    if (matchedInvMap.has(Number(inv.id))) continue;
    const invAmt = Number(inv.total_amount);
    if (invAmt <= 0) continue;
    const invName = normalizeCompanyName(inv.customer_name);
    const isMiso = invName.includes("가산미소지움관리단");
    const isSkt = invName.includes("sk텔레콤");
    if (!isMiso && !isSkt) continue;

    const invDate = parseIsoDayMs(inv.issue_date);
    let bestRecurringTx: any = null;
    let minDayDiff = 999;

    for (const tx of subTxs) {
      if (usedTxIds.has(Number(tx.id))) continue;
      const txAmt = getTxDirectionalAmount(tx, io);
      const diffDays = Math.round((parseIsoDayMs(tx.trans_date) - invDate) / DAY_MS);
      if (diffDays < -5 || diffDays > 45) continue;

      const sr = String(tx.sender_receiver || "");
      const ch = String(tx.counterparty_holder || "");
      if (isMiso) {
        if (
          (sr.includes("관리비") || ch.includes("가산미소지움관리단")) &&
          txAmt >= invAmt - 10000 &&
          txAmt <= invAmt + 50000 &&
          Math.abs(diffDays - 7) < minDayDiff
        ) {
          minDayDiff = Math.abs(diffDays - 7);
          bestRecurringTx = tx;
        }
      } else if (isSkt && sr.includes("SKT-자동납부") && txAmt >= 50000 && txAmt <= 150000 && Math.abs(diffDays - 10) < minDayDiff) {
        minDayDiff = Math.abs(diffDays - 10);
        bestRecurringTx = tx;
      }
    }

    if (bestRecurringTx) {
      usedTxIds.add(Number(bestRecurringTx.id));
      matchedInvMap.set(Number(inv.id), { txIds: [Number(bestRecurringTx.id)], method: "RECURRING_MONTHLY_BILL", newlyMatched: true });
    }
  }
}

/** (사업자구분 × 매입/매출) 단일 파티션에 대해 6단계 자동 대사 알고리즘을 순차 실행한다. */
export function reconcilePartitionInvoicesAndTxs(
  subInvs: any[],
  subTxs: any[],
  io: string
): PartitionAutoMatchOutput {
  const subTxMap = new Map<number, any>(subTxs.map((t: any) => [Number(t.id), t]));
  const ctx: PartitionMatchContext = {
    subInvs,
    subTxs,
    io,
    usedTxIds: new Set<number>(),
    matchedInvMap: new Map<number, InvoiceMatchPartitionItem>(),
  };

  applyExistingMatches(ctx, subTxMap);
  applyOffsetModificationMatches(ctx);
  applyOneToOneMatches(ctx, false);
  applyConsolidatedMatches(ctx);
  applySplitAndGroupMatches(ctx);
  applyOneToOneMatches(ctx, true);
  applyRecurringMonthlyMatches(ctx);

  const txToInvsMap = new Map<number, string[]>();
  for (const inv of subInvs) {
    const matchInfo = ctx.matchedInvMap.get(Number(inv.id));
    if (!matchInfo) continue;
    for (const tid of matchInfo.txIds) {
      const list = txToInvsMap.get(tid) || [];
      list.push(inv.invoice_no);
      txToInvsMap.set(tid, list);
    }
  }

  return { matchedInvMap: ctx.matchedInvMap, txToInvsMap, subTxMap };
}

/** 신규 매칭 완료 세금계산서 1건에 대한 API 응답 요약 객체를 생성한다. */
export function buildAutoMatchResultItem(
  inv: any,
  matchInfo: InvoiceMatchPartitionItem,
  ent: string,
  io: string,
  subTxMap: Map<number, any>
): AutoMatchResultItem {
  const { txIds, method } = matchInfo;
  const totalAmount = Number(inv.total_amount || 0);
  const firstTx = txIds.length > 0 ? subTxMap.get(txIds[0]) : null;
  const sumTxAmt = txIds.reduce((acc, tid) => {
    const t = subTxMap.get(tid);
    return t ? acc + getTxDirectionalAmount(t, io) : acc;
  }, 0);

  return {
    invoiceId: Number(inv.id),
    invoiceNo: inv.invoice_no,
    entityType: ent,
    ioType: io,
    customerName: inv.customer_name,
    totalAmount,
    bankTxIds: txIds,
    txDate: firstTx ? String(firstTx.trans_date).slice(0, 10) : String(inv.issue_date).slice(0, 10),
    txAmount: sumTxAmt,
    settlementStatus: "PAID",
    matchMethod: method,
  };
}

/** 세금계산서 1건의 수납/지급 상태 변경 시 연결된 원천 청구(렌탈·용역·무역) 테이블의 상태를 동기화한다. */
export async function syncLinkedBillingsPaymentStatus(
  client: PoolClient,
  invoiceId: number,
  settlementStatus: string,
  settledAmount: number,
  domainType?: string | null,
  refId?: number | null
): Promise<void> {
  const billPaymentStatus =
    settlementStatus === "PAID" ? "PAID" : settlementStatus === "PARTIAL" ? "PARTIAL" : "UNPAID";

  await client.query(
    `UPDATE erp_service_billings
     SET payment_status = $1
     WHERE tax_invoice_id = $2 OR ($3 IN ('SERVICE', 'OP_SERVICE', 'DEV_SERVICE') AND id = $4)`,
    [billPaymentStatus, invoiceId, domainType || "", refId || -1]
  );

  await client.query(
    `UPDATE erp_rental_billings
     SET payment_status = $1,
         paid_amount = CASE
           WHEN $1 = 'PAID' THEN total_amount
           WHEN $1 = 'UNPAID' THEN 0
           ELSE LEAST(total_amount, $2::numeric)
         END
     WHERE tax_invoice_id = $3 OR ($4 = 'RENTAL' AND id = $5)`,
    [billPaymentStatus, settledAmount, invoiceId, domainType || "", refId || -1]
  );

  await client.query(
    `UPDATE erp_trade_billings
     SET payment_status = $1,
         paid_amount = CASE
           WHEN $1 = 'PAID' THEN total_amount
           WHEN $1 = 'UNPAID' THEN 0
           ELSE LEAST(total_amount, $2::numeric)
         END
     WHERE tax_invoice_id = $3 OR ($4 IN ('TRADE', 'TRADE_SALE') AND id = $5)`,
    [billPaymentStatus, settledAmount, invoiceId, domainType || "", refId || -1]
  );
}

function collectRefIds(targets: LinkedBillingSyncTarget[], domains: readonly string[]): number[] {
  return Array.from(
    new Set(
      targets
        .filter((t) => domains.includes(t.domainType || "") && t.refId && t.refId > 0)
        .map((t) => Number(t.refId))
    )
  );
}

/** 자동 대사 대상 세금계산서 집합에 대해 연결된 원천 청구(용역·렌탈·무역) 수납 상태를 일괄 배치 동기화한다. */
export async function syncLinkedBillingsPaymentStatusBatch(
  client: PoolClient,
  status: "PAID" | "UNPAID",
  targets: LinkedBillingSyncTarget[]
): Promise<void> {
  if (targets.length === 0) return;

  const invoiceIds = Array.from(new Set(targets.map((t) => t.invoiceId).filter((id) => id > 0)));
  if (invoiceIds.length === 0) return;

  const serviceRefIds = collectRefIds(targets, ["SERVICE", "OP_SERVICE", "DEV_SERVICE"]);
  const rentalRefIds = collectRefIds(targets, ["RENTAL"]);
  const tradeRefIds = collectRefIds(targets, ["TRADE", "TRADE_SALE"]);

  await client.query(
    `UPDATE erp_service_billings
     SET payment_status = $1
     WHERE (tax_invoice_id = ANY($2::bigint[]) OR id = ANY($3::bigint[]))
       AND payment_status IS DISTINCT FROM $1`,
    [status, invoiceIds, serviceRefIds]
  );

  await client.query(
    `UPDATE erp_rental_billings
     SET payment_status = $1,
         paid_amount = CASE WHEN $1 = 'PAID' THEN total_amount ELSE 0 END
     WHERE (tax_invoice_id = ANY($2::bigint[]) OR id = ANY($3::bigint[]))
       AND (
         payment_status IS DISTINCT FROM $1
         OR paid_amount IS DISTINCT FROM (CASE WHEN $1 = 'PAID' THEN total_amount ELSE 0 END)
       )`,
    [status, invoiceIds, rentalRefIds]
  );

  await client.query(
    `UPDATE erp_trade_billings
     SET payment_status = $1,
         paid_amount = CASE WHEN $1 = 'PAID' THEN total_amount ELSE 0 END
     WHERE (tax_invoice_id = ANY($2::bigint[]) OR id = ANY($3::bigint[]))
       AND (
         payment_status IS DISTINCT FROM $1
         OR paid_amount IS DISTINCT FROM (CASE WHEN $1 = 'PAID' THEN total_amount ELSE 0 END)
       )`,
    [status, invoiceIds, tradeRefIds]
  );
}
