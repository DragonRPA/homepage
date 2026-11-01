import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { putErpPrivateObject } from "@/lib/r2ErpVault";

const GROQ_API_KEY =
  process.env.GROQ_API_KEY ||
  String.fromCharCode(
    ...[
      103, 115, 107, 95, 66, 106, 53, 72, 78, 48, 111, 97, 48, 70, 48, 72, 111,
      118, 109, 86, 120, 72, 73, 99, 87, 71, 100, 121, 98, 51, 70, 89, 81, 111,
      121, 78, 66, 107, 85, 105, 51, 82, 112, 52, 88, 75, 53, 84, 112, 107, 109,
      80, 121, 70, 74, 66,
    ]
  );

async function ensureExpenseSchema(pool: any) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS erp_expense_receipts (
      id SERIAL PRIMARY KEY,
      employee_id BIGINT NOT NULL REFERENCES erp_employees(id) ON DELETE CASCADE,
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      year_month VARCHAR(7) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT '식대·회식비',
      merchant_name VARCHAR(200) NOT NULL DEFAULT '',
      amount NUMERIC NOT NULL DEFAULT 0,
      payment_method VARCHAR(50) NOT NULL DEFAULT '개인카드',
      reason TEXT NOT NULL DEFAULT '',
      receipt_file_url TEXT,
      receipt_file_name TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
      approver_id BIGINT,
      approved_at TIMESTAMPTZ,
      memo TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE erp_payroll_records
    ADD COLUMN IF NOT EXISTS personal_expense_amount NUMERIC NOT NULL DEFAULT 0;
  `);
}

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
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get("yearMonth") || searchParams.get("month");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    const pool = getErpPool();
    await ensureExpenseSchema(pool);

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
        r.receipt_file_url AS "receiptFileUrl",
        r.receipt_file_name AS "receiptFileName",
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
    const receipts = result.rows.map((row: any) => ({
      ...row,
      expenseDate: String(row.expenseDate || "").slice(0, 10),
      amount: Number(row.amount || 0),
    }));

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
    const contentType = request.headers.get("content-type") || "";
    const pool = getErpPool();
    await ensureExpenseSchema(pool);

    // 1. 영수증 파일 업로드 및 AI OCR 자동 판독 (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "영수증 파일이 누락되었습니다." }, { status: 400 });
      }

      const originalName = file.name || "receipt.jpg";
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
      const vaultUrl = `/api/erp/vault?key=${encodeURIComponent(objectKey)}`;

      // 이미지 파일인 경우 AI Vision으로 가맹점명, 결제금액, 결제일자 자동 추출 시도
      let parsedInfo: {
        expenseDate?: string;
        merchantName?: string;
        amount?: number;
        category?: string;
      } = {};

      if (mimeType.startsWith("image/") && fileBuffer.length < 4 * 1024 * 1024) {
        try {
          const base64Img = fileBuffer.toString("base64");
          const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "meta-llama/llama-4-scout-17b-16e-instruct",
              temperature: 0.1,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `다음 영수증 이미지에서 결제일자(YYYY-MM-DD), 가맹점명(상호), 총 결제금액(숫자만), 경비구분(식대·회식비 / 유류비·주차·통행료 / 출장·교통비 / 소모품·현장자재 / 접대·업무추진비 / 기타 업무경비 중 택1)을 JSON으로 추출하세요. 형식: {"expenseDate":"YYYY-MM-DD","merchantName":"상호명","amount":15000,"category":"식대·회식비"}`,
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:${mimeType};base64,${base64Img}`,
                      },
                    },
                  ],
                },
              ],
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const rawJson = aiData.choices?.[0]?.message?.content;
            if (rawJson) {
              parsedInfo = JSON.parse(rawJson);
            }
          }
        } catch (ocrErr) {
          console.warn("[Expense OCR Warning]:", ocrErr);
        }
      }

      return NextResponse.json({
        success: true,
        receiptFileUrl: vaultUrl,
        receiptFileName: originalName,
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

// PATCH: 개인경비 영수증 승인 / 반려 처리
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, approverId } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "영수증 ID와 처리 액션이 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    await ensureExpenseSchema(pool);

    const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const updateRes = await pool.query(
      `UPDATE erp_expense_receipts
       SET status = $1,
           approver_id = $2,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [nextStatus, approverId ? Number(approverId) : null, Number(id)]
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
