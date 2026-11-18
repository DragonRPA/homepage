"use client";

import React from "react";
import { Copy, Printer } from "lucide-react";
import type { BusinessEntity } from "@/lib/businessEntities";
import type { TemplateStudioState } from "./corporateDocTypes";

export interface TemplateStudioPreviewSheetProps extends TemplateStudioState {
  corp: BusinessEntity;
  handleCopyTemplate: () => void;
  handlePrintTemplate: () => void;
}

const SHEET_FONT_STYLE: React.CSSProperties = {
  fontFamily: "'Malgun Gothic', '맑은 고딕', 'Dotum', '돋움', sans-serif",
};

const OUTER_TABLE_STYLE: React.CSSProperties = {
  border: "1.5px solid #000",
  tableLayout: "fixed",
};

const CELL_BORDER_STYLE: React.CSSProperties = {
  border: "1px solid #000",
};

const SLATE_TABLE_STYLE: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  tableLayout: "fixed",
};

const SLATE_BORDER_STYLE: React.CSSProperties = {
  border: "1px solid #cbd5e1",
};

function renderArticleLines(text: string, highlightNew = false) {
  return text.split("\n").map((line, i) => {
    if (!highlightNew) return <div key={i}>{line}</div>;
    const isBold = line.includes("(신설)") || line.includes("(조항");
    return (
      <div key={i} className={isBold ? "font-bold" : ""}>
        {line}
      </div>
    );
  });
}

