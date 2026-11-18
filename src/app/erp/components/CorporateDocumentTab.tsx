"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Upload,
  Download,
  Eye,
  History,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  FolderArchive,
  X,
  BookOpen,
  FileSignature,
  CheckCircle2,
  Printer,
  Copy,
  ArrowRight,
  ExternalLink,
  Pencil,
  Check,
} from "lucide-react";
import { BUSINESS_ENTITIES } from "@/lib/businessEntities";
import { formatErpInputNumber, matchHangulAny, sortErpItems } from "@/lib/erpFormat";
import { SortableTh, useErpTableSort } from "./SortableTh";
import {
  DOC_CATEGORIES,
  formatBytes,
  type CorporateDocItem,
  type CorporateDocumentTabProps,
  type CorporateTemplateType,
  type DocVersionItem,
  type MainSubTab,
  type TemplateStudioState,
} from "./corporate-docs/corporateDocTypes";
import {
  buildGeneratedTemplateText,
  printCorporateTemplate,
} from "./corporate-docs/corporateDocTemplates";
import {
  CorpManualSubTab,
  IndivManualSubTab,
} from "./corporate-docs/EntityManualSubTabs";
import { TemplateStudioSubTab } from "./corporate-docs/TemplateStudioSubTab";
import { UploadDocModal } from "./corporate-docs/UploadDocModal";

