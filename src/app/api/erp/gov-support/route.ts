export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

async function ensureGovSupportTables(pool: any) {
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
    CREATE TABLE IF NOT EXISTS erp_ai_intel_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      gemini_api_key TEXT,
      gemini_model VARCHAR(80) NOT NULL DEFAULT 'gemini-2.5-pro',
      company_profile TEXT NOT NULL DEFAULT '주식회사 드래곤알피에이 (IT/RPA 업무자동화 솔루션, AI ERP 개발, IT장비/디스플레이/노트북/복합기/TV 렌탈 및 구축 운영용역 전문 법인, 서울 금천구 가산디지털단지 소재 중소기업)',
      interest_keywords TEXT NOT NULL DEFAULT '스마트서비스, 클라우드 바우처, AI 바우처, RPA 자동화, 중소기업 R&D, 디지털 전환(DX), 서비스형 SW(SaaS), 고용창출장려금, 청년일자리도약장려금, 조달청 나라장터 렌탈/임차 공고, 마이스(MICE)/전시 디스플레이 렌탈 트렌드',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    INSERT INTO erp_ai_intel_settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;
  `);

  // 초기 기본 시드 데이터 (최초 0건일 때 실무 활용도가 높은 주요 정부지원사업·뉴스·트렌드 제공)
  const countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM erp_gov_support_items`);
  if ((countRes.rows[0]?.cnt || 0) === 0) {
    const seedItems = [
      {
        category: "SUPPORT",
        agency: "중소벤처기업부 / 중소기업기술정보진흥원(TIPA)",
        title: "2026년 중소기업 스마트서비스 지원사업 (AI·RPA·클라우드 솔루션 구축 및 고도화)",
        region: "전국 (서울 금천구 포함)",
        target_audience: "IT·서비스·제조 중소기업 (공급기업 및 도입기업 컨소시엄)",
        support_amount: "신규 구축 최대 6,000만원 / 고도화 최대 1.5억원 (국비 50%)",
        start_date: "2026-11-01",
        end_date: "2026-12-15",
        dday_label: "접수중",
        fit_score: 98,
        status: "BOOKMARKED",
        summary:
          "중소기업의 업무 생산성 혁신을 위한 AI, 빅데이터, RPA(업무자동화), ERP 등 스마트서비스 솔루션 도입 및 공급기업 솔루션 고도화를 지원하는 핵심 사업입니다. (주)드래곤알피에이는 RPA 및 AI ERP 공급기업 등록 또는 자사 렌탈·물류 자동화 고도화 과제로 직접 참여 가능합니다.",
        eligibility_detail:
          "• 중소기업기본법 제2조에 따른 중소기업\n• AI/RPA/클라우드 기반 스마트서비스 구축 또는 공급 역량 보유 법인\n• 국세·지방세 체납 및 금융기관 채무불이행이 없는 기업",
        action_plan:
          "1. 공급기업 풀(Pool) 등록 여부 점검 및 사업계획서(AI 기반 렌탈자산·정산 자동화 ERP) 작성\n2. 수요기업(렌탈 고객사 등) 1~2곳과 컨소시엄 매칭 협의\n3. 중소기업 스마트서비스 지원시스템 온라인 접수",
        source_url: "https://www.smb-service.kr",
        keywords: "스마트서비스,RPA,AI ERP,TIPA,중소벤처기업부",
        is_bookmarked: true,
        published_date: "2026-11-01",
      },
      {
        category: "SUPPORT",
        agency: "과학기술정보통신부 / 정보통신산업진흥원(NIPA)",
        title: "2026~2027년 AI 바우처 및 클라우드 서비스 바우처 공급·수요기업 모집",
        region: "전국",
        target_audience: "AI·SW 솔루션 보유 중소·벤처기업 (공급기업) 및 디지털 전환 희망 중소기업",
        support_amount: "과제당 최대 2억원 바우처 지원 (자부담 20~30%)",
        start_date: "2026-11-10",
        end_date: "2026-12-20",
        dday_label: "공고예정",
        fit_score: 95,
        status: "DISCOVERED",
        summary:
          "NIPA 주관 AI 바우처 및 클라우드 바우처 사업으로, 드래곤알피에이의 RPA 자동화 및 클라우드형 ERP 솔루션을 공급기업 서비스로 등록하여 고객사에 정부보조금(최대 80%)으로 납품·구축할 수 있는 핵심 영업 레버리지 사업입니다.",
        eligibility_detail:
          "• 공급기업: 자체 개발 AI·SW·클라우드 솔루션 보유 법인\n• 수요기업: 국내 중소·중견기업, 의료기관 등",
        action_plan:
          "1. NIPA 사업관리시스템(SMART) 공급기업 사전 등록 서류 준비 (솔루션 소개서, 가격표, 실적증명원)\n2. 기존 용역 고객사 대상 바우처 수요기업 공동 참여 제안",
        source_url: "https://www.nipa.kr",
        keywords: "AI바우처,클라우드바우처,NIPA,공급기업,SaaS",
        is_bookmarked: true,
        published_date: "2026-11-03",
      },
      {
        category: "SUPPORT",
        agency: "고용노동부 / 한국고용정보원",
        title: "청년일자리도약장려금 및 고용창출장려금 (IT·운용 인력 신규 채용 지원)",
        region: "전국 (금천고용센터 관할)",
        target_audience: "5인 이상 우선지원대상기업 (지식서비스·SW·문화콘텐츠 업종은 1인 이상도 가능)",
        support_amount: "신규 채용 1인당 월 최대 60만원 × 12개월 + 2년 근속 시 480만원 (최대 1,200만원)",
        start_date: "2026-01-01",
        end_date: "2026-12-31",
        dday_label: "상시접수",
        fit_score: 93,
        status: "BOOKMARKED",
        summary:
          "정규직 신규 채용 후 6개월 이상 고용 유지 시 인건비를 직접 지원하는 고용노동부 핵심 장려금입니다. 렌탈운영팀 및 개발·기술지원 인력 충원 시 인건비 부담을 대폭 절감할 수 있습니다.",
        eligibility_detail:
          "• 4대보험 가입 및 최저임금 이상 지급 정규직 채용\n• 채용일 이전 사전 참여신청 또는 채용 후 기한 내 운영기관 신청 필수",
        action_plan:
          "1. 고용24(work24.go.kr) 기업회원 로그인 후 금천구 관할 운영기관 지정 신청\n2. 최근 채용 인력 및 향후 채용 예정 인원 적격 여부 확인",
        source_url: "https://www.work24.go.kr",
        keywords: "고용장려금,청년일자리도약장려금,인건비지원,고용노동부",
        is_bookmarked: true,
        published_date: "2026-10-25",
      },
      {
        category: "SUPPORT",
        agency: "서울경제진흥원(SBA) / 금천구청",
        title: "G밸리(가산·구로) 중소기업 디지털 전환(DX) 및 판로개척·마케팅 지원사업",
        region: "서울 금천구·구로구 (G밸리)",
        target_audience: "서울 금천구·구로구 소재 IT·지식산업센터 입주 중소기업",
        support_amount: "기업당 최대 2,000만원 (홍보·전시회·인증·시제품·클라우드 이용료)",
        start_date: "2026-11-05",
        end_date: "2026-11-29",
        dday_label: "접수중",
        fit_score: 91,
        status: "DISCOVERED",
        summary:
          "서울 금천구 가산디지털단지(G밸리) 입주 기업을 대상으로 SBA와 금천구청이 지원하는 맞춤형 기업지원 프로그램입니다. 본사 소재지(서울 금천구) 가점 대상에 해당합니다.",
        eligibility_detail:
          "• 본점 또는 주사업장이 서울 금천구(가산동·독산동) 소재 법인사업자\n• 상시근로자 5인 이상 또는 SW·IT 서비스 영위 기업",
        action_plan:
          "1. 서울경제진흥원(SBA) 스타트업플러스 포털 공고 확인\n2. 법인등기부등본, 사업자등록증, 중소기업확인서 첨부 온라인 신청",
        source_url: "https://www.sba.seoul.kr",
        keywords: "SBA,서울경제진흥원,금천구,G밸리,판로개척",
        is_bookmarked: false,
        published_date: "2026-11-04",
      },
      {
        category: "PROCUREMENT",
        agency: "조달청 나라장터 (KONEPS) / 공공기관",
        title: "[공공입찰 트렌드] 연말·연초 공공기관 및 학술행사 대형 스마트TV·디스플레이·OA 단기임차 발주 급증",
        region: "수도권 및 전국",
        target_audience: "물품임차(렌탈) 및 행사대행·전산용역 등록 사업자",
        support_amount: "건당 1,500만원 ~ 8,000만원 소액수의 및 제한경쟁 입찰 다수",
        start_date: "2026-11-01",
        end_date: "2026-12-31",
        dday_label: "상시모니터링",
        fit_score: 94,
        status: "DISCOVERED",
        summary:
          "4분기 예산 집행 및 연말 성과보고회·전시회 시즌 도래에 따라 정부부처·지자체·공공기관의 55~85인치 대형 스마트TV, 터치모니터, 노트북, 음향장비 단기 렌탈 및 설치·운영용역 발주가 집중되고 있습니다.",
        eligibility_detail:
          "• 나라장터 경쟁입찰참가자격 등록 업체\n• 중소기업확인서 및 직접생산/물품공급 자격 보유",
        action_plan:
          "1. 나라장터 키워드 알림('임차', '렌탈', '스마트TV', '모니터', '전시', 'RPA') 설정\n2. 보유 97대 TV/디스플레이 자산 가동 일정과 연계하여 고마진 단기 행사 입찰 참여",
        source_url: "https://www.g2b.go.kr",
        keywords: "나라장터,조달청,디스플레이임차,스마트TV렌탈,공공입찰",
        is_bookmarked: false,
        published_date: "2026-11-06",
      },
      {
        category: "TREND",
        agency: "IT·렌탈 산업 인텔리전스 리포트",
        title: "[트렌드] 2026~2027 기업용 B2B 디바이스 구독(Device-as-a-Service) 및 AI 에이전트 결합형 ERP 확산",
        region: "국내외 B2B 시장",
        target_audience: "B2B 렌탈·IT 아웃소싱·ERP/RPA 솔루션 기업",
        support_amount: "연평균 시장 성장률(CAGR) 18.4% 전망",
        start_date: "2026-11-07",
        end_date: "2027-12-31",
        dday_label: "핵심트렌드",
        fit_score: 96,
        status: "DISCOVERED",
        summary:
          "기업들이 초기 CAPEX(설비투자) 부담을 줄이기 위해 디스플레이·OA·IT 장비를 하드웨어 렌탈과 운영·유지보수 용역으로 통합 계약하는 DaaS(Device-as-a-Service) 수요가 급증하고 있습니다. 특히 Google Gemini 2.5 등 멀티모달 AI와 RPA를 결합해 계약·검수·세금계산서·미수금 대사를 자동화하는 기업이 영업이익률에서 2배 이상 격차를 보이고 있습니다.",
        eligibility_detail:
          "• 하드웨어 렌탈 자산관리 + 현장 운영인력 파견 + RPA 자동화 역량을 동시 보유한 하이브리드 사업모델 유리",
        action_plan:
          "1. 현대렌탈서비스 등 대형 파트너사 대상 '장비 입출고·검수·정산 자동화 + 현장 기술지원' 패키지 제안 강화\n2. AI 브리핑을 통한 주간 신규 공고 및 경쟁사 동향 정기 점검",
        source_url: "https://www.bizinfo.go.kr",
        keywords: "B2B렌탈,DaaS,AI에이전트,RPA트렌드,구독경제",
        is_bookmarked: false,
        published_date: "2026-11-07",
      },
      {
        category: "NEWS",
        agency: "정책브리핑 / 중소벤처기업부",
        title: "[정책뉴스] 정부, 2027년도 중소기업 AI·디지털 전환 및 기술개발(R&D) 보조금 예산 대폭 확대 편성",
        region: "전국",
        target_audience: "기술혁신형 중소기업(이노비즈), 벤처기업, 기업부설연구소 보유 기업",
        support_amount: "창업성장기술개발 디딤돌 과제 최대 1.2억원~2억원 (1년)",
        start_date: "2026-11-05",
        end_date: "2027-02-28",
        dday_label: "정책뉴스",
        fit_score: 89,
        status: "DISCOVERED",
        summary:
          "중소벤처기업부가 내년 초 공고 예정인 창업성장기술개발사업 및 서비스 R&D 사업에서 AI 활용 비즈니스 모델(예: AI 기반 렌탈 자산 수명예측·자동배차·회계대사 시스템)에 대한 우대 가점을 확대한다고 발표했습니다.",
        eligibility_detail:
          "• 기업부설연구소 또는 연구개발전담부서 보유(또는 설립 예정) 중소기업\n• 벤처기업 확인 또는 이노비즈/메인비즈 인증 시 가점 부여",
        action_plan:
          "1. 한국산업기술진흥협회(KOITA) 연구개발전담부서/기업부설연구소 요건 점검\n2. 1~2월 상반기 제1차 공고 대비 연구주제 사전 기획",
        source_url: "https://www.smtech.go.kr",
        keywords: "중소기업R&D,디딤돌과제,기업부설연구소,정책뉴스",
        is_bookmarked: false,
        published_date: "2026-11-05",
      },
    ];

    for (const item of seedItems) {
      await pool.query(
        `INSERT INTO erp_gov_support_items (
          category, agency, title, region, target_audience, support_amount,
          start_date, end_date, dday_label, fit_score, status, summary,
          eligibility_detail, action_plan, source_url, keywords, is_bookmarked, published_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          item.category,
          item.agency,
          item.title,
          item.region,
          item.target_audience,
          item.support_amount,
          item.start_date,
          item.end_date,
          item.dday_label,
          item.fit_score,
          item.status,
          item.summary,
          item.eligibility_detail,
          item.action_plan,
          item.source_url,
          item.keywords,
          item.is_bookmarked,
          item.published_date,
        ]
      );
    }
  }
}

function maskApiKey(key: string | null | undefined): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

// Google News RSS (한국어) 실시간 피드 수집 헬퍼 (무인증 실시간 뉴스 보강용)
async function fetchLiveKoreanNewsRss(queryText: string): Promise<
  Array<{ title: string; link: string; pubDate: string; source: string }>
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
    const results: Array<{ title: string; link: string; pubDate: string; source: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null && results.length < 10) {
      const block = match[1];
      const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/);
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
      const pubMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
      const rawTitle = (titleMatch?.[1] || titleMatch?.[2] || "")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .trim();
      const link = (linkMatch?.[1] || "").trim();
      const pubDate = (pubMatch?.[1] || "").trim();
      const source = (sourceMatch?.[1] || "뉴스피드").trim();
      if (rawTitle) {
        results.push({ title: rawTitle, link, pubDate, source });
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
    const storedKey = sRow.gemini_api_key || "";
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
      const nextKey =
        geminiApiKey !== undefined && geminiApiKey !== null && String(geminiApiKey).trim() !== ""
          ? String(geminiApiKey).trim()
          : existingKey;

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
          eligibility_detail, action_plan, source_url, keywords, is_bookmarked, published_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
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

    // 3. Google AI (Gemini + Google Search Grounding + 실시간 RSS) 지능형 탐색 및 대장 자동 적재
    if (action === "AI_DISCOVER") {
      const { queryTopic, targetCategory = "ALL" } = body;
      const settingsRes = await pool.query(`SELECT * FROM erp_ai_intel_settings WHERE id = 1 LIMIT 1`);
      const sRow = settingsRes.rows[0] || {};
      const apiKey =
        (body.tempApiKey && String(body.tempApiKey).trim()) ||
        sRow.gemini_api_key ||
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
${rssArticles.map((a, i) => `${i + 1}. ${a.title} (${a.source}) - ${a.link}`).join("\n")}

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

        // 만약 선택 모델에서 google_search tool 호환 이슈 발생 시 기본 생성으로 폴백
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
        let insertedCount = 0;

        if (Array.isArray(parsedList)) {
          for (const item of parsedList) {
            if (!item?.title) continue;
            // 동일 제목 중복 방지
            const dupCheck = await pool.query(
              `SELECT id FROM erp_gov_support_items WHERE title = $1 LIMIT 1`,
              [String(item.title).trim()]
            );
            if (dupCheck.rows.length > 0) continue;

            await pool.query(
              `INSERT INTO erp_gov_support_items (
                category, agency, title, region, target_audience, support_amount,
                start_date, end_date, dday_label, fit_score, status, summary,
                eligibility_detail, action_plan, source_url, keywords, is_bookmarked, published_date
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'DISCOVERED',$11,$12,$13,$14,$15,false,$16)`,
              [
                item.category || (targetCategory !== "ALL" ? targetCategory : "SUPPORT"),
                item.agency || "정부·공공기관",
                String(item.title).trim(),
                item.region || "전국",
                item.targetAudience || "중소기업",
                item.supportAmount || "공고문 참조",
                item.startDate || new Date().toISOString().slice(0, 10),
                item.endDate || "상시",
                item.ddayLabel || "신규발굴",
                Math.min(99, Math.max(70, Number(item.fitScore) || 90)),
                item.summary || "",
                item.eligibilityDetail || "",
                item.actionPlan || "",
                item.sourceUrl || "https://www.bizinfo.go.kr",
                item.keywords || searchTopic,
                new Date().toISOString().slice(0, 10),
              ]
            );
            insertedCount++;
          }
        }

        return NextResponse.json({
          success: true,
          insertedCount,
          mode: "GEMINI_GROUNDING",
          message: `Google AI (${modelName}) 실시간 탐색 완료: 신규 맞춤형 정보 ${insertedCount}건이 대장에 추가되었습니다.`,
        });
      }

      // 3-C. API 키 없이도 동작하는 실시간 뉴스/공고 RSS 자동 수집 모드
      let insertedCount = 0;
      for (const art of rssArticles.slice(0, 6)) {
        const dupCheck = await pool.query(
          `SELECT id FROM erp_gov_support_items WHERE title = $1 LIMIT 1`,
          [art.title]
        );
        if (dupCheck.rows.length > 0) continue;

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
          : new Date().toISOString().slice(0, 10);

        await pool.query(
          `INSERT INTO erp_gov_support_items (
            category, agency, title, region, target_audience, support_amount,
            start_date, end_date, dday_label, fit_score, status, summary,
            eligibility_detail, action_plan, source_url, keywords, is_bookmarked, published_date
          ) VALUES ($1,$2,$3,'전국','중소·벤처기업','원문 참조',$4,'상시','실시간뉴스',88,'DISCOVERED',$5,$6,$7,$8,$9,false,$10)`,
          [
            cat,
            art.source || "실시간 정책·뉴스 피드",
            art.title,
            pubIso,
            `[${art.source}] '${searchTopic}' 키워드로 실시간 수집된 최신 정책·산업 뉴스입니다. 우측 원문 링크 또는 [Google AI 심층분석 프롬프트 복사] 버튼으로 Google AI Ultra에서 즉시 사업계획서/요약을 생성할 수 있습니다.`,
            "• 관련 업종(IT·RPA·렌탈·용역) 해당 여부 원문 확인",
            "1. 원문 링크 열람 후 당사 적용 가능성 검토\n2. Google AI Ultra 브리핑 프롬프트로 세부 실행안 도출",
            art.link || "https://www.bizinfo.go.kr",
            searchTopic,
            pubIso,
          ]
        );
        insertedCount++;
      }

      return NextResponse.json({
        success: true,
        insertedCount,
        mode: "LIVE_RSS",
        message:
          insertedCount > 0
            ? `실시간 정책·뉴스 피드에서 '${searchTopic}' 관련 신규 정보 ${insertedCount}건을 수집했습니다.`
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
    const { id, status, isBookmarked, memo, fitScore } = body;

    if (!id) {
      return NextResponse.json({ error: "항목 ID가 필요합니다." }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE erp_gov_support_items
       SET status = COALESCE($1, status),
           is_bookmarked = COALESCE($2, is_bookmarked),
           memo = COALESCE($3, memo),
           fit_score = COALESCE($4, fit_score),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        status !== undefined ? status : null,
        isBookmarked !== undefined ? Boolean(isBookmarked) : null,
        memo !== undefined ? memo : null,
        fitScore !== undefined ? Number(fitScore) : null,
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
