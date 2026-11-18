export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { decryptPii } from "@/lib/piiCrypto";
import { runSchemaInitOnce } from "@/lib/erpSchemaCache";
import officialCrawledSeeds from "./officialDirectoryData.json";

import { RentalBizSeed, INITIAL_VERIFIED_OPERATORS } from "./rentalDirectorySeedData";
export type { RentalBizSeed };

async function ensureRentalDirectoryTable() {
  await runSchemaInitOnce("erp_rental_directory_schema_v1", async () => {
    const pool = getErpPool();
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
      const allSeeds: RentalBizSeed[] = officialCrawledSeeds as RentalBizSeed[];
      const batchSize = 100;
      for (let i = 0; i < allSeeds.length; i += batchSize) {
        const batch = allSeeds.slice(i, i + batchSize);
        const values: string[] = [];
        const params: any[] = [];
        let pIdx = 1;
        for (const item of batch) {
          values.push(
            `($${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++})`
          );
          params.push(
            item.sector,
            item.companyName,
            item.businessNo || "",
            item.ceoName || "",
            item.region || "전국",
            item.address || "",
            item.bizScope || "",
            item.mainBrands || "",
            item.mainProducts || "",
            item.officialSource || "",
            item.ksicCode || "71201",
            item.phone || "",
            item.websiteUrl || "",
            item.scaleNote || "",
            item.salesStatus || "TARGET"
          );
        }
        await pool.query(
          `INSERT INTO erp_rental_biz_directory (
            sector, company_name, business_no, ceo_name, region, address,
            biz_scope, main_brands, main_products, official_source, ksic_code,
            phone, website_url, scale_note, sales_status
          ) VALUES ${values.join(",")}
          ON CONFLICT (sector, company_name) DO UPDATE SET
            region = EXCLUDED.region,
            address = COALESCE(NULLIF(EXCLUDED.address, ''), erp_rental_biz_directory.address),
            phone = COALESCE(NULLIF(EXCLUDED.phone, ''), erp_rental_biz_directory.phone),
            official_source = EXCLUDED.official_source,
            website_url = COALESCE(NULLIF(EXCLUDED.website_url, ''), erp_rental_biz_directory.website_url),
            updated_at = NOW()`,
          params
        );
      }
    }
  });
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

