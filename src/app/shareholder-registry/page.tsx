import React from "react";
import { Metadata } from "next";
import ShareholderRegistryClient from "./ShareholderRegistryClient";

export const metadata: Metadata = {
  title: "주주명세서 (주주명부) 양식 및 인쇄 발급기 | (주)드래곤알피에이",
  description: "등기 변경 및 법인 세무 제출용 주주명세서 실시간 작성 및 A4 정밀 인쇄 문서",
};

export default function ShareholderRegistryPage() {
  return <ShareholderRegistryClient />;
}
