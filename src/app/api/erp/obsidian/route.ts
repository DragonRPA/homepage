export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import {
  putErpPrivateObject,
  deleteErpPrivateObject,
} from "@/lib/r2ErpVault";

async function ensureObsidianTables() {
  const pool = getErpPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS erp_obsidian_notes (
      id SERIAL PRIMARY KEY,
      file_path VARCHAR(500) UNIQUE NOT NULL,
      folder_path VARCHAR(300) NOT NULL DEFAULT '',
      title VARCHAR(300) NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      tags TEXT[] DEFAULT '{}',
      frontmatter JSONB DEFAULT '{}'::jsonb,
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      r2_key TEXT,
      source_type VARCHAR(50) NOT NULL DEFAULT 'ERP_EDITOR',
      author_name VARCHAR(100) DEFAULT '이정용 대표이사',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE erp_obsidian_notes ENABLE ROW LEVEL SECURITY;
  `);

  // 초기 기본 노트 시드 (비어있을 때만)
  const countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM erp_obsidian_notes`);
  if ((countRes.rows[0]?.cnt || 0) === 0) {
    const seedNotes = [
      {
        file_path: "00_인박스/옵시디언 PC-모바일-ERP 통합 가이드.md",
        folder_path: "00_인박스",
        title: "옵시디언 PC-모바일-ERP 통합 가이드",
        content: `---
title: 옵시디언 PC-모바일-ERP 통합 가이드
tags: [옵시디언, 동기화, 업무매뉴얼, ERP]
created: 2026-11-07
---

# 옵시디언 PC · 핸드폰 · ERP 3자 실시간 연동 가이드

이 보관소(Vault)는 **PC 옵시디언**, **핸드폰(모바일) 옵시디언**, 그리고 **드래곤알피에이 ERP**가 하나로 연결된 통합 지식보관소입니다.

## 1. 활용 방법 3가지
- **ERP 웹/모바일에서 바로 작성·열람**: 별도 앱 없이도 PC 및 스마트폰 브라우저에서 ERP의 **[옵시디언 노트]** 메뉴로 접속하여 마크다운(\`.md\`), \`#태그\`, \`[[내부 위키링크]]\` 노트를 즉시 작성하고 검색할 수 있습니다.
- **PC 옵시디언 로컬 폴더 1클릭 양방향 동기화**: 상단의 **[PC 옵시디언 폴더 동기화]** 버튼을 눌러 내 PC의 옵시디언 Vault 폴더를 선택하면, PC에 저장된 모든 \`.md\` 파일이 ERP로 올라오고 모바일/ERP에서 작성한 노트가 내 PC 옵시디언 폴더에 \`.md\` 파일로 자동 생성됩니다.
- **PC 옵시디언 ↔ 폰 옵시디언 앱 직결 (Remotely Save + R2)**: 상단의 **[PC·폰 옵시디언 앱 연동 설정]** 버튼에서 당사 전용 Cloudflare R2(S3 호환) 연동 키를 복사하여 무료 플러그인 \`Remotely Save\`에 입력하면, 유료 Obsidian Sync 없이도 PC 앱과 핸드폰 앱이 실시간 동기화됩니다.

## 2. 연결된 주요 노트
- [[2026년 정부지원사업 및 R&D 핵심 전략]]
- [[렌탈 자산 운영 및 ERP 고도화 메모]]
`,
        tags: ["옵시디언", "동기화", "업무매뉴얼", "ERP"],
        is_pinned: true,
      },
      {
        file_path: "01_정부지원_전략/2026년 정부지원사업 및 R&D 핵심 전략.md",
        folder_path: "01_정부지원_전략",
        title: "2026년 정부지원사업 및 R&D 핵심 전략",
        content: `---
title: 2026년 정부지원사업 및 R&D 핵심 전략
tags: [정부지원사업, 스마트서비스, AI바우처, 드래곤알피에이]
created: 2026-11-07
---

# 2026년 정부지원사업 및 R&D 핵심 전략

## 주요 타깃 공고 체크리스트
- [x] 중소기업 스마트서비스 지원사업 (AI·RPA·클라우드 ERP 고도화)
- [ ] AI 바우처 및 클라우드 서비스 보급확산 사업 공급기업/수요기업 매칭
- [ ] 서울 금천구(G밸리) 및 서울경제진흥원(SBA) 디지털 전환 지원사업

## 관련 노트
- [[옵시디언 PC-모바일-ERP 통합 가이드]]
- [[렌탈 자산 운영 및 ERP 고도화 메모]]

> **Tip**: ERP 좌측 메뉴의 **[정부지원·뉴스·트렌드]** 화면에서 원하는 공고나 원문을 선택한 뒤 **[옵시디언 노트로 보내기]** 버튼을 누르면 이 폴더에 자동으로 마크다운 노트가 생성됩니다.
`,
        tags: ["정부지원사업", "스마트서비스", "AI바우처", "드래곤알피에이"],
        is_pinned: true,
      },
      {
        file_path: "02_업무노트/렌탈 자산 운영 및 ERP 고도화 메모.md",
        folder_path: "02_업무노트",
        title: "렌탈 자산 운영 및 ERP 고도화 메모",
        content: `---
title: 렌탈 자산 운영 및 ERP 고도화 메모
tags: [렌탈운영, 현대렌탈서비스, 업무메모]
created: 2026-11-07
---

# 렌탈 자산 운영 및 ERP 고도화 메모

## 주요 점검 사항
1. **운영 용역 계약 관리**: 현대렌탈서비스 투입 인원(장종순, 박종환, 김승지, 이주봉) 월 정산 및 일할 계산 자동화 완료
2. **연차 및 초과근무 결재선**: 부서장(장종순) 전결 일원화 완료
3. **지식 관리**: 현장에서 스마트폰으로 메모한 내용을 PC 옵시디언과 ERP에서 즉시 이어서 편집

- 상위 문서: [[옵시디언 PC-모바일-ERP 통합 가이드]]
`,
        tags: ["렌탈운영", "현대렌탈서비스", "업무메모"],
        is_pinned: false,
      },
    ];

    for (const n of seedNotes) {
      await pool.query(
        `INSERT INTO erp_obsidian_notes (
          file_path, folder_path, title, content, tags, is_pinned, source_type, author_name
        ) VALUES ($1, $2, $3, $4, $5, $6, 'SEED', '이정용 대표이사')
        ON CONFLICT (file_path) DO NOTHING`,
        [n.file_path, n.folder_path, n.title, n.content, n.tags, n.is_pinned]
      );
    }
  }
}

