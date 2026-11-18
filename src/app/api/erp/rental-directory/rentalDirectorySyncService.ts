import type { Pool, PoolClient } from "pg";
import { runSchemaInitOnce } from "@/lib/erpSchemaCache";
import officialCrawledSeeds from "./officialDirectoryData.json";
import type { RentalBizSeed } from "./rentalDirectorySeedData";

const SEED_BATCH_SIZE = 500;

function clipStr(val: string | undefined | null, maxLen: number): string {
  const s = String(val ?? "").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function getCanonicalBaseName(name: string): string {
  if (!name) return "";
  let s = String(name)
    .replace(/주식회사|\(주\)|㈜|유한회사|\(유\)|합자회사|\(합\)/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[\s\-–—_.,·•/]+/g, "")
    .toLowerCase()
    .trim();
  if (s === "병쳔지게차") s = "병천지게차";
  if (s === "갱주프로지게차") s = "경주프로지게차";
  if (s === "원삼스마일중기") s = "스마일중기";
  if (s === "두산지게차서울판매중부지사") s = "두산지게차서울중부판매";
  if (s === "두산지게차인천판매북부지사") s = "두산지게차인천북부판매";
  if (s === "두산지게차경북판매포항지사") s = "두산지게차포항판매";
  if (s === "두산지게차경북판매구미지사") s = "두산지게차경북판매";
  if (s === "두산지게차경남동부판매울산지사") s = "두산지게차울산판매";
  if (s === "두산지게차경남동부판매부산지사") s = "두산지게차부산판매";
  if (s === "두산충남지게차판매천안영업소") s = "두산지게차충남판매";
  if (s === "두산중장비제주판매") s = "두산지게차제주판매";
  if (s === "클라크지게차대구경북총판") s = "클라크지게차";
  if (s === "클라크지게차영남총판") s = "클라크지게차부산";
  return s;
}

function normalizePhoneDigits(phone: string): string {
  const d = String(phone || "").replace(/\D/g, "");
  return d.length >= 8 ? d : "";
}

function normalizeBizNoDigits(bizNo: string): string {
  const d = String(bizNo || "").replace(/\D/g, "");
  return d.length >= 5 ? d : "";
}

const DIRECTORY_SEED_UNNEST_INSERT_SQL = `INSERT INTO erp_rental_biz_directory (
  sector, company_name, business_no, ceo_name, region, address,
  biz_scope, main_brands, main_products, official_source, ksic_code,
  phone, website_url, scale_note, sales_status
)
SELECT
  u.sector, u.company_name, u.business_no, u.ceo_name, u.region, u.address,
  u.biz_scope, u.main_brands, u.main_products, u.official_source, u.ksic_code,
  u.phone, u.website_url, u.scale_note, u.sales_status
FROM UNNEST(
  $1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[], $5::varchar[], $6::text[],
  $7::varchar[], $8::varchar[], $9::text[], $10::varchar[], $11::varchar[],
  $12::varchar[], $13::text[], $14::text[], $15::varchar[]
) AS u(
  sector, company_name, business_no, ceo_name, region, address,
  biz_scope, main_brands, main_products, official_source, ksic_code,
  phone, website_url, scale_note, sales_status
)`;

function packDirectorySeedColumns(batch: RentalBizSeed[]): unknown[][] {
  const sectors: string[] = [];
  const companyNames: string[] = [];
  const businessNos: string[] = [];
  const ceoNames: string[] = [];
  const regions: string[] = [];
  const addresses: string[] = [];
  const bizScopes: string[] = [];
  const mainBrands: string[] = [];
  const mainProducts: string[] = [];
  const officialSources: string[] = [];
  const ksicCodes: string[] = [];
  const phones: string[] = [];
  const websiteUrls: string[] = [];
  const scaleNotes: string[] = [];
  const salesStatuses: string[] = [];

  for (const item of batch) {
    sectors.push(clipStr(item.sector, 30));
    companyNames.push(clipStr(item.companyName, 200));
    businessNos.push(clipStr(item.businessNo, 60));
    ceoNames.push(clipStr(item.ceoName, 100));
    regions.push(clipStr(item.region || "전국", 100));
    addresses.push(String(item.address || ""));
    bizScopes.push(clipStr(item.bizScope, 150));
    mainBrands.push(clipStr(item.mainBrands, 300));
    mainProducts.push(String(item.mainProducts || ""));
    officialSources.push(clipStr(item.officialSource, 250));
    ksicCodes.push(clipStr(item.ksicCode || (item.sector === "OA_PC" ? "71202" : "71201"), 100));
    phones.push(clipStr(item.phone, 100));
    websiteUrls.push(String(item.websiteUrl || ""));
    scaleNotes.push(String(item.scaleNote || ""));
    salesStatuses.push(clipStr(item.salesStatus || "TARGET", 50));
  }

  return [
    sectors,
    companyNames,
    businessNos,
    ceoNames,
    regions,
    addresses,
    bizScopes,
    mainBrands,
    mainProducts,
    officialSources,
    ksicCodes,
    phones,
    websiteUrls,
    scaleNotes,
    salesStatuses,
  ];
}

/**
 * 초기 공식 디렉토리 시드(officialDirectoryData.json)를 (sector, company_name) 기준으로
 * 중복 제거한 뒤 청크 단위 UNNEST 벌크 UPSERT로 동기화한다.
 */
export async function syncRentalDirectorySeeds(pool: Pool): Promise<number> {
  const dedupedMap = new Map<string, RentalBizSeed>();
  for (const raw of officialCrawledSeeds as RentalBizSeed[]) {
    const companyName = clipStr(raw.companyName, 200);
    if (!companyName) continue;
    const sector = (raw.sector || "FL") as "FL" | "AWP" | "OA_PC";
    dedupedMap.set(`${sector}__${companyName}`, {
      ...raw,
      sector,
      companyName,
    });
  }

  const deduped = Array.from(dedupedMap.values());
  for (let i = 0; i < deduped.length; i += SEED_BATCH_SIZE) {
    const batch = deduped.slice(i, i + SEED_BATCH_SIZE);
    await pool.query(
      `${DIRECTORY_SEED_UNNEST_INSERT_SQL}
      ON CONFLICT (sector, company_name) DO UPDATE SET
        region = EXCLUDED.region,
        address = COALESCE(NULLIF(EXCLUDED.address, ''), erp_rental_biz_directory.address),
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), erp_rental_biz_directory.phone),
        official_source = EXCLUDED.official_source,
        website_url = COALESCE(NULLIF(EXCLUDED.website_url, ''), erp_rental_biz_directory.website_url),
        updated_at = NOW()`,
      packDirectorySeedColumns(batch)
    );
  }

  return deduped.length;
}

export async function ensureRentalDirectoryTable(pool: Pool): Promise<void> {
  await runSchemaInitOnce("erp_rental_directory_schema_v1", async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_rental_biz_directory (
        id SERIAL PRIMARY KEY,
        sector VARCHAR(30) NOT NULL DEFAULT 'FL',
        company_name VARCHAR(200) NOT NULL,
        business_no VARCHAR(60) DEFAULT '',
        ceo_name VARCHAR(100) DEFAULT '',
        region VARCHAR(100) NOT NULL DEFAULT '전국',
        address TEXT DEFAULT '',
        biz_scope VARCHAR(150) NOT NULL DEFAULT '판매·임대 겸업',
        main_brands VARCHAR(300) DEFAULT '',
        main_products TEXT DEFAULT '',
        official_source VARCHAR(250) NOT NULL DEFAULT '공식 등록 확인',
        ksic_code VARCHAR(100) DEFAULT '71201',
        phone VARCHAR(100) DEFAULT '',
        website_url TEXT DEFAULT '',
        scale_note TEXT DEFAULT '',
        sales_status VARCHAR(50) NOT NULL DEFAULT 'TARGET',
        memo TEXT DEFAULT '',
        is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (sector, company_name)
      );
      ALTER TABLE erp_rental_biz_directory ENABLE ROW LEVEL SECURITY;
    `);

    const countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM erp_rental_biz_directory`);
    const existingCount = Number(countRes.rows[0]?.cnt || 0);
    if (existingCount < 850) {
      await syncRentalDirectorySeeds(pool);
    }
  });
}

