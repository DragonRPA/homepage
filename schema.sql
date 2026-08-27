-- =========================================================================
-- (주)드래곤알피에이 사내 올인원 ERP & 그룹웨어 SSOT 스키마 (v1.3)
-- Neon Serverless PostgreSQL DDL
-- =========================================================================

-- 1. 임직원 마스터 (3단계 권한: SUPER_ADMIN 운영자, MANAGER 관리자, USER 일반유저)
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_no VARCHAR(20) UNIQUE NOT NULL,
    login_id VARCHAR(50) UNIQUE, -- 운영자가 발급하는 로그인 ID
    password_hash TEXT, -- 암호화된 비밀번호 해시
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(50) NOT NULL,
    position VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(30) DEFAULT 'USER' NOT NULL, -- SUPER_ADMIN(운영자), MANAGER(관리자), USER(일반유저)
    manager_id INTEGER REFERENCES employees(id), -- 직속 결재권자 (유저 ➔ 관리자, 관리자 ➔ 운영자)
    hire_date DATE NOT NULL,
    total_annual_leave NUMERIC(4,1) DEFAULT 15.0 NOT NULL,
    used_annual_leave NUMERIC(4,1) DEFAULT 0.0 NOT NULL,
    remaining_annual_leave NUMERIC(4,1) DEFAULT 15.0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. 근태: 휴가 신청/결재 (근로기준법 전체 법정 휴가 지원 & 주말/공휴일 자동 공제)
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    leave_type VARCHAR(30) NOT NULL, 
    -- 'ANNUAL'(연차), 'AM_HALF'(오전반차), 'PM_HALF'(오후반차), 'QUARTER'(반반차 2h),
    -- 'SICK'(병가), 'RESERVE'(예비군/민방위 공가), 'CONGRAT_CONDOLENCE'(경조사),
    -- 'MATERNITY'(출산/배우자출산휴가), 'MENSTRUAL'(생리휴가), 'FAMILY_CARE'(가족돌봄),
    -- 'INFERTILITY'(난임치료), 'SPECIAL_OFFICIAL'(기타 공가/특별휴가)
    leave_category VARCHAR(20) DEFAULT 'PAID' NOT NULL, -- PAID(유급), UNPAID(무급)
    is_annual_deductible BOOLEAN DEFAULT TRUE NOT NULL, -- 연차 일수 차감 여부
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_calendar_days INTEGER NOT NULL, -- 총 달력 일수
    holiday_excluded_days INTEGER NOT NULL, -- 주말/공휴일 제외된 일수
    working_days_count NUMERIC(4,2) NOT NULL, -- 실제 평일 근무일수
    days_deducted NUMERIC(4,2) NOT NULL, -- 실제 차감 연차 (반차는 0.5, 비차감 휴가는 0)
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, -- PENDING(결재대기), APPROVED(승인완료), REJECTED(반려)
    approver_id INTEGER REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    reject_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. 근태: 초과근무 (결재 없이 인원별 스스로 자율 입력)
