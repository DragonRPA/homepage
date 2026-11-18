import type { BusinessEntity } from "@/lib/businessEntities";
import type { TemplateStudioState } from "./corporateDocTypes";

function maskRrnPrefix(regNo: string): string {
  const trimmed = (regNo || "").trim();
  if (!trimmed) return "******-*******";
  if (trimmed.includes("-")) {
    const [front, back] = trimmed.split("-");
    return `${front || "******"}-${(back || "*").slice(0, 1)}******`;
  }
  return `${trimmed.slice(0, 6)}-*******`;
}

export function buildGeneratedTemplateText(
  corp: BusinessEntity,
  s: TemplateStudioState
): string {
  const {
    tplType,
    tplResolutionDate,
    tplEffectiveDate,
    tplAgendaTitle,
    tplArticleNo,
    tplBeforeText,
    tplAfterText,
    tplReasonText,
    tplShareholderAddr,
    tplShareholderRegNo,
    tplShareholderName,
    tplShareholderShares,
    tplShareholderAmount,
    tplShareholderRatio,
  } = s;

  const shareholderDisplayName = tplShareholderName || corp.ceoName;
  const shareholderMaskedReg = maskRrnPrefix(tplShareholderRegNo);
  const shareholderRegFull = tplShareholderRegNo || "(주주명부 조회 필요)";
  const shareholderAddrDisplay = tplShareholderAddr || "(주주명부 조회 필요)";
  const sharesDisplay = tplShareholderShares || "10,000";
  const amountDisplay = tplShareholderAmount || "5,000,000원";
  const ratioDisplay = tplShareholderRatio || "100";

  if (tplType === "RESOLUTION") {
    return `                        주 주 서 면 결 의 서

${corp.corpName} (이하 "회사"라 함)의 총주주 1인은 상법 제363조 제4항 및 제6항에 따라, 주주총회의 소집 절차를 거치지 아니하고 서면에 의하여 다음과 같이 결의한다.

--------------------------------------------------------------------------------
1. 결의 일자 : ${tplResolutionDate}
2. 결의 장소 : ${corp.address} 본점 회의실
3. 주주 현황 :
   - 총 발행주식수 : ${(corp.totalShares || 10000).toLocaleString()} 주 (1주의 금액: ₩${(corp.parValue || 500).toLocaleString()}, 자본금: ₩${corp.capitalStock.toLocaleString()})
   - 출석(결의) 주식수 : ${(corp.totalShares || 10000).toLocaleString()} 주 (100%)
   - 주주 성명 : ${shareholderDisplayName} (${shareholderMaskedReg})

--------------------------------------------------------------------------------
[결 의 안 건]

${tplAgendaTitle}

회사의 사업 확장 및 경영 합리화를 위하여 정관 일부를 별첨 [신·구조문대비표]와 같이 변경하기로 하며, 참석 주주 1인의 전원 찬성으로 원안대로 가결하다.

[부 칙]
제1조 (시행일) 본 결의에 따라 변경된 정관은 ${tplEffectiveDate}부터 효력을 발생한다.

--------------------------------------------------------------------------------
위 결의를 명확히 하기 위하여 본 결의서를 작성하고, 유일 주주가 이에 기명날인한다.

                                ${tplResolutionDate}

                                ${corp.corpName}
                                법인등록번호 : ${corp.corpRegNum}
                                주  주 :  ${shareholderDisplayName}   (개인인감 날인)`;
  }

  if (tplType === "COMPARE_TABLE") {
    return `[별첨]
                          신 · 구 조 문 대 비 표

대상 법인 : ${corp.corpName} (사업자등록번호: ${corp.bizNum} / 법인등록번호: ${corp.corpRegNum})
결의 일자 : ${tplResolutionDate} / 시행 일자 : ${tplEffectiveDate}

================================================================================
[조항 구분] : ${tplArticleNo}
--------------------------------------------------------------------------------
■ 현행 정관 (변경 전)
${tplBeforeText}

--------------------------------------------------------------------------------
■ 개정 정관 (변경 후)
${tplAfterText}

--------------------------------------------------------------------------------
■ 개정 사유 : ${tplReasonText}
================================================================================
■ 부칙 신설
제1조 (시행일) 이 정관은 ${tplEffectiveDate}부터 시행한다.
================================================================================`;
  }

  return `                            주  주  명  부

                                                    기준일: ${tplResolutionDate}

상        호 : ${corp.corpName}
법인등록번호 : ${corp.corpRegNum} (사업자등록번호: ${corp.bizNum})
발행주식총수 : ${(corp.totalShares || 10000).toLocaleString()} 주 (1주의 금액: ${(corp.parValue || 500).toLocaleString()} 원)
자   본   금 : ${corp.capitalStock.toLocaleString()} 원

┌──────┬────────┬────────────────┬────────────────────────────────────┬──────────┬──────────┬──────┐
│ 순번 │  성명  │    주민등록번호│               주  소               │보유주식수│주식보유액│지분율│
├──────┼────────┼────────────────┼────────────────────────────────────┼──────────┼──────────┼──────┤
│  1   │ ${shareholderDisplayName} │ ${shareholderRegFull} │ ${shareholderAddrDisplay} │ ${sharesDisplay}주 │${amountDisplay}│ ${ratioDisplay}% │
├──────┴────────┴────────────────┴────────────────────────────────────┼──────────┼──────────┼──────┤
│                                총  계                               │ ${sharesDisplay}주 │${amountDisplay}│ ${ratioDisplay}% │
└─────────────────────────────────────────────────────────────────────┴──────────┴──────────┴──────┘

위 기재 사실이 틀림없음을 증명합니다.

                                ${tplResolutionDate}

                                ${corp.corpName}
                                본점 : ${corp.address}
                                대표이사  ${corp.ceoName}   (법인인감 날인)`;
}

