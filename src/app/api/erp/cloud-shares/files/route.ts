export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import {
  putErpPrivateObject,
  deleteErpPrivateObject,
  createErpPresignedUrl,
} from "@/lib/r2ErpVault";

function buildSafeR2Key(shareCode: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._가-힣-]/g, "_");
  return `cloud-shares/${shareCode}/${Date.now()}_${safeName}`;
}

// POST: 파일 업로드 (FormData 직접 업로드 또는 Presigned URL 발급 + 등록)
export async function POST(request: Request) {
  try {
    const contentTypeHeader = request.headers.get("content-type") || "";
    const pool = getErpPool();

    // Case 1: JSON 요청 (대용량 파일용 Presigned PUT URL 발급 또는 업로드 완료 등록)
    if (contentTypeHeader.includes("application/json")) {
      const body = await request.json();
      const { action, folderId, fileName, fileSize, contentType, r2Key, uploadedBy } = body;

      if (!folderId || !fileName) {
        return NextResponse.json({ error: "폴더 ID와 파일명이 필요합니다." }, { status: 400 });
      }

      const folderRes = await pool.query(
        `SELECT id, share_code FROM erp_share_folders WHERE id = $1`,
        [Number(folderId)]
      );
      if (folderRes.rows.length === 0) {
        return NextResponse.json({ error: "공유 폴더를 찾을 수 없습니다." }, { status: 404 });
      }
      const shareCode = String(folderRes.rows[0].share_code);

      if (action === "PRESIGN") {
        const generatedKey = buildSafeR2Key(shareCode, String(fileName));
        const uploadUrl = await createErpPresignedUrl("PUT", generatedKey, 3600);
        return NextResponse.json({
          success: true,
          uploadUrl,
          r2Key: generatedKey,
        });
      }

      if (action === "CONFIRM") {
        if (!r2Key) {
          return NextResponse.json({ error: "r2Key가 누락되었습니다." }, { status: 400 });
        }
        const ins = await pool.query(
          `INSERT INTO erp_share_files (
            folder_id, file_name, r2_key, file_size, content_type, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING
            id,
            folder_id AS "folderId",
            file_name AS "fileName",
            r2_key AS "r2Key",
            file_size::bigint AS "fileSize",
            content_type AS "contentType",
            download_count AS "downloadCount",
            uploaded_by AS "uploadedBy",
            created_at AS "createdAt"`,
          [
            Number(folderId),
            String(fileName),
            String(r2Key),
            Number(fileSize || 0),
            String(contentType || "application/octet-stream"),
            uploadedBy || "관리자",
          ]
        );
        await pool.query(`UPDATE erp_share_folders SET updated_at = NOW() WHERE id = $1`, [Number(folderId)]);
        return NextResponse.json({
          success: true,
          file: {
            ...ins.rows[0],
            fileSize: Number(ins.rows[0].fileSize || 0),
          },
        });
      }

      return NextResponse.json({ error: "알 수 없는 요청 액션입니다." }, { status: 400 });
    }

    // Case 2: multipart/form-data 서버 경유 직접 업로드 (CORS 걱정 없이 안정적으로 R2 업로드)
    const formData = await request.formData();
    const folderId = Number(formData.get("folderId"));
    const uploadedBy = String(formData.get("uploadedBy") || "관리자");
    const file = formData.get("file") as File | null;

    if (!folderId || !file) {
      return NextResponse.json({ error: "폴더 ID와 업로드할 파일이 필요합니다." }, { status: 400 });
    }

    const folderRes = await pool.query(
      `SELECT id, share_code FROM erp_share_folders WHERE id = $1`,
      [folderId]
    );
    if (folderRes.rows.length === 0) {
      return NextResponse.json({ error: "공유 폴더를 찾을 수 없습니다." }, { status: 404 });
    }
    const shareCode = String(folderRes.rows[0].share_code);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "application/octet-stream";
    const r2Key = buildSafeR2Key(shareCode, file.name);

    await putErpPrivateObject(r2Key, buffer, mimeType);

    const ins = await pool.query(
      `INSERT INTO erp_share_files (
        folder_id, file_name, r2_key, file_size, content_type, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        folder_id AS "folderId",
        file_name AS "fileName",
        r2_key AS "r2Key",
        file_size::bigint AS "fileSize",
        content_type AS "contentType",
        download_count AS "downloadCount",
        uploaded_by AS "uploadedBy",
        created_at AS "createdAt"`,
      [folderId, file.name, r2Key, buffer.length, mimeType, uploadedBy]
    );

    await pool.query(`UPDATE erp_share_folders SET updated_at = NOW() WHERE id = $1`, [folderId]);

    return NextResponse.json({
      success: true,
      file: {
        ...ins.rows[0],
        fileSize: Number(ins.rows[0].fileSize || 0),
      },
    });
  } catch (err: any) {
    console.error("POST /api/erp/cloud-shares/files error:", err);
    return NextResponse.json({ error: err.message || "파일 업로드 실패" }, { status: 500 });
  }
}

// DELETE: 개별 파일 삭제 (R2 객체 및 DB 레코드 삭제)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    if (!fileId) {
      return NextResponse.json({ error: "삭제할 파일 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const fileRes = await pool.query(
      `SELECT id, folder_id, r2_key FROM erp_share_files WHERE id = $1`,
      [Number(fileId)]
    );
    if (fileRes.rows.length === 0) {
      return NextResponse.json({ error: "대상 파일을 찾을 수 없습니다." }, { status: 404 });
    }

    const row = fileRes.rows[0];
    if (row.r2_key) {
      try {
        await deleteErpPrivateObject(String(row.r2_key));
      } catch (e) {
        console.warn("R2 delete warning:", e);
      }
    }

    await pool.query(`DELETE FROM erp_share_files WHERE id = $1`, [Number(fileId)]);
    await pool.query(`UPDATE erp_share_folders SET updated_at = NOW() WHERE id = $1`, [Number(row.folder_id)]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/erp/cloud-shares/files error:", err);
    return NextResponse.json({ error: err.message || "파일 삭제 실패" }, { status: 500 });
  }
}
