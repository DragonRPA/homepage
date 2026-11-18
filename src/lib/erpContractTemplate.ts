/**
 * 계약 품목명/청구명/세금계산서 비고 치환식(Template Expression) 컨텍스트
 */
export interface ContractTemplateContext {
  /** 기준 일자 ('YYYY-MM-DD') 또는 정산 연월 ('YYYY-MM') */
  dateStr?: string | null;
  /** 계약/청구의 품목 명세 배열 (taxItems) */
  items?: Array<{ itemName?: string | null }>;
  /** taxItems가 비어있거나 1번째 품목명이 없을 때 사용할 대체 1번째 아이템명 (예: 모델명, 상품명, 프로젝트명) */
  fallbackFirstItem?: string | null;
}

/**
 * 계약 품목명/비고 치환식 평가 헬퍼
 * - 규칙 1: 문자열에 중괄호 `{...}` 치환식이 없으면 절대 치환하지 않고 원문 그대로 반환
 * - 규칙 2: `{yymm}`, `{yyyymm}`, `{yyyy-mm}`, `{yy-mm}`, `{yyyy}`, `{yy}`, `{mm}`, `{dd}` 날짜 치환 지원
 * - 규칙 3: `{1번째 아이템}`, `{첫번째 아이템}`, `{firstItem}`, `{item}`, `{품목}` 치환 지원
 * - 규칙 4: 템플릿에 `"{1번째 아이템} 외"` 형태가 있을 때, 아이템 개수가 1개 이하이면 뒤의 `" 외"`를 자동 제거하고, 2개 이상이면 `" 외"` 유지
 */
export function resolveContractItemTemplate(
  template: string | null | undefined,
  ctx: ContractTemplateContext = {}
): string {
  if (template === null || template === undefined) return "";
  const rawTemplate = String(template);
  // 품목명에 {} 가 없으면 절대 치환 안 함
  if (!/\{[^}]+\}/.test(rawTemplate)) {
    return rawTemplate;
  }

  // 1. 날짜(연월일) 파싱
  const now = new Date();
  const digits = String(ctx.dateStr || "").replace(/[^0-9]/g, "");
  const yyyy = digits.length >= 4 ? digits.slice(0, 4) : String(now.getFullYear());
  const yy = yyyy.slice(2, 4);
  const mm = digits.length >= 6 ? digits.slice(4, 6) : String(now.getMonth() + 1).padStart(2, "0");
  const dd = digits.length >= 8 ? digits.slice(6, 8) : String(now.getDate()).padStart(2, "0");

  const replaceDateTokens = (str: string): string =>
    str
      .replace(/\{yymm\}/gi, `${yy}${mm}`)
      .replace(/\{yyyymm\}/gi, `${yyyy}${mm}`)
      .replace(/\{yyyy-mm\}/gi, `${yyyy}-${mm}`)
      .replace(/\{yy-mm\}/gi, `${yy}-${mm}`)
      .replace(/\{yyyy\.mm\}/gi, `${yyyy}.${mm}`)
      .replace(/\{yy\.mm\}/gi, `${yy}.${mm}`)
      .replace(/\{yyyy\}/gi, yyyy)
      .replace(/\{yy\}/gi, yy)
      .replace(/\{mm\}/gi, mm)
      .replace(/\{dd\}/gi, dd);

  // 2. 유효 아이템 목록 및 1번째 아이템 파악
  const validItems = (ctx.items || []).filter(
    (it) => it && it.itemName && String(it.itemName).trim() !== ""
  );
  const itemCount =
    validItems.length > 0 ? validItems.length : ctx.fallbackFirstItem ? 1 : 0;

  // 1번째 아이템 원문 추출 (만약 1번째 아이템 자체가 '{1번째 아이템}' 자기참조라면 fallbackFirstItem 사용)
  let firstItemRaw = validItems[0]?.itemName?.trim() || "";
  const selfRefPattern = /^\{(1번째\s*아이템|첫번째\s*아이템|1번째\s*품목|첫번째\s*품목|firstItem|item|품목)\}(\s*외)?$/i;
  if (!firstItemRaw || selfRefPattern.test(firstItemRaw)) {
    firstItemRaw = (ctx.fallbackFirstItem || "").trim();
  }
  const firstItemResolved = replaceDateTokens(firstItemRaw);

  // 3. 날짜 토큰 먼저 치환
  let result = replaceDateTokens(rawTemplate);

  // 4. {1번째 아이템} 계열 토큰 치환 (아이템이 1개 이하이면 뒤의 " 외" 제거)
  const itemTokenSource = "1번째\\s*아이템|첫번째\\s*아이템|1번째\\s*품목|첫번째\\s*품목|firstItem|item|품목";
  const itemTokenRegex = new RegExp(`\\{(${itemTokenSource})\\}`, "gi");

  if (itemTokenRegex.test(result)) {
    if (itemCount <= 1) {
      const withExtraRegex = new RegExp(`\\{(${itemTokenSource})\\}\\s*외(\\s*\\d*건?)?`, "gi");
      result = result.replace(withExtraRegex, firstItemResolved);
    }
    result = result.replace(new RegExp(`\\{(${itemTokenSource})\\}`, "gi"), firstItemResolved);
  }

  return result.trim();
}

/**
 * 세금계산서 품목 배열(taxItems) 내부의 각 itemName 및 month/day를 기준일자로 치환하는 헬퍼
 * - 각 품목의 itemName에 `{}` 치환식이 있을 때만 치환하며, `{}`가 없으면 원문 보존
 */
export function resolveContractTaxItemsTemplate<T extends Record<string, any> = any>(
  items: T[] | null | undefined,
  ctx: ContractTemplateContext = {}
): T[] {
  if (!Array.isArray(items)) return [];
  const now = new Date();
  const digits = String(ctx.dateStr || "").replace(/[^0-9]/g, "");
  const mm = digits.length >= 6 ? digits.slice(4, 6) : String(now.getMonth() + 1).padStart(2, "0");
  const dd = digits.length >= 8 ? digits.slice(6, 8) : String(now.getDate()).padStart(2, "0");

  return items.map((it) => {
    const resolvedName = resolveContractItemTemplate(it?.itemName, {
      ...ctx,
      items,
    });
    return {
      ...it,
      month: digits.length >= 6 ? mm : it?.month || mm,
      day: digits.length >= 8 ? dd : it?.day || dd,
      itemName: resolvedName,
    };
  });
}

/**
 * 거래처/사업자등록증 종목(bizItem / bizClass) 우선 추출 헬퍼
 * - 종목 목록 중 "컴퓨터" 또는 "소프트웨어"가 포함된 종목이 있으면 해당 종목들을 우선 추출하여 반환
 * - 해당 키워드가 포함된 종목이 하나도 없으면 사업자등록증 종목 원문을 그대로 반환
 */
export function selectPreferredBizItem(rawBizItem?: string | null): string {
  if (!rawBizItem) return "";
  const raw = String(rawBizItem).trim();
  if (!raw) return "";

  const tokens = raw
    .split(/[,/\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length <= 1) {
    return raw;
  }

  const matched = tokens.filter((t) => t.includes("컴퓨터") || t.includes("소프트웨어"));
  if (matched.length > 0) {
    return Array.from(new Set(matched)).join(", ");
  }

  return raw;
}
