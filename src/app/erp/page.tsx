"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, ShoppingCart, Truck, Briefcase, FileText, 
  Building2, Shield, CheckSquare, Settings, Calendar, 
  Clock, DollarSign, CreditCard, ChevronDown, ChevronRight,
  FolderTree, Database, Package, Layers, PackageCheck, PackagePlus, ArrowLeftRight, BookOpen,
  SlidersHorizontal, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, X, Star
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
import { WorkRulesTab } from "./components/WorkRulesTab";
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
  | "WORK_RULES"
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
      { key: "WORK_RULES", label: "취업규칙 (표준안)", icon: BookOpen },
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
      { key: "TAX", label: "매입·매출 세금계산서", icon: FileText },
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

const MENU_PERM_KEY_MAP: Record<ErpMenuKey, string> = {
  ORG: "org",
  PERMISSIONS: "users",
  LEAVE_APPLY: "leave_apply",
  LEAVE_MANAGE: "leave_manage",
  OT_MANAGE: "ot_manage",
  WORK_RULES: "work_rules",
  APPROVAL_INBOX: "approval_inbox",
  APPROVAL_RULES: "approval_rules",
  BANK_MATCHING: "bank_matching",
  PAYROLL: "payroll",
  TAX: "tax_invoice",
  CUSTOMER: "customer",
  VENDOR: "vendor",
  PRODUCT: "product",
  ASSET: "asset",
  OUTBOUND_REG: "outbound_reg",
  INBOUND_REG: "inbound_reg",
  TRADE: "trade",
  RENTAL: "rental",
  SERVICES: "service",
};

