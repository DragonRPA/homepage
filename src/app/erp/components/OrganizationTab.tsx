"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Network, Save, Download } from "lucide-react";
import { cleanErpNumber } from "@/lib/erpFormat";
import {
  getUserEffectiveTier,
  maskPhoneNumber,
  maskEmail,
  maskName,
  maskAddress,
  type OrganizationTabProps,
} from "./organization/organizationTypes";
import { OrgTreeAndMemberGrid } from "./organization/OrgTreeAndMemberGrid";
import { OrgActionModalsAndAuditBar } from "./organization/OrgActionModalsAndAuditBar";
import { useOrganizationController } from "./organization/useOrganizationController";

const SelectedProfilePanel = dynamic(
  () =>
    import("./organization/SelectedProfilePanel").then(
      (m) => m.SelectedProfilePanel
    ),
  { ssr: false }
);

// ============================================================================
// 🏛️ eBro ERP SSOT Types & Constants (인사 및 조직도 마스터 설정 표준)
// ============================================================================

export {
  DEFAULT_POSITION_TIERS,
  DEFAULT_DUTY_TIERS,
  getUserEffectiveTier,
  UNIVERSAL_FUNCTIONAL_ATTRIBUTES,
  getDepartmentFunctionalTags,
  maskPhoneNumber,
  maskEmail,
  maskName,
  maskAddress,
  type ApprovalTierConfig,
  type FunctionalAttributeConfig,
  type Department,
  type UserNode,
  type OrganizationTabProps,
} from "./organization/organizationTypes";

