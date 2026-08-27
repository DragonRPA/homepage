import React from "react";
import { Bot, Mail, ExternalLink, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
          
          {/* Company Brand */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                Dragon<span className="text-blue-500">RPA</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              (주)드래곤알피에이는 B2B 프로세스 자동화, 렌탈 자산/배차 관리 ERP, 국가 공공데이터포털(data.go.kr) API 연계 표준 솔루션을 공급하는 전문 IT 기업입니다.
            </p>
            <div className="flex items-center gap-2 text-slate-300 pt-1">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>contact@dragonrpa.co.kr</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-2">
            <div className="text-white font-bold uppercase tracking-wider text-xs mb-3">
              주요 서비스
            </div>
            <ul className="space-y-2 text-slate-400">
              <li>
                <a href="#solutions" className="hover:text-white transition-colors">
                  RPA 프로세스 자동화 엔진
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-white transition-colors">
                  렌탈 자산 & EXCHANGE 배차 ERP
                </a>
              </li>
              <li>
                <a href="#public-data" className="hover:text-white transition-colors">
                  공공데이터포털 API 연계
                </a>
              </li>
              <li>
                <a href="#technology" className="hover:text-white transition-colors">
                  보안 및 인프라 아키텍처
                </a>
              </li>
            </ul>
          </div>

          {/* External Systems */}
          <div className="md:col-span-4 space-y-2">
            <div className="text-white font-bold uppercase tracking-wider text-xs mb-3">
              기간계 시스템 링크
            </div>
            <div className="space-y-2">
              <a
                href="https://erp.dragonrpa.co.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <span>사내 업무용 ERP 포털</span>
                <span className="text-[10px] text-blue-400 font-mono flex items-center gap-1">
                  erp.dragonrpa.co.kr <ExternalLink className="w-3 h-3" />
                </span>
              </a>

              <a
                href="https://api.dragonrpa.co.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <span>공공데이터 API 게이트웨이</span>
                <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  api.dragonrpa.co.kr <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            </div>
          </div>

        </div>

        {/* Company Legal Notice */}
        <div className="pt-8 border-t border-slate-900 text-[11px] text-slate-400 space-y-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>상호:</strong> (주)드래곤알피에이</span>
            <span><strong>대표자:</strong> 이정용</span>
            <span><strong>도메인:</strong> www.dragonrpa.co.kr</span>
            <span><strong>대표 이메일:</strong> contact@dragonrpa.co.kr</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 text-slate-400 gap-2">
            <div>
              Copyright © 2026 DragonRPA Co., Ltd. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span className="hover:text-slate-300 cursor-pointer">개인정보처리방침</span>
              <span>|</span>
              <span className="hover:text-slate-300 cursor-pointer">이용약관</span>
              <span>|</span>
              <span className="flex items-center gap-1 text-blue-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                DMARC Verified
              </span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}