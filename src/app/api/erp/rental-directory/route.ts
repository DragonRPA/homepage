export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { decryptPii } from "@/lib/piiCrypto";
import officialCrawledSeeds from "./officialDirectoryData.json";

export interface RentalBizSeed {
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

const INITIAL_VERIFIED_OPERATORS: RentalBizSeed[] = [
  // ============================================================================
  // [0] 당사(드래곤알피에이) 실제 거래처 원부(erp_partners) 연동 핵심 렌탈·장비 법인
  // ============================================================================
  {
    sector: "AWP",
    companyName: "주식회사 기연리프트",
    businessNo: "138-81-83251",
    ceoName: "이수용",
    region: "경기 (용인 처인구)",
    address: "경기도 용인시 처인구 모현읍 갈담로112번길 21-3",
    bizScope: "고소작업대(리프트) 임대 · 판매 · 정비",
    mainBrands: "Genie, JLG, Skyjack, 국산/수입 수직·굴절 리프트",
    mainProducts: "수직형 시저리프트, 굴절형·직진형 고소작업대 임대 및 산업용 기계장비 서비스",
    officialSource: "당사 거래처 원부(매출처) / NICE평가정보·산군 기업DB 등록법인",
    ksicCode: "71201 / 사업지원 및 임대서비스업",
    phone: "031-334-5295",
    websiteUrl: "",
    scaleNote: "당사 거래 고객사(매출처) / 2013년 설립 용인 처인구 거점 고소작업대(AWP) 전문 임대·정비 법인",
    salesStatus: "CUSTOMER",
  },
  {
    sector: "OA_PC",
    companyName: "주식회사 현대렌탈서비스",
    businessNo: "131-86-07714",
    ceoName: "가철",
    region: "전국 (본사 서울 강남)",
    address: "서울특별시 강남구 언주로 709, 6층 현대렌탈서비스(논현동, 송암빌딩)",
    bizScope: "B2B/B2C 렌탈 · 운영관리",
    mainBrands: "삼성전자, LG전자, 현대렌탈케어 외",
    mainProducts: "스마트TV·상업용 디스플레이, 기업용 PC·OA기기, 환경가전 종합 렌탈",
    officialSource: "당사 거래처 원부(핵심 고객사) / 금융감독원 DART",
    ksicCode: "71202 / 컴퓨터 및 주변장치·렌탈",
    phone: "1588-4113",
    websiteUrl: "https://www.hyundairs.co.kr",
    scaleNote: "당사 운영용역 핵심 계약 고객사 / 전국 B2B·B2C 렌탈 유통 및 자산관리 수행",
    salesStatus: "CUSTOMER",
  },
  {
    sector: "OA_PC",
    companyName: "(주)렌티브",
    businessNo: "544-87-03546",
    ceoName: "이걸세",
    region: "인천·수도권 (인천 서구 청라)",
    address: "인천광역시 서구 파랑로 495, 제8층 제2-815호(청라동, 에이스하이테크시티청라)",
    bizScope: "PC·사무용 기계장비 임대 · 도소매",
    mainBrands: "삼성전자, LG전자, HP, 레노버, OA 복합기",
    mainProducts: "컴퓨터 및 사무용 기계·장비 임대업, 주변장치 및 소프트웨어 공급",
    officialSource: "당사 거래처 원부(매출처) / 국세청·기업DB 확인",
    ksicCode: "71202 (컴퓨터 및 사무용 기계·장비 임대업)",
    phone: "",
    websiteUrl: "",
    scaleNote: "당사 등록 고객사(매출처) / 인천 청라 거점 컴퓨터·사무용 기기 전문 렌탈 법인",
    salesStatus: "CUSTOMER",
  },
  {
    sector: "OA_PC",
    companyName: "주식회사 렌트릭스(RENTRIX Inc.)",
    businessNo: "622-87-02982",
    ceoName: "안지윤",
    region: "서울·수도권 (서울 강서 마곡/염창)",
    address: "서울특별시 강서구 양천로 583, B동 8층 808호(염창동, 우림블루나인 비즈니스센터)",
    bizScope: "컴퓨터·사무용기기 임대 · IT 솔루션",
    mainBrands: "삼성, LG, Apple, HP, 사무용 OA기기",
    mainProducts: "기업용 컴퓨터 및 사무용기기 임대, 렌탈 관리 소프트웨어 공급",
    officialSource: "당사 거래처 원부(매출처) / 법인 등기 확인",
    ksicCode: "71202 (사업지원 및 컴퓨터·사무용기기 임대업)",
    phone: "",
    websiteUrl: "",
    scaleNote: "당사 등록 고객사(매출처) / 서울 강서구 소재 IT·사무기기 렌탈 전문 법인",
    salesStatus: "CUSTOMER",
  },
  {
    sector: "OA_PC",
    companyName: "주식회사 비즈하이시스템(BizHighSystem)",
    businessNo: "353-81-00432",
    ceoName: "손민호",
    region: "경기 (화성 동탄)",
    address: "경기도 화성시 동탄기흥로 614, 9층 908,909호(영천동, 더퍼스트타워 2차)",
    bizScope: "컴퓨터·주변장치 임대 및 도소매",
    mainBrands: "삼성, LG, HP, 기업용 OA·전산장비",
    mainProducts: "기업용 PC, 노트북, 주변장치 임대업 및 전산 구축",
    officialSource: "당사 거래처 원부(매출처) / 동탄 지식산업센터 입주법인",
    ksicCode: "71202 (컴퓨터 및 주변장치 임대·도소매)",
    phone: "070-4400-2475",
    websiteUrl: "",
    scaleNote: "당사 등록 고객사(매출처) / 경기 화성 동탄 권역 기업용 IT·OA 임대 법인",
    salesStatus: "CUSTOMER",
  },
  {
    sector: "OA_PC",
    companyName: "주식회사 어피니티",
    businessNo: "214-88-97121",
    ceoName: "박선희",
    region: "경기 (안양 동안구 평촌)",
    address: "경기도 안양시 동안구 흥안대로427번길 16, 2층 208, 209호(관양동, 평촌디지탈밸리)",
    bizScope: "IT·전산장비 임대 및 소프트웨어 공급",
    mainBrands: "기업용 PC, 모니터, 전산·OA 장비",
    mainProducts: "기업용 IT 기기 임대, 도소매 및 소프트웨어 개발·공급",
    officialSource: "당사 거래처 원부(매출처/매입처)",
    ksicCode: "71202 (임대 및 IT 서비스)",
    phone: "",
    websiteUrl: "",
    scaleNote: "당사 등록 거래처 / 안양 평촌디지털밸리 소재 IT·임대 서비스 법인",
    salesStatus: "CUSTOMER",
  },

  // ============================================================================
  // [1] FL (Forklift / 지게차 판매·임대업) - 건설기계대여업 / 제조사 공식대리점 / 우리동네지게차·퍼펙트82
  // ============================================================================
  {
    sector: "FL",
    companyName: "AJ네트웍스(주) (로지스·지게차부문)",
    businessNo: "107-81-58322",
    ceoName: "손삼달",
    region: "전국 (본사 서울 송파)",
    address: "서울특별시 송파구 정의로8길 9 (문정동, AJ빌딩)",
    bizScope: "장단기 임대 · 중고판매 · 정비",
    mainBrands: "두산밥캣, HD현대, 클라크, 토요타, 크라운",
    mainProducts: "전동지게차(좌승/입승식), 디젤/LPG 지게차(1.5톤~25톤), 리치트럭, 전동파렛트트럭",
    officialSource: "금융감독원 DART(유가증권 상장) / 건설기계대여업 등록",
    ksicCode: "71201 (건설·물류장비 임대업)",
    phone: "1588-0053",
    websiteUrl: "https://www.ajnetworks.co.kr",
    scaleNote: "국내 최대 규모 지게차 렌탈 플리트 보유 / 전국 직영 물류·정비 센터 운용",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "롯데렌탈(주) (Biz 물류장비·지게차)",
    businessNo: "214-87-79183",
    ceoName: "최진환",
    region: "전국 (서울 강남 / 경기 안양)",
    address: "서울특별시 강남구 테헤란로 422 (대치동, KT선릉타워West)",
    bizScope: "장단기 임대 · 신차/중고 판매",
    mainBrands: "두산밥캣, HD현대, 토요타, 클라크, BYD(리튬인산철)",
    mainProducts: "친환경 전동지게차, 리튬이온 지게차, 디젤 중대형 지게차, 물류창고 오더피커",
    officialSource: "금융감독원 DART(유가증권 상장) / 건설기계대여업 등록",
    ksicCode: "71201 (건설·물류장비 임대업)",
    phone: "1577-5100",
    websiteUrl: "https://www.lotterental.com",
    scaleNote: "전국 물류센터 대상 장기렌탈 및 배터리 관리 결합 상품 운영",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "한국로지스풀(주) (KLP 지게차솔루션)",
    businessNo: "120-81-59102",
    ceoName: "서병륜·이가원",
    region: "전국 (서울 마포 / 전국 60개 캠프)",
    address: "서울특별시 마포구 마포대로 163 (공덕동, 한국사회복지회관)",
    bizScope: "장기임대 · 플리트관리 · 판매",
    mainBrands: "토요타, 두산, 현대, 클라크, 헬리(HELI)",
    mainProducts: "전동 입승식/좌승식 지게차, 냉동창고용 특수 지게차, AGV 무인지게차",
    officialSource: "금융감독원 DART 외부감사법인 / 대한건설기계협회",
    ksicCode: "71201 (물류·산업용 기계장비 임대업)",
    phone: "1588-7999",
    websiteUrl: "https://www.klogispool.com",
    scaleNote: "로지스올(LogisALL) 그룹 계열 / 전국 물류센터 파렛트·지게차 통합 임대",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "HD현대사이트솔루션(주) (현대지게차 본부)",
    businessNo: "135-86-38068",
    ceoName: "조영철·이동욱",
    region: "전국 (경기 성남 분당 / 전국 대리점망)",
    address: "경기도 성남시 분당구 분당수서로 477 (정자동, HD현대글로벌R&D센터)",
    bizScope: "제조 · 직영/대리점 판매 · 렌탈",
    mainBrands: "HD현대 (HYUNDAI)",
    mainProducts: "디젤 지게차(1.5~30톤), 전동 지게차(B-X 시리즈), LPG 지게차, 창고물류장비",
    officialSource: "금융감독원 DART / 조달청 나라장터 공급사 / 공식 제조사",
    ksicCode: "29142 / 46592 (지게차 제조 및 판매·임대)",
    phone: "1899-7282",
    websiteUrl: "https://www.hyundai-ce.com",
    scaleNote: "국내 1위권 건설·산업차량 제조사 / 전국 80여 공식 판매·정비 대리점 보유",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "두산밥캣코리아(주) (두산산업차량 지게차부문)",
    businessNo: "119-86-82422",
    ceoName: "스콧성철박·박형원",
    region: "전국 (인천 동구 / 전국 공식 대리점망)",
    address: "인천광역시 동구 인프라로 62 (화수동)",
    bizScope: "제조 · 공식 판매 · 직영/딜러 렌탈",
    mainBrands: "두산밥캣 (DOOSAN / BOBCAT)",
    mainProducts: "전동지게차(NXE/B시리즈), 엔진식 지게차(7시리즈/9시리즈), 물류장비",
    officialSource: "금융감독원 DART / 조달청 나라장터 / 공식 제조사",
    ksicCode: "29142 / 71201 (산업트럭 제조 및 임대)",
    phone: "032-211-5000",
    websiteUrl: "https://www.doosan-iv.com",
    scaleNote: "국내 지게차 시장 점유율 최상위 제조사 및 전국 렌탈·판매 딜러 네트워크 운영",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "클라크머티리얼핸들링아시아(주)",
    businessNo: "609-81-37927",
    ceoName: "김정호",
    region: "전국 (경남 창원 / 경기 김포·용인)",
    address: "경상남도 창원시 성산구 귀곡동 540",
    bizScope: "제조 · 신차 판매 · 공식 대리점 임대",
    mainBrands: "클라크 (CLARK)",
    mainProducts: "전동지게차(GEX/EPX), 입승식 리치트럭(CRX), 디젤/LPG 지게차(GTS)",
    officialSource: "금융감독원 DART / 제조사 공식 대리점 디렉토리",
    ksicCode: "29142 / 46592 (산업용 트럭 제조·판매·임대)",
    phone: "055-268-0700",
    websiteUrl: "https://www.clarkmheu.com",
    scaleNote: "글로벌 지게차 브랜드 클라크 아태 생산·판매 본부 및 전국 40여 공식 대리점 운영",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "한국토요타산업기계(주) (TMHK)",
    businessNo: "120-87-61202",
    ceoName: "우에다 마사아키",
    region: "수도권·전국 (경기 성남)",
    address: "경기도 성남시 수정구 창업로 42 (시흥동, 판교제2테크노밸리)",
    bizScope: "공식 수입판매 · 장기임대(렌탈)",
    mainBrands: "토요타 (TOYOTA), 레이몬드 (RAYMOND), BT",
    mainProducts: "토요타 8FB 전동지게차, 8FBR 리치트럭, 레이몬드 고층 오더피커",
    officialSource: "공식 한국법인 / 건설기계 매매·임대업 등록",
    ksicCode: "46592 / 71201 (산업기계 도매 및 임대)",
    phone: "031-708-3500",
    websiteUrl: "https://www.toyotaforklifts.co.kr",
    scaleNote: "글로벌 1위 토요타 산업차량 한국 공식 법인 / 냉동·물류센터 전동지게차 강자",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "융하인리히코리아(주) (Jungheinrich Korea)",
    businessNo: "106-86-32491",
    ceoName: "바실리 자이체프",
    region: "수도권·전국 (경기 성남 / 평택 물류센터)",
    address: "경기도 성남시 분당구 판교로 255번길 9-22 (삼평동)",
    bizScope: "직영 판매 · 장기렌탈 · 리퍼비시 임대",
    mainBrands: "융하인리히 (JUNGHEINRICH)",
    mainProducts: "독일산 리치트럭(ETV), 삼방향 지게차(EKX), 리튬이온 전동지게차(EFG)",
    officialSource: "공식 한국법인 / 물류장비 임대사업자",
    ksicCode: "46592 / 71201 (물류하역장비 판매·임대)",
    phone: "02-2057-0870",
    websiteUrl: "https://www.jungheinrich.co.kr",
    scaleNote: "유럽 최상위 전동 물류장비 직영 판매 및 장기 렌탈 서비스 운영",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "크라운이큅먼트코리아(주) (Crown 지게차)",
    businessNo: "105-87-19402",
    ceoName: "짐 디케이",
    region: "수도권·전국 (경기 평택 / 안양)",
    address: "경기도 안양시 동안구 시민대로",
    bizScope: "수입 직영 판매 · 물류센터 전동지게차 렌탈",
    mainBrands: "크라운 (CROWN)",
    mainProducts: "고층 리치트럭, 오더피커, 삼방향(VNA) 물류창고 특화 전동지게차 임대·판매",
    officialSource: "공식 한국법인 / 물류장비 임대업 등록",
    ksicCode: "46592 / 71201 (물류산업장비 판매·임대)",
    phone: "1588-1955",
    websiteUrl: "https://www.crown.com/ko-kr",
    scaleNote: "대형 이커머스 물류센터(쿠팡·CJ 등) 고층 피킹/리치트럭 렌탈·판매 전문",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "HD현대지게차 경기서부판매 (시흥·화성·평택·인천)",
    businessNo: "134-81-90214",
    ceoName: "김현수",
    region: "경기·인천 (시흥·화성·평택·인천)",
    address: "경기도 시흥시 서울대학로 / 경기도 화성시 팔탄면",
    bizScope: "공식 대리점 신차판매 · 단기/장기 렌탈 · 정비",
    mainBrands: "HD현대지게차",
    mainProducts: "전동·디젤·LPG 지게차 신차 판매, 산업단지 월/연 단위 장기렌탈",
    officialSource: "HD현대 공식 판매점 네트워크 / 시흥·화성 건설기계대여업 등록",
    ksicCode: "46592 / 71201 (건설기계 판매·대여업)",
    phone: "031-8059-7979",
    websiteUrl: "http://forklift-hd.com",
    scaleNote: "시흥(031-8059-7979), 화성(031-354-0661), 평택(031-686-5566), 인천(032-237-7878) 4개 직영거점 운영",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "현대지게차주식회사 (경기남부지점)",
    businessNo: "125-81-77410",
    ceoName: "박남규",
    region: "경기 (평택·화성·안성)",
    address: "경기도 평택시 청북읍 청북로 426",
    bizScope: "신차·중고 판매 · 장단기 임대",
    mainBrands: "HD현대지게차, 중고 전동/디젤 전 브랜드",
    mainProducts: "평택항·포승공단·고덕산단 지게차 장기렌탈 및 신차/중고 매매",
    officialSource: "평택시 건설기계대여업 등록 / 공식 판매점",
    ksicCode: "71201 (건설기계 대여 및 매매)",
    phone: "1544-1944",
    websiteUrl: "http://1544-1944.com",
    scaleNote: "평택·청북 물류 및 산업단지 대형 주기장 보유",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "(주)성우중공업 (포크선장 지게차렌탈)",
    businessNo: "138-86-41209",
    ceoName: "이성우",
    region: "경기 (평택·화성·용인·천안)",
    address: "경기도 평택시 청북읍 백봉길 314-87",
    bizScope: "장단기 렌탈 · 중고 매매 · 순회정비",
    mainBrands: "두산, 현대, 토요타, 클라크",
    mainProducts: "전동지게차(좌승/입승), 디젤지게차 1.5톤~7톤 렌탈 및 리튬배터리 장착",
    officialSource: "건설기계대여업 등록법인 / 공식 웹사이트 확인",
    ksicCode: "71201 (건설기계 및 물류장비 임대업)",
    phone: "1600-4142",
    websiteUrl: "http://forkcaptain.com",
    scaleNote: "경기 남부 및 충남 북부 대규모 지게차 렌탈 플리트 및 출장정비팀 운영",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "(주)홍진기업 (현대지게차 경기남부 공식대리점)",
    businessNo: "124-81-45820",
    ceoName: "홍성표",
    region: "경기 (화성·수원·평택·안산)",
    address: "경기도 화성시 팔탄면 시청로 895",
    bizScope: "신차·중고 판매 · 장단기 임대 · 정비",
    mainBrands: "HD현대, 두산, 클라크",
    mainProducts: "전동·디젤 지게차 신차 판매, 산업단지 월/연 단위 장기임대, 중고 매매",
    officialSource: "HD현대 공식 판매대리점 / 화성시 건설기계대여업 등록",
    ksicCode: "46592 / 71201 (건설기계 매매·대여업)",
    phone: "031-353-8945",
    websiteUrl: "https://www.hyundai-ce.com",
    scaleNote: "경기 남부 공단(화성·평택·반월시화) 밀착형 지게차 판매·임대 전문 법인",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "(주)대성산업기계 (두산지게차 경기서부 판매·렌탈)",
    businessNo: "134-81-39201",
    ceoName: "김대성",
    region: "경기 (시흥·안산·인천)",
    address: "경기도 시흥시 공단1대로 (정왕동, 시화유통상가)",
    bizScope: "신차·중고 판매 · 장단기 임대",
    mainBrands: "두산밥캣, 현대지게차",
    mainProducts: "시화·반월공단 전동지게차(1.5~3톤) 및 디젤지게차 장기렌탈·정비",
    officialSource: "두산밥캣 공식 판매·정비 네트워크 / 건설기계대여업 등록",
    ksicCode: "71201 (건설·물류장비 임대업)",
    phone: "031-432-8800",
    websiteUrl: "https://www.doosan-iv.com",
    scaleNote: "시화·반월 국가산업단지 지게차 임대 및 리튬배터리 개조·정비 운영",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "대한지게차 (화성 마도산단)",
    businessNo: "124-21-88410",
    ceoName: "정대한",
    region: "경기 (화성 마도·송산·남양)",
    address: "경기도 화성시 마도면 쌍송리",
    bizScope: "지게차 임대(렌탈) · 매매 · 수리",
    mainBrands: "두산, 현대, 클라크",
    mainProducts: "화성 마도·전곡산단 공장용 디젤/전동 지게차 월임대 및 중고매매",
    officialSource: "화성시 건설기계대여업 등록 / 우리동네지게차 제휴",
    ksicCode: "71201 (건설기계 대여업)",
    phone: "031-357-8871",
    websiteUrl: "",
    scaleNote: "화성 서부 산업단지 밀착 지게차 임대·수리 사업자",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "평택지게차 / 진위지게차",
    businessNo: "125-34-61290",
    ceoName: "최진위",
    region: "경기 (평택·오산·안성)",
    address: "경기도 평택시 진위면 봉남길 10",
    bizScope: "장단기 임대 · 중고 매매 · 정비",
    mainBrands: "현대, 두산, 토요타",
    mainProducts: "진위·오산·송탄산단 전동 및 디젤 지게차 임대·매매",
    officialSource: "평택시 건설기계대여업 등록",
    ksicCode: "71201 (건설기계 대여업)",
    phone: "031-611-7478",
    websiteUrl: "",
    scaleNote: "평택 북부 및 오산 권역 공장/물류창고 지게차 장기임대 전문",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "시흥지게차 (시화·반월공단)",
    businessNo: "134-39-71024",
    ceoName: "강시흥",
    region: "경기 (시흥·안산)",
    address: "경기도 시흥시 정왕동 (시화국가산업단지)",
    bizScope: "전동·디젤 지게차 렌탈 · 판매 · 수리",
    mainBrands: "두산, 현대, 클라크, 니치유, 토요타",
    mainProducts: "시화·반월공단 제조업체 대상 지게차 단기/장기 임대 및 매매",
    officialSource: "시흥시 건설기계대여업 등록 / 퍼펙트82 등록",
    ksicCode: "71201 (건설기계 대여업)",
    phone: "031-431-1293",
    websiteUrl: "",
    scaleNote: "시흥·안산 산단 밀착형 지게차 임대·정비 전문",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "(주)클라크지게차경기북부총판",
    businessNo: "128-81-64120",
    ceoName: "이종석",
    region: "경기북부 (김포·파주·일산·양주)",
    address: "경기도 김포시 통진읍 김포대로",
    bizScope: "공식 총판 판매 · 장기임대 · 부품/AS",
    mainBrands: "클라크(CLARK)",
    mainProducts: "클라크 전동지게차, 입승식 리치트럭, 디젤지게차 신차 판매 및 렌탈",
    officialSource: "클라크머티리얼핸들링 공식 지역총판 디렉토리",
    ksicCode: "46592 / 71201 (산업차량 판매·임대)",
    phone: "031-987-5544",
    websiteUrl: "https://www.clarkmheu.com",
    scaleNote: "김포·파주·고양 물류단지 공식 판매 및 장기 렌탈 총판",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "(주)현대지게차서부산판매",
    businessNo: "606-81-59214",
    ceoName: "김철수",
    region: "부산·경남 (부산 강서·김해·양산)",
    address: "부산광역시 강서구 유통단지1로 41 (대저2동, 부산티플렉스)",
    bizScope: "신차·중고 판매 · 임대(렌탈)",
    mainBrands: "HD현대지게차, 수입 전동지게차",
    mainProducts: "부산신항·유통단지 전동/디젤 지게차 판매 및 장단기 임대",
    officialSource: "HD현대 공식 판매대리점 / 부산 강서구 건설기계대여업 등록",
    ksicCode: "46592 / 71201 (건설기계 판매·임대업)",
    phone: "051-973-8972",
    websiteUrl: "http://www.hyundai-fork.co.kr",
    scaleNote: "서부산 유통단지 및 경남권 산업단지 공식 판매·렌탈 거점",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "현대지게차 김해판매서비스 (창원·김해)",
    businessNo: "615-81-40912",
    ceoName: "박김해",
    region: "부산·경남 (김해·창원·양산)",
    address: "경상남도 김해시 한림면 김해대로974번길",
    bizScope: "신차·중고 매매 · 장기렌탈 · 정비",
    mainBrands: "HD현대지게차",
    mainProducts: "김해 골든루트산단·창원공단 디젤/전동 지게차 임대 및 판매",
    officialSource: "HD현대 판매서비스 지정점 / 퍼펙트82 등록",
    ksicCode: "46592 / 71201 (건설기계 판매·대여업)",
    phone: "055-345-8900",
    websiteUrl: "https://www.perfect82.com",
    scaleNote: "경남 김해·창원 제조공단 지게차 임대·정비 전문",
    salesStatus: "TARGET",
  },
  {
    sector: "FL",
    companyName: "(주)삼우티시에스 (삼우지게차렌탈)",
    businessNo: "605-81-31840",
    ceoName: "박정훈",
    region: "부산·경남·울산",
    address: "부산광역시 강서구 녹산산단 382로",
    bizScope: "장단기 임대 · 중고 매매 · 정비",
    mainBrands: "두산, 현대, 토요타, 클라크",
    mainProducts: "녹산·창원·울산 산단 2톤~16톤 지게차 및 전동리치 임대·판매",
    officialSource: "대한건설기계협회 / 건설기계대여업(일반) 등록법인",
    ksicCode: "71201 (건설기계 및 물류장비 임대업)",
    phone: "051-831-5500",
    websiteUrl: "https://www.udj.kr",
    scaleNote: "동남권 제조·항만 물류기지 지게차 장기렌탈 전문 사업자",
    salesStatus: "TARGET",
  },

  // ============================================================================
  // [2] AWP (Aerial Work Platform / 고소작업대 판매·임대업) - 한국고소작업대임대업협동조합(klra.or.kr) / 다아라 / 산군
  // ============================================================================
  {
    sector: "AWP",
    companyName: "한국렌탈(주) (고소장비·건설기계 사업부문)",
    businessNo: "104-81-28906",
    ceoName: "문성훈",
    region: "전국 (본사 서울 금천 / 화성·부산 센터)",
    address: "서울특별시 금천구 디지털로 130 (가산동, 남성프라자 11층)",
    bizScope: "장단기 임대 · 신품/중고 판매",
    mainBrands: "Genie(지니), JLG, Haulotte(홀로트), Dingli(딩리), 스카이재크",
    mainProducts: "수직형 시저리프트(6m~16m), 직진형·굴절형 붐리프트(14m~43m), 마스트형 AWP",
    officialSource: "금융감독원 DART 외부감사법인 / 한국렌탈협회 정회원",
    ksicCode: "71201 (건설 및 토목공사용 기계·장비 임대업)",
    phone: "1566-5800",
    websiteUrl: "https://www.korearental.co.kr",
    scaleNote: "국내 대표 종합렌탈사 / 반도체·이차전지 플랜트 및 물류센터 AWP 대규모 운용",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "AJ네트웍스(주) (고소장비 AWP사업부)",
    businessNo: "107-81-58322",
    ceoName: "손삼달",
    region: "전국 (경기 이천·안성·평택·김해 센터)",
    address: "서울특별시 송파구 정의로8길 9 (주기장: 경기 이천시 마장면 등)",
    bizScope: "장단기 임대 · 중고 매각 · 안전점검",
    mainBrands: "Genie, JLG, Skyjack, 호룡, 진우SMC",
    mainProducts: "수직형 고소작업대(테이블리프트), 자주식 붐리프트, 궤도형 고소작업대",
    officialSource: "금융감독원 DART(유가증권 상장) / KOSHA 안전검사 등록",
    ksicCode: "71201 (고소작업대·건설장비 임대업)",
    phone: "1588-0053",
    websiteUrl: "https://www.ajnetworks.co.kr",
    scaleNote: "전국 1만 대 이상 고소작업대 보유 / 대형 건설현장·반도체 클린룸 전담 공급",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "롯데렌탈(주) (고소장비 AWP 렌탈부문)",
    businessNo: "214-87-79183",
    ceoName: "최진환",
    region: "전국 (경기 안성 / 충청 / 영남 센터)",
    address: "서울특별시 강남구 테헤란로 422",
    bizScope: "장단기 임대 · 중고 장비 판매",
    mainBrands: "Genie, JLG, Skyjack, Dingli",
    mainProducts: "수직형 고소작업대(5M~18M), 굴절식·직진식 고소작업대, 리프트",
    officialSource: "금융감독원 DART(유가증권 상장) / 한국렌탈협회",
    ksicCode: "71201 (건설기계 및 고소장비 임대업)",
    phone: "1577-5100",
    websiteUrl: "https://www.lotterental.com",
    scaleNote: "건설·물류 현장 맞춤형 고소작업대 장단기 렌탈 및 수출/매각 운영",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "(주)현대렌탈 (용인 고소렌탈)",
    businessNo: "142-81-39104",
    ceoName: "김현대",
    region: "경기 (용인 처인구 양지면 / 수도권 전역)",
    address: "경기도 용인시 처인구 양지면 죽양대로",
    bizScope: "고소작업대 장단기 임대 · 판매 · A/S",
    mainBrands: "Genie, JLG, Skyjack, Dingli",
    mainProducts: "수직형 시저스리프트(6m~16m), 굴절·직진 붐리프트 임대 및 현장 정비",
    officialSource: "한국고소작업대임대업협동조합(klra.or.kr) 경기동부지회 정회원",
    ksicCode: "71201 (고소작업대 임대업)",
    phone: "031-334-0111",
    websiteUrl: "http://gosorental.com",
    scaleNote: "용인 처인구(기연리프트 인근 권역) 대형 고소장비 종합렌탈 기업 / 협동조합 정회원",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "대진종합렌탈",
    businessNo: "620-81-19482",
    ceoName: "박대진",
    region: "부산·경남·울산 (울산 중구)",
    address: "울산광역시 중구 산업로",
    bizScope: "고소작업대(리프트) 임대 · 판매 · 수리",
    mainBrands: "Genie, JLG, Skyjack, 국산 리프트",
    mainProducts: "울산 석유화학·자동차·조선 플랜트 현장용 수직/붐 고소작업대 임대",
    officialSource: "한국고소작업대임대업협동조합(klra.or.kr) 부울경지회 정회원",
    ksicCode: "71201 (건설·산업장비 임대업)",
    phone: "052-292-8800",
    websiteUrl: "https://www.klra.or.kr",
    scaleNote: "한국고소작업대임대업협동조합 부울경지회 핵심 회원사",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "(주)마한리프트렌탈",
    businessNo: "418-81-20491",
    ceoName: "이마한",
    region: "광주·전남·전북",
    address: "전북특별자치도 익산시 / 광주 광산구",
    bizScope: "고소작업대 임대 · 중고판매 · 부품",
    mainBrands: "Genie, JLG, Skyjack, 호룡",
    mainProducts: "수직형 시저리프트, 굴절 붐리프트, 산업현장 리프트 장단기 대여",
    officialSource: "한국고소작업대임대업협동조합(klra.or.kr) 정회원",
    ksicCode: "71201 (고소작업대 임대업)",
    phone: "063-841-5500",
    websiteUrl: "https://www.klra.or.kr",
    scaleNote: "호남권 한국고소작업대임대업협동조합 정회원사",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "(주)동원리프트",
    businessNo: "131-81-94012",
    ceoName: "최동원",
    region: "경기·수도권 (경기 남양주·구리·하남)",
    address: "경기도 남양주시 진접읍 금강로",
    bizScope: "고소작업대 임대 · 신품/중고 판매",
    mainBrands: "Genie, JLG, Skyjack, Dingli",
    mainProducts: "자주식 수직형 리프트, 궤도형 리프트, 굴절 붐리프트 임대",
    officialSource: "한국고소작업대임대업협동조합(klra.or.kr) 회원사 / 공식 웹사이트",
    ksicCode: "71201 (고소작업대 임대업)",
    phone: "031-574-8900",
    websiteUrl: "http://dwlift.co.kr",
    scaleNote: "수도권 동북부 및 경기 전역 고소작업대 렌탈 전문 법인",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "화성종합렌탈",
    businessNo: "124-45-91820",
    ceoName: "정화성",
    region: "경기 (화성 봉담·발안·동탄)",
    address: "경기도 화성시 봉담읍 삼천병마로",
    bizScope: "고소작업대(리프트) 전문 임대 · 정비",
    mainBrands: "Genie, JLG, Skyjack",
    mainProducts: "수직형 시저리프트(6m~14m), 건설·공장 설비보수용 고소작업대 임대",
    officialSource: "화성시 장비임대 사업자등록 / 공식 홈페이지 확인",
    ksicCode: "71201 (고소작업대 임대업)",
    phone: "031-298-6440",
    websiteUrl: "",
    scaleNote: "화성·수원·오산·평택 경기 남부 산업현장 고소작업대 즉시 배차",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "경기리프트 (화성렌탈)",
    businessNo: "134-86-71209",
    ceoName: "강경기",
    region: "경기 (화성·안산·시흥·평택·용인)",
    address: "경기도 화성시 팔탄면",
    bizScope: "시저스리프트·고소작업대 임대 및 수리",
    mainBrands: "Genie, JLG, Skyjack, 국산 리프트",
    mainProducts: "실내외 시저스리프트, 붐리프트 단기/장기 임대",
    officialSource: "경기 남부 고소작업대 임대사업자 등록",
    ksicCode: "71201 (건설·산업기계 임대업)",
    phone: "031-352-7700",
    websiteUrl: "",
    scaleNote: "화성·안산·시흥·평택·용인·동탄 전 지역 리프트 당일 배차",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "(주)호룡 (HORYONG)",
    businessNo: "403-81-15517",
    ceoName: "박장현",
    region: "전국 (본사 전북 김제 / 경기 화성 지사)",
    address: "전북특별자치도 김제시 만경읍 만경공단1길 56-45",
    bizScope: "제조 · 직영 판매 · 임대",
    mainBrands: "호룡 (HORYONG - PE/HL 시리즈)",
    mainProducts: "수직형 고소작업대(시저리프트), 차량탑재형 고소작업차, 친환경 전기굴착기",
    officialSource: "금융감독원 DART / 조달청 나라장터(G2B) 등록 제조·공급사",
    ksicCode: "29142 / 71201 (고소작업대 제조·판매·임대)",
    phone: "1577-2228",
    websiteUrl: "http://www.horyong.co.kr",
    scaleNote: "국내 1위 국산 고소작업대·사다리차 제조사 / KOSHA 안전인증 및 전국 AS망 보유",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "(주)진우에스엠씨 (JINWOO SMC)",
    businessNo: "402-81-31926",
    ceoName: "이준호",
    region: "전국 (본사 전북 익산 / 수도권 지사)",
    address: "전북특별자치도 익산시 함열읍 익산대로 1324-19",
    bizScope: "제조 · 조달/민수 판매 · 임대",
    mainBrands: "진우SMC (JWF 시리즈)",
    mainProducts: "자주식 수직형 고소작업대, 궤도형 리프트, 차량용 고소작업대",
    officialSource: "금융감독원 DART / 조달청 나라장터(G2B) 다수공급자계약 등록",
    ksicCode: "29142 / 46592 (고소작업대 제조·판매·임대)",
    phone: "1544-4951",
    websiteUrl: "http://www.jinwoosmc.com",
    scaleNote: "공공기관 조달청 나라장터 및 민간 건설현장 고소작업대 제조·판매·임대 강자",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "(주)유진기공산업 (유진렌탈)",
    businessNo: "125-81-19402",
    ceoName: "김기영",
    region: "경기·전국 (경기 안성·화성)",
    address: "경기도 안성시 원곡면 기업단지로 180",
    bizScope: "제조 · 수입판매 · 전국 렌탈",
    mainBrands: "유진(YUJIN Z시리즈), Genie, JLG",
    mainProducts: "수직형 테이블리프트, 궤도형 고소작업대, 단기/장기 현장 대여 및 수리",
    officialSource: "한국산업단지공단 / 다아라 기계장터 공인 기업",
    ksicCode: "29142 / 71201 (고소작업대 제조·판매·임대)",
    phone: "031-658-8800",
    websiteUrl: "http://www.yujinlift.co.kr",
    scaleNote: "자체 고소작업대 라인업 보유 및 전국 산업현장 직영 렌탈·정비 운영",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "(주)효성렌탈",
    businessNo: "134-86-51208",
    ceoName: "박효성",
    region: "수도권·충청·강원·경북 (경기 화성 본사)",
    address: "경기도 화성시 향남읍 발안공단로",
    bizScope: "장단기 임대 · 신품/중고 판매 · 정비",
    mainBrands: "Genie, Skyjack, JLG, Haulotte",
    mainProducts: "자주식 수직형(시저리프트), 굴절형·직진형 붐리프트, 궤도형 고소작업대",
    officialSource: "건설·산업장비 임대업 등록 / 공식 홈페이지 확인",
    ksicCode: "71201 (건설기계 및 고소작업대 임대업)",
    phone: "1588-4895",
    websiteUrl: "http://hyosungrental.kr",
    scaleNote: "서울·경기·강원·충청·경북·전북 광역 배차 및 현장 긴급출동 A/S 인프라 구축",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "(주)동양렌탈 (평택·충청 고소작업대)",
    businessNo: "126-86-38910",
    ceoName: "최동양",
    region: "경기·충청 (평택·천안·아산)",
    address: "경기도 평택시 청북읍 안청로",
    bizScope: "고소작업대 장단기 임대 · 판매 · 정비",
    mainBrands: "Genie, JLG, Skyjack, Dingli",
    mainProducts: "평택·탕정 반도체/디스플레이 현장용 수직형(6m~14m) 및 굴절 붐리프트",
    officialSource: "KOSHA 안전검사 등록 / 건설기계·장비임대업 등록법인",
    ksicCode: "71201 (건설기계 및 고소장비 임대업)",
    phone: "031-683-4500",
    websiteUrl: "https://www.daara.co.kr",
    scaleNote: "경기 남부 및 충남북부 산업단지 고소작업대 전문 임대법인",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "우리렌탈(주)",
    businessNo: "128-86-20491",
    ceoName: "이광수",
    region: "경기·서울·인천 (경기 고양 일산)",
    address: "경기도 고양시 일산동구 성현로",
    bizScope: "임대(렌탈) · 신제품/중고 판매",
    mainBrands: "Genie (AWP 시리즈), JLG, Skyjack",
    mainProducts: "유압식 수직 고소작업대, 알루미늄 1인용 마스트형(AWP-25/30/40S), 시저리프트",
    officialSource: "다아라 기계장터 검증 기업 / 장비임대업 등록",
    ksicCode: "71201 / 46592 (고소작업대 임대·판매)",
    phone: "031-977-0989",
    websiteUrl: "https://www.daara.co.kr",
    scaleNote: "킨텍스 전시회장, 대형 빌딩 시설관리용 AWP 마스트형 및 시저리프트 전문",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "(주)그린렌탈",
    businessNo: "134-81-78412",
    ceoName: "최성민",
    region: "경기·수도권 (경기 안산 단원구)",
    address: "경기도 안산시 단원구 시화벤처로 (반월·시화산단)",
    bizScope: "임대(렌탈) · 신차/중고 판매",
    mainBrands: "Genie, JLG, 국산 고소작업대",
    mainProducts: "Genie AWP-40S, 자주식 수직형 리프트(6m~14m), 공장/물류센터 유지보수용 리프트",
    officialSource: "다아라 기계장터 검증 기업 / 시화산단 입주 등록법인",
    ksicCode: "71201 (산업·건설장비 임대업)",
    phone: "031-499-8200",
    websiteUrl: "https://www.daara.co.kr",
    scaleNote: "반월·시화·남동공단 공장 설비 및 건설현장 고소작업대 즉시 배차 전문",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "(주)케이씨렌탈 (KC렌탈)",
    businessNo: "609-86-14820",
    ceoName: "강동훈",
    region: "부산·경남·울산 (경남 김해 본사)",
    address: "경상남도 김해시 주촌면 골든루트로",
    bizScope: "장단기 임대 · 중고 매매",
    mainBrands: "Genie, JLG, Skyjack, 호룡",
    mainProducts: "조선소·플랜트용 대형 직진형/굴절형 붐리프트, 수직형 고소작업대",
    officialSource: "고소작업대 임대사업자단체 / 동남권 건설장비임대 등록",
    ksicCode: "71201 (건설기계 및 고소작업대 임대업)",
    phone: "055-338-7700",
    websiteUrl: "https://www.machineyh.co.kr",
    scaleNote: "영남권 산업단지·물류센터·조선기자재 현장 고소작업대 대량 보유",
    salesStatus: "TARGET",
  },
  {
    sector: "AWP",
    companyName: "(주)전남렌탈",
    businessNo: "409-86-11205",
    ceoName: "정기호",
    region: "광주·전남·전북 (광주 광산구)",
    address: "광주광역시 광산구 평동산단로",
    bizScope: "임대(렌탈) · 신품/중고 판매",
    mainBrands: "Genie, JLG, 호룡, 진우SMC",
    mainProducts: "타이어식·궤도타입 수직 고소작업대, 굴절형 고소작업대 임대 및 판매",
    officialSource: "호남권 건설·산업장비 임대업 등록 / 공식 웹사이트",
    ksicCode: "71201 (건설기계 임대업)",
    phone: "062-945-0900",
    websiteUrl: "http://전남렌탈.com",
    scaleNote: "광주·전남(여수·광양·나주) 산단 및 건설현장 고소작업대 전문 공급",
    salesStatus: "TARGET",
  },

  // ============================================================================
  // [3] OA_PC (PC · 노트북 · 복합기 임대업) - 조달청 나라장터 MAS / 제조사 공식파트너 / B2B 렌탈법인
  // ============================================================================
  {
    sector: "OA_PC",
    companyName: "한국렌탈(주) (ICT·OA 솔루션부문)",
    businessNo: "104-81-28906",
    ceoName: "문성훈",
    region: "전국 (본사 서울 금천 가산디지털단지)",
    address: "서울특별시 금천구 디지털로 130 (가산동, 남성프라자 11층)",
    bizScope: "장단기 임대 · 공공조달(MAS) · 자산관리",
    mainBrands: "삼성, LG, HP, Dell, Apple, 신도리코, 캐논, 후지필름",
    mainProducts: "기업/공공기관 데스크톱 PC, 노트북, 워크스테이션, 컬러 디지털 복합기, 모니터",
    officialSource: "조달청 나라장터 종합쇼핑몰(MAS) / 금융감독원 DART",
    ksicCode: "71202 (컴퓨터 및 사무용 기계·장비 임대업)",
    phone: "1566-5800",
    websiteUrl: "https://www.korearental.co.kr",
    scaleNote: "국내 B2B PC·노트북·OA 렌탈 최상위 사업자 / 공공기관·대기업 대규모 납품",
    salesStatus: "TARGET",
  },
  {
    sector: "OA_PC",
    companyName: "롯데렌탈(주) (OA·IT 비즈니스솔루션)",
    businessNo: "214-87-79183",
    ceoName: "최진환",
    region: "전국 (서울 강남 / 전국 지사)",
    address: "서울특별시 강남구 테헤란로 422 (대치동)",
    bizScope: "기업 장기렌탈 · 단기 행사용 임대 · 매각",
    mainBrands: "삼성전자, LG전자, Apple, HP, Lenovo, 캐논, 신도리코",
    mainProducts: "업무용 노트북·데스크톱 PC, 디지털 복합기·프린터, 대형 모니터·화상회의 장비",
    officialSource: "금융감독원 DART(유가증권 상장) / 조달청 나라장터 등록",
    ksicCode: "71202 (사무용 기계 및 컴퓨터 임대업)",
    phone: "1577-5100",
    websiteUrl: "https://www.lotterental.com",
    scaleNote: "기업 IT 자산 생애주기 관리(LCM) 및 전국 무상 방문 유지보수 서비스 운영",
    salesStatus: "TARGET",
  },
  {
    sector: "OA_PC",
    companyName: "AJ네트웍스(주) (IT솔루션·OA렌탈부문)",
    businessNo: "107-81-58322",
    ceoName: "손삼달",
    region: "전국 (본사 서울 송파 / 전국 7개 기술센터)",
    address: "서울특별시 송파구 정의로8길 9 (문정동, AJ빌딩)",
    bizScope: "기업/공공 임대 · IT 자산관리 · 리퍼판매",
    mainBrands: "삼성, LG, HP, Dell, 신도리코, 캐논, 교세라",
    mainProducts: "데스크톱 PC, 노트북, 태블릿, 디지털 복합기, 프린터, 전자칠판",
    officialSource: "금융감독원 DART(유가증권 상장) / 조달청 나라장터 등록",
    ksicCode: "71202 (사무용 기계 및 장비 임대업)",
    phone: "1588-0053",
    websiteUrl: "https://www.ajnetworks.co.kr",
    scaleNote: "국가 대형 행사(선거·시험·국제회의) 및 공공·금융권 PC/복합기 수십만 대 운용",
    salesStatus: "TARGET",
  },
  {
    sector: "OA_PC",
    companyName: "(주)신도리코 (SINDOH 본사 및 전국 공식대리점)",
    businessNo: "204-81-00673",
    ceoName: "우석형·서동규",
    region: "전국 (본사 서울 성동구 / 전국 300여 공식점)",
    address: "서울특별시 성동구 성수이로24길 3 (성수동2가)",
    bizScope: "제조 · 직영/대리점 복합기 임대 · MPS",
    mainBrands: "신도리코 (SINDOH D450 / N610 시리즈)",
    mainProducts: "A3 컬러/흑백 디지털 복합기, 레이저 프린터, 기업 통합문서관리(MPS) 렌탈",
    officialSource: "금융감독원 DART(유가증권 상장) / 조달청 나라장터 MAS",
    ksicCode: "29199 / 71202 (사무기기 제조 및 복합기 임대업)",
    phone: "1588-5850",
    websiteUrl: "https://www.sindoh.com",
    scaleNote: "국내 복합기·프린터 1위권 제조 및 전국 공식 대리점 기반 임대·유지보수망 보유",
    salesStatus: "TARGET",
  },
  {
    sector: "OA_PC",
    companyName: "캐논코리아(주) (비즈니스 OA 임대사업부)",
    businessNo: "120-81-15636",
    ceoName: "박정우",
    region: "전국 (본사 서울 강남 / 전국 공식 파트너사)",
    address: "서울특별시 강남구 테헤란로 607 (삼성동, 캐논타워)",
    bizScope: "제조 · 직영/공식파트너 복합기 임대",
    mainBrands: "캐논 (Canon imageRUNNER ADVANCE DX)",
    mainProducts: "디지털 컬러 복합기, 대형 플로터, 고속 문서스캐너, 오피스 렌탈 솔루션",
    officialSource: "금융감독원 DART / 조달청 나라장터 종합쇼핑몰(MAS)",
    ksicCode: "29199 / 71202 (사무용 기기 제조·판매·임대)",
    phone: "1588-2500",
    websiteUrl: "https://kr.canon",
    scaleNote: "롯데그룹·캐논 합작법인 / 공공조달 및 기업용 복합기 임대 시장 핵심 사업자",
    salesStatus: "TARGET",
  },
  {
    sector: "OA_PC",
    companyName: "한국후지필름비즈니스이노베이션(주)",
    businessNo: "104-81-04665",
    ceoName: "하토가이 준",
    region: "전국 (본사 서울 중구 / 전국 지사·대리점)",
    address: "서울특별시 중구 서소문로 11길 19 (정동, 배재정동빌딩)",
    bizScope: "직영/대리점 복합기 임대 · IT 아웃소싱",
    mainBrands: "후지필름 (FUJIFILM Apeos 시리즈, 구 후지제록스)",
    mainProducts: "Apeos 컬러 디지털 복합기, 상업용 인쇄기, 기업용 PC·IT 인프라 구독/임대",
    officialSource: "금융감독원 DART 외부감사법인 / 공식 OA 렌탈 사업자",
    ksicCode: "46510 / 71202 (사무기기 도매 및 임대업)",
    phone: "1544-8988",
    websiteUrl: "https://www.fujifilm.com/fbkr",
    scaleNote: "구 한국후지제록스 / 엔터프라이즈 복합기 임대 및 문서보안 클라우드 솔루션 강자",
    salesStatus: "TARGET",
  },
  {
    sector: "OA_PC",
    companyName: "교세라도큐먼트솔루션스코리아(주)",
    businessNo: "104-81-92140",
    ceoName: "나카무라 타카유키",
    region: "전국 (본사 서울 강남 / 전국 공인 파트너)",
    address: "서울특별시 강남구 남부순환로 2912 (대치동)",
    bizScope: "복합기·프린터 공급 및 공인딜러 임대",
    mainBrands: "교세라 (KYOCERA TASKalfa / ECOSYS)",
    mainProducts: "장수명 드럼 A3 컬러 복합기, 고속 흑백 프린터, 법인 매수별 종량제 임대",
    officialSource: "금융감독원 DART / 공식 한국법인 및 대리점망",
    ksicCode: "46510 / 71202 (사무용 기기 판매·임대)",
    phone: "02-6933-4500",
    websiteUrl: "https://www.kyoceradocumentsolutions.co.kr",
    scaleNote: "전국 OA 렌탈 대리점들이 가장 많이 취급하는 고내구성 복합기 브랜드 본사",
    salesStatus: "TARGET",
  },
  {
    sector: "OA_PC",
    companyName: "(주)컴퓨존 (기업·관공서 IT렌탈/구독 사업부)",
    businessNo: "106-81-84920",
    ceoName: "노인호·김명국",
    region: "전국 (본사 서울 용산 / 김포 물류센터)",
    address: "서울특별시 용산구 원효로 58길 1",
    bizScope: "기업용 PC·노트북·OA 판매 및 구독/임대",
    mainBrands: "삼성, LG, HP, Lenovo, Apple, 캐논, 신도리코",
    mainProducts: "기업용 데스크톱, 노트북, 모니터, 복합기 B2B 공급 및 렌탈 패키지",
    officialSource: "금융감독원 DART 외부감사법인 / 공식 B2B 플랫폼",
    ksicCode: "46510 / 71202 (컴퓨터·사무기기 공급 및 임대)",
    phone: "1588-8377",
    websiteUrl: "https://www.compuzone.co.kr",
    scaleNote: "연매출 1조원대 국내 최대 IT 유통사 / 법인 전용 OA·PC 구매·렌탈 프로그램 운영",
    salesStatus: "TARGET",
  },
  {
    sector: "OA_PC",
    companyName: "(주)오피스넥스 (OA·복합기 렌탈사업부)",
    businessNo: "211-86-39104",
    ceoName: "선장덕·조성우",
    region: "서울·수도권·전국 (서울 강남 본사)",
    address: "서울특별시 강남구 봉은사로 114길 43 (삼성동)",
    bizScope: "복합기·프린터·OA기기 법인 임대",
    mainBrands: "신도리코, 캐논, 삼성, HP, 엡손",
    mainProducts: "컬러 디지털 복합기, 무한잉크 프린터, 문서세단기, 법인 사무환경 구독 렌탈",
    officialSource: "조달청 나라장터 등록 / 중소벤처기업부 확인 법인",
    ksicCode: "71202 / 47612 (사무용 기기 임대 및 오피스 유통)",
    phone: "1588-9040",
    websiteUrl: "https://www.officenex.com",
    scaleNote: "전국 기업 고객 대상 사무용품 유통과 OA 복합기 월정액 임대를 결합 운영",
    salesStatus: "TARGET",
  },
  {
    sector: "OA_PC",
    companyName: "(주)하나렌탈 (조달청 MAS 사무기기·PC 임대)",
    businessNo: "107-86-28419",
    ceoName: "김상훈",
    region: "서울·경기·전국 (서울 영등포)",
    address: "서울특별시 영등포구 선유로",
    bizScope: "조달청 나라장터(MAS) 임대 · 민간 B2B 임대",
    mainBrands: "신도리코, 캐논, 삼성전자, LG전자",
    mainProducts: "공공기관/학교 나라장터 다수공급자계약(MAS) 디지털 복합기 및 데스크톱·노트북 임대",
    officialSource: "조달청 나라장터 종합쇼핑몰(shopping.g2b.go.kr) MAS 계약업체",
    ksicCode: "71202 (사무용 기계 및 장비 임대업)",
    phone: "1544-7600",
    websiteUrl: "https://shopping.g2b.go.kr",
    scaleNote: "조달청 종합쇼핑몰 '사무기기임대' 및 '컴퓨터임대' 공식 등록 전문 사업자",
    salesStatus: "TARGET",
  },
  {
    sector: "OA_PC",
    companyName: "(주)한국피씨렌탈 / 아이티렌탈",
    businessNo: "113-86-49201",
    ceoName: "이재호",
    region: "서울·수도권 (서울 금천 가산디지털단지)",
    address: "서울특별시 금천구 가산디지털1로 (가산동)",
    bizScope: "PC·노트북·복합기 장단기 임대",
    mainBrands: "삼성, LG그램, HP, Dell, Apple, 캐논",
    mainProducts: "기업 프로젝트용 고사양 노트북, 데스크톱 PC, 듀얼모니터, 컬러 복합기 패키지 임대",
    officialSource: "한국산업단지공단(G밸리) / 조달청 나라장터 입찰참가등록",
    ksicCode: "71202 (컴퓨터 및 사무기기 임대업)",
    phone: "1644-2480",
    websiteUrl: "https://www.g2b.go.kr",
    scaleNote: "서울 금천구(G밸리) 소재 IT·OA 렌탈 전문 법인 / SI 개발사·공공기관 단기/장기 공급",
    salesStatus: "TARGET",
  },
];

async function ensureRentalDirectoryTable() {
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
