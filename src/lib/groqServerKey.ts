import "server-only";
import { getErpPool } from "./supabaseErp";
import { decryptPii } from "./piiCrypto";

let cachedGroqKey: { value: string; expiresAt: number } | null = null;

/**
 * 서버 전용 Groq API 키 조회 (환경변수 우선, 미설정 시 암호화된 DB 설정 복호화)
 * - 클라이언트 번들이나 소스코드 평문 노출 금지
 */
export async function getGroqApiKey(): Promise<string> {
  const envKey = process.env.GROQ_API_KEY?.trim();
  if (envKey) return envKey;

  const now = Date.now();
  if (cachedGroqKey && cachedGroqKey.value && now < cachedGroqKey.expiresAt) {
    return cachedGroqKey.value;
  }

  try {
    const pool = getErpPool();
    const res = await pool.query(
      `SELECT groq_api_key FROM erp_ai_intel_settings WHERE id = 1 LIMIT 1`
    );
    const enc = res.rows[0]?.groq_api_key;
    if (enc) {
      const dec = decryptPii(String(enc)).trim();
      if (dec) {
        cachedGroqKey = { value: dec, expiresAt: now + 5 * 60 * 1000 };
        return dec;
      }
    }
  } catch (err) {
    console.error("[groqServerKey] DB lookup failed:", err);
  }

  return "";
}
