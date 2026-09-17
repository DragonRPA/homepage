"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Key,
  Mail,
  Search,
  CheckCircle2,
  Copy,
  Download,
  Laptop,
  Monitor,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Home,
  Trash2,
  PlusCircle,
  Clock,
  Calendar,
  Sparkles
} from "lucide-react";

interface DeviceItem {
  id: number;
  machineId: string;
  machineName: string;
  activatedAt: string;
  lastCheckAt: string;
}

interface LicenseItem {
  licenseKey: string;
  productId: string;
  planType: string;
  status: string;
  maxActivations: number;
  activeDevices: number;
  devices: DeviceItem[];
  createdAt: string;
}

export default function LicenseLookupPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deactivatingMachineId, setDeactivatingMachineId] = useState<string | null>(null);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes("@")) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/license/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      setHasSearched(true);
      if (data.success) {
        setLicenses(data.licenses || []);
        setMessage(data.message);
      } else {
        setLicenses([]);
        setMessage(data.message || "라이선스 조회에 실패했습니다.");
      }
    } catch (err: any) {
      setMessage("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateDevice = async (licenseKey: string, machineId: string, machineName: string) => {
    const confirmMsg = `정말로 '${machineName}' 컴퓨터의 라이선스 등록을 해제하시겠습니까?\n해제 즉시 해당 슬롯이 비워져 새 컴퓨터에서 등록할 수 있습니다.`;
    if (!window.confirm(confirmMsg)) return;

    setDeactivatingMachineId(machineId);

    try {
      const res = await fetch("/api/license/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deactivate",
          email: email.trim(),
          licenseKey,
          machineId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLicenses(data.licenses || []);
        setMessage(data.message);
      } else {
        alert(data.message || "기기 등록 해제에 실패했습니다.");
      }
    } catch (err) {
      alert("서버 통신 오류가 발생했습니다.");
    } finally {
      setDeactivatingMachineId(null);
    }
  };

  const handleCopy = (key: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 selection:bg-sky-500 selection:text-white">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-300">홈</Link>
          <span>/</span>
          <span className="text-slate-300">라이선스 조회 & 기기 관리 포털</span>
        </div>

        {/* Header Banner */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-4 shadow-lg shadow-sky-500/10">
            <Key className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            정품 라이선스 & 설치 기기 관리
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">
            구매 시 사용하셨던 이메일을 입력하시면, 보유 중인 정품 라이선스 키 조회 및
            <strong> 현재 프로그램이 설치되어 있는 컴퓨터 목록 확인 & 원클릭 기기 등록 해제</strong>를 직접 처리하실 수 있습니다.
          </p>
        </div>

        {/* Search Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl mb-10">
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                구매 시 사용한 이메일 주소 (Email)
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="buyer@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-sm text-white bg-sky-500 hover:bg-sky-400 shadow-lg shadow-sky-500/25 transition disabled:opacity-50"
            >
              {isLoading ? (
                <span>라이선스 및 등록 기기 조회 중...</span>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>내 라이선스 및 등록된 PC 목록 조회하기</span>
                </>
              )}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-4 rounded-xl text-xs sm:text-sm font-medium flex items-start gap-2.5 ${
              licenses.length > 0 
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/10 border border-amber-500/30 text-amber-300"
            }`}>
              {licenses.length > 0 ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <div>{message}</div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                보유 라이선스 목록 ({licenses.length}건)
              </h2>
              <span className="text-xs text-slate-500">
                * PC 교체 시 기존 PC의 [등록 해제]를 누르면 새 컴퓨터에 등록할 수 있습니다.
              </span>
            </div>

            {licenses.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-2">
                <AlertCircle className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-base font-bold text-slate-300">조회된 라이선스가 없습니다.</p>
                <p className="text-xs text-slate-500">구매 시 입력하셨던 이메일 주소가 맞는지 다시 한번 확인해 주세요.</p>
              </div>
            ) : (
              licenses.map((lic, idx) => {
                const isCopied = copiedKey === lic.licenseKey;
                const isManualStudio = lic.productId === "MANUAL_STUDIO";
                const pTitle = isManualStudio ? "매뉴얼 스튜디오 (Manual Studio)" : "라벨스테이션 (Label Print Station)";
                const downloadLink = isManualStudio ? "/downloads/ManualStudio_Setup_v1.4.0.exe" : "/downloads/LabelStation_Setup_v1.0.0.exe";
                const emptySlots = Math.max(0, lic.maxActivations - (lic.devices?.length || 0));

                return (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-xl transition-all space-y-6"
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div>
                        <div className="text-lg font-black text-white flex items-center gap-2">
                          <span>{pTitle}</span>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {lic.status === "ACTIVE" ? "정품 활성" : lic.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {lic.planType === "BUSINESS" ? "기업용 영구 라이선스" : "개인용 영구 라이선스"} • 발급일: {new Date(lic.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-3 py-1.5 rounded-xl font-bold border ${
                          (lic.devices?.length || 0) >= lic.maxActivations
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                            : "bg-sky-500/10 text-sky-300 border-sky-500/30"
                        }`}>
                          기기 사용 슬롯: {lic.devices?.length || 0} / {lic.maxActivations} 대
                        </span>
                      </div>
                    </div>

                    {/* Key Box */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <div className="font-mono text-base sm:text-lg font-black text-amber-300 select-all flex-1 text-center sm:text-left break-all">
                        {lic.licenseKey}
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleCopy(lic.licenseKey)}
                          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                            isCopied ? "bg-emerald-600 text-white" : "bg-sky-500 hover:bg-sky-400 text-white"
                          }`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{isCopied ? "복사됨!" : "키 복사"}</span>
                        </button>
                        <a
                          href={downloadLink}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>설치 파일</span>
                        </a>
                      </div>
                    </div>

                    {/* Active Device Management Table */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Laptop className="w-4 h-4 text-sky-400" />
                          <span>현재 등록되어 실행 중인 컴퓨터 목록</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {/* Registered Devices */}
                        {lic.devices && lic.devices.length > 0 ? (
                          lic.devices.map((device, devIdx) => {
                            const isDeactivating = deactivatingMachineId === device.machineId;

                            return (
                              <div
                                key={devIdx}
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                                    <Monitor className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-white flex items-center gap-2">
                                      <span>{device.machineName || "Windows PC"}</span>
                                      <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                        {device.machineId.substring(0, 16)}...
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-slate-500" />
                                        최초 등록: {new Date(device.activatedAt).toLocaleDateString()}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-500" />
                                        최근 실행: {new Date(device.lastCheckAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleDeactivateDevice(lic.licenseKey, device.machineId, device.machineName)}
                                  disabled={isDeactivating}
                                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  <span>{isDeactivating ? "해제 중..." : "이 PC 등록 해제"}</span>
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                            아직 등록된 컴퓨터가 없습니다. 프로그램을 실행하고 위 라이선스 키를 입력하시면 첫 번째 컴퓨터로 자동 등록됩니다.
                          </div>
                        )}

                        {/* Available Empty Slots */}
                        {emptySlots > 0 && Array.from({ length: emptySlots }).map((_, slotIdx) => (
                          <div
                            key={`empty-${slotIdx}`}
                            className="p-3.5 rounded-2xl bg-slate-950/30 border border-dashed border-sky-500/30 flex items-center justify-between text-xs text-slate-400"
                          >
                            <div className="flex items-center gap-2">
                              <PlusCircle className="w-4 h-4 text-sky-400" />
                              <span>추가 등록 가능한 빈 슬롯 (새 컴퓨터에서 키를 입력하면 즉시 등록됩니다)</span>
                            </div>
                            <span className="text-sky-400 font-bold">등록 가능</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Back Link */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <Home className="w-4 h-4" />
            <span>드래곤RPA 홈페이지 메인으로 돌아가기</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
