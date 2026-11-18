"use client";

import React from "react";
import { FileText, X } from "lucide-react";
import { SearchSelectCombobox, type SearchSelectOption } from "../SearchSelectCombobox";
import { ContractTaxInvoiceSection, extractPartnerTaxSpec, type BuyerTaxSpec } from "../ContractTaxInvoiceSection";
import { getEntity, type EntityType } from "@/lib/businessEntities";

export interface IssueModalProps {
  custName: string;
  domainType: string;
  handleManualIssue: (e: React.FormEvent) => Promise<void>;
  issueDate: string;
  manualNtsConfirmNo: string;
  manualPartnerOptions: SearchSelectOption[];
  manualPartners: any[];
  manualTaxSpec: BuyerTaxSpec;
  modalIoType: "PURCHASE" | "SALE";
  modalSupplierEntity: EntityType;
  selectedManualPartnerId: string;
  setCustName: React.Dispatch<React.SetStateAction<string>>;
  setDomainType: React.Dispatch<React.SetStateAction<string>>;
  setIssueDate: React.Dispatch<React.SetStateAction<string>>;
  setManualNtsConfirmNo: React.Dispatch<React.SetStateAction<string>>;
  setManualTaxSpec: React.Dispatch<React.SetStateAction<BuyerTaxSpec>>;
  setModalIoType: React.Dispatch<React.SetStateAction<"PURCHASE" | "SALE">>;
  setModalSupplierEntity: React.Dispatch<React.SetStateAction<EntityType>>;
  setShowIssueModal: React.Dispatch<React.SetStateAction<boolean>>;
  showIssueModal: boolean;
}

