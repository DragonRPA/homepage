import type { PoolClient } from "pg";
import { getKstTodayIso } from "./forkliftDomain";
import {
  DEFAULT_PM_INTERVAL_DAYS,
  addDaysIso,
  clampPmIntervalDays,
  normalizeIsoDate,
  normalizePmChecklist,
  type MaintenancePartLineInput,
  type MaintenancePartLineRecord,
  type MaintenanceResultStatus,
  type MaintenanceType,
  type PartStockSource,
  type PmChecklistItem,
} from "./rentalMaintenanceDomain";
import { RentalMaintenanceValidationError, cleanNumericValue } from "./rentalMaintenanceSchema";
import { applyWearComponentResetsTx, syncWarrantyOperatingHoursTx } from "./rentalOperatingHoursTxService";
import {
  applyMaintenancePartsTx,
  lockVehicleRowsOrdered,
  reverseMaintenancePartsTx,
} from "./rentalMaintPartStockTx";

export interface CreateRentalMaintenanceParams {
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

export type UpdateRentalMaintenanceParams = Partial<
  Omit<CreateRentalMaintenanceParams, "assetId" | "createdBy">
> & {
  id: number;
  updatedBy?: string | null;
};

interface ExistingMaintRow {
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
}

interface KeptMaintPartRow {
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
}

export function normalizeMaintenanceType(raw: unknown): MaintenanceType {
  const val = String(raw || "PREVENTIVE").trim().toUpperCase();
  if (val === "PREVENTIVE" || val === "CORRECTIVE" || val === "EMERGENCY" || val === "OVERHAUL") {
    return val;
  }
  throw new RentalMaintenanceValidationError(`유효하지 않은 정비유형입니다: ${val}`);
}

export function normalizeMaintenanceResult(raw: unknown): MaintenanceResultStatus {
  const val = String(raw || "COMPLETED").trim().toUpperCase();
  if (val === "COMPLETED" || val === "FOLLOW_UP_REQUIRED") {
    return val;
  }
  throw new RentalMaintenanceValidationError(`유효하지 않은 정비결과 상태입니다: ${val}`);
}

export function normalizePartLinesInput(rawLines: unknown): MaintenancePartLineInput[] {
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
    const vehicleId =
      obj.vehicleId != null && obj.vehicleId !== ""
        ? Math.trunc(cleanNumericValue(obj.vehicleId, 0))
        : null;
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

async function resolveTechnicianTx(
  client: PoolClient,
  technicianEmployeeId: number | null,
  technicianName: string | null
): Promise<{ technicianEmployeeId: number | null; technicianName: string | null }> {
  if (technicianEmployeeId && !technicianName) {
    const empRes = await client.query<{ name: string }>(
      `SELECT name FROM erp_employees WHERE id = $1`,
      [technicianEmployeeId]
    );
    if (empRes.rows.length > 0) {
      return { technicianEmployeeId, technicianName: empRes.rows[0].name };
    }
    return { technicianEmployeeId: null, technicianName };
  }
  return { technicianEmployeeId, technicianName };
}

function resolveAssetStatusAfter(raw: string | null | undefined, fallback: string): string {
  const val = String(raw || "").trim().toUpperCase();
  return val === "AVAILABLE" || val === "RENTED" || val === "REPAIRING" ? val : fallback;
}

async function recordMaintenanceHourDeltaTx(
  client: PoolClient,
  params: {
    assetId: number;
    serialNo: string;
    recordedDate: string;
    prevHours: number;
    effectiveHours: number;
    maintenanceId: number;
    actorName: string;
    note: string;
  }
): Promise<void> {
  if (params.effectiveHours <= params.prevHours) return;
  await client.query(
    `INSERT INTO erp_asset_hour_logs (
      asset_id, recorded_date, previous_hours, recorded_hours, delta_hours,
      source_type, source_id, recorded_by, note
    ) VALUES ($1, $2::date, $3, $4, $5, 'MAINTENANCE', $6, $7, $8)`,
    [
      params.assetId, params.recordedDate, params.prevHours, params.effectiveHours,
      Math.round((params.effectiveHours - params.prevHours) * 10) / 10,
      params.maintenanceId, params.actorName, params.note,
    ]
  );
  await syncWarrantyOperatingHoursTx(client, params.assetId, params.serialNo, params.effectiveHours);
}

export async function createRentalMaintenanceTx(client: PoolClient, params: CreateRentalMaintenanceParams) {
  const assetId = Math.trunc(cleanNumericValue(params.assetId, 0));
  if (assetId <= 0) throw new RentalMaintenanceValidationError("정비 대상 렌탈자산을 선택하세요.");

  const title = String(params.title || "").trim();
  if (!title) throw new RentalMaintenanceValidationError("정비 제목(작업명)을 입력하세요.");

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

  const { technicianEmployeeId, technicianName } = await resolveTechnicianTx(
    client,
    params.technicianEmployeeId && Number(params.technicianEmployeeId) > 0
      ? Math.trunc(Number(params.technicianEmployeeId))
      : null,
    params.technicianName ? String(params.technicianName).trim() : null
  );

  const vehicleId = params.vehicleId && Number(params.vehicleId) > 0 ? Math.trunc(Number(params.vehicleId)) : null;
  if (vehicleId) await lockVehicleRowsOrdered(client, [vehicleId]);

  const checklist: PmChecklistItem[] = normalizePmChecklist(params.checklist);
  const resetComponentCodes = Array.isArray(params.resetComponentCodes)
    ? Array.from(new Set(params.resetComponentCodes.map((c) => String(c || "").trim()).filter(Boolean)))
    : [];
  const partsUsed = normalizePartLinesInput(params.partsUsed);
  const laborCost = Math.max(0, Math.round(cleanNumericValue(params.laborCost, 0)));
  const travelCost = Math.max(0, Math.round(cleanNumericValue(params.travelCost, 0)));

  const pmInterval = clampPmIntervalDays(asset.pm_interval_days, DEFAULT_PM_INTERVAL_DAYS);
  const resolvedNextPmDueDate =
    normalizeIsoDate(params.nextPmDueDate) ||
    (maintenanceType === "PREVENTIVE" && resultStatus === "COMPLETED"
      ? addDaysIso(maintenanceDate, pmInterval)
      : normalizeIsoDate(asset.next_pm_due_date));

  const assetStatusBefore = asset.status;
  const assetStatusAfter = resolveAssetStatusAfter(params.assetStatusAfter, assetStatusBefore);

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
      $1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10, $11, $12,
      $13, $14, $15, $16, $17, $18, $19::jsonb, $20::jsonb,
      0, $21, $22, $23, $24::date, $25, $26, $27
    ) RETURNING id, maintenance_no`,
    [
      nextIdSeq, maintenanceNo, assetId, asset.serial_no, asset.model_name,
      asset.current_customer, asset.current_site, asset.contract_no,
      maintenanceDate, maintenanceType, resultStatus, effectiveHours,
      technicianEmployeeId, technicianName, vehicleId, title,
      params.symptom ? String(params.symptom).trim() : null,
      params.workPerformed ? String(params.workPerformed).trim() : null,
      JSON.stringify(checklist), JSON.stringify(resetComponentCodes),
      laborCost, travelCost, laborCost + travelCost,
      resolvedNextPmDueDate, assetStatusBefore, assetStatusAfter, actorName,
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
  await client.query(`UPDATE erp_rental_maintenances SET parts_cost = $1, total_cost = $2, updated_at = NOW() WHERE id = $3`, [
    partsCost,
    totalCost,
    maintenanceId,
  ]);

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

  await recordMaintenanceHourDeltaTx(client, {
    assetId,
    serialNo: asset.serial_no,
    recordedDate: maintenanceDate,
    prevHours,
    effectiveHours,
    maintenanceId,
    actorName,
    note: `${maintenanceNo} ${title}`,
  });

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

export async function updateRentalMaintenanceTx(client: PoolClient, params: UpdateRentalMaintenanceParams) {
  const id = Math.trunc(cleanNumericValue(params.id, 0));
  if (id <= 0) throw new RentalMaintenanceValidationError("수정할 정비이력 ID가 필요합니다.");

  const existingRes = await client.query<ExistingMaintRow>(
    `SELECT *, maintenance_date::text AS maintenance_date, next_pm_due_date::text AS next_pm_due_date
     FROM erp_rental_maintenances WHERE id = $1 FOR UPDATE`,
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
     FROM erp_rental_assets WHERE id = $1 FOR UPDATE`,
    [assetId]
  );
  const asset = assetRes.rows[0];
  const prevAssetHours = Number(asset.operating_hours || 0);

