import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// GET /api/erp/partners
// Query params: id (optional single partner with file blobs), type (CUSTOMER | VENDOR | BOTH | ALL), search, status, managerEmployeeId, includeFiles
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const managerEmployeeId = searchParams.get("managerEmployeeId");
    const includeFiles = searchParams.get("includeFiles") === "1";

    const pool = getErpPool();

    // Fast path: Single partner document/detail lookup on-demand
    if (idParam) {
      const singleRes = await pool.query(
        `
        SELECT 
          p.id,
          p.name,
          p.biz_cert_file_url AS "bizCertFileUrl",
          p.biz_cert_file_name AS "bizCertFileName",
          p.bank_copy_file_url AS "bankCopyFileUrl",
          p.bank_copy_file_name AS "bankCopyFileName",
          p.contract_file_url AS "contractFileUrl",
          p.contract_file_name AS "contractFileName"
        FROM erp_partners p
        WHERE p.id = $1
        LIMIT 1
        `,
        [parseInt(idParam, 10)]
      );
      if (singleRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "해당 거래처를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        partner: singleRes.rows[0],
      });
    }

    let query = `
      SELECT 
        p.id,
        p.partner_type AS "partnerType",
        p.partner_code AS "partnerCode",
        p.name,
        p.business_no AS "businessNo",
        p.corporate_no AS "corporateNo",
        p.ceo_name AS "ceoName",
        p.biz_type AS "bizType",
        p.biz_item AS "bizItem",
        p.address,
        p.address_detail AS "addressDetail",
        p.main_phone AS "mainPhone",
        p.main_email AS "mainEmail",
        p.fax_no AS "faxNo",
        p.manager_employee_id AS "managerEmployeeId",
        p.manager_name AS "managerName",
        p.statement_closing_day AS "statementClosingDay",
        p.tax_invoice_closing_day AS "taxInvoiceClosingDay",
        p.payment_due_day AS "paymentDueDay",
        p.status,
        p.memo,
        ${includeFiles ? `p.biz_cert_file_url AS "bizCertFileUrl",` : `NULL AS "bizCertFileUrl",`}
        p.biz_cert_file_name AS "bizCertFileName",
        (p.biz_cert_file_url IS NOT NULL AND p.biz_cert_file_url <> '') AS "hasBizCert",
        p.bank_name AS "bankName",
        p.bank_account_no AS "bankAccountNo",
        p.bank_account_holder AS "bankAccountHolder",
        ${includeFiles ? `p.bank_copy_file_url AS "bankCopyFileUrl",` : `NULL AS "bankCopyFileUrl",`}
        p.bank_copy_file_name AS "bankCopyFileName",
        (p.bank_copy_file_url IS NOT NULL AND p.bank_copy_file_url <> '') AS "hasBankCopy",
        ${includeFiles ? `p.contract_file_url AS "contractFileUrl",` : `NULL AS "contractFileUrl",`}
        p.contract_file_name AS "contractFileName",
        (p.contract_file_url IS NOT NULL AND p.contract_file_url <> '') AS "hasContractFile",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        COALESCE(c_agg.contact_count, 0)::int AS "contactCount",
        c_agg.primary_contact AS "primaryContact"
      FROM erp_partners p
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS contact_count,
          (
            SELECT json_build_object(
              'id', pc.id,
              'name', pc.name,
              'position', pc.position,
              'department', pc.department,
              'mobile', pc.mobile,
              'email', pc.email,
              'telephone', pc.telephone
            )
            FROM erp_partner_contacts pc
            WHERE pc.partner_id = p.id
            ORDER BY pc.is_primary DESC, pc.id ASC
            LIMIT 1
          ) AS primary_contact
        FROM erp_partner_contacts c
        WHERE c.partner_id = p.id
      ) c_agg ON true
      WHERE 1=1
    `;

    const params: any[] = [];

    if (type && type !== "ALL") {
      params.push(type);
      if (type === "CUSTOMER") {
        query += ` AND (p.partner_type = $${params.length} OR p.partner_type = 'BOTH')`;
      } else if (type === "VENDOR") {
        query += ` AND (p.partner_type = $${params.length} OR p.partner_type = 'BOTH')`;
      } else {
        query += ` AND p.partner_type = $${params.length}`;
      }
    }

    if (status && status !== "ALL") {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    if (managerEmployeeId && managerEmployeeId !== "ALL") {
      params.push(parseInt(managerEmployeeId));
      query += ` AND p.manager_employee_id = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      query += ` AND (
        p.name ILIKE $${idx} OR 
        p.business_no ILIKE $${idx} OR 
        p.ceo_name ILIKE $${idx} OR 
        p.manager_name ILIKE $${idx} OR
        p.partner_code ILIKE $${idx}
      )`;
    }

    query += `
      ORDER BY p.id DESC
    `;

    const [res, kpiRes] = await Promise.all([
      pool.query(query, params),
      pool.query(`
        SELECT 
          COUNT(*)::int AS "totalCount",
          COUNT(CASE WHEN partner_type IN ('CUSTOMER', 'BOTH') THEN 1 END)::int AS "customerCount",
          COUNT(CASE WHEN partner_type IN ('VENDOR', 'BOTH') THEN 1 END)::int AS "vendorCount",
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int AS "activeCount",
          COUNT(CASE WHEN biz_cert_file_url IS NOT NULL AND biz_cert_file_url <> '' THEN 1 END)::int AS "withBizCertCount",
          COUNT(CASE WHEN contract_file_url IS NOT NULL AND contract_file_url <> '' THEN 1 END)::int AS "withContractCount"
        FROM erp_partners
      `),
    ]);

    return NextResponse.json({
      success: true,
      partners: res.rows,
      kpi: kpiRes.rows[0] || {
        totalCount: 0,
        customerCount: 0,
        vendorCount: 0,
        activeCount: 0,
        withBizCertCount: 0,
        withContractCount: 0,
      },
    });
  } catch (error: any) {
    console.error("GET /api/erp/partners error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "거래처 목록 조회 실패" },
      { status: 500 }
    );
  }
}

// POST /api/erp/partners
// Register new partner (customer / vendor / both)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      partnerType = "CUSTOMER",
      partnerCode,
      name,
      businessNo,
      corporateNo,
      ceoName,
      bizType,
      bizItem,
      address,
      addressDetail,
      mainPhone,
      mainEmail,
      faxNo,
      managerEmployeeId,
      managerName,
      statementClosingDay = "매월 25일",
      taxInvoiceClosingDay = "익월 10일",
      paymentDueDay = "익월 15일",
      status = "ACTIVE",
      memo,
      bizCertFileUrl,
      bizCertFileName,
      bankName,
      bankAccountNo,
      bankAccountHolder,
      bankCopyFileUrl,
      bankCopyFileName,
      contractFileUrl,
      contractFileName,
      contacts = [],
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "상호명(법인명)은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Auto generate unique partner code if not provided
      let finalCode = (partnerCode || "").trim();
      if (!finalCode) {
        const prefix = partnerType === "VENDOR" ? "VEND" : partnerType === "BOTH" ? "PART" : "CUST";
        const year = new Date().getFullYear();
        const codePattern = `${prefix}-${year}-%`;

        // 1. Find all existing partner codes with this prefix and year
        const existingCodesRes = await client.query(
          "SELECT partner_code FROM erp_partners WHERE partner_code LIKE $1",
          [codePattern]
        );

        let maxSeq = 0;
        const usedCodes = new Set<string>();
        for (const row of existingCodesRes.rows) {
          const code = String(row.partner_code).trim();
          usedCodes.add(code);
          const match = code.match(/-([0-9]+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq) {
              maxSeq = num;
            }
          }
        }

        // 2. Determine next available unique sequence number (guarantee no collision)
        let candidateSeq = maxSeq + 1;
        while (true) {
          const candidateCode = `${prefix}-${year}-${String(candidateSeq).padStart(3, "0")}`;
          if (!usedCodes.has(candidateCode)) {
            const checkRes = await client.query(
              "SELECT 1 FROM erp_partners WHERE partner_code = $1",
              [candidateCode]
            );
            if (checkRes.rows.length === 0) {
              finalCode = candidateCode;
              break;
            }
          }
          candidateSeq++;
        }
      } else {
        // Check uniqueness if manually entered
        const checkRes = await client.query(
          "SELECT 1 FROM erp_partners WHERE partner_code = $1",
          [finalCode]
        );
        if (checkRes.rows.length > 0) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            {
              success: false,
              error: `이미 사용 중인 거래처 코드입니다: [${finalCode}]. 코드를 비워두시면 시스템이 고유 코드를 자동으로 채번합니다.`,
            },
            { status: 400 }
          );
        }
      }

      const insRes = await client.query(
        `
        INSERT INTO erp_partners (
          partner_type, partner_code, name, business_no, corporate_no, ceo_name,
          biz_type, biz_item, address, address_detail, main_phone, main_email,
          fax_no, manager_employee_id, manager_name, statement_closing_day,
          tax_invoice_closing_day, payment_due_day, status, memo,
          biz_cert_file_url, biz_cert_file_name,
          bank_name, bank_account_no, bank_account_holder, bank_copy_file_url, bank_copy_file_name,
          contract_file_url, contract_file_name,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
          $23, $24, $25, $26, $27, $28, $29,
          NOW(), NOW()
        ) RETURNING *
        `,
        [
          partnerType,
          finalCode,
          name.trim(),
          businessNo || null,
          corporateNo || null,
          ceoName || null,
          bizType || null,
          bizItem || null,
          address || null,
          addressDetail || null,
          mainPhone || null,
          mainEmail || null,
          faxNo || null,
          managerEmployeeId ? parseInt(managerEmployeeId) : null,
          managerName || null,
          statementClosingDay || "매월 25일",
          taxInvoiceClosingDay || "익월 10일",
          paymentDueDay || "익월 15일",
          status || "ACTIVE",
          memo || null,
          bizCertFileUrl || null,
          bizCertFileName || null,
          bankName || null,
          bankAccountNo || null,
          bankAccountHolder || null,
          bankCopyFileUrl || null,
          bankCopyFileName || null,
          contractFileUrl || null,
          contractFileName || null,
        ]
      );

      const createdPartner = insRes.rows[0];

      // Insert initial contacts if provided
      if (Array.isArray(contacts) && contacts.length > 0) {
        for (const c of contacts) {
          if (c.name && c.name.trim()) {
            await client.query(
              `
              INSERT INTO erp_partner_contacts (
                partner_id, name, department, position, mobile, email, telephone,
                is_primary, business_card_front_url, business_card_back_url, memo
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              `,
              [
                createdPartner.id,
                c.name.trim(),
                c.department || null,
                c.position || null,
                c.mobile || null,
                c.email || null,
                c.telephone || null,
                c.isPrimary || false,
                c.businessCardFrontUrl || null,
                c.businessCardBackUrl || null,
                c.memo || null,
              ]
            );
          }
        }
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "거래처가 성공적으로 등록되었습니다.",
        partner: createdPartner,
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST /api/erp/partners error:", error);
    if (error.code === "23505" || error.message?.includes("erp_partners_partner_code_key")) {
      return NextResponse.json(
        {
          success: false,
          error: "거래처 코드가 중복되었습니다. 거래처 코드 필드를 비워두시면 시스템이 고유 코드를 자동으로 부여합니다.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "거래처 등록 실패" },
      { status: 500 }
    );
  }
}

// PUT /api/erp/partners
// Update partner details
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      partnerType,
      partnerCode,
      name,
      businessNo,
      corporateNo,
      ceoName,
      bizType,
      bizItem,
      address,
      addressDetail,
      mainPhone,
      mainEmail,
      faxNo,
      managerEmployeeId,
      managerName,
      statementClosingDay,
      taxInvoiceClosingDay,
      paymentDueDay,
      status,
      memo,
      bizCertFileUrl,
      bizCertFileName,
      bankName,
      bankAccountNo,
      bankAccountHolder,
      bankCopyFileUrl,
      bankCopyFileName,
      contractFileUrl,
      contractFileName,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "거래처 식별자(ID)가 필요합니다." },
        { status: 400 }
      );
    }

    const pool = getErpPool();

    // Check if new partner_code collides with another partner
    if (partnerCode && partnerCode.trim()) {
      const codeCheck = await pool.query(
        "SELECT id FROM erp_partners WHERE partner_code = $1 AND id <> $2",
        [partnerCode.trim(), id]
      );
      if (codeCheck.rows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `이미 다른 거래처에서 사용 중인 거래처 코드입니다: [${partnerCode.trim()}].`,
          },
          { status: 400 }
        );
      }
    }
    const updateRes = await pool.query(
      `
      UPDATE erp_partners
      SET 
        partner_type = COALESCE($1, partner_type),
        partner_code = COALESCE($2, partner_code),
        name = COALESCE($3, name),
        business_no = $4,
        corporate_no = $5,
        ceo_name = $6,
        biz_type = $7,
        biz_item = $8,
        address = $9,
        address_detail = $10,
        main_phone = $11,
        main_email = $12,
        fax_no = $13,
        manager_employee_id = $14,
        manager_name = $15,
        statement_closing_day = COALESCE($16, statement_closing_day),
        tax_invoice_closing_day = COALESCE($17, tax_invoice_closing_day),
        payment_due_day = COALESCE($18, payment_due_day),
        status = COALESCE($19, status),
        memo = $20,
        biz_cert_file_url = CASE WHEN $21::text = '__DELETE__' THEN NULL ELSE COALESCE($21, biz_cert_file_url) END,
        biz_cert_file_name = CASE WHEN $21::text = '__DELETE__' THEN NULL ELSE COALESCE($22, biz_cert_file_name) END,
        bank_name = $23,
        bank_account_no = $24,
        bank_account_holder = $25,
        bank_copy_file_url = CASE WHEN $26::text = '__DELETE__' THEN NULL ELSE COALESCE($26, bank_copy_file_url) END,
        bank_copy_file_name = CASE WHEN $26::text = '__DELETE__' THEN NULL ELSE COALESCE($27, bank_copy_file_name) END,
        contract_file_url = CASE WHEN $28::text = '__DELETE__' THEN NULL ELSE COALESCE($28, contract_file_url) END,
        contract_file_name = CASE WHEN $28::text = '__DELETE__' THEN NULL ELSE COALESCE($29, contract_file_name) END,
        updated_at = NOW()
      WHERE id = $30
      RETURNING *
      `,
      [
        partnerType,
        partnerCode,
        name ? name.trim() : null,
        businessNo || null,
        corporateNo || null,
        ceoName || null,
        bizType || null,
        bizItem || null,
        address || null,
        addressDetail || null,
        mainPhone || null,
        mainEmail || null,
        faxNo || null,
        managerEmployeeId ? parseInt(managerEmployeeId) : null,
        managerName || null,
        statementClosingDay,
        taxInvoiceClosingDay,
        paymentDueDay,
        status,
        memo || null,
        bizCertFileUrl || null,
        bizCertFileName || null,
        bankName || null,
        bankAccountNo || null,
        bankAccountHolder || null,
        bankCopyFileUrl || null,
        bankCopyFileName || null,
        contractFileUrl || null,
        contractFileName || null,
        id,
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "수정할 거래처를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "거래처 정보가 성공적으로 수정되었습니다.",
      partner: updateRes.rows[0],
    });
  } catch (error: any) {
    console.error("PUT /api/erp/partners error:", error);
    if (error.code === "23505" || error.message?.includes("erp_partners_partner_code_key")) {
      return NextResponse.json(
        { success: false, error: "중복된 거래처 코드가 존재합니다. 다른 코드를 사용해주세요." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "거래처 정보 수정 실패" },
      { status: 500 }
    );
  }
}

// DELETE /api/erp/partners?id=...
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "삭제할 거래처 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const pool = getErpPool();
    await pool.query("DELETE FROM erp_partners WHERE id = $1", [parseInt(id)]);

    return NextResponse.json({
      success: true,
      message: "거래처가 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("DELETE /api/erp/partners error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "거래처 삭제 실패" },
      { status: 500 }
    );
  }
}
