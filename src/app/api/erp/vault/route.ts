export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPrivateObject, putErpPrivateObject } from "@/lib/r2ErpVault";

/**
 * GET /api/erp/vault?key=contracts/contract_2025_jang_jongsoon.pdf
 * - Cloudflare R2 비공개 버킷(dragonrpa-erp-private)에서 문서를 안전하게 스트리밍 반환
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const filename = searchParams.get("filename");
    const download = searchParams.get("download") === "1";

    if (!key || !key.trim()) {
      return NextResponse.json({ error: "조회할 파일 키(key)가 필요합니다." }, { status: 400 });
    }

    const cleanKey = key.replace(/^\/+/, "");
    const { buffer, contentType } = await getErpPrivateObject(cleanKey);

    const safeFilename = filename || cleanKey.split("/").pop() || "document.pdf";
    const disposition = download
      ? `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
      : `inline; filename*=UTF-8''${encodeURIComponent(safeFilename)}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=3600",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error: any) {
    console.error("GET /api/erp/vault Error:", error);
    return NextResponse.json(
      { error: "비공개 보관함 파일 열람 실패: " + error.message },
      { status: 404 }
    );
  }
}

/**
 * POST /api/erp/vault
 * - 멀티파트 폼 데이터(file, folder) 또는 JSON(base64DataUrl, fileName, folder)을 받아
 *   ERP 전용 비공개 버킷(dragonrpa-erp-private)에 업로드하고 보안 조회 URL 반환
 */
export async function POST(request: Request) {
  try {
    const contentTypeHeader = request.headers.get("content-type") || "";
    let fileBuffer: Buffer;
    let mimeType = "application/pdf";
    let originalName = "document.pdf";
    let folder = "contracts";

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const folderField = formData.get("folder") as string | null;
      if (!file) {
        return NextResponse.json({ error: "업로드할 파일이 누락되었습니다." }, { status: 400 });
      }
      if (folderField) folder = folderField.replace(/[^a-zA-Z0-9_-]/g, "");
      originalName = file.name || "document.pdf";
      mimeType = file.type || "application/pdf";
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await request.json();
      const { dataUrl, fileName, folder: bodyFolder } = body;
      if (!dataUrl || typeof dataUrl !== "string") {
        return NextResponse.json({ error: "파일 데이터가 누락되었습니다." }, { status: 400 });
      }
      if (bodyFolder) folder = String(bodyFolder).replace(/[^a-zA-Z0-9_-]/g, "");
      originalName = fileName || "document.pdf";

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        fileBuffer = Buffer.from(match[2], "base64");
      } else {
        fileBuffer = Buffer.from(dataUrl, "base64");
      }
    }

    const ext = (originalName.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
    const safeSlug = originalName
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9가-힣_-]/g, "_")
      .slice(0, 50);
    const objectKey = `${folder}/${Date.now()}_${safeSlug}.${ext}`;

    await putErpPrivateObject(objectKey, fileBuffer, mimeType);

    const vaultUrl = `/api/erp/vault?key=${encodeURIComponent(objectKey)}`;
    return NextResponse.json({
      success: true,
      key: objectKey,
      url: vaultUrl,
      fileName: originalName,
      size: fileBuffer.length,
    });
  } catch (error: any) {
    console.error("POST /api/erp/vault Error:", error);
    return NextResponse.json(
      { error: "비공개 버킷 파일 업로드 실패: " + error.message },
      { status: 500 }
    );
  }
}
