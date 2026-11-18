"use strict";

/**
 * L6~L9 API 라우트·연계 라우트·도메인 라이브러리·DB/RPA/명세 스크립트 계층 기능 명세 사전
 */
const SERVER_FILE_DESCRIPTIONS = {
  // =========================================================================
  // L6_API_ROUTES (71)
  // =========================================================================
  "src/app/api/erp/accounting-standards/generalStandardsData.json": {
    layer: "L6_API_ROUTES",
    menuId: "GENERAL_ACCOUNTING_STANDARD",
    counterpart: null,
    description:
      "일반기업회계기준 개념체계, 제1~33장 조문 본문, 실무지침 ID, 검색 키워드, 원문 PDF 경로를 수록한 정적 JSON 데이터셋",
  },
  "src/app/api/erp/accounting-standards/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "ACCOUNTING_STANDARD",
    counterpart: null,
    description:
      "GET 요청에서 kind(sme/general) 분기에 따라 중소·일반기업회계기준 JSON을 동적 로드하고 캐싱 응답 반환",
  },
  "src/app/api/erp/accounting-standards/smeStandardsData.json": {
    layer: "L6_API_ROUTES",
    menuId: "ACCOUNTING_STANDARD",
    counterpart: null,
    description:
      "중소기업회계기준 메타정보, 기준·해설 장목록, 제1조~부칙·별지서식 조문 데이터를 수록한 정적 JSON 데이터셋",
  },
  "src/app/api/erp/approvals/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "APPROVAL_INBOX",
    counterpart: null,
    description:
      "GET·POST·PATCH로 PostgreSQL 기반 전자결재 상신·부서장 전결 배정·승인반려 및 연차·OT·급여·업무개선 상태 연동",
  },
  "src/app/api/erp/approvals/rules/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "APPROVAL_RULES",
    counterpart: null,
    description:
      "GET·PUT으로 Supabase erp_approval_rules 결재선 단계·전결티어·합의규칙 조회 및 Tier 4 상한 보정 갱신",
  },
  "src/app/api/erp/assets/depreciation/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "ASSET",
    counterpart: "src/lib/erpDepreciationSync.ts",
    description:
      "GET·POST로 PostgreSQL 자산 감가상각 롤포워드·모델별 매출·처분손실 집계 및 erpDepreciationSync UNNEST 배치 원장 동기화 실행",
  },
  "src/app/api/erp/assets/logs/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "ASSET",
    counterpart: null,
    description:
      "GET·POST로 PostgreSQL erp_asset_inout_logs 기반 자산별 입출고·정비·대차 생애주기 이력 조회 및 등록",
  },
  "src/app/api/erp/assets/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "ASSET",
    counterpart: "src/lib/forkliftWarrantyService.ts",
    description:
      "GET·POST·PUT·DELETE로 PostgreSQL 자산 대장 CRUD, DR 채번, 정액법 감가상각 및 forkliftWarrantyService 배치 보증카드·이력 동기화 처리",
  },
  "src/app/api/erp/auth/change-password/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "AUTH",
    counterpart: null,
    description:
      "POST로 세션·관리자 권한 검증 후 PostgreSQL 사원 비밀번호 scrypt 해시 갱신 및 PASSWORD_CHANGE 감사로그 기록",
  },
  "src/app/api/erp/auth/login/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "AUTH",
    counterpart: null,
    description:
      "POST로 PostgreSQL 사원 인증, 로그인 제한, 퇴사자 차단, scrypt 해시 업그레이드, HttpOnly 세션 쿠키 발급",
  },
  "src/app/api/erp/auth/logout/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "AUTH",
    counterpart: null,
    description:
      "POST로 현재 세션 검증 후 PostgreSQL LOGOUT 보안 감사로그 기록 및 세션 쿠키 삭제 헤더 반환",
  },
  "src/app/api/erp/auth/session/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "AUTH",
    counterpart: null,
    description:
      "GET으로 세션 토큰 및 PostgreSQL 재직상태 검증, 사용자 정보 반환, 슬라이딩 세션 쿠키 갱신 처리",
  },
  "src/app/api/erp/bank-matching/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "BANK_MATCHING",
    counterpart: "src/lib/erpBankReconcileService.ts",
    description:
      "GET·POST·PATCH·DELETE로 RBAC 검증, 통장 거래 조회·업로드, ANY/applyBatchInvoiceSettlementUpdatesTx 배치 대사·대사취소 및 계좌마감 동기화를 수행",
  },
  "src/app/api/erp/cloud-shares/files/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "CLOUD_SHARE",
    counterpart: null,
    description:
      "POST·DELETE로 Cloudflare R2 Presigned URL 발급·파일 업로드 및 PostgreSQL erp_share_files 메타 관리",
  },
  "src/app/api/erp/cloud-shares/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "CLOUD_SHARE",
    counterpart: null,
    description:
      "GET·POST·PATCH·DELETE로 PostgreSQL 공유폴더 SHA-256 잠금·용량 집계 및 Cloudflare R2 파일 일괄 삭제",
  },
  "src/app/api/erp/consumables/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "SHARED",
    counterpart: null,
    description:
      "GET으로 @/lib/db SQL 기반 consumable_items 소모품 품목코드·재고·안전재고·단가 목록 조회 처리",
  },
  "src/app/api/erp/corporate-docs/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "CORPORATE_DOCS",
    counterpart: null,
    description:
      "GET·POST·PATCH·DELETE로 Cloudflare R2 파일 업로드·삭제 및 PostgreSQL 법인문서·버전 순번 관리",
  },
  "src/app/api/erp/departments/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "ORG",
    counterpart: null,
    description:
      "GET·POST·PUT·DELETE로 Supabase erp_departments 부서 계층·기능태그·인원수 조회 및 사원 부서명 동기화",
  },
  "src/app/api/erp/employees/reset-leave/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "LEAVE_MANAGE",
    counterpart: null,
    description:
      "POST로 PostgreSQL 재직 사원 입사일 기준 연차 재계산, UNNEST 일괄 잔여연차 갱신, 초기화·감사 로그 기록 처리",
  },
  "src/app/api/erp/employees/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "ORG",
    counterpart: null,
    description:
      "GET·POST·PUT으로 PostgreSQL 사원 마스터 CRUD, 비례연차 계산, scrypt·AES 암호화 및 PII 감사로그 기록",
  },
  "src/app/api/erp/employment-contracts/ocr/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "EMPLOYMENT_CONTRACT",
    counterpart: null,
    description:
      "POST로 erpOcrEngine PDF CMap 텍스트 추출·Groq JSON 파싱·정규식 기반 근로계약서·보안서약서 항목 판독",
  },
  "src/app/api/erp/employment-contracts/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "EMPLOYMENT_CONTRACT",
    counterpart: null,
    description:
      "GET·POST·PUT·DELETE로 RBAC 기반 근로계약서 CRUD, R2 업로드, 주민번호 복호화, 사원 마스터 동기화",
  },
  "src/app/api/erp/expenses/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "EXPENSE_RECEIPT",
    counterpart: "src/lib/erpExpenseSchema.ts",
    description:
      "GET·POST·PATCH·DELETE로 R2 영수증 업로드, erpOcrEngine Vision OCR 판독, 경비 결재 및 급여정산 연동",
  },
  "src/app/api/erp/financial-report/financialReportEngine.ts": {
    layer: "L6_API_ROUTES",
    menuId: "FINANCIAL_REPORT",
    counterpart: null,
    description:
      "매입세금계산서·통장거래 계정과목 분류, 자산화 판별, 홈택스 납부세액 파싱을 수행하는 재무제표 계산 엔진 TS 모듈",
  },
  "src/app/api/erp/financial-report/financialStatementsBuilder.ts": {
    layer: "L6_API_ROUTES",
    menuId: "FINANCIAL_REPORT",
    counterpart: "src/app/api/erp/financial-report/route.ts",
    description:
      "세금계산서·통장·납부세액 전표 적재, 렌탈자산 감가상각 전표 생성, 월별 계정 매트릭스 및 BS·PL·CF 재무제표 구조 산출 엔진 모듈",
  },
  "src/app/api/erp/financial-report/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "FINANCIAL_REPORT",
    counterpart: "src/app/api/erp/financial-report/financialStatementsBuilder.ts",
    description:
      "GET·POST로 RBAC 검증, PostgreSQL 7개 테이블 병렬 조회, buildFinancialReportPayload 호출 및 재무제표 주석·세무 항목 저장을 수행",
  },
  "src/app/api/erp/gov-support/govSupportSeedData.ts": {
    layer: "L6_API_ROUTES",
    menuId: "GOV_SUPPORT",
    counterpart: "src/app/api/erp/gov-support/route.ts",
    description:
      "GovSupportSeedItem 인터페이스, 공고 원문 매핑 상수(SEED_ORIGINAL_CONTENTS) 및 초기 시드 배열(GOV_SUPPORT_SEED_ITEMS)을 정의하는 서버 시드 모듈",
  },
  "src/app/api/erp/gov-support/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "GOV_SUPPORT",
    counterpart: "src/app/api/erp/gov-support/govSupportSeedData.ts",
    description:
      "GET·POST·PATCH·DELETE로 PostgreSQL 정부지원·조달 목록 CRUD, govSupportSeedData UNNEST 배치 시딩·보정, 웹 스크래핑 및 ANY/UNNEST 중복제거 RSS·Gemini 탐색",
  },
  "src/app/api/erp/inout/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "OUTBOUND_REG",
    counterpart: "src/lib/erpInoutTxService.ts",
    description:
      "GET·POST로 PostgreSQL 입출고·자산·월정산 청구 조회 및 erpInoutTxService OUTBOUND·INBOUND 트랜잭션 디스패치 처리",
  },
  "src/app/api/erp/leaves/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "LEAVE_APPLY",
    counterpart: null,
    description:
      "GET·POST·PATCH·DELETE로 PostgreSQL 연차 상신·부서장 전결 배정·승인반려 및 전자결재 요청 테이블 동기화",
  },
  "src/app/api/erp/obsidian/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "OBSIDIAN_VAULT",
    counterpart: null,
    description:
      "GET·POST·DELETE로 PostgreSQL 마크다운 노트·frontmatter·태그 관리 및 Cloudflare R2 .md 백업",
  },
  "src/app/api/erp/organization/batch/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "ORG",
    counterpart: null,
    description:
      "POST로 세션 검증 후 PostgreSQL 부서 계층·parent_id 2패스 UNNEST 일괄 업서트·삭제 및 사원 PII 암호화·연차 산정 UNNEST 일괄 반영 트랜잭션",
  },
  "src/app/api/erp/overtimes/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "OT_MANAGE",
    counterpart: null,
    description:
      "GET·POST·PATCH·DELETE로 PostgreSQL 초과근무 수당 산정, 부서장 전결 결재, OT_REQUEST 결재선 동기화",
  },
  "src/app/api/erp/partners/check-biz-status/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "CUSTOMER",
    counterpart: null,
    description:
      "POST로 국세청 사업자등록 상태조회 API 단건·일괄 호출 및 PostgreSQL 거래처 휴폐업 BLOCKED 전환·로그 기록",
  },
  "src/app/api/erp/partners/contacts/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "CUSTOMER",
    counterpart: null,
    description:
      "GET·POST·PUT·DELETE로 PostgreSQL 거래처별 담당자·명함 URL·대표담당자 플래그 조회 및 갱신",
  },
  "src/app/api/erp/partners/ocr-bank/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "CUSTOMER",
    counterpart: null,
    description:
      "POST로 erpOcrEngine PDF 추출·Groq JSON 파싱·은행명 정규화·정규식 기반 통장사본 계좌 정보 판독",
  },
  "src/app/api/erp/partners/ocr-biz-cert/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "CUSTOMER",
    counterpart: null,
    description:
      "POST로 erpOcrEngine PDF CMap 추출·Groq JSON 파싱·사업자번호 포맷·정규식 기반 사업자등록증 정보 추출",
  },
  "src/app/api/erp/partners/ocr-card/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "CUSTOMER",
    counterpart: null,
    description:
      "POST로 erpOcrEngine Groq Vision qwen3.8-27b 및 정규식 파싱 기반 명함 상호·성명·부서·직급·연락처·이메일 추출",
  },
  "src/app/api/erp/partners/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "CUSTOMER",
    counterpart: null,
    description:
      "GET·POST·PUT·DELETE로 PostgreSQL 거래처 CRUD, 코드 채번, AES 계좌 암호화, 계약·담당자 동기화",
  },
  "src/app/api/erp/payroll/ocr/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "PAYROLL",
    counterpart: null,
    description:
      "POST로 PDF 2D 좌표 그리드·Groq AI qwen3.8-27b·회계보존 파서 기반 급여대장 추출 및 사원 매핑",
  },
  "src/app/api/erp/payroll/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "PAYROLL",
    counterpart: null,
    description:
      "GET·POST·PATCH로 RBAC 검증, Promise.all 병렬 급여 집계, 단일 트랜잭션 BATCH_SAVE 및 급여정산 마감을 수행",
  },
  "src/app/api/erp/permissions/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "PERMISSIONS",
    counterpart: null,
    description:
      "GET·POST·PUT·PATCH로 역할 생성, CROSS JOIN 기본권한 일괄 보장, 메뉴권한 UNNEST 업서트, 사원 역할 동기화 및 캐시 무효화",
  },
  "src/app/api/erp/products/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "PRODUCT",
    counterpart: null,
    description:
      "GET·POST·PUT·DELETE로 PostgreSQL 제품 모델 CRUD, 지게차 제원 정규화 및 보유·대여·정비 자산 통계 집계",
  },
  "src/app/api/erp/rental-directory/officialDirectoryData.json": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL_BIZ_DIR",
    counterpart: null,
    description:
      "FL·AWP·OA_PC 업종 검증 렌탈 사업자 상호·사업자번호·대표자·소재지·KSIC·매출상태를 수록한 시드 JSON",
  },
  "src/app/api/erp/rental-directory/officialMolitStats.json": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL_BIZ_DIR",
    counterpart: null,
    description:
      "국토교통부·대한건설기계협회 기준 지역·용도별 건설기계 등록현황 및 사업자 공식 통계를 수록한 JSON 데이터셋",
  },
  "src/app/api/erp/rental-directory/rentalDirectorySeedData.ts": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL_BIZ_DIR",
    counterpart: null,
    description:
      "RentalBizSeed 인터페이스와 INITIAL_VERIFIED_OPERATORS 초기 검증 렌탈 사업자 시드 배열 정의 TS 모듈",
  },
  "src/app/api/erp/rental-directory/rentalDirectorySyncService.ts": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL_BIZ_DIR",
    counterpart: "src/app/api/erp/rental-directory/route.ts",
    description:
      "렌탈 사업자 DB 테이블 초기화, UNNEST 500건 배치 시드 동기화, 발굴·크롤링 결과 배치 업서트 및 erp_partners 단일 트랜잭션 거래처 전환 서비스 모듈",
  },
  "src/app/api/erp/rental-directory/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL_BIZ_DIR",
    counterpart: "src/app/api/erp/rental-directory/rentalDirectorySyncService.ts",
    description:
      "GET·POST·DELETE로 PostgreSQL 렌탈 사업자 DB 관리, 일괄 거래처 이관, 웹 게시판 크롤링, Gemini 검색 탐색을 rentalDirectorySyncService와 연계 처리",
  },
  "src/app/api/erp/rental/assets/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL",
    counterpart: null,
    description:
      "GET·POST로 PostgreSQL erp_rental_assets·제품 결합 조회, 단건·일괄 DR 채번 등록 및 감사로그 기록",
  },
  "src/app/api/erp/rental/billings/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL",
    counterpart: null,
    description:
      "GET·POST·DELETE로 PostgreSQL 임대 월정산 청구 조회, 일할·감가상각 원가 합산 생성, 미발행 청구 삭제",
  },
  "src/app/api/erp/rental/contracts/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL",
    counterpart: null,
    description:
      "GET·POST·PUT·DELETE·PATCH로 PostgreSQL 임대계약 CRUD, erpRentalContractService 배치 자산 예약·출고·청구 동기화 및 상태 전이 처리",
  },
  "src/app/api/erp/rental/depreciation/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL",
    counterpart: null,
    description:
      "POST로 대상 연월 중복 검증(ROLLBACK 해제) 후 UNNEST 배치 UPDATE·INSERT 기반 정액법 감가상각 및 감사 로그 기록",
  },
  "src/app/api/erp/rental/maintenance/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: null,
    description:
      "GET·POST·PUT으로 PostgreSQL 정비이력·사용부품·PM 스케줄 조회 및 트랜잭션 기반 정비 등록·수정 처리",
  },
  "src/app/api/erp/rental/operating-hours/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: null,
    description:
      "GET·POST로 PostgreSQL 자산별 가동시간·소모품 열화도·PM 일정 조회, 마모주기 설정 및 가동시간 이력 기록",
  },
  "src/app/api/erp/rental/products/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL",
    counterpart: null,
    description:
      "GET·POST로 PostgreSQL erp_rental_products 임대 모델 목록 조회, 지게차 제원 정규화 및 신규 모델 등록",
  },
  "src/app/api/erp/rental/vehicle-stocks/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: "src/lib/rentalMaintPartStockTx.ts",
    description:
      "GET·POST로 PostgreSQL 차량·주기장 부품 입출고 이력·재고 조회, 적정재고 설정, rentalMaintPartStockTx 연계 입고·이동 트랜잭션 처리",
  },
  "src/app/api/erp/rental/vehicles/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: null,
    description:
      "GET·POST·PUT으로 PostgreSQL 정비차량 목록·적재 부품재고 조회, 부품 등록 및 정비차량 등록·수정 처리",
  },
  "src/app/api/erp/services/billings/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "SERVICES",
    counterpart: null,
    description:
      "GET·POST·DELETE로 Supabase erp_service_billings 용역 청구 조회, 템플릿 치환 생성, 미발행 청구 삭제",
  },
  "src/app/api/erp/services/contracts/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "SERVICES",
    counterpart: null,
    description:
      "GET·POST·PUT·DELETE로 PostgreSQL 용역계약 CRUD, 투입인원 급여단가·거래처 이메일 동기화 및 감사로그",
  },
  "src/app/api/erp/shareholder-registry/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "CORPORATE_DOCS",
    counterpart: null,
    description:
      "GET·POST로 세션 검증 후 PostgreSQL 주주명부 PII AES 암호화 저장·복호화 마스킹 조회 및 감사로그 기록",
  },
  "src/app/api/erp/tax-invoices/hometax/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "TAX",
    counterpart: null,
    description:
      "GET·POST로 홈택스 Excel/CSV 파싱, 단건 프리페치·메모리 색인 기반 수정세금계산서 상계, UNNEST 보정 및 청크 일괄 적재 처리",
  },
  "src/app/api/erp/tax-invoices/popbill/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "TAX",
    counterpart: null,
    description:
      "POST로 팝빌 API 연동 세금계산서 정발행, 국세청 전송, 메일 발송, 상태 동기화 및 뷰어·관리 URL 발급",
  },
  "src/app/api/erp/tax-invoices/reconcile/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "TAX",
    counterpart: "src/lib/erpTaxReconcileEngine.ts",
    description:
      "GET·POST로 erpTaxReconcileEngine 점수·부분합 기반 세금계산서·통장 후보 조회, UNNEST 일괄 자동대사, 수동대사 및 취소 처리를 수행",
  },
  "src/app/api/erp/tax-invoices/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "TAX",
    counterpart: null,
    description:
      "GET·POST·DELETE로 RBAC 기반 세금계산서·미발행청구 조회, 팝빌 전자발행 및 ANY($1) 배치 청구 연결·통장대사·발행 취소 삭제",
  },
  "src/app/api/erp/tax-invoices/viewer/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "TAX",
    counterpart: null,
    description:
      "GET으로 invoiceNo 기반 PostgreSQL erp_tax_invoices 조회 및 전자세금계산서 인쇄용 HTML 렌더링 반환",
  },
  "src/app/api/erp/trade/billings/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "TRADE",
    counterpart: null,
    description:
      "GET·POST·DELETE로 PostgreSQL 유통 청구·거래처·세금계산서 결합 조회, 다건 판매 묶음 청구 생성·삭제",
  },
  "src/app/api/erp/trade/products/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "TRADE",
    counterpart: null,
    description:
      "GET·POST·PUT·DELETE로 PostgreSQL 유통 상품 CRUD, SKU 채번, 역FIFO 재고 에이징·로트 집계 처리",
  },
  "src/app/api/erp/trade/purchases/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "TRADE",
    counterpart: null,
    description:
      "GET·POST로 PostgreSQL 매입 조회, 거래처 검증, 단건·분할 매입 등록, 상품 재고·원가 갱신 및 감사로그 기록",
  },
  "src/app/api/erp/trade/sales/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "TRADE",
    counterpart: "src/lib/forkliftWarrantyService.ts",
    description:
      "GET·POST·PUT·DELETE로 PostgreSQL 유통 판매 CRUD, 오름차순 FOR UPDATE·UNNEST 재고 차감/복구 및 forkliftWarrantyService 배치 보증카드 동기화",
  },
  "src/app/api/erp/trade/settlement/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "TRADE",
    counterpart: null,
    description:
      "GET으로 PostgreSQL erp_trade_sales 기간별 매출·원가·마진·마진율 총계 및 거래처별 정산 집계 조회",
  },
  "src/app/api/erp/vault/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "SHARED",
    counterpart: null,
    description:
      "GET·POST로 Cloudflare R2 비공개 버킷 객체 inline·attachment 스트리밍 조회 및 파일·base64 업로드",
  },
  "src/app/api/erp/warranties/claims/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "WARRANTY",
    counterpart: null,
    description:
      "GET·POST·DELETE로 PostgreSQL 보증 AS/수리 이력 관리, 가동시간·보증상태·렌탈자산 연동 및 감사로그 기록",
  },
  "src/app/api/erp/warranties/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "WARRANTY",
    counterpart: null,
    description:
      "GET·POST·PUT·DELETE로 PostgreSQL 차대번호 보증카드 CRUD, 잔여기간·시간 산출 및 렌탈자산 보증 동기화",
  },
  "src/app/api/erp/work-improvements/route.ts": {
    layer: "L6_API_ROUTES",
    menuId: "WORK_IMPROVEMENT",
    counterpart: null,
    description:
      "GET·POST·PUT·PATCH·DELETE로 PostgreSQL 업무개선보고서 CRUD, 부서장 전결 검토·승인 및 결재함 동기화",
  },

  // =========================================================================
  // L7_LINKED_ROUTES (5)
  // =========================================================================
  "src/app/share/[code]/page.tsx": {
    layer: "L7_LINKED_ROUTES",
    menuId: "SHARE",
    counterpart: "src/app/api/share/[code]/route.ts",
    description:
      "외부 공유 링크 코드 기반 폴더 정보 조회, 비밀번호 검증, 파일명 검색·정렬 및 개별·순차 다운로드와 PDF·이미지 열람을 수행하는 클라이언트 페이지",
  },
  "src/app/api/share/[code]/route.ts": {
    layer: "L7_LINKED_ROUTES",
    menuId: "SHARE",
    counterpart: "src/app/share/[code]/page.tsx",
    description:
      "공유 코드로 erp_share_folders와 erp_share_files를 조회하고 활성·만료·비밀번호(SHA-256) 검증 후 파일 목록을 반환하는 GET·POST API",
  },
  "src/app/api/share/[code]/download/route.ts": {
    layer: "L7_LINKED_ROUTES",
    menuId: "SHARE",
    counterpart: "src/app/share/[code]/page.tsx",
    description:
      "공유 파일 다운로드 횟수를 증가시키고 25MB 초과·redirect 모드는 R2 Presigned URL 리다이렉트, 일반 파일은 스트리밍 응답하는 GET API",
  },
  "src/app/shareholder-registry/page.tsx": {
    layer: "L7_LINKED_ROUTES",
    menuId: "CORPORATE_DOCS",
    counterpart: "src/app/shareholder-registry/ShareholderRegistryClient.tsx",
    description:
      "주주명세서 발급 화면의 메타데이터를 정의하고 ShareholderRegistryClient 컴포넌트를 렌더링하는 Next.js 페이지 엔트리",
  },
  "src/app/shareholder-registry/ShareholderRegistryClient.tsx": {
    layer: "L7_LINKED_ROUTES",
    menuId: "CORPORATE_DOCS",
    counterpart: "src/app/shareholder-registry/page.tsx",
    description:
      "주주명세서 데이터 서버 조회·암호화 저장, 주민번호 마스킹 토글, 지분율·금액 계산 및 A4 규격 인쇄 화면을 제공하는 클라이언트 컴포넌트",
  },

  // =========================================================================
  // L8_DOMAIN_LIBS (33)
  // =========================================================================
  "src/lib/businessEntities.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: null,
    description:
      "법인·개인 두 사업자 엔티티의 사업자번호·계좌·자본금·주소 메타데이터 상수와 사업자번호·계좌번호 기반 엔티티 조회 함수를 제공하는 SSOT 모듈",
  },
  "src/lib/db.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: null,
    description:
      "서버 전용 환경변수 DATABASE_URL 기반으로 Neon Serverless PostgreSQL 쿼리 클라이언트(sql)를 생성·내보내는 DB 연결 모듈",
  },
  "src/lib/erpAccountSubjects.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "BANK_MATCHING",
    counterpart: null,
    description:
      "입출금 표준 계정과목 목록을 정의하고 매칭 명칭·키워드 기반 계정과목 해석 및 은행 거래 행(적요·예금주·채널)별 계정과목 추천 함수를 제공",
  },
  "src/lib/erpApprovalLine.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "APPROVAL_INBOX",
    counterpart: "src/lib/erpApprovalServer.ts",
    description:
      "직급·직책 서열 점수 산출, 대표이사 결재 배제, 부서장 전결 및 업무개선활동 결재선 산출과 결재선 역전 검증을 수행하는 순수 도메인 유틸",
  },
  "src/lib/erpApprovalServer.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "APPROVAL_INBOX",
    counterpart: "src/lib/erpApprovalLine.ts",
    description:
      "erp_employees와 erp_departments를 조회하여 부서장 전결권자 산출 및 업무개선활동 결재선 서버 검증·정규화를 수행하는 서버 모듈",
  },
  "src/lib/erpBankClosing.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "BANK_MATCHING",
    counterpart: null,
    description:
      "erp_bank_transactions 마감 컬럼·인덱스를 멱등 생성하고 계좌별 미매칭 건수 기준으로 입출금 마감 상태(is_closed)를 동기화하는 모듈",
  },
  "src/lib/erpBankReconcileService.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "BANK_MATCHING",
    counterpart: "src/app/api/erp/bank-matching/route.ts",
    description:
      "통장 적요 기반 급여 분류, 미결 세금계산서 단일·다중 합산 자동 대사, applyBatchInvoiceSettlementUpdatesTx UNNEST 4대 테이블 배치 정산 동기화 및 일괄 업서트를 수행하는 서비스 모듈",
  },
  "src/lib/erpContractTemplate.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: "src/lib/erpFormat.ts",
    description:
      "계약 품목명·세금계산서 비고 치환식 평가(resolveContractItemTemplate, resolveContractTaxItemsTemplate) 및 우선 종목 추출(selectPreferredBizItem)을 제공",
  },
  "src/lib/erpDepreciation.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "RENTAL",
    counterpart: "src/lib/erpDepreciationSync.ts",
    description:
      "렌탈 매출세금계산서 4대 유형 분리, 모델별 매출 귀속 및 자산 월할 감가상각·폐기손실·Roll-Forward 스케줄을 산출하는 순수 계산 모듈",
  },
  "src/lib/erpDepreciationSync.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "RENTAL",
    counterpart: "src/lib/erpDepreciation.ts",
    description:
      "runSchemaInitOnce 1회 스키마 보강 후 UNNEST 배치 UPSERT·UPDATE로 erp_asset_depreciation_logs 및 erp_rental_assets를 동기화하는 DB 동기화 서비스",
  },
  "src/lib/erpExpenseSchema.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "EXPENSE_RECEIPT",
    counterpart: "src/app/api/erp/expenses/route.ts",
    description:
      "runSchemaInitOnce 1회 캐싱으로 erp_expense_receipts 테이블 및 급여 개인경비 정산 컬럼(personal_expense_amount)을 멱등 초기화하는 서버 SSOT 모듈",
  },
  "src/lib/erpFormat.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: null,
    description:
      "숫자·통화·수량 포맷팅, 정수 입력 정제 및 3단계 테이블 정렬(cycleErpSort, sortErpItems)을 제공하는 전사 공용 포맷·정렬 SSOT 모듈",
  },
  "src/lib/erpHrLaborDomain.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: "src/lib/erpFormat.ts",
    description:
      "연차 휴가 유형·비례연차 부여·평일수 산출, 공휴일 판별, 초과근무 가산수당 및 209시간 주휴 입퇴사 일할계산을 제공하는 인사·노무 도메인 SSOT 모듈",
  },
  "src/lib/erpInoutTxService.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "OUTBOUND_REG",
    counterpart: "src/app/api/erp/inout/route.ts",
    description:
      "월할 일할계산(computeMonthlyProRata), UNNEST 배치 월별 청구 생성·갱신 기반 출고 트랜잭션(executeOutboundInoutTx) 및 입고 회수 트랜잭션(executeInboundInoutTx)을 제공",
  },
  "src/lib/erpMasterDataBus.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: null,
    description:
      "클라이언트 마스터 데이터 45초 메모리 캐싱, 중복 요청 병합, 도메인별 캐시 무효화 이벤트 발행 및 Keep-Alive 탭 동기화 훅을 제공하는 모듈",
  },
  "src/lib/erpMenuHistory.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: null,
    description:
      "ERP 메뉴 방문 이력 스택(최대 50건)의 추가, 이전·다음 이동 및 허용 메뉴 집합 기준 이력 정리를 처리하는 순수 상태 머신 유틸",
  },
  "src/lib/erpOcrEngine.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: "src/lib/groqServerKey.ts",
    description:
      "PDF ToUnicode CMap 텍스트 해독, Groq LLM JSON 펜스 제거·재시도 파싱, 한국 은행명·계좌번호·사업자번호 정규화를 통합 제공하는 OCR 엔진 SSOT",
  },
  "src/lib/erpRbacGuard.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: "src/lib/erpSessionToken.ts",
    description:
      "요청 세션 검증, erp_role_permissions 60초 캐시 기반 메뉴별 view·save·bill 권한 검사 및 PII 열람 감사로그 적재를 수행하는 API 가드",
  },
  "src/lib/erpRentalContractService.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "RENTAL",
    counterpart: "src/app/api/erp/rental/contracts/route.ts",
    description:
      "임대계약 자산 예약(LATERAL FOR UPDATE)·UNNEST 배치 출고 배정·반납 해제·거래처 세금계산서 수신이메일 동기화 및 과세 요약 생성을 수행하는 트랜잭션 서비스",
  },
  "src/lib/erpSchemaCache.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: null,
    description:
      "프로세스 수명 동안 스키마 DDL 초기화를 키별 1회 실행으로 캐싱하고 erp_* 핵심 조회 테이블의 성능 인덱스를 멱등 생성하는 서버 유틸",
  },
  "src/lib/erpSecurityAudit.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: null,
    description:
      "클라이언트 IP 추출, 세션 쿠키 헤더 생성, IP·ID별 로그인 5회 실패 10분 잠금 제어 및 erp_security_audit_logs 감사로그 기록을 수행",
  },
  "src/lib/erpSessionToken.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: "src/lib/erpSecurityAudit.ts",
    description:
      "Web Crypto HMAC-SHA256 기반 8시간 만료 ERP 세션 토큰 서명·검증 및 요청 Cookie 헤더 값 추출을 제공하는 Edge·Node 공용 모듈",
  },
  "src/lib/erpTaxReconcileEngine.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "TAX",
    counterpart: "src/app/api/erp/tax-invoices/reconcile/route.ts",
    description:
      "거래처 별칭 정규화, 세금계산서·통장 점수 산출, 부분합 다중매칭, 파티션 자동대사 엔진 및 청구대장 상태 일괄 동기화를 제공하는 서버 모듈",
  },
  "src/lib/forkliftDomain.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "RENTAL",
    counterpart: "src/lib/forkliftSchemaInit.ts",
    description:
      "지게차 완제품·옵션·부품 분류 상수, 제원 JSON 파싱·요약, 장착 옵션 금액 집계 및 보증 만료일·가동시간 기준 보증 상태 판정 함수를 제공",
  },
  "src/lib/forkliftSchemaInit.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "RENTAL",
    counterpart: "src/lib/forkliftDomain.ts",
    description:
      "매매·렌탈 제품·판매·자산·계약 테이블에 지게차 제원·옵션·보증 컬럼을 추가하고 보증·클레임 테이블을 멱등 생성하는 스키마 초기화 모듈",
  },
  "src/lib/forkliftWarrantyService.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "WARRANTY",
    counterpart: "src/app/api/erp/assets/route.ts",
    description:
      "렌탈자산 취득(RENTAL_ASSET)과 유통판매(SALE) 경로의 차대번호 기준 보증카드 일괄 UPSERT(upsertForkliftWarrantiesBatchTx)를 수행하는 UNNEST 트랜잭션 SSOT 모듈",
  },
  "src/lib/groqServerKey.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: null,
    description:
      "환경변수 GROQ_API_KEY 또는 erp_ai_intel_settings 암호화 키를 복호화해 5분 메모리 캐시로 제공하는 서버 전용 키 조회 모듈",
  },
  "src/lib/hangulSearch.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: null,
    description:
      "복자음 분해, 초성 추출, 정규식 매처 캐싱, 다중 토큰 AND 통합검색, 거래처명 정제 및 가나다순 정렬을 수행하는 한글 초성 검색 유틸",
  },
  "src/lib/ibkBankParser.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "BANK_MATCHING",
    counterpart: null,
    description:
      "IBK기업은행 XLSX(ZIP)·CSV·TSV·HTML 표 파일을 디코딩·파싱하여 계좌 메타데이터와 중복 방지 txHash 포함 입출금 거래 내역을 추출",
  },
  "src/lib/partnerStatusClient.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: "src/lib/partnerStatusService.ts",
    description:
      "사업자번호 정규화, 거래처·국세청 휴폐업 상태 기반 거래차단 판별, 배지 메타정보 생성 및 차단 거래처 매칭을 제공하는 클라이언트·서버 공용 모듈",
  },
  "src/lib/partnerStatusService.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: "src/lib/partnerStatusClient.ts",
    description:
      "erp_partners 국세청 상태 컬럼 보강, 홈택스 사업자 상태 단건·배치 조회 파싱 및 거래 생성 전 차단 거래처 검증 예외 발생을 수행하는 서버 모듈",
  },
  "src/lib/piiCrypto.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: null,
    description:
      "AES-256-GCM 개인정보 암복호화, HMAC-SHA256 블라인드 인덱스, 주민번호·계좌·전화 마스킹 및 scrypt 비밀번호 해시·검증을 제공",
  },
  "src/lib/popbillService.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "TAX",
    counterpart: "src/types/popbill.d.ts",
    description:
      "팝빌 SDK 기반 전자세금계산서 정식발행·임시등록·국세청 즉시전송·이메일 재전송·인증서 검증·잔액 및 포털 URL 조회를 수행하는 서버 모듈",
  },
  "src/lib/r2ErpVault.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: null,
    description:
      "환경변수 또는 erp_system_secrets 복호화 키로 S3 Signature V4 서명을 생성하여 Cloudflare R2 비공개 버킷 업로드·다운로드·삭제·Presigned URL을 제공",
  },
  "src/lib/rentalFeeUtils.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "RENTAL",
    counterpart: "src/lib/rentalSchemaInit.ts",
    description:
      "월단가·직접입력 일단가·월단가 30분할 천원 반올림 일단가 산출, 레거시 일단가 판별, 과금 기준 추론 및 가동일수 기반 공급가액 계산을 수행",
  },
  "src/lib/rentalMaintenanceDomain.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: "src/lib/rentalMaintenanceSchema.ts",
    description:
      "렌탈 장비 정비 유형·점검표·소모품 마모 기준 상수를 정의하고 예방정비 일정(OVERDUE·DUE_SOON) 및 시간 기반 부품 마모도를 계산하는 모듈",
  },
  "src/lib/rentalMaintenanceSchema.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: "src/lib/rentalMaintenanceDomain.ts",
    description:
      "정비차량·부품재고·정비이력·가동시간·마모상태 테이블 DDL 멱등 초기화(ensureRentalMaintenanceSchema)와 숫자 정제·검증 오류 클래스를 제공하는 스키마 기반 모듈",
  },
  "src/lib/rentalMaintPartStockTx.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: "src/lib/rentalMaintenanceSchema.ts",
    description:
      "렌탈 정비·차량재고 이동 트랜잭션 전용 부품·차량 락 및 UNNEST 기반 일괄 차감·환입·이력 적재 서버 모듈",
  },
  "src/lib/rentalMaintenanceTxService.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: "src/lib/rentalMaintPartStockTx.ts",
    description:
      "렌탈 정비 등록·수정 오케스트레이션, 정비차량·장비 검증 및 rentalMaintPartStockTx 연계 정비이력·예방정비 알림 트랜잭션 서버 서비스 모듈",
  },
  "src/lib/rentalOperatingHoursTxService.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "RENTAL_MAINTENANCE",
    counterpart: "src/lib/rentalMaintenanceSchema.ts",
    description:
      "장비 누적 가동시간 기록, 지게차 보증 가동시간 동기화 및 UNNEST 기반 소모품 마모 상태 일괄 리셋·기준 설정 트랜잭션 서버 서비스 모듈",
  },
  "src/lib/rentalSchemaInit.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "RENTAL",
    counterpart: "src/lib/rentalFeeUtils.ts",
    description:
      "erp_rental_contracts.rate_basis 및 erp_rental_assets.current_daily_rate 컬럼을 멱등 추가하는 서버 전용 렌탈 스키마 초기화 모듈",
  },
  "src/lib/supabaseErp.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "SHARED",
    counterpart: null,
    description:
      "Supabase 서비스 클라이언트(supabaseErp)와 전역 싱글턴 pg Pool 연결 풀(getErpPool)을 생성·관리하는 서버 전용 DB 접속 모듈",
  },
  "src/lib/tradeInventoryDomain.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "TRADE",
    counterpart: null,
    description:
      "매입전표·주기장입고 기반 Reverse-FIFO 잔여 재고 로트 산출, 입고 경과일수·장기재고 구간 분류 및 다중 조건 재고 필터링을 수행하는 도메인 모듈",
  },
  "src/types/popbill.d.ts": {
    layer: "L8_DOMAIN_LIBS",
    menuId: "TAX",
    counterpart: "src/lib/popbillService.ts",
    description:
      "외부 popbill CommonJS 패키지의 TypeScript 모듈 임포트 타입 체크 통과를 위한 ambient 모듈 선언 파일",
  },

  // =========================================================================
  // L9_DB_RPA_SCRIPTS (11)
  // =========================================================================
  "schema.sql": {
    layer: "L9_DB_RPA_SCRIPTS",
    menuId: "SCHEMA",
    counterpart: null,
    description:
      "임직원·근태·문서함·렌탈자산·계약·배차·소모품·전표·세금계산서·소프트웨어 주문·라이선스·상품 플랜 등 19개 코어 테이블을 정의하는 PostgreSQL DDL",
  },
  "scripts/init_erp_supabase.cjs": {
    layer: "L9_DB_RPA_SCRIPTS",
    menuId: "SCHEMA",
    counterpart: null,
    description:
      "erp_employees·연차·매매·렌탈·용역·세금계산서·감사로그 등 15개 ERP 초기 테이블 DDL을 실행하고 초기 관리자 계정을 삽입하는 초기화 스크립트",
  },
  "scripts/migrate_ebro_features.cjs": {
    layer: "L9_DB_RPA_SCRIPTS",
    menuId: "SCHEMA",
    counterpart: null,
    description:
      "부서(erp_departments), 사원 확장 컬럼, 결재규칙·결재요청·결재단계, 연장근무, 은행거래 및 급여정산 테이블을 생성·시딩하는 마이그레이션 스크립트",
  },
  "scripts/migrate_ebro_org.cjs": {
    layer: "L9_DB_RPA_SCRIPTS",
    menuId: "ORG",
    counterpart: null,
    description:
      "erp_departments 기능 태그와 erp_employees 부서 외래키·프로필 이미지 컬럼을 추가하고 부서 트리 및 직원 department_id를 동기화하는 스크립트",
  },
  "scripts/migrate_multi_entity.cjs": {
    layer: "L9_DB_RPA_SCRIPTS",
    menuId: "SCHEMA",
    counterpart: null,
    description:
      "erp_tax_invoices 공급자 정보 컬럼과 매매·렌탈·용역·은행거래 테이블의 사업자 구분(entity_type) 컬럼을 추가·보정하는 마이그레이션 스크립트",
  },
  "scripts/migrate_permissions.cjs": {
    layer: "L9_DB_RPA_SCRIPTS",
    menuId: "PERMISSIONS",
    counterpart: null,
    description:
      "역할 마스터(erp_custom_roles)·메뉴권한(erp_role_permissions)·사원 role_code 컬럼을 생성하고 5개 기본 역할·권한을 시딩하는 스크립트",
  },
  "scripts/hometax-rpa-collect.cjs": {
    layer: "L9_DB_RPA_SCRIPTS",
    menuId: "RPA",
    counterpart: null,
    description:
      "다운로드 폴더 홈택스 세금계산서 엑셀·CSV를 파싱해 매입·매출 유형 분류, 수정세금계산서 상계 및 중복 검사 후 erp_tax_invoices에 적재하는 RPA 스크립트",
  },
  "scripts/generate_code_file_spec.cjs": {
    layer: "L9_DB_RPA_SCRIPTS",
    menuId: "SHARED",
    counterpart: "scripts/code_file_descriptions.cjs",
    description:
      "TypeScript AST 정·역방향 의존성·Export·DB 테이블·최적화 지표를 추출해 docs/CODE_FILE_SPECIFICATION.md 및 docs/code_file_manifest.json을 생성·검증·조회하는 엔진",
  },
  "scripts/code_file_descriptions.cjs": {
    layer: "L9_DB_RPA_SCRIPTS",
    menuId: "SHARED",
    counterpart: "scripts/generate_code_file_spec.cjs",
    description:
      "계층별 분할 사전(uiDescriptions.cjs, uiSubmoduleDescriptions.cjs, serverDescriptions.cjs)을 병합해 www.dragonrpa.co.kr/erp 구성 코드 파일 명세 사전(SSOT)을 내보내는 엔트리 모듈",
  },
  "scripts/descriptions/uiDescriptions.cjs": {
    layer: "L9_DB_RPA_SCRIPTS",
    menuId: "SHARED",
    counterpart: "scripts/descriptions/uiSubmoduleDescriptions.cjs",
    description:
      "L1~L3 및 L5 UI 셸·공통 컴포넌트·탭·정적 데이터 계층 파일의 계층·menuId·연관 쌍·무수식어 기능 명세 사전 모듈",
  },
  "scripts/descriptions/uiSubmoduleDescriptions.cjs": {
    layer: "L9_DB_RPA_SCRIPTS",
    menuId: "SHARED",
    counterpart: "scripts/descriptions/uiDescriptions.cjs",
    description:
      "L4 도메인 하위 패널·모달·타입·훅 계층 파일의 계층·menuId·연관 쌍·무수식어 기능 명세 사전 모듈",
  },
  "scripts/descriptions/serverDescriptions.cjs": {
    layer: "L9_DB_RPA_SCRIPTS",
    menuId: "SHARED",
    counterpart: "scripts/descriptions/uiDescriptions.cjs",
    description:
      "L6~L9 API 라우트·연계 라우트·도메인 라이브러리·DB/RPA/명세 스크립트 파일의 계층·menuId·연관 쌍·무수식어 기능 명세 사전 모듈",
  },
};

module.exports = { SERVER_FILE_DESCRIPTIONS };
