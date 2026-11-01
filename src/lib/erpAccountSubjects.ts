export interface StandardAccountSubject {
  code: string;
  label: string;
  direction: "DEPOSIT" | "WITHDRAWAL" | "BOTH";
  majorAccount: "REVENUE" | "COGS" | "PAYROLL" | "OPEX" | "TAX_DUES" | "NON_OP";
  subAccount: string;
  sign: 1 | -1;
}

export const STANDARD_ACCOUNT_SUBJECTS: StandardAccountSubject[] = [
  // === 입금(DEPOSIT) 전용/주요 계정과목 ===
  {
    code: "DEP_INTEREST",
    label: "이자수익(결산이자)",
    direction: "DEPOSIT",
    majorAccount: "NON_OP",
    subAccount: "이자수익",
    sign: 1,
  },
  {
    code: "DEP_CARD_REFUND",
    label: "체크/카드취소환급",
    direction: "DEPOSIT",
    majorAccount: "OPEX",
    subAccount: "체크·법인카드결제(취소환급)",
    sign: -1,
  },
  {
    code: "DEP_PURCHASE_REFUND",
    label: "매입환불/쿠팡·플랫폼환급",
    direction: "DEPOSIT",
    majorAccount: "OPEX",
    subAccount: "소모품·플랫폼·IT구독비",
    sign: -1,
  },
  {
    code: "DEP_SALES_NO_INV",
    label: "매출채권수납(세금계산서외)",
    direction: "DEPOSIT",
    majorAccount: "REVENUE",
    subAccount: "운영·유지보수 용역매출",
    sign: 1,
  },
  {
    code: "DEP_ADVANCE_CEO",
    label: "가수금/대표자입금",
    direction: "DEPOSIT",
    majorAccount: "NON_OP",
    subAccount: "가수금입금",
    sign: 1,
  },
  {
    code: "DEP_INTERNAL_TRANSFER",
    label: "계좌간이체(내부대체입금)",
    direction: "DEPOSIT",
    majorAccount: "NON_OP",
    subAccount: "가수금반환·자금이동",
    sign: 1,
  },
  {
    code: "DEP_PAYROLL_REFUND",
    label: "급여/정산환입",
    direction: "DEPOSIT",
    majorAccount: "PAYROLL",
    subAccount: "임직원급여·수당",
    sign: -1,
  },
  {
    code: "DEP_MISC_INCOME",
    label: "잡이익/기타수입",
    direction: "DEPOSIT",
    majorAccount: "NON_OP",
    subAccount: "기타미매칭입금",
    sign: 1,
  },

  // === 출금(WITHDRAWAL) 전용/주요 계정과목 ===
  {
    code: "WTH_WELFARE_MEAL",
    label: "복리후생비(식대·다과·경조사)",
    direction: "WITHDRAWAL",
    majorAccount: "OPEX",
    subAccount: "체크카드·현장운영경비",
    sign: 1,
  },
  {
    code: "WTH_SUPPLIES_IT",
    label: "소모품·플랫폼·IT구독비(쿠팡·네이버등)",
    direction: "WITHDRAWAL",
    majorAccount: "OPEX",
    subAccount: "소모품·플랫폼·IT구독비",
    sign: 1,
  },
  {
    code: "WTH_COGS_CARD",
    label: "상품·장비·자재매입원가(무증빙/카드)",
    direction: "WITHDRAWAL",
    majorAccount: "COGS",
    subAccount: "무증빙·카드 상품자재매입",
    sign: 1,
  },
  {
    code: "WTH_OUTSOURCING",
    label: "외주용역·전대임차원가",
    direction: "WITHDRAWAL",
    majorAccount: "COGS",
    subAccount: "외주용역·전대임차원가",
    sign: 1,
  },
  {
    code: "WTH_VEHICLE_TRANSPORT",
    label: "차량유지·주유·통행·주차비",
    direction: "WITHDRAWAL",
    majorAccount: "OPEX",
    subAccount: "차량유지·렌트비",
    sign: 1,
  },
  {
    code: "WTH_RENT_MGMT",
    label: "임차료·관리비",
    direction: "WITHDRAWAL",
    majorAccount: "OPEX",
    subAccount: "임차료·관리비",
    sign: 1,
  },
  {
    code: "WTH_UTILITIES",
    label: "수도광열비(전기·가스·수도)",
    direction: "WITHDRAWAL",
    majorAccount: "OPEX",
    subAccount: "수도광열비(공과금)",
    sign: 1,
  },
  {
    code: "WTH_TELECOM",
    label: "통신비(전화·인터넷·우편)",
    direction: "WITHDRAWAL",
    majorAccount: "OPEX",
    subAccount: "통신비",
    sign: 1,
  },
  {
    code: "WTH_FEE_TAX_CERT",
    label: "지급수수료(은행·세무·인증·법무)",
    direction: "WITHDRAWAL",
    majorAccount: "OPEX",
    subAccount: "세무·인증·수수료",
    sign: 1,
  },
  {
    code: "WTH_INSURANCE_4DAE",
    label: "4대보험료(건강·연금·고용·산재)",
    direction: "WITHDRAWAL",
    majorAccount: "PAYROLL",
    subAccount: "4대보험료(기관납부)",
    sign: 1,
  },
  {
    code: "WTH_PAYROLL_SALARY",
    label: "임직원급여·상여·수당",
    direction: "WITHDRAWAL",
    majorAccount: "PAYROLL",
    subAccount: "임직원급여·수당",
    sign: 1,
  },
  {
    code: "WTH_PAYROLL_DAILY",
    label: "일용직·단기노무비",
    direction: "WITHDRAWAL",
    majorAccount: "PAYROLL",
    subAccount: "일용직급여",
    sign: 1,
  },
  {
    code: "WTH_CORP_CARD_SETTLE",
    label: "법인BC카드대금결제",
    direction: "WITHDRAWAL",
    majorAccount: "OPEX",
    subAccount: "법인BC카드대금결제",
    sign: 1,
  },
  {
    code: "WTH_TAX_PUBLIC",
    label: "세금과공과(국세·지방세·벌과금)",
    direction: "WITHDRAWAL",
    majorAccount: "OPEX",
    subAccount: "기타지급수수료·경비",
    sign: 1,
  },
  {
    code: "WTH_CEO_REPAY",
    label: "가수금반제/대표자인출",
    direction: "WITHDRAWAL",
    majorAccount: "NON_OP",
    subAccount: "가수금반환·자금이동",
    sign: 1,
  },
  {
    code: "WTH_INTERNAL_TRANSFER",
    label: "계좌간이체(내부대체출금)",
    direction: "WITHDRAWAL",
    majorAccount: "NON_OP",
    subAccount: "가수금반환·자금이동",
    sign: 1,
  },
  {
    code: "WTH_MISC_OPEX",
    label: "기타지급수수료·현장운영경비",
    direction: "WITHDRAWAL",
    majorAccount: "OPEX",
    subAccount: "기타지급수수료·경비",
    sign: 1,
  },
];

