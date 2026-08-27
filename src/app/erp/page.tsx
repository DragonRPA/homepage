"use client";

import React, { useState } from "react";
import { 
  Bot, Lock, User, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, 
  KeyRound, X, LogOut, LayoutDashboard, TrendingUp, ShoppingCart, 
  CalendarCheck, FolderTree, Package, Layers, Mail, Plus, Search, 
  Download, FileSpreadsheet, Check, Eye, Trash2, Clock
} from "lucide-react";

export default function ErpPortalPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  // Active Sidebar Menu Tab
  const [activeTab, setActiveTab] = useState<
    "management" | "sales" | "purchase" | "attendance" | "assets" | "consumables" | "files" | "email"
  >("attendance");

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdChangeError, setPwdChangeError] = useState("");
  const [pwdChangeSuccess, setPwdChangeSuccess] = useState(false);

  // In-memory User Store
  const [userStore, setUserStore] = useState<Record<string, any>>({
    admin: {
      id: 1,
      name: "이정용",
      employeeNo: "DR-001",
      position: "대표이사",
      department: "경영총괄",
      role: "SUPER_ADMIN",
      roleTitle: "운영자",
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
      roleTitle: "관리자",
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
      roleTitle: "관리자",
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
      roleTitle: "일반사용자",
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
      roleTitle: "일반사용자",
      email: "admin@dragonrpa.co.kr",
      password: "1111",
      mustChangePassword: true,
    },
  });

  // Mock State: Attendance / Leave Requests
  const [leaveRequests, setLeaveRequests] = useState<any[]>([
    {
      id: 1,
      empName: "최개발",
      empDept: "기술개발부",
      leaveType: "ANNUAL",
      leaveTypeName: "연차",
      startDate: "2026-09-01",
      endDate: "2026-09-03",
      workingDays: 3.0,
      deducted: 3.0,
      reason: "하계 휴가",
      status: "PENDING",
      approver: "김영업 팀장",
    },
    {
      id: 2,
      empName: "김영업",
      empDept: "영업부",
      leaveType: "AM_HALF",
      leaveTypeName: "오전반차",
      startDate: "2026-08-28",
      endDate: "2026-08-28",
      workingDays: 0.5,
      deducted: 0.5,
      reason: "개인 용무",
      status: "APPROVED",
      approver: "이정용 대표이사",
    },
  ]);

  // Mock State: Overtimes (Self Entry)
  const [overtimes, setOvertimes] = useState<any[]>([
    {
      id: 1,
      empName: "최개발",
      workDate: "2026-08-26",
      workType: "EXTENDED",
      workTypeName: "연장근무",
      startTime: "18:00",
      endTime: "21:30",
      hours: 3.5,
      details: "RPA 파이프라인 Open API 연동 모듈 배포 및 테스트",
    },
  ]);

  // Mock State: Assets
  const [assets, setAssets] = useState<any[]>([
    { code: "EQ-2026-001", name: "고소작업대 12M", model: "SJ-3219", status: "RENTED", statusName: "대여중", location: "서울 강남구 역삼 현장", price: "24,000,000" },
    { code: "EQ-2026-002", name: "궤도 크레인 5T", model: "CR-500", status: "AVAILABLE", statusName: "임대가능", location: "화성 제1주기장", price: "45,000,000" },
    { code: "EQ-2026-003", name: "고소작업대 15M", model: "SJ-4632", status: "PENDING_OUT", statusName: "출고대기", location: "화성 제2주기장", price: "32,000,000" },
    { code: "EQ-2026-004", name: "전동 지게차 3T", model: "FB-30", status: "REPAIR", statusName: "수리중", location: "정비공장", price: "18,000,000" },
  ]);

  // Mock State: Consumables
  const [consumables, setConsumables] = useState<any[]>([
    { code: "CS-001", name: "유압유 (ISO VG 46)", spec: "20L 말통", unit: "CAN", stock: 14, safety: 5, unitPrice: "85,000" },
    { code: "CS-002", name: "안전벨트 및 랜야드", spec: "KS 2종 세트", unit: "EA", stock: 2, safety: 4, unitPrice: "45,000", alert: true },
    { code: "CS-003", name: "배터리 단자 보호캡", spec: "대형 24V용", unit: "SET", stock: 25, safety: 10, unitPrice: "12,000" },
  ]);

  // Mock State: Sales Invoices
  const [salesInvoices, setSalesInvoices] = useState<any[]>([
    { no: "INV-2026-001", client: "(주)대한건설", bizNo: "105-86-12345", date: "2026-08-25", supply: "3,500,000", tax: "350,000", total: "3,850,000", taxStatus: "발행대기" },
    { no: "INV-2026-002", client: "(유)한국인프라", bizNo: "214-81-67890", date: "2026-08-26", supply: "5,000,000", tax: "500,000", total: "5,500,000", taxStatus: "국세청 전송완료" },
  ]);

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
    }, 1000);
  };

  // Submit Leave
  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveReason) {
      alert("휴가 사유를 입력해 주십시오.");
      return;
    }

    let days = 1.0;
    if (newLeaveType === "AM_HALF" || newLeaveType === "PM_HALF") days = 0.5;
    if (newLeaveType === "QUARTER") days = 0.25;

    const isDeductible = ["ANNUAL", "AM_HALF", "PM_HALF", "QUARTER"].includes(newLeaveType);

    const newReq = {
      id: leaveRequests.length + 1,
      empName: loggedInUser.name,
      empDept: loggedInUser.department,
      leaveType: newLeaveType,
      leaveTypeName: newLeaveType === "ANNUAL" ? "연차" : newLeaveType === "AM_HALF" ? "오전반차" : newLeaveType === "PM_HALF" ? "오후반차" : newLeaveType === "SICK" ? "병가" : "공가/경조",
      startDate: newLeaveStart,
      endDate: newLeaveEnd,
      workingDays: days,
      deducted: isDeductible ? days : 0.0,
      reason: newLeaveReason,
      status: "PENDING",
      approver: loggedInUser.role === "USER" ? "김영업 팀장" : "이정용 대표이사",
    };

    setLeaveRequests([newReq, ...leaveRequests]);
    setNewLeaveReason("");
    alert("휴가 신청이 정상 상신되었습니다 (결재 대기).");
  };

  // Submit Overtime
  const handleAddOvertime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOtDetails) {
      alert("업무 내용을 입력해 주십시오.");
      return;
    }

    const newOt = {
      id: overtimes.length + 1,
      empName: loggedInUser.name,
      workDate: newOtDate,
      workType: "EXTENDED",
      workTypeName: "연장근무",
      startTime: newOtStart,
      endTime: newOtEnd,
      hours: 2.5,
      details: newOtDetails,
    };

    setOvertimes([newOt, ...overtimes]);
    setNewOtDetails("");
    alert("초과근무 내역이 자율 등록되었습니다 (결재 불필요).");
  };

  // Approve Leave
  const handleApproveLeave = (id: number) => {
    setLeaveRequests(
      leaveRequests.map((l) => (l.id === id ? { ...l, status: "APPROVED" } : l))
    );
  };

  // Reject Leave
  const handleRejectLeave = (id: number) => {
    setLeaveRequests(
      leaveRequests.map((l) => (l.id === id ? { ...l, status: "REJECTED" } : l))
    );
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
                  사내 통합 기간계 포털
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
                      placeholder="아이디 입력 (admin, sales_mgr, dev_user)"
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
                  {loading ? <span>보안 인증 중...</span> : <><span>시스템 로그인</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5 font-mono">
                <div className="font-bold text-slate-400 uppercase tracking-wider">발급 계정 (초기 비번 1111):</div>
                <div className="flex justify-between"><span>• 운영자(대표):</span><span className="text-blue-400 font-bold">admin</span></div>
                <div className="flex justify-between"><span>• 관리자(영업/자산):</span><span className="text-cyan-400 font-bold">sales_mgr / asset_mgr</span></div>
                <div className="flex justify-between"><span>• 일반유저:</span><span className="text-emerald-400 font-bold">dev_user / admin_user</span></div>
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
                    {loggedInUser.roleTitle}
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
                      onClick={() => setActiveTab(item.id as any)}
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
              <span>SSOT v1.4</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Neon DB 연결됨
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

              {/* 1. 경영관리 TAB */}
              {activeTab === "management" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">경영관리 (운영자 전용)</h2>
                    <p className="text-xs text-slate-400 mt-1">임직원 계정 발급, 권한 통제 및 전사 결재 현황을 총괄 관리합니다.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs text-slate-400 font-bold">총 임직원 계정</div>
                      <div className="text-2xl font-bold text-white">5명</div>
                      <div className="text-[11px] text-blue-400">운영자 1 / 관리자 2 / 유저 2</div>
                    </div>
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs text-slate-400 font-bold">결재 대기 건수</div>
                      <div className="text-2xl font-bold text-amber-400">{leaveRequests.filter(l => l.status === 'PENDING').length}건</div>
                      <div className="text-[11px] text-slate-400">관리자 연차 상신 포함</div>
                    </div>
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs text-slate-400 font-bold">DB 스토리지 상태</div>
                      <div className="text-2xl font-bold text-emerald-400">정상 (Neon + R2)</div>
                      <div className="text-[11px] text-slate-400">14개 테이블 SSOT 동기화</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">임직원 계정 및 권한 대장</h3>
                      <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> 계정 신규 발급
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
                          {Object.values(userStore).map((u: any) => (
                            <tr key={u.id} className="hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-white">{u.employeeNo}</td>
                              <td className="p-3 font-sans font-semibold text-white">{u.name}</td>
                              <td className="p-3 text-blue-400 font-bold">{u.id === 1 ? 'admin' : u.id === 2 ? 'sales_mgr' : u.id === 3 ? 'asset_mgr' : u.id === 4 ? 'dev_user' : 'admin_user'}</td>
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
                                <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans">
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
                    <h3 className="text-sm font-bold text-white">매출 전표 목록</h3>
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
                          {salesInvoices.map((inv) => (
                            <tr key={inv.no} className="hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-blue-400">{inv.no}</td>
                              <td className="p-3 font-sans font-semibold text-white">{inv.client}</td>
                              <td className="p-3">{inv.bizNo}</td>
                              <td className="p-3">{inv.date}</td>
                              <td className="p-3 text-right">{inv.supply}원</td>
                              <td className="p-3 text-right">{inv.tax}원</td>
                              <td className="p-3 text-right font-bold text-white">{inv.total}원</td>
                              <td className="p-3 font-sans">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  inv.taxStatus === '국세청 전송완료' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}>
                                  {inv.taxStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
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
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">매입 전표 목록</h3>
                      <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> 매입 전표 등록
                      </button>
                    </div>

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

              {/* 4. 근태관리 TAB */}
              {activeTab === "attendance" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">근태관리 (휴가결재 & 초과근무)</h2>
                    <p className="text-xs text-slate-400 mt-1">근로기준법 12대 휴가 신청(주말/공휴일 자동공제 2단계 결재선)과 결재 없는 자율 초과근무를 기록합니다.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-xs text-slate-400">총 연차</div>
                      <div className="text-2xl font-bold text-white mt-1">15.0일</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-xs text-slate-400">사용 연차</div>
                      <div className="text-2xl font-bold text-blue-400 mt-1">0.5일</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-xs text-slate-400">잔여 연차</div>
                      <div className="text-2xl font-bold text-emerald-400 mt-1">14.5일</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-xs text-slate-400">이달 자율 초과근무</div>
                      <div className="text-2xl font-bold text-cyan-400 mt-1">3.5시간</div>
                    </div>
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
                          결재 상신하기
                        </button>
                      </form>
                    </div>

                    <div className="lg:col-span-7 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">휴가 결재 및 승인 내역</h3>
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
                              <th className="p-2.5 whitespace-nowrap">결재권자</th>
                              <th className="p-2.5 whitespace-nowrap">상태</th>
                              <th className="p-2.5 whitespace-nowrap">결재 액션</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {leaveRequests.map((req) => (
                              <tr key={req.id} className="hover:bg-slate-800/40">
                                <td className="p-2.5 font-bold text-white whitespace-nowrap">{req.empName}</td>
                                <td className="p-2.5 whitespace-nowrap">{req.leaveTypeName}</td>
                                <td className="p-2.5 font-mono text-[11px] whitespace-nowrap">{req.startDate} ~ {req.endDate}</td>
                                <td className="p-2.5 font-mono whitespace-nowrap">{req.deducted}일</td>
                                <td className="p-2.5 text-slate-400 whitespace-nowrap">{req.approver}</td>
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
                                        onClick={() => handleApproveLeave(req.id)}
                                        className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-bold"
                                      >
                                        승인
                                      </button>
                                      <button
                                        onClick={() => handleRejectLeave(req.id)}
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
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-cyan-400" /> 자율 초과근무 기록 대장 (결재 불필요)
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">승인 절차 없이 임직원 스스로 연장/야간 근무 내역을 자유롭게 입력합니다.</p>
                      </div>
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
                          자율 등록
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
                          {overtimes.map((ot) => (
                            <tr key={ot.id} className="hover:bg-slate-800/40">
                              <td className="p-2.5 font-sans font-bold text-white">{ot.empName}</td>
                              <td className="p-2.5">{ot.workDate}</td>
                              <td className="p-2.5 font-sans"><span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">{ot.workTypeName}</span></td>
                              <td className="p-2.5">{ot.startTime} ~ {ot.endTime}</td>
                              <td className="p-2.5 font-bold text-cyan-400">{ot.hours}시간</td>
                              <td className="p-2.5 font-sans text-slate-300">{ot.details}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. 자산재고관리 TAB */}
              {activeTab === "assets" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">자산재고관리 (렌탈 자산 & 배차)</h2>
                      <p className="text-xs text-slate-400 mt-1">출고 검수 승인 마감 시 RENTED(대여중) 자동 전환 및 단일 EXCHANGE 배차를 관리합니다.</p>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md">
                      <Plus className="w-4 h-4" /> 신규 자산 등록
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-xs text-slate-400 font-bold">임대 가능 (가용)</div>
                      <div className="text-2xl font-bold text-emerald-400 mt-1">1대</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-xs text-slate-400 font-bold">출고 대기</div>
                      <div className="text-2xl font-bold text-amber-400 mt-1">1대</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-xs text-slate-400 font-bold">현장 대여중 (RENTED)</div>
                      <div className="text-2xl font-bold text-blue-400 mt-1">1대</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-xs text-slate-400 font-bold">정비 / 수리중</div>
                      <div className="text-2xl font-bold text-red-400 mt-1">1대</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">보유 렌탈 자산 마스터</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3 whitespace-nowrap">자산번호</th>
                            <th className="p-3 whitespace-nowrap">장비명</th>
                            <th className="p-3 whitespace-nowrap">모델명</th>
                            <th className="p-3 whitespace-nowrap">상태 (라이프사이클)</th>
                            <th className="p-3 whitespace-nowrap">현재 위치 / 현장</th>
                            <th className="p-3 whitespace-nowrap">취득가액</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {assets.map((ast) => (
                            <tr key={ast.code} className="hover:bg-slate-800/40">
                              <td className="p-3 font-mono font-bold text-blue-400">{ast.code}</td>
                              <td className="p-3 font-semibold text-white">{ast.name}</td>
                              <td className="p-3 font-mono">{ast.model}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  ast.status === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : ast.status === 'RENTED' ? 'bg-blue-950 text-blue-300 border-blue-800' : ast.status === 'PENDING_OUT' ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-red-950 text-red-300 border-red-800'
                                }`}>
                                  {ast.statusName}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300">{ast.location}</td>
                              <td className="p-3 font-mono text-right">{ast.price}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. 소모품재고관리 TAB */}
              {activeTab === "consumables" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">소모품재고관리</h2>
                      <p className="text-xs text-slate-400 mt-1">부품/소모품 입고, 현장 지급(출고) 및 실시간 적정 안전재고를 관리합니다.</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg">
                        + 입고 등록
                      </button>
                      <button className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg">
                        - 출고(지급) 등록
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">소모품 품목 대장</h3>
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
                            <th className="p-3 whitespace-nowrap">상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          {consumables.map((c) => (
                            <tr key={c.code} className="hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-cyan-400">{c.code}</td>
                              <td className="p-3 font-sans font-semibold text-white">{c.name}</td>
                              <td className="p-3 font-sans">{c.spec}</td>
                              <td className="p-3">{c.unit}</td>
                              <td className={`p-3 font-bold ${c.alert ? 'text-red-400 font-extrabold' : 'text-emerald-400'}`}>{c.stock}</td>
                              <td className="p-3 text-slate-400">{c.safety}</td>
                              <td className="p-3 text-right">{c.unitPrice}원</td>
                              <td className="p-3 font-sans">
                                {c.alert ? (
                                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold">재고부족</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">적정</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. 파일관리 TAB */}
              {activeTab === "files" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">파일관리 (사내문서함 EDMS)</h2>
                      <p className="text-xs text-slate-400 mt-1">Cloudflare R2 버킷(`dragonrpa-erp`) 기반 트리형 표준 사내 문서함입니다.</p>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
                      <Plus className="w-4 h-4" /> 문서 업로드
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-4 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="text-xs font-bold text-slate-400 uppercase">폴더 트리 구조</div>
                      <div className="space-y-1 text-xs font-sans">
                        <div className="p-2 rounded bg-slate-800 text-blue-400 font-bold flex items-center gap-2 cursor-pointer">
                          <FolderTree className="w-4 h-4" /> 01. 사규 및 회사 규정
                        </div>
                        <div className="pl-6 space-y-1 text-slate-300">
                          <div className="p-1.5 hover:bg-slate-800/60 rounded cursor-pointer">├─ 인사/근태 규정</div>
                          <div className="p-1.5 hover:bg-slate-800/60 rounded cursor-pointer">└─ 정보보호 수칙</div>
                        </div>

                        <div className="p-2 hover:bg-slate-800/60 text-slate-300 rounded flex items-center gap-2 cursor-pointer mt-2">
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
                        <h3 className="text-sm font-bold text-white">01. 사규 및 회사 규정 &gt; 인사/근태 규정</h3>
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
                    <p className="text-xs text-slate-400 mt-1">임직원 5인 전용 회사 이메일 계정 및 라우팅 상태를 확인합니다.</p>
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
                <p className="text-xs text-slate-400">다음 로그인부터 새로운 비밀번호를 사용해 주십시오.</p>
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
    </div>
  );
}