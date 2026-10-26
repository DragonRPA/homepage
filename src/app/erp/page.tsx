"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, ShoppingCart, Truck, Briefcase, FileText, 
  Building2, Shield, CheckSquare, Settings, Calendar, 
  Clock, DollarSign, CreditCard
} from "lucide-react";

import { ErpLogin } from "./components/ErpLogin";
import { ErpHeader } from "./components/ErpHeader";
import { PasswordChangeModal } from "./components/PasswordChangeModal";

// 9대 ebro_it 모방 핵심 모듈 + 4대 기존 비즈니스 도메인
import { OrganizationTab } from "./components/OrganizationTab";
import { PermissionsTab } from "./components/PermissionsTab";
import { ApprovalInboxTab } from "./components/ApprovalInboxTab";
import { ApprovalRulesTab } from "./components/ApprovalRulesTab";
import { LeaveApplyTab } from "./components/LeaveApplyTab";
import { LeaveManageTab } from "./components/LeaveManageTab";
import { OtManagementTab } from "./components/OtManagementTab";
import { BankMatchingTab } from "./components/BankMatchingTab";
import { PayrollTab } from "./components/PayrollTab";

import { TradeTab } from "./components/TradeTab";
import { RentalTab } from "./components/RentalTab";
import { ServiceTab } from "./components/ServiceTab";
import { TaxInvoiceTab } from "./components/TaxInvoiceTab";
import "./erp-theme.css";

export type ErpCategoryKey = "HR" | "APPROVAL" | "FINANCE" | "BUSINESS";

export type ErpMenuKey =
  | "ORG"
  | "PERMISSIONS"
  | "LEAVE_APPLY"
  | "LEAVE_MANAGE"
  | "OT_MANAGE"
  | "APPROVAL_INBOX"
  | "APPROVAL_RULES"
  | "BANK_MATCHING"
  | "PAYROLL"
  | "TAX"
  | "TRADE"
  | "RENTAL"
  | "SERVICES";

interface MenuItem {
  key: ErpMenuKey;
  label: string;
  icon: React.ElementType;
}

interface CategoryConfig {
  key: ErpCategoryKey;
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: "HR",
    label: "인사·근태",
    icon: Users,
    items: [
      { key: "ORG", label: "조직 인사관리", icon: Building2 },
      { key: "PERMISSIONS", label: "사용자 및 권한", icon: Shield },
      { key: "LEAVE_APPLY", label: "연차 신청", icon: Calendar },
      { key: "LEAVE_MANAGE", label: "연차 관리", icon: Users },
      { key: "OT_MANAGE", label: "연장근무 관리", icon: Clock },
    ],
  },
  {
    key: "APPROVAL",
    label: "전자결재",
    icon: CheckSquare,
    items: [
      { key: "APPROVAL_INBOX", label: "내 결재함", icon: CheckSquare },
      { key: "APPROVAL_RULES", label: "결재선 규칙 설정", icon: Settings },
    ],
  },
  {
    key: "FINANCE",
    label: "재무·회계",
    icon: DollarSign,
    items: [
      { key: "BANK_MATCHING", label: "은행 입출금 대장", icon: DollarSign },
      { key: "PAYROLL", label: "급여 정산", icon: CreditCard },
      { key: "TAX", label: "세금계산서 발행", icon: FileText },
    ],
  },
  {
    key: "BUSINESS",
    label: "영업·자산",
    icon: Briefcase,
    items: [
      { key: "TRADE", label: "판매용 (커머스)", icon: ShoppingCart },
      { key: "RENTAL", label: "임대용 (렌탈자산)", icon: Truck },
      { key: "SERVICES", label: "용역 관리 (운영/개발)", icon: Briefcase },
    ],
  },
];

