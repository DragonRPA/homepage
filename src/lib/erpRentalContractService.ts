import "server-only";
import type { PoolClient } from "pg";
import {
  formatAttachedOptionsSummary,
  type AttachedForkliftOption,
} from "./forkliftDomain";
import {
  calculateAutoDailyRentalFee,
  inferRentalRateBasis,
  parseNumericInput,
  resolveDailyRentalFee,
  type RentalRateBasis,
} from "./rentalFeeUtils";

export interface RentalItemAssignInput {
  productId?: number | string | null;
  qty?: number | string | null;
  unitCost?: number | string | null;
  unitPrice?: number | string | null;
  dailyRate?: number | string | null;
}

export interface ReservedRentalAsset {
  id: number;
  asset_no: string;
  model_name: string;
  unitCost: number;
  dailyCost: number;
}

export interface RentalContractRateTerms {
  monthlyRate: number;
  dailyRate: number;
  rateBasis: RentalRateBasis;
  vatAmount: number;
}

/** 계약 목록 조회 행의 월단가·일단가·과금 기준을 표준 수치로 정규화한다. */
export function normalizeRentalContractRows<T extends Record<string, any>>(rows: T[]) {
  return rows.map((r) => {
    const mRate = Math.round(parseNumericInput(r.monthlyRate));
    const dRate = resolveDailyRentalFee(mRate, r.dailyRate);
    const rBasis = inferRentalRateBasis(mRate, dRate, r.rateBasis);
    return {
      ...r,
      monthlyRate: mRate,
      dailyRate: dRate,
      rateBasis: rBasis,
    };
  });
}

/** 월단가·일단가·과금 기준·부가세를 계약 저장용 표준 과금 조건으로 확정한다. */
export function resolveContractRateTerms(params: {
  monthlyRate?: number | string | null;
  dailyRate?: number | string | null;
  rateBasis?: string | null;
  vatAmount?: number | string | null;
}): RentalContractRateTerms {
  const mRate = Math.round(parseNumericInput(params.monthlyRate));
  const basis = inferRentalRateBasis(mRate, params.dailyRate, params.rateBasis);
  const dRate =
    basis === "DAILY_AUTO"
      ? calculateAutoDailyRentalFee(mRate)
      : resolveDailyRentalFee(mRate, params.dailyRate);
  const vat =
    params.vatAmount !== undefined &&
    params.vatAmount !== null &&
    params.vatAmount !== ""
      ? Math.round(parseNumericInput(params.vatAmount))
      : Math.round(mRate * 0.1);

  return {
    monthlyRate: mRate,
    dailyRate: dRate,
    rateBasis: basis,
    vatAmount: vat,
  };
}

/** 부착 옵션 배열에서 추가 임대료가 있는 항목을 세금계산서 품목 행으로 변환한다. */
export function buildOptionAddonTaxRows(
  attachedOptions: AttachedForkliftOption[],
  startDate: string
): any[] {
  return attachedOptions
    .filter((o) => Number(o.monthlyAddonRate || 0) > 0)
    .map((o) => {
      const unitAddon = Math.round(Number(o.monthlyAddonRate || 0));
      const q = Math.max(1, Number(o.qty || 1));
      const sup = unitAddon * q;
      return {
        month: String(startDate || "").slice(5, 7),
        day: String(startDate || "").slice(8, 10),
        itemName: `[부착옵션] ${o.optionName}`,
        spec: o.specSummary || "장비 부착 임대옵션",
        qty: q,
        unitCost: unitAddon,
        dailyRate: Math.round(Number(o.dailyAddonRate || 0)),
        supplyAmount: sup,
        vatAmount: Math.round(sup * 0.1),
        note: "옵션 추가 임대료",
      };
    });
}

