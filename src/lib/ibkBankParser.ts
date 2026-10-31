import zlib from "zlib";

export interface ParsedBankTransaction {
  entityType: "CORP" | "INDIVIDUAL";
  bankName: string;
  accountNo: string;
  accountHolder: string;
  accountProduct: string;
  transDate: string;
  transTime: string;
  transType: "DEPOSIT" | "WITHDRAWAL" | "OPEN";
  amount: number;
  withdrawalAmount: number;
  depositAmount: number;
  balanceAfter: number;
  senderReceiver: string;
  counterpartyAccount: string | null;
  counterpartyBank: string | null;
  memo: string | null;
  txChannel: string | null;
  checkAmount: number;
  cmsCode: string | null;
  counterpartyHolder: string | null;
  txHash: string;
}

export interface BankImportMeta {
  bankName: string;
  accountNo: string;
  accountHolder: string;
  accountProduct: string;
  currentBalance?: number;
  periodStart?: string;
  periodEnd?: string;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function colLettersToIndex(letters: string): number {
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

export function parseXlsxBufferToRows(buffer: Buffer): string[][] {
  const entries: Record<string, string> = {};
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error("유효한 XLSX(ZIP) 파일 형식이 아닙니다.");
  }

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

  const sharedStrings: string[] = [];
  if (entries["xl/sharedStrings.xml"]) {
    const ssXml = entries["xl/sharedStrings.xml"];
    const siMatches = ssXml.match(/<si[\s>][\s\S]*?<\/si>/g) || [];
    for (const si of siMatches) {
      const tMatches = si.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g) || [];
      const text = tMatches
        .map((t) => decodeXmlEntities(t.replace(/<t(?:\s[^>]*)?>|<\/t>/g, "")))
        .join("");
      sharedStrings.push(text);
    }
  }

  const sheetKeys = Object.keys(entries)
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort();
  if (sheetKeys.length === 0) {
    throw new Error("XLSX 파일 내 워크시트를 찾을 수 없습니다.");
  }

