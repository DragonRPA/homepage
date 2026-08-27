import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { loginId, password } = await request.json();

    if (!loginId || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 모두 입력해 주십시오." },
        { status: 400 }
      );
    }

    const cleanId = loginId.trim().toLowerCase();

    // Query Neon PostgreSQL DB
    const rows = await sql`
      SELECT id, employee_no, login_id, name, position, department, role, password_hash, must_change_password, email
      FROM employees
      WHERE LOWER(login_id) = ${cleanId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "등록되지 않은 아이디입니다." },
        { status: 401 }
      );
    }

    const emp = rows[0];

    // Check Password
    if (emp.password_hash !== password) {
      return NextResponse.json(
        { error: "비밀번호가 일치하지 않습니다. (초기 비밀번호: 1111)" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: emp.id,
        employeeNo: emp.employee_no,
        loginId: emp.login_id,
        name: emp.name,
        position: emp.position,
        department: emp.department,
        role: emp.role,
        email: emp.email,
        mustChangePassword: emp.must_change_password,
      },
    });
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "데이터베이스 연결 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
