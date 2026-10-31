import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: 역할 마스터, 역할별 권한 매핑, 사원별 배정 현황 조회
export async function GET() {
  try {
    const pool = getErpPool();
    await pool.query(
      "ALTER TABLE erp_role_permissions ADD COLUMN IF NOT EXISTS can_bill BOOLEAN NOT NULL DEFAULT false"
    );
    // 근로기준법 제14조 의거: 모든 역할에 대해 취업규칙(work_rules) 기본 열람 권한 보장
    await pool.query(`
      INSERT INTO erp_role_permissions (role_code, menu_key, can_view, can_save, can_bill)
      SELECT role_code, 'work_rules', true, false, false
      FROM erp_custom_roles
      ON CONFLICT (role_code, menu_key) DO UPDATE SET can_view = true
    `);

    // 1. 역할 목록
    const rolesRes = await pool.query(`
      SELECT 
        r.id,
        r.role_code as "roleCode",
        r.role_name as "roleName",
        r.description,
        r.created_at as "createdAt",
        COUNT(e.id)::int as "assignedCount"
      FROM erp_custom_roles r
      LEFT JOIN erp_employees e ON e.role_code = r.role_code AND e.employment_status = 'ACTIVE'
      GROUP BY r.id
      ORDER BY r.id ASC
    `);

    // 2. 역할별 권한 매핑
    const permsRes = await pool.query(`
      SELECT 
        id,
        role_code as "roleCode",
        menu_key as "menuKey",
        can_view as "canView",
        can_save as "canSave",
        COALESCE(can_bill, false) as "canBill"
      FROM erp_role_permissions
      ORDER BY role_code, menu_key
    `);

    // 3. 사원별 실시간 역할 매핑
    const empRolesRes = await pool.query(`
      SELECT id, role, role_code as "roleCode"
      FROM erp_employees
    `);

    return NextResponse.json({
      success: true,
      roles: rolesRes.rows,
      permissions: permsRes.rows,
      employeeRoles: empRolesRes.rows,
    });
  } catch (error: any) {
    console.error("GET Permissions Error:", error);
    return NextResponse.json({ error: "권한 정보 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: 신규 역할 생성
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roleCode, roleName, description } = body;

    if (!roleCode || !roleName) {
      return NextResponse.json({ error: "역할 코드와 역할명은 필수입니다." }, { status: 400 });
    }

    const { data, error } = await supabaseErp
      .from("erp_custom_roles")
      .insert({
        role_code: roleCode.trim().toUpperCase(),
        role_name: roleName.trim(),
        description: description ? description.trim() : null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 존재하는 역할 코드입니다." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: data });
  } catch (error: any) {
    console.error("POST Role Error:", error);
    return NextResponse.json({ error: "역할 생성 실패" }, { status: 500 });
  }
}

// PUT: 역할별 메뉴 권한 일괄 업데이트 (단일 UNNEST 벌크 쿼리로 즉시 저장)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { roleCode, permissions } = body; // permissions: [{ menuKey, canView, canSave }]

    if (!roleCode || !Array.isArray(permissions)) {
      return NextResponse.json({ error: "역할 코드와 권한 배열이 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    await pool.query(
      "ALTER TABLE erp_role_permissions ADD COLUMN IF NOT EXISTS can_bill BOOLEAN NOT NULL DEFAULT false"
    );
    // 근로기준법 제14조 의거: 모든 역할에 대해 취업규칙(work_rules) 기본 열람 권한 보장
    await pool.query(`
      INSERT INTO erp_role_permissions (role_code, menu_key, can_view, can_save, can_bill)
      SELECT role_code, 'work_rules', true, false, false
      FROM erp_custom_roles
      ON CONFLICT (role_code, menu_key) DO UPDATE SET can_view = true
    `);
    if (permissions.length > 0) {
      const menuKeys = permissions.map((p: any) => String(p.menuKey));
      const canViews = permissions.map((p: any) => Boolean(p.canView));
      const canSaves = permissions.map((p: any) => Boolean(p.canSave));
      const canBills = permissions.map((p: any) => Boolean(p.canBill));

      await pool.query(
        `INSERT INTO erp_role_permissions (role_code, menu_key, can_view, can_save, can_bill)
         SELECT $1, UNNEST($2::text[]), UNNEST($3::boolean[]), UNNEST($4::boolean[]), UNNEST($5::boolean[])
         ON CONFLICT (role_code, menu_key)
         DO UPDATE SET can_view = EXCLUDED.can_view, can_save = EXCLUDED.can_save, can_bill = EXCLUDED.can_bill`,
        [roleCode, menuKeys, canViews, canSaves, canBills]
      );
    }

    return NextResponse.json({ success: true, message: "권한이 갱신되었습니다." });
  } catch (error: any) {
    console.error("PUT Permissions Error:", error);
    return NextResponse.json({ error: "권한 갱신 실패: " + error.message }, { status: 500 });
  }
}

// PATCH: 사원의 역할 배정 변경 (role 및 role_code 동시 동기화)
export async function PATCH(request: Request) {
  try {
    const { employeeId, roleCode } = await request.json();

    if (!employeeId || !roleCode) {
      return NextResponse.json({ error: "사원 ID와 역할 코드는 필수입니다." }, { status: 400 });
    }

    const mappedRole =
      roleCode === "ADMIN" ? "ADMIN" : roleCode === "MANAGER" ? "MANAGER" : "USER";

    const { data, error } = await supabaseErp
      .from("erp_employees")
      .update({
        role_code: roleCode,
        role: mappedRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employeeId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, employee: data });
  } catch (error: any) {
    console.error("PATCH Employee Role Error:", error);
    return NextResponse.json({ error: "사원 역할 배정 실패" }, { status: 500 });
  }
}
