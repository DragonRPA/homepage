export interface GovSupportItem {
  id: number;
  category: "SUPPORT" | "PROCUREMENT" | "NEWS" | "TREND" | string;
  agency: string;
  title: string;
  region: string;
  targetAudience: string;
  supportAmount: string;
  startDate: string | null;
  endDate: string | null;
  ddayLabel: string | null;
  fitScore: number;
  status: "DISCOVERED" | "BOOKMARKED" | "PREPARING" | "APPLIED" | "ARCHIVED" | string;
  summary: string | null;
  eligibilityDetail: string | null;
  actionPlan: string | null;
  originalContent: string | null;
  sourceUrl: string | null;
  keywords: string | null;
  isBookmarked: boolean;
  memo: string | null;
  publishedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiIntelSettings {
  hasApiKey: boolean;
  maskedApiKey: string;
  keySource: string;
  geminiModel: string;
  companyProfile: string;
  interestKeywords: string;
}

export interface GovSupportCreateForm {
  category: string;
  agency: string;
  title: string;
  region: string;
  targetAudience: string;
  supportAmount: string;
  startDate: string;
  endDate: string;
  ddayLabel: string;
  fitScore: number;
  summary: string;
  eligibilityDetail: string;
  actionPlan: string;
  originalContent: string;
  sourceUrl: string;
  keywords: string;
}

export const CATEGORY_META: Record<string, { label: string; badgeClass: string }> = {
  SUPPORT: {
    label: "정부지원·바우처",
    badgeClass: "bg-[#dbeafe] text-[#1e40af] border-[#93c5fd]",
  },
  PROCUREMENT: {
    label: "나라장터·공공입찰",
    badgeClass: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
  },
  NEWS: {
    label: "정책·산업뉴스",
    badgeClass: "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]",
  },
  TREND: {
    label: "AI·렌탈 트렌드",
    badgeClass: "bg-[#f3e8ff] text-[#6b21a8] border-[#d8b4fe]",
  },
};

export const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  DISCOVERED: {
    label: "발굴됨",
    badgeClass: "bg-[#ebe5d8] text-[#334155] border-[#b5a894]",
  },
  BOOKMARKED: {
    label: "관심검토",
    badgeClass: "bg-[#dbeafe] text-[#1e40af] border-[#93c5fd]",
  },
  PREPARING: {
    label: "신청준비중",
    badgeClass: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
  },
  APPLIED: {
    label: "접수완료",
    badgeClass: "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]",
  },
  ARCHIVED: {
    label: "마감/보류",
    badgeClass: "bg-[#f1f5f9] text-[#64748b] border-[#cbd5e1]",
  },
};

export const QUICK_TOPICS = [
  { label: "AI·클라우드·스마트서비스 바우처", query: "중소기업 AI 바우처 클라우드 바우처 스마트서비스 지원사업 공고" },
  { label: "청년채용·고용장려금 지원", query: "고용노동부 청년일자리도약장려금 고용창출장려금 중소기업 인건비 지원" },
  { label: "서울 금천구(G밸리)·SBA 지원사업", query: "서울경제진흥원 SBA 금천구 가산디지털단지 중소기업 지원사업 공고" },
  { label: "나라장터 디스플레이·TV·OA 임차", query: "조달청 나라장터 스마트TV 모니터 노트북 임차 렌탈 입찰 공고" },
  { label: "중소기업 R&D·디딤돌 기술개발", query: "중소벤처기업부 창업성장기술개발 디딤돌 R&D 지원사업 공고" },
  { label: "B2B 렌탈·RPA·AI ERP 트렌드", query: "B2B 렌탈 구독경제 RPA 업무자동화 AI 에이전트 ERP 산업 트렌드" },
];
