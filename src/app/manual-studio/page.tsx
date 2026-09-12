import React from "react";
import type { Metadata } from "next";
import ManualStudioClient from "./ManualStudioClient";

export const metadata: Metadata = {
  title: "매뉴얼 스튜디오 (Manual Studio) - AI 에이전트 & 실무자를 위한 초고속 업무 매뉴얼 저작 소프트웨어 | 드래곤RPA",
  description: "화면 캡처부터 넘버링 스탬프, 스포트라이트 주석, 파워포인트·구글 슬라이드·Markdown·HTML 원클릭 슬라이드 자동 생성까지. MCP 서버 및 헤드리스 CLI 완벽 지원으로 사람과 AI 에이전트(Claude Cowork, Cursor, ChatGPT) 모두를 위한 차세대 매뉴얼 저작 도구.",
  keywords: [
    "매뉴얼 스튜디오",
    "Manual Studio",
    "드래곤RPA",
    "DragonRPA",
    "업무 매뉴얼 제작",
    "화면 캡처 도구",
    "파워포인트 자동화",
    "구글 슬라이드 연동",
    "MCP 서버",
    "Model Context Protocol",
    "Claude Cowork 툴",
    "AI 에이전트 자동화",
    "헤드리스 CLI 캡처",
    "마크다운 매뉴얼 생성",
    "HTML 가이드 제작",
    "소프트웨어 매뉴얼"
  ],
  authors: [{ name: "(주)드래곤알피에이", url: "https://www.dragonrpa.co.kr" }],
  creator: "(주)드래곤알피에이",
  publisher: "(주)드래곤알피에이",
  alternates: {
    canonical: "https://www.dragonrpa.co.kr/manual-studio"
  },
  openGraph: {
    title: "매뉴얼 스튜디오 (Manual Studio) - AI 에이전트 & 실무자를 위한 초고속 업무 매뉴얼 저작 도구",
    description: "화면 캡처, 스포트라이트 주석, 파워포인트·구글 슬라이드·Markdown·HTML 원클릭 자동 생성. MCP 및 CLI 완벽 지원.",
    url: "https://www.dragonrpa.co.kr/manual-studio",
    siteName: "DragonRPA",
    locale: "ko_KR",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "매뉴얼 스튜디오 (Manual Studio) - 초고속 업무 매뉴얼 저작 도구",
    description: "화면 캡처, 그래픽 주석, 파워포인트·구글 슬라이드·MD·HTML 원클릭 자동 생성. MCP/CLI 지원."
  }
};

