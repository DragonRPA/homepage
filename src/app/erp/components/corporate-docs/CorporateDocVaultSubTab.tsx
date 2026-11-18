"use client";

import React, { useState, useMemo } from "react";
import {
  Check,
  Download,
  Eye,
  FileText,
  History,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { sortErpItems } from "@/lib/erpFormat";
import { matchHangulAny } from "@/lib/hangulSearch";
import { SortableTh, useErpTableSort } from "../SortableTh";
import {
  DOC_CATEGORIES,
  formatBytes,
  type CorporateDocItem,
  type DocVersionItem,
} from "./corporateDocTypes";

export interface CorporateDocVaultSubTabProps {
  documents: CorporateDocItem[];
  corpDocCount: number;
  indivDocCount: number;
  entityFilter: "ALL" | "CORP" | "INDIVIDUAL";
  setEntityFilter: React.Dispatch<React.SetStateAction<"ALL" | "CORP" | "INDIVIDUAL">>;
  categoryFilter: string;
  setCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
  selectedDocId: number | null;
  setSelectedDocId: React.Dispatch<React.SetStateAction<number | null>>;
  previewVer: DocVersionItem | null;
  setPreviewVer: React.Dispatch<React.SetStateAction<DocVersionItem | null>>;
  openNewVersionModal: (doc: CorporateDocItem) => void;
  fetchDocuments: () => Promise<void>;
}

export const CorporateDocVaultSubTab: React.FC<CorporateDocVaultSubTabProps> = ({
  documents,
  corpDocCount,
  indivDocCount,
  entityFilter,
  setEntityFilter,
  categoryFilter,
  setCategoryFilter,
  selectedDocId,
  setSelectedDocId,
  previewVer,
  setPreviewVer,
  openNewVersionModal,
  fetchDocuments,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 버전 수정(버전번호·라벨·시행일·메모) 인라인 상태
  const [editingVerId, setEditingVerId] = useState<number | null>(null);
  const [editVerNo, setEditVerNo] = useState<number>(1);
  const [editVerLabel, setEditVerLabel] = useState<string>("v1.0");
  const [editVerDate, setEditVerDate] = useState<string>("");
  const [editVerNote, setEditVerNote] = useState<string>("");
  const [savingVer, setSavingVer] = useState<boolean>(false);

  const docSort = useErpTableSort("", null);

  const filteredDocs = useMemo(() => {
    const getCatOrder = (cat: string) => {
      if (cat === "정관·등기·의사록") return 1;
      if (cat === "주주·주식·자본") return 2;
      if (cat === "세무·공과·인증") return 3;
      if (cat === "부동산·임대차") return 4;
      if (cat === "기타 중요문서") return 5;
      if (cat === "법인설립 원시서류 (보존용)") return 99;
      return 50;
    };

    const baseSorted = documents
      .filter((d) => {
        if (entityFilter !== "ALL" && d.entityType !== entityFilter) return false;
        if (categoryFilter !== "전체" && d.category !== categoryFilter) return false;
        if (searchQuery.trim()) {
          return matchHangulAny(
            [
              d.title,
              d.description,
              d.docCode,
              ...d.versions.flatMap((v) => [v.fileName, v.changeNote]),
            ],
            searchQuery
          );
        }
        return true;
      })
      .sort((a, b) => {
        const orderDiff = getCatOrder(a.category) - getCatOrder(b.category);
        if (orderDiff !== 0) return orderDiff;
        if (a.entityType !== b.entityType) return a.entityType === "CORP" ? -1 : 1;
        return a.id - b.id;
      });
    return sortErpItems(baseSorted, docSort.sortKey, docSort.sortDir);
  }, [documents, entityFilter, categoryFilter, searchQuery, docSort.sortKey, docSort.sortDir]);

  const selectedDoc = useMemo(
    () => documents.find((d) => d.id === selectedDocId) || filteredDocs[0] || null,
    [documents, selectedDocId, filteredDocs]
  );

  const handleDeleteVersion = async (ver: DocVersionItem) => {
    if (
      !window.confirm(
        `[${ver.versionLabel}] ${ver.fileName} 버전을 삭제하시겠습니까?\n(삭제 후 남은 버전들의 번호는 v1.0부터 순서대로 자동 정렬됩니다.)`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/erp/corporate-docs?versionId=${ver.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (previewVer?.id === ver.id) setPreviewVer(null);
        await fetchDocuments();
      } else {
        alert(data.error || "삭제 실패");
      }
    } catch (err: any) {
      alert("삭제 오류: " + err.message);
    }
  };

  const startEditingVersion = (ver: DocVersionItem) => {
    setEditingVerId(ver.id);
    setEditVerNo(ver.versionNo);
    setEditVerLabel(ver.versionLabel || `v${ver.versionNo}.0`);
    setEditVerDate(ver.effectiveDate || "");
    setEditVerNote(ver.changeNote || "");
  };

  const handleSaveVersionEdit = async (verId: number) => {
    setSavingVer(true);
    try {
      const res = await fetch("/api/erp/corporate-docs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_VERSION",
          versionId: verId,
          versionNo: Number(editVerNo),
          versionLabel: editVerLabel.trim() || `v${editVerNo}.0`,
          effectiveDate: editVerDate.trim(),
          changeNote: editVerNote.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "버전 수정 실패");
      }
      setEditingVerId(null);
      await fetchDocuments();
    } catch (err: any) {
      alert("버전 수정 오류: " + err.message);
    } finally {
      setSavingVer(false);
    }
  };

  const handleResequenceVersions = async (docId: number) => {
    try {
      const res = await fetch("/api/erp/corporate-docs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESEQUENCE_DOCUMENT",
          documentId: docId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "버전 번호 재정렬 실패");
      }
      setEditingVerId(null);
      await fetchDocuments();
    } catch (err: any) {
      alert("버전 번호 재정렬 오류: " + err.message);
    }
  };

  return (
    <>
      {/* 사업자 구분 + 문서 분류 필터 및 검색 바 */}
      <div className="px-3 py-2 bg-[#e8e1d3] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* 사업자 필터 */}
          <div className="flex items-center rounded border border-[#b5a894] overflow-hidden text-xs font-bold">
            <button
              type="button"
              onClick={() => setEntityFilter("ALL")}
              className={`px-2.5 py-1 whitespace-nowrap ${
                entityFilter === "ALL"
                  ? "bg-[#0f172a] text-white"
                  : "bg-[#f4efe4] text-[#0f172a] hover:bg-[#dcd4c4]"
              }`}
            >
              전체 사업장 ({documents.length})
            </button>
            <button
              type="button"
              onClick={() => setEntityFilter("CORP")}
              className={`px-2.5 py-1 border-l border-[#b5a894] whitespace-nowrap ${
                entityFilter === "CORP"
                  ? "bg-[#1d4ed8] text-white"
                  : "bg-[#f4efe4] text-[#1e40af] hover:bg-[#dcd4c4]"
              }`}
            >
              법인사업장 ({corpDocCount})
            </button>
            <button
              type="button"
              onClick={() => setEntityFilter("INDIVIDUAL")}
              className={`px-2.5 py-1 border-l border-[#b5a894] whitespace-nowrap ${
                entityFilter === "INDIVIDUAL"
                  ? "bg-[#b45309] text-white"
                  : "bg-[#f4efe4] text-[#92400e] hover:bg-[#dcd4c4]"
              }`}
            >
              개인사업장 ({indivDocCount})
            </button>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex flex-wrap items-center gap-1">
            {DOC_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded text-xs font-bold border whitespace-nowrap transition ${
                  categoryFilter === cat
                    ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                    : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#475569]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="문서명, 파일명, 개정이력 검색"
            className="bg-[#f4efe4] border border-[#b5a894] text-xs pl-8 pr-3 py-1.5 rounded w-full focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700"
          />
        </div>
      </div>

      {/* 좌측 마스터 목록 + 우측 버전 히스토리 및 미리보기 */}
      <div className="flex-1 md:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 p-2.5 md:p-3">
        {/* 좌측: 문서 마스터 테이블 (7컬럼) */}
        <div className="lg:col-span-7 bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
            <span>중요문서 마스터 목록 ({filteredDocs.length}건)</span>
            <span className="text-[11px] font-normal text-[#475569] dark:text-slate-400">
              행 클릭 시 우측에 버전 히스토리 타임라인과 PDF 미리보기가 표시됩니다
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#dcd4c4] text-[#0f172a] font-bold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-2.5 whitespace-nowrap">관리</th>
                  <SortableTh label="구분" colKey="entityType" sortKey={docSort.sortKey} sortDir={docSort.sortDir} onSort={docSort.handleSort} className="py-2 px-2 font-bold" />
                  <SortableTh label="분류" colKey="category" sortKey={docSort.sortKey} sortDir={docSort.sortDir} onSort={docSort.handleSort} className="py-2 px-2 font-bold" />
                  <SortableTh label="문서명" colKey="title" sortKey={docSort.sortKey} sortDir={docSort.sortDir} onSort={docSort.handleSort} className="py-2 px-2.5 font-bold" />
                  <SortableTh label="현재버전" colKey="currentVersion" sortKey={docSort.sortKey} sortDir={docSort.sortDir} onSort={docSort.handleSort} align="center" className="py-2 px-2 font-bold" />
                  <SortableTh label="최신 시행/발급일" colKey="latestVersion.effectiveDate" sortKey={docSort.sortKey} sortDir={docSort.sortDir} onSort={docSort.handleSort} className="py-2 px-2 font-bold" />
                  <SortableTh label="최신 파일명" colKey="latestVersion.fileName" sortKey={docSort.sortKey} sortDir={docSort.sortDir} onSort={docSort.handleSort} className="py-2 px-2.5 font-bold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#475569]">
                      조건에 해당하는 중요문서가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => {
                    const isSelected = selectedDoc?.id === doc.id;
                    const latest = doc.latestVersion;
                    const isIncorporationArchive =
                      doc.category === "법인설립 원시서류 (보존용)";
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => {
                          setSelectedDocId(doc.id);
                          if (latest && latest.fileExt === "pdf") {
                            setPreviewVer(latest);
                          } else {
                            setPreviewVer(null);
                          }
                        }}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? "bg-[#dbeafe]/75 dark:bg-blue-950/50 font-semibold"
                            : isIncorporationArchive
                            ? "bg-[#e8e2d6]/60 hover:bg-[#e2dbcd] dark:bg-slate-900/50 dark:hover:bg-slate-800/40"
                            : "hover:bg-[#f4efe4] dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td
                          className="py-2 px-2.5 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            {latest && (
                              <a
                                href={`${latest.vaultUrl}&download=1`}
                                className="px-2 py-1 rounded bg-[#047857] hover:bg-[#065f46] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                                title="최신본 다운로드"
                              >
                                <Download className="w-3 h-3" />
                                <span>다운로드</span>
                              </a>
                            )}
                            {isIncorporationArchive ? (
                              <span
                                className="px-2 py-1 rounded bg-[#cbd5e1] text-[#334155] border border-[#94a3b8] text-[10.5px] font-bold inline-flex items-center whitespace-nowrap"
                                title="법인 설립 시 작성된 원시서류로 이후 수정·변경이 필요 없는 영구 보존 문서입니다."
                              >
                                설립보존본(변경불필요)
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openNewVersionModal(doc)}
                                className="px-2 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                                title="개정 버전 업로드"
                              >
                                <Upload className="w-3 h-3" />
                                <span>+버전추가</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              doc.entityType === "INDIVIDUAL"
                                ? "bg-[#fef3c7] text-[#92400e] border-[#fde68a]"
                                : "bg-[#dbeafe] text-[#1e40af] border-[#93c5fd]"
                            }`}
                          >
                            {doc.entityType === "INDIVIDUAL" ? "개인" : "법인"}
                          </span>
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              doc.category === "정관·등기·의사록"
                                ? "bg-[#dbeafe] text-[#1e3a8a] border-[#93c5fd]"
                                : isIncorporationArchive
                                ? "bg-[#e2e8f0] text-[#475569] border-[#cbd5e1]"
                                : "bg-[#e2dbcd] text-[#0f172a] border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {doc.category}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <div className="font-bold text-[#0f172a] dark:text-slate-100">
                            {doc.title}
                          </div>
                          {doc.description && (
                            <div className="text-[11px] text-[#475569] dark:text-slate-400 truncate max-w-[240px]">
                              {doc.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-extrabold ${
                              doc.versions.length > 1
                                ? "bg-[#fef3c7] text-[#92400e] border border-[#f59e0b]"
                                : "bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd]"
                            }`}
                          >
                            v{doc.currentVersion}.0 ({doc.versions.length}개 이력)
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono whitespace-nowrap">
                          {latest?.effectiveDate || "-"}
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {latest ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-[#e2e8f0] text-[#334155] font-bold">
                                {latest.fileExt}
                              </span>
                              <span className="truncate max-w-[160px]">{latest.fileName}</span>
                            </div>
                          ) : (
                            "-"
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

        {/* 우측: 선택 문서의 버전 히스토리 타임라인 + 인라인 PDF 열람 (5컬럼) */}
        <div className="lg:col-span-5 flex flex-col gap-3 overflow-hidden">
          {selectedDoc ? (
            <>
              {/* 버전 히스토리 카드 */}
              <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 shrink-0">
                <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold min-w-0">
                    <History className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400 shrink-0" />
                    <span className="truncate">{selectedDoc.title} — 버전 히스토리</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResequenceVersions(selectedDoc.id)}
                      className="px-2 py-1 rounded bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#0f172a] border border-[#94a3b8] text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                      title="중간 버전 삭제 후 남은 버전들의 번호를 시행일 순으로 v1.0, v2.0... 순번에 맞게 낮춰 자동 정렬합니다"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>버전순번 자동정렬(v1~)</span>
                    </button>
                    {selectedDoc.category === "법인설립 원시서류 (보존용)" ? (
                      <span className="px-2.5 py-1 rounded bg-[#cbd5e1] text-[#334155] border border-[#94a3b8] text-[11px] font-bold shrink-0 whitespace-nowrap">
                        법인설립 원시서류 (영구보존)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openNewVersionModal(selectedDoc)}
                        className="px-2.5 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>신규 개정본(v{selectedDoc.currentVersion + 1}.0) 업로드</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-2.5 space-y-2 max-h-[280px] overflow-y-auto">
                  {selectedDoc.versions.map((ver, idx) => {
                    const isLatest = idx === 0;
                    const isPreviewing = previewVer?.id === ver.id;
                    const isEditing = editingVerId === ver.id;
                    return (
                      <div
                        key={ver.id}
                        className={`p-2.5 rounded border text-xs flex flex-col gap-1.5 ${
                          isPreviewing
                            ? "bg-[#dbeafe]/60 border-[#1d4ed8] dark:bg-blue-950/40 dark:border-blue-500"
                            : "bg-[#f4efe4] border-[#c4b6a0] dark:bg-slate-950 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-mono font-extrabold shrink-0 ${
                                isLatest
                                  ? "bg-[#047857] text-white"
                                  : "bg-[#cbd5e1] text-[#1e293b]"
                              }`}
                            >
                              {ver.versionLabel} {isLatest ? "(최신본)" : "(구버전 보존)"}
                            </span>
                            <span className="font-mono text-[11px] text-[#475569] dark:text-slate-400 shrink-0">
                              시행/발급일: {ver.effectiveDate || "-"}
                            </span>
                            <span className="font-mono text-[10px] text-[#64748b] shrink-0">
                              ({formatBytes(ver.fileSize)})
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                isEditing ? setEditingVerId(null) : startEditingVersion(ver)
                              }
                              className={`px-2 py-1 rounded text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap border ${
                                isEditing
                                  ? "bg-[#fef3c7] text-[#92400e] border-[#f59e0b]"
                                  : "bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#0f172a] border-[#94a3b8]"
                              }`}
                              title="버전 번호(숫자), 시행일, 메모 수정"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>{isEditing ? "수정취소" : "버전수정"}</span>
                            </button>
                            {ver.fileExt === "pdf" && (
                              <button
                                type="button"
                                onClick={() => setPreviewVer(ver)}
                                className="px-2 py-1 rounded bg-[#334155] hover:bg-[#1e293b] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                              >
                                <Eye className="w-3 h-3" />
                                <span>열람</span>
                              </button>
                            )}
                            <a
                              href={`${ver.vaultUrl}&download=1`}
                              className="px-2 py-1 rounded bg-[#047857] hover:bg-[#065f46] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <Download className="w-3 h-3" />
                              <span>다운로드</span>
                            </a>
                            {selectedDoc.versions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteVersion(ver)}
                                className="p-1 rounded bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] border border-[#fca5a5]"
                                title="이 버전 삭제 (삭제 시 남은 버전 번호 자동 정렬)"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div className="p-2 rounded bg-[#ebe5d8] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                            <div className="sm:col-span-2 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-[#334155] whitespace-nowrap">
                                버전 숫자
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={editVerNo}
                                onChange={(e) => {
                                  const n = Math.max(1, Number(e.target.value || 1));
                                  setEditVerNo(n);
                                  setEditVerLabel(`v${n}.0`);
                                }}
                                className="bg-white border border-[#94a3b8] rounded px-2 py-1 text-xs font-mono font-bold text-[#0f172a]"
                              />
                            </div>
                            <div className="sm:col-span-2 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-[#334155] whitespace-nowrap">
                                버전 표기
                              </label>
                              <input
                                type="text"
                                value={editVerLabel}
                                onChange={(e) => setEditVerLabel(e.target.value)}
                                className="bg-white border border-[#94a3b8] rounded px-2 py-1 text-xs font-mono font-bold text-[#0f172a]"
                              />
                            </div>
                            <div className="sm:col-span-3 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-[#334155] whitespace-nowrap">
                                시행/발급일
                              </label>
                              <input
                                type="date"
                                value={editVerDate}
                                onChange={(e) => setEditVerDate(e.target.value)}
                                className="bg-white border border-[#94a3b8] rounded px-2 py-1 text-xs font-mono text-[#0f172a]"
                              />
                            </div>
                            <div className="sm:col-span-3 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-[#334155] whitespace-nowrap">
                                개정/보관 메모
                              </label>
                              <input
                                type="text"
                                value={editVerNote}
                                onChange={(e) => setEditVerNote(e.target.value)}
                                className="bg-white border border-[#94a3b8] rounded px-2 py-1 text-xs text-[#0f172a]"
                              />
                            </div>
                            <div className="sm:col-span-2 flex items-center justify-end gap-1">
                              <button
                                type="button"
                                disabled={savingVer}
                                onClick={() => handleSaveVersionEdit(ver.id)}
                                className="w-full px-2 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>저장</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-bold text-[#0f172a] dark:text-slate-200 truncate">
                            파일: {ver.fileName}
                          </span>
                          <span className="text-[#475569] dark:text-slate-400 shrink-0">
                            등록자: {ver.uploadedBy}
                          </span>
                        </div>

                        {ver.changeNote && !isEditing && (
                          <div className="text-[11px] text-[#334155] dark:text-slate-300 bg-[#ebe5d8] dark:bg-slate-900 px-2 py-1 rounded border border-[#d5cbb8] dark:border-slate-800">
                            개정/보관 메모: {ver.changeNote}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 하단 PDF 인라인 미리보기 */}
              <div className="flex-1 bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden flex flex-col min-h-[340px] dark:bg-slate-900 dark:border-slate-800">
                <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="w-4 h-4 text-[#047857]" />
                    <span className="truncate">
                      {previewVer
                        ? `[${previewVer.versionLabel}] ${previewVer.fileName} 미리보기`
                        : "문서 미리보기"}
                    </span>
                  </div>
                  {previewVer && (
                    <a
                      href={previewVer.vaultUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#1d4ed8] hover:underline whitespace-nowrap"
                    >
                      새 창에서 크게 열기 ↗
                    </a>
                  )}
                </div>

                <div className="flex-1 bg-[#f4efe4] dark:bg-slate-950 flex items-center justify-center">
                  {previewVer && previewVer.fileExt === "pdf" ? (
                    <iframe
                      src={previewVer.vaultUrl}
                      title={previewVer.fileName}
                      className="w-full h-full min-h-[320px] border-0"
                    />
                  ) : (
                    <div className="p-6 text-center text-xs text-[#475569] space-y-2">
                      <p>
                        {selectedDoc.latestVersion?.fileExt === "docx"
                          ? "Word(.docx) 문서는 상단 버전 히스토리에서 [다운로드] 버튼을 눌러 열람·편집하거나, PDF 버전을 [열람] 버튼으로 바로 확인하실 수 있습니다."
                          : "위 버전 히스토리에서 PDF 버전의 [열람] 버튼을 클릭하면 이곳에 즉시 표시됩니다."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#ebe5d8] border border-[#b5a894] rounded p-8 text-center text-xs text-[#475569]">
              좌측 목록에서 문서를 선택해 주십시오.
            </div>
          )}
        </div>
      </div>
    </>
  );
};
