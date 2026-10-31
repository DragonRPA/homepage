/**
 * Vercel Auto-Purge Script (CDN/Data Cache Purge + Old Unaliased Deployments Removal)
 * - Usage:
 *   node scripts/vercel-autopurge.cjs            (Run immediately)
 *   node scripts/vercel-autopurge.cjs --delayed 65 (Wait 65s after git push for Vercel build, then purge)
 *   node scripts/vercel-autopurge.cjs --spawn-bg  (Spawn detached background worker and exit immediately)
 */
const { execSync, spawn } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);

if (args.includes("--spawn-bg")) {
  const child = spawn(
    process.execPath,
    [path.resolve(__filename), "--delayed", "65"],
    {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }
  );
  child.unref();
  console.log("[Vercel Auto-Purge] 배포 완료 후 자동 캐시 퍼지 및 이전 배포본 정리 작업이 백그라운드 예약되었습니다 (65초 후 실행).");
  process.exit(0);
}

async function runPurge() {
  const delayIdx = args.indexOf("--delayed");
  if (delayIdx !== -1) {
    const sec = parseInt(args[delayIdx + 1] || "65", 10);
    if (sec > 0) {
      await new Promise((r) => setTimeout(r, sec * 1000));
    }
  }

  try {
    console.log("[Vercel Auto-Purge] 1. CDN 및 Data Cache 퍼지 실행 중...");
    execSync("vercel cache purge --yes", {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: true,
    });
  } catch (e) {
    console.warn("[Vercel Auto-Purge] 캐시 퍼지 경고:", e.message);
  }

  try {
    console.log("[Vercel Auto-Purge] 2. 이전(비활성) 배포본 안전 정리(--safe) 실행 중...");
    execSync("vercel remove homepage --safe --yes", {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: true,
    });
  } catch (e) {
    // 정리할 이전 배포가 없을 때 정상 종료
  }
}

runPurge();
