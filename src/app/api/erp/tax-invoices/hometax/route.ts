export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import * as XLSX from "xlsx";
import { getErpPool } from "@/lib/supabaseErp";
import { getEntity } from "@/lib/businessEntities";
import {
  parseXlsxBufferToRows,
  decodeTextBuffer,
  parseCsvOrTsvTextToRows,
} from "@/lib/ibkBankParser";
import { HometaxCollectedInvoice } from "@/lib/popbillService";

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
function parseHometaxExcelBuffer(
  buffer: Buffer,
  defaultIoType: "SALE" | "PURCHASE",
  ourBizNumRaw: string
): HometaxCollectedInvoice[] {
  const results: HometaxCollectedInvoice[] = [];
  let rows: string[][] = [];

  if (buffer.length >= 4 && buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
    // BIFF8 OLE2 .xls file (Hometax standard Excel export)
    const wb = XLSX.read(buffer, { type: "buffer" });
    for (const sName of wb.SheetNames) {
      const sheetRows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sName], { header: 1, defval: "" });
      rows.push(...sheetRows.map((r) => r.map((c) => String(c ?? ""))));
    }
  } else if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    rows = parseXlsxBufferToRows(buffer);
  } else {
    const text = decodeTextBuffer(buffer);
    rows = parseCsvOrTsvTextToRows(text);
  }

  if (rows.length >= 2) {
    let colWriteDate = 0;
    let colNtsNo = 1;
    let colIssueDate = 2;
    let colSupplierBizNo = 4;
    let colSupplierName = 6;
    let colSupplierCeo = 7;
    let colSupplierAddr = 8;
    let colBuyerBizNo = 9;
    let colBuyerName = 11;
    let colBuyerCeo = 12;
    let colBuyerAddr = 13;
    let colTotal = 14;
    let colSupply = 15;
    let colVat = 16;
    let colDocCategory = 17;
    let colModifyReason = 18;
    let colRemark = 20;
    let colPurpose = 21;
    let colSupplierEmail = 22;
    let colBuyerEmail1 = 23;
    let colBuyerEmail2 = 24;
    let colItemDate = 25;
    let colItem = 26;
    let colItemSpec = 27;
    let colItemQty = 28;
    let colItemUnitCost = 29;
    let colItemSupply = 30;
    let colItemVat = 31;
    let colItemRemark = 32;
    let currentSectionIoType: "SALE" | "PURCHASE" = defaultIoType;
    let hasSeenHeader = false;

    const applyHeaderMapping = (headerRow: string[]) => {
      const headers = headerRow.map((h) => String(h || "").replace(/\s+/g, ""));
      const findCol = (keywords: string[], startAfter = -1, excludeKeywords: string[] = []): number => {
        for (const kw of keywords) {
          for (let c = startAfter + 1; c < headers.length; c++) {
            if (headers[c] === kw) return c;
          }
        }
        for (let c = startAfter + 1; c < headers.length; c++) {
          const h = headers[c];
          if (excludeKeywords.some((ex) => h.includes(ex))) continue;
          if (keywords.some((kw) => h.includes(kw))) return c;
        }
        return -1;
      };

      const wIdx = findCol(["작성일자", "발행일자", "일자"], -1, ["품목일자", "발급일자", "전송일자"]);
      const iIdx = findCol(["발급일자", "발행일자"]);
      const nIdx = findCol(["승인번호", "국세청승인번호"]);
      const sBizIdx = findCol(["공급자사업자등록번호", "공급자등록번호", "등록번호"]);
      const sNameIdx = findCol(["공급자상호", "상호"], sBizIdx >= 0 ? sBizIdx : -1);
      const sCeoIdx = findCol(["공급자성명", "대표자명", "성명"], sNameIdx >= 0 ? sNameIdx : -1);
      const sAddrIdx = findCol(["공급자주소", "주소"], sCeoIdx >= 0 ? sCeoIdx : -1);
      const bBizIdx = findCol(
        ["공급받는자사업자등록번호", "공급받는자등록번호", "등록번호"],
        sBizIdx >= 0 ? sBizIdx : -1
      );
      const bNameIdx = findCol(["공급받는자상호", "거래처명", "상호"], bBizIdx >= 0 ? bBizIdx : sNameIdx);
      const bCeoIdx = findCol(["공급받는자성명", "대표자명", "성명"], bNameIdx >= 0 ? bNameIdx : sCeoIdx);
      const bAddrIdx = findCol(["공급받는자주소", "주소"], bCeoIdx >= 0 ? bCeoIdx : -1);
      const totIdx = findCol(["합계금액", "총금액", "합계"]);
      const supIdx = findCol(["공급가액"], -1, ["품목공급가액"]);
      const vatIdx = findCol(["세액", "부가세"], -1, ["품목세액"]);
      const catIdx = findCol(["전자세금계산서분류", "계산서분류"]);
      const modIdx = findCol(["수정사유", "전자세금계산서종류", "종류"]);
      const remIdx = findCol(["비고"], -1, ["품목비고"]);
      const purIdx = findCol(["영수/청구구분", "영수/청구", "영수청구", "구분"]);
      const sEmIdx = findCol(["공급자이메일"]);
      const bEm1Idx = findCol(["공급받는자이메일1", "이메일1"]);
      const bEm2Idx = findCol(["공급받는자이메일2", "이메일2"]);
      const itDateIdx = findCol(["품목일자"]);
      const itIdx = findCol(
        ["품목명", "품목", "적요"],
        -1,
        ["품목일자", "품목규격", "품목수량", "품목단가", "품목공급가액", "품목세액", "품목비고"]
      );
      const itSpecIdx = findCol(["품목규격", "규격"]);
      const itQtyIdx = findCol(["품목수량", "수량"]);
      const itUnitIdx = findCol(["품목단가", "단가"]);
      const itSupIdx = findCol(["품목공급가액"]);
      const itVatIdx = findCol(["품목세액"]);
      const itRemIdx = findCol(["품목비고"]);

      if (wIdx >= 0) colWriteDate = wIdx;
      if (iIdx >= 0) colIssueDate = iIdx;
      if (nIdx >= 0) colNtsNo = nIdx;
      if (sBizIdx >= 0) colSupplierBizNo = sBizIdx;
      if (sNameIdx >= 0) colSupplierName = sNameIdx;
      if (sCeoIdx >= 0) colSupplierCeo = sCeoIdx;
      if (sAddrIdx >= 0) colSupplierAddr = sAddrIdx;
      if (bBizIdx >= 0) colBuyerBizNo = bBizIdx;
      if (bNameIdx >= 0) colBuyerName = bNameIdx;
      if (bCeoIdx >= 0) colBuyerCeo = bCeoIdx;
      if (bAddrIdx >= 0) colBuyerAddr = bAddrIdx;
      if (totIdx >= 0) colTotal = totIdx;
      if (supIdx >= 0) colSupply = supIdx;
      if (vatIdx >= 0) colVat = vatIdx;
      if (catIdx >= 0) colDocCategory = catIdx;
      if (modIdx >= 0) colModifyReason = modIdx;
      if (remIdx >= 0) colRemark = remIdx;
      if (purIdx >= 0) colPurpose = purIdx;
      if (sEmIdx >= 0) colSupplierEmail = sEmIdx;
      if (bEm1Idx >= 0) colBuyerEmail1 = bEm1Idx;
      if (bEm2Idx >= 0) colBuyerEmail2 = bEm2Idx;
      if (itDateIdx >= 0) colItemDate = itDateIdx;
      if (itIdx >= 0) colItem = itIdx;
      if (itSpecIdx >= 0) colItemSpec = itSpecIdx;
      if (itQtyIdx >= 0) colItemQty = itQtyIdx;
      if (itUnitIdx >= 0) colItemUnitCost = itUnitIdx;
      if (itSupIdx >= 0) colItemSupply = itSupIdx;
      if (itVatIdx >= 0) colItemVat = itVatIdx;
      if (itRemIdx >= 0) colItemRemark = itRemIdx;
      hasSeenHeader = true;
    };

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const joined = row.map((c) => String(c || "").replace(/\s+/g, "")).join("|");
      if (!joined.replace(/\|/g, "")) continue;

      // 섹션 타이틀 감지 (매입 전자(수정) 세금계산서 목록조회 / 매출 전자(수정) 세금계산서 목록조회)
      if (joined.includes("매입전자") && joined.includes("세금계산서")) {
        currentSectionIoType = "PURCHASE";
        continue;
      }
      if (joined.includes("매출전자") && joined.includes("세금계산서")) {
        currentSectionIoType = "SALE";
        continue;
      }

      // 중간/상단 요약 행 스킵 ("사업자등록번호", "총합계금액" 등)
      if (
        (joined.includes("사업자등록번호") && joined.includes("대표자명") && !joined.includes("승인번호")) ||
        (joined.includes("총합계금액") && joined.includes("총공급가액"))
      ) {
        continue;
      }

      // 헤더 행 감지 (다중 섹션 파일에서 중간에 다시 나오는 헤더도 재매핑 후 스킵)
      if (
        (joined.includes("승인번호") || joined.includes("작성일자")) &&
        (joined.includes("공급가액") || joined.includes("합계금액")) &&
        String(row[colWriteDate] || "").replace(/\s+/g, "").includes("일자")
      ) {
        applyHeaderMapping(row);
        continue;
      }

      if (!hasSeenHeader) {
        // 첫 헤더를 만나기 전이지만 혹시 첫 행이 데이터일 수 있으므로 날짜 형식인지 체크
        const firstCellDigits = String(row[0] || "").replace(/[^0-9]/g, "");
        if (firstCellDigits.length < 8) continue;
      }

      const writeDateStr = String(row[colWriteDate] || "").trim();
      const writeDateDigits = writeDateStr.replace(/[^0-9]/g, "");
      if (writeDateDigits.length < 8) continue;

      const ntsNo = colNtsNo >= 0 ? String(row[colNtsNo] || "").trim() : "";
      const supply = colSupply >= 0 ? parseAmount(row[colSupply]) : 0;
      const vat = colVat >= 0 ? parseAmount(row[colVat]) : Math.round(supply * 0.1);
      const total = colTotal >= 0 ? parseAmount(row[colTotal]) : supply + vat;
      if (supply === 0 && total === 0) continue;

      const finalSupply = supply !== 0 ? supply : Math.round(total / 1.1);
      const finalVat = vat !== 0 ? vat : total !== 0 ? total - finalSupply : Math.round(finalSupply * 0.1);
      const finalTotal = total !== 0 ? total : finalSupply + finalVat;

      const writeDate = parseExcelDate(row[colWriteDate]);
      const issueDate = colIssueDate >= 0 ? parseExcelDate(row[colIssueDate]) : writeDate;

      const supBizNo = colSupplierBizNo >= 0 ? String(row[colSupplierBizNo] || "").replace(/[^0-9]/g, "") : "";
      const supName = colSupplierName >= 0 ? String(row[colSupplierName] || "").trim() : "";
      const supCeo = colSupplierCeo >= 0 ? String(row[colSupplierCeo] || "").trim() : "";
      const supAddr = colSupplierAddr >= 0 ? String(row[colSupplierAddr] || "").trim() : "";

      const buyBizNo = colBuyerBizNo >= 0 ? String(row[colBuyerBizNo] || "").replace(/[^0-9]/g, "") : "";
      const buyName = colBuyerName >= 0 ? String(row[colBuyerName] || "").trim() : "";
      const buyCeo = colBuyerCeo >= 0 ? String(row[colBuyerCeo] || "").trim() : "";
      const buyAddr = colBuyerAddr >= 0 ? String(row[colBuyerAddr] || "").trim() : "";

      let rowIoType: "SALE" | "PURCHASE" = currentSectionIoType;
      if (supBizNo && supBizNo === ourBizNumRaw) {
        rowIoType = "SALE";
      } else if (buyBizNo && buyBizNo === ourBizNumRaw) {
        rowIoType = "PURCHASE";
      }

      const rawItemCandidate = colItem >= 0 ? String(row[colItem] || "").trim() : "";
      const validItemCandidate = /^\d{4}-\d{2}-\d{2}$/.test(rawItemCandidate) ? "" : rawItemCandidate;
      const remarkStr = colRemark >= 0 ? String(row[colRemark] || "").trim() : "";
      const itemRemarkStr = colItemRemark >= 0 ? String(row[colItemRemark] || "").trim() : "";
      const docCategoryStr = colDocCategory >= 0 ? String(row[colDocCategory] || "").trim() : "";
      const modifyReasonRaw = colModifyReason >= 0 ? String(row[colModifyReason] || "").trim() : "";
      const isModifiedDoc =
        docCategoryStr.includes("수정") ||
        modifyReasonRaw.includes("수정") ||
        remarkStr.includes("당초 승인번호") ||
        finalSupply < 0 ||
        finalTotal < 0;

      const resolvedModifyReason = isModifiedDoc
        ? finalSupply < 0 || finalTotal < 0
          ? "수정세금계산서(감액/취소)"
          : "수정세금계산서(재발급)"
        : modifyReasonRaw && !/^일반|전자세금계산서|세금계산서$/.test(modifyReasonRaw)
        ? modifyReasonRaw
        : "해당없음";

      const resolvedItemName =
        validItemCandidate ||
        remarkStr ||
        itemRemarkStr ||
        (rowIoType === "PURCHASE" ? "매입 품목" : "매출 품목");

      const itemDateVal =
        colItemDate >= 0 && String(row[colItemDate] || "").trim()
          ? parseExcelDate(row[colItemDate])
          : writeDate;
      const itemMm = itemDateVal.slice(5, 7);
      const itemDd = itemDateVal.slice(8, 10);
      const itemSpecVal = colItemSpec >= 0 ? String(row[colItemSpec] || "").trim() : "";
      const itemQtyVal = colItemQty >= 0 ? parseAmount(row[colItemQty]) || 1 : 1;
      const itemUnitPriceVal = colItemUnitCost >= 0 ? parseAmount(row[colItemUnitCost]) || finalSupply : finalSupply;
      const itemSupplyVal = colItemSupply >= 0 ? parseAmount(row[colItemSupply]) || finalSupply : finalSupply;
      const itemVatVal = colItemVat >= 0 ? parseAmount(row[colItemVat]) || finalVat : finalVat;

      results.push({
        ioType: rowIoType,
        ntsConfirmNo: ntsNo || `HTX-${writeDate.replace(/-/g, "")}-${r}`,
        writeDate,
        issueDate,
        invoicerCorpNum: supBizNo,
        invoicerCorpName: supName,
        invoicerCEOName: supCeo,
        invoicerAddr: supAddr,
        invoicerEmail: colSupplierEmail >= 0 ? String(row[colSupplierEmail] || "").trim() : "",
        invoiceeCorpNum: buyBizNo,
        invoiceeCorpName: buyName,
        invoiceeCEOName: buyCeo,
        invoiceeAddr: buyAddr,
        invoiceeEmail1: colBuyerEmail1 >= 0 ? String(row[colBuyerEmail1] || "").trim() : "",
        invoiceeEmail2: colBuyerEmail2 >= 0 ? String(row[colBuyerEmail2] || "").trim() : "",
        supplyCostTotal: finalSupply,
        taxTotal: finalVat,
        totalAmount: finalTotal,
        purposeType: colPurpose >= 0 && String(row[colPurpose]).includes("영수") ? "영수" : "청구",
        modifyReason: resolvedModifyReason,
        itemName: resolvedItemName,
        remark1: remarkStr,
        taxItems: [
          {
            month: itemMm,
            day: itemDd,
            itemName: resolvedItemName,
            spec: itemSpecVal,
            qty: itemQtyVal,
            unitPrice: itemUnitPriceVal,
            supplyAmount: itemSupplyVal,
            vatAmount: itemVatVal,
            remark: itemRemarkStr || remarkStr,
          },
        ],
        sourceChannel: "EXCEL_UPLOAD",
      });
    }
  }

  return results;
}

