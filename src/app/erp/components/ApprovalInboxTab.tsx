"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckSquare, Check, X, Clock, FileText, AlertCircle, 
  RefreshCw, User, Calendar, ShieldCheck, ChevronRight
} from "lucide-react";
import { formatErpNumber } from "@/lib/erpFormat";

interface ApprovalStep {
  stepId: number;
  stepOrder: number;
  approverId: number;
  approverName: string;
  approverDuty?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comment?: string | null;
  actedAt?: string | null;
}

interface ApprovalRequest {
  id: number;
  ruleId: number;
  eventType: string;
  eventName: string;
  category: string;
  requiredTier: number;
  targetTable: string | null;
  targetId: number | null;
  requesterId: number;
  requesterName: string;
  requesterDept: string;
  requesterDuty?: string;
  title: string;
  payload: any;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  steps: ApprovalStep[];
}

export const ApprovalInboxTab: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.loginId === "admin";
  const currentUserId = currentUser?.id;

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [loading, setLoading] = useState(false);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [targetRejectReq, setTargetRejectReq] = useState<ApprovalRequest | null>(null);

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchInbox = async () => {
    setLoading(true);
    try {
      let url = `/api/erp/approvals?status=${statusFilter}`;
      if (!isAdmin && currentUserId) {
        url += `&userId=${currentUserId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "결재함 조회 실패");

      const list = data.requests || [];
      setRequests(list);
      if (list.length > 0) {
        setSelectedRequest(list[0]);
      } else {
        setSelectedRequest(null);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [statusFilter]);

  const handleApprove = async (req: ApprovalRequest) => {
    if (!confirm(`[${req.title}] 결재를 최종 승인하시겠습니까?`)) return;
    try {
      const res = await fetch("/api/erp/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: req.id,
          action: "APPROVE",
          approverId: currentUserId || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "결재 승인 실패");

      showToast("결재가 승인되었습니다.");
      fetchInbox();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleReject = async () => {
    if (!targetRejectReq) return;
    if (!rejectComment.trim()) {
      showToast("반려 사유를 입력해주세요.", "error");
      return;
    }
    try {
      const res = await fetch("/api/erp/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: targetRejectReq.id,
          action: "REJECT",
          approverId: currentUserId || 1,
          comment: rejectComment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "결재 반려 실패");

      showToast("결재가 반려 처리되었습니다.");
      setRejectModalOpen(false);
      setRejectComment("");
      fetchInbox();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-xs font-bold border ${
            toastMessage.type === "success"
              ? "bg-[#ecfdf5] border-[#047857] text-[#065f46]"
              : "bg-[#fef2f2] border-[#dc2626] text-[#b91c1c]"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Top Header */}
      <div className="p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#dcd4c4] p-1 rounded border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700">
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-3 py-1 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                statusFilter === "PENDING"
                  ? "bg-[#b45309] text-white shadow-xs"
                  : "text-[#334155] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>결재 대기</span>
            </button>
            <button
              onClick={() => setStatusFilter("APPROVED")}
              className={`px-3 py-1 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                statusFilter === "APPROVED"
                  ? "bg-[#047857] text-white shadow-xs"
                  : "text-[#334155] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>승인 완료</span>
            </button>
            <button
              onClick={() => setStatusFilter("REJECTED")}
              className={`px-3 py-1 text-xs font-bold rounded transition flex items-center gap-1.5 ${
                statusFilter === "REJECTED"
                  ? "bg-[#dc2626] text-white shadow-xs"
                  : "text-[#334155] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <X className="w-3.5 h-3.5" />
              <span>반려</span>
            </button>
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 text-xs font-bold rounded transition ${
                statusFilter === "ALL"
                  ? "bg-[#504a3f] text-white shadow-xs"
                  : "text-[#334155] hover:text-[#0f172a] dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              전체
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInbox}
            disabled={loading}
            className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Dossier Split View (헌장 3.6 유형 A - 모바일 스크롤 및 PC 2단 분할 지원) */}
      <div className="flex-1 grid grid-cols-12 gap-3 md:gap-4 p-3 md:p-4 overflow-y-auto md:overflow-hidden">
        {/* Left: Request Dossier List (5 cols) */}
        <div className="col-span-12 md:col-span-5 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col max-h-[260px] md:max-h-none overflow-hidden dark:bg-slate-900 dark:border-slate-800 shrink-0">
          <div className="p-2.5 bg-[#e2dbcd] border-b border-[#b5a894] text-xs font-bold text-[#0f172a] flex items-center justify-between dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300">
            <span>결재 대기 및 진행 문서 ({formatErpNumber(requests.length)}건)</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#c4b6a0] dark:divide-slate-800">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-[#475569] text-xs dark:text-slate-500">
                결재할 문서가 없습니다.
              </div>
            ) : (
              requests.map((req) => (
                <button
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className={`w-full p-3 text-left transition flex flex-col gap-1.5 ${
                    selectedRequest?.id === req.id
                      ? "bg-[#dbeafe] border-l-4 border-[#1d4ed8]"
                      : "hover:bg-[#ede6d6] dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#dcd4c4] text-[#1e40af] border border-[#b5a894] dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700">
                      {req.eventName} ({req.category})
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        req.status === "PENDING"
                          ? "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                          : req.status === "APPROVED"
                          ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
                          : "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]"
                      }`}
                    >
                      {req.status === "PENDING" ? "결재대기" : req.status === "APPROVED" ? "승인완료" : "반려"}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-[#0f172a] dark:text-slate-100 line-clamp-1">
                    {req.title}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-[#475569] dark:text-slate-400">
                    <span>
                      기안: <span className="text-[#0f172a] font-semibold dark:text-slate-200">{req.requesterName}</span> ({req.requesterDept})
                    </span>
                    <span className="font-mono text-[10px] text-[#475569] dark:text-slate-500">
                      {req.createdAt ? req.createdAt.substring(0, 10) : ""}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Request Detail & Action Studio (7 cols) */}
        <div className="col-span-12 md:col-span-7 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          {selectedRequest ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 bg-[#e2dbcd] border-b border-[#b5a894] flex items-center justify-between dark:bg-slate-800/60 dark:border-slate-700">
                <div>
                  <span className="text-[11px] font-mono text-[#1d4ed8] dark:text-blue-400 font-bold">
                    결재번호 #{selectedRequest.id}
                  </span>
                  <h3 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 mt-0.5">
                    {selectedRequest.title}
                  </h3>
                </div>

                {selectedRequest.status === "PENDING" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTargetRejectReq(selectedRequest);
                        setRejectComment("");
                        setRejectModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#fef2f2] hover:bg-[#fee2e2] text-[#991b1b] text-xs font-bold rounded border border-[#fecaca] transition"
                    >
                      반려
                    </button>
                    <button
                      onClick={() => handleApprove(selectedRequest)}
                      className="px-4 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded flex items-center gap-1 shadow transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>원클릭 승인</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 1. 기안자 및 결재선 요약 */}
                <div className="grid grid-cols-2 gap-3 bg-[#f4efe4] p-3 rounded border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] text-[#475569] dark:text-slate-400 font-semibold block">기안자 정보</span>
                    <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
                      {selectedRequest.requesterName} ({selectedRequest.requesterDept} {selectedRequest.requesterDuty || ""})
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#475569] dark:text-slate-400 font-semibold block">기안 일시</span>
                    <span className="text-xs font-mono text-[#0f172a] dark:text-slate-300">
                      {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleString("ko-KR") : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#475569] dark:text-slate-400 font-semibold block">결재 규칙</span>
                    <span className="text-xs font-semibold text-[#1d4ed8] dark:text-blue-400">
                      {selectedRequest.eventName} (최소 필요 결재: Tier {selectedRequest.requiredTier})
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#475569] dark:text-slate-400 font-semibold block">최종 상태</span>
                    <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
                      {selectedRequest.status === "PENDING" ? "진행중 (결재대기)" : selectedRequest.status === "APPROVED" ? "승인 완료" : "반려"}
                    </span>
                  </div>
                </div>

                {/* 2. 결재 상세 내용 (Payload) */}
                <div className="bg-[#f4efe4] p-3.5 rounded border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-[#0f172a] dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400" />
                    <span>신청 상세 내역</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    {selectedRequest.payload ? (
                      Object.entries(selectedRequest.payload).map(([k, v]) => (
                        <div key={k} className="flex items-start justify-between py-1 border-b border-[#c4b6a0] dark:border-slate-800/80">
                          <span className="text-[#475569] dark:text-slate-400 font-medium">{k}</span>
                          <span className="text-[#0f172a] dark:text-slate-200 font-semibold text-right max-w-xs break-all">
                            {typeof v === "object" ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[#475569]">추가 상세 데이터가 없습니다.</p>
                    )}
                  </div>
                </div>

                {/* 3. 결재선 단계 (Approval Steps) */}
                <div className="bg-[#f4efe4] p-3.5 rounded border border-[#b5a894] dark:bg-slate-900 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-[#0f172a] dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#047857] dark:text-emerald-400" />
                    <span>결재 진행 이력</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedRequest.steps && selectedRequest.steps.length > 0 ? (
                      selectedRequest.steps.map((st, idx) => (
                        <div
                          key={st.stepId || idx}
                          className="p-2.5 bg-[#ebe5d8] rounded border border-[#b5a894] flex items-center justify-between dark:bg-slate-900 dark:border-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#dcd4c4] text-[10px] font-bold flex items-center justify-center text-[#0f172a] dark:bg-slate-800 dark:text-slate-300">
                              {st.stepOrder}
                            </span>
                            <div>
                              <span className="text-xs font-bold text-[#0f172a] dark:text-slate-200">
                                {st.approverName} {st.approverDuty ? `(${st.approverDuty})` : ""}
                              </span>
                              {st.comment && (
                                <p className="text-[11px] text-[#475569] dark:text-slate-400 mt-0.5">
                                  의견: {st.comment}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                st.status === "PENDING"
                                  ? "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                                  : st.status === "APPROVED"
                                  ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
                                  : "bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]"
                              }`}
                            >
                              {st.status}
                            </span>
                            {st.actedAt && (
                              <span className="block text-[10px] font-mono text-[#475569] dark:text-slate-500 mt-0.5">
                                {new Date(st.actedAt).toLocaleString("ko-KR")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#475569]">배정된 결재 단계가 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[#475569] text-xs">
              왼쪽 목록에서 결재 문서를 선택하세요.
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] border-2 border-[#b5a894] rounded-lg p-5 w-full max-w-md shadow-2xl dark:bg-slate-900 dark:border-slate-800">
            <h2 className="text-sm font-bold text-[#b91c1c] mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>결재 반려 처리</span>
            </h2>
            <p className="text-xs text-[#475569] mb-4">
              [{targetRejectReq?.title}] 문서를 반려합니다. 반려 사유를 명확히 작성해주세요.
            </p>

            <div className="flex flex-col gap-1 mb-4">
              <label className="text-xs text-[#334155] font-semibold">반려 사유 (필수)</label>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="예: 일정 중복으로 인한 반려, 재상신 요망"
                rows={3}
                className="bg-[#f4efe4] border border-[#b5a894] text-xs text-[#0f172a] px-3 py-2 rounded focus:outline-none focus:border-[#dc2626] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#0f172a] bg-[#dcd4c4] hover:bg-[#d0c6b4] rounded border border-[#b5a894] dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#dc2626] hover:bg-[#b91c1c] rounded shadow"
              >
                반려 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
