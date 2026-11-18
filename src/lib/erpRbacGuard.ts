import "server-only";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import {
  ErpSessionPayload,
  ERP_SESSION_COOKIE_NAME,
  extractCookieValue,
  verifyErpSessionToken,
} from "@/lib/erpSessionToken";
import {
  getClientIpFromRequest,
  logSecurityAuditEvent,
} from "@/lib/erpSecurityAudit";

interface CachedPermEntry {
  canView: boolean;
  canSave: boolean;
  canBill: boolean;
}

interface CachedRolePerms {
  perms: Map<string, CachedPermEntry>;
  expiresAt: number;
}

const RBAC_CACHE_TTL_MS = 60 * 1000; // 60초 메모리 캐시

const globalForRbac = globalThis as unknown as {
  __erpRbacCache?: Map<string, CachedRolePerms>;
};

function getRbacCache(): Map<string, CachedRolePerms> {
  if (!globalForRbac.__erpRbacCache) {
    globalForRbac.__erpRbacCache = new Map<string, CachedRolePerms>();
  }
  return globalForRbac.__erpRbacCache;
}

export function invalidateRbacCache(roleCode?: string): void {
  const cache = getRbacCache();
  if (roleCode) {
    cache.delete(roleCode.toUpperCase());
  } else {
    cache.clear();
  }
}

function normalizeKey(key: string): string[] {
  const trimmed = key.trim().toLowerCase();
  const underscore = trimmed.replace(/-/g, "_");
  const singular = underscore.endsWith("s") ? underscore.slice(0, -1) : underscore;
  const plural = underscore.endsWith("s") ? underscore : `${underscore}s`;
  const uppercase = key.trim().toUpperCase().replace(/-/g, "_");

  return Array.from(new Set([trimmed, underscore, singular, plural, uppercase]));
}

export async function getRolePermissionMap(
  roleCode: string
): Promise<Map<string, CachedPermEntry>> {
  const normalizedRole = roleCode.trim().toUpperCase();
  const cache = getRbacCache();
  const now = Date.now();
  const cached = cache.get(normalizedRole);

  if (cached && cached.expiresAt > now) {
    return cached.perms;
  }

  const pool = getErpPool();
  const res = await pool.query(
    `SELECT menu_key, can_view, can_save, can_bill
     FROM erp_role_permissions
     WHERE role_code = $1`,
    [normalizedRole]
  );

  const permMap = new Map<string, CachedPermEntry>();
  for (const row of res.rows) {
    const entry: CachedPermEntry = {
      canView: Boolean(row.can_view),
      canSave: Boolean(row.can_save),
      canBill: Boolean(row.can_bill),
    };
    const rawKey = String(row.menu_key || "");
    for (const variant of normalizeKey(rawKey)) {
      permMap.set(variant, entry);
    }
  }

  cache.set(normalizedRole, {
    perms: permMap,
    expiresAt: now + RBAC_CACHE_TTL_MS,
  });

  return permMap;
}

export interface RbacGuardResult {
  authorized: boolean;
  session: ErpSessionPayload | null;
  response?: NextResponse;
}

/**
 * 서버 API 계층의 세부 메뉴 역할 권한(canView / canSave / canBill) 검증 가드
 * - ADMIN 역할은 모든 메뉴/동작 100% 무조건 허용
 * - 비관리자 세션은 60초 메모리 캐시 기반으로 erp_role_permissions 조회 검증
 */
export async function requireMenuPermission(
  request: Request,
  menuKeys: string | string[],
  action: "view" | "save" | "bill" = "view"
): Promise<RbacGuardResult> {
  // 1. 미들웨어 전달 헤더 선행 확인 또는 쿠키 직접 검증
  const headerUid = request.headers.get("x-erp-uid");
  const headerRole = request.headers.get("x-erp-role-code");
  const headerLoginId = request.headers.get("x-erp-login-id");

  let session: ErpSessionPayload | null = null;

  const token = extractCookieValue(
    request.headers.get("cookie"),
    ERP_SESSION_COOKIE_NAME
  );
  if (token) {
    session = await verifyErpSessionToken(token);
  }

  if (!session && headerUid && headerRole && headerLoginId) {
    session = {
      uid: Number(headerUid),
      employeeNo: "",
      roleCode: headerRole,
      role: headerRole,
      loginId: headerLoginId,
      name: headerLoginId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  if (!session) {
    return {
      authorized: false,
      session: null,
      response: NextResponse.json(
        { success: false, error: "인증 세션이 필요합니다." },
        { status: 401 }
      ),
    };
  }

  // 2. ADMIN 계정은 모든 권한 패스
  if (session.roleCode === "ADMIN" || session.loginId === "admin") {
    return { authorized: true, session };
  }

  // 3. 비관리자 역할의 메뉴 권한 검증
  const roleMap = await getRolePermissionMap(session.roleCode);
  const targetKeys = Array.isArray(menuKeys) ? menuKeys : [menuKeys];

  let hasPermission = false;
  for (const rawTarget of targetKeys) {
    for (const variant of normalizeKey(rawTarget)) {
      const perm = roleMap.get(variant);
      if (perm) {
        if (action === "view" && perm.canView) {
          hasPermission = true;
          break;
        }
        if (action === "save" && perm.canSave) {
          hasPermission = true;
          break;
        }
        if (action === "bill" && perm.canBill) {
          hasPermission = true;
          break;
        }
      }
    }
    if (hasPermission) break;
  }

  if (!hasPermission) {
    const actionLabel =
      action === "view" ? "열람" : action === "save" ? "저장·수정" : "정산·청구";
    return {
      authorized: false,
      session,
      response: NextResponse.json(
        {
          success: false,
          error: `해당 기능에 대한 ${actionLabel} 권한이 없습니다. (역할: ${session.roleCode})`,
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, session };
}

/**
 * 개인정보(PII) 열람 시 감사로그 적재 헬퍼 (비즈니스 처리 비차단)
 */
export async function logPiiReadAudit(
  request: Request,
  session: ErpSessionPayload | null,
  targetResource: string,
  detail: Record<string, unknown>
): Promise<void> {
  const ip = getClientIpFromRequest(request);
  const ua = request.headers.get("user-agent") || undefined;
  await logSecurityAuditEvent({
    eventType: "PII_READ",
    actorId: session?.uid ?? null,
    actorLoginId: session?.loginId ?? null,
    actorName: session?.name ?? session?.loginId ?? null,
    targetResource,
    ipAddress: ip,
    userAgent: ua,
    detail,
  });
}
