export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { putErpPrivateObject, deleteErpPrivateObject } from "@/lib/r2ErpVault";

async function ensureCorporateDocTables(pool: any) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS erp_corporate_documents (
      id SERIAL PRIMARY KEY,
      doc_code VARCHAR(80) UNIQUE NOT NULL,
      entity_type VARCHAR(20) NOT NULL DEFAULT 'CORP',
      category VARCHAR(80) NOT NULL DEFAULT '설립·정관·등기',
      title VARCHAR(200) NOT NULL,
      description TEXT DEFAULT '',
      current_version INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS erp_corporate_document_versions (
      id SERIAL PRIMARY KEY,
      document_id INT NOT NULL REFERENCES erp_corporate_documents(id) ON DELETE CASCADE,
      version_no INT NOT NULL,
      version_label VARCHAR(50) NOT NULL DEFAULT 'v1.0',
      effective_date DATE,
      file_name VARCHAR(255) NOT NULL,
      file_ext VARCHAR(20) NOT NULL DEFAULT 'pdf',
      mime_type VARCHAR(120) NOT NULL DEFAULT 'application/pdf',
      file_size BIGINT NOT NULL DEFAULT 0,
      r2_key VARCHAR(400) NOT NULL,
      vault_url VARCHAR(500) NOT NULL,
      change_note TEXT DEFAULT '',
      uploaded_by VARCHAR(100) DEFAULT 'ADMIN',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (document_id, version_no)
    )
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") || "ALL";
    const category = searchParams.get("category") || "ALL";

    const pool = getErpPool();
    await ensureCorporateDocTables(pool);

    const params: any[] = [];
    let where = "WHERE 1=1";
    if (entityType !== "ALL") {
      params.push(entityType);
      where += ` AND d.entity_type = $${params.length}`;
    }
    if (category !== "ALL") {
      params.push(category);
      where += ` AND d.category = $${params.length}`;
    }

    const docsRes = await pool.query(
      `SELECT d.id,
              d.doc_code AS "docCode",
              d.entity_type AS "entityType",
              d.category,
              d.title,
              d.description,
              d.current_version AS "currentVersion",
              d.created_at AS "createdAt",
              d.updated_at AS "updatedAt"
       FROM erp_corporate_documents d
       ${where}
       ORDER BY d.category ASC, d.id ASC`,
      params
    );

    const verRes = await pool.query(
      `SELECT v.id,
              v.document_id AS "documentId",
              v.version_no AS "versionNo",
              v.version_label AS "versionLabel",
              v.effective_date::text AS "effectiveDate",
              v.file_name AS "fileName",
              v.file_ext AS "fileExt",
              v.mime_type AS "mimeType",
              v.file_size::bigint AS "fileSize",
              v.r2_key AS "r2Key",
              v.vault_url AS "vaultUrl",
              v.change_note AS "changeNote",
              v.uploaded_by AS "uploadedBy",
              v.created_at AS "createdAt"
       FROM erp_corporate_document_versions v
       ORDER BY v.document_id ASC, v.version_no DESC, v.id DESC`
    );

    const versionsByDoc = new Map<number, any[]>();
    for (const v of verRes.rows) {
      const docId = Number(v.documentId);
      if (!versionsByDoc.has(docId)) versionsByDoc.set(docId, []);
      versionsByDoc.get(docId)!.push({
        ...v,
        fileSize: Number(v.fileSize || 0),
      });
    }

    const documents = docsRes.rows.map((d: any) => {
      const vers = versionsByDoc.get(Number(d.id)) || [];
      return {
        ...d,
        latestVersion: vers[0] || null,
        versions: vers,
      };
    });

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error: any) {
    console.error("GET /api/erp/corporate-docs Error:", error);
    return NextResponse.json(
      { error: "법인 중요문서 조회 실패: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const pool = getErpPool();
    await ensureCorporateDocTables(pool);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentIdRaw = formData.get("documentId") as string | null;
    const entityType = String(formData.get("entityType") || "CORP").toUpperCase() === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
    const category = String(formData.get("category") || "설립·정관·등기").trim();
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const effectiveDate = String(formData.get("effectiveDate") || new Date().toISOString().slice(0, 10)).trim();
    const changeNote = String(formData.get("changeNote") || "").trim();
    const uploadedBy = String(formData.get("uploadedBy") || "이정용").trim();

    if (!file) {
      return NextResponse.json({ error: "업로드할 문서 파일을 선택해 주십시오." }, { status: 400 });
    }

    const originalName = file.name || "document.pdf";
    const ext = (originalName.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
    const mimeType =
      file.type ||
      (ext === "pdf"
        ? "application/pdf"
        : ext === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/octet-stream");
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let docId = documentIdRaw ? Number(documentIdRaw) : 0;
      let nextVersionNo = 1;

      if (docId > 0) {
        const docCheck = await client.query(
          `SELECT id, current_version, title FROM erp_corporate_documents WHERE id = $1 FOR UPDATE`,
          [docId]
        );
        if (docCheck.rows.length === 0) {
          throw new Error("대상 문서 마스터를 찾을 수 없습니다.");
        }
        const maxVerRes = await client.query(
          `SELECT COALESCE(MAX(version_no), 0) AS max_ver FROM erp_corporate_document_versions WHERE document_id = $1`,
          [docId]
        );
        nextVersionNo = Number(maxVerRes.rows[0].max_ver || 0) + 1;

        await client.query(
          `UPDATE erp_corporate_documents
           SET current_version = $1,
               title = COALESCE(NULLIF($2, ''), title),
               category = COALESCE(NULLIF($3, ''), category),
               description = CASE WHEN $4 <> '' THEN $4 ELSE description END,
               updated_at = NOW()
           WHERE id = $5`,
          [nextVersionNo, title, category, description, docId]
        );
      } else {
        if (!title) {
          throw new Error("신규 문서 등록 시 문서명(Title)은 필수입니다.");
        }
        const docCode = `DOC-${entityType}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const insDoc = await client.query(
          `INSERT INTO erp_corporate_documents (doc_code, entity_type, category, title, description, current_version)
           VALUES ($1, $2, $3, $4, $5, 1)
           RETURNING id`,
          [docCode, entityType, category, title, description]
        );
        docId = Number(insDoc.rows[0].id);
        nextVersionNo = 1;
      }

      const safeSlug = originalName
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9가-힣_-]/g, "_")
        .slice(0, 60);
      const r2Key = `corporate-docs/doc_${docId}_v${nextVersionNo}_${Date.now()}_${safeSlug}.${ext}`;
      await putErpPrivateObject(r2Key, fileBuffer, mimeType);

      const vaultUrl = `/api/erp/vault?key=${encodeURIComponent(r2Key)}&filename=${encodeURIComponent(originalName)}`;
      const versionLabel = `v${nextVersionNo}.0`;

      const insVer = await client.query(
        `INSERT INTO erp_corporate_document_versions (
          document_id, version_no, version_label, effective_date,
          file_name, file_ext, mime_type, file_size, r2_key, vault_url,
          change_note, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          docId,
          nextVersionNo,
          versionLabel,
          effectiveDate || null,
          originalName,
          ext,
          mimeType,
          fileBuffer.length,
          r2Key,
          vaultUrl,
          changeNote || (nextVersionNo === 1 ? "초판 제정·등록" : `제${nextVersionNo}차 개정본 등록`),
          uploadedBy,
        ]
      );

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        documentId: docId,
        version: insVer.rows[0],
        message: `문서 버전(${versionLabel})이 업로드되었습니다.`,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST /api/erp/corporate-docs Error:", error);
    return NextResponse.json(
      { error: "법인 중요문서 저장 실패: " + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const versionId = Number(searchParams.get("versionId") || 0);
    const documentId = Number(searchParams.get("documentId") || 0);

    const pool = getErpPool();
    await ensureCorporateDocTables(pool);

    if (versionId > 0) {
      const verRes = await pool.query(
        `SELECT id, document_id, r2_key FROM erp_corporate_document_versions WHERE id = $1`,
        [versionId]
      );
      if (verRes.rows.length === 0) {
        return NextResponse.json({ error: "삭제할 버전을 찾을 수 없습니다." }, { status: 404 });
      }
      const row = verRes.rows[0];
      try {
        await deleteErpPrivateObject(row.r2_key);
      } catch {
        // ignore R2 delete error
      }
      await pool.query(`DELETE FROM erp_corporate_document_versions WHERE id = $1`, [versionId]);

      const remainRes = await pool.query(
        `SELECT COALESCE(MAX(version_no), 0) AS max_ver FROM erp_corporate_document_versions WHERE document_id = $1`,
        [row.document_id]
      );
      const maxVer = Number(remainRes.rows[0].max_ver || 0);
      if (maxVer === 0) {
        await pool.query(`DELETE FROM erp_corporate_documents WHERE id = $1`, [row.document_id]);
      } else {
        await pool.query(
          `UPDATE erp_corporate_documents SET current_version = $1, updated_at = NOW() WHERE id = $2`,
          [maxVer, row.document_id]
        );
      }
      return NextResponse.json({ success: true, message: "선택한 문서 버전이 삭제되었습니다." });
    }

    if (documentId > 0) {
      const vers = await pool.query(
        `SELECT r2_key FROM erp_corporate_document_versions WHERE document_id = $1`,
        [documentId]
      );
      for (const v of vers.rows) {
        try {
          await deleteErpPrivateObject(v.r2_key);
        } catch {
          // ignore
        }
      }
      await pool.query(`DELETE FROM erp_corporate_documents WHERE id = $1`, [documentId]);
      return NextResponse.json({ success: true, message: "문서 및 모든 버전 이력이 삭제되었습니다." });
    }

    return NextResponse.json({ error: "삭제 대상 ID가 필요합니다." }, { status: 400 });
  } catch (error: any) {
    console.error("DELETE /api/erp/corporate-docs Error:", error);
    return NextResponse.json(
      { error: "문서 삭제 실패: " + error.message },
      { status: 500 }
    );
  }
}
