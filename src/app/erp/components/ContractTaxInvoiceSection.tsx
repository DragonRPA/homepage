"use client";

import React from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { formatErpInputNumber, toErpInputString, cleanErpNumber, formatErpCurrency } from "@/lib/erpFormat";

export interface TaxInvoiceLineItem {
  month?: string;
  day?: string;
  itemName: string;
  spec?: string;
  qty: number;
  unitCost: number;
  supplyAmount: number;
  vatAmount: number;
  note?: string;
}

export interface BuyerTaxSpec {
  customerBizNo: string;
  customerCeoName: string;
  customerAddress: string;
  customerBizType: string;
  customerBizClass: string;
  customerEmail: string;
  customerEmail2: string;
  taxPurpose: "청구" | "영수";
  taxMemo: string;
  taxItems: TaxInvoiceLineItem[];
}

export function createDefaultTaxSpec(defaultItemName = "", defaultSupply = 0): BuyerTaxSpec {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const vat = Math.round(defaultSupply * 0.1);
  return {
    customerBizNo: "",
    customerCeoName: "",
    customerAddress: "",
    customerBizType: "",
    customerBizClass: "",
    customerEmail: "",
    customerEmail2: "",
    taxPurpose: "청구",
    taxMemo: defaultItemName,
    taxItems: [
      {
        month: m,
        day: d,
        itemName: defaultItemName,
        spec: "",
        qty: 1,
        unitCost: defaultSupply,
        supplyAmount: defaultSupply,
        vatAmount: vat,
        note: "",
      },
    ],
  };
}

export function extractPartnerTaxSpec(p: any, prev: BuyerTaxSpec): BuyerTaxSpec {
  const addr = [p?.address, p?.addressDetail].filter(Boolean).join(" ");
  const email1 = p?.mainEmail || p?.primaryContact?.email || prev.customerEmail || "";
  const email2 =
    p?.primaryContact?.email && p?.mainEmail && p.primaryContact.email !== p.mainEmail
      ? p.primaryContact.email
      : prev.customerEmail2 || "";

  return {
    ...prev,
    customerBizNo: p?.businessNo || prev.customerBizNo || "",
    customerCeoName: p?.ceoName || prev.customerCeoName || "",
    customerAddress: addr || prev.customerAddress || "",
    customerBizType: p?.bizType || prev.customerBizType || "",
    customerBizClass: p?.bizItem || p?.bizClass || prev.customerBizClass || "",
    customerEmail: email1,
    customerEmail2: email2,
  };
}

interface ContractTaxInvoiceSectionProps {
  spec: BuyerTaxSpec;
  onChange: (next: BuyerTaxSpec) => void;
  onTotalChange?: (totalSupply: number, totalVat: number) => void;
  hideBuyerFields?: boolean;
  domainLabel?: string;
}

