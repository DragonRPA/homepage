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

async function resequenceDocumentVersions(client: any, docId: number) {
  const versRes = await client.query(
    `SELECT id, version_no, version_label, change_note
     FROM erp_corporate_document_versions
     WHERE document_id = $1
     ORDER BY effective_date ASC NULLS LAST, version_no ASC, id ASC`,
    [docId]
  );
  const rows = versRes.rows;
  if (rows.length === 0) return 0;

  for (let i = 0; i < rows.length; i++) {
    await client.query(
      `UPDATE erp_corporate_document_versions SET version_no = $1 WHERE id = $2`,
      [-(i + 1), rows[i].id]
    );
  }

  for (let i = 0; i < rows.length; i++) {
    const newNo = i + 1;
    const newLabel = `v${newNo}.0`;
    let newNote = String(rows[i].change_note || "");
    newNote = newNote.replace(/^v\d+(?:\.\d+)?\s*(개정본 등록|제정·등록)$/, `${newLabel} $1`);

    await client.query(
      `UPDATE erp_corporate_document_versions
       SET version_no = $1,
           version_label = $2,
           change_note = $3
       WHERE id = $4`,
      [newNo, newLabel, newNote, rows[i].id]
    );
  }

  await client.query(
    `UPDATE erp_corporate_documents
     SET current_version = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [rows.length, docId]
  );

  return rows.length;
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
       ORDER BY
         CASE d.category
           WHEN '정관·등기·의사록' THEN 1
           WHEN '주주·주식·자본' THEN 2
           WHEN '세무·공과·인증' THEN 3
           WHEN '부동산·임대차' THEN 4
           WHEN '기타 중요문서' THEN 5
           WHEN '법인설립 원시서류 (보존용)' THEN 99
           ELSE 50
         END ASC,
         d.id ASC`,
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
    const category = String(formData.get("category") || "정관·등기·의사록").trim();
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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action || "");
    const pool = getErpPool();
    await ensureCorporateDocTables(pool);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (action === "RESEQUENCE_DOCUMENT") {
        const documentId = Number(body.documentId || 0);
        if (!documentId) {
          throw new Error("대상 문서 ID가 필요합니다.");
        }
        const count = await resequenceDocumentVersions(client, documentId);
        await client.query("COMMIT");
        return NextResponse.json({
          success: true,
          message: `버전 번호가 v1.0 ~ v${count}.0 순번으로 자동 정렬되었습니다.`,
        });
      }

      if (action === "UPDATE_VERSION") {
        const versionId = Number(body.versionId || 0);
        if (!versionId) {
          throw new Error("수정할 버전 ID가 필요합니다.");
        }
        const verRes = await client.query(
          `SELECT id, document_id, version_no, version_label, effective_date::text AS effective_date, change_note
           FROM erp_corporate_document_versions
           WHERE id = $1 FOR UPDATE`,
          [versionId]
        );
        if (verRes.rows.length === 0) {
          throw new Error("대상 버전을 찾을 수 없습니다.");
        }
        const row = verRes.rows[0];
        const newVersionNo = body.versionNo !== undefined ? Math.max(1, Number(body.versionNo)) : Number(row.version_no);
        const newVersionLabel =
          body.versionLabel !== undefined && String(body.versionLabel).trim() !== ""
            ? String(body.versionLabel).trim()
            : `v${newVersionNo}.0`;
        const newEffectiveDate =
          body.effectiveDate !== undefined ? String(body.effectiveDate || "").trim() || null : row.effective_date;
        const newChangeNote =
          body.changeNote !== undefined ? String(body.changeNote).trim() : row.change_note;

        // If another version of the same document already has newVersionNo, shift it temporarily
        if (newVersionNo !== Number(row.version_no)) {
          const conflictRes = await client.query(
            `SELECT id FROM erp_corporate_document_versions
             WHERE document_id = $1 AND version_no = $2 AND id <> $3`,
            [row.document_id, newVersionNo, versionId]
          );
          if (conflictRes.rows.length > 0) {
            // Swap version_no with the conflicting row
            const conflictId = conflictRes.rows[0].id;
            await client.query(
              `UPDATE erp_corporate_document_versions SET version_no = -9999 WHERE id = $1`,
              [conflictId]
            );
            await client.query(
              `UPDATE erp_corporate_document_versions
               SET version_no = $1, version_label = $2, effective_date = $3, change_note = $4
               WHERE id = $5`,
              [newVersionNo, newVersionLabel, newEffectiveDate, newChangeNote, versionId]
            );
            await client.query(
              `UPDATE erp_corporate_document_versions
               SET version_no = $1, version_label = $2
               WHERE id = $3`,
              [row.version_no, `v${row.version_no}.0`, conflictId]
            );
          } else {
            await client.query(
              `UPDATE erp_corporate_document_versions
               SET version_no = $1, version_label = $2, effective_date = $3, change_note = $4
               WHERE id = $5`,
              [newVersionNo, newVersionLabel, newEffectiveDate, newChangeNote, versionId]
            );
          }
        } else {
          await client.query(
            `UPDATE erp_corporate_document_versions
             SET version_label = $1, effective_date = $2, change_note = $3
             WHERE id = $4`,
            [newVersionLabel, newEffectiveDate, newChangeNote, versionId]
          );
        }

        const maxVerRes = await client.query(
          `SELECT COALESCE(MAX(version_no), 1) AS max_ver FROM erp_corporate_document_versions WHERE document_id = $1`,
          [row.document_id]
        );
        const maxVer = Number(maxVerRes.rows[0].max_ver || 1);
        await client.query(
          `UPDATE erp_corporate_documents SET current_version = $1, updated_at = NOW() WHERE id = $2`,
          [maxVer, row.document_id]
        );

        await client.query("COMMIT");
        return NextResponse.json({
          success: true,
          message: `버전 정보(${newVersionLabel})가 수정되었습니다.`,
        });
      }

      throw new Error("유효하지 않은 요청(action)입니다.");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("PATCH /api/erp/corporate-docs Error:", error);
    return NextResponse.json(
      { error: "버전 수정 실패: " + error.message },
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

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM erp_corporate_document_versions WHERE id = $1`, [versionId]);
        const remainCount = await resequenceDocumentVersions(client, Number(row.document_id));
        if (remainCount === 0) {
          await client.query(`DELETE FROM erp_corporate_documents WHERE id = $1`, [row.document_id]);
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }

      return NextResponse.json({
        success: true,
        message: "선택한 문서 버전이 삭제되고 남은 버전 번호가 자동 정렬되었습니다.",
      });
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
