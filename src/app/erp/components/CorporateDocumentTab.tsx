"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  BookOpen,
  FileSignature,
  FolderArchive,
  Plus,
  RefreshCw,
} from "lucide-react";
import { BUSINESS_ENTITIES } from "@/lib/businessEntities";
import {
  type CorporateDocItem,
  type CorporateDocumentTabProps,
  type CorporateTemplateType,
  type DocVersionItem,
  type MainSubTab,
  type TemplateStudioState,
} from "./corporate-docs/corporateDocTypes";
import { CorporateDocVaultSubTab } from "./corporate-docs/CorporateDocVaultSubTab";

const CorpManualSubTab = dynamic(
  () =>
    import("./corporate-docs/EntityManualSubTabs").then(
      (m) => m.CorpManualSubTab
    ),
  { ssr: false }
);
const IndivManualSubTab = dynamic(
  () =>
    import("./corporate-docs/EntityManualSubTabs").then(
      (m) => m.IndivManualSubTab
    ),
  { ssr: false }
);
const TemplateStudioSubTab = dynamic(
  () =>
    import("./corporate-docs/TemplateStudioSubTab").then(
      (m) => m.TemplateStudioSubTab
    ),
  { ssr: false }
);
const UploadDocModal = dynamic(
  () =>
    import("./corporate-docs/UploadDocModal").then((m) => m.UploadDocModal),
  { ssr: false }
);

export const CorporateDocumentTab: React.FC<CorporateDocumentTabProps> = ({
  currentUser,
  selectedEntity = "ALL",
}) => {
  const [subTab, setSubTab] = useState<MainSubTab>("VAULT");
  const [documents, setDocuments] = useState<CorporateDocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [entityFilter, setEntityFilter] = useState<"ALL" | "CORP" | "INDIVIDUAL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("전체");

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
    if (subTab === "TEMPLATE_STUDIO") {
      void import("./corporate-docs/corporateDocTemplates");
    }
  }, [subTab]);

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

  const handleCopyTemplate = async () => {
    const { buildGeneratedTemplateText } = await import(
      "./corporate-docs/corporateDocTemplates"
    );
    const generatedText = buildGeneratedTemplateText(corp, templateStudioState);
    await navigator.clipboard.writeText(generatedText);
    alert("서식 원문이 클립보드에 복사되었습니다.");
  };

  const handlePrintTemplate = async () => {
    const { buildGeneratedTemplateText, printCorporateTemplate } = await import(
      "./corporate-docs/corporateDocTemplates"
    );
    const generatedText = buildGeneratedTemplateText(corp, templateStudioState);
    printCorporateTemplate(corp, templateStudioState, generatedText);
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

      {subTab === "VAULT" && (
        <CorporateDocVaultSubTab
          documents={documents}
          corpDocCount={corpDocCount}
          indivDocCount={indivDocCount}
          entityFilter={entityFilter}
          setEntityFilter={setEntityFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          selectedDocId={selectedDocId}
          setSelectedDocId={setSelectedDocId}
          previewVer={previewVer}
          setPreviewVer={setPreviewVer}
          openNewVersionModal={openNewVersionModal}
          fetchDocuments={fetchDocuments}
        />
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
