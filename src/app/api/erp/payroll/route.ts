import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

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
        p.employee_id as "employeeId",
        e.employee_no as "employeeNo",
        e.name as "employeeName",
        e.department,
        e.position,
        e.duty,
        e.salary_bank_name as "salaryBankName",
        e.salary_account_no as "salaryAccountNo",
        e.salary_account_holder as "salaryAccountHolder",
        p.base_salary::numeric as "baseSalary",
        p.ot_pay::numeric as "otPay",
        p.meal_allowance::numeric as "mealAllowance",
        p.bonus::numeric as bonus,
        p.total_gross::numeric as "totalGross",
        p.national_pension::numeric as "nationalPension",
        p.health_insurance::numeric as "healthInsurance",
        p.employment_insurance::numeric as "employmentInsurance",
        p.income_tax::numeric as "incomeTax",
        p.local_tax::numeric as "localTax",
        p.total_deduction::numeric as "totalDeduction",
        p.net_salary::numeric as "netSalary",
        p.status,
        p.paid_at as "paidAt",
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

    for (const r of result.rows) {
      totalGrossSum += Number(r.totalGross);
      totalDeductionSum += Number(r.totalDeduction);
      netSalarySum += Number(r.netSalary);
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
      },
    });
  } catch (error: any) {
    console.error("GET Payroll Error:", error);
    return NextResponse.json({ error: "급여 대장 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: 특정 귀속연월의 전 직원 급여 자동 계산 및 생성 (일괄 정산)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { yearMonth } = body;

    if (!yearMonth) {
      return NextResponse.json({ error: "귀속연월(YYYY-MM)은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();

    // 1. 재직 중인 전 직원 조회
    const empRes = await pool.query(`
      SELECT id, name, base_salary 
      FROM erp_employees 
      WHERE employment_status = 'ACTIVE'
      ORDER BY id ASC
    `);

    // 2. 해당 월 승인된 OT 시간 집계
    const otRes = await pool.query(`
      SELECT employee_id, SUM(ot_hours)::numeric as hours
      FROM erp_overtimes
      WHERE ot_date::text LIKE $1 || '%' AND status = 'APPROVED'
      GROUP BY employee_id
    `, [yearMonth]);

    const otMap: Record<number, number> = {};
    for (const row of otRes.rows) {
      otMap[row.employee_id] = Number(row.hours);
    }

    // 3. 직원별 급여 계산 및 Upsert
    const insertedRecords = [];
    for (const emp of empRes.rows) {
      const baseSalary = Number(emp.base_salary || 3500000);
      const otHours = otMap[emp.id] || 0;

      // 통상시급 = 기본급 / 209시간. 연장수당 = 시급 * 1.5 * OT시간
      const hourlyRate = Math.floor(baseSalary / 209);
      const otPay = Math.floor(hourlyRate * 1.5 * otHours);
      const mealAllowance = 200000; // 비과세 식대
      const bonus = 0;
      const totalGross = baseSalary + otPay + mealAllowance + bonus;

      // 과세 대상 금액 = 총지급액 - 비과세식대
      const taxable = Math.max(0, totalGross - mealAllowance);

      // 4대보험 표준 요율
      const nationalPension = Math.floor(taxable * 0.045); // 4.5%
      const healthInsurance = Math.floor(taxable * 0.03545); // 3.545%
      const employmentInsurance = Math.floor(taxable * 0.009); // 0.9%

      // 근로소득세 간이세액 (약 2.5% 수준 표준 근사)
      let incomeTax = Math.floor(taxable * 0.025);
      if (taxable < 2000000) incomeTax = Math.floor(taxable * 0.012);
      else if (taxable > 5000000) incomeTax = Math.floor(taxable * 0.04);

      const localTax = Math.floor(incomeTax * 0.1); // 지방소득세 10%
      const totalDeduction = nationalPension + healthInsurance + employmentInsurance + incomeTax + localTax;
      const netSalary = totalGross - totalDeduction;

      const upsertRes = await pool.query(
        `INSERT INTO erp_payroll_records (
          year_month, employee_id, base_salary, ot_pay, meal_allowance, bonus,
          total_gross, national_pension, health_insurance, employment_insurance,
          income_tax, local_tax, total_deduction, net_salary, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'DRAFT')
        ON CONFLICT (year_month, employee_id)
        DO UPDATE SET
          base_salary = EXCLUDED.base_salary,
          ot_pay = EXCLUDED.ot_pay,
          meal_allowance = EXCLUDED.meal_allowance,
          total_gross = EXCLUDED.total_gross,
          national_pension = EXCLUDED.national_pension,
          health_insurance = EXCLUDED.health_insurance,
          employment_insurance = EXCLUDED.employment_insurance,
          income_tax = EXCLUDED.income_tax,
          local_tax = EXCLUDED.local_tax,
          total_deduction = EXCLUDED.total_deduction,
          net_salary = EXCLUDED.net_salary,
          updated_at = NOW()
        RETURNING id`,
        [
          yearMonth, emp.id, baseSalary, otPay, mealAllowance, bonus,
          totalGross, nationalPension, healthInsurance, employmentInsurance,
          incomeTax, localTax, totalDeduction, netSalary
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
    return NextResponse.json({ error: "급여 정산 자동 계산 실패: " + error.message }, { status: 500 });
  }
}

// PATCH: 개별 급여 항목 수정 (기본급, 상여) 또는 상태 마감/승인 (DRAFT -> APPROVED -> PAID)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, yearMonth, action, status, bonus, baseSalary } = body;

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
    const newBaseSalary = baseSalary !== undefined ? Number(baseSalary) : Number(rec.base_salary);
    const newBonus = bonus !== undefined ? Number(bonus) : Number(rec.bonus);
    const otPay = Number(rec.ot_pay);
    const mealAllowance = Number(rec.meal_allowance);

    const totalGross = newBaseSalary + otPay + mealAllowance + newBonus;
    const taxable = Math.max(0, totalGross - mealAllowance);

    const nationalPension = Math.floor(taxable * 0.045);
    const healthInsurance = Math.floor(taxable * 0.03545);
    const employmentInsurance = Math.floor(taxable * 0.009);

    let incomeTax = Math.floor(taxable * 0.025);
    if (taxable < 2000000) incomeTax = Math.floor(taxable * 0.012);
    else if (taxable > 5000000) incomeTax = Math.floor(taxable * 0.04);

    const localTax = Math.floor(incomeTax * 0.1);
    const totalDeduction = nationalPension + healthInsurance + employmentInsurance + incomeTax + localTax;
    const netSalary = totalGross - totalDeduction;

    const updateRes = await pool.query(
      `UPDATE erp_payroll_records 
       SET base_salary = $1, bonus = $2, total_gross = $3,
           national_pension = $4, health_insurance = $5, employment_insurance = $6,
           income_tax = $7, local_tax = $8, total_deduction = $9, net_salary = $10,
           updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        newBaseSalary, newBonus, totalGross, nationalPension,
        healthInsurance, employmentInsurance, incomeTax, localTax,
        totalDeduction, netSalary, id
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
