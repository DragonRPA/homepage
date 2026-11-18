import type { Pool, PoolClient } from "pg";
import { ensureForkliftSchema } from "./forkliftSchemaInit";

const globalForMaintenanceSchema = globalThis as unknown as {
  __erpRentalMaintenanceSchemaPromise?: Promise<void>;
};

export class RentalMaintenanceValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RentalMaintenanceValidationError";
    this.status = status;
  }
}

export function cleanNumericValue(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned) return fallback;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

export async function ensureRentalMaintenanceSchema(executor: Pool | PoolClient): Promise<void> {
  if (!globalForMaintenanceSchema.__erpRentalMaintenanceSchemaPromise) {
    globalForMaintenanceSchema.__erpRentalMaintenanceSchemaPromise = (async () => {
      await ensureForkliftSchema(executor);

      await executor.query(`
        ALTER TABLE erp_rental_assets
          ADD COLUMN IF NOT EXISTS operating_hours NUMERIC(12,1) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS pm_interval_days INT NOT NULL DEFAULT 30,
          ADD COLUMN IF NOT EXISTS last_pm_date DATE,
          ADD COLUMN IF NOT EXISTS last_pm_hours NUMERIC(12,1) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS next_pm_due_date DATE,
          ADD COLUMN IF NOT EXISTS last_hour_recorded_at TIMESTAMPTZ;
      `);

      const colCheck = await executor.query(`
        SELECT column_name, data_type, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_name = 'erp_trade_products'
          AND column_name IN ('current_stock', 'safety_stock');
      `);
      const needsAlter = colCheck.rows.some(
        (r: any) =>
          r.data_type !== "numeric" ||
          Number(r.numeric_precision) !== 12 ||
          Number(r.numeric_scale) !== 2
      );
      if (needsAlter && colCheck.rows.length > 0) {
        await executor.query(`
          ALTER TABLE erp_trade_products
            ALTER COLUMN current_stock TYPE NUMERIC(12,2) USING COALESCE(current_stock, 0)::numeric(12,2),
            ALTER COLUMN safety_stock TYPE NUMERIC(12,2) USING COALESCE(safety_stock, 0)::numeric(12,2);
        `);
      }

      await executor.query(`
        CREATE TABLE IF NOT EXISTS erp_service_vehicles (
          id BIGSERIAL PRIMARY KEY,
          vehicle_no TEXT NOT NULL UNIQUE,
          vehicle_name TEXT NOT NULL,
          driver_employee_id BIGINT REFERENCES erp_employees(id) ON DELETE SET NULL,
          driver_name TEXT,
          driver_phone TEXT,
          region TEXT,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          memo TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await executor.query(`
        CREATE TABLE IF NOT EXISTS erp_vehicle_part_stocks (
          id BIGSERIAL PRIMARY KEY,
          vehicle_id BIGINT NOT NULL REFERENCES erp_service_vehicles(id) ON DELETE CASCADE,
          product_id BIGINT NOT NULL REFERENCES erp_trade_products(id) ON DELETE CASCADE,
          current_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
          target_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (vehicle_id, product_id)
        );
      `);

      await executor.query(`
        CREATE TABLE IF NOT EXISTS erp_part_stock_movements (
          id BIGSERIAL PRIMARY KEY,
          movement_type TEXT NOT NULL,
          movement_date DATE NOT NULL,
          product_id BIGINT NOT NULL REFERENCES erp_trade_products(id) ON DELETE CASCADE,
          qty NUMERIC(12,2) NOT NULL,
          from_location_type TEXT NOT NULL,
          from_vehicle_id BIGINT REFERENCES erp_service_vehicles(id) ON DELETE SET NULL,
          to_location_type TEXT NOT NULL,
          to_vehicle_id BIGINT REFERENCES erp_service_vehicles(id) ON DELETE SET NULL,
          maintenance_id BIGINT,
          asset_id BIGINT REFERENCES erp_rental_assets(id) ON DELETE SET NULL,
          actor_name TEXT,
          note TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await executor.query(`
        CREATE TABLE IF NOT EXISTS erp_rental_maintenances (
          id BIGSERIAL PRIMARY KEY,
          maintenance_no TEXT NOT NULL UNIQUE,
          asset_id BIGINT NOT NULL REFERENCES erp_rental_assets(id) ON DELETE CASCADE,
          serial_no TEXT,
          model_name TEXT,
          customer_name TEXT,
          site_name TEXT,
          contract_no TEXT,
          maintenance_date DATE NOT NULL,
          maintenance_type TEXT NOT NULL,
          result_status TEXT NOT NULL DEFAULT 'COMPLETED',
          operating_hours NUMERIC(12,1) NOT NULL DEFAULT 0,
          technician_employee_id BIGINT REFERENCES erp_employees(id) ON DELETE SET NULL,
          technician_name TEXT,
          vehicle_id BIGINT REFERENCES erp_service_vehicles(id) ON DELETE SET NULL,
          title TEXT NOT NULL,
          symptom TEXT,
          work_performed TEXT,
          checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          reset_component_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
          parts_cost NUMERIC(14,0) NOT NULL DEFAULT 0,
          labor_cost NUMERIC(14,0) NOT NULL DEFAULT 0,
          travel_cost NUMERIC(14,0) NOT NULL DEFAULT 0,
          total_cost NUMERIC(14,0) NOT NULL DEFAULT 0,
          next_pm_due_date DATE,
          asset_status_before TEXT,
          asset_status_after TEXT,
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await executor.query(`
        CREATE TABLE IF NOT EXISTS erp_rental_maintenance_parts (
          id BIGSERIAL PRIMARY KEY,
          maintenance_id BIGINT NOT NULL REFERENCES erp_rental_maintenances(id) ON DELETE CASCADE,
          product_id BIGINT NOT NULL REFERENCES erp_trade_products(id) ON DELETE RESTRICT,
          sku_code TEXT,
          product_name TEXT NOT NULL,
          part_no TEXT,
          unit TEXT,
          qty NUMERIC(12,2) NOT NULL,
          unit_cost NUMERIC(14,0) NOT NULL DEFAULT 0,
          total_cost NUMERIC(14,0) NOT NULL DEFAULT 0,
          source_type TEXT NOT NULL,
          vehicle_id BIGINT REFERENCES erp_service_vehicles(id) ON DELETE SET NULL,
          note TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await executor.query(`
        CREATE TABLE IF NOT EXISTS erp_asset_hour_logs (
          id BIGSERIAL PRIMARY KEY,
          asset_id BIGINT NOT NULL REFERENCES erp_rental_assets(id) ON DELETE CASCADE,
          recorded_date DATE NOT NULL,
          previous_hours NUMERIC(12,1) NOT NULL DEFAULT 0,
          recorded_hours NUMERIC(12,1) NOT NULL DEFAULT 0,
          delta_hours NUMERIC(12,1) NOT NULL DEFAULT 0,
          source_type TEXT NOT NULL,
          source_id BIGINT,
          recorded_by TEXT,
          note TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await executor.query(`
        CREATE TABLE IF NOT EXISTS erp_asset_wear_states (
          id BIGSERIAL PRIMARY KEY,
          asset_id BIGINT NOT NULL REFERENCES erp_rental_assets(id) ON DELETE CASCADE,
          component_code TEXT NOT NULL,
          component_name TEXT NOT NULL,
          interval_hours NUMERIC(12,1) NOT NULL DEFAULT 500,
          last_replaced_hours NUMERIC(12,1) NOT NULL DEFAULT 0,
          last_replaced_date DATE,
          memo TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (asset_id, component_code)
        );
      `);

      await executor.query(`
        CREATE INDEX IF NOT EXISTS idx_erp_rental_maint_asset_date
          ON erp_rental_maintenances (asset_id, maintenance_date DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_erp_rental_maint_type_date
          ON erp_rental_maintenances (maintenance_type, maintenance_date DESC);
        CREATE INDEX IF NOT EXISTS idx_erp_rental_maint_parts_mid
          ON erp_rental_maintenance_parts (maintenance_id);
        CREATE INDEX IF NOT EXISTS idx_erp_part_movements_prod_date
          ON erp_part_stock_movements (product_id, movement_date DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_erp_part_movements_veh
          ON erp_part_stock_movements (from_vehicle_id, to_vehicle_id, id DESC);
        CREATE INDEX IF NOT EXISTS idx_erp_asset_hour_logs_asset
          ON erp_asset_hour_logs (asset_id, recorded_date DESC, id DESC);
      `);
    })().catch((err) => {
      globalForMaintenanceSchema.__erpRentalMaintenanceSchemaPromise = undefined;
      throw err;
    });
  }

  return globalForMaintenanceSchema.__erpRentalMaintenanceSchemaPromise;
}
