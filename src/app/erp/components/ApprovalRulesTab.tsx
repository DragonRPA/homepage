"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  ShieldAlert, Save, RefreshCw, Check, X, 
  HelpCircle, Settings, Layers, AlertCircle,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { sortErpItems, SortDirection, formatErpNumber } from "@/lib/erpFormat";

interface ApprovalRule {
  id: number;
  eventType: string;
  eventName: string;
  category: string;
  requiredTier: number;
  autoConsensus: boolean;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export const ApprovalRulesTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";

  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRules, setEditingRules] = useState<Record<number, ApprovalRule>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [sortKey, setSortKey] = useState<string>("id");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const renderSortTh = (label: string, colKey: string, align: "left" | "right" | "center" = "left") => (
    <th
      onClick={() => handleSort(colKey)}
      className={`py-2.5 px-3 whitespace-nowrap cursor-pointer select-none transition ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } hover:bg-[#d0c6b4] dark:hover:bg-slate-700/60`}
    >
      <div className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
        <span>{label}</span>
        {sortKey === colKey ? (
          sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400 font-bold" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100" />
        )}
      </div>
    </th>
  );

  const sortedRules = useMemo(() => {
    return sortErpItems(rules, sortKey, sortDir);
  }, [rules, sortKey, sortDir]);

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/approvals/rules");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "결재 규칙 조회 실패");

      const list: ApprovalRule[] = data.rules || [];
      setRules(list);

      const map: Record<number, ApprovalRule> = {};
      list.forEach((r) => {
        map[r.id] = { ...r };
      });
      setEditingRules(map);
      setIsDirty(false);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleChange = (id: number, field: keyof ApprovalRule, value: any) => {
    if (!isAdmin) return;
    setEditingRules((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
    setIsDirty(true);
  };

  const handleSaveAll = async () => {
    try {
      setLoading(true);
      for (const rule of Object.values(editingRules)) {
        const res = await fetch("/api/erp/approvals/rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: rule.id,
            requiredTier: rule.requiredTier,
            autoConsensus: rule.autoConsensus,
            isActive: rule.isActive,
            description: rule.description,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "규칙 저장 실패");
      }

      showToast("결재선 규칙 설정이 모두 저장되었습니다.");
      setIsDirty(false);
      fetchRules();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
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

      {/* Top Header */}
      <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
            <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
              결재선 규칙 설정 (전사 결재 이벤트 SSOT)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRules}
            disabled={loading}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          {isAdmin && (
            <button
              onClick={handleSaveAll}
              disabled={!isDirty || loading}
              className={`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 shadow transition ${
                isDirty
                  ? "bg-[#1d4ed8] hover:bg-[#1e40af] text-white"
                  : "bg-[#dcd4c4] text-[#475569] cursor-not-allowed border border-[#b5a894] dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>설정 저장</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tier Hierarchy Guide Card */}
        <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0f172a] dark:text-slate-300">
            <Layers className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
            <span>결재 티어(Tier) 체계 안내</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2 py-1 rounded bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
              <strong className="text-[#1d4ed8] dark:text-blue-400">Tier 1:</strong> 팀원 (일반 기안)
            </span>
            <span className="px-2 py-1 rounded bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
              <strong className="text-[#047857] dark:text-emerald-400">Tier 2:</strong> 팀장 (1차 승인)
            </span>
            <span className="px-2 py-1 rounded bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
              <strong className="text-[#b45309] dark:text-amber-400">Tier 3:</strong> 부서장 (중간 승인)
            </span>
            <span className="px-2 py-1 rounded bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
              <strong className="text-[#6d28d9] dark:text-purple-400">Tier 4:</strong> 본부장/임원 (총괄 승인)
            </span>
            <span className="px-2 py-1 rounded bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
              <strong className="text-[#dc2626] dark:text-rose-400">Tier 5:</strong> 대표이사 (전결 마감)
            </span>
          </div>
        </div>

        {/* Rules Table */}
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-auto max-h-[calc(100vh-230px)] dark:bg-slate-900 dark:border-slate-800">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#e2dbcd] text-[#0f172a] uppercase tracking-wider font-semibold border-b border-[#b5a894] sticky top-0 z-10 select-none dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              <tr>
                {renderSortTh("이벤트 코드", "eventType")}
                {renderSortTh("결재 이벤트명", "eventName")}
                {renderSortTh("카테고리", "category")}
                {renderSortTh("승인 필요 최소 티어", "requiredTier")}
                {renderSortTh("부서합의 여부", "autoConsensus", "center")}
                {renderSortTh("규칙 활성화", "isActive", "center")}
                {renderSortTh("규칙 설명", "description")}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
              {sortedRules.map((rule) => {
                const r = editingRules[rule.id] || rule;
                return (
                  <tr key={rule.id} className="hover:bg-[#f4efe4] dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-[#475569] dark:text-slate-400 font-bold whitespace-nowrap">
                      {r.eventType}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                      {r.eventName}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#dcd4c4] border border-[#b5a894] text-[#0f172a] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 font-medium">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isAdmin ? (
                        <select
                          value={r.requiredTier}
                          onChange={(e) => handleChange(rule.id, "requiredTier", parseInt(e.target.value))}
                          className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1 rounded focus:outline-none focus:border-[#1d4ed8] font-semibold dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                        >
                          <option value={1}>Tier 1 (팀원)</option>
                          <option value={2}>Tier 2 (팀장)</option>
                          <option value={3}>Tier 3 (부서장)</option>
                          <option value={4}>Tier 4 (본부장/임원)</option>
                          <option value={5}>Tier 5 (대표이사)</option>
                        </select>
                      ) : (
                        <span className="font-bold text-[#1d4ed8] dark:text-blue-400">Tier {r.requiredTier}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleChange(rule.id, "autoConsensus", !r.autoConsensus)}
                        disabled={!isAdmin}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                          r.autoConsensus
                            ? "bg-[#f3e8ff] text-[#6b21a8] border border-[#d8b4fe] dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30"
                            : "bg-[#dcd4c4] text-[#475569] hover:bg-[#d0c6b4] border border-[#b5a894] dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700 dark:border-transparent"
                        }`}
                      >
                        {r.autoConsensus ? "합의 필요" : "단일 결재"}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleChange(rule.id, "isActive", !r.isActive)}
                        disabled={!isAdmin}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                          r.isActive
                            ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                            : "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30"
                        }`}
                      >
                        {r.isActive ? "활성" : "비활성"}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-[#334155] dark:text-slate-300">
                      {isAdmin ? (
                        <input
                          type="text"
                          value={r.description || ""}
                          onChange={(e) => handleChange(rule.id, "description", e.target.value)}
                          placeholder="설명 입력"
                          className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-2 py-1 rounded w-full focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                        />
                      ) : (
                        <span>{r.description || "-"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
