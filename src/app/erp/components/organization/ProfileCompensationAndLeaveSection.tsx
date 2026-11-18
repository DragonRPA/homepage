"use client";

import React from "react";
import type { UserNode } from "./organizationTypes";
import { cleanErpNumber, toErpInputString } from "@/lib/erpFormat";

const BANK_OPTIONS = [
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
] as const;

type InsuranceFieldKey =
  | "insNationalPension"
  | "insHealthInsurance"
  | "insEmploymentInsurance"
  | "insIndustrialAccident";

const INSURANCE_ITEMS: ReadonlyArray<{ key: InsuranceFieldKey; label: string }> = [
  { key: "insNationalPension", label: "국민연금" },
  { key: "insHealthInsurance", label: "건강보험 (장기요양)" },
  { key: "insEmploymentInsurance", label: "고용보험" },
  { key: "insIndustrialAccident", label: "산재보험" },
];

type WageFieldKey = "baseSalary" | "hourlyWage" | "mealAllowance" | "vehicleAllowance";

export interface ProfileCompensationAndLeaveSectionProps {
  canEdit: boolean;
  canViewPayroll: boolean;
  handleWageInputChange: (field: WageFieldKey, rawValue: string) => void;
  selectedProfile: UserNode;
  setSelectedProfile: React.Dispatch<React.SetStateAction<UserNode | null>>;
}

const WAGE_INPUT_STYLE: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: "13px",
  fontWeight: "bold",
  width: "100%",
  borderRadius: "4px",
  textAlign: "right",
};

const WAGE_LABEL_STYLE: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "bold",
  color: "var(--text-main)",
  display: "block",
  whiteSpace: "nowrap",
};

const BULK_INSURANCE_BTN_STYLE: React.CSSProperties = {
  fontSize: "10px",
  padding: "1.5px 6px",
  borderRadius: "3px",
  border: "1px solid var(--border-color)",
  backgroundColor: "var(--bg-app)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontWeight: 600,
};

/**
 * 임직원 상세 프로필 패널 내 급여계좌, 계약 급여/수당 및 4대보험 가입 정보 섹션.
 */
export const ProfileCompensationAndLeaveSection: React.FC<
  ProfileCompensationAndLeaveSectionProps
> = ({
  canEdit,
  canViewPayroll,
  handleWageInputChange,
  selectedProfile,
  setSelectedProfile,
}) => {
  const formatWageValue = (val: number | undefined | null) =>
    val === undefined || val === null ? "" : toErpInputString(val);

  const setAllInsurance = (checked: boolean) => {
    setSelectedProfile({
      ...selectedProfile,
      insNationalPension: checked,
      insHealthInsurance: checked,
      insEmploymentInsurance: checked,
      insIndustrialAccident: checked,
    });
  };

  const monthlyWageTotal =
    cleanErpNumber(selectedProfile.baseSalary) +
    cleanErpNumber(selectedProfile.mealAllowance) +
    cleanErpNumber(selectedProfile.vehicleAllowance);

  const hasCustomBank =
    Boolean(selectedProfile.salaryBankName) &&
    !BANK_OPTIONS.includes(selectedProfile.salaryBankName as (typeof BANK_OPTIONS)[number]);

  return (
    <>
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
              {BANK_OPTIONS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
              {hasCustomBank && (
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
            <label style={WAGE_LABEL_STYLE}>계약 기본급 (원)</label>
            <input
              type="text"
              inputMode="numeric"
              style={WAGE_INPUT_STYLE}
              placeholder="0"
              value={formatWageValue(selectedProfile.baseSalary)}
              onChange={(e) => handleWageInputChange("baseSalary", e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ ...WAGE_LABEL_STYLE, color: "var(--primary)" }}>통상임금 (원)</label>
            <input
              type="text"
              inputMode="numeric"
              style={WAGE_INPUT_STYLE}
              placeholder="0"
              value={formatWageValue(selectedProfile.hourlyWage)}
              onChange={(e) => handleWageInputChange("hourlyWage", e.target.value)}
              disabled={!canEdit}
            />
          </div>

          {/* 수당 항목: 식대 및 차량보조금 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "2px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={WAGE_LABEL_STYLE}>식대 (원)</label>
              <input
                type="text"
                inputMode="numeric"
                style={WAGE_INPUT_STYLE}
                placeholder="0"
                value={formatWageValue(selectedProfile.mealAllowance)}
                onChange={(e) => handleWageInputChange("mealAllowance", e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={WAGE_LABEL_STYLE}>차량보조금 (원)</label>
              <input
                type="text"
                inputMode="numeric"
                style={WAGE_INPUT_STYLE}
                placeholder="0"
                value={formatWageValue(selectedProfile.vehicleAllowance)}
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
            <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>월 급여 합계</span>
            <strong style={{ color: "var(--primary)", fontSize: "12.5px" }}>
              {monthlyWageTotal.toLocaleString()}원
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
                    onClick={() => setAllInsurance(true)}
                    style={BULK_INSURANCE_BTN_STYLE}
                  >
                    전체선택
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllInsurance(false)}
                    style={BULK_INSURANCE_BTN_STYLE}
                  >
                    전체해제
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {INSURANCE_ITEMS.map((item) => {
                const isChecked = selectedProfile[item.key] !== false;
                return (
                  <label
                    key={item.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 8px",
                      borderRadius: "4px",
                      border: `1px solid ${isChecked ? "var(--primary)" : "var(--border-color)"}`,
                      backgroundColor: isChecked ? "var(--bg-app)" : "transparent",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: canEdit ? "pointer" : "default",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setSelectedProfile({
                          ...selectedProfile,
                          [item.key]: e.target.checked,
                        })
                      }
                      disabled={!canEdit}
                      style={{
                        width: "14px",
                        height: "14px",
                        accentColor: "var(--primary)",
                        cursor: canEdit ? "pointer" : "default",
                      }}
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
