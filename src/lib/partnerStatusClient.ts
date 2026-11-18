/**
 * 거래처 국세청 휴·폐업 상태 판정 및 거래불가(차단) 판별 단일 진실 원천(SSOT) 유틸
 * 클라이언트(UI)와 서버(API) 양쪽에서 동일한 비즈니스 규칙을 공유한다.
 */

export type NtsBizState = "ACTIVE" | "SUSPENDED" | "CLOSED" | "UNREGISTERED";
export type PartnerStatusType = "ACTIVE" | "BLOCKED" | "INACTIVE" | "DORMANT";

export interface PartnerTradeCheckTarget {
  id?: number | string | null;
  name?: string | null;
  customerName?: string | null;
  businessNo?: string | null;
  status?: string | null;
  ntsBizState?: string | null;
  ntsTaxType?: string | null;
  ntsClosedDate?: string | null;
}

export interface PartnerTradeBlockInfo {
  blocked: boolean;
  badgeText: string;
  badgeColor: "rose" | "blue";
  statusLabel: string;
  reason: string;
}

/** 사업자등록번호 문자열에서 숫자만 추출한다. */
export function normalizeBizNoDigits(raw?: string | null): string {
  return String(raw || "").replace(/[^0-9]/g, "");
}

/** 10자리 사업자등록번호를 XXX-XX-XXXXX 형식으로 정규화한다. */
export function formatBizNoHyphen(raw?: string | null): string {
  const digits = normalizeBizNoDigits(raw);
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return String(raw || "").trim();
}

/** 거래처 상태 또는 국세청 휴·폐업 상태 기준으로 거래 차단 대상인지 판별한다. */
export function isPartnerTradeBlocked(p?: PartnerTradeCheckTarget | null): boolean {
  if (!p) return false;
  const status = String(p.status || "").toUpperCase();
  const ntsState = String(p.ntsBizState || "").toUpperCase();
  return (
    status === "BLOCKED" ||
    status === "INACTIVE" ||
    ntsState === "SUSPENDED" ||
    ntsState === "CLOSED"
  );
}

/** 거래불가 사유 및 UI 배지/메시지 메타정보를 반환한다. */
export function getPartnerTradeBlockInfo(p?: PartnerTradeCheckTarget | null): PartnerTradeBlockInfo {
  if (!p) {
    return { blocked: false, badgeText: "", badgeColor: "blue", statusLabel: "정상", reason: "" };
  }
  const status = String(p.status || "").toUpperCase();
  const ntsState = String(p.ntsBizState || "").toUpperCase();
  const closedDateSuffix = p.ntsClosedDate ? `(${p.ntsClosedDate})` : "";

  if (ntsState === "CLOSED") {
    return {
      blocked: true,
      badgeText: "거래불가(폐업)",
      badgeColor: "rose",
      statusLabel: "거래불가",
      reason: `국세청 폐업자${p.ntsClosedDate ? `(폐업일: ${p.ntsClosedDate})` : ""}로 확인되어 거래가 차단된 거래처입니다.`,
    };
  }
  if (ntsState === "SUSPENDED") {
    return {
      blocked: true,
      badgeText: "거래불가(휴업)",
      badgeColor: "rose",
      statusLabel: "거래불가",
      reason: `국세청 휴업자${closedDateSuffix}로 확인되어 거래가 차단된 거래처입니다.`,
    };
  }
  if (status === "BLOCKED") {
    return {
      blocked: true,
      badgeText: "거래불가",
      badgeColor: "rose",
      statusLabel: "거래불가",
      reason: "거래불가 상태로 지정된 거래처입니다.",
    };
  }
  if (status === "INACTIVE") {
    return {
      blocked: true,
      badgeText: "거래중지",
      badgeColor: "rose",
      statusLabel: "거래중지",
      reason: "거래중지 상태로 지정된 거래처입니다.",
    };
  }
  return {
    blocked: false,
    badgeText: "",
    badgeColor: "blue",
    statusLabel: status === "DORMANT" ? "휴면" : "정상",
    reason: "",
  };
}

/** 거래처 목록에서 ID / 사업자번호 / 상호명으로 매칭되는 거래불가 대상을 찾는다. */
export function findBlockedPartnerMatch<T extends PartnerTradeCheckTarget>(
  partners: T[],
  query: {
    partnerId?: number | string | null;
    name?: string | null;
    businessNo?: string | null;
  }
): T | null {
  if (!Array.isArray(partners) || partners.length === 0) return null;

  const pid = query.partnerId !== undefined && query.partnerId !== null && String(query.partnerId).trim() !== ""
    ? Number(query.partnerId)
    : null;
  const bizDigits = normalizeBizNoDigits(query.businessNo);
  const cleanName = String(query.name || "").trim();

  let matched: T | undefined;
  if (pid && !Number.isNaN(pid)) {
    matched = partners.find((p) => Number(p.id) === pid);
  }
  if (!matched && bizDigits.length === 10) {
    matched = partners.find((p) => normalizeBizNoDigits(p.businessNo) === bizDigits);
  }
  if (!matched && cleanName) {
    matched = partners.find((p) => String(p.name || p.customerName || "").trim() === cleanName);
  }

  if (matched && isPartnerTradeBlocked(matched)) {
    return matched;
  }
  return null;
}

/** 국세청 상태 코드별 짧은 한국어 배지 문구를 반환한다. */
export function getNtsBizStateBadgeLabel(ntsBizState?: string | null): string {
  switch (String(ntsBizState || "").toUpperCase()) {
    case "ACTIVE":
      return "계속";
    case "SUSPENDED":
      return "휴업자";
    case "CLOSED":
      return "폐업자";
    case "UNREGISTERED":
      return "미등록";
    default:
      return "미조회";
  }
}
