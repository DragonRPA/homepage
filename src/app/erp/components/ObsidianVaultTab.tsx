"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  BookOpen,
  Folder,
  Plus,
  Save,
  Trash2,
  Search,
  Pin,
  RefreshCw,
  Upload,
  Download,
  Smartphone,
  CheckCircle2,
  Eye,
  Edit3,
  Columns,
  FolderSync,
} from "lucide-react";
import {
  formatObsidianDateTime,
  renderObsidianPreview,
  type ObsidianNoteRecord,
} from "./obsidian/obsidianMarkdownPreview";
import type { R2SyncConfig } from "./obsidian/ObsidianSyncAndErrorModals";

const ObsidianSyncAndErrorModals = dynamic(
  () =>
    import("./obsidian/ObsidianSyncAndErrorModals").then(
      (m) => m.ObsidianSyncAndErrorModals
    ),
  { ssr: false }
);

export const ObsidianVaultTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const [notes, setNotes] = useState<ObsidianNoteRecord[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingFolder, setSyncingFolder] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");

  // 필터 상태
  const [selectedFolder, setSelectedFolder] = useState<string>("ALL");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // 편집기 상태
  const [editFolderPath, setEditFolderPath] = useState("00_인박스");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [viewMode, setViewMode] = useState<"SPLIT" | "EDIT" | "PREVIEW">("SPLIT");

  // 로컬 PC 옵시디언 폴더 핸들 (File System Access API)
  const [localDirHandle, setLocalDirHandle] = useState<any>(null);
  const [localDirName, setLocalDirName] = useState<string>("");

  // 모달 상태
  const [showSyncGuideModal, setShowSyncGuideModal] = useState(false);
  const [r2Config, setR2Config] = useState<R2SyncConfig | null>(null);

  // 알림 및 에러 모달
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);

  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);
  const folderUploadInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchNotes = useCallback(async (keepSelectedId?: number | null) => {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/obsidian", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "옵시디언 노트 목록 조회 실패");
      }
      const list: ObsidianNoteRecord[] = data.notes || [];
      setNotes(list);

      const targetId = keepSelectedId !== undefined ? keepSelectedId : selectedNoteId;
      const found = targetId ? list.find((n) => n.id === targetId) : list[0];
      if (found) {
        setSelectedNoteId(found.id);
        setEditFolderPath(found.folderPath || "");
        setEditTitle(found.title);
        setEditContent(found.content);
        setEditIsPinned(Boolean(found.isPinned));
        setIsDirty(false);
      } else if (list.length === 0) {
        setSelectedNoteId(null);
      }
    } catch (err: any) {
      setErrorModalMsg(err.message || "옵시디언 노트 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [selectedNoteId]);

  useEffect(() => {
    fetchNotes();
    // 모바일 화면이면 기본 모드를 SPLIT 대신 EDIT/PREVIEW로 자동 최적화
    if (typeof window !== "undefined" && window.innerWidth < 900) {
      setViewMode("PREVIEW");
    }
  }, []);

  const selectNote = (note: ObsidianNoteRecord) => {
    if (isDirty && selectedNoteId !== note.id) {
      if (!window.confirm("작성 중인 변경사항이 저장되지 않았습니다. 다른 노트로 이동하시겠습니까?")) {
        return;
      }
    }
    setSelectedNoteId(note.id);
    setEditFolderPath(note.folderPath || "");
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditIsPinned(Boolean(note.isPinned));
    setIsDirty(false);
  };

  const handleStartNewNote = () => {
    const defaultFolder = selectedFolder !== "ALL" ? selectedFolder : "00_인박스";
    const today = new Date().toISOString().slice(0, 10);
    const defaultTitle = `새 노트 ${today}`;
    const template = `---
title: ${defaultTitle}
tags: [업무메모]
created: ${today}
---

# ${defaultTitle}

## 핵심 내용
- 

## 체크리스트
- [ ] 확인 항목 1
`;
    setSelectedNoteId(null);
    setEditFolderPath(defaultFolder);
    setEditTitle(defaultTitle);
    setEditContent(template);
    setEditIsPinned(false);
    setIsDirty(true);
    if (viewMode === "PREVIEW") setViewMode("EDIT");
  };

  // 로컬 PC 폴더가 연결되어 있으면 개별 파일도 즉시 PC 폴더에 기록
  const writeNoteToLocalDirectory = async (
    dirHandle: any,
    folderPath: string,
    title: string,
    content: string
  ) => {
    if (!dirHandle) return;
    try {
      let currentDir = dirHandle;
      const parts = (folderPath || "")
        .replace(/\\/g, "/")
        .split("/")
        .map((p) => p.trim())
        .filter(Boolean);
      for (const folderName of parts) {
        currentDir = await currentDir.getDirectoryHandle(folderName, { create: true });
      }
      const safeFileName = `${title.replace(/\.md$/i, "").replace(/[\\/:*?"<>|]/g, "_")}.md`;
      const fileHandle = await currentDir.getFileHandle(safeFileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (e) {
      console.warn("로컬 PC 폴더 파일 쓰기 실패:", e);
    }
  };

  const handleSaveNote = async () => {
    if (!editTitle.trim()) {
      setErrorModalMsg("노트 제목을 입력해 주십시오.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/erp/obsidian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_NOTE",
          id: selectedNoteId,
          folderPath: editFolderPath.trim(),
          title: editTitle.trim(),
          content: editContent,
          isPinned: editIsPinned,
          authorName: currentUser?.name || "이정용 대표이사",
          sourceType: "ERP_EDITOR",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "노트 저장 실패");
      }
      const saved: ObsidianNoteRecord = data.note;

      // 로컬 PC 폴더 핸들이 연결되어 있으면 내 PC 옵시디언 폴더에도 즉시 .md 저장
      if (localDirHandle) {
        await writeNoteToLocalDirectory(localDirHandle, saved.folderPath, saved.title, saved.content);
      }

      setNotes((prev) => {
        const exists = prev.some((n) => n.id === saved.id);
        const next = exists
          ? prev.map((n) => (n.id === saved.id ? saved : n))
          : [saved, ...prev];
        return [...next].sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      });
      setSelectedNoteId(saved.id);
      setEditFolderPath(saved.folderPath || "");
      setEditTitle(saved.title);
      setEditContent(saved.content);
      setEditIsPinned(Boolean(saved.isPinned));
      setIsDirty(false);

      showToast(
        localDirHandle
          ? `노트가 ERP 클라우드 및 PC 옵시디언 폴더(${localDirName})에 동시 저장되었습니다.`
          : "노트가 ERP 및 R2 클라우드에 즉시 저장되었습니다."
      );
    } catch (err: any) {
      setErrorModalMsg(err.message || "노트 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 단축키 Ctrl+S / Cmd+S 저장 지원
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && editTitle.trim()) {
          handleSaveNote();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleDeleteNote = async (noteId: number, title: string) => {
    if (!window.confirm(`[${title}] 노트를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/erp/obsidian?id=${noteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "노트 삭제 실패");
      }
      const remaining = notes.filter((n) => n.id !== noteId);
      setNotes(remaining);
      if (selectedNoteId === noteId) {
        const next = remaining[0] || null;
        if (next) {
          selectNote(next);
        } else {
          setSelectedNoteId(null);
          setEditTitle("");
          setEditContent("");
        }
      }
      showToast("노트가 삭제되었습니다.");
    } catch (err: any) {
      setErrorModalMsg(err.message);
    }
  };

  // PC 로컬 옵시디언 Vault 폴더 1클릭 양방향 동기화 (File System Access API)
  const handleSyncLocalPcObsidianFolder = async () => {
    try {
      const win = window as any;
      if (typeof win.showDirectoryPicker !== "function") {
        // 모바일 또는 구형 브라우저에서는 폴더/파일 업로드 input 호출
        folderUploadInputRef.current?.click();
        return;
      }

      let dirHandle = localDirHandle;
      if (!dirHandle) {
        dirHandle = await win.showDirectoryPicker({ mode: "readwrite" });
        setLocalDirHandle(dirHandle);
        setLocalDirName(dirHandle.name || "로컬 옵시디언 폴더");
      }

      setSyncingFolder(true);
      setSyncStatusMsg("PC 옵시디언 폴더에서 .md 파일을 스캔하고 있습니다...");

      // 1. 로컬 폴더 재귀 탐색하여 모든 .md 파일 읽기
      const localMdFiles: { relativePath: string; content: string }[] = [];
      const scanDir = async (handle: any, prefix: string) => {
        for await (const entry of handle.values()) {
          const name = String(entry.name || "");
          if (name.startsWith(".") || name === "node_modules") continue;
          const relPath = prefix ? `${prefix}/${name}` : name;
          if (entry.kind === "directory") {
            await scanDir(entry, relPath);
          } else if (entry.kind === "file" && name.toLowerCase().endsWith(".md")) {
            const file = await entry.getFile();
            const text = await file.text();
            localMdFiles.push({ relativePath: relPath, content: text });
          }
        }
      };

      await scanDir(dirHandle, "");

      // 2. 로컬 .md 파일들을 ERP 서버로 일괄 업로드 (Upsert)
      let latestServerNotes = notes;
      if (localMdFiles.length > 0) {
        setSyncStatusMsg(`PC 노트 ${localMdFiles.length}건을 ERP 클라우드로 동기화 중...`);
        const res = await fetch("/api/erp/obsidian", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "BULK_SYNC_UPLOAD",
            files: localMdFiles,
            authorName: currentUser?.name || "이정용 대표이사",
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "PC 폴더 업로드 동기화 실패");
        }
        latestServerNotes = data.notes || [];
        setNotes(latestServerNotes);
      }

      // 3. 역방향(ERP/핸드폰에서 작성된 노트 ➔ 내 PC 옵시디언 로컬 폴더)에 .md 파일 쓰기
      setSyncStatusMsg("ERP/모바일 노트를 내 PC 옵시디언 폴더로 내려받는 중...");
      let writtenToPcCount = 0;
      for (const note of latestServerNotes) {
        await writeNoteToLocalDirectory(dirHandle, note.folderPath, note.title, note.content);
        writtenToPcCount++;
      }

      if (latestServerNotes.length > 0 && !selectedNoteId) {
        selectNote(latestServerNotes[0]);
      }

      showToast(
        `양방향 동기화 완료! (PC ➔ ERP ${localMdFiles.length}건 / ERP ➔ PC ${writtenToPcCount}건)`
      );
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setErrorModalMsg(err.message || "PC 옵시디언 폴더 동기화 중 오류가 발생했습니다.");
    } finally {
      setSyncingFolder(false);
      setSyncStatusMsg("");
    }
  };

  // 일반 파일/폴더 <input type="file"> 업로드 처리 (모바일 및 모든 브라우저 호환)
  const handleFileInputUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setSyncingFolder(true);
    try {
      const mdPayload: { relativePath: string; content: string }[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const rel = (f as any).webkitRelativePath || f.name;
        if (!rel.toLowerCase().endsWith(".md")) continue;
        if (rel.includes("/.obsidian/") || rel.startsWith(".obsidian/")) continue;
        // 최상위 폴더명 제거 (예: MyVault/01_메모/노트.md -> 01_메모/노트.md)
        const parts = String(rel).replace(/\\/g, "/").split("/");
        const cleanRel = parts.length > 1 ? parts.slice(1).join("/") : parts[0];
        const text = await f.text();
        mdPayload.push({ relativePath: cleanRel, content: text });
      }

      if (mdPayload.length === 0) {
        throw new Error("선택한 항목 중 마크다운(.md) 파일이 없습니다.");
      }

      const res = await fetch("/api/erp/obsidian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BULK_SYNC_UPLOAD",
          files: mdPayload,
          authorName: currentUser?.name || "이정용 대표이사",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "마크다운 일괄 업로드 실패");
      }
      const updatedNotes: ObsidianNoteRecord[] = data.notes || [];
      setNotes(updatedNotes);
      if (updatedNotes.length > 0) {
        selectNote(updatedNotes[0]);
      }
      showToast(`${data.syncedCount}개의 옵시디언 노트(.md)가 동기화되었습니다.`);
    } catch (err: any) {
      setErrorModalMsg(err.message);
    } finally {
      setSyncingFolder(false);
      if (fileUploadInputRef.current) fileUploadInputRef.current.value = "";
      if (folderUploadInputRef.current) folderUploadInputRef.current.value = "";
    }
  };

  // 현재 노트를 .md 파일로 다운로드 (모바일/PC)
  const handleDownloadCurrentMd = () => {
    if (!editTitle.trim()) return;
    const blob = new Blob([editContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${editTitle.trim().replace(/\.md$/i, "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // R2 연동 가이드 모달 열기
  const handleOpenSyncGuideModal = async () => {
    setShowSyncGuideModal(true);
    try {
      const res = await fetch("/api/erp/obsidian?action=SYNC_CONFIG", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setR2Config(data.r2Config);
      }
    } catch {
      // ignore
    }
  };

  const copyText = async (label: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      showToast(`${label} 항목이 클립보드에 복사되었습니다.`);
    } catch {
      setErrorModalMsg(`복사 실패: ${val}`);
    }
  };

  // 폴더 목록 및 태그 집계
  const folderList = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of notes) {
      const f = n.folderPath || "(루트 폴더)";
      map.set(f, (map.get(f) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [notes]);

  const tagList = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of notes) {
      for (const t of n.tags || []) {
        map.set(t, (map.get(t) || 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (selectedFolder !== "ALL") {
        const nf = n.folderPath || "(루트 폴더)";
        if (nf !== selectedFolder) return false;
      }
      if (selectedTag !== "ALL") {
        if (!(n.tags || []).includes(selectedTag)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const inTitle = n.title.toLowerCase().includes(q);
        const inContent = (n.content || "").toLowerCase().includes(q);
        const inFolder = (n.folderPath || "").toLowerCase().includes(q);
        const inTags = (n.tags || []).some((t) => t.toLowerCase().includes(q));
        return inTitle || inContent || inFolder || inTags;
      }
      return true;
    });
  }, [notes, selectedFolder, selectedTag, searchQuery]);

  // [[위키링크]] 클릭 시 해당 노트로 즉시 점프하거나 없으면 새로 생성
  const handleWikiLinkClick = (targetTitle: string) => {
    const cleanTarget = targetTitle.split("|")[0].replace(/\.md$/i, "").trim();
    const found = notes.find(
      (n) => n.title.toLowerCase() === cleanTarget.toLowerCase()
    );
    if (found) {
      selectNote(found);
      showToast(`[[${found.title}]] 노트로 이동했습니다.`);
    } else {
      if (window.confirm(`[[${cleanTarget}]] 노트가 아직 없습니다. 지금 새로 생성하시겠습니까?`)) {
        const today = new Date().toISOString().slice(0, 10);
        setSelectedNoteId(null);
        setEditFolderPath(selectedFolder !== "ALL" ? selectedFolder : "00_인박스");
        setEditTitle(cleanTarget);
        setEditContent(`---\ntitle: ${cleanTarget}\ntags: [연결노트]\ncreated: ${today}\n---\n\n# ${cleanTarget}\n\n- 상위 연결 노트: [[${editTitle || "이전 노트"}]]\n\n`);
        setEditIsPinned(false);
        setIsDirty(true);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#ebe5d8] text-[#0f172a] overflow-hidden font-sans">
      {/* 숨김 파일/폴더 업로드 Input */}
      <input
        ref={fileUploadInputRef}
        type="file"
        accept=".md,text/markdown"
        multiple
        className="hidden"
        onChange={(e) => handleFileInputUpload(e.target.files)}
      />
      <input
        ref={folderUploadInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: "", directory: "" } as any)}
        className="hidden"
        onChange={(e) => handleFileInputUpload(e.target.files)}
      />

      {/* 토스트 알림 */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded border shadow-lg text-xs font-bold ${
            toast.type === "error"
              ? "bg-red-50 border-red-400 text-red-800"
              : "bg-violet-900 border-violet-700 text-white"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* 상단 헤더 바 */}
      <div className="shrink-0 px-3 py-2 bg-[#e2dbcd] border-b border-[#c5bba8] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-violet-800 text-white font-bold text-xs whitespace-nowrap">
            <BookOpen className="w-3.5 h-3.5" />
            <span>옵시디언 노트 (PC·핸드폰·ERP 통합 보관소)</span>
          </div>
          <span className="text-xs font-bold text-[#475569] whitespace-nowrap">총 {notes.length}개 노트</span>
          {localDirName && (
            <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-400 text-emerald-900 text-[11px] font-bold whitespace-nowrap">
              PC 폴더 연결됨: {localDirName}
            </span>
          )}
          {syncingFolder && (
            <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-400 text-amber-900 text-[11px] font-bold whitespace-nowrap">
              {syncStatusMsg || "동기화 처리 중..."}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleSyncLocalPcObsidianFolder}
            disabled={syncingFolder}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold whitespace-nowrap shadow-sm transition-colors"
            title="내 PC의 옵시디언 Vault 폴더를 선택하여 양방향 자동 동기화합니다"
          >
            <FolderSync className="w-3.5 h-3.5" />
            <span>{localDirHandle ? "PC 옵시디언 폴더 즉시 동기화" : "PC 옵시디언 폴더 연동/동기화"}</span>
          </button>
          <button
            type="button"
            onClick={() => fileUploadInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#f4efe4] hover:bg-[#d8d0c0] text-[#0f172a] border border-[#b8ae99] text-xs font-bold whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>.md 파일 가져오기</span>
          </button>
          <button
            type="button"
            onClick={handleOpenSyncGuideModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold whitespace-nowrap shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>PC·폰 옵시디언 앱 연동 설정</span>
          </button>
          <button
            type="button"
            onClick={handleStartNewNote}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold whitespace-nowrap shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 노트 작성</span>
          </button>
          <button
            type="button"
            onClick={() => fetchNotes()}
            className="p-1.5 rounded bg-[#f4efe4] hover:bg-[#d8d0c0] text-[#0f172a] border border-[#b8ae99]"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 본문 2-Pane (좌측: 폴더/태그/노트목록, 우측: 마크다운 에디터 & 프리뷰) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* 좌측 사이드바: 폴더 + 태그 + 노트 리스트 */}
        <div className="w-full lg:w-[340px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#c5bba8] bg-[#e9e3d5] flex flex-col max-h-[38vh] lg:max-h-none min-h-0">
          {/* 검색창 */}
          <div className="p-2 border-b border-[#c5bba8] bg-[#e2dbcd]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="노트 제목 / 본문 / #태그 검색..."
                className="w-full pl-8 pr-2 py-1.5 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs text-[#0f172a] focus:outline-none focus:border-violet-600"
              />
            </div>

            {/* 폴더 필터 칩 */}
            <div className="flex items-center gap-1 overflow-x-auto pt-2 pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedFolder("ALL")}
                className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap border ${
                  selectedFolder === "ALL"
                    ? "bg-violet-800 text-white border-violet-900"
                    : "bg-[#f4efe4] text-[#334155] border-[#c5bba8]"
                }`}
              >
                전체 폴더 ({notes.length})
              </button>
              {folderList.map(([folder, count]) => (
                <button
                  key={folder}
                  type="button"
                  onClick={() => setSelectedFolder(folder)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap border ${
                    selectedFolder === folder
                      ? "bg-violet-800 text-white border-violet-900"
                      : "bg-[#f4efe4] text-[#334155] border-[#c5bba8]"
                  }`}
                >
                  <Folder className="w-3 h-3" />
                  <span>{folder} ({count})</span>
                </button>
              ))}
            </div>

            {/* 태그 필터 칩 */}
            {tagList.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pt-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedTag("ALL")}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                    selectedTag === "ALL" ? "bg-[#0f172a] text-white" : "bg-[#ebe5d8] text-[#475569]"
                  }`}
                >
                  #전체태그
                </button>
                {tagList.map(([tag, cnt]) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(selectedTag === tag ? "ALL" : tag)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                      selectedTag === tag
                        ? "bg-violet-700 text-white"
                        : "bg-[#ebe5d8] text-violet-900 border border-[#c5bba8]"
                    }`}
                  >
                    #{tag} ({cnt})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 노트 목록 */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#d5ccb8]">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748b]">조건에 맞는 노트가 없습니다.</div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = note.id === selectedNoteId;
                return (
                  <div
                    key={note.id}
                    onClick={() => selectNote(note)}
                    className={`p-2.5 cursor-pointer transition-colors ${
                      isSelected ? "bg-[#f4efe4] border-l-4 border-l-violet-700" : "hover:bg-[#f4efe4]/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-bold text-violet-800 bg-violet-100 px-1.5 py-0.5 rounded whitespace-nowrap truncate max-w-[180px]">
                        {note.folderPath || "루트"}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {note.isPinned && <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />}
                        <span className="text-[10px] text-[#64748b] whitespace-nowrap">
                          {formatObsidianDateTime(note.updatedAt).slice(5)}
                        </span>
                      </div>
                    </div>

                    <div className="font-extrabold text-xs text-[#0f172a] truncate mb-1">{note.title}</div>
                    <div className="text-[11px] text-[#475569] line-clamp-1 mb-1">
                      {note.content.replace(/^---[\s\S]*?---/, "").replace(/[#*`>-]/g, "").trim() || "-"}
                    </div>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.slice(0, 4).map((t) => (
                          <span key={t} className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#e2dbcd] text-[#334155]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 우측 메인 작업대: 노트 메타데이터 + 마크다운 편집기 / 실시간 프리뷰 */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#f4efe4]">
          {/* 에디터 상단 메타데이터 및 액션 바 */}
          <div className="shrink-0 p-2.5 bg-[#e2dbcd] border-b border-[#c5bba8] flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-wrap items-end gap-2 flex-1 min-w-[260px]">
              <div className="flex flex-col gap-0.5 w-36 sm:w-44">
                <label className="text-[10px] font-bold text-[#475569] whitespace-nowrap">
                  폴더 경로 (Vault 하위 폴더)
                </label>
                <input
                  type="text"
                  value={editFolderPath}
                  onChange={(e) => {
                    setEditFolderPath(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="예: 01_정부지원_전략"
                  className="px-2 py-1 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold text-[#0f172a]"
                />
              </div>

              <div className="flex flex-col gap-0.5 flex-1 min-w-[180px]">
                <label className="text-[10px] font-bold text-[#475569] whitespace-nowrap">
                  노트 제목 (.md 파일명)
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="노트 제목을 입력하십시오"
                  className="px-2.5 py-1 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-extrabold text-[#0f172a]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditIsPinned((p) => !p);
                  setIsDirty(true);
                }}
                className={`px-2.5 py-1 rounded border text-xs font-bold flex items-center gap-1 whitespace-nowrap ${
                  editIsPinned
                    ? "bg-amber-100 border-amber-500 text-amber-900"
                    : "bg-[#f4efe4] border-[#b8ae99] text-[#475569]"
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
                <span>{editIsPinned ? "상단 고정됨" : "고정"}</span>
              </button>
            </div>

            {/* 뷰 모드 전환 및 저장/삭제 버튼 */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center rounded border border-[#b8ae99] bg-[#ebe5d8] p-0.5">
                {([
                  { mode: "EDIT" as const, icon: Edit3, label: "편집" },
                  { mode: "SPLIT" as const, icon: Columns, label: "분할" },
                  { mode: "PREVIEW" as const, icon: Eye, label: "미리보기" },
                ]).map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 whitespace-nowrap ${
                      viewMode === mode ? "bg-[#0f172a] text-white" : "text-[#475569]"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleDownloadCurrentMd}
                className="px-2.5 py-1 rounded bg-[#f4efe4] hover:bg-[#d8d0c0] border border-[#b8ae99] text-[#0f172a] text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                title="현재 노트를 .md 파일로 다운로드"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.md 내려받기</span>
              </button>

              {selectedNoteId && (
                <button
                  type="button"
                  onClick={() => handleDeleteNote(selectedNoteId, editTitle)}
                  className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveNote}
                disabled={saving}
                className="px-3 py-1 rounded bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "저장 중..." : isDirty ? "노트 저장 *" : "노트 저장"}</span>
              </button>
            </div>
          </div>

          {/* 마크다운 빠른 삽입 툴바 */}
          <div className="shrink-0 px-3 py-1 bg-[#ebe5d8] border-b border-[#c5bba8] flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="font-bold text-[#64748b] mr-1 whitespace-nowrap">빠른 마크다운:</span>
            {[
              {
                label: "# 제목",
                snippet: "\n## 새 소제목\n",
                cls: "bg-[#f4efe4] border-[#c5bba8] hover:bg-[#e2dbcd]",
              },
              {
                label: "☑ 체크리스트",
                snippet: "\n- [ ] 할 일 항목",
                cls: "bg-[#f4efe4] border-[#c5bba8] hover:bg-[#e2dbcd]",
              },
              {
                label: "[[위키링크 삽입]]",
                snippet: ` [[${notes[0]?.title || "연결할 노트 제목"}]] `,
                cls: "bg-violet-100 border-violet-300 text-violet-900 hover:bg-violet-200",
              },
              {
                label: "#태그 추가",
                snippet: " #중요메모 ",
                cls: "bg-[#f4efe4] border-[#c5bba8] hover:bg-[#e2dbcd]",
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setEditContent((prev) => `${prev}${item.snippet}`);
                  setIsDirty(true);
                }}
                className={`px-2 py-0.5 rounded border font-bold whitespace-nowrap ${item.cls}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* 에디터 & 프리뷰 본문 영역 */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 overflow-hidden">
            {(viewMode === "EDIT" || viewMode === "SPLIT") && (
              <div
                className={`flex flex-col min-h-0 border-b lg:border-b-0 border-r border-[#c5bba8] ${
                  viewMode === "EDIT" ? "lg:col-span-2" : ""
                }`}
              >
                <div className="px-3 py-1 bg-[#e9e3d5] border-b border-[#c5bba8] text-[11px] font-bold text-[#475569] flex items-center justify-between">
                  <span>마크다운 원본 (.md 편집)</span>
                  <span>Ctrl + S 즉시 저장</span>
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="여기에 마크다운(.md) 내용을 작성하십시오. [[노트제목]]으로 다른 노트와 연결하고 #태그를 붙일 수 있습니다."
                  className="flex-1 w-full p-3 bg-[#f8f4ec] text-[#0f172a] font-mono text-xs leading-relaxed resize-none focus:outline-none overflow-y-auto"
                />
              </div>
            )}

            {(viewMode === "PREVIEW" || viewMode === "SPLIT") && (
              <div
                className={`flex flex-col min-h-0 bg-[#f4efe4] ${
                  viewMode === "PREVIEW" ? "lg:col-span-2" : ""
                }`}
              >
                <div className="px-3 py-1 bg-[#e9e3d5] border-b border-[#c5bba8] text-[11px] font-bold text-[#475569] flex items-center justify-between">
                  <span>옵시디언 라이브 프리뷰 ([[위키링크]] 클릭 시 해당 노트로 즉시 이동)</span>
                  <span className="text-violet-800">R2 클라우드 백업 연동됨</span>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                  {renderObsidianPreview(editContent, handleWikiLinkClick)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 에러 및 PC·폰 동기화 가이드 모달 (Lazy) */}
      {(!!errorModalMsg || showSyncGuideModal) && (
        <ObsidianSyncAndErrorModals
          errorModalMsg={errorModalMsg}
          onCloseErrorModal={() => setErrorModalMsg(null)}
          showSyncGuideModal={showSyncGuideModal}
          onCloseSyncGuideModal={() => setShowSyncGuideModal(false)}
          r2Config={r2Config}
          onCopyText={copyText}
        />
      )}
    </div>
  );
};
