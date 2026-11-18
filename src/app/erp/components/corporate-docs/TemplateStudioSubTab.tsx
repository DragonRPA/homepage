"use client";

import React from "react";
import { ExternalLink, Upload } from "lucide-react";
import type { BusinessEntity } from "@/lib/businessEntities";
import { formatErpInputNumber } from "@/lib/erpFormat";
import type { CorporateTemplateType } from "./corporateDocTypes";
import { TemplateStudioPreviewSheet } from "./TemplateStudioPreviewSheet";

const TEMPLATE_TYPE_OPTIONS: ReadonlyArray<{
  type: CorporateTemplateType;
  label: string;
}> = [
  { type: "SHAREHOLDER_STATEMENT", label: "① 주주명세서 (표준표)" },
  { type: "RESOLUTION", label: "② 주주서면결의서" },
  { type: "COMPARE_TABLE", label: "③ 신·구조문대비표" },
  { type: "SHAREHOLDER_LIST", label: "④ 등기용 주주명부" },
];

export interface TemplateStudioSubTabProps {
  corp: BusinessEntity;
  tplType: CorporateTemplateType;
  setTplType: React.Dispatch<React.SetStateAction<CorporateTemplateType>>;
  tplBaseDateText: string;
  setTplBaseDateText: React.Dispatch<React.SetStateAction<string>>;
  tplShareholderName: string;
  setTplShareholderName: React.Dispatch<React.SetStateAction<string>>;
  tplShareholderRegNo: string;
  setTplShareholderRegNo: React.Dispatch<React.SetStateAction<string>>;
  tplShareholderZip: string;
  setTplShareholderZip: React.Dispatch<React.SetStateAction<string>>;
  tplShareholderPhone: string;
  setTplShareholderPhone: React.Dispatch<React.SetStateAction<string>>;
  tplShareholderShares: string;
  setTplShareholderShares: React.Dispatch<React.SetStateAction<string>>;
  tplShareholderParValue: string;
  setTplShareholderParValue: React.Dispatch<React.SetStateAction<string>>;
  tplShareholderAmount: string;
  setTplShareholderAmount: React.Dispatch<React.SetStateAction<string>>;
  tplShareholderRatio: string;
  setTplShareholderRatio: React.Dispatch<React.SetStateAction<string>>;
  tplShareholderRel: string;
  setTplShareholderRel: React.Dispatch<React.SetStateAction<string>>;
  tplShareholderNote: string;
  setTplShareholderNote: React.Dispatch<React.SetStateAction<string>>;
  tplBlankRowsCount: number;
  setTplBlankRowsCount: React.Dispatch<React.SetStateAction<number>>;
  tplResolutionDate: string;
  setTplResolutionDate: React.Dispatch<React.SetStateAction<string>>;
  tplResolutionDateKor: string;
  setTplResolutionDateKor: React.Dispatch<React.SetStateAction<string>>;
  tplEffectiveDate: string;
  setTplEffectiveDate: React.Dispatch<React.SetStateAction<string>>;
  tplAgendaTitle: string;
  setTplAgendaTitle: React.Dispatch<React.SetStateAction<string>>;
  tplAgendaBody: string;
  setTplAgendaBody: React.Dispatch<React.SetStateAction<string>>;
  tplCompareTableTitle: string;
  setTplCompareTableTitle: React.Dispatch<React.SetStateAction<string>>;
  tplArticleNo: string;
  setTplArticleNo: React.Dispatch<React.SetStateAction<string>>;
  tplBeforeText: string;
  setTplBeforeText: React.Dispatch<React.SetStateAction<string>>;
  tplAfterText: string;
  setTplAfterText: React.Dispatch<React.SetStateAction<string>>;
  tplReasonText: string;
  setTplReasonText: React.Dispatch<React.SetStateAction<string>>;
  tplShareholderAddr: string;
  setTplShareholderAddr: React.Dispatch<React.SetStateAction<string>>;
  handleCopyTemplate: () => void;
  handlePrintTemplate: () => void;
  jumpToDocumentByCode: (docCode: string, openUpload?: boolean) => void;
}

