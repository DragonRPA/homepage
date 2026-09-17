"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Camera,
  Download,
  ExternalLink,
  Layers,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Keyboard,
  ShieldCheck,
  Cpu,
  Monitor,
  Presentation,
  Hash,
  Square,
  EyeOff,
  Type,
  Maximize2,
  HelpCircle,
  Copy,
  ChevronRight,
  Bot,
  Terminal,
  Zap,
  Sparkles,
  ArrowRight,
  CreditCard
} from "lucide-react";
import PaymentModal from "@/components/PaymentModal";

export default function ManualStudioClient() {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "dictionary" | "shortcuts" | "ai-mcp" | "faq" | "eula">("overview");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedEula, setCopiedEula] = useState(false);
  const [copiedMcpConfig, setCopiedMcpConfig] = useState(false);

  const handleCopyEmail = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText("contact@dragonrpa.co.kr");
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleCopyMcpConfig = () => {
    const mcpConfig = `{
  "mcpServers": {
    "manual-studio": {
      "command": "C:/ManualStudio/ManualStudio.exe",
      "args": ["--mcp"]
    }
  }
}`;
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(mcpConfig);
      setCopiedMcpConfig(true);
      setTimeout(() => setCopiedMcpConfig(false), 2000);
    }
  };

  const handleCopyEula = () => {
    const eulaText = `(주)드래곤알피에이 소프트웨어 최종 사용자 라이선스 계약서 (EULA)
End User License Agreement for Manual Studio | (주)드래곤알피에이 (DragonRPA Co., Ltd.)

본 계약은 (주)드래곤알피에이(이하 "회사")와 본 소프트웨어 '매뉴얼 스튜디오(Manual Studio)'(이하 "소프트웨어")를 다운로드, 설치 또는 사용하는 개인 또는 법인(이하 "사용자") 간에 체결되는 법적 구속력을 가진 사용권 계약입니다. 사용자가 본 "소프트웨어"를 다운로드, 복사, 설치 또는 사용하는 것은 본 계약의 모든 조건에 동의한 것으로 간주됩니다.

제1조 (목적)
본 계약은 "회사"가 개발한 "소프트웨어"에 대한 비독점적이고 양도 불가능한 사용 권한을 "사용자"에게 허여하고, 당사자 간의 권리 및 의무를 규정함을 목적으로 합니다.

제2조 (지식재산권의 귀속)
1. 본 "소프트웨어", 관련 설명 문서, 소스코드, 바이너리, 그래픽, UI/UX 디자인에 대한 저작권, 특허권, 상표권, 영업비밀 등 일체의 지식재산권은 대한민국 저작권법 및 국제 협약에 따라 (주)드래곤알피에이에 배타적으로 귀속됩니다.
2. 본 계약에 따른 제공은 소유권의 이전이 아니며, 명시된 조건 범위 내에서의 '제한적 사용권(License)'만을 허여합니다.

제3조 (사용권의 범위 및 조건)
1. [평가판] 회사가 공지한 평가판은 명시된 사용 유효 기간(2026년 12월 31일까지) 동안 비상업적 검토, 기능 테스트 및 평가 목적으로만 무상 사용할 수 있습니다. 기간 만료 후에는 정규 라이선스 없이 계속 사용할 수 없습니다.
2. [정규 라이선스] 정식 라이선스는 1개의 라이선스 키당 지정된 단일 하드웨어 머신(1PC-1Key 노드락)에서만 설치 및 실행이 허용됩니다.

제4조 (금지 행위 - 역공학 및 무단 배포 금지)
1. 역공학 및 디컴파일 금지: 소스코드나 내부 알고리즘을 추출하기 위한 리버스 엔지니어링, 역컴파일(Decompile), 디스어셈블(Disassemble) 또는 코드 수정 행위
2. 보안 메커니즘 조작 금지: 하드웨어 식별값(HWID), 시계 변조 방지, 암호화 키 등 라이선스 검증 장치를 우회, 변조, 크랙하는 행위
3. 무단 재배포 및 재판매 금지: 회사의 사전 서면 승인 없이 제3자에게 유상 판매, 대여, 양도하거나 온라인 자료실/공중망에 무단 배포하는 행위
4. 저작권 표시 삭제 금지: 소프트웨어 내에 표시된 회사의 상표, 로고, 저작권 안내문, 평가판 기한 등의 법적 고지 사항을 임의로 변경, 제거하는 행위

제5조 (보증의 한계 및 면책)
1. 본 소프트웨어는 "있는 그대로(AS-IS)" 제공되며, 회사는 특정 목적에의 적합성, 무결성 등에 대해 명시적 또는 묵시적 보증을 하지 않습니다.
2. 회사는 소프트웨어의 사용 또는 사용 불능으로 인하여 발생하는 간접적, 부수적 손해(영업손실, 데이터 손실 등)에 대해 책임을 지지 않습니다.

제6조 (위약벌 및 손해배상)
사용자가 제4조(금지 행위)를 고의 또는 중과실로 위반한 경우, 정규 라이선스 정가의 5배에 해당하는 금액을 위약벌로 회사에 즉시 지급하여야 하며, 이와 별도로 회사가 입은 실제 손해를 전액 배상하여야 합니다.

제7조 (준거법 및 전속 관할)
본 계약은 대한민국 법률에 따라 규율되며, 본 계약과 관련하여 발생하는 모든 분쟁은 (주)드래곤알피에이 본점 소재지를 관할하는 법원을 제1심 전속 관할 법원으로 합니다.

공고일자: 2026.09.11 | 시행일자: 2026.09.11
(주)드래곤알피에이 (DragonRPA Co., Ltd.) | 대표이사: 이정용 | 문의: contact@dragonrpa.co.kr`;

    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(eulaText);
      setCopiedEula(true);
      setTimeout(() => setCopiedEula(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans">
      {/* 1. 상단 글로벌 네비게이션 */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 text-slate-300 hover:text-white transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/symbol-192.png"
                alt="DragonRPA CI"
                className="w-8 h-8 rounded-lg bg-white p-0.5 object-contain shadow-md shadow-blue-600/20"
              />
              <div className="flex flex-col">
                <span className="font-bold text-base text-white tracking-tight leading-none">
                  Dragon<span className="text-blue-500">RPA</span>
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Manual Studio</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/products"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap"
            >
              스토어
            </Link>

            <a
              href="/downloads/ManualStudio.exe"
              download="ManualStudio.exe"
              className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>다운로드</span>
            </a>

            <Link
              href="/about"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap"
            >
              회사소개
            </Link>

            <Link
              href="/portfolio"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap hidden sm:inline-flex"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>포트폴리오</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. 본문 컨테이너 */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8 my-4">
        {/* HERO BANNER */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/60 whitespace-nowrap">
                  v1.4.0 Build.14 (~2026.12.31 무료)
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 whitespace-nowrap">
                  Nuitka C 기계어 (GCC 15.2)
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/60 whitespace-nowrap">
                  AI 에이전트 MCP 탑재
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                매뉴얼 스튜디오 (DragonRPA Manual Studio)
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                업무 화면 캡처부터 1·2·3 자동 번호 스탬프, 강조 박스, 화살표, 민감정보 블러, 파워포인트(PPTX) & 구글 슬라이드 1초 원터치 자동 주입까지 지원하는 초경량 C 기계어 컴파일 무설치 매뉴얼 저작 도구입니다.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 transition-all"
              >
                <CreditCard className="w-4 h-4" />
                <span>정품 라이선스 구매하기</span>
              </button>
              <a
                href="/downloads/ManualStudio.exe"
                download="ManualStudio.exe"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>무료 평가판 다운로드</span>
              </a>
              <div className="text-[11px] text-slate-400 text-center">
                Windows 10/11 64-bit 지원 • macOS 호환
              </div>
            </div>
          </div>
        </section>

        {/* Payment Modal */}
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          defaultProductId="MANUAL_STUDIO"
          defaultPlanType="PERSONAL"
        />

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            개요 및 다운로드
          </button>
          <button
            onClick={() => setActiveTab("ai-mcp")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "ai-mcp"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bot className="w-4 h-4 text-purple-400" />
            <span>AI 에이전트 & MCP</span>
          </button>
          <button
            onClick={() => setActiveTab("dictionary")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "dictionary"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            메뉴 및 기능버튼 사전
          </button>
          <button
            onClick={() => setActiveTab("shortcuts")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "shortcuts"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            단축키 및 실무 가이드
          </button>
          <button
            onClick={() => setActiveTab("faq")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "faq"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>자주 묻는 질문 (FAQ)</span>
          </button>
          <button
            onClick={() => setActiveTab("eula")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "eula"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            사용권 계약서 (EULA)
          </button>
        </div>

        {/* TAB 1: 개요 및 다운로드 */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* 4대 스펙 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">파일 크기</div>
                <div className="text-xl font-bold text-blue-400 mt-1">27.97 MB</div>
                <div className="text-[11px] text-emerald-400 mt-1">무설치 단일 포터블</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">업무 단축률</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">85% 이상</div>
                <div className="text-[11px] text-slate-400 mt-1">수작업 PPT 대비</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">글로벌 언어</div>
                <div className="text-xl font-bold text-white mt-1">9개 언어</div>
                <div className="text-[11px] text-blue-400 mt-1">0.05초 즉시 핫스왑</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">평가판 기한</div>
                <div className="text-xl font-bold text-amber-400 mt-1">2026. 12. 31</div>
                <div className="text-[11px] text-slate-400 mt-1">전 기능 무상 지원</div>
              </div>
            </div>

            {/* 다운로드 실행 배너 */}
            <div className="bg-blue-950/30 border border-blue-800/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-blue-300">
                  무설치 단일 실행 파일 (.exe) 다운로드
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  별도 설치 마법사나 Python 환경 없이 다운로드 후 더블클릭하면 즉시 실행됩니다.
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <a
                  href="/downloads/ManualStudio.exe"
                  download="ManualStudio.exe"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ManualStudio.exe 다운로드</span>
                </a>
              </div>
            </div>

            {/* 3단계 핵심 워크플로우 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                초고속 3단계 실무 매뉴얼 제작 프로세스
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400">1단계: 화면 캡처</span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">F9</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    작성할 화면에서 F9를 눌러 고정 영역(960×540) 또는 드래그 영역을 즉시 캡처합니다.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400">2단계: 번호 & 강조 주석</span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">S, B, V</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    클릭 한 번으로 ①, ② 자동 번호 스탬프와 강조 박스, 지시선 말풍선을 배치합니다.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400">3단계: 1초 PPT/슬라이드 생성</span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">F10</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    F10을 누르면 파워포인트 또는 구글 슬라이드에 새 슬라이드가 자동 생성되고 완성본이 삽입됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 듀얼 UI 테마 엔진 & 다국어 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  Windows & Macintosh 듀얼 UI 스타일
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  사무용 표준 Windows Fluent 리본 스타일과 감각적인 Apple Cupertino(세그먼트 알약형 탭바 및 3구 트래픽 라이트) 스타일을 환경설정에서 자유롭게 선택하여 0.05초 만에 실시간 핫스왑할 수 있습니다.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Presentation className="w-4 h-4 text-emerald-400" />
                  파워포인트 & 구글 슬라이드 동시 지원
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  로컬 데스크톱 Microsoft PowerPoint(COM)뿐만 아니라 웹 브라우저 기반의 Google Slides 창을 자동 탐색하여 슬라이드 생성(Ctrl+M) 및 붙여넣기(Ctrl+V)를 1초 내에 완결합니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI 에이전트 & MCP */}
        {activeTab === "ai-mcp" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-400">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">AI 에이전트 인터페이스 & Model Context Protocol (MCP)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Claude Desktop, Claude Cowork, Cursor, Antigravity 등 LLM 에이전트가 매뉴얼 스튜디오를 직접 호출·제어합니다.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-xs font-bold text-purple-400">AGENTS.md 표준 명세서</span>
                  <p className="text-xs text-slate-300">리포지토리 루트에 기계 판독형 초고밀도 가이드를 배치하여 LLM이 3초 만에 시스템을 인지합니다.</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-xs font-bold text-blue-400">헤드리스 CLI 엔진 (--cli)</span>
                  <p className="text-xs text-slate-300">GUI 창 없이 명령줄 인자만으로 캡처, 주석 합성, 다단계 배치 매뉴얼, MD/HTML 문서 생성을 자동화합니다.</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-xs font-bold text-emerald-400">9대 MCP 도구 서버 (--mcp)</span>
                  <p className="text-xs text-slate-300">Anthropic 표준 stdio JSON-RPC 2.0 기반으로 자연어 도구 호출(Tool Calling)을 완벽 지원합니다.</p>
                </div>
              </div>
            </div>

            {/* MCP 설정 가이드 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  Claude Desktop / Cowork 등록 설정 (claude_desktop_config.json)
                </h3>
                <button
                  onClick={handleCopyMcpConfig}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedMcpConfig ? "복사 완료" : "설정 JSON 복사"}</span>
                </button>
              </div>

              <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-300 border border-slate-800 overflow-x-auto">
{`{
  "mcpServers": {
    "manual-studio": {
      "command": "C:/ManualStudio/ManualStudio.exe",
      "args": ["--mcp"]
    }
  }
}`}
              </pre>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-200">지원하는 9대 MCP 전용 도구 (Tools)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  <div>• <code>manual_studio_status</code>: 시스템 상태 및 모니터 해상도 조회</div>
                  <div>• <code>manual_studio_capture_screen</code>: 화면/지정 영역 고해상도 캡처</div>
                  <div>• <code>manual_studio_add_annotations</code>: 스탬프, 박스, 화살표, 말풍선 합성</div>
                  <div>• <code>manual_studio_add_spotlight</code>: 타겟 UI 집중 스포트라이트 암전 마스크</div>
                  <div>• <code>manual_studio_render_project</code>: .mcs.json 프로젝트 복원 렌더링</div>
                  <div>• <code>manual_studio_export_presentation</code>: 파워포인트/구글 슬라이드 자동 주입</div>
                  <div>• <code>manual_studio_create_step</code>: 캡처 ➔ 주석 ➔ 내보내기 올인원 액션</div>
                  <div>• <code>manual_studio_batch_pipeline</code>: 다단계 워크플로우 일괄 매뉴얼 제작</div>
                  <div>• <code>manual_studio_export_document</code>: 마크다운(MD) 및 HTML 매뉴얼 조립</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 메뉴 및 기능버튼 사전 */}
        {activeTab === "dictionary" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                상단 메뉴바 기능 명세
              </h2>

              <div className="space-y-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-blue-400">1. 파일(F) 메뉴</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>• <strong>새 캡처 (F9)</strong>: 화면 캡처 오버레이 시작</div>
                    <div>• <strong>프로젝트 열기 (Ctrl+O)</strong>: 저장된 .mcs.json 프로젝트 복원</div>
                    <div>• <strong>프로젝트 저장 (Ctrl+S)</strong>: 레이어 분리 프로젝트 저장</div>
                    <div>• <strong>PPT 슬라이드 생성 (F10)</strong>: 파워포인트 새 슬라이드 즉시 삽입</div>
                    <div>• <strong>구글 슬라이드 전송</strong>: 브라우저 구글 슬라이드 원터치 주입</div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-blue-400">2. 주석(A) & 편집(E) 메뉴</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>• <strong>실행 취소 (Ctrl+Z)</strong>: 마지막 주석/편집 작업 롤백</div>
                    <div>• <strong>다시 실행 (Ctrl+Y)</strong>: 취소된 작업 재적용</div>
                    <div>• <strong>선택 모드 (V)</strong>: 주석 위치 이동 및 크기 조절</div>
                    <div>• <strong>스탬프 모드 (S)</strong>: ①, ② 순차 번호 원클릭 배치</div>
                    <div>• <strong>강조 박스 (B)</strong>: 직사각형 강조 테두리/채우기</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 단축키 및 실무 가이드 */}
        {activeTab === "shortcuts" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-blue-400" />
                원클릭 실무 단축키 맵
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex justify-between items-center">
                  <span className="text-xs text-slate-300">화면 고속 캡처</span>
                  <span className="font-mono text-xs font-bold bg-blue-900/60 text-blue-300 px-2.5 py-1 rounded border border-blue-700/60">F9</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex justify-between items-center">
                  <span className="text-xs text-slate-300">파워포인트 슬라이드 삽입</span>
                  <span className="font-mono text-xs font-bold bg-emerald-900/60 text-emerald-300 px-2.5 py-1 rounded border border-emerald-700/60">F10</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex justify-between items-center">
                  <span className="text-xs text-slate-300">구글 슬라이드 즉시 전송</span>
                  <span className="font-mono text-xs font-bold bg-amber-900/60 text-amber-300 px-2.5 py-1 rounded border border-amber-700/60">F11</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex justify-between items-center">
                  <span className="text-xs text-slate-300">선택 도구 전환</span>
                  <span className="font-mono text-xs font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded">V</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex justify-between items-center">
                  <span className="text-xs text-slate-300">순차 번호 스탬프</span>
                  <span className="font-mono text-xs font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded">S</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex justify-between items-center">
                  <span className="text-xs text-slate-300">강조 박스 도구</span>
                  <span className="font-mono text-xs font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded">B</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex justify-between items-center">
                  <span className="text-xs text-slate-300">프로젝트 저장</span>
                  <span className="font-mono text-xs font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded">Ctrl + S</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: 자주 묻는 질문 (FAQ) */}
        {activeTab === "faq" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                자주 묻는 질문 (FAQ)
              </h2>

              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-4 space-y-1.5">
                  <h3 className="text-sm font-bold text-blue-400">Q1. 매뉴얼 스튜디오는 어떤 프로그램인가요?</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    PC 화면 캡처부터 번호 스탬프(①, ②, ③), 강조 박스, 화살표, 지시선 말풍선 주석을 작성하고 단축키 F10 한 번으로 파워포인트(PPT) 및 구글 슬라이드에 새 슬라이드를 자동 생성·삽입하는 초고속 업무 매뉴얼 제작 전용 데스크톱 소프트웨어입니다.
                  </p>
                </div>

                <div className="border-b border-slate-800 pb-4 space-y-1.5">
                  <h3 className="text-sm font-bold text-blue-400">Q2. 기존 캡처 도구나 PPT 수작업 대비 어떤 편익이 있나요?</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    기존에는 화면을 캡처한 뒤 파워포인트로 가져와 자르고, 도형을 그리고, 번호 텍스트를 따로 입력하는 번거로운 다단계 작업이 필요했습니다. 매뉴얼 스튜디오는 단축키 F9(캡처)와 F10(PPT 자동 생성) 단 2단계로 축소하여 매뉴얼 제작 시간을 85% 이상 단축합니다.
                  </p>
                </div>

                <div className="border-b border-slate-800 pb-4 space-y-1.5">
                  <h3 className="text-sm font-bold text-blue-400">Q3. 별도 설치나 파이썬 환경이 필요한가요?</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    아닙니다. Nuitka C-컴파일러를 통해 순수 C 기계어로 사전 컴파일된 27.97MB 단일 무설치 포터블 바이너리(ManualStudio.exe)로 제공되므로, 별도의 파이썬이나 런타임 설치 없이 USB나 로컬 폴더에서 즉시 실행됩니다.
                  </p>
                </div>

                <div className="border-b border-slate-800 pb-4 space-y-1.5">
                  <h3 className="text-sm font-bold text-blue-400">Q4. 구글 슬라이드(Google Slides) 웹 브라우저에서도 사용 가능한가요?</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    네, 환경설정에서 내보내기 대상을 'Google Slides'로 선택하면 크롬, 엣지, 웨일 등 웹 브라우저의 구글 슬라이드 탭을 자동 감지하여 새 슬라이드 생성(Ctrl+M) 및 주석 완성 이미지 붙여넣기(Ctrl+V)를 1초 만에 자동 수행합니다.
                  </p>
                </div>

                <div className="border-b border-slate-800 pb-4 space-y-1.5">
                  <h3 className="text-sm font-bold text-blue-400">Q5. AI 에이전트(Claude, GPT, Cursor)에서도 제어할 수 있나요?</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    네, 매뉴얼 스튜디오는 LLM 에이전트 조작을 위한 AGENTS.md 표준 명세서, 헤드리스 CLI 인터페이스(ManualStudio.exe --cli), 및 Anthropic MCP(Model Context Protocol) 9대 전용 도구 서버(ManualStudio.exe --mcp)를 기본 탑재하고 있어 AI가 직접 캡처, 주석 합성, 다단계 매뉴얼 일괄 생성을 자율 수행할 수 있습니다.
                  </p>
                </div>

                <div className="border-b border-slate-800 pb-4 space-y-1.5">
                  <h3 className="text-sm font-bold text-blue-400">Q6. 지원하는 운영체제와 시스템 언어는 무엇인가요?</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Windows 10/11을 완벽 지원하며 macOS 호환 아키텍처(Cupertino UI)를 갖추고 있습니다. 언어는 한국어, 영어, 중국어, 일본어, 독일어, 스페인어, 프랑스어, 포르투갈어, 러시아어 등 전 세계 9개 주요 언어를 실시간 0.05초 핫스왑으로 지원합니다.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-blue-400">Q7. 평가판 사용 기한과 라이선스 정책은 어떻게 되나요?</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    공식 배포 평가판은 2026년 12월 31일까지 전 기능 무제한 무료 평가를 지원하며, 워터마크 없는 기업용 정규 라이선스는 1PC-1Key 노드락(Node-Lock) 영구 라이선스로 제공됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: 사용권 계약서 (EULA) */}
        {activeTab === "eula" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  소프트웨어 최종 사용자 라이선스 계약서 (EULA)
                </h2>
                <button
                  onClick={handleCopyEula}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedEula ? "복사 완료" : "전문 복사"}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl text-xs text-slate-300 space-y-3 leading-relaxed border border-slate-800 max-h-96 overflow-y-auto font-mono">
                <p><strong>(주)드래곤알피에이 소프트웨어 최종 사용자 라이선스 계약서 (EULA)</strong></p>
                <p>제1조 (목적): 본 계약은 회사가 개발한 소프트웨어에 대한 비독점적이고 양도 불가능한 사용 권한을 허여합니다.</p>
                <p>제2조 (지식재산권): 소프트웨어 일체의 지식재산권은 (주)드래곤알피에이에 배타적으로 귀속됩니다.</p>
                <p>제3조 (평가판): 2026년 12월 31일까지 비상업적 검토 및 기능 평가 목적으로 무상 사용할 수 있습니다.</p>
                <p>제4조 (금지행위): 소스코드 역공학, 디컴파일, 라이선스 검증 장치 우회, 무단 재판매 및 배포를 엄격히 금지합니다.</p>
                <p>제6조 (위약벌): 고의적 금지행위 위반 시 정규 라이선스 정가의 5배를 위약벌로 배상하여야 합니다.</p>
                <p>제7조 (관할): 본 계약 관련 분쟁은 회사 본점 소재지 관할 법원을 제1심 전속 관할 법원으로 합니다.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. 하단 푸터 */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/symbol-192.png" alt="DragonRPA" className="w-5 h-5 rounded bg-white p-0.5 object-contain" />
            <span>(주)드래곤알피에이 | 대표이사: 이정용 | 사업자등록번호: 312-87-03310</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>문의: contact@dragonrpa.co.kr</span>
            <Link href="/products" className="hover:text-slate-200">스토어</Link>
            <Link href="/about" className="hover:text-slate-200">회사소개</Link>
            <Link href="/portfolio" className="hover:text-slate-200">포트폴리오</Link>
            <span className="text-slate-700">|</span>
            <Link href="/admin/products" className="hover:text-blue-400 text-slate-500">관리자 CMS</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
