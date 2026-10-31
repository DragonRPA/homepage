import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { calculateAnnualLeaveEntitlement } from "@/lib/erpFormat";

// POST: Execute annual leave quota calculation and reset for target year (회계연도 1/1 ~ 12/31 기준)
export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const { resetYear, executedBy, memo } = body;
    const targetYear = parseInt(resetYear || new Date().getFullYear().toString(), 10);
    const actor = executedBy || "ADMIN";

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Fetch all active employees (excluding 대표이사, 외주, 퇴사자)
      const empRes = await client.query(`
        SELECT e.id, e.employee_no, e.name, e.join_date::text as "joinDate", e.annual_leave_grant
        FROM erp_employees e
        LEFT JOIN erp_departments d ON e.department_id = d.id
        WHERE COALESCE(e.employment_status, 'ACTIVE') = 'ACTIVE'
          AND (e.leave_date IS NULL OR TRIM(e.leave_date::text) = '')
          AND COALESCE(e.position, '') NOT LIKE '%대표%'
          AND COALESCE(e.duty, '') NOT LIKE '%대표%'
          AND COALESCE(d.dept_name, e.department, '') NOT LIKE '%외주%'
      `);

      const employees = empRes.rows;
      let updateCount = 0;
      const detailsList: any[] = [];

      for (const emp of employees) {
        const entitlement = calculateAnnualLeaveEntitlement(emp.joinDate, targetYear);
        const newGrant = entitlement.grantDays;

        await client.query(
          "UPDATE erp_employees SET annual_leave_grant = $1, updated_at = NOW() WHERE id = $2",
          [newGrant, emp.id]
        );

        detailsList.push({
          id: emp.id,
          name: emp.name,
          tenureYears: entitlement.tenureYears,
          formulaLabel: entitlement.formulaLabel,
          previousGrant: emp.annual_leave_grant,
          newGrant,
        });
        updateCount++;
      }

      // 2. Insert into erp_annual_leave_resets
      await client.query(
        `INSERT INTO erp_annual_leave_resets (reset_year, reset_date, total_employees_affected, executed_by, memo)
         VALUES ($1, CURRENT_DATE, $2, $3, $4)`,
        [
          targetYear,
          updateCount,
          actor,
          memo ||
            `${targetYear}년도 회계연도(1/1~12/31) 연차 재계산 (0년차 잔여일수 비례부여 / 1년차 이상 15일+홀수년차 가산)`,
        ]
      );

      // 3. Insert Audit Log (헌장 1.2 무누락 저장)
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ($1, $2, $3, $4, $5)`,
        ["HR_LEAVE", "ANNUAL_RESET", targetYear.toString(), actor, JSON.stringify({ count: updateCount, list: detailsList })]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: `${targetYear}년도 총 ${updateCount}명 사원의 연차가 성공적으로 일괄 초기화/부여되었습니다.`,
        affectedCount: updateCount,
        details: detailsList
      });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Reset Leave API Error:", error);
    return NextResponse.json(
      { error: "연차 일괄 초기화 실행 중 오류가 발생했습니다: " + error.message },
      { status: 500 }
    );
  }
}
