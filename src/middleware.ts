import { NextRequest, NextResponse } from "next/server";
import {
  ERP_SESSION_COOKIE_NAME,
  verifyErpSessionToken,
} from "@/lib/erpSessionToken";

const PUBLIC_ERP_AUTH_PATHS = new Set([
  "/api/erp/auth/login",
  "/api/erp/auth/logout",
  "/api/erp/auth/session",
]);

function applySecurityHeaders(res: NextResponse, pathname: string): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  if (
    pathname.startsWith("/erp") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/shareholder-registry") ||
    pathname.startsWith("/api/erp/")
  ) {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const host = req.headers.get("host") || "";

  // 1. 소스맵(.map) 파일 외부 열람 전면 차단
  if (pathname.endsWith(".map")) {
    return new NextResponse(null, { status: 404 });
  }

  // Next.js 내부 정적 청크(.js, .css 등)는 추가 지연 없이 즉시 통과
  if (pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  // 클라이언트가 위조해 보낸 x-erp-* 헤더 사전 제거
  const cleanHeaders = new Headers(req.headers);
  cleanHeaders.delete("x-erp-uid");
  cleanHeaders.delete("x-erp-role-code");
  cleanHeaders.delete("x-erp-login-id");

  // 2. sketch 서브도메인 리라이트 유지
  if (host.startsWith("sketch.") && pathname === "/") {
    const rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = "/sketch";
    const res = NextResponse.rewrite(rewriteUrl, { request: { headers: cleanHeaders } });
    return applySecurityHeaders(res, pathname);
  }

  // 3. /api/erp/* 서버측 세션 쿠키 인증 강제 (인증 3종 엔드포인트만 공개 예외)
  if (pathname.startsWith("/api/erp/") && !PUBLIC_ERP_AUTH_PATHS.has(pathname)) {
    const token = req.cookies.get(ERP_SESSION_COOKIE_NAME)?.value;
    const session = await verifyErpSessionToken(token);
    if (!session) {
      const unauth = NextResponse.json(
        { success: false, error: "인증 세션이 필요합니다." },
        { status: 401 }
      );
      return applySecurityHeaders(unauth, pathname);
    }

    cleanHeaders.set("x-erp-uid", String(session.uid));
    cleanHeaders.set("x-erp-role-code", String(session.roleCode));
    cleanHeaders.set("x-erp-login-id", String(session.loginId));

    const res = NextResponse.next({ request: { headers: cleanHeaders } });
    return applySecurityHeaders(res, pathname);
  }

  // 4. /api/products 관리자 요청(admin=true 또는 POST 쓰기) 보호
  if (pathname === "/api/products") {
    const isAdminQuery = searchParams.get("admin") === "true";
    const isMutation = req.method !== "GET" && req.method !== "HEAD";
    if (isAdminQuery || isMutation) {
      const token = req.cookies.get(ERP_SESSION_COOKIE_NAME)?.value;
      const session = await verifyErpSessionToken(token);
      if (!session) {
        return applySecurityHeaders(
          NextResponse.json({ success: false, message: "관리자 인증이 필요합니다." }, { status: 401 }),
          pathname
        );
      }
      if (session.roleCode !== "ADMIN") {
        return applySecurityHeaders(
          NextResponse.json({ success: false, message: "관리자 권한이 필요합니다." }, { status: 403 }),
          pathname
        );
      }
      cleanHeaders.set("x-erp-uid", String(session.uid));
      cleanHeaders.set("x-erp-role-code", String(session.roleCode));
      cleanHeaders.set("x-erp-login-id", String(session.loginId));
    }
  }

  const res = NextResponse.next({ request: { headers: cleanHeaders } });
  return applySecurityHeaders(res, pathname);
}

export const config = {
  matcher: ["/((?!_next/image|favicon.ico).*)"],
};
