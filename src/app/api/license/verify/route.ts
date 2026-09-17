import { NextRequest, NextResponse } from "next/server";
import { verifyLicense } from "@/lib/licenseService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, machineId, machineName, clientVersion } = body;

    const result = await verifyLicense({
      licenseKey,
      machineId,
      machineName,
      clientVersion,
    });

    if (!result.valid) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[API License Verify] Error:", error);
    return NextResponse.json(
      { valid: false, error: "SERVER_ERROR", message: error.message || "라이선스 검증 서버 오류입니다." },
      { status: 500 }
    );
  }
}
