import "server-only";
import { Pool, PoolClient } from "pg";

export interface RentalAssetForDepreciation {
  id: number | string;
  asset_no: string;
  rental_product_id?: number | string | null;
  model_code?: string | null;
  model_name?: string | null;
  category?: string | null;
  status?: string | null;
  acquisition_date?: string | Date | null;
  disposed_date?: string | Date | null;
  acquisition_cost?: number | string | null;
  salvage_value?: number | string | null;
  useful_life_years?: number | string | null;
  useful_life_months?: number | string | null;
  monthly_depreciation?: number | string | null;
  supplier?: string | null;
  memo?: string | null;
}

export interface AssetMonthDepreciationRow {
  assetId: number;
  assetNo: string;
  rentalProductId: number | null;
  modelCode: string;
  modelName: string;
  yearMonth: string;
  beginningBookValue: number;
  additionAmount: number;
  depreciationAmount: number;
  disposalLossAmount: number;
  accumulatedDepreciation: number;
  endingBookValue: number;
  eventType: "DEPRECIATION" | "DISPOSAL" | "FULLY_DEPRECIATED";
  note: string;
}

export interface MonthlyAssetRollForwardSummary {
  yearMonth: string;
  beginningGrossCost: number;
  beginningAccumDepreciation: number;
  beginningBookValue: number;
  additionCost: number;
  depreciationExpense: number;
  disposalLoss: number;
  disposedGrossCost: number;
  disposedAccumRemoved: number;
  endingGrossCost: number;
  endingAccumDepreciation: number;
  endingBookValue: number;
  activeAssetCount: number;
  depreciatedAssetCount: number;
}

export function resolveUsefulLifeMonths(asset: RentalAssetForDepreciation): number {
  const cost = Number(asset.acquisition_cost || 0);
  const salvage = Number(asset.salvage_value || 0);
  const depAmount = Math.max(0, cost - salvage);
  const explicitMonths = Number(asset.useful_life_months || 0);
  if (explicitMonths > 0) return explicitMonths;

  const monthlyDep = Number(asset.monthly_depreciation || 0);
  if (depAmount > 0 && monthlyDep >= depAmount) {
    return 1;
  }

  const lifeYears = Math.max(1, Number(asset.useful_life_years || 4));
  return lifeYears * 12;
}

export function resolveBaseMonthlyDepreciation(asset: RentalAssetForDepreciation): number {
  const cost = Number(asset.acquisition_cost || 0);
  const salvage = Number(asset.salvage_value || 0);
  const depAmount = Math.max(0, cost - salvage);
  if (depAmount <= 0) return 0;

  const totalMonths = resolveUsefulLifeMonths(asset);
  if (totalMonths <= 1) return depAmount;

  const explicitMonthly = Number(asset.monthly_depreciation || 0);
  if (explicitMonthly > 0 && explicitMonthly <= depAmount) {
    return explicitMonthly;
  }
  return Math.round(depAmount / totalMonths);
}

/**
 * 특정 자산(asset)의 특정 연월(ym: 'YYYY-MM') 당월 정기 감가상각비 산출
 * - 취득월(acqYm) 포함 월할 정액상각 (monthIdx = 0부터 시작)
 * - 파손/폐기월(dispYm)부터는 정기 감가상각을 중단하고 파손·폐기손실로 일시 인식
 * - 마지막 상각월(monthIdx === totalMonths - 1)에는 단수차이를 보정하여 잔존가치까지 정확히 상각
 */
