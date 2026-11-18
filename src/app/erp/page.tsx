"use client";

import React from "react";
import dynamic from "next/dynamic";
import {
  CheckSquare,
  DollarSign,
  CreditCard,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  BookOpen,
  SlidersHorizontal,
  X,
  BarChart3,
  Menu,
} from "lucide-react";

import { ErpLogin } from "./components/ErpLogin";
import { ErpHeader } from "./components/ErpHeader";
import { useErpShellController } from "./useErpShellController";
const PasswordChangeModal = dynamic(
  () => import("./components/PasswordChangeModal").then((m) => m.PasswordChangeModal),
  { ssr: false }
);
const MenuPersonalizeModal = dynamic(
  () => import("./components/MenuPersonalizeModal").then((m) => m.MenuPersonalizeModal),
  { ssr: false }
);
import {
  ErpCategoryKey,
  ErpMenuKey,
} from "./erpMenuConfig";
export type { ErpCategoryKey, ErpMenuKey };

const TabLoadingSkeleton = () => (
  <div className="p-6 text-xs text-slate-500 font-mono">화면 모듈 불러오는 중...</div>
);

const OrganizationTab = dynamic(
  () => import("./components/OrganizationTab").then((m) => m.OrganizationTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const CorporateDocumentTab = dynamic(
  () => import("./components/CorporateDocumentTab").then((m) => m.CorporateDocumentTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const PermissionsTab = dynamic(
  () => import("./components/PermissionsTab").then((m) => m.PermissionsTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const ApprovalInboxTab = dynamic(
  () => import("./components/ApprovalInboxTab").then((m) => m.ApprovalInboxTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const ApprovalRulesTab = dynamic(
  () => import("./components/ApprovalRulesTab").then((m) => m.ApprovalRulesTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const WorkImprovementTab = dynamic(
  () => import("./components/WorkImprovementTab").then((m) => m.WorkImprovementTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const LeaveApplyTab = dynamic(
  () => import("./components/LeaveApplyTab").then((m) => m.LeaveApplyTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const LeaveManageTab = dynamic(
  () => import("./components/LeaveManageTab").then((m) => m.LeaveManageTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const OtManagementTab = dynamic(
  () => import("./components/OtManagementTab").then((m) => m.OtManagementTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const ExpenseReceiptTab = dynamic(
  () => import("./components/ExpenseReceiptTab").then((m) => m.ExpenseReceiptTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const WorkRulesTab = dynamic(
  () => import("./components/WorkRulesTab").then((m) => m.WorkRulesTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const RetirementPensionGuideTab = dynamic(
  () => import("./components/RetirementPensionGuideTab").then((m) => m.RetirementPensionGuideTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const EmploymentContractTab = dynamic(
  () => import("./components/EmploymentContractTab").then((m) => m.EmploymentContractTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const BankMatchingTab = dynamic(
  () => import("./components/BankMatchingTab").then((m) => m.BankMatchingTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const PayrollTab = dynamic(
  () => import("./components/PayrollTab").then((m) => m.PayrollTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const FinancialReportTab = dynamic(
  () => import("./components/FinancialReportTab").then((m) => m.FinancialReportTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const AccountingStandardsTab = dynamic(() => import("./components/AccountingStandardsTab"), {
  ssr: false,
  loading: TabLoadingSkeleton,
});
const GeneralAccountingStandardsTab = dynamic(
  () => import("./components/GeneralAccountingStandardsTab"),
  { ssr: false, loading: TabLoadingSkeleton }
);

const ProductManagementTab = dynamic(
  () => import("./components/ProductManagementTab").then((m) => m.ProductManagementTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const AssetManagementTab = dynamic(
  () => import("./components/AssetManagementTab").then((m) => m.AssetManagementTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const WarrantyManagementTab = dynamic(() => import("./components/WarrantyManagementTab"), {
  ssr: false,
  loading: TabLoadingSkeleton,
});
const RentalMaintenanceTab = dynamic(() => import("./components/RentalMaintenanceTab"), {
  ssr: false,
  loading: TabLoadingSkeleton,
});

const PartnerManagementTab = dynamic(
  () => import("./components/PartnerManagementTab").then((m) => m.PartnerManagementTab),
  { ssr: false, loading: TabLoadingSkeleton }
);

const TradeTab = dynamic(
  () => import("./components/TradeTab").then((m) => m.TradeTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const RentalTab = dynamic(
  () => import("./components/RentalTab").then((m) => m.RentalTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const ServiceTab = dynamic(
  () => import("./components/ServiceTab").then((m) => m.ServiceTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const TaxInvoiceTab = dynamic(
  () => import("./components/TaxInvoiceTab").then((m) => m.TaxInvoiceTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const OutboundRegTab = dynamic(
  () => import("./components/OutboundRegTab").then((m) => m.OutboundRegTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const InboundRegTab = dynamic(
  () => import("./components/InboundRegTab").then((m) => m.InboundRegTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const CloudShareTab = dynamic(
  () => import("./components/CloudShareTab").then((m) => m.CloudShareTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const GovSupportIntelTab = dynamic(
  () => import("./components/GovSupportIntelTab").then((m) => m.GovSupportIntelTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const ObsidianVaultTab = dynamic(
  () => import("./components/ObsidianVaultTab").then((m) => m.ObsidianVaultTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
const RentalBizDirectoryTab = dynamic(
  () => import("./components/RentalBizDirectoryTab").then((m) => m.RentalBizDirectoryTab),
  { ssr: false, loading: TabLoadingSkeleton }
);
import "./erp-theme.css";

interface KeepAlivePaneProps {
  menuKey: ErpMenuKey;
  isActive: boolean;
  paneRef: (el: HTMLDivElement | null) => void;
  renderContent: (key: ErpMenuKey) => React.ReactNode;
}

const KeepAlivePane = React.memo(
  function KeepAlivePane({
    menuKey,
    isActive,
    paneRef,
    renderContent,
  }: KeepAlivePaneProps) {
    return (
      <div
        ref={paneRef}
        aria-hidden={!isActive}
        className={
          isActive
            ? "h-full w-full overflow-y-auto overflow-x-hidden"
            : "hidden"
        }
      >
        {renderContent(menuKey)}
      </div>
    );
  },
  (prev, next) => {
    // 비활성 탭이 계속 비활성 상태로 유지되는 경우 리렌더링 및 renderContent 재호출을 0회로 원천 차단
    if (!prev.isActive && !next.isActive) {
      return true;
    }
    return prev.isActive === next.isActive && prev.menuKey === next.menuKey;
  }
);

export default function ErpMainPage() {
  const {
    currentUser,
    setCurrentUser,
    isInitialized,
    activeMenu,
    mountedMenus,
    paneRefs,
    targetWorkImprovementId,
    setTargetWorkImprovementId,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    showPasswordModal,
    setShowPasswordModal,
    theme,
    selectedEntity,
    setSelectedEntity,
    permsLoaded,
    showMenuPersonalizeModal,
    setShowMenuPersonalizeModal,
    menuPrefs,
    expandedGroups,
    toggleGroup,
    fetchRolePermissions,
    saveMenuPrefs,
    effectiveRoleCode,
    permittedCategories,
    visibleCategories,
    isMenuAllowed,
    navigateToMenu,
    handleGoBack,
    handleGoForward,
    enrichedUserByMenu,
    enrichedUser,
    toggleTheme,
    handleLogout,
    currentCategoryConfig,
    currentMenuItem,
    canGoBack,
    canGoForward,
    prevMenuLabel,
    nextMenuLabel,
  } = useErpShellController();

  const navigateToTax = React.useCallback(() => {
    navigateToMenu("TAX", "BUSINESS");
  }, [navigateToMenu]);

  const renderMenuContent = (menuKey: ErpMenuKey) => {
    const menuUser = enrichedUserByMenu[menuKey] || enrichedUser;
    switch (menuKey) {
      case "ORG":
        return <OrganizationTab currentUser={menuUser} />;
      case "CORPORATE_DOCS":
        return <CorporateDocumentTab currentUser={menuUser} selectedEntity={selectedEntity} />;
      case "EMPLOYMENT_CONTRACT":
        return <EmploymentContractTab currentUser={menuUser} />;
      case "PERMISSIONS":
        return (
          <PermissionsTab
            currentUser={menuUser}
            onPermissionsChanged={fetchRolePermissions}
          />
        );
      case "LEAVE_APPLY":
        return <LeaveApplyTab currentUser={menuUser} />;
      case "LEAVE_MANAGE":
        return <LeaveManageTab currentUser={menuUser} />;
      case "OT_MANAGE":
        return <OtManagementTab currentUser={menuUser} />;
      case "EXPENSE_RECEIPT":
        return <ExpenseReceiptTab currentUser={menuUser} />;
      case "WORK_RULES":
        return <WorkRulesTab currentUser={menuUser} />;
      case "RETIREMENT_PENSION_GUIDE":
        return <RetirementPensionGuideTab currentUser={menuUser} />;
      case "APPROVAL_INBOX":
        return (
          <ApprovalInboxTab
            currentUser={menuUser}
            onOpenWorkImprovement={(reportId) => {
              setTargetWorkImprovementId(reportId);
              navigateToMenu("WORK_IMPROVEMENT", "APPROVAL");
            }}
          />
        );
      case "WORK_IMPROVEMENT":
        return (
          <WorkImprovementTab
            currentUser={menuUser}
            initialReportId={targetWorkImprovementId}
          />
        );
      case "APPROVAL_RULES":
        return <ApprovalRulesTab currentUser={menuUser} />;
      case "FINANCIAL_REPORT":
        return <FinancialReportTab currentUser={menuUser} selectedEntity={selectedEntity} />;
      case "BANK_MATCHING":
        return (
          <BankMatchingTab
            currentUser={menuUser}
            selectedEntity={selectedEntity}
            onSelectEntity={(e) => {
              setSelectedEntity(e);
              try {
                localStorage.setItem("dragonrpa_erp_entity", e);
              } catch (err) {}
            }}
            isActive={activeMenu === "BANK_MATCHING"}
          />
        );
      case "PAYROLL":
        return <PayrollTab currentUser={menuUser} />;
      case "ACCOUNTING_STANDARD":
        return (
          <div className="p-4">
            <AccountingStandardsTab />
          </div>
        );
      case "GENERAL_ACCOUNTING_STANDARD":
        return (
          <div className="p-4">
            <GeneralAccountingStandardsTab />
          </div>
        );
      case "TAX":
        return (
          <TaxInvoiceTab
            currentUser={menuUser}
            selectedEntity={selectedEntity}
            onSelectEntity={(e) => {
              setSelectedEntity(e);
              try {
                localStorage.setItem("dragonrpa_erp_entity", e);
              } catch (err) {}
            }}
          />
        );
      case "CUSTOMER":
        return (
          <PartnerManagementTab
            currentUser={menuUser}
            initialType="CUSTOMER"
            onSelectTypeTab={(type) => {
              if (type === "CUSTOMER" || type === "VENDOR") {
                navigateToMenu(type, "PARTNER");
              }
            }}
            onNavigateToTax={navigateToTax}
          />
        );
      case "VENDOR":
        return (
          <PartnerManagementTab
            currentUser={menuUser}
            initialType="VENDOR"
            onSelectTypeTab={(type) => {
              if (type === "CUSTOMER" || type === "VENDOR") {
                navigateToMenu(type, "PARTNER");
              }
            }}
            onNavigateToTax={navigateToTax}
          />
        );
      case "PRODUCT":
        return (
          <ProductManagementTab
            currentUser={menuUser}
            onNavigateToAsset={() => navigateToMenu("ASSET", "ASSET")}
          />
        );
      case "ASSET":
        return <AssetManagementTab currentUser={menuUser} />;
      case "WARRANTY":
        return (
          <div className="p-3 h-full">
            <WarrantyManagementTab currentUser={menuUser} />
          </div>
        );
      case "RENTAL_MAINTENANCE":
        return (
          <div className="p-3 h-full">
            <RentalMaintenanceTab currentUser={menuUser} />
          </div>
        );
      case "OUTBOUND_REG":
        return (
          <div className="p-4">
            <OutboundRegTab currentUser={menuUser} />
          </div>
        );
      case "INBOUND_REG":
        return (
          <div className="p-4">
            <InboundRegTab currentUser={menuUser} />
          </div>
        );
      case "TRADE":
        return (
          <TradeTab
            currentUser={menuUser}
            selectedEntity={selectedEntity}
            onNavigateToTax={navigateToTax}
          />
        );
      case "RENTAL":
        return (
          <RentalTab
            currentUser={menuUser}
            selectedEntity={selectedEntity}
            onNavigateToTax={navigateToTax}
          />
        );
      case "SERVICES":
        return (
          <ServiceTab
            currentUser={menuUser}
            selectedEntity={selectedEntity}
            onNavigateToTax={navigateToTax}
          />
        );
      case "CLOUD_SHARE":
        return <CloudShareTab currentUser={menuUser} />;
      case "GOV_SUPPORT":
        return <GovSupportIntelTab currentUser={menuUser} />;
      case "RENTAL_BIZ_DIR":
        return <RentalBizDirectoryTab currentUser={menuUser} />;
      case "OBSIDIAN_VAULT":
        return <ObsidianVaultTab currentUser={menuUser} />;
      default: {
        const _exhaustive: never = menuKey;
        return _exhaustive;
      }
    }
  };

  if (!isInitialized || (currentUser && !permsLoaded && effectiveRoleCode !== "ADMIN")) {
    return (
      <div data-theme={theme} className="min-h-screen flex items-center justify-center text-xs font-mono erp-app-container">
        시스템 세션 및 권한을 초기화하는 중입니다...
      </div>
    );
  }

  // Not logged in -> Show Corporate Login
  if (!currentUser) {
    return <ErpLogin theme={theme} onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div data-theme={theme} className="erp-app-container flex flex-col h-dvh w-screen overflow-hidden select-none">
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
        isMobileMenuOpen={isMobileSidebarOpen}
        onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
      />

      {/* 2. Main Layout Body: Left Tree Sidebar + Right Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* 모바일 전체 메뉴 드로어 백드롭 */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Left Menu Panel (Tree Navigation Sidebar - PC 고정, 모바일 슬라이드 드로어) */}
        <aside
          className={`erp-sidebar w-64 h-full flex flex-col shrink-0 select-none overflow-hidden transition-transform duration-200 z-50 fixed md:static inset-y-0 left-0 ${
            isMobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
          }`}
        >
          {/* Sidebar Top: System Overview */}
          <div className="erp-sidebar-header p-3 px-4 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs font-bold tracking-tight erp-sidebar-title">
                메뉴 트리 구조
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold erp-sidebar-badge">
                {visibleCategories.length}그룹 {visibleCategories.reduce((s, c) => s + c.items.length, 0)}메뉴
              </span>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="md:hidden p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                title="메뉴 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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
                            onClick={() => navigateToMenu(item.key, cat.key)}
                            className={`erp-menu-item-btn flex items-center gap-2 w-full px-2.5 py-2 md:py-1.5 rounded text-xs text-left transition ${
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
              onClick={() => {
                setIsMobileSidebarOpen(false);
                setShowMenuPersonalizeModal(true);
              }}
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
          <div className="erp-breadcrumb-bar px-3 md:px-4 py-1.5 md:py-2 border-b flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs min-w-0">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={!canGoBack}
                  onClick={handleGoBack}
                  title={prevMenuLabel ? `이전 메뉴: ${prevMenuLabel}` : "이전 메뉴"}
                  className="px-2 py-1 rounded border text-[11px] font-bold flex items-center gap-1 shrink-0 whitespace-nowrap transition erp-action-btn disabled:opacity-35 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">이전 메뉴</span>
                </button>
                <button
                  type="button"
                  disabled={!canGoForward}
                  onClick={handleGoForward}
                  title={nextMenuLabel ? `다음 메뉴: ${nextMenuLabel}` : "다음 메뉴"}
                  className="px-2 py-1 rounded border text-[11px] font-bold flex items-center gap-1 shrink-0 whitespace-nowrap transition erp-action-btn disabled:opacity-35 disabled:pointer-events-none"
                >
                  <span className="hidden sm:inline">다음 메뉴</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
              <span className="h-3.5 w-px bg-[#b5a894] dark:bg-slate-700 shrink-0 mx-0.5" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="opacity-60 whitespace-nowrap">{currentCategoryConfig?.label}</span>
                <span className="opacity-40">/</span>
                <span className="font-bold flex items-center gap-1.5 truncate">
                  {currentMenuItem && <currentMenuItem.icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  <span className="truncate">{currentMenuItem?.label}</span>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden px-2 py-0.5 rounded border text-[11px] font-bold flex items-center gap-1 shrink-0 erp-action-btn"
            >
              <FolderTree className="w-3 h-3 text-blue-600" />
              <span>전체메뉴</span>
            </button>
          </div>

          {/* Tab Content Body (Keep-Alive Menu Panes) */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            {!isMenuAllowed ? (
              <div className="p-8 text-center text-xs text-slate-500">
                접근 권한이 부여된 메뉴가 없습니다. 관리자에게 권한 배정을 요청해 주십시오.
              </div>
            ) : (
              mountedMenus.map((menuKey) => (
                <KeepAlivePane
                  key={menuKey}
                  menuKey={menuKey}
                  isActive={activeMenu === menuKey}
                  paneRef={(el) => {
                    paneRefs.current[menuKey] = el;
                  }}
                  renderContent={renderMenuContent}
                />
              ))
            )}
          </div>
        </main>
      </div>

      {/* 3. 핸드폰(모바일 웹앱) 전용 경영자 핵심 5대 메뉴 하단 탭바 */}
      <nav className="md:hidden erp-sidebar-header border-t grid grid-cols-6 shrink-0 select-none z-30 pb-[env(safe-area-inset-bottom)]">
        {[
          {
            key: "FINANCIAL_REPORT" as ErpMenuKey,
            cat: "FINANCE" as ErpCategoryKey,
            label: "경영지표",
            icon: BarChart3,
          },
          {
            key: "OBSIDIAN_VAULT" as ErpMenuKey,
            cat: "BUSINESS" as ErpCategoryKey,
            label: "옵시디언",
            icon: BookOpen,
          },
          {
            key: "BANK_MATCHING" as ErpMenuKey,
            cat: "FINANCE" as ErpCategoryKey,
            label: "입출금",
            icon: DollarSign,
          },
          {
            key: "PAYROLL" as ErpMenuKey,
            cat: "FINANCE" as ErpCategoryKey,
            label: "급여정산",
            icon: CreditCard,
          },
          {
            key: "APPROVAL_INBOX" as ErpMenuKey,
            cat: "APPROVAL" as ErpCategoryKey,
            label: "결재함",
            icon: CheckSquare,
          },
        ].map((nav) => {
          const NavIcon = nav.icon;
          const isActive = activeMenu === nav.key && !isMobileSidebarOpen;
          return (
            <button
              key={nav.key}
              type="button"
              onClick={() => navigateToMenu(nav.key, nav.cat)}
              className={`flex flex-col items-center justify-center py-2 px-1 gap-0.5 text-[10px] font-bold transition whitespace-nowrap ${
                isActive
                  ? "bg-[#1d4ed8] text-white"
                  : "text-[#334155] dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <NavIcon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : ""}`} />
              <span>{nav.label}</span>
            </button>
          );
        })}

        {/* 전체메뉴 드로어 버튼 */}
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
          className={`flex flex-col items-center justify-center py-2 px-1 gap-0.5 text-[10px] font-bold transition whitespace-nowrap ${
            isMobileSidebarOpen
              ? "bg-[#1d4ed8] text-white"
              : "text-[#334155] dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          <Menu className={`w-4 h-4 shrink-0 ${isMobileSidebarOpen ? "text-white" : ""}`} />
          <span>전체메뉴</span>
        </button>
      </nav>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <PasswordChangeModal
          employeeId={currentUser.id}
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />
      )}

      {/* 메뉴 개인화 설정 모달 */}
      {showMenuPersonalizeModal && (
        <MenuPersonalizeModal
          menuPrefs={menuPrefs}
          permittedCategories={permittedCategories}
          saveMenuPrefs={saveMenuPrefs}
          onClose={() => setShowMenuPersonalizeModal(false)}
        />
      )}
    </div>
  );
}
