export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { putErpPrivateObject } from "@/lib/r2ErpVault";
import { callGroqJsonOcr } from "@/lib/erpOcrEngine";
import { ensureExpenseSchema } from "@/lib/erpExpenseSchema";
import { requireMenuPermission } from "@/lib/erpRbacGuard";

/**
 * 특정 귀속연월 + 임직원의 승인된 개인경비 합계를 급여 정산 대장(erp_payroll_records)에 실시간 반영
 * - 개인경비 환급액은 실비변상 비과세 항목이므로 지급합계(total_gross)와 실지급액(net_salary)에 1:1 가산됨
 */
async function syncPayrollPersonalExpense(
  pool: any,
  yearMonth: string,
  employeeId: number
) {
  if (!yearMonth || !employeeId) return;

  const sumRes = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS approved_sum
     FROM erp_expense_receipts
     WHERE year_month = $1 AND employee_id = $2 AND status = 'APPROVED'`,
    [yearMonth, Number(employeeId)]
  );
  const approvedExpenseSum = Number(sumRes.rows[0]?.approved_sum || 0);

  const payrollRes = await pool.query(
    `SELECT id, base_salary, ot_pay, meal_allowance, vehicle_allowance,
            annual_leave_allowance, COALESCE(severance_pay, 0) AS severance_pay,
            bonus, total_deduction
     FROM erp_payroll_records
     WHERE year_month = $1 AND employee_id = $2
     LIMIT 1`,
    [yearMonth, Number(employeeId)]
  );

  if (payrollRes.rows.length > 0) {
    const rec = payrollRes.rows[0];
    const nextTotalGross =
      Number(rec.base_salary || 0) +
      Number(rec.ot_pay || 0) +
      Number(rec.meal_allowance || 0) +
      Number(rec.vehicle_allowance || 0) +
      Number(rec.annual_leave_allowance || 0) +
      Number(rec.severance_pay || 0) +
      Number(rec.bonus || 0) +
      approvedExpenseSum;
    const nextNetSalary = nextTotalGross - Number(rec.total_deduction || 0);

    await pool.query(
      `UPDATE erp_payroll_records
       SET personal_expense_amount = $1,
           total_gross = $2,
           net_salary = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [approvedExpenseSum, nextTotalGross, nextNetSalary, rec.id]
    );
  }
}

