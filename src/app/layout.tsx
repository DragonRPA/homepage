import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "DragonRPA | 업무 자동화 및 프로젝트 포트폴리오",
  description: "B2B 업무 프로세스 자동화(RPA), 렌탈 자산 관리 ERP, 국가 공공데이터포털 API 데이터 파이프라인 전문 기업 (주)드래곤알피에이",
  manifest: "/manifest.json",
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
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="scroll-smooth">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}