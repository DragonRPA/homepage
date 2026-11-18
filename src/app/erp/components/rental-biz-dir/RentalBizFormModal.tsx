"use client";

import React from "react";
import { X } from "lucide-react";
import { RentalBizFormData } from "./rentalBizTypes";

export interface RentalBizFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: RentalBizFormData;
  setFormData: React.Dispatch<React.SetStateAction<RentalBizFormData>>;
}

export const RentalBizFormModal: React.FC<RentalBizFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={onSubmit}
        className="bg-[#f4efe4] border border-[#b8ae99] rounded w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="px-4 py-3 bg-[#e2dbcd] border-b border-[#b8ae99] flex items-center justify-between">
          <span className="font-extrabold text-sm text-[#0f172a]">
            {formData.id ? "사업자 정보 수정" : "신규 렌탈·판매 사업자 등록"}
          </span>
          <button type="button" onClick={onClose}>
            <X className="w-4 h-4 text-[#475569]" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#334155]">업종 구분 *</label>
            <select
              value={formData.sector}
              onChange={(e) =>
                setFormData({ ...formData, sector: e.target.value as any })
              }
              className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99] font-bold"
            >
              <option value="FL">FL (지게차 판매·임대업)</option>
              <option value="AWP">AWP (고소작업대 판매·임대업)</option>
              <option value="OA_PC">PC · 노트북 · 복합기(OA) 임대업</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#334155]">상호 (법인명) *</label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99] font-bold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#334155]">사업자등록번호</label>
            <input
              type="text"
              value={formData.businessNo}
              onChange={(e) => setFormData({ ...formData, businessNo: e.target.value })}
              placeholder="000-00-00000"
              className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#334155]">대표자명</label>
            <input
              type="text"
              value={formData.ceoName}
              onChange={(e) => setFormData({ ...formData, ceoName: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#334155]">권역 / 지역</label>
            <input
              type="text"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              placeholder="예: 경기 (용인 처인구)"
              className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#334155]">대표 전화번호</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
            />
          </div>

          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="font-bold text-[#334155]">소재지 주소</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#334155]">영업 형태</label>
            <input
              type="text"
              value={formData.bizScope}
              onChange={(e) => setFormData({ ...formData, bizScope: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[#334155]">공식 확인 경로</label>
            <input
              type="text"
              value={formData.officialSource}
              onChange={(e) => setFormData({ ...formData, officialSource: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
            />
          </div>

          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="font-bold text-[#334155]">주요 취급 브랜드</label>
            <input
              type="text"
              value={formData.mainBrands}
              onChange={(e) => setFormData({ ...formData, mainBrands: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
            />
          </div>

          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="font-bold text-[#334155]">주요 취급 기종 / 품목 상세</label>
            <input
              type="text"
              value={formData.mainProducts}
              onChange={(e) => setFormData({ ...formData, mainProducts: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
            />
          </div>

          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="font-bold text-[#334155]">홈페이지 URL</label>
            <input
              type="text"
              value={formData.websiteUrl}
              onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
              className="px-2.5 py-1.5 rounded bg-white border border-[#b8ae99]"
            />
          </div>
        </div>

        <div className="px-4 py-2.5 bg-[#e2dbcd] border-t border-[#b8ae99] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-[#f4efe4] border border-[#b8ae99] text-xs font-bold"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded bg-[#1d4ed8] text-white text-xs font-bold"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
};