export const CorporateDocumentTab: React.FC<CorporateDocumentTabProps> = ({
  currentUser,
  selectedEntity = "ALL",
}) => {
  const [subTab, setSubTab] = useState<MainSubTab>("VAULT");
  const [documents, setDocuments] = useState<CorporateDocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [entityFilter, setEntityFilter] = useState<"ALL" | "CORP" | "INDIVIDUAL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("전체");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [previewVer, setPreviewVer] = useState<DocVersionItem | null>(null);

  // 신규 문서 등록 / 개정 버전 추가 모달 상태
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTargetDoc, setUploadTargetDoc] = useState<CorporateDocItem | null>(null);
  const [formEntityType, setFormEntityType] = useState<"CORP" | "INDIVIDUAL">("CORP");
  const [formCategory, setFormCategory] = useState<string>("정관·등기·의사록");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formEffectiveDate, setFormEffectiveDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [formChangeNote, setFormChangeNote] = useState<string>("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 버전 수정(버전번호·라벨·시행일·메모) 인라인 상태
  const [editingVerId, setEditingVerId] = useState<number | null>(null);
  const [editVerNo, setEditVerNo] = useState<number>(1);
  const [editVerLabel, setEditVerLabel] = useState<string>("v1.0");
  const [editVerDate, setEditVerDate] = useState<string>("");
  const [editVerNote, setEditVerNote] = useState<string>("");
  const [savingVer, setSavingVer] = useState<boolean>(false);

  // [서식 작성·출력 스튜디오] 상태 (개인정보/주민번호/연락처/자택주소는 서버 주주명부 API에서 안전 로드)
  const [tplType, setTplType] = useState<CorporateTemplateType>("SHAREHOLDER_STATEMENT");
  const [tplBaseDateText, setTplBaseDateText] = useState<string>("2026년 09월 13일 현재");
  const [tplShareholderName, setTplShareholderName] = useState<string>("");
  const [tplShareholderRegNo, setTplShareholderRegNo] = useState<string>("");
  const [tplShareholderZip, setTplShareholderZip] = useState<string>("");
  const [tplShareholderPhone, setTplShareholderPhone] = useState<string>("");
  const [tplShareholderShares, setTplShareholderShares] = useState<string>("10,000");
  const [tplShareholderParValue, setTplShareholderParValue] = useState<string>("500원");
  const [tplShareholderAmount, setTplShareholderAmount] = useState<string>("5,000,000원");
  const [tplShareholderRatio, setTplShareholderRatio] = useState<string>("100");
  const [tplShareholderRel, setTplShareholderRel] = useState<string>("본인");
  const [tplShareholderNote, setTplShareholderNote] = useState<string>("");
  const [tplBlankRowsCount, setTplBlankRowsCount] = useState<number>(7);
  const [tplResolutionDate, setTplResolutionDate] = useState<string>("2026-09-14");
  const [tplResolutionDateKor, setTplResolutionDateKor] = useState<string>("2026년 09월 14일");
  const [tplEffectiveDate, setTplEffectiveDate] = useState<string>("2026-09-14");
  const [tplAgendaTitle, setTplAgendaTitle] = useState<string>(
    "제1호 의안: 정관 일부 변경(목적 추가)의 건"
  );
  const [tplAgendaBody, setTplAgendaBody] = useState<string>(
    "회사의 사업 영역 확장 및 신규 사업(통신판매 및 전자상거래 등) 추진을 위하여 당 회사 정관 제2조(목적)를 다음과 같이 변경하기로 전원 일치로 결의하다."
  );
  const [tplCompareTableTitle, setTplCompareTableTitle] = useState<string>(
    "[정관 제2조(목적) 변경 대비표]"
  );
  const [tplArticleNo, setTplArticleNo] = useState<string>("제2조 (목적)");
  const [tplBeforeText, setTplBeforeText] = useState<string>(
    `1. 소프트웨어 개발 및 공급업\n2. 컴퓨터 프로그래밍 서비스업\n3. 컴퓨터 시스템 통합 자문 및 구축 서비스업\n4. 데이터베이스 구축업\n5. 기타 사무 지원 서비스업\n6. 문서 작성업\n7. 컴퓨터 및 사무용 기계. 장비 임대업\n8. 기타 산업용 기계 및 장비 임대업\n9. 컴퓨터 및 주변장치, 소프트웨어 도매업\n10. 컴퓨터 및 주변장치, 소프트웨어 소매업\n11. 기계 및 장비 중개업\n12. 부동산 임대업\n13. 위 각호에 관련된 부대사업 일체`
  );
  const [tplAfterText, setTplAfterText] = useState<string>(
    `1. 소프트웨어 개발 및 공급업\n2. 컴퓨터 프로그래밍 서비스업\n3. 컴퓨터 시스템 통합 자문 및 구축 서비스업\n4. 데이터베이스 구축업\n5. 기타 사무 지원 서비스업\n6. 문서 작성업\n7. 컴퓨터 및 사무용 기계. 장비 임대업\n8. 기타 산업용 기계 및 장비 임대업\n9. 컴퓨터 및 주변장치, 소프트웨어 도매업\n10. 컴퓨터 및 주변장치, 소프트웨어 소매업\n11. 기계 및 장비 중개업\n12. 부동산 임대업\n13. 전자상거래 소매업 (신설)\n14. 통신판매업 (신설)\n15. 인터넷 쇼핑몰 운영업 (신설)\n16. 해외 구매대행업 (신설)\n17. 위 각호에 관련된 부대사업 일체 (조항 번호 변경)`
  );
  const [tplReasonText, setTplReasonText] = useState<string>("사업 다각화 및 신규 사업 목적 추가");
  const [tplShareholderAddr, setTplShareholderAddr] = useState<string>("");

  // 상단 헤더의 selectedEntity 변경 시 연동
  useEffect(() => {
    if (selectedEntity === "CORP" || selectedEntity === "INDIVIDUAL") {
      setEntityFilter(selectedEntity);
    } else {
      setEntityFilter("ALL");
    }
  }, [selectedEntity]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/corporate-docs", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
        if (data.documents.length > 0 && !selectedDocId) {
          const first = data.documents[0];
          setSelectedDocId(first.id);
          if (first.latestVersion && first.latestVersion.fileExt === "pdf") {
            setPreviewVer(first.latestVersion);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load corporate documents:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/erp/shareholder-registry?entityCode=CORP_MAIN", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.success) return;
        if (data.baseDate) setTplBaseDateText(String(data.baseDate));
        const primary = Array.isArray(data.shareholders) ? data.shareholders[0] : null;
        if (primary) {
          if (primary.name) setTplShareholderName(String(primary.name));
          if (primary.residentNo) setTplShareholderRegNo(String(primary.residentNo));
          if (primary.zipCode) setTplShareholderZip(String(primary.zipCode));
          if (primary.phone) setTplShareholderPhone(String(primary.phone));
          if (primary.address) setTplShareholderAddr(String(primary.address));
          if (primary.shares) setTplShareholderShares(String(primary.shares));
          if (primary.parValue) setTplShareholderParValue(String(primary.parValue));
          if (primary.totalAmount) setTplShareholderAmount(String(primary.totalAmount));
          if (primary.shareRatio) setTplShareholderRatio(String(primary.shareRatio).replace(/%$/, ""));
          if (primary.relationship) setTplShareholderRel(String(primary.relationship));
          if (primary.note) setTplShareholderNote(String(primary.note));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const docSort = useErpTableSort("", null);

  const filteredDocs = useMemo(() => {
    const getCatOrder = (cat: string) => {
      if (cat === "정관·등기·의사록") return 1;
      if (cat === "주주·주식·자본") return 2;
      if (cat === "세무·공과·인증") return 3;
      if (cat === "부동산·임대차") return 4;
      if (cat === "기타 중요문서") return 5;
      if (cat === "법인설립 원시서류 (보존용)") return 99;
      return 50;
    };

    const baseSorted = documents
      .filter((d) => {
        if (entityFilter !== "ALL" && d.entityType !== entityFilter) return false;
        if (categoryFilter !== "전체" && d.category !== categoryFilter) return false;
        if (searchQuery.trim()) {
          return matchHangulAny(
            [
              d.title,
              d.description,
              d.docCode,
              ...d.versions.flatMap((v) => [v.fileName, v.changeNote]),
            ],
            searchQuery
          );
        }
        return true;
      })
      .sort((a, b) => {
        const orderDiff = getCatOrder(a.category) - getCatOrder(b.category);
        if (orderDiff !== 0) return orderDiff;
        if (a.entityType !== b.entityType) return a.entityType === "CORP" ? -1 : 1;
        return a.id - b.id;
      });
    return sortErpItems(baseSorted, docSort.sortKey, docSort.sortDir);
  }, [documents, entityFilter, categoryFilter, searchQuery, docSort.sortKey, docSort.sortDir]);

  const selectedDoc = useMemo(
    () => documents.find((d) => d.id === selectedDocId) || filteredDocs[0] || null,
    [documents, selectedDocId, filteredDocs]
  );

  // 특정 docCode로 바로 이동하여 열람하는 헬퍼 (운영 매뉴얼 -> 문서 보관함 직결)
  const jumpToDocumentByCode = (docCode: string, openUpload = false) => {
    const target = documents.find((d) => d.docCode === docCode);
    setSubTab("VAULT");
    setEntityFilter("ALL");
    setCategoryFilter("전체");
    if (target) {
      setSelectedDocId(target.id);
      if (target.latestVersion && target.latestVersion.fileExt === "pdf") {
        setPreviewVer(target.latestVersion);
      } else {
        setPreviewVer(null);
      }
      if (openUpload) {
        openNewVersionModal(target);
      }
    }
  };

  const openNewDocModal = (defaultEntity: "CORP" | "INDIVIDUAL" = "CORP") => {
    setUploadTargetDoc(null);
    setFormEntityType(defaultEntity);
    setFormCategory(defaultEntity === "CORP" ? "정관·등기·의사록" : "세무·공과·인증");
    setFormTitle("");
    setFormDesc("");
    setFormEffectiveDate(new Date().toISOString().slice(0, 10));
    setFormChangeNote("초판 제정·등록");
    setFormFile(null);
    setShowUploadModal(true);
  };

  const openNewVersionModal = (doc: CorporateDocItem) => {
    setUploadTargetDoc(doc);
    setFormEntityType(doc.entityType);
    setFormCategory(doc.category);
    setFormTitle(doc.title);
    setFormDesc(doc.description || "");
    setFormEffectiveDate(new Date().toISOString().slice(0, 10));
    setFormChangeNote(`v${doc.currentVersion + 1}.0 개정본 등록`);
    setFormFile(null);
    setShowUploadModal(true);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFile) {
      alert("업로드할 문서 파일을 선택해 주십시오.");
      return;
    }
    if (!uploadTargetDoc && !formTitle.trim()) {
      alert("문서명을 입력해 주십시오.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", formFile);
      if (uploadTargetDoc) {
        fd.append("documentId", String(uploadTargetDoc.id));
      }
      fd.append("entityType", formEntityType);
      fd.append("category", formCategory);
      fd.append("title", formTitle.trim());
      fd.append("description", formDesc.trim());
      fd.append("effectiveDate", formEffectiveDate);
      fd.append("changeNote", formChangeNote.trim());
      fd.append("uploadedBy", currentUser?.name || "이정용");

      const res = await fetch("/api/erp/corporate-docs", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "업로드 실패");
      }
      setShowUploadModal(false);
      await fetchDocuments();
      if (data.documentId) {
        setSelectedDocId(Number(data.documentId));
      }
    } catch (err: any) {
      alert("문서 업로드 오류: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVersion = async (ver: DocVersionItem) => {
    if (!window.confirm(`[${ver.versionLabel}] ${ver.fileName} 버전을 삭제하시겠습니까?\n(삭제 후 남은 버전들의 번호는 v1.0부터 순서대로 자동 정렬됩니다.)`)) {
      return;
    }
    try {
      const res = await fetch(`/api/erp/corporate-docs?versionId=${ver.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (previewVer?.id === ver.id) setPreviewVer(null);
        await fetchDocuments();
      } else {
        alert(data.error || "삭제 실패");
      }
    } catch (err: any) {
      alert("삭제 오류: " + err.message);
    }
  };

  const startEditingVersion = (ver: DocVersionItem) => {
    setEditingVerId(ver.id);
    setEditVerNo(ver.versionNo);
    setEditVerLabel(ver.versionLabel || `v${ver.versionNo}.0`);
    setEditVerDate(ver.effectiveDate || "");
    setEditVerNote(ver.changeNote || "");
  };

  const handleSaveVersionEdit = async (verId: number) => {
    setSavingVer(true);
    try {
      const res = await fetch("/api/erp/corporate-docs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_VERSION",
          versionId: verId,
          versionNo: Number(editVerNo),
          versionLabel: editVerLabel.trim() || `v${editVerNo}.0`,
          effectiveDate: editVerDate.trim(),
          changeNote: editVerNote.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "버전 수정 실패");
      }
      setEditingVerId(null);
      await fetchDocuments();
    } catch (err: any) {
      alert("버전 수정 오류: " + err.message);
    } finally {
      setSavingVer(false);
    }
  };

  const handleResequenceVersions = async (docId: number) => {
    try {
      const res = await fetch("/api/erp/corporate-docs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESEQUENCE_DOCUMENT",
          documentId: docId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "버전 번호 재정렬 실패");
      }
      setEditingVerId(null);
      await fetchDocuments();
    } catch (err: any) {
      alert("버전 번호 재정렬 오류: " + err.message);
    }
  };

  const corp = BUSINESS_ENTITIES.CORP;
  const indiv = BUSINESS_ENTITIES.INDIVIDUAL;

  const templateStudioState: TemplateStudioState = {
    tplType,
    tplBaseDateText,
    tplShareholderName,
    tplShareholderRegNo,
    tplShareholderZip,
    tplShareholderPhone,
    tplShareholderShares,
    tplShareholderParValue,
    tplShareholderAmount,
    tplShareholderRatio,
    tplShareholderRel,
    tplShareholderNote,
    tplBlankRowsCount,
    tplResolutionDate,
    tplResolutionDateKor,
    tplEffectiveDate,
    tplAgendaTitle,
    tplAgendaBody,
    tplCompareTableTitle,
    tplArticleNo,
    tplBeforeText,
    tplAfterText,
    tplReasonText,
    tplShareholderAddr,
  };

  const generatedTemplateText = useMemo(
    () => buildGeneratedTemplateText(corp, templateStudioState),
    [
      corp,
      tplType,
      tplResolutionDate,
      tplEffectiveDate,
      tplAgendaTitle,
      tplArticleNo,
      tplBeforeText,
      tplAfterText,
      tplReasonText,
      tplShareholderAddr,
      tplShareholderRegNo,
      tplShareholderName,
      tplShareholderShares,
      tplShareholderAmount,
      tplShareholderRatio,
    ]
  );

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(generatedTemplateText);
    alert("서식 원문이 클립보드에 복사되었습니다.");
  };

  const handlePrintTemplate = () => {
    printCorporateTemplate(corp, templateStudioState, generatedTemplateText);
  };

  const corpDocCount = documents.filter((d) => d.entityType === "CORP").length;
  const indivDocCount = documents.filter((d) => d.entityType === "INDIVIDUAL").length;

  return (
    <div className="flex flex-col min-h-full md:h-full bg-[#ebe5d8] text-[#0f172a] dark:bg-slate-950 dark:text-slate-100 font-sans">
      {/* 1. 상단 법인·개인 사업자 기본 등기/등록 제원 요약 및 4대 기능 탭 바 */}
      <div className="p-2.5 md:p-3 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400" />
            <h2 className="text-sm font-extrabold whitespace-nowrap">
              중요문서 버전 히스토리 & 법인·개인사업장 행정 운영 매뉴얼
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd] whitespace-nowrap">
              법인 {corpDocCount}종 · 개인 {indivDocCount}종 / 총{" "}
              {documents.reduce((acc, d) => acc + d.versions.length, 0)}개 버전 보관
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDocuments}
              disabled={loading}
              className="p-1.5 bg-[#dcd4c4] hover:bg-[#d0c6b4] text-[#0f172a] rounded border border-[#b5a894] transition dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => openNewDocModal("CORP")}
              className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>법인 문서 등록</span>
            </button>
            <button
              type="button"
              onClick={() => openNewDocModal("INDIVIDUAL")}
              className="px-3 py-1.5 bg-[#b45309] hover:bg-[#92400e] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs whitespace-nowrap transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>개인 문서 등록</span>
            </button>
          </div>
        </div>

        {/* 법인 / 개인 기본 설립 제원 카드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd] shrink-0">
                법인사업장
              </span>
              <span className="font-bold whitespace-nowrap">{corp.corpName}</span>
              <span className="font-mono text-[11px] text-[#475569] dark:text-slate-400 whitespace-nowrap">
                사업자 {corp.bizNum} | 법인등록 {corp.corpRegNum} (등기 898726)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] font-bold whitespace-nowrap">
                자본금 ₩{corp.capitalStock.toLocaleString()} (1주 ₩{corp.parValue} × {corp.totalShares?.toLocaleString()}주 / 1인주주 100%)
              </span>
              <span className="text-[#334155] dark:text-slate-400 truncate max-w-[340px]">
                {corp.address}
              </span>
            </div>
          </div>

          <div className="p-2 rounded bg-[#f4efe4] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a] shrink-0">
                개인사업장
              </span>
              <span className="font-bold whitespace-nowrap">{indiv.corpName}</span>
              <span className="font-mono text-[11px] text-[#475569] dark:text-slate-400 whitespace-nowrap">
                사업자 {indiv.bizNum} | 개업일 {indiv.openDate}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="text-[#334155] dark:text-slate-300 font-semibold whitespace-nowrap">
                사업장 주소: {indiv.address}
              </span>
            </div>
          </div>
        </div>

        {/* 상단 4대 업무 모드 탭 전환 */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#c4b6a0] dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSubTab("VAULT")}
              className={`px-3 py-1.5 rounded text-xs font-extrabold border flex items-center gap-1.5 whitespace-nowrap transition ${
                subTab === "VAULT"
                  ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                  : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>1. 중요문서 버전 보관함 ({documents.length}종)</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab("CORP_MANUAL")}
              className={`px-3 py-1.5 rounded text-xs font-extrabold border flex items-center gap-1.5 whitespace-nowrap transition ${
                subTab === "CORP_MANUAL"
                  ? "bg-[#047857] text-white border-[#065f46]"
                  : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>2. [법인사업장] 정관변경·전자등기·정정 운영 매뉴얼</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab("INDIV_MANUAL")}
              className={`px-3 py-1.5 rounded text-xs font-extrabold border flex items-center gap-1.5 whitespace-nowrap transition ${
                subTab === "INDIV_MANUAL"
                  ? "bg-[#b45309] text-white border-[#92400e]"
                  : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>3. [개인사업장] 사업자등록 정정·주소이전 운영 매뉴얼</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab("TEMPLATE_STUDIO")}
              className={`px-3 py-1.5 rounded text-xs font-extrabold border flex items-center gap-1.5 whitespace-nowrap transition ${
                subTab === "TEMPLATE_STUDIO"
                  ? "bg-[#6d28d9] text-white border-[#5b21b6]"
                  : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              }`}
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>4. 정관변경 서식 작성·인쇄 스튜디오 (서면결의서·대비표·주주명부)</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: 중요문서 버전 보관함 (VAULT)
         ===================================================================== */}
      {subTab === "VAULT" && (
        <>
          {/* 사업자 구분 + 문서 분류 필터 및 검색 바 */}
          <div className="px-3 py-2 bg-[#e8e1d3] border-b border-[#b5a894] dark:bg-slate-900 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* 사업자 필터 */}
              <div className="flex items-center rounded border border-[#b5a894] overflow-hidden text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEntityFilter("ALL")}
                  className={`px-2.5 py-1 whitespace-nowrap ${
                    entityFilter === "ALL"
                      ? "bg-[#0f172a] text-white"
                      : "bg-[#f4efe4] text-[#0f172a] hover:bg-[#dcd4c4]"
                  }`}
                >
                  전체 사업장 ({documents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEntityFilter("CORP")}
                  className={`px-2.5 py-1 border-l border-[#b5a894] whitespace-nowrap ${
                    entityFilter === "CORP"
                      ? "bg-[#1d4ed8] text-white"
                      : "bg-[#f4efe4] text-[#1e40af] hover:bg-[#dcd4c4]"
                  }`}
                >
                  법인사업장 ({corpDocCount})
                </button>
                <button
                  type="button"
                  onClick={() => setEntityFilter("INDIVIDUAL")}
                  className={`px-2.5 py-1 border-l border-[#b5a894] whitespace-nowrap ${
                    entityFilter === "INDIVIDUAL"
                      ? "bg-[#b45309] text-white"
                      : "bg-[#f4efe4] text-[#92400e] hover:bg-[#dcd4c4]"
                  }`}
                >
                  개인사업장 ({indivDocCount})
                </button>
              </div>

              {/* 카테고리 필터 */}
              <div className="flex flex-wrap items-center gap-1">
                {DOC_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded text-xs font-bold border whitespace-nowrap transition ${
                      categoryFilter === cat
                        ? "bg-[#1d4ed8] text-white border-[#1e40af]"
                        : "bg-[#f4efe4] text-[#0f172a] border-[#b5a894] hover:bg-[#dcd4c4] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#475569]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문서명, 파일명, 개정이력 검색"
                className="bg-[#f4efe4] border border-[#b5a894] text-xs pl-8 pr-3 py-1.5 rounded w-full focus:outline-none focus:border-[#1d4ed8] dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>

          {/* 좌측 마스터 목록 + 우측 버전 히스토리 및 미리보기 */}
          <div className="flex-1 md:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 p-2.5 md:p-3">
            {/* 좌측: 문서 마스터 테이블 (7컬럼) */}
            <div className="lg:col-span-7 bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
              <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
                <span>중요문서 마스터 목록 ({filteredDocs.length}건)</span>
                <span className="text-[11px] font-normal text-[#475569] dark:text-slate-400">
                  행 클릭 시 우측에 버전 히스토리 타임라인과 PDF 미리보기가 표시됩니다
                </span>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#dcd4c4] text-[#0f172a] font-bold border-b border-[#b5a894] sticky top-0 z-10 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-2.5 whitespace-nowrap">관리</th>
                      <SortableTh label="구분" colKey="entityType" sortKey={docSort.sortKey} sortDir={docSort.sortDir} onSort={docSort.handleSort} className="py-2 px-2 font-bold" />
                      <SortableTh label="분류" colKey="category" sortKey={docSort.sortKey} sortDir={docSort.sortDir} onSort={docSort.handleSort} className="py-2 px-2 font-bold" />
                      <SortableTh label="문서명" colKey="title" sortKey={docSort.sortKey} sortDir={docSort.sortDir} onSort={docSort.handleSort} className="py-2 px-2.5 font-bold" />
                      <SortableTh label="현재버전" colKey="currentVersion" sortKey={docSort.sortKey} sortDir={docSort.sortDir} onSort={docSort.handleSort} align="center" className="py-2 px-2 font-bold" />
                      <SortableTh label="최신 시행/발급일" colKey="latestVersion.effectiveDate" sortKey={docSort.sortKey} sortDir={docSort.sortDir} onSort={docSort.handleSort} className="py-2 px-2 font-bold" />
                      <SortableTh label="최신 파일명" colKey="latestVersion.fileName" sortKey={docSort.sortKey} sortDir={docSort.sortDir} onSort={docSort.handleSort} className="py-2 px-2.5 font-bold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4b6a0] dark:divide-slate-800">
                    {filteredDocs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-[#475569]">
                          조건에 해당하는 중요문서가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredDocs.map((doc) => {
                        const isSelected = selectedDoc?.id === doc.id;
                        const latest = doc.latestVersion;
                        const isIncorporationArchive =
                          doc.category === "법인설립 원시서류 (보존용)";
                        return (
                          <tr
                            key={doc.id}
                            onClick={() => {
                              setSelectedDocId(doc.id);
                              if (latest && latest.fileExt === "pdf") {
                                setPreviewVer(latest);
                              } else {
                                setPreviewVer(null);
                              }
                            }}
                            className={`cursor-pointer transition ${
                              isSelected
                                ? "bg-[#dbeafe]/75 dark:bg-blue-950/50 font-semibold"
                                : isIncorporationArchive
                                ? "bg-[#e8e2d6]/60 hover:bg-[#e2dbcd] dark:bg-slate-900/50 dark:hover:bg-slate-800/40"
                                : "hover:bg-[#f4efe4] dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <td
                              className="py-2 px-2.5 whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1">
                                {latest && (
                                  <a
                                    href={`${latest.vaultUrl}&download=1`}
                                    className="px-2 py-1 rounded bg-[#047857] hover:bg-[#065f46] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                                    title="최신본 다운로드"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>다운로드</span>
                                  </a>
                                )}
                                {isIncorporationArchive ? (
                                  <span
                                    className="px-2 py-1 rounded bg-[#cbd5e1] text-[#334155] border border-[#94a3b8] text-[10.5px] font-bold inline-flex items-center whitespace-nowrap"
                                    title="법인 설립 시 작성된 원시서류로 이후 수정·변경이 필요 없는 영구 보존 문서입니다."
                                  >
                                    설립보존본(변경불필요)
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openNewVersionModal(doc)}
                                    className="px-2 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                                    title="개정 버전 업로드"
                                  >
                                    <Upload className="w-3 h-3" />
                                    <span>+버전추가</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2 whitespace-nowrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  doc.entityType === "INDIVIDUAL"
                                    ? "bg-[#fef3c7] text-[#92400e] border-[#fde68a]"
                                    : "bg-[#dbeafe] text-[#1e40af] border-[#93c5fd]"
                                }`}
                              >
                                {doc.entityType === "INDIVIDUAL" ? "개인" : "법인"}
                              </span>
                            </td>
                            <td className="py-2 px-2 whitespace-nowrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  doc.category === "정관·등기·의사록"
                                    ? "bg-[#dbeafe] text-[#1e3a8a] border-[#93c5fd]"
                                    : isIncorporationArchive
                                    ? "bg-[#e2e8f0] text-[#475569] border-[#cbd5e1]"
                                    : "bg-[#e2dbcd] text-[#0f172a] border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                                }`}
                              >
                                {doc.category}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 whitespace-nowrap">
                              <div className="font-bold text-[#0f172a] dark:text-slate-100">
                                {doc.title}
                              </div>
                              {doc.description && (
                                <div className="text-[11px] text-[#475569] dark:text-slate-400 truncate max-w-[240px]">
                                  {doc.description}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-mono font-extrabold ${
                                  doc.versions.length > 1
                                    ? "bg-[#fef3c7] text-[#92400e] border border-[#f59e0b]"
                                    : "bg-[#dbeafe] text-[#1e40af] border border-[#93c5fd]"
                                }`}
                              >
                                v{doc.currentVersion}.0 ({doc.versions.length}개 이력)
                              </span>
                            </td>
                            <td className="py-2 px-2 font-mono whitespace-nowrap">
                              {latest?.effectiveDate || "-"}
                            </td>
                            <td className="py-2 px-2.5 whitespace-nowrap">
                              {latest ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-[#e2e8f0] text-[#334155] font-bold">
                                    {latest.fileExt}
                                  </span>
                                  <span className="truncate max-w-[160px]">{latest.fileName}</span>
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 우측: 선택 문서의 버전 히스토리 타임라인 + 인라인 PDF 열람 (5컬럼) */}
            <div className="lg:col-span-5 flex flex-col gap-3 overflow-hidden">
              {selectedDoc ? (
                <>
                  {/* 버전 히스토리 카드 */}
                  <div className="bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden dark:bg-slate-900 dark:border-slate-800 shrink-0">
                    <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold min-w-0">
                        <History className="w-4 h-4 text-[#1d4ed8] dark:text-blue-400 shrink-0" />
                        <span className="truncate">{selectedDoc.title} — 버전 히스토리</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleResequenceVersions(selectedDoc.id)}
                          className="px-2 py-1 rounded bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#0f172a] border border-[#94a3b8] text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                          title="중간 버전 삭제 후 남은 버전들의 번호를 시행일 순으로 v1.0, v2.0... 순번에 맞게 낮춰 자동 정렬합니다"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>버전순번 자동정렬(v1~)</span>
                        </button>
                        {selectedDoc.category === "법인설립 원시서류 (보존용)" ? (
                          <span className="px-2.5 py-1 rounded bg-[#cbd5e1] text-[#334155] border border-[#94a3b8] text-[11px] font-bold shrink-0 whitespace-nowrap">
                            법인설립 원시서류 (영구보존)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openNewVersionModal(selectedDoc)}
                            className="px-2.5 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>신규 개정본(v{selectedDoc.currentVersion + 1}.0) 업로드</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 space-y-2 max-h-[280px] overflow-y-auto">
                      {selectedDoc.versions.map((ver, idx) => {
                        const isLatest = idx === 0;
                        const isPreviewing = previewVer?.id === ver.id;
                        const isEditing = editingVerId === ver.id;
                        return (
                          <div
                            key={ver.id}
                            className={`p-2.5 rounded border text-xs flex flex-col gap-1.5 ${
                              isPreviewing
                                ? "bg-[#dbeafe]/60 border-[#1d4ed8] dark:bg-blue-950/40 dark:border-blue-500"
                                : "bg-[#f4efe4] border-[#c4b6a0] dark:bg-slate-950 dark:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-extrabold shrink-0 ${
                                    isLatest
                                      ? "bg-[#047857] text-white"
                                      : "bg-[#cbd5e1] text-[#1e293b]"
                                  }`}
                                >
                                  {ver.versionLabel} {isLatest ? "(최신본)" : "(구버전 보존)"}
                                </span>
                                <span className="font-mono text-[11px] text-[#475569] dark:text-slate-400 shrink-0">
                                  시행/발급일: {ver.effectiveDate || "-"}
                                </span>
                                <span className="font-mono text-[10px] text-[#64748b] shrink-0">
                                  ({formatBytes(ver.fileSize)})
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    isEditing ? setEditingVerId(null) : startEditingVersion(ver)
                                  }
                                  className={`px-2 py-1 rounded text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap border ${
                                    isEditing
                                      ? "bg-[#fef3c7] text-[#92400e] border-[#f59e0b]"
                                      : "bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#0f172a] border-[#94a3b8]"
                                  }`}
                                  title="버전 번호(숫자), 시행일, 메모 수정"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>{isEditing ? "수정취소" : "버전수정"}</span>
                                </button>
                                {ver.fileExt === "pdf" && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewVer(ver)}
                                    className="px-2 py-1 rounded bg-[#334155] hover:bg-[#1e293b] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>열람</span>
                                  </button>
                                )}
                                <a
                                  href={`${ver.vaultUrl}&download=1`}
                                  className="px-2 py-1 rounded bg-[#047857] hover:bg-[#065f46] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>다운로드</span>
                                </a>
                                {selectedDoc.versions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVersion(ver)}
                                    className="p-1 rounded bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] border border-[#fca5a5]"
                                    title="이 버전 삭제 (삭제 시 남은 버전 번호 자동 정렬)"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {isEditing && (
                              <div className="p-2 rounded bg-[#ebe5d8] border border-[#b5a894] dark:bg-slate-900 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                <div className="sm:col-span-2 flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-[#334155] whitespace-nowrap">
                                    버전 숫자
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={editVerNo}
                                    onChange={(e) => {
                                      const n = Math.max(1, Number(e.target.value || 1));
                                      setEditVerNo(n);
                                      setEditVerLabel(`v${n}.0`);
                                    }}
                                    className="bg-white border border-[#94a3b8] rounded px-2 py-1 text-xs font-mono font-bold text-[#0f172a]"
                                  />
                                </div>
                                <div className="sm:col-span-2 flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-[#334155] whitespace-nowrap">
                                    버전 표기
                                  </label>
                                  <input
                                    type="text"
                                    value={editVerLabel}
                                    onChange={(e) => setEditVerLabel(e.target.value)}
                                    className="bg-white border border-[#94a3b8] rounded px-2 py-1 text-xs font-mono font-bold text-[#0f172a]"
                                  />
                                </div>
                                <div className="sm:col-span-3 flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-[#334155] whitespace-nowrap">
                                    시행/발급일
                                  </label>
                                  <input
                                    type="date"
                                    value={editVerDate}
                                    onChange={(e) => setEditVerDate(e.target.value)}
                                    className="bg-white border border-[#94a3b8] rounded px-2 py-1 text-xs font-mono text-[#0f172a]"
                                  />
                                </div>
                                <div className="sm:col-span-3 flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-[#334155] whitespace-nowrap">
                                    개정/보관 메모
                                  </label>
                                  <input
                                    type="text"
                                    value={editVerNote}
                                    onChange={(e) => setEditVerNote(e.target.value)}
                                    className="bg-white border border-[#94a3b8] rounded px-2 py-1 text-xs text-[#0f172a]"
                                  />
                                </div>
                                <div className="sm:col-span-2 flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    disabled={savingVer}
                                    onClick={() => handleSaveVersionEdit(ver.id)}
                                    className="w-full px-2 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>저장</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-bold text-[#0f172a] dark:text-slate-200 truncate">
                                파일: {ver.fileName}
                              </span>
                              <span className="text-[#475569] dark:text-slate-400 shrink-0">
                                등록자: {ver.uploadedBy}
                              </span>
                            </div>

                            {ver.changeNote && !isEditing && (
                              <div className="text-[11px] text-[#334155] dark:text-slate-300 bg-[#ebe5d8] dark:bg-slate-900 px-2 py-1 rounded border border-[#d5cbb8] dark:border-slate-800">
                                개정/보관 메모: {ver.changeNote}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 하단 PDF 인라인 미리보기 */}
                  <div className="flex-1 bg-[#ebe5d8] border border-[#b5a894] rounded shadow-xs overflow-hidden flex flex-col min-h-[340px] dark:bg-slate-900 dark:border-slate-800">
                    <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText className="w-4 h-4 text-[#047857]" />
                        <span className="truncate">
                          {previewVer
                            ? `[${previewVer.versionLabel}] ${previewVer.fileName} 미리보기`
                            : "문서 미리보기"}
                        </span>
                      </div>
                      {previewVer && (
                        <a
                          href={previewVer.vaultUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#1d4ed8] hover:underline whitespace-nowrap"
                        >
                          새 창에서 크게 열기 ↗
                        </a>
                      )}
                    </div>

                    <div className="flex-1 bg-[#f4efe4] dark:bg-slate-950 flex items-center justify-center">
                      {previewVer && previewVer.fileExt === "pdf" ? (
                        <iframe
                          src={previewVer.vaultUrl}
                          title={previewVer.fileName}
                          className="w-full h-full min-h-[320px] border-0"
                        />
                      ) : (
                        <div className="p-6 text-center text-xs text-[#475569] space-y-2">
                          <p>
                            {selectedDoc.latestVersion?.fileExt === "docx"
                              ? "Word(.docx) 문서는 상단 버전 히스토리에서 [다운로드] 버튼을 눌러 열람·편집하거나, PDF 버전을 [열람] 버튼으로 바로 확인하실 수 있습니다."
                              : "위 버전 히스토리에서 PDF 버전의 [열람] 버튼을 클릭하면 이곳에 즉시 표시됩니다."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-[#ebe5d8] border border-[#b5a894] rounded p-8 text-center text-xs text-[#475569]">
                  좌측 목록에서 문서를 선택해 주십시오.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {subTab === "CORP_MANUAL" && (
        <CorpManualSubTab
          setSubTab={setSubTab}
          jumpToDocumentByCode={jumpToDocumentByCode}
        />
      )}

      {subTab === "INDIV_MANUAL" && (
        <IndivManualSubTab
          corp={corp}
          indiv={indiv}
          indivDocCount={indivDocCount}
          setSubTab={setSubTab}
          setEntityFilter={setEntityFilter}
          jumpToDocumentByCode={jumpToDocumentByCode}
        />
      )}

      {subTab === "TEMPLATE_STUDIO" && (
        <TemplateStudioSubTab
          corp={corp}
          tplType={tplType}
          setTplType={setTplType}
          tplBaseDateText={tplBaseDateText}
          setTplBaseDateText={setTplBaseDateText}
          tplShareholderName={tplShareholderName}
          setTplShareholderName={setTplShareholderName}
          tplShareholderRegNo={tplShareholderRegNo}
          setTplShareholderRegNo={setTplShareholderRegNo}
          tplShareholderZip={tplShareholderZip}
          setTplShareholderZip={setTplShareholderZip}
          tplShareholderPhone={tplShareholderPhone}
          setTplShareholderPhone={setTplShareholderPhone}
          tplShareholderShares={tplShareholderShares}
          setTplShareholderShares={setTplShareholderShares}
          tplShareholderParValue={tplShareholderParValue}
          setTplShareholderParValue={setTplShareholderParValue}
          tplShareholderAmount={tplShareholderAmount}
          setTplShareholderAmount={setTplShareholderAmount}
          tplShareholderRatio={tplShareholderRatio}
          setTplShareholderRatio={setTplShareholderRatio}
          tplShareholderRel={tplShareholderRel}
          setTplShareholderRel={setTplShareholderRel}
          tplShareholderNote={tplShareholderNote}
          setTplShareholderNote={setTplShareholderNote}
          tplBlankRowsCount={tplBlankRowsCount}
          setTplBlankRowsCount={setTplBlankRowsCount}
          tplResolutionDate={tplResolutionDate}
          setTplResolutionDate={setTplResolutionDate}
          tplResolutionDateKor={tplResolutionDateKor}
          setTplResolutionDateKor={setTplResolutionDateKor}
          tplEffectiveDate={tplEffectiveDate}
          setTplEffectiveDate={setTplEffectiveDate}
          tplAgendaTitle={tplAgendaTitle}
          setTplAgendaTitle={setTplAgendaTitle}
          tplAgendaBody={tplAgendaBody}
          setTplAgendaBody={setTplAgendaBody}
          tplCompareTableTitle={tplCompareTableTitle}
          setTplCompareTableTitle={setTplCompareTableTitle}
          tplArticleNo={tplArticleNo}
          setTplArticleNo={setTplArticleNo}
          tplBeforeText={tplBeforeText}
          setTplBeforeText={setTplBeforeText}
          tplAfterText={tplAfterText}
          setTplAfterText={setTplAfterText}
          tplReasonText={tplReasonText}
          setTplReasonText={setTplReasonText}
          tplShareholderAddr={tplShareholderAddr}
          setTplShareholderAddr={setTplShareholderAddr}
          handleCopyTemplate={handleCopyTemplate}
          handlePrintTemplate={handlePrintTemplate}
          jumpToDocumentByCode={jumpToDocumentByCode}
        />
      )}

      {showUploadModal && (
        <UploadDocModal
          uploadTargetDoc={uploadTargetDoc}
          formEntityType={formEntityType}
          setFormEntityType={setFormEntityType}
          formCategory={formCategory}
          setFormCategory={setFormCategory}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formDesc={formDesc}
          setFormDesc={setFormDesc}
          formEffectiveDate={formEffectiveDate}
          setFormEffectiveDate={setFormEffectiveDate}
          formChangeNote={formChangeNote}
          setFormChangeNote={setFormChangeNote}
          setFormFile={setFormFile}
          submitting={submitting}
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleUploadSubmit}
        />
      )}
    </div>
  );
};
