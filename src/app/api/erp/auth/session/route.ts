export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { supabaseErp } from "@/lib/supabaseErp";
import { signErpSessionToken } from "@/lib/erpSessionToken";
import {
  buildClearSessionCookieHeader,
  buildSessionCookieHeader,
  getErpSessionFromRequest,
  isHttpsRequest,
} from "@/lib/erpSecurityAudit";

export async function GET(request: Request) {
  const secure = isHttpsRequest(request);
  try {
    const session = await getErpSessionFromRequest(request);
    if (!session) {
      const res = NextResponse.json({ success: false, authenticated: false, user: null }, { status: 401 });
      res.headers.set("Set-Cookie", buildClearSessionCookieHeader(secure));
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      return res;
    }

    const { data: employees, error } = await supabaseErp
      .from("erp_employees")
      .select(
        "id, employee_no, login_id, name, position, department, role, role_code, must_change_password, email, employment_status"
      )
      .eq("id", session.uid)
      .limit(1);

    if (error || !employees || employees.length === 0) {
      const res = NextResponse.json({ success: false, authenticated: false, user: null }, { status: 401 });
      res.headers.set("Set-Cookie", buildClearSessionCookieHeader(secure));
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      return res;
    }

    const emp = employees[0];
    if (emp.employment_status === "RESIGNED" || emp.employment_status === "RETIRED") {
      const res = NextResponse.json({ success: false, authenticated: false, user: null }, { status: 401 });
      res.headers.set("Set-Cookie", buildClearSessionCookieHeader(secure));
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      return res;
    }

    const resolvedRoleCode =
      emp.login_id === "admin" || emp.role === "ADMIN" || emp.role === "SUPER_ADMIN" || emp.role_code === "ADMIN"
        ? "ADMIN"
        : emp.role_code || (emp.role === "MANAGER" ? "MANAGER" : "EMPLOYEE");

    // 슬라이딩 세션 쿠키 갱신
    const refreshedToken = await signErpSessionToken({
      uid: Number(emp.id),
      employeeNo: emp.employee_no || "",
      loginId: emp.login_id || "",
      name: emp.name || "",
      role: emp.role || "USER",
      roleCode: resolvedRoleCode,
    });

    const res = NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: emp.id,
        employeeNo: emp.employee_no,
        loginId: emp.login_id,
        name: emp.name,
        position: emp.position,
        department: emp.department,
        role: emp.role,
        roleCode: resolvedRoleCode,
        email: emp.email,
        mustChangePassword: emp.must_change_password,
      },
    });
    res.headers.set("Set-Cookie", buildSessionCookieHeader(refreshedToken, secure));
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    return res;
  } catch (err: any) {
    console.error("GET /api/erp/auth/session Error:", err);
    return NextResponse.json(
      { success: false, authenticated: false, error: "세션 검증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
