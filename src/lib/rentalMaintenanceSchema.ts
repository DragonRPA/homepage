import type { Pool, PoolClient } from "pg";
import { ensureForkliftSchema } from "./forkliftSchemaInit";
import { getKstTodayIso } from "./forkliftDomain";
import {
  DEFAULT_PM_INTERVAL_DAYS,
  DEFAULT_WEAR_COMPONENTS,
  addDaysIso,
  buildAssetWearSummary,
  clampPmIntervalDays,
  normalizeIsoDate,
  normalizePmChecklist,
  type AssetWearConfigItem,
  type MaintenancePartLineInput,
  type MaintenancePartLineRecord,
  type MaintenanceResultStatus,
  type MaintenanceType,
  type PartStockSource,
  type PartTransferType,
  type PmChecklistItem,
} from "./rentalMaintenanceDomain";

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

function normalizeMaintenanceType(raw: unknown): MaintenanceType {
  const val = String(raw || "PREVENTIVE").trim().toUpperCase();
  if (val === "PREVENTIVE" || val === "CORRECTIVE" || val === "EMERGENCY" || val === "OVERHAUL") {
    return val;
  }
  throw new RentalMaintenanceValidationError(`유효하지 않은 정비유형입니다: ${val}`);
}

function normalizeMaintenanceResult(raw: unknown): MaintenanceResultStatus {
  const val = String(raw || "COMPLETED").trim().toUpperCase();
  if (val === "COMPLETED" || val === "FOLLOW_UP_REQUIRED") {
    return val;
  }
  throw new RentalMaintenanceValidationError(`유효하지 않은 정비결과 상태입니다: ${val}`);
}

function normalizePartLinesInput(rawLines: unknown): MaintenancePartLineInput[] {
  if (!Array.isArray(rawLines)) return [];
  const normalized: MaintenancePartLineInput[] = [];
  for (const row of rawLines) {
    if (!row || typeof row !== "object") continue;
    const obj = row as Record<string, unknown>;
    const productId = Math.trunc(cleanNumericValue(obj.productId, 0));
    const qty = Math.round(cleanNumericValue(obj.qty, 0) * 100) / 100;
    if (productId <= 0 || qty <= 0) {
      throw new RentalMaintenanceValidationError("부품 품목과 수량(0 초과)을 정확히 입력하세요.");
    }
    const sourceRaw = String(obj.sourceType || "YARD").trim().toUpperCase();
    if (sourceRaw !== "YARD" && sourceRaw !== "VEHICLE") {
      throw new RentalMaintenanceValidationError(`유효하지 않은 부품 출처입니다: ${sourceRaw}`);
    }
    const sourceType: PartStockSource = sourceRaw;
    const vehicleId = obj.vehicleId != null && obj.vehicleId !== "" ? Math.trunc(cleanNumericValue(obj.vehicleId, 0)) : null;
    if (sourceType === "VEHICLE" && (!vehicleId || vehicleId <= 0)) {
      throw new RentalMaintenanceValidationError("차량 재고 출고 시 정비차량을 선택해야 합니다.");
    }
    const unitCost =
      obj.unitCost !== undefined && obj.unitCost !== null && obj.unitCost !== ""
        ? Math.max(0, Math.round(cleanNumericValue(obj.unitCost, 0)))
        : null;
    normalized.push({
      productId,
      qty,
      sourceType,
      vehicleId: sourceType === "VEHICLE" ? vehicleId : null,
      unitCost,
      note: obj.note ? String(obj.note).trim() : null,
    });
  }
  return normalized;
}

async function lockVehicleRowsOrdered(client: PoolClient, vehicleIds: number[]): Promise<Map<number, { id: number; vehicle_no: string; vehicle_name: string }>> {
  const uniqueIds = Array.from(new Set(vehicleIds.filter((id) => id > 0))).sort((a, b) => a - b);
  const map = new Map<number, { id: number; vehicle_no: string; vehicle_name: string }>();
  if (uniqueIds.length === 0) return map;

  const res = await client.query<{ id: string | number; vehicle_no: string; vehicle_name: string }>(
    `SELECT id, vehicle_no, vehicle_name
     FROM erp_service_vehicles
     WHERE id = ANY($1::bigint[])
     ORDER BY id ASC
     FOR UPDATE`,
    [uniqueIds]
  );
  for (const row of res.rows) {
    const numId = Number(row.id);
    map.set(numId, { id: numId, vehicle_no: row.vehicle_no, vehicle_name: row.vehicle_name });
  }
  for (const reqId of uniqueIds) {
    if (!map.has(reqId)) {
      throw new RentalMaintenanceValidationError(`정비차량(ID: ${reqId})을 찾을 수 없습니다.`, 404);
    }
  }
  return map;
}

async function syncWarrantyOperatingHoursTx(
  client: PoolClient,
  assetId: number,
  serialNo: string | null | undefined,
  operatingHours: number
): Promise<void> {
  await client.query(
    `UPDATE erp_forklift_warranties
     SET current_operating_hours = GREATEST(COALESCE(current_operating_hours, 0), $1),
         updated_at = NOW()
     WHERE asset_id = $2
        OR ($3::text IS NOT NULL AND $3 <> '' AND UPPER(TRIM(chassis_no)) = UPPER(TRIM($3)))`,
    [operatingHours, assetId, serialNo || null]
  );
}

