import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: List all rental assets
export async function GET() {
  try {
    const pool = getErpPool();
    const query = `
      SELECT 
        a.id,
        a.asset_no as "assetNo",
        a.rental_product_id as "rentalProductId",
        rp.model_code as "modelCode",
        rp.model_name as "modelName",
        rp.manufacturer,
        a.serial_no as "serialNo",
        a.acquisition_date as "acquisitionDate",
        a.acquisition_cost as "acquisitionCost",
        a.salvage_value as "salvageValue",
        a.useful_life_years as "usefulLifeYears",
        a.depreciation_method as "depreciationMethod",
        a.accumulated_depreciation as "accumulatedDepreciation",
        a.book_value as "bookValue",
        a.status,
        a.memo,
        a.created_at as "createdAt"
      FROM erp_rental_assets a
      JOIN erp_rental_products rp ON a.rental_product_id = rp.id
      ORDER BY a.asset_no ASC
    `;
    const res = await pool.query(query);
    return NextResponse.json({ success: true, assets: res.rows });
  } catch (error: any) {
    console.error("GET Rental Assets Error:", error);
    return NextResponse.json({ error: "자산 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Acquire / Register new asset (supports batch acquisition by qty)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      assetNo, rentalProductId, serialNo, acquisitionDate, 
      acquisitionCost, salvageValue, usefulLifeYears, memo, qty
    } = body;

    if (!rentalProductId || !acquisitionCost) {
      return NextResponse.json({ error: "제품 모델과 취득원가는 필수입니다." }, { status: 400 });
    }

    const batchQty = Math.min(200, Math.max(1, parseInt(String(qty || "1"), 10) || 1));
    const cost = parseFloat(acquisitionCost);
    const salvage = parseFloat(salvageValue || "0");
    const lifeYears = parseInt(usefulLifeYears || "5", 10);
    const dateStr = acquisitionDate || new Date().toISOString().split("T")[0];

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const yymm = dateStr.replace(/-/g, "").slice(2, 6);
      const prefix = `DR${yymm}`;

      const seqRes = await client.query(
        `SELECT asset_no FROM erp_rental_assets WHERE asset_no LIKE $1 ORDER BY asset_no DESC`,
        [`${prefix}%`]
      );
      let maxSeq = 0;
      for (const row of seqRes.rows) {
        const suffix = String(row.asset_no || "").slice(prefix.length).replace(/[^0-9]/g, "");
        const n = parseInt(suffix, 10);
        if (!isNaN(n) && n > maxSeq) maxSeq = n;
      }

      let startSeq = maxSeq + 1;
      const requestedNo = (assetNo || "").trim().toUpperCase();
      if (batchQty === 1 && requestedNo && !requestedNo.startsWith(prefix)) {
        const dupRes = await client.query(`SELECT id FROM erp_rental_assets WHERE asset_no = $1`, [requestedNo]);
        if (dupRes.rows.length > 0) {
          throw new Error("이미 존재하는 자산번호입니다.");
        }
      } else if (requestedNo && requestedNo.startsWith(prefix)) {
        const reqSuffix = requestedNo.slice(prefix.length).replace(/[^0-9]/g, "");
        const reqNum = parseInt(reqSuffix, 10);
        if (!isNaN(reqNum) && reqNum > maxSeq) {
          startSeq = reqNum;
        }
      }

      const serialList = String(serialNo || "")
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const assetNos: string[] = [];
      const itemSerials: string[] = [];

      for (let i = 0; i < batchQty; i++) {
        const currentAssetNo =
          batchQty === 1 && requestedNo && !requestedNo.startsWith(prefix)
            ? requestedNo
            : `${prefix}${String(startSeq + i).padStart(3, "0")}`;
        assetNos.push(currentAssetNo);

        const itemSerial =
          serialList.length > 1
            ? (serialList[i] || "")
            : serialList.length === 1
              ? (batchQty === 1 ? serialList[0] : `${serialList[0]}-${String(i + 1).padStart(2, "0")}`)
              : "";
        itemSerials.push(itemSerial);
      }

      const bulkInsertRes = await client.query(
        `WITH inserted AS (
           INSERT INTO erp_rental_assets
           (asset_no, rental_product_id, serial_no, acquisition_date, acquisition_cost,
            salvage_value, useful_life_years, depreciation_method, accumulated_depreciation,
            book_value, status, memo)
           SELECT
             u.asset_no,
             $3::int,
             u.serial_no,
             $4,
             $5::numeric,
             $6::numeric,
             $7::int,
             'STRAIGHT_LINE',
             0,
             $8::numeric,
             'AVAILABLE',
             $9
           FROM UNNEST($1::text[], $2::text[]) WITH ORDINALITY AS u(asset_no, serial_no, ord)
           ORDER BY u.ord
           RETURNING *
         )
         SELECT
           a.id,
           a.asset_no as "assetNo",
           a.asset_no,
           a.rental_product_id as "rentalProductId",
           rp.model_code as "modelCode",
           rp.model_name as "modelName",
           rp.manufacturer,
           a.serial_no as "serialNo",
           a.acquisition_date as "acquisitionDate",
           a.acquisition_cost as "acquisitionCost",
           a.salvage_value as "salvageValue",
           a.useful_life_years as "usefulLifeYears",
           a.depreciation_method as "depreciationMethod",
           a.accumulated_depreciation as "accumulatedDepreciation",
           a.book_value as "bookValue",
           a.status,
           a.memo,
           a.created_at as "createdAt"
         FROM inserted a
         JOIN erp_rental_products rp ON a.rental_product_id = rp.id
         ORDER BY a.asset_no ASC`,
        [
          assetNos,
          itemSerials,
          rentalProductId,
          dateStr,
          cost,
          salvage,
          lifeYears,
          cost,
          memo || "",
        ]
      );

      const createdAssets = bulkInsertRes.rows;

      const auditRecordIds = createdAssets.map((a: any) => a.assetNo);
      const auditDetails = createdAssets.map((_: any, i: number) =>
        JSON.stringify({ cost, salvage, lifeYears, batchQty, index: i + 1 })
      );

      if (auditRecordIds.length > 0) {
        await client.query(
          `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
           SELECT 'RENTAL_ASSET', 'ACQUIRE', u.record_id, 'ADMIN', u.details::jsonb
           FROM UNNEST($1::text[], $2::text[]) AS u(record_id, details)`,
          [auditRecordIds, auditDetails]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        asset: createdAssets[0],
        assets: createdAssets,
        count: createdAssets.length,
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST Rental Asset Error:", error);
    return NextResponse.json({ error: "자산 등록 실패: " + error.message }, { status: 500 });
  }
}
