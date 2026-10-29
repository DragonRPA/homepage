import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// GET: 특정 귀속연월의 급여 정산 대장 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const today = new Date().toISOString().substring(0, 7);
    const yearMonth = searchParams.get("yearMonth") || today;

    const pool = getErpPool();
    const query = `
      SELECT 
        p.id,
        p.year_month as "yearMonth",
        p.pay_date as "payDate",
        p.employee_id as "employeeId",
        COALESCE(e.employee_no, '') as "employeeNo",
        COALESCE(e.name, '') as "employeeName",
        COALESCE(e.department, '') as "department",
        COALESCE(e.position, '') as "position",
        COALESCE(e.duty, '') as "duty",
        e.join_date as "joinDate",
        e.salary_bank_name as "salaryBankName",
        e.salary_account_no as "salaryAccountNo",
        e.salary_account_holder as "salaryAccountHolder",
        COALESCE(p.service_contract_amount, e.service_contract_amount, 0)::numeric as "serviceContractAmount",
        COALESCE(p.base_salary, 0)::numeric as "baseSalary",
        COALESCE(p.ot_pay, 0)::numeric as "otPay",
        COALESCE(p.meal_allowance, 0)::numeric as "mealAllowance",
        COALESCE(p.vehicle_allowance, 0)::numeric as "vehicleAllowance",
        COALESCE(p.annual_leave_allowance, 0)::numeric as "annualLeaveAllowance",
        COALESCE(p.bonus, 0)::numeric as "bonus",
        COALESCE(p.total_gross, 0)::numeric as "totalGross",
        COALESCE(p.national_pension, 0)::numeric as "nationalPension",
        COALESCE(p.health_insurance, 0)::numeric as "healthInsurance",
        COALESCE(p.employment_insurance, 0)::numeric as "employmentInsurance",
        COALESCE(p.long_term_care_insurance, 0)::numeric as "longTermCareInsurance",
        COALESCE(p.income_tax, 0)::numeric as "incomeTax",
        COALESCE(p.local_tax, 0)::numeric as "localTax",
        COALESCE(p.year_end_income_tax, 0)::numeric as "yearEndIncomeTax",
        COALESCE(p.year_end_local_tax, 0)::numeric as "yearEndLocalTax",
        COALESCE(p.national_pension_settlement, 0)::numeric as "nationalPensionSettlement",
        COALESCE(p.health_insurance_settlement, 0)::numeric as "healthInsuranceSettlement",
        COALESCE(p.long_term_care_settlement, 0)::numeric as "longTermCareSettlement",
        COALESCE(p.allowance_settlement, 0)::numeric as "allowanceSettlement",
        COALESCE(p.expense_settlement, 0)::numeric as "expenseSettlement",
        COALESCE(p.employment_insurance_settlement, 0)::numeric as "employmentInsuranceSettlement",
        COALESCE(p.total_deduction, 0)::numeric as "totalDeduction",
        COALESCE(p.net_salary, 0)::numeric as "netSalary",
        COALESCE(p.status, 'DRAFT') as "status",
        p.paid_at as "paidAt",
        p.pdf_file_name as "pdfFileName",
        p.pdf_file_url as "pdfFileUrl",
        p.created_at as "createdAt",
        COALESCE(ot.total_ot_hours, 0)::numeric as "otHours"
      FROM erp_payroll_records p
      JOIN erp_employees e ON p.employee_id = e.id
      LEFT JOIN (
        SELECT employee_id, SUM(ot_hours) as total_ot_hours
        FROM erp_overtimes
        WHERE ot_date::text LIKE $1 || '%' AND status = 'APPROVED'
        GROUP BY employee_id
      ) ot ON ot.employee_id = p.employee_id
      WHERE p.year_month = $1
      ORDER BY e.id ASC
    `;

    const result = await pool.query(query, [yearMonth]);

    // Summary calculation
    let totalGrossSum = 0;
    let totalDeductionSum = 0;
    let netSalarySum = 0;
    let totalServiceContractSum = 0;

    for (const r of result.rows) {
      totalGrossSum += Number(r.totalGross);
      totalDeductionSum += Number(r.totalDeduction);
      netSalarySum += Number(r.netSalary);
      totalServiceContractSum += Number(r.serviceContractAmount);
    }

    return NextResponse.json({
      success: true,
      yearMonth,
      records: result.rows,
      summary: {
        count: result.rows.length,
        totalGrossSum,
        totalDeductionSum,
        netSalarySum,
        totalServiceContractSum,
      },
    });
  } catch (error: any) {
    console.error("GET Payroll Error:", error);
    return NextResponse.json({ error: "급여 대장 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: 특정 귀속연월의 급여 일괄 저장(UPSERT) 또는 자동 계산
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, yearMonth, payDate, records, pdfFileName } = body;

    if (!yearMonth) {
      return NextResponse.json({ error: "귀속연월(YYYY-MM)은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();

    // 1. OCR 또는 사용자 입력으로 수신된 다건 일괄 저장 (BATCH_SAVE)
    if (action === "BATCH_SAVE" && Array.isArray(records)) {
      const savedIds = [];
      for (const r of records) {
        let employeeId = r.employeeId;

        // employeeId가 없으면 성명 또는 사원번호로 매핑 조회
        if (!employeeId) {
          const empSearch = await pool.query(`
            SELECT id FROM erp_employees 
            WHERE employee_no = $1 OR name = $2 OR name LIKE $2 || '%'
            ORDER BY id ASC LIMIT 1
          `, [r.employeeNo || "", r.employeeName || ""]);
          if (empSearch.rows.length > 0) {
            employeeId = empSearch.rows[0].id;
          }
        }

        if (!employeeId) {
          console.warn(`[Payroll BatchSave] Employee mapping not found for: ${r.employeeName} (${r.employeeNo})`);
          continue;
        }

        const upsertRes = await pool.query(
          `INSERT INTO erp_payroll_records (
            year_month, employee_id, pay_date, service_contract_amount,
            base_salary, meal_allowance, vehicle_allowance, ot_pay, annual_leave_allowance, bonus,
            total_gross, national_pension, health_insurance, employment_insurance, long_term_care_insurance,
            income_tax, local_tax, year_end_income_tax, year_end_local_tax,
            national_pension_settlement, health_insurance_settlement, long_term_care_settlement,
            allowance_settlement, expense_settlement, employment_insurance_settlement,
            total_deduction, net_salary, status, pdf_file_name, updated_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15,
            $16, $17, $18, $19,
            $20, $21, $22,
            $23, $24, $25,
            $26, $27, $28, $29, NOW()
          )
          ON CONFLICT (year_month, employee_id)
          DO UPDATE SET
            pay_date = COALESCE(EXCLUDED.pay_date, erp_payroll_records.pay_date),
            service_contract_amount = COALESCE(EXCLUDED.service_contract_amount, erp_payroll_records.service_contract_amount),
            base_salary = EXCLUDED.base_salary,
            meal_allowance = EXCLUDED.meal_allowance,
            vehicle_allowance = EXCLUDED.vehicle_allowance,
            ot_pay = EXCLUDED.ot_pay,
            annual_leave_allowance = EXCLUDED.annual_leave_allowance,
            bonus = EXCLUDED.bonus,
            total_gross = EXCLUDED.total_gross,
            national_pension = EXCLUDED.national_pension,
            health_insurance = EXCLUDED.health_insurance,
            employment_insurance = EXCLUDED.employment_insurance,
            long_term_care_insurance = EXCLUDED.long_term_care_insurance,
            income_tax = EXCLUDED.income_tax,
            local_tax = EXCLUDED.local_tax,
            year_end_income_tax = EXCLUDED.year_end_income_tax,
            year_end_local_tax = EXCLUDED.year_end_local_tax,
            national_pension_settlement = EXCLUDED.national_pension_settlement,
            health_insurance_settlement = EXCLUDED.health_insurance_settlement,
            long_term_care_settlement = EXCLUDED.long_term_care_settlement,
            allowance_settlement = EXCLUDED.allowance_settlement,
            expense_settlement = EXCLUDED.expense_settlement,
            employment_insurance_settlement = EXCLUDED.employment_insurance_settlement,
            total_deduction = EXCLUDED.total_deduction,
            net_salary = EXCLUDED.net_salary,
            status = COALESCE(EXCLUDED.status, erp_payroll_records.status),
            pdf_file_name = COALESCE(EXCLUDED.pdf_file_name, erp_payroll_records.pdf_file_name),
            updated_at = NOW()
          RETURNING id`,
          [
            yearMonth,
            employeeId,
            payDate || r.payDate || null,
            Number(r.serviceContractAmount || 0),
            Number(r.baseSalary || 0),
            Number(r.mealAllowance || 0),
            Number(r.vehicleAllowance || 0),
            Number(r.otPay || 0),
            Number(r.annualLeaveAllowance || 0),
            Number(r.bonus || 0),
            Number(r.totalGross || 0),
            Number(r.nationalPension || 0),
            Number(r.healthInsurance || 0),
            Number(r.employmentInsurance || 0),
            Number(r.longTermCareInsurance || 0),
            Number(r.incomeTax || 0),
            Number(r.localTax || 0),
            Number(r.yearEndIncomeTax || 0),
            Number(r.yearEndLocalTax || 0),
            Number(r.nationalPensionSettlement || 0),
            Number(r.healthInsuranceSettlement || 0),
            Number(r.longTermCareSettlement || 0),
            Number(r.allowanceSettlement || 0),
            Number(r.expenseSettlement || 0),
            Number(r.employmentInsuranceSettlement || 0),
            Number(r.totalDeduction || 0),
            Number(r.netSalary || 0),
            r.status || "APPROVED",
            pdfFileName || r.pdfFileName || null,
          ]
        );
        savedIds.push(upsertRes.rows[0].id);

        // erp_employees에도 service_contract_amount 업데이트 (값이 있을 경우)
        if (Number(r.serviceContractAmount) > 0) {
          await pool.query(
            `UPDATE erp_employees SET service_contract_amount = $1 WHERE id = $2`,
            [Number(r.serviceContractAmount), employeeId]
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: `${yearMonth} 급여 대장 ${savedIds.length}건이 성공적으로 저장되었습니다.`,
        count: savedIds.length,
      });
    }

    // 2. 기본 자동 계산 로직 (1시간 표준임금 및 일시별 초과근무수당 반영)
    const empRes = await pool.query(`
      SELECT id, name, base_salary, COALESCE(hourly_wage, 0) as hourly_wage, COALESCE(service_contract_amount, 0) as service_contract_amount
      FROM erp_employees 
      WHERE employment_status = 'ACTIVE'
      ORDER BY id ASC
    `);

    const otRes = await pool.query(`
      SELECT employee_id, SUM(ot_hours)::numeric as hours, SUM(COALESCE(ot_pay, 0))::bigint as total_ot_pay
      FROM erp_overtimes
      WHERE ot_date::text LIKE $1 || '%' AND status = 'APPROVED'
      GROUP BY employee_id
    `, [yearMonth]);

    const otMap: Record<number, { hours: number; otPay: number }> = {};
    for (const row of otRes.rows) {
      otMap[row.employee_id] = {
        hours: Number(row.hours || 0),
        otPay: Number(row.total_ot_pay || 0),
      };
    }

    const insertedRecords = [];
    for (const emp of empRes.rows) {
      const baseSalary = Number(emp.base_salary || 3500000);
      const serviceContractAmount = Number(emp.service_contract_amount || 0);
      const empOt = otMap[emp.id] || { hours: 0, otPay: 0 };
      const otHours = empOt.hours;

      const hourlyRate = Number(emp.hourly_wage) > 0 ? Number(emp.hourly_wage) : Math.round(baseSalary / 209);
      const otPay = empOt.otPay > 0 ? empOt.otPay : Math.round(hourlyRate * 1.5 * otHours);
      const mealAllowance = 200000;
      const vehicleAllowance = 0;
      const annualLeaveAllowance = 0;
      const bonus = 0;
      const totalGross = baseSalary + otPay + mealAllowance + vehicleAllowance + annualLeaveAllowance + bonus;

      const taxable = Math.max(0, totalGross - mealAllowance - vehicleAllowance);

      const nationalPension = Math.floor(taxable * 0.045);
      const healthInsurance = Math.floor(taxable * 0.03545);
      const longTermCareInsurance = Math.floor(healthInsurance * 0.1295); // 장기요양보험료
      const employmentInsurance = Math.floor(taxable * 0.009);

      let incomeTax = Math.floor(taxable * 0.025);
      if (taxable < 2000000) incomeTax = Math.floor(taxable * 0.012);
      else if (taxable > 5000000) incomeTax = Math.floor(taxable * 0.04);

      const localTax = Math.floor(incomeTax * 0.1);
      const totalDeduction = nationalPension + healthInsurance + employmentInsurance + longTermCareInsurance + incomeTax + localTax;
      const netSalary = totalGross - totalDeduction;

      const upsertRes = await pool.query(
        `INSERT INTO erp_payroll_records (
          year_month, employee_id, service_contract_amount, base_salary, ot_pay, meal_allowance, vehicle_allowance,
          annual_leave_allowance, bonus, total_gross, national_pension, health_insurance,
          employment_insurance, long_term_care_insurance, income_tax, local_tax, total_deduction, net_salary, status, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'DRAFT', NOW())
        ON CONFLICT (year_month, employee_id)
        DO UPDATE SET
          service_contract_amount = COALESCE(EXCLUDED.service_contract_amount, erp_payroll_records.service_contract_amount),
          base_salary = EXCLUDED.base_salary,
          ot_pay = EXCLUDED.ot_pay,
          meal_allowance = EXCLUDED.meal_allowance,
          vehicle_allowance = EXCLUDED.vehicle_allowance,
          annual_leave_allowance = EXCLUDED.annual_leave_allowance,
          total_gross = EXCLUDED.total_gross,
          national_pension = EXCLUDED.national_pension,
          health_insurance = EXCLUDED.health_insurance,
          employment_insurance = EXCLUDED.employment_insurance,
          long_term_care_insurance = EXCLUDED.long_term_care_insurance,
          income_tax = EXCLUDED.income_tax,
          local_tax = EXCLUDED.local_tax,
          total_deduction = EXCLUDED.total_deduction,
          net_salary = EXCLUDED.net_salary,
          updated_at = NOW()
        RETURNING id`,
        [
          yearMonth, emp.id, serviceContractAmount, baseSalary, otPay, mealAllowance, vehicleAllowance,
          annualLeaveAllowance, bonus, totalGross, nationalPension, healthInsurance,
          employmentInsurance, longTermCareInsurance, incomeTax, localTax, totalDeduction, netSalary
        ]
      );
      insertedRecords.push(upsertRes.rows[0]);
    }

    return NextResponse.json({
      success: true,
      message: `${yearMonth} 귀속 급여가 ${insertedRecords.length}명 전원 자동 계산되었습니다.`,
      count: insertedRecords.length,
    });
  } catch (error: any) {
    console.error("POST Payroll Calculate Error:", error);
    return NextResponse.json({ error: "급여 정산 처리 실패: " + error.message }, { status: 500 });
  }
}

// PATCH: 개별 급여 항목 수정 (용역 계약금액, 기본급, 상여 등) 또는 상태 변경
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, yearMonth, action, status, bonus, baseSalary, serviceContractAmount, payDate } = body;

    const pool = getErpPool();

    // 1. 전체 마감/승인 일괄 처리
    if (yearMonth && action === "SET_STATUS_ALL") {
      const nextStatus = status || "APPROVED";
      const paidAt = nextStatus === "PAID" ? new Date().toISOString() : null;

      await pool.query(
        `UPDATE erp_payroll_records 
         SET status = $1, paid_at = COALESCE($2, paid_at), updated_at = NOW() 
         WHERE year_month = $3`,
        [nextStatus, paidAt, yearMonth]
      );

      return NextResponse.json({
        success: true,
        message: `${yearMonth} 급여 대장이 ${nextStatus} 상태로 변경되었습니다.`,
      });
    }

    // 2. 단건 급여 수정
    if (!id) {
      return NextResponse.json({ error: "급여 레코드 ID가 누락되었습니다." }, { status: 400 });
    }

    const currentRes = await pool.query(`SELECT * FROM erp_payroll_records WHERE id = $1`, [id]);
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ error: "해당 급여 내역을 찾을 수 없습니다." }, { status: 404 });
    }

    const rec = currentRes.rows[0];

    // 단독으로 용역 계약금액만 수정하는 경우
    if (serviceContractAmount !== undefined && baseSalary === undefined && bonus === undefined) {
      const amt = Number(serviceContractAmount || 0);
      const updateRes = await pool.query(
        `UPDATE erp_payroll_records 
         SET service_contract_amount = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [amt, id]
      );

      // 직원 기본 정보에도 동기화
      await pool.query(
        `UPDATE erp_employees SET service_contract_amount = $1 WHERE id = $2`,
        [amt, rec.employee_id]
      );

      return NextResponse.json({
        success: true,
        message: "용역 계약금액이 갱신되었습니다.",
        record: updateRes.rows[0],
      });
    }

    const newBaseSalary = baseSalary !== undefined ? Number(baseSalary) : Number(rec.base_salary);
    const newBonus = bonus !== undefined ? Number(bonus) : Number(rec.bonus);
    const newServiceAmt = serviceContractAmount !== undefined ? Number(serviceContractAmount) : Number(rec.service_contract_amount || 0);
    const otPay = Number(rec.ot_pay || 0);
    const mealAllowance = Number(rec.meal_allowance || 0);
    const vehicleAllowance = Number(rec.vehicle_allowance || 0);
    const annualLeaveAllowance = Number(rec.annual_leave_allowance || 0);

    const totalGross = newBaseSalary + otPay + mealAllowance + vehicleAllowance + annualLeaveAllowance + newBonus;
    const taxable = Math.max(0, totalGross - mealAllowance - vehicleAllowance);

    const nationalPension = Math.floor(taxable * 0.045);
    const healthInsurance = Math.floor(taxable * 0.03545);
    const longTermCareInsurance = Math.floor(healthInsurance * 0.1295);
    const employmentInsurance = Math.floor(taxable * 0.009);

    let incomeTax = Math.floor(taxable * 0.025);
    if (taxable < 2000000) incomeTax = Math.floor(taxable * 0.012);
    else if (taxable > 5000000) incomeTax = Math.floor(taxable * 0.04);

    const localTax = Math.floor(incomeTax * 0.1);
    const totalDeduction = nationalPension + healthInsurance + employmentInsurance + longTermCareInsurance + incomeTax + localTax;
    const netSalary = totalGross - totalDeduction;

    const updateRes = await pool.query(
      `UPDATE erp_payroll_records 
       SET base_salary = $1, bonus = $2, service_contract_amount = $3, total_gross = $4,
           national_pension = $5, health_insurance = $6, employment_insurance = $7,
           long_term_care_insurance = $8, income_tax = $9, local_tax = $10,
           total_deduction = $11, net_salary = $12, pay_date = COALESCE($13, pay_date),
           updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        newBaseSalary, newBonus, newServiceAmt, totalGross,
        nationalPension, healthInsurance, employmentInsurance, longTermCareInsurance,
        incomeTax, localTax, totalDeduction, netSalary,
        payDate || null, id
      ]
    );

    return NextResponse.json({
      success: true,
      message: "급여 정보가 갱신되었습니다.",
      record: updateRes.rows[0],
    });
  } catch (error: any) {
    console.error("PATCH Payroll Error:", error);
    return NextResponse.json({ error: "급여 정보 수정 실패: " + error.message }, { status: 500 });
  }
}
