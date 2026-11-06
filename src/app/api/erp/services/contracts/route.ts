export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { calculateServiceEmployeeMonthlyProRata } from "@/lib/erpFormat";

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
        c.id,
        c.contract_no as "contractNo",
        c.entity_type as "entityType",
        c.service_type as "serviceType",
        c.partner_id as "partnerId",
        c.customer_name as "customerName",
        c.project_name as "projectName",
        c.contract_amount as "contractAmount",
        c.monthly_fee as "monthlyFee",
        c.vat_amount as "vatAmount",
        c.start_date as "startDate",
        c.end_date as "endDate",
        c.billing_day as "billingDay",
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
        COALESCE(c.tax_memo, '') as "taxMemo",
        COALESCE(c.tax_items, '[]'::jsonb) as "taxItems",
        COALESCE(c.assigned_employees, '[]'::jsonb) as "assignedEmployees",
        COALESCE(c.include_ot_in_billing, false) as "includeOtInBilling",
        c.contract_file_name as "contractFileName",
        (c.contract_file_url IS NOT NULL AND c.contract_file_url <> '') as "hasContractFile",
        c.created_at as "createdAt"
      FROM erp_service_contracts c
      LEFT JOIN erp_partners p ON c.partner_id = p.id OR (c.partner_id IS NULL AND c.customer_name = p.name)
      WHERE 1=1
    `;
    const params: any[] = [];
    if (serviceType && serviceType !== "ALL") {
      params.push(serviceType);
      query += ` AND c.service_type = $${params.length}`;
    }
    if (entityType && entityType !== "ALL") {
      params.push(entityType);
      query += ` AND c.entity_type = $${params.length}`;
    }
    query += " ORDER BY c.start_date DESC, c.id DESC";

    const res = await pool.query(query, params);
    return NextResponse.json({ success: true, contracts: res.rows });
  } catch (error: any) {
    console.error("GET Service Contracts Error:", error);
    return NextResponse.json({ error: "용역 계약 목록 조회 실패" }, { status: 500 });
  }
}

async function syncAssignedEmployeeContractRates(pool: any) {
  const ctRes = await pool.query(
    `SELECT customer_name, project_name, start_date, end_date, status, assigned_employees
     FROM erp_service_contracts
     WHERE COALESCE(status, 'ACTIVE') <> 'CANCELLED'
       AND assigned_employees IS NOT NULL`
  );

  // 1) 현재 시점(ACTIVE) 기준 임직원별 합산 단가를 erp_employees.service_contract_amount에 동기화
  const rateByEmpId = new Map<number, number>();
  const rateByEmpNo = new Map<string, number>();
  const rateByName = new Map<string, number>();

  for (const row of ctRes.rows) {
    if (String(row.status || "ACTIVE") !== "ACTIVE") continue;
    const list = Array.isArray(row.assigned_employees) ? row.assigned_employees : [];
    for (const item of list) {
      const rate = Math.round(Number(item?.contractRate || 0));
      if (rate <= 0) continue;
      const eid = Number(item?.employeeId || 0);
      const eno = String(item?.employeeNo || "").trim();
      const ename = String(item?.name || "").trim();
      if (eid > 0) rateByEmpId.set(eid, (rateByEmpId.get(eid) || 0) + rate);
      if (eno) rateByEmpNo.set(eno, (rateByEmpNo.get(eno) || 0) + rate);
      if (ename) rateByName.set(ename, (rateByName.get(ename) || 0) + rate);
    }
  }

  const empRes = await pool.query(`SELECT id, employee_no, name, join_date, leave_date FROM erp_employees`);
  const empJoinById = new Map<number, { joinDate: string; leaveDate: string }>();
  const empJoinByNo = new Map<string, { joinDate: string; leaveDate: string }>();
  const empJoinByName = new Map<string, { joinDate: string; leaveDate: string }>();

  for (const emp of empRes.rows) {
    const eid = Number(emp.id);
    const eno = String(emp.employee_no || "").trim();
    const ename = String(emp.name || "").trim();
    const jInfo = {
      joinDate: emp.join_date ? String(emp.join_date).slice(0, 10) : "",
      leaveDate: emp.leave_date ? String(emp.leave_date).slice(0, 10) : "",
    };
    if (eid > 0) empJoinById.set(eid, jInfo);
    if (eno) empJoinByNo.set(eno, jInfo);
    if (ename) empJoinByName.set(ename, jInfo);

    const matchedRate =
      rateByEmpId.get(eid) ??
      (eno ? rateByEmpNo.get(eno) : undefined) ??
      (ename ? rateByName.get(ename) : undefined);

    if (matchedRate !== undefined) {
      await pool.query(
        `UPDATE erp_employees SET service_contract_amount = $1, updated_at = NOW() WHERE id = $2`,
        [matchedRate, eid]
      );
    }
  }

  // 2) erp_payroll_records의 각 귀속연월(year_month)별로 해당 기간에 유효한 모든 용역계약 단가(입사일 일할계산 포함)를 합산하여 자동 반영
  const ymRes = await pool.query(`SELECT DISTINCT year_month FROM erp_payroll_records`);
  for (const ymRow of ymRes.rows) {
    const ym = String(ymRow.year_month || "").trim();
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    const [ymYear, ymMon] = ym.split("-").map(Number);
    const monthStart = new Date(ymYear, ymMon - 1, 1);
    const monthEnd = new Date(ymYear, ymMon, 0);

    const monthRateByEmpId = new Map<number, number>();
    const monthRateByEmpNo = new Map<string, number>();
    const monthRateByName = new Map<string, number>();

    for (const ct of ctRes.rows) {
      const sDate = ct.start_date ? new Date(ct.start_date) : null;
      const eDate = ct.end_date ? new Date(ct.end_date) : null;
      if (sDate && sDate > monthEnd) continue;
      if (eDate && eDate < monthStart) continue;

      const list = Array.isArray(ct.assigned_employees) ? ct.assigned_employees : [];
      for (const item of list) {
        const baseRate = Math.round(Number(item?.contractRate || 0));
        if (baseRate <= 0) continue;
        const eid = Number(item?.employeeId || 0);
        const eno = String(item?.employeeNo || "").trim();
        const ename = String(item?.name || "").trim();
        const jLookup =
          (eid > 0 ? empJoinById.get(eid) : undefined) ??
          (eno ? empJoinByNo.get(eno) : undefined) ??
          (ename ? empJoinByName.get(ename) : undefined);
        const joinDate = item?.joinDate || jLookup?.joinDate || "";
        const leaveDate = item?.leaveDate || jLookup?.leaveDate || "";
        const proRataEnabled = item?.proRataEnabled !== false;
        const calc = calculateServiceEmployeeMonthlyProRata(
          baseRate,
          ym,
          joinDate,
          leaveDate,
          proRataEnabled,
          true
        );
        const rate = calc.effectiveAmount;
        if (rate <= 0) continue;
        if (eid > 0) monthRateByEmpId.set(eid, (monthRateByEmpId.get(eid) || 0) + rate);
        if (eno) monthRateByEmpNo.set(eno, (monthRateByEmpNo.get(eno) || 0) + rate);
        if (ename) monthRateByName.set(ename, (monthRateByName.get(ename) || 0) + rate);
      }
    }

    for (const emp of empRes.rows) {
      const eid = Number(emp.id);
      const eno = String(emp.employee_no || "").trim();
      const ename = String(emp.name || "").trim();
      const ymRate =
        monthRateByEmpId.get(eid) ??
        (eno ? monthRateByEmpNo.get(eno) : undefined) ??
        (ename ? monthRateByName.get(ename) : undefined) ??
        0;

      if (ymRate > 0) {
        await pool.query(
          `UPDATE erp_payroll_records
           SET service_contract_amount = $1, updated_at = NOW()
           WHERE year_month = $2 AND employee_id = $3`,
          [ymRate, ym, eid]
        );
      }
    }
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
      vatAmount,
      startDate,
      endDate,
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
      assignedEmployees,
      includeOtInBilling,
      contractFileUrl,
      contractFileName,
    } = body;

    if (!serviceType || !customerName || !projectName || !startDate || !endDate) {
      return NextResponse.json({ error: "용역 구분, 고객사, 프로젝트명, 계약 기간은 필수입니다." }, { status: 400 });
    }

    const assignedEntity = entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
    const prefix = serviceType === "OPERATIONAL" ? "OP" : "DEV";
    const contractNo = `${prefix}${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const parsedAmount = parseFloat(contractAmount || "0");
    const parsedMonthly = parseFloat(monthlyFee || "0");
    const baseSupply = serviceType === "OPERATIONAL" ? parsedMonthly : parsedAmount;
    const parsedVat = vatAmount !== undefined && vatAmount !== null && vatAmount !== ""
      ? parseFloat(vatAmount)
      : Math.round(baseSupply * 0.1);

    const normalizedTaxItems = Array.isArray(taxItems) && taxItems.length > 0
      ? taxItems.length === 1 && baseSupply > 0
        ? [
            {
              ...taxItems[0],
              qty: Number(taxItems[0].qty) || 1,
              unitCost: Math.round(baseSupply / (Number(taxItems[0].qty) || 1)),
              supplyAmount: baseSupply,
              vatAmount: parsedVat,
            },
          ]
        : taxItems
      : [
          {
            itemName: projectName.trim(),
            spec: "",
            qty: 1,
            unitCost: baseSupply,
            supplyAmount: baseSupply,
            vatAmount: parsedVat,
            note: "",
          },
        ];

    const normalizedAssignedEmployees = Array.isArray(assignedEmployees) ? assignedEmployees : [];

    const pool = getErpPool();
    const insRes = await pool.query(
      `
      INSERT INTO erp_service_contracts (
        contract_no, entity_type, service_type, partner_id, customer_name, project_name,
        contract_amount, monthly_fee, vat_amount, start_date, end_date, billing_day, status, memo,
        customer_biz_no, customer_ceo_name, customer_address, customer_biz_type, customer_biz_class,
        customer_email, customer_email2, tax_purpose, tax_memo, tax_items,
        contract_file_url, contract_file_name, assigned_employees, include_ot_in_billing
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE', $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb, $24, $25, $26::jsonb, $27
      ) RETURNING id, contract_no AS "contractNo", customer_name AS "customerName", project_name AS "projectName"
      `,
      [
        contractNo,
        assignedEntity,
        serviceType,
        partnerId ? parseInt(String(partnerId), 10) : null,
        customerName.trim(),
        projectName.trim(),
        parsedAmount,
        parsedMonthly,
        parsedVat,
        startDate,
        endDate,
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
        taxMemo || projectName.trim(),
        JSON.stringify(normalizedTaxItems),
        contractFileUrl || null,
        contractFileName || null,
        JSON.stringify(normalizedAssignedEmployees),
        Boolean(includeOtInBilling),
      ]
    );

    // Sync assigned employee contract rates to erp_employees & erp_payroll_records
    await syncAssignedEmployeeContractRates(pool);

    // 용역계약 등록 시 입력한 세금계산서 이메일을 거래처(erp_partners)에도 자동 동기화
    if (customerEmail || customerEmail2) {
      await pool.query(
        `UPDATE erp_partners
         SET main_email = COALESCE(NULLIF($1, ''), main_email),
             sub_email = COALESCE(NULLIF($2, ''), sub_email),
             updated_at = NOW()
         WHERE id = $3 OR name = $4 OR ($5 <> '' AND business_no = $5)`,
        [
          customerEmail || "",
          customerEmail2 || "",
          partnerId ? parseInt(String(partnerId), 10) : -1,
          customerName.trim(),
          customerBizNo || "",
        ]
      );
    }

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
      vatAmount,
      startDate,
      endDate,
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
      assignedEmployees,
      includeOtInBilling,
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
    const parsedAmount = parseFloat(contractAmount || "0");
    const parsedMonthly = parseFloat(monthlyFee || "0");
    const baseSupply = serviceType === "OPERATIONAL" ? parsedMonthly : parsedAmount;
    const parsedVat = vatAmount !== undefined && vatAmount !== null && vatAmount !== ""
      ? parseFloat(vatAmount)
      : Math.round(baseSupply * 0.1);

    const syncedTaxItems =
      Array.isArray(taxItems) && taxItems.length === 1 && baseSupply > 0
        ? [
            {
              ...taxItems[0],
              qty: Number(taxItems[0].qty) || 1,
              unitCost: Math.round(baseSupply / (Number(taxItems[0].qty) || 1)),
              supplyAmount: baseSupply,
              vatAmount: parsedVat,
            },
          ]
        : taxItems;
    const normalizedTaxItems = Array.isArray(syncedTaxItems) ? JSON.stringify(syncedTaxItems) : null;
    const normalizedAssignedEmployees = Array.isArray(assignedEmployees) ? JSON.stringify(assignedEmployees) : null;

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
        vat_amount = $8,
        start_date = $9,
        end_date = $10,
        billing_day = $11,
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
        contract_file_name = CASE WHEN $24::text = '__DELETE__' THEN NULL ELSE COALESCE($25, contract_file_name) END,
        assigned_employees = COALESCE($26::jsonb, assigned_employees),
        include_ot_in_billing = COALESCE($27::boolean, include_ot_in_billing)
      WHERE id = $28
      RETURNING id, contract_no AS "contractNo", customer_name AS "customerName", project_name AS "projectName"
      `,
      [
        serviceType || null,
        assignedEntity,
        partnerId ? parseInt(String(partnerId), 10) : null,
        customerName.trim(),
        projectName.trim(),
        parsedAmount,
        parsedMonthly,
        parsedVat,
        startDate,
        endDate,
        parseInt(billingDay || "25", 10),
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
        normalizedAssignedEmployees,
        includeOtInBilling !== undefined ? Boolean(includeOtInBilling) : null,
        parseInt(String(id), 10),
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: "해당 계약을 찾을 수 없습니다." }, { status: 404 });
    }

    const updated = updateRes.rows[0];

    // Sync assigned employee contract rates to erp_employees & erp_payroll_records
    await syncAssignedEmployeeContractRates(pool);

    // 용역계약 등록 시 입력한 세금계산서 이메일을 거래처(erp_partners)에도 자동 동기화
    if (customerEmail || customerEmail2) {
      await pool.query(
        `UPDATE erp_partners
         SET main_email = COALESCE(NULLIF($1, ''), main_email),
             sub_email = COALESCE(NULLIF($2, ''), sub_email),
             updated_at = NOW()
         WHERE id = $3 OR name = $4 OR ($5 <> '' AND business_no = $5)`,
        [
          customerEmail || "",
          customerEmail2 || "",
          partnerId ? parseInt(String(partnerId), 10) : -1,
          customerName.trim(),
          customerBizNo || "",
        ]
      );
    }

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
