import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceNo = searchParams.get("invoiceNo");
    const autoPrint = searchParams.get("print") === "1";

    if (!invoiceNo) {
      return new NextResponse("세금계산서 관리번호가 필요합니다.", { status: 400 });
    }

    const pool = getErpPool();
    const res = await pool.query(
      `SELECT * FROM erp_tax_invoices WHERE invoice_no = $1 LIMIT 1`,
      [invoiceNo]
    );

    if (res.rows.length === 0) {
      return new NextResponse("해당 세금계산서를 찾을 수 없습니다.", { status: 404 });
    }

    const inv = res.rows[0];
    const writeDateStr = inv.issue_date ? new Date(inv.issue_date).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "-";
    const supplyCost = Math.round(parseFloat(inv.supply_amount) || 0).toLocaleString("ko-KR");
    const vatCost = Math.round(parseFloat(inv.vat_amount) || 0).toLocaleString("ko-KR");
    const totalCost = Math.round(parseFloat(inv.total_amount) || 0).toLocaleString("ko-KR");

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>전자세금계산서 - ${inv.invoice_no}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", sans-serif; background-color: #f7f5f0; margin: 0; padding: 20px; color: #1c1917; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #fff; border: 2px solid #b91c1c; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .title-cell { font-size: 24px; font-weight: 800; color: #b91c1c; text-align: center; letter-spacing: 6px; padding: 10px; border: 2px solid #b91c1c; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    .meta-table td { padding: 4px 8px; border: 1px solid #dc2626; }
    .main-grid { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    .main-grid th, .main-grid td { border: 1px solid #dc2626; padding: 6px 8px; text-align: center; }
    .main-grid th { background-color: #fef2f2; color: #991b1b; font-weight: 700; }
    .text-left { text-align: left !important; }
    .text-right { text-align: right !important; }
    .stamp-box { display: inline-block; border: 1px solid #b91c1c; color: #b91c1c; font-size: 10px; padding: 2px 4px; border-radius: 3px; margin-left: 6px; }
    .summary-box { background: #fafaf9; border: 2px solid #b91c1c; padding: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; }
    .nts-badge { background: #fee2e2; color: #991b1b; border: 1px solid #ef4444; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; display: inline-block; }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-card { box-shadow: none; border-color: #000; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 800px; margin: 0 auto 12px auto; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <span class="nts-badge">국세청 승인번호: ${inv.nts_confirm_no || "전송대기"}</span>
      <span style="font-size: 12px; color: #78716c; margin-left: 8px;">(팝빌 전자세금계산서 연동)</span>
    </div>
    <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; font-weight: 600; cursor: pointer;">인쇄 / PDF 저장</button>
  </div>

  <div class="invoice-card">
    <table class="header-table">
      <tr>
        <td class="title-cell">전 자 세 금 계 산 서</td>
      </tr>
      <tr>
        <td style="text-align: right; font-size: 11px; padding-top: 4px; color: #78716c;">
          [공급받는자 보관용] | 관리번호: <strong>${inv.invoice_no}</strong>
        </td>
      </tr>
    </table>

    <table class="main-grid" style="margin-bottom: 12px;">
      <tr>
        <th rowspan="4" style="width: 32px; background: #fee2e2;">공<br>급<br>자</th>
        <th style="width: 80px;">등록번호</th>
        <td style="font-weight: 700; letter-spacing: 1px;">${inv.supplier_corp_num || "806-88-03266"}</td>
        <th rowspan="4" style="width: 32px; background: #fee2e2;">공<br>급<br>받<br>는<br>자</th>
        <th style="width: 80px;">등록번호</th>
        <td style="font-weight: 700; letter-spacing: 1px;">${inv.business_no || "100-00-00000"}</td>
      </tr>
      <tr>
        <th>상호(법인명)</th>
        <td class="text-left">${inv.supplier_corp_name || "주식회사 드래곤알피에이"}</td>
        <th>상호(법인명)</th>
        <td class="text-left">${inv.customer_name || "-"}</td>
      </tr>
      <tr>
        <th>성명(대표자)</th>
        <td class="text-left">${inv.supplier_ceo_name || "이정용"} <span class="stamp-box">인</span></td>
        <th>성명(대표자)</th>
        <td class="text-left">${inv.ceo_name || "대표자"}</td>
      </tr>
      <tr>
        <th>사업장주소</th>
        <td class="text-left">${inv.supplier_address || "서울특별시 금천구 가산디지털1로"}</td>
        <th>사업장주소</th>
        <td class="text-left">-</td>
      </tr>
    </table>

    <table class="main-grid">
      <tr>
        <th style="width: 120px;">작성일자</th>
        <th>공급가액</th>
        <th>세액</th>
        <th style="width: 140px;">비고</th>
      </tr>
      <tr>
        <td style="font-weight: 700;">${writeDateStr}</td>
        <td class="text-right" style="font-size: 13px; font-weight: 700;">₩ ${supplyCost}</td>
        <td class="text-right" style="font-size: 13px; font-weight: 700;">₩ ${vatCost}</td>
        <td class="text-left">${inv.memo || ""}</td>
      </tr>
    </table>

    <table class="main-grid" style="margin-top: 8px;">
      <thead>
        <tr>
          <th style="width: 60px;">월 / 일</th>
          <th>품목명</th>
          <th style="width: 60px;">수량</th>
          <th style="width: 90px;">단가</th>
          <th style="width: 110px;">공급가액</th>
          <th style="width: 90px;">세액</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${writeDateStr.slice(5)}</td>
          <td class="text-left" style="font-weight: 600;">${inv.item_name}</td>
          <td>1</td>
          <td class="text-right">₩ ${supplyCost}</td>
          <td class="text-right">₩ ${supplyCost}</td>
          <td class="text-right">₩ ${vatCost}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-box">
      <div>합계금액: <span style="font-size: 18px; color: #b91c1c; margin-left: 8px;">₩ ${totalCost}</span></div>
      <div style="font-size: 13px; color: #57534e;">이 금액을 [ 영수 ] 함</div>
    </div>
  </div>

  ${autoPrint ? `<script>window.onload = function() { window.print(); }</script>` : ""}
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: any) {
    return new NextResponse("서식 렌더링 오류: " + error.message, { status: 500 });
  }
}
