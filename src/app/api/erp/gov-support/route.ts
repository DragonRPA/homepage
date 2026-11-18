export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { decryptPii, encryptPii } from "@/lib/piiCrypto";
import { runSchemaInitOnce } from "@/lib/erpSchemaCache";
import {
  GOV_SUPPORT_SEED_ITEMS,
  GovSupportSeedItem,
  SEED_ORIGINAL_CONTENTS,
} from "./govSupportSeedData";

type GovSupportInsertRow = GovSupportSeedItem & { original_content: string };

async function insertGovSupportItemsBatch(
  pool: any,
  rows: GovSupportInsertRow[]
): Promise<number> {
  if (rows.length === 0) return 0;
  await pool.query(
    `INSERT INTO erp_gov_support_items (
      category, agency, title, region, target_audience, support_amount,
      start_date, end_date, dday_label, fit_score, status, summary,
      eligibility_detail, action_plan, original_content, source_url, keywords, is_bookmarked, published_date
    )
    SELECT * FROM UNNEST(
      $1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[], $5::varchar[], $6::varchar[],
      $7::varchar[], $8::varchar[], $9::varchar[], $10::int[], $11::varchar[], $12::text[],
      $13::text[], $14::text[], $15::text[], $16::text[], $17::text[], $18::bool[], $19::varchar[]
    )`,
    [
      rows.map((r) => r.category),
      rows.map((r) => r.agency),
      rows.map((r) => r.title),
      rows.map((r) => r.region),
      rows.map((r) => r.target_audience),
      rows.map((r) => r.support_amount),
      rows.map((r) => r.start_date),
      rows.map((r) => r.end_date),
      rows.map((r) => r.dday_label),
      rows.map((r) => r.fit_score),
      rows.map((r) => r.status),
      rows.map((r) => r.summary),
      rows.map((r) => r.eligibility_detail),
      rows.map((r) => r.action_plan),
      rows.map((r) => r.original_content),
      rows.map((r) => r.source_url),
      rows.map((r) => r.keywords),
      rows.map((r) => r.is_bookmarked),
      rows.map((r) => r.published_date),
    ]
  );
  return rows.length;
}

async function insertNewGovSupportItems(
  pool: any,
  candidateRows: GovSupportInsertRow[]
): Promise<number> {
  const seenTitles = new Set<string>();
  const uniqueRows: GovSupportInsertRow[] = [];
  for (const row of candidateRows) {
    const normalizedTitle = row.title.trim();
    if (!normalizedTitle || seenTitles.has(normalizedTitle)) continue;
    seenTitles.add(normalizedTitle);
    uniqueRows.push({ ...row, title: normalizedTitle });
  }
  if (uniqueRows.length === 0) return 0;

  const existingRes = await pool.query(
    `SELECT title FROM erp_gov_support_items WHERE title = ANY($1::varchar[])`,
    [uniqueRows.map((r) => r.title)]
  );
  const existingTitles = new Set<string>(
    existingRes.rows.map((r: { title: string }) => r.title)
  );
  const newRows = uniqueRows.filter((r) => !existingTitles.has(r.title));
  return insertGovSupportItemsBatch(pool, newRows);
}

