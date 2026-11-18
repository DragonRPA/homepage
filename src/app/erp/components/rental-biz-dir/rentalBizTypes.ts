export interface RentalBizRecord {
  id: number;
  sector: "FL" | "AWP" | "OA_PC";
  companyName: string;
  businessNo: string;
  ceoName: string;
  region: string;
  address: string;
  bizScope: string;
  mainBrands: string;
  mainProducts: string;
  officialSource: string;
  ksicCode: string;
  phone: string;
  websiteUrl: string;
  scaleNote: string;
  salesStatus: string;
  memo: string;
  isBookmarked: boolean;
  isRegisteredCustomer?: boolean;
  isRegisteredVendor?: boolean;
  updatedAt: string;
  createdAt: string;
}

export const SECTOR_META: Record<
  "FL" | "AWP" | "OA_PC",
  { label: string; shortLabel: string; badgeClass: string; ksic: string }
> = {
  FL: {
    label: "FL (지게차 판매·임대업)",
    shortLabel: "FL 지게차",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-400",
    ksic: "KSIC 71201 / 건설기계대여업",
  },
  AWP: {
    label: "AWP (고소작업대 판매·임대업)",
    shortLabel: "AWP 고소작업대",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-400",
    ksic: "KSIC 71201 / 한국고소작업대임대업협동조합",
  },
  OA_PC: {
    label: "PC · 노트북 · 복합기(OA) 임대업",
    shortLabel: "PC·복합기(OA)",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-400",
    ksic: "KSIC 71202 / 나라장터 MAS",
  },
};

export type OaSupplyType = "OA" | "MFP" | "BOTH";

export const OA_SUPPLY_META: Record<
  OaSupplyType,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  OA: {
    label: "공급: OA 전문 (PC·노트북·전산·사무기기)",
    shortLabel: "OA 전문",
    badgeClass: "bg-sky-100 text-sky-900 border-sky-400",
  },
  MFP: {
    label: "공급: 복합기 전문 (디지털복합기·프린터·복사기)",
    shortLabel: "복합기 전문",
    badgeClass: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-400",
  },
  BOTH: {
    label: "공급: 둘다 (OA + 복합기 통합)",
    shortLabel: "둘다(OA+복합기)",
    badgeClass: "bg-teal-100 text-teal-900 border-teal-400",
  },
};

export function resolveOaSupplyType(item: RentalBizRecord): OaSupplyType {
  const scope = String(item.bizScope || "");
  if (scope.includes("[공급: OA]")) return "OA";
  if (scope.includes("[공급: 복합기]")) return "MFP";
  if (scope.includes("[공급: 둘다")) return "BOTH";

  const cname = String(item.companyName || "").trim();
  const hasSindohOrMfpWord = /신도|리코|리소|복사기|프린팅|프린터|컬러|잉크|인쇄|제록스|캐논|교세라/.test(cname);
  const hasServiceCenter = /서비스\s*센터|서비스센타/.test(cname);
  const hasOaOrOfficeWord = /OA|O\.A|오에이|오\.에이|사무기|오피스|문구|문방/.test(cname);
  const hasPcOrItWord = /컴퓨터|컴|피씨|PC|전산|정보|아이티|IT|네트웍|네트워크|시스|테크|솔루션|데이타|데이터|소프트|뱅크|씨앤씨|C&C/.test(cname);

  if (hasServiceCenter || (hasSindohOrMfpWord && !hasOaOrOfficeWord && !hasPcOrItWord) || /프린팅|복사기|리소|컬러에이지/.test(cname)) {
    return "MFP";
  }
  if (!hasSindohOrMfpWord && (hasPcOrItWord || /문방사우|오에이디포|OA DEPOT|오피스웨이브|플러스오피스|현대렌탈서비스|렌티브|렌트릭스|비즈하이시스템|어피니티/.test(cname))) {
    return "OA";
  }
  return "BOTH";
}

export const SALES_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  TARGET: { label: "발굴완료(타깃)", badgeClass: "bg-[#e2dbcd] text-[#334155] border-[#b8ae99]" },
  CONTACTED: { label: "접촉/제안중", badgeClass: "bg-blue-100 text-blue-900 border-blue-300" },
  PARTNER: { label: "매입처등록됨", badgeClass: "bg-violet-100 text-violet-900 border-violet-300" },
  CUSTOMER: { label: "매출처등록됨", badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-400" },
  HOLD: { label: "보류", badgeClass: "bg-slate-200 text-slate-600 border-slate-300" },
};

export const OFFICIAL_PORTAL_LINKS = [
  {
    name: "한국고소작업대임대업협동조합 (klra.or.kr)",
    desc: "중소벤처기업부 인가 고소작업대(리프트) 공식 협동조합 — 전국 지회별(서울·경기·충청·호남·부울경) 100여 개 정회원사 명부",
    url: "https://www.klra.or.kr",
  },
  {
    name: "공공데이터포털 (data.go.kr - 건설기계대여업)",
    desc: "전국 시·군·구청 『건설기계대여업 등록 현황』 엑셀(CSV) 및 Open API 원천 데이터 (지게차 FL 정식 대여업체 명단)",
    url: "https://www.data.go.kr",
  },
  {
    name: "조달청 나라장터 종합쇼핑몰 (shopping.g2b.go.kr)",
    desc: "다수공급자계약(MAS) 『사무기기임대(복합기)』·『컴퓨터임대』·『지게차』·『고소작업대』 계약 공급사 조회",
    url: "https://shopping.g2b.go.kr",
  },
  {
    name: "NICE평가정보 (nicebizinfo.com) & 산군 (sankun.com)",
    desc: "(주)기연리프트 등 세무서 일반 임대/서비스업으로 등록된 전국 중소 리프트·지게차·OA 법인 사업자번호·대표자·주소 조회",
    url: "https://www.nicebizinfo.com",
  },
  {
    name: "2979지게차연합회 다음카페 (cafe.daum.net/forklift2979.com)",
    desc: "전국 영업용 지게차 임대사업자 최대 커뮤니티(회원 17,701명) — 매물등록(kP0N)·지입광고(dsRM)·구인구직(YTcR)·렌탈(YTd3)·영업소(YUHn)·후원내역(kmCN) 등 410개 지게차 사업자 추출 연동",
    url: "https://cafe.daum.net/forklift2979.com",
  },
  {
    name: "우리동네지게차 (udj.kr) & 퍼펙트82 (perfect82.com)",
    desc: "전국 시·군·구 산업단지 밀착 지게차(FL) 신차 대리점·중고매매·장단기 렌탈·정비 사업자 통합 지도/리스트",
    url: "https://www.udj.kr",
  },
  {
    name: "다아라 기계장터 (daara.co.kr) & 대한건설기계협회",
    desc: "전국 국가산단 입주 고소작업대(AWP)·물류장비 임대 및 매매 회원사 디렉토리",
    url: "https://www.daara.co.kr",
  },
];

export interface RentalBizFormData {
  id: number;
  sector: "FL" | "AWP" | "OA_PC";
  companyName: string;
  businessNo: string;
  ceoName: string;
  region: string;
  address: string;
  bizScope: string;
  mainBrands: string;
  mainProducts: string;
  officialSource: string;
  ksicCode: string;
  phone: string;
  websiteUrl: string;
  scaleNote: string;
  salesStatus: string;
}
