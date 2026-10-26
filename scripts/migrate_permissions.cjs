const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
let connStr = process.env.SUPABASE_DB_URL;
if (!connStr) {
  console.error("SUPABASE_DB_URL 환경변수가 필요합니다.");
  process.exit(1);
}
connStr = connStr.replace('?sslmode=require', '').replace('&sslmode=require', '');

const sql = `
-- 역할(Role) 마스터
CREATE TABLE IF NOT EXISTS erp_custom_roles (
  id BIGSERIAL PRIMARY KEY,
  role_code VARCHAR(50) UNIQUE NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 역할별 메뉴 권한
CREATE TABLE IF NOT EXISTS erp_role_permissions (
  id BIGSERIAL PRIMARY KEY,
  role_code VARCHAR(50) NOT NULL REFERENCES erp_custom_roles(role_code) ON DELETE CASCADE,
  menu_key VARCHAR(50) NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_save BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_code, menu_key)
);

-- 기본 역할 등록
INSERT INTO erp_custom_roles (role_code, role_name, description)
VALUES 
  ('ADMIN', '최고관리자', '시스템 전체 메뉴 및 권한 관리, 모든 결재의 최종 전결 권한'),
  ('MANAGER', '부서장/매니저', '소속 부서원 근태·OT 1차 승인 및 업무 결재 합의 권한'),
  ('ACCOUNTANT', '재무회계', '은행 입출금 대사, 급여 정산, 세금계산서 발행 및 채권 청구'),
  ('HR_STAFF', '인사총무', '조직도 및 사원 마스터 관리, 연차 쿼터 부여 및 OT 정산 집계'),
  ('EMPLOYEE', '일반사원', '내 결재함 조회, 연차 신청 및 본인 OT 사전/사후 신청')
ON CONFLICT (role_code) DO NOTHING;

-- 기본 권한 매핑
INSERT INTO erp_role_permissions (role_code, menu_key, can_view, can_save)
VALUES
  -- ADMIN: 전 메뉴 조회/저장
  ('ADMIN', 'org', true, true),
  ('ADMIN', 'users', true, true),
  ('ADMIN', 'approval_inbox', true, true),
  ('ADMIN', 'approval_rules', true, true),
  ('ADMIN', 'leave_apply', true, true),
  ('ADMIN', 'leave_manage', true, true),
  ('ADMIN', 'ot_manage', true, true),
  ('ADMIN', 'bank_matching', true, true),
  ('ADMIN', 'payroll', true, true),
  ('ADMIN', 'trade', true, true),
  ('ADMIN', 'rental', true, true),
  ('ADMIN', 'service', true, true),
  ('ADMIN', 'tax_invoice', true, true),

  -- MANAGER
  ('MANAGER', 'org', true, false),
  ('MANAGER', 'users', true, false),
  ('MANAGER', 'approval_inbox', true, true),
  ('MANAGER', 'approval_rules', true, false),
  ('MANAGER', 'leave_apply', true, true),
  ('MANAGER', 'leave_manage', true, true),
  ('MANAGER', 'ot_manage', true, true),
  ('MANAGER', 'bank_matching', true, false),
  ('MANAGER', 'payroll', true, false),

  -- ACCOUNTANT
  ('ACCOUNTANT', 'bank_matching', true, true),
  ('ACCOUNTANT', 'payroll', true, true),
  ('ACCOUNTANT', 'tax_invoice', true, true),
  ('ACCOUNTANT', 'trade', true, true),
  ('ACCOUNTANT', 'rental', true, true),
  ('ACCOUNTANT', 'approval_inbox', true, true),

  -- HR_STAFF
  ('HR_STAFF', 'org', true, true),
  ('HR_STAFF', 'users', true, true),
  ('HR_STAFF', 'leave_manage', true, true),
  ('HR_STAFF', 'ot_manage', true, true),
  ('HR_STAFF', 'payroll', true, false),
  ('HR_STAFF', 'approval_inbox', true, true),

  -- EMPLOYEE
  ('EMPLOYEE', 'leave_apply', true, true),
  ('EMPLOYEE', 'ot_manage', true, true),
  ('EMPLOYEE', 'approval_inbox', true, true)
ON CONFLICT (role_code, menu_key) DO NOTHING;

-- 사원 테이블에 role 컬럼 기본값 및 외래키 연동 지원
ALTER TABLE erp_employees
  ADD COLUMN IF NOT EXISTS role_code VARCHAR(50) DEFAULT 'EMPLOYEE';

UPDATE erp_employees SET role_code = 'ADMIN' WHERE login_id = 'admin';
`;

async function run() {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL for permissions migration...');
    await client.query(sql);
    console.log('Successfully executed migration for roles and permissions!');
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
