import React from "react";
import { Award, BarChart3, CheckSquare, Clock, Cpu, Server, Sparkles, Workflow } from "lucide-react";

export default function About() {
  const coreValues = [
    {
      icon: Workflow,
      title: "현장 라이프사이클 중심 자산 운용",
      description: "입고부터 출고 검수 승인(RENTED 자동 전환), 단일 EXCHANGE 교환 배차, 반납/정비까지 렌탈 자산의 실물 흐름과 시스템 상태를 완벽히 일치시킵니다.",
    },
    {
      icon: Server,
      title: "무누락 DB 이벤트 기록 & Audit Trail",
      description: "모든 발주, 검수, 배차, 교체, 상태 변경 이벤트를 데이터베이스에 무누락 기록하여 분쟁을 예방하고 자산별 매출 기여액을 1원 단위까지 정밀 일할 집계합니다.",
    },
    {
      icon: Clock,
      title: "담당자 최소 조작 & 최대 업무 편익",
      description: "단일 화면 직무 카드뉴스 대시보드와 불필요한 번복 입력을 제거한 직관적인 워크플로우를 제공하여 실무 담당자의 업무 피로도를 획기적으로 낮춥니다.",
    },
  ];

  return (
    <section id="about" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
            회사 소개
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            기술과 현장의 완벽한 결합을 추구하는<br className="hidden sm:inline" />
            B2B 업무 자동화 전문 기업
          </p>
          <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
            (주)드래곤알피에이는 복잡한 현장 업무 프로세스를 체계화하고, 국가 공공데이터 및 내부 기간계 시스템을 유기적으로 연계하여 기업의 운영 효율성과 데이터 신뢰성을 극대화합니다.
          </p>
        </div>

        {/* 3 Core Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {coreValues.map((val, idx) => {
            const Icon = val.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {val.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {val.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Operational Statistics */}
        <div className="mt-16 p-8 rounded-2xl bg-slate-900 text-white grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-extrabold text-blue-400">100%</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">이벤트 무누락 적재</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-cyan-400">0 sec</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">출고 즉시 대여 전환</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-blue-400">1-CLICK</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">공공데이터 자동 검증</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-400">99.9%</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">클라우드 가동률</div>
          </div>
        </div>

      </div>
    </section>
  );
}