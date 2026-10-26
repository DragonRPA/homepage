import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// POST: Execute annual leave quota calculation and reset for target year
export async function POST(request: Request) {
  try {
    const { resetYear, executedBy, memo } = await request.json();
    const targetYear = parseInt(resetYear || new Date().getFullYear().toString(), 10);
    const actor = executedBy || "ADMIN";

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Fetch all active employees
      const empRes = await client.query(
        "SELECT id, employee_no, name, join_date, annual_leave_grant FROM erp_employees WHERE employment_status = 'ACTIVE'"
      );

      const employees = empRes.rows;
      let updateCount = 0;
      const detailsList: any[] = [];

      for (const emp of employees) {
        const joinYear = new Date(emp.join_date).getFullYear();
        // 1년차부터 시작 (근속 연수)
        const serviceYears = Math.max(1, targetYear - joinYear + 1);
        
        // 근로기준법 및 대표님 확정 공식: 3, 5, 7, 9... 년차마다 +1일 (13년차: 15+6=21)
        const additionalDays = serviceYears >= 3 ? Math.floor((serviceYears - 1) / 2) : 0;
        const newGrant = Math.min(25.0, 15.0 + additionalDays);

        await client.query(
          "UPDATE erp_employees SET annual_leave_grant = $1, updated_at = NOW() WHERE id = $2",
          [newGrant, emp.id]
        );

        detailsList.push({
          id: emp.id,
          name: emp.name,
          serviceYears,
          previousGrant: emp.annual_leave_grant,
          newGrant
        });
        updateCount++;
      }

      // 2. Insert into erp_annual_leave_resets
      await client.query(
        `INSERT INTO erp_annual_leave_resets (reset_year, reset_date, total_employees_affected, executed_by, memo)
         VALUES ($1, CURRENT_DATE, $2, $3, $4)`,
        [targetYear, updateCount, actor, memo || `${targetYear}년도 연차 일괄 초기화 (3·5·7·9년차 가산 규정 적용)`]
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
