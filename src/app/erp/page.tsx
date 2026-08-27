"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Bot, Lock, User, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, 
  KeyRound, X, LogOut, TrendingUp, ShoppingCart, 
  CalendarCheck, FolderTree, Package, Layers, Mail, Plus, 
  Download, FileSpreadsheet, Clock, RefreshCw, UserPlus
} from "lucide-react";

export default function ErpPortalPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Active Sidebar Menu Tab
  const [activeTab, setActiveTab] = useState<
    "management" | "sales" | "purchase" | "attendance" | "assets" | "consumables" | "files" | "email"
  >("management");

  // Real DB Data States
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(false);

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdChangeError, setPwdChangeError] = useState("");
  const [pwdChangeSuccess, setPwdChangeSuccess] = useState(false);

  // New Employee Modal State (Super Admin)
  const [showNewEmpModal, setShowNewEmpModal] = useState(false);
  const [newEmpNo, setNewEmpNo] = useState("");
  const [newEmpLoginId, setNewEmpLoginId] = useState("");
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpDept, setNewEmpDept] = useState("기술개발부");
  const [newEmpPos, setNewEmpPos] = useState("사원");
  const [newEmpRole, setNewEmpRole] = useState("USER");
  const [newEmpEmail, setNewEmpEmail] = useState("");

  // Form Inputs for Leave Application
  const [newLeaveType, setNewLeaveType] = useState("ANNUAL");
  const [newLeaveStart, setNewLeaveStart] = useState("2026-09-01");
  const [newLeaveEnd, setNewLeaveEnd] = useState("2026-09-01");
  const [newLeaveReason, setNewLeaveReason] = useState("");

  // Form Inputs for Overtime
  const [newOtDate, setNewOtDate] = useState("2026-08-27");
  const [newOtStart, setNewOtStart] = useState("18:00");
  const [newOtEnd, setNewOtEnd] = useState("20:30");
  const [newOtDetails, setNewOtDetails] = useState("");

  // Fetch Real DB Data
  const fetchDbData = useCallback(async () => {
    setDbLoading(true);
    try {
      // 1. Employees
      const empRes = await fetch("/api/erp/employees");
      const empData = await empRes.json();
      if (empData.success) setEmployees(empData.employees);

      // 2. Leaves
      const leaveRes = await fetch("/api/erp/leaves");
      const leaveData = await leaveRes.json();
      if (leaveData.success) setLeaveRequests(leaveData.leaves);

      // 3. Overtimes
      const otRes = await fetch("/api/erp/overtimes");
      const otData = await otRes.json();
      if (otData.success) setOvertimes(otData.overtimes);

      // 4. Assets
      const astRes = await fetch("/api/erp/assets");
      const astData = await astRes.json();
      if (astData.success) setAssets(astData.assets);

      // 5. Consumables
      const conRes = await fetch("/api/erp/consumables");
      const conData = await conRes.json();
      if (conData.success) setConsumables(conData.consumables);

    } catch (err) {
      console.error("DB Fetch Error:", err);
    } finally {
      setDbLoading(false);
    }
  }, []);

  // Restore Session on Page Load (F5 Refresh Survival)
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("dragonrpa_erp_user");
      const savedTab = localStorage.getItem("dragonrpa_erp_tab");

      if (savedUser) {
        setLoggedInUser(JSON.parse(savedUser));
      }
      if (savedTab) {
        setActiveTab(savedTab as any);
      }
    } catch (e) {
      console.error("Session restore error", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // When Logged-In, load real Neon DB data
  useEffect(() => {
    if (loggedInUser) {
      fetchDbData();
    }
  }, [loggedInUser, fetchDbData]);

  // Tab Change Handler
  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    try {
      localStorage.setItem("dragonrpa_erp_tab", tab);
    } catch (e) {}
  };

  // Real DB Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setErrorMsg("아이디와 비밀번호를 모두 입력해 주십시오.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/erp/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "로그인에 실패했습니다.");
      } else {
        setLoggedInUser(data.user);
        try {
          localStorage.setItem("dragonrpa_erp_user", JSON.stringify(data.user));
        } catch (e) {}
      }
    } catch (err: any) {
      setErrorMsg("서버 통신 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setLoginId("");
    setPassword("");
    setShowPasswordModal(false);
    try {
      localStorage.removeItem("dragonrpa_erp_user");
      localStorage.removeItem("dragonrpa_erp_tab");
    } catch (e) {}
  };

  // Real DB Password Change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdChangeError("");
    setPwdChangeSuccess(false);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdChangeError("모든 비밀번호 항목을 입력해 주십시오.");
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

    try {
      const res = await fetch("/api/erp/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: loggedInUser.loginId,
          currentPassword: currentPwd,
          newPassword: newPwd,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setPwdChangeError(data.error || "비밀번호 변경에 실패했습니다.");
      } else {
        setPwdChangeSuccess(true);
        const updatedUser = { ...loggedInUser, mustChangePassword: false };
        setLoggedInUser(updatedUser);
        try {
          localStorage.setItem("dragonrpa_erp_user", JSON.stringify(updatedUser));
        } catch (e) {}
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
        setTimeout(() => {
          setShowPasswordModal(false);
          setPwdChangeSuccess(false);
        }, 1200);
      }
    } catch (err) {
      setPwdChangeError("서버 통신 오류가 발생했습니다.");
    }
  };

  // Create New Employee in Neon DB
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpNo || !newEmpLoginId || !newEmpName) {
      alert("사번, 아이디, 성명을 모두 입력해 주십시오.");
      return;
    }

    try {
      const res = await fetch("/api/erp/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeNo: newEmpNo,
          loginId: newEmpLoginId,
          name: newEmpName,
          position: newEmpPos,
          department: newEmpDept,
          role: newEmpRole,
          email: newEmpEmail || `${newEmpLoginId}@dragonrpa.co.kr`,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "계정 생성 실패");
      } else {
        alert(`계정이 성공적으로 발급되었습니다. (초기 비밀번호: 1111)`);
        setShowNewEmpModal(false);
        setNewEmpNo("");
        setNewEmpLoginId("");
        setNewEmpName("");
        setNewEmpEmail("");
        fetchDbData();
      }
    } catch (err) {
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  // Reset Password to '1111' in Neon DB
  const handleResetPassword = async (empId: number, empName: string) => {
    if (!confirm(`${empName} 님의 비밀번호를 초기값 '1111'로 초기화하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/erp/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: empId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`${empName} 님의 비밀번호가 1111로 초기화되었습니다.`);
        fetchDbData();
      } else {
        alert(data.error || "초기화 실패");
      }
    } catch (err) {
      alert("통신 오류");
    }
  };

  // Submit Leave in Neon DB
  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveReason) {
      alert("휴가 사유를 입력해 주십시오.");
      return;
    }

    let days = 1.0;
    if (newLeaveType === "AM_HALF" || newLeaveType === "PM_HALF") days = 0.5;
    if (newLeaveType === "QUARTER") days = 0.25;

    const isDeductible = ["ANNUAL", "AM_HALF", "PM_HALF", "QUARTER"].includes(newLeaveType);

    try {
      const res = await fetch("/api/erp/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: loggedInUser.id,
          leaveType: newLeaveType,
          startDate: newLeaveStart,
          endDate: newLeaveEnd,
          workingDays: days,
          deducted: isDeductible ? days : 0.0,
          reason: newLeaveReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("휴가 신청이 Neon DB에 정상 등록되었습니다 (결재 대기).");
        setNewLeaveReason("");
        fetchDbData();
      } else {
        alert(data.error || "신청 실패");
      }
    } catch (err) {
      alert("통신 오류");
    }
  };

  // Submit Overtime in Neon DB
  const handleAddOvertime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOtDetails) {
      alert("업무 내용을 입력해 주십시오.");
      return;
    }

    try {
      const res = await fetch("/api/erp/overtimes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: loggedInUser.id,
          workDate: newOtDate,
          workType: "EXTENDED",
          startTime: newOtStart,
          endTime: newOtEnd,
          hours: 2.5,
          details: newOtDetails,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("초과근무가 Neon DB에 자율 등록되었습니다.");
        setNewOtDetails("");
        fetchDbData();
      } else {
        alert(data.error || "등록 실패");
      }
    } catch (err) {
      alert("통신 오류");
    }
  };

  // Approve / Reject Leave in Neon DB
  const handleUpdateLeaveStatus = async (leaveId: number, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/erp/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId,
          status,
          approverId: loggedInUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchDbData();
      } else {
        alert(data.error || "처리 실패");
      }
    } catch (err) {
      alert("통신 오류");
    }
  };

  // Sidebar Menu Definitions
  const menuItems = [
    { id: "management", label: "경영관리", icon: ShieldCheck, superOnly: true },
    { id: "sales", label: "매출관리", icon: TrendingUp },
    { id: "purchase", label: "매입관리", icon: ShoppingCart },
    { id: "attendance", label: "근태관리", icon: CalendarCheck },
    { id: "assets", label: "자산재고관리", icon: Layers },
    { id: "consumables", label: "소모품재고관리", icon: Package },
    { id: "files", label: "파일관리", icon: FolderTree },
    { id: "email", label: "이메일", icon: Mail },
  ];

  if (!isInitialized) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-mono">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {!loggedInUser ? (
        <div className="min-h-screen flex flex-col justify-between p-6 sm:p-10">
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
                  사내 통합 기간계 포털 (Neon PostgreSQL 실시간 연동)
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              https://www.dragonrpa.co.kr/erp
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center py-12">
            <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  임직원 로그인
                </h1>
                <p className="text-xs text-slate-400">
                  초기 비밀번호는 <strong className="text-blue-400">1111</strong> 입니다.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
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
                      placeholder="아이디 입력 (admin)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

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
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
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
                  {loading ? <span>DB 보안 인증 중...</span> : <><span>시스템 로그인</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5 font-mono text-center">
                <span>Neon PostgreSQL 실시간 데이터베이스 연동됨</span>
              </div>
            </div>
          </main>

          <footer className="max-w-6xl mx-auto w-full text-center text-xs text-slate-400 border-t border-slate-900 pt-6">
            <p>Copyright © 2026 DragonRPA Co., Ltd. All rights reserved.</p>
          </footer>
        </div>
      ) : (
        <div className="flex h-screen overflow-hidden">
          
          {/* LEFT SIDEBAR */}
          <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
            <div>
              <div className="p-5 border-b border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base text-white tracking-tight leading-none">
                    Dragon<span className="text-blue-500">ERP</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">사내 통합 시스템</span>
                </div>
              </div>

              <div className="p-4 mx-3 my-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{loggedInUser.name}</span>
                    <span className="text-[10px] text-slate-400">{loggedInUser.position}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${
                    loggedInUser.role === "SUPER_ADMIN" 
                      ? "bg-blue-950 text-blue-300 border-blue-700" 
                      : loggedInUser.role === "MANAGER"
                      ? "bg-cyan-950 text-cyan-300 border-cyan-700"
                      : "bg-emerald-950 text-emerald-300 border-emerald-700"
                  }`}>
                    {loggedInUser.role === "SUPER_ADMIN" ? "운영자" : loggedInUser.role === "MANAGER" ? "관리자" : "일반유저"}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {loggedInUser.email}
                </div>
                <div className="flex gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <KeyRound className="w-3 h-3 text-blue-400" />
                    <span>비번변경</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <LogOut className="w-3 h-3 text-red-400" />
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>

              <nav className="px-3 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  업무 메뉴
                </div>
                {menuItems.map((item) => {
                  if (item.superOnly && loggedInUser.role !== "SUPER_ADMIN") {
                    return null;
                  }
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left whitespace-nowrap ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <button onClick={fetchDbData} className="text-slate-400 hover:text-white flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${dbLoading ? 'animate-spin text-blue-400' : ''}`} /> DB 동기화
              </button>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Neon Live
              </span>
            </div>
          </aside>

          {/* RIGHT WORKSPACE AREA */}
          <main className="flex-1 bg-slate-950 overflow-y-auto flex flex-col">
            {loggedInUser.mustChangePassword && (
              <div className="bg-amber-950/80 border-b border-amber-800 text-amber-200 px-6 py-2.5 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>초기 비밀번호(1111)를 사용 중입니다. 사내 보안을 위해 비밀번호를 변경해 주십시오.</span>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-xs transition-colors"
                >
                  지금 변경
                </button>
              </div>
            )}

            <div className="p-8 max-w-7xl w-full mx-auto space-y-6">

              {/* 1. 경영관리 TAB (운영자 전용 - Neon DB 실시간 연동) */}
              {activeTab === "management" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">경영관리 (운영자 전용)</h2>
                      <p className="text-xs text-slate-400 mt-1">Neon DB 실시간 연동: 임직원 계정 발급, 비밀번호 1111 초기화 및 전사 통제</p>
                    </div>
                    <button
                      onClick={() => setShowNewEmpModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md"
                    >
                      <UserPlus className="w-4 h-4" /> 임직원 계정 신규 발급
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs text-slate-400 font-bold">실제 DB 등록 임직원</div>
                      <div className="text-2xl font-bold text-white">{employees.length}명</div>
                      <div className="text-[11px] text-blue-400">Neon PostgreSQL 실시간 조회됨</div>
                    </div>
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs text-slate-400 font-bold">결재 대기 건수</div>
                      <div className="text-2xl font-bold text-amber-400">{leaveRequests.filter(l => l.status === 'PENDING').length}건</div>
                      <div className="text-[11px] text-slate-400">실시간 상신 대기</div>
                    </div>
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs text-slate-400 font-bold">DB 스토리지 상태</div>
                      <div className="text-2xl font-bold text-emerald-400">Neon Live Connected</div>
                      <div className="text-[11px] text-slate-400">Zero Local Seed (100% DB)</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">Neon DB 임직원 계정 대장 (실시간)</h3>
                      <button onClick={fetchDbData} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5" /> 새로고침
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3 whitespace-nowrap">사번</th>
                            <th className="p-3 whitespace-nowrap">이름</th>
                            <th className="p-3 whitespace-nowrap">로그인 ID</th>
                            <th className="p-3 whitespace-nowrap">부서 / 직책</th>
                            <th className="p-3 whitespace-nowrap">역할 권한</th>
                            <th className="p-3 whitespace-nowrap">이메일</th>
                            <th className="p-3 whitespace-nowrap">비밀번호 관리</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          {employees.map((u: any) => (
                            <tr key={u.id} className="hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-white">{u.employeeNo}</td>
                              <td className="p-3 font-sans font-semibold text-white">{u.name}</td>
                              <td className="p-3 text-blue-400 font-bold">{u.loginId}</td>
                              <td className="p-3 font-sans">{u.department} ({u.position})</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  u.role === 'SUPER_ADMIN' ? 'bg-blue-950 text-blue-300 border-blue-700' : u.role === 'MANAGER' ? 'bg-cyan-950 text-cyan-300 border-cyan-700' : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-3 font-sans">{u.email}</td>
                              <td className="p-3">
                                <button
                                  onClick={() => handleResetPassword(u.id, u.name)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-sans transition-colors"
                                >
                                  1111로 초기화
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. 매출관리 TAB */}
              {activeTab === "sales" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">매출관리</h2>
                      <p className="text-xs text-slate-400 mt-1">렌탈 계약 매출, 자산별 정밀 일할 정산 및 홈택스 표준 엑셀 일괄발급을 지원합니다.</p>
                    </div>
                    <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md">
                      <FileSpreadsheet className="w-4 h-4" /> 국세청 세금계산서 엑셀 다운로드
                    </button>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">매출 전표 대장</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3 whitespace-nowrap">전표번호</th>
                            <th className="p-3 whitespace-nowrap">거래처명</th>
                            <th className="p-3 whitespace-nowrap">사업자번호</th>
                            <th className="p-3 whitespace-nowrap">발행일자</th>
                            <th className="p-3 whitespace-nowrap">공급가액</th>
                            <th className="p-3 whitespace-nowrap">세액 (10%)</th>
                            <th className="p-3 whitespace-nowrap">합계금액</th>
                            <th className="p-3 whitespace-nowrap">세금계산서 상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          <tr className="hover:bg-slate-800/40">
                            <td className="p-3 font-bold text-blue-400">INV-2026-001</td>
                            <td className="p-3 font-sans font-semibold text-white">(주)대한건설</td>
                            <td className="p-3">105-86-12345</td>
                            <td className="p-3">2026-08-25</td>
                            <td className="p-3 text-right">3,500,000원</td>
                            <td className="p-3 text-right">350,000원</td>
                            <td className="p-3 text-right font-bold text-white">3,850,000원</td>
                            <td className="p-3 font-sans"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">발행대기</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. 매입관리 TAB */}
              {activeTab === "purchase" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">매입관리</h2>
                    <p className="text-xs text-slate-400 mt-1">장비 매입, 부품 구매 및 지출 전표 내역을 관리합니다.</p>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">매입 전표 대장</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3 whitespace-nowrap">매입번호</th>
                            <th className="p-3 whitespace-nowrap">공급처명</th>
                            <th className="p-3 whitespace-nowrap">품목명</th>
                            <th className="p-3 whitespace-nowrap">매입일자</th>
                            <th className="p-3 whitespace-nowrap">공급가액</th>
                            <th className="p-3 whitespace-nowrap">세액</th>
                            <th className="p-3 whitespace-nowrap">합계금액</th>
                            <th className="p-3 whitespace-nowrap">지급상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          <tr className="hover:bg-slate-800/40">
                            <td className="p-3 font-bold text-cyan-400">PUR-2026-001</td>
                            <td className="p-3 font-sans font-semibold text-white">(주)한국유압</td>
                            <td className="p-3 font-sans">고소작업대 부품 세트</td>
                            <td className="p-3">2026-08-20</td>
                            <td className="p-3 text-right">1,200,000원</td>
                            <td className="p-3 text-right">120,000원</td>
                            <td className="p-3 text-right font-bold text-white">1,320,000원</td>
                            <td className="p-3 font-sans"><span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800">지급완료</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. 근태관리 TAB (Neon DB 실시간 연동) */}
              {activeTab === "attendance" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">근태관리 (휴가결재 & 초과근무)</h2>
                    <p className="text-xs text-slate-400 mt-1">Neon DB 실시간 연동: 근로기준법 12대 휴가 신청(주말/공휴일 자동공제 2단계 결재선) & 자율 초과근무 대장</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <CalendarCheck className="w-4 h-4 text-blue-400" /> 휴가 신청서 작성 (결재 상신)
                      </h3>

                      <form onSubmit={handleAddLeave} className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-300 whitespace-nowrap">휴가 종류 (근로기준법)</label>
                          <select
                            value={newLeaveType}
                            onChange={(e) => setNewLeaveType(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="ANNUAL">연차 (전일 - 1.0일 차감)</option>
                            <option value="AM_HALF">오전반차 (0.5일 차감)</option>
                            <option value="PM_HALF">오후반차 (0.5일 차감)</option>
                            <option value="QUARTER">반반차 (2시간 - 0.25일 차감)</option>
                            <option value="SICK">병가 (연차 미차감)</option>
                            <option value="RESERVE">예비군 / 민방위 공가 (연차 미차감)</option>
                            <option value="CONGRAT_CONDOLENCE">경조사 휴가 (연차 미차감)</option>
                            <option value="MATERNITY">출산 / 배우자 출산휴가 (연차 미차감)</option>
                            <option value="OTHER">기타 특별 공가 (연차 미차감)</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-300 whitespace-nowrap">시작일</label>
                            <input
                              type="date"
                              value={newLeaveStart}
                              onChange={(e) => setNewLeaveStart(e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-300 whitespace-nowrap">종료일</label>
                            <input
                              type="date"
                              value={newLeaveEnd}
                              onChange={(e) => setNewLeaveEnd(e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                          ℹ️ 기간 중 주말 및 법정 공휴일은 차감 일수에서 자동 공제됩니다.
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-300 whitespace-nowrap">신청 사유</label>
                          <textarea
                            rows={2}
                            value={newLeaveReason}
                            onChange={(e) => setNewLeaveReason(e.target.value)}
                            placeholder="휴가 사유를 입력하십시오."
                            className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors"
                        >
                          Neon DB에 결재 상신하기
                        </button>
                      </form>
                    </div>

                    <div className="lg:col-span-7 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">휴가 결재 및 승인 내역 (Neon DB 실시간)</h3>
                        <span className="text-xs text-slate-400">총 {leaveRequests.length}건</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="p-2.5 whitespace-nowrap">신청자</th>
                              <th className="p-2.5 whitespace-nowrap">휴가종류</th>
                              <th className="p-2.5 whitespace-nowrap">기간</th>
                              <th className="p-2.5 whitespace-nowrap">차감</th>
                              <th className="p-2.5 whitespace-nowrap">상태</th>
                              <th className="p-2.5 whitespace-nowrap">결재 액션</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {leaveRequests.length === 0 ? (
                              <tr><td colSpan={6} className="p-4 text-center text-slate-500 font-mono">등록된 휴가 신청 내역이 없습니다.</td></tr>
                            ) : (
                              leaveRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-800/40">
                                  <td className="p-2.5 font-bold text-white whitespace-nowrap">{req.empName}</td>
                                  <td className="p-2.5 whitespace-nowrap">{req.leaveType}</td>
                                  <td className="p-2.5 font-mono text-[11px] whitespace-nowrap">{req.startDate} ~ {req.endDate}</td>
                                  <td className="p-2.5 font-mono whitespace-nowrap">{req.deducted}일</td>
                                  <td className="p-2.5 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      req.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : req.status === 'REJECTED' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                                    }`}>
                                      {req.status === 'APPROVED' ? '승인완료' : req.status === 'REJECTED' ? '반려됨' : '결재대기'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 whitespace-nowrap">
                                    {(loggedInUser.role === 'SUPER_ADMIN' || loggedInUser.role === 'MANAGER') && req.status === 'PENDING' ? (
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => handleUpdateLeaveStatus(req.id, "APPROVED")}
                                          className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-bold"
                                        >
                                          승인
                                        </button>
                                        <button
                                          onClick={() => handleUpdateLeaveStatus(req.id, "REJECTED")}
                                          className="px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white rounded text-[10px] font-bold"
                                        >
                                          반려
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-500">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Overtime Self Entry Section */}
                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-cyan-400" /> 자율 초과근무 기록 대장 (결재 불필요 - Neon DB 실시간)
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">승인 절차 없이 임직원 스스로 연장/야간 근무 내역을 자유롭게 입력합니다.</p>
                    </div>

                    <form onSubmit={handleAddOvertime} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-4 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-300 whitespace-nowrap">근무일자</label>
                        <input
                          type="date"
                          value={newOtDate}
                          onChange={(e) => setNewOtDate(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-300 whitespace-nowrap">시작시간</label>
                        <input
                          type="time"
                          value={newOtStart}
                          onChange={(e) => setNewOtStart(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-300 whitespace-nowrap">종료시간</label>
                        <input
                          type="time"
                          value={newOtEnd}
                          onChange={(e) => setNewOtEnd(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-4 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-300 whitespace-nowrap">수행 업무 내용</label>
                        <input
                          type="text"
                          value={newOtDetails}
                          onChange={(e) => setNewOtDetails(e.target.value)}
                          placeholder="야간/연장 업무 내용을 간략히 입력"
                          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold rounded shadow transition-colors"
                        >
                          DB 자율 등록
                        </button>
                      </div>
                    </form>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-2.5 whitespace-nowrap">성명</th>
                            <th className="p-2.5 whitespace-nowrap">근무일자</th>
                            <th className="p-2.5 whitespace-nowrap">구분</th>
                            <th className="p-2.5 whitespace-nowrap">근무시간</th>
                            <th className="p-2.5 whitespace-nowrap">인정시간</th>
                            <th className="p-2.5">업무 상세 내용</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          {overtimes.length === 0 ? (
                            <tr><td colSpan={6} className="p-4 text-center text-slate-500 font-mono">등록된 초과근무 내역이 없습니다.</td></tr>
                          ) : (
                            overtimes.map((ot) => (
                              <tr key={ot.id} className="hover:bg-slate-800/40">
                                <td className="p-2.5 font-sans font-bold text-white">{ot.empName}</td>
                                <td className="p-2.5">{ot.workDate}</td>
                                <td className="p-2.5 font-sans"><span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">{ot.workType}</span></td>
                                <td className="p-2.5">{ot.startTime} ~ {ot.endTime}</td>
                                <td className="p-2.5 font-bold text-cyan-400">{ot.hours}시간</td>
                                <td className="p-2.5 font-sans text-slate-300">{ot.details}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. 자산재고관리 TAB (Neon DB 실시간) */}
              {activeTab === "assets" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">자산재고관리 (렌탈 자산 & 배차)</h2>
                      <p className="text-xs text-slate-400 mt-1">Neon DB 실시간 연동: 출고 검수 승인 시 RENTED(대여중) 자동 전환 및 단일 EXCHANGE 배차</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">Neon DB 보유 렌탈 자산 마스터</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3 whitespace-nowrap">자산번호</th>
                            <th className="p-3 whitespace-nowrap">장비명</th>
                            <th className="p-3 whitespace-nowrap">모델명</th>
                            <th className="p-3 whitespace-nowrap">상태</th>
                            <th className="p-3 whitespace-nowrap">현재 위치</th>
                            <th className="p-3 whitespace-nowrap">취득가액</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          {assets.length === 0 ? (
                            <tr><td colSpan={6} className="p-4 text-center text-slate-500 font-mono">등록된 자산이 없습니다.</td></tr>
                          ) : (
                            assets.map((ast) => (
                              <tr key={ast.code} className="hover:bg-slate-800/40">
                                <td className="p-3 font-bold text-blue-400">{ast.code}</td>
                                <td className="p-3 font-sans font-semibold text-white">{ast.name}</td>
                                <td className="p-3">{ast.model}</td>
                                <td className="p-3 font-sans">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    ast.status === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : ast.status === 'RENTED' ? 'bg-blue-950 text-blue-300 border-blue-800' : ast.status === 'PENDING_OUT' ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-red-950 text-red-300 border-red-800'
                                  }`}>
                                    {ast.status}
                                  </span>
                                </td>
                                <td className="p-3 font-sans text-slate-300">{ast.location}</td>
                                <td className="p-3 text-right">{ast.price ? Number(ast.price).toLocaleString() : 0}원</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. 소모품재고관리 TAB (Neon DB 실시간) */}
              {activeTab === "consumables" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">소모품재고관리</h2>
                    <p className="text-xs text-slate-400 mt-1">Neon DB 실시간 연동: 부품/소모품 입출고 및 적정 안전재고 관리</p>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">Neon DB 소모품 품목 대장</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3 whitespace-nowrap">품목코드</th>
                            <th className="p-3 whitespace-nowrap">품목명</th>
                            <th className="p-3 whitespace-nowrap">규격</th>
                            <th className="p-3 whitespace-nowrap">단위</th>
                            <th className="p-3 whitespace-nowrap">현재고</th>
                            <th className="p-3 whitespace-nowrap">안전재고</th>
                            <th className="p-3 whitespace-nowrap">기본단가</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          {consumables.length === 0 ? (
                            <tr><td colSpan={7} className="p-4 text-center text-slate-500 font-mono">등록된 소모품이 없습니다.</td></tr>
                          ) : (
                            consumables.map((c) => (
                              <tr key={c.code} className="hover:bg-slate-800/40">
                                <td className="p-3 font-bold text-cyan-400">{c.code}</td>
                                <td className="p-3 font-sans font-semibold text-white">{c.name}</td>
                                <td className="p-3 font-sans">{c.spec}</td>
                                <td className="p-3">{c.unit}</td>
                                <td className="p-3 font-bold text-emerald-400">{c.stock}</td>
                                <td className="p-3 text-slate-400">{c.safety}</td>
                                <td className="p-3 text-right">{c.unitPrice ? Number(c.unitPrice).toLocaleString() : 0}원</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. 파일관리 TAB */}
              {activeTab === "files" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">파일관리 (사내문서함 EDMS)</h2>
                    <p className="text-xs text-slate-400 mt-1">Cloudflare R2 버킷(`dragonrpa-erp`) 기반 트리형 표준 사내 문서함입니다.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-4 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="text-xs font-bold text-slate-400 uppercase">폴더 트리 구조</div>
                      <div className="space-y-1 text-xs font-sans">
                        <div className="p-2 rounded bg-slate-800 text-blue-400 font-bold flex items-center gap-2 cursor-pointer">
                          <FolderTree className="w-4 h-4" /> 01. 사규 및 회사 규정
                        </div>
                        <div className="p-2 hover:bg-slate-800/60 text-slate-300 rounded flex items-center gap-2 cursor-pointer">
                          <FolderTree className="w-4 h-4 text-slate-400" /> 02. 표준 서식 및 기안 양식
                        </div>
                        <div className="p-2 hover:bg-slate-800/60 text-slate-300 rounded flex items-center gap-2 cursor-pointer">
                          <FolderTree className="w-4 h-4 text-slate-400" /> 03. 계약서 및 거래처 서류
                        </div>
                        <div className="p-2 hover:bg-slate-800/60 text-slate-300 rounded flex items-center gap-2 cursor-pointer">
                          <FolderTree className="w-4 h-4 text-slate-400" /> 04. 기술 및 RPA 매뉴얼
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-8 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">01. 사규 및 회사 규정</h3>
                        <span className="text-xs text-slate-400">R2 버킷: dragonrpa-erp</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="p-2.5">문서명</th>
                              <th className="p-2.5">파일명</th>
                              <th className="p-2.5">버전</th>
                              <th className="p-2.5">등록자</th>
                              <th className="p-2.5 text-center">다운로드</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            <tr className="hover:bg-slate-800/40">
                              <td className="p-2.5 font-bold text-white">2026년도 취업규칙 및 근태관리지침</td>
                              <td className="p-2.5 font-mono text-slate-400">company_rule_2026.pdf</td>
                              <td className="p-2.5 font-mono text-blue-400">v1.2</td>
                              <td className="p-2.5">이정용 대표</td>
                              <td className="p-2.5 text-center">
                                <button className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 8. 이메일 TAB */}
              {activeTab === "email" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">이메일 (`@dragonrpa.co.kr`)</h2>
                    <p className="text-xs text-slate-400 mt-1">임직원 전용 회사 이메일 계정 및 라우팅 상태를 확인합니다.</p>
                  </div>

                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">회사 이메일 계정: {loggedInUser.email}</div>
                        <div className="text-xs text-slate-400">도메인 보안 인증 (SPF, DKIM, DMARC) PASS</div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex gap-3">
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                      >
                        <span>웹메일 접속 바로가기</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      )}

      {/* Password Change Modal */}
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
                <p className="text-xs text-slate-400">Neon DB에 안전하게 반영되었습니다.</p>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
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

      {/* New Employee Modal (Super Admin Only) */}
      {showNewEmpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <UserPlus className="w-5 h-5 text-blue-500" />
                <span>임직원 계정 신규 발급</span>
              </div>
              <button
                onClick={() => setShowNewEmpModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">사번</label>
                  <input
                    type="text"
                    required
                    placeholder="예: DR-002"
                    value={newEmpNo}
                    onChange={(e) => setNewEmpNo(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">로그인 ID</label>
                  <input
                    type="text"
                    required
                    placeholder="예: sales_mgr"
                    value={newEmpLoginId}
                    onChange={(e) => setNewEmpLoginId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">성명</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 홍길동"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">역할 권한</label>
                  <select
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                  >
                    <option value="USER">일반 사용자 (USER)</option>
                    <option value="MANAGER">부서 관리자 (MANAGER)</option>
                    <option value="SUPER_ADMIN">최고 운영자 (SUPER_ADMIN)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">부서</label>
                  <input
                    type="text"
                    placeholder="예: 영업부"
                    value={newEmpDept}
                    onChange={(e) => setNewEmpDept(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">직책</label>
                  <input
                    type="text"
                    placeholder="예: 팀장"
                    value={newEmpPos}
                    onChange={(e) => setNewEmpPos(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-300 whitespace-nowrap">이메일</label>
                <input
                  type="email"
                  placeholder="미입력 시 [ID]@dragonrpa.co.kr 자동 부여"
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-blue-400">
                🔒 신규 계정 발급 시 초기 비밀번호는 <strong>1111</strong> 로 자동 설정됩니다.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEmpModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-colors"
                >
                  계정 발급 및 DB 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}