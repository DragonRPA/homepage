"use client";

import React from "react";
import { Link2 } from "lucide-react";

export interface ObsidianNoteRecord {
  id: number;
  filePath: string;
  folderPath: string;
  title: string;
  content: string;
  tags: string[];
  frontmatter: Record<string, any>;
  isPinned: boolean;
  r2Key: string | null;
  sourceType: string;
  authorName: string;
  updatedAt: string;
  createdAt: string;
}

export function formatObsidianDateTime(iso: string | null | undefined): string {
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

// 옵시디언 스타일 마크다운 프리뷰 렌더러 (YAML Frontmatter, [[WikiLink]], #Tag, 체크리스트, 헤더, 코드블록 지원)
export function renderObsidianPreview(
  md: string,
  onWikiLinkClick: (targetTitle: string) => void
): React.ReactNode {
  if (!md) {
    return <div className="text-xs text-[#64748b]">작성된 마크다운 본문이 없습니다.</div>;
  }

  let body = md;
  let frontmatterBlock: string | null = null;
  const fmMatch = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fmMatch) {
    frontmatterBlock = fmMatch[1];
    body = md.slice(fmMatch[0].length);
  }

  const lines = body.split(/\r?\n/);

  // 인라인 요소([[위키링크]], **굵게**, `코드`, #태그, [링크](url)) 렌더링
  const renderInline = (text: string) => {
    const parts = text.split(/(\[\[[^\]]+\]\]|`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, idx) => {
      if (part.startsWith("[[") && part.endsWith("]]")) {
        const inner = part.slice(2, -2);
        const display = inner.includes("|") ? inner.split("|")[1] : inner;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onWikiLinkClick(inner)}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded bg-violet-100 text-violet-800 border border-violet-300 hover:bg-violet-200 font-bold text-xs transition-colors"
            title={`옵시디언 내부 노트 이동: ${inner}`}
          >
            <Link2 className="w-3 h-3" />
            {display}
          </button>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-[#e2dbcd] text-[#0f172a] font-mono text-xs border border-[#c5bba8]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-extrabold text-[#0f172a]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={idx}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-blue-700 underline font-semibold hover:text-blue-900"
          >
            {linkMatch[1]}
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-2 text-sm leading-relaxed text-[#1e293b]">
      {frontmatterBlock && (
        <div className="p-2.5 rounded border border-[#c5bba8] bg-[#ebe5d8] text-xs font-mono text-[#475569] mb-3">
          <div className="text-[10px] font-bold text-[#64748b] uppercase mb-1">
            YAML Frontmatter (옵시디언 속성)
          </div>
          <pre className="whitespace-pre-wrap">{frontmatterBlock}</pre>
        </div>
      )}
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-2" />;
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h1
              key={i}
              className="text-lg font-extrabold text-[#0f172a] border-b border-[#c5bba8] pb-1 mt-3"
            >
              {renderInline(trimmed.slice(2))}
            </h1>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="text-base font-extrabold text-[#0f172a] mt-2.5">
              {renderInline(trimmed.slice(3))}
            </h2>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} className="text-sm font-bold text-[#1e293b] mt-2">
              {renderInline(trimmed.slice(4))}
            </h3>
          );
        }
        if (trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <input type="checkbox" checked readOnly className="mt-1 accent-violet-700" />
              <span className="line-through text-[#64748b]">{renderInline(trimmed.slice(6))}</span>
            </div>
          );
        }
        if (trimmed.startsWith("- [ ] ")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <input type="checkbox" checked={false} readOnly className="mt-1 accent-violet-700" />
              <span>{renderInline(trimmed.slice(6))}</span>
            </div>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-violet-700 font-bold">•</span>
              <span className="flex-1">{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={i}
              className="border-l-4 border-violet-600 bg-[#ebe5d8] px-3 py-1.5 text-xs text-[#334155] rounded-r"
            >
              {renderInline(trimmed.slice(2))}
            </blockquote>
          );
        }
        return (
          <p key={i} className="text-sm text-[#1e293b]">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}
