import { NextResponse } from "next/server";

let cachedGeneralData: unknown = null;
let cachedSmeData: unknown = null;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind") === "sme" ? "sme" : "general";

    if (kind === "sme") {
      if (!cachedSmeData) {
        cachedSmeData = (await import("./smeStandardsData.json")).default;
      }
      return NextResponse.json(cachedSmeData, {
        headers: {
          "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }

    if (!cachedGeneralData) {
      cachedGeneralData = (await import("./generalStandardsData.json")).default;
    }
    return NextResponse.json(cachedGeneralData, {
      headers: {
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("GET /api/erp/accounting-standards Error:", error);
    return NextResponse.json(
      { error: "회계기준 데이터 로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
