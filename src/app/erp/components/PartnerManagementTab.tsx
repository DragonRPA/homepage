"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Users,
  Building2,
  Truck,
  Plus,
  RefreshCw,
  Search,
  Download,
  Check,
  X,
  FileText,
  CreditCard,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Upload,
  UserCheck,
  FileCheck,
  Sparkles,
  Image as ImageIcon,
  Clock,
  Eye,
  FileUp,
  Landmark,
  Copy,
  ExternalLink,
  Printer,
  ShieldAlert,
  Ban,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Save,
} from "lucide-react";
import { formatErpNumber, matchHangulAny, sortErpItems } from "@/lib/erpFormat";
import { invalidateMasterData } from "@/lib/erpMasterDataBus";
import { SortableTh, useErpTableSort } from "./SortableTh";
import {
  getNtsBizStateBadgeLabel,
  getPartnerTradeBlockInfo,
  isPartnerTradeBlocked,
  normalizeBizNoDigits,
} from "@/lib/partnerStatusClient";
import { KOREAN_BANKS, type ActiveDocumentViewer, type PartnerContact, type Partner } from "./partners/partnerTypes";
import {
  extractPdfImageAndTextFromSource,
  resizeImageToBase64,
  exportPartnersToCsv,
  readFileAsDataUrl,
  isPdfDocument,
  processBankCopyOcr,
  extractBizCertOcrFromFile,
  queryNtsByBizNoClient,
} from "./partners/partnerPdfUtils";
import { PartnerListPanel } from "./partners/PartnerListPanel";
import { PartnerDossierPanel } from "./partners/PartnerDossierPanel";
import { PartnerFormModal } from "./partners/PartnerFormModal";
import { BizCertOcrModal } from "./partners/BizCertOcrModal";
import { BankCopyOcrModal } from "./partners/BankCopyOcrModal";
import { ContactFormModal } from "./partners/ContactFormModal";
import { BizStatusBatchModal } from "./partners/BizStatusBatchModal";
import { PartnerDocViewerModal } from "./partners/PartnerDocViewerModal";

export {
  KOREAN_BANKS,
  type ActiveDocumentViewer,
  type PartnerContact,
  type Partner,
} from "./partners/partnerTypes";

interface PartnerManagementTabProps {
  currentUser: any;
  initialType?: "CUSTOMER" | "VENDOR";
  onSelectTypeTab?: (type: "CUSTOMER" | "VENDOR" | "ALL") => void;
  onNavigateToTax?: () => void;
}