async function applyMaintenancePartsTx(
  client: PoolClient,
  params: {
    maintenanceId: number;
    assetId: number;
    movementDate: string;
    lines: MaintenancePartLineInput[];
    actorName: string;
  }
): Promise<{ parts: MaintenancePartLineRecord[]; partsCost: number }> {
  const insertedParts: MaintenancePartLineRecord[] = [];
  let partsCost = 0;

  if (params.lines.length === 0) {
    return { parts: insertedParts, partsCost: 0 };
  }

  const vehicleIds = params.lines
    .filter((l) => l.sourceType === "VEHICLE" && l.vehicleId)
    .map((l) => Number(l.vehicleId));
  const vehicleMap = await lockVehicleRowsOrdered(client, vehicleIds);

  for (const line of params.lines) {
    const prodRes = await client.query<{
      id: string | number;
      sku_code: string;
      name: string;
      part_no: string | null;
      unit: string | null;
      standard_cost: string | number | null;
      current_stock: string | number | null;
    }>(
      `SELECT id, sku_code, name, part_no, unit, standard_cost, current_stock
       FROM erp_trade_products
       WHERE id = $1
       FOR UPDATE`,
      [line.productId]
    );
    if (prodRes.rows.length === 0) {
      throw new RentalMaintenanceValidationError(`부품 품목(ID: ${line.productId})을 찾을 수 없습니다.`, 404);
    }
    const prod = prodRes.rows[0];
    const resolvedUnitCost =
      line.unitCost !== null && line.unitCost !== undefined
        ? Math.max(0, Math.round(line.unitCost))
        : Math.max(0, Math.round(Number(prod.standard_cost || 0)));
    const totalCost = Math.round(line.qty * resolvedUnitCost);

    if (line.sourceType === "YARD") {
      const yardStock = Number(prod.current_stock || 0);
      if (yardStock < line.qty) {
        throw new RentalMaintenanceValidationError(
          `주기장 부품 [${prod.name}] 재고가 부족합니다. (현재: ${yardStock}, 요청: ${line.qty})`
        );
      }
      await client.query(
        `UPDATE erp_trade_products
         SET current_stock = current_stock - $1,
             updated_at = NOW()
         WHERE id = $2`,
        [line.qty, line.productId]
      );
      await client.query(
        `INSERT INTO erp_part_stock_movements (
          movement_type, movement_date, product_id, qty,
          from_location_type, from_vehicle_id, to_location_type, to_vehicle_id,
          maintenance_id, asset_id, actor_name, note
        ) VALUES (
          'MAINTENANCE_CONSUME', $1::date, $2, $3,
          'YARD', NULL, 'ASSET', NULL,
          $4, $5, $6, $7
        )`,
        [
          params.movementDate,
          line.productId,
          line.qty,
          params.maintenanceId,
          params.assetId,
          params.actorName,
          line.note || `정비 부품 사용 (${prod.name})`,
        ]
      );
    } else {
      const vId = Number(line.vehicleId);
      const vehicle = vehicleMap.get(vId);
      const stockRes = await client.query<{ id: string | number; current_qty: string | number }>(
        `SELECT id, current_qty
         FROM erp_vehicle_part_stocks
         WHERE vehicle_id = $1 AND product_id = $2
         FOR UPDATE`,
        [vId, line.productId]
      );
      const currentVehicleQty = stockRes.rows.length > 0 ? Number(stockRes.rows[0].current_qty || 0) : 0;
      if (currentVehicleQty < line.qty) {
        throw new RentalMaintenanceValidationError(
          `정비차량(${vehicle?.vehicle_no || vId}) [${prod.name}] 적재재고가 부족합니다. (현재: ${currentVehicleQty}, 요청: ${line.qty})`
        );
      }
      await client.query(
        `UPDATE erp_vehicle_part_stocks
         SET current_qty = current_qty - $1,
             updated_at = NOW()
         WHERE vehicle_id = $2 AND product_id = $3`,
        [line.qty, vId, line.productId]
      );
      await client.query(
        `INSERT INTO erp_part_stock_movements (
          movement_type, movement_date, product_id, qty,
          from_location_type, from_vehicle_id, to_location_type, to_vehicle_id,
          maintenance_id, asset_id, actor_name, note
        ) VALUES (
          'MAINTENANCE_CONSUME', $1::date, $2, $3,
          'VEHICLE', $4, 'ASSET', NULL,
          $5, $6, $7, $8
        )`,
        [
          params.movementDate,
          line.productId,
          line.qty,
          vId,
          params.maintenanceId,
          params.assetId,
          params.actorName,
          line.note || `차량(${vehicle?.vehicle_no || vId}) 부품 사용 (${prod.name})`,
        ]
      );
    }

    const partInsertRes = await client.query<{ id: string | number }>(
      `INSERT INTO erp_rental_maintenance_parts (
        maintenance_id, product_id, sku_code, product_name, part_no, unit,
        qty, unit_cost, total_cost, source_type, vehicle_id, note
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
      ) RETURNING id`,
      [
        params.maintenanceId,
        line.productId,
        prod.sku_code,
        prod.name,
        prod.part_no,
        prod.unit || "EA",
        line.qty,
        resolvedUnitCost,
        totalCost,
        line.sourceType,
        line.sourceType === "VEHICLE" ? line.vehicleId : null,
        line.note || null,
      ]
    );

    partsCost += totalCost;
    insertedParts.push({
      id: Number(partInsertRes.rows[0].id),
      maintenanceId: params.maintenanceId,
      productId: line.productId,
      skuCode: prod.sku_code,
      productName: prod.name,
      partNo: prod.part_no,
      unit: prod.unit || "EA",
      qty: line.qty,
      unitCost: resolvedUnitCost,
      totalCost,
      sourceType: line.sourceType,
      vehicleId: line.sourceType === "VEHICLE" ? Number(line.vehicleId) : null,
      vehicleNo: line.sourceType === "VEHICLE" ? vehicleMap.get(Number(line.vehicleId))?.vehicle_no || null : null,
      note: line.note || null,
    });
  }

  return { parts: insertedParts, partsCost };
}

