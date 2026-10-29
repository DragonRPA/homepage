import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { getEntity } from "@/lib/businessEntities";

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
    const supplier = getEntity(inv.supplier_entity_type);
    const issueDateRaw = inv.issue_date ? String(inv.issue_date).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const [, defaultMonth = "01", defaultDay = "01"] = issueDateRaw.split("-");

    const supplyCost = Math.round(parseFloat(inv.supply_amount) || 0).toLocaleString("ko-KR");
    const vatCost = Math.round(parseFloat(inv.vat_amount) || 0).toLocaleString("ko-KR");
    const totalCost = Math.round(parseFloat(inv.total_amount) || 0).toLocaleString("ko-KR");

    const rawItems = Array.isArray(inv.tax_items) && inv.tax_items.length > 0
      ? inv.tax_items
      : [
          {
            month: defaultMonth,
            day: defaultDay,
            itemName: inv.item_name || "품목",
            spec: "",
            qty: 1,
            unitCost: Math.round(parseFloat(inv.supply_amount) || 0),
            supplyAmount: Math.round(parseFloat(inv.supply_amount) || 0),
            vatAmount: Math.round(parseFloat(inv.vat_amount) || 0),
            note: "",
          },
        ];

    const minRowCount = Math.max(4, rawItems.length);
    const itemRowsHtml = Array.from({ length: minRowCount }, (_, idx) => {
      const it = rawItems[idx];
      if (!it) {
        return `
          <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td class="text-left">&nbsp;</td>
            <td>&nbsp;</td>
            <td class="text-right">&nbsp;</td>
            <td class="text-right">&nbsp;</td>
            <td class="text-right">&nbsp;</td>
            <td class="text-right">&nbsp;</td>
            <td class="text-left">&nbsp;</td>
          </tr>
        `;
      }
      const m = it.month || defaultMonth;
      const d = it.day || defaultDay;
      const qtyNum = Number(it.qty ?? 1);
      const unitNum = Number(it.unitCost ?? it.unitPrice ?? it.supplyAmount ?? 0);
      const supNum = Number(it.supplyAmount ?? Math.round(qtyNum * unitNum));
      const vatNum = Number(it.vatAmount ?? Math.round(supNum * 0.1));
      return `
        <tr>
          <td>${m}</td>
          <td>${d}</td>
          <td class="text-left" style="font-weight: 500;">${it.itemName || ""}</td>
          <td>${it.spec || ""}</td>
          <td class="text-right">${qtyNum.toLocaleString("ko-KR")}</td>
          <td class="text-right">${Math.round(unitNum).toLocaleString("ko-KR")}</td>
          <td class="text-right">${Math.round(supNum).toLocaleString("ko-KR")}</td>
          <td class="text-right">${Math.round(vatNum).toLocaleString("ko-KR")}</td>
          <td class="text-left">${it.note || it.remark || ""}</td>
        </tr>
      `;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>전자세금계산서 상세조회 - ${inv.invoice_no}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", sans-serif; background-color: #ffffff; margin: 0; padding: 16px 20px; color: #1e293b; font-size: 12px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2px solid #cbd5e1; margin-bottom: 12px; }
    .modal-title { font-size: 16px; font-weight: 800; color: #0f172a; }
    .nts-meta { font-size: 11px; color: #475569; font-family: monospace; }
    .party-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1px solid #cbd5e1; }
    .party-table th, .party-table td { border: 1px solid #e2e8f0; padding: 7px 10px; font-size: 12px; line-height: 1.35; }
    .sup-side { background-color: #f8d0d0; color: #991b1b; font-weight: 700; width: 32px; text-align: center; border-color: #f1b2b2 !important; }
    .sup-th { background-color: #fdf2f2; color: #334155; font-weight: 600; width: 72px; text-align: center; border-color: #f5d0d0 !important; }
    .sup-td { background-color: #ffffff; border-color: #f5d0d0 !important; }
    .buy-side { background-color: #cbd5f7; color: #1e3a8a; font-weight: 700; width: 32px; text-align: center; border-color: #b4c3f3 !important; }
    .buy-th { background-color: #eff3fe; color: #334155; font-weight: 600; width: 72px; text-align: center; border-color: #d6dff9 !important; }
    .buy-td { background-color: #ffffff; border-color: #d6dff9 !important; }
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .grid-table th, .grid-table td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; font-size: 12px; }
    .grid-table th { background-color: #eaf5f3; color: #1e293b; font-weight: 700; }
    .text-left { text-align: left !important; }
    .text-right { text-align: right !important; }
    .purpose-line { text-align: right; font-size: 12px; color: #475569; margin: 6px 0 16px 0; font-weight: 600; }
    .action-bar { display: flex; justify-content: center; gap: 6px; padding-top: 8px; }
    .btn { padding: 7px 16px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid #3b82f6; background: #fff; color: #2563eb; }
    .btn-primary { background: #1d6ce0; color: #fff; border-color: #1d6ce0; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="modal-header">
    <div class="modal-title">전자세금계산서 상세조회</div>
    <div class="nts-meta">승인번호: ${inv.nts_confirm_no || "-"} | 관리번호: ${inv.invoice_no}</div>
  </div>

  <!-- 공급자 / 공급받는자 제원 테이블 -->
  <table class="party-table">
    <tr>
      <td rowspan="5" class="sup-side">공<br>급<br>자</td>
      <th class="sup-th">등록번호</th>
      <td class="sup-td" style="font-weight: 700; width: 17%;">${inv.supplier_corp_num || supplier.bizNum}</td>
      <th class="sup-th">종사업장</th>
      <td class="sup-td" style="width: 15%;"></td>
      <td rowspan="5" class="buy-side">공<br>급<br>받<br>는<br>자</td>
      <th class="buy-th">등록번호</th>
      <td class="buy-td" style="font-weight: 700; width: 17%;">${inv.business_no || "-"}</td>
      <th class="buy-th">종사업장</th>
      <td class="buy-td" style="width: 15%;"></td>
    </tr>
    <tr>
      <th class="sup-th">상호</th>
      <td class="sup-td">${inv.supplier_corp_name || supplier.corpName}</td>
      <th class="sup-th">성명</th>
      <td class="sup-td">${inv.supplier_ceo_name || supplier.ceoName}</td>
      <th class="buy-th">상호</th>
      <td class="buy-td">${inv.customer_name || "-"}</td>
      <th class="buy-th">성명</th>
      <td class="buy-td">${inv.ceo_name || "-"}</td>
    </tr>
    <tr>
      <th class="sup-th">사업장</th>
      <td colspan="3" class="sup-td">${inv.supplier_address || supplier.address}</td>
      <th class="buy-th">사업장</th>
      <td colspan="3" class="buy-td">${inv.customer_address || "-"}</td>
    </tr>
    <tr>
      <th class="sup-th">업태</th>
      <td class="sup-td">${supplier.bizType.split(",")[0] || "정보통신업"}</td>
      <th class="sup-th">종목</th>
      <td class="sup-td">${supplier.bizClass.split(",")[0] || "응용 소프트웨어 개발 및 공급업"}</td>
      <th class="buy-th">업태</th>
      <td class="buy-td">${inv.customer_biz_type || "-"}</td>
      <th class="buy-th">종목</th>
      <td class="buy-td">${inv.customer_biz_class || "-"}</td>
    </tr>
    <tr>
      <th class="sup-th">이메일</th>
      <td colspan="3" class="sup-td">${supplier.email}</td>
      <th class="buy-th">이메일</th>
      <td colspan="3" class="buy-td">
        <div>${inv.customer_email || ""}</div>
        ${inv.customer_email2 ? `<div style="margin-top: 3px; border-top: 1px dashed #cbd5e1; padding-top: 3px;">${inv.customer_email2}</div>` : ""}
      </td>
    </tr>
  </table>

  <!-- 작성일자 / 공급가액 / 세액 / 수정사유 / 비고 -->
  <table class="grid-table">
    <thead>
      <tr>
        <th style="width: 130px;">작성일자</th>
        <th style="width: 170px;">공급가액</th>
        <th style="width: 150px;">세액</th>
        <th style="width: 120px;">수정사유</th>
        <th>비고</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${issueDateRaw}</td>
        <td class="text-right" style="font-weight: 600;">${supplyCost}</td>
        <td class="text-right" style="font-weight: 600;">${vatCost}</td>
        <td class="text-left">${inv.modify_reason || "해당없음"}</td>
        <td class="text-left">${inv.memo || ""}</td>
      </tr>
    </tbody>
  </table>

  <!-- 다중 품목 명세 테이블 -->
  <table class="grid-table">
    <thead>
      <tr>
        <th style="width: 42px;">월</th>
        <th style="width: 42px;">일</th>
        <th>품목</th>
        <th style="width: 75px;">규격</th>
        <th style="width: 65px;">수량</th>
        <th style="width: 110px;">단가</th>
        <th style="width: 120px;">공급가액</th>
        <th style="width: 105px;">세액</th>
        <th style="width: 140px;">비고</th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHtml}
    </tbody>
  </table>

  <!-- 합계금액 / 결제수단 -->
  <table class="grid-table" style="margin-bottom: 4px;">
    <thead>
      <tr>
        <th style="width: 20%;">합계금액</th>
        <th style="width: 20%;">현금</th>
        <th style="width: 20%;">수표</th>
        <th style="width: 20%;">어음</th>
        <th style="width: 20%;">외상미수금</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="text-right" style="font-weight: 700;">${totalCost}</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    </tbody>
  </table>

  <div class="purpose-line">
    이 금액을 ( &nbsp;${inv.purpose_type || "청구"}&nbsp; ) 함
  </div>

  <div class="action-bar no-print">
    <button class="btn" onclick="window.close()">닫기</button>
    <button class="btn btn-primary" onclick="window.print()">출력</button>
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
