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
  slogan: "18년 코스피 상장 렌탈사 도메인 전문성과 지능형 비즈니스 자동화의 융합",
  missionStatement: "최대 편리함과 담당자의 노력 대비 효과와 이익(효익)을 합쳐서, 최대 편익에 이르는 시스템 개발이 우리의 목적이다.",
  establishedYear: "2026",
  email: "contact@dragonrpa.co.kr",
  businessNumber: "105-86-XXXXX",
  address: "대한민국 서울특별시 / 경기도 성남시 판교테크노밸리",
  leaderProfile: {
    title: "18년 코스피(KOSPI) 상장 렌탈사 경력의 도메인 마스터",
    summary: "특정 장비군에 국한되지 않고 산업장비, 건설기계, 물류설비, IT자산 등 렌탈 비즈니스 전 영역의 라이프사이클(계약, 자산 운용, PDI 검수, 배차 물류, 정비, 매출 청구, 회계 대사)을 18년간 코스피 상장 렌탈사에서 직접 지휘·경험한 도메인 최고 전문가가 모든 시스템 아키텍처를 직접 설계합니다.",
    keyStrengths: [
      "코스피 상장 종합 렌탈사 18년 실무·관리 총괄 경험 기반의 완전무결한 비즈니스 룰 정립",
      "장비/제품군을 초월한 범용 산업 렌탈 15대 라이프사이클 체인 표준화",
      "대차 교체 시 계약 속성 100% 자동 상속 및 단일 EXCHANGE 배차 1건 발행 원칙 수립",
      "자산별 매출 기여액 정밀 일할 집계 및 무누락 1:1 대차대조 회계 아키텍처 설계",
    ],
  },
  coreValues: [
    {
      title: "18-Year Rental Domain Authority",
      name: "18년 상장 렌탈사 도메인 전문성",
      desc: "단순 코딩이 아닌 코스피 상장 렌탈사 18년 실무 통찰로 자산 흐름과 현장 라이프사이클을 100% 완벽히 일치시킵니다.",
    },
    {
      title: "Domain Penetration Test (WTT 20x)",
      name: "20회 관통 스트레스 검증",
      desc: "현장 물리적 마찰과 이해관계를 20회 이상 스트레스 주입하여 날짜·수지·상태의 3대 보존 법칙을 오차 없이 확정합니다.",
    },
    {
      title: "Zero-Adjective Dry Standard",
      name: "무수식어 건조 UI 헌장",
      desc: "감성적 미사여구를 배제하고 숙련된 실무자를 위한 극도의 정보 밀도와 1-Way 동선(Gutenberg Z-패턴)을 구현합니다.",
    },
    {
      title: "Zero-Secret Isolation",
      name: "완벽 격리 보안 아키텍처",
      desc: "프론트엔드 키 노출 0건, 서버사이드 CUD 동기 검증 및 무음 실패 방지(Zero Silent Failures)를 준수합니다.",
    },
  ],
};

export const BUSINESS_PILLARS: BusinessPillar[] = [
  {
    id: "rental-erp",
    number: "01",
    title: "범용 산업 렌탈/자산 ERP & 현장 PTT 음성 비서",
    subtitle: "건설장비/산업기계/특수설비 15대 렌탈 라이프사이클 통합 기간계 & 모바일 PWA",
    category: "엔터프라이즈 ERP",
    description: "18년 코스피 상장 렌탈사 실무 노하우를 집대성하여, 특정 장비군에 국한되지 않고 모든 산업 렌탈 비즈니스의 견적/수주 ➔ 출고검수(RENTED 자동전환) ➔ 단일 EXCHANGE 배차 ➔ 회수/입고 ➔ 주기장 정비/벌점복원 ➔ 정산/대사 전 체인을 무누락 통합 관리합니다.",
    highlights: [
      "18년 렌탈 도메인 통찰 기반 15대 라이프사이클 Handover ToDo 바통 터치 체계",
      "대차/교체 시 최초 계약 단가/청구일 100% 자동 상속 및 단일 EXCHANGE 1건 발행",
      "무전기 PTT 실시간 음성 통신망 & 도로명 6단계 역추적 현장 AS 내비게이션",
      "5인 기업 올인원 8대 모듈 사내 포털 & 2단계 결재선 시스템 (DragonERP)",
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
      "국세청 표준 양식 100% 일치 법인차량 운행기록부 월별 분할 엑셀 자동화 (AutoLog Tax)",
      "Zebra ZPL II 노코드 비주얼 캔버스 디자이너 & 블루투스 스캐너 1초 무인 출력 (LabelPrintStation)",
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
      "통화 음성 실시간 WASAPI Loopback / Whisper STT 전사 및 고장 분류 (Space Advisor)",
      "로컬 무료 SLM(Qwen 2.5) 온디바이스 서빙 기반 출장 A/S 자동 스케줄링",
      "MiniMax H3 (Hailuo DiT) & SageAttention v2 가속 기반 텍스트-투-비디오 (Video Create Studio)",
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
      "대기업 사내 PC/SSD/BSOD 장애 유형별 1-Click 해결 가이드 지식 포털 (Enterprise PC Wiki)",
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
