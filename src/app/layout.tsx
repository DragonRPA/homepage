import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.dragonrpa.co.kr"),
  title: "DragonRPA | 실무 중심 비즈니스 자동화 & 엔터프라이즈 렌탈 ERP",
  description: "기업의 인적자원은 반복적인 사무에 국한되기에는 너무나 중요합니다. 고객의 가치창출에 기여하는 비즈니스 자동화(RPA), 렌탈 자산 ERP, AI 음성 솔루션 전문 기업 (주)드래곤알피에이",
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://www.dragonrpa.co.kr",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DragonRPA",
  },
  keywords: [
    "DragonRPA", "드래곤알피에이", "업무자동화", "RPA", "렌탈 ERP", 
    "고소작업대 ERP", "자산관리", "배차관리", "AutoLog Tax", "운행기록부", 
    "Label Print Station", "Space Advisor", "Whisper STT", "비즈니스 자동화"
  ],
  authors: [{ name: "(주)드래곤알피에이", url: "https://www.dragonrpa.co.kr" }],
  openGraph: {
    title: "DragonRPA | 실무 중심 비즈니스 자동화 & 엔터프라이즈 렌탈 ERP",
    description: "기업의 인적자원은 반복적인 사무에 국한되기에는 너무나 중요합니다. 우리는 고객의 가치창출에 기여하는 것에 자부심을 느낍니다.",
    url: "https://www.dragonrpa.co.kr",
    siteName: "DragonRPA",
    images: [
      {
        url: "/logo.png",
        width: 286,
        height: 278,
        alt: "DragonRPA CI Logo",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DragonRPA | 비즈니스 자동화 & 엔터프라이즈 렌탈 ERP",
    description: "기업의 인적자원은 반복적인 사무에 국한되기에는 너무나 중요합니다. 우리는 고객의 가치창출에 기여하는 것에 자부심을 느낍니다.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.dragonrpa.co.kr/#organization",
        "name": "(주)드래곤알피에이",
        "alternateName": "DragonRPA Co., Ltd.",
        "url": "https://www.dragonrpa.co.kr",
        "logo": "https://www.dragonrpa.co.kr/logo.png",
        "slogan": "기업의 인적자원은 반복적인 사무에 국한되기에는 너무나 중요합니다. 우리는 고객의 가치창출에 기여하는 것에 자부심을 느낍니다.",
        "description": "기업의 인적자원이 반복 사무를 넘어 본원적 가치창출에 기여할 수 있도록 돕는 비즈니스 자동화 & 기간계 ERP 파트너",
        "founder": {
          "@type": "Person",
          "name": "이정용",
          "jobTitle": "대표이사",
          "description": "기업의 인적자원이 가치 있는 일에 집중할 수 있도록 돕는 비즈니스 자동화 및 엔터프라이즈 ERP 아키텍트"
        },
        "knowsAbout": [
          "Enterprise Rental ERP",
          "Internal Control over Financial Reporting (ICFR)",
          "IT General Controls (ITGC) & IT Application Controls (ITAC)",
          "Robotic Process Automation",
          "Windows UI Automation (UIA 3.0)",
          "Speech-To-Text (Whisper)",
          "Generative AI",
          "Tax Automation (AutoLog Tax)",
          "Zebra ZPL II Label Printing"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://www.dragonrpa.co.kr/#website",
        "url": "https://www.dragonrpa.co.kr",
        "name": "DragonRPA",
        "publisher": {
          "@id": "https://www.dragonrpa.co.kr/#organization"
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "e-Bro ERP",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, Windows, Android, iOS",
        "description": "산업장비/고소작업대 15대 라이프사이클 체인 통합 기간계 렌탈 ERP 및 실시간 PTT 음성 비서",
        "offers": {
          "@type": "Offer",
          "availability": "https://schema.org/InStock",
          "price": "0",
          "priceCurrency": "KRW"
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "AutoLog Tax",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web Browser",
        "description": "국세청 표준 양식 업무용승용차 운행기록부 월별 분할 엑셀 자동화 시스템",
        "url": "https://dragonrpa.github.io/AutoLog_Tax/"
      },
      {
        "@type": "SoftwareApplication",
        "name": "Label Print Station",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web Browser, Bluetooth",
        "description": "Zebra ZPL II 노코드 비주얼 캔버스 디자이너 및 블루투스 스캐너 1초 무인 다이렉트 라벨 출력기",
        "url": "https://dragonrpa.github.io/LabelPrintStation/"
      },
      {
        "@type": "SoftwareApplication",
        "name": "Manual Studio (매뉴얼 스튜디오)",
        "applicationCategory": "BusinessApplication, UtilityApplication",
        "operatingSystem": "Windows 10, Windows 11 (64-bit)",
        "description": "업무 화면 캡처부터 1·2·3 자동 번호 부여, 민감정보 블러, 설명 작성, 파워포인트(PPTX) 자동 생성까지 지원하는 Nuitka C 기계어 컴파일 무설치 매뉴얼 제작 도구",
        "url": "https://www.dragonrpa.co.kr/manual-studio",
        "downloadUrl": "https://www.dragonrpa.co.kr/downloads/ManualStudio.exe",
        "offers": {
          "@type": "Offer",
          "availability": "https://schema.org/InStock",
          "price": "0",
          "priceCurrency": "KRW"
        }
      }
    ]
  };

  return (
    <html lang="ko" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}