async function ensureGovSupportTables(pool: any) {
  await runSchemaInitOnce("erp_gov_support_schema_v2", async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_gov_support_items (
        id SERIAL PRIMARY KEY,
        category VARCHAR(32) NOT NULL DEFAULT 'SUPPORT',
        agency VARCHAR(120) NOT NULL DEFAULT '정부기관',
        title VARCHAR(300) NOT NULL,
        region VARCHAR(80) DEFAULT '전국',
        target_audience VARCHAR(200) DEFAULT '중소·벤처기업',
        support_amount VARCHAR(150) DEFAULT '공고문 참조',
        start_date VARCHAR(40),
        end_date VARCHAR(40),
        dday_label VARCHAR(40),
        fit_score INTEGER NOT NULL DEFAULT 85,
        status VARCHAR(32) NOT NULL DEFAULT 'DISCOVERED',
        summary TEXT,
        eligibility_detail TEXT,
        action_plan TEXT,
        original_content TEXT,
        source_url TEXT,
        keywords TEXT,
        is_bookmarked BOOLEAN NOT NULL DEFAULT false,
        memo TEXT,
        published_date VARCHAR(40),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      ALTER TABLE erp_gov_support_items
      ADD COLUMN IF NOT EXISTS original_content TEXT;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_ai_intel_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        gemini_api_key TEXT,
        groq_api_key TEXT,
        gemini_model VARCHAR(80) NOT NULL DEFAULT 'gemini-2.5-pro',
        company_profile TEXT NOT NULL DEFAULT '주식회사 드래곤알피에이 (IT/RPA 업무자동화 솔루션, AI ERP 개발, IT장비/디스플레이/노트북/복합기/TV 렌탈 및 구축 운영용역 전문 법인, 서울 금천구 가산디지털단지 소재 중소기업)',
        interest_keywords TEXT NOT NULL DEFAULT '스마트서비스, 클라우드 바우처, AI 바우처, RPA 자동화, 중소기업 R&D, 디지털 전환(DX), 서비스형 SW(SaaS), 고용창출장려금, 청년일자리도약장려금, 조달청 나라장터 렌탈/임차 공고, 마이스(MICE)/전시 디스플레이 렌탈 트렌드',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      ALTER TABLE erp_ai_intel_settings
      ADD COLUMN IF NOT EXISTS groq_api_key TEXT;
    `);

    await pool.query(`
      INSERT INTO erp_ai_intel_settings (id)
      VALUES (1)
      ON CONFLICT (id) DO NOTHING;
    `);

  // 초기 기본 시드 데이터 (최초 0건일 때 실무 활용도가 높은 주요 정부지원사업·뉴스·트렌드 제공)
  const countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM erp_gov_support_items`);
  if ((countRes.rows[0]?.cnt || 0) === 0) {
    await insertGovSupportItemsBatch(
      pool,
      GOV_SUPPORT_SEED_ITEMS.map((item) => ({
        ...item,
        original_content: SEED_ORIGINAL_CONTENTS[item.title] || item.summary,
      }))
    );
  } else {
    // 기존 시드 데이터 중 original_content가 비어 있는 항목 자동 보강
    const seedEntries = Object.entries(SEED_ORIGINAL_CONTENTS);
    if (seedEntries.length > 0) {
      await pool.query(
        `UPDATE erp_gov_support_items AS g
         SET original_content = u.orig
         FROM UNNEST($1::varchar[], $2::text[]) AS u(title, orig)
         WHERE g.title = u.title AND (g.original_content IS NULL OR g.original_content = '')`,
        [seedEntries.map(([t]) => t), seedEntries.map(([, orig]) => orig)]
      );
    }
  }
  });
}

function maskApiKey(key: string | null | undefined): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function stripHtmlToCleanText(html: string): string {
  if (!html) return "";
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ");

  cleaned = cleaned
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|br|article|section)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  const lines = cleaned
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 15);

  return lines.slice(0, 80).join("\n\n").slice(0, 8000);
}

