import {
  STANDARD_ARTICLES,
  COMMENTARY_SECTIONS,
  StandardArticle,
  CommentarySection,
} from "./accountingStandardsData";

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
  // ==================== 1. 계정대분류 (MAJOR ACCOUNTS) ====================
  REVENUE: {
    key: "REVENUE",
    title: "Ⅰ. 매출액 (수익)",
    categoryLabel: "손익계산서 · 영업수익 대분류",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제24조~제26조 부합",
    appliedBasisSummary:
      "회사의 주된 영업활동(자사 렌탈자산 임대, 전대렌탈, SI·개발, 운영·유지보수 용역, 상품·장비 판매)에서 발생한 총매출액에서 매출에누리·매출할인·매출환입(수정세금계산서 음수 발행분)을 차감한 순공급가액으로 인식합니다.",
    recognitionTiming:
      "재화의 인도 또는 용역 제공이 완료되어 대가를 받을 권리가 확정된 시점(전자세금계산서 작성일자·공급시기 기준 발생주의). 1년 내 완료되는 단기용역은 제24조제2항 단서에 따라 용역 완료 시점에 수익을 인식합니다.",
    measurementPrinciple:
      "받았거나 받을 대가의 명목금액(공급가액 기준 시 부가가치세 예수금 제외). 중요성 원칙(제5조제2항)에 따라 렌탈업 및 IT용역업의 특성을 반영하여 7개 매출 세목으로 세분화하여 표시합니다.",
    erpFormulaOrLogic:
      "∑ 매출 세금계산서(io_type='SALE', 정상 + 수정음수) 공급가액 + 세금계산서 외 매출채권 수납액",
    taxLawHarmonization:
      "부가가치세법상 공급시기 및 법인세법 제40조(손익의 귀속사업연도) 인도기준·단기용역 완료기준과 100% 일치하여 별도 세무조정이 발생하지 않습니다.",
    articleIds: ["art-23", "art-24", "art-25", "art-26", "art-49", "art-5"],
    commentaryIds: ["com-4-4", "com-14-1", "com-14-2", "com-14-3", "com-16-1"],
  },

  COGS: {
    key: "COGS",
    title: "Ⅱ. 매입·원가 (매출원가)",
    categoryLabel: "손익계산서 · 매출원가 대분류",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제23조·제27조·제38조 부합",
    appliedBasisSummary:
      "상품·장비 판매, 렌탈 임대 및 외주용역 매출에 직접 대응하여 발생한 매입원가, 전대임차료, 외주용역원가 및 임대자산의 당기 정액법 감가상각비를 수익·비용 대응의 원칙(제23조제3항제2호)에 따라 매출원가로 인식합니다.",
    recognitionTiming:
      "매입세금계산서 수취 시점(발생주의), 무증빙·카드 현장자재 결제 시점, 그리고 임대용 유형·무형자산의 경우 사용가능 시점부터 내용연수에 걸친 매월 말 정액법 월할 상각 시점.",
    measurementPrinciple:
      "매입가액에 취득부대원가를 가산하고 매입에누리·매입할인·매입환출(카드취소·쿠팡환불 등)을 차감한 금액. 단, 1년을 초과하여 임대 목적으로 보유하는 장비(TV, 프로젝터, RAM, SSD, 라이선스) 매입액은 즉시 비용(COGS)에서 제외하고 자산으로 계상 후 감가상각비로만 원가 반영합니다(제11조제1항, 제38조).",
    erpFormulaOrLogic:
      "∑ 일반원가 매입세금계산서(자산화 제외분) + 무증빙·카드 상품자재 순매입액 + ∑ 임대자산 월할 정액법 감가상각비 + 자산 파손·폐기 미상각잔액 손실",
    taxLawHarmonization:
      "법인세법 제23조(감가상각비의 손금불산입) 및 시행규칙 별표5·6의 내용연수·정액법(잔존가치 0원)을 준용하여 회계상 감가상각비와 세법상 상각범위액을 일치시켰습니다(제38조제6항·제7항).",
    articleIds: ["art-23", "art-27", "art-11", "art-12", "art-37", "art-38"],
    commentaryIds: ["com-4-4", "com-6-2", "com-6-5", "com-7-1", "com-7-3", "com-8-3"],
  },

  PAYROLL: {
    key: "PAYROLL",
    title: "Ⅲ. 급여·인건비 (급여·퇴직·4대보험)",
    categoryLabel: "손익계산서 · 판매비와관리비(종업원급여) 대분류",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제17조·제29조 부합",
    appliedBasisSummary:
      "종업원이 제공한 근무용역에 대한 대가인 임직원 급여·상여·제수당, 일용직 급여, 확정기여형(DC형) 퇴직연금 부담금 및 퇴직금 정산액, 그리고 회사가 부담하는 4대 사회보험료 기관납부액을 통합 관리합니다.",
    recognitionTiming:
      "근무용역이 제공되어 급여 및 부담금 지급 의무가 발생한 회계기간에 인식(제17조제1항·제4항). 기말 미지급분은 유동부채(미지급비용/원천세예수금)로 계상합니다.",
    measurementPrinciple:
      "중소기업회계기준 별지 제2호 서식상 판매비와관리비 내 급여·퇴직급여·복리후생비(법정복리비)에 해당하나, 제5조제2항(중요성 구분 표시)에 따라 경영의사결정 편의를 위해 인건비 그룹(Ⅲ)을 독립 집계하고 영업이익 산출 시 매출총이익에서 차감합니다.",
    erpFormulaOrLogic:
      "∑ 임직원급여·수당 + ∑ 퇴직급여·정산(푸른씨앗 DC형 부담금 포함) + ∑ 일용직급여 + ∑ 4대보험료(국민연금·건강·고용·산재 기관납부액)",
    taxLawHarmonization:
      "근로복지공단 중소기업퇴직연금기금(푸른씨앗, 확정기여형 DC) 부담금은 중소기업회계기준 제17조제4항 및 법인세법 시행령 제44조의2에 따라 납부 회계연도에 전액 퇴직급여 비용(손금)으로 인정됩니다.",
    articleIds: ["art-17", "art-29", "art-5"],
    commentaryIds: ["com-12-1", "com-12-3", "com-4-4"],
  },

  OPEX: {
    key: "OPEX",
    title: "Ⅳ. 판매비와관리비 (운영비용)",
    categoryLabel: "손익계산서 · 판매비와관리비 대분류",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제29조·별지 제2호 부합",
    appliedBasisSummary:
      "상품·용역의 판매활동과 회사의 일반 관리활동에서 발생하는 모든 영업비용(인건비 외 복리후생비, 임차료·관리비, 통신비, 차량유지비, 지급수수료, 수도광열비, 소모품비 등)을 집계합니다.",
    recognitionTiming:
      "용역을 제공받거나 자원을 사용하여 비용이 발생한 회계연도에 인식(제23조제3항제1호, 제29조제1항). 운용리스(사무실·차량 임차)는 제49조제3항에 따라 리스기간에 걸쳐 균등하게 비용으로 인식합니다.",
    measurementPrinciple:
      "공급가액 기준 선택 시 매입세금계산서 및 공제대상 카드/전자상거래 결제분의 부가가치세(매입세액 = 결제액 ÷ 11)를 부가세대급금으로 분리하고 순공급가액만 판관비로 측정합니다.",
    erpFormulaOrLogic:
      "∑ 판관비 매입세금계산서 공급가액 + ∑ 통장/체크카드/BC카드 판관비 지출액(공급가액 환산분) - 카드취소·환급액",
    taxLawHarmonization:
      "적격증빙(전자세금계산서, 신용·체크카드매출전표) 기반 지출로 법인세법 제116조 지출증명서류 수취 의무를 충족합니다.",
    articleIds: ["art-29", "art-23", "art-49"],
    commentaryIds: ["com-4-4", "com-16-1"],
  },

  TAX_DUES: {
    key: "TAX_DUES",
    title: "Ⅴ. 세금과공과 (원천세·부가세·법인세·납부항목)",
    categoryLabel: "손익계산서 · 법인세비용(제34조) 및 세금과공과(제29조) / 대차대조표 · 예수금 정산",
    complianceStatus: "특례적용",
    complianceBadge: "중소기업회계기준 제34조(이연법인세 면제)·제29조·제14조 부합",
    appliedBasisSummary:
      "국세청(홈택스) 및 지방자치단체에 신고·납부하는 4대 세무 항목(원천세, 부가가치세, 법인세, 주민세 사업소분 등 납부항목)을 귀속연도 기준으로 통합 관리하며, 항목별 회계적 성격에 따라 손익 차감 여부와 재무상태표 계정을 정밀 분리합니다.",
    recognitionTiming:
      "귀속연도(attribution_year) 발생주의 기준. 예: 2024년 귀속이나 2025년 1~3월에 확정 납부된 원천세·법인세는 2024년 결산월(12월) 비용 및 기말 미지급금(유동부채)으로 귀속 인식합니다.",
    measurementPrinciple:
      "• 법인세(제34조): 이연법인세를 인식하지 않고 법인세법상 당기 부담 세액을 법인세비용으로 인식(단, 8월 중간예납은 '선급법인세' 자산이므로 당기 비용 차감에서 제외).\n• 부가세(제14조·제7조): 공급가액(K-GAAP) 기준에서는 손익 비용이 아닌 부가세예수금·부가세대급금의 정산이므로 당기순이익 차감에서 제외.\n• 원천세: 통장 실지급액 기준으로 집계된 급여에서 차감되었던 근로·퇴직소득세 원천징수분이므로 손익에 합산하여 세전 총인건비를 완성.\n• 납부항목: 주민세 사업소분, 등록면허세 등 법정 공과금으로 제29조제2항 '세금과공과' 비용 인식.",
    erpFormulaOrLogic:
      "공급가액 기준 PL 차감세액 = 원천세 + 확정법인세(중간예납 제외) + 납부항목(세금과공과)  ※ 부가세 및 중간예납 법인세는 BS 자산·부채로만 반영",
    taxLawHarmonization:
      "중소기업회계기준 제34조의 핵심 특례인 '이연법인세 회계처리 면제(법인세법 납부할 세액 = 법인세비용)'를 100% 적용하여 세무조정을 최소화하였습니다.",
    articleIds: ["art-34", "art-29", "art-14", "art-7"],
    commentaryIds: ["com-4-4", "com-4-3"],
  },

  NON_OP: {
    key: "NON_OP",
    title: "Ⅵ. 영업외·자금이동 (가수금·대표자이체·기타)",
    categoryLabel: "영업외수익(제31조) · 투자/재무 자금이동(제6조⑧·제11조·제13조·제19조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제31조·제24조③·제6조⑧·제11조 부합",
    appliedBasisSummary:
      "주된 영업활동 외에서 발생한 영업외수익(이자수익, 세금환급·과오납환입)과, 손익계산서 비용이 아닌 재무상태표 자산·부채·자본 변동 거래(임대자산 자산화 취득, 임차보증금 지급, 자본금 납입, 가수금 입금·반제, 개인사업자 대표자 입출금)를 영업손익과 왜곡 없이 분리하여 관리합니다.",
    recognitionTiming:
      "이자수익은 제24조제3항 단서(법인세법 원천징수 이자 귀속시기 특례)에 따라 실제로 현금을 수취한 결산이자 입금일에 인식하며, 자본·차입·자산취득 자금이동은 실제 통장 거래일 또는 세금계산서 발행일에 인식합니다.",
    measurementPrinciple:
      "자본금 납입(제19조), 가수금 입금·반환(제6조제8항), 임차보증금 지급(제13조제2항), 임대자산 자산화 취득(제11조·제38조)은 대차대조표(BS) 및 현금흐름표(CF 투자·재무활동) 항목이므로 영업이익을 훼손하지 않도록 분리 표시합니다.",
    erpFormulaOrLogic:
      "영업외수익(이자수익 + 세금환급) + 투자자금이동(임대자산취득 자산화 + 임차보증금) + 재무자금이동(자본금납입 + 가수금입금·반환 + 대표자입출금)",
    taxLawHarmonization:
      "중소기업회계기준 제6조제8항('가지급금이나 가수금 등은 그 내용을 나타내는 적절한 항목으로 표시한다')에 따라 대표자 단기차입·반제 내역을 투명하게 추적 관리합니다.",
    articleIds: ["art-31", "art-24", "art-6", "art-11", "art-13", "art-19"],
    commentaryIds: ["com-4-4", "com-14-3", "com-4-3", "com-7-2", "com-15-1"],
  },

  // ==================== 2. 손익 요약행 (PL SUMMARY ROWS) ====================
  SUMMARY_GROSS_PROFIT: {
    key: "SUMMARY_GROSS_PROFIT",
    title: "★ 매출총이익 (Ⅰ - Ⅱ)",
    categoryLabel: "손익계산서 · 단계별 손익 요약 (제28조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제23조③·제28조 부합",
    appliedBasisSummary:
      "매출액(Ⅰ)에서 매출원가(Ⅱ)를 차감하여 산출하는 1차 영업 마진 지표입니다. 중소기업회계기준 제23조제3항제4호 단서에 따르면 제조·판매·건설업 외의 업종은 매출총이익 구분 표시를 생략할 수 있으나, 당사는 렌탈·상품판매·용역 원가율의 정밀 관리를 위해 정식 구분 표시합니다.",
    recognitionTiming: "당기 매출액 및 대응 매출원가 인식 시점에 실시간 연동 산출.",
    measurementPrinciple: "매출총이익 = Ⅰ. 매출액 - Ⅱ. 매출원가 (매출총이익률 = 매출총이익 ÷ 매출액 × 100)",
    erpFormulaOrLogic: "grossProfit = revenue - cogs",
    articleIds: ["art-23", "art-28", "form-1"],
    commentaryIds: ["com-4-4"],
  },

  SUMMARY_OPERATING_PROFIT: {
    key: "SUMMARY_OPERATING_PROFIT",
    title: "★★ 영업이익 (매출총이익 - Ⅲ - Ⅳ)",
    categoryLabel: "손익계산서 · 단계별 손익 요약 (제30조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제23조③·제30조 부합",
    appliedBasisSummary:
      "회사의 주된 영업활동에서 창출된 핵심 경영성과 지표로서, 매출총이익에서 판매비와관리비(Ⅲ. 급여·인건비 + Ⅳ. 운영비용)를 모두 차감하여 산출합니다.",
    recognitionTiming: "당기 매출총이익 및 판관비 인식 시점에 실시간 연동 산출.",
    measurementPrinciple: "영업이익 = 매출총이익 - (Ⅲ. 급여·인건비 + Ⅳ. 판매비와관리비)",
    erpFormulaOrLogic: "operatingProfit = grossProfit - payroll - opex",
    articleIds: ["art-23", "art-29", "art-30", "form-1"],
    commentaryIds: ["com-4-4"],
  },

  SUMMARY_NET_INCOME: {
    key: "SUMMARY_NET_INCOME",
    title: "★★★ 당기순이익 (Net Income)",
    categoryLabel: "손익계산서 · 최종 경영성과 요약 (제33조~제35조) / 대차대조표 · 이익잉여금 연동 (제22조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제33조~제35조·제22조 부합",
    appliedBasisSummary:
      "일정 회계기간 동안의 최종 경영성과로서, 영업이익에서 당기 손익 차감 대상 세무비용(원천세분 인건비, 세금과공과 납부항목, 당기 귀속 법인세비용)을 차감하여 산출하며, 대차대조표 자본의 '당기순이익(미처분이익잉여금)'으로 1원 오차 없이 직결됩니다.",
    recognitionTiming: "회계기간 중 발생주의 손익 및 귀속 세무비용 확정 시점.",
    measurementPrinciple:
      "공급가액 기준 시 부가가치세(예수금·대급금 정산)와 8월 법인세 중간예납(선급법인세 자산)은 비용이 아니므로 당기순이익 차감에서 제외합니다(제34조).",
    erpFormulaOrLogic:
      "netIncome = operatingProfit - (withholdingTax + deductibleCorporateTax + taxPayment)",
    articleIds: ["art-33", "art-34", "art-35", "art-22", "form-1"],
    commentaryIds: ["com-4-4", "com-4-6"],
  },

  // ==================== 3. 매출액 세목 (REVENUE SUB-ACCOUNTS) ====================
  "운영·유지보수 용역매출": {
    key: "운영·유지보수 용역매출",
    title: "운영·유지보수 용역매출",
    categoryLabel: "Ⅰ. 매출액 · 용역매출 (제24조②·제26조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제24조②·제26조 부합",
    appliedBasisSummary:
      "IT 시스템 운영, 유지보수, 기술지원 등 계약기간 동안 제공하는 용역 매출입니다.",
    recognitionTiming:
      "용역이 제공되어 대가를 받을 권리가 확정된 시점(월별·분기별 검수 완료 및 세금계산서 발행 시점, 1년 내 완료 용역은 제24조제2항 단서 완성기준 적용).",
    measurementPrinciple: "수취할 대가의 공급가액(수정세금계산서 감액분은 매출에누리·환입으로 차감).",
    erpFormulaOrLogic: "domain_type='OP_SERVICE' 매출 세금계산서 + 세금계산서 외 용역매출 수납액",
    articleIds: ["art-24", "art-25", "art-26"],
    commentaryIds: ["com-14-1", "com-14-2"],
  },

  "상품·장비 판매매출": {
    key: "상품·장비 판매매출",
    title: "상품·장비 판매매출",
    categoryLabel: "Ⅰ. 매출액 · 상품매출 (제24조①·제26조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제24조①·제26조 부합",
    appliedBasisSummary:
      "전산장비, 하드웨어, 주변기기 등 재화를 고객에게 인도·판매하여 발생하는 상품매출입니다.",
    recognitionTiming:
      "재화를 인도하여 소유에 따른 위험과 보상이 고객에게 이전되고 대가를 받을 권리를 갖게 된 시점(제24조제1항).",
    measurementPrinciple: "판매 대가의 공급가액에서 매출에누리·매출할인·매출환입을 차감한 금액(제25조, 제26조).",
    erpFormulaOrLogic: "domain_type='TRADE_SALE' 매출 세금계산서 공급가액 합계",
    articleIds: ["art-24", "art-25", "art-26"],
    commentaryIds: ["com-14-1", "com-4-4"],
  },

  "자사 렌탈자산 임대매출": {
    key: "자사 렌탈자산 임대매출",
    title: "자사 렌탈자산 임대매출",
    categoryLabel: "Ⅰ. 매출액 · 렌탈(운용리스) 임대수익 (제24조·제26조·제49조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제24조·제26조·제49조 부합",
    appliedBasisSummary:
      "당사가 유형·무형자산(제11조·제12조)으로 보유 중인 자사 렌탈자산(TV-001~006, PRJ-001, RAM-001~003, SSD-001~002, SW-001 등 98대)을 고객에게 대여(운용리스 제공)하고 수취하는 주된 영업 임대수익입니다.",
    recognitionTiming:
      "임대(렌탈) 기간에 걸쳐 발생주의에 따라 수익을 인식하며, 동일 세금계산서 내 모델별 귀속 매출액을 정밀 안분하여 월별 유형자산 감가상각 명세표의 '당월 자사 렌탈자산 임대매출'과 1:1로 연동합니다.",
    measurementPrinciple:
      "렌탈 계약에 따른 공급가액으로 측정하며, 매출원가의 '임대자산 감가상각비'와 직접 수익·비용 대응(제23조제3항제2호)을 이룹니다.",
    erpFormulaOrLogic:
      "domain_type='RENTAL' 중 자사 보유 렌탈자산 모델(OWNED_ASSET_RENTAL)에 귀속되는 매출 공급가액",
    articleIds: ["art-24", "art-26", "art-49", "art-11", "art-23"],
    commentaryIds: ["com-14-3", "com-16-1", "com-7-1"],
  },

  "전대·외부임차 임대매출": {
    key: "전대·외부임차 임대매출",
    title: "전대·외부임차 임대매출",
    categoryLabel: "Ⅰ. 매출액 · 전대리스(Sub-lease) 영업수익 (제24조·제26조·제49조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제23조③(총액표시)·제24조·제49조 부합",
    appliedBasisSummary:
      "자사 보유 자산 외에 외부 렌탈사(현대렌탈서비스, 에이브이랜드 등)로부터 임차한 장비를 고객에게 전대(Sub-lease)하여 발생하는 렌탈 매출입니다.",
    recognitionTiming: "전대 렌탈 기간에 걸쳐 용역·자산 사용 제공 시점에 인식.",
    measurementPrinciple:
      "당사가 고객에 대해 주된 계약 이행 책임을 부담하므로 제23조제3항제3호(총액표시 원칙)에 따라 전대 매출액은 매출액으로, 외부 렌탈사에 지급하는 임차료는 매출원가('외주용역·전대임차원가')로 각각 총액 계상합니다.",
    erpFormulaOrLogic: "domain_type='RENTAL' 중 SUBLEASE_RENTAL 분류 매출 세금계산서 공급가액",
    articleIds: ["art-23", "art-24", "art-26", "art-49"],
    commentaryIds: ["com-14-3", "com-16-1", "com-4-4"],
  },

  "렌탈 단기용역·작업비 매출": {
    key: "렌탈 단기용역·작업비 매출",
    title: "렌탈 단기용역·작업비 매출",
    categoryLabel: "Ⅰ. 매출액 · 렌탈 부대 용역수익 (제24조②·제26조)",
    complianceStatus: "특례적용",
    complianceBadge: "중소기업회계기준 제24조② 단서(단기용역 완성기준) 부합",
    appliedBasisSummary:
      "렌탈 장비의 현장 설치, 철거, 운송, 행사 기술지원, 단기 세팅 작업 등 1년 이내에 완료되는 단기 용역 매출입니다.",
    recognitionTiming:
      "중소기업회계기준 제24조제2항 단서('1년 내에 완료되는 용역은 용역 제공을 완료한 날에 수익을 인식할 수 있다')에 따라 현장 작업 및 검수가 완료된 시점에 수익을 인식합니다.",
    measurementPrinciple: "작업 완료 대가의 공급가액.",
    erpFormulaOrLogic: "domain_type='RENTAL' 중 RENTAL_OP_SERVICE 분류 매출 세금계산서 공급가액",
    articleIds: ["art-24", "art-25", "art-26"],
    commentaryIds: ["com-14-2", "com-14-1"],
  },

  "렌탈 부대 상품·장비 판매매출": {
    key: "렌탈 부대 상품·장비 판매매출",
    title: "렌탈 부대 상품·장비 판매매출",
    categoryLabel: "Ⅰ. 매출액 · 렌탈 연계 상품매출 (제24조①·제26조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제24조①·제26조 부합",
    appliedBasisSummary:
      "렌탈 계약에 부수하여 고객에게 소모품, 케이블, 주변기기 또는 중고 장비를 판매하여 발생하는 매출입니다.",
    recognitionTiming: "해당 부대 상품·장비를 고객에게 인도한 시점(제24조제1항).",
    measurementPrinciple: "인도한 재화의 공급가액.",
    erpFormulaOrLogic: "domain_type='RENTAL' 중 RENTAL_GOODS_SALE 분류 매출 세금계산서 공급가액",
    articleIds: ["art-24", "art-25", "art-26"],
    commentaryIds: ["com-14-1"],
  },

  "SI·개발 용역매출": {
    key: "SI·개발 용역매출",
    title: "SI·개발 용역매출",
    categoryLabel: "Ⅰ. 매출액 · 소프트웨어 개발·구축 용역매출 (제24조②·제26조)",
    complianceStatus: "특례적용",
    complianceBadge: "중소기업회계기준 제24조②(진행기준 및 1년내 완성기준 특례) 부합",
    appliedBasisSummary:
      "RPA 자동화 솔루션 구축, 맞춤형 SI 시스템 개발, 웹·전산 개발 용역에서 발생하는 매출입니다.",
    recognitionTiming:
      "진행률에 따라 인식하되, 계약기간이 1년 이내인 단기 개발 용역은 제24조제2항 단서 및 법인세법 시행령 제69조에 따라 개발 검수 완료(세금계산서 발행) 시점에 수익을 인식합니다.",
    measurementPrinciple: "용역 계약 공급가액.",
    erpFormulaOrLogic: "domain_type='DEV_SERVICE' 매출 세금계산서 공급가액 합계",
    articleIds: ["art-24", "art-25", "art-26"],
    commentaryIds: ["com-14-2", "com-4-4"],
  },

  // ==================== 4. 매입·원가 세목 (COGS SUB-ACCOUNTS) ====================
  "관계사 매입·용역원가": {
    key: "관계사 매입·용역원가",
    title: "관계사 매입·용역원가",
    categoryLabel: "Ⅱ. 매출원가 · 특수관계인 거래 원가 (제27조·제56조제6호)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제27조·제56조제6호 부합",
    appliedBasisSummary:
      "법인 전환 및 사업 운영 과정에서 개인사업자(드래곤알피에이)와 법인사업자((주)드래곤알피에이) 간 적격 세금계산서에 의해 거래된 용역·장비 매입원가입니다.",
    recognitionTiming: "용역 제공 및 재화 인도 시점(세금계산서 발행일 기준).",
    measurementPrinciple:
      "실제 거래된 공급가액으로 측정하며, 중소기업회계기준 제56조제6호(특수관계인과의 중요한 거래 내용 주석 기재) 관리를 위해 일반 외주원가와 별도 세목으로 분리하여 투명하게 표시합니다.",
    erpFormulaOrLogic: "거래처명이 '드래곤알피에이'인 매입 세금계산서 공급가액",
    articleIds: ["art-27", "art-56", "art-23"],
    commentaryIds: ["com-4-4", "com-4-7"],
  },

  "외주용역·전대임차원가": {
    key: "외주용역·전대임차원가",
    title: "외주용역·전대임차원가",
    categoryLabel: "Ⅱ. 매출원가 · 용역·전대 직접원가 (제27조①·제49조③)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제23조③·제27조①·제49조③ 부합",
    appliedBasisSummary:
      "전대렌탈 매출 및 프로젝트 수행을 위해 외부 렌탈업체(현대렌탈서비스, 탑렌탈, AJ네트웍스 등)에 지급하는 장비 임차료(운용리스료)와 외부 기술용역비입니다.",
    recognitionTiming: "임차 기간 및 외주용역 제공 기간에 걸쳐 발생주의 인식(제49조제3항).",
    measurementPrinciple:
      "임대자산 자산화 대상(CAPEX)을 제외한 순수 전대임차·외주 매입세금계산서 공급가액 및 통장 외주비 집행액.",
    erpFormulaOrLogic: "외부 렌탈·외주 거래처 매입 세금계산서(자산화분 제외) + 통장 외주용역 출금액",
    articleIds: ["art-27", "art-49", "art-23"],
    commentaryIds: ["com-4-4", "com-16-1", "com-6-5"],
  },

  "상품·장비·자재매입원가": {
    key: "상품·장비·자재매입원가",
    title: "상품·장비·자재매입원가",
    categoryLabel: "Ⅱ. 매출원가 · 상품·원재료 매입원가 (제27조·제37조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제27조·제37조①·② 부합",
    appliedBasisSummary:
      "고객 판매용 상품·장비 및 현장 작업 투입용 자재의 세금계산서 매입원가입니다.",
    recognitionTiming: "재화 인수 및 매입세금계산서 수취 시점.",
    measurementPrinciple:
      "제37조제1항·제2항에 따라 매입가액에 취득부대원가를 가산하고 매입에누리·할인·환출을 차감한 금액으로 측정합니다. 단, 당사가 1년 초과 임대 목적으로 보유하는 렌탈자산 취득분(삼원아이엔지 65인치 TV, 키타드에스이 55인치 TV, 엠디케이팩토리 RAM/SSD 자산화분 등)은 본 계정에서 자동 차감하여 유형·무형자산으로 자산화합니다.",
    erpFormulaOrLogic: "일반 상품·자재 매입 세금계산서 공급가액 - 임대자산 자산화(CAPEX) 분리 금액",
    articleIds: ["art-27", "art-37", "art-9"],
    commentaryIds: ["com-6-1", "com-6-2", "com-6-5"],
  },

  "임대자산 감가상각비": {
    key: "임대자산 감가상각비",
    title: "임대자산 감가상각비",
    categoryLabel: "Ⅱ. 매출원가 · 렌탈자산 감가상각비 및 폐기손실 (제11조·제12조·제27조·제38조)",
    complianceStatus: "특례적용",
    complianceBadge: "중소기업회계기준 제11조·제12조·제38조⑥~⑧(법인세법 정액법) 부합",
    appliedBasisSummary:
      "당사가 보유한 임대용 유형·무형자산 98대(13개 모델: 55~75인치 스마트TV, 프로젝터, DDR5 RAM, NVMe SSD, 한컴 오피스 라이선스)의 취득원가를 내용연수(1~4년) 동안 정액법(잔존가치 0원)으로 월할 배분한 감가상각비 및 파손·폐기 시 미상각 잔여장부가액 비용입니다.",
    recognitionTiming:
      "자산 취득월(사용가능 시점)부터 내용연수 종료월(또는 중도 파손·폐기월)까지 매월 말일 기준으로 자동 계상합니다(제38조제5항).",
    measurementPrinciple:
      "• 월 감가상각비 = (취득원가 - 잔존가치 0원) ÷ 내용월수(12개월~48개월), 최종월 단수조정으로 취득원가 100% 상각 보장.\n• 렌탈업을 주된 영업으로 영위하므로 임대자산 감가상각비는 판관비가 아닌 '매출원가(렌탈원가)'로 분류하여 '자사 렌탈자산 임대매출'과 수익·비용 대응(제23조제3항제2호)을 이룹니다.",
    erpFormulaOrLogic:
      "∑ 모델별 당월 정액법 감가상각비(computeAssetMonthlyDeprecForYm) + ∑ 당월 파손·폐기 자산 미상각 장부잔액(computeAssetDisposalLossForYm)",
    taxLawHarmonization:
      "중소기업회계기준 제38조제6항·제7항 단서에 따라 법인세법 제23조의 잔존가치(0원) 및 내용연수를 적용하여 세무조정이 불필요합니다.",
    articleIds: ["art-11", "art-12", "art-27", "art-38", "art-55"],
    commentaryIds: ["com-7-1", "com-7-2", "com-7-3", "com-7-4", "com-8-3"],
  },

  "무증빙·카드 상품자재매입": {
    key: "무증빙·카드 상품자재매입",
    title: "무증빙·카드 상품자재매입",
    categoryLabel: "Ⅱ. 매출원가 · 전자상거래·카드 상품/자재 매입 (제27조·제37조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제27조·제37조② 부합",
    appliedBasisSummary:
      "세금계산서 외 법인·개인 체크카드 및 전자상거래(컴퓨존, 옥션, G마켓, 11번가, 도매꾹 등)를 통해 매입한 전산부품·장비·자재 원가입니다.",
    recognitionTiming: "카드 결제일(출금일) 및 취소·환불 입금일 기준.",
    measurementPrinciple:
      "제37조제2항 후단('매입과 관련된 할인, 에누리 및 환출은 취득원가에서 차감한다')에 따라 카드취소·쿠팡/플랫폼 환불 입금액은 부(-)의 금액으로 본 계정에서 직접 차감합니다. 공급가액 기준 시 부가가치세(결제액 ÷ 11)는 부가세대급금으로 분리합니다.",
    erpFormulaOrLogic: "∑ 카드·온라인 자재 매입 출금액(공급가액) - ∑ 카드취소·매입환불 입금액(공급가액)",
    articleIds: ["art-27", "art-37"],
    commentaryIds: ["com-6-2", "com-6-5"],
  },

  // ==================== 5. 급여·인건비 세목 (PAYROLL SUB-ACCOUNTS) ====================
  "임직원급여·수당": {
    key: "임직원급여·수당",
    title: "임직원급여·수당",
    categoryLabel: "Ⅲ. 급여·인건비 · 종업원급여 (제17조①·제29조②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제17조①·제29조② 부합",
    appliedBasisSummary:
      "임원 및 정규·계약직 직원이 제공한 근무용역에 대한 급여, 상여금 및 제수당입니다.",
    recognitionTiming:
      "종업원이 근무용역을 제공한 회계연도에 인식하며, 정산 환입액이 발생한 경우 급여에서 차감합니다(제17조제1항).",
    measurementPrinciple:
      "통장 급여 집행액(실지급액)에 원천징수 세액(Ⅴ. 세금과공과의 원천세) 및 4대보험료를 결합하여 총 인건비 보존 법칙을 충족합니다.",
    erpFormulaOrLogic: "∑ 급여(PAYROLL) 매칭 출금액 - 급여 정산환입 입금액",
    articleIds: ["art-17", "art-29"],
    commentaryIds: ["com-12-1", "com-4-4"],
  },

  "퇴직급여·정산": {
    key: "퇴직급여·정산",
    title: "퇴직급여·정산",
    categoryLabel: "Ⅲ. 급여·인건비 · 확정기여형(DC형) 퇴직연금 및 퇴직급여 (제17조②~④·제29조②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제17조④(확정기여형 퇴직연금)·제29조② 부합",
    appliedBasisSummary:
      "근로복지공단 중소기업퇴직연금기금('푸른씨앗', 확정기여형 DC)에 납부하는 회사 부담금 및 퇴직자 발생 시 지급하는 퇴직금 정산액입니다.",
    recognitionTiming:
      "중소기업회계기준 제17조제4항('확정기여형퇴직연금제도의 경우 해당 회계연도에 대해 회사에서 납부해야 하는 부담금(기여금)을 퇴직급여로 인식한다')에 따라 납부 의무가 발생한 회계연도에 즉시 비용으로 인식합니다.",
    measurementPrinciple:
      "확정기여형(DC형) 제도를 운용하므로 별도의 퇴직급여충당부채(비유동부채)나 보험수리적 현재가치 평가를 수행하지 않고 당기 납부 부담금 전액을 퇴직급여 비용으로 계상합니다.",
    erpFormulaOrLogic: "∑ 푸른씨앗(중소기업퇴직연금기금) 납입액 + ∑ 퇴직정산 지급액",
    taxLawHarmonization:
      "법인세법 시행령 제44조의2(확정기여형 퇴직연금 등 부담금의 손금산입)에 따라 납입액 전액이 당기 손금으로 인정됩니다.",
    articleIds: ["art-17", "art-29"],
    commentaryIds: ["com-12-3", "com-4-4"],
  },

  "일용직급여": {
    key: "일용직급여",
    title: "일용직급여",
    categoryLabel: "Ⅲ. 급여·인건비 · 단기·일용 노무비 (제17조①·제29조②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제17조①·제29조② 부합",
    appliedBasisSummary:
      "현장 장비 상하차, 설치 보조, 단기 행사 지원 등을 위해 고용한 일용근로자 및 단기 노무 제공자에게 지급한 급여입니다.",
    recognitionTiming: "일용 근무용역을 제공받고 급여를 지급한 시점.",
    measurementPrinciple: "실제 지급한 일용노무비 총액.",
    erpFormulaOrLogic: "∑ 일용직·단기노무비(WTH_PAYROLL_DAILY) 출금액",
    articleIds: ["art-17", "art-29"],
    commentaryIds: ["com-12-1"],
  },

  "4대보험료(기관납부)": {
    key: "4대보험료(기관납부)",
    title: "4대보험료(기관납부)",
    categoryLabel: "Ⅲ. 급여·인건비 · 법정복리후생비 및 사회보험 (제17조①·제29조②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제17조①·제29조② 부합",
    appliedBasisSummary:
      "국민건강보험공단, 국민연금공단, 근로복지공단에 매월 고지·납부하는 4대 사회보험료(건강보험, 장기요양보험, 국민연금, 고용보험, 산재보험) 기관납부액입니다.",
    recognitionTiming: "매월 보험료 고지 및 통장 자동이체·납부 시점.",
    measurementPrinciple:
      "통장 실수령액 기준으로 집계된 '임직원급여·수당'과 합산할 때 근로자 본인부담분(예수금 납부)과 회사부담분(법정복리후생비/보험료)이 누락 없이 전체 인건비에 반영되도록 측정합니다.",
    erpFormulaOrLogic: "∑ 국민연금·건강보험·고용보험·산재보험 공단 납부 출금액",
    articleIds: ["art-17", "art-29"],
    commentaryIds: ["com-12-1", "com-4-4"],
  },

  // ==================== 6. 판매비와관리비 세목 (OPEX SUB-ACCOUNTS) ====================
  "복리후생비(식대·다과·경조사)": {
    key: "복리후생비(식대·다과·경조사)",
    title: "복리후생비(식대·다과·경조사)",
    categoryLabel: "Ⅳ. 판매비와관리비 · 복리후생비 (제29조②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제29조②·별지 제2호 부합",
    appliedBasisSummary:
      "임직원의 작업능률 향상과 복리 증진을 위하여 지출하는 중식대·야근식대, 다과·음료비, 경조사비, 건강검진비 등입니다.",
    recognitionTiming: "복리후생 목적의 재화·용역을 제공받고 지출한 시점.",
    measurementPrinciple: "공급가액 기준 시 과세 음식점·가맹점 카드결제액에서 부가가치세(1/11)를 분리한 공급가액.",
    erpFormulaOrLogic: "∑ 복리후생비 지정 출금액(공급가액 환산분)",
    articleIds: ["art-29", "art-23"],
    commentaryIds: ["com-4-4"],
  },

  "임차료·관리비": {
    key: "임차료·관리비",
    title: "임차료·관리비",
    categoryLabel: "Ⅳ. 판매비와관리비 · 임차료 및 건물관리비 (제29조②·제49조③)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제29조②·제49조③(운용리스) 부합",
    appliedBasisSummary:
      "본사 사무실 및 사업장(미소지움 등) 사용에 따라 임대인(이명옥 등) 및 건물관리단에 지급하는 월 임차료와 건물관리비입니다.",
    recognitionTiming:
      "중소기업회계기준 제49조제3항('운용리스이용자는 최소리스료를 리스기간에 걸쳐 균등하게 배분하여 비용으로 인식한다') 및 매입세금계산서 발행일에 따라 인식합니다.",
    measurementPrinciple:
      "매입세금계산서 공급가액. 단, 임차보증금 지급액(2024-07-08 계약금 300만원, 2024-07-09 잔금 200만원 = 총 500만원)은 비용이 아닌 비유동자산('임차보증금', 제13조제2항)으로 분리 계상합니다.",
    erpFormulaOrLogic: "임대인·관리단 매입세금계산서 공급가액 + 관리비 이체액(임차보증금 제외)",
    articleIds: ["art-29", "art-49", "art-13"],
    commentaryIds: ["com-4-4", "com-16-1", "com-4-3"],
  },

  "임차료·관리비·공과금(이체)": {
    key: "임차료·관리비·공과금(이체)",
    title: "임차료·관리비·공과금(이체)",
    categoryLabel: "Ⅳ. 판매비와관리비 · 임차료 및 관리공과금 (제29조②·제49조③)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제29조②·제49조③ 부합",
    appliedBasisSummary:
      "세금계산서 발행분 외에 통장 계좌이체로 직접 납부된 사업장 관리비, 임차료 및 도시가스 등 공과금입니다.",
    recognitionTiming: "통장 이체 납부일 기준.",
    measurementPrinciple: "실제 지출된 관리비·공과금 금액(과세분 부가세 분리).",
    erpFormulaOrLogic: "∑ 미매칭 통장 출금 중 관리비·임차료·도시가스 이체액",
    articleIds: ["art-29", "art-49"],
    commentaryIds: ["com-4-4", "com-16-1"],
  },

  "통신비": {
    key: "통신비",
    title: "통신비",
    categoryLabel: "Ⅳ. 판매비와관리비 · 통신비 (제29조①·②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제29조①·② 부합",
    appliedBasisSummary:
      "업무용 유무선 전화요금, 인터넷 전용선 사용료(KT, SK브로드밴드, LG유플러스 등), 우편요금(우체국) 및 클라우드 메시징 통신 요금입니다.",
    recognitionTiming: "통신서비스 사용에 따른 청구세금계산서 발행일 또는 자동이체·카드 결제일.",
    measurementPrinciple: "공급가액(취소·환급 입금 시 차감).",
    erpFormulaOrLogic: "통신사 매입세금계산서 공급가액 + 통장 통신·우편 출금액 - 취소환급액",
    articleIds: ["art-29", "art-23"],
    commentaryIds: ["com-4-4"],
  },

  "차량유지·렌트비": {
    key: "차량유지·렌트비",
    title: "차량유지·렌트비",
    categoryLabel: "Ⅳ. 판매비와관리비 · 차량유지비 및 운용리스료 (제11조③·제29조·제49조③)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제11조③(수익적 지출)·제29조·제49조③ 부합",
    appliedBasisSummary:
      "업무용·현장배송용 차량의 유류비(주유소), 고속도로 통행료(하이패스), 주차비, 정기점검·수선비(수익적 지출, 제11조제3항) 및 단기·장기 렌터카 임차료(운용리스, 제49조제3항)입니다.",
    recognitionTiming: "유류 구입, 차량 정비 및 렌터카 사용 시점.",
    measurementPrinciple:
      "차량의 원상을 회복하거나 능률을 유지하기 위한 수선·유지 지출은 제11조제3항 및 제38조제3항에 따라 발생한 회계연도의 비용(수익적 지출)으로 즉시 인식합니다.",
    erpFormulaOrLogic: "차량·렌터카 매입세금계산서 공급가액 + 주유·주차·하이패스·정비 출금액",
    articleIds: ["art-11", "art-29", "art-38", "art-49"],
    commentaryIds: ["com-7-3", "com-16-1", "com-4-4"],
  },

  "세무·인증·수수료": {
    key: "세무·인증·수수료",
    title: "세무·인증·수수료",
    categoryLabel: "Ⅳ. 판매비와관리비 · 지급수수료 (제29조①·②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제29조①·② 부합",
    appliedBasisSummary:
      "세무기장 및 결산 조정 수수료, 법인등기·법무 수수료, 공인인증서(한국정보인증 등) 발급 수수료, 은행 송금·이체 수수료 등 외부 전문가·기관 용역 대가입니다.",
    recognitionTiming: "전문용역 제공 및 수수료 지급 시점.",
    measurementPrinciple: "지급수수료 공급가액(환급 발생 시 차감).",
    erpFormulaOrLogic: "세무·인증·법무 매입세금계산서 공급가액 + 통장 수수료 출금액",
    articleIds: ["art-29", "art-23"],
    commentaryIds: ["com-4-4"],
  },

  "수도광열비(공과금)": {
    key: "수도광열비(공과금)",
    title: "수도광열비(공과금)",
    categoryLabel: "Ⅳ. 판매비와관리비 · 수도광열비 (제29조①·②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제29조①·② 부합",
    appliedBasisSummary:
      "사업장 운영에 소요되는 전기요금(한국전력), 도시가스요금(귀뚜라미에너지 등), 상하수도 요금 등 에너지·유틸리티 비용입니다.",
    recognitionTiming: "고지서(매입세금계산서) 발행일 또는 자동이체 납부일.",
    measurementPrinciple: "공급가액 기준 측정.",
    erpFormulaOrLogic: "전력·도시가스·수도 매입세금계산서 공급가액 + 통장 수도광열비 출금액",
    articleIds: ["art-29", "art-23"],
    commentaryIds: ["com-4-4"],
  },

  "법인BC카드대금결제": {
    key: "법인BC카드대금결제",
    title: "법인BC카드대금결제",
    categoryLabel: "Ⅳ. 판매비와관리비 · 법인신용카드 결제분 운영경비 (제29조·제14조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제29조·제14조 부합",
    appliedBasisSummary:
      "법인 BC신용카드로 사용한 업무용 운영경비(식대, 소모품, 교통비, 일반경비 등)의 월별 카드대금 결제 및 선결제 출금액입니다.",
    recognitionTiming: "법인카드 대금 결제일 기준.",
    measurementPrinciple: "공급가액 기준 선택 시 카드 결제액에 포함된 매입부가세(1/11)를 부가세대급금으로 분리하고 공급가액(10/11)을 판관비로 반영합니다.",
    erpFormulaOrLogic: "∑ 비씨카드(BC) 대금결제 및 선결제 출금액(공급가액 환산분)",
    articleIds: ["art-29", "art-14"],
    commentaryIds: ["com-4-4", "com-4-3"],
  },

  "소모품·플랫폼·IT구독비": {
    key: "소모품·플랫폼·IT구독비",
    title: "소모품·플랫폼·IT구독비",
    categoryLabel: "Ⅳ. 판매비와관리비 · 소모품비 및 지급수수료 (제29조·제5조①)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제29조·제5조①(중요성 통합표시) 부합",
    appliedBasisSummary:
      "사무용·현장용 소모품 구입비(쿠팡, 네이버페이 등)와 클라우드·AI·소프트웨어 정기구독료(구글페이먼트, 카카오 등)입니다. 단, 쿠팡 결제 건 중 내용연수 1년 초과 임대용 TV 4대(#1171, #1727, #1046, #1015)는 본 소모품비에서 제외하여 유형자산으로 자산화하였습니다(제11조제1항).",
    recognitionTiming: "소모품 구입 및 IT 구독 서비스 결제 시점.",
    measurementPrinciple:
      "제5조제1항(중요성 원칙) 및 해설서 사례 4-1에 따라 소액 저장품·소모품은 별도 재고자산으로 남기지 않고 구입 시점에 즉시 판매비와관리비로 비용 인식합니다.",
    erpFormulaOrLogic: "∑ 쿠팡·네이버페이·구글·카카오 출금액(임대용 TV 자산화 4건 제외)",
    articleIds: ["art-29", "art-5", "art-11"],
    commentaryIds: ["com-4-2", "com-4-4", "com-7-1"],
  },

  "체크카드·현장운영경비": {
    key: "체크카드·현장운영경비",
    title: "체크카드·현장운영경비",
    categoryLabel: "Ⅳ. 판매비와관리비 · 현장 영업·관리경비 (제29조①·②)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제29조①·② 부합",
    appliedBasisSummary:
      "기업 체크카드(체크/CC)로 현장 출장, 고객 지원, 식음료, 소액 비품 구매 등에 지출한 일반 현장운영경비입니다.",
    recognitionTiming: "체크카드 즉시 출금일 기준.",
    measurementPrinciple: "공급가액 기준 시 부가가치세(1/11)를 부가세대급금으로 분리한 순공급가액.",
    erpFormulaOrLogic: "∑ 체크카드(체크·CC) 일반 운영경비 출금액(자재매입·자산화분 제외)",
    articleIds: ["art-29", "art-23"],
    commentaryIds: ["com-4-4"],
  },

  "기타지급수수료·경비": {
    key: "기타지급수수료·경비",
    title: "기타지급수수료·경비",
    categoryLabel: "Ⅳ. 판매비와관리비 · 기타 판관비 (제5조①·제29조)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제5조①(통합표시)·제29조 부합",
    appliedBasisSummary:
      "개별 세목으로 분리할 만큼 금액이 중요하지 아니한 기타 지급수수료 및 일반 관리경비를 제5조제1항('성격이나 금액이 중요하지 아니한 항목은 성격이 비슷한 항목에 통합하여 표시할 수 있다')에 따라 통합 표시한 계정입니다.",
    recognitionTiming: "비용 발생 및 통장 출금 시점.",
    measurementPrinciple: "실제 지출액(과세분 부가세 분리).",
    erpFormulaOrLogic: "∑ 기타 미분류 일반 운영경비 출금액",
    articleIds: ["art-5", "art-29"],
    commentaryIds: ["com-4-2", "com-4-4"],
  },

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

  // ==================== 10. 현금흐름표(CF) 및 유형자산 명세표 항목 ====================
  CF_STATEMENT: {
    key: "CF_STATEMENT",
    title: "③ 현금흐름표 (Cash Flow Statement)",
    categoryLabel: "재무보고서 · 현금흐름표 (제3조 일반기업회계기준 참조 · 제4조①)",
    complianceStatus: "특례적용",
    complianceBadge: "중소기업회계기준 제4조①(작성 면제) · 제3조(일반기업회계기준 참조 추가제공)",
    appliedBasisSummary:
      "중소기업회계기준 제4조제1항은 소규모 기업의 작성 부담 완화를 위해 현금흐름표 작성 의무를 면제하고 있으나, 당사 ERP는 제3조('일반기업회계기준을 참조하여 회계처리할 수 있다')에 의거하여 영업·투자·재무활동별 실제 통장 현금흐름표를 추가로 제공합니다.",
    recognitionTiming: "통장 실제 입출금일(현금주의) 기준.",
    measurementPrinciple:
      "기초 현금및현금성자산 + 영업활동 현금흐름 + 투자활동 현금흐름(임대자산 취득·임차보증금) + 재무활동 현금흐름(자본금·가수금·대표자입출금) = 기말 현금및현금성자산.",
    erpFormulaOrLogic: "endingCash = beginningCash + netCashChange (통장 실잔액 1:1 대사)",
    articleIds: ["art-3", "art-4", "art-7"],
    commentaryIds: ["com-4-1", "com-3-1"],
  },

  DEPREC_SCHEDULE: {
    key: "DEPREC_SCHEDULE",
    title: "월별 유형자산(임대자산) 가치 변동 및 감가상각 명세표",
    categoryLabel: "부속명세서 · 유형/무형자산 Roll-Forward 및 주석 공시 (제11조·제38조·제55조제3호·제4호)",
    complianceStatus: "적합",
    complianceBadge: "중소기업회계기준 제11조·제38조·제55조제3호(감가상각 주석) 부합",
    appliedBasisSummary:
      "중소기업회계기준 제55조제3호·제4호(필수적 주석 기재사항: 유형·무형자산의 감가상각방법 및 내용연수)와 제11조·제38조를 실무에서 완벽히 검증하기 위해, 매월 렌탈자산 98대의 기초장부가액·당월취득·당월상각·파손폐기·기말장부가액 및 귀속 임대매출 대비 순수익을 1원 단위로 추적하는 명세표입니다.",
    recognitionTiming: "매월 말 기준 Roll-Forward 집계.",
    measurementPrinciple:
      "기초 순장부가액 + 당월 신규취득원가(+) - 당월 정액법 감가상각비(-) - 당월 파손·폐기손실(-) = 기말 유형자산 순장부가액(기말 취득가액 - 기말 감가상각누계액 = BS 유형자산 순액과 100% 일치).",
    erpFormulaOrLogic:
      "endingBookValue = beginningBookValue + additionCost - depreciationExpense - disposalLoss",
    articleIds: ["art-11", "art-12", "art-38", "art-55"],
    commentaryIds: ["com-7-1", "com-7-2", "com-7-3", "com-7-4", "com-4-7"],
  },
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

export function getLinkedArticlesAndCommentaries(info: AccountSubjectStandardInfo): {
  articles: StandardArticle[];
  commentaries: CommentarySection[];
} {
  const articles = info.articleIds
    .map((id) => STANDARD_ARTICLES.find((a) => a.id === id))
    .filter((a): a is StandardArticle => Boolean(a));
  const commentaries = info.commentaryIds
    .map((id) => COMMENTARY_SECTIONS.find((c) => c.id === id))
    .filter((c): c is CommentarySection => Boolean(c));
  return { articles, commentaries };
}
