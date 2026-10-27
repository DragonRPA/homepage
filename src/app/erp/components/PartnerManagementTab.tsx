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
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  FileText,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Eye,
  Trash2,
  Edit2,
  ExternalLink,
  Upload,
  UserCheck,
  Shield,
  FileCheck,
  Sparkles,
  Image as ImageIcon,
  Clock,
  ChevronRight,
  Briefcase
} from "lucide-react";
import { formatErpNumber, sortErpItems, SortDirection } from "@/lib/erpFormat";

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

  // Tab & Filters
  const [partnerTypeTab, setPartnerTypeTab] = useState<"CUSTOMER" | "VENDOR" | "ALL">(initialType);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [managerFilter, setManagerFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data
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

  // Sync initialType change from parent
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
      className={`py-2.5 px-3 whitespace-nowrap cursor-pointer select-none hover:bg-slate-700/60 transition ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      }`}
    >
      <div className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
        <span>{label}</span>
        {sortKey === colKey ? (
          sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
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
      fetchPartners(); // refresh contact count in table
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

  // Business Registration Certificate OCR Modal State
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [ocrPreviewFileUrl, setOcrPreviewFileUrl] = useState<string>("");
  const [ocrFileName, setOcrFileName] = useState<string>("");

  const handleBizCertFileUpload = async (file: File) => {
    setOcrLoading(true);
    setOcrFileName(file.name);
    try {
      // Read as base64 for preview and transfer
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        setOcrPreviewFileUrl(base64Data);

        // Call OCR endpoint
        const res = await fetch("/api/erp/partners/ocr-biz-cert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64Data,
            fileName: file.name,
          }),
        });
        const data = await res.json();
        if (data.success && data.parsed) {
          setOcrResult(data.parsed);
          showToast("사업자등록증 정보가 자동 인식되었습니다.");
        } else {
          showToast("자동 추출에 실패했습니다. 수동으로 보완해주세요.", "error");
        }
        setOcrLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      showToast(e.message || "파일 처리 실패", "error");
      setOcrLoading(false);
    }
  };

  // Load Preset Biz Cert (e.g. DragonRPA / Hyundai / Posco)
  const handleLoadPresetBizCert = async (presetKey: string) => {
    setOcrLoading(true);
    try {
      const res = await fetch("/api/erp/partners/ocr-biz-cert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetKey }),
      });
      const data = await res.json();
      if (data.success && data.parsed) {
        setOcrResult(data.parsed);
        setOcrFileName(data.parsed.fileName || `${presetKey}_사업자등록증.pdf`);
        setOcrPreviewFileUrl("/images/sample_biz_cert.png"); // placeholder visual
        showToast(data.message || "샘플 사업자등록증이 로드되었습니다.");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setOcrLoading(false);
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
      mainPhone: "",
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
    });
    setShowBizCertOcrModal(false);
    setShowPartnerModal(true);
    showToast("사업자등록증 정보가 거래처 등록 양식에 자동 입력되었습니다.");
  };

  // Business Card OCR Upload
  const [cardOcrLoading, setCardOcrLoading] = useState<boolean>(false);
  const handleCardImageUpload = async (file: File, side: "front" | "back") => {
    setCardOcrLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        if (side === "front") {
          setContactForm((prev: any) => ({ ...prev, businessCardFrontUrl: base64Data }));
          // OCR parse front
          const res = await fetch("/api/erp/partners/ocr-card", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileData: base64Data, fileName: file.name }),
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
        setCardOcrLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      showToast(e.message, "error");
      setCardOcrLoading(false);
    }
  };

  // Load Preset Business Card
  const handleLoadPresetCard = async (presetKey: string) => {
    setCardOcrLoading(true);
    try {
      const res = await fetch("/api/erp/partners/ocr-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetKey }),
      });
      const data = await res.json();
      if (data.success && data.parsed) {
        setContactForm((prev: any) => ({
          ...prev,
          name: data.parsed.name,
          position: data.parsed.position,
          department: data.parsed.department,
          mobile: data.parsed.mobile,
          email: data.parsed.email,
          telephone: data.parsed.telephone,
          memo: data.parsed.memo,
          businessCardFrontUrl: "/images/sample_card_front.png",
        }));
        showToast("샘플 명함 정보가 로드되었습니다.");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setCardOcrLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-xs font-bold border ${
            toastMessage.type === "success"
              ? "bg-emerald-950 border-emerald-500 text-emerald-200"
              : "bg-rose-950 border-rose-500 text-rose-200"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Top Header: Tab Switching & Action Pipeline (Gutenberg Z-Pattern ① & ②) */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* Partner Type Sub-Tabs */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded border border-slate-700">
            <button
              onClick={() => setPartnerTypeTab("CUSTOMER")}
              className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition ${
                partnerTypeTab === "CUSTOMER"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>고객 관리 (매출처)</span>
              <span className="px-1.5 py-0.2 bg-blue-800/80 rounded-full text-[10px]">
                {formatErpNumber(kpi.customerCount)}
              </span>
            </button>
            <button
              onClick={() => setPartnerTypeTab("VENDOR")}
              className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition ${
                partnerTypeTab === "VENDOR"
                  ? "bg-amber-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>매입거래처 관리</span>
              <span className="px-1.5 py-0.2 bg-amber-800/80 rounded-full text-[10px]">
                {formatErpNumber(kpi.vendorCount)}
              </span>
            </button>
            <button
              onClick={() => setPartnerTypeTab("ALL")}
              className={`px-2.5 py-1 text-xs font-bold rounded transition ${
                partnerTypeTab === "ALL"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              전체 통합 ({formatErpNumber(kpi.totalCount)})
            </button>
          </div>

          {/* Quick Scope Filters (상태 & 본사담당직원) */}
          <div className="hidden md:flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2.5 py-1 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">전체 상태</option>
              <option value="ACTIVE">정상 거래</option>
              <option value="INACTIVE">거래 중지</option>
              <option value="DORMANT">휴면</option>
            </select>

            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 px-2.5 py-1 rounded focus:outline-none focus:border-blue-500"
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
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="상호 / 사업자번호 / 대표 / 담당자 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchPartners()}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1 rounded w-56 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Action Pipeline Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPartners}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded flex items-center gap-1.5 border border-slate-700 shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 내보내기</span>
          </button>

          {/* ★ 핵심 요구기능: 사업자등록증 활용 간편 등록 */}
          <button
            onClick={() => {
              setOcrResult(null);
              setOcrPreviewFileUrl("");
              setOcrFileName("");
              setShowBizCertOcrModal(true);
            }}
            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>사업자등록증 간편등록</span>
          </button>

          {/* 신규 직접 등록 */}
          <button
            onClick={openCreateModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {partnerTypeTab === "VENDOR" ? "신규 매입거래처 등록" : "신규 거래처 등록"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content: High-Density Grid (Left 7-8 cols) + Dossier Studio (Right 4-5 cols) */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left: High-Density Partner Table (Gutenberg Z-Pattern ③) */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 bg-slate-900 border border-slate-800 rounded flex flex-col overflow-hidden shadow-inner">
          {/* Header Summary Strip */}
          <div className="p-2.5 bg-slate-800/80 border-b border-slate-700 text-xs font-bold text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>
                {partnerTypeTab === "CUSTOMER"
                  ? "고객 (매출처) 대장"
                  : partnerTypeTab === "VENDOR"
                  ? "매입거래처 (공급처) 대장"
                  : "전체 거래처 대장"}
              </span>
              <span className="text-slate-400 font-normal">
                (조회 {formatErpNumber(sortedPartners.length)}개사)
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              <span>사업자등록증 보유: <strong className="text-purple-300">{formatErpNumber(kpi.withBizCertCount)}</strong>개사</span>
              <span>정상거래: <strong className="text-emerald-400">{formatErpNumber(kpi.activeCount)}</strong>개사</span>
            </div>
          </div>

          {/* Table Container with Sticky Thead & Vertical Scroll */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-700 sticky top-0 z-10 select-none">
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
              <tbody className="divide-y divide-slate-800">
                {sortedPartners.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-500">
                      {loading ? "거래처 데이터를 불러오는 중..." : "등록된 거래처가 없습니다."}
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
                            ? "bg-blue-950/60 border-l-4 border-blue-500"
                            : "hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setSelectedPartner(p)}
                            className="rounded-full text-blue-500 bg-slate-950 border-slate-700"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-400 font-bold whitespace-nowrap">
                          {p.partnerCode}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.bizCertFileUrl && (
                              <span
                                title="사업자등록증 원본 보관됨"
                                className="px-1 py-0.2 rounded text-[9px] bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-0.5"
                              >
                                <FileCheck className="w-2.5 h-2.5" />
                                <span>등록증</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.partnerType === "CUSTOMER"
                                ? "bg-blue-950/60 text-blue-300 border border-blue-800"
                                : p.partnerType === "VENDOR"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-800"
                                : "bg-purple-950/60 text-purple-300 border border-purple-800"
                            }`}
                          >
                            {p.partnerType === "CUSTOMER" ? "고객" : p.partnerType === "VENDOR" ? "매입처" : "겸용"}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-300 whitespace-nowrap">
                          {p.businessNo || "-"}
                        </td>
                        <td className="py-2 px-3 text-slate-200 whitespace-nowrap">
                          {p.ceoName || "-"}
                        </td>
                        <td className="py-2 px-3 text-slate-200 font-semibold whitespace-nowrap">
                          <span className="flex items-center gap-1 text-blue-300">
                            <UserCheck className="w-3 h-3 text-blue-400" />
                            {p.managerName || "미지정"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300 font-medium whitespace-nowrap">
                          {p.statementClosingDay}
                        </td>
                        <td className="py-2 px-3 text-slate-300 font-medium whitespace-nowrap">
                          {p.taxInvoiceClosingDay}
                        </td>
                        <td className="py-2 px-3 font-mono text-amber-300 font-semibold whitespace-nowrap">
                          {p.paymentDueDay}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            <CreditCard className="w-3 h-3 text-emerald-400" />
                            <span>{formatErpNumber(p.contactCount || 0)}명</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.status === "ACTIVE"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : p.status === "INACTIVE"
                                ? "bg-rose-950 text-rose-400 border border-rose-800"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
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

        {/* Right: Master-Detail Dossier Studio (Gutenberg Z-Pattern ④) */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 bg-slate-900 border border-slate-800 rounded flex flex-col overflow-hidden shadow-inner">
          {selectedPartner ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Dossier Header */}
              <div className="p-3.5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11px] font-bold text-blue-400">
                      {selectedPartner.partnerCode}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        selectedPartner.partnerType === "CUSTOMER"
                          ? "bg-blue-950 text-blue-300 border border-blue-800"
                          : selectedPartner.partnerType === "VENDOR"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-purple-950 text-purple-300 border border-purple-800"
                      }`}
                    >
                      {selectedPartner.partnerType === "CUSTOMER" ? "고객사" : selectedPartner.partnerType === "VENDOR" ? "매입거래처" : "겸용"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 truncate">
                    {selectedPartner.name}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(selectedPartner)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                    title="거래처 수정"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeletePartner(selectedPartner.id, selectedPartner.name)}
                      className="p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded border border-rose-800 transition"
                      title="거래처 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dossier Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
                {/* 1. 본사 관리 핵심 속성 (★ 필수 속성 요약) */}
                <div className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>본사 관리 및 정산 마감 조건</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block mb-0.5">본사의 담당직원</span>
                      <strong className="text-slate-200 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-blue-400" />
                        {selectedPartner.managerName || "미배정"}
                      </strong>
                    </div>

                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block mb-0.5">거래명세서 마감일</span>
                      <strong className="text-slate-200 font-mono">
                        {selectedPartner.statementClosingDay}
                      </strong>
                    </div>

                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block mb-0.5">세금계산서 마감일</span>
                      <strong className="text-slate-200 font-mono">
                        {selectedPartner.taxInvoiceClosingDay}
                      </strong>
                    </div>

                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block mb-0.5">약정납기일 (결제일)</span>
                      <strong className="text-amber-300 font-mono font-bold">
                        {selectedPartner.paymentDueDay}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 2. 사업자 기본 제원 및 본사 소재지 */}
                <div className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-1.5 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>본사 사업자 기본 제원</span>
                  </span>

                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-500">사업자등록번호</span>
                    <span className="font-mono font-bold text-slate-200">{selectedPartner.businessNo || "-"}</span>
                  </div>

                  {selectedPartner.corporateNo && (
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-500">법인등록번호</span>
                      <span className="font-mono text-slate-200">{selectedPartner.corporateNo}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-500">대표자 성명</span>
                    <span className="font-semibold text-slate-200">{selectedPartner.ceoName || "-"}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-500">업태 / 종목</span>
                    <span className="text-slate-200 text-right truncate max-w-xs">
                      {selectedPartner.bizType || "-"} / {selectedPartner.bizItem || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-500">본사 사업장 소재지</span>
                    <span className="text-slate-200 text-right truncate max-w-xs" title={`${selectedPartner.address || ""} ${selectedPartner.addressDetail || ""}`.trim()}>
                      {`${selectedPartner.address || ""} ${selectedPartner.addressDetail || ""}`.trim() || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-500">계산서 수신 이메일</span>
                    <span className="font-mono text-blue-300 text-right truncate max-w-xs">{selectedPartner.mainEmail || "-"}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">본사 대표 전화</span>
                    <span className="font-mono text-slate-200">{selectedPartner.mainPhone || "-"}</span>
                  </div>
                </div>

                {/* 3. 사업자등록증 원본 보관함 (★ 파일 뷰어 & 다운로드) */}
                <div className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>사업자등록증 원본 서류</span>
                    </span>

                    {selectedPartner.bizCertFileUrl ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800">
                        보관 완료
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                        미등록
                      </span>
                    )}
                  </div>

                  {selectedPartner.bizCertFileUrl ? (
                    <div className="p-2.5 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-semibold text-slate-200 block truncate">
                            {selectedPartner.bizCertFileName || "사업자등록증.pdf"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            국세청 사업자등록증 스캔 원본
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            if (selectedPartner.bizCertFileUrl) {
                              setZoomImageUrl(selectedPartner.bizCertFileUrl);
                            }
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px] flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>미리보기</span>
                        </button>
                        <a
                          href={selectedPartner.bizCertFileUrl}
                          download={selectedPartner.bizCertFileName || "사업자등록증"}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                          title="다운로드"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-900 rounded border border-dashed border-slate-800 text-center">
                      <p className="text-[11px] text-slate-500 mb-2">
                        등록된 사업자등록증 파일이 없습니다.
                      </p>
                      <button
                        onClick={() => openEditModal(selectedPartner)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px] inline-flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>사업자등록증 첨부하기</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. 거래처 담당자 및 실물 명함 보관함 (★ 핵심 요구기능) */}
                <div className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                        거래처 담당자 및 명함 보관함 ({partnerContacts.length}명)
                      </span>
                    </div>

                    <button
                      onClick={openCreateContactModal}
                      className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>명함·담당자 추가</span>
                    </button>
                  </div>

                  {contactsLoading ? (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      담당자 정보를 불러오는 중...
                    </div>
                  ) : partnerContacts.length === 0 ? (
                    <div className="p-4 bg-slate-900 rounded border border-slate-800 text-center text-slate-500 text-xs">
                      등록된 거래처 담당자가 없습니다. 상단 버튼으로 명함을 등록하세요.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {partnerContacts.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 bg-slate-900 rounded border border-slate-800 flex flex-col gap-2 hover:border-slate-700 transition"
                        >
                          {/* Contact Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-100">
                                {c.name}
                              </span>
                              {(c.position || c.department) && (
                                <span className="text-[11px] text-slate-400">
                                  {c.department ? `${c.department} ` : ""}{c.position || ""}
                                </span>
                              )}
                              {c.isPrimary && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                                  대표담당
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditContactModal(c)}
                                className="p-1 hover:bg-slate-800 text-slate-400 rounded"
                                title="수정"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteContact(c.id, c.name)}
                                className="p-1 hover:bg-rose-950 text-rose-400 rounded"
                                title="삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Contact Details */}
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-300 font-mono">
                            {c.mobile && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="truncate">{c.mobile}</span>
                              </div>
                            )}
                            {c.email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="w-3 h-3 text-blue-400 shrink-0" />
                                <span className="truncate">{c.email}</span>
                              </div>
                            )}
                            {c.telephone && (
                              <div className="flex items-center gap-1.5 truncate col-span-2 text-slate-400">
                                <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>직통: {c.telephone}</span>
                              </div>
                            )}
                          </div>

                          {/* Business Card Preview Box */}
                          {c.businessCardFrontUrl ? (
                            <div className="mt-1 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  실물 명함 사진 첨부됨
                                </span>
                              </div>

                              <button
                                onClick={() => setZoomImageUrl(c.businessCardFrontUrl || null)}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded border border-slate-700 text-[10px] flex items-center gap-1 font-semibold"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                <span>명함 확대보기</span>
                              </button>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              명함 이미지 미등록
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. 비고 / 특이사항 메모 */}
                {selectedPartner.memo && (
                  <div className="bg-slate-950/60 p-3 rounded border border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-500 block mb-1">비고 및 특이사항</span>
                    <p className="text-slate-300 whitespace-pre-wrap">{selectedPartner.memo}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs p-6 text-center">
              <Building2 className="w-8 h-8 opacity-20 mb-2" />
              <span>좌측 목록에서 거래처를 선택하면 상세 정보 및 명함 보관함이 표시됩니다.</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. Modal: 신규/수정 거래처 폼 (Partner Form Modal) */}
      {/* ========================================================================= */}
      {showPartnerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>
                  {partnerModalMode === "CREATE"
                    ? partnerForm.partnerType === "VENDOR" ? "신규 매입거래처 등록" : "신규 거래처 등록"
                    : `거래처 정보 수정 (${partnerForm.name})`}
                </span>
              </h2>
              <button
                onClick={() => setShowPartnerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSavePartner} className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs">
              {/* 구분 & 코드 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold">거래처 구분 *</label>
                  <select
                    value={partnerForm.partnerType}
                    onChange={(e) => setPartnerForm({ ...partnerForm, partnerType: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-blue-500"
                  >
                    <option value="CUSTOMER">고객 (매출처)</option>
                    <option value="VENDOR">매입거래처 (공급처)</option>
                    <option value="BOTH">고객 및 매입거래처 겸용</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold">거래처 코드 (미입력 시 자동 채번)</label>
                  <input
                    type="text"
                    placeholder="예: CUST-2026-001"
                    value={partnerForm.partnerCode}
                    onChange={(e) => setPartnerForm({ ...partnerForm, partnerCode: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 상호 & 사업자번호 & 법인번호 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-slate-400 font-semibold">상호명 (법인명) *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: (주)한국알피에이"
                    value={partnerForm.name}
                    onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-slate-400 font-semibold">사업자등록번호</label>
                  <input
                    type="text"
                    placeholder="000-00-00000"
                    value={partnerForm.businessNo}
                    onChange={(e) => setPartnerForm({ ...partnerForm, businessNo: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-slate-400 font-semibold">대표자 성명</label>
                  <input
                    type="text"
                    placeholder="홍길동"
                    value={partnerForm.ceoName}
                    onChange={(e) => setPartnerForm({ ...partnerForm, ceoName: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 업태 & 종목 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold">업태</label>
                  <input
                    type="text"
                    placeholder="예: 정보통신업, 건설업, 도소매업"
                    value={partnerForm.bizType}
                    onChange={(e) => setPartnerForm({ ...partnerForm, bizType: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold">종목</label>
                  <input
                    type="text"
                    placeholder="예: 소프트웨어 개발, 컴퓨터시설관리"
                    value={partnerForm.bizItem}
                    onChange={(e) => setPartnerForm({ ...partnerForm, bizItem: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 본사 주소 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-slate-400 font-semibold">본사 사업장 소재지 (기본주소)</label>
                  <input
                    type="text"
                    placeholder="예: 서울특별시 송파구 동남로11길 26-11"
                    value={partnerForm.address}
                    onChange={(e) => setPartnerForm({ ...partnerForm, address: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1 col-span-1">
                  <label className="text-slate-400 font-semibold">상세주소</label>
                  <input
                    type="text"
                    placeholder="예: 3층 301호"
                    value={partnerForm.addressDetail}
                    onChange={(e) => setPartnerForm({ ...partnerForm, addressDetail: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 대표 연락처 & 세금계산서 수신 이메일 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold">본사 대표 전화번호</label>
                  <input
                    type="text"
                    placeholder="02-0000-0000"
                    value={partnerForm.mainPhone}
                    onChange={(e) => setPartnerForm({ ...partnerForm, mainPhone: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold">세금계산서 수신 전용 이메일</label>
                  <input
                    type="email"
                    placeholder="tax@company.co.kr"
                    value={partnerForm.mainEmail}
                    onChange={(e) => setPartnerForm({ ...partnerForm, mainEmail: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* ★ 핵심 요구사항: 본사 담당직원 / 마감일 / 약정납기일 섹션 */}
              <div className="p-3 bg-blue-950/20 border border-blue-900/50 rounded-lg space-y-3">
                <span className="text-xs font-bold text-blue-400 block pb-1 border-b border-blue-900/40">
                  🏛️ 본사 관리 및 정산 약정 설정 (필수 관리 항목)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  {/* 본사의 담당직원 */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-semibold">본사의 담당직원 *</label>
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
                      className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value="">직접 입력 또는 선택 안함</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.department} {emp.position || ""})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 거래 상태 */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-semibold">거래 상태</label>
                    <select
                      value={partnerForm.status}
                      onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value })}
                      className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-blue-500"
                    >
                      <option value="ACTIVE">정상 거래 (ACTIVE)</option>
                      <option value="INACTIVE">거래 중지 (INACTIVE)</option>
                      <option value="DORMANT">휴면 (DORMANT)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* 거래명세서 마감일 */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-semibold">거래명세서 마감일 *</label>
                    <select
                      value={partnerForm.statementClosingDay}
                      onChange={(e) => setPartnerForm({ ...partnerForm, statementClosingDay: e.target.value })}
                      className="bg-slate-950 border border-slate-700 text-slate-200 px-2 py-1.5 rounded font-mono focus:outline-none focus:border-blue-500"
                    >
                      <option value="매월 25일">매월 25일 (기본)</option>
                      <option value="당월말일">당월 말일</option>
                      <option value="매월 20일">매월 20일</option>
                      <option value="매월 15일">매월 15일</option>
                      <option value="수시">수시 (건별)</option>
                    </select>
                  </div>

                  {/* 세금계산서 마감일 */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-semibold">세금계산서 마감일 *</label>
                    <select
                      value={partnerForm.taxInvoiceClosingDay}
                      onChange={(e) => setPartnerForm({ ...partnerForm, taxInvoiceClosingDay: e.target.value })}
                      className="bg-slate-950 border border-slate-700 text-slate-200 px-2 py-1.5 rounded font-mono focus:outline-none focus:border-blue-500"
                    >
                      <option value="익월 10일">익월 10일 (국세청 기본)</option>
                      <option value="당월말일">당월 말일</option>
                      <option value="매월 25일">매월 25일</option>
                      <option value="수시">수시 (건별 즉시)</option>
                    </select>
                  </div>

                  {/* 약정납기일 / 대금결제일 */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-semibold">약정납기일 (결제일) *</label>
                    <select
                      value={partnerForm.paymentDueDay}
                      onChange={(e) => setPartnerForm({ ...partnerForm, paymentDueDay: e.target.value })}
                      className="bg-slate-950 border border-slate-700 text-slate-200 px-2 py-1.5 rounded font-mono focus:outline-none focus:border-blue-500 font-bold text-amber-300"
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

              {/* 사업자등록증 첨부 확인 */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-semibold">사업자등록증 원본 파일</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setPartnerForm({
                            ...partnerForm,
                            bizCertFileUrl: reader.result as string,
                            bizCertFileName: file.name,
                          });
                          showToast("사업자등록증 파일이 첨부되었습니다.");
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                  />
                  {partnerForm.bizCertFileName && (
                    <span className="text-[11px] text-purple-400 font-mono">
                      첨부됨: {partnerForm.bizCertFileName}
                    </span>
                  )}
                </div>
              </div>

              {/* 비고 */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-semibold">특이사항 및 메모</label>
                <textarea
                  rows={2}
                  placeholder="거래 특이사항, 주요 취급 품목 등"
                  value={partnerForm.memo}
                  onChange={(e) => setPartnerForm({ ...partnerForm, memo: e.target.value })}
                  className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPartnerModal(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow transition"
                >
                  {partnerModalMode === "CREATE" ? "거래처 등록 완료" : "수정사항 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Modal: 사업자등록증 OCR 간편등록 모달 (BizCertUploadModal) */}
      {/* ========================================================================= */}
      {showBizCertOcrModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-slate-100">
                  사업자등록증 자동 인식 및 간편 거래처 등록
                </h2>
              </div>
              <button
                onClick={() => setShowBizCertOcrModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs">
              {/* Dropzone & Quick Samples */}
              <div className="grid grid-cols-12 gap-3">
                {/* Upload Area (7 cols) */}
                <div className="col-span-12 md:col-span-7 p-4 bg-slate-950/80 rounded border-2 border-dashed border-slate-700 hover:border-purple-500 transition text-center flex flex-col items-center justify-center gap-2">
                  <Upload className="w-8 h-8 text-purple-400" />
                  <div>
                    <span className="font-bold text-slate-200 block">
                      사업자등록증 파일 업로드 (PDF / PNG / JPG)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      국세청 홈택스 발급 사업자등록증 전자 문서를 자동 분석합니다.
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBizCertFileUpload(file);
                    }}
                    className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                  />
                </div>

                {/* Instant Sample Presets (5 cols) */}
                <div className="col-span-12 md:col-span-5 p-3 bg-slate-950/60 rounded border border-slate-800 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-slate-400 block pb-1 border-b border-slate-800">
                    원클릭 샘플 테스트 (즉시 체험)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLoadPresetBizCert("DRAGON_RPA")}
                    className="p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-purple-300 block">드래곤알피에이</strong>
                      <span className="text-[10px] text-slate-500 font-mono">295-03-02683 (일반과세자)</span>
                    </div>
                    <span className="text-[10px] text-blue-400 font-bold">선택 ➔</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPresetBizCert("HYUNDAI")}
                    className="p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-slate-200 block">현대건설(주)</strong>
                      <span className="text-[10px] text-slate-500 font-mono">101-81-16297 (법인사업자)</span>
                    </div>
                    <span className="text-[10px] text-blue-400 font-bold">선택 ➔</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPresetBizCert("POSCO")}
                    className="p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-slate-200 block">포스코이앤씨(주)</strong>
                      <span className="text-[10px] text-slate-500 font-mono">502-81-24856 (법인사업자)</span>
                    </div>
                    <span className="text-[10px] text-blue-400 font-bold">선택 ➔</span>
                  </button>
                </div>
              </div>

              {/* OCR Parsing Result Preview */}
              {ocrLoading ? (
                <div className="p-8 text-center text-purple-300 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>사업자등록증 문서를 정밀 분석하는 중입니다...</span>
                </div>
              ) : ocrResult ? (
                <div className="p-4 bg-slate-950/80 rounded border border-purple-900/60 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <strong className="text-slate-200 text-sm">{ocrResult.name || "상호 미추출"}</strong>
                      <span className="text-xs font-mono text-purple-300">[{ocrResult.businessNo}]</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      인식 완료
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">대표자 성명</span>
                      <span className="font-semibold text-slate-200">{ocrResult.ceoName || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">개업연월일</span>
                      <span className="font-mono text-slate-200">{ocrResult.openDate || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">업태</span>
                      <span className="text-slate-200">{ocrResult.bizType || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">종목</span>
                      <span className="text-slate-200">{ocrResult.bizItem || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[10px]">사업장 소재지 (본사)</span>
                      <span className="text-slate-200">{ocrResult.address || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[10px]">전자세금계산서 전용 이메일</span>
                      <span className="font-mono text-blue-300">{ocrResult.email || "-"}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowBizCertOcrModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={!ocrResult}
                onClick={handleApplyOcrToForm}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded shadow text-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>이 정보로 거래처 등록 양식 채우기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Modal: 거래처 담당자 및 실물 명함 등록 모달 (BusinessCardModal) */}
      {/* ========================================================================= */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-100">
                  {contactModalMode === "CREATE"
                    ? `[${selectedPartner?.name}] 담당자 및 명함 등록`
                    : `담당자 정보 수정 (${contactForm.name})`}
                </h2>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveContact} className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs">
              {/* Quick Card Sample Loader */}
              <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold">
                  빠른 명함 테스트 프리셋:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLoadPresetCard("SAMPLE_1")}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px]"
                  >
                    김진석 부장 (구매)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPresetCard("SAMPLE_2")}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px]"
                  >
                    이수진 과장 (IT)
                  </button>
                </div>
              </div>

              {/* Business Card Photo Upload & Smart OCR */}
              <div className="p-3 bg-purple-950/20 border border-purple-900/50 rounded-lg space-y-2">
                <span className="text-xs font-bold text-purple-300 block flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>실물 명함 사진 첨부 및 자동 문자 인식(OCR)</span>
                </span>

                <div className="grid grid-cols-2 gap-3">
                  {/* Front Card */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-400 font-semibold">명함 앞면 사진</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCardImageUpload(file, "front");
                      }}
                      className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200"
                    />
                    {contactForm.businessCardFrontUrl && (
                      <div className="mt-1 relative rounded border border-purple-800 overflow-hidden h-20 bg-slate-950 flex items-center justify-center">
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
                    <label className="text-[11px] text-slate-400 font-semibold">명함 뒷면 사진 (선택)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCardImageUpload(file, "back");
                      }}
                      className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200"
                    />
                    {contactForm.businessCardBackUrl && (
                      <div className="mt-1 relative rounded border border-slate-800 overflow-hidden h-20 bg-slate-950 flex items-center justify-center">
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
                  <label className="text-slate-400 font-semibold">담당자 성명 *</label>
                  <input
                    type="text"
                    required
                    placeholder="홍길동"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold">소속 부서 / 직책</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="구매팀"
                      value={contactForm.department}
                      onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
                      className="bg-slate-950 border border-slate-700 text-slate-200 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="팀장 / 과장"
                      value={contactForm.position}
                      onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                      className="bg-slate-950 border border-slate-700 text-slate-200 px-2 py-1.5 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile & Tel & Email */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold">휴대전화 번호</label>
                  <input
                    type="text"
                    placeholder="010-0000-0000"
                    value={contactForm.mobile}
                    onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold">직통 유선전화</label>
                  <input
                    type="text"
                    placeholder="02-0000-0000"
                    value={contactForm.telephone}
                    onChange={(e) => setContactForm({ ...contactForm, telephone: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold">담당자 이메일</label>
                  <input
                    type="email"
                    placeholder="user@partner.co.kr"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Primary Contact Toggle */}
              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="font-bold text-slate-200 block text-xs">대표 담당자 지정</span>
                    <span className="text-[10px] text-slate-500 block">
                      대장 및 세금계산서 발행 시 기본 수신자로 우선 매핑됩니다.
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
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Memo */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-semibold">담당 업무 메모</label>
                <textarea
                  rows={2}
                  placeholder="예: RPA 시스템 도입 및 계약 총괄 창구"
                  value={contactForm.memo}
                  onChange={(e) => setContactForm({ ...contactForm, memo: e.target.value })}
                  className="bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow"
                >
                  {contactModalMode === "CREATE" ? "명함·담당자 저장" : "수정 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Modal: 명함/서류 고해상도 확대 팝업 (Image Zoom Modal) */}
      {/* ========================================================================= */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 p-2 rounded-lg border border-slate-800 shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setZoomImageUrl(null)}
              className="absolute top-3 right-3 p-1.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomImageUrl}
              alt="확대 이미지"
              className="max-h-[85vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
