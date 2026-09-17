import React from "react";
import { Metadata } from "next";
import AdminProductsClient from "./AdminProductsClient";

export const metadata: Metadata = {
  title: "상품 카탈로그 및 가격 관리 | (주)드래곤알피에이",
  description: "소프트웨어 상품 게시 여부 및 플랜별 원화/달러 가격 실시간 관리 스튜디오",
};

export default function AdminProductsPage() {
  return <AdminProductsClient />;
}
