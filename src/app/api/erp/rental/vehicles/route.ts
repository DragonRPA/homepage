import { NextRequest, NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import {
  cleanNumericValue,
  ensureRentalMaintenanceSchema,
} from "@/lib/rentalMaintenanceSchema";

export const dynamic = "force-dynamic";

export async function GET() {
  const pool = getErpPool();
  try {
    await ensureRentalMaintenanceSchema(pool);

    const [vehiclesRes, stocksRes] = await Promise.all([
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
        ORDER BY tp.name ASC
      `),
    ]);

    const stocksByVehicle = new Map<number, unknown[]>();
    for (const s of stocksRes.rows) {
      const vId = Number(s.vehicle_id);
      const arr = stocksByVehicle.get(vId) || [];
      arr.push({
        id: Number(s.id),
        productId: Number(s.product_id),
        skuCode: s.sku_code,
        productName: s.product_name,
        partNo: s.part_no,
        unit: s.unit || "EA",
        currentQty: Number(s.current_qty || 0),
        targetQty: Number(s.target_qty || 0),
        standardCost: Number(s.standard_cost || 0),
        updatedAt: s.updated_at,
      });
      stocksByVehicle.set(vId, arr);
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
      stocks: stocksByVehicle.get(Number(v.id)) || [],
    }));

    return NextResponse.json({ success: true, data: vehicles });
  } catch (error) {
    console.error("[GET /api/erp/rental/vehicles] error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "정비차량 조회 실패" },
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

    if (String(body.action || "").toUpperCase() === "QUICK_CREATE_PART") {
      const name = String(body.name || "").trim();
      if (!name) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, message: "부품 품목명을 입력하세요." }, { status: 400 });
      }
      const partNo = body.partNo ? String(body.partNo).trim() : null;
      const category = String(body.category || "소모품·필터").trim() || "소모품·필터";
      const spec = body.spec ? String(body.spec).trim() : null;
      const unit = String(body.unit || "EA").trim() || "EA";
      const manufacturer = body.manufacturer ? String(body.manufacturer).trim() : null;
      const standardCost = Math.max(0, Math.round(cleanNumericValue(body.standardCost, 0)));
      const standardPrice = Math.max(
        0,
        Math.round(cleanNumericValue(body.standardPrice, standardCost))
      );
      const safetyStock = Math.max(0, Math.round(cleanNumericValue(body.safetyStock, 0) * 100) / 100);
      const currentStock = Math.max(0, Math.round(cleanNumericValue(body.currentStock, 0) * 100) / 100);

      let skuCode = body.skuCode ? String(body.skuCode).trim().toUpperCase() : "";
      if (!skuCode) {
        const yyyymm = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 7).replace("-", "");
        const seqRes = await client.query<{ seq: string }>(
          `SELECT nextval(pg_get_serial_sequence('erp_trade_products','id')) AS seq`
        );
        skuCode = `PRT-${yyyymm}-${String(seqRes.rows[0].seq).padStart(4, "0")}`;
      }

      const dupRes = await client.query(`SELECT id FROM erp_trade_products WHERE sku_code = $1`, [skuCode]);
      if (dupRes.rows.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { success: false, message: `이미 등록된 품목코드(${skuCode})입니다.` },
          { status: 409 }
        );
      }

      const insRes = await client.query(
        `INSERT INTO erp_trade_products (
          sku_code, name, item_class, category, part_no, spec, unit,
          standard_cost, standard_price, safety_stock, current_stock,
          manufacturer, status, memo, updated_at
        ) VALUES (
          $1, $2, 'PART', $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, 'ACTIVE', $12, NOW()
        ) RETURNING *`,
        [
          skuCode,
          name,
          category,
          partNo,
          spec,
          unit,
          standardCost,
          standardPrice,
          safetyStock,
          currentStock,
          manufacturer,
          body.memo ? String(body.memo).trim() : null,
        ]
      );
      await client.query("COMMIT");
      const r = insRes.rows[0];
      return NextResponse.json(
        {
          success: true,
          data: {
            id: Number(r.id),
            skuCode: r.sku_code,
            name: r.name,
            itemClass: r.item_class,
            category: r.category,
            partNo: r.part_no,
            spec: r.spec,
            unit: r.unit,
            standardCost: Number(r.standard_cost || 0),
            standardPrice: Number(r.standard_price || 0),
            safetyStock: Number(r.safety_stock || 0),
            currentStock: Number(r.current_stock || 0),
            vehicleTotalStock: 0,
            totalFleetStock: Number(r.current_stock || 0),
            manufacturer: r.manufacturer,
            status: r.status,
          },
        },
        { status: 201 }
      );
    }

    const vehicleNo = String(body.vehicleNo || "").trim();
    const vehicleName = String(body.vehicleName || "").trim();
    if (!vehicleNo || !vehicleName) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: "차량번호와 차량명칭을 모두 입력하세요." },
        { status: 400 }
      );
    }

    const dupVeh = await client.query(
      `SELECT id FROM erp_service_vehicles WHERE LOWER(TRIM(vehicle_no)) = LOWER(TRIM($1))`,
      [vehicleNo]
    );
    if (dupVeh.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: `이미 등록된 차량번호(${vehicleNo})입니다.` },
        { status: 409 }
      );
    }

    let driverEmployeeId =
      body.driverEmployeeId && Number(body.driverEmployeeId) > 0
        ? Math.trunc(Number(body.driverEmployeeId))
        : null;
    let driverName = body.driverName ? String(body.driverName).trim() : null;
    let driverPhone = body.driverPhone ? String(body.driverPhone).trim() : null;

    if (driverEmployeeId) {
      const empRes = await client.query<{ name: string; phone: string | null }>(
        `SELECT name, phone FROM erp_employees WHERE id = $1`,
        [driverEmployeeId]
      );
      if (empRes.rows.length > 0) {
        if (!driverName) driverName = empRes.rows[0].name;
        if (!driverPhone) driverPhone = empRes.rows[0].phone || null;
      } else {
        driverEmployeeId = null;
      }
    }

    const status = String(body.status || "ACTIVE").trim().toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    const insRes = await client.query(
      `INSERT INTO erp_service_vehicles (
        vehicle_no, vehicle_name, driver_employee_id, driver_name, driver_phone,
        region, status, memo, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        vehicleNo,
        vehicleName,
        driverEmployeeId,
        driverName,
        driverPhone,
        body.region ? String(body.region).trim() : null,
        status,
        body.memo ? String(body.memo).trim() : null,
      ]
    );

    await client.query("COMMIT");
    const v = insRes.rows[0];
    return NextResponse.json(
      {
        success: true,
        data: {
          id: Number(v.id),
          vehicleNo: v.vehicle_no,
          vehicleName: v.vehicle_name,
          driverEmployeeId: v.driver_employee_id ? Number(v.driver_employee_id) : null,
          driverName: v.driver_name,
          driverPhone: v.driver_phone,
          region: v.region,
          status: v.status,
          memo: v.memo,
          stocks: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("[POST /api/erp/rental/vehicles] error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "정비차량 등록 실패" },
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
    const id = Math.trunc(cleanNumericValue(body.id, 0));
    if (id <= 0) {
      return NextResponse.json({ success: false, message: "수정할 정비차량 ID가 필요합니다." }, { status: 400 });
    }

    await client.query("BEGIN");
    await ensureRentalMaintenanceSchema(client);

    const existingRes = await client.query(`SELECT * FROM erp_service_vehicles WHERE id = $1 FOR UPDATE`, [id]);
    if (existingRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, message: "정비차량을 찾을 수 없습니다." }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    const vehicleNo = String(body.vehicleNo ?? existing.vehicle_no).trim();
    const vehicleName = String(body.vehicleName ?? existing.vehicle_name).trim();
    if (!vehicleNo || !vehicleName) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: "차량번호와 차량명칭을 모두 입력하세요." },
        { status: 400 }
      );
    }

    const dupVeh = await client.query(
      `SELECT id FROM erp_service_vehicles WHERE LOWER(TRIM(vehicle_no)) = LOWER(TRIM($1)) AND id <> $2`,
      [vehicleNo, id]
    );
    if (dupVeh.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: `이미 등록된 차량번호(${vehicleNo})입니다.` },
        { status: 409 }
      );
    }

    let driverEmployeeId =
      body.driverEmployeeId !== undefined
        ? body.driverEmployeeId && Number(body.driverEmployeeId) > 0
          ? Math.trunc(Number(body.driverEmployeeId))
          : null
        : existing.driver_employee_id
          ? Number(existing.driver_employee_id)
          : null;
    let driverName =
      body.driverName !== undefined
        ? body.driverName
          ? String(body.driverName).trim()
          : null
        : existing.driver_name;
    let driverPhone =
      body.driverPhone !== undefined
        ? body.driverPhone
          ? String(body.driverPhone).trim()
          : null
        : existing.driver_phone;

    if (driverEmployeeId && !driverName) {
      const empRes = await client.query<{ name: string; phone: string | null }>(
        `SELECT name, phone FROM erp_employees WHERE id = $1`,
        [driverEmployeeId]
      );
      if (empRes.rows.length > 0) {
        driverName = empRes.rows[0].name;
        if (!driverPhone) driverPhone = empRes.rows[0].phone || null;
      } else {
        driverEmployeeId = null;
      }
    }

    const status = String(body.status ?? existing.status).trim().toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    const updRes = await client.query(
      `UPDATE erp_service_vehicles
       SET vehicle_no = $1,
           vehicle_name = $2,
           driver_employee_id = $3,
           driver_name = $4,
           driver_phone = $5,
           region = $6,
           status = $7,
           memo = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        vehicleNo,
        vehicleName,
        driverEmployeeId,
        driverName,
        driverPhone,
        body.region !== undefined ? (body.region ? String(body.region).trim() : null) : existing.region,
        status,
        body.memo !== undefined ? (body.memo ? String(body.memo).trim() : null) : existing.memo,
        id,
      ]
    );
    await client.query("COMMIT");

    const v = updRes.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        id: Number(v.id),
        vehicleNo: v.vehicle_no,
        vehicleName: v.vehicle_name,
        driverEmployeeId: v.driver_employee_id ? Number(v.driver_employee_id) : null,
        driverName: v.driver_name,
        driverPhone: v.driver_phone,
        region: v.region,
        status: v.status,
        memo: v.memo,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("[PUT /api/erp/rental/vehicles] error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "정비차량 수정 실패" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
