import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { resolveContractItemTemplate } from "@/lib/erpFormat";

function computeMonthlyProRata(
  yearMonth: string,
  contractStartDate: string,
  contractEndDate: string,
  monthlyRate: number,
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

  const isFullMonth = effStart === monthStart && effEnd === monthEnd;
  const proRataRevenue =
    operatingDays <= 0
      ? 0
      : isFullMonth
      ? Math.round(monthlyRate)
      : Math.min(Math.round(monthlyRate), Math.round((monthlyRate / 30) * operatingDays));

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

// GET /api/erp/inout
// Query params: yearMonth (default current YYYY-MM), lookup (optional assetNo or serialNo)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const yearMonth = searchParams.get("yearMonth") || defaultYm;
    const lookup = (searchParams.get("lookup") || "").trim();
    const mode = (searchParams.get("mode") || "ALL").toUpperCase();

    const pool = getErpPool();

    const [assetsRes, logsRes, partnersRes, billingsRes] = await Promise.all([
      // 1. Fetch all rental assets with product info and customer master contract info
      pool.query(`
        SELECT
          a.id,
          a.asset_no AS "assetNo",
          a.serial_no AS "serialNo",
          a.rental_product_id AS "rentalProductId",
          p.model_code AS "modelCode",
          p.model_name AS "modelName",
          p.category,
          p.manufacturer,
          COALESCE(p.standard_monthly_rate, 0)::numeric AS "standardMonthlyRate",
          COALESCE(p.standard_daily_rate, 0)::numeric AS "standardDailyRate",
          p.spec AS "productSpec",
          a.custom_spec AS "customSpec",
          a.owner_type AS "ownerType",
          a.status,
          a.current_customer AS "currentCustomer",
          a.current_site AS "currentSite",
          a.contract_no AS "contractNo",
          a.current_contract_id AS "currentContractId",
          COALESCE(a.current_monthly_rate, 0)::numeric AS "currentMonthlyRate",
          TO_CHAR(a.outbound_date, 'YYYY-MM-DD') AS "outboundDate",
          COALESCE(a.acquisition_cost, 0)::numeric AS "acquisitionCost",
          COALESCE(a.salvage_value, 0)::numeric AS "salvageValue",
          COALESCE(a.useful_life_years, 5)::int AS "usefulLifeYears",
          a.memo,
          c.id AS "activeContractId",
          c.contract_no AS "activeContractNo",
          c.customer_name AS "activeCustomerName",
          c.site_name AS "activeSiteName",
          c.entity_type AS "activeEntityType",
          TO_CHAR(c.start_date, 'YYYY-MM-DD') AS "activeStartDate",
          TO_CHAR(c.end_date, 'YYYY-MM-DD') AS "activeEndDate",
          COALESCE(NULLIF(a.current_monthly_rate, 0), p.standard_monthly_rate, c.monthly_rate, 0)::numeric AS "activeMonthlyRate"
        FROM erp_rental_assets a
        LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
        LEFT JOIN LATERAL (
          SELECT *
          FROM erp_rental_contracts rc
          WHERE (rc.id = a.current_contract_id OR rc.asset_id = a.id OR (a.current_customer IS NOT NULL AND rc.customer_name = a.current_customer))
            AND rc.status = 'ACTIVE'
          ORDER BY CASE WHEN rc.id = a.current_contract_id THEN 0 ELSE 1 END, rc.id ASC
          LIMIT 1
        ) c ON true
        ORDER BY a.asset_no ASC
      `),
      // 2. Fetch recent INBOUND / OUTBOUND logs
      pool.query(`
        SELECT
          l.id,
          l.asset_id AS "assetId",
          l.asset_no AS "assetNo",
          a.serial_no AS "serialNo",
          p.model_name AS "modelName",
          p.manufacturer,
          l.event_type AS "eventType",
          TO_CHAR(l.event_date, 'YYYY-MM-DD') AS "eventDate",
          l.customer_name AS "customerName",
          l.site_name AS "siteName",
          l.memo,
          l.created_at AS "createdAt"
        FROM erp_asset_inout_logs l
        LEFT JOIN erp_rental_assets a ON l.asset_id = a.id
        LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
        WHERE l.event_type IN ('OUTBOUND', 'INBOUND')
        ORDER BY l.event_date DESC, l.id DESC
        LIMIT 100
      `),
      // 3. Fetch customer list from erp_partners (skip if mode === 'INBOUND')
      mode === "INBOUND"
        ? Promise.resolve({ rows: [] })
        : pool.query(`
            SELECT DISTINCT name AS "customerName", business_no AS "businessNo", ceo_name AS "ceoName"
            FROM erp_partners
            WHERE partner_type IN ('CUSTOMER', 'BOTH') AND status = 'ACTIVE'
            ORDER BY name ASC
          `),
      // 4. Fetch monthly billings (skip if mode === 'INBOUND')
      mode === "INBOUND"
        ? Promise.resolve({ rows: [] })
        : pool.query(
            `
            SELECT
              b.id,
              b.billing_no AS "billingNo",
              b.contract_id AS "contractId",
              c.contract_no AS "contractNo",
              c.customer_name AS "customerName",
              c.site_name AS "siteName",
              c.entity_type AS "entityType",
              c.status AS "contractStatus",
              a.id AS "assetId",
              a.asset_no AS "assetNo",
              a.serial_no AS "serialNo",
              p.model_name AS "modelName",
              b.year_month AS "yearMonth",
              TO_CHAR(b.start_date, 'YYYY-MM-DD') AS "startDate",
              TO_CHAR(b.end_date, 'YYYY-MM-DD') AS "endDate",
              b.operating_days AS "operatingDays",
              COALESCE(c.monthly_rate, 0)::numeric AS "monthlyRate",
              COALESCE(b.pro_rata_revenue, 0)::numeric AS "proRataRevenue",
              COALESCE(b.depreciation_cogs, 0)::numeric AS "depreciationCogs",
              COALESCE(b.net_margin, 0)::numeric AS "netMargin",
              b.payment_status AS "paymentStatus"
            FROM erp_rental_billings b
            JOIN erp_rental_contracts c ON b.contract_id = c.id
            LEFT JOIN erp_rental_assets a ON c.asset_id = a.id
            LEFT JOIN erp_rental_products p ON a.rental_product_id = p.id
            WHERE b.year_month = $1
            ORDER BY c.customer_name ASC, b.id DESC
          `,
            [yearMonth]
          ),
    ]);

    // If lookup query is provided, also return matched asset directly
    let matchedAsset = null;
    if (lookup) {
      const qUpper = lookup.toUpperCase();
      matchedAsset =
        assetsRes.rows.find(
          (r) =>
            (r.assetNo && r.assetNo.toUpperCase() === qUpper) ||
            (r.serialNo && r.serialNo.toUpperCase() === qUpper)
        ) ||
        assetsRes.rows.find(
          (r) =>
            r.status === "RENTED" &&
            ((r.assetNo && r.assetNo.toUpperCase().includes(qUpper)) ||
              (r.serialNo && r.serialNo.toUpperCase().includes(qUpper)))
        ) ||
        assetsRes.rows.find(
          (r) =>
            (r.assetNo && r.assetNo.toUpperCase().includes(qUpper)) ||
            (r.serialNo && r.serialNo.toUpperCase().includes(qUpper))
        ) ||
        null;
    }

    // Group customer billing summary for the month
    const customerMap: Record<
      string,
      {
        customerName: string;
        assetCount: number;
        totalMonthlyRate: number;
        totalProRataRevenue: number;
        items: any[];
      }
    > = {};

    for (const row of billingsRes.rows) {
      const cust = row.customerName || "미지정";
      if (!customerMap[cust]) {
        customerMap[cust] = {
          customerName: cust,
          assetCount: 0,
          totalMonthlyRate: 0,
          totalProRataRevenue: 0,
          items: [],
        };
      }
      customerMap[cust].assetCount += 1;
      customerMap[cust].totalMonthlyRate += Number(row.monthlyRate || 0);
      customerMap[cust].totalProRataRevenue += Number(row.proRataRevenue || 0);
      customerMap[cust].items.push(row);
    }

    return NextResponse.json({
      success: true,
      yearMonth,
      assets: assetsRes.rows,
      matchedAsset,
      logs: logsRes.rows,
      partners: partnersRes.rows,
      billings: billingsRes.rows,
      customerBillingSummary: Object.values(customerMap),
    });
  } catch (error: any) {
    console.error("GET /api/erp/inout error:", error);
    return NextResponse.json(
      { error: "입출고 데이터 조회 실패: " + error.message },
      { status: 500 }
    );
  }
}

