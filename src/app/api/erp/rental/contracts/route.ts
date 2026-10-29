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
        a.asset_no as "assetNo",
        rp.model_name as "modelName",
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
        COALESCE(c.tax_memo, '') as "taxMemo",
        COALESCE(c.tax_items, '[]'::jsonb) as "taxItems",
        c.contract_file_name as "contractFileName",
        (c.contract_file_url IS NOT NULL AND c.contract_file_url <> '') as "hasContractFile",
        c.created_at as "createdAt"
      FROM erp_rental_contracts c
      LEFT JOIN erp_rental_assets a ON c.asset_id = a.id
      LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
      LEFT JOIN erp_partners p ON c.partner_id = p.id OR (c.partner_id IS NULL AND c.customer_name = p.name)
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

// POST: Create rental contract (Sets asset status to RENTED per 헌장 1.3)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      partnerId,
      customerName,
      siteName,
      assetId,
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

    if (!customerName || !assetId || !startDate || !endDate) {
      return NextResponse.json({ error: "고객사, 자산, 계약시작일, 종료일은 필수입니다." }, { status: 400 });
    }

    const assignedEntity = entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Verify asset availability
      const assetCheck = await client.query(
        `SELECT a.id, a.asset_no, a.status, rp.model_name
         FROM erp_rental_assets a
         LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
         WHERE a.id = $1 FOR UPDATE`,
        [assetId]
      );
      if (assetCheck.rows.length === 0) {
        throw new Error("지정된 자산이 존재하지 않습니다.");
      }
      if (assetCheck.rows[0].status === "RENTED") {
        throw new Error("해당 자산은 이미 타 계약에서 대여중(RENTED)입니다.");
      }

      const contractNo = `RC${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      const parsedMonthly = parseFloat(monthlyRate || "0");
      const parsedVat = vatAmount !== undefined && vatAmount !== null && vatAmount !== ""
        ? parseFloat(vatAmount)
        : Math.round(parsedMonthly * 0.1);
      const defaultItemName = `${assetCheck.rows[0].model_name || "임대장비"} (${assetCheck.rows[0].asset_no})`;
      const normalizedTaxItems = Array.isArray(taxItems) && taxItems.length > 0
        ? taxItems
        : [
            {
              itemName: defaultItemName,
              spec: "",
              qty: 1,
              unitPrice: parsedMonthly,
              supplyAmount: parsedMonthly,
              vatAmount: parsedVat,
              remark: "",
            },
          ];

      // 1. Insert contract
      const insRes = await client.query(
        `INSERT INTO erp_rental_contracts
         (contract_no, entity_type, partner_id, customer_name, site_name, asset_id, start_date, end_date,
          monthly_rate, daily_rate, vat_amount, deposit, billing_day, status, memo,
          customer_biz_no, customer_ceo_name, customer_address, customer_biz_type, customer_biz_class,
          customer_email, customer_email2, tax_purpose, tax_memo, tax_items,
          contract_file_url, contract_file_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'ACTIVE', $14,
                 $15, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb, $25, $26)
         RETURNING id, contract_no AS "contractNo", customer_name AS "customerName"`,
        [
          contractNo, 
          assignedEntity,
          partnerId ? parseInt(String(partnerId), 10) : null,
          customerName.trim(), 
          siteName || "본사/지정현장", 
          assetId, 
          startDate, 
          endDate, 
          parsedMonthly, 
          parseFloat(dailyRate || "0"), 
          parsedVat,
          parseFloat(deposit || "0"), 
          parseInt(billingDay || "25", 10),
          memo || "",
          customerBizNo || "",
          customerCeoName || "",
          customerAddress || "",
          customerBizType || "",
          customerBizClass || "",
          customerEmail || "",
          customerEmail2 || "",
          taxPurpose || "청구",
          taxMemo || `임대료-${assetCheck.rows[0].model_name || assetCheck.rows[0].asset_no}`,
          JSON.stringify(normalizedTaxItems),
          contractFileUrl || null,
          contractFileName || null,
        ]
      );

      // 2. Set asset status to RENTED (헌장 1.3 준수)
      await client.query(
        "UPDATE erp_rental_assets SET status = 'RENTED', current_customer = $1, current_site = $2, contract_no = $3, updated_at = NOW() WHERE id = $4",
        [customerName.trim(), siteName || "본사/지정현장", contractNo, assetId]
      );

      // 3. Audit log
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('RENTAL_CONTRACT', 'CREATE', $1, 'ADMIN', $2)`,
        [contractNo, JSON.stringify({ customerName, assetNo: assetCheck.rows[0].asset_no, monthlyRate, entityType: assignedEntity })]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true, contract: insRes.rows[0] });
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

// PUT: Update rental contract
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      partnerId,
      customerName,
      siteName,
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
        "SELECT id, contract_no, asset_id, entity_type FROM erp_rental_contracts WHERE id = $1 FOR UPDATE",
        [parseInt(String(id), 10)]
      );
      if (contractRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "해당 계약을 찾을 수 없습니다." }, { status: 404 });
      }
      const existing = contractRes.rows[0];

      const assignedEntity = entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
      const parsedMonthly = parseFloat(monthlyRate || "0");
      const parsedVat = vatAmount !== undefined && vatAmount !== null && vatAmount !== ""
        ? parseFloat(vatAmount)
        : Math.round(parsedMonthly * 0.1);
      const normalizedTaxItems = Array.isArray(taxItems) ? JSON.stringify(taxItems) : null;

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
          customerName.trim(),
          siteName || "본사/지정현장",
          startDate,
          endDate,
          parsedMonthly,
          parseFloat(dailyRate || "0"),
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

      // Sync customer & site to asset
      if (existing.asset_id) {
        await client.query(
          "UPDATE erp_rental_assets SET current_customer = $1, current_site = $2, updated_at = NOW() WHERE id = $3",
          [customerName.trim(), siteName || "본사/지정현장", existing.asset_id]
        );
      }

      // Audit log
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('RENTAL_CONTRACT', 'UPDATE', $1, 'ADMIN', $2)`,
        [existing.contract_no, JSON.stringify({ customerName, siteName, monthlyRate, entityType: assignedEntity })]
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

      // 4. Restore asset to AVAILABLE (헌장 1.2, 1.3 핵심 준수)
      if (ct.asset_id) {
        await client.query(
          "UPDATE erp_rental_assets SET status = 'AVAILABLE', current_customer = NULL, current_site = NULL, contract_no = NULL, updated_at = NOW() WHERE id = $1",
          [ct.asset_id]
        );
      }

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
        "SELECT id, contract_no, asset_id, status FROM erp_rental_contracts WHERE id = $1 FOR UPDATE",
        [contractId]
      );
      if (contractRes.rows.length === 0) throw new Error("계약을 찾을 수 없습니다.");
      const contract = contractRes.rows[0];

      // 1. Update contract status
      await client.query(
        "UPDATE erp_rental_contracts SET status = 'RETURNED' WHERE id = $1",
        [contractId]
      );

      // 2. Rollback asset to AVAILABLE
      await client.query(
        "UPDATE erp_rental_assets SET status = 'AVAILABLE', current_customer = NULL, current_site = NULL, contract_no = NULL, updated_at = NOW() WHERE id = $1",
        [contract.asset_id]
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
