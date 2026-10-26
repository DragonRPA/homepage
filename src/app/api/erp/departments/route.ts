import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";

// GET: 부서 목록 및 부서원 수 조회
export async function GET() {
  try {
    const pool = getErpPool();
    const query = `
      SELECT 
        d.id,
        d.dept_code as "deptCode",
        d.dept_name as "deptName",
        d.parent_id as "parentId",
        d.manager_name as "managerName",
        d.sort_order as "sortOrder",
        d.created_at as "createdAt",
        COUNT(e.id)::int as "memberCount"
      FROM erp_departments d
      LEFT JOIN erp_employees e ON e.department = d.dept_name AND e.employment_status = 'ACTIVE'
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

// POST: 신규 부서 등록
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deptCode, deptName, parentId, managerName, sortOrder } = body;

    if (!deptCode || !deptName) {
      return NextResponse.json({ error: "부서코드와 부서명은 필수 항목입니다." }, { status: 400 });
    }

    const { data, error } = await supabaseErp
      .from("erp_departments")
      .insert({
        dept_code: deptCode.trim().toUpperCase(),
        dept_name: deptName.trim(),
        parent_id: parentId ? parseInt(parentId) : null,
        manager_name: managerName ? managerName.trim() : null,
        sort_order: sortOrder ? parseInt(sortOrder) : 10,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 존재하는 부서코드입니다." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, department: data });
  } catch (error: any) {
    console.error("POST Department Error:", error);
    return NextResponse.json({ error: "부서 등록 실패" }, { status: 500 });
  }
}

// PUT: 부서 정보 수정
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, deptName, managerName, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "부서 ID가 누락되었습니다." }, { status: 400 });
    }

    const updatePayload: any = {};
    if (deptName !== undefined) updatePayload.dept_name = deptName.trim();
    if (managerName !== undefined) updatePayload.manager_name = managerName ? managerName.trim() : null;
    if (sortOrder !== undefined) updatePayload.sort_order = parseInt(sortOrder);

    const { data, error } = await supabaseErp
      .from("erp_departments")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, department: data });
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
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "부서가 삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Department Error:", error);
    return NextResponse.json({ error: "부서 삭제 실패" }, { status: 500 });
  }
}
