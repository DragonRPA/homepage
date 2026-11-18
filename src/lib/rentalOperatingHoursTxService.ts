import type { PoolClient } from "pg";
import { getKstTodayIso } from "./forkliftDomain";
import {
  DEFAULT_PM_INTERVAL_DAYS,
  DEFAULT_WEAR_COMPONENTS,
  addDaysIso,
  buildAssetWearSummary,
  clampPmIntervalDays,
  normalizeIsoDate,
  type AssetWearConfigItem,
} from "./rentalMaintenanceDomain";
import {
  RentalMaintenanceValidationError,
  cleanNumericValue,
} from "./rentalMaintenanceSchema";

interface WearStateRow {
  component_code: string;
  component_name: string;
  interval_hours: string | number;
  last_replaced_hours: string | number;
  last_replaced_date: string | null;
  memo: string | null;
}

async function fetchAssetWearSummaryTx(
  client: PoolClient,
  assetId: number,
  currentHours: number
) {
  const wearRes = await client.query<WearStateRow>(
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

export async function syncWarrantyOperatingHoursTx(
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

export async function applyWearComponentResetsTx(
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
  const deduped = new Map<
    string,
    { assetId: number; componentCode: string; componentName: string; intervalHours: number }
  >();
  for (const code of uniqueCodes) {
    const def = defByCode.get(code);
    deduped.set(`${params.assetId}__${code}`, {
      assetId: params.assetId,
      componentCode: code,
      componentName: def ? def.componentName : code,
      intervalHours: def ? def.defaultIntervalHours : 500,
    });
  }
  if (deduped.size === 0) return;

  const rows = Array.from(deduped.values());
  await client.query(
    `INSERT INTO erp_asset_wear_states (
      asset_id, component_code, component_name, interval_hours,
      last_replaced_hours, last_replaced_date, updated_at
    )
    SELECT
      u.asset_id, u.component_code, u.component_name, u.interval_hours,
      $5::numeric, $6::date, NOW()
    FROM UNNEST($1::bigint[], $2::text[], $3::text[], $4::numeric[])
      AS u(asset_id, component_code, component_name, interval_hours)
    ON CONFLICT (asset_id, component_code)
    DO UPDATE SET
      last_replaced_hours = EXCLUDED.last_replaced_hours,
      last_replaced_date = EXCLUDED.last_replaced_date,
      updated_at = NOW()`,
    [
      rows.map((r) => r.assetId),
      rows.map((r) => r.componentCode),
      rows.map((r) => r.componentName),
      rows.map((r) => r.intervalHours),
      params.operatingHours,
      params.resetDate,
    ]
  );
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

  return {
    logId: Number(logRes.rows[0].id),
    assetId,
    previousHours: prevHours,
    recordedHours,
    deltaHours,
    wearSummary: await fetchAssetWearSummaryTx(client, assetId, recordedHours),
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
  const deduped = new Map<
    string,
    {
      assetId: number;
      componentCode: string;
      componentName: string;
      intervalHours: number;
      lastReplacedHours: number;
      lastReplacedDate: string | null;
      memo: string | null;
    }
  >();

  for (const item of params.components || []) {
    const code = String(item.componentCode || "").trim();
    if (!code) continue;
    const def = defByCode.get(code);
    deduped.set(`${assetId}__${code}`, {
      assetId,
      componentCode: code,
      componentName: String(item.componentName || def?.componentName || code).trim(),
      intervalHours: Math.max(10, Math.round(cleanNumericValue(item.intervalHours, def?.defaultIntervalHours || 500))),
      lastReplacedHours: Math.max(0, Math.round(cleanNumericValue(item.lastReplacedHours, 0) * 10) / 10),
      lastReplacedDate: normalizeIsoDate(item.lastReplacedDate),
      memo: item.memo ? String(item.memo).trim() : null,
    });
  }

  if (deduped.size > 0) {
    const rows = Array.from(deduped.values());
    await client.query(
      `INSERT INTO erp_asset_wear_states (
        asset_id, component_code, component_name, interval_hours,
        last_replaced_hours, last_replaced_date, memo, updated_at
      )
      SELECT
        u.asset_id, u.component_code, u.component_name, u.interval_hours,
        u.last_replaced_hours, u.last_replaced_date, u.memo, NOW()
      FROM UNNEST(
        $1::bigint[],
        $2::text[],
        $3::text[],
        $4::numeric[],
        $5::numeric[],
        $6::date[],
        $7::text[]
      ) AS u(
        asset_id, component_code, component_name, interval_hours,
        last_replaced_hours, last_replaced_date, memo
      )
      ON CONFLICT (asset_id, component_code)
      DO UPDATE SET
        component_name = EXCLUDED.component_name,
        interval_hours = EXCLUDED.interval_hours,
        last_replaced_hours = EXCLUDED.last_replaced_hours,
        last_replaced_date = EXCLUDED.last_replaced_date,
        memo = EXCLUDED.memo,
        updated_at = NOW()`,
      [
        rows.map((r) => r.assetId),
        rows.map((r) => r.componentCode),
        rows.map((r) => r.componentName),
        rows.map((r) => r.intervalHours),
        rows.map((r) => r.lastReplacedHours),
        rows.map((r) => r.lastReplacedDate),
        rows.map((r) => r.memo),
      ]
    );
  }

  return fetchAssetWearSummaryTx(client, assetId, currentHours);
}
