import "server-only";
import type { PoolClient } from "pg";

export interface ForkliftWarrantyUpsertInput {
  warrantyNo: string;
  chassisNo: string;
  sourceType: "RENTAL_ASSET" | "SALE";
  sourceId: number | null;
  assetId: number | null;
  productId: number | null;
  modelName: string;
  manufacturer: string;
  partnerId: number | null;
  customerName: string;
  siteName: string;
  deliveryDate: string;
  warrantyStartDate: string;
  warrantyMonths: number;
  warrantyEndDate: string;
  warrantyHours: number;
  currentOperatingHours: number;
  attachedOptionsJson: string;
  status: string;
  memo: string;
}

/**
 * 지게차 차대번호별 보증카드 일괄 UPSERT 트랜잭션 SSOT
 * - RENTAL_ASSET(자산취득) 및 SALE(유통판매) 양 경로의 ON CONFLICT 병합 규칙을 단일 UNNEST SQL로 통합한다.
 */
export async function upsertForkliftWarrantiesBatchTx(
  client: PoolClient,
  items: ForkliftWarrantyUpsertInput[]
): Promise<void> {
  if (items.length === 0) return;

  const dedupedByChassis = new Map<string, ForkliftWarrantyUpsertInput>();
  for (const item of items) {
    const normalizedChassis = String(item.chassisNo || "").trim().toUpperCase();
    if (!normalizedChassis) continue;
    dedupedByChassis.set(normalizedChassis, {
      ...item,
      chassisNo: normalizedChassis,
    });
  }

  const rows = Array.from(dedupedByChassis.values());
  if (rows.length === 0) return;

  await client.query(
    `
    INSERT INTO erp_forklift_warranties (
      warranty_no,
      chassis_no,
      source_type,
      source_id,
      asset_id,
      product_id,
      model_name,
      manufacturer,
      partner_id,
      customer_name,
      site_name,
      delivery_date,
      warranty_start_date,
      warranty_months,
      warranty_end_date,
      warranty_hours,
      current_operating_hours,
      attached_options,
      status,
      memo
    )
    SELECT
      u.warranty_no,
      u.chassis_no,
      u.source_type,
      u.source_id,
      u.asset_id,
      u.product_id,
      u.model_name,
      u.manufacturer,
      u.partner_id,
      u.customer_name,
      u.site_name,
      u.delivery_date,
      u.warranty_start_date,
      u.warranty_months,
      u.warranty_end_date,
      u.warranty_hours,
      u.current_operating_hours,
      u.attached_options::jsonb,
      u.status,
      u.memo
    FROM UNNEST(
      $1::varchar[],
      $2::varchar[],
      $3::varchar[],
      $4::bigint[],
      $5::bigint[],
      $6::bigint[],
      $7::varchar[],
      $8::varchar[],
      $9::bigint[],
      $10::varchar[],
      $11::varchar[],
      $12::date[],
      $13::date[],
      $14::int[],
      $15::date[],
      $16::int[],
      $17::numeric[],
      $18::text[],
      $19::varchar[],
      $20::text[]
    ) AS u(
      warranty_no,
      chassis_no,
      source_type,
      source_id,
      asset_id,
      product_id,
      model_name,
      manufacturer,
      partner_id,
      customer_name,
      site_name,
      delivery_date,
      warranty_start_date,
      warranty_months,
      warranty_end_date,
      warranty_hours,
      current_operating_hours,
      attached_options,
      status,
      memo
    )
    ON CONFLICT (chassis_no) DO UPDATE SET
      source_type = CASE
        WHEN EXCLUDED.source_type = 'SALE' THEN 'SALE'
        ELSE erp_forklift_warranties.source_type
      END,
      source_id = CASE
        WHEN EXCLUDED.source_type = 'SALE' THEN EXCLUDED.source_id
        ELSE erp_forklift_warranties.source_id
      END,
      asset_id = CASE
        WHEN EXCLUDED.source_type = 'RENTAL_ASSET' THEN EXCLUDED.asset_id
        ELSE erp_forklift_warranties.asset_id
      END,
      product_id = CASE
        WHEN EXCLUDED.source_type = 'SALE' THEN EXCLUDED.product_id
        ELSE erp_forklift_warranties.product_id
      END,
      model_name = CASE
        WHEN EXCLUDED.source_type = 'SALE' THEN EXCLUDED.model_name
        ELSE erp_forklift_warranties.model_name
      END,
      manufacturer = CASE
        WHEN EXCLUDED.source_type = 'SALE' AND EXCLUDED.manufacturer <> '' THEN EXCLUDED.manufacturer
        ELSE erp_forklift_warranties.manufacturer
      END,
      partner_id = CASE
        WHEN EXCLUDED.source_type = 'SALE' THEN EXCLUDED.partner_id
        ELSE erp_forklift_warranties.partner_id
      END,
      customer_name = CASE
        WHEN EXCLUDED.source_type = 'SALE' THEN EXCLUDED.customer_name
        ELSE erp_forklift_warranties.customer_name
      END,
      site_name = CASE
        WHEN EXCLUDED.source_type = 'SALE' THEN EXCLUDED.site_name
        ELSE erp_forklift_warranties.site_name
      END,
      delivery_date = CASE
        WHEN EXCLUDED.source_type = 'SALE' THEN EXCLUDED.delivery_date
        ELSE erp_forklift_warranties.delivery_date
      END,
      warranty_start_date = EXCLUDED.warranty_start_date,
      warranty_months = CASE
        WHEN EXCLUDED.source_type = 'SALE' THEN EXCLUDED.warranty_months
        ELSE erp_forklift_warranties.warranty_months
      END,
      warranty_end_date = EXCLUDED.warranty_end_date,
      warranty_hours = EXCLUDED.warranty_hours,
      current_operating_hours = CASE
        WHEN EXCLUDED.source_type = 'RENTAL_ASSET' THEN
          GREATEST(erp_forklift_warranties.current_operating_hours, EXCLUDED.current_operating_hours)
        ELSE erp_forklift_warranties.current_operating_hours
      END,
      attached_options = EXCLUDED.attached_options,
      status = EXCLUDED.status,
      updated_at = NOW()
    `,
    [
      rows.map((r) => r.warrantyNo),
      rows.map((r) => r.chassisNo),
      rows.map((r) => r.sourceType),
      rows.map((r) => r.sourceId),
      rows.map((r) => r.assetId),
      rows.map((r) => r.productId),
      rows.map((r) => r.modelName),
      rows.map((r) => r.manufacturer),
      rows.map((r) => r.partnerId),
      rows.map((r) => r.customerName),
      rows.map((r) => r.siteName),
      rows.map((r) => r.deliveryDate),
      rows.map((r) => r.warrantyStartDate),
      rows.map((r) => r.warrantyMonths),
      rows.map((r) => r.warrantyEndDate),
      rows.map((r) => r.warrantyHours),
      rows.map((r) => r.currentOperatingHours),
      rows.map((r) => r.attachedOptionsJson),
      rows.map((r) => r.status),
      rows.map((r) => r.memo),
    ]
  );
}
