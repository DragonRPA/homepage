"use client";

import React from "react";
import { Calendar, CheckCircle, Eye, EyeOff, Mail, MapPin, Phone, ShieldCheck, Upload, X } from "lucide-react";
import { getUserEffectiveTier, type ApprovalTierConfig, type Department, type UserNode } from "./organizationTypes";
import { cleanErpNumber, toErpInputString } from "@/lib/erpFormat";

export interface SelectedProfilePanelProps {
  applyProfileChanges: () => Promise<void>;
  canEdit: boolean;
  canViewPayroll: boolean;
  departments: Department[];
  dutyConfigs: ApprovalTierConfig[];
  enforceManagerPolicies: (usersList: UserNode[], deptList: Department[]) => UserNode[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStatusChange: (userId: string, newStatus: UserNode["status"]) => Promise<void>;
  handleWageInputChange: (field: "baseSalary" | "hourlyWage" | "mealAllowance" | "vehicleAllowance", rawValue: string) => void;
  isSuperAdmin: boolean;
  positionConfigs: ApprovalTierConfig[];
  selectedProfile: UserNode;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedProfile: React.Dispatch<React.SetStateAction<UserNode | null>>;
  setShowPasswordInput: React.Dispatch<React.SetStateAction<boolean>>;
  setUsers: React.Dispatch<React.SetStateAction<UserNode[]>>;
  showPasswordInput: boolean;
  showToast: (text: string, type?: "success" | "error" | "warning") => void;
  users: UserNode[];
}

export const SelectedProfilePanel: React.FC<SelectedProfilePanelProps> = ({
  applyProfileChanges,
  canEdit,
  canViewPayroll,
  departments,
  dutyConfigs,
  enforceManagerPolicies,
  fileInputRef,
  handlePhotoUpload,
  handleStatusChange,
  handleWageInputChange,
  isSuperAdmin,
  positionConfigs,
  selectedProfile,
  setIsDirty,
  setSelectedProfile,
  setShowPasswordInput,
  setUsers,
  showPasswordInput,
  showToast,
  users,
}) => {
  return (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedProfile(null)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
              zIndex: 40,
            }}
          />

