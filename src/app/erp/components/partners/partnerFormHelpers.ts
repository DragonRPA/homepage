import type { Partner, PartnerContact } from "./partnerTypes";

export interface PartnerFileBundle {
  bizCertFileUrl?: string | null;
  bankCopyFileUrl?: string | null;
  contractFileUrl?: string | null;
}

const DEFAULT_STATEMENT_CLOSING_DAY = "매월 25일";
const DEFAULT_TAX_INVOICE_CLOSING_DAY = "익월 10일";
const DEFAULT_PAYMENT_DUE_DAY = "익월 15일";

/** 거래처 핵심 기본 필드 매핑 (폼/뷰어/PUT 페이로드 공통) */
function mapPartnerCoreFields(p: Partner) {
  return {
    id: p.id,
    partnerType: p.partnerType || "CUSTOMER",
    partnerCode: p.partnerCode || "",
    name: p.name || "",
    businessNo: p.businessNo || "",
    corporateNo: p.corporateNo || "",
    ceoName: p.ceoName || "",
    bizType: p.bizType || "",
    bizItem: p.bizItem || "",
    address: p.address || "",
    addressDetail: p.addressDetail || "",
    mainPhone: p.mainPhone || "",
    mainEmail: p.mainEmail || "",
    subEmail: p.subEmail || "",
    faxNo: p.faxNo || "",
    managerEmployeeId: p.managerEmployeeId ? String(p.managerEmployeeId) : "",
    managerName: p.managerName || "",
    statementClosingDay: p.statementClosingDay || DEFAULT_STATEMENT_CLOSING_DAY,
    taxInvoiceClosingDay: p.taxInvoiceClosingDay || DEFAULT_TAX_INVOICE_CLOSING_DAY,
    paymentDueDay: p.paymentDueDay || DEFAULT_PAYMENT_DUE_DAY,
    status: p.status || "ACTIVE",
    memo: p.memo || "",
    bankName: p.bankName || "",
    bankAccountNo: p.bankAccountNo || "",
    bankAccountHolder: p.bankAccountHolder || "",
  };
}

/** 신규/초기 거래처 등록 폼 생성기 */
export function createDefaultPartnerForm(options?: {
  partnerType?: "CUSTOMER" | "VENDOR" | "BOTH";
  currentUser?: any;
  overrides?: Record<string, any>;
}): Record<string, any> {
  return {
    id: 0,
    partnerType: options?.partnerType ?? "CUSTOMER",
    partnerCode: "",
    name: "",
    businessNo: "",
    corporateNo: "",
    ceoName: "",
    bizType: "",
    bizItem: "",
    address: "",
    addressDetail: "",
    mainPhone: "",
    mainEmail: "",
    subEmail: "",
    faxNo: "",
    managerEmployeeId: options?.currentUser?.id ? String(options.currentUser.id) : "",
    managerName: options?.currentUser?.name || "",
    statementClosingDay: DEFAULT_STATEMENT_CLOSING_DAY,
    taxInvoiceClosingDay: DEFAULT_TAX_INVOICE_CLOSING_DAY,
    paymentDueDay: DEFAULT_PAYMENT_DUE_DAY,
    status: "ACTIVE",
    ntsBizState: null,
    ntsTaxType: null,
    ntsClosedDate: null,
    ntsStatusMsg: null,
    ntsCheckedAt: null,
    memo: "",
    bizCertFileUrl: "",
    bizCertFileName: "",
    bankName: "",
    bankAccountNo: "",
    bankAccountHolder: "",
    bankCopyFileUrl: "",
    bankCopyFileName: "",
    contractFileUrl: "",
    contractFileName: "",
    ...(options?.overrides ?? {}),
  };
}

/** 기존 거래처 레코드 -> 수정 폼 매핑 */
export function createPartnerFormFromPartner(p: Partner): Record<string, any> {
  const hasBizCert = Boolean(p.hasBizCert || p.bizCertFileUrl);
  const hasBankCopy = Boolean(p.hasBankCopy || p.bankCopyFileUrl);
  const hasContractFile = Boolean(p.hasContractFile || p.contractFileUrl);

  return {
    ...mapPartnerCoreFields(p),
    ntsBizState: p.ntsBizState || null,
    ntsTaxType: p.ntsTaxType || null,
    ntsClosedDate: p.ntsClosedDate || null,
    ntsStatusMsg: p.ntsStatusMsg || null,
    ntsCheckedAt: p.ntsCheckedAt || null,
    bizCertFileUrl: p.bizCertFileUrl || "",
    bizCertFileName: p.bizCertFileName || "",
    hasBizCert,
    bankCopyFileUrl: p.bankCopyFileUrl || "",
    bankCopyFileName: p.bankCopyFileName || "",
    hasBankCopy,
    contractFileUrl: p.contractFileUrl || "",
    contractFileName: p.contractFileName || "",
    hasContractFile,
  };
}

