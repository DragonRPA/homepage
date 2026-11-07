"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  Truck,
  Layers,
  Monitor,
  Search,
  Download,
  Plus,
  RefreshCw,
  ExternalLink,
  Bookmark,
  BookOpen,
  UserPlus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  ShieldCheck,
  Edit3,
  Save,
} from "lucide-react";

export interface RentalBizRecord {
  id: number;
  sector: "FL" | "AWP" | "OA_PC";
  companyName: string;
  businessNo: string;
  ceoName: string;
  region: string;
  address: string;
  bizScope: string;
  mainBrands: string;
  mainProducts: string;
  officialSource: string;
  ksicCode: string;
  phone: string;
  websiteUrl: string;
  scaleNote: string;
  salesStatus: string;
  memo: string;
  isBookmarked: boolean;
  updatedAt: string;
  createdAt: string;
}

const SECTOR_META: Record<
  "FL" | "AWP" | "OA_PC",
  { label: string; shortLabel: string; badgeClass: string; ksic: string }
> = {
  FL: {
    label: "FL (지게차 판매·임대업)",
    shortLabel: "FL 지게차",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-400",
    ksic: "KSIC 71201 / 건설기계대여업",
  },
  AWP: {
    label: "AWP (고소작업대 판매·임대업)",
    shortLabel: "AWP 고소작업대",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-400",
    ksic: "KSIC 71201 / KOSHA 안전검사",
  },
  OA_PC: {
    label: "PC · 노트북 · 복합기(OA) 임대업",
    shortLabel: "PC·복합기(OA)",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-400",
    ksic: "KSIC 71202 / 나라장터 MAS",
  },
};

const SALES_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  TARGET: { label: "발굴완료(타깃)", badgeClass: "bg-[#e2dbcd] text-[#334155] border-[#b8ae99]" },
  CONTACTED: { label: "접촉/제안중", badgeClass: "bg-blue-100 text-blue-900 border-blue-300" },
  PARTNER: { label: "협력/매입처등록", badgeClass: "bg-violet-100 text-violet-900 border-violet-300" },
  CUSTOMER: { label: "당사 고객사등록", badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-400" },
  HOLD: { label: "보류", badgeClass: "bg-slate-200 text-slate-600 border-slate-300" },
};

const OFFICIAL_PORTAL_LINKS = [
  {
    name: "조달청 나라장터 종합쇼핑몰 (MAS 임대사업자)",
    desc: "사무기기임대(복합기)·컴퓨터임대·지게차·고소작업대 등록 공급사 조회",
    url: "https://shopping.g2b.go.kr",
  },
  {
    name: "대한건설기계협회 (건설기계대여업 등록현황)",
    desc: "전국 시·군·구 건설기계대여업(지게차 등) 정식 등록 사업자 확인",
    url: "https://www.kcea.or.kr",
  },
  {
    name: "금융감독원 전자공시시스템 (DART)",
    desc: "KSIC 71201(건설·물류장비 임대) / 71202(사무용기계·PC 임대) 외감법인 조회",
    url: "https://dart.fss.or.kr",
  },
  {
    name: "다아라 기계장터 (산업장비 B2B 디렉토리)",
    desc: "전국 고소작업대(AWP)·지게차(FL) 매매 및 렌탈 입점 회원사 원부",
    url: "https://www.daara.co.kr",
  },
  {
    name: "HD현대사이트솔루션 전국 판매대리점",
    desc: "현대지게차 전국 권역별 공식 판매·렌탈 대리점 및 정비망 조회",
    url: "https://www.hyundai-ce.com",
  },
  {
    name: "신도리코 / 캐논코리아 공식 대리점망",
    desc: "전국 OA 복합기·프린터 공식 임대 파트너 및 서비스 지정점 확인",
    url: "https://www.sindoh.com",
  },
];

