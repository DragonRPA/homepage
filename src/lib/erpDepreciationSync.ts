import "server-only";
import type { Pool, PoolClient } from "pg";
import { runSchemaInitOnce } from "./erpSchemaCache";
import {
  type AssetMonthDepreciationRow,
  type RentalAssetForDepreciation,
  allocateModelMonthRevenueToAssets,
  buildRentalSalesSeparationAndModelRevenue,
  computeAssetAccumDeprecAsOf,
  computeAssetDisposalLossForYm,
  computeAssetMonthState,
  generateMonthRange,
  resolveBaseMonthlyDepreciation,
  resolveUsefulLifeMonths,
} from "./erpDepreciation";

const DEPRECIATION_BATCH_CHUNK = 500;

interface AssetSummaryUpdateRow {
  id: number;
  lifeMonths: number;
  baseMonthly: number;
  accumDeprec: number;
  bookValue: number;
  cumulativeRevenue: number;
  cumulativeNetProfit: number;
}

/**
 * DB 동기화 엔진:
 * - 모든 자산화 렌탈자산(acquisition_cost > 0)에 대해 최초 취득월(2024-11)부터 기준월(targetYm, 기본 현재월)까지
 *   월별 감가상각 및 월별 매출·순수익 원장(erp_asset_depreciation_logs)을 UNNEST 배치로 멱등(UPSERT) 갱신하고,
 * - erp_rental_assets 요약 컬럼을 UNNEST 단일 배치 UPDATE로 기준월 말 기준 1원 오차 없이 동기화한다.
 */
