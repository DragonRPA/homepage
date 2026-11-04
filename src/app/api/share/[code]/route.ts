import { NextResponse } from "next/server";
import crypto from "crypto";
import { getErpPool } from "@/lib/supabaseErp";

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(`dragonrpa_share_${pw.trim()}`).digest("hex");
}

async function fetchFolderByCode(code: string) {
  const pool = getErpPool();
  const folderRes = await pool.query(
    `SELECT
       id,
       share_code AS "shareCode",
       title,
       description,
       password_hash AS "passwordHash",
       has_password AS "hasPassword",
       expires_at AS "expiresAt",
       is_active AS "isActive",
       created_by AS "createdBy",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM erp_share_folders
     WHERE share_code = $1`,
    [code]
  );
  return folderRes.rows[0] || null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const folder = await fetchFolderByCode(code);

    if (!folder) {
      return NextResponse.json({ error: "존재하지 않거나 삭제된 공유 링크입니다." }, { status: 404 });
    }
    if (!folder.isActive) {
      return NextResponse.json({ error: "비활성화된 공유 폴더입니다." }, { status: 403 });
    }
    if (folder.expiresAt && new Date(folder.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "유효기간이 만료된 공유 링크입니다." }, { status: 410 });
    }

    if (folder.hasPassword) {
      return NextResponse.json({
        success: true,
        requiresPassword: true,
        folder: {
          shareCode: folder.shareCode,
          title: folder.title,
          description: folder.description,
          expiresAt: folder.expiresAt,
          createdAt: folder.createdAt,
        },
      });
    }

    const pool = getErpPool();
    const filesRes = await pool.query(
      `SELECT
         id,
         file_name AS "fileName",
         file_size::bigint AS "fileSize",
         content_type AS "contentType",
         download_count AS "downloadCount",
         created_at AS "createdAt"
       FROM erp_share_files
       WHERE folder_id = $1
       ORDER BY id DESC`,
      [Number(folder.id)]
    );

    return NextResponse.json({
      success: true,
      requiresPassword: false,
      folder: {
        shareCode: folder.shareCode,
        title: folder.title,
        description: folder.description,
        expiresAt: folder.expiresAt,
        createdAt: folder.createdAt,
      },
      files: filesRes.rows.map((f) => ({
        ...f,
        fileSize: Number(f.fileSize || 0),
      })),
    });
  } catch (err: any) {
    console.error("GET /api/share/[code] error:", err);
    return NextResponse.json({ error: "공유 폴더 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST: 비밀번호가 설정된 공유 폴더의 비밀번호 검증 후 파일 목록 반환
export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const { password } = body;

    const folder = await fetchFolderByCode(code);
    if (!folder) {
      return NextResponse.json({ error: "존재하지 않거나 삭제된 공유 링크입니다." }, { status: 404 });
    }
    if (!folder.isActive) {
      return NextResponse.json({ error: "비활성화된 공유 폴더입니다." }, { status: 403 });
    }
    if (folder.expiresAt && new Date(folder.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "유효기간이 만료된 공유 링크입니다." }, { status: 410 });
    }

    if (folder.hasPassword) {
      if (!password || hashPassword(String(password)) !== folder.passwordHash) {
        return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
      }
    }

    const pool = getErpPool();
    const filesRes = await pool.query(
      `SELECT
         id,
         file_name AS "fileName",
         file_size::bigint AS "fileSize",
         content_type AS "contentType",
         download_count AS "downloadCount",
         created_at AS "createdAt"
       FROM erp_share_files
       WHERE folder_id = $1
       ORDER BY id DESC`,
      [Number(folder.id)]
    );

    return NextResponse.json({
      success: true,
      requiresPassword: false,
      folder: {
        shareCode: folder.shareCode,
        title: folder.title,
        description: folder.description,
        expiresAt: folder.expiresAt,
        createdAt: folder.createdAt,
      },
      files: filesRes.rows.map((f) => ({
        ...f,
        fileSize: Number(f.fileSize || 0),
      })),
    });
  } catch (err: any) {
    console.error("POST /api/share/[code] error:", err);
    return NextResponse.json({ error: "비밀번호 확인 중 오류가 발생했습니다." }, { status: 500 });
  }
}