export function computeAssetMonthlyDeprecForYm(
  asset: RentalAssetForDepreciation,
  ym: string
): number {
  const cost = Number(asset.acquisition_cost || 0);
  const salvage = Number(asset.salvage_value || 0);
  const depAmount = Math.max(0, cost - salvage);
  if (depAmount <= 0 || !asset.acquisition_date) return 0;

  const acqYm = String(asset.acquisition_date).slice(0, 7);
  if (ym < acqYm) return 0;

  const dispYm = asset.disposed_date ? String(asset.disposed_date).slice(0, 7) : "";
  if (dispYm && ym >= dispYm) return 0;

  const [acqY, acqM] = acqYm.split("-").map(Number);
  const [curY, curM] = ym.split("-").map(Number);
  const monthIdx = (curY - acqY) * 12 + (curM - acqM);

  const totalMonths = resolveUsefulLifeMonths(asset);
  const monthlyDep = resolveBaseMonthlyDepreciation(asset);

  if (totalMonths <= 1 || monthlyDep >= depAmount) {
    return monthIdx === 0 ? depAmount : 0;
  }

  if (monthIdx < 0 || monthIdx >= totalMonths) return 0;

  if (monthIdx === totalMonths - 1) {
    const prevAccum = Math.min(depAmount, monthlyDep * (totalMonths - 1));
    return Math.max(0, depAmount - prevAccum);
  }
  const prevAccum = Math.min(depAmount, monthlyDep * monthIdx);
  return Math.max(0, Math.min(monthlyDep, depAmount - prevAccum));
}

/**
 * 특정 자산(asset)이 특정 연월(ym: 'YYYY-MM')에 파손·폐기(disposed_date)된 경우
 * 폐기 시점의 미상각 잔여 장부가액을 당월 파손·폐기손실로 산출
 */
export function computeAssetDisposalLossForYm(
  asset: RentalAssetForDepreciation,
  ym: string
): number {
  if (!asset.disposed_date) return 0;
  const dispYm = String(asset.disposed_date).slice(0, 7);
  if (dispYm !== ym) return 0;

  const cost = Number(asset.acquisition_cost || 0);
  const salvage = Number(asset.salvage_value || 0);
  const depAmount = Math.max(0, cost - salvage);
  if (depAmount <= 0 || !asset.acquisition_date) return 0;

  const acqYm = String(asset.acquisition_date).slice(0, 7);
  const [acqY, acqM] = acqYm.split("-").map(Number);
  const [dispY, dispM] = dispYm.split("-").map(Number);
  const monthsBeforeDisposal = Math.max(0, (dispY - acqY) * 12 + (dispM - acqM));

  const totalMonths = resolveUsefulLifeMonths(asset);
  const monthlyDep = resolveBaseMonthlyDepreciation(asset);
  const accumBeforeDisposal =
    monthsBeforeDisposal >= totalMonths
      ? depAmount
      : Math.min(depAmount, monthlyDep * monthsBeforeDisposal);
  return Math.max(0, cost - accumBeforeDisposal);
}

/**
 * 기준일(cutoffDate: 'YYYY-MM-DD') 시점의 누적 감가상각비(파손·폐기손실 포함 누적 비용화 금액) 산출
 * - 주의: BS 기말 유형자산/감가상각누계액 표시 시 이미 폐기된 자산(disposed_date <= cutoffDate)은
 *   유형자산 총액과 감가상각누계액 양쪽에서 모두 제각(제거)하고,
 *   과거 손익(retainedEarningsBefore) 계산 시에는 폐기손실까지 포함된 cost 전액이 누적 원가로 반영됨.
 */
export function computeAssetAccumDeprecAsOf(
  asset: RentalAssetForDepreciation,
  cutoffDate: string
): number {
  const cost = Number(asset.acquisition_cost || 0);
  const salvage = Number(asset.salvage_value || 0);
  const depAmount = Math.max(0, cost - salvage);
  if (depAmount <= 0 || !asset.acquisition_date) return 0;

  const acqDateStr = String(asset.acquisition_date).slice(0, 10);
  if (cutoffDate < acqDateStr) return 0;

  if (asset.disposed_date && String(asset.disposed_date).slice(0, 10) <= cutoffDate) {
    return cost;
  }

  const acqYm = acqDateStr.slice(0, 7);
  const cutYm = cutoffDate.slice(0, 7);
  const [acqY, acqM] = acqYm.split("-").map(Number);
  const [cutY, cutM] = cutYm.split("-").map(Number);

  const totalMonths = resolveUsefulLifeMonths(asset);
  const monthlyDep = resolveBaseMonthlyDepreciation(asset);
  if (totalMonths <= 1 || monthlyDep >= depAmount) return depAmount;

  const monthsCount = Math.min(totalMonths, Math.max(0, (cutY - acqY) * 12 + (cutM - acqM) + 1));
  if (monthsCount >= totalMonths) return depAmount;
  return Math.min(depAmount, monthlyDep * monthsCount);
}