export function resolveExplicitAccountSubject(
  matchedIdRaw: string,
  isDeposit: boolean
): {
  majorAccount: "REVENUE" | "COGS" | "PAYROLL" | "OPEX" | "TAX_DUES" | "NON_OP";
  subAccount: string;
  sign: 1 | -1;
} | null {
  const label = (matchedIdRaw || "").trim();
  if (!label) return null;

  const found = STANDARD_ACCOUNT_SUBJECTS.find(
    (s) => s.label === label || s.code === label || label.includes(s.label)
  );
  if (found) {
    return {
      majorAccount: found.majorAccount,
      subAccount: found.subAccount,
      sign: found.sign,
    };
  }

  // Fallback keyword mapping if user typed a custom account subject
  if (/이자/.test(label)) {
    return { majorAccount: "NON_OP", subAccount: "이자수익", sign: 1 };
  }
  if (/취소|환급|환불/.test(label)) {
    return {
      majorAccount: "OPEX",
      subAccount: "체크·법인카드결제(취소환급)",
      sign: isDeposit ? -1 : 1,
    };
  }
  if (/가수금|차입|대체|이체|대표자/.test(label)) {
    return {
      majorAccount: "NON_OP",
      subAccount: isDeposit ? "가수금입금" : "가수금반환·자금이동",
      sign: 1,
    };
  }
  if (/4대보험|국민연금|건강보험|고용보험|산재보험/.test(label)) {
    return { majorAccount: "PAYROLL", subAccount: "4대보험료(기관납부)", sign: 1 };
  }
  if (/일용|아르바이트|노무/.test(label)) {
    return { majorAccount: "PAYROLL", subAccount: "일용직급여", sign: isDeposit ? -1 : 1 };
  }
  if (/급여|상여|퇴직/.test(label)) {
    return { majorAccount: "PAYROLL", subAccount: "임직원급여·수당", sign: isDeposit ? -1 : 1 };
  }
  if (/상품|자재|원재료|매입원가/.test(label)) {
    return { majorAccount: "COGS", subAccount: "무증빙·카드 상품자재매입", sign: isDeposit ? -1 : 1 };
  }
  if (/외주|용역원가|임차원가/.test(label)) {
    return { majorAccount: "COGS", subAccount: "외주용역·전대임차원가", sign: isDeposit ? -1 : 1 };
  }
  if (/임차료|월세|관리비/.test(label)) {
    return { majorAccount: "OPEX", subAccount: "임차료·관리비", sign: 1 };
  }
  if (/수도|광열|전기|가스/.test(label)) {
    return { majorAccount: "OPEX", subAccount: "수도광열비(공과금)", sign: 1 };
  }
  if (/통신|전화|인터넷/.test(label)) {
    return { majorAccount: "OPEX", subAccount: "통신비", sign: 1 };
  }
  if (/차량|주유|주차|통행|렌트/.test(label)) {
    return { majorAccount: "OPEX", subAccount: "차량유지·렌트비", sign: 1 };
  }
  if (/수수료|세무|인증|법무/.test(label)) {
    return { majorAccount: "OPEX", subAccount: "세무·인증·수수료", sign: 1 };
  }
  if (/소모품|쿠팡|플랫폼|구독/.test(label)) {
    return { majorAccount: "OPEX", subAccount: "소모품·플랫폼·IT구독비", sign: isDeposit ? -1 : 1 };
  }
  if (/복리후생|식대|경비|체크/.test(label)) {
    return { majorAccount: "OPEX", subAccount: "체크카드·현장운영경비", sign: 1 };
  }
  if (/매출|수납/.test(label) && isDeposit) {
    return { majorAccount: "REVENUE", subAccount: "운영·유지보수 용역매출", sign: 1 };
  }

  return {
    majorAccount: isDeposit ? "NON_OP" : "OPEX",
    subAccount: isDeposit ? "기타미매칭입금" : "기타지급수수료·경비",
    sign: 1,
  };
}

