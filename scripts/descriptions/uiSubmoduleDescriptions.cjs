"use strict";

/**
 * L4 도메인 하위 패널·모달·타입·훅 계층 기능 명세 사전
 */
const UI_SUBMODULE_DESCRIPTIONS = {
  // =========================================================================
  // L4_UI_SUBMODULES (51 + Phase B additions)
  // =========================================================================
  "src/app/erp/components/assets/AssetAcquireModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "ASSET",
    counterpart: "src/app/erp/components/AssetManagementTab.tsx",
    description:
      "신규 자산 취득 등록 모달로 자산번호 일괄 채번 구간 미리보기, 매핑 제품 모델 선택, 원가·내용연수·보증정보·부착옵션 입력 폼을 제공한다.",
  },
  "src/app/erp/components/assets/AssetDepreciationLedgerView.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "ASSET",
    counterpart: "src/app/erp/components/AssetManagementTab.tsx",
    description:
      "렌탈 매출세금계산서 4대 매출 유형 분리 카드, 월별 자산 가치·매출·순수익 정산표, 모델별 명세표 및 모델별 월별 매트릭스를 렌더링한다.",
  },
  "src/app/erp/components/assets/AssetDossierDrawer.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "ASSET",
    counterpart: "src/app/erp/components/AssetManagementTab.tsx",
    description:
      "선택 자산의 상태·소유·가동시간·보증·부착옵션 조회 및 수정, 정액법 감가상각 대차대조 지표 표시, 생애주기 감사 이력 조회·기록을 처리한다.",
  },
  "src/app/erp/components/assets/AssetSummaryAndDetailTables.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "ASSET",
    counterpart: "src/app/erp/components/AssetManagementTab.tsx",
    description:
      "모델별 수량·취득원가·감가상각·장부가액·매출·원가회수율 요약 테이블(AssetSummaryTable)과 개별 자산 정렬·상세선택·삭제 상세 테이블(AssetDetailTable)을 제공한다.",
  },
  "src/app/erp/components/assets/assetTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "ASSET",
    counterpart: "src/app/erp/components/AssetManagementTab.tsx",
    description:
      "자산 레코드·이력·모델 요약·KPI·취득 폼 타입을 정의하고 DR+yymm+순번 자산번호 채번 함수(computeNextAssetNo), 구간 미리보기, CSV 내보내기 함수를 제공한다.",
  },
  "src/app/erp/components/bank-matching/BankLedgerGridAndSummary.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "BANK_MATCHING",
    counterpart: "src/app/erp/components/BankMatchingTab.tsx",
    description:
      "은행 입출금 모바일 카드 대장, PC 고밀도 정렬 테이블(대사 조치 컬럼 좌측 고정) 및 우하단 입금액·출금액·대사건수 대차대조 합계 검증 바를 렌더링한다.",
  },
  "src/app/erp/components/bank-matching/BankMatchModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "BANK_MATCHING",
    counterpart: "src/app/erp/components/BankMatchingTab.tsx",
    description:
      "통장 거래 건의 표준 계정과목 지정 대사 탭과 미결 매출·매입 세금계산서 복수 선택·부분정산·차액 종결 사유 기반 완납 연결 탭을 제공한다.",
  },
  "src/app/erp/components/bank-matching/BankUploadModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "BANK_MATCHING",
    counterpart: "src/app/erp/components/BankMatchingTab.tsx",
    description:
      "계좌별 최종 거래일시 현황 표시, 법인·개인 귀속 계좌 선택, 입출금내역 파일 복수 업로드 및 텍스트 붙여넣기 DB 저장 결과 표시 모달을 제공한다.",
  },
  "src/app/erp/components/bank-matching/ManualTransactionModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "BANK_MATCHING",
    counterpart: "src/app/erp/components/BankMatchingTab.tsx",
    description:
      "법인·개인 계좌 선택, 거래일시, 입출금 구분, 거래금액, 거래후 잔액, 거래내용, 상대은행·예금주, 메모를 입력해 은행 거래내역을 수동 등록하는 모달이다.",
  },
  "src/app/erp/components/bank-matching/bankMatchingTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "BANK_MATCHING",
    counterpart: "src/app/erp/components/BankMatchingTab.tsx",
    description:
      "통장 거래내역(BankTransaction), 계좌 현황(AccountStatusItem), 입출금 요약(BankSummary), 수동등록 폼 및 업로드 결과 타입을 정의한다.",
  },
  "src/app/erp/components/corporate-docs/CorporateDocVaultSubTab.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CORPORATE_DOCS",
    counterpart: "src/app/erp/components/CorporateDocumentTab.tsx",
    description:
      "법인 중요문서 보관함 서브탭으로 사업장·분류·검색 필터, 7컬럼 정렬 마스터 목록, 버전 이력 타임라인·순번재정렬·수정·삭제 및 PDF 미리보기 패널을 제공한다.",
  },
  "src/app/erp/components/corporate-docs/EntityManualSubTabs.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CORPORATE_DOCS",
    counterpart: "src/app/erp/components/CorporateDocumentTab.tsx",
    description:
      "법인 정관변경·전자등기 5단계 절차 안내 서브탭(CorpManualSubTab)과 개인사업장 운영 절차·법인 대비표 서브탭(IndivManualSubTab) 및 문서함 이동 버튼을 제공한다.",
  },
  "src/app/erp/components/corporate-docs/TemplateStudioPreviewSheet.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CORPORATE_DOCS",
    counterpart: "src/app/erp/components/corporate-docs/TemplateStudioSubTab.tsx",
    description:
      "주주명세서·주주서면결의서·신구조문대비표·등기용 주주명부 4종 서식의 우측 A4 미리보기 시트와 텍스트 복사·인쇄 액션 헤더를 렌더링한다.",
  },
  "src/app/erp/components/corporate-docs/TemplateStudioSubTab.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CORPORATE_DOCS",
    counterpart: "src/app/erp/components/CorporateDocumentTab.tsx",
    description:
      "주주명세서·주주서면결의서·신구조문대비표·등기용 주주명부 4종 서식 선택·좌측 제원 입력 패널을 제공하고 TemplateStudioPreviewSheet로 미리보기를 연계한다.",
  },
  "src/app/erp/components/corporate-docs/UploadDocModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CORPORATE_DOCS",
    counterpart: "src/app/erp/components/CorporateDocumentTab.tsx",
    description:
      "사업장 구분·문서 분류·문서명·시행일·버전·개정 사유와 파일을 입력받아 신규 중요문서 마스터를 등록하거나 기존 문서의 신규 개정 버전을 업로드한다.",
  },
  "src/app/erp/components/corporate-docs/corporateDocTemplates.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CORPORATE_DOCS",
    counterpart: "src/app/erp/components/CorporateDocumentTab.tsx",
    description:
      "법인 제원과 입력 상태로 주주서면결의서·신구조문대비표·주주명부 텍스트를 생성(buildGeneratedTemplateText)하고 4종 A4 인쇄 팝업을 출력(printCorporateTemplate)한다.",
  },
  "src/app/erp/components/corporate-docs/corporateDocTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CORPORATE_DOCS",
    counterpart: "src/app/erp/components/CorporateDocumentTab.tsx",
    description:
      "법인 중요문서 및 버전 타입, 문서 카테고리 상수(DOC_CATEGORIES), 서식 스튜디오 상태 타입(TemplateStudioState) 및 바이트 단위 변환 함수(formatBytes)를 정의한다.",
  },
  "src/app/erp/components/employment-contracts/ContractDocumentPreviewPanel.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "EMPLOYMENT_CONTRACT",
    counterpart: "src/app/erp/components/EmploymentContractTab.tsx",
    description:
      "표준 근로계약서·정보보호서약서 A4 양식 렌더링과 등록된 계약서·서약서 스캔본(PDF·이미지) 미리보기, 다운로드, 파일 업로드 트리거 및 A4 출력 기능을 제공한다.",
  },
  "src/app/erp/components/employment-contracts/EmploymentContractFormAndListPanel.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "EMPLOYMENT_CONTRACT",
    counterpart: "src/app/erp/components/EmploymentContractTab.tsx",
    description:
      "연도별 근로계약서·보안서약서 보관 대장 테이블(정렬·초성검색 지원)과 8행 계약·서약서·임금 상세 입력 폼 및 사원 마스터 동기화 옵션을 렌더링한다.",
  },
  "src/app/erp/components/employment-contracts/employmentContractTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "EMPLOYMENT_CONTRACT",
    counterpart: "src/app/erp/components/EmploymentContractTab.tsx",
    description:
      "근로계약서·임직원 옵션·폼 상태·우측 뷰 모드 타입과 계약 유형 배지 상수(CONTRACT_TYPE_LABELS), 연월일 분리 함수(formatKoreanDateParts)를 정의한다.",
  },
  "src/app/erp/components/expenses/ExpenseCreateAndPreviewModals.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "EXPENSE_RECEIPT",
    counterpart: "src/app/erp/components/ExpenseReceiptTab.tsx",
    description:
      "AI 영수증 스캔 자동입력 경비 등록 모달과 /api/erp/vault 기반 PDF·이미지 증빙 미리보기 모달(ExpenseCreateAndPreviewModals)을 지연 로딩 단위로 제공한다.",
  },
  "src/app/erp/components/financial-report/AccountingStandardModals.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "FINANCIAL_REPORT",
    counterpart: "src/app/erp/components/FinancialReportTab.tsx",
    description:
      "계정과목별 준용 중소기업회계기준 요약·조문 원문·해설 지침을 표시하는 회계기준 모달과 6대 영역 부합성 검증 총괄 보고서 모달을 렌더링한다.",
  },
  "src/app/erp/components/financial-report/FinancialDetailLedgerSection.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "FINANCIAL_REPORT",
    counterpart: "src/app/erp/components/FinancialReportTab.tsx",
    description:
      "계정대분류·월·세목 필터와 검색을 지원하며 모바일 전표 카드 목록 및 PC 정렬 상세 전표 테이블을 렌더링하고 더블클릭 시 회계기준 모달을 호출한다.",
  },
  "src/app/erp/components/financial-report/FinancialStatementsBoard.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "FINANCIAL_REPORT",
    counterpart: "src/app/erp/components/FinancialReportTab.tsx",
    description:
      "재무상태표(BS)·손익계산서(PL)·현금흐름표(CF) 보드, 매출채권·매입채무 미결 내역 팝오버, 연도별 주석 및 세무 4대 항목 입력·저장 UI를 제공한다.",
  },
  "src/app/erp/components/financial-report/MonthlyAccountMatrixSection.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "FINANCIAL_REPORT",
    counterpart: "src/app/erp/components/FinancialReportTab.tsx",
    description:
      "월별 계정과목 손익·수지 매트릭스(접기·드릴다운·회계기준 조회)와 월별 유형자산 가치 변동 및 감가상각 명세표를 렌더링한다.",
  },
  "src/app/erp/components/financial-report/financialReportTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "FINANCIAL_REPORT",
    counterpart: "src/app/erp/components/FinancialReportTab.tsx",
    description:
      "재무제표(BS·PL·CF)·계정행·전표상세 타입, 대분류 스타일 상수(MAJOR_LABELS), 회계기수 라벨 포맷터 및 손익·주석 CSV 내보내기 함수를 정의한다.",
  },
  "src/app/erp/components/gov-support/GovSupportDossierPanel.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "GOV_SUPPORT",
    counterpart: "src/app/erp/components/GovSupportIntelTab.tsx",
    description:
      "선택된 정부지원·뉴스 항목의 제원 요약, 원문·요약 전환 뷰, Google AI Ultra 프롬프트 복사·연결, 자격요건·실행플랜·검토메모 편집 패널(GovSupportDossierPanel)을 제공한다.",
  },
  "src/app/erp/components/gov-support/GovSupportModals.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "GOV_SUPPORT",
    counterpart: "src/app/erp/components/GovSupportIntelTab.tsx",
    description:
      "수집 원문 전체보기 리더 모달, Gemini API 키·기업 프로필 설정 모달 및 정부지원·뉴스 수동 등록 모달을 지연 로딩 단위로 제공한다.",
  },
  "src/app/erp/components/gov-support/govSupportTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "GOV_SUPPORT",
    counterpart: "src/app/erp/components/GovSupportIntelTab.tsx",
    description:
      "정부지원·조달·뉴스 항목(GovSupportItem), AI 연동 설정(AiIntelSettings), 수동 등록 폼 타입, 분류·진행상태 배지 메타 및 탐색 프리셋 상수를 정의한다.",
  },
  "src/app/erp/components/obsidian/ObsidianSyncAndErrorModals.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "OBSIDIAN_VAULT",
    counterpart: "src/app/erp/components/ObsidianVaultTab.tsx",
    description:
      "옵시디언 노트 오류 안내 모달 및 로컬 폴더·Cloudflare R2 Remotely Save 연동 설정 가이드 모달(ObsidianSyncAndErrorModals)을 지연 로딩 단위로 제공한다.",
  },
  "src/app/erp/components/obsidian/obsidianMarkdownPreview.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "OBSIDIAN_VAULT",
    counterpart: "src/app/erp/components/ObsidianVaultTab.tsx",
    description:
      "옵시디언 노트 레코드 인터페이스(ObsidianNoteRecord), 일시 포맷터 및 위키링크·콜아웃·마크다운 JSX 렌더러(renderObsidianPreview)를 제공한다.",
  },
  "src/app/erp/components/organization/OrgActionModalsAndAuditBar.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "ORG",
    counterpart: "src/app/erp/components/OrganizationTab.tsx",
    description:
      "임직원 퇴사·업무이관 확인 모달, 부서 삭제 확인 모달, 오류 안내 모달, 알림 토스트 및 하단 Z-패턴 조직·인사 대차대조 검증 바를 렌더링한다.",
  },
  "src/app/erp/components/organization/OrgTreeAndMemberGrid.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "ORG",
    counterpart: "src/app/erp/components/OrganizationTab.tsx",
    description:
      "좌측 재귀 부서 트리, 미배정 인력풀 드롭존, 9대 보편 기능 칩 매핑 패널 및 드래그앤드롭 배속 지원 임직원 카드·리스트 그리드를 렌더링한다.",
  },
  "src/app/erp/components/organization/ProfileCompensationAndLeaveSection.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "ORG",
    counterpart: "src/app/erp/components/organization/SelectedProfilePanel.tsx",
    description:
      "선택 직원의 급여 수령 계좌(은행명·예금주·계좌번호), 월 급여(계약 기본급·통상임금·식대·차량보조금·합계) 및 4대보험 가입여부 일괄 토글 편집 섹션을 제공한다.",
  },
  "src/app/erp/components/organization/SelectedProfilePanel.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "ORG",
    counterpart: "src/app/erp/components/OrganizationTab.tsx",
    description:
      "선택 직원의 프로필 사진·로그인ID·비밀번호·재직상태·직급·직책(결재 티어)·역할·소속부서·입퇴사일 편집 및 ProfileCompensationAndLeaveSection 연계를 제공한다.",
  },
  "src/app/erp/components/organization/organizationTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "ORG",
    counterpart: "src/app/erp/components/OrganizationTab.tsx",
    description:
      "직급·직책 결재 티어 설정, 기능 속성(UNIVERSAL_FUNCTIONAL_ATTRIBUTES), 부서·사원 노드 타입, 유효 티어 판정(getUserEffectiveTier) 및 개인정보 마스킹 함수를 정의한다.",
  },
  "src/app/erp/components/organization/useOrganizationController.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "ORG",
    counterpart: "src/app/erp/components/OrganizationTab.tsx",
    description:
      "조직도·임직원 상태 조회(/api/erp/departments·employees), /api/erp/organization/batch 일괄 저장, 부서·직무 태그 CRUD, 드래그앤드롭 배속 및 퇴사·삭제 핸들러를 제어하는 전용 훅.",
  },
  "src/app/erp/components/outbound/OutboundBillingAndLogsPanel.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "OUTBOUND_REG",
    counterpart: "src/app/erp/components/OutboundRegTab.tsx",
    description:
      "출고등록 탭에서 조건부 동적 로딩되는 매출청구 집계 및 출고이력 패널(OutboundBillingAndLogsPanel)과 공용 타입(RentalAssetItem, BillingItem, InoutLogItem)·정렬 컨트롤(TableSortControl)을 제공한다.",
  },
  "src/app/erp/components/overtime/OtRequestModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "OT_MANAGE",
    counterpart: "src/app/erp/components/OtManagementTab.tsx",
    description:
      "24시간 시분 키보드 입력, 단축 시간 프리셋, 연장·야간·휴일 판별 및 수당 계산 명세를 포함하는 초과근무 신청 등록 모달(OtRequestModal)을 제공한다.",
  },
  "src/app/erp/components/partners/BankCopyOcrModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "통장사본 파일 드래그·업로드, AI OCR 계좌 정보(은행명·계좌번호·예금주·개설지점) 추출 결과 편집, 원본 미리보기 및 매입거래처 폼 자동 채우기 모달을 제공한다.",
  },
  "src/app/erp/components/partners/BizCertOcrModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "사업자등록증 파일 드래그·업로드, OCR 인식 결과(상호·사업자번호·대표자·업태·종목·주소·이메일) 편집, 국세청 휴폐업 상태 표시 및 거래처 등록 양식 반영 모달을 제공한다.",
  },
  "src/app/erp/components/partners/BizStatusBatchModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "거래처 범위(매출처·필터목록·전체) 선택과 휴·폐업 거래불가 자동적용 옵션으로 국세청 휴폐업 일괄조회를 실행하고 결과 KPI·정렬 테이블·정상 복원 조치를 제공한다.",
  },
  "src/app/erp/components/partners/ContactFormModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "거래처 담당자의 성명·부서·직책·연락처·이메일·대표담당자 여부·업무 메모와 명함 앞·뒷면 사진 업로드 및 이미지 확대 미리보기를 입력·수정하는 모달을 제공한다.",
  },
  "src/app/erp/components/partners/PartnerDocViewerModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "거래처 증빙(PDF·이미지)의 확대·축소·회전·파일 교체·새 탭 열기·인쇄·다운로드 뷰어를 제공하며 파트너 ID 존재 시 좌측 원본 대조 우측 거래처 정보 수정 스튜디오를 렌더링한다.",
  },
  "src/app/erp/components/partners/PartnerDossierPanel.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "선택 거래처의 정산 마감조건·사업자 제원·국세청 휴폐업 조회·수신 이메일 인라인 편집·사업자등록증/계약서/통장사본 보관함·담당자 및 명함 목록을 표시하는 상세 패널을 제공한다.",
  },
  "src/app/erp/components/partners/PartnerFormModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "거래처 신규 등록·수정 모달로 사업자등록증·통장사본 OCR 추출, 국세청 휴폐업 조회, 정산 마감일·계좌·계약서 파일 첨부 및 기본 제원 입력 폼을 제공한다.",
  },
  "src/app/erp/components/partners/PartnerListPanel.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "매출처·매입처·전체 거래처 목록 테이블과 계약서·등록증·통장사본 보관 요약 KPI, 증빙 열람 뱃지 버튼, 담당자 수 및 국세청·거래불가 상태 뱃지를 렌더링한다.",
  },
  "src/app/erp/components/partners/partnerFormHelpers.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "거래처·담당자·통장OCR·원본뷰어 폼 초기값 생성기, PUT 페이로드 빌더(buildPartnerPutPayload), OCR·국세청 상태 병합 및 PDF Blob 변환 순수 헬퍼를 제공한다.",
  },
  "src/app/erp/components/partners/partnerPdfUtils.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "pdf.js 기반 PDF 1페이지 이미지·텍스트 추출, 캔버스 이미지 리사이즈, 거래처 CSV 내보내기, 통장사본·사업자등록증 OCR 및 국세청 휴폐업 조회 API 호출 함수를 제공한다.",
  },
  "src/app/erp/components/partners/partnerTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "은행 목록 상수(KOREAN_BANKS), 문서 뷰어 상태(ActiveDocumentViewer), 거래처 담당자(PartnerContact), 거래처 마스터(Partner) 및 탭 Props 타입을 정의한다.",
  },
  "src/app/erp/components/partners/usePartnerDocAndNtsActions.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "거래처 증빙 온디맨드 로드·업로드·삭제, 사업자등록증·통장사본·계약서 OCR, 단건·일괄 국세청 휴폐업 조회 및 분할 뷰어 저장 액션 훅(usePartnerDocAndNtsActions)을 제공한다.",
  },
  "src/app/erp/components/payroll/PayrollEditAndOcrModals.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "PAYROLL",
    counterpart: "src/app/erp/components/PayrollTab.tsx",
    description:
      "급여대장 PDF 업로드 OCR 추출·대조 모달과 개인별 급여 항목 세부 편집·저장 모달(PayrollEditAndOcrModals)을 지연 로딩 단위로 제공한다.",
  },
  "src/app/erp/components/products/ProductDossierAndAddModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "PRODUCT",
    counterpart: "src/app/erp/components/ProductManagementTab.tsx",
    description:
      "제품 슬라이드오버 상세·연결 자산·ForkliftSpecEditor 제원 편집 패널과 신규 제품 모델 등록 모달(ProductDossierAndAddModal)을 지연 로딩 단위로 제공한다.",
  },
  "src/app/erp/components/rental-biz-dir/PortalGuideModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL_BIZ_DIR",
    counterpart: "src/app/erp/components/RentalBizDirectoryTab.tsx",
    description:
      "국토교통부·대한건설기계협회 시도별 사업자 현황표, 27개 기종별 등록현황표, 지자체 인허가 CSV 원부 다운로드 표 및 공식 원천기관 링크 4개 탭 모달을 제공한다.",
  },
  "src/app/erp/components/rental-biz-dir/RentalBizDetailPanel.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL_BIZ_DIR",
    counterpart: "src/app/erp/components/RentalBizDirectoryTab.tsx",
    description:
      "선택된 렌탈 사업자의 업종·OA공급유형·영업상태 변경, ERP 매출처·매입처 등록 연동, 사업자번호·원천·취급 브랜드·품목 상세 조회 및 제휴 메모 저장 패널을 제공한다.",
  },
  "src/app/erp/components/rental-biz-dir/RentalBizFormModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL_BIZ_DIR",
    counterpart: "src/app/erp/components/RentalBizDirectoryTab.tsx",
    description:
      "렌탈·판매 사업자의 업종 구분(FL·AWP·OA_PC), 상호, 사업자번호, 대표자, 권역, 연락처, 주소, 영업 형태, 취급 브랜드·품목, 홈페이지 등록 및 수정 모달을 제공한다.",
  },
  "src/app/erp/components/rental-biz-dir/RentalBizToolbarAndGrid.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL_BIZ_DIR",
    counterpart: "src/app/erp/components/RentalBizDirectoryTab.tsx",
    description:
      "렌탈 사업자 DB 상단 툴바, 업종·OA 공급 필터, AI·공식 게시판 발굴 바, 검색·외부 DB 조회 바 및 SortableTh 마스터 테이블 그리드를 렌더링한다.",
  },
  "src/app/erp/components/rental-biz-dir/rentalBizTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL_BIZ_DIR",
    counterpart: "src/app/erp/components/RentalBizDirectoryTab.tsx",
    description:
      "렌탈 사업자 레코드(RentalBizRecord)·폼 타입, 업종·OA공급·영업상태 메타 상수, 공식 포털 링크 목록 및 OA 공급유형 판별 함수(resolveOaSupplyType)를 정의한다.",
  },
  "src/app/erp/components/rental-maintenance/HoursWearAndVehicleStockTabs.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: "src/app/erp/components/RentalMaintenanceTab.tsx",
    description:
      "가동시간 기록·부품 열화율 설정 및 가동시간 이력을 관리하는 HoursWearSubTab과 정비차량·주기장 부품 재고·차량간 이동·이력을 관리하는 VehicleStockSubTab을 제공한다.",
  },
  "src/app/erp/components/rental-maintenance/MaintenanceActivitiesAndPmSubTabs.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: "src/app/erp/components/RentalMaintenanceTab.tsx",
    description:
      "렌탈 정비활동 필터·KPI·고밀도 대장·원가검증 푸터 서브탭(ACTIVITIES)과 정기 사전점검 일정 대상·완료 처리 서브탭(PREVENTIVE_PM)을 렌더링한다.",
  },
  "src/app/erp/components/rental-maintenance/RentalMaintActivityModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: "src/app/erp/components/RentalMaintenanceTab.tsx",
    description:
      "정비활동 등록·수정 및 7항목 점검 체크리스트·사용 부품 소진·열화 리셋 처리를 수행하는 지연 로딩 모달(MaintModal)을 제공한다.",
  },
  "src/app/erp/components/rental-maintenance/RentalMaintStockVehicleModals.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: "src/app/erp/components/RentalMaintenanceTab.tsx",
    description:
      "부품 재고 이동(TransferModal), 정비차량 등록·수정(VehicleModal), 신규 부품 SKU 등록(QuickPartModal) 및 주기장 부품 입고(YardReceiptModal) 모달을 제공한다.",
  },
  "src/app/erp/components/rental-maintenance/rentalMaintenanceTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: "src/app/erp/components/RentalMaintenanceTab.tsx",
    description:
      "렌탈 정비·사전점검·열화율·가동시간 이력·정비차량·부품 재고이동 인터페이스, 상태·열화·이동유형 라벨/뱃지 상수 및 소수점 입력 정제 함수(sanitizeDecimalText)를 정의한다.",
  },
  "src/app/erp/components/rental/RentalAddContractModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL",
    counterpart: "src/app/erp/components/RentalTab.tsx",
    description:
      "귀속 사업자·고객사 연동·재고 제품 다중 선택·부착옵션·전자세금계산서 제원·계약서 파일 첨부를 지원하는 신규 임대계약 체결 모달(AddContractModal)을 제공한다.",
  },
  "src/app/erp/components/rental/RentalAssetModelModals.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL",
    counterpart: "src/app/erp/components/RentalTab.tsx",
    description:
      "장비 구매 및 자산 일괄 취득 등록 모달(AcquireAssetModal), 임대 기종 모델·단가 등록 모달(AddModelModal), 과금기준·일할 정산 청구서 생성 모달(AddBillingModal)을 제공한다.",
  },
  "src/app/erp/components/rental/RentalEditContractModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL",
    counterpart: "src/app/erp/components/RentalTab.tsx",
    description:
      "체결된 임대계약의 계약조건·재고 제품 다중 선택·부착옵션·세금계산서 제원·계약서 파일 첨부 교체를 수행하는 임대계약 수정 모달(EditContractModal)을 제공한다.",
  },
  "src/app/erp/components/rental/RentalSubTabGrids.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL",
    counterpart: "src/app/erp/components/RentalTab.tsx",
    description:
      "임대 자산·계약·청구·모델 4대 서브탭 필터·정렬 그리드(RentalSubTabGrids), 대차대조 합계 검증 푸터, 감가상각 실행 모달 및 계약서 증빙 뷰어 모달을 제공한다.",
  },
  "src/app/erp/components/rental/rentalTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL",
    counterpart: "src/app/erp/components/RentalTab.tsx",
    description:
      "임대계약 등록·수정 시 재고 제품 선택 행의 제품 ID·수량·단가 입력 상태인 RentalItemDraft 인터페이스를 정의한다.",
  },
  "src/app/erp/components/rental/useRentalTabController.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "RENTAL",
    counterpart: "src/app/erp/components/RentalTab.tsx",
    description:
      "임대계약·자산·모델·청구 데이터 조회, useMasterDataSync 캐시 동기화, 콤보박스 옵션 파생 및 계약·청구·감가상각 CRUD 핸들러 훅(useRentalTabController)을 제공한다.",
  },
  "src/app/erp/components/service/ProRataFormulaGuideBox.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "SERVICES",
    counterpart: "src/app/erp/components/ServiceTab.tsx",
    description:
      "투입인원 입퇴사 월 급여 209시간 주휴 및 일할계산 산식 기준 안내 박스를 렌더링하는 공용 컴포넌트(ProRataFormulaGuideBox)를 제공한다.",
  },
  "src/app/erp/components/service/ServiceAddContractModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "SERVICES",
    counterpart: "src/app/erp/components/ServiceTab.tsx",
    description:
      "귀속 사업자·거래처·투입 임직원 편성·초과근무 연동·세금계산서 제원·계약서 파일 첨부를 지원하는 신규 용역계약 등록 모달을 제공한다.",
  },
  "src/app/erp/components/service/ServiceBillingModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "SERVICES",
    counterpart: "src/app/erp/components/ServiceTab.tsx",
    description:
      "체결 용역계약 선택, 투입인원 입퇴사 일할계산·초과근무수당 합산 반영, 세금계산서 다중 품목 명세 연동을 포함하는 정기 용역료·기성금 청구 생성 모달을 제공한다.",
  },
  "src/app/erp/components/service/ServiceEditContractModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "SERVICES",
    counterpart: "src/app/erp/components/ServiceTab.tsx",
    description:
      "체결된 용역계약의 계약금액·투입 임직원·일할기준·초과근무 반영·전자세금계산서 제원·계약서 첨부파일 교체를 수행하는 계약 수정 모달을 제공한다.",
  },
  "src/app/erp/components/service/ServiceLedgersAndDocModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "SERVICES",
    counterpart: "src/app/erp/components/ServiceTab.tsx",
    description:
      "용역계약 대장 테이블, 기간·계약·검색 필터 기반 월별 청구·수납 대장, 합계 검증 푸터 및 계약서 증빙 뷰어 모달을 렌더링한다.",
  },
  "src/app/erp/components/service/serviceTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "SERVICES",
    counterpart: "src/app/erp/components/ServiceTab.tsx",
    description:
      "용역계약 투입 임직원의 사번·성명·입퇴사일·기본급·월 계약금액·일할계산 적용여부·비고를 표현하는 AssignedServiceEmployee 인터페이스를 정의한다.",
  },
  "src/app/erp/components/service/useServiceTabController.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "SERVICES",
    counterpart: "src/app/erp/components/ServiceTab.tsx",
    description:
      "용역계약·청구·거래처·임직원 조회, 초과근무 집계·입퇴사 일할계산 및 계약·청구·증빙 뷰어 CRUD 핸들러 훅(useServiceTabController)을 제공한다.",
  },
  "src/app/erp/components/tax-invoice/TaxInvoiceIssueAndDetailModals.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "TAX",
    counterpart: "src/app/erp/components/TaxInvoiceTab.tsx",
    description:
      "매출·매입 전자세금계산서 수동 발행·등록 모달(IssueModal)과 국세청 양식 테이블·팝빌 열기·출력·통장 대사 연결·삭제 버튼을 포함하는 상세조회 모달(DetailModal)을 제공한다.",
  },
  "src/app/erp/components/tax-invoice/TaxInvoiceReconcileModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "TAX",
    counterpart: "src/app/erp/components/TaxInvoiceTab.tsx",
    description:
      "세금계산서와 통장 입출금 후보 내역 비교 대사, 복수 선택 일괄 계정과목 정리, 차액 종결 사유 선택 완납 종결, 부분수납 및 직접 정산액 입력 모달을 제공한다.",
  },
  "src/app/erp/components/tax-invoice/TaxKpiAndFilterBar.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "TAX",
    counterpart: "src/app/erp/components/TaxInvoiceTab.tsx",
    description:
      "세금계산서 4대 서브탭 전환 바, 상단 실행 버튼군, 4대 KPI 카드, 거래처별 미결 요약 바, Z-패턴 필터 툴바 및 CSV 내보내기 기능을 제공한다.",
  },
  "src/app/erp/components/tax-invoice/TaxLedgerSubTab.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "TAX",
    counterpart: "src/app/erp/components/TaxInvoiceTab.tsx",
    description:
      "매출·매입 세금계산서 모바일 카드 대장, PC 고밀도 정렬 테이블, 통장 대사·발행·삭제 인라인 액션 및 우하단 대차대조 검증 푸터 바를 렌더링한다.",
  },
  "src/app/erp/components/tax-invoice/TaxUnissuedAndSyncSubTabs.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "TAX",
    counterpart: "src/app/erp/components/TaxInvoiceTab.tsx",
    description:
      "미발행 청구 일괄 세금계산서 발행 테이블(TaxUnissuedSubTab)과 홈택스 RPA 수집 설정·실행·엑셀 업로드·동기화 로그(TaxHometaxSyncSubTab)를 제공한다.",
  },
  "src/app/erp/components/tax-invoice/useTaxInvoiceController.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "TAX",
    counterpart: "src/app/erp/components/TaxInvoiceTab.tsx",
    description:
      "세금계산서 탭의 조회·매출/매입 KPI·미결 요약 집계·팝빌 발행/전송·홈택스 수집/업로드·통장 대사·수동정산 상태와 API 핸들러를 제어하는 훅(useTaxInvoiceController)을 제공한다.",
  },
  "src/app/erp/components/trade/TradeInventoryAndProductsSubTabs.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "TRADE",
    counterpart: "src/app/erp/components/TradeTab.tsx",
    description:
      "유통 스코프 필터바(TradeScopeFilterBar), 재고 요약·로트 테이블(TradeInventorySubTab), 상품 테이블(TradeProductsSubTab) 및 증빙 뷰어 모달(TradeDocViewerModal)을 제공한다.",
  },
  "src/app/erp/components/trade/TradeProductPurchaseModals.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "TRADE",
    counterpart: "src/app/erp/components/TradeTab.tsx",
    description:
      "품목구분·제원·옵션단가·보증기준을 입력하는 상품 등록·수정 모달(ProductModal)과 단가/총액·부가세 모드 전환 및 정수단가 분할 미리보기를 제공하는 구매 입고 모달(PurchaseModal)을 제공한다.",
  },
  "src/app/erp/components/trade/TradeSaleBillingModals.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "TRADE",
    counterpart: "src/app/erp/components/TradeTab.tsx",
    description:
      "귀속 사업자·판매유형·다중 제품·차대번호 보증·부대옵션·세금계산서 제원을 입력하는 판매 계약 등록·수정 모달(AddSaleModal, EditSaleModal)과 유통 청구 생성 모달(AddBillingModal)을 제공한다.",
  },
  "src/app/erp/components/trade/TradeSalesBillingSubTabs.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "TRADE",
    counterpart: "src/app/erp/components/TradeTab.tsx",
    description:
      "유통 메뉴의 구매 입고 내역 테이블(PurchasesSubTab), 판매 계약 관리·묶음 선택 테이블(SalesSubTab), 청구·계산서 발행 테이블(BillingsSubTab) 및 매출·마진 정산 서브탭(SettlementSubTab)을 제공한다.",
  },
  "src/app/erp/components/trade/tradeHelpers.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "TRADE",
    counterpart: "src/app/erp/components/TradeTab.tsx",
    description:
      "유통 재고 요약·정렬·통계 집계, 매입 정수단가 분할, 판매·청구·세금계산서 페이로드 빌더 및 재고 CSV 내보내기 순수 함수를 제공한다.",
  },
  "src/app/erp/components/warranty/WarrantyDossierAndAddModal.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "WARRANTY",
    counterpart: "src/app/erp/components/WarrantyManagementTab.tsx",
    description:
      "차대번호 보증 슬라이드오버 상세·AS 클레임 이력 관리 패널과 수동 보증 등록 모달(WarrantyDossierAndAddModal)을 지연 로딩 단위로 제공한다.",
  },
  "src/app/erp/components/work-improvement/WorkImprovementA4Studio.tsx": {
    layer: "L4_UI_SUBMODULES",
    menuId: "WORK_IMPROVEMENT",
    counterpart: "src/app/erp/components/WorkImprovementTab.tsx",
    description:
      "업무개선 보고서 A4 양식 헤더·3단 결재란·개요·현황·개선방안·기대효과·예산·파일첨부·검토승인 의견 패널 및 사진 확대 모달을 렌더링한다.",
  },
  "src/app/erp/components/work-improvement/workImprovementTypes.ts": {
    layer: "L4_UI_SUBMODULES",
    menuId: "WORK_IMPROVEMENT",
    counterpart: "src/app/erp/components/WorkImprovementTab.tsx",
    description:
      "업무개선 보고서·번호항목맵·사진·첨부파일·임직원 옵션 인터페이스, 개선유형 상수, 날짜·용량 포맷터 및 결재선 연동 초기 보고서 생성기를 정의한다.",
  },

};

module.exports = { UI_SUBMODULE_DESCRIPTIONS };
