"use client";

import React, { useState } from "react";
import { Building2, Lock, User, KeyRound, AlertCircle } from "lucide-react";

interface ErpLoginProps {
  onLoginSuccess: (user: any) => void;
}

export const ErpLogin: React.FC<ErpLoginProps> = ({ onLoginSuccess }) => {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!loginId || !password) {
      setErrorMsg("아이디와 비밀번호를 모두 입력해 주십시오.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/erp/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: loginId.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "로그인 실패");
      }

      // Save user session in localStorage
      localStorage.setItem("dragonrpa_erp_user", JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || "로그인 처리 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-6 text-white">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center shadow-lg mb-3">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-100 tracking-tight">
            (주)드래곤알피에이 ERP
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            통합 엔터프라이즈 기간계 시스템
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 bg-rose-950/80 border border-rose-800 rounded text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>로그인 아이디</span>
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디 입력 (예: admin)"
              autoComplete="username"
              className="h-10 px-3 bg-slate-800 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              <span>비밀번호</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력 (초기: 1111)"
              autoComplete="current-password"
              className="h-10 px-3 bg-slate-800 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? "인증 확인 중..." : "시스템 로그인"}</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 font-mono">
            초기 관리자 계정: admin / 초기 비밀번호: 1111
          </p>
        </div>
      </div>
    </div>
  );
};
