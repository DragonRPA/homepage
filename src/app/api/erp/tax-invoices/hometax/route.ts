import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { getEntity } from "@/lib/businessEntities";
import {
  parseXlsxBufferToRows,
  decodeTextBuffer,
  parseCsvOrTsvTextToRows,
} from "@/lib/ibkBankParser";
import {
  collectHometaxTaxInvoices,
  getHometaxCertPopUpURL,
  getHometaxFlatRatePopUpURL,
  HometaxCollectedInvoice,
} from "@/lib/popbillService";

function formatBizNoDash(raw?: string): string {
  const digits = String(raw || "").replace(/[^0-9]/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`;
  }
  return raw || "";
}

function parseExcelDate(raw: any): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  if (typeof raw === "number") {
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  const digits = s.replace(/[^0-9]/g, "");
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(raw: any): number {
  if (typeof raw === "number") return Math.round(raw);
  const cleaned = String(raw || "").replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n);
}

// Parse Hometax Excel (.xls / .xlsx / .csv) buffer into HometaxCollectedInvoice[]
function parseHometaxExcelBuffer(buffer: Buffer, defaultIoType: "SALE" | "PURCHASE", ourBizNumRaw: string): HometaxCollectedInvoice[] {
  const results: HometaxCollectedInvoice[] = [];
  let rows: string[][] = [];

  // Detect ZIP/XLSX signature (PK\x03\x04) vs HTML/CSV/TSV text
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    rows = parseXlsxBufferToRows(buffer);
  } else {
    const text = decodeTextBuffer(buffer);
    rows = parseCsvOrTsvTextToRows(text);
  }

  if (rows.length >= 2) {
    // Locate header row (contains 승인번호 or 공급자 or 작성일자)
    let headerIdx = -1;
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const joined = rows[i].map((c) => String(c || "").replace(/\s+/g, "")).join("|");
      if (
        (joined.includes("승인번호") || joined.includes("작성일자")) &&
        (joined.includes("공급가액") || joined.includes("합계금액") || joined.includes("상호"))
      ) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) headerIdx = 0;

    const headers = rows[headerIdx].map((h) => String(h || "").replace(/\s+/g, ""));
    const findCol = (keywords: string[], startAfter = -1): number => {
      for (let c = startAfter + 1; c < headers.length; c++) {
        const h = headers[c];
        if (keywords.some((kw) => h.includes(kw))) return c;
      }
      return -1;
    };

    const colWriteDate = findCol(["작성일자", "발행일자", "일자"]);
    const colIssueDate = findCol(["발급일자", "발행일자"]);
    const colNtsNo = findCol(["승인번호", "국세청승인번호"]);
    const colSupplierBizNo = findCol(["공급자사업자등록번호", "공급자등록번호", "등록번호"]);
    const colSupplierName = findCol(["공급자상호", "상호"], colSupplierBizNo >= 0 ? colSupplierBizNo : -1);
    const colSupplierCeo = findCol(["공급자성명", "대표자명", "성명"], colSupplierName >= 0 ? colSupplierName : -1);
    const colBuyerBizNo = findCol(["공급받는자사업자등록번호", "공급받는자등록번호", "등록번호"], colSupplierBizNo >= 0 ? colSupplierBizNo : -1);
    const colBuyerName = findCol(["공급받는자상호", "거래처명", "상호"], colBuyerBizNo >= 0 ? colBuyerBizNo : colSupplierName);
    const colBuyerCeo = findCol(["공급받는자성명", "대표자명", "성명"], colBuyerName >= 0 ? colBuyerName : colSupplierCeo);
    const colTotal = findCol(["합계금액", "총금액", "합계"]);
    const colSupply = findCol(["공급가액"]);
    const colVat = findCol(["세액", "부가세"]);
    const colItem = findCol(["품목명", "품목", "적요"]);
    const colPurpose = findCol(["영수/청구", "영수청구", "구분"]);
    const colRemark = findCol(["비고"]);

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const ntsNo = colNtsNo >= 0 ? String(row[colNtsNo] || "").trim() : "";
      const supply = colSupply >= 0 ? parseAmount(row[colSupply]) : 0;
      const vat = colVat >= 0 ? parseAmount(row[colVat]) : Math.round(supply * 0.1);
      const total = colTotal >= 0 ? parseAmount(row[colTotal]) : supply + vat;
      if (supply === 0 && total === 0) continue;

      const finalSupply = supply > 0 ? supply : Math.round(total / 1.1);
      const finalVat = vat > 0 ? vat : total - finalSupply;
      const finalTotal = total > 0 ? total : finalSupply + finalVat;

      const writeDate = colWriteDate >= 0 ? parseExcelDate(row[colWriteDate]) : new Date().toISOString().slice(0, 10);
      const issueDate = colIssueDate >= 0 ? parseExcelDate(row[colIssueDate]) : writeDate;

      const supBizNo = colSupplierBizNo >= 0 ? String(row[colSupplierBizNo] || "").replace(/[^0-9]/g, "") : "";
      const supName = colSupplierName >= 0 ? String(row[colSupplierName] || "").trim() : "";
      const supCeo = colSupplierCeo >= 0 ? String(row[colSupplierCeo] || "").trim() : "";

      const buyBizNo = colBuyerBizNo >= 0 ? String(row[colBuyerBizNo] || "").replace(/[^0-9]/g, "") : "";
      const buyName = colBuyerName >= 0 ? String(row[colBuyerName] || "").trim() : "";
      const buyCeo = colBuyerCeo >= 0 ? String(row[colBuyerCeo] || "").trim() : "";

      let rowIoType: "SALE" | "PURCHASE" = defaultIoType;
      if (supBizNo && supBizNo === ourBizNumRaw) {
        rowIoType = "SALE";
      } else if (buyBizNo && buyBizNo === ourBizNumRaw) {
        rowIoType = "PURCHASE";
      }

      results.push({
        ioType: rowIoType,
        ntsConfirmNo: ntsNo || `HTX-${writeDate.replace(/-/g, "")}-${r}`,
        writeDate,
        issueDate,
        invoicerCorpNum: supBizNo,
        invoicerCorpName: supName,
        invoicerCEOName: supCeo,
        invoiceeCorpNum: buyBizNo,
        invoiceeCorpName: buyName,
        invoiceeCEOName: buyCeo,
        supplyCostTotal: finalSupply,
        taxTotal: finalVat,
        totalAmount: finalTotal,
        purposeType: colPurpose >= 0 && String(row[colPurpose]).includes("영수") ? "영수" : "청구",
        itemName: (colItem >= 0 ? String(row[colItem] || "").trim() : "") || (rowIoType === "PURCHASE" ? "매입 품목" : "매출 품목"),
        remark1: colRemark >= 0 ? String(row[colRemark] || "").trim() : "",
        sourceChannel: "HOMETAX_SCRAPING",
      });
    }
  }

  return results;
}

// Upsert collected invoices into erp_tax_invoices without duplicates
async function saveCollectedInvoicesToDb(
  items: HometaxCollectedInvoice[],
  entityKey: "CORP" | "INDIVIDUAL",
  sourceType: "HOMETAX_SYNC" | "EXCEL_UPLOAD"
) {
  const pool = getErpPool();
  const client = await pool.connect();
  const entity = getEntity(entityKey);

  let insertedCount = 0;
  let skippedCount = 0;
  const savedRows: any[] = [];

  try {
    await client.query("BEGIN");

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const ioType = item.ioType;
      const ntsNo = (item.ntsConfirmNo || "").trim();

      // Counterparty depends on SALE vs PURCHASE:
      // - For SALE: counterparty is invoicee (공급받는자)
      // - For PURCHASE: counterparty is invoicer (공급자 = 매입처)
      const counterpartyName = ioType === "PURCHASE"
        ? (item.invoicerCorpName || item.invoiceeCorpName || "매입거래처")
        : (item.invoiceeCorpName || item.invoicerCorpName || "매출거래처");
      const counterpartyBizNo = formatBizNoDash(
        ioType === "PURCHASE"
          ? (item.invoicerCorpNum || item.invoiceeCorpNum)
          : (item.invoiceeCorpNum || item.invoicerCorpNum)
      );
      const counterpartyCeo = ioType === "PURCHASE"
        ? (item.invoicerCEOName || item.invoiceeCEOName || "")
        : (item.invoiceeCEOName || item.invoicerCEOName || "");
      const counterpartyEmail = ioType === "PURCHASE"
        ? (item.invoicerEmail || "")
        : (item.invoiceeEmail1 || "");

      // Check duplicate by nts_confirm_no OR (io_type + issue_date + customer_name + total_amount)
      let dupRes;
      if (ntsNo && !ntsNo.includes("POPBILL_TEST")) {
        dupRes = await client.query(
          "SELECT id FROM erp_tax_invoices WHERE nts_confirm_no = $1 LIMIT 1",
          [ntsNo]
        );
      }
      if (!dupRes || dupRes.rows.length === 0) {
        dupRes = await client.query(
          `SELECT id FROM erp_tax_invoices
           WHERE COALESCE(io_type, 'SALE') = $1
             AND issue_date = $2::date
             AND customer_name = $3
             AND ABS(COALESCE(total_amount, 0) - $4) <= 1
           LIMIT 1`,
          [ioType, item.writeDate, counterpartyName, item.totalAmount]
        );
      }

      if (dupRes.rows.length > 0) {
        skippedCount++;
        continue;
      }

      const prefix = ioType === "PURCHASE" ? "PX" : "TX";
      const dateCompact = item.writeDate.slice(2, 10).replace(/-/g, "");
      const invoiceNo = item.mgtKey || `${prefix}${dateCompact}-${Math.floor(1000 + Math.random() * 9000)}`;
      const mm = item.writeDate.slice(5, 7);
      const dd = item.writeDate.slice(8, 10);

      const taxItemsJson = [
        {
          month: mm,
          day: dd,
          itemName: item.itemName || (ioType === "PURCHASE" ? "매입 세금계산서" : "매출 세금계산서"),
          spec: "",
          qty: 1,
          unitPrice: item.supplyCostTotal,
          supplyAmount: item.supplyCostTotal,
          vatAmount: item.taxTotal,
          remark: item.remark1 || "",
        },
      ];

      const ins = await client.query(
        `INSERT INTO erp_tax_invoices
         (invoice_no, io_type, source_type, domain_type, supplier_entity_type, supplier_corp_num, supplier_corp_name,
          supplier_ceo_name, supplier_address, supplier_biz_type, supplier_biz_class, supplier_email,
          customer_name, business_no, ceo_name, customer_email, purpose_type, modify_reason, tax_items,
          issue_date, supply_amount, vat_amount, total_amount, item_name,
          status, nts_confirm_no, memo, settled_amount, settlement_status, matched_bank_tx_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, '해당없음', $18::jsonb,
                 $19, $20, $21, $22, $23, 'SENT_NTS', $24, $25, 0, 'UNPAID', '[]'::jsonb)
         RETURNING *`,
        [
          invoiceNo,
          ioType,
          sourceType,
          ioType === "PURCHASE" ? "PURCHASE_EXPENSE" : "TRADE_SALE",
          entity.key,
          ioType === "PURCHASE" ? (item.invoicerCorpNum || entity.bizNumRaw) : entity.bizNumRaw,
          ioType === "PURCHASE" ? (item.invoicerCorpName || counterpartyName) : entity.corpName,
          ioType === "PURCHASE" ? (item.invoicerCEOName || counterpartyCeo) : entity.ceoName,
          entity.address,
          entity.bizType,
          entity.bizClass,
          entity.email,
          counterpartyName,
          counterpartyBizNo || "100-00-00000",
          counterpartyCeo || "대표자",
          counterpartyEmail,
          item.purposeType || "청구",
          JSON.stringify(taxItemsJson),
          item.writeDate,
          item.supplyCostTotal,
          item.taxTotal,
          item.totalAmount,
          item.itemName || (ioType === "PURCHASE" ? "매입 세금계산서" : "매출 세금계산서"),
          ntsNo || null,
          item.remark1 || "",
        ]
      );
      insertedCount++;
      savedRows.push(ins.rows[0]);
    }

    await client.query("COMMIT");
    return { insertedCount, skippedCount, savedRows };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // 1. Multipart Form-Data: Hometax Excel (.xls/.xlsx/.csv) Upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const ioType = (String(formData.get("ioType") || "PURCHASE") === "SALE" ? "SALE" : "PURCHASE") as "SALE" | "PURCHASE";
      const entityKey = (String(formData.get("entityType") || "CORP") === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP") as "CORP" | "INDIVIDUAL";

      if (!file) {
        return NextResponse.json({ error: "업로드할 홈택스 엑셀 파일을 선택해 주십시오." }, { status: 400 });
      }

      const entity = getEntity(entityKey);
      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const parsedItems = parseHometaxExcelBuffer(buffer, ioType, entity.bizNumRaw);

      if (parsedItems.length === 0) {
        return NextResponse.json(
          { error: "엑셀 파일에서 세금계산서 내역을 찾을 수 없습니다. 홈택스 조회 엑셀 양식인지 확인해 주십시오." },
          { status: 400 }
        );
      }

      const { insertedCount, skippedCount } = await saveCollectedInvoicesToDb(parsedItems, entityKey, "EXCEL_UPLOAD");

      return NextResponse.json({
        success: true,
        parsedCount: parsedItems.length,
        insertedCount,
        skippedCount,
        message: `홈택스 엑셀에서 총 ${parsedItems.length}건을 분석하여 신규 ${insertedCount}건 저장 완료 (중복 제외 ${skippedCount}건).`,
      });
    }

    // 2. JSON Body: Popbill Hometax Auto-Collection / Cert Popup URL
    const body = await request.json();
    const { action, entityType, startDate, endDate, syncTarget } = body;
    const entityKey: "CORP" | "INDIVIDUAL" = entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
    const entity = getEntity(entityKey);

    if (action === "CERT_POPUP_URL") {
      const url = await getHometaxCertPopUpURL(entity.bizNumRaw);
      return NextResponse.json({ success: true, url });
    }

    if (action === "FLATRATE_POPUP_URL") {
      const url = await getHometaxFlatRatePopUpURL(entity.bizNumRaw);
      return NextResponse.json({ success: true, url });
    }

    if (action === "SYNC_HOMETAX") {
      const sDate = startDate || new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);
      const eDate = endDate || new Date().toISOString().slice(0, 10);
      const targets: Array<"SELL" | "BUY"> =
        syncTarget === "SELL" ? ["SELL"] : syncTarget === "BUY" ? ["BUY"] : ["SELL", "BUY"];

      const allCollected: HometaxCollectedInvoice[] = [];
      const warnings: string[] = [];

      for (const qType of targets) {
        const res = await collectHometaxTaxInvoices({
          corpNum: entity.bizNumRaw,
          queryType: qType,
          dateType: "W",
          startDate: sDate,
          endDate: eDate,
        });
        allCollected.push(...res.items);
        if (res.htWarning) warnings.push(`[${qType === "SELL" ? "매출" : "매입"}] ${res.htWarning}`);
      }

      const { insertedCount, skippedCount } = await saveCollectedInvoicesToDb(
        allCollected,
        entityKey,
        "HOMETAX_SYNC"
      );

      return NextResponse.json({
        success: true,
        collectedCount: allCollected.length,
        insertedCount,
        skippedCount,
        warnings,
        message:
          allCollected.length > 0
            ? `홈택스/팝빌 자동 수집 완료: 조회 ${allCollected.length}건 중 신규 ${insertedCount}건 DB 반영 (기존 중복 ${skippedCount}건 제외)`
            : warnings.length > 0
              ? `홈택스 수집 안내: ${warnings.join(" / ")} (홈택스 엑셀 업로드 또는 인증서 등록 후 이용 가능)`
              : "조회 기간 내 신규 수집할 홈택스 세금계산서가 없습니다.",
      });
    }

    return NextResponse.json({ error: "지원하지 않는 action입니다." }, { status: 400 });
  } catch (error: any) {
    console.error("Hometax API Error:", error);
    return NextResponse.json({ error: "홈택스 세금계산서 수집 오류: " + error.message }, { status: 500 });
  }
}