export const TemplateStudioSubTab: React.FC<TemplateStudioSubTabProps> = ({
  corp,
  tplType,
  setTplType,
  tplBaseDateText,
  setTplBaseDateText,
  tplShareholderName,
  setTplShareholderName,
  tplShareholderRegNo,
  setTplShareholderRegNo,
  tplShareholderZip,
  setTplShareholderZip,
  tplShareholderPhone,
  setTplShareholderPhone,
  tplShareholderShares,
  setTplShareholderShares,
  tplShareholderParValue,
  setTplShareholderParValue,
  tplShareholderAmount,
  setTplShareholderAmount,
  tplShareholderRatio,
  setTplShareholderRatio,
  tplShareholderRel,
  setTplShareholderRel,
  tplShareholderNote,
  setTplShareholderNote,
  tplBlankRowsCount,
  setTplBlankRowsCount,
  tplResolutionDate,
  setTplResolutionDate,
  tplResolutionDateKor,
  setTplResolutionDateKor,
  tplEffectiveDate,
  setTplEffectiveDate,
  tplAgendaTitle,
  setTplAgendaTitle,
  tplAgendaBody,
  setTplAgendaBody,
  tplCompareTableTitle,
  setTplCompareTableTitle,
  tplArticleNo,
  setTplArticleNo,
  tplBeforeText,
  setTplBeforeText,
  tplAfterText,
  setTplAfterText,
  tplReasonText,
  setTplReasonText,
  tplShareholderAddr,
  setTplShareholderAddr,
  handleCopyTemplate,
  handlePrintTemplate,
  jumpToDocumentByCode,
}) => {
  return (
        <div className="flex-1 md:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 p-2.5 md:p-3 text-xs">
          {/* 좌측 입력 패널 (5컬럼) */}
          <div className="lg:col-span-5 bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 flex flex-col gap-3 overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-[#c4b6a0] pb-2">
              <span className="font-extrabold text-sm text-[#6d28d9] dark:text-purple-400">
                주주명세서 및 1인 법인 정관변경·등기 서식 생성기
              </span>
              <span className="text-[11px] font-mono text-[#475569]">
                도장 제거 (출력 후 날인)
              </span>
            </div>

            {/* 서식 종류 선택 (4종) */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[#334155]">생성할 표준 서식 선택</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {TEMPLATE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setTplType(opt.type)}
                    className={`py-2 px-2 rounded border font-bold text-center whitespace-nowrap transition ${
                      tplType === opt.type
                        ? "bg-[#6d28d9] text-white border-[#5b21b6]"
                        : "bg-[#ebe5d8] text-[#0f172a] border-[#b5a894]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {tplType === "SHAREHOLDER_STATEMENT" ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">기준일자 표기 (좌상단)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={tplBaseDateText}
                        onChange={(e) => setTplBaseDateText(e.target.value)}
                        placeholder="2026년 09월 13일 현재"
                        className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold w-full"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const y = now.getFullYear();
                          const m = String(now.getMonth() + 1).padStart(2, "0");
                          const d = String(now.getDate()).padStart(2, "0");
                          setTplBaseDateText(`${y}년 ${m}월 ${d}일 현재`);
                        }}
                        className="px-2 py-1.5 rounded bg-[#334155] text-white font-bold whitespace-nowrap shrink-0"
                      >
                        오늘
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">하단 공란 행 수 (A4 1장 맞춤)</label>
                    <select
                      value={tplBlankRowsCount}
                      onChange={(e) => setTplBlankRowsCount(Number(e.target.value))}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                    >
                      <option value={5}>공란 5행</option>
                      <option value={6}>공란 6행</option>
                      <option value={7}>공란 7행 (원본 PDF 동일 규격)</option>
                      <option value={8}>공란 8행</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">① 성명 (회사명)</label>
                    <input
                      type="text"
                      value={tplShareholderName}
                      onChange={(e) => setTplShareholderName(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">② 주민등록번호</label>
                    <input
                      type="text"
                      value={tplShareholderRegNo}
                      onChange={(e) => setTplShareholderRegNo(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">③ 우편번호</label>
                    <input
                      type="text"
                      value={tplShareholderZip}
                      onChange={(e) => setTplShareholderZip(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="font-bold text-[#334155]">④ 전화번호 (휴대전화)</label>
                    <input
                      type="text"
                      value={tplShareholderPhone}
                      onChange={(e) => setTplShareholderPhone(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155]">③ 주소 (도로명 및 동·호수)</label>
                  <input
                    type="text"
                    value={tplShareholderAddr}
                    onChange={(e) => setTplShareholderAddr(e.target.value)}
                    className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">⑤ 주식수</label>
                    <input
                      type="text"
                      value={tplShareholderShares}
                      onChange={(e) => setTplShareholderShares(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2 py-1.5 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">⑥ 주당 액면가</label>
                    <input
                      type="text"
                      value={tplShareholderParValue}
                      onChange={(e) => setTplShareholderParValue(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2 py-1.5 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155] whitespace-nowrap">⑦ 금액</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={tplShareholderAmount}
                      onChange={(e) =>
                        setTplShareholderAmount(
                          e.target.value.replace(/\d[\d,]*/g, (m) => formatErpInputNumber(m))
                        )
                      }
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2 py-1.5 font-mono text-right"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">⑧ 지분율(%)</label>
                    <input
                      type="text"
                      value={tplShareholderRatio}
                      onChange={(e) => setTplShareholderRatio(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2 py-1.5 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">⑨ 대주주와의 관계</label>
                    <input
                      type="text"
                      value={tplShareholderRel}
                      onChange={(e) => setTplShareholderRel(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">비고 (도장 제거 공란)</label>
                    <input
                      type="text"
                      value={tplShareholderNote}
                      onChange={(e) => setTplShareholderNote(e.target.value)}
                      placeholder="공란 유지 (출력 후 실물 인감 날인)"
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5"
                    />
                  </div>
                </div>
              </>
            ) : tplType === "RESOLUTION" ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">1. 결의 일자 표기</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={tplResolutionDateKor}
                        onChange={(e) => setTplResolutionDateKor(e.target.value)}
                        placeholder="2026년 09월 14일"
                        className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold w-full"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const y = now.getFullYear();
                          const m = String(now.getMonth() + 1).padStart(2, "0");
                          const d = String(now.getDate()).padStart(2, "0");
                          setTplResolutionDateKor(`${y}년 ${m}월 ${d}일`);
                        }}
                        className="px-2 py-1.5 rounded bg-[#334155] text-white font-bold whitespace-nowrap shrink-0"
                      >
                        오늘
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">2. 발행·의결·동의 주식수</label>
                    <input
                      type="text"
                      value={tplShareholderShares}
                      onChange={(e) => setTplShareholderShares(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155]">3. 결의 안건 제목</label>
                  <input
                    type="text"
                    value={tplAgendaTitle}
                    onChange={(e) => setTplAgendaTitle(e.target.value)}
                    className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155]">결의 안건 본문</label>
                  <textarea
                    rows={2}
                    value={tplAgendaBody}
                    onChange={(e) => setTplAgendaBody(e.target.value)}
                    className="bg-[#ebe5d8] border border-[#b5a894] rounded p-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">대비표 소제목</label>
                    <input
                      type="text"
                      value={tplCompareTableTitle}
                      onChange={(e) => setTplCompareTableTitle(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">대상 정관 조문명</label>
                    <input
                      type="text"
                      value={tplArticleNo}
                      onChange={(e) => setTplArticleNo(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">현행 정관 (좌측 열)</label>
                    <textarea
                      rows={6}
                      value={tplBeforeText}
                      onChange={(e) => setTplBeforeText(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded p-2 font-mono text-[11px] leading-relaxed"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">
                      변경안 (우측 열 · (신설)/(조항) 포함 시 자동 굵게)
                    </label>
                    <textarea
                      rows={6}
                      value={tplAfterText}
                      onChange={(e) => setTplAfterText(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded p-2 font-mono text-[11px] leading-relaxed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">주주 겸 대표이사</label>
                    <input
                      type="text"
                      value={tplShareholderName}
                      onChange={(e) => setTplShareholderName(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="font-bold text-[#334155]">주주 주소</label>
                    <input
                      type="text"
                      value={tplShareholderAddr}
                      onChange={(e) => setTplShareholderAddr(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">결의(기준) 일자</label>
                    <input
                      type="date"
                      value={tplResolutionDate}
                      onChange={(e) => setTplResolutionDate(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">개정 정관 시행일 (부칙)</label>
                    <input
                      type="date"
                      value={tplEffectiveDate}
                      onChange={(e) => setTplEffectiveDate(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>

                {tplType === "COMPARE_TABLE" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-[#334155]">변경 조항</label>
                        <input
                          type="text"
                          value={tplArticleNo}
                          onChange={(e) => setTplArticleNo(e.target.value)}
                          className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-[#334155]">개정 사유</label>
                        <input
                          type="text"
                          value={tplReasonText}
                          onChange={(e) => setTplReasonText(e.target.value)}
                          className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-[#334155]">현행 정관 (변경 전)</label>
                      <textarea
                        rows={5}
                        value={tplBeforeText}
                        onChange={(e) => setTplBeforeText(e.target.value)}
                        className="bg-[#ebe5d8] border border-[#b5a894] rounded p-2 font-mono text-[11px]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-[#334155]">개정 정관 (변경 후)</label>
                      <textarea
                        rows={5}
                        value={tplAfterText}
                        onChange={(e) => setTplAfterText(e.target.value)}
                        className="bg-[#ebe5d8] border border-[#b5a894] rounded p-2 font-mono text-[11px]"
                      />
                    </div>
                  </>
                )}

                {tplType === "SHAREHOLDER_LIST" && (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">1인 주주(이정용) 주소</label>
                    <input
                      type="text"
                      value={tplShareholderAddr}
                      onChange={(e) => setTplShareholderAddr(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                    />
                  </div>
                )}
              </>
            )}

            <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] space-y-1 text-[11px] text-[#334155]">
              <div className="font-bold text-[#0f172a]">인쇄·날인 후 보관함 등록 안내</div>
              <p>
                도장 이미지는 모두 제거되어 공란으로 출력됩니다. 우측 상단 <strong>[A4 1장 인쇄 / PDF 저장]</strong>을 클릭하여 출력 후 실물 인감을 날인하고, 스캔본을 아래 버튼으로 버전 히스토리에 등록하십시오.
              </p>
              <div className="pt-1 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-SHAREHOLDER-LIST", true)}
                  className="px-2 py-1 rounded bg-[#047857] text-white font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>주주명세서(주주명부) 버전 등록</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-SHAREHOLDER-RES", true)}
                  className="px-2 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>주주서면결의서 버전 등록</span>
                </button>
                <a
                  href="/shareholder-registry"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded bg-[#334155] text-white font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>전용 풀스크린 발급기 열기 ↗</span>
                </a>
              </div>
            </div>
          </div>

          <TemplateStudioPreviewSheet
            corp={corp}
            tplType={tplType}
            tplBaseDateText={tplBaseDateText}
            tplShareholderName={tplShareholderName}
            tplShareholderRegNo={tplShareholderRegNo}
            tplShareholderZip={tplShareholderZip}
            tplShareholderPhone={tplShareholderPhone}
            tplShareholderShares={tplShareholderShares}
            tplShareholderParValue={tplShareholderParValue}
            tplShareholderAmount={tplShareholderAmount}
            tplShareholderRatio={tplShareholderRatio}
            tplShareholderRel={tplShareholderRel}
            tplShareholderNote={tplShareholderNote}
            tplBlankRowsCount={tplBlankRowsCount}
            tplResolutionDate={tplResolutionDate}
            tplResolutionDateKor={tplResolutionDateKor}
            tplEffectiveDate={tplEffectiveDate}
            tplAgendaTitle={tplAgendaTitle}
            tplAgendaBody={tplAgendaBody}
            tplCompareTableTitle={tplCompareTableTitle}
            tplArticleNo={tplArticleNo}
            tplBeforeText={tplBeforeText}
            tplAfterText={tplAfterText}
            tplReasonText={tplReasonText}
            tplShareholderAddr={tplShareholderAddr}
            handleCopyTemplate={handleCopyTemplate}
            handlePrintTemplate={handlePrintTemplate}
          />
        </div>
  );
};
