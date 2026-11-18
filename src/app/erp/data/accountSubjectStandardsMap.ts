import type {
  StandardArticle,
  CommentarySection,
} from "./accountingStandardsMeta";
import {
  BS_ACCOUNT_SUBJECT_STANDARDS,
  type AccountSubjectStandardInfo,
} from "./accountSubjectStandardsBsEntries";
import { PL_CF_ACCOUNT_SUBJECT_STANDARDS } from "./accountSubjectStandardsPlCfEntries";

export type { AccountSubjectStandardInfo };

export interface SMEAccountingAuditItem {
  id: string;
  chapterAndArticle: string;
  standardTopic: string;
  smeRequirement: string;
  erpImplementation: string;
  verdict: "부합" | "특례적용(부합)" | "선택준용(부합)";
}

export const SME_ACCOUNTING_COMPLIANCE_SUMMARY: SMEAccountingAuditItem[] = [
  {
    id: "audit-1",
    chapterAndArticle: "제1장 제1조~제5조 · 별지 제1호·제2호",
    standardTopic: "적용 대상 · 재무제표 구성 및 준거기준 명시",
    smeRequirement:
      "비외감 소규모 주식회사 적용(제2조), 대차대조표·손익계산서·주석 필수(현금흐름표 면제, 제4조①), 과목의 통합·신설 허용(제5조), 재무제표 하단 준거기준 기재 의무(제4조③).",
    erpImplementation:
      "(주)드래곤알피에이(비외감 법인) 및 드래곤알피에이(개인 준용) 재무제표를 중소기업회계기준에 따라 작성하고, 제3조(일반기업회계기준 참조)에 의거 현금흐름표(CF)를 추가 제공하며, BS·PL 하단에 준거기준 문구를 명시함.",
    verdict: "부합",
  },
  {
    id: "audit-2",
    chapterAndArticle: "제2장 제6조~제22조 · 제4장 제36조, 제40조, 제41조",
    standardTopic: "대차대조표 구분표시 · 채권/채무 및 임차보증금 명목금액 측정",
    smeRequirement:
      "1년 기준 유동/비유동 구분 및 총액표시(제6조⑤~⑦), 매출채권·매입채무·임차보증금 현재가치할인차금 평가 면제 및 명목금액 측정 허용(제40조①, 제41조①).",
    erpImplementation:
      "유동자산(현금및현금성자산, 매출채권, 부가세대급금·선급법인세)과 비유동자산(임차보증금 500만원 명목금액, 유형자산 순장부가액), 유동부채(매입채무, 원천세·부가세 예수금, 미지급법인세), 자본(자본금 500만원, 이익잉여금)으로 구분 표시함.",
    verdict: "특례적용(부합)",
  },
  {
    id: "audit-3",
    chapterAndArticle: "제2장 제11조~제12조 · 제4장 제38조 · 제7장 제49조",
    standardTopic: "임대용 유형·무형자산 자산화 및 정액법 감가상각(법인세법 내용연수)",
    smeRequirement:
      "타인에 대한 임대 목적 보유 자산의 유형·무형자산 분류(제11조①, 제12조①), 자본적 지출 자산화 및 수익적 지출 비용화(제38조③), 법인세법 제23조에 따른 잔존가치(0원)·내용연수 및 정액법 상각 허용(제38조⑥~⑧).",
    erpImplementation:
      "렌탈자산 98대(13개 모델: 55~75인치 TV, 프로젝터, DDR5 RAM, NVMe SSD, 한컴 라이선스) 매입액을 즉시 비용 처리하지 않고 전액 자산화한 후, 내용연수(1~4년) 동안 정액법 월할 상각하여 '임대자산 감가상각비(매출원가)'와 '감가상각누계액(BS 차감계정)'으로 1:1 대응 인식함.",
    verdict: "특례적용(부합)",
  },
  {
    id: "audit-4",
    chapterAndArticle: "제3장 제23조~제28조 · 제7장 제49조",
    standardTopic: "발생주의 수익인식 · 렌탈 매출 4분류 및 수익·비용 대응",
    smeRequirement:
      "재화 인도·용역 제공 완료 시 수익 인식, 1년 내 단기용역 완성기준 허용(제24조①·②), 매출에누리·환입 차감 측정(제25조·제26조), 수익에 직접 대응하는 원가의 매출원가 인식(제23조③, 제27조①).",
    erpImplementation:
      "전자세금계산서 발행(공급시기) 기준 발생주의로 매출을 인식하며, 수정세금계산서(음수)는 매출에누리·환입으로 차감함. 렌탈 매출을 자사자산 임대·전대임대·단기용역·부대상품 판매의 4개 세목으로 구분하고 감가상각비·전대임차료를 매출원가에 직접 대응시킴.",
    verdict: "부합",
  },
  {
    id: "audit-5",
    chapterAndArticle: "제2장 제17조 · 제3장 제29조",
    standardTopic: "종업원급여 · 확정기여형(DC형) 퇴직연금 및 판매비와관리비 분류",
    smeRequirement:
      "근무용역 제공 시 급여 인식(제17조①), 확정기여형(DC형) 퇴직연금 당기 부담금의 퇴직급여 비용 인식(제17조④), 판매·관리활동 비용의 판관비 구분 표시(제29조①·②).",
    erpImplementation:
      "급여·상여·일용직급여 및 4대보험 기관납부액을 인건비로 집계하고, 근로복지공단 푸른씨앗(중소기업퇴직연금기금 DC형) 납입 부담금을 제17조④에 따라 당기 퇴직급여로 비용 인식하며, 복리후생비·임차료·통신비·수도광열비·차량유지비·지급수수료를 판관비로 분류함.",
    verdict: "부합",
  },
  {
    id: "audit-6",
    chapterAndArticle: "제3장 제24조③, 제31조, 제34조 · 제10장 제55조~제56조",
    standardTopic: "이자수익 현금수취 특례 · 이연법인세 면제(법인세비용) 및 주석 공시",
    smeRequirement:
      "이자수익의 현금수취시점 인식 허용(제24조③ 단서), 이연법인세 회계 면제 및 법인세법 납부세액만 당기 법인세비용 인식(제34조), 필수적·선택적 주석 기재(제55조·제56조).",
    erpImplementation:
      "예금 결산이자는 수취 시점에 인식하고, 8월 법인세 중간예납은 '선급법인세(당좌자산)'로 분리하며 귀속연도 확정 법인세만 손익 차감함. 부가가치세는 공급가액 기준에서 예수금·대급금으로 정산하고, 연도별 주석(Remark) 보드에 제55조 핵심 회계정책을 공시함.",
    verdict: "특례적용(부합)",
  },
];

