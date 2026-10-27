"use client";

import React, { useState } from "react";
import { KeyRound, X, CheckCircle2, AlertCircle } from "lucide-react";

interface PasswordChangeModalProps {
  employeeId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  employeeId,
  isOpen,
  onClose,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg("모든 필드를 입력해 주십시오.");
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg("새 비밀번호는 4자리 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/erp/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "비밀번호 변경 실패");
      }

      setSuccessMsg("비밀번호가 성공적으로 변경되었습니다.");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#f4efe4] border border-[#b5a894] w-full max-w-md rounded-xl shadow-2xl p-5 text-[#0f172a] animate-in fade-in zoom-in-95 duration-150 dark:bg-slate-900 dark:border-slate-700 dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] dark:border-slate-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#1d4ed8] dark:text-blue-400" />
            <h3 className="font-bold text-sm text-[#0f172a] dark:text-slate-100">비밀번호 변경</h3>
          </div>
          <button onClick={onClose} className="text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2 bg-[#fef2f2] border border-[#dc2626] rounded text-[#b91c1c] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#dc2626]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 p-2 bg-[#ecfdf5] border border-[#047857] rounded text-[#065f46] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#047857]" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#334155] dark:text-slate-400">현재 비밀번호</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호 입력"
              className="h-9 px-3 bg-[#ebe5d8] border border-[#b5a894] rounded text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#334155] dark:text-slate-400">새 비밀번호 (4자리 이상)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호 입력"
              className="h-9 px-3 bg-[#ebe5d8] border border-[#b5a894] rounded text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#334155] dark:text-slate-400">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호 다시 입력"
              className="h-9 px-3 bg-[#ebe5d8] border border-[#b5a894] rounded text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[#b5a894] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#ebe5d8] hover:bg-[#d0c6b4] text-xs text-[#334155] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-xs font-bold text-white rounded transition disabled:opacity-50"
            >
              {loading ? "변경 중..." : "변경 확인"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