export const OrganizationTab: React.FC<OrganizationTabProps> = ({ currentUser }) => {
  const {
    activeTab,
    applyProfileChanges,
    canEdit,
    canViewPayroll,
    commitEditDept,
    confirmDeleteDept,
    confirmRetirement,
    departments,
    deptToDelete,
    draggedUserId,
    dutyConfigs,
    editingDeptId,
    editingDeptName,
    enforceManagerPolicies,
    errorModal,
    fileInputRef,
    handleAddDept,
    handleAddUser,
    handleDeleteDept,
    handleDeptKeyDown,
    handleDragOver,
    handleDragStart,
    handleDropToDept,
    handleDropToPool,
    handlePhotoUpload,
    handleSaveAll,
    handleStatusChange,
    handleToggleDeptFunctionalTag,
    handleWageInputChange,
    isDirty,
    isPrivileged,
    isSaving,
    isSuperAdmin,
    openUserProfile,
    positionConfigs,
    revealedPhones,
    selectedDeptId,
    selectedProfile,
    setActiveTab,
    setDeptToDelete,
    setDraggedUserId,
    setEditingDeptName,
    setErrorModal,
    setIsDirty,
    setSelectedDeptId,
    setSelectedProfile,
    setShowHandoffModal,
    setShowPasswordInput,
    setUsers,
    showHandoffModal,
    showPasswordInput,
    showToast,
    startEditDept,
    toastMessage,
    toggleRevealPhone,
    users,
  } = useOrganizationController(currentUser);

  // 전사 조직 및 구성원 현황 대차대조 집계 (헌장 3.5 & 5.5)
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.status === "ACTIVE").length;
  const leaveUsersCount = users.filter((u) => u.status === "LEAVE_OF_ABSENCE").length;
  const retiredUsersCount = users.filter((u) => u.status === "RETIRED").length;
  const assignedUsersCount = users.filter((u) => u.departmentId !== null).length;
  const unassignedUsersCount = users.filter((u) => u.departmentId === null).length;
  const totalDeptsCount = departments.length;
  const userStatusSum = activeUsersCount + leaveUsersCount + retiredUsersCount;
  const userBalanceDiff = Math.abs(totalUsersCount - userStatusSum);

  // 임직원 대장 엑셀(CSV) 내보내기
  const handleExportOrgExcel = () => {
    if (users.length === 0) {
      showToast("내보낼 임직원 데이터가 없습니다.", "error");
      return;
    }
    const deptMap = new Map(departments.map((d) => [d.id, d.name]));
    const headers = [
      "순번",
      "성명",
      "아이디",
      "소속부서",
      "직급",
      "직책",
      "결재티어",
      "역할/권한",
      "재직상태",
      "입사일",
      "퇴사일",
      "생년월일",
      "연락처",
      "이메일",
      "주소",
      "급여은행",
      "급여계좌번호",
      "예금주",
      ...(canViewPayroll || canEdit
        ? [
            "기본급(원)",
            "식대(원)",
            "차량보조금(원)",
            "통상임금(원)",
            "국민연금",
            "건강보험",
            "고용보험",
            "산재보험",
          ]
        : []),
    ];

    const csvRows = [headers.join(",")];
    users.forEach((u, idx) => {
      const deptName = u.departmentId
        ? deptMap.get(u.departmentId) || u.department || "미지정"
        : u.department || "미배치";
      const statusLabel = u.status === "ACTIVE" ? "재직" : u.status === "RETIRED" ? "퇴사" : "휴직";
      const eff = getUserEffectiveTier(u, dutyConfigs, positionConfigs);
      const cols = [
        idx + 1,
        isPrivileged ? u.name || "-" : maskName(u.name),
        u.loginId || "-",
        deptName,
        u.position || "-",
        u.duty || "-",
        `${eff.effectiveTier}티어`,
        u.role || "USER",
        statusLabel,
        u.joinDate || "-",
        u.leaveDate || "-",
        isPrivileged ? u.birthDate || "-" : u.birthDate ? `${u.birthDate.slice(0, 7)}-**` : "-",
        isPrivileged ? u.phone || "-" : maskPhoneNumber(u.phone),
        isPrivileged ? u.email || "-" : maskEmail(u.email),
        `"${(isPrivileged ? u.address || "-" : maskAddress(u.address)).replace(/"/g, '""')}"`,
        u.salaryBankName || "-",
        isPrivileged || canViewPayroll
          ? u.salaryAccountNo || "-"
          : u.salaryAccountNo
          ? `${u.salaryAccountNo.slice(0, 4)}-****`
          : "-",
        isPrivileged || canViewPayroll
          ? u.salaryAccountHolder || u.name || "-"
          : maskName(u.salaryAccountHolder || u.name),
        ...(canViewPayroll || canEdit
          ? [
              u.baseSalary || 0,
              u.mealAllowance ?? 200000,
              u.vehicleAllowance ?? 0,
              cleanErpNumber(u.hourlyWage),
              u.insNationalPension !== false ? "가입" : "미가입",
              u.insHealthInsurance !== false ? "가입" : "미가입",
              u.insEmploymentInsurance !== false ? "가입" : "미가입",
              u.insIndustrialAccident !== false ? "가입" : "미가입",
            ]
          : []),
      ];
      csvRows.push(cols.join(","));
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `임직원대장_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`임직원 대장 ${users.length}명 엑셀 내보내기 완료 (${isPrivileged ? "전체 정보" : "마스킹 적용"})`);
  };

  const displayedUsers =
    activeTab === "DEPT"
      ? users.filter((u) => u.departmentId === selectedDeptId)
      : users.filter((u) => u.departmentId === null);

  const unassignedCount = unassignedUsersCount;
  const inactiveOrUnassignedCount = unassignedCount + leaveUsersCount + retiredUsersCount;
  const summaryCards = [
    { label: "총 조직 부서", value: `${departments.length}개 부서`, color: "var(--primary)" },
    { label: "재직 임직원", value: `${activeUsersCount}명`, color: "var(--success)" },
    {
      label: "부서 미배치 / 휴·퇴사",
      value: `${inactiveOrUnassignedCount}명`,
      color: inactiveOrUnassignedCount > 0 ? "#d97706" : "var(--text-muted)",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        position: "relative",
        padding: "12px 16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
          paddingBottom: "6px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: "var(--text-main)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: 0,
            }}
          >
            <Network size={22} color="var(--primary)" />
            인사 및 조직도 마스터 설정
          </h2>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportOrgExcel}
            style={{
              padding: "8px 14px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
            }}
          >
            <Download size={15} /> 엑셀 내보내기
          </button>

          {canEdit && (
            <button
              data-hs-trigger="Save"
              className={`btn-primary ${isDirty ? "pulse-animation" : ""}`}
              data-mid="org-save-all"
              onClick={handleSaveAll}
              disabled={isSaving}
              style={{
                padding: "8px 18px",
                backgroundColor: isDirty ? "var(--danger)" : "var(--primary)",
                borderColor: isDirty ? "var(--danger)" : "var(--primary)",
                transition: "all 0.3s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Save size={15} /> {isSaving ? "저장 중..." : isDirty ? "전체 저장 (변경됨)" : "전체 저장"}
            </button>
          )}
        </div>
      </div>

      {/* 📊 조직 및 임직원 현황 요약 바 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        {summaryCards.map((card) => (
          <div
            key={card.label}
            style={{
              padding: "6px 12px",
              backgroundColor: "var(--bg-card)",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", fontWeight: 600 }}>
              {card.label}
            </span>
            <strong style={{ fontSize: "15px", color: card.color }}>{card.value}</strong>
          </div>
        ))}
      </div>

      {/* Main Split Studio: 좌측 조직 트리 + 중앙 직원 리스트 뷰 */}
      <OrgTreeAndMemberGrid
        activeTab={activeTab}
        canEdit={canEdit}
        canViewPayroll={canViewPayroll}
        commitEditDept={commitEditDept}
        departments={departments}
        displayedUsers={displayedUsers}
        draggedUserId={draggedUserId}
        dutyConfigs={dutyConfigs}
        editingDeptId={editingDeptId}
        editingDeptName={editingDeptName}
        handleAddDept={handleAddDept}
        handleAddUser={handleAddUser}
        handleDeleteDept={handleDeleteDept}
        handleDeptKeyDown={handleDeptKeyDown}
        handleDragOver={handleDragOver}
        handleDragStart={handleDragStart}
        handleDropToDept={handleDropToDept}
        handleDropToPool={handleDropToPool}
        handleToggleDeptFunctionalTag={handleToggleDeptFunctionalTag}
        isPrivileged={isPrivileged}
        openUserProfile={openUserProfile}
        positionConfigs={positionConfigs}
        revealedPhones={revealedPhones}
        selectedDeptId={selectedDeptId}
        setActiveTab={setActiveTab}
        setDraggedUserId={setDraggedUserId}
        setEditingDeptName={setEditingDeptName}
        setSelectedDeptId={setSelectedDeptId}
        startEditDept={startEditDept}
        toggleRevealPhone={toggleRevealPhone}
        unassignedCount={unassignedCount}
        users={users}
      />

      {/* 우측: Slide-out 상세 프로필 모달 (eBro ERP 표준) */}
      {selectedProfile && (
        <SelectedProfilePanel
          applyProfileChanges={applyProfileChanges}
          canEdit={canEdit}
          canViewPayroll={canViewPayroll}
          departments={departments}
          dutyConfigs={dutyConfigs}
          enforceManagerPolicies={enforceManagerPolicies}
          fileInputRef={fileInputRef}
          handlePhotoUpload={handlePhotoUpload}
          handleStatusChange={handleStatusChange}
          handleWageInputChange={handleWageInputChange}
          isSuperAdmin={isSuperAdmin}
          positionConfigs={positionConfigs}
          selectedProfile={selectedProfile}
          setIsDirty={setIsDirty}
          setSelectedProfile={setSelectedProfile}
          setShowPasswordInput={setShowPasswordInput}
          setUsers={setUsers}
          showPasswordInput={showPasswordInput}
          showToast={showToast}
          users={users}
        />
      )}

      {/* 모달군(퇴사/부서삭제/오류) + Gutenberg Z-패턴 대차대조 검증 바 + 토스트 */}
      <OrgActionModalsAndAuditBar
        auditSummary={{
          totalUsersCount,
          activeUsersCount,
          leaveUsersCount,
          retiredUsersCount,
          totalDeptsCount,
          assignedUsersCount,
          unassignedUsersCount,
          userBalanceDiff,
        }}
        confirmDeleteDept={confirmDeleteDept}
        confirmRetirement={confirmRetirement}
        deptToDelete={deptToDelete}
        errorModal={errorModal}
        setDeptToDelete={setDeptToDelete}
        setErrorModal={setErrorModal}
        setShowHandoffModal={setShowHandoffModal}
        showHandoffModal={showHandoffModal}
        toastMessage={toastMessage}
      />
    </div>
  );
};
