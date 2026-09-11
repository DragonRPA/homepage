export interface BusinessPillar {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  highlights: string[];
  techStack: string[];
  portfolioLinks?: { name: string; url?: string }[];
}

export interface TechnicalCore {
  title: string;
  subtitle: string;
  description: string;
  points: string[];
}

export const COMPANY_INFO = {
  nameKr: "(주)드래곤알피에이",
  nameEn: "DragonRPA Co., Ltd.",
  ceo: "이정용",
  domain: "dragonrpa.co.kr",
  slogan: "최소의 조작으로 최대의 편익을 — 지능형 비즈니스 자동화 & 기간계 ERP 솔루션",
  missionStatement: "최대 편리함과 담당자의 노력 대비 효과와 이익(효익)을 합쳐서, 최대 편익에 이르는 시스템 개발이 우리의 목적이다.",
  establishedYear: "2026",
  email: "contact@dragonrpa.co.kr",
  businessNumber: "105-86-XXXXX",
  address: "대한민국 서울특별시 / 경기도 성남시 판교테크노밸리",
  coreValues: [
    {
      title: "Zero-Adjective Dry Standard",
      name: "무수식어 건조 UI 헌장",
      desc: "감성적 미사여구를 배제하고 숙련된 실무자를 위한 극도의 정보 밀도와 1-Way 동선(Gutenberg Z-패턴)을 구현합니다.",
    },
    {
      title: "Domain Penetration Test (WTT)",
      name: "20회 관통 스트레스 검증",
      desc: "단순 정상 흐름을 넘어 현장의 물리적 마찰과 이해관계를 20회 이상 스트레스 주입하여 3대 보존 법칙을 입증합니다.",
    },
    {
      title: "Zero-Secret Isolation",
      name: "완벽 격리 보안 아키텍처",
      desc: "프론트엔드 키 노출 0건, 서버사이드 CUD 동기 검증 및 무음 실패 방지(Zero Silent Failures)를 준수합니다.",
    },
    {
      title: "Hybrid Performance Core",
      name: "초경량 네이티브 하이브리드",
      desc: "Serverless PostgreSQL + C#/C NativeAOT + 온디바이스 SLM/STT의 최적 결합으로 0초대 반응성을 달성합니다.",
    },
  ],
};