async function crawlOfficialBoardsLive(pool: any, targetSector: "FL" | "AWP" | "OA_PC" | "ALL"): Promise<number> {
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

  return upsertDeduplicatedSeeds(pool, crawled);
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

async function upsertDeduplicatedSeeds(pool: any, items: RentalBizSeed[]): Promise<number> {
  if (!items || items.length === 0) return 0;

  const existingRes = await pool.query(
    `SELECT id, sector, company_name, business_no, phone FROM erp_rental_biz_directory`
  );
  const byBaseName = new Map<string, number>();
  const byPhone = new Map<string, number>();
  const byBizNo = new Map<string, number>();

  for (const r of existingRes.rows) {
    const base = getCanonicalBaseName(r.company_name);
    const phone = normalizePhoneDigits(r.phone);
    const bizNo = normalizeBizNoDigits(r.business_no);
    if (base) byBaseName.set(`${r.sector}__${base}`, r.id);
    if (phone) byPhone.set(`${r.sector}__${phone}`, r.id);
    if (bizNo) byBizNo.set(`${r.sector}__${bizNo}`, r.id);
  }

  let upsertedCount = 0;
  for (const item of items) {
    const cname = String(item.companyName || "").trim();
    if (!cname) continue;
    const base = getCanonicalBaseName(cname);
    const phone = normalizePhoneDigits(item.phone);
    const bizNo = normalizeBizNoDigits(item.businessNo);

    const matchedId =
      (bizNo ? byBizNo.get(`${item.sector}__${bizNo}`) : undefined) ||
      (phone ? byPhone.get(`${item.sector}__${phone}`) : undefined) ||
      (base ? byBaseName.get(`${item.sector}__${base}`) : undefined);

    if (matchedId) {
      await pool.query(
        `UPDATE erp_rental_biz_directory
         SET business_no = COALESCE(NULLIF($1, ''), business_no),
             ceo_name = COALESCE(NULLIF($2, ''), ceo_name),
             address = CASE WHEN (address IS NULL OR address = '' OR address = '전국') AND $3 <> '' THEN $3 ELSE address END,
             phone = COALESCE(NULLIF($4, ''), phone),
             website_url = COALESCE(NULLIF($5, ''), website_url),
             updated_at = NOW()
         WHERE id = $6`,
        [
          item.businessNo || "",
          item.ceoName || "",
          item.address || "",
          item.phone || "",
          item.websiteUrl || "",
          matchedId,
        ]
      );
      upsertedCount++;
    } else {
      const insRes = await pool.query(
        `INSERT INTO erp_rental_biz_directory (
          sector, company_name, business_no, ceo_name, region, address,
          biz_scope, main_brands, main_products, official_source, ksic_code,
          phone, website_url, scale_note, sales_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (sector, company_name) DO UPDATE SET
          business_no = COALESCE(NULLIF(EXCLUDED.business_no, ''), erp_rental_biz_directory.business_no),
          ceo_name = COALESCE(NULLIF(EXCLUDED.ceo_name, ''), erp_rental_biz_directory.ceo_name),
          address = COALESCE(NULLIF(EXCLUDED.address, ''), erp_rental_biz_directory.address),
          phone = COALESCE(NULLIF(EXCLUDED.phone, ''), erp_rental_biz_directory.phone),
          website_url = COALESCE(NULLIF(EXCLUDED.website_url, ''), erp_rental_biz_directory.website_url),
          updated_at = NOW()
        RETURNING id`,
        [
          item.sector,
          cname,
          item.businessNo || "",
          item.ceoName || "",
          item.region || "전국",
          item.address || "",
          item.bizScope || "판매·임대 겸업",
          item.mainBrands || "",
          item.mainProducts || "",
          item.officialSource || "공식 등록 확인",
          item.ksicCode || (item.sector === "OA_PC" ? "71202" : "71201"),
          item.phone || "",
          item.websiteUrl || "",
          item.scaleNote || "",
          item.salesStatus || "TARGET",
        ]
      );
      const newId = insRes.rows[0]?.id;
      if (newId) {
        if (base) byBaseName.set(`${item.sector}__${base}`, newId);
        if (phone) byPhone.set(`${item.sector}__${phone}`, newId);
        if (bizNo) byBizNo.set(`${item.sector}__${bizNo}`, newId);
      }
      upsertedCount++;
    }
  }

  return upsertedCount;
}

async function resolveGeminiApiKey(): Promise<string> {
  const pool = getErpPool();
  try {
    const res = await pool.query(
      `SELECT encrypted_value FROM erp_system_secrets WHERE secret_key = 'GEMINI_ULTRA_API_KEY' LIMIT 1`
    );
    if (res.rows[0]?.encrypted_value) {
      const dec = decryptPii(String(res.rows[0].encrypted_value));
      if (dec) return dec;
    }
  } catch {
    // ignore
  }
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();
}

// 고유 거래처 코드 자동 채번 (CUST-2026-001 / VEND-2026-001)
async function generateNextPartnerCode(pool: any, partnerType: string): Promise<string> {
  const prefix = partnerType === "VENDOR" ? "VEND" : partnerType === "BOTH" ? "PART" : "CUST";
  const year = new Date().getFullYear();
  const codePattern = `${prefix}-${year}-%`;

  const existingCodesRes = await pool.query(
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
  while (true) {
    const candidateCode = `${prefix}-${year}-${String(candidateSeq).padStart(3, "0")}`;
    if (!usedCodes.has(candidateCode)) {
      return candidateCode;
    }
    candidateSeq++;
  }
}

async function fetchDirectoryWithPartnerStatus(pool: any) {
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

export async function GET() {
  try {
    await ensureRentalDirectoryTable();
    const pool = getErpPool();
    const items = await fetchDirectoryWithPartnerStatus(pool);

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (err: any) {
    console.error("GET /api/erp/rental-directory error:", err);
    return NextResponse.json(
      { error: err.message || "사업자 디렉토리 조회 실패" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureRentalDirectoryTable();
    const body = await request.json();
    const action = body.action || "CREATE";
    const pool = getErpPool();

    // 1. 수동 사업자 등록 / 수정
    if (action === "SAVE_COMPANY") {
      const {
        id,
        sector = "FL",
        companyName,
        businessNo = "",
        ceoName = "",
        region = "전국",
        address = "",
        bizScope = "판매·임대 겸업",
        mainBrands = "",
        mainProducts = "",
        officialSource = "공식 등록 확인",
        ksicCode = "71201",
        phone = "",
        websiteUrl = "",
        scaleNote = "",
        salesStatus = "TARGET",
        memo = "",
        isBookmarked = false,
      } = body;

      if (!companyName || !String(companyName).trim()) {
        return NextResponse.json({ error: "상호(법인명)를 입력해 주십시오." }, { status: 400 });
      }

      if (id) {
        await pool.query(
          `UPDATE erp_rental_biz_directory
           SET sector = $1,
               company_name = $2,
               business_no = $3,
               ceo_name = $4,
               region = $5,
               address = $6,
               biz_scope = $7,
               main_brands = $8,
               main_products = $9,
               official_source = $10,
               ksic_code = $11,
               phone = $12,
               website_url = $13,
               scale_note = $14,
               sales_status = $15,
               memo = $16,
               is_bookmarked = $17,
               updated_at = NOW()
           WHERE id = $18`,
          [
            sector,
            String(companyName).trim(),
            businessNo,
            ceoName,
            region,
            address,
            bizScope,
            mainBrands,
            mainProducts,
            officialSource,
            ksicCode,
            phone,
            websiteUrl,
            scaleNote,
            salesStatus,
            memo,
            Boolean(isBookmarked),
            Number(id),
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO erp_rental_biz_directory (
            sector, company_name, business_no, ceo_name, region, address,
            biz_scope, main_brands, main_products, official_source, ksic_code,
            phone, website_url, scale_note, sales_status, memo, is_bookmarked
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
          ON CONFLICT (sector, company_name) DO UPDATE SET
            business_no = COALESCE(NULLIF(EXCLUDED.business_no, ''), erp_rental_biz_directory.business_no),
            ceo_name = COALESCE(NULLIF(EXCLUDED.ceo_name, ''), erp_rental_biz_directory.ceo_name),
            region = EXCLUDED.region,
            address = COALESCE(NULLIF(EXCLUDED.address, ''), erp_rental_biz_directory.address),
            biz_scope = EXCLUDED.biz_scope,
            main_brands = EXCLUDED.main_brands,
            main_products = EXCLUDED.main_products,
            official_source = EXCLUDED.official_source,
            phone = COALESCE(NULLIF(EXCLUDED.phone, ''), erp_rental_biz_directory.phone),
            website_url = COALESCE(NULLIF(EXCLUDED.website_url, ''), erp_rental_biz_directory.website_url),
            scale_note = EXCLUDED.scale_note,
            updated_at = NOW()`,
          [
            sector,
            String(companyName).trim(),
            businessNo,
            ceoName,
            region,
            address,
            bizScope,
            mainBrands,
            mainProducts,
            officialSource,
            ksicCode,
            phone,
            websiteUrl,
            scaleNote,
            salesStatus,
            memo,
            Boolean(isBookmarked),
          ]
        );
      }

      const items = await fetchDirectoryWithPartnerStatus(pool);
      return NextResponse.json({ success: true, items });
    }

    // 2. 빠른 상태/북마크/메모 업데이트
    if (action === "QUICK_UPDATE") {
      const { id, salesStatus, isBookmarked, memo } = body;
      await pool.query(
        `UPDATE erp_rental_biz_directory
         SET sales_status = COALESCE($1, sales_status),
             is_bookmarked = COALESCE($2, is_bookmarked),
             memo = COALESCE($3, memo),
             updated_at = NOW()
         WHERE id = $4`,
        [
          salesStatus !== undefined ? salesStatus : null,
          isBookmarked !== undefined ? Boolean(isBookmarked) : null,
          memo !== undefined ? String(memo) : null,
          Number(id),
        ]
      );
      const items = await fetchDirectoryWithPartnerStatus(pool);
      return NextResponse.json({ success: true, items });
    }

    // 3. 단건 또는 다건(일괄) 사업자를 ERP 거래처(고객 관리 매출처 / 매입거래처)로 즉시 등록
    if (action === "REGISTER_TO_PARTNER") {
      const partnerType: "CUSTOMER" | "VENDOR" = body.partnerType || "CUSTOMER";
      const ids: number[] = Array.isArray(body.ids)
        ? body.ids.map((x: any) => Number(x))
        : body.id
        ? [Number(body.id)]
        : [];

      if (ids.length === 0) {
        return NextResponse.json({ error: "등록할 사업자를 선택해 주십시오." }, { status: 400 });
      }

      const rowsRes = await pool.query(
        `SELECT * FROM erp_rental_biz_directory WHERE id = ANY($1::int[])`,
        [ids]
      );

      let newlyCreatedCount = 0;
      let alreadyExistedCount = 0;

      for (const biz of rowsRes.rows) {
        const cleanBizNo = String(biz.business_no || "").trim();
        const existRes = await pool.query(
          `SELECT id, partner_type FROM erp_partners
           WHERE name = $1 OR ($2 <> '' AND business_no = $2)
           LIMIT 1`,
          [biz.company_name, cleanBizNo]
        );

        if (existRes.rows.length > 0) {
          alreadyExistedCount++;
          // 만약 기존에 VENDOR로만 되어 있는데 CUSTOMER로 등록 요청한 경우 BOTH로 승격
          const curType = existRes.rows[0].partner_type;
          if (curType !== partnerType && curType !== "BOTH") {
            await pool.query(
              `UPDATE erp_partners SET partner_type = 'BOTH', updated_at = NOW() WHERE id = $1`,
              [existRes.rows[0].id]
            );
          }
        } else {
          const finalCode = await generateNextPartnerCode(pool, partnerType);
          const sectorName =
            biz.sector === "FL"
              ? "지게차(FL) 판매·임대업"
              : biz.sector === "AWP"
              ? "고소작업대(AWP) 판매·임대업"
              : "컴퓨터 및 사무용 기계·장비(OA) 임대업";

          await pool.query(
            `INSERT INTO erp_partners (
              partner_type, partner_code, name, business_no, ceo_name,
              biz_type, biz_item, address, main_phone,
              statement_closing_day, tax_invoice_closing_day, payment_due_day,
              status, memo, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9,
              '매월 25일', '익월 10일', '익월 15일',
              'ACTIVE', $10, NOW(), NOW()
            )`,
            [
              partnerType,
              finalCode,
              biz.company_name,
              cleanBizNo || null,
              biz.ceo_name || null,
              "사업지원 및 임대서비스업, 도소매",
              sectorName,
              biz.address || biz.region || null,
              biz.phone || null,
              `[렌탈사업자DB 등록 | 확인경로: ${biz.official_source}] 취급브랜드: ${biz.main_brands || "-"} / 품목: ${biz.main_products || "-"}`,
            ]
          );
          newlyCreatedCount++;
        }

        const newStatus = partnerType === "CUSTOMER" ? "CUSTOMER" : "PARTNER";
        await pool.query(
          `UPDATE erp_rental_biz_directory SET sales_status = $1, updated_at = NOW() WHERE id = $2`,
          [newStatus, biz.id]
        );
      }

      const items = await fetchDirectoryWithPartnerStatus(pool);
      return NextResponse.json({
        success: true,
        newlyCreatedCount,
        alreadyExistedCount,
        items,
      });
    }

    // 3-2. 협동조합(klra.or.kr)·전국지게차연합(udj.kr)·신도리코 파트너 원부 직접 실시간 크롤링 동기화
    if (action === "CRAWL_OFFICIAL_BOARDS") {
      const targetSector: "FL" | "AWP" | "OA_PC" | "ALL" = body.sector || "ALL";
      const crawledCount = await crawlOfficialBoardsLive(pool, targetSector);
      const items = await fetchDirectoryWithPartnerStatus(pool);
      return NextResponse.json({
        success: true,
        crawledCount,
        items,
      });
    }

    // 4. 특정 상호명 또는 지역 키워드로 외부 공식 기업DB(NICE·협동조합·나라장터·산군) 실시간 검색 및 등록
    if (action === "DISCOVER_OFFICIAL_BIZ" || action === "SEARCH_EXTERNAL_COMPANY") {
      const sector: "FL" | "AWP" | "OA_PC" = body.sector || "AWP";
      const region: string = body.region || "전국";
      const customKeyword: string = String(body.customKeyword || "").trim();

      const apiKey = await resolveGeminiApiKey();
      const sectorTitle =
        sector === "FL"
          ? "지게차(Forklift) 판매·임대업 (건설기계대여업 등록업체, 두산/현대/클라크/토요타 대리점, 우리동네지게차/퍼펙트82 등록업체)"
          : sector === "AWP"
          ? "고소작업대(AWP, 리프트/시저스리프트/붐리프트) 판매·임대업 (한국고소작업대임대업협동조합 klra.or.kr 회원사, NICE평가정보/산군 등록 리프트 임대법인, 다아라기계장터)"
          : "PC·노트북·디지털복합기(OA) 임대업 (조달청 나라장터 MAS 사무기기임대/컴퓨터임대 계약업체, 신도리코/캐논/후지필름/교세라 공식 대리점 및 B2B 렌탈법인)";

      let discoveredList: RentalBizSeed[] = [];

      if (apiKey) {
        try {
          const prompt = customKeyword
            ? `당신은 대한민국 기업신용평가(NICE평가정보, 산군, 크레탑) 및 산업조합(한국고소작업대임대업협동조합, 대한건설기계협회, 조달청 나라장터) 공식 데이터 조사관입니다.
사용자가 찾고 있는 특정 업체명 또는 검색어: "${customKeyword}" (권역: ${region}, 기본분류: ${sector})

대한민국에서 "${customKeyword}" 상호(또는 해당 키워드 관련 렌탈/리프트/지게차/OA 임대 사업자)를 실시간 웹 검색하여 실존하는 기업 정보(최대 5곳)를 찾아 반드시 아래 JSON 배열 형식으로만 응답하십시오.
업종(sector)은 지게차면 "FL", 고소작업대/리프트면 "AWP", PC/복합기/OA면 "OA_PC"로 정확히 지정하십시오.

[
  {
    "sector": "${sector}",
    "companyName": "정확한 법인명/상호 (예: 주식회사 기연리프트)",
    "businessNo": "확인된 사업자등록번호 (예: 138-81-83251, 일부 마스킹 시 확인된 앞자리 표기)",
    "ceoName": "대표자명",
    "region": "시/도 및 시/군/구 (예: 경기 (용인 처인구))",
    "address": "도로명 또는 지번 상세 주소",
    "bizScope": "고소작업대 임대·정비 / 지게차 판매·임대 / 복합기·PC 임대 등",
    "mainBrands": "취급 브랜드",
    "mainProducts": "주요 임대·판매 기종 상세",
    "officialSource": "확인된 출처 (예: NICE평가정보 / 한국고소작업대임대업협동조합 / 조달청 나라장터 등)",
    "ksicCode": "71201 또는 71202",
    "phone": "대표 전화번호",
    "websiteUrl": "홈페이지 URL (없으면 빈 문자열)",
    "scaleNote": "설립연도, 거점 특징, 주요 사업 요약",
    "salesStatus": "TARGET"
  }
]`
            : `당신은 대한민국 B2B 산업장비 및 OA 렌탈 시장 공식 데이터 조사관입니다.
검색 대상 업종: ${sectorTitle}
검색 대상 지역: ${region}

대한민국의 공식 경로(한국고소작업대임대업협동조합 klra.or.kr, 조달청 나라장터 G2B, NICE평가정보/산군 기업DB, 대한건설기계협회, 제조사 공식 판매대리점, 다아라 기계장터, 우리동네지게차)에서 실존 확인되는 "${region}" 지역 사업자 6곳을 발굴하여 반드시 아래 JSON 배열 형식으로만 응답하십시오.

[
  {
    "sector": "${sector}",
    "companyName": "정확한 법인명/상호",
    "businessNo": "사업자등록번호",
    "ceoName": "대표자명",
    "region": "${region}",
    "address": "도로명 또는 지번 주소",
    "bizScope": "신차·중고 판매 및 임대 / 장단기 임대 전문 / 조달(MAS) 임대 등",
    "mainBrands": "취급 브랜드",
    "mainProducts": "주요 임대·판매 기종 상세",
    "officialSource": "확인된 공식 경로",
    "ksicCode": "${sector === "OA_PC" ? "71202 (사무용 기계·장비 임대업)" : "71201 (건설·물류장비 임대업)"}",
    "phone": "대표 전화번호",
    "websiteUrl": "공식 홈페이지 URL",
    "scaleNote": "기업 특징 및 주요 거점 요약",
    "salesStatus": "TARGET"
  }
]`;

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
              apiKey
            )}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ google_search: {} }],
                generationConfig: { temperature: 0.2 },
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const rawText =
              geminiData?.candidates?.[0]?.content?.parts
                ?.map((p: any) => p.text || "")
                .join("\n") || "";
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed)) {
                discoveredList = parsed;
              }
            }
          }
        } catch (aiErr) {
          console.warn("Gemini discovery fallback triggered:", aiErr);
        }
      }

      const normalizedDiscovered: RentalBizSeed[] = discoveredList
        .filter((item) => Boolean(item?.companyName))
        .map((item) => {
          const validSector: "FL" | "AWP" | "OA_PC" =
            item.sector === "FL" || item.sector === "AWP" || item.sector === "OA_PC"
              ? item.sector
              : sector;
          return {
            sector: validSector,
            companyName: String(item.companyName).trim(),
            businessNo: item.businessNo || "",
            ceoName: item.ceoName || "",
            region: item.region || region,
            address: item.address || "",
            bizScope: item.bizScope || "판매·임대 겸업",
            mainBrands: item.mainBrands || "",
            mainProducts: item.mainProducts || "",
            officialSource: item.officialSource || "NICE기업DB / 협동조합 / 나라장터 확인",
            ksicCode: item.ksicCode || (validSector === "OA_PC" ? "71202" : "71201"),
            phone: item.phone || "",
            websiteUrl: item.websiteUrl || "",
            scaleNote: item.scaleNote || "",
            salesStatus: "TARGET",
          };
        });

      const insertedCount = await upsertDeduplicatedSeeds(pool, normalizedDiscovered);

      const items = await fetchDirectoryWithPartnerStatus(pool);
      return NextResponse.json({
        success: true,
        discoveredCount: insertedCount,
        items,
      });
    }

    return NextResponse.json({ error: "알 수 없는 요청 액션입니다." }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/erp/rental-directory error:", err);
    return NextResponse.json(
      { error: err.message || "요청 처리 실패" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureRentalDirectoryTable();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 항목 ID가 필요합니다." }, { status: 400 });
    }
    const pool = getErpPool();
    await pool.query(`DELETE FROM erp_rental_biz_directory WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/erp/rental-directory error:", err);
    return NextResponse.json(
      { error: err.message || "삭제 실패" },
      { status: 500 }
    );
  }
}
