"use client";

import React, { useState } from "react";
import { Bot, Lock, User, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, KeyRound, X, RefreshCw } from "lucide-react";

export default function ErpLoginPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdChangeError, setPwdChangeError] = useState("");
  const [pwdChangeSuccess, setPwdChangeSuccess] = useState(false);

  // In-memory mock database store for current session
  const [userStore, setUserStore] = useState<Record<string, any>>({
    admin: {
      id: 1,
      name: "이정용",
      employeeNo: "DR-001",
      position: "대표이사",
      department: "경영총괄",
      role: "SUPER_ADMIN",
      roleTitle: "운영자 (최고결재권자)",
      email: "contact@dragonrpa.co.kr",
      password: "1111",
      mustChangePassword: true,
    },
    sales_mgr: {
      id: 2,
      name: "김영업",
      employeeNo: "DR-002",
      position: "팀장",
      department: "영업부",
      role: "MANAGER",
      roleTitle: "관리자 (영업 결재권자)",
      email: "sales@dragonrpa.co.kr",
      password: "1111",
      mustChangePassword: true,
    },
    asset_mgr: {
      id: 3,
      name: "박출고자산",
      employeeNo: "DR-003",
      position: "과장",
      department: "자산출고부",
      role: "MANAGER",
      roleTitle: "관리자 (자산/출고 결재권자)",
      email: "asset@dragonrpa.co.kr",
      password: "1111",
      mustChangePassword: true,
    },
    dev_user: {
      id: 4,
      name: "최개발",
      employeeNo: "DR-004",
      position: "선임연구원",
      department: "기술개발부",
      role: "USER",
      roleTitle: "일반 사용자",
      email: "dev@dragonrpa.co.kr",
      password: "1111",
      mustChangePassword: true,
    },
    admin_user: {
      id: 5,
      name: "정관리",
      employeeNo: "DR-005",
      position: "대리",
      department: "경영지원부",
      role: "USER",
      roleTitle: "일반 사용자",
      email: "admin@dragonrpa.co.kr",
      password: "1111",
      mustChangePassword: true,
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setErrorMsg("로그인 ID와 비밀번호를 모두 입력해 주십시오.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    setTimeout(() => {
      setLoading(false);
      const cleanId = loginId.trim().toLowerCase();
      const user = userStore[cleanId];

      if (user && user.password === password) {
        setLoggedInUser({ ...user, loginId: cleanId });
      } else {
        setErrorMsg("등록되지 않은 ID이거나 비밀번호가 일치하지 않습니다. (초기 비밀번호: 1111)");
      }
    }, 400);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setLoginId("");
    setPassword("");
    setShowPasswordModal(false);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdChangeError("");
    setPwdChangeSuccess(false);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdChangeError("모든 비밀번호 항목을 입력해 주십시오.");
      return;
    }

    if (currentPwd !== loggedInUser.password) {
      setPwdChangeError("현재 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (newPwd.length < 4) {
      setPwdChangeError("새 비밀번호는 최소 4자리 이상이어야 합니다.");
      return;
    }

    if (newPwd !== confirmPwd) {
      setPwdChangeError("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    // Update in-memory userStore
    setUserStore((prev) => ({
      ...prev,
      [loggedInUser.loginId]: {
        ...prev[loggedInUser.loginId],
        password: newPwd,
        mustChangePassword: false,
      },
    }));

    setLoggedInUser((prev: any) => ({
      ...prev,
      password: newPwd,
      mustChangePassword: false,
    }));

    setPwdChangeSuccess(true);
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");

    setTimeout(() => {
      setShowPasswordModal(false);
      setPwdChangeSuccess(false);
    }, 1200);
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
              사내 통합 기간계 시스템 (초기 비밀번호: 1111)
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
                초기 비밀번호는 <strong className="text-blue-400">1111</strong> 이며, 로그인 후 자유롭게 변경 가능합니다.
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
                  비밀번호 (초기값: 1111)
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
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
                발급 계정 목록 (초기 비번: 1111):
              </div>
              <div className="flex justify-between">
                <span>• 운영자 (대표):</span>
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
            
            {/* Must Change Password Alert Banner */}
            {loggedInUser.mustChangePassword && (
              <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-200 text-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>초기 비밀번호(1111)를 사용 중입니다. 안전한 사내 보안을 위해 비밀번호를 변경해 주십시오.</span>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-md shrink-0 transition-colors"
                >
                  지금 변경
                </button>
              </div>
            )}

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
                    {loggedInUser.email} | 사번: {loggedInUser.employeeNo} | ID: {loggedInUser.loginId}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  <span>비밀번호 변경</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  로그아웃
                </button>
              </div>
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
                    <p className="text-emerald-400 font-bold">운영자 전용: 매니저 및 유저 로그인 ID 발급 (초기 비번 1111 자동 부여)</p>
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
              <span className="text-slate-400 font-mono text-[11px]">SSOT v1.4</span>
            </div>
          </div>
        )}
      </main>

      {/* Password Change Modal (Vertical Header-Label Layout Standard) */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <KeyRound className="w-5 h-5 text-blue-500" />
                <span>비밀번호 변경</span>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pwdChangeSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">비밀번호가 성공적으로 변경되었습니다</h3>
                <p className="text-xs text-slate-400">다음 로그인부터 새로운 비밀번호를 사용해 주십시오.</p>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {/* Current Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
                    현재 비밀번호 <span className="text-slate-500 font-normal">(초기값: 1111)</span>
                  </label>
                  <input
                    type="password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    required
                    placeholder="현재 비밀번호 입력"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    required
                    placeholder="새로운 비밀번호 입력 (4자리 이상)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    required
                    placeholder="새로운 비밀번호 다시 입력"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {pwdChangeError && (
                  <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pwdChangeError}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-colors"
                  >
                    저장 및 변경
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-slate-400 border-t border-slate-900 pt-6">
        <p>Copyright © 2026 DragonRPA Co., Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
}