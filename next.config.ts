import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // [캐시 TTL 정책] Redis TTL 미설정과 동일한 무기한 누적 방지
  // - dynamic: 0  → 동적 요청은 캐시 즉시 만료 (항상 최신 데이터)
  // - static: 3600 → 정적 페이지는 1시간 후 재검증
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 3600,
    },
  },
  async redirects() {
    return [
      {
        source: "/downloads/ManualStudio.exe",
        destination:
          "https://pub-4bd1b65a7bcc4eef8993da27e7362727.r2.dev/releases/ManualStudio_latest.exe",
        permanent: false,
      },
      {
        source: "/downloads/ManualStudio_latest.exe",
        destination:
          "https://pub-4bd1b65a7bcc4eef8993da27e7362727.r2.dev/releases/ManualStudio_latest.exe",
        permanent: false,
      },
      {
        source: "/downloads/version.json",
        destination:
          "https://pub-4bd1b65a7bcc4eef8993da27e7362727.r2.dev/releases/version.json",
        permanent: false,
      },
      {
        source: "/downloads/ManualStudioMobile.apk",
        destination:
          "https://pub-4bd1b65a7bcc4eef8993da27e7362727.r2.dev/releases/ManualStudioMobile.apk",
        permanent: false,
      },
      {
        source: "/downloads/:file(.*\\.apk)",
        destination:
          "https://pub-4bd1b65a7bcc4eef8993da27e7362727.r2.dev/releases/ManualStudioMobile.apk",
        permanent: false,
      },
      {
        source: "/downloads/:file(ManualStudio.*)",
        destination:
          "https://pub-4bd1b65a7bcc4eef8993da27e7362727.r2.dev/releases/ManualStudio_latest.exe",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/pc-wiki",
        destination: "https://dragonrpa.github.io/HanWha_Wiki_PC/",
      },
      {
        source: "/pc-wiki/:path*",
        destination: "https://dragonrpa.github.io/HanWha_Wiki_PC/:path*",
      },
      {
        source: "/LabelPrintStation",
        destination: "https://dragonrpa.github.io/LabelPrintStation/",
      },
      {
        source: "/LabelPrintStation/:path*",
        destination: "https://dragonrpa.github.io/LabelPrintStation/:path*",
      },
    ];
  },
};

export default nextConfig;