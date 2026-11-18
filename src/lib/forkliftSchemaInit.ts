import type { Pool, PoolClient } from "pg";

const globalForForkliftSchema = globalThis as typeof globalThis & {
  __forkliftSchemaV2Promise?: Promise<void>;
};

export const FORKLIFT_DDL_STATEMENTS: ReadonlyArray<string> = [
  `ALTER TABLE IF EXISTS erp_trade_products
    ADD COLUMN IF NOT EXISTS item_class VARCHAR(20) NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS part_no VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS install_fee NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS addon_monthly_rate NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS addon_daily_rate NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS warranty_months INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS warranty_hours INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS spec_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS inbound_date DATE`,

  `ALTER TABLE IF EXISTS erp_rental_products
    ADD COLUMN IF NOT EXISTS item_class VARCHAR(20) NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN IF NOT EXISTS part_no VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS install_fee NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS warranty_months INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS warranty_hours INTEGER NOT NULL DEFAULT 2000,
    ADD COLUMN IF NOT EXISTS spec_data JSONB NOT NULL DEFAULT '{}'::jsonb`,

  `ALTER TABLE IF EXISTS erp_trade_sales
    ADD COLUMN IF NOT EXISTS sale_category VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN IF NOT EXISTS site_name VARCHAR(200) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS chassis_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS installed_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS warranty_months INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS warranty_hours INTEGER NOT NULL DEFAULT 2000`,

  `ALTER TABLE IF EXISTS erp_rental_assets
    ADD COLUMN IF NOT EXISTS attached_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS operating_hours NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS warranty_start_date DATE,
    ADD COLUMN IF NOT EXISTS warranty_end_date DATE,
    ADD COLUMN IF NOT EXISTS warranty_hours INTEGER NOT NULL DEFAULT 2000`,

  `ALTER TABLE IF EXISTS erp_rental_contracts
    ADD COLUMN IF NOT EXISTS attached_options JSONB NOT NULL DEFAULT '[]'::jsonb`,

  `CREATE TABLE IF NOT EXISTS erp_forklift_warranties (
    id BIGSERIAL PRIMARY KEY,
    warranty_no VARCHAR(40) NOT NULL UNIQUE,
    chassis_no VARCHAR(100) NOT NULL UNIQUE,
    source_type VARCHAR(20) NOT NULL DEFAULT 'SALE',
    source_id BIGINT,
    asset_id BIGINT,
    product_id BIGINT,
    model_name VARCHAR(200) NOT NULL DEFAULT '',
    manufacturer VARCHAR(100) NOT NULL DEFAULT '',
    partner_id BIGINT,
    customer_name VARCHAR(200) NOT NULL DEFAULT '',
    site_name VARCHAR(200) NOT NULL DEFAULT '',
    delivery_date DATE,
    warranty_start_date DATE NOT NULL,
    warranty_months INTEGER NOT NULL DEFAULT 12,
    warranty_end_date DATE NOT NULL,
    warranty_hours INTEGER NOT NULL DEFAULT 2000,
    current_operating_hours NUMERIC NOT NULL DEFAULT 0,
    attached_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    memo TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_forklift_warranties_end_date
    ON erp_forklift_warranties (warranty_end_date)`,

  `CREATE TABLE IF NOT EXISTS erp_forklift_warranty_claims (
    id BIGSERIAL PRIMARY KEY,
    warranty_id BIGINT NOT NULL REFERENCES erp_forklift_warranties(id) ON DELETE CASCADE,
    chassis_no VARCHAR(100) NOT NULL,
    claim_date DATE NOT NULL,
    operating_hours NUMERIC NOT NULL DEFAULT 0,
    claim_type VARCHAR(30) NOT NULL DEFAULT 'WARRANTY_FREE',
    symptom TEXT NOT NULL DEFAULT '',
    resolution TEXT NOT NULL DEFAULT '',
    parts_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    repair_cost NUMERIC NOT NULL DEFAULT 0,
    billed_amount NUMERIC NOT NULL DEFAULT 0,
    technician_name VARCHAR(100) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    memo TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_forklift_warranty_claims_wid
    ON erp_forklift_warranty_claims (warranty_id, claim_date DESC)`,
];

export async function ensureForkliftSchema(executor: Pool | PoolClient): Promise<void> {
  if (!globalForForkliftSchema.__forkliftSchemaV2Promise) {
    globalForForkliftSchema.__forkliftSchemaV2Promise = (async () => {
      try {
        for (const ddl of FORKLIFT_DDL_STATEMENTS) {
          await executor.query(ddl);
        }
      } catch (err) {
        globalForForkliftSchema.__forkliftSchemaV2Promise = undefined;
        throw err;
      }
    })();
  }
  return globalForForkliftSchema.__forkliftSchemaV2Promise;
}
