import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-PIN",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPin = searchParams.get("pin") || "";
    const normPin = rawPin.replace(/[^0-9]/g, "").trim();

    if (!normPin) {
      return NextResponse.json(
        { status: "error", message: "PIN 번호가 지정되지 않았습니다." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 1. 만료되지 않은 레코드 조회
    const rows = await sql`
      SELECT payload FROM sketch_relay
      WHERE pin = ${normPin} AND expires_at > NOW();
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        {
          status: "error",
          message: `해당 PIN(${rawPin})이 존재하지 않거나 유효시간(5분)이 만료되었습니다.`,
        },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const payload = rows[0].payload;

    // 2. 1회성 소비 원칙(Zero-Disk & 중복 방지)에 따라 수신 즉시 삭제
    await sql`DELETE FROM sketch_relay WHERE pin = ${normPin};`;

    return NextResponse.json(
      {
        status: "ok",
        pin: normPin,
        payload,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error("[sketch/pull] Exception:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "서버 내부 오류가 발생했습니다." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
