import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

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

    return NextResponse.json({ success: true, contract: insRes.rows[0] });
  } catch (error: any) {
    console.error("POST Service Contract Error:", error);
    return NextResponse.json({ error: "용역 계약 등록 실패: " + error.message }, { status: 500 });
  }
}