interface IndexedInvoiceRow {
  dbId: number | null;
  sortId: number;
  ntsConfirmNo: string;
  domainType: string;
  issueDate: string;
  customerName: string;
  businessNo: string;
  supplyAmount: number;
  totalAmount: number;
  settlementStatus: string;
  itemName: string;
  ioType: string;
  supplierEntityType: string;
  stagedRef?: StagedInvoiceInsert;
}

interface StagedInvoiceInsert {
  invoiceNo: string;
  ioType: "SALE" | "PURCHASE";
  sourceType: "HOMETAX_RPA" | "EXCEL_UPLOAD";
  domainType: string;
  supplierEntityType: string;
  supplierCorpNum: string;
  supplierCorpName: string;
  supplierCeoName: string;
  supplierAddress: string;
  supplierBizType: string;
  supplierBizClass: string;
  supplierEmail: string;
  customerName: string;
  businessNo: string;
  ceoName: string;
  customerEmail: string;
  purposeType: string;
  modifyReason: string;
  taxItemsJson: string;
  writeDate: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  itemName: string;
  ntsConfirmNo: string | null;
  memo: string;
  settledAmount: number;
  settlementStatus: string;
  settledAt: string | null;
}

function normalizeIsoDateStr(raw: unknown): string {
  const s = String(raw || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const digits = s.replace(/[^0-9]/g, "");
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return s.slice(0, 10);
}

function diffIsoDaysAbs(dateA: string, dateB: string): number {
  const a = Date.parse(`${dateA.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${dateB.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.MAX_SAFE_INTEGER;
  return Math.abs(Math.round((a - b) / 86400000));
}

function extractOrigNtsNo(remark?: string): string {
  const m = String(remark || "").match(/([0-9]{8}-[0-9]{8}-[0-9A-Za-z]{8})/);
  return m ? m[1] : "";
}

function isNewerSaleHistRow(cand: IndexedInvoiceRow, cur: IndexedInvoiceRow | undefined): boolean {
  if (!cur) return true;
  if (cand.issueDate !== cur.issueDate) return cand.issueDate > cur.issueDate;
  return cand.sortId > cur.sortId;
}

// Upsert collected invoices into erp_tax_invoices without duplicates
async function saveCollectedInvoicesToDb(
  items: HometaxCollectedInvoice[],
  entityKey: "CORP" | "INDIVIDUAL",
  sourceType: "HOMETAX_RPA" | "EXCEL_UPLOAD"
) {
  if (items.length === 0) {
    return { insertedCount: 0, skippedCount: 0, offsetCount: 0, savedRows: [] as any[] };
  }

  const candidateNtsSet = new Set<string>();
  for (const item of items) {
    const ntsNo = (item.ntsConfirmNo || "").trim();
    if (ntsNo && !ntsNo.includes("POPBILL_TEST")) {
      candidateNtsSet.add(ntsNo);
    }
    const origNtsNo = extractOrigNtsNo(item.remark1);
    if (origNtsNo) {
      candidateNtsSet.add(origNtsNo);
    }
  }
  const candidateNtsNos = Array.from(candidateNtsSet);

  const pool = getErpPool();
  const client = await pool.connect();
  const entity = getEntity(entityKey);

  let insertedCount = 0;
  let skippedCount = 0;
  let offsetCount = 0;
  const savedRows: any[] = [];

  try {
    await client.query("BEGIN");

    // 1회 일괄 선조회로 중복/수정세금계산서/매출분과 이력을 인메모리 색인
    const prefetchRes = await client.query(
      `SELECT id,
              nts_confirm_no,
              domain_type,
              issue_date::text AS issue_date,
              customer_name,
              business_no,
              supply_amount,
              total_amount,
              settlement_status,
              item_name,
              COALESCE(io_type, 'SALE') AS io_type,
              COALESCE(supplier_entity_type, 'CORP') AS supplier_entity_type
       FROM erp_tax_invoices
       WHERE COALESCE(supplier_entity_type, 'CORP') = $1
          OR nts_confirm_no = ANY($2::text[])
       ORDER BY issue_date DESC, id DESC`,
      [entity.key, candidateNtsNos]
    );

    const byAnyNts = new Map<string, IndexedInvoiceRow>();
    const byEntityIoNts = new Map<string, IndexedInvoiceRow>();
    const byDateName = new Map<string, IndexedInvoiceRow[]>();
    const byDateBiz = new Map<string, IndexedInvoiceRow[]>();
    const posByName = new Map<string, IndexedInvoiceRow[]>();
    const posByBiz = new Map<string, IndexedInvoiceRow[]>();
    const saleHistByNameItem = new Map<string, IndexedInvoiceRow>();
    const saleHistByBizItem = new Map<string, IndexedInvoiceRow>();

    const pushToBucket = (map: Map<string, IndexedInvoiceRow[]>, key: string, row: IndexedInvoiceRow) => {
      const list = map.get(key);
      if (list) list.push(row);
      else map.set(key, [row]);
    };

    const indexRow = (row: IndexedInvoiceRow) => {
      if (row.ntsConfirmNo) {
        const prevAny = byAnyNts.get(row.ntsConfirmNo);
        if (!prevAny || (!prevAny.domainType && row.domainType)) {
          byAnyNts.set(row.ntsConfirmNo, row);
        }
      }
      if (row.supplierEntityType !== entity.key) return;

      if (row.ntsConfirmNo) {
        const key = `${row.ioType}::${row.ntsConfirmNo}`;
        if (!byEntityIoNts.has(key)) byEntityIoNts.set(key, row);
      }
      pushToBucket(byDateName, `${row.ioType}::${row.issueDate}::${row.customerName}`, row);
      if (row.businessNo) {
        pushToBucket(byDateBiz, `${row.ioType}::${row.issueDate}::${row.businessNo}`, row);
      }
      if (row.supplyAmount > 0) {
        pushToBucket(posByName, `${row.ioType}::${row.customerName}`, row);
        if (row.businessNo) {
          pushToBucket(posByBiz, `${row.ioType}::${row.businessNo}`, row);
        }
      }
      if (row.ioType === "SALE") {
        const nameItemKey = `${row.customerName}::${row.itemName}`;
        if (isNewerSaleHistRow(row, saleHistByNameItem.get(nameItemKey))) {
          saleHistByNameItem.set(nameItemKey, row);
        }
        if (row.businessNo) {
          const bizItemKey = `${row.businessNo}::${row.itemName}`;
          if (isNewerSaleHistRow(row, saleHistByBizItem.get(bizItemKey))) {
            saleHistByBizItem.set(bizItemKey, row);
          }
        }
      }
    };

    let maxDbId = 0;
    for (const r of prefetchRes.rows) {
      const dbId = Number(r.id);
      if (dbId > maxDbId) maxDbId = dbId;
      indexRow({
        dbId,
        sortId: dbId,
        ntsConfirmNo: String(r.nts_confirm_no || "").trim(),
        domainType: String(r.domain_type || ""),
        issueDate: normalizeIsoDateStr(r.issue_date),
        customerName: String(r.customer_name || ""),
        businessNo: String(r.business_no || ""),
        supplyAmount: Number(r.supply_amount || 0),
        totalAmount: Number(r.total_amount || 0),
        settlementStatus: String(r.settlement_status || "UNPAID"),
        itemName: String(r.item_name || ""),
        ioType: String(r.io_type || "SALE"),
        supplierEntityType: String(r.supplier_entity_type || "CORP"),
      });
    }

    const ntsBackfillMap = new Map<number, string>();
    const stagedInserts: StagedInvoiceInsert[] = [];
    const offsetOriginalIdSet = new Set<number>();
    const nowIso = new Date().toISOString();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const ioType = item.ioType;
      const ntsNo = (item.ntsConfirmNo || "").trim();
      const writeDateNorm = normalizeIsoDateStr(item.writeDate);

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

      let existingRow: IndexedInvoiceRow | undefined;
      if (ntsNo && !ntsNo.includes("POPBILL_TEST")) {
        existingRow = byEntityIoNts.get(`${ioType}::${ntsNo}`);
      }
      if (!existingRow) {
        const dateNameHits = byDateName.get(`${ioType}::${writeDateNorm}::${counterpartyName}`) || [];
        existingRow = dateNameHits.find((r) => Math.abs(r.totalAmount - item.totalAmount) <= 1);
        if (!existingRow && counterpartyBizNo) {
          const dateBizHits = byDateBiz.get(`${ioType}::${writeDateNorm}::${counterpartyBizNo}`) || [];
          existingRow = dateBizHits.find((r) => Math.abs(r.totalAmount - item.totalAmount) <= 1);
        }
      }

      if (existingRow) {
        if (ntsNo && existingRow.ntsConfirmNo !== ntsNo) {
          existingRow.ntsConfirmNo = ntsNo;
          if (!byEntityIoNts.has(`${ioType}::${ntsNo}`)) {
            byEntityIoNts.set(`${ioType}::${ntsNo}`, existingRow);
          }
          if (!byAnyNts.has(ntsNo)) {
            byAnyNts.set(ntsNo, existingRow);
          }
          if (existingRow.dbId !== null) {
            ntsBackfillMap.set(existingRow.dbId, ntsNo);
          } else if (existingRow.stagedRef) {
            existingRow.stagedRef.ntsConfirmNo = ntsNo;
          }
        }
        skippedCount++;
        continue;
      }

      const isNegative = item.supplyCostTotal < 0 || item.totalAmount < 0;
      let resolvedDomainType = ioType === "PURCHASE" ? "PURCHASE_EXPENSE" : "TRADE_SALE";
      let matchedOriginalInvoice: IndexedInvoiceRow | undefined;

      // 1) 수정세금계산서(마이너스 취소분)인 경우: 당초 발행된 원본(+) 세금계산서를 찾아 domain_type 동기화 및 상계 준비
      if (isNegative) {
        const absSupply = Math.abs(item.supplyCostTotal);
        const absTotal = Math.abs(item.totalAmount);
        const origNtsNo = extractOrigNtsNo(item.remark1);

        if (origNtsNo) {
          matchedOriginalInvoice = byEntityIoNts.get(`${ioType}::${origNtsNo}`);
        }

        if (!matchedOriginalInvoice) {
          const candidatesSet = new Set<IndexedInvoiceRow>();
          for (const r of posByName.get(`${ioType}::${counterpartyName}`) || []) {
            candidatesSet.add(r);
          }
          if (counterpartyBizNo) {
            for (const r of posByBiz.get(`${ioType}::${counterpartyBizNo}`) || []) {
              candidatesSet.add(r);
            }
          }
          const candidates = Array.from(candidatesSet).filter(
            (r) =>
              r.supplyAmount > 0 &&
              (Math.abs(r.supplyAmount - absSupply) <= 10 || Math.abs(r.totalAmount - absTotal) <= 10)
          );
          if (candidates.length > 0) {
            candidates.sort((a, b) => {
              const aSameDate = a.issueDate === writeDateNorm ? 0 : 1;
              const bSameDate = b.issueDate === writeDateNorm ? 0 : 1;
              if (aSameDate !== bSameDate) return aSameDate - bSameDate;

              const aUnpaid = (a.settlementStatus || "UNPAID") !== "PAID" ? 0 : 1;
              const bUnpaid = (b.settlementStatus || "UNPAID") !== "PAID" ? 0 : 1;
              if (aUnpaid !== bUnpaid) return aUnpaid - bUnpaid;

              const aDiff = diffIsoDaysAbs(a.issueDate, writeDateNorm);
              const bDiff = diffIsoDaysAbs(b.issueDate, writeDateNorm);
              if (aDiff !== bDiff) return aDiff - bDiff;

              return b.sortId - a.sortId;
            });
            matchedOriginalInvoice = candidates[0];
          }
        }

        if (matchedOriginalInvoice && matchedOriginalInvoice.domainType) {
          resolvedDomainType = matchedOriginalInvoice.domainType;
        }
      }

      // 2) 일반 매출이거나 원본 매칭이 안 된 경우: 당초 승인번호/품목명/비고 및 기존 거래처 이력으로 매출 분과(domain_type) 지능형 분류
      if (ioType === "SALE" && !matchedOriginalInvoice) {
        const origNtsNo = extractOrigNtsNo(item.remark1);
        let foundByOrigNts = false;
        if (origNtsNo) {
          const origRow = byAnyNts.get(origNtsNo);
          if (origRow && origRow.domainType) {
            resolvedDomainType = origRow.domainType;
            foundByOrigNts = true;
          }
        }
        const text = `${item.itemName || ""} ${item.remark1 || ""}`;
        if (foundByOrigNts) {
          // keep resolvedDomainType from original invoice
        } else if (/임대|렌탈|TV|모니터|노트북|복합기|프로젝터|EPSON|DDR4|RAM|더클라우드/i.test(text)) {
          resolvedDomainType = "RENTAL";
        } else if (/운영용역|유지보수|용역료/i.test(text)) {
          resolvedDomainType = "OP_SERVICE";
        } else if (/개발|구축|착수금|잔금|중도금|컨설팅/i.test(text)) {
          resolvedDomainType = "DEV_SERVICE";
        } else {
          const itemKey = item.itemName || "";
          const byName = saleHistByNameItem.get(`${counterpartyName}::${itemKey}`);
          const byBiz = counterpartyBizNo ? saleHistByBizItem.get(`${counterpartyBizNo}::${itemKey}`) : undefined;
          let histBest = byName;
          if (byBiz && isNewerSaleHistRow(byBiz, histBest)) {
            histBest = byBiz;
          }
          if (histBest && histBest.domainType) {
            resolvedDomainType = histBest.domainType;
          }
        }
      }

      const effectiveWriteDate = writeDateNorm || item.writeDate;
      const prefix = ioType === "PURCHASE" ? "PX" : "TX";
      const dateCompact = effectiveWriteDate.slice(2, 10).replace(/-/g, "");
      const invoiceNo = item.mgtKey || `${prefix}${dateCompact}-${Math.floor(1000 + Math.random() * 9000)}`;
      const mm = effectiveWriteDate.slice(5, 7);
      const dd = effectiveWriteDate.slice(8, 10);

      const taxItemsJson =
        Array.isArray(item.taxItems) && item.taxItems.length > 0
          ? item.taxItems
          : [
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

      // 음수 수정세금계산서는 자체적으로 채권/채무가 발생하지 않으므로 PAID(상계완료) 상태로 저장
      const initialSettlementStatus = isNegative ? "PAID" : "UNPAID";
      const initialSettledAmount = isNegative ? item.totalAmount : 0;
      const resolvedModifyReason =
        item.modifyReason && item.modifyReason !== "해당없음"
          ? item.modifyReason
          : isNegative
          ? "수정세금계산서(감액/취소)"
          : "해당없음";
      const storedItemName = item.itemName || (ioType === "PURCHASE" ? "매입 세금계산서" : "매출 세금계산서");
      const storedBizNo = counterpartyBizNo || "100-00-00000";

      const staged: StagedInvoiceInsert = {
        invoiceNo,
        ioType,
        sourceType,
        domainType: resolvedDomainType,
        supplierEntityType: entity.key,
        supplierCorpNum: ioType === "PURCHASE" ? (item.invoicerCorpNum || entity.bizNumRaw) : entity.bizNumRaw,
        supplierCorpName: ioType === "PURCHASE" ? (item.invoicerCorpName || counterpartyName) : entity.corpName,
        supplierCeoName: ioType === "PURCHASE" ? (item.invoicerCEOName || counterpartyCeo) : entity.ceoName,
        supplierAddress: entity.address,
        supplierBizType: entity.bizType,
        supplierBizClass: entity.bizClass,
        supplierEmail: entity.email,
        customerName: counterpartyName,
        businessNo: storedBizNo,
        ceoName: counterpartyCeo || "대표자",
        customerEmail: counterpartyEmail,
        purposeType: item.purposeType || "청구",
        modifyReason: resolvedModifyReason,
        taxItemsJson: JSON.stringify(taxItemsJson),
        writeDate: writeDateNorm || item.writeDate,
        supplyAmount: item.supplyCostTotal,
        vatAmount: item.taxTotal,
        totalAmount: item.totalAmount,
        itemName: storedItemName,
        ntsConfirmNo: ntsNo || null,
        memo: item.remark1 || "",
        settledAmount: initialSettledAmount,
        settlementStatus: initialSettlementStatus,
        settledAt: null,
      };
      stagedInserts.push(staged);

      indexRow({
        dbId: null,
        sortId: maxDbId + stagedInserts.length,
        ntsConfirmNo: ntsNo,
        domainType: resolvedDomainType,
        issueDate: writeDateNorm,
        customerName: counterpartyName,
        businessNo: storedBizNo,
        supplyAmount: item.supplyCostTotal,
        totalAmount: item.totalAmount,
        settlementStatus: initialSettlementStatus,
        itemName: storedItemName,
        ioType,
        supplierEntityType: entity.key,
        stagedRef: staged,
      });

      // 3) 수정세금계산서(취소분)와 매칭된 원본 세금계산서가 있으면 원본도 자동으로 상계완료(PAID) 처리 및 연결 청구 해제
      if (isNegative && matchedOriginalInvoice) {
        matchedOriginalInvoice.settlementStatus = "PAID";
        if (matchedOriginalInvoice.dbId !== null) {
          offsetOriginalIdSet.add(matchedOriginalInvoice.dbId);
        } else if (matchedOriginalInvoice.stagedRef) {
          const sRef = matchedOriginalInvoice.stagedRef;
          sRef.settledAmount = sRef.totalAmount;
          sRef.settlementStatus = "PAID";
          if (!sRef.settledAt) sRef.settledAt = nowIso;
          if (!sRef.memo.includes("[수정세금계산서 상계]")) {
            sRef.memo = `${sRef.memo} [수정세금계산서 상계]`.trim();
          }
        }
        offsetCount++;
      }
    }

    if (ntsBackfillMap.size > 0) {
      const backfillIds = Array.from(ntsBackfillMap.keys());
      const backfillNts = Array.from(ntsBackfillMap.values());
      await client.query(
        `UPDATE erp_tax_invoices AS t
         SET nts_confirm_no = u.nts
         FROM UNNEST($1::bigint[], $2::text[]) AS u(id, nts)
         WHERE t.id = u.id`,
        [backfillIds, backfillNts]
      );
    }

    const INSERT_CHUNK_SIZE = 100;
    for (let start = 0; start < stagedInserts.length; start += INSERT_CHUNK_SIZE) {
      const chunk = stagedInserts.slice(start, start + INSERT_CHUNK_SIZE);
      const values: any[] = [];
      const placeholders: string[] = [];

      chunk.forEach((row, idx) => {
        const base = idx * 29;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17}, $${base + 18}, $${base + 19}::jsonb, $${base + 20}, $${base + 21}, $${base + 22}, $${base + 23}, $${base + 24}, 'SENT_NTS', $${base + 25}, $${base + 26}, $${base + 27}, $${base + 28}, '[]'::jsonb, $${base + 29}::timestamptz)`
        );
        values.push(
          row.invoiceNo,
          row.ioType,
          row.sourceType,
          row.domainType,
          row.supplierEntityType,
          row.supplierCorpNum,
          row.supplierCorpName,
          row.supplierCeoName,
          row.supplierAddress,
          row.supplierBizType,
          row.supplierBizClass,
          row.supplierEmail,
          row.customerName,
          row.businessNo,
          row.ceoName,
          row.customerEmail,
          row.purposeType,
          row.modifyReason,
          row.taxItemsJson,
          row.writeDate,
          row.supplyAmount,
          row.vatAmount,
          row.totalAmount,
          row.itemName,
          row.ntsConfirmNo,
          row.memo,
          row.settledAmount,
          row.settlementStatus,
          row.settledAt
        );
      });

      const insRes = await client.query(
        `INSERT INTO erp_tax_invoices
         (invoice_no, io_type, source_type, domain_type, supplier_entity_type, supplier_corp_num, supplier_corp_name,
          supplier_ceo_name, supplier_address, supplier_biz_type, supplier_biz_class, supplier_email,
          customer_name, business_no, ceo_name, customer_email, purpose_type, modify_reason, tax_items,
          issue_date, supply_amount, vat_amount, total_amount, item_name,
          status, nts_confirm_no, memo, settled_amount, settlement_status, matched_bank_tx_ids, settled_at)
         VALUES ${placeholders.join(", ")}
         RETURNING *`,
        values
      );
      insertedCount += insRes.rows.length;
      savedRows.push(...insRes.rows);
    }

    const offsetIds = Array.from(offsetOriginalIdSet);
    if (offsetIds.length > 0) {
      await client.query(
        `UPDATE erp_tax_invoices
         SET settled_amount = total_amount,
             settlement_status = 'PAID',
             settled_at = COALESCE(settled_at, NOW()),
             memo = CASE
               WHEN COALESCE(memo, '') LIKE '%[수정세금계산서 상계]%' THEN memo
               ELSE TRIM(CONCAT(COALESCE(memo, ''), ' [수정세금계산서 상계]'))
             END
         WHERE id = ANY($1::bigint[])`,
        [offsetIds]
      );
      // 원본 세금계산서에 묶여 있던 청구 레코드의 tax_invoice_id 연결을 해제하여 재청구/재발행 가능 상태로 복원
      await client.query(
        `UPDATE erp_rental_billings
         SET tax_invoice_id = NULL, payment_status = 'UNPAID', paid_amount = 0
         WHERE tax_invoice_id = ANY($1::bigint[])`,
        [offsetIds]
      );
      await client.query(
        `UPDATE erp_service_billings
         SET tax_invoice_id = NULL, payment_status = 'UNPAID'
         WHERE tax_invoice_id = ANY($1::bigint[])`,
        [offsetIds]
      );
      // erp_trade_billings.tax_invoice_id is int4 in PostgreSQL
      const int4OffsetIds = offsetIds.filter((id) => id >= -2147483648 && id <= 2147483647);
      if (int4OffsetIds.length > 0) {
        await client.query(
          `UPDATE erp_trade_billings
           SET tax_invoice_id = NULL, payment_status = 'UNPAID', paid_amount = 0
           WHERE tax_invoice_id = ANY($1::int[])`,
          [int4OffsetIds]
        );
      }
      await client.query(
        `UPDATE erp_trade_sales
         SET tax_invoice_id = NULL
         WHERE tax_invoice_id = ANY($1::bigint[])`,
        [offsetIds]
      );
    }

    await client.query("COMMIT");
    return { insertedCount, skippedCount, offsetCount, savedRows };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// GET: Retrieve Hometax Free RPA Settings (부서사용자 계정 등)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityKey = searchParams.get("entityType") === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
    const pool = getErpPool();
    const res = await pool.query(
      `SELECT entity_type as "entityType", dept_user_id as "deptUserId",
              CASE WHEN COALESCE(dept_user_pw, '') != '' THEN '********' ELSE '' END as "deptUserPwMasked",
              COALESCE(dept_user_pw, '') != '' as "hasPassword",
              biz_no as "bizNo", auto_reconcile as "autoReconcile",
              last_sync_at as "lastSyncAt", last_sync_status as "lastSyncStatus",
              last_sync_message as "lastSyncMessage"
       FROM erp_hometax_rpa_settings
       WHERE entity_type = $1`,
      [entityKey]
    );
    return NextResponse.json({
      success: true,
      settings: res.rows[0] || {
        entityType: entityKey,
        deptUserId: "",
        deptUserPwMasked: "",
        hasPassword: false,
        bizNo: entityKey === "INDIVIDUAL" ? "295-03-02683" : "806-88-03266",
        autoReconcile: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // 1. Multipart Form-Data: Hometax Excel (.xls/.xlsx/.csv) Upload (100% 무료 · 자체 파서)
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

      const { insertedCount, skippedCount, offsetCount } = await saveCollectedInvoicesToDb(parsedItems, entityKey, "EXCEL_UPLOAD");

      return NextResponse.json({
        success: true,
        parsedCount: parsedItems.length,
        insertedCount,
        skippedCount,
        offsetCount,
        message: `홈택스 엑셀에서 총 ${parsedItems.length}건을 분석하여 신규 ${insertedCount}건 저장 완료 (중복 제외 ${skippedCount}건${offsetCount > 0 ? `, 수정세금계산서 원본 상계 ${offsetCount}건` : ""}).`,
      });
    }

    // 2. JSON Body: Free Self-Hosted DragonRPA Hometax Collector (No Popbill Paid Scraping!)
    const body = await request.json();
    const { action, entityType, startDate, endDate, syncTarget, deptUserId, deptUserPw, autoReconcile, items } = body;
    const entityKey: "CORP" | "INDIVIDUAL" = entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
    const pool = getErpPool();

    // ACTION A: Save Hometax Department User Credentials (부서사용자 ID/PW 설정 저장)
    if (action === "SAVE_RPA_SETTINGS") {
      const entity = getEntity(entityKey);
      if (deptUserPw && deptUserPw !== "********") {
        await pool.query(
          `INSERT INTO erp_hometax_rpa_settings (entity_type, dept_user_id, dept_user_pw, biz_no, auto_reconcile, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (entity_type) DO UPDATE SET
             dept_user_id = EXCLUDED.dept_user_id,
             dept_user_pw = EXCLUDED.dept_user_pw,
             auto_reconcile = EXCLUDED.auto_reconcile,
             updated_at = NOW()`,
          [entityKey, (deptUserId || "").trim(), deptUserPw, entity.bizNum, autoReconcile !== false]
        );
      } else {
        await pool.query(
          `INSERT INTO erp_hometax_rpa_settings (entity_type, dept_user_id, biz_no, auto_reconcile, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (entity_type) DO UPDATE SET
             dept_user_id = EXCLUDED.dept_user_id,
             auto_reconcile = EXCLUDED.auto_reconcile,
             updated_at = NOW()`,
          [entityKey, (deptUserId || "").trim(), entity.bizNum, autoReconcile !== false]
        );
      }
      return NextResponse.json({
        success: true,
        message: "홈택스 자체 RPA 수집 계정 설정이 저장되었습니다. (팝빌 유료 과금 없음 · ₩0)",
      });
    }

    // ACTION B: Direct JSON Batch Push from External/Local DragonRPA Bot (`RPA_PUSH_ITEMS`)
    if (action === "RPA_PUSH_ITEMS" && Array.isArray(items)) {
      const { insertedCount, skippedCount } = await saveCollectedInvoicesToDb(items, entityKey, "HOMETAX_RPA");
      await pool.query(
        `UPDATE erp_hometax_rpa_settings
         SET last_sync_at = NOW(),
             last_sync_status = 'SUCCESS',
             last_sync_message = $1
         WHERE entity_type = $2`,
        [`RPA 봇 수집: 총 ${items.length}건 중 신규 ${insertedCount}건 저장 (중복 ${skippedCount}건)`, entityKey]
      );
      return NextResponse.json({
        success: true,
        insertedCount,
        skippedCount,
        message: `자체 RPA 봇으로부터 ${items.length}건을 수신하여 신규 ${insertedCount}건을 반영했습니다.`,
      });
    }

    // ACTION C: Trigger Local/Self-Hosted DragonRPA Hometax Bot (`RUN_LOCAL_RPA`)
    if (action === "RUN_LOCAL_RPA") {
      const sDate = startDate || new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);
      const eDate = endDate || new Date().toISOString().slice(0, 10);
      const target = syncTarget || "ALL";

      const isVercelServerless = Boolean(process.env.VERCEL);
      if (isVercelServerless) {
        return NextResponse.json({
          success: true,
          insertedCount: 0,
          skippedCount: 0,
          isServerlessHint: true,
          message:
            "클라우드(Vercel) 환경에서는 PC에서 `node scripts/hometax-rpa-collect.cjs`를 실행하거나 우측의 [홈택스 엑셀 파일 선택 업로드]를 사용하면 팝빌 과금 없이(₩0) 즉시 DB에 반영됩니다.",
        });
      }

      // On local Windows/Node server, spawn scripts/hometax-rpa-collect.cjs directly
      const scriptPath = path.join(process.cwd(), "scripts", "hometax-rpa-collect.cjs");
      const childOut = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
        const proc = spawn(
          process.execPath,
          [scriptPath, `--entity=${entityKey}`, `--target=${target}`, `--start=${sDate}`, `--end=${eDate}`],
          { cwd: process.cwd(), env: process.env }
        );
        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (d) => (stdout += d.toString()));
        proc.stderr.on("data", (d) => (stderr += d.toString()));
        proc.on("close", (code) => resolve({ code: code ?? 0, stdout, stderr }));
      });

      return NextResponse.json({
        success: childOut.code === 0,
        stdout: childOut.stdout,
        stderr: childOut.stderr,
        message:
          childOut.code === 0
            ? childOut.stdout.trim().split("\n").pop() || "자체 홈택스 RPA 수집이 완료되었습니다."
            : `자체 RPA 봇 안내: ${childOut.stderr || childOut.stdout || "홈택스 로그인 또는 엑셀 폴더 확인 필요"}`,
      });
    }

    return NextResponse.json({ error: "지원하지 않는 action입니다." }, { status: 400 });
  } catch (error: any) {
    console.error("Hometax Free RPA API Error:", error);
    return NextResponse.json({ error: "홈택스 자체 수집 처리 오류: " + error.message }, { status: 500 });
  }
}
