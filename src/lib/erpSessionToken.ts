export const ERP_SESSION_COOKIE_NAME = "dragonrpa_erp_session";
export const ERP_SESSION_TTL_SECONDS = 60 * 60 * 8; // 8시간

export interface ErpSessionPayload {
  uid: number;
  employeeNo: string;
  loginId: string;
  name: string;
  role: string;
  roleCode: string;
  iat: number;
  exp: number;
}

function getSigningSecret(): string {
  const key =
    process.env.ERP_PII_ENCRYPTION_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  return key;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Edge 및 Node.js 공용 HMAC-SHA256 서명 세션 토큰 생성
 */
export async function signErpSessionToken(
  data: Omit<ErpSessionPayload, "iat" | "exp">,
  ttlSeconds: number = ERP_SESSION_TTL_SECONDS
): Promise<string> {
  const secret = getSigningSecret();
  if (!secret) {
    throw new Error("세션 서명 키(ERP_PII_ENCRYPTION_KEY)가 설정되지 않았습니다.");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: ErpSessionPayload = {
    uid: Number(data.uid),
    employeeNo: String(data.employeeNo || ""),
    loginId: String(data.loginId || ""),
    name: String(data.name || ""),
    role: String(data.role || "USER"),
    roleCode: String(data.roleCode || "EMPLOYEE").toUpperCase(),
    iat: now,
    exp: now + ttlSeconds,
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadB64 = bytesToBase64Url(payloadBytes);
  const key = await importHmacKey(secret);
  const sigBuf = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = bytesToBase64Url(new Uint8Array(sigBuf));

  return `${payloadB64}.${sigB64}`;
}

/**
 * HMAC-SHA256 서명 및 만료시간 검증
 */
export async function verifyErpSessionToken(token: string | null | undefined): Promise<ErpSessionPayload | null> {
  if (!token || typeof token !== "string") return null;
  const trimmed = token.trim();
  const dotIdx = trimmed.indexOf(".");
  if (dotIdx <= 0 || dotIdx === trimmed.length - 1) return null;

  const payloadB64 = trimmed.slice(0, dotIdx);
  const sigB64 = trimmed.slice(dotIdx + 1);
  if (sigB64.includes(".")) return null;

  const secret = getSigningSecret();
  if (!secret) return null;

  try {
    const key = await importHmacKey(secret);
    const sigBytes = base64UrlToBytes(sigB64);
    const valid = await globalThis.crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlToBytes(payloadB64));
    const parsed = JSON.parse(payloadJson) as ErpSessionPayload;
    if (!parsed || !parsed.uid || !parsed.exp) return null;

    const now = Math.floor(Date.now() / 1000);
    if (now >= Number(parsed.exp)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function extractCookieValue(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const k = part.slice(0, eqIdx).trim();
    if (k === name) {
      try {
        return decodeURIComponent(part.slice(eqIdx + 1).trim());
      } catch {
        return part.slice(eqIdx + 1).trim();
      }
    }
  }
  return null;
}
