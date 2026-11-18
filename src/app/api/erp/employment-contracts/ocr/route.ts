export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import {
  callGroqJsonOcr,
  extractTextFromPdfBuffer,
} from "@/lib/erpOcrEngine";

export const maxDuration = 60;

async function analyzeContractWithAi(
  imageBase64?: string,
  textHint?: string,
  fileName?: string
): Promise<any | null> {
  const hintBlock = textHint
    ? `\n[추출 텍스트 힌트]:\n${textHint.slice(0, 3500)}`
    : "";
  const fileBlock = fileName ? `\n[파일명 힌트]: ${fileName}` : "";

  const prompt = `당신은 대한민국 표준 근로계약서 및 정보보호(보안)서약서 스캔본/문서 정밀 판독 AI 전문가입니다.
제공된 이미지 및 텍스트 힌트를 분석하여 아래 핵심 항목을 정확히 추출하세요.${fileBlock}${hintBlock}

[추출 필드 및 규칙]:
1. "docKind": 문서 종류 ("CONTRACT" = 근로계약서, "PLEDGE" = 정보보호서약서/보안서약서)
2. "employeeName": 근로자(서약자) 성명 (예: "박종환", "장종순", "김승지", "조경찬")
3. "residentRegNo": 주민등록번호 ("000000-0000000" 형식, 예: "780217-1241810", 없으면 "")
4. "employeePhone": 근로자 연락처 (예: "010-8683-9775")
5. "employeeAddress": 근로자 주소 (예: "서울 금천구 시흥대로146길 25-19")
6. "startDate": 근로계약기간 개시일 또는 서약일 ("YYYY-MM-DD" 형식, 예: "2025-11-03")
7. "endDate": 근로계약기간 종료일 ("YYYY-MM-DD" 형식, 기간의 정함이 없으면 "")
8. "contractYear": 체결/서약 연도 4자리 (예: "2025")
9. "workplace": 근무장소 (예: "서울시 금천구 벚꽃로278, SJ테크노빌 B155호")
10. "jobDescription": 업무의 내용 (예: "주식회사 현대렌탈서비스의 렌탈자산 입/출고/배송 설치 등")
11. "workStartTime": 소정근로 시작시간 ("HH:MM" 형식, 예: "09:00")
12. "workEndTime": 소정근로 종료시간 ("HH:MM" 형식, 예: "18:00")
13. "breakMinutes": 휴게시간(분 단위 숫자, 기본 60)
14. "workDays": 근무일 (예: "매주 월~금요일 근무")
15. "weeklyHoliday": 주휴일 (예: "주휴일 매주 토~일요일")
16. "baseSalary": 월급(기본급) 숫자 (예: 2800000)
17. "hourlyWageNote": 시급 표기 문구 (예: "시급은 통상시급" 또는 "시급 10,500 원")
18. "mealAllowance": 식대 숫자 (예: 200000)
19. "vehicleAllowance": 차량보조금 숫자 (없으면 0)
20. "payDay": 임금지급일 숫자 (예: 10)
21. "payMethod": 지급방법 (예: "근로자 명의 예금통장에 입금")
22. "contractDate": 계약 체결일자 또는 서약일자 ("YYYY-MM-DD" 형식, 예: "2025-11-03")

반드시 순수 JSON 객체만 반환하세요.`;

  return callGroqJsonOcr({
    prompt,
    imageBase64,
    timeoutMs: 20000,
    maxTokens: 1000,
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
      } else if (fileData.startsWith("data:application/pdf")) {
        try {
          const commaIdx = fileData.indexOf(",");
          const base64Str =
            commaIdx !== -1 ? fileData.slice(commaIdx + 1) : fileData;
          const buf = Buffer.from(base64Str, "base64");
          textToParse += "\n" + extractTextFromPdfBuffer(buf);
        } catch (err) {
          console.error("PDF parse error:", err);
        }
      }
    }

    const parsed: any = {
      docKind: "CONTRACT",
      employeeName: "",
      residentRegNo: "",
      employeePhone: "",
      employeeAddress: "",
      startDate: "",
      endDate: "",
      contractYear: "",
      workplace: "서울시 금천구 벚꽃로278, SJ테크노빌 B155호",
      jobDescription: "주식회사 현대렌탈서비스의 렌탈자산 입/출고/배송 설치 등",
      workStartTime: "09:00",
      workEndTime: "18:00",
      breakMinutes: 60,
      workDays: "매주 월~금요일 근무",
      weeklyHoliday: "주휴일 매주 토~일요일",
      baseSalary: 0,
      hourlyWageNote: "시급은 통상시급",
      mealAllowance: 200000,
      vehicleAllowance: 0,
      payDay: 10,
      payMethod: "근로자 명의 예금통장에 입금",
      contractDate: "",
      fileName: fileName || "근로계약서_스캔본",
    };

    // 1. AI Vision / Text 분석
    if (visionImage || textToParse.trim().length > 10) {
      const aiRes = await analyzeContractWithAi(
        visionImage || undefined,
        textToParse.trim() || undefined,
        fileName
      );
      if (aiRes && typeof aiRes === "object") {
        if (aiRes.docKind) parsed.docKind = String(aiRes.docKind).trim();
        if (aiRes.employeeName) parsed.employeeName = String(aiRes.employeeName).trim();
        if (aiRes.residentRegNo) parsed.residentRegNo = String(aiRes.residentRegNo).trim();
        if (aiRes.employeePhone) parsed.employeePhone = String(aiRes.employeePhone).trim();
        if (aiRes.employeeAddress) parsed.employeeAddress = String(aiRes.employeeAddress).trim();
        if (aiRes.startDate) parsed.startDate = String(aiRes.startDate).trim();
        if (aiRes.endDate) parsed.endDate = String(aiRes.endDate).trim();
        if (aiRes.contractYear) parsed.contractYear = String(aiRes.contractYear).trim();
        if (aiRes.workplace) parsed.workplace = String(aiRes.workplace).trim();
        if (aiRes.jobDescription) parsed.jobDescription = String(aiRes.jobDescription).trim();
        if (aiRes.workStartTime) parsed.workStartTime = String(aiRes.workStartTime).trim();
        if (aiRes.workEndTime) parsed.workEndTime = String(aiRes.workEndTime).trim();
        if (aiRes.breakMinutes) parsed.breakMinutes = Number(aiRes.breakMinutes) || 60;
        if (aiRes.baseSalary) parsed.baseSalary = Number(String(aiRes.baseSalary).replace(/[^0-9]/g, "")) || 0;
        if (aiRes.hourlyWageNote) parsed.hourlyWageNote = String(aiRes.hourlyWageNote).trim();
        if (aiRes.mealAllowance !== undefined)
          parsed.mealAllowance = Number(String(aiRes.mealAllowance).replace(/[^0-9]/g, "")) || 0;
        if (aiRes.vehicleAllowance !== undefined)
          parsed.vehicleAllowance = Number(String(aiRes.vehicleAllowance).replace(/[^0-9]/g, "")) || 0;
        if (aiRes.payDay) parsed.payDay = Number(aiRes.payDay) || 10;
        if (aiRes.contractDate) parsed.contractDate = String(aiRes.contractDate).trim();
      }
    }

    // 2. 결정론적 정규식 보완 (텍스트 기반)
    if (textToParse) {
      if (textToParse.includes("정보보호") || textToParse.includes("서약서")) {
        parsed.docKind = "PLEDGE";
      }
      if (!parsed.residentRegNo) {
        const rrnM = textToParse.match(/(\d{6})\s*-\s*([1-4]\d{6})/);
        if (rrnM) parsed.residentRegNo = `${rrnM[1]}-${rrnM[2]}`;
      }
      if (!parsed.employeeName) {
        const nameM =
          textToParse.match(/성\s*명\s*[:：]\s*([가-힣]{2,5})\s*\(서명\)/) ||
          textToParse.match(/함\)과\(와\)\s*([가-힣]{2,5})\s*\(이하/);
        if (nameM) parsed.employeeName = nameM[1].trim();
      }

      if (!parsed.startDate) {
        const startM = textToParse.match(
          /근로계약기간\s*[:：]?\s*(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/
        );
        if (startM) {
          parsed.startDate = `${startM[1]}-${startM[2].padStart(2, "0")}-${startM[3].padStart(2, "0")}`;
          parsed.contractYear = startM[1];
          if (!parsed.contractDate) parsed.contractDate = parsed.startDate;
        }
      }

      if (!parsed.baseSalary) {
        const salM = textToParse.match(/월\s*([0-9,]{6,12})\s*원/);
        if (salM) {
          parsed.baseSalary = Number(salM[1].replace(/,/g, "")) || 0;
        }
      }

      if (textToParse.includes("식대")) {
        const mealM = textToParse.match(/식대\s*월?\s*([0-9,]{5,10})\s*원/);
        if (mealM) {
          parsed.mealAllowance = Number(mealM[1].replace(/,/g, "")) || 200000;
        }
      }

      if (!parsed.employeePhone) {
        const phoneM = textToParse.match(/연\s*락\s*처\s*[:：]?\s*(01[0-9]-\d{3,4}-\d{4})/);
        if (phoneM) parsed.employeePhone = phoneM[1];
      }

      if (!parsed.employeeAddress) {
        const addrM = textToParse.match(/\(근로자\)\s*주\s*소\s*[:：]?\s*([^\n\r]+)/);
        if (addrM) parsed.employeeAddress = addrM[1].trim();
      }
    }

    // 3. 파일명 힌트 보완 (예: 근로계약서_박종환.pdf 또는 보안서약서_장종순_20251103.pdf)
    if (fileName) {
      if (/보안|서약|정보보호/.test(fileName)) {
        parsed.docKind = "PLEDGE";
      }
      if (!parsed.employeeName) {
        const fnM = String(fileName).match(/(?:근로계약서|보안서약서|정보보호서약서)[_\s-]*([가-힣]{2,4})/);
        if (fnM) parsed.employeeName = fnM[1];
      }
      if (!parsed.contractDate) {
        const dtM = String(fileName).match(/(20\d{2})(\d{2})(\d{2})/);
        if (dtM) {
          parsed.contractDate = `${dtM[1]}-${dtM[2]}-${dtM[3]}`;
          if (!parsed.startDate) parsed.startDate = parsed.contractDate;
          if (!parsed.contractYear) parsed.contractYear = dtM[1];
        }
      }
    }

    if (parsed.startDate && !parsed.contractYear) {
      parsed.contractYear = parsed.startDate.slice(0, 4);
    }
    if (parsed.startDate && !parsed.contractDate) {
      parsed.contractDate = parsed.startDate;
    }

    return NextResponse.json({
      success: true,
      parsed,
      message: parsed.employeeName
        ? `${parsed.employeeName} 근로계약서 정보가 자동 판독되었습니다.`
        : "근로계약서 파일이 첨부되었습니다. 추출 항목을 확인해 주십시오.",
    });
  } catch (error: any) {
    console.error("POST /api/erp/employment-contracts/ocr error:", error);
    return NextResponse.json(
      { error: "근로계약서 OCR 판독 실패: " + error.message },
      { status: 500 }
    );
  }
}
