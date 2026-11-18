export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { ensureRentalRateSchema } from "@/lib/rentalSchemaInit";
import { ensureForkliftSchema } from "@/lib/forkliftSchemaInit";
import { assertPartnerTradable, PartnerTradeBlockedError } from "@/lib/partnerStatusService";
import { normalizeAttachedOptions } from "@/lib/forkliftDomain";
import { parseNumericInput } from "@/lib/rentalFeeUtils";
import {
  assignAssetsToRentalContractBatchTx,
  buildContractTaxSummaryTx,
  normalizeRentalContractRows,
  releaseContractAssetsTx,
  reserveRentalContractAssetsTx,
  resolveContractRateTerms,
  resolveExistingContractAndPartnerTx,
  syncPartnerTaxEmailsTx,
} from "@/lib/erpRentalContractService";

function resolvePostPartnerTaxFields(body: any, partnerRow: any) {
  const partnerAddr = partnerRow
    ? [partnerRow.address, partnerRow.address_detail].filter(Boolean).join(" ")
    : "";
  return [
    body.customerBizNo || partnerRow?.business_no || "",
    body.customerCeoName || partnerRow?.ceo_name || "",
    body.customerAddress || partnerAddr || "",
    body.customerBizType || partnerRow?.biz_type || "",
    body.customerBizClass || partnerRow?.biz_item || "",
    body.customerEmail || partnerRow?.main_email || "",
    body.customerEmail2 || partnerRow?.sub_email || "",
    body.taxPurpose || "청구",
    body.taxMemo || "{1번째 아이템} 외",
  ];
}

