import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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