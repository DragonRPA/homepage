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
  title: "DragonRPA | 업무 자동화 및 프로젝트 포트폴리오",
  description: "B2B 업무 프로세스 자동화(RPA), 렌탈 자산 관리 ERP, 국가 공공데이터포털 API 데이터 파이프라인 전문 기업 (주)드래곤알피에이",
  manifest: "/manifest.json",
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
  keywords: ["RPA", "업무자동화", "공공데이터", "ERP", "자산관리", "배차관리", "DragonRPA", "드래곤알피에이", "포트폴리오"],
  authors: [{ name: "(주)드래곤알피에이" }],
  openGraph: {
    title: "DragonRPA | 업무 자동화 및 프로젝트 포트폴리오",
    description: "B2B 업무 프로세스 자동화, 렌탈 자산 ERP, 공공데이터포털 API 데이터 파이프라인",
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
        "description": "18년 코스피 상장 종합 렌탈사 도메인 전문성과 지능형 비즈니스 자동화(RPA, AI, ERP)의 융합",
        "founder": {
          "@type": "Person",
          "name": "이정용",
          "jobTitle": "대표이사 (18년 코스피 상장 렌탈사 총괄 경력)",
          "description": "산업장비/건설기계/특수설비 렌탈 비즈니스 라이프사이클 및 ERP 아키텍처 최고 전문가"
        },
        "knowsAbout": [
          "Enterprise Rental ERP",
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