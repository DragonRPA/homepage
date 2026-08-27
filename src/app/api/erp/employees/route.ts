import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET: List all employees directly from Neon DB
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
        e.must_change_password as "mustChangePassword",
        e.created_at as "createdAt",
        m.name as "managerName"
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      ORDER BY e.id ASC
    `;

    return NextResponse.json({ success: true, employees: rows });
  } catch (error: any) {
    console.error("GET Employees Error:", error);
    return NextResponse.json(
      { error: "임직원 목록 조회 오류" },
      { status: 500 }
    );
  }
}

// POST: Super Admin creates a new employee account (Default Pwd: 1111)
export async function POST(request: Request) {
  try {
    const { employeeNo, loginId, name, position, department, role, email, phone, managerId } = await request.json();

    if (!employeeNo || !loginId || !name || !role) {
      return NextResponse.json(
        { error: "사번, 아이디, 성명, 권한 역할은 필수 항목입니다." },
        { status: 400 }
      );
    }

    const cleanId = loginId.trim().toLowerCase();

    await sql`
      INSERT INTO employees (
        employee_no, login_id, name, position, department, role, email, phone, 
        manager_id, password_hash, must_change_password
      ) VALUES (
        ${employeeNo}, ${cleanId}, ${name}, ${position || "사원"}, ${department || "기술개발부"}, 
        ${role}, ${email || `${cleanId}@dragonrpa.co.kr`}, ${phone || null}, 
        ${managerId ? Number(managerId) : null}, '1111', TRUE
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST Employee Error:", error);
    return NextResponse.json(
      { error: error.message || "계정 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PATCH: Reset employee password to '1111'
export async function PATCH(request: Request) {
  try {
    const { employeeId } = await request.json();

    if (!employeeId) {
      return NextResponse.json({ error: "직원 ID가 필요합니다." }, { status: 400 });
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
