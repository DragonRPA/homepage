"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Printer,
  Calendar,
  Building,
  User,
  MapPin,
  Phone,
  DollarSign,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Save,
  Upload,
  AlertCircle,
  Eye,
  EyeOff,
  Lock
} from "lucide-react";

export interface Shareholder {
  id: string;
  name: string;
  residentNo: string;
  maskedResidentNo?: string;
  zipCode: string;
  address: string;
  phone: string;
  shares: string;
  parValue: string;
  totalAmount: string;
  shareRatio: string;
  relationship: string;
  note: string;
}

const createEmptyShareholder = (): Shareholder => ({
  id: "1",
  name: "",
  residentNo: "",
  zipCode: "",
  address: "",
  phone: "",
  shares: "0",
  parValue: "500원",
  totalAmount: "0원",
  shareRatio: "0",
  relationship: "주주",
  note: "",
});

function maskRrnDisplay(rrn: string): string {
  const trimmed = (rrn || "").trim();
  if (!trimmed) return "";
  const m = trimmed.match(/^(\d{6})[- ]?(\d)(\d{6})$/);
  if (m) return `${m[1]}-${m[2]}******`;
  if (trimmed.length > 7) return `${trimmed.slice(0, 7)}******`;
  return "******";
}

export default function ShareholderRegistryClient() {
  const [baseDate, setBaseDate] = useState("2026년 09월 13일 현재");
  const [companyName, setCompanyName] = useState("주식회사 드래곤알피에이");
  const [shareholders, setShareholders] = useState<Shareholder[]>([createEmptyShareholder()]);
  const [totalRows, setTotalRows] = useState(8);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [showFullPii, setShowFullPii] = useState(false);

  const showToastMessage = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchFromServer = async (showNotice = false) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/erp/shareholder-registry?entityCode=CORP_MAIN", {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        setAuthRequired(true);
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.success) {
        showToastMessage(data?.error || "주주명부 조회 실패");
        return;
      }
      setAuthRequired(false);
      if (data.baseDate) setBaseDate(data.baseDate);
      if (data.companyName) setCompanyName(data.companyName);
      if (data.totalRows) setTotalRows(Number(data.totalRows) || 8);
      if (Array.isArray(data.shareholders) && data.shareholders.length > 0) {
        setShareholders(data.shareholders);
      } else {
        setShareholders([createEmptyShareholder()]);
      }
      if (showNotice) {
        showToastMessage("서버 데이터로 복원 완료");
      }
    } catch {
      showToastMessage("서버 연결 오류");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.removeItem("DRAGON_SHAREHOLDER_REGISTRY_V3");
    } catch {}
    void fetchFromServer(false);
  }, []);

  const handleSaveData = async (): Promise<boolean> => {
    if (isSaving || authRequired) return false;
    setIsSaving(true);
    try {
      const res = await fetch("/api/erp/shareholder-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityCode: "CORP_MAIN",
          baseDate,
          companyName,
          totalRows,
          shareholders,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        setAuthRequired(true);
        showToastMessage("인증 세션 만료");
        return false;
      }
      const data = await res.json();
      if (!res.ok || !data?.success) {
        showToastMessage(data?.error || "저장 실패");
        return false;
      }
      showToastMessage("주주명세서 암호화 저장 완료");
      return true;
    } catch {
      showToastMessage("저장 오류");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    const saved = await handleSaveData();
    if (saved) {
      window.print();
    }
  };

  const handleSetToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const newDate = `${year}년 ${month}월 ${day}일 현재`;
    setBaseDate(newDate);
    showToastMessage(`기준일자 설정: ${newDate}`);
  };

  const handleUpdateShareholder = (index: number, field: keyof Shareholder, value: string) => {
    setShareholders((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };

      if (field === "shares" || field === "parValue") {
        const rawShares = parseInt((field === "shares" ? value : updated.shares).replace(/[^0-9]/g, ""), 10);
        const rawPar = parseInt((field === "parValue" ? value : updated.parValue).replace(/[^0-9]/g, ""), 10);
        if (!isNaN(rawShares) && !isNaN(rawPar)) {
          const total = rawShares * rawPar;
          updated.totalAmount = `${total.toLocaleString()}원`;
        }
      }

      next[index] = updated;
      return next;
    });
  };

  const handleAddShareholder = () => {
    const newEntry: Shareholder = {
      ...createEmptyShareholder(),
      id: String(Date.now()),
    };
    setShareholders((prev) => [...prev, newEntry]);
    showToastMessage("주주 행 추가");
  };

  const handleRemoveShareholder = (index: number) => {
    if (shareholders.length <= 1) {
      alert("최소 1명의 주주 정보가 필요합니다.");
      return;
    }
    const target = shareholders[index];
    if (confirm(`주주 [${target.name || `#${index + 1}`}] 정보를 삭제하시겠습니까?`)) {
      setShareholders((prev) => prev.filter((_, i) => i !== index));
      showToastMessage("주주 정보 삭제");
    }
  };

  const handleReset = async () => {
    if (confirm("저장된 서버 데이터로 다시 불러오시겠습니까?")) {
      await fetchFromServer(true);
    }
  };

  const emptySlotsCount = Math.max(0, totalRows - shareholders.length);
  const emptySlots = Array.from({ length: emptySlotsCount }, (_, idx) => idx);

  if (authRequired) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Lock className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-lg font-bold text-white">인증 세션 필요</h1>
          <p className="text-xs text-slate-400">
            주주명부는 개인정보 보호 대상이므로 ERP 로그인 세션 확인 후 열람 가능합니다.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link
              href="/erp"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white"
            >
              ERP 로그인
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 print:bg-white print:text-black">
      {/* 1. Top Control Header (Hidden on Print) */}
      <div className="no-print bg-slate-950 border-b border-slate-800 sticky top-0 z-40 px-4 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="홈으로"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h1 className="text-base sm:text-lg font-bold text-white">주주명세서 발급</h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  A4 규격
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isLoading ? "데이터 불러오는 중" : "DB 암호화 저장 적용"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFullPii((prev) => !prev)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 transition flex items-center gap-1.5"
            >
              {showFullPii ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
              <span>{showFullPii ? "주민번호 마스킹" : "주민번호 표시"}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveData}
              disabled={isSaving || isLoading}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-sky-500 text-xs font-bold text-sky-300 transition flex items-center gap-1.5 shadow disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-sky-400" />
              <span>{isSaving ? "저장 중" : "저장"}</span>
            </button>

            <button
              type="button"
              onClick={handleSetToday}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 transition flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>오늘 날짜 적용</span>
            </button>

            <button
              type="button"
              onClick={handleAddShareholder}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>주주 추가</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>새로고침</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isSaving || isLoading}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>인쇄 / PDF 저장</span>
            </button>
          </div>
        </div>

        {/* Toast feedback */}
        {toast && (
          <div className="max-w-7xl mx-auto mt-2 p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 transition animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toast}</span>
          </div>
        )}
      </div>

      {/* 2. Side-by-Side Content Layout (Editor Panel + A4 Preview) */}
      <div className="max-w-[1500px] mx-auto p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 print:p-0 print:m-0 print:max-w-none print:block">
        {/* Left Editor Controls (Hidden on Print) */}
        <div className="no-print xl:col-span-4 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                <span>기본 정보 및 주소 수정</span>
              </h2>
              <button
                onClick={handleAddShareholder}
                className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-300 hover:bg-emerald-900/60 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>주주 추가</span>
              </button>
            </div>

            {/* Date & Company Name */}
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400">기준 일자 표기</label>
                <input
                  type="text"
                  value={baseDate}
                  onChange={(e) => setBaseDate(e.target.value)}
                  placeholder="예: 2026년 09월 13일 현재"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400">회사명</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="주식회사 드래곤알피에이"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-semibold"
                />
              </div>
            </div>

            {/* Shareholder Info Inputs List */}
            <div className="pt-2 border-t border-slate-800 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                <span>등록 주주 목록 ({shareholders.length}명)</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  총 지분율: {shareholders.reduce((acc, cur) => acc + (parseFloat(cur.shareRatio) || 0), 0)}%
                </span>
              </div>

              {shareholders.map((sh, sIdx) => (
                <div
                  key={sh.id || sIdx}
                  className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 relative shadow-md"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-sky-400">
                      주주 #{sIdx + 1} {sh.name ? `(${sh.name})` : ""}
                    </span>
                    {shareholders.length > 1 && (
                      <button
                        onClick={() => handleRemoveShareholder(sIdx)}
                        className="text-xs text-rose-400 hover:text-rose-300 p-1 flex items-center gap-1"
                        title="주주 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>삭제</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-semibold">성명 (회사명)</label>
                      <input
                        type="text"
                        value={sh.name}
                        onChange={(e) => handleUpdateShareholder(sIdx, "name", e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-semibold">주민등록번호</label>
                      <input
                        type={showFullPii ? "text" : "password"}
                        value={sh.residentNo}
                        onChange={(e) => handleUpdateShareholder(sIdx, "residentNo", e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="space-y-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>우편번호 (상단 표기)</span>
                      </label>
                      <input
                        type="text"
                        value={sh.zipCode}
                        onChange={(e) => handleUpdateShareholder(sIdx, "zipCode", e.target.value)}
                        placeholder="058-27 또는 05827"
                        className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-amber-400 font-bold">
                        변경 주소 (도로명 및 동호수)
                      </label>
                      <textarea
                        rows={2}
                        value={sh.address}
                        onChange={(e) => handleUpdateShareholder(sIdx, "address", e.target.value)}
                        placeholder="서울특별시 송파구 동남로11길 26-11 102호(가락동)"
                        className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-semibold">전화번호</label>
                      <input
                        type="text"
                        value={sh.phone}
                        onChange={(e) => handleUpdateShareholder(sIdx, "phone", e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-semibold">대주주와의 관계</label>
                      <input
                        type="text"
                        value={sh.relationship}
                        onChange={(e) => handleUpdateShareholder(sIdx, "relationship", e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-semibold">주식수 (주)</label>
                      <input
                        type="text"
                        value={sh.shares}
                        onChange={(e) => handleUpdateShareholder(sIdx, "shares", e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-semibold">주당 액면가액</label>
                      <input
                        type="text"
                        value={sh.parValue}
                        onChange={(e) => handleUpdateShareholder(sIdx, "parValue", e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-semibold">총 금액 (자동계산)</label>
                      <input
                        type="text"
                        value={sh.totalAmount}
                        onChange={(e) => handleUpdateShareholder(sIdx, "totalAmount", e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-semibold">지분율 (%)</label>
                      <input
                        type="text"
                        value={sh.shareRatio}
                        onChange={(e) => handleUpdateShareholder(sIdx, "shareRatio", e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Blank Rows Config */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>A4 페이지 총 행 수</span>
              <select
                value={totalRows}
                onChange={(e) => setTotalRows(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
              >
                <option value={5}>5개 행</option>
                <option value={6}>6개 행</option>
                <option value={7}>7개 행 (표준 A4 1장 권장)</option>
                <option value={8}>8개 행</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Printable A4 Document Stage */}
        <div className="xl:col-span-8 flex justify-center print:w-full print:block print:p-0">
          {/* A4 Paper Sheet Container */}
          <div
            className="w-full bg-white text-black shadow-2xl p-6 sm:p-8 border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full"
            style={{
              maxWidth: "210mm",
              boxSizing: "border-box",
              fontFamily: "'Malgun Gothic', '맑은 고딕', 'Dotum', '돋움', 'Apple SD Gothic Neo', sans-serif",
            }}
          >
            {/* 1. Document Header Table */}
            <table
              className="w-full border-collapse mb-1.5"
              style={{
                border: "1.5px solid #000",
                boxSizing: "border-box",
                tableLayout: "fixed",
              }}
            >
              <tbody>
                <tr>
                  {/* Left Date Box */}
                  <td
                    className="text-center font-bold text-[12.5px] align-middle"
                    style={{
                      width: "28%",
                      padding: "8px 2px",
                      border: "1.5px solid #000",
                      boxSizing: "border-box",
                    }}
                  >
                    {baseDate}
                  </td>

                  {/* Center Title Box */}
                  <td
                    className="text-center font-extrabold text-[24px] align-middle"
                    style={{
                      width: "44%",
                      padding: "8px 0",
                      letterSpacing: "12px",
                      textIndent: "12px",
                      border: "1.5px solid #000",
                      boxSizing: "border-box",
                    }}
                  >
                    주주명세서
                  </td>

                  {/* Right Company Name 2-Tier Box */}
                  <td
                    className="p-0"
                    style={{
                      width: "28%",
                      border: "1.5px solid #000",
                      boxSizing: "border-box",
                    }}
                  >
                    <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                      <tbody>
                        <tr>
                          <td
                            className="text-center font-bold text-[11.5px] bg-slate-50 py-1"
                            style={{ borderBottom: "1.5px solid #000" }}
                          >
                            회 사 명
                          </td>
                        </tr>
                        <tr>
                          <td className="text-center font-bold text-[12.5px] py-1.5">
                            <span>{companyName}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2. Main Shareholder Table */}
            <table
              className="w-full border-collapse"
              style={{
                border: "1.5px solid #000",
                fontSize: "11.5px",
                tableLayout: "fixed",
                boxSizing: "border-box",
              }}
            >
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "19%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "4%" }} />
              </colgroup>

              {/* Table Headers (2 Rows) */}
              <thead>
                <tr>
                  <th
                    className="text-center font-semibold text-[10.5px] py-1 bg-slate-50/50"
                    style={{ border: "1px solid #000" }}
                  >
                    ①성 명<br />(회사명)
                  </th>
                  <th
                    className="text-center font-semibold text-[10.5px] py-1 bg-slate-50/50"
                    style={{ border: "1px solid #000" }}
                  >
                    ②주민등록번호<br />(법인등록번호)
                  </th>
                  <th
                    rowSpan={2}
                    className="text-center font-semibold text-[10.5px] py-1 bg-slate-50/50 align-middle"
                    style={{ border: "1px solid #000" }}
                  >
                    ④전화번호<br />(휴대전화)
                  </th>
                  <th
                    colSpan={4}
                    className="text-center font-semibold text-[10.5px] py-0.5 bg-slate-50/50"
                    style={{ border: "1px solid #000" }}
                  >
                    지분 또는 출자관계
                  </th>
                  <th
                    rowSpan={2}
                    className="text-center font-semibold text-[10px] py-1 bg-slate-50/50 align-middle leading-tight"
                    style={{ border: "1px solid #000" }}
                  >
                    ⑨<br />대주주<br />와의<br />관계
                  </th>
                  <th
                    rowSpan={2}
                    className="text-center font-semibold text-[10.5px] py-1 bg-slate-50/50 align-middle"
                    style={{ border: "1px solid #000" }}
                  >
                    비 고
                  </th>
                </tr>
                <tr>
                  <th
                    colSpan={2}
                    className="text-center font-semibold text-[10.5px] py-0.5 bg-slate-50/50"
                    style={{ border: "1px solid #000" }}
                  >
                    ③주 소
                  </th>
                  <th
                    className="text-center font-semibold text-[10.5px] py-0.5 bg-slate-50/50"
                    style={{ border: "1px solid #000" }}
                  >
                    ⑤ 주식수
                  </th>
                  <th
                    className="text-center font-semibold text-[10px] py-0.5 bg-slate-50/50 leading-tight"
                    style={{ border: "1px solid #000" }}
                  >
                    ⑥ 주당<br />액면가액
                  </th>
                  <th
                    className="text-center font-semibold text-[10.5px] py-0.5 bg-slate-50/50"
                    style={{ border: "1px solid #000" }}
                  >
                    ⑦ 금 액
                  </th>
                  <th
                    className="text-center font-semibold text-[10px] py-0.5 bg-slate-50/50 leading-tight"
                    style={{ border: "1px solid #000" }}
                  >
                    ⑧지분율<br />(%)
                  </th>
                </tr>
              </thead>

              {/* Table Data Rows */}
              <tbody>
                {/* 1. Populated Shareholder Rows */}
                {shareholders.map((sh, idx) => (
                  <React.Fragment key={sh.id || idx}>
                    {/* Row Part 1: Name & Registration Number & Spanned Columns */}
                    <tr style={{ height: "24px" }}>
                      {/* 1. Name */}
                      <td
                        className="text-center text-[11.5px] font-medium py-0.5 px-1 align-middle"
                        style={{ border: "1px solid #000" }}
                      >
                        {sh.name}
                      </td>

                      {/* 2. Resident Registration No */}
                      <td
                        className="text-center text-[11.5px] py-0.5 px-1 font-mono align-middle"
                        style={{ border: "1px solid #000" }}
                      >
                        <span className="print:hidden">
                          {showFullPii ? sh.residentNo : maskRrnDisplay(sh.residentNo)}
                        </span>
                        <span className="hidden print:inline">{sh.residentNo}</span>
                      </td>

                      {/* 4. Phone Number (Rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="text-center text-[11.5px] py-0.5 px-1 align-middle font-mono leading-tight"
                        style={{ border: "1px solid #000", wordBreak: "break-all" }}
                      >
                        {sh.phone ? (
                          sh.phone.includes("-") ? (
                            <>
                              {sh.phone.split("-").slice(0, 2).join("-")}
                              <br />-{sh.phone.split("-")[2]}
                            </>
                          ) : (
                            sh.phone
                          )
                        ) : (
                          ""
                        )}
                      </td>

                      {/* 5. Shares (Rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="text-right text-[11.5px] py-0.5 px-1.5 align-middle font-mono"
                        style={{ border: "1px solid #000" }}
                      >
                        {sh.shares}
                      </td>

                      {/* 6. Par Value (Rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="text-right text-[11.5px] py-0.5 px-1.5 align-middle font-mono"
                        style={{ border: "1px solid #000" }}
                      >
                        {sh.parValue}
                      </td>

                      {/* 7. Total Amount (Rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="text-right text-[11.5px] py-0.5 px-1.5 align-middle font-mono font-medium"
                        style={{ border: "1px solid #000" }}
                      >
                        {sh.totalAmount}
                      </td>

                      {/* 8. Share Ratio (Rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="text-center text-[11.5px] py-0.5 px-1 align-middle font-mono"
                        style={{ border: "1px solid #000" }}
                      >
                        {sh.shareRatio}
                      </td>

                      {/* 9. Relationship (Rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="text-center text-[11.5px] py-0.5 px-1 align-middle"
                        style={{ border: "1px solid #000" }}
                      >
                        {sh.relationship}
                      </td>

                      {/* 10. Note (Rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="text-center text-[11.5px] py-0.5 px-1 align-middle"
                        style={{ border: "1px solid #000" }}
                      >
                        {sh.note}
                      </td>
                    </tr>

                    {/* Row Part 2: Full Address (Spanning Col 1 and 2) */}
                    <tr style={{ height: "36px" }}>
                      <td
                        colSpan={2}
                        className="py-0.5 px-1.5 align-top text-[10.5px] leading-tight"
                        style={{ border: "1px solid #000" }}
                      >
                        {sh.zipCode && (
                          <div className="font-mono text-[10px] mb-0.5">{sh.zipCode}</div>
                        )}
                        <div>{sh.address}</div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}

                {/* 2. Empty Rows to fill out standard A4 page */}
                {emptySlots.map((slotIdx) => (
                  <React.Fragment key={`empty-${slotIdx}`}>
                    <tr style={{ height: "24px" }}>
                      <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                      <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                      <td rowSpan={2} style={{ border: "1px solid #000" }}>&nbsp;</td>
                      <td rowSpan={2} style={{ border: "1px solid #000" }}>&nbsp;</td>
                      <td rowSpan={2} style={{ border: "1px solid #000" }}>&nbsp;</td>
                      <td rowSpan={2} style={{ border: "1px solid #000" }}>&nbsp;</td>
                      <td rowSpan={2} style={{ border: "1px solid #000" }}>&nbsp;</td>
                      <td rowSpan={2} style={{ border: "1px solid #000" }}>&nbsp;</td>
                      <td rowSpan={2} style={{ border: "1px solid #000" }}>&nbsp;</td>
                    </tr>
                    <tr style={{ height: "36px" }}>
                      <td colSpan={2} style={{ border: "1px solid #000" }}>&nbsp;</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Strict 1-Page A4 Print CSS Styling */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 8mm 10mm 8mm 10mm;
        }
        @media print {
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          header, footer {
            display: none !important;
          }
          table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
