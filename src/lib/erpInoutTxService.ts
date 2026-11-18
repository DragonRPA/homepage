import "server-only";
import type { PoolClient } from "pg";
import { resolveContractItemTemplate } from "./erpContractTemplate";
import { assertPartnerTradable } from "./partnerStatusService";
import {
  formatAttachedOptionsSummary,
  normalizeAttachedOptions,
} from "./forkliftDomain";
import {
  calculateAutoDailyRentalFee,
  inferRentalRateBasis,
  parseNumericInput,
  resolveDailyRentalFee,
  type RentalRateBasis,
} from "./rentalFeeUtils";

export class InoutValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "InoutValidationError";
    this.status = status;
  }
}

export function computeMonthlyProRata(
  yearMonth: string,
  contractStartDate: string,
  contractEndDate: string,
  monthlyRate: number,
  dailyRate: number,
  rateBasis: RentalRateBasis,
  acquisitionCost: number,
  salvageValue: number,
  usefulLifeYears: number
) {
  const [y, m] = yearMonth.split("-").map(Number);
  const monthStart = `${yearMonth}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;

  const effStart = contractStartDate > monthStart ? contractStartDate : monthStart;
  const effEnd = contractEndDate < monthEnd ? contractEndDate : monthEnd;

  const sDate = new Date(`${effStart}T00:00:00`);
  const eDate = new Date(`${effEnd}T00:00:00`);
  const operatingDays = Math.max(
    0,
    Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const effectiveDaily =
    rateBasis === "DAILY_AUTO"
      ? calculateAutoDailyRentalFee(monthlyRate)
      : resolveDailyRentalFee(monthlyRate, dailyRate);
  const isFullMonth = effStart === monthStart && effEnd === monthEnd;
  const isExplicitDailyMode =
    rateBasis === "DAILY_MANUAL" || rateBasis === "DAILY_AUTO";

  const proRataRevenue =
    operatingDays <= 0
      ? 0
      : isExplicitDailyMode
      ? Math.round(effectiveDaily * operatingDays)
      : isFullMonth
      ? Math.round(monthlyRate)
      : Math.min(Math.round(monthlyRate), Math.round(effectiveDaily * operatingDays));

  const depreciationCogs = Math.round(
    (acquisitionCost - salvageValue) / Math.max(1, usefulLifeYears * 12)
  );
  const netMargin = proRataRevenue - depreciationCogs;

  return {
    effStart,
    effEnd,
    operatingDays,
    proRataRevenue,
    depreciationCogs,
    netMargin,
  };
}

/**
 * 렌탈자산 출고(OUTBOUND) 트랜잭션 서비스
 * - 자산 잠금 -> 마스터 임대계약 생성/가산 -> UNNEST 배치 월별 청구 갱신/생성 -> 출고·감사 로그 기록
 */
export async function executeOutboundInoutTx(
  client: PoolClient,
  body: any
): Promise<Record<string, any>> {
  const {
    assetId,
    assetNo,
    customerName,
    siteName,
    billingStartDate,
    endDate,
    monthlyRate,
    dailyRate: explicitDailyRate,
    rateBasis: requestedRateBasis,
    entityType,
    deposit,
    memo,
    actorName,
    useProRata,
  } = body;

  if ((!assetId && !assetNo) || !customerName || !billingStartDate || monthlyRate === undefined) {
    throw new InoutValidationError(
      "고객사명, 출고 자산, 청구 시작일, 월 단가는 필수 입력 항목입니다.",
      400
    );
  }

  const numMonthlyRate = Math.round(parseNumericInput(monthlyRate));
  if (isNaN(numMonthlyRate) || numMonthlyRate < 0) {
    throw new InoutValidationError("유효한 월 단가를 입력해 주십시오.", 400);
  }

  await client.query("BEGIN");
  try {
    // 1. Fetch & lock target asset
    const assetRes = await client.query(
      `
      SELECT a.*, p.model_name, p.standard_monthly_rate
      FROM erp_rental_assets a
      LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
      WHERE ${assetId ? "a.id = $1" : "UPPER(a.asset_no) = UPPER($1)"}
      FOR UPDATE OF a
    `,
      [assetId || assetNo]
    );

    if (assetRes.rows.length === 0) {
      throw new InoutValidationError("선택한 렌탈자산을 찾을 수 없습니다.", 404);
    }

    const asset = assetRes.rows[0];
    if (asset.status === "RENTED") {
      throw new InoutValidationError(
        `해당 자산(${asset.asset_no})은 이미 [${asset.current_customer || "타 고객사"}]에 출고(대여중) 상태입니다.`,
        400
      );
    }

    const cleanCustomer = customerName.trim();
    await assertPartnerTradable(client, { customerName: cleanCustomer });
    const effectiveEndDate = endDate || "2099-12-31";
    const resolvedBasis = inferRentalRateBasis(
      numMonthlyRate,
      explicitDailyRate,
      requestedRateBasis || (useProRata === true ? "DAILY_AUTO" : undefined)
    );
    const effectiveDailyRate =
      resolvedBasis === "DAILY_AUTO"
        ? calculateAutoDailyRentalFee(numMonthlyRate)
        : resolveDailyRentalFee(numMonthlyRate, explicitDailyRate);
    const useDailyBilling =
      resolvedBasis === "DAILY_MANUAL" ||
      resolvedBasis === "DAILY_AUTO" ||
      useProRata === true;

    // 2. 고객별 임대계약은 1건 원칙: 기존 고객 마스터 임대계약 조회 (없으면 1건 생성)
    let contract: any = null;
    const existingCtRes = await client.query(
      `SELECT * FROM erp_rental_contracts
       WHERE customer_name = $1
       ORDER BY CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END, id ASC
       LIMIT 1`,
      [cleanCustomer]
    );

    if (existingCtRes.rows.length > 0) {
      contract = existingCtRes.rows[0];
    } else {
      const pRes = await client.query(
        `SELECT * FROM erp_partners WHERE name = $1 LIMIT 1`,
        [cleanCustomer]
      );
      const partner = pRes.rows[0] || null;
      const contractYear = billingStartDate.slice(0, 4);
      const contractNo = `RC-${contractYear}-${String(Math.floor(1000 + Math.random() * 9000))}`;

      const contractRes = await client.query(
        `
        INSERT INTO erp_rental_contracts
        (contract_no, entity_type, partner_id, customer_name, site_name, asset_id, start_date, end_date,
         monthly_rate, daily_rate, rate_basis, vat_amount, deposit, status, memo,
         customer_biz_no, customer_ceo_name, customer_address, customer_biz_type, customer_biz_class, customer_email,
         tax_purpose, tax_memo, tax_items)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'ACTIVE', $14, $15, $16, $17, $18, $19, $20, '청구', '{1번째 아이템} 외', '[]'::jsonb)
        RETURNING *
      `,
        [
          contractNo,
          entityType || "CORP",
          partner ? partner.id : null,
          cleanCustomer,
          (siteName || "").trim() || null,
          asset.id,
          billingStartDate,
          effectiveEndDate,
          numMonthlyRate,
          effectiveDailyRate,
          resolvedBasis,
          Math.round(numMonthlyRate * 0.1),
          Number(deposit || 0),
          memo || null,
          partner?.business_no || "",
          partner?.ceo_name || "",
          partner ? [partner.address, partner.address_detail].filter(Boolean).join(" ") : "",
          partner?.biz_type || "",
          partner?.biz_item || "",
          partner?.main_email || "",
        ]
      );
      contract = contractRes.rows[0];
    }

    const normalizedAttachedOptions =
      body.attachedOptions !== undefined
        ? normalizeAttachedOptions(body.attachedOptions)
        : normalizeAttachedOptions(asset.attached_options);
    const attachedSummary = formatAttachedOptionsSummary(normalizedAttachedOptions);

    // 3. 자산 출고 상태 및 예정 점검일 갱신
    await client.query(
      `
      UPDATE erp_rental_assets
      SET status = 'RENTED',
          current_customer = $1,
          current_site = $2,
          contract_no = $3,
          current_contract_id = $4,
          current_monthly_rate = $5,
          current_daily_rate = $6,
          outbound_date = $7,
          attached_options = $9::jsonb,
          next_pm_due_date = CASE
            WHEN next_pm_due_date IS NULL OR next_pm_due_date < $7::date
              THEN ($7::date + (COALESCE(pm_interval_days, 30) * INTERVAL '1 day'))::date
            ELSE next_pm_due_date
          END,
          updated_at = NOW()
      WHERE id = $8
    `,
      [
        cleanCustomer,
        (siteName || "").trim() || contract.site_name || null,
        contract.contract_no,
        contract.id,
        numMonthlyRate,
        effectiveDailyRate,
        billingStartDate,
        asset.id,
        JSON.stringify(normalizedAttachedOptions),
      ]
    );

    // 4. 고객의 현재 출고(대여중)된 전체 자산을 집계하여 마스터 임대계약의 월/일 임대료 및 품목(tax_items)에 가산(+) 반영
    const rentedAssetsRes = await client.query(
      `SELECT a.id, a.asset_no, a.current_monthly_rate, a.current_daily_rate, a.outbound_date, a.current_site,
              a.attached_options, a.acquisition_cost, a.salvage_value, a.useful_life_years,
              p.model_name, p.standard_monthly_rate, p.standard_daily_rate
       FROM erp_rental_assets a
       LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
       WHERE a.status = 'RENTED' AND (a.current_contract_id = $1 OR a.current_customer = $2)
       ORDER BY a.outbound_date ASC NULLS LAST, a.id ASC`,
      [contract.id, cleanCustomer]
    );

    const rentedAssets = rentedAssetsRes.rows;
    const mm = billingStartDate.slice(5, 7);
    const dd = billingStartDate.slice(8, 10);

    const updatedTaxItems = rentedAssets.map((ra: any) => {
      const itemRate = Math.round(Number(ra.current_monthly_rate || ra.standard_monthly_rate || numMonthlyRate));
      const itemDailyRate = resolveDailyRentalFee(
        itemRate,
        ra.current_daily_rate || ra.standard_daily_rate
      );
      const itemVat = Math.round(itemRate * 0.1);
      const outDt = ra.outbound_date ? String(ra.outbound_date).slice(0, 10) : billingStartDate;
      const optText = formatAttachedOptionsSummary(ra.attached_options);
      return {
        assetId: ra.id,
        assetNo: ra.asset_no,
        month: outDt.slice(5, 7) || mm,
        day: outDt.slice(8, 10) || dd,
        itemName: `${ra.model_name || "임대장비"} (${ra.asset_no})`,
        spec: optText
          ? `${ra.current_site || (siteName || "").trim() || ""} [옵션: ${optText}]`.trim()
          : ra.current_site || (siteName || "").trim() || "",
        qty: 1,
        unitCost: itemRate,
        dailyRate: itemDailyRate,
        supplyAmount: itemRate,
        vatAmount: itemVat,
        note: `출고일: ${outDt}${optText ? ` / 옵션: ${optText}` : ""}`,
      };
    });

    const updatedTaxItemsJson = JSON.stringify(updatedTaxItems);
    const totalContractMonthlyRate = updatedTaxItems.reduce(
      (acc: number, it: any) => acc + Number(it.supplyAmount || 0),
      0
    );
    const totalContractDailyRate = updatedTaxItems.reduce(
      (acc: number, it: any) => acc + Number(it.dailyRate || 0),
      0
    );
    const totalContractVat = updatedTaxItems.reduce(
      (acc: number, it: any) => acc + Number(it.vatAmount || 0),
      0
    );
    const firstAssetId = rentedAssets[0]?.id || asset.id;

    const updatedCtRes = await client.query(
      `UPDATE erp_rental_contracts
       SET status = 'ACTIVE',
           asset_id = $1,
           site_name = COALESCE(NULLIF($2, ''), site_name),
           monthly_rate = $3,
           daily_rate = $4,
           rate_basis = $5,
           vat_amount = $6,
           tax_memo = COALESCE(NULLIF(tax_memo, ''), '{1번째 아이템} 외'),
           tax_items = $7::jsonb,
           attached_options = CASE WHEN jsonb_array_length($9::jsonb) > 0 THEN $9::jsonb ELSE attached_options END
       WHERE id = $8
       RETURNING *`,
      [
        firstAssetId,
        (siteName || "").trim(),
        totalContractMonthlyRate,
        totalContractDailyRate,
        resolvedBasis,
        totalContractVat,
        updatedTaxItemsJson,
        contract.id,
        JSON.stringify(normalizedAttachedOptions),
      ]
    );
    contract = updatedCtRes.rows[0];

    // 5. 당월/기간 청구 프리페치 후 배치 갱신·생성
    const startYearMonth = billingStartDate.slice(0, 7);
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthsToBill = Array.from(
      new Set<string>(
        currentYearMonth >= startYearMonth && currentYearMonth <= effectiveEndDate.slice(0, 7)
          ? [startYearMonth, currentYearMonth]
          : [startYearMonth]
      )
    );

    const totalDeprecCogs = rentedAssets.reduce((sum: number, ra: any) => {
      const acq = Number(ra.acquisition_cost || 0);
      const salv = Number(ra.salvage_value || 0);
      const life = Math.max(1, Number(ra.useful_life_years || 5) * 12);
      return sum + Math.round((acq - salv) / life);
    }, 0);

    const existingBillRes = await client.query(
      `SELECT DISTINCT ON (year_month) *
       FROM erp_rental_billings
       WHERE contract_id = $1
         AND year_month = ANY($2::varchar[])
         AND tax_invoice_id IS NULL
       ORDER BY year_month, id DESC`,
      [contract.id, monthsToBill]
    );
    const existingByYm = new Map<string, any>();
    for (const row of existingBillRes.rows) {
      existingByYm.set(String(row.year_month), row);
    }

    const updateItems: Array<{
      id: number;
      nextRevenue: number;
      nextVat: number;
      nextTotal: number;
      resolvedMemo: string;
      totalDeprecCogs: number;
      nextMargin: number;
    }> = [];
    const insertItems: Array<{
      billingNo: string;
      ym: string;
      effStart: string;
      effEnd: string;
      operatingDays: number;
      targetRevenue: number;
      targetVat: number;
      targetTotal: number;
      resolvedMemo: string;
      totalDeprecCogs: number;
      netMargin: number;
    }> = [];

    for (const ym of monthsToBill) {
      const [yNum, mNum] = ym.split("-").map(Number);
      const lastDay = new Date(yNum, mNum, 0).getDate();
      const monthStart = `${ym}-01`;
      const monthEnd = `${ym}-${String(lastDay).padStart(2, "0")}`;

      let targetRevenue = totalContractMonthlyRate;
      let operatingDays = 30;
      let effStart = monthStart;
      let effEnd = monthEnd;

      if (useDailyBilling) {
        const calc = computeMonthlyProRata(
          ym,
          billingStartDate,
          effectiveEndDate,
          numMonthlyRate,
          effectiveDailyRate,
          resolvedBasis,
          Number(asset.acquisition_cost || 0),
          Number(asset.salvage_value || 0),
          Number(asset.useful_life_years || 5)
        );
        operatingDays = calc.operatingDays;
        effStart = calc.effStart;
        effEnd = calc.effEnd;
        targetRevenue = calc.proRataRevenue;
      }

      const targetVat = Math.round(targetRevenue * 0.1);
      const targetTotal = targetRevenue + targetVat;
      const netMargin = targetRevenue - totalDeprecCogs;
      const resolvedMemo = resolveContractItemTemplate(contract.tax_memo || "{1번째 아이템} 외", {
        dateStr: ym,
        items: updatedTaxItems,
        fallbackFirstItem:
          updatedTaxItems[0]?.itemName || `${asset.model_name || "임대장비"} (${asset.asset_no})`,
      });

      const existingBill = existingByYm.get(ym);
      if (existingBill) {
        const nextRevenue = useDailyBilling
          ? Math.round(Number(existingBill.pro_rata_revenue || 0)) + targetRevenue
          : totalContractMonthlyRate;
        const nextVat = Math.round(nextRevenue * 0.1);
        updateItems.push({
          id: Number(existingBill.id),
          nextRevenue,
          nextVat,
          nextTotal: nextRevenue + nextVat,
          resolvedMemo,
          totalDeprecCogs,
          nextMargin: nextRevenue - totalDeprecCogs,
        });
      } else {
        insertItems.push({
          billingNo: `RB${ym.replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`,
          ym,
          effStart,
          effEnd,
          operatingDays,
          targetRevenue,
          targetVat,
          targetTotal,
          resolvedMemo,
          totalDeprecCogs,
          netMargin,
        });
      }
    }

    const billByYm = new Map<string, any>();
    if (updateItems.length > 0) {
      const updRes = await client.query(
        `UPDATE erp_rental_billings AS rb
         SET pro_rata_revenue = u.rev,
             vat_amount = u.vat,
             total_amount = u.total,
             tax_memo = u.memo,
             tax_items = $8::jsonb,
             depreciation_cogs = u.cogs,
             net_margin = u.margin
         FROM UNNEST(
           $1::bigint[],
           $2::numeric[],
           $3::numeric[],
           $4::numeric[],
           $5::text[],
           $6::numeric[],
           $7::numeric[]
         ) AS u(id, rev, vat, total, memo, cogs, margin)
         WHERE rb.id = u.id
         RETURNING rb.*`,
        [
          updateItems.map((u) => u.id),
          updateItems.map((u) => u.nextRevenue),
          updateItems.map((u) => u.nextVat),
          updateItems.map((u) => u.nextTotal),
          updateItems.map((u) => u.resolvedMemo),
          updateItems.map((u) => u.totalDeprecCogs),
          updateItems.map((u) => u.nextMargin),
          updatedTaxItemsJson,
        ]
      );
      for (const r of updRes.rows) {
        billByYm.set(String(r.year_month), r);
      }
    }

    if (insertItems.length > 0) {
      const insRes = await client.query(
        `INSERT INTO erp_rental_billings (
           billing_no, contract_id, year_month, start_date, end_date, operating_days,
           pro_rata_revenue, vat_amount, total_amount, tax_purpose, tax_memo, tax_items,
           depreciation_cogs, net_margin, billing_date, payment_status
         )
         SELECT
           u.billing_no, $1::bigint, u.ym, u.start_dt::date, u.end_dt::date, u.op_days,
           u.rev, u.vat, u.total, '청구', u.memo, $13::jsonb,
           u.cogs, u.margin, CURRENT_DATE, 'UNPAID'
         FROM UNNEST(
           $2::text[],
           $3::varchar[],
           $4::text[],
           $5::text[],
           $6::int[],
           $7::numeric[],
           $8::numeric[],
           $9::numeric[],
           $10::text[],
           $11::numeric[],
           $12::numeric[]
         ) AS u(billing_no, ym, start_dt, end_dt, op_days, rev, vat, total, memo, cogs, margin)
         RETURNING *`,
        [
          contract.id,
          insertItems.map((i) => i.billingNo),
          insertItems.map((i) => i.ym),
          insertItems.map((i) => i.effStart),
          insertItems.map((i) => i.effEnd),
          insertItems.map((i) => i.operatingDays),
          insertItems.map((i) => i.targetRevenue),
          insertItems.map((i) => i.targetVat),
          insertItems.map((i) => i.targetTotal),
          insertItems.map((i) => i.resolvedMemo),
          insertItems.map((i) => i.totalDeprecCogs),
          insertItems.map((i) => i.netMargin),
          updatedTaxItemsJson,
        ]
      );
      for (const r of insRes.rows) {
        billByYm.set(String(r.year_month), r);
      }
    }

    const createdBillings = monthsToBill
      .map((ym) => billByYm.get(ym))
      .filter(Boolean);

    // 6. Record OUTBOUND & Audit Logs (1 CTE statement)
    const baseLogMemo =
      memo ||
      `출고등록 완료 (고객계약: ${contract.contract_no}, 출고단가: ₩${numMonthlyRate.toLocaleString()} 가산 → 고객 총 ${rentedAssets.length}대 / 월 ₩${totalContractMonthlyRate.toLocaleString()})`;
    const logMemo = `${baseLogMemo}${attachedSummary ? ` [부착옵션: ${attachedSummary}]` : ""}`;
    const auditDetails = JSON.stringify({
      assetId: asset.id,
      assetNo: asset.asset_no,
      serialNo: asset.serial_no,
      customerName: cleanCustomer,
      siteName: (siteName || "").trim() || null,
      billingStartDate,
      monthlyRate: numMonthlyRate,
      totalContractMonthlyRate,
      activeAssetCount: rentedAssets.length,
      contractNo: contract.contract_no,
      billingsCreated: createdBillings.length,
    });

    await client.query(
      `WITH ins_audit AS (
         INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('RENTAL_INOUT', 'OUTBOUND', $2, $3, $4)
       )
       INSERT INTO erp_asset_inout_logs
       (asset_id, asset_no, event_type, event_date, customer_name, site_name, memo)
       VALUES ($1, $2, 'OUTBOUND', $5, $6, $7, $8)`,
      [
        asset.id,
        String(asset.asset_no),
        actorName || "출고담당자",
        auditDetails,
        billingStartDate,
        cleanCustomer,
        (siteName || "").trim() || null,
        logMemo,
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      contract,
      billing: createdBillings[0] || null,
      billings: createdBillings,
      assetNo: asset.asset_no,
      activeAssetCount: rentedAssets.length,
      totalContractMonthlyRate,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  }
}

/**
 * 렌탈자산 입고(INBOUND) 반납 회수 트랜잭션 서비스
 */
export async function executeInboundInoutTx(
  client: PoolClient,
  body: any
): Promise<Record<string, any>> {
  const { assetId, queryKey, inboundDate, nextStatus, memo, actorName } = body;

  if (!assetId && !queryKey) {
    throw new InoutValidationError(
      "자산번호 또는 제조번호(시리얼번호)를 입력해 주십시오.",
      400
    );
  }

  const effectiveInboundDate = inboundDate || new Date().toISOString().split("T")[0];
  const targetNextStatus = nextStatus === "REPAIRING" ? "REPAIRING" : "AVAILABLE";

  await client.query("BEGIN");
  try {
    let assetRes;
    if (assetId) {
      assetRes = await client.query(
        `
        SELECT a.*, p.model_name, p.manufacturer, p.standard_monthly_rate,
               c.id AS "active_contract_id",
               c.contract_no AS "active_contract_no",
               c.customer_name AS "active_customer_name",
               c.site_name AS "active_site_name",
               c.monthly_rate AS "active_monthly_rate",
               c.tax_memo AS "active_tax_memo",
               TO_CHAR(c.start_date, 'YYYY-MM-DD') AS "start_date_str"
        FROM erp_rental_assets a
        LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
        LEFT JOIN LATERAL (
          SELECT * FROM erp_rental_contracts rc
          WHERE (rc.id = a.current_contract_id OR rc.asset_id = a.id OR (a.current_customer IS NOT NULL AND rc.customer_name = a.current_customer))
            AND rc.status = 'ACTIVE'
          ORDER BY CASE WHEN rc.id = a.current_contract_id THEN 0 ELSE 1 END, rc.id ASC
          LIMIT 1
        ) c ON true
        WHERE a.id = $1
        FOR UPDATE OF a
        `,
        [assetId]
      );
    } else {
      const cleanKey = String(queryKey).trim();
      assetRes = await client.query(
        `
        SELECT a.*, p.model_name, p.manufacturer, p.standard_monthly_rate,
               c.id AS "active_contract_id",
               c.contract_no AS "active_contract_no",
               c.customer_name AS "active_customer_name",
               c.site_name AS "active_site_name",
               c.monthly_rate AS "active_monthly_rate",
               c.tax_memo AS "active_tax_memo",
               TO_CHAR(c.start_date, 'YYYY-MM-DD') AS "start_date_str"
        FROM erp_rental_assets a
        LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
        LEFT JOIN LATERAL (
          SELECT * FROM erp_rental_contracts rc
          WHERE (rc.id = a.current_contract_id OR rc.asset_id = a.id OR (a.current_customer IS NOT NULL AND rc.customer_name = a.current_customer))
            AND rc.status = 'ACTIVE'
          ORDER BY CASE WHEN rc.id = a.current_contract_id THEN 0 ELSE 1 END, rc.id ASC
          LIMIT 1
        ) c ON true
        WHERE UPPER(a.asset_no) = UPPER($1) OR UPPER(a.serial_no) = UPPER($1)
        ORDER BY CASE WHEN a.status = 'RENTED' THEN 0 ELSE 1 END, a.id ASC
        LIMIT 1
        FOR UPDATE OF a
      `,
        [cleanKey]
      );
    }

    if (assetRes.rows.length === 0) {
      throw new InoutValidationError(
        "입력하신 자산번호 또는 제조번호와 일치하는 자산이 없습니다.",
        404
      );
    }

    const asset = assetRes.rows[0];
    const activeContractId = asset.active_contract_id || asset.current_contract_id || null;
    const fromCustomer =
      asset.active_customer_name || asset.current_customer || "미지정 고객사";
    const fromSite = asset.active_site_name || asset.current_site || null;
    const deductedRate = Math.round(
      Number(asset.current_monthly_rate || asset.standard_monthly_rate || 0)
    );
    const inboundOptSummary = formatAttachedOptionsSummary(asset.attached_options);
    const inboundOpHours =
      body.operatingHours !== undefined && body.operatingHours !== ""
        ? Math.max(
            Number(asset.operating_hours || 0),
            Number(parseNumericInput(body.operatingHours)) || 0
          )
        : Number(asset.operating_hours || 0);

    const prevAssetOpHours = Number(asset.operating_hours || 0);

    await client.query(
      `UPDATE erp_rental_assets
       SET status = $1,
           current_customer = NULL,
           current_site = NULL,
           contract_no = NULL,
           current_contract_id = NULL,
           current_monthly_rate = 0,
           current_daily_rate = 0,
           outbound_date = NULL,
           operating_hours = GREATEST(COALESCE(operating_hours, 0), $3),
           last_hour_recorded_at = CASE WHEN $3 > COALESCE(operating_hours, 0) THEN NOW() ELSE last_hour_recorded_at END,
           updated_at = NOW()
       WHERE id = $2`,
      [targetNextStatus, asset.id, inboundOpHours]
    );

    if (inboundOpHours > prevAssetOpHours) {
      const kstToday = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
      await client.query(
        `INSERT INTO erp_asset_hour_logs (
           asset_id, recorded_date, previous_hours, recorded_hours, delta_hours,
           source_type, source_id, recorded_by, note
         ) VALUES (
           $1, $2::date, $3, $4, $5,
           'INBOUND', NULL, $6, $7
         )`,
        [
          asset.id,
          kstToday,
          prevAssetOpHours,
          inboundOpHours,
          Math.round((inboundOpHours - prevAssetOpHours) * 10) / 10,
          String(body.actorName || "입고담당자").trim() || "입고담당자",
          "반납 입고 가동시간 기록",
        ]
      );
    }

    if (inboundOpHours > 0) {
      await client.query(
        `UPDATE erp_forklift_warranties
         SET current_operating_hours = GREATEST(current_operating_hours, $1),
             updated_at = NOW()
         WHERE asset_id = $2`,
        [inboundOpHours, asset.id]
      );
    }

    let updatedBilling = null;
    let remainingAssetCount = 0;
    let remainingMonthlyRate = 0;

    if (activeContractId) {
      const remainingRes = await client.query(
        `SELECT a.id, a.asset_no, a.current_monthly_rate, a.current_daily_rate, a.outbound_date, a.current_site,
                a.acquisition_cost, a.salvage_value, a.useful_life_years,
                p.model_name, p.standard_monthly_rate, p.standard_daily_rate
         FROM erp_rental_assets a
         LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
         WHERE a.status = 'RENTED' AND (a.current_contract_id = $1 OR a.current_customer = $2)
         ORDER BY a.outbound_date ASC NULLS LAST, a.id ASC`,
        [activeContractId, fromCustomer]
      );

      const remainingAssets = remainingRes.rows;
      remainingAssetCount = remainingAssets.length;
      const mm = effectiveInboundDate.slice(5, 7);
      const dd = effectiveInboundDate.slice(8, 10);

      const nextTaxItems = remainingAssets.map((ra: any) => {
        const itemRate = Math.round(
          Number(ra.current_monthly_rate || ra.standard_monthly_rate || 0)
        );
        const itemDailyRate = resolveDailyRentalFee(
          itemRate,
          ra.current_daily_rate || ra.standard_daily_rate
        );
        const itemVat = Math.round(itemRate * 0.1);
        const outDt = ra.outbound_date
          ? String(ra.outbound_date).slice(0, 10)
          : effectiveInboundDate;
        return {
          assetId: ra.id,
          assetNo: ra.asset_no,
          month: outDt.slice(5, 7) || mm,
          day: outDt.slice(8, 10) || dd,
          itemName: `${ra.model_name || "임대장비"} (${ra.asset_no})`,
          spec: ra.current_site || fromSite || "",
          qty: 1,
          unitCost: itemRate,
          dailyRate: itemDailyRate,
          supplyAmount: itemRate,
          vatAmount: itemVat,
          note: `출고일: ${outDt}`,
        };
      });

      remainingMonthlyRate = nextTaxItems.reduce(
        (acc: number, it: any) => acc + Number(it.supplyAmount || 0),
        0
      );
      const remainingDailyRate = nextTaxItems.reduce(
        (acc: number, it: any) => acc + Number(it.dailyRate || 0),
        0
      );
      const remainingVat = nextTaxItems.reduce(
        (acc: number, it: any) => acc + Number(it.vatAmount || 0),
        0
      );
      const nextFirstAssetId = remainingAssets[0]?.id || null;

      await client.query(
        `UPDATE erp_rental_contracts
         SET asset_id = $1,
             monthly_rate = $2,
             daily_rate = $3,
             vat_amount = $4,
             tax_items = $5::jsonb
         WHERE id = $6`,
        [
          nextFirstAssetId,
          remainingMonthlyRate,
          remainingDailyRate,
          remainingVat,
          JSON.stringify(nextTaxItems),
          activeContractId,
        ]
      );

      const inboundYm = effectiveInboundDate.slice(0, 7);
      const remainingDeprecCogs = remainingAssets.reduce((sum: number, ra: any) => {
        const acq = Number(ra.acquisition_cost || 0);
        const salv = Number(ra.salvage_value || 0);
        const life = Math.max(1, Number(ra.useful_life_years || 5) * 12);
        return sum + Math.round((acq - salv) / life);
      }, 0);

      const resolvedMemo = resolveContractItemTemplate(
        asset.active_tax_memo || "{1번째 아이템} 외",
        {
          dateStr: inboundYm,
          items: nextTaxItems,
          fallbackFirstItem:
            nextTaxItems[0]?.itemName ||
            `${asset.model_name || "임대장비"} (${asset.asset_no})`,
        }
      );

      const updBillRes = await client.query(
        `UPDATE erp_rental_billings
         SET end_date = $1,
             pro_rata_revenue = $2,
             vat_amount = $3,
             total_amount = $4,
             tax_memo = $5,
             tax_items = $6::jsonb,
             depreciation_cogs = $7,
             net_margin = $8
         WHERE contract_id = $9 AND year_month = $10 AND tax_invoice_id IS NULL
         RETURNING *`,
        [
          effectiveInboundDate,
          remainingMonthlyRate,
          remainingVat,
          remainingMonthlyRate + remainingVat,
          resolvedMemo,
          JSON.stringify(nextTaxItems),
          remainingDeprecCogs,
          remainingMonthlyRate - remainingDeprecCogs,
          activeContractId,
          inboundYm,
        ]
      );
      updatedBilling = updBillRes.rows[0] || null;
    }

    const baseInboundMemo =
      memo ||
      `[${fromCustomer}${fromSite ? " / " + fromSite : ""}] 입고 완료 (단가 ₩${deductedRate.toLocaleString()} 차감 → 잔여 ${remainingAssetCount}대 / 월 ₩${remainingMonthlyRate.toLocaleString()})`;
    const logMemo = `${baseInboundMemo}${inboundOptSummary ? ` [반납확인 옵션: ${inboundOptSummary}]` : ""}`;
    const auditDetails = JSON.stringify({
      assetId: asset.id,
      assetNo: asset.asset_no,
      serialNo: asset.serial_no,
      fromCustomer,
      fromSite,
      inboundDate: effectiveInboundDate,
      nextStatus: targetNextStatus,
      deductedRate,
      remainingAssetCount,
      remainingMonthlyRate,
    });

    const finishRes = await client.query(
      `
      WITH ins_audit AS (
        INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
        VALUES ('RENTAL_INOUT', 'INBOUND', $2, $3, $4)
      )
      INSERT INTO erp_asset_inout_logs
      (asset_id, asset_no, event_type, event_date, customer_name, site_name, memo)
      VALUES ($1, $2, 'INBOUND', $5, $6, $7, $8)
      RETURNING
        id,
        asset_id AS "assetId",
        asset_no AS "assetNo",
        event_type AS "eventType",
        TO_CHAR(event_date, 'YYYY-MM-DD') AS "eventDate",
        customer_name AS "customerName",
        site_name AS "siteName",
        memo,
        created_at AS "createdAt"
    `,
      [
        asset.id,
        asset.asset_no,
        actorName || "입고담당자",
        auditDetails,
        effectiveInboundDate,
        fromCustomer,
        fromSite,
        logMemo,
      ]
    );

    await client.query("COMMIT");

    const createdLog = finishRes.rows[0]
      ? {
          ...finishRes.rows[0],
          serialNo: asset.serial_no || "",
          modelName: asset.model_name || "",
          manufacturer: asset.manufacturer || "",
        }
      : null;

    return {
      success: true,
      assetId: asset.id,
      assetNo: asset.asset_no,
      serialNo: asset.serial_no,
      fromCustomer,
      fromSite,
      inboundDate: effectiveInboundDate,
      nextStatus: targetNextStatus,
      deductedRate,
      remainingAssetCount,
      remainingMonthlyRate,
      updatedBilling,
      createdLog,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  }
}