/** 우측 7컬럼 실시간 서식 원문 A4 프리뷰 및 인쇄/복사 시트 */
export const TemplateStudioPreviewSheet: React.FC<TemplateStudioPreviewSheetProps> = ({
  corp,
  tplType,
  tplBaseDateText,
  tplShareholderName,
  tplShareholderRegNo,
  tplShareholderZip,
  tplShareholderPhone,
  tplShareholderShares,
  tplShareholderParValue,
  tplShareholderAmount,
  tplShareholderRatio,
  tplShareholderRel,
  tplShareholderNote,
  tplBlankRowsCount,
  tplResolutionDate,
  tplResolutionDateKor,
  tplEffectiveDate,
  tplAgendaTitle,
  tplAgendaBody,
  tplCompareTableTitle,
  tplArticleNo,
  tplBeforeText,
  tplAfterText,
  tplReasonText,
  tplShareholderAddr,
  handleCopyTemplate,
  handlePrintTemplate,
}) => {
  return (
    <div className="lg:col-span-7 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
      <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] flex items-center justify-between">
        <span className="font-extrabold text-xs">
          {tplType === "SHAREHOLDER_STATEMENT"
            ? "주주명세서 A4 정밀 양식 미리보기 (도장 제거됨)"
            : tplType === "RESOLUTION"
            ? "주주서면결의서 정밀 양식 미리보기 (간인·인감도장 제거됨)"
            : `서식 미리보기 (${corp.corpName} 제원 자동 반영)`}
        </span>
        <div className="flex items-center gap-2">
          {tplType !== "SHAREHOLDER_STATEMENT" && tplType !== "RESOLUTION" && (
            <button
              type="button"
              onClick={handleCopyTemplate}
              className="px-2.5 py-1 rounded bg-[#334155] hover:bg-[#1e293b] text-white font-bold inline-flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>텍스트 복사</span>
            </button>
          )}
          <button
            type="button"
            onClick={handlePrintTemplate}
            className="px-3 py-1 rounded bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold inline-flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>A4 인쇄 / PDF 저장</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 bg-[#faf7f0] dark:bg-slate-950 overflow-auto flex justify-center">
        {tplType === "SHAREHOLDER_STATEMENT" ? (
          <div
            className="w-full max-w-[740px] bg-white text-black p-5 border border-slate-300 shadow-sm"
            style={SHEET_FONT_STYLE}
          >
            {/* 상단 타이틀 테이블 */}
            <table className="w-full border-collapse mb-1.5" style={OUTER_TABLE_STYLE}>
              <tbody>
                <tr>
                  <td
                    className="text-center font-bold text-[12px] align-middle"
                    style={{ width: "28%", padding: "8px 4px", border: "1.5px solid #000" }}
                  >
                    {tplBaseDateText}
                  </td>
                  <td
                    className="text-center font-extrabold text-[22px] align-middle"
                    style={{
                      width: "44%",
                      padding: "8px 0",
                      letterSpacing: "10px",
                      textIndent: "10px",
                      border: "1.5px solid #000",
                    }}
                  >
                    주주명세서
                  </td>
                  <td className="p-0" style={{ width: "28%", border: "1.5px solid #000" }}>
                    <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                      <tbody>
                        <tr>
                          <td
                            className="text-center font-bold text-[11px] py-1"
                            style={{ borderBottom: "1px solid #000" }}
                          >
                            회 사 명
                          </td>
                        </tr>
                        <tr>
                          <td className="text-center font-bold text-[12px] py-1.5">
                            {corp.corpName}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 본문 주주명세서 테이블 */}
            <table className="w-full border-collapse text-[11px]" style={OUTER_TABLE_STYLE}>
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "19%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "4%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="text-center font-semibold py-1" style={CELL_BORDER_STYLE}>
                    ①성 명
                    <br />
                    (회사명)
                  </th>
                  <th className="text-center font-semibold py-1" style={CELL_BORDER_STYLE}>
                    ②주민등록번호
                    <br />
                    (법인등록번호)
                  </th>
                  <th
                    rowSpan={2}
                    className="text-center font-semibold py-1 align-middle"
                    style={CELL_BORDER_STYLE}
                  >
                    ④전화번호
                    <br />
                    (휴대전화)
                  </th>
                  <th
                    colSpan={4}
                    className="text-center font-semibold py-0.5"
                    style={CELL_BORDER_STYLE}
                  >
                    지분 또는 출자관계
                  </th>
                  <th
                    rowSpan={2}
                    className="text-center font-semibold py-1 align-middle leading-tight text-[10px]"
                    style={CELL_BORDER_STYLE}
                  >
                    ⑨
                    <br />
                    대주주
                    <br />
                    와의
                    <br />
                    관계
                  </th>
                  <th
                    rowSpan={2}
                    className="text-center font-semibold py-1 align-middle"
                    style={CELL_BORDER_STYLE}
                  >
                    비
                    <br />고
                  </th>
                </tr>
                <tr>
                  <th
                    colSpan={2}
                    className="text-center font-semibold py-0.5"
                    style={CELL_BORDER_STYLE}
                  >
                    ③주 소
                  </th>
                  <th className="text-center font-semibold py-0.5" style={CELL_BORDER_STYLE}>
                    ⑤ 주식수
                  </th>
                  <th
                    className="text-center font-semibold py-0.5 leading-tight text-[10px]"
                    style={CELL_BORDER_STYLE}
                  >
                    ⑥ 주당
                    <br />
                    액면가액
                  </th>
                  <th className="text-center font-semibold py-0.5" style={CELL_BORDER_STYLE}>
                    ⑦ 금 액
                  </th>
                  <th
                    className="text-center font-semibold py-0.5 leading-tight text-[10px]"
                    style={CELL_BORDER_STYLE}
                  >
                    ⑧지분율
                    <br />
                    (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ height: "24px" }}>
                  <td className="text-center font-medium" style={CELL_BORDER_STYLE}>
                    {tplShareholderName}
                  </td>
                  <td className="text-center font-mono" style={CELL_BORDER_STYLE}>
                    {tplShareholderRegNo}
                  </td>
                  <td
                    rowSpan={2}
                    className="text-center font-mono align-middle leading-tight"
                    style={CELL_BORDER_STYLE}
                  >
                    {tplShareholderPhone.includes("-") ? (
                      <>
                        {tplShareholderPhone.split("-").slice(0, 2).join("-")}
                        <br />-{tplShareholderPhone.split("-")[2]}
                      </>
                    ) : (
                      tplShareholderPhone
                    )}
                  </td>
                  <td rowSpan={2} className="text-right pr-1.5 font-mono align-middle" style={CELL_BORDER_STYLE}>
                    {tplShareholderShares}
                  </td>
                  <td rowSpan={2} className="text-right pr-1.5 align-middle" style={CELL_BORDER_STYLE}>
                    {tplShareholderParValue}
                  </td>
                  <td rowSpan={2} className="text-right pr-1.5 font-mono align-middle" style={CELL_BORDER_STYLE}>
                    {tplShareholderAmount}
                  </td>
                  <td rowSpan={2} className="text-center font-mono align-middle" style={CELL_BORDER_STYLE}>
                    {tplShareholderRatio}
                  </td>
                  <td rowSpan={2} className="text-center align-middle" style={CELL_BORDER_STYLE}>
                    {tplShareholderRel}
                  </td>
                  <td rowSpan={2} className="text-center align-middle" style={CELL_BORDER_STYLE}>
                    {tplShareholderNote}
                  </td>
                </tr>
                <tr style={{ height: "38px" }}>
                  <td
                    colSpan={2}
                    className="px-1.5 py-0.5 align-top text-[10.5px] leading-tight"
                    style={CELL_BORDER_STYLE}
                  >
                    {tplShareholderZip && (
                      <div className="font-mono text-[10px]">{tplShareholderZip}</div>
                    )}
                    <div>{tplShareholderAddr}</div>
                  </td>
                </tr>
                {Array.from({ length: tplBlankRowsCount }).map((_, idx) => (
                  <React.Fragment key={idx}>
                    <tr style={{ height: "22px" }}>
                      <td style={CELL_BORDER_STYLE}>&nbsp;</td>
                      <td style={CELL_BORDER_STYLE}>&nbsp;</td>
                      {Array.from({ length: 7 }).map((__, colIdx) => (
                        <td key={colIdx} rowSpan={2} style={CELL_BORDER_STYLE}>
                          &nbsp;
                        </td>
                      ))}
                    </tr>
                    <tr style={{ height: "32px" }}>
                      <td colSpan={2} style={CELL_BORDER_STYLE}>
                        &nbsp;
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : tplType === "RESOLUTION" ? (
          <div
            className="w-full max-w-[740px] bg-white text-black p-7 border border-slate-300 shadow-sm space-y-3 text-[13px] leading-relaxed"
            style={SHEET_FONT_STYLE}
          >
            <h1 className="text-center font-extrabold text-[25px] tracking-wide mb-5">
              주주서면결의서
            </h1>

            <div className="font-bold text-[14px]">{corp.corpName}</div>
            <p>
              상법 제363조의2 및 제383조에 따라, 자본금 10억 원 미만인 당 회사의 주주 전원의 동의로 주주총회의 소집 및 개최 절차에 갈음하여 다음과 같이 서면결의한다.
            </p>

            <div className="pt-1">
              <div className="font-bold mb-1">1. 결의 일자</div>
              <div>{tplResolutionDateKor}</div>
            </div>

            <div className="pt-1">
              <div className="font-bold mb-1">2. 주주 현황</div>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                <li>발행주식 총수: {tplShareholderShares}주</li>
                <li>의결권 있는 주식 총수: {tplShareholderShares}주</li>
                <li>
                  결의에 동의한 주식 총수: {tplShareholderShares}주 (동의율 {tplShareholderRatio}%)
                </li>
              </ul>
            </div>

            <div className="pt-1 space-y-1.5">
              <div className="font-bold">3. 결의 안건</div>
              <div className="font-bold">{tplAgendaTitle}</div>
              <p>{tplAgendaBody}</p>
            </div>

            <div className="pt-1 space-y-1.5">
              <div className="font-bold">{tplCompareTableTitle}</div>
              <table className="w-full border-collapse text-[12.5px]" style={SLATE_TABLE_STYLE}>
                <colgroup>
                  <col style={{ width: "50%" }} />
                  <col style={{ width: "50%" }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left font-bold py-2 px-3" style={SLATE_BORDER_STYLE}>
                      현행 정관
                    </th>
                    <th className="text-left font-bold py-2 px-3" style={SLATE_BORDER_STYLE}>
                      변경안
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="align-top py-2.5 px-3 space-y-1.5" style={SLATE_BORDER_STYLE}>
                      <div className="font-bold mb-1.5">{tplArticleNo}</div>
                      {renderArticleLines(tplBeforeText)}
                    </td>
                    <td className="align-top py-2.5 px-3 space-y-1.5" style={SLATE_BORDER_STYLE}>
                      <div className="font-bold mb-1.5">{tplArticleNo}</div>
                      {renderArticleLines(tplAfterText, true)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="pt-2">
              위 결의를 증명하기 위하여 결의서를 작성하고, 주주 전원이 기명하고 인감도장을 날인한다.
            </p>

            <div className="pt-1 space-y-1.5">
              <div className="font-bold">{tplResolutionDateKor}</div>
              <div className="font-bold pt-1">{corp.corpName}</div>
              <div>본점: {corp.address}</div>
              <div className="font-bold pt-1">주주 겸 대표이사: {tplShareholderName}</div>
              <div>주소: {tplShareholderAddr}</div>
              <div>주식 수: {tplShareholderShares}주</div>
              <div className="pt-2">
                서명/날인: {tplShareholderName} <span className="inline-block w-24" />
              </div>
            </div>
          </div>
        ) : tplType === "COMPARE_TABLE" ? (
          <div
            className="w-full max-w-[760px] bg-white text-black p-6 border border-slate-300 shadow-sm space-y-3 text-[12.5px] leading-relaxed"
            style={SHEET_FONT_STYLE}
          >
            <div className="font-bold text-xs">[별첨]</div>
            <h1
              className="text-center font-extrabold text-[22px] mb-3"
              style={{ letterSpacing: "8px", textIndent: "8px" }}
            >
              신 · 구 조 문 대 비 표
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] pb-1">
              <span>
                <strong>대상 법인:</strong> {corp.corpName} ({corp.bizNum} / {corp.corpRegNum})
              </span>
              <span className="font-mono">
                <strong>결의일:</strong> {tplResolutionDate} / <strong>시행일:</strong>{" "}
                {tplEffectiveDate}
              </span>
            </div>

            <table className="w-full border-collapse text-[12px]" style={OUTER_TABLE_STYLE}>
              <colgroup>
                <col style={{ width: "14%" }} />
                <col style={{ width: "35%" }} />
                <col style={{ width: "35%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-50">
                  <th className="py-2 px-2 text-center font-bold" style={CELL_BORDER_STYLE}>
                    구 분
                  </th>
                  <th className="py-2 px-2 text-center font-bold" style={CELL_BORDER_STYLE}>
                    현행 정관 (변경 전)
                  </th>
                  <th className="py-2 px-2 text-center font-bold" style={CELL_BORDER_STYLE}>
                    개정 정관 (변경 후)
                  </th>
                  <th className="py-2 px-2 text-center font-bold" style={CELL_BORDER_STYLE}>
                    개정 사유
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2.5 text-center font-bold align-middle" style={CELL_BORDER_STYLE}>
                    {tplArticleNo}
                  </td>
                  <td className="p-2.5 align-top space-y-1" style={CELL_BORDER_STYLE}>
                    <div className="font-bold mb-1">
                      회사는 다음의 사업을 영위함을 목적으로 한다.
                    </div>
                    {renderArticleLines(tplBeforeText)}
                  </td>
                  <td className="p-2.5 align-top space-y-1" style={CELL_BORDER_STYLE}>
                    <div className="font-bold mb-1">
                      회사는 다음의 사업을 영위함을 목적으로 한다.
                    </div>
                    {renderArticleLines(tplAfterText, true)}
                  </td>
                  <td className="p-2.5 text-center align-middle" style={CELL_BORDER_STYLE}>
                    {tplReasonText}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 text-center font-bold align-middle" style={CELL_BORDER_STYLE}>
                    부 칙
                  </td>
                  <td
                    className="p-2.5 text-center text-slate-500 align-middle"
                    style={CELL_BORDER_STYLE}
                  >
                    (신설)
                  </td>
                  <td className="p-2.5 align-top space-y-1" style={CELL_BORDER_STYLE}>
                    <div className="font-bold">제1조 (시행일)</div>
                    <div>이 정관은 {tplEffectiveDate}부터 시행한다.</div>
                  </td>
                  <td className="p-2.5 text-center align-middle" style={CELL_BORDER_STYLE}>
                    개정 정관 시행일 명시
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="w-full max-w-[760px] bg-white text-black p-7 border border-slate-300 shadow-sm space-y-4 text-[12.5px] leading-relaxed"
            style={SHEET_FONT_STYLE}
          >
            <h1
              className="text-center font-extrabold text-[26px] my-3"
              style={{ letterSpacing: "14px", textIndent: "14px" }}
            >
              주 주 명 부
            </h1>

            <div className="flex flex-wrap items-end justify-between gap-2 text-[12px]">
              <div className="space-y-0.5">
                <div>
                  <strong>상 호 :</strong> {corp.corpName}
                </div>
                <div>
                  <strong>법인등록번호 :</strong> {corp.corpRegNum} (사업자등록번호: {corp.bizNum})
                </div>
                <div>
                  <strong>발행주식총수 :</strong> {(corp.totalShares || 10000).toLocaleString()} 주
                  (1주의 금액: {(corp.parValue || 500).toLocaleString()} 원 / 자본금:{" "}
                  {corp.capitalStock.toLocaleString()} 원)
                </div>
              </div>
              <div className="font-bold font-mono">기준일 : {tplResolutionDate}</div>
            </div>

            <table className="w-full border-collapse text-[11.5px]" style={OUTER_TABLE_STYLE}>
              <colgroup>
                <col style={{ width: "6%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "31%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "7%" }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-50">
                  <th className="py-2 px-1 text-center font-bold" style={CELL_BORDER_STYLE}>
                    순번
                  </th>
                  <th className="py-2 px-1 text-center font-bold" style={CELL_BORDER_STYLE}>
                    주주명
                  </th>
                  <th className="py-2 px-1 text-center font-bold" style={CELL_BORDER_STYLE}>
                    주민등록번호
                  </th>
                  <th className="py-2 px-1 text-center font-bold" style={CELL_BORDER_STYLE}>
                    주 소
                  </th>
                  <th className="py-2 px-1 text-center font-bold" style={CELL_BORDER_STYLE}>
                    주식의 종류
                  </th>
                  <th className="py-2 px-1 text-center font-bold" style={CELL_BORDER_STYLE}>
                    보유주식 수
                  </th>
                  <th className="py-2 px-1 text-center font-bold" style={CELL_BORDER_STYLE}>
                    주식보유금액
                  </th>
                  <th className="py-2 px-1 text-center font-bold" style={CELL_BORDER_STYLE}>
                    지분율
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2.5 px-1 text-center align-middle" style={CELL_BORDER_STYLE}>
                    1
                  </td>
                  <td
                    className="py-2.5 px-1 text-center font-bold align-middle"
                    style={CELL_BORDER_STYLE}
                  >
                    {tplShareholderName}
                  </td>
                  <td
                    className="py-2.5 px-1 text-center font-mono align-middle"
                    style={CELL_BORDER_STYLE}
                  >
                    {tplShareholderRegNo}
                  </td>
                  <td
                    className="py-2 px-2 text-left align-middle text-[11px] leading-snug"
                    style={CELL_BORDER_STYLE}
                  >
                    {tplShareholderAddr}
                  </td>
                  <td className="py-2.5 px-1 text-center align-middle" style={CELL_BORDER_STYLE}>
                    보통주
                  </td>
                  <td
                    className="py-2.5 px-2 text-right font-mono align-middle"
                    style={CELL_BORDER_STYLE}
                  >
                    {tplShareholderShares} 주
                  </td>
                  <td
                    className="py-2.5 px-2 text-right font-mono align-middle"
                    style={CELL_BORDER_STYLE}
                  >
                    {tplShareholderAmount}
                  </td>
                  <td
                    className="py-2.5 px-1 text-center font-mono font-bold align-middle"
                    style={CELL_BORDER_STYLE}
                  >
                    {tplShareholderRatio}%
                  </td>
                </tr>
                {[0, 1].map((rowIdx) => (
                  <tr key={rowIdx} style={{ height: "34px" }}>
                    {Array.from({ length: 8 }).map((__, colIdx) => (
                      <td key={colIdx} style={CELL_BORDER_STYLE}>
                        &nbsp;
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={5} className="py-2.5 px-2 text-center align-middle" style={CELL_BORDER_STYLE}>
                    총 계
                  </td>
                  <td
                    className="py-2.5 px-2 text-right font-mono align-middle"
                    style={CELL_BORDER_STYLE}
                  >
                    {tplShareholderShares} 주
                  </td>
                  <td
                    className="py-2.5 px-2 text-right font-mono align-middle"
                    style={CELL_BORDER_STYLE}
                  >
                    {tplShareholderAmount}
                  </td>
                  <td
                    className="py-2.5 px-1 text-center font-mono align-middle"
                    style={CELL_BORDER_STYLE}
                  >
                    {tplShareholderRatio}%
                  </td>
                </tr>
              </tbody>
            </table>

            <p className="text-center pt-3 text-[13.5px]">위 기재 사실이 틀림없음을 증명합니다.</p>

            <div className="text-center font-bold font-mono text-[13.5px] py-2">
              {tplResolutionDate}
            </div>

            <div className="text-center space-y-1 pt-2">
              <div className="font-bold text-[14.5px]">{corp.corpName}</div>
              <div className="text-[12px] text-slate-700">본점 : {corp.address}</div>
              <div className="font-bold text-[14.5px] pt-2">
                대표이사 &nbsp; {corp.ceoName} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (인)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