          {/* Panel */}
          <div
            className="card slide-in-right"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "360px",
              margin: 0,
              borderRadius: 0,
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              borderLeft: "1px solid var(--border-color)",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "8px",
              }}
            >
              <h3 style={{ fontSize: "15px", fontWeight: "700", margin: 0 }}>상세 프로필</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {canEdit && (
                  <>
                    <button
                      className="btn-secondary"
                      style={{ padding: "4px 8px", fontSize: "12px" }}
                      onClick={() => setSelectedProfile(null)}
                    >
                      취소
                    </button>
                    <button
                      data-hs-trigger="Save"
                      className="btn-primary"
                      style={{ padding: "4px 10px", fontSize: "12px" }}
                      onClick={applyProfileChanges}
                    >
                      <CheckCircle size={13} style={{ marginRight: "3px" }} /> 저장 (적용)
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedProfile(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    padding: "4px",
                    cursor: "pointer",
                  }}
                  title="닫기"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
              {/* Profile Image Upload Area */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "var(--primary-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "var(--primary)",
                    backgroundImage: selectedProfile.profileImageUrl
                      ? `url(${selectedProfile.profileImageUrl})`
                      : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    marginBottom: "6px",
                    border: "2px solid var(--border-color)",
                  }}
                >
                  {!selectedProfile.profileImageUrl &&
                    (selectedProfile.name ? selectedProfile.name.substring(0, 1) : "신")}
                </div>
                {canEdit && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ fontSize: "11px", padding: "3px 8px" }}
                    >
                      <Upload size={12} style={{ marginRight: "4px" }} /> 사진 변경
                    </button>
                  </>
                )}
              </div>

              {/* Form Fields (헌장 3.4 상하 스택 배치 원칙) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ color: "var(--primary)", fontWeight: "bold", fontSize: "12px" }}>
                      로그인 아이디
                    </label>
                    <input
                      type="text"
                      style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                      placeholder="시스템 로그인 ID"
                      value={selectedProfile.loginId || ""}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, loginId: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <label style={{ color: "var(--primary)", fontWeight: "bold", fontSize: "12px" }}>
                        비밀번호 변경
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPasswordInput((prev) => !prev)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        {showPasswordInput ? <EyeOff size={12} /> : <Eye size={12} />}
                        {showPasswordInput ? "숨기기" : "입력보기"}
                      </button>
                    </div>
                    <input
                      type={showPasswordInput ? "text" : "password"}
                      style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                      placeholder="변경 시 입력 (기본: 1111)"
                      value={
                        selectedProfile.passwordHash?.startsWith("__HASHED__")
                          ? ""
                          : selectedProfile.passwordHash || ""
                      }
                      onChange={(e) =>
                        setSelectedProfile({ ...selectedProfile, passwordHash: e.target.value })
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600 }}>이름</label>
                    <input
                      type="text"
                      style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                      placeholder="이름 입력 (예: 홍길동)"
                      value={selectedProfile.name}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, name: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600 }}>상태</label>
                    <select
                      value={selectedProfile.status}
                      onChange={(e) =>
                        handleStatusChange(selectedProfile.id, e.target.value as UserNode["status"])
                      }
                      disabled={!canEdit}
                      style={{
                        padding: "5px 8px",
                        fontSize: "12px",
                        borderRadius: "4px",
                        width: "100%",
                        color:
                          selectedProfile.status === "ACTIVE"
                            ? "var(--success)"
                            : selectedProfile.status === "RETIRED"
                            ? "var(--danger)"
                            : "var(--warning)",
                        fontWeight: "bold",
                      }}
                    >
                      <option value="ACTIVE">재직</option>
                      <option value="LEAVE_OF_ABSENCE">휴직</option>
                      <option value="RETIRED">퇴사 처리</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600 }}>직급 (결재 티어 매핑)</label>
                    <select
                      style={{
                        padding: "5px 8px",
                        fontSize: "12px",
                        width: "100%",
                        borderRadius: "4px",
                      }}
                      value={selectedProfile.position || ""}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, position: e.target.value })}
                      disabled={!canEdit}
                    >
                      <option value="">(직급 선택)</option>
                      {selectedProfile.position &&
                        !positionConfigs.some(
                          (p) => p.title.trim().toLowerCase() === selectedProfile.position.trim().toLowerCase()
                        ) && <option value={selectedProfile.position}>{selectedProfile.position} (미등록 직급)</option>}
                      {[...positionConfigs]
                        .sort((a, b) => a.tier_level - b.tier_level)
                        .map((p) => (
                          <option key={p.title} value={p.title}>
                            {p.title} ({p.tier_level}티어)
                          </option>
                        ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600 }}>직책 (R&R 결재 우선)</label>
                    <select
                      style={{
                        padding: "5px 8px",
                        fontSize: "12px",
                        width: "100%",
                        borderRadius: "4px",
                      }}
                      value={selectedProfile.duty || ""}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, duty: e.target.value })}
                      disabled={!canEdit}
                    >
                      <option value="">(미지정 / 팀원)</option>
                      {selectedProfile.duty &&
                        !dutyConfigs.some(
                          (d) => d.title.trim().toLowerCase() === selectedProfile.duty?.trim().toLowerCase()
                        ) && (
                          <option value={selectedProfile.duty}>
                            {selectedProfile.duty} (사용자 정의 직책)
                          </option>
                        )}
                      {[...dutyConfigs]
                        .sort((a, b) => a.tier_level - b.tier_level)
                        .map((d) => (
                          <option key={d.title} value={d.title}>
                            {d.title} ({d.tier_level}티어{d.description ? ` · ${d.description}` : ""})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* 🛡️ 결재 권한 티어 실시간 연동 인포 박스 */}
                {(() => {
                  const eff = getUserEffectiveTier(
                    { position: selectedProfile.position, duty: selectedProfile.duty },
                    dutyConfigs,
                    positionConfigs
                  );
                  return (
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <ShieldCheck size={14} color={eff.source === "DUTY" ? "#0f766e" : "#15803d"} />
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>결재 권한 티어</span>
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "8px",
                          background: eff.source === "DUTY" ? "#0f766e" : "#15803d",
                          color: "#fff",
                          fontSize: "11px",
                        }}
                      >
                        {eff.effectiveTier}티어 (
                        {eff.source === "DUTY" ? `직책 우선: ${eff.title}` : `직급 기준: ${eff.title}`})
                      </span>
                    </div>
                  );
                })()}

                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>시스템 역할</label>
                  <select
                    value={selectedProfile.role}
                    style={{ padding: "5px 8px", fontSize: "12px", width: "100%", borderRadius: "4px" }}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      const nextRoleCode =
                        nextRole === "ADMIN"
                          ? "ADMIN"
                          : nextRole === "MANAGER"
                          ? "MANAGER"
                          : selectedProfile.roleCode === "ACCOUNTANT" || selectedProfile.roleCode === "HR_STAFF"
                          ? selectedProfile.roleCode
                          : "EMPLOYEE";
                      setSelectedProfile({ ...selectedProfile, role: nextRole, roleCode: nextRoleCode });
                    }}
                    disabled={!canEdit || selectedProfile.loginId === "admin"}
                  >
                    {isSuperAdmin && <option value="ADMIN">ADMIN</option>}
                    <option value="MANAGER">MANAGER</option>
                    <option value="USER">USER</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-main)" }}>
                    소속 부서 (부서 이동)
                  </label>
                  <select
                    value={selectedProfile.departmentId || ""}
                    style={{
                      padding: "5px 8px",
                      fontSize: "12px",
                      width: "100%",
                      borderRadius: "4px",
                    }}
                    onChange={(e) => {
                      const newDeptId = e.target.value || null;
                      const targetDept = departments.find((d) => d.id === newDeptId);
                      setSelectedProfile({
                        ...selectedProfile,
                        departmentId: newDeptId,
                        department: targetDept?.name || "",
                      });
                      let updated = users.map((u) =>
                        u.id === selectedProfile.id
                          ? { ...u, departmentId: newDeptId, department: targetDept?.name || "" }
                          : u
                      );
                      updated = enforceManagerPolicies(updated, departments);
                      setUsers(updated);
                      setIsDirty(true);
                      showToast(
                        `소속 부서가 [${targetDept?.name || "미배정"}] (으)로 변경되었습니다. 저장을 눌러 확정하세요.`,
                        "warning"
                      );
                    }}
                    disabled={!canEdit}
                  >
                    <option value="">(미배정 인재풀)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name || "새 부서"}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px" }}>
                      <Calendar
                        size={12}
                        style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }}
                      />
                      입사일
                    </label>
                    <input
                      type="date"
                      style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                      value={selectedProfile.joinDate || ""}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, joinDate: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label
                        style={{
                          fontSize: "12px",
                          color: selectedProfile.leaveDate ? "var(--danger)" : "inherit",
                          fontWeight: selectedProfile.leaveDate ? 600 : 400,
                        }}
                      >
                        <Calendar
                          size={12}
                          style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }}
                        />
                        퇴사일
                      </label>
                      {canEdit && selectedProfile.leaveDate && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProfile({
                              ...selectedProfile,
                              leaveDate: "",
                            })
                          }
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            fontSize: "10.5px",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                          }}
                          title="퇴사일 초기화"
                        >
                          초기화
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      style={{
                        padding: "5px 8px",
                        fontSize: "12px",
                        borderRadius: "4px",
                        width: "100%",
                        borderColor: selectedProfile.leaveDate ? "var(--danger)" : undefined,
                      }}
                      value={selectedProfile.leaveDate || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedProfile({
                          ...selectedProfile,
                          leaveDate: val,
                          status: val ? "RETIRED" : selectedProfile.status,
                        });
                      }}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px" }}>
                      <Phone
                        size={12}
                        style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }}
                      />
                      휴대전화
                    </label>
                    <input
                      type="text"
                      style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                      placeholder="010-0000-0000"
                      value={selectedProfile.phone || ""}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, phone: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "12px" }}>
                      <Calendar
                        size={12}
                        style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }}
                      />
                      생년월일
                    </label>
                    <input
                      type="date"
                      style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                      value={selectedProfile.birthDate || ""}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, birthDate: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <label style={{ fontSize: "12px" }}>
                    <Mail
                      size={12}
                      style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }}
                    />
                    이메일
                  </label>
                  <input
                    type="email"
                    style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                    placeholder="example@dragonrpa.co.kr"
                    value={selectedProfile.email || ""}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, email: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <label style={{ fontSize: "12px" }}>
                    <MapPin
                      size={12}
                      style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "4px" }}
                    />
                    자택 주소
                  </label>
                  <input
                    type="text"
                    style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                    placeholder="자택 주소 입력"
                    value={selectedProfile.address || ""}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, address: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>

                {/* 급여계좌 정보 */}
                <div
                  style={{
                    marginTop: "2px",
                    padding: "10px",
                    backgroundColor: "var(--bg-app)",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "var(--text-main)",
                      display: "block",
                    }}
                  >
                    급여계좌 정보
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>은행명</label>
                      <select
                        style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                        value={selectedProfile.salaryBankName || ""}
                        onChange={(e) =>
                          setSelectedProfile({
                            ...selectedProfile,
                            salaryBankName: e.target.value,
                            salaryAccountHolder:
                              selectedProfile.salaryAccountHolder || selectedProfile.name || "",
                          })
                        }
                        disabled={!canEdit}
                      >
                        <option value="">(은행 선택)</option>
                        {[
                          "기업은행",
                          "국민은행",
                          "신한은행",
                          "우리은행",
                          "하나은행",
                          "농협은행",
                          "카카오뱅크",
                          "토스뱅크",
                          "케이뱅크",
                          "SC제일은행",
                          "한국씨티은행",
                          "우체국",
                          "새마을금고",
                          "신협",
                          "수협은행",
                          "부산은행",
                          "대구은행(iM뱅크)",
                          "경남은행",
                          "광주은행",
                          "전북은행",
                          "제주은행",
                        ].map((bank) => (
                          <option key={bank} value={bank}>
                            {bank}
                          </option>
                        ))}
                        {selectedProfile.salaryBankName &&
                          ![
                            "기업은행",
                            "국민은행",
                            "신한은행",
                            "우리은행",
                            "하나은행",
                            "농협은행",
                            "카카오뱅크",
                            "토스뱅크",
                            "케이뱅크",
                            "SC제일은행",
                            "한국씨티은행",
                            "우체국",
                            "새마을금고",
                            "신협",
                            "수협은행",
                            "부산은행",
                            "대구은행(iM뱅크)",
                            "경남은행",
                            "광주은행",
                            "전북은행",
                            "제주은행",
                          ].includes(selectedProfile.salaryBankName) && (
                            <option value={selectedProfile.salaryBankName}>
                              {selectedProfile.salaryBankName}
                            </option>
                          )}
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>예금주</label>
                      <input
                        type="text"
                        style={{ padding: "5px 8px", fontSize: "12px", borderRadius: "4px", width: "100%" }}
                        placeholder="예금주 성명"
                        value={selectedProfile.salaryAccountHolder || ""}
                        onChange={(e) =>
                          setSelectedProfile({ ...selectedProfile, salaryAccountHolder: e.target.value })
                        }
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>계좌번호</label>
                    <input
                      type="text"
                      style={{
                        padding: "5px 8px",
                        fontSize: "12px",
                        borderRadius: "4px",
                        width: "100%",
                        fontFamily: "monospace",
                      }}
                      placeholder="계좌번호 입력 (예: 110-123-456789)"
                      value={selectedProfile.salaryAccountNo || ""}
                      onChange={(e) =>
                        setSelectedProfile({ ...selectedProfile, salaryAccountNo: e.target.value })
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                {/* 급여 및 통상임금 설정 */}
                {(canViewPayroll || canEdit) && (
                  <div
                    style={{
                      marginTop: "4px",
                      padding: "10px",
                      backgroundColor: "var(--bg-app)",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label
                        style={{
                          fontSize: "12px",
                          fontWeight: "bold",
                          color: "var(--text-main)",
                          display: "block",
                          whiteSpace: "nowrap",
                        }}
                      >
                        계약 기본급 (원)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        style={{
                          padding: "6px 10px",
                          fontSize: "13px",
                          fontWeight: "bold",
                          width: "100%",
                          borderRadius: "4px",
                          textAlign: "right",
                        }}
                        placeholder="0"
                        value={
                          selectedProfile.baseSalary === undefined || selectedProfile.baseSalary === null
                            ? ""
                            : toErpInputString(selectedProfile.baseSalary)
                        }
                        onChange={(e) => handleWageInputChange("baseSalary", e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label
                        style={{
                          fontSize: "12px",
                          fontWeight: "bold",
                          color: "var(--primary)",
                          display: "block",
                          whiteSpace: "nowrap",
                        }}
                      >
                        통상임금 (원)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        style={{
                          padding: "6px 10px",
                          fontSize: "13px",
                          fontWeight: "bold",
                          width: "100%",
                          borderRadius: "4px",
                          textAlign: "right",
                        }}
                        placeholder="0"
                        value={
                          selectedProfile.hourlyWage === undefined || selectedProfile.hourlyWage === null
                            ? ""
                            : toErpInputString(selectedProfile.hourlyWage)
                        }
                        onChange={(e) => handleWageInputChange("hourlyWage", e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>

                    {/* 수당 항목: 식대 및 차량보조금 */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "2px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label
                          style={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "var(--text-main)",
                            display: "block",
                            whiteSpace: "nowrap",
                          }}
                        >
                          식대 (원)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          style={{
                            padding: "6px 10px",
                            fontSize: "13px",
                            fontWeight: "bold",
                            width: "100%",
                            borderRadius: "4px",
                            textAlign: "right",
                          }}
                          placeholder="0"
                          value={
                            selectedProfile.mealAllowance === undefined || selectedProfile.mealAllowance === null
                              ? ""
                              : toErpInputString(selectedProfile.mealAllowance)
                          }
                          onChange={(e) => handleWageInputChange("mealAllowance", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label
                          style={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "var(--text-main)",
                            display: "block",
                            whiteSpace: "nowrap",
                          }}
                        >
                          차량보조금 (원)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          style={{
                            padding: "6px 10px",
                            fontSize: "13px",
                            fontWeight: "bold",
                            width: "100%",
                            borderRadius: "4px",
                            textAlign: "right",
                          }}
                          placeholder="0"
                          value={
                            selectedProfile.vehicleAllowance === undefined || selectedProfile.vehicleAllowance === null
                              ? ""
                              : toErpInputString(selectedProfile.vehicleAllowance)
                          }
                          onChange={(e) => handleWageInputChange("vehicleAllowance", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    {/* 월 고정 급여 + 수당 합계 요약 */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "5px 8px",
                        backgroundColor: "var(--bg-card)",
                        borderRadius: "4px",
                        border: "1px solid var(--border-color)",
                        fontSize: "11.5px",
                      }}
                    >
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                        월 급여 합계
                      </span>
                      <strong style={{ color: "var(--primary)", fontSize: "12.5px" }}>
                        {(
                          cleanErpNumber(selectedProfile.baseSalary) +
                          cleanErpNumber(selectedProfile.mealAllowance) +
                          cleanErpNumber(selectedProfile.vehicleAllowance)
                        ).toLocaleString()}
                        원
                      </strong>
                    </div>

                    {/* 4대보험 가입여부 항목별 체크박스 */}
                    <div
                      style={{
                        marginTop: "2px",
                        padding: "8px",
                        backgroundColor: "var(--bg-card)",
                        borderRadius: "4px",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label
                          style={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "var(--text-main)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          4대보험 가입여부
                        </label>
                        {canEdit && (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedProfile({
                                  ...selectedProfile,
                                  insNationalPension: true,
                                  insHealthInsurance: true,
                                  insEmploymentInsurance: true,
                                  insIndustrialAccident: true,
                                })
                              }
                              style={{
                                fontSize: "10px",
                                padding: "1.5px 6px",
                                borderRadius: "3px",
                                border: "1px solid var(--border-color)",
                                backgroundColor: "var(--bg-app)",
                                color: "var(--text-secondary)",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              전체선택
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedProfile({
                                  ...selectedProfile,
                                  insNationalPension: false,
                                  insHealthInsurance: false,
                                  insEmploymentInsurance: false,
                                  insIndustrialAccident: false,
                                })
                              }
                              style={{
                                fontSize: "10px",
                                padding: "1.5px 6px",
                                borderRadius: "3px",
                                border: "1px solid var(--border-color)",
                                backgroundColor: "var(--bg-app)",
                                color: "var(--text-secondary)",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              전체해제
                            </button>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "6px",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "5px 8px",
                            borderRadius: "4px",
                            border: `1px solid ${
                              selectedProfile.insNationalPension !== false ? "var(--primary)" : "var(--border-color)"
                            }`,
                            backgroundColor:
                              selectedProfile.insNationalPension !== false ? "var(--bg-app)" : "transparent",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: canEdit ? "pointer" : "default",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProfile.insNationalPension !== false}
                            onChange={(e) =>
                              setSelectedProfile({
                                ...selectedProfile,
                                insNationalPension: e.target.checked,
                              })
                            }
                            disabled={!canEdit}
                            style={{ width: "14px", height: "14px", accentColor: "var(--primary)", cursor: canEdit ? "pointer" : "default" }}
                          />
                          <span>국민연금</span>
                        </label>

                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "5px 8px",
                            borderRadius: "4px",
                            border: `1px solid ${
                              selectedProfile.insHealthInsurance !== false ? "var(--primary)" : "var(--border-color)"
                            }`,
                            backgroundColor:
                              selectedProfile.insHealthInsurance !== false ? "var(--bg-app)" : "transparent",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: canEdit ? "pointer" : "default",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProfile.insHealthInsurance !== false}
                            onChange={(e) =>
                              setSelectedProfile({
                                ...selectedProfile,
                                insHealthInsurance: e.target.checked,
                              })
                            }
                            disabled={!canEdit}
                            style={{ width: "14px", height: "14px", accentColor: "var(--primary)", cursor: canEdit ? "pointer" : "default" }}
                          />
                          <span>건강보험 (장기요양)</span>
                        </label>

                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "5px 8px",
                            borderRadius: "4px",
                            border: `1px solid ${
                              selectedProfile.insEmploymentInsurance !== false ? "var(--primary)" : "var(--border-color)"
                            }`,
                            backgroundColor:
                              selectedProfile.insEmploymentInsurance !== false ? "var(--bg-app)" : "transparent",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: canEdit ? "pointer" : "default",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProfile.insEmploymentInsurance !== false}
                            onChange={(e) =>
                              setSelectedProfile({
                                ...selectedProfile,
                                insEmploymentInsurance: e.target.checked,
                              })
                            }
                            disabled={!canEdit}
                            style={{ width: "14px", height: "14px", accentColor: "var(--primary)", cursor: canEdit ? "pointer" : "default" }}
                          />
                          <span>고용보험</span>
                        </label>

                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "5px 8px",
                            borderRadius: "4px",
                            border: `1px solid ${
                              selectedProfile.insIndustrialAccident !== false ? "var(--primary)" : "var(--border-color)"
                            }`,
                            backgroundColor:
                              selectedProfile.insIndustrialAccident !== false ? "var(--bg-app)" : "transparent",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: canEdit ? "pointer" : "default",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProfile.insIndustrialAccident !== false}
                            onChange={(e) =>
                              setSelectedProfile({
                                ...selectedProfile,
                                insIndustrialAccident: e.target.checked,
                              })
                            }
                            disabled={!canEdit}
                            style={{ width: "14px", height: "14px", accentColor: "var(--primary)", cursor: canEdit ? "pointer" : "default" }}
                          />
                          <span>산재보험</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
  );
};