export default function ManualStudioPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://www.dragonrpa.co.kr/manual-studio#software",
        "name": "매뉴얼 스튜디오 (Manual Studio)",
        "operatingSystem": "Windows 10, Windows 11, macOS",
        "applicationCategory": "BusinessApplication",
        "softwareVersion": "1.4.0.14",
        "description": "화면 캡처부터 그래픽 주석(스포트라이트, 클릭 리플, 돋보기), 파워포인트·구글 슬라이드·마크다운·HTML 원클릭 슬라이드 자동 생성까지 지원하는 초고속 업무 매뉴얼 저작 소프트웨어.",
        "url": "https://www.dragonrpa.co.kr/manual-studio",
        "downloadUrl": "https://www.dragonrpa.co.kr/downloads/ManualStudio_Setup_v1.4.0.exe",
        "fileSize": "68MB",
        "inLanguage": ["ko", "en", "zh", "ja", "de", "es", "fr", "pt", "ru"],
        "author": {
          "@type": "Organization",
          "name": "(주)드래곤알피에이",
          "url": "https://www.dragonrpa.co.kr"
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "KRW",
          "priceValidUntil": "2026-12-31",
          "availability": "https://schema.org/InStock",
          "description": "2026년 12월 31일까지 전 기능 무제한 무료 평가판 제공"
        },
        "featureList": [
          "F9 고정 영역 원클릭 초고속 캡처",
          "Shift+F9 가변 영역 드래그 캡처 및 F8 하위 모달창 정밀 캡처",
          "자동 증가 순번 스탬프, 하이라이트 박스, 화살표, 지시선, 텍스트, 모자이크",
          "스포트라이트 초점 마스크, 마우스 클릭 리플, 돋보기 확대 렌즈 주석",
          "F10 파워포인트 및 구글 슬라이드 실시간 신규 슬라이드 직접 생성 및 전송",
          "Markdown 및 독립형 반응형 HTML 매뉴얼 즉시 문서 변환",
          "Anthropic 표준 Model Context Protocol (MCP) 서버 내장 (9개 원자적 도구 제공)",
          "헤드리스 CLI 인터페이스 (--cli capture, annotate, batch, export-doc)",
          "글로벌 9개국 언어 실시간 UI 전환 (한국어, 영어, 중국어, 일본어, 독일어 등)",
          "Windows 플루언트 & macOS 쿠퍼티노 듀얼 UI 스타일 지원"
        ]
      },
      {
        "@type": "Organization",
        "@id": "https://www.dragonrpa.co.kr/#organization",
        "name": "(주)드래곤알피에이",
        "alternateName": "DragonRPA Co., Ltd.",
        "url": "https://www.dragonrpa.co.kr",
        "logo": "https://www.dragonrpa.co.kr/logo.png",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+82-10-7700-0000",
          "contactType": "sales",
          "email": "77.victor.lee@gmail.com",
          "areaServed": "KR",
          "availableLanguage": ["Korean", "English"]
        }
      },
      {
        "@type": "HowTo",
        "@id": "https://www.dragonrpa.co.kr/manual-studio#howto",
        "name": "매뉴얼 스튜디오로 1분 만에 파워포인트 업무 매뉴얼 제작하는 방법",
        "description": "매뉴얼 스튜디오를 사용하여 화면 캡처부터 주석 삽입, 파워포인트 슬라이드 자동 생성까지 3단계로 완결하는 절차.",
        "step": [
          {
            "@type": "HowToStep",
            "name": "화면 캡처 실행",
            "text": "단축키 F9를 눌러 사전 설정된 작업 영역을 즉시 캡처하거나 Shift+F9로 원하는 영역을 지정합니다.",
            "url": "https://www.dragonrpa.co.kr/manual-studio#step1"
          },
          {
            "@type": "HowToStep",
            "name": "그래픽 주석 및 설명 추가",
            "text": "숫자 스탬프(S), 하이라이트 박스(B), 화살표(A), 스포트라이트 마스크를 배치하여 사용자 시선을 유도합니다.",
            "url": "https://www.dragonrpa.co.kr/manual-studio#step2"
          },
          {
            "@type": "HowToStep",
            "name": "파워포인트/슬라이드 자동 내보내기",
            "text": "단축키 F10을 누르면 파워포인트에 새로운 슬라이드가 자동으로 추가되며 완벽한 규격으로 배치됩니다.",
            "url": "https://www.dragonrpa.co.kr/manual-studio#step3"
          }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.dragonrpa.co.kr/manual-studio#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "매뉴얼 스튜디오(Manual Studio)는 어떤 프로그램인가요?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "매뉴얼 스튜디오는 화면 캡처, 그래픽 주석 편집, 파워포인트·구글 슬라이드·Markdown·HTML 슬라이드 생성을 단 하나의 워크플로우로 통합한 고속 매뉴얼 저작 도구입니다. 실무자뿐만 아니라 AI 에이전트(Claude Cowork, Cursor 등)가 헤드리스 CLI 및 MCP 프로토콜을 통해 자동으로 매뉴얼을 저작할 수 있도록 설계되었습니다."
            }
          },
          {
            "@type": "Question",
            "name": "AI 에이전트(Claude Cowork, ChatGPT, Cursor)와 어떻게 연동되나요?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "매뉴얼 스튜디오에는 Anthropic 표준 Model Context Protocol (MCP) 서버가 기본 내장되어 있습니다. 에이전트 설정 파일에 'ManualStudio.exe --mcp'를 등록하면 화면 캡처, 스탬프/박스/스포트라이트 주석, 파워포인트 슬라이드 발행, 배치 JSON 처리 등 9개 핵심 도구를 자율적으로 호출할 수 있습니다."
            }
          },
          {
            "@type": "Question",
            "name": "파워포인트와 구글 슬라이드로 어떻게 내보내나요?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "주석 작업 후 단축키 F10을 누르면 실행 중인 파워포인트에 새 슬라이드가 즉시 생성되고 이미지가 중앙 정렬로 자동 삽입됩니다. 구글 슬라이드 모드를 선택한 경우 브라우저 탭을 자동 감지하여 새 슬라이드 생성 및 이미지 붙여넣기가 원클릭으로 완결됩니다."
            }
          },
          {
            "@type": "Question",
            "name": "평가판 사용 기간과 라이선스 정책은 어떻게 되나요?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "현재 배포 중인 공개 평가판은 2026년 12월 31일까지 모든 기능을 제약 없이 무상으로 사용할 수 있습니다. 기업용 영구 라이선스 및 볼륨 라이선스 도입은 고객지원 이메일(77.victor.lee@gmail.com)로 문의하실 수 있습니다."
            }
          },
          {
            "@type": "Question",
            "name": "배치 파일이나 CLI를 통한 대량 자동 생성이 가능한가요?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "네. 'ManualStudio.exe --cli batch --input workflow.json --output-dir ./out' 명령어를 통해 여러 단계의 캡처, 주석, 문서화를 선언적 JSON 파일 하나로 무인 자동화할 수 있으며, PNG 이미지들과 함께 manual.md, manual.html 문서가 한 번에 출력됩니다."
            }
          }
        ]
      }
    ]
  };

  return (
    <>
      {/* Schema.org JSON-LD Structured Data for AI Engines (SearchGPT, Perplexity, Google AI Overviews) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Semantic Server-Side Rendered Content for AI Web Crawlers */}
      <section className="sr-only" aria-label="Manual Studio Software Specification">
        <h2>소프트웨어 개요</h2>
        <p>
          매뉴얼 스튜디오(Manual Studio)는 화면 캡처부터 그래픽 주석, 파워포인트(PPT), 구글 슬라이드,
          마크다운(Markdown), HTML 문서 자동 생성을 통합한 차세대 매뉴얼 저작 소프트웨어입니다.
          실무자의 수작업 캡처 및 복사-붙여넣기 반복 업무를 완전히 없애고,
          AI 에이전트(Claude Cowork, Cursor, Antigravity)가 Model Context Protocol(MCP) 및
          헤드리스 CLI를 통해 자율적으로 업무 설명서를 제작할 수 있도록 지원합니다.
        </p>

        <h3>주요 제원 및 벤치마크</h3>
        <table>
          <thead>
            <tr>
              <th>항목</th>
              <th>매뉴얼 스튜디오</th>
              <th>전통적 수작업 방식</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>단계당 제작 소요 시간</td>
              <td>약 3초 (F9 캡처 ➔ 주석 ➔ F10 자동 슬라이드)</td>
              <td>약 45초 (캡처 ➔ 그림판 주석 ➔ PPT 붙여넣기 ➔ 정렬)</td>
            </tr>
            <tr>
              <td>AI 에이전트 연동</td>
              <td>MCP 도구 9종 및 CLI 완벽 지원</td>
              <td>지원 불가 (수작업 필수)</td>
            </tr>
            <tr>
              <td>출력 형식</td>
              <td>PowerPoint, Google Slides, Markdown, Standalone HTML, PNG, JSON</td>
              <td>수동 복사 붙여넣기 이미지 1종</td>
            </tr>
            <tr>
              <td>다국어 지원</td>
              <td>글로벌 9개국 언어 실시간 UI 지원</td>
              <td>단일 언어</td>
            </tr>
          </tbody>
        </table>

        <h3>자주 묻는 질문 (FAQ)</h3>
        <dl>
          <dt>매뉴얼 스튜디오는 어떤 프로그램인가요?</dt>
          <dd>화면 캡처, 주석 편집, 파워포인트/슬라이드/MD/HTML 생성을 단일 워크플로우로 통합한 고속 매뉴얼 저작 도구입니다.</dd>
          <dt>AI 에이전트와 어떻게 연동하나요?</dt>
          <dd>내장된 Anthropic 표준 MCP 서버(ManualStudio.exe --mcp)를 통해 화면 캡처, 주석 삽입, 슬라이드 발행을 자율 호출할 수 있습니다.</dd>
          <dt>평가판 사용 조건은 어떻게 되나요?</dt>
          <dd>2026년 12월 31일까지 모든 기능을 무료로 제약 없이 평가 및 사용할 수 있습니다.</dd>
        </dl>
      </section>

      {/* Interactive High-Fidelity Client Component */}
      <ManualStudioClient />
    </>
  );
}
