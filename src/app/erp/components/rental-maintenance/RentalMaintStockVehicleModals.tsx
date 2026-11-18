"use client";

import React from "react";
import { ArrowRightLeft, Package, Truck, X } from "lucide-react";
import SearchSelectCombobox, { type SearchSelectOption } from "../SearchSelectCombobox";
import { PART_TRANSFER_TYPE_LABELS, type PartStockSource, type PartTransferType } from "@/lib/rentalMaintenanceDomain";
import { sanitizeDecimalText, type EmployeeOption } from "./rentalMaintenanceTypes";
import { formatErpInputNumber } from "@/lib/erpFormat";

export interface TransferModalProps {
  handleSaveTransfer: () => Promise<void>;
  savingTransfer: boolean;
  setShowTransferModal: React.Dispatch<React.SetStateAction<boolean>>;
  setTransferDate: React.Dispatch<React.SetStateAction<string>>;
  setTransferFromVehicleId: React.Dispatch<React.SetStateAction<string>>;
  setTransferNote: React.Dispatch<React.SetStateAction<string>>;
  setTransferProductId: React.Dispatch<React.SetStateAction<string>>;
  setTransferQty: React.Dispatch<React.SetStateAction<string>>;
  setTransferTargetQty: React.Dispatch<React.SetStateAction<string>>;
  setTransferToVehicleId: React.Dispatch<React.SetStateAction<string>>;
  setTransferType: React.Dispatch<React.SetStateAction<PartTransferType>>;
  showTransferModal: boolean;
  transferDate: string;
  transferFromVehicleId: string;
  transferNote: string;
  transferProductId: string;
  transferQty: string;
  transferSourcePartOptions: SearchSelectOption[];
  transferTargetQty: string;
  transferToVehicleId: string;
  transferType: PartTransferType;
  vehicleComboOptions: SearchSelectOption[];
}

