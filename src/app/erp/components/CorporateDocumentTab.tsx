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
} from "lucide-react";
import { BUSINESS_ENTITIES } from "@/lib/businessEntities";

interface DocVersionItem {
  id: number;
  documentId: number;
  versionNo: number;
  versionLabel: string;
  effectiveDate: string | null;
  fileName: string;
  fileExt: string;
  mimeType: string;
  fileSize: number;
  r2Key: string;
  vaultUrl: string;
  changeNote: string;
  uploadedBy: string;
  createdAt: string;
}

interface CorporateDocItem {
  id: number;
  docCode: string;
  entityType: "CORP" | "INDIVIDUAL";
  category: string;
  title: string;
  description: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  latestVersion: DocVersionItem | null;
  versions: DocVersionItem[];
}

interface CorporateDocumentTabProps {
  currentUser?: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
}

const DOC_CATEGORIES = [
  "전체",
  "설립·정관·등기",
  "주주·주식·자본",
  "세무·공과·인증",
  "부동산·임대차",
  "기타 중요문서",
];

type MainSubTab = "VAULT" | "CORP_MANUAL" | "INDIV_MANUAL" | "TEMPLATE_STUDIO";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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
  const [formCategory, setFormCategory] = useState<string>("설립·정관·등기");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formEffectiveDate, setFormEffectiveDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [formChangeNote, setFormChangeNote] = useState<string>("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // [서식 작성·출력 스튜디오] 상태
  const [tplType, setTplType] = useState<
    "SHAREHOLDER_STATEMENT" | "RESOLUTION" | "COMPARE_TABLE" | "SHAREHOLDER_LIST"
  >("SHAREHOLDER_STATEMENT");
  const [tplBaseDateText, setTplBaseDateText] = useState<string>("2026년 09월 13일 현재");
  const [tplShareholderName, setTplShareholderName] = useState<string>("이정용");
  const [tplShareholderRegNo, setTplShareholderRegNo] = useState<string>("770617-1019515");
  const [tplShareholderZip, setTplShareholderZip] = useState<string>("01863");
  const [tplShareholderPhone, setTplShareholderPhone] = useState<string>("010-9224-4097");
  const [tplShareholderShares, setTplShareholderShares] = useState<string>("10,000");
  const [tplShareholderParValue, setTplShareholderParValue] = useState<string>("500원");
  const [tplShareholderAmount, setTplShareholderAmount] = useState<string>("5,000,000원");
  const [tplShareholderRatio, setTplShareholderRatio] = useState<string>("100");
  const [tplShareholderRel, setTplShareholderRel] = useState<string>("본인");
  const [tplShareholderNote, setTplShareholderNote] = useState<string>("");
  const [tplBlankRowsCount, setTplBlankRowsCount] = useState<number>(7);
  const [tplResolutionDate, setTplResolutionDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [tplEffectiveDate, setTplEffectiveDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [tplAgendaTitle, setTplAgendaTitle] = useState<string>("제1호 의안 : 정관 일부 변경의 건");
  const [tplArticleNo, setTplArticleNo] = useState<string>("제2조 (목적)");
  const [tplBeforeText, setTplBeforeText] = useState<string>(
    `회사는 다음의 사업을 영위함을 목적으로 한다.\n1. 소프트웨어 개발 및 공급업\n2. 컴퓨터 프로그래밍 서비스업\n3. 컴퓨터 시스템 통합 자문 및 구축 서비스업\n4. 데이터베이스 구축업\n5. 기타 사무 지원 서비스업\n6. 문서 작성업\n7. 컴퓨터 및 사무용 기계·장비 임대업\n8. 기타 산업용 기계 및 장비 임대업\n9. 컴퓨터 및 주변장치, 소프트웨어 도매업\n10. 컴퓨터 및 주변장치, 소프트웨어 소매업\n11. 기계 및 장비 중개업\n12. 부동산 임대업\n13. 위 각 호에 관련된 부대사업 일체`
  );
  const [tplAfterText, setTplAfterText] = useState<string>(
    `회사는 다음의 사업을 영위함을 목적으로 한다.\n1. 소프트웨어 개발 및 공급업\n2. 컴퓨터 프로그래밍 서비스업\n3. 컴퓨터 시스템 통합 자문 및 구축 서비스업\n4. 데이터베이스 구축업\n5. 기타 사무 지원 서비스업\n6. 문서 작성업\n7. 컴퓨터 및 사무용 기계·장비 임대업\n8. 기타 산업용 기계 및 장비 임대업\n9. 컴퓨터 및 주변장치, 소프트웨어 도매업\n10. 컴퓨터 및 주변장치, 소프트웨어 소매업\n11. 기계 및 장비 중개업\n12. 부동산 임대업\n13. 전자상거래 및 통신판매업\n14. 건설기계 및 산업장비 임대·유통업\n15. 위 각 호에 관련된 부대사업 일체`
  );
  const [tplReasonText, setTplReasonText] = useState<string>("사업 다각화 및 신규 사업 목적 추가");
  const [tplShareholderAddr, setTplShareholderAddr] = useState<string>(
    "서울 노원구 섬밭로 196, 610동 302호(하계동, 장미아파트)"
  );

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

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (entityFilter !== "ALL" && d.entityType !== entityFilter) return false;
      if (categoryFilter !== "전체" && d.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const inTitle = d.title.toLowerCase().includes(q);
        const inDesc = (d.description || "").toLowerCase().includes(q);
        const inCode = (d.docCode || "").toLowerCase().includes(q);
        const inFiles = d.versions.some(
          (v) =>
            v.fileName.toLowerCase().includes(q) ||
            (v.changeNote || "").toLowerCase().includes(q)
        );
        return inTitle || inDesc || inCode || inFiles;
      }
      return true;
    });
  }, [documents, entityFilter, categoryFilter, searchQuery]);

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
    setFormCategory(defaultEntity === "CORP" ? "설립·정관·등기" : "세무·공과·인증");
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
    if (!window.confirm(`[${ver.versionLabel}] ${ver.fileName} 버전을 삭제하시겠습니까?`)) {
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

  const corp = BUSINESS_ENTITIES.CORP;
  const indiv = BUSINESS_ENTITIES.INDIVIDUAL;

  // 서식 자동생성 텍스트 빌더
  const generatedTemplateText = useMemo(() => {
    if (tplType === "RESOLUTION") {
      return `                        주 주 서 면 결 의 서

${corp.corpName} (이하 "회사"라 함)의 총주주 1인은 상법 제363조 제4항 및 제6항에 따라, 주주총회의 소집 절차를 거치지 아니하고 서면에 의하여 다음과 같이 결의한다.

--------------------------------------------------------------------------------
1. 결의 일자 : ${tplResolutionDate}
2. 결의 장소 : ${corp.address} 본점 회의실
3. 주주 현황 :
   - 총 발행주식수 : ${(corp.totalShares || 10000).toLocaleString()} 주 (1주의 금액: ₩${(corp.parValue || 500).toLocaleString()}, 자본금: ₩${corp.capitalStock.toLocaleString()})
   - 출석(결의) 주식수 : ${(corp.totalShares || 10000).toLocaleString()} 주 (100%)
   - 주주 성명 : ${corp.ceoName} (770617-1******)

--------------------------------------------------------------------------------
[결 의 안 건]

${tplAgendaTitle}

회사의 사업 확장 및 경영 합리화를 위하여 정관 일부를 별첨 [신·구조문대비표]와 같이 변경하기로 하며, 참석 주주 1인의 전원 찬성으로 원안대로 가결하다.

[부 칙]
제1조 (시행일) 본 결의에 따라 변경된 정관은 ${tplEffectiveDate}부터 효력을 발생한다.

--------------------------------------------------------------------------------
위 결의를 명확히 하기 위하여 본 결의서를 작성하고, 유일 주주가 이에 기명날인한다.

                                ${tplResolutionDate}

                                ${corp.corpName}
                                법인등록번호 : ${corp.corpRegNum}
                                주  주 :  ${corp.ceoName}   (개인인감 날인)`;
    }

    if (tplType === "COMPARE_TABLE") {
      return `[별첨]
                          신 · 구 조 문 대 비 표

대상 법인 : ${corp.corpName} (사업자등록번호: ${corp.bizNum} / 법인등록번호: ${corp.corpRegNum})
결의 일자 : ${tplResolutionDate} / 시행 일자 : ${tplEffectiveDate}

================================================================================
[조항 구분] : ${tplArticleNo}
--------------------------------------------------------------------------------
■ 현행 정관 (변경 전)
${tplBeforeText}

--------------------------------------------------------------------------------
■ 개정 정관 (변경 후)
${tplAfterText}

--------------------------------------------------------------------------------
■ 개정 사유 : ${tplReasonText}
================================================================================
■ 부칙 신설
제1조 (시행일) 이 정관은 ${tplEffectiveDate}부터 시행한다.
================================================================================`;
    }

    return `                            주  주  명  부

                                                    기준일: ${tplResolutionDate}

상        호 : ${corp.corpName}
법인등록번호 : ${corp.corpRegNum} (사업자등록번호: ${corp.bizNum})
발행주식총수 : ${(corp.totalShares || 10000).toLocaleString()} 주 (1주의 금액: ${(corp.parValue || 500).toLocaleString()} 원)
자   본   금 : ${corp.capitalStock.toLocaleString()} 원

┌──────┬────────┬────────────────┬────────────────────────────────────┬──────────┬──────────┬──────┐
│ 순번 │  성명  │    주민등록번호│               주  소               │보유주식수│주식보유액│지분율│
├──────┼────────┼────────────────┼────────────────────────────────────┼──────────┼──────────┼──────┤
│  1   │ ${corp.ceoName} │ 770617-1019515 │ ${tplShareholderAddr} │ 10,000주 │5,000,000원│ 100% │
├──────┴────────┴────────────────┴────────────────────────────────────┼──────────┼──────────┼──────┤
│                                총  계                               │ 10,000주 │5,000,000원│ 100% │
└─────────────────────────────────────────────────────────────────────┴──────────┴──────────┴──────┘

위 기재 사실이 틀림없음을 증명합니다.

                                ${tplResolutionDate}

                                ${corp.corpName}
                                본점 : ${corp.address}
                                대표이사  ${corp.ceoName}   (법인인감 날인)`;
  }, [
    tplType,
    tplResolutionDate,
    tplEffectiveDate,
    tplAgendaTitle,
    tplArticleNo,
    tplBeforeText,
    tplAfterText,
    tplReasonText,
    tplShareholderAddr,
    corp,
  ]);

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(generatedTemplateText);
    alert("서식 원문이 클립보드에 복사되었습니다.");
  };

  const handlePrintTemplate = () => {
    const win = window.open("", "_blank", "width=900,height=850");
    if (!win) return;

    if (tplType === "SHAREHOLDER_STATEMENT") {
      const phoneFormatted = tplShareholderPhone.includes("-")
        ? `${tplShareholderPhone.split("-").slice(0, 2).join("-")}<br/>-${tplShareholderPhone.split("-")[2]}`
        : tplShareholderPhone;

      const emptyRowsHtml = Array.from({ length: tplBlankRowsCount })
        .map(
          () => `
          <tr style="height: 26px;">
            <td style="border: 1px solid #000;">&nbsp;</td>
            <td style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
            <td rowspan="2" style="border: 1px solid #000;">&nbsp;</td>
          </tr>
          <tr style="height: 38px;">
            <td colspan="2" style="border: 1px solid #000;">&nbsp;</td>
          </tr>`
        )
        .join("");

      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>주주명세서 - ${corp.corpName}</title>
            <style>
              @page { size: A4 portrait; margin: 12mm 12mm 12mm 12mm; }
              body {
                font-family: 'Malgun Gothic', '맑은 고딕', 'Dotum', sans-serif;
                color: #000;
                background: #fff;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              table { width: 100%; border-collapse: collapse; table-layout: fixed; }
              th, td { box-sizing: border-box; font-size: 11.5px; color: #000; }
            </style>
          </head>
          <body>
            <table style="border: 1.5px solid #000; margin-bottom: 6px;">
              <tr>
                <td style="width: 28%; border: 1.5px solid #000; text-align: center; font-weight: 700; font-size: 13px; padding: 10px 4px;">
                  ${tplBaseDateText}
                </td>
                <td style="width: 44%; border: 1.5px solid #000; text-align: center; font-weight: 800; font-size: 24px; letter-spacing: 12px; text-indent: 12px; padding: 10px 0;">
                  주주명세서
                </td>
                <td style="width: 28%; border: 1.5px solid #000; padding: 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="border-bottom: 1px solid #000; text-align: center; font-weight: 700; font-size: 11.5px; padding: 4px 0;">
                        회 사 명
                      </td>
                    </tr>
                    <tr>
                      <td style="text-align: center; font-weight: 700; font-size: 13px; padding: 6px 2px;">
                        ${corp.corpName}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table style="border: 1.5px solid #000;">
              <colgroup>
                <col style="width: 12%;" />
                <col style="width: 19%;" />
                <col style="width: 14%;" />
                <col style="width: 10%;" />
                <col style="width: 10%;" />
                <col style="width: 15%;" />
                <col style="width: 8%;" />
                <col style="width: 8%;" />
                <col style="width: 4%;" />
              </colgroup>
              <thead>
                <tr>
                  <th style="border: 1px solid #000; padding: 5px 2px; font-weight: 600; font-size: 10.5px;">①성 명<br/>(회사명)</th>
                  <th style="border: 1px solid #000; padding: 5px 2px; font-weight: 600; font-size: 10.5px;">②주민등록번호<br/>(법인등록번호)</th>
                  <th rowspan="2" style="border: 1px solid #000; padding: 5px 2px; font-weight: 600; font-size: 10.5px;">④전화번호<br/>(휴대전화)</th>
                  <th colspan="4" style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10.5px;">지분 또는 출자관계</th>
                  <th rowspan="2" style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10px; line-height: 1.25;">⑨<br/>대주주<br/>와의<br/>관계</th>
                  <th rowspan="2" style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10.5px;">비<br/>고</th>
                </tr>
                <tr>
                  <th colspan="2" style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10.5px;">③주 소</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10.5px;">⑤ 주식수</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10px; line-height: 1.2;">⑥ 주당<br/>액면가액</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10.5px;">⑦ 금 액</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; font-weight: 600; font-size: 10px; line-height: 1.2;">⑧지분율<br/>(%)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="height: 26px;">
                  <td style="border: 1px solid #000; text-align: center; font-weight: 600;">${tplShareholderName}</td>
                  <td style="border: 1px solid #000; text-align: center; font-family: monospace; font-size: 11.5px;">${tplShareholderRegNo}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: center; font-family: monospace; font-size: 11.5px; line-height: 1.3;">${phoneFormatted}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: right; padding-right: 6px; font-family: monospace; font-size: 11.5px;">${tplShareholderShares}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: right; padding-right: 6px; font-size: 11.5px;">${tplShareholderParValue}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: right; padding-right: 6px; font-family: monospace; font-size: 11.5px;">${tplShareholderAmount}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: center; font-family: monospace; font-size: 11.5px;">${tplShareholderRatio}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: center; font-size: 11.5px;">${tplShareholderRel}</td>
                  <td rowspan="2" style="border: 1px solid #000; text-align: center; font-size: 11px;">${tplShareholderNote}</td>
                </tr>
                <tr style="height: 40px;">
                  <td colspan="2" style="border: 1px solid #000; padding: 3px 6px; vertical-align: top; font-size: 10.5px; line-height: 1.35;">
                    ${tplShareholderZip ? `<div style="font-family: monospace; font-size: 10px;">${tplShareholderZip}</div>` : ""}
                    <div>${tplShareholderAddr}</div>
                  </td>
                </tr>
                ${emptyRowsHtml}
              </tbody>
            </table>
            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>
      `);
      win.document.close();
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>${corp.corpName} - 법인 변경등기/정관변경 표준 서식</title>
          <style>
            body { font-family: 'Malgun Gothic', serif; padding: 40px; line-height: 1.65; color: #111; }
            pre { font-family: 'Malgun Gothic', monospace; font-size: 13px; white-space: pre-wrap; word-break: keep-all; }
            @media print { body { padding: 15mm; } }
          </style>
        </head>
        <body>
          <pre>${generatedTemplateText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
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
                      <th className="py-2 px-2 whitespace-nowrap">구분</th>
                      <th className="py-2 px-2 whitespace-nowrap">분류</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">문서명</th>
                      <th className="py-2 px-2 text-center whitespace-nowrap">현재버전</th>
                      <th className="py-2 px-2 whitespace-nowrap">최신 시행/발급일</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">최신 파일명</th>
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
                                <button
                                  type="button"
                                  onClick={() => openNewVersionModal(doc)}
                                  className="px-2 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                                  title="개정 버전 업로드"
                                >
                                  <Upload className="w-3 h-3" />
                                  <span>+버전추가</span>
                                </button>
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
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e2dbcd] border border-[#b5a894] dark:bg-slate-800 dark:border-slate-700">
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
                      <button
                        type="button"
                        onClick={() => openNewVersionModal(selectedDoc)}
                        className="px-2.5 py-1 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>신규 개정본(v{selectedDoc.currentVersion + 1}.0) 업로드</span>
                      </button>
                    </div>

                    <div className="p-2.5 space-y-2 max-h-[250px] overflow-y-auto">
                      {selectedDoc.versions.map((ver, idx) => {
                        const isLatest = idx === 0;
                        const isPreviewing = previewVer?.id === ver.id;
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
                                    title="이 버전 삭제"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-bold text-[#0f172a] dark:text-slate-200 truncate">
                                파일: {ver.fileName}
                              </span>
                              <span className="text-[#475569] dark:text-slate-400 shrink-0">
                                등록자: {ver.uploadedBy}
                              </span>
                            </div>

                            {ver.changeNote && (
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

      {/* =====================================================================
          TAB 2: [법인사업장] 정관변경·전자등기·사업자등록정정 운영 매뉴얼
         ===================================================================== */}
      {subTab === "CORP_MANUAL" && (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 text-xs">
          {/* 상단 핵심 법적 근거 요약 배너 */}
          <div className="p-3.5 rounded bg-[#f4efe4] border-2 border-[#047857] dark:bg-slate-900 dark:border-emerald-700 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#047857] text-white font-bold text-[11px]">
                  상법 제363조 제4항·제6항 소규모 법인 특례 적용
                </span>
                <span className="font-extrabold text-sm text-[#0f172a] dark:text-white">
                  주식회사 드래곤알피에이 (자본금 500만원 · 1인 주주 이정용 100%) 정관변경 및 전자등기 표준 절차
                </span>
              </div>
              <p className="text-[#334155] dark:text-slate-300">
                자본금 10억 원 미만의 1인 주주 법인은 <strong>주주총회 소집절차 생략</strong> 및{" "}
                <strong>공증인의 의사록 인증(공증) 면제</strong>가 적용되어,{" "}
                <strong>주주서면결의서 + 개정 정관 + 주주명부</strong>만으로 정관 변경 및 대법원 인터넷등기소 전자등기를 완결할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSubTab("TEMPLATE_STUDIO")}
                className="px-3 py-1.5 rounded bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileSignature className="w-3.5 h-3.5" />
                <span>주주서면결의서·대비표·주주명부 즉시 작성</span>
              </button>
            </div>
          </div>

          {/* 5단계 워크플로우 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* STEP 1 */}
            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-[#c4b6a0] pb-2">
                <span className="font-extrabold text-sm text-[#1e40af] dark:text-blue-400">
                  1단계. 변경 내용 검토 및 등기 필요 여부 판별
                </span>
                <span className="px-2 py-0.5 rounded bg-[#fee2e2] text-[#991b1b] font-bold text-[11px]">
                  등기사항: 결의일로부터 14일 이내 등기 필수
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-[#991b1b] dark:text-red-400">
                    ● 등기사항 (2주 이내 변경등기 필수 / 도과 시 과태료)
                  </div>
                  <ul className="list-disc list-inside text-[#334155] dark:text-slate-300 space-y-0.5 text-[11px]">
                    <li>상호(사명) 변경</li>
                    <li>사업목적(업태/종목) 추가·변경·삭제</li>
                    <li>본점 소재지 이전 규정</li>
                    <li>공고 방법 변경, 발행예정주식총수/1주의 금액</li>
                  </ul>
                </div>
                <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] dark:bg-slate-950 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-[#047857] dark:text-emerald-400">
                    ● 비등기사항 (사내 정관 개정 및 보관만으로 완료)
                  </div>
                  <ul className="list-disc list-inside text-[#334155] dark:text-slate-300 space-y-0.5 text-[11px]">
                    <li>회계연도(결산기) 변경</li>
                    <li>이사·감사 수의 범위 규정, 임원 보수·퇴직금 규정</li>
                    <li>배당 규정, 주총 결의 요건, 대표이사 권한 규정</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-[#c4b6a0] pb-2">
                <span className="font-extrabold text-sm text-[#1e40af] dark:text-blue-400">
                  2단계. 1인 주주서면결의서 및 신·구조문대비표 작성
                </span>
                <span className="px-2 py-0.5 rounded bg-[#ecfdf5] text-[#047857] font-bold text-[11px]">
                  공증 면제 (상법 제363조 제4항)
                </span>
              </div>
              <ul className="list-disc list-inside text-[#334155] dark:text-slate-300 space-y-1">
                <li>
                  <strong>주주총회 특별결의 갈음</strong>: 1인 주주(이정용, 보통주 10,000주 100%)의 서면결의서 작성으로 주주총회 결의를 갈음합니다.
                </li>
                <li>
                  <strong>필수 기재사항</strong>: 결의 일자, 결의 장소(본점), 변경 전·후 <strong>[신·구조문대비표]</strong>, 부칙 시행일, 유일 주주 성명 및 기명날인.
                </li>
                <li>
                  <strong>날인 도장 구분 주의</strong>:{" "}
                  <span className="font-bold text-[#991b1b]">
                    주주서면결의서에는 주주 개인인감도장
                  </span>
                  을 날인하고,{" "}
                  <span className="font-bold text-[#1e40af]">
                    주주명부 및 개정 정관 사본(원본대조필)에는 법인인감도장
                  </span>
                  을 날인합니다.
                </li>
              </ul>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-SHAREHOLDER-RES")}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>보관함 연결: 주주서면결의서 (v2.0) 열람</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-SHAREHOLDER-RES", true)}
                  className="px-2.5 py-1 rounded bg-[#047857] text-white font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>주주서면결의서 신규 버전 업로드</span>
                </button>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-[#c4b6a0] pb-2">
                <span className="font-extrabold text-sm text-[#1e40af] dark:text-blue-400">
                  3단계. 정관 수정본 및 주주명부 작성·법인인감 날인
                </span>
                <span className="px-2 py-0.5 rounded bg-[#dbeafe] text-[#1e40af] font-bold text-[11px]">
                  부칙 시행일 명시 필수
                </span>
              </div>
              <ul className="list-disc list-inside text-[#334155] dark:text-slate-300 space-y-1">
                <li>
                  <strong>정관 부칙 추가</strong>: 정관 말미에 <code>부칙 (202X년 X월 X일) 제1조(시행일) 이 정관은 202X년 X월 X일부터 시행한다.</code>를 추가합니다.
                </li>
                <li>
                  <strong>법인인감 간인 및 원본대조필</strong>: 정관 매 장 사이에 대표이사 법인인감으로 간인하고, 표지/말미에 원본대조필 법인인감을 날인하여 PDF로 스캔합니다.
                </li>
                <li>
                  <strong>주주명부 작성</strong>: 결의일 기준 주주명부(보통주 10,000주, 자본금 5,000,000원, 지분 100%) 하단에 대표이사 법인인감을 날인합니다.
                </li>
              </ul>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-ARTICLES")}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>보관함 연결: 정관 (v3.0 확정본) 열람</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-SHAREHOLDER-LIST")}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>보관함 연결: 주주명부 (v3.0) 열람</span>
                </button>
              </div>
            </div>

            {/* STEP 4 */}
            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-[#c4b6a0] pb-2">
                <span className="font-extrabold text-sm text-[#1e40af] dark:text-blue-400">
                  4단계. 등록면허세 납부 및 대법원 인터넷등기소 전자신청
                </span>
                <span className="px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e] font-bold text-[11px]">
                  서울 이택스(ETAX) + 인터넷등기소
                </span>
              </div>
              <ol className="list-decimal list-inside text-[#334155] dark:text-slate-300 space-y-1">
                <li>
                  <strong>등록면허세(정액분) 납부 (서울 ETAX/위택스)</strong>: [신고/납부] → [등록면허세(등록분)] → <code>법인 등기(정액분) - 기타 등기(상호/목적 등 변경)</code> 선택 → 약 <strong>₩48,240</strong> (서울 과밀억제권역 기준, 지방교육세 포함) 납부 후 <strong>납부번호</strong> 확인.
                </li>
                <li>
                  <strong>등기신청수수료 전자납부 (인터넷등기소)</strong>: [전자납부] → [등기신청수수료 전자납부] → 법인 전자신청 기준 <strong>₩2,000</strong> (e-Form 서면은 ₩4,000).
                </li>
                <li>
                  <strong>인터넷등기소 전자신청서 작성</strong>: [법인등기] → [전자신청] → [신청서 작성 및 제출] → 등기목적: <code>주식회사 변경등기</code> → 등기사유 및 변경할 목적/상호 입력 → 등록면허세 납부번호 연계.
                </li>
                <li>
                  <strong>전자 첨부서면 PDF 업로드 및 전자서명</strong>: ①주주서면결의서(신구조문대비표 포함), ②개정 정관 사본, ③주주명부 PDF 첨부 후 <strong>법인 전자증명서(USB)</strong> 및 <strong>대표자 개인 공동인증서</strong>로 전자서명 후 제출.
                </li>
              </ol>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-LICENSE-TAX")}
                  className="px-2.5 py-1 rounded bg-[#334155] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>보관함 연결: 등록면허세 납부확인서</span>
                </button>
                <a
                  href="http://www.iros.go.kr"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-[#e2dbcd] border border-[#b5a894] text-[#0f172a] font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>대법원 인터넷등기소 바로가기</span>
                </a>
                <a
                  href="https://etax.seoul.go.kr"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-[#e2dbcd] border border-[#b5a894] text-[#0f172a] font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>서울시 ETAX 바로가기</span>
                </a>
              </div>
            </div>
          </div>

          {/* STEP 5: 등기 교합 완료 후 후속 조치 (사업자등록 정정 + ERP 보관함 최신화) */}
          <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2.5 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-[#c4b6a0] pb-2">
              <span className="font-extrabold text-sm text-[#047857] dark:text-emerald-400">
                5단계. 등기 교합 완료 후 사후 행정 절차 (국세청 홈택스 사업자등록 정정 & ERP 버전 등록)
              </span>
              <span className="px-2 py-0.5 rounded bg-[#dbeafe] text-[#1e40af] font-bold text-[11px]">
                교합 완료 후 1~2일 내 즉시 실행
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] space-y-1.5">
                <div className="font-bold text-[#0f172a]">① 변경된 법인등기사항전부증명서 발급</div>
                <p className="text-[11px] text-[#334155]">
                  인터넷등기소에서 교합완료 확인 즉시 변경된 등기사항전부증명서(현재 유효사항) PDF를 발급받아 ERP 보관함 <strong>법인 등기사항전부증명서</strong>의 신규 버전으로 업로드합니다.
                </p>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-REGISTRY-CERT", true)}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>등기부등본 신규 버전 업로드</span>
                </button>
              </div>

              <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] space-y-1.5">
                <div className="font-bold text-[#0f172a]">② 국세청 홈택스 법인 사업자등록 정정신고</div>
                <p className="text-[11px] text-[#334155]">
                  홈택스 → [국세증명·사업자등록·세금관련 신청/신고] → <strong>[사업자등록 정정(법인)]</strong>에서 업태/종목(사업목적), 상호, 주소 등을 정정 신청합니다. (첨부: 변경 후 등기부등본, 개정 정관 사본, 기존 사업자등록증)
                </p>
                <a
                  href="https://www.hometax.go.kr"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-[#047857] text-white font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>국세청 홈택스 바로가기</span>
                </a>
              </div>

              <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] space-y-1.5">
                <div className="font-bold text-[#0f172a]">③ 정정된 법인 사업자등록증 ERP 버전 등록</div>
                <p className="text-[11px] text-[#334155]">
                  세무서 처리 완료 후 재교부된 법인 사업자등록증(806-88-03266) 및 사업자등록증명을 PDF로 저장하여 ERP 보관함에 신규 버전으로 등록합니다.
                </p>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-BIZ-CERT", true)}
                  className="px-2.5 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>법인 사업자등록증 신규 버전 업로드</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: [개인사업장] 사업자등록 정정·주소이전 운영 매뉴얼
         ===================================================================== */}
      {subTab === "INDIV_MANUAL" && (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 text-xs">
          {/* 상단 개인사업장 비교 요약 배너 */}
          <div className="p-3.5 rounded bg-[#f4efe4] border-2 border-[#b45309] dark:bg-slate-900 dark:border-amber-700 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#b45309] text-white font-bold text-[11px]">
                  개인사업장 전용 행정 절차 (등기소 절차 없음)
                </span>
                <span className="font-extrabold text-sm text-[#0f172a] dark:text-white">
                  드래곤알피에이 [개인] (사업자등록번호: {indiv.bizNum} / 대표자: {indiv.ceoName}) 운영 매뉴얼
                </span>
              </div>
              <p className="text-[#334155] dark:text-slate-300">
                개인사업자는 상법상 법인이 아니므로 <strong>정관, 주주서면결의서, 법인등기부등본 변경등기 및 등록면허세(₩48,240) 납부 의무가 일절 없습니다.</strong>{" "}
                업종(업태·종목) 추가, 사업장 주소 이전(현재: <strong>{indiv.address}</strong>), 상호 변경 등 모든 변경사항은{" "}
                <strong>국세청 홈택스 [사업자등록 정정(개인)]</strong> 신청만으로 즉시 완결됩니다.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSubTab("VAULT");
                  setEntityFilter("INDIVIDUAL");
                }}
                className="px-3 py-1.5 rounded bg-[#b45309] hover:bg-[#92400e] text-white font-bold flex items-center gap-1.5 whitespace-nowrap"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>개인사업장 중요문서 보관함 보기 ({indivDocCount}종)</span>
              </button>
            </div>
          </div>

          {/* 법인 vs 개인사업장 핵심 차이점 비교표 */}
          <div className="bg-[#f4efe4] border border-[#b5a894] rounded overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] font-extrabold text-xs">
              법인사업장 vs 개인사업장 변경 행정절차 1:1 비교
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#dcd4c4] font-bold border-b border-[#b5a894]">
                  <tr>
                    <th className="py-2 px-3 whitespace-nowrap">업무 구분</th>
                    <th className="py-2 px-3 whitespace-nowrap text-[#1e40af]">
                      법인사업장 — 주식회사 드래곤알피에이 ({corp.bizNum})
                    </th>
                    <th className="py-2 px-3 whitespace-nowrap text-[#92400e]">
                      개인사업장 — 드래곤알피에이 ({indiv.bizNum})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c4b6a0]">
                  <tr>
                    <td className="py-2 px-3 font-bold whitespace-nowrap">사업목적(업종) 추가·변경</td>
                    <td className="py-2 px-3">
                      1인 주주서면결의서 + 정관 개정 ➔ 인터넷등기소 변경등기(14일 이내, 약 5만원) ➔ 홈택스 사업자등록 정정(법인)
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#047857]">
                      등기·정관 불필요 ➔ 홈택스 [사업자등록 정정(개인)]에서 주업종/부업종 즉시 추가 (수수료 ₩0)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold whitespace-nowrap">사업장 소재지(주소) 이전</td>
                    <td className="py-2 px-3">
                      본점 이전 결의 ➔ 등기소 본점이전 변경등기 ➔ 홈택스 사업자등록 정정(법인)
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#047857]">
                      홈택스 [사업자등록 정정(개인)] 주소 변경 신청 (자가/주민등록지 이전 시 임대차계약서 생략 가능, 현재: {indiv.address})
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold whitespace-nowrap">자본금 / 지분 구조</td>
                    <td className="py-2 px-3">
                      납입자본금 ₩5,000,000 (1주 ₩500 × 10,000주) / 증자·감자 시 변경등기 필수
                    </td>
                    <td className="py-2 px-3">
                      법정 자본금 및 주식 개념 없음 (대표자 개인 출자금·인출금으로 회계 처리)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold whitespace-nowrap">필수 보관 중요문서</td>
                    <td className="py-2 px-3">
                      정관, 등기사항전부증명서, 주주서면결의서, 주주명부, 법인 사업자등록증, 통장사본, 중소기업/SW사업자 확인서
                    </td>
                    <td className="py-2 px-3">
                      개인 사업자등록증, 사업자등록증명, 사업용 통장사본(140-129404-04-018), 중소기업 확인서, SW사업자 확인서
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 개인사업장 3대 핵심 운영 절차 카드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2">
              <div className="font-extrabold text-sm text-[#92400e] border-b border-[#c4b6a0] pb-1.5">
                절차 1. 개인사업장 주소 이전 및 정정신고
              </div>
              <ul className="list-disc list-inside text-[#334155] space-y-1 text-[11px]">
                <li>
                  <strong>현재 등록 주소</strong>: <code>{indiv.address}</code>
                </li>
                <li>
                  <strong>신청 경로</strong>: 국세청 홈택스 → [국세증명·사업자등록·세금관련 신청/신고] → [사업자등록 신청·정정·휴폐업] → <strong>[사업자등록 정정(개인)]</strong>
                </li>
                <li>
                  <strong>첨부 서류</strong>: 타인 소유 사업장 임차 시 임대차계약서 사본 1부 (본인 소유 주택/아파트 사업장인 경우 별도 임대차계약서 없이 등기부 조회로 즉시 승인).
                </li>
                <li>
                  <strong>사후 조치</strong>: 정정된 사업자등록증 PDF 발급 후 아래 버튼으로 ERP 버전 히스토리에 등록 및 세금계산서 공급자 주소 동기화.
                </li>
              </ul>
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("IND-DOC-BIZ-CERT")}
                  className="px-2.5 py-1 rounded bg-[#b45309] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>[개인] 사업자등록증 열람</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("IND-DOC-BIZ-CERT", true)}
                  className="px-2.5 py-1 rounded bg-[#047857] text-white font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>정정본 업로드</span>
                </button>
              </div>
            </div>

            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2">
              <div className="font-extrabold text-sm text-[#92400e] border-b border-[#c4b6a0] pb-1.5">
                절차 2. 개인사업장 업태·종목(업종) 추가·변경
              </div>
              <ul className="list-disc list-inside text-[#334155] space-y-1 text-[11px]">
                <li>
                  <strong>정관 변경 불필요</strong>: 법인과 달리 정관이나 등기 절차가 없으므로 홈택스에서 업종코드만 추가하면 당일~익일 내 정정 완료됩니다.
                </li>
                <li>
                  <strong>신청 방법</strong>: 홈택스 [사업자등록 정정(개인)] → [업종 정정] 체크 → 업종코드 검색 후 부업종 추가 또는 주업종 변경 제출.
                </li>
                <li>
                  <strong>인허가 업종 주의</strong>: 통신판매업 등 신고/인허가 업종 추가 시 정부24에서 통신판매업 신고증 발급 및 관할 구청 등록면허세 납부 병행.
                </li>
              </ul>
              <div className="pt-1 flex items-center gap-2">
                <a
                  href="https://www.hometax.go.kr"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-[#334155] text-white font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>홈택스 사업자등록 정정 바로가기</span>
                </a>
              </div>
            </div>

            <div className="bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 space-y-2">
              <div className="font-extrabold text-sm text-[#92400e] border-b border-[#c4b6a0] pb-1.5">
                절차 3. 개인사업장 필수 인증서류 갱신 관리
              </div>
              <ul className="list-disc list-inside text-[#334155] space-y-1 text-[11px]">
                <li>
                  <strong>사업용 계좌 (홈택스 신고 필수)</strong>: IBK기업은행 <code>{indiv.bankAccountNo}</code> 통장사본 보관.
                </li>
                <li>
                  <strong>중소기업(소상공인) 확인서</strong>: 매년 종합소득세 확정신고 후 중소기업현황정보시스템(sminfo.mss.go.kr)에서 유효기간 갱신 발급 후 ERP에 버전 추가.
                </li>
                <li>
                  <strong>소프트웨어사업자 확인서</strong>: SW산업정보종합시스템(swit.or.kr)에서 결산 재무제표 반영 후 발급 및 ERP 버전 추가.
                </li>
              </ul>
              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("IND-DOC-BANK-BOOK")}
                  className="px-2 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>[개인] 통장사본</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("IND-DOC-SME-CERT")}
                  className="px-2 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>[개인] 중소기업확인서</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("IND-DOC-SW-BIZ-CERT")}
                  className="px-2 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>[개인] SW사업자확인서</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: 정관변경 서식 작성·인쇄 스튜디오 (TEMPLATE_STUDIO)
         ===================================================================== */}
      {subTab === "TEMPLATE_STUDIO" && (
        <div className="flex-1 md:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 p-2.5 md:p-3 text-xs">
          {/* 좌측 입력 패널 (5컬럼) */}
          <div className="lg:col-span-5 bg-[#f4efe4] border border-[#b5a894] rounded p-3.5 flex flex-col gap-3 overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-[#c4b6a0] pb-2">
              <span className="font-extrabold text-sm text-[#6d28d9] dark:text-purple-400">
                주주명세서 및 1인 법인 정관변경·등기 서식 생성기
              </span>
              <span className="text-[11px] font-mono text-[#475569]">
                도장 제거 (출력 후 날인)
              </span>
            </div>

            {/* 서식 종류 선택 (4종) */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[#334155]">생성할 표준 서식 선택</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTplType("SHAREHOLDER_STATEMENT")}
                  className={`py-2 px-2 rounded border font-bold text-center whitespace-nowrap transition ${
                    tplType === "SHAREHOLDER_STATEMENT"
                      ? "bg-[#6d28d9] text-white border-[#5b21b6]"
                      : "bg-[#ebe5d8] text-[#0f172a] border-[#b5a894]"
                  }`}
                >
                  ① 주주명세서 (표준표)
                </button>
                <button
                  type="button"
                  onClick={() => setTplType("RESOLUTION")}
                  className={`py-2 px-2 rounded border font-bold text-center whitespace-nowrap transition ${
                    tplType === "RESOLUTION"
                      ? "bg-[#6d28d9] text-white border-[#5b21b6]"
                      : "bg-[#ebe5d8] text-[#0f172a] border-[#b5a894]"
                  }`}
                >
                  ② 주주서면결의서
                </button>
                <button
                  type="button"
                  onClick={() => setTplType("COMPARE_TABLE")}
                  className={`py-2 px-2 rounded border font-bold text-center whitespace-nowrap transition ${
                    tplType === "COMPARE_TABLE"
                      ? "bg-[#6d28d9] text-white border-[#5b21b6]"
                      : "bg-[#ebe5d8] text-[#0f172a] border-[#b5a894]"
                  }`}
                >
                  ③ 신·구조문대비표
                </button>
                <button
                  type="button"
                  onClick={() => setTplType("SHAREHOLDER_LIST")}
                  className={`py-2 px-2 rounded border font-bold text-center whitespace-nowrap transition ${
                    tplType === "SHAREHOLDER_LIST"
                      ? "bg-[#6d28d9] text-white border-[#5b21b6]"
                      : "bg-[#ebe5d8] text-[#0f172a] border-[#b5a894]"
                  }`}
                >
                  ④ 등기용 주주명부
                </button>
              </div>
            </div>

            {tplType === "SHAREHOLDER_STATEMENT" ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">기준일자 표기 (좌상단)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={tplBaseDateText}
                        onChange={(e) => setTplBaseDateText(e.target.value)}
                        placeholder="2026년 09월 13일 현재"
                        className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold w-full"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const y = now.getFullYear();
                          const m = String(now.getMonth() + 1).padStart(2, "0");
                          const d = String(now.getDate()).padStart(2, "0");
                          setTplBaseDateText(`${y}년 ${m}월 ${d}일 현재`);
                        }}
                        className="px-2 py-1.5 rounded bg-[#334155] text-white font-bold whitespace-nowrap shrink-0"
                      >
                        오늘
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">하단 공란 행 수 (A4 1장 맞춤)</label>
                    <select
                      value={tplBlankRowsCount}
                      onChange={(e) => setTplBlankRowsCount(Number(e.target.value))}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                    >
                      <option value={5}>공란 5행</option>
                      <option value={6}>공란 6행</option>
                      <option value={7}>공란 7행 (원본 PDF 동일 규격)</option>
                      <option value={8}>공란 8행</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">① 성명 (회사명)</label>
                    <input
                      type="text"
                      value={tplShareholderName}
                      onChange={(e) => setTplShareholderName(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">② 주민등록번호</label>
                    <input
                      type="text"
                      value={tplShareholderRegNo}
                      onChange={(e) => setTplShareholderRegNo(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">③ 우편번호</label>
                    <input
                      type="text"
                      value={tplShareholderZip}
                      onChange={(e) => setTplShareholderZip(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="font-bold text-[#334155]">④ 전화번호 (휴대전화)</label>
                    <input
                      type="text"
                      value={tplShareholderPhone}
                      onChange={(e) => setTplShareholderPhone(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155]">③ 주소 (도로명 및 동·호수)</label>
                  <input
                    type="text"
                    value={tplShareholderAddr}
                    onChange={(e) => setTplShareholderAddr(e.target.value)}
                    className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">⑤ 주식수</label>
                    <input
                      type="text"
                      value={tplShareholderShares}
                      onChange={(e) => setTplShareholderShares(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2 py-1.5 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">⑥ 주당 액면가</label>
                    <input
                      type="text"
                      value={tplShareholderParValue}
                      onChange={(e) => setTplShareholderParValue(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2 py-1.5 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">⑦ 금액</label>
                    <input
                      type="text"
                      value={tplShareholderAmount}
                      onChange={(e) => setTplShareholderAmount(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2 py-1.5 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">⑧ 지분율(%)</label>
                    <input
                      type="text"
                      value={tplShareholderRatio}
                      onChange={(e) => setTplShareholderRatio(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2 py-1.5 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">⑨ 대주주와의 관계</label>
                    <input
                      type="text"
                      value={tplShareholderRel}
                      onChange={(e) => setTplShareholderRel(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">비고 (도장 제거 공란)</label>
                    <input
                      type="text"
                      value={tplShareholderNote}
                      onChange={(e) => setTplShareholderNote(e.target.value)}
                      placeholder="공란 유지 (출력 후 실물 인감 날인)"
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">결의(기준) 일자</label>
                    <input
                      type="date"
                      value={tplResolutionDate}
                      onChange={(e) => setTplResolutionDate(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">개정 정관 시행일 (부칙)</label>
                    <input
                      type="date"
                      value={tplEffectiveDate}
                      onChange={(e) => setTplEffectiveDate(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>

                {tplType === "RESOLUTION" && (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">결의 안건 제목</label>
                    <input
                      type="text"
                      value={tplAgendaTitle}
                      onChange={(e) => setTplAgendaTitle(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                    />
                  </div>
                )}

                {tplType === "COMPARE_TABLE" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-[#334155]">변경 조항</label>
                        <input
                          type="text"
                          value={tplArticleNo}
                          onChange={(e) => setTplArticleNo(e.target.value)}
                          className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-[#334155]">개정 사유</label>
                        <input
                          type="text"
                          value={tplReasonText}
                          onChange={(e) => setTplReasonText(e.target.value)}
                          className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-[#334155]">현행 정관 (변경 전)</label>
                      <textarea
                        rows={5}
                        value={tplBeforeText}
                        onChange={(e) => setTplBeforeText(e.target.value)}
                        className="bg-[#ebe5d8] border border-[#b5a894] rounded p-2 font-mono text-[11px]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-[#334155]">개정 정관 (변경 후)</label>
                      <textarea
                        rows={5}
                        value={tplAfterText}
                        onChange={(e) => setTplAfterText(e.target.value)}
                        className="bg-[#ebe5d8] border border-[#b5a894] rounded p-2 font-mono text-[11px]"
                      />
                    </div>
                  </>
                )}

                {tplType === "SHAREHOLDER_LIST" && (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#334155]">1인 주주(이정용) 주소</label>
                    <input
                      type="text"
                      value={tplShareholderAddr}
                      onChange={(e) => setTplShareholderAddr(e.target.value)}
                      className="bg-[#ebe5d8] border border-[#b5a894] rounded px-2.5 py-1.5 font-semibold"
                    />
                  </div>
                )}
              </>
            )}

            <div className="p-2.5 rounded bg-[#ebe5d8] border border-[#b5a894] space-y-1 text-[11px] text-[#334155]">
              <div className="font-bold text-[#0f172a]">인쇄·날인 후 보관함 등록 안내</div>
              <p>
                도장 이미지는 모두 제거되어 공란으로 출력됩니다. 우측 상단 <strong>[A4 1장 인쇄 / PDF 저장]</strong>을 클릭하여 출력 후 실물 인감을 날인하고, 스캔본을 아래 버튼으로 버전 히스토리에 등록하십시오.
              </p>
              <div className="pt-1 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-SHAREHOLDER-LIST", true)}
                  className="px-2 py-1 rounded bg-[#047857] text-white font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>주주명세서(주주명부) 버전 등록</span>
                </button>
                <button
                  type="button"
                  onClick={() => jumpToDocumentByCode("CORP-DOC-SHAREHOLDER-RES", true)}
                  className="px-2 py-1 rounded bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>주주서면결의서 버전 등록</span>
                </button>
                <a
                  href="/shareholder-registry"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded bg-[#334155] text-white font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>전용 풀스크린 발급기 열기 ↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* 우측 실시간 서식 원문 프리뷰 및 인쇄/복사 (7컬럼) */}
          <div className="lg:col-span-7 bg-[#ebe5d8] border border-[#b5a894] rounded flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="px-3 py-2 bg-[#e2dbcd] border-b border-[#b5a894] flex items-center justify-between">
              <span className="font-extrabold text-xs">
                {tplType === "SHAREHOLDER_STATEMENT"
                  ? "주주명세서 A4 정밀 양식 미리보기 (도장 제거됨)"
                  : `서식 미리보기 (${corp.corpName} 제원 자동 반영)`}
              </span>
              <div className="flex items-center gap-2">
                {tplType !== "SHAREHOLDER_STATEMENT" && (
                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className="px-2.5 py-1 rounded bg-[#334155] hover:bg-[#1e293b] text-white font-bold inline-flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>텍스트 복사</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrintTemplate}
                  className="px-3 py-1 rounded bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold inline-flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>A4 1장 인쇄 / PDF 저장</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 bg-[#faf7f0] dark:bg-slate-950 overflow-auto flex justify-center">
              {tplType === "SHAREHOLDER_STATEMENT" ? (
                <div
                  className="w-full max-w-[740px] bg-white text-black p-5 border border-slate-300 shadow-sm"
                  style={{
                    fontFamily:
                      "'Malgun Gothic', '맑은 고딕', 'Dotum', '돋움', sans-serif",
                  }}
                >
                  {/* 상단 타이틀 테이블 */}
                  <table
                    className="w-full border-collapse mb-1.5"
                    style={{ border: "1.5px solid #000", tableLayout: "fixed" }}
                  >
                    <tbody>
                      <tr>
                        <td
                          className="text-center font-bold text-[12px] align-middle"
                          style={{
                            width: "28%",
                            padding: "8px 4px",
                            border: "1.5px solid #000",
                          }}
                        >
                          {tplBaseDateText}
                        </td>
                        <td
                          className="text-center font-extrabold text-[22px] align-middle"
                          style={{
                            width: "44%",
                            padding: "8px 0",
                            letterSpacing: "10px",
                            textIndent: "10px",
                            border: "1.5px solid #000",
                          }}
                        >
                          주주명세서
                        </td>
                        <td
                          className="p-0"
                          style={{ width: "28%", border: "1.5px solid #000" }}
                        >
                          <table
                            className="w-full border-collapse"
                            style={{ tableLayout: "fixed" }}
                          >
                            <tbody>
                              <tr>
                                <td
                                  className="text-center font-bold text-[11px] py-1"
                                  style={{ borderBottom: "1px solid #000" }}
                                >
                                  회 사 명
                                </td>
                              </tr>
                              <tr>
                                <td className="text-center font-bold text-[12px] py-1.5">
                                  {corp.corpName}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* 본문 주주명세서 테이블 */}
                  <table
                    className="w-full border-collapse text-[11px]"
                    style={{ border: "1.5px solid #000", tableLayout: "fixed" }}
                  >
                    <colgroup>
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "19%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "4%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th
                          className="text-center font-semibold py-1"
                          style={{ border: "1px solid #000" }}
                        >
                          ①성 명
                          <br />
                          (회사명)
                        </th>
                        <th
                          className="text-center font-semibold py-1"
                          style={{ border: "1px solid #000" }}
                        >
                          ②주민등록번호
                          <br />
                          (법인등록번호)
                        </th>
                        <th
                          rowSpan={2}
                          className="text-center font-semibold py-1 align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          ④전화번호
                          <br />
                          (휴대전화)
                        </th>
                        <th
                          colSpan={4}
                          className="text-center font-semibold py-0.5"
                          style={{ border: "1px solid #000" }}
                        >
                          지분 또는 출자관계
                        </th>
                        <th
                          rowSpan={2}
                          className="text-center font-semibold py-1 align-middle leading-tight text-[10px]"
                          style={{ border: "1px solid #000" }}
                        >
                          ⑨
                          <br />
                          대주주
                          <br />
                          와의
                          <br />
                          관계
                        </th>
                        <th
                          rowSpan={2}
                          className="text-center font-semibold py-1 align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          비
                          <br />고
                        </th>
                      </tr>
                      <tr>
                        <th
                          colSpan={2}
                          className="text-center font-semibold py-0.5"
                          style={{ border: "1px solid #000" }}
                        >
                          ③주 소
                        </th>
                        <th
                          className="text-center font-semibold py-0.5"
                          style={{ border: "1px solid #000" }}
                        >
                          ⑤ 주식수
                        </th>
                        <th
                          className="text-center font-semibold py-0.5 leading-tight text-[10px]"
                          style={{ border: "1px solid #000" }}
                        >
                          ⑥ 주당
                          <br />
                          액면가액
                        </th>
                        <th
                          className="text-center font-semibold py-0.5"
                          style={{ border: "1px solid #000" }}
                        >
                          ⑦ 금 액
                        </th>
                        <th
                          className="text-center font-semibold py-0.5 leading-tight text-[10px]"
                          style={{ border: "1px solid #000" }}
                        >
                          ⑧지분율
                          <br />
                          (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ height: "24px" }}>
                        <td
                          className="text-center font-medium"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderName}
                        </td>
                        <td
                          className="text-center font-mono"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderRegNo}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-center font-mono align-middle leading-tight"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderPhone.includes("-") ? (
                            <>
                              {tplShareholderPhone.split("-").slice(0, 2).join("-")}
                              <br />-{tplShareholderPhone.split("-")[2]}
                            </>
                          ) : (
                            tplShareholderPhone
                          )}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-right pr-1.5 font-mono align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderShares}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-right pr-1.5 align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderParValue}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-right pr-1.5 font-mono align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderAmount}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-center font-mono align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderRatio}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-center align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderRel}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-center align-middle"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderNote}
                        </td>
                      </tr>
                      <tr style={{ height: "38px" }}>
                        <td
                          colSpan={2}
                          className="px-1.5 py-0.5 align-top text-[10.5px] leading-tight"
                          style={{ border: "1px solid #000" }}
                        >
                          {tplShareholderZip && (
                            <div className="font-mono text-[10px]">{tplShareholderZip}</div>
                          )}
                          <div>{tplShareholderAddr}</div>
                        </td>
                      </tr>
                      {Array.from({ length: tplBlankRowsCount }).map((_, idx) => (
                        <React.Fragment key={idx}>
                          <tr style={{ height: "22px" }}>
                            <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                            <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                            <td rowSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                          </tr>
                          <tr style={{ height: "32px" }}>
                            <td colSpan={2} style={{ border: "1px solid #000" }}>
                              &nbsp;
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <pre className="w-full font-mono text-xs leading-relaxed whitespace-pre-wrap text-[#0f172a] dark:text-slate-100">
                  {generatedTemplateText}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          모달: 신규 문서 / 개정 버전 업로드
         ===================================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#ebe5d8] dark:bg-slate-900 border-2 border-[#b5a894] dark:border-slate-700 rounded-lg shadow-xl w-full max-w-md overflow-hidden text-xs">
            <div className="px-4 py-3 bg-[#e2dbcd] dark:bg-slate-950 border-b border-[#b5a894] dark:border-slate-800 flex items-center justify-between font-bold">
              <span>
                {uploadTargetDoc
                  ? `[${uploadTargetDoc.title}] 신규 개정 버전(v${uploadTargetDoc.currentVersion + 1}.0) 업로드`
                  : "신규 중요문서 마스터 등록"}
              </span>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded hover:bg-black/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155] dark:text-slate-300">사업장 구분</label>
                  <select
                    value={formEntityType}
                    onChange={(e) => setFormEntityType(e.target.value as "CORP" | "INDIVIDUAL")}
                    disabled={Boolean(uploadTargetDoc)}
                    className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-semibold"
                  >
                    <option value="CORP">법인사업장 ((주)드래곤알피에이)</option>
                    <option value="INDIVIDUAL">개인사업장 (드래곤알피에이)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155] dark:text-slate-300">문서 분류</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-semibold"
                  >
                    {DOC_CATEGORIES.filter((c) => c !== "전체").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155] dark:text-slate-300">문서명</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="예: 정관, 주주서면결의서, 주주명부, 등기사항전부증명서"
                  required
                  className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155] dark:text-slate-300">문서 설명</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="문서 개요 또는 관리 목적"
                  className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155] dark:text-slate-300">
                    시행일 / 발급일
                  </label>
                  <input
                    type="date"
                    value={formEffectiveDate}
                    onChange={(e) => setFormEffectiveDate(e.target.value)}
                    className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#334155] dark:text-slate-300">부여 버전</label>
                  <input
                    type="text"
                    readOnly
                    value={
                      uploadTargetDoc
                        ? `v${uploadTargetDoc.currentVersion + 1}.0`
                        : "v1.0"
                    }
                    className="bg-[#dcd4c4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155] dark:text-slate-300">
                  제·개정 사유 및 버전 메모
                </label>
                <input
                  type="text"
                  value={formChangeNote}
                  onChange={(e) => setFormChangeNote(e.target.value)}
                  placeholder="예: 2026.09.14 사업목적 추가에 따른 정관 개정본"
                  className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#334155] dark:text-slate-300">
                  파일 선택 (PDF, DOCX, XLSX, 이미지 등)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                  required
                  className="bg-[#f4efe4] dark:bg-slate-800 border border-[#b5a894] dark:border-slate-700 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded border border-[#b5a894] bg-[#dcd4c4] font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold disabled:opacity-50"
                >
                  {submitting ? "업로드 중..." : "버전 등록 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
