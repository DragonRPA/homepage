import type { Pool, PoolClient } from "pg";
import { runSchemaInitOnce } from "./erpSchemaCache";
import {
  type NtsBizState,
  getPartnerTradeBlockInfo,
  isPartnerTradeBlocked,
  normalizeBizNoDigits,
} from "./partnerStatusClient";

type QueryableDb = Pool | PoolClient;

export interface NtsBizStatusResult {
  businessNo: string;
  normalizedDigits: string;
  validFormat: boolean;
  ntsBizState: NtsBizState;
  ntsTaxType: string;
  ntsClosedDate: string | null;
  ntsStatusMsg: string;
  shouldBlockTrade: boolean;
  error?: string;
}

export class PartnerTradeBlockedError extends Error {
  statusCode = 400;
  code = "PARTNER_TRADE_BLOCKED";
  partnerId?: number;
  partnerName?: string;

  constructor(message: string, meta?: { partnerId?: number; partnerName?: string }) {
    super(message);
    this.name = "PartnerTradeBlockedError";
    this.partnerId = meta?.partnerId;
    this.partnerName = meta?.partnerName;
  }
}

const HOMETAX_STATUS_URL =
  "https://hometax.go.kr/wqAction.do?actionId=ATTABZAA001R08&screenId=UTEABAAA13&popupYn=false&realScreenId=";

/** erp_partners 테이블에 국세청 휴·폐업 상태 컬럼을 멱등하게 보강한다. */
export async function ensurePartnerStatusSchema(db: QueryableDb): Promise<void> {
  await runSchemaInitOnce("erp_partner_nts_schema_v1", async () => {
    await db.query(`
      ALTER TABLE erp_partners ADD COLUMN IF NOT EXISTS nts_biz_state VARCHAR(30);
      ALTER TABLE erp_partners ADD COLUMN IF NOT EXISTS nts_tax_type VARCHAR(80);
      ALTER TABLE erp_partners ADD COLUMN IF NOT EXISTS nts_closed_date VARCHAR(40);
      ALTER TABLE erp_partners ADD COLUMN IF NOT EXISTS nts_status_msg TEXT;
      ALTER TABLE erp_partners ADD COLUMN IF NOT EXISTS nts_checked_at TIMESTAMPTZ;
    `);
  });
}

/** 홈택스 ATTABZAA001R08 JSON 응답을 표준 국세청 사업자 상태로 파싱한다. */
export function parseHomeTaxStatusPayload(
  bizNoRaw: string,
  payload: any
): NtsBizStatusResult {
  const digits = normalizeBizNoDigits(bizNoRaw);
  const formatted =
    digits.length === 10
      ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
      : String(bizNoRaw || "").trim();

  const trtCntn = String(payload?.trtCntn || "")
    .replace(/\s+/g, " ")
    .trim();
  const smpcCntn = String(payload?.smpcBmanTrtCntn || "")
    .replace(/\s+/g, " ")
    .trim();
  const nrgt = String(payload?.nrgtTxprYn || "").toUpperCase() === "Y";

  let ntsBizState: NtsBizState = "ACTIVE";
  if (
    nrgt ||
    trtCntn.includes("등록되지 않은") ||
    trtCntn.includes("등록되어 있지 않은") ||
    trtCntn.includes("미등록") ||
    !trtCntn
  ) {
    ntsBizState = "UNREGISTERED";
  } else if (trtCntn.includes("폐업자")) {
    ntsBizState = "CLOSED";
  } else if (trtCntn.includes("휴업자")) {
    ntsBizState = "SUSPENDED";
  } else {
    ntsBizState = "ACTIVE";
  }

  let ntsTaxType = "";
  if (ntsBizState === "UNREGISTERED") {
    ntsTaxType = "미등록";
  } else if (trtCntn.includes("세금계산서 발급사업자")) {
    ntsTaxType = "간이과세자(세금계산서 발급사업자)";
  } else if (trtCntn.includes("일반과세자")) {
    ntsTaxType = "일반과세자";
  } else if (trtCntn.includes("간이과세자")) {
    ntsTaxType = "간이과세자";
  } else if (trtCntn.includes("면세사업자")) {
    ntsTaxType = "면세사업자";
  } else if (trtCntn.includes("과세특례자")) {
    ntsTaxType = "과세특례자";
  } else if (trtCntn.includes("비영리") || trtCntn.includes("고유번호")) {
    ntsTaxType = "비영리법인/고유번호";
  } else {
    ntsTaxType = ntsBizState === "CLOSED" ? "폐업" : ntsBizState === "SUSPENDED" ? "휴업" : "과세사업자";
  }

  let ntsClosedDate: string | null = null;
  if (ntsBizState === "CLOSED") {
    const m =
      trtCntn.match(/폐업일자\s*[:：]?\s*(\d{4}[.\-/]\d{2}[.\-/]\d{2})/) ||
      trtCntn.match(/(\d{4}[.\-/]\d{2}[.\-/]\d{2})/);
    if (m) {
      ntsClosedDate = m[1].replace(/[./]/g, "-").slice(0, 40);
    }
  } else if (ntsBizState === "SUSPENDED") {
    const m =
      trtCntn.match(/휴업기간\s*[:：]?\s*([0-9~\-.\s]+)/) ||
      trtCntn.match(/(\d{4}[.\-/]\d{2}[.\-/]\d{2}(?:\s*~\s*\d{4}[.\-/]\d{2}[.\-/]\d{2})?)/);
    if (m) {
      ntsClosedDate = m[1].trim().slice(0, 40);
    }
  }

  const combinedMsg = [trtCntn, smpcCntn && smpcCntn !== trtCntn ? smpcCntn : ""]
    .filter(Boolean)
    .join(" / ");

  return {
    businessNo: formatted,
    normalizedDigits: digits,
    validFormat: digits.length === 10,
    ntsBizState,
    ntsTaxType,
    ntsClosedDate,
    ntsStatusMsg: combinedMsg || "국세청 응답 수신",
    shouldBlockTrade: ntsBizState === "SUSPENDED" || ntsBizState === "CLOSED",
  };
}

