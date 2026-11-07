"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Compass,
  Search,
  RefreshCw,
  Bookmark,
  ExternalLink,
  Copy,
  Plus,
  Trash2,
  Settings,
  Check,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Sparkles,
  BookOpen,
  Eye,
  Download,
} from "lucide-react";
import { sortErpItems, SortDirection, formatErpNumber } from "@/lib/erpFormat";

interface GovSupportItem {
  id: number;
  category: "SUPPORT" | "PROCUREMENT" | "NEWS" | "TREND" | string;
  agency: string;
  title: string;
  region: string;
  targetAudience: string;
  supportAmount: string;
  startDate: string | null;
  endDate: string | null;
  ddayLabel: string | null;
  fitScore: number;
  status: "DISCOVERED" | "BOOKMARKED" | "PREPARING" | "APPLIED" | "ARCHIVED" | string;
  summary: string | null;
  eligibilityDetail: string | null;
  actionPlan: string | null;
  originalContent: string | null;
  sourceUrl: string | null;
  keywords: string | null;
  isBookmarked: boolean;
  memo: string | null;
  publishedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AiIntelSettings {
  hasApiKey: boolean;
  maskedApiKey: string;
  keySource: string;
  geminiModel: string;
  companyProfile: string;
  interestKeywords: string;
}

const CATEGORY_META: Record<string, { label: string; badgeClass: string }> = {
  SUPPORT: {
    label: "정부지원·바우처",
    badgeClass: "bg-[#dbeafe] text-[#1e40af] border-[#93c5fd]",
  },
  PROCUREMENT: {
    label: "나라장터·공공입찰",
    badgeClass: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
  },
  NEWS: {
    label: "정책·산업뉴스",
    badgeClass: "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]",
  },
  TREND: {
    label: "AI·렌탈 트렌드",
    badgeClass: "bg-[#f3e8ff] text-[#6b21a8] border-[#d8b4fe]",
  },
};

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  DISCOVERED: {
    label: "발굴됨",
    badgeClass: "bg-[#ebe5d8] text-[#334155] border-[#b5a894]",
  },
  BOOKMARKED: {
    label: "관심검토",
    badgeClass: "bg-[#dbeafe] text-[#1e40af] border-[#93c5fd]",
  },
  PREPARING: {
    label: "신청준비중",
    badgeClass: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
  },
  APPLIED: {
    label: "접수완료",
    badgeClass: "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]",
  },
  ARCHIVED: {
    label: "마감/보류",
    badgeClass: "bg-[#f1f5f9] text-[#64748b] border-[#cbd5e1]",
  },
};

const QUICK_TOPICS = [
  { label: "AI·클라우드·스마트서비스 바우처", query: "중소기업 AI 바우처 클라우드 바우처 스마트서비스 지원사업 공고" },
  { label: "청년채용·고용장려금 지원", query: "고용노동부 청년일자리도약장려금 고용창출장려금 중소기업 인건비 지원" },
  { label: "서울 금천구(G밸리)·SBA 지원사업", query: "서울경제진흥원 SBA 금천구 가산디지털단지 중소기업 지원사업 공고" },
  { label: "나라장터 디스플레이·TV·OA 임차", query: "조달청 나라장터 스마트TV 모니터 노트북 임차 렌탈 입찰 공고" },
  { label: "중소기업 R&D·디딤돌 기술개발", query: "중소벤처기업부 창업성장기술개발 디딤돌 R&D 지원사업 공고" },
  { label: "B2B 렌탈·RPA·AI ERP 트렌드", query: "B2B 렌탈 구독경제 RPA 업무자동화 AI 에이전트 ERP 산업 트렌드" },
];