export default function ErpMainPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ErpCategoryKey>("HR");
  const [activeMenu, setActiveMenu] = useState<ErpMenuKey>("ORG");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedEntity, setSelectedEntity] = useState<EntityScope>("ALL");
  const [rolePerms, setRolePerms] = useState<
    Array<{ roleCode: string; menuKey: string; canView: boolean; canSave: boolean; canBill?: boolean }>
  >([]);
  const [employeeRolesMap, setEmployeeRolesMap] = useState<
    Record<number, { role: string; roleCode: string }>
  >({});
  const [permsLoaded, setPermsLoaded] = useState(false);

  // 메뉴 개인화 (사용자별 그룹 순서, 메뉴 순서, 숨김 메뉴, 기본 시작 메뉴)
  const [showMenuPersonalizeModal, setShowMenuPersonalizeModal] = useState(false);
  const [menuPrefs, setMenuPrefs] = useState<{
    categoryOrder: ErpCategoryKey[];
    itemOrder: Partial<Record<ErpCategoryKey, ErpMenuKey[]>>;
    hiddenMenus: ErpMenuKey[];
    defaultMenu?: ErpMenuKey;
  }>({
    categoryOrder: CATEGORIES.map((c) => c.key),
    itemOrder: {},
    hiddenMenus: [],
  });

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

  const fetchRolePermissions = async () => {
    try {
      const res = await fetch("/api/erp/permissions");
      const data = await res.json();
      if (data.success && Array.isArray(data.permissions)) {
        setRolePerms(data.permissions);
      }
      if (data.success && Array.isArray(data.employeeRoles)) {
        const map: Record<number, { role: string; roleCode: string }> = {};
        for (const emp of data.employeeRoles) {
          map[Number(emp.id)] = {
            role: emp.role || "",
            roleCode: emp.roleCode || "",
          };
        }
        setEmployeeRolesMap(map);
      }
    } catch (e) {
      console.error("Failed to load role permissions:", e);
    } finally {
      setPermsLoaded(true);
    }
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

  useEffect(() => {
    if (currentUser) {
      setPermsLoaded(false);
      fetchRolePermissions();
      try {
        const prefKey = `dragonrpa_erp_menu_prefs_${currentUser.id || currentUser.loginId || "default"}`;
        const rawPref = localStorage.getItem(prefKey);
        if (rawPref) {
          const parsed = JSON.parse(rawPref);
          const validCatKeys = CATEGORIES.map((c) => c.key);
          const mergedCatOrder = [
            ...(Array.isArray(parsed.categoryOrder)
              ? parsed.categoryOrder.filter((k: any) => validCatKeys.includes(k))
              : []),
            ...validCatKeys.filter((k) => !(parsed.categoryOrder || []).includes(k)),
          ];
          setMenuPrefs({
            categoryOrder: mergedCatOrder,
            itemOrder: parsed.itemOrder || {},
            hiddenMenus: Array.isArray(parsed.hiddenMenus) ? parsed.hiddenMenus : [],
            defaultMenu: parsed.defaultMenu || undefined,
          });
          if (parsed.defaultMenu) {
            const matchedCat = CATEGORIES.find((c) => c.items.some((i) => i.key === parsed.defaultMenu));
            if (matchedCat) {
              setActiveCategory(matchedCat.key);
              setActiveMenu(parsed.defaultMenu);
            }
          }
        } else {
          setMenuPrefs({
            categoryOrder: CATEGORIES.map((c) => c.key),
            itemOrder: {},
            hiddenMenus: [],
          });
        }
      } catch (err) {
        console.error("Failed to load menu prefs:", err);
      }
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.roleCode]);

  const saveMenuPrefs = (nextPrefs: typeof menuPrefs) => {
    setMenuPrefs(nextPrefs);
    try {
      const prefKey = `dragonrpa_erp_menu_prefs_${currentUser?.id || currentUser?.loginId || "default"}`;
      localStorage.setItem(prefKey, JSON.stringify(nextPrefs));
    } catch (err) {
      console.error("Failed to save menu prefs:", err);
    }
  };

  const effectiveRoleCode = React.useMemo(() => {
    if (!currentUser) return "EMPLOYEE";
    const dbEmp = employeeRolesMap[Number(currentUser.id)];
    const r = String(dbEmp?.role || currentUser.role || "").toUpperCase();
    const rc = String(dbEmp?.roleCode || currentUser.roleCode || "").toUpperCase();
    if (currentUser.loginId === "admin" || r === "ADMIN" || r === "SUPER_ADMIN" || rc === "ADMIN") {
      return "ADMIN";
    }
    if (rc) return rc;
    if (r === "MANAGER") return "MANAGER";
    return "EMPLOYEE";
  }, [currentUser, employeeRolesMap]);

  // 역할 권한 기준 허용된 원본 카테고리/메뉴
  const permittedCategories = React.useMemo(() => {
    if (effectiveRoleCode === "ADMIN") {
      return CATEGORIES;
    }
    if (!permsLoaded) {
      return [];
    }
    const allowedSet = new Set(
      rolePerms
        .filter((p) => p.roleCode === effectiveRoleCode && p.canView)
        .map((p) => p.menuKey)
    );
    // 근로기준법 제14조에 의거하여 취업규칙(work_rules)은 모든 임직원에게 항상 열람 허용
    allowedSet.add("work_rules");
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => allowedSet.has(MENU_PERM_KEY_MAP[item.key])),
    })).filter((cat) => cat.items.length > 0);
  }, [effectiveRoleCode, permsLoaded, rolePerms]);

  // 사용자 메뉴 개인화(그룹 정렬, 메뉴 정렬, 숨김 메뉴)가 반영된 최종 사이드바 트리
  const visibleCategories = React.useMemo(() => {
    const hiddenSet = new Set(menuPrefs.hiddenMenus || []);
    const catOrder = menuPrefs.categoryOrder || [];

    const orderedCats = [...permittedCategories].sort((a, b) => {
      const idxA = catOrder.indexOf(a.key);
      const idxB = catOrder.indexOf(b.key);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    return orderedCats
      .map((cat) => {
        const customItemOrder = menuPrefs.itemOrder?.[cat.key] || [];
        const sortedItems = [...cat.items]
          .filter((item) => !hiddenSet.has(item.key))
          .sort((a, b) => {
            const ia = customItemOrder.indexOf(a.key);
            const ib = customItemOrder.indexOf(b.key);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
          });
        return {
          ...cat,
          items: sortedItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [permittedCategories, menuPrefs]);

  // 현재 선택된 메뉴가 권한 허용 목록에 없으면 첫 번째 허용 메뉴로 자동 전환
  useEffect(() => {
    if (!currentUser || visibleCategories.length === 0) return;
    const isCurrentAllowed = visibleCategories.some((cat) =>
      cat.items.some((item) => item.key === activeMenu)
    );
    if (!isCurrentAllowed) {
      const firstCat = visibleCategories[0];
      const firstItem = firstCat.items[0];
      if (firstCat && firstItem) {
        setActiveCategory(firstCat.key);
        setActiveMenu(firstItem.key);
      }
    }
  }, [currentUser, visibleCategories, activeMenu]);

  const activeMenuCanSave = React.useMemo(() => {
    if (effectiveRoleCode === "ADMIN") return true;
    const permKey = MENU_PERM_KEY_MAP[activeMenu];
    const found = rolePerms.find(
      (p) => p.roleCode === effectiveRoleCode && p.menuKey === permKey
    );
    return found ? Boolean(found.canSave) : false;
  }, [effectiveRoleCode, activeMenu, rolePerms]);

  const activeMenuCanBill = React.useMemo(() => {
    if (effectiveRoleCode === "ADMIN") return true;
    const permKey = MENU_PERM_KEY_MAP[activeMenu];
    const found = rolePerms.find(
      (p) => p.roleCode === effectiveRoleCode && p.menuKey === permKey
    );
    return found ? Boolean(found.canBill) : false;
  }, [effectiveRoleCode, activeMenu, rolePerms]);

  const enrichedUser = React.useMemo(() => {
    if (!currentUser) return null;
    return {
      ...currentUser,
      roleCode: effectiveRoleCode,
      canSave: activeMenuCanSave,
      canBill: activeMenuCanBill,
    };
  }, [currentUser, effectiveRoleCode, activeMenuCanSave, activeMenuCanBill]);

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

  if (!isInitialized || (currentUser && !permsLoaded && effectiveRoleCode !== "ADMIN")) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-mono erp-app-container">
        시스템 세션 및 권한을 초기화하는 중입니다...
      </div>
    );
  }

  // Not logged in -> Show Corporate Login
  if (!currentUser) {
    return <ErpLogin onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const currentCategoryConfig =
    visibleCategories.find((c) => c.key === activeCategory) || visibleCategories[0] || CATEGORIES[0];
  const currentMenuItem =
    currentCategoryConfig?.items.find((i) => i.key === activeMenu) ||
    visibleCategories.flatMap((c) => c.items).find((i) => i.key === activeMenu);

  const isMenuAllowed = visibleCategories.some((c) => c.items.some((i) => i.key === activeMenu));

  return (
    <div data-theme={theme} className={`erp-app-container ${theme === 'dark' ? 'dark' : ''} flex flex-col h-screen w-screen overflow-hidden select-none`}>
      {/* 1. Enterprise Top Header */}
      <ErpHeader
        user={enrichedUser}
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
              {visibleCategories.length}그룹 {visibleCategories.reduce((s, c) => s + c.items.length, 0)}메뉴
            </span>
          </div>

          {/* Accordion Menu Group Tree */}
          <div className="flex-1 p-2.5 flex flex-col gap-1.5 overflow-y-auto erp-sidebar-menu-list">
            {visibleCategories.map((cat) => {
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

          {/* Sidebar Footer: 메뉴 개인화 */}
          <div className="erp-sidebar-footer p-2.5 border-t shrink-0">
            <button
              type="button"
              onClick={() => setShowMenuPersonalizeModal(true)}
              className="w-full py-2 px-3 rounded border text-xs font-bold flex items-center justify-between transition hover:opacity-85 erp-action-btn"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                <span>메뉴 개인화</span>
              </span>
              {menuPrefs.hiddenMenus.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-600/15 text-blue-700 dark:text-blue-300">
                  숨김 {menuPrefs.hiddenMenus.length}
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="erp-main-content flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          {/* Current Active Tab Breadcrumb Bar */}
          <div className="erp-breadcrumb-bar px-4 py-2 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="opacity-60">{currentCategoryConfig?.label}</span>
              <span className="opacity-40">/</span>
              <span className="font-bold flex items-center gap-1.5">
                {currentMenuItem && <currentMenuItem.icon className="w-3.5 h-3.5 text-blue-600" />}
                {currentMenuItem?.label}
              </span>
            </div>
          </div>

          {/* Tab Content Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto">
            {!isMenuAllowed ? (
              <div className="p-8 text-center text-xs text-slate-500">
                접근 권한이 부여된 메뉴가 없습니다. 관리자에게 권한 배정을 요청해 주십시오.
              </div>
            ) : (
              <>
                {activeMenu === "ORG" && <OrganizationTab currentUser={enrichedUser} />}
                {activeMenu === "PERMISSIONS" && (
                  <PermissionsTab
                    currentUser={enrichedUser}
                    onPermissionsChanged={fetchRolePermissions}
                  />
                )}
                {activeMenu === "LEAVE_APPLY" && <LeaveApplyTab currentUser={enrichedUser} />}
                {activeMenu === "LEAVE_MANAGE" && <LeaveManageTab currentUser={enrichedUser} />}
                {activeMenu === "OT_MANAGE" && <OtManagementTab currentUser={enrichedUser} />}
                {activeMenu === "WORK_RULES" && <WorkRulesTab currentUser={enrichedUser} />}
                {activeMenu === "APPROVAL_INBOX" && <ApprovalInboxTab currentUser={enrichedUser} />}
                {activeMenu === "APPROVAL_RULES" && <ApprovalRulesTab currentUser={enrichedUser} />}
                {activeMenu === "BANK_MATCHING" && (
                  <BankMatchingTab currentUser={enrichedUser} selectedEntity={selectedEntity} />
                )}
                {activeMenu === "PAYROLL" && <PayrollTab currentUser={enrichedUser} />}
                {activeMenu === "TAX" && (
                  <TaxInvoiceTab 
                    currentUser={enrichedUser} 
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
                    currentUser={enrichedUser}
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
                    currentUser={enrichedUser} 
                    onNavigateToAsset={() => {
                      setActiveCategory("ASSET");
                      setActiveMenu("ASSET");
                    }}
                  />
                )}
                {activeMenu === "ASSET" && <AssetManagementTab currentUser={enrichedUser} />}
                {activeMenu === "OUTBOUND_REG" && (
                  <div className="p-4">
                    <OutboundRegTab currentUser={enrichedUser} />
                  </div>
                )}
                {activeMenu === "INBOUND_REG" && (
                  <div className="p-4">
                    <InboundRegTab currentUser={enrichedUser} />
                  </div>
                )}
                {activeMenu === "TRADE" && (
                  <TradeTab 
                    currentUser={enrichedUser} 
                    selectedEntity={selectedEntity}
                    onNavigateToTax={navigateToTax} 
                  />
                )}
                {activeMenu === "RENTAL" && (
                  <RentalTab 
                    currentUser={enrichedUser} 
                    selectedEntity={selectedEntity}
                    onNavigateToTax={navigateToTax} 
                  />
                )}
                {activeMenu === "SERVICES" && (
                  <ServiceTab 
                    currentUser={enrichedUser} 
                    selectedEntity={selectedEntity}
                    onNavigateToTax={navigateToTax} 
                  />
                )}
              </>
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

      {/* 메뉴 개인화 설정 모달 */}
      {showMenuPersonalizeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] dark:bg-slate-900 border-2 border-[#b5a894] dark:border-slate-700 rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden text-[#0f172a] dark:text-slate-100">
            <div className="px-4 py-3 border-b border-[#b5a894] dark:border-slate-800 bg-[#dfd7c7] dark:bg-slate-950 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span className="text-xs font-bold">메뉴 개인화 설정</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMenuPersonalizeModal(false)}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {(() => {
                const catOrder = menuPrefs.categoryOrder || [];
                const orderedPermittedCats = [...permittedCategories].sort((a, b) => {
                  const ia = catOrder.indexOf(a.key);
                  const ib = catOrder.indexOf(b.key);
                  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                });

                const moveCategory = (catKey: ErpCategoryKey, dir: -1 | 1) => {
                  const currentKeys = orderedPermittedCats.map((c) => c.key);
                  const idx = currentKeys.indexOf(catKey);
                  const targetIdx = idx + dir;
                  if (idx < 0 || targetIdx < 0 || targetIdx >= currentKeys.length) return;
                  const nextKeys = [...currentKeys];
                  const [moved] = nextKeys.splice(idx, 1);
                  nextKeys.splice(targetIdx, 0, moved);
                  saveMenuPrefs({
                    ...menuPrefs,
                    categoryOrder: nextKeys,
                  });
                };

                const moveItem = (catKey: ErpCategoryKey, items: MenuItem[], itemKey: ErpMenuKey, dir: -1 | 1) => {
                  const currentKeys = items.map((i) => i.key);
                  const idx = currentKeys.indexOf(itemKey);
                  const targetIdx = idx + dir;
                  if (idx < 0 || targetIdx < 0 || targetIdx >= currentKeys.length) return;
                  const nextKeys = [...currentKeys];
                  const [moved] = nextKeys.splice(idx, 1);
                  nextKeys.splice(targetIdx, 0, moved);
                  saveMenuPrefs({
                    ...menuPrefs,
                    itemOrder: {
                      ...menuPrefs.itemOrder,
                      [catKey]: nextKeys,
                    },
                  });
                };

                const toggleHideMenu = (itemKey: ErpMenuKey) => {
                  const isHidden = menuPrefs.hiddenMenus.includes(itemKey);
                  const nextHidden = isHidden
                    ? menuPrefs.hiddenMenus.filter((k) => k !== itemKey)
                    : [...menuPrefs.hiddenMenus, itemKey];
                  saveMenuPrefs({
                    ...menuPrefs,
                    hiddenMenus: nextHidden,
                  });
                };

                const toggleDefaultMenu = (itemKey: ErpMenuKey) => {
                  saveMenuPrefs({
                    ...menuPrefs,
                    defaultMenu: menuPrefs.defaultMenu === itemKey ? undefined : itemKey,
                  });
                };

                return orderedPermittedCats.map((cat, catIdx) => {
                  const customItemOrder = menuPrefs.itemOrder?.[cat.key] || [];
                  const sortedAllItems = [...cat.items].sort((a, b) => {
                    const ia = customItemOrder.indexOf(a.key);
                    const ib = customItemOrder.indexOf(b.key);
                    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                  });
                  const GroupIcon = cat.icon;

                  return (
                    <div
                      key={cat.key}
                      className="rounded border border-[#b5a894] dark:border-slate-800 bg-[#f4efe4] dark:bg-slate-950 overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-[#ded6c5] dark:bg-slate-900 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold">
                          <GroupIcon className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                          <span>{cat.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={catIdx === 0}
                            onClick={() => moveCategory(cat.key, -1)}
                            className="p-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 disabled:opacity-30 hover:bg-[#d0c6b4]"
                            title="그룹 위로 이동"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={catIdx === orderedPermittedCats.length - 1}
                            onClick={() => moveCategory(cat.key, 1)}
                            className="p-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 disabled:opacity-30 hover:bg-[#d0c6b4]"
                            title="그룹 아래로 이동"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="divide-y divide-[#d0c6b4] dark:divide-slate-800">
                        {sortedAllItems.map((item, itemIdx) => {
                          const ItemIcon = item.icon;
                          const isHidden = menuPrefs.hiddenMenus.includes(item.key);
                          const isDefault = menuPrefs.defaultMenu === item.key;

                          return (
                            <div
                              key={item.key}
                              className={`px-3 py-2 flex items-center justify-between gap-2 ${
                                isHidden ? "opacity-45 bg-black/5 dark:bg-white/5" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ItemIcon className="w-3.5 h-3.5 shrink-0 text-[#475569] dark:text-slate-400" />
                                <span className={`truncate font-medium ${isHidden ? "line-through" : ""}`}>
                                  {item.label}
                                </span>
                                {isDefault && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    시작메뉴
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => toggleDefaultMenu(item.key)}
                                  className={`px-1.5 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${
                                    isDefault
                                      ? "bg-amber-500 text-white border-amber-600"
                                      : "bg-[#ebe5d8] dark:bg-slate-800 border-[#b5a894] dark:border-slate-700 opacity-75 hover:opacity-100"
                                  }`}
                                  title="로그인 시 기본 시작 메뉴 지정"
                                >
                                  <Star className="w-3 h-3" />
                                  <span>시작</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={itemIdx === 0}
                                  onClick={() => moveItem(cat.key, sortedAllItems, item.key, -1)}
                                  className="p-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 disabled:opacity-30 hover:bg-[#d0c6b4]"
                                  title="메뉴 위로 이동"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={itemIdx === sortedAllItems.length - 1}
                                  onClick={() => moveItem(cat.key, sortedAllItems, item.key, 1)}
                                  className="p-1 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 disabled:opacity-30 hover:bg-[#d0c6b4]"
                                  title="메뉴 아래로 이동"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleHideMenu(item.key)}
                                  className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${
                                    isHidden
                                      ? "bg-rose-600 text-white border-rose-700"
                                      : "bg-[#ebe5d8] dark:bg-slate-800 border-[#b5a894] dark:border-slate-700 hover:bg-[#d0c6b4]"
                                  }`}
                                  title={isHidden ? "메뉴 표시" : "메뉴 숨김"}
                                >
                                  {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  <span>{isHidden ? "숨김" : "표시"}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="px-4 py-3 border-t border-[#b5a894] dark:border-slate-800 bg-[#dfd7c7] dark:bg-slate-950 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  saveMenuPrefs({
                    categoryOrder: CATEGORIES.map((c) => c.key),
                    itemOrder: {},
                    hiddenMenus: [],
                    defaultMenu: undefined,
                  });
                }}
                className="px-3 py-1.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#ebe5d8] dark:bg-slate-800 text-xs font-bold flex items-center gap-1.5 hover:bg-[#d0c6b4]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>초기화</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMenuPersonalizeModal(false)}
                className="px-4 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