export const BUSINESS_PILLARS: BusinessPillar[] = [
  {
    id: "rental-erp",
    number: "01",
    title: "특화 렌탈/자산 ERP & 현장 PTT 음성 비서",
    subtitle: "고소작업대/건설장비 15대 라이프사이클 통합 기간계 & 모바일 PWA",
    category: "엔터프라이즈 ERP",
    description: "견적/수주부터 출고검수(RENTED 자동전환), 단일 EXCHANGE 배차, 입고정비 및 감가상각/월말대사까지 전 생애주기를 무누락 추적하고, 현장에서 '입으로' 말하면 1초 만에 전표가 자동 조립되는 지능형 ERP를 공급합니다.",
    highlights: [
      "15대 렌탈 라이프사이클 관통 및 Handover ToDo 바통 터치 체계",
      "무전기 PTT 실시간 음성 통신망 & 도로명 6단계 역추적 AS 내비게이션",
      "단일 EXCHANGE 1건 발행 기반 왕복 운송비 통합 대사 및 전자산-후장비 승계",
      "5인 기업 올인원 8대 모듈 사내 포털 & 2단계 결재선 시스템",
    ],
    techStack: ["React 19", "Vite", "Supabase", "Neon Serverless PostgreSQL", "Groq Whisper STT", "Workers AI", "Node.js SEA"],
    portfolioLinks: [
      { name: "e-Bro 차세대 렌탈 ERP", url: "https://kiyeun-lift.vercel.app" },
      { name: "DragonERP 사내 포털", url: "/erp" },
    ],
  },
  {
    id: "intelligent-rpa",
    number: "02",
    title: "지능형 RPA & 노코드 시나리오 스튜디오",
    subtitle: "Windows UIA 3.0 네이티브 스파이 & 국세청/물류 무인 자동화",
    category: "지능형 RPA",
    description: "사내 레거시 ERP, 웹 포털, 윈도우 C/S 프로그램 등 모든 타겟에서 실시간 조작을 캡처하여 표준 JSON 규격으로 변환하고, 1초 무인 바코드 출력 및 국세청 표준 엑셀을 자동 생성하는 노코드 자동화 생태계를 구축합니다.",
    highlights: [
      "Windows UIA 3.0 네이티브 엘리먼트 스파이 & SEH 5중 예외 방어 엔진",
      "국세청 표준 양식 100% 일치 법인차량 운행기록부 월별 분할 엑셀 자동화",
      "Zebra ZPL II 노코드 비주얼 캔버스 디자이너 & 블루투스 스캐너 1초 무인 출력",
      "1회 셋업부 vs 반복 루프 분할 오케스트레이션 및 변수 템플릿 치환",
    ],
    techStack: ["Python", "PyQt5", "Windows UIA 3.0", "Next.js 15", "ExcelJS", "Zebra ZPL II", "Web Bluetooth"],
    portfolioLinks: [
      { name: "AutoLog Tax 운행기록부", url: "https://dragonrpa.github.io/AutoLog_Tax/" },
      { name: "Label Print Station", url: "https://dragonrpa.github.io/LabelPrintStation/" },
      { name: "Universal RPA Recorder", url: "/portfolio" },
    ],
  },
  {
    id: "generative-ai",
    number: "03",
    title: "생성형 AI & 온디바이스 음성/멀티모달",
    subtitle: "실시간 Whisper STT 상담 비서 & MiniMax H3 비디오 독립 스튜디오",
    category: "AI & 음성인식",
    description: "고객 통화 음성을 실시간 전사하여 고장 원인과 자가조치 스크립트를 즉시 추천하는 AI 컨택센터 CRM과, 로컬 GPU 가속 기반으로 고품질 영상을 원클릭 생성하는 멀티모달 DiT 독립 실행 스튜디오를 개발합니다.",
    highlights: [
      "통화 음성 실시간 WASAPI Loopback / Whisper STT 전사 및 고장 분류",
      "로컬 무료 SLM(Qwen 2.5) 온디바이스 서빙 기반 출장 A/S 자동 스케줄링",
      "MiniMax H3 (Hailuo DiT) & SageAttention v2 가속 기반 텍스트-투-비디오",
      "VRAM 12GB~24GB 하드웨어 프로파일 자동 전환 및 FFmpeg 후처리 파이프라인",
    ],
    techStack: ["FastAPI", "Ollama LLM", "Whisper STT", "MiniMax H3 DiT", "ComfyUI Headless API", "SageAttention v2"],
    portfolioLinks: [
      { name: "Space Advisor CRM", url: "/portfolio" },
      { name: "Video Create Studio", url: "/portfolio" },
    ],
  },
  {
    id: "system-engineering",
    number: "04",
    title: "초경량 시스템 엔지니어링 & 네이티브 유틸리티",
    subtitle: "C# NativeAOT 5.7MB 단일 바이너리 & C언어 초고속 비전 OCR",
    category: "엔지니어링 & 유틸리티",
    description: "무거운 런타임 없이 더블클릭 0초 만에 구동되는 순수 네이티브 단일 실행 파일(.exe)과 대규모 IT 헬프데스크 지식베이스, 소득세법 기부금영수증 대량 발송 솔루션을 엔지니어링합니다.",
    highlights: [
      "C# .NET 10 NativeAOT 기반 Cloudflare R2 원본 선별 고속 다운로더 (Easy Down)",
      "C언어 기반 장비 라벨 사진 S/N 및 제품키 0.05초 초고속 OCR 추출 엔진",
      "대기업 사내 PC/SSD/BSOD 장애 유형별 1-Click 해결 가이드 지식 포털",
      "소득세법 제45호의2 기부금영수증 Word 서식 자동 매핑 및 대량 SMTP 발송",
    ],
    techStack: ["C# .NET 10 NativeAOT", "C (Pure Native)", "Win32 GDI", "OpenPyXL", "Python-docx", "Cloudflare R2"],
    portfolioLinks: [
      { name: "Easy Down R2 다운로더", url: "/portfolio" },
      { name: "Enterprise PC Wiki", url: "/portfolio" },
      { name: "Lenovo Serial Extractor", url: "/portfolio" },
    ],
  },
];
