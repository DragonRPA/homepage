"use client";

import React, { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    phone: "",
    email: "",
    serviceType: "RPA 프로세스 자동화",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.contactPerson || !formData.phone || !formData.email || !formData.message) {
      alert("모든 필수 항목을 입력해 주십시오.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("문의 접수 중 통신 오류가 발생했습니다.");
      }

      setStatus("success");
      setFormData({
        companyName: "",
        contactPerson: "",
        phone: "",
        email: "",
        serviceType: "RPA 프로세스 자동화",
        message: "",
      });
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "문의 접수 중 오류가 발생했습니다.");
    }
  };

  return (
    <section id="contact" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Contact Information */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
                도입 상담 문의
              </h2>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                업무 프로세스 혁신을 위한<br />
                전문 기술 상담을 신청하십시오
              </p>
              <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                RPA 도입 검토, 렌탈/배차 ERP 커스터마이징, 국가 공공데이터 API 연계 등 기업 환경에 맞춘 최적의 솔루션을 제안해 드립니다.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-200 text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">공식 문의 이메일</div>
                  <div className="font-semibold text-slate-900">contact@dragonrpa.co.kr</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">본사 소재지</div>
                  <div className="font-semibold text-slate-900">대한민국 (www.dragonrpa.co.kr)</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-2 shadow-sm">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>접수 후 처리 절차</span>
              </div>
              <p className="leading-relaxed">
                접수된 상담 내용은 담당 엔지니어 및 컨설턴트가 24시간 이내에 검토 후 입력하신 이메일 또는 유선으로 회신드립니다.
              </p>
            </div>
          </div>

          {/* Right Column: Form (Vertical Header-Label Layout Standard) */}
          <div className="lg:col-span-7">
            <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
              
              {status === "success" ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">상담 접수가 완료되었습니다</h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    남겨주신 문의 사항을 확인한 후 담당자가 신속히 연락드리겠습니다. 감사합니다.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors mt-4"
                  >
                    새로운 문의 작성
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Company Name */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        회사명 (상호) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        required
                        placeholder="예: (주)한국상사"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                      />
                    </div>

                    {/* Contact Person */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        담당자명 / 직함 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleChange}
                        required
                        placeholder="예: 홍길동 팀장"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Phone */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        연락처 (전화번호) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        placeholder="예: 010-1234-5678"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                      />
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        이메일 주소 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="예: hong@example.com"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                      />
                    </div>
                  </div>

                  {/* Service Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      문의 솔루션 분야 <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="serviceType"
                      value={formData.serviceType}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                    >
                      <option value="RPA 프로세스 자동화">RPA 업무 프로세스 자동화 구축</option>
                      <option value="렌탈 ERP 시스템">렌탈 자산 & 배차 관리 ERP 도입</option>
                      <option value="공공데이터 API 연계">국가 공공데이터포털(data.go.kr) API 연계 개발</option>
                      <option value="종합 솔루션 도입">종합 솔루션 구축 및 맞춤 컨설팅</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      문의 상세 내용 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleChange}
                      required
                      placeholder="도입을 희망하시는 업무 분야, 현재 겪고 계신 애로사항, 필요 일정 등을 간략히 적어주십시오."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                    />
                  </div>

                  {status === "error" && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full py-3.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {status === "loading" ? (
                      <span>처리 중...</span>
                    ) : (
                      <>
                        <span>상담 신청서 전송</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>

                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}