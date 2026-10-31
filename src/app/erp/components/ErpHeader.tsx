"use client";

import React from "react";
import { Building2, KeyRound, LogOut, Shield, Sun, Moon, Menu, X } from "lucide-react";
import { BUSINESS_ENTITIES } from "@/lib/businessEntities";

export type EntityScope = "ALL" | "CORP" | "INDIVIDUAL";

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
  selectedEntity: EntityScope;
  onSelectEntity: (entity: EntityScope) => void;
  onToggleTheme: () => void;
  onOpenPasswordModal: () => void;
  onLogout: () => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const ErpHeader: React.FC<ErpHeaderProps> = ({
  user,
  theme,
  selectedEntity,
  onSelectEntity,
  onToggleTheme,
  onOpenPasswordModal,
  onLogout,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) => {
  return (
    <header className="erp-header h-12 md:h-14 px-2.5 md:px-4 flex items-center justify-between gap-2 shrink-0 select-none border-b">
      {/* Brand & Multi-Entity Selector */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* 모바일 전체 메뉴 드로어 토글 버튼 */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden w-8 h-8 rounded border flex items-center justify-center shrink-0 erp-action-btn"
            title="전체 메뉴 열기"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        )}

        <div className="w-7 h-7 md:w-8 md:h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
          <Building2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold tracking-tight text-xs md:text-sm whitespace-nowrap">
            드래곤ERP
          </span>
        </div>

        {/* Global Business Entity Selector (헌장 1.4조 SSOT) */}
        <div className="ml-0.5 md:ml-2 pl-2 md:pl-3 border-l border-slate-400/30 flex items-center gap-1.5 min-w-0">
          <label className="text-[11px] font-semibold opacity-75 hidden lg:inline whitespace-nowrap">
            운영 사업자:
          </label>
          <div className="relative min-w-0">
            <select
              value={selectedEntity}
              onChange={(e) => onSelectEntity(e.target.value as EntityScope)}
              className="h-7 md:h-8 pl-2 pr-6 text-[11px] md:text-xs font-bold rounded border bg-card text-main cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm max-w-[140px] sm:max-w-none truncate"
              title="운영 사업자 선택 (통합 / 법인 / 개인)"
            >
              <option value="ALL">🏢 전체 사업자 (통합)</option>
              <option value="CORP">
                🏛️ {BUSINESS_ENTITIES.CORP.corpName} [법인]
              </option>
              <option value="INDIVIDUAL">
                👤 {BUSINESS_ENTITIES.INDIVIDUAL.corpName} [개인]
              </option>
            </select>
          </div>

          {/* Current Active Entity Badge */}
          {selectedEntity === "CORP" && (
            <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 whitespace-nowrap">
              법인계좌 {BUSINESS_ENTITIES.CORP.bankAccountNo}
            </span>
          )}
          {selectedEntity === "INDIVIDUAL" && (
            <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
              개인계좌 {BUSINESS_ENTITIES.INDIVIDUAL.bankAccountNo}
            </span>
          )}
          {selectedEntity === "ALL" && (
            <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
              법인+개인 통합 매출합산
            </span>
          )}
        </div>
      </div>

      {/* Status & User Actions */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* e-Bro 스타일 화면 모드 전환 버튼 */}
        <button
          onClick={onToggleTheme}
          className="erp-theme-toggle-btn flex items-center gap-1.5 px-2 md:px-2.5 py-1 rounded-full text-xs font-bold border transition shrink-0"
          title={theme === "light" ? "어두운화면모드로 전환" : "밝은화면모드로 전환"}
        >
          {theme === "light" ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">밝은화면</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">어두운화면</span>
            </>
          )}
        </button>

        {/* User Chip */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 border rounded text-xs erp-user-chip whitespace-nowrap">
          <Shield className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-medium">
            {user.name} ({user.position})
          </span>
          <span className="hidden md:inline text-[10px] px-1 rounded opacity-75 font-mono">
            {user.department}
          </span>
          <span className="text-[10px] px-1 rounded bg-blue-900 text-blue-300 font-bold">
            {user.role}
          </span>
        </div>

        {/* Password Change Button */}
        <button
          onClick={onOpenPasswordModal}
          className="erp-action-btn flex items-center gap-1 px-2 py-1 text-xs rounded border transition"
          title="비밀번호 변경"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">비밀번호</span>
        </button>

        {/* Logout Button: Crimson Red with pure white text */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1 px-2 md:px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded border border-rose-700 transition shadow-sm"
          title="로그아웃"
        >
          <LogOut className="w-3.5 h-3.5 text-white" />
          <span className="hidden sm:inline text-white">로그아웃</span>
        </button>
      </div>
    </header>
  );
};
