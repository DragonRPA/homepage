export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import {
  encryptPii,
  decryptPii,
  hashPassword,
  maskBankAccount,
  maskResidentRegNo,
} from "@/lib/piiCrypto";
import { calculateAnnualLeaveEntitlement } from "@/lib/erpHrLaborDomain";
import { getErpSessionFromRequest } from "@/lib/erpSecurityAudit";

function normalizeStatusToDb(rawStatus: string | null | undefined, leaveDate?: string | null): "ACTIVE" | "LEAVE" | "RETIRED" {
  if (leaveDate && String(leaveDate).trim() !== "") return "RETIRED";
  const s = (rawStatus || "ACTIVE").trim().toUpperCase();
  if (s === "LEAVE" || s === "LEAVE_OF_ABSENCE" || s === "ON_LEAVE" || s === "휴직") return "LEAVE";
  if (s === "RETIRED" || s === "RESIGNED" || s === "퇴사" || s === "퇴직") return "RETIRED";
  return "ACTIVE";
}

function normalizeStatusToEbro(rawStatus: string | null | undefined, leaveDate?: string | null): "ACTIVE" | "LEAVE_OF_ABSENCE" | "RETIRED" {
  if (leaveDate && String(leaveDate).trim() !== "") return "RETIRED";
  const s = (rawStatus || "ACTIVE").trim().toUpperCase();
  if (s === "LEAVE" || s === "LEAVE_OF_ABSENCE" || s === "ON_LEAVE" || s === "휴직") return "LEAVE_OF_ABSENCE";
  if (s === "RETIRED" || s === "RESIGNED" || s === "퇴사" || s === "퇴직") return "RETIRED";
  return "ACTIVE";
}

interface PreparedExistingDept {
  id: number;
  deptName: string;
  tagsJson: string;
  sortOrder: number;
}

interface PreparedNewDept {
  rawId: string;
  deptCode: string;
  deptName: string;
  tagsJson: string;
  sortOrder: number;
}

interface PreparedEmployeeBase {
  rawUserId: string;
  mappedDeptIdNum: number | null;
  resolvedDeptName: string;
  empName: string;
  position: string;
  duty: string;
  tierLevel: number;
  role: string;
  roleCode: string;
  dbStatus: "ACTIVE" | "LEAVE" | "RETIRED";
  baseSalary: number;
  hourlyWage: number;
  mealAllowance: number;
  vehicleAllowance: number;
  insNationalPension: boolean;
  insHealthInsurance: boolean;
  insEmploymentInsurance: boolean;
  insIndustrialAccident: boolean;
  salaryBankName: string | null;
  salaryAccountNo: string | null | undefined;
  salaryAccountHolder: string | null;
  residentRegNo: string | null | undefined;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  joinDate: string;
  leaveDate: string | null;
  address: string | null;
  profileImageUrl: string | null;
  autoEntitlement: ReturnType<typeof calculateAnnualLeaveEntitlement>;
}

interface PreparedExistingUser extends PreparedEmployeeBase {
  id: number;
  loginIdToSave: string | null;
  pwdToSave: string | null;
  resolvedGrant: number;
  salaryAccountNoParam: string | null;
  residentRegNoParam: string | null;
}

interface PreparedNewUser extends PreparedEmployeeBase {
  empNo: string;
  loginId: string;
  pwd: string;
  salaryAccountNoParam: string | null;
  residentRegNoParam: string | null;
  grantDays: number;
}

