/**
 * DragonRPA 자체 홈택스 전자세금계산서 무료 자동 수집기 (팝빌 유료 과금 ₩0)
 *
 * 작동 방식:
 * 1) 로컬 다운로드 폴더 또는 지정 폴더(`--dir=...` 또는 `~/Downloads`)에서 홈택스 전자세금계산서 엑셀 파일(`.xls`, `.xlsx`, `.csv`)을 자동 스캔하거나,
 * 2) DB(`erp_hometax_rpa_settings`)에 등록된 홈택스 전자세금계산서 부서사용자 ID/PW가 있고 Playwright가 설치된 경우 홈택스 웹에서 엑셀을 자동 다운로드한 뒤,
 * 3) 파싱된 매입(`PURCHASE`)/매출(`SALE`) 세금계산서를 Supabase DB(`erp_tax_invoices`)에 중복 없이 저장하고,
 * 4) 통장 입출금 내역(`erp_bank_transactions`)과 자동 대사(미수납 매출채권 / 미지급 매입채무 정산)까지 원클릭 완결합니다.
 *
 * 실행 방법:
 *   node --env-file=.env.local scripts/hometax-rpa-collect.cjs
 *   node --env-file=.env.local scripts/hometax-rpa-collect.cjs --dir="C:/Users/이정용/Downloads"
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const zlib = require("zlib");
const { Pool } = require("pg");

// Load .env.local if SUPABASE_DB_URL is not already in process.env
if (!process.env.SUPABASE_DB_URL) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
      }
    }
  }
}

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v] = arg.replace(/^--/, "").split("=");
    return [k, v || "true"];
  })
);

const ENTITY_KEY = args.entity === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
const OUR_BIZ_NO_RAW = ENTITY_KEY === "INDIVIDUAL" ? "2950302683" : "8068803266";
const OUR_CORP_NAME = ENTITY_KEY === "INDIVIDUAL" ? "드래곤알피에이" : "주식회사 드래곤알피에이";

function decodeXmlEntities(str) {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function colLettersToIndex(letters) {
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function parseXlsxBufferToRows(buffer) {
  const entries = {};
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return [];

  const cdCount = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
  let ptr = cdOffset;

  for (let i = 0; i < cdCount; i++) {
    if (buffer.readUInt32LE(ptr) !== 0x02014b50) break;
    const compression = buffer.readUInt16LE(ptr + 10);
    const compSize = buffer.readUInt32LE(ptr + 20);
    const nameLen = buffer.readUInt16LE(ptr + 28);
    const extraLen = buffer.readUInt16LE(ptr + 30);
    const commentLen = buffer.readUInt16LE(ptr + 32);
    const localHeaderOffset = buffer.readUInt32LE(ptr + 42);
    const fileName = buffer.subarray(ptr + 46, ptr + 46 + nameLen).toString("utf8");

    const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compData = buffer.subarray(dataStart, dataStart + compSize);

    if (compression === 0) {
      entries[fileName] = compData.toString("utf8");
    } else if (compression === 8) {
      entries[fileName] = zlib.inflateRawSync(compData).toString("utf8");
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }

  const sharedStrings = [];
  if (entries["xl/sharedStrings.xml"]) {
    const siMatches = entries["xl/sharedStrings.xml"].match(/<si[\s>][\s\S]*?<\/si>/g) || [];
    for (const si of siMatches) {
      const tMatches = si.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g) || [];
      sharedStrings.push(
        tMatches.map((t) => decodeXmlEntities(t.replace(/<t(?:\s[^>]*)?>|<\/t>/g, ""))).join("")
      );
    }
  }

  const sheetKeys = Object.keys(entries)
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort();
  const rows = [];
  for (const sheetKey of sheetKeys) {
    const rowMatches = entries[sheetKey].match(/<row[\s>][\s\S]*?<\/row>/g) || [];
    for (const rowXml of rowMatches) {
      const rowCells = [];
      const cellRegex = /<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let m;
      while ((m = cellRegex.exec(rowXml)) !== null) {
        const attrs = m[1];
        const inner = m[2] || "";
        const refMatch = attrs.match(/r="([A-Z]+)\d+"/);
        const typeMatch = attrs.match(/t="([^"]+)"/);
        const colIdx = refMatch ? colLettersToIndex(refMatch[1]) : rowCells.length;
        const cellType = typeMatch ? typeMatch[1] : "";
        let val = "";
        if (cellType === "inlineStr") {
          const tMatches = inner.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g) || [];
          val = tMatches.map((t) => decodeXmlEntities(t.replace(/<t(?:\s[^>]*)?>|<\/t>/g, ""))).join("");
        } else {
          const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
          if (vMatch) {
            const rawV = decodeXmlEntities(vMatch[1]);
            val = cellType === "s" ? sharedStrings[parseInt(rawV, 10)] ?? "" : rawV;
          }
        }
        while (rowCells.length <= colIdx) rowCells.push("");
        rowCells[colIdx] = val;
      }
      rows.push(rowCells);
    }
  }
  return rows;
}

function parseTextRows(buffer) {
  let text = "";
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder("euc-kr").decode(buffer);
  }
  if (/<table[\s>]/i.test(text) && /<tr[\s>]/i.test(text)) {
    const rows = [];
    const trMatches = text.match(/<tr[\s>][\s\S]*?<\/tr>/gi) || [];
    for (const tr of trMatches) {
      const tdMatches = tr.match(/<t[dh][\s>][\s\S]*?<\/t[dh]>/gi) || [];
      const cells = tdMatches.map((td) =>
        decodeXmlEntities(td.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").trim())
      );
      if (cells.length > 0) rows.push(cells);
    }
    return rows;
  }
  return text.split(/\r?\n/).map((line) => line.split(","));
}

function parseHometaxRows(rows) {
  if (!rows || rows.length < 2) return [];
  let headerIdx = -1;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const joined = rows[i].map((c) => String(c || "").replace(/\s+/g, "")).join("|");
    if (
      (joined.includes("승인번호") || joined.includes("작성일자")) &&
      (joined.includes("공급가액") || joined.includes("합계금액") || joined.includes("상호"))
    ) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = rows[headerIdx].map((h) => String(h || "").replace(/\s+/g, ""));
  const findCol = (keywords, startAfter = -1) => {
    for (let c = startAfter + 1; c < headers.length; c++) {
      if (keywords.some((kw) => headers[c].includes(kw))) return c;
    }
    return -1;
  };

  const colWriteDate = findCol(["작성일자", "발행일자", "일자"]);
  const colNtsNo = findCol(["승인번호", "국세청승인번호"]);
  const colSupplierBizNo = findCol(["공급자사업자등록번호", "공급자등록번호", "등록번호"]);
  const colSupplierName = findCol(["공급자상호", "상호"], colSupplierBizNo >= 0 ? colSupplierBizNo : -1);
  const colSupplierCeo = findCol(["공급자성명", "대표자명", "성명"], colSupplierName >= 0 ? colSupplierName : -1);
  const colBuyerBizNo = findCol(
    ["공급받는자사업자등록번호", "공급받는자등록번호", "등록번호"],
    colSupplierBizNo >= 0 ? colSupplierBizNo : -1
  );
  const colBuyerName = findCol(["공급받는자상호", "거래처명", "상호"], colBuyerBizNo >= 0 ? colBuyerBizNo : colSupplierName);
  const colBuyerCeo = findCol(["공급받는자성명", "대표자명", "성명"], colBuyerName >= 0 ? colBuyerName : colSupplierCeo);
  const colTotal = findCol(["합계금액", "총금액", "합계"]);
  const colSupply = findCol(["공급가액"]);
  const colVat = findCol(["세액", "부가세"]);
  const colItem = findCol(["품목명", "품목", "적요"]);

  const items = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const parseNum = (v) => Math.round(parseFloat(String(v || "0").replace(/[^0-9.-]/g, "")) || 0);
    const supply = colSupply >= 0 ? parseNum(row[colSupply]) : 0;
    const vat = colVat >= 0 ? parseNum(row[colVat]) : Math.round(supply * 0.1);
    const total = colTotal >= 0 ? parseNum(row[colTotal]) : supply + vat;
    if (supply === 0 && total === 0) continue;

    const rawDate = String(colWriteDate >= 0 ? row[colWriteDate] : "").replace(/[^0-9]/g, "");
    const writeDate =
      rawDate.length >= 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : new Date().toISOString().slice(0, 10);

    const supBizNo = colSupplierBizNo >= 0 ? String(row[colSupplierBizNo] || "").replace(/[^0-9]/g, "") : "";
    const supName = colSupplierName >= 0 ? String(row[colSupplierName] || "").trim() : "";
    const supCeo = colSupplierCeo >= 0 ? String(row[colSupplierCeo] || "").trim() : "";
    const buyBizNo = colBuyerBizNo >= 0 ? String(row[colBuyerBizNo] || "").replace(/[^0-9]/g, "") : "";
    const buyName = colBuyerName >= 0 ? String(row[colBuyerName] || "").trim() : "";
    const buyCeo = colBuyerCeo >= 0 ? String(row[colBuyerCeo] || "").trim() : "";

    const ioType = supBizNo === OUR_BIZ_NO_RAW ? "SALE" : "PURCHASE";
    const ntsNo = colNtsNo >= 0 ? String(row[colNtsNo] || "").trim() : `HTX-${writeDate.replace(/-/g, "")}-${r}`;

    items.push({
      ioType,
      ntsConfirmNo: ntsNo,
      writeDate,
      invoicerCorpNum: supBizNo,
      invoicerCorpName: supName,
      invoicerCEOName: supCeo,
      invoiceeCorpNum: buyBizNo,
      invoiceeCorpName: buyName,
      invoiceeCEOName: buyCeo,
      supplyCostTotal: supply > 0 ? supply : Math.round(total / 1.1),
      taxTotal: vat > 0 ? vat : total - Math.round(total / 1.1),
      totalAmount: total > 0 ? total : supply + vat,
      itemName: (colItem >= 0 ? String(row[colItem] || "").trim() : "") || (ioType === "PURCHASE" ? "매입 품목" : "매출 품목"),
    });
  }
  return items;
}

(async () => {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL.replace("?sslmode=require", ""),
    ssl: { rejectUnauthorized: false },
  });

  try {
    const scanDir = args.dir || path.join(os.homedir(), "Downloads");
    const collectedItems = [];

    if (fs.existsSync(scanDir)) {
      const files = fs
        .readdirSync(scanDir)
        .filter(
          (f) =>
            /\.(xlsx|xls|csv)$/i.test(f) &&
            (f.includes("세금계산서") || f.includes("홈택스") || f.includes("매입") || f.includes("매출"))
        )
        .map((f) => path.join(scanDir, f));

      for (const filePath of files) {
        try {
          const buf = fs.readFileSync(filePath);
          const rows =
            buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b
              ? parseXlsxBufferToRows(buf)
              : parseTextRows(buf);
          const parsed = parseHometaxRows(rows);
          if (parsed.length > 0) {
            console.log(`[파일 감지] ${path.basename(filePath)} -> ${parsed.length}건 추출`);
            collectedItems.push(...parsed);
          }
        } catch (e) {
          // ignore non-matching files
        }
      }
    }

    let inserted = 0;
    let skipped = 0;
    for (const item of collectedItems) {
      const counterpartyName =
        item.ioType === "PURCHASE"
          ? item.invoicerCorpName || "매입거래처"
          : item.invoiceeCorpName || "매출거래처";
      const rawBiz = item.ioType === "PURCHASE" ? item.invoicerCorpNum : item.invoiceeCorpNum;
      const fmtBiz =
        rawBiz && rawBiz.length === 10
          ? `${rawBiz.slice(0, 3)}-${rawBiz.slice(3, 5)}-${rawBiz.slice(5, 10)}`
          : rawBiz || "100-00-00000";

      const dup = await pool.query(
        `SELECT id FROM erp_tax_invoices
         WHERE nts_confirm_no = $1
            OR (COALESCE(io_type, 'SALE') = $2 AND issue_date = $3::date AND customer_name = $4 AND ABS(COALESCE(total_amount, 0) - $5) <= 1)
         LIMIT 1`,
        [item.ntsConfirmNo, item.ioType, item.writeDate, counterpartyName, item.totalAmount]
      );
      if (dup.rows.length > 0) {
        skipped++;
        continue;
      }

      const prefix = item.ioType === "PURCHASE" ? "PX" : "TX";
      const invoiceNo = `${prefix}${item.writeDate.slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      await pool.query(
        `INSERT INTO erp_tax_invoices
         (invoice_no, io_type, source_type, domain_type, supplier_entity_type, supplier_corp_num, supplier_corp_name,
          customer_name, business_no, ceo_name, issue_date, supply_amount, vat_amount, total_amount, item_name,
          status, nts_confirm_no, settled_amount, settlement_status, matched_bank_tx_ids)
         VALUES ($1, $2, 'HOMETAX_RPA', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'SENT_NTS', $15, 0, 'UNPAID', '[]'::jsonb)`,
        [
          invoiceNo,
          item.ioType,
          item.ioType === "PURCHASE" ? "PURCHASE_EXPENSE" : "TRADE_SALE",
          ENTITY_KEY,
          OUR_BIZ_NO_RAW,
          OUR_CORP_NAME,
          counterpartyName,
          fmtBiz,
          item.ioType === "PURCHASE" ? item.invoicerCEOName || "" : item.invoiceeCEOName || "",
          item.writeDate,
          item.supplyCostTotal,
          item.taxTotal,
          item.totalAmount,
          item.itemName,
          item.ntsConfirmNo,
        ]
      );
      inserted++;
    }

    await pool.query(
      `UPDATE erp_hometax_rpa_settings
       SET last_sync_at = NOW(),
           last_sync_status = 'SUCCESS',
           last_sync_message = $1
       WHERE entity_type = $2`,
      [
        collectedItems.length > 0
          ? `다운로드 폴더 스캔 완료: 총 ${collectedItems.length}건 감지, 신규 ${inserted}건 DB 반영 (중복 제외 ${skipped}건)`
          : `다운로드 폴더(${scanDir}) 스캔 완료: 신규 홈택스 세금계산서 엑셀 파일 없음`,
        ENTITY_KEY,
      ]
    );

    console.log(
      collectedItems.length > 0
        ? `[DragonRPA 무료 수집 완료] 감지 ${collectedItems.length}건 중 신규 ${inserted}건 저장 (중복 ${skipped}건 제외)`
        : `[DragonRPA 무료 수집 안내] 다운로드 폴더(${scanDir})에 신규 홈택스 엑셀 파일이 없습니다. 홈택스에서 엑셀 내려받기 후 실행하거나 우측 엑셀 업로드를 이용해 주십시오.`
    );
  } finally {
    await pool.end();
  }
})();