/** 계약에 대여중(RENTED)인 자산을 제품+단가 기준으로 그룹핑해 tax_items를 생성한다. */
export async function buildGroupedTaxItemsForContract(
  client: PoolClient,
  contractId: number,
  customerName: string,
  fallbackStartDate: string,
  fallbackItems: any[] = []
) {
  const rentedRes = await client.query(
    `SELECT a.id, a.asset_no, a.rental_product_id, a.current_monthly_rate, a.current_daily_rate, a.outbound_date,
            rp.model_code, rp.model_name, rp.standard_monthly_rate, rp.standard_daily_rate
     FROM erp_rental_assets a
     LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
     WHERE a.status = 'RENTED' AND (a.current_contract_id = $1 OR a.current_customer = $2)
     ORDER BY a.outbound_date ASC NULLS LAST, a.id ASC`,
    [contractId, customerName]
  );

  const rentedList = rentedRes.rows;
  if (rentedList.length === 0) {
    return {
      rentedList: [],
      taxItems: Array.isArray(fallbackItems) ? fallbackItems : [],
    };
  }

  const groupMap = new Map<
    string,
    {
      productId: number | null;
      modelCode: string;
      modelName: string;
      unitCost: number;
      dailyCost: number;
      qty: number;
      assetIds: number[];
      assetNos: string[];
      firstOutDate: string;
    }
  >();

  for (const ra of rentedList) {
    const unitCost = Math.round(Number(ra.current_monthly_rate || ra.standard_monthly_rate || 0));
    const dailyCost = resolveDailyRentalFee(unitCost, ra.current_daily_rate || ra.standard_daily_rate);
    const pid = ra.rental_product_id ? Number(ra.rental_product_id) : null;
    const mName = ra.model_name || "임대장비";
    const mCode = ra.model_code || "";
    const outDt = ra.outbound_date ? String(ra.outbound_date).slice(0, 10) : fallbackStartDate;
    const key = `${pid || mName}__${unitCost}`;

    const existing = groupMap.get(key);
    if (existing) {
      existing.qty += 1;
      existing.dailyCost += dailyCost;
      existing.assetIds.push(ra.id);
      existing.assetNos.push(ra.asset_no);
    } else {
      groupMap.set(key, {
        productId: pid,
        modelCode: mCode,
        modelName: mName,
        unitCost,
        dailyCost,
        qty: 1,
        assetIds: [ra.id],
        assetNos: [ra.asset_no],
        firstOutDate: outDt,
      });
    }
  }

  const taxItems = Array.from(groupMap.values()).map((g) => {
    const supplyAmount = Math.round(g.qty * g.unitCost);
    const vatAmount = Math.round(supplyAmount * 0.1);
    const assetSummary =
      g.assetNos.length <= 2
        ? g.assetNos.join(", ")
        : `${g.assetNos[0]} 외 ${g.assetNos.length - 1}대`;
    return {
      productId: g.productId,
      assetIds: g.assetIds,
      assetNo: g.assetNos[0] || "",
      month: g.firstOutDate.slice(5, 7),
      day: g.firstOutDate.slice(8, 10),
      itemName: g.modelName,
      spec: g.modelCode || `${g.qty}대`,
      qty: g.qty,
      unitCost: g.unitCost,
      dailyRate: g.qty > 0 ? Math.round(g.dailyCost / g.qty) : calculateAutoDailyRentalFee(g.unitCost),
      supplyAmount,
      vatAmount,
      note: assetSummary,
    };
  });

  return { rentedList, taxItems };
}

/** 대여 자산 그룹과 부착 옵션 추가료 행을 병합하여 계약 공급가액·부가세 합계를 산출한다. */
export async function buildContractTaxSummaryTx(
  client: PoolClient,
  params: {
    contractId: number;
    customerName: string;
    startDate: string;
    fallbackItems: any[];
    attachedOptions: AttachedForkliftOption[];
  }
) {
  const { rentedList, taxItems: baseGroupedItems } = await buildGroupedTaxItemsForContract(
    client,
    params.contractId,
    params.customerName,
    params.startDate,
    params.fallbackItems
  );
  const optionTaxRows = buildOptionAddonTaxRows(params.attachedOptions, params.startDate);
  const groupedItems = [...baseGroupedItems, ...optionTaxRows];
  const sumSupply = groupedItems.reduce((acc: number, it: any) => acc + Number(it.supplyAmount || 0), 0);
  const sumVat = groupedItems.reduce((acc: number, it: any) => acc + Number(it.vatAmount || 0), 0);

  return { rentedList, groupedItems, sumSupply, sumVat };
}

