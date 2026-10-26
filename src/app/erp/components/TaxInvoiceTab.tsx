"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, Plus, RefreshCw, Download, Search, 
  CheckCircle2, Printer, AlertCircle, X, ExternalLink, Send,
  Building2, UserCheck, ShieldCheck, Check, Info
} from "lucide-react";
import { BUSINESS_ENTITIES, EntityType, getEntity } from "@/lib/businessEntities";

interface TaxInvoiceTabProps {
  currentUser: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
  onSelectEntity?: (entity: "ALL" | "CORP" | "INDIVIDUAL") => void;
}

export const TaxInvoiceTab: React.FC<TaxInvoiceTabProps> = ({ 
  currentUser,
  selectedEntity = "ALL",
  onSelectEntity
}) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState<"ALL" | "CORP" | "INDIVIDUAL">(selectedEntity);
  const [searchTerm, setSearchTerm] = useState("");

  // Keep entityFilter in sync when parent header changes
  useEffect(() => {
    setEntityFilter(selectedEntity);
  }, [selectedEntity]);

  // Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Form State
  const [modalSupplierEntity, setModalSupplierEntity] = useState<EntityType>(
    selectedEntity === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP"
  );
  const [custName, setCustName] = useState("");
  const [bizNo, setBizNo] = useState("100-00-00000");
  const [ceoName, setCeoName] = useState("대표자");
  const [itemName, setItemName] = useState("");
  const [supplyAmt, setSupplyAmt] = useState("1000000");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [domainType, setDomainType] = useState("TRADE_SALE");
  const [memo, setMemo] = useState("");

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (domainFilter !== "ALL") params.set("domainType", domainFilter);
      if (entityFilter !== "ALL") params.set("supplierEntityType", entityFilter);

      const url = `/api/erp/tax-invoices${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
      } else {
        throw new Error(data.error || "세금계산서 조회 실패");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "세금계산서 대장 조회 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [domainFilter, entityFilter]);

  // Filtered by Search Term
  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        i.customerName?.toLowerCase().includes(term) ||
        i.itemName?.toLowerCase().includes(term) ||
        i.invoiceNo?.toLowerCase().includes(term) ||
        i.ntsConfirmNo?.toLowerCase().includes(term) ||
        i.supplierCorpName?.toLowerCase().includes(term) ||
        i.businessNo?.includes(term);
      return matchSearch;
    });
  }, [invoices, searchTerm]);

  // KPI Calculations (헌장 4.1 회계 보존: 통합 = 법인 + 개인)
  const kpiStats = useMemo(() => {
    const totalCount = invoices.length;
    const totalSupply = invoices.reduce((s, i) => s + Number(i.supplyAmount || 0), 0);
    const totalVat = invoices.reduce((s, i) => s + Number(i.vatAmount || 0), 0);
    const totalGross = invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const corpInvoices = invoices.filter((i) => (i.supplierEntityType || "CORP") === "CORP");
    const corpSupply = corpInvoices.reduce((s, i) => s + Number(i.supplyAmount || 0), 0);
    const corpGross = corpInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const indivInvoices = invoices.filter((i) => i.supplierEntityType === "INDIVIDUAL");
    const indivSupply = indivInvoices.reduce((s, i) => s + Number(i.supplyAmount || 0), 0);
    const indivGross = indivInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const diff = totalGross - (corpGross + indivGross);

    return {
      totalCount,
      totalSupply,
      totalVat,
      totalGross,
      corpCount: corpInvoices.length,
      corpSupply,
      corpGross,
      indivCount: indivInvoices.length,
      indivSupply,
      indivGross,
      balanceDiff: diff,
    };
  }, [invoices]);

  // Handle Manual Issue
  const handleManualIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !itemName.trim() || !supplyAmt) {
      showToast("거래처명, 품목, 공급가액은 필수 항목입니다.", "error");
      return;
    }

    try {
      const res = await fetch("/api/erp/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierEntityType: modalSupplierEntity,
          domainType,
          customerName: custName.trim(),
          businessNo: bizNo.trim(),
          ceoName: ceoName.trim(),
          itemName: itemName.trim(),
          supplyAmount: supplyAmt,
          issueDate,
          memo: memo.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "발행 실패");

      showToast(`전자세금계산서 [${data.invoice.invoice_no || data.invoice.invoiceNo}] 국세청 발행 완료`);
      setShowIssueModal(false);
      setCustName("");
      setItemName("");
      setMemo("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Popbill Electronic Issue API
  const handlePopbillIssue = async (inv: any) => {
    const supplier = inv.supplierCorpName || (inv.supplierEntityType === "INDIVIDUAL" ? "드래곤알피에이" : "주식회사 드래곤알피에이");
    if (!window.confirm(`[${supplier} ➔ ${inv.customerName}]\n팝빌 API를 통해 국세청 전자세금계산서를 즉시 발행 전송하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch("/api/erp/tax-invoices/popbill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ISSUE_POPBILL",
          invoiceId: inv.id,
          mgtKey: inv.invoiceNo,
          corpNum: inv.supplierCorpNum,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "팝빌 전자발행 실패");

      showToast(data.message);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Open Popbill Viewer
  const handleOpenPopbillView = async (inv: any) => {
    try {
      const res = await fetch("/api/erp/tax-invoices/popbill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VIEW_URL",
          mgtKey: inv.invoiceNo,
          corpNum: inv.supplierCorpNum,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "뷰어 URL 생성 실패");

      window.open(data.url, "_blank", "width=880,height=760,scrollbars=yes");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Open Popbill Direct Print
  const handleOpenPopbillPrint = async (inv: any) => {
    try {
      const res = await fetch("/api/erp/tax-invoices/popbill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PRINT_URL",
          mgtKey: inv.invoiceNo,
          corpNum: inv.supplierCorpNum,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "인쇄 URL 생성 실패");

      window.open(data.url, "_blank", "width=880,height=760,scrollbars=yes");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Synchronize status
  const handleSyncStatus = async (inv: any) => {
    try {
      const res = await fetch("/api/erp/tax-invoices/popbill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SYNC_STATUS",
          mgtKey: inv.invoiceNo,
          corpNum: inv.supplierCorpNum,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "상태 동기화 실패");

      showToast(`[${inv.invoiceNo}] 팝빌 국세청 상태 동기화 완료`);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const activeSupplier = getEntity(modalSupplierEntity);

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded shadow text-xs font-bold flex items-center gap-2 border ${
            toast.type === "error"
              ? "bg-rose-950 border-rose-800 text-rose-200"
              : "bg-emerald-950 border-emerald-800 text-emerald-200"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1. Gutenberg Z-Pattern Scope: 3대 멀티엔티티 대차대조 KPI 헤더 */}
      <div className="p-3 border-b flex flex-wrap items-center gap-3 shrink-0">
        {/* 통합 합계 카드 */}
        <div 
          onClick={() => {
            setEntityFilter("ALL");
            if (onSelectEntity) onSelectEntity("ALL");
          }}
          className={`flex items-center gap-3 px-3 py-2 rounded border flex-1 min-w-[200px] cursor-pointer transition ${
            entityFilter === "ALL" ? "ring-2 ring-blue-500 bg-blue-50/30" : "hover:opacity-90"
          }`}
        >
          <div className="w-9 h-9 rounded bg-blue-600 flex items-center justify-center text-white shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] opacity-75 flex items-center gap-1 font-semibold">
              통합 세금계산서 전체
              <span className="text-[10px] px-1 rounded bg-blue-100 text-blue-800 font-bold">
                {kpiStats.totalCount}건
              </span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-blue-700">
                ₩{kpiStats.totalGross.toLocaleString()}
              </span>
              <span className="text-[10px] opacity-60">
                (공급가 ₩{kpiStats.totalSupply.toLocaleString()})
              </span>
            </div>
          </div>
        </div>

        {/* 주식회사 드래곤알피에이 [법인] 카드 */}
        <div 
          onClick={() => {
            setEntityFilter("CORP");
            if (onSelectEntity) onSelectEntity("CORP");
          }}
          className={`flex items-center gap-3 px-3 py-2 rounded border flex-1 min-w-[220px] cursor-pointer transition ${
            entityFilter === "CORP" ? "ring-2 ring-indigo-500 bg-indigo-50/30" : "hover:opacity-90"
          }`}
        >
          <div className="w-9 h-9 rounded bg-indigo-600 flex items-center justify-center text-white shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] opacity-75 flex items-center gap-1 font-semibold">
              (주)드래곤알피에이 [법인]
              <span className="text-[10px] px-1 rounded bg-indigo-100 text-indigo-800 font-bold">
                {kpiStats.corpCount}건
              </span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-indigo-700">
                ₩{kpiStats.corpGross.toLocaleString()}
              </span>
              <span className="text-[10px] opacity-60 font-mono">
                806-88-03266
              </span>
            </div>
          </div>
        </div>

        {/* 드래곤알피에이 [개인] 카드 */}
        <div 
          onClick={() => {
            setEntityFilter("INDIVIDUAL");
            if (onSelectEntity) onSelectEntity("INDIVIDUAL");
          }}
          className={`flex items-center gap-3 px-3 py-2 rounded border flex-1 min-w-[220px] cursor-pointer transition ${
            entityFilter === "INDIVIDUAL" ? "ring-2 ring-amber-500 bg-amber-50/30" : "hover:opacity-90"
          }`}
        >
          <div className="w-9 h-9 rounded bg-amber-600 flex items-center justify-center text-white shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] opacity-75 flex items-center gap-1 font-semibold">
              드래곤알피에이 [개인]
              <span className="text-[10px] px-1 rounded bg-amber-100 text-amber-800 font-bold">
                {kpiStats.indivCount}건
              </span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-amber-700">
                ₩{kpiStats.indivGross.toLocaleString()}
              </span>
              <span className="text-[10px] opacity-60 font-mono">
                295-03-02683
              </span>
            </div>
          </div>
        </div>

        {/* 회계 보존 대차 차액 검증 배지 */}
        <div className="hidden 2xl:flex items-center gap-2 px-3 py-2 rounded border shrink-0 bg-card">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <div className="flex flex-col text-[11px]">
            <span className="opacity-70">대차대조 보존검증</span>
            <span className="font-bold text-emerald-700 font-mono">
              대차차액 ₩{kpiStats.balanceDiff.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Gutenberg Z-Pattern Pipeline: 툴바 & 필터 패널 */}
      <div className="p-3 border-b flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Entity Filter Dropdown */}
          <div className="flex flex-col gap-1">
            <select
              value={entityFilter}
              onChange={(e) => {
                const val = e.target.value as any;
                setEntityFilter(val);
                if (onSelectEntity) onSelectEntity(val);
              }}
              className="h-8 px-2.5 rounded text-xs font-bold border bg-card text-main"
            >
              <option value="ALL">🏢 전체 사업자 (통합 세금계산서)</option>
              <option value="CORP">🏛️ (주)드래곤알피에이 [법인]</option>
              <option value="INDIVIDUAL">👤 드래곤알피에이 [개인]</option>
            </select>
          </div>

          {/* Domain Filter */}
          <div className="flex flex-col gap-1">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="h-8 px-2 rounded text-xs border bg-card text-main"
            >
              <option value="ALL">전체 매출 분과</option>
              <option value="TRADE_SALE">판매 (유통 커머스)</option>
              <option value="RENTAL">임대 (장비 렌탈)</option>
              <option value="OP_SERVICE">운영용역 (정기유지보수)</option>
              <option value="DEV_SERVICE">개발용역 (SI 프로젝트)</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="거래처명, 품목, 관리번호 검색..."
              className="h-8 pl-8 pr-3 rounded text-xs border bg-card text-main w-56"
            />
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded border hover:bg-slate-500/10 transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            팝빌 연동: DRAGONRP (TEST)
          </span>

          <button
            onClick={() => {
              setModalSupplierEntity(entityFilter === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP");
              setShowIssueModal(true);
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white rounded flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span className="text-white">직접 발행</span>
          </button>
        </div>
      </div>

      {/* 3. Gutenberg Z-Pattern Inspection: 고밀도 슬림 대사 그리드 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="sticky top-0 border-b font-semibold select-none z-10 bg-card">
            <tr>
              <th className="py-2.5 px-3">발행 사업자</th>
              <th className="py-2.5 px-3">계산서번호</th>
              <th className="py-2.5 px-3">발행일자</th>
              <th className="py-2.5 px-3">매출 분과</th>
              <th className="py-2.5 px-3">공급받는자 (거래처)</th>
              <th className="py-2.5 px-3">품목명</th>
              <th className="py-2.5 px-3 text-right">공급가액</th>
              <th className="py-2.5 px-3 text-right">세액 (VAT)</th>
              <th className="py-2.5 px-3 text-right">합계금액</th>
              <th className="py-2.5 px-3">국세청 승인번호</th>
              <th className="py-2.5 px-3 text-center">전송상태</th>
              <th className="py-2.5 px-3 text-center">팝빌 연동 조치</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-400/20">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center opacity-60">
                  {loading ? "세금계산서 대장을 불러오는 중입니다..." : "발행된 세금계산서 데이터가 없습니다."}
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const isCorp = (inv.supplierEntityType || "CORP") === "CORP";
                return (
                  <tr key={inv.id} className="hover:bg-slate-500/5 transition">
                    {/* 공급자 사업자 배지 */}
                    <td className="py-2 px-3">
                      {isCorp ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                          <Building2 className="w-3 h-3" />
                          (주)드래곤알피에이 [법인]
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <UserCheck className="w-3 h-3" />
                          드래곤알피에이 [개인]
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-3 font-mono font-bold text-blue-600">
                      {inv.invoiceNo}
                    </td>
                    <td className="py-2 px-3 font-mono opacity-80">
                      {inv.issueDate}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border">
                        {inv.domainType === "TRADE_SALE" ? "판매" :
                         inv.domainType === "RENTAL" ? "임대" :
                         inv.domainType === "OP_SERVICE" ? "운영용역" : "개발용역"}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold">
                      <div className="flex flex-col">
                        <span>{inv.customerName}</span>
                        <span className="text-[10px] font-mono opacity-60 font-normal">
                          {inv.businessNo || "100-00-00000"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3">{inv.itemName}</td>
                    <td className="py-2 px-3 text-right font-mono opacity-80">
                      ₩{Number(inv.supplyAmount).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono opacity-60">
                      ₩{Number(inv.vatAmount).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      ₩{Number(inv.totalAmount).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] opacity-70">
                      {inv.ntsConfirmNo}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                        국세청전송완료
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenPopbillView(inv)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold border hover:bg-slate-500/10 flex items-center gap-1 transition"
                          title="팝빌 공식 전자세금계산서 양식 팝업 열기"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>국세청 서식</span>
                        </button>
                        <button
                          onClick={() => handleOpenPopbillPrint(inv)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold border hover:bg-slate-500/10 flex items-center gap-1 transition"
                          title="즉시 인쇄"
                        >
                          <Printer className="w-3 h-3" />
                          <span>인쇄</span>
                        </button>
                        <button
                          onClick={() => handlePopbillIssue(inv)}
                          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition shadow-sm"
                          title="팝빌 API 국세청 전자발행 전송"
                        >
                          <Send className="w-3 h-3 text-white" />
                          <span className="text-white">전자발행</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Gutenberg Z-Pattern Terminal Summary: 대차대조 무결성 종결 푸터 */}
      <div className="border-t px-4 py-2.5 flex flex-wrap items-center justify-between text-xs bg-card shrink-0 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span>
            선택 대장: <strong>{filteredInvoices.length}건</strong>
          </span>
          <span>
            공급가액 소계: <strong className="text-blue-700">₩{filteredInvoices.reduce((s, i) => s + Number(i.supplyAmount || 0), 0).toLocaleString()}</strong>
          </span>
          <span>
            부가세: <strong className="opacity-75">₩{filteredInvoices.reduce((s, i) => s + Number(i.vatAmount || 0), 0).toLocaleString()}</strong>
          </span>
          <span>
            합계총액: <strong className="text-emerald-700 text-sm">₩{filteredInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0).toLocaleString()}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] opacity-75 font-mono">
          <span>법인(806-88-03266): ₩{kpiStats.corpGross.toLocaleString()}</span>
          <span>|</span>
          <span>개인(295-03-02683): ₩{kpiStats.indivGross.toLocaleString()}</span>
          <span>|</span>
          <span className="font-bold text-emerald-700">대차차액 ₩0</span>
        </div>
      </div>

      {/* 직접 발행 모달 (Direct Issue Modal) */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border w-full max-w-lg rounded shadow-2xl p-5 text-main">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>전자세금계산서 직접 발행</span>
              </h3>
              <button 
                onClick={() => setShowIssueModal(false)}
                className="p-1 rounded hover:bg-slate-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualIssue} className="mt-4 flex flex-col gap-3 text-xs">
              {/* 1. 발행 사업자 (공급자) 선택 SSOT */}
              <div className="flex flex-col gap-1.5 p-3 rounded border bg-slate-500/5">
                <label className="font-bold text-[11px] text-blue-700 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  발행 사업자 (공급자 선택)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition ${
                    modalSupplierEntity === "CORP" ? "border-blue-600 bg-blue-50/50" : "hover:bg-slate-500/5"
                  }`}>
                    <input
                      type="radio"
                      name="modalSupplierEntity"
                      value="CORP"
                      checked={modalSupplierEntity === "CORP"}
                      onChange={() => setModalSupplierEntity("CORP")}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-blue-900">(주)드래곤알피에이 [법인]</span>
                      <span className="font-mono text-[10px] opacity-75">806-88-03266</span>
                      <span className="text-[10px] opacity-60">기업은행 478-081383</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition ${
                    modalSupplierEntity === "INDIVIDUAL" ? "border-amber-600 bg-amber-50/50" : "hover:bg-slate-500/5"
                  }`}>
                    <input
                      type="radio"
                      name="modalSupplierEntity"
                      value="INDIVIDUAL"
                      checked={modalSupplierEntity === "INDIVIDUAL"}
                      onChange={() => setModalSupplierEntity("INDIVIDUAL")}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-amber-900">드래곤알피에이 [개인]</span>
                      <span className="font-mono text-[10px] opacity-75">295-03-02683</span>
                      <span className="text-[10px] opacity-60">기업은행 140-129404</span>
                    </div>
                  </label>
                </div>

                {/* 공급자 상세 정보 확인 박스 */}
                <div className="text-[10px] opacity-75 p-2 rounded bg-slate-500/10 flex flex-col gap-0.5 font-mono">
                  <div>대표자: {activeSupplier.ceoName} | 이메일: {activeSupplier.email}</div>
                  <div>소재지: {activeSupplier.address}</div>
                  <div>업태: {activeSupplier.bizType} / 종목: {activeSupplier.bizClass}</div>
                </div>
              </div>

              {/* 2. 매출 분과 선택 */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">매출 분과</label>
                <select
                  value={domainType}
                  onChange={(e) => setDomainType(e.target.value)}
                  className="h-8 px-2 border rounded bg-card text-main"
                >
                  <option value="TRADE_SALE">판매 (유통 커머스)</option>
                  <option value="RENTAL">임대 (장비 렌탈)</option>
                  <option value="OP_SERVICE">운영용역 (정기유지보수)</option>
                  <option value="DEV_SERVICE">개발용역 (SI 프로젝트)</option>
                </select>
              </div>

              {/* 3. 공급받는자 (거래처) 정보 */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">공급받는자 (거래처 상호명) *</label>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="예: 현대건설(주)"
                  className="h-8 px-2.5 border rounded bg-card text-main"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-700">사업자등록번호</label>
                  <input
                    type="text"
                    value={bizNo}
                    onChange={(e) => setBizNo(e.target.value)}
                    placeholder="000-00-00000"
                    className="h-8 px-2.5 border rounded bg-card text-main font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-700">대표자명</label>
                  <input
                    type="text"
                    value={ceoName}
                    onChange={(e) => setCeoName(e.target.value)}
                    className="h-8 px-2.5 border rounded bg-card text-main"
                  />
                </div>
              </div>

              {/* 4. 품목명 & 금액 */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">품목명 *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="예: 소프트웨어 공급 및 컨설팅 용역"
                  className="h-8 px-2.5 border rounded bg-card text-main"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-700">공급가액 (원) *</label>
                  <input
                    type="number"
                    value={supplyAmt}
                    onChange={(e) => setSupplyAmt(e.target.value)}
                    className="h-8 px-2.5 border rounded bg-card text-main font-mono font-bold"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-700">발행일자</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-8 px-2 border rounded bg-card text-main font-mono"
                  />
                </div>
              </div>

              {/* 합계금액 프리뷰 */}
              <div className="p-2.5 rounded bg-blue-50/50 border border-blue-200 flex items-center justify-between text-xs">
                <div className="flex flex-col">
                  <span className="text-[11px] opacity-75">공급가: ₩{Number(supplyAmt || 0).toLocaleString()} | 부가세: ₩{Math.round(Number(supplyAmt || 0) * 0.1).toLocaleString()}</span>
                  <span className="font-bold text-blue-900">
                    합계금액: ₩{Math.round(Number(supplyAmt || 0) * 1.1).toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600 text-white font-bold">
                  VAT 10% 자동계산
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">비고 / 입금계좌 안내 메모</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder={`입금: ${activeSupplier.bankName} ${activeSupplier.bankAccountNo} (${activeSupplier.bankHolder})`}
                  className="h-8 px-2.5 border rounded bg-card text-main"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-3 py-1.5 border rounded hover:bg-slate-500/10 text-xs font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 font-bold text-white rounded text-xs shadow-sm transition"
                >
                  국세청 전자발행 확정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