  const maintenanceDate = normalizeIsoDate(params.maintenanceDate) || normalizeIsoDate(existing.maintenance_date) || getKstTodayIso();
  const maintenanceType = params.maintenanceType ? normalizeMaintenanceType(params.maintenanceType) : (existing.maintenance_type as MaintenanceType);
  const resultStatus = params.resultStatus ? normalizeMaintenanceResult(params.resultStatus) : (existing.result_status as MaintenanceResultStatus);

  const rawHours =
    params.operatingHours !== undefined && params.operatingHours !== null && params.operatingHours !== ""
      ? Math.max(0, Math.round(cleanNumericValue(params.operatingHours, Number(existing.operating_hours || 0)) * 10) / 10)
      : Number(existing.operating_hours || 0);
  const effectiveHours = Math.max(prevAssetHours, rawHours);

  const title = params.title !== undefined ? String(params.title || "").trim() : existing.title;
  if (!title) throw new RentalMaintenanceValidationError("정비 제목(작업명)은 비울 수 없습니다.");

  const rawTechId =
    params.technicianEmployeeId !== undefined
      ? params.technicianEmployeeId && Number(params.technicianEmployeeId) > 0
        ? Math.trunc(Number(params.technicianEmployeeId))
        : null
      : existing.technician_employee_id
        ? Number(existing.technician_employee_id)
        : null;
  const rawTechName =
    params.technicianName !== undefined ? (params.technicianName ? String(params.technicianName).trim() : null) : existing.technician_name;
  const { technicianEmployeeId, technicianName } = await resolveTechnicianTx(client, rawTechId, rawTechName);

