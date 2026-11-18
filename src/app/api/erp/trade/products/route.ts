export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { ensureForkliftSchema } from "@/lib/forkliftSchemaInit";
import {
  normalizeItemClass,
  parseForkliftSpecData,
  summarizeForkliftSpec,
} from "@/lib/forkliftDomain";
import { parseNumericInput } from "@/lib/rentalFeeUtils";
import {
  buildTradeInventoryAging,
  getTodayKstDateString,
  normalizeDateStr,
} from "@/lib/tradeInventoryDomain";

function mapProductRow(r: any) {
  const itemClass = normalizeItemClass(r.item_class, r.category);
  const specData = parseForkliftSpecData(r.spec_data);
  const inboundDate = normalizeDateStr(r.inbound_date);
  const createdDate = normalizeDateStr(r.created_date);
  return {
    ...r,
    standard_cost: Number(r.standard_cost || 0),
    standard_price: Number(r.standard_price || 0),
    safety_stock: Number(r.safety_stock || 0),
    current_stock: Number(r.current_stock || 0),
    item_class: itemClass,
    manufacturer: r.manufacturer || "",
    part_no: r.part_no || "",
    install_fee: Number(r.install_fee || 0),
    addon_monthly_rate: Number(r.addon_monthly_rate || 0),
    addon_daily_rate: Number(r.addon_daily_rate || 0),
    warranty_months: Number(r.warranty_months ?? (itemClass === "FORKLIFT" ? 12 : 0)),
    warranty_hours: Number(r.warranty_hours ?? (itemClass === "FORKLIFT" ? 2000 : 0)),
    spec_data: specData,
    inbound_date: inboundDate,
    created_date: createdDate,
  };
}