/**
 * 특정 연월 말(ym: 'YYYY-MM') 기준 개별 자산의 상태(기초장부가, 당월취득, 당월상각, 당월폐기손실, 기말누계액, 기말장부가) 산출
 */
export function computeAssetMonthState(
  asset: RentalAssetForDepreciation,
  ym: string
): AssetMonthDepreciationRow | null {
  const cost = Number(asset.acquisition_cost || 0);
  const salvage = Number(asset.salvage_value || 0);
  const depAmount = Math.max(0, cost - salvage);
  if (cost <= 0 || !asset.acquisition_date) return null;

  const acqDateStr = String(asset.acquisition_date).slice(0, 10);
  const acqYm = acqDateStr.slice(0, 7);
  if (ym < acqYm) return null;

  const dispDateStr = asset.disposed_date ? String(asset.disposed_date).slice(0, 10) : "";
  const dispYm = dispDateStr ? dispDateStr.slice(0, 7) : "";
  if (dispYm && ym > dispYm) return null;

  const [curY, curM] = ym.split("-").map(Number);
  const prevY = curM === 1 ? curY - 1 : curY;
  const prevM = curM === 1 ? 12 : curM - 1;
  const prevCutoff = `${prevY}-${String(prevM).padStart(2, "0")}-31`;

  const isAcqMonth = ym === acqYm;
  const prevAccum = isAcqMonth ? 0 : computeAssetAccumDeprecAsOf(asset, prevCutoff);
  const beginningBookValue = isAcqMonth ? 0 : Math.max(0, cost - prevAccum);
  const additionAmount = isAcqMonth ? cost : 0;

  const depreciationAmount = computeAssetMonthlyDeprecForYm(asset, ym);
  const disposalLossAmount = computeAssetDisposalLossForYm(asset, ym);

  const isDisposedThisMonth = dispYm === ym;
  const accumulatedDepreciation = isDisposedThisMonth
    ? 0
    : Math.min(depAmount, prevAccum + depreciationAmount);
  const endingBookValue = isDisposedThisMonth
    ? 0
    : Math.max(0, cost - accumulatedDepreciation);

  const totalMonths = resolveUsefulLifeMonths(asset);
  const eventType: AssetMonthDepreciationRow["eventType"] = isDisposedThisMonth
    ? "DISPOSAL"
    : endingBookValue <= salvage && depreciationAmount === 0
    ? "FULLY_DEPRECIATED"
    : "DEPRECIATION";

  const lifeLabel =
    totalMonths % 12 === 0 ? `${totalMonths / 12}년(${totalMonths}개월)` : `${totalMonths}개월`;

  const note = isDisposedThisMonth
    ? `${ym} 파손·폐기 제각 (미상각 잔여장부가 ₩${disposalLossAmount.toLocaleString()} 일시 손실 처리)`
    : depreciationAmount > 0
    ? `${ym} 정액법 월할상각 (${lifeLabel}, 당월 ₩${depreciationAmount.toLocaleString()})`
    : `${ym} 상각완료 (장부가액 ₩${endingBookValue.toLocaleString()} 유지)`;

  return {
    assetId: Number(asset.id),
    assetNo: String(asset.asset_no || ""),
    rentalProductId: asset.rental_product_id ? Number(asset.rental_product_id) : null,
    modelCode: String(asset.model_code || ""),
    modelName: String(asset.model_name || ""),
    yearMonth: ym,
    beginningBookValue,
    additionAmount,
    depreciationAmount,
    disposalLossAmount,
    accumulatedDepreciation,
    endingBookValue,
    eventType,
    note,
  };
}

