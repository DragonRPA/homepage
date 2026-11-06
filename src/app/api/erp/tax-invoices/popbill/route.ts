export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { 
  registIssuePopbill, 
  getPopbillPopUpURL, 
  getPopbillPrintURL, 
  getPopbillInfo,
  getPopbillPortalURL,
  getPopbillCertInfo,
  getPopbillLiveStatus,
  sendToNTSPopbill,
  sendPopbillEmail,
  resolvePopbillCorpNum
} from "@/lib/popbillService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, invoiceId, mgtKey, corpNum, entityType } = body;
    const requestedCorpNum = resolvePopbillCorpNum(corpNum, entityType);

    const pool = getErpPool();

    // 0-B. Get Popbill Live Production Status (Environment, Partner Balance, Cert Status)
    if (action === "LIVE_STATUS") {
      const liveStatus = await getPopbillLiveStatus(requestedCorpNum);
      return NextResponse.json({ success: true, ...liveStatus });
    }

    // 0-A. Get Popbill Registered Certificate Info
    if (action === "CERT_INFO") {
      const cert = await getPopbillCertInfo(requestedCorpNum);
      return NextResponse.json({ success: true, ...cert });
    }

    // 0. Get Popbill Portal / Certificate Management / Partner Point Charge URL
    if (action === "PORTAL_URL" || action === "CERT_URL" || action === "CHARGE_URL") {
      try {
        const toGo =
          action === "CERT_URL" ? "CERT" : action === "CHARGE_URL" ? "CHRG" : "LOGIN";
        const url = await getPopbillPortalURL(toGo, requestedCorpNum);
        return NextResponse.json({ success: true, url });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    }

    // 1. Get Popbill View / Print URL
    if (action === "VIEW_URL" || action === "PRINT_URL") {
      if (!mgtKey) {
        return NextResponse.json({ error: "세금계산서 관리번호가 필요합니다." }, { status: 400 });
      }
      try {
        let activeCorpNum = corpNum;
        if (!activeCorpNum) {
          const invRes = await pool.query(
            "SELECT supplier_corp_num, supplier_entity_type FROM erp_tax_invoices WHERE invoice_no = $1",
            [mgtKey]
          );
          if (invRes.rows.length > 0) {
            activeCorpNum = resolvePopbillCorpNum(
              invRes.rows[0].supplier_corp_num,
              invRes.rows[0].supplier_entity_type
            );
          }
        }
        activeCorpNum = resolvePopbillCorpNum(activeCorpNum, entityType);
        const url = action === "VIEW_URL" 
          ? await getPopbillPopUpURL(mgtKey, activeCorpNum)
          : await getPopbillPrintURL(mgtKey, activeCorpNum);
        return NextResponse.json({ success: true, url });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    }

    // 2. Synchronize Status from Popbill
    if (action === "SYNC_STATUS") {
      if (!mgtKey) {
        return NextResponse.json({ error: "세금계산서 관리번호가 필요합니다." }, { status: 400 });
      }
      try {
        let activeCorpNum = corpNum;
        if (!activeCorpNum) {
          const invRes = await pool.query(
            "SELECT supplier_corp_num, supplier_entity_type FROM erp_tax_invoices WHERE invoice_no = $1",
            [mgtKey]
          );
          if (invRes.rows.length > 0) {
            activeCorpNum = resolvePopbillCorpNum(
              invRes.rows[0].supplier_corp_num,
              invRes.rows[0].supplier_entity_type
            );
          }
        }
        activeCorpNum = resolvePopbillCorpNum(activeCorpNum, entityType);
        const info = await getPopbillInfo(mgtKey, activeCorpNum);
        const realConfirmNo = info.ntsconfirmNum || info.ntsConfirmNum;
        const nextStatus =
          info.ntsresult === "전송성공" || Number(info.stateCode) >= 301
            ? "SENT_NTS"
            : Number(info.stateCode) === 300
              ? "ISSUED"
              : "TEMP_SAVED";
        await pool.query(
          "UPDATE erp_tax_invoices SET status = $1, nts_confirm_no = COALESCE($2, nts_confirm_no) WHERE invoice_no = $3",
          [nextStatus, realConfirmNo || null, mgtKey]
        );
        return NextResponse.json({ success: true, info, status: nextStatus });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    }

    // 2-B. Send Issued Invoice Immediately to NTS (발행후 전송전 상태 -> 국세청 즉시전송)
    if (action === "SEND_TO_NTS") {
      const mgtKeys: string[] = Array.isArray(body.mgtKeys)
        ? body.mgtKeys
        : mgtKey
          ? [mgtKey]
          : [];
      if (mgtKeys.length === 0) {
        return NextResponse.json({ error: "국세청 즉시전송할 세금계산서 관리번호가 필요합니다." }, { status: 400 });
      }

      const results: any[] = [];
      const errors: string[] = [];

      for (const key of mgtKeys) {
        try {
          let activeCorpNum = corpNum;
          if (!activeCorpNum) {
            const invRes = await pool.query(
              "SELECT supplier_corp_num, supplier_entity_type FROM erp_tax_invoices WHERE invoice_no = $1",
              [key]
            );
            if (invRes.rows.length > 0) {
              activeCorpNum = resolvePopbillCorpNum(
                invRes.rows[0].supplier_corp_num,
                invRes.rows[0].supplier_entity_type
              );
            }
          }
          activeCorpNum = resolvePopbillCorpNum(activeCorpNum, entityType);
          const ntsRes = await sendToNTSPopbill(key, activeCorpNum);
          await pool.query(
            "UPDATE erp_tax_invoices SET status = 'SENT_NTS', nts_confirm_no = COALESCE($1, nts_confirm_no) WHERE invoice_no = $2",
            [ntsRes.ntsConfirmNo || null, key]
          );
          results.push({ mgtKey: key, ...ntsRes });
        } catch (err: any) {
          errors.push(`[${key}] ${err.message}`);
        }
      }

      if (results.length === 0 && errors.length > 0) {
        return NextResponse.json({ error: errors.join("\n") }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        sentCount: results.length,
        errorCount: errors.length,
        results,
        errors,
        message:
          mgtKeys.length === 1
            ? `[${mgtKeys[0]}] 국세청 즉시전송 요청 완료`
            : `총 ${results.length}건 국세청 즉시전송 완료${errors.length > 0 ? ` (${errors.length}건 오류)` : ""}`,
      });
    }

    // 2-C. Resend Popbill Tax Invoice Notification Email (SEND_EMAIL)
    if (action === "SEND_EMAIL") {
      if (!mgtKey) {
        return NextResponse.json({ error: "세금계산서 관리번호가 필요합니다." }, { status: 400 });
      }
      const invRes = await pool.query("SELECT * FROM erp_tax_invoices WHERE invoice_no = $1 LIMIT 1", [mgtKey]);
      const inv = invRes.rows[0];
      const activeCorpNum = resolvePopbillCorpNum(
        corpNum || inv?.supplier_corp_num,
        entityType || inv?.supplier_entity_type
      );
      let targetEmail = (body.receiverEmail || inv?.customer_email || "").trim();
      if (!targetEmail && inv) {
        const pRes = await pool.query(
          `SELECT main_email FROM erp_partners WHERE business_no = $1 OR name = $2 ORDER BY (CASE WHEN main_email IS NOT NULL AND main_email <> '' THEN 0 ELSE 1 END) LIMIT 1`,
          [inv.business_no || "", inv.customer_name || ""]
        );
        targetEmail = pRes.rows[0]?.main_email || "";
      }
      if (!targetEmail) {
        return NextResponse.json({ error: "해당 고객사에 등록된 세금계산서 수신 이메일이 없습니다. 고객 상세에서 이메일을 먼저 등록해 주세요." }, { status: 400 });
      }
      const emailRes = await sendPopbillEmail(mgtKey, targetEmail, activeCorpNum);
      if (inv && inv.customer_email !== targetEmail) {
        await pool.query("UPDATE erp_tax_invoices SET customer_email = $1 WHERE id = $2", [targetEmail, inv.id]);
      }
      return NextResponse.json({
        success: true,
        receiverEmail: targetEmail,
        message: emailRes.message,
      });
    }

    // 3. Issue / Register via Popbill
    if (action === "ISSUE_POPBILL") {
      if (!invoiceId) {
        return NextResponse.json({ error: "세금계산서 ID가 누락되었습니다." }, { status: 400 });
      }

      // Fetch invoice from DB
      const res = await pool.query("SELECT * FROM erp_tax_invoices WHERE id = $1", [invoiceId]);
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "세금계산서를 찾을 수 없습니다." }, { status: 404 });
      }
      const inv = res.rows[0];

      try {
        const activeCorpNum = resolvePopbillCorpNum(
          corpNum || inv.supplier_corp_num,
          entityType || inv.supplier_entity_type
        );
        const writeDateStr = inv.issue_date instanceof Date
          ? inv.issue_date.toISOString().split("T")[0]
          : String(inv.issue_date || "").slice(0, 10);

        let resolvedEmail1 = (inv.customer_email || "").trim();
        let resolvedEmail2 = (inv.customer_email2 || "").trim();
        if (!resolvedEmail1) {
          const pRes = await pool.query(
            `SELECT main_email, sub_email FROM erp_partners
             WHERE business_no = $1 OR name = $2
             ORDER BY (CASE WHEN main_email IS NOT NULL AND main_email <> '' THEN 0 ELSE 1 END)
             LIMIT 1`,
            [inv.business_no || "", inv.customer_name || ""]
          );
          if (pRes.rows.length > 0) {
            resolvedEmail1 = pRes.rows[0].main_email || "";
            resolvedEmail2 = resolvedEmail2 || pRes.rows[0].sub_email || "";
          }
        }

        const popResult = await registIssuePopbill({
          corpNum: activeCorpNum,
          supplierCorpName: inv.supplier_corp_name,
          supplierCeoName: inv.supplier_ceo_name,
          supplierAddr: inv.supplier_address,
          supplierBizType: inv.supplier_biz_type,
          supplierBizClass: inv.supplier_biz_class,
          supplierEmail: inv.supplier_email,
          invoicerMgtKey: inv.invoice_no,
          writeDate: writeDateStr,
          purposeType: inv.purpose_type || "청구",
          customerName: inv.customer_name,
          customerBizNo: inv.business_no || "",
          customerCeoName: inv.ceo_name || "대표자",
          customerAddr: inv.customer_address || "",
          customerBizType: inv.customer_biz_type || "",
          customerBizClass: inv.customer_biz_class || "",
          customerEmail: resolvedEmail1,
          customerEmail2: resolvedEmail2,
          itemName: inv.item_name,
          supplyAmount: parseFloat(inv.supply_amount),
          vatAmount: parseFloat(inv.vat_amount),
          totalAmount: parseFloat(inv.total_amount),
          memo: inv.memo || "",
          taxItems: Array.isArray(inv.tax_items) ? inv.tax_items : [],
        });

        // Update DB with real NTS confirmation number only (null if TEMP_SAVED)
        const ntsConfirm = popResult.ntsConfirmNo || null;
        const nextStatus = popResult.mode === "REGISTERED_IN_POPBILL" ? "TEMP_SAVED" : "ISSUED";
        await pool.query(
          "UPDATE erp_tax_invoices SET status = $1, nts_confirm_no = COALESCE($2, nts_confirm_no), customer_email = COALESCE(NULLIF(customer_email, ''), $3), customer_email2 = COALESCE(NULLIF(customer_email2, ''), $4) WHERE id = $5",
          [nextStatus, ntsConfirm, resolvedEmail1, resolvedEmail2, invoiceId]
        );

        let popupUrl = "";
        try {
          popupUrl = await getPopbillPopUpURL(inv.invoice_no, activeCorpNum);
        } catch {
          popupUrl = `/api/erp/tax-invoices/viewer?invoiceNo=${encodeURIComponent(inv.invoice_no)}`;
        }

        return NextResponse.json({
          success: true,
          message:
            popResult.message ||
            `[${inv.supplier_corp_name || "드래곤알피에이"}] 팝빌 전자세금계산서 [${inv.invoice_no}] 전송/등록 완료`,
          popResult,
          popupUrl,
        });
      } catch (popErr: any) {
        return NextResponse.json({
          error: popErr.message,
          suggestion: "팝빌 연동 사업자번호, 공동인증서 등록 여부 및 거래처 사업자번호(10자리)를 확인해 주십시오.",
        }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "지원하지 않는 액션입니다." }, { status: 400 });
  } catch (error: any) {
    console.error("Popbill Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
