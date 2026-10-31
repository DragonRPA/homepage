"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Printer,
  CheckCircle2,
  Bookmark,
  Scale,
  FileText,
  Filter,
} from "lucide-react";

export interface WorkRuleArticle {
  articleNo: number;
  title: string;
  requirementType: "필수" | "선택";
  legalBasis?: string;
  paragraphs: string[];
}

export interface WorkRuleChapter {
  chapterNo: number;
  chapterTitle: string;
  summary: string;
  articles: WorkRuleArticle[];
}

export const MOEL_STANDARD_WORK_RULES: WorkRuleChapter[] = [
  {
    chapterNo: 1,
    chapterTitle: "제1장 총칙",
    summary: "목적, 적용범위, 사원의 정의 및 균등처우",
    articles: [
      {
        articleNo: 1,
        title: "목적",
        requirementType: "선택",
        legalBasis: "근로기준법 제93조",
        paragraphs: [
          "이 규칙은 주식회사 드래곤알피에이(이하 '회사'라 한다) 사원의 채용·복무 및 근로조건 등에 관한 사항을 정함을 목적으로 한다.",
          "이 규칙에 정하지 아니한 사항에 대하여는 근로기준법 기타 관계 법령과 통상 관례에 따른다.",
        ],
      },
      {
        articleNo: 2,
        title: "적용범위",
        requirementType: "선택",
        legalBasis: "근로기준법 제93조",
        paragraphs: [
          "이 규칙은 회사에 근무하는 모든 사원에게 적용한다.",
          "다만, 단시간근로자, 기간제근로자 또는 촉탁직 등 특수근무 사원에 대하여는 별도의 규정 또는 근로계약으로 정하는 바에 따른다.",
        ],
      },
      {
        articleNo: 3,
        title: "사원의 정의",
        requirementType: "선택",
        paragraphs: [
          "이 규칙에서 '사원'이라 함은 제2장(채용 및 근로계약)의 절차에 따라 회사와 근로계약을 체결하고 근로를 제공하는 자를 말한다.",
        ],
      },
      {
        articleNo: 4,
        title: "차별금지 및 균등처우",
        requirementType: "필수",
        legalBasis: "근로기준법 제6조, 남녀고용평등법 제7조~제11조",
        paragraphs: [
          "회사는 사원에 대하여 남녀의 성(性)을 이유로 차별적 대우를 하지 아니하며, 국적·신앙 또는 사회적 신분을 이유로 근로조건에 대한 차별적 처우를 하지 아니한다.",
          "회사는 동일가치 노동에 대하여 동일한 임금을 지급하며, 교육·배치·승진·정년·퇴직·해고에 있어서 성별 등을 이유로 차별하지 아니한다.",
        ],
      },
    ],
  },
  {
    chapterNo: 2,
    chapterTitle: "제2장 채용 및 근로계약",
    summary: "전형절차, 근로조건 명시, 근로계약서 교부 및 수습기간",
    articles: [
      {
        articleNo: 5,
        title: "채용기회 및 전형",
        requirementType: "선택",
        legalBasis: "채용절차의 공정화에 관한 법률",
        paragraphs: [
          "회사는 모집과 채용에 있어 성별, 연령, 출신지역, 혼인여부 등을 이유로 합리적 이유 없이 차별하지 않고 균등한 기회를 부여한다.",
          "입사를 지원하는 자는 회사가 정한 서류전형 및 면접전형을 거쳐 선발한다.",
        ],
      },
      {
        articleNo: 6,
        title: "채용구비서류",
        requirementType: "선택",
        paragraphs: [
          "채용이 확정된 자는 입사 시 다음 각 호의 서류를 회사에 제출하여야 한다.",
          "1. 이력서 및 자기소개서 1부",
          "2. 주민등록등본 1부 (행정정보 공동이용 동의 시 갈음)",
          "3. 최종학력증명서 및 경력·자격증명서(해당자에 한함) 각 1부",
          "4. 급여이체용 통장 사본 1부",
        ],
      },
      {
        articleNo: 7,
        title: "근로계약의 체결 및 교부",
        requirementType: "필수",
        legalBasis: "근로기준법 제17조",
        paragraphs: [
          "회사는 채용이 확정된 자와 서면(전자문서 포함)으로 근로계약을 체결하고, 해당 사원에게 근로계약서 1부를 의무적으로 교부한다.",
          "회사는 근로계약 체결 시 임금의 구성항목·계산방법·지급방법, 소정근로시간, 제55조에 따른 휴일, 제60조에 따른 연차유급휴가, 취업의 장소와 종사하여야 할 업무에 관한 사항을 명확히 명시한다.",
        ],
      },
      {
        articleNo: 8,
        title: "수습기간",
        requirementType: "선택",
        legalBasis: "근로기준법 제35조",
        paragraphs: [
          "신규 채용된 사원에 대하여는 입사일로부터 3개월 이내의 수습기간을 둘 수 있다. 다만, 경력직 등 회사가 인정하는 경우 수습기간을 단축하거나 면제할 수 있다.",
          "수습기간 중 또는 만료 시 업무능력 부족, 근무태도 불량 등으로 계속 근로가 부적당하다고 인정되는 경우에는 본채용을 거부하거나 근로계약을 해지할 수 있다.",
          "수습기간은 근속연수에 산입한다.",
        ],
      },
    ],
  },
  {
    chapterNo: 3,
    chapterTitle: "제3장 복무",
    summary: "복무의무, 출퇴근·결근·지각·조퇴·외출, 공민권 행사 및 출장",
    articles: [
      {
        articleNo: 9,
        title: "복무의무",
        requirementType: "선택",
        paragraphs: [
          "사원은 다음 각 호의 사항을 성실히 준수하여야 한다.",
          "1. 사원은 맡은 바 직무를 성실히 수행하고 회사의 제반 규정과 정당한 직무상 지시를 준수하여야 한다.",
          "2. 사원은 재직 중은 물론 퇴직 후에도 직무상 지득한 회사의 기밀, 고객사 정보 및 영업비밀을 외부에 누설하거나 사적 이익을 위하여 이용하여서는 아니 된다.",
          "3. 사원은 회사의 명예와 신용을 훼손하는 행위를 하여서는 아니 되며, 회사의 자산과 시설물을 아껴 다루어야 한다.",
        ],
      },
      {
        articleNo: 10,
        title: "출근 및 결근",
        requirementType: "선택",
        paragraphs: [
          "사원은 시업 시각 전까지 출근하여 업무 개시 준비를 완료하여야 한다.",
          "질병 기타 부득이한 사유로 결근하고자 하는 경우에는 사전에 소속 부서장에게 사유를 신고하고 승인을 받아야 한다. 다만, 불가피한 사유로 사전 신고가 불가능한 경우에는 당일 시업 시각 후 지체 없이 연락하고 사후에 증빙서류를 제출하여야 한다.",
          "정당한 이유나 승인 절차 없이 결근한 경우에는 무단결근으로 처리한다.",
        ],
      },
      {
        articleNo: 11,
        title: "지각·조퇴 및 외출",
        requirementType: "선택",
        paragraphs: [
          "사원이 질병 기타 부득이한 사유로 지각하고자 할 때에는 사전에 부서장에게 통보하여야 하며, 부득이한 경우 사후 즉시 보고하여야 한다.",
          "사원이 근로시간 중에 사적인 용무나 질병 등으로 조퇴 또는 외출하고자 할 때에는 소속 부서장의 사전 승인을 받아야 한다.",
        ],
      },
      {
        articleNo: 12,
        title: "공민권 행사의 보장",
        requirementType: "필수",
        legalBasis: "근로기준법 제10조",
        paragraphs: [
          "회사는 사원이 근로시간 중에 선거권 그 밖의 공민권(公民權) 행사 또는 공(公)의 직무를 집행하기 위하여 필요한 시간을 청구하면 거부하지 아니한다.",
          "다만, 그 권리 행사나 공(公)의 직무 집행에 지장이 없는 범위에서 청구한 시각을 변경할 수 있으며, 법령에 따라 유급으로 인정되는 시간은 유급으로 처리한다.",
        ],
      },
      {
        articleNo: 13,
        title: "출장",
        requirementType: "선택",
        paragraphs: [
          "회사는 업무 수행을 위하여 필요한 경우 사원에게 국내·외 출장을 명할 수 있다.",
          "출장 사원에 대하여는 회사 여비 기준에 따라 실비 상당의 출장여비(교통비, 숙박비, 식비 등)를 지급한다.",
        ],
      },
    ],
  },
  {
    chapterNo: 4,
    chapterTitle: "제4장 인사",
    summary: "인사위원회, 배치·전직·승진, 휴직 및 복직, 근속기간 산정",
    articles: [
      {
        articleNo: 14,
        title: "인사위원회의 구성 및 운영",
        requirementType: "선택",
        paragraphs: [
          "회사는 사원의 표창·징계·해고 기타 중요 인사에 관한 사항을 공정하게 심의·의결하기 위하여 인사위원회를 둘 수 있다.",
          "인사위원회는 대표이사 또는 대표이사가 지명하는 임원 및 부서장 등 3인 이상으로 구성하며, 위원장은 대표이사 또는 대표이사가 위촉한 자로 한다.",
        ],
      },
      {
        articleNo: 15,
        title: "배치·전직 및 승진",
        requirementType: "선택",
        legalBasis: "근로기준법 제23조 제1항",
        paragraphs: [
          "회사는 업무상 필요성 및 사원의 능력·적성·경력 등을 고려하여 부서 배치, 보직 변경, 전직 또는 파견을 명할 수 있으며, 사원은 정당한 이유 없이 이를 거부하지 못한다.",
          "회사는 사원의 근무성적, 역량, 근속기간 등을 종합 평가하여 승진 인사발령을 행한다.",
        ],
      },
      {
        articleNo: 16,
        title: "휴직 사유 및 기간",
        requirementType: "선택",
        legalBasis: "근로기준법 제23조",
        paragraphs: [
          "회사는 사원이 다음 각 호의 어느 하나에 해당하는 사유로 휴직원을 제출하는 경우 휴직을 승인할 수 있다.",
          "1. 업무 외 질병·부상 등으로 14일 이상 장기 요양이 필요한 경우: 6개월 이내",
          "2. 병역법 등 관계 법령에 따라 징집 또는 소집된 경우: 복무기간",
          "3. 일신상의 정당한 사유로 휴직이 불가피하다고 인정되는 경우: 3개월 이내",
          "휴직기간 중 사원은 사원으로서의 신분은 보유하나 직무에 종사하지 못하며, 법령에 별도 규정이 있는 경우를 제외하고 휴직기간 중 임금은 지급하지 아니한다.",
        ],
      },
      {
        articleNo: 17,
        title: "복직 및 근속기간의 계산",
        requirementType: "선택",
        paragraphs: [
          "휴직자는 휴직기간 만료일 7일 전 또는 휴직사유가 소멸한 즉시 복직원을 제출하여야 하며, 회사는 원직 또는 동등한 직무에 복직시킨다.",
          "휴직기간 만료 후 정당한 사유 없이 복직원을 제출하지 아니하거나 휴직사유 소멸 후 출근하지 아니하는 경우 당연퇴직 처리할 수 있다.",
          "법령상 근속기간 산입이 의무화된 휴직(육아휴직, 업무상 부상·질병 휴직 등)은 근속기간에 산입한다.",
        ],
      },
    ],
  },
  {
    chapterNo: 5,
    chapterTitle: "제5장 근로시간 및 휴게",
    summary: "소정근로시간, 시업·종업시각, 휴게시간, 유연근무제, 연장·야간·휴일근로",
    articles: [
      {
        articleNo: 18,
        title: "근무형태 및 소정근로시간",
        requirementType: "필수",
        legalBasis: "근로기준법 제50조, 제93조 제1호",
        paragraphs: [
          "사원의 근무형태는 통상 주간근무(주 5일제)를 원칙으로 한다.",
          "1주간의 소정근로시간은 휴게시간을 제외하고 40시간으로 하며, 1일의 소정근로시간은 휴게시간을 제외하고 8시간으로 한다.",
        ],
      },
      {
        articleNo: 19,
        title: "시업·종업시각 및 휴게시간",
        requirementType: "필수",
        legalBasis: "근로기준법 제54조, 제93조 제1호",
        paragraphs: [
          "사원의 시업 및 종업시각과 휴게시간은 다음과 같이 정한다.",
          "1. 시업시각: 09:00",
          "2. 종업시각: 18:00",
          "3. 휴게시간: 12:00 ~ 13:00 (1시간)",
          "회사는 근로시간이 4시간인 경우에는 30분 이상, 8시간인 경우에는 1시간 이상의 휴게시간을 근로시간 도중에 부여하며, 사원은 휴게시간을 자유로이 이용할 수 있다.",
          "업무 특성이나 계절, 부서 사정에 따라 필요한 경우 소정근로시간의 범위 내에서 시업·종업시각 및 휴게시간을 변경하여 운영할 수 있다.",
        ],
      },
      {
        articleNo: 20,
        title: "유연근로시간제 (탄력적·선택적·간주근로시간제)",
        requirementType: "선택",
        legalBasis: "근로기준법 제51조, 제52조, 제58조",
        paragraphs: [
          "회사는 업무의 효율성 제고와 사원의 일·생활 균형을 위하여 근로자대표와의 서면합의 등을 거쳐 탄력적 근로시간제, 선택적 근로시간제, 시차출퇴근제, 재택·원격근무제를 시행할 수 있다.",
          "사원이 출장이나 그 밖의 사유로 근로시간의 전부 또는 일부를 사업장 밖에서 근로하여 근로시간을 산정하기 어려운 경우에는 소정근로시간(1일 8시간)을 근로한 것으로 본다.",
        ],
      },
      {
        articleNo: 21,
        title: "연장·야간 및 휴일근로",
        requirementType: "필수",
        legalBasis: "근로기준법 제53조, 제56조",
        paragraphs: [
          "회사는 당사자 간에 합의하면 1주간에 12시간을 한도로 제18조의 근로시간을 연장할 수 있다.",
          "사원이 연장근로, 야간근로(22:00 ~ 익일 06:00) 또는 휴일근로를 수행하고자 하는 경우에는 사전에 ERP 초과근무 관리 시스템을 통해 부서장의 승인을 득하여야 한다.",
          "회사는 연장·야간 및 휴일근로에 대하여 근로기준법 제56조에 따른 가산임금을 지급하거나, 근로자대표와의 서면합의에 따라 보상휴가제(근로기준법 제57조)를 부여할 수 있다.",
        ],
      },
    ],
  },
  {
    chapterNo: 6,
    chapterTitle: "제6장 휴일 및 휴가",
    summary: "유급휴일, 연차유급휴가 부여·사용·촉진, 경조사휴가",
    articles: [
      {
        articleNo: 22,
        title: "유급휴일",
        requirementType: "필수",
        legalBasis: "근로기준법 제55조, 제93조 제1호",
        paragraphs: [
          "회사는 다음 각 호의 날을 유급휴일로 한다.",
          "1. 주휴일: 1주 동안 소정근로일을 개근한 사원에게 주 1회 부여하며, 일요일을 주휴일로 한다. (토요일은 원칙적으로 무급휴무일로 한다)",
          "2. 근로자의 날 제정에 관한 법률에 따른 근로자의 날 (5월 1일)",
          "3. 관공서의 공휴일에 관한 규정 제2조 각 호(제1호 제외)에 따른 공휴일 및 제3조에 따른 대체공휴일",
          "4. 기타 회사가 임시로 지정하는 휴일",
          "주휴일과 기타 유급휴일이 중복될 경우에는 하나의 휴일로 본다.",
        ],
      },
      {
        articleNo: 23,
        title: "연차유급휴가의 부여",
        requirementType: "필수",
        legalBasis: "근로기준법 제60조",
        paragraphs: [
          "회사는 1년간 80퍼센트 이상 출근한 사원에게 15일의 유급휴가를 준다.",
          "회사는 계속하여 근로한 기간이 1년 미만인 사원 또는 1년간 80퍼센트 미만 출근한 사원에게 1개월 개근 시 1일의 유급휴가를 준다.",
          "회사는 3년 이상 계속하여 근로한 사원에게는 제1항에 따른 휴가에 최초 1년을 초과하는 계속 근로 연수 매 2년에 대하여 1일을 가산한 유급휴가를 주며, 가산휴가를 포함한 총 휴가일수는 25일을 한도로 한다.",
          "연차유급휴가 산정을 위한 출근율 계산 시 업무상 재해로 인한 휴업기간, 출산전후휴가기간, 육아휴직기간, 배우자 출산휴가기간, 육아기 근로시간 단축 사용기간, 가족돌봄휴가기간 및 예비군·민방위 훈련기간은 출근한 것으로 본다.",
        ],
      },
      {
        articleNo: 24,
        title: "연차유급휴가의 사용 및 사용촉진",
        requirementType: "필수",
        legalBasis: "근로기준법 제60조 제5항·제7항, 제61조",
        paragraphs: [
          "사원이 연차유급휴가를 사용하고자 할 때에는 사전에 ERP 연차신청 시스템을 통해 신청하여 승인을 받아야 한다. 회사는 사원이 청구한 시기에 휴가를 주어야 하며, 사업을 운영하는 데 막대한 지장이 있는 경우에만 그 시기를 변경할 수 있다.",
          "사원의 편의를 위하여 연차유급휴가를 반차(0.5일, 4시간) 단위로 분할하여 사용할 수 있다.",
          "연차유급휴가는 발생한 날로부터 1년간 행사하지 아니하면 소멸한다. 다만, 회사의 귀책사유로 사용하지 못한 경우에는 그러하지 아니하다.",
          "회사는 근로기준법 제61조에 따라 연차유급휴가의 사용을 촉진할 수 있으며, 회사의 적법한 사용촉진 조치에도 불구하고 사원이 휴가를 사용하지 아니하여 소멸된 경우에는 미사용 휴가에 대한 보상의무를 지지 아니한다.",
        ],
      },
      {
        articleNo: 25,
        title: "경조사 휴가",
        requirementType: "선택",
        paragraphs: [
          "회사는 사원이 다음 각 호의 경조사가 발생한 경우 신청에 따라 유급 경조사 휴가를 부여할 수 있다 (휴가기간 중 휴일이 포함된 경우 법정 기준 및 내규에 따름).",
          "1. 본인 결혼: 5일",
          "2. 자녀 결혼: 1일",
          "3. 배우자 사망, 본인 및 배우자의 부모 사망: 5일",
          "4. 본인 및 배우자의 조부모·외조부모 사망, 자녀와 그 배우자 사망: 3일",
          "5. 본인 및 배우자의 형제자매 사망: 1일",
        ],
      },
    ],
  },
  {
    chapterNo: 7,
    chapterTitle: "제7장 모성보호 및 일·가정 양립 지원 (육아지원 3법 최신 개정 반영)",
    summary: "임산부 보호, 출산전후휴가, 배우자 출산휴가(20일), 육아휴직(최대 1년6개월), 육아기 단축근무(12세 이하)",
    articles: [
      {
        articleNo: 26,
        title: "임산부의 보호 및 태아검진 시간의 허용 등",
        requirementType: "필수",
        legalBasis: "근로기준법 제74조, 제74조의2, 남녀고용평등법 제18조의3",
        paragraphs: [
          "회사는 임신 중의 여성 사원에게 출산 전과 출산 후를 통하여 90일(미숙아 출산 시 100일, 한 번에 둘 이상 자녀를 임신한 다태아의 경우 120일)의 출산전후휴가를 주어야 하며, 출산 후에 45일(다태아 60일) 이상이 확보되도록 배정한다.",
          "회사는 임신한 여성 사원이 유산·사산한 경우 근로기준법 시행령이 정하는 기준에 따라 유산·사산휴가를 부여한다.",
          "회사는 임신 후 12주 이내 또는 32주 이후에 있는 여성 사원이 1일 2시간의 근로시간 단축을 신청하는 경우 이를 허용하여야 하며, 근로시간 단축을 이유로 임금을 삭감하지 아니한다.",
          "회사는 임신한 여성 사원이 모자보건법 제10조에 따른 임산부 정기건강진단을 받는데 필요한 시간을 청구하는 경우 이를 유급으로 허용한다.",
          "회사는 임신 중의 여성 사원에게 시간외근로를 하게 하지 못하며, 요구가 있는 경우 쉬운 종류의 근로로 전환시킨다.",
          "사원이 인공수정 또는 체외수정 등 난임치료를 받기 위하여 휴가(난임치료휴가)를 청구하는 경우 연간 6일(최초 2일 유급) 이내의 휴가를 부여한다.",
        ],
      },
      {
        articleNo: 27,
        title: "배우자 출산휴가 (2025년 육아지원법 개정 반영)",
        requirementType: "필수",
        legalBasis: "남녀고용평등과 일·가정 양립 지원에 관한 법률 제18조의2",
        paragraphs: [
          "회사는 사원이 배우자의 출산을 이유로 휴가를 청구하는 경우에 20일의 유급휴가를 주어야 한다.",
          "배우자 출산휴가는 배우자가 출산한 날부터 120일 이내에 청구하여야 하며, 3회까지 나누어(총 4번에 걸쳐) 분할 사용할 수 있다.",
        ],
      },
      {
        articleNo: 28,
        title: "육아휴직 (2025년 육아지원법 개정 반영)",
        requirementType: "필수",
        legalBasis: "남녀고용평등과 일·가정 양립 지원에 관한 법률 제19조",
        paragraphs: [
          "회사는 임신 중인 여성 사원이 모성을 보호하거나 사원이 만 8세 이하 또는 초등학교 2학년 이하의 자녀(입양한 자녀 포함)를 양육하기 위하여 휴직(육아휴직)을 신청하는 경우에 이를 허용하여야 한다.",
          "육아휴직의 기간은 1년 이내로 한다. 다만, 다음 각 호의 어느 하나에 해당하는 사원의 경우 6개월 이내에서 추가로 육아휴직(총 1년 6개월)을 사용할 수 있다.",
          "1. 같은 자녀를 대상으로 부모가 모두 육아휴직을 각각 3개월 이상 사용한 경우의 부 또는 모",
          "2. 한부모가족지원법 제4조 제1호의 부 또는 모",
          "3. 고용노동부령으로 정하는 장애아동의 부 또는 모",
          "사원은 육아휴직을 3회에 한정하여 나누어(총 4번에 걸쳐) 사용할 수 있다(임신 중 사용한 육아휴직은 분할 횟수에 포함하지 아니한다).",
          "회사는 육아휴직을 이유로 해고나 그 밖의 불리한 처우를 하지 못하며, 육아휴직 기간에는 그 사원을 해고하지 못한다. 육아휴직을 마친 후에는 휴직 전과 같은 업무 또는 같은 수준의 임금을 지급하는 직무에 복귀시키며, 육아휴직 기간은 근속기간에 포함한다.",
        ],
      },
      {
        articleNo: 29,
        title: "육아기 근로시간 단축 (2025년 육아지원법 개정 반영)",
        requirementType: "필수",
        legalBasis: "남녀고용평등과 일·가정 양립 지원에 관한 법률 제19조의2",
        paragraphs: [
          "회사는 사원이 만 12세 이하 또는 초등학교 6학년 이하의 자녀를 양육하기 위하여 근로시간의 단축(육아기 근로시간 단축)을 신청하는 경우에 이를 허용하여야 한다.",
          "육아기 근로시간 단축을 허용하는 경우 단축 후 근로시간은 주당 15시간 이상이어야 하고 35시간을 넘어서는 아니 된다.",
          "육아기 근로시간 단축의 기간은 1년 이내로 한다. 다만, 제28조에 따른 육아휴직 미사용 기간이 있는 경우에는 그 미사용 기간의 2배를 가산한 기간 이내로 사용할 수 있다.",
          "육아기 근로시간 단축을 나누어 사용하는 경우 1회의 기간은 1개월 이상(방학 기간 등에도 활용 가능)이어야 한다.",
        ],
      },
      {
        articleNo: 30,
        title: "가족돌봄휴직 및 가족돌봄휴가",
        requirementType: "필수",
        legalBasis: "남녀고용평등과 일·가정 양립 지원에 관한 법률 제22조의2",
        paragraphs: [
          "회사는 사원이 조부모, 부모, 배우자, 배우자의 부모, 자녀 또는 손자녀의 질병, 사고, 노령으로 인하여 그 가족을 돌보기 위한 휴직(가족돌봄휴직)을 신청하는 경우 연간 최장 90일(1회 30일 이상)을 허용한다.",
          "사원이 가족의 질병, 사고, 노령 또는 자녀의 양육으로 인하여 긴급하게 그 가족을 돌보기 위한 휴가(가족돌봄휴가)를 신청하는 경우 연간 최장 10일을 일(日) 단위로 사용할 수 있다(가족돌봄휴직 기간 90일에 포함).",
        ],
      },
    ],
  },
  {
    chapterNo: 8,
    chapterTitle: "제8장 임금",
    summary: "임금의 구성항목, 계산 및 지급방법, 지급일, 가산임금, 임금명세서 교부",
    articles: [
      {
        articleNo: 31,
        title: "임금의 구성항목",
        requirementType: "필수",
        legalBasis: "근로기준법 제93조 제2호",
        paragraphs: [
          "사원에 대한 임금은 기본급과 제수당(연장·야간·휴일근로수당, 식대, 차량유지비, 직책수당 등) 및 상여금(지급 시)으로 구성한다.",
          "회사는 최저임금법에 따른 최저임금액 이상의 임금을 보장한다.",
        ],
      },
      {
        articleNo: 32,
        title: "임금의 계산 및 지급방법",
        requirementType: "필수",
        legalBasis: "근로기준법 제43조, 제48조, 제93조 제2호",
        paragraphs: [
          "임금은 매월 초일(1일)부터 말일까지를 산정기간으로 하여 계산하고, 당월(또는 익월 지정 지급일)에 사원이 지정한 본인 명의의 은행 계좌로 통화(원화)로 전액 직접 지급한다.",
          "임금 지급일이 토요일 또는 공휴일인 경우에는 그 전일에 지급한다.",
          "신규 입사, 퇴직, 휴직 등으로 임금 산정기간 중에 변동이 발생한 경우에는 출근일수에 따라 일할 계산하여 지급한다.",
          "회사는 임금을 지급할 때 법령에 따른 원천징수 세액 및 4대 사회보험료 사원 부담분을 공제하며, 임금의 구성항목·계산방법·공제내역을 적은 급여명세서를 서면 또는 전자문서(ERP 급여명세서)로 교부한다.",
        ],
      },
      {
        articleNo: 33,
        title: "연장·야간·휴일근로 가산임금",
        requirementType: "필수",
        legalBasis: "근로기준법 제56조",
        paragraphs: [
          "회사는 연장근로 및 야간근로(22:00 ~ 06:00)에 대하여는 통상임금의 100분의 50 이상을 가산하여 지급한다.",
          "휴일근로에 대하여는 8시간 이내의 휴일근로는 통상임금의 100분의 50, 8시간을 초과한 휴일근로는 통상임금의 100분의 100 이상을 가산하여 지급한다.",
        ],
      },
      {
        articleNo: 34,
        title: "비상시 지급 및 휴업수당",
        requirementType: "필수",
        legalBasis: "근로기준법 제45조, 제46조",
        paragraphs: [
          "사원이 출산, 질병, 재해 그 밖에 노동부령이 정하는 비상한 경우의 비용에 충당하기 위하여 임금 지급을 청구하면 지급기일 전이라도 기왕의 근로에 대한 임금을 지급한다.",
          "회사의 귀책사유로 휴업하는 경우에는 휴업기간 동안 그 사원에게 평균임금의 100분의 70 이상의 휴업수당을 지급한다.",
        ],
      },
    ],
  },
  {
    chapterNo: 9,
    chapterTitle: "제9장 퇴직·해고 및 정년",
    summary: "퇴직사유, 해고의 제한 및 서면통지, 해고예고, 정년(만 60세 이상)",
    articles: [
      {
        articleNo: 35,
        title: "퇴직 및 당연퇴직",
        requirementType: "필수",
        legalBasis: "근로기준법 제93조 제4호",
        paragraphs: [
          "사원이 자진 퇴직하고자 할 때에는 최소 30일 전에 사직원을 제출하여 업무 인수인계를 성실히 완료하여야 한다.",
          "사원이 다음 각 호의 어느 하나에 해당하는 때에는 당연퇴직으로 한다.",
          "1. 사망하였을 때",
          "2. 정년에 도달하였을 때",
          "3. 기간제 근로계약의 계약기간이 만료되었을 때",
          "4. 휴직기간 만료 후 정당한 사유 없이 복직하지 아니한 때",
        ],
      },
      {
        articleNo: 36,
        title: "해고의 제한 및 서면통지",
        requirementType: "필수",
        legalBasis: "근로기준법 제23조, 제24조, 제27조",
        paragraphs: [
          "회사는 사원에게 정당한 이유 없이 해고, 휴직, 정직, 전직, 감봉, 그 밖의 징벌을 하지 못한다.",
          "회사는 사원이 업무상 부상 또는 질병의 요양을 위하여 휴업한 기간과 그 후 30일 동안 또는 산전·산후의 여성이 법에 따라 휴업한 기간과 그 후 30일 동안은 해고하지 못한다.",
          "회사는 사원을 해고하려면 해고사유와 해고시기를 서면으로 통지하여야 효력이 있다.",
        ],
      },
      {
        articleNo: 37,
        title: "해고의 예고",
        requirementType: "필수",
        legalBasis: "근로기준법 제26조",
        paragraphs: [
          "회사는 사원을 해고(경영상 이유에 의한 해고 포함)하려면 적어도 30일 전에 예고를 하여야 하고, 30일 전에 예고를 하지 아니하였을 때에는 30일분 이상의 통상임금을 지급한다.",
          "다만, 계속 근로한 기간이 3개월 미만인 경우, 천재·사변 그 밖의 부득이한 사유로 사업을 계속하는 것이 불가능한 경우, 또는 사원이 고의로 사업에 막대한 지장을 초래하거나 재산상 손해를 끼친 경우로서 고용노동부령으로 정하는 사유에 해당하는 경우에는 예고 없이 해고할 수 있다.",
        ],
      },
      {
        articleNo: 38,
        title: "정년",
        requirementType: "필수",
        legalBasis: "고용상 연령차별금지 및 고령자고용촉진에 관한 법률 제19조",
        paragraphs: [
          "사원의 정년은 만 60세에 도달하는 날이 속한 달의 말일로 한다.",
          "정년에 도달한 사원이라도 업무상 필요하고 본인이 희망하는 경우 촉탁직 등으로 재고용 계약을 체결할 수 있다.",
        ],
      },
    ],
  },
  {
    chapterNo: 10,
    chapterTitle: "제10장 퇴직급여",
    summary: "퇴직급여제도의 설정(퇴직금·DB·DC) 및 금품청산",
    articles: [
      {
        articleNo: 39,
        title: "퇴직급여제도의 설정",
        requirementType: "필수",
        legalBasis: "근로자퇴직급여 보장법 제4조, 제8조, 근로기준법 제93조 제5호",
        paragraphs: [
          "회사는 계속근로기간이 1년 이상이고 4주간을 평균하여 1주간의 소정근로시간이 15시간 이상인 사원이 퇴직하는 경우 근로자퇴직급여 보장법에 따른 퇴직급여를 지급한다.",
          "회사는 계속근로기간 1년에 대하여 30일분 이상의 평균임금을 퇴직금으로 지급하거나, 확정급여형(DB) 또는 확정기여형(DC) 퇴직연금제도를 설정하여 운영할 수 있다.",
        ],
      },
      {
        articleNo: 40,
        title: "금품청산",
        requirementType: "필수",
        legalBasis: "근로기준법 제36조",
        paragraphs: [
          "회사는 사원이 사망 또는 퇴직한 경우에는 그 지급 사유가 발생한 때부터 14일 이내에 임금, 보상금, 그 밖의 모든 금품을 지급하여야 한다. 다만, 특별한 사정이 있을 경우에는 당사자 사이의 합의에 의하여 기일을 연장할 수 있다.",
        ],
      },
    ],
  },
  {
    chapterNo: 11,
    chapterTitle: "제11장 표창 및 징계",
    summary: "표창 사유, 징계의 종류·사유·절차 및 재심청구",
    articles: [
      {
        articleNo: 41,
        title: "표창",
        requirementType: "필수",
        legalBasis: "근로기준법 제93조 제11호",
        paragraphs: [
          "회사는 사원이 다음 각 호의 어느 하나에 해당하는 경우 표창하고 포상할 수 있다.",
          "1. 업무 능률 향상, 기술 혁신, 원가 절감 또는 영업 실적 향상에 현저한 공적이 있는 자",
          "2. 재해를 미연에 방지하거나 비상사태 수습에 특별한 공로가 있는 자",
          "3. 장기 근속자로서 타의 모범이 되는 자",
        ],
      },
      {
        articleNo: 42,
        title: "징계의 사유 및 종류",
        requirementType: "필수",
        legalBasis: "근로기준법 제93조 제11호, 제95조",
        paragraphs: [
          "회사는 사원이 법령 및 이 규칙을 위반하거나 직장 질서를 문란하게 한 경우, 정당한 업무 명령을 거부한 경우, 직장 내 괴롭힘 또는 성희롱 행위를 한 경우, 고의 또는 중대한 과실로 회사에 재산상 손해를 끼친 경우 인사위원회의 의결을 거쳐 징계할 수 있다.",
          "징계의 종류는 다음 각 호와 같다.",
          "1. 견책(경고): 시말서를 받고 장래를 훈계한다.",
          "2. 감봉(감급): 1회의 금액이 평균임금 1일분의 2분의 1을, 총액이 1임금지급기의 임금 총액의 10분의 1을 초과하지 않는 범위 내에서 임금을 감액한다.",
          "3. 정직(출근정지): 3개월 이내의 기간 동안 사원 신분은 유지하되 직무에 종사하지 못하게 하고 그 기간 동안 임금을 지급하지 아니한다.",
          "4. 해고(징계해고): 근로관계를 일방적으로 종료한다.",
        ],
      },
      {
        articleNo: 43,
        title: "징계절차 및 소명기회 부여",
        requirementType: "필수",
        legalBasis: "근로기준법 제23조, 제27조",
        paragraphs: [
          "회사가 사원을 징계하고자 할 때에는 인사위원회 개최 7일 전까지 징계 대상자에게 출석통지서를 통보하고 충분한 진술 및 소명 기회를 부여하여야 한다.",
          "징계처분이 결정된 때에는 지체 없이 징계사유와 처분내용을 서면으로 통보하며, 징계를 받은 사원은 통보받은 날부터 7일 이내에 재심을 청구할 수 있다.",
        ],
      },
    ],
  },
  {
    chapterNo: 12,
    chapterTitle: "제12장 교육",
    summary: "직무교육 및 법정의무교육 실시",
    articles: [
      {
        articleNo: 44,
        title: "직무교육 및 법정의무교육",
        requirementType: "필수",
        legalBasis: "근로기준법 제93조 제7호",
        paragraphs: [
          "회사는 사원의 직무능력 향상 및 안전·인권 보호를 위하여 직무교육과 다음 각 호의 법정의무교육을 정기적으로 실시하며, 사원은 교육에 성실히 참여하여야 한다.",
          "1. 산업안전보건교육",
          "2. 직장 내 성희롱 예방교육",
          "3. 개인정보 보호교육",
          "4. 직장 내 장애인 인식개선 교육",
          "5. 퇴직연금 교육(퇴직연금 가입 사업장)",
          "회사가 지시하여 실시하는 교육시간은 소정근로시간으로 인정한다.",
        ],
      },
    ],
  },
  {
    chapterNo: 13,
    chapterTitle: "제13장 직장 내 괴롭힘의 예방 및 발생 시 조치",
    summary: "직장 내 괴롭힘 금지, 예방, 신고·조사, 피해근로자 보호 및 불이익 금지",
    articles: [
      {
        articleNo: 45,
        title: "직장 내 괴롭힘 행위의 금지",
        requirementType: "필수",
        legalBasis: "근로기준법 제76조의2, 제93조 제11호",
        paragraphs: [
          "임원 및 사원은 직장에서의 지위 또는 관계 등의 우위를 이용하여 업무상 적정범위를 넘어 다른 사원에게 신체적·정신적 고통을 주거나 근무환경을 악화시키는 행위(이하 '직장 내 괴롭힘'이라 한다)를 하여서는 아니 된다.",
          "금지되는 구체적인 직장 내 괴롭힘 행위는 다음 각 호와 같다.",
          "1. 신체에 대하여 폭행하거나 협박하는 행위",
          "2. 지속·반복적인 욕설이나 폭언, 다른 직원들 앞에서 모욕감을 주는 행위",
          "3. 개인사에 대한 소문을 퍼뜨리거나 따돌림을 유도하는 행위",
          "4. 정당한 이유 없이 업무 능력이나 성과를 인정하지 않거나 조롱하는 행위",
          "5. 근로계약서 등에 명시되어 있지 않는 허드렛일만 시키거나 일을 거의 주지 않는 행위",
          "6. 정당한 이유 없이 훈련·승진·보상·일상적인 대우 등에서 차별하는 행위",
        ],
      },
      {
        articleNo: 46,
        title: "직장 내 괴롭힘 발생 시 조치 및 피해자 보호",
        requirementType: "필수",
        legalBasis: "근로기준법 제76조의3",
        paragraphs: [
          "누구든지 직장 내 괴롭힘 발생 사실을 알게 된 경우 그 사실을 회사(인사담당 부서 또는 대표이사)에 신고할 수 있다.",
          "회사는 신고를 접수하거나 직장 내 괴롭힘 발생 사실을 인지한 경우에는 지체 없이 당사자 등을 대상으로 그 사실 확인을 위한 객관적인 조사를 실시한다.",
          "회사는 조사 기간 동안 피해사원(또는 피해를 입었다고 주장하는 사원)을 보호하기 위하여 필요한 경우 해당 피해사원에 대하여 근무장소의 변경, 유급휴가 명령 등 적절한 조치를 하여야 한다. 이 경우 회사는 피해사원의 의사에 반하는 조치를 하여서는 아니 된다.",
          "조사 결과 직장 내 괴롭힘 발생 사실이 확인된 때에는 피해사원이 요청하면 근무장소의 변경, 배치전환, 유급휴가 명령 등 적절한 조치를 하며, 행위자에 대하여는 지체 없이 징계, 근무장소의 변경 등 필요한 조치를 하기 전에 피해사원의 의견을 듣는다.",
          "조사 과정에 참여한 사람은 조사 과정에서 알게 된 비밀을 피해사원의 의사에 반하여 다른 사람에게 누설하여서는 아니 되며, 회사는 신고한 사원 및 피해사원에게 해고나 그 밖의 불리한 처우를 하지 아니한다.",
        ],
      },
    ],
  },
  {
    chapterNo: 14,
    chapterTitle: "제14장 직장 내 성희롱의 금지 및 예방",
    summary: "직장 내 성희롱 금지, 예방교육(연 1회 이상), 발생 시 조치 및 피해자 보호",
    articles: [
      {
        articleNo: 47,
        title: "직장 내 성희롱의 금지 및 예방교육",
        requirementType: "필수",
        legalBasis: "남녀고용평등법 제12조, 제13조",
        paragraphs: [
          "사업주, 상급자 또는 사원은 직장 내의 지위를 이용하거나 업무와 관련하여 다른 사원에게 성적 언동 등으로 성적 굴욕감 또는 혐오감을 느끼게 하거나 성적 언동 또는 그 밖의 요구 등에 따르지 아니하였다는 이유로 근로조건 및 고용에서 불이익을 주는 직장 내 성희롱 행위를 하여서는 아니 된다.",
          "회사는 직장 내 성희롱을 예방하고 사원이 안전한 근로환경에서 일할 수 있는 여건을 조성하기 위하여 매년 1회 이상, 1시간 이상의 직장 내 성희롱 예방교육을 실시한다.",
        ],
      },
      {
        articleNo: 48,
        title: "직장 내 성희롱 발생 시 조치",
        requirementType: "필수",
        legalBasis: "남녀고용평등법 제14조, 제14조의2",
        paragraphs: [
          "회사는 직장 내 성희롱 신고를 받거나 발생 사실을 알게 된 경우에는 지체 없이 사실 확인을 위한 조사를 실시하며, 조사 기간 동안 피해사원을 보호하기 위하여 근무장소의 변경, 유급휴가 명령 등 적절한 조치를 한다.",
          "조사 결과 직장 내 성희롱 발생 사실이 확인된 때에는 행위자에 대하여 지체 없이 부서전환, 징계 등 필요한 조치를 취하며, 신고자 및 피해사원에게 파면, 해임, 해고, 그 밖에 신분상실이나 인사상 불이익 조치를 하지 아니한다.",
          "고객 등 업무와 밀접한 관련이 있는 제3자가 업무수행 과정에서 성적인 언동 등을 하여 사원이 고충 해소를 요청하는 경우 근무장소 변경, 배치전환, 유급휴가 명령 등 보호조치를 취한다.",
        ],
      },
    ],
  },
  {
    chapterNo: 15,
    chapterTitle: "제15장 안전과 보건 (산업안전보건법 최신 개정 반영)",
    summary: "안전보건관리, 위험성평가, 작업중지권, 폭염·한파 기상재해 대비, 건강진단",
    articles: [
      {
        articleNo: 49,
        title: "안전보건 의무 및 위험성평가",
        requirementType: "필수",
        legalBasis: "근로기준법 제93조 제9호, 산업안전보건법 제36조",
        paragraphs: [
          "회사는 산업안전보건법에 따라 사원의 안전과 건강을 유지·증진하기 위하여 안전하고 쾌적한 작업환경을 조성하며, 정기적으로 사업장 위험성평가를 실시하고 사원을 참여시킨다.",
          "사원은 안전보건 관계 법령 및 회사의 안전수칙을 엄격히 준수하여야 하며, 지급된 안전보호구를 반드시 착용하여야 한다.",
        ],
      },
      {
        articleNo: 50,
        title: "급박한 위험 시 작업중지 및 기상재해(폭염·한파) 대비 조치",
        requirementType: "필수",
        legalBasis: "산업안전보건법 제51조, 제52조, 제39조",
        paragraphs: [
          "사원은 산업재해가 발생할 급박한 위험이 있는 경우에는 작업을 중지하고 대피할 수 있으며, 지체 없이 그 사실을 상급자에게 보고하여야 한다. 회사는 정당한 작업중지 및 대피를 한 사원에게 해고나 그 밖의 불리한 처우를 하지 아니한다.",
          "회사는 폭염, 한파, 미세먼지 등 기상재해로 인하여 사원에게 건강장해가 발생할 우려가 있는 경우 휴식시간 부여, 음용수 및 휴게시설 제공, 작업시간대 조정 등 필요한 보건조치를 취한다.",
        ],
      },
      {
        articleNo: 51,
        title: "건강진단",
        requirementType: "필수",
        legalBasis: "산업안전보건법 제129조~제133조",
        paragraphs: [
          "회사는 사원의 건강보호·유지를 위하여 산업안전보건법이 정하는 바에 따라 정기적으로 일반건강진단(사무직 2년에 1회, 비사무직 1년에 1회) 및 특수건강진단(해당자)을 실시하며, 사원은 정당한 이유 없이 이를 거부하여서는 아니 된다.",
        ],
      },
    ],
  },
  {
    chapterNo: 16,
    chapterTitle: "제16장 재해보상",
    summary: "업무상 재해에 대한 요양·휴업·장해·유족보상",
    articles: [
      {
        articleNo: 52,
        title: "재해보상",
        requirementType: "필수",
        legalBasis: "근로기준법 제78조~제84조, 제93조 제10호, 산업재해보상보험법",
        paragraphs: [
          "사원이 업무상 부상 또는 질병에 걸리거나 사망한 경우에는 근로기준법 및 산업재해보상보험법에 따라 요양보상, 휴업보상, 장해보상, 유족보상 및 장의비를 지급한다.",
          "보상을 받게 될 자가 동일한 사유에 대하여 산업재해보상보험법이나 민법 기타 법령에 따라 재해보상에 상당한 금품을 받은 경우에는 그 가액의 한도 내에서 회사는 보상의 책임을 면한다.",
        ],
      },
    ],
  },
  {
    chapterNo: 17,
    chapterTitle: "제17장 보칙 및 부칙",
    summary: "취업규칙의 게시·비치, 개정절차 및 시행일",
    articles: [
      {
        articleNo: 53,
        title: "취업규칙의 게시 및 열람 보장",
        requirementType: "필수",
        legalBasis: "근로기준법 제14조",
        paragraphs: [
          "회사는 이 규칙과 근로기준법의 주요 내용을 모든 사원이 언제든지 자유롭게 열람하고 확인할 수 있도록 전사 ERP 시스템(취업규칙 메뉴) 및 사업장 내에 상시 게시·비치한다.",
        ],
      },
      {
        articleNo: 54,
        title: "취업규칙의 작성 및 변경 절차",
        requirementType: "필수",
        legalBasis: "근로기준법 제94조",
        paragraphs: [
          "회사는 이 규칙을 작성하거나 변경하는 경우에 사원의 과반수로 조직된 노동조합이 있는 경우에는 그 노동조합, 사원의 과반수로 조직된 노동조합이 없는 경우에는 사원의 과반수의 의견을 들어야 한다.",
          "다만, 이 규칙을 사원에게 불리하게 변경하는 경우에는 그 동의를 받아야 한다.",
        ],
      },
      {
        articleNo: 55,
        title: "시행일 (부칙)",
        requirementType: "필수",
        paragraphs: [
          "이 취업규칙은 제정 및 공고한 날로부터 시행한다. 법령의 개정에 따라 이 규칙의 내용과 상충되는 조항이 있는 경우에는 개정된 관계 법령을 우선 적용한다.",
        ],
      },
    ],
  },
];