// GET: 개인경비 영수증 목록 조회
export async function GET(request: Request) {
  try {
    const guard = await requireMenuPermission(
      request,
      ["expense_receipt", "expense_receipts", "EXPENSE_RECEIPT"],
      "view"
    );
    if (!guard.authorized) {
      return guard.response!;
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const includeFiles = searchParams.get("includeFiles") === "true";

    const pool = getErpPool();
    await ensureExpenseSchema(pool);

    // Fast path: 단건 영수증 이미지 및 상세 지연 로딩
    if (idParam) {
      const singleRes = await pool.query(
        `SELECT
          r.id,
          r.employee_id AS "employeeId",
          COALESCE(e.employee_no, '') AS "employeeNo",
          COALESCE(e.name, '') AS "employeeName",
          COALESCE(e.department, '') AS "department",
          COALESCE(e.position, '') AS "position",
          COALESCE(e.duty, '') AS "duty",
          r.expense_date::text AS "expenseDate",
          r.year_month AS "yearMonth",
          r.category,
          r.merchant_name AS "merchantName",
          COALESCE(r.amount, 0)::numeric AS "amount",
          r.payment_method AS "paymentMethod",
          r.reason,
          r.receipt_file_url AS "receiptFileUrl",
          r.receipt_file_name AS "receiptFileName",
          (r.receipt_file_url IS NOT NULL AND r.receipt_file_url <> '') AS "hasReceipt",
          r.status,
          r.approver_id AS "approverId",
          a.name AS "approverName",
          r.approved_at AS "approvedAt",
          r.memo,
          r.created_at AS "createdAt"
        FROM erp_expense_receipts r
        JOIN erp_employees e ON r.employee_id = e.id
        LEFT JOIN erp_employees a ON r.approver_id = a.id
        WHERE r.id = $1
        LIMIT 1`,
        [Number(idParam)]
      );
      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "해당 경비 영수증을 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({ success: true, receipt: singleRes.rows[0] });
    }

    const yearMonth = searchParams.get("yearMonth") || searchParams.get("month");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    let query = `
      SELECT
        r.id,
        r.employee_id AS "employeeId",
        COALESCE(e.employee_no, '') AS "employeeNo",
        COALESCE(e.name, '') AS "employeeName",
        COALESCE(e.department, '') AS "department",
        COALESCE(e.position, '') AS "position",
        COALESCE(e.duty, '') AS "duty",
        r.expense_date::text AS "expenseDate",
        r.year_month AS "yearMonth",
        r.category,
        r.merchant_name AS "merchantName",
        COALESCE(r.amount, 0)::numeric AS "amount",
        r.payment_method AS "paymentMethod",
        r.reason,
        ${includeFiles ? `r.receipt_file_url AS "receiptFileUrl",` : `CASE WHEN r.receipt_file_url LIKE 'data:%' THEN NULL ELSE r.receipt_file_url END AS "receiptFileUrl",`}
        r.receipt_file_name AS "receiptFileName",
        (r.receipt_file_url IS NOT NULL AND r.receipt_file_url <> '') AS "hasReceipt",
        r.status,
        r.approver_id AS "approverId",
        a.name AS "approverName",
        r.approved_at AS "approvedAt",
        r.memo,
        r.created_at AS "createdAt"
      FROM erp_expense_receipts r
      JOIN erp_employees e ON r.employee_id = e.id
      LEFT JOIN erp_employees a ON r.approver_id = a.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (yearMonth && yearMonth !== "ALL") {
      params.push(yearMonth);
      conditions.push(`r.year_month = $${params.length}`);
    }

    if (employeeId && employeeId !== "ALL") {
      params.push(Number(employeeId));
      conditions.push(`r.employee_id = $${params.length}`);
    }

    if (status && status !== "ALL") {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY r.expense_date DESC, r.id DESC`;

    const result = await pool.query(query, params);
    const receipts = result.rows.map((row: any) => {
      const cleanDate = String(row.expenseDate || "").slice(0, 10);
      const amt = Number(row.amount || 0);
      return {
        ...row,
        expenseDate: cleanDate,
        amount: amt,
        // snake_case 호환 필드 동시 제공
        employee_id: Number(row.employeeId),
        employee_no: row.employeeNo || "",
        employee_name: row.employeeName || "",
        expense_date: cleanDate,
        year_month: row.yearMonth || "",
        merchant_name: row.merchantName || "",
        payment_method: row.paymentMethod || "",
        description: row.reason || "",
        hasReceipt: Boolean(row.hasReceipt || row.receiptFileUrl),
        has_receipt: Boolean(row.hasReceipt || row.receiptFileUrl),
        receipt_file_url: row.receiptFileUrl || null,
        receipt_file_name: row.receiptFileName || null,
        approved_by: row.approverName || (row.approverId ? String(row.approverId) : null),
        approved_at: row.approvedAt || null,
        created_at: row.createdAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      receipts,
    });
  } catch (error: any) {
    console.error("GET Expenses Error:", error);
    return NextResponse.json(
      { error: "개인경비 영수증 목록 조회 실패: " + error.message },
      { status: 500 }
    );
  }
}

// POST: 개인경비 영수증 등록 또는 영수증 파일 업로드 + AI 자동인식
export async function POST(request: Request) {
  try {
    const guard = await requireMenuPermission(
      request,
      ["expense_receipt", "expense_receipts", "EXPENSE_RECEIPT"],
      "save"
    );
    if (!guard.authorized) {
      return guard.response!;
    }

    const contentType = request.headers.get("content-type") || "";
    const pool = getErpPool();
    await ensureExpenseSchema(pool);

    // 1. 영수증 파일 업로드 + DB 등록 또는 OCR 판독 (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const formEmpId = formData.get("employee_id") || formData.get("employeeId");
      const formExpenseDate = formData.get("expense_date") || formData.get("expenseDate");
      const formYearMonth = formData.get("year_month") || formData.get("yearMonth");
      const formCategory = formData.get("category");
      const formPaymentMethod = formData.get("payment_method") || formData.get("paymentMethod");
      const formMerchantName = formData.get("merchant_name") || formData.get("merchantName");
      const formAmount = formData.get("amount");
      const formDescription = formData.get("description") || formData.get("reason");
      const formAutoApprove = formData.get("auto_approve") ?? formData.get("autoApprove");
      const formApprovedBy = formData.get("approved_by") || formData.get("approverId");

      let vaultUrl: string | null = null;
      let originalName: string | null = null;
      let parsedInfo: {
        expenseDate?: string;
        merchantName?: string;
        amount?: number;
        category?: string;
      } = {};

      if (file && file.size > 0) {
        originalName = file.name || "receipt.jpg";
        const mimeType = file.type || "image/jpeg";
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        const ext = (originalName.split(".").pop() || "jpg")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const safeSlug = originalName
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-zA-Z0-9가-힣_-]/g, "_")
          .slice(0, 40);
        const ymFolder = new Date().toISOString().slice(0, 7);
        const objectKey = `expenses/${ymFolder}/${Date.now()}_${safeSlug}.${ext}`;

        await putErpPrivateObject(objectKey, fileBuffer, mimeType);
        vaultUrl = `/api/erp/vault?key=${encodeURIComponent(objectKey)}`;

        // 이미지 파일인 경우 AI Vision으로 가맹점명, 결제금액, 결제일자 자동 추출 시도
        if (mimeType.startsWith("image/") && fileBuffer.length < 4 * 1024 * 1024) {
          try {
            const base64Img = fileBuffer.toString("base64");
            const aiParsed = await callGroqJsonOcr({
              prompt: `다음 영수증 이미지에서 결제일자(YYYY-MM-DD), 가맹점명(상호), 총 결제금액(숫자만), 경비구분(식대·회식비 / 유류비·주차·통행료 / 출장·교통비 / 소모품·현장자재 / 접대·업무추진비 / 기타 업무경비 중 택1)을 JSON으로 추출하세요. 형식: {"expenseDate":"YYYY-MM-DD","merchantName":"상호명","amount":15000,"category":"식대·회식비"}`,
              imageBase64: `data:${mimeType};base64,${base64Img}`,
              models: ["meta-llama/llama-4-scout-17b-16e-instruct"],
              timeoutMs: 18000,
              maxTokens: 500,
            });
            if (aiParsed) {
              parsedInfo = aiParsed;
            }
          } catch (ocrErr) {
            console.warn("[Expense OCR Warning]:", ocrErr);
          }
        }
      }

      // 파일만 단독 업로드(OCR 미리보기 용도)한 경우
      if (!formEmpId) {
        if (!file) {
          return NextResponse.json({ error: "영수증 파일이 누락되었습니다." }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          receiptFileUrl: vaultUrl,
          receiptFileName: originalName,
          parsed: parsedInfo,
        });
      }

      // 폼 데이터와 함께 제출된 경우 DB에 즉시 INSERT
      const resolvedDate = String(formExpenseDate || parsedInfo.expenseDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
      const resolvedYm =
        formYearMonth && /^\d{4}-\d{2}$/.test(String(formYearMonth))
          ? String(formYearMonth)
          : resolvedDate.slice(0, 7);
      const resolvedCategory = String(formCategory || parsedInfo.category || "식대·회식비").trim();
      const resolvedMerchant = String(formMerchantName || parsedInfo.merchantName || "").trim();
      const resolvedAmount = Number(formAmount || parsedInfo.amount || 0);
      const resolvedPaymentMethod = String(formPaymentMethod || "개인카드").trim();
      const resolvedReason = String(formDescription || "").trim();
      const isAutoApprove = String(formAutoApprove) === "true" || formAutoApprove === "1";
      const status = isAutoApprove ? "APPROVED" : "PENDING";

      let resolvedApproverId: number | null = null;
      if (isAutoApprove) {
        const parsedApprover = Number(formApprovedBy);
        resolvedApproverId = !isNaN(parsedApprover) && parsedApprover > 0 ? parsedApprover : Number(formEmpId);
      }

      const insertRes = await pool.query(
        `INSERT INTO erp_expense_receipts (
          employee_id, expense_date, year_month, category, merchant_name,
          amount, payment_method, reason, receipt_file_url, receipt_file_name,
          status, approver_id, approved_at, memo, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, NOW()
        ) RETURNING *`,
        [
          Number(formEmpId),
          resolvedDate,
          resolvedYm,
          resolvedCategory,
          resolvedMerchant,
          resolvedAmount,
          resolvedPaymentMethod,
          resolvedReason,
          vaultUrl,
          originalName,
          status,
          resolvedApproverId,
          isAutoApprove ? new Date().toISOString() : null,
          isAutoApprove ? "등록 즉시 승인 (급여정산 반영)" : null,
        ]
      );

      await syncPayrollPersonalExpense(pool, resolvedYm, Number(formEmpId));

      return NextResponse.json({
        success: true,
        message: isAutoApprove
          ? `개인경비 영수증이 등록·승인되어 [${resolvedYm}] 급여 정산에 즉시 반영되었습니다.`
          : `개인경비 영수증이 등록되었습니다.`,
        receipt: insertRes.rows[0],
        parsed: parsedInfo,
      });
    }

    // 2. 개인경비 영수증 데이터 DB 저장 (application/json)
    const body = await request.json();
    const {
      employeeId,
      expenseDate,
      yearMonth,
      category,
      merchantName,
      amount,
      paymentMethod,
      reason,
      receiptFileUrl,
      receiptFileName,
      autoApprove,
      approverId,
    } = body;

    if (!employeeId || !expenseDate || Number(amount || 0) <= 0) {
      return NextResponse.json(
        { error: "대상 임직원, 사용일자, 결제금액(0원 초과)은 필수 항목입니다." },
        { status: 400 }
      );
    }

    const cleanDate = String(expenseDate).slice(0, 10);
    const resolvedYearMonth =
      yearMonth && /^\d{4}-\d{2}$/.test(String(yearMonth))
        ? String(yearMonth)
        : cleanDate.slice(0, 7);
    const status = autoApprove ? "APPROVED" : "PENDING";

    const insertRes = await pool.query(
      `INSERT INTO erp_expense_receipts (
        employee_id, expense_date, year_month, category, merchant_name,
        amount, payment_method, reason, receipt_file_url, receipt_file_name,
        status, approver_id, approved_at, memo, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, NOW()
      ) RETURNING *`,
      [
        Number(employeeId),
        cleanDate,
        resolvedYearMonth,
        String(category || "식대·회식비").trim(),
        String(merchantName || "").trim(),
        Number(amount || 0),
        String(paymentMethod || "개인카드").trim(),
        String(reason || "").trim(),
        receiptFileUrl || null,
        receiptFileName || null,
        status,
        autoApprove ? Number(approverId || employeeId) : null,
        autoApprove ? new Date().toISOString() : null,
        autoApprove ? "등록 즉시 승인 (급여정산 반영)" : null,
      ]
    );

    // 급여정산 대장에 즉시 동기화
    await syncPayrollPersonalExpense(pool, resolvedYearMonth, Number(employeeId));

    return NextResponse.json({
      success: true,
      message: autoApprove
        ? `개인경비 영수증이 등록·승인되어 [${resolvedYearMonth}] 급여 정산에 즉시 반영되었습니다.`
        : `개인경비 영수증이 등록되었습니다.`,
      receipt: insertRes.rows[0],
    });
  } catch (error: any) {
    console.error("POST Expense Error:", error);
    return NextResponse.json(
      { error: "개인경비 영수증 등록 실패: " + error.message },
      { status: 500 }
    );
  }
}

