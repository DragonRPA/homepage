"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Upload,
  Download,
  Eye,
  History,
  Plus,
  Trash2,
  Building2,
  RefreshCw,
  Search,
  FolderArchive,
  X,
} from "lucide-react";
import { BUSINESS_ENTITIES } from "@/lib/businessEntities";

interface DocVersionItem {
  id: number;
  documentId: number;
  versionNo: number;
  versionLabel: string;
  effectiveDate: string | null;
  fileName: string;
  fileExt: string;
  mimeType: string;
  fileSize: number;
  r2Key: string;
  vaultUrl: string;
  changeNote: string;
  uploadedBy: string;
  createdAt: string;
}

interface CorporateDocItem {
  id: number;
  docCode: string;
  entityType: "CORP" | "INDIVIDUAL";
  category: string;
  title: string;
  description: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  latestVersion: DocVersionItem | null;
  versions: DocVersionItem[];
}

interface CorporateDocumentTabProps {
  currentUser?: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
}

const DOC_CATEGORIES = [
  "전체",
  "설립·정관·등기",
  "주주·주식·자본",
  "세무·공과·인증",
  "부동산·임대차",
  "기타 중요문서",
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const CorporateDocumentTab: React.FC<CorporateDocumentTabProps> = ({
  currentUser,
  selectedEntity = "ALL",
}) => {
  const [documents, setDocuments] = useState<CorporateDocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("전체");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [previewVer, setPreviewVer] = useState<DocVersionItem | null>(null);

  // 신규 문서 등록 / 개정 버전 추가 모달 상태
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTargetDoc, setUploadTargetDoc] = useState<CorporateDocItem | null>(null);
  const [formCategory, setFormCategory] = useState<string>("설립·정관·등기");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formEffectiveDate, setFormEffectiveDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [formChangeNote, setFormChangeNote] = useState<string>("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/corporate-docs", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
        if (data.documents.length > 0 && !selectedDocId) {
          const first = data.documents[0];
          setSelectedDocId(first.id);
          if (first.latestVersion && first.latestVersion.fileExt === "pdf") {
            setPreviewVer(first.latestVersion);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load corporate documents:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (categoryFilter !== "전체" && d.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const inTitle = d.title.toLowerCase().includes(q);
        const inDesc = (d.description || "").toLowerCase().includes(q);
        const inFiles = d.versions.some(
          (v) =>
            v.fileName.toLowerCase().includes(q) ||
            (v.changeNote || "").toLowerCase().includes(q)
        );
        return inTitle || inDesc || inFiles;
      }
      return true;
    });
  }, [documents, categoryFilter, searchQuery]);

  const selectedDoc = useMemo(
    () => documents.find((d) => d.id === selectedDocId) || filteredDocs[0] || null,
    [documents, selectedDocId, filteredDocs]
  );

  const openNewDocModal = () => {
    setUploadTargetDoc(null);
    setFormCategory("설립·정관·등기");
    setFormTitle("");
    setFormDesc("");
    setFormEffectiveDate(new Date().toISOString().slice(0, 10));
    setFormChangeNote("초판 제정·등록");
    setFormFile(null);
    setShowUploadModal(true);
  };

  const openNewVersionModal = (doc: CorporateDocItem) => {
    setUploadTargetDoc(doc);
    setFormCategory(doc.category);
    setFormTitle(doc.title);
    setFormDesc(doc.description || "");
    setFormEffectiveDate(new Date().toISOString().slice(0, 10));
    setFormChangeNote(`v${doc.currentVersion + 1}.0 개정본 등록`);
    setFormFile(null);
    setShowUploadModal(true);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFile) {
      alert("업로드할 문서 파일을 선택해 주십시오.");
      return;
    }
    if (!uploadTargetDoc && !formTitle.trim()) {
      alert("문서명을 입력해 주십시오.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", formFile);
      if (uploadTargetDoc) {
        fd.append("documentId", String(uploadTargetDoc.id));
      }
      fd.append("entityType", "CORP");
      fd.append("category", formCategory);
      fd.append("title", formTitle.trim());
      fd.append("description", formDesc.trim());
      fd.append("effectiveDate", formEffectiveDate);
      fd.append("changeNote", formChangeNote.trim());
      fd.append("uploadedBy", currentUser?.name || "이정용");

      const res = await fetch("/api/erp/corporate-docs", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "업로드 실패");
      }
      setShowUploadModal(false);
      await fetchDocuments();
      if (data.documentId) {
        setSelectedDocId(Number(data.documentId));
      }
    } catch (err: any) {
      alert("문서 업로드 오류: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVersion = async (ver: DocVersionItem) => {
    if (
      !window.confirm(
        `[${ver.versionLabel}] ${ver.fileName} 버전을 삭제하시겠습니까?`
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

  const corp = BUSINESS_ENTITIES.CORP;
  const indiv = BUSINESS_ENTITIES.INDIVIDUAL;

  return (
    <div className="flex flex-col min-h-full md:h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 font-sans">
      {/* 1. 상단 법인·개인 사업자 기본 등기/등록 제원 요약 바 */}
      <div className="p-2.5 md:p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
            <h2 className="text-sm font-extrabold whitespace-nowrap">
              법인 중요문서 보관함 (설립·정관·등기 버전 히스토리)
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd]">
              총 {documents.length}개 문서 마스터 /{" "}
              {documents.reduce((acc, d) => acc + d.versions.length, 0)}개 버전 보관 중
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDocuments}
              disabled={loading}
              className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={openNewDocModal}
              className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>신규 중요문서 등록</span>
            </button>
          </div>
        </div>

        {/* 법인 / 개인 기본 설립 제원 카드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd] shrink-0">
                법인본점
              </span>
              <span className="font-bold whitespace-nowrap">{corp.corpName}</span>
              <span className="font-mono text-[11px] text-[#475569] dark:text-slate-400 whitespace-nowrap">
                사업자 {corp.bizNum} | 법인등록 {corp.corpRegNum}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] font-bold whitespace-nowrap">
                납입자본금 ₩{corp.capitalStock.toLocaleString()} (1주 ₩{corp.parValue} × {corp.totalShares?.toLocaleString()}주)
              </span>
              <span className="text-[#334155] dark:text-slate-400 truncate max-w-[340px]">
                {corp.address}
              </span>
            </div>
          </div>

          <div className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a] shrink-0">
                개인사업장
              </span>
              <span className="font-bold whitespace-nowrap">{indiv.corpName}</span>
              <span className="font-mono text-[11px] text-[#475569] dark:text-slate-400 whitespace-nowrap">
                사업자 {indiv.bizNum} | 개업일 {indiv.openDate}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="text-[#334155] dark:text-slate-300 font-semibold whitespace-nowrap">
                주소: {indiv.address}
              </span>
            </div>
          </div>
        </div>

        {/* 필터 및 검색 바 */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
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
      </div>

      {/* 2. 본문: 좌측 문서 마스터 목록 + 우측 버전 히스토리 및 미리보기 */}
      <div className="flex-1 md:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 p-2.5 md:p-3">
        {/* 좌측: 문서 마스터 테이블 (7컬럼) */}
        <div className="lg:col-span-7 bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
            <span>중요문서 목록 ({filteredDocs.length}건)</span>
            <span className="text-[11px] font-normal text-[#475569] dark:text-slate-400">
              행 클릭 시 우측에 전체 버전 히스토리 및 열람 창이 표시됩니다
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#dcd4c4] text-[#0f172a] font-bold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-2.5 whitespace-nowrap">관리</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">분류</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">문서명</th>
                  <th className="py-2 px-2.5 text-center whitespace-nowrap">현재버전</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">최신 시행/작성일</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">최신 파일명</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#475569]">
                      등록된 중요문서가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => {
                    const isSelected = selectedDoc?.id === doc.id;
                    const latest = doc.latestVersion;
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
                            <button
                              type="button"
                              onClick={() => openNewVersionModal(doc)}
                              className="px-2 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                              title="개정 버전 업로드"
                            >
                              <Upload className="w-3 h-3" />
                              <span>+버전추가</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e2dbcd] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700">
                            {doc.category}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <div className="font-bold text-[#0f172a] dark:text-slate-100">
                            {doc.title}
                          </div>
                          {doc.description && (
                            <div className="text-[11px] text-[#475569] dark:text-slate-400 truncate max-w-[260px]">
                              {doc.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
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
                        <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                          {latest?.effectiveDate || "-"}
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {latest ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-[#e2e8f0] text-[#334155] font-bold">
                                {latest.fileExt}
                              </span>
                              <span className="truncate max-w-[180px]">{latest.fileName}</span>
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
                  <button
                    type="button"
                    onClick={() => openNewVersionModal(selectedDoc)}
                    className="px-2.5 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>신규 개정본(v{selectedDoc.currentVersion + 1}.0) 업로드</span>
                  </button>
                </div>

                <div className="p-2.5 space-y-2 max-h-[260px] overflow-y-auto">
                  {selectedDoc.versions.map((ver, idx) => {
                    const isLatest = idx === 0;
                    const isPreviewing = previewVer?.id === ver.id;
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
                              시행/작성일: {ver.effectiveDate || "-"}
                            </span>
                            <span className="font-mono text-[10px] text-[#64748b] shrink-0">
                              ({formatBytes(ver.fileSize)})
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
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
                                title="이 버전 삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-bold text-[#0f172a] dark:text-slate-200 truncate">
                            파일: {ver.fileName}
                          </span>
                          <span className="text-[#475569] dark:text-slate-400 shrink-0">
                            등록자: {ver.uploadedBy}
                          </span>
                        </div>

                        {ver.changeNote && (
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

      {/* 3. 신규 문서 / 개정 버전 업로드 모달 */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] dark:bg-slate-900 border-2 border-[#b5a894] dark:border-slate-700 rounded-lg shadow-xl w-full max-w-md overflow-hidden text-xs">
            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-950 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between font-bold">
              <span>
                {uploadTargetDoc
                  ? `[${uploadTargetDoc.title}] 신규 개정 버전(v${uploadTargetDoc.currentVersion + 1}.0) 업로드`
                  : "신규 중요문서 마스터 등록"}
              </span>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded hover:bg-black/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-4 space-y-3">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155] dark:text-slate-300">문서 분류</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-semibold"
                >
                  {DOC_CATEGORIES.filter((c) => c !== "전체").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155] dark:text-slate-300">문서명</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="예: 정관, 주주명부, 등기부등본, 임대차계약서"
                  required
                  className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155] dark:text-slate-300">문서 설명</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="문서 개요 또는 관리 목적"
                  className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155] dark:text-slate-300">
                    시행일 / 작성일
                  </label>
                  <input
                    type="date"
                    value={formEffectiveDate}
                    onChange={(e) => setFormEffectiveDate(e.target.value)}
                    className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155] dark:text-slate-300">부여 버전</label>
                  <input
                    type="text"
                    readOnly
                    value={
                      uploadTargetDoc
                        ? `v${uploadTargetDoc.currentVersion + 1}.0`
                        : "v1.0"
                    }
                    className="bg-[#dcd4c4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155] dark:text-slate-300">
                  제·개정 사유 및 버전 메모
                </label>
                <input
                  type="text"
                  value={formChangeNote}
                  onChange={(e) => setFormChangeNote(e.target.value)}
                  placeholder="예: 2026.09.14 사업목적 추가에 따른 정관 개정본"
                  className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155] dark:text-slate-300">
                  파일 선택 (PDF, DOCX, XLSX, 이미지 등)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                  required
                  className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded border border-[#b5a894] bg-[#dcd4c4] font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold disabled:opacity-50"
                >
                  {submitting ? "업로드 중..." : "버전 등록 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
