const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
let connStr = process.env.SUPABASE_DB_URL;
if (!connStr) {
  console.error("SUPABASE_DB_URL 환경변수가 필요합니다.");
  process.exit(1);
}
connStr = connStr.replace('?sslmode=require', '').replace('&sslmode=require', '');

const migrationSql = `
-- 1. 부서 마스터 (조직 인사관리)
CREATE TABLE IF NOT EXISTS erp_departments (
  id BIGSERIAL PRIMARY KEY,
  dept_code VARCHAR(50) UNIQUE NOT NULL,
  dept_name VARCHAR(100) NOT NULL,
  parent_id BIGINT REFERENCES erp_departments(id) ON DELETE SET NULL,
  manager_name VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 초기 기본 부서 등록
INSERT INTO erp_departments (dept_code, dept_name, manager_name, sort_order)
VALUES 
  ('EXEC', '경영총괄', '이정용 대표이사', 1),
  ('TECH', '기술개발부', '기술팀장', 2),
  ('SALES', '영업관리부', '영업팀장', 3),
  ('SUPPORT', '고객지원부', '지원팀장', 4)
ON CONFLICT (dept_code) DO NOTHING;

-- 2. 사원 테이블 컬럼 확장 (직책, 결재티어, 기본급, 주소 등)
ALTER TABLE erp_employees 
  ADD COLUMN IF NOT EXISTS duty VARCHAR(50) DEFAULT '팀원',
  ADD COLUMN IF NOT EXISTS tier_level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_salary NUMERIC(15,2) DEFAULT 3500000,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- 대표이사 티어 5로 갱신
UPDATE erp_employees SET tier_level = 5, duty = '대표이사' WHERE login_id = 'admin';

-- 3. 결재선 규칙 설정 (Approval Rules)
CREATE TABLE IF NOT EXISTS erp_approval_rules (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) UNIQUE NOT NULL, -- LEAVE_REQUEST, OT_REQUEST, CONTRACT_APPROVAL, TAX_INVOICE, PAYROLL
  event_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT '인사',
  required_tier INTEGER NOT NULL DEFAULT 2, -- 승인에 필요한 최소 티어
  auto_consensus BOOLEAN NOT NULL DEFAULT false, -- 합의 여부
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO erp_approval_rules (event_type, event_name, category, required_tier, description)
VALUES 
  ('LEAVE_REQUEST', '연차 및 특별휴가 신청', '인사', 2, '팀장 이상 결재'),
  ('OT_REQUEST', '연장근무(OT) 사전신청', '인사', 2, '팀장 이상 결재'),
  ('PAYROLL_EXEC', '월별 정기급여 정산 확정', '정산', 5, '대표이사 최종 승인'),
  ('CONTRACT_SIGN', '임대/용역 신규계약 체결', '계약', 3, '부서장 이상 승인'),
  ('TAX_INVOICE_ISSUE', '전자세금계산서 대량발행', '정산', 3, '경영관리자 승인')
ON CONFLICT (event_type) DO NOTHING;

-- 4. 결재 요청 대장 (Approval Requests)
CREATE TABLE IF NOT EXISTS erp_approval_requests (
  id BIGSERIAL PRIMARY KEY,
  request_no VARCHAR(50) UNIQUE NOT NULL,
  event_type VARCHAR(50) NOT NULL REFERENCES erp_approval_rules(event_type),
  title VARCHAR(200) NOT NULL,
  requester_id BIGINT NOT NULL REFERENCES erp_employees(id),
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 결재선 단계별 실행 상태 (Approval Steps)
CREATE TABLE IF NOT EXISTS erp_approval_steps (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES erp_approval_requests(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  approver_id BIGINT NOT NULL REFERENCES erp_employees(id),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  comment TEXT,
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. 연장근무(OT) 관리 대장
CREATE TABLE IF NOT EXISTS erp_overtimes (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES erp_employees(id) ON DELETE CASCADE,
  ot_date DATE NOT NULL,
  start_time VARCHAR(10) NOT NULL DEFAULT '18:00',
  end_time VARCHAR(10) NOT NULL DEFAULT '21:00',
  ot_hours NUMERIC(4,1) NOT NULL DEFAULT 3.0,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  approver_id BIGINT REFERENCES erp_employees(id),
  approved_at TIMESTAMPTZ,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. 은행 입출금 거래 대장 (Bank Matching)
CREATE TABLE IF NOT EXISTS erp_bank_transactions (
  id BIGSERIAL PRIMARY KEY,
  bank_name VARCHAR(50) NOT NULL DEFAULT '기업은행',
  account_no VARCHAR(50) NOT NULL DEFAULT '111-222-333333',
  trans_date DATE NOT NULL,
  trans_time VARCHAR(10) DEFAULT '12:00:00',
  trans_type VARCHAR(20) NOT NULL, -- DEPOSIT(입금), WITHDRAWAL(출금)
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_after NUMERIC(15,2) NOT NULL DEFAULT 0,
  sender_receiver VARCHAR(150) NOT NULL,
  memo TEXT,
  is_matched BOOLEAN NOT NULL DEFAULT false,
  matched_type VARCHAR(50), -- TRADE_SALE, RENTAL_BILLING, OP_SERVICE, DEV_SERVICE, EXPENSE
  matched_id BIGINT,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. 월별 급여 정산 대장 (Payroll)
CREATE TABLE IF NOT EXISTS erp_payroll_records (
  id BIGSERIAL PRIMARY KEY,
  year_month VARCHAR(7) NOT NULL, -- YYYY-MM
  employee_id BIGINT NOT NULL REFERENCES erp_employees(id) ON DELETE CASCADE,
  base_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
  ot_pay NUMERIC(15,2) NOT NULL DEFAULT 0,
  meal_allowance NUMERIC(15,2) NOT NULL DEFAULT 200000, -- 비과세 식대 20만원
  bonus NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_gross NUMERIC(15,2) NOT NULL DEFAULT 0,
  national_pension NUMERIC(15,2) NOT NULL DEFAULT 0, -- 국민연금 (4.5%)
  health_insurance NUMERIC(15,2) NOT NULL DEFAULT 0, -- 건강보험 (3.545%)
  employment_insurance NUMERIC(15,2) NOT NULL DEFAULT 0, -- 고용보험 (0.9%)
  income_tax NUMERIC(15,2) NOT NULL DEFAULT 0, -- 근로소득세
  local_tax NUMERIC(15,2) NOT NULL DEFAULT 0, -- 지방소득세 (10%)
  total_deduction NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, APPROVED, PAID
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(year_month, employee_id)
);
`;

async function run() {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL for ebro features migration...');
    await client.query(migrationSql);
    console.log('Successfully executed migration for Organization, Permissions, Approvals, OT, Bank, Payroll!');
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
