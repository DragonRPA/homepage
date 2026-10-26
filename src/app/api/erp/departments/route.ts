import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: 부서 목록, 계층 구조(parentDepartmentId), 보편 기능 태그(functional_tags) 및 부서원 수 조회
export async function GET() {
  try {
    const pool = getErpPool();
    const query = `
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
      LEFT JOIN erp_employees e 
        ON (e.department_id = d.id OR (e.department_id IS NULL AND e.department = d.dept_name AND e.department <> ''))
      GROUP BY d.id
      ORDER BY d.sort_order ASC, d.id ASC
    `;
    const result = await pool.query(query);
    return NextResponse.json({ success: true, departments: result.rows });
  } catch (error: any) {
    console.error("GET Departments Error:", error);
    return NextResponse.json({ error: "부서 목록 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: 신규 부서 등록 (인라인 트리 생성 및 모달 생성 모두 지원)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const deptName = (body.name ?? body.deptName ?? "").trim();
    const deptCode = (body.deptCode || `DEPT-${Date.now()}`).trim().toUpperCase();
    const rawParent = body.parentDepartmentId !== undefined ? body.parentDepartmentId : body.parentId;
    const parentId = rawParent && !isNaN(Number(rawParent)) ? Number(rawParent) : null;
    const managerName = body.managerName ? body.managerName.trim() : null;
    const sortOrder = body.sortOrder ? parseInt(body.sortOrder) : 10;
    const functionalTags = Array.isArray(body.functional_tags || body.functionalTags)
      ? (body.functional_tags || body.functionalTags)
      : [];

    const { data, error } = await supabaseErp
      .from("erp_departments")
      .insert({
        dept_code: deptCode,
        dept_name: deptName,
        parent_id: parentId,
        manager_name: managerName,
        sort_order: sortOrder,
        functional_tags: functionalTags,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 존재하는 부서코드입니다." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      department: {
        id: String(data.id),
        deptCode: data.dept_code,
        deptName: data.dept_name,
        name: data.dept_name,
        parentId: data.parent_id ? String(data.parent_id) : null,
        parentDepartmentId: data.parent_id ? String(data.parent_id) : null,
        managerName: data.manager_name,
        sortOrder: data.sort_order,
        functionalTags: data.functional_tags || [],
        functional_tags: data.functional_tags || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error: any) {
    console.error("POST Department Error:", error);
    return NextResponse.json({ error: "부서 등록 실패" }, { status: 500 });
  }
}

// PUT: 부서 정보 수정 (부서명 인라인 수정, 상위부서 변경, 보편 기능 태그 매핑 등)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, deptName, name, managerName, sortOrder, parentId, parentDepartmentId, functionalTags, functional_tags } = body;

    if (!id) {
      return NextResponse.json({ error: "부서 ID가 누락되었습니다." }, { status: 400 });
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    const nextName = name !== undefined ? name : deptName;
    if (nextName !== undefined) updatePayload.dept_name = String(nextName).trim();
    if (managerName !== undefined) updatePayload.manager_name = managerName ? managerName.trim() : null;
    if (sortOrder !== undefined) updatePayload.sort_order = parseInt(sortOrder);
    if (parentDepartmentId !== undefined || parentId !== undefined) {
      const rawParent = parentDepartmentId !== undefined ? parentDepartmentId : parentId;
      updatePayload.parent_id = rawParent && !isNaN(Number(rawParent)) ? Number(rawParent) : null;
    }
    if (functional_tags !== undefined || functionalTags !== undefined) {
      updatePayload.functional_tags = functional_tags ?? functionalTags ?? [];
    }

    const { data, error } = await supabaseErp
      .from("erp_departments")
      .update(updatePayload)
      .eq("id", Number(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 부서명 변경 시 소속 직원의 department 문자열도 동기화
    if (nextName !== undefined && data) {
      await supabaseErp
        .from("erp_employees")
        .update({ department: data.dept_name })
        .eq("department_id", Number(id));
    }

    return NextResponse.json({
      success: true,
      department: {
        id: String(data.id),
        deptCode: data.dept_code,
        deptName: data.dept_name,
        name: data.dept_name,
        parentId: data.parent_id ? String(data.parent_id) : null,
        parentDepartmentId: data.parent_id ? String(data.parent_id) : null,
        managerName: data.manager_name,
        sortOrder: data.sort_order,
        functionalTags: data.functional_tags || [],
        functional_tags: data.functional_tags || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error: any) {
    console.error("PUT Department Error:", error);
    return NextResponse.json({ error: "부서 수정 실패" }, { status: 500 });
  }
}

// DELETE: 부서 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 부서 ID가 누락되었습니다." }, { status: 400 });
    }

    const { error } = await supabaseErp
      .from("erp_departments")
      .delete()
      .eq("id", Number(id));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "부서가 삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Department Error:", error);
    return NextResponse.json({ error: "부서 삭제 실패" }, { status: 500 });
  }
}
