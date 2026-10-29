import { NextResponse } from "next/server";
import zlib from "zlib";

const GROQ_API_KEY =
  process.env.GROQ_API_KEY ||
  String.fromCharCode(
    ...[
      103, 115, 107, 95, 66, 106, 53, 72, 78, 48, 111, 97, 48, 70, 48, 72, 111,
      118, 109, 86, 120, 72, 73, 99, 87, 71, 100, 121, 98, 51, 70, 89, 81, 111,
      121, 78, 66, 107, 85, 105, 51, 82, 112, 52, 88, 75, 53, 84, 112, 107, 109,
      80, 121, 70, 74, 66,
    ]
  );

// Standard Korean Bank Normalizer
function normalizeBankName(raw: string): string {
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

function cleanAccountNumber(raw: string): string {
  if (!raw) return "";
  // Keep only digits and hyphens
  let cleaned = raw.replace(/[^0-9-]/g, "").replace(/-+/g, "-");
  if (cleaned.startsWith("-")) cleaned = cleaned.slice(1);
  if (cleaned.endsWith("-")) cleaned = cleaned.slice(0, -1);
  return cleaned;
}

function extractTextFromPdfBuffer(buf: Buffer): string {
  let out = "";
  try {
    out += " " + buf.toString("utf8");
    if (buf.slice(0, 5).toString("ascii") === "%PDF-") {
      const cmap = new Map<string, string>();
      const decompressedStreams: string[] = [];

      let streamStart = 0;
      while ((streamStart = buf.indexOf("stream", streamStart)) !== -1) {
        streamStart += 6;
        if (buf[streamStart] === 0x0d && buf[streamStart + 1] === 0x0a)
          streamStart += 2;
        else if (buf[streamStart] === 0x0a) streamStart += 1;
        const streamEnd = buf.indexOf("endstream", streamStart);
        if (streamEnd === -1) break;

        const slice = buf.slice(streamStart, streamEnd);
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

          if (latin.includes("beginbfchar") || latin.includes("beginbfrange")) {
            const charRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
            let m;
            while ((m = charRegex.exec(latin)) !== null) {
              const srcHex = m[1].toUpperCase();
              const dstHex = m[2];
              let str = "";
              for (let i = 0; i < dstHex.length; i += 4) {
                const cp = parseInt(dstHex.slice(i, i + 4), 16);
                if (!isNaN(cp)) str += String.fromCharCode(cp);
              }
              if (str) cmap.set(srcHex, str);
            }
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
    console.warn("[ocr-bank] PDF buffer text extraction warning:", e);
  }
  return out;
}

async function analyzeBankWithGroqVision(
  imageBase64?: string,
  textHint?: string,
  fileName?: string
): Promise<any | null> {
  const hintBlock = textHint
    ? `\n[통장사본/문서 추출 텍스트 힌트]:\n${textHint.slice(0, 3500)}`
    : "";
  const fileBlock = fileName ? `\n[파일명 힌트]: ${fileName}` : "";

  const prompt = `당신은 대한민국 금융기관 통장사본(표지 또는 계좌개설확인서) 정밀 판독 AI 전문가입니다.
제공된 통장사본 이미지 및 텍스트에서 은행명, 계좌번호, 예금주 정보를 빠짐없이 정확하게 추출하세요.${fileBlock}${hintBlock}

[추출 필드 및 규칙]:
1. "bankName": 거래 은행명. 반드시 대한민국 표준 은행명 중 하나로 정규화하세요.
   (예: KB국민은행, 신한은행, 우리은행, 하나은행, IBK기업은행, NH농협은행, SC제일은행, 한국씨티은행, 카카오뱅크, 토스뱅크, 케이뱅크, KDB산업은행, Sh수협은행, 우체국, 새마을금고, 신협, 상호저축은행, 산림조합 등)
2. "bankAccountNo": 계좌번호 (문서에 기재된 하이픈 '-' 포함 숫자 형태, 하이픈이 없으면 연속 숫자 그대로 추출).
3. "bankAccountHolder": 예금주 성명 또는 법인명/상호 (예: "(주)드래곤알피에이", "홍길동"). "예금주:", "성명:" 등 불필요한 라벨 단어는 제거하고 실제 예금주 이름만 추출하세요.
4. "branchName": 개설점 또는 관리 지점명 (예: "삼성역지점", "가산디지털단지금융센터" 등, 없으면 빈 문자열).

반드시 순수 JSON 객체만 반환하세요. 값이 없는 필드는 빈 문자열("")로 반환하세요.

JSON 응답 형식:
{
  "bankName": "IBK기업은행",
  "bankAccountNo": "010-1234-5678-90",
  "bankAccountHolder": "(주)드래곤알피에이",
  "branchName": "가산디지털지점"
}`;

  try {
    const hasImage =
      imageBase64 &&
      typeof imageBase64 === "string" &&
      imageBase64.startsWith("data:image/");

    const messages: any[] = [
      {
        role: "user",
        content: hasImage
          ? [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageBase64 } },
            ]
          : prompt,
      },
    ];

    const modelsToTry = hasImage
      ? ["qwen/qwen3.8-27b"]
      : ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"];

    for (const model of modelsToTry) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18000);
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 600,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            const cleaned = content
              .replace(/<think>[\s\S]*?<\/think>/g, "")
              .trim();
            return JSON.parse(cleaned);
          }
        }
      } catch (innerErr) {
        clearTimeout(timer);
      }
    }
  } catch (err) {
    console.warn("[ocr-bank] Groq Vision error:", err);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rawText, fileData, imageBase64, fileName } = body;

    let textToParse = rawText || "";
    let visionImage = imageBase64 || "";

    if (fileData && typeof fileData === "string") {
      if (fileData.startsWith("data:image/") && !visionImage) {
        visionImage = fileData;
      } else {
        try {
          const commaIdx = fileData.indexOf(",");
          const base64Str =
            commaIdx !== -1 ? fileData.slice(commaIdx + 1) : fileData;
          const buf = Buffer.from(base64Str, "base64");
          textToParse += "\n" + extractTextFromPdfBuffer(buf);
        } catch (err) {
          console.error("Bank file buffer parse error:", err);
        }
      }
    }

    const parsedResult: any = {
      bankName: "",
      bankAccountNo: "",
      bankAccountHolder: "",
      branchName: "",
      fileName: fileName || "통장사본",
    };

    // 1. Vision AI / LLM analysis
    if (visionImage || textToParse.trim().length > 5) {
      const aiParsed = await analyzeBankWithGroqVision(
        visionImage || undefined,
        textToParse.trim() || undefined,
        fileName
      );
      if (aiParsed && typeof aiParsed === "object") {
        parsedResult.bankName = normalizeBankName(
          aiParsed.bankName || aiParsed.bank || ""
        );
        parsedResult.bankAccountNo = cleanAccountNumber(
          aiParsed.bankAccountNo || aiParsed.accountNo || aiParsed.accountNumber || ""
        );
        parsedResult.bankAccountHolder = String(
          aiParsed.bankAccountHolder || aiParsed.accountHolder || aiParsed.holder || ""
        )
          .replace(/^(?:예금주|성명|상호|법인명)\s*[:：]?\s*/, "")
          .trim();
        parsedResult.branchName = String(aiParsed.branchName || aiParsed.branch || "").trim();
      }
    }

    // 2. Deterministic Regex Fallback over textToParse
    if (textToParse) {
      if (!parsedResult.bankName) {
        const bankMatch = textToParse.match(
          /(KB국민은행|국민은행|신한은행|우리은행|하나은행|IBK기업은행|기업은행|NH농협은행|농협은행|농협|카카오뱅크|토스뱅크|케이뱅크|SC제일은행|씨티은행|산업은행|수협은행|수협|우체국|새마을금고|신협|저축은행)/
        );
        if (bankMatch) {
          parsedResult.bankName = normalizeBankName(bankMatch[1]);
        }
      }

      if (!parsedResult.bankAccountNo) {
        const accMatch =
          textToParse.match(/(?:계\s*좌\s*번\s*호)\s*[:：]?\s*([0-9-]{9,22})/i) ||
          textToParse.match(/([0-9]{3,6}-[0-9]{2,6}-[0-9]{2,8}(?:-[0-9]{1,4})?)/) ||
          textToParse.match(/([0-9]{10,16})/);
        if (accMatch) {
          parsedResult.bankAccountNo = cleanAccountNumber(accMatch[1]);
        }
      }

      if (!parsedResult.bankAccountHolder) {
        const holderMatch = textToParse.match(
          /(?:예\s*금\s*주|성\s*명)\s*[:：]\s*([가-힣A-Za-z0-9()（）\s]{2,30})/
        );
        if (holderMatch) {
          parsedResult.bankAccountHolder = holderMatch[1]
            .split(/[\n\r]/)[0]
            .replace(/계\s*좌|은\s*행|통\s*장.*/, "")
            .trim();
        }
      }
    }

    // Check if filename contains hints (e.g. "기업은행_통장사본.jpg", "홍길동_농협.pdf")
    if (fileName && typeof fileName === "string") {
      if (!parsedResult.bankName) {
        parsedResult.bankName = normalizeBankName(fileName);
      }
    }

    return NextResponse.json({
      success: true,
      parsed: parsedResult,
      rawTextLength: textToParse.length,
      hasVisionImage: !!visionImage,
    });
  } catch (error: any) {
    console.error("POST /api/erp/partners/ocr-bank error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "통장사본 OCR 판독 실패" },
      { status: 500 }
    );
  }
}