export const ContractTaxInvoiceSection: React.FC<ContractTaxInvoiceSectionProps> = ({
  spec,
  onChange,
  onTotalChange,
  hideBuyerFields = false,
  domainLabel = "계약",
}) => {
  const updateField = <K extends keyof BuyerTaxSpec>(key: K, val: BuyerTaxSpec[K]) => {
    onChange({ ...spec, [key]: val });
  };

  const recalcTotals = (items: TaxInvoiceLineItem[]) => {
    const totalSupply = items.reduce((acc, it) => acc + (Number(it.supplyAmount) || 0), 0);
    const totalVat = items.reduce((acc, it) => acc + (Number(it.vatAmount) || 0), 0);
    if (onTotalChange) {
      onTotalChange(totalSupply, totalVat);
    }
  };

  const handleItemChange = (idx: number, field: keyof TaxInvoiceLineItem, rawVal: string) => {
    const nextItems = spec.taxItems.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item };

      if (field === "qty") {
        const q = cleanErpNumber(rawVal) || 0;
        updated.qty = q;
        updated.supplyAmount = Math.round(q * (Number(updated.unitCost) || 0));
        updated.vatAmount = Math.round(updated.supplyAmount * 0.1);
      } else if (field === "unitCost") {
        const u = cleanErpNumber(rawVal) || 0;
        updated.unitCost = u;
        updated.supplyAmount = Math.round((Number(updated.qty) || 1) * u);
        updated.vatAmount = Math.round(updated.supplyAmount * 0.1);
      } else if (field === "supplyAmount") {
        const s = cleanErpNumber(rawVal) || 0;
        updated.supplyAmount = s;
        if ((Number(updated.qty) || 1) === 1) {
          updated.unitCost = s;
        }
        updated.vatAmount = Math.round(s * 0.1);
      } else if (field === "vatAmount") {
        updated.vatAmount = cleanErpNumber(rawVal) || 0;
      } else {
        (updated as any)[field] = rawVal;
      }
      return updated;
    });

    onChange({ ...spec, taxItems: nextItems });
    if (field === "qty" || field === "unitCost" || field === "supplyAmount" || field === "vatAmount") {
      recalcTotals(nextItems);
    }
  };

  const handleAddRow = () => {
    const now = new Date();
    const m = spec.taxItems[0]?.month || String(now.getMonth() + 1).padStart(2, "0");
    const d = spec.taxItems[0]?.day || String(now.getDate()).padStart(2, "0");
    const nextItems: TaxInvoiceLineItem[] = [
      ...spec.taxItems,
      {
        month: m,
        day: d,
        itemName: "",
        spec: "",
        qty: 1,
        unitCost: 0,
        supplyAmount: 0,
        vatAmount: 0,
        note: "",
      },
    ];
    onChange({ ...spec, taxItems: nextItems });
  };

  const handleRemoveRow = (idx: number) => {
    if (spec.taxItems.length <= 1) return;
    const nextItems = spec.taxItems.filter((_, i) => i !== idx);
    onChange({ ...spec, taxItems: nextItems });
    recalcTotals(nextItems);
  };

  const totalSupply = spec.taxItems.reduce((acc, it) => acc + (Number(it.supplyAmount) || 0), 0);
  const totalVat = spec.taxItems.reduce((acc, it) => acc + (Number(it.vatAmount) || 0), 0);

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded border border-[#b5a894] bg-[#ebe5d8]/80 text-[#1c1917] text-xs">
      <div className="flex items-center justify-between border-b border-[#b5a894] pb-1.5">
        <div className="flex items-center gap-1.5 font-bold text-[#1e3a8a]">
          <FileText className="w-4 h-4 text-blue-700" />
          <span>전자세금계산서 발행 제원 및 품목 명세 ({domainLabel})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-[#57534e]">영수/청구 구분</span>
          <div className="inline-flex rounded border border-[#b5a894] overflow-hidden bg-[#f4efe4]">
            <button
              type="button"
              onClick={() => updateField("taxPurpose", "청구")}
              className={`px-2.5 py-0.5 text-[11px] font-bold transition ${
                spec.taxPurpose === "청구"
                  ? "bg-blue-700 text-white"
                  : "text-[#57534e] hover:bg-[#e2dbcd]"
              }`}
            >
              청구
            </button>
            <button
              type="button"
              onClick={() => updateField("taxPurpose", "영수")}
              className={`px-2.5 py-0.5 text-[11px] font-bold transition ${
                spec.taxPurpose === "영수"
                  ? "bg-blue-700 text-white"
                  : "text-[#57534e] hover:bg-[#e2dbcd]"
              }`}
            >
              영수
            </button>
          </div>
        </div>
      </div>

      {/* 1. 공급받는자 사업자 제원 */}
      {!hideBuyerFields && (
        <div className="flex flex-col gap-2 bg-[#f4efe4] p-2.5 rounded border border-[#c4b6a0]">
          <div className="text-[11px] font-bold text-[#1e3a8a] flex items-center justify-between">
            <span>공급받는자 세금계산서 제원</span>
            <span className="text-[10px] font-normal text-[#78716c]">고객 선택 시 자동 입력 / 직접 수정 가능</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">등록번호 (사업자번호)</label>
              <input
                type="text"
                value={spec.customerBizNo}
                onChange={(e) => updateField("customerBizNo", e.target.value)}
                placeholder="000-00-00000"
                className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">성명 (대표자)</label>
              <input
                type="text"
                value={spec.customerCeoName}
                onChange={(e) => updateField("customerCeoName", e.target.value)}
                placeholder="대표자 성명"
                className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">업태</label>
              <input
                type="text"
                value={spec.customerBizType}
                onChange={(e) => updateField("customerBizType", e.target.value)}
                placeholder="예: 도매업, 서비스"
                className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">종목</label>
              <input
                type="text"
                value={spec.customerBizClass}
                onChange={(e) => updateField("customerBizClass", e.target.value)}
                placeholder="예: 소프트웨어 개발, 전자제품"
                className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">사업장 주소</label>
              <input
                type="text"
                value={spec.customerAddress}
                onChange={(e) => updateField("customerAddress", e.target.value)}
                placeholder="사업장 소재지 주소"
                className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] text-xs"
              />
            </div>
            <div className="col-span-3 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">이메일 1 (주 수신)</label>
              <input
                type="email"
                value={spec.customerEmail}
                onChange={(e) => updateField("customerEmail", e.target.value)}
                placeholder="account@company.co.kr"
                className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] text-xs"
              />
            </div>
            <div className="col-span-3 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#57534e] whitespace-nowrap">이메일 2 (부 수신)</label>
              <input
                type="email"
                value={spec.customerEmail2}
                onChange={(e) => updateField("customerEmail2", e.target.value)}
                placeholder="보조 이메일 (선택)"
                className="h-7 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. 세금계산서 상단 비고 */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-[#57534e]">
          세금계산서 상단 비고 (예: 2026-09 운영용역비 외 / 임대료-빔프로젝트(14/16) 외 / 2609 용역료)
        </label>
        <input
          type="text"
          value={spec.taxMemo}
          onChange={(e) => updateField("taxMemo", e.target.value)}
          placeholder="세금계산서 작성일자 우측 '비고'란에 출력될 내용"
          className="h-7 px-2 rounded border border-[#b5a894] bg-[#f4efe4] text-[#1c1917] text-xs"
        />
      </div>

      {/* 3. 다중 품목 명세 테이블 (월/일/품목/규격/수량/단가/공급가액/세액/비고) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#57534e]">
            세금계산서 품목 명세 ({spec.taxItems.length}건)
          </span>
          <button
            type="button"
            onClick={handleAddRow}
            className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-700 hover:bg-blue-800 text-white inline-flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>품목 행 추가</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-[#b5a894] rounded bg-[#f4efe4]">
          <table className="w-full text-xs border-collapse whitespace-nowrap">
            <thead className="bg-[#dcebe8] text-[#1e293b] font-bold border-b border-[#b5a894]">
              <tr>
                <th className="py-1.5 px-1.5 text-center border-r border-[#b5a894] w-11">월</th>
                <th className="py-1.5 px-1.5 text-center border-r border-[#b5a894] w-11">일</th>
                <th className="py-1.5 px-2 text-left border-r border-[#b5a894] min-w-[170px]">품목</th>
                <th className="py-1.5 px-1.5 text-center border-r border-[#b5a894] w-20">규격</th>
                <th className="py-1.5 px-1.5 text-right border-r border-[#b5a894] w-16">수량</th>
                <th className="py-1.5 px-1.5 text-right border-r border-[#b5a894] w-28">단가</th>
                <th className="py-1.5 px-1.5 text-right border-r border-[#b5a894] w-28">공급가액</th>
                <th className="py-1.5 px-1.5 text-right border-r border-[#b5a894] w-24">세액</th>
                <th className="py-1.5 px-1.5 text-left border-r border-[#b5a894] w-24">비고</th>
                <th className="py-1.5 px-1 text-center w-8">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0c6b4]">
              {spec.taxItems.map((it, idx) => (
                <tr key={idx} className="hover:bg-[#ebe5d8]/70">
                  <td className="p-1 border-r border-[#d0c6b4]">
                    <input
                      type="text"
                      maxLength={2}
                      value={it.month || ""}
                      onChange={(e) => handleItemChange(idx, "month", e.target.value)}
                      placeholder="MM"
                      className="w-full h-6 px-1 text-center rounded border border-[#c4b6a0] bg-white font-mono text-[11px]"
                    />
                  </td>
                  <td className="p-1 border-r border-[#d0c6b4]">
                    <input
                      type="text"
                      maxLength={2}
                      value={it.day || ""}
                      onChange={(e) => handleItemChange(idx, "day", e.target.value)}
                      placeholder="DD"
                      className="w-full h-6 px-1 text-center rounded border border-[#c4b6a0] bg-white font-mono text-[11px]"
                    />
                  </td>
                  <td className="p-1 border-r border-[#d0c6b4]">
                    <input
                      type="text"
                      value={it.itemName}
                      onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                      placeholder="품목명 (예: EPSON EB-FH08 / 2026-08 운영용역비)"
                      className="w-full h-6 px-1.5 rounded border border-[#c4b6a0] bg-white font-semibold text-[11px]"
                    />
                  </td>
                  <td className="p-1 border-r border-[#d0c6b4]">
                    <input
                      type="text"
                      value={it.spec || ""}
                      onChange={(e) => handleItemChange(idx, "spec", e.target.value)}
                      placeholder="규격(4인)"
                      className="w-full h-6 px-1 text-center rounded border border-[#c4b6a0] bg-white text-[11px]"
                    />
                  </td>
                  <td className="p-1 border-r border-[#d0c6b4]">
                    <input
                      type="text"
                      value={toErpInputString(it.qty)}
                      onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                      className="w-full h-6 px-1 text-right rounded border border-[#c4b6a0] bg-white font-mono text-[11px]"
                    />
                  </td>
                  <td className="p-1 border-r border-[#d0c6b4]">
                    <input
                      type="text"
                      value={toErpInputString(it.unitCost)}
                      onChange={(e) => handleItemChange(idx, "unitCost", e.target.value)}
                      className="w-full h-6 px-1.5 text-right rounded border border-[#c4b6a0] bg-white font-mono text-[11px]"
                    />
                  </td>
                  <td className="p-1 border-r border-[#d0c6b4]">
                    <input
                      type="text"
                      value={toErpInputString(it.supplyAmount)}
                      onChange={(e) => handleItemChange(idx, "supplyAmount", e.target.value)}
                      className="w-full h-6 px-1.5 text-right rounded border border-[#c4b6a0] bg-white font-mono font-bold text-[11px]"
                    />
                  </td>
                  <td className="p-1 border-r border-[#d0c6b4]">
                    <input
                      type="text"
                      value={toErpInputString(it.vatAmount)}
                      onChange={(e) => handleItemChange(idx, "vatAmount", e.target.value)}
                      className="w-full h-6 px-1.5 text-right rounded border border-[#c4b6a0] bg-white font-mono text-[#57534e] text-[11px]"
                    />
                  </td>
                  <td className="p-1 border-r border-[#d0c6b4]">
                    <input
                      type="text"
                      value={it.note || ""}
                      onChange={(e) => handleItemChange(idx, "note", e.target.value)}
                      placeholder="비고"
                      className="w-full h-6 px-1 rounded border border-[#c4b6a0] bg-white text-[11px]"
                    />
                  </td>
                  <td className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      disabled={spec.taxItems.length <= 1}
                      className="p-1 text-rose-700 hover:bg-rose-100 rounded disabled:opacity-30"
                      title="품목 행 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 합계 요약 바 */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded bg-[#dcebe8] border border-[#9bc2ba] text-[11px] font-bold text-[#0f172a]">
          <div className="flex items-center gap-4">
            <span>
              공급가액 합계: <strong className="font-mono text-blue-900">{formatErpCurrency(totalSupply)}</strong>
            </span>
            <span>
              세액 합계: <strong className="font-mono text-[#334155]">{formatErpCurrency(totalVat)}</strong>
            </span>
            <span>
              총 합계금액: <strong className="font-mono text-emerald-900">{formatErpCurrency(totalSupply + totalVat)}</strong>
            </span>
          </div>
          <span className="font-mono text-[#334155]">이 금액을 ( {spec.taxPurpose} ) 함</span>
        </div>
      </div>
    </div>
  );
};
