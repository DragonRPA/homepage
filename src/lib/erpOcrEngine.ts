import "server-only";
import zlib from "zlib";
import { getGroqApiKey } from "@/lib/groqServerKey";

export interface GroqJsonOcrOptions {
  prompt: string;
  imageBase64?: string;
  models?: string[];
  timeoutMs?: number;
  maxTokens?: number;
  maxJsonRetries?: number;
}

function decodeHexCodePoints(dstHex: string): string {
  let str = "";
  for (let i = 0; i < dstHex.length; i += 4) {
    const cp = parseInt(dstHex.slice(i, i + 4), 16);
    if (!Number.isNaN(cp)) {
      str += String.fromCharCode(cp);
    }
  }
  return str;
}

function parseBfCharBlocks(latin: string, cmap: Map<string, string>): void {
  const blockRegex = /beginbfchar([\s\S]*?)(?:endbfchar|$)/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRegex.exec(latin)) !== null) {
    const block = blockMatch[1];
    const charRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let m: RegExpExecArray | null;
    while ((m = charRegex.exec(block)) !== null) {
      const srcHex = m[1].toUpperCase();
      const str = decodeHexCodePoints(m[2]);
      if (str) cmap.set(srcHex, str);
    }
  }
}

function parseBfRangeBlocks(latin: string, cmap: Map<string, string>): void {
  const blockRegex = /beginbfrange([\s\S]*?)(?:endbfrange|$)/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRegex.exec(latin)) !== null) {
    const block = blockMatch[1];

    // 1. Array mapping: <start> <end> [<dst1> <dst2> ...]
    const arrayRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g;
    let arrMatch: RegExpExecArray | null;
    while ((arrMatch = arrayRegex.exec(block)) !== null) {
      const startHex = arrMatch[1];
      const startCode = parseInt(startHex, 16);
      const endCode = parseInt(arrMatch[2], 16);
      if (Number.isNaN(startCode) || Number.isNaN(endCode) || endCode < startCode) {
        continue;
      }
      const width = startHex.length;
      const items = arrMatch[3].match(/<([0-9A-Fa-f]+)>/g) || [];
      const limit = Math.min(items.length, endCode - startCode + 1, 4096);
      for (let idx = 0; idx < limit; idx++) {
        const srcHex = (startCode + idx).toString(16).padStart(width, "0").toUpperCase();
        const dstHex = items[idx].slice(1, -1);
        const str = decodeHexCodePoints(dstHex);
        if (str) cmap.set(srcHex, str);
      }
    }

    // Strip bracketed arrays before sequential 3-tuple matching to prevent inner matches
    const blockWithoutArrays = block.replace(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[[\s\S]*?\]/g,
      " "
    );

    // 2. Sequential range mapping: <start> <end> <dstStart>
    const seqRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let seqMatch: RegExpExecArray | null;
    while ((seqMatch = seqRegex.exec(blockWithoutArrays)) !== null) {
      const startHex = seqMatch[1];
      const startCode = parseInt(startHex, 16);
      const endCode = parseInt(seqMatch[2], 16);
      const dstHex = seqMatch[3];
      if (
        Number.isNaN(startCode) ||
        Number.isNaN(endCode) ||
        endCode < startCode ||
        endCode - startCode > 4096
      ) {
        continue;
      }
      const width = startHex.length;
      const prefix = dstHex.length > 4 ? decodeHexCodePoints(dstHex.slice(0, -4)) : "";
      const dstBase = parseInt(dstHex.slice(-4), 16);
      if (Number.isNaN(dstBase)) continue;
      for (let offset = 0; offset <= endCode - startCode; offset++) {
        const srcHex = (startCode + offset).toString(16).padStart(width, "0").toUpperCase();
        cmap.set(srcHex, prefix + String.fromCharCode(dstBase + offset));
      }
    }
  }
}

/**
 * PDF 바이너리 버퍼에서 zlib 스트림 해제 및 ToUnicode CMap(beginbfchar/beginbfrange) 기반 텍스트 추출
 */
