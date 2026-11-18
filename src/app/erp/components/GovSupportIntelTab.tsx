"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  Search,
  RefreshCw,
  Bookmark,
  Plus,
  Settings,
  Sparkles,
  BookOpen,
  Download,
} from "lucide-react";
import { sortErpItems, formatErpNumber } from "@/lib/erpFormat";
import { SortableTh, useErpTableSort } from "./SortableTh";
import {
  AiIntelSettings,
  CATEGORY_META,
  GovSupportCreateForm,
  GovSupportItem,
  QUICK_TOPICS,
  STATUS_META,
} from "./gov-support/govSupportTypes";
import { GovSupportDossierPanel } from "./gov-support/GovSupportDossierPanel";

const GovSupportModals = dynamic(
  () => import("./gov-support/GovSupportModals").then((m) => m.GovSupportModals),
  { ssr: false }
);

export const GovSupportIntelTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
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
  const { sortKey, sortDir, handleSort } = useErpTableSort("fitScore", "desc");

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
  const [newForm, setNewForm] = useState<GovSupportCreateForm>({
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

  const renderSortTh = (
    label: string,
    colKey: string,
    align: "left" | "right" | "center" = "left"
  ) => (
    <SortableTh
      label={label}
      colKey={colKey}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={handleSort}
      align={align}
      className="py-2 px-2.5 hover:bg-[#d0c6b4]"
      iconClassName="w-3 h-3 text-[#1d4ed8]"
    />
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

  const handleSaveToObsidian = async (item: GovSupportItem) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const safeTitle = item.title.replace(/[\\/:*?"<>|]/g, " ").trim();
      const catLabel = (CATEGORY_META[item.category] || CATEGORY_META.SUPPORT).label;
      const mdContent = [
        `---`,
        `title: "${safeTitle}"`,
        `tags: [정부지원사업, ${catLabel.replace(/[·\s]/g, "_")}, 드래곤알피에이]`,
        `agency: "${item.agency || "-"}"`,
        `source_url: "${item.sourceUrl || ""}"`,
        `created: ${today}`,
        `---`,
        ``,
        `# ${item.title}`,
        ``,
        `- **분류**: ${catLabel}`,
        `- **주관기관 / 출처**: ${item.agency || "-"}`,
        `- **지원규모 / 핵심지표**: ${item.supportAmount || "-"}`,
        `- **접수기간 / 마감일**: ${item.startDate || "-"} ~ ${item.endDate || item.ddayLabel || "-"}`,
        `- **당사 적합도**: ${item.fitScore}%`,
        item.sourceUrl ? `- **원문 링크**: [원문 바로가기](${item.sourceUrl})` : "",
        ``,
        `## 1. 핵심 요약`,
        item.summary || "-",
        ``,
        `## 2. 신청 자격 및 우대 요건`,
        item.eligibilityDetail || "-",
        ``,
        `## 3. 권장 실행 플랜`,
        item.actionPlan || "-",
        ``,
        `## 4. 수집 원문 전문`,
        "```text",
        item.originalContent && item.originalContent.trim()
          ? item.originalContent.trim()
          : item.summary || "-",
        "```",
        ``,
        `- 상위 전략 노트: [[2026년 정부지원사업 및 R&D 핵심 전략]]`,
      ]
        .filter((line) => line !== undefined)
        .join("\n");

      const res = await fetch("/api/erp/obsidian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_NOTE",
          folderPath: "01_정부지원_전략",
          title: safeTitle,
          content: mdContent,
          tags: ["정부지원사업", catLabel.replace(/[·\s]/g, "_"), "드래곤알피에이"],
          sourceType: "GOV_SUPPORT_CLIP",
          authorName: currentUser?.name || "이정용 대표이사",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "옵시디언 노트 저장 실패");
      }
      showToast("선택한 공고/원문이 [옵시디언 노트 > 01_정부지원_전략] 폴더에 마크다운(.md)으로 저장되었습니다.");
    } catch (err: any) {
      showToast(err.message || "옵시디언 노트 저장 실패", "error");
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
        <GovSupportDossierPanel
          selectedItem={selectedItem}
          rightViewMode={rightViewMode}
          setRightViewMode={setRightViewMode}
          memoDraft={memoDraft}
          setMemoDraft={setMemoDraft}
          fetchingOriginal={fetchingOriginal}
          formattedOriginalText={formattedOriginalText}
          handleQuickUpdate={handleQuickUpdate}
          handleDeleteItem={handleDeleteItem}
          handleSaveToObsidian={handleSaveToObsidian}
          handleOpenOriginalModal={handleOpenOriginalModal}
          handleFetchOriginalContent={handleFetchOriginalContent}
          handleCopyUltraPrompt={handleCopyUltraPrompt}
          showToast={showToast}
        />
      </div>

      {(originalModalOpen || settingsModalOpen || createModalOpen) && (
        <GovSupportModals
          originalModalOpen={originalModalOpen}
          setOriginalModalOpen={setOriginalModalOpen}
          selectedItem={selectedItem}
          formattedOriginalText={formattedOriginalText}
          fetchingOriginal={fetchingOriginal}
          handleFetchOriginalContent={handleFetchOriginalContent}
          handleCopyUltraPrompt={handleCopyUltraPrompt}
          showToast={showToast}
          settingsModalOpen={settingsModalOpen}
          setSettingsModalOpen={setSettingsModalOpen}
          handleSaveSettings={handleSaveSettings}
          settings={settings}
          apiKeyInput={apiKeyInput}
          setApiKeyInput={setApiKeyInput}
          modelInput={modelInput}
          setModelInput={setModelInput}
          profileInput={profileInput}
          setProfileInput={setProfileInput}
          keywordsInput={keywordsInput}
          setKeywordsInput={setKeywordsInput}
          createModalOpen={createModalOpen}
          setCreateModalOpen={setCreateModalOpen}
          handleCreateItem={handleCreateItem}
          newForm={newForm}
          setNewForm={setNewForm}
        />
      )}
    </div>
  );
};
