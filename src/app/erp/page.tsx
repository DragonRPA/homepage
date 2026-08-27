"use client";

import React, { useState } from "react";
import { Bot, Lock, User, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function ErpLoginPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setErrorMsg("로그인 ID와 비밀번호를 모두 입력해 주십시오.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    // Mock Authentication Logic (SSOT Role Mapping)
    setTimeout(() => {
      setLoading(false);
      const cleanId = loginId.trim().toLowerCase();
      if (cleanId === "admin") {
        setLoggedInUser({
          id: 1,
          name: "이정용",
          employeeNo: "DR-001",
          position: "대표이사",
          department: "경영총괄",
          role: "SUPER_ADMIN",
          roleTitle: "운영자 (최고결재권자)",
          email: "contact@dragonrpa.co.kr",
          canManageUsers: true,
          canApproveManagers: true,
        });
      } else if (cleanId === "sales_mgr") {
        setLoggedInUser({
          id: 2,
          name: "김영업",
          employeeNo: "DR-002",
          position: "팀장",
          department: "영업부",
          role: "MANAGER",
          roleTitle: "관리자 (영업 결재권자)",
          email: "sales@dragonrpa.co.kr",
          canManageUsers: false,
          canApproveManagers: false,
        });
      } else if (cleanId === "asset_mgr") {
        setLoggedInUser({
          id: 3,
          name: "박출고자산",
          employeeNo: "DR-003",
          position: "과장",
          department: "자산출고부",
          role: "MANAGER",
          roleTitle: "관리자 (자산/출고 결재권자)",
          email: "asset@dragonrpa.co.kr",
          canManageUsers: false,
          canApproveManagers: false,
        });
      } else if (cleanId === "dev_user" || cleanId === "admin_user" || cleanId === "user") {
        setLoggedInUser({
          id: 4,
          name: "최개발",
          employeeNo: "DR-004",
          position: "선임연구원",
          department: "기술개발부",
          role: "USER",
          roleTitle: "일반 사용자",
          email: "dev@dragonrpa.co.kr",
          canManageUsers: false,
          canApproveManagers: false,
        });
      } else {
        setErrorMsg("등록되지 않은 ID이거나 비밀번호가 일치하지 않습니다. (운영자 발급 ID 필요)");
      }
    }, 600);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setLoginId("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-10 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <Bot className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-white tracking-tight leading-none">
              Dragon<span className="text-blue-500">ERP</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-1">
              사내 통합 기간계 시스템 (5인 올인원)
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          https://www.dragonrpa.co.kr/erp
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-12">
        {!loggedInUser ? (
          /* Login Card (Vertical Header-Label Layout Standard) */
          <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                임직원 통합 로그인
              </h1>
              <p className="text-xs text-slate-400">
                운영자(대표)가 발급한 계정 정보로 로그인하십시오.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Login ID */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
                  로그인 ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="아이디 입력 (예: admin, sales_mgr, dev_user)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
                  비밀번호
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>보안 인증 중...</span>
                ) : (
                  <>
                    <span>시스템 로그인</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Test Accounts Hint */}
            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5 font-mono">
              <div className="font-bold text-slate-400 uppercase tracking-wider">
                3단계 권한 매핑 체계:
              </div>
              <div className="flex justify-between">
                <span>• 운영자 (최고결재):</span>
                <span className="text-blue-400 font-bold">admin</span>
              </div>
              <div className="flex justify-between">
                <span>• 관리자 (영업/자산):</span>
                <span className="text-cyan-400 font-bold">sales_mgr / asset_mgr</span>
              </div>
              <div className="flex justify-between">
                <span>• 일반 유저:</span>
                <span className="text-emerald-400 font-bold">dev_user / admin_user</span>
              </div>
            </div>
          </div>
        ) : (
          /* Logged-In User Gateway View */
          <div className="w-full max-w-3xl p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {loggedInUser.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{loggedInUser.name}</span>
                    <span className="text-xs text-slate-400">{loggedInUser.position} ({loggedInUser.department})</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-950 text-blue-300 border border-blue-700">
                      {loggedInUser.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {loggedInUser.email} | 사번: {loggedInUser.employeeNo}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                로그아웃
              </button>
            </div>

            {/* Role-Specific Capabilities */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                직무 권한 및 결재선 구조 ({loggedInUser.roleTitle})
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="text-slate-400 font-bold">🏖️ 근태/결재 권한</div>
                  {loggedInUser.role === "SUPER_ADMIN" ? (
                    <p className="text-blue-300 font-semibold">관리자의 연차/휴가 최종 결재 및 전사 근태 총괄</p>
                  ) : loggedInUser.role === "MANAGER" ? (
                    <p className="text-cyan-300 font-semibold">소속 일반 유저의 연차/휴가 1차/전결 결재</p>
                  ) : (
                    <p className="text-emerald-300 font-semibold">연차/반차/병가 신청 (관리자에게 상신) & 자율 초과근무 기록</p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="text-slate-400 font-bold">🚜 자산/배차/회계</div>
                  {loggedInUser.role === "SUPER_ADMIN" ? (
                    <p className="text-blue-300 font-semibold">매출/정산, 전표, 세금계산서 발행, 자산 원장 전체 통제</p>
                  ) : loggedInUser.department === "영업부" ? (
                    <p className="text-cyan-300 font-semibold">계약 등록, 대차 요구의뢰, 매출 전표 관리</p>
                  ) : loggedInUser.department === "자산출고부" ? (
                    <p className="text-cyan-300 font-semibold">자산 매핑, 출고 검수(RENTED 전환), 단일 EXCHANGE 배차</p>
                  ) : (
                    <p className="text-slate-400">자산 상태 및 배차 대장 열람</p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="text-slate-400 font-bold">🔐 계정/문서함 관리</div>
                  {loggedInUser.role === "SUPER_ADMIN" ? (
                    <p className="text-emerald-400 font-bold">운영자 전용: 매니저 및 유저 로그인 ID/PW 신규 발급</p>
                  ) : (
                    <p className="text-slate-400">사내문서함 (EDMS dragonrpa-erp R2 버킷) 열람 및 등록</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-blue-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Neon PostgreSQL & Cloudflare R2 버킷(`dragonrpa-erp`) 연결 완료</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">SSOT v1.3</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-slate-400 border-t border-slate-900 pt-6">
        <p>Copyright © 2026 DragonRPA Co., Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
}