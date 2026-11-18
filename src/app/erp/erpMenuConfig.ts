import React from "react";
import {
  Users,
  ShoppingCart,
  Truck,
  Briefcase,
  FileText,
  Building2,
  Shield,
  CheckSquare,
  Settings,
  Calendar,
  Clock,
  DollarSign,
  CreditCard,
  FolderTree,
  Database,
  Package,
  Layers,
  PackageCheck,
  PackagePlus,
  ArrowLeftRight,
  BookOpen,
  BarChart3,
  FileSignature,
  Receipt,
  Compass,
  ShieldCheck,
  Wrench,
} from "lucide-react";

export type ErpCategoryKey = "HR" | "APPROVAL" | "FINANCE" | "PARTNER" | "ASSET" | "INOUT" | "BUSINESS";

export type ErpMenuKey =
  | "ORG"
  | "CORPORATE_DOCS"
  | "EMPLOYMENT_CONTRACT"
  | "PERMISSIONS"
  | "LEAVE_APPLY"
  | "LEAVE_MANAGE"
  | "OT_MANAGE"
  | "EXPENSE_RECEIPT"
  | "WORK_RULES"
  | "RETIREMENT_PENSION_GUIDE"
  | "APPROVAL_INBOX"
  | "WORK_IMPROVEMENT"
  | "APPROVAL_RULES"
  | "FINANCIAL_REPORT"
  | "BANK_MATCHING"
  | "PAYROLL"
  | "ACCOUNTING_STANDARD"
  | "GENERAL_ACCOUNTING_STANDARD"
  | "TAX"
  | "CUSTOMER"
  | "VENDOR"
  | "PRODUCT"
  | "ASSET"
  | "WARRANTY"
  | "RENTAL_MAINTENANCE"
  | "OUTBOUND_REG"
  | "INBOUND_REG"
  | "TRADE"
  | "RENTAL"
  | "SERVICES"
  | "CLOUD_SHARE"
  | "GOV_SUPPORT"
  | "OBSIDIAN_VAULT"
  | "RENTAL_BIZ_DIR";

export interface MenuItem {
  key: ErpMenuKey;
  label: string;
  icon: React.ElementType;
}

export interface CategoryConfig {
  key: ErpCategoryKey;
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
}

export interface ErpMenuPrefs {
  categoryOrder: ErpCategoryKey[];
  itemOrder: Partial<Record<ErpCategoryKey, ErpMenuKey[]>>;
  hiddenMenus: ErpMenuKey[];
  defaultMenu?: ErpMenuKey;
}

export const CATEGORIES: CategoryConfig[] = [
  {
    key: "HR",
    label: "인사·근태",
    icon: Users,
    items: [
      { key: "ORG", label: "조직 인사관리", icon: Building2 },
      { key: "CORPORATE_DOCS", label: "법인 중요문서 (설립·정관)", icon: FolderTree },
      { key: "EMPLOYMENT_CONTRACT", label: "근로계약서 관리", icon: FileSignature },
      { key: "PERMISSIONS", label: "사용자 및 권한", icon: Shield },
      { key: "LEAVE_APPLY", label: "연차 신청", icon: Calendar },
      { key: "LEAVE_MANAGE", label: "연차 관리", icon: Users },
      { key: "OT_MANAGE", label: "초과근무 관리", icon: Clock },
      { key: "EXPENSE_RECEIPT", label: "개인경비 영수증 등록", icon: Receipt },
      { key: "WORK_RULES", label: "취업규칙 (표준안)", icon: BookOpen },
      { key: "RETIREMENT_PENSION_GUIDE", label: "퇴직연금 도입 안내", icon: FileText },
    ],
  },
  {
    key: "APPROVAL",
    label: "전자결재",
    icon: CheckSquare,
    items: [
      { key: "APPROVAL_INBOX", label: "내 결재함", icon: CheckSquare },
      { key: "WORK_IMPROVEMENT", label: "업무개선 보고서", icon: FileText },
      { key: "APPROVAL_RULES", label: "결재선 규칙 설정", icon: Settings },
    ],
  },
  {
    key: "FINANCE",
    label: "재무·회계",
    icon: DollarSign,
    items: [
      { key: "FINANCIAL_REPORT", label: "경영지표 보고서", icon: BarChart3 },
      { key: "BANK_MATCHING", label: "은행 입출금 대장", icon: DollarSign },
      { key: "PAYROLL", label: "급여 정산", icon: CreditCard },
      { key: "ACCOUNTING_STANDARD", label: "중소기업회계기준", icon: BookOpen },
      { key: "GENERAL_ACCOUNTING_STANDARD", label: "일반기업회계기준", icon: BookOpen },
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
      { key: "WARRANTY", label: "차대번호 보증관리", icon: ShieldCheck },
      { key: "RENTAL_MAINTENANCE", label: "렌탈 정비·부품관리", icon: Wrench },
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
      { key: "TAX", label: "매입·매출 세금계산서", icon: FileText },
      { key: "CLOUD_SHARE", label: "클라우드 자료실", icon: Database },
      { key: "GOV_SUPPORT", label: "정부지원·뉴스·트렌드", icon: Compass },
      { key: "RENTAL_BIZ_DIR", label: "렌탈 사업자 DB (FL·AWP·OA)", icon: Building2 },
      { key: "OBSIDIAN_VAULT", label: "옵시디언 노트 (PC·폰 연동)", icon: BookOpen },
    ],
  },
];

export const MENU_PERM_KEY_MAP: Record<ErpMenuKey, string> = {
  ORG: "org",
  CORPORATE_DOCS: "org",
  EMPLOYMENT_CONTRACT: "org",
  PERMISSIONS: "users",
  LEAVE_APPLY: "leave_apply",
  LEAVE_MANAGE: "leave_manage",
  OT_MANAGE: "ot_manage",
  EXPENSE_RECEIPT: "expense_receipt",
  WORK_RULES: "work_rules",
  RETIREMENT_PENSION_GUIDE: "work_rules",
  APPROVAL_INBOX: "approval_inbox",
  WORK_IMPROVEMENT: "work_improvement",
  APPROVAL_RULES: "approval_rules",
  FINANCIAL_REPORT: "bank_matching",
  BANK_MATCHING: "bank_matching",
  PAYROLL: "payroll",
  ACCOUNTING_STANDARD: "bank_matching",
  GENERAL_ACCOUNTING_STANDARD: "bank_matching",
  TAX: "tax_invoice",
  CUSTOMER: "customer",
  VENDOR: "vendor",
  PRODUCT: "product",
  ASSET: "asset",
  WARRANTY: "warranty",
  RENTAL_MAINTENANCE: "rental_maintenance",
  OUTBOUND_REG: "outbound_reg",
  INBOUND_REG: "inbound_reg",
  TRADE: "trade",
  RENTAL: "rental",
  SERVICES: "service",
  CLOUD_SHARE: "cloud_share",
  GOV_SUPPORT: "gov_support",
  OBSIDIAN_VAULT: "obsidian_vault",
  RENTAL_BIZ_DIR: "rental_biz_dir",
};
