const { Client } = require('pg');

const connStr = 'postgresql://postgres.lkohpffieaanwhohttbu:BKK5s3E1ydVKx6qJ@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const schemaSql = `
-- 1. 임직원 관리 및 인증
CREATE TABLE IF NOT EXISTS erp_employees (
  id BIGSERIAL PRIMARY KEY,
  employee_no VARCHAR(50) UNIQUE NOT NULL,
  login_id VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT '1111',
  name VARCHAR(100) NOT NULL,
  position VARCHAR(50) NOT NULL DEFAULT '사원',
  department VARCHAR(100) NOT NULL DEFAULT '기술개발부',
  role VARCHAR(50) NOT NULL DEFAULT 'USER', -- SUPER_ADMIN, ADMIN, USER
  email VARCHAR(150),
  phone VARCHAR(50),
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  leave_date DATE,
  employment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE(재직), ON_LEAVE(휴직), RESIGNED(퇴사)
  annual_leave_grant NUMERIC(5,1) NOT NULL DEFAULT 15.0,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 연차 초기화 이력
CREATE TABLE IF NOT EXISTS erp_annual_leave_resets (
  id BIGSERIAL PRIMARY KEY,
  reset_year INTEGER NOT NULL,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_employees_affected INTEGER NOT NULL DEFAULT 0,
  executed_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 연차 신청 및 결재
CREATE TABLE IF NOT EXISTS erp_leave_requests (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES erp_employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(30) NOT NULL DEFAULT 'ANNUAL', -- ANNUAL(연차), HALF_AM(오전반차), HALF_PM(오후반차), SPECIAL(경조/특별)
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  deducted_days NUMERIC(4,1) NOT NULL DEFAULT 1.0,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING(대기), APPROVED(승인), REJECTED(반려), CANCELLED(취소)
  approver_id BIGINT REFERENCES erp_employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 판매용 제품 마스터
CREATE TABLE IF NOT EXISTS erp_trade_products (
  id BIGSERIAL PRIMARY KEY,
  sku_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '완제품',
  spec VARCHAR(200),
  unit VARCHAR(20) NOT NULL DEFAULT 'EA',
  standard_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  standard_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  safety_stock INTEGER NOT NULL DEFAULT 10,
  current_stock INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE(판매중), DISCONTINUED(단종)
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 판매용 구매/매입
CREATE TABLE IF NOT EXISTS erp_trade_purchases (
  id BIGSERIAL PRIMARY KEY,
  purchase_no VARCHAR(50) UNIQUE NOT NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_name VARCHAR(150) NOT NULL,
  product_id BIGINT REFERENCES erp_trade_products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED', -- ORDERED(발주), CONFIRMED(입고완료), CANCELLED(취소)
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. 판매용 판매/출고
CREATE TABLE IF NOT EXISTS erp_trade_sales (
  id BIGSERIAL PRIMARY KEY,
  sale_no VARCHAR(50) UNIQUE NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name VARCHAR(150) NOT NULL,
  product_id BIGINT REFERENCES erp_trade_products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  cogs_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  margin_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED', -- DRAFT, CONFIRMED, SHIPPED, CANCELLED
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. 임대용 제품 마스터
CREATE TABLE IF NOT EXISTS erp_rental_products (
  id BIGSERIAL PRIMARY KEY,
  model_code VARCHAR(50) UNIQUE NOT NULL,
  model_name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '고소작업대',
  manufacturer VARCHAR(100),
  standard_monthly_rate NUMERIC(15,2) NOT NULL DEFAULT 0,
  standard_daily_rate NUMERIC(15,2) NOT NULL DEFAULT 0,
  spec VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. 임대용 자산 취득 및 감가상각
CREATE TABLE IF NOT EXISTS erp_rental_assets (
  id BIGSERIAL PRIMARY KEY,
  asset_no VARCHAR(50) UNIQUE NOT NULL,
  rental_product_id BIGINT REFERENCES erp_rental_products(id) ON DELETE RESTRICT,
  serial_no VARCHAR(100),
  acquisition_date DATE NOT NULL DEFAULT CURRENT_DATE,
  acquisition_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  salvage_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  useful_life_years INTEGER NOT NULL DEFAULT 5,
  depreciation_method VARCHAR(30) NOT NULL DEFAULT 'STRAIGHT_LINE',
  accumulated_depreciation NUMERIC(15,2) NOT NULL DEFAULT 0,
  book_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE(임대가능), RENTED(대여중), INSPECTING(검수대기), REPAIRING(수리중), DISPOSED(매각/폐기)
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. 자산 감가상각 월별 로그
CREATE TABLE IF NOT EXISTS erp_asset_depreciation_logs (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT REFERENCES erp_rental_assets(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL, -- YYYY-MM
  monthly_depreciation NUMERIC(15,2) NOT NULL DEFAULT 0,
  accumulated_depreciation NUMERIC(15,2) NOT NULL DEFAULT 0,
  book_value_after NUMERIC(15,2) NOT NULL DEFAULT 0,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. 임대계약 대장
CREATE TABLE IF NOT EXISTS erp_rental_contracts (
  id BIGSERIAL PRIMARY KEY,
  contract_no VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  site_name VARCHAR(200) NOT NULL,
  asset_id BIGINT REFERENCES erp_rental_assets(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rate NUMERIC(15,2) NOT NULL DEFAULT 0,
  daily_rate NUMERIC(15,2) NOT NULL DEFAULT 0,
  deposit NUMERIC(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE(대여중), RETURNED(반납완료), TERMINATED(계약종료)
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. 임대 기간별 매출정산 및 청구
CREATE TABLE IF NOT EXISTS erp_rental_billings (
  id BIGSERIAL PRIMARY KEY,
  billing_no VARCHAR(50) UNIQUE NOT NULL,
  contract_id BIGINT REFERENCES erp_rental_contracts(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  operating_days INTEGER NOT NULL DEFAULT 30,
  pro_rata_revenue NUMERIC(15,2) NOT NULL DEFAULT 0,
  depreciation_cogs NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_margin NUMERIC(15,2) NOT NULL DEFAULT 0,
  billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID', -- UNPAID(미수), PARTIAL(일부수납), PAID(완납)
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_invoice_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. 운영용역 & 개발용역 계약 대장
CREATE TABLE IF NOT EXISTS erp_service_contracts (
  id BIGSERIAL PRIMARY KEY,
  contract_no VARCHAR(50) UNIQUE NOT NULL,
  service_type VARCHAR(30) NOT NULL, -- OPERATIONAL(운영용역), DEVELOPMENT(개발용역)
  customer_name VARCHAR(150) NOT NULL,
  project_name VARCHAR(200) NOT NULL,
  contract_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  monthly_fee NUMERIC(15,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  billing_day INTEGER NOT NULL DEFAULT 25,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE(진행중), COMPLETED(완료), TERMINATED(해지)
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. 운영/개발용역 청구 및 마일스톤 관리
CREATE TABLE IF NOT EXISTS erp_service_billings (
  id BIGSERIAL PRIMARY KEY,
  billing_no VARCHAR(50) UNIQUE NOT NULL,
  contract_id BIGINT REFERENCES erp_service_contracts(id) ON DELETE CASCADE,
  billing_type VARCHAR(30) NOT NULL DEFAULT 'MONTHLY_RETAINER', -- MONTHLY_RETAINER(월용역료), MILESTONE(착수/중도/잔금)
  milestone_name VARCHAR(100),
  billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supply_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID', -- UNPAID(미수), PAID(완납)
  tax_invoice_id BIGINT,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. 세금계산서 통합 대장
CREATE TABLE IF NOT EXISTS erp_tax_invoices (
  id BIGSERIAL PRIMARY KEY,
  invoice_no VARCHAR(50) UNIQUE NOT NULL,
  domain_type VARCHAR(30) NOT NULL, -- TRADE_SALE, RENTAL, OP_SERVICE, DEV_SERVICE
  ref_id BIGINT,
  customer_name VARCHAR(150) NOT NULL,
  business_no VARCHAR(30),
  ceo_name VARCHAR(50),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supply_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  item_name VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ISSUED', -- DRAFT, ISSUED, SENT_NTS, CANCELLED
  nts_confirm_no VARCHAR(50),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. 전사 감사 및 이벤트 로그 (헌장 1.2 무누락 저장)
CREATE TABLE IF NOT EXISTS erp_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  domain VARCHAR(50) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  record_id VARCHAR(50),
  actor_name VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 초기 관리자 계정 생성 (기본 아이디: admin / 비밀번호: 1111)
INSERT INTO erp_employees (employee_no, login_id, password_hash, name, position, department, role, email, phone, annual_leave_grant, must_change_password)
VALUES ('EMP001', 'admin', '1111', '이정용 대표이사', '대표이사', '경영총괄', 'SUPER_ADMIN', 'contact@dragonrpa.co.kr', '010-0000-0000', 20.0, false)
ON CONFLICT (login_id) DO NOTHING;
`;

async function main() {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL!');
    await client.query(schemaSql);
    console.log('Successfully executed schema DDL and inserted initial admin employee!');
    const res = await client.query('SELECT count(*) FROM erp_employees;');
    console.log('erp_employees count:', res.rows[0].count);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