/** 단일 사업자등록번호의 국세청 실시간 휴·폐업 상태를 조회한다. */
export async function queryNtsBizStatusSingle(bizNoRaw: string): Promise<NtsBizStatusResult> {
  const digits = normalizeBizNoDigits(bizNoRaw);
  if (digits.length !== 10) {
    return {
      businessNo: String(bizNoRaw || "").trim(),
      normalizedDigits: digits,
      validFormat: false,
      ntsBizState: "UNREGISTERED",
      ntsTaxType: "형식오류",
      ntsClosedDate: null,
      ntsStatusMsg: "유효한 10자리 사업자등록번호가 아닙니다.",
      shouldBlockTrade: false,
      error: "INVALID_FORMAT",
    };
  }

  const reqBody = JSON.stringify({
    dongCode: digits.slice(3, 5),
    inqrTrgtClCd: "1",
    mobYn: "N",
    psbSearch: "Y",
    pubcUserNo: "",
    txprDscmNo: digits,
  });

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(HOMETAX_STATUS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Accept: "application/json, text/plain, */*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        },
        body: reqBody,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        throw new Error(`국세청 홈택스 HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data?.resultMsg?.result && data.resultMsg.result !== "S") {
        throw new Error(data.resultMsg.message || "국세청 홈택스 조회 실패");
      }
      return parseHomeTaxStatusPayload(digits, data);
    } catch (err: any) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  }

  return {
    businessNo: `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`,
    normalizedDigits: digits,
    validFormat: true,
    ntsBizState: "UNREGISTERED",
    ntsTaxType: "조회오류",
    ntsClosedDate: null,
    ntsStatusMsg: `국세청 조회 실패: ${lastErr?.message || "네트워크 오류"}`,
    shouldBlockTrade: false,
    error: lastErr?.message || "FETCH_FAILED",
  };
}

/** 다수 사업자등록번호를 중복 제거 후 제한된 동시성(기본 5)으로 일괄 조회한다. */
export async function queryNtsBizStatusBatch(
  bizNoList: string[],
  concurrency = 5
): Promise<Map<string, NtsBizStatusResult>> {
  const uniqueDigits = Array.from(
    new Set(bizNoList.map((b) => normalizeBizNoDigits(b)).filter((d) => d.length === 10))
  );
  const resultMap = new Map<string, NtsBizStatusResult>();
  if (uniqueDigits.length === 0) return resultMap;

  const workerCount = Math.max(1, Math.min(concurrency, uniqueDigits.length));
  let cursor = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < uniqueDigits.length) {
        const idx = cursor++;
        const digits = uniqueDigits[idx];
        const res = await queryNtsBizStatusSingle(digits);
        resultMap.set(digits, res);
      }
    })
  );

  return resultMap;
}

/** 거래 생성 직전에 대상 거래처의 거래 가능 여부를 검증하고, 차단 대상이면 예외를 던진다. */
export async function assertPartnerTradable(
  db: QueryableDb,
  target: {
    partnerId?: number | string | null;
    customerName?: string | null;
    businessNo?: string | null;
  }
): Promise<void> {
  await ensurePartnerStatusSchema(db);

  const rawPid =
    target.partnerId !== undefined && target.partnerId !== null && String(target.partnerId).trim() !== ""
      ? parseInt(String(target.partnerId), 10)
      : null;
  const bizDigits = normalizeBizNoDigits(target.businessNo);
  const cleanName = String(target.customerName || "").trim();

  let row: any = null;

  if (rawPid && !Number.isNaN(rawPid)) {
    const res = await db.query(
      `SELECT id, name, business_no AS "businessNo", status,
              nts_biz_state AS "ntsBizState", nts_closed_date AS "ntsClosedDate"
       FROM erp_partners WHERE id = $1 LIMIT 1`,
      [rawPid]
    );
    row = res.rows[0] || null;
  }

  if (!row && bizDigits.length === 10) {
    const res = await db.query(
      `SELECT id, name, business_no AS "businessNo", status,
              nts_biz_state AS "ntsBizState", nts_closed_date AS "ntsClosedDate"
       FROM erp_partners
       WHERE REGEXP_REPLACE(COALESCE(business_no, ''), '[^0-9]', '', 'g') = $1
       ORDER BY id ASC
       LIMIT 1`,
      [bizDigits]
    );
    row = res.rows[0] || null;
  }

  if (!row && cleanName) {
    const res = await db.query(
      `SELECT id, name, business_no AS "businessNo", status,
              nts_biz_state AS "ntsBizState", nts_closed_date AS "ntsClosedDate"
       FROM erp_partners WHERE TRIM(name) = TRIM($1) ORDER BY id ASC LIMIT 1`,
      [cleanName]
    );
    row = res.rows[0] || null;
  }

  if (!row) return;

  if (isPartnerTradeBlocked(row)) {
    const info = getPartnerTradeBlockInfo(row);
    throw new PartnerTradeBlockedError(
      `[거래불가 차단] '${row.name}' 거래처는 ${info.reason} 신규 거래 등록 및 세금계산서 발행이 불가합니다.`,
      { partnerId: row.id, partnerName: row.name }
    );
  }
}
