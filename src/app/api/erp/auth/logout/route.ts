export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import {
  buildClearSessionCookieHeader,
  getClientIpFromRequest,
  getErpSessionFromRequest,
  isHttpsRequest,
  logSecurityAuditEvent,
} from "@/lib/erpSecurityAudit";

export async function POST(request: Request) {
  const secure = isHttpsRequest(request);
  try {
    const session = await getErpSessionFromRequest(request);
    if (session) {
      await logSecurityAuditEvent({
        eventType: "LOGOUT",
        actorId: session.uid,
        actorLoginId: session.loginId,
        actorName: session.name,
        targetResource: "/api/erp/auth/logout",
        ipAddress: getClientIpFromRequest(request),
        userAgent: request.headers.get("user-agent") || "",
      });
    }
  } catch {
    // 로그 기록 실패 여부와 무관하게 쿠키는 반드시 삭제
  }

  const res = NextResponse.json({ success: true });
  res.headers.set("Set-Cookie", buildClearSessionCookieHeader(secure));
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  return res;
}
