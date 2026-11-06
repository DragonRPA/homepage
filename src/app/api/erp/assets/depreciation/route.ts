export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import {
  RentalAssetForDepreciation,
  buildMonthlyAssetRollForwardSchedule,
  computeAssetMonthlyDeprecForYm,
  computeAssetDisposalLossForYm,
  computeAssetAccumDeprecAsOf,
  resolveUsefulLifeMonths,
  resolveBaseMonthlyDepreciation,
  generateMonthRange,
  syncAllRentalAssetDepreciationLogs,
} from "@/lib/erpDepreciation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || "2026";
    const targetYmParam = searchParams.get("targetYm");
    const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const currentYm = targetYmParam || nowKst.toISOString().slice(0, 7);

    const pool = getErpPool();
    const assetsRes = await pool.query(`
      SELECT a.id,
             a.asset_no,
             a.rental_product_id,
             rp.model_code,
             rp.model_name,
             rp.category,
             a.status,
             a.acquisition_date::text AS acquisition_date,
             a.disposed_date::text AS disposed_date,
             COALESCE(a.acquisition_cost, 0)::numeric AS acquisition_cost,
             COALESCE(a.salvage_value, 0)::numeric AS salvage_value,
             COALESCE(a.useful_life_years, 4)::int AS useful_life_years,
             a.useful_life_months,
             COALESCE(a.monthly_depreciation, 0)::numeric AS monthly_depreciation,
             COALESCE(a.accumulated_depreciation, 0)::numeric AS accumulated_depreciation,
             COALESCE(a.book_value, 0)::numeric AS book_value,
             a.supplier,
             a.memo
      FROM erp_rental_assets a
      LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
      WHERE COALESCE(a.acquisition_cost, 0) > 0
      ORDER BY a.rental_product_id ASC, a.asset_no ASC
    `);

    const assets: RentalAssetForDepreciation[] = assetsRes.rows;

    // Determine months list
    let months: string[] = [];
    if (year === "ALL") {
      let minYm = "2024-11";
      for (const ast of assets) {
        if (ast.acquisition_date) {
          const ym = String(ast.acquisition_date).slice(0, 7);
          if (ym < minYm) minYm = ym;
        }
      }
      months = generateMonthRange(minYm, currentYm);
    } else {
      for (let m = 1; m <= 12; m++) {
        months.push(`${year}-${String(m).padStart(2, "0")}`);
      }
    }

    const rollForwardSchedule = buildMonthlyAssetRollForwardSchedule(assets, months);

    // Build model-level monthly depreciation & ending book value breakdown
    interface ModelDepreciationGroup {
      modelKey: string;
      rentalProductId: number | null;
      modelCode: string;
      modelName: string;
      category: string;
      supplier: string;
      acquisitionDate: string;
      usefulLifeYears: number;
      usefulLifeMonths: number;
      totalQty: number;
      activeQty: number;
      disposedQty: number;
      unitCost: number;
      grossAcquisitionCost: number;
      activeGrossCost: number;
      monthlyDepreciationUnit: number;
      monthlyDepreciationMap: Record<string, number>;
      monthlyDisposalLossMap: Record<string, number>;
      periodDepreciationTotal: number;
      periodDisposalLossTotal: number;
      endingAccumDepreciation: number;
      endingBookValue: number;
      firstAssetNo: string;
      lastAssetNo: string;
    }

    const endCutoff = year === "ALL" ? `${currentYm}-31` : `${year}-12-31`;
    const modelMap = new Map<string, ModelDepreciationGroup>();

    for (const ast of assets) {
      const acqDateStr = String(ast.acquisition_date || "").slice(0, 10);
      if (acqDateStr > endCutoff) continue;

      const key = String(ast.rental_product_id || ast.model_code || ast.model_name || ast.id);
      const cost = Number(ast.acquisition_cost || 0);
      const lifeMonths = resolveUsefulLifeMonths(ast);
      const lifeYears = Number(ast.useful_life_years || Math.max(1, Math.round(lifeMonths / 12)));
      const unitMonthly = resolveBaseMonthlyDepreciation(ast);
      const isDisposedByEnd =
        ast.disposed_date && String(ast.disposed_date).slice(0, 10) <= endCutoff;

      let grp = modelMap.get(key);
      if (!grp) {
        const mDepMap: Record<string, number> = {};
        const mLossMap: Record<string, number> = {};
        for (const m of months) {
          mDepMap[m] = 0;
          mLossMap[m] = 0;
        }
        grp = {
          modelKey: key,
          rentalProductId: ast.rental_product_id ? Number(ast.rental_product_id) : null,
          modelCode: String(ast.model_code || ""),
          modelName: String(ast.model_name || ""),
          category: String(ast.category || "기타"),
          supplier: String(ast.supplier || "-"),
          acquisitionDate: acqDateStr,
          usefulLifeYears: lifeYears,
          usefulLifeMonths: lifeMonths,
          totalQty: 0,
          activeQty: 0,
          disposedQty: 0,
          unitCost: cost,
          grossAcquisitionCost: 0,
          activeGrossCost: 0,
          monthlyDepreciationUnit: unitMonthly,
          monthlyDepreciationMap: mDepMap,
          monthlyDisposalLossMap: mLossMap,
          periodDepreciationTotal: 0,
          periodDisposalLossTotal: 0,
          endingAccumDepreciation: 0,
          endingBookValue: 0,
          firstAssetNo: String(ast.asset_no || ""),
          lastAssetNo: String(ast.asset_no || ""),
        };
        modelMap.set(key, grp);
      }

      grp.totalQty += 1;
      grp.grossAcquisitionCost += cost;
      grp.lastAssetNo = String(ast.asset_no || "");

      if (isDisposedByEnd) {
        grp.disposedQty += 1;
      } else {
        grp.activeQty += 1;
        grp.activeGrossCost += cost;
        const accEnd = computeAssetAccumDeprecAsOf(ast, endCutoff);
        grp.endingAccumDepreciation += accEnd;
        grp.endingBookValue += Math.max(0, cost - accEnd);
      }

      for (const m of months) {
        const dep = computeAssetMonthlyDeprecForYm(ast, m);
        const loss = computeAssetDisposalLossForYm(ast, m);
        if (dep > 0) {
          grp.monthlyDepreciationMap[m] = (grp.monthlyDepreciationMap[m] || 0) + dep;
          grp.periodDepreciationTotal += dep;
        }
        if (loss > 0) {
          grp.monthlyDisposalLossMap[m] = (grp.monthlyDisposalLossMap[m] || 0) + loss;
          grp.periodDisposalLossTotal += loss;
        }
      }
    }

    const modelRows = Array.from(modelMap.values()).sort((a, b) =>
      a.acquisitionDate.localeCompare(b.acquisitionDate)
    );

    const logCountRes = await pool
      .query(`SELECT COUNT(*)::int AS cnt, MAX(executed_at)::text AS last_sync FROM erp_asset_depreciation_logs`)
      .catch(() => ({ rows: [{ cnt: 0, last_sync: null }] }));

    return NextResponse.json({
      success: true,
      year,
      currentYm,
      months,
      rollForwardSchedule,
      modelRows,
      logStats: {
        totalLogCount: Number(logCountRes.rows[0]?.cnt || 0),
        lastSyncedAt: logCountRes.rows[0]?.last_sync || null,
      },
    });
  } catch (error: any) {
    console.error("GET /api/erp/assets/depreciation error:", error);
    return NextResponse.json(
      { error: "감가상각 원장 조회 실패: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetYm = body.targetYm || undefined;

    const pool = getErpPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await syncAllRentalAssetDepreciationLogs(client, targetYm);
      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        message: `${result.targetYm} 기준 임대자산 ${result.assetCount}대 월별 감가상각 원장(${result.upsertedLogCount}건) 동기화 완료`,
        result,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST /api/erp/assets/depreciation error:", error);
    return NextResponse.json(
      { error: "감가상각 정산 실행 실패: " + error.message },
      { status: 500 }
    );
  }
}
