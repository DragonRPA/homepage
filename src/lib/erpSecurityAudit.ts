import "server-only";
import type { Pool, PoolClient } from "pg";
import { getErpPool } from "@/lib/supabaseErp";
import { runSchemaInitOnce } from "@/lib/erpSchemaCache";
import {
  ERP_SESSION_COOKIE_NAME,
  ERP_SESSION_TTL_SECONDS,
  ErpSessionPayload,
  extractCookieValue,
  verifyErpSessionToken,
} from "@/lib/erpSessionToken";

const MAX_LOGIN_FAILURES = 5;
const LOCK_DURATION_MS = 10 * 60 * 1000; // 10분
const FAILURE_WINDOW_MS = 10 * 60 * 1000; // 10분

interface LoginAttemptEntry {
  failures: number;
  firstFailedAt: number;
  lockedUntil: number | null;
}

const globalForLoginAttempts = globalThis as unknown as {
  __erpLoginAttemptMap?: Map<string, LoginAttemptEntry>;
};

function getAttemptMap(): Map<string, LoginAttemptEntry> {
  if (!globalForLoginAttempts.__erpLoginAttemptMap) {
    globalForLoginAttempts.__erpLoginAttemptMap = new Map<string, LoginAttemptEntry>();
  }
  return globalForLoginAttempts.__erpLoginAttemptMap;
}

export function getClientIpFromRequest(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 80);
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 80);
  return "unknown";
}

export function isHttpsRequest(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto") || "";
  if (proto.toLowerCase().includes("https")) return true;
  try {
    const url = new URL(request.url);
    if (url.protocol === "https:") return true;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return false;
  } catch {
    // ignore
  }
  return false;
}

export function buildSessionCookieHeader(token: string, secure: boolean): string {
  const parts = [
    `${ERP_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${ERP_SESSION_TTL_SECONDS}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function buildClearSessionCookieHeader(secure: boolean): string {
  const parts = [
    `${ERP_SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function attemptKey(ip: string, loginId: string): string {
  return `${ip.toLowerCase()}::${loginId.trim().toLowerCase()}`;
}

export function checkLoginRateLimit(ip: string, loginId: string): { locked: boolean; retryAfterSec: number } {
  const key = attemptKey(ip, loginId);
  const map = getAttemptMap();
  const entry = map.get(key);
  if (!entry) return { locked: false, retryAfterSec: 0 };

  const now = Date.now();
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSec: Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000)),
    };
  }

  if (now - entry.firstFailedAt > FAILURE_WINDOW_MS) {
    map.delete(key);
  }
  return { locked: false, retryAfterSec: 0 };
}

export function recordLoginFailure(ip: string, loginId: string): { locked: boolean; failures: number; retryAfterSec: number } {
  const key = attemptKey(ip, loginId);
  const map = getAttemptMap();
  const now = Date.now();
  const prev = map.get(key);

  if (!prev || now - prev.firstFailedAt > FAILURE_WINDOW_MS) {
    map.set(key, { failures: 1, firstFailedAt: now, lockedUntil: null });
    return { locked: false, failures: 1, retryAfterSec: 0 };
  }

  const nextFailures = prev.failures + 1;
  if (nextFailures >= MAX_LOGIN_FAILURES) {
    const lockedUntil = now + LOCK_DURATION_MS;
    map.set(key, { failures: nextFailures, firstFailedAt: prev.firstFailedAt, lockedUntil });
    return { locked: true, failures: nextFailures, retryAfterSec: Math.ceil(LOCK_DURATION_MS / 1000) };
  }

  map.set(key, { failures: nextFailures, firstFailedAt: prev.firstFailedAt, lockedUntil: null });
  return { locked: false, failures: nextFailures, retryAfterSec: 0 };
}

export function clearLoginFailures(ip: string, loginId: string): void {
  getAttemptMap().delete(attemptKey(ip, loginId));
}

export async function getErpSessionFromRequest(request: Request): Promise<ErpSessionPayload | null> {
  const token = extractCookieValue(request.headers.get("cookie"), ERP_SESSION_COOKIE_NAME);
  if (!token) return null;
  return verifyErpSessionToken(token);
}

export async function ensureSecurityAuditSchema(executor?: Pool | PoolClient): Promise<void> {
  return runSchemaInitOnce("erp_security_audit_logs_v1", async () => {
    const db = executor || getErpPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS erp_security_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        actor_id BIGINT,
        actor_login_id VARCHAR(100),
        actor_name VARCHAR(100),
        target_resource VARCHAR(120),
        ip_address VARCHAR(80),
        user_agent TEXT,
        detail JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await db
      .query(
        `CREATE INDEX IF NOT EXISTS idx_erp_security_audit_created ON erp_security_audit_logs (created_at DESC)`
      )
      .catch(() => {});
    await db
      .query(
        `CREATE INDEX IF NOT EXISTS idx_erp_security_audit_event_created ON erp_security_audit_logs (event_type, created_at DESC)`
      )
      .catch(() => {});
  });
}

export interface SecurityAuditEventInput {
  eventType:
    | "LOGIN_SUCCESS"
    | "LOGIN_FAIL"
    | "ACCOUNT_LOCKED"
    | "LOGOUT"
    | "PASSWORD_CHANGE"
    | "PII_READ"
    | "SHAREHOLDER_PII_ACCESS"
    | "SHAREHOLDER_PII_WRITE";
  actorId?: number | null;
  actorLoginId?: string | null;
  actorName?: string | null;
  targetResource?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  detail?: Record<string, unknown>;
}

/**
 * 개인정보 보호법 안전성 확보조치 기준 접속·처리 감사로그 적재 (본 비즈니스 흐름 비차단)
 */
export async function logSecurityAuditEvent(input: SecurityAuditEventInput): Promise<void> {
  try {
    const pool = getErpPool();
    await ensureSecurityAuditSchema(pool);
    await pool.query(
      `INSERT INTO erp_security_audit_logs (
        event_type, actor_id, actor_login_id, actor_name,
        target_resource, ip_address, user_agent, detail
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        input.eventType,
        input.actorId ?? null,
        input.actorLoginId ?? null,
        input.actorName ?? null,
        input.targetResource ?? null,
        input.ipAddress ?? null,
        input.userAgent ? String(input.userAgent).slice(0, 500) : null,
        JSON.stringify(input.detail || {}),
      ]
    );
  } catch (err) {
    console.error("[erpSecurityAudit] 감사로그 기록 오류:", err);
  }
}
