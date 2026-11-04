"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderPlus,
  FolderOpen,
  Upload,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Lock,
  Unlock,
  RefreshCw,
  FileText,
  Download,
  Search,
  Calendar,
  HardDrive,
  Edit3,
  X,
  Eye,
  Power,
} from "lucide-react";

interface ShareFileRecord {
  id: number;
  folderId: number;
  fileName: string;
  r2Key: string;
  fileSize: number;
  contentType: string;
  downloadCount: number;
  uploadedBy: string;
  createdAt: string;
}

interface ShareFolderRecord {
  id: number;
  shareCode: string;
  title: string;
  description: string | null;
  hasPassword: boolean;
  expiresAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  totalSize: number;
  totalDownloads: number;
  files: ShareFileRecord[];
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return String(iso).slice(0, 16);
  }
}

export const CloudShareTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const [folders, setFolders] = useState<ShareFolderRecord[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [folderSearch, setFolderSearch] = useState("");
  const [fileSearch, setFileSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // 신규 폴더 생성 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");

  // 폴더 설정 수정 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editClearPassword, setEditClearPassword] = useState(false);
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // 알림 및 에러 모달 상태
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/cloud-shares", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "공유 폴더 목록 조회 실패");
      }
      const list: ShareFolderRecord[] = data.folders || [];
      setFolders(list);
      setSelectedFolderId((prev) => {
        if (prev && list.some((f) => f.id === prev)) return prev;
        return list.length > 0 ? list[0].id : null;
      });
    } catch (err: any) {
      setErrorModalMsg(err.message || "공유 폴더 목록 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) || null;

  const getPublicShareUrl = (shareCode: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/share/${shareCode}`;
    }
    return `https://www.dragonrpa.co.kr/share/${shareCode}`;
  };

  const handleCopyShareLink = async (shareCode: string) => {
    const url = getPublicShareLinkText(shareCode);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(shareCode);
      showToast("공유 폴더 링크가 클립보드에 복사되었습니다.");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      setErrorModalMsg("클립보드 복사에 실패했습니다: " + url);
    }
  };

  const getPublicShareLinkText = (shareCode: string) => getPublicShareUrl(shareCode);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setErrorModalMsg("공유 폴더명을 입력해 주십시오.");
      return;
    }
    try {
      const res = await fetch("/api/erp/cloud-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          password: newPassword.trim() || null,
          expiresAt: newExpiresAt || null,
          createdBy: currentUser?.name || "관리자",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "공유 폴더 생성 실패");
      }
      setShowCreateModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewPassword("");
      setNewExpiresAt("");
      showToast("공유 폴더가 생성되었습니다.");
      await fetchFolders();
      if (data.folder?.id) {
        setSelectedFolderId(Number(data.folder.id));
      }
    } catch (err: any) {
      setErrorModalMsg(err.message);
    }
  };

  const openEditModal = (folder: ShareFolderRecord) => {
    setEditTitle(folder.title);
    setEditDesc(folder.description || "");
    setEditPassword("");
    setEditClearPassword(false);
    setEditExpiresAt(folder.expiresAt ? new Date(folder.expiresAt).toISOString().slice(0, 10) : "");
    setEditIsActive(folder.isActive);
    setShowEditModal(true);
  };

  const handleUpdateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolder) return;
    if (!editTitle.trim()) {
      setErrorModalMsg("공유 폴더명을 입력해 주십시오.");
      return;
    }
    try {
      const res = await fetch("/api/erp/cloud-shares", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedFolder.id,
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          password: editPassword.trim() || null,
          clearPassword: editClearPassword,
          expiresAt: editExpiresAt || null,
          isActive: editIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "공유 폴더 수정 실패");
      }
      setShowEditModal(false);
      showToast("공유 폴더 설정이 저장되었습니다.");
      await fetchFolders();
    } catch (err: any) {
      setErrorModalMsg(err.message);
    }
  };

  const handleToggleFolderActive = async (folder: ShareFolderRecord) => {
    try {
      const res = await fetch("/api/erp/cloud-shares", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: folder.id,
          isActive: !folder.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "상태 변경 실패");
      }
      showToast(folder.isActive ? "공유 링크가 비활성화되었습니다." : "공유 링크가 활성화되었습니다.");
      await fetchFolders();
    } catch (err: any) {
      setErrorModalMsg(err.message);
    }
  };

  const handleDeleteFolder = async (folder: ShareFolderRecord) => {
    if (!window.confirm(`[${folder.title}] 폴더와 내부의 모든 파일(${folder.fileCount}개)을 영구 삭제하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/erp/cloud-shares?id=${folder.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "폴더 삭제 실패");
      }
      showToast("공유 폴더 및 R2 파일이 삭제되었습니다.");
      await fetchFolders();
    } catch (err: any) {
      setErrorModalMsg(err.message);
    }
  };

  const uploadFilesToSelectedFolder = async (fileList: FileList | File[]) => {
    if (!selectedFolder) {
      setErrorModalMsg("먼저 좌측 목록에서 업로드할 공유 폴더를 선택하거나 새로 생성해 주십시오.");
      return;
    }
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        setUploadProgressText(`업로드 중 (${i + 1}/${filesArray.length}): ${file.name}`);

        const formData = new FormData();
        formData.append("folderId", String(selectedFolder.id));
        formData.append("uploadedBy", currentUser?.name || "관리자");
        formData.append("file", file);

        const res = await fetch("/api/erp/cloud-shares/files", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `${file.name} 업로드 실패`);
        }
      }
      showToast(`${filesArray.length}개 파일 업로드가 완료되었습니다.`);
      await fetchFolders();
    } catch (err: any) {
      setErrorModalMsg(err.message || "파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      setUploadProgressText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteFile = async (file: ShareFileRecord) => {
    if (!window.confirm(`[${file.fileName}] 파일을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/erp/cloud-shares/files?fileId=${file.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "파일 삭제 실패");
      }
      showToast("파일이 삭제되었습니다.");
      await fetchFolders();
    } catch (err: any) {
      setErrorModalMsg(err.message);
    }
  };

  const filteredFolders = folders.filter((f) => {
    if (!folderSearch.trim()) return true;
    const q = folderSearch.trim().toLowerCase();
    return (
      f.title.toLowerCase().includes(q) ||
      f.shareCode.toLowerCase().includes(q) ||
      (f.description || "").toLowerCase().includes(q)
    );
  });

  const filteredFiles = (selectedFolder?.files || []).filter((f) => {
    if (!fileSearch.trim()) return true;
    return f.fileName.toLowerCase().includes(fileSearch.trim().toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 overflow-hidden font-sans">
      {/* 토스트 알림 */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-xs font-bold border ${
            toast.type === "success"
              ? "bg-[#ecfdf5] border-[#047857] text-[#065f46]"
              : "bg-[#fef2f2] border-[#dc2626] text-[#b91c1c]"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* 에러 모달 */}
      {errorModalMsg && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#f4efe4] border-2 border-[#dc2626] rounded p-5 max-w-md w-full shadow-2xl">
            <div className="text-sm font-bold text-[#991b1b] mb-2">오류 발생</div>
            <p className="text-xs text-[#0f172a] whitespace-pre-wrap mb-4">{errorModalMsg}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setErrorModalMsg(null)}
                className="px-4 py-1.5 bg-[#dc2626] text-white text-xs font-bold rounded cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상단 Z-패턴 액션 바: 좌상단 검색/필터 + 우상단 폴더 생성/파일 업로드 */}
      <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-end justify-between gap-3 shrink-0">
        {/* 좌상단: 폴더 검색 및 현황 */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400">
              공유 폴더 검색
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#475569] absolute left-2.5 top-2" />
              <input
                type="text"
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
                placeholder="폴더명 / 코드 검색"
                className="bg-[#f4efe4] border border-[#b5a894] rounded pl-8 pr-3 py-1.5 text-xs text-[#0f172a] w-52 focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#334155] dark:text-slate-400">
              파일명 필터
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#475569] absolute left-2.5 top-2" />
              <input
                type="text"
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                placeholder="선택 폴더 내 파일명 검색"
                className="bg-[#f4efe4] border border-[#b5a894] rounded pl-8 pr-3 py-1.5 text-xs text-[#0f172a] w-52 focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* 우상단: 데이터 유입 파이프라인 버튼군 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchFolders}
            disabled={loading}
            className="px-2.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>새로고침</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] rounded text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#1d4ed8]" />
            <span>공유 폴더 생성</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                uploadFilesToSelectedFolder(e.target.files);
              }
            }}
          />
          <button
            type="button"
            disabled={!selectedFolder || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white rounded text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? uploadProgressText || "업로드 중..." : "파일 업로드"}</span>
          </button>
        </div>
      </div>

      {/* 본문 마스터-디테일 영역 */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* 좌측: 공유 폴더 목록 (4 cols) */}
        <div className="col-span-12 lg:col-span-4 bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded flex flex-col overflow-hidden">
          <div className="p-2.5 px-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
              공유 폴더 목록 ({filteredFolders.length}개)
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2">
            {filteredFolders.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#475569]">
                생성된 공유 폴더가 없습니다. 우측 상단 [공유 폴더 생성]을 눌러 추가해 주십시오.
              </div>
            ) : (
              filteredFolders.map((folder) => {
                const isSelected = folder.id === selectedFolderId;
                const isExpired =
                  folder.expiresAt && new Date(folder.expiresAt).getTime() < Date.now();
                return (
                  <div
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`p-3 rounded border transition cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-[#dbeafe] border-l-4 border-[#1d4ed8] text-[#0f172a]"
                        : "bg-[#ebe5d8] border-[#b5a894] hover:bg-[#e2dbcd] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FolderOpen className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                        <span className="text-xs font-bold truncate">{folder.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {folder.hasPassword && (
                          <span className="px-1.5 py-0.5 rounded bg-[#fef3c7] border border-[#f59e0b] text-[#92400e] text-[10px] font-bold inline-flex items-center gap-0.5 whitespace-nowrap">
                            <Lock className="w-2.5 h-2.5" /> 암호
                          </span>
                        )}
                        {!folder.isActive ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#fee2e2] border border-[#ef4444] text-[#991b1b] text-[10px] font-bold whitespace-nowrap">
                            비활성
                          </span>
                        ) : isExpired ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#fee2e2] border border-[#ef4444] text-[#991b1b] text-[10px] font-bold whitespace-nowrap">
                            만료됨
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-[#dcfce7] border border-[#10b981] text-[#065f46] text-[10px] font-bold whitespace-nowrap">
                            공유중
                          </span>
                        )}
                      </div>
                    </div>

                    {folder.description && (
                      <div className="text-[11px] text-[#475569] truncate">
                        {folder.description}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-[#334155] font-mono pt-1 border-t border-[#c4b6a0]/60">
                      <span>
                        파일 {folder.fileCount}개 ({formatBytes(folder.totalSize)})
                      </span>
                      <span>다운로드 {folder.totalDownloads}회</span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleCopyShareLink(folder.shareCode)}
                        className="flex-1 py-1 px-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap"
                      >
                        {copiedCode === folder.shareCode ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>공유 링크 복사</span>
                      </button>
                      <a
                        href={`/share/${folder.shareCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1 px-2 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] rounded text-[11px] font-bold inline-flex items-center gap-1 transition whitespace-nowrap"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>열기</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 우측: 선택된 폴더의 상세 설정 및 파일 목록/드롭존 (8 cols) */}
        <div
          className="col-span-12 lg:col-span-8 bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 rounded flex flex-col overflow-hidden"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              uploadFilesToSelectedFolder(e.dataTransfer.files);
            }
          }}
        >
          {!selectedFolder ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[#475569] p-8">
              좌측에서 공유 폴더를 선택하거나 [공유 폴더 생성] 버튼으로 새 공유 폴더를 만드십시오.
            </div>
          ) : (
            <>
              {/* 선택 폴더 상단 요약 & 링크 바 */}
              <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex flex-col gap-2 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                    <span className="text-sm font-bold text-[#0f172a] dark:text-white truncate">
                      {selectedFolder.title}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#dcd4c4] border border-[#b5a894] text-[#334155]">
                      코드: {selectedFolder.shareCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedFolder)}
                      className="px-2.5 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] rounded text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>폴더 설정</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFolderActive(selectedFolder)}
                      className="px-2.5 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] rounded text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{selectedFolder.isActive ? "공유 중지" : "공유 재개"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(selectedFolder)}
                      className="px-2.5 py-1 bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] border border-[#f87171] rounded text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>폴더 삭제</span>
                    </button>
                  </div>
                </div>

                {/* 외부 공유 URL 표시 및 복사 바 */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-1.5">
                  <div className="flex items-center gap-2 min-w-0 text-xs font-mono text-[#1d4ed8] truncate">
                    <span className="text-[#475569] font-sans font-bold shrink-0">공유 URL:</span>
                    <span className="truncate select-all">
                      {getPublicShareUrl(selectedFolder.shareCode)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedFolder.expiresAt && (
                      <span className="text-[11px] font-mono text-[#b45309] font-bold whitespace-nowrap">
                        만료일: {formatDate(selectedFolder.expiresAt)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyShareLink(selectedFolder.shareCode)}
                      className="px-2.5 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                    >
                      <Copy className="w-3 h-3" />
                      <span>링크 복사</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 드래그 앤 드롭 업로드 배너 */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`m-3 mb-0 p-3 border-2 border-dashed rounded text-center cursor-pointer transition shrink-0 ${
                  isDraggingOver
                    ? "border-[#1d4ed8] bg-[#dbeafe]"
                    : "border-[#b5a894] bg-[#ebe5d8]/60 hover:bg-[#e2dbcd]"
                }`}
              >
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#334155]">
                  <Upload className="w-4 h-4 text-[#1d4ed8]" />
                  <span>
                    {uploading
                      ? uploadProgressText
                      : "여기에 파일을 끌어다 놓거나 클릭하여 Cloudflare R2 버킷에 업로드"}
                  </span>
                </div>
              </div>

              {/* 파일 목록 테이블 */}
              <div className="flex-1 overflow-auto p-3">
                <table className="w-full text-xs text-left border-collapse border border-[#b5a894]">
                  <thead className="bg-[#e2dbcd] text-[#0f172a] font-bold border-b border-[#b5a894] sticky top-0">
                    <tr>
                      <th className="py-2 px-3 whitespace-nowrap w-40">액션</th>
                      <th className="py-2 px-3 whitespace-nowrap">파일명</th>
                      <th className="py-2 px-3 whitespace-nowrap text-right w-24">크기</th>
                      <th className="py-2 px-3 whitespace-nowrap text-right w-24">다운로드수</th>
                      <th className="py-2 px-3 whitespace-nowrap text-center w-24">등록자</th>
                      <th className="py-2 px-3 whitespace-nowrap text-center w-36">업로드 일시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4b6a0] bg-[#f4efe4]">
                    {filteredFiles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-[#475569]">
                          이 공유 폴더에 등록된 파일이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-[#ebe5d8] transition">
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <a
                                href={`/api/share/${encodeURIComponent(selectedFolder.shareCode)}/download?fileId=${file.id}&mode=download`}
                                className="px-2 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-[11px] font-bold inline-flex items-center gap-1 transition whitespace-nowrap"
                              >
                                <Download className="w-3 h-3" />
                                <span>받기</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteFile(file)}
                                className="px-2 py-1 bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] border border-[#f87171] rounded text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>삭제</span>
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-bold text-[#0f172a]">
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-[#1d4ed8] shrink-0" />
                              <span className="truncate max-w-md">{file.fileName}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-[#334155]">
                            {formatBytes(file.fileSize)}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold text-[#1d4ed8]">
                            {file.downloadCount}회
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-center text-[#334155]">
                            {file.uploadedBy || "-"}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-center font-mono text-[#475569]">
                            {formatDate(file.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 우하단 요약 및 최종 액션 바 */}
              <div className="p-2.5 px-4 bg-[#e2dbcd] border-t border-[#b5a894] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="text-xs font-mono text-[#334155]">
                  폴더 파일 합계:{" "}
                  <span className="font-bold text-[#0f172a]">{selectedFolder.fileCount}건</span> | 총 용량:{" "}
                  <span className="font-bold text-[#1d4ed8]">{formatBytes(selectedFolder.totalSize)}</span> | 누적 다운로드:{" "}
                  <span className="font-bold text-[#047857]">{selectedFolder.totalDownloads}회</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/share/${selectedFolder.shareCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] rounded text-xs font-bold inline-flex items-center gap-1.5 transition whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>공유 페이지 미리보기</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyShareLink(selectedFolder.shareCode)}
                    className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>공유 폴더 링크 복사</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 신규 공유 폴더 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded p-5 w-full max-w-md shadow-2xl text-[#0f172a]">
            <div className="flex items-center justify-between pb-2.5 mb-4 border-b border-[#b5a894]">
              <h2 className="text-sm font-bold">공유 폴더 생성</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-[#dcd4c4] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#334155]">공유 폴더명 *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 현대렌탈서비스 전달 자료"
                  required
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-2 text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#334155]">폴더 메모 / 안내문 (선택)</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="수신자에게 표시할 안내 문구"
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-2 text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#334155]">접근 비밀번호 (선택)</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="비워두면 링크 소지자 즉시 열람 가능"
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-2 text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#334155]">만료일 설정 (선택)</label>
                <input
                  type="date"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-2 text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#b5a894]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] border border-[#b5a894] rounded text-xs font-bold cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-xs font-bold cursor-pointer"
                >
                  생성 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 공유 폴더 설정 수정 모달 */}
      {showEditModal && selectedFolder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded p-5 w-full max-w-md shadow-2xl text-[#0f172a]">
            <div className="flex items-center justify-between pb-2.5 mb-4 border-b border-[#b5a894]">
              <h2 className="text-sm font-bold">공유 폴더 설정 변경</h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-[#dcd4c4] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateFolder} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#334155]">공유 폴더명 *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-2 text-xs text-[#0f172a]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#334155]">폴더 메모 / 안내문</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-2 text-xs text-[#0f172a]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#334155]">
                  비밀번호 변경 ({selectedFolder.hasPassword ? "현재 설정됨" : "현재 없음"})
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => {
                    setEditPassword(e.target.value);
                    if (e.target.value) setEditClearPassword(false);
                  }}
                  placeholder="새 비밀번호 입력 (유지하려면 비워둠)"
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-2 text-xs text-[#0f172a]"
                />
                {selectedFolder.hasPassword && (
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#b91c1c] font-bold mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editClearPassword}
                      onChange={(e) => {
                        setEditClearPassword(e.target.checked);
                        if (e.target.checked) setEditPassword("");
                      }}
                    />
                    <span>비밀번호 잠금 해제 (누구나 열람 가능으로 변경)</span>
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#334155]">만료일 설정</label>
                <input
                  type="date"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="bg-[#f4efe4] border border-[#b5a894] rounded px-3 py-2 text-xs text-[#0f172a]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#b5a894]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] border border-[#b5a894] rounded text-xs font-bold cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-xs font-bold cursor-pointer"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
