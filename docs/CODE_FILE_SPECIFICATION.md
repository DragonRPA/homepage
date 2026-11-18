# `www.dragonrpa.co.kr/erp` 코드 파일 목록 및 기능 명세서 (SSOT)

> [!NOTE]
> 본 문서는 전사 시스템 개발 표준 헌장 **1.5조** 및 **카테고리 XV(15.1~15.5조)**에 따라 TypeScript AST 분석 엔진(`scripts/generate_code_file_spec.cjs`)과 기능 설명 사전(`scripts/code_file_descriptions.cjs`)으로 생성되는 단일 진실의 원천(SSOT)이다.

- **대상 서비스**: `https://www.dragonrpa.co.kr/erp` (드래곤알피에이 통합 ERP & 그룹웨어 웹앱)
- **스키마 버전 / 무결성 지문**: `v1.0.0` / `801a8ebd7cc2369a`
- **총 구성 코드 파일**: **283개** (157,550줄, 9,213.2 KB)
- **기계 판독 매니페스트**: [code_file_manifest.json](file:///D:/01.AntiGravity/www.dragonrpa.co.kr/docs/code_file_manifest.json)
- **비대상 경계**: 동일 저장소 내 공식 홈페이지·스토어·스케치 릴레이·배포 정리 파일(47개)은 부록 B에 분리 명시한다.

---

## 제1장. 개요 및 계층별 요약

### 1.1 아키텍처 구성 및 계층별 통계

| 계층 코드 | 계층명 | 대상 경로 범위 | 파일 수 | 총 라인 수 | 총 용량(KB) | 명세 시작 라인 |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `L1_SHELL_SECURITY` | 진입 셸 및 보안 가드 계층 | src/app/erp/ · src/middleware.ts · ClientSecurityGuard | 10 | 3,356 | 111 | L231 |
| `L2_UI_SHARED` | 공통 UI 컴포넌트 계층 | src/app/erp/components/* | 9 | 2,832 | 105.6 | L315 |
| `L3_UI_TABS` | 메뉴 탭 화면 계층 | src/app/erp/components/*Tab.tsx | 33 | 25,444 | 1,088.1 | L391 |
| `L4_UI_SUBMODULES` | 도메인 하위 패널·모달·타입 계층 | src/app/erp/components/<domain>/* | 90 | 44,702 | 2,071.4 | L659 |
| `L5_STATIC_DATA` | 회계기준 정적 데이터 계층 | src/app/erp/data/* | 6 | 2,170 | 140.1 | L1383 |
| `L6_API_ROUTES` | 백엔드 API 라우트 및 집계 엔진 계층 | src/app/api/erp/** | 74 | 57,929 | 4,916.9 | L1435 |
| `L7_LINKED_ROUTES` | 외부 공유·주주명부 연계 라우트 계층 | src/app/share/** · src/app/shareholder-registry/** | 5 | 1,633 | 64.5 | L2031 |
| `L8_DOMAIN_LIBS` | 공통 도메인·보안·연동 라이브러리 계층 | src/lib/* · src/types/* | 44 | 14,318 | 491.5 | L2075 |
| `L9_DB_RPA_SCRIPTS` | DB 스키마·마이그레이션·RPA·명세 스크립트 계층 | schema.sql · scripts/*.cjs | 12 | 5,166 | 224 | L2431 |
| **합계** | **전체 9개 계층** | **`/erp` 종단 의존성 범위 전수** | **283** | **157,550** | **9,213.2** | **L229** |

### 1.2 전체 목차 및 시작 라인 색인

- **제1장. 개요 및 계층별 요약**: L14
- **제2장. 코드 최적화 레이더 (헌장 15.3조 정량 지표)**: L59
- **제3장. 7개 그룹·34개 `ErpMenuKey` 메뉴 ↔ UI 탭 ↔ API ↔ 권한키 1:1 매핑 총괄표**: L186
- **제4장. 계층별 전체 코드 파일 상세 기능 명세 (283개 전수)**: L229
  - **4.1 `L1_SHELL_SECURITY` (진입 셸 및 보안 가드 계층, 10개)**: L231
  - **4.2 `L2_UI_SHARED` (공통 UI 컴포넌트 계층, 9개)**: L315
  - **4.3 `L3_UI_TABS` (메뉴 탭 화면 계층, 33개)**: L391
  - **4.4 `L4_UI_SUBMODULES` (도메인 하위 패널·모달·타입 계층, 90개)**: L659
  - **4.5 `L5_STATIC_DATA` (회계기준 정적 데이터 계층, 6개)**: L1383
  - **4.6 `L6_API_ROUTES` (백엔드 API 라우트 및 집계 엔진 계층, 74개)**: L1435
  - **4.7 `L7_LINKED_ROUTES` (외부 공유·주주명부 연계 라우트 계층, 5개)**: L2031
  - **4.8 `L8_DOMAIN_LIBS` (공통 도메인·보안·연동 라이브러리 계층, 44개)**: L2075
  - **4.9 `L9_DB_RPA_SCRIPTS` (DB 스키마·마이그레이션·RPA·명세 스크립트 계층, 12개)**: L2431
- **부록 A. ERP 참조 정적 문서 목록 (39종)**: L2533
- **부록 B. 동일 저장소 내 비ERP 제외 파일 경계 (47개)**: L2581

### 1.3 명세 동기화·검증·영향도 조회 명령

| 목적 | 실행 명령 (Windows PowerShell 기준) | 동작 |
| :--- | :--- | :--- |
| 명세서·매니페스트 재생성 | `npm.cmd run spec:sync` | AST 재분석 후 JSON 매니페스트 및 마크다운 명세서 동기화 |
| 정합성·규정 게이트 검증 | `npm.cmd run spec:verify` | 파일 누락·설명 미기재·금지 수식어·민감문자·동기화 상태 검사 (`exit 0`) |
| 수정 전 영향도 조회 | `npm.cmd run spec:query -- <검색어>` | 파일·심볼·테이블·`menuId` 검색 및 `importedBy` 역참조 목록 출력 |

---

## 제2장. 코드 최적화 레이더 (헌장 15.3조 정량 지표)

### 2.1 비대 코드 모듈 (`GOD_FILE`: 0개) 및 대용량 정적 데이터 (`LARGE_STATIC_DATA`: 3개)

코드 파일(`.ts`, `.tsx`, `.cjs`) 기준 `1,500줄 이상` 또는 `80KB 초과` 항목을 `GOD_FILE`로 분류하고, `.json` 및 `src/app/erp/data/*` 정적 데이터 파일은 `LARGE_STATIC_DATA`로 분리 표기한다.

#### 2.1.1 비대 코드 모듈 (`GOD_FILE`)

| 순위 | 파일 경로 | 계층 | 라인 수 | 용량(KB) | `Fan-In` | 권고 분할 경계 |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |

#### 2.1.2 대용량 정적 데이터 (`LARGE_STATIC_DATA`)

| 파일 경로 | 계층 | 라인 수 | 용량(KB) | 용도 |
| :--- | :--- | :---: | :---: | :--- |
| `src/app/api/erp/accounting-standards/generalStandardsData.json` | `L6_API_ROUTES` | 1 | 2162.2 | 일반기업회계기준 개념체계, 제1~33장 조문 본문, 실무지침 ID, 검색 키워드, 원문 PDF 경로를 수록한 정적 JSON 데이터셋 |
| `src/app/api/erp/rental-directory/officialDirectoryData.json` | `L6_API_ROUTES` | 27389 | 1422.3 | FL·AWP·OA_PC 업종 검증 렌탈 사업자 상호·사업자번호·대표자·소재지·KSIC·매출상태를 수록한 시드 JSON |
| `src/app/api/erp/accounting-standards/smeStandardsData.json` | `L6_API_ROUTES` | 1 | 189.8 | 중소기업회계기준 메타정보, 기준·해설 장목록, 제1조~부칙·별지서식 조문 데이터를 수록한 정적 JSON 데이터셋 |

### 2.2 고결합 허브 모듈 (`HIGH_COUPLING_HUB`, `Fan-In >= 8`: 23개)

| 순위 | 파일 경로 | 계층 | `Fan-In` | 규모(줄 / KB) | 주요 역할 |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | `src/lib/erpFormat.ts` | `L8_DOMAIN_LIBS` | 79 | 215L / 7.2KB | 숫자·통화·수량 포맷팅, 정수 입력 정제 및 3단계 테이블 정렬(cycleErpSort, sortErpItems)을 제공하는 전사 공용 포맷·정렬 SSOT 모듈 |
| 2 | `src/lib/supabaseErp.ts` | `L8_DOMAIN_LIBS` | 64 | 35L / 1.1KB | Supabase 서비스 클라이언트(supabaseErp)와 전역 싱글턴 pg Pool 연결 풀(getErpPool)을 생성·관리하는 서버 전용 DB 접속 모듈 |
| 3 | `src/lib/forkliftDomain.ts` | `L8_DOMAIN_LIBS` | 43 | 360L / 12KB | 지게차 완제품·옵션·부품 분류 상수, 제원 JSON 파싱·요약, 장착 옵션 금액 집계 및 보증 만료일·가동시간 기준 보증 상태 판정 함수를 제공 |
| 4 | `src/app/erp/components/SortableTh.tsx` | `L2_UI_SHARED` | 40 | 104L / 3KB | 테이블 3단계 정렬 훅(useErpTableSort) 및 헤더 컴포넌트(SortableTh). 컬럼 클릭 시 오름차순·내림차순·정렬안함 순환 및 aria-sort 속성 반영. |
| 5 | `src/app/erp/components/SearchSelectCombobox.tsx` | `L2_UI_SHARED` | 23 | 813L / 25.1KB | 한글 초성 검색·포탈 드롭다운 지원 콤보박스. 자유 입력(allowFreeText), 초성 필터 바, 배지 색상 표시, 키보드 탐색 및 뷰포트 기준 상하 위치 계산. |
| 6 | `src/lib/rentalFeeUtils.ts` | `L8_DOMAIN_LIBS` | 21 | 176L / 6KB | 월단가·직접입력 일단가·월단가 30분할 천원 반올림 일단가 산출, 레거시 일단가 판별, 과금 기준 추론 및 가동일수 기반 공급가액 계산을 수행 |
| 7 | `src/lib/erpSchemaCache.ts` | `L8_DOMAIN_LIBS` | 18 | 61L / 2.5KB | 프로세스 수명 동안 스키마 DDL 초기화를 키별 1회 실행으로 캐싱하고 erp_* 핵심 조회 테이블의 성능 인덱스를 멱등 생성하는 서버 유틸 |
| 8 | `src/lib/hangulSearch.ts` | `L8_DOMAIN_LIBS` | 18 | 307L / 9.6KB | 복자음 분해, 초성 추출, 정규식 매처 캐싱, 다중 토큰 AND 통합검색, 거래처명 정제 및 가나다순 정렬을 수행하는 한글 초성 검색 유틸 |
| 9 | `src/lib/erpHrLaborDomain.ts` | `L8_DOMAIN_LIBS` | 17 | 751L / 25.4KB | 연차 휴가 유형·비례연차 부여·평일수 산출, 공휴일 판별, 초과근무 가산수당 및 209시간 주휴 입퇴사 일할계산을 제공하는 인사·노무 도메인 SSOT 모듈 |
| 10 | `src/lib/partnerStatusClient.ts` | `L8_DOMAIN_LIBS` | 16 | 158L / 5.1KB | 사업자번호 정규화, 거래처·국세청 휴폐업 상태 기반 거래차단 판별, 배지 메타정보 생성 및 차단 거래처 매칭을 제공하는 클라이언트·서버 공용 모듈 |
| 11 | `src/lib/businessEntities.ts` | `L8_DOMAIN_LIBS` | 15 | 103L / 3.4KB | 법인·개인 두 사업자 엔티티의 사업자번호·계좌·자본금·주소 메타데이터 상수와 사업자번호·계좌번호 기반 엔티티 조회 함수를 제공하는 SSOT 모듈 |
| 12 | `src/app/erp/components/ContractTaxInvoiceSection.tsx` | `L2_UI_SHARED` | 13 | 571L / 25.5KB | 계약·청구 내 세금계산서 제원 입력 공통 섹션. 공급받는자 사업자 정보 추출(extractPartnerTaxSpec), 영수·청구 구분, 품목 행 추가·삭제 및 공급가액·세액 합산. |
| 13 | `src/lib/erpContractTemplate.ts` | `L8_DOMAIN_LIBS` | 12 | 139L / 5.7KB | 계약 품목명·세금계산서 비고 치환식 평가(resolveContractItemTemplate, resolveContractTaxItemsTemplate) 및 우선 종목 추출(selectPreferredBizItem)을 제공 |
| 14 | `src/lib/piiCrypto.ts` | `L8_DOMAIN_LIBS` | 12 | 185L / 7KB | AES-256-GCM 개인정보 암복호화, HMAC-SHA256 블라인드 인덱스, 주민번호·계좌·전화 마스킹 및 scrypt 비밀번호 해시·검증을 제공 |
| 15 | `src/lib/rentalMaintenanceDomain.ts` | `L8_DOMAIN_LIBS` | 12 | 429L / 13KB | 렌탈 장비 정비 유형·점검표·소모품 마모 기준 상수를 정의하고 예방정비 일정(OVERDUE·DUE_SOON) 및 시간 기반 부품 마모도를 계산하는 모듈 |
| 16 | `src/app/erp/components/partners/partnerTypes.ts` | `L4_UI_SUBMODULES` | 11 | 108L / 2.6KB | 은행 목록 상수(KOREAN_BANKS), 문서 뷰어 상태(ActiveDocumentViewer), 거래처 담당자(PartnerContact), 거래처 마스터(Partner) 및 탭 Props 타입을 정의한다. |
| 17 | `src/lib/forkliftSchemaInit.ts` | `L8_DOMAIN_LIBS` | 10 | 113L / 5KB | 매매·렌탈 제품·판매·자산·계약 테이블에 지게차 제원·옵션·보증 컬럼을 추가하고 보증·클레임 테이블을 멱등 생성하는 스키마 초기화 모듈 |
| 18 | `src/app/erp/components/ForkliftOptionAttachPanel.tsx` | `L2_UI_SHARED` | 9 | 277L / 10.8KB | 지게차 부착·설치 옵션 등록 패널. 판매(SALE)·임대(RENTAL) 모드별 카탈로그 초성 검색 선택, 수량·단가·공임·월/일 추가료 입력 및 옵션 합계 산출. |
| 19 | `src/lib/partnerStatusService.ts` | `L8_DOMAIN_LIBS` | 9 | 304L / 9.9KB | erp_partners 국세청 상태 컬럼 보강, 홈택스 사업자 상태 단건·배치 조회 파싱 및 거래 생성 전 차단 거래처 검증 예외 발생을 수행하는 서버 모듈 |
| 20 | `src/lib/erpApprovalLine.ts` | `L8_DOMAIN_LIBS` | 8 | 380L / 14.3KB | 직급·직책 서열 점수 산출, 대표이사 결재 배제, 부서장 전결 및 업무개선활동 결재선 산출과 결재선 역전 검증을 수행하는 순수 도메인 유틸 |
| 21 | `src/lib/erpSecurityAudit.ts` | `L8_DOMAIN_LIBS` | 8 | 215L / 6.7KB | 클라이언트 IP 추출, 세션 쿠키 헤더 생성, IP·ID별 로그인 5회 실패 10분 잠금 제어 및 erp_security_audit_logs 감사로그 기록을 수행 |
| 22 | `src/lib/r2ErpVault.ts` | `L8_DOMAIN_LIBS` | 8 | 355L / 11KB | 환경변수 또는 erp_system_secrets 복호화 키로 S3 Signature V4 서명을 생성하여 Cloudflare R2 비공개 버킷 업로드·다운로드·삭제·Presigned URL을 제공 |
| 23 | `src/lib/rentalMaintenanceSchema.ts` | `L8_DOMAIN_LIBS` | 8 | 217L / 8.8KB | 정비차량·부품재고·정비이력·가동시간·마모상태 테이블 DDL 멱등 초기화(ensureRentalMaintenanceSchema)와 숫자 정제·검증 오류 클래스를 제공하는 스키마 기반 모듈 |

### 2.3 라우트 셸 코드 스플리팅 점검 (`EAGER_ROUTE_IMPORT`: 2개, `next/dynamic` 지연 로딩: 35개)

`src/app/erp/page.tsx` 기준 활성 `*Tab.tsx` 모듈 33개(`PartnerManagementTab.tsx`는 `CUSTOMER`·`VENDOR` 공용)와 조건부 셸 모달 2개는 `next/dynamic({ ssr: false })`로 지연 로딩되며, 아래 2개 컴포넌트만 정적 `import`로 초기 번들에 포함된다.

| 구분 | 파일 경로 | 용량(KB) | 상태 및 검토 의견 |
| :--- | :--- | :---: | :--- |
| `EAGER_ROUTE_IMPORT` | `src/app/erp/components/ErpHeader.tsx` | 6.7 | 초기 인증/헤더 셸 필수 컴포넌트 (정적 로딩 유지 타당) |
| `EAGER_ROUTE_IMPORT` | `src/app/erp/components/ErpLogin.tsx` | 4.1 | 초기 인증/헤더 셸 필수 컴포넌트 (정적 로딩 유지 타당) |

### 2.4 미참조 데드코드 후보 (`ORPHAN_CANDIDATE`, `Fan-In = 0`: 0개)

진입점(`page.tsx`, `layout.tsx`, `route.ts`, `middleware.ts`, `.css`, `.json`, `.sql`, `scripts/*.cjs`, `.d.ts`)을 제외하고 AST 역참조(`importedBy`)가 0건인 파일 목록이다.

| 파일 경로 | 계층 | 라인 수 | 용량(KB) | 실사 판정 |
| :--- | :--- | :---: | :---: | :--- |

### 2.5 런타임 DB 테이블별 접근 코드 매트릭스 (55개 테이블)

> DDL 정의 전용 파일(`schema.sql`, `scripts/init_erp_supabase.cjs`, `scripts/migrate_*.cjs`)을 제외한 런타임 API·도메인 라이브러리·RPA 스크립트 기준 테이블 접근 현황이다.

| DB 테이블명 | 접근 파일 수 | 접근 파일 목록 |
| :--- | :---: | :--- |
| `consumable_items` | 1 | `src/app/api/erp/consumables/route.ts` |
| `erp_ai_intel_settings` | 2 | `src/app/api/erp/gov-support/route.ts`, `src/lib/groqServerKey.ts` |
| `erp_annual_leave_resets` | 1 | `src/app/api/erp/employees/reset-leave/route.ts` |
| `erp_approval_requests` | 4 | `src/app/api/erp/approvals/route.ts`, `src/app/api/erp/leaves/route.ts`, `src/app/api/erp/overtimes/route.ts`, `src/app/api/erp/work-improvements/route.ts` |
| `erp_approval_rules` | 5 | `src/app/api/erp/approvals/route.ts`, `src/app/api/erp/approvals/rules/route.ts`, `src/app/api/erp/leaves/route.ts`, `src/app/api/erp/overtimes/route.ts`, `src/app/api/erp/work-improvements/route.ts` |
| `erp_approval_steps` | 4 | `src/app/api/erp/approvals/route.ts`, `src/app/api/erp/leaves/route.ts`, `src/app/api/erp/overtimes/route.ts`, `src/app/api/erp/work-improvements/route.ts` |
| `erp_asset_depreciation_logs` | 3 | `src/app/api/erp/assets/depreciation/route.ts`, `src/app/api/erp/rental/depreciation/route.ts`, `src/lib/erpDepreciationSync.ts` |
| `erp_asset_hour_logs` | 5 | `src/app/api/erp/rental/operating-hours/route.ts`, `src/lib/erpInoutTxService.ts`, `src/lib/rentalMaintenanceSchema.ts`, `src/lib/rentalMaintenanceTxService.ts`, `src/lib/rentalOperatingHoursTxService.ts` |
| `erp_asset_inout_logs` | 5 | `src/app/api/erp/assets/logs/route.ts`, `src/app/api/erp/assets/route.ts`, `src/app/api/erp/inout/route.ts`, `src/lib/erpInoutTxService.ts`, `src/lib/erpRentalContractService.ts` |
| `erp_asset_wear_states` | 3 | `src/app/api/erp/rental/operating-hours/route.ts`, `src/lib/rentalMaintenanceSchema.ts`, `src/lib/rentalOperatingHoursTxService.ts` |
| `erp_audit_logs` | 11 | `src/app/api/erp/employees/reset-leave/route.ts`, `src/app/api/erp/partners/check-biz-status/route.ts`, `src/app/api/erp/rental/assets/route.ts`, `src/app/api/erp/rental/contracts/route.ts`, `src/app/api/erp/rental/depreciation/route.ts`, `src/app/api/erp/services/contracts/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/app/api/erp/trade/purchases/route.ts`, `src/app/api/erp/trade/sales/route.ts`, `src/app/api/erp/warranties/claims/route.ts`, `src/lib/erpInoutTxService.ts` |
| `erp_bank_transactions` | 7 | `src/app/api/erp/bank-matching/route.ts`, `src/app/api/erp/financial-report/financialStatementsBuilder.ts`, `src/app/api/erp/financial-report/route.ts`, `src/app/api/erp/tax-invoices/reconcile/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/lib/erpBankClosing.ts`, `src/lib/erpBankReconcileService.ts` |
| `erp_corporate_document_versions` | 1 | `src/app/api/erp/corporate-docs/route.ts` |
| `erp_corporate_documents` | 1 | `src/app/api/erp/corporate-docs/route.ts` |
| `erp_custom_roles` | 1 | `src/app/api/erp/permissions/route.ts` |
| `erp_departments` | 6 | `src/app/api/erp/departments/route.ts`, `src/app/api/erp/employees/reset-leave/route.ts`, `src/app/api/erp/employees/route.ts`, `src/app/api/erp/organization/batch/route.ts`, `src/app/api/erp/work-improvements/route.ts`, `src/lib/erpApprovalServer.ts` |
| `erp_employees` | 23 | `src/app/api/erp/approvals/route.ts`, `src/app/api/erp/auth/change-password/route.ts`, `src/app/api/erp/auth/login/route.ts`, `src/app/api/erp/auth/session/route.ts`, `src/app/api/erp/departments/route.ts`, `src/app/api/erp/employees/reset-leave/route.ts`, `src/app/api/erp/employees/route.ts`, `src/app/api/erp/employment-contracts/route.ts`, `src/app/api/erp/expenses/route.ts`, `src/app/api/erp/leaves/route.ts`, `src/app/api/erp/organization/batch/route.ts`, `src/app/api/erp/overtimes/route.ts`, `src/app/api/erp/payroll/ocr/route.ts`, `src/app/api/erp/payroll/route.ts`, `src/app/api/erp/permissions/route.ts`, `src/app/api/erp/rental/maintenance/route.ts`, `src/app/api/erp/rental/vehicles/route.ts`, `src/app/api/erp/services/contracts/route.ts`, `src/app/api/erp/work-improvements/route.ts`, `src/lib/erpApprovalServer.ts`, `src/lib/erpExpenseSchema.ts`, `src/lib/rentalMaintenanceSchema.ts`, `src/lib/rentalMaintenanceTxService.ts` |
| `erp_employment_contracts` | 1 | `src/app/api/erp/employment-contracts/route.ts` |
| `erp_expense_receipts` | 3 | `src/app/api/erp/expenses/route.ts`, `src/app/api/erp/payroll/route.ts`, `src/lib/erpExpenseSchema.ts` |
| `erp_financial_remarks` | 2 | `src/app/api/erp/financial-report/financialStatementsBuilder.ts`, `src/app/api/erp/financial-report/route.ts` |
| `erp_forklift_warranties` | 8 | `src/app/api/erp/assets/route.ts`, `src/app/api/erp/trade/sales/route.ts`, `src/app/api/erp/warranties/claims/route.ts`, `src/app/api/erp/warranties/route.ts`, `src/lib/erpInoutTxService.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/forkliftWarrantyService.ts`, `src/lib/rentalOperatingHoursTxService.ts` |
| `erp_forklift_warranty_claims` | 4 | `src/app/api/erp/trade/sales/route.ts`, `src/app/api/erp/warranties/claims/route.ts`, `src/app/api/erp/warranties/route.ts`, `src/lib/forkliftSchemaInit.ts` |
| `erp_gov_support_items` | 1 | `src/app/api/erp/gov-support/route.ts` |
| `erp_hometax_rpa_settings` | 2 | `scripts/hometax-rpa-collect.cjs`, `src/app/api/erp/tax-invoices/hometax/route.ts` |
| `erp_leave_requests` | 4 | `src/app/api/erp/approvals/route.ts`, `src/app/api/erp/employees/route.ts`, `src/app/api/erp/leaves/route.ts`, `src/app/api/erp/organization/batch/route.ts` |
| `erp_obsidian_notes` | 1 | `src/app/api/erp/obsidian/route.ts` |
| `erp_overtimes` | 3 | `src/app/api/erp/approvals/route.ts`, `src/app/api/erp/overtimes/route.ts`, `src/app/api/erp/payroll/route.ts` |
| `erp_part_stock_movements` | 4 | `src/app/api/erp/rental/vehicle-stocks/route.ts`, `src/app/api/erp/trade/products/route.ts`, `src/lib/rentalMaintPartStockTx.ts`, `src/lib/rentalMaintenanceSchema.ts` |
| `erp_partner_contacts` | 3 | `src/app/api/erp/partners/contacts/route.ts`, `src/app/api/erp/partners/route.ts`, `src/app/api/erp/tax-invoices/route.ts` |
| `erp_partners` | 13 | `src/app/api/erp/inout/route.ts`, `src/app/api/erp/partners/check-biz-status/route.ts`, `src/app/api/erp/partners/route.ts`, `src/app/api/erp/rental-directory/rentalDirectorySyncService.ts`, `src/app/api/erp/rental/contracts/route.ts`, `src/app/api/erp/services/contracts/route.ts`, `src/app/api/erp/tax-invoices/popbill/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/app/api/erp/trade/billings/route.ts`, `src/app/api/erp/trade/sales/route.ts`, `src/lib/erpInoutTxService.ts`, `src/lib/erpRentalContractService.ts`, `src/lib/partnerStatusService.ts` |
| `erp_payroll_records` | 5 | `src/app/api/erp/approvals/route.ts`, `src/app/api/erp/expenses/route.ts`, `src/app/api/erp/payroll/route.ts`, `src/app/api/erp/services/contracts/route.ts`, `src/lib/erpExpenseSchema.ts` |
| `erp_rental_assets` | 23 | `src/app/api/erp/assets/depreciation/route.ts`, `src/app/api/erp/assets/route.ts`, `src/app/api/erp/financial-report/route.ts`, `src/app/api/erp/inout/route.ts`, `src/app/api/erp/products/route.ts`, `src/app/api/erp/rental/assets/route.ts`, `src/app/api/erp/rental/billings/route.ts`, `src/app/api/erp/rental/contracts/route.ts`, `src/app/api/erp/rental/depreciation/route.ts`, `src/app/api/erp/rental/maintenance/route.ts`, `src/app/api/erp/rental/operating-hours/route.ts`, `src/app/api/erp/rental/vehicle-stocks/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/app/api/erp/warranties/claims/route.ts`, `src/app/api/erp/warranties/route.ts`, `src/lib/erpDepreciationSync.ts`, `src/lib/erpInoutTxService.ts`, `src/lib/erpRentalContractService.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/rentalMaintenanceSchema.ts`, `src/lib/rentalMaintenanceTxService.ts`, `src/lib/rentalOperatingHoursTxService.ts`, `src/lib/rentalSchemaInit.ts` |
| `erp_rental_billings` | 9 | `scripts/hometax-rpa-collect.cjs`, `src/app/api/erp/inout/route.ts`, `src/app/api/erp/rental/billings/route.ts`, `src/app/api/erp/rental/contracts/route.ts`, `src/app/api/erp/tax-invoices/hometax/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/lib/erpBankReconcileService.ts`, `src/lib/erpInoutTxService.ts`, `src/lib/erpTaxReconcileEngine.ts` |
| `erp_rental_biz_directory` | 2 | `src/app/api/erp/rental-directory/rentalDirectorySyncService.ts`, `src/app/api/erp/rental-directory/route.ts` |
| `erp_rental_contracts` | 9 | `src/app/api/erp/inout/route.ts`, `src/app/api/erp/partners/route.ts`, `src/app/api/erp/rental/billings/route.ts`, `src/app/api/erp/rental/contracts/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/lib/erpInoutTxService.ts`, `src/lib/erpRentalContractService.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/rentalSchemaInit.ts` |
| `erp_rental_maintenance_parts` | 4 | `src/app/api/erp/rental/maintenance/route.ts`, `src/lib/rentalMaintPartStockTx.ts`, `src/lib/rentalMaintenanceSchema.ts`, `src/lib/rentalMaintenanceTxService.ts` |
| `erp_rental_maintenances` | 4 | `src/app/api/erp/rental/maintenance/route.ts`, `src/app/api/erp/rental/vehicle-stocks/route.ts`, `src/lib/rentalMaintenanceSchema.ts`, `src/lib/rentalMaintenanceTxService.ts` |
| `erp_rental_products` | 17 | `src/app/api/erp/assets/depreciation/route.ts`, `src/app/api/erp/assets/route.ts`, `src/app/api/erp/financial-report/route.ts`, `src/app/api/erp/inout/route.ts`, `src/app/api/erp/products/route.ts`, `src/app/api/erp/rental/assets/route.ts`, `src/app/api/erp/rental/billings/route.ts`, `src/app/api/erp/rental/contracts/route.ts`, `src/app/api/erp/rental/maintenance/route.ts`, `src/app/api/erp/rental/operating-hours/route.ts`, `src/app/api/erp/rental/products/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/lib/erpDepreciationSync.ts`, `src/lib/erpInoutTxService.ts`, `src/lib/erpRentalContractService.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/rentalMaintenanceTxService.ts` |
| `erp_role_permissions` | 3 | `src/app/api/erp/employees/route.ts`, `src/app/api/erp/permissions/route.ts`, `src/lib/erpRbacGuard.ts` |
| `erp_security_audit_logs` | 1 | `src/lib/erpSecurityAudit.ts` |
| `erp_service_billings` | 7 | `scripts/hometax-rpa-collect.cjs`, `src/app/api/erp/services/billings/route.ts`, `src/app/api/erp/services/contracts/route.ts`, `src/app/api/erp/tax-invoices/hometax/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/lib/erpBankReconcileService.ts`, `src/lib/erpTaxReconcileEngine.ts` |
| `erp_service_contracts` | 5 | `src/app/api/erp/partners/route.ts`, `src/app/api/erp/payroll/route.ts`, `src/app/api/erp/services/billings/route.ts`, `src/app/api/erp/services/contracts/route.ts`, `src/app/api/erp/tax-invoices/route.ts` |
| `erp_service_vehicles` | 6 | `src/app/api/erp/rental/maintenance/route.ts`, `src/app/api/erp/rental/vehicle-stocks/route.ts`, `src/app/api/erp/rental/vehicles/route.ts`, `src/lib/rentalMaintPartStockTx.ts`, `src/lib/rentalMaintenanceSchema.ts`, `src/lib/rentalMaintenanceTxService.ts` |
| `erp_share_files` | 4 | `src/app/api/erp/cloud-shares/files/route.ts`, `src/app/api/erp/cloud-shares/route.ts`, `src/app/api/share/[code]/download/route.ts`, `src/app/api/share/[code]/route.ts` |
| `erp_share_folders` | 4 | `src/app/api/erp/cloud-shares/files/route.ts`, `src/app/api/erp/cloud-shares/route.ts`, `src/app/api/share/[code]/download/route.ts`, `src/app/api/share/[code]/route.ts` |
| `erp_shareholder_registry` | 1 | `src/app/api/erp/shareholder-registry/route.ts` |
| `erp_system_secrets` | 2 | `src/app/api/erp/rental-directory/route.ts`, `src/lib/r2ErpVault.ts` |
| `erp_tax_invoices` | 16 | `scripts/hometax-rpa-collect.cjs`, `src/app/api/erp/assets/depreciation/route.ts`, `src/app/api/erp/bank-matching/route.ts`, `src/app/api/erp/financial-report/financialStatementsBuilder.ts`, `src/app/api/erp/financial-report/route.ts`, `src/app/api/erp/rental/billings/route.ts`, `src/app/api/erp/services/billings/route.ts`, `src/app/api/erp/tax-invoices/hometax/route.ts`, `src/app/api/erp/tax-invoices/popbill/route.ts`, `src/app/api/erp/tax-invoices/reconcile/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/app/api/erp/tax-invoices/viewer/route.ts`, `src/app/api/erp/trade/billings/route.ts`, `src/app/api/erp/trade/sales/route.ts`, `src/lib/erpBankReconcileService.ts`, `src/lib/erpDepreciationSync.ts` |
| `erp_tax_payments` | 2 | `src/app/api/erp/financial-report/financialStatementsBuilder.ts`, `src/app/api/erp/financial-report/route.ts` |
| `erp_trade_billings` | 6 | `scripts/hometax-rpa-collect.cjs`, `src/app/api/erp/tax-invoices/hometax/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/app/api/erp/trade/billings/route.ts`, `src/lib/erpBankReconcileService.ts`, `src/lib/erpTaxReconcileEngine.ts` |
| `erp_trade_products` | 11 | `src/app/api/erp/rental/maintenance/route.ts`, `src/app/api/erp/rental/vehicle-stocks/route.ts`, `src/app/api/erp/rental/vehicles/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/app/api/erp/trade/billings/route.ts`, `src/app/api/erp/trade/products/route.ts`, `src/app/api/erp/trade/purchases/route.ts`, `src/app/api/erp/trade/sales/route.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/rentalMaintPartStockTx.ts`, `src/lib/rentalMaintenanceSchema.ts` |
| `erp_trade_purchases` | 2 | `src/app/api/erp/trade/products/route.ts`, `src/app/api/erp/trade/purchases/route.ts` |
| `erp_trade_sales` | 8 | `scripts/hometax-rpa-collect.cjs`, `src/app/api/erp/tax-invoices/hometax/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/app/api/erp/trade/billings/route.ts`, `src/app/api/erp/trade/products/route.ts`, `src/app/api/erp/trade/sales/route.ts`, `src/app/api/erp/trade/settlement/route.ts`, `src/lib/forkliftSchemaInit.ts` |
| `erp_vehicle_part_stocks` | 5 | `src/app/api/erp/rental/maintenance/route.ts`, `src/app/api/erp/rental/vehicle-stocks/route.ts`, `src/app/api/erp/rental/vehicles/route.ts`, `src/lib/rentalMaintPartStockTx.ts`, `src/lib/rentalMaintenanceSchema.ts` |
| `erp_work_improvements` | 2 | `src/app/api/erp/approvals/route.ts`, `src/app/api/erp/work-improvements/route.ts` |

---

## 제3장. 7개 그룹·34개 `ErpMenuKey` 메뉴 ↔ UI 탭 ↔ API ↔ 권한키 1:1 매핑 총괄표

`src/app/erp/erpMenuConfig.ts`의 `CATEGORIES` 및 `MENU_PERM_KEY_MAP`과 `src/app/erp/page.tsx`의 `renderMenuContent` 분기를 AST로 추출한 메뉴 연결 표이다.

| 그룹 | `ErpMenuKey` | 메뉴 레이블 | 권한키(`permKey`) | 연결 UI 탭 컴포넌트 | 하위 모듈·데이터 파일 | 호출 API 엔드포인트 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 인사·근태 (`HR`) | `ORG` | 조직 인사관리 | `org` | `src/app/erp/components/OrganizationTab.tsx` | `src/app/erp/components/organization/OrgActionModalsAndAuditBar.tsx`, `src/app/erp/components/organization/OrgTreeAndMemberGrid.tsx`, `src/app/erp/components/organization/ProfileCompensationAndLeaveSection.tsx`, `src/app/erp/components/organization/SelectedProfilePanel.tsx`, `src/app/erp/components/organization/organizationTypes.ts`, `src/app/erp/components/organization/useOrganizationController.ts` | `/api/erp/departments`, `/api/erp/employees`, `/api/erp/organization/batch` |
| 인사·근태 (`HR`) | `CORPORATE_DOCS` | 법인 중요문서 (설립·정관) | `org` | `src/app/erp/components/CorporateDocumentTab.tsx` | `src/app/erp/components/corporate-docs/CorporateDocVaultSubTab.tsx`, `src/app/erp/components/corporate-docs/EntityManualSubTabs.tsx`, `src/app/erp/components/corporate-docs/TemplateStudioPreviewSheet.tsx`, `src/app/erp/components/corporate-docs/TemplateStudioSubTab.tsx`, `src/app/erp/components/corporate-docs/UploadDocModal.tsx`, `src/app/erp/components/corporate-docs/corporateDocTemplates.ts`, `src/app/erp/components/corporate-docs/corporateDocTypes.ts` | `/api/erp/corporate-docs`, `/api/erp/shareholder-registry` |
| 인사·근태 (`HR`) | `EMPLOYMENT_CONTRACT` | 근로계약서 관리 | `org` | `src/app/erp/components/EmploymentContractTab.tsx` | `src/app/erp/components/employment-contracts/ContractDocumentPreviewPanel.tsx`, `src/app/erp/components/employment-contracts/EmploymentContractFormAndListPanel.tsx`, `src/app/erp/components/employment-contracts/employmentContractTypes.ts` | `/api/erp/employees`, `/api/erp/employment-contracts`, `/api/erp/employment-contracts/ocr`, `/api/erp/vault` |
| 인사·근태 (`HR`) | `PERMISSIONS` | 사용자 및 권한 | `users` | `src/app/erp/components/PermissionsTab.tsx` | 없음 | `/api/erp/employees`, `/api/erp/permissions` |
| 인사·근태 (`HR`) | `LEAVE_APPLY` | 연차 신청 | `leave_apply` | `src/app/erp/components/LeaveApplyTab.tsx` | 없음 | `/api/erp/employees`, `/api/erp/leaves` |
| 인사·근태 (`HR`) | `LEAVE_MANAGE` | 연차 관리 | `leave_manage` | `src/app/erp/components/LeaveManageTab.tsx` | 없음 | `/api/erp/departments`, `/api/erp/employees`, `/api/erp/employees/reset-leave`, `/api/erp/leaves` |
| 인사·근태 (`HR`) | `OT_MANAGE` | 초과근무 관리 | `ot_manage` | `src/app/erp/components/OtManagementTab.tsx` | `src/app/erp/components/overtime/OtRequestModal.tsx` | `/api/erp/departments`, `/api/erp/employees`, `/api/erp/overtimes` |
| 인사·근태 (`HR`) | `EXPENSE_RECEIPT` | 개인경비 영수증 등록 | `expense_receipt` | `src/app/erp/components/ExpenseReceiptTab.tsx` | `src/app/erp/components/expenses/ExpenseCreateAndPreviewModals.tsx` | `/api/erp/departments`, `/api/erp/employees`, `/api/erp/expenses`, `/api/erp/vault` |
| 인사·근태 (`HR`) | `WORK_RULES` | 취업규칙 (표준안) | `work_rules` | `src/app/erp/components/WorkRulesTab.tsx` | `src/app/erp/data/workRulesStandardData.ts` | 없음 |
| 인사·근태 (`HR`) | `RETIREMENT_PENSION_GUIDE` | 퇴직연금 도입 안내 | `work_rules` | `src/app/erp/components/RetirementPensionGuideTab.tsx` | 없음 | 없음 |
| 전자결재 (`APPROVAL`) | `APPROVAL_INBOX` | 내 결재함 | `approval_inbox` | `src/app/erp/components/ApprovalInboxTab.tsx` | 없음 | `/api/erp/approvals` |
| 전자결재 (`APPROVAL`) | `WORK_IMPROVEMENT` | 업무개선 보고서 | `work_improvement` | `src/app/erp/components/WorkImprovementTab.tsx` | `src/app/erp/components/work-improvement/WorkImprovementA4Studio.tsx`, `src/app/erp/components/work-improvement/workImprovementTypes.ts` | `/api/erp/work-improvements` |
| 전자결재 (`APPROVAL`) | `APPROVAL_RULES` | 결재선 규칙 설정 | `approval_rules` | `src/app/erp/components/ApprovalRulesTab.tsx` | 없음 | `/api/erp/approvals/rules` |
| 재무·회계 (`FINANCE`) | `FINANCIAL_REPORT` | 경영지표 보고서 | `bank_matching` | `src/app/erp/components/FinancialReportTab.tsx` | `src/app/erp/components/financial-report/AccountingStandardModals.tsx`, `src/app/erp/components/financial-report/FinancialDetailLedgerSection.tsx`, `src/app/erp/components/financial-report/FinancialStatementsBoard.tsx`, `src/app/erp/components/financial-report/MonthlyAccountMatrixSection.tsx`, `src/app/erp/components/financial-report/financialReportTypes.ts`, `src/app/erp/data/accountSubjectStandardsMap.ts`, `src/app/erp/data/accountingStandardsMeta.ts` | `/api/erp/accounting-standards`, `/api/erp/financial-report` |
| 재무·회계 (`FINANCE`) | `BANK_MATCHING` | 은행 입출금 대장 | `bank_matching` | `src/app/erp/components/BankMatchingTab.tsx` | `src/app/erp/components/bank-matching/BankLedgerGridAndSummary.tsx`, `src/app/erp/components/bank-matching/BankMatchModal.tsx`, `src/app/erp/components/bank-matching/BankUploadModal.tsx`, `src/app/erp/components/bank-matching/ManualTransactionModal.tsx`, `src/app/erp/components/bank-matching/bankMatchingTypes.ts` | `/api/erp/bank-matching`, `/api/erp/tax-invoices` |
| 재무·회계 (`FINANCE`) | `PAYROLL` | 급여 정산 | `payroll` | `src/app/erp/components/PayrollTab.tsx` | `src/app/erp/components/payroll/PayrollEditAndOcrModals.tsx` | `/api/erp/payroll`, `/api/erp/payroll/ocr` |
| 재무·회계 (`FINANCE`) | `ACCOUNTING_STANDARD` | 중소기업회계기준 | `bank_matching` | `src/app/erp/components/AccountingStandardsTab.tsx` | `src/app/erp/data/accountingStandardsMeta.ts` | `/api/erp/accounting-standards` |
| 재무·회계 (`FINANCE`) | `GENERAL_ACCOUNTING_STANDARD` | 일반기업회계기준 | `bank_matching` | `src/app/erp/components/GeneralAccountingStandardsTab.tsx` | `src/app/erp/data/generalAccountingStandardsTypes.ts` | `/api/erp/accounting-standards` |
| 거래처 관리 (`PARTNER`) | `CUSTOMER` | 고객 관리 (매출처) | `customer` | `src/app/erp/components/PartnerManagementTab.tsx` | `src/app/erp/components/partners/BankCopyOcrModal.tsx`, `src/app/erp/components/partners/BizCertOcrModal.tsx`, `src/app/erp/components/partners/BizStatusBatchModal.tsx`, `src/app/erp/components/partners/ContactFormModal.tsx`, `src/app/erp/components/partners/PartnerDocViewerModal.tsx`, `src/app/erp/components/partners/PartnerDossierPanel.tsx`, `src/app/erp/components/partners/PartnerFormModal.tsx`, `src/app/erp/components/partners/PartnerListPanel.tsx`, `src/app/erp/components/partners/partnerFormHelpers.ts`, `src/app/erp/components/partners/partnerPdfUtils.ts`, `src/app/erp/components/partners/partnerTypes.ts`, `src/app/erp/components/partners/usePartnerDocAndNtsActions.ts` | `/api/erp/employees`, `/api/erp/partners`, `/api/erp/partners/check-biz-status`, `/api/erp/partners/contacts`, `/api/erp/partners/ocr-bank`, `/api/erp/partners/ocr-biz-cert`, `/api/erp/partners/ocr-card` |
| 거래처 관리 (`PARTNER`) | `VENDOR` | 매입거래처 관리 | `vendor` | `src/app/erp/components/PartnerManagementTab.tsx` | `src/app/erp/components/partners/BankCopyOcrModal.tsx`, `src/app/erp/components/partners/BizCertOcrModal.tsx`, `src/app/erp/components/partners/BizStatusBatchModal.tsx`, `src/app/erp/components/partners/ContactFormModal.tsx`, `src/app/erp/components/partners/PartnerDocViewerModal.tsx`, `src/app/erp/components/partners/PartnerDossierPanel.tsx`, `src/app/erp/components/partners/PartnerFormModal.tsx`, `src/app/erp/components/partners/PartnerListPanel.tsx`, `src/app/erp/components/partners/partnerFormHelpers.ts`, `src/app/erp/components/partners/partnerPdfUtils.ts`, `src/app/erp/components/partners/partnerTypes.ts`, `src/app/erp/components/partners/usePartnerDocAndNtsActions.ts` | `/api/erp/employees`, `/api/erp/partners`, `/api/erp/partners/check-biz-status`, `/api/erp/partners/contacts`, `/api/erp/partners/ocr-bank`, `/api/erp/partners/ocr-biz-cert`, `/api/erp/partners/ocr-card` |
| 자산관리 (`ASSET`) | `PRODUCT` | 제품 관리 | `product` | `src/app/erp/components/ProductManagementTab.tsx` | `src/app/erp/components/products/ProductDossierAndAddModal.tsx` | `/api/erp/assets`, `/api/erp/products` |
| 자산관리 (`ASSET`) | `ASSET` | 자산 관리 | `asset` | `src/app/erp/components/AssetManagementTab.tsx` | `src/app/erp/components/assets/AssetAcquireModal.tsx`, `src/app/erp/components/assets/AssetDepreciationLedgerView.tsx`, `src/app/erp/components/assets/AssetDossierDrawer.tsx`, `src/app/erp/components/assets/AssetSummaryAndDetailTables.tsx`, `src/app/erp/components/assets/assetTypes.ts` | `/api/erp/assets`, `/api/erp/assets/depreciation`, `/api/erp/assets/logs`, `/api/erp/products`, `/api/erp/trade/products` |
| 자산관리 (`ASSET`) | `WARRANTY` | 차대번호 보증관리 | `warranty` | `src/app/erp/components/WarrantyManagementTab.tsx` | `src/app/erp/components/warranty/WarrantyDossierAndAddModal.tsx` | `/api/erp/assets`, `/api/erp/partners`, `/api/erp/warranties`, `/api/erp/warranties/claims` |
| 자산관리 (`ASSET`) | `RENTAL_MAINTENANCE` | 렌탈 정비·부품관리 | `rental_maintenance` | `src/app/erp/components/RentalMaintenanceTab.tsx` | `src/app/erp/components/rental-maintenance/HoursWearAndVehicleStockTabs.tsx`, `src/app/erp/components/rental-maintenance/MaintenanceActivitiesAndPmSubTabs.tsx`, `src/app/erp/components/rental-maintenance/RentalMaintActivityModal.tsx`, `src/app/erp/components/rental-maintenance/RentalMaintStockVehicleModals.tsx`, `src/app/erp/components/rental-maintenance/rentalMaintenanceTypes.ts` | `/api/erp/rental/maintenance`, `/api/erp/rental/operating-hours`, `/api/erp/rental/vehicle-stocks`, `/api/erp/rental/vehicles` |
| 입출고관리 (`INOUT`) | `OUTBOUND_REG` | 출고등록 | `outbound_reg` | `src/app/erp/components/OutboundRegTab.tsx` | `src/app/erp/components/outbound/OutboundBillingAndLogsPanel.tsx` | `/api/erp/inout`, `/api/erp/products`, `/api/erp/trade/products` |
| 입출고관리 (`INOUT`) | `INBOUND_REG` | 입고등록 | `inbound_reg` | `src/app/erp/components/InboundRegTab.tsx` | 없음 | `/api/erp/inout` |
| 영업·계약 (`BUSINESS`) | `TRADE` | 판매용 (커머스) | `trade` | `src/app/erp/components/TradeTab.tsx` | `src/app/erp/components/trade/TradeInventoryAndProductsSubTabs.tsx`, `src/app/erp/components/trade/TradeProductPurchaseModals.tsx`, `src/app/erp/components/trade/TradeSaleBillingModals.tsx`, `src/app/erp/components/trade/TradeSalesBillingSubTabs.tsx`, `src/app/erp/components/trade/tradeHelpers.ts` | `/api/erp/partners`, `/api/erp/tax-invoices`, `/api/erp/trade/billings`, `/api/erp/trade/products`, `/api/erp/trade/purchases`, `/api/erp/trade/sales`, `/api/erp/trade/settlement` |
| 영업·계약 (`BUSINESS`) | `RENTAL` | 임대 계약/청구 | `rental` | `src/app/erp/components/RentalTab.tsx` | `src/app/erp/components/rental/RentalAddContractModal.tsx`, `src/app/erp/components/rental/RentalAssetModelModals.tsx`, `src/app/erp/components/rental/RentalEditContractModal.tsx`, `src/app/erp/components/rental/RentalSubTabGrids.tsx`, `src/app/erp/components/rental/rentalTypes.ts`, `src/app/erp/components/rental/useRentalTabController.ts` | `/api/erp/partners`, `/api/erp/rental/assets`, `/api/erp/rental/billings`, `/api/erp/rental/contracts`, `/api/erp/rental/depreciation`, `/api/erp/rental/products`, `/api/erp/tax-invoices`, `/api/erp/trade/products` |
| 영업·계약 (`BUSINESS`) | `SERVICES` | 용역 관리 (운영/개발) | `service` | `src/app/erp/components/ServiceTab.tsx` | `src/app/erp/components/service/ProRataFormulaGuideBox.tsx`, `src/app/erp/components/service/ServiceAddContractModal.tsx`, `src/app/erp/components/service/ServiceBillingModal.tsx`, `src/app/erp/components/service/ServiceEditContractModal.tsx`, `src/app/erp/components/service/ServiceLedgersAndDocModal.tsx`, `src/app/erp/components/service/serviceTypes.ts`, `src/app/erp/components/service/useServiceTabController.ts` | `/api/erp/employees`, `/api/erp/overtimes`, `/api/erp/partners`, `/api/erp/services/billings`, `/api/erp/services/contracts` |
| 영업·계약 (`BUSINESS`) | `TAX` | 매입·매출 세금계산서 | `tax_invoice` | `src/app/erp/components/TaxInvoiceTab.tsx` | `src/app/erp/components/tax-invoice/TaxInvoiceIssueAndDetailModals.tsx`, `src/app/erp/components/tax-invoice/TaxInvoiceReconcileModal.tsx`, `src/app/erp/components/tax-invoice/TaxKpiAndFilterBar.tsx`, `src/app/erp/components/tax-invoice/TaxLedgerSubTab.tsx`, `src/app/erp/components/tax-invoice/TaxUnissuedAndSyncSubTabs.tsx`, `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts` | `/api/erp/partners`, `/api/erp/tax-invoices`, `/api/erp/tax-invoices/hometax`, `/api/erp/tax-invoices/popbill`, `/api/erp/tax-invoices/reconcile` |
| 영업·계약 (`BUSINESS`) | `CLOUD_SHARE` | 클라우드 자료실 | `cloud_share` | `src/app/erp/components/CloudShareTab.tsx` | 없음 | `/api/erp/cloud-shares`, `/api/erp/cloud-shares/files`, `/api/share/[code]/download` |
| 영업·계약 (`BUSINESS`) | `GOV_SUPPORT` | 정부지원·뉴스·트렌드 | `gov_support` | `src/app/erp/components/GovSupportIntelTab.tsx` | `src/app/erp/components/gov-support/GovSupportDossierPanel.tsx`, `src/app/erp/components/gov-support/GovSupportModals.tsx`, `src/app/erp/components/gov-support/govSupportTypes.ts` | `/api/erp/gov-support`, `/api/erp/obsidian` |
| 영업·계약 (`BUSINESS`) | `RENTAL_BIZ_DIR` | 렌탈 사업자 DB (FL·AWP·OA) | `rental_biz_dir` | `src/app/erp/components/RentalBizDirectoryTab.tsx` | `src/app/erp/components/rental-biz-dir/PortalGuideModal.tsx`, `src/app/erp/components/rental-biz-dir/RentalBizDetailPanel.tsx`, `src/app/erp/components/rental-biz-dir/RentalBizFormModal.tsx`, `src/app/erp/components/rental-biz-dir/RentalBizToolbarAndGrid.tsx`, `src/app/erp/components/rental-biz-dir/rentalBizTypes.ts` | `/api/erp/obsidian`, `/api/erp/rental-directory` |
| 영업·계약 (`BUSINESS`) | `OBSIDIAN_VAULT` | 옵시디언 노트 (PC·폰 연동) | `obsidian_vault` | `src/app/erp/components/ObsidianVaultTab.tsx` | `src/app/erp/components/obsidian/ObsidianSyncAndErrorModals.tsx`, `src/app/erp/components/obsidian/obsidianMarkdownPreview.tsx` | `/api/erp/obsidian` |

---

## 제4장. 계층별 전체 코드 파일 상세 기능 명세 (283개 전수)

### 4.1 `L1_SHELL_SECURITY` — 진입 셸 및 보안 가드 계층 (10개)

대상 범위: src/app/erp/ · src/middleware.ts · ClientSecurityGuard

#### 4.1.1 `public/erp-manifest.json`
- **규모 / 계층 / 메뉴ID**: 31줄 (0.7 KB) / `L1_SHELL_SECURITY` / `SHELL` / 대칭·연관 쌍: `src/app/erp/layout.tsx`
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: ERP 웹앱 PWA 매니페스트 파일. 앱 명칭, 시작 경로(/erp), 스코프(/erp), standalone 디스플레이 모드, 배경·테마 색상, 아이콘 규격 정의.

#### 4.1.2 `src/app/erp/erp-theme.css`
- **규모 / 계층 / 메뉴ID**: 1054줄 (33.9 KB) / `L1_SHELL_SECURITY` / `SHELL` / 대칭·연관 쌍: `src/app/erp/components/ErpHeader.tsx`
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/erp/components/ErpLogin.tsx`, `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: ERP 테마 스타일시트. 라이트(웜 코튼 페이퍼 텍스처)·화이트(#ffffff) 모드 CSS 변수, 그림자 제거, 다중 페이지 인쇄(@media print) 규칙 정의.

#### 4.1.3 `src/app/erp/erpMenuConfig.ts`
- **규모 / 계층 / 메뉴ID**: 212줄 (6 KB) / `L1_SHELL_SECURITY` / `SHELL` / 대칭·연관 쌍: `src/app/erp/page.tsx`
- **주요 Export 심볼**: `ErpCategoryKey`, `ErpMenuKey`, `MenuItem`, `CategoryConfig`, `ErpMenuPrefs`, `CATEGORIES`, `MENU_PERM_KEY_MAP`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 3`)**: `src/app/erp/components/MenuPersonalizeModal.tsx`, `src/app/erp/page.tsx`, `src/app/erp/useErpShellController.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: ERP 7대 카테고리 및 34개 메뉴 키(ErpMenuKey), 아이콘, 메뉴별 권한 키 매핑 테이블(MENU_PERM_KEY_MAP), 개인화 설정 타입 정의.

#### 4.1.4 `src/app/erp/layout.tsx`
- **규모 / 계층 / 메뉴ID**: 21줄 (0.5 KB) / `L1_SHELL_SECURITY` / `SHELL` / 대칭·연관 쌍: `public/erp-manifest.json`
- **주요 Export 심볼**: `metadata`, `default (ErpLayout)`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: ERP 경로 레이아웃 컴포넌트. 메타데이터 제목·설명·PWA 매니페스트(/erp-manifest.json)·iOS 웹앱 설정 정의 및 하위 페이지 래핑 수행.

#### 4.1.5 `src/app/erp/page.tsx`
- **규모 / 계층 / 메뉴ID**: 762줄 (27.3 KB) / `L1_SHELL_SECURITY` / `SHELL` / 대칭·연관 쌍: `src/app/erp/useErpShellController.ts`
- **주요 Export 심볼**: `ErpCategoryKey`, `ErpMenuKey`, `default (ErpMainPage)`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/AccountingStandardsTab.tsx`, `src/app/erp/components/ApprovalInboxTab.tsx`, `src/app/erp/components/ApprovalRulesTab.tsx`, `src/app/erp/components/AssetManagementTab.tsx`, `src/app/erp/components/BankMatchingTab.tsx`, `src/app/erp/components/CloudShareTab.tsx`, `src/app/erp/components/CorporateDocumentTab.tsx`, `src/app/erp/components/EmploymentContractTab.tsx`, `src/app/erp/components/ErpHeader.tsx`, `src/app/erp/components/ErpLogin.tsx`, `src/app/erp/components/ExpenseReceiptTab.tsx`, `src/app/erp/components/FinancialReportTab.tsx`, `src/app/erp/components/GeneralAccountingStandardsTab.tsx`, `src/app/erp/components/GovSupportIntelTab.tsx`, `src/app/erp/components/InboundRegTab.tsx`, `src/app/erp/components/LeaveApplyTab.tsx`, `src/app/erp/components/LeaveManageTab.tsx`, `src/app/erp/components/MenuPersonalizeModal.tsx`, `src/app/erp/components/ObsidianVaultTab.tsx`, `src/app/erp/components/OrganizationTab.tsx`, `src/app/erp/components/OtManagementTab.tsx`, `src/app/erp/components/OutboundRegTab.tsx`, `src/app/erp/components/PartnerManagementTab.tsx`, `src/app/erp/components/PasswordChangeModal.tsx`, `src/app/erp/components/PayrollTab.tsx`, `src/app/erp/components/PermissionsTab.tsx`, `src/app/erp/components/ProductManagementTab.tsx`, `src/app/erp/components/RentalBizDirectoryTab.tsx`, `src/app/erp/components/RentalMaintenanceTab.tsx`, `src/app/erp/components/RentalTab.tsx`, `src/app/erp/components/RetirementPensionGuideTab.tsx`, `src/app/erp/components/ServiceTab.tsx`, `src/app/erp/components/TaxInvoiceTab.tsx`, `src/app/erp/components/TradeTab.tsx`, `src/app/erp/components/WarrantyManagementTab.tsx`, `src/app/erp/components/WorkImprovementTab.tsx`, `src/app/erp/components/WorkRulesTab.tsx`, `src/app/erp/erp-theme.css`, `src/app/erp/erpMenuConfig.ts`, `src/app/erp/useErpShellController.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: ERP 메인 셸 페이지. 33개 탭·모달 지연 로딩 선언, 34개 메뉴 스위치 라우팅(renderMenuContent), KeepAlivePane 및 트리 사이드바·모바일 하단바 렌더링.

#### 4.1.6 `src/app/erp/useErpShellController.ts`
- **규모 / 계층 / 메뉴ID**: 781줄 (24.9 KB) / `L1_SHELL_SECURITY` / `SHELL` / 대칭·연관 쌍: `src/app/erp/page.tsx`
- **주요 Export 심볼**: `RolePermissionEntry`, `MenuPrefsState`, `useErpShellController`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ErpHeader.tsx`, `src/app/erp/erpMenuConfig.ts`, `src/lib/erpMenuHistory.ts` · 호출 API `/api/erp/auth/logout`, `/api/erp/auth/session`, `/api/erp/permissions`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 세션·권한 병렬 프리페치, 역할·개인화 메뉴 트리 필터링, 12개 LRU 탭 유지, 수동 스크롤 스냅샷 복원, 마우스·키보드 이력 탐색 및 30분 유휴 로그아웃 제어 훅.

#### 4.1.7 `src/app/globals.css`
- **규모 / 계층 / 메뉴ID**: 31줄 (0.6 KB) / `L1_SHELL_SECURITY` / `SHELL` / 대칭·연관 쌍: `src/app/layout.tsx`
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/layout.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 전역 스타일시트. Tailwind CSS base·components·utilities 지시어 선언, 루트 전경·배경 색상 변수, 본문 폰트 스택 및 스크롤바 스타일 정의.

#### 4.1.8 `src/app/layout.tsx`
- **규모 / 계층 / 메뉴ID**: 176줄 (7 KB) / `L1_SHELL_SECURITY` / `SHELL` / 대칭·연관 쌍: `src/app/globals.css`
- **주요 Export 심볼**: `viewport`, `metadata`, `default (RootLayout)`
- **정방향 의존 (`Out`)**: 내부 import `src/app/globals.css`, `src/components/security/ClientSecurityGuard.tsx` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 루트 HTML 레이아웃. SEO 메타데이터, JSON-LD 구조화 데이터, 애드센스 스크립트, ClientSecurityGuard 전역 마운트 구성.

#### 4.1.9 `src/components/security/ClientSecurityGuard.tsx`
- **규모 / 계층 / 메뉴ID**: 178줄 (6.2 KB) / `L1_SHELL_SECURITY` / `SECURITY` / 대칭·연관 쌍: `src/app/layout.tsx`
- **주요 Export 심볼**: `default (ClientSecurityGuard)`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/layout.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 전역 클라이언트 보안 가드. 프로덕션 console 출력 무력화, 우클릭·F12·개발자도구·소스보기 단축키 차단, 보호 경로 창 크기 급변 시 잠금 오버레이 표시.

#### 4.1.10 `src/middleware.ts`
- **규모 / 계층 / 메뉴ID**: 110줄 (3.9 KB) / `L1_SHELL_SECURITY` / `SECURITY` / 대칭·연관 쌍: `src/components/security/ClientSecurityGuard.tsx`
- **주요 Export 심볼**: `middleware`, `config`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSessionToken.ts` · 호출 API `/api/erp`, `/api/erp/auth/login`, `/api/erp/auth/logout`, `/api/erp/auth/session`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: Next.js 요청 미들웨어. 소스맵(.map) 차단, 보안 헤더 및 캐시 무효화 적용, x-erp-* 위조 헤더 제거, /api/erp/*·/api/products 세션 검증.

### 4.2 `L2_UI_SHARED` — 공통 UI 컴포넌트 계층 (9개)

대상 범위: src/app/erp/components/*

#### 4.2.1 `src/app/erp/components/ContractTaxInvoiceSection.tsx`
- **규모 / 계층 / 메뉴ID**: 571줄 (25.5 KB) / `L2_UI_SHARED` / `SHARED` / 대칭·연관 쌍: `src/app/erp/components/TaxInvoiceTab.tsx`
- **주요 Export 심볼**: `TaxInvoiceLineItem`, `BuyerTaxSpec`, `createDefaultTaxSpec`, `extractPartnerTaxSpec`, `ContractTaxInvoiceSection`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpContractTemplate.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 13`)**: `src/app/erp/components/TradeTab.tsx`, `src/app/erp/components/rental/RentalAddContractModal.tsx`, `src/app/erp/components/rental/RentalAssetModelModals.tsx`, `src/app/erp/components/rental/RentalEditContractModal.tsx`, `src/app/erp/components/rental/useRentalTabController.ts`, `src/app/erp/components/service/ServiceAddContractModal.tsx`, `src/app/erp/components/service/ServiceBillingModal.tsx`, `src/app/erp/components/service/ServiceEditContractModal.tsx`, `src/app/erp/components/service/useServiceTabController.ts`, `src/app/erp/components/tax-invoice/TaxInvoiceIssueAndDetailModals.tsx`, `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts`, `src/app/erp/components/trade/TradeSaleBillingModals.tsx`, `src/app/erp/components/trade/tradeHelpers.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 계약·청구 내 세금계산서 제원 입력 공통 섹션. 공급받는자 사업자 정보 추출(extractPartnerTaxSpec), 영수·청구 구분, 품목 행 추가·삭제 및 공급가액·세액 합산.

#### 4.2.2 `src/app/erp/components/ErpHeader.tsx`
- **규모 / 계층 / 메뉴ID**: 172줄 (6.7 KB) / `L2_UI_SHARED` / `SHARED` / 대칭·연관 쌍: `src/app/erp/page.tsx`
- **주요 Export 심볼**: `EntityScope`, `ErpThemeMode`, `ErpHeader`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/businessEntities.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/erp/page.tsx`, `src/app/erp/useErpShellController.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `EAGER_ROUTE_IMPORT`
- **핵심 기능 명세**: ERP 상단 헤더 컴포넌트. 모바일 메뉴 토글, 운영 사업자(ALL/CORP/INDIVIDUAL) 선택기 및 계좌 배지, 테마 전환, 사용자 정보 칩, 비밀번호 변경·로그아웃 버튼 제공.

#### 4.2.3 `src/app/erp/components/ErpLogin.tsx`
- **규모 / 계층 / 메뉴ID**: 120줄 (4.1 KB) / `L2_UI_SHARED` / `SHARED` / 대칭·연관 쌍: `src/app/erp/page.tsx`
- **주요 Export 심볼**: `ErpLogin`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/erp-theme.css` · 호출 API `/api/erp/auth/login`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `EAGER_ROUTE_IMPORT`
- **핵심 기능 명세**: ERP 로그인 화면 컴포넌트. 아이디·비밀번호 입력 폼 검증 및 /api/erp/auth/login POST 인증 요청 후 사용자 객체 상위 전달.

#### 4.2.4 `src/app/erp/components/ForkliftOptionAttachPanel.tsx`
- **규모 / 계층 / 메뉴ID**: 277줄 (10.8 KB) / `L2_UI_SHARED` / `SHARED` / 대칭·연관 쌍: `src/app/erp/components/ForkliftSpecEditor.tsx`
- **주요 Export 심볼**: `CatalogOptionItem`, `default (ForkliftOptionAttachPanel)`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SearchSelectCombobox.tsx`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 9`)**: `src/app/erp/components/AssetManagementTab.tsx`, `src/app/erp/components/OutboundRegTab.tsx`, `src/app/erp/components/assets/AssetAcquireModal.tsx`, `src/app/erp/components/assets/AssetDossierDrawer.tsx`, `src/app/erp/components/rental/RentalAddContractModal.tsx`, `src/app/erp/components/rental/RentalEditContractModal.tsx`, `src/app/erp/components/rental/useRentalTabController.ts`, `src/app/erp/components/trade/TradeSaleBillingModals.tsx`, `src/app/erp/components/trade/tradeHelpers.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 지게차 부착·설치 옵션 등록 패널. 판매(SALE)·임대(RENTAL) 모드별 카탈로그 초성 검색 선택, 수량·단가·공임·월/일 추가료 입력 및 옵션 합계 산출.

#### 4.2.5 `src/app/erp/components/ForkliftSpecEditor.tsx`
- **규모 / 계층 / 메뉴ID**: 352줄 (13.3 KB) / `L2_UI_SHARED` / `SHARED` / 대칭·연관 쌍: `src/app/erp/components/ForkliftOptionAttachPanel.tsx`
- **주요 Export 심볼**: `default (ForkliftSpecEditor)`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/erp/components/products/ProductDossierAndAddModal.tsx`, `src/app/erp/components/trade/TradeProductPurchaseModals.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 품목 분류(FORKLIFT/OPTION/PART/GENERAL)별 제원 편집기. 동력원, 정격하중, 마스트, 인상고, 타이어, 전압·배터리, 호환기종 입력 및 요약 문자열 생성.

#### 4.2.6 `src/app/erp/components/MenuPersonalizeModal.tsx`
- **규모 / 계층 / 메뉴ID**: 267줄 (10.9 KB) / `L2_UI_SHARED` / `SHARED` / 대칭·연관 쌍: `src/app/erp/page.tsx`
- **주요 Export 심볼**: `MenuPersonalizeModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/erpMenuConfig.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 사이드바 메뉴 개인화 설정 모달. 인가된 메뉴 그룹·항목 상하 순서 이동, 메뉴 표시·숨김 토글, 로그인 기본 시작 메뉴 지정 및 초기화 처리.

#### 4.2.7 `src/app/erp/components/PasswordChangeModal.tsx`
- **규모 / 계층 / 메뉴ID**: 156줄 (6.2 KB) / `L2_UI_SHARED` / `SHARED` / 대칭·연관 쌍: `src/app/erp/components/ErpHeader.tsx`
- **주요 Export 심볼**: `PasswordChangeModal`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API `/api/erp/auth/change-password`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 사용자 비밀번호 변경 모달. 현재 비밀번호·새 비밀번호(4자 이상)·확인 입력값 검증 후 /api/erp/auth/change-password POST 요청 처리.

#### 4.2.8 `src/app/erp/components/SearchSelectCombobox.tsx`
- **규모 / 계층 / 메뉴ID**: 813줄 (25.1 KB) / `L2_UI_SHARED` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `SearchSelectBadgeColor`, `SearchSelectOption`, `SearchSelectComboboxProps`, `SearchSelectCombobox`, `default (SearchSelectCombobox)`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/hangulSearch.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 23`)**: `src/app/erp/components/AssetManagementTab.tsx`, `src/app/erp/components/ForkliftOptionAttachPanel.tsx`, `src/app/erp/components/InboundRegTab.tsx`, `src/app/erp/components/OutboundRegTab.tsx`, `src/app/erp/components/RentalMaintenanceTab.tsx`, `src/app/erp/components/assets/AssetAcquireModal.tsx`, `src/app/erp/components/rental-maintenance/RentalMaintActivityModal.tsx`, `src/app/erp/components/rental-maintenance/RentalMaintStockVehicleModals.tsx`, `src/app/erp/components/rental/RentalAddContractModal.tsx`, `src/app/erp/components/rental/RentalAssetModelModals.tsx`, `src/app/erp/components/rental/RentalEditContractModal.tsx`, `src/app/erp/components/rental/useRentalTabController.ts`, `src/app/erp/components/service/ServiceAddContractModal.tsx`, `src/app/erp/components/service/ServiceBillingModal.tsx`, `src/app/erp/components/service/ServiceEditContractModal.tsx`, `src/app/erp/components/service/useServiceTabController.ts`, `src/app/erp/components/tax-invoice/TaxInvoiceIssueAndDetailModals.tsx`, `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts`, `src/app/erp/components/trade/TradeInventoryAndProductsSubTabs.tsx`, `src/app/erp/components/trade/TradeProductPurchaseModals.tsx`, `src/app/erp/components/trade/TradeSaleBillingModals.tsx`, `src/app/erp/components/trade/tradeHelpers.ts`, `src/app/erp/components/warranty/WarrantyDossierAndAddModal.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 한글 초성 검색·포탈 드롭다운 지원 콤보박스. 자유 입력(allowFreeText), 초성 필터 바, 배지 색상 표시, 키보드 탐색 및 뷰포트 기준 상하 위치 계산.

#### 4.2.9 `src/app/erp/components/SortableTh.tsx`
- **규모 / 계층 / 메뉴ID**: 104줄 (3 KB) / `L2_UI_SHARED` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `useErpTableSort`, `SortableThProps`, `SortableTh`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 40`)**: `src/app/erp/components/ApprovalRulesTab.tsx`, `src/app/erp/components/AssetManagementTab.tsx`, `src/app/erp/components/BankMatchingTab.tsx`, `src/app/erp/components/CloudShareTab.tsx`, `src/app/erp/components/ExpenseReceiptTab.tsx`, `src/app/erp/components/FinancialReportTab.tsx`, `src/app/erp/components/GovSupportIntelTab.tsx`, `src/app/erp/components/InboundRegTab.tsx`, `src/app/erp/components/LeaveApplyTab.tsx`, `src/app/erp/components/LeaveManageTab.tsx`, `src/app/erp/components/OtManagementTab.tsx`, `src/app/erp/components/OutboundRegTab.tsx`, `src/app/erp/components/PartnerManagementTab.tsx`, `src/app/erp/components/PayrollTab.tsx`, `src/app/erp/components/PermissionsTab.tsx`, `src/app/erp/components/ProductManagementTab.tsx`, `src/app/erp/components/RentalBizDirectoryTab.tsx`, `src/app/erp/components/RentalMaintenanceTab.tsx`, `src/app/erp/components/TradeTab.tsx`, `src/app/erp/components/WarrantyManagementTab.tsx`, `src/app/erp/components/assets/AssetDepreciationLedgerView.tsx`, `src/app/erp/components/assets/AssetSummaryAndDetailTables.tsx`, `src/app/erp/components/bank-matching/BankLedgerGridAndSummary.tsx`, `src/app/erp/components/bank-matching/BankMatchModal.tsx`, `src/app/erp/components/corporate-docs/CorporateDocVaultSubTab.tsx`, `src/app/erp/components/employment-contracts/EmploymentContractFormAndListPanel.tsx`, `src/app/erp/components/financial-report/FinancialDetailLedgerSection.tsx`, `src/app/erp/components/outbound/OutboundBillingAndLogsPanel.tsx`, `src/app/erp/components/partners/BizStatusBatchModal.tsx`, `src/app/erp/components/rental-biz-dir/PortalGuideModal.tsx`, `src/app/erp/components/rental-biz-dir/RentalBizToolbarAndGrid.tsx`, `src/app/erp/components/rental-maintenance/HoursWearAndVehicleStockTabs.tsx`, `src/app/erp/components/rental-maintenance/MaintenanceActivitiesAndPmSubTabs.tsx`, `src/app/erp/components/rental/RentalSubTabGrids.tsx`, `src/app/erp/components/service/ServiceLedgersAndDocModal.tsx`, `src/app/erp/components/tax-invoice/TaxInvoiceReconcileModal.tsx`, `src/app/erp/components/tax-invoice/TaxLedgerSubTab.tsx`, `src/app/erp/components/tax-invoice/TaxUnissuedAndSyncSubTabs.tsx`, `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts`, `src/app/share/[code]/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 테이블 3단계 정렬 훅(useErpTableSort) 및 헤더 컴포넌트(SortableTh). 컬럼 클릭 시 오름차순·내림차순·정렬안함 순환 및 aria-sort 속성 반영.

### 4.3 `L3_UI_TABS` — 메뉴 탭 화면 계층 (33개)

대상 범위: src/app/erp/components/*Tab.tsx

#### 4.3.1 `src/app/erp/components/AccountingStandardsTab.tsx`
- **규모 / 계층 / 메뉴ID**: 1012줄 (43.7 KB) / `L3_UI_TABS` / `ACCOUNTING_STANDARD` / 대칭·연관 쌍: `src/app/erp/components/GeneralAccountingStandardsTab.tsx`
- **주요 Export 심볼**: `default (AccountingStandardsTab)`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/data/accountingStandardsMeta.ts` · 호출 API `/api/erp/accounting-standards`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 중소기업회계기준 열람 탭. /api/erp/accounting-standards?kind=sme 조회, 기준서 조문·해설서 좌우 분할 스크롤, 장별 필터, 키워드 검색어 강조 표시.

#### 4.3.2 `src/app/erp/components/ApprovalInboxTab.tsx`
- **규모 / 계층 / 메뉴ID**: 568줄 (26.5 KB) / `L3_UI_TABS` / `APPROVAL_INBOX` / 대칭·연관 쌍: `src/app/erp/components/ApprovalRulesTab.tsx`
- **주요 Export 심볼**: `ApprovalInboxTab`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpApprovalLine.ts`, `src/lib/erpFormat.ts` · 호출 API `/api/erp/approvals`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 내 결재함 탭. /api/erp/approvals 상태별(대기·승인·반려·전체) 목록 조회, 결재 단계별 권한 판별, 승인·사유 입력 반려 PATCH 및 업무개선 보고서 연계.

#### 4.3.3 `src/app/erp/components/ApprovalRulesTab.tsx`
- **규모 / 계층 / 메뉴ID**: 298줄 (13.8 KB) / `L3_UI_TABS` / `APPROVAL_RULES` / 대칭·연관 쌍: `src/app/erp/components/ApprovalInboxTab.tsx`
- **주요 Export 심볼**: `ApprovalRulesTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/lib/erpFormat.ts` · 호출 API `/api/erp/approvals/rules`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 결재선 규칙 설정 탭. /api/erp/approvals/rules 이벤트별 최소 승인 티어(Tier 1~4), 부서합의·활성화 여부, 규칙 설명 조회 및 관리자 PUT 일괄 저장.

#### 4.3.4 `src/app/erp/components/AssetManagementTab.tsx`
- **규모 / 계층 / 메뉴ID**: 995줄 (37.2 KB) / `L3_UI_TABS` / `ASSET` / 대칭·연관 쌍: `src/app/erp/components/ProductManagementTab.tsx`
- **주요 Export 심볼**: `AssetManagementTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ForkliftOptionAttachPanel.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/assets/AssetAcquireModal.tsx`, `src/app/erp/components/assets/AssetDepreciationLedgerView.tsx`, `src/app/erp/components/assets/AssetDossierDrawer.tsx`, `src/app/erp/components/assets/AssetSummaryAndDetailTables.tsx`, `src/app/erp/components/assets/assetTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/hangulSearch.ts`, `src/lib/rentalFeeUtils.ts` · 호출 API `/api/erp/assets`, `/api/erp/assets/depreciation`, `/api/erp/assets/logs`, `/api/erp/products`, `/api/erp/trade/products`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 자산 관리 탭. /api/erp/assets·depreciation·logs 연동, 기종 요약·상세 목록 관리 및 감가상각 원장·상세 드로어·자산 취득 모달 지연 로딩 제어.

#### 4.3.5 `src/app/erp/components/BankMatchingTab.tsx`
- **규모 / 계층 / 메뉴ID**: 1119줄 (44.3 KB) / `L3_UI_TABS` / `BANK_MATCHING` / 대칭·연관 쌍: `src/app/erp/components/TaxInvoiceTab.tsx`
- **주요 Export 심볼**: `BankMatchingTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/bank-matching/BankLedgerGridAndSummary.tsx`, `src/app/erp/components/bank-matching/BankMatchModal.tsx`, `src/app/erp/components/bank-matching/BankUploadModal.tsx`, `src/app/erp/components/bank-matching/ManualTransactionModal.tsx`, `src/app/erp/components/bank-matching/bankMatchingTypes.ts`, `src/lib/erpAccountSubjects.ts`, `src/lib/erpFormat.ts`, `src/lib/hangulSearch.ts` · 호출 API `/api/erp/bank-matching`, `/api/erp/tax-invoices`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 은행 입출금 대장 오케스트레이터 탭. /api/erp/bank-matching·tax-invoices API 호출, 계좌별 기간 필터·일괄 계정 지정 조율 및 지연 로딩 모달 제어.

#### 4.3.6 `src/app/erp/components/CloudShareTab.tsx`
- **규모 / 계층 / 메뉴ID**: 963줄 (42.8 KB) / `L3_UI_TABS` / `CLOUD_SHARE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `CloudShareTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/lib/erpFormat.ts` · 호출 API `/api/erp/cloud-shares`, `/api/erp/cloud-shares/files`, `/api/share/[code]/download`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 클라우드 자료실 탭. /api/erp/cloud-shares·files 연동, 공유 폴더 생성·수정·만료일·비밀번호·활성 상태 관리, 파일 업로드·삭제 및 공개 링크 복사.

#### 4.3.7 `src/app/erp/components/CorporateDocumentTab.tsx`
- **규모 / 계층 / 메뉴ID**: 581줄 (25.5 KB) / `L3_UI_TABS` / `CORPORATE_DOCS` / 대칭·연관 쌍: `src/app/erp/components/corporate-docs/CorporateDocVaultSubTab.tsx`
- **주요 Export 심볼**: `CorporateDocumentTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/corporate-docs/CorporateDocVaultSubTab.tsx`, `src/app/erp/components/corporate-docs/EntityManualSubTabs.tsx`, `src/app/erp/components/corporate-docs/TemplateStudioSubTab.tsx`, `src/app/erp/components/corporate-docs/UploadDocModal.tsx`, `src/app/erp/components/corporate-docs/corporateDocTemplates.ts`, `src/app/erp/components/corporate-docs/corporateDocTypes.ts`, `src/lib/businessEntities.ts` · 호출 API `/api/erp/corporate-docs`, `/api/erp/shareholder-registry`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 법인 중요문서 탭 오케스트레이터. /api/erp/corporate-docs·shareholder-registry 상태 관리, 문서 보관함 서브탭(CorporateDocVaultSubTab), 절차 매뉴얼·서식 스튜디오·템플릿 동적 로딩 및 업로드 모달 제어.

#### 4.3.8 `src/app/erp/components/EmploymentContractTab.tsx`
- **규모 / 계층 / 메뉴ID**: 992줄 (40.3 KB) / `L3_UI_TABS` / `EMPLOYMENT_CONTRACT` / 대칭·연관 쌍: `src/app/erp/components/OrganizationTab.tsx`
- **주요 Export 심볼**: `EmploymentContractItem`, `EmploymentContractTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/employment-contracts/ContractDocumentPreviewPanel.tsx`, `src/app/erp/components/employment-contracts/EmploymentContractFormAndListPanel.tsx`, `src/app/erp/components/employment-contracts/employmentContractTypes.ts` · 호출 API `/api/erp/employees`, `/api/erp/employment-contracts`, `/api/erp/employment-contracts/ocr`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 근로계약서·정보보호서약서 오케스트레이터 탭. /api/erp/employment-contracts·ocr 연동, 스캔 추출·사원 마스터 동기화 및 좌우 분할 패널 제어.

#### 4.3.9 `src/app/erp/components/ExpenseReceiptTab.tsx`
- **규모 / 계층 / 메뉴ID**: 928줄 (37.1 KB) / `L3_UI_TABS` / `EXPENSE_RECEIPT` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `ExpenseReceiptTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/expenses/ExpenseCreateAndPreviewModals.tsx`, `src/lib/erpFormat.ts` · 호출 API `/api/erp/departments`, `/api/erp/employees`, `/api/erp/expenses`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 개인경비 영수증 관리 탭. /api/erp/expenses 연동 월별 경비 목록·KPI·결재 승인반려 조율 및 경비등록·증빙미리보기 모달 지연 로딩 제어.

#### 4.3.10 `src/app/erp/components/FinancialReportTab.tsx`
- **규모 / 계층 / 메뉴ID**: 715줄 (30 KB) / `L3_UI_TABS` / `FINANCIAL_REPORT` / 대칭·연관 쌍: `src/app/erp/components/BankMatchingTab.tsx`
- **주요 Export 심볼**: `FinancialReportTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/financial-report/AccountingStandardModals.tsx`, `src/app/erp/components/financial-report/FinancialDetailLedgerSection.tsx`, `src/app/erp/components/financial-report/FinancialStatementsBoard.tsx`, `src/app/erp/components/financial-report/MonthlyAccountMatrixSection.tsx`, `src/app/erp/components/financial-report/financialReportTypes.ts`, `src/app/erp/data/accountSubjectStandardsMap.ts`, `src/app/erp/data/accountingStandardsMeta.ts`, `src/lib/erpFormat.ts` · 호출 API `/api/erp/financial-report`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 경영지표 보고서 탭. /api/erp/financial-report 연도·사업자·공급가 기준 손익계산서·월별 매트릭스·감가상각·전표 드릴다운 조회, 지연 로딩 기준 모달 및 주석 저장.

#### 4.3.11 `src/app/erp/components/GeneralAccountingStandardsTab.tsx`
- **규모 / 계층 / 메뉴ID**: 1137줄 (49.9 KB) / `L3_UI_TABS` / `GENERAL_ACCOUNTING_STANDARD` / 대칭·연관 쌍: `src/app/erp/components/AccountingStandardsTab.tsx`
- **주요 Export 심볼**: `default (GeneralAccountingStandardsTab)`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/data/generalAccountingStandardsTypes.ts` · 호출 API `/api/erp/accounting-standards`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 일반기업회계기준 열람 탭. /api/erp/accounting-standards?kind=general 조회, 조문·부록해설 좌우 분할 스크롤, 장별 원문 PDF 연결, 키워드 검색·강조.

#### 4.3.12 `src/app/erp/components/GovSupportIntelTab.tsx`
- **규모 / 계층 / 메뉴ID**: 957줄 (38.1 KB) / `L3_UI_TABS` / `GOV_SUPPORT` / 대칭·연관 쌍: `src/app/erp/components/gov-support/GovSupportDossierPanel.tsx`
- **주요 Export 심볼**: `GovSupportIntelTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/gov-support/GovSupportDossierPanel.tsx`, `src/app/erp/components/gov-support/GovSupportModals.tsx`, `src/app/erp/components/gov-support/govSupportTypes.ts`, `src/lib/erpFormat.ts` · 호출 API `/api/erp/gov-support`, `/api/erp/obsidian`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 정부지원·뉴스·트렌드 오케스트레이터 탭. /api/erp/gov-support 공고 발굴·AI 탐색·옵시디언 내보내기 조율, 좌측 목록 필터 및 우측 상세 패널(GovSupportDossierPanel)·지연 로딩 모달 제어.

#### 4.3.13 `src/app/erp/components/InboundRegTab.tsx`
- **규모 / 계층 / 메뉴ID**: 927줄 (40.1 KB) / `L3_UI_TABS` / `INBOUND_REG` / 대칭·연관 쌍: `src/app/erp/components/OutboundRegTab.tsx`
- **주요 Export 심볼**: `InboundRegTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/SortableTh.tsx`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/hangulSearch.ts` · 호출 API `/api/erp/inout`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 렌탈자산 입고등록 탭. /api/erp/inout?mode=INBOUND 연동, 자산·차대번호 자동 매칭, 반납 후 상태(임대가능·수리중)·가동시간 기록 및 계약 차감.

#### 4.3.14 `src/app/erp/components/LeaveApplyTab.tsx`
- **규모 / 계층 / 메뉴ID**: 830줄 (36.3 KB) / `L3_UI_TABS` / `LEAVE_APPLY` / 대칭·연관 쌍: `src/app/erp/components/LeaveManageTab.tsx`
- **주요 Export 심볼**: `LeaveApplyTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/lib/erpFormat.ts`, `src/lib/erpHrLaborDomain.ts` · 호출 API `/api/erp/employees`, `/api/erp/leaves`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 연차 신청 탭. /api/erp/employees·leaves 연동 로그인 본인 근속·부여·잔여연차 집계, 휴가 유형별 차감일수 평일 산정, 신청 상신 및 취소 처리.

#### 4.3.15 `src/app/erp/components/LeaveManageTab.tsx`
- **규모 / 계층 / 메뉴ID**: 946줄 (39.6 KB) / `L3_UI_TABS` / `LEAVE_MANAGE` / 대칭·연관 쌍: `src/app/erp/components/LeaveApplyTab.tsx`
- **주요 Export 심볼**: `LeaveManageTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/lib/erpFormat.ts`, `src/lib/erpHrLaborDomain.ts` · 호출 API `/api/erp/departments`, `/api/erp/employees`, `/api/erp/employees/reset-leave`, `/api/erp/leaves`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 연차 관리 탭. 권한 스코프(전사·부서·본인)별 임직원 부여·사용·잔여연차 및 휴가 이력 조회, 부여일수 개별 조정, 연간 연차 일괄 초기화, CSV 내보내기.

#### 4.3.16 `src/app/erp/components/ObsidianVaultTab.tsx`
- **규모 / 계층 / 메뉴ID**: 949줄 (38 KB) / `L3_UI_TABS` / `OBSIDIAN_VAULT` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `ObsidianVaultTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/obsidian/ObsidianSyncAndErrorModals.tsx`, `src/app/erp/components/obsidian/obsidianMarkdownPreview.tsx` · 호출 API `/api/erp/obsidian`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 옵시디언 노트 탭. /api/erp/obsidian·R2·로컬 폴더 동기화, 마크다운 분할 편집기, 태그·폴더 필터링 및 동기화 가이드·오류 모달 지연 로딩 제어.

#### 4.3.17 `src/app/erp/components/OrganizationTab.tsx`
- **규모 / 계층 / 메뉴ID**: 432줄 (13.7 KB) / `L3_UI_TABS` / `ORG` / 대칭·연관 쌍: `src/app/erp/components/PermissionsTab.tsx`
- **주요 Export 심볼**: `DEFAULT_POSITION_TIERS`, `DEFAULT_DUTY_TIERS`, `getUserEffectiveTier`, `UNIVERSAL_FUNCTIONAL_ATTRIBUTES`, `getDepartmentFunctionalTags`, `maskPhoneNumber`, `maskEmail`, `maskName`, `maskAddress`, `ApprovalTierConfig`, `FunctionalAttributeConfig`, `Department` 외 3개
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/organization/OrgActionModalsAndAuditBar.tsx`, `src/app/erp/components/organization/OrgTreeAndMemberGrid.tsx`, `src/app/erp/components/organization/SelectedProfilePanel.tsx`, `src/app/erp/components/organization/organizationTypes.ts`, `src/app/erp/components/organization/useOrganizationController.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 조직·인사관리 오케스트레이터 탭. useOrganizationController 연동 조직 상태 조율, 감사 요약·엑셀 내보내기, OrgTreeAndMemberGrid 및 SelectedProfilePanel 지연 로딩 구성.

#### 4.3.18 `src/app/erp/components/OtManagementTab.tsx`
- **규모 / 계층 / 메뉴ID**: 799줄 (32.2 KB) / `L3_UI_TABS` / `OT_MANAGE` / 대칭·연관 쌍: `src/app/erp/components/PayrollTab.tsx`
- **주요 Export 심볼**: `OtManagementTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/overtime/OtRequestModal.tsx`, `src/lib/erpFormat.ts`, `src/lib/erpHrLaborDomain.ts` · 호출 API `/api/erp/departments`, `/api/erp/employees`, `/api/erp/overtimes`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 초과근무 관리 탭. /api/erp/overtimes 월별 연장·야간·휴일 근로 집계·승인반려·CSV 내보내기 처리 및 OtRequestModal 지연 로딩 제어.

#### 4.3.19 `src/app/erp/components/OutboundRegTab.tsx`
- **규모 / 계층 / 메뉴ID**: 816줄 (35.4 KB) / `L3_UI_TABS` / `OUTBOUND_REG` / 대칭·연관 쌍: `src/app/erp/components/InboundRegTab.tsx`
- **주요 Export 심볼**: `OutboundRegTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ForkliftOptionAttachPanel.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/outbound/OutboundBillingAndLogsPanel.tsx`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/hangulSearch.ts`, `src/lib/partnerStatusClient.ts`, `src/lib/rentalFeeUtils.ts` · 호출 API `/api/erp/inout`, `/api/erp/products`, `/api/erp/trade/products`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 렌탈자산 출고등록 탭. /api/erp/inout 연동, 임대가능 자산·거래처 차단 검증·부착옵션 선택, 월정액·일할 요율 미리보기, 출고 등록 및 조건부 동적 청구·이력 패널(OutboundBillingAndLogsPanel) 제어.

#### 4.3.20 `src/app/erp/components/PartnerManagementTab.tsx`
- **규모 / 계층 / 메뉴ID**: 937줄 (37 KB) / `L3_UI_TABS` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/TaxInvoiceTab.tsx`
- **주요 Export 심볼**: `KOREAN_BANKS`, `ActiveDocumentViewer`, `PartnerContact`, `Partner`, `PartnerManagementTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/partners/BankCopyOcrModal.tsx`, `src/app/erp/components/partners/BizCertOcrModal.tsx`, `src/app/erp/components/partners/BizStatusBatchModal.tsx`, `src/app/erp/components/partners/ContactFormModal.tsx`, `src/app/erp/components/partners/PartnerDocViewerModal.tsx`, `src/app/erp/components/partners/PartnerDossierPanel.tsx`, `src/app/erp/components/partners/PartnerFormModal.tsx`, `src/app/erp/components/partners/PartnerListPanel.tsx`, `src/app/erp/components/partners/partnerFormHelpers.ts`, `src/app/erp/components/partners/partnerPdfUtils.ts`, `src/app/erp/components/partners/partnerTypes.ts`, `src/app/erp/components/partners/usePartnerDocAndNtsActions.ts`, `src/lib/erpFormat.ts`, `src/lib/erpMasterDataBus.ts`, `src/lib/hangulSearch.ts` · 호출 API `/api/erp/employees`, `/api/erp/partners`, `/api/erp/partners/contacts`, `/api/erp/partners/ocr-card`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 거래처 관리(매출처·매입처) 탭. 목록·상세 패널, usePartnerDocAndNtsActions 훅 연동, 지연 로딩 OCR·일괄조회·문서뷰어 모달 제어.

#### 4.3.21 `src/app/erp/components/PayrollTab.tsx`
- **규모 / 계층 / 메뉴ID**: 988줄 (48.1 KB) / `L3_UI_TABS` / `PAYROLL` / 대칭·연관 쌍: `src/app/erp/components/OtManagementTab.tsx`
- **주요 Export 심볼**: `PayrollRecord`, `PayrollTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/payroll/PayrollEditAndOcrModals.tsx`, `src/lib/erpFormat.ts` · 호출 API `/api/erp/payroll`, `/api/erp/payroll/ocr`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 급여 정산 탭. /api/erp/payroll 월별 일괄 계산·용역수지 대차대조·승인지급 마감 처리 및 급여수정·OCR 모달(PayrollEditAndOcrModals) 지연 로딩 제어.

#### 4.3.22 `src/app/erp/components/PermissionsTab.tsx`
- **규모 / 계층 / 메뉴ID**: 751줄 (35 KB) / `L3_UI_TABS` / `PERMISSIONS` / 대칭·연관 쌍: `src/app/erp/components/OrganizationTab.tsx`
- **주요 Export 심볼**: `PermissionsTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/lib/erpFormat.ts` · 호출 API `/api/erp/employees`, `/api/erp/permissions`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 사용자 및 권한 탭. /api/erp/permissions·employees 연동, 역할(Role) 생성 및 메뉴별 조회(canView)·저장(canSave)·청구(canBill) 권한 매트릭스 설정.

#### 4.3.23 `src/app/erp/components/ProductManagementTab.tsx`
- **규모 / 계층 / 메뉴ID**: 729줄 (29.1 KB) / `L3_UI_TABS` / `PRODUCT` / 대칭·연관 쌍: `src/app/erp/components/AssetManagementTab.tsx`
- **주요 Export 심볼**: `ProductManagementTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/products/ProductDossierAndAddModal.tsx`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/hangulSearch.ts`, `src/lib/rentalFeeUtils.ts` · 호출 API `/api/erp/assets`, `/api/erp/products`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 제품 관리 탭. /api/erp/products·assets 분류 필터·카탈로그 목록·CSV 내보내기 관리 및 제품 상세 드로어·신규 등록 모달 지연 로딩 제어.

#### 4.3.24 `src/app/erp/components/RentalBizDirectoryTab.tsx`
- **규모 / 계층 / 메뉴ID**: 660줄 (23.7 KB) / `L3_UI_TABS` / `RENTAL_BIZ_DIR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `RentalBizDirectoryTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/rental-biz-dir/PortalGuideModal.tsx`, `src/app/erp/components/rental-biz-dir/RentalBizDetailPanel.tsx`, `src/app/erp/components/rental-biz-dir/RentalBizFormModal.tsx`, `src/app/erp/components/rental-biz-dir/RentalBizToolbarAndGrid.tsx`, `src/app/erp/components/rental-biz-dir/rentalBizTypes.ts`, `src/lib/erpFormat.ts` · 호출 API `/api/erp/obsidian`, `/api/erp/rental-directory`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 렌탈 사업자 DB 오케스트레이터 탭. /api/erp/rental-directory 연동, 업종별 발굴·일괄 거래처 전환 조율 및 RentalBizToolbarAndGrid·상세 패널·지연 로딩 모달 제어.

#### 4.3.25 `src/app/erp/components/RentalMaintenanceTab.tsx`
- **규모 / 계층 / 메뉴ID**: 1063줄 (48.6 KB) / `L3_UI_TABS` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: `src/app/erp/components/WarrantyManagementTab.tsx`
- **주요 Export 심볼**: `default (RentalMaintenanceTab)`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/rental-maintenance/HoursWearAndVehicleStockTabs.tsx`, `src/app/erp/components/rental-maintenance/MaintenanceActivitiesAndPmSubTabs.tsx`, `src/app/erp/components/rental-maintenance/RentalMaintActivityModal.tsx`, `src/app/erp/components/rental-maintenance/RentalMaintStockVehicleModals.tsx`, `src/app/erp/components/rental-maintenance/rentalMaintenanceTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/rentalMaintenanceDomain.ts` · 호출 API `/api/erp/rental/maintenance`, `/api/erp/rental/operating-hours`, `/api/erp/rental/vehicle-stocks`, `/api/erp/rental/vehicles`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 렌탈 정비·부품관리 오케스트레이터 탭. /api/erp/rental/maintenance·operating-hours·vehicle-stocks 상태·CRUD 핸들러 조율 및 지연 로딩 모달 제어.

#### 4.3.26 `src/app/erp/components/RentalTab.tsx`
- **규모 / 계층 / 메뉴ID**: 281줄 (15.8 KB) / `L3_UI_TABS` / `RENTAL` / 대칭·연관 쌍: `src/app/erp/components/rental/useRentalTabController.ts`
- **주요 Export 심볼**: `RentalTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/rental/RentalAddContractModal.tsx`, `src/app/erp/components/rental/RentalAssetModelModals.tsx`, `src/app/erp/components/rental/RentalEditContractModal.tsx`, `src/app/erp/components/rental/RentalSubTabGrids.tsx`, `src/app/erp/components/rental/useRentalTabController.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 임대 계약·청구 오케스트레이터 뷰. useRentalTabController 훅 연동, RentalSubTabGrids 렌더링 및 감가상각·증빙뷰어·계약·모델 모달 조건부 지연 로딩 제어.

#### 4.3.27 `src/app/erp/components/RetirementPensionGuideTab.tsx`
- **규모 / 계층 / 메뉴ID**: 400줄 (24.1 KB) / `L3_UI_TABS` / `RETIREMENT_PENSION_GUIDE` / 대칭·연관 쌍: `src/app/erp/components/WorkRulesTab.tsx`
- **주요 Export 심볼**: `RetirementPensionGuideTab`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 퇴직연금 도입 안내 탭. 확정기여형(DC) 및 중소기업퇴직연금기금(푸른씨앗) 제도 비교표 열람, HTML 문서(/docs/retirement-pension-guide.html) 별도 창 열기 및 인쇄.

#### 4.3.28 `src/app/erp/components/ServiceTab.tsx`
- **규모 / 계층 / 메뉴ID**: 212줄 (12.2 KB) / `L3_UI_TABS` / `SERVICES` / 대칭·연관 쌍: `src/app/erp/components/service/useServiceTabController.ts`
- **주요 Export 심볼**: `ServiceTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/service/ServiceAddContractModal.tsx`, `src/app/erp/components/service/ServiceBillingModal.tsx`, `src/app/erp/components/service/ServiceEditContractModal.tsx`, `src/app/erp/components/service/ServiceLedgersAndDocModal.tsx`, `src/app/erp/components/service/useServiceTabController.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 용역 관리(운영/개발) 오케스트레이터 뷰. useServiceTabController 훅 연동, 대장 렌더링 및 계약 등록·수정·청구 모달 조건부 지연 로딩 제어.

#### 4.3.29 `src/app/erp/components/TaxInvoiceTab.tsx`
- **규모 / 계층 / 메뉴ID**: 363줄 (11.8 KB) / `L3_UI_TABS` / `TAX` / 대칭·연관 쌍: `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts`
- **주요 Export 심볼**: `TaxInvoiceTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/tax-invoice/TaxInvoiceIssueAndDetailModals.tsx`, `src/app/erp/components/tax-invoice/TaxInvoiceReconcileModal.tsx`, `src/app/erp/components/tax-invoice/TaxKpiAndFilterBar.tsx`, `src/app/erp/components/tax-invoice/TaxLedgerSubTab.tsx`, `src/app/erp/components/tax-invoice/TaxUnissuedAndSyncSubTabs.tsx`, `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 매입·매출 세금계산서 오케스트레이터 뷰. useTaxInvoiceController 훅 연동 및 미발행 청구·홈택스 수집·통장 대사·발행·상세 모달 조건부 지연 로딩 제어.

#### 4.3.30 `src/app/erp/components/TradeTab.tsx`
- **규모 / 계층 / 메뉴ID**: 1075줄 (52.8 KB) / `L3_UI_TABS` / `TRADE` / 대칭·연관 쌍: `src/app/erp/components/TaxInvoiceTab.tsx`
- **주요 Export 심볼**: `TradeTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/trade/TradeInventoryAndProductsSubTabs.tsx`, `src/app/erp/components/trade/TradeProductPurchaseModals.tsx`, `src/app/erp/components/trade/TradeSaleBillingModals.tsx`, `src/app/erp/components/trade/TradeSalesBillingSubTabs.tsx`, `src/app/erp/components/trade/tradeHelpers.ts`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/hangulSearch.ts`, `src/lib/partnerStatusClient.ts`, `src/lib/tradeInventoryDomain.ts` · 호출 API `/api/erp/partners`, `/api/erp/tax-invoices`, `/api/erp/trade/billings`, `/api/erp/trade/products`, `/api/erp/trade/purchases`, `/api/erp/trade/sales`, `/api/erp/trade/settlement`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 판매용(커머스) 오케스트레이터 탭. 유통 재고·상품·매입·판매·청구·정산 상태 및 API CRUD 핸들러 조율과 지연 로딩 모달 제어.

#### 4.3.31 `src/app/erp/components/WarrantyManagementTab.tsx`
- **규모 / 계층 / 메뉴ID**: 775줄 (32.1 KB) / `L3_UI_TABS` / `WARRANTY` / 대칭·연관 쌍: `src/app/erp/components/RentalMaintenanceTab.tsx`
- **주요 Export 심볼**: `default (WarrantyManagementTab)`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/warranty/WarrantyDossierAndAddModal.tsx`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/hangulSearch.ts` · 호출 API `/api/erp/assets`, `/api/erp/partners`, `/api/erp/warranties`, `/api/erp/warranties/claims`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 차대번호 보증관리 탭. /api/erp/warranties·claims 목록 필터·상태 집계 처리 및 보증 상세 드로어·수동 등록 모달 지연 로딩 제어.

#### 4.3.32 `src/app/erp/components/WorkImprovementTab.tsx`
- **규모 / 계층 / 메뉴ID**: 912줄 (37 KB) / `L3_UI_TABS` / `WORK_IMPROVEMENT` / 대칭·연관 쌍: `src/app/erp/components/ApprovalInboxTab.tsx`
- **주요 Export 심볼**: `WorkImprovementTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/work-improvement/WorkImprovementA4Studio.tsx`, `src/app/erp/components/work-improvement/workImprovementTypes.ts`, `src/lib/erpApprovalLine.ts` · 호출 API `/api/erp/work-improvements`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 업무개선 보고서 오케스트레이터 탭. /api/erp/work-improvements 목록·저장·결재 상신·HTML 내보내기·인쇄 조율 및 좌측 보고서 목록 렌더링.

#### 4.3.33 `src/app/erp/components/WorkRulesTab.tsx`
- **규모 / 계층 / 메뉴ID**: 334줄 (16.4 KB) / `L3_UI_TABS` / `WORK_RULES` / 대칭·연관 쌍: `src/app/erp/data/workRulesStandardData.ts`
- **주요 Export 심볼**: `WorkRulesTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/data/workRulesStandardData.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 취업규칙(표준안) 탭. workRulesStandardData 참조, 필수·선택 기재사항 필터, 조문·키워드 검색, 장별 목차 탐색 및 인쇄 기능 제공.

### 4.4 `L4_UI_SUBMODULES` — 도메인 하위 패널·모달·타입 계층 (90개)

대상 범위: src/app/erp/components/<domain>/*

#### 4.4.1 `src/app/erp/components/assets/AssetAcquireModal.tsx`
- **규모 / 계층 / 메뉴ID**: 328줄 (13.5 KB) / `L4_UI_SUBMODULES` / `ASSET` / 대칭·연관 쌍: `src/app/erp/components/AssetManagementTab.tsx`
- **주요 Export 심볼**: `AssetAcquireModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ForkliftOptionAttachPanel.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/assets/assetTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/AssetManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 신규 자산 취득 등록 모달로 자산번호 일괄 채번 구간 미리보기, 매핑 제품 모델 선택, 원가·내용연수·보증정보·부착옵션 입력 폼을 제공한다.

#### 4.4.2 `src/app/erp/components/assets/AssetDepreciationLedgerView.tsx`
- **규모 / 계층 / 메뉴ID**: 614줄 (37.8 KB) / `L4_UI_SUBMODULES` / `ASSET` / 대칭·연관 쌍: `src/app/erp/components/AssetManagementTab.tsx`
- **주요 Export 심볼**: `AssetDepreciationLedgerView`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/assets/assetTypes.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/AssetManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 렌탈 매출세금계산서 4대 매출 유형 분리 카드, 월별 자산 가치·매출·순수익 정산표, 모델별 명세표 및 모델별 월별 매트릭스를 렌더링한다.

#### 4.4.3 `src/app/erp/components/assets/AssetDossierDrawer.tsx`
- **규모 / 계층 / 메뉴ID**: 538줄 (24.6 KB) / `L4_UI_SUBMODULES` / `ASSET` / 대칭·연관 쌍: `src/app/erp/components/AssetManagementTab.tsx`
- **주요 Export 심볼**: `AssetDossierDrawer`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ForkliftOptionAttachPanel.tsx`, `src/app/erp/components/assets/assetTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/AssetManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 선택 자산의 상태·소유·가동시간·보증·부착옵션 조회 및 수정, 정액법 감가상각 대차대조 지표 표시, 생애주기 감사 이력 조회·기록을 처리한다.

#### 4.4.4 `src/app/erp/components/assets/AssetSummaryAndDetailTables.tsx`
- **규모 / 계층 / 메뉴ID**: 356줄 (16.2 KB) / `L4_UI_SUBMODULES` / `ASSET` / 대칭·연관 쌍: `src/app/erp/components/AssetManagementTab.tsx`
- **주요 Export 심볼**: `AssetSummaryTable`, `AssetDetailTable`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/assets/assetTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/AssetManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 모델별 수량·취득원가·감가상각·장부가액·매출·원가회수율 요약 테이블(AssetSummaryTable)과 개별 자산 정렬·상세선택·삭제 상세 테이블(AssetDetailTable)을 제공한다.

#### 4.4.5 `src/app/erp/components/assets/assetTypes.ts`
- **규모 / 계층 / 메뉴ID**: 236줄 (6.3 KB) / `L4_UI_SUBMODULES` / `ASSET` / 대칭·연관 쌍: `src/app/erp/components/AssetManagementTab.tsx`
- **주요 Export 심볼**: `AssetSubTab`, `DepMatrixMode`, `AssetRecord`, `AssetLog`, `ModelSummaryRow`, `ModelSummaryTotals`, `AssetKpiStats`, `NewAssetFormState`, `AssetManagementTabProps`, `computeNextAssetNo`, `getAssetNoRangePreview`, `exportAssetsCsv`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 5`)**: `src/app/erp/components/AssetManagementTab.tsx`, `src/app/erp/components/assets/AssetAcquireModal.tsx`, `src/app/erp/components/assets/AssetDepreciationLedgerView.tsx`, `src/app/erp/components/assets/AssetDossierDrawer.tsx`, `src/app/erp/components/assets/AssetSummaryAndDetailTables.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 자산 레코드·이력·모델 요약·KPI·취득 폼 타입을 정의하고 DR+yymm+순번 자산번호 채번 함수(computeNextAssetNo), 구간 미리보기, CSV 내보내기 함수를 제공한다.

#### 4.4.6 `src/app/erp/components/bank-matching/BankLedgerGridAndSummary.tsx`
- **규모 / 계층 / 메뉴ID**: 533줄 (26 KB) / `L4_UI_SUBMODULES` / `BANK_MATCHING` / 대칭·연관 쌍: `src/app/erp/components/BankMatchingTab.tsx`
- **주요 Export 심볼**: `BankLedgerGridAndSummaryProps`, `BankLedgerGridAndSummary`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/bank-matching/bankMatchingTypes.ts`, `src/lib/erpAccountSubjects.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/BankMatchingTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 은행 입출금 모바일 카드 대장, PC 고밀도 정렬 테이블(대사 조치 컬럼 좌측 고정) 및 우하단 입금액·출금액·대사건수 대차대조 합계 검증 바를 렌더링한다.

#### 4.4.7 `src/app/erp/components/bank-matching/BankMatchModal.tsx`
- **규모 / 계층 / 메뉴ID**: 386줄 (18.6 KB) / `L4_UI_SUBMODULES` / `BANK_MATCHING` / 대칭·연관 쌍: `src/app/erp/components/BankMatchingTab.tsx`
- **주요 Export 심볼**: `BankMatchModalProps`, `BankMatchModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/bank-matching/bankMatchingTypes.ts`, `src/lib/erpAccountSubjects.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/BankMatchingTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 통장 거래 건의 표준 계정과목 지정 대사 탭과 미결 매출·매입 세금계산서 복수 선택·부분정산·차액 종결 사유 기반 완납 연결 탭을 제공한다.

#### 4.4.8 `src/app/erp/components/bank-matching/BankUploadModal.tsx`
- **규모 / 계층 / 메뉴ID**: 185줄 (7.8 KB) / `L4_UI_SUBMODULES` / `BANK_MATCHING` / 대칭·연관 쌍: `src/app/erp/components/BankMatchingTab.tsx`
- **주요 Export 심볼**: `BankUploadModalProps`, `BankUploadModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/bank-matching/bankMatchingTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/BankMatchingTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 계좌별 최종 거래일시 현황 표시, 법인·개인 귀속 계좌 선택, 입출금내역 파일 복수 업로드 및 텍스트 붙여넣기 DB 저장 결과 표시 모달을 제공한다.

#### 4.4.9 `src/app/erp/components/bank-matching/ManualTransactionModal.tsx`
- **규모 / 계층 / 메뉴ID**: 252줄 (10.6 KB) / `L4_UI_SUBMODULES` / `BANK_MATCHING` / 대칭·연관 쌍: `src/app/erp/components/BankMatchingTab.tsx`
- **주요 Export 심볼**: `ManualTransactionModalProps`, `ManualTransactionModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/bank-matching/bankMatchingTypes.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/BankMatchingTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 법인·개인 계좌 선택, 거래일시, 입출금 구분, 거래금액, 거래후 잔액, 거래내용, 상대은행·예금주, 메모를 입력해 은행 거래내역을 수동 등록하는 모달이다.

#### 4.4.10 `src/app/erp/components/bank-matching/bankMatchingTypes.ts`
- **규모 / 계층 / 메뉴ID**: 92줄 (2.2 KB) / `L4_UI_SUBMODULES` / `BANK_MATCHING` / 대칭·연관 쌍: `src/app/erp/components/BankMatchingTab.tsx`
- **주요 Export 심볼**: `BankTransaction`, `BankMatchingTabProps`, `AccountStatusItem`, `BankSummary`, `NewTransactionState`, `UploadResultState`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 5`)**: `src/app/erp/components/BankMatchingTab.tsx`, `src/app/erp/components/bank-matching/BankLedgerGridAndSummary.tsx`, `src/app/erp/components/bank-matching/BankMatchModal.tsx`, `src/app/erp/components/bank-matching/BankUploadModal.tsx`, `src/app/erp/components/bank-matching/ManualTransactionModal.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 통장 거래내역(BankTransaction), 계좌 현황(AccountStatusItem), 입출금 요약(BankSummary), 수동등록 폼 및 업로드 결과 타입을 정의한다.

#### 4.4.11 `src/app/erp/components/corporate-docs/CorporateDocVaultSubTab.tsx`
- **규모 / 계층 / 메뉴ID**: 680줄 (33.3 KB) / `L4_UI_SUBMODULES` / `CORPORATE_DOCS` / 대칭·연관 쌍: `src/app/erp/components/CorporateDocumentTab.tsx`
- **주요 Export 심볼**: `CorporateDocVaultSubTabProps`, `CorporateDocVaultSubTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/corporate-docs/corporateDocTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/hangulSearch.ts` · 호출 API `/api/erp/corporate-docs`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/CorporateDocumentTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 법인 중요문서 보관함 서브탭으로 사업장·분류·검색 필터, 7컬럼 정렬 마스터 목록, 버전 이력 타임라인·순번재정렬·수정·삭제 및 PDF 미리보기 패널을 제공한다.

#### 4.4.12 `src/app/erp/components/corporate-docs/EntityManualSubTabs.tsx`
- **규모 / 계층 / 메뉴ID**: 517줄 (29.9 KB) / `L4_UI_SUBMODULES` / `CORPORATE_DOCS` / 대칭·연관 쌍: `src/app/erp/components/CorporateDocumentTab.tsx`
- **주요 Export 심볼**: `CorpManualSubTab`, `IndivManualSubTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/corporate-docs/corporateDocTypes.ts`, `src/lib/businessEntities.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/CorporateDocumentTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 법인 정관변경·전자등기 5단계 절차 안내 서브탭(CorpManualSubTab)과 개인사업장 운영 절차·법인 대비표 서브탭(IndivManualSubTab) 및 문서함 이동 버튼을 제공한다.

#### 4.4.13 `src/app/erp/components/corporate-docs/TemplateStudioPreviewSheet.tsx`
- **규모 / 계층 / 메뉴ID**: 669줄 (27 KB) / `L4_UI_SUBMODULES` / `CORPORATE_DOCS` / 대칭·연관 쌍: `src/app/erp/components/corporate-docs/TemplateStudioSubTab.tsx`
- **주요 Export 심볼**: `TemplateStudioPreviewSheetProps`, `TemplateStudioPreviewSheet`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/corporate-docs/corporateDocTypes.ts`, `src/lib/businessEntities.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/corporate-docs/TemplateStudioSubTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 주주명세서·주주서면결의서·신구조문대비표·등기용 주주명부 4종 서식의 우측 A4 미리보기 시트와 텍스트 복사·인쇄 액션 헤더를 렌더링한다.

#### 4.4.14 `src/app/erp/components/corporate-docs/TemplateStudioSubTab.tsx`
- **규모 / 계층 / 메뉴ID**: 597줄 (27.4 KB) / `L4_UI_SUBMODULES` / `CORPORATE_DOCS` / 대칭·연관 쌍: `src/app/erp/components/CorporateDocumentTab.tsx`
- **주요 Export 심볼**: `TemplateStudioSubTabProps`, `TemplateStudioSubTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/corporate-docs/TemplateStudioPreviewSheet.tsx`, `src/app/erp/components/corporate-docs/corporateDocTypes.ts`, `src/lib/businessEntities.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/CorporateDocumentTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 주주명세서·주주서면결의서·신구조문대비표·등기용 주주명부 4종 서식 선택·좌측 제원 입력 패널을 제공하고 TemplateStudioPreviewSheet로 미리보기를 연계한다.

#### 4.4.15 `src/app/erp/components/corporate-docs/UploadDocModal.tsx`
- **규모 / 계층 / 메뉴ID**: 191줄 (7.6 KB) / `L4_UI_SUBMODULES` / `CORPORATE_DOCS` / 대칭·연관 쌍: `src/app/erp/components/CorporateDocumentTab.tsx`
- **주요 Export 심볼**: `UploadDocModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/corporate-docs/corporateDocTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/CorporateDocumentTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 사업장 구분·문서 분류·문서명·시행일·버전·개정 사유와 파일을 입력받아 신규 중요문서 마스터를 등록하거나 기존 문서의 신규 개정 버전을 업로드한다.

#### 4.4.16 `src/app/erp/components/corporate-docs/corporateDocTemplates.ts`
- **규모 / 계층 / 메뉴ID**: 694줄 (30.9 KB) / `L4_UI_SUBMODULES` / `CORPORATE_DOCS` / 대칭·연관 쌍: `src/app/erp/components/CorporateDocumentTab.tsx`
- **주요 Export 심볼**: `buildGeneratedTemplateText`, `printCorporateTemplate`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/corporate-docs/corporateDocTypes.ts`, `src/lib/businessEntities.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/CorporateDocumentTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 법인 제원과 입력 상태로 주주서면결의서·신구조문대비표·주주명부 텍스트를 생성(buildGeneratedTemplateText)하고 4종 A4 인쇄 팝업을 출력(printCorporateTemplate)한다.

#### 4.4.17 `src/app/erp/components/corporate-docs/corporateDocTypes.ts`
- **규모 / 계층 / 메뉴ID**: 88줄 (2.1 KB) / `L4_UI_SUBMODULES` / `CORPORATE_DOCS` / 대칭·연관 쌍: `src/app/erp/components/CorporateDocumentTab.tsx`
- **주요 Export 심볼**: `DocVersionItem`, `CorporateDocItem`, `CorporateDocumentTabProps`, `DOC_CATEGORIES`, `MainSubTab`, `CorporateTemplateType`, `TemplateStudioState`, `formatBytes`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 7`)**: `src/app/erp/components/CorporateDocumentTab.tsx`, `src/app/erp/components/corporate-docs/CorporateDocVaultSubTab.tsx`, `src/app/erp/components/corporate-docs/EntityManualSubTabs.tsx`, `src/app/erp/components/corporate-docs/TemplateStudioPreviewSheet.tsx`, `src/app/erp/components/corporate-docs/TemplateStudioSubTab.tsx`, `src/app/erp/components/corporate-docs/UploadDocModal.tsx`, `src/app/erp/components/corporate-docs/corporateDocTemplates.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 법인 중요문서 및 버전 타입, 문서 카테고리 상수(DOC_CATEGORIES), 서식 스튜디오 상태 타입(TemplateStudioState) 및 바이트 단위 변환 함수(formatBytes)를 정의한다.

#### 4.4.18 `src/app/erp/components/employment-contracts/ContractDocumentPreviewPanel.tsx`
- **규모 / 계층 / 메뉴ID**: 560줄 (24.7 KB) / `L4_UI_SUBMODULES` / `EMPLOYMENT_CONTRACT` / 대칭·연관 쌍: `src/app/erp/components/EmploymentContractTab.tsx`
- **주요 Export 심볼**: `ContractDocumentPreviewPanelProps`, `ContractDocumentPreviewPanel`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/employment-contracts/employmentContractTypes.ts` · 호출 API `/api/erp/vault`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/EmploymentContractTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 표준 근로계약서·정보보호서약서 A4 양식 렌더링과 등록된 계약서·서약서 스캔본(PDF·이미지) 미리보기, 다운로드, 파일 업로드 트리거 및 A4 출력 기능을 제공한다.

#### 4.4.19 `src/app/erp/components/employment-contracts/EmploymentContractFormAndListPanel.tsx`
- **규모 / 계층 / 메뉴ID**: 712줄 (30.3 KB) / `L4_UI_SUBMODULES` / `EMPLOYMENT_CONTRACT` / 대칭·연관 쌍: `src/app/erp/components/EmploymentContractTab.tsx`
- **주요 Export 심볼**: `EmploymentContractDraftForm`, `EmploymentContractFormAndListPanelProps`, `EmploymentContractFormAndListPanel`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/employment-contracts/employmentContractTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/hangulSearch.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/EmploymentContractTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 연도별 근로계약서·보안서약서 보관 대장 테이블(정렬·초성검색 지원)과 8행 계약·서약서·임금 상세 입력 폼 및 사원 마스터 동기화 옵션을 렌더링한다.

#### 4.4.20 `src/app/erp/components/employment-contracts/employmentContractTypes.ts`
- **규모 / 계층 / 메뉴ID**: 145줄 (3.6 KB) / `L4_UI_SUBMODULES` / `EMPLOYMENT_CONTRACT` / 대칭·연관 쌍: `src/app/erp/components/EmploymentContractTab.tsx`
- **주요 Export 심볼**: `EmploymentContractItem`, `EmployeeOption`, `RightViewMode`, `EmploymentContractFormState`, `CONTRACT_TYPE_LABELS`, `formatKoreanDateParts`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 3`)**: `src/app/erp/components/EmploymentContractTab.tsx`, `src/app/erp/components/employment-contracts/ContractDocumentPreviewPanel.tsx`, `src/app/erp/components/employment-contracts/EmploymentContractFormAndListPanel.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 근로계약서·임직원 옵션·폼 상태·우측 뷰 모드 타입과 계약 유형 배지 상수(CONTRACT_TYPE_LABELS), 연월일 분리 함수(formatKoreanDateParts)를 정의한다.

#### 4.4.21 `src/app/erp/components/expenses/ExpenseCreateAndPreviewModals.tsx`
- **규모 / 계층 / 메뉴ID**: 454줄 (19.3 KB) / `L4_UI_SUBMODULES` / `EXPENSE_RECEIPT` / 대칭·연관 쌍: `src/app/erp/components/ExpenseReceiptTab.tsx`
- **주요 Export 심볼**: `ExpenseReceiptItem`, `EmployeeOption`, `ExpenseCreateFormState`, `ExpenseCreateAndPreviewModalsProps`, `ExpenseCreateAndPreviewModals`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpFormat.ts` · 호출 API `/api/erp/vault`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/ExpenseReceiptTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: AI 영수증 스캔 자동입력 경비 등록 모달과 /api/erp/vault 기반 PDF·이미지 증빙 미리보기 모달(ExpenseCreateAndPreviewModals)을 지연 로딩 단위로 제공한다.

#### 4.4.22 `src/app/erp/components/financial-report/AccountingStandardModals.tsx`
- **규모 / 계층 / 메뉴ID**: 471줄 (25.6 KB) / `L4_UI_SUBMODULES` / `FINANCIAL_REPORT` / 대칭·연관 쌍: `src/app/erp/components/FinancialReportTab.tsx`
- **주요 Export 심볼**: `AccountingStandardModals`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/data/accountSubjectStandardsMap.ts`, `src/app/erp/data/accountingStandardsMeta.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/FinancialReportTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 계정과목별 준용 중소기업회계기준 요약·조문 원문·해설 지침을 표시하는 회계기준 모달과 6대 영역 부합성 검증 총괄 보고서 모달을 렌더링한다.

#### 4.4.23 `src/app/erp/components/financial-report/FinancialDetailLedgerSection.tsx`
- **규모 / 계층 / 메뉴ID**: 275줄 (14.2 KB) / `L4_UI_SUBMODULES` / `FINANCIAL_REPORT` / 대칭·연관 쌍: `src/app/erp/components/FinancialReportTab.tsx`
- **주요 Export 심볼**: `FinancialDetailLedgerSection`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/financial-report/financialReportTypes.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/FinancialReportTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 계정대분류·월·세목 필터와 검색을 지원하며 모바일 전표 카드 목록 및 PC 정렬 상세 전표 테이블을 렌더링하고 더블클릭 시 회계기준 모달을 호출한다.

#### 4.4.24 `src/app/erp/components/financial-report/FinancialStatementsBoard.tsx`
- **규모 / 계층 / 메뉴ID**: 857줄 (50.8 KB) / `L4_UI_SUBMODULES` / `FINANCIAL_REPORT` / 대칭·연관 쌍: `src/app/erp/components/FinancialReportTab.tsx`
- **주요 Export 심볼**: `FinancialStatementsBoard`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/financial-report/financialReportTypes.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/FinancialReportTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 재무상태표(BS)·손익계산서(PL)·현금흐름표(CF) 보드, 매출채권·매입채무 미결 내역 팝오버, 연도별 주석 및 세무 4대 항목 입력·저장 UI를 제공한다.

#### 4.4.25 `src/app/erp/components/financial-report/MonthlyAccountMatrixSection.tsx`
- **규모 / 계층 / 메뉴ID**: 669줄 (35.7 KB) / `L4_UI_SUBMODULES` / `FINANCIAL_REPORT` / 대칭·연관 쌍: `src/app/erp/components/FinancialReportTab.tsx`
- **주요 Export 심볼**: `MonthlyAccountMatrixSection`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/financial-report/financialReportTypes.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/FinancialReportTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 월별 계정과목 손익·수지 매트릭스(접기·드릴다운·회계기준 조회)와 월별 유형자산 가치 변동 및 감가상각 명세표를 렌더링한다.

#### 4.4.26 `src/app/erp/components/financial-report/financialReportTypes.ts`
- **규모 / 계층 / 메뉴ID**: 316줄 (8.8 KB) / `L4_UI_SUBMODULES` / `FINANCIAL_REPORT` / 대칭·연관 쌍: `src/app/erp/components/FinancialReportTab.tsx`
- **주요 Export 심볼**: `MajorAccountKey`, `FinancialDetailItem`, `AccountRow`, `MonthlyTotal`, `UnsettledInvoiceBreakdownItem`, `StatementsData`, `FinancialSummary`, `FinancialReportTabProps`, `MAJOR_LABELS`, `CORP_FOUNDING_YEAR`, `EARLIEST_DATA_YEAR`, `formatFiscalTermLabel` 외 1개
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 5`)**: `src/app/api/erp/financial-report/financialStatementsBuilder.ts`, `src/app/erp/components/FinancialReportTab.tsx`, `src/app/erp/components/financial-report/FinancialDetailLedgerSection.tsx`, `src/app/erp/components/financial-report/FinancialStatementsBoard.tsx`, `src/app/erp/components/financial-report/MonthlyAccountMatrixSection.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 재무제표(BS·PL·CF)·계정행·전표상세 타입, 대분류 스타일 상수(MAJOR_LABELS), 회계기수 라벨 포맷터 및 손익·주석 CSV 내보내기 함수를 정의한다.

#### 4.4.27 `src/app/erp/components/gov-support/GovSupportDossierPanel.tsx`
- **규모 / 계층 / 메뉴ID**: 375줄 (18 KB) / `L4_UI_SUBMODULES` / `GOV_SUPPORT` / 대칭·연관 쌍: `src/app/erp/components/GovSupportIntelTab.tsx`
- **주요 Export 심볼**: `GovSupportDossierPanel`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/gov-support/govSupportTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/GovSupportIntelTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 선택된 정부지원·뉴스 항목의 제원 요약, 원문·요약 전환 뷰, Google AI Ultra 프롬프트 복사·연결, 자격요건·실행플랜·검토메모 편집 패널(GovSupportDossierPanel)을 제공한다.

#### 4.4.28 `src/app/erp/components/gov-support/GovSupportModals.tsx`
- **규모 / 계층 / 메뉴ID**: 477줄 (20.4 KB) / `L4_UI_SUBMODULES` / `GOV_SUPPORT` / 대칭·연관 쌍: `src/app/erp/components/GovSupportIntelTab.tsx`
- **주요 Export 심볼**: `GovSupportModals`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/gov-support/govSupportTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/GovSupportIntelTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 수집 원문 전체보기 리더 모달, Gemini API 키·기업 프로필 설정 모달 및 정부지원·뉴스 수동 등록 모달을 지연 로딩 단위로 제공한다.

#### 4.4.29 `src/app/erp/components/gov-support/govSupportTypes.ts`
- **규모 / 계층 / 메뉴ID**: 105줄 (3.4 KB) / `L4_UI_SUBMODULES` / `GOV_SUPPORT` / 대칭·연관 쌍: `src/app/erp/components/GovSupportIntelTab.tsx`
- **주요 Export 심볼**: `GovSupportItem`, `AiIntelSettings`, `GovSupportCreateForm`, `CATEGORY_META`, `STATUS_META`, `QUICK_TOPICS`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 3`)**: `src/app/erp/components/GovSupportIntelTab.tsx`, `src/app/erp/components/gov-support/GovSupportDossierPanel.tsx`, `src/app/erp/components/gov-support/GovSupportModals.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 정부지원·조달·뉴스 항목(GovSupportItem), AI 연동 설정(AiIntelSettings), 수동 등록 폼 타입, 분류·진행상태 배지 메타 및 탐색 프리셋 상수를 정의한다.

#### 4.4.30 `src/app/erp/components/obsidian/ObsidianSyncAndErrorModals.tsx`
- **규모 / 계층 / 메뉴ID**: 174줄 (8.9 KB) / `L4_UI_SUBMODULES` / `OBSIDIAN_VAULT` / 대칭·연관 쌍: `src/app/erp/components/ObsidianVaultTab.tsx`
- **주요 Export 심볼**: `R2SyncConfig`, `ObsidianSyncAndErrorModalsProps`, `ObsidianSyncAndErrorModals`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/ObsidianVaultTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 옵시디언 노트 오류 안내 모달 및 로컬 폴더·Cloudflare R2 Remotely Save 연동 설정 가이드 모달(ObsidianSyncAndErrorModals)을 지연 로딩 단위로 제공한다.

#### 4.4.31 `src/app/erp/components/obsidian/obsidianMarkdownPreview.tsx`
- **규모 / 계층 / 메뉴ID**: 193줄 (6.3 KB) / `L4_UI_SUBMODULES` / `OBSIDIAN_VAULT` / 대칭·연관 쌍: `src/app/erp/components/ObsidianVaultTab.tsx`
- **주요 Export 심볼**: `ObsidianNoteRecord`, `formatObsidianDateTime`, `renderObsidianPreview`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/ObsidianVaultTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 옵시디언 노트 레코드 인터페이스(ObsidianNoteRecord), 일시 포맷터 및 위키링크·콜아웃·마크다운 JSX 렌더러(renderObsidianPreview)를 제공한다.

#### 4.4.32 `src/app/erp/components/organization/OrgActionModalsAndAuditBar.tsx`
- **규모 / 계층 / 메뉴ID**: 291줄 (10.4 KB) / `L4_UI_SUBMODULES` / `ORG` / 대칭·연관 쌍: `src/app/erp/components/OrganizationTab.tsx`
- **주요 Export 심볼**: `OrgAuditSummary`, `OrgActionModalsAndAuditBarProps`, `OrgActionModalsAndAuditBar`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/organization/organizationTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/OrganizationTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 임직원 퇴사·업무이관 확인 모달, 부서 삭제 확인 모달, 오류 안내 모달, 알림 토스트 및 하단 Z-패턴 조직·인사 대차대조 검증 바를 렌더링한다.

#### 4.4.33 `src/app/erp/components/organization/OrgTreeAndMemberGrid.tsx`
- **규모 / 계층 / 메뉴ID**: 745줄 (27.3 KB) / `L4_UI_SUBMODULES` / `ORG` / 대칭·연관 쌍: `src/app/erp/components/OrganizationTab.tsx`
- **주요 Export 심볼**: `OrgTreeAndMemberGridProps`, `OrgTreeAndMemberGrid`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/organization/organizationTypes.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/OrganizationTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 좌측 재귀 부서 트리, 미배정 인력풀 드롭존, 9대 보편 기능 칩 매핑 패널 및 드래그앤드롭 배속 지원 임직원 카드·리스트 그리드를 렌더링한다.

#### 4.4.34 `src/app/erp/components/organization/ProfileCompensationAndLeaveSection.tsx`
- **규모 / 계층 / 메뉴ID**: 385줄 (12.9 KB) / `L4_UI_SUBMODULES` / `ORG` / 대칭·연관 쌍: `src/app/erp/components/organization/SelectedProfilePanel.tsx`
- **주요 Export 심볼**: `ProfileCompensationAndLeaveSectionProps`, `ProfileCompensationAndLeaveSection`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/organization/organizationTypes.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/organization/SelectedProfilePanel.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 선택 직원의 급여 수령 계좌(은행명·예금주·계좌번호), 월 급여(계약 기본급·통상임금·식대·차량보조금·합계) 및 4대보험 가입여부 일괄 토글 편집 섹션을 제공한다.

#### 4.4.35 `src/app/erp/components/organization/SelectedProfilePanel.tsx`
- **규모 / 계층 / 메뉴ID**: 629줄 (27.3 KB) / `L4_UI_SUBMODULES` / `ORG` / 대칭·연관 쌍: `src/app/erp/components/OrganizationTab.tsx`
- **주요 Export 심볼**: `SelectedProfilePanelProps`, `SelectedProfilePanel`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/organization/ProfileCompensationAndLeaveSection.tsx`, `src/app/erp/components/organization/organizationTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/OrganizationTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 선택 직원의 프로필 사진·로그인ID·비밀번호·재직상태·직급·직책(결재 티어)·역할·소속부서·입퇴사일 편집 및 ProfileCompensationAndLeaveSection 연계를 제공한다.

#### 4.4.36 `src/app/erp/components/organization/organizationTypes.ts`
- **규모 / 계층 / 메뉴ID**: 213줄 (9 KB) / `L4_UI_SUBMODULES` / `ORG` / 대칭·연관 쌍: `src/app/erp/components/OrganizationTab.tsx`
- **주요 Export 심볼**: `ApprovalTierConfig`, `DEFAULT_POSITION_TIERS`, `DEFAULT_DUTY_TIERS`, `getUserEffectiveTier`, `FunctionalAttributeConfig`, `UNIVERSAL_FUNCTIONAL_ATTRIBUTES`, `Department`, `getDepartmentFunctionalTags`, `UserNode`, `maskPhoneNumber`, `maskEmail`, `maskName` 외 2개
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 7`)**: `src/app/erp/components/OrganizationTab.tsx`, `src/app/erp/components/organization/OrgActionModalsAndAuditBar.tsx`, `src/app/erp/components/organization/OrgTreeAndMemberGrid.tsx`, `src/app/erp/components/organization/ProfileCompensationAndLeaveSection.tsx`, `src/app/erp/components/organization/SelectedProfilePanel.tsx`, `src/app/erp/components/organization/useOrganizationController.ts`, `src/lib/erpApprovalLine.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 직급·직책 결재 티어 설정, 기능 속성(UNIVERSAL_FUNCTIONAL_ATTRIBUTES), 부서·사원 노드 타입, 유효 티어 판정(getUserEffectiveTier) 및 개인정보 마스킹 함수를 정의한다.

#### 4.4.37 `src/app/erp/components/organization/useOrganizationController.ts`
- **규모 / 계층 / 메뉴ID**: 824줄 (29 KB) / `L4_UI_SUBMODULES` / `ORG` / 대칭·연관 쌍: `src/app/erp/components/OrganizationTab.tsx`
- **주요 Export 심볼**: `useOrganizationController`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/organization/organizationTypes.ts`, `src/lib/erpFormat.ts` · 호출 API `/api/erp/departments`, `/api/erp/employees`, `/api/erp/organization/batch`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/OrganizationTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 조직도·임직원 상태 조회(/api/erp/departments·employees), /api/erp/organization/batch 일괄 저장, 부서·직무 태그 CRUD, 드래그앤드롭 배속 및 퇴사·삭제 핸들러를 제어하는 전용 훅.

#### 4.4.38 `src/app/erp/components/outbound/OutboundBillingAndLogsPanel.tsx`
- **규모 / 계층 / 메뉴ID**: 385줄 (20 KB) / `L4_UI_SUBMODULES` / `OUTBOUND_REG` / 대칭·연관 쌍: `src/app/erp/components/OutboundRegTab.tsx`
- **주요 Export 심볼**: `RentalAssetItem`, `BillingItem`, `CustomerBillingSummary`, `InoutLogItem`, `OutboundActiveView`, `TableSortControl`, `OutboundBillingAndLogsPanelProps`, `OutboundBillingAndLogsPanel`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/rentalFeeUtils.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/OutboundRegTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 출고등록 탭에서 조건부 동적 로딩되는 매출청구 집계 및 출고이력 패널(OutboundBillingAndLogsPanel)과 공용 타입(RentalAssetItem, BillingItem, InoutLogItem)·정렬 컨트롤(TableSortControl)을 제공한다.

#### 4.4.39 `src/app/erp/components/overtime/OtRequestModal.tsx`
- **규모 / 계층 / 메뉴ID**: 490줄 (23.6 KB) / `L4_UI_SUBMODULES` / `OT_MANAGE` / 대칭·연관 쌍: `src/app/erp/components/OtManagementTab.tsx`
- **주요 Export 심볼**: `OtEmployee`, `OtFormState`, `OtLiveBreakdown`, `OtRequestModal`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpFormat.ts`, `src/lib/erpHrLaborDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/OtManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 24시간 시분 키보드 입력, 단축 시간 프리셋, 연장·야간·휴일 판별 및 수당 계산 명세를 포함하는 초과근무 신청 등록 모달(OtRequestModal)을 제공한다.

#### 4.4.40 `src/app/erp/components/partners/BankCopyOcrModal.tsx`
- **규모 / 계층 / 메뉴ID**: 243줄 (12.2 KB) / `L4_UI_SUBMODULES` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `BankCopyOcrModalProps`, `BankCopyOcrModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/partners/partnerTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/PartnerManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 통장사본 파일 드래그·업로드, AI OCR 계좌 정보(은행명·계좌번호·예금주·개설지점) 추출 결과 편집, 원본 미리보기 및 매입거래처 폼 자동 채우기 모달을 제공한다.

#### 4.4.41 `src/app/erp/components/partners/BizCertOcrModal.tsx`
- **규모 / 계층 / 메뉴ID**: 284줄 (15.4 KB) / `L4_UI_SUBMODULES` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `BizCertOcrModalProps`, `BizCertOcrModal`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/partnerStatusClient.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/PartnerManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 사업자등록증 파일 드래그·업로드, OCR 인식 결과(상호·사업자번호·대표자·업태·종목·주소·이메일) 편집, 국세청 휴폐업 상태 표시 및 거래처 등록 양식 반영 모달을 제공한다.

#### 4.4.42 `src/app/erp/components/partners/BizStatusBatchModal.tsx`
- **규모 / 계층 / 메뉴ID**: 342줄 (21.3 KB) / `L4_UI_SUBMODULES` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `BizStatusBatchModalProps`, `BizStatusBatchModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/partners/partnerTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/partnerStatusClient.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/PartnerManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 거래처 범위(매출처·필터목록·전체) 선택과 휴·폐업 거래불가 자동적용 옵션으로 국세청 휴폐업 일괄조회를 실행하고 결과 KPI·정렬 테이블·정상 복원 조치를 제공한다.

#### 4.4.43 `src/app/erp/components/partners/ContactFormModal.tsx`
- **규모 / 계층 / 메뉴ID**: 236줄 (12.4 KB) / `L4_UI_SUBMODULES` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `ContactFormModalProps`, `ContactFormModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/partners/partnerTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/PartnerManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 거래처 담당자의 성명·부서·직책·연락처·이메일·대표담당자 여부·업무 메모와 명함 앞·뒷면 사진 업로드 및 이미지 확대 미리보기를 입력·수정하는 모달을 제공한다.

#### 4.4.44 `src/app/erp/components/partners/PartnerDocViewerModal.tsx`
- **규모 / 계층 / 메뉴ID**: 625줄 (31.9 KB) / `L4_UI_SUBMODULES` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `PartnerDocViewerModalProps`, `PartnerDocViewerModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/partners/partnerPdfUtils.ts`, `src/app/erp/components/partners/partnerTypes.ts`, `src/lib/partnerStatusClient.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/PartnerManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 거래처 증빙(PDF·이미지)의 확대·축소·회전·파일 교체·새 탭 열기·인쇄·다운로드 뷰어를 제공하며 파트너 ID 존재 시 좌측 원본 대조 우측 거래처 정보 수정 스튜디오를 렌더링한다.

#### 4.4.45 `src/app/erp/components/partners/PartnerDossierPanel.tsx`
- **규모 / 계층 / 메뉴ID**: 846줄 (48.2 KB) / `L4_UI_SUBMODULES` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `PartnerDossierPanelProps`, `PartnerDossierPanel`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/partners/partnerTypes.ts`, `src/lib/partnerStatusClient.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/PartnerManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 선택 거래처의 정산 마감조건·사업자 제원·국세청 휴폐업 조회·수신 이메일 인라인 편집·사업자등록증/계약서/통장사본 보관함·담당자 및 명함 목록을 표시하는 상세 패널을 제공한다.

#### 4.4.46 `src/app/erp/components/partners/PartnerFormModal.tsx`
- **규모 / 계층 / 메뉴ID**: 856줄 (47.7 KB) / `L4_UI_SUBMODULES` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `PartnerFormModalProps`, `PartnerFormModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/partners/partnerPdfUtils.ts`, `src/app/erp/components/partners/partnerTypes.ts`, `src/lib/partnerStatusClient.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/PartnerManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 거래처 신규 등록·수정 모달로 사업자등록증·통장사본 OCR 추출, 국세청 휴폐업 조회, 정산 마감일·계좌·계약서 파일 첨부 및 기본 제원 입력 폼을 제공한다.

#### 4.4.47 `src/app/erp/components/partners/PartnerListPanel.tsx`
- **규모 / 계층 / 메뉴ID**: 245줄 (14.6 KB) / `L4_UI_SUBMODULES` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `PartnerListPanelProps`, `PartnerListPanel`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/partners/partnerTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/partnerStatusClient.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/PartnerManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 매출처·매입처·전체 거래처 목록 테이블과 계약서·등록증·통장사본 보관 요약 KPI, 증빙 열람 뱃지 버튼, 담당자 수 및 국세청·거래불가 상태 뱃지를 렌더링한다.

#### 4.4.48 `src/app/erp/components/partners/partnerFormHelpers.ts`
- **규모 / 계층 / 메뉴ID**: 358줄 (11.1 KB) / `L4_UI_SUBMODULES` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `PartnerFileBundle`, `createDefaultPartnerForm`, `createPartnerFormFromPartner`, `createDefaultPartnerBankOcrForm`, `createPartnerFormFromBizCertOcr`, `createViewerFormFromPartner`, `createDefaultContactForm`, `createContactFormFromContact`, `buildPartnerPutPayload`, `mergeBizCertParsedIntoForm`, `mergeNtsStatusIntoForm`, `mergePreloadedFilesIntoPartnerForm` 외 3개
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/partners/partnerTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/erp/components/PartnerManagementTab.tsx`, `src/app/erp/components/partners/usePartnerDocAndNtsActions.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 거래처·담당자·통장OCR·원본뷰어 폼 초기값 생성기, PUT 페이로드 빌더(buildPartnerPutPayload), OCR·국세청 상태 병합 및 PDF Blob 변환 순수 헬퍼를 제공한다.

#### 4.4.49 `src/app/erp/components/partners/partnerPdfUtils.ts`
- **규모 / 계층 / 메뉴ID**: 320줄 (9.9 KB) / `L4_UI_SUBMODULES` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `extractPdfImageAndTextFromSource`, `resizeImageToBase64`, `exportPartnersToCsv`, `readFileAsDataUrl`, `isPdfDocument`, `processBankCopyOcr`, `extractBizCertOcrFromFile`, `queryNtsByBizNoClient`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/partners/partnerTypes.ts`, `src/lib/partnerStatusClient.ts` · 호출 API `/api/erp/partners/check-biz-status`, `/api/erp/partners/ocr-bank`, `/api/erp/partners/ocr-biz-cert`
- **역방향 피참조 (`In`, `Fan-In: 4`)**: `src/app/erp/components/PartnerManagementTab.tsx`, `src/app/erp/components/partners/PartnerDocViewerModal.tsx`, `src/app/erp/components/partners/PartnerFormModal.tsx`, `src/app/erp/components/partners/usePartnerDocAndNtsActions.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: pdf.js 기반 PDF 1페이지 이미지·텍스트 추출, 캔버스 이미지 리사이즈, 거래처 CSV 내보내기, 통장사본·사업자등록증 OCR 및 국세청 휴폐업 조회 API 호출 함수를 제공한다.

#### 4.4.50 `src/app/erp/components/partners/partnerTypes.ts`
- **규모 / 계층 / 메뉴ID**: 108줄 (2.6 KB) / `L4_UI_SUBMODULES` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `KOREAN_BANKS`, `ActiveDocumentViewer`, `PartnerContact`, `Partner`, `PartnerManagementTabProps`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 11`)**: `src/app/erp/components/PartnerManagementTab.tsx`, `src/app/erp/components/partners/BankCopyOcrModal.tsx`, `src/app/erp/components/partners/BizStatusBatchModal.tsx`, `src/app/erp/components/partners/ContactFormModal.tsx`, `src/app/erp/components/partners/PartnerDocViewerModal.tsx`, `src/app/erp/components/partners/PartnerDossierPanel.tsx`, `src/app/erp/components/partners/PartnerFormModal.tsx`, `src/app/erp/components/partners/PartnerListPanel.tsx`, `src/app/erp/components/partners/partnerFormHelpers.ts`, `src/app/erp/components/partners/partnerPdfUtils.ts`, `src/app/erp/components/partners/usePartnerDocAndNtsActions.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 은행 목록 상수(KOREAN_BANKS), 문서 뷰어 상태(ActiveDocumentViewer), 거래처 담당자(PartnerContact), 거래처 마스터(Partner) 및 탭 Props 타입을 정의한다.

#### 4.4.51 `src/app/erp/components/partners/usePartnerDocAndNtsActions.ts`
- **규모 / 계층 / 메뉴ID**: 938줄 (34.7 KB) / `L4_UI_SUBMODULES` / `CUSTOMER|VENDOR` / 대칭·연관 쌍: `src/app/erp/components/PartnerManagementTab.tsx`
- **주요 Export 심볼**: `UsePartnerDocAndNtsActionsParams`, `usePartnerDocAndNtsActions`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/partners/partnerFormHelpers.ts`, `src/app/erp/components/partners/partnerPdfUtils.ts`, `src/app/erp/components/partners/partnerTypes.ts`, `src/lib/partnerStatusClient.ts` · 호출 API `/api/erp/partners`, `/api/erp/partners/check-biz-status`, `/api/erp/partners/ocr-bank`, `/api/erp/partners/ocr-biz-cert`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/PartnerManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 거래처 증빙 온디맨드 로드·업로드·삭제, 사업자등록증·통장사본·계약서 OCR, 단건·일괄 국세청 휴폐업 조회 및 분할 뷰어 저장 액션 훅(usePartnerDocAndNtsActions)을 제공한다.

#### 4.4.52 `src/app/erp/components/payroll/PayrollEditAndOcrModals.tsx`
- **규모 / 계층 / 메뉴ID**: 347줄 (16.9 KB) / `L4_UI_SUBMODULES` / `PAYROLL` / 대칭·연관 쌍: `src/app/erp/components/PayrollTab.tsx`
- **주요 Export 심볼**: `PayrollRecord`, `OcrPayrollResult`, `PayrollEditAndOcrModals`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/PayrollTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 급여대장 PDF 업로드 OCR 추출·대조 모달과 개인별 급여 항목 세부 편집·저장 모달(PayrollEditAndOcrModals)을 지연 로딩 단위로 제공한다.

#### 4.4.53 `src/app/erp/components/products/ProductDossierAndAddModal.tsx`
- **규모 / 계층 / 메뉴ID**: 569줄 (28.4 KB) / `L4_UI_SUBMODULES` / `PRODUCT` / 대칭·연관 쌍: `src/app/erp/components/ProductManagementTab.tsx`
- **주요 Export 심볼**: `ProductModel`, `ProductAddFormState`, `ProductDossierAndAddModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ForkliftSpecEditor.tsx`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/rentalFeeUtils.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/ProductManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 제품 슬라이드오버 상세·연결 자산·ForkliftSpecEditor 제원 편집 패널과 신규 제품 모델 등록 모달(ProductDossierAndAddModal)을 지연 로딩 단위로 제공한다.

#### 4.4.54 `src/app/erp/components/rental-biz-dir/PortalGuideModal.tsx`
- **규모 / 계층 / 메뉴ID**: 359줄 (21.4 KB) / `L4_UI_SUBMODULES` / `RENTAL_BIZ_DIR` / 대칭·연관 쌍: `src/app/erp/components/RentalBizDirectoryTab.tsx`
- **주요 Export 심볼**: `PortalGuideModalProps`, `PortalGuideModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/api/erp/rental-directory/officialMolitStats.json`, `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/rental-biz-dir/rentalBizTypes.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/RentalBizDirectoryTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 국토교통부·대한건설기계협회 시도별 사업자 현황표, 27개 기종별 등록현황표, 지자체 인허가 CSV 원부 다운로드 표 및 공식 원천기관 링크 4개 탭 모달을 제공한다.

#### 4.4.55 `src/app/erp/components/rental-biz-dir/RentalBizDetailPanel.tsx`
- **규모 / 계층 / 메뉴ID**: 240줄 (10.2 KB) / `L4_UI_SUBMODULES` / `RENTAL_BIZ_DIR` / 대칭·연관 쌍: `src/app/erp/components/RentalBizDirectoryTab.tsx`
- **주요 Export 심볼**: `RentalBizDetailPanelProps`, `RentalBizDetailPanel`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/rental-biz-dir/rentalBizTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/RentalBizDirectoryTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 선택된 렌탈 사업자의 업종·OA공급유형·영업상태 변경, ERP 매출처·매입처 등록 연동, 사업자번호·원천·취급 브랜드·품목 상세 조회 및 제휴 메모 저장 패널을 제공한다.

#### 4.4.56 `src/app/erp/components/rental-biz-dir/RentalBizFormModal.tsx`
- **규모 / 계층 / 메뉴ID**: 188줄 (7.2 KB) / `L4_UI_SUBMODULES` / `RENTAL_BIZ_DIR` / 대칭·연관 쌍: `src/app/erp/components/RentalBizDirectoryTab.tsx`
- **주요 Export 심볼**: `RentalBizFormModalProps`, `RentalBizFormModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/rental-biz-dir/rentalBizTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/RentalBizDirectoryTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 렌탈·판매 사업자의 업종 구분(FL·AWP·OA_PC), 상호, 사업자번호, 대표자, 권역, 연락처, 주소, 영업 형태, 취급 브랜드·품목, 홈페이지 등록 및 수정 모달을 제공한다.

#### 4.4.57 `src/app/erp/components/rental-biz-dir/RentalBizToolbarAndGrid.tsx`
- **규모 / 계층 / 메뉴ID**: 756줄 (33.1 KB) / `L4_UI_SUBMODULES` / `RENTAL_BIZ_DIR` / 대칭·연관 쌍: `src/app/erp/components/RentalBizDirectoryTab.tsx`
- **주요 Export 심볼**: `RentalBizCounts`, `RentalBizToolbarAndGridProps`, `RentalBizToolbarAndGrid`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/rental-biz-dir/rentalBizTypes.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/RentalBizDirectoryTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 렌탈 사업자 DB 상단 툴바, 업종·OA 공급 필터, AI·공식 게시판 발굴 바, 검색·외부 DB 조회 바 및 SortableTh 마스터 테이블 그리드를 렌더링한다.

#### 4.4.58 `src/app/erp/components/rental-biz-dir/rentalBizTypes.ts`
- **규모 / 계층 / 메뉴ID**: 158줄 (6.3 KB) / `L4_UI_SUBMODULES` / `RENTAL_BIZ_DIR` / 대칭·연관 쌍: `src/app/erp/components/RentalBizDirectoryTab.tsx`
- **주요 Export 심볼**: `RentalBizRecord`, `SECTOR_META`, `OaSupplyType`, `OA_SUPPLY_META`, `resolveOaSupplyType`, `SALES_STATUS_META`, `OFFICIAL_PORTAL_LINKS`, `RentalBizFormData`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 5`)**: `src/app/erp/components/RentalBizDirectoryTab.tsx`, `src/app/erp/components/rental-biz-dir/PortalGuideModal.tsx`, `src/app/erp/components/rental-biz-dir/RentalBizDetailPanel.tsx`, `src/app/erp/components/rental-biz-dir/RentalBizFormModal.tsx`, `src/app/erp/components/rental-biz-dir/RentalBizToolbarAndGrid.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 렌탈 사업자 레코드(RentalBizRecord)·폼 타입, 업종·OA공급·영업상태 메타 상수, 공식 포털 링크 목록 및 OA 공급유형 판별 함수(resolveOaSupplyType)를 정의한다.

#### 4.4.59 `src/app/erp/components/rental-maintenance/HoursWearAndVehicleStockTabs.tsx`
- **규모 / 계층 / 메뉴ID**: 880줄 (52 KB) / `L4_UI_SUBMODULES` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: `src/app/erp/components/RentalMaintenanceTab.tsx`
- **주요 Export 심볼**: `HoursWearSubTabProps`, `HoursWearSubTab`, `VehicleStockSubTabProps`, `VehicleStockSubTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/rental-maintenance/rentalMaintenanceTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/rentalMaintenanceDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/RentalMaintenanceTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 가동시간 기록·부품 열화율 설정 및 가동시간 이력을 관리하는 HoursWearSubTab과 정비차량·주기장 부품 재고·차량간 이동·이력을 관리하는 VehicleStockSubTab을 제공한다.

#### 4.4.60 `src/app/erp/components/rental-maintenance/MaintenanceActivitiesAndPmSubTabs.tsx`
- **규모 / 계층 / 메뉴ID**: 533줄 (29.3 KB) / `L4_UI_SUBMODULES` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: `src/app/erp/components/RentalMaintenanceTab.tsx`
- **주요 Export 심볼**: `MaintenanceActivitiesAndPmSubTabsProps`, `MaintenanceActivitiesAndPmSubTabs`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/rental-maintenance/rentalMaintenanceTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/rentalMaintenanceDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/RentalMaintenanceTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 렌탈 정비활동 필터·KPI·고밀도 대장·원가검증 푸터 서브탭(ACTIVITIES)과 정기 사전점검 일정 대상·완료 처리 서브탭(PREVENTIVE_PM)을 렌더링한다.

#### 4.4.61 `src/app/erp/components/rental-maintenance/RentalMaintActivityModal.tsx`
- **규모 / 계층 / 메뉴ID**: 634줄 (30.8 KB) / `L4_UI_SUBMODULES` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: `src/app/erp/components/RentalMaintenanceTab.tsx`
- **주요 Export 심볼**: `MaintModalProps`, `MaintModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/rental-maintenance/rentalMaintenanceTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/rentalMaintenanceDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/RentalMaintenanceTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 정비활동 등록·수정 및 7항목 점검 체크리스트·사용 부품 소진·열화 리셋 처리를 수행하는 지연 로딩 모달(MaintModal)을 제공한다.

#### 4.4.62 `src/app/erp/components/rental-maintenance/RentalMaintStockVehicleModals.tsx`
- **규모 / 계층 / 메뉴ID**: 689줄 (28.6 KB) / `L4_UI_SUBMODULES` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: `src/app/erp/components/RentalMaintenanceTab.tsx`
- **주요 Export 심볼**: `TransferModalProps`, `TransferModal`, `VehicleModalProps`, `VehicleModal`, `QuickPartModalProps`, `QuickPartModal`, `YardReceiptModalProps`, `YardReceiptModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/rental-maintenance/rentalMaintenanceTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/rentalMaintenanceDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/RentalMaintenanceTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 부품 재고 이동(TransferModal), 정비차량 등록·수정(VehicleModal), 신규 부품 SKU 등록(QuickPartModal) 및 주기장 부품 입고(YardReceiptModal) 모달을 제공한다.

#### 4.4.63 `src/app/erp/components/rental-maintenance/rentalMaintenanceTypes.ts`
- **규모 / 계층 / 메뉴ID**: 287줄 (7.7 KB) / `L4_UI_SUBMODULES` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: `src/app/erp/components/RentalMaintenanceTab.tsx`
- **주요 Export 심볼**: `SubTabKey`, `CurrentUserInfo`, `MaintenanceAssetOption`, `EmployeeOption`, `VehicleStockItem`, `ServiceVehicleRecord`, `PartCatalogItem`, `MaintenanceRecord`, `PmScheduleRow`, `AssetWearRow`, `HourLogRow`, `PartMovementRow` 외 9개
- **정방향 의존 (`Out`)**: 내부 import `src/lib/rentalMaintenanceDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 5`)**: `src/app/erp/components/RentalMaintenanceTab.tsx`, `src/app/erp/components/rental-maintenance/HoursWearAndVehicleStockTabs.tsx`, `src/app/erp/components/rental-maintenance/MaintenanceActivitiesAndPmSubTabs.tsx`, `src/app/erp/components/rental-maintenance/RentalMaintActivityModal.tsx`, `src/app/erp/components/rental-maintenance/RentalMaintStockVehicleModals.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 렌탈 정비·사전점검·열화율·가동시간 이력·정비차량·부품 재고이동 인터페이스, 상태·열화·이동유형 라벨/뱃지 상수 및 소수점 입력 정제 함수(sanitizeDecimalText)를 정의한다.

#### 4.4.64 `src/app/erp/components/rental/RentalAddContractModal.tsx`
- **규모 / 계층 / 메뉴ID**: 738줄 (37.3 KB) / `L4_UI_SUBMODULES` / `RENTAL` / 대칭·연관 쌍: `src/app/erp/components/RentalTab.tsx`
- **주요 Export 심볼**: `AddContractModalProps`, `AddContractModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/ForkliftOptionAttachPanel.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/rental/rentalTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/rentalFeeUtils.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/RentalTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 귀속 사업자·고객사 연동·재고 제품 다중 선택·부착옵션·전자세금계산서 제원·계약서 파일 첨부를 지원하는 신규 임대계약 체결 모달(AddContractModal)을 제공한다.

#### 4.4.65 `src/app/erp/components/rental/RentalAssetModelModals.tsx`
- **규모 / 계층 / 메뉴ID**: 702줄 (30.7 KB) / `L4_UI_SUBMODULES` / `RENTAL` / 대칭·연관 쌍: `src/app/erp/components/RentalTab.tsx`
- **주요 Export 심볼**: `AcquireAssetModalProps`, `AcquireAssetModal`, `AddModelModalProps`, `AddModelModal`, `AddBillingModalProps`, `AddBillingModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/lib/erpFormat.ts`, `src/lib/rentalFeeUtils.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/RentalTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 장비 구매 및 자산 일괄 취득 등록 모달(AcquireAssetModal), 임대 기종 모델·단가 등록 모달(AddModelModal), 과금기준·일할 정산 청구서 생성 모달(AddBillingModal)을 제공한다.

#### 4.4.66 `src/app/erp/components/rental/RentalEditContractModal.tsx`
- **규모 / 계층 / 메뉴ID**: 701줄 (36.6 KB) / `L4_UI_SUBMODULES` / `RENTAL` / 대칭·연관 쌍: `src/app/erp/components/RentalTab.tsx`
- **주요 Export 심볼**: `EditContractModalProps`, `EditContractModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/ForkliftOptionAttachPanel.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/rental/rentalTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/rentalFeeUtils.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/RentalTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 체결된 임대계약의 계약조건·재고 제품 다중 선택·부착옵션·세금계산서 제원·계약서 파일 첨부 교체를 수행하는 임대계약 수정 모달(EditContractModal)을 제공한다.

#### 4.4.67 `src/app/erp/components/rental/RentalSubTabGrids.tsx`
- **규모 / 계층 / 메뉴ID**: 677줄 (34.2 KB) / `L4_UI_SUBMODULES` / `RENTAL` / 대칭·연관 쌍: `src/app/erp/components/RentalTab.tsx`
- **주요 Export 심볼**: `RentalSubTabKey`, `RentalDocViewerState`, `RentalSubTabGridsProps`, `RentalSubTabGrids`, `RentalDeprecModal`, `RentalDocViewerModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/hangulSearch.ts`, `src/lib/rentalFeeUtils.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/erp/components/RentalTab.tsx`, `src/app/erp/components/rental/useRentalTabController.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 임대 자산·계약·청구·모델 4대 서브탭 필터·정렬 그리드(RentalSubTabGrids), 대차대조 합계 검증 푸터, 감가상각 실행 모달 및 계약서 증빙 뷰어 모달을 제공한다.

#### 4.4.68 `src/app/erp/components/rental/rentalTypes.ts`
- **규모 / 계층 / 메뉴ID**: 6줄 (0.1 KB) / `L4_UI_SUBMODULES` / `RENTAL` / 대칭·연관 쌍: `src/app/erp/components/RentalTab.tsx`
- **주요 Export 심볼**: `RentalItemDraft`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 3`)**: `src/app/erp/components/rental/RentalAddContractModal.tsx`, `src/app/erp/components/rental/RentalEditContractModal.tsx`, `src/app/erp/components/rental/useRentalTabController.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 임대계약 등록·수정 시 재고 제품 선택 행의 제품 ID·수량·단가 입력 상태인 RentalItemDraft 인터페이스를 정의한다.

#### 4.4.69 `src/app/erp/components/rental/useRentalTabController.ts`
- **규모 / 계층 / 메뉴ID**: 1086줄 (44.2 KB) / `L4_UI_SUBMODULES` / `RENTAL` / 대칭·연관 쌍: `src/app/erp/components/RentalTab.tsx`
- **주요 Export 심볼**: `UseRentalTabControllerParams`, `toValidRentalItemsPayload`, `toTaxSpecPayloadFields`, `useRentalTabController`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/ForkliftOptionAttachPanel.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/rental/RentalSubTabGrids.tsx`, `src/app/erp/components/rental/rentalTypes.ts`, `src/lib/erpContractTemplate.ts`, `src/lib/erpFormat.ts`, `src/lib/erpMasterDataBus.ts`, `src/lib/forkliftDomain.ts`, `src/lib/hangulSearch.ts`, `src/lib/partnerStatusClient.ts`, `src/lib/rentalFeeUtils.ts` · 호출 API `/api/erp/partners`, `/api/erp/rental/assets`, `/api/erp/rental/billings`, `/api/erp/rental/contracts`, `/api/erp/rental/depreciation`, `/api/erp/rental/products`, `/api/erp/tax-invoices`, `/api/erp/trade/products`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/RentalTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 임대계약·자산·모델·청구 데이터 조회, useMasterDataSync 캐시 동기화, 콤보박스 옵션 파생 및 계약·청구·감가상각 CRUD 핸들러 훅(useRentalTabController)을 제공한다.

#### 4.4.70 `src/app/erp/components/service/ProRataFormulaGuideBox.tsx`
- **규모 / 계층 / 메뉴ID**: 106줄 (4.5 KB) / `L4_UI_SUBMODULES` / `SERVICES` / 대칭·연관 쌍: `src/app/erp/components/ServiceTab.tsx`
- **주요 Export 심볼**: `ProRataFormulaGuideBoxProps`, `ProRataFormulaGuideBox`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/service/serviceTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/erpHrLaborDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 3`)**: `src/app/erp/components/service/ServiceAddContractModal.tsx`, `src/app/erp/components/service/ServiceBillingModal.tsx`, `src/app/erp/components/service/ServiceEditContractModal.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 투입인원 입퇴사 월 급여 209시간 주휴 및 일할계산 산식 기준 안내 박스를 렌더링하는 공용 컴포넌트(ProRataFormulaGuideBox)를 제공한다.

#### 4.4.71 `src/app/erp/components/service/ServiceAddContractModal.tsx`
- **규모 / 계층 / 메뉴ID**: 877줄 (45.6 KB) / `L4_UI_SUBMODULES` / `SERVICES` / 대칭·연관 쌍: `src/app/erp/components/ServiceTab.tsx`
- **주요 Export 심볼**: `AddContractModalProps`, `AddContractModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/service/ProRataFormulaGuideBox.tsx`, `src/app/erp/components/service/serviceTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/erpHrLaborDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/ServiceTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 귀속 사업자·거래처·투입 임직원 편성·초과근무 연동·세금계산서 제원·계약서 파일 첨부를 지원하는 신규 용역계약 등록 모달을 제공한다.

#### 4.4.72 `src/app/erp/components/service/ServiceBillingModal.tsx`
- **규모 / 계층 / 메뉴ID**: 328줄 (15.7 KB) / `L4_UI_SUBMODULES` / `SERVICES` / 대칭·연관 쌍: `src/app/erp/components/ServiceTab.tsx`
- **주요 Export 심볼**: `AddBillingModalProps`, `AddBillingModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/service/ProRataFormulaGuideBox.tsx`, `src/app/erp/components/service/serviceTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/erpHrLaborDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/ServiceTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 체결 용역계약 선택, 투입인원 입퇴사 일할계산·초과근무수당 합산 반영, 세금계산서 다중 품목 명세 연동을 포함하는 정기 용역료·기성금 청구 생성 모달을 제공한다.

#### 4.4.73 `src/app/erp/components/service/ServiceEditContractModal.tsx`
- **규모 / 계층 / 메뉴ID**: 846줄 (44.6 KB) / `L4_UI_SUBMODULES` / `SERVICES` / 대칭·연관 쌍: `src/app/erp/components/ServiceTab.tsx`
- **주요 Export 심볼**: `EditContractModalProps`, `EditContractModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/service/ProRataFormulaGuideBox.tsx`, `src/app/erp/components/service/serviceTypes.ts`, `src/lib/erpFormat.ts`, `src/lib/erpHrLaborDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/ServiceTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 체결된 용역계약의 계약금액·투입 임직원·일할기준·초과근무 반영·전자세금계산서 제원·계약서 첨부파일 교체를 수행하는 계약 수정 모달을 제공한다.

#### 4.4.74 `src/app/erp/components/service/ServiceLedgersAndDocModal.tsx`
- **규모 / 계층 / 메뉴ID**: 605줄 (29.1 KB) / `L4_UI_SUBMODULES` / `SERVICES` / 대칭·연관 쌍: `src/app/erp/components/ServiceTab.tsx`
- **주요 Export 심볼**: `ServiceDocViewerState`, `ServiceLedgersAndDocModalProps`, `ServiceLedgersAndDocModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/lib/erpFormat.ts`, `src/lib/hangulSearch.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/erp/components/ServiceTab.tsx`, `src/app/erp/components/service/useServiceTabController.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 용역계약 대장 테이블, 기간·계약·검색 필터 기반 월별 청구·수납 대장, 합계 검증 푸터 및 계약서 증빙 뷰어 모달을 렌더링한다.

#### 4.4.75 `src/app/erp/components/service/serviceTypes.ts`
- **규모 / 계층 / 메뉴ID**: 14줄 (0.6 KB) / `L4_UI_SUBMODULES` / `SERVICES` / 대칭·연관 쌍: `src/app/erp/components/ServiceTab.tsx`
- **주요 Export 심볼**: `AssignedServiceEmployee`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 5`)**: `src/app/erp/components/service/ProRataFormulaGuideBox.tsx`, `src/app/erp/components/service/ServiceAddContractModal.tsx`, `src/app/erp/components/service/ServiceBillingModal.tsx`, `src/app/erp/components/service/ServiceEditContractModal.tsx`, `src/app/erp/components/service/useServiceTabController.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 용역계약 투입 임직원의 사번·성명·입퇴사일·기본급·월 계약금액·일할계산 적용여부·비고를 표현하는 AssignedServiceEmployee 인터페이스를 정의한다.

#### 4.4.76 `src/app/erp/components/service/useServiceTabController.ts`
- **규모 / 계층 / 메뉴ID**: 1071줄 (42.6 KB) / `L4_UI_SUBMODULES` / `SERVICES` / 대칭·연관 쌍: `src/app/erp/components/ServiceTab.tsx`
- **주요 Export 심볼**: `OtBreakdownState`, `EMPTY_OT_BREAKDOWN`, `RETIRED_EMP_STATUSES`, `toTaxSpecPayload`, `UseServiceTabControllerParams`, `useServiceTabController`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/service/ServiceLedgersAndDocModal.tsx`, `src/app/erp/components/service/serviceTypes.ts`, `src/lib/erpContractTemplate.ts`, `src/lib/erpFormat.ts`, `src/lib/erpHrLaborDomain.ts`, `src/lib/hangulSearch.ts`, `src/lib/partnerStatusClient.ts` · 호출 API `/api/erp/employees`, `/api/erp/overtimes`, `/api/erp/partners`, `/api/erp/services/billings`, `/api/erp/services/contracts`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/ServiceTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 용역계약·청구·거래처·임직원 조회, 초과근무 집계·입퇴사 일할계산 및 계약·청구·증빙 뷰어 CRUD 핸들러 훅(useServiceTabController)을 제공한다.

#### 4.4.77 `src/app/erp/components/tax-invoice/TaxInvoiceIssueAndDetailModals.tsx`
- **규모 / 계층 / 메뉴ID**: 490줄 (24.7 KB) / `L4_UI_SUBMODULES` / `TAX` / 대칭·연관 쌍: `src/app/erp/components/TaxInvoiceTab.tsx`
- **주요 Export 심볼**: `IssueModalProps`, `IssueModal`, `DetailModalProps`, `DetailModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/lib/businessEntities.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/TaxInvoiceTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 매출·매입 전자세금계산서 수동 발행·등록 모달(IssueModal)과 국세청 양식 테이블·팝빌 열기·출력·통장 대사 연결·삭제 버튼을 포함하는 상세조회 모달(DetailModal)을 제공한다.

#### 4.4.78 `src/app/erp/components/tax-invoice/TaxInvoiceReconcileModal.tsx`
- **규모 / 계층 / 메뉴ID**: 493줄 (28.2 KB) / `L4_UI_SUBMODULES` / `TAX` / 대칭·연관 쌍: `src/app/erp/components/TaxInvoiceTab.tsx`
- **주요 Export 심볼**: `ReconcileModalProps`, `ReconcileModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/lib/erpAccountSubjects.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/TaxInvoiceTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 세금계산서와 통장 입출금 후보 내역 비교 대사, 복수 선택 일괄 계정과목 정리, 차액 종결 사유 선택 완납 종결, 부분수납 및 직접 정산액 입력 모달을 제공한다.

#### 4.4.79 `src/app/erp/components/tax-invoice/TaxKpiAndFilterBar.tsx`
- **규모 / 계층 / 메뉴ID**: 638줄 (28.7 KB) / `L4_UI_SUBMODULES` / `TAX` / 대칭·연관 쌍: `src/app/erp/components/TaxInvoiceTab.tsx`
- **주요 Export 심볼**: `TaxSubTab`, `SettlementFilter`, `TaxLedgerStats`, `UnpaidPartnerSummary`, `SelectedBillingSummary`, `PopbillLiveStatus`, `TaxKpiAndFilterBarProps`, `TaxKpiAndFilterBar`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/businessEntities.ts`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 3`)**: `src/app/erp/components/TaxInvoiceTab.tsx`, `src/app/erp/components/tax-invoice/TaxLedgerSubTab.tsx`, `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 세금계산서 4대 서브탭 전환 바, 상단 실행 버튼군, 4대 KPI 카드, 거래처별 미결 요약 바, Z-패턴 필터 툴바 및 CSV 내보내기 기능을 제공한다.

#### 4.4.80 `src/app/erp/components/tax-invoice/TaxLedgerSubTab.tsx`
- **규모 / 계층 / 메뉴ID**: 412줄 (20.8 KB) / `L4_UI_SUBMODULES` / `TAX` / 대칭·연관 쌍: `src/app/erp/components/TaxInvoiceTab.tsx`
- **주요 Export 심볼**: `TaxLedgerSubTabProps`, `TaxLedgerSubTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/tax-invoice/TaxKpiAndFilterBar.tsx`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/TaxInvoiceTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 매출·매입 세금계산서 모바일 카드 대장, PC 고밀도 정렬 테이블, 통장 대사·발행·삭제 인라인 액션 및 우하단 대차대조 검증 푸터 바를 렌더링한다.

#### 4.4.81 `src/app/erp/components/tax-invoice/TaxUnissuedAndSyncSubTabs.tsx`
- **규모 / 계층 / 메뉴ID**: 427줄 (20.6 KB) / `L4_UI_SUBMODULES` / `TAX` / 대칭·연관 쌍: `src/app/erp/components/TaxInvoiceTab.tsx`
- **주요 Export 심볼**: `HometaxSyncLogItem`, `TaxUnissuedSubTabProps`, `TaxUnissuedSubTab`, `TaxHometaxSyncSubTabProps`, `TaxHometaxSyncSubTab`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/erp/components/TaxInvoiceTab.tsx`, `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 미발행 청구 일괄 세금계산서 발행 테이블(TaxUnissuedSubTab)과 홈택스 RPA 수집 설정·실행·엑셀 업로드·동기화 로그(TaxHometaxSyncSubTab)를 제공한다.

#### 4.4.82 `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts`
- **규모 / 계층 / 메뉴ID**: 1109줄 (42.9 KB) / `L4_UI_SUBMODULES` / `TAX` / 대칭·연관 쌍: `src/app/erp/components/TaxInvoiceTab.tsx`
- **주요 Export 심볼**: `UseTaxInvoiceControllerParams`, `computeTaxLedgerStats`, `useTaxInvoiceController`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/tax-invoice/TaxKpiAndFilterBar.tsx`, `src/app/erp/components/tax-invoice/TaxUnissuedAndSyncSubTabs.tsx`, `src/lib/businessEntities.ts`, `src/lib/erpAccountSubjects.ts`, `src/lib/erpFormat.ts`, `src/lib/hangulSearch.ts`, `src/lib/partnerStatusClient.ts` · 호출 API `/api/erp/partners`, `/api/erp/tax-invoices`, `/api/erp/tax-invoices/hometax`, `/api/erp/tax-invoices/popbill`, `/api/erp/tax-invoices/reconcile`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/TaxInvoiceTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 세금계산서 탭의 조회·매출/매입 KPI·미결 요약 집계·팝빌 발행/전송·홈택스 수집/업로드·통장 대사·수동정산 상태와 API 핸들러를 제어하는 훅(useTaxInvoiceController)을 제공한다.

#### 4.4.83 `src/app/erp/components/trade/TradeInventoryAndProductsSubTabs.tsx`
- **규모 / 계층 / 메뉴ID**: 795줄 (35.1 KB) / `L4_UI_SUBMODULES` / `TRADE` / 대칭·연관 쌍: `src/app/erp/components/TradeTab.tsx`
- **주요 Export 심볼**: `TradeScopeFilterBarProps`, `TradeScopeFilterBar`, `TradeInventorySubTabProps`, `TradeInventorySubTab`, `TradeProductsSubTabProps`, `TradeProductsSubTab`, `TradeDocViewerModalProps`, `TradeDocViewerModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/trade/tradeHelpers.ts`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/tradeInventoryDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/TradeTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 유통 스코프 필터바(TradeScopeFilterBar), 재고 요약·로트 테이블(TradeInventorySubTab), 상품 테이블(TradeProductsSubTab) 및 증빙 뷰어 모달(TradeDocViewerModal)을 제공한다.

#### 4.4.84 `src/app/erp/components/trade/TradeProductPurchaseModals.tsx`
- **규모 / 계층 / 메뉴ID**: 674줄 (32.2 KB) / `L4_UI_SUBMODULES` / `TRADE` / 대칭·연관 쌍: `src/app/erp/components/TradeTab.tsx`
- **주요 Export 심볼**: `ProductModalProps`, `ProductModal`, `PurchaseModalProps`, `PurchaseModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ForkliftSpecEditor.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/TradeTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 품목구분·제원·옵션단가·보증기준을 입력하는 상품 등록·수정 모달(ProductModal)과 단가/총액·부가세 모드 전환 및 정수단가 분할 미리보기를 제공하는 구매 입고 모달(PurchaseModal)을 제공한다.

#### 4.4.85 `src/app/erp/components/trade/TradeSaleBillingModals.tsx`
- **규모 / 계층 / 메뉴ID**: 972줄 (46.6 KB) / `L4_UI_SUBMODULES` / `TRADE` / 대칭·연관 쌍: `src/app/erp/components/TradeTab.tsx`
- **주요 Export 심볼**: `AddSaleModalProps`, `AddSaleModal`, `EditSaleModalProps`, `EditSaleModal`, `AddBillingModalProps`, `AddBillingModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/ForkliftOptionAttachPanel.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/TradeTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 귀속 사업자·판매유형·다중 제품·차대번호 보증·부대옵션·세금계산서 제원을 입력하는 판매 계약 등록·수정 모달(AddSaleModal, EditSaleModal)과 유통 청구 생성 모달(AddBillingModal)을 제공한다.

#### 4.4.86 `src/app/erp/components/trade/TradeSalesBillingSubTabs.tsx`
- **규모 / 계층 / 메뉴ID**: 547줄 (29.1 KB) / `L4_UI_SUBMODULES` / `TRADE` / 대칭·연관 쌍: `src/app/erp/components/TradeTab.tsx`
- **주요 Export 심볼**: `PurchasesSubTabProps`, `PurchasesSubTab`, `SalesSubTabProps`, `SalesSubTab`, `BillingsSubTabProps`, `BillingsSubTab`, `SettlementSubTabProps`, `SettlementSubTab`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/TradeTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 유통 메뉴의 구매 입고 내역 테이블(PurchasesSubTab), 판매 계약 관리·묶음 선택 테이블(SalesSubTab), 청구·계산서 발행 테이블(BillingsSubTab) 및 매출·마진 정산 서브탭(SettlementSubTab)을 제공한다.

#### 4.4.87 `src/app/erp/components/trade/tradeHelpers.ts`
- **규모 / 계층 / 메뉴ID**: 879줄 (30.3 KB) / `L4_UI_SUBMODULES` / `TRADE` / 대칭·연관 쌍: `src/app/erp/components/TradeTab.tsx`
- **주요 Export 심볼**: `TradeSubTabKey`, `TradeEntityFilter`, `TradeInventoryViewMode`, `TradeStockScopeFilter`, `TradeSaleCategory`, `TradeDocViewerState`, `TradeSaleItemDraft`, `TradePurchaseSplitRow`, `TradePurchaseSplitPreview`, `TradeInventorySummaryRow`, `TradeInventoryStats`, `TradeProductFilterMetadata` 외 27개
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/ForkliftOptionAttachPanel.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/lib/erpContractTemplate.ts`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts`, `src/lib/hangulSearch.ts`, `src/lib/partnerStatusClient.ts`, `src/lib/tradeInventoryDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/erp/components/TradeTab.tsx`, `src/app/erp/components/trade/TradeInventoryAndProductsSubTabs.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 유통 재고 요약·정렬·통계 집계, 매입 정수단가 분할, 판매·청구·세금계산서 페이로드 빌더 및 재고 CSV 내보내기 순수 함수를 제공한다.

#### 4.4.88 `src/app/erp/components/warranty/WarrantyDossierAndAddModal.tsx`
- **규모 / 계층 / 메뉴ID**: 666줄 (33.4 KB) / `L4_UI_SUBMODULES` / `WARRANTY` / 대칭·연관 쌍: `src/app/erp/components/WarrantyManagementTab.tsx`
- **주요 Export 심볼**: `WarrantyClaimItem`, `WarrantyRecord`, `WarrantyEditFormState`, `WarrantyClaimFormState`, `WarrantyAddFormState`, `WarrantyDossierAndAddModal`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SearchSelectCombobox.tsx`, `src/lib/erpFormat.ts`, `src/lib/forkliftDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/WarrantyManagementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 차대번호 보증 슬라이드오버 상세·AS 클레임 이력 관리 패널과 수동 보증 등록 모달(WarrantyDossierAndAddModal)을 지연 로딩 단위로 제공한다.

#### 4.4.89 `src/app/erp/components/work-improvement/WorkImprovementA4Studio.tsx`
- **규모 / 계층 / 메뉴ID**: 924줄 (43.1 KB) / `L4_UI_SUBMODULES` / `WORK_IMPROVEMENT` / 대칭·연관 쌍: `src/app/erp/components/WorkImprovementTab.tsx`
- **주요 Export 심볼**: `WorkImprovementA4Studio`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/work-improvement/workImprovementTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/WorkImprovementTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 업무개선 보고서 A4 양식 헤더·3단 결재란·개요·현황·개선방안·기대효과·예산·파일첨부·검토승인 의견 패널 및 사진 확대 모달을 렌더링한다.

#### 4.4.90 `src/app/erp/components/work-improvement/workImprovementTypes.ts`
- **규모 / 계층 / 메뉴ID**: 177줄 (4.8 KB) / `L4_UI_SUBMODULES` / `WORK_IMPROVEMENT` / 대칭·연관 쌍: `src/app/erp/components/WorkImprovementTab.tsx`
- **주요 Export 심볼**: `NumberedItemsMap`, `PhotoItem`, `AttachedFileItem`, `WorkImprovementReport`, `EmployeeOption`, `IMPROVE_TYPE_OPTIONS`, `getTodayIso`, `getTodayDot`, `formatShortDate`, `formatFileSize`, `createBlankReport`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpApprovalLine.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/erp/components/WorkImprovementTab.tsx`, `src/app/erp/components/work-improvement/WorkImprovementA4Studio.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 업무개선 보고서·번호항목맵·사진·첨부파일·임직원 옵션 인터페이스, 개선유형 상수, 날짜·용량 포맷터 및 결재선 연동 초기 보고서 생성기를 정의한다.

### 4.5 `L5_STATIC_DATA` — 회계기준 정적 데이터 계층 (6개)

대상 범위: src/app/erp/data/*

#### 4.5.1 `src/app/erp/data/accountSubjectStandardsBsEntries.ts`
- **규모 / 계층 / 메뉴ID**: 503줄 (34.3 KB) / `L5_STATIC_DATA` / `FINANCIAL_REPORT` / 대칭·연관 쌍: `src/app/erp/data/accountSubjectStandardsMap.ts`
- **주요 Export 심볼**: `AccountSubjectStandardInfo`, `BS_ACCOUNT_SUBJECT_STANDARDS`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/erp/data/accountSubjectStandardsMap.ts`, `src/app/erp/data/accountSubjectStandardsPlCfEntries.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: AccountSubjectStandardInfo 인터페이스와 대차대조표 자산·부채·자본·세무대리 항목 30종에 대한 중소기업회계기준 매핑 상수(BS_ACCOUNT_SUBJECT_STANDARDS)를 정의한다.

#### 4.5.2 `src/app/erp/data/accountSubjectStandardsMap.ts`
- **규모 / 계층 / 메뉴ID**: 155줄 (8.2 KB) / `L5_STATIC_DATA` / `FINANCIAL_REPORT` / 대칭·연관 쌍: `src/app/erp/components/FinancialReportTab.tsx`
- **주요 Export 심볼**: `AccountSubjectStandardInfo`, `SMEAccountingAuditItem`, `SME_ACCOUNTING_COMPLIANCE_SUMMARY`, `ACCOUNT_SUBJECT_STANDARDS_MAP`, `resolveAccountSubjectStandard`, `fetchLinkedArticlesAndCommentaries`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/data/accountSubjectStandardsBsEntries.ts`, `src/app/erp/data/accountSubjectStandardsPlCfEntries.ts`, `src/app/erp/data/accountingStandardsMeta.ts` · 호출 API `/api/erp/accounting-standards`
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/erp/components/FinancialReportTab.tsx`, `src/app/erp/components/financial-report/AccountingStandardModals.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: BS·PL·CF 분할 매핑을 통합한 ACCOUNT_SUBJECT_STANDARDS_MAP(68종), 6대 영역 부합성 요약 및 /api/erp/accounting-standards 조문·해설 조회 함수를 정의한다.

#### 4.5.3 `src/app/erp/data/accountSubjectStandardsPlCfEntries.ts`
- **규모 / 계층 / 메뉴ID**: 644줄 (48.2 KB) / `L5_STATIC_DATA` / `FINANCIAL_REPORT` / 대칭·연관 쌍: `src/app/erp/data/accountSubjectStandardsMap.ts`
- **주요 Export 심볼**: `PL_CF_ACCOUNT_SUBJECT_STANDARDS`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/data/accountSubjectStandardsBsEntries.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/data/accountSubjectStandardsMap.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 손익계산서(매출·매출원가·급여·판관비)·현금흐름표·감가상각명세·대분류 요약 38종의 중소기업회계기준 매핑 상수(PL_CF_ACCOUNT_SUBJECT_STANDARDS)를 정의한다.

#### 4.5.4 `src/app/erp/data/accountingStandardsMeta.ts`
- **규모 / 계층 / 메뉴ID**: 91줄 (3.5 KB) / `L5_STATIC_DATA` / `ACCOUNTING_STANDARD` / 대칭·연관 쌍: `src/app/erp/components/AccountingStandardsTab.tsx`
- **주요 Export 심볼**: `StandardArticle`, `CommentaryCase`, `CommentaryReference`, `CommentarySection`, `ACCOUNTING_STANDARDS_META`, `STANDARD_CHAPTERS`, `COMMENTARY_CHAPTERS`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 4`)**: `src/app/erp/components/AccountingStandardsTab.tsx`, `src/app/erp/components/FinancialReportTab.tsx`, `src/app/erp/components/financial-report/AccountingStandardModals.tsx`, `src/app/erp/data/accountSubjectStandardsMap.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 중소기업회계기준 및 해설서 타입(StandardArticle, CommentarySection), 고시 메타 상수(ACCOUNTING_STANDARDS_META) 및 장 목록 상수를 정의한다.

#### 4.5.5 `src/app/erp/data/generalAccountingStandardsTypes.ts`
- **규모 / 계층 / 메뉴ID**: 34줄 (0.6 KB) / `L5_STATIC_DATA` / `GENERAL_ACCOUNTING_STANDARD` / 대칭·연관 쌍: `src/app/erp/components/GeneralAccountingStandardsTab.tsx`
- **주요 Export 심볼**: `GeneralStandardArticle`, `GeneralGuidanceSection`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/GeneralAccountingStandardsTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 일반기업회계기준 본문 조문 인터페이스(GeneralStandardArticle)와 실무지침·결론도출근거 섹션 인터페이스(GeneralGuidanceSection)를 정의한다.

#### 4.5.6 `src/app/erp/data/workRulesStandardData.ts`
- **규모 / 계층 / 메뉴ID**: 743줄 (45.3 KB) / `L5_STATIC_DATA` / `WORK_RULES` / 대칭·연관 쌍: `src/app/erp/components/WorkRulesTab.tsx`
- **주요 Export 심볼**: `WorkRuleArticle`, `WorkRuleChapter`, `MOEL_STANDARD_WORK_RULES`, `WORK_RULES_REVISION_DATE`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/WorkRulesTab.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 고용노동부 표준취업규칙 17장 전문 상수(MOEL_STANDARD_WORK_RULES), 개정일자(WORK_RULES_REVISION_DATE) 및 조문·장 인터페이스(WorkRuleArticle, WorkRuleChapter)를 정의한다.

### 4.6 `L6_API_ROUTES` — 백엔드 API 라우트 및 집계 엔진 계층 (74개)

대상 범위: src/app/api/erp/**

#### 4.6.1 `src/app/api/erp/accounting-standards/generalStandardsData.json`
- **규모 / 계층 / 메뉴ID**: 1줄 (2162.2 KB) / `L6_API_ROUTES` / `GENERAL_ACCOUNTING_STANDARD` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/accounting-standards/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `LARGE_STATIC_DATA`
- **핵심 기능 명세**: 일반기업회계기준 개념체계, 제1~33장 조문 본문, 실무지침 ID, 검색 키워드, 원문 PDF 경로를 수록한 정적 JSON 데이터셋

#### 4.6.2 `src/app/api/erp/accounting-standards/route.ts`
- **규모 / 계층 / 메뉴ID**: 38줄 (1.1 KB) / `L6_API_ROUTES` / `ACCOUNTING_STANDARD` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `GET`
- **정방향 의존 (`Out`)**: 내부 import `src/app/api/erp/accounting-standards/generalStandardsData.json`, `src/app/api/erp/accounting-standards/smeStandardsData.json` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: GET 요청에서 kind(sme/general) 분기에 따라 중소·일반기업회계기준 JSON을 동적 로드하고 캐싱 응답 반환

#### 4.6.3 `src/app/api/erp/accounting-standards/smeStandardsData.json`
- **규모 / 계층 / 메뉴ID**: 1줄 (189.8 KB) / `L6_API_ROUTES` / `ACCOUNTING_STANDARD` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/accounting-standards/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `LARGE_STATIC_DATA`
- **핵심 기능 명세**: 중소기업회계기준 메타정보, 기준·해설 장목록, 제1조~부칙·별지서식 조문 데이터를 수록한 정적 JSON 데이터셋

#### 4.6.4 `src/app/api/erp/approvals/route.ts`
- **규모 / 계층 / 메뉴ID**: 524줄 (18.8 KB) / `L6_API_ROUTES` / `APPROVAL_INBOX` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PATCH`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpApprovalLine.ts`, `src/lib/erpApprovalServer.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_approval_requests`, `erp_approval_rules`, `erp_approval_steps`, `erp_employees`, `erp_leave_requests`, `erp_overtimes`, `erp_payroll_records`, `erp_work_improvements` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PATCH로 PostgreSQL 기반 전자결재 상신·부서장 전결 배정·승인반려 및 연차·OT·급여·업무개선 상태 연동

#### 4.6.5 `src/app/api/erp/approvals/rules/route.ts`
- **규모 / 계층 / 메뉴ID**: 87줄 (3.1 KB) / `L6_API_ROUTES` / `APPROVAL_RULES` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `PUT`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSchemaCache.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_approval_rules` · 시그널 없음
- **핵심 기능 명세**: GET·PUT으로 Supabase erp_approval_rules 결재선 단계·전결티어·합의규칙 조회 및 Tier 4 상한 보정 갱신

#### 4.6.6 `src/app/api/erp/assets/depreciation/route.ts`
- **규모 / 계층 / 메뉴ID**: 343줄 (12.3 KB) / `L6_API_ROUTES` / `ASSET` / 대칭·연관 쌍: `src/lib/erpDepreciationSync.ts`
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpDepreciation.ts`, `src/lib/erpDepreciationSync.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_asset_depreciation_logs`, `erp_rental_assets`, `erp_rental_products`, `erp_tax_invoices` · 시그널 없음
- **핵심 기능 명세**: GET·POST로 PostgreSQL 자산 감가상각 롤포워드·모델별 매출·처분손실 집계 및 erpDepreciationSync UNNEST 배치 원장 동기화 실행

#### 4.6.7 `src/app/api/erp/assets/logs/route.ts`
- **규모 / 계층 / 메뉴ID**: 83줄 (2.6 KB) / `L6_API_ROUTES` / `ASSET` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_asset_inout_logs` · 시그널 없음
- **핵심 기능 명세**: GET·POST로 PostgreSQL erp_asset_inout_logs 기반 자산별 입출고·정비·대차 생애주기 이력 조회 및 등록

#### 4.6.8 `src/app/api/erp/assets/route.ts`
- **규모 / 계층 / 메뉴ID**: 789줄 (31.3 KB) / `L6_API_ROUTES` / `ASSET` / 대칭·연관 쌍: `src/lib/forkliftWarrantyService.ts`
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpDepreciation.ts`, `src/lib/forkliftDomain.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/forkliftWarrantyService.ts`, `src/lib/rentalFeeUtils.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_asset_inout_logs`, `erp_forklift_warranties`, `erp_rental_assets`, `erp_rental_products` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·DELETE로 PostgreSQL 자산 대장 CRUD, DR 채번, 정액법 감가상각 및 forkliftWarrantyService 배치 보증카드·이력 동기화 처리

#### 4.6.9 `src/app/api/erp/auth/change-password/route.ts`
- **규모 / 계층 / 메뉴ID**: 91줄 (3 KB) / `L6_API_ROUTES` / `AUTH` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSecurityAudit.ts`, `src/lib/piiCrypto.ts`, `src/lib/supabaseErp.ts` · 호출 API `/api/erp/auth/change-password:`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_employees` · 시그널 없음
- **핵심 기능 명세**: POST로 세션·관리자 권한 검증 후 PostgreSQL 사원 비밀번호 scrypt 해시 갱신 및 PASSWORD_CHANGE 감사로그 기록

#### 4.6.10 `src/app/api/erp/auth/login/route.ts`
- **규모 / 계층 / 메뉴ID**: 182줄 (5.9 KB) / `L6_API_ROUTES` / `AUTH` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSecurityAudit.ts`, `src/lib/erpSessionToken.ts`, `src/lib/piiCrypto.ts`, `src/lib/supabaseErp.ts` · 호출 API `/api/erp/auth/login`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_employees` · 시그널 없음
- **핵심 기능 명세**: POST로 PostgreSQL 사원 인증, 로그인 제한, 퇴사자 차단, scrypt 해시 업그레이드, HttpOnly 세션 쿠키 발급

#### 4.6.11 `src/app/api/erp/auth/logout/route.ts`
- **규모 / 계층 / 메뉴ID**: 35줄 (1.1 KB) / `L6_API_ROUTES` / `AUTH` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSecurityAudit.ts` · 호출 API `/api/erp/auth/logout`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: POST로 현재 세션 검증 후 PostgreSQL LOGOUT 보안 감사로그 기록 및 세션 쿠키 삭제 헤더 반환

#### 4.6.12 `src/app/api/erp/auth/session/route.ts`
- **규모 / 계층 / 메뉴ID**: 88줄 (3.2 KB) / `L6_API_ROUTES` / `AUTH` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSecurityAudit.ts`, `src/lib/erpSessionToken.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_employees` · 시그널 없음
- **핵심 기능 명세**: GET으로 세션 토큰 및 PostgreSQL 재직상태 검증, 사용자 정보 반환, 슬라이딩 세션 쿠키 갱신 처리

#### 4.6.13 `src/app/api/erp/bank-matching/route.ts`
- **규모 / 계층 / 메뉴ID**: 902줄 (32.6 KB) / `L6_API_ROUTES` / `BANK_MATCHING` / 대칭·연관 쌍: `src/lib/erpBankReconcileService.ts`
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PATCH`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpBankClosing.ts`, `src/lib/erpBankReconcileService.ts`, `src/lib/erpRbacGuard.ts`, `src/lib/ibkBankParser.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_bank_transactions`, `erp_tax_invoices` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PATCH·DELETE로 RBAC 검증, 통장 거래 조회·업로드, ANY/applyBatchInvoiceSettlementUpdatesTx 배치 대사·대사취소 및 계좌마감 동기화를 수행

#### 4.6.14 `src/app/api/erp/cloud-shares/files/route.ts`
- **규모 / 계층 / 메뉴ID**: 183줄 (6.6 KB) / `L6_API_ROUTES` / `CLOUD_SHARE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `POST`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/r2ErpVault.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_share_files`, `erp_share_folders` · 시그널 없음
- **핵심 기능 명세**: POST·DELETE로 Cloudflare R2 Presigned URL 발급·파일 업로드 및 PostgreSQL erp_share_files 메타 관리

#### 4.6.15 `src/app/api/erp/cloud-shares/route.ts`
- **규모 / 계층 / 메뉴ID**: 260줄 (8.8 KB) / `L6_API_ROUTES` / `CLOUD_SHARE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PATCH`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSchemaCache.ts`, `src/lib/r2ErpVault.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_share_files`, `erp_share_folders` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PATCH·DELETE로 PostgreSQL 공유폴더 SHA-256 잠금·용량 집계 및 Cloudflare R2 파일 일괄 삭제

#### 4.6.16 `src/app/api/erp/consumables/route.ts`
- **규모 / 계층 / 메뉴ID**: 27줄 (0.7 KB) / `L6_API_ROUTES` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/db.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `consumable_items` · 시그널 없음
- **핵심 기능 명세**: GET으로 @/lib/db SQL 기반 consumable_items 소모품 품목코드·재고·안전재고·단가 목록 조회 처리

#### 4.6.17 `src/app/api/erp/corporate-docs/route.ts`
- **규모 / 계층 / 메뉴ID**: 516줄 (18.4 KB) / `L6_API_ROUTES` / `CORPORATE_DOCS` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PATCH`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSchemaCache.ts`, `src/lib/r2ErpVault.ts`, `src/lib/supabaseErp.ts` · 호출 API `/api/erp/vault`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_corporate_document_versions`, `erp_corporate_documents` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PATCH·DELETE로 Cloudflare R2 파일 업로드·삭제 및 PostgreSQL 법인문서·버전 순번 관리

#### 4.6.18 `src/app/api/erp/departments/route.ts`
- **규모 / 계층 / 메뉴ID**: 187줄 (6.9 KB) / `L6_API_ROUTES` / `ORG` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_departments`, `erp_employees` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·DELETE로 Supabase erp_departments 부서 계층·기능태그·인원수 조회 및 사원 부서명 동기화

#### 4.6.19 `src/app/api/erp/employees/reset-leave/route.ts`
- **규모 / 계층 / 메뉴ID**: 112줄 (3.9 KB) / `L6_API_ROUTES` / `LEAVE_MANAGE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpHrLaborDomain.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_annual_leave_resets`, `erp_audit_logs`, `erp_departments`, `erp_employees` · 시그널 없음
- **핵심 기능 명세**: POST로 PostgreSQL 재직 사원 입사일 기준 연차 재계산, UNNEST 일괄 잔여연차 갱신, 초기화·감사 로그 기록 처리

#### 4.6.20 `src/app/api/erp/employees/route.ts`
- **규모 / 계층 / 메뉴ID**: 521줄 (21.4 KB) / `L6_API_ROUTES` / `ORG` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpHrLaborDomain.ts`, `src/lib/erpSecurityAudit.ts`, `src/lib/piiCrypto.ts`, `src/lib/supabaseErp.ts` · 호출 API `/api/erp/employees`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_departments`, `erp_employees`, `erp_leave_requests`, `erp_role_permissions` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT으로 PostgreSQL 사원 마스터 CRUD, 비례연차 계산, scrypt·AES 암호화 및 PII 감사로그 기록

#### 4.6.21 `src/app/api/erp/employment-contracts/ocr/route.ts`
- **규모 / 계층 / 메뉴ID**: 232줄 (9.9 KB) / `L6_API_ROUTES` / `EMPLOYMENT_CONTRACT` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `maxDuration`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpOcrEngine.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: POST로 erpOcrEngine PDF CMap 텍스트 추출·Groq JSON 파싱·정규식 기반 근로계약서·보안서약서 항목 판독

#### 4.6.22 `src/app/api/erp/employment-contracts/route.ts`
- **규모 / 계층 / 메뉴ID**: 811줄 (29.6 KB) / `L6_API_ROUTES` / `EMPLOYMENT_CONTRACT` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpHrLaborDomain.ts`, `src/lib/erpRbacGuard.ts`, `src/lib/erpSchemaCache.ts`, `src/lib/piiCrypto.ts`, `src/lib/r2ErpVault.ts`, `src/lib/supabaseErp.ts` · 호출 API `/api/erp/vault`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_employees`, `erp_employment_contracts` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·DELETE로 RBAC 기반 근로계약서 CRUD, R2 업로드, 주민번호 복호화, 사원 마스터 동기화

#### 4.6.23 `src/app/api/erp/expenses/route.ts`
- **규모 / 계층 / 메뉴ID**: 585줄 (21.3 KB) / `L6_API_ROUTES` / `EXPENSE_RECEIPT` / 대칭·연관 쌍: `src/lib/erpExpenseSchema.ts`
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PATCH`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpExpenseSchema.ts`, `src/lib/erpOcrEngine.ts`, `src/lib/erpRbacGuard.ts`, `src/lib/r2ErpVault.ts`, `src/lib/supabaseErp.ts` · 호출 API `/api/erp/vault`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_employees`, `erp_expense_receipts`, `erp_payroll_records` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PATCH·DELETE로 R2 영수증 업로드, erpOcrEngine Vision OCR 판독, 경비 결재 및 급여정산 연동

#### 4.6.24 `src/app/api/erp/financial-report/financialReportEngine.ts`
- **규모 / 계층 / 메뉴ID**: 451줄 (18.4 KB) / `L6_API_ROUTES` / `FINANCIAL_REPORT` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `FinancialDetailItem`, `isCapitalizedAssetPurchaseInvoice`, `getPartialCapitalizedInvoiceSupply`, `isCapitalizedBankCardTx`, `classifyTaxPaymentSubAccount`, `parseTaxPayDate`, `parseTaxPayNum`, `ParsedTaxPaymentRow`, `parseHometaxTaxPaymentRows`, `classifyPurchaseInvoiceSubAccount`, `classifyBankTxAccount`, `isVatInclusiveBankExpense`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/businessEntities.ts`, `src/lib/erpAccountSubjects.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/api/erp/financial-report/financialStatementsBuilder.ts`, `src/app/api/erp/financial-report/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 매입세금계산서·통장거래 계정과목 분류, 자산화 판별, 홈택스 납부세액 파싱을 수행하는 재무제표 계산 엔진 TS 모듈

#### 4.6.25 `src/app/api/erp/financial-report/financialStatementsBuilder.ts`
- **규모 / 계층 / 메뉴ID**: 1067줄 (41.6 KB) / `L6_API_ROUTES` / `FINANCIAL_REPORT` / 대칭·연관 쌍: `src/app/api/erp/financial-report/route.ts`
- **주요 Export 심볼**: `FinancialRemarkRow`, `FinancialTaxItems`, `FinancialTaxInvoiceRow`, `FinancialBankTxRow`, `FinancialTaxPaymentRow`, `BuildFinancialReportInput`, `FinancialReportPayload`, `buildFinancialReportPayload`
- **정방향 의존 (`Out`)**: 내부 import `src/app/api/erp/financial-report/financialReportEngine.ts`, `src/app/erp/components/financial-report/financialReportTypes.ts`, `src/lib/businessEntities.ts`, `src/lib/erpDepreciation.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/financial-report/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_bank_transactions`, `erp_financial_remarks`, `erp_tax_invoices`, `erp_tax_payments` · 시그널 없음
- **핵심 기능 명세**: 세금계산서·통장·납부세액 전표 적재, 렌탈자산 감가상각 전표 생성, 월별 계정 매트릭스 및 BS·PL·CF 재무제표 구조 산출 엔진 모듈

#### 4.6.26 `src/app/api/erp/financial-report/route.ts`
- **규모 / 계층 / 메뉴ID**: 578줄 (21.4 KB) / `L6_API_ROUTES` / `FINANCIAL_REPORT` / 대칭·연관 쌍: `src/app/api/erp/financial-report/financialStatementsBuilder.ts`
- **주요 Export 심볼**: `dynamic`, `FinancialDetailItem`, `ParsedTaxPaymentRow`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/app/api/erp/financial-report/financialReportEngine.ts`, `src/app/api/erp/financial-report/financialStatementsBuilder.ts`, `src/lib/erpRbacGuard.ts`, `src/lib/erpSchemaCache.ts`, `src/lib/ibkBankParser.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_bank_transactions`, `erp_financial_remarks`, `erp_rental_assets`, `erp_rental_products`, `erp_tax_invoices`, `erp_tax_payments` · 시그널 없음
- **핵심 기능 명세**: GET·POST로 RBAC 검증, PostgreSQL 7개 테이블 병렬 조회, buildFinancialReportPayload 호출 및 재무제표 주석·세무 항목 저장을 수행

#### 4.6.27 `src/app/api/erp/gov-support/govSupportSeedData.ts`
- **규모 / 계층 / 메뉴ID**: 307줄 (22.5 KB) / `L6_API_ROUTES` / `GOV_SUPPORT` / 대칭·연관 쌍: `src/app/api/erp/gov-support/route.ts`
- **주요 Export 심볼**: `GovSupportSeedItem`, `SEED_ORIGINAL_CONTENTS`, `GOV_SUPPORT_SEED_ITEMS`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/gov-support/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: GovSupportSeedItem 인터페이스, 공고 원문 매핑 상수(SEED_ORIGINAL_CONTENTS) 및 초기 시드 배열(GOV_SUPPORT_SEED_ITEMS)을 정의하는 서버 시드 모듈

#### 4.6.28 `src/app/api/erp/gov-support/route.ts`
- **규모 / 계층 / 메뉴ID**: 858줄 (32.9 KB) / `L6_API_ROUTES` / `GOV_SUPPORT` / 대칭·연관 쌍: `src/app/api/erp/gov-support/govSupportSeedData.ts`
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PATCH`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/app/api/erp/gov-support/govSupportSeedData.ts`, `src/lib/erpSchemaCache.ts`, `src/lib/piiCrypto.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_ai_intel_settings`, `erp_gov_support_items` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PATCH·DELETE로 PostgreSQL 정부지원·조달 목록 CRUD, govSupportSeedData UNNEST 배치 시딩·보정, 웹 스크래핑 및 ANY/UNNEST 중복제거 RSS·Gemini 탐색

#### 4.6.29 `src/app/api/erp/inout/route.ts`
- **규모 / 계층 / 메뉴ID**: 287줄 (10.7 KB) / `L6_API_ROUTES` / `OUTBOUND_REG` / 대칭·연관 쌍: `src/lib/erpInoutTxService.ts`
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpInoutTxService.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/partnerStatusService.ts`, `src/lib/rentalFeeUtils.ts`, `src/lib/rentalMaintenanceSchema.ts`, `src/lib/rentalSchemaInit.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_asset_inout_logs`, `erp_partners`, `erp_rental_assets`, `erp_rental_billings`, `erp_rental_contracts`, `erp_rental_products` · 시그널 없음
- **핵심 기능 명세**: GET·POST로 PostgreSQL 입출고·자산·월정산 청구 조회 및 erpInoutTxService OUTBOUND·INBOUND 트랜잭션 디스패치 처리

#### 4.6.30 `src/app/api/erp/leaves/route.ts`
- **규모 / 계층 / 메뉴ID**: 300줄 (10.4 KB) / `L6_API_ROUTES` / `LEAVE_APPLY` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `DELETE`, `PATCH`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpApprovalLine.ts`, `src/lib/erpApprovalServer.ts`, `src/lib/erpHrLaborDomain.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_approval_requests`, `erp_approval_rules`, `erp_approval_steps`, `erp_employees`, `erp_leave_requests` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PATCH·DELETE로 PostgreSQL 연차 상신·부서장 전결 배정·승인반려 및 전자결재 요청 테이블 동기화

#### 4.6.31 `src/app/api/erp/obsidian/route.ts`
- **규모 / 계층 / 메뉴ID**: 525줄 (18.4 KB) / `L6_API_ROUTES` / `OBSIDIAN_VAULT` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSchemaCache.ts`, `src/lib/r2ErpVault.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_obsidian_notes` · 시그널 없음
- **핵심 기능 명세**: GET·POST·DELETE로 PostgreSQL 마크다운 노트·frontmatter·태그 관리 및 Cloudflare R2 .md 백업

#### 4.6.32 `src/app/api/erp/organization/batch/route.ts`
- **규모 / 계층 / 메뉴ID**: 661줄 (28.1 KB) / `L6_API_ROUTES` / `ORG` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpHrLaborDomain.ts`, `src/lib/erpSecurityAudit.ts`, `src/lib/piiCrypto.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_departments`, `erp_employees`, `erp_leave_requests` · 시그널 없음
- **핵심 기능 명세**: POST로 세션 검증 후 PostgreSQL 부서 계층·parent_id 2패스 UNNEST 일괄 업서트·삭제 및 사원 PII 암호화·연차 산정 UNNEST 일괄 반영 트랜잭션

#### 4.6.33 `src/app/api/erp/overtimes/route.ts`
- **규모 / 계층 / 메뉴ID**: 424줄 (15.3 KB) / `L6_API_ROUTES` / `OT_MANAGE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PATCH`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpApprovalLine.ts`, `src/lib/erpApprovalServer.ts`, `src/lib/erpHrLaborDomain.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_approval_requests`, `erp_approval_rules`, `erp_approval_steps`, `erp_employees`, `erp_overtimes` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PATCH·DELETE로 PostgreSQL 초과근무 수당 산정, 부서장 전결 결재, OT_REQUEST 결재선 동기화

#### 4.6.34 `src/app/api/erp/partners/check-biz-status/route.ts`
- **규모 / 계층 / 메뉴ID**: 288줄 (9 KB) / `L6_API_ROUTES` / `CUSTOMER` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/partnerStatusClient.ts`, `src/lib/partnerStatusService.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_audit_logs`, `erp_partners` · 시그널 없음
- **핵심 기능 명세**: POST로 국세청 사업자등록 상태조회 API 단건·일괄 호출 및 PostgreSQL 거래처 휴폐업 BLOCKED 전환·로그 기록

#### 4.6.35 `src/app/api/erp/partners/contacts/route.ts`
- **규모 / 계층 / 메뉴ID**: 264줄 (6.8 KB) / `L6_API_ROUTES` / `CUSTOMER` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_partner_contacts` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·DELETE로 PostgreSQL 거래처별 담당자·명함 URL·대표담당자 플래그 조회 및 갱신

#### 4.6.36 `src/app/api/erp/partners/ocr-bank/route.ts`
- **규모 / 계층 / 메뉴ID**: 158줄 (6 KB) / `L6_API_ROUTES` / `CUSTOMER` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpOcrEngine.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: POST로 erpOcrEngine PDF 추출·Groq JSON 파싱·은행명 정규화·정규식 기반 통장사본 계좌 정보 판독

#### 4.6.37 `src/app/api/erp/partners/ocr-biz-cert/route.ts`
- **규모 / 계층 / 메뉴ID**: 264줄 (9.4 KB) / `L6_API_ROUTES` / `CUSTOMER` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpContractTemplate.ts`, `src/lib/erpOcrEngine.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: POST로 erpOcrEngine PDF CMap 추출·Groq JSON 파싱·사업자번호 포맷·정규식 기반 사업자등록증 정보 추출

#### 4.6.38 `src/app/api/erp/partners/ocr-card/route.ts`
- **규모 / 계층 / 메뉴ID**: 84줄 (2.8 KB) / `L6_API_ROUTES` / `CUSTOMER` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpOcrEngine.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: POST로 erpOcrEngine Groq Vision qwen3.8-27b 및 정규식 파싱 기반 명함 상호·성명·부서·직급·연락처·이메일 추출

#### 4.6.39 `src/app/api/erp/partners/route.ts`
- **규모 / 계층 / 메뉴ID**: 780줄 (27.8 KB) / `L6_API_ROUTES` / `CUSTOMER` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpContractTemplate.ts`, `src/lib/erpSchemaCache.ts`, `src/lib/partnerStatusService.ts`, `src/lib/piiCrypto.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_partner_contacts`, `erp_partners`, `erp_rental_contracts`, `erp_service_contracts` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·DELETE로 PostgreSQL 거래처 CRUD, 코드 채번, AES 계좌 암호화, 계약·담당자 동기화

#### 4.6.40 `src/app/api/erp/payroll/ocr/route.ts`
- **규모 / 계층 / 메뉴ID**: 924줄 (31.8 KB) / `L6_API_ROUTES` / `PAYROLL` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `maxDuration`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/groqServerKey.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_employees` · 시그널 없음
- **핵심 기능 명세**: POST로 PDF 2D 좌표 그리드·Groq AI qwen3.8-27b·회계보존 파서 기반 급여대장 추출 및 사원 매핑

#### 4.6.41 `src/app/api/erp/payroll/route.ts`
- **규모 / 계층 / 메뉴ID**: 898줄 (37.9 KB) / `L6_API_ROUTES` / `PAYROLL` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PATCH`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpExpenseSchema.ts`, `src/lib/erpHrLaborDomain.ts`, `src/lib/erpRbacGuard.ts`, `src/lib/erpSchemaCache.ts`, `src/lib/piiCrypto.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_employees`, `erp_expense_receipts`, `erp_overtimes`, `erp_payroll_records`, `erp_service_contracts` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PATCH로 RBAC 검증, Promise.all 병렬 급여 집계, 단일 트랜잭션 BATCH_SAVE 및 급여정산 마감을 수행

#### 4.6.42 `src/app/api/erp/permissions/route.ts`
- **규모 / 계층 / 메뉴ID**: 188줄 (6.5 KB) / `L6_API_ROUTES` / `PERMISSIONS` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `PATCH`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpRbacGuard.ts`, `src/lib/erpSchemaCache.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_custom_roles`, `erp_employees`, `erp_role_permissions` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·PATCH로 역할 생성, CROSS JOIN 기본권한 일괄 보장, 메뉴권한 UNNEST 업서트, 사원 역할 동기화 및 캐시 무효화

#### 4.6.43 `src/app/api/erp/products/route.ts`
- **규모 / 계층 / 메뉴ID**: 373줄 (14.4 KB) / `L6_API_ROUTES` / `PRODUCT` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/rentalFeeUtils.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_rental_assets`, `erp_rental_products` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·DELETE로 PostgreSQL 제품 모델 CRUD, 지게차 제원 정규화 및 보유·대여·정비 자산 통계 집계

#### 4.6.44 `src/app/api/erp/rental-directory/officialDirectoryData.json`
- **규모 / 계층 / 메뉴ID**: 27389줄 (1422.3 KB) / `L6_API_ROUTES` / `RENTAL_BIZ_DIR` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/rental-directory/rentalDirectorySyncService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `LARGE_STATIC_DATA`
- **핵심 기능 명세**: FL·AWP·OA_PC 업종 검증 렌탈 사업자 상호·사업자번호·대표자·소재지·KSIC·매출상태를 수록한 시드 JSON

#### 4.6.45 `src/app/api/erp/rental-directory/officialMolitStats.json`
- **규모 / 계층 / 메뉴ID**: 1296줄 (21.9 KB) / `L6_API_ROUTES` / `RENTAL_BIZ_DIR` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/components/rental-biz-dir/PortalGuideModal.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 국토교통부·대한건설기계협회 기준 지역·용도별 건설기계 등록현황 및 사업자 공식 통계를 수록한 JSON 데이터셋

#### 4.6.46 `src/app/api/erp/rental-directory/rentalDirectorySeedData.ts`
- **규모 / 계층 / 메뉴ID**: 988줄 (49.8 KB) / `L6_API_ROUTES` / `RENTAL_BIZ_DIR` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `RentalBizSeed`, `INITIAL_VERIFIED_OPERATORS`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/api/erp/rental-directory/rentalDirectorySyncService.ts`, `src/app/api/erp/rental-directory/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: RentalBizSeed 인터페이스와 INITIAL_VERIFIED_OPERATORS 초기 검증 렌탈 사업자 시드 배열 정의 TS 모듈

#### 4.6.47 `src/app/api/erp/rental-directory/rentalDirectorySyncService.ts`
- **규모 / 계층 / 메뉴ID**: 994줄 (40 KB) / `L6_API_ROUTES` / `RENTAL_BIZ_DIR` / 대칭·연관 쌍: `src/app/api/erp/rental-directory/route.ts`
- **주요 Export 심볼**: `syncRentalDirectorySeeds`, `ensureRentalDirectoryTable`, `fetchDirectoryWithPartnerStatus`, `upsertDiscoveredRentalBizBatch`, `crawlOfficialBoardsLive`, `registerDirectoryPartnersTx`
- **정방향 의존 (`Out`)**: 내부 import `src/app/api/erp/rental-directory/officialDirectoryData.json`, `src/app/api/erp/rental-directory/rentalDirectorySeedData.ts`, `src/lib/erpSchemaCache.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/rental-directory/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_partners`, `erp_rental_biz_directory` · 시그널 없음
- **핵심 기능 명세**: 렌탈 사업자 DB 테이블 초기화, UNNEST 500건 배치 시드 동기화, 발굴·크롤링 결과 배치 업서트 및 erp_partners 단일 트랜잭션 거래처 전환 서비스 모듈

#### 4.6.48 `src/app/api/erp/rental-directory/route.ts`
- **규모 / 계층 / 메뉴ID**: 413줄 (15.6 KB) / `L6_API_ROUTES` / `RENTAL_BIZ_DIR` / 대칭·연관 쌍: `src/app/api/erp/rental-directory/rentalDirectorySyncService.ts`
- **주요 Export 심볼**: `dynamic`, `RentalBizSeed`, `GET`, `POST`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/app/api/erp/rental-directory/rentalDirectorySeedData.ts`, `src/app/api/erp/rental-directory/rentalDirectorySyncService.ts`, `src/lib/piiCrypto.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_rental_biz_directory`, `erp_system_secrets` · 시그널 없음
- **핵심 기능 명세**: GET·POST·DELETE로 PostgreSQL 렌탈 사업자 DB 관리, 일괄 거래처 이관, 웹 게시판 크롤링, Gemini 검색 탐색을 rentalDirectorySyncService와 연계 처리

#### 4.6.49 `src/app/api/erp/rental/assets/route.ts`
- **규모 / 계층 / 메뉴ID**: 210줄 (7.2 KB) / `L6_API_ROUTES` / `RENTAL` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_audit_logs`, `erp_rental_assets`, `erp_rental_products` · 시그널 없음
- **핵심 기능 명세**: GET·POST로 PostgreSQL erp_rental_assets·제품 결합 조회, 단건·일괄 DR 채번 등록 및 감사로그 기록

#### 4.6.50 `src/app/api/erp/rental/billings/route.ts`
- **규모 / 계층 / 메뉴ID**: 297줄 (12.2 KB) / `L6_API_ROUTES` / `RENTAL` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpContractTemplate.ts`, `src/lib/rentalFeeUtils.ts`, `src/lib/rentalSchemaInit.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_rental_assets`, `erp_rental_billings`, `erp_rental_contracts`, `erp_rental_products`, `erp_tax_invoices` · 시그널 없음
- **핵심 기능 명세**: GET·POST·DELETE로 PostgreSQL 임대 월정산 청구 조회, 일할·감가상각 원가 합산 생성, 미발행 청구 삭제

#### 4.6.51 `src/app/api/erp/rental/contracts/route.ts`
- **규모 / 계층 / 메뉴ID**: 739줄 (29.1 KB) / `L6_API_ROUTES` / `RENTAL` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpRentalContractService.ts`, `src/lib/forkliftDomain.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/partnerStatusService.ts`, `src/lib/rentalFeeUtils.ts`, `src/lib/rentalSchemaInit.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_audit_logs`, `erp_partners`, `erp_rental_assets`, `erp_rental_billings`, `erp_rental_contracts`, `erp_rental_products` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·DELETE·PATCH로 PostgreSQL 임대계약 CRUD, erpRentalContractService 배치 자산 예약·출고·청구 동기화 및 상태 전이 처리

#### 4.6.52 `src/app/api/erp/rental/depreciation/route.ts`
- **규모 / 계층 / 메뉴ID**: 123줄 (4.5 KB) / `L6_API_ROUTES` / `RENTAL` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_asset_depreciation_logs`, `erp_audit_logs`, `erp_rental_assets` · 시그널 없음
- **핵심 기능 명세**: POST로 대상 연월 중복 검증(ROLLBACK 해제) 후 UNNEST 배치 UPDATE·INSERT 기반 정액법 감가상각 및 감사 로그 기록

#### 4.6.53 `src/app/api/erp/rental/maintenance/route.ts`
- **규모 / 계층 / 메뉴ID**: 476줄 (17 KB) / `L6_API_ROUTES` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/rentalMaintenanceDomain.ts`, `src/lib/rentalMaintenanceSchema.ts`, `src/lib/rentalMaintenanceTxService.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_employees`, `erp_rental_assets`, `erp_rental_maintenance_parts`, `erp_rental_maintenances`, `erp_rental_products`, `erp_service_vehicles`, `erp_trade_products`, `erp_vehicle_part_stocks` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT으로 PostgreSQL 정비이력·사용부품·PM 스케줄 조회 및 트랜잭션 기반 정비 등록·수정 처리

#### 4.6.54 `src/app/api/erp/rental/operating-hours/route.ts`
- **규모 / 계층 / 메뉴ID**: 235줄 (8.2 KB) / `L6_API_ROUTES` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/rentalMaintenanceDomain.ts`, `src/lib/rentalMaintenanceSchema.ts`, `src/lib/rentalOperatingHoursTxService.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_asset_hour_logs`, `erp_asset_wear_states`, `erp_rental_assets`, `erp_rental_products` · 시그널 없음
- **핵심 기능 명세**: GET·POST로 PostgreSQL 자산별 가동시간·소모품 열화도·PM 일정 조회, 마모주기 설정 및 가동시간 이력 기록

#### 4.6.55 `src/app/api/erp/rental/products/route.ts`
- **규모 / 계층 / 메뉴ID**: 110줄 (3.8 KB) / `L6_API_ROUTES` / `RENTAL` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/rentalFeeUtils.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_rental_products` · 시그널 없음
- **핵심 기능 명세**: GET·POST로 PostgreSQL erp_rental_products 임대 모델 목록 조회, 지게차 제원 정규화 및 신규 모델 등록

#### 4.6.56 `src/app/api/erp/rental/vehicle-stocks/route.ts`
- **규모 / 계층 / 메뉴ID**: 238줄 (9.2 KB) / `L6_API_ROUTES` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: `src/lib/rentalMaintPartStockTx.ts`
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/rentalMaintPartStockTx.ts`, `src/lib/rentalMaintenanceDomain.ts`, `src/lib/rentalMaintenanceSchema.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_part_stock_movements`, `erp_rental_assets`, `erp_rental_maintenances`, `erp_service_vehicles`, `erp_trade_products`, `erp_vehicle_part_stocks` · 시그널 없음
- **핵심 기능 명세**: GET·POST로 PostgreSQL 차량·주기장 부품 입출고 이력·재고 조회, 적정재고 설정, rentalMaintPartStockTx 연계 입고·이동 트랜잭션 처리

#### 4.6.57 `src/app/api/erp/rental/vehicles/route.ts`
- **규모 / 계층 / 메뉴ID**: 394줄 (13.2 KB) / `L6_API_ROUTES` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/rentalMaintenanceSchema.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_employees`, `erp_service_vehicles`, `erp_trade_products`, `erp_vehicle_part_stocks` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT으로 PostgreSQL 정비차량 목록·적재 부품재고 조회, 부품 등록 및 정비차량 등록·수정 처리

#### 4.6.58 `src/app/api/erp/services/billings/route.ts`
- **규모 / 계층 / 메뉴ID**: 193줄 (7.2 KB) / `L6_API_ROUTES` / `SERVICES` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpContractTemplate.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_service_billings`, `erp_service_contracts`, `erp_tax_invoices` · 시그널 없음
- **핵심 기능 명세**: GET·POST·DELETE로 Supabase erp_service_billings 용역 청구 조회, 템플릿 치환 생성, 미발행 청구 삭제

#### 4.6.59 `src/app/api/erp/services/contracts/route.ts`
- **규모 / 계층 / 메뉴ID**: 702줄 (26.8 KB) / `L6_API_ROUTES` / `SERVICES` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpHrLaborDomain.ts`, `src/lib/partnerStatusService.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_audit_logs`, `erp_employees`, `erp_partners`, `erp_payroll_records`, `erp_service_billings`, `erp_service_contracts` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·DELETE로 PostgreSQL 용역계약 CRUD, 투입인원 급여단가·거래처 이메일 동기화 및 감사로그

#### 4.6.60 `src/app/api/erp/shareholder-registry/route.ts`
- **규모 / 계층 / 메뉴ID**: 208줄 (7.5 KB) / `L6_API_ROUTES` / `CORPORATE_DOCS` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `ShareholderRecord`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSchemaCache.ts`, `src/lib/erpSecurityAudit.ts`, `src/lib/piiCrypto.ts`, `src/lib/supabaseErp.ts` · 호출 API `/api/erp/shareholder-registry:`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_shareholder_registry` · 시그널 없음
- **핵심 기능 명세**: GET·POST로 세션 검증 후 PostgreSQL 주주명부 PII AES 암호화 저장·복호화 마스킹 조회 및 감사로그 기록

#### 4.6.61 `src/app/api/erp/tax-invoices/hometax/route.ts`
- **규모 / 계층 / 메뉴ID**: 1103줄 (45.3 KB) / `L6_API_ROUTES` / `TAX` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/businessEntities.ts`, `src/lib/ibkBankParser.ts`, `src/lib/popbillService.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_hometax_rpa_settings`, `erp_rental_billings`, `erp_service_billings`, `erp_tax_invoices`, `erp_trade_billings`, `erp_trade_sales` · 시그널 없음
- **핵심 기능 명세**: GET·POST로 홈택스 Excel/CSV 파싱, 단건 프리페치·메모리 색인 기반 수정세금계산서 상계, UNNEST 보정 및 청크 일괄 적재 처리

#### 4.6.62 `src/app/api/erp/tax-invoices/popbill/route.ts`
- **규모 / 계층 / 메뉴ID**: 309줄 (12.4 KB) / `L6_API_ROUTES` / `TAX` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/popbillService.ts`, `src/lib/supabaseErp.ts` · 호출 API `/api/erp/tax-invoices/viewer`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_partners`, `erp_tax_invoices` · 시그널 없음
- **핵심 기능 명세**: POST로 팝빌 API 연동 세금계산서 정발행, 국세청 전송, 메일 발송, 상태 동기화 및 뷰어·관리 URL 발급

#### 4.6.63 `src/app/api/erp/tax-invoices/reconcile/route.ts`
- **규모 / 계층 / 메뉴ID**: 619줄 (24.9 KB) / `L6_API_ROUTES` / `TAX` / 대칭·연관 쌍: `src/lib/erpTaxReconcileEngine.ts`
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpAccountSubjects.ts`, `src/lib/erpBankClosing.ts`, `src/lib/erpTaxReconcileEngine.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_bank_transactions`, `erp_tax_invoices` · 시그널 없음
- **핵심 기능 명세**: GET·POST로 erpTaxReconcileEngine 점수·부분합 기반 세금계산서·통장 후보 조회, UNNEST 일괄 자동대사, 수동대사 및 취소 처리를 수행

#### 4.6.64 `src/app/api/erp/tax-invoices/route.ts`
- **규모 / 계층 / 메뉴ID**: 968줄 (42.1 KB) / `L6_API_ROUTES` / `TAX` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/businessEntities.ts`, `src/lib/erpBankClosing.ts`, `src/lib/erpContractTemplate.ts`, `src/lib/erpRbacGuard.ts`, `src/lib/partnerStatusService.ts`, `src/lib/popbillService.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_audit_logs`, `erp_bank_transactions`, `erp_partner_contacts`, `erp_partners`, `erp_rental_assets`, `erp_rental_billings`, `erp_rental_contracts`, `erp_rental_products`, `erp_service_billings`, `erp_service_contracts`, `erp_tax_invoices`, `erp_trade_billings`, `erp_trade_products`, `erp_trade_sales` · 시그널 없음
- **핵심 기능 명세**: GET·POST·DELETE로 RBAC 기반 세금계산서·미발행청구 조회, 팝빌 전자발행 및 ANY($1) 배치 청구 연결·통장대사·발행 취소 삭제

#### 4.6.65 `src/app/api/erp/tax-invoices/viewer/route.ts`
- **규모 / 계층 / 메뉴ID**: 273줄 (11.4 KB) / `L6_API_ROUTES` / `TAX` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/businessEntities.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_tax_invoices` · 시그널 없음
- **핵심 기능 명세**: GET으로 invoiceNo 기반 PostgreSQL erp_tax_invoices 조회 및 전자세금계산서 인쇄용 HTML 렌더링 반환

#### 4.6.66 `src/app/api/erp/trade/billings/route.ts`
- **규모 / 계층 / 메뉴ID**: 269줄 (10.4 KB) / `L6_API_ROUTES` / `TRADE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpContractTemplate.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_partners`, `erp_tax_invoices`, `erp_trade_billings`, `erp_trade_products`, `erp_trade_sales` · 시그널 없음
- **핵심 기능 명세**: GET·POST·DELETE로 PostgreSQL 유통 청구·거래처·세금계산서 결합 조회, 다건 판매 묶음 청구 생성·삭제

#### 4.6.67 `src/app/api/erp/trade/products/route.ts`
- **규모 / 계층 / 메뉴ID**: 390줄 (14.2 KB) / `L6_API_ROUTES` / `TRADE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/rentalFeeUtils.ts`, `src/lib/supabaseErp.ts`, `src/lib/tradeInventoryDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_part_stock_movements`, `erp_trade_products`, `erp_trade_purchases`, `erp_trade_sales` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·DELETE로 PostgreSQL 유통 상품 CRUD, SKU 채번, 역FIFO 재고 에이징·로트 집계 처리

#### 4.6.68 `src/app/api/erp/trade/purchases/route.ts`
- **규모 / 계층 / 메뉴ID**: 176줄 (6 KB) / `L6_API_ROUTES` / `TRADE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/partnerStatusService.ts`, `src/lib/supabaseErp.ts`, `src/lib/tradeInventoryDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_audit_logs`, `erp_trade_products`, `erp_trade_purchases` · 시그널 없음
- **핵심 기능 명세**: GET·POST로 PostgreSQL 매입 조회, 거래처 검증, 단건·분할 매입 등록, 상품 재고·원가 갱신 및 감사로그 기록

#### 4.6.69 `src/app/api/erp/trade/sales/route.ts`
- **규모 / 계층 / 메뉴ID**: 744줄 (27.7 KB) / `L6_API_ROUTES` / `TRADE` / 대칭·연관 쌍: `src/lib/forkliftWarrantyService.ts`
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/forkliftWarrantyService.ts`, `src/lib/partnerStatusService.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_audit_logs`, `erp_forklift_warranties`, `erp_forklift_warranty_claims`, `erp_partners`, `erp_tax_invoices`, `erp_trade_products`, `erp_trade_sales` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·DELETE로 PostgreSQL 유통 판매 CRUD, 오름차순 FOR UPDATE·UNNEST 재고 차감/복구 및 forkliftWarrantyService 배치 보증카드 동기화

#### 4.6.70 `src/app/api/erp/trade/settlement/route.ts`
- **규모 / 계층 / 메뉴ID**: 56줄 (1.9 KB) / `L6_API_ROUTES` / `TRADE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_trade_sales` · 시그널 없음
- **핵심 기능 명세**: GET으로 PostgreSQL erp_trade_sales 기간별 매출·원가·마진·마진율 총계 및 거래처별 정산 집계 조회

#### 4.6.71 `src/app/api/erp/vault/route.ts`
- **규모 / 계층 / 메뉴ID**: 113줄 (4.1 KB) / `L6_API_ROUTES` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/r2ErpVault.ts` · 호출 API `/api/erp/vault`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: GET·POST로 Cloudflare R2 비공개 버킷 객체 inline·attachment 스트리밍 조회 및 파일·base64 업로드

#### 4.6.72 `src/app/api/erp/warranties/claims/route.ts`
- **규모 / 계층 / 메뉴ID**: 227줄 (7.2 KB) / `L6_API_ROUTES` / `WARRANTY` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/rentalFeeUtils.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_audit_logs`, `erp_forklift_warranties`, `erp_forklift_warranty_claims`, `erp_rental_assets` · 시그널 없음
- **핵심 기능 명세**: GET·POST·DELETE로 PostgreSQL 보증 AS/수리 이력 관리, 가동시간·보증상태·렌탈자산 연동 및 감사로그 기록

#### 4.6.73 `src/app/api/erp/warranties/route.ts`
- **규모 / 계층 / 메뉴ID**: 415줄 (14.2 KB) / `L6_API_ROUTES` / `WARRANTY` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/forkliftSchemaInit.ts`, `src/lib/rentalFeeUtils.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_forklift_warranties`, `erp_forklift_warranty_claims`, `erp_rental_assets` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·DELETE로 PostgreSQL 차대번호 보증카드 CRUD, 잔여기간·시간 산출 및 렌탈자산 보증 동기화

#### 4.6.74 `src/app/api/erp/work-improvements/route.ts`
- **규모 / 계층 / 메뉴ID**: 985줄 (32.9 KB) / `L6_API_ROUTES` / `WORK_IMPROVEMENT` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `dynamic`, `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpApprovalLine.ts`, `src/lib/erpApprovalServer.ts`, `src/lib/erpSchemaCache.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_approval_requests`, `erp_approval_rules`, `erp_approval_steps`, `erp_departments`, `erp_employees`, `erp_work_improvements` · 시그널 없음
- **핵심 기능 명세**: GET·POST·PUT·PATCH·DELETE로 PostgreSQL 업무개선보고서 CRUD, 부서장 전결 검토·승인 및 결재함 동기화

### 4.7 `L7_LINKED_ROUTES` — 외부 공유·주주명부 연계 라우트 계층 (5개)

대상 범위: src/app/share/** · src/app/shareholder-registry/**

#### 4.7.1 `src/app/api/share/[code]/download/route.ts`
- **규모 / 계층 / 메뉴ID**: 99줄 (3.8 KB) / `L7_LINKED_ROUTES` / `SHARE` / 대칭·연관 쌍: `src/app/share/[code]/page.tsx`
- **주요 Export 심볼**: `GET`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/r2ErpVault.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_share_files`, `erp_share_folders` · 시그널 없음
- **핵심 기능 명세**: 공유 파일 다운로드 횟수를 증가시키고 25MB 초과·redirect 모드는 R2 Presigned URL 리다이렉트, 일반 파일은 스트리밍 응답하는 GET API

#### 4.7.2 `src/app/api/share/[code]/route.ts`
- **규모 / 계층 / 메뉴ID**: 161줄 (4.9 KB) / `L7_LINKED_ROUTES` / `SHARE` / 대칭·연관 쌍: `src/app/share/[code]/page.tsx`
- **주요 Export 심볼**: `GET`, `POST`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_share_files`, `erp_share_folders` · 시그널 없음
- **핵심 기능 명세**: 공유 코드로 erp_share_folders와 erp_share_files를 조회하고 활성·만료·비밀번호(SHA-256) 검증 후 파일 목록을 반환하는 GET·POST API

#### 4.7.3 `src/app/share/[code]/page.tsx`
- **규모 / 계층 / 메뉴ID**: 441줄 (18.2 KB) / `L7_LINKED_ROUTES` / `SHARE` / 대칭·연관 쌍: `src/app/api/share/[code]/route.ts`
- **주요 Export 심볼**: `default (PublicShareFolderPage)`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/SortableTh.tsx`, `src/lib/erpFormat.ts` · 호출 API `/api/share/[code]`, `/api/share/[code]/download`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 외부 공유 링크 코드 기반 폴더 정보 조회, 비밀번호 검증, 파일명 검색·정렬 및 개별·순차 다운로드와 PDF·이미지 열람을 수행하는 클라이언트 페이지

#### 4.7.4 `src/app/shareholder-registry/ShareholderRegistryClient.tsx`
- **규모 / 계층 / 메뉴ID**: 919줄 (37.1 KB) / `L7_LINKED_ROUTES` / `CORPORATE_DOCS` / 대칭·연관 쌍: `src/app/shareholder-registry/page.tsx`
- **주요 Export 심볼**: `Shareholder`, `default (ShareholderRegistryClient)`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API `/api/erp/shareholder-registry`
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/shareholder-registry/page.tsx`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 주주명세서 데이터 서버 조회·암호화 저장, 주민번호 마스킹 토글, 지분율·금액 계산 및 A4 규격 인쇄 화면을 제공하는 클라이언트 컴포넌트

#### 4.7.5 `src/app/shareholder-registry/page.tsx`
- **규모 / 계층 / 메뉴ID**: 13줄 (0.5 KB) / `L7_LINKED_ROUTES` / `CORPORATE_DOCS` / 대칭·연관 쌍: `src/app/shareholder-registry/ShareholderRegistryClient.tsx`
- **주요 Export 심볼**: `metadata`, `default (ShareholderRegistryPage)`
- **정방향 의존 (`Out`)**: 내부 import `src/app/shareholder-registry/ShareholderRegistryClient.tsx` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 주주명세서 발급 화면의 메타데이터를 정의하고 ShareholderRegistryClient 컴포넌트를 렌더링하는 Next.js 페이지 엔트리

### 4.8 `L8_DOMAIN_LIBS` — 공통 도메인·보안·연동 라이브러리 계층 (44개)

대상 범위: src/lib/* · src/types/*

#### 4.8.1 `src/lib/businessEntities.ts`
- **규모 / 계층 / 메뉴ID**: 103줄 (3.4 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `EntityType`, `BusinessEntity`, `BUSINESS_ENTITIES`, `BUSINESS_ENTITY_LIST`, `getEntity`, `getEntityByBizNum`, `getEntityByAccountNo`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 15`)**: `src/app/api/erp/financial-report/financialReportEngine.ts`, `src/app/api/erp/financial-report/financialStatementsBuilder.ts`, `src/app/api/erp/tax-invoices/hometax/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/app/api/erp/tax-invoices/viewer/route.ts`, `src/app/erp/components/CorporateDocumentTab.tsx`, `src/app/erp/components/ErpHeader.tsx`, `src/app/erp/components/corporate-docs/EntityManualSubTabs.tsx`, `src/app/erp/components/corporate-docs/TemplateStudioPreviewSheet.tsx`, `src/app/erp/components/corporate-docs/TemplateStudioSubTab.tsx`, `src/app/erp/components/corporate-docs/corporateDocTemplates.ts`, `src/app/erp/components/tax-invoice/TaxInvoiceIssueAndDetailModals.tsx`, `src/app/erp/components/tax-invoice/TaxKpiAndFilterBar.tsx`, `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts`, `src/lib/popbillService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 법인·개인 두 사업자 엔티티의 사업자번호·계좌·자본금·주소 메타데이터 상수와 사업자번호·계좌번호 기반 엔티티 조회 함수를 제공하는 SSOT 모듈

#### 4.8.2 `src/lib/db.ts`
- **규모 / 계층 / 메뉴ID**: 9줄 (0.2 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `sql`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/consumables/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 서버 전용 환경변수 DATABASE_URL 기반으로 Neon Serverless PostgreSQL 쿼리 클라이언트(sql)를 생성·내보내는 DB 연결 모듈

#### 4.8.3 `src/lib/erpAccountSubjects.ts`
- **규모 / 계층 / 메뉴ID**: 421줄 (13.8 KB) / `L8_DOMAIN_LIBS` / `BANK_MATCHING` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `StandardAccountSubject`, `STANDARD_ACCOUNT_SUBJECTS`, `resolveExplicitAccountSubject`, `recommendAccountSubjectForTx`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 7`)**: `src/app/api/erp/financial-report/financialReportEngine.ts`, `src/app/api/erp/tax-invoices/reconcile/route.ts`, `src/app/erp/components/BankMatchingTab.tsx`, `src/app/erp/components/bank-matching/BankLedgerGridAndSummary.tsx`, `src/app/erp/components/bank-matching/BankMatchModal.tsx`, `src/app/erp/components/tax-invoice/TaxInvoiceReconcileModal.tsx`, `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 입출금 표준 계정과목 목록을 정의하고 매칭 명칭·키워드 기반 계정과목 해석 및 은행 거래 행(적요·예금주·채널)별 계정과목 추천 함수를 제공

#### 4.8.4 `src/lib/erpApprovalLine.ts`
- **규모 / 계층 / 메뉴ID**: 380줄 (14.3 KB) / `L8_DOMAIN_LIBS` / `APPROVAL_INBOX` / 대칭·연관 쌍: `src/lib/erpApprovalServer.ts`
- **주요 Export 심볼**: `ApprovalEmployeeLike`, `ApprovalDepartmentLike`, `inferApprovalRankFromText`, `isCeoEmployee`, `getEffectiveApprovalRank`, `isDepartmentHeadEmployee`, `isActiveEmployeeRecord`, `resolveDepartmentHeadFromList`, `resolveWorkImprovementApprovalLine`, `ApprovalLineValidationResult`, `validateApprovalLineNoInversion`
- **정방향 의존 (`Out`)**: 내부 import `src/app/erp/components/organization/organizationTypes.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 8`)**: `src/app/api/erp/approvals/route.ts`, `src/app/api/erp/leaves/route.ts`, `src/app/api/erp/overtimes/route.ts`, `src/app/api/erp/work-improvements/route.ts`, `src/app/erp/components/ApprovalInboxTab.tsx`, `src/app/erp/components/WorkImprovementTab.tsx`, `src/app/erp/components/work-improvement/workImprovementTypes.ts`, `src/lib/erpApprovalServer.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 직급·직책 서열 점수 산출, 대표이사 결재 배제, 부서장 전결 및 업무개선활동 결재선 산출과 결재선 역전 검증을 수행하는 순수 도메인 유틸

#### 4.8.5 `src/lib/erpApprovalServer.ts`
- **규모 / 계층 / 메뉴ID**: 271줄 (10.8 KB) / `L8_DOMAIN_LIBS` / `APPROVAL_INBOX` / 대칭·연관 쌍: `src/lib/erpApprovalLine.ts`
- **주요 Export 심볼**: `LoadedOrgApprovalContext`, `loadOrgApprovalContext`, `resolveServerDepartmentHeadApprover`, `WorkImprovementLineResolution`, `resolveAndValidateServerWorkImprovementLine`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpApprovalLine.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 4`)**: `src/app/api/erp/approvals/route.ts`, `src/app/api/erp/leaves/route.ts`, `src/app/api/erp/overtimes/route.ts`, `src/app/api/erp/work-improvements/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_departments`, `erp_employees` · 시그널 없음
- **핵심 기능 명세**: erp_employees와 erp_departments를 조회하여 부서장 전결권자 산출 및 업무개선활동 결재선 서버 검증·정규화를 수행하는 서버 모듈

#### 4.8.6 `src/lib/erpBankClosing.ts`
- **규모 / 계층 / 메뉴ID**: 67줄 (2.3 KB) / `L8_DOMAIN_LIBS` / `BANK_MATCHING` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `ensureBankClosingColumns`, `syncBankAccountClosingState`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSchemaCache.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 4`)**: `src/app/api/erp/bank-matching/route.ts`, `src/app/api/erp/tax-invoices/reconcile/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/lib/erpBankReconcileService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_bank_transactions` · 시그널 없음
- **핵심 기능 명세**: erp_bank_transactions 마감 컬럼·인덱스를 멱등 생성하고 계좌별 미매칭 건수 기준으로 입출금 마감 상태(is_closed)를 동기화하는 모듈

#### 4.8.7 `src/lib/erpBankReconcileService.ts`
- **규모 / 계층 / 메뉴ID**: 720줄 (25.9 KB) / `L8_DOMAIN_LIBS` / `BANK_MATCHING` / 대칭·연관 쌍: `src/app/api/erp/bank-matching/route.ts`
- **주요 Export 심볼**: `PayrollClassificationResult`, `BulkUpsertBankTransactionsResult`, `KNOWN_PAYROLL_ACCOUNTS`, `prevYearMonth`, `classifyPayrollItem`, `normalizeCompanyForMatch`, `RECONCILE_DAY_MS`, `parseReconcileDayMs`, `isBankTxCounterpartyMatch`, `InvoiceSettlementBatchItem`, `applyBatchInvoiceSettlementUpdatesTx`, `applyBankReconcileMatch` 외 3개
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpBankClosing.ts`, `src/lib/ibkBankParser.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/bank-matching/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_bank_transactions`, `erp_rental_billings`, `erp_service_billings`, `erp_tax_invoices`, `erp_trade_billings` · 시그널 없음
- **핵심 기능 명세**: 통장 적요 기반 급여 분류, 미결 세금계산서 단일·다중 합산 자동 대사, applyBatchInvoiceSettlementUpdatesTx UNNEST 4대 테이블 배치 정산 동기화 및 일괄 업서트를 수행하는 서비스 모듈

#### 4.8.8 `src/lib/erpContractTemplate.ts`
- **규모 / 계층 / 메뉴ID**: 139줄 (5.7 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: `src/lib/erpFormat.ts`
- **주요 Export 심볼**: `ContractTemplateContext`, `resolveContractItemTemplate`, `resolveContractTaxItemsTemplate`, `selectPreferredBizItem`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 12`)**: `src/app/api/erp/partners/ocr-biz-cert/route.ts`, `src/app/api/erp/partners/route.ts`, `src/app/api/erp/rental/billings/route.ts`, `src/app/api/erp/services/billings/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/app/api/erp/trade/billings/route.ts`, `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/rental/useRentalTabController.ts`, `src/app/erp/components/service/useServiceTabController.ts`, `src/app/erp/components/trade/tradeHelpers.ts`, `src/lib/erpInoutTxService.ts`, `src/lib/popbillService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 계약 품목명·세금계산서 비고 치환식 평가(resolveContractItemTemplate, resolveContractTaxItemsTemplate) 및 우선 종목 추출(selectPreferredBizItem)을 제공

#### 4.8.9 `src/lib/erpDepreciation.ts`
- **규모 / 계층 / 메뉴ID**: 952줄 (36.5 KB) / `L8_DOMAIN_LIBS` / `RENTAL` / 대칭·연관 쌍: `src/lib/erpDepreciationSync.ts`
- **주요 Export 심볼**: `RentalAssetForDepreciation`, `AssetMonthDepreciationRow`, `MonthlyAssetRollForwardSummary`, `RentalSalesRevenueCategoryCode`, `ModelRevenueAttributionItem`, `ClassifiedRentalInvoiceRow`, `RentalSalesSeparationSummary`, `OWNED_ASSET_INVOICE_ATTRIBUTION_MAP`, `classifyRentalSalesInvoice`, `buildRentalSalesSeparationAndModelRevenue`, `allocateModelMonthRevenueToAssets`, `resolveUsefulLifeMonths` 외 7개
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 4`)**: `src/app/api/erp/assets/depreciation/route.ts`, `src/app/api/erp/assets/route.ts`, `src/app/api/erp/financial-report/financialStatementsBuilder.ts`, `src/lib/erpDepreciationSync.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 렌탈 매출세금계산서 4대 유형 분리, 모델별 매출 귀속 및 자산 월할 감가상각·폐기손실·Roll-Forward 스케줄을 산출하는 순수 계산 모듈

#### 4.8.10 `src/lib/erpDepreciationSync.ts`
- **규모 / 계층 / 메뉴ID**: 370줄 (12.2 KB) / `L8_DOMAIN_LIBS` / `RENTAL` / 대칭·연관 쌍: `src/lib/erpDepreciation.ts`
- **주요 Export 심볼**: `syncAllRentalAssetDepreciationLogs`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpDepreciation.ts`, `src/lib/erpSchemaCache.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/assets/depreciation/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_asset_depreciation_logs`, `erp_rental_assets`, `erp_rental_products`, `erp_tax_invoices` · 시그널 없음
- **핵심 기능 명세**: runSchemaInitOnce 1회 스키마 보강 후 UNNEST 배치 UPSERT·UPDATE로 erp_asset_depreciation_logs 및 erp_rental_assets를 동기화하는 DB 동기화 서비스

#### 4.8.11 `src/lib/erpExpenseSchema.ts`
- **규모 / 계층 / 메뉴ID**: 36줄 (1.4 KB) / `L8_DOMAIN_LIBS` / `EXPENSE_RECEIPT` / 대칭·연관 쌍: `src/app/api/erp/expenses/route.ts`
- **주요 Export 심볼**: `ensureExpenseSchema`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSchemaCache.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/api/erp/expenses/route.ts`, `src/app/api/erp/payroll/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_employees`, `erp_expense_receipts`, `erp_payroll_records` · 시그널 없음
- **핵심 기능 명세**: runSchemaInitOnce 1회 캐싱으로 erp_expense_receipts 테이블 및 급여 개인경비 정산 컬럼(personal_expense_amount)을 멱등 초기화하는 서버 SSOT 모듈

#### 4.8.12 `src/lib/erpFormat.ts`
- **규모 / 계층 / 메뉴ID**: 215줄 (7.2 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `formatErpNumber`, `formatErpInputNumber`, `formatErpSignedInputNumber`, `toErpInputString`, `cleanErpNumber`, `formatErpCurrency`, `formatErpQty`, `SortDirection`, `SortState`, `ErpSortState`, `cycleErpSort`, `sortErpItems`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 79`)**: `src/app/erp/components/ApprovalInboxTab.tsx`, `src/app/erp/components/ApprovalRulesTab.tsx`, `src/app/erp/components/AssetManagementTab.tsx`, `src/app/erp/components/BankMatchingTab.tsx`, `src/app/erp/components/CloudShareTab.tsx`, `src/app/erp/components/ContractTaxInvoiceSection.tsx`, `src/app/erp/components/ExpenseReceiptTab.tsx`, `src/app/erp/components/FinancialReportTab.tsx`, `src/app/erp/components/ForkliftOptionAttachPanel.tsx`, `src/app/erp/components/ForkliftSpecEditor.tsx`, `src/app/erp/components/GovSupportIntelTab.tsx`, `src/app/erp/components/InboundRegTab.tsx`, `src/app/erp/components/LeaveApplyTab.tsx`, `src/app/erp/components/LeaveManageTab.tsx`, `src/app/erp/components/OrganizationTab.tsx`, `src/app/erp/components/OtManagementTab.tsx`, `src/app/erp/components/OutboundRegTab.tsx`, `src/app/erp/components/PartnerManagementTab.tsx`, `src/app/erp/components/PayrollTab.tsx`, `src/app/erp/components/PermissionsTab.tsx`, `src/app/erp/components/ProductManagementTab.tsx`, `src/app/erp/components/RentalBizDirectoryTab.tsx`, `src/app/erp/components/RentalMaintenanceTab.tsx`, `src/app/erp/components/SortableTh.tsx`, `src/app/erp/components/TradeTab.tsx`, `src/app/erp/components/WarrantyManagementTab.tsx`, `src/app/erp/components/assets/AssetAcquireModal.tsx`, `src/app/erp/components/assets/AssetDepreciationLedgerView.tsx`, `src/app/erp/components/assets/AssetDossierDrawer.tsx`, `src/app/erp/components/assets/AssetSummaryAndDetailTables.tsx`, `src/app/erp/components/bank-matching/BankLedgerGridAndSummary.tsx`, `src/app/erp/components/bank-matching/BankMatchModal.tsx`, `src/app/erp/components/bank-matching/ManualTransactionModal.tsx`, `src/app/erp/components/corporate-docs/CorporateDocVaultSubTab.tsx`, `src/app/erp/components/corporate-docs/TemplateStudioSubTab.tsx`, `src/app/erp/components/employment-contracts/EmploymentContractFormAndListPanel.tsx`, `src/app/erp/components/expenses/ExpenseCreateAndPreviewModals.tsx`, `src/app/erp/components/financial-report/FinancialDetailLedgerSection.tsx`, `src/app/erp/components/financial-report/FinancialStatementsBoard.tsx`, `src/app/erp/components/financial-report/MonthlyAccountMatrixSection.tsx`, `src/app/erp/components/organization/OrgTreeAndMemberGrid.tsx`, `src/app/erp/components/organization/ProfileCompensationAndLeaveSection.tsx`, `src/app/erp/components/organization/useOrganizationController.ts`, `src/app/erp/components/outbound/OutboundBillingAndLogsPanel.tsx`, `src/app/erp/components/overtime/OtRequestModal.tsx`, `src/app/erp/components/partners/BizStatusBatchModal.tsx`, `src/app/erp/components/partners/PartnerListPanel.tsx`, `src/app/erp/components/payroll/PayrollEditAndOcrModals.tsx`, `src/app/erp/components/products/ProductDossierAndAddModal.tsx`, `src/app/erp/components/rental-biz-dir/PortalGuideModal.tsx`, `src/app/erp/components/rental-biz-dir/RentalBizToolbarAndGrid.tsx`, `src/app/erp/components/rental-maintenance/HoursWearAndVehicleStockTabs.tsx`, `src/app/erp/components/rental-maintenance/MaintenanceActivitiesAndPmSubTabs.tsx`, `src/app/erp/components/rental-maintenance/RentalMaintActivityModal.tsx`, `src/app/erp/components/rental-maintenance/RentalMaintStockVehicleModals.tsx`, `src/app/erp/components/rental/RentalAddContractModal.tsx`, `src/app/erp/components/rental/RentalAssetModelModals.tsx`, `src/app/erp/components/rental/RentalEditContractModal.tsx`, `src/app/erp/components/rental/RentalSubTabGrids.tsx`, `src/app/erp/components/rental/useRentalTabController.ts`, `src/app/erp/components/service/ProRataFormulaGuideBox.tsx`, `src/app/erp/components/service/ServiceAddContractModal.tsx`, `src/app/erp/components/service/ServiceBillingModal.tsx`, `src/app/erp/components/service/ServiceEditContractModal.tsx`, `src/app/erp/components/service/ServiceLedgersAndDocModal.tsx`, `src/app/erp/components/service/useServiceTabController.ts`, `src/app/erp/components/tax-invoice/TaxInvoiceReconcileModal.tsx`, `src/app/erp/components/tax-invoice/TaxKpiAndFilterBar.tsx`, `src/app/erp/components/tax-invoice/TaxLedgerSubTab.tsx`, `src/app/erp/components/tax-invoice/TaxUnissuedAndSyncSubTabs.tsx`, `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts`, `src/app/erp/components/trade/TradeInventoryAndProductsSubTabs.tsx`, `src/app/erp/components/trade/TradeProductPurchaseModals.tsx`, `src/app/erp/components/trade/TradeSaleBillingModals.tsx`, `src/app/erp/components/trade/TradeSalesBillingSubTabs.tsx`, `src/app/erp/components/trade/tradeHelpers.ts`, `src/app/erp/components/warranty/WarrantyDossierAndAddModal.tsx`, `src/app/share/[code]/page.tsx`, `src/lib/erpHrLaborDomain.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 숫자·통화·수량 포맷팅, 정수 입력 정제 및 3단계 테이블 정렬(cycleErpSort, sortErpItems)을 제공하는 전사 공용 포맷·정렬 SSOT 모듈

#### 4.8.13 `src/lib/erpHrLaborDomain.ts`
- **규모 / 계층 / 메뉴ID**: 751줄 (25.4 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: `src/lib/erpFormat.ts`
- **주요 Export 심볼**: `formatErpLeaveDays`, `LeaveTypeCode`, `LeaveTypeMeta`, `LEAVE_TYPE_LIST`, `LEAVE_TYPE_MAP`, `isNonDeductingLeaveType`, `getLeaveTypeLabel`, `calculateWeekdayCount`, `calculateAnnualLeaveEntitlement`, `isKoreanNonWorkingDay`, `OvertimeBreakdownResult`, `calculateOvertimeBreakdown` 외 2개
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpFormat.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 17`)**: `src/app/api/erp/employees/reset-leave/route.ts`, `src/app/api/erp/employees/route.ts`, `src/app/api/erp/employment-contracts/route.ts`, `src/app/api/erp/leaves/route.ts`, `src/app/api/erp/organization/batch/route.ts`, `src/app/api/erp/overtimes/route.ts`, `src/app/api/erp/payroll/route.ts`, `src/app/api/erp/services/contracts/route.ts`, `src/app/erp/components/LeaveApplyTab.tsx`, `src/app/erp/components/LeaveManageTab.tsx`, `src/app/erp/components/OtManagementTab.tsx`, `src/app/erp/components/overtime/OtRequestModal.tsx`, `src/app/erp/components/service/ProRataFormulaGuideBox.tsx`, `src/app/erp/components/service/ServiceAddContractModal.tsx`, `src/app/erp/components/service/ServiceBillingModal.tsx`, `src/app/erp/components/service/ServiceEditContractModal.tsx`, `src/app/erp/components/service/useServiceTabController.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 연차 휴가 유형·비례연차 부여·평일수 산출, 공휴일 판별, 초과근무 가산수당 및 209시간 주휴 입퇴사 일할계산을 제공하는 인사·노무 도메인 SSOT 모듈

#### 4.8.14 `src/lib/erpInoutTxService.ts`
- **규모 / 계층 / 메뉴ID**: 980줄 (33 KB) / `L8_DOMAIN_LIBS` / `OUTBOUND_REG` / 대칭·연관 쌍: `src/app/api/erp/inout/route.ts`
- **주요 Export 심볼**: `InoutValidationError`, `computeMonthlyProRata`, `executeOutboundInoutTx`, `executeInboundInoutTx`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpContractTemplate.ts`, `src/lib/forkliftDomain.ts`, `src/lib/partnerStatusService.ts`, `src/lib/rentalFeeUtils.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/inout/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_asset_hour_logs`, `erp_asset_inout_logs`, `erp_audit_logs`, `erp_forklift_warranties`, `erp_partners`, `erp_rental_assets`, `erp_rental_billings`, `erp_rental_contracts`, `erp_rental_products` · 시그널 없음
- **핵심 기능 명세**: 월할 일할계산(computeMonthlyProRata), UNNEST 배치 월별 청구 생성·갱신 기반 출고 트랜잭션(executeOutboundInoutTx) 및 입고 회수 트랜잭션(executeInboundInoutTx)을 제공

#### 4.8.15 `src/lib/erpMasterDataBus.ts`
- **규모 / 계층 / 메뉴ID**: 153줄 (4.1 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `MasterDataDomain`, `fetchCachedMasterData`, `invalidateMasterData`, `onMasterDataInvalidated`, `useMasterDataSync`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/erp/components/PartnerManagementTab.tsx`, `src/app/erp/components/rental/useRentalTabController.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 클라이언트 마스터 데이터 45초 메모리 캐싱, 중복 요청 병합, 도메인별 캐시 무효화 이벤트 발행 및 Keep-Alive 탭 동기화 훅을 제공하는 모듈

#### 4.8.16 `src/lib/erpMenuHistory.ts`
- **규모 / 계층 / 메뉴ID**: 165줄 (4.2 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `MenuHistoryEntry`, `MenuHistoryState`, `MAX_MENU_HISTORY`, `createMenuHistory`, `pushMenuHistory`, `stepMenuHistoryBack`, `stepMenuHistoryForward`, `pruneMenuHistoryByAllowed`, `canStepMenuBack`, `canStepMenuForward`, `getPrevMenuEntry`, `getNextMenuEntry`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/erp/useErpShellController.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: ERP 메뉴 방문 이력 스택(최대 50건)의 추가, 이전·다음 이동 및 허용 메뉴 집합 기준 이력 정리를 처리하는 순수 상태 머신 유틸

#### 4.8.17 `src/lib/erpOcrEngine.ts`
- **규모 / 계층 / 메뉴ID**: 436줄 (14.5 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: `src/lib/groqServerKey.ts`
- **주요 Export 심볼**: `GroqJsonOcrOptions`, `extractTextFromPdfBuffer`, `extractCleanJsonObject`, `callGroqJsonOcr`, `normalizeKoreanBankName`, `cleanBankAccountNo`, `formatBizRegNo`, `formatCorpRegNo`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/groqServerKey.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 5`)**: `src/app/api/erp/employment-contracts/ocr/route.ts`, `src/app/api/erp/expenses/route.ts`, `src/app/api/erp/partners/ocr-bank/route.ts`, `src/app/api/erp/partners/ocr-biz-cert/route.ts`, `src/app/api/erp/partners/ocr-card/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: PDF ToUnicode CMap 텍스트 해독, Groq LLM JSON 펜스 제거·재시도 파싱, 한국 은행명·계좌번호·사업자번호 정규화를 통합 제공하는 OCR 엔진 SSOT

#### 4.8.18 `src/lib/erpRbacGuard.ts`
- **규모 / 계층 / 메뉴ID**: 226줄 (6.1 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: `src/lib/erpSessionToken.ts`
- **주요 Export 심볼**: `invalidateRbacCache`, `getRolePermissionMap`, `RbacGuardResult`, `requireMenuPermission`, `logPiiReadAudit`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSecurityAudit.ts`, `src/lib/erpSessionToken.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 7`)**: `src/app/api/erp/bank-matching/route.ts`, `src/app/api/erp/employment-contracts/route.ts`, `src/app/api/erp/expenses/route.ts`, `src/app/api/erp/financial-report/route.ts`, `src/app/api/erp/payroll/route.ts`, `src/app/api/erp/permissions/route.ts`, `src/app/api/erp/tax-invoices/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_role_permissions` · 시그널 없음
- **핵심 기능 명세**: 요청 세션 검증, erp_role_permissions 60초 캐시 기반 메뉴별 view·save·bill 권한 검사 및 PII 열람 감사로그 적재를 수행하는 API 가드

#### 4.8.19 `src/lib/erpRentalContractService.ts`
- **규모 / 계층 / 메뉴ID**: 537줄 (17.8 KB) / `L8_DOMAIN_LIBS` / `RENTAL` / 대칭·연관 쌍: `src/app/api/erp/rental/contracts/route.ts`
- **주요 Export 심볼**: `RentalItemAssignInput`, `ReservedRentalAsset`, `RentalContractRateTerms`, `normalizeRentalContractRows`, `resolveContractRateTerms`, `buildOptionAddonTaxRows`, `buildGroupedTaxItemsForContract`, `buildContractTaxSummaryTx`, `reserveRentalContractAssetsTx`, `assignAssetsToRentalContractBatchTx`, `syncPartnerTaxEmailsTx`, `releaseContractAssetsTx` 외 1개
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/rentalFeeUtils.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/rental/contracts/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_asset_inout_logs`, `erp_partners`, `erp_rental_assets`, `erp_rental_contracts`, `erp_rental_products` · 시그널 없음
- **핵심 기능 명세**: 임대계약 자산 예약(LATERAL FOR UPDATE)·UNNEST 배치 출고 배정·반납 해제·거래처 세금계산서 수신이메일 동기화 및 과세 요약 생성을 수행하는 트랜잭션 서비스

#### 4.8.20 `src/lib/erpSchemaCache.ts`
- **규모 / 계층 / 메뉴ID**: 61줄 (2.5 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `runSchemaInitOnce`, `ensureErpCoreIndexes`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 18`)**: `src/app/api/erp/approvals/rules/route.ts`, `src/app/api/erp/cloud-shares/route.ts`, `src/app/api/erp/corporate-docs/route.ts`, `src/app/api/erp/employment-contracts/route.ts`, `src/app/api/erp/financial-report/route.ts`, `src/app/api/erp/gov-support/route.ts`, `src/app/api/erp/obsidian/route.ts`, `src/app/api/erp/partners/route.ts`, `src/app/api/erp/payroll/route.ts`, `src/app/api/erp/permissions/route.ts`, `src/app/api/erp/rental-directory/rentalDirectorySyncService.ts`, `src/app/api/erp/shareholder-registry/route.ts`, `src/app/api/erp/work-improvements/route.ts`, `src/lib/erpBankClosing.ts`, `src/lib/erpDepreciationSync.ts`, `src/lib/erpExpenseSchema.ts`, `src/lib/erpSecurityAudit.ts`, `src/lib/partnerStatusService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 프로세스 수명 동안 스키마 DDL 초기화를 키별 1회 실행으로 캐싱하고 erp_* 핵심 조회 테이블의 성능 인덱스를 멱등 생성하는 서버 유틸

#### 4.8.21 `src/lib/erpSecurityAudit.ts`
- **규모 / 계층 / 메뉴ID**: 215줄 (6.7 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `getClientIpFromRequest`, `isHttpsRequest`, `buildSessionCookieHeader`, `buildClearSessionCookieHeader`, `checkLoginRateLimit`, `recordLoginFailure`, `clearLoginFailures`, `getErpSessionFromRequest`, `ensureSecurityAuditSchema`, `SecurityAuditEventInput`, `logSecurityAuditEvent`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSchemaCache.ts`, `src/lib/erpSessionToken.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 8`)**: `src/app/api/erp/auth/change-password/route.ts`, `src/app/api/erp/auth/login/route.ts`, `src/app/api/erp/auth/logout/route.ts`, `src/app/api/erp/auth/session/route.ts`, `src/app/api/erp/employees/route.ts`, `src/app/api/erp/organization/batch/route.ts`, `src/app/api/erp/shareholder-registry/route.ts`, `src/lib/erpRbacGuard.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_security_audit_logs` · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 클라이언트 IP 추출, 세션 쿠키 헤더 생성, IP·ID별 로그인 5회 실패 10분 잠금 제어 및 erp_security_audit_logs 감사로그 기록을 수행

#### 4.8.22 `src/lib/erpSessionToken.ts`
- **규모 / 계층 / 메뉴ID**: 143줄 (4.2 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: `src/lib/erpSecurityAudit.ts`
- **주요 Export 심볼**: `ERP_SESSION_COOKIE_NAME`, `ERP_SESSION_TTL_SECONDS`, `ErpSessionPayload`, `signErpSessionToken`, `verifyErpSessionToken`, `extractCookieValue`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 5`)**: `src/app/api/erp/auth/login/route.ts`, `src/app/api/erp/auth/session/route.ts`, `src/lib/erpRbacGuard.ts`, `src/lib/erpSecurityAudit.ts`, `src/middleware.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: Web Crypto HMAC-SHA256 기반 8시간 만료 ERP 세션 토큰 서명·검증 및 요청 Cookie 헤더 값 추출을 제공하는 Edge·Node 공용 모듈

#### 4.8.23 `src/lib/erpTaxReconcileEngine.ts`
- **규모 / 계층 / 메뉴ID**: 740줄 (27.9 KB) / `L8_DOMAIN_LIBS` / `TAX` / 대칭·연관 쌍: `src/app/api/erp/tax-invoices/reconcile/route.ts`
- **주요 Export 심볼**: `DAY_MS`, `CompanyAliasMatchResult`, `MatchScoreResult`, `InvoiceMatchPartitionItem`, `PartitionAutoMatchOutput`, `AutoMatchResultItem`, `LinkedBillingSyncTarget`, `parseIsoDayMs`, `extractPositiveIds`, `normalizeCompanyName`, `checkCompanyAliasMatch`, `computeMatchScore` 외 5개
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/tax-invoices/reconcile/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_rental_billings`, `erp_service_billings`, `erp_trade_billings` · 시그널 없음
- **핵심 기능 명세**: 거래처 별칭 정규화, 세금계산서·통장 점수 산출, 부분합 다중매칭, 파티션 자동대사 엔진 및 청구대장 상태 일괄 동기화를 제공하는 서버 모듈

#### 4.8.24 `src/lib/forkliftDomain.ts`
- **규모 / 계층 / 메뉴ID**: 360줄 (12 KB) / `L8_DOMAIN_LIBS` / `RENTAL` / 대칭·연관 쌍: `src/lib/forkliftSchemaInit.ts`
- **주요 Export 심볼**: `ForkliftItemClass`, `ForkliftWarrantyStatus`, `FORKLIFT_ITEM_CLASS_OPTIONS`, `FORKLIFT_POWER_TYPES`, `FORKLIFT_MAST_TYPES`, `FORKLIFT_TIRE_TYPES`, `FORKLIFT_OPTION_GROUPS`, `FORKLIFT_PART_GROUPS`, `ForkliftSpecData`, `AttachedForkliftOption`, `normalizeItemClass`, `getItemClassLabel` 외 8개
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 43`)**: `src/app/api/erp/assets/route.ts`, `src/app/api/erp/products/route.ts`, `src/app/api/erp/rental/contracts/route.ts`, `src/app/api/erp/rental/maintenance/route.ts`, `src/app/api/erp/rental/operating-hours/route.ts`, `src/app/api/erp/rental/products/route.ts`, `src/app/api/erp/rental/vehicle-stocks/route.ts`, `src/app/api/erp/trade/products/route.ts`, `src/app/api/erp/trade/sales/route.ts`, `src/app/api/erp/warranties/claims/route.ts`, `src/app/api/erp/warranties/route.ts`, `src/app/erp/components/AssetManagementTab.tsx`, `src/app/erp/components/ForkliftOptionAttachPanel.tsx`, `src/app/erp/components/ForkliftSpecEditor.tsx`, `src/app/erp/components/InboundRegTab.tsx`, `src/app/erp/components/OutboundRegTab.tsx`, `src/app/erp/components/ProductManagementTab.tsx`, `src/app/erp/components/RentalMaintenanceTab.tsx`, `src/app/erp/components/TradeTab.tsx`, `src/app/erp/components/WarrantyManagementTab.tsx`, `src/app/erp/components/assets/AssetAcquireModal.tsx`, `src/app/erp/components/assets/AssetDossierDrawer.tsx`, `src/app/erp/components/assets/AssetSummaryAndDetailTables.tsx`, `src/app/erp/components/assets/assetTypes.ts`, `src/app/erp/components/outbound/OutboundBillingAndLogsPanel.tsx`, `src/app/erp/components/products/ProductDossierAndAddModal.tsx`, `src/app/erp/components/rental/RentalAddContractModal.tsx`, `src/app/erp/components/rental/RentalEditContractModal.tsx`, `src/app/erp/components/rental/RentalSubTabGrids.tsx`, `src/app/erp/components/rental/useRentalTabController.ts`, `src/app/erp/components/trade/TradeInventoryAndProductsSubTabs.tsx`, `src/app/erp/components/trade/TradeProductPurchaseModals.tsx`, `src/app/erp/components/trade/TradeSaleBillingModals.tsx`, `src/app/erp/components/trade/TradeSalesBillingSubTabs.tsx`, `src/app/erp/components/trade/tradeHelpers.ts`, `src/app/erp/components/warranty/WarrantyDossierAndAddModal.tsx`, `src/lib/erpInoutTxService.ts`, `src/lib/erpRentalContractService.ts`, `src/lib/rentalMaintPartStockTx.ts`, `src/lib/rentalMaintenanceDomain.ts`, `src/lib/rentalMaintenanceTxService.ts`, `src/lib/rentalOperatingHoursTxService.ts`, `src/lib/tradeInventoryDomain.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 지게차 완제품·옵션·부품 분류 상수, 제원 JSON 파싱·요약, 장착 옵션 금액 집계 및 보증 만료일·가동시간 기준 보증 상태 판정 함수를 제공

#### 4.8.25 `src/lib/forkliftSchemaInit.ts`
- **규모 / 계층 / 메뉴ID**: 113줄 (5 KB) / `L8_DOMAIN_LIBS` / `RENTAL` / 대칭·연관 쌍: `src/lib/forkliftDomain.ts`
- **주요 Export 심볼**: `FORKLIFT_DDL_STATEMENTS`, `ensureForkliftSchema`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 10`)**: `src/app/api/erp/assets/route.ts`, `src/app/api/erp/inout/route.ts`, `src/app/api/erp/products/route.ts`, `src/app/api/erp/rental/contracts/route.ts`, `src/app/api/erp/rental/products/route.ts`, `src/app/api/erp/trade/products/route.ts`, `src/app/api/erp/trade/sales/route.ts`, `src/app/api/erp/warranties/claims/route.ts`, `src/app/api/erp/warranties/route.ts`, `src/lib/rentalMaintenanceSchema.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_forklift_warranties`, `erp_forklift_warranty_claims`, `erp_rental_assets`, `erp_rental_contracts`, `erp_rental_products`, `erp_trade_products`, `erp_trade_sales` · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 매매·렌탈 제품·판매·자산·계약 테이블에 지게차 제원·옵션·보증 컬럼을 추가하고 보증·클레임 테이블을 멱등 생성하는 스키마 초기화 모듈

#### 4.8.26 `src/lib/forkliftWarrantyService.ts`
- **규모 / 계층 / 메뉴ID**: 219줄 (6.1 KB) / `L8_DOMAIN_LIBS` / `WARRANTY` / 대칭·연관 쌍: `src/app/api/erp/assets/route.ts`
- **주요 Export 심볼**: `ForkliftWarrantyUpsertInput`, `upsertForkliftWarrantiesBatchTx`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/api/erp/assets/route.ts`, `src/app/api/erp/trade/sales/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_forklift_warranties` · 시그널 없음
- **핵심 기능 명세**: 렌탈자산 취득(RENTAL_ASSET)과 유통판매(SALE) 경로의 차대번호 기준 보증카드 일괄 UPSERT(upsertForkliftWarrantiesBatchTx)를 수행하는 UNNEST 트랜잭션 SSOT 모듈

#### 4.8.27 `src/lib/groqServerKey.ts`
- **규모 / 계층 / 메뉴ID**: 39줄 (1.1 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `getGroqApiKey`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/piiCrypto.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/api/erp/payroll/ocr/route.ts`, `src/lib/erpOcrEngine.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_ai_intel_settings` · 시그널 없음
- **핵심 기능 명세**: 환경변수 GROQ_API_KEY 또는 erp_ai_intel_settings 암호화 키를 복호화해 5분 메모리 캐시로 제공하는 서버 전용 키 조회 모듈

#### 4.8.28 `src/lib/hangulSearch.ts`
- **규모 / 계층 / 메뉴ID**: 307줄 (9.6 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `CHOSUNG_LIST`, `COMPLEX_CONSONANT_MAP`, `decomposeComplexConsonants`, `HANGUL_BASE`, `HANGUL_END`, `isHangulSyllable`, `isChosungChar`, `getChosung`, `extractChosung`, `createHangulSearchRegex`, `containsChosung`, `HangulMatcher` 외 10개
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 18`)**: `src/app/erp/components/AssetManagementTab.tsx`, `src/app/erp/components/BankMatchingTab.tsx`, `src/app/erp/components/InboundRegTab.tsx`, `src/app/erp/components/OutboundRegTab.tsx`, `src/app/erp/components/PartnerManagementTab.tsx`, `src/app/erp/components/ProductManagementTab.tsx`, `src/app/erp/components/SearchSelectCombobox.tsx`, `src/app/erp/components/TradeTab.tsx`, `src/app/erp/components/WarrantyManagementTab.tsx`, `src/app/erp/components/corporate-docs/CorporateDocVaultSubTab.tsx`, `src/app/erp/components/employment-contracts/EmploymentContractFormAndListPanel.tsx`, `src/app/erp/components/rental/RentalSubTabGrids.tsx`, `src/app/erp/components/rental/useRentalTabController.ts`, `src/app/erp/components/service/ServiceLedgersAndDocModal.tsx`, `src/app/erp/components/service/useServiceTabController.ts`, `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts`, `src/app/erp/components/trade/tradeHelpers.ts`, `src/lib/tradeInventoryDomain.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 복자음 분해, 초성 추출, 정규식 매처 캐싱, 다중 토큰 AND 통합검색, 거래처명 정제 및 가나다순 정렬을 수행하는 한글 초성 검색 유틸

#### 4.8.29 `src/lib/ibkBankParser.ts`
- **규모 / 계층 / 메뉴ID**: 447줄 (14.6 KB) / `L8_DOMAIN_LIBS` / `BANK_MATCHING` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `ParsedBankTransaction`, `BankImportMeta`, `parseXlsxBufferToRows`, `decodeTextBuffer`, `parseCsvOrTsvTextToRows`, `extractBankTransactionsFromRows`, `parseBankFileBuffer`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 4`)**: `src/app/api/erp/bank-matching/route.ts`, `src/app/api/erp/financial-report/route.ts`, `src/app/api/erp/tax-invoices/hometax/route.ts`, `src/lib/erpBankReconcileService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: IBK기업은행 XLSX(ZIP)·CSV·TSV·HTML 표 파일을 디코딩·파싱하여 계좌 메타데이터와 중복 방지 txHash 포함 입출금 거래 내역을 추출

#### 4.8.30 `src/lib/partnerStatusClient.ts`
- **규모 / 계층 / 메뉴ID**: 158줄 (5.1 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: `src/lib/partnerStatusService.ts`
- **주요 Export 심볼**: `NtsBizState`, `PartnerStatusType`, `PartnerTradeCheckTarget`, `PartnerTradeBlockInfo`, `normalizeBizNoDigits`, `formatBizNoHyphen`, `isPartnerTradeBlocked`, `getPartnerTradeBlockInfo`, `findBlockedPartnerMatch`, `getNtsBizStateBadgeLabel`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 16`)**: `src/app/api/erp/partners/check-biz-status/route.ts`, `src/app/erp/components/OutboundRegTab.tsx`, `src/app/erp/components/TradeTab.tsx`, `src/app/erp/components/partners/BizCertOcrModal.tsx`, `src/app/erp/components/partners/BizStatusBatchModal.tsx`, `src/app/erp/components/partners/PartnerDocViewerModal.tsx`, `src/app/erp/components/partners/PartnerDossierPanel.tsx`, `src/app/erp/components/partners/PartnerFormModal.tsx`, `src/app/erp/components/partners/PartnerListPanel.tsx`, `src/app/erp/components/partners/partnerPdfUtils.ts`, `src/app/erp/components/partners/usePartnerDocAndNtsActions.ts`, `src/app/erp/components/rental/useRentalTabController.ts`, `src/app/erp/components/service/useServiceTabController.ts`, `src/app/erp/components/tax-invoice/useTaxInvoiceController.ts`, `src/app/erp/components/trade/tradeHelpers.ts`, `src/lib/partnerStatusService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 사업자번호 정규화, 거래처·국세청 휴폐업 상태 기반 거래차단 판별, 배지 메타정보 생성 및 차단 거래처 매칭을 제공하는 클라이언트·서버 공용 모듈

#### 4.8.31 `src/lib/partnerStatusService.ts`
- **규모 / 계층 / 메뉴ID**: 304줄 (9.9 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: `src/lib/partnerStatusClient.ts`
- **주요 Export 심볼**: `NtsBizStatusResult`, `PartnerTradeBlockedError`, `ensurePartnerStatusSchema`, `parseHomeTaxStatusPayload`, `queryNtsBizStatusSingle`, `queryNtsBizStatusBatch`, `assertPartnerTradable`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/erpSchemaCache.ts`, `src/lib/partnerStatusClient.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 9`)**: `src/app/api/erp/inout/route.ts`, `src/app/api/erp/partners/check-biz-status/route.ts`, `src/app/api/erp/partners/route.ts`, `src/app/api/erp/rental/contracts/route.ts`, `src/app/api/erp/services/contracts/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/app/api/erp/trade/purchases/route.ts`, `src/app/api/erp/trade/sales/route.ts`, `src/lib/erpInoutTxService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_partners` · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: erp_partners 국세청 상태 컬럼 보강, 홈택스 사업자 상태 단건·배치 조회 파싱 및 거래 생성 전 차단 거래처 검증 예외 발생을 수행하는 서버 모듈

#### 4.8.32 `src/lib/piiCrypto.ts`
- **규모 / 계층 / 메뉴ID**: 185줄 (7 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `isEncryptedPii`, `encryptPii`, `decryptPii`, `hmacPiiBlindIndex`, `maskResidentRegNo`, `maskBankAccount`, `maskPhone`, `hashPassword`, `verifyPassword`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 12`)**: `src/app/api/erp/auth/change-password/route.ts`, `src/app/api/erp/auth/login/route.ts`, `src/app/api/erp/employees/route.ts`, `src/app/api/erp/employment-contracts/route.ts`, `src/app/api/erp/gov-support/route.ts`, `src/app/api/erp/organization/batch/route.ts`, `src/app/api/erp/partners/route.ts`, `src/app/api/erp/payroll/route.ts`, `src/app/api/erp/rental-directory/route.ts`, `src/app/api/erp/shareholder-registry/route.ts`, `src/lib/groqServerKey.ts`, `src/lib/r2ErpVault.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: AES-256-GCM 개인정보 암복호화, HMAC-SHA256 블라인드 인덱스, 주민번호·계좌·전화 마스킹 및 scrypt 비밀번호 해시·검증을 제공

#### 4.8.33 `src/lib/popbillService.ts`
- **규모 / 계층 / 메뉴ID**: 656줄 (24.6 KB) / `L8_DOMAIN_LIBS` / `TAX` / 대칭·연관 쌍: `src/types/popbill.d.ts`
- **주요 Export 심볼**: `popbillTaxService`, `POPBILL_REGISTERED_CORP_NUM`, `POPBILL_INDIVIDUAL_CORP_NUM`, `resolvePopbillCorpNum`, `PopbillTaxItem`, `PopbillIssueParams`, `registIssuePopbill`, `getPopbillInfo`, `getPopbillPopUpURL`, `getPopbillPrintURL`, `getPopbillPortalURL`, `getPopbillLiveStatus` 외 5개
- **정방향 의존 (`Out`)**: 내부 import `src/lib/businessEntities.ts`, `src/lib/erpContractTemplate.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 3`)**: `src/app/api/erp/tax-invoices/hometax/route.ts`, `src/app/api/erp/tax-invoices/popbill/route.ts`, `src/app/api/erp/tax-invoices/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 팝빌 SDK 기반 전자세금계산서 정식발행·임시등록·국세청 즉시전송·이메일 재전송·인증서 검증·잔액 및 포털 URL 조회를 수행하는 서버 모듈

#### 4.8.34 `src/lib/r2ErpVault.ts`
- **규모 / 계층 / 메뉴ID**: 355줄 (11 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `putErpPrivateObject`, `getErpPrivateObject`, `deleteErpPrivateObject`, `createErpPresignedUrl`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/piiCrypto.ts`, `src/lib/supabaseErp.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 8`)**: `src/app/api/erp/cloud-shares/files/route.ts`, `src/app/api/erp/cloud-shares/route.ts`, `src/app/api/erp/corporate-docs/route.ts`, `src/app/api/erp/employment-contracts/route.ts`, `src/app/api/erp/expenses/route.ts`, `src/app/api/erp/obsidian/route.ts`, `src/app/api/erp/vault/route.ts`, `src/app/api/share/[code]/download/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_system_secrets` · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 환경변수 또는 erp_system_secrets 복호화 키로 S3 Signature V4 서명을 생성하여 Cloudflare R2 비공개 버킷 업로드·다운로드·삭제·Presigned URL을 제공

#### 4.8.35 `src/lib/rentalFeeUtils.ts`
- **규모 / 계층 / 메뉴ID**: 176줄 (6 KB) / `L8_DOMAIN_LIBS` / `RENTAL` / 대칭·연관 쌍: `src/lib/rentalSchemaInit.ts`
- **주요 Export 심볼**: `RentalRateBasis`, `RENTAL_RATE_BASIS_OPTIONS`, `parseNumericInput`, `calculateAutoDailyRentalFee`, `isLegacyAutoDividedDailyFee`, `resolveDailyRentalFee`, `normalizeRentalRateBasis`, `inferRentalRateBasis`, `getRentalRateBasisLabel`, `getRentalRateBasisShortLabel`, `computeRentalSupplyByBasis`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 21`)**: `src/app/api/erp/assets/route.ts`, `src/app/api/erp/inout/route.ts`, `src/app/api/erp/products/route.ts`, `src/app/api/erp/rental/billings/route.ts`, `src/app/api/erp/rental/contracts/route.ts`, `src/app/api/erp/rental/products/route.ts`, `src/app/api/erp/trade/products/route.ts`, `src/app/api/erp/warranties/claims/route.ts`, `src/app/api/erp/warranties/route.ts`, `src/app/erp/components/AssetManagementTab.tsx`, `src/app/erp/components/OutboundRegTab.tsx`, `src/app/erp/components/ProductManagementTab.tsx`, `src/app/erp/components/outbound/OutboundBillingAndLogsPanel.tsx`, `src/app/erp/components/products/ProductDossierAndAddModal.tsx`, `src/app/erp/components/rental/RentalAddContractModal.tsx`, `src/app/erp/components/rental/RentalAssetModelModals.tsx`, `src/app/erp/components/rental/RentalEditContractModal.tsx`, `src/app/erp/components/rental/RentalSubTabGrids.tsx`, `src/app/erp/components/rental/useRentalTabController.ts`, `src/lib/erpInoutTxService.ts`, `src/lib/erpRentalContractService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 월단가·직접입력 일단가·월단가 30분할 천원 반올림 일단가 산출, 레거시 일단가 판별, 과금 기준 추론 및 가동일수 기반 공급가액 계산을 수행

#### 4.8.36 `src/lib/rentalMaintPartStockTx.ts`
- **규모 / 계층 / 메뉴ID**: 748줄 (26 KB) / `L8_DOMAIN_LIBS` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: `src/lib/rentalMaintenanceSchema.ts`
- **주요 Export 심볼**: `ServiceVehicleLockRow`, `PartStockMovementInput`, `PartTransferInput`, `PartTransferResult`, `lockVehicleRowsOrdered`, `insertPartStockMovementTx`, `applyMaintenancePartsTx`, `reverseMaintenancePartsTx`, `executePartStockTransferTx`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/rentalMaintenanceDomain.ts`, `src/lib/rentalMaintenanceSchema.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/api/erp/rental/vehicle-stocks/route.ts`, `src/lib/rentalMaintenanceTxService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_part_stock_movements`, `erp_rental_maintenance_parts`, `erp_service_vehicles`, `erp_trade_products`, `erp_vehicle_part_stocks` · 시그널 없음
- **핵심 기능 명세**: 렌탈 정비·차량재고 이동 트랜잭션 전용 부품·차량 락 및 UNNEST 기반 일괄 차감·환입·이력 적재 서버 모듈

#### 4.8.37 `src/lib/rentalMaintenanceDomain.ts`
- **규모 / 계층 / 메뉴ID**: 429줄 (13 KB) / `L8_DOMAIN_LIBS` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: `src/lib/rentalMaintenanceSchema.ts`
- **주요 Export 심볼**: `MaintenanceType`, `MaintenanceResultStatus`, `PmChecklistStatus`, `PartStockSource`, `PartTransferType`, `PmDueStatus`, `WearSeverityStatus`, `PmChecklistItem`, `WearComponentDefinition`, `AssetWearConfigItem`, `AssetWearComputedItem`, `AssetWearSummary` 외 20개
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 12`)**: `src/app/api/erp/rental/maintenance/route.ts`, `src/app/api/erp/rental/operating-hours/route.ts`, `src/app/api/erp/rental/vehicle-stocks/route.ts`, `src/app/erp/components/RentalMaintenanceTab.tsx`, `src/app/erp/components/rental-maintenance/HoursWearAndVehicleStockTabs.tsx`, `src/app/erp/components/rental-maintenance/MaintenanceActivitiesAndPmSubTabs.tsx`, `src/app/erp/components/rental-maintenance/RentalMaintActivityModal.tsx`, `src/app/erp/components/rental-maintenance/RentalMaintStockVehicleModals.tsx`, `src/app/erp/components/rental-maintenance/rentalMaintenanceTypes.ts`, `src/lib/rentalMaintPartStockTx.ts`, `src/lib/rentalMaintenanceTxService.ts`, `src/lib/rentalOperatingHoursTxService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 렌탈 장비 정비 유형·점검표·소모품 마모 기준 상수를 정의하고 예방정비 일정(OVERDUE·DUE_SOON) 및 시간 기반 부품 마모도를 계산하는 모듈

#### 4.8.38 `src/lib/rentalMaintenanceSchema.ts`
- **규모 / 계층 / 메뉴ID**: 217줄 (8.8 KB) / `L8_DOMAIN_LIBS` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: `src/lib/rentalMaintenanceDomain.ts`
- **주요 Export 심볼**: `RentalMaintenanceValidationError`, `cleanNumericValue`, `ensureRentalMaintenanceSchema`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftSchemaInit.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 8`)**: `src/app/api/erp/inout/route.ts`, `src/app/api/erp/rental/maintenance/route.ts`, `src/app/api/erp/rental/operating-hours/route.ts`, `src/app/api/erp/rental/vehicle-stocks/route.ts`, `src/app/api/erp/rental/vehicles/route.ts`, `src/lib/rentalMaintPartStockTx.ts`, `src/lib/rentalMaintenanceTxService.ts`, `src/lib/rentalOperatingHoursTxService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_asset_hour_logs`, `erp_asset_wear_states`, `erp_employees`, `erp_part_stock_movements`, `erp_rental_assets`, `erp_rental_maintenance_parts`, `erp_rental_maintenances`, `erp_service_vehicles`, `erp_trade_products`, `erp_vehicle_part_stocks` · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: 정비차량·부품재고·정비이력·가동시간·마모상태 테이블 DDL 멱등 초기화(ensureRentalMaintenanceSchema)와 숫자 정제·검증 오류 클래스를 제공하는 스키마 기반 모듈

#### 4.8.39 `src/lib/rentalMaintenanceTxService.ts`
- **규모 / 계층 / 메뉴ID**: 579줄 (22.7 KB) / `L8_DOMAIN_LIBS` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: `src/lib/rentalMaintPartStockTx.ts`
- **주요 Export 심볼**: `CreateRentalMaintenanceParams`, `UpdateRentalMaintenanceParams`, `normalizeMaintenanceType`, `normalizeMaintenanceResult`, `normalizePartLinesInput`, `createRentalMaintenanceTx`, `updateRentalMaintenanceTx`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/rentalMaintPartStockTx.ts`, `src/lib/rentalMaintenanceDomain.ts`, `src/lib/rentalMaintenanceSchema.ts`, `src/lib/rentalOperatingHoursTxService.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `src/app/api/erp/rental/maintenance/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_asset_hour_logs`, `erp_employees`, `erp_rental_assets`, `erp_rental_maintenance_parts`, `erp_rental_maintenances`, `erp_rental_products`, `erp_service_vehicles` · 시그널 없음
- **핵심 기능 명세**: 렌탈 정비 등록·수정 오케스트레이션, 정비차량·장비 검증 및 rentalMaintPartStockTx 연계 정비이력·예방정비 알림 트랜잭션 서버 서비스 모듈

#### 4.8.40 `src/lib/rentalOperatingHoursTxService.ts`
- **규모 / 계층 / 메뉴ID**: 346줄 (10.9 KB) / `L8_DOMAIN_LIBS` / `RENTAL_MAINTENANCE` / 대칭·연관 쌍: `src/lib/rentalMaintenanceSchema.ts`
- **주요 Export 심볼**: `syncWarrantyOperatingHoursTx`, `applyWearComponentResetsTx`, `recordAssetOperatingHoursTx`, `saveAssetWearConfigTx`
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/rentalMaintenanceDomain.ts`, `src/lib/rentalMaintenanceSchema.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 2`)**: `src/app/api/erp/rental/operating-hours/route.ts`, `src/lib/rentalMaintenanceTxService.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_asset_hour_logs`, `erp_asset_wear_states`, `erp_forklift_warranties`, `erp_rental_assets` · 시그널 없음
- **핵심 기능 명세**: 장비 누적 가동시간 기록, 지게차 보증 가동시간 동기화 및 UNNEST 기반 소모품 마모 상태 일괄 리셋·기준 설정 트랜잭션 서버 서비스 모듈

#### 4.8.41 `src/lib/rentalSchemaInit.ts`
- **규모 / 계층 / 메뉴ID**: 33줄 (1 KB) / `L8_DOMAIN_LIBS` / `RENTAL` / 대칭·연관 쌍: `src/lib/rentalFeeUtils.ts`
- **주요 Export 심볼**: `ensureRentalRateSchema`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 3`)**: `src/app/api/erp/inout/route.ts`, `src/app/api/erp/rental/billings/route.ts`, `src/app/api/erp/rental/contracts/route.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_rental_assets`, `erp_rental_contracts` · 시그널 없음
- **핵심 기능 명세**: erp_rental_contracts.rate_basis 및 erp_rental_assets.current_daily_rate 컬럼을 멱등 추가하는 서버 전용 렌탈 스키마 초기화 모듈

#### 4.8.42 `src/lib/supabaseErp.ts`
- **규모 / 계층 / 메뉴ID**: 35줄 (1.1 KB) / `L8_DOMAIN_LIBS` / `SHARED` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `supabaseErp`, `getErpPool`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 64`)**: `src/app/api/erp/approvals/route.ts`, `src/app/api/erp/approvals/rules/route.ts`, `src/app/api/erp/assets/depreciation/route.ts`, `src/app/api/erp/assets/logs/route.ts`, `src/app/api/erp/assets/route.ts`, `src/app/api/erp/auth/change-password/route.ts`, `src/app/api/erp/auth/login/route.ts`, `src/app/api/erp/auth/session/route.ts`, `src/app/api/erp/bank-matching/route.ts`, `src/app/api/erp/cloud-shares/files/route.ts`, `src/app/api/erp/cloud-shares/route.ts`, `src/app/api/erp/corporate-docs/route.ts`, `src/app/api/erp/departments/route.ts`, `src/app/api/erp/employees/reset-leave/route.ts`, `src/app/api/erp/employees/route.ts`, `src/app/api/erp/employment-contracts/route.ts`, `src/app/api/erp/expenses/route.ts`, `src/app/api/erp/financial-report/route.ts`, `src/app/api/erp/gov-support/route.ts`, `src/app/api/erp/inout/route.ts`, `src/app/api/erp/leaves/route.ts`, `src/app/api/erp/obsidian/route.ts`, `src/app/api/erp/organization/batch/route.ts`, `src/app/api/erp/overtimes/route.ts`, `src/app/api/erp/partners/check-biz-status/route.ts`, `src/app/api/erp/partners/contacts/route.ts`, `src/app/api/erp/partners/route.ts`, `src/app/api/erp/payroll/ocr/route.ts`, `src/app/api/erp/payroll/route.ts`, `src/app/api/erp/permissions/route.ts`, `src/app/api/erp/products/route.ts`, `src/app/api/erp/rental-directory/route.ts`, `src/app/api/erp/rental/assets/route.ts`, `src/app/api/erp/rental/billings/route.ts`, `src/app/api/erp/rental/contracts/route.ts`, `src/app/api/erp/rental/depreciation/route.ts`, `src/app/api/erp/rental/maintenance/route.ts`, `src/app/api/erp/rental/operating-hours/route.ts`, `src/app/api/erp/rental/products/route.ts`, `src/app/api/erp/rental/vehicle-stocks/route.ts`, `src/app/api/erp/rental/vehicles/route.ts`, `src/app/api/erp/services/billings/route.ts`, `src/app/api/erp/services/contracts/route.ts`, `src/app/api/erp/shareholder-registry/route.ts`, `src/app/api/erp/tax-invoices/hometax/route.ts`, `src/app/api/erp/tax-invoices/popbill/route.ts`, `src/app/api/erp/tax-invoices/reconcile/route.ts`, `src/app/api/erp/tax-invoices/route.ts`, `src/app/api/erp/tax-invoices/viewer/route.ts`, `src/app/api/erp/trade/billings/route.ts`, `src/app/api/erp/trade/products/route.ts`, `src/app/api/erp/trade/purchases/route.ts`, `src/app/api/erp/trade/sales/route.ts`, `src/app/api/erp/trade/settlement/route.ts`, `src/app/api/erp/warranties/claims/route.ts`, `src/app/api/erp/warranties/route.ts`, `src/app/api/erp/work-improvements/route.ts`, `src/app/api/share/[code]/download/route.ts`, `src/app/api/share/[code]/route.ts`, `src/lib/erpBankReconcileService.ts`, `src/lib/erpRbacGuard.ts`, `src/lib/erpSecurityAudit.ts`, `src/lib/groqServerKey.ts`, `src/lib/r2ErpVault.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 `HIGH_COUPLING_HUB`
- **핵심 기능 명세**: Supabase 서비스 클라이언트(supabaseErp)와 전역 싱글턴 pg Pool 연결 풀(getErpPool)을 생성·관리하는 서버 전용 DB 접속 모듈

#### 4.8.43 `src/lib/tradeInventoryDomain.ts`
- **규모 / 계층 / 메뉴ID**: 517줄 (16.1 KB) / `L8_DOMAIN_LIBS` / `TRADE` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: `AgingTier`, `AGING_TIER_LABELS`, `TradeInboundProductInput`, `TradeInboundPurchaseEventInput`, `TradeYardReceiptEventInput`, `TradeInventoryLotRow`, `TradeProductInventorySummary`, `TradeInventoryFilterCriteria`, `getTodayKstDateString`, `normalizeDateStr`, `computeElapsedDays`, `resolveAgingTier` 외 6개
- **정방향 의존 (`Out`)**: 내부 import `src/lib/forkliftDomain.ts`, `src/lib/hangulSearch.ts` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 5`)**: `src/app/api/erp/trade/products/route.ts`, `src/app/api/erp/trade/purchases/route.ts`, `src/app/erp/components/TradeTab.tsx`, `src/app/erp/components/trade/TradeInventoryAndProductsSubTabs.tsx`, `src/app/erp/components/trade/tradeHelpers.ts`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 매입전표·주기장입고 기반 Reverse-FIFO 잔여 재고 로트 산출, 입고 경과일수·장기재고 구간 분류 및 다중 조건 재고 필터링을 수행하는 도메인 모듈

#### 4.8.44 `src/types/popbill.d.ts`
- **규모 / 계층 / 메뉴ID**: 5줄 (0.1 KB) / `L8_DOMAIN_LIBS` / `TAX` / 대칭·연관 쌍: `src/lib/popbillService.ts`
- **주요 Export 심볼**: `default (popbill)`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 외부 popbill CommonJS 패키지의 TypeScript 모듈 임포트 타입 체크 통과를 위한 ambient 모듈 선언 파일

### 4.9 `L9_DB_RPA_SCRIPTS` — DB 스키마·마이그레이션·RPA·명세 스크립트 계층 (12개)

대상 범위: schema.sql · scripts/*.cjs

#### 4.9.1 `schema.sql`
- **규모 / 계층 / 메뉴ID**: 320줄 (14.3 KB) / `L9_DB_RPA_SCRIPTS` / `SCHEMA` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `asset_logs`, `assets`, `consumable_items`, `consumable_logs`, `contract_history`, `contracts`, `dispatches`, `document_folders`, `documents`, `employees`, `invoices`, `leave_requests`, `license_activations`, `licenses`, `orders`, `overtimes`, `product_plans`, `products`, `tax_invoices` · 시그널 없음
- **핵심 기능 명세**: 임직원·근태·문서함·렌탈자산·계약·배차·소모품·전표·세금계산서·소프트웨어 주문·라이선스·상품 플랜 등 19개 코어 테이블을 정의하는 PostgreSQL DDL

#### 4.9.2 `scripts/code_file_descriptions.cjs`
- **규모 / 계층 / 메뉴ID**: 71줄 (2 KB) / `L9_DB_RPA_SCRIPTS` / `SHARED` / 대칭·연관 쌍: `scripts/generate_code_file_spec.cjs`
- **주요 Export 심볼**: `LAYERS`, `FILES`
- **정방향 의존 (`Out`)**: 내부 import `scripts/descriptions/serverDescriptions.cjs`, `scripts/descriptions/uiDescriptions.cjs`, `scripts/descriptions/uiSubmoduleDescriptions.cjs` · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: 계층별 분할 사전(uiDescriptions.cjs, uiSubmoduleDescriptions.cjs, serverDescriptions.cjs)을 병합해 www.dragonrpa.co.kr/erp 구성 코드 파일 명세 사전(SSOT)을 내보내는 엔트리 모듈

#### 4.9.3 `scripts/descriptions/serverDescriptions.cjs`
- **규모 / 계층 / 메뉴ID**: 970줄 (43.4 KB) / `L9_DB_RPA_SCRIPTS` / `SHARED` / 대칭·연관 쌍: `scripts/descriptions/uiDescriptions.cjs`
- **주요 Export 심볼**: `SERVER_FILE_DESCRIPTIONS`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `scripts/code_file_descriptions.cjs`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: L6~L9 API 라우트·연계 라우트·도메인 라이브러리·DB/RPA/명세 스크립트 파일의 계층·menuId·연관 쌍·무수식어 기능 명세 사전 모듈

#### 4.9.4 `scripts/descriptions/uiDescriptions.cjs`
- **규모 / 계층 / 메뉴ID**: 431줄 (22.5 KB) / `L9_DB_RPA_SCRIPTS` / `SHARED` / 대칭·연관 쌍: `scripts/descriptions/uiSubmoduleDescriptions.cjs`
- **주요 Export 심볼**: `UI_FILE_DESCRIPTIONS`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `scripts/code_file_descriptions.cjs`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: L1~L3 및 L5 UI 셸·공통 컴포넌트·탭·정적 데이터 계층 파일의 계층·menuId·연관 쌍·무수식어 기능 명세 사전 모듈

#### 4.9.5 `scripts/descriptions/uiSubmoduleDescriptions.cjs`
- **규모 / 계층 / 메뉴ID**: 644줄 (37.9 KB) / `L9_DB_RPA_SCRIPTS` / `SHARED` / 대칭·연관 쌍: `scripts/descriptions/uiDescriptions.cjs`
- **주요 Export 심볼**: `UI_SUBMODULE_DESCRIPTIONS`
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 1`)**: `scripts/code_file_descriptions.cjs`
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: L4 도메인 하위 패널·모달·타입·훅 계층 파일의 계층·menuId·연관 쌍·무수식어 기능 명세 사전 모듈

#### 4.9.6 `scripts/generate_code_file_spec.cjs`
- **규모 / 계층 / 메뉴ID**: 1449줄 (50.4 KB) / `L9_DB_RPA_SCRIPTS` / `SHARED` / 대칭·연관 쌍: `scripts/code_file_descriptions.cjs`
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API `/api/share/[code]`
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB 없음 · 시그널 없음
- **핵심 기능 명세**: TypeScript AST 정·역방향 의존성·Export·DB 테이블·최적화 지표를 추출해 docs/CODE_FILE_SPECIFICATION.md 및 docs/code_file_manifest.json을 생성·검증·조회하는 엔진

#### 4.9.7 `scripts/hometax-rpa-collect.cjs`
- **규모 / 계층 / 메뉴ID**: 566줄 (24.8 KB) / `L9_DB_RPA_SCRIPTS` / `RPA` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_hometax_rpa_settings`, `erp_rental_billings`, `erp_service_billings`, `erp_tax_invoices`, `erp_trade_billings`, `erp_trade_sales` · 시그널 없음
- **핵심 기능 명세**: 다운로드 폴더 홈택스 세금계산서 엑셀·CSV를 파싱해 매입·매출 유형 분류, 수정세금계산서 상계 및 중복 검사 후 erp_tax_invoices에 적재하는 RPA 스크립트

#### 4.9.8 `scripts/init_erp_supabase.cjs`
- **규모 / 계층 / 메뉴ID**: 273줄 (11 KB) / `L9_DB_RPA_SCRIPTS` / `SCHEMA` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_annual_leave_resets`, `erp_asset_depreciation_logs`, `erp_audit_logs`, `erp_employees`, `erp_leave_requests`, `erp_rental_assets`, `erp_rental_billings`, `erp_rental_contracts`, `erp_rental_products`, `erp_service_billings`, `erp_service_contracts`, `erp_tax_invoices`, `erp_trade_products`, `erp_trade_purchases`, `erp_trade_sales` · 시그널 없음
- **핵심 기능 명세**: erp_employees·연차·매매·렌탈·용역·세금계산서·감사로그 등 15개 ERP 초기 테이블 DDL을 실행하고 초기 관리자 계정을 삽입하는 초기화 스크립트

#### 4.9.9 `scripts/migrate_ebro_features.cjs`
- **규모 / 계층 / 메뉴ID**: 169줄 (6.9 KB) / `L9_DB_RPA_SCRIPTS` / `SCHEMA` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_approval_requests`, `erp_approval_rules`, `erp_approval_steps`, `erp_bank_transactions`, `erp_departments`, `erp_employees`, `erp_overtimes`, `erp_payroll_records` · 시그널 없음
- **핵심 기능 명세**: 부서(erp_departments), 사원 확장 컬럼, 결재규칙·결재요청·결재단계, 연장근무, 은행거래 및 급여정산 테이블을 생성·시딩하는 마이그레이션 스크립트

#### 4.9.10 `scripts/migrate_ebro_org.cjs`
- **규모 / 계층 / 메뉴ID**: 82줄 (3.4 KB) / `L9_DB_RPA_SCRIPTS` / `ORG` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_departments`, `erp_employees` · 시그널 없음
- **핵심 기능 명세**: erp_departments 기능 태그와 erp_employees 부서 외래키·프로필 이미지 컬럼을 추가하고 부서 트리 및 직원 department_id를 동기화하는 스크립트

#### 4.9.11 `scripts/migrate_multi_entity.cjs`
- **규모 / 계층 / 메뉴ID**: 74줄 (3.2 KB) / `L9_DB_RPA_SCRIPTS` / `SCHEMA` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_bank_transactions`, `erp_rental_contracts`, `erp_service_contracts`, `erp_tax_invoices`, `erp_trade_purchases`, `erp_trade_sales` · 시그널 없음
- **핵심 기능 명세**: erp_tax_invoices 공급자 정보 컬럼과 매매·렌탈·용역·은행거래 테이블의 사업자 구분(entity_type) 컬럼을 추가·보정하는 마이그레이션 스크립트

#### 4.9.12 `scripts/migrate_permissions.cjs`
- **규모 / 계층 / 메뉴ID**: 117줄 (4.1 KB) / `L9_DB_RPA_SCRIPTS` / `PERMISSIONS` / 대칭·연관 쌍: 없음
- **주요 Export 심볼**: 없음 (진입점/설정/정적파일)
- **정방향 의존 (`Out`)**: 내부 import 없음 · 호출 API 없음
- **역방향 피참조 (`In`, `Fan-In: 0`)**: 없음
- **접근 DB 테이블 / 최적화 시그널**: DB `erp_custom_roles`, `erp_employees`, `erp_role_permissions` · 시그널 없음
- **핵심 기능 명세**: 역할 마스터(erp_custom_roles)·메뉴권한(erp_role_permissions)·사원 role_code 컬럼을 생성하고 5개 기본 역할·권한을 시딩하는 스크립트

---

## 부록 A. ERP 참조 정적 문서 목록 (39종)

`public/docs/` 및 `public/documents/` 하위에 배치되어 ERP 화면에서 조회·임베드하는 정적 HTML·PDF 문서 목록이다.

| 경로 | URL 경로 | 용량(KB) | 참조 ERP 파일 |
| :--- | :--- | :---: | :--- |
| `public/docs/accounting/kgaap/00_재무회계개념체계.pdf` | `/docs/accounting/kgaap/00_재무회계개념체계.pdf` | 520.7 | 없음 |
| `public/docs/accounting/kgaap/99_시행일_및_경과규정.pdf` | `/docs/accounting/kgaap/99_시행일_및_경과규정.pdf` | 172.5 | 없음 |
| `public/docs/accounting/kgaap/제01장_목적_구성_및_적용.pdf` | `/docs/accounting/kgaap/제01장_목적_구성_및_적용.pdf` | 46.2 | 없음 |
| `public/docs/accounting/kgaap/제02장_재무제표의_작성과_표시1.pdf` | `/docs/accounting/kgaap/제02장_재무제표의_작성과_표시1.pdf` | 338.3 | 없음 |
| `public/docs/accounting/kgaap/제03장_재무제표의_작성과_표시2_금융업.pdf` | `/docs/accounting/kgaap/제03장_재무제표의_작성과_표시2_금융업.pdf` | 285.8 | 없음 |
| `public/docs/accounting/kgaap/제04장_연결재무제표.pdf` | `/docs/accounting/kgaap/제04장_연결재무제표.pdf` | 542.8 | 없음 |
| `public/docs/accounting/kgaap/제05장_회계정책_회계추정의_변경_및_오류.pdf` | `/docs/accounting/kgaap/제05장_회계정책_회계추정의_변경_및_오류.pdf` | 108 | 없음 |
| `public/docs/accounting/kgaap/제06장_금융자산_금융부채.pdf` | `/docs/accounting/kgaap/제06장_금융자산_금융부채.pdf` | 731.8 | 없음 |
| `public/docs/accounting/kgaap/제07장_재고자산.pdf` | `/docs/accounting/kgaap/제07장_재고자산.pdf` | 164.5 | 없음 |
| `public/docs/accounting/kgaap/제08장_지분법.pdf` | `/docs/accounting/kgaap/제08장_지분법.pdf` | 290.8 | 없음 |
| `public/docs/accounting/kgaap/제09장_조인트벤처투자.pdf` | `/docs/accounting/kgaap/제09장_조인트벤처투자.pdf` | 1868.2 | 없음 |
| `public/docs/accounting/kgaap/제10장_유형자산.pdf` | `/docs/accounting/kgaap/제10장_유형자산.pdf` | 183.7 | 없음 |
| `public/docs/accounting/kgaap/제11장_무형자산.pdf` | `/docs/accounting/kgaap/제11장_무형자산.pdf` | 146.9 | 없음 |
| `public/docs/accounting/kgaap/제12장_사업결합.pdf` | `/docs/accounting/kgaap/제12장_사업결합.pdf` | 447.3 | 없음 |
| `public/docs/accounting/kgaap/제13장_리스.pdf` | `/docs/accounting/kgaap/제13장_리스.pdf` | 438 | 없음 |
| `public/docs/accounting/kgaap/제14장_충당부채_우발부채_및_우발자산.pdf` | `/docs/accounting/kgaap/제14장_충당부채_우발부채_및_우발자산.pdf` | 204.6 | 없음 |
| `public/docs/accounting/kgaap/제15장_자본.pdf` | `/docs/accounting/kgaap/제15장_자본.pdf` | 192.9 | 없음 |
| `public/docs/accounting/kgaap/제16장_수익.pdf` | `/docs/accounting/kgaap/제16장_수익.pdf` | 362 | 없음 |
| `public/docs/accounting/kgaap/제17장_정부보조금의_회계처리.pdf` | `/docs/accounting/kgaap/제17장_정부보조금의_회계처리.pdf` | 95.9 | 없음 |
| `public/docs/accounting/kgaap/제18장_차입원가자본화.pdf` | `/docs/accounting/kgaap/제18장_차입원가자본화.pdf` | 371.3 | 없음 |
| `public/docs/accounting/kgaap/제19장_주식기준보상.pdf` | `/docs/accounting/kgaap/제19장_주식기준보상.pdf` | 443.4 | 없음 |
| `public/docs/accounting/kgaap/제20장_자산손상.pdf` | `/docs/accounting/kgaap/제20장_자산손상.pdf` | 287.6 | 없음 |
| `public/docs/accounting/kgaap/제21장_종업원급여.pdf` | `/docs/accounting/kgaap/제21장_종업원급여.pdf` | 459.3 | 없음 |
| `public/docs/accounting/kgaap/제22장_법인세회계.pdf` | `/docs/accounting/kgaap/제22장_법인세회계.pdf` | 366.3 | 없음 |
| `public/docs/accounting/kgaap/제23장_환율변동효과.pdf` | `/docs/accounting/kgaap/제23장_환율변동효과.pdf` | 107 | 없음 |
| `public/docs/accounting/kgaap/제24장_보고기간후사건.pdf` | `/docs/accounting/kgaap/제24장_보고기간후사건.pdf` | 94.8 | 없음 |
| `public/docs/accounting/kgaap/제25장_특수관계자_공시.pdf` | `/docs/accounting/kgaap/제25장_특수관계자_공시.pdf` | 144 | 없음 |
| `public/docs/accounting/kgaap/제26장_기본주당이익.pdf` | `/docs/accounting/kgaap/제26장_기본주당이익.pdf` | 346.5 | 없음 |
| `public/docs/accounting/kgaap/제27장_특수활동.pdf` | `/docs/accounting/kgaap/제27장_특수활동.pdf` | 180.9 | 없음 |
| `public/docs/accounting/kgaap/제28장_중단사업.pdf` | `/docs/accounting/kgaap/제28장_중단사업.pdf` | 179.2 | 없음 |
| `public/docs/accounting/kgaap/제29장_중간재무제표.pdf` | `/docs/accounting/kgaap/제29장_중간재무제표.pdf` | 210.8 | 없음 |
| `public/docs/accounting/kgaap/제30장_일반기업회계기준의_최초채택.pdf` | `/docs/accounting/kgaap/제30장_일반기업회계기준의_최초채택.pdf` | 167.6 | 없음 |
| `public/docs/accounting/kgaap/제31장_중소기업_회계처리_특례.pdf` | `/docs/accounting/kgaap/제31장_중소기업_회계처리_특례.pdf` | 227.2 | `src/app/erp/components/GeneralAccountingStandardsTab.tsx` |
| `public/docs/accounting/kgaap/제32장_동일지배거래.pdf` | `/docs/accounting/kgaap/제32장_동일지배거래.pdf` | 286.3 | 없음 |
| `public/docs/accounting/kgaap/제33장_온실가스_배출권과_배출부채.pdf` | `/docs/accounting/kgaap/제33장_온실가스_배출권과_배출부채.pdf` | 177.2 | 없음 |
| `public/docs/accounting/법무부고시_제2013-0029호_중소기업회계기준.pdf` | `/docs/accounting/법무부고시_제2013-0029호_중소기업회계기준.pdf` | 413.5 | `src/app/erp/data/accountingStandardsMeta.ts` |
| `public/docs/accounting/중소기업회계기준_해설_2013_v1.2.pdf` | `/docs/accounting/중소기업회계기준_해설_2013_v1.2.pdf` | 1472.6 | `src/app/erp/data/accountingStandardsMeta.ts` |
| `public/docs/retirement-pension-guide.html` | `/docs/retirement-pension-guide.html` | 23.7 | `src/app/erp/components/RetirementPensionGuideTab.tsx` |
| `public/documents/주주명세서_양식_발급기.html` | `/documents/주주명세서_양식_발급기.html` | 18.8 | 없음 |

---

## 부록 B. 동일 저장소 내 비ERP 제외 파일 경계 (47개)

동일 저장소(`www.dragonrpa.co.kr`) 내 존재하나 `/erp` 진입 셸 및 `/api/erp`·공유·주주명부 의존성 범위 외부에 속하는 공식 홈페이지·라이선스 스토어·스케치 릴레이·배포 정리 파일 목록이다.

| 파일 경로 | 분류 도메인 | 라인 수 | 용량(KB) |
| :--- | :--- | :---: | :---: |
| `scripts/vercel-autopurge.cjs` | Vercel 배포 슬롯 정리 스크립트 | 62 | 1.8 |
| `src/app/about/page.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 386 | 18.9 |
| `src/app/admin/products/AdminProductsClient.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 888 | 37.2 |
| `src/app/admin/products/page.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 13 | 0.4 |
| `src/app/api/contact/route.ts` | 공식 홈페이지·스토어 API | 41 | 1.5 |
| `src/app/api/license/lookup/route.ts` | 라이선스·결제 API | 85 | 2.8 |
| `src/app/api/license/verify/route.ts` | 라이선스·결제 API | 29 | 0.8 |
| `src/app/api/payments/global/webhook/route.ts` | 라이선스·결제 API | 93 | 3 |
| `src/app/api/payments/test-checkout/route.ts` | 라이선스·결제 API | 60 | 1.9 |
| `src/app/api/payments/toss/confirm/route.ts` | 라이선스·결제 API | 88 | 2.6 |
| `src/app/api/products/route.ts` | 공식 홈페이지·스토어 API | 73 | 2.4 |
| `src/app/api/sketch/pull/route.ts` | 스케치 릴레이 API | 67 | 1.8 |
| `src/app/api/sketch/save/route.ts` | 스케치 릴레이 API | 70 | 2.2 |
| `src/app/label-station/LabelStationClient.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 234 | 12.9 |
| `src/app/label-station/page.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 87 | 3.6 |
| `src/app/license-lookup/page.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 374 | 17.3 |
| `src/app/manual-studio/ManualStudioClient.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 681 | 41.1 |
| `src/app/manual-studio/page.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 248 | 12.9 |
| `src/app/page.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 179 | 8.7 |
| `src/app/payment/fail/page.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 69 | 3.1 |
| `src/app/payment/success/page.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 152 | 7 |
| `src/app/portfolio/page.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 615 | 29.4 |
| `src/app/pricing/page.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 6 | 0.1 |
| `src/app/products/ProductsClient.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 554 | 24.9 |
| `src/app/products/page.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 58 | 2.1 |
| `src/app/robots.ts` | 공식 홈페이지·마케팅·스토어 화면 | 35 | 0.7 |
| `src/app/sitemap.ts` | 공식 홈페이지·마케팅·스토어 화면 | 58 | 1.2 |
| `src/app/sketch/route.ts` | 스케치 릴레이 API | 2028 | 76.2 |
| `src/components/About.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 87 | 4.2 |
| `src/components/AdSenseSlot.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 51 | 1.5 |
| `src/components/Contact.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 272 | 12.7 |
| `src/components/Footer.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 137 | 6 |
| `src/components/Header.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 126 | 5 |
| `src/components/Hero.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 118 | 6.5 |
| `src/components/PaymentModal.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 485 | 18.6 |
| `src/components/PublicDataDemo.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 308 | 13.1 |
| `src/components/Solutions.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 120 | 5.4 |
| `src/components/TechStack.tsx` | 공식 홈페이지·마케팅·스토어 화면 | 79 | 3.2 |
| `src/data/companyData.ts` | 공식 홈페이지·마케팅·스토어 화면 | 147 | 8.4 |
| `src/data/portfolioData.ts` | 공식 홈페이지·마케팅·스토어 화면 | 502 | 30.2 |
| `src/lib/emailService.ts` | 라이선스·제품·메일 도메인 서비스 | 340 | 16.3 |
| `src/lib/licenseService.ts` | 라이선스·제품·메일 도메인 서비스 | 311 | 9.2 |
| `src/lib/productService.ts` | 라이선스·제품·메일 도메인 서비스 | 285 | 8.3 |
| `src/scripts/migrate_license_tables.js` | 라이선스·제품·스케치 DB 초기화 스크립트 | 79 | 2.8 |
| `src/scripts/migrate_product_catalog.js` | 라이선스·제품·스케치 DB 초기화 스크립트 | 127 | 5.2 |
| `src/scripts/migrate_sketch_relay.js` | 라이선스·제품·스케치 DB 초기화 스크립트 | 42 | 1.2 |
| `src/scripts/sync_release_db.js` | 라이선스·제품·스케치 DB 초기화 스크립트 | 35 | 1 |
