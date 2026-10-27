import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rawText, fileData, fileName } = body;

    let text = rawText || "";

    // If fileData is base64 string
    if (fileData && typeof fileData === "string") {
      try {
        const commaIdx = fileData.indexOf(",");
        const base64Str = commaIdx !== -1 ? fileData.slice(commaIdx + 1) : fileData;
        const buf = Buffer.from(base64Str, "base64");
        text += " " + buf.toString("utf8");
      } catch (err) {}
    }

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

    if (text) {
      // Mobile pattern (010-xxxx-xxxx)
      const mobileMatch = text.match(/(01[016789]-?[0-9]{3,4}-?[0-9]{4})/);
      if (mobileMatch) {
        const raw = mobileMatch[1].replace(/[^0-9]/g, "");
        parsed.mobile = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
      }

      // Telephone pattern (02/031/070 etc.)
      const telMatch = text.match(/(0[2-6][0-9]?-?[0-9]{3,4}-?[0-9]{4}|070-?[0-9]{4}-?[0-9]{4})/);
      if (telMatch && telMatch[1] !== mobileMatch?.[1]) {
        parsed.telephone = telMatch[1];
      }

      // Email pattern
      const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        parsed.email = emailMatch[1];
      }

      // Position heuristic
      const posMatch = text.match(/(대표이사|대표|상무|전무|부사장|사장|이사|본부장|센터장|부장|차장|팀장|과장|대리|주임|사원|선임|수석|책임)/);
      if (posMatch) {
        parsed.position = posMatch[1];
      }

      // Department heuristic
      const deptMatch = text.match(/([가-힣A-Za-z0-9]+(?:팀|실|부|본부|단|센터|연구소))/);
      if (deptMatch) {
        parsed.department = deptMatch[1];
      }

      // Name heuristic (look for 2-4 hangul characters)
      const nameMatch = text.match(/(?:성명|이름|담당자)?\s*([가-힣]{2,4})\s*(?:대표|부장|팀장|과장|대리|차장|사원|님)/);
      if (nameMatch) {
        parsed.name = nameMatch[1];
      }
    }

    return NextResponse.json({
      success: true,
      parsed,
      message: parsed.name || parsed.mobile ? "명함 정보가 추출되었습니다." : "명함 이미지가 정상 첨부되었습니다.",
    });
  } catch (error: any) {
    console.error("POST /api/erp/partners/ocr-card error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "명함 인식 실패" },
      { status: 500 }
    );
  }
}
