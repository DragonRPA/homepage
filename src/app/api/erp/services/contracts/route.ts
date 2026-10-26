import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: List all service contracts (filter by service_type: 'OPERATIONAL' or 'DEVELOPMENT' & entityType)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get("serviceType");
    const entityType = searchParams.get("entityType");

    const pool = getErpPool();
    let query = `
      SELECT 
        id,
        contract_no as "contractNo",
        entity_type as "entityType",
        service_type as "serviceType",
        customer_name as "customerName",
        project_name as "projectName",
        contract_amount as "contractAmount",
        monthly_fee as "monthlyFee",
        start_date as "startDate",
        end_date as "endDate",
        billing_day as "billingDay",
        status,
        memo,
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
    const { serviceType, customerName, projectName, contractAmount, monthlyFee, startDate, endDate, billingDay, memo, entityType } = body;

    if (!serviceType || !customerName || !projectName || !startDate || !endDate) {
      return NextResponse.json({ error: "용역 구분, 고객사, 프로젝트명, 계약 기간은 필수입니다." }, { status: 400 });
    }

    const assignedEntity = entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
    const prefix = serviceType === "OPERATIONAL" ? "OP" : "DEV";
    const contractNo = `${prefix}${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabaseErp
      .from("erp_service_contracts")
      .insert({
        contract_no: contractNo,
        entity_type: assignedEntity,
        service_type: serviceType,
        customer_name: customerName.trim(),
        project_name: projectName.trim(),
        contract_amount: parseFloat(contractAmount || "0"),
        monthly_fee: parseFloat(monthlyFee || "0"),
        start_date: startDate,
        end_date: endDate,
        billing_day: parseInt(billingDay || "25", 10),
        status: "ACTIVE",
        memo: memo || "",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, contract: data });
  } catch (error: any) {
    console.error("POST Service Contract Error:", error);
    return NextResponse.json({ error: "용역 계약 등록 실패: " + error.message }, { status: 500 });
  }
}
