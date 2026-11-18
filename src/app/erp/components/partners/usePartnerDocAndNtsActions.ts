"use client";

import React, { useEffect, useState } from "react";
import { getNtsBizStateBadgeLabel, normalizeBizNoDigits } from "@/lib/partnerStatusClient";
import type { ActiveDocumentViewer, Partner } from "./partnerTypes";
import {
  extractBizCertOcrFromFile,
  extractPdfImageAndTextFromSource,
  isPdfDocument,
  processBankCopyOcr,
  queryNtsByBizNoClient,
  readFileAsDataUrl,
} from "./partnerPdfUtils";
import {
  buildPartnerPutPayload,
  createDefaultPartnerBankOcrForm,
  createPartnerFormFromBizCertOcr,
  createPdfBlobUrlFromDataUrl,
  createViewerFormFromPartner,
  formatBankOcrDetails,
  isPdfOrImageFile,
  mergeBizCertParsedIntoForm,
  mergeNtsStatusIntoForm,
  type PartnerFileBundle,
} from "./partnerFormHelpers";

export interface UsePartnerDocAndNtsActionsParams {
  currentUser: any;
  partnerTypeTab: "CUSTOMER" | "VENDOR" | "ALL";
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  selectedPartner: Partner | null;
  setSelectedPartner: React.Dispatch<React.SetStateAction<Partner | null>>;
  sortedPartners: Partner[];
  filesCacheRef: React.MutableRefObject<Record<number, PartnerFileBundle>>;
  fetchPartners: () => Promise<void>;
  showToast: (text: string, type?: "success" | "error") => void;
  partnerForm: any;
  setPartnerForm: React.Dispatch<any>;
  partnerModalMode: "CREATE" | "EDIT";
  setPartnerModalMode: React.Dispatch<React.SetStateAction<"CREATE" | "EDIT">>;
  setShowPartnerModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBizCertOcrModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBankOcrModal: React.Dispatch<React.SetStateAction<boolean>>;
  activeDocument: ActiveDocumentViewer | null;
  setActiveDocument: React.Dispatch<React.SetStateAction<ActiveDocumentViewer | null>>;
}

type DossierDocKind = "BIZ_CERT" | "CONTRACT";

const DOSSIER_DOC_META: Record<
  DossierDocKind,
  {
    label: string;
    invalidMsg: string;
    urlKey: "bizCertFileUrl" | "contractFileUrl";
    nameKey: "bizCertFileName" | "contractFileName";
    flagKey: "hasBizCert" | "hasContractFile";
    catchSaveMsg: string;
  }
> = {
  BIZ_CERT: {
    label: "사업자등록증",
    invalidMsg: "PDF 또는 이미지 형식의 사업자등록증 파일을 업로드해주세요.",
    urlKey: "bizCertFileUrl",
    nameKey: "bizCertFileName",
    flagKey: "hasBizCert",
    catchSaveMsg: "사업자등록증 저장 실패",
  },
  CONTRACT: {
    label: "계약서",
    invalidMsg: "PDF 또는 이미지 형식의 계약서 파일을 업로드해주세요.",
    urlKey: "contractFileUrl",
    nameKey: "contractFileName",
    flagKey: "hasContractFile",
    catchSaveMsg: "계약서 업로드 실패",
  },
};

function createDropzoneDragHandlers(
  isDragging: boolean,
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>,
  onFileDrop: (file: File) => void | Promise<void>
) {
  return {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileDrop(e.dataTransfer.files[0]);
      }
    },
  };
}

async function runBizCertOcrRequest(sourceUrl: string, fileName: string, fallbackError: string) {
  const isPdf = isPdfDocument(sourceUrl, fileName);
  let imageBase64 = sourceUrl;
  let textHint = "";
  if (isPdf) {
    const pdfOut = await extractPdfImageAndTextFromSource(sourceUrl);
    imageBase64 = pdfOut.imageBase64;
    textHint = pdfOut.textHint;
  }

  const res = await fetch("/api/erp/partners/ocr-biz-cert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: imageBase64 || undefined,
      rawText: textHint || undefined,
      fileName: fileName || "biz-cert",
    }),
  });
  const data = await res.json();
  if (!data.success || !data.parsed) throw new Error(data.error || fallbackError);
  return data.parsed;
}