/** 계약 배정 대상 가용 자산을 단일 배치 잠금(FOR UPDATE)으로 선점하고 부족 시 재고 오류를 발생시킨다. */
export async function reserveRentalContractAssetsTx(
  client: PoolClient,
  params: {
    rentalItems?: RentalItemAssignInput[] | null;
    assetId?: unknown;
    monthlyRate?: number | string | null;
    dailyRate?: number | string | null;
  }
): Promise<ReservedRentalAsset[]> {
  if (Array.isArray(params.rentalItems) && params.rentalItems.length > 0) {
    const normalizedItems = params.rentalItems
      .map((item) => {
        const prodId = parseInt(String(item.productId || "0"), 10);
        const reqQty = Math.max(0, parseInt(String(item.qty || "0"), 10));
        const unitCost = Math.round(parseNumericInput(item.unitCost ?? item.unitPrice ?? "0"));
        const dailyCost = resolveDailyRentalFee(unitCost, item.dailyRate);
        return { prodId, reqQty, unitCost, dailyCost };
      })
      .filter((item) => item.prodId > 0 && item.reqQty > 0);

    if (normalizedItems.length === 0) return [];

    const neededByProduct = new Map<number, number>();
    for (const item of normalizedItems) {
      neededByProduct.set(item.prodId, (neededByProduct.get(item.prodId) || 0) + item.reqQty);
    }

    const reqProductIds = Array.from(neededByProduct.keys());
    const reqQtys = reqProductIds.map((pid) => neededByProduct.get(pid)!);

    const availRes = await client.query<{
      id: string | number;
      asset_no: string;
      rental_product_id: string | number;
      model_name: string | null;
    }>(
      `SELECT a.id, a.asset_no, a.rental_product_id, rp.model_name
       FROM UNNEST($1::bigint[], $2::int[]) AS req(product_id, qty)
       CROSS JOIN LATERAL (
         SELECT a.id, a.asset_no, a.rental_product_id
         FROM erp_rental_assets a
         WHERE a.rental_product_id = req.product_id AND a.status = 'AVAILABLE'
         ORDER BY a.asset_no ASC
         LIMIT req.qty
         FOR UPDATE OF a
       ) a
       LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
       ORDER BY a.rental_product_id ASC, a.asset_no ASC`,
      [reqProductIds, reqQtys]
    );

    const poolByProduct = new Map<
      number,
      Array<{ id: number; asset_no: string; model_name: string }>
    >();
    for (const row of availRes.rows) {
      const pid = Number(row.rental_product_id);
      const bucket = poolByProduct.get(pid) || [];
      bucket.push({
        id: Number(row.id),
        asset_no: String(row.asset_no),
        model_name: row.model_name || "임대장비",
      });
      poolByProduct.set(pid, bucket);
    }

    const reserved: ReservedRentalAsset[] = [];
    for (const item of normalizedItems) {
      const bucket = poolByProduct.get(item.prodId) || [];
      if (bucket.length < item.reqQty) {
        const prodNameRes = await client.query<{ model_name: string | null }>(
          `SELECT model_name FROM erp_rental_products WHERE id = $1`,
          [item.prodId]
        );
        const mName = prodNameRes.rows[0]?.model_name || `제품ID#${item.prodId}`;
        throw new Error(
          `[${mName}] 제품의 임대가능 재고가 부족합니다. (요청: ${item.reqQty}대 / 가용재고: ${bucket.length}대)`
        );
      }

      const allocated = bucket.splice(0, item.reqQty);
      for (const row of allocated) {
        reserved.push({
          id: row.id,
          asset_no: row.asset_no,
          model_name: row.model_name,
          unitCost: item.unitCost,
          dailyCost: item.dailyCost,
        });
      }
    }

    return reserved;
  }

  if (params.assetId) {
    const assetCheck = await client.query(
      `SELECT a.id, a.asset_no, a.status, rp.model_name
       FROM erp_rental_assets a
       LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
       WHERE a.id = $1 FOR UPDATE OF a`,
      [params.assetId]
    );
    if (assetCheck.rows.length === 0) {
      throw new Error("지정된 자산이 존재하지 않습니다.");
    }
    if (assetCheck.rows[0].status === "RENTED") {
      throw new Error("해당 자산은 이미 타 계약에서 대여중(RENTED)입니다.");
    }
    const singleMonthly = Math.round(parseNumericInput(params.monthlyRate));
    return [
      {
        id: Number(assetCheck.rows[0].id),
        asset_no: String(assetCheck.rows[0].asset_no),
        model_name: assetCheck.rows[0].model_name || "임대장비",
        unitCost: singleMonthly,
        dailyCost: resolveDailyRentalFee(singleMonthly, params.dailyRate),
      },
    ];
  }

  return [];
}

