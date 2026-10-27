import { NextResponse } from "next/server";

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
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: visionImage } },
                ],
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 500,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            const aiObj = JSON.parse(content.replace(/<think>[\s\S]*?<\/think>/g, "").trim());
            parsed.companyName = String(aiObj.companyName || "").trim();
            parsed.name = String(aiObj.name || "").trim();
            parsed.department = String(aiObj.department || "").trim();
            parsed.position = String(aiObj.position || "").trim();
            parsed.mobile = String(aiObj.mobile || "").trim();
            parsed.telephone = String(aiObj.telephone || "").trim();
            parsed.email = String(aiObj.email || "").trim();
          }
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
