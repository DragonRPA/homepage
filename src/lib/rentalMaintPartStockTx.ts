import "server-only";
import type { PoolClient } from "pg";
import { getKstTodayIso } from "./forkliftDomain";
import {
  normalizeIsoDate,
  type MaintenancePartLineInput,
  type MaintenancePartLineRecord,
  type PartTransferType,
} from "./rentalMaintenanceDomain";
import { RentalMaintenanceValidationError, cleanNumericValue } from "./rentalMaintenanceSchema";

export interface ServiceVehicleLockRow {
  id: number;
  vehicle_no: string;
  vehicle_name: string;
}

export interface PartStockMovementInput {
  movementType: string;
  movementDate: string;
  productId: number;
  qty: number;
  fromLocationType: "YARD" | "VEHICLE" | "ASSET";
  fromVehicleId: number | null;
  toLocationType: "YARD" | "VEHICLE" | "ASSET";
  toVehicleId: number | null;
  maintenanceId: number | null;
  assetId: number | null;
  actorName: string;
  note: string;
}

export interface PartTransferInput {
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

export interface PartTransferResult {
  movementId: number;
  transferType: PartTransferType;
  productId: number;
  qty: number;
  yardStockAfter: number;
  fromVehicleStockAfter: number | null;
  toVehicleStockAfter: number | null;
}

interface ProductLockRow {
  id: string | number;
  sku_code: string;
  name: string;
  part_no: string | null;
  unit: string | null;
  standard_cost: string | number | null;
  current_stock: string | number | null;
}

interface PreparedPartInsert {
  productId: number;
  skuCode: string;
  productName: string;
  partNo: string | null;
  unit: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  sourceType: "YARD" | "VEHICLE";
  vehicleId: number | null;
  vehicleNo: string | null;
  note: string | null;
}

function roundQty2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function lockVehicleRowsOrdered(
  client: PoolClient,
  vehicleIds: number[]
): Promise<Map<number, ServiceVehicleLockRow>> {
  const uniqueIds = Array.from(new Set(vehicleIds.filter((id) => id > 0))).sort((a, b) => a - b);
  const map = new Map<number, ServiceVehicleLockRow>();
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

async function insertPartStockMovementsBatchTx(
  client: PoolClient,
  movements: PartStockMovementInput[]
): Promise<number[]> {
  if (movements.length === 0) return [];

  const movementTypes: string[] = [];
  const movementDates: string[] = [];
  const productIds: number[] = [];
  const qtys: number[] = [];
  const fromLocationTypes: string[] = [];
  const fromVehicleIds: Array<number | null> = [];
  const toLocationTypes: string[] = [];
  const toVehicleIds: Array<number | null> = [];
  const maintenanceIds: Array<number | null> = [];
  const assetIds: Array<number | null> = [];
  const actorNames: string[] = [];
  const notes: string[] = [];

  for (const m of movements) {
    movementTypes.push(m.movementType);
    movementDates.push(m.movementDate);
    productIds.push(m.productId);
    qtys.push(m.qty);
    fromLocationTypes.push(m.fromLocationType);
    fromVehicleIds.push(m.fromVehicleId);
    toLocationTypes.push(m.toLocationType);
    toVehicleIds.push(m.toVehicleId);
    maintenanceIds.push(m.maintenanceId);
    assetIds.push(m.assetId);
    actorNames.push(m.actorName);
    notes.push(m.note);
  }

  const mvRes = await client.query<{ id: string | number }>(
    `INSERT INTO erp_part_stock_movements (
      movement_type, movement_date, product_id, qty,
      from_location_type, from_vehicle_id, to_location_type, to_vehicle_id,
      maintenance_id, asset_id, actor_name, note
    )
    SELECT
      u.movement_type, u.movement_date, u.product_id, u.qty,
      u.from_location_type, u.from_vehicle_id, u.to_location_type, u.to_vehicle_id,
      u.maintenance_id, u.asset_id, u.actor_name, u.note
    FROM UNNEST(
      $1::text[],
      $2::date[],
      $3::bigint[],
      $4::numeric[],
      $5::text[],
      $6::bigint[],
      $7::text[],
      $8::bigint[],
      $9::bigint[],
      $10::bigint[],
      $11::text[],
      $12::text[]
    ) WITH ORDINALITY AS u(
      movement_type, movement_date, product_id, qty,
      from_location_type, from_vehicle_id, to_location_type, to_vehicle_id,
      maintenance_id, asset_id, actor_name, note, ord
    )
    ORDER BY u.ord ASC
    RETURNING id`,
    [
      movementTypes,
      movementDates,
      productIds,
      qtys,
      fromLocationTypes,
      fromVehicleIds,
      toLocationTypes,
      toVehicleIds,
      maintenanceIds,
      assetIds,
      actorNames,
      notes,
    ]
  );

  return mvRes.rows.map((r) => Number(r.id));
}

export async function insertPartStockMovementTx(
  client: PoolClient,
  params: PartStockMovementInput
): Promise<number> {
  const ids = await insertPartStockMovementsBatchTx(client, [params]);
  return ids[0];
}

async function lockProductRowsOrdered(
  client: PoolClient,
  lines: MaintenancePartLineInput[]
): Promise<Map<number, ProductLockRow>> {
  const uniqueProductIds = Array.from(new Set(lines.map((l) => l.productId))).sort((a, b) => a - b);
  const prodRes = await client.query<ProductLockRow>(
    `SELECT id, sku_code, name, part_no, unit, standard_cost, current_stock
     FROM erp_trade_products
     WHERE id = ANY($1::bigint[])
     ORDER BY id ASC
     FOR UPDATE`,
    [uniqueProductIds]
  );
  const productMap = new Map<number, ProductLockRow>();
  for (const row of prodRes.rows) {
    productMap.set(Number(row.id), row);
  }
  for (const line of lines) {
    if (!productMap.has(line.productId)) {
      throw new RentalMaintenanceValidationError(`부품 품목(ID: ${line.productId})을 찾을 수 없습니다.`, 404);
    }
  }
  return productMap;
}

async function lockVehicleStockPairsOrdered(
  client: PoolClient,
  lines: MaintenancePartLineInput[]
): Promise<Map<string, number>> {
  const pairMap = new Map<string, { vehicleId: number; productId: number }>();
  for (const line of lines) {
    if (line.sourceType !== "VEHICLE") continue;
    const vId = Number(line.vehicleId);
    if (!vId || vId <= 0) {
      throw new RentalMaintenanceValidationError("차량 재고 출고 시 정비차량을 선택해야 합니다.");
    }
    const key = `${vId}:${line.productId}`;
    if (!pairMap.has(key)) {
      pairMap.set(key, { vehicleId: vId, productId: line.productId });
    }
  }

  const vehicleStockMap = new Map<string, number>();
  if (pairMap.size === 0) return vehicleStockMap;

  const sortedPairs = Array.from(pairMap.values()).sort(
    (a, b) => a.vehicleId - b.vehicleId || a.productId - b.productId
  );
  const stockRes = await client.query<{
    id: string | number;
    vehicle_id: string | number;
    product_id: string | number;
    current_qty: string | number;
  }>(
    `SELECT id, vehicle_id, product_id, current_qty
     FROM erp_vehicle_part_stocks
     WHERE (vehicle_id, product_id) IN (
       SELECT u.v_id, u.p_id
       FROM UNNEST($1::bigint[], $2::bigint[]) AS u(v_id, p_id)
     )
     ORDER BY vehicle_id ASC, product_id ASC
     FOR UPDATE`,
    [sortedPairs.map((p) => p.vehicleId), sortedPairs.map((p) => p.productId)]
  );
  for (const row of stockRes.rows) {
    vehicleStockMap.set(`${Number(row.vehicle_id)}:${Number(row.product_id)}`, Number(row.current_qty || 0));
  }
  return vehicleStockMap;
}

async function insertMaintenancePartLinesBatchTx(
  client: PoolClient,
  maintenanceId: number,
  preparedParts: PreparedPartInsert[]
): Promise<MaintenancePartLineRecord[]> {
  if (preparedParts.length === 0) return [];

  const partInsertRes = await client.query<{ id: string | number }>(
    `INSERT INTO erp_rental_maintenance_parts (
      maintenance_id, product_id, sku_code, product_name, part_no, unit,
      qty, unit_cost, total_cost, source_type, vehicle_id, note
    )
    SELECT
      $1::bigint, u.product_id, u.sku_code, u.product_name, u.part_no, u.unit,
      u.qty, u.unit_cost, u.total_cost, u.source_type, u.vehicle_id, u.note
    FROM UNNEST(
      $2::bigint[],
      $3::text[],
      $4::text[],
      $5::text[],
      $6::text[],
      $7::numeric[],
      $8::numeric[],
      $9::numeric[],
      $10::text[],
      $11::bigint[],
      $12::text[]
    ) WITH ORDINALITY AS u(
      product_id, sku_code, product_name, part_no, unit,
      qty, unit_cost, total_cost, source_type, vehicle_id, note, ord
    )
    ORDER BY u.ord ASC
    RETURNING id`,
    [
      maintenanceId,
      preparedParts.map((p) => p.productId),
      preparedParts.map((p) => p.skuCode),
      preparedParts.map((p) => p.productName),
      preparedParts.map((p) => p.partNo),
      preparedParts.map((p) => p.unit),
      preparedParts.map((p) => p.qty),
      preparedParts.map((p) => p.unitCost),
      preparedParts.map((p) => p.totalCost),
      preparedParts.map((p) => p.sourceType),
      preparedParts.map((p) => p.vehicleId),
      preparedParts.map((p) => p.note),
    ]
  );

  return preparedParts.map((part, idx) => ({
    id: Number(partInsertRes.rows[idx].id),
    maintenanceId,
    productId: part.productId,
    skuCode: part.skuCode,
    productName: part.productName,
    partNo: part.partNo,
    unit: part.unit,
    qty: part.qty,
    unitCost: part.unitCost,
    totalCost: part.totalCost,
    sourceType: part.sourceType,
    vehicleId: part.vehicleId,
    vehicleNo: part.vehicleNo,
    note: part.note,
  }));
}

export async function applyMaintenancePartsTx(
  client: PoolClient,
  params: {
    maintenanceId: number;
    assetId: number;
    movementDate: string;
    lines: MaintenancePartLineInput[];
    actorName: string;
  }
): Promise<{ parts: MaintenancePartLineRecord[]; partsCost: number }> {
  if (params.lines.length === 0) return { parts: [], partsCost: 0 };

  const vehicleIds = params.lines
    .filter((l) => l.sourceType === "VEHICLE" && l.vehicleId)
    .map((l) => Number(l.vehicleId));
  const vehicleMap = await lockVehicleRowsOrdered(client, vehicleIds);
  const productMap = await lockProductRowsOrdered(client, params.lines);
  const vehicleStockMap = await lockVehicleStockPairsOrdered(client, params.lines);

  const yardReqMap = new Map<number, number>();
  const vehicleReqMap = new Map<string, { vehicleId: number; productId: number; qty: number }>();
  const movements: PartStockMovementInput[] = [];
  const preparedParts: PreparedPartInsert[] = [];
  let partsCost = 0;

  for (const line of params.lines) {
    const prod = productMap.get(line.productId)!;
    const resolvedUnitCost =
      line.unitCost !== null && line.unitCost !== undefined
        ? Math.max(0, Math.round(line.unitCost))
        : Math.max(0, Math.round(Number(prod.standard_cost || 0)));
    const totalCost = Math.round(line.qty * resolvedUnitCost);
    const unit = prod.unit || "EA";
    const note = line.note || null;
    const isVehicle = line.sourceType === "VEHICLE";
    const vId = isVehicle ? Number(line.vehicleId) : null;
    const vehicle = vId ? vehicleMap.get(vId) : undefined;

    if (isVehicle && vId) {
      const key = `${vId}:${line.productId}`;
      const prevReq = vehicleReqMap.get(key)?.qty || 0;
      vehicleReqMap.set(key, { vehicleId: vId, productId: line.productId, qty: roundQty2(prevReq + line.qty) });
    } else {
      yardReqMap.set(line.productId, roundQty2((yardReqMap.get(line.productId) || 0) + line.qty));
    }

    movements.push({
      movementType: "MAINTENANCE_CONSUME",
      movementDate: params.movementDate,
      productId: line.productId,
      qty: line.qty,
      fromLocationType: isVehicle ? "VEHICLE" : "YARD",
      fromVehicleId: vId,
      toLocationType: "ASSET",
      toVehicleId: null,
      maintenanceId: params.maintenanceId,
      assetId: params.assetId,
      actorName: params.actorName,
      note: note || (isVehicle ? `차량(${vehicle?.vehicle_no || vId}) 부품 사용 (${prod.name})` : `정비 부품 사용 (${prod.name})`),
    });

    preparedParts.push({
      productId: line.productId,
      skuCode: prod.sku_code,
      productName: prod.name,
      partNo: prod.part_no,
      unit,
      qty: line.qty,
      unitCost: resolvedUnitCost,
      totalCost,
      sourceType: line.sourceType,
      vehicleId: vId,
      vehicleNo: vehicle?.vehicle_no || null,
      note,
    });

    partsCost += totalCost;
  }

  for (const [productId, reqQty] of yardReqMap.entries()) {
    const prod = productMap.get(productId)!;
    const yardStock = Number(prod.current_stock || 0);
    if (yardStock < reqQty) {
      throw new RentalMaintenanceValidationError(
        `주기장 부품 [${prod.name}] 재고가 부족합니다. (현재: ${yardStock}, 요청: ${reqQty})`
      );
    }
  }

  for (const [key, req] of vehicleReqMap.entries()) {
    const prod = productMap.get(req.productId)!;
    const vehicle = vehicleMap.get(req.vehicleId);
    const currentVehicleQty = vehicleStockMap.get(key) ?? 0;
    if (currentVehicleQty < req.qty) {
      throw new RentalMaintenanceValidationError(
        `정비차량(${vehicle?.vehicle_no || req.vehicleId}) [${prod.name}] 적재재고가 부족합니다. (현재: ${currentVehicleQty}, 요청: ${req.qty})`
      );
    }
  }

  if (yardReqMap.size > 0) {
    const sortedYard = Array.from(yardReqMap.entries()).sort((a, b) => a[0] - b[0]);
    await client.query(
      `UPDATE erp_trade_products AS p
       SET current_stock = p.current_stock - u.qty,
           updated_at = NOW()
       FROM UNNEST($1::bigint[], $2::numeric[]) AS u(id, qty)
       WHERE p.id = u.id`,
      [sortedYard.map(([id]) => id), sortedYard.map(([, qty]) => qty)]
    );
  }

  if (vehicleReqMap.size > 0) {
    const sortedVeh = Array.from(vehicleReqMap.values()).sort(
      (a, b) => a.vehicleId - b.vehicleId || a.productId - b.productId
    );
    await client.query(
      `UPDATE erp_vehicle_part_stocks AS s
       SET current_qty = s.current_qty - u.qty,
           updated_at = NOW()
       FROM UNNEST($1::bigint[], $2::bigint[], $3::numeric[]) AS u(v_id, p_id, qty)
       WHERE s.vehicle_id = u.v_id AND s.product_id = u.p_id`,
      [sortedVeh.map((v) => v.vehicleId), sortedVeh.map((v) => v.productId), sortedVeh.map((v) => v.qty)]
    );
  }

  await insertPartStockMovementsBatchTx(client, movements);
  const insertedParts = await insertMaintenancePartLinesBatchTx(client, params.maintenanceId, preparedParts);

  return { parts: insertedParts, partsCost };
}

export async function reverseMaintenancePartsTx(
  client: PoolClient,
  params: { maintenanceId: number; assetId: number; movementDate: string; actorName: string }
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

  if (existingRes.rows.length === 0) return;

  const yardReturnMap = new Map<number, number>();
  const vehicleReturnMap = new Map<string, { vehicleId: number; productId: number; qty: number }>();
  const movements: PartStockMovementInput[] = [];

  for (const row of existingRes.rows) {
    const productId = Number(row.product_id);
    const qty = Number(row.qty || 0);
    if (qty <= 0) continue;

    if (row.source_type === "YARD") {
      yardReturnMap.set(productId, roundQty2((yardReturnMap.get(productId) || 0) + qty));
      movements.push({
        movementType: "MAINTENANCE_REVERSAL",
        movementDate: params.movementDate,
        productId,
        qty,
        fromLocationType: "ASSET",
        fromVehicleId: null,
        toLocationType: "YARD",
        toVehicleId: null,
        maintenanceId: params.maintenanceId,
        assetId: params.assetId,
        actorName: params.actorName,
        note: `정비수정 부품 환입 (${row.product_name})`,
      });
    } else if (row.source_type === "VEHICLE" && row.vehicle_id) {
      const vId = Number(row.vehicle_id);
      const key = `${vId}:${productId}`;
      const prevQty = vehicleReturnMap.get(key)?.qty || 0;
      vehicleReturnMap.set(key, { vehicleId: vId, productId, qty: roundQty2(prevQty + qty) });
      movements.push({
        movementType: "MAINTENANCE_REVERSAL",
        movementDate: params.movementDate,
        productId,
        qty,
        fromLocationType: "ASSET",
        fromVehicleId: null,
        toLocationType: "VEHICLE",
        toVehicleId: vId,
        maintenanceId: params.maintenanceId,
        assetId: params.assetId,
        actorName: params.actorName,
        note: `정비수정 차량재고 환입 (${row.product_name})`,
      });
    }
  }

  if (yardReturnMap.size > 0) {
    const sortedYard = Array.from(yardReturnMap.entries()).sort((a, b) => a[0] - b[0]);
    await client.query(
      `UPDATE erp_trade_products AS p
       SET current_stock = COALESCE(p.current_stock, 0) + u.qty,
           updated_at = NOW()
       FROM UNNEST($1::bigint[], $2::numeric[]) AS u(id, qty)
       WHERE p.id = u.id`,
      [sortedYard.map(([id]) => id), sortedYard.map(([, qty]) => qty)]
    );
  }

  if (vehicleReturnMap.size > 0) {
    const sortedVeh = Array.from(vehicleReturnMap.values()).sort(
      (a, b) => a.vehicleId - b.vehicleId || a.productId - b.productId
    );
    await client.query(
      `INSERT INTO erp_vehicle_part_stocks (vehicle_id, product_id, current_qty, target_qty, updated_at)
       SELECT u.v_id, u.p_id, u.qty, 0, NOW()
       FROM UNNEST($1::bigint[], $2::bigint[], $3::numeric[]) AS u(v_id, p_id, qty)
       ORDER BY u.v_id ASC, u.p_id ASC
       ON CONFLICT (vehicle_id, product_id)
       DO UPDATE SET current_qty = erp_vehicle_part_stocks.current_qty + EXCLUDED.current_qty, updated_at = NOW()`,
      [sortedVeh.map((v) => v.vehicleId), sortedVeh.map((v) => v.productId), sortedVeh.map((v) => v.qty)]
    );
  }

  await insertPartStockMovementsBatchTx(client, movements);
  await client.query(`DELETE FROM erp_rental_maintenance_parts WHERE maintenance_id = $1`, [params.maintenanceId]);
}

async function deductVehicleStockTx(
  client: PoolClient,
  params: { vehicleId: number; productId: number; productName: string; qty: number; prevQty: number; label: string }
): Promise<number> {
  if (params.prevQty < params.qty) {
    throw new RentalMaintenanceValidationError(
      `${params.label} [${params.productName}] 적재재고가 부족합니다. (현재: ${params.prevQty}, 요청: ${params.qty})`
    );
  }
  const nextQty = roundQty2(params.prevQty - params.qty);
  await client.query(
    `UPDATE erp_vehicle_part_stocks SET current_qty = $1, updated_at = NOW() WHERE vehicle_id = $2 AND product_id = $3`,
    [nextQty, params.vehicleId, params.productId]
  );
  return nextQty;
}

export async function executePartStockTransferTx(
  client: PoolClient,
  params: PartTransferInput
): Promise<PartTransferResult> {
  const transferType = String(params.transferType || "").trim().toUpperCase() as PartTransferType;
  if (transferType !== "LOAD_TO_VEHICLE" && transferType !== "RETURN_TO_YARD" && transferType !== "VEHICLE_TRANSFER") {
    throw new RentalMaintenanceValidationError(`유효하지 않은 부품 이동유형입니다: ${transferType}`);
  }

  const productId = Math.trunc(cleanNumericValue(params.productId, 0));
  const qty = roundQty2(cleanNumericValue(params.qty, 0));
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
  const prodRes = await client.query<{ id: string | number; name: string; current_stock: string | number | null }>(
    `SELECT id, name, current_stock FROM erp_trade_products WHERE id = $1 FOR UPDATE`,
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

  // Deterministically lock existing vehicle stock rows to avoid deadlocks
  const sortedVehIds = Array.from(new Set([fromVehicleId || 0, toVehicleId || 0].filter((id) => id > 0))).sort(
    (a, b) => a - b
  );
  const existingVehicleQty = new Map<number, number>();
  if (sortedVehIds.length > 0) {
    const sRes = await client.query<{ vehicle_id: string | number; current_qty: string | number }>(
      `SELECT vehicle_id, current_qty
       FROM erp_vehicle_part_stocks
       WHERE vehicle_id = ANY($1::bigint[]) AND product_id = $2
       ORDER BY vehicle_id ASC
       FOR UPDATE`,
      [sortedVehIds, productId]
    );
    for (const row of sRes.rows) {
      existingVehicleQty.set(Number(row.vehicle_id), Number(row.current_qty || 0));
    }
  }

  let fromLocType: "YARD" | "VEHICLE" = "YARD";
  let toLocType: "YARD" | "VEHICLE" = "VEHICLE";

  if (transferType === "LOAD_TO_VEHICLE" && toVehicleId) {
    fromLocType = "YARD";
    toLocType = "VEHICLE";
    if (yardStockAfter < qty) {
      throw new RentalMaintenanceValidationError(`주기장 [${prod.name}] 재고가 부족합니다. (현재: ${yardStockAfter}, 요청: ${qty})`);
    }
    yardStockAfter = roundQty2(yardStockAfter - qty);
    await client.query(`UPDATE erp_trade_products SET current_stock = $1, updated_at = NOW() WHERE id = $2`, [
      yardStockAfter,
      productId,
    ]);

    toVehicleStockAfter = roundQty2((existingVehicleQty.get(toVehicleId) || 0) + qty);
    const explicitTarget =
      params.targetQty !== undefined && params.targetQty !== null && String(params.targetQty) !== ""
        ? Math.max(0, roundQty2(cleanNumericValue(params.targetQty, 0)))
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
    const vNo = lockVehicles.get(fromVehicleId)?.vehicle_no || fromVehicleId;
    fromVehicleStockAfter = await deductVehicleStockTx(client, {
      vehicleId: fromVehicleId,
      productId,
      productName: prod.name,
      qty,
      prevQty: existingVehicleQty.get(fromVehicleId) || 0,
      label: `정비차량(${vNo})`,
    });
    yardStockAfter = roundQty2(yardStockAfter + qty);
    await client.query(`UPDATE erp_trade_products SET current_stock = $1, updated_at = NOW() WHERE id = $2`, [
      yardStockAfter,
      productId,
    ]);
  } else if (transferType === "VEHICLE_TRANSFER" && fromVehicleId && toVehicleId) {
    fromLocType = "VEHICLE";
    toLocType = "VEHICLE";
    const vNo = lockVehicles.get(fromVehicleId)?.vehicle_no || fromVehicleId;
    fromVehicleStockAfter = await deductVehicleStockTx(client, {
      vehicleId: fromVehicleId,
      productId,
      productName: prod.name,
      qty,
      prevQty: existingVehicleQty.get(fromVehicleId) || 0,
      label: `출발 차량(${vNo})`,
    });
    toVehicleStockAfter = roundQty2((existingVehicleQty.get(toVehicleId) || 0) + qty);
    await client.query(
      `INSERT INTO erp_vehicle_part_stocks (vehicle_id, product_id, current_qty, target_qty, updated_at)
       VALUES ($1, $2, $3, 0, NOW())
       ON CONFLICT (vehicle_id, product_id)
       DO UPDATE SET current_qty = EXCLUDED.current_qty, updated_at = NOW()`,
      [toVehicleId, productId, toVehicleStockAfter]
    );
  }

  const movementId = await insertPartStockMovementTx(client, {
    movementType: transferType,
    movementDate,
    productId,
    qty,
    fromLocationType: fromLocType,
    fromVehicleId: fromLocType === "VEHICLE" ? fromVehicleId : null,
    toLocationType: toLocType,
    toVehicleId: toLocType === "VEHICLE" ? toVehicleId : null,
    maintenanceId: null,
    assetId: null,
    actorName,
    note: note || prod.name,
  });

  return { movementId, transferType, productId, qty, yardStockAfter, fromVehicleStockAfter, toVehicleStockAfter };
}
