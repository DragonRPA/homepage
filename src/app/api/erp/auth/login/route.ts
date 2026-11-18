export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { supabaseErp } from "@/lib/supabaseErp";
import { verifyPassword, hashPassword } from "@/lib/piiCrypto";
import { signErpSessionToken } from "@/lib/erpSessionToken";
import {
  buildSessionCookieHeader,
  checkLoginRateLimit,
  clearLoginFailures,
  getClientIpFromRequest,
  isHttpsRequest,
  logSecurityAuditEvent,
  recordLoginFailure,
} from "@/lib/erpSecurityAudit";

export async function POST(request: Request) {
  try {
    const { loginId, password } = await request.json();
    const ipAddress = getClientIpFromRequest(request);
    const userAgent = request.headers.get("user-agent") || "";

    if (!loginId || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 모두 입력해 주십시오." },
        { status: 400 }
      );
    }

    const cleanId = String(loginId).trim().toLowerCase();

    // 1. 브루트포스 로그인 시도 제한 검사
    const limitState = checkLoginRateLimit(ipAddress, cleanId);
    if (limitState.locked) {
      await logSecurityAuditEvent({
        eventType: "ACCOUNT_LOCKED",
        actorLoginId: cleanId,
        targetResource: "/api/erp/auth/login",
        ipAddress,
        userAgent,
        detail: { retryAfterSec: limitState.retryAfterSec },
      });
      return NextResponse.json(
        { error: `로그인 시도 횟수를 초과했습니다. ${Math.ceil(limitState.retryAfterSec / 60)}분 후 다시 시도해 주십시오.` },
        { status: 429 }
      );
    }

    const { data: employees, error } = await supabaseErp
      .from("erp_employees")
      .select(
        "id, employee_no, login_id, name, position, department, role, role_code, password_hash, must_change_password, email, employment_status"
      )
      .ilike("login_id", cleanId)
      .limit(1);

    if (error) {
      console.error("Login DB Query Error:", error);
      return NextResponse.json({ error: "데이터베이스 연결 오류" }, { status: 500 });
    }

    if (!employees || employees.length === 0) {
      recordLoginFailure(ipAddress, cleanId);
      await logSecurityAuditEvent({
        eventType: "LOGIN_FAIL",
        actorLoginId: cleanId,
        targetResource: "/api/erp/auth/login",
        ipAddress,
        userAgent,
        detail: { reason: "UNKNOWN_ID" },
      });
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    const emp = employees[0];

    if (emp.employment_status === "RESIGNED" || emp.employment_status === "RETIRED") {
      await logSecurityAuditEvent({
        eventType: "LOGIN_FAIL",
        actorId: Number(emp.id),
        actorLoginId: emp.login_id,
        actorName: emp.name,
        targetResource: "/api/erp/auth/login",
        ipAddress,
        userAgent,
        detail: { reason: "RESIGNED" },
      });
      return NextResponse.json(
        { error: "퇴사 처리된 계정입니다. 관리자에게 문의하십시오." },
        { status: 403 }
      );
    }

    if (!verifyPassword(password, emp.password_hash)) {
      const failResult = recordLoginFailure(ipAddress, cleanId);
      await logSecurityAuditEvent({
        eventType: "LOGIN_FAIL",
        actorId: Number(emp.id),
        actorLoginId: emp.login_id,
        actorName: emp.name,
        targetResource: "/api/erp/auth/login",
        ipAddress,
        userAgent,
        detail: { reason: "BAD_PASSWORD", failures: failResult.failures, locked: failResult.locked },
      });
      if (failResult.locked) {
        return NextResponse.json(
          { error: "비밀번호 5회 오류로 로그인이 일시 제한되었습니다. 10분 후 다시 시도해 주십시오." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    // 로그인 성공 -> 실패 카운터 초기화
    clearLoginFailures(ipAddress, cleanId);

    // 레거시 평문 비밀번호가 남아있는 경우 scrypt 단방향 해시로 즉시 업그레이드
    if (emp.password_hash && !String(emp.password_hash).startsWith("scrypt$")) {
      await supabaseErp
        .from("erp_employees")
        .update({ password_hash: hashPassword(password) })
        .eq("id", emp.id);
    }

    const resolvedRoleCode =
      emp.login_id === "admin" || emp.role === "ADMIN" || emp.role === "SUPER_ADMIN" || emp.role_code === "ADMIN"
        ? "ADMIN"
        : emp.role_code || (emp.role === "MANAGER" ? "MANAGER" : "EMPLOYEE");

    const sessionToken = await signErpSessionToken({
      uid: Number(emp.id),
      employeeNo: emp.employee_no || "",
      loginId: emp.login_id || "",
      name: emp.name || "",
      role: emp.role || "USER",
      roleCode: resolvedRoleCode,
    });

    await logSecurityAuditEvent({
      eventType: "LOGIN_SUCCESS",
      actorId: Number(emp.id),
      actorLoginId: emp.login_id,
      actorName: emp.name,
      targetResource: "/api/erp/auth/login",
      ipAddress,
      userAgent,
      detail: { roleCode: resolvedRoleCode },
    });

    const response = NextResponse.json({
      success: true,
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
    response.headers.set("Set-Cookie", buildSessionCookieHeader(sessionToken, isHttpsRequest(request)));
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    return response;
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "로그인 처리 중 시스템 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
