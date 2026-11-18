import "server-only";
import type { Pool, PoolClient } from "pg";
import { runSchemaInitOnce } from "./erpSchemaCache";

/**
 * erp_bank_transactions 마감 상태(is_closed, closed_at) 컬럼 및 인덱스를 멱등 생성하고
 * 이미 전건 매칭 완료된 계좌를 초기 기마감 상태로 동기화한다.
 */
export async function ensureBankClosingColumns(pool: Pool): Promise<void> {
  return runSchemaInitOnce("erp_bank_closing_schema_v1", async () => {
    await pool.query(`
      ALTER TABLE erp_bank_transactions
        ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_erp_bank_tx_closed_date
        ON erp_bank_transactions (is_closed, trans_date DESC, trans_time DESC, id DESC);
    `);
    await syncBankAccountClosingState(pool);
  });
}

/**
 * 계좌별 매칭 완료 여부에 따라 은행 입출금 마감(is_closed) 상태를 동기화한다.
 * 1) 매칭 취소된 거래(is_matched = false)가 기마감 상태였으면 즉시 마감 해제
 * 2) 계좌 내 미매칭 건이 0건(전건 매칭 완료)이 된 계좌는 모든 거래를 기마감 확정
 */
export async function syncBankAccountClosingState(
  executor: Pool | PoolClient
): Promise<{ newlyClosedAccounts: string[] }> {
  await executor.query(`
    UPDATE erp_bank_transactions
    SET is_closed = false,
        closed_at = NULL
    WHERE COALESCE(is_matched, false) = false
      AND COALESCE(is_closed, false) = true;
  `);

  const closedRes = await executor.query(`
    WITH fully_matched_accounts AS (
      SELECT account_no
      FROM erp_bank_transactions
      GROUP BY account_no
      HAVING COUNT(*) > 0
         AND COUNT(*) FILTER (WHERE COALESCE(is_matched, false) = false) = 0
    )
    UPDATE erp_bank_transactions b
    SET is_closed = true,
        closed_at = COALESCE(b.closed_at, NOW())
    FROM fully_matched_accounts f
    WHERE b.account_no = f.account_no
      AND COALESCE(b.is_closed, false) = false
    RETURNING b.account_no;
  `);

  const newlyClosedAccounts: string[] = Array.from(
    new Set(
      (closedRes.rows || [])
        .map((r: any) => String(r.account_no || "").trim())
        .filter(Boolean)
    )
  );

  return { newlyClosedAccounts };
}
