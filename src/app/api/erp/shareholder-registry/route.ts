export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { runSchemaInitOnce } from "@/lib/erpSchemaCache";
import { decryptPii, encryptPii, maskResidentRegNo } from "@/lib/piiCrypto";
import {
  getClientIpFromRequest,
  getErpSessionFromRequest,
  logSecurityAuditEvent,
} from "@/lib/erpSecurityAudit";

export interface ShareholderRecord {
  id: string;
  name: string;
  residentNo: string;
  zipCode: string;
  address: string;
  phone: string;
  shares: string;
  parValue: string;
  totalAmount: string;
  shareRatio: string;
  relationship: string;
  note: string;
}

async function ensureShareholderRegistrySchema() {
  return runSchemaInitOnce("erp_shareholder_registry_v1", async () => {
    const pool = getErpPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_shareholder_registry (
        id SERIAL PRIMARY KEY,
        entity_code VARCHAR(30) UNIQUE NOT NULL DEFAULT 'CORP_MAIN',
        base_date VARCHAR(60) NOT NULL DEFAULT '',
        company_name VARCHAR(150) NOT NULL DEFAULT '주식회사 드래곤알피에이',
        total_rows INTEGER NOT NULL DEFAULT 8,
        shareholders_encrypted TEXT NOT NULL,
        updated_by VARCHAR(100) DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  });
}

export async function GET(request: Request) {
  try {
    const session = await getErpSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "인증 세션이 필요합니다." }, { status: 401 });
    }

    await ensureShareholderRegistrySchema();
    const pool = getErpPool();
    const { searchParams } = new URL(request.url);
    const entityCode = (searchParams.get("entityCode") || "CORP_MAIN").trim().slice(0, 30);

    const res = await pool.query(
      `SELECT entity_code AS "entityCode",
              base_date AS "baseDate",
              company_name AS "companyName",
              total_rows AS "totalRows",
              shareholders_encrypted AS "shareholdersEncrypted",
              updated_by AS "updatedBy",
              updated_at AS "updatedAt"
       FROM erp_shareholder_registry
       WHERE entity_code = $1
       LIMIT 1`,
      [entityCode]
    );

    await logSecurityAuditEvent({
      eventType: "SHAREHOLDER_PII_ACCESS",
      actorId: session.uid,
      actorLoginId: session.loginId,
      actorName: session.name,
      targetResource: `/api/erp/shareholder-registry:${entityCode}`,
      ipAddress: getClientIpFromRequest(request),
      userAgent: request.headers.get("user-agent") || "",
    });

    const row = res.rows[0];
    if (!row) {
      return NextResponse.json({
        success: true,
        baseDate: "2026년 09월 13일 현재",
        companyName: "주식회사 드래곤알피에이",
        totalRows: 8,
        shareholders: [],
        updatedAt: null,
      });
    }

    let shareholders: ShareholderRecord[] = [];
    if (row.shareholdersEncrypted) {
      try {
        const plainJson = decryptPii(String(row.shareholdersEncrypted));
        const parsed = plainJson ? JSON.parse(plainJson) : [];
        if (Array.isArray(parsed)) {
          shareholders = parsed.map((sh: any, idx: number) => ({
            id: String(sh.id || idx + 1),
            name: String(sh.name || ""),
            residentNo: String(sh.residentNo || ""),
            maskedResidentNo: maskResidentRegNo(String(sh.residentNo || "")),
            zipCode: String(sh.zipCode || ""),
            address: String(sh.address || ""),
            phone: String(sh.phone || ""),
            shares: String(sh.shares || ""),
            parValue: String(sh.parValue || "500원"),
            totalAmount: String(sh.totalAmount || ""),
            shareRatio: String(sh.shareRatio || ""),
            relationship: String(sh.relationship || ""),
            note: String(sh.note || ""),
          })) as any;
        }
      } catch (e) {
        console.error("[shareholder-registry] JSON 복호화 파싱 오류:", e);
      }
    }

    return NextResponse.json({
      success: true,
      baseDate: row.baseDate || "2026년 09월 13일 현재",
      companyName: row.companyName || "주식회사 드래곤알피에이",
      totalRows: Number(row.totalRows || 8),
      shareholders,
      updatedBy: row.updatedBy || "",
      updatedAt: row.updatedAt || null,
    });
  } catch (error: any) {
    console.error("GET /api/erp/shareholder-registry Error:", error);
    return NextResponse.json(
      { success: false, error: "주주명부 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getErpSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "인증 세션이 필요합니다." }, { status: 401 });
    }

    await ensureShareholderRegistrySchema();
    const body = await request.json();
    const entityCode = String(body.entityCode || "CORP_MAIN").trim().slice(0, 30);
    const baseDate = String(body.baseDate || "").trim().slice(0, 60);
    const companyName = String(body.companyName || "주식회사 드래곤알피에이").trim().slice(0, 150);
    const totalRows = Math.min(30, Math.max(1, Number(body.totalRows) || 8));
    const rawList = Array.isArray(body.shareholders) ? body.shareholders : [];

    const sanitizedList: ShareholderRecord[] = rawList.map((sh: any, idx: number) => ({
      id: String(sh?.id || idx + 1),
      name: String(sh?.name || "").trim(),
      residentNo: String(sh?.residentNo || "").trim(),
      zipCode: String(sh?.zipCode || "").trim(),
      address: String(sh?.address || "").trim(),
      phone: String(sh?.phone || "").trim(),
      shares: String(sh?.shares || "").trim(),
      parValue: String(sh?.parValue || "500원").trim(),
      totalAmount: String(sh?.totalAmount || "").trim(),
      shareRatio: String(sh?.shareRatio || "").trim(),
      relationship: String(sh?.relationship || "").trim(),
      note: String(sh?.note || "").trim(),
    }));

    const encryptedPayload = encryptPii(JSON.stringify(sanitizedList)) || "";
    const pool = getErpPool();

    await pool.query(
      `INSERT INTO erp_shareholder_registry (
         entity_code, base_date, company_name, total_rows, shareholders_encrypted, updated_by, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (entity_code) DO UPDATE SET
         base_date = EXCLUDED.base_date,
         company_name = EXCLUDED.company_name,
         total_rows = EXCLUDED.total_rows,
         shareholders_encrypted = EXCLUDED.shareholders_encrypted,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()`,
      [entityCode, baseDate, companyName, totalRows, encryptedPayload, session.name || session.loginId]
    );

    await logSecurityAuditEvent({
      eventType: "SHAREHOLDER_PII_WRITE",
      actorId: session.uid,
      actorLoginId: session.loginId,
      actorName: session.name,
      targetResource: `/api/erp/shareholder-registry:${entityCode}`,
      ipAddress: getClientIpFromRequest(request),
      userAgent: request.headers.get("user-agent") || "",
      detail: { count: sanitizedList.length },
    });

    return NextResponse.json({
      success: true,
      message: "주주명부가 암호화 저장되었습니다.",
    });
  } catch (error: any) {
    console.error("POST /api/erp/shareholder-registry Error:", error);
    return NextResponse.json(
      { success: false, error: "주주명부 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
