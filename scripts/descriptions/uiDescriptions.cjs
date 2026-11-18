"use strict";

/**
 * L1~L5 UI 셸·공통 컴포넌트·탭·하위 모듈·정적 데이터 계층 기능 명세 사전
 */
const UI_FILE_DESCRIPTIONS = {
  // =========================================================================
  // L1_SHELL_SECURITY (9)
  // =========================================================================
  "src/app/erp/layout.tsx": {
    layer: "L1_SHELL_SECURITY",
    menuId: "SHELL",
    counterpart: "public/erp-manifest.json",
    description:
      "ERP 경로 레이아웃 컴포넌트. 메타데이터 제목·설명·PWA 매니페스트(/erp-manifest.json)·iOS 웹앱 설정 정의 및 하위 페이지 래핑 수행.",
  },
  "src/app/erp/page.tsx": {
    layer: "L1_SHELL_SECURITY",
    menuId: "SHELL",
    counterpart: "src/app/erp/useErpShellController.ts",
    description:
      "ERP 메인 셸 페이지. 33개 탭·모달 지연 로딩 선언, 34개 메뉴 스위치 라우팅(renderMenuContent), KeepAlivePane 및 트리 사이드바·모바일 하단바 렌더링.",
  },
  "src/app/erp/useErpShellController.ts": {
    layer: "L1_SHELL_SECURITY",
    menuId: "SHELL",
    counterpart: "src/app/erp/page.tsx",
    description:
      "세션·권한 병렬 프리페치, 역할·개인화 메뉴 트리 필터링, 12개 LRU 탭 유지, 수동 스크롤 스냅샷 복원, 마우스·키보드 이력 탐색 및 30분 유휴 로그아웃 제어 훅.",
  },
  "src/app/erp/erpMenuConfig.ts": {
    layer: "L1_SHELL_SECURITY",
    menuId: "SHELL",
    counterpart: "src/app/erp/page.tsx",
    description:
      "ERP 7대 카테고리 및 34개 메뉴 키(ErpMenuKey), 아이콘, 메뉴별 권한 키 매핑 테이블(MENU_PERM_KEY_MAP), 개인화 설정 타입 정의.",
  },
  "src/app/erp/erp-theme.css": {
    layer: "L1_SHELL_SECURITY",
    menuId: "SHELL",
    counterpart: "src/app/erp/components/ErpHeader.tsx",
    description:
      "ERP 테마 스타일시트. 라이트(웜 코튼 페이퍼 텍스처)·화이트(#ffffff) 모드 CSS 변수, 그림자 제거, 다중 페이지 인쇄(@media print) 규칙 정의.",
  },
  "public/erp-manifest.json": {
    layer: "L1_SHELL_SECURITY",
    menuId: "SHELL",
    counterpart: "src/app/erp/layout.tsx",
    description:
      "ERP 웹앱 PWA 매니페스트 파일. 앱 명칭, 시작 경로(/erp), 스코프(/erp), standalone 디스플레이 모드, 배경·테마 색상, 아이콘 규격 정의.",
  },
  "src/middleware.ts": {
    layer: "L1_SHELL_SECURITY",
    menuId: "SECURITY",
    counterpart: "src/components/security/ClientSecurityGuard.tsx",
    description:
      "Next.js 요청 미들웨어. 소스맵(.map) 차단, 보안 헤더 및 캐시 무효화 적용, x-erp-* 위조 헤더 제거, /api/erp/*·/api/products 세션 검증.",
  },
  "src/components/security/ClientSecurityGuard.tsx": {
    layer: "L1_SHELL_SECURITY",
    menuId: "SECURITY",
    counterpart: "src/app/layout.tsx",
    description:
      "전역 클라이언트 보안 가드. 프로덕션 console 출력 무력화, 우클릭·F12·개발자도구·소스보기 단축키 차단, 보호 경로 창 크기 급변 시 잠금 오버레이 표시.",
  },
  "src/app/layout.tsx": {
    layer: "L1_SHELL_SECURITY",
    menuId: "SHELL",
    counterpart: "src/app/globals.css",
    description:
      "루트 HTML 레이아웃. SEO 메타데이터, JSON-LD 구조화 데이터, 애드센스 스크립트, ClientSecurityGuard 전역 마운트 구성.",
  },
  "src/app/globals.css": {
    layer: "L1_SHELL_SECURITY",
    menuId: "SHELL",
    counterpart: "src/app/layout.tsx",
    description:
      "전역 스타일시트. Tailwind CSS base·components·utilities 지시어 선언, 루트 전경·배경 색상 변수, 본문 폰트 스택 및 스크롤바 스타일 정의.",
  },

  // =========================================================================
  // L2_UI_SHARED (9)
  // =========================================================================
  "src/app/erp/components/ContractTaxInvoiceSection.tsx": {
    layer: "L2_UI_SHARED",
    menuId: "SHARED",
    counterpart: "src/app/erp/components/TaxInvoiceTab.tsx",
    description:
      "계약·청구 내 세금계산서 제원 입력 공통 섹션. 공급받는자 사업자 정보 추출(extractPartnerTaxSpec), 영수·청구 구분, 품목 행 추가·삭제 및 공급가액·세액 합산.",
  },
  "src/app/erp/components/ErpHeader.tsx": {
    layer: "L2_UI_SHARED",
    menuId: "SHARED",
    counterpart: "src/app/erp/page.tsx",
    description:
      "ERP 상단 헤더 컴포넌트. 모바일 메뉴 토글, 운영 사업자(ALL/CORP/INDIVIDUAL) 선택기 및 계좌 배지, 테마 전환, 사용자 정보 칩, 비밀번호 변경·로그아웃 버튼 제공.",
  },
  "src/app/erp/components/ErpLogin.tsx": {
    layer: "L2_UI_SHARED",
    menuId: "SHARED",
    counterpart: "src/app/erp/page.tsx",
    description:
      "ERP 로그인 화면 컴포넌트. 아이디·비밀번호 입력 폼 검증 및 /api/erp/auth/login POST 인증 요청 후 사용자 객체 상위 전달.",
  },
  "src/app/erp/components/ForkliftOptionAttachPanel.tsx": {
    layer: "L2_UI_SHARED",
    menuId: "SHARED",
    counterpart: "src/app/erp/components/ForkliftSpecEditor.tsx",
    description:
      "지게차 부착·설치 옵션 등록 패널. 판매(SALE)·임대(RENTAL) 모드별 카탈로그 초성 검색 선택, 수량·단가·공임·월/일 추가료 입력 및 옵션 합계 산출.",
  },
  "src/app/erp/components/ForkliftSpecEditor.tsx": {
    layer: "L2_UI_SHARED",
    menuId: "SHARED",
    counterpart: "src/app/erp/components/ForkliftOptionAttachPanel.tsx",
    description:
      "품목 분류(FORKLIFT/OPTION/PART/GENERAL)별 제원 편집기. 동력원, 정격하중, 마스트, 인상고, 타이어, 전압·배터리, 호환기종 입력 및 요약 문자열 생성.",
  },
  "src/app/erp/components/MenuPersonalizeModal.tsx": {
    layer: "L2_UI_SHARED",
    menuId: "SHARED",
    counterpart: "src/app/erp/page.tsx",
    description:
      "사이드바 메뉴 개인화 설정 모달. 인가된 메뉴 그룹·항목 상하 순서 이동, 메뉴 표시·숨김 토글, 로그인 기본 시작 메뉴 지정 및 초기화 처리.",
  },
  "src/app/erp/components/PasswordChangeModal.tsx": {
    layer: "L2_UI_SHARED",
    menuId: "SHARED",
    counterpart: "src/app/erp/components/ErpHeader.tsx",
    description:
      "사용자 비밀번호 변경 모달. 현재 비밀번호·새 비밀번호(4자 이상)·확인 입력값 검증 후 /api/erp/auth/change-password POST 요청 처리.",
  },
  "src/app/erp/components/SearchSelectCombobox.tsx": {
    layer: "L2_UI_SHARED",
    menuId: "SHARED",
    counterpart: null,
    description:
      "한글 초성 검색·포탈 드롭다운 지원 콤보박스. 자유 입력(allowFreeText), 초성 필터 바, 배지 색상 표시, 키보드 탐색 및 뷰포트 기준 상하 위치 계산.",
  },
  "src/app/erp/components/SortableTh.tsx": {
    layer: "L2_UI_SHARED",
    menuId: "SHARED",
    counterpart: null,
    description:
      "테이블 3단계 정렬 훅(useErpTableSort) 및 헤더 컴포넌트(SortableTh). 컬럼 클릭 시 오름차순·내림차순·정렬안함 순환 및 aria-sort 속성 반영.",
  },

  // =========================================================================
  // L3_UI_TABS (33)
  // =========================================================================
  "src/app/erp/components/AccountingStandardsTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "ACCOUNTING_STANDARD",
    counterpart: "src/app/erp/components/GeneralAccountingStandardsTab.tsx",
    description:
      "중소기업회계기준 열람 탭. /api/erp/accounting-standards?kind=sme 조회, 기준서 조문·해설서 좌우 분할 스크롤, 장별 필터, 키워드 검색어 강조 표시.",
  },
  "src/app/erp/components/ApprovalInboxTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "APPROVAL_INBOX",
    counterpart: "src/app/erp/components/ApprovalRulesTab.tsx",
    description:
      "내 결재함 탭. /api/erp/approvals 상태별(대기·승인·반려·전체) 목록 조회, 결재 단계별 권한 판별, 승인·사유 입력 반려 PATCH 및 업무개선 보고서 연계.",
  },
  "src/app/erp/components/ApprovalRulesTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "APPROVAL_RULES",
    counterpart: "src/app/erp/components/ApprovalInboxTab.tsx",
    description:
      "결재선 규칙 설정 탭. /api/erp/approvals/rules 이벤트별 최소 승인 티어(Tier 1~4), 부서합의·활성화 여부, 규칙 설명 조회 및 관리자 PUT 일괄 저장.",
  },
  "src/app/erp/components/AssetManagementTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "ASSET",
    counterpart: "src/app/erp/components/ProductManagementTab.tsx",
    description:
      "자산 관리 탭. /api/erp/assets·depreciation·logs 연동, 기종 요약·상세 목록 관리 및 감가상각 원장·상세 드로어·자산 취득 모달 지연 로딩 제어.",
  },
  "src/app/erp/components/BankMatchingTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "BANK_MATCHING",
    counterpart: "src/app/erp/components/TaxInvoiceTab.tsx",
    description:
      "은행 입출금 대장 오케스트레이터 탭. /api/erp/bank-matching·tax-invoices API 호출, 계좌별 기간 필터·일괄 계정 지정 조율 및 지연 로딩 모달 제어.",
  },
  "src/app/erp/components/CloudShareTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "CLOUD_SHARE",
    counterpart: null,
    description:
      "클라우드 자료실 탭. /api/erp/cloud-shares·files 연동, 공유 폴더 생성·수정·만료일·비밀번호·활성 상태 관리, 파일 업로드·삭제 및 공개 링크 복사.",
  },
  "src/app/erp/components/CorporateDocumentTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "CORPORATE_DOCS",
    counterpart: "src/app/erp/components/corporate-docs/CorporateDocVaultSubTab.tsx",
    description:
      "법인 중요문서 탭 오케스트레이터. /api/erp/corporate-docs·shareholder-registry 상태 관리, 문서 보관함 서브탭(CorporateDocVaultSubTab), 절차 매뉴얼·서식 스튜디오·템플릿 동적 로딩 및 업로드 모달 제어.",
  },
  "src/app/erp/components/EmploymentContractTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "EMPLOYMENT_CONTRACT",
    counterpart: "src/app/erp/components/OrganizationTab.tsx",
    description:
      "근로계약서·정보보호서약서 오케스트레이터 탭. /api/erp/employment-contracts·ocr 연동, 스캔 추출·사원 마스터 동기화 및 좌우 분할 패널 제어.",
  },
  "src/app/erp/components/ExpenseReceiptTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "EXPENSE_RECEIPT",
    counterpart: null,
    description:
      "개인경비 영수증 관리 탭. /api/erp/expenses 연동 월별 경비 목록·KPI·결재 승인반려 조율 및 경비등록·증빙미리보기 모달 지연 로딩 제어.",
  },
  "src/app/erp/components/FinancialReportTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "FINANCIAL_REPORT",
    counterpart: "src/app/erp/components/BankMatchingTab.tsx",
    description:
      "경영지표 보고서 탭. /api/erp/financial-report 연도·사업자·공급가 기준 손익계산서·월별 매트릭스·감가상각·전표 드릴다운 조회, 지연 로딩 기준 모달 및 주석 저장.",
  },
  "src/app/erp/components/GeneralAccountingStandardsTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "GENERAL_ACCOUNTING_STANDARD",
    counterpart: "src/app/erp/components/AccountingStandardsTab.tsx",
    description:
      "일반기업회계기준 열람 탭. /api/erp/accounting-standards?kind=general 조회, 조문·부록해설 좌우 분할 스크롤, 장별 원문 PDF 연결, 키워드 검색·강조.",
  },
  "src/app/erp/components/GovSupportIntelTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "GOV_SUPPORT",
    counterpart: "src/app/erp/components/gov-support/GovSupportDossierPanel.tsx",
    description:
      "정부지원·뉴스·트렌드 오케스트레이터 탭. /api/erp/gov-support 공고 발굴·AI 탐색·옵시디언 내보내기 조율, 좌측 목록 필터 및 우측 상세 패널(GovSupportDossierPanel)·지연 로딩 모달 제어.",
  },
  "src/app/erp/components/InboundRegTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "INBOUND_REG",
    counterpart: "src/app/erp/components/OutboundRegTab.tsx",
    description:
      "렌탈자산 입고등록 탭. /api/erp/inout?mode=INBOUND 연동, 자산·차대번호 자동 매칭, 반납 후 상태(임대가능·수리중)·가동시간 기록 및 계약 차감.",
  },
  "src/app/erp/components/LeaveApplyTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "LEAVE_APPLY",
    counterpart: "src/app/erp/components/LeaveManageTab.tsx",
    description:
      "연차 신청 탭. /api/erp/employees·leaves 연동 로그인 본인 근속·부여·잔여연차 집계, 휴가 유형별 차감일수 평일 산정, 신청 상신 및 취소 처리.",
  },
  "src/app/erp/components/LeaveManageTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "LEAVE_MANAGE",
    counterpart: "src/app/erp/components/LeaveApplyTab.tsx",
    description:
      "연차 관리 탭. 권한 스코프(전사·부서·본인)별 임직원 부여·사용·잔여연차 및 휴가 이력 조회, 부여일수 개별 조정, 연간 연차 일괄 초기화, CSV 내보내기.",
  },
  "src/app/erp/components/ObsidianVaultTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "OBSIDIAN_VAULT",
    counterpart: null,
    description:
      "옵시디언 노트 탭. /api/erp/obsidian·R2·로컬 폴더 동기화, 마크다운 분할 편집기, 태그·폴더 필터링 및 동기화 가이드·오류 모달 지연 로딩 제어.",
  },
  "src/app/erp/components/OrganizationTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "ORG",
    counterpart: "src/app/erp/components/PermissionsTab.tsx",
    description:
      "조직·인사관리 오케스트레이터 탭. useOrganizationController 연동 조직 상태 조율, 감사 요약·엑셀 내보내기, OrgTreeAndMemberGrid 및 SelectedProfilePanel 지연 로딩 구성.",
  },
  "src/app/erp/components/OtManagementTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "OT_MANAGE",
    counterpart: "src/app/erp/components/PayrollTab.tsx",
    description:
      "초과근무 관리 탭. /api/erp/overtimes 월별 연장·야간·휴일 근로 집계·승인반려·CSV 내보내기 처리 및 OtRequestModal 지연 로딩 제어.",
  },
  "src/app/erp/components/OutboundRegTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "OUTBOUND_REG",
    counterpart: "src/app/erp/components/InboundRegTab.tsx",
    description:
      "렌탈자산 출고등록 탭. /api/erp/inout 연동, 임대가능 자산·거래처 차단 검증·부착옵션 선택, 월정액·일할 요율 미리보기, 출고 등록 및 조건부 동적 청구·이력 패널(OutboundBillingAndLogsPanel) 제어.",
  },
  "src/app/erp/components/PartnerManagementTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "CUSTOMER|VENDOR",
    counterpart: "src/app/erp/components/TaxInvoiceTab.tsx",
    description:
      "거래처 관리(매출처·매입처) 탭. 목록·상세 패널, usePartnerDocAndNtsActions 훅 연동, 지연 로딩 OCR·일괄조회·문서뷰어 모달 제어.",
  },
  "src/app/erp/components/PayrollTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "PAYROLL",
    counterpart: "src/app/erp/components/OtManagementTab.tsx",
    description:
      "급여 정산 탭. /api/erp/payroll 월별 일괄 계산·용역수지 대차대조·승인지급 마감 처리 및 급여수정·OCR 모달(PayrollEditAndOcrModals) 지연 로딩 제어.",
  },
  "src/app/erp/components/PermissionsTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "PERMISSIONS",
    counterpart: "src/app/erp/components/OrganizationTab.tsx",
    description:
      "사용자 및 권한 탭. /api/erp/permissions·employees 연동, 역할(Role) 생성 및 메뉴별 조회(canView)·저장(canSave)·청구(canBill) 권한 매트릭스 설정.",
  },
  "src/app/erp/components/ProductManagementTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "PRODUCT",
    counterpart: "src/app/erp/components/AssetManagementTab.tsx",
    description:
      "제품 관리 탭. /api/erp/products·assets 분류 필터·카탈로그 목록·CSV 내보내기 관리 및 제품 상세 드로어·신규 등록 모달 지연 로딩 제어.",
  },
  "src/app/erp/components/RentalBizDirectoryTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "RENTAL_BIZ_DIR",
    counterpart: "src/app/erp/components/PartnerManagementTab.tsx",
    description:
      "렌탈 사업자 DB 오케스트레이터 탭. /api/erp/rental-directory 연동, 업종별 발굴·일괄 거래처 전환 조율 및 RentalBizToolbarAndGrid·상세 패널·지연 로딩 모달 제어.",
  },
  "src/app/erp/components/RentalMaintenanceTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: "src/app/erp/components/WarrantyManagementTab.tsx",
    description:
      "렌탈 정비·부품관리 오케스트레이터 탭. /api/erp/rental/maintenance·operating-hours·vehicle-stocks 상태·CRUD 핸들러 조율 및 지연 로딩 모달 제어.",
  },
  "src/app/erp/components/RentalTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "RENTAL",
    counterpart: "src/app/erp/components/rental/useRentalTabController.ts",
    description:
      "임대 계약·청구 오케스트레이터 뷰. useRentalTabController 훅 연동, RentalSubTabGrids 렌더링 및 감가상각·증빙뷰어·계약·모델 모달 조건부 지연 로딩 제어.",
  },
  "src/app/erp/components/RetirementPensionGuideTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "RETIREMENT_PENSION_GUIDE",
    counterpart: "src/app/erp/components/WorkRulesTab.tsx",
    description:
      "퇴직연금 도입 안내 탭. 확정기여형(DC) 및 중소기업퇴직연금기금(푸른씨앗) 제도 비교표 열람, HTML 문서(/docs/retirement-pension-guide.html) 별도 창 열기 및 인쇄.",
  },
  "src/app/erp/components/ServiceTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "SERVICES",
    counterpart: "src/app/erp/components/service/useServiceTabController.ts",
    description:
      "용역 관리(운영/개발) 오케스트레이터 뷰. useServiceTabController 훅 연동, 대장 렌더링 및 계약 등록·수정·청구 모달 조건부 지연 로딩 제어.",
  },
  "src/app/erp/components/TaxInvoiceTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "TAX",
    counterpart: "src/app/erp/components/tax-invoice/useTaxInvoiceController.ts",
    description:
      "매입·매출 세금계산서 오케스트레이터 뷰. useTaxInvoiceController 훅 연동 및 미발행 청구·홈택스 수집·통장 대사·발행·상세 모달 조건부 지연 로딩 제어.",
  },
  "src/app/erp/components/TradeTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "TRADE",
    counterpart: "src/app/erp/components/TaxInvoiceTab.tsx",
    description:
      "판매용(커머스) 오케스트레이터 탭. 유통 재고·상품·매입·판매·청구·정산 상태 및 API CRUD 핸들러 조율과 지연 로딩 모달 제어.",
  },
  "src/app/erp/components/WarrantyManagementTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "WARRANTY",
    counterpart: "src/app/erp/components/RentalMaintenanceTab.tsx",
    description:
      "차대번호 보증관리 탭. /api/erp/warranties·claims 목록 필터·상태 집계 처리 및 보증 상세 드로어·수동 등록 모달 지연 로딩 제어.",
  },
  "src/app/erp/components/WorkImprovementTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "WORK_IMPROVEMENT",
    counterpart: "src/app/erp/components/ApprovalInboxTab.tsx",
    description:
      "업무개선 보고서 오케스트레이터 탭. /api/erp/work-improvements 목록·저장·결재 상신·HTML 내보내기·인쇄 조율 및 좌측 보고서 목록 렌더링.",
  },
  "src/app/erp/components/WorkRulesTab.tsx": {
    layer: "L3_UI_TABS",
    menuId: "WORK_RULES",
    counterpart: "src/app/erp/data/workRulesStandardData.ts",
    description:
      "취업규칙(표준안) 탭. workRulesStandardData 참조, 필수·선택 기재사항 필터, 조문·키워드 검색, 장별 목차 탐색 및 인쇄 기능 제공.",
  },

  // =========================================================================
  // L5_STATIC_DATA (6)
  // =========================================================================
  "src/app/erp/data/accountSubjectStandardsBsEntries.ts": {
    layer: "L5_STATIC_DATA",
    menuId: "FINANCIAL_REPORT",
    counterpart: "src/app/erp/data/accountSubjectStandardsMap.ts",
    description:
      "AccountSubjectStandardInfo 인터페이스와 대차대조표 자산·부채·자본·세무대리 항목 30종에 대한 중소기업회계기준 매핑 상수(BS_ACCOUNT_SUBJECT_STANDARDS)를 정의한다.",
  },
  "src/app/erp/data/accountSubjectStandardsMap.ts": {
    layer: "L5_STATIC_DATA",
    menuId: "FINANCIAL_REPORT",
    counterpart: "src/app/erp/components/FinancialReportTab.tsx",
    description:
      "BS·PL·CF 분할 매핑을 통합한 ACCOUNT_SUBJECT_STANDARDS_MAP(68종), 6대 영역 부합성 요약 및 /api/erp/accounting-standards 조문·해설 조회 함수를 정의한다.",
  },
  "src/app/erp/data/accountSubjectStandardsPlCfEntries.ts": {
    layer: "L5_STATIC_DATA",
    menuId: "FINANCIAL_REPORT",
    counterpart: "src/app/erp/data/accountSubjectStandardsMap.ts",
    description:
      "손익계산서(매출·매출원가·급여·판관비)·현금흐름표·감가상각명세·대분류 요약 38종의 중소기업회계기준 매핑 상수(PL_CF_ACCOUNT_SUBJECT_STANDARDS)를 정의한다.",
  },
  "src/app/erp/data/accountingStandardsMeta.ts": {
    layer: "L5_STATIC_DATA",
    menuId: "ACCOUNTING_STANDARD",
    counterpart: "src/app/erp/components/AccountingStandardsTab.tsx",
    description:
      "중소기업회계기준 및 해설서 타입(StandardArticle, CommentarySection), 고시 메타 상수(ACCOUNTING_STANDARDS_META) 및 장 목록 상수를 정의한다.",
  },
  "src/app/erp/data/generalAccountingStandardsTypes.ts": {
    layer: "L5_STATIC_DATA",
    menuId: "GENERAL_ACCOUNTING_STANDARD",
    counterpart: "src/app/erp/components/GeneralAccountingStandardsTab.tsx",
    description:
      "일반기업회계기준 본문 조문 인터페이스(GeneralStandardArticle)와 실무지침·결론도출근거 섹션 인터페이스(GeneralGuidanceSection)를 정의한다.",
  },
  "src/app/erp/data/workRulesStandardData.ts": {
    layer: "L5_STATIC_DATA",
    menuId: "WORK_RULES",
    counterpart: "src/app/erp/components/WorkRulesTab.tsx",
    description:
      "고용노동부 표준취업규칙 17장 전문 상수(MOEL_STANDARD_WORK_RULES), 개정일자(WORK_RULES_REVISION_DATE) 및 조문·장 인터페이스(WorkRuleArticle, WorkRuleChapter)를 정의한다.",
  },
};

module.exports = { UI_FILE_DESCRIPTIONS };
