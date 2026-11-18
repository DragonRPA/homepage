export interface DocVersionItem {
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

export interface CorporateDocItem {
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

export interface CorporateDocumentTabProps {
  currentUser?: any;
  selectedEntity?: "ALL" | "CORP" | "INDIVIDUAL";
}

export const DOC_CATEGORIES = [
  "전체",
  "정관·등기·의사록",
  "주주·주식·자본",
  "세무·공과·인증",
  "부동산·임대차",
  "기타 중요문서",
  "법인설립 원시서류 (보존용)",
];

export type MainSubTab = "VAULT" | "CORP_MANUAL" | "INDIV_MANUAL" | "TEMPLATE_STUDIO";

export type CorporateTemplateType =
  | "SHAREHOLDER_STATEMENT"
  | "RESOLUTION"
  | "COMPARE_TABLE"
  | "SHAREHOLDER_LIST";

export interface TemplateStudioState {
  tplType: CorporateTemplateType;
  tplBaseDateText: string;
  tplShareholderName: string;
  tplShareholderRegNo: string;
  tplShareholderZip: string;
  tplShareholderPhone: string;
  tplShareholderShares: string;
  tplShareholderParValue: string;
  tplShareholderAmount: string;
  tplShareholderRatio: string;
  tplShareholderRel: string;
  tplShareholderNote: string;
  tplBlankRowsCount: number;
  tplResolutionDate: string;
  tplResolutionDateKor: string;
  tplEffectiveDate: string;
  tplAgendaTitle: string;
  tplAgendaBody: string;
  tplCompareTableTitle: string;
  tplArticleNo: string;
  tplBeforeText: string;
  tplAfterText: string;
  tplReasonText: string;
  tplShareholderAddr: string;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
