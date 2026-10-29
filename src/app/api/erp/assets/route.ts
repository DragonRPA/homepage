import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// GET: 전체 자산 대장 및 제품 모델 결합 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");

    const pool = getErpPool();
    let query = `
      SELECT 
        a.id,
        a.asset_no as "assetNo",
        a.rental_product_id as "rentalProductId",
        rp.model_code as "modelCode",
        rp.model_name as "modelName",
        rp.category,
        rp.manufacturer,
        rp.spec as "modelSpec",
        a.serial_no as "serialNo",
        a.owner_type as "ownerType",
        a.status,
        a.acquisition_date as "acquisitionDate",
        a.acquisition_cost as "acquisitionCost",
        a.salvage_value as "salvageValue",
        a.useful_life_years as "usefulLifeYears",
        a.depreciation_method as "depreciationMethod",
        a.accumulated_depreciation as "accumulatedDepreciation",
        a.book_value as "bookValue",
        a.monthly_depreciation as "monthlyDepreciation",
        a.supplier,
        a.renter,
        a.current_customer as "currentCustomer",
        a.current_site as "currentSite",
        a.contract_no as "contractNo",
        a.custom_spec as "customSpec",
        a.memo,
        a.created_at as "createdAt",
        a.updated_at as "updatedAt"
      FROM erp_rental_assets a
      JOIN erp_rental_products rp ON a.rental_product_id = rp.id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (productId) {
      params.push(productId);
      query += ` AND a.rental_product_id = $${params.length}`;
    }
    if (status && status !== "ALL") {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }

    query += ` ORDER BY a.asset_no ASC`;

    const res = await pool.query(query, params);
    return NextResponse.json({ success: true, assets: res.rows });
  } catch (error: any) {
    console.error("GET Assets Error:", error);
    return NextResponse.json({ error: "자산 대장 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: 신규 자산 취득 / 대장 등록 (수량 입력을 통한 일괄 취득 및 DR+yymm+3자리 순번 자동채번, 감가상각 정액법 자동 계산 및 이력 무누락 저장: 헌장 1.2 & 4.1)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      assetNo, rentalProductId, serialNo, ownerType,
      acquisitionDate, acquisitionCost, salvageValue, usefulLifeYears,
      supplier, renter, currentCustomer, currentSite, contractNo, customSpec, memo,
      qty
    } = body;

    if (!rentalProductId) {
      return NextResponse.json({ error: "제품 모델은 필수입니다." }, { status: 400 });
    }

    const batchQty = Math.min(200, Math.max(1, parseInt(String(qty || "1"), 10) || 1));
    const cost = parseFloat(acquisitionCost || "0");
    const salvage = parseFloat(salvageValue || "0");
    const lifeYears = parseInt(usefulLifeYears || "5", 10);
    const dateStr = acquisitionDate || new Date().toISOString().split("T")[0];

    // 정액법 감가상각 계산
    const acqDateObj = new Date(dateStr);
    const now = new Date();
    const monthsElapsed = Math.max(0, (now.getFullYear() - acqDateObj.getFullYear()) * 12 + (now.getMonth() - acqDateObj.getMonth()));
    const totalMonths = Math.max(1, lifeYears * 12);
    const depreciableAmount = Math.max(0, cost - salvage);
    const monthlyDeprec = Math.round(depreciableAmount / totalMonths);
    const accumDeprec = Math.min(depreciableAmount, monthlyDeprec * monthsElapsed);
    const bookVal = Math.max(salvage, cost - accumDeprec);

    const initialStatus = currentCustomer ? "RENTED" : "AVAILABLE";

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 자산번호 자동채번: "DR" + yymm + 3-digit 순번 (예: DR2610001)
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
        // 사용자가 직접 커스텀 자산번호 1건을 지정한 경우 중복 여부 확인
        const dupRes = await client.query(`SELECT id FROM erp_rental_assets WHERE asset_no = $1`, [requestedNo]);
        if (dupRes.rows.length > 0) {
          throw new Error("이미 동일한 자산번호가 등록되어 있습니다.");
        }
      } else if (requestedNo && requestedNo.startsWith(prefix)) {
        const reqSuffix = requestedNo.slice(prefix.length).replace(/[^0-9]/g, "");
        const reqNum = parseInt(reqSuffix, 10);
        if (!isNaN(reqNum) && reqNum > maxSeq) {
          startSeq = reqNum;
        }
      }

      // 시리얼번호 다중 구분자(쉼표/줄바꿈) 지원
      const serialList = String(serialNo || "")
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const insertQuery = `
        INSERT INTO erp_rental_assets (
          asset_no, rental_product_id, serial_no, owner_type, status,
          acquisition_date, acquisition_cost, salvage_value, useful_life_years,
          depreciation_method, accumulated_depreciation, book_value, monthly_depreciation,
          supplier, renter, current_customer, current_site, contract_no, custom_spec, memo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'STRAIGHT_LINE', $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `;

      const createdAssets: any[] = [];

      for (let i = 0; i < batchQty; i++) {
        const currentAssetNo =
          batchQty === 1 && requestedNo && !requestedNo.startsWith(prefix)
            ? requestedNo
            : `${prefix}${String(startSeq + i).padStart(3, "0")}`;

        const itemSerial =
          serialList.length > 1
            ? (serialList[i] || "")
            : serialList.length === 1
              ? (batchQty === 1 ? serialList[0] : `${serialList[0]}-${String(i + 1).padStart(2, "0")}`)
              : "";

        const res = await client.query(insertQuery, [
          currentAssetNo,
          rentalProductId,
          itemSerial,
          ownerType || "OWNED",
          initialStatus,
          dateStr,
          cost,
          salvage,
          lifeYears,
          accumDeprec,
          bookVal,
          monthlyDeprec,
          supplier || null,
          renter || null,
          currentCustomer || null,
          currentSite || null,
          contractNo || null,
          customSpec || null,
          memo || null,
        ]);

        const newAsset = res.rows[0];
        createdAssets.push(newAsset);

        // 무누락 이력 감사 로그 기록 (ACQUISITION)
        await client.query(
          `INSERT INTO erp_asset_inout_logs 
           (asset_id, asset_no, event_type, event_date, customer_name, site_name, memo)
           VALUES ($1, $2, 'ACQUISITION', $3, $4, $5, $6)`,
          [
            newAsset.id,
            newAsset.asset_no,
            dateStr,
            supplier || renter || "공급처",
            "본사 장부",
            `신규 자산 취득 등록 (${batchQty > 1 ? `일괄 ${batchQty}대 중 ${i + 1}번째, ` : ""}취득원가: ${cost.toLocaleString()}원, 잔존가: ${salvage.toLocaleString()}원)`,
          ]
        );

        // 대여중 상태로 등록된 경우 출고 로그 추가
        if (initialStatus === "RENTED" && currentCustomer) {
          await client.query(
            `INSERT INTO erp_asset_inout_logs 
             (asset_id, asset_no, event_type, event_date, customer_name, site_name, memo)
             VALUES ($1, $2, 'OUTBOUND', $3, $4, $5, $6)`,
            [
              newAsset.id,
              newAsset.asset_no,
              dateStr,
              currentCustomer,
              currentSite || "현장",
              `초기 등록 시 계약(${contractNo || "-"}) 출고 상태 설정`,
            ]
          );
        }
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
    console.error("POST Asset Error:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 동일한 자산번호가 등록되어 있습니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "자산 등록 실패: " + error.message }, { status: 500 });
  }
}

// PUT: 자산 정보 수정 및 상태 변경 (상태 변경 시 이력 자동 기록)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, assetNo, serialNo, ownerType, status,
      acquisitionDate, acquisitionCost, salvageValue, usefulLifeYears,
      supplier, renter, currentCustomer, currentSite, contractNo, customSpec, memo,
      logMemo // 상태 변경 시 기록할 메모
    } = body;

    if (!id) {
      return NextResponse.json({ error: "자산 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    // 기존 자산 조회
    const prevRes = await pool.query("SELECT * FROM erp_rental_assets WHERE id = $1", [id]);
    if (prevRes.rows.length === 0) {
      return NextResponse.json({ error: "해당 자산을 찾을 수 없습니다." }, { status: 404 });
    }
    const prevAsset = prevRes.rows[0];

    // 감가상각 재계산
    const cost = acquisitionCost !== undefined ? parseFloat(acquisitionCost) : parseFloat(prevAsset.acquisition_cost || "0");
    const salvage = salvageValue !== undefined ? parseFloat(salvageValue) : parseFloat(prevAsset.salvage_value || "0");
    const lifeYears = usefulLifeYears !== undefined ? parseInt(usefulLifeYears, 10) : parseInt(prevAsset.useful_life_years || "5", 10);
    const dateStr = acquisitionDate || prevAsset.acquisition_date;

    const acqDateObj = new Date(dateStr);
    const now = new Date();
    const monthsElapsed = Math.max(0, (now.getFullYear() - acqDateObj.getFullYear()) * 12 + (now.getMonth() - acqDateObj.getMonth()));
    const totalMonths = Math.max(1, lifeYears * 12);
    const depreciableAmount = Math.max(0, cost - salvage);
    const monthlyDeprec = Math.round(depreciableAmount / totalMonths);
    const accumDeprec = Math.min(depreciableAmount, monthlyDeprec * monthsElapsed);
    const bookVal = Math.max(salvage, cost - accumDeprec);

    const updateQuery = `
      UPDATE erp_rental_assets
      SET 
        asset_no = COALESCE($1, asset_no),
        serial_no = COALESCE($2, serial_no),
        owner_type = COALESCE($3, owner_type),
        status = COALESCE($4, status),
        acquisition_date = COALESCE($5, acquisition_date),
        acquisition_cost = $6,
        salvage_value = $7,
        useful_life_years = $8,
        accumulated_depreciation = $9,
        book_value = $10,
        monthly_depreciation = $11,
        supplier = $12,
        renter = $13,
        current_customer = $14,
        current_site = $15,
        contract_no = $16,
        custom_spec = $17,
        memo = $18,
        updated_at = NOW()
      WHERE id = $19
      RETURNING *
    `;

    const res = await pool.query(updateQuery, [
      assetNo ? assetNo.trim().toUpperCase() : null,
      serialNo,
      ownerType,
      status,
      acquisitionDate || null,
      cost,
      salvage,
      lifeYears,
      accumDeprec,
      bookVal,
      monthlyDeprec,
      supplier,
      renter,
      currentCustomer,
      currentSite,
      contractNo,
      customSpec,
      memo,
      id
    ]);

    const updatedAsset = res.rows[0];

    // 상태 변경 시 이력 로그 무누락 기록
    if (status && status !== prevAsset.status) {
      let eventType = "STATUS_CHANGE";
      if (status === "RENTED") eventType = "OUTBOUND";
      else if (status === "AVAILABLE" && prevAsset.status === "RENTED") eventType = "INBOUND";
      else if (status === "REPAIRING") eventType = "REPAIR";
      else if (status === "DISPOSED" || status === "SOLD") eventType = "DISPOSAL";

      await pool.query(`
        INSERT INTO erp_asset_inout_logs 
        (asset_id, asset_no, event_type, event_date, customer_name, site_name, memo)
        VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6)
      `, [
        updatedAsset.id,
        updatedAsset.asset_no,
        eventType,
        updatedAsset.current_customer || prevAsset.current_customer || "-",
        updatedAsset.current_site || prevAsset.current_site || "-",
        logMemo || `상태 변경: ${prevAsset.status} ➔ ${status}`
      ]);
    }

    return NextResponse.json({ success: true, asset: updatedAsset });
  } catch (error: any) {
    console.error("PUT Asset Error:", error);
    return NextResponse.json({ error: "자산 수정 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: 자산 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 자산 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    // 대여중인 자산은 삭제 방지
    const checkRes = await pool.query("SELECT status, asset_no FROM erp_rental_assets WHERE id = $1", [id]);
    if (checkRes.rows.length > 0 && checkRes.rows[0].status === "RENTED") {
      return NextResponse.json({ 
        error: `현재 대여중(RENTED)인 자산(${checkRes.rows[0].asset_no})은 삭제할 수 없습니다. 회수 처리를 먼저 진행해 주십시오.` 
      }, { status: 400 });
    }

    // Delete logs first
    await pool.query("DELETE FROM erp_asset_inout_logs WHERE asset_id = $1", [id]);
    await pool.query("DELETE FROM erp_rental_assets WHERE id = $1", [id]);

    return NextResponse.json({ success: true, message: "자산이 삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Asset Error:", error);
    return NextResponse.json({ error: "자산 삭제 실패: " + error.message }, { status: 500 });
  }
}