// GET: List all rental contracts (optionally filter by entityType, or id for single contract file)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const entityType = searchParams.get("entityType");

    const pool = getErpPool();
    await ensureRentalRateSchema(pool);
    await ensureForkliftSchema(pool);

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
        COALESCE(c.rate_basis, 'MONTHLY') as "rateBasis",
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
        COALESCE(NULLIF(c.customer_email2, ''), p.sub_email, '') as "customerEmail2",
        COALESCE(c.tax_purpose, '청구') as "taxPurpose",
        COALESCE(c.tax_memo, '{1번째 아이템} 외') as "taxMemo",
        COALESCE(c.tax_items, '[]'::jsonb) as "taxItems",
        COALESCE(c.attached_options, '[]'::jsonb) as "attachedOptions",
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
              'dailyRate', COALESCE(NULLIF(ra.current_daily_rate, 0), rprod.standard_daily_rate, 0),
              'attachedOptions', COALESCE(ra.attached_options, '[]'::jsonb),
              'operatingHours', COALESCE(ra.operating_hours, 0),
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
    return NextResponse.json({
      success: true,
      contracts: normalizeRentalContractRows(res.rows),
    });
  } catch (error: any) {
    console.error("GET Rental Contracts Error:", error);
    return NextResponse.json({ error: "임대계약 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Create or append to rental contract (Sets asset status to RENTED per 헌장 1.3)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      baseContractId, partnerId, customerName, siteName, assetId, rentalItems,
      startDate, endDate, monthlyRate, dailyRate, rateBasis, vatAmount, deposit,
      billingDay, memo, entityType, customerBizNo, customerEmail, customerEmail2,
      taxItems, contractFileUrl, contractFileName,
    } = body;

    if ((!customerName && !baseContractId) || !startDate || !endDate) {
      return NextResponse.json({ error: "기본 계약(고객사), 계약시작일, 종료일은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    await ensureRentalRateSchema(pool);
    await ensureForkliftSchema(pool);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. 기본 계약(baseContractId) 또는 고객사(customerName) 기준으로 기존 계약·거래처 조회
      const { existingCt, cleanCustomer, targetPartnerId, partnerRow } =
        await resolveExistingContractAndPartnerTx(client, {
          baseContractId,
          customerName,
          partnerId,
        });

      await assertPartnerTradable(client, {
        partnerId: targetPartnerId,
        customerName: cleanCustomer,
        businessNo: customerBizNo,
      });

      const assignedEntity =
        entityType === "INDIVIDUAL"
          ? "INDIVIDUAL"
          : entityType === "CORP"
          ? "CORP"
          : existingCt?.entity_type || "CORP";

      // 2. 배정할 자산 목록 확보 (rentalItems: [{ productId, qty, unitCost, dailyRate }] 또는 단일 assetId)
      const assetsToAssign = await reserveRentalContractAssetsTx(client, {
        rentalItems,
        assetId,
        monthlyRate,
        dailyRate,
      });

      const initialRates = resolveContractRateTerms({
        monthlyRate,
        dailyRate,
        rateBasis,
        vatAmount,
      });
      const parsedMonthly = initialRates.monthlyRate;
      const initialBasis = initialRates.rateBasis;
      const initialDaily = initialRates.dailyRate;
      const parsedVat = initialRates.vatAmount;

      const normalizedAttachedOptions = normalizeAttachedOptions(body.attachedOptions);
      const partnerTaxFields = resolvePostPartnerTaxFields(body, partnerRow);
      const resolvedPartnerId = partnerRow ? partnerRow.id : targetPartnerId;

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
        const insRes = await client.query(
          `INSERT INTO erp_rental_contracts
           (contract_no, entity_type, partner_id, customer_name, site_name, asset_id, start_date, end_date,
            monthly_rate, daily_rate, rate_basis, vat_amount, deposit, billing_day, status, memo,
            customer_biz_no, customer_ceo_name, customer_address, customer_biz_type, customer_biz_class,
            customer_email, customer_email2, tax_purpose, tax_memo, tax_items,
            attached_options, contract_file_url, contract_file_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'ACTIVE', $15,
                   $16, $17, $18, $19, $20, $21, $22, $23, $24, '[]'::jsonb, $25::jsonb, $26, $27)
           RETURNING id, contract_no AS "contractNo", customer_name AS "customerName"`,
          [
            targetContractNo,
            assignedEntity,
            resolvedPartnerId,
            cleanCustomer,
            siteName || "",
            assetsToAssign[0]?.id || null,
            startDate,
            endDate,
            parsedMonthly,
            initialDaily,
            initialBasis,
            parsedVat,
            parseNumericInput(deposit || "0"),
            parseInt(billingDay || "25", 10),
            memo || "",
            ...partnerTaxFields,
            JSON.stringify(normalizedAttachedOptions),
            contractFileUrl || null,
            contractFileName || null,
          ]
        );
        savedContract = insRes.rows[0];
        targetContractId = savedContract.id;
      }

      // 3. 선택된 제품 재고 자산들을 배치로 RENTED 전환 및 입출고 로그(OUTBOUND) 일괄 기록
      await assignAssetsToRentalContractBatchTx(client, {
        assets: assetsToAssign,
        customerName: cleanCustomer,
        contractNo: targetContractNo,
        contractId: targetContractId,
        startDate,
        attachedOptions: normalizedAttachedOptions,
        isAdditional: false,
      });

      // 4. 계약에 속한 전체 RENTED 자산을 제품+단가 기준으로 그룹핑하여 계약 금액 및 tax_items 최신화
      const mergedContractOptions =
        normalizedAttachedOptions.length > 0
          ? normalizedAttachedOptions
          : normalizeAttachedOptions(existingCt?.attached_options);

      const { rentedList, groupedItems, sumSupply, sumVat } = await buildContractTaxSummaryTx(
        client,
        {
          contractId: targetContractId,
          customerName: cleanCustomer,
          startDate,
          fallbackItems:
            Array.isArray(taxItems) && taxItems.length > 0 ? taxItems : existingCt?.tax_items || [],
          attachedOptions: mergedContractOptions,
        }
      );

      const effectiveSupply = sumSupply || parsedMonthly;
      const effectiveVat = sumVat || parsedVat;
      const finalRates = resolveContractRateTerms({
        monthlyRate: effectiveSupply,
        dailyRate,
        rateBasis: rateBasis || existingCt?.rate_basis,
        vatAmount: effectiveVat,
      });

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
             rate_basis = $9,
             vat_amount = $10,
             deposit = $11,
             billing_day = $12,
             status = 'ACTIVE',
             memo = COALESCE(NULLIF($13, ''), memo),
             customer_biz_no = COALESCE(NULLIF($14, ''), customer_biz_no),
             customer_ceo_name = COALESCE(NULLIF($15, ''), customer_ceo_name),
             customer_address = COALESCE(NULLIF($16, ''), customer_address),
             customer_biz_type = COALESCE(NULLIF($17, ''), customer_biz_type),
             customer_biz_class = COALESCE(NULLIF($18, ''), customer_biz_class),
             customer_email = COALESCE(NULLIF($19, ''), customer_email),
             customer_email2 = COALESCE(NULLIF($20, ''), customer_email2),
             tax_purpose = COALESCE(NULLIF($21, ''), tax_purpose, '청구'),
             tax_memo = COALESCE(NULLIF($22, ''), tax_memo, '{1번째 아이템} 외'),
             tax_items = $23::jsonb,
             contract_file_url = COALESCE($24, contract_file_url),
             contract_file_name = COALESCE($25, contract_file_name),
             attached_options = CASE WHEN jsonb_array_length($27::jsonb) > 0 THEN $27::jsonb ELSE attached_options END
         WHERE id = $26
         RETURNING id, contract_no AS "contractNo", customer_name AS "customerName"`,
        [
          assignedEntity,
          resolvedPartnerId,
          siteName !== undefined ? siteName : "",
          rentedList[0]?.id || assetsToAssign[0]?.id || null,
          startDate,
          endDate,
          effectiveSupply,
          finalRates.dailyRate,
          finalRates.rateBasis,
          effectiveVat,
          parseNumericInput(deposit || "0"),
          parseInt(billingDay || "25", 10),
          memo || "",
          ...partnerTaxFields,
          JSON.stringify(groupedItems),
          contractFileUrl || null,
          contractFileName || null,
          targetContractId,
          JSON.stringify(mergedContractOptions),
        ]
      );
      savedContract = updRes.rows[0];

      // 임대계약에서 입력한 이메일을 거래처(erp_partners)에도 자동 동기화
      await syncPartnerTaxEmailsTx(client, {
        email1: customerEmail,
        email2: customerEmail2,
        partnerId: resolvedPartnerId,
        customerName: cleanCustomer,
      });

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
            monthlyRate: effectiveSupply,
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
    if (error instanceof PartnerTradeBlockedError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("POST Rental Contract Error:", error);
    return NextResponse.json({ error: "임대계약 등록 실패: " + error.message }, { status: 500 });
  }
}

// PUT: Update rental contract (supports adding additional stock items via rentalItems)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id, partnerId, customerName, siteName, rentalItems, startDate, endDate,
      monthlyRate, dailyRate, rateBasis, vatAmount, deposit, billingDay, status, memo,
      entityType, customerBizNo, customerCeoName, customerAddress, customerBizType,
      customerBizClass, customerEmail, customerEmail2, taxPurpose, taxMemo, taxItems,
      contractFileUrl, contractFileName,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "수정할 임대계약 식별자(ID)가 필요합니다." }, { status: 400 });
    }

    if (!customerName || !startDate || !endDate) {
      return NextResponse.json({ error: "고객사, 계약 시작일, 종료일은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    await ensureRentalRateSchema(pool);
    await ensureForkliftSchema(pool);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const contractRes = await client.query(
        "SELECT id, contract_no, customer_name, asset_id, entity_type, tax_items, rate_basis FROM erp_rental_contracts WHERE id = $1 FOR UPDATE",
        [parseInt(String(id), 10)]
      );
      if (contractRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "해당 계약을 찾을 수 없습니다." }, { status: 404 });
      }
      const existing = contractRes.rows[0];
      const cleanCustomer = customerName.trim();

      const normalizedPutOptions =
        body.attachedOptions !== undefined ? normalizeAttachedOptions(body.attachedOptions) : null;

      // 추가 배정할 재고 제품(rentalItems)이 전달된 경우 배치 선점 후 RENTED 전환 및 로그 일괄 기록
      const hasAddedRentalItems = Array.isArray(rentalItems) && rentalItems.length > 0;
      if (hasAddedRentalItems) {
        const addedAssets = await reserveRentalContractAssetsTx(client, { rentalItems });
        await assignAssetsToRentalContractBatchTx(client, {
          assets: addedAssets,
          customerName: cleanCustomer,
          contractNo: existing.contract_no,
          contractId: existing.id,
          startDate,
          attachedOptions: normalizedPutOptions ?? [],
          isAdditional: true,
        });
      }

      const assignedEntity = entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
      let finalTaxItems = Array.isArray(taxItems) ? taxItems : existing.tax_items || [];
      const baseRates = resolveContractRateTerms({
        monthlyRate: monthlyRate || "0",
        dailyRate,
        rateBasis: rateBasis || existing.rate_basis,
        vatAmount,
      });
      let parsedMonthly = baseRates.monthlyRate;
      let parsedVat = baseRates.vatAmount;

      if (hasAddedRentalItems) {
        const { groupedItems, sumSupply, sumVat } = await buildContractTaxSummaryTx(client, {
          contractId: existing.id,
          customerName: cleanCustomer,
          startDate,
          fallbackItems: finalTaxItems,
          attachedOptions: normalizedPutOptions ?? [],
        });
        if (groupedItems.length > 0) {
          finalTaxItems = groupedItems;
          parsedMonthly = sumSupply;
          parsedVat = sumVat;
        }
      }

      const resolvedRates = resolveContractRateTerms({
        monthlyRate: parsedMonthly,
        dailyRate,
        rateBasis: rateBasis || existing.rate_basis,
        vatAmount: parsedVat,
      });
      const resolvedBasis = resolvedRates.rateBasis;
      const resolvedDaily = resolvedRates.dailyRate;

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
          rate_basis = $9,
          vat_amount = $10,
          deposit = $11,
          billing_day = COALESCE($12, billing_day),
          status = COALESCE($13, status),
          memo = $14,
          customer_biz_no = COALESCE($15, customer_biz_no),
          customer_ceo_name = COALESCE($16, customer_ceo_name),
          customer_address = COALESCE($17, customer_address),
          customer_biz_type = COALESCE($18, customer_biz_type),
          customer_biz_class = COALESCE($19, customer_biz_class),
          customer_email = COALESCE($20, customer_email),
          customer_email2 = COALESCE($21, customer_email2),
          tax_purpose = COALESCE($22, tax_purpose),
          tax_memo = COALESCE($23, tax_memo),
          tax_items = COALESCE($24::jsonb, tax_items),
          contract_file_url = CASE WHEN $25::text = '__DELETE__' THEN NULL ELSE COALESCE($25, contract_file_url) END,
          contract_file_name = CASE WHEN $25::text = '__DELETE__' THEN NULL ELSE COALESCE($26, contract_file_name) END,
          attached_options = COALESCE($28::jsonb, attached_options)
        WHERE id = $27
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
          resolvedDaily,
          resolvedBasis,
          parsedVat,
          parseNumericInput(deposit || "0"),
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
          normalizedPutOptions ? JSON.stringify(normalizedPutOptions) : null,
        ]
      );

      // Sync customer to assigned assets
      await client.query(
        "UPDATE erp_rental_assets SET current_customer = $1, current_site = NULL, updated_at = NOW() WHERE current_contract_id = $2 OR id = $3",
        [cleanCustomer, existing.id, existing.asset_id]
      );

      // 임대계약 수정 시 입력한 이메일을 거래처(erp_partners)에도 자동 동기화
      await syncPartnerTaxEmailsTx(client, {
        email1: customerEmail,
        email2: customerEmail2,
        partnerId: partnerId ? parseInt(String(partnerId), 10) : null,
        customerName: cleanCustomer,
        businessNo: customerBizNo,
      });

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
      await releaseContractAssetsTx(client, {
        contractId,
        fallbackAssetId: ct.asset_id,
        customerName: ct.customer_name,
      });

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
      await releaseContractAssetsTx(client, {
        contractId,
        fallbackAssetId: contract.asset_id,
        customerName: contract.customer_name,
      });

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