export const ACCOUNT_SUBJECT_STANDARDS_MAP: Record<string, AccountSubjectStandardInfo> = {
  ...PL_CF_ACCOUNT_SUBJECT_STANDARDS,
  ...BS_ACCOUNT_SUBJECT_STANDARDS,
};

export function resolveAccountSubjectStandard(
  keyOrSubAccount: string,
  fallbackMajor?: string
): AccountSubjectStandardInfo {
  const trimmed = (keyOrSubAccount || "").trim();
  if (ACCOUNT_SUBJECT_STANDARDS_MAP[trimmed]) {
    return ACCOUNT_SUBJECT_STANDARDS_MAP[trimmed];
  }
  const cleanTitle = trimmed.replace(/^[·└★\s]+/, "").trim();
  if (ACCOUNT_SUBJECT_STANDARDS_MAP[cleanTitle]) {
    return ACCOUNT_SUBJECT_STANDARDS_MAP[cleanTitle];
  }
  for (const [k, v] of Object.entries(ACCOUNT_SUBJECT_STANDARDS_MAP)) {
    if (cleanTitle.includes(k) || k.includes(cleanTitle)) {
      return v;
    }
  }
  if (fallbackMajor && ACCOUNT_SUBJECT_STANDARDS_MAP[fallbackMajor]) {
    return ACCOUNT_SUBJECT_STANDARDS_MAP[fallbackMajor];
  }
  return ACCOUNT_SUBJECT_STANDARDS_MAP.REVENUE;
}

let cachedSmeStandardsPayload: {
  articles: StandardArticle[];
  commentaries: CommentarySection[];
} | null = null;

async function loadSmeStandardsPayload(): Promise<{
  articles: StandardArticle[];
  commentaries: CommentarySection[];
}> {
  if (cachedSmeStandardsPayload) {
    return cachedSmeStandardsPayload;
  }
  const res = await fetch("/api/erp/accounting-standards?kind=sme", {
    cache: "force-cache",
  });
  if (!res.ok) {
    throw new Error(`중소기업회계기준 조회 실패 (${res.status})`);
  }
  const data = await res.json();
  cachedSmeStandardsPayload = {
    articles: Array.isArray(data?.articles) ? data.articles : [],
    commentaries: Array.isArray(data?.commentaries) ? data.commentaries : [],
  };
  return cachedSmeStandardsPayload;
}

export async function fetchLinkedArticlesAndCommentaries(
  info: AccountSubjectStandardInfo
): Promise<{
  articles: StandardArticle[];
  commentaries: CommentarySection[];
}> {
  const { articles: allArticles, commentaries: allCommentaries } =
    await loadSmeStandardsPayload();
  const articles = info.articleIds
    .map((id) => allArticles.find((a) => a.id === id))
    .filter((a): a is StandardArticle => Boolean(a));
  const commentaries = info.commentaryIds
    .map((id) => allCommentaries.find((c) => c.id === id))
    .filter((c): c is CommentarySection => Boolean(c));
  return { articles, commentaries };
}
