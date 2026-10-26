"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, Plus, RefreshCw, Download, Search, 
  CheckCircle2, Printer, AlertCircle, X, ExternalLink, Send
} from "lucide-react";

interface TaxInvoiceTabProps {
  currentUser: any;
}

export const TaxInvoiceTab: React.FC<TaxInvoiceTabProps> = ({ currentUser }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Form State
  const [custName, setCustName] = useState("");
  const [bizNo, setBizNo] = useState("100-00-00000");
  const [ceoName, setCeoName] = useState("대표자");
  const [itemName, setItemName] = useState("");
  const [supplyAmt, setSupplyAmt] = useState("1000000");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [domainType, setDomainType] = useState("TRADE_SALE");

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = domainFilter === "ALL" 
        ? "/api/erp/tax-invoices" 
        : `/api/erp/tax-invoices?domainType=${domainFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setInvoices(data.invoices);
    } catch (err: any) {
      console.error(err);
      showToast("세금계산서 대장 조회 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [domainFilter]);

  // Filtered
  const filteredInvoices = useMemo(() => {
    return invoices.filter(i => {
      const matchSearch = 
        i.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.ntsConfirmNo?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [invoices, searchTerm]);

  // Handle Manual Issue
  const handleManualIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !itemName || !supplyAmt) {
      showToast("거래처명, 품목, 공급가액은 필수입니다.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainType,
          customerName: custName,
          businessNo: bizNo,
          ceoName,
          itemName,
          supplyAmount: supplyAmt,
          issueDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "발행 실패");

      showToast(`전자세금계산서 [${data.invoice.invoiceNo}] 국세청 발행 완료`);
      setShowIssueModal(false);
      setCustName("");
      setItemName("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Handle Popbill Electronic Issue API
  const handlePopbillIssue = async (inv: any) => {
    if (!window.confirm(`[${inv.customerName}] 팝빌 전자세금계산서 API를 통해 국세청 전자서명 즉시 발행하시겠습니까?`)) {
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
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "팝업 URL 생성 실패");

      window.open(data.url, "_blank", "width=850,height=750,scrollbars=yes");
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
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "인쇄 URL 생성 실패");

      window.open(data.url, "_blank", "width=850,height=750,scrollbars=yes");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-slate-950 text-slate-100 overflow-hidden">
      {toast && (
        <div className={`fixed top-16 right-5 z-50 px-4 py-2 rounded text-xs font-bold text-white shadow-xl ${
          toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Header & Pipeline Actions */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow">
            <FileText className="w-3.5 h-3.5" />
            <span>통합 전자세금계산서 대장</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
            팝빌 연동됨 (LinkID: DRAGONRP / TEST)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIssueModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded flex items-center gap-1.5 transition shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>직접 발행</span>
          </button>
          <button
            onClick={fetchData}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Scope / Filter Bar (Z-Pattern ①) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800 text-xs">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-400 font-semibold">검색 (거래처 / 승인번호 / 품목)</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="검색어 입력..."
              className="w-full h-8 pl-8 pr-2 bg-slate-800 border border-slate-700 rounded text-xs text-white"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-400 font-semibold">발행 매출 분과</label>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-xs text-white"
          >
            <option value="ALL">전체 분과</option>
            <option value="TRADE_SALE">판매 (유통 커머스)</option>
            <option value="RENTAL">임대 (장비 렌탈)</option>
            <option value="OP_SERVICE">운영용역 (정기유지보수)</option>
            <option value="DEV_SERVICE">개발용역 (SI 프로젝트)</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={fetchData}
            className="w-full h-8 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 font-bold"
          >
            대장 재조회
          </button>
        </div>
      </div>

      {/* Main Inspection Grid (Z-Pattern ③) */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded overflow-auto shadow-inner">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold select-none z-10">
            <tr>
              <th className="py-2.5 px-3">계산서번호</th>
              <th className="py-2.5 px-3">발행일자</th>
              <th className="py-2.5 px-3">발행 분과</th>
              <th className="py-2.5 px-3">공급받는자 (거래처)</th>
              <th className="py-2.5 px-3">품목명</th>
              <th className="py-2.5 px-3 text-right">공급가액</th>
              <th className="py-2.5 px-3 text-right">세액 (VAT)</th>
              <th className="py-2.5 px-3 text-right">합계금액</th>
              <th className="py-2.5 px-3">국세청 승인번호</th>
              <th className="py-2.5 px-3 text-center">전송상태</th>
              <th className="py-2.5 px-3 text-center">팝빌 연동 액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500">
                  {loading ? "세금계산서 데이터를 불러오는 중..." : "발행된 세금계산서가 없습니다."}
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/50 transition">
                  <td className="py-2 px-3 font-mono font-bold text-blue-400">{inv.invoiceNo}</td>
                  <td className="py-2 px-3 font-mono text-slate-300">{inv.issueDate}</td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {inv.domainType === "TRADE_SALE" ? "판매" :
                       inv.domainType === "RENTAL" ? "임대" :
                       inv.domainType === "OP_SERVICE" ? "운영용역" : "개발용역"}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-100">{inv.customerName}</td>
                  <td className="py-2 px-3 text-slate-200">{inv.itemName}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">₩{Number(inv.supplyAmount).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">₩{Number(inv.vatAmount).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                    ₩{Number(inv.totalAmount).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">{inv.ntsConfirmNo}</td>
                  <td className="py-2 px-3 text-center">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                      국세청전송완료
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenPopbillView(inv)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1 transition"
                        title="팝빌 공식 뷰어 팝업 열기"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>국세청 서식</span>
                      </button>
                      <button
                        onClick={() => handleOpenPopbillPrint(inv)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1 transition"
                        title="즉시 인쇄"
                      >
                        <Printer className="w-3 h-3" />
                        <span>인쇄</span>
                      </button>
                      <button
                        onClick={() => handlePopbillIssue(inv)}
                        className="px-2 py-0.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-700 text-blue-300 rounded text-[10px] flex items-center gap-1 transition"
                        title="팝빌 전자서명 전송"
                      >
                        <Send className="w-3 h-3" />
                        <span>전자발행</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Terminal Summary (Z-Pattern ④) */}
      <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-4">
          <span>총 발행건수: <strong className="text-white">{filteredInvoices.length}건</strong></span>
          <span>총 공급가액: <strong className="text-blue-400">₩{filteredInvoices.reduce((s, i) => s + Number(i.supplyAmount || 0), 0).toLocaleString()}</strong></span>
          <span>총 부가세(VAT): <strong className="text-slate-400">₩{filteredInvoices.reduce((s, i) => s + Number(i.vatAmount || 0), 0).toLocaleString()}</strong></span>
          <span>합계총액: <strong className="text-emerald-400">₩{filteredInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0).toLocaleString()}</strong></span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          ※ 팝빌(Popbill) API 전자세금계산서 표준 연동
        </div>
      </div>

      {/* Modal: Manual Issue */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>전자세금계산서 직접 발행</span>
              </h3>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualIssue} className="mt-4 flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400">발행 분과</label>
                <select
                  value={domainType}
                  onChange={(e) => setDomainType(e.target.value)}
                  className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                >
                  <option value="TRADE_SALE">판매 (유통)</option>
                  <option value="RENTAL">임대 (장비)</option>
                  <option value="OP_SERVICE">운영용역</option>
                  <option value="DEV_SERVICE">개발용역</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">공급받는자 (거래처 상호명)</label>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="예: 현대건설(주)"
                  className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">사업자등록번호</label>
                  <input
                    type="text"
                    value={bizNo}
                    onChange={(e) => setBizNo(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">대표자명</label>
                  <input
                    type="text"
                    value={ceoName}
                    onChange={(e) => setCeoName(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">품목명</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="예: 소프트웨어 공급 및 컨설팅"
                  className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">공급가액 (원)</label>
                  <input
                    type="number"
                    value={supplyAmt}
                    onChange={(e) => setSupplyAmt(e.target.value)}
                    className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">발행일자</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-8 px-2 bg-slate-800 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded"
                >
                  국세청 전자발행
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
