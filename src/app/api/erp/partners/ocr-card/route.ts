export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { callGroqJsonOcr } from "@/lib/erpOcrEngine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rawText, fileData, imageBase64 } = body;

    const visionImage = imageBase64 || (fileData && String(fileData).startsWith("data:image/") ? fileData : "");

    const parsed: any = {
      name: "",
      position: "",
      department: "",
      mobile: "",
      email: "",
      telephone: "",
      companyName: "",
      memo: "",
    };

    if (visionImage) {
      try {
        const prompt = `당신은 대한민국 비즈니스 명함 판독 전문가입니다.
제공된 명함 이미지에서 아래 정보를 추출하여 순수 JSON으로만 응답하세요. 값이 없으면 ""로 반환하세요.
{
  "companyName": "회사명/상호",
  "name": "담당자 성명",
  "department": "부서명",
  "position": "직급/직책",
  "mobile": "휴대전화 번호 (010-0000-0000)",
  "telephone": "유선전화 번호",
  "email": "이메일 주소"
}`;
        const aiObj = await callGroqJsonOcr({
          prompt,
          imageBase64: visionImage,
          models: ["qwen/qwen3.8-27b"],
          timeoutMs: 18000,
          maxTokens: 500,
        });
        if (aiObj) {
          parsed.companyName = String(aiObj.companyName || "").trim();
          parsed.name = String(aiObj.name || "").trim();
          parsed.department = String(aiObj.department || "").trim();
          parsed.position = String(aiObj.position || "").trim();
          parsed.mobile = String(aiObj.mobile || "").trim();
          parsed.telephone = String(aiObj.telephone || "").trim();
          parsed.email = String(aiObj.email || "").trim();
        }
      } catch (e) {
        console.warn("[ocr-card] Vision AI warning:", e);
      }
    }

    if (rawText && typeof rawText === "string") {
      if (!parsed.mobile) {
        const mobileMatch = rawText.match(/(01[016789]-?[0-9]{3,4}-?[0-9]{4})/);
        if (mobileMatch) {
          const raw = mobileMatch[1].replace(/[^0-9]/g, "");
          parsed.mobile = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
        }
      }
      if (!parsed.email) {
        const emailMatch = rawText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) parsed.email = emailMatch[1];
      }
    }

    return NextResponse.json({
      success: true,
      parsed,
      message: parsed.name || parsed.mobile ? "명함 정보가 자동 추출되었습니다." : "명함 이미지가 첨부되었습니다.",
    });
  } catch (error: any) {
    console.error("POST /api/erp/partners/ocr-card error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "명함 인식 실패" },
      { status: 500 }
    );
  }
}
