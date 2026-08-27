"use client";

import React, { useState } from "react";
import { Search, Database, Building2, CloudRain, CheckCircle, AlertTriangle, Terminal, RefreshCw, Server } from "lucide-react";

export default function PublicDataDemo() {
  const [activeTab, setActiveTab] = useState<"nts" | "kma">("nts");

  // NTS State
  const [bizNumber, setBizNumber] = useState("123-45-67890");
  const [ntsLoading, setNtsLoading] = useState(false);
  const [ntsResult, setNtsResult] = useState<any>({
    b_no: "1234567890",
    b_stt: "계속사업자",
    b_stt_cd: "01",
    tax_type: "부가가치세 일반과세자",
    tax_type_cd: "01",
    end_dt: "",
    utcc_yn: "N",
    tax_type_change_dt: "",
    invoice_apply_dt: "2020-01-01",
    rbf_tax_type: "해당없음",
    rbf_tax_type_cd: "99",
  });

  // KMA State
  const [region, setRegion] = useState("서울 강남구");
  const [kmaLoading, setKmaLoading] = useState(false);
  const [kmaResult, setKmaResult] = useState({
    location: "서울 강남구 역삼동 (nx: 61, ny: 125)",
    temperature: "24.5°C",
    sky: "맑음 (0/10)",
    rainfallProb: "10%",
    windSpeed: "1.8 m/s (안전)",
    safetyStatus: "작업 적합 (고소작업 및 야외 배차 가능)",
    updatedAt: "2026-08-27 15:00 KST",
  });

  const handleNtsQuery = () => {
    setNtsLoading(true);
    setTimeout(() => {
      const cleanNo = bizNumber.replace(/-/g, "");
      setNtsResult({
        b_no: cleanNo || "1234567890",
        b_stt: "계속사업자",
        b_stt_cd: "01",
        tax_type: "부가가치세 일반과세자",
        tax_type_cd: "01",
        end_dt: "",
        utcc_yn: "N",
        tax_type_change_dt: "",
        invoice_apply_dt: "2020-01-01",
        rbf_tax_type: "해당없음",
        rbf_tax_type_cd: "99",
      });
      setNtsLoading(false);
    }, 400);
  };

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    setKmaLoading(true);
    setTimeout(() => {
      if (newRegion === "경기 화성시") {
        setKmaResult({
          location: "경기 화성시 남양읍 (nx: 57, ny: 121)",
          temperature: "26.1°C",
          sky: "구름 많음",
          rainfallProb: "30%",
          windSpeed: "3.2 m/s (주의)",
          safetyStatus: "풍속 모니터링 필요 (고소 크레인 주의보)",
          updatedAt: "2026-08-27 15:00 KST",
        });
      } else {
        setKmaResult({
          location: "서울 강남구 역삼동 (nx: 61, ny: 125)",
          temperature: "24.5°C",
          sky: "맑음",
          rainfallProb: "10%",
          windSpeed: "1.8 m/s (안전)",
          safetyStatus: "작업 적합 (고소작업 및 야외 배차 가능)",
          updatedAt: "2026-08-27 15:00 KST",
        });
      }
      setKmaLoading(false);
    }, 300);
  };

  return (
    <section id="public-data" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-bold mb-3">
            <Database className="w-3.5 h-3.5" />
            <span>Open API 실시간 데이터 파이프라인</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            국가 공공데이터포털(data.go.kr) 실시간 연동 데모
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            공공 API 데이터를 내부 ERP 및 업무 자동화 시스템에 실시간 주입하는 파이프라인 인터페이스를 확인하십시오.
          </p>
        </div>

        {/* Interactive Demo Box */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-300 bg-slate-900 shadow-xl overflow-hidden text-slate-100">
          
          {/* Tabs Bar */}
          <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-3 gap-2">
            <button
              onClick={() => setActiveTab("nts")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-colors ${
                activeTab === "nts"
                  ? "bg-slate-900 text-white border-t-2 border-blue-500"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>국세청 사업자등록 상태조회 API</span>
            </button>
            <button
              onClick={() => setActiveTab("kma")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-colors ${
                activeTab === "kma"
                  ? "bg-slate-900 text-white border-t-2 border-cyan-500"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <CloudRain className="w-4 h-4 text-cyan-400" />
              <span>기상청 단기예보 & 현장안전 API</span>
            </button>
          </div>

          {/* Tab 1: NTS Business Status */}
          {activeTab === "nts" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left: Input Form (Vertical Header-Label Layout Standard) */}
                <div className="md:col-span-5 space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                      사업자등록번호 (10자리)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bizNumber}
                        onChange={(e) => setBizNumber(e.target.value)}
                        placeholder="예: 123-45-67890"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        onClick={handleNtsQuery}
                        disabled={ntsLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        {ntsLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        <span>조회</span>
                      </button>
                    </div>
                  </div>

                  {/* Realtime Parse Card */}
                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] pb-1 border-b border-slate-800">
                      실시간 파싱 결과
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">사업자 상태:</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        <CheckCircle className="w-3 h-3" />
                        {ntsResult.b_stt}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">과세 유형:</span>
                      <span className="text-white font-semibold">{ntsResult.tax_type}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">간이과세 배제 여부:</span>
                      <span className="text-slate-300">{ntsResult.utcc_yn === "N" ? "배제 아님(정상)" : "배제"}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Raw JSON Terminal */}
                <div className="md:col-span-7">
                  <div className="h-full rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-[11px] text-slate-300 flex flex-col">
                    <div className="flex items-center justify-between text-slate-500 pb-2 mb-2 border-b border-slate-800">
                      <span>POST /api/v1/nts-businessman/status</span>
                      <span className="text-emerald-400">200 OK</span>
                    </div>
                    <pre className="overflow-x-auto text-cyan-300 flex-1 leading-relaxed">
{JSON.stringify(
  {
    status_code: "OK",
    request_cnt: 1,
    match_cnt: 1,
    data: [ntsResult],
  },
  null,
  2
)}
                    </pre>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 2: KMA Weather */}
          {activeTab === "kma" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left: Input Selection (Vertical Header-Label Layout Standard) */}
                <div className="md:col-span-5 space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                      현장 거점 지역 선택
                    </label>
                    <select
                      value={region}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="서울 강남구">서울 강남구 (본사 / 도심)</option>
                      <option value="경기 화성시">경기 화성시 (장비 주기장 / 야외)</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] pb-1 border-b border-slate-800">
                      현장 작업 안전 판정
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">기온 / 날씨:</span>
                      <span className="text-white font-semibold">{kmaResult.temperature} ({kmaResult.sky})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">강수 확률:</span>
                      <span className="text-white">{kmaResult.rainfallProb}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">순간 풍속:</span>
                      <span className="text-cyan-300 font-semibold">{kmaResult.windSpeed}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-slate-400 mb-1">배차 권고 상태:</div>
                      <div className="p-2 rounded bg-blue-950/60 border border-blue-800 text-blue-200 text-xs font-semibold">
                        {kmaResult.safetyStatus}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Raw JSON Terminal */}
                <div className="md:col-span-7">
                  <div className="h-full rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-[11px] text-slate-300 flex flex-col">
                    <div className="flex items-center justify-between text-slate-500 pb-2 mb-2 border-b border-slate-800">
                      <span>GET /api/v1/kma/getVilageFcst</span>
                      <span className="text-emerald-400">200 OK</span>
                    </div>
                    <pre className="overflow-x-auto text-emerald-300 flex-1 leading-relaxed">
{JSON.stringify(
  {
    response: {
      header: { resultCode: "00", resultMsg: "NORMAL_SERVICE" },
      body: {
        dataType: "JSON",
        items: {
          item: [
            { category: "TMP", fcstValue: kmaResult.temperature },
            { category: "SKY", fcstValue: kmaResult.sky },
            { category: "POP", fcstValue: kmaResult.rainfallProb },
            { category: "WSD", fcstValue: kmaResult.windSpeed },
          ],
        },
        location: kmaResult.location,
        updatedAt: kmaResult.updatedAt,
      },
    },
  },
  null,
  2
)}
                    </pre>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}