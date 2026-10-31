import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";
import { calculateOvertimeBreakdown } from "@/lib/erpFormat";

// GET: 초과근무 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM
    const employeeId = searchParams.get("employeeId");
    const employeeIds = searchParams.get("employeeIds"); // comma-separated employeeIds
    const status = searchParams.get("status");

    const pool = getErpPool();
    let query = `
      SELECT 
        o.id,
        o.employee_id as "employeeId",
        e.employee_no as "employeeNo",
        e.name as "employeeName",
        e.department,
        e.position,
        e.duty,
        o.ot_date::text as "otDate",
        o.start_time as "startTime",
        o.end_time as "endTime",
        COALESCE(o.ot_hours, 0)::numeric as "otHours",
        COALESCE(o.ot_type, 'WEEKDAY_OT') as "otType",
        COALESCE(o.is_holiday, false) as "isHoliday",
        COALESCE(o.regular_ot_hours, 0)::numeric as "regularOtHours",
        COALESCE(o.holiday_hours, 0)::numeric as "holidayHours",
        COALESCE(o.holiday_over8_hours, 0)::numeric as "holidayOver8Hours",
        COALESCE(o.night_hours, 0)::numeric as "nightHours",
        COALESCE(NULLIF(o.hourly_wage, 0), NULLIF(e.hourly_wage, 0), ROUND(COALESCE(e.base_salary, 3500000) / 209.0))::numeric as "hourlyWage",
        COALESCE(o.applied_multiplier, 1.5)::numeric as "appliedMultiplier",
        COALESCE(o.ot_pay, 0)::bigint as "otPay",
        o.reason,
        o.status,
        o.approver_id as "approverId",
        a.name as "approverName",
        o.approved_at as "approvedAt",
        o.memo,
        o.created_at as "createdAt"
      FROM erp_overtimes o
      JOIN erp_employees e ON o.employee_id = e.id
      LEFT JOIN erp_employees a ON o.approver_id = a.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (month) {
      params.push(`${month}%`);
      conditions.push(`o.ot_date::text LIKE $${params.length}`);
    }

    if (employeeId) {
      params.push(Number(employeeId));
      conditions.push(`o.employee_id = $${params.length}`);
    }

    if (employeeIds) {
      const idList = employeeIds
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => !isNaN(v) && v > 0);
      if (idList.length > 0) {
        params.push(idList);
        conditions.push(`o.employee_id = ANY($${params.length}::int[])`);
      }
    }

    if (status && status !== "ALL") {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY o.ot_date DESC, o.id DESC`;

    const result = await pool.query(query, params);
    const overtimes = result.rows.map((row: any) => {
      const hw = Number(row.hourlyWage) || 16746;
      const calc = calculateOvertimeBreakdown({
        otDate: String(row.otDate || "").slice(0, 10),
        startTime: row.startTime || "18:00",
        endTime: row.endTime || "21:00",
        hourlyWage: hw,
        overrideIsHoliday: row.otPay && Number(row.otPay) > 0 ? Boolean(row.isHoliday) : undefined,
      });
      const finalOtPay = Number(row.otPay) > 0 ? Number(row.otPay) : calc.otPay;
      return {
        ...row,
        otDate: String(row.otDate || "").slice(0, 10),
        otHours: Number(row.otHours) || calc.otHours,
        hourlyWage: hw,
        isHoliday: Number(row.otPay) > 0 ? Boolean(row.isHoliday) : calc.isHoliday,
        otType: row.otType || calc.otType,
        otTypeLabel: calc.otTypeLabel,
        regularOtHours: Number(row.regularOtHours) || calc.regularOtHours,
        holidayHours: Number(row.holidayHours) || calc.holidayHours,
        holidayOver8Hours: Number(row.holidayOver8Hours) || calc.holidayOver8Hours,
        nightHours: Number(row.nightHours) || calc.nightHours,
        appliedMultiplier: Number(row.appliedMultiplier) || calc.appliedMultiplier,
        otPay: finalOtPay,
        formulaText: calc.formulaText,
      };
    });

    return NextResponse.json({ success: true, overtimes });
  } catch (error: any) {
    console.error("GET Overtimes Error:", error);
    return NextResponse.json({ error: "초과근무 목록 조회 실패: " + error.message }, { status: 500 });
  }
}