export async function fetchDirectoryWithPartnerStatus(pool: Pool) {
  const res = await pool.query(`
    SELECT
      d.id,
      d.sector,
      d.company_name AS "companyName",
      d.business_no AS "businessNo",
      d.ceo_name AS "ceoName",
      d.region,
      d.address,
      d.biz_scope AS "bizScope",
      d.main_brands AS "mainBrands",
      d.main_products AS "mainProducts",
      d.official_source AS "officialSource",
      d.ksic_code AS "ksicCode",
      d.phone,
      d.website_url AS "websiteUrl",
      d.scale_note AS "scaleNote",
      d.sales_status AS "salesStatus",
      d.memo,
      d.is_bookmarked AS "isBookmarked",
      d.updated_at AS "updatedAt",
      d.created_at AS "createdAt",
      EXISTS (
        SELECT 1 FROM erp_partners p
        WHERE p.partner_type IN ('CUSTOMER', 'BOTH')
          AND (
            (d.business_no <> '' AND p.business_no = d.business_no)
            OR p.name = d.company_name
          )
      ) AS "isRegisteredCustomer",
      EXISTS (
        SELECT 1 FROM erp_partners p
        WHERE p.partner_type IN ('VENDOR', 'BOTH')
          AND (
            (d.business_no <> '' AND p.business_no = d.business_no)
            OR p.name = d.company_name
          )
      ) AS "isRegisteredVendor"
    FROM erp_rental_biz_directory d
    ORDER BY d.is_bookmarked DESC,
             CASE WHEN d.sales_status = 'CUSTOMER' THEN 0 ELSE 1 END ASC,
             CASE d.sector WHEN 'FL' THEN 1 WHEN 'AWP' THEN 2 ELSE 3 END ASC,
             d.id ASC
  `);
  return res.rows;
}

interface PendingUpdateEntry {
  id: number;
  businessNo: string;
  ceoName: string;
  address: string;
  phone: string;
  websiteUrl: string;
}

/**
 * 발굴·크롤링된 사업자 목록을 기존 DB 행과 메모리에서 매칭·중복 제거한 뒤
 * 단일 UNNEST UPDATE(기존 행 최대 1회) + 단일 UNNEST INSERT(신규 행 최대 1회)로 반영한다.
 */
