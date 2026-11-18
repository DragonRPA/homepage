export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { recommendAccountSubjectForTx } from "@/lib/erpAccountSubjects";
import {
  ensureBankClosingColumns,
  syncBankAccountClosingState,
} from "@/lib/erpBankClosing";
import {
  buildAutoMatchResultItem,
  computeMatchScore,
  extractPositiveIds,
  reconcilePartitionInvoicesAndTxs,
  syncLinkedBillingsPaymentStatus,
  syncLinkedBillingsPaymentStatusBatch,
  type AutoMatchResultItem,
  type LinkedBillingSyncTarget,
} from "@/lib/erpTaxReconcileEngine";

const BANK_TX_SELECT_COLUMNS = `
  id, bank_name as "bankName", account_no as "accountNo",
  COALESCE(entity_type, CASE WHEN account_no LIKE '%140%' THEN 'INDIVIDUAL' ELSE 'CORP' END) as "entityType",
  TO_CHAR(trans_date, 'YYYY-MM-DD') as "transDate", trans_time as "transTime",
  trans_type as "transType", amount, deposit_amount as "depositAmount",
  withdrawal_amount as "withdrawalAmount", balance_after as "balanceAfter",
  sender_receiver as "senderReceiver", counterparty_holder as "counterpartyHolder",
  memo, is_matched as "isMatched", matched_type as "matchedType", matched_id as "matchedId"
`;

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
    const matchedIds = extractPositiveIds(inv.matched_bank_tx_ids);

    // 1. Fetch already linked bank transactions
    let linkedTxs: any[] = [];
    if (matchedIds.length > 0) {
      const linkedRes = await pool.query(
        `SELECT ${BANK_TX_SELECT_COLUMNS}
         FROM erp_bank_transactions
         WHERE id = ANY($1::bigint[])
         ORDER BY trans_date DESC, id DESC`,
        [matchedIds]
      );
      linkedTxs = linkedRes.rows;
    }

    // 2. Fetch candidate unmatched (or same-direction & same-entity) bank transactions
    const txCondition =
      ioType === "PURCHASE"
        ? `(COALESCE(withdrawal_amount, 0) > 0 OR trans_type = 'WITHDRAWAL')`
        : `(COALESCE(deposit_amount, 0) > 0 OR trans_type = 'DEPOSIT')`;

    const candRes = await pool.query(
      `SELECT ${BANK_TX_SELECT_COLUMNS}
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
        const recommendedAccount = recommendAccountSubjectForTx(tx);
        return {
          ...tx,
          matchScore: score,
          matchReasons: reasons,
          nameMatched,
          amountExact,
          recommendedAccount,
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
      candidateTransactions: scoredCandidates.slice(0, 150),
    });
  } catch (error: any) {
    console.error("GET Reconcile Candidates Error:", error);
    return NextResponse.json({ error: "입출금 대사 후보 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: Reconcile tax invoices with bank transactions (AUTO_MATCH, MATCH, UNMATCH, MANUAL_SETTLE)
export async function POST(request: Request) {
  const pool = getErpPool();
  await ensureBankClosingColumns(pool);
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
                 item_name, memo, domain_type, ref_id
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

      const matchedResults: AutoMatchResultItem[] = [];
      const matchedBillingTargets: LinkedBillingSyncTarget[] = [];
      const resetBillingTargets: LinkedBillingSyncTarget[] = [];

      for (const ent of entities) {
        for (const io of ioTypes) {
          const subInvs = allInvs.filter((i: any) => i.entity_type === ent && i.io_type === io);
          const subTxs = allTxs.filter(
            (t: any) =>
              t.entity_type === ent &&
              (io === "SALE" ? Number(t.deposit_amount) > 0 : Number(t.withdrawal_amount) > 0)
          );

          const { matchedInvMap, txToInvsMap, subTxMap } = reconcilePartitionInvoicesAndTxs(
            subInvs,
            subTxs,
            io
          );

          // Collect batch updates for tax invoices in this (entity, io) partition
          const matchedInvIds: number[] = [];
          const matchedAmts: number[] = [];
          const matchedTxIdsJson: string[] = [];
          const resetInvIds: number[] = [];

          for (const inv of subInvs) {
            const invId = Number(inv.id);
            const matchInfo = matchedInvMap.get(invId);
            const totalAmount = Number(inv.total_amount || 0);
            const refId = inv.ref_id ? Number(inv.ref_id) : null;

            if (matchInfo) {
              matchedInvIds.push(invId);
              matchedAmts.push(totalAmount);
              matchedTxIdsJson.push(JSON.stringify(matchInfo.txIds));
              matchedBillingTargets.push({ invoiceId: invId, domainType: inv.domain_type, refId });

              if (matchInfo.newlyMatched) {
                matchedResults.push(buildAutoMatchResultItem(inv, matchInfo, ent, io, subTxMap));
              }
            } else {
              // If an invoice had invalid cross-entity matches previously, reset it cleanly to UNPAID
              const prevTxIds = extractPositiveIds(inv.matched_bank_tx_ids);
              if (prevTxIds.length > 0) {
                resetInvIds.push(invId);
                resetBillingTargets.push({ invoiceId: invId, domainType: inv.domain_type, refId });
              }
            }
          }

          if (matchedInvIds.length > 0) {
            await client.query(
              `UPDATE erp_tax_invoices AS t
               SET settled_amount = u.amt,
                   settlement_status = 'PAID',
                   matched_bank_tx_ids = u.tx_ids::jsonb,
                   settled_at = COALESCE(t.settled_at, NOW())
               FROM UNNEST($1::bigint[], $2::numeric[], $3::text[]) AS u(id, amt, tx_ids)
               WHERE t.id = u.id`,
              [matchedInvIds, matchedAmts, matchedTxIdsJson]
            );
          }

          if (resetInvIds.length > 0) {
            await client.query(
              `UPDATE erp_tax_invoices
               SET settled_amount = 0,
                   settlement_status = 'UNPAID',
                   matched_bank_tx_ids = '[]'::jsonb,
                   settled_at = NULL
               WHERE id = ANY($1::bigint[])`,
              [resetInvIds]
            );
          }

          // Batch sync bank transactions in this partition
          const expectedMatchedType = io === "PURCHASE" ? "PURCHASE_INVOICE" : "SALE_INVOICE";
          const matchedBankIds: number[] = [];
          const matchedBankInvNos: string[] = [];
          const resetBankIds: number[] = [];

          for (const tx of subTxs) {
            const tid = Number(tx.id);
            const linkedInvNos = txToInvsMap.get(tid);
            if (linkedInvNos && linkedInvNos.length > 0) {
              matchedBankIds.push(tid);
              matchedBankInvNos.push(linkedInvNos.join(","));
            } else if (tx.is_matched && tx.matched_type === expectedMatchedType) {
              resetBankIds.push(tid);
            }
          }

          if (matchedBankIds.length > 0) {
            await client.query(
              `UPDATE erp_bank_transactions AS b
               SET is_matched = true,
                   matched_type = $3,
                   matched_id = u.inv_nos,
                   matched_at = COALESCE(b.matched_at, NOW())
               FROM UNNEST($1::bigint[], $2::text[]) AS u(id, inv_nos)
               WHERE b.id = u.id`,
              [matchedBankIds, matchedBankInvNos, expectedMatchedType]
            );
          }

          if (resetBankIds.length > 0) {
            await client.query(
              `UPDATE erp_bank_transactions
               SET is_matched = false,
                   matched_type = NULL,
                   matched_id = NULL,
                   matched_at = NULL
               WHERE id = ANY($1::bigint[])`,
              [resetBankIds]
            );
          }
        }
      }

      await syncLinkedBillingsPaymentStatusBatch(client, "UNPAID", resetBillingTargets);
      await syncLinkedBillingsPaymentStatusBatch(client, "PAID", matchedBillingTargets);

      await syncBankAccountClosingState(client);
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
    // ACTION 2: MATCH (선택한 세금계산서 1건과 통장 입출금 1~N건 연결 대사 — 금액 불일치 시 전액 완납 종결 지원)
    // =========================================================================
    if (action === "MATCH") {
      const { invoiceId, bankTxIds, forceComplete, settleReason } = body;
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

      const prevTxIds = extractPositiveIds(inv.matched_bank_tx_ids);
      const mergedTxIds = Array.from(new Set([...prevTxIds, ...bankTxIds.map((id: any) => Number(id))]));

      const txRes = await client.query(
        "SELECT * FROM erp_bank_transactions WHERE id = ANY($1::bigint[])",
        [mergedTxIds]
      );

      let sumTxAmount = 0;
      for (const tx of txRes.rows) {
        const amt =
          ioType === "PURCHASE"
            ? Number(tx.withdrawal_amount || tx.amount || 0)
            : Number(tx.deposit_amount || tx.amount || 0);
        sumTxAmount += amt;
      }

      const isPaid = Boolean(forceComplete) || sumTxAmount >= totalAmount - 1000;
      const finalSettled = isPaid ? totalAmount : Math.min(totalAmount, sumTxAmount);
      const nextStatus = isPaid ? "PAID" : finalSettled > 0 ? "PARTIAL" : "UNPAID";
      const diffAmt = totalAmount - sumTxAmount;

      let updatedMemo = inv.memo || "";
      if (forceComplete && Math.abs(diffAmt) > 0) {
        const reasonTag = settleReason ? `[${settleReason}]` : "[차액상계 완납종결]";
        const diffNote = `${reasonTag} 통장합계 ₩${sumTxAmount.toLocaleString()} / 차액 ₩${diffAmt.toLocaleString()}`;
        if (!updatedMemo.includes(diffNote)) {
          updatedMemo = updatedMemo ? `${updatedMemo} | ${diffNote}` : diffNote;
        }
      }

      await client.query(
        `UPDATE erp_tax_invoices
         SET settled_amount = $1,
             settlement_status = $2,
             matched_bank_tx_ids = $3::jsonb,
             memo = $4,
             settled_at = NOW()
         WHERE id = $5`,
        [finalSettled, nextStatus, JSON.stringify(mergedTxIds), updatedMemo, inv.id]
      );

      await syncLinkedBillingsPaymentStatus(
        client,
        Number(inv.id),
        nextStatus,
        finalSettled,
        inv.domain_type,
        inv.ref_id ? Number(inv.ref_id) : null
      );

      if (txRes.rows.length > 0) {
        const expectedType = ioType === "PURCHASE" ? "PURCHASE_INVOICE" : "SALE_INVOICE";
        const txIdsToUpdate: number[] = [];
        const nextMatchedIds: string[] = [];
        const nextMemos: (string | null)[] = [];

        for (const tx of txRes.rows) {
          const prevMatchedId = String(tx.matched_id || "");
          const prevType = String(tx.matched_type || "");
          let nextMatchedId = inv.invoice_no;
          if (prevType === expectedType && prevMatchedId && !prevMatchedId.includes(inv.invoice_no)) {
            nextMatchedId = `${prevMatchedId},${inv.invoice_no}`;
          }
          const txNote =
            forceComplete && settleReason
              ? tx.memo
                ? `${tx.memo} (${settleReason})`
                : `${inv.customer_name} ${settleReason}`
              : tx.memo;

          txIdsToUpdate.push(Number(tx.id));
          nextMatchedIds.push(nextMatchedId);
          nextMemos.push(txNote ?? null);
        }

        await client.query(
          `UPDATE erp_bank_transactions AS b
           SET is_matched = true,
               matched_type = $4,
               matched_id = u.matched_id,
               memo = COALESCE(u.memo, b.memo),
               matched_at = NOW()
           FROM UNNEST($1::bigint[], $2::text[], $3::text[]) AS u(id, matched_id, memo)
           WHERE b.id = u.id`,
          [txIdsToUpdate, nextMatchedIds, nextMemos, expectedType]
        );
      }

      await syncBankAccountClosingState(client);
      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        settledAmount: finalSettled,
        settlementStatus: nextStatus,
        matchedBankTxIds: mergedTxIds,
        message: isPaid
          ? `${ioType === "PURCHASE" ? "매입채무 지급" : "매출채권 수납"} 완납 종결 처리되었습니다.`
          : `부분 ${ioType === "PURCHASE" ? "지급" : "수납"} (₩${finalSettled.toLocaleString()}) 반영되었습니다.`,
      });
    }

    // =========================================================================
    // ACTION 2-B: CLASSIFY_BANK_TX (세금계산서 외 일반 입출금 내역 계정과목 지정 정리)
    // =========================================================================
    if (action === "CLASSIFY_BANK_TX") {
      const { bankTxIds, accountSubject, memo } = body;
      const targetIds = extractPositiveIds(bankTxIds);
      if (targetIds.length === 0 || !accountSubject || !String(accountSubject).trim()) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "정리할 통장 거래내역과 지정할 계정과목을 선택해 주십시오." },
          { status: 400 }
        );
      }

      const subjectLabel = String(accountSubject).trim();
      const memoText = memo && String(memo).trim() ? String(memo).trim() : null;

      await client.query(
        `UPDATE erp_bank_transactions
         SET is_matched = true,
             matched_type = 'ACCOUNT_SUBJECT',
             matched_id = $1,
             memo = COALESCE($2, memo),
             matched_at = NOW()
         WHERE id = ANY($3::bigint[])`,
        [subjectLabel, memoText, targetIds]
      );

      await syncBankAccountClosingState(client);
      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        classifiedCount: targetIds.length,
        accountSubject: subjectLabel,
        message: `선택한 통장 내역 ${targetIds.length}건을 [${subjectLabel}] 계정과목으로 정리 완료했습니다.`,
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
      const prevTxIds = extractPositiveIds(inv.matched_bank_tx_ids);

      const removeIds = bankTxId ? [Number(bankTxId)] : prevTxIds;
      const remainingTxIds = bankTxId ? prevTxIds.filter((id) => id !== Number(bankTxId)) : [];

      if (removeIds.length > 0) {
        for (const tid of removeIds) {
          // 다대일(K:1) 매칭에서 다른 세금계산서가 해당 통장 거래를 계속 참조하고 있으면 매칭 상태를 유지하고 목록만 갱신한다.
          const otherInvsRes = await client.query(
            `SELECT invoice_no, COALESCE(io_type, 'SALE') AS io_type
             FROM erp_tax_invoices
             WHERE id != $1 AND matched_bank_tx_ids @> $2::jsonb
             ORDER BY issue_date ASC, id ASC`,
            [inv.id, JSON.stringify([tid])]
          );
          if (otherInvsRes.rows.length > 0) {
            const nextMatchedType =
              otherInvsRes.rows[0].io_type === "PURCHASE" ? "PURCHASE_INVOICE" : "SALE_INVOICE";
            const nextMatchedId = otherInvsRes.rows.map((r: any) => r.invoice_no).join(",");
            await client.query(
              `UPDATE erp_bank_transactions
               SET is_matched = true,
                   matched_type = $1,
                   matched_id = $2
               WHERE id = $3`,
              [nextMatchedType, nextMatchedId, tid]
            );
          } else {
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

      let nextSettled = 0;
      if (remainingTxIds.length > 0) {
        const remRes = await client.query(
          "SELECT * FROM erp_bank_transactions WHERE id = ANY($1::bigint[])",
          [remainingTxIds]
        );
        for (const tx of remRes.rows) {
          nextSettled +=
            ioType === "PURCHASE"
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

      await syncLinkedBillingsPaymentStatus(
        client,
        Number(inv.id),
        nextStatus,
        finalSettled,
        inv.domain_type,
        inv.ref_id ? Number(inv.ref_id) : null
      );

      await syncBankAccountClosingState(client);
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

      await syncLinkedBillingsPaymentStatus(
        client,
        Number(inv.id),
        nextStatus,
        nextSettled,
        inv.domain_type,
        inv.ref_id ? Number(inv.ref_id) : null
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