interface WorkRulesTabProps {
  currentUser?: any;
}

export const WorkRulesTab: React.FC<WorkRulesTabProps> = () => {
  const [selectedChapterNo, setSelectedChapterNo] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [reqFilter, setReqFilter] = useState<"ALL" | "필수" | "선택">("ALL");

  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOEL_STANDARD_WORK_RULES.map((chapter) => {
      if (selectedChapterNo !== "ALL" && chapter.chapterNo !== selectedChapterNo) {
        return null;
      }
      const matchedArticles = chapter.articles.filter((art) => {
        if (reqFilter !== "ALL" && art.requirementType !== reqFilter) {
          return false;
        }
        if (!q) return true;
        const inTitle = art.title.toLowerCase().includes(q);
        const inBasis = (art.legalBasis || "").toLowerCase().includes(q);
        const inChapter = chapter.chapterTitle.toLowerCase().includes(q);
        const inParagraphs = art.paragraphs.some((p) => p.toLowerCase().includes(q));
        const inArtNo = `제${art.articleNo}조`.includes(q);
        return inTitle || inBasis || inChapter || inParagraphs || inArtNo;
      });
      if (matchedArticles.length === 0) return null;
      return {
        ...chapter,
        articles: matchedArticles,
      };
    }).filter((c): c is WorkRuleChapter => c !== null);
  }, [selectedChapterNo, searchQuery, reqFilter]);

  const totalArticlesCount = useMemo(
    () => MOEL_STANDARD_WORK_RULES.reduce((acc, ch) => acc + ch.articles.length, 0),
    []
  );

  const mandatoryCount = useMemo(
    () =>
      MOEL_STANDARD_WORK_RULES.reduce(
        (acc, ch) => acc + ch.articles.filter((a) => a.requirementType === "필수").length,
        0
      ),
    []
  );

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-[#f4efe4] text-[#1c1917] dark:bg-slate-950 dark:text-slate-100 overflow-hidden select-text">
      {/* Top Header & Scope Bar (Gutenberg Z-Pattern ① & ②) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded border border-[#b5a894] bg-[#ebe5d8] dark:bg-slate-900 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-blue-700 text-white">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#0f172a] dark:text-white">
                표준 취업규칙 (고용노동부 최신 표준안)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                전 임직원 상시 열람 (근로기준법 제14조·제93조)
              </span>
            </div>
            <p className="text-[11px] text-[#57534e] dark:text-slate-400 mt-0.5">
              총 17장 {totalArticlesCount}조 (법정 필수기재사항 {mandatoryCount}개 조항 포함 · 2025~2026 육아지원 3법 및 산업안전보건법 개정사항 반영)
            </p>
          </div>
        </div>

        {/* Filter & Search Pipeline */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[#57534e] dark:text-slate-400">
              구분 필터
            </label>
            <div className="inline-flex rounded border border-[#b5a894] dark:border-slate-700 overflow-hidden bg-[#f4efe4] dark:bg-slate-800 h-8">
              {(["ALL", "필수", "선택"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReqFilter(type)}
                  className={`px-2.5 text-xs font-bold transition whitespace-nowrap ${
                    reqFilter === type
                      ? "bg-blue-700 text-white"
                      : "text-[#44403c] hover:bg-[#e2dbcd] dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {type === "ALL" ? "전체 조항" : `${type} 기재사항`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[#57534e] dark:text-slate-400">
              조문·키워드 검색
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#78716c]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="연차, 육아휴직, 임금, 괴롭힘, 정년 검색"
                className="h-8 w-64 pl-8 pr-2.5 rounded border border-[#b5a894] bg-[#f4efe4] text-xs text-[#1c1917] font-medium focus:outline-none focus:border-blue-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-transparent select-none">인쇄</label>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-8 px-3 rounded border border-[#b5a894] bg-[#dfd7c7] hover:bg-[#d0c6b4] text-[#1c1917] text-xs font-bold inline-flex items-center gap-1.5 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>취업규칙 인쇄</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Split View: Left Chapter Navigation + Right Full Text Reader */}
      <div className="flex flex-1 min-h-0 gap-3 overflow-hidden">
        {/* Left Chapter Index */}
        <div className="w-64 bg-[#ebe5d8] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-2 border-b border-[#b5a894] bg-[#dfd7c7] dark:bg-slate-950 dark:border-slate-800 text-xs font-bold text-[#44403c] dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-blue-700" />
              <span>장별 목차 (제1장~제17장)</span>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setSelectedChapterNo("ALL")}
              className={`w-full text-left px-2.5 py-2 rounded text-xs font-bold transition flex items-center justify-between ${
                selectedChapterNo === "ALL"
                  ? "bg-blue-700 text-white shadow-xs"
                  : "text-[#1c1917] hover:bg-[#dfd7c7] dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span>전체 장 열람 (제1장~제17장)</span>
              <span className="text-[10px] font-mono opacity-80">{totalArticlesCount}조</span>
            </button>

            {MOEL_STANDARD_WORK_RULES.map((ch) => {
              const isSelected = selectedChapterNo === ch.chapterNo;
              return (
                <button
                  key={ch.chapterNo}
                  type="button"
                  onClick={() => setSelectedChapterNo(ch.chapterNo)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition flex flex-col gap-0.5 ${
                    isSelected
                      ? "bg-blue-700 text-white font-bold shadow-xs"
                      : "text-[#1c1917] hover:bg-[#dfd7c7] dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate font-semibold">{ch.chapterTitle}</span>
                    <span className="text-[10px] font-mono opacity-75 shrink-0">
                      {ch.articles.length}조
                    </span>
                  </div>
                  <span
                    className={`text-[10px] truncate ${
                      isSelected ? "text-blue-100" : "text-[#78716c] dark:text-slate-500"
                    }`}
                  >
                    {ch.summary}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Document Body */}
        <div className="flex-1 bg-[#ebe5d8] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-[#b5a894] bg-[#dfd7c7] dark:bg-slate-950 dark:border-slate-800 text-xs font-bold text-[#44403c] dark:text-slate-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>
                주식회사 드래곤알피에이 취업규칙 전문 (고용노동부 표준취업규칙 기준)
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#57534e] dark:text-slate-400">
              조회된 장: {filteredChapters.length}개 / 조문:{" "}
              {filteredChapters.reduce((s, c) => s + c.articles.length, 0)}개
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
            {filteredChapters.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#78716c]">
                검색 조건에 일치하는 취업규칙 조문이 없습니다.
              </div>
            ) : (
              filteredChapters.map((chapter) => (
                <section
                  key={chapter.chapterNo}
                  className="bg-[#f4efe4] dark:bg-slate-950 border border-[#b5a894] dark:border-slate-800 rounded overflow-hidden"
                >
                  {/* Chapter Banner */}
                  <div className="px-4 py-2.5 bg-[#ded6c5] dark:bg-slate-900 border-b border-[#b5a894] dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-[#0f172a] dark:text-white">
                        {chapter.chapterTitle}
                      </h3>
                      <p className="text-[11px] text-[#57534e] dark:text-slate-400">
                        {chapter.summary}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#ebe5d8] text-[#44403c] border border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                      총 {chapter.articles.length}개 조문
                    </span>
                  </div>

                  {/* Articles List */}
                  <div className="divide-y divide-[#d0c6b4] dark:divide-slate-800">
                    {chapter.articles.map((art) => (
                      <article key={art.articleNo} className="p-3.5 flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-blue-900 dark:text-blue-400">
                              제{art.articleNo}조 ({art.title})
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                art.requirementType === "필수"
                                  ? "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                                  : "bg-[#ebe5d8] text-[#57534e] border-[#b5a894] dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                              }`}
                            >
                              {art.requirementType}
                            </span>
                          </div>
                          {art.legalBasis && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#57534e] dark:text-slate-400 bg-[#ebe5d8] dark:bg-slate-900 px-2 py-0.5 rounded border border-[#c4b6a0] dark:border-slate-800">
                              <Scale className="w-3 h-3 text-blue-700" />
                              <span>근거: {art.legalBasis}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 pl-1 text-xs leading-relaxed text-[#1c1917] dark:text-slate-200">
                          {art.paragraphs.map((p, idx) => {
                            const isSubList = /^\d+\./.test(p.trim());
                            return (
                              <p
                                key={idx}
                                className={
                                  isSubList
                                    ? "pl-4 text-[11.5px] text-[#334155] dark:text-slate-300"
                                    : ""
                                }
                              >
                                {!isSubList && art.paragraphs.length > 1 ? `①②③④⑤⑥⑦⑧⑨⑩`[idx] ? `${"①②③④⑤⑥⑦⑧⑨⑩"[idx]} ${p}` : p : p}
                              </p>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Audit / Legal Compliance Bar (Gutenberg Z-Pattern ④) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded border border-[#b5a894] bg-[#dfd7c7] dark:bg-slate-900 dark:border-slate-800 text-xs text-[#44403c] dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span className="font-bold">
            법정 게시 의무 준수: 근로기준법 제14조(법령 요지 등의 게시) 및 제93조(취업규칙의 작성·신고)에 의거하여 전 임직원에게 상시 공개됩니다.
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#57534e] dark:text-slate-400">
          고용노동부 표준취업규칙 (2025~2026 최신 개정안 기준)
        </span>
      </div>
    </div>
  );
};