export default function ErpMainPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ErpCategoryKey>("HR");
  const [activeMenu, setActiveMenu] = useState<ErpMenuKey>("ORG");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Restore session & theme from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("dragonrpa_erp_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
      const savedTheme = localStorage.getItem("dragonrpa_erp_theme") as "light" | "dark";
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      } else {
        setTheme("light"); // e-Bro ERP 전사 표준: 밝은화면모드 기본
      }
    } catch (e) {
      console.error("Session restore error:", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("dragonrpa_erp_theme", next);
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("dragonrpa_erp_user");
    setCurrentUser(null);
  };

  const handleSelectCategory = (catKey: ErpCategoryKey) => {
    setActiveCategory(catKey);
    const cat = CATEGORIES.find((c) => c.key === catKey);
    if (cat && cat.items.length > 0) {
      setActiveMenu(cat.items[0].key);
    }
  };

  const navigateToTax = () => {
    setActiveCategory("FINANCE");
    setActiveMenu("TAX");
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-mono">
        시스템 세션을 초기화하는 중입니다...
      </div>
    );
  }

  // Not logged in -> Show Corporate Login
  if (!currentUser) {
    return <ErpLogin onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const currentCategoryConfig = CATEGORIES.find((c) => c.key === activeCategory) || CATEGORIES[0];

  return (
    <div data-theme={theme} className="erp-app-container flex flex-col h-screen w-screen overflow-hidden select-none bg-slate-950 text-slate-100">
      {/* 1. Enterprise Top Header */}
      <ErpHeader
        user={currentUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenPasswordModal={() => setShowPasswordModal(true)}
        onLogout={handleLogout}
      />

      {/* 2. Tier 1: Category Navigation (Gutenberg Z-Pattern Scope) */}
      <nav className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 h-full">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isCatActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => handleSelectCategory(cat.key)}
                className={`h-full px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
                  isCatActive
                    ? "border-blue-500 text-white bg-slate-800/80"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCatActive ? "text-blue-400" : "text-slate-500"}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <span>SSOT: PostgreSQL 17</span>
          <span>|</span>
          <span>e-Bro ERP Architecture</span>
        </div>
      </nav>

      {/* 3. Tier 2: Sub-Menu Bar */}
      <div className="h-9 bg-slate-950/80 border-b border-slate-800/90 px-4 flex items-center gap-1.5 shrink-0 overflow-x-auto">
        {currentCategoryConfig.items.map((item) => {
          const ItemIcon = item.icon;
          const isItemActive = activeMenu === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveMenu(item.key)}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition ${
                isItemActive
                  ? "bg-blue-600 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <ItemIcon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Main Workspace Body (Gutenberg Z-Pattern Center) */}
      <main className="flex-1 overflow-hidden">
        {activeMenu === "ORG" && <OrganizationTab currentUser={currentUser} />}
        {activeMenu === "PERMISSIONS" && <PermissionsTab currentUser={currentUser} />}
        {activeMenu === "LEAVE_APPLY" && <LeaveApplyTab currentUser={currentUser} />}
        {activeMenu === "LEAVE_MANAGE" && <LeaveManageTab currentUser={currentUser} />}
        {activeMenu === "OT_MANAGE" && <OtManagementTab currentUser={currentUser} />}
        {activeMenu === "APPROVAL_INBOX" && <ApprovalInboxTab currentUser={currentUser} />}
        {activeMenu === "APPROVAL_RULES" && <ApprovalRulesTab currentUser={currentUser} />}
        {activeMenu === "BANK_MATCHING" && <BankMatchingTab currentUser={currentUser} />}
        {activeMenu === "PAYROLL" && <PayrollTab currentUser={currentUser} />}
        {activeMenu === "TAX" && <TaxInvoiceTab currentUser={currentUser} />}
        {activeMenu === "TRADE" && <TradeTab currentUser={currentUser} onNavigateToTax={navigateToTax} />}
        {activeMenu === "RENTAL" && <RentalTab currentUser={currentUser} onNavigateToTax={navigateToTax} />}
        {activeMenu === "SERVICES" && <ServiceTab currentUser={currentUser} onNavigateToTax={navigateToTax} />}
      </main>

      {/* 5. Password Change Modal */}
      <PasswordChangeModal
        employeeId={currentUser.id}
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
