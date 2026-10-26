"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Save, RefreshCw, Check, X, 
  HelpCircle, Settings, Layers, AlertCircle
} from "lucide-react";

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
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-xs font-bold border ${
            toastMessage.type === "success"
              ? "bg-emerald-950 border-emerald-500 text-emerald-200"
              : "bg-rose-950 border-rose-500 text-rose-200"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Top Header */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-200">
              결재선 규칙 설정 (전사 결재 이벤트 SSOT)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRules}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
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
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
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
        <div className="bg-slate-900 border border-slate-800 rounded p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>결재 티어(Tier) 체계 안내</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
              <strong className="text-blue-400">Tier 1:</strong> 팀원 (일반 기안)
            </span>
            <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
              <strong className="text-emerald-400">Tier 2:</strong> 팀장 (1차 승인)
            </span>
            <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
              <strong className="text-amber-400">Tier 3:</strong> 부서장 (중간 승인)
            </span>
            <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
              <strong className="text-purple-400">Tier 4:</strong> 본부장/임원 (총괄 승인)
            </span>
            <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
              <strong className="text-rose-400">Tier 5:</strong> 대표이사 (전결 마감)
            </span>
          </div>
        </div>

        {/* Rules Table */}
        <div className="bg-slate-900 border border-slate-800 rounded shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">이벤트 코드</th>
                <th className="py-2.5 px-3 whitespace-nowrap">결재 이벤트명</th>
                <th className="py-2.5 px-3 whitespace-nowrap">카테고리</th>
                <th className="py-2.5 px-3 whitespace-nowrap">승인 필요 최소 티어</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">부서합의 여부</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">규칙 활성화</th>
                <th className="py-2.5 px-3 whitespace-nowrap">규칙 설명</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rules.map((rule) => {
                const r = editingRules[rule.id] || rule;
                return (
                  <tr key={rule.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-400 font-bold whitespace-nowrap">
                      {r.eventType}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-100 whitespace-nowrap">
                      {r.eventName}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isAdmin ? (
                        <select
                          value={r.requiredTier}
                          onChange={(e) => handleChange(rule.id, "requiredTier", parseInt(e.target.value))}
                          className="bg-slate-950 border border-slate-700 text-xs text-slate-200 px-2 py-1 rounded focus:outline-none focus:border-blue-500 font-semibold"
                        >
                          <option value={1}>Tier 1 (팀원)</option>
                          <option value={2}>Tier 2 (팀장)</option>
                          <option value={3}>Tier 3 (부서장)</option>
                          <option value={4}>Tier 4 (본부장/임원)</option>
                          <option value={5}>Tier 5 (대표이사)</option>
                        </select>
                      ) : (
                        <span className="font-bold text-blue-400">Tier {r.requiredTier}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleChange(rule.id, "autoConsensus", !r.autoConsensus)}
                        disabled={!isAdmin}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                          r.autoConsensus
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-slate-800 text-slate-500 hover:bg-slate-700"
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
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {r.isActive ? "활성" : "비활성"}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {isAdmin ? (
                        <input
                          type="text"
                          value={r.description || ""}
                          onChange={(e) => handleChange(rule.id, "description", e.target.value)}
                          placeholder="설명 입력"
                          className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-2 py-1 rounded w-full focus:outline-none focus:border-blue-500"
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
