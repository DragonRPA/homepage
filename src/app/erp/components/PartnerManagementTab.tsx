"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Users,
  Building2,
  Truck,
  Plus,
  RefreshCw,
  Search,
  Download,
  FileUp,
  Landmark,
  ShieldAlert,
} from "lucide-react";
import { formatErpNumber, sortErpItems } from "@/lib/erpFormat";
import { matchHangulAny } from "@/lib/hangulSearch";
import { invalidateMasterData } from "@/lib/erpMasterDataBus";
import { SortableTh, useErpTableSort } from "./SortableTh";
import {
  type ActiveDocumentViewer,
  type PartnerContact,
  type Partner,
  type PartnerManagementTabProps,
} from "./partners/partnerTypes";
import { exportPartnersToCsv, resizeImageToBase64 } from "./partners/partnerPdfUtils";
import { PartnerListPanel } from "./partners/PartnerListPanel";
import { PartnerDossierPanel } from "./partners/PartnerDossierPanel";
import {
  buildPartnerPutPayload,
  createContactFormFromContact,
  createDefaultContactForm,
  createDefaultPartnerForm,
  createPartnerFormFromPartner,
  mergePreloadedFilesIntoPartnerForm,
  type PartnerFileBundle,
} from "./partners/partnerFormHelpers";
import { usePartnerDocAndNtsActions } from "./partners/usePartnerDocAndNtsActions";

const PartnerFormModal = dynamic(
  () => import("./partners/PartnerFormModal").then((m) => m.PartnerFormModal),
  { ssr: false }
);
const BizCertOcrModal = dynamic(
  () => import("./partners/BizCertOcrModal").then((m) => m.BizCertOcrModal),
  { ssr: false }
);
const BankCopyOcrModal = dynamic(
  () => import("./partners/BankCopyOcrModal").then((m) => m.BankCopyOcrModal),
  { ssr: false }
);
const ContactFormModal = dynamic(
  () => import("./partners/ContactFormModal").then((m) => m.ContactFormModal),
  { ssr: false }
);
const BizStatusBatchModal = dynamic(
  () => import("./partners/BizStatusBatchModal").then((m) => m.BizStatusBatchModal),
  { ssr: false }
);
const PartnerDocViewerModal = dynamic(
  () => import("./partners/PartnerDocViewerModal").then((m) => m.PartnerDocViewerModal),
  { ssr: false }
);

export {
  KOREAN_BANKS,
  type ActiveDocumentViewer,
  type PartnerContact,
  type Partner,
} from "./partners/partnerTypes";

