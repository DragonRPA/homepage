import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: 은행 입출금 거래내역 및 1:1 대사 통계 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const transType = searchParams.get("transType"); // ALL, DEPOSIT, WITHDRAWAL
    const matchStatus = searchParams.get("matchStatus"); // ALL, MATCHED, UNMATCHED
    const search = searchParams.get("search");

    const pool = getErpPool();
    let query = `
      SELECT 
        id,
        bank_name as "bankName",
        account_no as "accountNo",
        trans_date as "transDate",
        trans_time as "transTime",
        trans_type as "transType",
        amount::numeric as amount,
        balance_after::numeric as "balanceAfter",
        sender_receiver as "senderReceiver",
        memo,
        is_matched as "isMatched",
        matched_type as "matchedType",
        matched_id as "matchedId",
        matched_at as "matchedAt",
        created_at as "createdAt"
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

    if (matchStatus === "MATCHED") {
      conditions.push(`is_matched = true`);
    } else if (matchStatus === "UNMATCHED") {
      conditions.push(`is_matched = false`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(sender_receiver ILIKE $${params.length} OR memo ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY trans_date DESC, id DESC`;

    const result = await pool.query(query, params);

    // KPI 집계
    let totalDeposit = 0;
    let totalWithdrawal = 0;
    let matchedDeposit = 0;
    let unmatchedDeposit = 0;

    for (const row of result.rows) {
      const amt = Number(row.amount);
      if (row.transType === "DEPOSIT") {
        totalDeposit += amt;
        if (row.isMatched) matchedDeposit += amt;
        else unmatchedDeposit += amt;
      } else {
        totalWithdrawal += amt;
      }
    }

    return NextResponse.json({
      success: true,
      transactions: result.rows,
      summary: {
        totalCount: result.rows.length,
        totalDeposit,
        totalWithdrawal,
        matchedDeposit,
        unmatchedDeposit,
      },
    });
  } catch (error: any) {
    console.error("GET Bank Transactions Error:", error);
    return NextResponse.json({ error: "은행 거래내역 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: 신규 거래내역 등록 (단건 또는 엑셀 일괄 등록)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (Array.isArray(body)) {
      // 일괄 등록 (엑셀 업로드)
      const pool = getErpPool();
      let insertedCount = 0;
      for (const item of body) {
        if (!item.transDate || !item.amount || !item.senderReceiver) continue;
        await pool.query(
          `INSERT INTO erp_bank_transactions 
           (bank_name, account_no, trans_date, trans_time, trans_type, amount, balance_after, sender_receiver, memo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            item.bankName || "기업은행",
            item.accountNo || "111-222-333333",
            item.transDate,
            item.transTime || "12:00:00",
            item.transType || "DEPOSIT",
            parseFloat(item.amount),
            parseFloat(item.balanceAfter || "0"),
            item.senderReceiver.trim(),
            item.memo ? item.memo.trim() : null,
          ]
        );
        insertedCount++;
      }
      return NextResponse.json({ success: true, count: insertedCount });
    }

    // 단건 등록
    const { bankName, accountNo, transDate, transTime, transType, amount, balanceAfter, senderReceiver, memo } = body;
    if (!transDate || !amount || !senderReceiver) {
      return NextResponse.json({ error: "거래일자, 금액, 적요(거래처/입금자명)는 필수 항목입니다." }, { status: 400 });
    }

    const { data, error } = await supabaseErp
      .from("erp_bank_transactions")
      .insert({
        bank_name: bankName || "기업은행",
        account_no: accountNo || "111-222-333333",
        trans_date: transDate,
        trans_time: transTime || "12:00:00",
        trans_type: transType || "DEPOSIT",
        amount: parseFloat(amount),
        balance_after: parseFloat(balanceAfter || "0"),
        sender_receiver: senderReceiver.trim(),
        memo: memo ? memo.trim() : null,
        is_matched: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, transaction: data });
  } catch (error: any) {
    console.error("POST Bank Transaction Error:", error);
    return NextResponse.json({ error: "은행 거래 등록 실패: " + error.message }, { status: 500 });
  }
}

// PATCH: 거래 대사(매칭) 또는 대사 취소
export async function PATCH(request: Request) {
  try {
    const { id, action, matchedType, matchedId, memo } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "거래 ID가 누락되었습니다." }, { status: 400 });
    }

    const pool = getErpPool();

    if (action === "UNMATCH") {
      await pool.query(
        `UPDATE erp_bank_transactions 
         SET is_matched = false, matched_type = null, matched_id = null, matched_at = null 
         WHERE id = $1`,
        [id]
      );
      return NextResponse.json({ success: true, message: "대사가 취소되었습니다." });
    }

    // MATCH action
    const now = new Date().toISOString();
    await pool.query(
      `UPDATE erp_bank_transactions 
       SET is_matched = true, matched_type = $1, matched_id = $2, matched_at = $3, memo = COALESCE($4, memo)
       WHERE id = $5`,
      [matchedType || "BILLING", matchedId ? String(matchedId) : null, now, memo, id]
    );

    return NextResponse.json({ success: true, message: "대사 매칭이 완료되었습니다." });
  } catch (error: any) {
    console.error("PATCH Bank Matching Error:", error);
    return NextResponse.json({ error: "대사 처리 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: 거래내역 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 거래 ID가 누락되었습니다." }, { status: 400 });
    }

    const { error } = await supabaseErp.from("erp_bank_transactions").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "거래내역이 삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Bank Transaction Error:", error);
    return NextResponse.json({ error: "거래내역 삭제 실패" }, { status: 500 });
  }
}
