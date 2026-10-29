"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, ShoppingCart, Truck, Briefcase, FileText, 
  Building2, Shield, CheckSquare, Settings, Calendar, 
  Clock, DollarSign, CreditCard, ChevronDown, ChevronRight,
  FolderTree, Database, Package, Layers, PackageCheck, PackagePlus, ArrowLeftRight
} from "lucide-react";

import { ErpLogin } from "./components/ErpLogin";
import { ErpHeader, EntityScope } from "./components/ErpHeader";
import { PasswordChangeModal } from "./components/PasswordChangeModal";

// ebro_it 모방 핵심 모듈군
import { OrganizationTab } from "./components/OrganizationTab";
import { PermissionsTab } from "./components/PermissionsTab";
import { ApprovalInboxTab } from "./components/ApprovalInboxTab";
import { ApprovalRulesTab } from "./components/ApprovalRulesTab";
import { LeaveApplyTab } from "./components/LeaveApplyTab";
import { LeaveManageTab } from "./components/LeaveManageTab";
import { OtManagementTab } from "./components/OtManagementTab";
import { BankMatchingTab } from "./components/BankMatchingTab";
import { PayrollTab } from "./components/PayrollTab";

// ebro_it 제품관리 및 자산관리
import { ProductManagementTab } from "./components/ProductManagementTab";
import { AssetManagementTab } from "./components/AssetManagementTab";

// 거래처 관리 (고객 관리 & 매입거래처 관리)
import { PartnerManagementTab } from "./components/PartnerManagementTab";

// 영업 및 서비스 도메인
import { TradeTab } from "./components/TradeTab";
import { RentalTab } from "./components/RentalTab";
import { ServiceTab } from "./components/ServiceTab";
import { TaxInvoiceTab } from "./components/TaxInvoiceTab";
import { OutboundRegTab } from "./components/OutboundRegTab";
import { InboundRegTab } from "./components/InboundRegTab";
import "./erp-theme.css";

