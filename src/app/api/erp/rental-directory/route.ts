export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { decryptPii } from "@/lib/piiCrypto";
import type { RentalBizSeed } from "./rentalDirectorySeedData";
import {
  ensureRentalDirectoryTable,
  fetchDirectoryWithPartnerStatus,
  upsertDiscoveredRentalBizBatch,
  crawlOfficialBoardsLive,
  registerDirectoryPartnersTx,
} from "./rentalDirectorySyncService";

export type { RentalBizSeed };

async function resolveGeminiApiKey(): Promise<string> {
  const pool = getErpPool();
  try {
    const res = await pool.query(
      `SELECT encrypted_value FROM erp_system_secrets WHERE secret_key = 'GEMINI_ULTRA_API_KEY' LIMIT 1`
    );
    if (res.rows[0]?.encrypted_value) {
      const dec = decryptPii(String(res.rows[0].encrypted_value));
      if (dec) return dec;
    }
  } catch {
    // ignore
  }
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();
}

export async function GET() {
  try {
    const pool = getErpPool();
    await ensureRentalDirectoryTable(pool);
    const items = await fetchDirectoryWithPartnerStatus(pool);

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (err: any) {
    console.error("GET /api/erp/rental-directory error:", err);
    return NextResponse.json(
      { error: err.message || "사업자 디렉토리 조회 실패" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const pool = getErpPool();
    await ensureRentalDirectoryTable(pool);
    const body = await request.json();
    const action = body.action || "CREATE";

    // 1. 수동 사업자 등록 / 수정
    if (action === "SAVE_COMPANY") {
      const {
        id,
        sector = "FL",
        companyName,
        businessNo = "",
        ceoName = "",
        region = "전국",
        address = "",
        bizScope = "판매·임대 겸업",
        mainBrands = "",
        mainProducts = "",
        officialSource = "공식 등록 확인",
        ksicCode = "71201",
        phone = "",
        websiteUrl = "",
        scaleNote = "",
        salesStatus = "TARGET",
        memo = "",
        isBookmarked = false,
      } = body;

      if (!companyName || !String(companyName).trim()) {
        return NextResponse.json({ error: "상호(법인명)를 입력해 주십시오." }, { status: 400 });
      }

      if (id) {
        await pool.query(
          `UPDATE erp_rental_biz_directory
           SET sector = $1,
               company_name = $2,
               business_no = $3,
               ceo_name = $4,
               region = $5,
               address = $6,
               biz_scope = $7,
               main_brands = $8,
               main_products = $9,
               official_source = $10,
               ksic_code = $11,
               phone = $12,
               website_url = $13,
               scale_note = $14,
               sales_status = $15,
               memo = $16,
               is_bookmarked = $17,
               updated_at = NOW()
           WHERE id = $18`,
          [
            sector,
            String(companyName).trim(),
            businessNo,
            ceoName,
            region,
            address,
            bizScope,
            mainBrands,
            mainProducts,
            officialSource,
            ksicCode,
            phone,
            websiteUrl,
            scaleNote,
            salesStatus,
            memo,
            Boolean(isBookmarked),
            Number(id),
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO erp_rental_biz_directory (
            sector, company_name, business_no, ceo_name, region, address,
            biz_scope, main_brands, main_products, official_source, ksic_code,
            phone, website_url, scale_note, sales_status, memo, is_bookmarked
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
          ON CONFLICT (sector, company_name) DO UPDATE SET
            business_no = COALESCE(NULLIF(EXCLUDED.business_no, ''), erp_rental_biz_directory.business_no),
            ceo_name = COALESCE(NULLIF(EXCLUDED.ceo_name, ''), erp_rental_biz_directory.ceo_name),
            region = EXCLUDED.region,
            address = COALESCE(NULLIF(EXCLUDED.address, ''), erp_rental_biz_directory.address),
            biz_scope = EXCLUDED.biz_scope,
            main_brands = EXCLUDED.main_brands,
            main_products = EXCLUDED.main_products,
            official_source = EXCLUDED.official_source,
            phone = COALESCE(NULLIF(EXCLUDED.phone, ''), erp_rental_biz_directory.phone),
            website_url = COALESCE(NULLIF(EXCLUDED.website_url, ''), erp_rental_biz_directory.website_url),
            scale_note = EXCLUDED.scale_note,
            updated_at = NOW()`,
          [
            sector,
            String(companyName).trim(),
            businessNo,
            ceoName,
            region,
            address,
            bizScope,
            mainBrands,
            mainProducts,
            officialSource,
            ksicCode,
            phone,
            websiteUrl,
            scaleNote,
            salesStatus,
            memo,
            Boolean(isBookmarked),
          ]
        );
      }

      const items = await fetchDirectoryWithPartnerStatus(pool);
      return NextResponse.json({ success: true, items });
    }

    // 2. 빠른 상태/북마크/메모 업데이트
    if (action === "QUICK_UPDATE") {
      const { id, salesStatus, isBookmarked, memo } = body;
      await pool.query(
        `UPDATE erp_rental_biz_directory
         SET sales_status = COALESCE($1, sales_status),
             is_bookmarked = COALESCE($2, is_bookmarked),
             memo = COALESCE($3, memo),
             updated_at = NOW()
         WHERE id = $4`,
        [
          salesStatus !== undefined ? salesStatus : null,
          isBookmarked !== undefined ? Boolean(isBookmarked) : null,
          memo !== undefined ? String(memo) : null,
          Number(id),
        ]
      );
      const items = await fetchDirectoryWithPartnerStatus(pool);
      return NextResponse.json({ success: true, items });
    }

    // 3. 단건 또는 다건(일괄) 사업자를 ERP 거래처(고객 관리 매출처 / 매입거래처)로 즉시 등록
    if (
      action === "REGISTER_TO_PARTNER" ||
      action === "REGISTER_PARTNER" ||
      action === "BULK_REGISTER_PARTNER"
    ) {
      const partnerType: "CUSTOMER" | "VENDOR" = body.partnerType || "CUSTOMER";
      const ids: number[] = Array.isArray(body.ids)
        ? body.ids.map((x: any) => Number(x))
        : body.id
        ? [Number(body.id)]
        : [];

      if (ids.length === 0) {
        return NextResponse.json({ error: "등록할 사업자를 선택해 주십시오." }, { status: 400 });
      }

      const { newlyCreatedCount, alreadyExistedCount } = await registerDirectoryPartnersTx(
        pool,
        ids,
        partnerType
      );

      const items = await fetchDirectoryWithPartnerStatus(pool);
      return NextResponse.json({
        success: true,
        newlyCreatedCount,
        alreadyExistedCount,
        items,
      });
    }

    // 3-2. 협동조합(klra.or.kr)·전국지게차연합(udj.kr)·신도리코 파트너 원부 직접 실시간 크롤링 동기화
    if (action === "CRAWL_OFFICIAL_BOARDS") {
      const targetSector: "FL" | "AWP" | "OA_PC" | "ALL" = body.sector || "ALL";
      const crawledCount = await crawlOfficialBoardsLive(pool, targetSector);
      const items = await fetchDirectoryWithPartnerStatus(pool);
      return NextResponse.json({
        success: true,
        crawledCount,
        items,
      });
    }

    // 4. 특정 상호명 또는 지역 키워드로 외부 공식 기업DB(NICE·협동조합·나라장터·산군) 실시간 검색 및 등록
    if (action === "DISCOVER_OFFICIAL_BIZ" || action === "SEARCH_EXTERNAL_COMPANY") {
      const sector: "FL" | "AWP" | "OA_PC" = body.sector || "AWP";
      const region: string = body.region || "전국";
      const customKeyword: string = String(body.customKeyword || "").trim();

      const apiKey = await resolveGeminiApiKey();
      const sectorTitle =
        sector === "FL"
          ? "지게차(Forklift) 판매·임대업 (건설기계대여업 등록업체, 두산/현대/클라크/토요타 대리점, 우리동네지게차/퍼펙트82 등록업체)"
          : sector === "AWP"
          ? "고소작업대(AWP, 리프트/시저스리프트/붐리프트) 판매·임대업 (한국고소작업대임대업협동조합 klra.or.kr 회원사, NICE평가정보/산군 등록 리프트 임대법인, 다아라기계장터)"
          : "PC·노트북·디지털복합기(OA) 임대업 (조달청 나라장터 MAS 사무기기임대/컴퓨터임대 계약업체, 신도리코/캐논/후지필름/교세라 공식 대리점 및 B2B 렌탈법인)";

      let discoveredList: RentalBizSeed[] = [];

      if (apiKey) {
        try {
          const prompt = customKeyword
            ? `당신은 대한민국 기업신용평가(NICE평가정보, 산군, 크레탑) 및 산업조합(한국고소작업대임대업협동조합, 대한건설기계협회, 조달청 나라장터) 공식 데이터 조사관입니다.
사용자가 찾고 있는 특정 업체명 또는 검색어: "${customKeyword}" (권역: ${region}, 기본분류: ${sector})

대한민국에서 "${customKeyword}" 상호(또는 해당 키워드 관련 렌탈/리프트/지게차/OA 임대 사업자)를 실시간 웹 검색하여 실존하는 기업 정보(최대 5곳)를 찾아 반드시 아래 JSON 배열 형식으로만 응답하십시오.
업종(sector)은 지게차면 "FL", 고소작업대/리프트면 "AWP", PC/복합기/OA면 "OA_PC"로 정확히 지정하십시오.

[
  {
    "sector": "${sector}",
    "companyName": "정확한 법인명/상호 (예: 주식회사 기연리프트)",
    "businessNo": "확인된 사업자등록번호 (예: 138-81-83251, 일부 마스킹 시 확인된 앞자리 표기)",
    "ceoName": "대표자명",
    "region": "시/도 및 시/군/구 (예: 경기 (용인 처인구))",
    "address": "도로명 또는 지번 상세 주소",
    "bizScope": "고소작업대 임대·정비 / 지게차 판매·임대 / 복합기·PC 임대 등",
    "mainBrands": "취급 브랜드",
    "mainProducts": "주요 임대·판매 기종 상세",
    "officialSource": "확인된 출처 (예: NICE평가정보 / 한국고소작업대임대업협동조합 / 조달청 나라장터 등)",
    "ksicCode": "71201 또는 71202",
    "phone": "대표 전화번호",
    "websiteUrl": "홈페이지 URL (없으면 빈 문자열)",
    "scaleNote": "설립연도, 거점 특징, 주요 사업 요약",
    "salesStatus": "TARGET"
  }
]`
            : `당신은 대한민국 B2B 산업장비 및 OA 렌탈 시장 공식 데이터 조사관입니다.
검색 대상 업종: ${sectorTitle}
검색 대상 지역: ${region}

대한민국의 공식 경로(한국고소작업대임대업협동조합 klra.or.kr, 조달청 나라장터 G2B, NICE평가정보/산군 기업DB, 대한건설기계협회, 제조사 공식 판매대리점, 다아라 기계장터, 우리동네지게차)에서 실존 확인되는 "${region}" 지역 사업자 6곳을 발굴하여 반드시 아래 JSON 배열 형식으로만 응답하십시오.

[
  {
    "sector": "${sector}",
    "companyName": "정확한 법인명/상호",
    "businessNo": "사업자등록번호",
    "ceoName": "대표자명",
    "region": "${region}",
    "address": "도로명 또는 지번 주소",
    "bizScope": "신차·중고 판매 및 임대 / 장단기 임대 전문 / 조달(MAS) 임대 등",
    "mainBrands": "취급 브랜드",
    "mainProducts": "주요 임대·판매 기종 상세",
    "officialSource": "확인된 공식 경로",
    "ksicCode": "${sector === "OA_PC" ? "71202 (사무용 기계·장비 임대업)" : "71201 (건설·물류장비 임대업)"}",
    "phone": "대표 전화번호",
    "websiteUrl": "공식 홈페이지 URL",
    "scaleNote": "기업 특징 및 주요 거점 요약",
    "salesStatus": "TARGET"
  }
]`;

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
              apiKey
            )}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ google_search: {} }],
                generationConfig: { temperature: 0.2 },
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const rawText =
              geminiData?.candidates?.[0]?.content?.parts
                ?.map((p: any) => p.text || "")
                .join("\n") || "";
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed)) {
                discoveredList = parsed;
              }
            }
          }
        } catch (aiErr) {
          console.warn("Gemini discovery fallback triggered:", aiErr);
        }
      }

      const normalizedDiscovered: RentalBizSeed[] = discoveredList
        .filter((item) => Boolean(item?.companyName))
        .map((item) => {
          const validSector: "FL" | "AWP" | "OA_PC" =
            item.sector === "FL" || item.sector === "AWP" || item.sector === "OA_PC"
              ? item.sector
              : sector;
          return {
            sector: validSector,
            companyName: String(item.companyName).trim(),
            businessNo: item.businessNo || "",
            ceoName: item.ceoName || "",
            region: item.region || region,
            address: item.address || "",
            bizScope: item.bizScope || "판매·임대 겸업",
            mainBrands: item.mainBrands || "",
            mainProducts: item.mainProducts || "",
            officialSource: item.officialSource || "NICE기업DB / 협동조합 / 나라장터 확인",
            ksicCode: item.ksicCode || (validSector === "OA_PC" ? "71202" : "71201"),
            phone: item.phone || "",
            websiteUrl: item.websiteUrl || "",
            scaleNote: item.scaleNote || "",
            salesStatus: "TARGET",
          };
        });

      const insertedCount = await upsertDiscoveredRentalBizBatch(pool, normalizedDiscovered);

      const items = await fetchDirectoryWithPartnerStatus(pool);
      return NextResponse.json({
        success: true,
        discoveredCount: insertedCount,
        items,
      });
    }

    return NextResponse.json({ error: "알 수 없는 요청 액션입니다." }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/erp/rental-directory error:", err);
    return NextResponse.json(
      { error: err.message || "요청 처리 실패" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const pool = getErpPool();
    await ensureRentalDirectoryTable(pool);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 항목 ID가 필요합니다." }, { status: 400 });
    }
    await pool.query(`DELETE FROM erp_rental_biz_directory WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/erp/rental-directory error:", err);
    return NextResponse.json(
      { error: err.message || "삭제 실패" },
      { status: 500 }
    );
  }
}