function normalizeFilePath(folderPath: string, titleOrFile: string): {
  filePath: string;
  cleanFolder: string;
  cleanTitle: string;
} {
  const rawFolder = (folderPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .trim();
  let rawTitle = (titleOrFile || "제목 없는 노트")
    .replace(/\\/g, "/")
    .trim();

  // 만약 titleOrFile 자체에 경로가 포함되어 있으면 분리
  if (rawTitle.includes("/")) {
    const parts = rawTitle.split("/").filter(Boolean);
    const filePart = parts.pop() || "제목 없는 노트";
    const folderPart = parts.join("/");
    const cleanTitle = filePart.replace(/\.md$/i, "").trim() || "제목 없는 노트";
    const mergedFolder = rawFolder ? `${rawFolder}/${folderPart}` : folderPart;
    const filePath = mergedFolder ? `${mergedFolder}/${cleanTitle}.md` : `${cleanTitle}.md`;
    return { filePath, cleanFolder: mergedFolder, cleanTitle };
  }

  const cleanTitle = rawTitle.replace(/\.md$/i, "").trim() || "제목 없는 노트";
  const filePath = rawFolder ? `${rawFolder}/${cleanTitle}.md` : `${cleanTitle}.md`;
  return { filePath, cleanFolder: rawFolder, cleanTitle };
}

function extractTagsAndFrontmatter(markdown: string, extraTags: string[] = []): {
  tags: string[];
  frontmatter: Record<string, any>;
} {
  const tagSet = new Set<string>(
    (extraTags || []).map((t) => String(t).replace(/^#+/, "").trim()).filter(Boolean)
  );
  const frontmatter: Record<string, any> = {};

  const fmMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const fmLines = fmMatch[1].split(/\r?\n/);
    for (const line of fmLines) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        frontmatter[key] = val;
        if (key.toLowerCase() === "tags") {
          const cleaned = val.replace(/^\[|\]$/g, "");
          cleaned
            .split(/[,\s]+/)
            .map((t) => t.replace(/^#+|['"]/g, "").trim())
            .filter(Boolean)
            .forEach((t) => tagSet.add(t));
        }
      }
    }
  }

  // 본문 내 #태그 추출 (헤더 # 제외)
  const bodyWithoutCode = markdown.replace(/```[\s\S]*?```/g, "");
  const hashtagRegex = /(?:^|\s)#([a-zA-Z0-9가-힣_-]{2,30})/g;
  let match: RegExpExecArray | null;
  while ((match = hashtagRegex.exec(bodyWithoutCode)) !== null) {
    tagSet.add(match[1]);
  }

  return {
    tags: Array.from(tagSet),
    frontmatter,
  };
}

export async function GET(request: Request) {
  try {
    await ensureObsidianTables();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "LIST";
    const pool = getErpPool();

    if (action === "SYNC_CONFIG") {
      const accountId = process.env.R2_ERP_ACCOUNT_ID?.trim() || "";
      const bucket = process.env.R2_ERP_BUCKET_NAME?.trim() || "dragonrpa-erp-private";
      const accessKeyId = process.env.R2_ERP_ACCESS_KEY_ID?.trim() || "";
      const secretAccessKey = process.env.R2_ERP_SECRET_ACCESS_KEY?.trim() || "";
      const endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "";

      return NextResponse.json({
        success: true,
        r2Config: {
          hasCredentials: Boolean(accountId && accessKeyId && secretAccessKey),
          endpoint,
          region: "auto",
          bucket,
          accessKeyId,
          secretAccessKey,
          vaultPrefix: "obsidian-vault",
        },
      });
    }

    const res = await pool.query(`
      SELECT
        id,
        file_path AS "filePath",
        folder_path AS "folderPath",
        title,
        content,
        tags,
        frontmatter,
        is_pinned AS "isPinned",
        r2_key AS "r2Key",
        source_type AS "sourceType",
        author_name AS "authorName",
        updated_at AS "updatedAt",
        created_at AS "createdAt"
      FROM erp_obsidian_notes
      ORDER BY is_pinned DESC, updated_at DESC
    `);

    return NextResponse.json({
      success: true,
      notes: res.rows,
    });
  } catch (err: any) {
    console.error("GET /api/erp/obsidian error:", err);
    return NextResponse.json(
      { error: err.message || "옵시디언 노트 조회 실패" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureObsidianTables();
    const body = await request.json();
    const action = body.action || "SAVE_NOTE";
    const pool = getErpPool();

    // 1. 개별 노트 생성 / 수정
    if (action === "SAVE_NOTE") {
      const {
        id,
        folderPath = "",
        title,
        content = "",
        tags = [],
        isPinned = false,
        authorName = "이정용 대표이사",
        sourceType = "ERP_EDITOR",
      } = body;

      if (!title || !String(title).trim()) {
        return NextResponse.json({ error: "노트 제목을 입력해 주십시오." }, { status: 400 });
      }

      const { filePath, cleanFolder, cleanTitle } = normalizeFilePath(folderPath, title);
      const parsed = extractTagsAndFrontmatter(String(content), Array.isArray(tags) ? tags : []);
      const r2Key = `obsidian-vault/${filePath}`;

      // R2에도 .md 원본 파일 비동기/동기 백업 저장 (Remotely Save / 클라우드 백업 호환)
      try {
        await putErpPrivateObject(
          r2Key,
          Buffer.from(String(content), "utf-8"),
          "text/markdown; charset=utf-8"
        );
      } catch (r2Err) {
        console.warn("Obsidian R2 backup skipped:", r2Err);
      }

      let savedRow: any;
      if (id) {
        const upd = await pool.query(
          `UPDATE erp_obsidian_notes
           SET file_path = $1,
               folder_path = $2,
               title = $3,
               content = $4,
               tags = $5,
               frontmatter = $6::jsonb,
               is_pinned = $7,
               r2_key = $8,
               source_type = $9,
               author_name = $10,
               updated_at = NOW()
           WHERE id = $11
           RETURNING
             id,
             file_path AS "filePath",
             folder_path AS "folderPath",
             title,
             content,
             tags,
             frontmatter,
             is_pinned AS "isPinned",
             r2_key AS "r2Key",
             source_type AS "sourceType",
             author_name AS "authorName",
             updated_at AS "updatedAt",
             created_at AS "createdAt"`,
          [
            filePath,
            cleanFolder,
            cleanTitle,
            String(content),
            parsed.tags,
            JSON.stringify(parsed.frontmatter),
            Boolean(isPinned),
            r2Key,
            sourceType,
            authorName,
            Number(id),
          ]
        );
        savedRow = upd.rows[0];
      }

      if (!savedRow) {
        const ins = await pool.query(
          `INSERT INTO erp_obsidian_notes (
            file_path, folder_path, title, content, tags, frontmatter, is_pinned, r2_key, source_type, author_name, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, NOW())
          ON CONFLICT (file_path) DO UPDATE SET
            folder_path = EXCLUDED.folder_path,
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            tags = EXCLUDED.tags,
            frontmatter = EXCLUDED.frontmatter,
            is_pinned = EXCLUDED.is_pinned,
            r2_key = EXCLUDED.r2_key,
            source_type = EXCLUDED.source_type,
            author_name = EXCLUDED.author_name,
            updated_at = NOW()
          RETURNING
            id,
            file_path AS "filePath",
            folder_path AS "folderPath",
            title,
            content,
            tags,
            frontmatter,
            is_pinned AS "isPinned",
            r2_key AS "r2Key",
            source_type AS "sourceType",
            author_name AS "authorName",
            updated_at AS "updatedAt",
            created_at AS "createdAt"`,
          [
            filePath,
            cleanFolder,
            cleanTitle,
            String(content),
            parsed.tags,
            JSON.stringify(parsed.frontmatter),
            Boolean(isPinned),
            r2Key,
            sourceType,
            authorName,
          ]
        );
        savedRow = ins.rows[0];
      }

      return NextResponse.json({
        success: true,
        note: savedRow,
      });
    }

    // 2. PC 로컬 옵시디언 폴더 / 다중 .md 파일 일괄 동기화 업로드
    if (action === "BULK_SYNC_UPLOAD") {
      const files = Array.isArray(body.files) ? body.files : [];
      const authorName = body.authorName || "이정용 대표이사";
      if (files.length === 0) {
        return NextResponse.json({ error: "동기화할 마크다운 파일이 없습니다." }, { status: 400 });
      }

      let syncedCount = 0;
      for (const item of files) {
        const rawRelPath = String(item.relativePath || item.fileName || "").replace(/\\/g, "/");
        if (!rawRelPath || !rawRelPath.toLowerCase().endsWith(".md")) continue;
        // .obsidian 설정 폴더나 휴지통 제외
        if (rawRelPath.startsWith(".obsidian/") || rawRelPath.includes("/.obsidian/") || rawRelPath.startsWith(".trash/")) {
          continue;
        }

        const { filePath, cleanFolder, cleanTitle } = normalizeFilePath("", rawRelPath);
        const contentStr = String(item.content ?? "");
        const parsed = extractTagsAndFrontmatter(contentStr);
        const r2Key = `obsidian-vault/${filePath}`;

        try {
          await putErpPrivateObject(
            r2Key,
            Buffer.from(contentStr, "utf-8"),
            "text/markdown; charset=utf-8"
          );
        } catch {
          // ignore R2 error on bulk
        }

        await pool.query(
          `INSERT INTO erp_obsidian_notes (
            file_path, folder_path, title, content, tags, frontmatter, r2_key, source_type, author_name, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, 'PC_VAULT_SYNC', $8, NOW())
          ON CONFLICT (file_path) DO UPDATE SET
            folder_path = EXCLUDED.folder_path,
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            tags = EXCLUDED.tags,
            frontmatter = EXCLUDED.frontmatter,
            r2_key = EXCLUDED.r2_key,
            source_type = 'PC_VAULT_SYNC',
            author_name = EXCLUDED.author_name,
            updated_at = NOW()`,
          [
            filePath,
            cleanFolder,
            cleanTitle,
            contentStr,
            parsed.tags,
            JSON.stringify(parsed.frontmatter),
            r2Key,
            authorName,
          ]
        );
        syncedCount++;
      }

      const listRes = await pool.query(`
        SELECT
          id,
          file_path AS "filePath",
          folder_path AS "folderPath",
          title,
          content,
          tags,
          frontmatter,
          is_pinned AS "isPinned",
          r2_key AS "r2Key",
          source_type AS "sourceType",
          author_name AS "authorName",
          updated_at AS "updatedAt",
          created_at AS "createdAt"
        FROM erp_obsidian_notes
        ORDER BY is_pinned DESC, updated_at DESC
      `);

      return NextResponse.json({
        success: true,
        syncedCount,
        notes: listRes.rows,
      });
    }

    return NextResponse.json({ error: "지원하지 않는 요청 액션입니다." }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/erp/obsidian error:", err);
    return NextResponse.json(
      { error: err.message || "옵시디언 노트 저장 실패" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureObsidianTables();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 노트 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const rowRes = await pool.query(
      `DELETE FROM erp_obsidian_notes WHERE id = $1 RETURNING r2_key AS "r2Key"`,
      [Number(id)]
    );

    const r2Key = rowRes.rows[0]?.r2Key;
    if (r2Key) {
      try {
        await deleteErpPrivateObject(String(r2Key));
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/erp/obsidian error:", err);
    return NextResponse.json(
      { error: err.message || "옵시디언 노트 삭제 실패" },
      { status: 500 }
    );
  }
}
