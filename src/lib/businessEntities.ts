/**
 * 전사 사업자 단일 진실의 원천 (Business Entities SSOT)
 * 헌장 1.4조 [1단어 1뜻 표준화] 및 멀티 엔티티 규격
 * 
 * 1. 주식회사 드래곤알피에이 (법인사업자)
 * 2. 드래곤알피에이 (개인사업자)
 */

export type EntityType = "CORP" | "INDIVIDUAL";

export interface BusinessEntity {
  key: EntityType;
  typeLabel: "법인" | "개인";
  corpName: string;
  shortName: string;
  bizNum: string; // 000-00-00000 포맷
  bizNumRaw: string; // 숫자 10자리
  corpRegNum?: string; // 법인등록번호 (13자리)
  ceoName: string;
  birthDate?: string;
  openDate: string;
  address: string;
  bizType: string;
  bizClass: string;
  email: string;
  bankName: string;
  bankCode: string; // 003: IBK기업은행
  bankAccountNo: string;
  bankHolder: string;
}

export const BUSINESS_ENTITIES: Record<EntityType, BusinessEntity> = {
  CORP: {
    key: "CORP",
    typeLabel: "법인",
    corpName: "주식회사 드래곤알피에이",
    shortName: "(주)드래곤알피에이",
    bizNum: "806-88-03266",
    bizNumRaw: "8068803266",
    corpRegNum: "110111-8987260",
    ceoName: "이정용",
    openDate: "2024-07-05",
    address: "서울특별시 금천구 서부샛길 528, 547호(가산동, 가산미소지움오피스텔)",
    bizType: "정보통신업, 도매 및 소매업, 부동산업, 사업시설 관리, 사업지원 및 임대 서비스업",
    bizClass: "응용 소프트웨어 개발 및 공급업, 컴퓨터 및 주변장치·소프트웨어 도소매업, 기타 산업용 기계 및 장비 임대업, 컴퓨터 프로그래밍 서비스업",
    email: "77.victor.lee@gmail.com",
    bankName: "IBK기업은행",
    bankCode: "003",
    bankAccountNo: "478-081383-04-018",
    bankHolder: "주식회사 드래곤알피에이",
  },
  INDIVIDUAL: {
    key: "INDIVIDUAL",
    typeLabel: "개인",
    corpName: "드래곤알피에이",
    shortName: "드래곤알피에이(개인)",
    bizNum: "295-03-02683",
    bizNumRaw: "2950302683",
    ceoName: "이정용",
    birthDate: "1977-06-17",
    openDate: "2023-05-10",
    address: "서울특별시 송파구 동남로11길 26-11(가락동)",
    bizType: "정보통신업",
    bizClass: "응용 소프트웨어 개발 및 공급업, 컴퓨터시설 관리업",
    email: "77.victor.lee@gmail.com",
    bankName: "IBK기업은행",
    bankCode: "003",
    bankAccountNo: "140-129404-04-018",
    bankHolder: "이정용 드래곤알피에이",
  },
};

export const BUSINESS_ENTITY_LIST: BusinessEntity[] = [
  BUSINESS_ENTITIES.CORP,
  BUSINESS_ENTITIES.INDIVIDUAL,
];

export function getEntity(type?: string | null): BusinessEntity {
  if (type === "INDIVIDUAL") return BUSINESS_ENTITIES.INDIVIDUAL;
  return BUSINESS_ENTITIES.CORP;
}

export function getEntityByBizNum(bizNum: string): BusinessEntity {
  const clean = bizNum.replace(/[^0-9]/g, "");
  if (clean === "2950302683") return BUSINESS_ENTITIES.INDIVIDUAL;
  return BUSINESS_ENTITIES.CORP;
}

export function getEntityByAccountNo(accountNo: string): BusinessEntity {
  const clean = accountNo.replace(/[^0-9]/g, "");
  if (clean.includes("14012940404018") || clean.includes("140129404")) {
    return BUSINESS_ENTITIES.INDIVIDUAL;
  }
  return BUSINESS_ENTITIES.CORP;
}