  const vehicleId =
    params.vehicleId !== undefined
      ? params.vehicleId && Number(params.vehicleId) > 0
        ? Math.trunc(Number(params.vehicleId))
        : null
      : existing.vehicle_id
        ? Number(existing.vehicle_id)
        : null;
  if (vehicleId) await lockVehicleRowsOrdered(client, [vehicleId]);

  const checklist = params.checklist !== undefined ? normalizePmChecklist(params.checklist) : normalizePmChecklist(existing.checklist_json);
  const resetComponentCodes =
    params.resetComponentCodes !== undefined
      ? Array.from(new Set((params.resetComponentCodes || []).map((c) => String(c || "").trim()).filter(Boolean)))
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

  const actorName = String(params.updatedBy || technicianName || "담당자").trim() || "담당자";

  let partsCost = Math.max(0, Math.round(Number(existing.parts_cost || 0)));
  let updatedParts: MaintenancePartLineRecord[] = [];

  if (params.partsUsed !== undefined) {
    const normalizedLines = normalizePartLinesInput(params.partsUsed);
    await reverseMaintenancePartsTx(client, { maintenanceId: id, assetId, movementDate: maintenanceDate, actorName });
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
    const keptRes = await client.query<KeptMaintPartRow>(
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

  const assetStatusAfter = resolveAssetStatusAfter(params.assetStatusAfter, existing.asset_status_after || asset.status);

  await client.query(
    `UPDATE erp_rental_maintenances
     SET maintenance_date = $1::date, maintenance_type = $2, result_status = $3, operating_hours = $4,
         technician_employee_id = $5, technician_name = $6, vehicle_id = $7, title = $8, symptom = $9,
         work_performed = $10, checklist_json = $11::jsonb, reset_component_codes = $12::jsonb,
         parts_cost = $13, labor_cost = $14, travel_cost = $15, total_cost = $16,
         next_pm_due_date = $17::date, asset_status_after = $18, updated_at = NOW()
     WHERE id = $19`,
    [
      maintenanceDate, maintenanceType, resultStatus, rawHours, technicianEmployeeId, technicianName, vehicleId, title,
      params.symptom !== undefined ? (params.symptom ? String(params.symptom).trim() : null) : existing.symptom,
      params.workPerformed !== undefined ? (params.workPerformed ? String(params.workPerformed).trim() : null) : existing.work_performed,
      JSON.stringify(checklist), JSON.stringify(resetComponentCodes),
      partsCost, laborCost, travelCost, totalCost, resolvedNextPmDueDate, assetStatusAfter, id,
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

  await recordMaintenanceHourDeltaTx(client, {
    assetId,
    serialNo: asset.serial_no,
    recordedDate: maintenanceDate,
    prevHours: prevAssetHours,
    effectiveHours,
    maintenanceId: id,
    actorName,
    note: `${existing.maintenance_no} 수정 가동시간 반영`,
  });

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
