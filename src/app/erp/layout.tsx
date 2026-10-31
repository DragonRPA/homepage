import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "드래곤알피에이 ERP | 경영자 웹앱",
  description: "(주)드래곤알피에이 경영지표·입출금·세금계산서·급여·전자결재 통합 ERP",
  manifest: "/erp-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "드래곤ERP",
  },
};

export default function ErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
