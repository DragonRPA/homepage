import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// GET: List all rental contracts
export async function GET() {
  try {
    const pool = getErpPool();
    const query = `
      SELECT 
        c.id,
        c.contract_no as "contractNo",
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
        c.created_at as "createdAt"
      FROM erp_rental_contracts c
      JOIN erp_rental_assets a ON c.asset_id = a.id
      JOIN erp_rental_products rp ON a.rental_product_id = rp.id
      ORDER BY c.start_date DESC, c.id DESC
    `;
    const res = await pool.query(query);
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
    const { customerName, siteName, assetId, startDate, endDate, monthlyRate, dailyRate, deposit, memo } = body;

    if (!customerName || !assetId || !startDate || !endDate) {
      return NextResponse.json({ error: "고객사, 자산, 계약시작일, 종료일은 필수입니다." }, { status: 400 });
    }

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
         (contract_no, customer_name, site_name, asset_id, start_date, end_date, monthly_rate, daily_rate, deposit, status, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', $10)
         RETURNING *`,
        [
          contractNo, 
          customerName.trim(), 
          siteName || "본사/지정현장", 
          assetId, 
          startDate, 
          endDate, 
          parseFloat(monthlyRate || "0"), 
          parseFloat(dailyRate || "0"), 
          parseFloat(deposit || "0"), 
          memo || ""
        ]
      );

      // 2. Set asset status to RENTED (헌장 1.3 준수)
      await client.query(
        "UPDATE erp_rental_assets SET status = 'RENTED', updated_at = NOW() WHERE id = $1",
        [assetId]
      );

      // 3. Audit log
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('RENTAL_CONTRACT', 'CREATE', $1, 'ADMIN', $2)`,
        [contractNo, JSON.stringify({ customerName, assetNo: assetCheck.rows[0].asset_no, monthlyRate })]
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
        "UPDATE erp_rental_assets SET status = 'AVAILABLE', updated_at = NOW() WHERE id = $1",
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
