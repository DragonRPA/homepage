export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool, supabaseErp } from "@/lib/supabaseErp";
import { calculateOvertimeBreakdown } from "@/lib/erpFormat";

/**
 * 초과근무 신청자의 소속 부서장(팀장)을 결재자로 산출하며, 부서장 본인이 상신하는 경우 대표이사 결재 없이 본인 전결(자동 승인)로 처리
 * - 일반 부서원(예: 박종환, 김승지)이 상신 -> 소속 부서(렌탈운영팀)의 부서장(장종순) 배정 (autoApprove: false)
 * - 부서장 본인(예: 장종순)이 상신 -> 부서장 전결 처리 (autoApprove: true)
 */
async function resolveOvertimeApprover(
  pool: any,
  requesterEmpId: number
): Promise<{ approverId: number; autoApprove: boolean }> {
  const empRes = await pool.query(
    `SELECT e.id, e.name, e.role, e.role_code, e.duty, e.position, e.tier_level,
            e.department_id, COALESCE(d.dept_name, e.department, '') AS dept_name,
            d.manager_name, d.parent_id
     FROM erp_employees e
     LEFT JOIN erp_departments d ON e.department_id = d.id OR (e.department_id IS NULL AND e.department = d.dept_name)
     WHERE e.id = $1
     LIMIT 1`,
    [requesterEmpId]
  );

  if (empRes.rows.length > 0) {
    const reqEmp = empRes.rows[0];
    const deptId = reqEmp.department_id;
    const deptName = String(reqEmp.dept_name || "").trim();
    const deptManagerName = String(reqEmp.manager_name || "").trim();
    const duty = String(reqEmp.duty || "").trim();
    const pos = String(reqEmp.position || "").trim();
    const role = String(reqEmp.role || "").toUpperCase();
    const roleCode = String(reqEmp.role_code || "").toUpperCase();
    const tierLevel = Number(reqEmp.tier_level || 0);

    // 1. 소속 부서에 지정된 부서장(manager_name)이 있는 경우 우선 매칭 (대표이사가 아닌 실무 부서장 우선)
    if (deptManagerName && !deptManagerName.includes("대표이사")) {
      const mgrByName = await pool.query(
        `SELECT id FROM erp_employees WHERE name = $1 AND employment_status = 'ACTIVE' LIMIT 1`,
        [deptManagerName]
      );
      if (mgrByName.rows.length > 0) {
        const mgrId = Number(mgrByName.rows[0].id);
        return {
          approverId: mgrId,
          autoApprove: mgrId === requesterEmpId,
        };
      }
    }

    // 2. 동일 부서 내 직책(팀장/부서장/본부장/실장) 또는 역할(MANAGER) 보유자를 탐색 (대표이사 제외)
    if (deptId || deptName) {
      const deptHeadRes = await pool.query(
        `SELECT id FROM erp_employees
         WHERE employment_status = 'ACTIVE'
           AND position NOT LIKE '%대표%'
           AND COALESCE(duty, '') NOT LIKE '%대표%'
           AND (
             ($1::int IS NOT NULL AND department_id = $1::int)
             OR ($2 <> '' AND department = $2)
           )
           AND (
             role = 'MANAGER' OR role_code = 'MANAGER'
             OR duty LIKE '%팀장%' OR duty LIKE '%부서장%' OR duty LIKE '%본부장%' OR duty LIKE '%실장%'
             OR position LIKE '%팀장%' OR position LIKE '%부서장%' OR position LIKE '%부장%'
           )
         ORDER BY tier_level DESC, id ASC
         LIMIT 1`,
        [deptId ? Number(deptId) : null, deptName]
      );
      if (deptHeadRes.rows.length > 0) {
        const mgrId = Number(deptHeadRes.rows[0].id);
        return {
          approverId: mgrId,
          autoApprove: mgrId === requesterEmpId,
        };
      }
    }

    // 3. 신청자 본인이 부서장(팀장/부장)인 경우 본인 전결
    const isDeptHeadSelf =
      role === "MANAGER" ||
      roleCode === "MANAGER" ||
      tierLevel >= 3 ||
      /팀장|부서장|본부장|실장/.test(duty) ||
      /팀장|부서장|부장/.test(pos);

    if (isDeptHeadSelf && !pos.includes("대표") && !duty.includes("대표")) {
      return { approverId: requesterEmpId, autoApprove: true };
    }
  }

  // 4. 전사 부서장(MANAGER / 팀장 / 부장, 예: 장종순) 탐색 (대표이사 제외)
  const fallbackMgrRes = await pool.query(
    `SELECT id FROM erp_employees
     WHERE employment_status = 'ACTIVE'
       AND position NOT LIKE '%대표%'
       AND COALESCE(duty, '') NOT LIKE '%대표%'
       AND (role = 'MANAGER' OR role_code = 'MANAGER' OR duty LIKE '%팀장%' OR position LIKE '%부장%')
     ORDER BY tier_level DESC, id ASC
     LIMIT 1`
  );
  if (fallbackMgrRes.rows.length > 0) {
    const mgrId = Number(fallbackMgrRes.rows[0].id);
    return {
      approverId: mgrId,
      autoApprove: mgrId === requesterEmpId,
    };
  }

  return { approverId: requesterEmpId, autoApprove: true };
}

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

    // 부서장 전결/결재자 산출 (부서원은 부서장에게 상신, 부서장 본인이거나 부서장이 즉시승인 시 부서장 명의로 승인)
    const resolved = await resolveOvertimeApprover(pool, Number(employeeId));
    const effectiveApproverId = resolved.approverId;
    const effectiveAutoApprove = Boolean(autoApprove) || resolved.autoApprove;
    const initialStatus = effectiveAutoApprove ? "APPROVED" : "PENDING";
    const nowIso = new Date().toISOString();

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
      approver_id: effectiveApproverId,
    };

    if (effectiveAutoApprove) {
      insertPayload.approved_at = nowIso;
      insertPayload.memo = "부서장 전결 (승인)";
    }

    const { data, error } = await supabaseErp
      .from("erp_overtimes")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 결재 연동 (결재선 규칙: OT_REQUEST, 부서장에게 배정)
    let approverName = "";
    try {
      const ruleRes = await pool.query(
        `SELECT id, required_tier FROM erp_approval_rules WHERE event_type = 'OT_REQUEST' LIMIT 1`
      );
      const ruleId = ruleRes.rows.length > 0 ? ruleRes.rows[0].id : null;

      const apprNameRes = await pool.query(
        `SELECT name FROM erp_employees WHERE id = $1 LIMIT 1`,
        [effectiveApproverId]
      );
      if (apprNameRes.rows.length > 0) {
        approverName = apprNameRes.rows[0].name;
      }

      const reqNo = `APPR-OT-${String(data.id).padStart(4, "0")}`;
      const reqRes = await pool.query(
        `INSERT INTO erp_approval_requests (request_no, event_type, rule_id, target_table, target_id, requester_id, title, payload, status)
         VALUES ($1, 'OT_REQUEST', $2, 'erp_overtimes', $3, $4, $5, $6, $7) RETURNING id`,
        [
          reqNo,
          ruleId,
          data.id,
          Number(employeeId),
          `[초과근무] ${String(otDate).slice(0, 10)} (${finalHours}시간 / ${finalOtPay.toLocaleString()}원)`,
          {
            근무일자: String(otDate).slice(0, 10),
            근무시간: `${startTime || "18:00"} ~ ${endTime || "21:00"} (${finalHours}h)`,
            근무구분: calc.otTypeLabel,
            산정수당: `${finalOtPay.toLocaleString()}원`,
            근무사유: String(reason).trim(),
            otHours: finalHours,
            otPay: finalOtPay,
            otTypeLabel: calc.otTypeLabel,
            reason: String(reason).trim(),
          },
          initialStatus,
        ]
      );
      if (reqRes.rows.length > 0) {
        await pool.query(
          `INSERT INTO erp_approval_steps (request_id, step_order, approver_id, status, comment, acted_at)
           VALUES ($1, 1, $2, $3, $4, $5)`,
          [
            reqRes.rows[0].id,
            effectiveApproverId,
            initialStatus,
            effectiveAutoApprove ? "부서장 전결 (승인)" : null,
            effectiveAutoApprove ? nowIso : null,
          ]
        );
      }
    } catch (apprErr) {
      console.warn("초과근무 결재요청 자동등록 실패:", apprErr);
    }

    return NextResponse.json({
      success: true,
      overtime: data,
      approverId: effectiveApproverId,
      approverName,
      autoApproved: effectiveAutoApprove,
    });
  } catch (error: any) {
    console.error("POST Overtime Error:", error);
    return NextResponse.json({ error: "초과근무 신청 실패: " + error.message }, { status: 500 });
  }
}

