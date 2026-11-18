import { normalizeBizNoDigits } from "@/lib/partnerStatusClient";
import type { Partner } from "./partnerTypes";

/** Helper: Load pdf.js from CDN and extract Page 1 JPEG + Text Hint from File or PDF Data URL */
export async function extractPdfImageAndTextFromSource(
  source: File | string
): Promise<{ imageBase64: string; textHint: string }> {
  if (typeof window === "undefined") {
    return { imageBase64: "", textHint: "" };
  }

  const w = window as any;
  if (!w.pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("PDF 렌더링 엔진 로드에 실패했습니다."));
      document.head.appendChild(script);
    });
  }

  const pdfjsLib = w.pdfjsLib;
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  let binaryData: ArrayBuffer | Uint8Array;
  if (typeof source === "string") {
    const commaIdx = source.indexOf(",");
    const b64 = commaIdx >= 0 ? source.slice(commaIdx + 1) : source;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    binaryData = bytes;
  } else {
    binaryData = await source.arrayBuffer();
  }

  const loadingTask = pdfjsLib.getDocument({
    data: binaryData,
    cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
    cMapPacked: true,
    standardFontDataUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/",
  });

  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(1);

  let textHint = "";
  try {
    const textContent = await page.getTextContent();
    const items = (textContent.items || []) as any[];
    let lastY: number | null = null;
    const parts: string[] = [];
    for (const item of items) {
      const y = item.transform ? Math.round(item.transform[5]) : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
        parts.push("\n");
      } else if (parts.length > 0) {
        parts.push(" ");
      }
      parts.push(item.str || "");
      if (y !== null) lastY = y;
    }
    textHint = parts.join("");
  } catch (e) {
    console.warn("PDF textContent extraction warning:", e);
  }

  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(64, Math.round(viewport.width));
  canvas.height = Math.max(64, Math.round(viewport.height));
  const ctx = canvas.getContext("2d");
  let imageBase64 = "";
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    imageBase64 = canvas.toDataURL("image/jpeg", 0.88);
  }

  return { imageBase64, textHint };
}

/** Helper: Resize image file onto Canvas -> JPEG base64 */
export function resizeImageToBase64(file: File, maxDim = 1800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지 파일 읽기 실패"));
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        width = Math.max(64, width);
        height = Math.max(64, height);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function exportPartnersToCsv(sortedPartners: Partner[], partnerTypeTab: string): void {
  const headers = [
    "거래처코드",
    "구분",
    "상호명",
    "사업자등록번호",
    "대표자",
    "업태",
    "종목",
    "본사주소",
    "대표전화",
    "대표이메일",
    "본사담당직원",
    "거래명세서마감일",
    "세금계산서마감일",
    "약정납기일(결제일)",
    "거래상태",
    "대표담당자",
    "대표담당자휴대폰",
  ];

  const rows = sortedPartners.map((p) => [
    p.partnerCode,
    p.partnerType === "CUSTOMER" ? "고객" : p.partnerType === "VENDOR" ? "매입거래처" : "고객/매입겸용",
    p.name,
    p.businessNo || "-",
    p.ceoName || "-",
    p.bizType || "-",
    p.bizItem || "-",
    `${p.address || ""} ${p.addressDetail || ""}`.trim() || "-",
    p.mainPhone || "-",
    p.mainEmail || "-",
    p.managerName || "-",
    p.statementClosingDay,
    p.taxInvoiceClosingDay,
    p.paymentDueDay,
    p.status === "ACTIVE" ? "정상" : p.status === "BLOCKED" ? "거래불가" : p.status === "INACTIVE" ? "중지" : "휴면",
    p.primaryContact?.name || "-",
    p.primaryContact?.mobile || "-",
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" +
    [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `거래처대장_${partnerTypeTab}_${new Date().toISOString().substring(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  if (file.type.startsWith("image/")) {
    try {
      return await resizeImageToBase64(file, 1800);
    } catch {
      // fallback
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

export function isPdfDocument(url?: string | null, fileName?: string | null): boolean {
  if (!url && !fileName) return false;
  if (url && url.startsWith("data:image/")) return false;
  if (url && (url.startsWith("data:application/pdf") || url.toLowerCase().includes(".pdf"))) return true;
  if (fileName && fileName.toLowerCase().endsWith(".pdf")) return true;
  return false;
}

export async function processBankCopyOcr(file: File): Promise<{
  bankName: string;
  bankAccountNo: string;
  bankAccountHolder: string;
  branchName?: string;
  previewUrl: string;
}> {
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  let imageBase64 = "";
  let textHint = "";

  if (isPdf) {
    try {
      const pdfOut = await extractPdfImageAndTextFromSource(file);
      imageBase64 = pdfOut.imageBase64;
      textHint = pdfOut.textHint;
    } catch (pdfErr) {
      console.warn("Client PDF render fallback for bank copy:", pdfErr);
    }
  } else {
    imageBase64 = await resizeImageToBase64(file, 1800);
  }

  const rawUrl = await readFileAsDataUrl(file);

  const res = await fetch("/api/erp/partners/ocr-bank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: imageBase64 || undefined,
      rawText: textHint || undefined,
      fileName: file.name,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success || !data.parsed) {
    throw new Error(data?.error || "통장사본 OCR 판독에 실패했습니다.");
  }

  return {
    bankName: data.parsed.bankName || "",
    bankAccountNo: data.parsed.bankAccountNo || "",
    bankAccountHolder: data.parsed.bankAccountHolder || "",
    branchName: data.parsed.branchName || "",
    previewUrl: rawUrl,
  };
}

export async function extractBizCertOcrFromFile(file: File): Promise<{
  rawDataUrl: string;
  thumbUrl: string;
  parsed: any | null;
  errorMessage?: string;
}> {
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  const rawDataUrl = await readFileAsDataUrl(file);
  let imageBase64 = "";
  let textHint = "";

  if (isPdf) {
    try {
      const pdfOut = await extractPdfImageAndTextFromSource(file);
      imageBase64 = pdfOut.imageBase64;
      textHint = pdfOut.textHint;
    } catch (pdfErr) {
      console.warn("Client PDF render fallback:", pdfErr);
    }
  } else {
    imageBase64 = rawDataUrl;
  }

  const res = await fetch("/api/erp/partners/ocr-biz-cert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: imageBase64 || undefined,
      rawText: textHint || undefined,
      fileName: file.name,
    }),
  });
  const data = await res.json();
  return {
    rawDataUrl,
    thumbUrl: imageBase64 || rawDataUrl,
    parsed: data.success && data.parsed ? data.parsed : null,
    errorMessage: !data.success ? data.error : undefined,
  };
}

export async function queryNtsByBizNoClient(bizNo: string) {
  const digits = normalizeBizNoDigits(bizNo);
  if (digits.length !== 10) return null;
  const res = await fetch("/api/erp/partners/check-biz-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessNo: bizNo }),
  });
  const data = await res.json();
  return res.ok && data.success ? data.result : null;
}
