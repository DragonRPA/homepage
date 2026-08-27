import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DragonRPA | 업무 자동화 및 공공데이터 솔루션",
  description: "B2B 업무 프로세스 자동화(RPA), 렌탈 자산 관리 ERP, 국가 공공데이터포털(data.go.kr) API 데이터 파이프라인 구축 전문 기업 (주)드래곤알피에이",
  keywords: ["RPA", "업무자동화", "공공데이터", "data.go.kr", "ERP", "자산관리", "배차관리", "DragonRPA", "드래곤알피에이"],
  authors: [{ name: "(주)드래곤알피에이" }],
  openGraph: {
    title: "DragonRPA | 업무 자동화 및 공공데이터 솔루션",
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
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}