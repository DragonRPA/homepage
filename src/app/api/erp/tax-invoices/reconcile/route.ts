import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// Normalize counterparty/company names by stripping legal entity prefixes/suffixes and spaces
function normalizeCompanyName(raw?: string): string {
  if (!raw) return "";
  return String(raw)
    .replace(/\(주\)|주식회사|（주）|\(유\)|유한회사|㈜/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^가-힣a-zA-Z0-9]/g, "")
    .toLowerCase()
    .trim();
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
  const invName = normalizeCompanyName(inv.customer_name ?? inv.customerName);
  const invCeo = normalizeCompanyName(inv.ceo_name ?? inv.ceoName);
  const txSender = normalizeCompanyName(tx.sender_receiver ?? tx.senderReceiver);
  const txHolder = normalizeCompanyName(tx.counterparty_holder ?? tx.counterpartyHolder);
  const txMemo = normalizeCompanyName(tx.memo);

  let nameMatched = false;
  if (invName && invName.length >= 2) {
    if (
      (txSender && (txSender.includes(invName) || invName.includes(txSender))) ||
      (txHolder && (txHolder.includes(invName) || invName.includes(txHolder)))
    ) {
      score += 55;
      nameMatched = true;
      reasons.push("거래처명 일치");
    } else if (txMemo && txMemo.includes(invName)) {
      score += 35;
      nameMatched = true;
      reasons.push("적요 거래처명 포함");
    }
  }
  if (!nameMatched && invCeo && invCeo.length >= 2) {
    if (
      (txSender && txSender.includes(invCeo)) ||
      (txHolder && txHolder.includes(invCeo))
    ) {
      score += 30;
      nameMatched = true;
      reasons.push("대표자명 일치");
    }
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
    const matchedIds: number[] = Array.isArray(inv.matched_bank_tx_ids)
      ? inv.matched_bank_tx_ids.map((x: any) => Number(x)).filter((n: number) => n > 0)
      : [];

    // 1. Fetch already linked bank transactions
    let linkedTxs: any[] = [];
    if (matchedIds.length > 0) {
      const linkedRes = await pool.query(
        `SELECT
          id, bank_name as "bankName", account_no as "accountNo",
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

    // 2. Fetch candidate unmatched (or same-direction) bank transactions
    const txCondition = ioType === "PURCHASE"
      ? `(COALESCE(withdrawal_amount, 0) > 0 OR trans_type = 'WITHDRAWAL')`
      : `(COALESCE(deposit_amount, 0) > 0 OR trans_type = 'DEPOSIT')`;

    const candRes = await pool.query(
      `SELECT
        id, bank_name as "bankName", account_no as "accountNo",
        TO_CHAR(trans_date, 'YYYY-MM-DD') as "transDate", trans_time as "transTime",
        trans_type as "transType", amount, deposit_amount as "depositAmount",
        withdrawal_amount as "withdrawalAmount", balance_after as "balanceAfter",
        sender_receiver as "senderReceiver", counterparty_holder as "counterpartyHolder",
        memo, is_matched as "isMatched", matched_type as "matchedType", matched_id as "matchedId"
       FROM erp_bank_transactions
       WHERE ${txCondition}
         AND (COALESCE(is_matched, false) = false OR id = ANY($1::bigint[]))
       ORDER BY trans_date DESC, id DESC
       LIMIT 300`,
      [matchedIds]
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
    // ACTION 1: AUTO_MATCH (미수납 매출채권 ↔ 입금 / 미지급 매입채무 ↔ 출금 자동 비교 대사)
    // =========================================================================
    if (action === "AUTO_MATCH") {
      const targetIoType = body.ioType || "ALL"; // 'SALE' | 'PURCHASE' | 'ALL'

      // 1. Fetch unpaid/partial tax invoices
      let invQuery = `
        SELECT * FROM erp_tax_invoices
        WHERE COALESCE(settlement_status, 'UNPAID') != 'PAID'
      `;
      const invParams: any[] = [];
      if (targetIoType !== "ALL") {
        invParams.push(targetIoType);
        invQuery += ` AND COALESCE(io_type, 'SALE') = $1`;
      }
      invQuery += ` ORDER BY issue_date ASC, id ASC`;
      const unpaidInvs = (await client.query(invQuery, invParams)).rows;

      // 2. Fetch all unmatched bank transactions
      const unmatchedTxs = (
        await client.query(
          `SELECT * FROM erp_bank_transactions
           WHERE COALESCE(is_matched, false) = false
           ORDER BY trans_date ASC, id ASC`
        )
      ).rows;

      const usedTxIds = new Set<number>();
      const matchedResults: Array<{
        invoiceId: number;
        invoiceNo: string;
        ioType: string;
        customerName: string;
        totalAmount: number;
        bankTxId: number;
        txDate: string;
        txAmount: number;
        settlementStatus: string;
      }> = [];

      for (const inv of unpaidInvs) {
        const ioType = inv.io_type || "SALE";
        const currentSettled = Number(inv.settled_amount || 0);
        const totalAmount = Number(inv.total_amount || 0);
        const unpaidAmount = Math.max(0, totalAmount - currentSettled);
        if (unpaidAmount <= 0) continue;

        // Filter bank transactions by direction (DEPOSIT for SALE, WITHDRAWAL for PURCHASE)
        let bestTx: any = null;
        let bestScore = 0;

        for (const tx of unmatchedTxs) {
          if (usedTxIds.has(Number(tx.id))) continue;
          const isDeposit = Number(tx.deposit_amount || 0) > 0 || tx.trans_type === "DEPOSIT";
          const isWithdrawal = Number(tx.withdrawal_amount || 0) > 0 || tx.trans_type === "WITHDRAWAL";
          if (ioType === "SALE" && !isDeposit) continue;
          if (ioType === "PURCHASE" && !isWithdrawal) continue;

          const { score, nameMatched, amountExact } = computeMatchScore(inv, tx);
          // Require strong confidence for auto-match: nameMatched AND (exact amount OR within 1000 KRW)
          if (nameMatched && amountExact && score > bestScore) {
            bestScore = score;
            bestTx = tx;
          }
        }

        if (bestTx) {
          usedTxIds.add(Number(bestTx.id));
          const txAmt = ioType === "PURCHASE"
            ? Number(bestTx.withdrawal_amount || bestTx.amount || 0)
            : Number(bestTx.deposit_amount || bestTx.amount || 0);

          const nextSettled = Math.min(totalAmount, currentSettled + txAmt);
          // If difference is <= 1000 KRW (e.g. rounding difference like 2,999,997 vs 3,000,000), treat as PAID
          const isPaid = nextSettled >= totalAmount - 1000;
          const finalSettled = isPaid ? totalAmount : nextSettled;
          const nextStatus = isPaid ? "PAID" : finalSettled > 0 ? "PARTIAL" : "UNPAID";

          const prevTxIds: number[] = Array.isArray(inv.matched_bank_tx_ids)
            ? inv.matched_bank_tx_ids.map((n: any) => Number(n))
            : [];
          const nextTxIds = Array.from(new Set([...prevTxIds, Number(bestTx.id)]));

          await client.query(
            `UPDATE erp_tax_invoices
             SET settled_amount = $1,
                 settlement_status = $2,
                 matched_bank_tx_ids = $3::jsonb,
                 settled_at = NOW()
             WHERE id = $4`,
            [finalSettled, nextStatus, JSON.stringify(nextTxIds), inv.id]
          );

          await client.query(
            `UPDATE erp_bank_transactions
             SET is_matched = true,
                 matched_type = $1,
                 matched_id = $2,
                 matched_at = NOW()
             WHERE id = $3`,
            [ioType === "PURCHASE" ? "PURCHASE_INVOICE" : "SALE_INVOICE", inv.invoice_no, bestTx.id]
          );

          matchedResults.push({
            invoiceId: Number(inv.id),
            invoiceNo: inv.invoice_no,
            ioType,
            customerName: inv.customer_name,
            totalAmount,
            bankTxId: Number(bestTx.id),
            txDate: String(bestTx.trans_date).slice(0, 10),
            txAmount: txAmt,
            settlementStatus: nextStatus,
          });
        }
      }

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        matchedCount: matchedResults.length,
        matches: matchedResults,
        message: matchedResults.length > 0
          ? `세금계산서와 통장 입출금 내역을 비교하여 총 ${matchedResults.length}건을 자동 대사 완료했습니다.`
          : "자동 매칭 조건(거래처명+금액 일치)에 부합하는 미매칭 입출금 내역이 없습니다. 개별 [입출금 대사]에서 수동 연결할 수 있습니다.",
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
