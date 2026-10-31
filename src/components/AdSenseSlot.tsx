"use client";

import React, { useEffect } from "react";

export const ADSENSE_CLIENT_ID = "ca-pub-6403832425334616";

interface AdSenseSlotProps {
  slotId?: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  label?: string;
  className?: string;
}

export const AdSenseSlot: React.FC<AdSenseSlotProps> = ({
  slotId = "8849201742",
  format = "auto",
  label = "스폰서 배너",
  className = "",
}) => {
  useEffect(() => {
    try {
      const w = window as any;
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
    } catch {
      // AdSense 스크립트 로드 전 또는 애드블록 환경 예외 무시
    }
  }, []);

  return (
    <div
      className={`w-full rounded-xl bg-slate-900/70 border border-slate-800 px-3 py-2 flex flex-col gap-1.5 print:hidden ${className}`}
    >
      <div className="flex items-center justify-between text-[10px] text-slate-500 border-b border-slate-800/80 pb-1">
        <span className="font-semibold text-slate-400">{label}</span>
        <span className="font-mono">Google AdSense · {ADSENSE_CLIENT_ID}</span>
      </div>
      <div className="w-full min-h-[70px] flex items-center justify-center overflow-hidden">
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", minHeight: "64px" }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
};