/** 통장사본 OCR 결과 기반 매입거래처 등록 폼 생성기 */
export function createDefaultPartnerBankOcrForm(options: {
  bankOcrResult: any;
  bankOcrFileName: string;
  bankOcrPreviewUrl: string;
  currentUser?: any;
}): Record<string, any> {
  const { bankOcrResult, bankOcrFileName, bankOcrPreviewUrl, currentUser } = options;
  return createDefaultPartnerForm({
    partnerType: "VENDOR",
    currentUser,
    overrides: {
      name: bankOcrResult.bankAccountHolder || "",
      ceoName: bankOcrResult.bankAccountHolder || "",
      memo: `통장사본 기반 등록 (${bankOcrFileName})`,
      bankName: bankOcrResult.bankName || "",
      bankAccountNo: bankOcrResult.bankAccountNo || "",
      bankAccountHolder: bankOcrResult.bankAccountHolder || "",
      bankCopyFileUrl: bankOcrPreviewUrl || "",
      bankCopyFileName: bankOcrFileName || "",
    },
  });
}

/** 사업자등록증 OCR 결과 + 국세청 조회 결과 기반 거래처 등록 폼 생성기 */
export function createPartnerFormFromBizCertOcr(options: {
  ocrResult: any;
  ocrNtsStatus: any;
  ocrFileName: string;
  ocrPreviewFileUrl: string;
  partnerTypeTab: "CUSTOMER" | "VENDOR" | "ALL";
  currentUser?: any;
}): Record<string, any> {
  const {
    ocrResult,
    ocrNtsStatus,
    ocrFileName,
    ocrPreviewFileUrl,
    partnerTypeTab,
    currentUser,
  } = options;

  return createDefaultPartnerForm({
    partnerType: partnerTypeTab === "ALL" ? "CUSTOMER" : partnerTypeTab,
    currentUser,
    overrides: {
      name: ocrResult.name || "",
      businessNo: ocrResult.businessNo || "",
      corporateNo: ocrResult.corporateNo || "",
      ceoName: ocrResult.ceoName || "",
      bizType: ocrResult.bizType || "",
      bizItem: ocrResult.bizItem || "",
      address: ocrResult.address || "",
      mainPhone: ocrResult.mainPhone || "",
      mainEmail: ocrResult.email || "",
      status: ocrNtsStatus?.shouldBlockTrade ? "BLOCKED" : "ACTIVE",
      ntsBizState: ocrNtsStatus?.ntsBizState || null,
      ntsTaxType: ocrNtsStatus?.ntsTaxType || null,
      ntsClosedDate: ocrNtsStatus?.ntsClosedDate || null,
      ntsStatusMsg: ocrNtsStatus?.ntsStatusMsg || null,
      ntsCheckedAt: ocrNtsStatus ? new Date().toISOString() : null,
      memo: `사업자등록증 기반 등록 (${ocrFileName})`,
      bizCertFileUrl: ocrPreviewFileUrl || "",
      bizCertFileName: ocrFileName || "",
    },
  });
}

/** 통합 문서 뷰어 우측 인라인 수정 폼 매핑 */
export function createViewerFormFromPartner(target: Partner): Record<string, any> {
  return {
    ...mapPartnerCoreFields(target),
    ntsBizState: target.ntsBizState || null,
    ntsTaxType: target.ntsTaxType || null,
    ntsClosedDate: target.ntsClosedDate || null,
    ntsStatusMsg: target.ntsStatusMsg || null,
    ntsCheckedAt: target.ntsCheckedAt || null,
  };
}

/** 신규/초기 담당자(명함) 폼 생성기 */
export function createDefaultContactForm(options?: {
  partnerId?: number;
  isPrimary?: boolean;
}): Record<string, any> {
  return {
    id: 0,
    partnerId: options?.partnerId ?? 0,
    name: "",
    department: "",
    position: "",
    mobile: "",
    email: "",
    telephone: "",
    isPrimary: options?.isPrimary ?? false,
    businessCardFrontUrl: "",
    businessCardBackUrl: "",
    memo: "",
  };
}

