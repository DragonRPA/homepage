"use client";

import React from "react";
import {
  Building2,
  Truck,
  Layers,
  Monitor,
  Search,
  Download,
  Plus,
  RefreshCw,
  Bookmark,
  BookOpen,
  UserPlus,
  Sparkles,
  ShieldCheck,
  Check,
  Globe,
} from "lucide-react";
import type { SortDirection } from "@/lib/erpFormat";
import { SortableTh } from "../SortableTh";
import {
  RentalBizRecord,
  SECTOR_META,
  OaSupplyType,
  OA_SUPPLY_META,
  resolveOaSupplyType,
} from "./rentalBizTypes";

export interface RentalBizCounts {
  total: number;
  fl: number;
  awp: number;
  oaPc: number;
  oaOnly: number;
  mfpOnly: number;
  oaBoth: number;
  customers: number;
  src2979: number;
  srcUdj: number;
  srcGov: number;
  srcKlra: number;
}

export interface RentalBizToolbarAndGridProps {
  counts: RentalBizCounts;
  filteredItems: RentalBizRecord[];
  selectedId: number | null;
  onSelectId: (id: number) => void;
  checkedIds: number[];
  onToggleCheck: (id: number) => void;
  onToggleCheckAllFiltered: () => void;
  loading: boolean;
  discovering: boolean;
  crawlingBoards: boolean;
  registeringId: number | null;
  bulkRegistering: boolean;
  sectorFilter: "ALL" | "FL" | "AWP" | "OA_PC";
  setSectorFilter: (val: "ALL" | "FL" | "AWP" | "OA_PC") => void;
  oaSupplyFilter: "ALL" | OaSupplyType;
  setOaSupplyFilter: (val: "ALL" | OaSupplyType) => void;
  regionFilter: string;
  setRegionFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  bookmarkOnly: boolean;
  setBookmarkOnly: React.Dispatch<React.SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  discoverSector: "FL" | "AWP" | "OA_PC";
  setDiscoverSector: (val: "FL" | "AWP" | "OA_PC") => void;
  discoverRegion: string;
  setDiscoverRegion: (val: string) => void;
  discoverKeyword: string;
  setDiscoverKeyword: (val: string) => void;
  sortKey: string;
  sortDir: SortDirection;
  onSort: (colKey: string) => void;
  onBulkRegisterCustomers: () => void;
  onCrawlOfficialBoards: () => void;
  onOpenPortalGuideModal: () => void;
  onSaveListToObsidian: () => void;
  onExportCsv: () => void;
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  onDiscoverBusinesses: (overrideKeyword?: string) => void;
  onQuickUpdate: (
    id: number,
    patch: { salesStatus?: string; isBookmarked?: boolean; memo?: string }
  ) => void;
  onRegisterToPartner: (item: RentalBizRecord, partnerType: "CUSTOMER" | "VENDOR") => void;
  detailPanel: React.ReactNode;
}

