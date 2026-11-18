import { NextRequest, NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import {
  RentalMaintenanceValidationError,
  cleanNumericValue,
  ensureRentalMaintenanceSchema,
} from "@/lib/rentalMaintenanceSchema";
import { executePartStockTransferTx } from "@/lib/rentalMaintPartStockTx";
import { normalizeIsoDate } from "@/lib/rentalMaintenanceDomain";
import { getKstTodayIso } from "@/lib/forkliftDomain";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pool = getErpPool();
  try {
    await ensureRentalMaintenanceSchema(pool);

    const { searchParams } = new URL(req.url);
    const vehicleId = Number(searchParams.get("vehicleId") || 0);
    const productId = Number(searchParams.get("productId") || 0);
    const movementType = (searchParams.get("movementType") || "ALL").trim().toUpperCase();

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (vehicleId > 0) {
      params.push(vehicleId);
      const idx = `$${params.length}`;
      conditions.push(`(m.from_vehicle_id = ${idx} OR m.to_vehicle_id = ${idx})`);
    }
    if (productId > 0) {
      params.push(productId);
      conditions.push(`m.product_id = $${params.length}`);
    }
    if (movementType && movementType !== "ALL") {
      params.push(movementType);
      conditions.push(`m.movement_type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [movRes, fleetRes] = await Promise.all([
      pool.query(
        `SELECT
           m.id, m.movement_type, m.movement_date::text AS movement_date,
           m.product_id, tp.sku_code, tp.name AS product_name, tp.part_no, tp.unit,
           m.qty, m.from_location_type, m.from_vehicle_id, fv.vehicle_no AS from_vehicle_no,
           m.to_location_type, m.to_vehicle_id, tv.vehicle_no AS to_vehicle_no,
           m.maintenance_id, rm.maintenance_no, m.asset_id, ra.serial_no AS asset_serial_no,
           m.actor_name, m.note, m.created_at
         FROM erp_part_stock_movements m
         JOIN erp_trade_products tp ON tp.id = m.product_id
         LEFT JOIN erp_service_vehicles fv ON fv.id = m.from_vehicle_id
         LEFT JOIN erp_service_vehicles tv ON tv.id = m.to_vehicle_id
         LEFT JOIN erp_rental_maintenances rm ON rm.id = m.maintenance_id
         LEFT JOIN erp_rental_assets ra ON ra.id = m.asset_id
         ${whereClause}
         ORDER BY m.movement_date DESC, m.id DESC
         LIMIT 200`,
        params
      ),
      pool.query(`
        SELECT
          tp.id, tp.sku_code, tp.name, tp.item_class, tp.category, tp.part_no, tp.unit,
          tp.current_stock, tp.safety_stock, tp.standard_cost,
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
          tp.name ASC
      `),
    ]);

    const movements = movRes.rows.map((r) => ({
      id: Number(r.id),
      movementType: r.movement_type,
      movementDate: normalizeIsoDate(r.movement_date) || "",
      productId: Number(r.product_id),
      skuCode: r.sku_code,
      productName: r.product_name,
      partNo: r.part_no,
      unit: r.unit || "EA",
      qty: Number(r.qty || 0),
      fromLocationType: r.from_location_type,
      fromVehicleId: r.from_vehicle_id ? Number(r.from_vehicle_id) : null,
      fromVehicleNo: r.from_vehicle_no || null,
      toLocationType: r.to_location_type,
      toVehicleId: r.to_vehicle_id ? Number(r.to_vehicle_id) : null,
      toVehicleNo: r.to_vehicle_no || null,
      maintenanceId: r.maintenance_id ? Number(r.maintenance_id) : null,
      maintenanceNo: r.maintenance_no || null,
      assetId: r.asset_id ? Number(r.asset_id) : null,
      assetSerialNo: r.asset_serial_no || null,
      actorName: r.actor_name,
      note: r.note,
      createdAt: r.created_at,
    }));

    const fleetStockSummary = fleetRes.rows.map((r) => {
      const yardQty = Number(r.current_stock || 0);
      const vehicleQtySum = Number(r.vehicle_total_qty || 0);
      return {
        productId: Number(r.id),
        skuCode: r.sku_code,
        name: r.name,
        itemClass: r.item_class || "GENERAL",
        category: r.category,
        partNo: r.part_no,
        unit: r.unit || "EA",
        standardCost: Number(r.standard_cost || 0),
        safetyStock: Number(r.safety_stock || 0),
        yardQty,
        vehicleQtySum,
        totalFleetQty: Math.round((yardQty + vehicleQtySum) * 100) / 100,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        movements,
        fleetStockSummary,
      },
    });
  } catch (error) {
    console.error("[GET /api/erp/rental/vehicle-stocks] error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "차량 부품재고 이력 조회 실패" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const pool = getErpPool();
  const client = await pool.connect();
  try {
    const body = await req.json();
    const action = String(body.action || "TRANSFER").trim().toUpperCase();

    await client.query("BEGIN");
    await ensureRentalMaintenanceSchema(client);

    if (action === "SET_TARGET_QTY") {
      const vehicleId = Math.trunc(cleanNumericValue(body.vehicleId, 0));
      const productId = Math.trunc(cleanNumericValue(body.productId, 0));
      const targetQty = Math.max(0, Math.round(cleanNumericValue(body.targetQty, 0) * 100) / 100);
      if (vehicleId <= 0 || productId <= 0) {
        throw new RentalMaintenanceValidationError("정비차량과 부품 품목을 선택하세요.");
      }
      await client.query(
        `INSERT INTO erp_vehicle_part_stocks (vehicle_id, product_id, current_qty, target_qty, updated_at)
         VALUES ($1, $2, 0, $3, NOW())
         ON CONFLICT (vehicle_id, product_id)
         DO UPDATE SET target_qty = EXCLUDED.target_qty, updated_at = NOW()`,
        [vehicleId, productId, targetQty]
      );
      await client.query("COMMIT");
      return NextResponse.json({ success: true, data: { vehicleId, productId, targetQty } });
    }

    if (action === "YARD_STOCK_RECEIPT") {
      const productId = Math.trunc(cleanNumericValue(body.productId, 0));
      const qty = Math.round(cleanNumericValue(body.qty, 0) * 100) / 100;
      if (productId <= 0 || qty <= 0) {
        throw new RentalMaintenanceValidationError("입고할 부품 품목과 수량(0 초과)을 입력하세요.");
      }
      const movementDate = normalizeIsoDate(body.movementDate) || getKstTodayIso();
      const actorName = String(body.actorName || "담당자").trim() || "담당자";
      const prodRes = await client.query<{ id: string | number; name: string; current_stock: string | number }>(
        `SELECT id, name, current_stock FROM erp_trade_products WHERE id = $1 FOR UPDATE`,
        [productId]
      );
      if (prodRes.rows.length === 0) {
        throw new RentalMaintenanceValidationError("부품 품목을 찾을 수 없습니다.", 404);
      }
      const nextStock = Math.round((Number(prodRes.rows[0].current_stock || 0) + qty) * 100) / 100;
      await client.query(
        `UPDATE erp_trade_products SET current_stock = $1, updated_at = NOW() WHERE id = $2`,
        [nextStock, productId]
      );
      await client.query(
        `INSERT INTO erp_part_stock_movements (
          movement_type, movement_date, product_id, qty,
          from_location_type, from_vehicle_id, to_location_type, to_vehicle_id,
          actor_name, note
        ) VALUES (
          'YARD_RECEIPT', $1::date, $2, $3,
          'EXTERNAL', NULL, 'YARD', NULL,
          $4, $5
        )`,
        [
          movementDate,
          productId,
          qty,
          actorName,
          body.note ? String(body.note).trim() : `주기장 입고 (${prodRes.rows[0].name})`,
        ]
      );
      await client.query("COMMIT");
      return NextResponse.json({ success: true, data: { productId, qty, yardStockAfter: nextStock } });
    }

    const result = await executePartStockTransferTx(client, {
      transferType: body.transferType,
      productId: body.productId,
      qty: body.qty,
      movementDate: body.movementDate,
      fromVehicleId: body.fromVehicleId,
      toVehicleId: body.toVehicleId,
      targetQty: body.targetQty,
      actorName: body.actorName,
      note: body.note,
    });
    await client.query("COMMIT");
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof RentalMaintenanceValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    console.error("[POST /api/erp/rental/vehicle-stocks] error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "부품 이동 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