export async function syncAllRentalAssetDepreciationLogs(
  poolOrClient: Pool | PoolClient,
  targetYm?: string
): Promise<{
  targetYm: string;
  assetCount: number;
  upsertedLogCount: number;
  totalGrossCost: number;
  totalAccumDepreciation: number;
  totalBookValue: number;
  totalCumulativeRevenue: number;
  totalCumulativeNetProfit: number;
}> {
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const effectiveTargetYm = targetYm || nowKst.toISOString().slice(0, 7);
  const targetCutoffDate = `${effectiveTargetYm}-31`;

  await runSchemaInitOnce("erp_depreciation_profit_cols_v1", async () => {
    await poolOrClient.query(`
      ALTER TABLE erp_asset_depreciation_logs
        ADD COLUMN IF NOT EXISTS monthly_revenue NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS monthly_net_profit NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cumulative_revenue NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cumulative_net_profit NUMERIC DEFAULT 0;
    `);
    await poolOrClient.query(`
      ALTER TABLE erp_rental_assets
        ADD COLUMN IF NOT EXISTS cumulative_revenue NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cumulative_net_profit NUMERIC DEFAULT 0;
    `);
  });

  const [assetsRes, rentalInvRes] = await Promise.all([
    poolOrClient.query(`
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
             a.supplier,
             a.memo
      FROM erp_rental_assets a
      LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
      WHERE COALESCE(a.acquisition_cost, 0) > 0
      ORDER BY a.id ASC
    `),
    poolOrClient.query(
      `
      SELECT id, invoice_no, issue_date::text AS issue_date, supplier_entity_type,
             customer_name, item_name, memo,
             COALESCE(supply_amount, 0)::numeric AS supply_amount,
             COALESCE(vat_amount, 0)::numeric AS vat_amount,
             COALESCE(total_amount, 0)::numeric AS total_amount
      FROM erp_tax_invoices
      WHERE io_type = 'SALE' AND domain_type = 'RENTAL'
        AND SUBSTRING(issue_date::text, 1, 7) <= $1
      ORDER BY issue_date ASC, id ASC
    `,
      [effectiveTargetYm]
    ),
  ]);

  const assets: RentalAssetForDepreciation[] = assetsRes.rows;
  const { modelMonthRevenueMap } = buildRentalSalesSeparationAndModelRevenue(rentalInvRes.rows);

  const assetsByModel = new Map<string, RentalAssetForDepreciation[]>();
  for (const ast of assets) {
    const mc = String(ast.model_code || "");
    if (!assetsByModel.has(mc)) assetsByModel.set(mc, []);
    assetsByModel.get(mc)!.push(ast);
  }

  const allMonths = generateMonthRange("2024-11", effectiveTargetYm);
  const assetMonthRevMap = new Map<number, Record<string, number>>();
  for (const ast of assets) {
    assetMonthRevMap.set(Number(ast.id), {});
  }

  for (const [mc, modelAssets] of assetsByModel.entries()) {
    const mRevByYm = modelMonthRevenueMap[mc] || {};
    for (const ym of allMonths) {
      const mRev = Number(mRevByYm[ym] || 0);
      if (mRev !== 0) {
        const alloc = allocateModelMonthRevenueToAssets(modelAssets, ym, mRev);
        for (const [astId, revAmt] of alloc.entries()) {
          const rec = assetMonthRevMap.get(astId);
          if (rec) rec[ym] = revAmt;
        }
      }
    }
  }

  const logRowsByKey = new Map<string, AssetMonthDepreciationRow>();
  const assetUpdatesById = new Map<number, AssetSummaryUpdateRow>();
  let totalGrossCost = 0;
  let totalAccumDepreciation = 0;
  let totalBookValue = 0;
  let totalCumulativeRevenue = 0;
  let totalCumulativeNetProfit = 0;

  for (const ast of assets) {
    const astId = Number(ast.id);
    const acqYm = String(ast.acquisition_date || "").slice(0, 7);
    if (!acqYm || acqYm > effectiveTargetYm) continue;

    const revByYm = assetMonthRevMap.get(astId) || {};
    let firstRevYm = acqYm;
    for (const ymKey of Object.keys(revByYm)) {
      if (revByYm[ymKey] !== 0 && ymKey < firstRevYm) {
        firstRevYm = ymKey;
      }
    }

    const dispYm = ast.disposed_date ? String(ast.disposed_date).slice(0, 7) : "";
    const endYmForAsset = dispYm && dispYm < effectiveTargetYm ? dispYm : effectiveTargetYm;
    const assetMonths = generateMonthRange(firstRevYm, endYmForAsset);

    let runningCumRev = 0;
    let runningCumNetProfit = 0;

    for (const ym of assetMonths) {
      const mRev = Number(revByYm[ym] || 0);
      const state = computeAssetMonthState(ast, ym, mRev, runningCumRev, runningCumNetProfit);
      if (!state) continue;

      runningCumRev = state.cumulativeRevenue;
      runningCumNetProfit = state.cumulativeNetProfit;

      if (
        state.depreciationAmount > 0 ||
        state.disposalLossAmount > 0 ||
        state.monthlyRevenue !== 0 ||
        ym === acqYm ||
        state.endingBookValue > 0
      ) {
        logRowsByKey.set(`${state.assetId}__${state.yearMonth}`, state);
      }
    }

    const cost = Number(ast.acquisition_cost || 0);
    const salvage = Number(ast.salvage_value || 0);
    const depAmount = Math.max(0, cost - salvage);
    const lifeMonths = resolveUsefulLifeMonths(ast);
    const baseMonthly = resolveBaseMonthlyDepreciation(ast);
    const isDisposedByTarget =
      ast.disposed_date && String(ast.disposed_date).slice(0, 10) <= targetCutoffDate;

    let currentAccum = 0;
    let currentBook = 0;
    if (isDisposedByTarget) {
      const dispYmStr = String(ast.disposed_date).slice(0, 7);
      const lossAmt = computeAssetDisposalLossForYm(ast, dispYmStr);
      currentAccum = Math.max(0, cost - lossAmt);
      currentBook = 0;
    } else {
      currentAccum = Math.min(depAmount, computeAssetAccumDeprecAsOf(ast, targetCutoffDate));
      currentBook = Math.max(0, cost - currentAccum);
      totalGrossCost += cost;
      totalAccumDepreciation += currentAccum;
      totalBookValue += currentBook;
    }

    totalCumulativeRevenue += runningCumRev;
    totalCumulativeNetProfit += runningCumNetProfit;

    assetUpdatesById.set(astId, {
      id: astId,
      lifeMonths,
      baseMonthly,
      accumDeprec: currentAccum,
      bookValue: currentBook,
      cumulativeRevenue: runningCumRev,
      cumulativeNetProfit: runningCumNetProfit,
    });
  }

  const logRows = Array.from(logRowsByKey.values());
  for (let i = 0; i < logRows.length; i += DEPRECIATION_BATCH_CHUNK) {
    const chunk = logRows.slice(i, i + DEPRECIATION_BATCH_CHUNK);
    await poolOrClient.query(
      `
      INSERT INTO erp_asset_depreciation_logs (
        asset_id,
        asset_no,
        year_month,
        beginning_book_value,
        monthly_depreciation,
        disposal_loss_amount,
        accumulated_depreciation,
        book_value_after,
        monthly_revenue,
        monthly_net_profit,
        cumulative_revenue,
        cumulative_net_profit,
        event_type,
        note,
        executed_at
      )
      SELECT
        u.asset_id,
        u.asset_no,
        u.year_month,
        u.beginning_book_value,
        u.monthly_depreciation,
        u.disposal_loss_amount,
        u.accumulated_depreciation,
        u.book_value_after,
        u.monthly_revenue,
        u.monthly_net_profit,
        u.cumulative_revenue,
        u.cumulative_net_profit,
        u.event_type,
        u.note,
        NOW()
      FROM UNNEST(
        $1::bigint[],
        $2::varchar[],
        $3::varchar[],
        $4::numeric[],
        $5::numeric[],
        $6::numeric[],
        $7::numeric[],
        $8::numeric[],
        $9::numeric[],
        $10::numeric[],
        $11::numeric[],
        $12::numeric[],
        $13::varchar[],
        $14::text[]
      ) AS u(
        asset_id,
        asset_no,
        year_month,
        beginning_book_value,
        monthly_depreciation,
        disposal_loss_amount,
        accumulated_depreciation,
        book_value_after,
        monthly_revenue,
        monthly_net_profit,
        cumulative_revenue,
        cumulative_net_profit,
        event_type,
        note
      )
      ON CONFLICT (asset_id, year_month) DO UPDATE SET
        asset_no = EXCLUDED.asset_no,
        beginning_book_value = EXCLUDED.beginning_book_value,
        monthly_depreciation = EXCLUDED.monthly_depreciation,
        disposal_loss_amount = EXCLUDED.disposal_loss_amount,
        accumulated_depreciation = EXCLUDED.accumulated_depreciation,
        book_value_after = EXCLUDED.book_value_after,
        monthly_revenue = EXCLUDED.monthly_revenue,
        monthly_net_profit = EXCLUDED.monthly_net_profit,
        cumulative_revenue = EXCLUDED.cumulative_revenue,
        cumulative_net_profit = EXCLUDED.cumulative_net_profit,
        event_type = EXCLUDED.event_type,
        note = EXCLUDED.note,
        executed_at = NOW()
      `,
      [
        chunk.map((r) => r.assetId),
        chunk.map((r) => r.assetNo),
        chunk.map((r) => r.yearMonth),
        chunk.map((r) => r.beginningBookValue),
        chunk.map((r) => r.depreciationAmount),
        chunk.map((r) => r.disposalLossAmount),
        chunk.map((r) => r.accumulatedDepreciation),
        chunk.map((r) => r.endingBookValue),
        chunk.map((r) => r.monthlyRevenue),
        chunk.map((r) => r.monthlyNetProfit),
        chunk.map((r) => r.cumulativeRevenue),
        chunk.map((r) => r.cumulativeNetProfit),
        chunk.map((r) => r.eventType),
        chunk.map((r) => r.note),
      ]
    );
  }

  const assetUpdates = Array.from(assetUpdatesById.values());
  for (let i = 0; i < assetUpdates.length; i += DEPRECIATION_BATCH_CHUNK) {
    const chunk = assetUpdates.slice(i, i + DEPRECIATION_BATCH_CHUNK);
    await poolOrClient.query(
      `
      UPDATE erp_rental_assets AS a
      SET useful_life_months = u.life_months,
          monthly_depreciation = u.base_monthly,
          accumulated_depreciation = u.cur_accum,
          book_value = u.cur_book,
          cumulative_revenue = u.cum_rev,
          cumulative_net_profit = u.cum_profit,
          updated_at = NOW()
      FROM UNNEST(
        $1::bigint[],
        $2::int[],
        $3::numeric[],
        $4::numeric[],
        $5::numeric[],
        $6::numeric[],
        $7::numeric[]
      ) AS u(id, life_months, base_monthly, cur_accum, cur_book, cum_rev, cum_profit)
      WHERE a.id = u.id
      `,
      [
        chunk.map((u) => u.id),
        chunk.map((u) => u.lifeMonths),
        chunk.map((u) => u.baseMonthly),
        chunk.map((u) => u.accumDeprec),
        chunk.map((u) => u.bookValue),
        chunk.map((u) => u.cumulativeRevenue),
        chunk.map((u) => u.cumulativeNetProfit),
      ]
    );
  }

  return {
    targetYm: effectiveTargetYm,
    assetCount: assets.length,
    upsertedLogCount: logRows.length,
    totalGrossCost,
    totalAccumDepreciation,
    totalBookValue,
    totalCumulativeRevenue,
    totalCumulativeNetProfit,
  };
}
