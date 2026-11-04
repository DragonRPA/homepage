import { NextResponse } from "next/server";
import crypto from "crypto";
import { getErpPool } from "@/lib/supabaseErp";
import { getErpPrivateObject, createErpPresignedUrl } from "@/lib/r2ErpVault";

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(`dragonrpa_share_${pw.trim()}`).digest("hex");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const { searchParams } = new URL(request.url);
    const fileId = Number(searchParams.get("fileId"));
    const password = searchParams.get("pw") || "";
    const mode = searchParams.get("mode") || "download"; // 'download' | 'inline' | 'redirect'

    if (!fileId) {
      return NextResponse.json({ error: "파일 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const res = await pool.query(
      `SELECT
         fi.id AS "fileId",
         fi.file_name AS "fileName",
         fi.r2_key AS "r2Key",
         fi.file_size::bigint AS "fileSize",
         fi.content_type AS "contentType",
         fo.id AS "folderId",
         fo.share_code AS "shareCode",
         fo.has_password AS "hasPassword",
         fo.password_hash AS "passwordHash",
         fo.expires_at AS "expiresAt",
         fo.is_active AS "isActive"
       FROM erp_share_files fi
       JOIN erp_share_folders fo ON fo.id = fi.folder_id
       WHERE fi.id = $1 AND fo.share_code = $2`,
      [fileId, code]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "요청하신 파일을 찾을 수 없습니다." }, { status: 404 });
    }

    const item = res.rows[0];
    if (!item.isActive) {
      return NextResponse.json({ error: "비활성화된 공유 폴더입니다." }, { status: 403 });
    }
    if (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "유효기간이 만료된 공유 폴더입니다." }, { status: 410 });
    }
    if (item.hasPassword) {
      if (!password || hashPassword(password) !== item.passwordHash) {
        return NextResponse.json({ error: "비밀번호 인증이 필요합니다." }, { status: 401 });
      }
    }

    // 다운로드 횟수 1 증가
    await pool.query(
      `UPDATE erp_share_files SET download_count = download_count + 1 WHERE id = $1`,
      [fileId]
    );

    const fileName = String(item.fileName);
    const encodedName = encodeURIComponent(fileName);
    const disposition =
      mode === "inline"
        ? `inline; filename*=UTF-8''${encodedName}`
        : `attachment; filename*=UTF-8''${encodedName}`;

    // 25MB 초과 대용량 파일이거나 redirect 모드 요청 시 Cloudflare R2 Presigned URL로 즉시 리다이렉트 (무제한 용량·무료 트래픽)
    const fileSize = Number(item.fileSize || 0);
    if (mode === "redirect" || fileSize > 25 * 1024 * 1024) {
      const signedUrl = await createErpPresignedUrl("GET", String(item.r2Key), 3600, disposition);
      return NextResponse.redirect(signedUrl, 302);
    }

    // 일반 파일은 서버에서 직접 스트리밍 응답하여 브라우저가 즉시 파일명으로 저장하도록 처리
    const { buffer, contentType } = await getErpPrivateObject(String(item.r2Key));

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": item.contentType || contentType || "application/octet-stream",
        "Content-Disposition": disposition,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err: any) {
    console.error("GET /api/share/[code]/download error:", err);
    return NextResponse.json({ error: err.message || "파일 다운로드 실패" }, { status: 500 });
  }
}
