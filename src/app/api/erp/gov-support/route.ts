export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

const SEED_ORIGINAL_CONTENTS: Record<string, string> = {
  "2026년 중소기업 스마트서비스 지원사업 (AI·RPA·클라우드 솔루션 구축 및 고도화)": `[공고원문 요약본 - 중소벤처기업부 공고 / 전담기관: 중소기업기술정보진흥원(TIPA)]

1. 사업개요
 □ 사업목적: 중소기업 서비스 분야의 생산성 향상, 고부가가치화 및 신사업 창출을 위해 AI(인공지능), 빅데이터, 클라우드, RPA(로보틱 프로세스 자동화), 지능형 ERP 등 첨단 ICT 솔루션 도입 및 공급기업 솔루션 고도화를 지원
 □ 지원규모
  - 신규 구축(도입기업 + 공급기업 컨소시엄): 과제당 최대 6,000만원 (정부지원금 50%, 기업부담금 50%)
  - 고도화/선도형(솔루션 고도화 및 데이터 연동): 과제당 최대 1억 5,000만원 (정부지원금 50%)

2. 신청자격
 □ 도입기업: 「중소기업기본법」 제2조에 따른 중소기업
 □ 공급기업: 스마트서비스 솔루션(AI, RPA, 클라우드 ERP, 물류·렌탈 관리 시스템 등) 설계·개발·구축 역량을 보유한 중소·중견기업
  * (주)드래곤알피에이는 자체 개발 RPA 업무자동화 및 AI ERP 솔루션을 기반으로 '공급기업' 참여 가능하며, 자사 렌탈·입출고·정산 고도화를 위한 '도입기업'으로도 신청 가능

3. 지원내용
 □ 인건비(신규 및 내부 개발인력), SW 개발·커스터마이징 용역비, 클라우드 서버 임차료, 외부 전문가 활용비, 솔루션 시험·인증비(GS인증·보안검증 등)

4. 평가절차 및 우대사항
 □ 1차 서면평가(사업계획서 타당성, 기술성, 실현가능성) → 2차 발표평가(컨소시엄 역량, 성과지표 명확성)
 □ 우대 가점: 벤처기업, 이노비즈/메인비즈 인증기업, 청년고용 우수기업, AI/빅데이터 핵심기술 적용 과제

5. 신청방법 및 문의처
 □ 접수처: 중소기업 스마트서비스 지원시스템 (https://www.smb-service.kr) 온라인 접수
 □ 제출서류: 스마트서비스 사업계획서, 도입·공급기업 사업자등록증, 중소기업확인서, 최근 3개년 표준재무제표증명, 국세·지방세 완납증명서`,

  "2026~2027년 AI 바우처 및 클라우드 서비스 바우처 공급·수요기업 모집": `[공고원문 요약본 - 과학기술정보통신부 / 정보통신산업진흥원(NIPA)]

1. 사업개요
 □ AI 바우처 지원사업: AI 기술 적용이 필요한 수요기업(중소·벤처·중견기업)에게 바우처를 발급하고, 수요기업은 AI 솔루션 보유 공급기업으로부터 자사 맞춤형 AI 솔루션을 구매·구축하도록 지원
 □ 클라우드 서비스 바우처 지원사업: 국내 중소기업의 디지털 전환(DX) 촉진을 위해 클라우드 기반 SaaS(ERP, CRM, RPA, 협업툴 등) 도입 이용료 및 데이터 이관 비용을 지원

2. 지원한도 및 분담비율
 □ AI 바우처: 과제당 최대 2억원 이내 (정부지원금 70~80%, 수요기업 자부담 20~30% 현금+현물)
 □ 클라우드 서비스 바우처:
  - 일반지원: 기업당 최대 1,550만원 (국비 80% 지원)
  - 집중지원(심화 컨설팅 + 데이터 마이그레이션 포함): 기업당 최대 5,000만원~8,000만원 (국비 80% 지원)

3. (주)드래곤알피에이 활용 전략
 □ 공급기업(Pool) 등록 시: 당사 AI ERP 및 RPA 자동화 솔루션을 NIPA 공급 서비스로 등록하여, 거래처(렌탈·유통·서비스 기업)가 정부보조금 80%를 지원받아 당사 솔루션을 도입하도록 영업 레버리지 극대화
 □ 수요기업 신청 시: 사내 AI 에이전트 고도화 및 클라우드 인프라 확충 비용의 80% 국비 절감

4. 접수 및 공고 확인
 □ 정보통신산업진흥원(NIPA) 홈페이지 (https://www.nipa.kr) 및 NIPA SMART 사업관리시스템
 □ 클라우드 서비스 지원포털 (https://www.cloudsup.or.kr)`,

  "청년일자리도약장려금 및 고용창출장려금 (IT·운용 인력 신규 채용 지원)": `[공고원문 요약본 - 고용노동부 / 한국고용정보원 (고용24)]

1. 사업목적
 □ 기업의 청년 정규직 채용을 촉진하고 인건비 부담을 완화하기 위해 5인 이상 우선지원대상기업(지식서비스·SW·IT·문화콘텐츠 업종은 1인~4인 기업도 특례 인정)에 채용장려금을 직접 지원

2. 지원요건
 □ 기업요건: 고용보험 피보험자 수 5인 이상 우선지원대상기업 (단, SW개발·정보통신·지식서비스 산업 등 예외업종은 1인 이상 가능)
 □ 청년요건: 채용일 현재 만 15세 이상 ~ 34세 이하 청년 (군필자의 경우 복무기간만큼 최대 만 39세까지 연장)
 □ 채용조건: 정규직(기간의 정함이 없는 근로자)으로 채용 후 6개월 이상 고용유지, 주 30시간 이상 근로 및 최저임금 이상 지급, 4대 사회보험 가입 필수

3. 지원금액 및 지급방식
 □ 신규 채용 청년 1인당 월 최대 60만원 × 12개월 지원 (1년차 최대 720만원)
 □ 최초 채용일로부터 2년 근속 시 480만원 일시 지급 → 1인당 2년간 최대 1,200만원 무상 지원

4. 신청절차
 □ 고용24 (https://www.work24.go.kr) 접속 → 기업회원 로그인 → 사업장 소재지 관할 운영기관(서울 금천구 가산디지털단지 관할 운영기관) 선택 후 참여신청서 제출
 □ 채용 후 3개월 이내 채용자 명단 통보 및 6개월 고용유지 후 제1회차 지원금 신청`,

  "G밸리(가산·구로) 중소기업 디지털 전환(DX) 및 판로개척·마케팅 지원사업": `[공고원문 요약본 - 서울경제진흥원(SBA) / 금천구청 기업지원과]

1. 사업개요
 □ 서울 디지털산업단지(G밸리: 금천구 가산동·독산동, 구로구 구로동) 소재 유망 중소·벤처기업의 기술경쟁력 강화 및 국내외 판로 개척을 위한 종합 맞춤형 바우처 지원

2. 지원대상
 □ 본점 또는 주사업장(지점·기업부설연구소 포함)이 서울특별시 금천구 또는 구로구에 소재한 중소기업
  * (주)드래곤알피에이 본점 소재지(서울 금천구 서부샛길 / 가산동) 요건 100% 부합

3. 세부 지원항목 (기업당 최대 2,000만원 한도 내 자율 선택)
 □ 디지털 전환(DX): 업무용 SW·클라우드 서비스 임차, 홈페이지·쇼핑몰·ERP 고도화
 □ 판로개척 및 마케팅: 국내외 전시회·박람회 참가 부스비, 홍보영상·카탈로그 제작, 온라인 키워드/검색 광고비
 □ 기술보호 및 인증: 특허·상표 출원비, ISO인증, 벤처기업/이노비즈 인증 수수료, 보안 시스템 구축

4. 신청방법
 □ 서울경제진흥원(SBA) 스타트업플러스 (https://www.sba.seoul.kr) 및 금천구청 홈페이지 고시·공고란
 □ 필수서류: 사업신청서, 사업자등록증명원, 법인등기부등본, 중소기업확인서, 국세·지방세 완납증명서`,

  "[공공입찰 트렌드] 연말·연초 공공기관 및 학술행사 대형 스마트TV·디스플레이·OA 단기임차 발주 급증": `[나라장터(KONEPS) 공공입찰 발주 동향 원문 브리핑]

1. 발주 동향 핵심 요약
 □ 매년 11월~익년 2월은 정부부처, 지자체, 국책연구기관, 대학교(산학협력단), 코엑스/킨텍스/벡스코 전시주관사의 연말 성과발표회·학술대회·CES 프리뷰·신년 인사회가 집중되는 시기입니다.
 □ 이에 따라 조달청 나라장터(G2B)에 55인치~85인치 대형 스마트TV(이동식 스탠드 포함), 터치스크린 키오스크, 업무용 노트북, 레이저 프린터·복합기 단기 임차(렌탈) 및 현장 설치·철거 용역 공고가 전월 대비 2.4배 이상 급증하고 있습니다.

2. 주요 발주 형태 및 예산 규모
 □ 소액수의계약(견적입찰): 추정가격 2,000만원 이상 ~ 5,000만원 이하 (여성기업·중소기업·지역제한 다수)
 □ 제한경쟁입찰(총액/단가): 5,000만원 ~ 1.5억원 규모 (전시회·국제행사 통합 장비 임차)
 □ 나라장터 종합쇼핑몰 / 벤처나라: 사전 등록 물품의 경우 수의계약 직발주 가능

3. (주)드래곤알피에이 실전 대응 포인트
 □ 당사 보유 97대 스마트TV(UDH 55/65, SMART TV 55/75 등) 자산의 유휴 기간을 활용하여, 단기 고단가 행사 렌탈 입찰에 참여 시 장비 회전율 및 마진율 극대화 가능
 □ 설치·배송·회수 인력(렌탈운영팀)과 자체 배차·검수 ERP를 보유하고 있어 공공기관이 요구하는 납품검수조서 및 사진대지 즉시 제출 가능`,

  "[트렌드] 2026~2027 기업용 B2B 디바이스 구독(Device-as-a-Service) 및 AI 에이전트 결합형 ERP 확산": `[산업 인텔리전스 원문 리포트 - B2B 렌탈 & AI ERP 시장 분석]

1. B2B 디바이스 구독(DaaS: Device-as-a-Service) 시장의 구조적 성장
 □ 고금리 및 IT 장비 교체주기 단축으로 인해 일반 기업과 공공기관 모두 디스플레이·노트북·복합기·전산장비를 직접 매입(CAPEX)하기보다, 월 정액 렌탈과 현장 유지보수·자산관리 용역을 결합한 DaaS(OPEX) 계약을 선호하고 있습니다.
 □ 단순 하드웨어 대여만 제공하는 전통 렌탈사 대비, '현장 입출고·설치·AS 운영인력 파견 + IT 자산관리 시스템'을 함께 제공하는 통합 운영 용역사의 계약 갱신율이 92% 이상으로 나타났습니다.

2. AI 에이전트 결합형 ERP 및 RPA 자동화의 경쟁 우위
 □ 렌탈 및 용역 비즈니스에서 가장 큰 관리 손실은 ① 장비 위치·상태 추적 누락, ② 일할계산·초과근무 반영 등 월말 정산 오류, ③ 세금계산서 발행과 통장 입금 내역 간의 미수금 대사 지연에서 발생합니다.
 □ Google Gemini 2.5 등 LLM과 RPA를 ERP에 내재화하여 근로계약·연차·초과근무·용역청구·세금계산서·은행입출금 FIFO 대사를 1-Way 파이프라인으로 통합한 기업은 백오피스 행정 공수를 75% 이상 절감하고 있습니다.`,

  "[정책뉴스] 정부, 2027년도 중소기업 AI·디지털 전환 및 기술개발(R&D) 보조금 예산 대폭 확대 편성": `[정책브리핑 원문 요약 - 중소벤처기업부 2027년 R&D 및 DX 지원방향]

1. 정책 발표 주요 내용
 □ 정부는 2027년도 중소벤처기업부 예산안에서 '인공지능(AI) 활용 비즈니스 모델 상용화', '스마트서비스 고도화', '초격차·디딤돌 기술개발(R&D)' 부문의 출연금 예산을 대폭 확대 편성했습니다.
 □ 특히 제조 중심이었던 기존 지원틀에서 벗어나, 물류·렌탈·유통·지식서비스 분야에서 AI와 자동화(RPA)를 결합해 현장 업무 효율을 높이는 '서비스 R&D' 과제의 선정 비중을 크게 늘릴 계획입니다.

2. 주요 대상 사업
 □ 창업성장기술개발사업 (디딤돌 첫걸음 / 도약 과제): 1년간 최대 1.2억원 ~ 2억원 무상 출연금 지원
 □ 중소기업 기술혁신개발사업: 2년간 최대 5억원 지원
 □ 중소기업 스마트서비스 지원사업: 최대 6,000만원 ~ 1.5억원 지원

3. 사전 준비 체크리스트
 □ 한국산업기술진흥협회(KOITA) 연구개발전담부서 또는 기업부설연구소 설립 인정서 확보 (보유 시 R&D 과제 신청자격 및 세액공제 혜택)
 □ 당사 ERP/RPA 고도화 주제(예: 'AI 기반 렌탈 자산 라이프사이클 추적 및 자동 정산·대사 플랫폼 개발')로 표준 사업계획서 사전 모듈화`,
};

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
          eligibility_detail, action_plan, original_content, source_url, keywords, is_bookmarked, published_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
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
          SEED_ORIGINAL_CONTENTS[item.title] || item.summary,
          item.source_url,
          item.keywords,
          item.is_bookmarked,
          item.published_date,
        ]
      );
    }
  } else {
    // 기존 시드 데이터 중 original_content가 비어 있는 항목 자동 보강
    for (const [seedTitle, seedOrig] of Object.entries(SEED_ORIGINAL_CONTENTS)) {
      await pool.query(
        `UPDATE erp_gov_support_items
         SET original_content = $1
         WHERE title = $2 AND (original_content IS NULL OR original_content = '')`,
        [seedOrig, seedTitle]
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
        let insertedCount = 0;

        if (Array.isArray(parsedList)) {
          for (const item of parsedList) {
            if (!item?.title) continue;
            const dupCheck = await pool.query(
              `SELECT id FROM erp_gov_support_items WHERE title = $1 LIMIT 1`,
              [String(item.title).trim()]
            );
            if (dupCheck.rows.length > 0) continue;

            await pool.query(
              `INSERT INTO erp_gov_support_items (
                category, agency, title, region, target_audience, support_amount,
                start_date, end_date, dday_label, fit_score, status, summary,
                eligibility_detail, action_plan, original_content, source_url, keywords, is_bookmarked, published_date
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'DISCOVERED',$11,$12,$13,$14,$15,$16,false,$17)`,
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
                item.originalContent || item.summary || "",
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

      // 3-C. API 키 없이도 동작하는 실시간 뉴스/공고 RSS 자동 수집 모드 (수집 원문 포함)
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

        await pool.query(
          `INSERT INTO erp_gov_support_items (
            category, agency, title, region, target_audience, support_amount,
            start_date, end_date, dday_label, fit_score, status, summary,
            eligibility_detail, action_plan, original_content, source_url, keywords, is_bookmarked, published_date
          ) VALUES ($1,$2,$3,'전국','중소·벤처기업','원문 참조',$4,'상시','실시간뉴스',88,'DISCOVERED',$5,$6,$7,$8,$9,$10,false,$11)`,
          [
            cat,
            art.source || "실시간 정책·뉴스 피드",
            art.title,
            pubIso,
            art.description
              ? `${art.description}\n\n(※ 우측 [수집 원문 전문 보기] 버튼으로 수집 원문을 즉시 열람하거나 [공식 공고/원문 사이트 열기]로 이동할 수 있습니다.)`
              : `[${art.source}] '${searchTopic}' 키워드로 실시간 수집된 최신 정책·산업 뉴스입니다.`,
            "• 관련 업종(IT·RPA·렌탈·용역) 해당 여부 원문 확인",
            "1. [수집 원문 전문 보기]로 세부 내용 확인\n2. Google AI Ultra 브리핑 프롬프트로 사업계획서/실행안 도출",
            rssOriginalText,
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
