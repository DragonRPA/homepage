"use client";

import React from "react";
import { Copy, ExternalLink, Printer, Upload } from "lucide-react";
import type { BusinessEntity } from "@/lib/businessEntities";
import { formatErpInputNumber } from "@/lib/erpFormat";
import type { CorporateTemplateType } from "./corporateDocTypes";

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
                <button
                  type="button"
                  onClick={() => setTplType("SHAREHOLDER_STATEMENT")}
                  className={`py-2 px-2 rounded border font-bold text-center whitespace-nowrap transition ${
                    tplType === "SHAREHOLDER_STATEMENT"
                      ? "bg-[#6d28d9] text-white border-[#5b21b6]"
                      : "bg-[#ebe5d8] text-[#0f172a] border-[#b5a894]"
                  }`}
                >
                  ① 주주명세서 (표준표)
                </button>
                <button
                  type="button"
                  onClick={() => setTplType("RESOLUTION")}
                  className={`py-2 px-2 rounded border font-bold text-center whitespace-nowrap transition ${
                    tplType === "RESOLUTION"
                      ? "bg-[#6d28d9] text-white border-[#5b21b6]"
                      : "bg-[#ebe5d8] text-[#0f172a] border-[#b5a894]"
                  }`}
                >
                  ② 주주서면결의서
                </button>
                <button
                  type="button"
                  onClick={() => setTplType("COMPARE_TABLE")}
                  className={`py-2 px-2 rounded border font-bold text-center whitespace-nowrap transition ${
                    tplType === "COMPARE_TABLE"
                      ? "bg-[#6d28d9] text-white border-[#5b21b6]"
                      : "bg-[#ebe5d8] text-[#0f172a] border-[#b5a894]"
                  }`}
                >
                  ③ 신·구조문대비표
                </button>
                <button
                  type="button"
                  onClick={() => setTplType("SHAREHOLDER_LIST")}
                  className={`py-2 px-2 rounded border font-bold text-center whitespace-nowrap transition ${
                    tplType === "SHAREHOLDER_LIST"
                      ? "bg-[#6d28d9] text-white border-[#5b21b6]"
                      : "bg-[#ebe5d8] text-[#0f172a] border-[#b5a894]"
                  }`}
                >
                  ④ 등기용 주주명부
                </button>
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

          {/* 우측 실시간 서식 원문 프리뷰 및 인쇄/복사 (7컬럼) */}
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
                  style={{
                    fontFamily:
                      "'Malgun Gothic', '맑은 고딕', 'Dotum', '돋움', sans-serif",
                  }}
                >
                  {/* 상단 타이틀 테이블 */}
                  <table
                    className="w-full border-collapse mb-1.5"
                    style={{ border: "1.5px solid #000", tableLayout: "fixed" }}
                  >
                    <tbody>
                      <tr>
                        <td
                          className="text-center font-bold text-[12px] align-middle"
                          style={{
                            width: "28%",
                            padding: "8px 4px",
                            border: "1.5px solid #000",
                          }}
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
                        <td
                          className="p-0"
                          style={{ width: "28%", border: "1.5px solid #000" }}
                        >
                          <table
                            className="w-full border-collapse"
                            style={{ tableLayout: "fixed" }}
                          >
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
                  <table
                    className="w-full border-collapse text-[11px]"
                    style={{ border: "1.5px solid #000", tableLayout: "fixed" }}
                  >
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
                        <th
                          className="text-center font-semibold py-1"
                          style={{ border: "1px solid #000" }}
                        >
                          ①성 명
                          <br />
                          (회사명)
                        </th>
                        <th
                          className="text-center font-semibold py-1"
                          style={{ border: "1px solid #000" }}
                        >
                          ②주민등록번호
                          <br />
                          (법인등록번호)
                        </th>
                        <th
                          rowSpan={2}
                          className="text-center font-semibold py-1 align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          ④전화번호
                          <br />
                          (휴대전화)
                        </th>
                        <th
                          colSpan={4}
                          className="text-center font-semibold py-0.5"
                          style={{ border: "1px solid #000" }}
                        >
                          지분 또는 출자관계
                        </th>
                        <th
                          rowSpan={2}
                          className="text-center font-semibold py-1 align-middle leading-tight text-[10px]"
                          style={{ border: "1px solid #000" }}
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
                          style={{ border: "1px solid #000" }}
                        >
                          비
                          <br />고
                        </th>
                      </tr>
                      <tr>
                        <th
                          colSpan={2}
                          className="text-center font-semibold py-0.5"
                          style={{ border: "1px solid #000" }}
                        >
                          ③주 소
                        </th>
                        <th
                          className="text-center font-semibold py-0.5"
                          style={{ border: "1px solid #000" }}
                        >
                          ⑤ 주식수
                        </th>
                        <th
                          className="text-center font-semibold py-0.5 leading-tight text-[10px]"
                          style={{ border: "1px solid #000" }}
                        >
                          ⑥ 주당
                          <br />
                          액면가액
                        </th>
                        <th
                          className="text-center font-semibold py-0.5"
                          style={{ border: "1px solid #000" }}
                        >
                          ⑦ 금 액
                        </th>
                        <th
                          className="text-center font-semibold py-0.5 leading-tight text-[10px]"
                          style={{ border: "1px solid #000" }}
                        >
                          ⑧지분율
                          <br />
                          (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ height: "24px" }}>
                        <td
                          className="text-center font-medium"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderName}
                        </td>
                        <td
                          className="text-center font-mono"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderRegNo}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-center font-mono align-middle leading-tight"
                          style={{ border: "1px solid #000" }}
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
                        <td
                          rowSpan={2}
                          className="text-right pr-1.5 font-mono align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderShares}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-right pr-1.5 align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderParValue}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-right pr-1.5 font-mono align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderAmount}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-center font-mono align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderRatio}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-center align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderRel}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-center align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderNote}
                        </td>
                      </tr>
                      <tr style={{ height: "38px" }}>
                        <td
                          colSpan={2}
                          className="px-1.5 py-0.5 align-top text-[10.5px] leading-tight"
                          style={{ border: "1px solid #000" }}
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
                            <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                            <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                          </tr>
                          <tr style={{ height: "32px" }}>
                            <td colSpan={2} style={{ border: "1px solid #000" }}>
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
                  style={{
                    fontFamily:
                      "'Malgun Gothic', '맑은 고딕', 'Dotum', '돋움', sans-serif",
                  }}
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
                        결의에 동의한 주식 총수: {tplShareholderShares}주 (동의율{" "}
                        {tplShareholderRatio}%)
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
                    <table
                      className="w-full border-collapse text-[12.5px]"
                      style={{ border: "1px solid #cbd5e1", tableLayout: "fixed" }}
                    >
                      <colgroup>
                        <col style={{ width: "50%" }} />
                        <col style={{ width: "50%" }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-slate-50">
                          <th
                            className="text-left font-bold py-2 px-3"
                            style={{ border: "1px solid #cbd5e1" }}
                          >
                            현행 정관
                          </th>
                          <th
                            className="text-left font-bold py-2 px-3"
                            style={{ border: "1px solid #cbd5e1" }}
                          >
                            변경안
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td
                            className="align-top py-2.5 px-3 space-y-1.5"
                            style={{ border: "1px solid #cbd5e1" }}
                          >
                            <div className="font-bold mb-1.5">{tplArticleNo}</div>
                            {tplBeforeText.split("\n").map((line, i) => (
                              <div key={i}>{line}</div>
                            ))}
                          </td>
                          <td
                            className="align-top py-2.5 px-3 space-y-1.5"
                            style={{ border: "1px solid #cbd5e1" }}
                          >
                            <div className="font-bold mb-1.5">{tplArticleNo}</div>
                            {tplAfterText.split("\n").map((line, i) => {
                              const isBold =
                                line.includes("(신설)") || line.includes("(조항");
                              return (
                                <div key={i} className={isBold ? "font-bold" : ""}>
                                  {line}
                                </div>
                              );
                            })}
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
                    <div className="font-bold pt-1">
                      주주 겸 대표이사: {tplShareholderName}
                    </div>
                    <div>주소: {tplShareholderAddr}</div>
                    <div>주식 수: {tplShareholderShares}주</div>
                    <div className="pt-2">
                      서명/날인: {tplShareholderName}{" "}
                      <span className="inline-block w-24" />
                    </div>
                  </div>
                </div>
              ) : tplType === "COMPARE_TABLE" ? (
                <div
                  className="w-full max-w-[760px] bg-white text-black p-6 border border-slate-300 shadow-sm space-y-3 text-[12.5px] leading-relaxed"
                  style={{
                    fontFamily:
                      "'Malgun Gothic', '맑은 고딕', 'Dotum', '돋움', sans-serif",
                  }}
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
                      <strong>대상 법인:</strong> {corp.corpName} ({corp.bizNum} /{" "}
                      {corp.corpRegNum})
                    </span>
                    <span className="font-mono">
                      <strong>결의일:</strong> {tplResolutionDate} /{" "}
                      <strong>시행일:</strong> {tplEffectiveDate}
                    </span>
                  </div>

                  <table
                    className="w-full border-collapse text-[12px]"
                    style={{ border: "1.5px solid #000", tableLayout: "fixed" }}
                  >
                    <colgroup>
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "35%" }} />
                      <col style={{ width: "35%" }} />
                      <col style={{ width: "16%" }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-50">
                        <th
                          className="py-2 px-2 text-center font-bold"
                          style={{ border: "1px solid #000" }}
                        >
                          구 분
                        </th>
                        <th
                          className="py-2 px-2 text-center font-bold"
                          style={{ border: "1px solid #000" }}
                        >
                          현행 정관 (변경 전)
                        </th>
                        <th
                          className="py-2 px-2 text-center font-bold"
                          style={{ border: "1px solid #000" }}
                        >
                          개정 정관 (변경 후)
                        </th>
                        <th
                          className="py-2 px-2 text-center font-bold"
                          style={{ border: "1px solid #000" }}
                        >
                          개정 사유
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td
                          className="p-2.5 text-center font-bold align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplArticleNo}
                        </td>
                        <td
                          className="p-2.5 align-top space-y-1"
                          style={{ border: "1px solid #000" }}
                        >
                          <div className="font-bold mb-1">
                            회사는 다음의 사업을 영위함을 목적으로 한다.
                          </div>
                          {tplBeforeText.split("\n").map((line, i) => (
                            <div key={i}>{line}</div>
                          ))}
                        </td>
                        <td
                          className="p-2.5 align-top space-y-1"
                          style={{ border: "1px solid #000" }}
                        >
                          <div className="font-bold mb-1">
                            회사는 다음의 사업을 영위함을 목적으로 한다.
                          </div>
                          {tplAfterText.split("\n").map((line, i) => {
                            const isBold =
                              line.includes("(신설)") || line.includes("(조항");
                            return (
                              <div key={i} className={isBold ? "font-bold" : ""}>
                                {line}
                              </div>
                            );
                          })}
                        </td>
                        <td
                          className="p-2.5 text-center align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplReasonText}
                        </td>
                      </tr>
                      <tr>
                        <td
                          className="p-2.5 text-center font-bold align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          부 칙
                        </td>
                        <td
                          className="p-2.5 text-center text-slate-500 align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          (신설)
                        </td>
                        <td
                          className="p-2.5 align-top space-y-1"
                          style={{ border: "1px solid #000" }}
                        >
                          <div className="font-bold">제1조 (시행일)</div>
                          <div>이 정관은 {tplEffectiveDate}부터 시행한다.</div>
                        </td>
                        <td
                          className="p-2.5 text-center align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          개정 정관 시행일 명시
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  className="w-full max-w-[760px] bg-white text-black p-7 border border-slate-300 shadow-sm space-y-4 text-[12.5px] leading-relaxed"
                  style={{
                    fontFamily:
                      "'Malgun Gothic', '맑은 고딕', 'Dotum', '돋움', sans-serif",
                  }}
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
                        <strong>법인등록번호 :</strong> {corp.corpRegNum} (사업자등록번호:{" "}
                        {corp.bizNum})
                      </div>
                      <div>
                        <strong>발행주식총수 :</strong>{" "}
                        {(corp.totalShares || 10000).toLocaleString()} 주 (1주의 금액:{" "}
                        {(corp.parValue || 500).toLocaleString()} 원 / 자본금:{" "}
                        {corp.capitalStock.toLocaleString()} 원)
                      </div>
                    </div>
                    <div className="font-bold font-mono">
                      기준일 : {tplResolutionDate}
                    </div>
                  </div>

                  <table
                    className="w-full border-collapse text-[11.5px]"
                    style={{ border: "1.5px solid #000", tableLayout: "fixed" }}
                  >
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
                        <th
                          className="py-2 px-1 text-center font-bold"
                          style={{ border: "1px solid #000" }}
                        >
                          순번
                        </th>
                        <th
                          className="py-2 px-1 text-center font-bold"
                          style={{ border: "1px solid #000" }}
                        >
                          주주명
                        </th>
                        <th
                          className="py-2 px-1 text-center font-bold"
                          style={{ border: "1px solid #000" }}
                        >
                          주민등록번호
                        </th>
                        <th
                          className="py-2 px-1 text-center font-bold"
                          style={{ border: "1px solid #000" }}
                        >
                          주 소
                        </th>
                        <th
                          className="py-2 px-1 text-center font-bold"
                          style={{ border: "1px solid #000" }}
                        >
                          주식의 종류
                        </th>
                        <th
                          className="py-2 px-1 text-center font-bold"
                          style={{ border: "1px solid #000" }}
                        >
                          보유주식 수
                        </th>
                        <th
                          className="py-2 px-1 text-center font-bold"
                          style={{ border: "1px solid #000" }}
                        >
                          주식보유금액
                        </th>
                        <th
                          className="py-2 px-1 text-center font-bold"
                          style={{ border: "1px solid #000" }}
                        >
                          지분율
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td
                          className="py-2.5 px-1 text-center align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          1
                        </td>
                        <td
                          className="py-2.5 px-1 text-center font-bold align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderName}
                        </td>
                        <td
                          className="py-2.5 px-1 text-center font-mono align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderRegNo}
                        </td>
                        <td
                          className="py-2 px-2 text-left align-middle text-[11px] leading-snug"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderAddr}
                        </td>
                        <td
                          className="py-2.5 px-1 text-center align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          보통주
                        </td>
                        <td
                          className="py-2.5 px-2 text-right font-mono align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderShares} 주
                        </td>
                        <td
                          className="py-2.5 px-2 text-right font-mono align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderAmount}
                        </td>
                        <td
                          className="py-2.5 px-1 text-center font-mono font-bold align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderRatio}%
                        </td>
                      </tr>
                      <tr style={{ height: "34px" }}>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                      </tr>
                      <tr style={{ height: "34px" }}>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                        <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold">
                        <td
                          colSpan={5}
                          className="py-2.5 px-2 text-center align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          총 계
                        </td>
                        <td
                          className="py-2.5 px-2 text-right font-mono align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderShares} 주
                        </td>
                        <td
                          className="py-2.5 px-2 text-right font-mono align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderAmount}
                        </td>
                        <td
                          className="py-2.5 px-1 text-center font-mono align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderRatio}%
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="text-center pt-3 text-[13.5px]">
                    위 기재 사실이 틀림없음을 증명합니다.
                  </p>

                  <div className="text-center font-bold font-mono text-[13.5px] py-2">
                    {tplResolutionDate}
                  </div>

                  <div className="text-center space-y-1 pt-2">
                    <div className="font-bold text-[14.5px]">{corp.corpName}</div>
                    <div className="text-[12px] text-slate-700">
                      본점 : {corp.address}
                    </div>
                    <div className="font-bold text-[14.5px] pt-2">
                      대표이사 &nbsp; {corp.ceoName} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (인)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
  );
};
