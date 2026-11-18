export interface StandardArticle {
  id: string;
  chapterNo: string;
  chapterTitle: string;
  articleNo: string;
  articleTitle: string;
  paragraphs: string[];
  relatedCommentaryIds: string[];
  keywords: string[];
}

export interface CommentaryCase {
  caseNo: string;
  title: string;
  body: string;
}

export interface CommentaryReference {
  title: string;
  body: string;
}

export interface CommentarySection {
  id: string;
  chapterNo: string;
  chapterTitle: string;
  sectionNo: string;
  sectionTitle: string;
  quotedArticles: string[];
  relatedArticleIds: string[];
  summaryTable?: string;
  explanations?: Array<{
    heading: string;
    body: string;
  }>;
  cases?: CommentaryCase[];
  references?: CommentaryReference[];
  keywords: string[];
}

export const ACCOUNTING_STANDARDS_META = {
  standardTitle: "중소기업회계기준",
  standardNoticeNo: "법무부고시 제2013-0029호",
  enactedDate: "2013. 2. 1. 제정",
  effectiveDate: "2014. 1. 1. 시행 (2013. 1. 1. 조기적용 가능)",
  department: "법무부 법무실 상사법무과 (금융위원회·중소기업청장 협의)",
  legalBasis: "「상법」 제446조의2 및 같은 법 시행령 제15조제3호",
  commentaryTitle: "중소기업회계기준 해설",
  commentaryAuthor: "법무부 · 한국회계기준원 (KAI)",
  commentaryDate: "2013. 3. 29.",
  standardPdfUrl: "/docs/accounting/법무부고시_제2013-0029호_중소기업회계기준.pdf",
  commentaryPdfUrl: "/docs/accounting/중소기업회계기준_해설_2013_v1.2.pdf",
};

export const STANDARD_CHAPTERS: Array<{ no: string; title: string }> = [
  { no: "제1장", title: "총칙 (제1조~제5조)" },
  { no: "제2장", title: "대차대조표 (제6조~제22조)" },
  { no: "제3장", title: "손익계산서 (제23조~제35조)" },
  { no: "제4장", title: "자산·부채의 평가 (제36조~제42조)" },
  { no: "제5장", title: "회계정책·회계추정의 변경과 오류수정 (제43조~제44조)" },
  { no: "제6장", title: "자본거래 (제45조~제48조)" },
  { no: "제7장", title: "특수 거래 (제49조~제51조)" },
  { no: "제8장", title: "자본변동표 (제52조)" },
  { no: "제9장", title: "이익잉여금처분계산서 및 결손금처리계산서 (제53조~제54조)" },
  { no: "제10장", title: "주석 (제55조~제56조)" },
  { no: "부칙", title: "부칙 (2013. 2. 1. 제1조~제2조)" },
  { no: "별지서식", title: "별지 제1호~제5호 재무제표 서식" },
];

export const COMMENTARY_CHAPTERS: Array<{ no: string; title: string }> = [
  { no: "서문", title: "제정 배경 · 제정 원칙 · 해설 안내" },
  { no: "제1장", title: "중소기업회계기준의 적용 대상과 목적" },
  { no: "제2장", title: "시행일 및 경과조치" },
  { no: "제3장", title: "회계정책, 회계추정과 오류" },
  { no: "제4장", title: "재무제표 표시" },
  { no: "제5장", title: "자산·부채의 평가" },
  { no: "제6장", title: "재고자산" },
  { no: "제7장", title: "유형자산" },
  { no: "제8장", title: "무형자산" },
  { no: "제9장", title: "이자비용 등의 자본화" },
  { no: "제10장", title: "자산손상" },
  { no: "제11장", title: "금융상품" },
  { no: "제12장", title: "종업원급여와 그 밖의 충당부채" },
  { no: "제13장", title: "외화거래" },
  { no: "제14장", title: "수익인식" },
  { no: "제15장", title: "자본거래" },
  { no: "제16장", title: "리스거래" },
  { no: "제17장", title: "정부보조금과 공사부담금" },
  { no: "제18장", title: "사업결합" },
];