export const RentalBizToolbarAndGrid: React.FC<RentalBizToolbarAndGridProps> = ({
  counts,
  filteredItems,
  selectedId,
  onSelectId,
  checkedIds,
  onToggleCheck,
  onToggleCheckAllFiltered,
  loading,
  discovering,
  crawlingBoards,
  registeringId,
  bulkRegistering,
  sectorFilter,
  setSectorFilter,
  oaSupplyFilter,
  setOaSupplyFilter,
  regionFilter,
  setRegionFilter,
  statusFilter,
  setStatusFilter,
  bookmarkOnly,
  setBookmarkOnly,
  searchQuery,
  setSearchQuery,
  discoverSector,
  setDiscoverSector,
  discoverRegion,
  setDiscoverRegion,
  discoverKeyword,
  setDiscoverKeyword,
  sortKey,
  sortDir,
  onSort,
  onBulkRegisterCustomers,
  onCrawlOfficialBoards,
  onOpenPortalGuideModal,
  onSaveListToObsidian,
  onExportCsv,
  onOpenCreateModal,
  onRefresh,
  onDiscoverBusinesses,
  onQuickUpdate,
  onRegisterToPartner,
  detailPanel,
}) => {
  return (
    <>
      {/* 1. 상단 헤더 & 3대 업종 탭 & 액션 버튼 */}
      <div className="shrink-0 px-3 py-2 bg-[#e2dbcd] border-b border-[#b8ae99] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f172a] text-white text-xs font-extrabold whitespace-nowrap">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>전국 렌탈·판매 사업자 공식 디렉토리</span>
          </div>

          {/* 3대 업종 필터 탭 */}
          <div className="flex items-center gap-1 bg-[#ebe5d8] p-0.5 rounded border border-[#b8ae99]">
            <button
              type="button"
              onClick={() => {
                setSectorFilter("ALL");
                setOaSupplyFilter("ALL");
              }}
              className={`px-2.5 py-1 rounded text-xs font-extrabold whitespace-nowrap transition ${
                sectorFilter === "ALL"
                  ? "bg-[#1d4ed8] text-white"
                  : "text-[#334155] hover:bg-[#d8d0c0]"
              }`}
            >
              전체 ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => {
                setSectorFilter("FL");
                setOaSupplyFilter("ALL");
              }}
              className={`px-2.5 py-1 rounded text-xs font-extrabold flex items-center gap-1 whitespace-nowrap transition ${
                sectorFilter === "FL"
                  ? "bg-amber-700 text-white"
                  : "text-[#334155] hover:bg-[#d8d0c0]"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>FL 지게차 판매·임대 ({counts.fl})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSectorFilter("AWP");
                setOaSupplyFilter("ALL");
              }}
              className={`px-2.5 py-1 rounded text-xs font-extrabold flex items-center gap-1 whitespace-nowrap transition ${
                sectorFilter === "AWP"
                  ? "bg-blue-700 text-white"
                  : "text-[#334155] hover:bg-[#d8d0c0]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>AWP 고소작업대 판매·임대 ({counts.awp})</span>
            </button>
            <button
              type="button"
              onClick={() => setSectorFilter("OA_PC")}
              className={`px-2.5 py-1 rounded text-xs font-extrabold flex items-center gap-1 whitespace-nowrap transition ${
                sectorFilter === "OA_PC"
                  ? "bg-emerald-700 text-white"
                  : "text-[#334155] hover:bg-[#d8d0c0]"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>PC · 복합기(OA) 임대 ({counts.oaPc})</span>
            </button>
          </div>

          {/* OA / 복합기 / 둘다 공급품목 세부 구분 필터 */}
          <div className="flex items-center gap-1 bg-[#ebe5d8] p-0.5 rounded border border-[#b8ae99]">
            <span className="px-1.5 text-[11px] font-extrabold text-[#0f172a] whitespace-nowrap">
              OA·복합기 공급품목:
            </span>
            <button
              type="button"
              onClick={() => {
                setSectorFilter("OA_PC");
                setOaSupplyFilter("ALL");
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-extrabold whitespace-nowrap transition ${
                sectorFilter === "OA_PC" && oaSupplyFilter === "ALL"
                  ? "bg-emerald-700 text-white"
                  : "text-[#334155] hover:bg-[#d8d0c0]"
              }`}
            >
              전체 ({counts.oaPc})
            </button>
            <button
              type="button"
              onClick={() => {
                setSectorFilter("OA_PC");
                setOaSupplyFilter("OA");
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-extrabold whitespace-nowrap transition ${
                oaSupplyFilter === "OA"
                  ? "bg-sky-700 text-white"
                  : "bg-sky-50 text-sky-900 border border-sky-300 hover:bg-sky-100"
              }`}
              title="PC, 노트북, 모니터, 문서세단기, 전산·사무용 OA기기 주력 공급 사업자"
            >
              OA 전문 ({counts.oaOnly})
            </button>
            <button
              type="button"
              onClick={() => {
                setSectorFilter("OA_PC");
                setOaSupplyFilter("MFP");
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-extrabold whitespace-nowrap transition ${
                oaSupplyFilter === "MFP"
                  ? "bg-fuchsia-700 text-white"
                  : "bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-300 hover:bg-fuchsia-100"
              }`}
              title="컬러/흑백 디지털 복합기, 레이저 프린터, 복사기, 인쇄기 전문 공급·정비 사업자"
            >
              복합기 전문 ({counts.mfpOnly})
            </button>
            <button
              type="button"
              onClick={() => {
                setSectorFilter("OA_PC");
                setOaSupplyFilter("BOTH");
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-extrabold whitespace-nowrap transition ${
                oaSupplyFilter === "BOTH"
                  ? "bg-teal-700 text-white"
                  : "bg-teal-50 text-teal-900 border border-teal-300 hover:bg-teal-100"
              }`}
              title="사무용 OA기기(PC·세단기·전산장비)와 디지털 복합기·프린터를 함께 공급·임대하는 종합 사업자"
            >
              둘다 (OA+복합기) ({counts.oaBoth})
            </button>
          </div>
        </div>

        {/* 우측 유틸리티 버튼군 */}
        <div className="flex flex-wrap items-center gap-1.5">
          {checkedIds.length > 0 && (
            <button
              type="button"
              onClick={onBulkRegisterCustomers}
              disabled={bulkRegistering}
              className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-extrabold flex items-center gap-1 whitespace-nowrap shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>
                {bulkRegistering
                  ? "일괄 등록 중..."
                  : `선택 사업자 일괄 매출처 등록 (${checkedIds.length}건)`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onCrawlOfficialBoards}
            disabled={crawlingBoards}
            className="px-2.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-extrabold flex items-center gap-1 whitespace-nowrap shadow-xs"
            title="klra.or.kr(한국고소작업대임대업협동조합 전 회원사) · udj.kr(우리동네지게차 전국업체) · sindoh.com(신도리코 파트너) 원부를 직접 크롤링하여 동기화합니다"
          >
            <Globe className={`w-3.5 h-3.5 ${crawlingBoards ? "animate-spin" : ""}`} />
            <span>
              {crawlingBoards ? "공식 원부 크롤링 중..." : "협동조합·공식원부 실시간 동기화"}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenPortalGuideModal}
            className="px-2.5 py-1.5 rounded bg-[#f4efe4] hover:bg-[#d8d0c0] text-[#0f172a] border border-[#b8ae99] text-xs font-extrabold flex items-center gap-1 whitespace-nowrap"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
            <span>국토부·건기협 원천통계 & 지자체 CSV 원부</span>
          </button>

          <button
            type="button"
            onClick={onSaveListToObsidian}
            className="px-2.5 py-1.5 rounded bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>옵시디언 노트로 목록 저장</span>
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            className="px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀(CSV) 다운로드</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-2.5 py-1.5 rounded bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>사업자 수동 등록</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded bg-[#f4efe4] hover:bg-[#d8d0c0] border border-[#b8ae99]"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. 필터링 & 외부 공식 기업DB(NICE·협동조합·나라장터) 실시간 조회 바 */}
      <div className="shrink-0 px-3 py-2 bg-[#e9e3d5] border-b border-[#b8ae99] flex flex-wrap items-center justify-between gap-2">
        {/* 좌측: 지역/상태/키워드 검색 + 미등록 업체 실시간 외부검색 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-2 py-1 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold text-[#0f172a]"
          >
            <option value="ALL">전국 모든 권역 / 지회 / 원부출처</option>
            <optgroup label="지게차(FL) 공식 연합회·원부 출처별">
              <option value="2979지게차연합회">2979지게차연합회 (다음카페 forklift2979.com · {counts.src2979 || 380}개사)</option>
              <option value="우리동네지게차">전국지게차연합·우리동네지게차 (udj.kr · {counts.srcUdj || 256}개사)</option>
              <option value="공공데이터포털">지자체 건설기계대여업 등록원부 (data.go.kr · {counts.srcGov || 410}개사)</option>
            </optgroup>
            <optgroup label="고소작업대 협동조합(klra.or.kr) 지회별">
              <option value="한국고소작업대임대업협동조합">협동조합 전 회원사 ({counts.srcKlra || 100}개사)</option>
              <option value="경기동부지회">경기동부지회 (용인·이천·광주·안성)</option>
              <option value="경기서부지회">경기서부지회 (시흥·안산·화성·김포·인천)</option>
              <option value="경기남부지회">경기남부지회 (평택·화성·오산·안성)</option>
              <option value="경기북부지회">경기북부지회 (고양·파주·양주·남양주·포천)</option>
              <option value="충남지회">충남지회 (천안·아산·당진·서산)</option>
              <option value="충북지회">충북지회 (청주·진천·음성·충주)</option>
              <option value="대구경북지회">대구경북지회 (대구·구미·경산·포항)</option>
              <option value="부산울산경남지회">부산울산경남지회 (부산·울산·창원·김해)</option>
              <option value="광주전남지회">광주전남지회 (광주·여수·순천·광양)</option>
            </optgroup>
            <optgroup label="전국 시·도 / 주요 거점별">
              <option value="전국">전국망 대형사</option>
              <option value="서울">서울</option>
              <option value="경기">경기 전체</option>
              <option value="용인">경기 용인</option>
              <option value="화성">경기 화성</option>
              <option value="평택">경기 평택</option>
              <option value="시흥">경기 시흥·안산</option>
              <option value="인천">인천</option>
              <option value="충남">충남 (천안·아산·당진)</option>
              <option value="충북">충북 (청주·음성·진천)</option>
              <option value="대전">대전·세종</option>
              <option value="부산">부산</option>
              <option value="울산">울산</option>
              <option value="경남">경남 (창원·김해·양산)</option>
              <option value="대구">대구</option>
              <option value="경북">경북 (구미·포항·경산)</option>
              <option value="광주">광주</option>
              <option value="전남">전남 (여수·순천·광양)</option>
              <option value="전북">전북 (전주·군산·익산)</option>
              <option value="강원">강원</option>
              <option value="제주">제주</option>
            </optgroup>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold text-[#0f172a]"
          >
            <option value="ALL">전체 등록상태</option>
            <option value="CUSTOMER">당사 매출처(고객) 등록됨 ({counts.customers})</option>
            <option value="TARGET">발굴완료(미등록 타깃)</option>
            <option value="CONTACTED">접촉/제안중</option>
            <option value="PARTNER">매입처 등록됨</option>
          </select>

          <button
            type="button"
            onClick={() => setBookmarkOnly((b) => !b)}
            className={`px-2 py-1 rounded border text-xs font-bold flex items-center gap-1 whitespace-nowrap ${
              bookmarkOnly
                ? "bg-amber-100 border-amber-500 text-amber-900"
                : "bg-[#f4efe4] border-[#b8ae99] text-[#475569]"
            }`}
          >
            <Bookmark className="w-3 h-3" />
            <span>관심업체만</span>
          </button>

          <div className="relative w-60 sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="상호(예: 기연리프트), 사업자번호, 지역, 브랜드..."
              className="w-full pl-8 pr-2 py-1 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold text-[#0f172a]"
            />
          </div>

          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => onDiscoverBusinesses(searchQuery.trim())}
              disabled={discovering}
              className="px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shadow-xs"
              title="NICE평가정보, 산군, 한국고소작업대임대업협동조합, 나라장터에서 해당 상호를 실시간 검색하여 목록에 추가합니다"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>
                {discovering
                  ? "외부 공식DB 조회 중..."
                  : `'${searchQuery.trim()}' 외부 기업DB 실시간 조회·추가`}
              </span>
            </button>
          )}
        </div>

        {/* 우측: 권역·조합별 공식 사업자 대량 추가 발굴 */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#e2dbcd] px-2 py-1 rounded border border-[#b8ae99]">
          <span className="text-[11px] font-extrabold text-[#1e3a8a] flex items-center gap-1 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-blue-700" />
            <span>권역·조합별 사업자 추가 발굴:</span>
          </span>
          <select
            value={discoverSector}
            onChange={(e) => setDiscoverSector(e.target.value as "FL" | "AWP" | "OA_PC")}
            className="px-2 py-0.5 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold"
          >
            <option value="AWP">AWP (고소작업대·리프트 임대)</option>
            <option value="FL">FL (지게차 판매·임대)</option>
            <option value="OA_PC">PC·복합기(OA) 임대</option>
          </select>
          <select
            value={discoverRegion}
            onChange={(e) => setDiscoverRegion(e.target.value)}
            className="px-2 py-0.5 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold"
          >
            <option value="경기 (용인·화성·평택·이천)">경기 남부 (용인·화성·평택·이천)</option>
            <option value="경기 서북부 (시흥·안산·김포·고양)">경기 서북부 (시흥·안산·김포·고양)</option>
            <option value="한국고소작업대임대업협동조합 회원사">한국고소작업대임대업협동조합 회원사</option>
            <option value="서울·인천">서울·인천</option>
            <option value="부산·경남·울산">부산·경남·울산</option>
            <option value="충청·대전·천안·아산">충청·대전·천안·아산</option>
            <option value="광주·전남·전북">광주·전남·전북</option>
            <option value="조달청 나라장터(MAS) 임대 등록사">조달청 나라장터(MAS) 등록사</option>
          </select>
          <input
            type="text"
            value={discoverKeyword}
            onChange={(e) => setDiscoverKeyword(e.target.value)}
            placeholder="특정 상호 또는 키워드"
            className="w-36 px-2 py-0.5 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs"
          />
          <button
            type="button"
            onClick={() => onDiscoverBusinesses()}
            disabled={discovering}
            className="px-2.5 py-0.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold whitespace-nowrap"
          >
            {discovering ? "공식DB 탐색 중..." : "+ 사업자 자동수집"}
          </button>
        </div>
      </div>

      {/* 3. 중앙 본문: 고밀도 사업자 테이블 (7 cols) + 우측 사업자 상세·연동 도시에 (5 cols) */}
      <div className="flex-1 grid grid-cols-12 gap-2.5 p-2.5 min-h-0 overflow-hidden">
        {/* 좌측 테이블 (7 cols) */}
        <div className="col-span-12 lg:col-span-7 bg-[#f4efe4] border border-[#b8ae99] rounded flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 py-1.5 bg-[#e2dbcd] border-b border-[#b8ae99] flex items-center justify-between text-xs font-bold">
            <span>
              조회된 공식 사업자 목록 ({filteredItems.length}개사 / 당사 매출처 연동 {counts.customers}개사)
            </span>
            <span className="text-[11px] text-[#1e3a8a] font-extrabold">
              각 행 우측의 [+ 매출처 등록] 클릭 시 ERP 고객 관리(매출처)로 즉시 등록됩니다
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[#e2dbcd] text-[#0f172a] border-b border-[#b8ae99]">
                <tr>
                  <th className="py-2 px-2 text-center w-8">
                    <input
                      type="checkbox"
                      checked={
                        filteredItems.length > 0 &&
                        filteredItems.every((it) => checkedIds.includes(it.id))
                      }
                      onChange={onToggleCheckAllFiltered}
                      className="accent-blue-700"
                    />
                  </th>
                  <SortableTh
                    label="관심"
                    colKey="isBookmarked"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    align="center"
                    className="py-2 px-1.5 font-extrabold w-8"
                  />
                  <SortableTh
                    label="업종구분"
                    colKey="sector"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    className="py-2 px-2 font-extrabold"
                  />
                  <SortableTh
                    label="상호 (법인명)"
                    colKey="companyName"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    className="py-2 px-2 font-extrabold"
                  />
                  <SortableTh
                    label="권역/지역"
                    colKey="region"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    className="py-2 px-2 font-extrabold"
                  />
                  <SortableTh
                    label="소재지 주소"
                    colKey="address"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    className="py-2 px-2 font-extrabold"
                  />
                  <SortableTh
                    label="대표전화"
                    colKey="phone"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    className="py-2 px-2 font-extrabold"
                  />
                  <SortableTh
                    label="공식 확인 경로"
                    colKey="officialSource"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    className="py-2 px-2 font-extrabold"
                  />
                  <SortableTh
                    label="매출처(고객) 등록"
                    colKey="isRegisteredCustomer"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    align="center"
                    className="py-2 px-2 font-extrabold"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d5ccb8]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center space-y-2">
                      <div className="text-[#475569] font-bold">
                        현재 로컬 디렉토리에서 &apos;{searchQuery}&apos; 조건과 일치하는 사업자가 없습니다.
                      </div>
                      {searchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => onDiscoverBusinesses(searchQuery.trim())}
                          disabled={discovering}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-extrabold shadow-sm"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>
                            {discovering
                              ? "외부 기업DB(NICE·협동조합·나라장터) 검색 중..."
                              : `외부 기업DB(NICE·협동조합·나라장터)에서 '${searchQuery.trim()}' 실시간 조회 및 등록하기`}
                          </span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = item.id === selectedId;
                    const secMeta = SECTOR_META[item.sector] || SECTOR_META.FL;
                    const isCustomer =
                      Boolean(item.isRegisteredCustomer) || item.salesStatus === "CUSTOMER";
                    return (
                      <tr
                        key={item.id}
                        onClick={() => onSelectId(item.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#dbeafe]/80 font-bold"
                            : "hover:bg-[#ebe5d8]"
                        }`}
                      >
                        <td
                          className="py-1.5 px-2 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={checkedIds.includes(item.id)}
                            onChange={() => onToggleCheck(item.id)}
                            className="accent-blue-700"
                          />
                        </td>
                        <td
                          className="py-1.5 px-1.5 text-center whitespace-nowrap"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickUpdate(item.id, { isBookmarked: !item.isBookmarked });
                          }}
                        >
                          <Bookmark
                            className={`w-3.5 h-3.5 mx-auto ${
                              item.isBookmarked
                                ? "text-amber-600 fill-amber-500"
                                : "text-[#94a3b8]"
                            }`}
                          />
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10.5px] font-extrabold border ${secMeta.badgeClass}`}
                            >
                              {secMeta.shortLabel}
                            </span>
                            {item.sector === "OA_PC" && (() => {
                              const supMeta = OA_SUPPLY_META[resolveOaSupplyType(item)];
                              return (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${supMeta.badgeClass}`}
                                >
                                  {supMeta.shortLabel}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td
                          className="py-1.5 px-2 font-extrabold text-[#0f172a] max-w-[165px] truncate whitespace-nowrap"
                          title={item.companyName}
                        >
                          {item.companyName}
                        </td>
                        <td
                          className="py-1.5 px-2 text-[#1e293b] max-w-[115px] truncate whitespace-nowrap"
                          title={item.region}
                        >
                          {item.region}
                        </td>
                        <td
                          className="py-1.5 px-2 text-[#334155] text-[11px] max-w-[185px] truncate whitespace-nowrap"
                          title={item.address}
                        >
                          {item.address || "-"}
                        </td>
                        <td className="py-1.5 px-2 font-mono text-[11px] text-[#0f172a] whitespace-nowrap">
                          {item.phone || item.businessNo || "-"}
                        </td>
                        <td
                          className="py-1.5 px-2 text-[11px] text-[#1d4ed8] font-semibold max-w-[155px] truncate whitespace-nowrap"
                          title={item.officialSource}
                        >
                          {item.officialSource}
                        </td>
                        <td
                          className="py-1.5 px-2 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isCustomer ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-100 border border-emerald-400 text-emerald-900 text-[10.5px] font-extrabold">
                              <Check className="w-3 h-3" />
                              <span>매출처 등록됨</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={registeringId === item.id}
                              onClick={() => onRegisterToPartner(item, "CUSTOMER")}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[10.5px] font-extrabold shadow-2xs transition"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>
                                {registeringId === item.id ? "등록 중..." : "+ 매출처 등록"}
                              </span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 우측 상세 도시에 & ERP 연동 액션 (5 cols) */}
        {detailPanel}
      </div>
    </>
  );
};
