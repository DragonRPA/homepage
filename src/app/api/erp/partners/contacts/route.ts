import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// GET /api/erp/partners/contacts?partnerId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get("partnerId");

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: "partnerId가 필요합니다." },
        { status: 400 }
      );
    }

    const pool = getErpPool();
    const res = await pool.query(
      `
      SELECT 
        id,
        partner_id AS "partnerId",
        name,
        department,
        position,
        mobile,
        email,
        telephone,
        is_primary AS "isPrimary",
        business_card_front_url AS "businessCardFrontUrl",
        business_card_back_url AS "businessCardBackUrl",
        memo,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM erp_partner_contacts
      WHERE partner_id = $1
      ORDER BY is_primary DESC, id ASC
      `,
      [parseInt(partnerId)]
    );

    return NextResponse.json({
      success: true,
      contacts: res.rows,
    });
  } catch (error: any) {
    console.error("GET /api/erp/partners/contacts error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "거래처 담당자 목록 조회 실패" },
      { status: 500 }
    );
  }
}

// POST /api/erp/partners/contacts
// Add new contact (with business card)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      partnerId,
      name,
      department,
      position,
      mobile,
      email,
      telephone,
      isPrimary = false,
      businessCardFrontUrl,
      businessCardBackUrl,
      memo,
    } = body;

    if (!partnerId || !name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "거래처 ID와 담당자 성명은 필수입니다." },
        { status: 400 }
      );
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // If marked as primary, reset other contacts' primary flag for this partner
      if (isPrimary) {
        await client.query(
          "UPDATE erp_partner_contacts SET is_primary = false WHERE partner_id = $1",
          [parseInt(partnerId)]
        );
      }

      const insRes = await client.query(
        `
        INSERT INTO erp_partner_contacts (
          partner_id, name, department, position, mobile, email,
          telephone, is_primary, business_card_front_url, business_card_back_url, memo,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
        `,
        [
          parseInt(partnerId),
          name.trim(),
          department || null,
          position || null,
          mobile || null,
          email || null,
          telephone || null,
          isPrimary || false,
          businessCardFrontUrl || null,
          businessCardBackUrl || null,
          memo || null,
        ]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "담당자(명함)가 등록되었습니다.",
        contact: insRes.rows[0],
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST /api/erp/partners/contacts error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "담당자 등록 실패" },
      { status: 500 }
    );
  }
}

// PUT /api/erp/partners/contacts
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      partnerId,
      name,
      department,
      position,
      mobile,
      email,
      telephone,
      isPrimary,
      businessCardFrontUrl,
      businessCardBackUrl,
      memo,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "담당자 식별자(ID)가 필요합니다." },
        { status: 400 }
      );
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      if (isPrimary && partnerId) {
        await client.query(
          "UPDATE erp_partner_contacts SET is_primary = false WHERE partner_id = $1",
          [parseInt(partnerId)]
        );
      }

      const updateRes = await client.query(
        `
        UPDATE erp_partner_contacts
        SET 
          name = COALESCE($1, name),
          department = $2,
          position = $3,
          mobile = $4,
          email = $5,
          telephone = $6,
          is_primary = COALESCE($7, is_primary),
          business_card_front_url = COALESCE($8, business_card_front_url),
          business_card_back_url = COALESCE($9, business_card_back_url),
          memo = $10,
          updated_at = NOW()
        WHERE id = $11
        RETURNING *
        `,
        [
          name ? name.trim() : null,
          department || null,
          position || null,
          mobile || null,
          email || null,
          telephone || null,
          isPrimary,
          businessCardFrontUrl,
          businessCardBackUrl,
          memo || null,
          parseInt(id),
        ]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "담당자 정보가 수정되었습니다.",
        contact: updateRes.rows[0],
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("PUT /api/erp/partners/contacts error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "담당자 수정 실패" },
      { status: 500 }
    );
  }
}

// DELETE /api/erp/partners/contacts?id=...
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "삭제할 담당자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const pool = getErpPool();
    await pool.query("DELETE FROM erp_partner_contacts WHERE id = $1", [parseInt(id)]);

    return NextResponse.json({
      success: true,
      message: "담당자 및 명함 정보가 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("DELETE /api/erp/partners/contacts error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "담당자 삭제 실패" },
      { status: 500 }
    );
  }
}
