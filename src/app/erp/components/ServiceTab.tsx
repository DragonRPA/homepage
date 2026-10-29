"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Briefcase, Plus, RefreshCw, FileText, CheckCircle2, 
  Layers, Search, DollarSign, Calendar, X,
  ArrowUpDown, ArrowUp, ArrowDown, Building2, FileUp, Eye, Download,
  Edit, Trash2, AlertCircle
} from "lucide-react";
import { formatErpNumber, formatErpCurrency, formatErpQty, sortErpItems, SortDirection } from "@/lib/erpFormat";

interface ServiceTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onNavigateToTax?: () => void;
}

export const ServiceTab: React.FC<ServiceTabProps> = ({ currentUser, selectedEntity = "ALL", onNavigateToTax }) => {
  const [activeType, setActiveType] = useState<"OPERATIONAL" | "DEVELOPMENT">("OPERATIONAL");
  const [loading, setLoading] = useState(false);

  // Data States
  const [contracts, setContracts] = useState<any[]>([]);
  const [billings, setBillings] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);

  // Modals
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showEditContractModal, setShowEditContractModal] = useState(false);
  const [showAddBillingModal, setShowAddBillingModal] = useState(false);
  const [activeDocViewer, setActiveDocViewer] = useState<{ title: string; customerName: string; url: string; fileName: string } | null>(null);
  const contractFileCacheRef = useRef<Record<number, { url: string; fileName: string }>>({});

  // Contract Form (Add)
  const [ctEntityType, setCtEntityType] = useState<"CORP" | "INDIVIDUAL">(
    selectedEntity === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP"
  );

  useEffect(() => {
    if (selectedEntity === "INDIVIDUAL") setCtEntityType("INDIVIDUAL");
    else if (selectedEntity === "CORP") setCtEntityType("CORP");
  }, [selectedEntity]);

  const [ctPartnerId, setCtPartnerId] = useState<number | null>(null);
  const [ctCustomer, setCtCustomer] = useState("");
  const [ctCustomerSearch, setCtCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [ctProject, setCtProject] = useState("");
  const [ctAmount, setCtAmount] = useState("10000000");
  const [ctMonthlyFee, setCtMonthlyFee] = useState("1000000");
  const [ctStart, setCtStart] = useState(new Date().toISOString().split("T")[0]);
  const [ctEnd, setCtEnd] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [ctBillingDay, setCtBillingDay] = useState("25");
  const [ctMemo, setCtMemo] = useState("");
  const [ctFileUrl, setCtFileUrl] = useState("");
  const [ctFileName, setCtFileName] = useState("");
  const [isCtFileDragging, setIsCtFileDragging] = useState(false);
  const ctFileInputRef = useRef<HTMLInputElement>(null);

  // Contract Form (Edit)
  const [editCtId, setEditCtId] = useState<number | null>(null);
  const [editCtContractNo, setEditCtContractNo] = useState("");
  const [editCtEntityType, setEditCtEntityType] = useState<"CORP" | "INDIVIDUAL">("CORP");
  const [editCtPartnerId, setEditCtPartnerId] = useState<number | null>(null);
  const [editCtCustomer, setEditCtCustomer] = useState("");
  const [editCtProject, setEditCtProject] = useState("");
  const [editCtAmount, setEditCtAmount] = useState("0");
  const [editCtMonthlyFee, setEditCtMonthlyFee] = useState("0");
  const [editCtStart, setEditCtStart] = useState("");
  const [editCtEnd, setEditCtEnd] = useState("");
  const [editCtBillingDay, setEditCtBillingDay] = useState("25");
  const [editCtStatus, setEditCtStatus] = useState("ACTIVE");
  const [editCtMemo, setEditCtMemo] = useState("");
  const [editCtFileUrl, setEditCtFileUrl] = useState("");
  const [editCtFileName, setEditCtFileName] = useState("");
  const [isEditFileDragging, setIsEditFileDragging] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Billing Form
  const [blContractId, setBlContractId] = useState("");
  const [blMilestoneName, setBlMilestoneName] = useState("");
  const [blSupplyAmount, setBlSupplyAmount] = useState("1000000");
  const [blDate, setBlDate] = useState(new Date().toISOString().split("T")[0]);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sorting State
  const [sortKey, setSortKey] = useState<string>("id");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const renderSortTh = (label: string, key: string, align: "left" | "right" | "center" = "left") => {
    const isActive = sortKey === key;
    return (
      <th
        onClick={() => handleSort(key)}
        className={`py-2 px-2.5 cursor-pointer select-none hover:bg-[#d0c6b4] transition text-${align} whitespace-nowrap ${isActive ? "text-blue-800 font-bold" : "text-[#44403c]"}`}
        title={`${label} 기준 정렬`}
      >
        <div className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start"}`}>
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-800" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-800" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const sortedContracts = useMemo(() => sortErpItems(contracts, sortKey, sortDir), [contracts, sortKey, sortDir]);
  const sortedBillings = useMemo(() => sortErpItems(billings, sortKey, sortDir), [billings, sortKey, sortDir]);

  const filteredPartners = useMemo(() => {
    const q = ctCustomerSearch.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) => {
      const hay = [p.name, p.businessNo, p.ceoName, p.partnerCode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [partners, ctCustomerSearch]);

  // Fetch Partners for Auto-complete
  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/erp/partners?type=CUSTOMER");
      const data = await res.json();
      if (data.success) {
        setPartners(data.partners || []);
      }
    } catch (e) {
      console.warn("고객사 목록 로드 실패:", e);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleSelectPartner = (p: any) => {
    setCtPartnerId(p.id);
    setCtCustomer(p.name);
    setCtCustomerSearch(p.name);
    setShowCustomerDropdown(false);
  };

  const handleContractFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || "";
      setCtFileUrl(dataUrl);
      setCtFileName(file.name);
      showToast(`계약서 파일(${file.name})이 첨부되었습니다.`);
    };
    reader.onerror = () => showToast("계약서 파일 읽기 실패", "error");
    reader.readAsDataURL(file);
  };

  const handleEditFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || "";
      setEditCtFileUrl(dataUrl);
      setEditCtFileName(file.name);
      showToast(`새 계약서 파일(${file.name})이 첨부되었습니다.`);
    };
    reader.onerror = () => showToast("계약서 파일 읽기 실패", "error");
    reader.readAsDataURL(file);
  };

  const handleOpenContractFile = async (c: any) => {
    const cached = contractFileCacheRef.current[c.id];
    if (cached) {
      setActiveDocViewer({
        title: `${c.contractNo} 계약서 원본`,
        customerName: c.customerName,
        url: cached.url,
        fileName: cached.fileName,
      });
      return;
    }
    try {
      const res = await fetch(`/api/erp/services/contracts?id=${c.id}`);
      const data = await res.json();
      if (data.success && data.contract?.contractFileUrl) {
        const entry = {
          url: data.contract.contractFileUrl,
          fileName: data.contract.contractFileName || `${c.contractNo}_계약서`,
        };
        contractFileCacheRef.current[c.id] = entry;
        setActiveDocViewer({
          title: `${c.contractNo} 계약서 원본`,
          customerName: c.customerName,
          url: entry.url,
          fileName: entry.fileName,
        });
      } else {
        showToast("등록된 계약서 파일을 찾을 수 없습니다.", "error");
      }
    } catch (e) {
      showToast("계약서 파일 조회 실패", "error");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const contractsUrl = selectedEntity && selectedEntity !== "ALL"
        ? `/api/erp/services/contracts?serviceType=${activeType}&entityType=${selectedEntity}`
        : `/api/erp/services/contracts?serviceType=${activeType}`;

      const [cRes, bRes] = await Promise.all([
        fetch(contractsUrl),
        fetch(`/api/erp/services/billings?serviceType=${activeType}`)
      ]);
      const cData = await cRes.json();
      const bData = await bRes.json();

      if (cData.success) setContracts(cData.contracts || []);
      if (bData.success) setBillings(bData.billings || []);
    } catch (err: any) {
      console.error(err);
      showToast("데이터 로드 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeType, selectedEntity]);

  // Handle Add Contract
  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctCustomer || !ctProject || !ctStart || !ctEnd) {
      showToast("고객사, 프로젝트명, 계약 기간은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/services/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: ctEntityType,
          serviceType: activeType,
          partnerId: ctPartnerId,
          customerName: ctCustomer,
          projectName: ctProject,
          contractAmount: ctAmount,
          monthlyFee: ctMonthlyFee,
          startDate: ctStart,
          endDate: ctEnd,
          billingDay: ctBillingDay,
          memo: ctMemo,
          contractFileUrl: ctFileUrl || null,
          contractFileName: ctFileName || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "계약 등록 실패");

      showToast(`[${activeType === "OPERATIONAL" ? "운영용역" : "개발용역"}] 계약 등록 완료`);
      setShowAddContractModal(false);
      setCtPartnerId(null);
      setCtCustomer("");
      setCtCustomerSearch("");
      setCtProject("");
      setCtMemo("");
      setCtFileUrl("");
      setCtFileName("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Open Edit Contract Modal
  const handleOpenEditContract = (c: any) => {
    setEditCtId(c.id);
    setEditCtContractNo(c.contractNo);
    setEditCtEntityType(c.entityType || "CORP");
    setEditCtPartnerId(c.partnerId || null);
    setEditCtCustomer(c.customerName);
    setEditCtProject(c.projectName);
    setEditCtAmount(String(c.contractAmount || "0"));
    setEditCtMonthlyFee(String(c.monthlyFee || "0"));
    setEditCtStart(c.startDate ? String(c.startDate).slice(0, 10) : "");
    setEditCtEnd(c.endDate ? String(c.endDate).slice(0, 10) : "");
    setEditCtBillingDay(String(c.billingDay || "25"));
    setEditCtStatus(c.status || "ACTIVE");
    setEditCtMemo(c.memo || "");
    setEditCtFileUrl("");
    setEditCtFileName(c.contractFileName || "");
    setShowEditContractModal(true);
  };

  // Handle Update Contract
  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCtId) return;
    if (!editCtCustomer || !editCtProject || !editCtStart || !editCtEnd) {
      showToast("고객사, 프로젝트명, 계약 기간은 필수입니다.", "error");
      return;
    }

    try {
      const res = await fetch("/api/erp/services/contracts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editCtId,
          serviceType: activeType,
          entityType: editCtEntityType,
          partnerId: editCtPartnerId,
          customerName: editCtCustomer,
          projectName: editCtProject,
          contractAmount: editCtAmount,
          monthlyFee: editCtMonthlyFee,
          startDate: editCtStart,
          endDate: editCtEnd,
          billingDay: editCtBillingDay,
          status: editCtStatus,
          memo: editCtMemo,
          contractFileUrl: editCtFileUrl || undefined,
          contractFileName: editCtFileName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "계약 수정 실패");

      showToast(`계약 [${editCtContractNo}] 수정 완료`);
      setShowEditContractModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Contract
  const handleDeleteContract = async (c: any) => {
    if (!window.confirm(
      `[계약 삭제 확인]\n계약번호: ${c.contractNo}\n고객사: ${c.customerName}\n프로젝트: ${c.projectName}\n\n해당 계약과 연계된 미발행 청구 내역이 함께 삭제됩니다.\n정말 삭제하시겠습니까?`
    )) {
      return;
    }

    try {
      const res = await fetch(`/api/erp/services/contracts?id=${c.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "계약 삭제 실패");

      showToast(data.message || `계약 [${c.contractNo}] 삭제 완료`);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Add Billing
  const handleAddBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blContractId || !blSupplyAmount) {
      showToast("계약과 공급가액은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/services/billings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: blContractId,
          billingType: activeType === "OPERATIONAL" ? "MONTHLY_RETAINER" : "MILESTONE",
          milestoneName: blMilestoneName || (activeType === "OPERATIONAL" ? "정기 용역료" : "중도금"),
          billingDate: blDate,
          supplyAmount: blSupplyAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "청구 등록 실패");

      showToast(`용역 청구 등록 완료`);
      setShowAddBillingModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Delete Billing
  const handleDeleteBilling = async (b: any) => {
    if (!window.confirm(`청구번호 [${b.billingNo}] (${b.customerName} ₩${formatErpCurrency(b.totalAmount)})\n해당 청구 내역을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/erp/services/billings?id=${b.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "청구 삭제 실패");

      showToast(data.message || "청구 내역이 삭제되었습니다.");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-[#f4efe4] text-[#1c1917] overflow-hidden select-none">
      {toast && (
        <div className={`fixed top-16 right-5 z-50 px-4 py-2 rounded text-xs font-bold text-white shadow-xl ${
          toast.type === "error" ? "bg-rose-700" : "bg-emerald-700"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-[#b5a894] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveType("OPERATIONAL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition border ${
              activeType === "OPERATIONAL"
                ? "bg-blue-700 text-white border-blue-900 shadow-sm"
                : "bg-[#ebe5d8] border-[#b5a894] text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>운영용역 (월 정기 유지보수)</span>
          </button>
          <button
            onClick={() => setActiveType("DEVELOPMENT")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition border ${
              activeType === "DEVELOPMENT"
                ? "bg-purple-700 text-white border-purple-900 shadow-sm"
                : "bg-[#ebe5d8] border-[#b5a894] text-[#78716c] hover:text-[#1c1917]"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>개발용역 (SI 프로젝트 / 마일스톤)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddBillingModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-900 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeType === "OPERATIONAL" ? "정기 청구 생성" : "기성금 청구 생성"}</span>
          </button>
          <button
            onClick={() => setShowAddContractModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white border border-blue-900 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>신규 계약 체결</span>
          </button>
          <button
            onClick={fetchData}
            className="p-1.5 rounded border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Contracts | Right Billings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 overflow-hidden">
        {/* Left: Contracts Ledger */}
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden shadow-sm">
          <div className="px-3 py-2 border-b border-[#b5a894] bg-[#dfd7c7] text-xs font-bold text-[#57534e] flex items-center justify-between">
            <span>체결 계약 대장 ({contracts.length}건)</span>
            <span className="text-[11px] text-[#78716c]">
              총 계약고: {formatErpCurrency(contracts.reduce((s, c) => s + Number(c.contractAmount || 0), 0))}
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead className="bg-[#ded6c5] text-[#44403c] sticky top-0 border-b border-[#b5a894] font-bold select-none z-10">
                <tr>
                  <th className="py-2 px-2.5 text-center sticky left-0 bg-[#ded6c5] z-20 border-r border-[#b5a894]">관리</th>
                  {renderSortTh("귀속", "entityType")}
                  {renderSortTh("계약번호", "contractNo")}
                  {renderSortTh("고객사", "customerName")}
                  {renderSortTh("용역/프로젝트명", "projectName")}
                  {renderSortTh(activeType === "OPERATIONAL" ? "월 용역료" : "총 계약금", activeType === "OPERATIONAL" ? "monthlyFee" : "contractAmount", "right")}
                  {renderSortTh("계약기간", "startDate")}
                  <th className="py-2 px-2.5 text-center">계약서</th>
                  {renderSortTh("상태", "status", "center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b5a894]">
                {sortedContracts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#78716c]">
                      등록된 용역 계약이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedContracts.map((c) => (
                    <tr key={c.id} className="hover:bg-[#dfd7c7] transition">
                      <td className="py-2 px-2.5 text-center border-r border-[#b5a894] sticky left-0 bg-[#ebe5d8] z-10 shadow-sm">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditContract(c)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-400 inline-flex items-center gap-1 transition"
                            title="계약 정보 수정"
                          >
                            <Edit className="w-3 h-3" />
                            <span>수정</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContract(c)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-400 inline-flex items-center gap-1 transition"
                            title="계약 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>삭제</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894]">
                        {c.entityType === "INDIVIDUAL" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            개인
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            법인
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] font-mono text-blue-800 font-bold">{c.contractNo}</td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] font-bold text-[#1c1917]">{c.customerName}</td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-[#1c1917]">{c.projectName}</td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-right font-mono font-bold text-[#1c1917]">
                        {formatErpCurrency(activeType === "OPERATIONAL" ? c.monthlyFee : c.contractAmount)}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] font-mono text-[#78716c] text-[11px]">
                        {c.startDate ? String(c.startDate).slice(0, 10) : "-"} ~ {c.endDate ? String(c.endDate).slice(0, 10) : "-"}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-center">
                        {c.hasContractFile ? (
                          <button
                            type="button"
                            onClick={() => handleOpenContractFile(c)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f5f3ff] hover:bg-[#ede9fe] text-[#6d28d9] border border-[#ddd6fe] inline-flex items-center gap-1 transition"
                            title={c.contractFileName || "계약서 열람"}
                          >
                            <FileText className="w-3 h-3" />
                            <span>열람</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#78716c]">-</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-[#ded6c5] text-[#78716c]"
                        }`}>
                          {c.status === "ACTIVE" ? "진행중" : "종결"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Billings Ledger */}
        <div className="bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden shadow-sm">
          <div className="px-3 py-2 border-b border-[#b5a894] bg-[#dfd7c7] text-xs font-bold text-[#57534e] flex items-center justify-between">
            <span>청구 및 수납 내역 ({billings.length}건)</span>
            <span className="text-[11px] text-[#78716c]">
              총 청구액: {formatErpCurrency(billings.reduce((s, b) => s + Number(b.totalAmount || 0), 0))}
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead className="bg-[#ded6c5] text-[#44403c] sticky top-0 border-b border-[#b5a894] font-bold select-none z-10">
                <tr>
                  <th className="py-2 px-2.5 text-center sticky left-0 bg-[#ded6c5] z-20 border-r border-[#b5a894]">관리</th>
                  {renderSortTh("청구번호", "billingNo")}
                  {renderSortTh("고객사 / 용역명", "customerName")}
                  {renderSortTh("구분 / 마일스톤", "milestoneName")}
                  {renderSortTh("공급가액", "supplyAmount", "right")}
                  {renderSortTh("총 청구액", "totalAmount", "right")}
                  <th className="py-2 px-2.5 text-center">세금계산서</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b5a894]">
                {sortedBillings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#78716c]">
                      생성된 청구 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedBillings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#dfd7c7] transition">
                      <td className="py-2 px-2.5 text-center border-r border-[#b5a894] sticky left-0 bg-[#ebe5d8] z-10 shadow-sm">
                        {!b.taxInvoiceId ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteBilling(b)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-400 inline-flex items-center gap-1 transition"
                            title="청구 내역 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>삭제</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#78716c] font-mono">발행확정</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] font-mono text-[#78716c]">{b.billingNo}</td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] font-bold text-[#1c1917]">
                        <div>{b.customerName}</div>
                        <div className="text-[10px] text-[#78716c] font-normal">{b.projectName}</div>
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-[#1c1917]">{b.milestoneName}</td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-right font-mono font-bold text-[#1c1917]">
                        {formatErpCurrency(b.supplyAmount)}
                      </td>
                      <td className="py-2 px-2.5 border-r border-[#b5a894] text-right font-mono font-bold text-blue-900">
                        {formatErpCurrency(b.totalAmount)}
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        {b.taxInvoiceId ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            발행완료 ({b.taxInvoiceNo})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            미발행 (세금계산서 탭에서 일괄발행)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer Summary Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#dfd7c7] border border-[#b5a894] rounded text-xs text-[#57534e]">
        <div className="flex items-center gap-4">
          <span>{activeType === "OPERATIONAL" ? "운영용역" : "개발용역"} 계약: <strong>{contracts.length}건</strong></span>
          <span>누적 청구건수: <strong>{billings.length}건</strong></span>
          <span>총 청구 공급가액: <strong>{formatErpCurrency(billings.reduce((s, b) => s + Number(b.supplyAmount || 0), 0))}</strong></span>
        </div>
        <div className="text-[11px] text-[#78716c]">
          * 계약 및 청구 생성 ➔ 전자세금계산서 1-Way 자동 발행 파이프라인
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: ADD CONTRACT                                          */}
      {/* ============================================================== */}
      {showAddContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-lg w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">
                  신규 {activeType === "OPERATIONAL" ? "운영용역" : "개발용역"} 계약 등록
                </h3>
              </div>
              <button onClick={() => setShowAddContractModal(false)} className="text-[#78716c] hover:text-[#1c1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContract} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">계약 귀속 사업자</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCtEntityType("CORP")}
                    className={`p-2 rounded border text-left font-bold transition ${
                      ctEntityType === "CORP"
                        ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                        : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                    }`}
                  >
                    <div>(주)드래곤알피에이 [법인]</div>
                    <div className="text-[10px] font-normal font-mono opacity-80">806-88-03266</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCtEntityType("INDIVIDUAL")}
                    className={`p-2 rounded border text-left font-bold transition ${
                      ctEntityType === "INDIVIDUAL"
                        ? "border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500"
                        : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                    }`}
                  >
                    <div>드래곤알피에이 [개인]</div>
                    <div className="text-[10px] font-normal font-mono opacity-80">295-03-02683</div>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1 relative">
                <label className="font-bold text-[#78716c]">고객사 (매출처 상호명) *</label>
                <input
                  type="text"
                  value={ctCustomerSearch || ctCustomer}
                  onChange={(e) => {
                    setCtCustomerSearch(e.target.value);
                    setCtCustomer(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="거래처명 검색 또는 직접 입력"
                  required
                  className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                />
                {showCustomerDropdown && partners.length > 0 && (
                  <div className="absolute top-14 left-0 right-0 max-h-40 overflow-auto bg-[#ebe5d8] border border-[#b5a894] rounded shadow-lg z-20">
                    {filteredPartners.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPartner(p)}
                        className="p-2 hover:bg-[#dfd7c7] cursor-pointer border-b border-[#ded6c5] last:border-none flex justify-between"
                      >
                        <span className="font-bold">{p.name}</span>
                        <span className="text-[#78716c] font-mono">{p.businessNo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">용역 / 프로젝트명 *</label>
                <input
                  type="text"
                  value={ctProject}
                  onChange={(e) => setCtProject(e.target.value)}
                  placeholder="예: RPA 봇 고도화 구축 또는 정기 유지보수"
                  required
                  className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {activeType === "OPERATIONAL" ? (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#78716c]">월 정기 용역료 (공급가액)</label>
                    <input
                      type="number"
                      value={ctMonthlyFee}
                      onChange={(e) => setCtMonthlyFee(e.target.value)}
                      required
                      className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right font-bold"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#78716c]">총 수주 계약금 (공급가액)</label>
                    <input
                      type="number"
                      value={ctAmount}
                      onChange={(e) => setCtAmount(e.target.value)}
                      required
                      className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right font-bold"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">정기 청구일 (매월)</label>
                  <select
                    value={ctBillingDay}
                    onChange={(e) => setCtBillingDay(e.target.value)}
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  >
                    <option value="5">매월 5일</option>
                    <option value="10">매월 10일</option>
                    <option value="15">매월 15일</option>
                    <option value="20">매월 20일</option>
                    <option value="25">매월 25일</option>
                    <option value="31">매월 말일</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 시작일 *</label>
                  <input
                    type="date"
                    value={ctStart}
                    onChange={(e) => setCtStart(e.target.value)}
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 종료일 *</label>
                  <input
                    type="date"
                    value={ctEnd}
                    onChange={(e) => setCtEnd(e.target.value)}
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">비고 / 특이사항</label>
                <input
                  type="text"
                  value={ctMemo}
                  onChange={(e) => setCtMemo(e.target.value)}
                  placeholder="특약 또는 메모"
                  className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#b5a894] mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddContractModal(false)}
                  className="h-8 px-3 rounded font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-sm"
                >
                  계약 체결 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT CONTRACT                                         */}
      {/* ============================================================== */}
      {showEditContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-lg w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] mb-4">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">
                  용역 계약 정보 수정 [{editCtContractNo}]
                </h3>
              </div>
              <button onClick={() => setShowEditContractModal(false)} className="text-[#78716c] hover:text-[#1c1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateContract} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">계약 귀속 사업자</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCtEntityType("CORP")}
                    className={`p-2 rounded border text-left font-bold transition ${
                      editCtEntityType === "CORP"
                        ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                        : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                    }`}
                  >
                    <div>(주)드래곤알피에이 [법인]</div>
                    <div className="text-[10px] font-normal font-mono opacity-80">806-88-03266</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCtEntityType("INDIVIDUAL")}
                    className={`p-2 rounded border text-left font-bold transition ${
                      editCtEntityType === "INDIVIDUAL"
                        ? "border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500"
                        : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                    }`}
                  >
                    <div>드래곤알피에이 [개인]</div>
                    <div className="text-[10px] font-normal font-mono opacity-80">295-03-02683</div>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">고객사 (상호명) *</label>
                <input
                  type="text"
                  value={editCtCustomer}
                  onChange={(e) => setEditCtCustomer(e.target.value)}
                  required
                  className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">용역 / 프로젝트명 *</label>
                <input
                  type="text"
                  value={editCtProject}
                  onChange={(e) => setEditCtProject(e.target.value)}
                  required
                  className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {activeType === "OPERATIONAL" ? (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#78716c]">월 정기 용역료</label>
                    <input
                      type="number"
                      value={editCtMonthlyFee}
                      onChange={(e) => setEditCtMonthlyFee(e.target.value)}
                      required
                      className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right font-bold"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#78716c]">총 계약금</label>
                    <input
                      type="number"
                      value={editCtAmount}
                      onChange={(e) => setEditCtAmount(e.target.value)}
                      required
                      className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right font-bold"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">정기 청구일 (매월)</label>
                  <select
                    value={editCtBillingDay}
                    onChange={(e) => setEditCtBillingDay(e.target.value)}
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  >
                    <option value="5">매월 5일</option>
                    <option value="10">매월 10일</option>
                    <option value="15">매월 15일</option>
                    <option value="20">매월 20일</option>
                    <option value="25">매월 25일</option>
                    <option value="31">매월 말일</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 시작일 *</label>
                  <input
                    type="date"
                    value={editCtStart}
                    onChange={(e) => setEditCtStart(e.target.value)}
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 종료일 *</label>
                  <input
                    type="date"
                    value={editCtEnd}
                    onChange={(e) => setEditCtEnd(e.target.value)}
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">계약 상태</label>
                  <select
                    value={editCtStatus}
                    onChange={(e) => setEditCtStatus(e.target.value)}
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  >
                    <option value="ACTIVE">진행중 (ACTIVE)</option>
                    <option value="TERMINATED">중도해지 (TERMINATED)</option>
                    <option value="COMPLETED">정상종결 (COMPLETED)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">비고</label>
                  <input
                    type="text"
                    value={editCtMemo}
                    onChange={(e) => setEditCtMemo(e.target.value)}
                    placeholder="특약 메모"
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#b5a894] mt-2">
                <button
                  type="button"
                  onClick={() => setShowEditContractModal(false)}
                  className="h-8 px-3 rounded font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-sm"
                >
                  수정 내용 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ADD BILLING                                           */}
      {/* ============================================================== */}
      {showAddBillingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">
                  {activeType === "OPERATIONAL" ? "정기 용역료 청구 생성" : "기성금 청구 생성"}
                </h3>
              </div>
              <button onClick={() => setShowAddBillingModal(false)} className="text-[#78716c] hover:text-[#1c1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBilling} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">대상 체결 계약 선택 *</label>
                <select
                  value={blContractId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setBlContractId(cid);
                    const ct = contracts.find((c) => String(c.id) === cid);
                    if (ct) {
                      if (activeType === "OPERATIONAL") {
                        setBlSupplyAmount(String(ct.monthlyFee || "1000000"));
                      }
                    }
                  }}
                  required
                  className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                >
                  <option value="">-- 계약을 선택하세요 --</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.contractNo}] {c.customerName} - {c.projectName} ({activeType === "OPERATIONAL" ? `월 ₩${formatErpCurrency(c.monthlyFee)}` : `총 ₩${formatErpCurrency(c.contractAmount)}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">청구 구분 / 회차명 *</label>
                <input
                  type="text"
                  value={blMilestoneName}
                  onChange={(e) => setBlMilestoneName(e.target.value)}
                  placeholder={activeType === "OPERATIONAL" ? "예: 2026-10월 정기 유지보수료" : "예: 1차 착수금 (30%)"}
                  required
                  className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">청구일자 *</label>
                  <input
                    type="date"
                    value={blDate}
                    onChange={(e) => setBlDate(e.target.value)}
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">공급가액 *</label>
                  <input
                    type="number"
                    value={blSupplyAmount}
                    onChange={(e) => setBlSupplyAmount(e.target.value)}
                    required
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-right font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[11px]">
                <span className="text-[#78716c]">부가세(10%): ₩{formatErpCurrency(Math.round(parseFloat(blSupplyAmount || "0") * 0.1))}</span>
                <span className="font-bold text-blue-900">
                  합계: ₩{formatErpCurrency(Math.round(parseFloat(blSupplyAmount || "0") * 1.1))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#b5a894] mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBillingModal(false)}
                  className="h-8 px-3 rounded font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm"
                >
                  청구 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: DOCUMENT VIEWER                                       */}
      {/* ============================================================== */}
      {activeDocViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-3xl w-full h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#b5a894] bg-[#dfd7c7]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">{activeDocViewer.title}</h3>
                <span className="text-xs text-[#78716c]">({activeDocViewer.customerName})</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeDocViewer.url}
                  download={activeDocViewer.fileName}
                  className="px-2 py-1 rounded text-xs font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd] inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>다운로드</span>
                </a>
                <button onClick={() => setActiveDocViewer(null)} className="text-[#78716c] hover:text-[#1c1917]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-2 bg-[#ded6c5] overflow-hidden">
              {activeDocViewer.url.startsWith("data:application/pdf") ? (
                <iframe src={activeDocViewer.url} className="w-full h-full rounded border border-[#b5a894]" title="PDF Viewer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center overflow-auto">
                  <img src={activeDocViewer.url} alt="Contract Doc" className="max-w-full max-h-full object-contain rounded border border-[#b5a894]" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