export type ErpCategoryKey = "HR" | "APPROVAL" | "FINANCE" | "PARTNER" | "ASSET" | "INOUT" | "BUSINESS";

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
  | "CUSTOMER"
  | "VENDOR"
  | "PRODUCT"
  | "ASSET"
  | "OUTBOUND_REG"
  | "INBOUND_REG"
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
      { key: "OT_MANAGE", label: "초과근무 관리", icon: Clock },
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
    key: "PARTNER",
    label: "거래처 관리",
    icon: Building2,
    items: [
      { key: "CUSTOMER", label: "고객 관리 (매출처)", icon: Users },
      { key: "VENDOR", label: "매입거래처 관리", icon: Truck },
    ],
  },
  {
    key: "ASSET",
    label: "자산관리",
    icon: Layers,
    items: [
      { key: "PRODUCT", label: "제품 관리", icon: Package },
      { key: "ASSET", label: "자산 관리", icon: Layers },
    ],
  },
  {
    key: "INOUT",
    label: "입출고관리",
    icon: ArrowLeftRight,
    items: [
      { key: "OUTBOUND_REG", label: "출고등록", icon: PackageCheck },
      { key: "INBOUND_REG", label: "입고등록", icon: PackagePlus },
    ],
  },
  {
    key: "BUSINESS",
    label: "영업·계약",
    icon: Briefcase,
    items: [
      { key: "TRADE", label: "판매용 (커머스)", icon: ShoppingCart },
      { key: "RENTAL", label: "임대 계약/청구", icon: Truck },
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
  const [selectedEntity, setSelectedEntity] = useState<EntityScope>("ALL");

  // Accordion open/close state for tree groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    HR: true,
    APPROVAL: true,
    FINANCE: true,
    PARTNER: true,
    ASSET: true,
    INOUT: true,
    BUSINESS: true,
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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

      const savedEntity = localStorage.getItem("dragonrpa_erp_entity") as EntityScope;
      if (savedEntity === "ALL" || savedEntity === "CORP" || savedEntity === "INDIVIDUAL") {
        setSelectedEntity(savedEntity);
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

  const navigateToTax = () => {
    setActiveCategory("FINANCE");
    setActiveMenu("TAX");
    setExpandedGroups((prev) => ({ ...prev, FINANCE: true }));
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-mono erp-app-container">
        시스템 세션을 초기화하는 중입니다...
      </div>
    );
  }

  // Not logged in -> Show Corporate Login
  if (!currentUser) {
    return <ErpLogin onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const currentCategoryConfig = CATEGORIES.find((c) => c.key === activeCategory) || CATEGORIES[0];
  const currentMenuItem = currentCategoryConfig.items.find((i) => i.key === activeMenu) || 
    CATEGORIES.flatMap((c) => c.items).find((i) => i.key === activeMenu);

  return (
    <div data-theme={theme} className={`erp-app-container ${theme === 'dark' ? 'dark' : ''} flex flex-col h-screen w-screen overflow-hidden select-none`}>
      {/* 1. Enterprise Top Header */}
      <ErpHeader
        user={currentUser}
        theme={theme}
        selectedEntity={selectedEntity}
        onSelectEntity={(e) => {
          setSelectedEntity(e);
          try {
            localStorage.setItem("dragonrpa_erp_entity", e);
          } catch (err) {}
        }}
        onToggleTheme={toggleTheme}
        onOpenPasswordModal={() => setShowPasswordModal(true)}
        onLogout={handleLogout}
      />

      {/* 2. Main Layout Body: Left Tree Sidebar + Right Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left Menu Panel (Tree Navigation Sidebar) */}
        <aside className="erp-sidebar w-64 h-full flex flex-col shrink-0 select-none overflow-hidden">
          {/* Sidebar Top: System Overview */}
          <div className="erp-sidebar-header p-3 px-4 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs font-bold tracking-tight erp-sidebar-title">
                메뉴 트리 구조
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold erp-sidebar-badge">
              {CATEGORIES.length}그룹 {CATEGORIES.reduce((s, c) => s + c.items.length, 0)}메뉴
            </span>
          </div>

          {/* Accordion Menu Group Tree */}
          <div className="flex-1 p-2.5 flex flex-col gap-1.5 overflow-y-auto erp-sidebar-menu-list">
            {CATEGORIES.map((cat) => {
              const GroupIcon = cat.icon;
              const isExpanded = expandedGroups[cat.key] !== false;
              const hasActiveChild = cat.items.some((item) => item.key === activeMenu);

              return (
                <div key={cat.key} className="flex flex-col">
                  {/* Accordion Group Header Button */}
                  <button
                    onClick={() => toggleGroup(cat.key)}
                    className={`erp-menu-group-btn flex items-center justify-between w-full px-2.5 py-2 rounded text-xs font-bold transition ${
                      hasActiveChild ? "group-active" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-4 flex items-center justify-center shrink-0">
                        <GroupIcon className="w-4 h-4" />
                      </span>
                      <span className="truncate">{cat.label}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono opacity-70">
                        {cat.items.length}
                      </span>
                    </div>
                    <span className="shrink-0 opacity-60">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                  </button>

                  {/* Submenu Tree Items (Indented with vertical connecting guide line) */}
                  {isExpanded && (
                    <div className="erp-submenu-tree ml-3.5 pl-2.5 my-1 border-l-2 flex flex-col gap-0.5">
                      {cat.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemActive = activeMenu === item.key;

                        return (
                          <button
                            key={item.key}
                            onClick={() => {
                              setActiveMenu(item.key);
                              setActiveCategory(cat.key);
                            }}
                            className={`erp-menu-item-btn flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs text-left transition ${
                              isItemActive ? "item-active" : ""
                            }`}
                          >
                            <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate font-medium">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer Info */}
          <div className="erp-sidebar-footer p-2.5 px-3 border-t text-[11px] font-mono flex flex-col gap-1 shrink-0">
            <div className="flex items-center justify-between">
              <span className="opacity-75">DB 상태</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                정상 연결
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="opacity-75">아키텍처</span>
              <span>e-Bro ERP Standard</span>
            </div>
            <div className="flex items-center justify-between text-[10px] opacity-60 border-t pt-1 mt-0.5 border-dashed">
              <span>{currentUser.name} ({currentUser.position})</span>
              <span>{currentUser.role}</span>
            </div>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="erp-main-content flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          {/* Current Active Tab Breadcrumb Bar */}
          <div className="erp-breadcrumb-bar px-4 py-2 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="opacity-60">{currentCategoryConfig.label}</span>
              <span className="opacity-40">/</span>
              <span className="font-bold flex items-center gap-1.5">
                {currentMenuItem && <currentMenuItem.icon className="w-3.5 h-3.5 text-blue-600" />}
                {currentMenuItem?.label}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono opacity-70">
              <Database className="w-3 h-3 text-blue-600" />
              <span>PostgreSQL 17 SSOT</span>
              <span>|</span>
              <span>dragonrpa-erp</span>
            </div>
          </div>

          {/* Tab Content Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto">
            {activeMenu === "ORG" && <OrganizationTab currentUser={currentUser} />}
            {activeMenu === "PERMISSIONS" && <PermissionsTab currentUser={currentUser} />}
            {activeMenu === "LEAVE_APPLY" && <LeaveApplyTab currentUser={currentUser} />}
            {activeMenu === "LEAVE_MANAGE" && <LeaveManageTab currentUser={currentUser} />}
            {activeMenu === "OT_MANAGE" && <OtManagementTab currentUser={currentUser} />}
            {activeMenu === "APPROVAL_INBOX" && <ApprovalInboxTab currentUser={currentUser} />}
            {activeMenu === "APPROVAL_RULES" && <ApprovalRulesTab currentUser={currentUser} />}
            {activeMenu === "BANK_MATCHING" && (
              <BankMatchingTab currentUser={currentUser} selectedEntity={selectedEntity} />
            )}
            {activeMenu === "PAYROLL" && <PayrollTab currentUser={currentUser} />}
            {activeMenu === "TAX" && (
              <TaxInvoiceTab 
                currentUser={currentUser} 
                selectedEntity={selectedEntity}
                onSelectEntity={(e) => {
                  setSelectedEntity(e);
                  try {
                    localStorage.setItem("dragonrpa_erp_entity", e);
                  } catch (err) {}
                }}
              />
            )}
            {(activeMenu === "CUSTOMER" || activeMenu === "VENDOR") && (
              <PartnerManagementTab
                currentUser={currentUser}
                initialType={activeMenu === "VENDOR" ? "VENDOR" : "CUSTOMER"}
                onSelectTypeTab={(type) => {
                  if (type === "CUSTOMER" || type === "VENDOR") {
                    setActiveMenu(type);
                    setActiveCategory("PARTNER");
                  }
                }}
                onNavigateToTax={navigateToTax}
              />
            )}
            {activeMenu === "PRODUCT" && (
              <ProductManagementTab 
                currentUser={currentUser} 
                onNavigateToAsset={() => {
                  setActiveCategory("ASSET");
                  setActiveMenu("ASSET");
                }}
              />
            )}
            {activeMenu === "ASSET" && <AssetManagementTab currentUser={currentUser} />}
            {activeMenu === "OUTBOUND_REG" && (
              <div className="p-4">
                <OutboundRegTab currentUser={currentUser} />
              </div>
            )}
            {activeMenu === "INBOUND_REG" && (
              <div className="p-4">
                <InboundRegTab currentUser={currentUser} />
              </div>
            )}
            {activeMenu === "TRADE" && (
              <TradeTab 
                currentUser={currentUser} 
                selectedEntity={selectedEntity}
                onNavigateToTax={navigateToTax} 
              />
            )}
            {activeMenu === "RENTAL" && (
              <RentalTab 
                currentUser={currentUser} 
                selectedEntity={selectedEntity}
                onNavigateToTax={navigateToTax} 
              />
            )}
            {activeMenu === "SERVICES" && (
              <ServiceTab 
                currentUser={currentUser} 
                selectedEntity={selectedEntity}
                onNavigateToTax={navigateToTax} 
              />
            )}
          </div>
        </main>
      </div>

      {/* Password Change Modal */}
      <PasswordChangeModal
        employeeId={currentUser.id}
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
