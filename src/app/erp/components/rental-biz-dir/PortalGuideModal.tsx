"use client";

import React, { useState } from "react";
import { ShieldCheck, X, ExternalLink, Download } from "lucide-react";
import officialMolitStats from "@/app/api/erp/rental-directory/officialMolitStats.json";
import { sortErpItems } from "@/lib/erpFormat";
import { SortableTh, useErpTableSort } from "../SortableTh";
import { OFFICIAL_PORTAL_LINKS } from "./rentalBizTypes";

export interface PortalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PortalGuideModal: React.FC<PortalGuideModalProps> = ({ isOpen, onClose }) => {
  const [portalModalTab, setPortalModalTab] = useState<
    "OPERATORS" | "MACHINES" | "GOV_CSV" | "PORTALS"
  >("OPERATORS");

  const opStatsSort = useErpTableSort("", null);
  const machStatsSort = useErpTableSort("", null);
  const govCsvSort = useErpTableSort("", null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#f4efe4] border border-[#b8ae99] rounded w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-4 py-3 bg-[#e2dbcd] border-b border-[#b8ae99] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-extrabold text-sm text-[#0f172a]">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>
              국토교통부·대한건설기계협회 건설기계 등록/사업자 원천 통계 및 지자체 인허가 CSV 원부
            </span>
          </div>
          <button onClick={onClose} type="button">
            <X className="w-4 h-4 text-[#475569]" />
          </button>
        </div>

        {/* 상단 4개 서브탭 */}
        <div className="px-4 py-2 bg-[#ebe5d8] border-b border-[#b8ae99] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPortalModalTab("OPERATORS")}
              className={`px-3 py-1 rounded text-xs font-extrabold whitespace-nowrap ${
                portalModalTab === "OPERATORS"
                  ? "bg-[#1d4ed8] text-white"
                  : "bg-[#f4efe4] text-[#334155] border border-[#b8ae99]"
              }`}
            >
              ① 시도별 건설기계 사업자 현황 (대여·정비·매매)
            </button>
            <button
              type="button"
              onClick={() => setPortalModalTab("MACHINES")}
              className={`px-3 py-1 rounded text-xs font-extrabold whitespace-nowrap ${
                portalModalTab === "MACHINES"
                  ? "bg-[#1d4ed8] text-white"
                  : "bg-[#f4efe4] text-[#334155] border border-[#b8ae99]"
              }`}
            >
              ② 27개 기종별·용도별 등록현황 (지게차·굴착기 등)
            </button>
            <button
              type="button"
              onClick={() => setPortalModalTab("GOV_CSV")}
              className={`px-3 py-1 rounded text-xs font-extrabold whitespace-nowrap ${
                portalModalTab === "GOV_CSV"
                  ? "bg-[#1d4ed8] text-white"
                  : "bg-[#f4efe4] text-[#334155] border border-[#b8ae99]"
              }`}
            >
              ③ 지자체 인허가 원부 CSV 직통 다운로드 (15종)
            </button>
            <button
              type="button"
              onClick={() => setPortalModalTab("PORTALS")}
              className={`px-3 py-1 rounded text-xs font-extrabold whitespace-nowrap ${
                portalModalTab === "PORTALS"
                  ? "bg-[#1d4ed8] text-white"
                  : "bg-[#f4efe4] text-[#334155] border border-[#b8ae99]"
              }`}
            >
              ④ 공식 원천기관 바로가기 안내
            </button>
          </div>
          <span className="text-[11px] font-bold text-[#1e3a8a]">
            기준: {officialMolitStats.asOfDate}
          </span>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-3 text-xs">
          {portalModalTab === "OPERATORS" && (
            <div className="space-y-2.5">
              <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b8ae99] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-extrabold text-[#0f172a]">
                    원천 출처: 국토교통부 통계누리(stat.molit.go.kr) & 대한건설기계협회(kcea.or.kr/Source/ke/ke0102.htm)
                  </div>
                  <div className="text-[11px] text-[#334155]">
                    • <strong>일반 대여업</strong>: 5대 이상 건설기계 보유 법인/공동사업자 (공동 등록 1인 차주 = <strong>연명자</strong>) |{" "}
                    <strong>개별 대여업</strong>: 4대 이하 1인/개별 사업자
                  </div>
                </div>
                <a
                  href="http://www.kcea.or.kr/Source/ke/ke0102.htm"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] text-white font-bold flex items-center gap-1 whitespace-nowrap"
                >
                  <span>대한건설기계협회 원문 표 열기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="overflow-x-auto border border-[#b8ae99] rounded bg-white">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-[#e2dbcd] text-[#0f172a] border-b border-[#b8ae99]">
                    <tr>
                      <SortableTh label="시·도 구분" colKey="0" sortKey={opStatsSort.sortKey} sortDir={opStatsSort.sortDir} onSort={opStatsSort.handleSort} className="py-2 px-2.5 font-extrabold" />
                      <SortableTh label="대여업체 (계)" colKey="1" sortKey={opStatsSort.sortKey} sortDir={opStatsSort.sortDir} onSort={opStatsSort.handleSort} className="py-2 px-2.5 font-extrabold text-blue-900" />
                      <SortableTh label="대여 (일반 5대↑)" colKey="2" sortKey={opStatsSort.sortKey} sortDir={opStatsSort.sortDir} onSort={opStatsSort.handleSort} className="py-2 px-2.5 font-extrabold" />
                      <SortableTh label="대여 (개별 4대↓)" colKey="3" sortKey={opStatsSort.sortKey} sortDir={opStatsSort.sortDir} onSort={opStatsSort.handleSort} className="py-2 px-2.5 font-extrabold" />
                      <SortableTh label="정비업체 (계)" colKey="4" sortKey={opStatsSort.sortKey} sortDir={opStatsSort.sortDir} onSort={opStatsSort.handleSort} className="py-2 px-2.5 font-extrabold text-emerald-900" />
                      <SortableTh label="정비 (종합)" colKey="5" sortKey={opStatsSort.sortKey} sortDir={opStatsSort.sortDir} onSort={opStatsSort.handleSort} className="py-2 px-2.5 font-extrabold" />
                      <SortableTh label="정비 (부분)" colKey="6" sortKey={opStatsSort.sortKey} sortDir={opStatsSort.sortDir} onSort={opStatsSort.handleSort} className="py-2 px-2.5 font-extrabold" />
                      <SortableTh label="정비 (전문)" colKey="7" sortKey={opStatsSort.sortKey} sortDir={opStatsSort.sortDir} onSort={opStatsSort.handleSort} className="py-2 px-2.5 font-extrabold" />
                      <SortableTh label="매매업체" colKey="8" sortKey={opStatsSort.sortKey} sortDir={opStatsSort.sortDir} onSort={opStatsSort.handleSort} className="py-2 px-2.5 font-extrabold text-amber-900" />
                      <SortableTh label="해체재활용업체" colKey="9" sortKey={opStatsSort.sortKey} sortDir={opStatsSort.sortDir} onSort={opStatsSort.handleSort} className="py-2 px-2.5 font-extrabold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2dbcd]">
                    {[
                      officialMolitStats.operatorsByRegion[2],
                      ...sortErpItems(
                        officialMolitStats.operatorsByRegion.slice(3),
                        opStatsSort.sortKey,
                        opStatsSort.sortDir,
                        (row: any, k: string) => row[Number(k)]
                      ),
                    ]
                      .filter(Boolean)
                      .map((row: any, idx: number) => (
                      <tr
                        key={idx}
                        className={idx === 0 ? "bg-amber-50 font-extrabold text-[#0f172a]" : "hover:bg-[#f8f4ec]"}
                      >
                        <td className="py-1.5 px-2.5 text-left font-extrabold whitespace-nowrap">{row[0]}</td>
                        <td className="py-1.5 px-2.5 font-mono font-bold text-blue-900 whitespace-nowrap">{row[1]}</td>
                        <td className="py-1.5 px-2.5 font-mono whitespace-nowrap">{row[2]}</td>
                        <td className="py-1.5 px-2.5 font-mono whitespace-nowrap">{row[3]}</td>
                        <td className="py-1.5 px-2.5 font-mono font-bold text-emerald-900 whitespace-nowrap">{row[4]}</td>
                        <td className="py-1.5 px-2.5 font-mono whitespace-nowrap">{row[5]}</td>
                        <td className="py-1.5 px-2.5 font-mono whitespace-nowrap">{row[6]}</td>
                        <td className="py-1.5 px-2.5 font-mono whitespace-nowrap">{row[7]}</td>
                        <td className="py-1.5 px-2.5 font-mono font-bold text-amber-900 whitespace-nowrap">{row[8]}</td>
                        <td className="py-1.5 px-2.5 font-mono whitespace-nowrap">{row[9]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {portalModalTab === "MACHINES" && (
            <div className="space-y-2.5">
              <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b8ae99] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-extrabold text-[#0f172a]">
                    원천 출처: 국토교통부 건설기계현황통계 & 대한건설기계협회(kcea.or.kr/Source/ke/ke0101.htm)
                  </div>
                  <div className="text-[11px] text-[#334155]">
                    • 법정 27개 건설기종별 자가용 / 영업용(대여업 등록 장비) / 관용 등록 대수 원천 집계표입니다.
                  </div>
                </div>
                <a
                  href="http://www.kcea.or.kr/Source/ke/ke0101.htm"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] text-white font-bold flex items-center gap-1 whitespace-nowrap"
                >
                  <span>기종별·시도별 등록현황 원문 열기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="overflow-x-auto border border-[#b8ae99] rounded bg-white">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-[#e2dbcd] text-[#0f172a] border-b border-[#b8ae99]">
                    <tr>
                      <SortableTh label="건설기계 기종 구분 (27종)" colKey="0" sortKey={machStatsSort.sortKey} sortDir={machStatsSort.sortDir} onSort={machStatsSort.handleSort} className="py-2 px-3 font-extrabold" />
                      <SortableTh label="자가용 (대)" colKey="1" sortKey={machStatsSort.sortKey} sortDir={machStatsSort.sortDir} onSort={machStatsSort.handleSort} className="py-2 px-3 font-extrabold" />
                      <SortableTh label="영업용 / 대여용 (대)" colKey="2" sortKey={machStatsSort.sortKey} sortDir={machStatsSort.sortDir} onSort={machStatsSort.handleSort} className="py-2 px-3 font-extrabold text-blue-900" />
                      <SortableTh label="관용 (대)" colKey="3" sortKey={machStatsSort.sortKey} sortDir={machStatsSort.sortDir} onSort={machStatsSort.handleSort} className="py-2 px-3 font-extrabold" />
                      <SortableTh label="총 등록대수 (계)" colKey="4" sortKey={machStatsSort.sortKey} sortDir={machStatsSort.sortDir} onSort={machStatsSort.handleSort} className="py-2 px-3 font-extrabold text-amber-900" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2dbcd]">
                    {[
                      officialMolitStats.registrationByMachineUsage[1],
                      ...sortErpItems(
                        officialMolitStats.registrationByMachineUsage.slice(2),
                        machStatsSort.sortKey,
                        machStatsSort.sortDir,
                        (row: any, k: string) => row[Number(k)]
                      ),
                    ]
                      .filter(Boolean)
                      .map((row: any, idx: number) => {
                      const isForklift = String(row[0] || "").includes("지게차");
                      return (
                        <tr
                          key={idx}
                          className={
                            idx === 0
                              ? "bg-amber-50 font-extrabold text-[#0f172a]"
                              : isForklift
                              ? "bg-blue-50 font-extrabold text-blue-950"
                              : "hover:bg-[#f8f4ec]"
                          }
                        >
                          <td className="py-1.5 px-3 text-left font-bold whitespace-nowrap">{row[0]}</td>
                          <td className="py-1.5 px-3 font-mono whitespace-nowrap">{row[1]}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">{row[2]}</td>
                          <td className="py-1.5 px-3 font-mono whitespace-nowrap">{row[3]}</td>
                          <td className="py-1.5 px-3 font-mono font-extrabold whitespace-nowrap">{row[4]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {portalModalTab === "GOV_CSV" && (
            <div className="space-y-2.5">
              <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b8ae99] space-y-1">
                <div className="font-extrabold text-[#0f172a]">
                  행정안전부 공공데이터포털(data.go.kr) 지자체별 『건설기계사업자(대여·매매·정비) 인허가 원부』 원천 CSV 다운로드
                </div>
                <div className="text-[11px] text-[#334155]">
                  • 위 통계표의 숫자(대여업체 15,110개, 매매업체 1,759개)를 구성하는 <strong>각 시·도 및 시·군·구청 건설기계관리법 제21조 실제 인허가 대장(상호, 사업유형, 등록종별, 도로명주소, 전화번호)</strong> 원천 CSV 파일입니다. (본 ERP 디렉토리에도 지게차·리프트·매매업 법인이 이미 자동 반영되어 있습니다.)
                </div>
              </div>

              <div className="overflow-x-auto border border-[#b8ae99] rounded bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#e2dbcd] text-[#0f172a] border-b border-[#b8ae99]">
                    <tr>
                      <SortableTh label="관할 지자체" colKey="region" sortKey={govCsvSort.sortKey} sortDir={govCsvSort.sortDir} onSort={govCsvSort.handleSort} className="py-2 px-2.5 font-extrabold" />
                      <SortableTh label="공공데이터 인허가 원부명" colKey="title" sortKey={govCsvSort.sortKey} sortDir={govCsvSort.sortDir} onSort={govCsvSort.handleSort} className="py-2 px-2.5 font-extrabold" />
                      <SortableTh label="원천 파일명" colKey="fileName" sortKey={govCsvSort.sortKey} sortDir={govCsvSort.sortDir} onSort={govCsvSort.handleSort} className="py-2 px-2.5 font-extrabold" />
                      <SortableTh label="수록 업체수" colKey="rowCount" sortKey={govCsvSort.sortKey} sortDir={govCsvSort.sortDir} onSort={govCsvSort.handleSort} align="right" className="py-2 px-2.5 font-extrabold" />
                      <th className="py-2 px-2.5 text-center font-extrabold whitespace-nowrap">원천 파일 다운로드</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2dbcd]">
                    {sortErpItems(
                      officialMolitStats.govCsvFiles,
                      govCsvSort.sortKey,
                      govCsvSort.sortDir
                    ).map((csv: any) => (
                      <tr key={csv.pk} className="hover:bg-[#f8f4ec]">
                        <td className="py-1.5 px-2.5 font-extrabold text-[#0f172a] whitespace-nowrap">
                          {csv.region}
                        </td>
                        <td className="py-1.5 px-2.5 font-bold text-[#1e293b] whitespace-nowrap">
                          {csv.title}
                        </td>
                        <td className="py-1.5 px-2.5 text-[11px] text-[#475569] whitespace-nowrap">
                          {csv.fileName}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-extrabold text-blue-900 whitespace-nowrap">
                          {csv.rowCount.toLocaleString()}개사
                        </td>
                        <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={csv.directDownloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-extrabold inline-flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              <span>원천 CSV 다운로드</span>
                            </a>
                            <a
                              href={csv.pageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded bg-[#ebe5d8] hover:bg-[#d8d0c0] border border-[#b8ae99] text-[#0f172a] text-[11px] font-bold inline-flex items-center gap-0.5"
                            >
                              <span>공공데이터 상세</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {portalModalTab === "PORTALS" && (
            <div className="space-y-3">
              <div className="p-3 rounded bg-[#ebe5d8] border border-[#b8ae99] space-y-1.5">
                <div className="font-extrabold text-[#0f172a]">
                  지게차(FL)와 고소작업대(AWP 리프트)의 법적 인허가 원천 차이
                </div>
                <ul className="list-disc list-inside space-y-1 text-[#334155] leading-relaxed">
                  <li>
                    <strong>지게차 (FL) 및 건설기계 (대여업체 15,110개 / 매매업체 1,759개)</strong>는 『건설기계관리법』상 27종 법정 건설기계이므로 국토교통부 통계누리(<code>stat.molit.go.kr</code>), 대한건설기계협회(<code>kcea.or.kr</code>), 공공데이터포털 지자체 인허가 원부(<code>data.go.kr</code>)에 의무 등재됩니다.
                  </li>
                  <li>
                    반면 <strong>고소작업대 (AWP 시저스/붐 리프트)</strong>는 번호판이 붙는 건설기계가 아니라 『산업안전보건법』상 위험기계·기구로 분류되어 세무서 일반 임대업(KSIC 71201)으로 등록하므로, <strong>한국고소작업대임대업협동조합(klra.or.kr) 회원사 명부(101개사)</strong> 및 <strong>NICE평가정보·산군 기업DB</strong>가 공식 원천입니다.
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {OFFICIAL_PORTAL_LINKS.map((p) => (
                  <a
                    key={p.name}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded bg-[#f8f4ec] hover:bg-[#e2dbcd] border border-[#b8ae99] flex flex-col justify-between gap-1 transition"
                  >
                    <div className="font-extrabold text-[#1d4ed8] flex items-center justify-between">
                      <span>{p.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </div>
                    <p className="text-[11px] text-[#475569]">{p.desc}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-2.5 bg-[#e2dbcd] border-t border-[#b8ae99] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#0f172a] text-white text-xs font-bold"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
