import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const url = req.nextUrl.clone();

  // 1. sketch 서브도메인 (예: sketch.dragonrpa.co.kr 또는 sketch.localhost)
  if (host.startsWith("sketch.")) {
    // API 및 정적 자산이 아닌 루트 접속 시 /sketch 로 rewrite
    if (url.pathname === "/") {
      url.pathname = "/sketch";
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/ (API routes)
     * 2. /_next/ (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico, /logo.png)
     */
    "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)",
  ],
};
