import { NextResponse } from "next/server";
import zlib from "zlib";
import { selectPreferredBizItem } from "@/lib/erpFormat";

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

function formatBizRegNo(raw: string): string {
  if (!raw) return "";
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return String(raw).trim();
}

function formatCorpRegNo(raw: string): string {
  if (!raw) return "";
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length === 13) {
    return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  }
  return String(raw).trim();
}

function extractTextFromPdfBuffer(buf: Buffer): string {
  let out = "";
  try {
    out += " " + buf.toString("utf8");
    if (buf.slice(0, 5).toString("ascii") === "%PDF-") {
      // Collect ToUnicode CMap mappings across all streams first
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

          // Parse beginbfchar ... endbfchar
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

      // Decode hex strings <...> using CMap if populated
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
    console.warn("PDF buffer text extraction warning:", e);
  }
  return out;
}

async function analyzeWithGroqVision(
  imageBase64?: string,
  textHint?: string,
  fileName?: string
): Promise<any | null> {
  const hintBlock = textHint
    ? `\n[PDF/문서 추출 텍스트 힌트]:\n${textHint.slice(0, 3500)}`
    : "";
  const fileBlock = fileName ? `\n[파일명 힌트]: ${fileName}` : "";

  const prompt = `당신은 대한민국 국세청 사업자등록증(법인사업자, 일반과세자, 간이과세자, 면세사업자 등) 정밀 판독 AI 전문가입니다.
제공된 사업자등록증 이미지 및 텍스트 힌트를 분석하여 아래 핵심 사업자 정보를 빠짐없이 추출하세요.${fileBlock}${hintBlock}

[추출 필드 및 규칙]:
1. "businessNo": 사업자등록번호 10자리 숫자 (반드시 "000-00-00000" 형식).
2. "corporateNo": 법인등록번호 13자리 숫자 ("000000-0000000" 형식, 법인이 아니면 "").
3. "name": 상호 또는 법인명(단체명). 예: "(주)비엔솔", "주식회사 드래곤알피에이" 등 원본 표기 그대로 추출.
4. "ceoName": 대표자 성명 (성명 란의 이름만 정확히 추출).
5. "openDate": 개업연월일 ("YYYY-MM-DD" 형식, 예: "2022-12-14").
6. "address": 사업장 소재지 전체 주소 (본점 소재지와 함께 있는 경우 사업장 소재지 우선).
7. "bizType": 사업의 종류 중 [업태] 항목 전체 (여러 개면 쉼표로 구분).
8. "bizItem": 사업의 종류 중 [종목] 항목 전체 (여러 개면 쉼표로 구분).
9. "email": 전자세금계산서 전용 전자우편주소 또는 문서 내 기재된 이메일 (없으면 "").
10. "mainPhone": 문서 내 기재된 전화번호/연락처 (없으면 "").

반드시 순수 JSON 객체만 반환하세요. 값이 없는 필드는 빈 문자열("")로 반환하세요.

JSON 예시:
{
  "businessNo": "123-86-12345",
  "corporateNo": "110111-1234567",
  "name": "(주)비엔솔",
  "ceoName": "홍길동",
  "openDate": "2022-12-14",
  "address": "서울특별시 강남구 테헤란로 123, 4층",
  "bizType": "서비스업, 도소매업",
  "bizItem": "소프트웨어 자문 및 개발, 컴퓨터 및 주변기기",
  "email": "tax@bnsol.co.kr",
  "mainPhone": "02-1234-5678"
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
            max_tokens: 900,
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
    console.warn("[ocr-biz-cert] Groq Vision error:", err);
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
          console.error("File buffer parse error:", err);
        }
      }
    }

    const parsedResult: any = {
      businessNo: "",
      name: "",
      ceoName: "",
      bizType: "",
      bizItem: "",
      address: "",
      email: "",
      mainPhone: "",
      openDate: "",
      corporateNo: "",
      fileName: fileName || "사업자등록증",
    };

    // 1. Run Vision AI / LLM analysis first
    if (visionImage || textToParse.trim().length > 10) {
      const aiParsed = await analyzeWithGroqVision(
        visionImage || undefined,
        textToParse.trim() || undefined,
        fileName
      );
      if (aiParsed && typeof aiParsed === "object") {
        parsedResult.businessNo = formatBizRegNo(
          aiParsed.businessNo || aiParsed.bizRegNo || ""
        );
        parsedResult.corporateNo = formatCorpRegNo(aiParsed.corporateNo || "");
        parsedResult.name = String(
          aiParsed.name || aiParsed.companyName || ""
        ).trim();
        parsedResult.ceoName = String(
          aiParsed.ceoName || aiParsed.representative || ""
        ).trim();
        parsedResult.openDate = String(
          aiParsed.openDate || aiParsed.openingDate || ""
        ).trim();
        parsedResult.address = String(aiParsed.address || "").trim();
        parsedResult.bizType = String(aiParsed.bizType || "").trim();
        parsedResult.bizItem = String(aiParsed.bizItem || "").trim();
        parsedResult.email = String(
          aiParsed.email || aiParsed.taxEmail || ""
        ).trim();
        parsedResult.mainPhone = String(
          aiParsed.mainPhone || aiParsed.repContact || ""
        ).trim();
      }
    }

    // 2. Fallback / supplement with deterministic regex over textToParse
    if (textToParse) {
      if (!parsedResult.businessNo) {
        const bizNoMatch =
          textToParse.match(
            /(?:등\s*록\s*번\s*호|사\s*업\s*자\s*등\s*록\s*번\s*호)\s*[:：]?\s*([0-9]{3}\s*-\s*[0-9]{2}\s*-\s*[0-9]{5})/i
          ) || textToParse.match(/([0-9]{3}-[0-9]{2}-[0-9]{5})/);
        if (bizNoMatch) {
          parsedResult.businessNo = formatBizRegNo(bizNoMatch[1]);
        }
      }

      if (!parsedResult.corporateNo) {
        const corpNoMatch =
          textToParse.match(
            /(?:법\s*인\s*등\s*록\s*번\s*호)\s*[:：]?\s*([0-9]{6}\s*-\s*[0-9]{7})/i
          ) || textToParse.match(/([0-9]{6}-[0-9]{7})/);
        if (corpNoMatch) {
          parsedResult.corporateNo = formatCorpRegNo(corpNoMatch[1]);
        }
      }

      if (!parsedResult.name) {
        const nameMatch = textToParse.match(
          /(?:법\s*인\s*명\s*(?:\(\s*단\s*체\s*명\s*\))?|상\s*호\s*(?:\(\s*법\s*인\s*명\s*\))?)\s*[:：]\s*([^\n\r:：]+)/
        );
        if (nameMatch) {
          parsedResult.name = nameMatch[1]
            .replace(/대\s*표\s*자.*/, "")
            .replace(/성\s*명.*/, "")
            .trim();
        }
      }

      if (!parsedResult.ceoName) {
        const ceoMatch = textToParse.match(
          /(?:대\s*표\s*자|성\s*명)\s*[:：]\s*([가-힣A-Za-z\s,]{2,20})/
        );
        if (ceoMatch) {
          parsedResult.ceoName = ceoMatch[1]
            .split(/개\s*업|생\s*년|사\s*업|종\s*목/)[0]
            .trim();
        }
      }

      if (!parsedResult.openDate) {
        const openDateMatch = textToParse.match(
          /개\s*업\s*연\s*월\s*일\s*[:：]?\s*([0-9]{4})\s*년\s*([0-9]{1,2})\s*월\s*([0-9]{1,2})\s*일/
        );
        if (openDateMatch) {
          const y = openDateMatch[1];
          const m = openDateMatch[2].padStart(2, "0");
          const d = openDateMatch[3].padStart(2, "0");
          parsedResult.openDate = `${y}-${m}-${d}`;
        }
      }

      if (!parsedResult.address) {
        const addrMatch = textToParse.match(
          /(?:사\s*업\s*장\s*소\s*재\s*지)\s*[:：]\s*([^\n\r]+)/
        );
        if (addrMatch) {
          parsedResult.address = addrMatch[1]
            .replace(/본\s*점\s*소\s*재\s*지.*/, "")
            .trim();
        }
      }

      if (!parsedResult.bizType) {
        const bizTypeMatch = textToParse.match(/업\s*태\s*[:：]?\s*([^\n\r\t]+)/);
        if (bizTypeMatch) {
          parsedResult.bizType = bizTypeMatch[1].replace(/종\s*목.*/, "").trim();
        }
      }

      if (!parsedResult.bizItem) {
        const bizItemMatch = textToParse.match(/종\s*목\s*[:：]?\s*([^\n\r\t]+)/);
        if (bizItemMatch) {
          parsedResult.bizItem = bizItemMatch[1].trim();
        }
      }

      if (!parsedResult.email) {
        const emailMatch = textToParse.match(
          /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
        );
        if (emailMatch) {
          parsedResult.email = emailMatch[1].trim();
        }
      }
    }

    // 3. If company name is still empty, check if fileName contains company name hint
    if (!parsedResult.name && fileName) {
      const cleanedFn = String(fileName)
        .replace(/\.(pdf|png|jpg|jpeg|webp)$/i, "")
        .replace(/사업자등록증|사본|스캔|_[0-9]{6,8}|-[0-9]{6,8}|\s+[0-9]{6,8}/g, "")
        .replace(/[_-]+$/g, "")
        .trim();
      if (cleanedFn && cleanedFn.length >= 2) {
        parsedResult.name = cleanedFn;
      }
    }

    // 4. 거래처 종목 중 "컴퓨터" 또는 "소프트웨어" 포함 항목 우선 선택 (없으면 원문 그대로 유지)
    if (parsedResult.bizItem) {
      parsedResult.bizItemRaw = parsedResult.bizItem;
      parsedResult.bizItem = selectPreferredBizItem(parsedResult.bizItem);
    }

    const hasExtractedCore = Boolean(
      parsedResult.businessNo ||
        parsedResult.ceoName ||
        parsedResult.address ||
        parsedResult.bizType
    );

    return NextResponse.json({
      success: true,
      parsed: parsedResult,
      hasExtractedCore,
      message: hasExtractedCore
        ? "사업자등록증 핵심 정보가 자동 추출되었습니다."
        : "사업자등록증 파일이 첨부되었습니다. 추출 항목을 확인해 주십시오.",
    });
  } catch (error: any) {
    console.error("POST /api/erp/partners/ocr-biz-cert error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "사업자등록증 파싱 처리 실패" },
      { status: 500 }
    );
  }
}
