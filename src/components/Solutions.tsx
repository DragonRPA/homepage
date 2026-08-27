import React from "react";
import { Bot, Check, Database, FileSpreadsheet, Layers, RefreshCw, Send, ShieldAlert, Truck, Wrench } from "lucide-react";

export default function Solutions() {
  const solutions = [
    {
      badge: "RPA Automation",
      title: "RPA 업무 프로세스 자동화 엔진",
      summary: "반복적인 전산 입력, 데이터 수집, 문서 생산 업무를 소프트웨어 로봇과 백그라운드 파이프라인으로 무인 자동화합니다.",
      features: [
        "웹 크롤링 및 외부 시스템 자동 데이터 동기화",
        "엑셀(Excel) 데이터 일괄 파싱 및 표준 DB 적재",
        "PDF/HWP/Excel 정형 보고서 및 거래명세표 대량 자동 생성",
        "이상 징후 감지 시 메일 및 메신저 실시간 통보",
      ],
      icon: Bot,
      color: "blue",
    },
    {
      badge: "Rental & Dispatch ERP",
      title: "렌탈 자산 & 배차 관리 ERP 시스템",
      summary: "장비 임대 및 배차 기업의 특성을 반영한 경량 맞춤형 ERP로, 영업과 출고 부서의 R&R을 엄격히 분리하고 정확한 손익을 계산합니다.",
      features: [
        "출고 검수 승인 마감 시 자산 상태 RENTED(대여중) 자동 전환",
        "단일 EXCHANGE 1건 발행 방식의 왕복 교환 배차 관리",
        "대차 장비의 최초 계약 단가/마감일/속성 100% 자동 상속",
        "전자산/후장비 매출 기여액 1원 오차 없는 정밀 일할 집계",
      ],
      icon: Layers,
      color: "indigo",
    },
    {
      badge: "Public Data Pipeline",
      title: "국가 공공데이터포털(data.go.kr) API 연계",
      summary: "대한민국 공공데이터포털의 방대한 Open API를 기업 내부 ERP 및 서비스와 유기적으로 결합하여 업무의 정확도를 보장합니다.",
      features: [
        "국세청 사업자등록정보 상태조회 및 휴/폐업 실시간 검증",
        "기상청 단기예보 및 특보 API 연동을 통한 현장 기상 리스크 통보",
        "국토교통부 건설기계 및 건축물대장 표준 데이터 ETL",
        "안전한 API Key 관리 및 호출 비용 절감을 위한 스마트 캐싱",
      ],
      icon: Database,
      color: "cyan",
    },
  ];

  return (
    <section id="solutions" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
            핵심 솔루션
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            엔터프라이즈 운영을 위한 3대 핵심 포트폴리오
          </p>
          <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
            업무 자동화 로봇, 현장 밀착형 렌탈 ERP, 공공데이터 API 파이프라인을 통해 기업 데이터의 무결성과 현장 편익을 완성합니다.
          </p>
        </div>

        {/* 3 Solution Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {solutions.map((sol, idx) => {
            const Icon = sol.icon;
            return (
              <div
                key={idx}
                className="flex flex-col justify-between p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {sol.badge}
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {sol.title}
                  </h3>

                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    {sol.summary}
                  </p>

                  <div className="space-y-3 border-t border-slate-100 pt-6">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      주요 기능 명세
                    </div>
                    {sol.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-600">
                        <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100">
                  <a
                    href="#contact"
                    className="w-full inline-flex items-center justify-center py-2.5 px-4 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                  >
                    상세 도입 상담
                  </a>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}