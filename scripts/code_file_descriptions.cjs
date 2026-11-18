"use strict";

/**
 * www.dragonrpa.co.kr/erp 구성 코드 파일 계층 분류 및 기능 명세 사전 (SSOT)
 * - 헌장 1.4조(1단어 1뜻 단일 의미), 1.5조(코드 명세 SSOT), 3.1조(무수식어 건조한 명사·동사 표준) 준수
 * - 15.3.1조 비대 모듈 분할 기준에 따라 uiDescriptions / serverDescriptions로 분리 후 병합 내보내기
 */

const { UI_FILE_DESCRIPTIONS } = require("./descriptions/uiDescriptions.cjs");
const { UI_SUBMODULE_DESCRIPTIONS } = require("./descriptions/uiSubmoduleDescriptions.cjs");
const { SERVER_FILE_DESCRIPTIONS } = require("./descriptions/serverDescriptions.cjs");

const LAYERS = [
  {
    key: "L1_SHELL_SECURITY",
    label: "진입 셸 및 보안 가드 계층",
    dirHint: "src/app/erp/ · src/middleware.ts · ClientSecurityGuard",
  },
  {
    key: "L2_UI_SHARED",
    label: "공통 UI 컴포넌트 계층",
    dirHint: "src/app/erp/components/*",
  },
  {
    key: "L3_UI_TABS",
    label: "메뉴 탭 화면 계층",
    dirHint: "src/app/erp/components/*Tab.tsx",
  },
  {
    key: "L4_UI_SUBMODULES",
    label: "도메인 하위 패널·모달·타입 계층",
    dirHint: "src/app/erp/components/<domain>/*",
  },
  {
    key: "L5_STATIC_DATA",
    label: "회계기준 정적 데이터 계층",
    dirHint: "src/app/erp/data/*",
  },
  {
    key: "L6_API_ROUTES",
    label: "백엔드 API 라우트 및 집계 엔진 계층",
    dirHint: "src/app/api/erp/**",
  },
  {
    key: "L7_LINKED_ROUTES",
    label: "외부 공유·주주명부 연계 라우트 계층",
    dirHint: "src/app/share/** · src/app/shareholder-registry/**",
  },
  {
    key: "L8_DOMAIN_LIBS",
    label: "공통 도메인·보안·연동 라이브러리 계층",
    dirHint: "src/lib/* · src/types/*",
  },
  {
    key: "L9_DB_RPA_SCRIPTS",
    label: "DB 스키마·마이그레이션·RPA·명세 스크립트 계층",
    dirHint: "schema.sql · scripts/*.cjs",
  },
];

const FILES = {
  ...UI_FILE_DESCRIPTIONS,
  ...UI_SUBMODULE_DESCRIPTIONS,
  ...SERVER_FILE_DESCRIPTIONS,
};

module.exports = {
  LAYERS,
  FILES,
};