// PATCH: 승인 또는 반려 처리 (부서장 결재자로 귀속)
export async function PATCH(request: Request) {
  try {
    const { id, action, approverId, memo } = await request.json();

    if (!id || !action || !approverId) {
      return NextResponse.json({ error: "초과근무 ID, 처리 구분, 결재자 ID는 필수입니다." }, { status: 400 });
    }

    const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const now = new Date().toISOString();

    const pool = getErpPool();
    let finalApproverId = Number(approverId);
    try {
      const otRes = await pool.query(`SELECT employee_id, approver_id FROM erp_overtimes WHERE id = $1 LIMIT 1`, [Number(id)]);
      if (otRes.rows.length > 0) {
        const resolved = await resolveOvertimeApprover(pool, Number(otRes.rows[0].employee_id));
        finalApproverId = resolved.approverId;
      }
    } catch {}

    const { data, error } = await supabaseErp
      .from("erp_overtimes")
      .update({
        status: nextStatus,
        approver_id: finalApproverId,
        approved_at: now,
        memo: memo || (nextStatus === "APPROVED" ? "부서장 승인" : "부서장 반려"),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 연동된 전자결재 요청(erp_approval_requests) 및 결재선(erp_approval_steps) 동기화
    try {
      const reqRes = await pool.query(
        `UPDATE erp_approval_requests
         SET status = $1, updated_at = NOW()
         WHERE target_table = 'erp_overtimes' AND target_id = $2
         RETURNING id`,
        [nextStatus, Number(id)]
      );
      if (reqRes.rows.length > 0) {
        const reqIds = reqRes.rows.map((r: any) => Number(r.id));
        await pool.query(
          `UPDATE erp_approval_steps
           SET status = $1,
               approver_id = $2,
               comment = COALESCE($3, comment),
               acted_at = NOW()
           WHERE request_id = ANY($4::int[])`,
          [nextStatus, finalApproverId, memo || (nextStatus === "APPROVED" ? "부서장 승인" : "부서장 반려"), reqIds]
        );
      }
    } catch (syncErr) {
      console.warn("Overtime approval sync warning:", syncErr);
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

    // 연동된 전자결재 요청(erp_approval_requests) 및 결재선 삭제
    try {
      const pool = getErpPool();
      await pool.query(
        `DELETE FROM erp_approval_steps
         WHERE request_id IN (
           SELECT id FROM erp_approval_requests
           WHERE target_table = 'erp_overtimes' AND target_id = $1
         )`,
        [Number(id)]
      );
      await pool.query(
        `DELETE FROM erp_approval_requests
         WHERE target_table = 'erp_overtimes' AND target_id = $1`,
        [Number(id)]
      );
    } catch (syncErr) {
      console.warn("Overtime approval delete sync warning:", syncErr);
    }

    return NextResponse.json({ success: true, message: "삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE Overtime Error:", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
