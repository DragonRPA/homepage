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
        c.deposit,
        c.status,
        c.memo,
        c.contract_file_name as "contractFileName",
        (c.contract_file_url IS NOT NULL AND c.contract_file_url <> '') as "hasContractFile",
        c.created_at as "createdAt"
      FROM erp_rental_contracts c
      LEFT JOIN erp_rental_assets a ON c.asset_id = a.id
      LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
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
      deposit,
      memo,
      entityType,
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
        "SELECT id, asset_no, status FROM erp_rental_assets WHERE id = $1 FOR UPDATE",
        [assetId]
      );
      if (assetCheck.rows.length === 0) {
        throw new Error("지정된 자산이 존재하지 않습니다.");
      }
      if (assetCheck.rows[0].status === "RENTED") {
        throw new Error("해당 자산은 이미 타 계약에서 대여중(RENTED)입니다.");
      }

      const contractNo = `RC${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Insert contract
      const insRes = await client.query(
        `INSERT INTO erp_rental_contracts
         (contract_no, entity_type, partner_id, customer_name, site_name, asset_id, start_date, end_date, monthly_rate, daily_rate, deposit, status, memo, contract_file_url, contract_file_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE', $12, $13, $14)
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
          parseFloat(monthlyRate || "0"), 
          parseFloat(dailyRate || "0"), 
          parseFloat(deposit || "0"), 
          memo || "",
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
