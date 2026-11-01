import "server-only";
import crypto from "crypto";
import { getErpPool } from "@/lib/supabaseErp";
import { decryptPii } from "@/lib/piiCrypto";

/**
 * 🏛️ Cloudflare R2 ERP 전용 독립 비공개 버킷 (dragonrpa-erp-private) 클라이언트
 * - AWS SDK 외부 의존성 없이 Node.js 내장 crypto를 이용한 S3 Signature V4 서명 구현
 * - 공개 개발 URL(r2.dev)이 차단된 100% Private 버킷 전용
 * - 키값은 소스코드에 절대 포함하지 않으며, 서버 환경변수(.env.local) 또는 백엔드 암호화 볼트(erp_system_secrets)에서만 로드
 */

const R2_REGION = "auto";
const R2_SERVICE = "s3";

interface R2ResolvedConfig {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  host: string;
}

let cachedR2Config: R2ResolvedConfig | null = null;

async function resolveR2Config(): Promise<R2ResolvedConfig> {
  if (cachedR2Config) return cachedR2Config;

  let accountId = process.env.R2_ERP_ACCOUNT_ID?.trim() || "";
  let bucket = process.env.R2_ERP_BUCKET_NAME?.trim() || "";
  let accessKeyId = process.env.R2_ERP_ACCESS_KEY_ID?.trim() || "";
  let secretAccessKey = process.env.R2_ERP_SECRET_ACCESS_KEY?.trim() || "";

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
    const pool = getErpPool();
    const res = await pool.query(`
      SELECT secret_key, encrypted_value
      FROM erp_system_secrets
      WHERE secret_key IN (
        'R2_ERP_ACCOUNT_ID',
        'R2_ERP_BUCKET_NAME',
        'R2_ERP_ACCESS_KEY_ID',
        'R2_ERP_SECRET_ACCESS_KEY'
      )
    `);
    const map: Record<string, string> = {};
    for (const r of res.rows) {
      map[String(r.secret_key)] = decryptPii(String(r.encrypted_value));
    }
    accountId = accountId || map.R2_ERP_ACCOUNT_ID || "";
    bucket = bucket || map.R2_ERP_BUCKET_NAME || "dragonrpa-erp-private";
    accessKeyId = accessKeyId || map.R2_ERP_ACCESS_KEY_ID || "";
    secretAccessKey = secretAccessKey || map.R2_ERP_SECRET_ACCESS_KEY || "";
  }

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 백엔드 보안 키 설정이 누락되었습니다 (erp_system_secrets 확인 필요).");
  }

  cachedR2Config = {
    accountId,
    bucket: bucket || "dragonrpa-erp-private",
    accessKeyId,
    secretAccessKey,
    host: `${accountId}.r2.cloudflarestorage.com`,
  };
  return cachedR2Config;
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = hmacSha256("AWS4" + key, dateStamp);
  const kRegion = hmacSha256(kDate, regionName);
  const kService = hmacSha256(kRegion, serviceName);
  const kSigning = hmacSha256(kService, "aws4_request");
  return kSigning;
}

function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildCanonicalUri(bucket: string, objectKey: string): string {
  const cleanKey = objectKey.replace(/^\/+/, "");
  const encodedSegments = [bucket, ...cleanKey.split("/")].map(encodeRfc3986);
  return "/" + encodedSegments.join("/");
}

/**
 * ERP 전용 R2 비공개 버킷에 객체 업로드 (PUT Object)
 */
export async function putErpPrivateObject(
  objectKey: string,
  body: Buffer,
  contentType: string = "application/pdf"
): Promise<{ key: string; etag?: string; size: number }> {
  const cfg = await resolveR2Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = buildCanonicalUri(cfg.bucket, objectKey);
  const payloadHash = sha256Hex(body);

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${cfg.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(cfg.secretAccessKey, dateStamp, R2_REGION, R2_SERVICE);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${cfg.host}${canonicalUri}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorizationHeader,
    },
    body: new Uint8Array(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`R2 PUT 실패 (${res.status}): ${errText}`);
  }

  return {
    key: objectKey.replace(/^\/+/, ""),
    etag: res.headers.get("etag") || undefined,
    size: body.length,
  };
}

/**
 * ERP 전용 R2 비공개 버킷에서 객체 다운로드 (GET Object)
 */
export async function getErpPrivateObject(
  objectKey: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const cfg = await resolveR2Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = buildCanonicalUri(cfg.bucket, objectKey);
  const payloadHash = sha256Hex("");

  const canonicalHeaders =
    `host:${cfg.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "GET",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(cfg.secretAccessKey, dateStamp, R2_REGION, R2_SERVICE);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${cfg.host}${canonicalUri}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorizationHeader,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`R2 GET 실패 (${res.status}): ${errText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "application/pdf";
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}