export const IssueModal: React.FC<IssueModalProps> = ({
  custName,
  domainType,
  handleManualIssue,
  issueDate,
  manualNtsConfirmNo,
  manualPartnerOptions,
  manualPartners,
  manualTaxSpec,
  modalIoType,
  modalSupplierEntity,
  selectedManualPartnerId,
  setCustName,
  setDomainType,
  setIssueDate,
  setManualNtsConfirmNo,
  setManualTaxSpec,
  setModalIoType,
  setModalSupplierEntity,
  setShowIssueModal,
  showIssueModal,
}) => {
  return (
    <>
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#f4efe4] border-2 border-[#b5a894] rounded-lg max-w-3xl w-full p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#b5a894] mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-sm text-[#1c1917]">
                  {modalIoType === "PURCHASE" ? "매입 세금계산서 등록 (미지급 매입채무 생성)" : "매출 세금계산서 수동 발행"}
                </h3>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="text-[#78716c] hover:text-[#1c1917]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualIssue} className="flex flex-col gap-3 text-xs">
              {/* 구분 선택 (매출 vs 매입) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModalIoType("SALE")}
                  className={`p-2 rounded border font-bold text-center transition ${
                    modalIoType === "SALE"
                      ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                      : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                  }`}
                >
                  매출 세금계산서 발행 (매출채권)
                </button>
                <button
                  type="button"
                  onClick={() => setModalIoType("PURCHASE")}
                  className={`p-2 rounded border font-bold text-center transition ${
                    modalIoType === "PURCHASE"
                      ? "border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500"
                      : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                  }`}
                >
                  매입 세금계산서 등록 (매입채무)
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#78716c]">당사 사업자 주체</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalSupplierEntity("CORP")}
                    className={`p-2 rounded border text-left font-bold transition ${
                      modalSupplierEntity === "CORP"
                        ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                        : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                    }`}
                  >
                    <div>(주)드래곤알피에이 [법인]</div>
                    <div className="text-[10px] font-normal font-mono opacity-80">806-88-03266</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalSupplierEntity("INDIVIDUAL")}
                    className={`p-2 rounded border text-left font-bold transition ${
                      modalSupplierEntity === "INDIVIDUAL"
                        ? "border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500"
                        : "border-[#b5a894] bg-[#ebe5d8] text-[#78716c]"
                    }`}
                  >
                    <div>드래곤알피에이 [개인]</div>
                    <div className="text-[10px] font-normal font-mono opacity-80">295-03-02683</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {modalIoType === "SALE" ? (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#78716c]">매출 분과</label>
                    <select
                      value={domainType}
                      onChange={(e) => setDomainType(e.target.value)}
                      className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917]"
                    >
                      <option value="TRADE_SALE">판매 (유통 커머스)</option>
                      <option value="RENTAL">임대 (장비 렌탈)</option>
                      <option value="OP_SERVICE">운영용역 (유지보수)</option>
                      <option value="DEV_SERVICE">개발용역 (SI 구축)</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#78716c]">국세청 승인번호 (선택)</label>
                    <input
                      type="text"
                      value={manualNtsConfirmNo}
                      onChange={(e) => setManualNtsConfirmNo(e.target.value)}
                      placeholder="예: 20261030-10000000-00000000"
                      className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#78716c]">작성/발행일자</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-8 px-2 rounded border border-[#b5a894] bg-[#ebe5d8] text-[#1c1917] font-mono"
                  />
                </div>
              </div>

              {/* 등록 거래처 조회 선택 */}
              <SearchSelectCombobox
                label={modalIoType === "PURCHASE" ? "공급자 상호 (매입거래처 조회 선택)" : "공급받는자 상호 (매출고객사 조회 선택)"}
                required
                allowFreeText
                showChosungBar
                size="sm"
                value={selectedManualPartnerId}
                freeTextValue={custName}
                onFreeTextChange={(txt) => setCustName(txt)}
                onChange={(val) => {
                  if (!val) {
                    setCustName("");
                    return;
                  }
                  const found = manualPartners.find((p) => String(p.id) === val);
                  if (found) {
                    setCustName(found.name);
                    setManualTaxSpec((prev) => extractPartnerTaxSpec(found, prev));
                  }
                }}
                options={manualPartnerOptions}
                placeholder="거래처명, 사업자번호 초성 검색 또는 직접 입력"
              />

              <ContractTaxInvoiceSection
                spec={manualTaxSpec}
                onChange={setManualTaxSpec}
                domainLabel={modalIoType === "PURCHASE" ? "매입 세금계산서" : "매출 세금계산서"}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#b5a894] mt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="h-8 px-3 rounded font-bold border border-[#b5a894] bg-[#ebe5d8] hover:bg-[#e2dbcd]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-sm"
                >
                  {modalIoType === "PURCHASE" ? "매입 세금계산서 저장" : "국세청 전자세금계산서 발행"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export interface DetailModalProps {
  detailInvoice: any;
  handleDeleteInvoice: (inv: any) => Promise<void>;
  handleOpenPopbillPrint: (inv: any) => Promise<void>;
  handleOpenPopbillView: (inv: any) => Promise<void>;
  openReconcileModal: (inv: any) => Promise<void>;
  setDetailInvoice: React.Dispatch<any>;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  detailInvoice,
  handleDeleteInvoice,
  handleOpenPopbillPrint,
  handleOpenPopbillView,
  openReconcileModal,
  setDetailInvoice,
}) => {
  return (
    <>
      {detailInvoice && (() => {
        const inv = detailInvoice;
        const isPurchase = inv.ioType === "PURCHASE";
        const ourEntity = getEntity(inv.supplierEntityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP");
        const writeDateStr = inv.issueDate ? String(inv.issueDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
        const [, mm = "10", dd = "29"] = writeDateStr.split("-");
        const rawItems = Array.isArray(inv.taxItems) && inv.taxItems.length > 0
          ? inv.taxItems
          : [
              {
                month: mm,
                day: dd,
                itemName: inv.itemName || "용역/렌탈/판매 공급",
                spec: "",
                qty: 1,
                unitCost: Number(inv.supplyAmount || 0),
                supplyAmount: Number(inv.supplyAmount || 0),
                vatAmount: Number(inv.vatAmount || 0),
                remark: "",
              },
            ];
        const paddedRows = [...rawItems];
        while (paddedRows.length < 4) {
          paddedRows.push({ isBlank: true });
        }

        const supplierBizNo = isPurchase ? (inv.businessNo || "-") : (inv.supplierCorpNum || ourEntity.bizNum);
        const supplierName = isPurchase ? inv.customerName : (inv.supplierCorpName || ourEntity.corpName);
        const supplierCeo = isPurchase ? (inv.ceoName || "-") : (inv.supplierCeoName || ourEntity.ceoName);
        const supplierAddr = isPurchase ? (inv.customerAddress || "-") : ourEntity.address;

        const buyerBizNo = isPurchase ? ourEntity.bizNum : (inv.businessNo || "-");
        const buyerName = isPurchase ? ourEntity.corpName : inv.customerName;
        const buyerCeo = isPurchase ? ourEntity.ceoName : (inv.ceoName || "-");
        const buyerAddr = isPurchase ? ourEntity.address : (inv.customerAddress || "-");

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white border border-slate-300 rounded shadow-2xl max-w-4xl w-full max-h-[94vh] overflow-y-auto text-slate-900">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">
                  전자세금계산서 상세조회 ({isPurchase ? "매입" : "매출"})
                </h3>
                <button
                  onClick={() => setDetailInvoice(null)}
                  className="text-slate-500 hover:text-slate-900 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-600 px-1">
                  <div>
                    <span className="font-bold text-slate-800">계산서번호:</span>{" "}
                    <span className="font-mono">{inv.invoiceNo}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">국세청 승인번호:</span>{" "}
                    <span className="font-mono text-blue-700 font-semibold">{inv.ntsConfirmNo || "-"}</span>
                  </div>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <tbody>
                    <tr>
                      <th rowSpan={4} className="w-9 bg-[#f8d7da] text-[#842029] border border-red-300 font-bold text-center leading-tight p-1">
                        공<br />급<br />자
                      </th>
                      <th className="w-20 bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">등록번호</th>
                      <td className="border border-red-200 p-2 font-mono font-bold text-center text-slate-900">
                        {supplierBizNo}
                      </td>
                      <th className="w-16 bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">종사업장</th>
                      <td className="w-20 border border-red-200 p-2 text-center text-slate-600">-</td>

                      <th rowSpan={4} className="w-9 bg-[#cfe2ff] text-[#084298] border border-blue-300 font-bold text-center leading-tight p-1">
                        공<br />급<br />받<br />는<br />자
                      </th>
                      <th className="w-20 bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">등록번호</th>
                      <td className="border border-blue-200 p-2 font-mono font-bold text-center text-slate-900">
                        {buyerBizNo}
                      </td>
                      <th className="w-16 bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">종사업장</th>
                      <td className="w-20 border border-blue-200 p-2 text-center text-slate-600">-</td>
                    </tr>
                    <tr>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">상호</th>
                      <td className="border border-red-200 p-2 font-semibold text-slate-900">{supplierName}</td>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">성명</th>
                      <td className="border border-red-200 p-2 text-slate-900">{supplierCeo}</td>

                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">상호</th>
                      <td className="border border-blue-200 p-2 font-semibold text-slate-900">{buyerName}</td>
                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">성명</th>
                      <td className="border border-blue-200 p-2 text-slate-900">{buyerCeo}</td>
                    </tr>
                    <tr>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">사업장</th>
                      <td colSpan={3} className="border border-red-200 p-2 text-slate-800">{supplierAddr}</td>

                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">사업장</th>
                      <td colSpan={3} className="border border-blue-200 p-2 text-slate-800">{buyerAddr}</td>
                    </tr>
                    <tr>
                      <th className="bg-[#fff0f1] text-slate-700 border border-red-200 p-2 text-center font-semibold">이메일</th>
                      <td colSpan={3} className="border border-red-200 p-2 font-mono text-slate-800">
                        {isPurchase ? (inv.customerEmail || "-") : ourEntity.email}
                      </td>

                      <th className="bg-[#eef4ff] text-slate-700 border border-blue-200 p-2 text-center font-semibold">이메일</th>
                      <td colSpan={3} className="border border-blue-200 p-2 font-mono text-slate-800">
                        {isPurchase ? ourEntity.email : (inv.customerEmail || "-")}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-[#ebf7f6] text-slate-800 font-bold">
                      <th className="border border-slate-300 p-2 text-center w-28">작성일자</th>
                      <th className="border border-slate-300 p-2 text-center w-36">공급가액</th>
                      <th className="border border-slate-300 p-2 text-center w-32">세액</th>
                      <th className="border border-slate-300 p-2 text-center w-36">합계금액</th>
                      <th className="border border-slate-300 p-2 text-center">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2 text-center font-mono">{writeDateStr}</td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                        {Number(inv.supplyAmount || 0).toLocaleString("ko-KR")}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                        {Number(inv.vatAmount || 0).toLocaleString("ko-KR")}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold text-blue-900">
                        {Number(inv.totalAmount || 0).toLocaleString("ko-KR")}
                      </td>
                      <td className="border border-slate-300 p-2 text-left">{inv.memo || inv.itemName || ""}</td>
                    </tr>
                  </tbody>
                </table>

                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-[#ebf7f6] text-slate-800 font-bold">
                      <th className="border border-slate-300 p-2 text-center w-10">월</th>
                      <th className="border border-slate-300 p-2 text-center w-10">일</th>
                      <th className="border border-slate-300 p-2 text-center">품목</th>
                      <th className="border border-slate-300 p-2 text-center w-24">규격</th>
                      <th className="border border-slate-300 p-2 text-center w-16">수량</th>
                      <th className="border border-slate-300 p-2 text-center w-28">단가</th>
                      <th className="border border-slate-300 p-2 text-center w-28">공급가액</th>
                      <th className="border border-slate-300 p-2 text-center w-24">세액</th>
                      <th className="border border-slate-300 p-2 text-center w-28">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paddedRows.map((row: any, idx: number) =>
                      row.isBlank ? (
                        <tr key={idx} className="h-8">
                          <td className="border border-slate-300 p-2">&nbsp;</td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                          <td className="border border-slate-300 p-2"></td>
                        </tr>
                      ) : (
                        <tr key={idx}>
                          <td className="border border-slate-300 p-2 text-center font-mono">{row.month || mm}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{row.day || dd}</td>
                          <td className="border border-slate-300 p-2 font-medium">{row.itemName}</td>
                          <td className="border border-slate-300 p-2 text-center">{row.spec || ""}</td>
                          <td className="border border-slate-300 p-2 text-right font-mono">
                            {row.qty != null ? Number(row.qty).toLocaleString("ko-KR") : "1"}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-mono">
                            {row.unitCost != null ? Number(row.unitCost).toLocaleString("ko-KR") : ""}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-semibold">
                            {row.supplyAmount != null ? Number(row.supplyAmount).toLocaleString("ko-KR") : ""}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-mono">
                            {row.vatAmount != null ? Number(row.vatAmount).toLocaleString("ko-KR") : ""}
                          </td>
                          <td className="border border-slate-300 p-2">{row.remark || ""}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>

                <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-200 mt-1">
                  <button
                    type="button"
                    onClick={() => setDetailInvoice(null)}
                    className="px-4 py-1.5 rounded border border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold text-xs"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = detailInvoice;
                      setDetailInvoice(null);
                      openReconcileModal(target);
                    }}
                    className="px-4 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
                  >
                    통장 입출금 대사 연결
                  </button>
                  {!isPurchase && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenPopbillView(inv)}
                        className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                      >
                        국세청 서식 창 열기
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPopbillPrint(inv)}
                        className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                      >
                        출력 (인쇄)
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteInvoice(inv)}
                    className="px-3.5 py-1.5 rounded border border-rose-600 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};
