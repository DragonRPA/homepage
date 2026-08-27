# Release Notes

## [v0.1.0.Build.1] - 2026-08-27 15:56

### 🚀 신규 기능 및 페이지 구축 (New Features)
- **Next.js 15 App Router & Tailwind CSS 기반 공식 홈페이지 초기 구축**
- **Header**: 기업 로고(DragonRPA), 반응형 네비게이션 및 `erp.dragonrpa.co.kr` 바로가기 버튼
- **Hero**: 엔터프라이즈 RPA & 공공데이터 연계 표준 비전, 실시간 시스템 아키텍처 터미널 프리뷰
- **About**: 회사 개요 및 전사 시스템 개발 헌장 3대 가치(효과적 자산운용, 무누락 DB 기록, 최소조작 최대편익)
- **Solutions**: 3대 솔루션 포트폴리오 (RPA 프로세스 자동화, 렌탈 자산/배차 ERP, 공공데이터 API 파이프라인)
- **PublicDataDemo**: 국가 공공데이터포털(data.go.kr) 실시간 연동 인터랙티브 쇼케이스
  - 국세청 사업자등록 상태조회 API 시뮬레이터 (계속사업자/과세유형 판별 및 JSON 응답 뷰어)
  - 기상청 단기예보 & 건설/장비 현장 안전 판정 시뮬레이터
- **TechStack**: Cloudflare Global Edge, R2 Storage(`drcf`), PostgreSQL, SPF/DKIM/DMARC 메일 보안 체계
- **Contact**: 전사 표준 세로 스택 레이아웃 기반 도입 상담 접수 폼 및 유효성 검사
- **Footer**: 기업 식별 정보, 공식 이메일 (`contact@dragonrpa.co.kr`), 법적 고지 및 저작권
- **API Handler**: 상담 접수 수신 백엔드 엔드포인트 (`/api/contact`)