  const rows: string[][] = [];
  for (const sheetKey of sheetKeys) {
    const sheetXml = entries[sheetKey];
    const rowMatches = sheetXml.match(/<row[\s>][\s\S]*?<\/row>/g) || [];
    for (const rowXml of rowMatches) {
      const rowCells: string[] = [];
      const cellRegex = /<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let m: RegExpExecArray | null;
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
            if (cellType === "s") {
              val = sharedStrings[parseInt(rawV, 10)] ?? "";
            } else {
              val = rawV;
            }
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

export function decodeTextBuffer(buffer: Buffer): string {
  // Check UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString("utf8");
  }
  try {
    const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
    return utf8Decoder.decode(buffer);
  } catch {
    try {
      const eucKrDecoder = new TextDecoder("euc-kr");
      return eucKrDecoder.decode(buffer);
    } catch {
      return buffer.toString("utf8");
    }
  }
}

export function parseCsvOrTsvTextToRows(text: string): string[][] {
  // If HTML table (some Korean bank .xls exports are HTML tables)
  if (/<table[\s>]/i.test(text) && /<tr[\s>]/i.test(text)) {
    const rows: string[][] = [];
    const trMatches = text.match(/<tr[\s>][\s\S]*?<\/tr>/gi) || [];
    for (const tr of trMatches) {
      const cells: string[] = [];
      const tdMatches = tr.match(/<t[dh][\s>][\s\S]*?<\/t[dh]>/gi) || [];
      for (const td of tdMatches) {
        const stripped = decodeXmlEntities(
          td
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .trim()
        );
        cells.push(stripped);
      }
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 0) return rows;
  }

  // Detect delimiter: if lines have tabs and no commas in header row, use tab
  const hasTabHeader = /거래일시\t출금\t입금/.test(text);
  const delimiter = hasTabHeader ? "\t" : ",";

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentField);
        currentField = "";
      } else if (ch === "\r" && next === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i++;
      } else if (ch === "\n" || ch === "\r") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function parseNumeric(val: unknown): number {
  if (val === undefined || val === null || val === "") return 0;
  const cleaned = String(val).replace(/[,원\s]/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export function extractBankTransactionsFromRows(
  rows: string[][],
  overrideAccountNo?: string
): { meta: BankImportMeta; transactions: ParsedBankTransaction[] } {
  let accountNo = overrideAccountNo && overrideAccountNo !== "AUTO" ? overrideAccountNo : "478-081383-04-018";
  let accountHolder = "주식회사 드래곤알피에이";
  let accountProduct = "기업자유예금(IBK평생주거래기업통장)";
  let bankName = "기업은행";
  let currentBalance: number | undefined;
  let periodStart: string | undefined;
  let periodEnd: string | undefined;

  const transactions: ParsedBankTransaction[] = [];

  for (const r of rows) {
    if (!r || r.length === 0) continue;
    const joinedRow = r.join(" ");

    // Extract IBK metadata block if present
    if (joinedRow.includes("계좌번호:") || joinedRow.includes("예금주명:")) {
      const metaText = r.find((c) => c && (c.includes("계좌번호:") || c.includes("예금주명:"))) || joinedRow;
      if (!overrideAccountNo || overrideAccountNo === "AUTO") {
        const accMatch = metaText.match(/계좌번호\s*:\s*([0-9-]+)/);
        if (accMatch) accountNo = accMatch[1].trim();
      }
      const holderMatch = metaText.match(/예금주명\s*:\s*([^\r\n]+?)(?:\s{2,}|예금종류|$)/);
      if (holderMatch) accountHolder = holderMatch[1].trim();
      const prodMatch = metaText.match(/예금종류\s*:\s*([^\r\n]+)/);
      if (prodMatch) accountProduct = prodMatch[1].trim();
      const balMatch = metaText.match(/현재잔액\s*:\s*([0-9,]+)/);
      if (balMatch) currentBalance = parseNumeric(balMatch[1]);
      const startMatch = metaText.match(/조회시작일자\s*:\s*(\d{4}-\d{2}-\d{2})/);
      if (startMatch) periodStart = startMatch[1];
      const endMatch = metaText.match(/조회종료일자\s*:\s*(\d{4}-\d{2}-\d{2})/);
      if (endMatch) periodEnd = endMatch[1];
      continue;
    }

    // Skip summary rows (",합계,...") or header rows ("거래일시")
    const col0 = String(r[0] || "").trim();
    const col1 = String(r[1] || "").trim();
    if (col0 === "합계" || col1 === "합계" || col1 === "거래일시" || col0 === "거래일시") {
      continue;
    }

    // Determine column offset:
    // Standard IBK format has index in col 0 ("1", "2"...) and datetime in col 1 ("YYYY-MM-DD HH:mm:ss")
    // Also support format where col 0 is datetime directly
    let offset = 0;
    const dtCol1 = col1.match(/^(\d{4}[-./]\d{2}[-./]\d{2})\s+(\d{2}:\d{2}:\d{2})$/);
    const dtCol0 = col0.match(/^(\d{4}[-./]\d{2}[-./]\d{2})(?:\s+(\d{2}:\d{2}:\d{2}))?$/);

    let transDate = "";
    let transTime = "00:00:00";

    if (dtCol1) {
      offset = 0;
      transDate = dtCol1[1].replace(/[./]/g, "-");
      transTime = dtCol1[2];
    } else if (dtCol0) {
      offset = -1;
      transDate = dtCol0[1].replace(/[./]/g, "-");
      transTime = dtCol0[2] || "00:00:00";
    } else {
      continue;
    }

    const withdrawalAmount = parseNumeric(r[2 + offset]);
    const depositAmount = parseNumeric(r[3 + offset]);
    const balanceAfter = parseNumeric(r[4 + offset]);
    const description = String(r[5 + offset] ?? "").trim();
    const counterpartyAccount = String(r[6 + offset] ?? "").trim();
    const counterpartyBank = String(r[7 + offset] ?? "").trim();
    const memo = String(r[8 + offset] ?? "").trim();
    const txChannel = String(r[9 + offset] ?? "").trim();
    const checkAmount = parseNumeric(r[10 + offset]);
    const cmsCode = String(r[11 + offset] ?? "").trim();
    const counterpartyHolder = String(r[12 + offset] ?? "").trim();

    const transType: "DEPOSIT" | "WITHDRAWAL" | "OPEN" =
      depositAmount > 0 ? "DEPOSIT" : withdrawalAmount > 0 ? "WITHDRAWAL" : "OPEN";
    const amount = depositAmount > 0 ? depositAmount : withdrawalAmount;
    const senderReceiver = description || counterpartyHolder || txChannel || "기타";
    const entityType: "CORP" | "INDIVIDUAL" = accountNo.includes("140") ? "INDIVIDUAL" : "CORP";
    const txHash = `${accountNo}|${transDate}|${transTime}|${withdrawalAmount}|${depositAmount}|${balanceAfter}`;

    transactions.push({
      entityType,
      bankName,
      accountNo,
      accountHolder,
      accountProduct,
      transDate,
      transTime,
      transType,
      amount,
      withdrawalAmount,
      depositAmount,
      balanceAfter,
      senderReceiver,
      counterpartyAccount: counterpartyAccount || null,
      counterpartyBank: counterpartyBank || null,
      memo: memo || null,
      txChannel: txChannel || null,
      checkAmount,
      cmsCode: cmsCode || null,
      counterpartyHolder: counterpartyHolder || null,
      txHash,
    });
  }

  return {
    meta: {
      bankName,
      accountNo,
      accountHolder,
      accountProduct,
      currentBalance,
      periodStart,
      periodEnd,
    },
    transactions,
  };
}

export function parseBankFileBuffer(
  buffer: Buffer,
  fileName: string,
  overrideAccountNo?: string
): { meta: BankImportMeta; transactions: ParsedBankTransaction[] } {
  const isZipXlsx =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04;

  let rows: string[][];
  if (isZipXlsx || fileName.toLowerCase().endsWith(".xlsx")) {
    rows = parseXlsxBufferToRows(buffer);
  } else {
    const text = decodeTextBuffer(buffer);
    rows = parseCsvOrTsvTextToRows(text);
  }

  return extractBankTransactionsFromRows(rows, overrideAccountNo);
}
