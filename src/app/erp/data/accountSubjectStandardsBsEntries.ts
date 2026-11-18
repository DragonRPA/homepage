export interface AccountSubjectStandardInfo {
  key: string;
  title: string;
  categoryLabel: string;
  complianceStatus: "적합" | "특례적용" | "관리항목";
  complianceBadge: string;
  appliedBasisSummary: string;
  recognitionTiming: string;
  measurementPrinciple: string;
  erpFormulaOrLogic: string;
  taxLawHarmonization?: string;
  articleIds: string[];
  commentaryIds: string[];
}

export const BS_ACCOUNT_SUBJECT_STANDARDS: Record<string, AccountSubjectStandardInfo> = {
  // ==================== 7. 세금과공과 세목 (TAX_DUES SUB-ACCOUNTS) ====================
  "원천세": {
    key: "원천세",
    title: "원천세 (근로·퇴직·사업소득 원천징수세액)",
    categoryLabel: "Ⅴ. 세금과공과 · 원천징수 예수금(제14조②) 및 세전인건비 보정(제17조①)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제14조②(예수금)·제17조①(종업원급여) 부합",
    appliedBasisSummary:
      "임직원 급여·퇴직금·사업소득 지급 시 소득세법 및 지방세법에 따라 원천징수하여 익월 10일 국세청·지자체에 납부한 원천세(근로소득세, 퇴직소득세 등)입니다.",
    recognitionTiming:
      "급여 귀속연도(attribution_year) 기준 인식. 당기 12월 귀속분으로서 익년 1월에 납부된 원천세는 당기 12월 비용 및 기말 대차대조표의 '원천세(예수금, 유동부채)'로 계상됩니다.",
    measurementPrinciple:
      "통장 급여 출금액('임직원급여·수당')은 원천세를 공제한 세후 실지급액이므로, 손익계산서에서 원천세 납부액을 차감 반영함으로써 회계기준상 세전 총급여(실지급액 + 원천징수세액)와 정확히 일치시킵니다.",
    erpFormulaOrLogic: "∑ 국세청 납부내역(erp_tax_payments) 중 귀속연도 원천세 합계",
    articleIds: ["art-14", "art-17", "art-29"],
    commentaryIds: ["com-4-3", "com-12-1"],
  },

  "부가세": {
    key: "부가세",
    title: "부가세 (부가가치세 확정·예정 납부세액)",
    categoryLabel: "Ⅴ. 세금과공과 · 부가세예수금(제14조②) 및 부가세대급금(제7조②) 정산",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제6조·제7조·제14조·제26조 부합",
    appliedBasisSummary:
      "부가가치세법에 따라 국세청에 납부한 부가가치세 예정고지·확정신고 세액입니다.",
    recognitionTiming:
      "과세기간 귀속연도 기준 표시(현금흐름표 CF에는 실제 납부일 기준 유출 반영).",
    measurementPrinciple:
      "부가가치세는 매출세액(부가세예수금, 유동부채)에서 매입세액(부가세대급금, 당좌자산)을 차감하여 국가에 대리 납부하는 간접세입니다. 따라서 공급가액 기준(K-GAAP 표준) 선택 시 손익계산서 비용에서 제외하여 당기순이익을 차감하지 않으며, 오직 '부가세 포함 총액' 기준 선택 시에만 현금수지 차감 항목으로 작동합니다.",
    erpFormulaOrLogic:
      "공급가액 기준 PL 비용 차감액 = ₩0 (BS 부가세예수금·대급금 및 CF 세무유출로만 반영)",
    articleIds: ["art-7", "art-14", "art-26"],
    commentaryIds: ["com-4-3", "com-4-4"],
  },

  "법인세": {
    key: "법인세",
    title: "법인세 (법인세비용 및 중간예납 선급법인세)",
    categoryLabel: "Ⅴ. 세금과공과 · 법인세비용(제34조) 및 선급법인세(제7조②)",
    complianceStatus: "특례적용",
    complianceBadge: "중소기업회계기준 제34조(이연법인세 면제)·제7조②·제14조② 부합",
    appliedBasisSummary:
      "법인세법에 따라 과세소득에 대해 납부하여야 할 법인세 및 법인지방소득세입니다.",
    recognitionTiming:
      "중소기업회계기준 제34조에 따라 이연법인세자산·부채를 인식하지 않고, 해당 귀속사업연도에 법인세법에 따라 부담할 확정 법인세액을 당기 비용으로 인식합니다. 기말 현재 미납된 당기 귀속 확정법인세는 대차대조표 유동부채('미지급법인세', 제14조제2항)로 인식합니다.",
    measurementPrinciple:
      "기중(8월)에 납부한 당해 연도 법인세 중간예납 세액은 결산 확정 전 선납한 세금이므로 당기 비용이 아닌 당좌자산('선급법인세', 제7조제2항)으로 분리하여 당기순이익 과소계상을 방지합니다.",
    erpFormulaOrLogic:
      "당기 손익차감 법인세비용 = 귀속연도 총 법인세 납부·확정액 - 8월 중간예납 선급법인세(자산)",
    taxLawHarmonization:
      "중소기업회계기준 제34조('법인세비용이란 법인세법에 따라 납부하여야 할 금액인 법인세와 이에 부가되는 세액을 말한다')를 그대로 적용합니다.",
    articleIds: ["art-34", "art-35", "art-7", "art-14"],
    commentaryIds: ["com-4-4", "com-4-3"],
  },

  "납부항목": {
    key: "납부항목",
    title: "납부항목 (주민세 사업소분·등록면허세 등 세금과공과)",
    categoryLabel: "Ⅴ. 세금과공과 · 판매비와관리비 세금과공과 (제29조②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제29조②(세금과공과) 부합",
    appliedBasisSummary:
      "원천세·부가세·법인세 외에 회사에 부과되는 주민세(사업소분·균등분), 등록면허세, 인지세 및 기타 공과금 납부액입니다.",
    recognitionTiming: "세금 및 공과금 부과·납부 시점.",
    measurementPrinciple:
      "중소기업회계기준 제29조제2항에 따른 판매비와관리비의 '세금과공과'로서 당기 손익에서 전액 비용 차감합니다.",
    erpFormulaOrLogic: "∑ 국세청·지자체 납부내역 중 주민세 사업소분 등 기타 세금과공과 합계",
    articleIds: ["art-29", "art-23"],
    commentaryIds: ["com-4-4"],
  },

  // ==================== 8. 영업외·자금이동 세목 (NON_OP SUB-ACCOUNTS) ====================
  "이자수익": {
    key: "이자수익",
    title: "이자수익 (보통예금 결산이자)",
    categoryLabel: "Ⅵ. 영업외·자금이동 · 영업외수익 (제24조③·제31조②)",
    complianceStatus: "특례적용",
    complianceBadge: "중소기업회계기준 제24조③ 단서(현금수취시점 특례)·제31조② 부합",
    appliedBasisSummary:
      "기업은행 등 사업용 보통예금 계좌에서 분기·결산 시점에 입금되는 예금이자 수익입니다.",
    recognitionTiming:
      "중소기업회계기준 제24조제3항 단서('각 회계연도의 손익에 미치는 영향이 중요하지 않다면 실제로 현금을 받은 시점에 수익을 인식할 수 있다' / 해설서 제14장 [3] 법인세법 원천징수 이자 현금주의 허용)에 따라 통장에 결산이자가 실제 입금된 날에 인식합니다.",
    measurementPrinciple: "실제 입금된 이자 금액.",
    erpFormulaOrLogic: "∑ 통장 거래구분 '이자' 또는 적요 '결산이자' 입금액",
    taxLawHarmonization:
      "법인세법 시행령 제70조제1항제1호(이자소득의 귀속사업연도는 소득세법 시행령 제45조에 따른 수입시기인 실제로 이자를 지급받는 날)와 100% 일치합니다.",
    articleIds: ["art-24", "art-31"],
    commentaryIds: ["com-14-3", "com-4-4"],
  },

  "세금환급·과오납환입": {
    key: "세금환급·과오납환입",
    title: "세금환급·과오납환입",
    categoryLabel: "Ⅵ. 영업외·자금이동 · 영업외수익 / 세금환급 (제31조·제34조·제44조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제31조·제34조·제44조 부합",
    appliedBasisSummary:
      "과거 납부한 지방세·등록면허세·국세 등의 과오납 환급금(예: 금천구청 등록면허세 과오납환입 등) 입금 내역입니다.",
    recognitionTiming: "환급 결정 및 통장 입금 시점.",
    measurementPrinciple:
      "법인세 환급액은 제34조에 따라 법인세비용에 반영하고, 지방세·공과금 과오납 환급액은 영업외수익(잡이익·전기오류수정이익) 또는 관련 비용의 환입으로 처리합니다.",
    erpFormulaOrLogic: "∑ 통장 적요 '과오납' 또는 '환급' 입금액",
    articleIds: ["art-31", "art-34", "art-44"],
    commentaryIds: ["com-4-4", "com-3-4"],
  },

  "임대자산취득(자산화)": {
    key: "임대자산취득(자산화)",
    title: "임대자산취득(자산화 · CAPEX)",
    categoryLabel: "Ⅵ. 영업외·자금이동 · 유형/무형자산 취득 자본적 지출 (제11조·제12조·제38조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제11조①·제12조①·제38조①(취득원가 자산화) 부합",
    appliedBasisSummary:
      "타인에게 임대(렌탈)할 목적으로 취득한 1년 초과 사용 자산(65인치/55인치/75인치 TV, 스탠바이미, 더 세로, 프로젝터, DDR5 RAM, NVMe SSD, 한컴 라이선스 등 총 98대)의 취득원가입니다.",
    recognitionTiming:
      "자산 매입세금계산서 발행일 또는 카드 결제일 기준. 취득 시점에는 비용(COGS/OPEX)으로 처리하지 않고 전액 대차대조표의 '유형자산(취득가액)'으로 등재합니다.",
    measurementPrinciple:
      "제38조제1항에 따라 구입가격(공급가액, 면세·카드 미공제분은 결제금액)을 취득원가로 측정하며, 현금흐름표(CF)에서는 '투자활동 현금유출'로 분류되고, 손익계산서(PL)에는 매월 정액법 상각액만 '임대자산 감가상각비(매출원가)'로 분할 반영됩니다.",
    erpFormulaOrLogic:
      "∑ 자산화 대상 매입세금계산서 공급가액(전액 및 부분자산화분) + ∑ 자산화 대상 카드결제 4건(#1171, #1727, #1046, #1015)",
    articleIds: ["art-11", "art-12", "art-36", "art-38"],
    commentaryIds: ["com-7-1", "com-7-2", "com-7-3", "com-8-1"],
  },

  "자본금납입": {
    key: "자본금납입",
    title: "자본금납입 (주식발행 납입자본금)",
    categoryLabel: "Ⅵ. 영업외·자금이동 · 자본거래 (제19조·제45조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제19조·제45조·상법 제451조 부합",
    appliedBasisSummary:
      "2024년 7월 법인 설립 시 주금납입으로 유입된 보통주 자본금(5,000,000원)입니다.",
    recognitionTiming: "주금납입일(2024-07-08, 법인 계좌 대체 입금일).",
    measurementPrinciple:
      "상법 제451조 및 중소기업회계기준 제19조·제45조에 따라 발행주식의 액면총액(5,000,000원)을 대차대조표 자본의 '자본금'으로 계상하며, 현금흐름표(CF)에서는 '재무활동 현금유입'으로 분류합니다.",
    erpFormulaOrLogic: "법인 설립 주금납입 ₩5,000,000 (BS 자본금 및 CF 재무활동 유입)",
    articleIds: ["art-19", "art-45", "art-52"],
    commentaryIds: ["com-15-1", "com-4-3", "com-4-5"],
  },

  "임차보증금지급": {
    key: "임차보증금지급",
    title: "임차보증금지급 (기타비유동자산)",
    categoryLabel: "Ⅵ. 영업외·자금이동 · 기타비유동자산 취득 (제13조②·제40조①)",
    complianceStatus: "특례적용",
    complianceBadge: "중소기업회계기준 제13조②·제40조①(명목금액 측정 특례) 부합",
    appliedBasisSummary:
      "사업장 임대차계약에 따라 임대인(이명옥)에게 지급한 임차보증금(계약금 3,000,000원 + 잔금 2,000,000원 = 총 5,000,000원)입니다.",
    recognitionTiming: "보증금 지급일(2024-07-08 계약금, 2024-07-09 잔금).",
    measurementPrinciple:
      "임대차 종료 시 전액 반환받을 권리가 있는 자산이므로 비용(임차료)으로 처리하지 않고 대차대조표 비유동자산 중 '기타비유동자산(임차보증금, 제13조제2항)'으로 인식합니다. 또한 제40조제1항(현재가치평가 면제)에 따라 현재가치 할인 없이 명목금액(5,000,000원) 그대로 측정합니다.",
    erpFormulaOrLogic: "임차보증금 계약금 ₩3,000,000 + 복합출금(#128) 중 보증금 잔금 ₩2,000,000 = BS 임차보증금 ₩5,000,000",
    articleIds: ["art-13", "art-40", "art-6"],
    commentaryIds: ["com-4-3", "com-11-1"],
  },

  "가수금입금": {
    key: "가수금입금",
    title: "가수금입금 (대표자 단기차입·운영자금 입금)",
    categoryLabel: "Ⅵ. 영업외·자금이동 · 재무활동 부채/자금이동 (제6조⑧·제14조②·제41조①)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제6조⑧·제14조②·제41조① 부합",
    appliedBasisSummary:
      "법인 운영자금 조달을 위해 대표이사(이정용)로부터 일시 차입·입금받은 가수금(단기차입금)입니다.",
    recognitionTiming: "통장 입금일 기준.",
    measurementPrinciple:
      "수익(매출)이 아닌 상환 의무가 있는 자금 차입이므로 손익계산서에서 제외하고 현금흐름표(CF)의 '재무활동 현금유입'으로 분류합니다. 중소기업회계기준 제6조제8항에 따라 가수금 반제액('가수금반환·자금이동')과 대조하여 기말 미상환 잔액 여부를 관리합니다(법인 누적 입금 19,056,000원 - 누적 반제 19,056,000원 = 기말 미상환 잔액 0원).",
    erpFormulaOrLogic: "∑ 법인 계좌 대표자·운영자금 가수금 입금액",
    articleIds: ["art-6", "art-14", "art-41"],
    commentaryIds: ["com-4-3", "com-11-1"],
  },

  "가수금반환·자금이동": {
    key: "가수금반환·자금이동",
    title: "가수금반환·자금이동 (가수금 반제 및 내부계좌 대체)",
    categoryLabel: "Ⅵ. 영업외·자금이동 · 부채 상환 및 계좌간 대체 (제6조⑧·제16조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제6조⑧·제16조(부채의 소멸·제거) 부합",
    appliedBasisSummary:
      "대표이사로부터 입금되었던 가수금(단기차입금)을 상환(반제)하거나 당사 계좌 간 내부 자금을 대체 이체한 내역입니다.",
    recognitionTiming: "통장 출금·이체일 기준.",
    measurementPrinciple:
      "제16조('차입금 등이 소멸하는 경우 그 부채를 대차대조표에서 제거한다')에 따라 부채의 상환으로 처리하며, 비용이 아니므로 손익계산서에 영향을 주지 않고 현금흐름표(CF)의 '재무활동 현금유출'로 반영됩니다.",
    erpFormulaOrLogic: "∑ 가수금 반제 출금액 + 계좌간 내부대체 이체액",
    articleIds: ["art-6", "art-16", "art-14"],
    commentaryIds: ["com-4-3", "com-11-1"],
  },

  "대표자입금(개인계좌)": {
    key: "대표자입금(개인계좌)",
    title: "대표자입금(개인계좌 · 사업주 자본전입)",
    categoryLabel: "Ⅵ. 영업외·자금이동 · 개인사업자 자본거래 (해설서 제1장 [1]·제6조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 해설서 제1장 [1](개인사업자 준용)·제6조 부합",
    appliedBasisSummary:
      "개인사업자(드래곤알피에이) 사업용 계좌에 대표자(사업주)가 운영자금을 입금한 자본전입 거래입니다.",
    recognitionTiming: "통장 입금일 기준.",
    measurementPrinciple:
      "개인사업자의 대표자 입금은 수익이 아닌 자본의 추가 납입(인출금 차감)에 해당하므로 당기순이익 계산에서 제외하고 재무활동 현금유입으로 분류합니다.",
    erpFormulaOrLogic: "∑ 개인사업자 계좌 대표자(이정용) 입금액",
    articleIds: ["art-2", "art-6", "art-19"],
    commentaryIds: ["com-1-1", "com-4-3"],
  },

  "대표자인출(개인계좌)": {
    key: "대표자인출(개인계좌)",
    title: "대표자인출(개인계좌 · 사업주 인출금)",
    categoryLabel: "Ⅵ. 영업외·자금이동 · 개인사업자 자본인출 (해설서 제1장 [1]·제6조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 해설서 제1장 [1](개인사업자 준용)·제6조 부합",
    appliedBasisSummary:
      "개인사업자(드래곤알피에이) 사업용 계좌에서 대표자(사업주) 개인 계좌로 사업소득 잉여 자금을 인출한 자본거래입니다.",
    recognitionTiming: "통장 출금일 기준.",
    measurementPrinciple:
      "개인사업자의 대표자 인출금은 급여나 비용(손금)이 아니라 사업주 자본(이익잉여금)의 인출이므로 손익계산서 비용에서 제외하고 현금흐름표의 재무활동 현금유출로 분류합니다.",
    erpFormulaOrLogic: "∑ 개인사업자 계좌 대표자(이정용) 출금액",
    articleIds: ["art-2", "art-6", "art-22"],
    commentaryIds: ["com-1-1", "com-4-3"],
  },

  "기타미매칭입금": {
    key: "기타미매칭입금",
    title: "기타미매칭입금 (가수금·잡이익 대기 항목)",
    categoryLabel: "Ⅵ. 영업외·자금이동 · 미결산 입금 및 영업외수익 (제6조⑧·제31조)",
    complianceStatus: "관리항목",
    complianceBadge: "중소기업회계기준 제6조⑧(가수금 정리)·제31조 부합",
    appliedBasisSummary:
      "세금계산서와 아직 매칭되지 않았거나 거래 성격을 확인 중인 기타 입금액입니다.",
    recognitionTiming: "통장 입금일 기준.",
    measurementPrinciple:
      "중소기업회계기준 제6조제8항('가수금 등은 그 내용을 나타내는 적절한 항목으로 표시한다')에 따라 입출금 매칭 탭에서 매출채권 수납, 비용 환급, 가수금 또는 잡이익 중 본래 계정과목으로 지정하면 즉시 해당 계정으로 재분류됩니다.",
    erpFormulaOrLogic: "∑ 미매칭 기타 입금액",
    articleIds: ["art-6", "art-31"],
    commentaryIds: ["com-4-3", "com-4-4"],
  },

  // ==================== 9. 대차대조표(BS) 계정과목 ====================
  BS_CURRENT_ASSETS: {
    key: "BS_CURRENT_ASSETS",
    title: "Ⅰ. 유동자산 (당좌자산)",
    categoryLabel: "대차대조표(BS) · 자산 > 유동자산 (제6조⑤·제7조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제6조⑤·제7조·별지 제1호 부합",
    appliedBasisSummary:
      "회계연도 말부터 1년 이내에 현금화되거나 실현될 것으로 예상되는 자산으로서, 당사는 현금및현금성자산, 매출채권(미수금), 부가세대급금·선급법인세로 구성됩니다.",
    recognitionTiming: "대차대조표일(기말 결산일) 현재 잔액.",
    measurementPrinciple: "유동성이 높은 항목부터 배열(제6조제6항 유동성 배열법)하며 총액으로 표시합니다.",
    erpFormulaOrLogic: "유동자산 = 현금및현금성자산 + 매출채권(미수금) + 부가세대급금·선급법인세",
    articleIds: ["art-6", "art-7", "form-1"],
    commentaryIds: ["com-4-3", "com-5-1"],
  },

  BS_CASH: {
    key: "BS_CASH",
    title: "현금및현금성자산",
    categoryLabel: "대차대조표(BS) · 유동자산 > 당좌자산 (제7조②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제7조②·별지 제1호 부합",
    appliedBasisSummary:
      "보유 현금, 요구불예금(기업은행 법인·개인 보통예금 계좌) 및 취득 당시 만기가 3개월 이내인 유동성이 매우 높은 단기금융상품입니다.",
    recognitionTiming: "대차대조표일(기말 기준일) 현재 각 사업용 계좌의 실제 마감 잔액.",
    measurementPrinciple: "기말 통장 잔액(명목금액)으로 측정하며, 현금흐름표(CF)의 '기말 현금및현금성자산'과 100% 일치합니다.",
    erpFormulaOrLogic: "∑ 사업용 계좌별 기준일(12월 31일) 최종 거래 후 잔액(balance_after)",
    articleIds: ["art-6", "art-7", "form-1"],
    commentaryIds: ["com-4-3"],
  },

  BS_AR: {
    key: "BS_AR",
    title: "매출채권 (미수금)",
    categoryLabel: "대차대조표(BS) · 유동자산 > 당좌자산 (제7조②·③, 제40조)",
    complianceStatus: "특례적용",
    complianceBadge: "중소기업회계기준 제7조·제40조①(현재가치평가 면제) 부합",
    appliedBasisSummary:
      "주된 영업활동(렌탈, 상품판매, SI·유지보수 용역)에서 발행한 매출 세금계산서 중 기말 현재 아직 수납되지 않은 외상매출금 및 미수금 잔액입니다.",
    recognitionTiming: "매출 세금계산서 발행 시 인식하고, 통장 입금 매칭 시 제거(제8조).",
    measurementPrinciple:
      "중소기업회계기준 제40조제1항에 따라 현재가치할인차금 평가를 하지 않고 청구 명목금액(총액 - 기수납액)으로 측정합니다. 회수불능 추산액이 있는 경우 대손충당금(법인세법 한도 1% 등 허용)을 차감 표시합니다.",
    erpFormulaOrLogic: "∑ 매출 세금계산서(UNPAID/PARTIAL) 미수 잔액(total_amount - settled_amount)",
    articleIds: ["art-7", "art-8", "art-40"],
    commentaryIds: ["com-4-3", "com-11-1"],
  },

  BS_VAT_PREPAID: {
    key: "BS_VAT_PREPAID",
    title: "부가세대급금·선급법인세",
    categoryLabel: "대차대조표(BS) · 유동자산 > 당좌자산 (제7조②·제34조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제7조②(선급금·미수금)·제34조 부합",
    appliedBasisSummary:
      "기말 현재 공제·환급받을 부가가치세 초과 매입세액(부가세대급금)과 기중(8월)에 선납한 법인세 중간예납 세액(선급법인세)입니다.",
    recognitionTiming: "2기(7~12월) 부가가치세 정산 시점 및 8월 법인세 중간예납 납부 시점.",
    measurementPrinciple:
      "2기 매입세액(세금계산서 + 공제대상 카드) 및 예정고지 기납부세액의 합계가 2기 매출세액을 초과하는 경우 그 환급예정액을 부가세대급금으로 계상하고, 8월 중간예납 법인세를 선급법인세로 합산 표시합니다.",
    erpFormulaOrLogic: "Max(0, 2기 매입세액 + 카드공제세액 + 예정고지납부액 - 2기 매출세액) + 8월 중간예납 법인세",
    articleIds: ["art-7", "art-34"],
    commentaryIds: ["com-4-3", "com-4-4"],
  },

  BS_NON_CURRENT_ASSETS: {
    key: "BS_NON_CURRENT_ASSETS",
    title: "Ⅱ. 비유동자산 (유형자산 · 기타비유동자산)",
    categoryLabel: "대차대조표(BS) · 자산 > 비유동자산 (제6조⑤·제10조~제13조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제6조⑤·제11조~제13조 부합",
    appliedBasisSummary:
      "1년을 초과하여 영업·임대 활동에 사용하거나 보유하는 장기성 자산으로서, 당사는 사업장 임차보증금과 임대용 자산(취득가액 - 감가상각누계액)으로 구성됩니다.",
    recognitionTiming: "자산 취득일 및 보증금 지급일 기준.",
    measurementPrinciple: "임차보증금 명목가액 + (유형·무형자산 취득원가 - 감가상각누계액).",
    erpFormulaOrLogic: "비유동자산 = 임차보증금 + Max(0, 유형자산 취득가액 - 감가상각누계액)",
    articleIds: ["art-6", "art-11", "art-12", "art-13", "art-38"],
    commentaryIds: ["com-4-3", "com-7-1", "com-7-3"],
  },

  BS_LEASE_DEPOSIT: {
    key: "BS_LEASE_DEPOSIT",
    title: "임차보증금",
    categoryLabel: "대차대조표(BS) · 비유동자산 > 기타비유동자산 (제13조②·제40조①)",
    complianceStatus: "특례적용",
    complianceBadge: "중소기업회계기준 제13조②·제40조①(명목금액 측정) 부합",
    appliedBasisSummary:
      "본사 사무실 임대차계약에 따라 임대인에게 예치한 반환조건부 임차보증금(5,000,000원)입니다.",
    recognitionTiming: "임대차 보증금 지급 완료 시점(2024년 7월).",
    measurementPrinciple:
      "중소기업회계기준 제13조제2항에 따라 기타비유동자산으로 분류하며, 제40조제1항(및 해설서 제11장 [1] 보증금 현재가치평가 면제 특례)에 따라 현재가치 할인 없이 명목금액(5,000,000원)으로 측정합니다.",
    erpFormulaOrLogic: "법인 사업장 임차보증금 ₩5,000,000",
    articleIds: ["art-13", "art-40"],
    commentaryIds: ["com-4-3", "com-11-1"],
  },

  BS_TANGIBLE_ASSETS: {
    key: "BS_TANGIBLE_ASSETS",
    title: "유형자산 (취득가액)",
    categoryLabel: "대차대조표(BS) · 비유동자산 > 유형·무형자산 취득원가 (제11조·제12조·제38조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제11조①·제12조①·제38조① 부합",
    appliedBasisSummary:
      "타인에게 임대(렌탈)하기 위하여 보유하고 있는 1년 초과 사용 자산(TV, 프로젝터, DDR5 메모리, NVMe SSD, 소프트웨어 라이선스 등 기말 가동 중인 자산)의 취득원가 합계액입니다.",
    recognitionTiming: "자산 취득일(세금계산서 발행일·카드 결제일) 인식, 영구 파손·폐기 시 제거(제11조제4항).",
    measurementPrinciple:
      "제36조제1항 및 제38조제1항에 따라 매입가액에 취득부대원가를 가산한 역사적 취득원가로 측정하며, 파손·폐기 완료된 자산은 취득가액과 감가상각누계액에서 동시에 제거합니다.",
    erpFormulaOrLogic: "∑ 기말 현재 가동 중인 렌탈자산(erp_rental_assets)의 acquisition_cost 합계",
    articleIds: ["art-11", "art-12", "art-36", "art-38"],
    commentaryIds: ["com-7-1", "com-7-2", "com-7-4"],
  },

  BS_ACCUM_DEPREC: {
    key: "BS_ACCUM_DEPREC",
    title: "감가상각누계액",
    categoryLabel: "대차대조표(BS) · 비유동자산 > 유형자산 차감계정 (제11조③·제38조④)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제11조③(차감계정 표시)·제38조④ 부합",
    appliedBasisSummary:
      "기말 현재 보유 중인 임대자산에 대하여 취득월로부터 대차대조표일(기말)까지 인식한 정액법 감가상각비의 누적 합계액입니다.",
    recognitionTiming: "매월 말 결산 감가상각 인식 시 누적 가산, 자산 폐기·처분 시 제거.",
    measurementPrinciple:
      "중소기업회계기준 제11조제3항('유형자산의 감가상각누계액은 유형자산 각 항목의 차감계정으로 대차대조표에 표시한다')에 따라 유형자산 취득가액 아래에 부(-)의 차감 형식으로 표시합니다.",
    erpFormulaOrLogic: "∑ 기말 보유 렌탈자산의 기준일 누적 상각액(computeAssetAccumDeprecAsOf)",
    articleIds: ["art-11", "art-38", "form-1"],
    commentaryIds: ["com-7-3", "com-4-3"],
  },

  BS_LIABILITIES: {
    key: "BS_LIABILITIES",
    title: "Ⅰ. 부채 (유동부채)",
    categoryLabel: "대차대조표(BS) · 부채 > 유동부채 (제6조⑤·제14조·제41조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제6조⑤·제14조·제41조① 부합",
    appliedBasisSummary:
      "회계연도 말부터 1년 이내에 상환·납부 등을 통하여 소멸할 것으로 예상되는 채무로서, 매입채무(미지급금), 원천세 예수금, 부가세 예수금, 미지급법인세로 구성됩니다.",
    recognitionTiming: "의무 발생일 인식, 대금 지급·납부 시 제거(제16조).",
    measurementPrinciple:
      "중소기업회계기준 제41조제1항에 따라 현재가치평가를 하지 않고 회사가 부담하는 명목 채무액으로 측정합니다.",
    erpFormulaOrLogic: "유동부채 = 매입채무(미지급금) + 원천세(예수금) + 부가세(예수금) + 법인세(미지급)",
    articleIds: ["art-6", "art-14", "art-16", "art-41"],
    commentaryIds: ["com-4-3", "com-11-1"],
  },

  BS_AP: {
    key: "BS_AP",
    title: "매입채무 (미지급금)",
    categoryLabel: "대차대조표(BS) · 유동부채 (제14조②·제16조·제41조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제14조②·제16조·제41조① 부합",
    appliedBasisSummary:
      "상품·자재 매입, 외주용역 및 일반 경비와 관련하여 수취한 매입 세금계산서 중 기말 현재 아직 지급되지 않은 외상매입금 및 미지급금 잔액입니다.",
    recognitionTiming: "매입 세금계산서 수취 시 인식, 통장 출금 매칭 시 제거(제16조).",
    measurementPrinciple: "제41조제1항 단서에 따라 현재가치 할인 없이 명목 미지급 채무액으로 측정합니다.",
    erpFormulaOrLogic: "∑ 매입 세금계산서(UNPAID/PARTIAL) 미지급 잔액(total_amount - settled_amount)",
    articleIds: ["art-14", "art-16", "art-41"],
    commentaryIds: ["com-4-3", "com-11-1"],
  },

  BS_WTH_PAYABLE: {
    key: "BS_WTH_PAYABLE",
    title: "원천세 (예수금)",
    categoryLabel: "대차대조표(BS) · 유동부채 > 예수금 (제14조②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제14조②(예수금) 부합",
    appliedBasisSummary:
      "당기 귀속 급여 등에서 원천징수하였으나 납부기한(익년 1월 10일 등)이 도래하지 않아 기말 현재 미납 상태인 원천세 예수금입니다.",
    recognitionTiming: "당기 귀속분 중 익년도 납부 확정 세액.",
    measurementPrinciple: "익년 초 실제 납부된 당기 귀속 원천세 명목금액.",
    erpFormulaOrLogic: "∑ 당기 귀속(attribution_year = year)이나 익년(pay_year > year)에 납부된 원천세액",
    articleIds: ["art-14", "art-17"],
    commentaryIds: ["com-4-3", "com-12-1"],
  },

  BS_VAT_PAYABLE: {
    key: "BS_VAT_PAYABLE",
    title: "부가세 (예수금 · 미지급부가세)",
    categoryLabel: "대차대조표(BS) · 유동부채 > 예수금 (제14조②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제14조②(예수금) 부합",
    appliedBasisSummary:
      "제2기(7월~12월) 부가가치세 과세기간의 매출세액에서 매입세액(세금계산서 + 카드공제분) 및 예정고지 기납부세액을 차감한 후 익년 1월 25일에 확정 납부해야 할 부가가치세 예수금 잔액입니다.",
    recognitionTiming: "기말 결산일(12월 31일) 기준 정산.",
    measurementPrinciple: "Max(0, 2기 매출세액 - 2기 매입세액 - 2기 카드공제매입세액 - 2기 예정고지납부세액).",
    erpFormulaOrLogic: "netQ2Vat > 0 인 경우의 미납 부가가치세 예수금",
    articleIds: ["art-14", "art-6"],
    commentaryIds: ["com-4-3"],
  },

  BS_CORP_TAX_PAYABLE: {
    key: "BS_CORP_TAX_PAYABLE",
    title: "법인세 (미지급법인세)",
    categoryLabel: "대차대조표(BS) · 유동부채 > 미지급법인세 (제14조②·제34조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제14조②(미지급법인세)·제34조 부합",
    appliedBasisSummary:
      "당기 귀속 과세소득에 대하여 산출된 법인세비용 중 기말 현재 아직 납부되지 않고 익년 3월·4월에 확정 신고·납부되는 미지급법인세(유동부채)입니다.",
    recognitionTiming: "당기 귀속 법인세 확정 시점(기말 결산일).",
    measurementPrinciple: "당기 귀속 법인세 중 익년도에 납부된 세액.",
    erpFormulaOrLogic: "∑ 당기 귀속(attribution_year = year)이나 익년(pay_year > year)에 납부된 법인세·법인지방소득세",
    articleIds: ["art-14", "art-34", "form-1"],
    commentaryIds: ["com-4-3", "com-4-4"],
  },

  BS_EQUITY: {
    key: "BS_EQUITY",
    title: "Ⅱ. 자본 (자본금 · 이익잉여금)",
    categoryLabel: "대차대조표(BS) · 자본 (제6조③·⑤, 제19조~제22조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제6조·제19조~제22조·제52조~제53조 부합",
    appliedBasisSummary:
      "회사의 자산 총액에서 부채 총액을 차감한 순자산(주주의 잔여청구권)으로서, 납입자본금과 누적 이익잉여금(전기이월이익잉여금 + 당기순이익)으로 구성됩니다.",
    recognitionTiming: "자본 거래 및 손익 결산 시점.",
    measurementPrinciple:
      "중소기업회계기준은 '기타포괄손익누계액' 대분류를 두지 않으므로(해설서 제4장 [3]), 자본금과 이익잉여금의 합계가 곧 자본총계를 형성합니다.",
    erpFormulaOrLogic: "자본총계 = 자본금 + 전기이월이익잉여금 + 당기순이익",
    articleIds: ["art-6", "art-19", "art-22", "art-52", "art-53"],
    commentaryIds: ["com-4-3", "com-4-5", "com-4-6", "com-15-1"],
  },

  BS_CAPITAL_STOCK: {
    key: "BS_CAPITAL_STOCK",
    title: "자본금 (보통주자본금)",
    categoryLabel: "대차대조표(BS) · 자본 > 자본금 (제19조·제45조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제19조·제45조·상법 제451조 부합",
    appliedBasisSummary:
      "상법 제451조 및 법인 등기부등본에 등기된 발행주식의 액면총액(주식회사 드래곤알피에이 보통주 자본금 5,000,000원)입니다.",
    recognitionTiming: "법인 설립 등기 및 주금납입 시점(2024년 7월).",
    measurementPrinciple: "발행주식수 × 1주당 액면가액 = ₩5,000,000.",
    erpFormulaOrLogic: "BUSINESS_ENTITIES.CORP.capitalStock (₩5,000,000)",
    articleIds: ["art-19", "art-45"],
    commentaryIds: ["com-15-1", "com-4-3"],
  },

  BS_RETAINED_EARNINGS: {
    key: "BS_RETAINED_EARNINGS",
    title: "전기이월이익잉여금 (미처분이익잉여금)",
    categoryLabel: "대차대조표(BS) · 자본 > 이익잉여금 (제22조·제53조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제22조·제53조 부합",
    appliedBasisSummary:
      "설립(개업) 이후부터 직전 회계연도 말까지 누적된 손익계산서상 당기순이익에서 배당 등으로 처분된 금액을 차감한 차기이월 미처분이익잉여금입니다.",
    recognitionTiming: "직전 회계연도 말 결산 확정 시점.",
    measurementPrinciple:
      "전기 말 누적 미처분이익잉여금과 당기 기초 전기이월이익잉여금이 100% 연속성을 유지하도록 개업일부터 직전 연도 말까지의 누적 순이익으로 정밀 산출합니다.",
    erpFormulaOrLogic: "직전 연도 말까지 누적(매출 - 매출원가 - 인건비 - 판관비 - 손익차감세액)",
    articleIds: ["art-22", "art-53", "art-54"],
    commentaryIds: ["com-4-3", "com-4-6"],
  },
};
