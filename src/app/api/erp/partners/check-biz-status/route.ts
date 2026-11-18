export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { normalizeBizNoDigits } from "@/lib/partnerStatusClient";
import {
  ensurePartnerStatusSchema,
  queryNtsBizStatusBatch,
  queryNtsBizStatusSingle,
} from "@/lib/partnerStatusService";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // 1. 등록 전 사업자번호 단건 즉시 조회 모드
    if (
      body.businessNo &&
      !body.partnerId &&
      !Array.isArray(body.partnerIds) &&
      !body.scope
    ) {
      const result = await queryNtsBizStatusSingle(String(body.businessNo));
      return NextResponse.json({
        success: true,
        result,
      });
    }

    // 2. 등록 거래처 단건/일괄 휴·폐업 조회 및 거래불가 연동 모드
    const pool = getErpPool();
    await ensurePartnerStatusSchema(pool);

    const targetIds: number[] = Array.isArray(body.partnerIds)
      ? body.partnerIds.map((v: any) => parseInt(String(v), 10)).filter((n: number) => !Number.isNaN(n))
      : body.partnerId
      ? [parseInt(String(body.partnerId), 10)].filter((n) => !Number.isNaN(n))
      : [];

    const scope: string = String(body.scope || "CUSTOMER").toUpperCase();
    const autoBlock: boolean = body.autoBlock !== false;
    const autoUnblockActive: boolean = body.autoUnblockActive === true;
    const actorName: string = String(body.actorName || "ADMIN").trim() || "ADMIN";

    let selectSql = `
      SELECT id, partner_type AS "partnerType", partner_code AS "partnerCode",
             name, business_no AS "businessNo", status,
             nts_biz_state AS "ntsBizState", nts_tax_type AS "ntsTaxType",
             nts_closed_date AS "ntsClosedDate"
      FROM erp_partners
      WHERE 1=1
    `;
    const params: any[] = [];

    if (targetIds.length > 0) {
      params.push(targetIds);
      selectSql += ` AND id = ANY($${params.length}::int[])`;
    } else if (scope === "CUSTOMER") {
      selectSql += ` AND partner_type IN ('CUSTOMER', 'BOTH')`;
    } else if (scope === "VENDOR") {
      selectSql += ` AND partner_type IN ('VENDOR', 'BOTH')`;
    }
    selectSql += ` ORDER BY id ASC`;

    const targetsRes = await pool.query(selectSql, params);
    const targetRows = targetsRes.rows;

    if (targetRows.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          targetCount: 0,
          checkedCount: 0,
          activeCount: 0,
          suspendedCount: 0,
          closedCount: 0,
          unregisteredCount: 0,
          invalidBizNoCount: 0,
          errorCount: 0,
          newlyBlockedCount: 0,
          totalBlockedCount: 0,
        },
        results: [],
      });
    }

    const validBizNos = targetRows
      .map((r: any) => normalizeBizNoDigits(r.businessNo))
      .filter((d: string) => d.length === 10);

    const ntsMap = await queryNtsBizStatusBatch(validBizNos, 5);

    const client = await pool.connect();
    let checkedCount = 0;
    let activeCount = 0;
    let suspendedCount = 0;
    let closedCount = 0;
    let unregisteredCount = 0;
    let invalidBizNoCount = 0;
    let errorCount = 0;
    let newlyBlockedCount = 0;
    const results: any[] = [];
    const nowIso = new Date().toISOString();

    try {
      await client.query("BEGIN");

      for (const row of targetRows) {
        const digits = normalizeBizNoDigits(row.businessNo);
        if (digits.length !== 10) {
          invalidBizNoCount++;
          await client.query(
            `UPDATE erp_partners
             SET nts_status_msg = $1,
                 nts_checked_at = NOW(),
                 updated_at = NOW()
             WHERE id = $2`,
            ["사업자등록번호 미등록 또는 10자리 형식 오류", row.id]
          );
          results.push({
            partnerId: row.id,
            partnerName: row.name,
            partnerType: row.partnerType,
            businessNo: row.businessNo || "",
            prevStatus: row.status,
            nextStatus: row.status,
            newlyBlocked: false,
            validFormat: false,
            ntsBizState: row.ntsBizState || null,
            ntsTaxType: "번호미등록/형식오류",
            ntsClosedDate: row.ntsClosedDate || null,
            ntsStatusMsg: "사업자등록번호 미등록 또는 10자리 형식 오류",
            ntsCheckedAt: nowIso,
          });
          continue;
        }

        const ntsRes = ntsMap.get(digits);
        if (!ntsRes) {
          errorCount++;
          continue;
        }

        if (ntsRes.error === "FETCH_FAILED") {
          errorCount++;
          results.push({
            partnerId: row.id,
            partnerName: row.name,
            partnerType: row.partnerType,
            businessNo: ntsRes.businessNo,
            prevStatus: row.status,
            nextStatus: row.status,
            newlyBlocked: false,
            validFormat: true,
            ntsBizState: row.ntsBizState || null,
            ntsTaxType: "조회오류",
            ntsClosedDate: row.ntsClosedDate || null,
            ntsStatusMsg: ntsRes.ntsStatusMsg,
            ntsCheckedAt: nowIso,
          });
          continue;
        }

        checkedCount++;
        if (ntsRes.ntsBizState === "ACTIVE") activeCount++;
        else if (ntsRes.ntsBizState === "SUSPENDED") suspendedCount++;
        else if (ntsRes.ntsBizState === "CLOSED") closedCount++;
        else unregisteredCount++;

        let nextStatus = row.status;
        if (autoBlock && ntsRes.shouldBlockTrade) {
          nextStatus = "BLOCKED";
        } else if (autoUnblockActive && ntsRes.ntsBizState === "ACTIVE" && row.status === "BLOCKED") {
          nextStatus = "ACTIVE";
        }

        const newlyBlocked = row.status !== "BLOCKED" && nextStatus === "BLOCKED";
        if (newlyBlocked) newlyBlockedCount++;

        await client.query(
          `UPDATE erp_partners
           SET nts_biz_state = $1,
               nts_tax_type = $2,
               nts_closed_date = $3,
               nts_status_msg = $4,
               nts_checked_at = NOW(),
               status = $5,
               updated_at = NOW()
           WHERE id = $6`,
          [
            ntsRes.ntsBizState,
            ntsRes.ntsTaxType,
            ntsRes.ntsClosedDate,
            ntsRes.ntsStatusMsg,
            nextStatus,
            row.id,
          ]
        );

        results.push({
          partnerId: row.id,
          partnerName: row.name,
          partnerType: row.partnerType,
          businessNo: ntsRes.businessNo,
          prevStatus: row.status,
          nextStatus,
          newlyBlocked,
          validFormat: true,
          ntsBizState: ntsRes.ntsBizState,
          ntsTaxType: ntsRes.ntsTaxType,
          ntsClosedDate: ntsRes.ntsClosedDate,
          ntsStatusMsg: ntsRes.ntsStatusMsg,
          ntsCheckedAt: nowIso,
        });
      }

      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('PARTNER', 'NTS_BIZ_STATUS_CHECK', $1, $2, $3)`,
        [
          targetIds.length === 1 ? `PARTNER_${targetIds[0]}` : `BATCH_${scope}`,
          actorName,
          JSON.stringify({
            scope,
            targetCount: targetRows.length,
            checkedCount,
            activeCount,
            suspendedCount,
            closedCount,
            unregisteredCount,
            invalidBizNoCount,
            errorCount,
            newlyBlockedCount,
          }),
        ]
      );

      const blockedCntRes = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM erp_partners WHERE status = 'BLOCKED' OR nts_biz_state IN ('SUSPENDED', 'CLOSED')`
      );
      const totalBlockedCount = blockedCntRes.rows[0]?.cnt || 0;

      await client.query("COMMIT");

      // 휴업/폐업/미등록 이상 건을 상단에 우선 정렬
      const statePriority: Record<string, number> = {
        CLOSED: 0,
        SUSPENDED: 1,
        UNREGISTERED: 2,
        ACTIVE: 4,
      };
      results.sort((a, b) => {
        const pa = a.validFormat === false ? 3 : (statePriority[a.ntsBizState] ?? 3);
        const pb = b.validFormat === false ? 3 : (statePriority[b.ntsBizState] ?? 3);
        if (pa !== pb) return pa - pb;
        return String(a.partnerName || "").localeCompare(String(b.partnerName || ""), "ko");
      });

      return NextResponse.json({
        success: true,
        summary: {
          targetCount: targetRows.length,
          checkedCount,
          activeCount,
          suspendedCount,
          closedCount,
          unregisteredCount,
          invalidBizNoCount,
          errorCount,
          newlyBlockedCount,
          totalBlockedCount,
        },
        results,
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST /api/erp/partners/check-biz-status error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "국세청 휴·폐업 일괄 조회 실패" },
      { status: 500 }
    );
  }
}
