import { NextResponse } from "next/server";
import zlib from "zlib";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rawText, fileData, fileName } = body;

    let textToParse = rawText || "";

    // If fileData is base64 string
    if (fileData && typeof fileData === "string") {
      try {
        const commaIdx = fileData.indexOf(",");
        const base64Str = commaIdx !== -1 ? fileData.slice(commaIdx + 1) : fileData;
        const buf = Buffer.from(base64Str, "base64");

        // 1. Direct UTF-8 and Latin-1 string scanning
        const rawUtf8 = buf.toString("utf8");
        textToParse += " " + rawUtf8;

        // 2. If PDF, scan and decompress flate streams
        if (buf.slice(0, 5).toString("ascii") === "%PDF-") {
          let streamStart = 0;
          while ((streamStart = buf.indexOf("stream", streamStart)) !== -1) {
            streamStart += 6;
            if (buf[streamStart] === 0x0d && buf[streamStart + 1] === 0x0a) streamStart += 2;
            else if (buf[streamStart] === 0x0a) streamStart += 1;
            const streamEnd = buf.indexOf("endstream", streamStart);
            if (streamEnd === -1) break;

            const slice = buf.slice(streamStart, streamEnd);
            try {
              const decompressed = zlib.inflateSync(slice).toString("utf8");
              textToParse += " " + decompressed;
            } catch (e) {
              // try raw inflate
              try {
                const decompressedRaw = zlib.inflateRawSync(slice).toString("utf8");
                textToParse += " " + decompressedRaw;
              } catch (e2) {}
            }
            streamStart = streamEnd + 9;
          }
        }
      } catch (err) {
        console.error("File buffer parse error:", err);
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
      openDate: "",
      corporateNo: "",
      fileName: fileName || "사업자등록증",
    };

    if (textToParse) {
      // 1. 사업자등록번호 (xxx-xx-xxxxx)
      const bizNoMatch = textToParse.match(/(?:등록번호|사업자등록번호)\s*[:：]?\s*([0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{5})/i) ||
                         textToParse.match(/([0-9]{3}-[0-9]{2}-[0-9]{5})/);
      if (bizNoMatch) {
        const raw = bizNoMatch[1].replace(/\s+/g, "");
        parsedResult.businessNo = raw.includes("-") ? raw : `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`;
      }

      // 2. 법인등록번호 (xxxxxx-xxxxxxx)
      const corpNoMatch = textToParse.match(/(?:법인등록번호)\s*[:：]?\s*([0-9]{6}[-\s]?[0-9]{7})/i) ||
                          textToParse.match(/([0-9]{6}-[0-9]{7})/);
      if (corpNoMatch) {
        parsedResult.corporateNo = corpNoMatch[1].replace(/\s+/g, "");
      }

      // 3. 상호 (법인명)
      const nameMatch = textToParse.match(/(?:상\s*호|법\s*인\s*명)\s*[:：]?\s*([^\n\r]+)/);
      if (nameMatch) {
        parsedResult.name = nameMatch[1].replace(/\(.*?\)/g, "").trim();
      }

      // 4. 대표자 성명
      const ceoMatch = textToParse.match(/(?:성\s*명|대\s*표\s*자)\s*[:：]?\s*([^\n\r]+)/);
      if (ceoMatch) {
        const rawCeo = ceoMatch[1].trim();
        parsedResult.ceoName = rawCeo.split(/생\s*년\s*월\s*일/)[0].trim();
      }

      // 5. 사업장 소재지
      const addrMatch = textToParse.match(/(?:사\s*업\s*장\s*소\s*재\s*지|소\s*재\s*지)\s*[:：]?\s*([^\n\r]+)/);
      if (addrMatch) {
        parsedResult.address = addrMatch[1].trim();
      }

      // 6. 업태 & 종목
      const bizTypeMatch = textToParse.match(/업\s*태\s*[:：]?\s*([^\n\r\t]+)/);
      if (bizTypeMatch) {
        parsedResult.bizType = bizTypeMatch[1].replace(/종\s*목.*/, "").trim();
      }
      const bizItemMatch = textToParse.match(/종\s*목\s*[:：]?\s*([^\n\r\t]+)/);
      if (bizItemMatch) {
        parsedResult.bizItem = bizItemMatch[1].trim();
      }

      // 7. 전자세금계산서 전용 전자우편주소
      const emailMatch = textToParse.match(/(?:전자우편주소|이메일)\s*[:：]?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                         textToParse.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        parsedResult.email = emailMatch[1].trim();
      }

      // 8. 개업연월일
      const openDateMatch = textToParse.match(/개\s*업\s*연\s*월\s*일\s*[:：]?\s*([0-9]{4})\s*년?\s*([0-9]{1,2})\s*월?\s*([0-9]{1,2})/);
      if (openDateMatch) {
        const y = openDateMatch[1];
        const m = openDateMatch[2].padStart(2, "0");
        const d = openDateMatch[3].padStart(2, "0");
        parsedResult.openDate = `${y}-${m}-${d}`;
      }
    }

    return NextResponse.json({
      success: true,
      parsed: parsedResult,
      rawExtractedLength: textToParse.length,
      message: parsedResult.name || parsedResult.businessNo
        ? "사업자등록증 정보가 성공적으로 추출되었습니다."
        : "파일이 정상 첨부되었습니다. 추출된 정보를 검토해주세요.",
    });
  } catch (error: any) {
    console.error("POST /api/erp/partners/ocr-biz-cert error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "사업자등록증 파싱 처리 실패" },
      { status: 500 }
    );
  }
}
