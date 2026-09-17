const { neon } = require("@neondatabase/serverless");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_Glpfg5n7jVKE@ep-tiny-frost-azxnod0v-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(connectionString);

async function migrate() {
  console.log("🚀 Starting Product Catalog Schema Migration...");

  // 1. Products Table
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      name_en VARCHAR(100),
      version VARCHAR(30) DEFAULT 'v1.0.0',
      badge VARCHAR(50) DEFAULT 'Best Seller',
      summary TEXT NOT NULL,
      features JSONB DEFAULT '[]'::jsonb,
      icon_type VARCHAR(50) DEFAULT 'file',
      detail_url VARCHAR(200),
      download_url VARCHAR(200),
      is_published BOOLEAN DEFAULT TRUE NOT NULL,
      sort_order INTEGER DEFAULT 1 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `;
  console.log("✅ Created 'products' table.");

  // 2. Product Plans Table
  await sql`
    CREATE TABLE IF NOT EXISTS product_plans (
      id SERIAL PRIMARY KEY,
      product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE NOT NULL,
      plan_type VARCHAR(30) NOT NULL,
      plan_name VARCHAR(100) NOT NULL,
      plan_badge VARCHAR(50),
      price_krw BIGINT NOT NULL,
      price_usd NUMERIC(10, 2) NOT NULL,
      max_activations INTEGER DEFAULT 1 NOT NULL,
      device_desc VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      sort_order INTEGER DEFAULT 1 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      UNIQUE(product_id, plan_type)
    );
  `;
  console.log("✅ Created 'product_plans' table.");

  // 3. Seed Initial Products
  await sql`
    INSERT INTO products (
      id, name, name_en, version, badge, summary, features, icon_type, detail_url, download_url, is_published, sort_order
    ) VALUES 
    (
      'MANUAL_STUDIO',
      '매뉴얼 스튜디오',
      'Manual Studio',
      'v1.4.0',
      'Best Seller',
      '화면 캡처부터 1·2·3 자동 번호 스탬프, 스포트라이트 주석, 파워포인트(PPTX)·구글 슬라이드·Markdown·HTML 원클릭 자동 생성까지. AI 에이전트(MCP)를 지원하는 차세대 매뉴얼 저작 소프트웨어.',
      '["F9 원클릭 고속 캡처 & 1·2·3 자동 번호 스탬프", "파워포인트(F10) & 구글 슬라이드(F11) 1초 자동 슬라이드 주입", "Anthropic 표준 MCP 서버 및 헤드리스 CLI 완벽 지원", "27.97MB 단일 무설치 포터블 실행 파일 (Nuitka C 컴파일)"]'::jsonb,
      'file',
      '/manual-studio',
      '/downloads/ManualStudio.exe',
      TRUE,
      1
    ),
    (
      'LABEL_STATION',
      '라벨스테이션',
      'Label Print Station',
      'v1.0.0',
      'New Release',
      '블루투스 바코드 스캔 즉시 0.1초 DB 매칭 및 1초 Zebra 고속 라벨 직통 출력. 웹 캔버스 비주얼 서식 디자이너와 엑셀 ➔ 웹 ERP 무인 타이핑 자동화 RPA를 통합한 올인원 솔루션.',
      '["Zero-Focus 블루투스 스캔 감지 & 1초 직통 Zebra 출력", "Zebra GK420d, ZD420, ZT411 (203/300 DPI) ZPL 완벽 지원", "웹 브라우저 기반 마우스 드래그앤드롭 서식 디자이너", "엑셀 데이터 ➔ 웹 ERP 무인 타이핑 자동화 (비즈니스 플랜)"]'::jsonb,
      'printer',
      '/label-station',
      '/downloads/LabelStation_Setup_v1.0.0.exe',
      TRUE,
      2
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      name_en = EXCLUDED.name_en,
      version = EXCLUDED.version,
      badge = EXCLUDED.badge,
      summary = EXCLUDED.summary,
      features = EXCLUDED.features,
      icon_type = EXCLUDED.icon_type,
      detail_url = EXCLUDED.detail_url,
      download_url = EXCLUDED.download_url,
      updated_at = NOW();
  `;
  console.log("✅ Seeded products.");

  // 4. Seed Initial Plans
  await sql`
    INSERT INTO product_plans (
      product_id, plan_type, plan_name, plan_badge, price_krw, price_usd, max_activations, device_desc, is_active, sort_order
    ) VALUES
    ('MANUAL_STUDIO', 'PERSONAL', '개인용 (1 PC)', '영구 소장', 33000, 29.00, 1, '1 PC 영구 소장', TRUE, 1),
    ('MANUAL_STUDIO', 'BUSINESS', '기업용 (3 PC)', '추천', 110000, 89.00, 3, '3 PC 동시 인증', TRUE, 2),
    ('LABEL_STATION', 'PERSONAL', '스탠다드 (1 PC)', '영구 소장', 55000, 49.00, 1, '1 PC / 1 프린터', TRUE, 1),
    ('LABEL_STATION', 'BUSINESS', '비즈니스 (3 PC)', 'RPA 내장', 165000, 129.00, 3, '3 PC / 무제한 출력', TRUE, 2)
    ON CONFLICT (product_id, plan_type) DO UPDATE SET
      plan_name = EXCLUDED.plan_name,
      plan_badge = EXCLUDED.plan_badge,
      price_krw = EXCLUDED.price_krw,
      price_usd = EXCLUDED.price_usd,
      max_activations = EXCLUDED.max_activations,
      device_desc = EXCLUDED.device_desc,
      updated_at = NOW();
  `;
  console.log("✅ Seeded product plans.");
  console.log("🎉 Product Catalog Migration completed successfully!");
}

migrate().catch((err) => {
  console.error("❌ Migration error:", err);
  process.exit(1);
});
