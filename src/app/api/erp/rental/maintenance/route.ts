import { NextRequest, NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import {
  RentalMaintenanceValidationError,
  ensureRentalMaintenanceSchema,
} from "@/lib/rentalMaintenanceSchema";
import {
  createRentalMaintenanceTx,
  updateRentalMaintenanceTx,
} from "@/lib/rentalMaintenanceTxService";
import {
  computePreventivePmSchedule,
  normalizeIsoDate,
  normalizePmChecklist,
  type MaintenancePartLineRecord,
} from "@/lib/rentalMaintenanceDomain";
import { getKstTodayIso } from "@/lib/forkliftDomain";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pool = getErpPool();
  try {
    await ensureRentalMaintenanceSchema(pool);

    const { searchParams } = new URL(req.url);
    const assetIdParam = searchParams.get("assetId");
    const typeFilter = (searchParams.get("type") || "ALL").trim().toUpperCase();
    const resultFilter = (searchParams.get("resultStatus") || "ALL").trim().toUpperCase();
    const pmStatusFilter = (searchParams.get("pmStatus") || "ALL").trim().toUpperCase();
    const startDate = normalizeIsoDate(searchParams.get("startDate"));
    const endDate = normalizeIsoDate(searchParams.get("endDate"));
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const today = getKstTodayIso();

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (assetIdParam && Number(assetIdParam) > 0) {
      params.push(Number(assetIdParam));
      conditions.push(`m.asset_id = $${params.length}`);
    }
    if (typeFilter && typeFilter !== "ALL") {
      params.push(typeFilter);
      conditions.push(`m.maintenance_type = $${params.length}`);
    }
    if (resultFilter && resultFilter !== "ALL") {
      params.push(resultFilter);
      conditions.push(`m.result_status = $${params.length}`);
    }
    if (startDate) {
      params.push(startDate);
      conditions.push(`m.maintenance_date >= $${params.length}::date`);
    }
    if (endDate) {
      params.push(endDate);
      conditions.push(`m.maintenance_date <= $${params.length}::date`);
    }
    if (q) {
      params.push(`%${q}%`);
      const pIdx = `$${params.length}`;
      conditions.push(`(
        LOWER(COALESCE(m.maintenance_no, '')) LIKE ${pIdx}
        OR LOWER(COALESCE(m.serial_no, '')) LIKE ${pIdx}
        OR LOWER(COALESCE(m.model_name, '')) LIKE ${pIdx}
        OR LOWER(COALESCE(m.customer_name, '')) LIKE ${pIdx}
        OR LOWER(COALESCE(m.site_name, '')) LIKE ${pIdx}
        OR LOWER(COALESCE(m.title, '')) LIKE ${pIdx}
        OR LOWER(COALESCE(m.technician_name, '')) LIKE ${pIdx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const maintRes = await pool.query(
      `SELECT
         m.id, m.maintenance_no, m.asset_id, m.serial_no, m.model_name,
         m.customer_name, m.site_name, m.contract_no,
         m.maintenance_date::text AS maintenance_date,
         m.maintenance_type, m.result_status, m.operating_hours,
         m.technician_employee_id, m.technician_name, m.vehicle_id,
         v.vehicle_no, v.vehicle_name,
         m.title, m.symptom, m.work_performed,
         m.checklist_json, m.reset_component_codes,
         m.parts_cost, m.labor_cost, m.travel_cost, m.total_cost,
         m.next_pm_due_date::text AS next_pm_due_date,
         m.asset_status_before, m.asset_status_after,
         m.created_by, m.created_at, m.updated_at
       FROM erp_rental_maintenances m
       LEFT JOIN erp_service_vehicles v ON v.id = m.vehicle_id
       ${whereClause}
       ORDER BY m.maintenance_date DESC, m.id DESC
       LIMIT 300`,
      params
    );

    const maintenanceIds = maintRes.rows.map((r) => Number(r.id));
    const partsByMaintId = new Map<number, MaintenancePartLineRecord[]>();

    if (maintenanceIds.length > 0) {
      const partsRes = await pool.query(
        `SELECT p.*, v.vehicle_no
         FROM erp_rental_maintenance_parts p
         LEFT JOIN erp_service_vehicles v ON v.id = p.vehicle_id
         WHERE p.maintenance_id = ANY($1::bigint[])
         ORDER BY p.id ASC`,
        [maintenanceIds]
      );
      for (const r of partsRes.rows) {
        const mid = Number(r.maintenance_id);
        const list = partsByMaintId.get(mid) || [];
        list.push({
          id: Number(r.id),
          maintenanceId: mid,
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
          vehicleNo: r.vehicle_no || null,
          note: r.note,
        });
        partsByMaintId.set(mid, list);
      }
    }

    const maintenances = maintRes.rows.map((r) => ({
      id: Number(r.id),
      maintenanceNo: r.maintenance_no,
      assetId: Number(r.asset_id),
      serialNo: r.serial_no,
      modelName: r.model_name,
      customerName: r.customer_name,
      siteName: r.site_name,
      contractNo: r.contract_no,
      maintenanceDate: normalizeIsoDate(r.maintenance_date) || "",
      maintenanceType: r.maintenance_type,
      resultStatus: r.result_status,
      operatingHours: Number(r.operating_hours || 0),
      technicianEmployeeId: r.technician_employee_id ? Number(r.technician_employee_id) : null,
      technicianName: r.technician_name,
      vehicleId: r.vehicle_id ? Number(r.vehicle_id) : null,
      vehicleNo: r.vehicle_no || null,
      vehicleName: r.vehicle_name || null,
      title: r.title,
      symptom: r.symptom,
      workPerformed: r.work_performed,
      checklist: normalizePmChecklist(r.checklist_json),
      resetComponentCodes: Array.isArray(r.reset_component_codes)
        ? r.reset_component_codes.map(String)
        : [],
      partsCost: Number(r.parts_cost || 0),
      laborCost: Number(r.labor_cost || 0),
      travelCost: Number(r.travel_cost || 0),
      totalCost: Number(r.total_cost || 0),
      nextPmDueDate: normalizeIsoDate(r.next_pm_due_date),
      assetStatusBefore: r.asset_status_before,
      assetStatusAfter: r.asset_status_after,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      parts: partsByMaintId.get(Number(r.id)) || [],
    }));

    const [assetsRes, employeesRes, vehiclesRes, vehicleStocksRes, partsCatalogRes, pmCountRes] =
      await Promise.all([
        pool.query(`
          SELECT
            a.id, a.serial_no, p.model_name, a.status,
            a.current_customer, a.current_site, a.contract_no,
            a.outbound_date::text AS outbound_date,
            a.operating_hours, a.pm_interval_days,
            a.last_pm_date::text AS last_pm_date,
            a.last_pm_hours,
            a.next_pm_due_date::text AS next_pm_due_date,
            a.last_hour_recorded_at,
            p.category, p.manufacturer AS brand
          FROM erp_rental_assets a
          LEFT JOIN erp_rental_products p ON p.id = a.rental_product_id
          ORDER BY
            CASE a.status WHEN 'RENTED' THEN 0 WHEN 'REPAIRING' THEN 1 WHEN 'AVAILABLE' THEN 2 ELSE 3 END,
            a.serial_no ASC
        `),
        pool.query(`
          SELECT id, employee_no, name, position, department, phone, employment_status
          FROM erp_employees
          WHERE COALESCE(employment_status, '재직') NOT IN ('퇴사', 'RETIRED')
          ORDER BY name ASC, id ASC
        `),
        pool.query(`
          SELECT v.*
          FROM erp_service_vehicles v
          ORDER BY CASE WHEN v.status = 'ACTIVE' THEN 0 ELSE 1 END, v.vehicle_no ASC
        `),
        pool.query(`
          SELECT
            s.id, s.vehicle_id, s.product_id, s.current_qty, s.target_qty, s.updated_at,
            tp.sku_code, tp.name AS product_name, tp.part_no, tp.unit, tp.standard_cost
          FROM erp_vehicle_part_stocks s
          JOIN erp_trade_products tp ON tp.id = s.product_id
          WHERE s.current_qty > 0 OR s.target_qty > 0
          ORDER BY tp.name ASC
        `),
        pool.query(`
          SELECT
            tp.id, tp.sku_code, tp.name, tp.item_class, tp.category, tp.part_no,
            tp.spec, tp.unit, tp.standard_cost, tp.standard_price,
            tp.safety_stock, tp.current_stock, tp.manufacturer, tp.status,
            COALESCE(vs.vehicle_total_qty, 0) AS vehicle_total_qty
          FROM erp_trade_products tp
          LEFT JOIN (
            SELECT product_id, SUM(current_qty) AS vehicle_total_qty
            FROM erp_vehicle_part_stocks
            GROUP BY product_id
          ) vs ON vs.product_id = tp.id
          WHERE COALESCE(tp.status, 'ACTIVE') <> 'INACTIVE'
          ORDER BY
            CASE WHEN tp.item_class = 'PART' THEN 0 ELSE 1 END,
            tp.name ASC,
            tp.id DESC
        `),
        pool.query(`
          SELECT asset_id, COUNT(*)::int AS pm_count
          FROM erp_rental_maintenances
          WHERE maintenance_type = 'PREVENTIVE'
          GROUP BY asset_id
        `),
      ]);

    const pmCountMap = new Map<number, number>();
    for (const r of pmCountRes.rows) {
      pmCountMap.set(Number(r.asset_id), Number(r.pm_count || 0));
    }

    const assets = assetsRes.rows.map((a) => ({
      id: Number(a.id),
      serialNo: a.serial_no,
      modelName: a.model_name,
      category: a.category,
      brand: a.brand,
      status: a.status,
      currentCustomer: a.current_customer,
      currentSite: a.current_site,
      contractNo: a.contract_no,
      outboundDate: normalizeIsoDate(a.outbound_date),
      operatingHours: Number(a.operating_hours || 0),
      pmIntervalDays: Number(a.pm_interval_days || 30),
      lastPmDate: normalizeIsoDate(a.last_pm_date),
      lastPmHours: Number(a.last_pm_hours || 0),
      nextPmDueDate: normalizeIsoDate(a.next_pm_due_date),
      lastHourRecordedAt: a.last_hour_recorded_at,
    }));

    const pmRank: Record<string, number> = { OVERDUE: 0, DUE_SOON: 1, ON_TRACK: 2, STANDBY: 3 };
    let pmOverdueCount = 0;
    let pmDueSoonCount = 0;
    let pmOnTrackCount = 0;

    const allPmSchedules = assets
      .filter((a) => a.status !== "DISPOSED")
      .map((a) => {
        const sched = computePreventivePmSchedule({
          assetStatus: a.status,
          pmIntervalDays: a.pmIntervalDays,
          lastPmDate: a.lastPmDate,
          nextPmDueDate: a.nextPmDueDate,
          outboundDate: a.outboundDate,
          today,
        });
        if (sched.pmStatus === "OVERDUE") pmOverdueCount += 1;
        else if (sched.pmStatus === "DUE_SOON") pmDueSoonCount += 1;
        else if (sched.pmStatus === "ON_TRACK") pmOnTrackCount += 1;

        return {
          assetId: a.id,
          serialNo: a.serialNo,
          modelName: a.modelName,
          assetStatus: a.status,
          currentCustomer: a.currentCustomer,
          currentSite: a.currentSite,
          contractNo: a.contractNo,
          outboundDate: a.outboundDate,
          operatingHours: a.operatingHours,
          lastPmHours: a.lastPmHours,
          pmCount: pmCountMap.get(a.id) || 0,
          ...sched,
        };
      })
      .sort((a, b) => {
        const rankDiff = (pmRank[a.pmStatus] ?? 9) - (pmRank[b.pmStatus] ?? 9);
        if (rankDiff !== 0) return rankDiff;
        const da = a.daysUntilDue ?? 99999;
        const db = b.daysUntilDue ?? 99999;
        if (da !== db) return da - db;
        return a.serialNo.localeCompare(b.serialNo);
      });

    const pmSchedules = allPmSchedules.filter((item) => {
      if (pmStatusFilter && pmStatusFilter !== "ALL" && item.pmStatus !== pmStatusFilter) {
        return false;
      }
      if (q) {
        const hay = `${item.serialNo} ${item.modelName || ""} ${item.currentCustomer || ""} ${item.currentSite || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const stocksByVehicleId = new Map<
      number,
      Array<{
        id: number;
        productId: number;
        skuCode: string;
        productName: string;
        partNo: string | null;
        unit: string;
        currentQty: number;
        targetQty: number;
        standardCost: number;
      }>
    >();

    for (const s of vehicleStocksRes.rows) {
      const vId = Number(s.vehicle_id);
      const list = stocksByVehicleId.get(vId) || [];
      list.push({
        id: Number(s.id),
        productId: Number(s.product_id),
        skuCode: s.sku_code,
        productName: s.product_name,
        partNo: s.part_no,
        unit: s.unit || "EA",
        currentQty: Number(s.current_qty || 0),
        targetQty: Number(s.target_qty || 0),
        standardCost: Number(s.standard_cost || 0),
      });
      stocksByVehicleId.set(vId, list);
    }

    const vehicles = vehiclesRes.rows.map((v) => ({
      id: Number(v.id),
      vehicleNo: v.vehicle_no,
      vehicleName: v.vehicle_name,
      driverEmployeeId: v.driver_employee_id ? Number(v.driver_employee_id) : null,
      driverName: v.driver_name,
      driverPhone: v.driver_phone,
      region: v.region,
      status: v.status,
      memo: v.memo,
      stocks: stocksByVehicleId.get(Number(v.id)) || [],
    }));

    const partsCatalog = partsCatalogRes.rows.map((p) => {
      const yardStock = Number(p.current_stock || 0);
      const vehicleTotalStock = Number(p.vehicle_total_qty || 0);
      return {
        id: Number(p.id),
        skuCode: p.sku_code,
        name: p.name,
        itemClass: p.item_class || "GENERAL",
        category: p.category,
        partNo: p.part_no,
        spec: p.spec,
        unit: p.unit || "EA",
        standardCost: Number(p.standard_cost || 0),
        standardPrice: Number(p.standard_price || 0),
        safetyStock: Number(p.safety_stock || 0),
        currentStock: yardStock,
        vehicleTotalStock,
        totalFleetStock: Math.round((yardStock + vehicleTotalStock) * 100) / 100,
        manufacturer: p.manufacturer,
        status: p.status,
      };
    });

    const employees = employeesRes.rows.map((e) => ({
      id: Number(e.id),
      employeeNo: e.employee_no,
      name: e.name,
      position: e.position,
      department: e.department,
      phone: e.phone,
    }));

    const preventiveCount = maintenances.filter((m) => m.maintenanceType === "PREVENTIVE").length;
    const correctiveCount = maintenances.filter((m) => m.maintenanceType !== "PREVENTIVE").length;
    const partsCostSum = maintenances.reduce((acc, m) => acc + Number(m.partsCost || 0), 0);
    const totalCostSum = maintenances.reduce((acc, m) => acc + Number(m.totalCost || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        maintenances,
        pmSchedules,
        assets,
        employees,
        vehicles,
        partsCatalog,
        summary: {
          totalMaintenances: maintenances.length,
          preventiveCount,
          correctiveCount,
          partsCostSum,
          totalCostSum,
          pmOverdueCount,
          pmDueSoonCount,
          pmOnTrackCount,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/erp/rental/maintenance] error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "정비이력 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const pool = getErpPool();
  const client = await pool.connect();
  try {
    const body = await req.json();
    await client.query("BEGIN");
    await ensureRentalMaintenanceSchema(client);
    const created = await createRentalMaintenanceTx(client, body);
    await client.query("COMMIT");
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof RentalMaintenanceValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    console.error("[POST /api/erp/rental/maintenance] error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "정비이력 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest) {
  const pool = getErpPool();
  const client = await pool.connect();
  try {
    const body = await req.json();
    await client.query("BEGIN");
    await ensureRentalMaintenanceSchema(client);
    const updated = await updateRentalMaintenanceTx(client, body);
    await client.query("COMMIT");
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof RentalMaintenanceValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    console.error("[PUT /api/erp/rental/maintenance] error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "정비이력 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
