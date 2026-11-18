"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ShieldAlert, RotateCcw } from "lucide-react";

const PROTECTED_PATH_PREFIXES = ["/erp", "/admin", "/shareholder-registry"];
const DEVTOOLS_DELTA_THRESHOLD = 180;

function isProtectedRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * 전역 클라이언트 보안 가드
 * - 마우스 우클릭(contextmenu) 무시처리
 * - F12 / 개발자도구 / 소스보기 / 페이지저장 단축키 차단
 * - 프로덕션 콘솔 출력 무력화 및 민감 경로 개발자도구 열림 감지 보호 오버레이
 */
export default function ClientSecurityGuard() {
  const pathname = usePathname();
  const [devToolsShielded, setDevToolsShielded] = useState(false);
  const baselineRef = useRef<{ widthDelta: number; heightDelta: number } | null>(null);

  const captureBaseline = () => {
    if (typeof window === "undefined") return;
    if (window.outerWidth <= 0 || window.outerHeight <= 0) return;
    baselineRef.current = {
      widthDelta: Math.max(0, window.outerWidth - window.innerWidth),
      heightDelta: Math.max(0, window.outerHeight - window.innerHeight),
    };
  };

  useEffect(() => {
    // 1. 프로덕션 환경 콘솔 출력 무력화 (런타임 객체 덤프 방어)
    if (process.env.NODE_ENV === "production") {
      const noop = () => {};
      try {
        console.log = noop;
        console.debug = noop;
        console.info = noop;
        console.table = noop;
        console.dir = noop;
        console.trace = noop;
      } catch {
        // 일부 환경에서 콘솔 메서드가 읽기 전용인 경우 무시
      }
    }

    // 2. 마우스 우클릭 무시처리 (5버튼 마우스 3/4번 사이드 버튼은 방해하지 않음)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 3. F12, 개발자도구, 소스보기, 페이지 통째 저장 단축키 차단
    //    (입력창 Ctrl+C/V/X/A/Z 및 앱 내부 Ctrl+S 저장 핸들러는 보존)
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key || "";
      const upperKey = key.toUpperCase();

      if (key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.ctrlKey && e.shiftKey && ["I", "J", "C", "K"].includes(upperKey)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.metaKey && e.altKey && ["I", "J", "C", "U", "K"].includes(upperKey)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && upperKey === "U") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && upperKey === "S") {
        // 브라우저 HTML 저장 다이얼로그만 차단하고, 앱 내부 Ctrl+S 이벤트 전파는 유지
        e.preventDefault();
      }
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!isProtectedRoute(pathname)) {
      setDevToolsShielded(false);
      return;
    }

    const isAutomation = typeof navigator !== "undefined" && Boolean(navigator.webdriver);
    const isNarrowViewport = typeof window !== "undefined" && window.innerWidth < 768;
    if (isAutomation || isNarrowViewport) {
      return;
    }

    captureBaseline();

    const checkDevToolsState = () => {
      if (process.env.NODE_ENV !== "production") return;
      if (window.outerWidth <= 0 || window.outerHeight <= 0) return;

      const base = baselineRef.current || { widthDelta: 0, heightDelta: 0 };
      const currentWidthDelta = Math.max(0, window.outerWidth - window.innerWidth);
      const currentHeightDelta = Math.max(0, window.outerHeight - window.innerHeight);

      const widthDiff = currentWidthDelta - base.widthDelta;
      const heightDiff = currentHeightDelta - base.heightDelta;

      if (widthDiff > DEVTOOLS_DELTA_THRESHOLD || heightDiff > DEVTOOLS_DELTA_THRESHOLD) {
        setDevToolsShielded(true);
      } else {
        setDevToolsShielded(false);
      }
    };

    const timer = window.setInterval(checkDevToolsState, 1000);
    window.addEventListener("resize", checkDevToolsState);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", checkDevToolsState);
    };
  }, [pathname]);

  if (!devToolsShielded) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 select-none"
    >
      <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm mb-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>보안 화면 잠금</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          개발자도구 열림 또는 화면 크기 급변이 감지되어 화면 표시가 일시 차단되었습니다.
          작업 내용은 유지되며, 도구 종료 후 잠금을 해제할 수 있습니다.
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              captureBaseline();
              setDevToolsShielded(false);
            }}
            className="px-3.5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>화면 잠금 해제</span>
          </button>
        </div>
      </div>
    </div>
  );
}
