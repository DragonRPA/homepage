import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT 
        l.id,
        l.employee_id as "employeeId",
        e.name as "empName",
        e.department as "empDept",
        l.leave_type as "leaveType",
        l.start_date as "startDate",
        l.end_date as "endDate",
        l.total_calendar_days as "calendarDays",
        l.working_days as "workingDays",
        l.deducted_annual_days as "deducted",
        l.reason,
        l.status,
        m.name as "approverName",
        l.approved_at as "approvedAt"
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN employees m ON l.approver_id = m.id
      ORDER BY l.id DESC
    `;

    return NextResponse.json({ success: true, leaves: rows });
  } catch (error: any) {
    console.error("GET Leaves Error:", error);
    return NextResponse.json({ error: "휴가 목록 조회 실패" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { employeeId, leaveType, startDate, endDate, workingDays, deducted, reason, approverId } = await request.json();

    if (!employeeId || !leaveType || !startDate || !endDate) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    await sql`
      INSERT INTO leave_requests (
        employee_id, leave_type, start_date, end_date, total_calendar_days,
        working_days, deducted_annual_days, reason, status, approver_id
      ) VALUES (
        ${Number(employeeId)}, ${leaveType}, ${startDate}, ${endDate}, 1,
        ${Number(workingDays || 1.0)}, ${Number(deducted || 1.0)}, ${reason || ""}, 'PENDING',
        ${approverId ? Number(approverId) : null}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST Leave Error:", error);
    return NextResponse.json({ error: "휴가 신청 실패" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { leaveId, status, approverId } = await request.json();

    if (!leaveId || !status) {
      return NextResponse.json({ error: "결재 정보가 누락되었습니다." }, { status: 400 });
    }

    await sql`
      UPDATE leave_requests
      SET status = ${status},
          approver_id = ${approverId ? Number(approverId) : null},
          approved_at = NOW()
      WHERE id = ${Number(leaveId)}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH Leave Error:", error);
    return NextResponse.json({ error: "휴가 결재 처리 실패" }, { status: 500 });
  }
}