/** 기존 담당자 레코드 -> 수정 폼 매핑 */
export function createContactFormFromContact(c: PartnerContact): Record<string, any> {
  return {
    id: c.id,
    partnerId: c.partnerId,
    name: c.name,
    department: c.department || "",
    position: c.position || "",
    mobile: c.mobile || "",
    email: c.email || "",
    telephone: c.telephone || "",
    isPrimary: c.isPrimary,
    businessCardFrontUrl: c.businessCardFrontUrl || "",
    businessCardBackUrl: c.businessCardBackUrl || "",
    memo: c.memo || "",
  };
}

/** 거래처 PUT 요청용 공통 페이로드 생성기 */
export function buildPartnerPutPayload(
  p: Partner,
  overrides: Record<string, any> = {}
): Record<string, any> {
  return {
    ...mapPartnerCoreFields(p),
    ...overrides,
  };
}

const BIZ_CERT_FIELD_MAP: ReadonlyArray<readonly [formKey: string, parsedKey: string]> = [
  ["name", "name"],
  ["businessNo", "businessNo"],
  ["corporateNo", "corporateNo"],
  ["ceoName", "ceoName"],
  ["bizType", "bizType"],
  ["bizItem", "bizItem"],
  ["address", "address"],
  ["mainPhone", "mainPhone"],
  ["mainEmail", "email"],
];

/** 사업자등록증 OCR 판독 결과를 폼 객체에 병합 */
export function mergeBizCertParsedIntoForm<T extends Record<string, any>>(
  prev: T,
  parsed: any,
  onlyEmptyFields = false
): T {
  if (!parsed) return prev;
  const next: Record<string, any> = { ...prev };
  for (const [formKey, parsedKey] of BIZ_CERT_FIELD_MAP) {
    const val = parsed[parsedKey];
    if (!val) continue;
    if (!onlyEmptyFields || !prev[formKey] || !String(prev[formKey]).trim()) {
      next[formKey] = val;
    }
  }
  return next as T;
}

/** 국세청 휴·폐업 조회 결과를 폼 객체에 병합 */
export function mergeNtsStatusIntoForm<T extends Record<string, any>>(
  prev: T,
  ntsRes: any,
  includeBusinessNo = true
): T {
  if (!ntsRes) return prev;
  return {
    ...prev,
    ...(includeBusinessNo ? { businessNo: ntsRes.businessNo || prev.businessNo } : {}),
    ntsBizState: ntsRes.ntsBizState,
    ntsTaxType: ntsRes.ntsTaxType,
    ntsClosedDate: ntsRes.ntsClosedDate,
    ntsStatusMsg: ntsRes.ntsStatusMsg,
    ntsCheckedAt: new Date().toISOString(),
    status: ntsRes.shouldBlockTrade ? "BLOCKED" : prev.status,
  };
}

/** 수정 모달 진입 후 지연 로딩된 원본 서류 URL을 폼에 안전 병합 */
export function mergePreloadedFilesIntoPartnerForm(
  prev: any,
  partnerId: number,
  files: PartnerFileBundle
) {
  if (prev.id !== partnerId) return prev;
  return {
    ...prev,
    bizCertFileUrl:
      prev.bizCertFileUrl === "__DELETE__"
        ? "__DELETE__"
        : prev.bizCertFileUrl || files.bizCertFileUrl || "",
    bankCopyFileUrl:
      prev.bankCopyFileUrl === "__DELETE__"
        ? "__DELETE__"
        : prev.bankCopyFileUrl || files.bankCopyFileUrl || "",
    contractFileUrl:
      prev.contractFileUrl === "__DELETE__"
        ? "__DELETE__"
        : prev.contractFileUrl || files.contractFileUrl || "",
  };
}

/** Data URL PDF를 Chrome/Edge 안전 Blob URL로 변환 */
export function createPdfBlobUrlFromDataUrl(url?: string | null): string | null {
  if (!url || !url.startsWith("data:application/pdf")) return null;
  try {
    const commaIdx = url.indexOf(",");
    const base64Str = commaIdx >= 0 ? url.slice(commaIdx + 1) : "";
    const binaryStr = atob(base64Str);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  } catch {
    return null;
  }
}

/** PDF 또는 이미지 파일 여부 검증 */
export function isPdfOrImageFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf") ||
    file.type.startsWith("image/")
  );
}

/** 통장사본 OCR 추출 결과 토스트 요약 문자열 생성 */
export function formatBankOcrDetails(
  src: { bankName?: string; bankAccountNo?: string; bankAccountHolder?: string },
  separator: string
): string {
  return [
    src.bankName && `은행: ${src.bankName}`,
    src.bankAccountNo && `계좌: ${src.bankAccountNo}`,
    src.bankAccountHolder && `예금주: ${src.bankAccountHolder}`,
  ]
    .filter(Boolean)
    .join(separator);
}
