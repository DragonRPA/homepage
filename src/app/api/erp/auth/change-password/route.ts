export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { supabaseErp } from "@/lib/supabaseErp";
import { verifyPassword, hashPassword } from "@/lib/piiCrypto";
import {
  getClientIpFromRequest,
  getErpSessionFromRequest,
  logSecurityAuditEvent,
} from "@/lib/erpSecurityAudit";

export async function POST(request: Request) {
  try {
    const session = await getErpSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "인증 세션이 필요합니다." }, { status: 401 });
    }

    const { employeeId, currentPassword, newPassword } = await request.json();

    const targetEmployeeId = employeeId ? Number(employeeId) : session.uid;
    if (session.roleCode !== "ADMIN" && targetEmployeeId !== session.uid) {
      return NextResponse.json({ error: "본인 계정 비밀번호만 변경할 수 있습니다." }, { status: 403 });
    }

    if (!targetEmployeeId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "현재 비밀번호와 새 비밀번호를 모두 입력해 주십시오." },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 4) {
      return NextResponse.json(
        { error: "새 비밀번호는 최소 4자리 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const { data: employees, error: fetchErr } = await supabaseErp
      .from("erp_employees")
      .select("id, password_hash")
      .eq("id", targetEmployeeId)
      .limit(1);

    if (fetchErr || !employees || employees.length === 0) {
      return NextResponse.json({ error: "사원 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    if (!verifyPassword(currentPassword, employees[0].password_hash)) {
      return NextResponse.json(
        { error: "현재 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    const { error: updateErr } = await supabaseErp
      .from("erp_employees")
      .update({
        password_hash: hashPassword(newPassword),
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetEmployeeId);

    if (updateErr) {
      return NextResponse.json({ error: "비밀번호 변경 실패" }, { status: 500 });
    }

    await logSecurityAuditEvent({
      eventType: "PASSWORD_CHANGE",
      actorId: session.uid,
      actorLoginId: session.loginId,
      actorName: session.name,
      targetResource: `/api/erp/auth/change-password:${targetEmployeeId}`,
      ipAddress: getClientIpFromRequest(request),
      userAgent: request.headers.get("user-agent") || "",
    });

    return NextResponse.json({
      success: true,
      message: "비밀번호가 안전하게 변경되었습니다.",
    });
  } catch (error: any) {
    console.error("Password Change API Error:", error);
    return NextResponse.json(
      { error: "비밀번호 변경 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