export const RentalBizDirectoryTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const [items, setItems] = useState<RentalBizRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  // 필터 상태
  const [sectorFilter, setSectorFilter] = useState<"ALL" | "FL" | "AWP" | "OA_PC">("ALL");
  const [regionFilter, setRegionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [bookmarkOnly, setBookmarkOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // AI + 공식경로 추가 발굴 입력 상태
  const [discoverSector, setDiscoverSector] = useState<"FL" | "AWP" | "OA_PC">("FL");
  const [discoverRegion, setDiscoverRegion] = useState("경기·수도권");
  const [discoverKeyword, setDiscoverKeyword] = useState("");

  // 우측 상세 메모 편집
  const [memoDraft, setMemoDraft] = useState("");

  // 수동 추가/수정 모달
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPortalGuideModal, setShowPortalGuideModal] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    sector: "FL" as "FL" | "AWP" | "OA_PC",
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
    setTimeout(() => setToast(null), 3500);
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
    return {
      total: items.length,
      fl: items.filter((x) => x.sector === "FL").length,
      awp: items.filter((x) => x.sector === "AWP").length,
      oaPc: items.filter((x) => x.sector === "OA_PC").length,
    };
  }, [items]);

  // 필터링된 목록
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (sectorFilter !== "ALL" && it.sector !== sectorFilter) return false;
      if (regionFilter !== "ALL" && !it.region.includes(regionFilter)) return false;
      if (statusFilter !== "ALL" && it.salesStatus !== statusFilter) return false;
      if (bookmarkOnly && !it.isBookmarked) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = [
          it.companyName,
          it.businessNo,
          it.ceoName,
          it.region,
          it.address,
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
  }, [items, sectorFilter, regionFilter, statusFilter, bookmarkOnly, searchQuery]);

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
      setItems((prev) => prev.map((it) => (it.id === id ? data.item : it)));
      if (patch.memo !== undefined) {
        showToast("영업 메모가 저장되었습니다.");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // AI + 공식경로 사업자 추가 발굴
  const handleDiscoverBusinesses = async () => {
    setDiscovering(true);
    try {
      const res = await fetch("/api/erp/rental-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISCOVER_OFFICIAL_BIZ",
          sector: discoverSector,
          region: discoverRegion,
          customKeyword: discoverKeyword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "사업자 발굴 실패");
      }
      setItems(data.items || []);
      setSectorFilter(discoverSector);
      showToast(
        `[${SECTOR_META[discoverSector].shortLabel} - ${discoverRegion}] 공식 경로 확인 사업자 ${data.discoveredCount}건이 디렉토리에 반영되었습니다.`
      );
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setDiscovering(false);
    }
  };

  // ERP 거래처(고객 관리 / 매입거래처 관리)로 1클릭 등록
  const handleRegisterToPartner = async (item: RentalBizRecord, partnerType: "CUSTOMER" | "VENDOR") => {
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
      setItems((prev) => prev.map((it) => (it.id === item.id ? data.item : it)));
      const label = partnerType === "CUSTOMER" ? "고객 관리(매출처)" : "매입거래처 관리";
      showToast(
        data.alreadyExisted
          ? `[${item.companyName}] 사업자는 이미 ERP ${label}에 등록되어 있어 상태를 동기화했습니다.`
          : `[${item.companyName}] 사업자가 ERP [${label}] 대장에 즉시 등록되었습니다.`
      );
    } catch (err: any) {
      showToast(err.message, "error");
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
            } | ${it.region} | ${it.bizScope} | ${it.mainBrands || "-"} | ${
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
        `> 공식 확인 경로: 조달청 나라장터(G2B) MAS, 금융감독원 DART, 건설기계대여업 등록, 제조사 공식 대리점, 다아라 기계장터`,
        ``,
        `| No | 분류 | 상호(법인명) | 사업자번호 | 권역/지역 | 영업형태 | 주요 취급브랜드 | 공식 확인 경로 | 대표전화 |`,
        `|---:|:---:|:---|:---:|:---|:---|:---|:---|:---:|`,
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
        `현재 조회된 사업자 ${filteredItems.length}개사 목록이 [옵시디언 노트 > 03_렌탈사업자_디렉토리]에 마크다운 표로 저장되었습니다.`
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
      "영업상태",
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
      SALES_STATUS_META[it.salesStatus]?.label || it.salesStatus,
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
      sector: sectorFilter === "ALL" ? "FL" : sectorFilter,
      companyName: "",
      businessNo: "",
      ceoName: "",
      region: "경기",
      address: "",
      bizScope: "신차·중고 판매 및 임대",
      mainBrands: "",
      mainProducts: "",
      officialSource: "제조사 공식 대리점 / 건설기계대여업 등록",
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
      const saved: RentalBizRecord = data.item;
      setItems((prev) => {
        const exists = prev.some((x) => x.id === saved.id);
        return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev];
      });
      setSelectedId(saved.id);
      setShowFormModal(false);
      showToast(`[${saved.companyName}] 사업자 정보가 즉시 반영되었습니다.`);
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
              onClick={() => setSectorFilter("ALL")}
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
              onClick={() => setSectorFilter("FL")}
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
              onClick={() => setSectorFilter("AWP")}
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
        </div>

        {/* 우측 유틸리티 버튼군 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowPortalGuideModal(true)}
            className="px-2.5 py-1.5 rounded bg-[#f4efe4] hover:bg-[#d8d0c0] text-[#0f172a] border border-[#b8ae99] text-xs font-bold flex items-center gap-1 whitespace-nowrap"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
            <span>공식 원천 데이터 포털 안내</span>
          </button>

          <button
            type="button"
            onClick={handleSaveListToObsidian}
            className="px-2.5 py-1.5 rounded bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>옵시디언 노트로 목록 저장</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀(CSV) 다운로드</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-2.5 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>사업자 수동 등록</span>
          </button>

          <button
            type="button"
            onClick={fetchAll}
            className="p-1.5 rounded bg-[#f4efe4] hover:bg-[#d8d0c0] border border-[#b8ae99]"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. 필터링 & AI 공식경로 실시간 사업자 추가 수집 바 */}
      <div className="shrink-0 px-3 py-2 bg-[#e9e3d5] border-b border-[#b8ae99] flex flex-wrap items-center justify-between gap-2">
        {/* 좌측: 지역/상태/키워드 검색 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-2 py-1 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold text-[#0f172a]"
          >
            <option value="ALL">전국 모든 권역</option>
            <option value="전국">전국망 대형사</option>
            <option value="서울">서울</option>
            <option value="경기">경기</option>
            <option value="인천">인천</option>
            <option value="부산">부산·경남·울산</option>
            <option value="경남">경남·창원·김해</option>
            <option value="충청">충청·대전·천안</option>
            <option value="전북">전북·광주·전남</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold text-[#0f172a]"
          >
            <option value="ALL">전체 영업상태</option>
            <option value="TARGET">발굴완료(타깃)</option>
            <option value="CONTACTED">접촉/제안중</option>
            <option value="PARTNER">협력/매입처등록</option>
            <option value="CUSTOMER">당사 고객사등록</option>
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

          <div className="relative w-56 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="상호, 사업자번호, 브랜드(두산/지니/신도), 지역 검색..."
              className="w-full pl-8 pr-2 py-1 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-semibold text-[#0f172a]"
            />
          </div>
        </div>

        {/* 우측: Google AI Ultra + 공식 등록경로 기반 지역별 사업자 추가 발굴 */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#e2dbcd] px-2 py-1 rounded border border-[#b8ae99]">
          <span className="text-[11px] font-extrabold text-[#1e3a8a] flex items-center gap-1 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-blue-700" />
            <span>공식경로 사업자 추가 발굴:</span>
          </span>
          <select
            value={discoverSector}
            onChange={(e) => setDiscoverSector(e.target.value as any)}
            className="px-2 py-0.5 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold"
          >
            <option value="FL">FL (지게차 판매·임대)</option>
            <option value="AWP">AWP (고소작업대 판매·임대)</option>
            <option value="OA_PC">PC·복합기(OA) 임대</option>
          </select>
          <select
            value={discoverRegion}
            onChange={(e) => setDiscoverRegion(e.target.value)}
            className="px-2 py-0.5 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold"
          >
            <option value="경기·수도권">경기·수도권</option>
            <option value="서울·인천">서울·인천</option>
            <option value="부산·경남·울산">부산·경남·울산</option>
            <option value="충청·대전·세종">충청·대전·세종</option>
            <option value="대구·경북">대구·경북</option>
            <option value="광주·전남·전북">광주·전남·전북</option>
            <option value="전국 조달청 나라장터(MAS)">조달청 나라장터(MAS)</option>
          </select>
          <input
            type="text"
            value={discoverKeyword}
            onChange={(e) => setDiscoverKeyword(e.target.value)}
            placeholder="세부 키워드 (예: 현대지게차 대리점)"
            className="w-40 px-2 py-0.5 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs"
          />
          <button
            type="button"
            onClick={handleDiscoverBusinesses}
            disabled={discovering}
            className="px-2.5 py-0.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold whitespace-nowrap"
          >
            {discovering ? "공식경로 탐색 중..." : "+ 지역 사업자 자동수집"}
          </button>
        </div>
      </div>

      {/* 3. 중앙 본문: 고밀도 사업자 테이블 (7 cols) + 우측 사업자 상세·연동 도시에 (5 cols) */}
      <div className="flex-1 grid grid-cols-12 gap-2.5 p-2.5 min-h-0 overflow-hidden">
        {/* 좌측 테이블 (7 cols) */}
        <div className="col-span-12 lg:col-span-7 bg-[#f4efe4] border border-[#b8ae99] rounded flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 py-1.5 bg-[#e2dbcd] border-b border-[#b8ae99] flex items-center justify-between text-xs font-bold">
            <span>조회된 공식 사업자 목록 ({filteredItems.length}개사)</span>
            <span className="text-[11px] text-[#475569]">
              행 클릭 시 우측에서 상세 제원 확인 및 ERP 거래처(고객/매입처) 1클릭 등록 가능
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[#e2dbcd] text-[#0f172a] border-b border-[#b8ae99]">
                <tr>
                  <th className="py-2 px-2 text-center font-extrabold whitespace-nowrap w-9">관심</th>
                  <th className="py-2 px-2 font-extrabold whitespace-nowrap">업종구분</th>
                  <th className="py-2 px-2.5 font-extrabold whitespace-nowrap">상호 (법인명)</th>
                  <th className="py-2 px-2 font-extrabold whitespace-nowrap">사업자번호</th>
                  <th className="py-2 px-2 font-extrabold whitespace-nowrap">권역/지역</th>
                  <th className="py-2 px-2 font-extrabold whitespace-nowrap">취급 브랜드 / 기종</th>
                  <th className="py-2 px-2 font-extrabold whitespace-nowrap">공식 확인 경로</th>
                  <th className="py-2 px-2 text-center font-extrabold whitespace-nowrap">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d5ccb8]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#64748b] font-semibold">
                      조건에 해당하는 사업자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = item.id === selectedId;
                    const secMeta = SECTOR_META[item.sector] || SECTOR_META.FL;
                    const stMeta = SALES_STATUS_META[item.salesStatus] || SALES_STATUS_META.TARGET;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#dbeafe]/70 font-bold"
                            : "hover:bg-[#ebe5d8]"
                        }`}
                      >
                        <td
                          className="py-1.5 px-2 text-center whitespace-nowrap"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickUpdate(item.id, { isBookmarked: !item.isBookmarked });
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
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10.5px] font-extrabold border ${secMeta.badgeClass}`}
                          >
                            {secMeta.shortLabel}
                          </span>
                        </td>
                        <td
                          className="py-1.5 px-2.5 font-extrabold text-[#0f172a] max-w-[190px] truncate whitespace-nowrap"
                          title={item.companyName}
                        >
                          {item.companyName}
                        </td>
                        <td className="py-1.5 px-2 font-mono text-[11px] text-[#334155] whitespace-nowrap">
                          {item.businessNo || "-"}
                        </td>
                        <td
                          className="py-1.5 px-2 text-[#1e293b] max-w-[120px] truncate whitespace-nowrap"
                          title={item.region}
                        >
                          {item.region}
                        </td>
                        <td
                          className="py-1.5 px-2 text-[#334155] max-w-[170px] truncate whitespace-nowrap"
                          title={`${item.mainBrands} | ${item.mainProducts}`}
                        >
                          {item.mainBrands || item.mainProducts || "-"}
                        </td>
                        <td
                          className="py-1.5 px-2 text-[11px] text-[#1d4ed8] font-semibold max-w-[160px] truncate whitespace-nowrap"
                          title={item.officialSource}
                        >
                          {item.officialSource}
                        </td>
                        <td className="py-1.5 px-2 text-center whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${stMeta.badgeClass}`}
                          >
                            {stMeta.label}
                          </span>
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
        <div className="col-span-12 lg:col-span-5 bg-[#f4efe4] border border-[#b8ae99] rounded flex flex-col min-h-0 overflow-hidden">
          {selectedItem ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* 상단 요약 헤더 */}
              <div className="p-3 bg-[#e2dbcd] border-b border-[#b8ae99] space-y-2 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-extrabold border ${
                        (SECTOR_META[selectedItem.sector] || SECTOR_META.FL).badgeClass
                      }`}
                    >
                      {(SECTOR_META[selectedItem.sector] || SECTOR_META.FL).label}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#f4efe4] border border-[#b8ae99] text-[10.5px] font-mono font-bold text-[#334155]">
                      {selectedItem.ksicCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedItem)}
                      className="p-1 rounded bg-[#f4efe4] hover:bg-[#d8d0c0] border border-[#b8ae99] text-[#0f172a]"
                      title="정보 수정"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedItem.id, selectedItem.companyName)}
                      className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-300 text-red-700"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-[#0f172a] truncate">
                    {selectedItem.companyName}
                  </h3>
                  <select
                    value={selectedItem.salesStatus}
                    onChange={(e) =>
                      handleQuickUpdate(selectedItem.id, { salesStatus: e.target.value })
                    }
                    className="px-2 py-1 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold text-[#0f172a]"
                  >
                    <option value="TARGET">발굴완료(타깃)</option>
                    <option value="CONTACTED">접촉/제안중</option>
                    <option value="PARTNER">협력/매입처등록</option>
                    <option value="CUSTOMER">당사 고객사등록</option>
                    <option value="HOLD">보류</option>
                  </select>
                </div>

                {/* ERP 거래처 1클릭 연동 버튼 */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleRegisterToPartner(selectedItem, "CUSTOMER")}
                    className="px-2.5 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shadow-xs"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>ERP 고객사(매출처)로 즉시 등록</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegisterToPartner(selectedItem, "VENDOR")}
                    className="px-2.5 py-1 rounded bg-violet-700 hover:bg-violet-800 text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shadow-xs"
                  >
                    <Truck className="w-3 h-3" />
                    <span>ERP 매입거래처(장비수급처)로 등록</span>
                  </button>
                  {selectedItem.websiteUrl && (
                    <a
                      href={selectedItem.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded bg-[#f4efe4] hover:bg-[#d8d0c0] border border-[#b8ae99] text-[#1d4ed8] text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <span>공식 홈페이지</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* 상세 바디 */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-[#ebe5d8] p-2.5 rounded border border-[#b8ae99]">
                  <div>
                    <div className="text-[10px] font-bold text-[#64748b]">사업자등록번호</div>
                    <div className="font-mono font-bold text-[#0f172a]">
                      {selectedItem.businessNo || "미기재 (수정 가능)"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#64748b]">대표자 / 대표전화</div>
                    <div className="font-bold text-[#0f172a]">
                      {selectedItem.ceoName || "-"} / {selectedItem.phone || "-"}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold text-[#64748b]">공식 확인 경로 (원천 검증)</div>
                    <div className="font-extrabold text-[#1d4ed8]">{selectedItem.officialSource}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold text-[#64748b]">권역 및 본사/주기장 소재지</div>
                    <div className="font-semibold text-[#1e293b]">
                      [{selectedItem.region}] {selectedItem.address || "-"}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#f8f4ec] border border-[#c5bba8] space-y-1.5">
                  <div className="text-[11px] font-extrabold text-[#0f172a]">
                    영업 형태 및 주요 취급 브랜드
                  </div>
                  <div className="text-xs text-[#1e293b]">
                    <span className="font-bold text-amber-900">[{selectedItem.bizScope}]</span>{" "}
                    {selectedItem.mainBrands}
                  </div>
                  <div className="text-[11px] font-extrabold text-[#0f172a] pt-1">
                    취급 장비 / 임대 품목 상세
                  </div>
                  <div className="text-xs text-[#334155] leading-relaxed">
                    {selectedItem.mainProducts || "-"}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#f8f4ec] border border-[#c5bba8] space-y-1">
                  <div className="text-[11px] font-extrabold text-[#0f172a]">
                    기업 규모 및 영업 참고사항
                  </div>
                  <div className="text-xs text-[#334155] leading-relaxed">
                    {selectedItem.scaleNote || "-"}
                  </div>
                </div>

                {/* 영업/제휴 메모 */}
                <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b8ae99] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-[#0f172a]">
                      영업 컨택 / 제휴 메모
                    </label>
                    <button
                      type="button"
                      onClick={() => handleQuickUpdate(selectedItem.id, { memo: memoDraft })}
                      className="px-2 py-0.5 rounded bg-[#0f172a] text-white text-[11px] font-bold flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>메모 저장</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={memoDraft}
                    onChange={(e) => setMemoDraft(e.target.value)}
                    placeholder="담당자 연락처, ERP 도입 제안 내용, 장비 임차/전대 조건 등을 기록하십시오."
                    className="w-full p-2 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs text-[#0f172a] resize-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#64748b]">
              좌측 목록에서 사업자를 선택하십시오.
            </div>
          )}
        </div>
      </div>

      {/* 공식 데이터 원천 포털 안내 모달 */}
      {showPortalGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#f4efe4] border border-[#b8ae99] rounded w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-[#e2dbcd] border-b border-[#b8ae99] flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-sm text-[#0f172a]">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>FL · AWP · PC/복합기 임대업 전국 공식 확인 경로 및 원천 포털</span>
              </div>
              <button onClick={() => setShowPortalGuideModal(false)}>
                <X className="w-4 h-4 text-[#475569]" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div className="p-3 rounded bg-[#ebe5d8] border border-[#b8ae99] space-y-1">
                <div className="font-extrabold text-[#0f172a]">
                  업종별 법정 등록 코드 및 공식 확인 기준
                </div>
                <ul className="list-disc list-inside space-y-1 text-[#334155]">
                  <li>
                    <strong>FL (지게차 판매·임대업)</strong>: 지게차는 『건설기계관리법』상 법정 건설기계이므로 관할 시·군·구청에 <strong>건설기계대여업(일반/개별)</strong>으로 등록된 사업자 및 <strong>HD현대·두산밥캣·클라크·토요타 공식 대리점</strong>을 통해 100% 공식 확인됩니다. (표준산업분류 <code>KSIC 71201</code> / <code>46592</code>)
                  </li>
                  <li>
                    <strong>AWP (고소작업대 판매·임대업)</strong>: 고소작업대(시저리프트·붐리프트)는 『산업안전보건법』상 안전인증·정기안전검사(KOSHA) 대상 장비로, <strong>한국렌탈협회, 조달청 나라장터, 다아라 기계장터 공인 회원사</strong>를 통해 확인됩니다. (표준산업분류 <code>KSIC 71201</code>)
                  </li>
                  <li>
                    <strong>PC · 노트북 · 복합기(OA) 임대업</strong>: 공공기관 납품을 위한 <strong>조달청 나라장터 종합쇼핑몰 다수공급자계약(MAS - 사무기기임대/컴퓨터임대)</strong> 계약업체 및 <strong>신도리코·캐논·후지필름·교세라 공식 파트너 법인</strong>으로 확인됩니다. (표준산업분류 <code>KSIC 71202</code>)
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
            <div className="px-4 py-2.5 bg-[#e2dbcd] border-t border-[#b8ae99] flex justify-end">
              <button
                type="button"
                onClick={() => setShowPortalGuideModal(false)}
                className="px-4 py-1.5 rounded bg-[#0f172a] text-white text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수동 등록 / 수정 모달 */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSaveForm}
            className="bg-[#f4efe4] border border-[#b8ae99] rounded w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 bg-[#e2dbcd] border-b border-[#b8ae99] flex items-center justify-between">
              <span className="font-extrabold text-sm text-[#0f172a]">
                {formData.id ? "사업자 정보 수정" : "신규 렌탈·판매 사업자 등록"}
              </span>
              <button type="button" onClick={() => setShowFormModal(false)}>
                <X className="w-4 h-4 text-[#475569]" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">업종 구분 *</label>
                <select
                  value={formData.sector}
                  onChange={(e) =>
                    setFormData({ ...formData, sector: e.target.value as any })
                  }
                  className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99] font-bold"
                >
                  <option value="FL">FL (지게차 판매·임대업)</option>
                  <option value="AWP">AWP (고소작업대 판매·임대업)</option>
                  <option value="OA_PC">PC · 노트북 · 복합기(OA) 임대업</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">상호 (법인명) *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99] font-bold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">사업자등록번호</label>
                <input
                  type="text"
                  value={formData.businessNo}
                  onChange={(e) => setFormData({ ...formData, businessNo: e.target.value })}
                  placeholder="000-00-00000"
                  className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">대표자명</label>
                <input
                  type="text"
                  value={formData.ceoName}
                  onChange={(e) => setFormData({ ...formData, ceoName: e.target.value })}
                  className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">권역 / 지역</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="예: 경기 (화성·평택)"
                  className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">대표 전화번호</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="font-bold text-[#334155]">소재지 주소</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">영업 형태</label>
                <input
                  type="text"
                  value={formData.bizScope}
                  onChange={(e) => setFormData({ ...formData, bizScope: e.target.value })}
                  className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">공식 확인 경로</label>
                <input
                  type="text"
                  value={formData.officialSource}
                  onChange={(e) => setFormData({ ...formData, officialSource: e.target.value })}
                  className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="font-bold text-[#334155]">주요 취급 브랜드</label>
                <input
                  type="text"
                  value={formData.mainBrands}
                  onChange={(e) => setFormData({ ...formData, mainBrands: e.target.value })}
                  className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="font-bold text-[#334155]">주요 취급 기종 / 품목 상세</label>
                <input
                  type="text"
                  value={formData.mainProducts}
                  onChange={(e) => setFormData({ ...formData, mainProducts: e.target.value })}
                  className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="font-bold text-[#334155]">홈페이지 URL</label>
                <input
                  type="text"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
                />
              </div>
            </div>

            <div className="px-4 py-2.5 bg-[#e2dbcd] border-t border-[#b8ae99] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="px-3 py-1.5 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#1d4ed8] text-white text-xs font-bold"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