// 통장 거래 행(row)의 기재내용·거래구분·예금주를 분석하여 가장 적합한 추천 계정과목을 반환
export function recommendAccountSubjectForTx(row: any): string | null {
  const dAmt = Number(row.deposit_amount ?? row.depositAmount ?? 0);
  const wAmt = Number(row.withdrawal_amount ?? row.withdrawalAmount ?? 0);
  const isDep = dAmt > 0 || row.trans_type === "DEPOSIT" || row.transType === "DEPOSIT";
  const sr = String(row.sender_receiver ?? row.senderReceiver ?? "").replace(/\u3000/g, " ").trim();
  const holder = String(row.counterparty_holder ?? row.counterpartyHolder ?? "").replace(/\u3000/g, " ").trim();
  const txChannel = String(row.tx_channel ?? row.txChannel ?? "").trim();
  const memo = String(row.memo ?? "").trim();
  const combined = `${sr} ${holder} ${memo}`;

  if (isDep) {
    if (txChannel === "이자" || /결산|이자/.test(combined)) {
      return "이자수익(결산이자)";
    }
    if (txChannel === "취소" || txChannel === "정정" || /체크취소|BC체크취소|카드취소/.test(combined)) {
      if (/쿠팡|네이버|11번가|옥션|G마켓/.test(combined)) {
        return "매입환불/쿠팡·플랫폼환급";
      }
      return "체크/카드취소환급";
    }
    if (/쿠팡/.test(combined)) {
      return "매입환불/쿠팡·플랫폼환급";
    }
    if (/가수금|가수근|운영자금|이정용/.test(combined)) {
      return "가수금/대표자입금";
    }
    if (/드래곤알피에이|1일단기/.test(combined)) {
      return "계좌간이체(내부대체입금)";
    }
    return "잡이익/기타수입";
  }

  if (wAmt > 0) {
    if (/국민연금|국민건강|건강보험|고용보험|산재보험|국민건강보험공단/.test(combined)) {
      return "4대보험료(건강·연금·고용·산재)";
    }
    if (txChannel === "BC" || /비씨카드|BC카드선결제/.test(combined)) {
      return "법인BC카드대금결제";
    }
    if (/쿠팡|네이버페이|구글페이먼트|카카오/.test(combined)) {
      return "소모품·플랫폼·IT구독비(쿠팡·네이버등)";
    }
    if (/컴퓨존|옥션|G마켓|11번가|지앤지커머스|도매꾹|하이마트|전자랜드/.test(combined)) {
      return "상품·장비·자재매입원가(무증빙/카드)";
    }
    if (/주유|칼텍스|SK에너지|오일뱅크|에쓰오일|주차|하이패스|도로공사|쏘카|렌터카|자동차/.test(combined)) {
      return "차량유지·주유·통행·주차비";
    }
    if (/관리비|미소지움|임차료|월세|이명옥/.test(combined)) {
      return "임차료·관리비";
    }
    if (/도시가스|귀뚜라미|한전|한국전력|수도/.test(combined)) {
      return "수도광열비(전기·가스·수도)";
    }
    if (/SKT|케이티|KT|LGU|브로드밴드|텔레콤|우체국/.test(combined)) {
      return "통신비(전화·인터넷·우편)";
    }
    if (/수수료|세무|회계|법무|등기|인증/.test(combined)) {
      return "지급수수료(은행·세무·인증·법무)";
    }
    if (/국세|지방세|부가세|법인세|원천세|세무서|금천구|서울시세/.test(combined) || txChannel === "국세" || txChannel === "지로") {
      return "세금과공과(국세·지방세·벌과금)";
    }
    if (/가수금|가수근|이정용/.test(combined)) {
      return "가수금반제/대표자인출";
    }
    if (/드래곤알피에이/.test(combined)) {
      return "계좌간이체(내부대체출금)";
    }
    if (txChannel === "체크" || txChannel === "CC") {
      return "복리후생비(식대·다과·경조사)";
    }
    return "기타지급수수료·현장운영경비";
  }

  return null;
}
