/**
 * 한글 초성 검색 및 내비게이션식 자음 매칭 유틸리티 (ebro-awp SSOT 이식 + 다중 토큰 통합검색 지원)
 *
 * 기능:
 * 1. 순수 초성 검색: 'ㅇㅈㅇ' -> '이정용', 'ㅅㅅ' -> '삼성물산', 'ㅍㅌ' -> '평택'
 * 2. 혼합 초성 검색: '기ㅇ' -> '기연리프트', '삼성ㅁㅅ' -> '삼성물산'
 * 3. 복자음 분해: 'ㅄ' -> 'ㅂㅅ'
 * 4. 다중 토큰 통합검색: 'ㅅㅅ 3219' -> 고객사/모델명/자산번호 조합 매칭
 * 5. 완성형/영문/숫자 검색: 대소문자 무시
 */

export const CHOSUNG_LIST: readonly string[] = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/**
 * 한글 복자음(겹받침) 11종 -> 기본 초성 자음 2자 분해 매핑 테이블
 */
export const COMPLEX_CONSONANT_MAP: Record<string, string> = {
  "ㄳ": "ㄱㅅ",
  "ㄵ": "ㄴㅈ",
  "ㄶ": "ㄴㅎ",
  "ㄺ": "ㄹㄱ",
  "ㄻ": "ㄹㅁ",
  "ㄼ": "ㄹㅂ",
  "ㄽ": "ㄹㅅ",
  "ㄾ": "ㄹㅌ",
  "ㄿ": "ㄹㅍ",
  "ㅀ": "ㄹㅎ",
  "ㅄ": "ㅂㅅ",
};

export function decomposeComplexConsonants(text: string): string {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += COMPLEX_CONSONANT_MAP[char] || char;
  }
  return result;
}

export const HANGUL_BASE = 0xac00;
export const HANGUL_END = 0xd7a3;

export function isHangulSyllable(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_END;
}

export function isChosungChar(char: string): boolean {
  return CHOSUNG_LIST.includes(char) || char in COMPLEX_CONSONANT_MAP;
}

export function getChosung(char: string): string {
  if (!isHangulSyllable(char)) return COMPLEX_CONSONANT_MAP[char] || char;
  const code = char.charCodeAt(0);
  const chosungIndex = Math.floor((code - HANGUL_BASE) / (21 * 28));
  return CHOSUNG_LIST[chosungIndex] || char;
}

export function extractChosung(text: string): string {
  if (!text) return "";
  const decomposed = decomposeComplexConsonants(text);
  let res = "";
  for (let i = 0; i < decomposed.length; i++) {
    res += getChosung(decomposed[i]);
  }
  return res;
}

const regexCache = new Map<string, RegExp>();

export function createHangulSearchRegex(query: string): RegExp {
  const cleanQuery = decomposeComplexConsonants(query.trim());
  if (!cleanQuery) return /(?:)/;

  if (regexCache.has(cleanQuery)) {
    return regexCache.get(cleanQuery)!;
  }

  let pattern = "";
  for (let i = 0; i < cleanQuery.length; i++) {
    const char = cleanQuery[i];
    const chosungIdx = CHOSUNG_LIST.indexOf(char);

    if (chosungIdx >= 0) {
      const startCode = HANGUL_BASE + chosungIdx * 588;
      const endCode = HANGUL_BASE + (chosungIdx + 1) * 588 - 1;
      pattern += `[${String.fromCharCode(startCode)}-${String.fromCharCode(endCode)}${char}]`;
    } else {
      pattern += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }

  const regex = new RegExp(pattern, "i");
  if (regexCache.size > 200) {
    const firstKey = regexCache.keys().next().value;
    if (firstKey) regexCache.delete(firstKey);
  }
  regexCache.set(cleanQuery, regex);
  return regex;
}

const CHOSUNG_SET = new Set(CHOSUNG_LIST);

export function containsChosung(text: string): boolean {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (CHOSUNG_SET.has(char) || char in COMPLEX_CONSONANT_MAP) {
      return true;
    }
  }
  return false;
}

export interface HangulMatcher {
  (target?: string | number | null): boolean;
  test: (target?: string | number | null) => boolean;
  testAny: (targets: Array<string | number | null | undefined>) => boolean;
}

function testSingleToken(cleanQuery: string, lowerQuery: string, hasChosung: boolean, regex: RegExp | null, cleanTarget: string): boolean {
  if (cleanTarget.toLowerCase().includes(lowerQuery)) return true;
  if (!hasChosung) return false;
  const targetChosung = extractChosung(cleanTarget);
  if (targetChosung.includes(cleanQuery)) return true;
  return regex ? regex.test(cleanTarget) : false;
}

/**
 * 검색어를 1회 전처리/컴파일하여 대량 데이터 반복 검색에 최적화된 고속 매처 생성
 * - 단일 검색어 및 공백 구분 다중 토큰('ㅅㅅ 3219') AND 통합검색 지원
 */
