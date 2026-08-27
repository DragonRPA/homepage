"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Bot, Lock, User, KeyRound, X, LogOut, TrendingUp, ShoppingCart, 
  CalendarCheck, FolderTree, Package, Layers, Mail, Plus, 
  FileSpreadsheet, Clock, RefreshCw, UserPlus, CheckCircle2, AlertCircle,
  FileText, Calendar
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

  // Month filter for overtimes (Format: YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState("2026-08");

  // Leave Usage Detail Modal State
  const [selectedEmpForLeave, setSelectedEmpForLeave] = useState<any>(null);

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdChangeError, setPwdChangeError] = useState("");
  const [pwdChangeSuccess, setPwdChangeSuccess] = useState(false);

  // New Employee Modal State
  const [showNewEmpModal, setShowNewEmpModal] = useState(false);
  const [newEmpNo, setNewEmpNo] = useState("");
  const [newEmpLoginId, setNewEmpLoginId] = useState("");
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpDept, setNewEmpDept] = useState("기술개발부");
  const [newEmpPos, setNewEmpPos] = useState("사원");
  const [newEmpRole, setNewEmpRole] = useState("USER");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpGrantDays, setNewEmpGrantDays] = useState("15.0");

  // Leave Form Inputs
  const [newLeaveType, setNewLeaveType] = useState("ANNUAL");
  const [newLeaveStart, setNewLeaveStart] = useState("2026-09-01");
  const [newLeaveEnd, setNewLeaveEnd] = useState("2026-09-01");
  const [newLeaveReason, setNewLeaveReason] = useState("");

  // Overtime Form Inputs
  const [newOtDate, setNewOtDate] = useState("2026-08-27");
  const [newOtStart, setNewOtStart] = useState("18:00");
  const [newOtEnd, setNewOtEnd] = useState("20:30");
  const [newOtHours, setNewOtHours] = useState("2.5");
  const [newOtDetails, setNewOtDetails] = useState("");

  // Fetch DB Data
  const fetchDbData = useCallback(async () => {
    setDbLoading(true);
    try {
      const empRes = await fetch("/api/erp/employees");
      const empData = await empRes.json();
      if (empData.success) setEmployees(empData.employees);

      const leaveRes = await fetch("/api/erp/leaves");
      const leaveData = await leaveRes.json();
      if (leaveData.success) setLeaveRequests(leaveData.leaves);

      const otRes = await fetch("/api/erp/overtimes");
      const otData = await otRes.json();
      if (otData.success) setOvertimes(otData.overtimes);

      const astRes = await fetch("/api/erp/assets");
      const astData = await astRes.json();
      if (astData.success) setAssets(astData.assets);

      const conRes = await fetch("/api/erp/consumables");
      const conData = await conRes.json();
      if (conData.success) setConsumables(conData.consumables);
    } catch (err) {
      console.error(err);
    } finally {
      setDbLoading(false);
    }
  }, []);

  // Restore Session on Page Load
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("dragonrpa_erp_user");
      const savedTab = localStorage.getItem("dragonrpa_erp_tab");
      if (savedUser) setLoggedInUser(JSON.parse(savedUser));
      if (savedTab) setActiveTab(savedTab as any);
    } catch (e) {
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (loggedInUser) {
      fetchDbData();
    }
  }, [loggedInUser, fetchDbData]);

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    try {
      localStorage.setItem("dragonrpa_erp_tab", tab);
    } catch (e) {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setErrorMsg("아이디와 비밀번호를 입력하십시오.");
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
        setErrorMsg(data.error || "로그인 실패");
      } else {
        setLoggedInUser(data.user);
        try {
          localStorage.setItem("dragonrpa_erp_user", JSON.stringify(data.user));
        } catch (e) {}
      }
    } catch (err) {
      setErrorMsg("통신 오류");
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdChangeError("");
    setPwdChangeSuccess(false);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdChangeError("비밀번호 항목을 입력하십시오.");
      return;
    }

    if (newPwd.length < 4) {
      setPwdChangeError("비밀번호는 4자리 이상이어야 합니다.");
      return;
    }

    if (newPwd !== confirmPwd) {
      setPwdChangeError("비밀번호 확인이 일치하지 않습니다.");
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
        setPwdChangeError(data.error || "비밀번호 변경 실패");
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
        }, 1000);
      }
    } catch (err) {
      setPwdChangeError("통신 오류");
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpNo || !newEmpLoginId || !newEmpName) {
      alert("필수 항목을 입력하십시오.");
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
          grantDays: Number(newEmpGrantDays) || 15.0,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "등록 실패");
      } else {
        setShowNewEmpModal(false);
        setNewEmpNo("");
        setNewEmpLoginId("");
        setNewEmpName("");
        setNewEmpEmail("");
        setNewEmpGrantDays("15.0");
        fetchDbData();
      }
    } catch (err) {
      alert("통신 오류");
    }
  };

  const handleResetPassword = async (empId: number) => {
    if (!confirm("비밀번호를 초기화하시겠습니까?")) return;

    try {
      const res = await fetch("/api/erp/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: empId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchDbData();
      } else {
        alert(data.error || "초기화 실패");
      }
    } catch (err) {
      alert("통신 오류");
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveReason) {
      alert("휴가 사유를 입력하십시오.");
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
        setNewLeaveReason("");
        fetchDbData();
      } else {
        alert(data.error || "신청 실패");
      }
    } catch (err) {
      alert("통신 오류");
    }
  };

  const handleAddOvertime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOtDetails) {
      alert("업무 내용을 입력하십시오.");
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
          hours: Number(newOtHours) || 2.5,
          details: newOtDetails,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewOtDetails("");
        fetchDbData();
      } else {
        alert(data.error || "등록 실패");
      }
    } catch (err) {
      alert("통신 오류");
    }
  };

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

  // Filtered overtimes by selected month (YYYY-MM)
  const filteredOvertimes = useMemo(() => {
    if (!selectedMonth) return overtimes;
    return overtimes.filter((ot) => {
      const d = String(ot.workDate || "");
      return d.startsWith(selectedMonth);
    });
  }, [overtimes, selectedMonth]);

  // Total Overtime Hours in selected month
  const totalMonthlyOvertimeHours = useMemo(() => {
    return filteredOvertimes.reduce((acc, cur) => acc + Number(cur.hours || 0), 0);
  }, [filteredOvertimes]);

  // Specific employee's leave requests for detail modal
  const selectedEmpLeaveList = useMemo(() => {
    if (!selectedEmpForLeave) return [];
    return leaveRequests.filter((l) => Number(l.employeeId) === Number(selectedEmpForLeave.id));
  }, [leaveRequests, selectedEmpForLeave]);

  const menuItems = [
    { id: "management", label: "경영관리", icon: User, superOnly: true },
    { id: "sales", label: "매출관리", icon: TrendingUp },
    { id: "purchase", label: "매입관리", icon: ShoppingCart },
    { id: "attendance", label: "근태관리", icon: CalendarCheck },
    { id: "assets", label: "자산재고관리", icon: Layers },
    { id: "consumables", label: "소모품재고관리", icon: Package },
    { id: "files", label: "파일관리", icon: FolderTree },
    { id: "email", label: "이메일", icon: Mail },
  ];

  if (!isInitialized) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-mono">로딩</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {!loggedInUser ? (
        <div className="min-h-screen flex flex-col justify-between p-6 sm:p-10">
          <header className="max-w-6xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Bot className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-white tracking-tight leading-none">
                  DragonERP
                </span>
                <span className="text-[11px] text-slate-400 font-medium mt-1">
                  통합 관리 시스템
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              /erp
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center py-12">
            <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  로그인
                </h1>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
                    아이디
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder="아이디"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

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
                      placeholder="비밀번호"
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
                  className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md flex items-center justify-center transition-all disabled:opacity-50"
                >
                  {loading ? <span>인증 중</span> : <span>로그인</span>}
                </button>
              </form>
            </div>
          </main>

          <footer className="max-w-6xl mx-auto w-full text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
            <p>© DragonRPA Co., Ltd.</p>
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
                    DragonERP
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">사내 포털</span>
                </div>
              </div>

              <div className="p-4 mx-3 my-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white whitespace-nowrap">{loggedInUser.name}</span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{loggedInUser.position}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border whitespace-nowrap ${
                    loggedInUser.role === "SUPER_ADMIN" 
                      ? "bg-blue-950 text-blue-300 border-blue-700" 
                      : loggedInUser.role === "MANAGER"
                      ? "bg-cyan-950 text-cyan-300 border-cyan-700"
                      : "bg-emerald-950 text-emerald-300 border-emerald-700"
                  }`}>
                    {loggedInUser.role}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {loggedInUser.email}
                </div>
                <div className="flex gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <KeyRound className="w-3 h-3 text-blue-400" />
                    <span>비밀번호 변경</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <LogOut className="w-3 h-3 text-red-400" />
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>

              <nav className="px-3 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  메뉴
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
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left whitespace-nowrap ${
                        isActive
                          ? "bg-blue-600 text-white font-bold"
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
                <RefreshCw className={`w-3 h-3 ${dbLoading ? 'animate-spin text-blue-400' : ''}`} /> 새로고침
              </button>
              <span className="text-slate-500">v0.2.4</span>
            </div>
          </aside>

          {/* RIGHT WORKSPACE AREA */}
          <main className="flex-1 bg-slate-950 overflow-y-auto flex flex-col">
            <div className="p-8 max-w-7xl w-full mx-auto space-y-6">

              {/* 1. 경영관리 TAB */}
              {activeTab === "management" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">경영관리</h2>
                    </div>
                    <button
                      onClick={() => setShowNewEmpModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <UserPlus className="w-4 h-4" /> 사원 등록
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs text-slate-400 font-bold whitespace-nowrap">사원 수</div>
                      <div className="text-2xl font-bold text-white">{employees.length}명</div>
                    </div>
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs text-slate-400 font-bold whitespace-nowrap">결재 대기</div>
                      <div className="text-2xl font-bold text-amber-400">{leaveRequests.filter(l => l.status === 'PENDING').length}건</div>
                    </div>
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs text-slate-400 font-bold whitespace-nowrap">자산 수</div>
                      <div className="text-2xl font-bold text-white">{assets.length}대</div>
                    </div>
                  </div>

                  {/* Employee Leave Summary Table (with Left Action Column [상세]) */}
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white whitespace-nowrap">사원별 연차 현황 및 계정 대장</h3>
                      <button onClick={fetchDbData} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 whitespace-nowrap">
                        <RefreshCw className="w-3.5 h-3.5" /> 갱신
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3 whitespace-nowrap text-center">연차 상세</th>
                            <th className="p-3 whitespace-nowrap">사번</th>
                            <th className="p-3 whitespace-nowrap">성명</th>
                            <th className="p-3 whitespace-nowrap">부서 / 직책</th>
                            <th className="p-3 whitespace-nowrap text-right">부여 연차</th>
                            <th className="p-3 whitespace-nowrap text-right">사용 연차</th>
                            <th className="p-3 whitespace-nowrap text-right">잔여 연차</th>
                            <th className="p-3 whitespace-nowrap">아이디</th>
                            <th className="p-3 whitespace-nowrap">권한</th>
                            <th className="p-3 whitespace-nowrap">관리</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          {employees.map((u: any) => (
                            <tr key={u.id} className="hover:bg-slate-800/40">
                              <td className="p-3 text-center whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedEmpForLeave(u)}
                                  className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 border border-blue-700 text-blue-300 rounded text-[11px] font-sans font-bold flex items-center gap-1 mx-auto transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>상세 ➔</span>
                                </button>
                              </td>
                              <td className="p-3 font-bold text-white whitespace-nowrap">{u.employeeNo}</td>
                              <td className="p-3 font-sans font-semibold text-white whitespace-nowrap">{u.name}</td>
                              <td className="p-3 font-sans whitespace-nowrap">{u.department} {u.position}</td>
                              <td className="p-3 text-right whitespace-nowrap font-bold text-slate-300">{Number(u.grantDays || 15.0).toFixed(1)}일</td>
                              <td className="p-3 text-right whitespace-nowrap font-bold text-blue-400">{Number(u.usedDays || 0).toFixed(1)}일</td>
                              <td className="p-3 text-right whitespace-nowrap font-bold text-emerald-400">{Number(u.remainDays !== undefined ? u.remainDays : 15.0).toFixed(1)}일</td>
                              <td className="p-3 text-blue-400 font-bold whitespace-nowrap">{u.loginId}</td>
                              <td className="p-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  u.role === 'SUPER_ADMIN' ? 'bg-blue-950 text-blue-300 border-blue-700' : u.role === 'MANAGER' ? 'bg-cyan-950 text-cyan-300 border-cyan-700' : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <button
                                  onClick={() => handleResetPassword(u.id)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-sans transition-colors"
                                >
                                  비밀번호 초기화
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
                    </div>
                    <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 whitespace-nowrap">
                      <FileSpreadsheet className="w-4 h-4" /> 세금계산서 엑셀 다운로드
                    </button>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white whitespace-nowrap">매출 전표 목록</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3 whitespace-nowrap">전표번호</th>
                            <th className="p-3 whitespace-nowrap">거래처명</th>
                            <th className="p-3 whitespace-nowrap">사업자번호</th>
                            <th className="p-3 whitespace-nowrap">발행일자</th>
                            <th className="p-3 whitespace-nowrap">공급가액</th>
                            <th className="p-3 whitespace-nowrap">세액</th>
                            <th className="p-3 whitespace-nowrap">합계금액</th>
                            <th className="p-3 whitespace-nowrap">상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          <tr className="hover:bg-slate-800/40">
                            <td className="p-3 font-bold text-blue-400 whitespace-nowrap">INV-2026-001</td>
                            <td className="p-3 font-sans font-semibold text-white whitespace-nowrap">(주)대한건설</td>
                            <td className="p-3 whitespace-nowrap">105-86-12345</td>
                            <td className="p-3 whitespace-nowrap">2026-08-25</td>
                            <td className="p-3 text-right whitespace-nowrap">3,500,000원</td>
                            <td className="p-3 text-right whitespace-nowrap">350,000원</td>
                            <td className="p-3 text-right font-bold text-white whitespace-nowrap">3,850,000원</td>
                            <td className="p-3 font-sans whitespace-nowrap"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">발행대기</span></td>
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
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white whitespace-nowrap">매입 전표 목록</h3>
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
                            <td className="p-3 font-bold text-cyan-400 whitespace-nowrap">PUR-2026-001</td>
                            <td className="p-3 font-sans font-semibold text-white whitespace-nowrap">(주)한국유압</td>
                            <td className="p-3 font-sans whitespace-nowrap">부품 세트</td>
                            <td className="p-3 whitespace-nowrap">2026-08-20</td>
                            <td className="p-3 text-right whitespace-nowrap">1,200,000원</td>
                            <td className="p-3 text-right whitespace-nowrap">120,000원</td>
                            <td className="p-3 text-right font-bold text-white whitespace-nowrap">1,320,000원</td>
                            <td className="p-3 font-sans whitespace-nowrap"><span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800">지급완료</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. 근태관리 TAB */}
              {activeTab === "attendance" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">근태관리</h2>
                    </div>
                  </div>

                  {/* 사원별 연차 요약 카드 리스트 (클릭 시 상세) */}
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white whitespace-nowrap">사원별 연차 현황</h3>
                      <button onClick={fetchDbData} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 whitespace-nowrap">
                        <RefreshCw className="w-3.5 h-3.5" /> 갱신
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3 whitespace-nowrap text-center">연차 상세</th>
                            <th className="p-3 whitespace-nowrap">사번</th>
                            <th className="p-3 whitespace-nowrap">성명</th>
                            <th className="p-3 whitespace-nowrap">부서 / 직책</th>
                            <th className="p-3 whitespace-nowrap text-right">부여 연차</th>
                            <th className="p-3 whitespace-nowrap text-right">사용 연차</th>
                            <th className="p-3 whitespace-nowrap text-right">잔여 연차</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          {employees.map((u: any) => (
                            <tr key={u.id} className="hover:bg-slate-800/40">
                              <td className="p-3 text-center whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedEmpForLeave(u)}
                                  className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 border border-blue-700 text-blue-300 rounded text-[11px] font-sans font-bold flex items-center gap-1 mx-auto transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>상세 ➔</span>
                                </button>
                              </td>
                              <td className="p-3 font-bold text-white whitespace-nowrap">{u.employeeNo}</td>
                              <td className="p-3 font-sans font-semibold text-white whitespace-nowrap">{u.name}</td>
                              <td className="p-3 font-sans whitespace-nowrap">{u.department} {u.position}</td>
                              <td className="p-3 text-right whitespace-nowrap font-bold text-slate-300">{Number(u.grantDays || 15.0).toFixed(1)}일</td>
                              <td className="p-3 text-right whitespace-nowrap font-bold text-blue-400">{Number(u.usedDays || 0).toFixed(1)}일</td>
                              <td className="p-3 text-right whitespace-nowrap font-bold text-emerald-400">{Number(u.remainDays !== undefined ? u.remainDays : 15.0).toFixed(1)}일</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5 whitespace-nowrap">
                        <CalendarCheck className="w-4 h-4 text-blue-400" /> 휴가 신청
                      </h3>

                      <form onSubmit={handleAddLeave} className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-300 whitespace-nowrap">휴가 구분</label>
                          <select
                            value={newLeaveType}
                            onChange={(e) => setNewLeaveType(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="ANNUAL">연차 (1.0일)</option>
                            <option value="AM_HALF">오전반차 (0.5일)</option>
                            <option value="PM_HALF">오후반차 (0.5일)</option>
                            <option value="QUARTER">반반차 (0.25일)</option>
                            <option value="SICK">병가</option>
                            <option value="RESERVE">공가</option>
                            <option value="CONGRAT_CONDOLENCE">경조사</option>
                            <option value="MATERNITY">출산휴가</option>
                            <option value="OTHER">기타</option>
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

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-300 whitespace-nowrap">사유</label>
                          <textarea
                            rows={2}
                            value={newLeaveReason}
                            onChange={(e) => setNewLeaveReason(e.target.value)}
                            placeholder="사유"
                            className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                        >
                          신청
                        </button>
                      </form>
                    </div>

                    <div className="lg:col-span-7 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white whitespace-nowrap">휴가 신청 목록</h3>
                        <span className="text-xs text-slate-400 whitespace-nowrap">총 {leaveRequests.length}건</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="p-2.5 whitespace-nowrap">신청자</th>
                              <th className="p-2.5 whitespace-nowrap">구분</th>
                              <th className="p-2.5 whitespace-nowrap">기간</th>
                              <th className="p-2.5 whitespace-nowrap">차감</th>
                              <th className="p-2.5 whitespace-nowrap">상태</th>
                              <th className="p-2.5 whitespace-nowrap">결재</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {leaveRequests.length === 0 ? (
                              <tr><td colSpan={6} className="p-4 text-center text-slate-500 font-mono">내역 없음</td></tr>
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
                                      {req.status === 'APPROVED' ? '승인' : req.status === 'REJECTED' ? '반려' : '대기'}
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

                  {/* Monthly Overtime Section (월별 초과근무 조회 필터 탑재) */}
                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5 whitespace-nowrap">
                          <Clock className="w-4 h-4 text-cyan-400" /> 월별 초과근무 조회 및 등록
                        </h3>
                      </div>

                      {/* Month Filter Selector */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5">
                          <Calendar className="w-4 h-4 text-blue-400" />
                          <label className="text-xs font-bold text-slate-300 whitespace-nowrap">조회 월:</label>
                          <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-xs text-white font-mono focus:outline-none cursor-pointer"
                          />
                        </div>

                        <div className="px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-xs font-bold whitespace-nowrap">
                          해당 월 합계: {totalMonthlyOvertimeHours.toFixed(1)}시간 ({filteredOvertimes.length}건)
                        </div>
                      </div>
                    </div>

                    {/* Overtime Registration Form */}
                    <form onSubmit={handleAddOvertime} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-4 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-300 whitespace-nowrap">일자</label>
                        <input
                          type="date"
                          value={newOtDate}
                          onChange={(e) => setNewOtDate(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-300 whitespace-nowrap">시작</label>
                        <input
                          type="time"
                          value={newOtStart}
                          onChange={(e) => setNewOtStart(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-300 whitespace-nowrap">종료</label>
                        <input
                          type="time"
                          value={newOtEnd}
                          onChange={(e) => setNewOtEnd(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-1 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-300 whitespace-nowrap">시간</label>
                        <input
                          type="number"
                          step="0.5"
                          value={newOtHours}
                          onChange={(e) => setNewOtHours(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-3 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-300 whitespace-nowrap">내용</label>
                        <input
                          type="text"
                          value={newOtDetails}
                          onChange={(e) => setNewOtDetails(e.target.value)}
                          placeholder="내용 입력"
                          className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold rounded transition-colors whitespace-nowrap"
                        >
                          등록
                        </button>
                      </div>
                    </form>

                    {/* Filtered Monthly Overtime Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-2.5 whitespace-nowrap">성명</th>
                            <th className="p-2.5 whitespace-nowrap">일자</th>
                            <th className="p-2.5 whitespace-nowrap">구분</th>
                            <th className="p-2.5 whitespace-nowrap">시간</th>
                            <th className="p-2.5 whitespace-nowrap">인정시간</th>
                            <th className="p-2.5">내용</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          {filteredOvertimes.length === 0 ? (
                            <tr><td colSpan={6} className="p-4 text-center text-slate-500 font-mono">{selectedMonth} 월 초과근무 내역 없음</td></tr>
                          ) : (
                            filteredOvertimes.map((ot) => (
                              <tr key={ot.id} className="hover:bg-slate-800/40">
                                <td className="p-2.5 font-sans font-bold text-white whitespace-nowrap">{ot.empName}</td>
                                <td className="p-2.5 whitespace-nowrap">{ot.workDate}</td>
                                <td className="p-2.5 font-sans whitespace-nowrap"><span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">{ot.workType}</span></td>
                                <td className="p-2.5 whitespace-nowrap">{ot.startTime} ~ {ot.endTime}</td>
                                <td className="p-2.5 font-bold text-cyan-400 whitespace-nowrap">{Number(ot.hours).toFixed(1)}시간</td>
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

              {/* 5. 자산재고관리 TAB */}
              {activeTab === "assets" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">자산재고관리</h2>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white whitespace-nowrap">자산 목록</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3 whitespace-nowrap">자산번호</th>
                            <th className="p-3 whitespace-nowrap">품명</th>
                            <th className="p-3 whitespace-nowrap">모델명</th>
                            <th className="p-3 whitespace-nowrap">상태</th>
                            <th className="p-3 whitespace-nowrap">위치</th>
                            <th className="p-3 whitespace-nowrap">취득가</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          {assets.length === 0 ? (
                            <tr><td colSpan={6} className="p-4 text-center text-slate-500 font-mono">내역 없음</td></tr>
                          ) : (
                            assets.map((ast) => (
                              <tr key={ast.code} className="hover:bg-slate-800/40">
                                <td className="p-3 font-bold text-blue-400 whitespace-nowrap">{ast.code}</td>
                                <td className="p-3 font-sans font-semibold text-white whitespace-nowrap">{ast.name}</td>
                                <td className="p-3 whitespace-nowrap">{ast.model}</td>
                                <td className="p-3 font-sans whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    ast.status === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : ast.status === 'RENTED' ? 'bg-blue-950 text-blue-300 border-blue-800' : ast.status === 'PENDING_OUT' ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-red-950 text-red-300 border-red-800'
                                  }`}>
                                    {ast.status}
                                  </span>
                                </td>
                                <td className="p-3 font-sans text-slate-300 whitespace-nowrap">{ast.location}</td>
                                <td className="p-3 text-right whitespace-nowrap">{ast.price ? Number(ast.price).toLocaleString() : 0}원</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. 소모품재고관리 TAB */}
              {activeTab === "consumables" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">소모품재고관리</h2>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white whitespace-nowrap">소모품 목록</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3 whitespace-nowrap">품목코드</th>
                            <th className="p-3 whitespace-nowrap">품명</th>
                            <th className="p-3 whitespace-nowrap">규격</th>
                            <th className="p-3 whitespace-nowrap">단위</th>
                            <th className="p-3 whitespace-nowrap">재고</th>
                            <th className="p-3 whitespace-nowrap">안전재고</th>
                            <th className="p-3 whitespace-nowrap">단가</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          {consumables.length === 0 ? (
                            <tr><td colSpan={7} className="p-4 text-center text-slate-500 font-mono">내역 없음</td></tr>
                          ) : (
                            consumables.map((c) => (
                              <tr key={c.code} className="hover:bg-slate-800/40">
                                <td className="p-3 font-bold text-cyan-400 whitespace-nowrap">{c.code}</td>
                                <td className="p-3 font-sans font-semibold text-white whitespace-nowrap">{c.name}</td>
                                <td className="p-3 font-sans whitespace-nowrap">{c.spec}</td>
                                <td className="p-3 whitespace-nowrap">{c.unit}</td>
                                <td className="p-3 font-bold text-emerald-400 whitespace-nowrap">{c.stock}</td>
                                <td className="p-3 text-slate-400">{c.safety}</td>
                                <td className="p-3 text-right whitespace-nowrap">{c.unitPrice ? Number(c.unitPrice).toLocaleString() : 0}원</td>
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
                    <h2 className="text-xl font-bold text-white tracking-tight">파일관리</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-4 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap">폴더</div>
                      <div className="space-y-1 text-xs font-sans">
                        <div className="p-2 rounded bg-slate-800 text-blue-400 font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap">
                          <FolderTree className="w-4 h-4" /> 사규
                        </div>
                        <div className="p-2 hover:bg-slate-800/60 text-slate-300 rounded flex items-center gap-2 cursor-pointer whitespace-nowrap">
                          <FolderTree className="w-4 h-4 text-slate-400" /> 서식
                        </div>
                        <div className="p-2 hover:bg-slate-800/60 text-slate-300 rounded flex items-center gap-2 cursor-pointer whitespace-nowrap">
                          <FolderTree className="w-4 h-4 text-slate-400" /> 계약서
                        </div>
                        <div className="p-2 hover:bg-slate-800/60 text-slate-300 rounded flex items-center gap-2 cursor-pointer whitespace-nowrap">
                          <FolderTree className="w-4 h-4 text-slate-400" /> 매뉴얼
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-8 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                      <h3 className="text-sm font-bold text-white whitespace-nowrap">문서 목록</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="p-2.5 whitespace-nowrap">문서명</th>
                              <th className="p-2.5 whitespace-nowrap">파일명</th>
                              <th className="p-2.5 whitespace-nowrap">버전</th>
                              <th className="p-2.5 whitespace-nowrap">등록자</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            <tr className="hover:bg-slate-800/40">
                              <td className="p-2.5 font-bold text-white whitespace-nowrap">취업규칙</td>
                              <td className="p-2.5 font-mono text-slate-400 whitespace-nowrap">company_rule_2026.pdf</td>
                              <td className="p-2.5 font-mono text-blue-400 whitespace-nowrap">v1.0</td>
                              <td className="p-2.5 whitespace-nowrap">이정용</td>
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
                    <h2 className="text-xl font-bold text-white tracking-tight">이메일</h2>
                  </div>

                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{loggedInUser.email}</div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex gap-3">
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg whitespace-nowrap"
                      >
                        웹메일 이동
                      </a>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      )}

      {/* Leave Detail Modal (연차 사용 상세 내역 모달) */}
      {selectedEmpForLeave && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <CalendarCheck className="w-5 h-5 text-blue-500" />
                <span>{selectedEmpForLeave.name} ({selectedEmpForLeave.department} {selectedEmpForLeave.position}) 연차 상세</span>
              </div>
              <button
                onClick={() => setSelectedEmpForLeave(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[11px] text-slate-400 font-bold whitespace-nowrap">부여 연차</div>
                <div className="text-xl font-bold text-slate-200 mt-0.5">{Number(selectedEmpForLeave.grantDays || 15.0).toFixed(1)}일</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[11px] text-slate-400 font-bold whitespace-nowrap">사용 연차</div>
                <div className="text-xl font-bold text-blue-400 mt-0.5">{Number(selectedEmpForLeave.usedDays || 0).toFixed(1)}일</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[11px] text-slate-400 font-bold whitespace-nowrap">잔여 연차</div>
                <div className="text-xl font-bold text-emerald-400 mt-0.5">{Number(selectedEmpForLeave.remainDays !== undefined ? selectedEmpForLeave.remainDays : 15.0).toFixed(1)}일</div>
              </div>
            </div>

            {/* Leave Usage Table */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 whitespace-nowrap">연차 사용 내역</div>
              <div className="overflow-x-auto max-h-64 border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2.5 whitespace-nowrap">구분</th>
                      <th className="p-2.5 whitespace-nowrap">기간</th>
                      <th className="p-2.5 whitespace-nowrap text-right">차감일수</th>
                      <th className="p-2.5 whitespace-nowrap">상태</th>
                      <th className="p-2.5 whitespace-nowrap">사유</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                    {selectedEmpLeaveList.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-slate-500 font-mono">사용 내역 없음</td></tr>
                    ) : (
                      selectedEmpLeaveList.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-800/40">
                          <td className="p-2.5 font-sans font-semibold text-white whitespace-nowrap">{l.leaveType}</td>
                          <td className="p-2.5 whitespace-nowrap">{l.startDate} ~ {l.endDate}</td>
                          <td className="p-2.5 text-right font-bold text-blue-400 whitespace-nowrap">{Number(l.deducted).toFixed(1)}일</td>
                          <td className="p-2.5 font-sans whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              l.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : l.status === 'REJECTED' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {l.status === 'APPROVED' ? '승인' : l.status === 'REJECTED' ? '반려' : '대기'}
                            </span>
                          </td>
                          <td className="p-2.5 font-sans text-slate-300">{l.reason}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedEmpForLeave(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                닫기
              </button>
            </div>
          </div>
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
                <h3 className="text-base font-bold text-white">변경 완료</h3>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
                    현재 비밀번호
                  </label>
                  <input
                    type="password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    required
                    placeholder="현재 비밀번호"
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
                    placeholder="새 비밀번호"
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
                    placeholder="새 비밀번호 확인"
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
                    className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-colors whitespace-nowrap"
                  >
                    변경
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* New Employee Modal */}
      {showNewEmpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <UserPlus className="w-5 h-5 text-blue-500" />
                <span>사원 등록</span>
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
                    placeholder="사번"
                    value={newEmpNo}
                    onChange={(e) => setNewEmpNo(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">아이디</label>
                  <input
                    type="text"
                    required
                    placeholder="아이디"
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
                    placeholder="성명"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">부여 연차</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="15.0"
                    value={newEmpGrantDays}
                    onChange={(e) => setNewEmpGrantDays(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">권한</label>
                  <select
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                  >
                    <option value="USER">USER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">부서</label>
                  <input
                    type="text"
                    placeholder="부서"
                    value={newEmpDept}
                    onChange={(e) => setNewEmpDept(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">직책</label>
                  <input
                    type="text"
                    placeholder="직책"
                    value={newEmpPos}
                    onChange={(e) => setNewEmpPos(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">이메일</label>
                  <input
                    type="email"
                    placeholder="이메일"
                    value={newEmpEmail}
                    onChange={(e) => setNewEmpEmail(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEmpModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors whitespace-nowrap"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-colors whitespace-nowrap"
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}