export const PartnerManagementTab: React.FC<PartnerManagementTabProps> = ({
  currentUser,
  initialType = "CUSTOMER",
  onSelectTypeTab,
  onNavigateToTax,
}) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";

  // Tab & Scope Filters
  const [partnerTypeTab, setPartnerTypeTab] = useState<"CUSTOMER" | "VENDOR" | "ALL">(initialType);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [managerFilter, setManagerFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data States
  const [partners, setPartners] = useState<Partner[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [kpi, setKpi] = useState({
    totalCount: 0,
    customerCount: 0,
    vendorCount: 0,
    activeCount: 0,
    blockedCount: 0,
    withBizCertCount: 0,
    withContractCount: 0,
  });

  // Selected Dossier
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerContacts, setPartnerContacts] = useState<PartnerContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState<boolean>(false);
  const contactsCacheRef = useRef<Record<number, PartnerContact[]>>({});
  const filesCacheRef = useRef<
    Record<
      number,
      {
        bizCertFileUrl?: string | null;
        bankCopyFileUrl?: string | null;
        contractFileUrl?: string | null;
      }
    >
  >({});
  const [docFetching, setDocFetching] = useState<boolean>(false);

  // Sorting (3단계: asc ➔ desc ➔ null 정렬안함)
  const { sortKey, sortDir, handleSort } = useErpTableSort("id", "desc");
  const ntsSort = useErpTableSort("", null);

  // Modals
  const [showPartnerModal, setShowPartnerModal] = useState<boolean>(false);
  const [partnerModalMode, setPartnerModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [showBizCertOcrModal, setShowBizCertOcrModal] = useState<boolean>(false);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [contactModalMode, setContactModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [editingContact, setEditingContact] = useState<PartnerContact | null>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<ActiveDocumentViewer | null>(null);

  // Drag and Drop States for OCR Modal
  const [isCertDragging, setIsCertDragging] = useState<boolean>(false);
  const certFileInputRef = useRef<HTMLInputElement>(null);

  // File Input Refs & Drag States for Partner Modal & Dossier
  const bankCopyInputRef = useRef<HTMLInputElement>(null);
  const directBizCertInputRef = useRef<HTMLInputElement>(null);
  const directContractInputRef = useRef<HTMLInputElement>(null);
  const dossierBizCertInputRef = useRef<HTMLInputElement>(null);
  const dossierContractInputRef = useRef<HTMLInputElement>(null);
  const viewerReplaceFileInputRef = useRef<HTMLInputElement>(null);
  const [isBankCopyDragging, setIsBankCopyDragging] = useState<boolean>(false);
  const [isDirectBizCertDragging, setIsDirectBizCertDragging] = useState<boolean>(false);
  const [isDirectContractDragging, setIsDirectContractDragging] = useState<boolean>(false);
  const [isDossierBizCertDragging, setIsDossierBizCertDragging] = useState<boolean>(false);
  const [isDossierContractDragging, setIsDossierContractDragging] = useState<boolean>(false);
  const [dossierBizCertSaving, setDossierBizCertSaving] = useState<boolean>(false);
  const [dossierContractSaving, setDossierContractSaving] = useState<boolean>(false);
  const [directBizCertOcrLoading, setDirectBizCertOcrLoading] = useState<boolean>(false);
  const [directBizCertSuggestion, setDirectBizCertSuggestion] = useState<any>(null);
  const [singleNtsCheckingId, setSingleNtsCheckingId] = useState<number | null>(null);
  const [formNtsChecking, setFormNtsChecking] = useState<boolean>(false);

  // Split Document Viewer + Inline Customer Info Edit States
  const [viewerZoom, setViewerZoom] = useState<number>(1);
  const [viewerRotation, setViewerRotation] = useState<number>(0);
  const [isViewerDragging, setIsViewerDragging] = useState<boolean>(false);
  const [resolvedPdfBlobUrl, setResolvedPdfBlobUrl] = useState<string | null>(null);
  const [viewerForm, setViewerForm] = useState<any>(null);
  const [viewerSaving, setViewerSaving] = useState<boolean>(false);
  const [viewerOcrLoading, setViewerOcrLoading] = useState<boolean>(false);
  const [viewerNtsLoading, setViewerNtsLoading] = useState<boolean>(false);

  // Batch Business Status Lookup Modal States
  const [showBizStatusBatchModal, setShowBizStatusBatchModal] = useState<boolean>(false);
  const [batchScope, setBatchScope] = useState<"CUSTOMER" | "FILTERED" | "ALL">("CUSTOMER");
  const [batchAutoBlock, setBatchAutoBlock] = useState<boolean>(true);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<{ summary: any; results: any[] } | null>(null);

  // OCR Processing States (Business Registration Certificate)
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [ocrPreviewFileUrl, setOcrPreviewFileUrl] = useState<string>("");
  const [ocrPreviewThumbUrl, setOcrPreviewThumbUrl] = useState<string>("");
  const [ocrNtsStatus, setOcrNtsStatus] = useState<any>(null);
  const [ocrFileName, setOcrFileName] = useState<string>("");

  // Bankbook OCR Modal & Processing States
  const [showBankOcrModal, setShowBankOcrModal] = useState<boolean>(false);
  const [bankOcrLoading, setBankOcrLoading] = useState<boolean>(false);
  const [bankOcrResult, setBankOcrResult] = useState<any>(null);
  const [bankOcrPreviewUrl, setBankOcrPreviewUrl] = useState<string>("");
  const [bankOcrFileName, setBankOcrFileName] = useState<string>("");
  const [isBankOcrModalDragging, setIsBankOcrModalDragging] = useState<boolean>(false);
  const bankOcrModalFileInputRef = useRef<HTMLInputElement>(null);

  // Partner Form State
  const [partnerForm, setPartnerForm] = useState<any>({
    id: 0,
    partnerType: "CUSTOMER",
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
    managerEmployeeId: "",
    managerName: "",
    statementClosingDay: "매월 25일",
    taxInvoiceClosingDay: "익월 10일",
    paymentDueDay: "익월 15일",
    status: "ACTIVE",
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
  });

  // Dossier Inline Email Edit State
  const [editingDossierEmail, setEditingDossierEmail] = useState<boolean>(false);
  const [dossierMainEmail, setDossierMainEmail] = useState<string>("");
  const [dossierSubEmail, setDossierSubEmail] = useState<string>("");
  const [savingDossierEmail, setSavingDossierEmail] = useState<boolean>(false);

  // Contact Form State
  const [contactForm, setContactForm] = useState<any>({
    id: 0,
    partnerId: 0,
    name: "",
    department: "",
    position: "",
    mobile: "",
    email: "",
    telephone: "",
    isPrimary: false,
    businessCardFrontUrl: "",
    businessCardBackUrl: "",
    memo: "",
  });

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (initialType) {
      setPartnerTypeTab(initialType);
    }
  }, [initialType]);

  // Fetch Employees for assigning 본사 담당직원
  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/erp/employees", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
    } catch (e) {}
  };

  // Fetch all partners once and filter client-side for instant 0ms tab/scope switching
  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/partners?type=ALL", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "거래처 목록 조회 실패");

      const list: Partner[] = data.partners || [];
      setPartners(list);
      if (data.kpi) setKpi(data.kpi);
      setSelectedPartner((prev) => {
        if (!prev) return null;
        const updated = list.find((p) => p.id === prev.id);
        if (!updated) return prev;
        const cached = filesCacheRef.current[prev.id] || {};
        return {
          ...updated,
          bizCertFileUrl: updated.bizCertFileUrl ?? cached.bizCertFileUrl ?? prev.bizCertFileUrl,
          bankCopyFileUrl: updated.bankCopyFileUrl ?? cached.bankCopyFileUrl ?? prev.bankCopyFileUrl,
          contractFileUrl: updated.contractFileUrl ?? cached.contractFileUrl ?? prev.contractFileUrl,
        };
      });
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // On-demand fetch for heavy Base64 document files (bizCertFileUrl, bankCopyFileUrl, contractFileUrl)
  const ensurePartnerFiles = async (
    p: Partner,
    requiredDocType?: "BIZ_CERT" | "BANK_COPY" | "CONTRACT"
  ): Promise<{
    bizCertFileUrl?: string | null;
    bankCopyFileUrl?: string | null;
    contractFileUrl?: string | null;
  }> => {
    const cached = filesCacheRef.current[p.id] || {};
    const merged = {
      bizCertFileUrl: p.bizCertFileUrl || cached.bizCertFileUrl || null,
      bankCopyFileUrl: p.bankCopyFileUrl || cached.bankCopyFileUrl || null,
      contractFileUrl: p.contractFileUrl || cached.contractFileUrl || null,
    };

    const hasNeeded =
      requiredDocType === "BIZ_CERT"
        ? Boolean(merged.bizCertFileUrl)
        : requiredDocType === "BANK_COPY"
        ? Boolean(merged.bankCopyFileUrl)
        : requiredDocType === "CONTRACT"
        ? Boolean(merged.contractFileUrl)
        : Boolean(
            (!p.hasBizCert || merged.bizCertFileUrl) &&
              (!p.hasBankCopy || merged.bankCopyFileUrl) &&
              (!p.hasContractFile || merged.contractFileUrl)
          );

    if (hasNeeded) {
      return merged;
    }

    setDocFetching(true);
    try {
      const res = await fetch(`/api/erp/partners?id=${p.id}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.partner) {
        const loaded = {
          bizCertFileUrl: data.partner.bizCertFileUrl || null,
          bankCopyFileUrl: data.partner.bankCopyFileUrl || null,
          contractFileUrl: data.partner.contractFileUrl || null,
        };
        filesCacheRef.current[p.id] = loaded;
        setPartners((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, ...loaded } : item))
        );
        setSelectedPartner((prev) => (prev && prev.id === p.id ? { ...prev, ...loaded } : prev));
        return loaded;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDocFetching(false);
    }
    return merged;
  };

  const handleOpenPartnerDoc = async (
    p: Partner,
    docType: "BIZ_CERT" | "BANK_COPY" | "CONTRACT",
    mode: "VIEW" | "DOWNLOAD" = "VIEW"
  ) => {
    const files = await ensurePartnerFiles(p, docType);
    const url =
      docType === "BIZ_CERT"
        ? files.bizCertFileUrl
        : docType === "BANK_COPY"
        ? files.bankCopyFileUrl
        : files.contractFileUrl;
    if (!url) {
      showToast("등록된 원본 서류 데이터를 불러올 수 없습니다.", "error");
      return;
    }
    const fileName =
      docType === "BIZ_CERT"
        ? p.bizCertFileName || `${p.name}_사업자등록증`
        : docType === "BANK_COPY"
        ? p.bankCopyFileName || `${p.bankName || p.name}_통장사본`
        : p.contractFileName || `${p.name}_계약서.pdf`;

    if (mode === "DOWNLOAD") {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    setActiveDocument({
      title:
        docType === "BIZ_CERT"
          ? "사업자등록증 원본"
          : docType === "BANK_COPY"
          ? "통장사본 원본"
          : "계약서 원본",
      partnerName: p.name,
      url,
      fileName,
      partnerId: p.id,
      docType,
    });
  };

  // Fetch Contacts for selected partner (with in-memory cache)
  const fetchContacts = async (partnerId: number, force = false) => {
    if (!force && contactsCacheRef.current[partnerId]) {
      setPartnerContacts(contactsCacheRef.current[partnerId]);
      return;
    }
    setContactsLoading(true);
    try {
      const res = await fetch(`/api/erp/partners/contacts?partnerId=${partnerId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        const list = data.contacts || [];
        contactsCacheRef.current[partnerId] = list;
        setPartnerContacts(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchPartners();
  }, []);

  useEffect(() => {
    if (selectedPartner?.id) {
      fetchContacts(selectedPartner.id);
      setEditingDossierEmail(false);
      setDossierMainEmail(selectedPartner.mainEmail || "");
      setDossierSubEmail(selectedPartner.subEmail || "");
    } else {
      setPartnerContacts([]);
      setEditingDossierEmail(false);
    }
  }, [selectedPartner?.id, selectedPartner?.mainEmail, selectedPartner?.subEmail]);

  // Split Viewer Sync & Chrome/Edge Safe PDF Blob URL
  useEffect(() => {
    setViewerZoom(1);
    setViewerRotation(0);
    setIsViewerDragging(false);

    let createdBlobUrl: string | null = null;
    if (activeDocument?.url && activeDocument.url.startsWith("data:application/pdf")) {
      try {
        const commaIdx = activeDocument.url.indexOf(",");
        const base64Str = commaIdx >= 0 ? activeDocument.url.slice(commaIdx + 1) : "";
        const binaryStr = atob(base64Str);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        createdBlobUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        setResolvedPdfBlobUrl(createdBlobUrl);
      } catch {
        setResolvedPdfBlobUrl(null);
      }
    } else {
      setResolvedPdfBlobUrl(null);
    }

    if (activeDocument?.partnerId) {
      const target =
        partners.find((p) => p.id === activeDocument.partnerId) || selectedPartner;
      if (target && target.id === activeDocument.partnerId) {
        setViewerForm({
          id: target.id,
          partnerType: target.partnerType || "CUSTOMER",
          partnerCode: target.partnerCode || "",
          name: target.name || "",
          businessNo: target.businessNo || "",
          corporateNo: target.corporateNo || "",
          ceoName: target.ceoName || "",
          bizType: target.bizType || "",
          bizItem: target.bizItem || "",
          address: target.address || "",
          addressDetail: target.addressDetail || "",
          mainPhone: target.mainPhone || "",
          mainEmail: target.mainEmail || "",
          subEmail: target.subEmail || "",
          faxNo: target.faxNo || "",
          managerEmployeeId: target.managerEmployeeId ? String(target.managerEmployeeId) : "",
          managerName: target.managerName || "",
          statementClosingDay: target.statementClosingDay || "매월 25일",
          taxInvoiceClosingDay: target.taxInvoiceClosingDay || "익월 10일",
          paymentDueDay: target.paymentDueDay || "익월 15일",
          status: target.status || "ACTIVE",
          ntsBizState: target.ntsBizState || null,
          ntsTaxType: target.ntsTaxType || null,
          ntsClosedDate: target.ntsClosedDate || null,
          ntsStatusMsg: target.ntsStatusMsg || null,
          ntsCheckedAt: target.ntsCheckedAt || null,
          memo: target.memo || "",
          bankName: target.bankName || "",
          bankAccountNo: target.bankAccountNo || "",
          bankAccountHolder: target.bankAccountHolder || "",
        });
      }
    } else {
      setViewerForm(null);
    }

    return () => {
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [activeDocument?.url, activeDocument?.partnerId]);

  /** 거래처 PUT 요청용 공통 페이로드 생성기 */
  const buildPartnerPutPayload = (p: Partner, overrides: Record<string, any> = {}) => ({
    id: p.id,
    name: p.name,
    partnerType: p.partnerType,
    partnerCode: p.partnerCode,
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
    statementClosingDay: p.statementClosingDay || "매월 25일",
    taxInvoiceClosingDay: p.taxInvoiceClosingDay || "익월 10일",
    paymentDueDay: p.paymentDueDay || "익월 15일",
    status: p.status || "ACTIVE",
    memo: p.memo || "",
    bankName: p.bankName || "",
    bankAccountNo: p.bankAccountNo || "",
    bankAccountHolder: p.bankAccountHolder || "",
    ...overrides,
  });

  const handleSaveDossierEmail = async () => {
    if (!selectedPartner) return;
    setSavingDossierEmail(true);
    try {
      const res = await fetch("/api/erp/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPartner.id,
          partnerType: selectedPartner.partnerType,
          partnerCode: selectedPartner.partnerCode,
          name: selectedPartner.name,
          businessNo: selectedPartner.businessNo,
          corporateNo: selectedPartner.corporateNo,
          ceoName: selectedPartner.ceoName,
          bizType: selectedPartner.bizType,
          bizItem: selectedPartner.bizItem,
          address: selectedPartner.address,
          addressDetail: selectedPartner.addressDetail,
          mainPhone: selectedPartner.mainPhone,
          mainEmail: dossierMainEmail.trim() || null,
          subEmail: dossierSubEmail.trim() || null,
          faxNo: selectedPartner.faxNo,
          managerEmployeeId: selectedPartner.managerEmployeeId,
          managerName: selectedPartner.managerName,
          statementClosingDay: selectedPartner.statementClosingDay,
          taxInvoiceClosingDay: selectedPartner.taxInvoiceClosingDay,
          paymentDueDay: selectedPartner.paymentDueDay,
          status: selectedPartner.status,
          memo: selectedPartner.memo,
          bankName: selectedPartner.bankName,
          bankAccountNo: selectedPartner.bankAccountNo,
          bankAccountHolder: selectedPartner.bankAccountHolder,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "이메일 저장 실패");

      showToast("세금계산서 수신 이메일이 저장 및 계약에 동기화되었습니다.");
      setEditingDossierEmail(false);
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSavingDossierEmail(false);
    }
  };

  const renderSortTh = (label: string, colKey: string, align: "left" | "right" | "center" = "left") => (
    <SortableTh
      label={label}
      colKey={colKey}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={handleSort}
      align={align}
      className="py-2.5 px-3 hover:bg-[#d9d1c1] dark:hover:bg-slate-700/60"
      iconClassName="w-3.5 h-3.5"
    />
  );

  // Instant 0ms client-side filtering across tabs, status, manager, and search query
  const filteredPartners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return partners.filter((p) => {
      if (partnerTypeTab === "CUSTOMER" && p.partnerType !== "CUSTOMER" && p.partnerType !== "BOTH") {
        return false;
      }
      if (partnerTypeTab === "VENDOR" && p.partnerType !== "VENDOR" && p.partnerType !== "BOTH") {
        return false;
      }
      if (statusFilter !== "ALL" && p.status !== statusFilter) {
        return false;
      }
      if (managerFilter !== "ALL" && String(p.managerEmployeeId || "") !== String(managerFilter)) {
        return false;
      }
      if (q) {
        if (
          !matchHangulAny(
            [
              p.name,
              p.businessNo,
              p.ceoName,
              p.managerName,
              p.partnerCode,
              p.primaryContact?.name,
            ],
            q
          )
        ) {
          return false;
        }
      }
      return true;
    });
  }, [partners, partnerTypeTab, statusFilter, managerFilter, searchQuery]);

  const sortedPartners = useMemo(() => {
    return sortErpItems(filteredPartners, sortKey, sortDir);
  }, [filteredPartners, sortKey, sortDir]);

  // Keep selectedPartner synchronized with current filtered list
  useEffect(() => {
    if (sortedPartners.length === 0) {
      setSelectedPartner(null);
      return;
    }
    if (selectedPartner) {
      const found = sortedPartners.find((p) => p.id === selectedPartner.id);
      if (found) {
        if (found !== selectedPartner) setSelectedPartner(found);
        return;
      }
    }
    setSelectedPartner(sortedPartners[0]);
  }, [sortedPartners]);

  // Open Create Modal
  const openCreateModal = () => {
    setPartnerModalMode("CREATE");
    setDirectBizCertSuggestion(null);
    setPartnerForm({
      id: 0,
      partnerType: partnerTypeTab === "ALL" ? "CUSTOMER" : partnerTypeTab,
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
      managerEmployeeId: currentUser?.id ? String(currentUser.id) : "",
      managerName: currentUser?.name || "",
      statementClosingDay: "매월 25일",
      taxInvoiceClosingDay: "익월 10일",
      paymentDueDay: "익월 15일",
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
    });
    setShowPartnerModal(true);
  };

  // Open Edit Modal
  const openEditModal = async (p: Partner) => {
    setPartnerModalMode("EDIT");
    setDirectBizCertSuggestion(null);
    const hasBiz = Boolean(p.hasBizCert || p.bizCertFileUrl);
    const hasBank = Boolean(p.hasBankCopy || p.bankCopyFileUrl);
    const hasContract = Boolean(p.hasContractFile || p.contractFileUrl);
    setPartnerForm({
      id: p.id,
      partnerType: p.partnerType,
      partnerCode: p.partnerCode,
      name: p.name,
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
      statementClosingDay: p.statementClosingDay || "매월 25일",
      taxInvoiceClosingDay: p.taxInvoiceClosingDay || "익월 10일",
      paymentDueDay: p.paymentDueDay || "익월 15일",
      status: p.status,
      ntsBizState: p.ntsBizState || null,
      ntsTaxType: p.ntsTaxType || null,
      ntsClosedDate: p.ntsClosedDate || null,
      ntsStatusMsg: p.ntsStatusMsg || null,
      ntsCheckedAt: p.ntsCheckedAt || null,
      memo: p.memo || "",
      bizCertFileUrl: p.bizCertFileUrl || "",
      bizCertFileName: p.bizCertFileName || "",
      hasBizCert: hasBiz,
      bankName: p.bankName || "",
      bankAccountNo: p.bankAccountNo || "",
      bankAccountHolder: p.bankAccountHolder || "",
      bankCopyFileUrl: p.bankCopyFileUrl || "",
      bankCopyFileName: p.bankCopyFileName || "",
      hasBankCopy: hasBank,
      contractFileUrl: p.contractFileUrl || "",
      contractFileName: p.contractFileName || "",
      hasContractFile: hasContract,
    });
    setShowPartnerModal(true);

    // Preload original files in background when opening Edit modal so preview/re-run OCR works seamlessly
    if (
      (hasBiz && !p.bizCertFileUrl) ||
      (hasBank && !p.bankCopyFileUrl) ||
      (hasContract && !p.contractFileUrl)
    ) {
      const files = await ensurePartnerFiles(p);
      setPartnerForm((prev: any) => {
        if (prev.id !== p.id) return prev;
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
      });
    }
  };

  // Submit Partner Save
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.name.trim()) {
      showToast("상호명(법인명)을 입력해주세요.", "error");
      return;
    }

    try {
      const url = "/api/erp/partners";
      const method = partnerModalMode === "CREATE" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partnerForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "거래처 저장 실패");

      if (partnerForm.id) {
        delete filesCacheRef.current[partnerForm.id];
      }
      invalidateMasterData("partners");
      showToast(data.message || "거래처가 성공적으로 저장되었습니다.");
      setShowPartnerModal(false);
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Delete Partner
  const handleDeletePartner = async (id: number, name: string) => {
    if (!confirm(`[${name}] 거래처를 삭제하시겠습니까? 관련된 모든 담당자 및 명함 정보도 함께 삭제됩니다.`)) return;

    try {
      const res = await fetch(`/api/erp/partners?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");

      delete filesCacheRef.current[id];
      delete contactsCacheRef.current[id];
      invalidateMasterData("partners");
      showToast("거래처가 삭제되었습니다.");
      if (selectedPartner?.id === id) setSelectedPartner(null);
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Open Contact Modal
  const openCreateContactModal = () => {
    if (!selectedPartner) return;
    setContactModalMode("CREATE");
    setContactForm({
      id: 0,
      partnerId: selectedPartner.id,
      name: "",
      department: "",
      position: "",
      mobile: "",
      email: "",
      telephone: "",
      isPrimary: partnerContacts.length === 0,
      businessCardFrontUrl: "",
      businessCardBackUrl: "",
      memo: "",
    });
    setShowContactModal(true);
  };

  const openEditContactModal = (c: PartnerContact) => {
    setContactModalMode("EDIT");
    setEditingContact(c);
    setContactForm({
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
    });
    setShowContactModal(true);
  };

  // Submit Contact Save
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim()) {
      showToast("담당자 성명을 입력해주세요.", "error");
      return;
    }

    try {
      const url = "/api/erp/partners/contacts";
      const method = contactModalMode === "CREATE" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "담당자 저장 실패");

      showToast(data.message || "담당자(명함)가 저장되었습니다.");
      setShowContactModal(false);
      if (selectedPartner?.id) {
        delete contactsCacheRef.current[selectedPartner.id];
        await fetchContacts(selectedPartner.id, true);
      }
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Delete Contact
  const handleDeleteContact = async (id: number, name: string) => {
    if (!confirm(`[${name}] 담당자 및 명함 정보를 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/erp/partners/contacts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");

      showToast("담당자가 삭제되었습니다.");
      if (selectedPartner?.id) {
        delete contactsCacheRef.current[selectedPartner.id];
        await fetchContacts(selectedPartner.id, true);
      }
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleExportCsv = () => {
    exportPartnersToCsv(sortedPartners, partnerTypeTab);
  };
  const extractPdfImageAndText = (file: File) => extractPdfImageAndTextFromSource(file);

  // Re-run OCR on currently uploaded bank copy fileData
  const handleReRunBankOcr = async () => {
    if (!partnerForm.bankCopyFileUrl) return;
    setBankOcrLoading(true);
    try {
      const res = await fetch("/api/erp/partners/ocr-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: partnerForm.bankCopyFileUrl,
          fileName: partnerForm.bankCopyFileName || "통장사본",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.parsed) {
        throw new Error(data?.error || "통장사본 OCR 판독 실패");
      }
      const p = data.parsed;
      setPartnerForm((prev: any) => ({
        ...prev,
        bankName: p.bankName || prev.bankName,
        bankAccountNo: p.bankAccountNo || prev.bankAccountNo,
        bankAccountHolder: p.bankAccountHolder || prev.bankAccountHolder,
      }));
      const details = [
        p.bankName && `은행: ${p.bankName}`,
        p.bankAccountNo && `계좌: ${p.bankAccountNo}`,
        p.bankAccountHolder && `예금주: ${p.bankAccountHolder}`,
      ].filter(Boolean).join(" | ");
      showToast(`통장사본 OCR 재판독 완료 (${details || "반영됨"})`);
    } catch (err: any) {
      showToast(err.message || "통장사본 OCR 판독 실패", "error");
    } finally {
      setBankOcrLoading(false);
    }
  };

  // Direct Bank Copy Upload with Automatic OCR
  const handleBankCopyFileUpload = async (file: File) => {
    if (!file) return;
    setBankOcrLoading(true);
    try {
      const ocr = await processBankCopyOcr(file);
      setPartnerForm((prev: any) => ({
        ...prev,
        bankCopyFileUrl: ocr.previewUrl,
        bankCopyFileName: file.name,
        bankName: ocr.bankName || prev.bankName,
        bankAccountNo: ocr.bankAccountNo || prev.bankAccountNo,
        bankAccountHolder: ocr.bankAccountHolder || prev.bankAccountHolder || prev.name || prev.ceoName || "",
      }));
      const details = [
        ocr.bankName && `은행: ${ocr.bankName}`,
        ocr.bankAccountNo && `계좌: ${ocr.bankAccountNo}`,
        ocr.bankAccountHolder && `예금주: ${ocr.bankAccountHolder}`,
      ].filter(Boolean).join(", ");
      showToast(`통장사본 자동 인식 완료 (${details || file.name})`);
    } catch (err: any) {
      try {
        const fallbackUrl = await readFileAsDataUrl(file);
        setPartnerForm((prev: any) => ({
          ...prev,
          bankCopyFileUrl: fallbackUrl,
          bankCopyFileName: file.name,
        }));
        showToast("통장사본 첨부 완료 (OCR 추출 불가로 수기 입력 필요)", "error");
      } catch (fErr) {
        showToast("통장사본 파일 읽기 실패", "error");
      }
    } finally {
      setBankOcrLoading(false);
    }
  };

  // Bankbook OCR Modal: File Processing
  const handleBankModalFileUpload = async (file: File) => {
    if (!file) return;
    setBankOcrLoading(true);
    setBankOcrFileName(file.name);
    setBankOcrResult(null);

    try {
      const ocr = await processBankCopyOcr(file);
      setBankOcrPreviewUrl(ocr.previewUrl);
      setBankOcrResult({
        bankName: ocr.bankName,
        bankAccountNo: ocr.bankAccountNo,
        bankAccountHolder: ocr.bankAccountHolder,
        branchName: ocr.branchName,
      });
      showToast(`통장사본 분석 완료: ${ocr.bankName || "은행"} ${ocr.bankAccountNo || ""}`);
    } catch (e: any) {
      showToast(e.message || "통장사본 OCR 판독 실패", "error");
    } finally {
      setBankOcrLoading(false);
    }
  };

  // Drag Event Handlers for Bank Copy OCR Modal
  const handleBankOcrDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isBankOcrModalDragging) setIsBankOcrModalDragging(true);
  };

  const handleBankOcrDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsBankOcrModalDragging(false);
  };

  const handleBankOcrDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBankOcrModalDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBankModalFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Apply Bank OCR result to Partner Form (opens CREATE modal as VENDOR)
  const handleApplyBankOcrToForm = () => {
    if (!bankOcrResult) return;
    setPartnerModalMode("CREATE");
    setPartnerForm({
      id: 0,
      partnerType: "VENDOR",
      partnerCode: "",
      name: bankOcrResult.bankAccountHolder || "",
      businessNo: "",
      corporateNo: "",
      ceoName: bankOcrResult.bankAccountHolder || "",
      bizType: "",
      bizItem: "",
      address: "",
      addressDetail: "",
      mainPhone: "",
      mainEmail: "",
      subEmail: "",
      faxNo: "",
      managerEmployeeId: currentUser?.id ? String(currentUser.id) : "",
      managerName: currentUser?.name || "",
      statementClosingDay: "매월 25일",
      taxInvoiceClosingDay: "익월 10일",
      paymentDueDay: "익월 15일",
      status: "ACTIVE",
      memo: `통장사본 기반 등록 (${bankOcrFileName})`,
      bizCertFileUrl: "",
      bizCertFileName: "",
      bankName: bankOcrResult.bankName || "",
      bankAccountNo: bankOcrResult.bankAccountNo || "",
      bankAccountHolder: bankOcrResult.bankAccountHolder || "",
      bankCopyFileUrl: bankOcrPreviewUrl || "",
      bankCopyFileName: bankOcrFileName || "",
      contractFileUrl: "",
      contractFileName: "",
    });
    setShowBankOcrModal(false);
    setShowPartnerModal(true);
    showToast("통장사본 정보가 매입거래처 등록 양식에 자동 입력되었습니다.");
  };


  // Direct Business Registration Certificate Upload (Partner Modal: Browse & Drag-Drop + Auto OCR & NTS Check)
  const handleDirectBizCertUpload = async (file: File) => {
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf && !file.type.startsWith("image/")) {
      showToast("PDF 또는 이미지 형식의 사업자등록증 파일을 선택해주세요.", "error");
      return;
    }

    setDirectBizCertOcrLoading(true);
    setDirectBizCertSuggestion(null);
    try {
      const { rawDataUrl, parsed } = await extractBizCertOcrFromFile(file);
      let ntsRes: any = null;
      if (parsed?.businessNo && normalizeBizNoDigits(parsed.businessNo).length === 10) {
        ntsRes = await queryNtsByBizNoClient(parsed.businessNo).catch(() => null);
      }

      setPartnerForm((prev: any) => {
        const next: any = {
          ...prev,
          bizCertFileUrl: rawDataUrl,
          bizCertFileName: file.name,
          hasBizCert: true,
        };
        if (parsed) {
          const isCreatePristine =
            partnerModalMode === "CREATE" && !prev.name?.trim() && !prev.businessNo?.trim();
          const applyField = (key: string, val?: string) => {
            if (!val) return;
            if (isCreatePristine || !prev[key] || !String(prev[key]).trim()) {
              next[key] = val;
            }
          };
          applyField("name", parsed.name);
          applyField("businessNo", parsed.businessNo);
          applyField("corporateNo", parsed.corporateNo);
          applyField("ceoName", parsed.ceoName);
          applyField("bizType", parsed.bizType);
          applyField("bizItem", parsed.bizItem);
          applyField("address", parsed.address);
          applyField("mainPhone", parsed.mainPhone);
          applyField("mainEmail", parsed.email);
        }
        if (ntsRes) {
          next.ntsBizState = ntsRes.ntsBizState;
          next.ntsTaxType = ntsRes.ntsTaxType;
          next.ntsClosedDate = ntsRes.ntsClosedDate;
          next.ntsStatusMsg = ntsRes.ntsStatusMsg;
          next.ntsCheckedAt = new Date().toISOString();
          if (ntsRes.shouldBlockTrade) {
            next.status = "BLOCKED";
          }
        }
        return next;
      });

      if (parsed) {
        setDirectBizCertSuggestion(parsed);
        if (ntsRes?.shouldBlockTrade) {
          showToast(
            `사업자등록증 인식 완료 — 국세청 ${ntsRes.ntsBizState === "CLOSED" ? "폐업자" : "휴업자"}로 확인되어 거래불가로 지정되었습니다.`,
            "error"
          );
        } else {
          showToast(`사업자등록증(${file.name}) 첨부 및 자동 인식이 완료되었습니다.`);
        }
      } else {
        showToast(`사업자등록증(${file.name}) 파일이 첨부되었습니다.`);
      }
    } catch (err: any) {
      showToast(err.message || "사업자등록증 파일 처리 실패", "error");
    } finally {
      setDirectBizCertOcrLoading(false);
    }
  };

  // Re-run OCR on currently attached partnerForm bizCertFileUrl
  const handlePartnerFormReRunOcr = async () => {
    if (!partnerForm.bizCertFileUrl || partnerForm.bizCertFileUrl === "__DELETE__") return;
    setDirectBizCertOcrLoading(true);
    try {
      const isPdf = isPdfDocument(partnerForm.bizCertFileUrl, partnerForm.bizCertFileName);
      let imageBase64 = "";
      let textHint = "";
      if (isPdf) {
        const pdfOut = await extractPdfImageAndTextFromSource(partnerForm.bizCertFileUrl);
        imageBase64 = pdfOut.imageBase64;
        textHint = pdfOut.textHint;
      } else {
        imageBase64 = partnerForm.bizCertFileUrl;
      }
      const res = await fetch("/api/erp/partners/ocr-biz-cert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageBase64 || undefined,
          rawText: textHint || undefined,
          fileName: partnerForm.bizCertFileName || "biz-cert",
        }),
      });
      const data = await res.json();
      if (!data.success || !data.parsed) {
        throw new Error(data.error || "사업자등록증 판독 실패");
      }
      setDirectBizCertSuggestion(data.parsed);
      showToast("사업자등록증 재인식이 완료되었습니다. 반영할 경우 [인식값 반영]을 선택하세요.");
    } catch (err: any) {
      showToast(err.message || "사업자등록증 재인식 실패", "error");
    } finally {
      setDirectBizCertOcrLoading(false);
    }
  };

  // Apply OCR Suggestion onto partnerForm
  const handleApplyDirectBizCertSuggestion = () => {
    if (!directBizCertSuggestion) return;
    const p = directBizCertSuggestion;
    setPartnerForm((prev: any) => ({
      ...prev,
      name: p.name || prev.name,
      businessNo: p.businessNo || prev.businessNo,
      corporateNo: p.corporateNo || prev.corporateNo,
      ceoName: p.ceoName || prev.ceoName,
      bizType: p.bizType || prev.bizType,
      bizItem: p.bizItem || prev.bizItem,
      address: p.address || prev.address,
      mainPhone: p.mainPhone || prev.mainPhone,
      mainEmail: p.email || prev.mainEmail,
    }));
    setDirectBizCertSuggestion(null);
    showToast("사업자등록증 인식값이 입력 양식에 반영되었습니다.");
  };

  // Partner Modal Single NTS Check
  const handleFormCheckNtsStatus = async () => {
    const digits = normalizeBizNoDigits(partnerForm.businessNo);
    if (digits.length !== 10) {
      showToast("10자리 사업자등록번호를 먼저 입력해주세요.", "error");
      return;
    }
    setFormNtsChecking(true);
    try {
      const res = await queryNtsByBizNoClient(partnerForm.businessNo);
      if (!res) throw new Error("국세청 휴·폐업 조회 실패");
      setPartnerForm((prev: any) => ({
        ...prev,
        businessNo: res.businessNo || prev.businessNo,
        ntsBizState: res.ntsBizState,
        ntsTaxType: res.ntsTaxType,
        ntsClosedDate: res.ntsClosedDate,
        ntsStatusMsg: res.ntsStatusMsg,
        ntsCheckedAt: new Date().toISOString(),
        status: res.shouldBlockTrade ? "BLOCKED" : prev.status,
      }));
      if (res.shouldBlockTrade) {
        showToast(
          `국세청 확인: ${res.ntsBizState === "CLOSED" ? "폐업자" : "휴업자"} — 거래불가 상태로 전환되었습니다.`,
          "error"
        );
      } else {
        showToast(`국세청 확인: ${getNtsBizStateBadgeLabel(res.ntsBizState)} (${res.ntsTaxType})`);
      }
    } catch (err: any) {
      showToast(err.message || "국세청 휴·폐업 조회 실패", "error");
    } finally {
      setFormNtsChecking(false);
    }
  };

  // Direct Contract PDF Upload in Partner Modal
  const handleDirectContractUpload = async (file: File) => {
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf && !file.type.startsWith("image/")) {
      showToast("PDF 또는 이미지 형식의 계약서 파일을 선택해주세요.", "error");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPartnerForm((prev: any) => ({
        ...prev,
        contractFileUrl: dataUrl,
        contractFileName: file.name,
        hasContractFile: true,
      }));
      showToast(`계약서(${file.name})가 첨부되었습니다.`);
    } catch (err: any) {
      showToast("계약서 파일 읽기 실패", "error");
    }
  };

  // Direct Business Cert Upload & Immediate DB Save from Right-Hand Dossier Panel
  const handleDossierBizCertUpload = async (file: File) => {
    if (!file || !selectedPartner) return;
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf && !file.type.startsWith("image/")) {
      showToast("PDF 또는 이미지 형식의 사업자등록증 파일을 업로드해주세요.", "error");
      return;
    }
    setDossierBizCertSaving(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch("/api/erp/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPartnerPutPayload(selectedPartner, {
            bizCertFileUrl: dataUrl,
            bizCertFileName: file.name,
          })
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "사업자등록증 저장 실패");
      }
      const targetId = selectedPartner.id;
      const prevCache = filesCacheRef.current[targetId] || {};
      filesCacheRef.current[targetId] = { ...prevCache, bizCertFileUrl: dataUrl };
      setPartners((prev) =>
        prev.map((item) =>
          item.id === targetId
            ? { ...item, bizCertFileUrl: dataUrl, bizCertFileName: file.name, hasBizCert: true }
            : item
        )
      );
      setSelectedPartner((prev) =>
        prev && prev.id === targetId
          ? { ...prev, bizCertFileUrl: dataUrl, bizCertFileName: file.name, hasBizCert: true }
          : prev
      );
      showToast(`[${selectedPartner.name}] 사업자등록증(${file.name})이 저장되었습니다.`);
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message || "사업자등록증 저장 실패", "error");
    } finally {
      setDossierBizCertSaving(false);
    }
  };

  // Delete Business Cert directly from Right-Hand Dossier Panel
  const handleDossierBizCertDelete = async () => {
    if (!selectedPartner) return;
    if (!confirm(`[${selectedPartner.name}] 등록된 사업자등록증 파일을 삭제하시겠습니까?`)) return;
    setDossierBizCertSaving(true);
    try {
      const res = await fetch("/api/erp/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPartnerPutPayload(selectedPartner, {
            bizCertFileUrl: "__DELETE__",
            bizCertFileName: "",
          })
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "사업자등록증 삭제 실패");
      }
      const targetId = selectedPartner.id;
      if (filesCacheRef.current[targetId]) {
        filesCacheRef.current[targetId].bizCertFileUrl = null;
      }
      setPartners((prev) =>
        prev.map((item) =>
          item.id === targetId
            ? { ...item, bizCertFileUrl: null, bizCertFileName: null, hasBizCert: false }
            : item
        )
      );
      setSelectedPartner((prev) =>
        prev && prev.id === targetId
          ? { ...prev, bizCertFileUrl: null, bizCertFileName: null, hasBizCert: false }
          : prev
      );
      showToast(`[${selectedPartner.name}] 사업자등록증 파일이 삭제되었습니다.`);
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message || "사업자등록증 삭제 실패", "error");
    } finally {
      setDossierBizCertSaving(false);
    }
  };

  // Direct Contract PDF Upload & Immediate DB Save from Right-Hand Dossier Panel
  const handleDossierContractUpload = async (file: File) => {
    if (!file || !selectedPartner) return;
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf && !file.type.startsWith("image/")) {
      showToast("PDF 또는 이미지 형식의 계약서 파일을 업로드해주세요.", "error");
      return;
    }
    setDossierContractSaving(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch("/api/erp/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPartnerPutPayload(selectedPartner, {
            contractFileUrl: dataUrl,
            contractFileName: file.name,
          })
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "계약서 저장 실패");
      }

      const targetId = selectedPartner.id;
      const prevCache = filesCacheRef.current[targetId] || {};
      filesCacheRef.current[targetId] = {
        ...prevCache,
        contractFileUrl: dataUrl,
      };
      setPartners((prev) =>
        prev.map((item) =>
          item.id === targetId
            ? {
                ...item,
                contractFileUrl: dataUrl,
                contractFileName: file.name,
                hasContractFile: true,
              }
            : item
        )
      );
      setSelectedPartner((prev) =>
        prev && prev.id === targetId
          ? {
              ...prev,
              contractFileUrl: dataUrl,
              contractFileName: file.name,
              hasContractFile: true,
            }
          : prev
      );
      showToast(`[${selectedPartner.name}] 계약서(${file.name})가 저장되었습니다.`);
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message || "계약서 업로드 실패", "error");
    } finally {
      setDossierContractSaving(false);
    }
  };

  // Delete Contract PDF directly from Right-Hand Dossier Panel
  const handleDossierContractDelete = async () => {
    if (!selectedPartner) return;
    if (!confirm(`[${selectedPartner.name}] 등록된 계약서 파일을 삭제하시겠습니까?`)) return;
    setDossierContractSaving(true);
    try {
      const res = await fetch("/api/erp/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPartnerPutPayload(selectedPartner, {
            contractFileUrl: "__DELETE__",
            contractFileName: "",
          })
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "계약서 삭제 실패");
      }

      const targetId = selectedPartner.id;
      if (filesCacheRef.current[targetId]) {
        filesCacheRef.current[targetId].contractFileUrl = null;
      }
      setPartners((prev) =>
        prev.map((item) =>
          item.id === targetId
            ? {
                ...item,
                contractFileUrl: null,
                contractFileName: null,
                hasContractFile: false,
              }
            : item
        )
      );
      setSelectedPartner((prev) =>
        prev && prev.id === targetId
          ? {
              ...prev,
              contractFileUrl: null,
              contractFileName: null,
              hasContractFile: false,
            }
          : prev
      );
      showToast(`[${selectedPartner.name}] 계약서 파일이 삭제되었습니다.`);
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message || "계약서 삭제 실패", "error");
    } finally {
      setDossierContractSaving(false);
    }
  };

  // Single Partner Immediate NTS Lookup
  const handleRunSingleNtsCheck = async (partner: Partner, autoUnblockActive = false) => {
    if (!partner?.id) return;
    if (normalizeBizNoDigits(partner.businessNo).length !== 10) {
      showToast("유효한 10자리 사업자등록번호가 등록되어 있지 않습니다.", "error");
      return;
    }
    setSingleNtsCheckingId(partner.id);
    try {
      const res = await fetch("/api/erp/partners/check-biz-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: partner.id,
          autoBlock: true,
          autoUnblockActive,
          actorName: currentUser?.name || "ADMIN",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "국세청 휴·폐업 조회 실패");
      }
      const item = data.results?.[0];
      await fetchPartners();
      if (item) {
        if (viewerForm && viewerForm.id === partner.id) {
          setViewerForm((prev: any) => ({
            ...prev,
            status: item.nextStatus,
            ntsBizState: item.ntsBizState,
            ntsTaxType: item.ntsTaxType,
            ntsClosedDate: item.ntsClosedDate,
            ntsStatusMsg: item.ntsStatusMsg,
            ntsCheckedAt: item.ntsCheckedAt,
          }));
        }
        if (item.ntsBizState === "CLOSED" || item.ntsBizState === "SUSPENDED") {
          showToast(
            `[${partner.name}] ${getNtsBizStateBadgeLabel(item.ntsBizState)} 확인 — 거래불가 처리되었습니다.`,
            "error"
          );
        } else {
          showToast(
            `[${partner.name}] 국세청 상태: ${getNtsBizStateBadgeLabel(item.ntsBizState)} (${item.ntsTaxType})`
          );
        }
      }
    } catch (err: any) {
      showToast(err.message || "휴·폐업 조회 실패", "error");
    } finally {
      setSingleNtsCheckingId(null);
    }
  };

  // Batch NTS Lookup Handler
  const handleRunBatchBizStatusCheck = async () => {
    setBatchLoading(true);
    try {
      const payload: Record<string, any> = {
        autoBlock: batchAutoBlock,
        actorName: currentUser?.name || "ADMIN",
      };
      if (batchScope === "FILTERED") {
        payload.partnerIds = sortedPartners.map((p) => p.id);
      } else {
        payload.scope = batchScope;
      }

      const res = await fetch("/api/erp/partners/check-biz-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "국세청 일괄조회 실패");
      }
      setBatchResult({ summary: data.summary, results: data.results || [] });
      await fetchPartners();
      const s = data.summary || {};
      showToast(
        `조회 완료: ${s.checkedCount || 0}건 확인 (휴업 ${s.suspendedCount || 0} / 폐업 ${s.closedCount || 0} / 거래불가 전환 ${s.newlyBlockedCount || 0}건)`
      );
    } catch (err: any) {
      showToast(err.message || "일괄조회 처리 실패", "error");
    } finally {
      setBatchLoading(false);
    }
  };

  // Split Viewer File Replace (Browse & Drag-Drop)
  const handleViewerFileReplace = async (file: File) => {
    if (!file || !activeDocument) return;
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf && !file.type.startsWith("image/")) {
      showToast("PDF 또는 이미지 파일을 선택해주세요.", "error");
      return;
    }

    setViewerOcrLoading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const docType = activeDocument.docType || "BIZ_CERT";
      const pid = activeDocument.partnerId;

      if (pid) {
        const target = partners.find((p) => p.id === pid) || selectedPartner;
        if (target) {
          const overrideFields =
            docType === "BIZ_CERT"
              ? { bizCertFileUrl: dataUrl, bizCertFileName: file.name }
              : docType === "BANK_COPY"
              ? { bankCopyFileUrl: dataUrl, bankCopyFileName: file.name }
              : { contractFileUrl: dataUrl, contractFileName: file.name };

          const res = await fetch("/api/erp/partners", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildPartnerPutPayload(target, overrideFields)),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "파일 교체 저장 실패");
          }
          const prevCache = filesCacheRef.current[pid] || {};
          if (docType === "BIZ_CERT") prevCache.bizCertFileUrl = dataUrl;
          else if (docType === "BANK_COPY") prevCache.bankCopyFileUrl = dataUrl;
          else prevCache.contractFileUrl = dataUrl;
          filesCacheRef.current[pid] = prevCache;
          await fetchPartners();
        }
      }

      setActiveDocument((prev) =>
        prev ? { ...prev, url: dataUrl, fileName: file.name } : prev
      );
      showToast(`파일(${file.name})이 교체 저장되었습니다.`);
    } catch (err: any) {
      showToast(err.message || "파일 교체 실패", "error");
    } finally {
      setViewerOcrLoading(false);
    }
  };

  // Split Viewer Re-run OCR on Current Document
  const handleViewerReRunOcr = async () => {
    if (!activeDocument?.url || !viewerForm) return;
    setViewerOcrLoading(true);
    try {
      const isPdf = isPdfDocument(activeDocument.url, activeDocument.fileName);
      let imageBase64 = "";
      let textHint = "";
      if (isPdf) {
        const pdfOut = await extractPdfImageAndTextFromSource(activeDocument.url);
        imageBase64 = pdfOut.imageBase64;
        textHint = pdfOut.textHint;
      } else {
        imageBase64 = activeDocument.url;
      }

      const res = await fetch("/api/erp/partners/ocr-biz-cert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageBase64 || undefined,
          rawText: textHint || undefined,
          fileName: activeDocument.fileName || "biz-cert",
        }),
      });
      const data = await res.json();
      if (!data.success || !data.parsed) {
        throw new Error(data.error || "서류 판독 실패");
      }
      const p = data.parsed;
      setViewerForm((prev: any) => ({
        ...prev,
        name: p.name || prev.name,
        businessNo: p.businessNo || prev.businessNo,
        corporateNo: p.corporateNo || prev.corporateNo,
        ceoName: p.ceoName || prev.ceoName,
        bizType: p.bizType || prev.bizType,
        bizItem: p.bizItem || prev.bizItem,
        address: p.address || prev.address,
        mainPhone: p.mainPhone || prev.mainPhone,
        mainEmail: p.email || prev.mainEmail,
      }));
      showToast("서류 판독 결과가 우측 양식에 반영되었습니다. 확인 후 저장하세요.");
    } catch (err: any) {
      showToast(err.message || "서류 재판독 실패", "error");
    } finally {
      setViewerOcrLoading(false);
    }
  };

  // Split Viewer Single NTS Lookup
  const handleViewerNtsCheck = async () => {
    if (!viewerForm) return;
    const digits = normalizeBizNoDigits(viewerForm.businessNo);
    if (digits.length !== 10) {
      showToast("10자리 사업자등록번호를 입력해주세요.", "error");
      return;
    }
    setViewerNtsLoading(true);
    try {
      const ntsRes = await queryNtsByBizNoClient(viewerForm.businessNo);
      if (!ntsRes) throw new Error("국세청 휴·폐업 조회 실패");

      setViewerForm((prev: any) => ({
        ...prev,
        businessNo: ntsRes.businessNo || prev.businessNo,
        ntsBizState: ntsRes.ntsBizState,
        ntsTaxType: ntsRes.ntsTaxType,
        ntsClosedDate: ntsRes.ntsClosedDate,
        ntsStatusMsg: ntsRes.ntsStatusMsg,
        ntsCheckedAt: new Date().toISOString(),
        status: ntsRes.shouldBlockTrade ? "BLOCKED" : prev.status,
      }));
      if (ntsRes.shouldBlockTrade) {
        showToast(
          `국세청 확인: ${getNtsBizStateBadgeLabel(ntsRes.ntsBizState)} — [정보 저장] 시 거래불가로 반영됩니다.`,
          "error"
        );
      } else {
        showToast(
          `국세청 상태: ${getNtsBizStateBadgeLabel(ntsRes.ntsBizState)} (${ntsRes.ntsTaxType})`
        );
      }
    } catch (err: any) {
      showToast(err.message || "국세청 조회 실패", "error");
    } finally {
      setViewerNtsLoading(false);
    }
  };

  // Split Viewer Save Inline Partner Edits
  const handleViewerSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewerForm || !viewerForm.id) return;
    if (!viewerForm.name || !String(viewerForm.name).trim()) {
      showToast("상호명(법인명)을 입력해주세요.", "error");
      return;
    }
    setViewerSaving(true);
    try {
      const res = await fetch("/api/erp/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(viewerForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "거래처 정보 수정 실패");
      }

      setActiveDocument((prev) =>
        prev ? { ...prev, partnerName: String(viewerForm.name).trim() } : prev
      );
      showToast("원본 대조 수정사항이 저장되었습니다.");
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message || "수정사항 저장 실패", "error");
    } finally {
      setViewerSaving(false);
    }
  };

  // Business Registration Certificate Drag & Drop / File Processing (Simple OCR Modal)
  const handleBizCertFileUpload = async (file: File) => {
    if (!file) return;
    setOcrLoading(true);
    setOcrFileName(file.name);
    setOcrResult(null);
    setOcrNtsStatus(null);

    try {
      const { rawDataUrl, thumbUrl, parsed, errorMessage } =
        await extractBizCertOcrFromFile(file);

      setOcrPreviewFileUrl(rawDataUrl);
      setOcrPreviewThumbUrl(thumbUrl);

      if (parsed) {
        setOcrResult(parsed);
        if (parsed.businessNo && normalizeBizNoDigits(parsed.businessNo).length === 10) {
          const ntsRes = await queryNtsByBizNoClient(parsed.businessNo).catch(() => null);
          if (ntsRes) setOcrNtsStatus(ntsRes);
        }
        showToast("사업자등록증 정보가 자동 분석되었습니다.");
      } else {
        showToast(
          errorMessage || "자동 분석을 완료할 수 없습니다. 파일을 확인해주세요.",
          "error"
        );
      }
    } catch (e: any) {
      showToast(e.message || "파일 처리 실패", "error");
    } finally {
      setOcrLoading(false);
    }
  };

  // Drag Event Handlers for Biz Cert Dropzone
  const handleCertDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCertDragging) setIsCertDragging(true);
  };

  const handleCertDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsCertDragging(false);
  };

  const handleCertDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCertDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBizCertFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Apply OCR to Partner Form and open full create form
  const handleApplyOcrToForm = () => {
    if (!ocrResult) return;
    setPartnerModalMode("CREATE");
    setDirectBizCertSuggestion(null);
    setPartnerForm({
      id: 0,
      partnerType: partnerTypeTab === "ALL" ? "CUSTOMER" : partnerTypeTab,
      partnerCode: "",
      name: ocrResult.name || "",
      businessNo: ocrResult.businessNo || "",
      corporateNo: ocrResult.corporateNo || "",
      ceoName: ocrResult.ceoName || "",
      bizType: ocrResult.bizType || "",
      bizItem: ocrResult.bizItem || "",
      address: ocrResult.address || "",
      addressDetail: "",
      mainPhone: ocrResult.mainPhone || "",
      mainEmail: ocrResult.email || "",
      subEmail: "",
      faxNo: "",
      managerEmployeeId: currentUser?.id ? String(currentUser.id) : "",
      managerName: currentUser?.name || "",
      statementClosingDay: "매월 25일",
      taxInvoiceClosingDay: "익월 10일",
      paymentDueDay: "익월 15일",
      status: ocrNtsStatus?.shouldBlockTrade ? "BLOCKED" : "ACTIVE",
      ntsBizState: ocrNtsStatus?.ntsBizState || null,
      ntsTaxType: ocrNtsStatus?.ntsTaxType || null,
      ntsClosedDate: ocrNtsStatus?.ntsClosedDate || null,
      ntsStatusMsg: ocrNtsStatus?.ntsStatusMsg || null,
      ntsCheckedAt: ocrNtsStatus ? new Date().toISOString() : null,
      memo: `사업자등록증 기반 등록 (${ocrFileName})`,
      bizCertFileUrl: ocrPreviewFileUrl || "",
      bizCertFileName: ocrFileName || "",
      bankName: "",
      bankAccountNo: "",
      bankAccountHolder: "",
      bankCopyFileUrl: "",
      bankCopyFileName: "",
      contractFileUrl: "",
      contractFileName: "",
    });
    setShowBizCertOcrModal(false);
    setShowPartnerModal(true);
    showToast("사업자등록증 정보가 거래처 등록 양식에 자동 입력되었습니다.");
  };

  // Business Card Upload
  const handleCardImageUpload = async (file: File, side: "front" | "back") => {
    try {
      const base64Data = await resizeImageToBase64(file, 1600);
      if (side === "front") {
        setContactForm((prev: any) => ({ ...prev, businessCardFrontUrl: base64Data }));
        const res = await fetch("/api/erp/partners/ocr-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64Data, fileName: file.name }),
        });
        const data = await res.json();
        if (data.success && data.parsed) {
          setContactForm((prev: any) => ({
            ...prev,
            name: prev.name || data.parsed.name || "",
            position: prev.position || data.parsed.position || "",
            department: prev.department || data.parsed.department || "",
            mobile: prev.mobile || data.parsed.mobile || "",
            email: prev.email || data.parsed.email || "",
            telephone: prev.telephone || data.parsed.telephone || "",
          }));
          showToast("명함 정보가 자동 분석되었습니다.");
        }
      } else {
        setContactForm((prev: any) => ({ ...prev, businessCardBackUrl: base64Data }));
      }
    } catch (e: any) {
      showToast(e.message || "명함 처리 실패", "error");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-xs font-bold border ${
            toastMessage.type === "success"
              ? "bg-[#ecfdf5] border-[#047857] text-[#065f46]"
              : "bg-[#fef2f2] border-[#dc2626] text-[#b91c1c]"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Top Header: Tab Switching & Scope Filters & Action Pipeline (Gutenberg Z-Pattern ① & ②) */}
      <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* Sub-Tabs: 고객 vs 매입거래처 */}
          <div className="flex items-center gap-1 bg-[#dcd4c4] dark:bg-slate-800 p-1 rounded border border-[#b5a894] dark:border-slate-700">
            <button
              onClick={() => {
                if (onSelectTypeTab && initialType !== "CUSTOMER") {
                  onSelectTypeTab("CUSTOMER");
                } else {
                  setPartnerTypeTab("CUSTOMER");
                }
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition ${
                partnerTypeTab === "CUSTOMER"
                  ? "bg-[#1d4ed8] text-white shadow"
                  : "text-[#334155] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>고객 관리 (매출처)</span>
              <span className="px-1.5 py-0.2 bg-[#1e40af] text-white rounded-full text-[10px]">
                {formatErpNumber(kpi.customerCount)}
              </span>
            </button>
            <button
              onClick={() => {
                if (onSelectTypeTab && initialType !== "VENDOR") {
                  onSelectTypeTab("VENDOR");
                } else {
                  setPartnerTypeTab("VENDOR");
                }
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition ${
                partnerTypeTab === "VENDOR"
                  ? "bg-[#b45309] text-white shadow"
                  : "text-[#334155] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>매입거래처 관리</span>
              <span className="px-1.5 py-0.2 bg-[#92400e] text-white rounded-full text-[10px]">
                {formatErpNumber(kpi.vendorCount)}
              </span>
            </button>
            <button
              onClick={() => {
                setPartnerTypeTab("ALL");
                onSelectTypeTab?.("ALL");
              }}
              className={`px-2.5 py-1.5 text-xs font-bold rounded transition ${
                partnerTypeTab === "ALL"
                  ? "bg-[#504a3f] text-white"
                  : "text-[#334155] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white"
              }`}
            >
              전체 ({formatErpNumber(kpi.totalCount)})
            </button>
          </div>

          {/* Scope Filters */}
          <div className="hidden md:flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] px-2.5 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 상태</option>
              <option value="ACTIVE">정상 거래</option>
              <option value="BLOCKED">거래불가</option>
              <option value="INACTIVE">거래 중지</option>
              <option value="DORMANT">휴면</option>
            </select>

            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] px-2.5 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <option value="ALL">전체 본사담당자</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.department || "본사"})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#64748b]" />
            <input
              type="text"
              placeholder="상호 / 사업자번호 / 대표자 / 담당자 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchPartners()}
              className="bg-[#ebe5d8] border border-[#b5a894] text-xs text-[#0f172a] pl-8 pr-3 py-1.5 rounded w-60 focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Action Pipeline Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPartners}
            disabled={loading}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] text-xs font-bold rounded flex items-center gap-1.5 border border-[#b5a894] transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>

          <button
            onClick={() => {
              setBatchResult(null);
              setShowBizStatusBatchModal(true);
            }}
            className="px-3 py-1.5 bg-[#991b1b] hover:bg-[#7f1d1d] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition whitespace-nowrap shrink-0"
            title="국세청 사업자 휴폐업 일괄 조회"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>휴폐업 일괄조회</span>
          </button>

          {/* 사업자등록증 간편 등록 버튼 */}
          <button
            onClick={() => {
              setOcrResult(null);
              setOcrPreviewFileUrl("");
              setOcrPreviewThumbUrl("");
              setOcrNtsStatus(null);
              setOcrFileName("");
              setShowBizCertOcrModal(true);
            }}
            className="px-3 py-1.5 bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition whitespace-nowrap shrink-0"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>사업자등록증 간편등록</span>
          </button>

          {/* 통장사본 간편 등록 버튼 (매입거래처 OCR) */}
          <button
            onClick={() => {
              setBankOcrResult(null);
              setBankOcrPreviewUrl("");
              setBankOcrFileName("");
              setShowBankOcrModal(true);
            }}
            className="px-3 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
            title="통장사본 OCR로 매입거래처 간편등록"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>통장사본 간편등록</span>
          </button>

          {/* 신규 직접 등록 */}
          <button
            onClick={openCreateModal}
            className="px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {partnerTypeTab === "VENDOR" ? "신규 매입거래처 등록" : "신규 거래처 등록"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Workspace (Gutenberg Z-Pattern ③ & ④) */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left: High-Density Partner Grid (7~8 cols) */}
        <PartnerListPanel
          docFetching={docFetching}
          handleOpenPartnerDoc={handleOpenPartnerDoc}
          kpi={kpi}
          loading={loading}
          partnerTypeTab={partnerTypeTab}
          renderSortTh={renderSortTh}
          selectedPartner={selectedPartner}
          setSelectedPartner={setSelectedPartner}
          sortedPartners={sortedPartners}
        />

        {/* Right: Master-Detail Dossier Studio (4~5 cols) */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden shadow-xs dark:bg-slate-900 dark:border-slate-800">
          {selectedPartner ? (
          <PartnerDossierPanel
            contactsLoading={contactsLoading}
            docFetching={docFetching}
            dossierBizCertInputRef={dossierBizCertInputRef}
            dossierBizCertSaving={dossierBizCertSaving}
            dossierContractInputRef={dossierContractInputRef}
            dossierContractSaving={dossierContractSaving}
            dossierMainEmail={dossierMainEmail}
            dossierSubEmail={dossierSubEmail}
            editingDossierEmail={editingDossierEmail}
            handleDeleteContact={handleDeleteContact}
            handleDeletePartner={handleDeletePartner}
            handleDossierBizCertDelete={handleDossierBizCertDelete}
            handleDossierBizCertUpload={handleDossierBizCertUpload}
            handleDossierContractDelete={handleDossierContractDelete}
            handleDossierContractUpload={handleDossierContractUpload}
            handleOpenPartnerDoc={handleOpenPartnerDoc}
            handleRunSingleNtsCheck={handleRunSingleNtsCheck}
            handleSaveDossierEmail={handleSaveDossierEmail}
            isAdmin={isAdmin}
            isDossierBizCertDragging={isDossierBizCertDragging}
            isDossierContractDragging={isDossierContractDragging}
            openCreateContactModal={openCreateContactModal}
            openEditContactModal={openEditContactModal}
            openEditModal={openEditModal}
            partnerContacts={partnerContacts}
            savingDossierEmail={savingDossierEmail}
            selectedPartner={selectedPartner}
            setActiveDocument={setActiveDocument}
            setDossierMainEmail={setDossierMainEmail}
            setDossierSubEmail={setDossierSubEmail}
            setEditingDossierEmail={setEditingDossierEmail}
            setIsDossierBizCertDragging={setIsDossierBizCertDragging}
            setIsDossierContractDragging={setIsDossierContractDragging}
            showToast={showToast}
            singleNtsCheckingId={singleNtsCheckingId}
          />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#475569] text-xs p-6 text-center">
              <Building2 className="w-8 h-8 opacity-30 mb-2 text-[#475569]" />
              <span>목록에서 거래처를 선택하면 상세 정보 및 명함 보관함이 표시됩니다.</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. Modal: 신규/수정 거래처 폼 (Warm Paper Aesthetic) */}
      {/* ========================================================================= */}
      {showPartnerModal && (
        <PartnerFormModal
          bankCopyInputRef={bankCopyInputRef}
          bankOcrLoading={bankOcrLoading}
          directBizCertInputRef={directBizCertInputRef}
          directBizCertOcrLoading={directBizCertOcrLoading}
          directBizCertSuggestion={directBizCertSuggestion}
          directContractInputRef={directContractInputRef}
          employees={employees}
          formNtsChecking={formNtsChecking}
          handleApplyDirectBizCertSuggestion={handleApplyDirectBizCertSuggestion}
          handleBankCopyFileUpload={handleBankCopyFileUpload}
          handleDirectBizCertUpload={handleDirectBizCertUpload}
          handleDirectContractUpload={handleDirectContractUpload}
          handleFormCheckNtsStatus={handleFormCheckNtsStatus}
          handlePartnerFormReRunOcr={handlePartnerFormReRunOcr}
          handleReRunBankOcr={handleReRunBankOcr}
          handleSavePartner={handleSavePartner}
          isBankCopyDragging={isBankCopyDragging}
          isDirectBizCertDragging={isDirectBizCertDragging}
          isDirectContractDragging={isDirectContractDragging}
          partnerForm={partnerForm}
          partnerModalMode={partnerModalMode}
          setActiveDocument={setActiveDocument}
          setDirectBizCertSuggestion={setDirectBizCertSuggestion}
          setIsBankCopyDragging={setIsBankCopyDragging}
          setIsDirectBizCertDragging={setIsDirectBizCertDragging}
          setIsDirectContractDragging={setIsDirectContractDragging}
          setPartnerForm={setPartnerForm}
          setShowPartnerModal={setShowPartnerModal}
        />
      )}

      {/* ========================================================================= */}
      {/* 2. Modal: 사업자등록증 OCR 간편등록 모달 (Full Drag-and-Drop & Paper Tone) */}
      {/* ========================================================================= */}
      {showBizCertOcrModal && (
        <BizCertOcrModal
          certFileInputRef={certFileInputRef}
          handleApplyOcrToForm={handleApplyOcrToForm}
          handleBizCertFileUpload={handleBizCertFileUpload}
          handleCertDragLeave={handleCertDragLeave}
          handleCertDragOver={handleCertDragOver}
          handleCertDrop={handleCertDrop}
          isCertDragging={isCertDragging}
          ocrFileName={ocrFileName}
          ocrLoading={ocrLoading}
          ocrNtsStatus={ocrNtsStatus}
          ocrPreviewThumbUrl={ocrPreviewThumbUrl}
          ocrResult={ocrResult}
          setOcrResult={setOcrResult}
          setShowBizCertOcrModal={setShowBizCertOcrModal}
          setZoomImageUrl={setZoomImageUrl}
        />
      )}

      {/* ========================================================================= */}
      {/* 2-2. Modal: 통장사본 OCR 간편등록 모달 (Bank Copy Drag-and-Drop & Paper Tone) */}
      {/* ========================================================================= */}
      {showBankOcrModal && (
        <BankCopyOcrModal
          bankOcrFileName={bankOcrFileName}
          bankOcrLoading={bankOcrLoading}
          bankOcrModalFileInputRef={bankOcrModalFileInputRef}
          bankOcrPreviewUrl={bankOcrPreviewUrl}
          bankOcrResult={bankOcrResult}
          handleApplyBankOcrToForm={handleApplyBankOcrToForm}
          handleBankModalFileUpload={handleBankModalFileUpload}
          handleBankOcrDragLeave={handleBankOcrDragLeave}
          handleBankOcrDragOver={handleBankOcrDragOver}
          handleBankOcrDrop={handleBankOcrDrop}
          isBankOcrModalDragging={isBankOcrModalDragging}
          setActiveDocument={setActiveDocument}
          setBankOcrResult={setBankOcrResult}
          setShowBankOcrModal={setShowBankOcrModal}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. Modal: 거래처 담당자 및 실물 명함 등록 모달 (Warm Paper Tone) */}
      {/* ========================================================================= */}
      {showContactModal && (
        <ContactFormModal
          contactForm={contactForm}
          contactModalMode={contactModalMode}
          handleCardImageUpload={handleCardImageUpload}
          handleSaveContact={handleSaveContact}
          selectedPartner={selectedPartner}
          setContactForm={setContactForm}
          setShowContactModal={setShowContactModal}
          setZoomImageUrl={setZoomImageUrl}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. Modal: 국세청 휴·폐업 일괄조회 및 거래불가 연동 */}
      {/* ========================================================================= */}
      {showBizStatusBatchModal && (
        <BizStatusBatchModal
          batchAutoBlock={batchAutoBlock}
          batchLoading={batchLoading}
          batchResult={batchResult}
          batchScope={batchScope}
          handleRunBatchBizStatusCheck={handleRunBatchBizStatusCheck}
          handleRunSingleNtsCheck={handleRunSingleNtsCheck}
          ntsSort={ntsSort}
          partners={partners}
          setBatchAutoBlock={setBatchAutoBlock}
          setBatchResult={setBatchResult}
          setBatchScope={setBatchScope}
          setSelectedPartner={setSelectedPartner}
          setShowBizStatusBatchModal={setShowBizStatusBatchModal}
          singleNtsCheckingId={singleNtsCheckingId}
          sortedPartners={sortedPartners}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. Modal: 통합 문서 뷰어 & 원본 대조 거래처 수정 스튜디오 */}
      {/* ========================================================================= */}
      <PartnerDocViewerModal
        activeDocument={activeDocument}
        handleViewerFileReplace={handleViewerFileReplace}
        handleViewerNtsCheck={handleViewerNtsCheck}
        handleViewerReRunOcr={handleViewerReRunOcr}
        handleViewerSavePartner={handleViewerSavePartner}
        isViewerDragging={isViewerDragging}
        resolvedPdfBlobUrl={resolvedPdfBlobUrl}
        selectedPartner={selectedPartner}
        setActiveDocument={setActiveDocument}
        setIsViewerDragging={setIsViewerDragging}
        setViewerForm={setViewerForm}
        setViewerRotation={setViewerRotation}
        setViewerZoom={setViewerZoom}
        setZoomImageUrl={setZoomImageUrl}
        viewerForm={viewerForm}
        viewerNtsLoading={viewerNtsLoading}
        viewerOcrLoading={viewerOcrLoading}
        viewerReplaceFileInputRef={viewerReplaceFileInputRef}
        viewerRotation={viewerRotation}
        viewerSaving={viewerSaving}
        viewerZoom={viewerZoom}
        zoomImageUrl={zoomImageUrl}
      />
    </div>
  );
};