export async function upsertDiscoveredRentalBizBatch(
  pool: Pool,
  items: RentalBizSeed[]
): Promise<number> {
  if (!items || items.length === 0) return 0;

  const existingRes = await pool.query(
    `SELECT id, sector, company_name, business_no, phone FROM erp_rental_biz_directory`
  );
  const byExactLowerName = new Map<string, number>();
  const byBaseName = new Map<string, number>();
  const byPhone = new Map<string, number>();
  const byBizNo = new Map<string, number>();

  for (const r of existingRes.rows) {
    const rawName = String(r.company_name || "").trim().toLowerCase();
    const base = getCanonicalBaseName(r.company_name);
    const phone = normalizePhoneDigits(r.phone);
    const bizNo = normalizeBizNoDigits(r.business_no);
    if (rawName && !byExactLowerName.has(`${r.sector}__${rawName}`)) {
      byExactLowerName.set(`${r.sector}__${rawName}`, Number(r.id));
    }
    if (base && !byBaseName.has(`${r.sector}__${base}`)) {
      byBaseName.set(`${r.sector}__${base}`, Number(r.id));
    }
    if (phone && !byPhone.has(`${r.sector}__${phone}`)) {
      byPhone.set(`${r.sector}__${phone}`, Number(r.id));
    }
    if (bizNo && !byBizNo.has(`${r.sector}__${bizNo}`)) {
      byBizNo.set(`${r.sector}__${bizNo}`, Number(r.id));
    }
  }

  const updatesById = new Map<number, PendingUpdateEntry>();
  const pendingInserts: RentalBizSeed[] = [];
  const pendingByExactLowerName = new Map<string, number>();
  const pendingByBaseName = new Map<string, number>();
  const pendingByPhone = new Map<string, number>();
  const pendingByBizNo = new Map<string, number>();

  for (const item of items) {
    const cname = clipStr(item.companyName, 200);
    if (!cname) continue;
    const sector = (item.sector || "FL") as "FL" | "AWP" | "OA_PC";
    const exactLowerKey = `${sector}__${cname.toLowerCase()}`;
    const base = getCanonicalBaseName(cname);
    const phone = normalizePhoneDigits(item.phone);
    const bizNo = normalizeBizNoDigits(item.businessNo);
    const baseKey = base ? `${sector}__${base}` : "";
    const phoneKey = phone ? `${sector}__${phone}` : "";
    const bizNoKey = bizNo ? `${sector}__${bizNo}` : "";

    const matchedId =
      (bizNoKey ? byBizNo.get(bizNoKey) : undefined) ||
      (phoneKey ? byPhone.get(phoneKey) : undefined) ||
      byExactLowerName.get(exactLowerKey) ||
      (baseKey ? byBaseName.get(baseKey) : undefined);

    if (matchedId) {
      const prev = updatesById.get(matchedId);
      if (prev) {
        if (!prev.businessNo && item.businessNo) prev.businessNo = clipStr(item.businessNo, 60);
        if (!prev.ceoName && item.ceoName) prev.ceoName = clipStr(item.ceoName, 100);
        if (!prev.address && item.address) prev.address = String(item.address);
        if (!prev.phone && item.phone) prev.phone = clipStr(item.phone, 100);
        if (!prev.websiteUrl && item.websiteUrl) prev.websiteUrl = String(item.websiteUrl);
      } else {
        updatesById.set(matchedId, {
          id: matchedId,
          businessNo: clipStr(item.businessNo, 60),
          ceoName: clipStr(item.ceoName, 100),
          address: String(item.address || ""),
          phone: clipStr(item.phone, 100),
          websiteUrl: String(item.websiteUrl || ""),
        });
      }
      continue;
    }

    const pendingIdx =
      (bizNoKey ? pendingByBizNo.get(bizNoKey) : undefined) ??
      (phoneKey ? pendingByPhone.get(phoneKey) : undefined) ??
      pendingByExactLowerName.get(exactLowerKey) ??
      (baseKey ? pendingByBaseName.get(baseKey) : undefined);

    if (pendingIdx !== undefined) {
      const target = pendingInserts[pendingIdx];
      if (!target.businessNo && item.businessNo) target.businessNo = clipStr(item.businessNo, 60);
      if (!target.ceoName && item.ceoName) target.ceoName = clipStr(item.ceoName, 100);
      if (!target.address && item.address) target.address = String(item.address);
      if (!target.phone && item.phone) target.phone = clipStr(item.phone, 100);
      if (!target.websiteUrl && item.websiteUrl) target.websiteUrl = String(item.websiteUrl);
      continue;
    }

    const newIdx = pendingInserts.length;
    pendingInserts.push({
      sector,
      companyName: cname,
      businessNo: clipStr(item.businessNo, 60),
      ceoName: clipStr(item.ceoName, 100),
      region: clipStr(item.region || "전국", 100),
      address: String(item.address || ""),
      bizScope: clipStr(item.bizScope || "판매·임대 겸업", 150),
      mainBrands: clipStr(item.mainBrands, 300),
      mainProducts: String(item.mainProducts || ""),
      officialSource: clipStr(item.officialSource || "공식 등록 확인", 250),
      ksicCode: clipStr(item.ksicCode || (sector === "OA_PC" ? "71202" : "71201"), 100),
      phone: clipStr(item.phone, 100),
      websiteUrl: String(item.websiteUrl || ""),
      scaleNote: String(item.scaleNote || ""),
      salesStatus: clipStr(item.salesStatus || "TARGET", 50),
    });
    pendingByExactLowerName.set(exactLowerKey, newIdx);
    if (baseKey && !pendingByBaseName.has(baseKey)) pendingByBaseName.set(baseKey, newIdx);
    if (phoneKey && !pendingByPhone.has(phoneKey)) pendingByPhone.set(phoneKey, newIdx);
    if (bizNoKey && !pendingByBizNo.has(bizNoKey)) pendingByBizNo.set(bizNoKey, newIdx);
  }

  if (updatesById.size > 0) {
    const updIds: number[] = [];
    const updBizNos: string[] = [];
    const updCeoNames: string[] = [];
    const updAddresses: string[] = [];
    const updPhones: string[] = [];
    const updWebsites: string[] = [];

    for (const entry of updatesById.values()) {
      updIds.push(entry.id);
      updBizNos.push(entry.businessNo);
      updCeoNames.push(entry.ceoName);
      updAddresses.push(entry.address);
      updPhones.push(entry.phone);
      updWebsites.push(entry.websiteUrl);
    }

    await pool.query(
      `UPDATE erp_rental_biz_directory AS d
       SET business_no = COALESCE(NULLIF(u.business_no, ''), d.business_no),
           ceo_name    = COALESCE(NULLIF(u.ceo_name, ''), d.ceo_name),
           address     = CASE WHEN (d.address IS NULL OR d.address = '' OR d.address = '전국') AND u.address <> '' THEN u.address ELSE d.address END,
           phone       = COALESCE(NULLIF(u.phone, ''), d.phone),
           website_url = COALESCE(NULLIF(u.website_url, ''), d.website_url),
           updated_at  = NOW()
       FROM UNNEST(
         $1::int[],
         $2::varchar[],
         $3::varchar[],
         $4::text[],
         $5::varchar[],
         $6::text[]
       ) AS u(id, business_no, ceo_name, address, phone, website_url)
       WHERE d.id = u.id`,
      [updIds, updBizNos, updCeoNames, updAddresses, updPhones, updWebsites]
    );
  }

  if (pendingInserts.length > 0) {
    await pool.query(
      `${DIRECTORY_SEED_UNNEST_INSERT_SQL}
      ON CONFLICT (sector, company_name) DO UPDATE SET
        business_no = COALESCE(NULLIF(EXCLUDED.business_no, ''), erp_rental_biz_directory.business_no),
        ceo_name    = COALESCE(NULLIF(EXCLUDED.ceo_name, ''), erp_rental_biz_directory.ceo_name),
        address     = COALESCE(NULLIF(EXCLUDED.address, ''), erp_rental_biz_directory.address),
        phone       = COALESCE(NULLIF(EXCLUDED.phone, ''), erp_rental_biz_directory.phone),
        website_url = COALESCE(NULLIF(EXCLUDED.website_url, ''), erp_rental_biz_directory.website_url),
        updated_at  = NOW()`,
      packDirectorySeedColumns(pendingInserts)
    );
  }

  return updatesById.size + pendingInserts.length;
}

