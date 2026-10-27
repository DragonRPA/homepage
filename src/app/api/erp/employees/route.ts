import { NextResponse } from "next/server";
import { supabaseErp, getErpPool } from "@/lib/supabaseErp";

function normalizeStatusToEbro(rawStatus: string | null | undefined): "ACTIVE" | "LEAVE_OF_ABSENCE" | "RETIRED" {
  const s = (rawStatus || "ACTIVE").toUpperCase();
  if (s === "LEAVE" || s === "LEAVE_OF_ABSENCE" || s === "ON_LEAVE") return "LEAVE_OF_ABSENCE";
  if (s === "RETIRED" || s === "RESIGNED") return "RETIRED";
  return "ACTIVE";
}

function normalizeStatusToDb(rawStatus: string | null | undefined): "ACTIVE" | "LEAVE" | "RETIRED" {
  const s = (rawStatus || "ACTIVE").toUpperCase();
  if (s === "LEAVE" || s === "LEAVE_OF_ABSENCE" || s === "ON_LEAVE") return "LEAVE";
  if (s === "RETIRED" || s === "RESIGNED") return "RETIRED";
  return "ACTIVE";
}

// GET: List all employees with calculated leave balance & department_id mapping
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
        COALESCE(e.tier_level, 0) as "tierLevel",
        COALESCE(e.tier_level, 0) as "tier_level",
        e.department_id::text as "departmentId",
        COALESCE(d.dept_name, e.department, '') as "department", 
        e.role, 
        e.role_code as "roleCode",
        e.base_salary as "baseSalary",
        e.salary_bank_name as "salaryBankName",
        e.salary_account_no as "salaryAccountNo",
        e.salary_account_holder as "salaryAccountHolder",
        e.email, 
        e.phone, 
        e.birth_date::text as "birthDate",
        e.address,
        e.join_date::text as "joinDate",
        e.leave_date::text as "leaveDate",
        e.employment_status as "employmentStatus",
        e.profile_image_url as "profileImageUrl",
        e.annual_leave_grant as "grantDays",
        COALESCE(SUM(CASE WHEN l.status = 'APPROVED' THEN l.deducted_days ELSE 0 END), 0) as "usedDays",
        (e.annual_leave_grant - COALESCE(SUM(CASE WHEN l.status = 'APPROVED' THEN l.deducted_days ELSE 0 END), 0)) as "remainDays",
        e.must_change_password as "mustChangePassword",
        e.created_at as "createdAt",
        e.updated_at as "updatedAt"
      FROM erp_employees e
      LEFT JOIN erp_departments d ON e.department_id = d.id
      LEFT JOIN erp_leave_requests l ON e.id = l.employee_id
      GROUP BY e.id, d.dept_name
      ORDER BY e.id ASC
    `;

    const result = await pool.query(query);
    const employees = result.rows.map((row: any) => ({
      ...row,
      status: normalizeStatusToEbro(row.employmentStatus),
      employmentStatus: normalizeStatusToDb(row.employmentStatus),
    }));

    return NextResponse.json({ success: true, employees });
  } catch (error: any) {
    console.error("GET Employees Error:", error);
    return NextResponse.json(
      { error: "사원 목록 조회 실패: " + error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new employee account (Supports eBro ERP Unassigned Pool creation: departmentId = null)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeNo,
      loginId,
      passwordHash,
      name,
      position,
      duty,
      tierLevel,
      tier_level,
      departmentId,
      department,
      role,
      roleCode,
      email,
      phone,
      birthDate,
      address,
      baseSalary,
      salaryBankName,
      salaryAccountNo,
      salaryAccountHolder,
      joinDate,
      grantDays,
      status,
      employmentStatus,
      profileImageUrl,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: "임직원 성명을 입력해 주십시오." },
        { status: 400 }
      );
    }

    const tsSuffix = String(Date.now()).slice(-6);
    const cleanNo = (employeeNo && String(employeeNo).trim()) || `DR-${tsSuffix}`;
    const cleanId = (loginId && String(loginId).trim().toLowerCase()) || `user_${tsSuffix}`;
    const parsedGrant = parseFloat(grantDays || "15.0");
    const parsedDeptId =
      departmentId !== undefined && departmentId !== null && departmentId !== "" && !isNaN(Number(departmentId))
        ? Number(departmentId)
        : null;

    let resolvedDeptName = department !== undefined ? String(department).trim() : "";
    if (parsedDeptId) {
      const { data: deptRow } = await supabaseErp
        .from("erp_departments")
        .select("dept_name")
        .eq("id", parsedDeptId)
        .single();
      if (deptRow?.dept_name) {
        resolvedDeptName = deptRow.dept_name;
      }
    }

    const effTier = tier_level !== undefined ? Number(tier_level) : tierLevel !== undefined ? Number(tierLevel) : 0;
    const dbStatus = normalizeStatusToDb(status || employmentStatus || "ACTIVE");
    const pwdToSave =
      passwordHash && String(passwordHash).trim() && passwordHash !== "__HASHED__"
        ? String(passwordHash).trim()
        : "1111";

    const { data, error } = await supabaseErp
      .from("erp_employees")
      .insert({
        employee_no: cleanNo,
        login_id: cleanId,
        password_hash: pwdToSave,
        name: String(name).trim(),
        position: position ?? "사원",
        duty: duty ?? "",
        tier_level: isNaN(effTier) ? 0 : effTier,
        department_id: parsedDeptId,
        department: resolvedDeptName,
        role: role || "USER",
        role_code: roleCode || (role === "ADMIN" ? "ADMIN" : role === "MANAGER" ? "MANAGER" : "EMPLOYEE"),
        base_salary: baseSalary !== undefined ? parseFloat(baseSalary) || 0 : 3500000,
        salary_bank_name: salaryBankName ? String(salaryBankName).trim() : null,
        salary_account_no: salaryAccountNo ? String(salaryAccountNo).trim() : null,
        salary_account_holder: salaryAccountHolder ? String(salaryAccountHolder).trim() : null,
        email: email ? String(email).trim() : null,
        phone: phone ? String(phone).trim() : null,
        birth_date: birthDate || null,
        address: address || null,
        join_date: joinDate || new Date().toISOString().split("T")[0],
        employment_status: dbStatus,
        profile_image_url: profileImageUrl || null,
        annual_leave_grant: isNaN(parsedGrant) ? 15.0 : parsedGrant,
        must_change_password: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "이미 존재하는 사번 또는 로그인 아이디입니다." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      employee: {
        ...data,
        id: data.id,
        employeeNo: data.employee_no,
        loginId: data.login_id,
        departmentId: data.department_id ? String(data.department_id) : null,
        department: data.department || "",
        tier_level: data.tier_level ?? 0,
        tierLevel: data.tier_level ?? 0,
        status: normalizeStatusToEbro(data.employment_status),
        employmentStatus: normalizeStatusToDb(data.employment_status),
        salaryBankName: data.salary_bank_name || "",
        salaryAccountNo: data.salary_account_no || "",
        salaryAccountHolder: data.salary_account_holder || "",
        profileImageUrl: data.profile_image_url || undefined,
      },
    });
  } catch (error: any) {
    console.error("POST Employee Error:", error);
    return NextResponse.json(
      { error: "사원 등록 처리 실패: " + error.message },
      { status: 500 }
    );
  }
}

// PUT: Update employee details, department assignment (including Unassigned Pool null), or employment status
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      loginId,
      passwordHash,
      name,
      position,
      duty,
      tierLevel,
      tier_level,
      departmentId,
      department,
      role,
      roleCode,
      email,
      phone,
      birthDate,
      joinDate,
      address,
      baseSalary,
      salaryBankName,
      salaryAccountNo,
      salaryAccountHolder,
      status,
      employmentStatus,
      leaveDate,
      grantDays,
      profileImageUrl,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "사원 ID가 누락되었습니다." }, { status: 400 });
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined && String(name).trim()) updatePayload.name = String(name).trim();
    if (loginId !== undefined && String(loginId).trim()) updatePayload.login_id = String(loginId).trim().toLowerCase();
    if (passwordHash && String(passwordHash).trim() && !String(passwordHash).startsWith("__HASHED__")) {
      updatePayload.password_hash = String(passwordHash).trim();
    }
    if (position !== undefined) updatePayload.position = position;
    if (duty !== undefined) updatePayload.duty = duty;
    if (tier_level !== undefined) updatePayload.tier_level = parseInt(tier_level);
    else if (tierLevel !== undefined) updatePayload.tier_level = parseInt(tierLevel);

    if (departmentId !== undefined) {
      const parsedDeptId =
        departmentId !== null && departmentId !== "" && !isNaN(Number(departmentId))
          ? Number(departmentId)
          : null;
      updatePayload.department_id = parsedDeptId;
      if (parsedDeptId === null) {
        updatePayload.department = "";
      } else {
        const { data: deptRow } = await supabaseErp
          .from("erp_departments")
          .select("dept_name")
          .eq("id", parsedDeptId)
          .single();
        if (deptRow?.dept_name) {
          updatePayload.department = deptRow.dept_name;
        } else if (department !== undefined) {
          updatePayload.department = department;
        }
      }
    } else if (department !== undefined) {
      updatePayload.department = department;
    }

    if (role !== undefined) updatePayload.role = role;
    if (roleCode !== undefined) updatePayload.role_code = roleCode;
    if (email !== undefined) updatePayload.email = email || null;
    if (phone !== undefined) updatePayload.phone = phone || null;
    if (birthDate !== undefined) updatePayload.birth_date = birthDate || null;
    if (joinDate !== undefined) updatePayload.join_date = joinDate || new Date().toISOString().split("T")[0];
    if (address !== undefined) updatePayload.address = address || null;
    if (baseSalary !== undefined) updatePayload.base_salary = parseFloat(baseSalary) || 0;
    if (salaryBankName !== undefined) updatePayload.salary_bank_name = salaryBankName ? String(salaryBankName).trim() : null;
    if (salaryAccountNo !== undefined) updatePayload.salary_account_no = salaryAccountNo ? String(salaryAccountNo).trim() : null;
    if (salaryAccountHolder !== undefined) updatePayload.salary_account_holder = salaryAccountHolder ? String(salaryAccountHolder).trim() : null;
    if (status !== undefined || employmentStatus !== undefined) {
      updatePayload.employment_status = normalizeStatusToDb(status ?? employmentStatus);
    }
    if (leaveDate !== undefined) updatePayload.leave_date = leaveDate || null;
    if (grantDays !== undefined) updatePayload.annual_leave_grant = parseFloat(grantDays);
    if (profileImageUrl !== undefined) updatePayload.profile_image_url = profileImageUrl || null;

    const { data, error } = await supabaseErp
      .from("erp_employees")
      .update(updatePayload)
      .eq("id", Number(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      employee: {
        ...data,
        id: data.id,
        employeeNo: data.employee_no,
        loginId: data.login_id,
        departmentId: data.department_id ? String(data.department_id) : null,
        department: data.department || "",
        tier_level: data.tier_level ?? 0,
        tierLevel: data.tier_level ?? 0,
        status: normalizeStatusToEbro(data.employment_status),
        employmentStatus: normalizeStatusToDb(data.employment_status),
        salaryBankName: data.salary_bank_name || "",
        salaryAccountNo: data.salary_account_no || "",
        salaryAccountHolder: data.salary_account_holder || "",
        profileImageUrl: data.profile_image_url || undefined,
      },
    });
  } catch (error: any) {
    console.error("PUT Employee Error:", error);
    return NextResponse.json({ error: "사원 정보 수정 실패: " + error.message }, { status: 500 });
  }
}