function prepareEmployeeBase(
  u: any,
  idx: number,
  deptIdMap: Map<string, string>,
  keptDbDeptIds: Set<string>,
  deptNameMap: Map<string, string>
): PreparedEmployeeBase {
  const rawUserId = String(u.id);
  const rawDeptId =
    u.departmentId !== undefined && u.departmentId !== null && u.departmentId !== ""
      ? String(u.departmentId)
      : null;
  const mappedDeptId = rawDeptId
    ? deptIdMap.get(rawDeptId) || (keptDbDeptIds.has(rawDeptId) ? rawDeptId : null)
    : null;
  const resolvedDeptName = mappedDeptId ? deptNameMap.get(mappedDeptId) || u.department || "" : "";

  const empName = String(u.name || "").trim() || `신규직원_${idx + 1}`;
  const position = u.position || "사원";
  const duty = u.duty ?? "";
  const rawTier =
    u.tier_level !== undefined ? Number(u.tier_level) : u.tierLevel !== undefined ? Number(u.tierLevel) : 0;
  const tierLevel = isNaN(rawTier) ? 0 : Math.trunc(rawTier);
  const role = u.role || "USER";
  const roleCode = u.roleCode || (role === "ADMIN" ? "ADMIN" : role === "MANAGER" ? "MANAGER" : "EMPLOYEE");
  const dbStatus = normalizeStatusToDb(u.status || u.employmentStatus || "ACTIVE");
  const baseSalary = u.baseSalary !== undefined ? Number(String(u.baseSalary).replace(/,/g, "")) || 0 : 3500000;
  const parsedHw =
    u.hourlyWage !== undefined && u.hourlyWage !== null && u.hourlyWage !== ""
      ? Number(String(u.hourlyWage).replace(/,/g, ""))
      : 0;
  const hourlyWage = isNaN(parsedHw) ? 0 : Math.round(parsedHw);
  const mealAllowance = u.mealAllowance !== undefined ? Number(u.mealAllowance) || 0 : 200000;
  const vehicleAllowance = u.vehicleAllowance !== undefined ? Number(u.vehicleAllowance) || 0 : 0;
  const insNationalPension = u.insNationalPension !== undefined ? Boolean(u.insNationalPension) : true;
  const insHealthInsurance = u.insHealthInsurance !== undefined ? Boolean(u.insHealthInsurance) : true;
  const insEmploymentInsurance = u.insEmploymentInsurance !== undefined ? Boolean(u.insEmploymentInsurance) : true;
  const insIndustrialAccident = u.insIndustrialAccident !== undefined ? Boolean(u.insIndustrialAccident) : true;
  const salaryBankName = u.salaryBankName ? String(u.salaryBankName).trim() : null;
  const rawAccountNo = u.salaryAccountNo ? String(u.salaryAccountNo).trim() : "";
  const hasPlainAccountInput = Boolean(rawAccountNo && !rawAccountNo.includes("****"));
  const salaryAccountNo = hasPlainAccountInput
    ? encryptPii(rawAccountNo)
    : rawAccountNo.includes("****")
    ? undefined
    : null;
  const salaryAccountHolder = u.salaryAccountHolder ? String(u.salaryAccountHolder).trim() : null;
  const rawRrnInput = u.residentRegNo ? String(u.residentRegNo).trim() : "";
  const hasPlainRrnInput = Boolean(rawRrnInput && !rawRrnInput.includes("****"));
  const residentRegNo = hasPlainRrnInput
    ? encryptPii(rawRrnInput)
    : rawRrnInput.includes("****")
    ? undefined
    : null;
  const phone = u.phone ? String(u.phone).trim() : null;
  const email = u.email ? String(u.email).trim() : null;
  const birthDate = u.birthDate && String(u.birthDate).trim() ? String(u.birthDate).substring(0, 10) : null;
  const joinDate =
    u.joinDate && String(u.joinDate).trim()
      ? String(u.joinDate).substring(0, 10)
      : new Date().toISOString().substring(0, 10);
  const leaveDate = u.leaveDate && String(u.leaveDate).trim() ? String(u.leaveDate).substring(0, 10) : null;
  const address = u.address ? String(u.address).trim() : null;
  const profileImageUrl = u.profileImageUrl || null;
  const autoEntitlement = calculateAnnualLeaveEntitlement(joinDate);

  return {
    rawUserId,
    mappedDeptIdNum: mappedDeptId ? Number(mappedDeptId) : null,
    resolvedDeptName,
    empName,
    position,
    duty,
    tierLevel,
    role,
    roleCode,
    dbStatus,
    baseSalary,
    hourlyWage,
    mealAllowance,
    vehicleAllowance,
    insNationalPension,
    insHealthInsurance,
    insEmploymentInsurance,
    insIndustrialAccident,
    salaryBankName,
    salaryAccountNo,
    salaryAccountHolder,
    residentRegNo,
    phone,
    email,
    birthDate,
    joinDate,
    leaveDate,
    address,
    profileImageUrl,
    autoEntitlement,
  };
}

