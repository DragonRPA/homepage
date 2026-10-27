import { NextResponse } from "next/server";

// Sample preset business cards for instant testing & demonstration
const PRESET_CARDS: Record<string, any> = {
  SAMPLE_1: {
    name: "김진석",
    position: "부장 / 구매총괄",
    department: "구매조달실 자재구매팀",
    mobile: "010-3456-7890",
    email: "jskim@hdec.co.kr",
    telephone: "02-746-1234",
    companyName: "현대건설(주)",
    memo: "RPA 솔루션 및 계약/정산 총괄 창구",
  },
  SAMPLE_2: {
    name: "이수진",
    position: "과장",
    department: "IT운영실 DX추진단",
    mobile: "010-4567-8901",
    email: "sjlee@hdec.co.kr",
    telephone: "02-746-5678",
    companyName: "현대건설(주)",
    memo: "자동화 봇 실무 운영 및 기술협의",
  },
  SAMPLE_3: {
    name: "정대훈",
    position: "차장",
    department: "엔터프라이즈 B2B 영업본부",
    mobile: "010-9012-3456",
    email: "dhjung@kt.com",
    telephone: "02-720-3344",
    companyName: "(주)케이티정보통신",
    memo: "서버 호스팅 및 전산 인프라 매입 담당자",
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { presetKey, rawText, fileData, fileName } = body;

    // 1. If preset requested, return preset immediately
    if (presetKey && PRESET_CARDS[presetKey]) {
      return NextResponse.json({
        success: true,
        parsed: PRESET_CARDS[presetKey],
        message: "샘플 명함 정보가 성공적으로 로드되었습니다.",
      });
    }

    // 2. Text parsing heuristic
    let text = rawText || "";

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
      message: parsed.name || parsed.mobile ? "명함 정보가 추출되었습니다." : "명함 정보를 입력해주세요.",
    });
  } catch (error: any) {
    console.error("POST /api/erp/partners/ocr-card error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "명함 인식 실패" },
      { status: 500 }
    );
  }
}
