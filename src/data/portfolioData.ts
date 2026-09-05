export interface ProjectCapture {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  aspectRatio?: string;
}

export interface PortfolioProject {
  id: string;
  title: string;
  subtitle: string;
  category: "ERP" | "RPA" | "AI" | "UTILITY";
  categoryName: string;
  period: string;
  clientOrTarget: string;
  techStack: string[];
  links?: {
    demo?: string;
    github?: string;
    docs?: string;
  };
  summaryMarkdown: string;
  captures: ProjectCapture[];
}

export const PORTFOLIO_CATEGORIES = [
  { id: "ALL", name: "전체" },
  { id: "ERP", name: "엔터프라이즈 ERP" },
  { id: "RPA", name: "지능형 RPA" },
  { id: "AI", name: "AI & 음성인식" },
  { id: "UTILITY", name: "엔지니어링 & 유틸리티" },
] as const;

export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: "ebro-rental-erp",
    title: "e-Bro (기연리프트 렌탈 ERP & PTT 음성 비서)",
    subtitle: "고소작업대 렌탈 전 생애주기 15대 체인 통합 ERP 및 현장 PTT 음성 비서 시스템",
    category: "ERP",
    categoryName: "엔터프라이즈 ERP",
    period: "2026.08 ~ 2026.09",
    clientOrTarget: "(주)기연리프트 전사 도입",
    techStack: ["React 19", "Vite", "Supabase", "Groq Whisper STT", "Workers AI", "Node.js SEA", "Gutenberg Z-Pattern"],
    links: {
      docs: "docs/e_Bro_Manual.md",
    },
    summaryMarkdown: `
### 1. 기획 의도 및 배경
- **현장과 사무실의 극심한 단절 해소**: 고소작업대 렌탈 현장은 분진과 소음 속에서 장갑을 낀 채 일하는 정비사, 운전 중 배차 전화를 받는 배차원, 수백 장의 계산서와 통장을 대사하는 경리 간 업무 단절이 극심했습니다.
- **"입으로" 끝내는 지능형 업무 (e-Bro)**: 키보드를 칠 수 없는 이동/현장 상황에서도 *"판교 현대건설에 3219 5대 내일 아침 8시 출고"*라고 말하면 계약서, 배차의뢰서, 검수요청서가 즉시 자동 조립되는 시스템을 기획했습니다.

### 2. 핵심 비즈니스 효익
- **15대 렌탈 전 생애주기 무누락 통합**: 견적/수주 ➔ 출고배정 ➔ 출고검수(RENTED 자동전환) ➔ 단일 EXCHANGE 배차 ➔ 회수/입고 ➔ 정비/벌점복원 ➔ 정산/대사 전 체인 100% 무누락 추적.
- **업무 처리 시간 85% 단축**: 수동 배차/계약 입력 15분 ➔ 음성 1문장 입력 시 3초 이내 전산 자동 등록.
- **도메인 관통 스트레스 테스트 (WTT 20회) 무결점 통과**: 날짜 보존, 수지 보존, 상태 보존의 3대 보존 법칙 완벽 검증.

### 3. 주요 기능 구성
1. **PC 웹 관리자 30개 메뉴**: Gutenberg Z-패턴 4단계 동선 기반 고밀도 1:1 대사 그리드 및 카드형 마스터-디테일 스튜디오.
2. **현장 모바일 17개 전용 화면 (PWA)**: 무전기 PTT 실시간 음성 통신망, 도로명 6단계 역추적 AS 접수, 자산 QR 스캔.
3. **로컬 사이드카 에이전트 (SEA)**: 엑셀 COM 자동화 기반 14p 무손실 통합 계약팩 0초 다이렉트 출력 및 문서고 보존.
`,
    captures: [
      {
        id: "ebro-cap-1",
        title: "PC 웹 관리자 대시보드 & 15대 렌탈 라이프사이클 관제",
        description: "고소작업대 가동 현황, 출고대기, 배차 체인 및 미수금 현황을 한눈에 조망하는 직무별 대시보드",
      },
      {
        id: "ebro-cap-2",
        title: "현장 모바일 PTT 음성 업무 비서 & AS 접수 화면",
        description: "현장에서 음성으로 출고를 의뢰하고 도로명 상세 주소를 6단계로 역추적하는 모바일 실행 뷰",
      },
      {
        id: "ebro-cap-3",
        title: "단일 EXCHANGE 배차 대장 & 1:1 대사 스튜디오",
        description: "대차 교체 시 왕복 운송비를 1건으로 통합 정산하고 전자산/후장비 바통을 승계하는 배차 원장",
      },
    ],
  },
  {
    id: "dragon-erp",
    title: "DragonERP (사내 올인원 8대 모듈 ERP & 그룹웨어)",
    subtitle: "5인 기업 전용 8대 업무 모듈 올인원 ERP 및 3단계 권한/2단계 결재선 시스템",
    category: "ERP",
    categoryName: "엔터프라이즈 ERP",
    period: "2026.08 ~ 2026.09",
    clientOrTarget: "DragonRPA 사내 기간계 시스템",
    techStack: ["Next.js 15", "TypeScript", "Tailwind CSS", "Neon Serverless PostgreSQL", "Cloudflare R2"],
    links: {
      demo: "/erp",
    },
    summaryMarkdown: `
### 1. 기획 의도 및 배경
- **소규모 고효율 기업을 위한 군더더기 없는 올인원 시스템**: 파편화된 외부 솔루션(근태 툴, 문서함, 회계 엑셀)을 단 하나의 서버리스 아키텍처로 통합.
- **무수식어 건조 UI 헌장 표준 적용**: 불필요한 미사여구와 설명 문장을 전면 배제하고 숙련된 실무자를 위한 극도의 정보 밀도 구축.

### 2. 핵심 비즈니스 효익
- **Zero-Secret 보안 격리**: 프론트엔드에 어떤 DB 키나 자격증명도 남기지 않고 Next.js 백엔드 서버사이드에서만 Neon PostgreSQL 실시간 CUD 통신.
- **자동 공제 근태 & 자율 초과근무 체계**: 근로기준법 12대 휴가 지원, 주말/공휴일 자동 공제 계산기 및 2단계 결재선.
- **F5 새로고침 100% 세션 복원**: 새로고침 시에도 방금 보던 업무 탭(근태, 매출, 자산 등)이 그대로 유지.

### 3. 주요 기능 구성
1. **8대 핵심 업무 메뉴**: 경영관리(사원대장/권한), 매출관리(세금계산서), 매입관리, 근태관리(연차/초과근무), 자산재고, 소모품재고, 파일관리(R2 EDMS), 이메일.
2. **사원별 연차 정밀 집계**: 부여 연차, 사용 연차, 잔여 연차 실시간 산출 및 1열 [상세 ➔] 연차 사용 이력 모달.
3. **월별 초과근무 조회 필터**: YYYY-MM 셀렉터를 통한 월간 초과근무 시간 합계 및 목록 정렬.
`,
    captures: [
      {
        id: "dragon-erp-cap-1",
        title: "2-컬럼 사이드바 및 경영관리 사원 대장",
        description: "8대 업무 메뉴와 사원별 부여/사용/잔여 연차 집계 및 비밀번호 초기화 관리 화면",
      },
      {
        id: "dragon-erp-cap-2",
        title: "근태관리 연차 신청 & 월별 초과근무 대장",
        description: "주말/공휴일 자동 공제 휴가 신청서 및 월별 초과근무 시간 집계 필터 뷰",
      },
    ],
  },
  {
    id: "universal-rpa-recorder",
    title: "Universal RPA Recorder & UIA Spy Studio",
    subtitle: "Windows UIA 3.0 네이티브 엘리먼트 스파이 및 범용 웹/데스크톱 RPA 시나리오 녹화 스튜디오",
    category: "RPA",
    categoryName: "지능형 RPA",
    period: "2026.07 ~ 2026.08",
    clientOrTarget: "범용 웹/데스크톱 업무 자동화 솔루션",
    techStack: ["Python", "PyQt5", "Windows UI Automation (UIA 3.0)", "Playwright", "SEH Exception Guard"],
    links: {
      docs: "Universal_RPA_Recorder/README.md",
    },
    summaryMarkdown: `
### 1. 기획 의도 및 배경
- **복잡한 코딩 없는 실무자용 노코드 RPA 시나리오 생성**: 사내 레거시 ERP, 웹 포털, 윈도우 C/S 프로그램 등 모든 타겟에서 실시간 조작을 캡처하여 표준 실행 규격으로 변환하는 독립 스튜디오 구축.
- **Windows UIA 3.0 네이티브 하이라이팅**: DOM 구조가 없는 데스크톱 앱에서도 마우스 정지 0.1초 디바운스를 통해 컨트롤을 정확히 식별.

### 2. 핵심 비즈니스 효익
- **1회 셋업 vs 반복 루프 분할 오케스트레이션**: 로그인/페이지 진입 등 1회 실행부와 엑셀 행별 반복 실행부를 원클릭 카드로 분리 재배치.
- **SEH 5중 예외 방어 엔진**: UIA 핸들 누수와 윈도우 충돌을 원천 차단하여 24시간 무중단 녹화 안정성 확보.
- **변수 템플릿 원클릭 치환**: 고정 입력값을 \`{{계약번호}}\`, \`{{자산코드}}\` 등의 템플릿 변수로 즉시 매핑.

### 3. 주요 기능 구성
1. **라이브 액션 카드 생성기**: 클릭, 텍스트 입력, 더블클릭, 파일 첨부, 엔터 키 입력 실시간 타임라인 카드 렌더링.
2. **F2 단일화 요소 저장소**: 스파이 모드에서 F2 키로 선택한 UI 요소를 영구 저장소에 보관 및 재활용.
3. **표준 JSON 내보내기/불러오기**: 생성된 시나리오를 \`scenario.json\`으로 저장하여 RPA 러너에서 즉시 무인 실행.
`,
    captures: [
      {
        id: "rpa-rec-cap-1",
        title: "RPA 녹화 스튜디오 메인 작업 화면",
        description: "브라우저 실시간 액션 캡처 및 1회 실행/반복 루프 카드 분할 편집 패널",
      },
      {
        id: "rpa-rec-cap-2",
        title: "Windows UIA 3.0 엘리먼트 스파이 & 속성 인스펙터",
        description: "윈도우 네이티브 컨트롤의 AutomationId, ControlType, BoundingRectangle 정밀 스니핑 화면",
      },
    ],
  },
  {
    id: "autolog-tax",
    title: "AutoLog Tax (법인차량 운행기록부 자동작성 솔루션)",
    subtitle: "국세청 표준 양식 100% 일치 업무용승용차 운행기록부 월별 분할 엑셀 자동 생성 서비스",
    category: "RPA",
    categoryName: "지능형 RPA",
    period: "2026.08",
    clientOrTarget: "법인 차량 운용 기업 세무/회계 실무자",
    techStack: ["Next.js 15", "TypeScript", "Tailwind CSS", "ExcelJS", "GitHub Actions CI/CD"],
    links: {
      demo: "https://dragonrpa.github.io/AutoLog_Tax/",
    },
    summaryMarkdown: `
### 1. 기획 의도 및 배경
- **매년 반복되는 법인차량 운행기록부 수동 작성 고통 해소**: 국세청 제출용 양식은 계기판 수치, 출퇴근 거리, 업무사용비율이 1km의 오차도 없이 맞아야 비용 처리가 인정됩니다.
- **수학적 무결성 분배 알고리즘 구축**: 시작/종료 계기판 거리와 출퇴근 거리를 기반으로 실제 운행 패턴과 유사한 통계적 난수 분배를 자동 수행하는 웹 서비스 개발.

### 2. 핵심 비즈니스 효익
- **국세청 양식 100% 완벽 재현**: 노란색 셀 수식(12번 업무용 사용거리, 13번 업무사용비율 = 12/11*100%) 및 월별 시트 분할 생성.
- **출퇴근 60% 엄격 / 40% 가변(±15%) 정밀 제어**: 출퇴근 주행거리를 우선 확보한 후 잔여 거리를 일반 평일에 자연스럽게 분산.
- **특수 장거리 출장 & 공휴일 0km 연동**: 지방 출장 고정 반영 및 법정공휴일/휴가일 100% 자동 운행 제외.

### 3. 주요 기능 구성
1. **사업자/차량 정보 입력 폼**: 상호, 사업자번호, 차종, 차량번호, 유종, 운전자 입력.
2. **기간/거리 제어 패널**: 시작/종료 계기판, 일일 출퇴근 거리, 최소/최대 주행거리 한계선 설정.
3. **월별 엑셀 1-Click 다운로드**: \`exceljs\` 엔진 기반 브라우저 즉시 엑셀 생성 (서버 업로드 불필요).
`,
    captures: [
      {
        id: "autolog-cap-1",
        title: "AutoLog Tax 운행기록부 작성 메인 화면",
        description: "사업자 정보, 계기판 수치, 출퇴근 거리 제어 및 특수 출장 일정 등록 패널",
      },
      {
        id: "autolog-cap-2",
        title: "국세청 표준 양식 엑셀 출력 결과물",
        description: "월별 시트 자동 분할 및 12번 업무거리, 13번 업무비율 수식이 연동된 엑셀 파일",
      },
    ],
  },
  {
    id: "label-print-station",
    title: "Label Print Station (ZPL 라벨 디자이너 & 무인 출력 스테이션)",
    subtitle: "Zebra ZPL II 캔버스 비주얼 서식 디자이너 & 블루투스 스캐너 1초 무인 다이렉트 출력 시스템",
    category: "RPA",
    categoryName: "지능형 RPA",
    period: "2026.07 ~ 2026.08",
    clientOrTarget: "물류 주기장 및 자산 라벨 출력 관리자",
    techStack: ["React", "Vite", "TypeScript", "Zebra ZPL II", "Web Bluetooth", "Local SEA Agent"],
    links: {
      docs: "LabelPrintStation/MANUAL.md",
    },
    summaryMarkdown: `
### 1. 기획 의도 및 배경
- **현장 라벨 출력의 비효율 타파**: PC 앞에 앉아 서식을 찾고 일일이 번호를 입력해 인쇄 버튼을 누르는 과정을 없애고자 함.
- **Zero-Focus 무인 바코드 스캔 출력**: 화면 어디를 클릭해 두었든 무선 블루투스 스캐너로 자산 바코드를 찍는 즉시 0.1초 만에 식별하여 Zebra 프린터로 1초 만에 라벨 출력.

### 2. 핵심 비즈니스 효익
- **노코드 ZPL 캔버스 비주얼 디자이너**: ZPL 코드를 몰라도 캔버스에서 텍스트, 바코드, QR코드, 박스를 드래그하여 서식 디자인 및 즉시 ZPL 변환.
- **엑셀 대량 업로드 일괄 출력**: 엑셀 파일을 업로드 영역에 끌어다 놓으면 컬럼 순서와 무관하게 수백 장 라벨 연속 출력.
- **RPA 무인 등록 에이전트 연동**: 바코드 스캔 시 사내 기간계 시스템에 입고/수정/출고를 브라우저 백그라운드 RPA로 자동 등록.

### 3. 주요 기능 구성
1. **라벨 서식 디자인 스튜디오**: 규격별(72x40mm, 50x25mm 등) 실시간 미리보기 및 ZPL 코드 양방향 동기화.
2. **로컬 프린트 에이전트**: 로컬 9988 포트 데몬을 통한 USB/네트워크 Zebra 프린터 무지연 다이렉트 소켓 전송.
3. **스키마 빌더 & 관리자 잠금**: 노코드 XPath 엘리먼트 피커 및 4자리 핀번호 관리자 잠금 모드.
`,
    captures: [
      {
        id: "label-cap-1",
        title: "ZPL 라벨 서식 비주얼 캔버스 디자이너",
        description: "텍스트, QR코드, 바코드 요소를 드래그하여 디자인하고 ZPL을 실시간 렌더링하는 작업대",
      },
      {
        id: "label-cap-2",
        title: "무선 블루투스 스캐너 1초 무인 출력 스테이션",
        description: "바코드 스캔 즉시 자산 정보를 조회하고 프린터로 0초 전송하는 실시간 출력 모니터",
      },
    ],
  },
  {
    id: "space-advisor",
    title: "Space Advisor (고객센터 실시간 STT 상담 비서 & 스케줄링)",
    subtitle: "고객 통화 음성 실시간 Whisper STT 전사 및 고장 원인/자가조치 스크립트 AI 추천 CRM",
    category: "AI",
    categoryName: "AI & 음성인식",
    period: "2026.08",
    clientOrTarget: "고객센터 저숙련 상담사 및 현장 출장 정비팀",
    techStack: ["FastAPI", "SQLAlchemy 2.0", "Supabase PostgreSQL", "Ollama LLM", "WASAPI Loopback STT", "React PWA"],
    links: {
      docs: "Space_consult_assist/README.md",
    },
    summaryMarkdown: `
### 1. 기획 의도 및 배경
- **신입/저숙련 상담사의 고난도 기술 상담 대응 지원**: 고소작업대 고장 증상은 수백 가지에 달하여 초보 상담사가 원인을 파악하고 자가조치법을 안내하기 어렵습니다.
- **통화 중 실시간 AI 어시스트**: 고객과 통화하는 도중 AI가 음성을 실시간 전사하여 고장 유형을 분류하고, 즉시 따라 읽을 수 있는 셀프조치 스크립트를 화면에 제시.

### 2. 핵심 비즈니스 효익
- **불필요한 현장 출동 40% 절감**: 전화 통화 상에서 배터리 차단기, 비상정지 버튼, 유압 레버 등 1차 자가조치 성공률 극대화.
- **출장 A/S 일정 원스톱 자동 접수**: 전화 통화 중 확인된 현장 주소, 증상, 장비 모델을 기반으로 정비사 스케줄 자동 배정.
- **로컬 SLM 온디바이스 서빙**: 외부 API 비용 없는 무료 로컬 LLM(Ollama Qwen 2.5) 기반 실시간 분류 및 요약.

### 3. 주요 기능 구성
1. **상담사 데스크톱 뷰 (\`/counsel\`)**: 실시간 음성 인식 타임라인 및 문제 해결 솔루션 카드 자동 팝업.
2. **현장 정비사 모바일 PWA (\`/mobile\`)**: 출장 접수 내역 실시간 푸시, T-Map 연동 길안내, 고객 전자서명.
3. **지능형 장애 유형 분류 엔진**: 과거 수천 건의 수리 데이터베이스와 매뉴얼 기반 고장 원인 추론.
`,
    captures: [
      {
        id: "space-cap-1",
        title: "실시간 통화 STT 및 AI 자가조치 스크립트 추천 화면",
        description: "고객 통화 음성을 실시간 전사하고 고장 해결 가이드를 즉시 노출하는 상담사 콘솔",
      },
      {
        id: "space-cap-2",
        title: "현장 정비사 모바일 출장 스케줄 & 전자서명 PWA",
        description: "현장 도착 후 점검 항목 체크 및 고객 서명을 받아 완료 처리하는 모바일 화면",
      },
    ],
  },
  {
    id: "video-create-studio",
    title: "Video Create Studio (MiniMax H3 / AI 비디오 제작 스튜디오)",
    subtitle: "MiniMax H3 (Hailuo DiT) 및 Blackwell/RTX GPU 가속 기반 텍스트-투-비디오 자동 생성 스튜디오",
    category: "AI",
    categoryName: "AI & 음성인식",
    period: "2026.08",
    clientOrTarget: "AI 영상 제작 및 마케팅 미디어 크리에이터",
    techStack: ["Python", "MiniMax H3 DiT", "ComfyUI Headless API", "SageAttention v2", "FFmpeg", "PyQt5"],
    links: {
      docs: "Video_Create_Studio/README.md",
    },
    summaryMarkdown: `
### 1. 기획 의도 및 배경
- **고품질 오픈소스 멀티모달 영상 모델의 로컬 독립 실행**: 클라우드 구독 비용 없이 로컬 GPU(RTX 3060~4090 / Blackwell)에서 원클릭으로 720p 24fps 영상을 생성하는 독립 스튜디오 구축.
- **SageAttention v2 가속 노드 주입**: 복잡한 비디오 DiT 연산 시간을 35~40% 대폭 단축.

### 2. 핵심 비즈니스 효익
- **프롬프트 자동 리파이너 (SLM 연동)**: 짧은 한 줄 아이디어를 MiniMax H3 규격의 고품질 마크다운 디렉팅 프롬프트로 자동 확장.
- **하드웨어별 VRAM 프로파일 자동 최적화**: 12GB ECO(FP8 Scaled)부터 24GB HIGH(BF16)까지 원클릭 하드웨어 프로파일 전환.
- **원클릭 후처리 파이프라인**: 생성된 영상에 FFmpeg 기반 오디오 재합성, 노이즈 필터링, MP4 최적화 일괄 집행.

### 3. 주요 기능 구성
1. **데스크톱 GUI 스튜디오**: 텍스트 입력 ➔ 프롬프트 리파이닝 ➔ 렌더링 큐 ➔ 실시간 프리뷰.
2. **ComfyUI Headless 워크플로우 엔진**: 백그라운드에서 데몬 형태로 워크플로우를 주입하고 진행률 모니터링.
3. **멀티 씬 스토리보드 생성기**: 여러 컷으로 구성된 시나리오를 순차 렌더링하여 하나의 완성본 영상으로 병합.
`,
    captures: [
      {
        id: "video-cap-1",
        title: "Video Create Studio 데스크톱 작업 환경",
        description: "프롬프트 입력, VRAM 하드웨어 프로파일 선택 및 렌더링 큐 오케스트레이션 패널",
      },
      {
        id: "video-cap-2",
        title: "MiniMax H3 DiT 생성 비디오 렌더링 프리뷰",
        description: "SageAttention v2 가속으로 생성된 고화질 비디오 결과물 및 오디오 합성 뷰어",
      },
    ],
  },
  {
    id: "easy-down",
    title: "Easy Down (Cloudflare R2 초고속 원본 선별 다운로더)",
    subtitle: "대용량 클라우드 버킷 계층 탐색 및 원하는 파일/폴더 선별 고속 다운로드 C# NativeAOT 유틸리티",
    category: "UTILITY",
    categoryName: "엔지니어링 & 유틸리티",
    period: "2026.08",
    clientOrTarget: "Cloudflare R2 대용량 아카이브 관리자",
    techStack: ["C# .NET 10", "NativeAOT", "Cloudflare R2 S3 REST API", "Win32 GUI", "Zero Dependency"],
    links: {
      docs: "Easy_Down/README.md",
    },
    summaryMarkdown: `
### 1. 기획 의도 및 배경
- **대용량 클라우드 스토리지의 선별 다운로드 부재 해결**: 수십 GB에 달하는 R2 버킷 전체를 동기화하지 않고, 원하는 폴더나 파일만을 탐색하여 즉시 다운로드하는 초경량 네이티브 도구 필요.
- **무설치 제로 디펜던시 (NativeAOT)**: 런타임(.NET, Python) 설치 없이 더블클릭 0초 만에 구동되는 단일 바이너리(5.7MB) 제공.

### 2. 핵심 비즈니스 효익
- **초고속 CDN & S3 SigV4 하이브리드 파이프라인**: 대용량 파일은 Public CDN 직접 스트리밍, 비공개 파일은 AWS SigV4 REST S3 API로 자동 폴백.
- **네이티브 윈도우 탐색기 UX**: SysTreeView32 폴더 트리와 SysListView32 체크박스 목록 기반으로 수천 개 파일을 랙 없이 고속 브라우징.
- **설정 영구 보존**: 자격증명과 최근 다운로드 경로를 암호화하여 로컬에 안전하게 보존.
`,
    captures: [
      {
        id: "easydown-cap-1",
        title: "Easy Down 네이티브 계층 탐색기 화면",
        description: "Cloudflare R2 버킷의 폴더 트리 및 파일 체크박스 선별 다운로드 대화상자",
      },
    ],
  },
  {
    id: "hanwha-wiki-pc",
    title: "HanWha PC Wiki (하드웨어/BSOD 트러블슈팅 지식베이스)",
    subtitle: "대기업 사내 PC, SSD, 블루스크린(BSOD) 장애 유형별 1-Click 해결 가이드 지식 포털",
    category: "UTILITY",
    categoryName: "엔지니어링 & 유틸리티",
    period: "2026.07 ~ 2026.08",
    clientOrTarget: "사내 IT 헬프데스크 및 임직원 자가 조치용",
    techStack: ["Node.js", "JavaScript", "Markdown Knowledge Base", "HTML5", "CSS3"],
    links: {
      docs: "HanWha_Wiki_PC/README.md",
    },
    summaryMarkdown: `
### 1. 기획 의도 및 배경
- **사내 IT 헬프데스크 반복 문의 부하 70% 감소**: PC 부팅 불가, SSD 인식 오류, 블루스크린(BSOD) 코드 등 빈번한 장애 유형을 누구나 1분 만에 따라 할 수 있도록 표준화된 위키 지식베이스 구축.
- **증상 기반 역방향 인덱싱**: 에러 코드나 비프음, 화면 증상만 검색해도 최적의 단계별 해결책 즉시 제시.

### 2. 핵심 비즈니스 효익
- **10대 핵심 하드웨어 장애 전수 매뉴얼화**: RAM 접촉 불량, 파워서플라이 전압 강하, 그래픽카드 드라이버 충돌 등 해결 가이드 완비.
- **SSD 펌웨어 및 데이터 복구 절차서**: 제조사별(삼성, SK하이닉스, 마이크론 등) 전용 진단 툴 및 복구 절차 내장.
`,
    captures: [
      {
        id: "hanwha-cap-1",
        title: "HanWha PC Wiki 메인 지식베이스 포털",
        description: "하드웨어 장애, SSD 트러블슈팅, BSOD 에러 코드 검색 및 단계별 해결 가이드 화면",
      },
    ],
  },
  {
    id: "doctogether-mailer",
    title: "Doctogether Bulk Mailer (기부금영수증 & 대량 커스텀 메일러)",
    subtitle: "엑셀 데이터 기반 소득세법 제45호의2 기부금영수증 Word 자동 생성 및 맞춤형 대량 이메일 발송",
    category: "UTILITY",
    categoryName: "엔지니어링 & 유틸리티",
    period: "2026.06 ~ 2026.07",
    clientOrTarget: "사단법인 및 비영리단체 후원 관리팀",
    techStack: ["Python", "OpenPyXL", "Python-docx", "SMTP SSL", "Email Template Engine"],
    links: {
      docs: "MailSender_Doctogether/README.md",
    },
    summaryMarkdown: `
### 1. 기획 의도 및 배경
- **연말정산 기부금영수증 수동 발급 인력 낭비 제거**: 수백 명의 후원자에게 법정 양식(소득세법 시행규칙 별지 제45호의2)에 맞춘 Word/PDF 문서를 개별 생성하고 맞춤 메일로 발송하는 전 과정을 1-Click 자동화.

### 2. 핵심 비즈니스 효익
- **엑셀 ➔ 서식 100% 매핑**: 후원자명, 주민등록번호, 기부일자, 금액, 단체 직인을 Word 템플릿에 자동 주입.
- **대량 SMTP 분할 발송**: 스팸 필터 차단을 방지하기 위한 지능형 발송 딜레이 및 실패 건 자동 재시도 큐.
`,
    captures: [
      {
        id: "mailer-cap-1",
        title: "Doctogether 대량 메일러 및 기부금영수증 생성기",
        description: "엑셀 명단 업로드 및 소득세법 표준 기부금영수증 Word 일괄 생성/발송 콘솔",
      },
    ],
  },
  {
    id: "lenovo-serial-extractor",
    title: "Lenovo Serial Extractor (C언어 비전 OCR 시리얼/라이선스 추출기)",
    subtitle: "장비 라벨 이미지에서 시리얼 번호와 윈도우 정품 라이선스 키를 0.05초 만에 크롭/추출하는 C 유틸리티",
    category: "UTILITY",
    categoryName: "엔지니어링 & 유틸리티",
    period: "2026.09",
    clientOrTarget: "대량 PC/노트북 입고 검수 및 자산 등록팀",
    techStack: ["C (Pure Native)", "Windows GDI", "Ollama Vision / Tesseract", "Batch Processing"],
    links: {
      docs: "레노버시리얼/README.md",
    },
    summaryMarkdown: `
### 1. 기획 의도 및 배경
- **수백 대의 노트북 라벨 사진 일일이 타이핑하는 작업 제거**: 노트북 바닥면 라벨 사진을 폴더에 넣으면 시리얼 번호(S/N)와 윈도우 제품키(Product Key) 영역을 초고속으로 자동 크롭하고 텍스트로 추출하여 엑셀/CSV로 출력.

### 2. 핵심 비즈니스 효익
- **순수 C언어 초경량 네이티브 엔진**: 무거운 딥러닝 런타임 없이 0.05초 만에 이미지 영역 분할 및 OCR 전처리 완료.
- **자산 등록 시간 95% 단축**: 100대 PC 검수 시 수동 2시간 ➔ 1분 이내 엑셀 원장 자동 완성.
`,
    captures: [
      {
        id: "lenovo-cap-1",
        title: "초경량 비전 시리얼/라이선스 추출 콘솔",
        description: "장비 라벨 사진 일괄 크롭 및 텍스트 OCR 추출 파이프라인 실행 화면",
      },
    ],
  },
];
