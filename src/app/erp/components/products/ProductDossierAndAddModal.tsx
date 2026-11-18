"use client";

import React, { useEffect, useState } from "react";
import { Package, Edit2, Save, X, Cpu, Layers, ExternalLink } from "lucide-react";
import {
  cleanErpNumber,
  formatErpCurrency,
  formatErpInputNumber,
  formatErpNumber,
  toErpInputString,
} from "@/lib/erpFormat";
import { calculateAutoDailyRentalFee } from "@/lib/rentalFeeUtils";
import {
  FORKLIFT_ITEM_CLASS_OPTIONS,
  type ForkliftItemClass,
  type ForkliftSpecData,
  getItemClassLabel,
  normalizeItemClass,
} from "@/lib/forkliftDomain";
import ForkliftSpecEditor from "../ForkliftSpecEditor";

export interface ProductModel {
  id: number;
  modelCode: string;
  modelName: string;
  shortName: string | null;
  category: string;
  manufacturer: string;
  standardMonthlyRate: number;
  standardDailyRate: number;
  standardPrice: number;
  cpu: string | null;
  ram: string | null;
  storage: string | null;
  gpu: string | null;
  spec: string;
  warrantyType: string | null;
  itemClass?: ForkliftItemClass;
  partNo?: string;
  installFee?: number;
  warrantyMonths?: number;
  warrantyHours?: number;
  specData?: ForkliftSpecData;
  status: string;
  createdAt: string;
  totalAssets: number;
  ownedAssets: number;
  subleasedAssets: number;
  availableAssets: number;
  rentedAssets: number;
  repairingAssets: number;
}

export interface ProductAddFormState {
  modelCode: string;
  modelName: string;
  shortName: string;
  itemClass: ForkliftItemClass;
  category: string;
  manufacturer: string;
  standardMonthlyRate: string;
  standardDailyRate: string;
  standardPrice: string;
  partNo: string;
  installFee: string;
  warrantyMonths: string;
  warrantyHours: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  spec: string;
  specData: ForkliftSpecData;
  warrantyType: string;
}

interface ProductDossierAndAddModalProps {
  selectedProduct: ProductModel | null;
  isAdmin: boolean;
  isEditingDossier: boolean;
  setIsEditingDossier: React.Dispatch<React.SetStateAction<boolean>>;
  editForm: Partial<ProductModel>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<ProductModel>>>;
  mappedAssets: any[];
  loadingMappedAssets: boolean;
  uniqueCategories: string[];
  onSaveEdit: () => void;
  onCloseDossier: () => void;
  onNavigateToAsset?: (modelName?: string) => void;
  showAddModal: boolean;
  addForm: ProductAddFormState;
  setAddForm: React.Dispatch<React.SetStateAction<ProductAddFormState>>;
  onAddProduct: (e: React.FormEvent) => void;
  onCloseAddModal: () => void;
}

