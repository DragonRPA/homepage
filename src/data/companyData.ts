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
  slogan: "기업의 인적자원은 반복적인 사무에 국한되기에는 너무나 중요합니다. 우리는 고객의 가치창출에 기여하는 것에 자부심을 느낍니다.",
  foundingMotto: "기업의 인적자원은 반복적인 사무에 국한되기에는 너무나 중요합니다. 우리는 고객의 가치창출에 기여하는 것에 자부심을 느낍니다.",
  missionStatement: "최대 편리함과 담당자의 노력 대비 효과와 이익(효익)을 합쳐서, 최대 편익에 이르는 시스템 개발이 우리의 목적이다.",
  establishedYear: "2026",
  email: "contact@dragonrpa.co.kr",
  businessNumber: "105-86-XXXXX",
  address: "대한민국 서울특별시 / 경기도 성남시 판교테크노밸리",
  leaderProfile: {
    title: "고객 가치 창출과 실무 중심의 비즈니스 파트너",
    summary: "기업의 인적자원은 반복적인 단순 사무에 국한되기에는 너무나 소중합니다. 현장의 고충을 깊이 이해하고, 실무자가 진짜 필요로 하는 시스템을 구축하여 고객사의 소중한 인재들이 본원적 가치 창출에 집중할 수 있도록 돕고 함께 성장해 나가겠습니다.",
    keyStrengths: [
      "반복적인 단순 사무를 자동화하여 본원적 가치 업무에 집중할 수 있는 환경 지원",
      "현장 실무자의 눈높이에 맞춘 불필요한 번복 입력 최소화 및 업무 편익 극대화",
      "데이터의 정합성과 투명성을 지키는 안정적인 시스템 구축",
      "고객사의 비즈니스 상황과 성장에 발맞추는 신뢰할 수 있는 동반 파트너십",
    ],
  },
  coreValues: [
    {
      title: "On-Site Practical Design",
      name: "현장 중심의 실무 설계",
      desc: "현장의 업무 흐름과 고충에 귀 기울여 실무자가 실제로 쓰기 편한 시스템을 만듭니다.",
    },
    {
      title: "Data Integrity & Transparency",
      name: "투명한 데이터와 신뢰성",
      desc: "데이터의 정합성과 이력 추적성을 성실히 관리하여 믿을 수 있는 비즈니스 환경을 지원합니다.",
    },
    {
      title: "Collaborative Growth",
      name: "고객사와 함께하는 동반 성장",
      desc: "일방적인 공급에 그치지 않고 고객사의 상황에 귀 기울이며 함께 고민하고 함께 발전해 나갑니다.",
    },
    {
      title: "Practical & High-Utility Standard",
      name: "군더더기 없는 실용적 표준",
      desc: "불필요한 과장이나 복잡성을 덜어내고, 실무자에게 실질적인 도움과 효익을 주는 화면을 구성합니다.",
    },
  ],
};

export const BUSINESS_PILLARS: BusinessPillar[] = [
  {
    id: "rental-erp",
    number: "01",
    title: "범용 산업 렌탈/자산 ERP & 현장 PTT 음성 비서",
    subtitle: "현장 실무 중심 15대 렌탈 라이프사이클 통합 기간계 & 모바일 PWA",
    category: "엔터프라이즈 ERP",
    description: "산업 장비 렌탈 비즈니스의 견적/수주 ➔ 출고검수 ➔ 배차 ➔ 회수 ➔ 정비 ➔ 정산/대사 전 과정을 현장 실무자의 눈높이에 맞추어 체계적으로 지원합니다.",
    highlights: [
      "외감법 내부회계관리제도 기준 부서별 직무 분리(SoD) 및 전자산-후장비 1:1 감사 추적성(Audit Trail)",
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
      "Nuitka C 기계어 컴파일 27.97MB 단일 무설치 매뉴얼 제작 도구 (Manual Studio)",
      "C# .NET 10 NativeAOT 기반 Cloudflare R2 원본 선별 고속 다운로더 (Easy Down)",
      "C언어 기반 장비 라벨 사진 S/N 및 제품키 0.05초 초고속 OCR 추출 엔진",
      "대기업 사내 PC/SSD/BSOD 장애 유형별 1-Click 해결 가이드 지식 포털 (Enterprise PC Wiki)",
    ],
    techStack: ["Nuitka C Compiler", "PyQt5", "python-pptx", "C# .NET 10 NativeAOT", "C (Pure Native)", "Win32 GDI"],
    portfolioLinks: [
      { name: "매뉴얼 스튜디오", url: "/manual-studio" },
      { name: "Easy Down R2 다운로더", url: "/portfolio" },
      { name: "Enterprise PC Wiki", url: "/portfolio" },
      { name: "Lenovo Serial Extractor", url: "/portfolio" },
    ],
  },
];