export function printCorporateTemplate(
  corp: BusinessEntity,
  s: TemplateStudioState,
  generatedTemplateText: string
): void {
  const {
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
  } = s;

  const win = window.open("", "_blank", "width=900,height=850");
  if (!win) return;

  if (tplType === "SHAREHOLDER_STATEMENT") {
    const phoneFormatted = tplShareholderPhone.includes("-")
      ? `${tplShareholderPhone.split("-").slice(0, 2).join("-")}<br/>-${tplShareholderPhone.split("-")[2]}`
      : tplShareholderPhone;

    const emptyRowsHtml = Array.from({ length: tplBlankRowsCount })
      .map(
        () => `
          <tr style="height: 26px;">
            <td style="border: 1px solid #000;">&nbsp;</td>
            <td style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
          </tr>
          <tr style="height: 38px;">
            <td colspan="2" style="border: 1px solid #000;">&nbsp;</td>
          </tr>`
      )
      .join("");

    win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>주주명세서 - ${corp.corpName}</title>
            <style>
              @page { size: A4 portrait; margin: 12mm 12mm 12mm 12mm; }
              body {
                font-family: 'Malgun Gothic', '맑은 고딕', 'Dotum', sans-serif;
                color: #000;
                background: #fff;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              table { width: 100%; border-collapse: collapse; table-layout: fixed; }
              th, td { box-sizing: border-box; font-size: 11.5px; color: #000; }
            </style>
          </head>
          <body>
            <table style="border: 1.5px solid #000; margin-bottom: 6px;">
              <tr>
                <td style="width: 28%; border: 1.5px solid #000; text-align: center; font-weight: 700; font-size: 13px; padding: 10px 4px;">
                  ${tplBaseDateText}
                </td>
                <td style="width: 44%; border: 1.5px solid #000; text-align: center; font-weight: 800; font-size: 24px; letter-spacing: 12px; text-indent: 12px; padding: 10px 0;">
                  주주명세서
                </td>
                <td style="width: 28%; border: 1.5px solid #000; padding: 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="border-bottom: 1px solid #000; text-align: center; font-weight: 700; font-size: 11.5px; padding: 4px 0;">
                        회 사 명
                      </td>
                    </tr>
                    <tr>
                      <td style="text-align: center; font-weight: 700; font-size: 13px; padding: 6px 2px;">
                        ${corp.corpName}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table style="border: 1.5px solid #000;">
              <colgroup>
                <col style="width: 12%;" />
                <col style="width: 19%;" />
                <col style="width: 14%;" />
                <col style="width: 10%;" />
                <col style="width: 10%;" />
                <col style="width: 15%;" />
                <col style="width: 8%;" />
                <col style="width: 8%;" />
                <col style="width: 4%;" />
              </colgroup>
              <thead>
                <tr>
                  <th style="border: 1px solid #000; padding: 5px 2px; font-weight: 600; font-size: 10.5px;">①성 명<br/>(회사명)</th>
                  <th style="border: 1px solid #000; padding: 5px 2px; font-weight: 600; font-size: 10.5px;">②주민등록번호<br/>(법인등록번호)</th>
                  <th rowspan="2" style="border: 1px solid #000; padding: 5px 2px; font-weight: 600; font-size: 10.5px;">④전화번호<br/>(휴대전화)</th>
                  <th colspan="4" style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10.5px;">지분 또는 출자관계</th>
                  <th rowspan="2" style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10px; line-height: 1.25;">⑨<br/>대주주<br/>와의<br/>관계</th>
                  <th rowspan="2" style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10.5px;">비<br/>고</th>
                </tr>
                <tr>
                  <th colspan="2" style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10.5px;">③주 소</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10.5px;">⑤ 주식수</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10px; line-height: 1.2;">⑥ 주당<br/>액면가액</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10.5px;">⑦ 금 액</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10px; line-height: 1.2;">⑧지분율<br/>(%)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="height: 26px;">
                  <td style="border: 1px solid #000; text-align: center; font-weight: 600;">${tplShareholderName}</td>
                  <td style="border: 1px solid #000; text-align: center; font-family: monospace; font-size: 11.5px;">${tplShareholderRegNo}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: center; font-family: monospace; font-size: 11.5px; line-height: 1.3;">${phoneFormatted}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: right; padding-right: 6px; font-family: monospace; font-size: 11.5px;">${tplShareholderShares}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: right; padding-right: 6px; font-size: 11.5px;">${tplShareholderParValue}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: right; padding-right: 6px; font-family: monospace; font-size: 11.5px;">${tplShareholderAmount}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: center; font-family: monospace; font-size: 11.5px;">${tplShareholderRatio}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: center; font-size: 11.5px;">${tplShareholderRel}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: center; font-size: 11px;">${tplShareholderNote}</td>
                </tr>
                <tr style="height: 40px;">
                  <td colspan="2" style="border: 1px solid #000; padding: 3px 6px; vertical-align: top; font-size: 10.5px; line-height: 1.35;">
                    ${tplShareholderZip ? `<div style="font-family: monospace; font-size: 10px;">${tplShareholderZip}</div>` : ""}
                    <div>${tplShareholderAddr}</div>
                  </td>
                </tr>
                ${emptyRowsHtml}
              </tbody>
            </table>
            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>
      `);
    win.document.close();
    return;
  }

  if (tplType === "RESOLUTION") {
    const beforeLinesHtml = tplBeforeText
      .split("\n")
      .map((line) => `<div style="margin-bottom: 6px;">${line}</div>`)
      .join("");
    const afterLinesHtml = tplAfterText
      .split("\n")
      .map((line) => {
        const isNew = line.includes("(신설)") || line.includes("(조항");
        return `<div style="margin-bottom: 6px; ${isNew ? "font-weight: 700;" : ""}">${line}</div>`;
      })
      .join("");

    win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>주주서면결의서 - ${corp.corpName}</title>
            <style>
              @page { size: A4 portrait; margin: 18mm 18mm 18mm 18mm; }
              body {
                font-family: 'Malgun Gothic', '맑은 고딕', 'Dotum', sans-serif;
                color: #111;
                background: #fff;
                margin: 0;
                padding: 0;
                font-size: 13.5px;
                line-height: 1.65;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              h1 {
                text-align: center;
                font-size: 26px;
                font-weight: 800;
                letter-spacing: 2px;
                margin: 0 0 22px 0;
              }
              .section-title {
                font-weight: 700;
                font-size: 14px;
                margin: 16px 0 6px 0;
              }
              ul {
                margin: 6px 0 12px 22px;
                padding: 0;
              }
              li {
                margin-bottom: 4px;
              }
              table.compare-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                margin: 10px 0 18px 0;
              }
              table.compare-table th, table.compare-table td {
                border: 1px solid #cbd5e1;
                padding: 10px 12px;
                vertical-align: top;
                font-size: 13px;
                line-height: 1.6;
              }
              table.compare-table th {
                background: #f8fafc;
                font-weight: 700;
                text-align: left;
              }
            </style>
          </head>
          <body>
            <h1>주주서면결의서</h1>
            <div style="font-weight: 700; font-size: 14.5px; margin-bottom: 8px;">${corp.corpName}</div>
            <p style="margin: 0 0 14px 0;">
              상법 제363조의2 및 제383조에 따라, 자본금 10억 원 미만인 당 회사의 주주 전원의 동의로 주주총회의 소집 및 개최 절차에 갈음하여 다음과 같이 서면결의한다.
            </p>

            <div class="section-title">1. 결의 일자</div>
            <div>${tplResolutionDateKor}</div>

            <div class="section-title">2. 주주 현황</div>
            <ul>
              <li>발행주식 총수: ${tplShareholderShares}주</li>
              <li>의결권 있는 주식 총수: ${tplShareholderShares}주</li>
              <li>결의에 동의한 주식 총수: ${tplShareholderShares}주 (동의율 ${tplShareholderRatio}%)</li>
            </ul>

            <div class="section-title">3. 결의 안건</div>
            <div style="font-weight: 700; margin-bottom: 6px;">${tplAgendaTitle}</div>
            <p style="margin: 0 0 12px 0;">${tplAgendaBody}</p>

            <div style="font-weight: 700; margin-bottom: 6px;">${tplCompareTableTitle}</div>
            <table class="compare-table">
              <colgroup>
                <col style="width: 50%;" />
                <col style="width: 50%;" />
              </colgroup>
              <thead>
                <tr>
                  <th>현행 정관</th>
                  <th>변경안</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style="font-weight: 700; margin-bottom: 8px;">${tplArticleNo}</div>
                    ${beforeLinesHtml}
                  </td>
                  <td>
                    <div style="font-weight: 700; margin-bottom: 8px;">${tplArticleNo}</div>
                    ${afterLinesHtml}
                  </td>
                </tr>
              </tbody>
            </table>

            <p style="margin: 18px 0 14px 0;">
              위 결의를 증명하기 위하여 결의서를 작성하고, 주주 전원이 기명하고 인감도장을 날인한다.
            </p>

            <div style="font-weight: 700; margin-bottom: 10px;">${tplResolutionDateKor}</div>
            <div style="font-weight: 700; margin-bottom: 6px;">${corp.corpName}</div>
            <div style="margin-bottom: 10px;">본점: ${corp.address}</div>
            <div style="font-weight: 700; margin-bottom: 6px;">주주 겸 대표이사: ${tplShareholderName}</div>
            <div style="margin-bottom: 6px;">주소: ${tplShareholderAddr}</div>
            <div style="margin-bottom: 10px;">주식 수: ${tplShareholderShares}주</div>
            <div style="margin-top: 8px;">서명/날인: ${tplShareholderName} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>

            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>
      `);
    win.document.close();
    return;
  }

  if (tplType === "COMPARE_TABLE") {
    const beforeLinesHtml = tplBeforeText
      .split("\n")
      .map((line) => `<div style="margin-bottom: 5px;">${line}</div>`)
      .join("");
    const afterLinesHtml = tplAfterText
      .split("\n")
      .map((line) => {
        const isNew = line.includes("(신설)") || line.includes("(조항");
        return `<div style="margin-bottom: 5px; ${isNew ? "font-weight: 700;" : ""}">${line}</div>`;
      })
      .join("");

    win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>신·구조문대비표 - ${corp.corpName}</title>
            <style>
              @page { size: A4 portrait; margin: 16mm; }
              body {
                font-family: 'Malgun Gothic', '맑은 고딕', 'Dotum', sans-serif;
                color: #000;
                background: #fff;
                margin: 0;
                padding: 0;
                font-size: 12.5px;
                line-height: 1.55;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              h1 {
                text-align: center;
                font-size: 24px;
                font-weight: 800;
                letter-spacing: 8px;
                text-indent: 8px;
                margin: 0 0 18px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                border: 1.5px solid #000;
              }
              th, td {
                border: 1px solid #000;
                padding: 9px 10px;
                vertical-align: top;
                box-sizing: border-box;
              }
              th {
                background: #f8fafc;
                font-weight: 700;
                text-align: center;
                font-size: 13px;
              }
            </style>
          </head>
          <body>
            <div style="font-weight: 700; font-size: 12px; margin-bottom: 4px;">[별첨]</div>
            <h1>신 · 구 조 문 대 비 표</h1>
            <div style="margin-bottom: 10px; font-size: 12px; display: flex; justify-content: space-between;">
              <span><strong>대상 법인:</strong> ${corp.corpName} (${corp.bizNum} / ${corp.corpRegNum})</span>
              <span><strong>결의일:</strong> ${tplResolutionDate} / <strong>시행일:</strong> ${tplEffectiveDate}</span>
            </div>
            <table>
              <colgroup>
                <col style="width: 14%;" />
                <col style="width: 35%;" />
                <col style="width: 35%;" />
                <col style="width: 16%;" />
              </colgroup>
              <thead>
                <tr>
                  <th>구 분</th>
                  <th>현행 정관 (변경 전)</th>
                  <th>개정 정관 (변경 후)</th>
                  <th>개정 사유</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center; font-weight: 700; vertical-align: middle;">${tplArticleNo}</td>
                  <td>
                    <div style="font-weight: 700; margin-bottom: 6px;">회사는 다음의 사업을 영위함을 목적으로 한다.</div>
                    ${beforeLinesHtml}
                  </td>
                  <td>
                    <div style="font-weight: 700; margin-bottom: 6px;">회사는 다음의 사업을 영위함을 목적으로 한다.</div>
                    ${afterLinesHtml}
                  </td>
                  <td style="text-align: center; vertical-align: middle;">${tplReasonText}</td>
                </tr>
                <tr>
                  <td style="text-align: center; font-weight: 700; vertical-align: middle;">부 칙</td>
                  <td style="color: #555; text-align: center; vertical-align: middle;">(신설)</td>
                  <td>
                    <div style="font-weight: 700;">제1조 (시행일)</div>
                    <div>이 정관은 ${tplEffectiveDate}부터 시행한다.</div>
                  </td>
                  <td style="text-align: center; vertical-align: middle;">개정 정관 시행일 명시</td>
                </tr>
              </tbody>
            </table>
            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>
      `);
    win.document.close();
    return;
  }

  if (tplType === "SHAREHOLDER_LIST") {
    win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>주주명부 - ${corp.corpName}</title>
            <style>
              @page { size: A4 portrait; margin: 20mm 16mm; }
              body {
                font-family: 'Malgun Gothic', '맑은 고딕', 'Dotum', sans-serif;
                color: #000;
                background: #fff;
                margin: 0;
                padding: 0;
                font-size: 13px;
                line-height: 1.65;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              h1 {
                text-align: center;
                font-size: 28px;
                font-weight: 800;
                letter-spacing: 16px;
                text-indent: 16px;
                margin: 10px 0 28px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                border: 1.5px solid #000;
                margin: 14px 0 28px 0;
              }
              th, td {
                border: 1px solid #000;
                padding: 10px 6px;
                font-size: 12px;
                text-align: center;
                vertical-align: middle;
                box-sizing: border-box;
              }
              th {
                background: #f8fafc;
                font-weight: 700;
              }
            </style>
          </head>
          <body>
            <h1>주 주 명 부</h1>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; font-size: 12.5px;">
              <div style="line-height: 1.7;">
                <div><strong>상 호 :</strong> ${corp.corpName}</div>
                <div><strong>법인등록번호 :</strong> ${corp.corpRegNum} (사업자등록번호: ${corp.bizNum})</div>
                <div><strong>발행주식총수 :</strong> ${(corp.totalShares || 10000).toLocaleString()} 주 (1주의 금액: ${(corp.parValue || 500).toLocaleString()} 원 / 자본금: ${corp.capitalStock.toLocaleString()} 원)</div>
              </div>
              <div style="font-weight: 700;">기준일 : ${tplResolutionDate}</div>
            </div>

            <table>
              <colgroup>
                <col style="width: 6%;" />
                <col style="width: 10%;" />
                <col style="width: 16%;" />
                <col style="width: 31%;" />
                <col style="width: 10%;" />
                <col style="width: 11%;" />
                <col style="width: 9%;" />
                <col style="width: 7%;" />
              </colgroup>
              <thead>
                <tr>
                  <th>순번</th>
                  <th>주주명</th>
                  <th>주민등록번호</th>
                  <th>주 소</th>
                  <th>주식의 종류</th>
                  <th>보유주식 수</th>
                  <th>주식보유금액</th>
                  <th>지분율</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td style="font-weight: 700;">${tplShareholderName}</td>
                  <td style="font-family: monospace;">${tplShareholderRegNo}</td>
                  <td style="text-align: left; padding: 8px 8px; font-size: 11.5px; line-height: 1.35;">${tplShareholderAddr}</td>
                  <td>보통주</td>
                  <td style="text-align: right; padding-right: 8px; font-family: monospace;">${tplShareholderShares} 주</td>
                  <td style="text-align: right; padding-right: 8px; font-family: monospace;">${tplShareholderAmount}</td>
                  <td style="font-family: monospace; font-weight: 700;">${tplShareholderRatio}%</td>
                </tr>
                <tr style="height: 36px;">
                  <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                </tr>
                <tr style="height: 36px;">
                  <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                </tr>
                <tr style="background: #f8fafc; font-weight: 700;">
                  <td colspan="5">총 계</td>
                  <td style="text-align: right; padding-right: 8px; font-family: monospace;">${tplShareholderShares} 주</td>
                  <td style="text-align: right; padding-right: 8px; font-family: monospace;">${tplShareholderAmount}</td>
                  <td style="font-family: monospace;">${tplShareholderRatio}%</td>
                </tr>
              </tbody>
            </table>

            <p style="text-align: center; margin: 28px 0; font-size: 14px;">
              위 기재 사실이 틀림없음을 증명합니다.
            </p>

            <div style="text-align: center; font-weight: 700; font-size: 14px; margin-bottom: 32px;">
              ${tplResolutionDate}
            </div>

            <div style="text-align: center; line-height: 2;">
              <div style="font-size: 15px; font-weight: 700;">${corp.corpName}</div>
              <div style="font-size: 12.5px; color: #333;">본점 : ${corp.address}</div>
              <div style="font-size: 15px; font-weight: 700; margin-top: 8px;">
                대표이사 &nbsp; ${corp.ceoName} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (인)
              </div>
            </div>
            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>
      `);
    win.document.close();
    return;
  }

  win.document.write(`
      <html>
        <head>
          <title>${corp.corpName} - 법인 변경등기/정관변경 표준 서식</title>
          <style>
            body { font-family: 'Malgun Gothic', serif; padding: 40px; line-height: 1.65; color: #111; }
            pre { font-family: 'Malgun Gothic', monospace; font-size: 13px; white-space: pre-wrap; word-break: keep-all; }
            @media print { body { padding: 15mm; } }
          </style>
        </head>
        <body>
          <pre>${generatedTemplateText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
  win.document.close();
}