// GET: List all trade products with Reverse-FIFO inbound aging & lot details
export async function GET() {
  try {
    const pool = getErpPool();
    await ensureForkliftSchema(pool);

    const [prodRes, poRes, regRes] = await Promise.all([
      pool.query(`
        SELECT
          id, sku_code, name, category, spec, unit,
          standard_cost, standard_price, safety_stock, current_stock,
          status, memo, created_at, updated_at,
          item_class, manufacturer, part_no, install_fee,
          addon_monthly_rate, addon_daily_rate, warranty_months, warranty_hours, spec_data,
          TO_CHAR(inbound_date, 'YYYY-MM-DD') AS inbound_date,
          TO_CHAR((created_at AT TIME ZONE 'Asia/Seoul')::date, 'YYYY-MM-DD') AS created_date
        FROM erp_trade_products
        ORDER BY name ASC, id ASC
      `),
      pool.query(`
        SELECT
          id,
          purchase_no AS "purchaseNo",
          TO_CHAR(purchase_date, 'YYYY-MM-DD') AS "purchaseDate",
          vendor_name AS "vendorName",
          product_id AS "productId",
          qty,
          unit_cost AS "unitCost",
          status,
          memo
        FROM erp_trade_purchases
        WHERE COALESCE(status, 'CONFIRMED') <> 'CANCELLED'
        ORDER BY purchase_date DESC, id DESC
      `),
      pool.query(`SELECT to_regclass('public.erp_part_stock_movements') AS reg`),
    ]);

    let yardReceipts: any[] = [];
    if (regRes.rows[0]?.reg) {
      const yrRes = await pool.query(`
        SELECT
          id,
          TO_CHAR(movement_date, 'YYYY-MM-DD') AS "movementDate",
          product_id AS "productId",
          qty,
          actor_name AS "actorName",
          note
        FROM erp_part_stock_movements
        WHERE movement_type = 'YARD_RECEIPT'
        ORDER BY movement_date DESC, id DESC
      `);
      yardReceipts = yrRes.rows || [];
    }

    const mappedProducts = (prodRes.rows || []).map(mapProductRow);
    const referenceDate = getTodayKstDateString();
    const aging = buildTradeInventoryAging({
      products: mappedProducts,
      purchases: poRes.rows || [],
      yardReceipts,
      referenceDate,
    });

    const enrichedProducts = mappedProducts.map((p: any) => {
      const summary = aging.productSummaries[p.id];
      return {
        ...p,
        model_name: summary?.modelName || p.name,
        oldest_inbound_date: summary?.oldestInboundDate || p.inbound_date || null,
        latest_inbound_date: summary?.latestInboundDate || p.inbound_date || null,
        elapsed_days: summary ? summary.elapsedDays : null,
        min_elapsed_days: summary ? summary.minElapsedDays : null,
        weighted_avg_elapsed_days: summary ? summary.weightedAvgElapsedDays : null,
        active_lot_count: summary ? summary.activeLotCount : 0,
        inventory_value: summary ? summary.inventoryValue : 0,
        aging_tier: summary ? summary.agingTier : "NONE",
      };
    });

    return NextResponse.json({
      success: true,
      referenceDate: aging.referenceDate,
      products: enrichedProducts,
      inventoryLots: aging.lots,
    });
  } catch (error: any) {
    console.error("GET Trade Products Error:", error);
    return NextResponse.json({ error: "유통 상품 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Register a new trade product (지게차 완제품 / 옵션 / 부품·소모품 / 일반상품)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      skuCode,
      name,
      category,
      spec,
      unit,
      standardCost,
      standardPrice,
      safetyStock,
      currentStock,
      memo,
      itemClass,
      manufacturer,
      partNo,
      installFee,
      addonMonthlyRate,
      addonDailyRate,
      warrantyMonths,
      warrantyHours,
      specData,
      inboundDate,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "상품명은 필수 입력 항목입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    await ensureForkliftSchema(pool);

    const resolvedClass = normalizeItemClass(itemClass, category);
    const parsedSpecData = parseForkliftSpecData(specData);
    if (partNo && !parsedSpecData.partNo) {
      parsedSpecData.partNo = String(partNo).trim();
    }
    const computedSpec = summarizeForkliftSpec(resolvedClass, parsedSpecData, spec);
    const generatedSku =
      (skuCode && String(skuCode).trim().toUpperCase()) ||
      `TRD${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const defaultWMonths = resolvedClass === "FORKLIFT" ? 12 : 0;
    const defaultWHours = resolvedClass === "FORKLIFT" ? 2000 : 0;
    const initStock = Math.max(0, Math.round(parseNumericInput(currentStock)));
    const resolvedInboundDate =
      normalizeDateStr(inboundDate) || (initStock > 0 ? getTodayKstDateString() : null);

    const ins = await pool.query(
      `INSERT INTO erp_trade_products
       (sku_code, name, category, spec, unit, standard_cost, standard_price,
        safety_stock, current_stock, status, memo,
        item_class, manufacturer, part_no, install_fee,
        addon_monthly_rate, addon_daily_rate, warranty_months, warranty_hours, spec_data, inbound_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', $10,
               $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20)
       RETURNING *,
         TO_CHAR(inbound_date, 'YYYY-MM-DD') AS inbound_date,
         TO_CHAR((created_at AT TIME ZONE 'Asia/Seoul')::date, 'YYYY-MM-DD') AS created_date`,
      [
        generatedSku,
        String(name).trim(),
        category || "기타",
        computedSpec,
        unit || "EA",
        Math.round(parseNumericInput(standardCost)),
        Math.round(parseNumericInput(standardPrice)),
        Math.max(0, Math.round(parseNumericInput(safetyStock))),
        initStock,
        memo || "",
        resolvedClass,
        manufacturer || "",
        partNo || parsedSpecData.partNo || "",
        Math.round(parseNumericInput(installFee)),
        Math.round(parseNumericInput(addonMonthlyRate)),
        Math.round(parseNumericInput(addonDailyRate)),
        Math.max(0, Math.round(Number(warrantyMonths ?? defaultWMonths) || 0)),
        Math.max(0, Math.round(Number(warrantyHours ?? defaultWHours) || 0)),
        JSON.stringify(parsedSpecData),
        resolvedInboundDate,
      ]
    );

    return NextResponse.json({ success: true, product: mapProductRow(ins.rows[0]) });
  } catch (error: any) {
    console.error("POST Trade Product Error:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 존재하는 품목 코드(SKU)입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "상품 등록 실패: " + error.message }, { status: 500 });
  }
}

// PUT: Update trade product & specs
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      skuCode,
      name,
      category,
      spec,
      unit,
      standardCost,
      standardPrice,
      safetyStock,
      currentStock,
      status,
      memo,
      itemClass,
      manufacturer,
      partNo,
      installFee,
      addonMonthlyRate,
      addonDailyRate,
      warrantyMonths,
      warrantyHours,
      specData,
      inboundDate,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "수정할 상품 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    await ensureForkliftSchema(pool);

    const existingRes = await pool.query(
      "SELECT *, TO_CHAR(inbound_date, 'YYYY-MM-DD') AS inbound_date_str FROM erp_trade_products WHERE id = $1",
      [parseInt(String(id), 10)]
    );
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "해당 상품을 찾을 수 없습니다." }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    const resolvedInboundDate =
      inboundDate === undefined
        ? normalizeDateStr(existing.inbound_date_str)
        : String(inboundDate).trim() === ""
          ? null
          : normalizeDateStr(inboundDate);

    const resolvedClass = normalizeItemClass(
      itemClass ?? existing.item_class,
      category ?? existing.category
    );
    const parsedSpecData =
      specData !== undefined ? parseForkliftSpecData(specData) : parseForkliftSpecData(existing.spec_data);
    const resolvedPartNo = partNo !== undefined ? String(partNo || "").trim() : existing.part_no || "";
    if (resolvedPartNo && !parsedSpecData.partNo) {
      parsedSpecData.partNo = resolvedPartNo;
    }
    const computedSpec = summarizeForkliftSpec(
      resolvedClass,
      parsedSpecData,
      spec !== undefined ? spec : existing.spec
    );

    const upd = await pool.query(
      `UPDATE erp_trade_products
       SET
         sku_code = COALESCE($1, sku_code),
         name = COALESCE($2, name),
         category = COALESCE($3, category),
         spec = $4,
         unit = COALESCE($5, unit),
         standard_cost = $6,
         standard_price = $7,
         safety_stock = $8,
         current_stock = $9,
         status = COALESCE($10, status),
         memo = COALESCE($11, memo),
         item_class = $12,
         manufacturer = $13,
         part_no = $14,
         install_fee = $15,
         addon_monthly_rate = $16,
         addon_daily_rate = $17,
         warranty_months = $18,
         warranty_hours = $19,
         spec_data = $20::jsonb,
         inbound_date = $21,
         updated_at = NOW()
       WHERE id = $22
       RETURNING *,
         TO_CHAR(inbound_date, 'YYYY-MM-DD') AS inbound_date,
         TO_CHAR((created_at AT TIME ZONE 'Asia/Seoul')::date, 'YYYY-MM-DD') AS created_date`,
      [
        skuCode ? String(skuCode).trim().toUpperCase() : null,
        name ? String(name).trim() : null,
        category !== undefined ? category : null,
        computedSpec,
        unit !== undefined ? unit : null,
        standardCost !== undefined ? Math.round(parseNumericInput(standardCost)) : Number(existing.standard_cost || 0),
        standardPrice !== undefined ? Math.round(parseNumericInput(standardPrice)) : Number(existing.standard_price || 0),
        safetyStock !== undefined ? Math.max(0, Math.round(parseNumericInput(safetyStock))) : Number(existing.safety_stock || 0),
        currentStock !== undefined ? Math.max(0, Math.round(parseNumericInput(currentStock))) : Number(existing.current_stock || 0),
        status || null,
        memo !== undefined ? memo : null,
        resolvedClass,
        manufacturer !== undefined ? String(manufacturer || "").trim() : existing.manufacturer || "",
        resolvedPartNo,
        installFee !== undefined ? Math.round(parseNumericInput(installFee)) : Number(existing.install_fee || 0),
        addonMonthlyRate !== undefined ? Math.round(parseNumericInput(addonMonthlyRate)) : Number(existing.addon_monthly_rate || 0),
        addonDailyRate !== undefined ? Math.round(parseNumericInput(addonDailyRate)) : Number(existing.addon_daily_rate || 0),
        warrantyMonths !== undefined ? Math.max(0, Math.round(Number(warrantyMonths) || 0)) : Number(existing.warranty_months || 0),
        warrantyHours !== undefined ? Math.max(0, Math.round(Number(warrantyHours) || 0)) : Number(existing.warranty_hours || 0),
        JSON.stringify(parsedSpecData),
        resolvedInboundDate,
        parseInt(String(id), 10),
      ]
    );

    return NextResponse.json({ success: true, product: mapProductRow(upd.rows[0]) });
  } catch (error: any) {
    console.error("PUT Trade Product Error:", error);
    return NextResponse.json({ error: "상품 수정 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: Delete unused trade product
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 상품 ID가 필요합니다." }, { status: 400 });
    }
    const pool = getErpPool();
    const pid = parseInt(id, 10);

    const refCheck = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM erp_trade_purchases WHERE product_id = $1) AS po_cnt,
        (SELECT COUNT(*) FROM erp_trade_sales WHERE product_id = $1) AS so_cnt`,
      [pid]
    );
    const { po_cnt, so_cnt } = refCheck.rows[0];
    if (Number(po_cnt) > 0 || Number(so_cnt) > 0) {
      return NextResponse.json(
        { error: "구매 또는 판매 이력이 존재하는 상품은 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    await pool.query("DELETE FROM erp_trade_products WHERE id = $1", [pid]);
    return NextResponse.json({ success: true, message: "상품이 삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Trade Product Error:", error);
    return NextResponse.json({ error: "상품 삭제 실패: " + error.message }, { status: 500 });
  }
}
