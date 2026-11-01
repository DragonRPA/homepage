import "server-only";
import crypto from "crypto";

/**
 * 🏛️ Cloudflare R2 ERP 전용 독립 비공개 버킷 (dragonrpa-erp-private) 클라이언트
 * - AWS SDK 외부 의존성 없이 Node.js 내장 crypto를 이용한 S3 Signature V4 서명 구현
 * - 공개 개발 URL(r2.dev)이 차단된 100% Private 버킷 전용
 */

const R2_ACCOUNT_ID = process.env.R2_ERP_ACCOUNT_ID || "35014a2514680107d74e1e68d96e6c32";
const R2_BUCKET = process.env.R2_ERP_BUCKET_NAME || "dragonrpa-erp-private";
const R2_ACCESS_KEY_ID = process.env.R2_ERP_ACCESS_KEY_ID || "9eced126757ba14f6df081a6c2900927";
const R2_SECRET_ACCESS_KEY =
  process.env.R2_ERP_SECRET_ACCESS_KEY ||
  "820b046809e86e87930ec1dcc592c7a579e2f3e56c2bf181b2ce5c39d9a08dbd";
const R2_HOST = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_REGION = "auto";
const R2_SERVICE = "s3";

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
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = buildCanonicalUri(R2_BUCKET, objectKey);
  const payloadHash = sha256Hex(body);

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${R2_HOST}\n` +
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

  const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, R2_REGION, R2_SERVICE);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${R2_HOST}${canonicalUri}`;
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
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = buildCanonicalUri(R2_BUCKET, objectKey);
  const payloadHash = sha256Hex("");

  const canonicalHeaders =
    `host:${R2_HOST}\n` +
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

  const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, R2_REGION, R2_SERVICE);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${R2_HOST}${canonicalUri}`;
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
