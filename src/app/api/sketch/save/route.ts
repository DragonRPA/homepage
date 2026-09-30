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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPin = body.pin || req.headers.get("x-pin") || "";
    const normPin = String(rawPin).replace(/[^0-9]/g, "").trim();

    if (!normPin || normPin.length < 4 || normPin.length > 10) {
      return NextResponse.json(
        { status: "error", message: "유효하지 않은 PIN 번호입니다. (4~10자리 숫자)" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const payload = body.payload !== undefined ? body.payload : body;
    const ttlSec = Number(body.ttl_sec) || 300; // 기본 5분(300초)

    // 1. 만료된 레코드 비동기 자동 소탕
    sql`DELETE FROM sketch_relay WHERE expires_at < NOW();`.catch((err) => {
      console.warn("[sketch/save] Cleanup error:", err);
    });

    // 2. 5분 휘발성 릴레이 저장 (UPSERT)
    await sql`
      INSERT INTO sketch_relay (pin, payload, created_at, expires_at)
      VALUES (
        ${normPin},
        ${JSON.stringify(payload)},
        NOW(),
        NOW() + (${ttlSec} || ' seconds')::INTERVAL
      )
      ON CONFLICT (pin) DO UPDATE SET
        payload = EXCLUDED.payload,
        created_at = NOW(),
        expires_at = EXCLUDED.expires_at;
    `;

    return NextResponse.json(
      {
        status: "ok",
        pin: normPin,
        expires_in: ttlSec,
        message: `PIN(${normPin})에 릴레이 데이터가 안전하게 저장되었습니다. (${Math.floor(ttlSec / 60)}분 유효)`,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error("[sketch/save] Exception:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "서버 내부 오류가 발생했습니다." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
