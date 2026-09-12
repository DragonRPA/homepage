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
  ChevronRight
} from "lucide-react";

export default function ManualStudioPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "dictionary" | "shortcuts" | "eula">("overview");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedEula, setCopiedEula] = useState(false);

  const handleCopyEmail = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText("77.victor.lee@gmail.com");
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
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
(주)드래곤알피에이 (DragonRPA Co., Ltd.) | 대표이사: 이정용 | 문의: 77.victor.lee@gmail.com`;

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
                <span className="text-[10px] text-slate-400 mt-0.5">매뉴얼 스튜디오</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/downloads/ManualStudio.exe"
              download="ManualStudio.exe"
              className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>다운로드 (27.97 MB)</span>
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
                  v1.2.0 평가판 (~2026.12.31)
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 whitespace-nowrap">
                  Nuitka C 기계어
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700/60 whitespace-nowrap">
                  무설치 단일 EXE
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                매뉴얼 스튜디오 (Manual Studio)
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                업무 화면 캡처부터 1·2·3 자동 번호 부여, 민감정보 블러, 설명 작성, 파워포인트(PPTX) 자동 생성까지 한 화면에서 원스톱으로 처리하는 실무 매뉴얼 제작 소프트웨어입니다.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5 w-full sm:w-auto">
              <a
                href="/downloads/ManualStudio.exe"
                download="ManualStudio.exe"
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>EXE 다운로드 (27.97 MB)</span>
              </a>
              <div className="text-[11px] text-slate-400 text-center">
                Windows 10/11 64-bit 지원
              </div>
            </div>
          </div>
        </section>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-slate-800 gap-2">
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
                <div className="text-[11px] text-emerald-400 mt-1">58.4MB ➔ 27.97MB</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">실행 형태</div>
                <div className="text-xl font-bold text-white mt-1">단일 실행 파일</div>
                <div className="text-[11px] text-slate-400 mt-1">무설치 즉시 실행</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">빌드 엔진</div>
                <div className="text-xl font-bold text-white mt-1">Nuitka C 기계어</div>
                <div className="text-[11px] text-blue-400 mt-1">GCC 15.2 네이티브</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">평가판 기한</div>
                <div className="text-xl font-bold text-amber-400 mt-1">2026. 12. 31</div>
                <div className="text-[11px] text-slate-400 mt-1">전 기능 무상 제공</div>
              </div>
            </div>

            {/* 다운로드 실행 배너 */}
            <div className="bg-blue-950/30 border border-blue-800/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-blue-300">
                  무설치 즉시 실행 파일 다운로드
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  별도 설치 마법사나 Python 런타임 없이 다운로드 후 더블클릭하면 0.5초 만에 실행됩니다.
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

            {/* 4단계 실무 워크플로우 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                4단계 실무 매뉴얼 제작 순서
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400">1단계: 화면 캡처</span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">Ctrl+Shift+S</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    매뉴얼을 작성할 업무 화면(웹, ERP, 엑셀 등)에서 단축키를 눌러 설명 대상 영역을 캡처합니다.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400">2단계: 자동 순번 부여</span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">순번 도구 [N]</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    클릭하는 순서대로 1, 2, 3... 원형 번호 배지가 자동 생성되어 업무 조작 순서를 직관적으로 표기합니다.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400">3단계: 주석 및 민감정보 보호</span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">블러 [B] / 박스 [R]</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    강조 테두리를 두르고, 개인정보나 계좌번호 등 대외비 영역은 블러(모자이크) 도구로 안전하게 가립니다.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400">4단계: PPT 자동 생성</span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">Ctrl+E</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    슬라이드 표지, 목차, 캡처 이미지, 단계별 설명이 표준 서식으로 정렬된 파워포인트 파일(.pptx)을 즉시 생성합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 기술 사양 및 라이선스 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                기술 사양 및 소프트웨어 권리 보호 안내
              </h2>
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  • <strong>빌드 방식</strong>: Python 소스코드를 GCC 15.2 C-컴파일러를 통해 순수 x86-64 기계어 코드로 직접 변환하여 역공학(디컴파일) 위험을 원천 차단했습니다.
                </p>
                <p>
                  • <strong>평가판 사용</strong>: 2026년 12월 31일까지 누구나 전 기능(캡처, 주석 편집, PPT 생성)을 기간 제한 없이 무료로 활용할 수 있습니다.
                </p>
                <p>
                  • <strong>도입 및 라이선스 문의</strong>: 상용 도입, 커스터마이징, 사내 표준 서식 템플릿 연동 문의는 아래 문의처로 연락 바랍니다.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3 text-xs">
                <span className="text-slate-400">문의: 77.victor.lee@gmail.com</span>
                <button
                  onClick={handleCopyEmail}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] border border-slate-700 transition-colors"
                >
                  {copiedEmail ? "복사됨" : "이메일 복사"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 메뉴 및 기능버튼 사전 */}
        {activeTab === "dictionary" && (
          <div className="space-y-6">
            {/* 메뉴바 기능 사전 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                상단 메뉴바 기능 명세
              </h2>

              <div className="space-y-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-blue-400 flex items-center gap-2">
                    <span>1. 파일(F) 메뉴</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>• <strong>새 프로젝트 (Ctrl+N)</strong>: 신규 매뉴얼 문서 작업 생성</div>
                    <div>• <strong>열기 (Ctrl+O)</strong>: 저장된 .ms 매뉴얼 프로젝트 파일 로드</div>
                    <div>• <strong>저장 (Ctrl+S)</strong>: 현재 편집 중인 모든 슬라이드/주석 저장</div>
                    <div>• <strong>PPT 내보내기 (Ctrl+E)</strong>: 표준 파워포인트(.pptx) 파일 생성</div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-blue-400 flex items-center gap-2">
                    <span>2. 편집(E) 메뉴</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>• <strong>실행 취소 (Ctrl+Z)</strong>: 마지막 주석/편집 작업 롤백</div>
                    <div>• <strong>다시 실행 (Ctrl+Y)</strong>: 취소된 작업 재적용</div>
                    <div>• <strong>전체 선택 (Ctrl+A)</strong>: 캔버스 내 모든 주석 개체 선택</div>
                    <div>• <strong>삭제 (Delete)</strong>: 선택된 주석 개체 삭제</div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-blue-400 flex items-center gap-2">
                    <span>3. 도구(T) & 도움말(H) 메뉴</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>• <strong>영역 캡처 (Ctrl+Shift+S)</strong>: 드래그 영역 화면 캡처</div>
                    <div>• <strong>창 캡처</strong>: 특정 활성 윈도우 창 단일 캡처</div>
                    <div>• <strong>전체 화면 캡처</strong>: 모니터 전체 화면 캡처</div>
                    <div>• <strong>프로그램 정보 (About)</strong>: 버전, 평가판 기한, 라이선스 확인</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 툴바 주석 도구 사전 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                툴바 기능버튼 사전
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Maximize2 className="w-4 h-4 text-blue-400" />
                    <span>선택 도구 (단축키: V)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    캔버스에 배치된 번호 배지, 테두리 박스, 텍스트 개체를 이동하거나 크기를 조정합니다.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Hash className="w-4 h-4 text-blue-400" />
                    <span>순번 부여 도구 (단축키: N)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    마우스로 클릭할 때마다 1, 2, 3... 원형 번호 배지가 자동 생성되며 우측 리스트에 입력 필드가 동기화됩니다.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Square className="w-4 h-4 text-blue-400" />
                    <span>사각형 테두리 도구 (단축키: R)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    강조할 버튼이나 입력창 주변에 선명한 테두리 박스를 드래그하여 표시합니다.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <EyeOff className="w-4 h-4 text-blue-400" />
                    <span>블러 / 모자이크 도구 (단축키: B)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    주민번호, 계좌번호, 고객사 명칭 등 외부 반출이 불가한 민감 영역을 드래그하여 흐리게 처리합니다.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Type className="w-4 h-4 text-blue-400" />
                    <span>텍스트 박스 도구 (단축키: T)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    이미지 위에 직접 설명 텍스트나 가이드 문구를 삽입합니다.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Presentation className="w-4 h-4 text-blue-400" />
                    <span>PPT 내보내기 (단축키: Ctrl+E)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    작성된 모든 슬라이드와 설명 텍스트를 정형화된 파워포인트 양식으로 변환하여 저장합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 단축키 및 실무 가이드 */}
        {activeTab === "shortcuts" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-blue-400" />
                단축키 일람표
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">기능</th>
                      <th className="py-2.5 px-3">단축키</th>
                      <th className="py-2.5 px-3">설명</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">영역 캡처</td>
                      <td className="py-2 px-3 font-mono text-blue-400 font-bold">Ctrl + Shift + S</td>
                      <td className="py-2 px-3">화면의 특정 영역을 마우스 드래그로 즉시 캡처</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">새 매뉴얼</td>
                      <td className="py-2 px-3 font-mono text-blue-400 font-bold">Ctrl + N</td>
                      <td className="py-2 px-3">새 매뉴얼 문서 작업 시작</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">프로젝트 저장</td>
                      <td className="py-2 px-3 font-mono text-blue-400 font-bold">Ctrl + S</td>
                      <td className="py-2 px-3">현재 작성 중인 매뉴얼 프로젝트 저장</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">PPT 생성</td>
                      <td className="py-2 px-3 font-mono text-blue-400 font-bold">Ctrl + E</td>
                      <td className="py-2 px-3">파워포인트(.pptx) 파일로 일괄 변환 내보내기</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">순번 부여</td>
                      <td className="py-2 px-3 font-mono text-blue-400 font-bold">N</td>
                      <td className="py-2 px-3">클릭할 때마다 1, 2, 3 자동 증가 배지 생성</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">테두리 사각형</td>
                      <td className="py-2 px-3 font-mono text-blue-400 font-bold">R</td>
                      <td className="py-2 px-3">강조 테두리 박스 그리기</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">민감정보 블러</td>
                      <td className="py-2 px-3 font-mono text-blue-400 font-bold">B</td>
                      <td className="py-2 px-3">대외비/개인정보 영역 모자이크 처리</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">텍스트 삽입</td>
                      <td className="py-2 px-3 font-mono text-blue-400 font-bold">T</td>
                      <td className="py-2 px-3">이미지 내 설명 문구 작성</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">선택 / 이동</td>
                      <td className="py-2 px-3 font-mono text-blue-400 font-bold">V</td>
                      <td className="py-2 px-3">개체 선택, 이동 및 크기 조절</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">실행 취소</td>
                      <td className="py-2 px-3 font-mono text-blue-400 font-bold">Ctrl + Z</td>
                      <td className="py-2 px-3">직전 편집 작업 롤백</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-white">삭제</td>
                      <td className="py-2 px-3 font-mono text-blue-400 font-bold">Delete</td>
                      <td className="py-2 px-3">선택된 개체 삭제</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 최종 사용자 라이선스 계약서 (EULA) */}
        {activeTab === "eula" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    <span>최종 사용자 라이선스 계약서 (EULA)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    End User License Agreement for Manual Studio | (주)드래곤알피에이 (DragonRPA Co., Ltd.)
                  </p>
                </div>
                <button
                  onClick={handleCopyEula}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>{copiedEula ? "계약서 복사됨" : "전체 계약서 복사"}</span>
                </button>
              </div>

              {/* 계약서 전문 박스 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-5 text-xs text-slate-300 leading-relaxed font-sans">
                <p className="text-slate-200">
                  본 계약은 <strong>(주)드래곤알피에이</strong>(이하 &quot;회사&quot;)와 본 소프트웨어 <strong>&apos;매뉴얼 스튜디오(Manual Studio)&apos;</strong>(이하 &quot;소프트웨어&quot;)를 다운로드, 복사, 설치 또는 사용하는 개인 또는 법인(이하 &quot;사용자&quot;) 간에 체결되는 법적 구속력을 가진 사용권 계약입니다. 사용자가 본 &quot;소프트웨어&quot;를 다운로드, 설치 또는 사용하는 것은 본 계약 조건에 동의한 것으로 간주됩니다.
                </p>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-blue-400">제1조 (목적)</h3>
                  <p>
                    본 계약은 &quot;회사&quot;가 개발한 &quot;소프트웨어&quot;에 대한 비독점적이고 양도 불가능한 사용 권한을 &quot;사용자&quot;에게 허여하고, 당사자 간의 권리 및 의무, 책임 사항을 규정함을 목적으로 합니다.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-blue-400">제2조 (지식재산권의 귀속)</h3>
                  <p>
                    1. 본 &quot;소프트웨어&quot;, 관련 설명 문서, 소스코드, 바이너리, 그래픽, UI/UX 디자인에 대한 저작권, 특허권, 상표권, 영업비밀 등 일체의 지식재산권은 대한민국 저작권법 및 국제 저작권 협약에 따라 <strong>(주)드래곤알피에이</strong>에 배타적으로 귀속됩니다.<br />
                    2. 본 계약에 따른 제공은 소유권의 이전이 아니며, 명시된 조건 범위 내에서의 <strong>&apos;제한적 사용권(License)&apos;</strong>만을 허여합니다.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-blue-400">제3조 (사용권의 범위 및 조건)</h3>
                  <p>
                    1. <strong>[평가판 (Trial License)]</strong>: &quot;회사&quot;가 공지한 평가판은 명시된 사용 유효 기간(2026년 12월 31일까지) 동안 비상업적 검토, 기능 테스트 및 평가 목적으로만 무상 사용할 수 있습니다. 유효 기간 만료 후에는 정규 라이선스 없이 계속 사용할 수 없습니다.<br />
                    2. <strong>[정규 라이선스 (Commercial License)]</strong>: 정식 라이선스는 1개의 라이선스 키당 지정된 단일 하드웨어 머신(1PC-1Key 노드락)에서만 설치 및 실행이 허용됩니다.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-blue-400">제4조 (금지 행위 - 역공학 및 무단 배포 금지)</h3>
                  <p>
                    &quot;사용자&quot;는 다음 각 호의 행위를 하여서는 아니 되며, 위반 시 저작권법 및 부정경쟁방지법 등에 따른 민·형사상 법적 책임을 집니다.<br />
                    • <strong>역공학 및 디컴파일 금지</strong>: 소스코드나 내부 알고리즘을 추출하기 위한 리버스 엔지니어링, 역컴파일(Decompilation), 디스어셈블(Disassembly) 또는 코드 수정 행위<br />
                    • <strong>보안 메커니즘 조작 금지</strong>: 하드웨어 식별값(HWID), 시계 변조 방지, 암호화 키 등 라이선스 검증 장치를 우회, 변조, 크랙(Cracking)하는 행위<br />
                    • <strong>무단 재배포 및 재판매 금지</strong>: &quot;회사&quot;의 사전 서면 승인 없이 제3자에게 유상 판매, 대여, 양도하거나 온라인 자료실/P2P/공중망에 무단 배포하는 행위<br />
                    • <strong>저작권 표시 삭제 금지</strong>: &quot;소프트웨어&quot; 내에 표시된 &quot;회사&quot;의 상표, 로고, 저작권 안내문, 평가판 기한 등의 법적 고지 사항을 임의로 변경, 제거하는 행위
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-blue-400">제5조 (보증의 한계 및 면책)</h3>
                  <p>
                    1. 본 &quot;소프트웨어&quot;는 <strong>&quot;있는 그대로(AS-IS)&quot;</strong> 제공되며, &quot;회사&quot;는 특정 목적에의 적합성, 무결성 등에 대해 명시적 또는 묵시적 보증을 하지 않습니다.<br />
                    2. &quot;회사&quot;는 &quot;소프트웨어&quot;의 사용 또는 사용 불능으로 인하여 발생하는 간접적, 부수적 손해(영업손실, 데이터 손실 등)에 대해 책임을 지지 않습니다.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-blue-400">제6조 (위약벌 및 손해배상)</h3>
                  <p>
                    &quot;사용자&quot;가 제4조(금지 행위)를 고의 또는 중과실로 위반한 경우, <strong>정규 라이선스 정가의 5배에 해당하는 금액을 위약벌로 회사에 즉시 지급</strong>하여야 하며, 이와 별도로 회사가 입은 실제 손해를 전액 배상하여야 합니다.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-blue-400">제7조 (준거법 및 전속 관할)</h3>
                  <p>
                    본 계약은 대한민국 법률에 따라 규율되며, 본 계약과 관련하여 발생하는 모든 분쟁은 <strong>(주)드래곤알피에이 본점 소재지를 관할하는 법원을 제1심 전속 관할 법원</strong>으로 합니다.
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400">
                  공고일자: 2026년 09월 11일 | 시행일자: 2026년 09월 11일<br />
                  저작권자: (주)드래곤알피에이 (DragonRPA Co., Ltd.) | 대표이사: 이정용 | 문의: 77.victor.lee@gmail.com
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. 하단 푸터 */}
      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 border-t border-slate-900 py-6">
        <p>
          Copyright © 2026 DragonRPA Co., Ltd. All rights reserved. |{" "}
          <Link href="/about" className="hover:text-slate-400">회사소개</Link> |{" "}
          <Link href="/portfolio" className="hover:text-slate-400">포트폴리오</Link>
        </p>
      </footer>
    </div>
  );
}
