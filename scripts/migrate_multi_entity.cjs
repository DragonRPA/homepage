const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const connStr = 'postgresql://postgres.lkohpffieaanwhohttbu:BKK5s3E1ydVKx6qJ@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL.");

    const ddl = `
      -- 1. erp_tax_invoices: 사업자 구분 및 공급자 상세 정보 컬럼 추가
      ALTER TABLE erp_tax_invoices 
        ADD COLUMN IF NOT EXISTS supplier_entity_type VARCHAR(20) DEFAULT 'CORP',
        ADD COLUMN IF NOT EXISTS supplier_corp_num VARCHAR(30) DEFAULT '8068803266',
        ADD COLUMN IF NOT EXISTS supplier_corp_name VARCHAR(150) DEFAULT '주식회사 드래곤알피에이',
        ADD COLUMN IF NOT EXISTS supplier_ceo_name VARCHAR(50) DEFAULT '이정용',
        ADD COLUMN IF NOT EXISTS supplier_address TEXT DEFAULT '서울특별시 금천구 서부샛길 528, 547호(가산동, 가산미소지움오피스텔)',
        ADD COLUMN IF NOT EXISTS supplier_biz_type VARCHAR(200) DEFAULT '정보통신업, 도매 및 소매업, 부동산업, 사업시설 관리, 사업지원 및 임대 서비스업',
        ADD COLUMN IF NOT EXISTS supplier_biz_class VARCHAR(200) DEFAULT '응용 소프트웨어 개발 및 공급업, 컴퓨터 및 주변장치·소프트웨어 도소매업, 기타 산업용 기계 및 장비 임대업',
        ADD COLUMN IF NOT EXISTS supplier_email VARCHAR(150) DEFAULT '77.victor.lee@gmail.com';

      -- 2. erp_trade_sales: 귀속 사업자 (CORP / INDIVIDUAL)
      ALTER TABLE erp_trade_sales
        ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20) DEFAULT 'CORP';

      -- 3. erp_trade_purchases: 귀속 사업자 (CORP / INDIVIDUAL)
      ALTER TABLE erp_trade_purchases
        ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20) DEFAULT 'CORP';

      -- 4. erp_rental_contracts: 귀속 사업자 (CORP / INDIVIDUAL)
      ALTER TABLE erp_rental_contracts
        ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20) DEFAULT 'CORP';

      -- 5. erp_service_contracts: 귀속 사업자 (CORP / INDIVIDUAL)
      ALTER TABLE erp_service_contracts
        ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20) DEFAULT 'CORP';

      -- 6. erp_bank_transactions: 계좌별 귀속 사업자 (CORP / INDIVIDUAL)
      ALTER TABLE erp_bank_transactions
        ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20) DEFAULT 'CORP';

      -- 기존 샘플 계좌번호 현실화 (법인 기업은행 기본값)
      UPDATE erp_bank_transactions 
      SET account_no = '478-081383-04-018', entity_type = 'CORP' 
      WHERE account_no = '111-222-333333' OR account_no IS NULL;
    `;

    await client.query(ddl);
    console.log("Migration executed successfully!");

    // Verify columns
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'erp_tax_invoices' AND column_name LIKE 'supplier%'
    `);
    console.log("Verified erp_tax_invoices columns:", res.rows);

  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