export const TransferModal: React.FC<TransferModalProps> = ({
  handleSaveTransfer,
  savingTransfer,
  setShowTransferModal,
  setTransferDate,
  setTransferFromVehicleId,
  setTransferNote,
  setTransferProductId,
  setTransferQty,
  setTransferTargetQty,
  setTransferToVehicleId,
  setTransferType,
  showTransferModal,
  transferDate,
  transferFromVehicleId,
  transferNote,
  transferProductId,
  transferQty,
  transferSourcePartOptions,
  transferTargetQty,
  transferToVehicleId,
  transferType,
  vehicleComboOptions,
}) => {
  return (
    <>
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                <h3 className="text-sm font-bold">부품 재고 이동</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="p-1 rounded hover:bg-[#dcd4c4] dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">이동 유형</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      "LOAD_TO_VEHICLE",
                      "RETURN_TO_YARD",
                      "VEHICLE_TRANSFER",
                    ] as PartTransferType[]
                  ).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTransferType(t)}
                      className={`h-8 px-2 rounded border text-xs font-semibold whitespace-nowrap ${
                        transferType === t
                          ? "bg-slate-900 text-[#f4efe4] border-slate-900 dark:bg-amber-600 dark:text-slate-950"
                          : "bg-[#ebe5d8] text-slate-800 border-[#b5a894] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {PART_TRANSFER_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {(transferType === "RETURN_TO_YARD" || transferType === "VEHICLE_TRANSFER") && (
                <div className="flex flex-col gap-1">
                  <SearchSelectCombobox
                    label="출발 정비차량"
                    required
                    options={vehicleComboOptions}
                    value={transferFromVehicleId}
                    onChange={setTransferFromVehicleId}
                    placeholder="출발 차량 선택"
                  />
                </div>
              )}

              {(transferType === "LOAD_TO_VEHICLE" || transferType === "VEHICLE_TRANSFER") && (
                <div className="flex flex-col gap-1">
                  <SearchSelectCombobox
                    label="도착 정비차량"
                    required
                    options={vehicleComboOptions}
                    value={transferToVehicleId}
                    onChange={setTransferToVehicleId}
                    placeholder="도착 차량 선택"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <SearchSelectCombobox
                  label="부품 품목"
                  required
                  options={transferSourcePartOptions}
                  value={transferProductId}
                  onChange={setTransferProductId}
                  placeholder="부품명·품목코드·품번 검색"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">이동수량 *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={transferQty}
                    onChange={(e) => setTransferQty(sanitizeDecimalText(e.target.value))}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">이동일자</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">차량 목표수량</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={transferTargetQty}
                    disabled={transferType === "RETURN_TO_YARD"}
                    onChange={(e) => setTransferTargetQty(sanitizeDecimalText(e.target.value))}
                    placeholder="선택"
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">비고</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-t border-[#b5a894] dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="h-8 px-4 rounded border border-[#b5a894] bg-[#f4efe4] dark:bg-slate-700 text-xs font-semibold"
              >
                취소
              </button>
              <button
                type="button"
                disabled={savingTransfer}
                onClick={() => void handleSaveTransfer()}
                className="h-8 px-4 rounded bg-slate-900 text-[#f4efe4] dark:bg-amber-600 dark:text-slate-950 text-xs font-bold"
              >
                {savingTransfer ? "처리 중..." : "이동 확정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export interface VehicleModalProps {
  editingVehicleId: number | null;
  employeeComboOptions: SearchSelectOption[];
  employees: EmployeeOption[];
  handleSaveVehicle: () => Promise<void>;
  savingVehicle: boolean;
  setShowVehicleModal: React.Dispatch<React.SetStateAction<boolean>>;
  setVehDriverId: React.Dispatch<React.SetStateAction<string>>;
  setVehDriverName: React.Dispatch<React.SetStateAction<string>>;
  setVehDriverPhone: React.Dispatch<React.SetStateAction<string>>;
  setVehMemo: React.Dispatch<React.SetStateAction<string>>;
  setVehName: React.Dispatch<React.SetStateAction<string>>;
  setVehNo: React.Dispatch<React.SetStateAction<string>>;
  setVehRegion: React.Dispatch<React.SetStateAction<string>>;
  setVehStatus: React.Dispatch<React.SetStateAction<"ACTIVE" | "INACTIVE">>;
  showVehicleModal: boolean;
  vehDriverId: string;
  vehDriverName: string;
  vehDriverPhone: string;
  vehMemo: string;
  vehName: string;
  vehNo: string;
  vehRegion: string;
  vehStatus: "ACTIVE" | "INACTIVE";
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  editingVehicleId,
  employeeComboOptions,
  employees,
  handleSaveVehicle,
  savingVehicle,
  setShowVehicleModal,
  setVehDriverId,
  setVehDriverName,
  setVehDriverPhone,
  setVehMemo,
  setVehName,
  setVehNo,
  setVehRegion,
  setVehStatus,
  showVehicleModal,
  vehDriverId,
  vehDriverName,
  vehDriverPhone,
  vehMemo,
  vehName,
  vehNo,
  vehRegion,
  vehStatus,
}) => {
  return (
    <>
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <h3 className="text-sm font-bold">
                  {editingVehicleId ? "정비차량 수정" : "정비차량 등록"}
                </h3>
              </div>
              <button type="button" onClick={() => setShowVehicleModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">차량번호 *</label>
                  <input
                    type="text"
                    value={vehNo}
                    onChange={(e) => setVehNo(e.target.value)}
                    placeholder="80라 1234"
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">차량명칭 *</label>
                  <input
                    type="text"
                    value={vehName}
                    onChange={(e) => setVehName(e.target.value)}
                    placeholder="정비 1호차"
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SearchSelectCombobox
                  label="전담 정비인력"
                  options={employeeComboOptions}
                  value={vehDriverId}
                  onChange={(val) => {
                    setVehDriverId(val);
                    const emp = employees.find((e) => String(e.id) === val);
                    if (emp) {
                      setVehDriverName(emp.name);
                      if (emp.phone) setVehDriverPhone(emp.phone);
                    }
                  }}
                  clearable
                />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">기사명</label>
                  <input
                    type="text"
                    value={vehDriverName}
                    onChange={(e) => setVehDriverName(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">연락처</label>
                  <input
                    type="text"
                    value={vehDriverPhone}
                    onChange={(e) => setVehDriverPhone(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">담당권역</label>
                  <input
                    type="text"
                    value={vehRegion}
                    onChange={(e) => setVehRegion(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">운행상태</label>
                  <select
                    value={vehStatus}
                    onChange={(e) => setVehStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  >
                    <option value="ACTIVE">운행중</option>
                    <option value="INACTIVE">중지</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">비고</label>
                <input
                  type="text"
                  value={vehMemo}
                  onChange={(e) => setVehMemo(e.target.value)}
                  className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-t border-[#b5a894] dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVehicleModal(false)}
                className="h-8 px-4 rounded border border-[#b5a894] bg-[#f4efe4] dark:bg-slate-700 text-xs font-semibold"
              >
                취소
              </button>
              <button
                type="button"
                disabled={savingVehicle}
                onClick={() => void handleSaveVehicle()}
                className="h-8 px-4 rounded bg-slate-900 text-[#f4efe4] dark:bg-amber-600 dark:text-slate-950 text-xs font-bold"
              >
                {savingVehicle ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export interface QuickPartModalProps {
  handleSaveQuickPart: () => Promise<void>;
  qpCategory: string;
  qpCost: string;
  qpInitialStock: string;
  qpName: string;
  qpPartNo: string;
  qpPrice: string;
  qpSafetyStock: string;
  qpSkuCode: string;
  qpUnit: string;
  savingQuickPart: boolean;
  setQpCategory: React.Dispatch<React.SetStateAction<string>>;
  setQpCost: React.Dispatch<React.SetStateAction<string>>;
  setQpInitialStock: React.Dispatch<React.SetStateAction<string>>;
  setQpName: React.Dispatch<React.SetStateAction<string>>;
  setQpPartNo: React.Dispatch<React.SetStateAction<string>>;
  setQpPrice: React.Dispatch<React.SetStateAction<string>>;
  setQpSafetyStock: React.Dispatch<React.SetStateAction<string>>;
  setQpSkuCode: React.Dispatch<React.SetStateAction<string>>;
  setQpUnit: React.Dispatch<React.SetStateAction<string>>;
  setShowQuickPartModal: React.Dispatch<React.SetStateAction<boolean>>;
  showQuickPartModal: boolean;
}

export const QuickPartModal: React.FC<QuickPartModalProps> = ({
  handleSaveQuickPart,
  qpCategory,
  qpCost,
  qpInitialStock,
  qpName,
  qpPartNo,
  qpPrice,
  qpSafetyStock,
  qpSkuCode,
  qpUnit,
  savingQuickPart,
  setQpCategory,
  setQpCost,
  setQpInitialStock,
  setQpName,
  setQpPartNo,
  setQpPrice,
  setQpSafetyStock,
  setQpSkuCode,
  setQpUnit,
  setShowQuickPartModal,
  showQuickPartModal,
}) => {
  return (
    <>
      {showQuickPartModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <h3 className="text-sm font-bold">부품 SKU 등록</h3>
              </div>
              <button type="button" onClick={() => setShowQuickPartModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">부품명 *</label>
                  <input
                    type="text"
                    value={qpName}
                    onChange={(e) => setQpName(e.target.value)}
                    placeholder="엔진오일 필터"
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">품번(P/N)</label>
                  <input
                    type="text"
                    value={qpPartNo}
                    onChange={(e) => setQpPartNo(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">품목코드</label>
                  <input
                    type="text"
                    value={qpSkuCode}
                    onChange={(e) => setQpSkuCode(e.target.value)}
                    placeholder="미입력 시 자동"
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">부품분류</label>
                  <input
                    type="text"
                    value={qpCategory}
                    onChange={(e) => setQpCategory(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">단위</label>
                  <input
                    type="text"
                    value={qpUnit}
                    onChange={(e) => setQpUnit(e.target.value)}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">원가(원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={qpCost}
                    onChange={(e) => setQpCost(formatErpInputNumber(e.target.value))}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">단가(원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={qpPrice}
                    onChange={(e) => setQpPrice(formatErpInputNumber(e.target.value))}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">안전재고</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={qpSafetyStock}
                    onChange={(e) => setQpSafetyStock(sanitizeDecimalText(e.target.value))}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">기초재고</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={qpInitialStock}
                    onChange={(e) => setQpInitialStock(sanitizeDecimalText(e.target.value))}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-t border-[#b5a894] dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowQuickPartModal(false)}
                className="h-8 px-4 rounded border border-[#b5a894] bg-[#f4efe4] dark:bg-slate-700 text-xs font-semibold"
              >
                취소
              </button>
              <button
                type="button"
                disabled={savingQuickPart}
                onClick={() => void handleSaveQuickPart()}
                className="h-8 px-4 rounded bg-slate-900 text-[#f4efe4] dark:bg-amber-600 dark:text-slate-950 text-xs font-bold"
              >
                {savingQuickPart ? "등록 중..." : "부품 등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export interface YardReceiptModalProps {
  buildPartComboOptions: (sourceType: PartStockSource, vehicleIdStr?: string) => SearchSelectOption[];
  handleSaveYardReceipt: () => Promise<void>;
  savingYardReceipt: boolean;
  setShowYardReceiptModal: React.Dispatch<React.SetStateAction<boolean>>;
  setYrDate: React.Dispatch<React.SetStateAction<string>>;
  setYrNote: React.Dispatch<React.SetStateAction<string>>;
  setYrProductId: React.Dispatch<React.SetStateAction<string>>;
  setYrQty: React.Dispatch<React.SetStateAction<string>>;
  showYardReceiptModal: boolean;
  yrDate: string;
  yrNote: string;
  yrProductId: string;
  yrQty: string;
}

export const YardReceiptModal: React.FC<YardReceiptModalProps> = ({
  buildPartComboOptions,
  handleSaveYardReceipt,
  savingYardReceipt,
  setShowYardReceiptModal,
  setYrDate,
  setYrNote,
  setYrProductId,
  setYrQty,
  showYardReceiptModal,
  yrDate,
  yrNote,
  yrProductId,
  yrQty,
}) => {
  return (
    <>
      {showYardReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#f4efe4] dark:bg-slate-900 border border-[#b5a894] dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-b border-[#b5a894] dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold">주기장 부품 입고</h3>
              <button type="button" onClick={() => setShowYardReceiptModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <SearchSelectCombobox
                label="입고 부품 품목"
                required
                options={buildPartComboOptions("YARD")}
                value={yrProductId}
                onChange={setYrProductId}
                placeholder="부품 선택"
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">입고수량 *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={yrQty}
                    onChange={(e) => setYrQty(sanitizeDecimalText(e.target.value))}
                    className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs font-mono text-right"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">입고일자</label>
                  <input
                    type="date"
                    value={yrDate}
                    onChange={(e) => setYrDate(e.target.value)}
                    className="h-9 px-2 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">비고</label>
                <input
                  type="text"
                  value={yrNote}
                  onChange={(e) => setYrNote(e.target.value)}
                  className="h-9 px-2.5 rounded border border-[#b5a894] dark:border-slate-700 bg-[#fdfbf7] dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-800 border-t border-[#b5a894] dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowYardReceiptModal(false)}
                className="h-8 px-4 rounded border border-[#b5a894] bg-[#f4efe4] dark:bg-slate-700 text-xs font-semibold"
              >
                취소
              </button>
              <button
                type="button"
                disabled={savingYardReceipt}
                onClick={() => void handleSaveYardReceipt()}
                className="h-8 px-4 rounded bg-slate-900 text-[#f4efe4] dark:bg-amber-600 dark:text-slate-950 text-xs font-bold"
              >
                {savingYardReceipt ? "처리 중..." : "입고 확정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