export const GovSupportIntelTab: React.FC<{ currentUser: any }> = () => {
  const [items, setItems] = useState<GovSupportItem[]>([]);
  const [settings, setSettings] = useState<AiIntelSettings>({
    hasApiKey: false,
    maskedApiKey: "",
    keySource: "NONE",
    geminiModel: "gemini-2.5-pro",
    companyProfile: "",
    interestKeywords: "",
  });
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  // Filters & Sorting
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [bookmarkOnly, setBookmarkOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [discoverTopic, setDiscoverTopic] = useState<string>("");
  const [sortKey, setSortKey] = useState<string>("fitScore");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Selected Item & Right Dossier View Mode ('SUMMARY' | 'ORIGINAL')
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [rightViewMode, setRightViewMode] = useState<"SUMMARY" | "ORIGINAL">("SUMMARY");
  const [memoDraft, setMemoDraft] = useState<string>("");

  // Original Content Full Modal & Fetching State
  const [originalModalOpen, setOriginalModalOpen] = useState(false);
  const [fetchingOriginal, setFetchingOriginal] = useState(false);

  // Modals
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("gemini-2.5-pro");
  const [profileInput, setProfileInput] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    category: "SUPPORT",
    agency: "중소벤처기업부",
    title: "",
    region: "전국",
    targetAudience: "중소·벤처기업",
    supportAmount: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    ddayLabel: "접수중",
    fitScore: 92,
    summary: "",
    eligibilityDetail: "",
    actionPlan: "",
    originalContent: "",
    sourceUrl: "https://www.bizinfo.go.kr",
    keywords: "",
  });

  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/gov-support", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "데이터 조회 실패");

      const list: GovSupportItem[] = data.items || [];
      setItems(list);
      if (data.settings) {
        setSettings(data.settings);
        setModelInput(data.settings.geminiModel || "gemini-2.5-pro");
        setProfileInput(data.settings.companyProfile || "");
        setKeywordsInput(data.settings.interestKeywords || "");
      }
      if (list.length > 0 && !selectedItemId) {
        setSelectedItemId(list[0].id);
        setMemoDraft(list[0].memo || "");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (bookmarkOnly && !item.isBookmarked) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchAgency = (item.agency || "").toLowerCase().includes(q);
        const matchSummary = (item.summary || "").toLowerCase().includes(q);
        const matchOrig = (item.originalContent || "").toLowerCase().includes(q);
        const matchKw = (item.keywords || "").toLowerCase().includes(q);
        if (!matchTitle && !matchAgency && !matchSummary && !matchOrig && !matchKw) return false;
      }
      return true;
    });
  }, [items, categoryFilter, statusFilter, bookmarkOnly, searchQuery]);

  const sortedItems = useMemo(() => {
    return sortErpItems(filteredItems, sortKey, sortDir);
  }, [filteredItems, sortKey, sortDir]);

  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedItemId) || sortedItems[0] || null;
  }, [items, selectedItemId, sortedItems]);

  useEffect(() => {
    if (selectedItem) {
      setMemoDraft(selectedItem.memo || "");
    }
  }, [selectedItem?.id]);

  // KPI 집계
  const kpis = useMemo(() => {
    const total = items.length;
    const supportCount = items.filter(
      (i) => i.category === "SUPPORT" || i.category === "PROCUREMENT"
    ).length;
    const bookmarkedCount = items.filter(
      (i) => i.isBookmarked || i.status === "BOOKMARKED" || i.status === "PREPARING"
    ).length;
    const appliedCount = items.filter((i) => i.status === "APPLIED").length;
    return { total, supportCount, bookmarkedCount, appliedCount };
  }, [items]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const renderSortTh = (
    label: string,
    colKey: string,
    align: "left" | "right" | "center" = "left"
  ) => (
    <th
      onClick={() => handleSort(colKey)}
      className={`py-2 px-2.5 whitespace-nowrap cursor-pointer select-none transition ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } hover:bg-[#d0c6b4]`}
    >
      <div
        className={`inline-flex items-center gap-1 ${
          align === "right"
            ? "justify-end"
            : align === "center"
            ? "justify-center"
            : "justify-start"
        }`}
      >
        <span>{label}</span>
        {sortKey === colKey ? (
          sortDir === "asc" ? (
            <ArrowUp className="w-3 h-3 text-[#1d4ed8]" />
          ) : (
            <ArrowDown className="w-3 h-3 text-[#1d4ed8]" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );

  // Google AI 실시간 탐색 실행
  const handleAiDiscover = async (customQuery?: string) => {
    const targetQuery = customQuery !== undefined ? customQuery : discoverTopic;
    setDiscovering(true);
    try {
      const res = await fetch("/api/erp/gov-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "AI_DISCOVER",
          queryTopic: targetQuery,
          targetCategory: categoryFilter,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "탐색 실패");

      showToast(data.message || "신규 정보 수집이 완료되었습니다.");
      await fetchAll();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setDiscovering(false);
    }
  };

  // 선택 항목의 웹페이지 실시간 원문 추출/최신화 (FETCH_ORIGINAL)
  const handleFetchOriginalContent = async (item: GovSupportItem, openModalAfter = false) => {
    setFetchingOriginal(true);
    try {
      const res = await fetch("/api/erp/gov-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FETCH_ORIGINAL",
          id: item.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "원문 추출 실패");

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                originalContent: data.originalContent || it.originalContent,
              }
            : it
        )
      );
      if (openModalAfter) {
        setOriginalModalOpen(true);
      } else {
        showToast("수집 원문 본문을 최신화했습니다.");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setFetchingOriginal(false);
    }
  };

  // 원문 보기 버튼 클릭 핸들러 (DB에 원문이 있으면 즉시 모달 열기, 없으면 실시간 추출 후 열기)
  const handleOpenOriginalModal = async (item: GovSupportItem) => {
    setSelectedItemId(item.id);
    setOriginalModalOpen(true);
    if (!item.originalContent || item.originalContent.trim().length < 40) {
      await handleFetchOriginalContent(item, true);
    }
  };

  // 북마크 또는 상태 즉시 업데이트
  const handleQuickUpdate = async (
    id: number,
    patch: { status?: string; isBookmarked?: boolean; memo?: string; originalContent?: string }
  ) => {
    try {
      const res = await fetch("/api/erp/gov-support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "저장 실패");

      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: patch.status !== undefined ? patch.status : it.status,
                isBookmarked:
                  patch.isBookmarked !== undefined ? patch.isBookmarked : it.isBookmarked,
                memo: patch.memo !== undefined ? patch.memo : it.memo,
                originalContent:
                  patch.originalContent !== undefined
                    ? patch.originalContent
                    : it.originalContent,
              }
            : it
        )
      );
      showToast("즉시 반영되었습니다.");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("선택한 공고/뉴스 항목을 목록에서 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/erp/gov-support?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");

      setItems((prev) => prev.filter((i) => i.id !== id));
      if (selectedItemId === id) {
        setSelectedItemId(null);
      }
      showToast("삭제되었습니다.");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Google AI Ultra (Gemini Deep Research / NotebookLM) 전용 맞춤 프롬프트 클립보드 복사 & 열기
  const handleCopyUltraPrompt = async (
    item: GovSupportItem,
    openExternal?: "GEMINI" | "NOTEBOOKLM"
  ) => {
    const prompt = `[Google AI Ultra Deep Research / 사업계획서·전략 브리핑 요청]

■ 당사 기업 프로필
${settings.companyProfile || "주식회사 드래곤알피에이 (IT/RPA 업무자동화 솔루션, AI ERP 개발, 스마트TV·모니터·OA 장비 렌탈 및 현장 구축·운영용역 전문 법인, 서울 금천구 소재 중소기업)"}

■ 분석 대상 공고 / 뉴스 / 트렌드
- 분류: ${CATEGORY_META[item.category]?.label || item.category}
- 주관기관/출처: ${item.agency}
- 제목: ${item.title}
- 지원규모: ${item.supportAmount || "-"}
- 접수기간: ${item.startDate || "-"} ~ ${item.endDate || "-"}
- 핵심요약: ${item.summary || "-"}
- 원문링크: ${item.sourceUrl || "-"}

■ 수집된 원문 상세 내용
${item.originalContent || item.summary || "-"}

■ 요청 사항
1. 위 공고/트렌드가 (주)드래곤알피에이의 3대 사업영역(① RPA·AI ERP 솔루션 공급, ② 디스플레이·IT장비 렌탈, ③ 엔터프라이즈 현장 운영용역)에 주는 구체적 기회와 기대효과를 분석해 주세요.
2. 당사가 즉시 지원(또는 입찰 참여)하기 위해 준비해야 할 필수 자격요건 체크리스트와 가점 확보 전략을 정리해 주세요.
3. 심사위원을 설득할 수 있는 [사업계획서 핵심 요약본 (문제점 - 해결방안 - 당사 경쟁력 - 기대효과 - 예산편성안)] 초안을 작성해 주세요.`;

    try {
      await navigator.clipboard.writeText(prompt);
      if (openExternal === "GEMINI") {
        showToast(
          "원문이 포함된 Deep Research 프롬프트가 복사되었습니다. 새 창(Gemini)에 붙여넣기(Ctrl+V) 하세요."
        );
        window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
      } else if (openExternal === "NOTEBOOKLM") {
        showToast(
          "원문이 포함된 분석 프롬프트가 복사되었습니다. NotebookLM에 붙여넣기(Ctrl+V) 하세요."
        );
        window.open("https://notebooklm.google.com/", "_blank", "noopener,noreferrer");
      } else {
        showToast(
          "수집 원문이 포함된 Google AI Ultra 심층분석·사업계획서 프롬프트가 클립보드에 복사되었습니다."
        );
      }
    } catch {
      showToast("클립보드 복사에 실패했습니다.", "error");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/erp/gov-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_SETTINGS",
          geminiApiKey: apiKeyInput,
          geminiModel: modelInput,
          companyProfile: profileInput,
          interestKeywords: keywordsInput,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "설정 저장 실패");

      showToast(data.message || "설정이 저장되었습니다.");
      setApiKeyInput("");
      setSettingsModalOpen(false);
      await fetchAll();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title.trim()) {
      showToast("제목을 입력해주세요.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/gov-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_ITEM",
          ...newForm,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "등록 실패");

      showToast("신규 정부지원사업/트렌드 항목이 등록되었습니다.");
      setCreateModalOpen(false);
      setNewForm({
        ...newForm,
        title: "",
        supportAmount: "",
        summary: "",
        eligibilityDetail: "",
        actionPlan: "",
        originalContent: "",
      });
      await fetchAll();
      if (data.id) setSelectedItemId(Number(data.id));
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "분류",
      "주관기관/출처",
      "공고/뉴스명",
      "지역",
      "지원규모",
      "시작일",
      "마감일",
      "상태구분",
      "적합도(%)",
      "진행상태",
      "원문URL",
    ];
    const rows = sortedItems.map((it) => [
      CATEGORY_META[it.category]?.label || it.category,
      `"${(it.agency || "").replace(/"/g, '""')}"`,
      `"${(it.title || "").replace(/"/g, '""')}"`,
      it.region || "-",
      `"${(it.supportAmount || "").replace(/"/g, '""')}"`,
      it.startDate || "-",
      it.endDate || "-",
      it.ddayLabel || "-",
      it.fitScore,
      STATUS_META[it.status]?.label || it.status,
      it.sourceUrl || "-",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `정부지원사업_뉴스_트렌드_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formattedOriginalText = useMemo(() => {
    if (!selectedItem) return "";
    if (selectedItem.originalContent && selectedItem.originalContent.trim()) {
      return selectedItem.originalContent;
    }
    return [
      `■ 제목: ${selectedItem.title}`,
      `■ 주관기관 / 출처: ${selectedItem.agency || "-"}`,
      `■ 지원규모: ${selectedItem.supportAmount || "-"}`,
      `■ 접수기간: ${selectedItem.startDate || "-"} ~ ${selectedItem.endDate || "-"}`,
      `■ 대상지역 / 대상기업: ${selectedItem.region || "전국"} / ${selectedItem.targetAudience || "중소기업"}`,
      `■ 원문 URL: ${selectedItem.sourceUrl || "-"}`,
      `──────────────────────────────────────────────────`,
      `[핵심 본문]`,
      selectedItem.summary || "-",
      selectedItem.eligibilityDetail ? `\n[신청 자격 및 요건]\n${selectedItem.eligibilityDetail}` : "",
      selectedItem.actionPlan ? `\n[권장 실행 플랜]\n${selectedItem.actionPlan}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }, [selectedItem]);

  return (
    <div className="flex flex-col h-full bg-[#ebe5d8] text-[#0f172a] overflow-hidden font-sans">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-xs font-bold border ${
            toastMessage.type === "success"
              ? "bg-[#ecfdf5] border-[#047857] text-[#065f46]"
              : "bg-[#fef2f2] border-[#dc2626] text-[#b91c1c]"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* 1. 상단 컨트롤 바 */}
      <div className="p-2.5 px-3 bg-[#e2dbcd] border-b border-[#b5a894] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Compass className="w-4 h-4 text-[#1d4ed8]" />
            <span className="text-xs font-bold text-[#0f172a]">
              정부지원·뉴스·트렌드 (Google AI Ultra 연동)
            </span>
          </div>

          <span
            className={`px-2 py-0.5 rounded text-[10.5px] font-bold border whitespace-nowrap ${
              settings.hasApiKey
                ? "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]"
                : "bg-[#dbeafe] text-[#1e40af] border-[#93c5fd]"
            }`}
          >
            {settings.hasApiKey
              ? `Gemini API 연결됨 (${settings.geminiModel})`
              : "실시간 정책·뉴스 피드 + Google AI Ultra 워크스페이스 연동"}
          </span>

          {/* 카테고리 탭 버튼 */}
          <div className="flex items-center gap-1 bg-[#f4efe4] p-0.5 rounded border border-[#b5a894]">
            {[
              { key: "ALL", label: "전체" },
              { key: "SUPPORT", label: "정부지원·바우처" },
              { key: "PROCUREMENT", label: "나라장터·입찰" },
              { key: "NEWS", label: "정책·산업뉴스" },
              { key: "TREND", label: "AI·렌탈트렌드" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCategoryFilter(tab.key)}
                className={`px-2 py-1 rounded text-[11px] font-bold whitespace-nowrap transition ${
                  categoryFilter === tab.key
                    ? "bg-[#1d4ed8] text-white shadow-2xs"
                    : "text-[#334155] hover:bg-[#dcd4c4]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1 rounded focus:outline-none focus:border-[#1d4ed8] whitespace-nowrap"
          >
            <option value="ALL">전체 진행상태</option>
            <option value="DISCOVERED">발굴됨</option>
            <option value="BOOKMARKED">관심검토</option>
            <option value="PREPARING">신청준비중</option>
            <option value="APPLIED">접수완료</option>
            <option value="ARCHIVED">마감/보류</option>
          </select>

          <button
            type="button"
            onClick={() => setBookmarkOnly((prev) => !prev)}
            className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 whitespace-nowrap transition ${
              bookmarkOnly
                ? "bg-[#fef3c7] text-[#92400e] border-[#f59e0b]"
                : "bg-[#f4efe4] text-[#334155] border-[#b5a894] hover:bg-[#dcd4c4]"
            }`}
          >
            <Bookmark className="w-3 h-3" />
            <span>북마크만</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-[#475569]" />
            <input
              type="text"
              placeholder="공고명 / 기관 / 원문 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] pl-7 pr-2.5 py-1 rounded w-44 focus:outline-none focus:border-[#1d4ed8]"
            />
          </div>
        </div>

        {/* 우측 액션 버튼군 */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className="px-2.5 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] text-xs font-bold rounded border border-[#b5a894] flex items-center gap-1 whitespace-nowrap transition"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>AI 프로필·키 설정</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-2.5 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] text-xs font-bold rounded border border-[#b5a894] flex items-center gap-1 whitespace-nowrap transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>수동 등록</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-2.5 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] text-xs font-bold rounded border border-[#b5a894] flex items-center gap-1 whitespace-nowrap transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>

          <button
            type="button"
            onClick={fetchAll}
            disabled={loading}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. 실시간 AI 탐색 바 & 원클릭 주제 프리셋 + KPI 요약 */}
      <div className="px-3 py-2 bg-[#f4efe4] border-b border-[#b5a894] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[320px]">
          <div className="flex items-center gap-1 bg-[#ebe5d8] border border-[#b5a894] rounded px-2 py-1 flex-1 max-w-md">
            <Sparkles className="w-3.5 h-3.5 text-[#1d4ed8] shrink-0" />
            <input
              type="text"
              value={discoverTopic}
              onChange={(e) => setDiscoverTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAiDiscover();
                }
              }}
              placeholder="탐색 주제 입력 (예: AI 바우처, 스마트서비스, 금천구 지원사업, 스마트TV 임차)"
              className="bg-transparent text-xs text-[#0f172a] w-full focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={discovering}
            onClick={() => handleAiDiscover()}
            className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white text-xs font-bold rounded flex items-center gap-1 shadow-xs whitespace-nowrap transition"
          >
            <Sparkles className={`w-3.5 h-3.5 ${discovering ? "animate-spin" : ""}`} />
            <span>{discovering ? "수집·분석 중..." : "신규 공고·뉴스 자동수집"}</span>
          </button>

          {/* 퀵 프리셋 태그 */}
          <div className="flex flex-wrap items-center gap-1 ml-1">
            {QUICK_TOPICS.map((qt) => (
              <button
                key={qt.label}
                type="button"
                disabled={discovering}
                onClick={() => {
                  setDiscoverTopic(qt.query);
                  handleAiDiscover(qt.query);
                }}
                className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#ebe5d8] hover:bg-[#dcd4c4] text-[#0f172a] border border-[#b5a894] whitespace-nowrap transition"
              >
                + {qt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 우측 1줄 미니 집계 */}
        <div className="flex items-center gap-2 text-[11px] font-mono bg-[#ebe5d8] px-2.5 py-1 rounded border border-[#b5a894] whitespace-nowrap">
          <span>
            전체 <strong className="text-[#0f172a]">{formatErpNumber(kpis.total)}건</strong>
          </span>
          <span className="text-[#cbd5e1]">|</span>
          <span>
            지원·입찰{" "}
            <strong className="text-[#1d4ed8]">{formatErpNumber(kpis.supportCount)}건</strong>
          </span>
          <span className="text-[#cbd5e1]">|</span>
          <span>
            관심·준비{" "}
            <strong className="text-[#b45309]">{formatErpNumber(kpis.bookmarkedCount)}건</strong>
          </span>
          <span className="text-[#cbd5e1]">|</span>
          <span>
            접수완료{" "}
            <strong className="text-[#047857]">{formatErpNumber(kpis.appliedCount)}건</strong>
          </span>
        </div>
      </div>

      {/* 3. 본문 마스터-디테일 영역 */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* 좌측: 고밀도 공고/뉴스/트렌드 목록 테이블 (7 cols) */}
        <div className="col-span-12 lg:col-span-7 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#dcd4c4] text-[#0f172a] font-semibold border-b border-[#b5a894] sticky top-0 z-10 select-none">
                <tr>
                  <th className="py-2 px-2 text-center whitespace-nowrap">원문</th>
                  <th className="py-2 px-2 text-center whitespace-nowrap w-9">관심</th>
                  {renderSortTh("분류", "category")}
                  {renderSortTh("주관기관 / 출처", "agency")}
                  {renderSortTh("공고 / 뉴스 / 트렌드 제목", "title")}
                  {renderSortTh("지원규모 / 핵심지표", "supportAmount")}
                  {renderSortTh("마감 / 구분", "endDate", "center")}
                  {renderSortTh("적합도", "fitScore", "center")}
                  {renderSortTh("진행상태", "status", "center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0]">
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#475569] whitespace-nowrap">
                      조건에 해당하는 정부지원사업·뉴스·트렌드 내역이 없습니다. 상단 [신규 공고·뉴스 자동수집]을 실행해보세요.
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const catMeta = CATEGORY_META[item.category] || CATEGORY_META.SUPPORT;
                    const stMeta = STATUS_META[item.status] || STATUS_META.DISCOVERED;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`cursor-pointer transition ${
                          isSelected ? "bg-[#dbeafe]/70" : "hover:bg-[#ede6d6]"
                        }`}
                      >
                        <td
                          className="py-2 px-2 text-center whitespace-nowrap"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenOriginalModal(item);
                          }}
                        >
                          <button
                            type="button"
                            className="px-2 py-0.5 rounded bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-[10.5px] font-bold inline-flex items-center gap-1 shadow-2xs whitespace-nowrap transition"
                            title="수집된 원문 전문 보기"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>원문보기</span>
                          </button>
                        </td>
                        <td
                          className="py-2 px-2 text-center whitespace-nowrap"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickUpdate(item.id, { isBookmarked: !item.isBookmarked });
                          }}
                        >
                          <button
                            type="button"
                            className={`p-1 rounded transition ${
                              item.isBookmarked
                                ? "text-[#d97706]"
                                : "text-[#94a3b8] hover:text-[#475569]"
                            }`}
                            title="관심 북마크 토글"
                          >
                            <Bookmark
                              className="w-3.5 h-3.5"
                              fill={item.isBookmarked ? "currentColor" : "none"}
                            />
                          </button>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${catMeta.badgeClass}`}
                          >
                            {catMeta.label}
                          </span>
                        </td>
                        <td
                          className="py-2 px-2.5 text-[#334155] font-medium max-w-[130px] truncate whitespace-nowrap"
                          title={item.agency}
                        >
                          {item.agency}
                        </td>
                        <td
                          className="py-2 px-2.5 font-bold text-[#0f172a] max-w-[240px] truncate whitespace-nowrap"
                          title={item.title}
                        >
                          {item.title}
                        </td>
                        <td
                          className="py-2 px-2.5 text-[#1d4ed8] font-mono font-semibold max-w-[140px] truncate whitespace-nowrap"
                          title={item.supportAmount || ""}
                        >
                          {item.supportAmount || "-"}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono whitespace-nowrap">
                          <span className="text-[11px] text-[#0f172a] font-semibold">
                            {item.endDate || item.ddayLabel || "-"}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold border ${
                              item.fitScore >= 93
                                ? "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]"
                                : item.fitScore >= 85
                                ? "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]"
                                : "bg-[#f4efe4] text-[#475569] border-[#cbd5e1]"
                            }`}
                          >
                            {item.fitScore}%
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
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

        {/* 우측: 선택 항목 상세 도시에(Dossier) 및 원문 보기 패널 (5 cols) */}
        <div className="col-span-12 lg:col-span-5 bg-[#f4efe4] border border-[#b5a894] rounded flex flex-col overflow-hidden">
          {selectedItem ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* 상세 헤더 */}
              <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${
                        (CATEGORY_META[selectedItem.category] || CATEGORY_META.SUPPORT).badgeClass
                      }`}
                    >
                      {(CATEGORY_META[selectedItem.category] || CATEGORY_META.SUPPORT).label}
                    </span>
                    <span className="text-xs font-bold text-[#334155]">
                      {selectedItem.agency}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
                      당사 적합도 {selectedItem.fitScore}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <select
                      value={selectedItem.status}
                      onChange={(e) =>
                        handleQuickUpdate(selectedItem.id, { status: e.target.value })
                      }
                      className="bg-[#f4efe4] border border-[#b5a894] text-[11px] font-bold text-[#0f172a] px-2 py-1 rounded focus:outline-none focus:border-[#1d4ed8]"
                    >
                      <option value="DISCOVERED">발굴됨</option>
                      <option value="BOOKMARKED">관심검토</option>
                      <option value="PREPARING">신청준비중</option>
                      <option value="APPLIED">접수완료</option>
                      <option value="ARCHIVED">마감/보류</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(selectedItem.id)}
                      className="p-1 hover:bg-[#fee2e2] text-[#b91c1c] rounded border border-transparent hover:border-[#fecaca] transition"
                      title="항목 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[#0f172a] leading-snug">
                  {selectedItem.title}
                </h3>

                {/* 우측 패널 보기 모드 전환 탭 (요약·전략 브리핑 vs 수집 원문 전문 보기) + 전체화면 원문 모달 버튼 */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1 bg-[#ebe5d8] p-0.5 rounded border border-[#b5a894]">
                    <button
                      type="button"
                      onClick={() => setRightViewMode("SUMMARY")}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition ${
                        rightViewMode === "SUMMARY"
                          ? "bg-[#1d4ed8] text-white shadow-2xs"
                          : "text-[#334155] hover:bg-[#dcd4c4]"
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>요약 · 실행전략</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightViewMode("ORIGINAL")}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition ${
                        rightViewMode === "ORIGINAL"
                          ? "bg-[#1d4ed8] text-white shadow-2xs"
                          : "text-[#334155] hover:bg-[#dcd4c4]"
                      }`}
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>수집 원문 보기</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenOriginalModal(selectedItem)}
                      className="px-2.5 py-1 rounded bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs whitespace-nowrap transition"
                    >
                      <Eye className="w-3 h-3" />
                      <span>원문 크게 보기</span>
                    </button>

                    {selectedItem.sourceUrl && (
                      <a
                        href={selectedItem.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-[#f4efe4] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#93c5fd] text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap transition"
                      >
                        <span>원문 사이트 이동</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* 상세 바디 */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
                {rightViewMode === "ORIGINAL" ? (
                  /* === [모드 2: 수집 원문 전문 보기 뷰] === */
                  <div className="flex flex-col gap-2.5 h-full">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#ebe5d8] p-2 rounded border border-[#b5a894]">
                      <span className="text-[11px] font-bold text-[#0f172a] flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#1d4ed8]" />
                        <span>수집된 공고 / 기사 원문 텍스트</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={fetchingOriginal}
                          onClick={() => handleFetchOriginalContent(selectedItem, false)}
                          className="px-2 py-1 rounded bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] text-[10.5px] font-bold flex items-center gap-1 whitespace-nowrap transition"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${fetchingOriginal ? "animate-spin" : ""}`}
                          />
                          <span>{fetchingOriginal ? "추출 중..." : "웹페이지 원문 재수집"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(formattedOriginalText);
                            showToast("원문 전체 텍스트가 복사되었습니다.");
                          }}
                          className="px-2 py-1 rounded bg-white hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#93c5fd] text-[10.5px] font-bold flex items-center gap-1 whitespace-nowrap transition"
                        >
                          <Copy className="w-3 h-3" />
                          <span>원문 복사</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 bg-white border border-[#b5a894] rounded p-3.5 font-sans text-xs text-[#0f172a] leading-relaxed whitespace-pre-wrap overflow-y-auto select-text shadow-inner">
                      {formattedOriginalText}
                    </div>
                  </div>
                ) : (
                  /* === [모드 1: 요약·실행전략 & 원문 미리보기 통합 뷰] === */
                  <>
                    {/* 핵심 제원 2x2 그리드 */}
                    <div className="grid grid-cols-2 gap-2 bg-[#ebe5d8] p-2.5 rounded border border-[#b5a894]">
                      <div>
                        <span className="text-[10.5px] text-[#475569] block">지원규모 / 예산</span>
                        <span className="font-mono font-bold text-[#1d4ed8]">
                          {selectedItem.supportAmount || "공고문 참조"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10.5px] text-[#475569] block">접수기간 / 구분</span>
                        <span className="font-mono font-bold text-[#0f172a]">
                          {selectedItem.startDate || "-"} ~ {selectedItem.endDate || "-"}{" "}
                          {selectedItem.ddayLabel ? `(${selectedItem.ddayLabel})` : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10.5px] text-[#475569] block">대상 지역</span>
                        <span className="font-semibold text-[#0f172a]">
                          {selectedItem.region || "전국"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10.5px] text-[#475569] block">지원 대상</span>
                        <span className="font-semibold text-[#0f172a]">
                          {selectedItem.targetAudience || "중소기업"}
                        </span>
                      </div>
                    </div>

                    {/* Google AI Ultra 원클릭 연동 브릿지 박스 */}
                    <div className="p-2.5 rounded border border-[#93c5fd] bg-[#eff6ff] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#1e40af] flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            Google AI Ultra (Gemini Deep Research · NotebookLM) 즉시 활용
                          </span>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyUltraPrompt(selectedItem)}
                          className="px-2 py-1.5 rounded bg-white hover:bg-[#dbeafe] text-[#1e3a8a] border border-[#93c5fd] text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap transition"
                        >
                          <Copy className="w-3 h-3" />
                          <span>사업계획서 프롬프트 복사</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyUltraPrompt(selectedItem, "GEMINI")}
                          className="px-2 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap transition"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Gemini Ultra 열기</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyUltraPrompt(selectedItem, "NOTEBOOKLM")}
                          className="px-2 py-1.5 rounded bg-[#047857] hover:bg-[#065f46] text-white text-[11px] font-bold flex items-center justify-center gap-1 whitespace-nowrap transition"
                        >
                          <FileText className="w-3 h-3" />
                          <span>NotebookLM 열기</span>
                        </button>
                      </div>
                    </div>

                    {/* 핵심 요약 및 당사 활용 포인트 */}
                    <div className="bg-[#ebe5d8] p-2.5 rounded border border-[#b5a894] space-y-1">
                      <div className="font-bold text-[#0f172a] text-[11px]">
                        핵심 요약 및 (주)드래곤알피에이 활용 포인트
                      </div>
                      <p className="text-[#334155] leading-relaxed whitespace-pre-line">
                        {selectedItem.summary || "요약 정보가 없습니다."}
                      </p>
                    </div>

                    {/* 수집 원문 본문 섹션 (요약 탭에서도 바로 확인 가능) */}
                    <div className="bg-white p-3 rounded border border-[#b5a894] space-y-1.5">
                      <div className="flex items-center justify-between border-b border-[#e2dbcd] pb-1.5">
                        <span className="font-bold text-[#1e3a8a] text-[11px] flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>수집된 공고 / 뉴스 원문 내용</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenOriginalModal(selectedItem)}
                            className="px-2 py-0.5 rounded bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#93c5fd] text-[10.5px] font-bold"
                          >
                            원문 전체화면 열기
                          </button>
                        </div>
                      </div>
                      <div className="text-[#0f172a] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto pr-1 text-[11.5px]">
                        {formattedOriginalText}
                      </div>
                    </div>

                    {/* 신청 자격 및 요건 */}
                    {selectedItem.eligibilityDetail && (
                      <div className="bg-[#ebe5d8] p-2.5 rounded border border-[#b5a894] space-y-1">
                        <div className="font-bold text-[#0f172a] text-[11px]">
                          신청 자격 및 우대 요건
                        </div>
                        <p className="text-[#334155] leading-relaxed whitespace-pre-line">
                          {selectedItem.eligibilityDetail}
                        </p>
                      </div>
                    )}

                    {/* 단계별 실행 플랜 */}
                    {selectedItem.actionPlan && (
                      <div className="bg-[#ebe5d8] p-2.5 rounded border border-[#b5a894] space-y-1">
                        <div className="font-bold text-[#047857] text-[11px]">
                          권장 실행 플랜 (Action Plan)
                        </div>
                        <p className="text-[#334155] leading-relaxed whitespace-pre-line">
                          {selectedItem.actionPlan}
                        </p>
                      </div>
                    )}

                    {/* 사내 검토 메모 (즉시 저장) */}
                    <div className="bg-[#ebe5d8] p-2.5 rounded border border-[#b5a894] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#0f172a] text-[11px]">
                          사내 검토 및 준비 메모
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickUpdate(selectedItem.id, { memo: memoDraft })
                          }
                          className="px-2.5 py-0.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[10.5px] font-bold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>메모 저장</span>
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={memoDraft}
                        onChange={(e) => setMemoDraft(e.target.value)}
                        placeholder="담당자 배정, 필요 서류, 컨소시엄 대상 고객사 등 메모 기록"
                        className="w-full bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8]"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-[#475569]">
              좌측 목록에서 정부지원사업 또는 뉴스/트렌드 항목을 선택하세요.
            </div>
          )}
        </div>
      </div>

      {/* 모달 0: 수집 원문 전체보기 (Original Content Reader Modal) */}
      {originalModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg w-full max-w-4xl max-h-[88vh] shadow-2xl flex flex-col overflow-hidden">
            {/* 모달 헤더 */}
            <div className="px-4 py-3 bg-[#e2dbcd] border-b border-[#b5a894] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                <span
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold border shrink-0 ${
                    (CATEGORY_META[selectedItem.category] || CATEGORY_META.SUPPORT).badgeClass
                  }`}
                >
                  {(CATEGORY_META[selectedItem.category] || CATEGORY_META.SUPPORT).label}
                </span>
                <h2 className="text-sm font-bold text-[#0f172a] truncate">
                  {selectedItem.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOriginalModalOpen(false)}
                className="p-1 hover:bg-black/10 rounded shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 모달 툴바 */}
            <div className="px-4 py-2 bg-[#f4efe4] border-b border-[#b5a894] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#334155]">
                <span>
                  주관기관/출처: <strong className="text-[#0f172a]">{selectedItem.agency}</strong>
                </span>
                <span>|</span>
                <span>
                  지원규모:{" "}
                  <strong className="font-mono text-[#1d4ed8]">
                    {selectedItem.supportAmount || "-"}
                  </strong>
                </span>
                <span>|</span>
                <span>
                  기간:{" "}
                  <strong className="font-mono text-[#0f172a]">
                    {selectedItem.startDate || "-"} ~ {selectedItem.endDate || "-"}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={fetchingOriginal}
                  onClick={() => handleFetchOriginalContent(selectedItem, true)}
                  className="px-2.5 py-1 rounded bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] text-xs font-bold flex items-center gap-1 whitespace-nowrap transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fetchingOriginal ? "animate-spin" : ""}`} />
                  <span>{fetchingOriginal ? "웹 원문 추출 중..." : "웹페이지 원문 실시간 추출"}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(formattedOriginalText);
                    showToast("수집 원문 전체가 클립보드에 복사되었습니다.");
                  }}
                  className="px-2.5 py-1 rounded bg-white hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#93c5fd] text-xs font-bold flex items-center gap-1 whitespace-nowrap transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>원문 전체 복사</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyUltraPrompt(selectedItem, "GEMINI")}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>원문 포함 Gemini Ultra 분석</span>
                </button>

                {selectedItem.sourceUrl && (
                  <a
                    href={selectedItem.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap transition"
                  >
                    <span>공식 원문 웹페이지 열기</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* 모달 본문 (수집 원문 전문 리더) */}
            <div className="flex-1 overflow-y-auto p-5 bg-white text-[#0f172a]">
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="p-4 rounded bg-[#f8fafc] border border-[#cbd5e1] text-xs leading-relaxed whitespace-pre-wrap font-sans select-text">
                  {formattedOriginalText}
                </div>

                {selectedItem.eligibilityDetail && (
                  <div className="p-3.5 rounded bg-[#f4efe4] border border-[#b5a894] text-xs space-y-1">
                    <div className="font-bold text-[#0f172a]">신청 자격 및 우대사항 상세</div>
                    <div className="whitespace-pre-line text-[#334155] leading-relaxed">
                      {selectedItem.eligibilityDetail}
                    </div>
                  </div>
                )}

                {selectedItem.actionPlan && (
                  <div className="p-3.5 rounded bg-[#ecfdf5] border border-[#a7f3d0] text-xs space-y-1">
                    <div className="font-bold text-[#065f46]">
                      (주)드래곤알피에이 실무 실행 체크리스트
                    </div>
                    <div className="whitespace-pre-line text-[#065f46] leading-relaxed">
                      {selectedItem.actionPlan}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-4 py-2.5 bg-[#e2dbcd] border-t border-[#b5a894] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-[#475569] font-mono truncate max-w-xl">
                출처 URL: {selectedItem.sourceUrl || "-"}
              </span>
              <button
                type="button"
                onClick={() => setOriginalModalOpen(false)}
                className="px-4 py-1.5 rounded bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달 1: Google AI 연동 및 당사 맞춤 프로필 설정 */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSettings}
            className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-lg shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#b5a894]">
              <div className="flex items-center gap-1.5 font-bold text-sm text-[#0f172a]">
                <Settings className="w-4 h-4 text-[#1d4ed8]" />
                <span>Google AI (Gemini) 연동 및 맞춤 기업 프로필 설정</span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="p-1 hover:bg-black/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded bg-[#f4efe4] border border-[#b5a894] text-[11px] text-[#334155] space-y-1">
                <div>
                  • <strong>실시간 뉴스·공고 RSS 수집</strong> 및{" "}
                  <strong>Google AI Ultra 프롬프트 브릿지(Gemini / NotebookLM)</strong>는 별도 API 키 없이도 즉시 작동합니다.
                </div>
                <div>
                  • Google AI Studio에서 발급한 <strong>Gemini API Key</strong>를 등록하시면 ERP 내에서 Gemini 2.5 Pro + Google 검색 그라운딩이 직접 실행되어 적합도 점수와 원문·요약을 자동 생성합니다.
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">
                  Google Gemini API Key{" "}
                  {settings.hasApiKey
                    ? `(현재 등록됨: ${settings.maskedApiKey})`
                    : "(선택사항)"}
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={
                    settings.hasApiKey
                      ? "변경할 경우에만 새 API Key 입력 (비워두면 기존 키 유지)"
                      : "AIzaSy... (Google AI Studio API Key 입력)"
                  }
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-1.5 text-xs font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">기본 분석 AI 모델</label>
                <select
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-1.5 text-xs font-bold"
                >
                  <option value="gemini-2.5-pro">
                    gemini-2.5-pro (심층 추론 · 사업계획서 분석 최적화)
                  </option>
                  <option value="gemini-2.5-flash">
                    gemini-2.5-flash (고속 탐색 · 대량 뉴스 요약)
                  </option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">
                  당사 기업 프로필 (AI 적합도 산출 기준)
                </label>
                <textarea
                  rows={3}
                  value={profileInput}
                  onChange={(e) => setProfileInput(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-1.5 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">
                  핵심 탐색 키워드 (쉼표 구분)
                </label>
                <textarea
                  rows={2}
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#b5a894]">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="px-3 py-1.5 rounded bg-[#dcd4c4] hover:bg-[#d0c6b4] text-xs font-bold border border-[#b5a894]"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold shadow"
              >
                설정 저장
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 모달 2: 수동 공고/뉴스/트렌드 등록 */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateItem}
            className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-lg shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#b5a894]">
              <div className="flex items-center gap-1.5 font-bold text-sm text-[#0f172a]">
                <Plus className="w-4 h-4 text-[#1d4ed8]" />
                <span>정부지원사업 · 뉴스 · 트렌드 직접 등록</span>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 hover:bg-black/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155]">분류</label>
                  <select
                    value={newForm.category}
                    onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5"
                  >
                    <option value="SUPPORT">정부지원·바우처</option>
                    <option value="PROCUREMENT">나라장터·공공입찰</option>
                    <option value="NEWS">정책·산업뉴스</option>
                    <option value="TREND">AI·렌탈 트렌드</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155]">주관기관 / 출처</label>
                  <input
                    type="text"
                    value={newForm.agency}
                    onChange={(e) => setNewForm({ ...newForm, agency: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">공고 / 뉴스 제목</label>
                <input
                  type="text"
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  placeholder="공고명 또는 뉴스 제목 입력"
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155]">지원규모 / 핵심지표</label>
                  <input
                    type="text"
                    value={newForm.supportAmount}
                    onChange={(e) =>
                      setNewForm({ ...newForm, supportAmount: e.target.value })
                    }
                    placeholder="예: 최대 6,000만원 (국비 70%)"
                    className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155]">마감일 (또는 상시)</label>
                  <input
                    type="text"
                    value={newForm.endDate}
                    onChange={(e) => setNewForm({ ...newForm, endDate: e.target.value })}
                    placeholder="예: 2026-12-15 또는 상시"
                    className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">원문 URL</label>
                <input
                  type="text"
                  value={newForm.sourceUrl}
                  onChange={(e) => setNewForm({ ...newForm, sourceUrl: e.target.value })}
                  placeholder="https://..."
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">핵심 요약</label>
                <textarea
                  rows={2}
                  value={newForm.summary}
                  onChange={(e) => setNewForm({ ...newForm, summary: e.target.value })}
                  placeholder="핵심 요약 내용 입력"
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155]">
                  수집 원문 전문 (공고문/기사 본문 전체 붙여넣기)
                </label>
                <textarea
                  rows={4}
                  value={newForm.originalContent}
                  onChange={(e) =>
                    setNewForm({ ...newForm, originalContent: e.target.value })
                  }
                  placeholder="공고문 원문이나 뉴스 기사 본문을 붙여넣으시면 원문 보기에서 언제든 열람 가능합니다."
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-2.5 py-1.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#b5a894]">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3 py-1.5 rounded bg-[#dcd4c4] hover:bg-[#d0c6b4] text-xs font-bold border border-[#b5a894]"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold shadow"
              >
                등록 저장
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
