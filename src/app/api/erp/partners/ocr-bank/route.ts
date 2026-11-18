export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import {
  callGroqJsonOcr,
  cleanBankAccountNo,
  extractTextFromPdfBuffer,
  normalizeKoreanBankName,
} from "@/lib/erpOcrEngine";

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

  return callGroqJsonOcr({
    prompt,
    imageBase64,
    timeoutMs: 18000,
    maxTokens: 600,
  });
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
        parsedResult.bankName = normalizeKoreanBankName(
          aiParsed.bankName || aiParsed.bank || ""
        );
        parsedResult.bankAccountNo = cleanBankAccountNo(
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
          parsedResult.bankName = normalizeKoreanBankName(bankMatch[1]);
        }
      }

      if (!parsedResult.bankAccountNo) {
        const accMatch =
          textToParse.match(/(?:계\s*좌\s*번\s*호)\s*[:：]?\s*([0-9-]{9,22})/i) ||
          textToParse.match(/([0-9]{3,6}-[0-9]{2,6}-[0-9]{2,8}(?:-[0-9]{1,4})?)/) ||
          textToParse.match(/([0-9]{10,16})/);
        if (accMatch) {
          parsedResult.bankAccountNo = cleanBankAccountNo(accMatch[1]);
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
        parsedResult.bankName = normalizeKoreanBankName(fileName);
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
