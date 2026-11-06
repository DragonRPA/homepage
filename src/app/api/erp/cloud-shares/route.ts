export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getErpPool } from "@/lib/supabaseErp";

async function ensureShareTables() {
  const pool = getErpPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS erp_share_folders (
      id SERIAL PRIMARY KEY,
      share_code VARCHAR(64) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      password_hash VARCHAR(255),
      has_password BOOLEAN NOT NULL DEFAULT FALSE,
      expires_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS erp_share_files (
      id SERIAL PRIMARY KEY,
      folder_id INTEGER NOT NULL REFERENCES erp_share_folders(id) ON DELETE CASCADE,
      file_name VARCHAR(500) NOT NULL,
      r2_key TEXT NOT NULL,
      file_size BIGINT NOT NULL DEFAULT 0,
      content_type VARCHAR(255) DEFAULT 'application/octet-stream',
      download_count INTEGER NOT NULL DEFAULT 0,
      uploaded_by VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE erp_share_folders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE erp_share_files ENABLE ROW LEVEL SECURITY;
  `);
}

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(`dragonrpa_share_${pw.trim()}`).digest("hex");
}

function generateShareCode(): string {
  return crypto.randomBytes(6).toString("hex"); // 12-char URL-safe code
}

// GET: 공유 폴더 목록 및 각 폴더에 속한 파일 목록 조회
export async function GET() {
  try {
    await ensureShareTables();
    const pool = getErpPool();

    const foldersRes = await pool.query(`
      SELECT
        f.id,
        f.share_code AS "shareCode",
        f.title,
        f.description,
        f.has_password AS "hasPassword",
        f.expires_at AS "expiresAt",
        f.is_active AS "isActive",
        f.created_by AS "createdBy",
        f.created_at AS "createdAt",
        f.updated_at AS "updatedAt"
      FROM erp_share_folders f
      ORDER BY f.id DESC
    `);

    const filesRes = await pool.query(`
      SELECT
        id,
        folder_id AS "folderId",
        file_name AS "fileName",
        r2_key AS "r2Key",
        file_size::bigint AS "fileSize",
        content_type AS "contentType",
        download_count AS "downloadCount",
        uploaded_by AS "uploadedBy",
        created_at AS "createdAt"
      FROM erp_share_files
      ORDER BY id DESC
    `);

    const filesByFolder: Record<number, any[]> = {};
    for (const file of filesRes.rows) {
      const fid = Number(file.folderId);
      if (!filesByFolder[fid]) filesByFolder[fid] = [];
      filesByFolder[fid].push({
        ...file,
        fileSize: Number(file.fileSize || 0),
      });
    }

    const folders = foldersRes.rows.map((folder) => {
      const files = filesByFolder[Number(folder.id)] || [];
      const totalSize = files.reduce((acc, cur) => acc + Number(cur.fileSize || 0), 0);
      const totalDownloads = files.reduce((acc, cur) => acc + Number(cur.downloadCount || 0), 0);
      return {
        ...folder,
        fileCount: files.length,
        totalSize,
        totalDownloads,
        files,
      };
    });

    return NextResponse.json({ success: true, folders });
  } catch (err: any) {
    console.error("GET /api/erp/cloud-shares error:", err);
    return NextResponse.json({ error: err.message || "공유 폴더 목록 조회 실패" }, { status: 500 });
  }
}

// POST: 신규 공유 폴더 생성
export async function POST(request: Request) {
  try {
    await ensureShareTables();
    const body = await request.json();
    const { title, description, password, expiresAt, createdBy } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "공유 폴더 제목을 입력해 주십시오." }, { status: 400 });
    }

    const shareCode = generateShareCode();
    const hasPassword = Boolean(password && String(password).trim());
    const passwordHash = hasPassword ? hashPassword(String(password)) : null;
    const cleanExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;

    const pool = getErpPool();
    const res = await pool.query(
      `INSERT INTO erp_share_folders (
        share_code, title, description, password_hash, has_password, expires_at, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
      RETURNING
        id,
        share_code AS "shareCode",
        title,
        description,
        has_password AS "hasPassword",
        expires_at AS "expiresAt",
        is_active AS "isActive",
        created_by AS "createdBy",
        created_at AS "createdAt"`,
      [
        shareCode,
        String(title).trim(),
        description ? String(description).trim() : null,
        passwordHash,
        hasPassword,
        cleanExpiresAt,
        createdBy || "관리자",
      ]
    );

    return NextResponse.json({
      success: true,
      folder: {
        ...res.rows[0],
        fileCount: 0,
        totalSize: 0,
        totalDownloads: 0,
        files: [],
      },
    });
  } catch (err: any) {
    console.error("POST /api/erp/cloud-shares error:", err);
    return NextResponse.json({ error: err.message || "공유 폴더 생성 실패" }, { status: 500 });
  }
}

// PATCH: 공유 폴더 설정 수정 (제목, 설명, 활성여부, 만료일, 비밀번호 변경/해제)
export async function PATCH(request: Request) {
  try {
    await ensureShareTables();
    const body = await request.json();
    const { id, title, description, isActive, expiresAt, password, clearPassword } = body;

    if (!id) {
      return NextResponse.json({ error: "폴더 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const existingRes = await pool.query(`SELECT * FROM erp_share_folders WHERE id = $1`, [Number(id)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "대상 공유 폴더를 찾을 수 없습니다." }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    let nextHasPassword = existing.has_password;
    let nextPasswordHash = existing.password_hash;

    if (clearPassword) {
      nextHasPassword = false;
      nextPasswordHash = null;
    } else if (password && String(password).trim()) {
      nextHasPassword = true;
      nextPasswordHash = hashPassword(String(password));
    }

    const nextTitle = title !== undefined ? String(title).trim() : existing.title;
    const nextDesc = description !== undefined ? (description ? String(description).trim() : null) : existing.description;
    const nextActive = isActive !== undefined ? Boolean(isActive) : existing.is_active;
    const nextExpires = expiresAt !== undefined ? (expiresAt ? new Date(expiresAt).toISOString() : null) : existing.expires_at;

    await pool.query(
      `UPDATE erp_share_folders
       SET title = $1,
           description = $2,
           is_active = $3,
           expires_at = $4,
           has_password = $5,
           password_hash = $6,
           updated_at = NOW()
       WHERE id = $7`,
      [nextTitle, nextDesc, nextActive, nextExpires, nextHasPassword, nextPasswordHash, Number(id)]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/erp/cloud-shares error:", err);
    return NextResponse.json({ error: err.message || "공유 폴더 수정 실패" }, { status: 500 });
  }
}

// DELETE: 공유 폴더 삭제 (R2 내 모든 파일 함께 삭제)
export async function DELETE(request: Request) {
  try {
    await ensureShareTables();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 폴더 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const filesRes = await pool.query(`SELECT r2_key FROM erp_share_files WHERE folder_id = $1`, [Number(id)]);

    const { deleteErpPrivateObject } = await import("@/lib/r2ErpVault");
    for (const row of filesRes.rows) {
      if (row.r2_key) {
        try {
          await deleteErpPrivateObject(String(row.r2_key));
        } catch (e) {
          console.warn("R2 object delete warning:", e);
        }
      }
    }

    await pool.query(`DELETE FROM erp_share_folders WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/erp/cloud-shares error:", err);
    return NextResponse.json({ error: err.message || "공유 폴더 삭제 실패" }, { status: 500 });
  }
}
