"use client";

import React from "react";
import { isPdfDocument } from "./partnerPdfUtils";
import { Download, ExternalLink, FileText, Image as ImageIcon, Printer, RotateCw, Save, ShieldAlert, Sparkles, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { getNtsBizStateBadgeLabel } from "@/lib/partnerStatusClient";
import { type ActiveDocumentViewer, type Partner } from "./partnerTypes";

export interface PartnerDocViewerModalProps {
  activeDocument: ActiveDocumentViewer | null;
  handleViewerFileReplace: (file: File) => Promise<void>;
  handleViewerNtsCheck: () => Promise<void>;
  handleViewerReRunOcr: () => Promise<void>;
  handleViewerSavePartner: (e: React.FormEvent) => Promise<void>;
  isViewerDragging: boolean;
  resolvedPdfBlobUrl: string | null;
  selectedPartner: Partner | null;
  setActiveDocument: React.Dispatch<React.SetStateAction<ActiveDocumentViewer | null>>;
  setIsViewerDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setViewerForm: React.Dispatch<any>;
  setViewerRotation: React.Dispatch<React.SetStateAction<number>>;
  setViewerZoom: React.Dispatch<React.SetStateAction<number>>;
  setZoomImageUrl: React.Dispatch<React.SetStateAction<string | null>>;
  viewerForm: any;
  viewerNtsLoading: boolean;
  viewerOcrLoading: boolean;
  viewerReplaceFileInputRef: React.RefObject<HTMLInputElement | null>;
  viewerRotation: number;
  viewerSaving: boolean;
  viewerZoom: number;
  zoomImageUrl: string | null;
}

export const PartnerDocViewerModal: React.FC<PartnerDocViewerModalProps> = ({
  activeDocument,
  handleViewerFileReplace,
  handleViewerNtsCheck,
  handleViewerReRunOcr,
  handleViewerSavePartner,
  isViewerDragging,
  resolvedPdfBlobUrl,
  selectedPartner,
  setActiveDocument,
  setIsViewerDragging,
  setViewerForm,
  setViewerRotation,
  setViewerZoom,
  setZoomImageUrl,
  viewerForm,
  viewerNtsLoading,
  viewerOcrLoading,
  viewerReplaceFileInputRef,
  viewerRotation,
  viewerSaving,
  viewerZoom,
  zoomImageUrl,
}) => {
  return (
    <>
      {(activeDocument || zoomImageUrl) && (() => {
        const doc = activeDocument || {
          title: "서류 원본 보기",
          partnerName: selectedPartner?.name || "등록 서류",
          url: zoomImageUrl!,
          fileName: undefined,
        };
        const isPdf = isPdfDocument(doc.url, doc.fileName);
        const effectiveUrl = isPdf && resolvedPdfBlobUrl ? resolvedPdfBlobUrl : doc.url;
        const hasSplitEditor = Boolean(doc.partnerId && viewerForm);

        const handleClose = () => {
          setActiveDocument(null);
          setZoomImageUrl(null);
        };

        const handleOpenNewTab = () => {
          if (isPdf) {
            window.open(effectiveUrl, "_blank", "noopener,noreferrer");
            return;
          }
          const win = window.open();
          if (win) {
            win.document.write(
              `<body style="margin:0;background:#1e293b;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${effectiveUrl}" style="max-width:100vw;max-height:100vh;object-fit:contain;" /></body>`
            );
          }
        };

        const handlePrint = () => {
          const printWin = window.open("", "_blank");
          if (printWin) {
            printWin.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>${doc.title} - ${doc.partnerName}</title>
                  <style>
                    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                    img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                    iframe { width: 100vw; height: 100vh; border: none; }
                  </style>
                </head>
                <body>
                  ${
                    isPdf
                      ? `<iframe src="${effectiveUrl}"></iframe>`
                      : `<img src="${effectiveUrl}" onload="window.print();" />`
                  }
                </body>
              </html>
            `);
            if (isPdf) {
              setTimeout(() => printWin.print(), 800);
            }
          }
        };

        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 md:p-4"
            onClick={handleClose}
          >
            <div
              className={`relative w-full ${
                hasSplitEditor ? "max-w-7xl h-[92vh]" : "max-w-5xl max-h-[92vh]"
              } bg-[#ebe5d8] rounded-lg border-2 border-[#b5a894] shadow-2xl flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 py-2.5 bg-[#e2dbcd] border-b border-[#b5a894] flex flex-wrap items-center justify-between gap-2 shrink-0 dark:bg-slate-800 dark:border-slate-700">
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="p-1.5 bg-[#dcd4c4] rounded border border-[#b5a894] dark:bg-slate-700 dark:border-slate-600 shrink-0">
                    {isPdf ? (
                      <FileText className="w-4 h-4 text-[#b91c1c] dark:text-rose-400" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#0f172a] dark:text-slate-100 truncate">
                        {doc.title}
                      </h3>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] font-semibold whitespace-nowrap shrink-0 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                        {doc.partnerName}
                      </span>
                    </div>
                    {doc.fileName && (
                      <span className="text-[11px] text-[#475569] dark:text-slate-400 font-mono block truncate">
                        {doc.fileName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {!isPdf && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setViewerZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))
                        }
                        className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition shrink-0 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        title="축소"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewerZoom(1)}
                        className="px-2 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] font-bold whitespace-nowrap shrink-0 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        title="배율 초기화"
                      >
                        {Math.round(viewerZoom * 100)}%
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setViewerZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))
                        }
                        className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition shrink-0 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        title="확대"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewerRotation((r) => (r + 90) % 360)}
                        className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition shrink-0 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        title="90도 회전"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {doc.partnerId && (
                    <>
                      <input
                        ref={viewerReplaceFileInputRef}
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleViewerFileReplace(f);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        disabled={viewerOcrLoading}
                        onClick={() => viewerReplaceFileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50 whitespace-nowrap shrink-0 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>파일 변경</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenNewTab}
                    className="px-2.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-semibold flex items-center gap-1 transition whitespace-nowrap shrink-0 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    title="새 탭 열기"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">새 탭 열기</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-2.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-semibold flex items-center gap-1 transition whitespace-nowrap shrink-0 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    title="인쇄"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">인쇄</span>
                  </button>

                  <a
                    href={effectiveUrl}
                    download={doc.fileName || `${doc.title}.${isPdf ? "pdf" : "png"}`}
                    className="px-2.5 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-semibold flex items-center gap-1 transition whitespace-nowrap shrink-0 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">다운로드</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition shrink-0 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    title="닫기"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body: Split Studio when doc.partnerId & viewerForm exist */}
              <div
                className={
                  hasSplitEditor
                    ? "flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden"
                    : "flex-1 min-h-0 flex overflow-hidden"
                }
              >
                {/* Left Document Preview Pane */}
                <div
                  onDragOver={(e) => {
                    if (!doc.partnerId) return;
                    e.preventDefault();
                    setIsViewerDragging(true);
                  }}
                  onDragLeave={(e) => {
                    if (!doc.partnerId) return;
                    e.preventDefault();
                    setIsViewerDragging(false);
                  }}
                  onDrop={(e) => {
                    if (!doc.partnerId) return;
                    e.preventDefault();
                    setIsViewerDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleViewerFileReplace(f);
                  }}
                  className={`${
                    hasSplitEditor ? "lg:col-span-7 border-b lg:border-b-0 lg:border-r border-[#b5a894] dark:border-slate-800" : "flex-1"
                  } relative overflow-auto p-3 flex items-center justify-center transition ${
                    isViewerDragging
                      ? "bg-[#dbeafe]/60 ring-2 ring-inset ring-[#1d4ed8] dark:bg-blue-950/30"
                      : "bg-[#f4efe4] dark:bg-slate-950"
                  }`}
                >
                  {isPdf ? (
                    <iframe
                      src={effectiveUrl}
                      className={`w-full ${
                        hasSplitEditor ? "h-full min-h-[60vh]" : "h-[76vh]"
                      } rounded border border-[#b5a894] bg-[#fdfbf7] dark:bg-slate-900 dark:border-slate-800 shadow-sm`}
                      title={doc.title}
                    />
                  ) : (
                    <div
                      className={`w-full h-full ${
                        hasSplitEditor ? "min-h-[60vh]" : "max-h-[76vh]"
                      } flex items-center justify-center overflow-auto p-2`}
                    >
                      <img
                        src={effectiveUrl}
                        alt={doc.title}
                        style={{
                          transform: `scale(${viewerZoom}) rotate(${viewerRotation}deg)`,
                          transformOrigin: "center center",
                        }}
                        className="max-h-[72vh] max-w-full object-contain rounded border border-[#b5a894] shadow-md transition-transform duration-150 dark:border-slate-800"
                      />
                    </div>
                  )}
                </div>

                {/* Right Inline Partner Edit Studio */}
                {hasSplitEditor && viewerForm && (
                  <form
                    onSubmit={handleViewerSavePartner}
                    className="lg:col-span-5 min-h-0 flex flex-col bg-[#ebe5d8] dark:bg-slate-900 overflow-hidden"
                  >
                    {/* Right Sub-Header */}
                    <div className="px-4 py-2.5 bg-[#e2dbcd] border-b border-[#b5a894] flex flex-wrap items-center justify-between gap-2 shrink-0 dark:bg-slate-800 dark:border-slate-700">
                      <span className="text-xs font-bold text-[#0f172a] dark:text-slate-100 whitespace-nowrap">
                        원본 대조 거래처 정보 수정
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={viewerOcrLoading}
                          onClick={handleViewerReRunOcr}
                          className="px-2.5 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-[#fdfbf7] rounded border border-[#1e40af] text-[11px] font-bold flex items-center gap-1 disabled:opacity-50 whitespace-nowrap shrink-0"
                        >
                          <Sparkles
                            className={`w-3 h-3 ${viewerOcrLoading ? "animate-spin" : ""}`}
                          />
                          <span>{viewerOcrLoading ? "판독중" : "OCR 재판독"}</span>
                        </button>
                        <button
                          type="button"
                          disabled={viewerNtsLoading}
                          onClick={handleViewerNtsCheck}
                          className="px-2.5 py-1 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-[11px] font-bold flex items-center gap-1 disabled:opacity-50 whitespace-nowrap shrink-0 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                        >
                          <ShieldAlert
                            className={`w-3 h-3 text-[#b91c1c] ${
                              viewerNtsLoading ? "animate-spin" : ""
                            }`}
                          />
                          <span>{viewerNtsLoading ? "조회중" : "휴폐업 조회"}</span>
                        </button>
                      </div>
                    </div>

                    {/* NTS Status Banner */}
                    {(viewerForm.ntsBizState || viewerForm.ntsStatusMsg) && (
                      <div
                        className={`mx-3 mt-3 px-3 py-2 rounded border text-[11px] flex flex-wrap items-center justify-between gap-2 shrink-0 ${
                          viewerForm.ntsBizState === "CLOSED" ||
                          viewerForm.ntsBizState === "SUSPENDED"
                            ? "bg-[#fee2e2] text-[#991b1b] border-[#fca5a5] dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800"
                            : "bg-[#dcfce7] text-[#166534] border-[#86efac] dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold whitespace-nowrap">
                          <span>국세청 상태:</span>
                          <span>{getNtsBizStateBadgeLabel(viewerForm.ntsBizState)}</span>
                          {viewerForm.ntsTaxType && <span>· {viewerForm.ntsTaxType}</span>}
                          {viewerForm.ntsClosedDate && <span>({viewerForm.ntsClosedDate})</span>}
                        </div>
                        {viewerForm.ntsStatusMsg && (
                          <span className="text-[11px] font-medium">
                            {viewerForm.ntsStatusMsg}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Scrollable Vertical-Stack Fields */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          상호명 <span className="text-[#b91c1c]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={viewerForm.name || ""}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, name: e.target.value })
                          }
                          className="h-8 px-2.5 bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          거래처 구분
                        </label>
                        <select
                          value={viewerForm.partnerType || "CUSTOMER"}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, partnerType: e.target.value })
                          }
                          className="h-8 px-2 bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        >
                          <option value="CUSTOMER">매출처</option>
                          <option value="VENDOR">매입처</option>
                          <option value="BOTH">매출/매입 겸용</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          거래 상태
                        </label>
                        <select
                          value={viewerForm.status || "ACTIVE"}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, status: e.target.value })
                          }
                          className="h-8 px-2 bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        >
                          <option value="ACTIVE">정상거래</option>
                          <option value="BLOCKED">거래불가</option>
                          <option value="INACTIVE">거래중지</option>
                          <option value="DORMANT">휴면</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          사업자등록번호
                        </label>
                        <input
                          type="text"
                          value={viewerForm.businessNo || ""}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, businessNo: e.target.value })
                          }
                          className="h-8 px-2.5 font-mono bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          법인등록번호
                        </label>
                        <input
                          type="text"
                          value={viewerForm.corporateNo || ""}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, corporateNo: e.target.value })
                          }
                          className="h-8 px-2.5 font-mono bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          대표자 성명
                        </label>
                        <input
                          type="text"
                          value={viewerForm.ceoName || ""}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, ceoName: e.target.value })
                          }
                          className="h-8 px-2.5 bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          대표 전화번호
                        </label>
                        <input
                          type="text"
                          value={viewerForm.mainPhone || ""}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, mainPhone: e.target.value })
                          }
                          className="h-8 px-2.5 bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          업태
                        </label>
                        <input
                          type="text"
                          value={viewerForm.bizType || ""}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, bizType: e.target.value })
                          }
                          className="h-8 px-2.5 bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          종목
                        </label>
                        <input
                          type="text"
                          value={viewerForm.bizItem || ""}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, bizItem: e.target.value })
                          }
                          className="h-8 px-2.5 bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        />
                      </div>

                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          기본주소
                        </label>
                        <input
                          type="text"
                          value={viewerForm.address || ""}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, address: e.target.value })
                          }
                          className="h-8 px-2.5 bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        />
                      </div>

                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          상세주소
                        </label>
                        <input
                          type="text"
                          value={viewerForm.addressDetail || ""}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, addressDetail: e.target.value })
                          }
                          className="h-8 px-2.5 bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          세금계산서 이메일 1
                        </label>
                        <input
                          type="email"
                          value={viewerForm.mainEmail || ""}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, mainEmail: e.target.value })
                          }
                          className="h-8 px-2.5 bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          세금계산서 이메일 2
                        </label>
                        <input
                          type="email"
                          value={viewerForm.subEmail || ""}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, subEmail: e.target.value })
                          }
                          className="h-8 px-2.5 bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        />
                      </div>

                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-slate-300 whitespace-nowrap">
                          비고
                        </label>
                        <textarea
                          rows={2}
                          value={viewerForm.memo || ""}
                          onChange={(e) =>
                            setViewerForm({ ...viewerForm, memo: e.target.value })
                          }
                          className="p-2 bg-[#fdfbf7] text-[#0f172a] border border-[#b5a894] rounded focus:outline-none focus:border-[#1d4ed8] resize-none dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                        />
                      </div>
                    </div>

                    {/* Sticky Footer */}
                    <div className="px-4 py-2.5 bg-[#e2dbcd] border-t border-[#b5a894] flex items-center justify-end gap-2 shrink-0 dark:bg-slate-800 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-3 py-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] text-xs font-bold whitespace-nowrap shrink-0 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                      >
                        닫기
                      </button>
                      <button
                        type="submit"
                        disabled={viewerSaving}
                        className="px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-[#fdfbf7] rounded border border-[#1e40af] text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{viewerSaving ? "저장중" : "정보 저장"}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};