// PATCH: 개인경비 영수증 승인 / 반려 처리 (단건 및 일괄 승인 지원)
export async function PATCH(request: Request) {
  try {
    const guard = await requireMenuPermission(
      request,
      ["expense_receipt", "expense_receipts", "EXPENSE_RECEIPT"],
      "save"
    );
    if (!guard.authorized) {
      return guard.response!;
    }

    const body = await request.json();
    const { id, action, status, approverId, approved_by, yearMonth } = body;

    const pool = getErpPool();
    await ensureExpenseSchema(pool);

    const resolvedApproverId =
      approverId && !isNaN(Number(approverId)) ? Number(approverId) : null;

    // 1) 당월 대기건 일괄 승인 (APPROVE_ALL)
    if (action === "APPROVE_ALL") {
      if (!yearMonth) {
        return NextResponse.json({ error: "일괄 승인할 귀속연월이 필요합니다." }, { status: 400 });
      }
      const batchRes = await pool.query(
        `UPDATE erp_expense_receipts
         SET status = 'APPROVED',
             approver_id = COALESCE($1, approver_id),
             approved_at = NOW(),
             updated_at = NOW()
         WHERE year_month = $2 AND status = 'PENDING'
         RETURNING id, year_month, employee_id`,
        [resolvedApproverId, String(yearMonth)]
      );

      const empIds = Array.from(new Set(batchRes.rows.map((r: any) => Number(r.employee_id))));
      for (const empId of empIds) {
        await syncPayrollPersonalExpense(pool, String(yearMonth), empId);
      }

      return NextResponse.json({
        success: true,
        message: `[${yearMonth}] 대기 중인 영수증 ${batchRes.rows.length}건이 일괄 승인되어 급여 정산에 반영되었습니다.`,
        count: batchRes.rows.length,
      });
    }

    // 2) 단건 승인 / 반려 처리
    const effectiveAction =
      action || (status === "APPROVED" ? "APPROVE" : status === "REJECTED" ? "REJECT" : null);

    if (!id || !effectiveAction) {
      return NextResponse.json({ error: "영수증 ID와 처리 액션이 필요합니다." }, { status: 400 });
    }

    const nextStatus = effectiveAction === "APPROVE" ? "APPROVED" : "REJECTED";
    const updateRes = await pool.query(
      `UPDATE erp_expense_receipts
       SET status = $1,
           approver_id = COALESCE($2, approver_id),
           approved_at = NOW(),
           memo = COALESCE($3, memo),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        nextStatus,
        resolvedApproverId,
        approved_by ? `결재자: ${approved_by}` : null,
        Number(id),
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: "대상 영수증을 찾을 수 없습니다." }, { status: 404 });
    }

    const row = updateRes.rows[0];
    await syncPayrollPersonalExpense(pool, row.year_month, Number(row.employee_id));

    return NextResponse.json({
      success: true,
      message:
        nextStatus === "APPROVED"
          ? `승인 완료되어 [${row.year_month}] 급여 정산에 반영되었습니다.`
          : "반려 처리되었습니다.",
      receipt: row,
    });
  } catch (error: any) {
    console.error("PATCH Expense Error:", error);
    return NextResponse.json({ error: "처리 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: 개인경비 영수증 삭제 및 급여 정산 재동기화
export async function DELETE(request: Request) {
  try {
    const guard = await requireMenuPermission(
      request,
      ["expense_receipt", "expense_receipts", "EXPENSE_RECEIPT"],
      "save"
    );
    if (!guard.authorized) {
      return guard.response!;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 영수증 ID가 누락되었습니다." }, { status: 400 });
    }

    const pool = getErpPool();
    await ensureExpenseSchema(pool);

    const delRes = await pool.query(
      `DELETE FROM erp_expense_receipts WHERE id = $1 RETURNING year_month, employee_id`,
      [Number(id)]
    );

    if (delRes.rows.length > 0) {
      const { year_month, employee_id } = delRes.rows[0];
      await syncPayrollPersonalExpense(pool, year_month, Number(employee_id));
    }

    return NextResponse.json({
      success: true,
      message: "개인경비 영수증 내역이 삭제되었으며 급여 정산액이 갱신되었습니다.",
    });
  } catch (error: any) {
    console.error("DELETE Expense Error:", error);
    return NextResponse.json({ error: "삭제 실패: " + error.message }, { status: 500 });
  }
}
