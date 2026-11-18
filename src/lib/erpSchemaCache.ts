import type { Pool, PoolClient } from "pg";

const globalForErpSchemaCache = globalThis as unknown as {
  __erpSchemaInitPromises?: Map<string, Promise<void>>;
};

function getInitMap(): Map<string, Promise<void>> {
  if (!globalForErpSchemaCache.__erpSchemaInitPromises) {
    globalForErpSchemaCache.__erpSchemaInitPromises = new Map<string, Promise<void>>();
  }
  return globalForErpSchemaCache.__erpSchemaInitPromises;
}

/**
 * 프로세스 수명 동안 스키마 DDL/인덱스 초기화가 key별로 정확히 1회만 실행되도록 캐싱한다.
 * 실패 시 캐시에서 제거하여 다음 요청에서 재시도 가능하도록 보장한다.
 */
export async function runSchemaInitOnce(key: string, fn: () => Promise<void>): Promise<void> {
  const map = getInitMap();
  const existing = map.get(key);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      await fn();
    } catch (err) {
      map.delete(key);
      throw err;
    }
  })();

  map.set(key, promise);
  return promise;
}

const CORE_INDEX_STATEMENTS: ReadonlyArray<string> = [
  `CREATE INDEX IF NOT EXISTS idx_erp_bank_tx_date_entity ON erp_bank_transactions (trans_date, entity_type)`,
  `CREATE INDEX IF NOT EXISTS idx_erp_bank_tx_acct_latest ON erp_bank_transactions (account_no, trans_date DESC, trans_time DESC, id DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_erp_tax_inv_issue_entity ON erp_tax_invoices (issue_date, supplier_entity_type, io_type)`,
  `CREATE INDEX IF NOT EXISTS idx_erp_payroll_ym_emp ON erp_payroll_records (year_month, employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_erp_expense_ym_status ON erp_expense_receipts (year_month, status, employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_erp_overtimes_emp_status ON erp_overtimes (employee_id, status, ot_date)`,
  `CREATE INDEX IF NOT EXISTS idx_erp_leaves_emp_status ON erp_leave_requests (employee_id, status, start_date)`,
  `CREATE INDEX IF NOT EXISTS idx_erp_partners_type_status ON erp_partners (partner_type, status)`,
  `CREATE INDEX IF NOT EXISTS idx_erp_partners_biz_no ON erp_partners (business_no)`,
];

/**
 * erp_* 핵심 조회/조인 테이블에 성능 인덱스를 멱등하게 1회 생성한다.
 * 타 시스템 테이블은 절대 변경하지 않는다.
 */
export async function ensureErpCoreIndexes(executor: Pool | PoolClient): Promise<void> {
  return runSchemaInitOnce("erp_core_indexes_v1", async () => {
    for (const stmt of CORE_INDEX_STATEMENTS) {
      await executor.query(stmt).catch(() => {});
    }
  });
}
