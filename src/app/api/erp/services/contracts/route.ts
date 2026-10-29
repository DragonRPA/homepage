import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// GET: List all service contracts (filter by service_type: 'OPERATIONAL' or 'DEVELOPMENT' & entityType, or id for single contract file)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const serviceType = searchParams.get("serviceType");
    const entityType = searchParams.get("entityType");

    const pool = getErpPool();

    if (idParam) {
      const singleRes = await pool.query(
        `
        SELECT 
          id,
          contract_no AS "contractNo",
          customer_name AS "customerName",
          project_name AS "projectName",
          contract_file_url AS "contractFileUrl",
          contract_file_name AS "contractFileName"
        FROM erp_service_contracts
        WHERE id = $1
        LIMIT 1
        `,
        [parseInt(idParam, 10)]
      );
      if (singleRes.rows.length === 0) {
        return NextResponse.json({ error: "해당 계약을 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({ success: true, contract: singleRes.rows[0] });
    }

    let query = `
      SELECT 
        id,
        contract_no as "contractNo",
        entity_type as "entityType",
        service_type as "serviceType",
        partner_id as "partnerId",
        customer_name as "customerName",
        project_name as "projectName",
        contract_amount as "contractAmount",
        monthly_fee as "monthlyFee",
        start_date as "startDate",
        end_date as "endDate",
        billing_day as "billingDay",
        status,
        memo,
        contract_file_name as "contractFileName",
        (contract_file_url IS NOT NULL AND contract_file_url <> '') as "hasContractFile",
        created_at as "createdAt"
      FROM erp_service_contracts
      WHERE 1=1
    `;
    const params: any[] = [];
    if (serviceType && serviceType !== "ALL") {
      params.push(serviceType);
      query += ` AND service_type = $${params.length}`;
    }
    if (entityType && entityType !== "ALL") {
      params.push(entityType);
      query += ` AND entity_type = $${params.length}`;
    }
    query += " ORDER BY start_date DESC, id DESC";

    const res = await pool.query(query, params);
    return NextResponse.json({ success: true, contracts: res.rows });
  } catch (error: any) {
    console.error("GET Service Contracts Error:", error);
    return NextResponse.json({ error: "용역 계약 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Create service contract
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      serviceType,
      partnerId,
      customerName,
      projectName,
      contractAmount,
      monthlyFee,
      startDate,
      endDate,
      billingDay,
      memo,
      entityType,
      contractFileUrl,
      contractFileName,
    } = body;

    if (!serviceType || !customerName || !projectName || !startDate || !endDate) {
      return NextResponse.json({ error: "용역 구분, 고객사, 프로젝트명, 계약 기간은 필수입니다." }, { status: 400 });
    }

    const assignedEntity = entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
    const prefix = serviceType === "OPERATIONAL" ? "OP" : "DEV";
    const contractNo = `${prefix}${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const pool = getErpPool();
    const insRes = await pool.query(
      `
      INSERT INTO erp_service_contracts (
        contract_no, entity_type, service_type, partner_id, customer_name, project_name,
        contract_amount, monthly_fee, start_date, end_date, billing_day, status, memo,
        contract_file_url, contract_file_name
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE', $12, $13, $14
      ) RETURNING id, contract_no AS "contractNo", customer_name AS "customerName", project_name AS "projectName"
      `,
      [
        contractNo,
        assignedEntity,
        serviceType,
        partnerId ? parseInt(String(partnerId), 10) : null,
        customerName.trim(),
        projectName.trim(),
        parseFloat(contractAmount || "0"),
        parseFloat(monthlyFee || "0"),
        startDate,
        endDate,
        parseInt(billingDay || "25", 10),
        memo || "",
        contractFileUrl || null,
        contractFileName || null,
      ]
    );

    // Audit log
    await pool.query(
      `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
       VALUES ('SERVICE_CONTRACT', 'CREATE', $1, 'ADMIN', $2)`,
      [contractNo, JSON.stringify({ customerName, projectName, contractAmount, monthlyFee, entityType: assignedEntity })]
    );

    return NextResponse.json({ success: true, contract: insRes.rows[0] });
  } catch (error: any) {
    console.error("POST Service Contract Error:", error);
    return NextResponse.json({ error: "용역 계약 등록 실패: " + error.message }, { status: 500 });
  }
}

// PUT: Update service contract
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      serviceType,
      partnerId,
      customerName,
      projectName,
      contractAmount,
      monthlyFee,
      startDate,
      endDate,
      billingDay,
      status,
      memo,
      entityType,
      contractFileUrl,
      contractFileName,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "수정할 계약 식별자(ID)가 필요합니다." }, { status: 400 });
    }

    if (!customerName || !projectName || !startDate || !endDate) {
      return NextResponse.json({ error: "고객사, 프로젝트명, 계약 기간은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const assignedEntity = entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";

    const updateRes = await pool.query(
      `
      UPDATE erp_service_contracts
      SET
        service_type = COALESCE($1, service_type),
        entity_type = COALESCE($2, entity_type),
        partner_id = $3,
        customer_name = $4,
        project_name = $5,
        contract_amount = $6,
        monthly_fee = $7,
        start_date = $8,
        end_date = $9,
        billing_day = $10,
        status = COALESCE($11, status),
        memo = $12,
        contract_file_url = CASE WHEN $13::text = '__DELETE__' THEN NULL ELSE COALESCE($13, contract_file_url) END,
        contract_file_name = CASE WHEN $13::text = '__DELETE__' THEN NULL ELSE COALESCE($14, contract_file_name) END
      WHERE id = $15
      RETURNING id, contract_no AS "contractNo", customer_name AS "customerName", project_name AS "projectName"
      `,
      [
        serviceType || null,
        assignedEntity,
        partnerId ? parseInt(String(partnerId), 10) : null,
        customerName.trim(),
        projectName.trim(),
        parseFloat(contractAmount || "0"),
        parseFloat(monthlyFee || "0"),
        startDate,
        endDate,
        parseInt(billingDay || "25", 10),
        status || null,
        memo || "",
        contractFileUrl || null,
        contractFileName || null,
        parseInt(String(id), 10),
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: "해당 계약을 찾을 수 없습니다." }, { status: 404 });
    }

    const updated = updateRes.rows[0];

    // Audit log
    await pool.query(
      `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
       VALUES ('SERVICE_CONTRACT', 'UPDATE', $1, 'ADMIN', $2)`,
      [updated.contractNo, JSON.stringify({ customerName, projectName, contractAmount, monthlyFee, entityType: assignedEntity })]
    );

    return NextResponse.json({ success: true, contract: updated, message: "계약 정보가 성공적으로 수정되었습니다." });
  } catch (error: any) {
    console.error("PUT Service Contract Error:", error);
    return NextResponse.json({ error: "용역 계약 수정 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: Delete service contract (and related unissued billings)
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

      // 1. Verify existence
      const ctRes = await client.query(
        "SELECT id, contract_no, customer_name, project_name FROM erp_service_contracts WHERE id = $1 FOR UPDATE",
        [contractId]
      );
      if (ctRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "삭제할 계약을 찾을 수 없습니다." }, { status: 404 });
      }
      const ct = ctRes.rows[0];

      // 2. Check if any billings have issued tax invoices
      const issuedCheck = await client.query(
        "SELECT id, billing_no FROM erp_service_billings WHERE contract_id = $1 AND tax_invoice_id IS NOT NULL",
        [contractId]
      );
      if (issuedCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({
          error: `이미 국세청 세금계산서가 발행된 청구 내역(청구번호: ${issuedCheck.rows.map(r => r.billing_no).join(", ")})이 존재하여 계약을 삭제할 수 없습니다. 먼저 세금계산서 대장을 확인해 주십시오.`
        }, { status: 400 });
      }

      // 3. Delete unissued billings
      await client.query(
        "DELETE FROM erp_service_billings WHERE contract_id = $1 AND tax_invoice_id IS NULL",
        [contractId]
      );

      // 4. Delete the contract
      await client.query(
        "DELETE FROM erp_service_contracts WHERE id = $1",
        [contractId]
      );

      // 5. Audit log
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('SERVICE_CONTRACT', 'DELETE', $1, 'ADMIN', $2)`,
        [ct.contract_no, JSON.stringify({ customerName: ct.customer_name, projectName: ct.project_name })]
      );

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        message: `계약 [${ct.contract_no}] 및 연계된 미발행 청구 내역이 성공적으로 삭제되었습니다.`
      });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("DELETE Service Contract Error:", error);
    return NextResponse.json({ error: "용역 계약 삭제 실패: " + error.message }, { status: 500 });
  }
}