// POST: 초과근무 신청/등록 (일시 및 1시간 표준임금 기반 수당액 자동 산정)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      otDate,
      startTime,
      endTime,
      otHours,
      isHoliday,
      hourlyWage: customHourlyWage,
      otPay: customOtPay,
      reason,
      autoApprove,
      approverId: reqApproverId,
    } = body;

    if (!employeeId || !otDate || !reason) {
      return NextResponse.json({ error: "사원, 근무일자, 사유는 필수 입력 항목입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const empRes = await pool.query(
      `SELECT id, name, base_salary, hourly_wage FROM erp_employees WHERE id = $1 LIMIT 1`,
      [Number(employeeId)]
    );
    const empRow = empRes.rows[0];
    const resolvedHourlyWage =
      customHourlyWage && Number(customHourlyWage) > 0
        ? Number(customHourlyWage)
        : empRow && Number(empRow.hourly_wage) > 0
        ? Number(empRow.hourly_wage)
        : Math.round((empRow ? Number(empRow.base_salary) || 3500000 : 3500000) / 209);

    const calc = calculateOvertimeBreakdown({
      otDate: String(otDate).slice(0, 10),
      startTime: startTime || "18:00",
      endTime: endTime || "21:00",
      hourlyWage: resolvedHourlyWage,
      overrideIsHoliday: isHoliday !== undefined && isHoliday !== null ? Boolean(isHoliday) : undefined,
    });

    const finalHours = otHours !== undefined && Number(otHours) > 0 ? Number(otHours) : calc.otHours;
    const finalOtPay =
      customOtPay !== undefined && Number(customOtPay) >= 0 ? Math.round(Number(customOtPay)) : calc.otPay;
    const initialStatus = autoApprove ? "APPROVED" : "PENDING";

    const insertPayload: Record<string, any> = {
      employee_id: Number(employeeId),
      ot_date: String(otDate).slice(0, 10),
      start_time: startTime || "18:00",
      end_time: endTime || "21:00",
      ot_hours: finalHours,
      ot_type: calc.otType,
      is_holiday: calc.isHoliday,
      regular_ot_hours: calc.regularOtHours,
      holiday_hours: calc.holidayHours,
      holiday_over8_hours: calc.holidayOver8Hours,
      night_hours: calc.nightHours,
      hourly_wage: resolvedHourlyWage,
      applied_multiplier: calc.appliedMultiplier,
      ot_pay: finalOtPay,
      reason: String(reason).trim(),
      status: initialStatus,
    };

    if (autoApprove) {
      insertPayload.approver_id = Number(reqApproverId || employeeId);
      insertPayload.approved_at = new Date().toISOString();
      insertPayload.memo = "등록 즉시 승인";
    }

    const { data, error } = await supabaseErp
      .from("erp_overtimes")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 결재 연동 (결재선 규칙: OT_REQUEST, 대기 상태일 때만 생성)
    if (!autoApprove) {
      const ruleRes = await pool.query(
        `SELECT id, required_tier FROM erp_approval_rules WHERE event_type = 'OT_REQUEST' LIMIT 1`
      );
      if (ruleRes.rows.length > 0) {
        const rule = ruleRes.rows[0];
        const adminRes = await pool.query(
          `SELECT id FROM erp_employees WHERE tier_level >= $1 AND employment_status = 'ACTIVE' ORDER BY tier_level DESC LIMIT 1`,
          [rule.required_tier]
        );
        const approverId = adminRes.rows.length > 0 ? adminRes.rows[0].id : employeeId;

        const reqNo = `APPR-OT-${String(data.id).padStart(4, "0")}`;
        const reqRes = await pool.query(
          `INSERT INTO erp_approval_requests (request_no, event_type, rule_id, target_table, target_id, requester_id, title, payload, status)
           VALUES ($1, 'OT_REQUEST', $2, 'erp_overtimes', $3, $4, $5, $6, 'PENDING') RETURNING id`,
          [
            reqNo,
            rule.id,
            data.id,
            employeeId,
            `[초과근무] ${otDate} (${finalHours}시간 / ${finalOtPay.toLocaleString()}원)`,
            { otHours: finalHours, otPay: finalOtPay, otTypeLabel: calc.otTypeLabel, reason },
          ]
        );
        if (reqRes.rows.length > 0) {
          await pool.query(
            `INSERT INTO erp_approval_steps (request_id, step_order, approver_id, status) VALUES ($1, 1, $2, 'PENDING')`,
            [reqRes.rows[0].id, approverId]
          );
        }
      }
    }

    return NextResponse.json({ success: true, overtime: data });
  } catch (error: any) {
    console.error("POST Overtime Error:", error);
    return NextResponse.json({ error: "초과근무 신청 실패: " + error.message }, { status: 500 });
  }
}

// PATCH: 승인 또는 반려 처리
export async function PATCH(request: Request) {
  try {
    const { id, action, approverId, memo } = await request.json();

    if (!id || !action || !approverId) {
      return NextResponse.json({ error: "초과근무 ID, 처리 구분, 결재자 ID는 필수입니다." }, { status: 400 });
    }

    const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const now = new Date().toISOString();

    const { data, error } = await supabaseErp
      .from("erp_overtimes")
      .update({
        status: nextStatus,
        approver_id: approverId,
        approved_at: now,
        memo: memo || (nextStatus === "APPROVED" ? "관리자 승인" : "관리자 반려"),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `초과근무가 ${nextStatus === "APPROVED" ? "승인" : "반려"} 처리되었습니다.`,
      overtime: data,
    });
  } catch (error: any) {
    console.error("PATCH Overtime Error:", error);
    return NextResponse.json({ error: "결재 처리 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: 초과근무 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 ID가 누락되었습니다." }, { status: 400 });
    }

    const { error } = await supabaseErp.from("erp_overtimes").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Overtime Error:", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