// POST /api/erp/inout
// Handles action: "OUTBOUND" | "INBOUND"
export async function POST(request: Request) {
  const pool = getErpPool();
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "OUTBOUND") {
      const {
        assetId,
        assetNo,
        customerName,
        siteName,
        billingStartDate,
        endDate,
        monthlyRate,
        entityType,
        deposit,
        memo,
        actorName,
        useProRata, // 특별한 경우에만 true로 전달받아 일할 계산, 기본은 false(출고 월단가 정액)
      } = body;

      if ((!assetId && !assetNo) || !customerName || !billingStartDate || monthlyRate === undefined) {
        return NextResponse.json(
          { error: "고객사명, 출고 자산, 청구 시작일, 월 단가는 필수 입력 항목입니다." },
          { status: 400 }
        );
      }

      const numMonthlyRate = Math.round(Number(monthlyRate));
      if (isNaN(numMonthlyRate) || numMonthlyRate < 0) {
        return NextResponse.json(
          { error: "유효한 월 단가를 입력해 주십시오." },
          { status: 400 }
        );
      }

      await client.query("BEGIN");

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
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "선택한 렌탈자산을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      const asset = assetRes.rows[0];
      if (asset.status === "RENTED") {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: `해당 자산(${asset.asset_no})은 이미 [${asset.current_customer || "타 고객사"}]에 출고(대여중) 상태입니다.`,
          },
          { status: 400 }
        );
      }

      const cleanCustomer = customerName.trim();
      const effectiveEndDate = endDate || "2099-12-31";
      const dailyRate = Math.round(numMonthlyRate / 30);

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
           monthly_rate, daily_rate, vat_amount, deposit, status, memo,
           customer_biz_no, customer_ceo_name, customer_address, customer_biz_type, customer_biz_class, customer_email,
           tax_purpose, tax_memo, tax_items)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE', $13, $14, $15, $16, $17, $18, $19, '청구', '{1번째 아이템} 외', '[]'::jsonb)
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
            dailyRate,
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

      // 3. Update asset status to RENTED and save outbound monthlyRate on the asset
      await client.query(
        `
        UPDATE erp_rental_assets
        SET status = 'RENTED',
            current_customer = $1,
            current_site = $2,
            contract_no = $3,
            current_contract_id = $4,
            current_monthly_rate = $5,
            outbound_date = $6,
            updated_at = NOW()
        WHERE id = $7
      `,
        [
          cleanCustomer,
          (siteName || "").trim() || contract.site_name || null,
          contract.contract_no,
          contract.id,
          numMonthlyRate,
          billingStartDate,
          asset.id,
        ]
      );

      // 4. 고객의 현재 출고(대여중)된 전체 자산을 집계하여 마스터 임대계약의 월 임대료 및 품목(tax_items)에 가산(+) 반영
      const rentedAssetsRes = await client.query(
        `SELECT a.id, a.asset_no, a.current_monthly_rate, a.outbound_date, a.current_site,
                a.acquisition_cost, a.salvage_value, a.useful_life_years,
                p.model_name, p.standard_monthly_rate
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
        const itemVat = Math.round(itemRate * 0.1);
        const outDt = ra.outbound_date ? String(ra.outbound_date).slice(0, 10) : billingStartDate;
        return {
          assetId: ra.id,
          assetNo: ra.asset_no,
          month: outDt.slice(5, 7) || mm,
          day: outDt.slice(8, 10) || dd,
          itemName: `${ra.model_name || "임대장비"} (${ra.asset_no})`,
          spec: ra.current_site || (siteName || "").trim() || "",
          qty: 1,
          unitCost: itemRate,
          supplyAmount: itemRate,
          vatAmount: itemVat,
          note: `출고일: ${outDt}`,
        };
      });

      const totalContractMonthlyRate = updatedTaxItems.reduce((acc: number, it: any) => acc + Number(it.supplyAmount || 0), 0);
      const totalContractVat = updatedTaxItems.reduce((acc: number, it: any) => acc + Number(it.vatAmount || 0), 0);
      const firstAssetId = rentedAssets[0]?.id || asset.id;

      const updatedCtRes = await client.query(
        `UPDATE erp_rental_contracts
         SET status = 'ACTIVE',
             asset_id = $1,
             site_name = COALESCE(NULLIF($2, ''), site_name),
             monthly_rate = $3,
             daily_rate = $4,
             vat_amount = $5,
             tax_memo = COALESCE(NULLIF(tax_memo, ''), '{1번째 아이템} 외'),
             tax_items = $6::jsonb
         WHERE id = $7
         RETURNING *`,
        [
          firstAssetId,
          (siteName || "").trim(),
          totalContractMonthlyRate,
          Math.round(totalContractMonthlyRate / 30),
          totalContractVat,
          JSON.stringify(updatedTaxItems),
          contract.id,
        ]
      );
      contract = updatedCtRes.rows[0];

      // 5. 당월 청구 생성/갱신 (원칙: 특별한 경우가 아니면 일할 임대료를 정하지 않고 출고 단가 정액으로 반영)
      const startYearMonth = billingStartDate.slice(0, 7);
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const monthsToBill = new Set<string>([startYearMonth]);
      if (currentYearMonth >= startYearMonth && currentYearMonth <= effectiveEndDate.slice(0, 7)) {
        monthsToBill.add(currentYearMonth);
      }

      const totalDeprecCogs = rentedAssets.reduce((sum: number, ra: any) => {
        const acq = Number(ra.acquisition_cost || 0);
        const salv = Number(ra.salvage_value || 0);
        const life = Math.max(1, Number(ra.useful_life_years || 5) * 12);
        return sum + Math.round((acq - salv) / life);
      }, 0);

      const createdBillings = [];
      for (const ym of monthsToBill) {
        const [yNum, mNum] = ym.split("-").map(Number);
        const lastDay = new Date(yNum, mNum, 0).getDate();
        const monthStart = `${ym}-01`;
        const monthEnd = `${ym}-${String(lastDay).padStart(2, "0")}`;

        let targetRevenue = totalContractMonthlyRate;
        let operatingDays = 30;
        let effStart = monthStart;
        let effEnd = monthEnd;

        if (useProRata === true) {
          const calc = computeMonthlyProRata(
            ym,
            billingStartDate,
            effectiveEndDate,
            numMonthlyRate,
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
          fallbackFirstItem: updatedTaxItems[0]?.itemName || `${asset.model_name || "임대장비"} (${asset.asset_no})`,
        });

        const existingBillRes = await client.query(
          `SELECT * FROM erp_rental_billings
           WHERE contract_id = $1 AND year_month = $2 AND tax_invoice_id IS NULL
           ORDER BY id DESC LIMIT 1`,
          [contract.id, ym]
        );

        if (existingBillRes.rows.length > 0) {
          const existingBill = existingBillRes.rows[0];
          const nextRevenue = useProRata === true
            ? Math.round(Number(existingBill.pro_rata_revenue || 0)) + targetRevenue
            : totalContractMonthlyRate;
          const nextVat = Math.round(nextRevenue * 0.1);
          const nextTotal = nextRevenue + nextVat;

          const updBillRes = await client.query(
            `UPDATE erp_rental_billings
             SET pro_rata_revenue = $1,
                 vat_amount = $2,
                 total_amount = $3,
                 tax_memo = $4,
                 tax_items = $5::jsonb,
                 depreciation_cogs = $6,
                 net_margin = $7
             WHERE id = $8
             RETURNING *`,
            [
              nextRevenue,
              nextVat,
              nextTotal,
              resolvedMemo,
              JSON.stringify(updatedTaxItems),
              totalDeprecCogs,
              nextRevenue - totalDeprecCogs,
              existingBill.id,
            ]
          );
          createdBillings.push(updBillRes.rows[0]);
        } else {
          const billingNo = `RB${ym.replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
          const billRes = await client.query(
            `
            INSERT INTO erp_rental_billings
            (billing_no, contract_id, year_month, start_date, end_date, operating_days,
             pro_rata_revenue, vat_amount, total_amount, tax_purpose, tax_memo, tax_items,
             depreciation_cogs, net_margin, billing_date, payment_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '청구', $10, $11::jsonb, $12, $13, CURRENT_DATE, 'UNPAID')
            RETURNING *
          `,
            [
              billingNo,
              contract.id,
              ym,
              effStart,
              effEnd,
              operatingDays,
              targetRevenue,
              targetVat,
              targetTotal,
              resolvedMemo,
              JSON.stringify(updatedTaxItems),
              totalDeprecCogs,
              netMargin,
            ]
          );
          createdBillings.push(billRes.rows[0]);
        }
      }

      // 6. Record OUTBOUND event in erp_asset_inout_logs
      const logMemo =
        memo ||
        `출고등록 완료 (고객계약: ${contract.contract_no}, 출고단가: ₩${numMonthlyRate.toLocaleString()} 가산 → 고객 총 ${rentedAssets.length}대 / 월 ₩${totalContractMonthlyRate.toLocaleString()})`;
      await client.query(
        `
        INSERT INTO erp_asset_inout_logs
        (asset_id, asset_no, event_type, event_date, customer_name, site_name, memo)
        VALUES ($1, $2, 'OUTBOUND', $3, $4, $5, $6)
      `,
        [
          asset.id,
          asset.asset_no,
          billingStartDate,
          cleanCustomer,
          (siteName || "").trim() || null,
          logMemo,
        ]
      );

      // 7. Record Audit Log
      await client.query(
        `
        INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
        VALUES ('RENTAL_INOUT', 'OUTBOUND', $1, $2, $3)
      `,
        [
          String(asset.asset_no),
          actorName || "출고담당자",
          JSON.stringify({
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
          }),
        ]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        contract,
        billing: createdBillings[0] || null,
        billings: createdBillings,
        assetNo: asset.asset_no,
        activeAssetCount: rentedAssets.length,
        totalContractMonthlyRate,
      });
    } else if (action === "INBOUND") {
      const { assetId, queryKey, inboundDate, nextStatus, memo, actorName } = body;

      if (!assetId && !queryKey) {
        return NextResponse.json(
          { error: "자산번호 또는 제조번호(시리얼번호)를 입력해 주십시오." },
          { status: 400 }
        );
      }

      const effectiveInboundDate = inboundDate || new Date().toISOString().split("T")[0];
      const targetNextStatus = nextStatus === "REPAIRING" ? "REPAIRING" : "AVAILABLE";

      await client.query("BEGIN");

      // 1. Find asset + product info + customer master contract
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
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "입력하신 자산번호 또는 제조번호와 일치하는 자산이 없습니다." },
          { status: 404 }
        );
      }

      const asset = assetRes.rows[0];
      const activeContractId = asset.active_contract_id || asset.current_contract_id || null;
      const fromCustomer =
        asset.active_customer_name || asset.current_customer || "미지정 고객사";
      const fromSite = asset.active_site_name || asset.current_site || null;
      const deductedRate = Math.round(Number(asset.current_monthly_rate || asset.standard_monthly_rate || 0));

      // 2. 먼저 반납된 자산의 상태를 AVAILABLE/REPAIRING으로 전환하고 고객 배정 해제
      await client.query(
        `UPDATE erp_rental_assets
         SET status = $1,
             current_customer = NULL,
             current_site = NULL,
             contract_no = NULL,
             current_contract_id = NULL,
             current_monthly_rate = 0,
             outbound_date = NULL,
             updated_at = NOW()
         WHERE id = $2`,
        [targetNextStatus, asset.id]
      );

      // 3. 고객의 마스터 임대계약에서 반납된 자산만 차감(-) 업데이트 (계약 자체는 고객 마스터로 ACTIVE 유지)
      let updatedBilling = null;
      let remainingAssetCount = 0;
      let remainingMonthlyRate = 0;

      if (activeContractId) {
        const remainingRes = await client.query(
          `SELECT a.id, a.asset_no, a.current_monthly_rate, a.outbound_date, a.current_site,
                  a.acquisition_cost, a.salvage_value, a.useful_life_years,
                  p.model_name, p.standard_monthly_rate
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
          const itemRate = Math.round(Number(ra.current_monthly_rate || ra.standard_monthly_rate || 0));
          const itemVat = Math.round(itemRate * 0.1);
          const outDt = ra.outbound_date ? String(ra.outbound_date).slice(0, 10) : effectiveInboundDate;
          return {
            assetId: ra.id,
            assetNo: ra.asset_no,
            month: outDt.slice(5, 7) || mm,
            day: outDt.slice(8, 10) || dd,
            itemName: `${ra.model_name || "임대장비"} (${ra.asset_no})`,
            spec: ra.current_site || fromSite || "",
            qty: 1,
            unitCost: itemRate,
            supplyAmount: itemRate,
            vatAmount: itemVat,
            note: `출고일: ${outDt}`,
          };
        });

        remainingMonthlyRate = nextTaxItems.reduce((acc: number, it: any) => acc + Number(it.supplyAmount || 0), 0);
        const remainingVat = nextTaxItems.reduce((acc: number, it: any) => acc + Number(it.vatAmount || 0), 0);
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
            Math.round(remainingMonthlyRate / 30),
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

        const resolvedMemo = resolveContractItemTemplate(asset.active_tax_memo || "{1번째 아이템} 외", {
          dateStr: inboundYm,
          items: nextTaxItems,
          fallbackFirstItem: nextTaxItems[0]?.itemName || `${asset.model_name || "임대장비"} (${asset.asset_no})`,
        });

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

      // 4. Insert INBOUND log and Audit Log
      const logMemo =
        memo ||
        `[${fromCustomer}${fromSite ? " / " + fromSite : ""}] 입고 완료 (단가 ₩${deductedRate.toLocaleString()} 차감 → 잔여 ${remainingAssetCount}대 / 월 ₩${remainingMonthlyRate.toLocaleString()})`;
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

      return NextResponse.json({
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
      });
    } else {
      return NextResponse.json({ error: "지원하지 않는 action입니다." }, { status: 400 });
    }
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("POST /api/erp/inout error:", error);
    return NextResponse.json(
      { error: "입출고 처리 실패: " + error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
