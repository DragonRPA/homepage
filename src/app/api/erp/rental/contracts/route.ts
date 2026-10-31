import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// GET: List all rental contracts (optionally filter by entityType, or id for single contract file)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const entityType = searchParams.get("entityType");

    const pool = getErpPool();

    if (idParam) {
      const singleRes = await pool.query(
        `
        SELECT 
          id,
          contract_no AS "contractNo",
          customer_name AS "customerName",
          site_name AS "siteName",
          contract_file_url AS "contractFileUrl",
          contract_file_name AS "contractFileName"
        FROM erp_rental_contracts
        WHERE id = $1
        LIMIT 1
        `,
        [parseInt(idParam, 10)]
      );
      if (singleRes.rows.length === 0) {
        return NextResponse.json({ error: "해당 임대계약을 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({ success: true, contract: singleRes.rows[0] });
    }

    let query = `
      SELECT 
        c.id,
        c.contract_no as "contractNo",
        c.entity_type as "entityType",
        c.partner_id as "partnerId",
        c.customer_name as "customerName",
        c.site_name as "siteName",
        c.asset_id as "assetId",
        COALESCE(a.asset_no, ra_agg.first_asset_no) as "assetNo",
        COALESCE(rp.model_name, ra_agg.first_model_name) as "modelName",
        COALESCE(ra_agg.active_asset_count, 0)::int as "activeAssetCount",
        COALESCE(ra_agg.rented_assets, '[]'::jsonb) as "rentedAssets",
        c.start_date as "startDate",
        c.end_date as "endDate",
        c.monthly_rate as "monthlyRate",
        c.daily_rate as "dailyRate",
        c.vat_amount as "vatAmount",
        c.deposit,
        COALESCE(c.billing_day, 25) as "billingDay",
        c.status,
        c.memo,
        COALESCE(NULLIF(c.customer_biz_no, ''), p.business_no, '') as "customerBizNo",
        COALESCE(NULLIF(c.customer_ceo_name, ''), p.ceo_name, '') as "customerCeoName",
        COALESCE(NULLIF(c.customer_address, ''), CONCAT_WS(' ', p.address, p.address_detail), '') as "customerAddress",
        COALESCE(NULLIF(c.customer_biz_type, ''), p.biz_type, '') as "customerBizType",
        COALESCE(NULLIF(c.customer_biz_class, ''), p.biz_item, '') as "customerBizClass",
        COALESCE(NULLIF(c.customer_email, ''), p.main_email, '') as "customerEmail",
        COALESCE(c.customer_email2, '') as "customerEmail2",
        COALESCE(c.tax_purpose, '청구') as "taxPurpose",
        COALESCE(c.tax_memo, '{1번째 아이템} 외') as "taxMemo",
        COALESCE(c.tax_items, '[]'::jsonb) as "taxItems",
        c.contract_file_name as "contractFileName",
        (c.contract_file_url IS NOT NULL AND c.contract_file_url <> '') as "hasContractFile",
        c.created_at as "createdAt"
      FROM erp_rental_contracts c
      LEFT JOIN erp_rental_assets a ON c.asset_id = a.id
      LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
      LEFT JOIN erp_partners p ON c.partner_id = p.id OR (c.partner_id IS NULL AND c.customer_name = p.name)
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS active_asset_count,
          (ARRAY_AGG(ra.asset_no ORDER BY ra.outbound_date ASC NULLS LAST, ra.id ASC))[1] AS first_asset_no,
          (ARRAY_AGG(rprod.model_name ORDER BY ra.outbound_date ASC NULLS LAST, ra.id ASC))[1] AS first_model_name,
          JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'id', ra.id,
              'assetNo', ra.asset_no,
              'rentalProductId', ra.rental_product_id,
              'modelCode', rprod.model_code,
              'modelName', rprod.model_name,
              'monthlyRate', COALESCE(NULLIF(ra.current_monthly_rate, 0), rprod.standard_monthly_rate, 0),
              'outboundDate', TO_CHAR(ra.outbound_date, 'YYYY-MM-DD')
            ) ORDER BY ra.outbound_date ASC NULLS LAST, ra.id ASC
          ) AS rented_assets
        FROM erp_rental_assets ra
        LEFT JOIN erp_rental_products rprod ON ra.rental_product_id = rprod.id
        WHERE ra.status = 'RENTED' AND (ra.current_contract_id = c.id OR ra.current_customer = c.customer_name)
      ) ra_agg ON true
      WHERE 1=1
    `;
    const params: any[] = [];
    if (entityType && entityType !== "ALL") {
      params.push(entityType);
      query += ` AND c.entity_type = $${params.length}`;
    }
    query += " ORDER BY c.start_date DESC, c.id DESC";

    const res = await pool.query(query, params);
    return NextResponse.json({ success: true, contracts: res.rows });
  } catch (error: any) {
    console.error("GET Rental Contracts Error:", error);
    return NextResponse.json({ error: "임대계약 목록 조회 실패" }, { status: 500 });
  }
}

// Helper: Build grouped tax_items from currently rented assets of a contract
async function buildGroupedTaxItemsForContract(
  client: any,
  contractId: number,
  customerName: string,
  fallbackStartDate: string,
  fallbackItems: any[] = []
) {
  const rentedRes = await client.query(
    `SELECT a.id, a.asset_no, a.rental_product_id, a.current_monthly_rate, a.outbound_date,
            rp.model_code, rp.model_name, rp.standard_monthly_rate
     FROM erp_rental_assets a
     LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
     WHERE a.status = 'RENTED' AND (a.current_contract_id = $1 OR a.current_customer = $2)
     ORDER BY a.outbound_date ASC NULLS LAST, a.id ASC`,
    [contractId, customerName]
  );

  const rentedList = rentedRes.rows;
  if (rentedList.length === 0) {
    return {
      rentedList: [],
      taxItems: Array.isArray(fallbackItems) ? fallbackItems : [],
    };
  }

  // Group by (rental_product_id, unit_rate) so same product with same unit price becomes 1 line with qty = N
  const groupMap = new Map<
    string,
    {
      productId: number | null;
      modelCode: string;
      modelName: string;
      unitCost: number;
      qty: number;
      assetIds: number[];
      assetNos: string[];
      firstOutDate: string;
    }
  >();

  for (const ra of rentedList) {
    const unitCost = Math.round(Number(ra.current_monthly_rate || ra.standard_monthly_rate || 0));
    const pid = ra.rental_product_id ? Number(ra.rental_product_id) : null;
    const mName = ra.model_name || "임대장비";
    const mCode = ra.model_code || "";
    const outDt = ra.outbound_date ? String(ra.outbound_date).slice(0, 10) : fallbackStartDate;
    const key = `${pid || mName}__${unitCost}`;

    const existing = groupMap.get(key);
    if (existing) {
      existing.qty += 1;
      existing.assetIds.push(ra.id);
      existing.assetNos.push(ra.asset_no);
    } else {
      groupMap.set(key, {
        productId: pid,
        modelCode: mCode,
        modelName: mName,
        unitCost,
        qty: 1,
        assetIds: [ra.id],
        assetNos: [ra.asset_no],
        firstOutDate: outDt,
      });
    }
  }

  const taxItems = Array.from(groupMap.values()).map((g) => {
    const supplyAmount = Math.round(g.qty * g.unitCost);
    const vatAmount = Math.round(supplyAmount * 0.1);
    const assetSummary =
      g.assetNos.length <= 2
        ? g.assetNos.join(", ")
        : `${g.assetNos[0]} 외 ${g.assetNos.length - 1}대`;
    return {
      productId: g.productId,
      assetIds: g.assetIds,
      assetNo: g.assetNos[0] || "",
      month: g.firstOutDate.slice(5, 7),
      day: g.firstOutDate.slice(8, 10),
      itemName: g.modelName,
      spec: g.modelCode || `${g.qty}대`,
      qty: g.qty,
      unitCost: g.unitCost,
      supplyAmount,
      vatAmount,
      note: assetSummary,
    };
  });

  return { rentedList, taxItems };
}

// POST: Create or append to rental contract (Sets asset status to RENTED per 헌장 1.3)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      baseContractId,
      partnerId,
      customerName,
      siteName,
      assetId,
      rentalItems,
      startDate,
      endDate,
      monthlyRate,
      dailyRate,
      vatAmount,
      deposit,
      billingDay,
      memo,
      entityType,
      customerBizNo,
      customerCeoName,
      customerAddress,
      customerBizType,
      customerBizClass,
      customerEmail,
      customerEmail2,
      taxPurpose,
      taxMemo,
      taxItems,
      contractFileUrl,
      contractFileName,
    } = body;

    if ((!customerName && !baseContractId) || !startDate || !endDate) {
      return NextResponse.json({ error: "기본 계약(고객사), 계약시작일, 종료일은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. 기본 계약(baseContractId) 또는 고객사(customerName) 기준으로 기존 계약 조회
      let existingCt: any = null;
      if (baseContractId) {
        const byIdRes = await client.query(
          `SELECT * FROM erp_rental_contracts WHERE id = $1 FOR UPDATE`,
          [parseInt(String(baseContractId), 10)]
        );
        if (byIdRes.rows.length > 0) {
          existingCt = byIdRes.rows[0];
        }
      }

      const cleanCustomer = (customerName || existingCt?.customer_name || "").trim();
      if (!cleanCustomer) {
        throw new Error("고객사명이 필요합니다.");
      }

      if (!existingCt) {
        const existingRes = await client.query(
          `SELECT * FROM erp_rental_contracts WHERE customer_name = $1 ORDER BY id ASC LIMIT 1 FOR UPDATE`,
          [cleanCustomer]
        );
        if (existingRes.rows.length > 0) {
          existingCt = existingRes.rows[0];
        }
      }

      // 거래처(erp_partners) 제원 자동 조회 (전달되지 않은 경우 백그라운드 자동 매핑)
      let partnerRow: any = null;
      const targetPartnerId = partnerId || existingCt?.partner_id || null;
      if (targetPartnerId) {
        const pRes = await client.query(`SELECT * FROM erp_partners WHERE id = $1 LIMIT 1`, [
          parseInt(String(targetPartnerId), 10),
        ]);
        partnerRow = pRes.rows[0] || null;
      } else {
        const pRes = await client.query(`SELECT * FROM erp_partners WHERE name = $1 LIMIT 1`, [
          cleanCustomer,
        ]);
        partnerRow = pRes.rows[0] || null;
      }

      const assignedEntity =
        entityType === "INDIVIDUAL"
          ? "INDIVIDUAL"
          : entityType === "CORP"
          ? "CORP"
          : existingCt?.entity_type || "CORP";

      // 2. 배정할 자산 목록 확보 (rentalItems: [{ productId, qty, unitCost }] 또는 단일 assetId)
      const assetsToAssign: Array<{ id: number; asset_no: string; model_name: string; unitCost: number }> = [];

      if (Array.isArray(rentalItems) && rentalItems.length > 0) {
        for (const item of rentalItems) {
          const prodId = parseInt(String(item.productId || "0"), 10);
          const reqQty = Math.max(0, parseInt(String(item.qty || "0"), 10));
          const unitCost = Math.round(parseFloat(String(item.unitCost ?? item.unitPrice ?? "0")) || 0);
          if (!prodId || reqQty <= 0) continue;

          const availRes = await client.query(
            `SELECT a.id, a.asset_no, rp.model_name
             FROM erp_rental_assets a
             LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
             WHERE a.rental_product_id = $1 AND a.status = 'AVAILABLE'
             ORDER BY a.asset_no ASC
             LIMIT $2
             FOR UPDATE OF a`,
            [prodId, reqQty]
          );

          if (availRes.rows.length < reqQty) {
            const prodNameRes = await client.query(
              `SELECT model_name FROM erp_rental_products WHERE id = $1`,
              [prodId]
            );
            const mName = prodNameRes.rows[0]?.model_name || `제품ID#${prodId}`;
            throw new Error(
              `[${mName}] 제품의 임대가능 재고가 부족합니다. (요청: ${reqQty}대 / 가용재고: ${availRes.rows.length}대)`
            );
          }

          for (const row of availRes.rows) {
            assetsToAssign.push({
              id: row.id,
              asset_no: row.asset_no,
              model_name: row.model_name || "임대장비",
              unitCost,
            });
          }
        }
      } else if (assetId) {
        const assetCheck = await client.query(
          `SELECT a.id, a.asset_no, a.status, rp.model_name
           FROM erp_rental_assets a
           LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
           WHERE a.id = $1 FOR UPDATE OF a`,
          [assetId]
        );
        if (assetCheck.rows.length === 0) {
          throw new Error("지정된 자산이 존재하지 않습니다.");
        }
        if (assetCheck.rows[0].status === "RENTED") {
          throw new Error("해당 자산은 이미 타 계약에서 대여중(RENTED)입니다.");
        }
        assetsToAssign.push({
          id: assetCheck.rows[0].id,
          asset_no: assetCheck.rows[0].asset_no,
          model_name: assetCheck.rows[0].model_name || "임대장비",
          unitCost: Math.round(parseFloat(monthlyRate || "0")),
        });
      }

      const parsedMonthly = Math.round(parseFloat(monthlyRate || "0"));
      const parsedVat =
        vatAmount !== undefined && vatAmount !== null && vatAmount !== ""
          ? Math.round(parseFloat(vatAmount))
          : Math.round(parsedMonthly * 0.1);

      let savedContract: any = null;
      let targetContractId: number;
      let targetContractNo: string;

      if (existingCt) {
        targetContractId = existingCt.id;
        targetContractNo = existingCt.contract_no;
      } else {
        targetContractNo = `RC${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(
          1000 + Math.random() * 9000
        )}`;
        const partnerAddr = partnerRow
          ? [partnerRow.address, partnerRow.address_detail].filter(Boolean).join(" ")
          : "";
        const insRes = await client.query(
          `INSERT INTO erp_rental_contracts
           (contract_no, entity_type, partner_id, customer_name, site_name, asset_id, start_date, end_date,
            monthly_rate, daily_rate, vat_amount, deposit, billing_day, status, memo,
            customer_biz_no, customer_ceo_name, customer_address, customer_biz_type, customer_biz_class,
            customer_email, customer_email2, tax_purpose, tax_memo, tax_items,
            contract_file_url, contract_file_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'ACTIVE', $14,
                   $15, $16, $17, $18, $19, $20, $21, $22, $23, '[]'::jsonb, $24, $25)
           RETURNING id, contract_no AS "contractNo", customer_name AS "customerName"`,
          [
            targetContractNo,
            assignedEntity,
            partnerRow ? partnerRow.id : targetPartnerId ? parseInt(String(targetPartnerId), 10) : null,
            cleanCustomer,
            siteName || "",
            assetsToAssign[0]?.id || null,
            startDate,
            endDate,
            parsedMonthly,
            parseFloat(dailyRate || String(Math.round(parsedMonthly / 30))),
            parsedVat,
            parseFloat(deposit || "0"),
            parseInt(billingDay || "25", 10),
            memo || "",
            customerBizNo || partnerRow?.business_no || "",
            customerCeoName || partnerRow?.ceo_name || "",
            customerAddress || partnerAddr || "",
            customerBizType || partnerRow?.biz_type || "",
            customerBizClass || partnerRow?.biz_item || "",
            customerEmail || partnerRow?.main_email || "",
            customerEmail2 || "",
            taxPurpose || "청구",
            taxMemo || "{1번째 아이템} 외",
            contractFileUrl || null,
            contractFileName || null,
          ]
        );
        savedContract = insRes.rows[0];
        targetContractId = savedContract.id;
      }

      // 3. 선택된 제품 재고 자산들을 RENTED로 전환 및 입출고 로그(OUTBOUND) 기록
      for (const ast of assetsToAssign) {
        await client.query(
          `UPDATE erp_rental_assets
           SET status = 'RENTED',
               current_customer = $1,
               current_site = NULL,
               contract_no = $2,
               current_contract_id = $3,
               current_monthly_rate = $4,
               outbound_date = $5,
               updated_at = NOW()
           WHERE id = $6`,
          [cleanCustomer, targetContractNo, targetContractId, ast.unitCost, startDate, ast.id]
        );

        await client.query(
          `INSERT INTO erp_asset_inout_logs
           (asset_id, asset_no, event_type, event_date, customer_name, site_name, memo)
           VALUES ($1, $2, 'OUTBOUND', $3, $4, NULL, $5)`,
          [
            ast.id,
            ast.asset_no,
            startDate,
            cleanCustomer,
            `임대계약(${targetContractNo}) 제품 배정 출고 (단가: ₩${ast.unitCost.toLocaleString()})`,
          ]
        );
      }

      // 4. 계약에 속한 전체 RENTED 자산을 제품+단가 기준으로 그룹핑하여 계약 금액 및 tax_items 최신화
      const { rentedList, taxItems: groupedItems } = await buildGroupedTaxItemsForContract(
        client,
        targetContractId,
        cleanCustomer,
        startDate,
        Array.isArray(taxItems) && taxItems.length > 0 ? taxItems : existingCt?.tax_items || []
      );

      const sumSupply =
        groupedItems.reduce((acc: number, it: any) => acc + Number(it.supplyAmount || 0), 0) || parsedMonthly;
      const sumVat =
        groupedItems.reduce((acc: number, it: any) => acc + Number(it.vatAmount || 0), 0) || parsedVat;

      const partnerAddr = partnerRow
        ? [partnerRow.address, partnerRow.address_detail].filter(Boolean).join(" ")
        : "";

      const updRes = await client.query(
        `UPDATE erp_rental_contracts
         SET entity_type = $1,
             partner_id = COALESCE($2, partner_id),
             site_name = COALESCE($3, site_name),
             asset_id = COALESCE($4, asset_id),
             start_date = $5,
             end_date = $6,
             monthly_rate = $7,
             daily_rate = $8,
             vat_amount = $9,
             deposit = $10,
             billing_day = $11,
             status = 'ACTIVE',
             memo = COALESCE(NULLIF($12, ''), memo),
             customer_biz_no = COALESCE(NULLIF($13, ''), customer_biz_no),
             customer_ceo_name = COALESCE(NULLIF($14, ''), customer_ceo_name),
             customer_address = COALESCE(NULLIF($15, ''), customer_address),
             customer_biz_type = COALESCE(NULLIF($16, ''), customer_biz_type),
             customer_biz_class = COALESCE(NULLIF($17, ''), customer_biz_class),
             customer_email = COALESCE(NULLIF($18, ''), customer_email),
             customer_email2 = COALESCE(NULLIF($19, ''), customer_email2),
             tax_purpose = COALESCE(NULLIF($20, ''), tax_purpose, '청구'),
             tax_memo = COALESCE(NULLIF($21, ''), tax_memo, '{1번째 아이템} 외'),
             tax_items = $22::jsonb,
             contract_file_url = COALESCE($23, contract_file_url),
             contract_file_name = COALESCE($24, contract_file_name)
         WHERE id = $25
         RETURNING id, contract_no AS "contractNo", customer_name AS "customerName"`,
        [
          assignedEntity,
          partnerRow ? partnerRow.id : targetPartnerId ? parseInt(String(targetPartnerId), 10) : null,
          siteName !== undefined ? siteName : "",
          rentedList[0]?.id || assetsToAssign[0]?.id || null,
          startDate,
          endDate,
          sumSupply,
          Math.round(sumSupply / 30),
          sumVat,
          parseFloat(deposit || "0"),
          parseInt(billingDay || "25", 10),
          memo || "",
          customerBizNo || partnerRow?.business_no || "",
          customerCeoName || partnerRow?.ceo_name || "",
          customerAddress || partnerAddr || "",
          customerBizType || partnerRow?.biz_type || "",
          customerBizClass || partnerRow?.biz_item || "",
          customerEmail || partnerRow?.main_email || "",
          customerEmail2 || "",
          taxPurpose || "청구",
          taxMemo || "{1번째 아이템} 외",
          JSON.stringify(groupedItems),
          contractFileUrl || null,
          contractFileName || null,
          targetContractId,
        ]
      );
      savedContract = updRes.rows[0];

      // Audit log
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('RENTAL_CONTRACT', 'CREATE', $1, 'ADMIN', $2)`,
        [
          savedContract.contractNo,
          JSON.stringify({
            customerName: cleanCustomer,
            assignedCount: assetsToAssign.length,
            assetNos: assetsToAssign.map((a) => a.asset_no),
            monthlyRate: sumSupply,
            entityType: assignedEntity,
          }),
        ]
      );

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        contract: savedContract,
        assignedCount: assetsToAssign.length,
        totalActiveAssets: rentedList.length,
      });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST Rental Contract Error:", error);
    return NextResponse.json({ error: "임대계약 등록 실패: " + error.message }, { status: 500 });
  }
}

// PUT: Update rental contract (supports adding additional stock items via rentalItems)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      partnerId,
      customerName,
      siteName,
      rentalItems,
      startDate,
      endDate,
      monthlyRate,
      dailyRate,
      vatAmount,
      deposit,
      billingDay,
      status,
      memo,
      entityType,
      customerBizNo,
      customerCeoName,
      customerAddress,
      customerBizType,
      customerBizClass,
      customerEmail,
      customerEmail2,
      taxPurpose,
      taxMemo,
      taxItems,
      contractFileUrl,
      contractFileName,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "수정할 임대계약 식별자(ID)가 필요합니다." }, { status: 400 });
    }

    if (!customerName || !startDate || !endDate) {
      return NextResponse.json({ error: "고객사, 계약 시작일, 종료일은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const contractRes = await client.query(
        "SELECT id, contract_no, customer_name, asset_id, entity_type, tax_items FROM erp_rental_contracts WHERE id = $1 FOR UPDATE",
        [parseInt(String(id), 10)]
      );
      if (contractRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "해당 계약을 찾을 수 없습니다." }, { status: 404 });
      }
      const existing = contractRes.rows[0];
      const cleanCustomer = customerName.trim();

      // 추가 배정할 재고 제품(rentalItems)이 전달된 경우 가용 자산에서 수량만큼 RENTED 전환
      if (Array.isArray(rentalItems) && rentalItems.length > 0) {
        for (const item of rentalItems) {
          const prodId = parseInt(String(item.productId || "0"), 10);
          const reqQty = Math.max(0, parseInt(String(item.qty || "0"), 10));
          const unitCost = Math.round(parseFloat(String(item.unitCost ?? item.unitPrice ?? "0")) || 0);
          if (!prodId || reqQty <= 0) continue;

          const availRes = await client.query(
            `SELECT a.id, a.asset_no, rp.model_name
             FROM erp_rental_assets a
             LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
             WHERE a.rental_product_id = $1 AND a.status = 'AVAILABLE'
             ORDER BY a.asset_no ASC
             LIMIT $2
             FOR UPDATE OF a`,
            [prodId, reqQty]
          );

          if (availRes.rows.length < reqQty) {
            const prodNameRes = await client.query(
              `SELECT model_name FROM erp_rental_products WHERE id = $1`,
              [prodId]
            );
            const mName = prodNameRes.rows[0]?.model_name || `제품ID#${prodId}`;
            throw new Error(
              `[${mName}] 제품의 임대가능 재고가 부족합니다. (요청: ${reqQty}대 / 가용재고: ${availRes.rows.length}대)`
            );
          }

          for (const row of availRes.rows) {
            await client.query(
              `UPDATE erp_rental_assets
               SET status = 'RENTED',
                   current_customer = $1,
                   current_site = NULL,
                   contract_no = $2,
                   current_contract_id = $3,
                   current_monthly_rate = $4,
                   outbound_date = $5,
                   updated_at = NOW()
               WHERE id = $6`,
              [cleanCustomer, existing.contract_no, existing.id, unitCost, startDate, row.id]
            );

            await client.query(
              `INSERT INTO erp_asset_inout_logs
               (asset_id, asset_no, event_type, event_date, customer_name, site_name, memo)
               VALUES ($1, $2, 'OUTBOUND', $3, $4, NULL, $5)`,
              [
                row.id,
                row.asset_no,
                startDate,
                cleanCustomer,
                `임대계약(${existing.contract_no}) 추가 제품 배정 출고 (단가: ₩${unitCost.toLocaleString()})`,
              ]
            );
          }
        }
      }

      const assignedEntity = entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
      let finalTaxItems = Array.isArray(taxItems) ? taxItems : existing.tax_items || [];
      let parsedMonthly = parseFloat(monthlyRate || "0");
      let parsedVat =
        vatAmount !== undefined && vatAmount !== null && vatAmount !== ""
          ? parseFloat(vatAmount)
          : Math.round(parsedMonthly * 0.1);

      if (Array.isArray(rentalItems) && rentalItems.length > 0) {
        const { taxItems: groupedItems } = await buildGroupedTaxItemsForContract(
          client,
          existing.id,
          cleanCustomer,
          startDate,
          finalTaxItems
        );
        if (groupedItems.length > 0) {
          finalTaxItems = groupedItems;
          parsedMonthly = groupedItems.reduce((acc: number, it: any) => acc + Number(it.supplyAmount || 0), 0);
          parsedVat = groupedItems.reduce((acc: number, it: any) => acc + Number(it.vatAmount || 0), 0);
        }
      }

      const normalizedTaxItems = Array.isArray(finalTaxItems) ? JSON.stringify(finalTaxItems) : null;

      const updateRes = await client.query(
        `
        UPDATE erp_rental_contracts
        SET
          entity_type = COALESCE($1, entity_type),
          partner_id = $2,
          customer_name = $3,
          site_name = $4,
          start_date = $5,
          end_date = $6,
          monthly_rate = $7,
          daily_rate = $8,
          vat_amount = $9,
          deposit = $10,
          billing_day = COALESCE($11, billing_day),
          status = COALESCE($12, status),
          memo = $13,
          customer_biz_no = COALESCE($14, customer_biz_no),
          customer_ceo_name = COALESCE($15, customer_ceo_name),
          customer_address = COALESCE($16, customer_address),
          customer_biz_type = COALESCE($17, customer_biz_type),
          customer_biz_class = COALESCE($18, customer_biz_class),
          customer_email = COALESCE($19, customer_email),
          customer_email2 = COALESCE($20, customer_email2),
          tax_purpose = COALESCE($21, tax_purpose),
          tax_memo = COALESCE($22, tax_memo),
          tax_items = COALESCE($23::jsonb, tax_items),
          contract_file_url = CASE WHEN $24::text = '__DELETE__' THEN NULL ELSE COALESCE($24, contract_file_url) END,
          contract_file_name = CASE WHEN $24::text = '__DELETE__' THEN NULL ELSE COALESCE($25, contract_file_name) END
        WHERE id = $26
        RETURNING id, contract_no AS "contractNo", customer_name AS "customerName", site_name AS "siteName"
        `,
        [
          assignedEntity,
          partnerId ? parseInt(String(partnerId), 10) : null,
          cleanCustomer,
          siteName || "",
          startDate,
          endDate,
          parsedMonthly,
          parseFloat(dailyRate || String(Math.round(parsedMonthly / 30))),
          parsedVat,
          parseFloat(deposit || "0"),
          billingDay ? parseInt(String(billingDay), 10) : null,
          status || null,
          memo || "",
          customerBizNo !== undefined ? customerBizNo : null,
          customerCeoName !== undefined ? customerCeoName : null,
          customerAddress !== undefined ? customerAddress : null,
          customerBizType !== undefined ? customerBizType : null,
          customerBizClass !== undefined ? customerBizClass : null,
          customerEmail !== undefined ? customerEmail : null,
          customerEmail2 !== undefined ? customerEmail2 : null,
          taxPurpose || "청구",
          taxMemo !== undefined ? taxMemo : null,
          normalizedTaxItems,
          contractFileUrl || null,
          contractFileName || null,
          parseInt(String(id), 10),
        ]
      );

      // Sync customer to assigned assets
      await client.query(
        "UPDATE erp_rental_assets SET current_customer = $1, current_site = NULL, updated_at = NOW() WHERE current_contract_id = $2 OR id = $3",
        [cleanCustomer, existing.id, existing.asset_id]
      );

      // Audit log
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('RENTAL_CONTRACT', 'UPDATE', $1, 'ADMIN', $2)`,
        [existing.contract_no, JSON.stringify({ customerName: cleanCustomer, monthlyRate: parsedMonthly, entityType: assignedEntity })]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true, contract: updateRes.rows[0], message: "임대계약이 성공적으로 수정되었습니다." });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("PUT Rental Contract Error:", error);
    return NextResponse.json({ error: "임대계약 수정 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: Delete rental contract, restore asset to AVAILABLE, and clean unissued billings
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let idParam = searchParams.get("id");

    if (!idParam) {
      try {
        const body = await request.json();
        idParam = body.id;
      } catch (e) {
        // query param was empty and body not provided
      }
    }

    if (!idParam) {
      return NextResponse.json({ error: "삭제할 계약 식별자(ID)가 필요합니다." }, { status: 400 });
    }

    const contractId = parseInt(String(idParam), 10);
    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Verify existence & lock
      const ctRes = await client.query(
        "SELECT id, contract_no, customer_name, site_name, asset_id, status FROM erp_rental_contracts WHERE id = $1 FOR UPDATE",
        [contractId]
      );
      if (ctRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "삭제할 임대계약을 찾을 수 없습니다." }, { status: 404 });
      }
      const ct = ctRes.rows[0];

      // 2. Check if any billings have issued tax invoices
      const issuedCheck = await client.query(
        "SELECT id, billing_no FROM erp_rental_billings WHERE contract_id = $1 AND tax_invoice_id IS NOT NULL",
        [contractId]
      );
      if (issuedCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({
          error: `이미 국세청 전자세금계산서가 발행된 청구 내역(청구번호: ${issuedCheck.rows.map(r => r.billing_no).join(", ")})이 존재하여 계약을 삭제할 수 없습니다. 먼저 세금계산서 대장을 확인해 주십시오.`
        }, { status: 400 });
      }

      // 3. Delete unissued billings
      await client.query(
        "DELETE FROM erp_rental_billings WHERE contract_id = $1 AND tax_invoice_id IS NULL",
        [contractId]
      );

      // 4. Restore all assets assigned to this customer contract to AVAILABLE (헌장 1.2, 1.3 핵심 준수)
      await client.query(
        `UPDATE erp_rental_assets
         SET status = 'AVAILABLE',
             current_customer = NULL,
             current_site = NULL,
             contract_no = NULL,
             current_contract_id = NULL,
             current_monthly_rate = 0,
             outbound_date = NULL,
             updated_at = NOW()
         WHERE current_contract_id = $1 OR id = $2 OR current_customer = $3`,
        [contractId, ct.asset_id, ct.customer_name]
      );

      // 5. Delete the contract
      await client.query(
        "DELETE FROM erp_rental_contracts WHERE id = $1",
        [contractId]
      );

      // 6. Audit log
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('RENTAL_CONTRACT', 'DELETE', $1, 'ADMIN', $2)`,
        [ct.contract_no, JSON.stringify({ customerName: ct.customer_name, siteName: ct.site_name, assetId: ct.asset_id })]
      );

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        message: `임대계약 [${ct.contract_no}]이 삭제되었으며, 배정 자산이 '대여가능(AVAILABLE)' 상태로 자동 복구되었습니다.`
      });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("DELETE Rental Contract Error:", error);
    return NextResponse.json({ error: "임대계약 삭제 실패: " + error.message }, { status: 500 });
  }
}

