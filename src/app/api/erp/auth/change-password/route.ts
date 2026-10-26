import { NextResponse } from "next/server";
import { supabaseErp } from "@/lib/supabaseErp";

export async function POST(request: Request) {
  try {
    const { employeeId, currentPassword, newPassword } = await request.json();

    if (!employeeId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "현재 비밀번호와 새 비밀번호를 모두 입력해 주십시오." },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "새 비밀번호는 최소 4자리 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const { data: employees, error: fetchErr } = await supabaseErp
      .from("erp_employees")
      .select("id, password_hash")
      .eq("id", employeeId)
      .limit(1);

    if (fetchErr || !employees || employees.length === 0) {
      return NextResponse.json({ error: "사원 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    if (employees[0].password_hash !== currentPassword) {
      return NextResponse.json(
        { error: "현재 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    const { error: updateErr } = await supabaseErp
      .from("erp_employees")
      .update({
        password_hash: newPassword,
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employeeId);

    if (updateErr) {
      return NextResponse.json({ error: "비밀번호 변경 실패" }, { status: 500 });
    }

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