export async function POST(request: Request) {
  const session = await getErpSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "인증 세션이 필요합니다." }, { status: 401 });
  }
  const canReadAllPii = session.roleCode === "ADMIN" || session.roleCode === "MANAGER";

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

    const deptIdMap = new Map<string, string>();
    const deptNameMap = new Map<string, string>();

    // First pass: prepare existing and new departments in memory (parent_id set in Pass 2)
    const existingDeptsById = new Map<string, PreparedExistingDept>();
    const newDeptsByRawId = new Map<string, PreparedNewDept>();
    const batchDeptTs = Date.now();

    for (let i = 0; i < incomingDepts.length; i++) {
      const d = incomingDepts[i];
      const rawId = String(d.id);
      const deptName = String(d.name ?? d.deptName ?? "새 부서").trim() || "새 부서";
      const tags = Array.isArray(d.functional_tags || d.functionalTags)
        ? d.functional_tags || d.functionalTags
        : [];
      const tagsJson = JSON.stringify(tags);
      const parsedSort = d.sortOrder ? parseInt(String(d.sortOrder), 10) : NaN;
      const sortOrder = !isNaN(parsedSort) ? parsedSort : (i + 1) * 10;

      if (existingDeptIds.has(rawId)) {
        existingDeptsById.set(rawId, { id: Number(rawId), deptName, tagsJson, sortOrder });
        deptIdMap.set(rawId, rawId);
        deptNameMap.set(rawId, deptName);
      } else {
        const deptCode = (d.deptCode || `DEPT-${batchDeptTs}-${i}`).toUpperCase();
        newDeptsByRawId.set(rawId, { rawId, deptCode, deptName, tagsJson, sortOrder });
      }
    }

    if (existingDeptsById.size > 0) {
      const existingList = Array.from(existingDeptsById.values());
      await client.query(
        `UPDATE erp_departments AS d
         SET dept_name = u.dept_name,
             functional_tags = u.tags::jsonb,
             sort_order = u.sort_order,
             updated_at = NOW()
         FROM UNNEST($1::bigint[], $2::text[], $3::text[], $4::int[])
           AS u(id, dept_name, tags, sort_order)
         WHERE d.id = u.id`,
        [
          existingList.map((x) => x.id),
          existingList.map((x) => x.deptName),
          existingList.map((x) => x.tagsJson),
          existingList.map((x) => x.sortOrder),
        ]
      );
    }

    const newDepts = Array.from(newDeptsByRawId.values());
    const newDeptRawIds = newDepts.map((x) => x.rawId);
    if (newDepts.length > 0) {
      const ins = await client.query(
        `INSERT INTO erp_departments (dept_code, dept_name, parent_id, functional_tags, sort_order, created_at, updated_at)
         SELECT u.dept_code, u.dept_name, NULL, u.tags::jsonb, u.sort_order, NOW(), NOW()
         FROM UNNEST($1::varchar[], $2::text[], $3::text[], $4::int[])
           AS u(dept_code, dept_name, tags, sort_order)
         RETURNING id`,
        [
          newDepts.map((x) => x.deptCode),
          newDepts.map((x) => x.deptName),
          newDepts.map((x) => x.tagsJson),
          newDepts.map((x) => x.sortOrder),
        ]
      );
      for (let k = 0; k < newDeptRawIds.length; k++) {
        const newDbId = String(ins.rows[k].id);
        deptIdMap.set(newDeptRawIds[k], newDbId);
        deptNameMap.set(newDbId, newDepts[k].deptName);
      }
    }

    // Second pass: batch parent_id relationships using deptIdMap (deduplicated by DB id)
    const parentSyncById = new Map<number, number | null>();
    for (const d of incomingDepts) {
      const dbId = deptIdMap.get(String(d.id));
      if (!dbId) continue;
      const rawParent = d.parentDepartmentId ?? d.parentId ?? null;
      const mappedParent = rawParent
        ? deptIdMap.get(String(rawParent)) || (existingDeptIds.has(String(rawParent)) ? String(rawParent) : null)
        : null;
      const parentNum = mappedParent && mappedParent !== dbId ? Number(mappedParent) : null;
      parentSyncById.set(Number(dbId), parentNum);
    }

    if (parentSyncById.size > 0) {
      const parentSyncIds: number[] = [];
      const parentSyncParents: (number | null)[] = [];
      for (const [idNum, parentNum] of parentSyncById.entries()) {
        parentSyncIds.push(idNum);
        parentSyncParents.push(parentNum);
      }
      await client.query(
        `UPDATE erp_departments AS d
         SET parent_id = u.parent_id
         FROM UNNEST($1::bigint[], $2::bigint[]) AS u(id, parent_id)
         WHERE d.id = u.id`,
        [parentSyncIds, parentSyncParents]
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
      await client.query(`DELETE FROM erp_departments WHERE id = ANY($1::bigint[])`, [delNums]);
    }

    // 2. Sync Employees (erp_employees) - prepare PII encryption, password hashes, and leave grants in memory
    const existingUsersRes = await client.query(
      'SELECT id, login_id, employee_no, join_date::text as "joinDate", annual_leave_grant FROM erp_employees'
    );
    const existingUserIds = new Set<string>(existingUsersRes.rows.map((r: any) => String(r.id)));
    const existingUserMap = new Map<string, any>(existingUsersRes.rows.map((r: any) => [String(r.id), r]));

    const existingUsersById = new Map<string, PreparedExistingUser>();
    const newUsersByRawId = new Map<string, PreparedNewUser>();
    const batchUserTs = Date.now().toString().slice(-5);

    for (let idx = 0; idx < incomingUsers.length; idx++) {
      const u = incomingUsers[idx];
      const base = prepareEmployeeBase(u, idx, deptIdMap, keptDbDeptIds, deptNameMap);

      if (existingUserIds.has(base.rawUserId)) {
        const prevUser = existingUserMap.get(base.rawUserId);
        const prevJoinDate = prevUser?.joinDate ? String(prevUser.joinDate).substring(0, 10) : "";
        const prevGrant = Number(prevUser?.annual_leave_grant ?? 15);
        const resolvedGrant =
          prevJoinDate !== base.joinDate ||
          (base.autoEntitlement.tenureYears === 0 && (prevGrant === 15 || prevGrant === 11))
            ? base.autoEntitlement.grantDays
            : prevGrant;

        const loginIdToSave =
          u.loginId && String(u.loginId).trim() ? String(u.loginId).trim().toLowerCase() : null;
        const pwdToSave =
          u.passwordHash && String(u.passwordHash).trim() && !String(u.passwordHash).startsWith("__HASHED__")
            ? hashPassword(String(u.passwordHash).trim())
            : null;

        existingUsersById.set(base.rawUserId, {
          ...base,
          id: Number(base.rawUserId),
          loginIdToSave,
          pwdToSave,
          resolvedGrant,
          salaryAccountNoParam: base.salaryAccountNo === undefined ? "__PRESERVE__" : base.salaryAccountNo,
          residentRegNoParam: base.residentRegNo === undefined ? "__PRESERVE__" : base.residentRegNo,
        });
      } else {
        const tsSuffix = `${batchUserTs}${idx}`;
        const empNo = (u.employeeNo && String(u.employeeNo).trim()) || `DR-${tsSuffix}`;
        const loginId = (u.loginId && String(u.loginId).trim().toLowerCase()) || `user_${tsSuffix}`;
        const rawPwd =
          u.passwordHash && String(u.passwordHash).trim() && !String(u.passwordHash).startsWith("__HASHED__")
            ? String(u.passwordHash).trim()
            : "1111";
        const pwd = hashPassword(rawPwd);

        newUsersByRawId.set(base.rawUserId, {
          ...base,
          empNo,
          loginId,
          pwd,
          salaryAccountNoParam: base.salaryAccountNo ?? null,
          residentRegNoParam: base.residentRegNo ?? null,
          grantDays: base.autoEntitlement.grantDays,
        });
      }
    }

    if (existingUsersById.size > 0) {
      const exUsers = Array.from(existingUsersById.values());
      await client.query(
        `UPDATE erp_employees AS e
         SET name = u.name,
             position = u.position,
             duty = u.duty,
             tier_level = u.tier_level,
             department_id = u.department_id,
             department = u.department,
             role = u.role,
             role_code = u.role_code,
             employment_status = u.employment_status,
             base_salary = u.base_salary,
             hourly_wage = u.hourly_wage,
             meal_allowance = u.meal_allowance,
             vehicle_allowance = u.vehicle_allowance,
             ins_national_pension = u.ins_national_pension,
             ins_health_insurance = u.ins_health_insurance,
             ins_employment_insurance = u.ins_employment_insurance,
             ins_industrial_accident = u.ins_industrial_accident,
             salary_bank_name = u.salary_bank_name,
             salary_account_no = CASE WHEN u.salary_account_no = '__PRESERVE__' THEN e.salary_account_no ELSE u.salary_account_no END,
             salary_account_holder = u.salary_account_holder,
             resident_reg_no = CASE WHEN u.resident_reg_no = '__PRESERVE__' THEN e.resident_reg_no ELSE u.resident_reg_no END,
             phone = u.phone,
             email = u.email,
             birth_date = u.birth_date,
             join_date = u.join_date,
             leave_date = u.leave_date,
             address = u.address,
             profile_image_url = u.profile_image_url,
             login_id = COALESCE(u.login_id, e.login_id),
             password_hash = COALESCE(u.password_hash, e.password_hash),
             annual_leave_grant = u.annual_leave_grant,
             updated_at = NOW()
         FROM UNNEST(
           $1::bigint[], $2::text[], $3::varchar[], $4::varchar[], $5::int[],
           $6::bigint[], $7::text[], $8::varchar[], $9::varchar[], $10::varchar[],
           $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[],
           $15::bool[], $16::bool[], $17::bool[], $18::bool[],
           $19::varchar[], $20::text[], $21::varchar[], $22::text[],
           $23::varchar[], $24::varchar[], $25::date[], $26::date[], $27::date[],
           $28::text[], $29::text[], $30::varchar[], $31::text[], $32::numeric[]
         ) AS u(
           id, name, position, duty, tier_level,
           department_id, department, role, role_code, employment_status,
           base_salary, hourly_wage, meal_allowance, vehicle_allowance,
           ins_national_pension, ins_health_insurance, ins_employment_insurance, ins_industrial_accident,
           salary_bank_name, salary_account_no, salary_account_holder, resident_reg_no,
           phone, email, birth_date, join_date, leave_date,
           address, profile_image_url, login_id, password_hash, annual_leave_grant
         )
         WHERE e.id = u.id`,
        [
          exUsers.map((x) => x.id),
          exUsers.map((x) => x.empName),
          exUsers.map((x) => x.position),
          exUsers.map((x) => x.duty),
          exUsers.map((x) => x.tierLevel),
          exUsers.map((x) => x.mappedDeptIdNum),
          exUsers.map((x) => x.resolvedDeptName),
          exUsers.map((x) => x.role),
          exUsers.map((x) => x.roleCode),
          exUsers.map((x) => x.dbStatus),
          exUsers.map((x) => x.baseSalary),
          exUsers.map((x) => x.hourlyWage),
          exUsers.map((x) => x.mealAllowance),
          exUsers.map((x) => x.vehicleAllowance),
          exUsers.map((x) => x.insNationalPension),
          exUsers.map((x) => x.insHealthInsurance),
          exUsers.map((x) => x.insEmploymentInsurance),
          exUsers.map((x) => x.insIndustrialAccident),
          exUsers.map((x) => x.salaryBankName),
          exUsers.map((x) => x.salaryAccountNoParam),
          exUsers.map((x) => x.salaryAccountHolder),
          exUsers.map((x) => x.residentRegNoParam),
          exUsers.map((x) => x.phone),
          exUsers.map((x) => x.email),
          exUsers.map((x) => x.birthDate),
          exUsers.map((x) => x.joinDate),
          exUsers.map((x) => x.leaveDate),
          exUsers.map((x) => x.address),
          exUsers.map((x) => x.profileImageUrl),
          exUsers.map((x) => x.loginIdToSave),
          exUsers.map((x) => x.pwdToSave),
          exUsers.map((x) => x.resolvedGrant),
        ]
      );
    }

    if (newUsersByRawId.size > 0) {
      const newUsers = Array.from(newUsersByRawId.values());
      await client.query(
        `INSERT INTO erp_employees (
          employee_no, login_id, password_hash, name, position, duty, tier_level,
          department_id, department, role, role_code, employment_status, base_salary, hourly_wage,
          meal_allowance, vehicle_allowance,
          ins_national_pension, ins_health_insurance, ins_employment_insurance, ins_industrial_accident,
          salary_bank_name, salary_account_no, salary_account_holder, resident_reg_no,
          phone, email, birth_date, join_date, leave_date, address, profile_image_url,
          annual_leave_grant, must_change_password, created_at, updated_at
        )
        SELECT
          u.employee_no, u.login_id, u.password_hash, u.name, u.position, u.duty, u.tier_level,
          u.department_id, u.department, u.role, u.role_code, u.employment_status, u.base_salary, u.hourly_wage,
          u.meal_allowance, u.vehicle_allowance,
          u.ins_national_pension, u.ins_health_insurance, u.ins_employment_insurance, u.ins_industrial_accident,
          u.salary_bank_name, u.salary_account_no, u.salary_account_holder, u.resident_reg_no,
          u.phone, u.email, u.birth_date, u.join_date, u.leave_date, u.address, u.profile_image_url,
          u.annual_leave_grant, true, NOW(), NOW()
        FROM UNNEST(
          $1::varchar[], $2::varchar[], $3::text[], $4::text[], $5::varchar[], $6::varchar[], $7::int[],
          $8::bigint[], $9::text[], $10::varchar[], $11::varchar[], $12::varchar[], $13::numeric[], $14::numeric[],
          $15::numeric[], $16::numeric[],
          $17::bool[], $18::bool[], $19::bool[], $20::bool[],
          $21::varchar[], $22::text[], $23::varchar[], $24::text[],
          $25::varchar[], $26::varchar[], $27::date[], $28::date[], $29::date[], $30::text[], $31::text[],
          $32::numeric[]
        ) AS u(
          employee_no, login_id, password_hash, name, position, duty, tier_level,
          department_id, department, role, role_code, employment_status, base_salary, hourly_wage,
          meal_allowance, vehicle_allowance,
          ins_national_pension, ins_health_insurance, ins_employment_insurance, ins_industrial_accident,
          salary_bank_name, salary_account_no, salary_account_holder, resident_reg_no,
          phone, email, birth_date, join_date, leave_date, address, profile_image_url,
          annual_leave_grant
        )`,
        [
          newUsers.map((x) => x.empNo),
          newUsers.map((x) => x.loginId),
          newUsers.map((x) => x.pwd),
          newUsers.map((x) => x.empName),
          newUsers.map((x) => x.position),
          newUsers.map((x) => x.duty),
          newUsers.map((x) => x.tierLevel),
          newUsers.map((x) => x.mappedDeptIdNum),
          newUsers.map((x) => x.resolvedDeptName),
          newUsers.map((x) => x.role),
          newUsers.map((x) => x.roleCode),
          newUsers.map((x) => x.dbStatus),
          newUsers.map((x) => x.baseSalary),
          newUsers.map((x) => x.hourlyWage),
          newUsers.map((x) => x.mealAllowance),
          newUsers.map((x) => x.vehicleAllowance),
          newUsers.map((x) => x.insNationalPension),
          newUsers.map((x) => x.insHealthInsurance),
          newUsers.map((x) => x.insEmploymentInsurance),
          newUsers.map((x) => x.insIndustrialAccident),
          newUsers.map((x) => x.salaryBankName),
          newUsers.map((x) => x.salaryAccountNoParam),
          newUsers.map((x) => x.salaryAccountHolder),
          newUsers.map((x) => x.residentRegNoParam),
          newUsers.map((x) => x.phone),
          newUsers.map((x) => x.email),
          newUsers.map((x) => x.birthDate),
          newUsers.map((x) => x.joinDate),
          newUsers.map((x) => x.leaveDate),
          newUsers.map((x) => x.address),
          newUsers.map((x) => x.profileImageUrl),
          newUsers.map((x) => x.grantDays),
        ]
      );
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
      LEFT JOIN erp_employees e ON (e.department_id = d.id OR (e.department_id IS NULL AND e.department = d.dept_name AND e.department <> ''))
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
        COALESCE(e.hourly_wage, 0)::numeric as "hourlyWage",
        COALESCE(e.meal_allowance, 200000)::numeric as "mealAllowance",
        COALESCE(e.vehicle_allowance, 0)::numeric as "vehicleAllowance",
        COALESCE(e.ins_national_pension, TRUE) as "insNationalPension",
        COALESCE(e.ins_health_insurance, TRUE) as "insHealthInsurance",
        COALESCE(e.ins_employment_insurance, TRUE) as "insEmploymentInsurance",
        COALESCE(e.ins_industrial_accident, TRUE) as "insIndustrialAccident",
        COALESCE(e.service_contract_amount, 0)::numeric as "serviceContractAmount",
        e.salary_bank_name as "salaryBankName",
        e.salary_account_no as "salaryAccountNo",
        e.salary_account_holder as "salaryAccountHolder",
        e.resident_reg_no as "residentRegNo",
        e.email, 
        e.phone, 
        e.birth_date::text as "birthDate",
        e.address,
        e.join_date::text as "joinDate",
        e.leave_date::text as "leaveDate",
        e.employment_status as "employmentStatus",
        e.profile_image_url as "profileImageUrl",
        e.annual_leave_grant as "grantDays",
        COALESCE(SUM(CASE WHEN l.status = 'APPROVED' AND EXTRACT(YEAR FROM l.start_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN l.deducted_days ELSE 0 END), 0) as "usedDays",
        (e.annual_leave_grant - COALESCE(SUM(CASE WHEN l.status = 'APPROVED' AND EXTRACT(YEAR FROM l.start_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN l.deducted_days ELSE 0 END), 0)) as "remainDays",
        COALESCE(COUNT(CASE WHEN l.status = 'APPROVED' AND EXTRACT(YEAR FROM l.start_date) = EXTRACT(YEAR FROM CURRENT_DATE) AND COALESCE(l.deducted_days, 0) = 0 THEN 1 END), 0)::int as "nonDeductedCount",
        e.must_change_password as "mustChangePassword",
        e.created_at as "createdAt",
        e.updated_at as "updatedAt"
      FROM erp_employees e
      LEFT JOIN erp_departments d ON e.department_id = d.id
      LEFT JOIN erp_leave_requests l ON e.id = l.employee_id
      GROUP BY e.id, d.dept_name
      ORDER BY e.id ASC
    `);

    const finalUsers = finalEmpsRes.rows.map((row: any) => {
      const isSelf = Number(row.id) === session.uid;
      const revealPii = canReadAllPii || isSelf;
      const plainAcct = decryptPii(row.salaryAccountNo);
      const plainRrn = decryptPii(row.residentRegNo);
      return {
        ...row,
        salaryAccountNo: revealPii ? plainAcct : maskBankAccount(plainAcct),
        residentRegNo: revealPii ? plainRrn : maskResidentRegNo(plainRrn),
        status: normalizeStatusToEbro(row.employmentStatus, row.leaveDate),
        employmentStatus: normalizeStatusToDb(row.employmentStatus, row.leaveDate),
      };
    });

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