/**
 * 지정된 월 배열(months: ['2026-01', ...])에 대한 전사 유형자산(임대자산) 가치 변동 Roll-Forward 스케줄 산출
 * - 기초취득원가 + 당월취득 - 당월폐기제각 = 기말취득원가 (BS 유형자산 취득가액과 100% 일치)
 * - 기초감가상각누계액 + 당월감가상각비 - 당월폐기제각누계액 = 기말감가상각누계액 (BS 감가상각누계액과 100% 일치)
 * - 기초장부가액 + 당월취득 - 당월감가상각비 - 당월파손폐기손실 = 기말장부가액 (BS 순장부가액 및 PL 감가상각비와 100% 일치)
 */
export function buildMonthlyAssetRollForwardSchedule(
  assets: RentalAssetForDepreciation[],
  months: string[]
): MonthlyAssetRollForwardSummary[] {
  const sortedMonths = [...months].sort();
  return sortedMonths.map((ym) => {
    const [curY, curM] = ym.split("-").map(Number);
    const prevY = curM === 1 ? curY - 1 : curY;
    const prevM = curM === 1 ? 12 : curM - 1;
    const prevYm = `${prevY}-${String(prevM).padStart(2, "0")}`;
    const prevCutoff = `${prevYm}-31`;
    const endCutoff = `${ym}-31`;

    let beginningGrossCost = 0;
    let beginningAccumDepreciation = 0;
    let additionCost = 0;
    let depreciationExpense = 0;
    let disposalLoss = 0;
    let disposedGrossCost = 0;
    let disposedAccumRemoved = 0;
    let endingGrossCost = 0;
    let endingAccumDepreciation = 0;
    let activeAssetCount = 0;
    let depreciatedAssetCount = 0;

    for (const ast of assets) {
      const cost = Number(ast.acquisition_cost || 0);
      if (cost <= 0 || !ast.acquisition_date) continue;

      const acqYm = String(ast.acquisition_date).slice(0, 7);
      const dispYm = ast.disposed_date ? String(ast.disposed_date).slice(0, 7) : "";

      // 1) 기초 시점(전월 말) 보유 자산
      if (acqYm <= prevYm && (!dispYm || dispYm > prevYm)) {
        beginningGrossCost += cost;
        beginningAccumDepreciation += computeAssetAccumDeprecAsOf(ast, prevCutoff);
      }

      // 2) 당월 신규 취득
      if (acqYm === ym) {
        additionCost += cost;
      }

      // 3) 당월 감가상각비 및 파손·폐기손실
      const dep = computeAssetMonthlyDeprecForYm(ast, ym);
      const loss = computeAssetDisposalLossForYm(ast, ym);
      depreciationExpense += dep;
      disposalLoss += loss;
      if (dep > 0 || loss > 0) {
        depreciatedAssetCount += 1;
      }

      // 4) 당월 파손·폐기로 인한 제각(Gross Cost 및 기상각누계액 제거)
      if (dispYm === ym) {
        disposedGrossCost += cost;
        disposedAccumRemoved += Math.max(0, cost - loss);
      }

      // 5) 기말 시점(당월 말) 보유 자산 (BS 유형자산 및 감가상각누계액과 1:1 일치)
      if (acqYm <= ym && (!dispYm || dispYm > ym)) {
        endingGrossCost += cost;
        endingAccumDepreciation += computeAssetAccumDeprecAsOf(ast, endCutoff);
        activeAssetCount += 1;
      }
    }

    const beginningBookValue = Math.max(0, beginningGrossCost - beginningAccumDepreciation);
    const endingBookValue = Math.max(0, endingGrossCost - endingAccumDepreciation);

    return {
      yearMonth: ym,
      beginningGrossCost,
      beginningAccumDepreciation,
      beginningBookValue,
      additionCost,
      depreciationExpense,
      disposalLoss,
      disposedGrossCost,
      disposedAccumRemoved,
      endingGrossCost,
      endingAccumDepreciation,
      endingBookValue,
      activeAssetCount,
      depreciatedAssetCount,
    };
  });
}

