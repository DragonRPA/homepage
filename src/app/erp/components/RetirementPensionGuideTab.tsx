"use client";

import React from "react";
import { Printer, ExternalLink, Landmark, ShieldCheck, CheckCircle2, HelpCircle } from "lucide-react";

export const RetirementPensionGuideTab: React.FC<{ currentUser?: any }> = () => {
  const handlePrint = () => {
    const win = window.open("/docs/retirement-pension-guide.html", "_blank");
    if (win) {
      win.onload = () => {
        win.focus();
        win.print();
      };
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5 text-xs select-text">
      {/* 상단 액션 바 */}
      <div className="erp-panel p-4 rounded border flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-700 text-white text-[11px] font-bold">
              인사·노무 안내문
            </span>
            <h1 className="text-base md:text-lg font-extrabold tracking-tight">
              (주)드래곤알피에이 퇴직연금 제도 도입 안내 및 의견 조회
            </h1>
          </div>
          <p className="text-xs opacity-75 mt-1">
            발행처: 주식회사 드래곤알피에이 (806-88-03266) | 대상: 재직 상용직 임직원 전원 | 작성일: 2026-11-01
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/docs/retirement-pension-guide.html"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded border text-xs font-bold flex items-center gap-1.5 erp-action-btn"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            <span>새 창으로 열기</span>
          </a>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>A4 인쇄 / PDF 저장</span>
          </button>
        </div>
      </div>

      {/* 1. 퇴직연금 제도 도입 목적 및 임직원 혜택 */}
      <div className="erp-panel p-4 md:p-5 rounded border space-y-3">
        <div className="flex items-center gap-2 border-b pb-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <h2 className="text-sm font-extrabold">1. 퇴직연금 제도 도입 목적 및 임직원 혜택</h2>
        </div>
        <p className="text-xs leading-relaxed opacity-90">
          당사는 임직원의 안정적인 퇴직급여 수급권을 법적으로 보호하고, 단순 적립을 넘어 재직 중 운용 수익과 세제 혜택을 함께 누릴 수 있도록 기존 <strong>사내 퇴직금 제도</strong>에서 <strong>외부 금융기관 퇴직연금 제도(DC형 / 기금형)</strong>로 전환하고자 합니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded border bg-black/[0.02] dark:bg-white/[0.02] space-y-1">
            <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400">01. 퇴직금 수급권 100% 보장</div>
            <div className="text-sm font-extrabold">본인 명의 계좌 매월 적립</div>
            <p className="text-xs opacity-80 leading-relaxed">
              회사가 매월(또는 매년) 급여의 1/12(8.33% 이상)을 공단 또는 금융기관 내 근로자 개인 계좌로 직접 납입하여 체불 위험이 원천 차단됩니다.
            </p>
          </div>
          <div className="p-3.5 rounded border bg-black/[0.02] dark:bg-white/[0.02] space-y-1">
            <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400">02. 운용 수익 전액 근로자 귀속</div>
            <div className="text-sm font-extrabold">복리 이자 + 투자 수익 합산</div>
            <p className="text-xs opacity-80 leading-relaxed">
              납입된 부담금에서 발생하는 이자·배당·운용수익은 전액 근로자 본인의 퇴직연금 자산에 가산되며, 재직 중 발생한 수익에는 이자·배당소득세(15.4%)가 과세이연됩니다.
            </p>
          </div>
          <div className="p-3.5 rounded border bg-black/[0.02] dark:bg-white/[0.02] space-y-1">
            <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400">03. 연말정산 세액공제 및 정부지원</div>
            <div className="text-sm font-extrabold">연 최대 148.5만 원 환급</div>
            <p className="text-xs opacity-80 leading-relaxed">
              근로자가 희망 시 본인 부담금을 추가 납입하면 연 최대 900만 원 한도 내에서 13.2%~16.5% 세액공제를 받으며, 푸른씨앗 선택 시 조건 충족 근로자는 정부지원금 10%가 추가 적립됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 2. 가입 자격 및 적립 기준 */}
      <div className="erp-panel p-4 md:p-5 rounded border space-y-3">
        <div className="flex items-center gap-2 border-b pb-2.5">
          <Landmark className="w-4 h-4 text-blue-600 shrink-0" />
          <h2 className="text-sm font-extrabold">2. 가입 자격 및 적립 기준 (확정기여형 표준)</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr className="border-b">
                <th className="py-2.5 px-3 text-left font-bold bg-black/[0.03] dark:bg-white/[0.03] w-44 whitespace-nowrap border">
                  가입 대상 자격
                </th>
                <td className="py-2.5 px-3 border leading-relaxed">
                  <strong>계속근로기간 1년 이상 재직 중인 상용직 근로자</strong>
                  <div className="text-[11px] opacity-70 mt-0.5">
                    ※ 입사 1년 미만 근로자는 근속 만 1년이 도래하는 시점에 가입자로 추가 등록됩니다.
                  </div>
                </td>
              </tr>
              <tr className="border-b">
                <th className="py-2.5 px-3 text-left font-bold bg-black/[0.03] dark:bg-white/[0.03] whitespace-nowrap border">
                  회사 의무 부담금
                </th>
                <td className="py-2.5 px-3 border leading-relaxed">
                  근로자별 <strong>연간 임금총액의 12분의 1 이상 (월 급여의 약 8.33%)</strong>을 전액 회사가 부담하여 납입
                  <div className="text-[11px] opacity-70 mt-0.5">
                    ※ 근로자 급여에서 공제되는 금액은 0원이며, 100% 회사 부담으로 별도 적립됩니다.
                  </div>
                </td>
              </tr>
              <tr>
                <th className="py-2.5 px-3 text-left font-bold bg-black/[0.03] dark:bg-white/[0.03] whitespace-nowrap border">
                  퇴직 시 수령 방법
                </th>
                <td className="py-2.5 px-3 border leading-relaxed">
                  퇴직 시 근로자 본인이 지정한 <strong>개인형 퇴직연금(IRP) 계좌</strong>로 일시금 또는 연금 형태로 이전 수령 (만 55세 이후 연금 수령 시 퇴직소득세 30~40% 감면)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 도입 후보 2대 제도 핵심 비교 */}
      <div className="erp-panel p-4 md:p-5 rounded border space-y-4">
        <div className="flex items-center gap-2 border-b pb-2.5">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <h2 className="text-sm font-extrabold">
            3. 도입 후보 2대 제도 핵심 비교: 『푸른씨앗(기금형)』 vs 『일반 금융기관 DC형』
          </h2>
        </div>

        <p className="text-xs opacity-90">
          근로자 과반수의 의견에 따라 아래 두 가지 제도 중 <strong>1개를 회사 표준 퇴직연금 제도로 선택</strong>하여 도입합니다. 각 제도의 차이점과 장단점을 확인해 주시기 바랍니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 제1안 카드 */}
          <div className="p-4 rounded border-2 border-blue-700 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/20 space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-extrabold text-blue-900 dark:text-blue-200">
                제1안: 중소기업퇴직연금기금 『푸른씨앗』
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold whitespace-nowrap">
                근로복지공단 운영
              </span>
            </div>
            <ul className="space-y-1.5 text-xs leading-relaxed list-disc pl-4">
              <li>
                <strong>운용 주체:</strong> 근로복지공단 + 전담 자산운용사 (미래에셋자산운용·삼성자산운용)
              </li>
              <li>
                <strong>장점 1 (편리성·수익성):</strong> 직원이 직접 상품을 고르거나 매매할 필요 없이, 국가 기금 전문가가 글로벌 채권·주식에 분산 투자하여 안정적인 수익(최근 누적 연환산 6~7%대)을 창출합니다. (원금 100% 보장을 원할 경우 원리금보장형 선택 가능)
              </li>
              <li>
                <strong>장점 2 (정부지원금):</strong> 월 평균보수 268만 원 미만 근로자에게는 <strong>회사 부담금의 10%에 해당하는 금액을 국가가 근로자 연금계좌에 3년간 추가 적립</strong>해 줍니다.
              </li>
              <li>
                <strong>장점 3 (수수료 0원):</strong> 운용·자산관리 수수료가 100% 면제되어 근로자 추가 납입 시에도 차감되는 수수료가 없습니다.
              </li>
              <li>
                <strong>단점(제약):</strong> 근로자 개인이 개별 주식형 ETF(예: 미국 S&P500, 나스닥100 등)를 직접 골라 매매할 수는 없습니다.
              </li>
            </ul>
          </div>

          {/* 제2안 카드 */}
          <div className="p-4 rounded border bg-black/[0.015] dark:bg-white/[0.015] space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-extrabold">
                제2안: 일반 금융기관 『DC형 (확정기여형)』
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold whitespace-nowrap">
                은행·증권사 운영
              </span>
            </div>
            <ul className="space-y-1.5 text-xs leading-relaxed list-disc pl-4">
              <li>
                <strong>운용 주체:</strong> 근로자 본인 직접 운용 (IBK기업은행 또는 미래에셋·삼성증권 등)
              </li>
              <li>
                <strong>장점 1 (직접 투자 자율성):</strong> 근로자가 스마트폰 앱에서 정기예금, 펀드, 국내외 상장 ETF(미국 S&P500, 나스닥100, 배당ETF 등), TDF를 직접 선택하여 매수·교체할 수 있습니다.
              </li>
              <li>
                <strong>장점 2 (포트폴리오 맞춤화):</strong> 투자 경험이 풍부한 직원의 경우 본인만의 공격적(실적배당형 70% + 안전자산 30%) 또는 보수적(정기예금 100%) 포트폴리오를 자유롭게 구성할 수 있습니다.
              </li>
              <li>
                <strong>단점 1 (관리 번거로움):</strong> 본인이 직접 예금 만기 재예치나 ETF 리밸런싱을 챙겨야 하며, 방치할 경우 연 2~3%대 낮은 금리에 머물거나 투자 손실이 발생할 수 있습니다.
              </li>
              <li>
                <strong>단점 2 (정부지원금 없음):</strong> 저임금 근로자 대상 국가 추가 적립 지원금(10%) 혜택이 없으며, 개인 추가 납입금에 대해 소정의 운용수수료가 부과될 수 있습니다.
              </li>
            </ul>
          </div>
        </div>

        {/* 1:1 비교 테이블 */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-black/[0.04] dark:bg-white/[0.04]">
                <th className="py-2.5 px-3 border text-left font-bold w-40 whitespace-nowrap">비교 항목</th>
                <th className="py-2.5 px-3 border text-left font-bold bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200">
                  제1안: 근로복지공단 『푸른씨앗』 (기금형)
                </th>
                <th className="py-2.5 px-3 border text-left font-bold">
                  제2안: 은행·증권사 『일반 DC형』 (개별운용형)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="py-2.5 px-3 border text-left font-bold bg-black/[0.02] dark:bg-white/[0.02] whitespace-nowrap">
                  운영 및 수탁기관
                </th>
                <td className="py-2.5 px-3 border bg-blue-50/20 dark:bg-blue-950/10">
                  <strong>근로복지공단</strong> (전담운용: 미래에셋·삼성자산운용, 수탁: 기업·국민은행)
                </td>
                <td className="py-2.5 px-3 border">
                  <strong>시중 은행 또는 증권사</strong> (IBK기업은행, 미래에셋증권 등)
                </td>
              </tr>
              <tr>
                <th className="py-2.5 px-3 border text-left font-bold bg-black/[0.02] dark:bg-white/[0.02] whitespace-nowrap">
                  적립금 운용 방식
                </th>
                <td className="py-2.5 px-3 border bg-blue-50/20 dark:bg-blue-950/10 leading-relaxed">
                  <strong>[자동 운용]</strong> 전문가 통합 기금운용 (채권 약 70% + 주식 등 30%)<br />
                  ※ 원금 손실을 원치 않는 직원은 <strong>‘원리금보장형(정기예금)’</strong> 전환 가능
                </td>
                <td className="py-2.5 px-3 border leading-relaxed">
                  <strong>[본인 직접 운용]</strong> 근로자가 앱에서 정기예금, 펀드, ETF를 직접 선택·매매<br />
                  ※ 미지정 시 디폴트옵션(사전지정운용제도) 상품으로 운용
                </td>
              </tr>
              <tr>
                <th className="py-2.5 px-3 border text-left font-bold bg-black/[0.02] dark:bg-white/[0.02] whitespace-nowrap">
                  기대 수익률 수준
                </th>
                <td className="py-2.5 px-3 border bg-blue-50/20 dark:bg-blue-950/10 leading-relaxed">
                  <strong>연 6% ~ 7% 수준</strong> (2022년 출범 이후 누적 연환산 기준)<br />
                  원리금보장형 선택 시 연 3%대 중후반 우대금리 적용
                </td>
                <td className="py-2.5 px-3 border leading-relaxed">
                  • 정기예금 위주 방치 시: <strong>연 2.5% ~ 3.3% 수준</strong><br />
                  • 직접 ETF 투자 시: 시장 상황에 따라 고수익 또는 원금 손실 가능
                </td>
              </tr>
              <tr>
                <th className="py-2.5 px-3 border text-left font-bold bg-black/[0.02] dark:bg-white/[0.02] whitespace-nowrap">
                  저임금 근로자 정부지원금
                </th>
                <td className="py-2.5 px-3 border bg-blue-50/20 dark:bg-blue-950/10 leading-relaxed">
                  <strong>[지원 있음]</strong> <strong>월 평균보수 268만 원 미만 근로자</strong>에게 회사 부담금의 <strong>10%를 국가가 근로자 계좌에 추가 지급</strong> (3년간, 연 최대 약 23만 원 추가 적립)
                </td>
                <td className="py-2.5 px-3 border">
                  <strong>[지원 없음]</strong> 정부 재정지원금 혜택 해당 없음
                </td>
              </tr>
              <tr>
                <th className="py-2.5 px-3 border text-left font-bold bg-black/[0.02] dark:bg-white/[0.02] whitespace-nowrap">
                  운용·자산관리 수수료
                </th>
                <td className="py-2.5 px-3 border bg-blue-50/20 dark:bg-blue-950/10">
                  <strong>완전 무료 (0원)</strong> — 근로자 개인 추가 납입금도 수수료 0원
                </td>
                <td className="py-2.5 px-3 border">
                  회사 부담분은 회사가 납부 / 근로자 개인 추가 납입분은 연 0.2~0.3% 차감
                </td>
              </tr>
              <tr>
                <th className="py-2.5 px-3 border text-left font-bold bg-black/[0.02] dark:bg-white/[0.02] whitespace-nowrap">
                  중도인출 및 담보대출
                </th>
                <td className="py-2.5 px-3 border bg-blue-50/20 dark:bg-blue-950/10 leading-relaxed">
                  <strong>동일하게 가능</strong> (무주택자 주택 구입, 전세금/보증금 부담, 6개월 이상 요양 등 법정 사유 발생 시 중도인출 가능)
                </td>
                <td className="py-2.5 px-3 border leading-relaxed">
                  <strong>동일하게 가능</strong> (무주택자 주택 구입, 전세금/보증금 부담, 6개월 이상 요양 등 법정 사유 발생 시 중도인출 가능)
                </td>
              </tr>
              <tr>
                <th className="py-2.5 px-3 border text-left font-bold bg-black/[0.02] dark:bg-white/[0.02] whitespace-nowrap">
                  연말정산 세액공제
                </th>
                <td className="py-2.5 px-3 border bg-blue-50/20 dark:bg-blue-950/10">
                  <strong>동일 적용</strong> (연 900만 원 한도, 총급여 5,500만 원 이하 16.5% / 초과 13.2% 공제)
                </td>
                <td className="py-2.5 px-3 border">
                  <strong>동일 적용</strong> (연 900만 원 한도, 총급여 5,500만 원 이하 16.5% / 초과 13.2% 공제)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. 임직원 실무 Q&A */}
      <div className="erp-panel p-4 md:p-5 rounded border space-y-3">
        <div className="flex items-center gap-2 border-b pb-2.5">
          <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
          <h2 className="text-sm font-extrabold">4. 임직원이 꼭 알아야 할 실무 Q&A</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr className="border-b">
                <th className="py-2.5 px-3 border text-left font-bold bg-black/[0.02] dark:bg-white/[0.02] w-64">
                  Q1. 퇴직연금에 가입하면 내 월급 실수령액이 줄어드나요?
                </th>
                <td className="py-2.5 px-3 border leading-relaxed">
                  <strong>전혀 줄어들지 않습니다.</strong> 퇴직연금 부담금(월 급여의 1/12)은 직원 급여에서 공제하는 것이 아니라, <strong>회사가 별도 예산으로 100% 추가 부담</strong>하여 직원 명의의 퇴직연금 계좌에 넣어주는 금액입니다.
                </td>
              </tr>
              <tr className="border-b">
                <th className="py-2.5 px-3 border text-left font-bold bg-black/[0.02] dark:bg-white/[0.02]">
                  Q2. 푸른씨앗 가입 후 원금 손실이 걱정되면 어떻게 하나요?
                </th>
                <td className="py-2.5 px-3 border leading-relaxed">
                  푸른씨앗은 가입자 본인이 언제든지 모바일 앱/웹에서 <strong>[기금운용형(미래에셋·삼성자산운용)]</strong>과 <strong>[원리금보장형(우대금리 정기예금)]</strong> 중 선택·변경할 수 있습니다. 원금 보장을 원하시면 원리금보장형을 선택하시면 됩니다.
                </td>
              </tr>
              <tr className="border-b">
                <th className="py-2.5 px-3 border text-left font-bold bg-black/[0.02] dark:bg-white/[0.02]">
                  Q3. 집을 사거나 전세보증금이 필요할 때 중도인출이 가능한가요?
                </th>
                <td className="py-2.5 px-3 border leading-relaxed">
                  네, 『푸른씨앗』과 『일반 DC형』 모두 근로자퇴직급여 보장법이 정한 사유(<strong>① 무주택자인 근로자가 본인 명의로 주택을 구입하는 경우, ② 무주택자인 근로자가 주거 목적으로 전세금 또는 보증금을 부담하는 경우, ③ 본인·배우자·부양가족의 6개월 이상 요양 등</strong>)에 해당하면 적립금의 100%까지 중도인출이 가능합니다.
                </td>
              </tr>
              <tr>
                <th className="py-2.5 px-3 border text-left font-bold bg-black/[0.02] dark:bg-white/[0.02]">
                  Q4. 아직 입사한 지 1년이 안 된 직원은 어떻게 되나요?
                </th>
                <td className="py-2.5 px-3 border leading-relaxed">
                  법정 퇴직급여는 계속근로기간 1년 이상부터 발생하므로, <strong>입사 만 1년이 되는 날</strong>에 퇴직연금 가입자로 정식 편입되어 적립이 이루어집니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. 동의 및 선호 제도 의견서 양식 */}
      <div className="erp-panel p-4 md:p-5 rounded border-2 border-slate-700 dark:border-slate-400 space-y-3">
        <div className="text-center space-y-1">
          <h3 className="text-sm font-extrabold">퇴직연금 제도 도입 설명 확인 및 선호 제도 의견서</h3>
          <p className="text-xs opacity-80">
            위 퇴직연금 제도 도입 안내 및 두 가지 후보 상품(제1안 푸른씨앗 / 제2안 일반 금융기관 DC형)에 대한 설명을 충분히 청취하였으며, 당사 퇴직연금 제도 도입에 동의하고 아래와 같이 희망 제도를 선택합니다.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-black/[0.04] dark:bg-white/[0.04]">
                <th className="py-2.5 px-3 border text-center font-bold w-28">성명</th>
                <th className="py-2.5 px-3 border text-center font-bold w-24">직급</th>
                <th className="py-2.5 px-3 border text-center font-bold">희망 퇴직연금 제도 선택 (체크 ☑)</th>
                <th className="py-2.5 px-3 border text-center font-bold w-28">도입 동의</th>
                <th className="py-2.5 px-3 border text-center font-bold w-28">서명 (인)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "장 종 순", pos: "부장" },
                { name: "박 종 환", pos: "대리" },
                { name: "김 승 지", pos: "사원" },
              ].map((emp) => (
                <tr key={emp.name}>
                  <td className="py-3 px-3 border text-center font-bold">{emp.name}</td>
                  <td className="py-3 px-3 border text-center">{emp.pos}</td>
                  <td className="py-3 px-3 border text-center">
                    □ 제1안: 푸른씨앗 (기금형) &nbsp;&nbsp;&nbsp;&nbsp; □ 제2안: 일반 DC형
                  </td>
                  <td className="py-3 px-3 border text-center">□ 동의함</td>
                  <td className="py-3 px-3 border text-center opacity-50">(서명)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