export const ProductDossierAndAddModal: React.FC<ProductDossierAndAddModalProps> = ({
  selectedProduct,
  isAdmin,
  isEditingDossier,
  setIsEditingDossier,
  editForm,
  setEditForm,
  mappedAssets,
  loadingMappedAssets,
  uniqueCategories,
  onSaveEdit,
  onCloseDossier,
  onNavigateToAsset,
  showAddModal,
  addForm,
  setAddForm,
  onAddProduct,
  onCloseAddModal,
}) => {
  const [addDailyManual, setAddDailyManual] = useState(false);
  const [editDailyManual, setEditDailyManual] = useState(false);

  useEffect(() => {
    setEditDailyManual(false);
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (!showAddModal) setAddDailyManual(false);
  }, [showAddModal]);

  return (
    <>
      {/* 4. Slide-over Dossier Studio (마스터-디테일) */}
      {selectedProduct && (
        <aside className="w-96 border-l flex flex-col h-full shrink-0 shadow-lg overflow-hidden select-none bg-[var(--bg-card)]">
          {/* Dossier Header */}
          <div className="p-3 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate">{selectedProduct.modelName}</span>
                <span className="text-[10px] font-mono opacity-70 truncate">{selectedProduct.modelCode}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isEditingDossier ? (
                <button
                  onClick={onSaveEdit}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">저장</span>
                </button>
              ) : (
                isAdmin && (
                  <button
                    onClick={() => setIsEditingDossier(true)}
                    className="px-2 py-1 rounded border text-xs font-semibold flex items-center gap-1 hover:opacity-80 whitespace-nowrap"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>수정</span>
                  </button>
                )
              )}
              <button onClick={onCloseDossier} className="p-1 rounded hover:bg-black/10 opacity-70" title="닫기">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dossier Content Body */}
          <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-4 text-xs">
            {/* Product Specifications Section */}
            <div className="flex flex-col gap-2">
              <span className="font-bold text-[11px] opacity-75 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                <span>제품 기본 제원</span>
              </span>

              {isEditingDossier ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium">품목 구분</label>
                    <select
                      value={normalizeItemClass(
                        editForm.itemClass ?? selectedProduct.itemClass,
                        editForm.category ?? selectedProduct.category
                      )}
                      onChange={(e) => {
                        const nextCls = e.target.value as ForkliftItemClass;
                        setEditForm({
                          ...editForm,
                          itemClass: nextCls,
                          category:
                            nextCls === "FORKLIFT"
                              ? "지게차 완제품"
                              : nextCls === "OPTION"
                              ? "지게차 옵션"
                              : nextCls === "PART"
                              ? "부품·소모품"
                              : editForm.category || "IT/워크스테이션",
                        });
                      }}
                      className="h-7 px-2 border rounded text-xs font-bold"
                    >
                      {FORKLIFT_ITEM_CLASS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium">모델명</label>
                    <input type="text" value={editForm.modelName || ""} onChange={(e) => setEditForm({ ...editForm, modelName: e.target.value })} className="h-7 px-2 border rounded text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium">단축명</label>
                      <input type="text" value={editForm.shortName || ""} onChange={(e) => setEditForm({ ...editForm, shortName: e.target.value })} className="h-7 px-2 border rounded text-xs" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium">카테고리</label>
                      <select value={editForm.category || "IT/워크스테이션"} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="h-7 px-2 border rounded text-xs">
                        {uniqueCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium">제조사</label>
                    <input type="text" value={editForm.manufacturer || ""} onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })} className="h-7 px-2 border rounded text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium whitespace-nowrap">월단가 (원)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editForm.standardMonthlyRate ? toErpInputString(editForm.standardMonthlyRate) : ""}
                        onChange={(e) => {
                          const num = cleanErpNumber(e.target.value);
                          setEditForm({
                            ...editForm,
                            standardMonthlyRate: num,
                            ...(editDailyManual ? {} : { standardDailyRate: calculateAutoDailyRentalFee(num) }),
                          });
                        }}
                        placeholder="0"
                        className="h-7 px-2 border rounded text-xs font-mono text-right font-bold"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-[11px] font-medium whitespace-nowrap">일단가 (원)</label>
                        <button
                          type="button"
                          onClick={() => {
                            setEditDailyManual(false);
                            setEditForm({ ...editForm, standardDailyRate: calculateAutoDailyRentalFee(editForm.standardMonthlyRate || 0) });
                          }}
                          className="text-[10px] font-bold text-[#1d4ed8] hover:underline whitespace-nowrap shrink-0"
                        >
                          자동계산
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editForm.standardDailyRate ? toErpInputString(editForm.standardDailyRate) : ""}
                        onChange={(e) => {
                          setEditDailyManual(true);
                          setEditForm({ ...editForm, standardDailyRate: cleanErpNumber(e.target.value) });
                        }}
                        placeholder="0"
                        className="h-7 px-2 border rounded text-xs font-mono text-right font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium">표준 보증개월</label>
                      <input type="text" inputMode="numeric" value={toErpInputString(editForm.warrantyMonths ?? 12)} onChange={(e) => setEditForm({ ...editForm, warrantyMonths: cleanErpNumber(e.target.value) })} className="h-7 px-2 border rounded text-xs font-mono text-right" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium">보증 가동시간 (hr)</label>
                      <input type="text" inputMode="numeric" value={toErpInputString(editForm.warrantyHours ?? 2000)} onChange={(e) => setEditForm({ ...editForm, warrantyHours: cleanErpNumber(e.target.value) })} className="h-7 px-2 border rounded text-xs font-mono text-right" />
                    </div>
                  </div>
                  <ForkliftSpecEditor
                    compact
                    itemClass={normalizeItemClass(editForm.itemClass ?? selectedProduct.itemClass, editForm.category ?? selectedProduct.category)}
                    specData={editForm.specData ?? selectedProduct.specData ?? {}}
                    onChangeSpecData={(nextSpec) => setEditForm({ ...editForm, specData: nextSpec })}
                    partNo={editForm.partNo ?? selectedProduct.partNo ?? ""}
                    onChangePartNo={(val) => setEditForm({ ...editForm, partNo: val })}
                    fallbackSpec={editForm.spec || ""}
                    onChangeFallbackSpec={(val) => setEditForm({ ...editForm, spec: val })}
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded border flex flex-col gap-1.5 font-mono text-[11px]">
                  {[
                    ["품목 구분", getItemClassLabel(normalizeItemClass(selectedProduct.itemClass, selectedProduct.category)), "font-bold"],
                    ["제조사 / 분류", `${selectedProduct.manufacturer} (${selectedProduct.category})`, "font-semibold"],
                    ["월 표준 렌탈료", `${formatErpCurrency(selectedProduct.standardMonthlyRate)} / 월`, "font-bold text-blue-700"],
                    ["일할 기준 단가", `${formatErpCurrency(selectedProduct.standardDailyRate)} / 일`, ""],
                    ["표준 장비 판매가", formatErpCurrency(selectedProduct.standardPrice), ""],
                    ["보증 기준", `${selectedProduct.warrantyMonths ?? 12}개월 / ${formatErpNumber(selectedProduct.warrantyHours ?? 2000)}hr`, ""],
                  ].map(([label, val, cls]) => (
                    <div key={label} className="flex justify-between">
                      <span className="opacity-60">{label}</span>
                      <span className={cls}>{val}</span>
                    </div>
                  ))}
                  <div className="border-t pt-1.5 mt-1 flex flex-col gap-0.5">
                    <span className="opacity-60">제원 상세</span>
                    <span className="font-sans leading-relaxed">{selectedProduct.spec || "-"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Real-time Mapped Assets Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] opacity-75 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>실제 보유 자산 목록 ({formatErpNumber(mappedAssets.length)}대)</span>
                </span>
                {onNavigateToAsset && (
                  <button onClick={() => onNavigateToAsset(selectedProduct.modelName)} className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold whitespace-nowrap">
                    <span>자산관리 이동</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {loadingMappedAssets ? (
                <div className="p-4 text-center opacity-60 text-xs font-mono">자산 목록 조회 중...</div>
              ) : mappedAssets.length === 0 ? (
                <div className="p-4 text-center border rounded opacity-60 text-xs">
                  등록된 실제 자산이 없습니다. 자산 취득 등록을 진행해 주십시오.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                  {mappedAssets.map((a: any) => (
                    <div key={a.id} className="p-2 rounded border flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono text-blue-700">{a.assetNo}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            a.status === "RENTED"
                              ? "bg-blue-600 text-white"
                              : a.status === "AVAILABLE"
                              ? "bg-emerald-600 text-white"
                              : "bg-amber-600 text-white"
                          }`}
                        >
                          {a.status === "RENTED" ? "대여중" : a.status === "AVAILABLE" ? "임대가능" : a.status === "REPAIRING" ? "수리중" : a.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] opacity-75">
                        <span>S/N: {a.serialNo || "-"}</span>
                        <span>{a.ownerType === "OWNED" ? "자사자산" : "외부임차"}</span>
                      </div>
                      {a.currentCustomer && (
                        <div className="text-[10px] opacity-90 truncate text-emerald-800">
                          대여처: {a.currentCustomer} ({a.currentSite || "-"})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* 5. Modal: Add New Product Model */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-lg border p-5 shadow-2xl erp-login-card flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-sm">신규 제품 모델 등록</span>
              </div>
              <button onClick={onCloseAddModal} className="opacity-70 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onAddProduct} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold">품목 구분 *</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {FORKLIFT_ITEM_CLASS_OPTIONS.map((clsOpt) => (
                    <button
                      key={clsOpt.value}
                      type="button"
                      onClick={() =>
                        setAddForm({
                          ...addForm,
                          itemClass: clsOpt.value,
                          category:
                            clsOpt.value === "FORKLIFT"
                              ? "지게차 완제품"
                              : clsOpt.value === "OPTION"
                              ? "지게차 옵션"
                              : clsOpt.value === "PART"
                              ? "부품·소모품"
                              : "IT/워크스테이션",
                        })
                      }
                      className={`h-8 rounded border font-bold text-xs whitespace-nowrap transition ${
                        addForm.itemClass === clsOpt.value ? "bg-blue-600 text-white border-blue-600" : "hover:opacity-80"
                      }`}
                    >
                      {clsOpt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">모델 코드 (고유 식별자) *</label>
                  <input type="text" required value={addForm.modelCode} onChange={(e) => setAddForm({ ...addForm, modelCode: e.target.value })} placeholder="예: D30S-7" className="h-8 px-2.5 border rounded" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">모델명 (공식 명칭) *</label>
                  <input type="text" required value={addForm.modelName} onChange={(e) => setAddForm({ ...addForm, modelName: e.target.value })} placeholder="예: 두산 3.0톤 디젤 지게차" className="h-8 px-2.5 border rounded" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">단축명</label>
                  <input type="text" value={addForm.shortName} onChange={(e) => setAddForm({ ...addForm, shortName: e.target.value })} placeholder="예: D30S" className="h-8 px-2.5 border rounded" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">카테고리</label>
                  <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className="h-8 px-2 border rounded">
                    {uniqueCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">제조사</label>
                  <input type="text" value={addForm.manufacturer} onChange={(e) => setAddForm({ ...addForm, manufacturer: e.target.value })} placeholder="예: 두산 / 현대 / 클라크" className="h-8 px-2.5 border rounded" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold whitespace-nowrap">표준 월단가 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={addForm.standardMonthlyRate}
                    onChange={(e) => {
                      const formatted = formatErpInputNumber(e.target.value);
                      const monthlyNum = cleanErpNumber(formatted);
                      setAddForm({
                        ...addForm,
                        standardMonthlyRate: formatted,
                        ...(addDailyManual ? {} : { standardDailyRate: toErpInputString(calculateAutoDailyRentalFee(monthlyNum)) }),
                      });
                    }}
                    placeholder="350,000"
                    className="h-8 px-2.5 border rounded font-mono text-right font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <label className="font-semibold whitespace-nowrap">표준 일단가 (원)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAddDailyManual(false);
                        setAddForm({ ...addForm, standardDailyRate: toErpInputString(calculateAutoDailyRentalFee(cleanErpNumber(addForm.standardMonthlyRate))) });
                      }}
                      className="text-[10px] font-bold text-[#1d4ed8] hover:underline whitespace-nowrap shrink-0"
                    >
                      자동계산
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={addForm.standardDailyRate}
                    onChange={(e) => {
                      setAddDailyManual(true);
                      setAddForm({ ...addForm, standardDailyRate: formatErpInputNumber(e.target.value) });
                    }}
                    placeholder="12,000"
                    className="h-8 px-2.5 border rounded font-mono text-right font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold whitespace-nowrap">표준 판매가 (원)</label>
                  <input type="text" inputMode="numeric" value={addForm.standardPrice} onChange={(e) => setAddForm({ ...addForm, standardPrice: formatErpInputNumber(e.target.value) })} placeholder="3,200,000" className="h-8 px-2.5 border rounded font-mono text-right font-bold" />
                </div>
              </div>

              {addForm.itemClass === "OPTION" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold whitespace-nowrap">옵션 설치공임비 (원)</label>
                    <input type="text" inputMode="numeric" value={addForm.installFee} onChange={(e) => setAddForm({ ...addForm, installFee: formatErpInputNumber(e.target.value) })} placeholder="0" className="h-8 px-2.5 border rounded font-mono text-right font-bold" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold whitespace-nowrap">표준 부품번호</label>
                    <input type="text" value={addForm.partNo} onChange={(e) => setAddForm({ ...addForm, partNo: e.target.value })} placeholder="예: OPT-SS-01" className="h-8 px-2.5 border rounded font-mono" />
                  </div>
                </div>
              )}

              {addForm.itemClass === "FORKLIFT" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold whitespace-nowrap">표준 보증개월</label>
                    <input type="text" inputMode="numeric" value={addForm.warrantyMonths} onChange={(e) => setAddForm({ ...addForm, warrantyMonths: formatErpInputNumber(e.target.value) })} placeholder="12" className="h-8 px-2.5 border rounded font-mono text-right font-bold" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold whitespace-nowrap">보증 한도 가동시간 (hr)</label>
                    <input type="text" inputMode="numeric" value={addForm.warrantyHours} onChange={(e) => setAddForm({ ...addForm, warrantyHours: formatErpInputNumber(e.target.value) })} placeholder="2,000" className="h-8 px-2.5 border rounded font-mono text-right font-bold" />
                  </div>
                </div>
              )}

              {addForm.itemClass === "GENERAL" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold">CPU / 프로세서</label>
                    <input type="text" value={addForm.cpu} onChange={(e) => setAddForm({ ...addForm, cpu: e.target.value })} placeholder="예: Intel Core i9-14900K" className="h-8 px-2.5 border rounded" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold">RAM / 메모리</label>
                    <input type="text" value={addForm.ram} onChange={(e) => setAddForm({ ...addForm, ram: e.target.value })} placeholder="예: 64GB DDR5" className="h-8 px-2.5 border rounded" />
                  </div>
                </div>
              )}

              <ForkliftSpecEditor
                itemClass={addForm.itemClass}
                specData={addForm.specData}
                onChangeSpecData={(nextSpec) => setAddForm({ ...addForm, specData: nextSpec })}
                partNo={addForm.partNo}
                onChangePartNo={(val) => setAddForm({ ...addForm, partNo: val })}
                fallbackSpec={addForm.spec}
                onChangeFallbackSpec={(val) => setAddForm({ ...addForm, spec: val })}
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={onCloseAddModal} className="px-3 py-1.5 rounded border text-xs hover:opacity-80 whitespace-nowrap">
                  취소
                </button>
                <button type="submit" className="px-4 py-1.5 rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm whitespace-nowrap">
                  제품 등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
