import { NextResponse } from "next/server";
import { supabaseErp } from "@/lib/supabaseErp";

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

    const { data: employees, error } = await supabaseErp
      .from("erp_employees")
      .select("id, employee_no, login_id, name, position, department, role, password_hash, must_change_password, email, employment_status")
      .ilike("login_id", cleanId)
      .limit(1);

    if (error) {
      console.error("Login DB Query Error:", error);
      return NextResponse.json({ error: "데이터베이스 연결 오류" }, { status: 500 });
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: "등록되지 않은 아이디입니다." },
        { status: 401 }
      );
    }

    const emp = employees[0];

    if (emp.employment_status === 'RESIGNED') {
      return NextResponse.json(
        { error: "퇴사 처리된 계정입니다. 관리자에게 문의하십시오." },
        { status: 403 }
      );
    }

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
      { error: "로그인 처리 중 시스템 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
