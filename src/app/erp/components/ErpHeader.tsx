"use client";

import React from "react";
import { Building2, KeyRound, LogOut, Shield, Sun, Moon } from "lucide-react";

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
    <header className="erp-header h-14 px-5 flex items-center justify-between shrink-0 select-none border-b">
      {/* Brand & System Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-sm">
              (주)드래곤알피에이 ERP
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-mono font-semibold">
              v2.0 ENTERPRISE
            </span>
          </div>
          <span className="text-[11px] opacity-70 font-mono">
            dragonrpa-erp / Supabase PostgreSQL
          </span>
        </div>
      </div>

      {/* Status & User Actions */}
      <div className="flex items-center gap-2.5">
        {/* e-Bro 스타일 화면 모드 전환 버튼 */}
        <button
          onClick={onToggleTheme}
          className="erp-theme-toggle-btn flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition shrink-0"
          title={theme === "light" ? "어두운화면모드(다크모드)로 전환" : "밝은화면모드(라이트모드)로 전환"}
        >
          {theme === "light" ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span>밝은화면모드</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-sky-400" />
              <span>어두운화면모드</span>
            </>
          )}
        </button>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs opacity-90 erp-db-badge">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>DB 연결됨</span>
        </div>

        {/* User Chip */}
        <div className="flex items-center gap-2 px-3 py-1 border rounded text-xs erp-user-chip">
          <Shield className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-medium">
            {user.name} ({user.position})
          </span>
          <span className="text-[10px] px-1 rounded opacity-75 font-mono">
            {user.department}
          </span>
          <span className="text-[10px] px-1 rounded bg-blue-900 text-blue-300 font-bold">
            {user.role}
          </span>
        </div>

        {/* Password Change Button */}
        <button
          onClick={onOpenPasswordModal}
          className="erp-action-btn flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition"
          title="비밀번호 변경"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">비밀번호</span>
        </button>

        {/* Logout Button: Colored Crimson Red with pure white text */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded border border-rose-700 transition shadow-sm"
          title="로그아웃"
        >
          <LogOut className="w-3.5 h-3.5 text-white" />
          <span className="hidden sm:inline text-white">로그아웃</span>
        </button>
      </div>
    </header>
  );
};