CREATE TABLE IF NOT EXISTS overtimes (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    work_date DATE NOT NULL,
    work_type VARCHAR(30) NOT NULL, -- 'EXTENDED'(연장), 'NIGHT'(야간), 'HOLIDAY'(휴일)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    hours NUMERIC(4,2) NOT NULL, -- 초과근무 시간
    work_details TEXT NOT NULL, -- 수행한 업무 내용
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. 사내문서함 (EDMS) 폴더 트리
CREATE TABLE IF NOT EXISTS document_folders (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES document_folders(id) ON DELETE CASCADE,
    folder_name VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. 사내문서 파일 (Cloudflare R2 'dragonrpa-erp' 버킷 연동)
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER REFERENCES document_folders(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(200) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_bucket VARCHAR(50) DEFAULT 'dragonrpa-erp' NOT NULL, -- Cloudflare R2 버킷명
    r2_object_key TEXT, -- R2 오브젝트 스토리지 내부 Key 경로
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT DEFAULT 0 NOT NULL,
    file_version VARCHAR(20) DEFAULT 'v1.0' NOT NULL,
    uploader_id INTEGER REFERENCES employees(id) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. 렌탈 자산 마스터 (전사 표준 헌장 1.2 & 1.3)
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    asset_code VARCHAR(50) UNIQUE NOT NULL, -- 자산번호
    asset_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    spec VARCHAR(100),
    serial_no VARCHAR(100),
    status VARCHAR(30) DEFAULT 'AVAILABLE' NOT NULL, -- AVAILABLE(임대가능), PENDING_OUT(출고대기), RENTED(대여중), RETURNED(반납), REPAIR(수리중)
    purchase_price BIGINT DEFAULT 0,
    current_location VARCHAR(200),
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 7. 자산 라이프사이클 이벤트 무누락 DB 로그 (헌장 1.2)
CREATE TABLE IF NOT EXISTS asset_logs (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
    prev_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    change_reason VARCHAR(200) NOT NULL,
    operator_id INTEGER REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 8. 렌탈 계약 마스터
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    contract_no VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    client_biz_no VARCHAR(20) NOT NULL,
    client_ceo VARCHAR(50),
    client_email VARCHAR(100),
    client_phone VARCHAR(50),
    site_name VARCHAR(100) NOT NULL,
    site_address VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    billing_day INTEGER DEFAULT 31 NOT NULL,
    monthly_rate BIGINT DEFAULT 0 NOT NULL,
    sales_rep_id INTEGER REFERENCES employees(id) NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL, -- ACTIVE, COMPLETED, CANCELLED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 9. 배차 대장 (단일 EXCHANGE 배차 헌장 2.3)
CREATE TABLE IF NOT EXISTS dispatches (
    id SERIAL PRIMARY KEY,
    dispatch_no VARCHAR(50) UNIQUE NOT NULL,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
    dispatch_type VARCHAR(20) DEFAULT 'EXCHANGE' NOT NULL, -- EXCHANGE(교환 1건), OUTBOUND(출고), INBOUND(회수)
    out_asset_id INTEGER REFERENCES assets(id),
    in_asset_id INTEGER REFERENCES assets(id),
    driver_name VARCHAR(50),
    driver_phone VARCHAR(30),
    transport_fee BIGINT DEFAULT 0,
    dispatch_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'REQUESTED' NOT NULL, -- REQUESTED, APPROVED, IN_TRANSIT, COMPLETED, CANCELLED
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 10. 계약 & 대차 이력 감사 추적 (헌장 4.1 & 4.2 정밀 일할 매출 집계)
CREATE TABLE IF NOT EXISTS contract_history (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
    change_type VARCHAR(30) NOT NULL, -- EXCHANGE, RENEWAL, PRICE_CHANGE
    prev_asset_id INTEGER REFERENCES assets(id),
    new_asset_id INTEGER REFERENCES assets(id),
    prev_asset_active_days INTEGER DEFAULT 0,
    prev_asset_revenue BIGINT DEFAULT 0,
    new_asset_start_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 11. 소모품 마스터
CREATE TABLE IF NOT EXISTS consumable_items (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    spec VARCHAR(100),
    unit VARCHAR(20) DEFAULT 'EA' NOT NULL,
    current_stock INTEGER DEFAULT 0 NOT NULL,
    safety_stock INTEGER DEFAULT 5 NOT NULL,
    unit_cost BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 12. 소모품 입출고 이력
CREATE TABLE IF NOT EXISTS consumable_logs (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES consumable_items(id) ON DELETE CASCADE NOT NULL,
    tx_type VARCHAR(20) NOT NULL, -- INBOUND(입고), OUTBOUND(지급)
    quantity INTEGER NOT NULL,
    unit_price BIGINT DEFAULT 0,
    total_price BIGINT DEFAULT 0,
    recipient VARCHAR(100), -- 수령 부서/현장/직원
    operator_id INTEGER REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 13. 매입/매출 전표
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    contract_id INTEGER REFERENCES contracts(id),
    invoice_type VARCHAR(20) NOT NULL, -- SALES(매출), PURCHASE(매입)
    client_name VARCHAR(100) NOT NULL,
    client_biz_no VARCHAR(20) NOT NULL,
    issue_date DATE NOT NULL,
    supply_amount BIGINT NOT NULL,
    tax_amount BIGINT NOT NULL,
    total_amount BIGINT NOT NULL,
    is_tax_invoiced BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(20) DEFAULT 'ISSUED' NOT NULL, -- ISSUED, PAID, CANCELLED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 14. 국세청 전자세금계산서 (홈택스 엑셀 일괄발급 매핑)
CREATE TABLE IF NOT EXISTS tax_invoices (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    nts_confirm_no VARCHAR(50), -- 국세청 승인번호
    supplier_biz_no VARCHAR(20) NOT NULL,
    supplier_name VARCHAR(100) NOT NULL,
    buyer_biz_no VARCHAR(20) NOT NULL,
    buyer_name VARCHAR(100) NOT NULL,
    buyer_email VARCHAR(100) NOT NULL,
    write_date DATE NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    supply_amount BIGINT NOT NULL,
    tax_amount BIGINT NOT NULL,
    total_amount BIGINT NOT NULL,
    publish_method VARCHAR(30) DEFAULT 'EXCEL_BULK' NOT NULL, -- EXCEL_BULK, RPA_DIRECT
    nts_status VARCHAR(30) DEFAULT 'READY' NOT NULL, -- READY, SENT_SUCCESS, SENT_FAIL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);