import "server-only";
import crypto from "crypto";

/**
 * 🏛️ 개인정보 보호법(제24조의2, 제29조) 및「개인정보의 안전성 확보조치 기준」제7조 준수 암호화 모듈
 * 1. 고유식별정보(주민등록번호) 및 민감 금융정보: AES-256-GCM 양방향 암호화 (IV 12bytes + AuthTag 16bytes)
 * 2. 비밀번호(로그인 패스워드): Node.js crypto.scrypt 기반 단방향 솔트 해시 (복호화 불가)
 */

const ENC_PREFIX = "enc:v1:";
const PWD_PREFIX = "scrypt$";

function getMasterKey(): Buffer {
  const secret =
    process.env.ERP_PII_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dragonrpa_pipa_aes256_master_key_2026_v1_secure_vault";
  return crypto.createHash("sha256").update(secret, "utf8").digest(); // 32 bytes (256 bits)
}

/**
 * 평문 데이터를 AES-256-GCM으로 암호화하여 `enc:v1:<iv_hex>:<tag_hex>:<cipher_hex>` 문자열 반환
 * 이미 암호화된 문자열(`enc:v1:...`)이거나 빈 값이면 그대로 반환 (멱등성 보장)
 */
export function encryptPii(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined) return null;
  const trimmed = String(plaintext).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith(ENC_PREFIX)) return trimmed;

  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENC_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * `enc:v1:...` 암호문을 복호화하여 원문 반환
 * 암호화 프리픽스가 없는 레거시 평문인 경우 원문 그대로 반환 (무중단 호환성 보장)
 */
export function decryptPii(ciphertext: string | null | undefined): string {
  if (ciphertext === null || ciphertext === undefined) return "";
  const trimmed = String(ciphertext).trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith(ENC_PREFIX)) return trimmed;

  try {
    const payload = trimmed.slice(ENC_PREFIX.length);
    const [ivHex, tagHex, dataHex] = payload.split(":");
    if (!ivHex || !tagHex || !dataHex) return "";

    const key = getMasterKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const encryptedData = Buffer.from(dataHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("[piiCrypto] Decryption failed:", err);
    return "";
  }
}

/**
 * 주민등록번호 마스킹 (`970709-1009917` -> `970709-1******`)
 */
export function maskResidentRegNo(rawOrEncrypted: string | null | undefined): string {
  const plain = decryptPii(rawOrEncrypted);
  if (!plain) return "";
  const clean = plain.replace(/[^0-9]/g, "");
  if (clean.length >= 7) {
    return `${clean.slice(0, 6)}-${clean.slice(6, 7)}******`;
  }
  return plain;
}

/**
 * 비밀번호 단방향 암호화 (scrypt + 16바이트 난수 Salt)
 * 형식: `scrypt$<salt_hex>$<derived_hex>`
 */
export function hashPassword(plainPassword: string): string {
  const trimmed = String(plainPassword).trim();
  if (trimmed.startsWith(PWD_PREFIX)) return trimmed;
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(trimmed, salt, 64).toString("hex");
  return `${PWD_PREFIX}${salt}$${derived}`;
}

/**
 * 비밀번호 검증 (단방향 해시 및 레거시 평문 하위호환 지원)
 */
export function verifyPassword(inputPassword: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !inputPassword) return false;
  const trimmedStored = String(storedHash).trim();
  const trimmedInput = String(inputPassword).trim();

  if (trimmedStored.startsWith(PWD_PREFIX)) {
    const parts = trimmedStored.slice(PWD_PREFIX.length).split("$");
    if (parts.length !== 2) return false;
    const [salt, keyHex] = parts;
    const keyBuf = Buffer.from(keyHex, "hex");
    const derivedBuf = crypto.scryptSync(trimmedInput, salt, 64);
    if (keyBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedBuf);
  }

  // 레거시 평문 비교 Fallback
  return trimmedStored === trimmedInput;
}
