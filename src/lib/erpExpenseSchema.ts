import { runSchemaInitOnce } from "./erpSchemaCache";

/**
 * 개인경비 영수증 테이블(erp_expense_receipts) 및 급여대장 개인경비 컬럼을
 * 프로세스 수명 동안 1회만 멱등 초기화한다.
 */
export async function ensureExpenseSchema(pool: {
  query: (sql: string, params?: any[]) => Promise<any>;
}): Promise<void> {
  await runSchemaInitOnce("erp_expenses_schema_v1", async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_expense_receipts (
        id SERIAL PRIMARY KEY,
        employee_id BIGINT NOT NULL REFERENCES erp_employees(id) ON DELETE CASCADE,
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        year_month VARCHAR(7) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT '식대·회식비',
        merchant_name VARCHAR(200) NOT NULL DEFAULT '',
        amount NUMERIC NOT NULL DEFAULT 0,
        payment_method VARCHAR(50) NOT NULL DEFAULT '개인카드',
        reason TEXT NOT NULL DEFAULT '',
        receipt_file_url TEXT,
        receipt_file_name TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
        approver_id BIGINT,
        approved_at TIMESTAMPTZ,
        memo TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE erp_payroll_records
      ADD COLUMN IF NOT EXISTS personal_expense_amount NUMERIC NOT NULL DEFAULT 0;
    `);
  });
}
