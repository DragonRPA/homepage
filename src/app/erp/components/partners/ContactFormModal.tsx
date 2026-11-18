"use client";

import React from "react";
import { CreditCard, Image as ImageIcon, UserCheck, X } from "lucide-react";
import { type Partner } from "./partnerTypes";

export interface ContactFormModalProps {
  contactForm: any;
  contactModalMode: "CREATE" | "EDIT";
  handleCardImageUpload: (file: File, side: "front" | "back") => Promise<void>;
  handleSaveContact: (e: React.FormEvent) => Promise<void>;
  selectedPartner: Partner | null;
  setContactForm: React.Dispatch<any>;
  setShowContactModal: React.Dispatch<React.SetStateAction<boolean>>;
  setZoomImageUrl: React.Dispatch<React.SetStateAction<string | null>>;
}

export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  contactForm,
  contactModalMode,
  handleCardImageUpload,
  handleSaveContact,
  selectedPartner,
  setContactForm,
  setShowContactModal,
  setZoomImageUrl,
}) => {
  return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] text-[#0f172a] rounded-lg p-5 w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="pb-3 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#047857]" />
                <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-100">
                  {contactModalMode === "CREATE"
                    ? `[${selectedPartner?.name}] 담당자 및 명함 등록`
                    : `담당자 정보 수정 (${contactForm.name})`}
                </h2>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-[#475569] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveContact} className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs">
              {/* Business Card Photo Upload */}
              <div className="p-3 bg-[#f4efe4] border border-[#b5a894] rounded-lg space-y-2 dark:bg-slate-900 dark:border-slate-800">
                <span className="text-xs font-bold text-[#047857] block flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>실물 명함 사진 첨부 및 자동 문자 인식(OCR)</span>
                </span>

                <div className="grid grid-cols-2 gap-3">
                  {/* Front Card */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[#334155] font-semibold">명함 앞면 사진</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCardImageUpload(file, "front");
                      }}
                      className="text-xs text-[#0f172a] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#dcd4c4] file:text-[#0f172a]"
                    />
                    {contactForm.businessCardFrontUrl && (
                      <div className="mt-1 relative rounded border border-[#b5a894] overflow-hidden h-20 bg-[#ebe5d8] flex items-center justify-center">
                        <img
                          src={contactForm.businessCardFrontUrl}
                          alt="명함 앞면"
                          className="h-full object-contain cursor-pointer"
                          onClick={() => setZoomImageUrl(contactForm.businessCardFrontUrl)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Back Card */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[#334155] font-semibold">명함 뒷면 사진 (선택)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCardImageUpload(file, "back");
                      }}
                      className="text-xs text-[#0f172a] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#dcd4c4] file:text-[#0f172a]"
                    />
                    {contactForm.businessCardBackUrl && (
                      <div className="mt-1 relative rounded border border-[#b5a894] overflow-hidden h-20 bg-[#ebe5d8] flex items-center justify-center">
                        <img
                          src={contactForm.businessCardBackUrl}
                          alt="명함 뒷면"
                          className="h-full object-contain cursor-pointer"
                          onClick={() => setZoomImageUrl(contactForm.businessCardBackUrl)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] font-semibold">담당자 성명 *</label>
                  <input
                    type="text"
                    required
                    placeholder="홍길동"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded font-bold focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] font-semibold">소속 부서 / 직책</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="구매팀"
                      value={contactForm.department}
                      onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="팀장 / 과장"
                      value={contactForm.position}
                      onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                      className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile & Tel & Email */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] font-semibold">휴대전화 번호</label>
                  <input
                    type="text"
                    placeholder="010-0000-0000"
                    value={contactForm.mobile}
                    onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] font-semibold">직통 유선전화</label>
                  <input
                    type="text"
                    placeholder="02-0000-0000"
                    value={contactForm.telephone}
                    onChange={(e) => setContactForm({ ...contactForm, telephone: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[#334155] font-semibold">담당자 이메일</label>
                  <input
                    type="email"
                    placeholder="user@partner.co.kr"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-2.5 py-1.5 rounded font-mono focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Primary Contact Toggle */}
              <div className="p-2.5 bg-[#f4efe4] rounded border border-[#b5a894] flex items-center justify-between dark:bg-slate-950 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#1d4ed8]" />
                  <div>
                    <span className="font-bold text-[#0f172a] dark:text-slate-200 block text-xs">대표 담당자 지정</span>
                    <span className="text-[10px] text-[#475569] block">
                      대장 및 거래명세서 / 세금계산서 수신자로 우선 매핑됩니다.
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactForm.isPrimary}
                    onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#dcd4c4] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#b5a894] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1d4ed8]"></div>
                </label>
              </div>

              {/* Memo */}
              <div className="flex flex-col gap-1">
                <label className="text-[#334155] font-semibold">담당 업무 메모</label>
                <textarea
                  rows={2}
                  placeholder="예: RPA 솔루션 계약 및 기술 창구"
                  value={contactForm.memo}
                  onChange={(e) => setContactForm({ ...contactForm, memo: e.target.value })}
                  className="bg-[#f4efe4] border border-[#b5a894] text-[#0f172a] px-3 py-1.5 rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-[#b5a894] dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-3.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white font-bold rounded shadow"
                >
                  {contactModalMode === "CREATE" ? "명함·담당자 저장" : "수정 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
  );
};
