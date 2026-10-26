import { NextResponse } from "next/server";
import { supabaseErp, getErpPool } from "@/lib/supabaseErp";

// GET: List all employees with calculated leave balance
export async function GET() {
  try {
    const pool = getErpPool();
    const query = `
      SELECT 
        e.id, 
        e.employee_no as "employeeNo", 
        e.login_id as "loginId", 
        e.name, 
        e.position, 
        e.duty,
        e.tier_level as "tierLevel",
        e.department, 
        e.role, 
        e.role_code as "roleCode",
        e.base_salary as "baseSalary",
        e.email, 
        e.phone, 
        e.birth_date as "birthDate",
        e.address,
        e.join_date as "joinDate",
        e.leave_date as "leaveDate",
        e.employment_status as "employmentStatus",
        e.annual_leave_grant as "grantDays",
        COALESCE(SUM(CASE WHEN l.status = 'APPROVED' THEN l.deducted_days ELSE 0 END), 0) as "usedDays",
        (e.annual_leave_grant - COALESCE(SUM(CASE WHEN l.status = 'APPROVED' THEN l.deducted_days ELSE 0 END), 0)) as "remainDays",
        e.must_change_password as "mustChangePassword",
        e.created_at as "createdAt"
      FROM erp_employees e
      LEFT JOIN erp_leave_requests l ON e.id = l.employee_id
      GROUP BY e.id
      ORDER BY e.id ASC
    `;

    const result = await pool.query(query);
    return NextResponse.json({ success: true, employees: result.rows });
  } catch (error: any) {
    console.error("GET Employees Error:", error);
    return NextResponse.json(
      { error: "사원 목록 조회 실패: " + error.message },
      { status: 500 }
    );
  }
}

// POST: Super Admin / Admin creates a new employee account (Default Pwd: 1111)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      employeeNo, loginId, name, position, duty, tierLevel, department, 
      role, roleCode, email, phone, birthDate, address, baseSalary, joinDate, grantDays 
    } = body;

    if (!employeeNo || !loginId || !name || !role) {
      return NextResponse.json(
        { error: "사번, 아이디, 성명, 권한은 필수 항목입니다." },
        { status: 400 }
      );
    }

    const cleanId = loginId.trim().toLowerCase();
    const parsedGrant = parseFloat(grantDays || "15.0");

    const { data, error } = await supabaseErp
      .from("erp_employees")
      .insert({
        employee_no: employeeNo.trim(),
        login_id: cleanId,
        password_hash: "1111",
        name: name.trim(),
        position: position || "사원",
        duty: duty || "팀원",
        tier_level: tierLevel ? parseInt(tierLevel) : 1,
        department: department || "기술개발부",
        role: role || "USER",
        role_code: roleCode || "EMPLOYEE",
        base_salary: baseSalary ? parseFloat(baseSalary) : 3500000,
        email: email ? email.trim() : null,
        phone: phone ? phone.trim() : null,
        birth_date: birthDate || null,
        address: address || null,
        join_date: joinDate || new Date().toISOString().split("T")[0],
        employment_status: "ACTIVE",
        annual_leave_grant: isNaN(parsedGrant) ? 15.0 : parsedGrant,
        must_change_password: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "이미 존재하는 사번 또는 아이디입니다." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, employee: data });
  } catch (error: any) {
    console.error("POST Employee Error:", error);
    return NextResponse.json(
      { error: "사원 등록 처리 실패" },
      { status: 500 }
    );
  }
}

// PUT: Update employee details or employment status
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, position, duty, tierLevel, department, role, roleCode, email, phone, 
      birthDate, address, baseSalary, employmentStatus, leaveDate, grantDays 
    } = body;

    if (!id) {
      return NextResponse.json({ error: "사원 ID가 누락되었습니다." }, { status: 400 });
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString()
    };
    if (position !== undefined) updatePayload.position = position;
    if (duty !== undefined) updatePayload.duty = duty;
    if (tierLevel !== undefined) updatePayload.tier_level = parseInt(tierLevel);
    if (department !== undefined) updatePayload.department = department;
    if (role !== undefined) updatePayload.role = role;
    if (roleCode !== undefined) updatePayload.role_code = roleCode;
    if (email !== undefined) updatePayload.email = email;
    if (phone !== undefined) updatePayload.phone = phone;
    if (birthDate !== undefined) updatePayload.birth_date = birthDate || null;
    if (address !== undefined) updatePayload.address = address || null;
    if (baseSalary !== undefined) updatePayload.base_salary = parseFloat(baseSalary);
    if (employmentStatus !== undefined) updatePayload.employment_status = employmentStatus;
    if (leaveDate !== undefined) updatePayload.leave_date = leaveDate || null;
    if (grantDays !== undefined) updatePayload.annual_leave_grant = parseFloat(grantDays);

    const { data, error } = await supabaseErp
      .from("erp_employees")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, employee: data });
  } catch (error: any) {
    console.error("PUT Employee Error:", error);
    return NextResponse.json({ error: "사원 정보 수정 실패" }, { status: 500 });
  }
}
