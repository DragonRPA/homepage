"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import type { Department, UserNode } from "./organizationTypes";

export interface OrgAuditSummary {
  totalUsersCount: number;
  activeUsersCount: number;
  leaveUsersCount: number;
  retiredUsersCount: number;
  totalDeptsCount: number;
  assignedUsersCount: number;
  unassignedUsersCount: number;
  userBalanceDiff: number;
}

export interface OrgActionModalsAndAuditBarProps {
  auditSummary: OrgAuditSummary;
  confirmDeleteDept: () => Promise<void>;
  confirmRetirement: () => Promise<void>;
  deptToDelete: Department | null;
  errorModal: { title: string; message: string } | null;
  setDeptToDelete: React.Dispatch<React.SetStateAction<Department | null>>;
  setErrorModal: React.Dispatch<React.SetStateAction<{ title: string; message: string } | null>>;
  setShowHandoffModal: React.Dispatch<React.SetStateAction<UserNode | null>>;
  showHandoffModal: UserNode | null;
  toastMessage: { type: "success" | "error" | "warning"; text: string } | null;
}

const MODAL_OVERLAY_STYLE: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const OrgActionModalsAndAuditBar: React.FC<OrgActionModalsAndAuditBarProps> = ({
  auditSummary,
  confirmDeleteDept,
  confirmRetirement,
  deptToDelete,
  errorModal,
  setDeptToDelete,
  setErrorModal,
  setShowHandoffModal,
  showHandoffModal,
  toastMessage,
}) => {
  const {
    totalUsersCount,
    activeUsersCount,
    leaveUsersCount,
    retiredUsersCount,
    totalDeptsCount,
    assignedUsersCount,
    unassignedUsersCount,
    userBalanceDiff,
  } = auditSummary;

  return (
    <>
      {/* Hand-off Alert Modal for Retirement (퇴사 처리 및 업무 이관) */}
      {showHandoffModal && (
        <div style={{ ...MODAL_OVERLAY_STYLE, zIndex: 100 }}>
          <div className="card" style={{ width: "450px", padding: "24px" }}>
            <div style={{ display: "flex", gap: "12px", color: "var(--danger)", marginBottom: "16px" }}>
              <AlertCircle size={28} />
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginTop: "2px" }}>
                퇴사 처리 및 업무 이관
              </h3>
            </div>

            <p style={{ fontSize: "14px", color: "var(--text-main)", lineHeight: "1.5" }}>
              <strong>{showHandoffModal.name}</strong> 직원을 &apos;퇴사&apos; 상태로 변경하시겠습니까?
              <br />
              <br />
              현재 이 직원이 담당하고 있는{" "}
              <span style={{ color: "var(--danger)", fontWeight: "bold" }}>
                진행 중인 미결 업무가 발견
              </span>
              되었습니다.
              <br />
              퇴사 처리 시 해당 미결 업무는 직속 상급자(부서장)에게 강제 이관됩니다.
            </p>

            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                퇴사일 지정
              </label>
              <input
                type="date"
                style={{ padding: "6px 10px", fontSize: "13px", borderRadius: "4px", width: "100%" }}
                value={showHandoffModal.leaveDate || new Date().toISOString().substring(0, 10)}
                onChange={(e) =>
                  setShowHandoffModal((prev) => (prev ? { ...prev, leaveDate: e.target.value } : null))
                }
              />
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                className="btn-secondary"
                style={{ padding: "8px 14px" }}
                onClick={() => setShowHandoffModal(null)}
              >
                취소
              </button>
              <button
                data-hs-trigger="Confirm"
                className="btn-primary"
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--danger)",
                  borderColor: "var(--danger)",
                }}
                onClick={confirmRetirement}
              >
                확인 및 이관 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 부서 삭제 확인 모달 (헌장 5.2: 브라우저 confirm 전면 퇴출) */}
      {deptToDelete && (
        <div style={{ ...MODAL_OVERLAY_STYLE, zIndex: 100 }}>
          <div className="card" style={{ width: "420px", padding: "24px" }}>
            <div style={{ display: "flex", gap: "12px", color: "var(--danger)", marginBottom: "16px" }}>
              <AlertCircle size={28} />
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginTop: "2px" }}>부서 삭제 확인</h3>
            </div>

            <p style={{ fontSize: "14px", color: "var(--text-main)", lineHeight: "1.5" }}>
              부서 <strong>[{deptToDelete.name || deptToDelete.id}]</strong>을(를) 정말 삭제하시겠습니까?
              <br />
              현재 소속된 직원 및 하위 부서가 없으므로 안전하게 삭제됩니다.
            </p>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                className="btn-secondary"
                style={{ padding: "8px 14px" }}
                onClick={() => setDeptToDelete(null)}
              >
                취소
              </button>
              <button
                data-hs-trigger="Delete"
                className="btn-primary"
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--danger)",
                  borderColor: "var(--danger)",
                }}
                onClick={confirmDeleteDept}
              >
                부서 삭제 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 오류 안내 모달 (헌장 5.2) */}
      {errorModal && (
        <div style={{ ...MODAL_OVERLAY_STYLE, zIndex: 110 }}>
          <div className="card" style={{ width: "420px", padding: "24px" }}>
            <div style={{ display: "flex", gap: "12px", color: "var(--danger)", marginBottom: "12px" }}>
              <AlertCircle size={24} />
              <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>{errorModal.title}</h3>
            </div>
            <p
              style={{
                fontSize: "13.5px",
                color: "var(--text-main)",
                lineHeight: "1.5",
                whiteSpace: "pre-line",
              }}
            >
              {errorModal.message}
            </p>
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn-primary"
                style={{ padding: "6px 16px" }}
                onClick={() => setErrorModal(null)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚖️ 헌장 3.5 Gutenberg Z-패턴 4단계 조직/인사 대차대조 검증 바 */}
      <div
        style={{
          marginTop: 0,
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "4px",
          padding: "0 14px",
          height: "36px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "var(--text-main)" }}>
            조직 및 인사 대차대조 검증:
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            총 임직원 <strong style={{ color: "var(--text-main)" }}>{totalUsersCount}명</strong>
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>=</span>
          <span style={{ fontSize: "12px", color: "#10b981" }}>
            재직 <strong>{activeUsersCount}명</strong>
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>+</span>
          <span style={{ fontSize: "12px", color: "#f59e0b" }}>
            휴직 <strong>{leaveUsersCount}명</strong>
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>+</span>
          <span style={{ fontSize: "12px", color: "var(--danger)" }}>
            퇴사 <strong>{retiredUsersCount}명</strong>
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>|</span>
          <span style={{ fontSize: "12px", color: "var(--primary)" }}>
            부서 {totalDeptsCount}개 (배정 {assignedUsersCount}명 / 미배정 {unassignedUsersCount}명)
          </span>
        </div>
        {userBalanceDiff !== 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            <span
              style={{
                fontSize: "11px",
                padding: "3px 10px",
                borderRadius: "6px",
                fontWeight: "bold",
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
              }}
            >
              대차 차액 {userBalanceDiff}명 (불일치)
            </span>
          </div>
        )}
      </div>

      {/* 토스트 알림 팝업 (헌장 5.2) */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            padding: "12px 20px",
            borderRadius: "8px",
            backgroundColor:
              toastMessage.type === "error"
                ? "#ef4444"
                : toastMessage.type === "warning"
                ? "#f59e0b"
                : "#10b981",
            color: "#fff",
            fontWeight: 700,
            fontSize: "13px",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {toastMessage.text}
        </div>
      )}
    </>
  );
};