export function generateMonthRange(startYm: string, endYm: string): string[] {
  const [sy, sm] = startYm.split("-").map(Number);
  const [ey, em] = endYm.split("-").map(Number);
  const result: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return result;
}

/**
 * DB 동기화 엔진:
 * - 모든 자산화 렌탈자산(acquisition_cost > 0)에 대해 최초 취득월(2024-11)부터 기준월(targetYm, 기본 현재월)까지
 *   월별 감가상각 원장(erp_asset_depreciation_logs)을 멱등(UPSERT) 생성/갱신하고,
 * - erp_rental_assets 테이블의 useful_life_months, monthly_depreciation, accumulated_depreciation, book_value를
 *   기준월 말 기준으로 1원 오차 없이 동기화한다.
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
}> {
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const effectiveTargetYm = targetYm || nowKst.toISOString().slice(0, 7);
  const targetCutoffDate = `${effectiveTargetYm}-31`;

  const assetsRes = await poolOrClient.query(`
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
  `);

  const assets: RentalAssetForDepreciation[] = assetsRes.rows;
  let upsertedLogCount = 0;
  let totalGrossCost = 0;
  let totalAccumDepreciation = 0;
  let totalBookValue = 0;

  for (const ast of assets) {
    const acqYm = String(ast.acquisition_date || "").slice(0, 7);
    if (!acqYm || acqYm > effectiveTargetYm) continue;

    const dispYm = ast.disposed_date ? String(ast.disposed_date).slice(0, 7) : "";
    const endYmForAsset = dispYm && dispYm < effectiveTargetYm ? dispYm : effectiveTargetYm;
    const assetMonths = generateMonthRange(acqYm, endYmForAsset);

    for (const ym of assetMonths) {
      const state = computeAssetMonthState(ast, ym);
      if (!state) continue;
      // 상각 완료 이후 변동이 없는 월은 불필요한 중복 행 방지를 위해 당월 상각액/폐기액이 있거나 취득월인 경우 기록,
      // 또는 상각 진행 중인 모든 월 기록
      if (
        state.depreciationAmount > 0 ||
        state.disposalLossAmount > 0 ||
        ym === acqYm ||
        state.endingBookValue > 0
      ) {
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
            event_type,
            note,
            executed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (asset_id, year_month) DO UPDATE SET
            asset_no = EXCLUDED.asset_no,
            beginning_book_value = EXCLUDED.beginning_book_value,
            monthly_depreciation = EXCLUDED.monthly_depreciation,
            disposal_loss_amount = EXCLUDED.disposal_loss_amount,
            accumulated_depreciation = EXCLUDED.accumulated_depreciation,
            book_value_after = EXCLUDED.book_value_after,
            event_type = EXCLUDED.event_type,
            note = EXCLUDED.note,
            executed_at = NOW()
        `,
          [
            state.assetId,
            state.assetNo,
            state.yearMonth,
            state.beginningBookValue,
            state.depreciationAmount,
            state.disposalLossAmount,
            state.accumulatedDepreciation,
            state.endingBookValue,
            state.eventType,
            state.note,
          ]
        );
        upsertedLogCount += 1;
      }
    }

    // Update erp_rental_assets summary columns as of effectiveTargetYm
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

    await poolOrClient.query(
      `
      UPDATE erp_rental_assets
      SET useful_life_months = $1,
          monthly_depreciation = $2,
          accumulated_depreciation = $3,
          book_value = $4,
          updated_at = NOW()
      WHERE id = $5
    `,
      [lifeMonths, baseMonthly, currentAccum, currentBook, ast.id]
    );
  }

  return {
    targetYm: effectiveTargetYm,
    assetCount: assets.length,
    upsertedLogCount,
    totalGrossCost,
    totalAccumDepreciation,
    totalBookValue,
  };
}
