import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// Normalize counterparty/company names by stripping legal entity prefixes/suffixes and spaces
function normalizeCompanyName(raw?: string): string {
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

function checkCompanyAliasMatch(
  invNameRaw?: string,
  invCeoRaw?: string,
  txSenderRaw?: string,
  txHolderRaw?: string,
  txMemoRaw?: string
): { matched: boolean; reason: string; score: number } {
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
        txSender &&
        (txSender.includes("급여") ||
          txSender.includes("가수금") ||
          txSender.includes("가수근") ||
          txSender.includes("퇴직") ||
          /^\d{4}이정용$/.test(txSender));
      if (isSalaryOrPersonal) {
        return { matched: false, reason: "", score: 0 };
      }
      if (
        (txSender &&
          (txSender.includes("드래곤") ||
            txSender.includes("용역") ||
            txSender.includes("착수금") ||
            txSender.includes("단기") ||
            txSender.includes("매입") ||
            txSender.includes("노트북") ||
            txSender.includes("ssd") ||
            txSender.includes("대납") ||
            txSender.includes("민주당"))) ||
        (txHolder && txHolder.includes("드래곤"))
      ) {
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
    if (invName.includes("aj솔루션테크") || invName.includes("aj렌탈")) {
      if (
        (txSender && (txSender.includes("aj") || txSender.includes("에이제이"))) ||
        (txHolder && (txHolder.includes("aj") || txHolder.includes("에이제이")))
      ) {
        return { matched: true, reason: "AJ계열사(솔루션테크/렌탈서비스) 일치", score: 50 };
      }
    }
    if (invName.includes("푸드트래블")) {
      if (txSender && txSender.includes("푸드트래블")) {
        return { matched: true, reason: "푸드트래블(대납정산 포함) 일치", score: 50 };
      }
    }
    if (invName.includes("sk텔레콤") || invName.includes("sk브로드밴드")) {
      if (txSender.includes("skt") || txSender.includes("sk브로드") || txSender.includes("에스케이")) {
        return { matched: true, reason: "SKT/SKB 통신요금 자동납부", score: 50 };
      }
    }
    if (invName.includes("중소기업은행") || invName.includes("기업은행")) {
      if (txSender.includes("수수료") || txSender.includes("기업은행") || txSender.includes("ibk")) {
        return { matched: true, reason: "은행 수수료 일치", score: 50 };
      }
    }
    if (invName.includes("귀뚜라미에너지")) {
      if (txSender.includes("도시가스") || txSender.includes("귀뚜라미") || (txHolder && txHolder.includes("도시가스"))) {
        return { matched: true, reason: "도시가스 요금 일치", score: 50 };
      }
    }
    if (invName.includes("가산미소지움관리단")) {
      if (txSender.includes("관리비") || txSender.includes("미소지움") || (txHolder && txHolder.includes("미소지움"))) {
        return { matched: true, reason: "관리비 일치", score: 50 };
      }
    }
    if (invName.includes("이명옥")) {
      if (txSender.includes("임차료") || txSender.includes("월세") || txSender.includes("이명옥") || (txHolder && txHolder.includes("이명옥"))) {
        return { matched: true, reason: "임차료(이명옥) 일치", score: 50 };
      }
    }
    if (invName.includes("세종세무회계")) {
      if (txSender.includes("세무") || txSender.includes("기장") || txSender.includes("세종") || (txHolder && txHolder.includes("세종"))) {
        return { matched: true, reason: "세무기장료 일치", score: 50 };
      }
    }
    if (invName.includes("한국정보인증")) {
      if (txSender.includes("인증") || txSender.includes("한국정보인증") || (txHolder && txHolder.includes("한국정보인증"))) {
        return { matched: true, reason: "인증서 수수료 일치", score: 50 };
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

// Compute match score between a tax invoice and a bank transaction
function computeMatchScore(inv: any, tx: any): {
  score: number;
  reasons: string[];
  nameMatched: boolean;
  amountExact: boolean;
} {
  const ioType = inv.io_type || inv.ioType || "SALE";
  const unpaid = Math.max(0, Number(inv.total_amount ?? inv.totalAmount ?? 0) - Number(inv.settled_amount ?? inv.settledAmount ?? 0));
  const totalAmt = Number(inv.total_amount ?? inv.totalAmount ?? 0);
  const txAmt = ioType === "PURCHASE"
    ? Number(tx.withdrawal_amount ?? tx.withdrawalAmount ?? tx.amount ?? 0)
    : Number(tx.deposit_amount ?? tx.depositAmount ?? tx.amount ?? 0);

  let score = 0;
  const reasons: string[] = [];

  // 1. Counterparty Name Similarity
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

  // 2. Amount Similarity
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

  // 3. Date Proximity
  const invDate = new Date(String(inv.issue_date ?? inv.issueDate).slice(0, 10)).getTime();
  const txDate = new Date(String(tx.trans_date ?? tx.transDate).slice(0, 10)).getTime();
  if (!isNaN(invDate) && !isNaN(txDate)) {
    const diffDays = Math.round((txDate - invDate) / (1000 * 60 * 60 * 24));
    if (diffDays >= -5 && diffDays <= 45) {
      score += 10;
      reasons.push(diffDays === 0 ? "당일 입출금" : `발행 후 ${diffDays}일`);
    } else if (diffDays > 45 && diffDays <= 120) {
      score += 4;
    }
  }

  return { score, reasons, nameMatched, amountExact };
}

// GET: Retrieve candidate bank transactions for a specific tax invoice OR list already matched bank transactions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    const pool = getErpPool();

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId 파라미터가 필요합니다." }, { status: 400 });
    }

    const invRes = await pool.query("SELECT * FROM erp_tax_invoices WHERE id = $1", [Number(invoiceId)]);
    if (invRes.rows.length === 0) {
      return NextResponse.json({ error: "해당 세금계산서를 찾을 수 없습니다." }, { status: 404 });
    }
    const inv = invRes.rows[0];
    const ioType = inv.io_type || "SALE";
    const invEntity = inv.supplier_entity_type || "CORP";
    const matchedIds: number[] = Array.isArray(inv.matched_bank_tx_ids)
      ? inv.matched_bank_tx_ids.map((x: any) => Number(x)).filter((n: number) => n > 0)
      : [];

    // 1. Fetch already linked bank transactions
    let linkedTxs: any[] = [];
    if (matchedIds.length > 0) {
      const linkedRes = await pool.query(
        `SELECT
          id, bank_name as "bankName", account_no as "accountNo",
          COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) as "entityType",
          TO_CHAR(trans_date, 'YYYY-MM-DD') as "transDate", trans_time as "transTime",
          trans_type as "transType", amount, deposit_amount as "depositAmount",
          withdrawal_amount as "withdrawalAmount", balance_after as "balanceAfter",
          sender_receiver as "senderReceiver", counterparty_holder as "counterpartyHolder",
          memo, is_matched as "isMatched", matched_type as "matchedType", matched_id as "matchedId"
         FROM erp_bank_transactions
         WHERE id = ANY($1::bigint[])
         ORDER BY trans_date DESC, id DESC`,
        [matchedIds]
      );
      linkedTxs = linkedRes.rows;
    }

    // 2. Fetch candidate unmatched (or same-direction & same-entity) bank transactions
    const txCondition = ioType === "PURCHASE"
      ? `(COALESCE(withdrawal_amount, 0) > 0 OR trans_type = 'WITHDRAWAL')`
      : `(COALESCE(deposit_amount, 0) > 0 OR trans_type = 'DEPOSIT')`;

    const candRes = await pool.query(
      `SELECT
        id, bank_name as "bankName", account_no as "accountNo",
        COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) as "entityType",
        TO_CHAR(trans_date, 'YYYY-MM-DD') as "transDate", trans_time as "transTime",
        trans_type as "transType", amount, deposit_amount as "depositAmount",
        withdrawal_amount as "withdrawalAmount", balance_after as "balanceAfter",
        sender_receiver as "senderReceiver", counterparty_holder as "counterpartyHolder",
        memo, is_matched as "isMatched", matched_type as "matchedType", matched_id as "matchedId"
       FROM erp_bank_transactions
       WHERE ${txCondition}
         AND COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) = $2
         AND (COALESCE(is_matched, false) = false OR id = ANY($1::bigint[]))
       ORDER BY trans_date DESC, id DESC
       LIMIT 300`,
      [matchedIds, invEntity]
    );

    const scoredCandidates = candRes.rows
      .filter((tx) => !matchedIds.includes(Number(tx.id)))
      .map((tx) => {
        const { score, reasons, nameMatched, amountExact } = computeMatchScore(inv, tx);
        return {
          ...tx,
          matchScore: score,
          matchReasons: reasons,
          nameMatched,
          amountExact,
        };
      })
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return String(b.transDate).localeCompare(String(a.transDate));
      });

    return NextResponse.json({
      success: true,
      invoice: inv,
      linkedTransactions: linkedTxs,
      candidateTransactions: scoredCandidates.slice(0, 80),
    });
  } catch (error: any) {
    console.error("GET Reconcile Candidates Error:", error);
    return NextResponse.json({ error: "입출금 대사 후보 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: Reconcile tax invoices with bank transactions (AUTO_MATCH, MATCH, UNMATCH, MANUAL_SETTLE)
export async function POST(request: Request) {
  const pool = getErpPool();
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { action } = body;

    await client.query("BEGIN");

    // =========================================================================
    // ACTION 1: AUTO_MATCH (사업자별·매입매출별 세금계산서 ↔ 통장 입출금 자동 비교 대사)
    // =========================================================================
    if (action === "AUTO_MATCH") {
      const targetIoType = body.ioType || "ALL"; // 'SALE' | 'PURCHASE' | 'ALL'
      const targetEntityType = body.entityType || "ALL"; // 'CORP' | 'INDIVIDUAL' | 'ALL'

      const allInvs = (
        await client.query(`
          SELECT id, invoice_no, COALESCE(io_type, 'SALE') AS io_type,
                 COALESCE(supplier_entity_type, 'CORP') AS entity_type,
                 customer_name, business_no, ceo_name, issue_date::text AS issue_date,
                 COALESCE(total_amount, 0)::numeric AS total_amount,
                 COALESCE(settled_amount, 0)::numeric AS settled_amount,
                 COALESCE(settlement_status, 'UNPAID') AS settlement_status,
                 COALESCE(matched_bank_tx_ids, '[]'::jsonb) AS matched_bank_tx_ids,
                 item_name, memo
          FROM erp_tax_invoices
          ORDER BY issue_date ASC, id ASC
        `)
      ).rows;

      const allTxs = (
        await client.query(`
          SELECT id,
                 COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) AS entity_type,
                 account_no, trans_date::text AS trans_date, trans_time, trans_type,
                 COALESCE(deposit_amount, 0)::numeric AS deposit_amount,
                 COALESCE(withdrawal_amount, 0)::numeric AS withdrawal_amount,
                 sender_receiver, counterparty_holder, counterparty_account, memo,
                 COALESCE(is_matched, false) AS is_matched, matched_type, matched_id
          FROM erp_bank_transactions
          ORDER BY trans_date ASC, trans_time ASC, id ASC
        `)
      ).rows;

      const entities = targetEntityType === "ALL" ? ["CORP", "INDIVIDUAL"] : [targetEntityType];
      const ioTypes = targetIoType === "ALL" ? ["SALE", "PURCHASE"] : [targetIoType];

      const matchedResults: Array<{
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
      }> = [];

      for (const ent of entities) {
        for (const io of ioTypes) {
          const subInvs = allInvs.filter((i: any) => i.entity_type === ent && i.io_type === io);
          const subTxs = allTxs.filter(
            (t: any) =>
              t.entity_type === ent &&
              (io === "SALE" ? Number(t.deposit_amount) > 0 : Number(t.withdrawal_amount) > 0)
          );
          const subTxMap = new Map<number, any>(subTxs.map((t: any) => [Number(t.id), t]));

          const usedTxIds = new Set<number>();
          const matchedInvMap = new Map<number, { txIds: number[]; method: string; newlyMatched: boolean }>();

          // 0-A. Preserve existing valid matches ONLY if every linked bankTx belongs to the same entity AND same direction
          for (const inv of subInvs) {
            const linkedIds: number[] = Array.isArray(inv.matched_bank_tx_ids)
              ? inv.matched_bank_tx_ids.map((n: any) => Number(n)).filter((n: number) => n > 0)
              : [];
            if (inv.settlement_status === "PAID" && linkedIds.length > 0) {
              const validIds = linkedIds.filter((id) => subTxMap.has(id));
              if (validIds.length === linkedIds.length) {
                matchedInvMap.set(Number(inv.id), { txIds: validIds, method: "EXISTING", newlyMatched: false });
                for (const id of validIds) usedTxIds.add(id);
              }
            }
          }

          // 0-B. Offsetting Modification Invoices (+A and -A on same customer within 15 days)
          const negInvs = subInvs.filter((i: any) => !matchedInvMap.has(Number(i.id)) && Number(i.total_amount) < 0);
          for (const neg of negInvs) {
            const targetPosAmt = Math.abs(Number(neg.total_amount));
            const negDate = new Date(neg.issue_date).getTime();
            const posCounterpart = subInvs.find(
              (p: any) =>
                !matchedInvMap.has(Number(p.id)) &&
                Number(p.id) !== Number(neg.id) &&
                Number(p.total_amount) === targetPosAmt &&
                normalizeCompanyName(p.customer_name) === normalizeCompanyName(neg.customer_name) &&
                Math.abs(new Date(p.issue_date).getTime() - negDate) <= 15 * 86400 * 1000
            );
            const wasNegPaid = neg.settlement_status === "PAID" && (!neg.matched_bank_tx_ids || neg.matched_bank_tx_ids.length === 0);
            matchedInvMap.set(Number(neg.id), { txIds: [], method: "OFFSET_MODIFICATION", newlyMatched: !wasNegPaid });
            if (posCounterpart) {
              const wasPosPaid =
                posCounterpart.settlement_status === "PAID" &&
                (!posCounterpart.matched_bank_tx_ids || posCounterpart.matched_bank_tx_ids.length === 0);
              matchedInvMap.set(Number(posCounterpart.id), {
                txIds: [],
                method: "OFFSET_MODIFICATION",
                newlyMatched: !wasPosPaid,
              });
            }
          }

          // Step 1: 1:1 Exact or Rounding match
          for (const inv of subInvs) {
            if (matchedInvMap.has(Number(inv.id))) continue;
            const invAmt = Number(inv.total_amount);
            if (invAmt <= 0) continue;
            const invDate = new Date(inv.issue_date).getTime();

            let bestTx: any = null;
            let bestScore = -1;

            for (const tx of subTxs) {
              if (usedTxIds.has(Number(tx.id))) continue;
              const txAmt = io === "SALE" ? Number(tx.deposit_amount) : Number(tx.withdrawal_amount);
              const amtDiff = Math.abs(txAmt - invAmt);

              const nameCheck = checkCompanyAliasMatch(
                inv.customer_name,
                inv.ceo_name,
                tx.sender_receiver,
                tx.counterparty_holder,
                tx.memo
              );

              const maxAllowedDiff = nameCheck.matched && invAmt >= 500000 ? 3000 : 1000;
              if (amtDiff > maxAllowedDiff) continue;

              const txDate = new Date(tx.trans_date).getTime();
              const diffDays = Math.round((txDate - invDate) / (1000 * 60 * 60 * 24));
              const isDelayedSpecial = invAmt === 5643000 || invAmt === 720000;
              if (!isDelayedSpecial && (diffDays < -35 || diffDays > 60)) continue;
              if (isDelayedSpecial && (diffDays < -100 || diffDays > 150)) continue;

              if (!nameCheck.matched && !(amtDiff === 0 && invAmt >= 100000 && diffDays >= -3 && diffDays <= 10)) continue;

              const score =
                (nameCheck.matched ? 60 : 0) +
                (amtDiff <= 10 ? 40 : amtDiff <= 1000 ? 30 : 20) +
                Math.max(0, 45 - Math.floor(Math.abs(diffDays) / 2));
              if (score > bestScore) {
                bestScore = score;
                bestTx = tx;
              }
            }

            if (bestTx) {
              usedTxIds.add(Number(bestTx.id));
              matchedInvMap.set(Number(inv.id), {
                txIds: [Number(bestTx.id)],
                method: "1:1_EXACT",
                newlyMatched: true,
              });
            }
          }

          // Step 2: 2 Invoices (same customer) -> 1 Consolidated Bank Transaction
          const unmatchedStep2 = subInvs.filter(
            (i: any) => !matchedInvMap.has(Number(i.id)) && Number(i.total_amount) > 0
          );
          for (let a = 0; a < unmatchedStep2.length; a++) {
            const invA = unmatchedStep2[a];
            if (matchedInvMap.has(Number(invA.id))) continue;
            for (let b = a + 1; b < unmatchedStep2.length; b++) {
              const invB = unmatchedStep2[b];
              if (matchedInvMap.has(Number(invB.id))) continue;
              if (normalizeCompanyName(invA.customer_name) !== normalizeCompanyName(invB.customer_name)) continue;

              const dateA = new Date(invA.issue_date).getTime();
              const dateB = new Date(invB.issue_date).getTime();
              if (Math.abs(dateB - dateA) > 45 * 86400 * 1000) continue;

              const combinedAmt = Number(invA.total_amount) + Number(invB.total_amount);

              const matchTx = subTxs.find((tx: any) => {
                if (usedTxIds.has(Number(tx.id))) return false;
                const txAmt = io === "SALE" ? Number(tx.deposit_amount) : Number(tx.withdrawal_amount);
                if (Math.abs(txAmt - combinedAmt) > 100) return false;
                const txDate = new Date(tx.trans_date).getTime();
                const minDate = Math.min(dateA, dateB);
                const maxDate = Math.max(dateA, dateB);
                if (txDate < minDate - 15 * 86400 * 1000 || txDate > maxDate + 45 * 86400 * 1000) return false;
                return checkCompanyAliasMatch(
                  invA.customer_name,
                  invA.ceo_name,
                  tx.sender_receiver,
                  tx.counterparty_holder,
                  tx.memo
                ).matched;
              });

              if (matchTx) {
                usedTxIds.add(Number(matchTx.id));
                matchedInvMap.set(Number(invA.id), {
                  txIds: [Number(matchTx.id)],
                  method: "2:1_CONSOLIDATED",
                  newlyMatched: true,
                });
                matchedInvMap.set(Number(invB.id), {
                  txIds: [Number(matchTx.id)],
                  method: "2:1_CONSOLIDATED",
                  newlyMatched: true,
                });
                break;
              }
            }
          }

          // Step 3: 1 Invoice -> N Split Bank Transactions (e.g., 1,000,000 limit split transfers)
          for (const inv of subInvs) {
            if (matchedInvMap.has(Number(inv.id))) continue;
            const invAmt = Number(inv.total_amount);
            if (invAmt <= 0) continue;
            const invDate = new Date(inv.issue_date).getTime();

            const candTxs = subTxs.filter((tx: any) => {
              if (usedTxIds.has(Number(tx.id))) return false;
              const txDate = new Date(tx.trans_date).getTime();
              const diffDays = Math.round((txDate - invDate) / (1000 * 60 * 60 * 24));
              if (diffDays < -35 || diffDays > 45) return false;
              return checkCompanyAliasMatch(
                inv.customer_name,
                inv.ceo_name,
                tx.sender_receiver,
                tx.counterparty_holder,
                tx.memo
              ).matched;
            });

            let foundSubset: any[] | null = null;
            const dfs = (idx: number, currentList: any[], currentSum: number) => {
              if (foundSubset) return;
              if (Math.abs(currentSum - invAmt) <= 100 && currentList.length >= 2) {
                foundSubset = [...currentList];
                return;
              }
              if (currentSum > invAmt + 100 || idx >= candTxs.length || currentList.length >= 7) return;
              for (let i = idx; i < candTxs.length; i++) {
                const amt =
                  io === "SALE" ? Number(candTxs[i].deposit_amount) : Number(candTxs[i].withdrawal_amount);
                currentList.push(candTxs[i]);
                dfs(i + 1, currentList, currentSum + amt);
                currentList.pop();
                if (foundSubset) return;
              }
            };
            if (candTxs.length >= 2 && candTxs.length <= 20) {
              dfs(0, [], 0);
            }
            if (foundSubset) {
              const subsetList = foundSubset as any[];
              const ids = subsetList.map((t: any) => Number(t.id));
              for (const id of ids) usedTxIds.add(id);
              matchedInvMap.set(Number(inv.id), {
                txIds: ids,
                method: "1:N_SPLIT",
                newlyMatched: true,
              });
            }
          }

          // Step 4: N Invoices (same customer within 10 days) -> M Split Bank Transactions
          const remInvsStep4 = subInvs.filter(
            (i: any) => !matchedInvMap.has(Number(i.id)) && Number(i.total_amount) > 0
          );
          for (let i = 0; i < remInvsStep4.length; i++) {
            const groupInvs = [remInvsStep4[i]];
            if (matchedInvMap.has(Number(groupInvs[0].id))) continue;
            const baseDate = new Date(groupInvs[0].issue_date).getTime();
            const baseCust = normalizeCompanyName(groupInvs[0].customer_name);

            for (let j = i + 1; j < remInvsStep4.length; j++) {
              if (matchedInvMap.has(Number(remInvsStep4[j].id))) continue;
              if (
                normalizeCompanyName(remInvsStep4[j].customer_name) === baseCust &&
                Math.abs(new Date(remInvsStep4[j].issue_date).getTime() - baseDate) <= 10 * 86400 * 1000
              ) {
                groupInvs.push(remInvsStep4[j]);
              }
            }

            if (groupInvs.length >= 2) {
              const groupSum = groupInvs.reduce((s: number, x: any) => s + Number(x.total_amount), 0);
              const candTxs = subTxs.filter((tx: any) => {
                if (usedTxIds.has(Number(tx.id))) return false;
                const txDate = new Date(tx.trans_date).getTime();
                const diffDays = Math.round((txDate - baseDate) / (1000 * 60 * 60 * 24));
                if (diffDays < -20 || diffDays > 35) return false;
                return checkCompanyAliasMatch(
                  groupInvs[0].customer_name,
                  groupInvs[0].ceo_name,
                  tx.sender_receiver,
                  tx.counterparty_holder,
                  tx.memo
                ).matched;
              });

              let foundSubset: any[] | null = null;
              const dfsGroup = (idx: number, currentList: any[], currentSum: number) => {
                if (foundSubset) return;
                if (Math.abs(currentSum - groupSum) <= 100 && currentList.length >= 1) {
                  foundSubset = [...currentList];
                  return;
                }
                if (currentSum > groupSum + 100 || idx >= candTxs.length || currentList.length >= 8) return;
                for (let k = idx; k < candTxs.length; k++) {
                  const amt =
                    io === "SALE" ? Number(candTxs[k].deposit_amount) : Number(candTxs[k].withdrawal_amount);
                  currentList.push(candTxs[k]);
                  dfsGroup(k + 1, currentList, currentSum + amt);
                  currentList.pop();
                  if (foundSubset) return;
                }
              };
              if (candTxs.length >= 1 && candTxs.length <= 20) {
                dfsGroup(0, [], 0);
              }
              if (foundSubset) {
                const subsetList = foundSubset as any[];
                const ids = subsetList.map((t: any) => Number(t.id));
                for (const id of ids) usedTxIds.add(id);
                for (const gInv of groupInvs) {
                  matchedInvMap.set(Number(gInv.id), {
                    txIds: ids,
                    method: "N:M_GROUP",
                    newlyMatched: true,
                  });
                }
              }
            }
          }

          // Step 4.5: Extended 1:1 fallback (for delayed payments)
          for (const inv of subInvs) {
            if (matchedInvMap.has(Number(inv.id))) continue;
            const invAmt = Number(inv.total_amount);
            if (invAmt <= 0) continue;
            const invDate = new Date(inv.issue_date).getTime();

            let bestTx: any = null;
            let bestScore = -1;

            for (const tx of subTxs) {
              if (usedTxIds.has(Number(tx.id))) continue;
              const txAmt = io === "SALE" ? Number(tx.deposit_amount) : Number(tx.withdrawal_amount);
              const amtDiff = Math.abs(txAmt - invAmt);
              if (amtDiff > 1000) continue;

              const txDate = new Date(tx.trans_date).getTime();
              const diffDays = Math.round((txDate - invDate) / (1000 * 60 * 60 * 24));
              if (diffDays < -60 || diffDays > 450) continue;

              const nameCheck = checkCompanyAliasMatch(
                inv.customer_name,
                inv.ceo_name,
                tx.sender_receiver,
                tx.counterparty_holder,
                tx.memo
              );
              if (!nameCheck.matched) continue;

              const score = 100 - Math.min(90, Math.floor(Math.abs(diffDays) / 5));
              if (score > bestScore) {
                bestScore = score;
                bestTx = tx;
              }
            }
            if (bestTx) {
              usedTxIds.add(Number(bestTx.id));
              matchedInvMap.set(Number(inv.id), {
                txIds: [Number(bestTx.id)],
                method: "1:1_DELAYED",
                newlyMatched: true,
              });
            }
          }

          // Step 5: Monthly Recurring Composite Billing Match (관리비 가산미소지움관리단, SKT-자동납부 등)
          for (const inv of subInvs) {
            if (matchedInvMap.has(Number(inv.id))) continue;
            const invAmt = Number(inv.total_amount);
            if (invAmt <= 0) continue;
            const invName = normalizeCompanyName(inv.customer_name);
            if (!invName.includes("가산미소지움관리단") && !invName.includes("sk텔레콤")) continue;

            const invDate = new Date(inv.issue_date).getTime();
            let bestRecurringTx: any = null;
            let minDayDiff = 999;

            for (const tx of subTxs) {
              if (usedTxIds.has(Number(tx.id))) continue;
              const txAmt = io === "SALE" ? Number(tx.deposit_amount) : Number(tx.withdrawal_amount);
              const txDate = new Date(tx.trans_date).getTime();
              const diffDays = Math.round((txDate - invDate) / (1000 * 60 * 60 * 24));
              if (diffDays < -5 || diffDays > 45) continue;

              if (invName.includes("가산미소지움관리단")) {
                const sr = String(tx.sender_receiver || "");
                const ch = String(tx.counterparty_holder || "");
                if (
                  (sr.includes("관리비") || ch.includes("가산미소지움관리단")) &&
                  txAmt >= invAmt - 10000 &&
                  txAmt <= invAmt + 50000
                ) {
                  if (Math.abs(diffDays - 7) < minDayDiff) {
                    minDayDiff = Math.abs(diffDays - 7);
                    bestRecurringTx = tx;
                  }
                }
              } else if (invName.includes("sk텔레콤")) {
                const sr = String(tx.sender_receiver || "");
                if (sr.includes("SKT-자동납부") && txAmt >= 50000 && txAmt <= 150000) {
                  if (Math.abs(diffDays - 10) < minDayDiff) {
                    minDayDiff = Math.abs(diffDays - 10);
                    bestRecurringTx = tx;
                  }
                }
              }
            }

            if (bestRecurringTx) {
              usedTxIds.add(Number(bestRecurringTx.id));
              matchedInvMap.set(Number(inv.id), {
                txIds: [Number(bestRecurringTx.id)],
                method: "RECURRING_MONTHLY_BILL",
                newlyMatched: true,
              });
            }
          }

          // Persist results to DB for this (entity, io) partition
          const txToInvsMap = new Map<number, string[]>();

          for (const inv of subInvs) {
            const matchInfo = matchedInvMap.get(Number(inv.id));
            const totalAmount = Number(inv.total_amount || 0);

            if (matchInfo) {
              const { txIds, method, newlyMatched } = matchInfo;
              for (const tid of txIds) {
                const list = txToInvsMap.get(tid) || [];
                list.push(inv.invoice_no);
                txToInvsMap.set(tid, list);
              }

              await client.query(
                `UPDATE erp_tax_invoices
                 SET settled_amount = $1,
                     settlement_status = 'PAID',
                     matched_bank_tx_ids = $2::jsonb,
                     settled_at = COALESCE(settled_at, NOW())
                 WHERE id = $3`,
                [totalAmount, JSON.stringify(txIds), inv.id]
              );

              if (newlyMatched) {
                const firstTx = txIds.length > 0 ? subTxMap.get(txIds[0]) : null;
                const sumTxAmt = txIds.reduce((acc, tid) => {
                  const t = subTxMap.get(tid);
                  if (!t) return acc;
                  return acc + (io === "SALE" ? Number(t.deposit_amount) : Number(t.withdrawal_amount));
                }, 0);

                matchedResults.push({
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
                });
              }
            } else {
              // If an invoice had invalid cross-entity matches previously, reset it cleanly to UNPAID
              const prevTxIds: number[] = Array.isArray(inv.matched_bank_tx_ids)
                ? inv.matched_bank_tx_ids.map((n: any) => Number(n)).filter((n: number) => n > 0)
                : [];
              if (prevTxIds.length > 0) {
                await client.query(
                  `UPDATE erp_tax_invoices
                   SET settled_amount = 0,
                       settlement_status = 'UNPAID',
                       matched_bank_tx_ids = '[]'::jsonb,
                       settled_at = NULL
                   WHERE id = $1`,
                  [inv.id]
                );
              }
            }
          }

          // Sync bank transactions in this partition
          const expectedMatchedType = io === "PURCHASE" ? "PURCHASE_INVOICE" : "SALE_INVOICE";
          for (const tx of subTxs) {
            const tid = Number(tx.id);
            const linkedInvNos = txToInvsMap.get(tid);
            if (linkedInvNos && linkedInvNos.length > 0) {
              await client.query(
                `UPDATE erp_bank_transactions
                 SET is_matched = true,
                     matched_type = $1,
                     matched_id = $2,
                     matched_at = COALESCE(matched_at, NOW())
                 WHERE id = $3`,
                [expectedMatchedType, linkedInvNos.join(","), tid]
              );
            } else if (tx.is_matched && tx.matched_type === expectedMatchedType) {
              await client.query(
                `UPDATE erp_bank_transactions
                 SET is_matched = false,
                     matched_type = NULL,
                     matched_id = NULL,
                     matched_at = NULL
                 WHERE id = $1`,
                [tid]
              );
            }
          }
        }
      }

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        matchedCount: matchedResults.length,
        matches: matchedResults,
        message:
          matchedResults.length > 0
            ? `사업자별 매입·매출 세금계산서와 통장 입출금 내역을 비교하여 총 ${matchedResults.length}건을 자동 대사 완료했습니다.`
            : "모든 사업자별 매칭 가능 내역이 이미 대사 완료 상태입니다.",
      });
    }

    // =========================================================================
    // ACTION 2: MATCH (선택한 세금계산서 1건과 통장 입출금 1~N건 연결 대사)
    // =========================================================================
    if (action === "MATCH") {
      const { invoiceId, bankTxIds } = body;
      if (!invoiceId || !Array.isArray(bankTxIds) || bankTxIds.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "세금계산서 ID와 연결할 통장 거래 내역을 선택해 주십시오." }, { status: 400 });
      }

      const invRes = await client.query("SELECT * FROM erp_tax_invoices WHERE id = $1 FOR UPDATE", [Number(invoiceId)]);
      if (invRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "세금계산서를 찾을 수 없습니다." }, { status: 404 });
      }
      const inv = invRes.rows[0];
      const ioType = inv.io_type || "SALE";
      const totalAmount = Number(inv.total_amount || 0);

      const prevTxIds: number[] = Array.isArray(inv.matched_bank_tx_ids)
        ? inv.matched_bank_tx_ids.map((n: any) => Number(n)).filter((n: number) => n > 0)
        : [];
      const mergedTxIds = Array.from(new Set([...prevTxIds, ...bankTxIds.map((id: any) => Number(id))]));

      const txRes = await client.query(
        "SELECT * FROM erp_bank_transactions WHERE id = ANY($1::bigint[])",
        [mergedTxIds]
      );

      let sumTxAmount = 0;
      for (const tx of txRes.rows) {
        const amt = ioType === "PURCHASE"
          ? Number(tx.withdrawal_amount || tx.amount || 0)
          : Number(tx.deposit_amount || tx.amount || 0);
        sumTxAmount += amt;
      }

      const isPaid = sumTxAmount >= totalAmount - 1000;
      const finalSettled = isPaid ? totalAmount : sumTxAmount;
      const nextStatus = isPaid ? "PAID" : finalSettled > 0 ? "PARTIAL" : "UNPAID";

      await client.query(
        `UPDATE erp_tax_invoices
         SET settled_amount = $1,
             settlement_status = $2,
             matched_bank_tx_ids = $3::jsonb,
             settled_at = NOW()
         WHERE id = $4`,
        [finalSettled, nextStatus, JSON.stringify(mergedTxIds), inv.id]
      );

      await client.query(
        `UPDATE erp_bank_transactions
         SET is_matched = true,
             matched_type = $1,
             matched_id = $2,
             matched_at = NOW()
         WHERE id = ANY($3::bigint[])`,
        [ioType === "PURCHASE" ? "PURCHASE_INVOICE" : "SALE_INVOICE", inv.invoice_no, mergedTxIds]
      );

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        settledAmount: finalSettled,
        settlementStatus: nextStatus,
        matchedBankTxIds: mergedTxIds,
        message: `${ioType === "PURCHASE" ? "매입채무 지급" : "매출채권 수납"} 대사가 완료되었습니다.`,
      });
    }

    // =========================================================================
    // ACTION 3: UNMATCH (연결된 입출금 대사 해제 및 미수납/미지급 복원)
    // =========================================================================
    if (action === "UNMATCH") {
      const { invoiceId, bankTxId } = body;
      if (!invoiceId) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "invoiceId가 필요합니다." }, { status: 400 });
      }

      const invRes = await client.query("SELECT * FROM erp_tax_invoices WHERE id = $1 FOR UPDATE", [Number(invoiceId)]);
      if (invRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "세금계산서를 찾을 수 없습니다." }, { status: 404 });
      }
      const inv = invRes.rows[0];
      const ioType = inv.io_type || "SALE";
      const totalAmount = Number(inv.total_amount || 0);
      const prevTxIds: number[] = Array.isArray(inv.matched_bank_tx_ids)
        ? inv.matched_bank_tx_ids.map((n: any) => Number(n)).filter((n: number) => n > 0)
        : [];

      const removeIds = bankTxId ? [Number(bankTxId)] : prevTxIds;
      const remainingTxIds = bankTxId
        ? prevTxIds.filter((id) => id !== Number(bankTxId))
        : [];

      if (removeIds.length > 0) {
        await client.query(
          `UPDATE erp_bank_transactions
           SET is_matched = false,
               matched_type = NULL,
               matched_id = NULL,
               matched_at = NULL
           WHERE id = ANY($1::bigint[])`,
          [removeIds]
        );
      }

      let nextSettled = 0;
      if (remainingTxIds.length > 0) {
        const remRes = await client.query(
          "SELECT * FROM erp_bank_transactions WHERE id = ANY($1::bigint[])",
          [remainingTxIds]
        );
        for (const tx of remRes.rows) {
          nextSettled += ioType === "PURCHASE"
            ? Number(tx.withdrawal_amount || tx.amount || 0)
            : Number(tx.deposit_amount || tx.amount || 0);
        }
      }

      const isPaid = remainingTxIds.length > 0 && nextSettled >= totalAmount - 1000;
      const finalSettled = isPaid ? totalAmount : nextSettled;
      const nextStatus = isPaid ? "PAID" : finalSettled > 0 ? "PARTIAL" : "UNPAID";

      await client.query(
        `UPDATE erp_tax_invoices
         SET settled_amount = $1,
             settlement_status = $2,
             matched_bank_tx_ids = $3::jsonb,
             settled_at = CASE WHEN $2 = 'UNPAID' THEN NULL ELSE NOW() END
         WHERE id = $4`,
        [finalSettled, nextStatus, JSON.stringify(remainingTxIds), inv.id]
      );

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        settledAmount: finalSettled,
        settlementStatus: nextStatus,
        matchedBankTxIds: remainingTxIds,
        message: "입출금 대사 연결이 해제되었습니다.",
      });
    }

    // =========================================================================
    // ACTION 4: MANUAL_SETTLE (통장 외 현금/상계/카드 등 직접 수납·지급 금액 조정)
    // =========================================================================
    if (action === "MANUAL_SETTLE") {
      const { invoiceId, settledAmount } = body;
      if (!invoiceId || settledAmount === undefined) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "invoiceId 및 settledAmount가 필요합니다." }, { status: 400 });
      }
      const invRes = await client.query("SELECT * FROM erp_tax_invoices WHERE id = $1 FOR UPDATE", [Number(invoiceId)]);
      if (invRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "세금계산서를 찾을 수 없습니다." }, { status: 404 });
      }
      const inv = invRes.rows[0];
      const totalAmount = Number(inv.total_amount || 0);
      const nextSettled = Math.max(0, Math.min(totalAmount, Math.round(Number(settledAmount) || 0)));
      const nextStatus = nextSettled >= totalAmount ? "PAID" : nextSettled > 0 ? "PARTIAL" : "UNPAID";

      await client.query(
        `UPDATE erp_tax_invoices
         SET settled_amount = $1,
             settlement_status = $2,
             settled_at = CASE WHEN $2 = 'UNPAID' THEN NULL ELSE NOW() END
         WHERE id = $3`,
        [nextSettled, nextStatus, inv.id]
      );

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        settledAmount: nextSettled,
        settlementStatus: nextStatus,
        message: "수납/지급 정산 금액이 반영되었습니다.",
      });
    }

    await client.query("ROLLBACK");
    return NextResponse.json({ error: "지원하지 않는 action입니다." }, { status: 400 });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("POST Reconcile Error:", error);
    return NextResponse.json({ error: "세금계산서 입출금 대사 처리 실패: " + error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
