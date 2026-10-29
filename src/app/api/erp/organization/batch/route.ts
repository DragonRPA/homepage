import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

function normalizeStatusToDb(rawStatus: string | null | undefined): "ACTIVE" | "LEAVE" | "RETIRED" {
  const s = (rawStatus || "ACTIVE").toUpperCase();
  if (s === "LEAVE" || s === "LEAVE_OF_ABSENCE" || s === "ON_LEAVE") return "LEAVE";
  if (s === "RETIRED" || s === "RESIGNED") return "RETIRED";
  return "ACTIVE";
}

function normalizeStatusToEbro(rawStatus: string | null | undefined): "ACTIVE" | "LEAVE_OF_ABSENCE" | "RETIRED" {
  const s = (rawStatus || "ACTIVE").toUpperCase();
  if (s === "LEAVE" || s === "LEAVE_OF_ABSENCE" || s === "ON_LEAVE") return "LEAVE_OF_ABSENCE";
  if (s === "RETIRED" || s === "RESIGNED") return "RETIRED";
  return "ACTIVE";
}

export async function POST(request: Request) {
  const pool = getErpPool();
  const client = await pool.connect();

  try {
    const body = await request.json();
    const incomingDepts: any[] = Array.isArray(body.departments) ? body.departments : [];
    const incomingUsers: any[] = Array.isArray(body.users) ? body.users : [];

    await client.query("BEGIN");

    // 1. Fetch current DB departments
    const existingDeptsRes = await client.query("SELECT id, dept_code, dept_name FROM erp_departments");
    const existingDeptIds = new Set<string>(existingDeptsRes.rows.map((r: any) => String(r.id)));

    // Map from client dept.id -> DB numeric id (as string)
    const deptIdMap = new Map<string, string>();
    const deptNameMap = new Map<string, string>();

    // First pass: Upsert / Insert departments without parent_id to guarantee all IDs exist
    for (let i = 0; i < incomingDepts.length; i++) {
      const d = incomingDepts[i];
      const rawId = String(d.id);
      const deptName = String(d.name ?? d.deptName ?? "새 부서").trim() || "새 부서";
      const tags = Array.isArray(d.functional_tags || d.functionalTags)
        ? (d.functional_tags || d.functionalTags)
        : [];
      const sortOrder = d.sortOrder ? parseInt(d.sortOrder) : (i + 1) * 10;

      if (existingDeptIds.has(rawId)) {
        await client.query(
          `UPDATE erp_departments
           SET dept_name = $1,
               functional_tags = $2::jsonb,
               sort_order = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [deptName, JSON.stringify(tags), sortOrder, Number(rawId)]
        );
        deptIdMap.set(rawId, rawId);
        deptNameMap.set(rawId, deptName);
      } else {
        const deptCode = (d.deptCode || `DEPT-${Date.now()}-${i}`).toUpperCase();
        const ins = await client.query(
          `INSERT INTO erp_departments (dept_code, dept_name, parent_id, functional_tags, sort_order, created_at, updated_at)
           VALUES ($1, $2, NULL, $3::jsonb, $4, NOW(), NOW())
           RETURNING id`,
          [deptCode, deptName, JSON.stringify(tags), sortOrder]
        );
        const newDbId = String(ins.rows[0].id);
        deptIdMap.set(rawId, newDbId);
        deptNameMap.set(newDbId, deptName);
      }
    }

    // Second pass: Update parent_id relationships using deptIdMap
    for (const d of incomingDepts) {
      const dbId = deptIdMap.get(String(d.id));
      if (!dbId) continue;
      const rawParent = d.parentDepartmentId ?? d.parentId ?? null;
      const mappedParent = rawParent ? (deptIdMap.get(String(rawParent)) || (existingDeptIds.has(String(rawParent)) ? String(rawParent) : null)) : null;
      const parentNum = mappedParent && mappedParent !== dbId ? Number(mappedParent) : null;

      await client.query(
        `UPDATE erp_departments SET parent_id = $1 WHERE id = $2`,
        [parentNum, Number(dbId)]
      );
    }

    // Delete departments that were removed in UI
    const keptDbDeptIds = new Set<string>(Array.from(deptIdMap.values()));
    const deptsToDelete = Array.from(existingDeptIds).filter((id) => !keptDbDeptIds.has(id));
    if (deptsToDelete.length > 0) {
      const delNums = deptsToDelete.map((id) => Number(id));
      await client.query(
        `UPDATE erp_employees SET department_id = NULL, department = '' WHERE department_id = ANY($1::bigint[])`,
        [delNums]
      );
      await client.query(
        `DELETE FROM erp_departments WHERE id = ANY($1::bigint[])`,
        [delNums]
      );
    }

    // 2. Sync Employees (erp_employees)
    const existingUsersRes = await client.query("SELECT id, login_id, employee_no FROM erp_employees");
    const existingUserIds = new Set<string>(existingUsersRes.rows.map((r: any) => String(r.id)));

    for (let idx = 0; idx < incomingUsers.length; idx++) {
      const u = incomingUsers[idx];
      const rawUserId = String(u.id);
      const rawDeptId = u.departmentId !== undefined && u.departmentId !== null && u.departmentId !== "" ? String(u.departmentId) : null;
      const mappedDeptId = rawDeptId ? (deptIdMap.get(rawDeptId) || (keptDbDeptIds.has(rawDeptId) ? rawDeptId : null)) : null;
      const resolvedDeptName = mappedDeptId ? (deptNameMap.get(mappedDeptId) || u.department || "") : "";

      const empName = String(u.name || "").trim() || `신규직원_${idx + 1}`;
      const position = u.position || "사원";
      const duty = u.duty ?? "";
      const tierLevel = u.tier_level !== undefined ? Number(u.tier_level) : u.tierLevel !== undefined ? Number(u.tierLevel) : 0;
      const role = u.role || "USER";
      const roleCode = u.roleCode || (role === "ADMIN" ? "ADMIN" : role === "MANAGER" ? "MANAGER" : "EMPLOYEE");
      const dbStatus = normalizeStatusToDb(u.status || u.employmentStatus || "ACTIVE");
      const baseSalary = u.baseSalary !== undefined ? Number(u.baseSalary) || 0 : 3500000;
      const hourlyWage =
        u.hourlyWage !== undefined && Number(u.hourlyWage) > 0
          ? Number(u.hourlyWage)
          : Math.round((baseSalary || 3500000) / 209);
      const mealAllowance = u.mealAllowance !== undefined ? Number(u.mealAllowance) || 0 : 200000;
      const vehicleAllowance = u.vehicleAllowance !== undefined ? Number(u.vehicleAllowance) || 0 : 0;
      const salaryBankName = u.salaryBankName ? String(u.salaryBankName).trim() : null;
      const salaryAccountNo = u.salaryAccountNo ? String(u.salaryAccountNo).trim() : null;
      const salaryAccountHolder = u.salaryAccountHolder ? String(u.salaryAccountHolder).trim() : null;
      const phone = u.phone ? String(u.phone).trim() : null;
      const email = u.email ? String(u.email).trim() : null;
      const birthDate = u.birthDate && String(u.birthDate).trim() ? String(u.birthDate).substring(0, 10) : null;
      const joinDate = u.joinDate && String(u.joinDate).trim() ? String(u.joinDate).substring(0, 10) : new Date().toISOString().substring(0, 10);
      const leaveDate = u.leaveDate && String(u.leaveDate).trim() ? String(u.leaveDate).substring(0, 10) : null;
      const address = u.address ? String(u.address).trim() : null;
      const profileImageUrl = u.profileImageUrl || null;

      if (existingUserIds.has(rawUserId)) {
        const loginIdToSave = u.loginId && String(u.loginId).trim() ? String(u.loginId).trim().toLowerCase() : undefined;
        const pwdToSave =
          u.passwordHash && String(u.passwordHash).trim() && !String(u.passwordHash).startsWith("__HASHED__")
            ? String(u.passwordHash).trim()
            : null;

        await client.query(
          `UPDATE erp_employees
           SET name = $1,
               position = $2,
               duty = $3,
               tier_level = $4,
               department_id = $5,
               department = $6,
               role = $7,
               role_code = $8,
               employment_status = $9,
               base_salary = $10,
               hourly_wage = $11,
               meal_allowance = $12,
               vehicle_allowance = $13,
               salary_bank_name = $14,
               salary_account_no = $15,
               salary_account_holder = $16,
               phone = $17,
               email = $18,
               birth_date = $19,
               join_date = $20,
               leave_date = $21,
               address = $22,
               profile_image_url = $23,
               login_id = COALESCE($24, login_id),
               password_hash = COALESCE($25, password_hash),
               updated_at = NOW()
           WHERE id = $26`,
          [
            empName,
            position,
            duty,
            isNaN(tierLevel) ? 0 : tierLevel,
            mappedDeptId ? Number(mappedDeptId) : null,
            resolvedDeptName,
            role,
            roleCode,
            dbStatus,
            baseSalary,
            hourlyWage,
            mealAllowance,
            vehicleAllowance,
            salaryBankName,
            salaryAccountNo,
            salaryAccountHolder,
            phone,
            email,
            birthDate,
            joinDate,
            leaveDate,
            address,
            profileImageUrl,
            loginIdToSave || null,
            pwdToSave,
            Number(rawUserId),
          ]
        );
      } else {
        const tsSuffix = `${Date.now().toString().slice(-5)}${idx}`;
        const empNo = (u.employeeNo && String(u.employeeNo).trim()) || `DR-${tsSuffix}`;
        const loginId = (u.loginId && String(u.loginId).trim().toLowerCase()) || `user_${tsSuffix}`;
        const pwd =
          u.passwordHash && String(u.passwordHash).trim() && !String(u.passwordHash).startsWith("__HASHED__")
            ? String(u.passwordHash).trim()
            : "1111";

        await client.query(
          `INSERT INTO erp_employees (
            employee_no, login_id, password_hash, name, position, duty, tier_level,
            department_id, department, role, role_code, employment_status, base_salary, hourly_wage,
            meal_allowance, vehicle_allowance,
            salary_bank_name, salary_account_no, salary_account_holder,
            phone, email, birth_date, join_date, leave_date, address, profile_image_url,
            annual_leave_grant, must_change_password, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14,
            $15, $16,
            $17, $18, $19,
            $20, $21, $22, $23, $24, $25, $26,
            15.0, true, NOW(), NOW()
          )`,
          [
            empNo,
            loginId,
            pwd,
            empName,
            position,
            duty,
            isNaN(tierLevel) ? 0 : tierLevel,
            mappedDeptId ? Number(mappedDeptId) : null,
            resolvedDeptName,
            role,
            roleCode,
            dbStatus,
            baseSalary,
            hourlyWage,
            mealAllowance,
            vehicleAllowance,
            salaryBankName,
            salaryAccountNo,
            salaryAccountHolder,
            phone,
            email,
            birthDate,
            joinDate,
            leaveDate,
            address,
            profileImageUrl,
          ]
        );
      }
    }

    await client.query("COMMIT");

    // 3. Query updated state to return to client
    const finalDeptsRes = await client.query(`
      SELECT 
        d.id::text as "id",
        d.dept_code as "deptCode",
        d.dept_name as "deptName",
        d.dept_name as "name",
        d.parent_id::text as "parentId",
        d.parent_id::text as "parentDepartmentId",
        d.manager_name as "managerName",
        d.sort_order as "sortOrder",
        COALESCE(d.functional_tags, '[]'::jsonb) as "functionalTags",
        COALESCE(d.functional_tags, '[]'::jsonb) as "functional_tags",
        d.created_at as "createdAt",
        d.updated_at as "updatedAt",
        COUNT(e.id)::int as "memberCount"
      FROM erp_departments d
      LEFT JOIN erp_employees e ON e.department_id = d.id
      GROUP BY d.id
      ORDER BY d.sort_order ASC, d.id ASC
    `);

    const finalEmpsRes = await client.query(`
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
        COALESCE(e.hourly_wage, ROUND(COALESCE(e.base_salary, 3500000) / 209.0))::numeric as "hourlyWage",
        COALESCE(e.meal_allowance, 200000)::numeric as "mealAllowance",
        COALESCE(e.vehicle_allowance, 0)::numeric as "vehicleAllowance",
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
        e.created_at as "createdAt",
        e.updated_at as "updatedAt"
      FROM erp_employees e
      LEFT JOIN erp_departments d ON e.department_id = d.id
      ORDER BY e.id ASC
    `);

    const finalUsers = finalEmpsRes.rows.map((row: any) => ({
      ...row,
      status: normalizeStatusToEbro(row.employmentStatus),
      employmentStatus: normalizeStatusToDb(row.employmentStatus),
    }));

    return NextResponse.json({
      success: true,
      departments: finalDeptsRes.rows,
      users: finalUsers,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Batch Organization Save Error:", error);
    return NextResponse.json(
      { error: "조직도 및 구성원 일괄 저장 실패: " + error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
