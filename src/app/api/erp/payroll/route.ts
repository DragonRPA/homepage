export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { decryptPii } from "@/lib/piiCrypto";
import { calculateServiceEmployeeMonthlyProRata } from "@/lib/erpHrLaborDomain";
import { ensureExpenseSchema } from "@/lib/erpExpenseSchema";
import { ensureErpCoreIndexes } from "@/lib/erpSchemaCache";
import { requireMenuPermission } from "@/lib/erpRbacGuard";

// GET: 특정 귀속연월의 급여 정산 대장 조회
export async function GET(request: Request) {
  try {
    const guard = await requireMenuPermission(request, ["payroll", "PAYROLL"], "view");
    if (!guard.authorized) {
      return guard.response!;
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const includeFiles = searchParams.get("includeFiles") === "true";

    const pool = getErpPool();
    await ensureExpenseSchema(pool);
    await ensureErpCoreIndexes(pool);

    // Fast path: 단건 급여명세서 및 첨부 PDF 파일 지연 로딩
    if (idParam) {
      const singleRes = await pool.query(
        `SELECT p.id, p.year_month as "yearMonth", p.employee_id as "employeeId",
                p.pdf_file_name as "pdfFileName", p.pdf_file_url as "pdfFileUrl",
                (p.pdf_file_url IS NOT NULL AND p.pdf_file_url <> '') as "hasPdfFile"
         FROM erp_payroll_records p
         WHERE p.id = $1 LIMIT 1`,
        [Number(idParam)]
      );
      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "해당 급여명세를 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({ success: true, payroll: singleRes.rows[0] });
    }

    const today = new Date().toISOString().substring(0, 7);
    const yearMonth = searchParams.get("yearMonth") || today;
    const [ymYear, ymMon] = yearMonth.split("-").map(Number);
    const monthStart = `${yearMonth}-01`;
    const lastDayNum = new Date(ymYear, ymMon, 0).getDate();
    const monthEnd = `${yearMonth}-${String(lastDayNum).padStart(2, "0")}`;

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
        e.leave_date::text as "leaveDate",
        e.salary_bank_name as "salaryBankName",
        e.salary_account_no as "salaryAccountNo",
        e.salary_account_holder as "salaryAccountHolder",
        COALESCE(p.service_contract_amount, e.service_contract_amount, 0)::numeric as "serviceContractAmount",
        COALESCE(p.base_salary, 0)::numeric as "baseSalary",
        COALESCE(p.ot_pay, 0)::numeric as "otPay",
        COALESCE(p.meal_allowance, 0)::numeric as "mealAllowance",
        COALESCE(p.vehicle_allowance, 0)::numeric as "vehicleAllowance",
        COALESCE(p.annual_leave_allowance, 0)::numeric as "annualLeaveAllowance",
        COALESCE(p.severance_pay, 0)::numeric as "severancePay",
        COALESCE(p.bonus, 0)::numeric as "bonus",
        COALESCE(exp.total_expense_amount, p.personal_expense_amount, 0)::numeric as "personalExpenseAmount",
        COALESCE(exp.receipt_count, 0)::int as "expenseReceiptCount",
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
        ${includeFiles ? `p.pdf_file_url as "pdfFileUrl",` : `CASE WHEN p.pdf_file_url LIKE 'data:%' THEN NULL ELSE p.pdf_file_url END as "pdfFileUrl",`}
        (p.pdf_file_url IS NOT NULL AND p.pdf_file_url <> '') as "hasPdfFile",
        p.created_at as "createdAt",
        COALESCE(ot.total_ot_hours, 0)::numeric as "otHours",
        COALESCE(p.personal_expense_amount, 0)::numeric as "storedPersonalExpenseAmount"
      FROM erp_payroll_records p
      JOIN erp_employees e ON p.employee_id = e.id
      LEFT JOIN (
        SELECT employee_id, SUM(ot_hours) as total_ot_hours
        FROM erp_overtimes
        WHERE ot_date >= $2::date AND ot_date <= $3::date AND status = 'APPROVED'
        GROUP BY employee_id
      ) ot ON ot.employee_id = p.employee_id
      LEFT JOIN (
        SELECT employee_id, SUM(amount) as total_expense_amount, COUNT(*)::int as receipt_count
        FROM erp_expense_receipts
        WHERE year_month = $1 AND status = 'APPROVED'
        GROUP BY employee_id
      ) exp ON exp.employee_id = p.employee_id
      WHERE p.year_month = $1
      ORDER BY e.id ASC
    `;

    // 해당 귀속연월(yearMonth) 기간에 유효한 용역계약(erp_service_contracts)의 투입 임직원(assigned_employees) 단가 및 고객사명 합산 조회
    const [result, ctRes] = await Promise.all([
      pool.query(query, [yearMonth, monthStart, monthEnd]),
      pool.query(
        `SELECT customer_name, project_name, start_date, end_date, status, assigned_employees
         FROM erp_service_contracts
         WHERE COALESCE(status, 'ACTIVE') <> 'CANCELLED'
           AND assigned_employees IS NOT NULL
           AND (start_date IS NULL OR start_date::date <= $2::date)
           AND (end_date IS NULL OR end_date::date >= $1::date)`,
        [monthStart, monthEnd]
      ),
    ]);
    const contractMapByEmpId = new Map<
      number,
      { rate: number; labels: string[]; joinDate: string; leaveDate: string; proRataEnabled: boolean }
    >();
    const contractMapByEmpNo = new Map<
      string,
      { rate: number; labels: string[]; joinDate: string; leaveDate: string; proRataEnabled: boolean }
    >();
    const contractMapByName = new Map<
      string,
      { rate: number; labels: string[]; joinDate: string; leaveDate: string; proRataEnabled: boolean }
    >();

    for (const ct of ctRes.rows) {
      const list = Array.isArray(ct.assigned_employees) ? ct.assigned_employees : [];
      const custLabel = String(ct.customer_name || "").replace(/주식회사|\(주\)|㈜/g, "").trim();
      for (const item of list) {
        const rate = Math.round(Number(item?.contractRate || 0));
        if (rate <= 0) continue;
        const eid = Number(item?.employeeId || 0);
        const eno = String(item?.employeeNo || "").trim();
        const ename = String(item?.name || "").trim();
        const itemJoin = item?.joinDate ? String(item.joinDate).slice(0, 10) : "";
        const itemLeave = item?.leaveDate ? String(item.leaveDate).slice(0, 10) : "";
        const itemProRata = item?.proRataEnabled !== false;

        if (eid > 0) {
          const prev = contractMapByEmpId.get(eid) || {
            rate: 0,
            labels: [],
            joinDate: itemJoin,
            leaveDate: itemLeave,
            proRataEnabled: itemProRata,
          };
          prev.rate += rate;
          if (!prev.joinDate && itemJoin) prev.joinDate = itemJoin;
          if (!prev.leaveDate && itemLeave) prev.leaveDate = itemLeave;
          if (!itemProRata) prev.proRataEnabled = false;
          if (custLabel && !prev.labels.includes(custLabel)) prev.labels.push(custLabel);
          contractMapByEmpId.set(eid, prev);
        }
        if (eno) {
          const prev = contractMapByEmpNo.get(eno) || {
            rate: 0,
            labels: [],
            joinDate: itemJoin,
            leaveDate: itemLeave,
            proRataEnabled: itemProRata,
          };
          prev.rate += rate;
          if (!prev.joinDate && itemJoin) prev.joinDate = itemJoin;
          if (!prev.leaveDate && itemLeave) prev.leaveDate = itemLeave;
          if (!itemProRata) prev.proRataEnabled = false;
          if (custLabel && !prev.labels.includes(custLabel)) prev.labels.push(custLabel);
          contractMapByEmpNo.set(eno, prev);
        }
        if (ename) {
          const prev = contractMapByName.get(ename) || {
            rate: 0,
            labels: [],
            joinDate: itemJoin,
            leaveDate: itemLeave,
            proRataEnabled: itemProRata,
          };
          prev.rate += rate;
          if (!prev.joinDate && itemJoin) prev.joinDate = itemJoin;
          if (!prev.leaveDate && itemLeave) prev.leaveDate = itemLeave;
          if (!itemProRata) prev.proRataEnabled = false;
          if (custLabel && !prev.labels.includes(custLabel)) prev.labels.push(custLabel);
          contractMapByName.set(ename, prev);
        }
      }
    }

    // Summary calculation & dynamic sync if approved receipts changed
    let totalGrossSum = 0;
    let totalDeductionSum = 0;
    let netSalarySum = 0;
    let totalServiceContractSum = 0;
    let totalPersonalExpenseSum = 0;

    const decryptedRows = [];
    for (const r of result.rows) {
      const personalExp = Math.round(Number(r.personalExpenseAmount || 0));
      const storedExp = Math.round(Number(r.storedPersonalExpenseAmount || 0));
      const diffExp = personalExp - storedExp;
      const adjustedGross = Math.round(Number(r.totalGross) + diffExp);
      const adjustedNet = Math.round(Number(r.netSalary) + diffExp);

      const matchedContract =
        contractMapByEmpId.get(Number(r.employeeId)) ||
        (r.employeeNo ? contractMapByEmpNo.get(String(r.employeeNo).trim()) : undefined) ||
        (r.employeeName ? contractMapByName.get(String(r.employeeName).trim()) : undefined);

      // 해당 귀속연월 기간에 유효한 용역계약이 있으면 그 합산액(matchedContract.rate)에 입퇴사/주휴 기준 일할계산을 적용하고, 없을 때만 수동 저장값 반영
      const baseServiceAmt = Math.round(
        matchedContract && matchedContract.rate > 0
          ? matchedContract.rate
          : Number(r.serviceContractAmount || 0)
      );
      const empJoinDateStr = r.joinDate ? String(r.joinDate).slice(0, 10) : "";
      const empLeaveDateStr = r.leaveDate ? String(r.leaveDate).slice(0, 10) : "";
      const contractJoinDateStr = matchedContract?.joinDate || empJoinDateStr;
      const contractLeaveDateStr = matchedContract?.leaveDate || empLeaveDateStr;
      const proRataCalc = calculateServiceEmployeeMonthlyProRata(
        baseServiceAmt,
        yearMonth,
        contractJoinDateStr,
        contractLeaveDateStr,
        matchedContract ? matchedContract.proRataEnabled : true,
        true
      );
      const resolvedServiceAmt = Math.round(
        matchedContract ? proRataCalc.effectiveAmount : baseServiceAmt
      );
      const baseLabel = matchedContract?.labels?.join(" + ") || "";
      const serviceContractLabel =
        proRataCalc.isProRated && baseLabel
          ? `${baseLabel} (${proRataCalc.shortBadge})`
          : baseLabel;

      const wageProRataCalc = calculateServiceEmployeeMonthlyProRata(
        Math.round(Number(r.baseSalary || 0)),
        yearMonth,
        empJoinDateStr,
        empLeaveDateStr,
        true,
        true
      );
      const wageProRataBadge = wageProRataCalc.isProRated ? wageProRataCalc.shortBadge : "";

      totalGrossSum = Math.round(totalGrossSum + adjustedGross);
      totalDeductionSum = Math.round(totalDeductionSum + Math.round(Number(r.totalDeduction)));
      netSalarySum = Math.round(netSalarySum + adjustedNet);
      totalServiceContractSum = Math.round(totalServiceContractSum + resolvedServiceAmt);
      totalPersonalExpenseSum = Math.round(totalPersonalExpenseSum + personalExp);

      decryptedRows.push({
        ...r,
        leaveDate: empLeaveDateStr || null,
        serviceContractAmount: resolvedServiceAmt,
        serviceContractLabel,
        wageProRataBadge,
        wageProRataFormula: wageProRataCalc.formulaLabel,
        weeklyHolidayEligible: wageProRataCalc.weeklyHolidayEligible,
        personalExpenseAmount: personalExp,
        totalGross: adjustedGross,
        netSalary: adjustedNet,
        salaryAccountNo: decryptPii(r.salaryAccountNo),
      });
    }

    return NextResponse.json({
      success: true,
      yearMonth,
      records: decryptedRows,
      summary: {
        count: decryptedRows.length,
        totalGrossSum,
        totalDeductionSum,
        netSalarySum,
        totalServiceContractSum,
        totalPersonalExpenseSum,
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
    const guard = await requireMenuPermission(request, ["payroll", "PAYROLL"], "save");
    if (!guard.authorized) {
      return guard.response!;
    }

    const body = await request.json();
    const { action, yearMonth, payDate, records, pdfFileName } = body;

    if (!yearMonth) {
      return NextResponse.json({ error: "귀속연월(YYYY-MM)은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();

    // 1. OCR 또는 사용자 입력으로 수신된 다건 일괄 저장 (BATCH_SAVE)
    if (action === "BATCH_SAVE" && Array.isArray(records)) {
      const savedIds = [];
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const needsEmployeeLookup = records.some((r: any) => !r?.employeeId);
        const empRows = needsEmployeeLookup
          ? (await client.query(`SELECT id, employee_no, name FROM erp_employees ORDER BY id ASC`)).rows
          : [];

        for (const r of records) {
          let employeeId = r.employeeId;

          // employeeId가 없으면 성명 또는 사원번호로 매핑 조회
          if (!employeeId) {
            const empNo = r.employeeNo ? String(r.employeeNo) : "";
            const empName = r.employeeName ? String(r.employeeName) : "";
            const matched = empRows.find(
              (e: any) =>
                (empNo && e.employee_no === empNo) ||
                (empName && (e.name === empName || String(e.name || "").startsWith(empName)))
            );
            if (matched) {
              employeeId = matched.id;
            }
          }

          if (!employeeId) {
            console.warn(`[Payroll BatchSave] Employee mapping not found for: ${r.employeeName} (${r.employeeNo})`);
            continue;
          }

          const upsertRes = await client.query(
            `INSERT INTO erp_payroll_records (
              year_month, employee_id, pay_date, service_contract_amount,
              base_salary, meal_allowance, vehicle_allowance, ot_pay, annual_leave_allowance, severance_pay, bonus,
              total_gross, national_pension, health_insurance, employment_insurance, long_term_care_insurance,
              income_tax, local_tax, year_end_income_tax, year_end_local_tax,
              national_pension_settlement, health_insurance_settlement, long_term_care_settlement,
              allowance_settlement, expense_settlement, employment_insurance_settlement,
              total_deduction, net_salary, status, pdf_file_name, updated_at
            ) VALUES (
              $1, $2, $3, $4,
              $5, $6, $7, $8, $9, $10, $11,
              $12, $13, $14, $15, $16,
              $17, $18, $19, $20,
              $21, $22, $23,
              $24, $25, $26,
              $27, $28, $29, $30, NOW()
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
              severance_pay = COALESCE(EXCLUDED.severance_pay, erp_payroll_records.severance_pay, 0),
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
              Number(r.severancePay || 0),
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

          // erp_employees에도 기본급, 식대, 차량보조금, 4대보험 가입여부 및 용역계약금액 동기화
          const hasNatPension = Number(r.nationalPension || 0) > 0;
          const hasHealthIns = Number(r.healthInsurance || 0) > 0;
          const hasEmpIns = Number(r.employmentInsurance || 0) > 0;
          await client.query(
            `UPDATE erp_employees
             SET base_salary = CASE WHEN $1 > 0 THEN $1 ELSE base_salary END,
                 meal_allowance = $2,
                 vehicle_allowance = $3,
                 ins_national_pension = $4,
                 ins_health_insurance = $5,
                 ins_employment_insurance = $6,
                 ins_industrial_accident = $6,
                 service_contract_amount = CASE WHEN $7 > 0 THEN $7 ELSE service_contract_amount END,
                 updated_at = NOW()
             WHERE id = $8`,
            [
              Number(r.baseSalary || 0),
              Number(r.mealAllowance || 0),
              Number(r.vehicleAllowance || 0),
              hasNatPension,
              hasHealthIns,
              hasEmpIns,
              Number(r.serviceContractAmount || 0),
              employeeId,
            ]
          );
        }

        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw e;
      } finally {
        client.release();
      }

      return NextResponse.json({
        success: true,
        message: `${yearMonth} 급여 대장 ${savedIds.length}건이 성공적으로 저장되었습니다.`,
        count: savedIds.length,
      });
    }

    // 2. 기본 자동 계산 로직 (1시간 표준임금, 식대, 차량보조금, 4대보험 가입여부 및 입퇴사 주휴수당 일할 반영)
    const [cYear, cMon] = yearMonth.split("-").map(Number);
    const cMonthStart = `${yearMonth}-01`;
    const cLastDayNum = new Date(Date.UTC(cYear, cMon, 0)).getUTCDate();
    const cMonthEnd = `${yearMonth}-${String(cLastDayNum).padStart(2, "0")}`;

    const [empRes, otRes, expRes, ctRes] = await Promise.all([
      pool.query(
        `SELECT id, name, join_date, leave_date, base_salary,
                COALESCE(hourly_wage, 0) as hourly_wage,
                COALESCE(meal_allowance, 200000) as meal_allowance,
                COALESCE(vehicle_allowance, 0) as vehicle_allowance,
                COALESCE(ins_national_pension, TRUE) as ins_national_pension,
                COALESCE(ins_health_insurance, TRUE) as ins_health_insurance,
                COALESCE(ins_employment_insurance, TRUE) as ins_employment_insurance,
                COALESCE(ins_industrial_accident, TRUE) as ins_industrial_accident,
                COALESCE(service_contract_amount, 0) as service_contract_amount
         FROM erp_employees
         WHERE (join_date IS NULL OR join_date::date <= $2::date)
           AND (
             (employment_status = 'ACTIVE' AND (leave_date IS NULL OR leave_date::date >= $1::date))
             OR (leave_date IS NOT NULL AND leave_date::date >= $1::date)
           )
         ORDER BY id ASC`,
        [cMonthStart, cMonthEnd]
      ),
      pool.query(
        `SELECT employee_id, SUM(ot_hours)::numeric as hours, SUM(COALESCE(ot_pay, 0))::bigint as total_ot_pay
         FROM erp_overtimes
         WHERE ot_date >= $1::date AND ot_date <= $2::date AND status = 'APPROVED'
         GROUP BY employee_id`,
        [cMonthStart, cMonthEnd]
      ),
      pool.query(
        `SELECT employee_id, SUM(COALESCE(amount, 0))::numeric as total_expense
         FROM erp_expense_receipts
         WHERE year_month = $1 AND status = 'APPROVED'
         GROUP BY employee_id`,
        [yearMonth]
      ),
      pool.query(
        `SELECT assigned_employees
         FROM erp_service_contracts
         WHERE COALESCE(status, 'ACTIVE') <> 'CANCELLED'
           AND assigned_employees IS NOT NULL
           AND (start_date IS NULL OR start_date::date <= $2::date)
           AND (end_date IS NULL OR end_date::date >= $1::date)`,
        [cMonthStart, cMonthEnd]
      ),
    ]);

    const otMap: Record<number, { hours: number; otPay: number }> = {};
    for (const row of otRes.rows) {
      otMap[row.employee_id] = {
        hours: Number(row.hours || 0),
        otPay: Number(row.total_ot_pay || 0),
      };
    }

    const expMap: Record<number, number> = {};
    for (const row of expRes.rows) {
      expMap[row.employee_id] = Number(row.total_expense || 0);
    }

    const activeContractRateMap: Record<number, number> = {};
    for (const ct of ctRes.rows) {
      const list = Array.isArray(ct.assigned_employees) ? ct.assigned_employees : [];
      for (const item of list) {
        const eid = Number(item?.employeeId || 0);
        const rate = Math.round(Number(item?.contractRate || 0));
        if (eid > 0 && rate > 0) {
          activeContractRateMap[eid] = (activeContractRateMap[eid] || 0) + rate;
        }
      }
    }

    const insertedRecords = [];
    for (const emp of empRes.rows) {
      const joinDateStr = emp.join_date ? String(emp.join_date).slice(0, 10) : null;
      const leaveDateStr = emp.leave_date ? String(emp.leave_date).slice(0, 10) : null;

      const masterBaseSalary = Math.round(Number(emp.base_salary || 3500000));
      const masterMealAllowance = Math.round(Number(emp.meal_allowance ?? 200000));
      const masterVehicleAllowance = Math.round(Number(emp.vehicle_allowance ?? 0));

      const baseSalary = calculateServiceEmployeeMonthlyProRata(
        masterBaseSalary,
        yearMonth,
        joinDateStr,
        leaveDateStr,
        true,
        true
      ).effectiveAmount;
      const mealAllowance = calculateServiceEmployeeMonthlyProRata(
        masterMealAllowance,
        yearMonth,
        joinDateStr,
        leaveDateStr,
        true,
        true
      ).effectiveAmount;
      const vehicleAllowance = calculateServiceEmployeeMonthlyProRata(
        masterVehicleAllowance,
        yearMonth,
        joinDateStr,
        leaveDateStr,
        true,
        true
      ).effectiveAmount;
      const rawContractRate =
        activeContractRateMap[Number(emp.id)] || Math.round(Number(emp.service_contract_amount || 0));
      const serviceContractAmount = calculateServiceEmployeeMonthlyProRata(
        rawContractRate,
        yearMonth,
        joinDateStr,
        leaveDateStr,
        true,
        true
      ).effectiveAmount;
      const empOt = otMap[emp.id] || { hours: 0, otPay: 0 };
      const otHours = empOt.hours;

      const hourlyRate = Math.round(Number(emp.hourly_wage || 0));
      const otPay = Math.round(empOt.otPay > 0 ? empOt.otPay : hourlyRate * 1.5 * otHours);
      const personalExpenseAmount = Math.round(Number(expMap[emp.id] || 0));
      const annualLeaveAllowance = 0;
      const bonus = 0;
      const totalGross = Math.round(
        baseSalary +
        otPay +
        mealAllowance +
        vehicleAllowance +
        annualLeaveAllowance +
        bonus +
        personalExpenseAmount
      );

      const taxable = Math.max(
        0,
        totalGross - mealAllowance - vehicleAllowance - personalExpenseAmount
      );

      const nationalPension = emp.ins_national_pension !== false ? Math.floor(taxable * 0.045) : 0;
      const healthInsurance = emp.ins_health_insurance !== false ? Math.floor(taxable * 0.03545) : 0;
      const longTermCareInsurance = emp.ins_health_insurance !== false ? Math.floor(healthInsurance * 0.1295) : 0; // 장기요양보험료
      const employmentInsurance = emp.ins_employment_insurance !== false ? Math.floor(taxable * 0.009) : 0;

      let incomeTax = Math.floor(taxable * 0.025);
      if (taxable < 2000000) incomeTax = Math.floor(taxable * 0.012);
      else if (taxable > 5000000) incomeTax = Math.floor(taxable * 0.04);

      const localTax = Math.floor(incomeTax * 0.1);
      const totalDeduction = nationalPension + healthInsurance + employmentInsurance + longTermCareInsurance + incomeTax + localTax;
      const netSalary = totalGross - totalDeduction;

      const upsertRes = await pool.query(
        `INSERT INTO erp_payroll_records (
          year_month, employee_id, service_contract_amount, base_salary, ot_pay, meal_allowance, vehicle_allowance,
          personal_expense_amount, annual_leave_allowance, bonus, total_gross, national_pension, health_insurance,
          employment_insurance, long_term_care_insurance, income_tax, local_tax, total_deduction, net_salary, status, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'DRAFT', NOW())
        ON CONFLICT (year_month, employee_id)
        DO UPDATE SET
          service_contract_amount = CASE
            WHEN EXCLUDED.service_contract_amount > 0 THEN EXCLUDED.service_contract_amount
            ELSE erp_payroll_records.service_contract_amount
          END,
          base_salary = EXCLUDED.base_salary,
          ot_pay = EXCLUDED.ot_pay,
          meal_allowance = EXCLUDED.meal_allowance,
          vehicle_allowance = EXCLUDED.vehicle_allowance,
          personal_expense_amount = EXCLUDED.personal_expense_amount,
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
          personalExpenseAmount, annualLeaveAllowance, bonus, totalGross, nationalPension, healthInsurance,
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

// PATCH: 개별 급여 항목 수정 (용역 계약금액, 기본급, 식대, 차량보조금, 상여 등) 또는 상태 변경
export async function PATCH(request: Request) {
  try {
    const guard = await requireMenuPermission(request, ["payroll", "PAYROLL"], "save");
    if (!guard.authorized) {
      return guard.response!;
    }

    const body = await request.json();
    const {
      id,
      yearMonth,
      action,
      status,
      bonus,
      baseSalary,
      mealAllowance,
      vehicleAllowance,
      annualLeaveAllowance: bodyAnnualLeave,
      severancePay: bodySeverance,
      personalExpenseAmount: bodyPersonalExpense,
      serviceContractAmount,
      payDate,
    } = body;

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

    const empInfoRes = await pool.query(
      `SELECT join_date::text as "joinDate", leave_date::text as "leaveDate",
              COALESCE(ins_national_pension, TRUE) as ins_national_pension,
              COALESCE(ins_health_insurance, TRUE) as ins_health_insurance,
              COALESCE(ins_employment_insurance, TRUE) as ins_employment_insurance
       FROM erp_employees WHERE id = $1`,
      [rec.employee_id]
    );
    const empIns = empInfoRes.rows[0] || {
      joinDate: null,
      leaveDate: null,
      ins_national_pension: true,
      ins_health_insurance: true,
      ins_employment_insurance: true,
    };
    const isProRatedPayrollMonth = calculateServiceEmployeeMonthlyProRata(
      1000000,
      rec.year_month,
      empIns.joinDate ? String(empIns.joinDate).slice(0, 10) : null,
      empIns.leaveDate ? String(empIns.leaveDate).slice(0, 10) : null,
      true,
      true
    ).isProRated;

    // 단독으로 용역 계약금액만 수정하는 경우
    if (
      serviceContractAmount !== undefined &&
      baseSalary === undefined &&
      bonus === undefined &&
      mealAllowance === undefined &&
      vehicleAllowance === undefined
    ) {
      const amt = Math.round(Number(serviceContractAmount || 0));
      const updateRes = await pool.query(
        `UPDATE erp_payroll_records 
         SET service_contract_amount = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [amt, id]
      );

      // 일할 적용월이 아닌 정상 만근월 수정 시에만 직원 마스터 월 계약금액 동기화
      if (!isProRatedPayrollMonth) {
        await pool.query(
          `UPDATE erp_employees SET service_contract_amount = $1 WHERE id = $2`,
          [amt, rec.employee_id]
        );
      }

      return NextResponse.json({
        success: true,
        message: "용역 계약금액이 갱신되었습니다.",
        record: updateRes.rows[0],
      });
    }

    const newBaseSalary = Math.round(
      baseSalary !== undefined ? Number(baseSalary) : Number(rec.base_salary)
    );
    const newBonus = Math.round(bonus !== undefined ? Number(bonus) : Number(rec.bonus));
    const newServiceAmt = Math.round(
      serviceContractAmount !== undefined
        ? Number(serviceContractAmount)
        : Number(rec.service_contract_amount || 0)
    );
    const otPay = Math.round(Number(rec.ot_pay || 0));
    const newMealAllowance = Math.round(
      mealAllowance !== undefined ? Number(mealAllowance) : Number(rec.meal_allowance || 0)
    );
    const newVehicleAllowance = Math.round(
      vehicleAllowance !== undefined ? Number(vehicleAllowance) : Number(rec.vehicle_allowance || 0)
    );
    const annualLeaveAllowance = Math.round(
      bodyAnnualLeave !== undefined ? Number(bodyAnnualLeave) : Number(rec.annual_leave_allowance || 0)
    );
    const severancePay = Math.round(
      bodySeverance !== undefined ? Number(bodySeverance) : Number(rec.severance_pay || 0)
    );
    const personalExpenseAmount = Math.round(
      bodyPersonalExpense !== undefined
        ? Number(bodyPersonalExpense)
        : Number(rec.personal_expense_amount || 0)
    );

    const totalGross = Math.round(
      newBaseSalary +
      otPay +
      newMealAllowance +
      newVehicleAllowance +
      annualLeaveAllowance +
      severancePay +
      newBonus +
      personalExpenseAmount
    );
    const taxable = Math.max(
      0,
      totalGross - newMealAllowance - newVehicleAllowance - severancePay - personalExpenseAmount
    );

    const nationalPension = empIns.ins_national_pension !== false ? Math.floor(taxable * 0.045) : 0;
    const healthInsurance = empIns.ins_health_insurance !== false ? Math.floor(taxable * 0.03545) : 0;
    const longTermCareInsurance = empIns.ins_health_insurance !== false ? Math.floor(healthInsurance * 0.1295) : 0;
    const employmentInsurance = empIns.ins_employment_insurance !== false ? Math.floor(taxable * 0.009) : 0;

    let incomeTax = Math.floor(taxable * 0.025);
    if (taxable < 2000000) incomeTax = Math.floor(taxable * 0.012);
    else if (taxable > 5000000) incomeTax = Math.floor(taxable * 0.04);

    const localTax = Math.floor(incomeTax * 0.1);
    const totalDeduction = Math.round(
      nationalPension + healthInsurance + employmentInsurance + longTermCareInsurance + incomeTax + localTax
    );
    const netSalary = Math.round(totalGross - totalDeduction);

    const updateRes = await pool.query(
      `UPDATE erp_payroll_records 
       SET base_salary = $1, bonus = $2, service_contract_amount = $3,
           meal_allowance = $4, vehicle_allowance = $5,
           annual_leave_allowance = $6, severance_pay = $7, personal_expense_amount = $8, total_gross = $9,
           national_pension = $10, health_insurance = $11, employment_insurance = $12,
           long_term_care_insurance = $13, income_tax = $14, local_tax = $15,
           total_deduction = $16, net_salary = $17, pay_date = COALESCE($18, pay_date),
           updated_at = NOW()
       WHERE id = $19
       RETURNING *`,
      [
        newBaseSalary, newBonus, newServiceAmt,
        newMealAllowance, newVehicleAllowance,
        annualLeaveAllowance, severancePay, personalExpenseAmount, totalGross,
        nationalPension, healthInsurance, employmentInsurance, longTermCareInsurance,
        incomeTax, localTax, totalDeduction, netSalary,
        payDate || null, id
      ]
    );

    // 일할 적용월이 아닌 정상 만근월 수정 시에만 임직원 마스터 월 기준값 동기화 (일할 금액 덮어쓰기 방지)
    if (!isProRatedPayrollMonth) {
      await pool.query(
        `UPDATE erp_employees
         SET base_salary = $1, meal_allowance = $2, vehicle_allowance = $3, service_contract_amount = $4, updated_at = NOW()
         WHERE id = $5`,
        [newBaseSalary, newMealAllowance, newVehicleAllowance, newServiceAmt, rec.employee_id]
      );
    }

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