/** 선점된 자산들을 단일 UNNEST 배치 쿼리로 RENTED 전환하고 OUTBOUND 입출고 로그를 일괄 기록한다. */
export async function assignAssetsToRentalContractBatchTx(
  client: PoolClient,
  params: {
    assets: ReservedRentalAsset[];
    customerName: string;
    contractNo: string;
    contractId: number;
    startDate: string;
    attachedOptions?: AttachedForkliftOption[] | null;
    isAdditional?: boolean;
  }
): Promise<void> {
  if (params.assets.length === 0) return;

  const optionsList = Array.isArray(params.attachedOptions) ? params.attachedOptions : [];
  const optionsJson = JSON.stringify(optionsList);
  const optionSummary = formatAttachedOptionsSummary(optionsList);
  const assignVerb = params.isAdditional ? "추가 제품 배정 출고" : "제품 배정 출고";

  const assetIds: number[] = [];
  const assetNos: string[] = [];
  const unitCosts: number[] = [];
  const dailyCosts: number[] = [];
  const memos: string[] = [];

  for (const ast of params.assets) {
    assetIds.push(Number(ast.id));
    assetNos.push(String(ast.asset_no));
    unitCosts.push(Number(ast.unitCost));
    dailyCosts.push(Number(ast.dailyCost));
    memos.push(
      `임대계약(${params.contractNo}) ${assignVerb} (월단가: ₩${ast.unitCost.toLocaleString()} / 일단가: ₩${ast.dailyCost.toLocaleString()})${
        optionSummary ? ` [부착옵션: ${optionSummary}]` : ""
      }`
    );
  }

  await client.query(
    `UPDATE erp_rental_assets AS a
     SET status = 'RENTED',
         current_customer = $1,
         current_site = NULL,
         contract_no = $2,
         current_contract_id = $3,
         current_monthly_rate = u.unit_cost,
         current_daily_rate = u.daily_cost,
         outbound_date = $4::date,
         attached_options = CASE
           WHEN jsonb_array_length($5::jsonb) > 0 THEN $5::jsonb
           ELSE a.attached_options
         END,
         updated_at = NOW()
     FROM UNNEST($6::bigint[], $7::numeric[], $8::numeric[]) AS u(id, unit_cost, daily_cost)
     WHERE a.id = u.id`,
    [
      params.customerName,
      params.contractNo,
      params.contractId,
      params.startDate,
      optionsJson,
      assetIds,
      unitCosts,
      dailyCosts,
    ]
  );

  await client.query(
    `INSERT INTO erp_asset_inout_logs
     (asset_id, asset_no, event_type, event_date, customer_name, site_name, memo)
     SELECT u.asset_id, u.asset_no, 'OUTBOUND', $1::date, $2, NULL, u.memo
     FROM UNNEST($3::bigint[], $4::text[], $5::text[]) AS u(asset_id, asset_no, memo)`,
    [params.startDate, params.customerName, assetIds, assetNos, memos]
  );
}