// 외부 원문 URL에서 실제 페이지 텍스트를 추출하는 헬퍼
async function fetchWebpageOriginalText(url: string): Promise<{
  extractedText: string;
  finalUrl: string;
  pageTitle: string;
}> {
  if (!url || !url.startsWith("http")) {
    return { extractedText: "", finalUrl: url || "", pageTitle: "" };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    const finalUrl = res.url || url;
    if (!res.ok) {
      return { extractedText: "", finalUrl, pageTitle: "" };
    }
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const pageTitle = (titleMatch?.[1] || "").replace(/\s+/g, " ").trim();

    const ogDescMatch =
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const ogDesc = ogDescMatch?.[1] ? ogDescMatch[1].trim() : "";

    const bodyText = stripHtmlToCleanText(html);
    const combined = [
      pageTitle ? `[문서 제목] ${pageTitle}` : "",
      ogDesc ? `[원문 핵심 발췌] ${ogDesc}` : "",
      bodyText ? `[수집된 원문 본문]\n${bodyText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      extractedText: combined,
      finalUrl,
      pageTitle,
    };
  } catch {
    return { extractedText: "", finalUrl: url, pageTitle: "" };
  }
}

// Google News RSS (한국어) 실시간 피드 수집 헬퍼 (description 및 원문 컨텍스트 포함)
async function fetchLiveKoreanNewsRss(queryText: string): Promise<
  Array<{ title: string; link: string; pubDate: string; source: string; description: string }>
> {
  try {
    const encoded = encodeURIComponent(queryText);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=ko&gl=KR&ceid=KR:ko`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DragonRPA-ERP/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const results: Array<{
      title: string;
      link: string;
      pubDate: string;
      source: string;
      description: string;
    }> = [];
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null && results.length < 10) {
      const block = match[1];
      const titleMatch = block.match(
        /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/
      );
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
      const pubMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
      const descMatch = block.match(
        /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/
      );

      const rawTitle = (titleMatch?.[1] || titleMatch?.[2] || "")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .trim();
      const link = (linkMatch?.[1] || "").trim();
      const pubDate = (pubMatch?.[1] || "").trim();
      const source = (sourceMatch?.[1] || "뉴스피드").trim();
      const rawDescHtml = (descMatch?.[1] || descMatch?.[2] || "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ");
      const cleanDesc = rawDescHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (rawTitle) {
        results.push({ title: rawTitle, link, pubDate, source, description: cleanDesc });
      }
    }
    return results;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const pool = getErpPool();
    await ensureGovSupportTables(pool);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    let sql = `
      SELECT
        id,
        category,
        agency,
        title,
        region,
        target_audience AS "targetAudience",
        support_amount AS "supportAmount",
        start_date AS "startDate",
        end_date AS "endDate",
        dday_label AS "ddayLabel",
        fit_score AS "fitScore",
        status,
        summary,
        eligibility_detail AS "eligibilityDetail",
        action_plan AS "actionPlan",
        original_content AS "originalContent",
        source_url AS "sourceUrl",
        keywords,
        is_bookmarked AS "isBookmarked",
        memo,
        published_date AS "publishedDate",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM erp_gov_support_items
    `;

    const conds: string[] = [];
    const params: any[] = [];
    if (category && category !== "ALL") {
      params.push(category);
      conds.push(`category = $${params.length}`);
    }
    if (status && status !== "ALL") {
      params.push(status);
      conds.push(`status = $${params.length}`);
    }
    if (conds.length > 0) {
      sql += ` WHERE ` + conds.join(" AND ");
    }
    sql += ` ORDER BY is_bookmarked DESC, fit_score DESC, id DESC`;

    const [itemsRes, settingsRes] = await Promise.all([
      pool.query(sql, params),
      pool.query(`SELECT * FROM erp_ai_intel_settings WHERE id = 1 LIMIT 1`),
    ]);

    const sRow = settingsRes.rows[0] || {};
    const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
    const storedKey = decryptPii(sRow.gemini_api_key || "");
    const activeKey = storedKey || envKey;

    return NextResponse.json({
      success: true,
      items: itemsRes.rows,
      settings: {
        hasApiKey: Boolean(activeKey),
        maskedApiKey: maskApiKey(activeKey),
        keySource: storedKey ? "DB" : envKey ? "ENV" : "NONE",
        geminiModel: sRow.gemini_model || "gemini-2.5-pro",
        companyProfile: sRow.company_profile || "",
        interestKeywords: sRow.interest_keywords || "",
      },
    });
  } catch (error: any) {
    console.error("GET GovSupport Error:", error);
    return NextResponse.json(
      { error: "정부지원사업 및 트렌드 조회 실패: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const pool = getErpPool();
    await ensureGovSupportTables(pool);

    const body = await request.json();
    const { action } = body;

    // 1. Google AI (Gemini) 설정 및 기업 프로필 저장
    if (action === "SAVE_SETTINGS") {
      const { geminiApiKey, geminiModel, companyProfile, interestKeywords } = body;
      const currentRes = await pool.query(`SELECT gemini_api_key FROM erp_ai_intel_settings WHERE id = 1`);
      const existingKey = currentRes.rows[0]?.gemini_api_key || null;
      const rawNewKey = geminiApiKey !== undefined && geminiApiKey !== null ? String(geminiApiKey).trim() : "";
      const nextKey =
        rawNewKey && !rawNewKey.includes("****")
          ? encryptPii(rawNewKey)
          : existingKey
          ? encryptPii(decryptPii(existingKey))
          : null;

      await pool.query(
        `UPDATE erp_ai_intel_settings
         SET gemini_api_key = $1,
             gemini_model = COALESCE($2, gemini_model),
             company_profile = COALESCE($3, company_profile),
             interest_keywords = COALESCE($4, interest_keywords),
             updated_at = NOW()
         WHERE id = 1`,
        [
          nextKey,
          geminiModel || "gemini-2.5-pro",
          companyProfile || "",
          interestKeywords || "",
        ]
      );

      return NextResponse.json({
        success: true,
        message: "Google AI 연동 및 기업 맞춤 프로필 설정이 저장되었습니다.",
      });
    }

    // 2. 수동/직접 등록 또는 NotebookLM/Gemini 결과 붙여넣기 등록
    if (action === "CREATE_ITEM") {
      const {
        category = "SUPPORT",
        agency = "정부기관",
        title,
        region = "전국",
        targetAudience = "중소기업",
        supportAmount = "공고문 참조",
        startDate = "",
        endDate = "",
        ddayLabel = "접수중",
        fitScore = 90,
        status = "DISCOVERED",
        summary = "",
        eligibilityDetail = "",
        actionPlan = "",
        originalContent = "",
        sourceUrl = "",
        keywords = "",
        isBookmarked = false,
      } = body;

      if (!title || !String(title).trim()) {
        return NextResponse.json({ error: "공고/뉴스 제목은 필수입니다." }, { status: 400 });
      }

      const insRes = await pool.query(
        `INSERT INTO erp_gov_support_items (
          category, agency, title, region, target_audience, support_amount,
          start_date, end_date, dday_label, fit_score, status, summary,
          eligibility_detail, action_plan, original_content, source_url, keywords, is_bookmarked, published_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        RETURNING id`,
        [
          category,
          agency,
          String(title).trim(),
          region,
          targetAudience,
          supportAmount,
          startDate,
          endDate,
          ddayLabel,
          Number(fitScore) || 85,
          status,
          summary,
          eligibilityDetail,
          actionPlan,
          originalContent || summary,
          sourceUrl,
          keywords,
          Boolean(isBookmarked),
          new Date().toISOString().slice(0, 10),
        ]
      );

      return NextResponse.json({
        success: true,
        id: insRes.rows[0]?.id,
        message: "신규 항목이 대장에 등록되었습니다.",
      });
    }

    // 2.5 선택 항목의 실시간 웹페이지 원문 추출 및 저장 (FETCH_ORIGINAL)
    if (action === "FETCH_ORIGINAL") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "항목 ID가 필요합니다." }, { status: 400 });
      }
      const itemRes = await pool.query(
        `SELECT id, title, agency, category, support_amount, start_date, end_date, region, target_audience, summary, eligibility_detail, action_plan, original_content, source_url, published_date
         FROM erp_gov_support_items WHERE id = $1 LIMIT 1`,
        [Number(id)]
      );
      if (itemRes.rows.length === 0) {
        return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
      }
      const row = itemRes.rows[0];
      const fetched = await fetchWebpageOriginalText(row.source_url || "");

      const structuredOriginal = [
        `■ 문서 제목: ${row.title}`,
        `■ 주관기관 / 출처: ${row.agency || "-"}`,
        `■ 공고/발행일: ${row.published_date || row.start_date || "-"}`,
        `■ 접수기간: ${row.start_date || "-"} ~ ${row.end_date || "-"}`,
        `■ 지원규모: ${row.support_amount || "-"}`,
        `■ 지원대상: ${row.target_audience || "-"} (${row.region || "전국"})`,
        `■ 원문 URL: ${fetched.finalUrl || row.source_url || "-"}`,
        `──────────────────────────────────────────────────`,
        fetched.extractedText && fetched.extractedText.length > 80
          ? fetched.extractedText
          : [
              row.original_content || "",
              `[수집 요약 원문]\n${row.summary || ""}`,
              row.eligibility_detail ? `[신청 자격 및 요건]\n${row.eligibility_detail}` : "",
              row.action_plan ? `[세부 추진 내용]\n${row.action_plan}` : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
      ].join("\n");

      await pool.query(
        `UPDATE erp_gov_support_items
         SET original_content = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [structuredOriginal, Number(id)]
      );

      return NextResponse.json({
        success: true,
        originalContent: structuredOriginal,
        finalUrl: fetched.finalUrl || row.source_url || "",
        message: "수집 원문 데이터를 최신화했습니다.",
      });
    }

    // 3. Google AI (Gemini + Google Search Grounding + 실시간 RSS) 지능형 탐색 및 대장 자동 적재
    if (action === "AI_DISCOVER") {
      const { queryTopic, targetCategory = "ALL" } = body;
      const settingsRes = await pool.query(`SELECT * FROM erp_ai_intel_settings WHERE id = 1 LIMIT 1`);
      const sRow = settingsRes.rows[0] || {};
      const apiKey =
        (body.tempApiKey && String(body.tempApiKey).trim()) ||
        decryptPii(sRow.gemini_api_key || "") ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_AI_API_KEY ||
        "";
      const modelName = sRow.gemini_model || "gemini-2.5-pro";
      const companyProfile =
        sRow.company_profile ||
        "주식회사 드래곤알피에이 (IT/RPA 자동화, AI ERP, 디스플레이·OA·스마트TV 렌탈 및 운영용역 전문 중소기업, 서울 금천구)";
      const interestKeywords =
        sRow.interest_keywords ||
        "정부지원사업, 스마트서비스, 클라우드 바우처, AI 바우처, 고용장려금, 나라장터 임차 공고";

      const searchTopic =
        queryTopic && String(queryTopic).trim()
          ? String(queryTopic).trim()
          : "중소기업 정부지원사업 공고 AI 바우처 스마트서비스 고용지원금 IT 렌탈 트렌드";

      // 3-A. 실시간 한국어 뉴스 RSS 수집 (항상 병행하여 최신 뉴스 컨텍스트 확보)
      const rssArticles = await fetchLiveKoreanNewsRss(searchTopic);

      // 3-B. Gemini API 키가 등록되어 있는 경우 -> Gemini + Google Search Grounding 호출
      if (apiKey) {
        const promptText = `당신은 대한민국 중소기업 정부지원사업·공공조달·산업트렌드 수석 컨설턴트입니다.
대상 기업 프로필: ${companyProfile}
핵심 관심 키워드: ${interestKeywords}
집중 탐색 주제: ${searchTopic}
요청 카테고리 범위: ${targetCategory}
참고 최신 뉴스 헤드라인:
${rssArticles.map((a, i) => `${i + 1}. ${a.title} (${a.source}) - ${a.description} - ${a.link}`).join("\n")}

위 기업이 실질적으로 혜택을 받거나 영업·기술전략에 즉시 활용할 수 있는 최신 정부지원사업 공고, 공공입찰(나라장터), 정책 뉴스, 산업 트렌드를 4~6건 발굴하여 아래 JSON 배열 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON 배열만 출력):
[
  {
    "category": "SUPPORT" | "PROCUREMENT" | "NEWS" | "TREND",
    "agency": "주관기관 또는 출처명 (예: 중소벤처기업부 / TIPA)",
    "title": "공고명 또는 뉴스/트렌드 제목",
    "region": "지역 (예: 전국, 서울 금천구 등)",
    "targetAudience": "지원대상 요건 요약",
    "supportAmount": "지원규모/예산 (예: 최대 6,000만원, 국비 70%)",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD 또는 상시",
    "ddayLabel": "접수중 / 공고예정 / 상시접수 / 정책뉴스 / 핵심트렌드",
    "fitScore": 85~99 사이 정수 (드래곤알피에이 적합도 점수),
    "summary": "핵심 내용 2~3문장 요약 및 당사 활용 포인트",
    "eligibilityDetail": "• 자격요건 1\\n• 자격요건 2",
    "actionPlan": "1. 실행단계 1\\n2. 실행단계 2",
    "originalContent": "공고문 또는 기사 원문의 상세 본문(사업목적, 세부 지원내용, 신청절차, 제출서류, 문의처 등 원문 전문 텍스트 500~1000자 이상 상세 기술)",
    "sourceUrl": "공식 공고 사이트 또는 뉴스 URL (https://...)",
    "keywords": "키워드1,키워드2,키워드3"
  }
]`;

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          modelName
        )}:generateContent?key=${encodeURIComponent(apiKey)}`;

        let geminiRes = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            tools: [{ google_search: {} }],
            generationConfig: {
              temperature: 0.3,
            },
          }),
        });

        if (!geminiRes.ok) {
          geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
              apiKey
            )}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.3 },
              }),
            }
          );
        }

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          return NextResponse.json(
            {
              error: `Gemini API 호출 오류 (${geminiRes.status}): API 키 또는 모델 설정을 확인해주세요. 상세: ${errText.slice(
                0,
                200
              )}`,
            },
            { status: 400 }
          );
        }

        const geminiJson = await geminiRes.json();
        const rawText: string =
          geminiJson?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text || "")
            .join("\n") || "";

        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          return NextResponse.json(
            { error: "AI 응답에서 구조화된 공고 목록을 추출하지 못했습니다." },
            { status: 500 }
          );
        }

        const parsedList = JSON.parse(jsonMatch[0]);
        const todayIso = new Date().toISOString().slice(0, 10);
        const candidateRows: GovSupportInsertRow[] = Array.isArray(parsedList)
          ? parsedList
              .filter((item: any) => item?.title && String(item.title).trim())
              .map((item: any) => ({
                category: String(item.category || (targetCategory !== "ALL" ? targetCategory : "SUPPORT")),
                agency: String(item.agency || "정부·공공기관"),
                title: String(item.title).trim(),
                region: String(item.region || "전국"),
                target_audience: String(item.targetAudience || "중소기업"),
                support_amount: String(item.supportAmount || "공고문 참조"),
                start_date: String(item.startDate || todayIso),
                end_date: String(item.endDate || "상시"),
                dday_label: String(item.ddayLabel || "신규발굴"),
                fit_score: Math.round(Math.min(99, Math.max(70, Number(item.fitScore) || 90))),
                status: "DISCOVERED",
                summary: String(item.summary || ""),
                eligibility_detail: String(item.eligibilityDetail || ""),
                action_plan: String(item.actionPlan || ""),
                original_content: String(item.originalContent || item.summary || ""),
                source_url: String(item.sourceUrl || "https://www.bizinfo.go.kr"),
                keywords: String(item.keywords || searchTopic),
                is_bookmarked: false,
                published_date: todayIso,
              }))
          : [];

        const insertedCount = await insertNewGovSupportItems(pool, candidateRows);

        return NextResponse.json({
          success: true,
          insertedCount,
          mode: "GEMINI_GROUNDING",
          message: `Google AI (${modelName}) 실시간 탐색 완료: 신규 맞춤형 정보 ${insertedCount}건이 대장에 추가되었습니다.`,
        });
      }

      // 3-C. API 키 없이도 동작하는 실시간 뉴스/공고 RSS 자동 수집 모드 (수집 원문 포함)
      const todayIso = new Date().toISOString().slice(0, 10);
      const rssCandidateRows: GovSupportInsertRow[] = rssArticles.slice(0, 6).map((art) => {
        const isSupport = /지원사업|바우처|보조금|공고|모집|장려금|R&D|자금/.test(art.title);
        const isProcure = /입찰|조달|나라장터|임차|용역|계약/.test(art.title);
        const cat =
          targetCategory !== "ALL"
            ? targetCategory
            : isSupport
            ? "SUPPORT"
            : isProcure
            ? "PROCUREMENT"
            : "NEWS";

        const pubIso = art.pubDate
          ? new Date(art.pubDate).toISOString().slice(0, 10)
          : todayIso;

        const rssOriginalText = [
          `■ 수집 제목: ${art.title}`,
          `■ 언론사 / 출처: ${art.source || "실시간 정책·뉴스 피드"}`,
          `■ 발행 일시: ${art.pubDate || pubIso}`,
          `■ 수집 키워드: ${searchTopic}`,
          `■ 원문 링크: ${art.link || "-"}`,
          `──────────────────────────────────────────────────`,
          `[수집된 기사/공고 원문 발췌]`,
          art.description || art.title,
        ].join("\n");

        return {
          category: String(cat),
          agency: String(art.source || "실시간 정책·뉴스 피드"),
          title: String(art.title || "").trim(),
          region: "전국",
          target_audience: "중소·벤처기업",
          support_amount: "원문 참조",
          start_date: pubIso,
          end_date: "상시",
          dday_label: "실시간뉴스",
          fit_score: 88,
          status: "DISCOVERED",
          summary: art.description
            ? `${art.description}\n\n(※ 우측 [수집 원문 전문 보기] 버튼으로 수집 원문을 즉시 열람하거나 [공식 공고/원문 사이트 열기]로 이동할 수 있습니다.)`
            : `[${art.source}] '${searchTopic}' 키워드로 실시간 수집된 최신 정책·산업 뉴스입니다.`,
          eligibility_detail: "• 관련 업종(IT·RPA·렌탈·용역) 해당 여부 원문 확인",
          action_plan:
            "1. [수집 원문 전문 보기]로 세부 내용 확인\n2. Google AI Ultra 브리핑 프롬프트로 사업계획서/실행안 도출",
          original_content: rssOriginalText,
          source_url: art.link || "https://www.bizinfo.go.kr",
          keywords: searchTopic,
          is_bookmarked: false,
          published_date: pubIso,
        };
      });

      const insertedCount = await insertNewGovSupportItems(pool, rssCandidateRows);

      return NextResponse.json({
        success: true,
        insertedCount,
        mode: "LIVE_RSS",
        message:
          insertedCount > 0
            ? `실시간 정책·뉴스 피드에서 '${searchTopic}' 관련 신규 정보 ${insertedCount}건(원문 포함)을 수집했습니다.`
            : `'${searchTopic}' 관련 최신 피드가 이미 모두 반영되어 있습니다.`,
      });
    }

    return NextResponse.json({ error: "지원하지 않는 요청 액션입니다." }, { status: 400 });
  } catch (error: any) {
    console.error("POST GovSupport Error:", error);
    return NextResponse.json(
      { error: "작업 처리 실패: " + error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const pool = getErpPool();
    await ensureGovSupportTables(pool);

    const body = await request.json();
    const { id, status, isBookmarked, memo, fitScore, originalContent } = body;

    if (!id) {
      return NextResponse.json({ error: "항목 ID가 필요합니다." }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE erp_gov_support_items
       SET status = COALESCE($1, status),
           is_bookmarked = COALESCE($2, is_bookmarked),
           memo = COALESCE($3, memo),
           fit_score = COALESCE($4, fit_score),
           original_content = COALESCE($5, original_content),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        status !== undefined ? status : null,
        isBookmarked !== undefined ? Boolean(isBookmarked) : null,
        memo !== undefined ? memo : null,
        fitScore !== undefined ? Number(fitScore) : null,
        originalContent !== undefined ? originalContent : null,
        Number(id),
      ]
    );

    return NextResponse.json({
      success: true,
      item: res.rows[0],
      message: "상태가 즉시 반영되었습니다.",
    });
  } catch (error: any) {
    console.error("PATCH GovSupport Error:", error);
    return NextResponse.json({ error: "업데이트 실패: " + error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const pool = getErpPool();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 항목 ID가 누락되었습니다." }, { status: 400 });
    }

    await pool.query(`DELETE FROM erp_gov_support_items WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ success: true, message: "삭제되었습니다." });
  } catch (error: any) {
    console.error("DELETE GovSupport Error:", error);
    return NextResponse.json({ error: "삭제 실패: " + error.message }, { status: 500 });
  }
}