export function extractTextFromPdfBuffer(buf: Buffer): string {
  if (!buf || !Buffer.isBuffer(buf) || buf.length === 0) return "";
  let out = "";
  try {
    out += " " + buf.toString("utf8");
    if (buf.subarray(0, 5).toString("ascii") === "%PDF-") {
      const cmap = new Map<string, string>();
      const decompressedStreams: string[] = [];

      let streamStart = 0;
      while ((streamStart = buf.indexOf("stream", streamStart)) !== -1) {
        if (
          streamStart >= 3 &&
          buf.subarray(streamStart - 3, streamStart + 6).toString("ascii") === "endstream"
        ) {
          streamStart += 6;
          continue;
        }
        streamStart += 6;
        if (buf[streamStart] === 0x0d && buf[streamStart + 1] === 0x0a) {
          streamStart += 2;
        } else if (buf[streamStart] === 0x0a || buf[streamStart] === 0x0d) {
          streamStart += 1;
        }
        const streamEnd = buf.indexOf("endstream", streamStart);
        if (streamEnd === -1) break;

        const slice = buf.subarray(streamStart, streamEnd);
        let dec: Buffer | null = null;
        try {
          dec = zlib.inflateSync(slice);
        } catch {
          try {
            dec = zlib.inflateRawSync(slice);
          } catch {}
        }

        if (dec) {
          const latin = dec.toString("latin1");
          const utf8 = dec.toString("utf8");
          decompressedStreams.push(latin);
          out += " " + utf8;

          if (latin.includes("beginbfchar")) {
            parseBfCharBlocks(latin, cmap);
          }
          if (latin.includes("beginbfrange")) {
            parseBfRangeBlocks(latin, cmap);
          }
        }
        streamStart = streamEnd + 9;
      }

      if (cmap.size > 0) {
        for (const s of decompressedStreams) {
          const hexBlocks = s.match(/<([0-9A-Fa-f]{4,})>/g);
          if (!hexBlocks) continue;
          let line = "";
          for (const hb of hexBlocks) {
            const hex = hb.slice(1, -1).toUpperCase();
            for (let i = 0; i < hex.length; i += 4) {
              const code = hex.slice(i, i + 4);
              if (cmap.has(code)) {
                line += cmap.get(code);
              } else {
                const cp = parseInt(code, 16);
                if (cp >= 0x20 && cp <= 0xd7ff) {
                  line += String.fromCharCode(cp);
                }
              }
            }
            line += " ";
          }
          if (line.trim()) out += "\n" + line;
        }
      }
    }
  } catch (e) {
    console.warn("[erpOcrEngine] PDF buffer text extraction warning:", e);
  }
  return out;
}

/**
 * LLM 원시 응답에서 <think> 태그와 마크다운 코드펜스를 제거하고 최외곽 JSON 객체({...})를 파싱
 */
export function extractCleanJsonObject<T = Record<string, any>>(rawContent: string): T {
  if (!rawContent || typeof rawContent !== "string") {
    throw new Error("Empty or invalid LLM response content");
  }

  let cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  const jsonFenceMatch = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (jsonFenceMatch && jsonFenceMatch[1] && jsonFenceMatch[1].includes("{")) {
    cleaned = jsonFenceMatch[1].trim();
  } else {
    const anyFenceBlocks = Array.from(cleaned.matchAll(/```\s*([\s\S]*?)```/g));
    const jsonBlockCandidate = anyFenceBlocks.find(
      (m) => m[1] && m[1].includes("{") && m[1].includes("}")
    );
    if (jsonBlockCandidate && jsonBlockCandidate[1]) {
      cleaned = jsonBlockCandidate[1].trim();
    } else {
      cleaned = cleaned
        .replace(/```(?:json)?\s*/gi, "")
        .replace(/```/g, "")
        .trim();
    }
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("No JSON object boundary found in LLM output");
  }

  const jsonBlock = cleaned.slice(firstBrace, lastBrace + 1);
  const parsed = JSON.parse(jsonBlock);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Parsed LLM JSON output is not an object");
  }

  return parsed as T;
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Groq Chat Completions 기반 Vision/Text OCR JSON 호출기
 * - Constitution 10.7 준수: JSON 정제 파싱 + 파싱/일시 오류 최대 maxJsonRetries(기본 2회) 재시도 + AbortController 타임아웃 관리
 */
