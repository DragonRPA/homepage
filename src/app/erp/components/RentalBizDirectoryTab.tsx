"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2 } from "lucide-react";
import { sortErpItems } from "@/lib/erpFormat";
import { useErpTableSort } from "./SortableTh";
import {
  RentalBizRecord,
  SECTOR_META,
  OaSupplyType,
  resolveOaSupplyType,
  RentalBizFormData,
} from "./rental-biz-dir/rentalBizTypes";
import { RentalBizToolbarAndGrid } from "./rental-biz-dir/RentalBizToolbarAndGrid";
import { RentalBizDetailPanel } from "./rental-biz-dir/RentalBizDetailPanel";

const PortalGuideModal = dynamic(
  () =>
    import("./rental-biz-dir/PortalGuideModal").then((m) => m.PortalGuideModal),
  { ssr: false }
);
const RentalBizFormModal = dynamic(
  () =>
    import("./rental-biz-dir/RentalBizFormModal").then(
      (m) => m.RentalBizFormModal
    ),
  { ssr: false }
);

export const RentalBizDirectoryTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const [items, setItems] = useState<RentalBizRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [crawlingBoards, setCrawlingBoards] = useState(false);
  const [registeringId, setRegisteringId] = useState<number | null>(null);
  const [bulkRegistering, setBulkRegistering] = useState(false);

  // 필터 상태
  const [sectorFilter, setSectorFilter] = useState<"ALL" | "FL" | "AWP" | "OA_PC">("ALL");
  const [oaSupplyFilter, setOaSupplyFilter] = useState<"ALL" | OaSupplyType>("ALL");
  const [regionFilter, setRegionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [bookmarkOnly, setBookmarkOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // AI + 공식경로 추가 발굴 입력 상태
  const [discoverSector, setDiscoverSector] = useState<"FL" | "AWP" | "OA_PC">("AWP");
  const [discoverRegion, setDiscoverRegion] = useState("경기 (용인·화성·평택·이천)");
  const [discoverKeyword, setDiscoverKeyword] = useState("");

  // 우측 상세 메모 편집
  const [memoDraft, setMemoDraft] = useState("");

  // 수동 추가/수정 모달
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPortalGuideModal, setShowPortalGuideModal] = useState(false);
  const [formData, setFormData] = useState<RentalBizFormData>({
    id: 0,
    sector: "FL",
    companyName: "",
    businessNo: "",
    ceoName: "",
    region: "전국",
    address: "",
    bizScope: "신차·중고 판매 및 임대",
    mainBrands: "",
    mainProducts: "",
    officialSource: "제조사 공식 대리점 / 건설기계대여업 등록",
    ksicCode: "71201 (건설·물류장비 임대업)",
    phone: "",
    websiteUrl: "",
    scaleNote: "",
    salesStatus: "TARGET",
  });

  // 알림
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3800);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/rental-directory", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "사업자 목록 조회 실패");
      }
      const list: RentalBizRecord[] = data.items || [];
      setItems(list);
      setSelectedId((prev) => {
        if (prev && list.some((x) => x.id === prev)) return prev;
        return list.length > 0 ? list[0].id : null;
      });
    } catch (err: any) {
      showToast(err.message || "데이터 로드 오류", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const selectedItem = useMemo(
    () => items.find((x) => x.id === selectedId) || null,
    [items, selectedId]
  );

  useEffect(() => {
    setMemoDraft(selectedItem?.memo || "");
  }, [selectedItem]);

  // 업종별 건수 집계
  const counts = useMemo(() => {
    const oaItems = items.filter((x) => x.sector === "OA_PC");
    return {
      total: items.length,
      fl: items.filter((x) => x.sector === "FL").length,
      awp: items.filter((x) => x.sector === "AWP").length,
      oaPc: oaItems.length,
      oaOnly: oaItems.filter((x) => resolveOaSupplyType(x) === "OA").length,
      mfpOnly: oaItems.filter((x) => resolveOaSupplyType(x) === "MFP").length,
      oaBoth: oaItems.filter((x) => resolveOaSupplyType(x) === "BOTH").length,
      customers: items.filter((x) => x.isRegisteredCustomer).length,
      src2979: items.filter((x) => x.officialSource?.includes("2979지게차연합회")).length,
      srcUdj: items.filter((x) => x.officialSource?.includes("우리동네지게차")).length,
      srcGov: items.filter((x) => x.officialSource?.includes("공공데이터포털")).length,
      srcKlra: items.filter((x) => x.officialSource?.includes("한국고소작업대임대업협동조합")).length,
    };
  }, [items]);

  const dirSort = useErpTableSort("", null);

  // 필터링된 목록
  const filteredItems = useMemo(() => {
    const filtered = items.filter((it) => {
      if (sectorFilter !== "ALL" && it.sector !== sectorFilter) return false;
      if (oaSupplyFilter !== "ALL") {
        if (it.sector !== "OA_PC") return false;
        if (resolveOaSupplyType(it) !== oaSupplyFilter) return false;
      }
      if (
        regionFilter !== "ALL" &&
        !it.region.includes(regionFilter) &&
        !it.address.includes(regionFilter) &&
        !it.officialSource.includes(regionFilter)
      ) {
        return false;
      }
      if (statusFilter !== "ALL") {
        if (statusFilter === "CUSTOMER" && !it.isRegisteredCustomer && it.salesStatus !== "CUSTOMER") {
          return false;
        } else if (statusFilter !== "CUSTOMER" && it.salesStatus !== statusFilter) {
          return false;
        }
      }
      if (bookmarkOnly && !it.isBookmarked) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = [
          it.companyName,
          it.businessNo,
          it.ceoName,
          it.region,
          it.address,
          it.phone,
          it.bizScope,
          it.mainBrands,
          it.mainProducts,
          it.officialSource,
          it.scaleNote,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return sortErpItems(filtered, dirSort.sortKey, dirSort.sortDir);
  }, [items, sectorFilter, oaSupplyFilter, regionFilter, statusFilter, bookmarkOnly, searchQuery, dirSort.sortKey, dirSort.sortDir]);

  // 체크박스 핸들러
  const toggleCheck = (id: number) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleCheckAllFiltered = () => {
    const allFilteredIds = filteredItems.map((x) => x.id);
    const allChecked =
      allFilteredIds.length > 0 && allFilteredIds.every((id) => checkedIds.includes(id));
    if (allChecked) {
      setCheckedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setCheckedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // 빠른 상태/북마크/메모 변경 (화면 즉시 반영)
  const handleQuickUpdate = async (
    id: number,
    patch: { salesStatus?: string; isBookmarked?: boolean; memo?: string }
  ) => {
    try {
      const res = await fetch("/api/erp/rental-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "QUICK_UPDATE",
          id,
          ...patch,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "변경 실패");
      setItems(data.items || []);
      if (patch.memo !== undefined) {
        showToast("영업 메모가 저장되었습니다.");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 단건 바로 매출처(고객) 또는 매입처 등록
  const handleRegisterToPartner = async (
    item: RentalBizRecord,
    partnerType: "CUSTOMER" | "VENDOR"
  ) => {
    setRegisteringId(item.id);
    try {
      const res = await fetch("/api/erp/rental-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REGISTER_TO_PARTNER",
          id: item.id,
          partnerType,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "거래처 등록 실패");
      }
      setItems(data.items || []);
      const label = partnerType === "CUSTOMER" ? "고객 관리(매출처)" : "매입거래처 관리";
      showToast(
        data.alreadyExistedCount > 0 && data.newlyCreatedCount === 0
          ? `[${item.companyName}] 사업자는 이미 ERP [${label}]에 등록되어 있어 등록 상태를 즉시 연동했습니다.`
          : `[${item.companyName}] 사업자가 ERP [${label}]에 즉시 등록되었습니다.`
      );
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setRegisteringId(null);
    }
  };

  // 체크된 사업자들 일괄 매출처 등록
  const handleBulkRegisterCustomers = async () => {
    if (checkedIds.length === 0) {
      showToast("먼저 좌측 체크박스에서 매출처로 등록할 사업자를 선택해 주십시오.", "error");
      return;
    }
    setBulkRegistering(true);
    try {
      const res = await fetch("/api/erp/rental-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REGISTER_TO_PARTNER",
          ids: checkedIds,
          partnerType: "CUSTOMER",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "일괄 매출처 등록 실패");
      }
      setItems(data.items || []);
      setCheckedIds([]);
      showToast(
        `선택한 ${checkedIds.length}개 사업자 중 신규 ${data.newlyCreatedCount}건 등록, 기존 ${data.alreadyExistedCount}건 연동 완료되었습니다.`
      );
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setBulkRegistering(false);
    }
  };

  // AI + 외부 공식 기업DB(NICE·협동조합·나라장터·산군) 실시간 조회 및 추가
  const handleDiscoverBusinesses = async (overrideKeyword?: string) => {
    const targetKeyword = overrideKeyword !== undefined ? overrideKeyword : discoverKeyword;
    setDiscovering(true);
    try {
      const res = await fetch("/api/erp/rental-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISCOVER_OFFICIAL_BIZ",
          sector: sectorFilter !== "ALL" ? sectorFilter : discoverSector,
          region: discoverRegion,
          customKeyword: targetKeyword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "사업자 발굴 실패");
      }
      setItems(data.items || []);
      showToast(
        targetKeyword
          ? `외부 공식 기업DB(NICE·협동조합·나라장터)에서 '${targetKeyword}' 관련 사업자 ${data.discoveredCount}건을 찾아 목록에 추가했습니다.`
          : `[${discoverRegion}] 공식 경로 확인 사업자 ${data.discoveredCount}건이 디렉토리에 반영되었습니다.`
      );
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setDiscovering(false);
    }
  };

  // 협동조합(klra.or.kr) · 전국지게차연합(udj.kr) · 신도리코 공식 파트너 원부 실시간 직접 크롤링 동기화
  const handleCrawlOfficialBoards = async () => {
    setCrawlingBoards(true);
    try {
      const res = await fetch("/api/erp/rental-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CRAWL_OFFICIAL_BOARDS",
          sector: sectorFilter,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "공식 원부 동기화 실패");
      }
      setItems(data.items || []);
      showToast(
        `공식 원부(klra.or.kr 협동조합 · udj.kr 전국지게차 · 신도리코 파트너) 실시간 동기화 완료 (${data.crawledCount}건 점검)`
      );
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setCrawlingBoards(false);
    }
  };

  // 현재 필터링된 사업자 목록을 옵시디언 노트로 일괄 저장
  const handleSaveListToObsidian = async () => {
    if (filteredItems.length === 0) {
      showToast("저장할 사업자 목록이 없습니다.", "error");
      return;
    }
    try {
      const today = new Date().toISOString().slice(0, 10);
      const sectorTitle =
        sectorFilter === "ALL"
          ? "전국 FL·AWP·PC복합기 임대사업자 통합목록"
          : `${SECTOR_META[sectorFilter].label} 사업자 목록`;

      const tableRows = filteredItems
        .map(
          (it, idx) =>
            `| ${idx + 1} | ${SECTOR_META[it.sector].shortLabel} | **${it.companyName}** | ${
              it.businessNo || "-"
            } | ${it.ceoName || "-"} | ${it.region} | ${it.mainBrands || "-"} | ${
              it.officialSource
            } | ${it.phone || "-"} |`
        )
        .join("\n");

      const mdContent = [
        `---`,
        `title: "${sectorTitle} (${today})"`,
        `tags: [렌탈사업자DB, FL지게차, AWP고소작업대, OA복합기임대, 영업타깃]`,
        `created: ${today}`,
        `count: ${filteredItems.length}`,
        `---`,
        ``,
        `# ${sectorTitle} (총 ${filteredItems.length}개사)`,
        ``,
        `> 공식 확인 경로: 한국고소작업대임대업협동조합(klra.or.kr), 조달청 나라장터(G2B) MAS, NICE평가정보/산군 기업DB, 건설기계대여업 등록, 제조사 공식 대리점`,
        ``,
        `| No | 분류 | 상호(법인명) | 사업자번호 | 대표자 | 권역/지역 | 주요 취급브랜드 | 공식 확인 경로 | 대표전화 |`,
        `|---:|:---:|:---|:---:|:---:|:---|:---|:---|:---:|`,
        tableRows,
        ``,
        `## 상위 연결 문서`,
        `- [[옵시디언 PC-모바일-ERP 통합 가이드]]`,
      ].join("\n");

      const res = await fetch("/api/erp/obsidian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_NOTE",
          folderPath: "03_렌탈사업자_디렉토리",
          title: `${sectorTitle} (${today})`,
          content: mdContent,
          tags: ["렌탈사업자DB", "FL지게차", "AWP고소작업대", "OA복합기임대"],
          sourceType: "RENTAL_DIRECTORY",
          authorName: currentUser?.name || "이정용 대표이사",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "옵시디언 노트 저장 실패");
      }
      showToast(
        `조회된 사업자 ${filteredItems.length}개사 목록이 [옵시디언 노트 > 03_렌탈사업자_디렉토리]에 저장되었습니다.`
      );
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // 엑셀(CSV) 다운로드
  const handleExportCsv = () => {
    const headers = [
      "업종구분",
      "상호(법인명)",
      "사업자등록번호",
      "대표자",
      "권역/지역",
      "주소",
      "영업형태",
      "취급브랜드",
      "주요취급기종",
      "공식확인경로",
      "표준산업분류(KSIC)",
      "대표전화",
      "웹사이트",
      "규모및특징",
      "ERP매출처등록여부",
    ];
    const rows = filteredItems.map((it) => [
      SECTOR_META[it.sector]?.shortLabel || it.sector,
      `"${(it.companyName || "").replace(/"/g, '""')}"`,
      `"${(it.businessNo || "").replace(/"/g, '""')}"`,
      `"${(it.ceoName || "").replace(/"/g, '""')}"`,
      `"${(it.region || "").replace(/"/g, '""')}"`,
      `"${(it.address || "").replace(/"/g, '""')}"`,
      `"${(it.bizScope || "").replace(/"/g, '""')}"`,
      `"${(it.mainBrands || "").replace(/"/g, '""')}"`,
      `"${(it.mainProducts || "").replace(/"/g, '""')}"`,
      `"${(it.officialSource || "").replace(/"/g, '""')}"`,
      `"${(it.ksicCode || "").replace(/"/g, '""')}"`,
      `"${(it.phone || "").replace(/"/g, '""')}"`,
      `"${(it.websiteUrl || "").replace(/"/g, '""')}"`,
      `"${(it.scaleNote || "").replace(/"/g, '""')}"`,
      it.isRegisteredCustomer ? "매출처 등록됨" : "미등록",
    ]);

    const csv =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    const suffix = sectorFilter === "ALL" ? "전체_FL_AWP_OA" : sectorFilter;
    link.download = `전국_렌탈판매사업자_목록_${suffix}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openCreateModal = () => {
    setFormData({
      id: 0,
      sector: sectorFilter === "ALL" ? "AWP" : sectorFilter,
      companyName: "",
      businessNo: "",
      ceoName: "",
      region: "경기",
      address: "",
      bizScope: "신차·중고 판매 및 임대",
      mainBrands: "",
      mainProducts: "",
      officialSource: "한국고소작업대임대업협동조합 / NICE기업DB",
      ksicCode: sectorFilter === "OA_PC" ? "71202 (사무용기계·PC 임대업)" : "71201 (건설·물류장비 임대업)",
      phone: "",
      websiteUrl: "",
      scaleNote: "",
      salesStatus: "TARGET",
    });
    setShowFormModal(true);
  };

  const openEditModal = (item: RentalBizRecord) => {
    setFormData({
      id: item.id,
      sector: item.sector,
      companyName: item.companyName,
      businessNo: item.businessNo || "",
      ceoName: item.ceoName || "",
      region: item.region || "전국",
      address: item.address || "",
      bizScope: item.bizScope || "",
      mainBrands: item.mainBrands || "",
      mainProducts: item.mainProducts || "",
      officialSource: item.officialSource || "",
      ksicCode: item.ksicCode || "",
      phone: item.phone || "",
      websiteUrl: item.websiteUrl || "",
      scaleNote: item.scaleNote || "",
      salesStatus: item.salesStatus || "TARGET",
    });
    setShowFormModal(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      showToast("상호(법인명)를 입력해 주십시오.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/rental-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_COMPANY",
          ...formData,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "저장 실패");
      setItems(data.items || []);
      setShowFormModal(false);
      showToast(`[${formData.companyName}] 사업자 정보가 즉시 반영되었습니다.`);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`[${name}] 사업자를 목록에서 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/erp/rental-directory?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");
      const next = items.filter((x) => x.id !== id);
      setItems(next);
      if (selectedId === id) {
        setSelectedId(next[0]?.id || null);
      }
      showToast("삭제되었습니다.");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#ebe5d8] text-[#0f172a] overflow-hidden font-sans">
      {/* 토스트 알림 */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded border shadow-lg text-xs font-bold ${
            toast.type === "error"
              ? "bg-red-50 border-red-400 text-red-800"
              : "bg-[#0f172a] border-[#334155] text-white"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* 상단 헤더, 필터 바, 사업자 마스터 테이블 + 우측 상세 패널 */}
      <RentalBizToolbarAndGrid
        counts={counts}
        filteredItems={filteredItems}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        checkedIds={checkedIds}
        onToggleCheck={toggleCheck}
        onToggleCheckAllFiltered={toggleCheckAllFiltered}
        loading={loading}
        discovering={discovering}
        crawlingBoards={crawlingBoards}
        registeringId={registeringId}
        bulkRegistering={bulkRegistering}
        sectorFilter={sectorFilter}
        setSectorFilter={setSectorFilter}
        oaSupplyFilter={oaSupplyFilter}
        setOaSupplyFilter={setOaSupplyFilter}
        regionFilter={regionFilter}
        setRegionFilter={setRegionFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        bookmarkOnly={bookmarkOnly}
        setBookmarkOnly={setBookmarkOnly}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        discoverSector={discoverSector}
        setDiscoverSector={setDiscoverSector}
        discoverRegion={discoverRegion}
        setDiscoverRegion={setDiscoverRegion}
        discoverKeyword={discoverKeyword}
        setDiscoverKeyword={setDiscoverKeyword}
        sortKey={dirSort.sortKey}
        sortDir={dirSort.sortDir}
        onSort={dirSort.handleSort}
        onBulkRegisterCustomers={handleBulkRegisterCustomers}
        onCrawlOfficialBoards={handleCrawlOfficialBoards}
        onOpenPortalGuideModal={() => setShowPortalGuideModal(true)}
        onSaveListToObsidian={handleSaveListToObsidian}
        onExportCsv={handleExportCsv}
        onOpenCreateModal={openCreateModal}
        onRefresh={fetchAll}
        onDiscoverBusinesses={handleDiscoverBusinesses}
        onQuickUpdate={handleQuickUpdate}
        onRegisterToPartner={handleRegisterToPartner}
        detailPanel={
          <RentalBizDetailPanel
            selectedItem={selectedItem}
            memoDraft={memoDraft}
            setMemoDraft={setMemoDraft}
            registeringId={registeringId}
            openEditModal={openEditModal}
            handleDelete={handleDelete}
            handleQuickUpdate={handleQuickUpdate}
            handleRegisterToPartner={handleRegisterToPartner}
          />
        }
      />

      {/* 국토부·대한건설기계협회 공식 원천 통계표 & 지자체 인허가 CSV 원부 모달 */}
      {showPortalGuideModal && (
        <PortalGuideModal
          isOpen={showPortalGuideModal}
          onClose={() => setShowPortalGuideModal(false)}
        />
      )}

      {/* 수동 등록 / 수정 모달 */}
      {showFormModal && (
        <RentalBizFormModal
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSubmit={handleSaveForm}
          formData={formData}
          setFormData={setFormData}
        />
      )}
    </div>
  );
};
