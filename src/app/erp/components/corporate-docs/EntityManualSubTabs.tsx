"use client";

import React from "react";
import { ExternalLink, Eye, FileSignature, FolderArchive, Upload } from "lucide-react";
import type { BusinessEntity } from "@/lib/businessEntities";
import type { MainSubTab } from "./corporateDocTypes";

interface CorpManualSubTabProps {
  setSubTab: React.Dispatch<React.SetStateAction<MainSubTab>>;
  jumpToDocumentByCode: (docCode: string, openUpload?: boolean) => void;
}

export const CorpManualSubTab: React.FC<CorpManualSubTabProps> = ({
  setSubTab,
  jumpToDocumentByCode,
}) => {
  return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 text-xs">
          {/* 상단 핵심 법적 근거 요약 배너 */}
          <div className="p-3.5 rounded bg-[#f4efe4] border-2 border-[#047857] dark:bg-slate-900 dark:border-emerald-700 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#047857] text-white font-bold text-[11px]">
                  상법 제363조 제4항·제6항 소규모 법인 특례 적용
                </span>
                <span className="font-extrabold text-sm text-[#0f172a] dark:text-white">
                  주식회사 드래곤알피에이 (자본금 500만원 · 1인 주주 이정용 100%) 정관변경 및 전자등기 표준 절차
                </span>
              </div>
              <p className="text-[#334155] dark:text-slate-300">
                자본금 10억 원 미만의 1인 주주 법인은 <strong>주주총회 소집절차 생략</strong> 및{" "}
                <strong>공증인의 의사록 인증(공증) 면제</strong>가 적용되어,{" "}
                <strong>주주서면결의서 + 개정 정관 + 주주명부</strong>만으로 정관 변경 및 대법원 인터넷등기소 전자등기를 완결할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSubTab("TEMPLATE_STUDIO")}
                className="px-3 py-1.5 rounded bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileSignature className="w-3.5 h-3.5" />
                <span>주주서면결의서·대비표·주주명부 즉시 작성</span>
              </button>
            </div>
          </div>

          {/* 5단계 워크플로우 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* STEP 1 */}
            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-[#c4b6a0] pb-2">
                <span className="font-extrabold text-sm text-[#1e40af] dark:text-blue-400">
                  1단계. 변경 내용 검토 및 등기 필요 여부 판별
                </span>
                <span className="px-2 py-0.5 rounded bg-[#fee2e2] text-[#991b1b] font-bold text-[11px]">
                  등기사항: 결의일로부터 14일 이내 등기 필수
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-[#991b1b] dark:text-red-400">
                    ● 등기사항 (2주 이내 변경등기 필수 / 도과 시 과태료)
                  </div>
                  <ul className="list-disc list-inside text-[#334155] dark:text-slate-300 space-y-0.5 text-[11px]">
                    <li>상호(사명) 변경</li>
                    <li>사업목적(업태/종목) 추가·변경·삭제</li>
                    <li>본점 소재지 이전 규정</li>
                    <li>공고 방법 변경, 발행예정주식총수/1주의 금액</li>
                  </ul>
                </div>
                <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-[#047857] dark:text-emerald-400">
                    ● 비등기사항 (사내 정관 개정 및 보관만으로 완료)
                  </div>
                  <ul className="list-disc list-inside text-[#334155] dark:text-slate-300 space-y-0.5 text-[11px]">
                    <li>회계연도(결산기) 변경</li>
                    <li>이사·감사 수의 범위 규정, 임원 보수·퇴직금 규정</li>
                    <li>배당 규정, 주총 결의 요건, 대표이사 권한 규정</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-[#c4b6a0] pb-2">
                <span className="font-extrabold text-sm text-[#1e40af] dark:text-blue-400">
                  2단계. 1인 주주서면결의서 및 신·구조문대비표 작성
                </span>
                <span className="px-2 py-0.5 rounded bg-[#ecfdf5] text-[#047857] font-bold text-[11px]">
                  공증 면제 (상법 제363조 제4항)
                </span>
              </div>
              <ul className="list-disc list-inside text-[#334155] dark:text-slate-300 space-y-1">
                <li>
                  <strong>주주총회 특별결의 갈음</strong>: 1인 주주(이정용, 보통주 10,000주 100%)의 서면결의서 작성으로 주주총회 결의를 갈음합니다.
                </li>
                <li>
                  <strong>필수 기재사항</strong>: 결의 일자, 결의 장소(본점), 변경 전·후 <strong>[신·구조문대비표]</strong>, 부칙 시행일, 유일 주주 성명 및 기명날인.
                </li>
                <li>
                  <strong>날인 도장 구분 주의</strong>:{" "}
                  <span className="font-bold text-[#991b1b]">
                    주주서면결의서에는 주주 개인인감도장
                  </span>
                  을 날인하고,{" "}
                  <span className="font-bold text-[#1e40af]">
                    주주명부 및 개정 정관 사본(원본대조필)에는 법인인감도장
                  </span>
                  을 날인합니다.
                </li>
              </ul>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-SHAREHOLDER-RES")}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>보관함 연결: 주주서면결의서 (v2.0) 열람</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-SHAREHOLDER-RES", true)}
                  className="px-2.5 py-1 rounded bg-[#047857] text-white font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>주주서면결의서 신규 버전 업로드</span>
                </button>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-[#c4b6a0] pb-2">
                <span className="font-extrabold text-sm text-[#1e40af] dark:text-blue-400">
                  3단계. 정관 수정본 및 주주명부 작성·법인인감 날인
                </span>
                <span className="px-2 py-0.5 rounded bg-[#dbeafe] text-[#1e40af] font-bold text-[11px]">
                  부칙 시행일 명시 필수
                </span>
              </div>
              <ul className="list-disc list-inside text-[#334155] dark:text-slate-300 space-y-1">
                <li>
                  <strong>정관 부칙 추가</strong>: 정관 말미에 <code>부칙 (202X년 X월 X일) 제1조(시행일) 이 정관은 202X년 X월 X일부터 시행한다.</code>를 추가합니다.
                </li>
                <li>
                  <strong>법인인감 간인 및 원본대조필</strong>: 정관 매 장 사이에 대표이사 법인인감으로 간인하고, 표지/말미에 원본대조필 법인인감을 날인하여 PDF로 스캔합니다.
                </li>
                <li>
                  <strong>주주명부 작성</strong>: 결의일 기준 주주명부(보통주 10,000주, 자본금 5,000,000원, 지분 100%) 하단에 대표이사 법인인감을 날인합니다.
                </li>
              </ul>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-ARTICLES")}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>보관함 연결: 정관 (v3.0 확정본) 열람</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-SHAREHOLDER-LIST")}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>보관함 연결: 주주명부 (v3.0) 열람</span>
                </button>
              </div>
            </div>

            {/* STEP 4 */}
            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-[#c4b6a0] pb-2">
                <span className="font-extrabold text-sm text-[#1e40af] dark:text-blue-400">
                  4단계. 등록면허세 납부 및 대법원 인터넷등기소 전자신청
                </span>
                <span className="px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e] font-bold text-[11px]">
                  서울 이택스(ETAX) + 인터넷등기소
                </span>
              </div>
              <ol className="list-decimal list-inside text-[#334155] dark:text-slate-300 space-y-1">
                <li>
                  <strong>등록면허세(정액분) 납부 (서울 ETAX/위택스)</strong>: [신고/납부] → [등록면허세(등록분)] → <code>법인 등기(정액분) - 기타 등기(상호/목적 등 변경)</code> 선택 → 약 <strong>₩48,240</strong> (서울 과밀억제권역 기준, 지방교육세 포함) 납부 후 <strong>납부번호</strong> 확인.
                </li>
                <li>
                  <strong>등기신청수수료 전자납부 (인터넷등기소)</strong>: [전자납부] → [등기신청수수료 전자납부] → 법인 전자신청 기준 <strong>₩2,000</strong> (e-Form 서면은 ₩4,000).
                </li>
                <li>
                  <strong>인터넷등기소 전자신청서 작성</strong>: [법인등기] → [전자신청] → [신청서 작성 및 제출] → 등기목적: <code>주식회사 변경등기</code> → 등기사유 및 변경할 목적/상호 입력 → 등록면허세 납부번호 연계.
                </li>
                <li>
                  <strong>전자 첨부서면 PDF 업로드 및 전자서명</strong>: ①주주서면결의서(신구조문대비표 포함), ②개정 정관 사본, ③주주명부 PDF 첨부 후 <strong>법인 전자증명서(USB)</strong> 및 <strong>대표자 개인 공동인증서</strong>로 전자서명 후 제출.
                </li>
              </ol>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-LICENSE-TAX")}
                  className="px-2.5 py-1 rounded bg-[#334155] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>보관함 연결: 등록면허세 납부확인서</span>
                </button>
                <a
                  href="http://www.iros.go.kr"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-[#e2dbcd] border border-[#b5a894] text-[#0f172a] font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>대법원 인터넷등기소 바로가기</span>
                </a>
                <a
                  href="https://etax.seoul.go.kr"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-[#e2dbcd] border border-[#b5a894] text-[#0f172a] font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>서울시 ETAX 바로가기</span>
                </a>
              </div>
            </div>
          </div>

          {/* STEP 5: 등기 교합 완료 후 후속 조치 (사업자등록 정정 + ERP 보관함 최신화) */}
          <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-[#c4b6a0] pb-2">
              <span className="font-extrabold text-sm text-[#047857] dark:text-emerald-400">
                5단계. 등기 교합 완료 후 사후 행정 절차 (국세청 홈택스 사업자등록 정정 & ERP 버전 등록)
              </span>
              <span className="px-2 py-0.5 rounded bg-[#dbeafe] text-[#1e40af] font-bold text-[11px]">
                교합 완료 후 1~2일 내 즉시 실행
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] space-y-1.5">
                <div className="font-bold text-[#0f172a]">① 변경된 법인등기사항전부증명서 발급</div>
                <p className="text-[11px] text-[#334155]">
                  인터넷등기소에서 교합완료 확인 즉시 변경된 등기사항전부증명서(현재 유효사항) PDF를 발급받아 ERP 보관함 <strong>법인 등기사항전부증명서</strong>의 신규 버전으로 업로드합니다.
                </p>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-REGISTRY-CERT", true)}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>등기부등본 신규 버전 업로드</span>
                </button>
              </div>

              <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] space-y-1.5">
                <div className="font-bold text-[#0f172a]">② 국세청 홈택스 법인 사업자등록 정정신고</div>
                <p className="text-[11px] text-[#334155]">
                  홈택스 → [국세증명·사업자등록·세금관련 신청/신고] → <strong>[사업자등록 정정(법인)]</strong>에서 업태/종목(사업목적), 상호, 주소 등을 정정 신청합니다. (첨부: 변경 후 등기부등본, 개정 정관 사본, 기존 사업자등록증)
                </p>
                <a
                  href="https://www.hometax.go.kr"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-[#047857] text-white font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>국세청 홈택스 바로가기</span>
                </a>
              </div>

              <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] space-y-1.5">
                <div className="font-bold text-[#0f172a]">③ 정정된 법인 사업자등록증 ERP 버전 등록</div>
                <p className="text-[11px] text-[#334155]">
                  세무서 처리 완료 후 재교부된 법인 사업자등록증(806-88-03266) 및 사업자등록증명을 PDF로 저장하여 ERP 보관함에 신규 버전으로 등록합니다.
                </p>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-BIZ-CERT", true)}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>법인 사업자등록증 신규 버전 업로드</span>
                </button>
              </div>
            </div>
          </div>
        </div>
  );
};

interface IndivManualSubTabProps {
  corp: BusinessEntity;
  indiv: BusinessEntity;
  indivDocCount: number;
  setSubTab: React.Dispatch<React.SetStateAction<MainSubTab>>;
  setEntityFilter: React.Dispatch<React.SetStateAction<"ALL" | "CORP" | "INDIVIDUAL">>;
  jumpToDocumentByCode: (docCode: string, openUpload?: boolean) => void;
}

export const IndivManualSubTab: React.FC<IndivManualSubTabProps> = ({
  corp,
  indiv,
  indivDocCount,
  setSubTab,
  setEntityFilter,
  jumpToDocumentByCode,
}) => {
  return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 text-xs">
          {/* 상단 개인사업장 비교 요약 배너 */}
          <div className="p-3.5 rounded bg-[#f4efe4] border-2 border-[#b45309] dark:bg-slate-900 dark:border-amber-700 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#b45309] text-white font-bold text-[11px]">
                  개인사업장 전용 행정 절차 (등기소 절차 없음)
                </span>
                <span className="font-extrabold text-sm text-[#0f172a] dark:text-white">
                  드래곤알피에이 [개인] (사업자등록번호: {indiv.bizNum} / 대표자: {indiv.ceoName}) 운영 매뉴얼
                </span>
              </div>
              <p className="text-[#334155] dark:text-slate-300">
                개인사업자는 상법상 법인이 아니므로 <strong>정관, 주주서면결의서, 법인등기부등본 변경등기 및 등록면허세(₩48,240) 납부 의무가 일절 없습니다.</strong>{" "}
                업종(업태·종목) 추가, 사업장 주소 이전(현재: <strong>{indiv.address}</strong>), 상호 변경 등 모든 변경사항은{" "}
                <strong>국세청 홈택스 [사업자등록 정정(개인)]</strong> 신청만으로 즉시 완결됩니다.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSubTab("VAULT");
                  setEntityFilter("INDIVIDUAL");
                }}
                className="px-3 py-1.5 rounded bg-[#b45309] hover:bg-[#92400e] text-white font-bold flex items-center gap-1.5 whitespace-nowrap"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>개인사업장 중요문서 보관함 보기 ({indivDocCount}종)</span>
              </button>
            </div>
          </div>

          {/* 법인 vs 개인사업장 핵심 차이점 비교표 */}
          <div className="bg-[#f4efe4] border border-[#b5a894] rounded overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] font-extrabold text-xs">
              법인사업장 vs 개인사업장 변경 행정절차 1:1 비교
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#dcd4c4] font-bold border-b border-[#b5a894]">
                  <tr>
                    <th className="py-2 px-3 whitespace-nowrap">업무 구분</th>
                    <th className="py-2 px-3 whitespace-nowrap text-[#1e40af]">
                      법인사업장 — 주식회사 드래곤알피에이 ({corp.bizNum})
                    </th>
                    <th className="py-2 px-3 whitespace-nowrap text-[#92400e]">
                      개인사업장 — 드래곤알피에이 ({indiv.bizNum})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c4b6a0]">
                  <tr>
                    <td className="py-2 px-3 font-bold whitespace-nowrap">사업목적(업종) 추가·변경</td>
                    <td className="py-2 px-3">
                      1인 주주서면결의서 + 정관 개정 ➔ 인터넷등기소 변경등기(14일 이내, 약 5만원) ➔ 홈택스 사업자등록 정정(법인)
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#047857]">
                      등기·정관 불필요 ➔ 홈택스 [사업자등록 정정(개인)]에서 주업종/부업종 즉시 추가 (수수료 ₩0)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold whitespace-nowrap">사업장 소재지(주소) 이전</td>
                    <td className="py-2 px-3">
                      본점 이전 결의 ➔ 등기소 본점이전 변경등기 ➔ 홈택스 사업자등록 정정(법인)
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#047857]">
                      홈택스 [사업자등록 정정(개인)] 주소 변경 신청 (자가/주민등록지 이전 시 임대차계약서 생략 가능, 현재: {indiv.address})
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold whitespace-nowrap">자본금 / 지분 구조</td>
                    <td className="py-2 px-3">
                      납입자본금 ₩5,000,000 (1주 ₩500 × 10,000주) / 증자·감자 시 변경등기 필수
                    </td>
                    <td className="py-2 px-3">
                      법정 자본금 및 주식 개념 없음 (대표자 개인 출자금·인출금으로 회계 처리)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold whitespace-nowrap">필수 보관 중요문서</td>
                    <td className="py-2 px-3">
                      정관, 등기사항전부증명서, 주주서면결의서, 주주명부, 법인 사업자등록증, 통장사본, 중소기업/SW사업자 확인서
                    </td>
                    <td className="py-2 px-3">
                      개인 사업자등록증, 사업자등록증명, 사업용 통장사본(140-129404-04-018), 중소기업 확인서, SW사업자 확인서
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 개인사업장 3대 핵심 운영 절차 카드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2">
              <div className="font-extrabold text-sm text-[#92400e] border-b border-[#c4b6a0] pb-1.5">
                절차 1. 개인사업장 주소 이전 및 정정신고
              </div>
              <ul className="list-disc list-inside text-[#334155] space-y-1 text-[11px]">
                <li>
                  <strong>현재 등록 주소</strong>: <code>{indiv.address}</code>
                </li>
                <li>
                  <strong>신청 경로</strong>: 국세청 홈택스 → [국세증명·사업자등록·세금관련 신청/신고] → [사업자등록 신청·정정·휴폐업] → <strong>[사업자등록 정정(개인)]</strong>
                </li>
                <li>
                  <strong>첨부 서류</strong>: 타인 소유 사업장 임차 시 임대차계약서 사본 1부 (본인 소유 주택/아파트 사업장인 경우 별도 임대차계약서 없이 등기부 조회로 즉시 승인).
                </li>
                <li>
                  <strong>사후 조치</strong>: 정정된 사업자등록증 PDF 발급 후 아래 버튼으로 ERP 버전 히스토리에 등록 및 세금계산서 공급자 주소 동기화.
                </li>
              </ul>
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("IND-DOC-BIZ-CERT")}
                  className="px-2.5 py-1 rounded bg-[#b45309] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>[개인] 사업자등록증 열람</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("IND-DOC-BIZ-CERT", true)}
                  className="px-2.5 py-1 rounded bg-[#047857] text-white font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>정정본 업로드</span>
                </button>
              </div>
            </div>

            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2">
              <div className="font-extrabold text-sm text-[#92400e] border-b border-[#c4b6a0] pb-1.5">
                절차 2. 개인사업장 업태·종목(업종) 추가·변경
              </div>
              <ul className="list-disc list-inside text-[#334155] space-y-1 text-[11px]">
                <li>
                  <strong>정관 변경 불필요</strong>: 법인과 달리 정관이나 등기 절차가 없으므로 홈택스에서 업종코드만 추가하면 당일~익일 내 정정 완료됩니다.
                </li>
                <li>
                  <strong>신청 방법</strong>: 홈택스 [사업자등록 정정(개인)] → [업종 정정] 체크 → 업종코드 검색 후 부업종 추가 또는 주업종 변경 제출.
                </li>
                <li>
                  <strong>인허가 업종 주의</strong>: 통신판매업 등 신고/인허가 업종 추가 시 정부24에서 통신판매업 신고증 발급 및 관할 구청 등록면허세 납부 병행.
                </li>
              </ul>
              <div className="pt-1 flex items-center gap-2">
                <a
                  href="https://www.hometax.go.kr"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-[#334155] text-white font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>홈택스 사업자등록 정정 바로가기</span>
                </a>
              </div>
            </div>

            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2">
              <div className="font-extrabold text-sm text-[#92400e] border-b border-[#c4b6a0] pb-1.5">
                절차 3. 개인사업장 필수 인증서류 갱신 관리
              </div>
              <ul className="list-disc list-inside text-[#334155] space-y-1 text-[11px]">
                <li>
                  <strong>사업용 계좌 (홈택스 신고 필수)</strong>: IBK기업은행 <code>{indiv.bankAccountNo}</code> 통장사본 보관.
                </li>
                <li>
                  <strong>중소기업(소상공인) 확인서</strong>: 매년 종합소득세 확정신고 후 중소기업현황정보시스템(sminfo.mss.go.kr)에서 유효기간 갱신 발급 후 ERP에 버전 추가.
                </li>
                <li>
                  <strong>소프트웨어사업자 확인서</strong>: SW산업정보종합시스템(swit.or.kr)에서 결산 재무제표 반영 후 발급 및 ERP 버전 추가.
                </li>
              </ul>
              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("IND-DOC-BANK-BOOK")}
                  className="px-2 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>[개인] 통장사본</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("IND-DOC-SME-CERT")}
                  className="px-2 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>[개인] 중소기업확인서</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("IND-DOC-SW-BIZ-CERT")}
                  className="px-2 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>[개인] SW사업자확인서</span>
                </button>
              </div>
            </div>
          </div>
        </div>
  );
};
