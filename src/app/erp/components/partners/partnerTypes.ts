export const KOREAN_BANKS = [
  "KB국민은행",
  "신한은행",
  "우리은행",
  "하나은행",
  "IBK기업은행",
  "NH농협은행",
  "SC제일은행",
  "한국씨티은행",
  "카카오뱅크",
  "토스뱅크",
  "케이뱅크",
  "KDB산업은행",
  "Sh수협은행",
  "우체국",
  "새마을금고",
  "신협",
  "상호저축은행",
  "산림조합",
];

export interface ActiveDocumentViewer {
  title: string;
  partnerName: string;
  url: string;
  fileName?: string;
  partnerId?: number;
  docType?: "BIZ_CERT" | "BANK_COPY" | "CONTRACT";
}

export interface PartnerContact {
  id: number;
  partnerId: number;
  name: string;
  department?: string | null;
  position?: string | null;
  mobile?: string | null;
  email?: string | null;
  telephone?: string | null;
  isPrimary: boolean;
  businessCardFrontUrl?: string | null;
  businessCardBackUrl?: string | null;
  memo?: string | null;
  createdAt?: string;
}

export interface Partner {
  id: number;
  partnerType: "CUSTOMER" | "VENDOR" | "BOTH";
  partnerCode: string;
  name: string;
  businessNo?: string | null;
  corporateNo?: string | null;
  ceoName?: string | null;
  bizType?: string | null;
  bizItem?: string | null;
  address?: string | null;
  addressDetail?: string | null;
  mainPhone?: string | null;
  mainEmail?: string | null;
  subEmail?: string | null;
  faxNo?: string | null;
  managerEmployeeId?: number | null;
  managerName?: string | null;
  statementClosingDay: string;
  taxInvoiceClosingDay: string;
  paymentDueDay: string;
  status: "ACTIVE" | "BLOCKED" | "INACTIVE" | "DORMANT";
  ntsBizState?: "ACTIVE" | "SUSPENDED" | "CLOSED" | "UNREGISTERED" | null;
  ntsTaxType?: string | null;
  ntsClosedDate?: string | null;
  ntsStatusMsg?: string | null;
  ntsCheckedAt?: string | null;
  memo?: string | null;
  bizCertFileUrl?: string | null;
  bizCertFileName?: string | null;
  hasBizCert?: boolean;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankAccountHolder?: string | null;
  bankCopyFileUrl?: string | null;
  bankCopyFileName?: string | null;
  hasBankCopy?: boolean;
  contractFileUrl?: string | null;
  contractFileName?: string | null;
  hasContractFile?: boolean;
  contactCount?: number;
  primaryContact?: {
    id: number;
    name: string;
    position?: string;
    department?: string;
    mobile?: string;
    email?: string;
    telephone?: string;
    businessCardFrontUrl?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerManagementTabProps {
  currentUser: any;
  initialType?: "CUSTOMER" | "VENDOR";
  onSelectTypeTab?: (type: "CUSTOMER" | "VENDOR" | "ALL") => void;
  onNavigateToTax?: () => void;
}
