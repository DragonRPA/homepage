import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { 
  registIssuePopbill, 
  getPopbillPopUpURL, 
  getPopbillPrintURL, 
  getPopbillInfo,
  getPopbillPortalURL
} from "@/lib/popbillService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, invoiceId, mgtKey, corpNum } = body;

    const pool = getErpPool();

    // 0. Get Popbill Testbed Portal / Certificate Management URL
    if (action === "PORTAL_URL" || action === "CERT_URL") {
      try {
        const url = await getPopbillPortalURL(action === "CERT_URL" ? "CERT" : "LOGIN", corpNum);
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
          const invRes = await pool.query("SELECT supplier_corp_num FROM erp_tax_invoices WHERE invoice_no = $1", [mgtKey]);
          if (invRes.rows.length > 0 && invRes.rows[0].supplier_corp_num) {
            activeCorpNum = invRes.rows[0].supplier_corp_num;
          }
        }
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
          const invRes = await pool.query("SELECT supplier_corp_num FROM erp_tax_invoices WHERE invoice_no = $1", [mgtKey]);
          if (invRes.rows.length > 0 && invRes.rows[0].supplier_corp_num) {
            activeCorpNum = invRes.rows[0].supplier_corp_num;
          }
        }
        const info = await getPopbillInfo(mgtKey, activeCorpNum);
        if (info.ntsresult === "전송성공" || info.stateCode === 300) {
          await pool.query(
            "UPDATE erp_tax_invoices SET status = 'SENT_NTS', nts_confirm_no = $1 WHERE invoice_no = $2",
            [info.ntsconfirmNum || `NTS-${mgtKey}`, mgtKey]
          );
        }
        return NextResponse.json({ success: true, info });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
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
        const activeCorpNum = corpNum || inv.supplier_corp_num || "8068803266";
        const writeDateStr = inv.issue_date instanceof Date
          ? inv.issue_date.toISOString().split("T")[0]
          : String(inv.issue_date || "").slice(0, 10);

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
          customerBizNo: inv.business_no || "2950302683",
          customerCeoName: inv.ceo_name || "대표자",
          customerAddr: inv.customer_address || "",
          customerBizType: inv.customer_biz_type || "",
          customerBizClass: inv.customer_biz_class || "",
          customerEmail: inv.customer_email || inv.supplier_email || "",
          customerEmail2: inv.customer_email2 || "",
          itemName: inv.item_name,
          supplyAmount: parseFloat(inv.supply_amount),
          vatAmount: parseFloat(inv.vat_amount),
          totalAmount: parseFloat(inv.total_amount),
          memo: inv.memo || "",
          taxItems: Array.isArray(inv.tax_items) ? inv.tax_items : [],
        });

        // Update DB
        const ntsConfirm = popResult.ntsConfirmNo || `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-41000000-POPBILL`;
        await pool.query(
          "UPDATE erp_tax_invoices SET status = 'SENT_NTS', nts_confirm_no = $1 WHERE id = $2",
          [ntsConfirm, invoiceId]
        );

        const popupUrl = await getPopbillPopUpURL(inv.invoice_no, activeCorpNum);

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
          suggestion: "팝빌 테스트 환경(test.popbill.com) 연동회원 사업자번호를 확인해 주십시오.",
        }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "지원하지 않는 액션입니다." }, { status: 400 });
  } catch (error: any) {
    console.error("Popbill Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
