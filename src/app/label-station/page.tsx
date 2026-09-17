import React from "react";
import type { Metadata } from "next";
import LabelStationClient from "./LabelStationClient";

export const metadata: Metadata = {
  title: "라벨스테이션 (Label Print Station) - 1초 Zebra 바코드 무인 출력 & 엑셀 ERP 자동화 소프트웨어 | 드래곤RPA",
  description: "블루투스 바코드 스캔 즉시 0.1초 DB 조회 및 1초 Zebra(GK420, ZD420, ZT411) 라벨 직통 출력. 웹 캔버스 비주얼 디자이너와 엑셀 ➔ 사내 ERP 자동 등록 RPA를 통합한 올인원 라벨 자동화 솔루션.",
  keywords: [
    "라벨스테이션",
    "Label Print Station",
    "Zebra 라벨 출력",
    "바코드 라벨 출력 프로그램",
    "QR코드 라벨 인쇄",
    "자산관리 라벨",
    "물류 바코드 출력",
    "드래곤RPA",
    "DragonRPA",
    "엑셀 ERP 자동 입력",
    "ZPL 디자이너",
    "블루투스 바코드 스캐너 연동"
  ],
  authors: [{ name: "(주)드래곤알피에이", url: "https://www.dragonrpa.co.kr" }],
  creator: "(주)드래곤알피에이",
  publisher: "(주)드래곤알피에이",
  alternates: {
    canonical: "https://www.dragonrpa.co.kr/label-station",
  },
  openGraph: {
    title: "라벨스테이션 (Label Print Station) - 1초 Zebra 바코드 출력 & 엑셀 ERP 자동화",
    description: "스캔 즉시 1초 출력! 웹 캔버스 비주얼 디자이너와 엑셀 ERP 자동화가 결합된 차세대 라벨 솔루션.",
    url: "https://www.dragonrpa.co.kr/label-station",
    siteName: "DragonRPA",
    locale: "ko_KR",
    type: "website",
  },
};

export default function LabelStationPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://www.dragonrpa.co.kr/label-station#software",
        "name": "라벨스테이션 (Label Print Station)",
        "operatingSystem": "Windows 10, Windows 11, Web Browser",
        "applicationCategory": "BusinessApplication",
        "softwareVersion": "1.0.0",
        "description": "블루투스 바코드 스캔 즉시 0.1초 DB 매칭 및 1초 Zebra 고속 라벨 직통 출력. 웹 캔버스 비주얼 라벨 디자이너 및 엑셀 ➔ 웹 ERP 무인 타이핑 자동화 지원.",
        "url": "https://www.dragonrpa.co.kr/label-station",
        "downloadUrl": "https://www.dragonrpa.co.kr/downloads/LabelStation_Setup_v1.0.0.exe",
        "fileSize": "42MB",
        "author": {
          "@type": "Organization",
          "name": "(주)드래곤알피에이",
          "url": "https://www.dragonrpa.co.kr",
        },
        "offers": {
          "@type": "Offer",
          "price": "55000",
          "priceCurrency": "KRW",
          "availability": "https://schema.org/InStock",
          "description": "스탠다드 영구 소장 라이선스 (1 PC / 1 프린터)",
        },
        "featureList": [
          "Zero-Focus 블루투스 바코드 스캔 감지 (<60ms) 및 1초 직통 Zebra 출력",
          "Zebra GK420d, ZD420, ZT411 등 203/300 DPI ZPL 완벽 지원",
          "웹 캔버스 기반 마우스 드래그 앤 드롭 라벨 서식 디자이너",
          "엑셀 데이터 기반 100% 무인 웹 ERP 자동 타이핑 & 입고/출고 RPA",
          "자산 대형(72x40), 소형 QR(50x25), 제조번호 QR 등 프리셋 내장",
          "초경량 백그라운드 PC 에이전트 (41MB 단일 바이너리)"
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LabelStationClient />
    </>
  );
}
