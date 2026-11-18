"use client";

import React from "react";
import {
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { cleanErpNumber } from "@/lib/erpFormat";
import {
  getUserEffectiveTier,
  UNIVERSAL_FUNCTIONAL_ATTRIBUTES,
  getDepartmentFunctionalTags,
  maskPhoneNumber,
  type ApprovalTierConfig,
  type Department,
  type UserNode,
} from "./organizationTypes";

export interface OrgTreeAndMemberGridProps {
  activeTab: "DEPT" | "UNASSIGNED";
  canEdit: boolean;
  canViewPayroll: boolean;
  commitEditDept: () => Promise<void>;
  departments: Department[];
  displayedUsers: UserNode[];
  draggedUserId: string | null;
  dutyConfigs: ApprovalTierConfig[];
  editingDeptId: string | null;
  editingDeptName: string;
  handleAddDept: (forceRoot?: boolean) => void;
  handleAddUser: () => void;
  handleDeleteDept: (e: React.MouseEvent, deptId: string) => void;
  handleDeptKeyDown: (e: React.KeyboardEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragStart: (e: React.DragEvent, userId: string) => void;
  handleDropToDept: (e: React.DragEvent, targetDeptId: string) => Promise<void>;
  handleDropToPool: (e: React.DragEvent) => Promise<void>;
  handleToggleDeptFunctionalTag: (deptId: string, attrId: string) => Promise<void>;
  isPrivileged: boolean;
  openUserProfile: (user: UserNode) => void;
  positionConfigs: ApprovalTierConfig[];
  revealedPhones: Set<string>;
  selectedDeptId: string | null;
  setActiveTab: React.Dispatch<React.SetStateAction<"DEPT" | "UNASSIGNED">>;
  setDraggedUserId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingDeptName: React.Dispatch<React.SetStateAction<string>>;
  setSelectedDeptId: React.Dispatch<React.SetStateAction<string | null>>;
  startEditDept: (e: React.MouseEvent, dept: Department) => void;
  toggleRevealPhone: (userId: string, e: React.MouseEvent) => void;
  unassignedCount: number;
  users: UserNode[];
}

export const OrgTreeAndMemberGrid: React.FC<OrgTreeAndMemberGridProps> = ({
  activeTab,
  canEdit,
  canViewPayroll,
  commitEditDept,
  departments,
  displayedUsers,
  draggedUserId,
  dutyConfigs,
  editingDeptId,
  editingDeptName,
  handleAddDept,
  handleAddUser,
  handleDeleteDept,
  handleDeptKeyDown,
  handleDragOver,
  handleDragStart,
  handleDropToDept,
  handleDropToPool,
  handleToggleDeptFunctionalTag,
  isPrivileged,
  openUserProfile,
  positionConfigs,
  revealedPhones,
  selectedDeptId,
  setActiveTab,
  setDraggedUserId,
  setEditingDeptName,
  setSelectedDeptId,
  startEditDept,
  toggleRevealPhone,
  unassignedCount,
  users,
}) => {
  const renderDeptTree = (parentId: string | null, depth: number = 0) => {
    const children = departments.filter((d) => d.parentDepartmentId === parentId);
    if (children.length === 0) return null;

    return (
      <div
        data-hs-observe="organizationsettings"
        data-mid="org-header"
        data-subview="organization"
        style={{ marginLeft: depth > 0 ? "16px" : "0" }}
      >
        {children.map((dept) => {
          const isSelected = selectedDeptId === dept.id && activeTab === "DEPT";
          const userCount = users.filter((u) => u.departmentId === dept.id).length;
          const deptTags = getDepartmentFunctionalTags(dept);

          return (
            <div key={dept.id}>
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropToDept(e, dept.id)}
                onClick={() => {
                  if (editingDeptId !== dept.id) {
                    setSelectedDeptId(dept.id);
                    setActiveTab("DEPT");
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 12px",
                  margin: "3px 0",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: isSelected ? "var(--primary-light)" : "transparent",
                  color: isSelected ? "var(--primary)" : "var(--text-main)",
                  border: isSelected ? "1px solid var(--primary-border)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  borderStyle: draggedUserId ? "dashed" : "solid",
                  whiteSpace: "nowrap",
                }}
                className={draggedUserId ? "drop-target-active" : ""}
              >
                <span
                  style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    color: isSelected ? "var(--primary)" : "var(--text-muted)",
                  }}
                >
                  {departments.some((d) => d.parentDepartmentId === dept.id) ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </span>

                {editingDeptId === dept.id ? (
                  <input
                    type="text"
                    placeholder="부서명 입력 (예: 영남영업소)"
                    value={editingDeptName}
                    onChange={(e) => setEditingDeptName(e.target.value)}
                    onBlur={commitEditDept}
                    onKeyDown={handleDeptKeyDown}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    style={{ flex: 1, padding: "2px 6px", fontSize: "13.5px", height: "auto", borderRadius: "4px" }}
                  />
                ) : (
                  <>
                    <span
                      style={{
                        fontWeight: isSelected ? "600" : "500",
                        flex: "1 1 auto",
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: dept.name ? "inherit" : "var(--text-muted)",
                        fontSize: "13.5px",
                      }}
                      title={dept.name || "새 부서(명칭 미입력)"}
                    >
                      {dept.name || "새 부서(명칭 미입력)"}
                    </span>

                    <div
                      style={{
                        display: "flex",
                        gap: "3px",
                        alignItems: "center",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {deptTags.slice(0, 3).map((tagId) => {
                        const attr = UNIVERSAL_FUNCTIONAL_ATTRIBUTES.find(
                          (a) => a.id === tagId || a.code === tagId
                        );
                        if (!attr) return null;
                        return (
                          <span
                            key={attr.id}
                            style={{
                              fontSize: "10.5px",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              backgroundColor: attr.badgeBg,
                              color: attr.badgeText,
                              border: `1px solid ${attr.color}33`,
                              whiteSpace: "nowrap",
                              fontWeight: "600",
                              flexShrink: 0,
                            }}
                            title={attr.description}
                          >
                            {attr.label}
                          </span>
                        );
                      })}
                      {deptTags.length > 3 && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          +{deptTags.length - 3}
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        backgroundColor: isSelected ? "rgba(59, 130, 246, 0.15)" : "var(--bg-card)",
                        borderRadius: "10px",
                        color: isSelected ? "var(--primary)" : "var(--text-secondary)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        fontWeight: 600,
                      }}
                    >
                      {userCount}명
                    </span>

                    {canEdit && isSelected && (
                      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        <button
                          onClick={(e) => startEditDept(e, dept)}
                          style={{ padding: "4px", background: "transparent", color: "var(--text-muted)" }}
                          title="부서명 수정"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          data-hs-trigger="Delete"
                          onClick={(e) => handleDeleteDept(e, dept.id)}
                          style={{ padding: "4px", background: "transparent", color: "var(--danger)" }}
                          title="부서 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              {renderDeptTree(dept.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const renderUserCard = (user: UserNode) => {
    const eff = getUserEffectiveTier(user, dutyConfigs, positionConfigs);
    const isPhoneRevealed = isPrivileged || revealedPhones.has(user.id);
    const isAccountRevealed = isPrivileged || canViewPayroll || revealedPhones.has(user.id);

    return (
      <div
        data-mid="org-user-card"
        key={user.id}
        draggable={canEdit}
        onDragStart={(e) => handleDragStart(e, user.id)}
        onDragEnd={() => setDraggedUserId(null)}
        onDoubleClick={() => openUserProfile(user)}
        onClick={() => openUserProfile(user)}
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          padding: "16px",
          backgroundColor: "var(--bg-card)",
          cursor: canEdit ? "grab" : "pointer",
          opacity: draggedUserId === user.id ? 0.5 : 1,
          position: "relative",
          transition: "all 0.2s ease",
        }}
        title="드래그하여 좌측 부서로 배속 이동 / 클릭하여 상세 프로필 수정"
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          {canEdit && (
            <GripVertical size={16} color="var(--text-muted)" style={{ cursor: "grab", marginTop: "4px" }} />
          )}

          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "var(--primary-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary)",
              fontWeight: 700,
              backgroundImage: user.profileImageUrl ? `url(${user.profileImageUrl})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              flexShrink: 0,
            }}
          >
            {!user.profileImageUrl && (user.name ? user.name.substring(0, 1) : "신")}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: "700",
                    fontSize: "15px",
                    color: user.name ? "var(--text-main)" : "var(--text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.name || "신규직원(이름 미입력)"}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: eff.source === "DUTY" ? "rgba(15, 118, 110, 0.15)" : "rgba(21, 128, 61, 0.15)",
                    color: eff.source === "DUTY" ? "#0f766e" : "#15803d",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {eff.effectiveTier}티어
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  backgroundColor:
                    user.status === "ACTIVE"
                      ? "var(--success-light)"
                      : user.status === "RETIRED"
                      ? "var(--danger-light)"
                      : "var(--warning-light)",
                  color:
                    user.status === "ACTIVE"
                      ? "var(--success)"
                      : user.status === "RETIRED"
                      ? "var(--danger)"
                      : "var(--warning)",
                }}
              >
                {user.status === "ACTIVE" ? "재직" : user.status === "RETIRED" ? "퇴사" : "휴직"}
              </span>
            </div>

            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", whiteSpace: "nowrap" }}>
              {user.position || "직급 미지정"}
              {user.duty ? ` (${user.duty})` : ""} | {user.role}
              {(canEdit || canViewPayroll) && (
                <span style={{ marginLeft: "6px", fontSize: "11.5px", color: "var(--primary)", fontWeight: 600 }}>
                  · 통상임금 {cleanErpNumber(user.hourlyWage).toLocaleString()}원
                </span>
              )}
            </div>

            {(user.joinDate || user.leaveDate) && (
              <div
                style={{
                  fontSize: "11.5px",
                  color: user.status === "RETIRED" && user.leaveDate ? "var(--danger)" : "var(--text-muted)",
                  marginTop: "2px",
                  whiteSpace: "nowrap",
                  fontWeight: user.status === "RETIRED" && user.leaveDate ? 600 : 400,
                }}
              >
                {user.joinDate ? `입사: ${user.joinDate}` : ""}
                {user.joinDate && user.leaveDate ? " · " : ""}
                {user.leaveDate ? `퇴사: ${user.leaveDate}` : ""}
              </div>
            )}

            {user.phone && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "2px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onClick={(e) => toggleRevealPhone(user.id, e)}
                title="클릭하여 마스킹 해제/적용"
              >
                <span>{isPhoneRevealed ? user.phone : maskPhoneNumber(user.phone)}</span>
                <span style={{ cursor: "pointer", opacity: 0.6, display: "inline-flex", alignItems: "center" }}>
                  {isPhoneRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                </span>
              </div>
            )}

            {(user.salaryBankName || user.salaryAccountNo) && (
              <div
                style={{
                  fontSize: "11.5px",
                  color: "var(--text-muted)",
                  marginTop: "2px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                급여계좌: {user.salaryBankName || "-"}{" "}
                {isAccountRevealed
                  ? user.salaryAccountNo || ""
                  : user.salaryAccountNo
                  ? `${user.salaryAccountNo.slice(0, 4)}-****`
                  : ""}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const currentSelectedDept =
    activeTab === "DEPT" && selectedDeptId ? departments.find((d) => d.id === selectedDeptId) : null;
  const currentDeptTags = getDepartmentFunctionalTags(currentSelectedDept);
  const allAssignedTags = new Set(departments.flatMap((d) => getDepartmentFunctionalTags(d)));
  const unassignedCompanyAttributes = UNIVERSAL_FUNCTIONAL_ATTRIBUTES.filter(
    (attr) => !allAssignedTags.has(attr.id) && !allAssignedTags.has(attr.code)
  );

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        gap: "10px",
        alignItems: "stretch",
      }}
    >
      {/* 좌측: 조직 트리 */}
      <div
        data-mid="org-tree-panel"
        className="card"
        style={{
          width: "380px",
          minWidth: "340px",
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          padding: "12px",
          margin: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: "6px",
            flexShrink: 0,
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: "700", margin: 0 }}>조직 구조도</h3>
          {canEdit && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {selectedDeptId && (
                <button
                  type="button"
                  onClick={() => handleAddDept(true)}
                  style={{
                    background: "transparent",
                    padding: "2px 6px",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  title="최상위(Root) 부서 추가"
                >
                  + 최상위
                </button>
              )}
              <button
                data-mid="org-btn-add-dept"
                onClick={() => handleAddDept(false)}
                style={{ background: "transparent", padding: "4px", color: "var(--primary)", cursor: "pointer" }}
                title="선택된 부서 아래에 하위 부서 추가"
              >
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto", paddingRight: "4px" }}>
          {renderDeptTree(null)}
        </div>

        {/* 미배정 임직원 풀 버튼 (클릭 시 조회 + 드래그앤드롭 시 부서 배속 해제) */}
        <div
          onClick={() => setActiveTab("UNASSIGNED")}
          onDragOver={handleDragOver}
          onDrop={handleDropToPool}
          style={{
            marginTop: "8px",
            padding: "8px 10px",
            border: "1px dashed var(--border-color)",
            flexShrink: 0,
            borderRadius: "var(--radius-md)",
            backgroundColor: activeTab === "UNASSIGNED" ? "var(--primary-light)" : "var(--bg-app)",
            color: activeTab === "UNASSIGNED" ? "var(--primary)" : "var(--text-secondary)",
            cursor: "pointer",
            textAlign: "center",
            fontWeight: "600",
            fontSize: "13.5px",
            transition: "all 0.2s ease",
            borderStyle: draggedUserId ? "solid" : "dashed",
            borderColor: draggedUserId ? "var(--primary)" : "var(--border-color)",
          }}
          className={draggedUserId ? "drop-target-active" : ""}
        >
          미배정 인력 목록
          <div style={{ fontSize: "11.5px", color: "var(--danger)", marginTop: "2px" }}>
            {unassignedCount}명 대기 중
          </div>
        </div>
      </div>

      {/* 중앙: 직원 리스트 뷰 */}
      <div
        data-mid="org-users-panel"
        className="card"
        style={{
          flex: 1,
          minWidth: "420px",
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: "12px",
          margin: 0,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: "6px",
            flexShrink: 0,
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>
            {activeTab === "DEPT"
              ? `${departments.find((d) => d.id === selectedDeptId)?.name || "선택된 부서"} 소속원 (${displayedUsers.length}명)`
              : `미배정 대기 임직원 (${displayedUsers.length}명)`}
          </h3>
          {canEdit && (
            <button
              data-mid="org-btn-add-user"
              data-hs-trigger="Register"
              className="btn-secondary"
              onClick={handleAddUser}
              style={{ padding: "6px 12px", fontSize: "13px" }}
            >
              <Plus size={14} style={{ marginRight: "4px" }} /> 신규 직원 등록
            </button>
          )}
        </div>

        {/* 부서 보편 기능 속성 매핑 (9대 보편 기능 칩 버튼) */}
        {currentSelectedDept && (
          <div
            style={{
              marginBottom: "8px",
              padding: "8px 12px",
              backgroundColor: "var(--bg-app)",
              flexShrink: 0,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-main)" }}>
                  조직 기능 매핑
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  (복수 겸임 지원 • 직무별 ToDo 피드 자동 라우팅)
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                할당 기능: <strong>{currentDeptTags.length}개</strong>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {UNIVERSAL_FUNCTIONAL_ATTRIBUTES.map((attr) => {
                const isAssigned = currentDeptTags.includes(attr.id) || currentDeptTags.includes(attr.code);
                return (
                  <button
                    key={attr.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleToggleDeptFunctionalTag(currentSelectedDept.id, attr.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: isAssigned ? "700" : "500",
                      backgroundColor: isAssigned ? attr.badgeBg : "var(--bg-card)",
                      color: isAssigned ? attr.badgeText : "var(--text-secondary)",
                      border: isAssigned ? `1.5px solid ${attr.color}` : "1px solid var(--border-color)",
                      cursor: canEdit ? "pointer" : "default",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap",
                    }}
                    title={`${attr.label}: ${attr.description}`}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        backgroundColor: isAssigned ? attr.color : "var(--border-color)",
                      }}
                    />
                    {attr.label}
                  </button>
                );
              })}
            </div>

            {unassignedCompanyAttributes.length > 0 && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  paddingTop: "4px",
                  borderTop: "1px dashed var(--border-color)",
                  flexWrap: "wrap",
                }}
              >
                <span>전사 미할당 기능: {unassignedCompanyAttributes.map((a) => a.label).join(", ")}</span>
                <span style={{ color: "var(--primary)" }}>(전사 공용 업무 대기열로 자동 개방됨)</span>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "10px",
            alignContent: "start",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
            padding: "4px",
          }}
        >
          {displayedUsers.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "60px 20px",
                color: "var(--text-muted)",
                fontSize: "13px",
              }}
            >
              {activeTab === "UNASSIGNED"
                ? "현재 미배정 대기 중인 임직원이 없습니다. 우측 상단 [+ 신규 직원 등록]을 누르면 미배정 인력풀에 생성됩니다."
                : "이 부서에 배속된 직원이 없습니다. 미배정 인력 목록에서 직원을 드래그하여 좌측 부서에 드롭하거나 상세 프로필에서 소속 부서를 지정하십시오."}
            </div>
          ) : (
            displayedUsers.map((user) => renderUserCard(user))
          )}
        </div>
      </div>
    </div>
  );
};
