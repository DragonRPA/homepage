export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { encryptPii, decryptPii, hashPassword } from "@/lib/piiCrypto";
import { putErpPrivateObject } from "@/lib/r2ErpVault";
import { calculateAnnualLeaveEntitlement } from "@/lib/erpFormat";

async function uploadDataUrlToR2IfNeeded(
  rawUrl: string | null | undefined,
  fileName: string | null | undefined,
  folder: string
): Promise<string | null> {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("data:")) return trimmed;

  const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return trimmed;
  const mimeType = match[1] || "application/pdf";
  const buffer = Buffer.from(match[2], "base64");
  const orig = fileName || "document.pdf";
  const ext = (orig.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeSlug = orig
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9가-힣_-]/g, "_")
    .slice(0, 50);
  const objectKey = `${folder}/${Date.now()}_${safeSlug}.${ext}`;
  await putErpPrivateObject(objectKey, buffer, mimeType);
  return `/api/erp/vault?key=${encodeURIComponent(objectKey)}`;
}

async function ensureEmploymentContractsTable(pool: any) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS erp_employment_contracts (
      id SERIAL PRIMARY KEY,
      contract_no VARCHAR(50) UNIQUE NOT NULL,
      contract_year VARCHAR(10) NOT NULL,
      contract_type VARCHAR(20) NOT NULL DEFAULT 'NEW_HIRE',
      status VARCHAR(20) NOT NULL DEFAULT 'SIGNED',
      employee_id INTEGER REFERENCES erp_employees(id) ON DELETE SET NULL,
      employee_name VARCHAR(100) NOT NULL,
      employee_phone VARCHAR(50),
      employee_address TEXT,
      resident_reg_no TEXT,
      employer_name VARCHAR(100) NOT NULL DEFAULT '주식회사 드래곤알피에이',
      employer_phone VARCHAR(50) DEFAULT '010-9224-4097',
      employer_address TEXT DEFAULT '서울 금천구 서부샛길 528, 547호',
      employer_rep VARCHAR(50) DEFAULT '이정용',
      start_date DATE NOT NULL,
      end_date DATE,
      workplace TEXT DEFAULT '서울시 금천구 벚꽃로278, SJ테크노빌 B155호',
      job_description TEXT DEFAULT '주식회사 현대렌탈서비스의 렌탈자산 입/출고/배송 설치 등',
      work_start_time VARCHAR(10) DEFAULT '09:00',
      work_end_time VARCHAR(10) DEFAULT '18:00',
      break_minutes INTEGER DEFAULT 60,
      work_days VARCHAR(100) DEFAULT '매주 월~금요일 근무',
      weekly_holiday VARCHAR(100) DEFAULT '주휴일 매주 토~일요일',
      base_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
      hourly_wage_note VARCHAR(100) DEFAULT '시급은 통상시급',
      meal_allowance NUMERIC(15, 2) NOT NULL DEFAULT 200000,
      vehicle_allowance NUMERIC(15, 2) NOT NULL DEFAULT 0,
      other_allowance NUMERIC(15, 2) NOT NULL DEFAULT 0,
      other_allowance_label VARCHAR(100) DEFAULT '',
      pay_day INTEGER DEFAULT 10,
      pay_method VARCHAR(200) DEFAULT '근로자 명의 예금통장에 입금',
      contract_date DATE NOT NULL,
      scan_file_name VARCHAR(255),
      scan_file_url TEXT,
      pledge_date DATE,
      pledge_scan_name VARCHAR(255),
      pledge_scan_url TEXT,
      memo TEXT,
      created_by VARCHAR(50) DEFAULT 'ADMIN',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE erp_employment_contracts
    ADD COLUMN IF NOT EXISTS resident_reg_no TEXT,
    ADD COLUMN IF NOT EXISTS pledge_date DATE,
    ADD COLUMN IF NOT EXISTS pledge_scan_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS pledge_scan_url TEXT;
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE erp_employees
    ADD COLUMN IF NOT EXISTS resident_reg_no TEXT,
    ADD COLUMN IF NOT EXISTS pledge_date DATE,
    ADD COLUMN IF NOT EXISTS pledge_scan_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS pledge_scan_url TEXT;
  `).catch(() => {});
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || "ALL";
    const contractType = searchParams.get("contractType") || "ALL";
    const employeeId = searchParams.get("employeeId") || "ALL";

    const pool = getErpPool();
    await ensureEmploymentContractsTable(pool);

    const conditions: string[] = [];
    const params: any[] = [];

    if (year !== "ALL") {
      params.push(year);
      conditions.push(`c.contract_year = $${params.length}`);
    }
    if (contractType !== "ALL") {
      params.push(contractType);
      conditions.push(`c.contract_type = $${params.length}`);
    }
    if (employeeId !== "ALL" && !isNaN(Number(employeeId))) {
      params.push(Number(employeeId));
      conditions.push(`c.employee_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        c.id,
        c.contract_no as "contractNo",
        c.contract_year as "contractYear",
        c.contract_type as "contractType",
        c.status,
        c.employee_id as "employeeId",
        c.employee_name as "employeeName",
        COALESCE(c.employee_phone, e.phone, '') as "employeePhone",
        COALESCE(c.employee_address, e.address, '') as "employeeAddress",
        COALESCE(c.resident_reg_no, e.resident_reg_no, '') as "residentRegNo",
        c.employer_name as "employerName",
        c.employer_phone as "employerPhone",
        c.employer_address as "employerAddress",
        c.employer_rep as "employerRep",
        c.start_date::text as "startDate",
        c.end_date::text as "endDate",
        c.workplace,
        c.job_description as "jobDescription",
        c.work_start_time as "workStartTime",
        c.work_end_time as "workEndTime",
        c.break_minutes as "breakMinutes",
        c.work_days as "workDays",
        c.weekly_holiday as "weeklyHoliday",
        COALESCE(c.base_salary, 0)::numeric as "baseSalary",
        COALESCE(c.hourly_wage_note, '시급은 통상시급') as "hourlyWageNote",
        COALESCE(c.meal_allowance, 0)::numeric as "mealAllowance",
        COALESCE(c.vehicle_allowance, 0)::numeric as "vehicleAllowance",
        COALESCE(c.other_allowance, 0)::numeric as "otherAllowance",
        COALESCE(c.other_allowance_label, '') as "otherAllowanceLabel",
        COALESCE(c.pay_day, 10) as "payDay",
        COALESCE(c.pay_method, '근로자 명의 예금통장에 입금') as "payMethod",
        c.contract_date::text as "contractDate",
        c.scan_file_name as "scanFileName",
        c.scan_file_url as "scanFileUrl",
        COALESCE(c.pledge_date::text, e.pledge_date::text, c.start_date::text) as "pledgeDate",
        COALESCE(c.pledge_scan_name, e.pledge_scan_name) as "pledgeScanName",
        COALESCE(c.pledge_scan_url, e.pledge_scan_url) as "pledgeScanUrl",
        c.memo,
        c.created_by as "createdBy",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        e.employee_no as "employeeNo",
        e.department,
        e.position,
        e.employment_status as "employmentStatus"
      FROM erp_employment_contracts c
      LEFT JOIN erp_employees e ON c.employee_id = e.id
      ${whereClause}
      ORDER BY c.contract_year DESC, c.contract_date DESC, c.id DESC
    `;

    const res = await pool.query(query, params);
    const contracts = res.rows.map((r: any) => ({
      ...r,
      residentRegNo: decryptPii(r.residentRegNo),
      baseSalary: Number(r.baseSalary || 0),
      mealAllowance: Number(r.mealAllowance || 0),
      vehicleAllowance: Number(r.vehicleAllowance || 0),
      otherAllowance: Number(r.otherAllowance || 0),
      totalMonthlyPay:
        Number(r.baseSalary || 0) +
        Number(r.mealAllowance || 0) +
        Number(r.vehicleAllowance || 0) +
        Number(r.otherAllowance || 0),
    }));

    return NextResponse.json({
      success: true,
      contracts,
    });
  } catch (error: any) {
    console.error("GET /api/erp/employment-contracts error:", error);
    return NextResponse.json(
      { error: "근로계약서 목록 조회 실패: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      contractNo,
      contractYear,
      contractType = "NEW_HIRE",
      status = "SIGNED",
      employeeId,
      employeeName,
      employeePhone,
      employeeAddress,
      residentRegNo,
      employerName = "주식회사 드래곤알피에이",
      employerPhone = "010-9224-4097",
      employerAddress = "서울 금천구 서부샛길 528, 547호",
      employerRep = "이정용",
      startDate,
      endDate,
      workplace = "서울시 금천구 벚꽃로278, SJ테크노빌 B155호",
      jobDescription = "주식회사 현대렌탈서비스의 렌탈자산 입/출고/배송 설치 등",
      workStartTime = "09:00",
      workEndTime = "18:00",
      breakMinutes = 60,
      workDays = "매주 월~금요일 근무",
      weeklyHoliday = "주휴일 매주 토~일요일",
      baseSalary = 0,
      hourlyWageNote = "시급은 통상시급",
      mealAllowance = 200000,
      vehicleAllowance = 0,
      otherAllowance = 0,
      otherAllowanceLabel = "",
      payDay = 10,
      payMethod = "근로자 명의 예금통장에 입금",
      contractDate,
      scanFileName,
      scanFileUrl,
      pledgeDate,
      pledgeScanName,
      pledgeScanUrl,
      memo,
      createdBy = "ADMIN",
      syncEmployeeMaster = true,
      registerNewEmployee = false,
      newEmployeePosition = "사원",
      newEmployeeDepartment = "렌탈운영팀",
    } = body;

    if (!employeeName || !String(employeeName).trim()) {
      return NextResponse.json(
        { error: "근로자 성명을 입력해 주십시오." },
        { status: 400 }
      );
    }

    const pool = getErpPool();
    await ensureEmploymentContractsTable(pool);

    const effStartDate = startDate || new Date().toISOString().slice(0, 10);
    const effContractDate = contractDate || effStartDate;
    const effPledgeDate = pledgeDate || effContractDate;
    const effYear =
      contractYear || String(effStartDate).slice(0, 4) || String(new Date().getFullYear());

    // 자동 계약번호 채번 (예: EC-2026-005 또는 SP-2026-001)
    let effContractNo = contractNo ? String(contractNo).trim() : "";
    if (!effContractNo) {
      const cntRes = await pool.query(
        `SELECT COUNT(*)::int as cnt FROM erp_employment_contracts WHERE contract_year = $1`,
        [effYear]
      );
      const nextSeq = (cntRes.rows[0]?.cnt || 0) + 1;
      const prefix = contractType === "SECURITY_PLEDGE" ? "SP" : "EC";
      effContractNo = `${prefix}-${effYear}-${String(nextSeq).padStart(3, "0")}-${String(Date.now()).slice(-3)}`;
    }

    let resolvedEmpId =
      employeeId !== undefined && employeeId !== null && employeeId !== "" && !isNaN(Number(employeeId))
        ? Number(employeeId)
        : null;

    if (!resolvedEmpId) {
      const findRes = await pool.query(
        `SELECT id FROM erp_employees WHERE name = $1 LIMIT 1`,
        [String(employeeName).trim()]
      );
      if (findRes.rows.length > 0) {
        resolvedEmpId = Number(findRes.rows[0].id);
      }
    }

    const encryptedResidentNo =
      residentRegNo && String(residentRegNo).trim()
        ? encryptPii(String(residentRegNo).trim())
        : null;
    const storedScanUrl = await uploadDataUrlToR2IfNeeded(scanFileUrl, scanFileName, "contracts");
    const storedPledgeUrl = await uploadDataUrlToR2IfNeeded(pledgeScanUrl, pledgeScanName, "pledges");

    if (!resolvedEmpId && registerNewEmployee) {
      const tsSuffix = String(Date.now()).slice(-6);
      const empNo = `DR-${tsSuffix}`;
      const loginId = `emp_${tsSuffix}`;
      const bSal = Number(baseSalary || 2800000);
      const mAll = Number(mealAllowance || 200000);
      const vAll = Number(vehicleAllowance || 0);
      const hWage = Math.round(bSal / 209);
      const autoGrant = calculateAnnualLeaveEntitlement(effStartDate).grantDays;

      const insEmp = await pool.query(
        `INSERT INTO erp_employees (
          employee_no, login_id, password_hash, name, position, department,
          role, role_code, base_salary, hourly_wage, meal_allowance, vehicle_allowance,
          phone, address, resident_reg_no, pledge_date, pledge_scan_name, pledge_scan_url,
          join_date, employment_status, annual_leave_grant
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          'USER', 'EMPLOYEE', $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16,
          $17, 'ACTIVE', $18
        ) RETURNING id`,
        [
          empNo,
          loginId,
          hashPassword("1111"),
          String(employeeName).trim(),
          newEmployeePosition || "사원",
          newEmployeeDepartment || "렌탈운영팀",
          bSal,
          hWage,
          mAll,
          vAll,
          employeePhone || null,
          employeeAddress || null,
          encryptedResidentNo,
          effPledgeDate,
          pledgeScanName || null,
          storedPledgeUrl || null,
          effStartDate,
          autoGrant,
        ]
      );
      resolvedEmpId = Number(insEmp.rows[0].id);
    }

    if (resolvedEmpId && syncEmployeeMaster) {
      const bSal = Number(baseSalary || 0);
      const mAll = Number(mealAllowance || 0);
      const vAll = Number(vehicleAllowance || 0);
      const hWage = bSal > 0 ? Math.round(bSal / 209) : 0;

      await pool.query(
        `UPDATE erp_employees
         SET
           base_salary = CASE WHEN $1 > 0 THEN $1 ELSE base_salary END,
           hourly_wage = CASE WHEN $2 > 0 THEN $2 ELSE hourly_wage END,
           meal_allowance = CASE WHEN $3 > 0 THEN $3 ELSE meal_allowance END,
           vehicle_allowance = $4,
           phone = COALESCE(NULLIF($5, ''), phone),
           address = COALESCE(NULLIF($6, ''), address),
           resident_reg_no = COALESCE(NULLIF($7, ''), resident_reg_no),
           pledge_date = COALESCE($8::date, pledge_date),
           pledge_scan_name = COALESCE(NULLIF($9, ''), pledge_scan_name),
           pledge_scan_url = COALESCE(NULLIF($10, ''), pledge_scan_url),
           updated_at = NOW()
         WHERE id = $11`,
        [
          bSal,
          hWage,
          mAll,
          vAll,
          employeePhone ? String(employeePhone).trim() : "",
          employeeAddress ? String(employeeAddress).trim() : "",
          encryptedResidentNo || "",
          effPledgeDate || null,
          pledgeScanName || "",
          storedPledgeUrl || "",
          resolvedEmpId,
        ]
      );
    }

    const insertRes = await pool.query(
      `INSERT INTO erp_employment_contracts (
        contract_no, contract_year, contract_type, status,
        employee_id, employee_name, employee_phone, employee_address, resident_reg_no,
        employer_name, employer_phone, employer_address, employer_rep,
        start_date, end_date, workplace, job_description,
        work_start_time, work_end_time, break_minutes, work_days, weekly_holiday,
        base_salary, hourly_wage_note, meal_allowance, vehicle_allowance,
        other_allowance, other_allowance_label, pay_day, pay_method,
        contract_date, scan_file_name, scan_file_url,
        pledge_date, pledge_scan_name, pledge_scan_url,
        memo, created_by
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20, $21, $22,
        $23, $24, $25, $26,
        $27, $28, $29, $30,
        $31, $32, $33,
        $34, $35, $36,
        $37, $38
      ) RETURNING id, contract_no as "contractNo"`,
      [
        effContractNo,
        effYear,
        contractType,
        status,
        resolvedEmpId,
        String(employeeName).trim(),
        employeePhone || null,
        employeeAddress || null,
        encryptedResidentNo,
        employerName,
        employerPhone,
        employerAddress,
        employerRep,
        effStartDate,
        endDate || null,
        workplace,
        jobDescription,
        workStartTime,
        workEndTime,
        Number(breakMinutes || 60),
        workDays,
        weeklyHoliday,
        Number(baseSalary || 0),
        hourlyWageNote,
        Number(mealAllowance || 0),
        Number(vehicleAllowance || 0),
        Number(otherAllowance || 0),
        otherAllowanceLabel || "",
        Number(payDay || 10),
        payMethod,
        effContractDate,
        scanFileName || null,
        storedScanUrl || null,
        effPledgeDate || null,
        pledgeScanName || null,
        storedPledgeUrl || null,
        memo || null,
        createdBy,
      ]
    );

    return NextResponse.json({
      success: true,
      contract: insertRes.rows[0],
      message: `${employeeName} ${contractType === "SECURITY_PLEDGE" ? "보안서약서" : "근로계약서"}(${effYear}년)가 등록되었습니다.`,
    });
  } catch (error: any) {
    console.error("POST /api/erp/employment-contracts error:", error);
    return NextResponse.json(
      { error: "저장 실패: " + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      contractYear,
      contractType,
      status,
      employeeId,
      employeeName,
      employeePhone,
      employeeAddress,
      residentRegNo,
      employerName,
      employerPhone,
      employerAddress,
      employerRep,
      startDate,
      endDate,
      workplace,
      jobDescription,
      workStartTime,
      workEndTime,
      breakMinutes,
      workDays,
      weeklyHoliday,
      baseSalary,
      hourlyWageNote,
      mealAllowance,
      vehicleAllowance,
      otherAllowance,
      otherAllowanceLabel,
      payDay,
      payMethod,
      contractDate,
      scanFileName,
      scanFileUrl,
      pledgeDate,
      pledgeScanName,
      pledgeScanUrl,
      memo,
      syncEmployeeMaster = false,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "계약서 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const resolvedEmpId =
      employeeId !== undefined && employeeId !== null && employeeId !== "" && !isNaN(Number(employeeId))
        ? Number(employeeId)
        : null;

    const encryptedResidentNo =
      residentRegNo && String(residentRegNo).trim()
        ? encryptPii(String(residentRegNo).trim())
        : null;
    const storedScanUrl = await uploadDataUrlToR2IfNeeded(scanFileUrl, scanFileName, "contracts");
    const storedPledgeUrl = await uploadDataUrlToR2IfNeeded(pledgeScanUrl, pledgeScanName, "pledges");

    await pool.query(
      `UPDATE erp_employment_contracts
       SET
         contract_year = COALESCE($1, contract_year),
         contract_type = COALESCE($2, contract_type),
         status = COALESCE($3, status),
         employee_id = $4,
         employee_name = COALESCE($5, employee_name),
         employee_phone = $6,
         employee_address = $7,
         resident_reg_no = COALESCE($8, resident_reg_no),
         employer_name = COALESCE($9, employer_name),
         employer_phone = COALESCE($10, employer_phone),
         employer_address = COALESCE($11, employer_address),
         employer_rep = COALESCE($12, employer_rep),
         start_date = COALESCE($13, start_date),
         end_date = $14,
         workplace = COALESCE($15, workplace),
         job_description = COALESCE($16, job_description),
         work_start_time = COALESCE($17, work_start_time),
         work_end_time = COALESCE($18, work_end_time),
         break_minutes = COALESCE($19, break_minutes),
         work_days = COALESCE($20, work_days),
         weekly_holiday = COALESCE($21, weekly_holiday),
         base_salary = COALESCE($22, base_salary),
         hourly_wage_note = COALESCE($23, hourly_wage_note),
         meal_allowance = COALESCE($24, meal_allowance),
         vehicle_allowance = COALESCE($25, vehicle_allowance),
         other_allowance = COALESCE($26, other_allowance),
         other_allowance_label = COALESCE($27, other_allowance_label),
         pay_day = COALESCE($28, pay_day),
         pay_method = COALESCE($29, pay_method),
         contract_date = COALESCE($30, contract_date),
         scan_file_name = COALESCE($31, scan_file_name),
         scan_file_url = COALESCE($32, scan_file_url),
         pledge_date = COALESCE($33::date, pledge_date),
         pledge_scan_name = COALESCE($34, pledge_scan_name),
         pledge_scan_url = COALESCE($35, pledge_scan_url),
         memo = $36,
         updated_at = NOW()
       WHERE id = $37`,
      [
        contractYear,
        contractType,
        status,
        resolvedEmpId,
        employeeName,
        employeePhone || null,
        employeeAddress || null,
        encryptedResidentNo,
        employerName,
        employerPhone,
        employerAddress,
        employerRep,
        startDate,
        endDate || null,
        workplace,
        jobDescription,
        workStartTime,
        workEndTime,
        breakMinutes !== undefined ? Number(breakMinutes) : null,
        workDays,
        weeklyHoliday,
        baseSalary !== undefined ? Number(baseSalary) : null,
        hourlyWageNote,
        mealAllowance !== undefined ? Number(mealAllowance) : null,
        vehicleAllowance !== undefined ? Number(vehicleAllowance) : null,
        otherAllowance !== undefined ? Number(otherAllowance) : null,
        otherAllowanceLabel,
        payDay !== undefined ? Number(payDay) : null,
        payMethod,
        contractDate,
        scanFileName || null,
        storedScanUrl || null,
        pledgeDate || null,
        pledgeScanName || null,
        storedPledgeUrl || null,
        memo || null,
        Number(id),
      ]
    );

    if (resolvedEmpId && syncEmployeeMaster) {
      const bSal = Number(baseSalary || 0);
      const mAll = Number(mealAllowance || 0);
      const vAll = Number(vehicleAllowance || 0);
      const hWage = bSal > 0 ? Math.round(bSal / 209) : 0;

      await pool.query(
        `UPDATE erp_employees
         SET
           base_salary = CASE WHEN $1 > 0 THEN $1 ELSE base_salary END,
           hourly_wage = CASE WHEN $2 > 0 THEN $2 ELSE hourly_wage END,
           meal_allowance = CASE WHEN $3 > 0 THEN $3 ELSE meal_allowance END,
           vehicle_allowance = $4,
           phone = COALESCE(NULLIF($5, ''), phone),
           address = COALESCE(NULLIF($6, ''), address),
           resident_reg_no = COALESCE(NULLIF($7, ''), resident_reg_no),
           pledge_date = COALESCE($8::date, pledge_date),
           pledge_scan_name = COALESCE(NULLIF($9, ''), pledge_scan_name),
           pledge_scan_url = COALESCE(NULLIF($10, ''), pledge_scan_url),
           updated_at = NOW()
         WHERE id = $11`,
        [
          bSal,
          hWage,
          mAll,
          vAll,
          employeePhone ? String(employeePhone).trim() : "",
          employeeAddress ? String(employeeAddress).trim() : "",
          encryptedResidentNo || "",
          pledgeDate || null,
          pledgeScanName || "",
          storedPledgeUrl || "",
          resolvedEmpId,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: "근로계약서 및 보안서약서 정보가 수정되었습니다.",
    });
  } catch (error: any) {
    console.error("PUT /api/erp/employment-contracts error:", error);
    return NextResponse.json(
      { error: "수정 실패: " + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 ID가 필요합니다." }, { status: 400 });
    }
    const pool = getErpPool();
    await pool.query(`DELETE FROM erp_employment_contracts WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ success: true, message: "삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE /api/erp/employment-contracts error:", error);
    return NextResponse.json(
      { error: "삭제 실패: " + error.message },
      { status: 500 }
    );
  }
}
