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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
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
  Printer
} from "lucide-react";
import { formatErpNumber, sortErpItems, SortDirection } from "@/lib/erpFormat";

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
  faxNo?: string | null;
  managerEmployeeId?: number | null;
  managerName?: string | null;
  statementClosingDay: string;
  taxInvoiceClosingDay: string;
  paymentDueDay: string;
  status: "ACTIVE" | "INACTIVE" | "DORMANT";
  memo?: string | null;
  bizCertFileUrl?: string | null;
  bizCertFileName?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankAccountHolder?: string | null;
  bankCopyFileUrl?: string | null;
  bankCopyFileName?: string | null;
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

interface PartnerManagementTabProps {
  currentUser: any;
  initialType?: "CUSTOMER" | "VENDOR";
  onNavigateToTax?: () => void;
}

export const PartnerManagementTab: React.FC<PartnerManagementTabProps> = ({
  currentUser,
  initialType = "CUSTOMER",
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
    withBizCertCount: 0,
  });

  // Selected Dossier
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerContacts, setPartnerContacts] = useState<PartnerContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState<boolean>(false);

  // Sorting
  const [sortKey, setSortKey] = useState<string>("id");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

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

  // File Input Refs & Drag States for Partner Modal
  const bankCopyInputRef = useRef<HTMLInputElement>(null);
  const directBizCertInputRef = useRef<HTMLInputElement>(null);
  const [isBankCopyDragging, setIsBankCopyDragging] = useState<boolean>(false);
  const [isDirectBizCertDragging, setIsDirectBizCertDragging] = useState<boolean>(false);

  // OCR Processing States
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [ocrPreviewFileUrl, setOcrPreviewFileUrl] = useState<string>("");
  const [ocrFileName, setOcrFileName] = useState<string>("");

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
  });

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
      const res = await fetch("/api/erp/employees");
      const data = await res.json();
      if (data.success && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
    } catch (e) {}
  };

  // Fetch Partners
  const fetchPartners = async () => {
    setLoading(true);
    try {
      let url = `/api/erp/partners?type=${partnerTypeTab}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (managerFilter !== "ALL") url += `&managerEmployeeId=${managerFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "거래처 목록 조회 실패");

      const list: Partner[] = data.partners || [];
      setPartners(list);
      if (data.kpi) setKpi(data.kpi);

      // Keep selection or select first
      if (selectedPartner) {
        const found = list.find((p) => p.id === selectedPartner.id);
        if (found) {
          setSelectedPartner(found);
        } else if (list.length > 0) {
          setSelectedPartner(list[0]);
        } else {
          setSelectedPartner(null);
        }
      } else if (list.length > 0) {
        setSelectedPartner(list[0]);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Contacts for selected partner
  const fetchContacts = async (partnerId: number) => {
    setContactsLoading(true);
    try {
      const res = await fetch(`/api/erp/partners/contacts?partnerId=${partnerId}`);
      const data = await res.json();
      if (data.success) {
        setPartnerContacts(data.contacts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [partnerTypeTab, statusFilter, managerFilter]);

  useEffect(() => {
    if (selectedPartner?.id) {
      fetchContacts(selectedPartner.id);
    } else {
      setPartnerContacts([]);
    }
  }, [selectedPartner?.id]);

  // Handle Sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const renderSortTh = (label: string, colKey: string, align: "left" | "right" | "center" = "left") => (
    <th
      onClick={() => handleSort(colKey)}
      className={`py-2.5 px-3 whitespace-nowrap cursor-pointer select-none transition ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } hover:bg-[#d9d1c1] dark:hover:bg-slate-700/60`}
    >
      <div className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
        <span>{label}</span>
        {sortKey === colKey ? (
          sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 font-bold" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
        )}
      </div>
    </th>
  );

  const sortedPartners = useMemo(() => {
    return sortErpItems(partners, sortKey, sortDir);
  }, [partners, sortKey, sortDir]);

  // Open Create Modal
  const openCreateModal = () => {
    setPartnerModalMode("CREATE");
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
      faxNo: "",
      managerEmployeeId: currentUser?.id ? String(currentUser.id) : "",
      managerName: currentUser?.name || "",
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
    });
    setShowPartnerModal(true);
  };

  // Open Edit Modal
  const openEditModal = (p: Partner) => {
    setPartnerModalMode("EDIT");
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
      faxNo: p.faxNo || "",
      managerEmployeeId: p.managerEmployeeId ? String(p.managerEmployeeId) : "",
      managerName: p.managerName || "",
      statementClosingDay: p.statementClosingDay || "매월 25일",
      taxInvoiceClosingDay: p.taxInvoiceClosingDay || "익월 10일",
      paymentDueDay: p.paymentDueDay || "익월 15일",
      status: p.status,
      memo: p.memo || "",
      bizCertFileUrl: p.bizCertFileUrl || "",
      bizCertFileName: p.bizCertFileName || "",
      bankName: p.bankName || "",
      bankAccountNo: p.bankAccountNo || "",
      bankAccountHolder: p.bankAccountHolder || "",
      bankCopyFileUrl: p.bankCopyFileUrl || "",
      bankCopyFileName: p.bankCopyFileName || "",
    });
    setShowPartnerModal(true);
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

      showToast(data.message || "거래처가 성공적으로 저장되었습니다.");
      setShowPartnerModal(false);
      fetchPartners();
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

      showToast("거래처가 삭제되었습니다.");
      if (selectedPartner?.id === id) setSelectedPartner(null);
      fetchPartners();
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
      if (selectedPartner?.id) fetchContacts(selectedPartner.id);
      fetchPartners();
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
      if (selectedPartner?.id) fetchContacts(selectedPartner.id);
      fetchPartners();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      "거래처코드",
      "구분",
      "상호명",
      "사업자등록번호",
      "대표자",
      "업태",
      "종목",
      "본사주소",
      "대표전화",
      "대표이메일",
      "본사담당직원",
      "거래명세서마감일",
      "세금계산서마감일",
      "약정납기일(결제일)",
      "거래상태",
      "대표담당자",
      "대표담당자휴대폰",
    ];

    const rows = sortedPartners.map((p) => [
      p.partnerCode,
      p.partnerType === "CUSTOMER" ? "고객" : p.partnerType === "VENDOR" ? "매입거래처" : "고객/매입겸용",
      p.name,
      p.businessNo || "-",
      p.ceoName || "-",
      p.bizType || "-",
      p.bizItem || "-",
      `${p.address || ""} ${p.addressDetail || ""}`.trim() || "-",
      p.mainPhone || "-",
      p.mainEmail || "-",
      p.managerName || "-",
      p.statementClosingDay,
      p.taxInvoiceClosingDay,
      p.paymentDueDay,
      p.status === "ACTIVE" ? "정상" : p.status === "INACTIVE" ? "중지" : "휴면",
      p.primaryContact?.name || "-",
      p.primaryContact?.mobile || "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `거래처대장_${partnerTypeTab}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Load pdf.js from CDN in browser and extract Page 1 JPEG + Text Hint
  const extractPdfImageAndText = async (
    file: File
  ): Promise<{ imageBase64: string; textHint: string }> => {
    if (typeof window === "undefined") {
      return { imageBase64: "", textHint: "" };
    }

    const w = window as any;
    if (!w.pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("PDF 렌더링 엔진 로드에 실패했습니다."));
        document.head.appendChild(script);
      });
    }

    const pdfjsLib = w.pdfjsLib;
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
      cMapPacked: true,
      standardFontDataUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/",
    });

    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);

    // 1. Extract text content preserving line order
    let textHint = "";
    try {
      const textContent = await page.getTextContent();
      const items = (textContent.items || []) as any[];
      let lastY: number | null = null;
      const parts: string[] = [];
      for (const item of items) {
        const y = item.transform ? Math.round(item.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
          parts.push("\n");
        } else if (parts.length > 0) {
          parts.push(" ");
        }
        parts.push(item.str || "");
        if (y !== null) lastY = y;
      }
      textHint = parts.join("");
    } catch (e) {
      console.warn("PDF textContent extraction warning:", e);
    }

    // 2. Render Page 1 onto high-res Canvas -> JPEG base64
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(64, Math.round(viewport.width));
    canvas.height = Math.max(64, Math.round(viewport.height));
    const ctx = canvas.getContext("2d");
    let imageBase64 = "";
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      imageBase64 = canvas.toDataURL("image/jpeg", 0.88);
    }

    return { imageBase64, textHint };
  };

  // Helper: Resize image file onto Canvas -> JPEG base64
  const resizeImageToBase64 = (file: File, maxDim = 1800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("이미지 파일 읽기 실패"));
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onerror = () => resolve(dataUrl);
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          width = Math.max(64, width);
          height = Math.max(64, height);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  // Universal Helper: Read any image or PDF file to Data URL
  const readFileAsDataUrl = async (file: File): Promise<string> => {
    if (file.type.startsWith("image/")) {
      try {
        return await resizeImageToBase64(file, 1800);
      } catch {
        // fallback
      }
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || "");
      reader.onerror = () => reject(new Error("파일 읽기 실패"));
      reader.readAsDataURL(file);
    });
  };

  // Helper: Check if document is PDF
  const isPdfDocument = (url?: string | null, fileName?: string | null) => {
    if (!url && !fileName) return false;
    if (url && (url.startsWith("data:application/pdf") || url.toLowerCase().includes(".pdf"))) return true;
    if (fileName && fileName.toLowerCase().endsWith(".pdf")) return true;
    return false;
  };

  // Direct Bank Copy Upload
  const handleBankCopyFileUpload = async (file: File) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPartnerForm((prev: any) => ({
        ...prev,
        bankCopyFileUrl: dataUrl,
        bankCopyFileName: file.name,
        bankAccountHolder: prev.bankAccountHolder || prev.name || prev.ceoName || "",
      }));
      showToast(`통장사본(${file.name})이 첨부되었습니다.`);
    } catch (err: any) {
      showToast("통장사본 파일 읽기 실패", "error");
    }
  };

  // Direct Business Registration Certificate Upload
  const handleDirectBizCertUpload = async (file: File) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPartnerForm((prev: any) => ({
        ...prev,
        bizCertFileUrl: dataUrl,
        bizCertFileName: file.name,
      }));
      showToast(`사업자등록증(${file.name})이 첨부되었습니다.`);
    } catch (err: any) {
      showToast("사업자등록증 파일 읽기 실패", "error");
    }
  };

  // Business Registration Certificate Drag & Drop / File Processing
  const handleBizCertFileUpload = async (file: File) => {
    if (!file) return;
    setOcrLoading(true);
    setOcrFileName(file.name);
    setOcrResult(null);

    try {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      let imageBase64 = "";
      let textHint = "";

      if (isPdf) {
        try {
          const pdfOut = await extractPdfImageAndText(file);
          imageBase64 = pdfOut.imageBase64;
          textHint = pdfOut.textHint;
        } catch (pdfErr) {
          console.warn("Client PDF render fallback:", pdfErr);
        }
      } else {
        imageBase64 = await resizeImageToBase64(file, 1800);
      }

      if (imageBase64) {
        setOcrPreviewFileUrl(imageBase64);
      } else {
        // Fallback: read raw file data URL
        const rawUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve((r.result as string) || "");
          r.onerror = () => resolve("");
          r.readAsDataURL(file);
        });
        setOcrPreviewFileUrl(rawUrl);
      }

      const res = await fetch("/api/erp/partners/ocr-biz-cert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageBase64 || undefined,
          rawText: textHint || undefined,
          fileName: file.name,
        }),
      });
      const data = await res.json();
      if (data.success && data.parsed) {
        setOcrResult(data.parsed);
        showToast(data.message || "사업자등록증 정보가 자동 분석되었습니다.");
      } else {
        showToast(
          data.error || "자동 분석을 완료할 수 없습니다. 파일을 확인해주세요.",
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
      faxNo: "",
      managerEmployeeId: currentUser?.id ? String(currentUser.id) : "",
      managerName: currentUser?.name || "",
      statementClosingDay: "매월 25일",
      taxInvoiceClosingDay: "익월 10일",
      paymentDueDay: "익월 15일",
      status: "ACTIVE",
      memo: `사업자등록증 기반 등록 (${ocrFileName})`,
      bizCertFileUrl: ocrPreviewFileUrl || "",
      bizCertFileName: ocrFileName || "",
      bankName: "",
      bankAccountNo: "",
      bankAccountHolder: "",
      bankCopyFileUrl: "",
      bankCopyFileName: "",
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
              onClick={() => setPartnerTypeTab("CUSTOMER")}
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
              onClick={() => setPartnerTypeTab("VENDOR")}
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
              onClick={() => setPartnerTypeTab("ALL")}
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

          {/* 사업자등록증 간편 등록 버튼 */}
          <button
            onClick={() => {
              setOcrResult(null);
              setOcrPreviewFileUrl("");
              setOcrFileName("");
              setShowBizCertOcrModal(true);
            }}
            className="px-3 py-1.5 bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>사업자등록증 간편등록</span>
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
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden shadow-xs dark:bg-slate-900 dark:border-slate-800">
          {/* Header Summary */}
          <div className="p-2.5 bg-[#e2dbcd] border-b border-[#b5a894] text-xs font-bold text-[#0f172a] flex items-center justify-between dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
              <span>
                {partnerTypeTab === "CUSTOMER"
                  ? "고객 (매출처) 대장"
                  : partnerTypeTab === "VENDOR"
                  ? "매입거래처 대장"
                  : "전체 거래처 대장"}
              </span>
              <span className="text-[#475569] font-normal dark:text-slate-400">
                (조회 {formatErpNumber(sortedPartners.length)}개사)
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#475569] dark:text-slate-400 font-mono">
              <span>사업자등록증 보관: <strong className="text-[#6d28d9] dark:text-purple-300">{formatErpNumber(kpi.withBizCertCount)}</strong>개사</span>
              <span>정상거래: <strong className="text-[#047857] dark:text-emerald-400">{formatErpNumber(kpi.activeCount)}</strong>개사</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#e2dbcd] text-[#0f172a] uppercase tracking-wider font-semibold border-b-2 border-[#a89a84] sticky top-0 z-10 select-none dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap w-12">선택</th>
                  {renderSortTh("거래처코드", "partnerCode")}
                  {renderSortTh("상호명 (법인명)", "name")}
                  {renderSortTh("구분", "partnerType")}
                  {renderSortTh("사업자등록번호", "businessNo")}
                  {renderSortTh("대표자", "ceoName")}
                  {renderSortTh("본사 담당직원", "managerName")}
                  {renderSortTh("거래명세서 마감", "statementClosingDay")}
                  {renderSortTh("세금계산서 마감", "taxInvoiceClosingDay")}
                  {renderSortTh("약정납기일(결제)", "paymentDueDay")}
                  {renderSortTh("담당자/명함", "contactCount", "center")}
                  {renderSortTh("상태", "status", "center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
                {sortedPartners.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-[#475569] dark:text-slate-500">
                      {loading ? "거래처 데이터를 불러오는 중..." : "등록된 거래처가 없습니다. 상단 [신규 등록] 또는 [사업자등록증 간편등록]을 진행하세요."}
                    </td>
                  </tr>
                ) : (
                  sortedPartners.map((p) => {
                    const isSelected = selectedPartner?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPartner(p)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? "bg-[#dcd4c4] border-l-4 border-[#1d4ed8] dark:bg-blue-950/60 dark:border-blue-500"
                            : "hover:bg-[#f4efe4] dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setSelectedPartner(p)}
                            className="rounded-full text-[#1d4ed8]"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono text-[#475569] dark:text-slate-400 font-bold whitespace-nowrap">
                          {p.partnerCode}
                        </td>
                        <td className="py-2 px-3 font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.bizCertFileUrl && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDocument({
                                    title: "사업자등록증 원본",
                                    partnerName: p.name,
                                    url: p.bizCertFileUrl!,
                                    fileName: p.bizCertFileName || "사업자등록증",
                                  });
                                }}
                                title="사업자등록증 열기"
                                className="px-1.5 py-0.2 rounded text-[10px] bg-[#f5f3ff] hover:bg-[#ede9fe] text-[#6d28d9] border border-[#ddd6fe] font-bold dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 flex items-center gap-1 transition"
                              >
                                <FileCheck className="w-3 h-3" />
                                <span>등록증</span>
                              </button>
                            )}
                            {p.bankCopyFileUrl && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDocument({
                                    title: "통장사본 원본",
                                    partnerName: p.name,
                                    url: p.bankCopyFileUrl!,
                                    fileName: p.bankCopyFileName || `${p.bankName || "거래처"}_통장사본`,
                                  });
                                }}
                                title="통장사본 열기"
                                className="px-1.5 py-0.2 rounded text-[10px] bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0] font-bold dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1 transition"
                              >
                                <Landmark className="w-3 h-3" />
                                <span>통장</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.partnerType === "CUSTOMER"
                                ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                                : p.partnerType === "VENDOR"
                                ? "bg-[#fef3c7] text-[#92400e] border border-[#fde68a] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                : "bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff] dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                            }`}
                          >
                            {p.partnerType === "CUSTOMER" ? "고객" : p.partnerType === "VENDOR" ? "매입처" : "겸용"}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[#0f172a] dark:text-slate-300 whitespace-nowrap">
                          {p.businessNo || "-"}
                        </td>
                        <td className="py-2 px-3 text-[#0f172a] dark:text-slate-200 whitespace-nowrap">
                          {p.ceoName || "-"}
                        </td>
                        <td className="py-2 px-3 font-semibold whitespace-nowrap">
                          <span className="flex items-center gap-1 text-[#1d4ed8] dark:text-blue-300">
                            <UserCheck className="w-3 h-3 text-[#1d4ed8] dark:text-blue-400" />
                            {p.managerName || "미지정"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#334155] dark:text-slate-300 font-medium whitespace-nowrap">
                          {p.statementClosingDay}
                        </td>
                        <td className="py-2 px-3 text-[#334155] dark:text-slate-300 font-medium whitespace-nowrap">
                          {p.taxInvoiceClosingDay}
                        </td>
                        <td className="py-2 px-3 font-mono text-[#b45309] dark:text-amber-300 font-bold whitespace-nowrap">
                          {p.paymentDueDay}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 font-mono text-[11px] text-[#0f172a] dark:text-slate-300 bg-[#e2dbcd] dark:bg-slate-800 px-2 py-0.5 rounded border border-[#b5a894] dark:border-slate-700">
                            <CreditCard className="w-3 h-3 text-[#047857] dark:text-emerald-400" />
                            <span>{formatErpNumber(p.contactCount || 0)}명</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.status === "ACTIVE"
                                ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                                : p.status === "INACTIVE"
                                ? "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"
                                : "bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            }`}
                          >
                            {p.status === "ACTIVE" ? "정상" : p.status === "INACTIVE" ? "중지" : "휴면"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Master-Detail Dossier Studio (4~5 cols) */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden shadow-xs dark:bg-slate-900 dark:border-slate-800">
          {selectedPartner ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Dossier Header */}
              <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] flex items-center justify-between shrink-0 dark:bg-slate-800/80 dark:border-slate-700">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400">
                      {selectedPartner.partnerCode}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        selectedPartner.partnerType === "CUSTOMER"
                          ? "bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]"
                          : selectedPartner.partnerType === "VENDOR"
                          ? "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                          : "bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff]"
                      }`}
                    >
                      {selectedPartner.partnerType === "CUSTOMER" ? "고객사" : selectedPartner.partnerType === "VENDOR" ? "매입거래처" : "겸용"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0f172a] truncate dark:text-slate-100">
                    {selectedPartner.name}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(selectedPartner)}
                    className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    title="거래처 수정"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeletePartner(selectedPartner.id, selectedPartner.name)}
                      className="p-1.5 bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] rounded border border-[#f87171] transition dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                      title="거래처 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dossier Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* 1. 본사 관리 핵심 속성 */}
                <div className="bg-[#f4efe4] p-3 rounded border border-[#b5a894] space-y-2 dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>본사 관리 및 정산 마감 조건</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-[#ebe5d8] rounded border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800">
                      <span className="text-[10px] text-[#475569] dark:text-slate-500 block mb-0.5">본사의 담당직원</span>
                      <strong className="text-[#0f172a] dark:text-slate-200 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-[#1d4ed8] dark:text-blue-400" />
                        {selectedPartner.managerName || "미배정"}
                      </strong>
                    </div>

                    <div className="p-2 bg-[#ebe5d8] rounded border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800">
                      <span className="text-[10px] text-[#475569] dark:text-slate-500 block mb-0.5">거래명세서 마감일</span>
                      <strong className="text-[#0f172a] dark:text-slate-200 font-mono">
                        {selectedPartner.statementClosingDay}
                      </strong>
                    </div>

                    <div className="p-2 bg-[#ebe5d8] rounded border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800">
                      <span className="text-[10px] text-[#475569] dark:text-slate-500 block mb-0.5">세금계산서 마감일</span>
                      <strong className="text-[#0f172a] dark:text-slate-200 font-mono">
                        {selectedPartner.taxInvoiceClosingDay}
                      </strong>
                    </div>

                    <div className="p-2 bg-[#ebe5d8] rounded border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800">
                      <span className="text-[10px] text-[#475569] dark:text-slate-500 block mb-0.5">약정납기일 (결제일)</span>
                      <strong className="text-[#b45309] dark:text-amber-300 font-mono font-bold">
                        {selectedPartner.paymentDueDay}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 2. 본사 기본 제원 및 주소 */}
                <div className="bg-[#f4efe4] p-3 rounded border border-[#b5a894] space-y-1.5 text-xs dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-[#475569] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>본사 사업자 기본 제원</span>
                  </span>

                  <div className="flex justify-between py-1 border-b border-[#c4b6a0] dark:border-slate-800">
                    <span className="text-[#475569] dark:text-slate-500">사업자등록번호</span>
                    <span className="font-mono font-bold text-[#0f172a] dark:text-slate-200">{selectedPartner.businessNo || "-"}</span>
                  </div>

                  {selectedPartner.corporateNo && (
                    <div className="flex justify-between py-1 border-b border-[#c4b6a0] dark:border-slate-800">
                      <span className="text-[#475569] dark:text-slate-500">법인등록번호</span>
                      <span className="font-mono text-[#0f172a] dark:text-slate-200">{selectedPartner.corporateNo}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 border-b border-[#c4b6a0] dark:border-slate-800">
                    <span className="text-[#475569] dark:text-slate-500">대표자 성명</span>
                    <span className="font-semibold text-[#0f172a] dark:text-slate-200">{selectedPartner.ceoName || "-"}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#c4b6a0] dark:border-slate-800">
                    <span className="text-[#475569] dark:text-slate-500">업태 / 종목</span>
                    <span className="text-[#0f172a] dark:text-slate-200 text-right truncate max-w-xs">
                      {selectedPartner.bizType || "-"} / {selectedPartner.bizItem || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#c4b6a0] dark:border-slate-800">
                    <span className="text-[#475569] dark:text-slate-500">본사 사업장 소재지</span>
                    <span className="text-[#0f172a] dark:text-slate-200 text-right truncate max-w-xs" title={`${selectedPartner.address || ""} ${selectedPartner.addressDetail || ""}`.trim()}>
                      {`${selectedPartner.address || ""} ${selectedPartner.addressDetail || ""}`.trim() || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#c4b6a0] dark:border-slate-800">
                    <span className="text-[#475569] dark:text-slate-500">계산서 수신 이메일</span>
                    <span className="font-mono text-[#1d4ed8] dark:text-blue-300 text-right truncate max-w-xs">{selectedPartner.mainEmail || "-"}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-[#475569] dark:text-slate-500">본사 대표 전화</span>
                    <span className="font-mono text-[#0f172a] dark:text-slate-200">{selectedPartner.mainPhone || "-"}</span>
                  </div>
                </div>

                {/* 3. 사업자등록증 원본 보관함 */}
                <div className="bg-[#f4efe4] p-3 rounded border border-[#b5a894] space-y-2 text-xs dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#6d28d9] dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>사업자등록증 원본 서류</span>
                    </span>

                    {selectedPartner.bizCertFileUrl ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#f5f3ff] text-[#6d28d9] border border-[#ddd6fe] font-bold">
                        보관 완료
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#e2dbcd] text-[#475569]">
                        미등록
                      </span>
                    )}
                  </div>

                  {selectedPartner.bizCertFileUrl ? (
                    <div className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-[#6d28d9] dark:text-purple-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block truncate">
                            {selectedPartner.bizCertFileName || "사업자등록증"}
                          </span>
                          <span className="text-[10px] text-[#475569] dark:text-slate-500 font-mono">
                            국세청 사업자등록증 원본
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedPartner.bizCertFileUrl) {
                              setActiveDocument({
                                title: "사업자등록증 원본",
                                partnerName: selectedPartner.name,
                                url: selectedPartner.bizCertFileUrl,
                                fileName: selectedPartner.bizCertFileName || "사업자등록증",
                              });
                            }
                          }}
                          className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        >
                          <Eye className="w-3 h-3" />
                          <span>미리보기</span>
                        </button>
                        <a
                          href={selectedPartner.bizCertFileUrl}
                          download={selectedPartner.bizCertFileName || "사업자등록증"}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          title="다운로드"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#ebe5d8] rounded border border-dashed border-[#b5a894] text-center dark:bg-slate-900 dark:border-slate-800">
                      <p className="text-[11px] text-[#475569] dark:text-slate-500 mb-2">
                        등록된 사업자등록증 파일이 없습니다.
                      </p>
                      <button
                        type="button"
                        onClick={() => openEditModal(selectedPartner)}
                        className="px-2.5 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] inline-flex items-center gap-1 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        <Upload className="w-3 h-3" />
                        <span>사업자등록증 첨부하기</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. 대금 지급 계좌 및 통장사본 보관함 */}
                <div className="bg-[#f4efe4] p-3 rounded border border-[#b5a894] space-y-2 text-xs dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#047857] dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" />
                      <span>대금 지급 계좌 및 통장사본</span>
                    </span>

                    {selectedPartner.bankCopyFileUrl ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] font-bold">
                        통장사본 보관됨
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#e2dbcd] text-[#475569]">
                        통장사본 미등록
                      </span>
                    )}
                  </div>

                  {/* 계좌 제원 요약 */}
                  <div className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] space-y-1.5 dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex justify-between items-center py-0.5 border-b border-[#c4b6a0] dark:border-slate-800">
                      <span className="text-[#475569] dark:text-slate-400">지급 은행</span>
                      <strong className="text-[#0f172a] dark:text-slate-200">
                        {selectedPartner.bankName || "-"}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center py-0.5 border-b border-[#c4b6a0] dark:border-slate-800">
                      <span className="text-[#475569] dark:text-slate-400">계좌번호</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <strong className="text-[#1d4ed8] dark:text-blue-400 font-bold">
                          {selectedPartner.bankAccountNo || "-"}
                        </strong>
                        {selectedPartner.bankAccountNo && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedPartner.bankAccountNo!);
                              showToast("계좌번호가 클립보드에 복사되었습니다.");
                            }}
                            className="p-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[10px] flex items-center gap-0.5 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                            title="계좌번호 복사"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            <span>복사</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[#475569] dark:text-slate-400">예금주</span>
                      <strong className="text-[#0f172a] dark:text-slate-200">
                        {selectedPartner.bankAccountHolder || "-"}
                      </strong>
                    </div>
                  </div>

                  {/* 통장사본 첨부 파일 */}
                  {selectedPartner.bankCopyFileUrl ? (
                    <div className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
                      <div className="flex items-center gap-2 truncate">
                        <Landmark className="w-4 h-4 text-[#047857] dark:text-emerald-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-semibold text-[#0f172a] dark:text-slate-200 block truncate">
                            {selectedPartner.bankCopyFileName || `${selectedPartner.bankName || "은행"}_통장사본`}
                          </span>
                          <span className="text-[10px] text-[#475569] dark:text-slate-500 font-mono">
                            대금 지급용 통장사본 서류
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDocument({
                              title: "통장사본 원본",
                              partnerName: selectedPartner.name,
                              url: selectedPartner.bankCopyFileUrl!,
                              fileName: selectedPartner.bankCopyFileName || `${selectedPartner.bankName || "은행"}_통장사본`,
                            });
                          }}
                          className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        >
                          <Eye className="w-3 h-3" />
                          <span>미리보기</span>
                        </button>
                        <a
                          href={selectedPartner.bankCopyFileUrl}
                          download={selectedPartner.bankCopyFileName || "통장사본"}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          title="다운로드"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-[#ebe5d8] rounded border border-dashed border-[#b5a894] text-center dark:bg-slate-900 dark:border-slate-800">
                      <p className="text-[11px] text-[#475569] dark:text-slate-500 mb-1.5">
                        등록된 통장사본 파일이 없습니다.
                      </p>
                      <button
                        type="button"
                        onClick={() => openEditModal(selectedPartner)}
                        className="px-2.5 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] inline-flex items-center gap-1 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        <Upload className="w-3 h-3" />
                        <span>통장사본 등록하기</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. 거래처 담당자 및 실물 명함 보관함 */}
                <div className="bg-[#f4efe4] p-3 rounded border border-[#b5a894] space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#047857] dark:text-emerald-400" />
                      <span className="text-[11px] font-bold text-[#047857] dark:text-emerald-400 uppercase tracking-wider">
                        거래처 담당자 및 명함 ({partnerContacts.length}명)
                      </span>
                    </div>

                    <button
                      onClick={openCreateContactModal}
                      className="px-2 py-1 bg-[#047857] hover:bg-[#065f46] text-white rounded text-[11px] font-bold flex items-center gap-1 shadow transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>명함·담당자 추가</span>
                    </button>
                  </div>

                  {contactsLoading ? (
                    <div className="p-4 text-center text-[#475569] text-xs">
                      담당자 정보를 불러오는 중...
                    </div>
                  ) : partnerContacts.length === 0 ? (
                    <div className="p-4 bg-[#ebe5d8] rounded border border-[#b5a894] text-center text-[#475569] text-xs dark:bg-slate-900 dark:border-slate-800">
                      등록된 거래처 담당자가 없습니다. 상단 버튼으로 명함을 등록하세요.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {partnerContacts.map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] flex flex-col gap-1.5 dark:bg-slate-900 dark:border-slate-800"
                        >
                          {/* Contact Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#0f172a] dark:text-slate-100">
                                {c.name}
                              </span>
                              {(c.position || c.department) && (
                                <span className="text-[11px] text-[#475569] dark:text-slate-400">
                                  {c.department ? `${c.department} ` : ""}{c.position || ""}
                                </span>
                              )}
                              {c.isPrimary && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]">
                                  대표담당
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditContactModal(c)}
                                className="p-1 hover:bg-[#dcd4c4] text-[#475569] rounded dark:hover:bg-slate-800 dark:text-slate-400"
                                title="수정"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteContact(c.id, c.name)}
                                className="p-1 hover:bg-[#fee2e2] text-[#b91c1c] rounded"
                                title="삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Contact Details */}
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-[#334155] dark:text-slate-300 font-mono">
                            {c.mobile && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Phone className="w-3 h-3 text-[#047857] shrink-0" />
                                <span className="truncate">{c.mobile}</span>
                              </div>
                            )}
                            {c.email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="w-3 h-3 text-[#1d4ed8] shrink-0" />
                                <span className="truncate">{c.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Business Card Preview Box */}
                          {c.businessCardFrontUrl && (
                            <div className="mt-1 pt-1.5 border-t border-[#c4b6a0] dark:border-slate-800 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-[#6d28d9]" />
                                <span className="text-[10px] text-[#475569] font-semibold">
                                  실물 명함 사진 첨부됨
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (c.businessCardFrontUrl) {
                                    setActiveDocument({
                                      title: `${c.name} ${c.position || "담당자"} 명함`,
                                      partnerName: selectedPartner.name,
                                      url: c.businessCardFrontUrl,
                                      fileName: `${selectedPartner.name}_${c.name}_명함.png`,
                                    });
                                  }
                                }}
                                className="px-2 py-0.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#6d28d9] rounded border border-[#b5a894] text-[10px] flex items-center gap-1 font-semibold dark:bg-slate-800 dark:border-slate-700"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                <span>명함 확대보기</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. 비고 */}
                {selectedPartner.memo && (
                  <div className="bg-[#f4efe4] p-3 rounded border border-[#b5a894] text-xs dark:bg-slate-900 dark:border-slate-800">
                    <span className="text-[10px] text-[#475569] block mb-1">비고 및 특이사항</span>
                    <p className="text-[#334155] dark:text-slate-300 whitespace-pre-wrap">{selectedPartner.memo}</p>
                  </div>
                )}
              </div>
            </div>
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] text-[#0f172a] rounded-lg p-5 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
            {/* Modal Header */}
            <div className="pb-3 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1d4ed8]" />
                <span>
                  {partnerModalMode === "CREATE"
                    ? partnerForm.partnerType === "VENDOR" ? "신규 매입거래처 등록" : "신규 거래처 등록"
                    : `거래처 정보 수정 (${partnerForm.name})`}
                </span>
              </h2>
              <button
                onClick={() => setShowPartnerModal(false)}
                className="text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSavePartner} className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs">
              {/* 구분 & 코드 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">거래처 구분 *</label>
                  <select
                    value={partnerForm.partnerType}
                    onChange={(e) => setPartnerForm({ ...partnerForm, partnerType: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  >
                    <option value="CUSTOMER">고객 (매출처)</option>
                    <option value="VENDOR">매입거래처 (공급처)</option>
                    <option value="BOTH">고객 및 매입거래처 겸용</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">거래처 코드 (미입력 시 자동 채번)</label>
                  <input
                    type="text"
                    placeholder="예: CUST-2026-001"
                    value={partnerForm.partnerCode}
                    onChange={(e) => setPartnerForm({ ...partnerForm, partnerCode: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* 상호 & 사업자번호 & 대표자 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">상호명 (법인명) *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: (주)한국알피에이"
                    value={partnerForm.name}
                    onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-bold focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">사업자등록번호</label>
                  <input
                    type="text"
                    placeholder="000-00-00000"
                    value={partnerForm.businessNo}
                    onChange={(e) => setPartnerForm({ ...partnerForm, businessNo: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">대표자 성명</label>
                  <input
                    type="text"
                    placeholder="홍길동"
                    value={partnerForm.ceoName}
                    onChange={(e) => setPartnerForm({ ...partnerForm, ceoName: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* 업태 & 종목 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">업태</label>
                  <input
                    type="text"
                    placeholder="예: 정보통신업, 건설업, 도소매업"
                    value={partnerForm.bizType}
                    onChange={(e) => setPartnerForm({ ...partnerForm, bizType: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">종목</label>
                  <input
                    type="text"
                    placeholder="예: 소프트웨어 개발, 컴퓨터시설관리"
                    value={partnerForm.bizItem}
                    onChange={(e) => setPartnerForm({ ...partnerForm, bizItem: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* 본사 주소 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">본사 사업장 소재지 (기본주소)</label>
                  <input
                    type="text"
                    placeholder="예: 서울특별시 송파구 동남로11길 26-11"
                    value={partnerForm.address}
                    onChange={(e) => setPartnerForm({ ...partnerForm, address: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">상세주소</label>
                  <input
                    type="text"
                    placeholder="예: 3층 301호"
                    value={partnerForm.addressDetail}
                    onChange={(e) => setPartnerForm({ ...partnerForm, addressDetail: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* 대표 연락처 & 세금계산서 수신 이메일 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">본사 대표 전화번호</label>
                  <input
                    type="text"
                    placeholder="02-0000-0000"
                    value={partnerForm.mainPhone}
                    onChange={(e) => setPartnerForm({ ...partnerForm, mainPhone: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] dark:text-slate-300 font-semibold">세금계산서 수신 전용 이메일</label>
                  <input
                    type="email"
                    placeholder="tax@company.co.kr"
                    value={partnerForm.mainEmail}
                    onChange={(e) => setPartnerForm({ ...partnerForm, mainEmail: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* 본사 관리 및 정산 마감 조건 설정 */}
              <div className="p-3 bg-[#e2dbcd] border border-[#b5a894] rounded-lg space-y-3 dark:bg-slate-900 dark:border-slate-700">
                <span className="text-xs font-bold text-[#1d4ed8] dark:text-blue-400 block pb-1 border-b border-[#b5a894] dark:border-slate-700">
                  🏛️ 본사 관리 및 정산 약정 설정 (필수 항목)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">본사의 담당직원 *</label>
                    <select
                      value={partnerForm.managerEmployeeId}
                      onChange={(e) => {
                        const empId = e.target.value;
                        const emp = employees.find((x) => String(x.id) === empId);
                        setPartnerForm({
                          ...partnerForm,
                          managerEmployeeId: empId,
                          managerName: emp ? emp.name : "",
                        });
                      }}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] font-semibold dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    >
                      <option value="">직접 입력 또는 선택</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.department} {emp.position || ""})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">거래 상태</label>
                    <select
                      value={partnerForm.status}
                      onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    >
                      <option value="ACTIVE">정상 거래 (ACTIVE)</option>
                      <option value="INACTIVE">거래 중지 (INACTIVE)</option>
                      <option value="DORMANT">휴면 (DORMANT)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">거래명세서 마감일 *</label>
                    <select
                      value={partnerForm.statementClosingDay}
                      onChange={(e) => setPartnerForm({ ...partnerForm, statementClosingDay: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    >
                      <option value="매월 25일">매월 25일 (기본)</option>
                      <option value="당월말일">당월 말일</option>
                      <option value="매월 20일">매월 20일</option>
                      <option value="매월 15일">매월 15일</option>
                      <option value="수시">수시 (건별)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">세금계산서 마감일 *</label>
                    <select
                      value={partnerForm.taxInvoiceClosingDay}
                      onChange={(e) => setPartnerForm({ ...partnerForm, taxInvoiceClosingDay: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    >
                      <option value="익월 10일">익월 10일 (국세청 기본)</option>
                      <option value="당월말일">당월 말일</option>
                      <option value="매월 25일">매월 25일</option>
                      <option value="수시">수시 (건별)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">약정납기일 (결제일) *</label>
                    <select
                      value={partnerForm.paymentDueDay}
                      onChange={(e) => setPartnerForm({ ...partnerForm, paymentDueDay: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#b45309] font-bold px-2 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-amber-300"
                    >
                      <option value="익월 15일">익월 15일</option>
                      <option value="익월말일">익월 말일</option>
                      <option value="청구 후 30일">청구 후 30일</option>
                      <option value="당월 25일">당월 25일</option>
                      <option value="당월말일">당월 말일</option>
                      <option value="익익월 10일">익익월 10일</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 대금 지급 계좌 및 통장사본 (매입거래처 / 공급처) */}
              <div className="p-3 bg-[#e2dbcd] border border-[#b5a894] rounded-lg space-y-3 dark:bg-slate-900 dark:border-slate-700">
                <div className="flex items-center justify-between pb-1 border-b border-[#b5a894] dark:border-slate-700">
                  <span className="text-xs font-bold text-[#047857] dark:text-emerald-400 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>대금 지급 계좌 및 통장사본 관리 (매입거래처 필수)</span>
                  </span>
                  {partnerForm.partnerType === "CUSTOMER" && (
                    <span className="text-[10px] text-[#475569] dark:text-slate-400">
                      (고객사는 환불/정산용 계좌 필요 시 입력)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">지급 은행</label>
                    <input
                      type="text"
                      list="korean-bank-list"
                      placeholder="은행명 선택 또는 직접입력"
                      value={partnerForm.bankName || ""}
                      onChange={(e) => setPartnerForm({ ...partnerForm, bankName: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    />
                    <datalist id="korean-bank-list">
                      {KOREAN_BANKS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">계좌번호</label>
                    <input
                      type="text"
                      placeholder="000-000000-00000"
                      value={partnerForm.bankAccountNo || ""}
                      onChange={(e) => setPartnerForm({ ...partnerForm, bankAccountNo: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[#0f172a] dark:text-slate-200 font-semibold">예금주</label>
                    <input
                      type="text"
                      placeholder={partnerForm.name || "상호명 또는 대표자"}
                      value={partnerForm.bankAccountHolder || ""}
                      onChange={(e) => setPartnerForm({ ...partnerForm, bankAccountHolder: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* 통장사본 드롭존 / 첨부 파일 */}
                <div className="pt-1">
                  <label className="text-[#0f172a] dark:text-slate-200 font-semibold block mb-1">
                    통장사본 원본 파일 (PDF 또는 이미지)
                  </label>
                  <input
                    type="file"
                    ref={bankCopyInputRef}
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleBankCopyFileUpload(e.target.files[0]);
                      }
                    }}
                  />

                  {partnerForm.bankCopyFileUrl ? (
                    <div className="p-2.5 bg-[#f4efe4] rounded border border-[#b5a894] flex items-center justify-between dark:bg-slate-950 dark:border-slate-700">
                      <div className="flex items-center gap-2 truncate">
                        <Landmark className="w-4 h-4 text-[#047857] shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 block truncate">
                            {partnerForm.bankCopyFileName || "통장사본"}
                          </span>
                          <span className="text-[10px] text-[#475569] dark:text-slate-500 font-mono">
                            {isPdfDocument(partnerForm.bankCopyFileUrl, partnerForm.bankCopyFileName) ? "PDF 문서" : "이미지 서류"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDocument({
                              title: "통장사본 원본",
                              partnerName: partnerForm.name || "거래처",
                              url: partnerForm.bankCopyFileUrl,
                              fileName: partnerForm.bankCopyFileName || "통장사본",
                            });
                          }}
                          className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        >
                          <Eye className="w-3 h-3" />
                          <span>열어보기</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => bankCopyInputRef.current?.click()}
                          className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        >
                          <Upload className="w-3 h-3" />
                          <span>파일 변경</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPartnerForm({ ...partnerForm, bankCopyFileUrl: "", bankCopyFileName: "" })}
                          className="p-1 bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] rounded border border-[#f87171] transition"
                          title="삭제"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => bankCopyInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsBankCopyDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsBankCopyDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsBankCopyDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleBankCopyFileUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`p-3 border-2 border-dashed rounded text-center cursor-pointer transition ${
                        isBankCopyDragging
                          ? "border-[#047857] bg-[#ecfdf5] dark:bg-emerald-950/40"
                          : "border-[#b5a894] bg-[#f4efe4] hover:bg-[#ebe5d8] dark:border-slate-700 dark:bg-slate-950"
                      }`}
                    >
                      <Landmark className="w-5 h-5 mx-auto mb-1 text-[#047857] dark:text-emerald-400" />
                      <p className="text-xs font-semibold text-[#0f172a] dark:text-slate-200">
                        통장사본 파일을 드래그하여 놓거나 클릭하여 선택
                      </p>
                      <p className="text-[10px] text-[#475569] dark:text-slate-500 font-mono mt-0.5">
                        PDF 문서, JPG, PNG 파일 지원
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 사업자등록증 원본 직접 첨부/수정 */}
              <div className="p-3 bg-[#e2dbcd] border border-[#b5a894] rounded-lg space-y-2 dark:bg-slate-900 dark:border-slate-700">
                <span className="text-xs font-bold text-[#6d28d9] dark:text-purple-400 flex items-center gap-1.5 pb-1 border-b border-[#b5a894] dark:border-slate-700">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>사업자등록증 원본 서류 관리</span>
                </span>

                <input
                  type="file"
                  ref={directBizCertInputRef}
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleDirectBizCertUpload(e.target.files[0]);
                    }
                  }}
                />

                {partnerForm.bizCertFileUrl ? (
                  <div className="p-2.5 bg-[#f4efe4] rounded border border-[#b5a894] flex items-center justify-between dark:bg-slate-950 dark:border-slate-700">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-[#6d28d9] shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200 block truncate">
                          {partnerForm.bizCertFileName || "사업자등록증"}
                        </span>
                        <span className="text-[10px] text-[#475569] dark:text-slate-500 font-mono">
                          {isPdfDocument(partnerForm.bizCertFileUrl, partnerForm.bizCertFileName) ? "PDF 문서" : "이미지 서류"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDocument({
                            title: "사업자등록증 원본",
                            partnerName: partnerForm.name || "거래처",
                            url: partnerForm.bizCertFileUrl,
                            fileName: partnerForm.bizCertFileName || "사업자등록증",
                          });
                        }}
                        className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        <Eye className="w-3 h-3" />
                        <span>열어보기</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => directBizCertInputRef.current?.click()}
                        className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        <Upload className="w-3 h-3" />
                        <span>파일 변경</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPartnerForm({ ...partnerForm, bizCertFileUrl: "", bizCertFileName: "" })}
                        className="p-1 bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] rounded border border-[#f87171] transition"
                        title="삭제"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => directBizCertInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDirectBizCertDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDirectBizCertDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDirectBizCertDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleDirectBizCertUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`p-3 border-2 border-dashed rounded text-center cursor-pointer transition ${
                      isDirectBizCertDragging
                        ? "border-[#6d28d9] bg-[#f5f3ff] dark:bg-purple-950/40"
                        : "border-[#b5a894] bg-[#f4efe4] hover:bg-[#ebe5d8] dark:border-slate-700 dark:bg-slate-950"
                    }`}
                  >
                    <FileUp className="w-5 h-5 mx-auto mb-1 text-[#6d28d9] dark:text-purple-400" />
                    <p className="text-xs font-semibold text-[#0f172a] dark:text-slate-200">
                      사업자등록증 파일을 드래그하여 놓거나 클릭하여 직접 첨부
                    </p>
                    <p className="text-[10px] text-[#475569] dark:text-slate-500 font-mono mt-0.5">
                      PDF 문서, JPG, PNG 파일 지원
                    </p>
                  </div>
                )}
              </div>

              {/* 비고 */}
              <div className="flex flex-col gap-1">
                <label className="text-[#334155] dark:text-slate-300 font-semibold">특이사항 및 메모</label>
                <textarea
                  rows={2}
                  placeholder="거래 특이사항, 취급 품목 등"
                  value={partnerForm.memo}
                  onChange={(e) => setPartnerForm({ ...partnerForm, memo: e.target.value })}
                  className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPartnerModal(false)}
                  className="px-3.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold rounded shadow transition"
                >
                  {partnerModalMode === "CREATE" ? "거래처 등록 완료" : "수정사항 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Modal: 사업자등록증 OCR 간편등록 모달 (Full Drag-and-Drop & Paper Tone) */}
      {/* ========================================================================= */}
      {showBizCertOcrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] text-[#0f172a] rounded-lg p-5 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="pb-3 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileUp className="w-4 h-4 text-[#6d28d9] dark:text-purple-400" />
                <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100">
                  사업자등록증 자동 인식 및 간편 거래처 등록
                </h2>
              </div>
              <button
                onClick={() => setShowBizCertOcrModal(false)}
                className="text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs">
              {/* Spacious Full Drag & Drop Zone (샘플데이터 주입 완전 제거) */}
              <div
                onDragOver={handleCertDragOver}
                onDragEnter={handleCertDragOver}
                onDragLeave={handleCertDragLeave}
                onDrop={handleCertDrop}
                onClick={() => certFileInputRef.current?.click()}
                className={`p-6 rounded-lg border-2 border-dashed transition cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
                  isCertDragging
                    ? "border-[#1d4ed8] bg-[#dbeafe] scale-[1.01]"
                    : "border-[#b5a894] bg-[#f4efe4] hover:bg-[#ede6d6] hover:border-[#1d4ed8]"
                } dark:bg-slate-900 dark:border-slate-700`}
              >
                <input
                  ref={certFileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBizCertFileUpload(file);
                  }}
                />

                <div className="pointer-events-none flex flex-col items-center justify-center gap-3 w-full">
                  <div className={`p-3 rounded-full ${isCertDragging ? "bg-[#1d4ed8] text-white" : "bg-[#e2dbcd] text-[#6d28d9] dark:bg-slate-800 dark:text-purple-400"}`}>
                    <FileUp className="w-8 h-8" />
                  </div>

                  <div>
                    <span className="font-bold text-sm text-[#0f172a] dark:text-slate-100 block mb-1">
                      {isCertDragging
                        ? "여기에 사업자등록증 파일을 내려놓으세요!"
                        : "사업자등록증 파일을 여기로 드래그 앤 드롭하세요"}
                    </span>
                    <p className="text-xs text-[#475569] dark:text-slate-400">
                      PDF, PNG, JPG 파일을 마우스로 끌어다 놓거나, 클릭하여 파일을 선택할 수 있습니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[#1d4ed8] text-white rounded font-bold text-xs shadow-xs hover:bg-[#1e40af]">
                      파일 선택
                    </span>
                    {ocrFileName && (
                      <span className="text-xs font-mono text-[#6d28d9] font-bold">
                        선택됨: {ocrFileName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* OCR Loading Indicator */}
              {ocrLoading && (
                <div className="p-6 bg-[#f4efe4] rounded border border-[#b5a894] text-center text-[#6d28d9] flex flex-col items-center justify-center gap-2 dark:bg-slate-950 dark:border-slate-800">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="font-bold">사업자등록증 문서를 정밀 분석하고 있습니다...</span>
                </div>
              )}

              {/* OCR Parsing Result Preview (Editable) */}
              {ocrResult && !ocrLoading && (
                <div className="p-4 bg-[#f4efe4] rounded-lg border border-[#b5a894] space-y-3 dark:bg-slate-950 dark:border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-[#b5a894] dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#047857]" />
                      <strong className="text-[#0f172a] text-sm dark:text-slate-200">
                        {ocrResult.name || "상호명 확인 필요"}
                      </strong>
                      <span className="text-xs font-mono text-[#6d28d9] font-bold">
                        [{ocrResult.businessNo || "사업자번호 확인 필요"}]
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {ocrPreviewFileUrl && ocrPreviewFileUrl.startsWith("data:image/") && (
                        <button
                          type="button"
                          onClick={() => setZoomImageUrl(ocrPreviewFileUrl)}
                          className="text-[11px] font-bold text-[#1d4ed8] hover:underline"
                        >
                          원본 미리보기
                        </button>
                      )}
                      <span className="text-[11px] font-bold text-[#047857] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0]">
                        분석 완료
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">상호명 (법인명)</label>
                      <input
                        type="text"
                        value={ocrResult.name || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, name: e.target.value })}
                        placeholder="상호명 입력"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-bold focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">사업자등록번호</label>
                      <input
                        type="text"
                        value={ocrResult.businessNo || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, businessNo: e.target.value })}
                        placeholder="000-00-00000"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono font-bold focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">대표자 성명</label>
                      <input
                        type="text"
                        value={ocrResult.ceoName || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, ceoName: e.target.value })}
                        placeholder="대표자 성명"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-semibold focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">개업연월일</label>
                      <input
                        type="text"
                        value={ocrResult.openDate || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, openDate: e.target.value })}
                        placeholder="YYYY-MM-DD"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">업태</label>
                      <input
                        type="text"
                        value={ocrResult.bizType || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, bizType: e.target.value })}
                        placeholder="업태"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">종목</label>
                      <input
                        type="text"
                        value={ocrResult.bizItem || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, bizItem: e.target.value })}
                        placeholder="종목"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">본사 사업장 소재지</label>
                      <input
                        type="text"
                        value={ocrResult.address || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, address: e.target.value })}
                        placeholder="사업장 소재지"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">세금계산서 전용 이메일</label>
                      <input
                        type="text"
                        value={ocrResult.email || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, email: e.target.value })}
                        placeholder="tax@company.co.kr"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#1d4ed8] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-blue-300"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[#475569] text-[10px] font-semibold">법인등록번호 / 전화번호</label>
                      <input
                        type="text"
                        value={ocrResult.corporateNo || ocrResult.mainPhone || ""}
                        onChange={(e) => setOcrResult({ ...ocrResult, corporateNo: e.target.value })}
                        placeholder="-"
                        className="bg-[#ebe5d8] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowBizCertOcrModal(false)}
                className="px-3.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-semibold dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={!ocrResult}
                onClick={handleApplyOcrToForm}
                className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white font-bold rounded shadow text-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>이 정보로 거래처 등록 양식 채우기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Modal: 거래처 담당자 및 실물 명함 등록 모달 (Warm Paper Tone) */}
      {/* ========================================================================= */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] text-[#0f172a] rounded-lg p-5 w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="pb-3 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#047857]" />
                <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100">
                  {contactModalMode === "CREATE"
                    ? `[${selectedPartner?.name}] 담당자 및 명함 등록`
                    : `담당자 정보 수정 (${contactForm.name})`}
                </h2>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveContact} className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs">
              {/* Business Card Photo Upload */}
              <div className="p-3 bg-[#f4efe4] border border-[#b5a894] rounded-lg space-y-2 dark:bg-slate-900 dark:border-slate-800">
                <span className="text-xs font-bold text-[#047857] block flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>실물 명함 사진 첨부 및 자동 문자 인식(OCR)</span>
                </span>

                <div className="grid grid-cols-2 gap-3">
                  {/* Front Card */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[#334155] font-semibold">명함 앞면 사진</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCardImageUpload(file, "front");
                      }}
                      className="text-xs text-[#0f172a] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#dcd4c4] file:text-[#0f172a]"
                    />
                    {contactForm.businessCardFrontUrl && (
                      <div className="mt-1 relative rounded border border-[#b5a894] overflow-hidden h-20 bg-[#ebe5d8] flex items-center justify-center">
                        <img
                          src={contactForm.businessCardFrontUrl}
                          alt="명함 앞면"
                          className="h-full object-contain cursor-pointer"
                          onClick={() => setZoomImageUrl(contactForm.businessCardFrontUrl)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Back Card */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[#334155] font-semibold">명함 뒷면 사진 (선택)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCardImageUpload(file, "back");
                      }}
                      className="text-xs text-[#0f172a] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#dcd4c4] file:text-[#0f172a]"
                    />
                    {contactForm.businessCardBackUrl && (
                      <div className="mt-1 relative rounded border border-[#b5a894] overflow-hidden h-20 bg-[#ebe5d8] flex items-center justify-center">
                        <img
                          src={contactForm.businessCardBackUrl}
                          alt="명함 뒷면"
                          className="h-full object-contain cursor-pointer"
                          onClick={() => setZoomImageUrl(contactForm.businessCardBackUrl)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] font-semibold">담당자 성명 *</label>
                  <input
                    type="text"
                    required
                    placeholder="홍길동"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-bold focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] font-semibold">소속 부서 / 직책</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="구매팀"
                      value={contactForm.department}
                      onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="팀장 / 과장"
                      value={contactForm.position}
                      onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile & Tel & Email */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] font-semibold">휴대전화 번호</label>
                  <input
                    type="text"
                    placeholder="010-0000-0000"
                    value={contactForm.mobile}
                    onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] font-semibold">직통 유선전화</label>
                  <input
                    type="text"
                    placeholder="02-0000-0000"
                    value={contactForm.telephone}
                    onChange={(e) => setContactForm({ ...contactForm, telephone: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] font-semibold">담당자 이메일</label>
                  <input
                    type="email"
                    placeholder="user@partner.co.kr"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Primary Contact Toggle */}
              <div className="p-2.5 bg-[#f4efe4] rounded border border-[#b5a894] flex items-center justify-between dark:bg-slate-950 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#1d4ed8]" />
                  <div>
                    <span className="font-bold text-[#0f172a] dark:text-slate-200 block text-xs">대표 담당자 지정</span>
                    <span className="text-[10px] text-[#475569] block">
                      대장 및 거래명세서 / 세금계산서 수신자로 우선 매핑됩니다.
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactForm.isPrimary}
                    onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#dcd4c4] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#b5a894] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1d4ed8]"></div>
                </label>
              </div>

              {/* Memo */}
              <div className="flex flex-col gap-1">
                <label className="text-[#334155] font-semibold">담당 업무 메모</label>
                <textarea
                  rows={2}
                  placeholder="예: RPA 솔루션 계약 및 기술 창구"
                  value={contactForm.memo}
                  onChange={(e) => setContactForm({ ...contactForm, memo: e.target.value })}
                  className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-3.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white font-bold rounded shadow"
                >
                  {contactModalMode === "CREATE" ? "명함·담당자 저장" : "수정 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Modal: 통합 문서 뷰어 (Universal Document Viewer: PDF & 고해상도 이미지) */}
      {/* ========================================================================= */}
      {(activeDocument || zoomImageUrl) && (() => {
        const doc = activeDocument || {
          title: "서류 원본 보기",
          partnerName: selectedPartner?.name || "등록 서류",
          url: zoomImageUrl!,
          fileName: undefined,
        };
        const isPdf = isPdfDocument(doc.url, doc.fileName);

        const handleClose = () => {
          setActiveDocument(null);
          setZoomImageUrl(null);
        };

        const handleOpenNewTab = () => {
          const win = window.open();
          if (win) {
            if (isPdf) {
              win.document.write(
                `<iframe src="${doc.url}" style="width:100vw;height:100vh;border:none;margin:0;padding:0;"></iframe>`
              );
            } else {
              win.document.write(
                `<body style="margin:0;background:#1e293b;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${doc.url}" style="max-width:100vw;max-height:100vh;object-fit:contain;" /></body>`
              );
            }
          }
        };

        const handlePrint = () => {
          const printWin = window.open("", "_blank");
          if (printWin) {
            printWin.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>${doc.title} - ${doc.partnerName}</title>
                  <style>
                    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                    img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                    iframe { width: 100vw; height: 100vh; border: none; }
                  </style>
                </head>
                <body>
                  ${
                    isPdf
                      ? `<iframe src="${doc.url}"></iframe>`
                      : `<img src="${doc.url}" onload="window.print();" />`
                  }
                </body>
              </html>
            `);
            if (isPdf) {
              setTimeout(() => printWin.print(), 800);
            }
          }
        };

        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6"
            onClick={handleClose}
          >
            <div
              className="relative w-full max-w-5xl max-h-[92vh] bg-[#ebe5d8] rounded-lg border-2 border-[#b5a894] shadow-2xl flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 py-3 bg-[#e2dbcd] border-b border-[#b5a894] flex items-center justify-between shrink-0 dark:bg-slate-800 dark:border-slate-700">
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="p-1.5 bg-[#dcd4c4] rounded border border-[#b5a894] dark:bg-slate-700 dark:border-slate-600">
                    {isPdf ? (
                      <FileText className="w-4 h-4 text-[#b91c1c] dark:text-rose-400" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 truncate">
                        {doc.title}
                      </h3>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] font-semibold dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                        {doc.partnerName}
                      </span>
                    </div>
                    {doc.fileName && (
                      <span className="text-[11px] text-[#475569] dark:text-slate-400 font-mono block truncate">
                        {doc.fileName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenNewTab}
                    className="px-2.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-semibold flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    title="새 탭 열기"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">새 탭 열기</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-2.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-semibold flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    title="인쇄"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">인쇄</span>
                  </button>

                  <a
                    href={doc.url}
                    download={doc.fileName || `${doc.title}.png`}
                    className="px-2.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-semibold flex items-center gap-1 transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">다운로드</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    title="닫기"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewer Body: PDF Iframe or High-Res Image */}
              <div className="flex-1 overflow-auto p-3 flex items-center justify-center bg-[#f4efe4] dark:bg-slate-950">
                {isPdf ? (
                  <iframe
                    src={doc.url}
                    className="w-full h-[76vh] rounded border border-[#b5a894] bg-[#fdfbf7] dark:bg-slate-900 dark:border-slate-800 shadow-sm"
                    title={doc.title}
                  />
                ) : (
                  <div className="w-full h-full max-h-[76vh] flex items-center justify-center overflow-auto p-2">
                    <img
                      src={doc.url}
                      alt={doc.title}
                      className="max-h-[72vh] max-w-full object-contain rounded border border-[#b5a894] shadow-md dark:border-slate-800"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