export const PartnerManagementTab: React.FC<PartnerManagementTabProps> = ({
  currentUser,
  initialType = "CUSTOMER",
  onSelectTypeTab,
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
  const filesCacheRef = useRef<Record<number, PartnerFileBundle>>({});

  // Sorting (3단계: asc ➔ desc ➔ null 정렬안함)
  const { sortKey, sortDir, handleSort } = useErpTableSort("id", "desc");
  const ntsSort = useErpTableSort("", null);

  // Modals
  const [showPartnerModal, setShowPartnerModal] = useState<boolean>(false);
  const [partnerModalMode, setPartnerModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [showBizCertOcrModal, setShowBizCertOcrModal] = useState<boolean>(false);
  const [showBankOcrModal, setShowBankOcrModal] = useState<boolean>(false);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [contactModalMode, setContactModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [showBizStatusBatchModal, setShowBizStatusBatchModal] = useState<boolean>(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<ActiveDocumentViewer | null>(null);

  // File Input Refs & Dropzone UI States
  const certFileInputRef = useRef<HTMLInputElement>(null);
  const bankCopyInputRef = useRef<HTMLInputElement>(null);
  const directBizCertInputRef = useRef<HTMLInputElement>(null);
  const directContractInputRef = useRef<HTMLInputElement>(null);
  const dossierBizCertInputRef = useRef<HTMLInputElement>(null);
  const dossierContractInputRef = useRef<HTMLInputElement>(null);
  const viewerReplaceFileInputRef = useRef<HTMLInputElement>(null);
  const bankOcrModalFileInputRef = useRef<HTMLInputElement>(null);
  const [isBankCopyDragging, setIsBankCopyDragging] = useState<boolean>(false);
  const [isDirectBizCertDragging, setIsDirectBizCertDragging] = useState<boolean>(false);
  const [isDirectContractDragging, setIsDirectContractDragging] = useState<boolean>(false);
  const [isDossierBizCertDragging, setIsDossierBizCertDragging] = useState<boolean>(false);
  const [isDossierContractDragging, setIsDossierContractDragging] = useState<boolean>(false);

  // Partner Form State
  const [partnerForm, setPartnerForm] = useState<any>(() => createDefaultPartnerForm());

  // Dossier Inline Email Edit State
  const [editingDossierEmail, setEditingDossierEmail] = useState<boolean>(false);
  const [dossierMainEmail, setDossierMainEmail] = useState<string>("");
  const [dossierSubEmail, setDossierSubEmail] = useState<string>("");
  const [savingDossierEmail, setSavingDossierEmail] = useState<boolean>(false);

  // Contact Form State
  const [contactForm, setContactForm] = useState<any>(() => createDefaultContactForm());

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
    } catch {}
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

  const handleSaveDossierEmail = async () => {
    if (!selectedPartner) return;
    setSavingDossierEmail(true);
    try {
      const res = await fetch("/api/erp/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPartnerPutPayload(selectedPartner, {
            mainEmail: dossierMainEmail.trim() || null,
            subEmail: dossierSubEmail.trim() || null,
          })
        ),
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
      if (
        q &&
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

  const docActions = usePartnerDocAndNtsActions({
    currentUser,
    partnerTypeTab,
    partners,
    setPartners,
    selectedPartner,
    setSelectedPartner,
    sortedPartners,
    filesCacheRef,
    fetchPartners,
    showToast,
    partnerForm,
    setPartnerForm,
    partnerModalMode,
    setPartnerModalMode,
    setShowPartnerModal,
    setShowBizCertOcrModal,
    setShowBankOcrModal,
    activeDocument,
    setActiveDocument,
  });

  // Open Create Modal
  const openCreateModal = () => {
    setPartnerModalMode("CREATE");
    docActions.setDirectBizCertSuggestion(null);
    setPartnerForm(
      createDefaultPartnerForm({
        partnerType: partnerTypeTab === "ALL" ? "CUSTOMER" : partnerTypeTab,
        currentUser,
      })
    );
    setShowPartnerModal(true);
  };

  // Open Edit Modal
  const openEditModal = async (p: Partner) => {
    setPartnerModalMode("EDIT");
    docActions.setDirectBizCertSuggestion(null);
    const form = createPartnerFormFromPartner(p);
    setPartnerForm(form);
    setShowPartnerModal(true);

    // Preload original files in background when opening Edit modal so preview/re-run OCR works seamlessly
    if (
      (form.hasBizCert && !p.bizCertFileUrl) ||
      (form.hasBankCopy && !p.bankCopyFileUrl) ||
      (form.hasContractFile && !p.contractFileUrl)
    ) {
      const files = await docActions.ensurePartnerFiles(p);
      setPartnerForm((prev: any) => mergePreloadedFilesIntoPartnerForm(prev, p.id, files));
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
      const method = partnerModalMode === "CREATE" ? "POST" : "PUT";
      const res = await fetch("/api/erp/partners", {
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
    setContactForm(
      createDefaultContactForm({
        partnerId: selectedPartner.id,
        isPrimary: partnerContacts.length === 0,
      })
    );
    setShowContactModal(true);
  };

  const openEditContactModal = (c: PartnerContact) => {
    setContactModalMode("EDIT");
    setContactForm(createContactFormFromContact(c));
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
      const method = contactModalMode === "CREATE" ? "POST" : "PUT";
      const res = await fetch("/api/erp/partners/contacts", {
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
              docActions.setBatchResult(null);
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
              docActions.resetBizCertOcrModalState();
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
              docActions.resetBankOcrModalState();
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
          docFetching={docActions.docFetching}
          handleOpenPartnerDoc={docActions.handleOpenPartnerDoc}
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
              docFetching={docActions.docFetching}
              dossierBizCertInputRef={dossierBizCertInputRef}
              dossierBizCertSaving={docActions.dossierBizCertSaving}
              dossierContractInputRef={dossierContractInputRef}
              dossierContractSaving={docActions.dossierContractSaving}
              dossierMainEmail={dossierMainEmail}
              dossierSubEmail={dossierSubEmail}
              editingDossierEmail={editingDossierEmail}
              handleDeleteContact={handleDeleteContact}
              handleDeletePartner={handleDeletePartner}
              handleDossierBizCertDelete={docActions.handleDossierBizCertDelete}
              handleDossierBizCertUpload={docActions.handleDossierBizCertUpload}
              handleDossierContractDelete={docActions.handleDossierContractDelete}
              handleDossierContractUpload={docActions.handleDossierContractUpload}
              handleOpenPartnerDoc={docActions.handleOpenPartnerDoc}
              handleRunSingleNtsCheck={docActions.handleRunSingleNtsCheck}
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
              singleNtsCheckingId={docActions.singleNtsCheckingId}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#475569] text-xs p-6 text-center">
              <Building2 className="w-8 h-8 opacity-30 mb-2 text-[#475569]" />
              <span>목록에서 거래처를 선택하면 상세 정보 및 명함 보관함이 표시됩니다.</span>
            </div>
          )}
        </div>
      </div>

      {/* 1. Modal: 신규/수정 거래처 폼 */}
      {showPartnerModal && (
        <PartnerFormModal
          bankCopyInputRef={bankCopyInputRef}
          bankOcrLoading={docActions.bankOcrLoading}
          directBizCertInputRef={directBizCertInputRef}
          directBizCertOcrLoading={docActions.directBizCertOcrLoading}
          directBizCertSuggestion={docActions.directBizCertSuggestion}
          directContractInputRef={directContractInputRef}
          employees={employees}
          formNtsChecking={docActions.formNtsChecking}
          handleApplyDirectBizCertSuggestion={docActions.handleApplyDirectBizCertSuggestion}
          handleBankCopyFileUpload={docActions.handleBankCopyFileUpload}
          handleDirectBizCertUpload={docActions.handleDirectBizCertUpload}
          handleDirectContractUpload={docActions.handleDirectContractUpload}
          handleFormCheckNtsStatus={docActions.handleFormCheckNtsStatus}
          handlePartnerFormReRunOcr={docActions.handlePartnerFormReRunOcr}
          handleReRunBankOcr={docActions.handleReRunBankOcr}
          handleSavePartner={handleSavePartner}
          isBankCopyDragging={isBankCopyDragging}
          isDirectBizCertDragging={isDirectBizCertDragging}
          isDirectContractDragging={isDirectContractDragging}
          partnerForm={partnerForm}
          partnerModalMode={partnerModalMode}
          setActiveDocument={setActiveDocument}
          setDirectBizCertSuggestion={docActions.setDirectBizCertSuggestion}
          setIsBankCopyDragging={setIsBankCopyDragging}
          setIsDirectBizCertDragging={setIsDirectBizCertDragging}
          setIsDirectContractDragging={setIsDirectContractDragging}
          setPartnerForm={setPartnerForm}
          setShowPartnerModal={setShowPartnerModal}
        />
      )}

      {/* 2. Modal: 사업자등록증 OCR 간편등록 모달 */}
      {showBizCertOcrModal && (
        <BizCertOcrModal
          certFileInputRef={certFileInputRef}
          handleApplyOcrToForm={docActions.handleApplyOcrToForm}
          handleBizCertFileUpload={docActions.handleBizCertFileUpload}
          handleCertDragLeave={docActions.handleCertDragLeave}
          handleCertDragOver={docActions.handleCertDragOver}
          handleCertDrop={docActions.handleCertDrop}
          isCertDragging={docActions.isCertDragging}
          ocrFileName={docActions.ocrFileName}
          ocrLoading={docActions.ocrLoading}
          ocrNtsStatus={docActions.ocrNtsStatus}
          ocrPreviewThumbUrl={docActions.ocrPreviewThumbUrl}
          ocrResult={docActions.ocrResult}
          setOcrResult={docActions.setOcrResult}
          setShowBizCertOcrModal={setShowBizCertOcrModal}
          setZoomImageUrl={setZoomImageUrl}
        />
      )}

      {/* 2-2. Modal: 통장사본 OCR 간편등록 모달 */}
      {showBankOcrModal && (
        <BankCopyOcrModal
          bankOcrFileName={docActions.bankOcrFileName}
          bankOcrLoading={docActions.bankOcrLoading}
          bankOcrModalFileInputRef={bankOcrModalFileInputRef}
          bankOcrPreviewUrl={docActions.bankOcrPreviewUrl}
          bankOcrResult={docActions.bankOcrResult}
          handleApplyBankOcrToForm={docActions.handleApplyBankOcrToForm}
          handleBankModalFileUpload={docActions.handleBankModalFileUpload}
          handleBankOcrDragLeave={docActions.handleBankOcrDragLeave}
          handleBankOcrDragOver={docActions.handleBankOcrDragOver}
          handleBankOcrDrop={docActions.handleBankOcrDrop}
          isBankOcrModalDragging={docActions.isBankOcrModalDragging}
          setActiveDocument={setActiveDocument}
          setBankOcrResult={docActions.setBankOcrResult}
          setShowBankOcrModal={setShowBankOcrModal}
        />
      )}

      {/* 3. Modal: 거래처 담당자 및 실물 명함 등록 모달 */}
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

      {/* 4. Modal: 국세청 휴·폐업 일괄조회 및 거래불가 연동 */}
      {showBizStatusBatchModal && (
        <BizStatusBatchModal
          batchAutoBlock={docActions.batchAutoBlock}
          batchLoading={docActions.batchLoading}
          batchResult={docActions.batchResult}
          batchScope={docActions.batchScope}
          handleRunBatchBizStatusCheck={docActions.handleRunBatchBizStatusCheck}
          handleRunSingleNtsCheck={docActions.handleRunSingleNtsCheck}
          ntsSort={ntsSort}
          partners={partners}
          setBatchAutoBlock={docActions.setBatchAutoBlock}
          setBatchResult={docActions.setBatchResult}
          setBatchScope={docActions.setBatchScope}
          setSelectedPartner={setSelectedPartner}
          setShowBizStatusBatchModal={setShowBizStatusBatchModal}
          singleNtsCheckingId={docActions.singleNtsCheckingId}
          sortedPartners={sortedPartners}
        />
      )}

      {/* 5. Modal: 통합 문서 뷰어 & 원본 대조 거래처 수정 스튜디오 */}
      {(activeDocument || zoomImageUrl) && (
        <PartnerDocViewerModal
          activeDocument={activeDocument}
          handleViewerFileReplace={docActions.handleViewerFileReplace}
          handleViewerNtsCheck={docActions.handleViewerNtsCheck}
          handleViewerReRunOcr={docActions.handleViewerReRunOcr}
          handleViewerSavePartner={docActions.handleViewerSavePartner}
          isViewerDragging={docActions.isViewerDragging}
          resolvedPdfBlobUrl={docActions.resolvedPdfBlobUrl}
          selectedPartner={selectedPartner}
          setActiveDocument={setActiveDocument}
          setIsViewerDragging={docActions.setIsViewerDragging}
          setViewerForm={docActions.setViewerForm}
          setViewerRotation={docActions.setViewerRotation}
          setViewerZoom={docActions.setViewerZoom}
          setZoomImageUrl={setZoomImageUrl}
          viewerForm={docActions.viewerForm}
          viewerNtsLoading={docActions.viewerNtsLoading}
          viewerOcrLoading={docActions.viewerOcrLoading}
          viewerReplaceFileInputRef={viewerReplaceFileInputRef}
          viewerRotation={docActions.viewerRotation}
          viewerSaving={docActions.viewerSaving}
          viewerZoom={docActions.viewerZoom}
          zoomImageUrl={zoomImageUrl}
        />
      )}
    </div>
  );
};
