import { NextRequest, NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import {
  RentalMaintenanceValidationError,
  ensureRentalMaintenanceSchema,
  recordAssetOperatingHoursTx,
  saveAssetWearConfigTx,
} from "@/lib/rentalMaintenanceSchema";
import {
  buildAssetWearSummary,
  computePreventivePmSchedule,
  normalizeIsoDate,
  type AssetWearConfigItem,
} from "@/lib/rentalMaintenanceDomain";
import { getKstTodayIso } from "@/lib/forkliftDomain";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pool = getErpPool();
  try {
    await ensureRentalMaintenanceSchema(pool);

    const { searchParams } = new URL(req.url);
    const assetIdParam = Number(searchParams.get("assetId") || 0);
    const severityFilter = (searchParams.get("severity") || "ALL").trim().toUpperCase();
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const today = getKstTodayIso();

    const [assetsRes, wearRes, logsRes] = await Promise.all([
      pool.query(`
        SELECT
          a.id, a.serial_no, p.model_name, a.status,
          a.current_customer, a.current_site, a.contract_no,
          a.outbound_date::text AS outbound_date,
          a.operating_hours, a.pm_interval_days,
          a.last_pm_date::text AS last_pm_date,
          a.next_pm_due_date::text AS next_pm_due_date,
          a.last_hour_recorded_at
        FROM erp_rental_assets a
        LEFT JOIN erp_rental_products p ON p.id = a.rental_product_id
        WHERE COALESCE(a.status, 'AVAILABLE') <> 'DISPOSED'
        ORDER BY
          CASE a.status WHEN 'RENTED' THEN 0 WHEN 'REPAIRING' THEN 1 ELSE 2 END,
          a.operating_hours DESC,
          a.serial_no ASC
      `),
      pool.query(`
        SELECT
          asset_id, component_code, component_name, interval_hours,
          last_replaced_hours, last_replaced_date::text AS last_replaced_date, memo
        FROM erp_asset_wear_states
        ORDER BY asset_id ASC, component_code ASC
      `),
      assetIdParam > 0
        ? pool.query(
            `SELECT l.*, l.recorded_date::text AS recorded_date, a.serial_no, p.model_name
             FROM erp_asset_hour_logs l
             JOIN erp_rental_assets a ON a.id = l.asset_id
             LEFT JOIN erp_rental_products p ON p.id = a.rental_product_id
             WHERE l.asset_id = $1
             ORDER BY l.recorded_date DESC, l.id DESC
             LIMIT 100`,
            [assetIdParam]
          )
        : pool.query(
            `SELECT l.*, l.recorded_date::text AS recorded_date, a.serial_no, p.model_name
             FROM erp_asset_hour_logs l
             JOIN erp_rental_assets a ON a.id = l.asset_id
             LEFT JOIN erp_rental_products p ON p.id = a.rental_product_id
             ORDER BY l.recorded_date DESC, l.id DESC
             LIMIT 100`
          ),
    ]);

    const wearByAssetId = new Map<number, Partial<AssetWearConfigItem>[]>();
    for (const r of wearRes.rows) {
      const aid = Number(r.asset_id);
      const list = wearByAssetId.get(aid) || [];
      list.push({
        componentCode: r.component_code,
        componentName: r.component_name,
        intervalHours: Number(r.interval_hours || 0),
        lastReplacedHours: Number(r.last_replaced_hours || 0),
        lastReplacedDate: normalizeIsoDate(r.last_replaced_date),
        memo: r.memo,
      });
      wearByAssetId.set(aid, list);
    }

    const severityRank: Record<string, number> = { CRITICAL: 0, WARNING: 1, NORMAL: 2 };
    let criticalAssetsCount = 0;
    let warningAssetsCount = 0;

    const allComputed = assetsRes.rows.map((a) => {
      const aid = Number(a.id);
      const currentHours = Number(a.operating_hours || 0);
      const wearSummary = buildAssetWearSummary({
        currentHours,
        savedStates: wearByAssetId.get(aid) || [],
      });
      if (wearSummary.overallSeverity === "CRITICAL") criticalAssetsCount += 1;
      else if (wearSummary.overallSeverity === "WARNING") warningAssetsCount += 1;

      const pmSchedule = computePreventivePmSchedule({
        assetStatus: a.status,
        pmIntervalDays: Number(a.pm_interval_days || 30),
        lastPmDate: a.last_pm_date,
        nextPmDueDate: a.next_pm_due_date,
        outboundDate: a.outbound_date,
        today,
      });

      return {
        assetId: aid,
        serialNo: a.serial_no,
        modelName: a.model_name,
        status: a.status,
        currentCustomer: a.current_customer,
        currentSite: a.current_site,
        contractNo: a.contract_no,
        operatingHours: currentHours,
        lastHourRecordedAt: a.last_hour_recorded_at,
        pmSchedule,
        wearSummary,
      };
    });

    const filteredAssets = allComputed
      .filter((item) => {
        if (severityFilter && severityFilter !== "ALL" && item.wearSummary.overallSeverity !== severityFilter) {
          return false;
        }
        if (q) {
          const hay = `${item.serialNo} ${item.modelName || ""} ${item.currentCustomer || ""} ${item.currentSite || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const sr =
          (severityRank[a.wearSummary.overallSeverity] ?? 9) -
          (severityRank[b.wearSummary.overallSeverity] ?? 9);
        if (sr !== 0) return sr;
        if (b.wearSummary.maxWearPercent !== a.wearSummary.maxWearPercent) {
          return b.wearSummary.maxWearPercent - a.wearSummary.maxWearPercent;
        }
        return b.operatingHours - a.operatingHours;
      });

    const hourLogs = logsRes.rows.map((l) => ({
      id: Number(l.id),
      assetId: Number(l.asset_id),
      serialNo: l.serial_no,
      modelName: l.model_name,
      recordedDate: normalizeIsoDate(l.recorded_date) || "",
      previousHours: Number(l.previous_hours || 0),
      recordedHours: Number(l.recorded_hours || 0),
      deltaHours: Number(l.delta_hours || 0),
      sourceType: l.source_type,
      sourceId: l.source_id ? Number(l.source_id) : null,
      recordedBy: l.recorded_by,
      note: l.note,
      createdAt: l.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        assets: filteredAssets,
        hourLogs,
        summary: {
          totalAssets: allComputed.length,
          criticalAssetsCount,
          warningAssetsCount,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/erp/rental/operating-hours] error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "가동시간 및 부품열화 조회 실패" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const pool = getErpPool();
  const client = await pool.connect();
  try {
    const body = await req.json();
    const action = String(body.action || "RECORD_HOURS").trim().toUpperCase();

    await client.query("BEGIN");
    await ensureRentalMaintenanceSchema(client);

    if (action === "SAVE_WEAR_CONFIG") {
      const wearSummary = await saveAssetWearConfigTx(client, {
        assetId: body.assetId,
        pmIntervalDays: body.pmIntervalDays,
        nextPmDueDate: body.nextPmDueDate,
        components: body.components || [],
      });
      await client.query("COMMIT");
      return NextResponse.json({ success: true, data: { wearSummary } });
    }

    const result = await recordAssetOperatingHoursTx(client, {
      assetId: body.assetId,
      recordedHours: body.recordedHours,
      recordedDate: body.recordedDate,
      recordedBy: body.recordedBy,
      note: body.note,
      sourceType: "MANUAL",
    });
    await client.query("COMMIT");
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof RentalMaintenanceValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    console.error("[POST /api/erp/rental/operating-hours] error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "가동시간 처리 실패" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