// PATCH: Return asset / Terminate contract
export async function PATCH(request: Request) {
  try {
    const { contractId, action } = await request.json(); // action: 'RETURN'

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const contractRes = await client.query(
        "SELECT id, contract_no, customer_name, asset_id, status FROM erp_rental_contracts WHERE id = $1 FOR UPDATE",
        [contractId]
      );
      if (contractRes.rows.length === 0) throw new Error("계약을 찾을 수 없습니다.");
      const contract = contractRes.rows[0];

      // 1. Update contract status & reset monthly_rate / tax_items
      await client.query(
        "UPDATE erp_rental_contracts SET status = 'RETURNED', asset_id = NULL, monthly_rate = 0, daily_rate = 0, vat_amount = 0, tax_items = '[]'::jsonb WHERE id = $1",
        [contractId]
      );

      // 2. Rollback all rented assets of this customer contract to AVAILABLE
      await client.query(
        `UPDATE erp_rental_assets
         SET status = 'AVAILABLE',
             current_customer = NULL,
             current_site = NULL,
             contract_no = NULL,
             current_contract_id = NULL,
             current_monthly_rate = 0,
             outbound_date = NULL,
             updated_at = NOW()
         WHERE current_contract_id = $1 OR id = $2 OR current_customer = $3`,
        [contractId, contract.asset_id, contract.customer_name]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true, message: "장비 회수 및 계약 반납이 완료되었습니다." });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("PATCH Rental Contract Error:", error);
    return NextResponse.json({ error: "계약 상태 변경 실패: " + error.message }, { status: 500 });
  }
}
