"use client";

import React from "react";
import { Building2, User, KeyRound, LogOut, CheckCircle2, Shield, Sun, Moon } from "lucide-react";

interface ErpHeaderProps {
  user: {
    id: number;
    employeeNo: string;
    loginId: string;
    name: string;
    position: string;
    department: string;
    role: string;
    email?: string;
  };
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenPasswordModal: () => void;
  onLogout: () => void;
}

export const ErpHeader: React.FC<ErpHeaderProps> = ({
  user,
  theme,
  onToggleTheme,
  onOpenPasswordModal,
  onLogout,
}) => {
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 text-white px-5 flex items-center justify-between shrink-0 select-none">
      {/* Brand & System Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-sm text-slate-100">
              (주)드래곤알피에이 ERP
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-mono font-semibold">
              v2.0 ENTERPRISE
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            dragonrpa-erp / Supabase PostgreSQL
          </span>
        </div>
      </div>

      {/* Status & User Actions */}
      <div className="flex items-center gap-2.5">
        {/* e-Bro 스타일 화면 모드 전환 버튼 */}
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition shrink-0"
          style={{
            backgroundColor: theme === "light" ? "#f1f5f9" : "#1e293b",
            color: theme === "light" ? "#0f172a" : "#f8fafc",
            borderColor: theme === "light" ? "#cbd5e1" : "#475569",
          }}
          title={theme === "light" ? "어두운화면모드(다크모드)로 전환" : "밝은화면모드(라이트모드)로 전환"}
        >
          {theme === "light" ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>밝은화면모드</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-sky-400" />
              <span>어두운화면모드</span>
            </>
          )}
        </button>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>DB 연결됨</span>
        </div>

        {/* User Chip */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium text-slate-200">
            {user.name} ({user.position})
          </span>
          <span className="text-[10px] px-1 rounded bg-slate-700 text-slate-300 font-mono">
            {user.department}
          </span>
          <span className="text-[10px] px-1 rounded bg-blue-900 text-blue-300 font-bold">
            {user.role}
          </span>
        </div>

        {/* Password Change Button */}
        <button
          onClick={onOpenPasswordModal}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition"
          title="비밀번호 변경"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">비밀번호</span>
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-300 hover:text-white bg-rose-950 hover:bg-rose-900 rounded border border-rose-800 transition"
          title="로그아웃"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">로그아웃</span>
        </button>
      </div>
    </header>
  );
};

