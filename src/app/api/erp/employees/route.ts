import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET: List all employees with leave stats directly from Neon DB
export async function GET() {
  try {
    const rows = await sql`
      SELECT 
        e.id, 
        e.employee_no as "employeeNo", 
        e.login_id as "loginId", 
        e.name, 
        e.position, 
        e.department, 
        e.role, 
        e.email, 
        e.phone, 
        e.annual_leave_grant as "grantDays",
        COALESCE(SUM(CASE WHEN l.status = 'APPROVED' THEN l.deducted_annual_days ELSE 0 END), 0) as "usedDays",
        (e.annual_leave_grant - COALESCE(SUM(CASE WHEN l.status = 'APPROVED' THEN l.deducted_annual_days ELSE 0 END), 0)) as "remainDays",
        e.must_change_password as "mustChangePassword",
        e.created_at as "createdAt",
        m.name as "managerName"
      FROM employees e
      LEFT JOIN leave_requests l ON e.id = l.employee_id
      LEFT JOIN employees m ON e.manager_id = m.id
      GROUP BY e.id, m.name
      ORDER BY e.id ASC
    `;

    return NextResponse.json({ success: true, employees: rows });
  } catch (error: any) {
    console.error("GET Employees Error:", error);
    return NextResponse.json(
      { error: "사원 목록 조회 실패" },
      { status: 500 }
    );
  }
}

// POST: Super Admin creates a new employee account (Default Pwd: 1111)
export async function POST(request: Request) {
  try {
    const { employeeNo, loginId, name, position, department, role, email, phone, managerId, grantDays } = await request.json();

    if (!employeeNo || !loginId || !name || !role) {
      return NextResponse.json(
        { error: "사번, 아이디, 성명, 권한은 필수 항목입니다." },
        { status: 400 }
      );
    }

    const cleanId = loginId.trim().toLowerCase();
    const annualGrant = Number(grantDays) || 15.0;

    await sql`
      INSERT INTO employees (
        employee_no, login_id, name, position, department, role, email, phone, 
        manager_id, password_hash, must_change_password, annual_leave_grant
      ) VALUES (
        ${employeeNo}, ${cleanId}, ${name}, ${position || "사원"}, ${department || "기술개발부"}, 
        ${role}, ${email || `${cleanId}@dragonrpa.co.kr`}, ${phone || null}, 
        ${managerId ? Number(managerId) : null}, '1111', TRUE, ${annualGrant}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST Employee Error:", error);
    return NextResponse.json(
      { error: error.message || "사원 등록 실패" },
      { status: 500 }
    );
  }
}

// PATCH: Reset employee password to '1111'
export async function PATCH(request: Request) {
  try {
    const { employeeId } = await request.json();

    if (!employeeId) {
      return NextResponse.json({ error: "사원 ID가 필요합니다." }, { status: 400 });
    }

    await sql`
      UPDATE employees
      SET password_hash = '1111',
          must_change_password = TRUE,
          password_changed_at = NULL,
          updated_at = NOW()
      WHERE id = ${Number(employeeId)}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return NextResponse.json(
      { error: "비밀번호 초기화 실패" },
      { status: 500 }
    );
  }
}
