# Release Notes

## [v0.2.2.Build.1] - 2026-08-27 19:01

### 🔌 Neon PostgreSQL 실시간 100% 연동 백엔드 API 체계 구축 (Zero Local Mock)
- **로컬 시드/Mock 데이터 전면 제거**: 프론트엔드의 하드코딩 Mock 데이터를 완전 폐기하고 **실제 원격 Neon PostgreSQL DB와 100% 실시간 동기화**
- **서버리스 백엔드 API 라우트 구축**:
  - `/api/erp/auth/login`: Neon DB `employees` 테이블 실시간 인증
  - `/api/erp/auth/change-password`: Neon DB 비밀번호 실시간 업데이트
  - `/api/erp/employees`: 실제 DB 임직원 목록 조회(GET), 운영자 신규 계정 발급(POST - 초기비번 1111), 비밀번호 1111 초기화(PATCH)
  - `/api/erp/leaves`: Neon DB 휴가 신청(POST), 목록(GET), 결재 승인/반려(PATCH)
  - `/api/erp/overtimes`: Neon DB 초과근무 자율 등록(POST) 및 목록(GET)
  - `/api/erp/assets`, `/api/erp/consumables`: Neon DB 자산 및 소모품 실시간 조회
- **보안 격리**: DB 접속 문자열 및 시크릿 키는 클라이언트(브라우저)에 노출되지 않고 **Next.js 백엔드 서버사이드 환경변수(`DATABASE_URL`)에서만 격리 실행**

## [v0.2.1.Build.1] - 2026-08-27 18:58
## [v0.2.0.Build.1] - 2026-08-27 18:54
## [v0.1.4.Build.1] - 2026-08-27 18:48
## [v0.1.3.Build.1] - 2026-08-27 18:45
## [v0.1.2.Build.1] - 2026-08-27 18:21
## [v0.1.1.Build.1] - 2026-08-27 17:56
## [v0.1.0.Build.1] - 2026-08-27 15:56