async function reverseMaintenancePartsTx(
  client: PoolClient,
  params: {
    maintenanceId: number;
    assetId: number;
    movementDate: string;
    actorName: string;
  }
): Promise<void> {
  const existingRes = await client.query<{
    id: string | number;
    product_id: string | number;
    product_name: string;
    qty: string | number;
    source_type: string;
    vehicle_id: string | number | null;
  }>(
    `SELECT id, product_id, product_name, qty, source_type, vehicle_id
     FROM erp_rental_maintenance_parts
     WHERE maintenance_id = $1
     ORDER BY id ASC`,
    [params.maintenanceId]
  );

  for (const row of existingRes.rows) {
    const productId = Number(row.product_id);
    const qty = Number(row.qty || 0);
    if (qty <= 0) continue;

    if (row.source_type === "YARD") {
      await client.query(
        `UPDATE erp_trade_products
         SET current_stock = COALESCE(current_stock, 0) + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [qty, productId]
      );
      await client.query(
        `INSERT INTO erp_part_stock_movements (
          movement_type, movement_date, product_id, qty,
          from_location_type, from_vehicle_id, to_location_type, to_vehicle_id,
          maintenance_id, asset_id, actor_name, note
        ) VALUES (
          'MAINTENANCE_REVERSAL', $1::date, $2, $3,
          'ASSET', NULL, 'YARD', NULL,
          $4, $5, $6, $7
        )`,
        [
          params.movementDate,
          productId,
          qty,
          params.maintenanceId,
          params.assetId,
          params.actorName,
          `정비수정 부품 환입 (${row.product_name})`,
        ]
      );
    } else if (row.source_type === "VEHICLE" && row.vehicle_id) {
      const vId = Number(row.vehicle_id);
      await client.query(
        `INSERT INTO erp_vehicle_part_stocks (vehicle_id, product_id, current_qty, target_qty, updated_at)
         VALUES ($1, $2, $3, 0, NOW())
         ON CONFLICT (vehicle_id, product_id)
         DO UPDATE SET
           current_qty = erp_vehicle_part_stocks.current_qty + EXCLUDED.current_qty,
           updated_at = NOW()`,
        [vId, productId, qty]
      );
      await client.query(
        `INSERT INTO erp_part_stock_movements (
          movement_type, movement_date, product_id, qty,
          from_location_type, from_vehicle_id, to_location_type, to_vehicle_id,
          maintenance_id, asset_id, actor_name, note
        ) VALUES (
          'MAINTENANCE_REVERSAL', $1::date, $2, $3,
          'ASSET', NULL, 'VEHICLE', $4,
          $5, $6, $7, $8
        )`,
        [
          params.movementDate,
          productId,
          qty,
          vId,
          params.maintenanceId,
          params.assetId,
          params.actorName,
          `정비수정 차량재고 환입 (${row.product_name})`,
        ]
      );
    }
  }

  await client.query(`DELETE FROM erp_rental_maintenance_parts WHERE maintenance_id = $1`, [
    params.maintenanceId,
  ]);
}

async function applyWearComponentResetsTx(
  client: PoolClient,
  params: {
    assetId: number;
    componentCodes: string[];
    operatingHours: number;
    resetDate: string;
  }
): Promise<void> {
  const uniqueCodes = Array.from(
    new Set(params.componentCodes.map((c) => String(c || "").trim()).filter(Boolean))
  );
  if (uniqueCodes.length === 0) return;

  const defByCode = new Map(DEFAULT_WEAR_COMPONENTS.map((d) => [d.componentCode, d]));
  for (const code of uniqueCodes) {
    const def = defByCode.get(code);
    const componentName = def ? def.componentName : code;
    const defaultInterval = def ? def.defaultIntervalHours : 500;
    await client.query(
      `INSERT INTO erp_asset_wear_states (
        asset_id, component_code, component_name, interval_hours,
        last_replaced_hours, last_replaced_date, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6::date, NOW())
      ON CONFLICT (asset_id, component_code)
      DO UPDATE SET
        last_replaced_hours = EXCLUDED.last_replaced_hours,
        last_replaced_date = EXCLUDED.last_replaced_date,
        updated_at = NOW()`,
      [params.assetId, code, componentName, defaultInterval, params.operatingHours, params.resetDate]
    );
  }
}

export async function executePartStockTransferTx(
  client: PoolClient,
  params: {
    transferType: PartTransferType;
    productId: number;
    qty: number;
    movementDate?: string | null;
    fromVehicleId?: number | null;
    toVehicleId?: number | null;
    targetQty?: number | null;
    actorName?: string | null;
    note?: string | null;
  }
): Promise<{
  movementId: number;
  transferType: PartTransferType;
  productId: number;
  qty: number;
  yardStockAfter: number;
  fromVehicleStockAfter: number | null;
  toVehicleStockAfter: number | null;
}> {
  const transferType = String(params.transferType || "").trim().toUpperCase() as PartTransferType;
  if (
    transferType !== "LOAD_TO_VEHICLE" &&
    transferType !== "RETURN_TO_YARD" &&
    transferType !== "VEHICLE_TRANSFER"
  ) {
    throw new RentalMaintenanceValidationError(`유효하지 않은 부품 이동유형입니다: ${transferType}`);
  }

  const productId = Math.trunc(cleanNumericValue(params.productId, 0));
  const qty = Math.round(cleanNumericValue(params.qty, 0) * 100) / 100;
  if (productId <= 0 || qty <= 0) {
    throw new RentalMaintenanceValidationError("이동할 부품 품목과 수량(0 초과)을 입력하세요.");
  }

  const movementDate = normalizeIsoDate(params.movementDate) || getKstTodayIso();
  const fromVehicleId = params.fromVehicleId ? Math.trunc(cleanNumericValue(params.fromVehicleId, 0)) : null;
  const toVehicleId = params.toVehicleId ? Math.trunc(cleanNumericValue(params.toVehicleId, 0)) : null;
  const actorName = String(params.actorName || "시스템").trim() || "시스템";
  const note = params.note ? String(params.note).trim() : null;

  if (transferType === "LOAD_TO_VEHICLE" && (!toVehicleId || toVehicleId <= 0)) {
    throw new RentalMaintenanceValidationError("적재할 대상 정비차량을 선택하세요.");
  }
  if (transferType === "RETURN_TO_YARD" && (!fromVehicleId || fromVehicleId <= 0)) {
    throw new RentalMaintenanceValidationError("반납할 출발 정비차량을 선택하세요.");
  }
  if (transferType === "VEHICLE_TRANSFER") {
    if (!fromVehicleId || fromVehicleId <= 0 || !toVehicleId || toVehicleId <= 0) {
      throw new RentalMaintenanceValidationError("출발 차량과 도착 차량을 모두 선택하세요.");
    }
    if (fromVehicleId === toVehicleId) {
      throw new RentalMaintenanceValidationError("출발 차량과 도착 차량이 동일할 수 없습니다.");
    }
  }

  // Lock product row first
  const prodRes = await client.query<{
    id: string | number;
    name: string;
    current_stock: string | number | null;
  }>(
    `SELECT id, name, current_stock
     FROM erp_trade_products
     WHERE id = $1
     FOR UPDATE`,
    [productId]
  );
  if (prodRes.rows.length === 0) {
    throw new RentalMaintenanceValidationError(`부품 품목(ID: ${productId})을 찾을 수 없습니다.`, 404);
  }
  const prod = prodRes.rows[0];
  let yardStockAfter = Number(prod.current_stock || 0);
  let fromVehicleStockAfter: number | null = null;
  let toVehicleStockAfter: number | null = null;

  const lockVehicles = await lockVehicleRowsOrdered(
    client,
    [fromVehicleId || 0, toVehicleId || 0].filter((id) => id > 0)
  );

  // Also deterministically lock existing vehicle stock rows to avoid deadlocks
  const sortedVehIds = Array.from(
    new Set([fromVehicleId || 0, toVehicleId || 0].filter((id) => id > 0))
  ).sort((a, b) => a - b);
  const existingVehicleQty = new Map<number, number>();
  for (const vId of sortedVehIds) {
    const sRes = await client.query<{ current_qty: string | number }>(
      `SELECT current_qty FROM erp_vehicle_part_stocks WHERE vehicle_id = $1 AND product_id = $2 FOR UPDATE`,
      [vId, productId]
    );
    existingVehicleQty.set(vId, sRes.rows.length > 0 ? Number(sRes.rows[0].current_qty || 0) : 0);
  }

  let fromLocType: "YARD" | "VEHICLE" = "YARD";
  let toLocType: "YARD" | "VEHICLE" = "VEHICLE";

  if (transferType === "LOAD_TO_VEHICLE" && toVehicleId) {
    fromLocType = "YARD";
    toLocType = "VEHICLE";
    if (yardStockAfter < qty) {
      throw new RentalMaintenanceValidationError(
        `주기장 [${prod.name}] 재고가 부족합니다. (현재: ${yardStockAfter}, 요청: ${qty})`
      );
    }
    yardStockAfter = Math.round((yardStockAfter - qty) * 100) / 100;
    await client.query(
      `UPDATE erp_trade_products SET current_stock = $1, updated_at = NOW() WHERE id = $2`,
      [yardStockAfter, productId]
    );

    const prevToQty = existingVehicleQty.get(toVehicleId) || 0;
    toVehicleStockAfter = Math.round((prevToQty + qty) * 100) / 100;
    const explicitTarget =
      params.targetQty !== undefined && params.targetQty !== null && String(params.targetQty) !== ""
        ? Math.max(0, Math.round(cleanNumericValue(params.targetQty, 0) * 100) / 100)
        : null;

    await client.query(
      `INSERT INTO erp_vehicle_part_stocks (vehicle_id, product_id, current_qty, target_qty, updated_at)
       VALUES ($1, $2, $3, COALESCE($4, 0), NOW())
       ON CONFLICT (vehicle_id, product_id)
       DO UPDATE SET
         current_qty = EXCLUDED.current_qty,
         target_qty = CASE WHEN $4::numeric IS NOT NULL THEN $4::numeric ELSE erp_vehicle_part_stocks.target_qty END,
         updated_at = NOW()`,
      [toVehicleId, productId, toVehicleStockAfter, explicitTarget]
    );
  } else if (transferType === "RETURN_TO_YARD" && fromVehicleId) {
    fromLocType = "VEHICLE";
    toLocType = "YARD";
    const prevFromQty = existingVehicleQty.get(fromVehicleId) || 0;
    if (prevFromQty < qty) {
      const vNo = lockVehicles.get(fromVehicleId)?.vehicle_no || fromVehicleId;
      throw new RentalMaintenanceValidationError(
        `정비차량(${vNo}) [${prod.name}] 적재재고가 부족합니다. (현재: ${prevFromQty}, 요청: ${qty})`
      );
    }
    fromVehicleStockAfter = Math.round((prevFromQty - qty) * 100) / 100;
    await client.query(
      `UPDATE erp_vehicle_part_stocks
       SET current_qty = $1, updated_at = NOW()
       WHERE vehicle_id = $2 AND product_id = $3`,
      [fromVehicleStockAfter, fromVehicleId, productId]
    );

    yardStockAfter = Math.round((yardStockAfter + qty) * 100) / 100;
    await client.query(
      `UPDATE erp_trade_products SET current_stock = $1, updated_at = NOW() WHERE id = $2`,
      [yardStockAfter, productId]
    );
  } else if (transferType === "VEHICLE_TRANSFER" && fromVehicleId && toVehicleId) {
    fromLocType = "VEHICLE";
    toLocType = "VEHICLE";
    const prevFromQty = existingVehicleQty.get(fromVehicleId) || 0;
    if (prevFromQty < qty) {
      const vNo = lockVehicles.get(fromVehicleId)?.vehicle_no || fromVehicleId;
      throw new RentalMaintenanceValidationError(
        `출발 차량(${vNo}) [${prod.name}] 적재재고가 부족합니다. (현재: ${prevFromQty}, 요청: ${qty})`
      );
    }
    fromVehicleStockAfter = Math.round((prevFromQty - qty) * 100) / 100;
    await client.query(
      `UPDATE erp_vehicle_part_stocks
       SET current_qty = $1, updated_at = NOW()
       WHERE vehicle_id = $2 AND product_id = $3`,
      [fromVehicleStockAfter, fromVehicleId, productId]
    );

    const prevToQty = existingVehicleQty.get(toVehicleId) || 0;
    toVehicleStockAfter = Math.round((prevToQty + qty) * 100) / 100;
    await client.query(
      `INSERT INTO erp_vehicle_part_stocks (vehicle_id, product_id, current_qty, target_qty, updated_at)
       VALUES ($1, $2, $3, 0, NOW())
       ON CONFLICT (vehicle_id, product_id)
       DO UPDATE SET
         current_qty = EXCLUDED.current_qty,
         updated_at = NOW()`,
      [toVehicleId, productId, toVehicleStockAfter]
    );
  }

  const mvRes = await client.query<{ id: string | number }>(
    `INSERT INTO erp_part_stock_movements (
      movement_type, movement_date, product_id, qty,
      from_location_type, from_vehicle_id, to_location_type, to_vehicle_id,
      maintenance_id, asset_id, actor_name, note
    ) VALUES (
      $1, $2::date, $3, $4,
      $5, $6, $7, $8,
      NULL, NULL, $9, $10
    ) RETURNING id`,
    [
      transferType,
      movementDate,
      productId,
      qty,
      fromLocType,
      fromLocType === "VEHICLE" ? fromVehicleId : null,
      toLocType,
      toLocType === "VEHICLE" ? toVehicleId : null,
      actorName,
      note || prod.name,
    ]
  );

  return {
    movementId: Number(mvRes.rows[0].id),
    transferType,
    productId,
    qty,
    yardStockAfter,
    fromVehicleStockAfter,
    toVehicleStockAfter,
  };
}

export async function createRentalMaintenanceTx(
  client: PoolClient,
  params: {
    assetId: number;
    maintenanceDate?: string | null;
    maintenanceType: unknown;
    resultStatus?: unknown;
    operatingHours?: unknown;
    technicianEmployeeId?: number | null;
    technicianName?: string | null;
    vehicleId?: number | null;
    title: string;
    symptom?: string | null;
    workPerformed?: string | null;
    checklist?: unknown;
    resetComponentCodes?: string[] | null;
    partsUsed?: unknown;
    laborCost?: unknown;
    travelCost?: unknown;
    nextPmDueDate?: string | null;
    assetStatusAfter?: string | null;
    createdBy?: string | null;
  }
) {
  const assetId = Math.trunc(cleanNumericValue(params.assetId, 0));
  if (assetId <= 0) {
    throw new RentalMaintenanceValidationError("정비 대상 렌탈자산을 선택하세요.");
  }

  const title = String(params.title || "").trim();
  if (!title) {
    throw new RentalMaintenanceValidationError("정비 제목(작업명)을 입력하세요.");
  }

  const maintenanceType = normalizeMaintenanceType(params.maintenanceType);
  const resultStatus = normalizeMaintenanceResult(params.resultStatus || "COMPLETED");
  const maintenanceDate = normalizeIsoDate(params.maintenanceDate) || getKstTodayIso();
  const actorName = String(params.createdBy || params.technicianName || "담당자").trim() || "담당자";

  const assetRes = await client.query<{
    id: string | number;
    serial_no: string;
    model_name: string | null;
    status: string;
    current_customer: string | null;
    current_site: string | null;
    contract_no: string | null;
    operating_hours: string | number | null;
    pm_interval_days: string | number | null;
    last_pm_date: string | null;
    next_pm_due_date: string | null;
  }>(
    `SELECT a.id, a.serial_no, p.model_name, a.status, a.current_customer, a.current_site, a.contract_no,
            a.operating_hours, a.pm_interval_days, a.last_pm_date::text, a.next_pm_due_date::text
     FROM erp_rental_assets a
     LEFT JOIN erp_rental_products p ON p.id = a.rental_product_id
     WHERE a.id = $1
     FOR UPDATE OF a`,
    [assetId]
  );
  if (assetRes.rows.length === 0) {
    throw new RentalMaintenanceValidationError(`렌탈자산(ID: ${assetId})을 찾을 수 없습니다.`, 404);
  }
  const asset = assetRes.rows[0];
  const prevHours = Number(asset.operating_hours || 0);
  const inputHours =
    params.operatingHours !== undefined && params.operatingHours !== null && params.operatingHours !== ""
      ? Math.max(0, Math.round(cleanNumericValue(params.operatingHours, prevHours) * 10) / 10)
      : prevHours;
  const effectiveHours = Math.max(prevHours, inputHours);

  let technicianEmployeeId =
    params.technicianEmployeeId && Number(params.technicianEmployeeId) > 0
      ? Math.trunc(Number(params.technicianEmployeeId))
      : null;
  let technicianName = params.technicianName ? String(params.technicianName).trim() : null;
  if (technicianEmployeeId && !technicianName) {
    const empRes = await client.query<{ name: string }>(`SELECT name FROM erp_employees WHERE id = $1`, [
      technicianEmployeeId,
    ]);
    if (empRes.rows.length > 0) technicianName = empRes.rows[0].name;
    else technicianEmployeeId = null;
  }

  const vehicleId =
    params.vehicleId && Number(params.vehicleId) > 0 ? Math.trunc(Number(params.vehicleId)) : null;
  if (vehicleId) {
    await lockVehicleRowsOrdered(client, [vehicleId]);
  }

  const checklist: PmChecklistItem[] = normalizePmChecklist(params.checklist);
  const resetComponentCodes = Array.isArray(params.resetComponentCodes)
    ? Array.from(new Set(params.resetComponentCodes.map((c) => String(c || "").trim()).filter(Boolean)))
    : [];
  const partsUsed = normalizePartLinesInput(params.partsUsed);

  const laborCost = Math.max(0, Math.round(cleanNumericValue(params.laborCost, 0)));
  const travelCost = Math.max(0, Math.round(cleanNumericValue(params.travelCost, 0)));

  const pmInterval = clampPmIntervalDays(asset.pm_interval_days, DEFAULT_PM_INTERVAL_DAYS);
  const explicitNextPm = normalizeIsoDate(params.nextPmDueDate);
  const resolvedNextPmDueDate =
    explicitNextPm ||
    (maintenanceType === "PREVENTIVE" && resultStatus === "COMPLETED"
      ? addDaysIso(maintenanceDate, pmInterval)
      : normalizeIsoDate(asset.next_pm_due_date));

  const requestedStatusAfter = String(params.assetStatusAfter || "").trim().toUpperCase();
  const assetStatusBefore = asset.status;
  const assetStatusAfter =
    requestedStatusAfter === "AVAILABLE" ||
    requestedStatusAfter === "RENTED" ||
    requestedStatusAfter === "REPAIRING"
      ? requestedStatusAfter
      : assetStatusBefore;

  const dateCompact = maintenanceDate.replace(/-/g, "");
  const seqRes = await client.query<{ seq: string }>(`SELECT nextval(pg_get_serial_sequence('erp_rental_maintenances','id')) AS seq`);
  const nextIdSeq = Number(seqRes.rows[0].seq);
  const maintenanceNo = `MNT-${dateCompact}-${String(nextIdSeq).padStart(4, "0")}`;

  const insRes = await client.query<{ id: string | number; maintenance_no: string }>(
    `INSERT INTO erp_rental_maintenances (
      id, maintenance_no, asset_id, serial_no, model_name, customer_name, site_name, contract_no,
      maintenance_date, maintenance_type, result_status, operating_hours,
      technician_employee_id, technician_name, vehicle_id,
      title, symptom, work_performed, checklist_json, reset_component_codes,
      parts_cost, labor_cost, travel_cost, total_cost,
      next_pm_due_date, asset_status_before, asset_status_after, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9::date, $10, $11, $12,
      $13, $14, $15,
      $16, $17, $18, $19::jsonb, $20::jsonb,
      0, $21, $22, $23,
      $24::date, $25, $26, $27
    ) RETURNING id, maintenance_no`,
    [
      nextIdSeq,
      maintenanceNo,
      assetId,
      asset.serial_no,
      asset.model_name,
      asset.current_customer,
      asset.current_site,
      asset.contract_no,
      maintenanceDate,
      maintenanceType,
      resultStatus,
      effectiveHours,
      technicianEmployeeId,
      technicianName,
      vehicleId,
      title,
      params.symptom ? String(params.symptom).trim() : null,
      params.workPerformed ? String(params.workPerformed).trim() : null,
      JSON.stringify(checklist),
      JSON.stringify(resetComponentCodes),
      laborCost,
      travelCost,
      laborCost + travelCost,
      resolvedNextPmDueDate,
      assetStatusBefore,
      assetStatusAfter,
      actorName,
    ]
  );
  const maintenanceId = Number(insRes.rows[0].id);

  const { parts, partsCost } = await applyMaintenancePartsTx(client, {
    maintenanceId,
    assetId,
    movementDate: maintenanceDate,
    lines: partsUsed,
    actorName,
  });

  const totalCost = partsCost + laborCost + travelCost;
  await client.query(
    `UPDATE erp_rental_maintenances
     SET parts_cost = $1, total_cost = $2, updated_at = NOW()
     WHERE id = $3`,
    [partsCost, totalCost, maintenanceId]
  );

  // Update asset hours, PM schedule, and status (never clearing active contract fields)
  const shouldUpdatePmLast = maintenanceType === "PREVENTIVE" && resultStatus === "COMPLETED";
  const currentLastPm = normalizeIsoDate(asset.last_pm_date);
  const nextLastPmDate = shouldUpdatePmLast
    ? currentLastPm && currentLastPm > maintenanceDate
      ? currentLastPm
      : maintenanceDate
    : currentLastPm;

  await client.query(
    `UPDATE erp_rental_assets
     SET status = $1,
         operating_hours = GREATEST(COALESCE(operating_hours, 0), $2),
         last_pm_date = COALESCE($3::date, last_pm_date),
         last_pm_hours = CASE WHEN $4 THEN GREATEST(COALESCE(last_pm_hours, 0), $2) ELSE last_pm_hours END,
         next_pm_due_date = COALESCE($5::date, next_pm_due_date),
         last_hour_recorded_at = CASE WHEN $2 > COALESCE(operating_hours, 0) THEN NOW() ELSE last_hour_recorded_at END,
         updated_at = NOW()
     WHERE id = $6`,
    [assetStatusAfter, effectiveHours, nextLastPmDate, shouldUpdatePmLast, resolvedNextPmDueDate, assetId]
  );

  if (effectiveHours > prevHours) {
    await client.query(
      `INSERT INTO erp_asset_hour_logs (
        asset_id, recorded_date, previous_hours, recorded_hours, delta_hours,
        source_type, source_id, recorded_by, note
      ) VALUES (
        $1, $2::date, $3, $4, $5,
        'MAINTENANCE', $6, $7, $8
      )`,
      [
        assetId,
        maintenanceDate,
        prevHours,
        effectiveHours,
        Math.round((effectiveHours - prevHours) * 10) / 10,
        maintenanceId,
        actorName,
        `${maintenanceNo} ${title}`,
      ]
    );
    await syncWarrantyOperatingHoursTx(client, assetId, asset.serial_no, effectiveHours);
  }

  await applyWearComponentResetsTx(client, {
    assetId,
    componentCodes: resetComponentCodes,
    operatingHours: effectiveHours,
    resetDate: maintenanceDate,
  });

  return {
    id: maintenanceId,
    maintenanceNo,
    assetId,
    maintenanceDate,
    maintenanceType,
    resultStatus,
    operatingHours: effectiveHours,
    partsCost,
    laborCost,
    travelCost,
    totalCost,
    nextPmDueDate: resolvedNextPmDueDate,
    parts,
  };
}

export async function updateRentalMaintenanceTx(
  client: PoolClient,
  params: {
    id: number;
    maintenanceDate?: string | null;
    maintenanceType?: unknown;
    resultStatus?: unknown;
    operatingHours?: unknown;
    technicianEmployeeId?: number | null;
    technicianName?: string | null;
    vehicleId?: number | null;
    title?: string | null;
    symptom?: string | null;
    workPerformed?: string | null;
    checklist?: unknown;
    resetComponentCodes?: string[] | null;
    partsUsed?: unknown;
    laborCost?: unknown;
    travelCost?: unknown;
    nextPmDueDate?: string | null;
    assetStatusAfter?: string | null;
    updatedBy?: string | null;
  }
) {
  const id = Math.trunc(cleanNumericValue(params.id, 0));
  if (id <= 0) {
    throw new RentalMaintenanceValidationError("수정할 정비이력 ID가 필요합니다.");
  }

  const existingRes = await client.query<{
    id: string | number;
    maintenance_no: string;
    asset_id: string | number;
    maintenance_date: string;
    maintenance_type: string;
    result_status: string;
    operating_hours: string | number;
    technician_employee_id: string | number | null;
    technician_name: string | null;
    vehicle_id: string | number | null;
    title: string;
    symptom: string | null;
    work_performed: string | null;
    checklist_json: unknown;
    reset_component_codes: unknown;
    parts_cost: string | number;
    labor_cost: string | number;
    travel_cost: string | number;
    next_pm_due_date: string | null;
    asset_status_after: string | null;
  }>(
    `SELECT *, maintenance_date::text AS maintenance_date, next_pm_due_date::text AS next_pm_due_date
     FROM erp_rental_maintenances
     WHERE id = $1
     FOR UPDATE`,
    [id]
  );
  if (existingRes.rows.length === 0) {
    throw new RentalMaintenanceValidationError(`정비이력(ID: ${id})을 찾을 수 없습니다.`, 404);
  }
  const existing = existingRes.rows[0];
  const assetId = Number(existing.asset_id);

  const assetRes = await client.query<{
    id: string | number;
    serial_no: string;
    status: string;
    operating_hours: string | number | null;
    pm_interval_days: string | number | null;
    last_pm_date: string | null;
    next_pm_due_date: string | null;
  }>(
    `SELECT id, serial_no, status, operating_hours, pm_interval_days, last_pm_date::text, next_pm_due_date::text
     FROM erp_rental_assets
     WHERE id = $1
     FOR UPDATE`,
    [assetId]
  );
  const asset = assetRes.rows[0];
  const prevAssetHours = Number(asset.operating_hours || 0);

  const maintenanceDate = normalizeIsoDate(params.maintenanceDate) || normalizeIsoDate(existing.maintenance_date) || getKstTodayIso();
  const maintenanceType = params.maintenanceType
    ? normalizeMaintenanceType(params.maintenanceType)
    : (existing.maintenance_type as MaintenanceType);
  const resultStatus = params.resultStatus
    ? normalizeMaintenanceResult(params.resultStatus)
    : (existing.result_status as MaintenanceResultStatus);

  const rawHours =
    params.operatingHours !== undefined && params.operatingHours !== null && params.operatingHours !== ""
      ? Math.max(0, Math.round(cleanNumericValue(params.operatingHours, Number(existing.operating_hours || 0)) * 10) / 10)
      : Number(existing.operating_hours || 0);
  const effectiveHours = Math.max(prevAssetHours, rawHours);

  const title = params.title !== undefined ? String(params.title || "").trim() : existing.title;
  if (!title) {
    throw new RentalMaintenanceValidationError("정비 제목(작업명)은 비울 수 없습니다.");
  }

  let technicianEmployeeId =
    params.technicianEmployeeId !== undefined
      ? params.technicianEmployeeId && Number(params.technicianEmployeeId) > 0
        ? Math.trunc(Number(params.technicianEmployeeId))
        : null
      : existing.technician_employee_id
        ? Number(existing.technician_employee_id)
        : null;
  let technicianName =
    params.technicianName !== undefined
      ? params.technicianName
        ? String(params.technicianName).trim()
        : null
      : existing.technician_name;
  if (technicianEmployeeId && !technicianName) {
    const empRes = await client.query<{ name: string }>(`SELECT name FROM erp_employees WHERE id = $1`, [
      technicianEmployeeId,
    ]);
    if (empRes.rows.length > 0) technicianName = empRes.rows[0].name;
    else technicianEmployeeId = null;
  }

  const vehicleId =
    params.vehicleId !== undefined
      ? params.vehicleId && Number(params.vehicleId) > 0
        ? Math.trunc(Number(params.vehicleId))
        : null
      : existing.vehicle_id
        ? Number(existing.vehicle_id)
        : null;
  if (vehicleId) {
    await lockVehicleRowsOrdered(client, [vehicleId]);
  }

  const checklist =
    params.checklist !== undefined
      ? normalizePmChecklist(params.checklist)
      : normalizePmChecklist(existing.checklist_json);
  const resetComponentCodes =
    params.resetComponentCodes !== undefined
      ? Array.from(
          new Set((params.resetComponentCodes || []).map((c) => String(c || "").trim()).filter(Boolean))
        )
      : Array.isArray(existing.reset_component_codes)
        ? existing.reset_component_codes.map(String)
        : [];

  const laborCost =
    params.laborCost !== undefined
      ? Math.max(0, Math.round(cleanNumericValue(params.laborCost, 0)))
      : Math.max(0, Math.round(Number(existing.labor_cost || 0)));
  const travelCost =
    params.travelCost !== undefined
      ? Math.max(0, Math.round(cleanNumericValue(params.travelCost, 0)))
      : Math.max(0, Math.round(Number(existing.travel_cost || 0)));

  const actorName =
    String(params.updatedBy || technicianName || "담당자").trim() || "담당자";

  let partsCost = Math.max(0, Math.round(Number(existing.parts_cost || 0)));
  let updatedParts: MaintenancePartLineRecord[] = [];

  if (params.partsUsed !== undefined) {
    const normalizedLines = normalizePartLinesInput(params.partsUsed);
    await reverseMaintenancePartsTx(client, {
      maintenanceId: id,
      assetId,
      movementDate: maintenanceDate,
      actorName,
    });
    const applied = await applyMaintenancePartsTx(client, {
      maintenanceId: id,
      assetId,
      movementDate: maintenanceDate,
      lines: normalizedLines,
      actorName,
    });
    partsCost = applied.partsCost;
    updatedParts = applied.parts;
  } else {
    const keptRes = await client.query<{
      id: string | number;
      maintenance_id: string | number;
      product_id: string | number;
      sku_code: string;
      product_name: string;
      part_no: string | null;
      unit: string | null;
      qty: string | number;
      unit_cost: string | number;
      total_cost: string | number;
      source_type: PartStockSource;
      vehicle_id: string | number | null;
      note: string | null;
    }>(
      `SELECT p.*, v.vehicle_no
       FROM erp_rental_maintenance_parts p
       LEFT JOIN erp_service_vehicles v ON v.id = p.vehicle_id
       WHERE p.maintenance_id = $1
       ORDER BY p.id ASC`,
      [id]
    );
    updatedParts = keptRes.rows.map((r) => ({
      id: Number(r.id),
      maintenanceId: Number(r.maintenance_id),
      productId: Number(r.product_id),
      skuCode: r.sku_code,
      productName: r.product_name,
      partNo: r.part_no,
      unit: r.unit,
      qty: Number(r.qty),
      unitCost: Number(r.unit_cost),
      totalCost: Number(r.total_cost),
      sourceType: r.source_type,
      vehicleId: r.vehicle_id ? Number(r.vehicle_id) : null,
      note: r.note,
    }));
  }

  const totalCost = partsCost + laborCost + travelCost;
  const pmInterval = clampPmIntervalDays(asset.pm_interval_days, DEFAULT_PM_INTERVAL_DAYS);
  const resolvedNextPmDueDate =
    normalizeIsoDate(params.nextPmDueDate) ||
    normalizeIsoDate(existing.next_pm_due_date) ||
    (maintenanceType === "PREVENTIVE" && resultStatus === "COMPLETED"
      ? addDaysIso(maintenanceDate, pmInterval)
      : normalizeIsoDate(asset.next_pm_due_date));

  const requestedStatusAfter = String(params.assetStatusAfter || "").trim().toUpperCase();
  const assetStatusAfter =
    requestedStatusAfter === "AVAILABLE" ||
    requestedStatusAfter === "RENTED" ||
    requestedStatusAfter === "REPAIRING"
      ? requestedStatusAfter
      : existing.asset_status_after || asset.status;

  await client.query(
    `UPDATE erp_rental_maintenances
     SET maintenance_date = $1::date,
         maintenance_type = $2,
         result_status = $3,
         operating_hours = $4,
         technician_employee_id = $5,
         technician_name = $6,
         vehicle_id = $7,
         title = $8,
         symptom = $9,
         work_performed = $10,
         checklist_json = $11::jsonb,
         reset_component_codes = $12::jsonb,
         parts_cost = $13,
         labor_cost = $14,
         travel_cost = $15,
         total_cost = $16,
         next_pm_due_date = $17::date,
         asset_status_after = $18,
         updated_at = NOW()
     WHERE id = $19`,
    [
      maintenanceDate,
      maintenanceType,
      resultStatus,
      rawHours,
      technicianEmployeeId,
      technicianName,
      vehicleId,
      title,
      params.symptom !== undefined ? (params.symptom ? String(params.symptom).trim() : null) : existing.symptom,
      params.workPerformed !== undefined
        ? params.workPerformed
          ? String(params.workPerformed).trim()
          : null
        : existing.work_performed,
      JSON.stringify(checklist),
      JSON.stringify(resetComponentCodes),
      partsCost,
      laborCost,
      travelCost,
      totalCost,
      resolvedNextPmDueDate,
      assetStatusAfter,
      id,
    ]
  );

  const shouldUpdatePmLast = maintenanceType === "PREVENTIVE" && resultStatus === "COMPLETED";
  await client.query(
    `UPDATE erp_rental_assets
     SET status = $1,
         operating_hours = GREATEST(COALESCE(operating_hours, 0), $2),
         last_pm_date = CASE WHEN $3 THEN GREATEST(COALESCE(last_pm_date, $4::date), $4::date) ELSE last_pm_date END,
         last_pm_hours = CASE WHEN $3 THEN GREATEST(COALESCE(last_pm_hours, 0), $2) ELSE last_pm_hours END,
         next_pm_due_date = CASE WHEN $5::date IS NOT NULL THEN $5::date ELSE next_pm_due_date END,
         last_hour_recorded_at = CASE WHEN $2 > COALESCE(operating_hours, 0) THEN NOW() ELSE last_hour_recorded_at END,
         updated_at = NOW()
     WHERE id = $6`,
    [assetStatusAfter, effectiveHours, shouldUpdatePmLast, maintenanceDate, resolvedNextPmDueDate, assetId]
  );

  if (effectiveHours > prevAssetHours) {
    await client.query(
      `INSERT INTO erp_asset_hour_logs (
        asset_id, recorded_date, previous_hours, recorded_hours, delta_hours,
        source_type, source_id, recorded_by, note
      ) VALUES (
        $1, $2::date, $3, $4, $5,
        'MAINTENANCE', $6, $7, $8
      )`,
      [
        assetId,
        maintenanceDate,
        prevAssetHours,
        effectiveHours,
        Math.round((effectiveHours - prevAssetHours) * 10) / 10,
        id,
        actorName,
        `${existing.maintenance_no} 수정 가동시간 반영`,
      ]
    );
    await syncWarrantyOperatingHoursTx(client, assetId, asset.serial_no, effectiveHours);
  }

  if (resetComponentCodes.length > 0) {
    await applyWearComponentResetsTx(client, {
      assetId,
      componentCodes: resetComponentCodes,
      operatingHours: effectiveHours,
      resetDate: maintenanceDate,
    });
  }

  return {
    id,
    maintenanceNo: existing.maintenance_no,
    assetId,
    maintenanceDate,
    maintenanceType,
    resultStatus,
    operatingHours: rawHours,
    partsCost,
    laborCost,
    travelCost,
    totalCost,
    nextPmDueDate: resolvedNextPmDueDate,
    parts: updatedParts,
  };
}

export async function recordAssetOperatingHoursTx(
  client: PoolClient,
  params: {
    assetId: number;
    recordedHours: unknown;
    recordedDate?: string | null;
    recordedBy?: string | null;
    note?: string | null;
    sourceType?: "MANUAL" | "MAINTENANCE" | "INBOUND" | "WARRANTY";
    sourceId?: number | null;
  }
) {
  const assetId = Math.trunc(cleanNumericValue(params.assetId, 0));
  if (assetId <= 0) {
    throw new RentalMaintenanceValidationError("가동시간을 기록할 자산을 선택하세요.");
  }
  const recordedHours = Math.round(cleanNumericValue(params.recordedHours, -1) * 10) / 10;
  if (!Number.isFinite(recordedHours) || recordedHours < 0) {
    throw new RentalMaintenanceValidationError("유효한 가동시간(0 이상)을 입력하세요.");
  }

  const assetRes = await client.query<{
    id: string | number;
    serial_no: string;
    operating_hours: string | number | null;
  }>(
    `SELECT id, serial_no, operating_hours
     FROM erp_rental_assets
     WHERE id = $1
     FOR UPDATE`,
    [assetId]
  );
  if (assetRes.rows.length === 0) {
    throw new RentalMaintenanceValidationError(`렌탈자산(ID: ${assetId})을 찾을 수 없습니다.`, 404);
  }
  const asset = assetRes.rows[0];
  const prevHours = Number(asset.operating_hours || 0);
  if (recordedHours < prevHours) {
    throw new RentalMaintenanceValidationError(
      `입력한 가동시간(${recordedHours}h)은 기존 누적 가동시간(${prevHours}h)보다 작을 수 없습니다.`
    );
  }

  const recordedDate = normalizeIsoDate(params.recordedDate) || getKstTodayIso();
  const deltaHours = Math.round((recordedHours - prevHours) * 10) / 10;
  const sourceType = params.sourceType || "MANUAL";
  const recordedBy = String(params.recordedBy || "담당자").trim() || "담당자";

  await client.query(
    `UPDATE erp_rental_assets
     SET operating_hours = GREATEST(COALESCE(operating_hours, 0), $1),
         last_hour_recorded_at = NOW(),
         updated_at = NOW()
     WHERE id = $2`,
    [recordedHours, assetId]
  );

  await syncWarrantyOperatingHoursTx(client, assetId, asset.serial_no, recordedHours);

  const logRes = await client.query<{ id: string | number }>(
    `INSERT INTO erp_asset_hour_logs (
      asset_id, recorded_date, previous_hours, recorded_hours, delta_hours,
      source_type, source_id, recorded_by, note
    ) VALUES (
      $1, $2::date, $3, $4, $5,
      $6, $7, $8, $9
    ) RETURNING id`,
    [
      assetId,
      recordedDate,
      prevHours,
      recordedHours,
      deltaHours,
      sourceType,
      params.sourceId ?? null,
      recordedBy,
      params.note ? String(params.note).trim() : null,
    ]
  );

  const wearRes = await client.query<{
    component_code: string;
    component_name: string;
    interval_hours: string | number;
    last_replaced_hours: string | number;
    last_replaced_date: string | null;
    memo: string | null;
  }>(
    `SELECT component_code, component_name, interval_hours, last_replaced_hours,
            last_replaced_date::text, memo
     FROM erp_asset_wear_states
     WHERE asset_id = $1`,
    [assetId]
  );

  const savedStates: Partial<AssetWearConfigItem>[] = wearRes.rows.map((r) => ({
    componentCode: r.component_code,
    componentName: r.component_name,
    intervalHours: Number(r.interval_hours),
    lastReplacedHours: Number(r.last_replaced_hours),
    lastReplacedDate: normalizeIsoDate(r.last_replaced_date),
    memo: r.memo,
  }));

  return {
    logId: Number(logRes.rows[0].id),
    assetId,
    previousHours: prevHours,
    recordedHours,
    deltaHours,
    wearSummary: buildAssetWearSummary({ currentHours: recordedHours, savedStates }),
  };
}

export async function saveAssetWearConfigTx(
  client: PoolClient,
  params: {
    assetId: number;
    pmIntervalDays?: unknown;
    nextPmDueDate?: string | null;
    components: Array<{
      componentCode: string;
      componentName?: string;
      intervalHours: unknown;
      lastReplacedHours?: unknown;
      lastReplacedDate?: string | null;
      memo?: string | null;
    }>;
  }
) {
  const assetId = Math.trunc(cleanNumericValue(params.assetId, 0));
  if (assetId <= 0) {
    throw new RentalMaintenanceValidationError("대상 자산을 선택하세요.");
  }

  const assetRes = await client.query<{
    id: string | number;
    operating_hours: string | number | null;
    last_pm_date: string | null;
    outbound_date: string | null;
    pm_interval_days: string | number | null;
  }>(
    `SELECT id, operating_hours, last_pm_date::text, outbound_date::text, pm_interval_days
     FROM erp_rental_assets
     WHERE id = $1
     FOR UPDATE`,
    [assetId]
  );
  if (assetRes.rows.length === 0) {
    throw new RentalMaintenanceValidationError(`렌탈자산(ID: ${assetId})을 찾을 수 없습니다.`, 404);
  }
  const asset = assetRes.rows[0];
  const currentHours = Number(asset.operating_hours || 0);

  if (params.pmIntervalDays !== undefined || params.nextPmDueDate !== undefined) {
    const pmInterval = clampPmIntervalDays(
      params.pmIntervalDays ?? asset.pm_interval_days,
      DEFAULT_PM_INTERVAL_DAYS
    );
    const explicitDue = normalizeIsoDate(params.nextPmDueDate);
    const baseDate = normalizeIsoDate(asset.last_pm_date) || normalizeIsoDate(asset.outbound_date);
    const computedDue = explicitDue || (baseDate ? addDaysIso(baseDate, pmInterval) : null);

    await client.query(
      `UPDATE erp_rental_assets
       SET pm_interval_days = $1,
           next_pm_due_date = COALESCE($2::date, next_pm_due_date),
           updated_at = NOW()
       WHERE id = $3`,
      [pmInterval, computedDue, assetId]
    );
  }

  const defByCode = new Map(DEFAULT_WEAR_COMPONENTS.map((d) => [d.componentCode, d]));
  for (const item of params.components || []) {
    const code = String(item.componentCode || "").trim();
    if (!code) continue;
    const def = defByCode.get(code);
    const componentName = String(item.componentName || def?.componentName || code).trim();
    const intervalHours = Math.max(10, Math.round(cleanNumericValue(item.intervalHours, def?.defaultIntervalHours || 500)));
    const lastReplacedHours = Math.max(
      0,
      Math.round(cleanNumericValue(item.lastReplacedHours, 0) * 10) / 10
    );
    const lastReplacedDate = normalizeIsoDate(item.lastReplacedDate);
    const memo = item.memo ? String(item.memo).trim() : null;

    await client.query(
      `INSERT INTO erp_asset_wear_states (
        asset_id, component_code, component_name, interval_hours,
        last_replaced_hours, last_replaced_date, memo, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6::date, $7, NOW())
      ON CONFLICT (asset_id, component_code)
      DO UPDATE SET
        component_name = EXCLUDED.component_name,
        interval_hours = EXCLUDED.interval_hours,
        last_replaced_hours = EXCLUDED.last_replaced_hours,
        last_replaced_date = EXCLUDED.last_replaced_date,
        memo = EXCLUDED.memo,
        updated_at = NOW()`,
      [assetId, code, componentName, intervalHours, lastReplacedHours, lastReplacedDate, memo]
    );
  }

  const wearRes = await client.query<{
    component_code: string;
    component_name: string;
    interval_hours: string | number;
    last_replaced_hours: string | number;
    last_replaced_date: string | null;
    memo: string | null;
  }>(
    `SELECT component_code, component_name, interval_hours, last_replaced_hours,
            last_replaced_date::text, memo
     FROM erp_asset_wear_states
     WHERE asset_id = $1`,
    [assetId]
  );

  const savedStates: Partial<AssetWearConfigItem>[] = wearRes.rows.map((r) => ({
    componentCode: r.component_code,
    componentName: r.component_name,
    intervalHours: Number(r.interval_hours),
    lastReplacedHours: Number(r.last_replaced_hours),
    lastReplacedDate: normalizeIsoDate(r.last_replaced_date),
    memo: r.memo,
  }));

  return buildAssetWearSummary({ currentHours, savedStates });
}
