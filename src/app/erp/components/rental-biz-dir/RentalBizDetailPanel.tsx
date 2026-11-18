"use client";

import React from "react";
import {
  Truck,
  ExternalLink,
  UserPlus,
  CheckCircle2,
  Trash2,
  Edit3,
  Save,
} from "lucide-react";
import {
  RentalBizRecord,
  SECTOR_META,
  OA_SUPPLY_META,
  resolveOaSupplyType,
} from "./rentalBizTypes";

export interface RentalBizDetailPanelProps {
  selectedItem: RentalBizRecord | null;
  memoDraft: string;
  setMemoDraft: (val: string) => void;
  registeringId: number | null;
  openEditModal: (item: RentalBizRecord) => void;
  handleDelete: (id: number, name: string) => void;
  handleQuickUpdate: (id: number, patch: Partial<RentalBizRecord>) => void;
  handleRegisterToPartner: (item: RentalBizRecord, role: "CUSTOMER" | "VENDOR") => void;
}

export const RentalBizDetailPanel: React.FC<RentalBizDetailPanelProps> = ({
  selectedItem,
  memoDraft,
  setMemoDraft,
  registeringId,
  openEditModal,
  handleDelete,
  handleQuickUpdate,
  handleRegisterToPartner,
}) => {
  return (
    <div className="col-span-12 lg:col-span-5 bg-[#f4efe4] border border-[#b8ae99] rounded flex flex-col min-h-0 overflow-hidden">
      {selectedItem ? (
        <div className="flex flex-col h-full overflow-hidden">
          {/* 상단 요약 헤더 */}
          <div className="p-3 bg-[#e2dbcd] border-b border-[#b8ae99] space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-extrabold border ${
                    (SECTOR_META[selectedItem.sector] || SECTOR_META.FL).badgeClass
                  }`}
                >
                  {(SECTOR_META[selectedItem.sector] || SECTOR_META.FL).label}
                </span>
                {selectedItem.sector === "OA_PC" && (() => {
                  const supMeta = OA_SUPPLY_META[resolveOaSupplyType(selectedItem)];
                  return (
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-extrabold border ${supMeta.badgeClass}`}
                    >
                      {supMeta.label}
                    </span>
                  );
                })()}
                <span className="px-2 py-0.5 rounded bg-[#f4efe4] border border-[#b8ae99] text-[10.5px] font-mono font-bold text-[#334155]">
                  {selectedItem.ksicCode}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditModal(selectedItem)}
                  className="p-1 rounded bg-[#f4efe4] hover:bg-[#d8d0c0] border border-[#b8ae99] text-[#0f172a]"
                  title="정보 수정"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedItem.id, selectedItem.companyName)}
                  className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-300 text-red-700"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-[#0f172a] truncate">
                {selectedItem.companyName}
              </h3>
              <select
                value={selectedItem.salesStatus}
                onChange={(e) =>
                  handleQuickUpdate(selectedItem.id, { salesStatus: e.target.value })
                }
                className="px-2 py-1 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold text-[#0f172a]"
              >
                <option value="TARGET">발굴완료(타깃)</option>
                <option value="CONTACTED">접촉/제안중</option>
                <option value="PARTNER">매입처 등록됨</option>
                <option value="CUSTOMER">매출처 등록됨</option>
                <option value="HOLD">보류</option>
              </select>
            </div>

            {/* ERP 거래처 1클릭 연동 버튼 */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {selectedItem.isRegisteredCustomer ? (
                <span className="px-2.5 py-1 rounded bg-emerald-100 border border-emerald-500 text-emerald-950 text-[11px] font-extrabold flex items-center gap-1 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ERP 고객 관리(매출처) 등록 완료</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRegisterToPartner(selectedItem, "CUSTOMER")}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shadow-xs"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>ERP 고객사(매출처)로 즉시 등록</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleRegisterToPartner(selectedItem, "VENDOR")}
                className="px-2.5 py-1 rounded bg-violet-700 hover:bg-violet-800 text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shadow-xs"
              >
                <Truck className="w-3 h-3" />
                <span>
                  {selectedItem.isRegisteredVendor
                    ? "매입거래처 등록됨"
                    : "ERP 매입거래처로 등록"}
                </span>
              </button>

              {selectedItem.websiteUrl && (
                <a
                  href={selectedItem.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-[#f4efe4] hover:bg-[#d8d0c0] border border-[#b8ae99] text-[#1d4ed8] text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <span>공식 사이트</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* 상세 바디 */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-[#ebe5d8] p-2.5 rounded border border-[#b8ae99]">
              <div>
                <div className="text-[10px] font-bold text-[#64748b]">사업자등록번호</div>
                <div className="font-mono font-bold text-[#0f172a]">
                  {selectedItem.businessNo || "미기재 (수정 가능)"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#64748b]">대표자 / 대표전화</div>
                <div className="font-bold text-[#0f172a]">
                  {selectedItem.ceoName || "-"} / {selectedItem.phone || "-"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] font-bold text-[#64748b]">공식 확인 경로 (원천 검증)</div>
                <div className="font-extrabold text-[#1d4ed8]">{selectedItem.officialSource}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] font-bold text-[#64748b]">권역 및 본사/주기장 소재지</div>
                <div className="font-semibold text-[#1e293b]">
                  [{selectedItem.region}] {selectedItem.address || "-"}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#f8f4ec] border border-[#c5bba8] space-y-1.5">
              <div className="text-[11px] font-extrabold text-[#0f172a]">
                영업 형태 및 주요 취급 브랜드
              </div>
              <div className="text-xs text-[#1e293b]">
                <span className="font-bold text-amber-900">[{selectedItem.bizScope}]</span>{" "}
                {selectedItem.mainBrands}
              </div>
              <div className="text-[11px] font-extrabold text-[#0f172a] pt-1">
                취급 장비 / 임대 품목 상세
              </div>
              <div className="text-xs text-[#334155] leading-relaxed">
                {selectedItem.mainProducts || "-"}
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#f8f4ec] border border-[#c5bba8] space-y-1">
              <div className="text-[11px] font-extrabold text-[#0f172a]">
                기업 규모 및 영업 참고사항
              </div>
              <div className="text-xs text-[#334155] leading-relaxed">
                {selectedItem.scaleNote || "-"}
              </div>
            </div>

            {/* 영업/제휴 메모 */}
            <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b8ae99] space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold text-[#0f172a]">
                  영업 컨택 / 제휴 메모
                </label>
                <button
                  type="button"
                  onClick={() => handleQuickUpdate(selectedItem.id, { memo: memoDraft })}
                  className="px-2 py-0.5 rounded bg-[#0f172a] text-white text-[11px] font-bold flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  <span>메모 저장</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={memoDraft}
                onChange={(e) => setMemoDraft(e.target.value)}
                placeholder="담당자 연락처, ERP 도입 제안 내용, 장비 임차/전대 조건 등을 기록하십시오."
                className="w-full p-2 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs text-[#0f172a] resize-none"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-[#64748b]">
          좌측 목록에서 사업자를 선택하십시오.
        </div>
      )}
    </div>
  );
};