export function usePartnerDocAndNtsActions({
  currentUser,
  partnerTypeTab,
  partners,
  setPartners,
  selectedPartner,
  setSelectedPartner,
  sortedPartners,
  filesCacheRef,
  fetchPartners,
  showToast,
  partnerForm,
  setPartnerForm,
  partnerModalMode,
  setPartnerModalMode,
  setShowPartnerModal,
  setShowBizCertOcrModal,
  setShowBankOcrModal,
  activeDocument,
  setActiveDocument,
}: UsePartnerDocAndNtsActionsParams) {
  const [docFetching, setDocFetching] = useState<boolean>(false);
  const [dossierBizCertSaving, setDossierBizCertSaving] = useState<boolean>(false);
  const [dossierContractSaving, setDossierContractSaving] = useState<boolean>(false);
  const [directBizCertOcrLoading, setDirectBizCertOcrLoading] = useState<boolean>(false);
  const [directBizCertSuggestion, setDirectBizCertSuggestion] = useState<any>(null);
  const [singleNtsCheckingId, setSingleNtsCheckingId] = useState<number | null>(null);
  const [formNtsChecking, setFormNtsChecking] = useState<boolean>(false);

  // Split Document Viewer + Inline Customer Info Edit States
  const [viewerZoom, setViewerZoom] = useState<number>(1);
  const [viewerRotation, setViewerRotation] = useState<number>(0);
  const [isViewerDragging, setIsViewerDragging] = useState<boolean>(false);
  const [resolvedPdfBlobUrl, setResolvedPdfBlobUrl] = useState<string | null>(null);
  const [viewerForm, setViewerForm] = useState<any>(null);
  const [viewerSaving, setViewerSaving] = useState<boolean>(false);
  const [viewerOcrLoading, setViewerOcrLoading] = useState<boolean>(false);
  const [viewerNtsLoading, setViewerNtsLoading] = useState<boolean>(false);

  // Batch Business Status Lookup Modal States
  const [batchScope, setBatchScope] = useState<"CUSTOMER" | "FILTERED" | "ALL">("CUSTOMER");
  const [batchAutoBlock, setBatchAutoBlock] = useState<boolean>(true);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<{ summary: any; results: any[] } | null>(null);

  // OCR Processing States (Business Registration Certificate)
  const [isCertDragging, setIsCertDragging] = useState<boolean>(false);
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [ocrPreviewFileUrl, setOcrPreviewFileUrl] = useState<string>("");
  const [ocrPreviewThumbUrl, setOcrPreviewThumbUrl] = useState<string>("");
  const [ocrNtsStatus, setOcrNtsStatus] = useState<any>(null);
  const [ocrFileName, setOcrFileName] = useState<string>("");

  // Bankbook OCR Modal & Processing States
  const [bankOcrLoading, setBankOcrLoading] = useState<boolean>(false);
  const [bankOcrResult, setBankOcrResult] = useState<any>(null);
  const [bankOcrPreviewUrl, setBankOcrPreviewUrl] = useState<string>("");
  const [bankOcrFileName, setBankOcrFileName] = useState<string>("");
  const [isBankOcrModalDragging, setIsBankOcrModalDragging] = useState<boolean>(false);

  // On-demand fetch for heavy Base64 document files
  const ensurePartnerFiles = async (
    p: Partner,
    requiredDocType?: "BIZ_CERT" | "BANK_COPY" | "CONTRACT"
  ): Promise<PartnerFileBundle> => {
    const cached = filesCacheRef.current[p.id] || {};
    const merged: PartnerFileBundle = {
      bizCertFileUrl: p.bizCertFileUrl || cached.bizCertFileUrl || null,
      bankCopyFileUrl: p.bankCopyFileUrl || cached.bankCopyFileUrl || null,
      contractFileUrl: p.contractFileUrl || cached.contractFileUrl || null,
    };

    const hasNeeded =
      requiredDocType === "BIZ_CERT"
        ? Boolean(merged.bizCertFileUrl)
        : requiredDocType === "BANK_COPY"
        ? Boolean(merged.bankCopyFileUrl)
        : requiredDocType === "CONTRACT"
        ? Boolean(merged.contractFileUrl)
        : Boolean(
            (!p.hasBizCert || merged.bizCertFileUrl) &&
              (!p.hasBankCopy || merged.bankCopyFileUrl) &&
              (!p.hasContractFile || merged.contractFileUrl)
          );

    if (hasNeeded) return merged;

    setDocFetching(true);
    try {
      const res = await fetch(`/api/erp/partners?id=${p.id}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.partner) {
        const loaded: PartnerFileBundle = {
          bizCertFileUrl: data.partner.bizCertFileUrl || null,
          bankCopyFileUrl: data.partner.bankCopyFileUrl || null,
          contractFileUrl: data.partner.contractFileUrl || null,
        };
        filesCacheRef.current[p.id] = loaded;
        setPartners((prev) => prev.map((item) => (item.id === p.id ? { ...item, ...loaded } : item)));
        setSelectedPartner((prev) => (prev && prev.id === p.id ? { ...prev, ...loaded } : prev));
        return loaded;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDocFetching(false);
    }
    return merged;
  };

  const handleOpenPartnerDoc = async (
    p: Partner,
    docType: "BIZ_CERT" | "BANK_COPY" | "CONTRACT",
    mode: "VIEW" | "DOWNLOAD" = "VIEW"
  ) => {
    const files = await ensurePartnerFiles(p, docType);
    const url =
      docType === "BIZ_CERT"
        ? files.bizCertFileUrl
        : docType === "BANK_COPY"
        ? files.bankCopyFileUrl
        : files.contractFileUrl;
    if (!url) {
      showToast("등록된 원본 서류 데이터를 불러올 수 없습니다.", "error");
      return;
    }
    const fileName =
      docType === "BIZ_CERT"
        ? p.bizCertFileName || `${p.name}_사업자등록증`
        : docType === "BANK_COPY"
        ? p.bankCopyFileName || `${p.bankName || p.name}_통장사본`
        : p.contractFileName || `${p.name}_계약서.pdf`;

    if (mode === "DOWNLOAD") {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    setActiveDocument({
      title:
        docType === "BIZ_CERT"
          ? "사업자등록증 원본"
          : docType === "BANK_COPY"
          ? "통장사본 원본"
          : "계약서 원본",
      partnerName: p.name,
      url,
      fileName,
      partnerId: p.id,
      docType,
    });
  };

  // Split Viewer Sync & Chrome/Edge Safe PDF Blob URL
  useEffect(() => {
    setViewerZoom(1);
    setViewerRotation(0);
    setIsViewerDragging(false);

    const createdBlobUrl = createPdfBlobUrlFromDataUrl(activeDocument?.url);
    setResolvedPdfBlobUrl(createdBlobUrl);

    if (activeDocument?.partnerId) {
      const target = partners.find((p) => p.id === activeDocument.partnerId) || selectedPartner;
      if (target && target.id === activeDocument.partnerId) {
        setViewerForm(createViewerFormFromPartner(target));
      }
    } else {
      setViewerForm(null);
    }

    return () => {
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [activeDocument?.url, activeDocument?.partnerId]);

  // Re-run OCR on currently uploaded bank copy fileData
  const handleReRunBankOcr = async () => {
    if (!partnerForm.bankCopyFileUrl) return;
    setBankOcrLoading(true);
    try {
      const res = await fetch("/api/erp/partners/ocr-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: partnerForm.bankCopyFileUrl,
          fileName: partnerForm.bankCopyFileName || "통장사본",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.parsed) {
        throw new Error(data?.error || "통장사본 OCR 판독 실패");
      }
      const p = data.parsed;
      setPartnerForm((prev: any) => ({
        ...prev,
        bankName: p.bankName || prev.bankName,
        bankAccountNo: p.bankAccountNo || prev.bankAccountNo,
        bankAccountHolder: p.bankAccountHolder || prev.bankAccountHolder,
      }));
      const details = formatBankOcrDetails(p, " | ");
      showToast(`통장사본 OCR 재판독 완료 (${details || "반영됨"})`);
    } catch (err: any) {
      showToast(err.message || "통장사본 OCR 판독 실패", "error");
    } finally {
      setBankOcrLoading(false);
    }
  };

  // Direct Bank Copy Upload with Automatic OCR
  const handleBankCopyFileUpload = async (file: File) => {
    if (!file) return;
    setBankOcrLoading(true);
    try {
      const ocr = await processBankCopyOcr(file);
      setPartnerForm((prev: any) => ({
        ...prev,
        bankCopyFileUrl: ocr.previewUrl,
        bankCopyFileName: file.name,
        bankName: ocr.bankName || prev.bankName,
        bankAccountNo: ocr.bankAccountNo || prev.bankAccountNo,
        bankAccountHolder:
          ocr.bankAccountHolder || prev.bankAccountHolder || prev.name || prev.ceoName || "",
      }));
      const details = formatBankOcrDetails(ocr, ", ");
      showToast(`통장사본 자동 인식 완료 (${details || file.name})`);
    } catch {
      try {
        const fallbackUrl = await readFileAsDataUrl(file);
        setPartnerForm((prev: any) => ({
          ...prev,
          bankCopyFileUrl: fallbackUrl,
          bankCopyFileName: file.name,
        }));
        showToast("통장사본 첨부 완료 (OCR 추출 불가로 수기 입력 필요)", "error");
      } catch {
        showToast("통장사본 파일 읽기 실패", "error");
      }
    } finally {
      setBankOcrLoading(false);
    }
  };

  // Bankbook OCR Modal: File Processing
  const handleBankModalFileUpload = async (file: File) => {
    if (!file) return;
    setBankOcrLoading(true);
    setBankOcrFileName(file.name);
    setBankOcrResult(null);

    try {
      const ocr = await processBankCopyOcr(file);
      setBankOcrPreviewUrl(ocr.previewUrl);
      setBankOcrResult({
        bankName: ocr.bankName,
        bankAccountNo: ocr.bankAccountNo,
        bankAccountHolder: ocr.bankAccountHolder,
        branchName: ocr.branchName,
      });
      showToast(`통장사본 분석 완료: ${ocr.bankName || "은행"} ${ocr.bankAccountNo || ""}`);
    } catch (e: any) {
      showToast(e.message || "통장사본 OCR 판독 실패", "error");
    } finally {
      setBankOcrLoading(false);
    }
  };

  const {
    onDragOver: handleBankOcrDragOver,
    onDragLeave: handleBankOcrDragLeave,
    onDrop: handleBankOcrDrop,
  } = createDropzoneDragHandlers(
    isBankOcrModalDragging,
    setIsBankOcrModalDragging,
    handleBankModalFileUpload
  );

  // Apply Bank OCR result to Partner Form (opens CREATE modal as VENDOR)
  const handleApplyBankOcrToForm = () => {
    if (!bankOcrResult) return;
    setPartnerModalMode("CREATE");
    setPartnerForm(
      createDefaultPartnerBankOcrForm({
        bankOcrResult,
        bankOcrFileName,
        bankOcrPreviewUrl,
        currentUser,
      })
    );
    setShowBankOcrModal(false);
    setShowPartnerModal(true);
    showToast("통장사본 정보가 매입거래처 등록 양식에 자동 입력되었습니다.");
  };

  // Direct Business Registration Certificate Upload (Partner Modal: Browse & Drag-Drop + Auto OCR & NTS Check)
  const handleDirectBizCertUpload = async (file: File) => {
    if (!file) return;
    if (!isPdfOrImageFile(file)) {
      showToast("PDF 또는 이미지 형식의 사업자등록증 파일을 선택해주세요.", "error");
      return;
    }

    setDirectBizCertOcrLoading(true);
    setDirectBizCertSuggestion(null);
    try {
      const { rawDataUrl, parsed } = await extractBizCertOcrFromFile(file);
      let ntsRes: any = null;
      if (parsed?.businessNo && normalizeBizNoDigits(parsed.businessNo).length === 10) {
        ntsRes = await queryNtsByBizNoClient(parsed.businessNo).catch(() => null);
      }

      setPartnerForm((prev: any) => {
        let next: any = {
          ...prev,
          bizCertFileUrl: rawDataUrl,
          bizCertFileName: file.name,
          hasBizCert: true,
        };
        if (parsed) {
          const isCreatePristine =
            partnerModalMode === "CREATE" && !prev.name?.trim() && !prev.businessNo?.trim();
          next = mergeBizCertParsedIntoForm(next, parsed, !isCreatePristine);
        }
        if (ntsRes) next = mergeNtsStatusIntoForm(next, ntsRes, false);
        return next;
      });

      if (parsed) {
        setDirectBizCertSuggestion(parsed);
        if (ntsRes?.shouldBlockTrade) {
          showToast(
            `사업자등록증 인식 완료 — 국세청 ${ntsRes.ntsBizState === "CLOSED" ? "폐업자" : "휴업자"}로 확인되어 거래불가로 지정되었습니다.`,
            "error"
          );
        } else {
          showToast(`사업자등록증(${file.name}) 첨부 및 자동 인식이 완료되었습니다.`);
        }
      } else {
        showToast(`사업자등록증(${file.name}) 파일이 첨부되었습니다.`);
      }
    } catch (err: any) {
      showToast(err.message || "사업자등록증 파일 처리 실패", "error");
    } finally {
      setDirectBizCertOcrLoading(false);
    }
  };

  // Re-run OCR on currently attached partnerForm bizCertFileUrl
  const handlePartnerFormReRunOcr = async () => {
    if (!partnerForm.bizCertFileUrl || partnerForm.bizCertFileUrl === "__DELETE__") return;
    setDirectBizCertOcrLoading(true);
    try {
      const parsed = await runBizCertOcrRequest(
        partnerForm.bizCertFileUrl,
        partnerForm.bizCertFileName || "biz-cert",
        "사업자등록증 판독 실패"
      );
      setDirectBizCertSuggestion(parsed);
      showToast("사업자등록증 재인식이 완료되었습니다. 반영할 경우 [인식값 반영]을 선택하세요.");
    } catch (err: any) {
      showToast(err.message || "사업자등록증 재인식 실패", "error");
    } finally {
      setDirectBizCertOcrLoading(false);
    }
  };

  // Apply OCR Suggestion onto partnerForm
  const handleApplyDirectBizCertSuggestion = () => {
    if (!directBizCertSuggestion) return;
    setPartnerForm((prev: any) => mergeBizCertParsedIntoForm(prev, directBizCertSuggestion));
    setDirectBizCertSuggestion(null);
    showToast("사업자등록증 인식값이 입력 양식에 반영되었습니다.");
  };

  // Partner Modal Single NTS Check
  const handleFormCheckNtsStatus = async () => {
    if (normalizeBizNoDigits(partnerForm.businessNo).length !== 10) {
      showToast("10자리 사업자등록번호를 먼저 입력해주세요.", "error");
      return;
    }
    setFormNtsChecking(true);
    try {
      const res = await queryNtsByBizNoClient(partnerForm.businessNo);
      if (!res) throw new Error("국세청 휴·폐업 조회 실패");
      setPartnerForm((prev: any) => mergeNtsStatusIntoForm(prev, res));
      if (res.shouldBlockTrade) {
        showToast(
          `국세청 확인: ${res.ntsBizState === "CLOSED" ? "폐업자" : "휴업자"} — 거래불가 상태로 전환되었습니다.`,
          "error"
        );
      } else {
        showToast(`국세청 확인: ${getNtsBizStateBadgeLabel(res.ntsBizState)} (${res.ntsTaxType})`);
      }
    } catch (err: any) {
      showToast(err.message || "국세청 휴·폐업 조회 실패", "error");
    } finally {
      setFormNtsChecking(false);
    }
  };

  // Direct Contract PDF Upload in Partner Modal
  const handleDirectContractUpload = async (file: File) => {
    if (!file) return;
    if (!isPdfOrImageFile(file)) {
      showToast("PDF 또는 이미지 형식의 계약서 파일을 선택해주세요.", "error");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPartnerForm((prev: any) => ({
        ...prev,
        contractFileUrl: dataUrl,
        contractFileName: file.name,
        hasContractFile: true,
      }));
      showToast(`계약서(${file.name})가 첨부되었습니다.`);
    } catch {
      showToast("계약서 파일 읽기 실패", "error");
    }
  };

  const uploadDossierDoc = async (docKind: DossierDocKind, file: File) => {
    if (!file || !selectedPartner) return;
    const cfg = DOSSIER_DOC_META[docKind];
    if (!isPdfOrImageFile(file)) {
      showToast(cfg.invalidMsg, "error");
      return;
    }
    const setSaving = docKind === "BIZ_CERT" ? setDossierBizCertSaving : setDossierContractSaving;
    setSaving(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch("/api/erp/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPartnerPutPayload(selectedPartner, {
            [cfg.urlKey]: dataUrl,
            [cfg.nameKey]: file.name,
          })
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `${cfg.label} 저장 실패`);
      const targetId = selectedPartner.id;
      const prevCache = filesCacheRef.current[targetId] || {};
      filesCacheRef.current[targetId] = { ...prevCache, [cfg.urlKey]: dataUrl };
      const patch = { [cfg.urlKey]: dataUrl, [cfg.nameKey]: file.name, [cfg.flagKey]: true };
      setPartners((prev) => prev.map((item) => (item.id === targetId ? { ...item, ...patch } : item)));
      setSelectedPartner((prev) => (prev && prev.id === targetId ? { ...prev, ...patch } : prev));
      showToast(`[${selectedPartner.name}] ${cfg.label}(${file.name})이 저장되었습니다.`);
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message || cfg.catchSaveMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteDossierDoc = async (docKind: DossierDocKind) => {
    if (!selectedPartner) return;
    const cfg = DOSSIER_DOC_META[docKind];
    if (!confirm(`[${selectedPartner.name}] 등록된 ${cfg.label} 파일을 삭제하시겠습니까?`)) return;
    const setSaving = docKind === "BIZ_CERT" ? setDossierBizCertSaving : setDossierContractSaving;
    setSaving(true);
    try {
      const res = await fetch("/api/erp/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPartnerPutPayload(selectedPartner, { [cfg.urlKey]: "__DELETE__", [cfg.nameKey]: "" })
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `${cfg.label} 삭제 실패`);
      const targetId = selectedPartner.id;
      if (filesCacheRef.current[targetId]) filesCacheRef.current[targetId][cfg.urlKey] = null;
      const patch = { [cfg.urlKey]: null, [cfg.nameKey]: null, [cfg.flagKey]: false };
      setPartners((prev) => prev.map((item) => (item.id === targetId ? { ...item, ...patch } : item)));
      setSelectedPartner((prev) => (prev && prev.id === targetId ? { ...prev, ...patch } : prev));
      showToast(`[${selectedPartner.name}] ${cfg.label} 파일이 삭제되었습니다.`);
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message || `${cfg.label} 삭제 실패`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDossierBizCertUpload = (file: File) => uploadDossierDoc("BIZ_CERT", file);
  const handleDossierBizCertDelete = () => deleteDossierDoc("BIZ_CERT");
  const handleDossierContractUpload = (file: File) => uploadDossierDoc("CONTRACT", file);
  const handleDossierContractDelete = () => deleteDossierDoc("CONTRACT");

  // Single Partner Immediate NTS Lookup
  const handleRunSingleNtsCheck = async (partner: Partner, autoUnblockActive = false) => {
    if (!partner?.id) return;
    if (normalizeBizNoDigits(partner.businessNo).length !== 10) {
      showToast("유효한 10자리 사업자등록번호가 등록되어 있지 않습니다.", "error");
      return;
    }
    setSingleNtsCheckingId(partner.id);
    try {
      const res = await fetch("/api/erp/partners/check-biz-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: partner.id,
          autoBlock: true,
          autoUnblockActive,
          actorName: currentUser?.name || "ADMIN",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "국세청 휴·폐업 조회 실패");
      const item = data.results?.[0];
      await fetchPartners();
      if (item) {
        if (viewerForm && viewerForm.id === partner.id) {
          setViewerForm((prev: any) => ({
            ...prev,
            status: item.nextStatus,
            ntsBizState: item.ntsBizState,
            ntsTaxType: item.ntsTaxType,
            ntsClosedDate: item.ntsClosedDate,
            ntsStatusMsg: item.ntsStatusMsg,
            ntsCheckedAt: item.ntsCheckedAt,
          }));
        }
        if (item.ntsBizState === "CLOSED" || item.ntsBizState === "SUSPENDED") {
          showToast(
            `[${partner.name}] ${getNtsBizStateBadgeLabel(item.ntsBizState)} 확인 — 거래불가 처리되었습니다.`,
            "error"
          );
        } else {
          showToast(
            `[${partner.name}] 국세청 상태: ${getNtsBizStateBadgeLabel(item.ntsBizState)} (${item.ntsTaxType})`
          );
        }
      }
    } catch (err: any) {
      showToast(err.message || "휴·폐업 조회 실패", "error");
    } finally {
      setSingleNtsCheckingId(null);
    }
  };

  // Batch NTS Lookup Handler
  const handleRunBatchBizStatusCheck = async () => {
    setBatchLoading(true);
    try {
      const payload: Record<string, any> = {
        autoBlock: batchAutoBlock,
        actorName: currentUser?.name || "ADMIN",
      };
      if (batchScope === "FILTERED") payload.partnerIds = sortedPartners.map((p) => p.id);
      else payload.scope = batchScope;

      const res = await fetch("/api/erp/partners/check-biz-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "국세청 일괄조회 실패");
      setBatchResult({ summary: data.summary, results: data.results || [] });
      await fetchPartners();
      const s = data.summary || {};
      showToast(
        `조회 완료: ${s.checkedCount || 0}건 확인 (휴업 ${s.suspendedCount || 0} / 폐업 ${s.closedCount || 0} / 거래불가 전환 ${s.newlyBlockedCount || 0}건)`
      );
    } catch (err: any) {
      showToast(err.message || "일괄조회 처리 실패", "error");
    } finally {
      setBatchLoading(false);
    }
  };

  // Split Viewer File Replace (Browse & Drag-Drop)
  const handleViewerFileReplace = async (file: File) => {
    if (!file || !activeDocument) return;
    if (!isPdfOrImageFile(file)) {
      showToast("PDF 또는 이미지 파일을 선택해주세요.", "error");
      return;
    }

    setViewerOcrLoading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const docType = activeDocument.docType || "BIZ_CERT";
      const pid = activeDocument.partnerId;

      if (pid) {
        const target = partners.find((p) => p.id === pid) || selectedPartner;
        if (target) {
          const overrideFields =
            docType === "BIZ_CERT"
              ? { bizCertFileUrl: dataUrl, bizCertFileName: file.name }
              : docType === "BANK_COPY"
              ? { bankCopyFileUrl: dataUrl, bankCopyFileName: file.name }
              : { contractFileUrl: dataUrl, contractFileName: file.name };

          const res = await fetch("/api/erp/partners", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildPartnerPutPayload(target, overrideFields)),
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || "파일 교체 저장 실패");
          const prevCache = filesCacheRef.current[pid] || {};
          if (docType === "BIZ_CERT") prevCache.bizCertFileUrl = dataUrl;
          else if (docType === "BANK_COPY") prevCache.bankCopyFileUrl = dataUrl;
          else prevCache.contractFileUrl = dataUrl;
          filesCacheRef.current[pid] = prevCache;
          await fetchPartners();
        }
      }

      setActiveDocument((prev) => (prev ? { ...prev, url: dataUrl, fileName: file.name } : prev));
      showToast(`파일(${file.name})이 교체 저장되었습니다.`);
    } catch (err: any) {
      showToast(err.message || "파일 교체 실패", "error");
    } finally {
      setViewerOcrLoading(false);
    }
  };

  // Split Viewer Re-run OCR on Current Document
  const handleViewerReRunOcr = async () => {
    if (!activeDocument?.url || !viewerForm) return;
    setViewerOcrLoading(true);
    try {
      const parsed = await runBizCertOcrRequest(
        activeDocument.url,
        activeDocument.fileName || "biz-cert",
        "서류 판독 실패"
      );
      setViewerForm((prev: any) => mergeBizCertParsedIntoForm(prev, parsed));
      showToast("서류 판독 결과가 우측 양식에 반영되었습니다. 확인 후 저장하세요.");
    } catch (err: any) {
      showToast(err.message || "서류 재판독 실패", "error");
    } finally {
      setViewerOcrLoading(false);
    }
  };

  // Split Viewer Single NTS Lookup
  const handleViewerNtsCheck = async () => {
    if (!viewerForm) return;
    if (normalizeBizNoDigits(viewerForm.businessNo).length !== 10) {
      showToast("10자리 사업자등록번호를 입력해주세요.", "error");
      return;
    }
    setViewerNtsLoading(true);
    try {
      const ntsRes = await queryNtsByBizNoClient(viewerForm.businessNo);
      if (!ntsRes) throw new Error("국세청 휴·폐업 조회 실패");

      setViewerForm((prev: any) => mergeNtsStatusIntoForm(prev, ntsRes));
      if (ntsRes.shouldBlockTrade) {
        showToast(
          `국세청 확인: ${getNtsBizStateBadgeLabel(ntsRes.ntsBizState)} — [정보 저장] 시 거래불가로 반영됩니다.`,
          "error"
        );
      } else {
        showToast(`국세청 상태: ${getNtsBizStateBadgeLabel(ntsRes.ntsBizState)} (${ntsRes.ntsTaxType})`);
      }
    } catch (err: any) {
      showToast(err.message || "국세청 조회 실패", "error");
    } finally {
      setViewerNtsLoading(false);
    }
  };

  // Split Viewer Save Inline Partner Edits
  const handleViewerSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewerForm || !viewerForm.id) return;
    if (!viewerForm.name || !String(viewerForm.name).trim()) {
      showToast("상호명(법인명)을 입력해주세요.", "error");
      return;
    }
    setViewerSaving(true);
    try {
      const res = await fetch("/api/erp/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(viewerForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "거래처 정보 수정 실패");

      setActiveDocument((prev) =>
        prev ? { ...prev, partnerName: String(viewerForm.name).trim() } : prev
      );
      showToast("원본 대조 수정사항이 저장되었습니다.");
      await fetchPartners();
    } catch (err: any) {
      showToast(err.message || "수정사항 저장 실패", "error");
    } finally {
      setViewerSaving(false);
    }
  };

  // Business Registration Certificate Drag & Drop / File Processing (Simple OCR Modal)
  const handleBizCertFileUpload = async (file: File) => {
    if (!file) return;
    setOcrLoading(true);
    setOcrFileName(file.name);
    setOcrResult(null);
    setOcrNtsStatus(null);

    try {
      const { rawDataUrl, thumbUrl, parsed, errorMessage } = await extractBizCertOcrFromFile(file);
      setOcrPreviewFileUrl(rawDataUrl);
      setOcrPreviewThumbUrl(thumbUrl);

      if (parsed) {
        setOcrResult(parsed);
        if (parsed.businessNo && normalizeBizNoDigits(parsed.businessNo).length === 10) {
          const ntsRes = await queryNtsByBizNoClient(parsed.businessNo).catch(() => null);
          if (ntsRes) setOcrNtsStatus(ntsRes);
        }
        showToast("사업자등록증 정보가 자동 분석되었습니다.");
      } else {
        showToast(errorMessage || "자동 분석을 완료할 수 없습니다. 파일을 확인해주세요.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "파일 처리 실패", "error");
    } finally {
      setOcrLoading(false);
    }
  };

  const {
    onDragOver: handleCertDragOver,
    onDragLeave: handleCertDragLeave,
    onDrop: handleCertDrop,
  } = createDropzoneDragHandlers(isCertDragging, setIsCertDragging, handleBizCertFileUpload);

  // Apply OCR to Partner Form and open full create form
  const handleApplyOcrToForm = () => {
    if (!ocrResult) return;
    setPartnerModalMode("CREATE");
    setDirectBizCertSuggestion(null);
    setPartnerForm(
      createPartnerFormFromBizCertOcr({
        ocrResult,
        ocrNtsStatus,
        ocrFileName,
        ocrPreviewFileUrl,
        partnerTypeTab,
        currentUser,
      })
    );
    setShowBizCertOcrModal(false);
    setShowPartnerModal(true);
    showToast("사업자등록증 정보가 거래처 등록 양식에 자동 입력되었습니다.");
  };

  const resetBizCertOcrModalState = () => {
    setOcrResult(null);
    setOcrPreviewFileUrl("");
    setOcrPreviewThumbUrl("");
    setOcrNtsStatus(null);
    setOcrFileName("");
  };

  const resetBankOcrModalState = () => {
    setBankOcrResult(null);
    setBankOcrPreviewUrl("");
    setBankOcrFileName("");
  };

  return {
    docFetching, ensurePartnerFiles, handleOpenPartnerDoc,
    dossierBizCertSaving, dossierContractSaving,
    directBizCertOcrLoading, directBizCertSuggestion, setDirectBizCertSuggestion,
    singleNtsCheckingId, formNtsChecking,
    viewerZoom, setViewerZoom, viewerRotation, setViewerRotation,
    isViewerDragging, setIsViewerDragging, resolvedPdfBlobUrl,
    viewerForm, setViewerForm, viewerSaving, viewerOcrLoading, viewerNtsLoading,
    batchScope, setBatchScope, batchAutoBlock, setBatchAutoBlock,
    batchLoading, batchResult, setBatchResult,
    isCertDragging, ocrLoading, ocrResult, setOcrResult,
    ocrPreviewThumbUrl, ocrNtsStatus, ocrFileName, resetBizCertOcrModalState,
    bankOcrLoading, bankOcrResult, setBankOcrResult,
    bankOcrPreviewUrl, bankOcrFileName, isBankOcrModalDragging, resetBankOcrModalState,
    handleReRunBankOcr, handleBankCopyFileUpload, handleBankModalFileUpload,
    handleBankOcrDragOver, handleBankOcrDragLeave, handleBankOcrDrop, handleApplyBankOcrToForm,
    handleDirectBizCertUpload, handlePartnerFormReRunOcr, handleApplyDirectBizCertSuggestion,
    handleFormCheckNtsStatus, handleDirectContractUpload,
    handleDossierBizCertUpload, handleDossierBizCertDelete,
    handleDossierContractUpload, handleDossierContractDelete,
    handleRunSingleNtsCheck, handleRunBatchBizStatusCheck,
    handleViewerFileReplace, handleViewerReRunOcr, handleViewerNtsCheck, handleViewerSavePartner,
    handleBizCertFileUpload, handleCertDragOver, handleCertDragLeave, handleCertDrop,
    handleApplyOcrToForm,
  };
}
