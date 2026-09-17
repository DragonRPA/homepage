import React from "react";
import type { Metadata } from "next";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = {
  title: "공식 소프트웨어 스토어 & 라이선스 요금제 | (주)드래곤알피에이",
  description: "매뉴얼 스튜디오, 라벨스테이션, 유니버설 RPA 레코더 등 드래곤RPA 공식 소프트웨어 정품 라이선스를 1회 결제 평생 영구 소장하세요. 국내(원화) 및 해외(달러) 결제 즉시 0초 라이선스 키 발급.",
  keywords: [
    "드래곤RPA 스토어",
    "소프트웨어 구매",
    "매뉴얼 스튜디오 가격",
    "라벨스테이션 가격",
    "RPA 소프트웨어 라이선스",
    "Zebra 바코드 라벨 프로그램",
    "업무 매뉴얼 제작 도구",
    "DragonRPA Store"
  ],
  authors: [{ name: "(주)드래곤알피에이", url: "https://www.dragonrpa.co.kr" }],
  creator: "(주)드래곤알피에이",
  publisher: "(주)드래곤알피에이",
  alternates: {
    canonical: "https://www.dragonrpa.co.kr/products",
  },
  openGraph: {
    title: "드래곤RPA 공식 소프트웨어 스토어 & 라이선스 요금제",
    description: "실무자의 반복 작업을 0으로 줄여주는 정품 소프트웨어 라인업. 1회 결제 평생 소장 라이선스.",
    url: "https://www.dragonrpa.co.kr/products",
    siteName: "DragonRPA",
    locale: "ko_KR",
    type: "website",
  },
};

export default function ProductsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "DragonRPA 소프트웨어 공식 스토어",
    "url": "https://www.dragonrpa.co.kr/products",
    "description": "실무 프로세스 자동화, 매뉴얼 저작, 바코드 라벨 출력 소프트웨어 정품 라이선스 공식 판매처",
    "parentOrganization": {
      "@type": "Organization",
      "name": "(주)드래곤알피에이",
      "url": "https://www.dragonrpa.co.kr",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductsClient />
    </>
  );
}