function formatCrawlRegion(rawRegion: string, rawAddr: string): string {
  const s = `${rawRegion || ""} ${rawAddr || ""}`.trim();
  const tokens = (rawAddr || "").trim().split(/\s+/);
  const sigungu = tokens[1] || "";
  let sido = "경기";
  if (s.includes("서울")) sido = "서울";
  else if (s.includes("경기")) sido = "경기";
  else if (s.includes("인천")) sido = "인천";
  else if (s.includes("부산")) sido = "부산";
  else if (s.includes("대구")) sido = "대구";
  else if (s.includes("광주광역시") || /^광주\s/.test(s) || rawRegion === "광주" || rawRegion === "광주광역시") sido = "광주";
  else if (s.includes("대전")) sido = "대전";
  else if (s.includes("울산")) sido = "울산";
  else if (s.includes("세종")) sido = "세종";
  else if (s.includes("강원")) sido = "강원";
  else if (s.includes("충북") || s.includes("충청북도")) sido = "충북";
  else if (s.includes("충남") || s.includes("충청남도")) sido = "충남";
  else if (s.includes("전북") || s.includes("전라북도") || s.includes("전북특별자치도")) sido = "전북";
  else if (s.includes("전남") || s.includes("전라남도")) sido = "전남";
  else if (s.includes("경북") || s.includes("경상북도")) sido = "경북";
  else if (s.includes("경남") || s.includes("경상남도")) sido = "경남";
  else if (s.includes("제주")) sido = "제주";
  return sigungu ? `${sido} (${sigungu})` : sido;
}

