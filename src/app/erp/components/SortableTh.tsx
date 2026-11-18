"use client";

import React, { useState, useCallback } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cycleErpSort, type ErpSortState, type SortDirection } from "@/lib/erpFormat";

/**
 * 전사 3단계 테이블 정렬 훅 (오름차순 ➔ 내림차순 ➔ 정렬안함)
 */
export function useErpTableSort(initialKey = "", initialDir: SortDirection = null) {
  const [sortState, setSortState] = useState<ErpSortState>({
    key: initialKey,
    dir: initialKey ? initialDir : null,
  });

  const handleSort = useCallback((colKey: string) => {
    setSortState((prev) => cycleErpSort(prev.key, prev.dir, colKey));
  }, []);

  const resetSort = useCallback(() => {
    setSortState({ key: "", dir: null });
  }, []);

  return {
    sortKey: sortState.key,
    sortDir: sortState.dir,
    sortState,
    setSortState,
    handleSort,
    resetSort,
  };
}

export interface SortableThProps {
  label: React.ReactNode;
  colKey: string;
  sortKey: string;
  sortDir: SortDirection;
  onSort: (colKey: string) => void;
  align?: "left" | "right" | "center";
  className?: string;
  style?: React.CSSProperties;
  iconClassName?: string;
  colSpan?: number;
  rowSpan?: number;
}

/**
 * 전사 표준 3단계 정렬 가능 테이블 헤더 (오름차순 / 내림차순 / 정렬안함)
 */
export const SortableTh: React.FC<SortableThProps> = ({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
  align = "left",
  className = "py-2 px-2.5",
  style,
  iconClassName = "text-[#1d4ed8] dark:text-blue-400",
  colSpan,
  rowSpan,
}) => {
  const isActive = sortKey === colKey && sortDir !== null;
  const labelText = typeof label === "string" || typeof label === "number" ? String(label) : colKey;
  const sortLabel = isActive
    ? sortDir === "asc"
      ? "오름차순"
      : "내림차순"
    : "정렬안함";

  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const flexAlign =
    align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start";

  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      onClick={() => onSort(colKey)}
      style={style}
      aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      title={`${labelText} : ${sortLabel}`}
      className={`cursor-pointer select-none whitespace-nowrap transition hover:bg-black/5 dark:hover:bg-white/5 ${alignClass} ${className}`}
    >
      <div className={`inline-flex items-center gap-1 ${flexAlign}`}>
        <span>{label}</span>
        <span className="shrink-0">
          {isActive ? (
            sortDir === "asc" ? (
              <ArrowUp className={`w-3.5 h-3.5 font-bold ${iconClassName}`} />
            ) : (
              <ArrowDown className={`w-3.5 h-3.5 font-bold ${iconClassName}`} />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-35" />
          )}
        </span>
      </div>
    </th>
  );
};
