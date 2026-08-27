import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { loginId, currentPassword, newPassword } = await request.json();

    if (!loginId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "모든 항목을 입력해 주십시오." },
        { status: 400 }
      );
    }

    const cleanId = loginId.trim().toLowerCase();

    // Verify current password
    const rows = await sql`
      SELECT id, password_hash
      FROM employees
      WHERE LOWER(login_id) = ${cleanId}
      LIMIT 1
    `;

    if (rows.length === 0 || rows[0].password_hash !== currentPassword) {
      return NextResponse.json(
        { error: "현재 비밀번호가 일치하지 않습니다." },
        { status: 400 }
      );
    }

    // Update password in Neon DB
    await sql`
      UPDATE employees
      SET password_hash = ${newPassword},
          must_change_password = FALSE,
          password_changed_at = NOW(),
          updated_at = NOW()
      WHERE LOWER(login_id) = ${cleanId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Change Password API Error:", error);
    return NextResponse.json(
      { error: "비밀번호 변경 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