export async function crawlOfficialBoardsLive(
  pool: Pool,
  targetSector: "FL" | "AWP" | "OA_PC" | "ALL"
): Promise<number> {
  const crawled: RentalBizSeed[] = [];

  // 1) AWP: 한국고소작업대임대업협동조합(klra.or.kr) 지역별 회원사 게시판 실시간 크롤링
  if (targetSector === "AWP" || targetSector === "ALL") {
    for (let page = 1; page <= 3; page++) {
      try {
        const url = `http://www.klra.or.kr/bbs/board.php?bo_table=member&page=${page}`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(7000),
        });
        if (!res.ok) continue;
        const html = await res.text();
        const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
        if (!tbodyMatch) continue;
        const trMatches = Array.from(tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
        for (const tr of trMatches) {
          const tdMatches = Array.from(tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
            m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
          );
          const linkMatch = tr[1].match(/href=["']([^"']*wr_id=(\d+)[^"']*)["']/i);
          if (tdMatches.length >= 4 && tdMatches[1]) {
            const rawRegion = tdMatches[0];
            const companyName = tdMatches[1];
            const address = tdMatches[2];
            const phone = tdMatches[3];
            const wrId = linkMatch ? linkMatch[2] : "";
            const detailUrl = wrId
              ? `http://www.klra.or.kr/bbs/board.php?bo_table=member&wr_id=${wrId}&page=${page}`
              : url;
            const region = formatCrawlRegion(rawRegion, address);
            crawled.push({
              sector: "AWP",
              companyName,
              businessNo: "",
              ceoName: "",
              region,
              address,
              bizScope: "고소작업대(AWP) 장단기 임대 전문",
              mainBrands: "Genie, JLG, Skyjack, 호이스트, 수직·굴절 리프트",
              mainProducts: "시저형(수직형)·굴절형·직진형 고소작업대 임대 및 현장배차",
              officialSource: "한국고소작업대임대업협동조합 공식 회원사 (klra.or.kr)",
              ksicCode: "71201 (건설·물류장비 임대업)",
              phone,
              websiteUrl: detailUrl,
              scaleNote: `한국고소작업대임대업협동조합 정회원 (${region})`,
              salesStatus: "TARGET",
            });
          }
        }
      } catch {
        // ignore network timeout on individual page
      }
    }
  }

  // 2) FL: 전국지게차연합·우리동네지게차(udj.kr) 전국업체 원부 실시간 크롤링
  if (targetSector === "FL" || targetSector === "ALL") {
    for (let page = 1; page <= 5; page++) {
      try {
        const url = `https://www.udj.kr/kwa-info_company?PB_1622438032=${page}`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(7000),
        });
        if (!res.ok) continue;
        const html = await res.text();
        const trMatches = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
        for (const tr of trMatches) {
          const rowHtml = tr[1];
          const idMatch = rowHtml.match(/href=["'](kwa-info_company_v-\d+)["']/i);
          const nameMatch = rowHtml.match(/<span style="font-size:\s*16px;\s*line-height:16px;">([\s\S]*?)<\/span>/i);
          const areaMatch = rowHtml.match(/<div class="-fdArea"[^>]*>([\s\S]*?)<span class="-bdBtwBar">/i);
          const phoneMatch = rowHtml.match(/<span class="-fdPhoneIcon">([\s\S]*?)<\/span>/i);
          const serviceMatch = rowHtml.match(/<div class="-fdService">([\s\S]*?)<\/div>/i);
          if (!nameMatch) continue;
          const companyName = nameMatch[1].replace(/<[^>]+>/g, "").trim();
          const address = (areaMatch?.[1] || "").replace(/<[^>]+>/g, "").trim();
          const phone = (phoneMatch?.[1] || "").replace(/<[^>]+>/g, "").trim();
          const svc = (serviceMatch?.[1] || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
          const detailUrl = idMatch ? `https://www.udj.kr/${idMatch[1]}` : url;
          const region = formatCrawlRegion("", address);
          crawled.push({
            sector: "FL",
            companyName,
            businessNo: "",
            ceoName: "",
            region,
            address,
            bizScope: `지게차 ${svc || "임대/렌탈 · 매매"}`,
            mainBrands: "두산, HD현대, 클라크, 토요타, 니찌유, 전동·디젤지게차",
            mainProducts: `전동(입식·좌식)·디젤 지게차 ${svc || "임대/렌탈 · 매매"}`,
            officialSource: "전국지게차연합·우리동네지게차(udj.kr) 공식 등록업체",
            ksicCode: "71201 (건설·물류장비 임대 및 매매업)",
            phone,
            websiteUrl: detailUrl,
            scaleNote: `${region} 거점 지게차 공식 등록 사업자 (${svc})`,
            salesStatus: "TARGET",
          });
        }
      } catch {
        // ignore timeout
      }
    }

    // 2-B) FL: 다음카페 2979지게차연합회 (m.cafe.daum.net/forklift2979.com) 최신 게시글 실시간 파싱
    const cafeBoards = [
      { fldid: "kmCN", name: "후원금내역" },
      { fldid: "jESV", name: "홍보물신청" },
      { fldid: "jzMy", name: "찬조금·운영기금" },
      { fldid: "jQdv", name: "1577-6644콜회원" },
    ];
    for (const cb of cafeBoards) {
      try {
        const cafeUrl = `https://m.cafe.daum.net/forklift2979.com/${cb.fldid}`;
        const res = await fetch(cafeUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
          },
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) continue;
        const html = await res.text();
        const pushes = Array.from(html.matchAll(/articles\.push\(\{([\s\S]*?)\}\);/g));
        for (const m of pushes) {
          const block = m[1];
          const dataid = block.match(/dataid:\s*(\d+)/)?.[1] || "";
          const title = (block.match(/title:\s*"([^"]*)"/)?.[1] || "")
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&");
          const writer = (block.match(/writerNickname:\s*"([^"]*)"/)?.[1] || "")
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&");
          const combined = `${title} ${writer}`;
          const bizMatch = combined.match(
            /((?:\(주\)|주식회사\s*)?[가-힣A-Za-z0-9]{2,12}(?:지게차|중기|건기|건설기계|중장비))(?!연합회|협의회|협회)/
          );
          if (!bizMatch) continue;
          const companyName = bizMatch[1].trim();
          if (
            /^(2979지게차|전국지게차|콜지게차|불법지게차|영업용지게차|두산지게차|현대지게차)$/.test(
              companyName
            ) ||
            /\d+톤/.test(companyName)
          ) {
            continue;
          }
          const ceoMatch = combined.match(/([가-힣]{2,4})\s*(?:대표|회장|사장)/);
          const ceoName =
            ceoMatch && ceoMatch[1] !== "강성조" && ceoMatch[1] !== "사무국"
              ? ceoMatch[1]
              : "";
          const phoneMatch = combined.match(
            /(01[016789][-\s.]*\d{3,4}[-\s.]*\d{4}|0\d{1,2}[-\s.)]*\d{3,4}[-\s.]*\d{4})/
          );
          const phone = phoneMatch ? phoneMatch[1].replace(/[.)\s]+/g, "-") : "";
          const region = formatCrawlRegion("", title);
          crawled.push({
            sector: "FL",
            companyName,
            businessNo: "",
            ceoName,
            region,
            address: region,
            bizScope: "지게차 임대 · 매매 · 배차",
            mainBrands: "두산밥캣, HD현대, 클라크, 토요타 디젤·전동지게차",
            mainProducts: "영업용 지게차 장단기 임대 및 현장 중량물 하역·배차",
            officialSource: `2979지게차연합회 · ${cb.name} (cafe.daum.net/forklift2979.com)`,
            ksicCode: "71201 (건설·물류장비 임대업)",
            phone,
            websiteUrl: dataid
              ? `https://cafe.daum.net/forklift2979.com/${cb.fldid}/${dataid}`
              : "https://cafe.daum.net/forklift2979.com",
            scaleNote: `2979지게차연합회(전국지게차연합회) 확인 사업자 · ${cb.name}`,
            salesStatus: "TARGET",
          });
        }
      } catch {
        // ignore timeout
      }
    }
  }

  // 3) OA_PC: 신도리코(sindoh.com) 전국 공식 파트너·지정점 원부 실시간 크롤링
  if (targetSector === "OA_PC" || targetSector === "ALL") {
    try {
      const res = await fetch("https://www.sindoh.com/_hcms/api/proxy/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
          Referer: "https://www.sindoh.com/support/service-center",
        },
        body: JSON.stringify({
          url: "/crm/v3/objects/companies/search",
          filterGroups: [
            {
              filters: [
                { propertyName: "partner_type", operator: "EQ", value: "printers" },
                { propertyName: "partner_status", operator: "EQ", value: "Active" },
              ],
            },
          ],
          properties: ["name", "alternate_name", "address", "city_province", "phone", "service_partner_grade"],
          limit: 200,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const json = await res.json();
        const rows = json?.data?.results || [];
        for (const r of rows) {
          const p = r.properties || {};
          const companyName = String(p.alternate_name || p.name || "").trim();
          if (!companyName) continue;
          const address = String(p.address || "").trim();
          const phone = String(p.phone || "").trim();
          const grade = String(p.service_partner_grade || "서비스 파트너").trim();
          const region = formatCrawlRegion(String(p.city_province || ""), address);
          const hasSindohOrMfpWord = /신도|리코|리소|복사기|프린팅|프린터|컬러|잉크|인쇄|제록스|캐논|교세라/.test(companyName);
          const hasServiceCenter = /서비스\s*센터|서비스센타/.test(companyName);
          const hasOaOrOfficeWord = /OA|O\.A|오에이|오\.에이|사무기|오피스|문구|문방/.test(companyName);
          const hasPcOrItWord = /컴퓨터|컴|피씨|PC|전산|정보|아이티|IT|네트웍|네트워크|시스|테크|솔루션|데이타|데이터|소프트|뱅크|씨앤씨|C&C/.test(companyName);

          let supplyType: "OA" | "MFP" | "BOTH" = "MFP";
          if (hasServiceCenter || (hasSindohOrMfpWord && !hasOaOrOfficeWord && !hasPcOrItWord) || /프린팅|복사기|리소|컬러에이지/.test(companyName)) {
            supplyType = "MFP";
          } else if (!hasSindohOrMfpWord && (hasPcOrItWord || /문방사우|오에이디포|OA DEPOT|오피스웨이브|플러스오피스/.test(companyName))) {
            supplyType = "OA";
          } else if (hasOaOrOfficeWord || (hasSindohOrMfpWord && hasPcOrItWord)) {
            supplyType = "BOTH";
          }

          const bizScope =
            supplyType === "OA"
              ? `[공급: OA] PC·전산·사무용 OA기기 임대·판매 (${grade})`
              : supplyType === "MFP"
              ? `[공급: 복합기] 디지털 복합기·프린터 전문 임대·정비 (${grade})`
              : `[공급: 둘다(OA+복합기)] 디지털 복합기 및 사무용 OA기기 통합 임대 (${grade})`;
          const mainBrands =
            supplyType === "OA"
              ? "삼성, LG, HP, 사무용 PC·노트북·모니터·세단기·전산 OA 장비 (신도리코 협력)"
              : supplyType === "MFP"
              ? "신도리코(Sindoh D450/N610), A3/A4 디지털 복합기·레이저 프린터·문서솔루션"
              : "신도리코(Sindoh) 디지털 복합기·프린터, 사무용 PC·노트북·세단기·종합 OA기기";
          const mainProducts =
            supplyType === "OA"
              ? "기업·관공서 데스크톱 PC, 노트북, 모니터, 문서세단기, 전산·사무자동화(OA) 기기 임대 및 유지보수"
              : supplyType === "MFP"
              ? "컬러/흑백 디지털 복합기, 고속 레이저 프린터, 복사기 장단기 임대(렌탈) 및 소모품·유지보수"
              : "컬러/흑백 디지털 복합기·프린터 임대 및 사무용 PC·문서세단기·제본기 등 종합 OA기기 통합 공급·유지보수";

          crawled.push({
            sector: "OA_PC",
            companyName,
            businessNo: "",
            ceoName: "",
            region,
            address,
            bizScope,
            mainBrands,
            mainProducts,
            officialSource: `신도리코 전국 공식 파트너·지정점 원부 (${grade})`,
            ksicCode: "71202 (사무용 기계·장비 임대업)",
            phone,
            websiteUrl: "https://www.sindoh.com/support/service-center",
            scaleNote: `신도리코 공식 인증 ${grade} (${region})`,
            salesStatus: "TARGET",
          });
        }
      }
    } catch {
      // ignore timeout
    }
  }

  return upsertDiscoveredRentalBizBatch(pool, crawled);
}

