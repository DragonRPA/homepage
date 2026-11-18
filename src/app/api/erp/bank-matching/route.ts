export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";
import { requireMenuPermission } from "@/lib/erpRbacGuard";
import {
  ensureBankClosingColumns,
  syncBankAccountClosingState,
} from "@/lib/erpBankClosing";
import {
  parseBankFileBuffer,
  parseCsvOrTsvTextToRows,
  extractBankTransactionsFromRows,
  ParsedBankTransaction,
} from "@/lib/ibkBankParser";
import {
  applyBatchInvoiceSettlementUpdatesTx,
  autoReconcileUnpaidInvoicesWithBank,
  bulkUpsertBankTransactions,
  type InvoiceSettlementBatchItem,
} from "@/lib/erpBankReconcileService";

// GET: 은행 입출금 거래내역 및 1:1 대사 통계 조회
export async function GET(request: Request) {
  try {
    const guard = await requireMenuPermission(
      request,
      ["bank_matching", "BANK_MATCHING"],
      "view"
    );
    if (!guard.authorized) {
      return guard.response!;
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const transType = searchParams.get("transType"); // ALL, DEPOSIT, WITHDRAWAL
    const txChannel = searchParams.get("txChannel"); // ALL or 타행이체, 체크, 인터넷...
    const matchStatus = searchParams.get("matchStatus") || "UNCLOSED"; // UNCLOSED, ALL, MATCHED, UNMATCHED, PAYROLL, INVOICE
    const accountNo = searchParams.get("accountNo"); // ALL or specific account no
    const entityType = searchParams.get("entityType"); // ALL, CORP, INDIVIDUAL
    const search = searchParams.get("search");

    const pool = getErpPool();
    await ensureBankClosingColumns(pool);
    let query = `
      SELECT 
        id,
        entity_type AS "entityType",
        bank_name AS "bankName",
        account_no AS "accountNo",
        account_holder AS "accountHolder",
        account_product AS "accountProduct",
        trans_date::text AS "transDate",
        trans_time AS "transTime",
        trans_type AS "transType",
        amount::numeric AS amount,
        COALESCE(withdrawal_amount, CASE WHEN trans_type = 'WITHDRAWAL' THEN amount ELSE 0 END)::numeric AS "withdrawalAmount",
        COALESCE(deposit_amount, CASE WHEN trans_type = 'DEPOSIT' THEN amount ELSE 0 END)::numeric AS "depositAmount",
        balance_after::numeric AS "balanceAfter",
        sender_receiver AS "senderReceiver",
        counterparty_account AS "counterpartyAccount",
        counterparty_bank AS "counterpartyBank",
        memo,
        tx_channel AS "txChannel",
        COALESCE(check_amount, 0)::numeric AS "checkAmount",
        cms_code AS "cmsCode",
        counterparty_holder AS "counterpartyHolder",
        is_matched AS "isMatched",
        matched_type AS "matchedType",
        matched_id AS "matchedId",
        matched_at AS "matchedAt",
        COALESCE(is_closed, false) AS "isClosed",
        closed_at AS "closedAt",
        created_at AS "createdAt"
      FROM erp_bank_transactions
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      conditions.push(`trans_date >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`trans_date <= $${params.length}`);
    }

    if (transType && transType !== "ALL") {
      params.push(transType);
      conditions.push(`trans_type = $${params.length}`);
    }

    if (txChannel && txChannel !== "ALL") {
      params.push(txChannel);
      conditions.push(`tx_channel = $${params.length}`);
    }

    if (matchStatus === "UNCLOSED") {
      conditions.push(`COALESCE(is_closed, false) = false`);
    } else if (matchStatus === "MATCHED") {
      conditions.push(`is_matched = true`);
    } else if (matchStatus === "UNMATCHED") {
      conditions.push(`is_matched = false`);
    } else if (matchStatus === "PAYROLL") {
      conditions.push(`matched_type = 'PAYROLL'`);
    } else if (matchStatus === "INVOICE") {
      conditions.push(`matched_type IN ('SALE_INVOICE', 'PURCHASE_INVOICE', 'BILLING', 'PURCHASE')`);
    }

    if (accountNo && accountNo !== "ALL") {
      params.push(accountNo);
      conditions.push(`account_no = $${params.length}`);
    } else if (entityType && entityType !== "ALL") {
      params.push(entityType);
      conditions.push(`entity_type = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      conditions.push(
        `(sender_receiver ILIKE $${idx} OR memo ILIKE $${idx} OR counterparty_holder ILIKE $${idx} OR counterparty_account ILIKE $${idx} OR counterparty_bank ILIKE $${idx} OR tx_channel ILIKE $${idx} OR matched_id ILIKE $${idx})`
      );
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY trans_date DESC, trans_time DESC, id DESC`;

    const result = await pool.query(query, params);

    // Fetch latest balance for the selected account / overall
    const latestBalRes = await pool.query(
      accountNo && accountNo !== "ALL"
        ? `SELECT balance_after::numeric AS bal, trans_date::text AS dt, trans_time AS tm FROM erp_bank_transactions WHERE account_no = $1 ORDER BY trans_date DESC, trans_time DESC, id DESC LIMIT 1`
        : `SELECT balance_after::numeric AS bal, trans_date::text AS dt, trans_time AS tm FROM erp_bank_transactions ORDER BY trans_date DESC, trans_time DESC, id DESC LIMIT 1`,
      accountNo && accountNo !== "ALL" ? [accountNo] : []
    );

    const latestBalance = latestBalRes.rows[0] ? Number(latestBalRes.rows[0].bal) : 0;
    const latestTxDatetime = latestBalRes.rows[0]
      ? `${latestBalRes.rows[0].dt} ${latestBalRes.rows[0].tm}`
      : null;

    // 계좌별 마지막 업로드 거래데이터 일시 및 잔액 조회
    const accountStatsRes = await pool.query(`
      WITH latest_per_acc AS (
        SELECT DISTINCT ON (account_no)
          account_no,
          entity_type,
          bank_name,
          trans_date::text AS latest_trans_date,
          trans_time AS latest_trans_time,
          balance_after::numeric AS latest_balance
        FROM erp_bank_transactions
        ORDER BY account_no, trans_date DESC, trans_time DESC, id DESC
      ),
      agg_per_acc AS (
        SELECT
          account_no,
          COUNT(*)::int AS total_count,
          COUNT(*) FILTER (WHERE COALESCE(is_matched, false) = false)::int AS unmatched_count,
          COUNT(*) FILTER (WHERE COALESCE(is_closed, false) = true)::int AS closed_count,
          COUNT(*) FILTER (WHERE COALESCE(is_closed, false) = false)::int AS unclosed_count,
          MAX(closed_at) AS last_closed_at,
          MAX(created_at) AS last_uploaded_at
        FROM erp_bank_transactions
        GROUP BY account_no
      )
      SELECT
        l.account_no AS "accountNo",
        l.entity_type AS "entityType",
        l.bank_name AS "bankName",
        l.latest_trans_date AS "latestTransDate",
        l.latest_trans_time AS "latestTransTime",
        l.latest_balance AS "latestBalance",
        a.total_count AS "totalCount",
        a.unmatched_count AS "unmatchedCount",
        a.closed_count AS "closedCount",
        a.unclosed_count AS "unclosedCount",
        a.last_closed_at AS "lastClosedAt",
        a.last_uploaded_at AS "lastUploadedAt"
      FROM latest_per_acc l
      JOIN agg_per_acc a ON a.account_no = l.account_no
      ORDER BY l.account_no ASC
    `);

    const defaultAccounts = [
      {
        accountNo: "478-081383-04-018",
        entityType: "CORP",
        bankName: "기업은행",
        label: "법인 계좌",
      },
      {
        accountNo: "140-129404-04-018",
        entityType: "INDIVIDUAL",
        bankName: "기업은행",
        label: "개인 계좌",
      },
    ];

    const statsByAcc = new Map<string, any>();
    for (const r of accountStatsRes.rows) {
      const totalCnt = Number(r.totalCount || 0);
      const unmatchedCnt = Number(r.unmatchedCount || 0);
      const unclosedCnt = Number(r.unclosedCount || 0);
      statsByAcc.set(r.accountNo, {
        accountNo: r.accountNo,
        entityType: r.entityType || (String(r.accountNo).includes("140") ? "INDIVIDUAL" : "CORP"),
        bankName: r.bankName || "기업은행",
        latestTransDate: r.latestTransDate || null,
        latestTransTime: r.latestTransTime || null,
        latestTransDatetime: r.latestTransDate
          ? `${r.latestTransDate} ${r.latestTransTime || "00:00:00"}`
          : null,
        latestBalance: Number(r.latestBalance || 0),
        totalCount: totalCnt,
        unmatchedCount: unmatchedCnt,
        closedCount: Number(r.closedCount || 0),
        unclosedCount: unclosedCnt,
        isAllClosed: totalCnt > 0 && unmatchedCnt === 0 && unclosedCnt === 0,
        lastClosedAt: r.lastClosedAt || null,
        lastUploadedAt: r.lastUploadedAt || null,
      });
    }

    const accountStatus = defaultAccounts.map((def) => {
      const found = statsByAcc.get(def.accountNo);
      if (found) {
        statsByAcc.delete(def.accountNo);
        return { ...def, ...found };
      }
      return {
        ...def,
        latestTransDate: null,
        latestTransTime: null,
        latestTransDatetime: null,
        latestBalance: 0,
        totalCount: 0,
        unmatchedCount: 0,
        closedCount: 0,
        unclosedCount: 0,
        isAllClosed: false,
        lastClosedAt: null,
        lastUploadedAt: null,
      };
    });

    for (const extra of statsByAcc.values()) {
      accountStatus.push({
        label: extra.entityType === "INDIVIDUAL" ? "개인 계좌" : "법인 계좌",
        ...extra,
      });
    }

    const excludedClosedCount = accountStatus.reduce((acc, item) => {
      if (accountNo && accountNo !== "ALL") {
        if (item.accountNo !== accountNo) return acc;
      } else if (entityType && entityType !== "ALL") {
        if (item.entityType !== entityType) return acc;
      }
      return acc + Number(item.closedCount || 0);
    }, 0);

    // KPI 집계
    let totalDeposit = 0;
    let totalWithdrawal = 0;
    let matchedDeposit = 0;
    let unmatchedDeposit = 0;
    let depositCount = 0;
    let withdrawalCount = 0;

    for (const row of result.rows) {
      const dep = Number(row.depositAmount || 0);
      const wth = Number(row.withdrawalAmount || 0);
      if (dep > 0) {
        totalDeposit += dep;
        depositCount++;
        if (row.isMatched) matchedDeposit += dep;
        else unmatchedDeposit += dep;
      }
      if (wth > 0) {
        totalWithdrawal += wth;
        withdrawalCount++;
      }
    }

    return NextResponse.json({
      success: true,
      transactions: result.rows,
      accountStatus,
      summary: {
        totalCount: result.rows.length,
        depositCount,
        withdrawalCount,
        totalDeposit,
        totalWithdrawal,
        matchedDeposit,
        unmatchedDeposit,
        latestBalance,
        latestTxDatetime,
        excludedClosedCount,
      },
    });
  } catch (error: any) {
    console.error("GET Bank Transactions Error:", error);
    return NextResponse.json({ error: "은행 거래내역 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: 통장 거래내역 파일 업로드(.xlsx, .xls, .csv, .txt), 텍스트 붙여넣기, 또는 수기 단건 등록
export async function POST(request: Request) {
  try {
    const guard = await requireMenuPermission(
      request,
      ["bank_matching", "BANK_MATCHING"],
      "save"
    );
    if (!guard.authorized) {
      return guard.response!;
    }

    const contentType = request.headers.get("content-type") || "";

    // 1. Multipart file upload (.xlsx, .xls, .csv, .txt)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const overrideAccountNo = (formData.get("accountNo") as string) || "AUTO";
      const files = formData.getAll("files") as File[];
      const singleFile = formData.get("file") as File | null;
      const uploadFiles = files.length > 0 ? files : singleFile ? [singleFile] : [];

      if (uploadFiles.length === 0) {
        return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
      }

      const allTransactions: ParsedBankTransaction[] = [];
      let lastMeta: any = null;

      for (const file of uploadFiles) {
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const parsed = parseBankFileBuffer(buffer, file.name, overrideAccountNo);
        if (parsed.meta) lastMeta = parsed.meta;
        allTransactions.push(...parsed.transactions);
      }

      if (allTransactions.length === 0) {
        return NextResponse.json(
          { error: "파일에서 유효한 은행 입출금 거래내역 행을 찾을 수 없습니다. IBK기업은행 거래내역 양식인지 확인해 주세요." },
          { status: 400 }
        );
      }

      // Deduplicate within the uploaded files themselves first
      const uniqueMap = new Map<string, ParsedBankTransaction>();
      for (const tx of allTransactions) {
        uniqueMap.set(tx.txHash, tx);
      }
      const deduplicatedList = Array.from(uniqueMap.values());

      const { insertedCount, duplicateCount, newlyClosedAccounts } =
        await bulkUpsertBankTransactions(deduplicatedList);

      return NextResponse.json({
        success: true,
        totalParsed: deduplicatedList.length,
        insertedCount,
        duplicateCount,
        newlyClosedAccounts,
        meta: lastMeta,
      });
    }

    // 2. JSON body (rawText paste, array of items, or single manual item)
    const body = await request.json();

    // 2a. Raw text / CSV / Excel copy-paste import
    if (body && typeof body.rawText === "string") {
      const rows = parseCsvOrTsvTextToRows(body.rawText);
      const { meta, transactions } = extractBankTransactionsFromRows(rows, body.accountNo || "AUTO");

      if (transactions.length === 0) {
        return NextResponse.json(
          { error: "붙여넣은 텍스트에서 유효한 거래내역(YYYY-MM-DD HH:mm:ss)을 찾을 수 없습니다." },
          { status: 400 }
        );
      }

      const uniqueMap = new Map<string, ParsedBankTransaction>();
      for (const tx of transactions) {
        uniqueMap.set(tx.txHash, tx);
      }
      const deduplicatedList = Array.from(uniqueMap.values());
      const { insertedCount, duplicateCount, newlyClosedAccounts } =
        await bulkUpsertBankTransactions(deduplicatedList);

      return NextResponse.json({
        success: true,
        totalParsed: deduplicatedList.length,
        insertedCount,
        duplicateCount,
        newlyClosedAccounts,
        meta,
      });
    }

    // 2b. Array of transaction objects
    if (Array.isArray(body)) {
      const mapped: ParsedBankTransaction[] = [];
      for (const item of body) {
        if (!item.transDate) continue;
        const assignedEntity: "CORP" | "INDIVIDUAL" =
          item.entityType === "INDIVIDUAL" || (item.accountNo && item.accountNo.includes("140"))
            ? "INDIVIDUAL"
            : "CORP";
        const targetAccount =
          item.accountNo || (assignedEntity === "INDIVIDUAL" ? "140-129404-04-018" : "478-081383-04-018");
        const transTime = item.transTime || "12:00:00";
        const wth = Number(item.withdrawalAmount ?? (item.transType === "WITHDRAWAL" ? item.amount : 0)) || 0;
        const dep = Number(item.depositAmount ?? (item.transType === "DEPOSIT" ? item.amount : 0)) || 0;
        const bal = Number(item.balanceAfter || 0);
        const transType = dep > 0 ? "DEPOSIT" : wth > 0 ? "WITHDRAWAL" : "OPEN";
        const amount = dep > 0 ? dep : wth;
        const txHash = `${targetAccount}|${item.transDate}|${transTime}|${wth}|${dep}|${bal}`;

        mapped.push({
          entityType: assignedEntity,
          bankName: item.bankName || "기업은행",
          accountNo: targetAccount,
          accountHolder: item.accountHolder || "주식회사 드래곤알피에이",
          accountProduct: item.accountProduct || "기업자유예금(IBK평생주거래기업통장)",
          transDate: item.transDate,
          transTime,
          transType,
          amount,
          withdrawalAmount: wth,
          depositAmount: dep,
          balanceAfter: bal,
          senderReceiver: (item.senderReceiver || "기타").trim(),
          counterpartyAccount: item.counterpartyAccount || null,
          counterpartyBank: item.counterpartyBank || null,
          memo: item.memo ? item.memo.trim() : null,
          txChannel: item.txChannel || null,
          checkAmount: Number(item.checkAmount || 0),
          cmsCode: item.cmsCode || null,
          counterpartyHolder: item.counterpartyHolder || null,
          txHash,
        });
      }

      const { insertedCount, duplicateCount, newlyClosedAccounts } =
        await bulkUpsertBankTransactions(mapped);
      return NextResponse.json({
        success: true,
        totalParsed: mapped.length,
        insertedCount,
        duplicateCount,
        newlyClosedAccounts,
      });
    }

    // 2c. 단건 수기 등록
    const {
      entityType,
      bankName,
      accountNo,
      transDate,
      transTime,
      transType,
      amount,
      balanceAfter,
      senderReceiver,
      counterpartyAccount,
      counterpartyBank,
      counterpartyHolder,
      txChannel,
      memo,
    } = body;

    if (!transDate || !senderReceiver) {
      return NextResponse.json(
        { error: "거래일자 및 거래내용(입금자/거래처명)은 필수 항목입니다." },
        { status: 400 }
      );
    }

    const assignedEntity =
      entityType === "INDIVIDUAL" || (accountNo && accountNo.includes("140")) ? "INDIVIDUAL" : "CORP";
    const targetAccount =
      accountNo || (assignedEntity === "INDIVIDUAL" ? "140-129404-04-018" : "478-081383-04-018");
    const numAmt = parseFloat(amount || "0");
    const numBal = parseFloat(balanceAfter || "0");
    const finalTransTime = transTime || "12:00:00";
    const finalType = transType || "DEPOSIT";
    const depAmt = finalType === "DEPOSIT" ? numAmt : 0;
    const wthAmt = finalType === "WITHDRAWAL" ? numAmt : 0;
    const txHash = `${targetAccount}|${transDate}|${finalTransTime}|${wthAmt}|${depAmt}|${numBal}`;

    const pool = getErpPool();
    await ensureBankClosingColumns(pool);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(
        `INSERT INTO erp_bank_transactions (
          entity_type, bank_name, account_no, account_holder,
          trans_date, trans_time, trans_type, amount, withdrawal_amount, deposit_amount,
          balance_after, sender_receiver, counterparty_account, counterparty_bank,
          counterparty_holder, tx_channel, memo, tx_hash, is_matched
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, false)
        ON CONFLICT (tx_hash) DO UPDATE SET
          memo = COALESCE(NULLIF(EXCLUDED.memo, ''), erp_bank_transactions.memo)
        RETURNING *`,
        [
          assignedEntity,
          bankName || "기업은행",
          targetAccount,
          assignedEntity === "INDIVIDUAL" ? "드래곤알피에이" : "주식회사 드래곤알피에이",
          transDate,
          finalTransTime,
          finalType,
          numAmt,
          wthAmt,
          depAmt,
          numBal,
          senderReceiver.trim(),
          counterpartyAccount || null,
          counterpartyBank || null,
          counterpartyHolder || null,
          txChannel || "수기등록",
          memo ? memo.trim() : null,
          txHash,
        ]
      );
      const autoReconciledCount = await autoReconcileUnpaidInvoicesWithBank(client);
      const { newlyClosedAccounts } = await syncBankAccountClosingState(client);
      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        transaction: res.rows[0],
        autoReconciledCount,
        newlyClosedAccounts,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST Bank Transaction Error:", error);
    return NextResponse.json({ error: "은행 거래 등록 실패: " + error.message }, { status: 500 });
  }
}

// PATCH: 거래 대사(매칭), 계정과목 일괄 지정, 세금계산서 연동 매칭, 메모 수정 또는 대사 취소
export async function PATCH(request: Request) {
  const guard = await requireMenuPermission(
    request,
    ["bank_matching", "BANK_MATCHING"],
    "save"
  );
  if (!guard.authorized) {
    return guard.response!;
  }

  const pool = getErpPool();
  await ensureBankClosingColumns(pool);
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { id, ids, action, matchedType, matchedId, accountSubject, invoiceIds, forceComplete, settleReason, memo } = body;

    await client.query("BEGIN");

    // 1. BATCH_ASSIGN_ACCOUNT: 통장 미매칭 입출금 1~N건에 계정과목을 지정하여 미결 정리
    if (action === "BATCH_ASSIGN_ACCOUNT") {
      const targetIds: number[] = Array.isArray(ids)
        ? ids.map((n: any) => Number(n)).filter((n: number) => n > 0)
        : id
        ? [Number(id)]
        : [];
      const subjectLabel = String(accountSubject || matchedId || "").trim();
      if (targetIds.length === 0 || !subjectLabel) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "정리할 거래내역과 지정할 계정과목을 선택해 주십시오." },
          { status: 400 }
        );
      }

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

      const { newlyClosedAccounts } = await syncBankAccountClosingState(client);
      await client.query("COMMIT");
      const closedSuffix = newlyClosedAccounts.length > 0 ? " (전건 매칭 완료 · 대사 마감 확정)" : "";
      return NextResponse.json({
        success: true,
        count: targetIds.length,
        newlyClosed: newlyClosedAccounts.length > 0,
        newlyClosedAccounts,
        message: `선택한 통장 내역 ${targetIds.length}건을 [${subjectLabel}] 계정과목으로 정리 완료했습니다.${closedSuffix}`,
      });
    }

    // 2. MATCH_INVOICES: 통장 거래 1~N건과 미결 세금계산서 1~N건을 엮어 양방향 매칭 완결
    if (action === "MATCH_INVOICES") {
      const targetTxIds: number[] = Array.isArray(ids)
        ? ids.map((n: any) => Number(n)).filter((n: number) => n > 0)
        : id
        ? [Number(id)]
        : [];
      const targetInvIds: number[] = Array.isArray(invoiceIds)
        ? invoiceIds.map((n: any) => Number(n)).filter((n: number) => n > 0)
        : [];

      if (targetTxIds.length === 0 || targetInvIds.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "연결할 통장 거래내역과 세금계산서를 각각 1건 이상 선택해 주십시오." },
          { status: 400 }
        );
      }

      const txRes = await client.query(
        "SELECT * FROM erp_bank_transactions WHERE id = ANY($1::bigint[]) FOR UPDATE",
        [targetTxIds]
      );
      const invRes = await client.query(
        "SELECT * FROM erp_tax_invoices WHERE id = ANY($1::bigint[]) ORDER BY issue_date ASC, id ASC FOR UPDATE",
        [targetInvIds]
      );

      if (txRes.rows.length === 0 || invRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "대상 거래내역 또는 세금계산서를 찾을 수 없습니다." }, { status: 404 });
      }

      const firstInv = invRes.rows[0];
      const ioType = firstInv.io_type || "SALE";
      const expectedMatchedType = ioType === "PURCHASE" ? "PURCHASE_INVOICE" : "SALE_INVOICE";

      let totalSelectedTxAmt = 0;
      for (const tx of txRes.rows) {
        totalSelectedTxAmt +=
          ioType === "PURCHASE"
            ? Number(tx.withdrawal_amount || tx.amount || 0)
            : Number(tx.deposit_amount || tx.amount || 0);
      }

      let remainingPoolAmt = totalSelectedTxAmt;
      const invoiceNos: string[] = [];
      const batchItems: InvoiceSettlementBatchItem[] = [];

      for (let i = 0; i < invRes.rows.length; i++) {
        const inv = invRes.rows[i];
        invoiceNos.push(inv.invoice_no);
        const invTotal = Number(inv.total_amount || 0);
        const prevSettled = Number(inv.settled_amount || 0);
        const invUnpaid = Math.max(0, invTotal - prevSettled);

        const prevTxIds: number[] = Array.isArray(inv.matched_bank_tx_ids)
          ? inv.matched_bank_tx_ids.map((n: any) => Number(n)).filter((n: number) => n > 0)
          : [];
        const mergedTxIds = Array.from(new Set([...prevTxIds, ...targetTxIds]));

        let nextSettled = invTotal;
        let nextStatus = "PAID";

        if (!forceComplete) {
          const allocated = Math.min(invUnpaid, Math.max(0, remainingPoolAmt));
          remainingPoolAmt = Math.max(0, remainingPoolAmt - allocated);
          const candidateSettled = prevSettled + allocated;
          const isPaid = candidateSettled >= invTotal - 1000;
          nextSettled = isPaid ? invTotal : Math.min(invTotal, candidateSettled);
          nextStatus = isPaid ? "PAID" : nextSettled > 0 ? "PARTIAL" : "UNPAID";
        }

        let updatedMemo = inv.memo || "";
        if (forceComplete && settleReason) {
          const tag = `[${settleReason}]`;
          if (!updatedMemo.includes(tag)) {
            updatedMemo = updatedMemo ? `${updatedMemo} | ${tag}` : tag;
          }
        }

        batchItems.push({
          invoiceId: Number(inv.id),
          settledAmount: nextSettled,
          settlementStatus: nextStatus,
          matchedBankTxIds: mergedTxIds,
          preserveMemo: false,
          memo: updatedMemo,
          domainType: inv.domain_type || "",
          refId: -1,
        });
      }

      await applyBatchInvoiceSettlementUpdatesTx(client, batchItems);

      const joinedInvNos = invoiceNos.join(",");
      const memoNote =
        memo && String(memo).trim()
          ? String(memo).trim()
          : settleReason
          ? `${firstInv.customer_name} (${settleReason})`
          : null;

      await client.query(
        `UPDATE erp_bank_transactions
         SET is_matched = true,
             matched_type = $1,
             matched_id = $2,
             memo = COALESCE($3, memo),
             matched_at = NOW()
         WHERE id = ANY($4::bigint[])`,
        [expectedMatchedType, joinedInvNos, memoNote, targetTxIds]
      );

      const { newlyClosedAccounts } = await syncBankAccountClosingState(client);
      await client.query("COMMIT");
      const closedSuffix = newlyClosedAccounts.length > 0 ? " (전건 매칭 완료 · 대사 마감 확정)" : "";
      return NextResponse.json({
        success: true,
        newlyClosed: newlyClosedAccounts.length > 0,
        newlyClosedAccounts,
        message: `통장 내역 ${targetTxIds.length}건과 세금계산서 ${targetInvIds.length}건을 연결하여 대사 완결했습니다.${closedSuffix}`,
      });
    }

    if (!id) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "거래 ID가 누락되었습니다." }, { status: 400 });
    }

    // 3. UNMATCH: 대사 취소 시 만약 세금계산서(SALE_INVOICE / PURCHASE_INVOICE)와 연결된 건이었다면 해당 세금계산서도 재계산/복원
    if (action === "UNMATCH") {
      const txId = Number(id);
      const linkedInvsRes = await client.query(
        `SELECT * FROM erp_tax_invoices WHERE matched_bank_tx_ids @> $1::jsonb FOR UPDATE`,
        [JSON.stringify([txId])]
      );

      const allRemainingTxIds = new Set<number>();
      const invPrepList = linkedInvsRes.rows.map((inv: any) => {
        const prevTxIds: number[] = Array.isArray(inv.matched_bank_tx_ids)
          ? inv.matched_bank_tx_ids.map((n: any) => Number(n)).filter((n: number) => n > 0)
          : [];
        const remainingTxIds = prevTxIds.filter((tid) => tid !== txId);
        for (const remId of remainingTxIds) {
          allRemainingTxIds.add(remId);
        }
        return { inv, remainingTxIds };
      });

      const txMap = new Map<number, any>();
      if (allRemainingTxIds.size > 0) {
        const remRes = await client.query(
          "SELECT id, withdrawal_amount, deposit_amount, amount FROM erp_bank_transactions WHERE id = ANY($1::bigint[])",
          [Array.from(allRemainingTxIds)]
        );
        for (const rtx of remRes.rows) {
          txMap.set(Number(rtx.id), rtx);
        }
      }

      const batchItems: InvoiceSettlementBatchItem[] = [];
      for (const { inv, remainingTxIds } of invPrepList) {
        const ioType = inv.io_type || "SALE";
        const totalAmount = Number(inv.total_amount || 0);

        let nextSettled = 0;
        for (const remId of new Set(remainingTxIds)) {
          const rtx = txMap.get(remId);
          if (!rtx) continue;
          nextSettled +=
            ioType === "PURCHASE"
              ? Number(rtx.withdrawal_amount || rtx.amount || 0)
              : Number(rtx.deposit_amount || rtx.amount || 0);
        }

        const isPaid = remainingTxIds.length > 0 && nextSettled >= totalAmount - 1000;
        const finalSettled = isPaid ? totalAmount : nextSettled;
        const nextStatus = isPaid ? "PAID" : finalSettled > 0 ? "PARTIAL" : "UNPAID";

        batchItems.push({
          invoiceId: Number(inv.id),
          settledAmount: finalSettled,
          settlementStatus: nextStatus,
          matchedBankTxIds: remainingTxIds,
          preserveMemo: true,
          domainType: inv.domain_type || "",
          refId: -1,
        });
      }

      await applyBatchInvoiceSettlementUpdatesTx(client, batchItems);

      await client.query(
        `UPDATE erp_bank_transactions 
         SET is_matched = false, matched_type = null, matched_id = null, matched_at = null 
         WHERE id = $1`,
        [txId]
      );

      await syncBankAccountClosingState(client);
      await client.query("COMMIT");
      return NextResponse.json({ success: true, message: "대사가 취소되었습니다." });
    }

    if (action === "UPDATE_MEMO") {
      await client.query(`UPDATE erp_bank_transactions SET memo = $1 WHERE id = $2`, [
        memo ? memo.trim() : null,
        id,
      ]);
      await client.query("COMMIT");
      return NextResponse.json({ success: true, message: "메모가 저장되었습니다." });
    }

    // 4. 일반 단건 MATCH action
    const now = new Date().toISOString();
    await client.query(
      `UPDATE erp_bank_transactions 
       SET is_matched = true, matched_type = $1, matched_id = $2, matched_at = $3, memo = COALESCE($4, memo)
       WHERE id = $5`,
      [matchedType || "ACCOUNT_SUBJECT", matchedId ? String(matchedId) : null, now, memo, id]
    );

    const { newlyClosedAccounts } = await syncBankAccountClosingState(client);
    await client.query("COMMIT");
    const closedSuffix = newlyClosedAccounts.length > 0 ? " (전건 매칭 완료 · 대사 마감 확정)" : "";
    return NextResponse.json({
      success: true,
      newlyClosed: newlyClosedAccounts.length > 0,
      newlyClosedAccounts,
      message: `대사 매칭이 완료되었습니다.${closedSuffix}`,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("PATCH Bank Matching Error:", error);
    return NextResponse.json({ error: "대사 처리 실패: " + error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE: 거래내역 삭제
export async function DELETE(request: Request) {
  try {
    const guard = await requireMenuPermission(
      request,
      ["bank_matching", "BANK_MATCHING"],
      "save"
    );
    if (!guard.authorized) {
      return guard.response!;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 거래 ID가 누락되었습니다." }, { status: 400 });
    }

    const { error } = await supabaseErp.from("erp_bank_transactions").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      const pool = getErpPool();
      await ensureBankClosingColumns(pool);
      await syncBankAccountClosingState(pool);
    } catch {}

    return NextResponse.json({ success: true, message: "거래내역이 삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Bank Transaction Error:", error);
    return NextResponse.json({ error: "거래내역 삭제 실패" }, { status: 500 });
  }
}
