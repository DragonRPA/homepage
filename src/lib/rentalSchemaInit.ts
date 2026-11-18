import "server-only";
import type { Pool, PoolClient } from "pg";

const globalForRentalSchema = globalThis as unknown as {
  rentalRateSchemaPromise?: Promise<void>;
};

/**
 * 렌탈 과금 기준(rate_basis) 및 자산별 적용 일단가(current_daily_rate) 멱등 스키마 보강
 */
export async function ensureRentalRateSchema(
  executor: Pool | PoolClient
): Promise<void> {
  if (!globalForRentalSchema.rentalRateSchemaPromise) {
    globalForRentalSchema.rentalRateSchemaPromise = (async () => {
      try {
        await executor.query(`
          ALTER TABLE erp_rental_contracts
          ADD COLUMN IF NOT EXISTS rate_basis VARCHAR(30) DEFAULT 'MONTHLY';
        `);
        await executor.query(`
          ALTER TABLE erp_rental_assets
          ADD COLUMN IF NOT EXISTS current_daily_rate NUMERIC DEFAULT 0;
        `);
      } catch (err) {
        globalForRentalSchema.rentalRateSchemaPromise = undefined;
        throw err;
      }
    })();
  }
  return globalForRentalSchema.rentalRateSchemaPromise;
}
