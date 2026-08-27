import React from "react";
import { Cloud, Database, Lock, MailCheck, ShieldCheck, Zap } from "lucide-react";

export default function TechStack() {
  const infraItems = [
    {
      icon: Cloud,
      title: "Cloudflare Global Edge DNS & CDN",
      desc: "초고속 애니캐스트 DNS 라우팅, 글로벌 DDoS 방어, 무중단 SSL 암호화 계층을 기본 탑재합니다.",
    },
    {
      icon: Database,
      title: "PostgreSQL & SSOT 데이터베이스",
      desc: "단일 진실의 원천(SSOT) 원칙에 입각한 엄격한 RLS 보안 정책 및 트랜잭션 무결성을 보장합니다.",
    },
    {
      icon: MailCheck,
      title: "SPF / DKIM / DMARC 메일 보안 체계",
      desc: "자사 도메인(@dragonrpa.co.kr) 발송 메일의 스팸 격리를 방지하고 기업 신뢰성을 공인합니다.",
    },
    {
      icon: Lock,
      title: "Cloudflare R2 Object Storage (drcf)",
      desc: "대용량 명세서, 공공데이터 아카이브, 백업 덤프를 안전하고 영구적으로 보존합니다.",
    },
    {
      icon: Zap,
      title: "비동기 배치 워커 & 캐싱 계층",
      desc: "공공데이터 Open API 호출 한도를 방어하고 실시간 질의 응답 속도를 0.1초 이내로 유지합니다.",
    },
    {
      icon: ShieldCheck,
      title: "전사 시스템 개발 표준 헌장 준수",
      desc: "무수식어 건조 UI, 상하 세로 스택 레이아웃, 무누락 DB 로깅 표준을 철저히 준수합니다.",
    },
  ];

  return (
    <section id="technology" className="py-20 bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">
            기술 아키텍처
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            안정성과 보안을 최우선으로 설계된 인프라
          </p>
          <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
            클라우드 엣지 인프라와 표준화된 데이터 파이프라인으로 기업의 핵심 자산 데이터를 안전하게 보호합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {infraItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-blue-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-900/50 text-blue-400 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}