"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  FolderOpen,
  FileText,
  Download,
  Lock,
  Calendar,
  HardDrive,
  Search,
  AlertCircle,
  CheckCircle2,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileImage,
  File,
} from "lucide-react";

interface SharedFileItem {
  id: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  downloadCount: number;
  createdAt: string;
}

interface SharedFolderInfo {
  shareCode: string;
  title: string;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
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

function getFileIcon(fileName: string, contentType: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf") || contentType.includes("pdf")) {
    return <FileText className="w-4 h-4 text-red-600 shrink-0" />;
  }
  if (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv") ||
    contentType.includes("spreadsheet") ||
    contentType.includes("excel")
  ) {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
  }
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp") ||
    contentType.includes("image/")
  ) {
    return <FileImage className="w-4 h-4 text-blue-600 shrink-0" />;
  }
  if (
    lower.endsWith(".zip") ||
    lower.endsWith(".7z") ||
    lower.endsWith(".rar") ||
    lower.endsWith(".tar") ||
    lower.endsWith(".gz")
  ) {
    return <FileArchive className="w-4 h-4 text-amber-600 shrink-0" />;
  }
  return <File className="w-4 h-4 text-slate-600 shrink-0" />;
}

export default function PublicShareFolderPage() {
  const params = useParams();
  const code = String(params?.code || "");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [verifiedPassword, setVerifiedPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [folder, setFolder] = useState<SharedFolderInfo | null>(null);
  const [files, setFiles] = useState<SharedFileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadFolder = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "공유 폴더를 불러올 수 없습니다.");
        return;
      }
      setFolder(data.folder);
      if (data.requiresPassword) {
        setRequiresPassword(true);
      } else {
        setRequiresPassword(false);
        setFiles(data.files || []);
      }
    } catch (err: any) {
      setErrorMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadFolder();
  }, [loadFolder]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!passwordInput.trim()) {
      setPasswordError("비밀번호를 입력해 주십시오.");
      return;
    }
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPasswordError(data.error || "비밀번호가 일치하지 않습니다.");
        return;
      }
      setVerifiedPassword(passwordInput);
      setRequiresPassword(false);
      setFolder(data.folder);
      setFiles(data.files || []);
    } catch {
      setPasswordError("비밀번호 확인 중 오류가 발생했습니다.");
    }
  };

  const buildDownloadUrl = (fileId: number, mode: "download" | "inline" = "download") => {
    const qs = new URLSearchParams({
      fileId: String(fileId),
      mode,
    });
    if (verifiedPassword) {
      qs.set("pw", verifiedPassword);
    }
    return `/api/share/${encodeURIComponent(code)}/download?${qs.toString()}`;
  };

  const handleDownload = (file: SharedFileItem) => {
    setDownloadingId(file.id);
    const url = buildDownloadUrl(file.id, "download");
    const a = document.createElement("a");
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setFiles((prev) =>
      prev.map((item) =>
        item.id === file.id ? { ...item, downloadCount: (item.downloadCount || 0) + 1 } : item
      )
    );
    setTimeout(() => setDownloadingId(null), 1000);
  };

  const handleDownloadAll = () => {
    filteredFiles.forEach((f, idx) => {
      setTimeout(() => {
        handleDownload(f);
      }, idx * 450);
    });
  };

  const filteredFiles = files.filter((f) => {
    if (!searchQuery.trim()) return true;
    return f.fileName.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  const totalSize = filteredFiles.reduce((acc, cur) => acc + Number(cur.fileSize || 0), 0);

  return (
    <div className="min-h-screen bg-[#ebe5d8] text-[#0f172a] flex flex-col font-sans">
      {/* 상단 헤더 */}
      <header className="bg-[#e2dbcd] border-b border-[#b5a894] px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded bg-[#1d4ed8] text-white flex items-center justify-center font-bold text-sm shrink-0">
            DR
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#0f172a] truncate">
              (주)드래곤알피에이 클라우드 자료실
            </div>
            <div className="text-[11px] text-[#475569] font-mono truncate">
              Cloudflare R2 파일 공유 시스템
            </div>
          </div>
        </div>
        <div className="text-[11px] font-mono text-[#475569] whitespace-nowrap">
          코드: <span className="font-bold text-[#0f172a]">{code}</span>
        </div>
      </header>

      {/* 본문 */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col gap-4">
        {loading ? (
          <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-12 text-center text-xs text-[#475569]">
            공유 폴더 정보를 불러오는 중입니다...
          </div>
        ) : errorMsg ? (
          <div className="bg-[#fef2f2] border border-[#dc2626] rounded p-8 text-center flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8 text-[#dc2626]" />
            <div className="text-sm font-bold text-[#991b1b]">{errorMsg}</div>
            <div className="text-xs text-[#b91c1c]">
              발송자에게 공유 링크 상태를 확인해 주십시오.
            </div>
          </div>
        ) : requiresPassword ? (
          <div className="max-w-md w-full mx-auto my-8 bg-[#f4efe4] border-2 border-[#b5a894] rounded p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-[#b5a894]">
              <Lock className="w-5 h-5 text-[#1d4ed8] shrink-0" />
              <div>
                <h1 className="text-sm font-bold text-[#0f172a]">
                  {folder?.title || "보안 공유 폴더"}
                </h1>
                <p className="text-[11px] text-[#475569]">비밀번호 입력 후 파일 다운로드 가능</p>
              </div>
            </div>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#334155]">접근 비밀번호</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="전달받은 비밀번호 입력"
                  autoFocus
                  className="bg-white border border-[#b5a894] rounded px-3 py-2 text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>
              {passwordError && (
                <div className="text-xs font-bold text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded px-3 py-2">
                  {passwordError}
                </div>
              )}
              <button
                type="submit"
                className="w-full py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded transition cursor-pointer"
              >
                폴더 열기
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* 폴더 메타데이터 상단 카드 */}
            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded bg-[#dbeafe] border border-[#93c5fd] text-[#1d4ed8] shrink-0">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-[#0f172a] truncate">
                    {folder?.title}
                  </h1>
                  {folder?.description && (
                    <p className="text-xs text-[#334155] mt-1 whitespace-pre-wrap">
                      {folder.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-[#475569] font-mono">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <HardDrive className="w-3.5 h-3.5 text-[#1d4ed8]" />
                      총 {filteredFiles.length}개 파일 ({formatBytes(totalSize)})
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5 text-[#475569]" />
                      등록일: {formatDate(folder?.createdAt)}
                    </span>
                    {folder?.expiresAt && (
                      <span className="inline-flex items-center gap-1 text-[#b45309] font-bold whitespace-nowrap">
                        만료일: {formatDate(folder.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {filteredFiles.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    className="px-3.5 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>전체 파일 순차 다운로드 ({filteredFiles.length}건)</span>
                  </button>
                )}
              </div>
            </div>

            {/* 검색 필터 바 */}
            <div className="bg-[#e2dbcd] border border-[#b5a894] rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col gap-1 w-full sm:w-72">
                <label className="text-[11px] font-bold text-[#334155]">파일명 검색</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#475569] absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="파일명 입력"
                    className="w-full bg-[#f4efe4] border border-[#b5a894] rounded pl-8 pr-3 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
              </div>
              <div className="text-xs font-bold text-[#334155] self-end sm:self-center whitespace-nowrap">
                조회 결과: <span className="text-[#1d4ed8] font-mono">{filteredFiles.length}</span>건
              </div>
            </div>

            {/* 파일 목록 테이블 */}
            <div className="bg-[#f4efe4] border border-[#b5a894] rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#e2dbcd] text-[#0f172a] font-bold border-b border-[#b5a894]">
                    <tr>
                      <th className="py-2.5 px-3 whitespace-nowrap w-36">다운로드</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">파일명</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right w-28">파일 크기</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-center w-40">업로드 일시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4b6a0]">
                    {filteredFiles.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-xs text-[#475569]">
                          업로드된 파일이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredFiles.map((file) => {
                        const isPdfOrImage =
                          file.fileName.toLowerCase().endsWith(".pdf") ||
                          file.contentType.includes("pdf") ||
                          file.contentType.includes("image/");
                        return (
                          <tr key={file.id} className="hover:bg-[#ebe5d8] transition">
                            <td className="py-2 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDownload(file)}
                                  className="px-2.5 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold rounded inline-flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                                >
                                  {downloadingId === file.id ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                  <span>다운로드</span>
                                </button>
                                {isPdfOrImage && (
                                  <a
                                    href={buildDownloadUrl(file.id, "inline")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] border border-[#b5a894] font-bold rounded inline-flex items-center gap-1 transition whitespace-nowrap"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>열람</span>
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap font-bold text-[#0f172a]">
                              <div className="flex items-center gap-2">
                                {getFileIcon(file.fileName, file.contentType)}
                                <span className="truncate max-w-xl">{file.fileName}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-[#334155]">
                              {formatBytes(file.fileSize)}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-center font-mono text-[#475569]">
                              {formatDate(file.createdAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