interface PartnerInsertRow {
  partnerType: string;
  partnerCode: string;
  name: string;
  businessNo: string | null;
  ceoName: string | null;
  bizType: string;
  bizItem: string;
  address: string | null;
  mainPhone: string | null;
  memo: string;
}

/**
 * 선택된 디렉토리 사업자(단건/일괄)를 단일 트랜잭션 내에서 ERP 거래처(erp_partners)로 연동한다.
 * 기존 매칭 거래처 1회 잠금 조회 -> 미보유 BOTH 승격 일괄 UPDATE -> 신규 고유 partner_code 메모리 채번 후
 * 단일 UNNEST INSERT -> 디렉토리 sales_status 일괄 UPDATE 순으로 N+1 없이 처리한다.
 */
export async function registerDirectoryPartnersTx(
  pool: Pool,
  ids: number[],
  partnerType: "CUSTOMER" | "VENDOR"
): Promise<{ newlyCreatedCount: number; alreadyExistedCount: number }> {
  const cleanIds = Array.from(
    new Set(ids.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0))
  );
  if (cleanIds.length === 0) {
    return { newlyCreatedCount: 0, alreadyExistedCount: 0 };
  }

  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    const rowsRes = await client.query(
      `SELECT id, sector, company_name, business_no, ceo_name, region, address, phone, official_source, main_brands, main_products
       FROM erp_rental_biz_directory
       WHERE id = ANY($1::int[])`,
      [cleanIds]
    );

    if (rowsRes.rows.length === 0) {
      await client.query("COMMIT");
      return { newlyCreatedCount: 0, alreadyExistedCount: 0 };
    }

    const nameSet = new Set<string>();
    const bizNoSet = new Set<string>();
    for (const biz of rowsRes.rows) {
      const name = String(biz.company_name || "").trim();
      const cleanBizNo = String(biz.business_no || "").trim();
      if (name) nameSet.add(name);
      if (cleanBizNo) bizNoSet.add(cleanBizNo);
    }

    const names = Array.from(nameSet);
    const bizNos = Array.from(bizNoSet);

    const existRes = await client.query(
      `SELECT id, name, business_no, partner_type
       FROM erp_partners
       WHERE name = ANY($1::text[])
          OR ($2::text[] IS NOT NULL AND business_no = ANY($2::text[]))
       FOR UPDATE`,
      [names, bizNos.length > 0 ? bizNos : null]
    );

    const partnerByName = new Map<string, { id: number; partner_type: string }>();
    const partnerByBizNo = new Map<string, { id: number; partner_type: string }>();
    for (const p of existRes.rows) {
      const pName = String(p.name || "").trim();
      const pBizNo = String(p.business_no || "").trim();
      const entry = { id: Number(p.id), partner_type: String(p.partner_type || "") };
      if (pName && !partnerByName.has(pName)) partnerByName.set(pName, entry);
      if (pBizNo && !partnerByBizNo.has(pBizNo)) partnerByBizNo.set(pBizNo, entry);
    }

    let newlyCreatedCount = 0;
    let alreadyExistedCount = 0;
    const promoteToBothIds = new Set<number>();
    const toInsertRows: Omit<PartnerInsertRow, "partnerCode">[] = [];
    const pendingNames = new Set<string>();
    const pendingBizNos = new Set<string>();
    const processedDirIds: number[] = [];

    for (const biz of rowsRes.rows) {
      processedDirIds.push(Number(biz.id));
      const companyName = String(biz.company_name || "").trim();
      const cleanBizNo = String(biz.business_no || "").trim();

      const existing =
        partnerByName.get(companyName) ||
        (cleanBizNo ? partnerByBizNo.get(cleanBizNo) : undefined);

      if (existing) {
        alreadyExistedCount++;
        if (existing.partner_type !== partnerType && existing.partner_type !== "BOTH") {
          promoteToBothIds.add(existing.id);
        }
        continue;
      }

      if (pendingNames.has(companyName) || (cleanBizNo && pendingBizNos.has(cleanBizNo))) {
        alreadyExistedCount++;
        continue;
      }

      const sectorName =
        biz.sector === "FL"
          ? "지게차(FL) 판매·임대업"
          : biz.sector === "AWP"
          ? "고소작업대(AWP) 판매·임대업"
          : "컴퓨터 및 사무용 기계·장비(OA) 임대업";

      toInsertRows.push({
        partnerType,
        name: companyName,
        businessNo: cleanBizNo || null,
        ceoName: biz.ceo_name ? String(biz.ceo_name) : null,
        bizType: "사업지원 및 임대서비스업, 도소매",
        bizItem: sectorName,
        address: biz.address || biz.region ? String(biz.address || biz.region) : null,
        mainPhone: biz.phone ? String(biz.phone) : null,
        memo: `[렌탈사업자DB 등록 | 확인경로: ${biz.official_source}] 취급브랜드: ${biz.main_brands || "-"} / 품목: ${biz.main_products || "-"}`,
      });
      pendingNames.add(companyName);
      if (cleanBizNo) pendingBizNos.add(cleanBizNo);
      newlyCreatedCount++;
    }

    if (promoteToBothIds.size > 0) {
      await client.query(
        `UPDATE erp_partners
         SET partner_type = 'BOTH', updated_at = NOW()
         WHERE id = ANY($1::int[])`,
        [Array.from(promoteToBothIds)]
      );
    }

    if (toInsertRows.length > 0) {
      const prefix = partnerType === "VENDOR" ? "VEND" : "CUST";
      const year = new Date().getFullYear();
      const codePattern = `${prefix}-${year}-%`;

      const existingCodesRes = await client.query(
        `SELECT partner_code FROM erp_partners WHERE partner_code LIKE $1`,
        [codePattern]
      );

      let maxSeq = 0;
      const usedCodes = new Set<string>();
      for (const row of existingCodesRes.rows) {
        const code = String(row.partner_code || "").trim();
        usedCodes.add(code);
        const match = code.match(/-([0-9]+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }

      let candidateSeq = maxSeq + 1;
      const partnerTypes: string[] = [];
      const partnerCodes: string[] = [];
      const insNames: string[] = [];
      const insBizNos: (string | null)[] = [];
      const insCeoNames: (string | null)[] = [];
      const insBizTypes: string[] = [];
      const insBizItems: string[] = [];
      const insAddresses: (string | null)[] = [];
      const insPhones: (string | null)[] = [];
      const insMemos: string[] = [];

      for (const row of toInsertRows) {
        let finalCode = "";
        while (true) {
          const candidateCode = `${prefix}-${year}-${String(candidateSeq).padStart(3, "0")}`;
          candidateSeq++;
          if (!usedCodes.has(candidateCode)) {
            usedCodes.add(candidateCode);
            finalCode = candidateCode;
            break;
          }
        }
        partnerTypes.push(row.partnerType);
        partnerCodes.push(finalCode);
        insNames.push(row.name);
        insBizNos.push(row.businessNo);
        insCeoNames.push(row.ceoName);
        insBizTypes.push(row.bizType);
        insBizItems.push(row.bizItem);
        insAddresses.push(row.address);
        insPhones.push(row.mainPhone);
        insMemos.push(row.memo);
      }

      await client.query(
        `INSERT INTO erp_partners (
          partner_type, partner_code, name, business_no, ceo_name,
          biz_type, biz_item, address, main_phone,
          statement_closing_day, tax_invoice_closing_day, payment_due_day,
          status, memo, created_at, updated_at
        )
        SELECT
          u.partner_type, u.partner_code, u.name, u.business_no, u.ceo_name,
          u.biz_type, u.biz_item, u.address, u.main_phone,
          '매월 25일', '익월 10일', '익월 15일',
          'ACTIVE', u.memo, NOW(), NOW()
        FROM UNNEST(
          $1::text[],
          $2::text[],
          $3::text[],
          $4::text[],
          $5::text[],
          $6::text[],
          $7::text[],
          $8::text[],
          $9::text[],
          $10::text[]
        ) AS u(
          partner_type, partner_code, name, business_no, ceo_name,
          biz_type, biz_item, address, main_phone, memo
        )`,
        [
          partnerTypes,
          partnerCodes,
          insNames,
          insBizNos,
          insCeoNames,
          insBizTypes,
          insBizItems,
          insAddresses,
          insPhones,
          insMemos,
        ]
      );
    }

    const newStatus = partnerType === "CUSTOMER" ? "CUSTOMER" : "PARTNER";
    await client.query(
      `UPDATE erp_rental_biz_directory
       SET sales_status = $1, updated_at = NOW()
       WHERE id = ANY($2::int[])`,
      [newStatus, processedDirIds]
    );

    await client.query("COMMIT");
    return { newlyCreatedCount, alreadyExistedCount };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