export async function callGroqJsonOcr(
  options: GroqJsonOcrOptions
): Promise<Record<string, any> | null> {
  const {
    prompt,
    imageBase64,
    models,
    timeoutMs = 18000,
    maxTokens = 900,
    maxJsonRetries = 2,
  } = options;

  try {
    const groqApiKey = await getGroqApiKey();
    if (!groqApiKey) return null;

    const hasImage = Boolean(
      imageBase64 &&
        typeof imageBase64 === "string" &&
        (imageBase64.startsWith("data:image/") || /^https?:\/\//i.test(imageBase64))
    );

    const modelsToTry =
      models && models.length > 0
        ? models
        : hasImage
          ? ["qwen/qwen3.8-27b"]
          : ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"];

    const maxRetries = Math.max(0, maxJsonRetries);
    let lastError: unknown = null;

    for (const model of modelsToTry) {
      let retryBecauseJsonError = false;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const effectivePrompt = retryBecauseJsonError
          ? `${prompt}\n\n[시스템 지시]: 이전 응답의 JSON 파싱이 실패했습니다. 마크다운 코드펜스나 부가 설명 없이 반드시 유효한 순수 JSON 객체({...})만 반환하세요.`
          : prompt;

        const messages = [
          {
            role: "user",
            content: hasImage
              ? [
                  { type: "text", text: effectivePrompt },
                  { type: "image_url", image_url: { url: imageBase64 } },
                ]
              : effectivePrompt,
          },
        ];

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages,
              response_format: { type: "json_object" },
              temperature: 0.1,
              max_tokens: maxTokens,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            lastError = new Error(
              `Groq API HTTP ${res.status} (${model}): ${errBody.slice(0, 200)}`
            );
            const isTransientHttp = res.status === 429 || res.status >= 500;
            if (isTransientHttp && attempt < maxRetries) {
              retryBecauseJsonError = false;
              await waitMs(250 * (attempt + 1));
              continue;
            }
            break;
          }

          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (!content || typeof content !== "string") {
            lastError = new Error(`Groq API returned empty content (${model})`);
            retryBecauseJsonError = true;
            if (attempt < maxRetries) continue;
            break;
          }

          try {
            return extractCleanJsonObject<Record<string, any>>(content);
          } catch (parseErr) {
            lastError = parseErr;
            retryBecauseJsonError = true;
            console.warn(
              `[erpOcrEngine] JSON parse failed (model=${model}, attempt=${attempt + 1}/${maxRetries + 1}):`,
              parseErr
            );
          }
        } catch (err: any) {
          lastError = err;
          if (err?.name === "AbortError") {
            console.warn(
              `[erpOcrEngine] Groq OCR timed out after ${timeoutMs}ms (model=${model})`
            );
            break;
          }
          retryBecauseJsonError = false;
          console.warn(
            `[erpOcrEngine] Transient Groq OCR error (model=${model}, attempt=${attempt + 1}/${maxRetries + 1}):`,
            err
          );
          if (attempt < maxRetries) {
            await waitMs(250 * (attempt + 1));
          }
        } finally {
          clearTimeout(timer);
        }
      }
    }

    if (lastError) {
      console.warn("[erpOcrEngine] Groq OCR attempts exhausted:", lastError);
    }
  } catch (err) {
    console.warn("[erpOcrEngine] Groq OCR error:", err);
  }

  return null;
}

/**
 * 대한민국 주요 은행명 표준 정규화
 */
export function normalizeKoreanBankName(raw: string): string {
  if (!raw) return "";
  const s = raw.replace(/\s+/g, "");
  if (/국민|KB/i.test(s)) return "KB국민은행";
  if (/신한/i.test(s)) return "신한은행";
  if (/우리/i.test(s)) return "우리은행";
  if (/하나|KEB/i.test(s)) return "하나은행";
  if (/기업|IBK/i.test(s)) return "IBK기업은행";
  if (/농협|NH/i.test(s)) return "NH농협은행";
  if (/카카오/i.test(s)) return "카카오뱅크";
  if (/토스/i.test(s)) return "토스뱅크";
  if (/케이뱅크/i.test(s)) return "케이뱅크";
  if (/SC|제일/i.test(s)) return "SC제일은행";
  if (/씨티|CITI/i.test(s)) return "한국씨티은행";
  if (/산업|KDB/i.test(s)) return "KDB산업은행";
  if (/수협|Sh/i.test(s)) return "Sh수협은행";
  if (/우체국/i.test(s)) return "우체국";
  if (/새마을/i.test(s)) return "새마을금고";
  if (/신협/i.test(s)) return "신협";
  if (/저축/i.test(s)) return "상호저축은행";
  if (/산림/i.test(s)) return "산림조합";
  return raw.trim();
}

/**
 * 계좌번호 정제 (숫자와 하이픈만 유지, 연속 및 양끝 하이픈 제거)
 */
export function cleanBankAccountNo(raw: string): string {
  if (!raw) return "";
  let cleaned = raw.replace(/[^0-9-]/g, "").replace(/-+/g, "-");
  if (cleaned.startsWith("-")) cleaned = cleaned.slice(1);
  if (cleaned.endsWith("-")) cleaned = cleaned.slice(0, -1);
  return cleaned;
}

/**
 * 사업자등록번호 10자리 표준 포맷팅 (000-00-00000)
 */
export function formatBizRegNo(raw: string): string {
  if (!raw) return "";
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return String(raw).trim();
}

/**
 * 법인등록번호 13자리 표준 포맷팅 (000000-0000000)
 */
export function formatCorpRegNo(raw: string): string {
  if (!raw) return "";
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length === 13) {
    return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  }
  return String(raw).trim();
}