export function createHangulMatcher(query?: string | null): HangulMatcher {
  if (!query || !query.trim()) {
    const alwaysTrue = (() => true) as HangulMatcher;
    alwaysTrue.test = () => true;
    alwaysTrue.testAny = () => true;
    return alwaysTrue;
  }

  const rawTrimmed = query.trim();
  const cleanQuery = decomposeComplexConsonants(rawTrimmed);
  const lowerQuery = cleanQuery.toLowerCase();
  const hasChosung = containsChosung(cleanQuery);
  const regex = hasChosung ? createHangulSearchRegex(cleanQuery) : null;

  const tokens = rawTrimmed
    .split(/\s+/)
    .map((t) => decomposeComplexConsonants(t.trim()))
    .filter(Boolean)
    .map((t) => {
      const hasCh = containsChosung(t);
      return {
        clean: t,
        lower: t.toLowerCase(),
        hasChosung: hasCh,
        regex: hasCh ? createHangulSearchRegex(t) : null,
      };
    });

  const test = (target?: string | number | null): boolean => {
    if (target === null || target === undefined) return false;
    const strTarget = typeof target === "string" ? target : String(target);
    if (!strTarget.trim()) return false;
    const cleanTarget = strTarget.trim();

    if (testSingleToken(cleanQuery, lowerQuery, hasChosung, regex, cleanTarget)) {
      return true;
    }

    if (tokens.length > 1) {
      return tokens.every((tk) =>
        testSingleToken(tk.clean, tk.lower, tk.hasChosung, tk.regex, cleanTarget)
      );
    }

    return false;
  };

  const testAny = (targets: Array<string | number | null | undefined>): boolean => {
    if (!targets || targets.length === 0) return false;
    const nonEmpty = targets
      .map((t) => (t === null || t === undefined ? "" : String(t).trim()))
      .filter(Boolean);
    if (nonEmpty.length === 0) return false;

    for (let i = 0; i < nonEmpty.length; i++) {
      if (testSingleToken(cleanQuery, lowerQuery, hasChosung, regex, nonEmpty[i])) {
        return true;
      }
    }

    if (tokens.length > 1) {
      return tokens.every((tk) =>
        nonEmpty.some((fld) => testSingleToken(tk.clean, tk.lower, tk.hasChosung, tk.regex, fld))
      );
    }

    return false;
  };

  const matcher = ((target?: string | number | null) => test(target)) as HangulMatcher;
  matcher.test = test;
  matcher.testAny = testAny;
  return matcher;
}

export function matchHangul(
  target?: string | number | null,
  query?: string | null
): boolean {
  if (!query || !query.trim()) return true;
  if (target === null || target === undefined) return false;
  return createHangulMatcher(query).test(target);
}

export function matchHangulAny(
  targets: Array<string | number | null | undefined>,
  query?: string | null
): boolean {
  if (!query || !query.trim()) return true;
  if (!targets || targets.length === 0) return false;
  return createHangulMatcher(query).testAny(targets);
}

export const CHOSUNG_FILTER_LIST = [
  "전체", "ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ", "기타",
] as const;

export type ChosungFilterOption = (typeof CHOSUNG_FILTER_LIST)[number];

export function extractCleanCompanyName(name?: string | null): string {
  if (!name) return "";
  return name
    .replace(/주식회사|\(주\)|㈜|\(유\)|유한회사|\(합\)|합자회사|사단법인|재단법인/gi, "")
    .replace(/[\s\(\)\[\]._\-]/g, "")
    .trim();
}

export function getCleanLeadingChosung(name?: string | null): string {
  const clean = extractCleanCompanyName(name);
  if (!clean) return "";
  const firstChar = clean[0];
  const ch = getChosung(firstChar);
  if (ch === "ㄲ") return "ㄱ";
  if (ch === "ㄸ") return "ㄷ";
  if (ch === "ㅃ") return "ㅂ";
  if (ch === "ㅆ") return "ㅅ";
  if (ch === "ㅉ") return "ㅈ";
  return ch;
}

export function matchesChosungFilter(
  name?: string | null,
  selectedChosung?: string
): boolean {
  if (!selectedChosung || selectedChosung === "전체" || selectedChosung === "ALL") return true;
  const lead = getCleanLeadingChosung(name);
  if (selectedChosung === "기타" || selectedChosung === "ETC") {
    const standardConsonants: readonly string[] = [
      "ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
    ];
    return !standardConsonants.includes(lead);
  }
  return lead === selectedChosung;
}

function getLeadingScriptPriority(str: string): number {
  if (!str) return 3;
  const ch = str[0];
  if (isHangulSyllable(ch) || isChosungChar(ch)) return 0;
  if (/[A-Za-z]/.test(ch)) return 1;
  if (/[0-9]/.test(ch)) return 2;
  return 3;
}

export function compareCustomerNames(
  nameA?: string | null,
  nameB?: string | null
): number {
  const strA = (nameA || "").trim();
  const strB = (nameB || "").trim();
  const cleanA = extractCleanCompanyName(strA);
  const cleanB = extractCleanCompanyName(strB);

  const prioA = getLeadingScriptPriority(cleanA);
  const prioB = getLeadingScriptPriority(cleanB);
  if (prioA !== prioB) return prioA - prioB;

  return (
    cleanA.localeCompare(cleanB, "ko", { numeric: true, sensitivity: "base" }) ||
    strA.localeCompare(strB, "ko", { numeric: true, sensitivity: "base" })
  );
}

export function sortCustomersByName<T extends { name?: string | null }>(
  customers: T[]
): T[] {
  if (!customers || customers.length <= 1) return customers || [];
  return [...customers].sort((a, b) => compareCustomerNames(a?.name, b?.name));
}
