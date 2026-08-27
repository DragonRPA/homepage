import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT 
        o.id,
        o.employee_id as "employeeId",
        e.name as "empName",
        o.work_date as "workDate",
        o.work_type as "workType",
        o.start_time as "startTime",
        o.end_time as "endTime",
        o.total_hours as "hours",
        o.work_details as "details",
        o.created_at as "createdAt"
      FROM overtimes o
      JOIN employees e ON o.employee_id = e.id
      ORDER BY o.id DESC
    `;

    return NextResponse.json({ success: true, overtimes: rows });
  } catch (error: any) {
    console.error("GET Overtimes Error:", error);
    return NextResponse.json({ error: "초과근무 목록 조회 실패" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { employeeId, workDate, workType, startTime, endTime, hours, details } = await request.json();

    if (!employeeId || !workDate || !startTime || !endTime) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    await sql`
      INSERT INTO overtimes (
        employee_id, work_date, work_type, start_time, end_time, total_hours, work_details
      ) VALUES (
        ${Number(employeeId)}, ${workDate}, ${workType || "EXTENDED"}, ${startTime}, ${endTime},
        ${Number(hours || 1.0)}, ${details || ""}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST Overtime Error:", error);
    return NextResponse.json({ error: "초과근무 등록 실패" }, { status: 500 });
  }
}