/** 임대계약 입력 이메일을 거래처(erp_partners) 마스터에 동기화한다. */
export async function syncPartnerTaxEmailsTx(
  client: PoolClient,
  params: {
    email1?: string | null;
    email2?: string | null;
    partnerId?: number | null;
    customerName: string;
    businessNo?: string | null;
  }
): Promise<void> {
  const email1 = String(params.email1 || "");
  const email2 = String(params.email2 || "");
  if (!email1 && !email2) return;

  await client.query(
    `UPDATE erp_partners
     SET main_email = CASE WHEN $1::text <> '' THEN $1 ELSE main_email END,
         sub_email = CASE WHEN $2::text <> '' THEN $2 ELSE sub_email END,
         updated_at = NOW()
     WHERE id = $3 OR name = $4 OR ($5::text <> '' AND business_no = $5)`,
    [
      email1,
      email2,
      params.partnerId && params.partnerId > 0 ? params.partnerId : -1,
      params.customerName,
      String(params.businessNo || ""),
    ]
  );
}

/** 계약 삭제 또는 반납 처리 시 귀속 자산을 일괄 임대가능(AVAILABLE) 상태로 복구한다. */
export async function releaseContractAssetsTx(
  client: PoolClient,
  params: {
    contractId: number;
    fallbackAssetId?: number | null;
    customerName: string;
  }
): Promise<void> {
  await client.query(
    `UPDATE erp_rental_assets
     SET status = 'AVAILABLE',
         current_customer = NULL,
         current_site = NULL,
         contract_no = NULL,
         current_contract_id = NULL,
         current_monthly_rate = 0,
         current_daily_rate = 0,
         outbound_date = NULL,
         updated_at = NOW()
     WHERE current_contract_id = $1 OR id = $2 OR current_customer = $3`,
    [params.contractId, params.fallbackAssetId ?? null, params.customerName]
  );
}

/** baseContractId 또는 고객사명으로 기존 계약을 잠금 조회하고 거래처(erp_partners) 마스터를 매핑한다. */
export async function resolveExistingContractAndPartnerTx(
  client: PoolClient,
  params: {
    baseContractId?: unknown;
    customerName?: string | null;
    partnerId?: unknown;
  }
): Promise<{
  existingCt: any | null;
  cleanCustomer: string;
  targetPartnerId: number | null;
  partnerRow: any | null;
}> {
  let existingCt: any = null;
  if (params.baseContractId) {
    const byIdRes = await client.query(
      `SELECT * FROM erp_rental_contracts WHERE id = $1 FOR UPDATE`,
      [parseInt(String(params.baseContractId), 10)]
    );
    if (byIdRes.rows.length > 0) existingCt = byIdRes.rows[0];
  }

  const cleanCustomer = (params.customerName || existingCt?.customer_name || "").trim();
  if (!cleanCustomer) {
    throw new Error("고객사명이 필요합니다.");
  }

  if (!existingCt) {
    const existingRes = await client.query(
      `SELECT * FROM erp_rental_contracts WHERE customer_name = $1 ORDER BY id ASC LIMIT 1 FOR UPDATE`,
      [cleanCustomer]
    );
    if (existingRes.rows.length > 0) existingCt = existingRes.rows[0];
  }

  const rawPartnerId = params.partnerId || existingCt?.partner_id || null;
  const targetPartnerId = rawPartnerId ? parseInt(String(rawPartnerId), 10) : null;
  let partnerRow: any = null;
  if (targetPartnerId) {
    const pRes = await client.query(`SELECT * FROM erp_partners WHERE id = $1 LIMIT 1`, [targetPartnerId]);
    partnerRow = pRes.rows[0] || null;
  } else {
    const pRes = await client.query(`SELECT * FROM erp_partners WHERE name = $1 LIMIT 1`, [cleanCustomer]);
    partnerRow = pRes.rows[0] || null;
  }

  return { existingCt, cleanCustomer, targetPartnerId, partnerRow };
}
