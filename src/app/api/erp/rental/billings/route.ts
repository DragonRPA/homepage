import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";
import { resolveContractItemTemplate, resolveContractTaxItemsTemplate } from "@/lib/erpFormat";

// GET: List rental billings with contract, customer, site, asset details
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get("yearMonth"); // e.g. '2026-10'

    const pool = getErpPool();
    let query = `
      SELECT 
        b.id,
        b.billing_no as "billingNo",
        b.contract_id as "contractId",
        c.contract_no as "contractNo",
        c.entity_type as "entityType",
        c.customer_name as "customerName",
        c.site_name as "siteName",
        a.asset_no as "assetNo",
        rp.model_name as "modelName",
        b.year_month as "yearMonth",
        b.start_date as "startDate",
        b.end_date as "endDate",
        b.operating_days as "operatingDays",
        b.pro_rata_revenue as "proRataRevenue",
        COALESCE(NULLIF(b.vat_amount, 0), ROUND(b.pro_rata_revenue * 0.1)) as "vatAmount",
        COALESCE(NULLIF(b.total_amount, 0), ROUND(b.pro_rata_revenue * 1.1)) as "totalAmount",
        COALESCE(NULLIF(b.tax_purpose, ''), c.tax_purpose, '청구') as "taxPurpose",
        COALESCE(NULLIF(b.tax_memo, ''), c.tax_memo, '') as "taxMemo",
        CASE 
          WHEN b.tax_items IS NOT NULL AND jsonb_array_length(b.tax_items) > 0 THEN b.tax_items
          WHEN c.tax_items IS NOT NULL AND jsonb_array_length(c.tax_items) > 0 THEN c.tax_items
          ELSE '[]'::jsonb
        END as "taxItems",
        b.depreciation_cogs as "depreciationCogs",
        b.net_margin as "netMargin",
        b.billing_date as "billingDate",
        b.payment_status as "paymentStatus",
        b.paid_amount as "paidAmount",
        b.tax_invoice_id as "taxInvoiceId",
        ti.invoice_no as "taxInvoiceNo",
        b.created_at as "createdAt"
      FROM erp_rental_billings b
      JOIN erp_rental_contracts c ON b.contract_id = c.id
      LEFT JOIN erp_rental_assets a ON c.asset_id = a.id
      LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
      LEFT JOIN erp_tax_invoices ti ON b.tax_invoice_id = ti.id
    `;
    const params: any[] = [];
    if (yearMonth) {
      query += " WHERE b.year_month = $1";
      params.push(yearMonth);
    }
    query += " ORDER BY b.year_month DESC, b.id DESC";

    const res = await pool.query(query, params);
    return NextResponse.json({ success: true, billings: res.rows });
  } catch (error: any) {
    console.error("GET Rental Billings Error:", error);
    return NextResponse.json({ error: "임대 정산 대장 조회 실패" }, { status: 500 });
  }
}

// POST: Generate monthly rental billing with pro-rata calculation (헌장 4.1 일할 계산) & depreciation COGS
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractId, yearMonth, startDate, endDate, operatingDays, supplyAmount, vatAmount: customVat, taxPurpose, taxMemo, taxItems } = body;

    if (!contractId || !yearMonth || !startDate || !endDate) {
      return NextResponse.json({ error: "계약, 정산월, 기간은 필수입니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check duplicate billing for contract & yearMonth
      const dupCheck = await client.query(
        "SELECT id FROM erp_rental_billings WHERE contract_id = $1 AND year_month = $2",
        [contractId, yearMonth]
      );
      if (dupCheck.rows.length > 0) {
        throw new Error(`해당 계약의 [${yearMonth}] 정산 청구는 이미 생성되었습니다.`);
      }

      // 1. Fetch contract and asset (LEFT JOIN since customer master contract may hold multiple assets or asset_id may be null)
      const contractRes = await client.query(
        `SELECT c.id, c.contract_no, c.customer_name, c.monthly_rate, c.daily_rate, c.vat_amount, c.asset_id,
                c.tax_purpose, c.tax_memo, c.tax_items,
                a.asset_no, a.acquisition_cost, a.salvage_value, a.useful_life_years,
                rp.model_name
         FROM erp_rental_contracts c
         LEFT JOIN erp_rental_assets a ON c.asset_id = a.id
         LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
         WHERE c.id = $1`,
        [contractId]
      );
      if (contractRes.rows.length === 0) throw new Error("계약을 찾을 수 없습니다.");
      const c = contractRes.rows[0];

      // Fetch all currently rented assets for this customer contract to compute accurate depreciation COGS
      const rentedAssetsRes = await client.query(
        `SELECT a.id, a.asset_no, a.current_monthly_rate, a.acquisition_cost, a.salvage_value, a.useful_life_years,
                rp.model_name, rp.standard_monthly_rate
         FROM erp_rental_assets a
         LEFT JOIN erp_rental_products rp ON a.rental_product_id = rp.id
         WHERE a.status = 'RENTED' AND (a.current_contract_id = $1 OR a.current_customer = $2)
         ORDER BY a.outbound_date ASC NULLS LAST, a.id ASC`,
        [c.id, c.customer_name]
      );
      const rentedAssets = rentedAssetsRes.rows;

      const days = parseInt(operatingDays || "30", 10);
      const monthlyRate = parseFloat(c.monthly_rate || "0");
      const useProRata = body.useProRata === true;

      const resolvedItems = Array.isArray(taxItems) && taxItems.length > 0
        ? taxItems
        : Array.isArray(c.tax_items) && c.tax_items.length > 0
          ? c.tax_items
          : rentedAssets.map((ra: any) => {
              const rRate = Math.round(Number(ra.current_monthly_rate || ra.standard_monthly_rate || 0));
              return {
                assetId: ra.id,
                assetNo: ra.asset_no,
                itemName: `${ra.model_name || "임대장비"} (${ra.asset_no})`,
                spec: "",
                qty: 1,
                unitCost: rRate,
                supplyAmount: rRate,
                vatAmount: Math.round(rRate * 0.1),
                note: "",
              };
            });

      const itemsSupplySum = resolvedItems.reduce((acc: number, r: any) => acc + Number(r.supplyAmount || 0), 0);
      const itemsVatSum = resolvedItems.reduce((acc: number, r: any) => acc + Number(r.vatAmount || 0), 0);

      // 원칙: 월 임대료는 출고 시 입력한 단가로 정함 (특별한 경우 useProRata === true 일 때만 일할 계산)
      const proRataRevenue = supplyAmount !== undefined && supplyAmount !== null && supplyAmount !== ""
        ? Math.round(parseFloat(String(supplyAmount)))
        : useProRata
          ? Math.round((monthlyRate / 30) * days)
          : itemsSupplySum > 0
            ? Math.round(itemsSupplySum)
            : Math.round(monthlyRate);

      const vatAmount = customVat !== undefined && customVat !== null && customVat !== ""
        ? Math.round(parseFloat(String(customVat)))
        : !useProRata && itemsVatSum > 0
          ? Math.round(itemsVatSum)
          : !useProRata && parseFloat(c.vat_amount || "0") > 0
            ? Math.round(parseFloat(c.vat_amount))
            : Math.round(proRataRevenue * 0.1);

      const totalAmount = proRataRevenue + vatAmount;

      // 월 감가상각 매출원가 (고객에게 대여 중인 모든 자산의 월 상각비 합산)
      const deprecCogs = rentedAssets.length > 0
        ? rentedAssets.reduce((sum: number, ra: any) => {
            const totalMonths = Math.max(1, Number(ra.useful_life_years || 5) * 12);
            return sum + Math.round((Number(ra.acquisition_cost || 0) - Number(ra.salvage_value || 0)) / totalMonths);
          }, 0)
        : c.acquisition_cost
          ? Math.round((parseFloat(c.acquisition_cost) - parseFloat(c.salvage_value || "0")) / Math.max(1, (c.useful_life_years || 5) * 12))
          : 0;
      const netMargin = proRataRevenue - deprecCogs;

      const billingNo = `RB${yearMonth.replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      const fallbackFirst = c.model_name
        ? `${c.model_name}${c.asset_no ? ` (${c.asset_no})` : ""}`
        : (rentedAssets[0] ? `${rentedAssets[0].model_name || "임대장비"} (${rentedAssets[0].asset_no})` : "임대장비");
      const baseItems = resolvedItems.length > 0
        ? resolvedItems
        : [
            {
              itemName: fallbackFirst,
              spec: `${days}일`,
              qty: 1,
              unitCost: proRataRevenue,
              supplyAmount: proRataRevenue,
              vatAmount,
              note: "",
            },
          ];

      const finalItems = resolveContractTaxItemsTemplate(baseItems, {
        dateStr: yearMonth,
        fallbackFirstItem: fallbackFirst,
      });

      const rawMemoTemplate = taxMemo !== undefined ? taxMemo : (c.tax_memo || "{1번째 아이템} 외");
      const finalMemo = resolveContractItemTemplate(rawMemoTemplate, {
        dateStr: yearMonth,
        items: finalItems,
        fallbackFirstItem: finalItems[0]?.itemName || fallbackFirst,
      });

      const insRes = await client.query(
        `INSERT INTO erp_rental_billings
         (billing_no, contract_id, year_month, start_date, end_date, operating_days, 
          pro_rata_revenue, vat_amount, total_amount, tax_purpose, tax_memo, tax_items,
          depreciation_cogs, net_margin, billing_date, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, CURRENT_DATE, 'UNPAID')
         RETURNING *`,
        [
          billingNo,
          contractId,
          yearMonth,
          startDate,
          endDate,
          days,
          proRataRevenue,
          vatAmount,
          totalAmount,
          taxPurpose || c.tax_purpose || "청구",
          finalMemo,
          JSON.stringify(finalItems),
          deprecCogs,
          netMargin,
        ]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true, billing: insRes.rows[0] });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST Rental Billing Error:", error);
    return NextResponse.json({ error: "임대 정산 청구 등록 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: Delete rental billing
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 청구 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const checkRes = await pool.query(
      "SELECT id, billing_no, tax_invoice_id FROM erp_rental_billings WHERE id = $1",
      [parseInt(id, 10)]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: "해당 청구건을 찾을 수 없습니다." }, { status: 404 });
    }

    const billing = checkRes.rows[0];
    if (billing.tax_invoice_id) {
      return NextResponse.json({
        error: `해당 청구건은 이미 국세청 전자세금계산서가 발행되어 있어 삭제할 수 없습니다. (세금계산서 대장을 확인해 주십시오)`
      }, { status: 400 });
    }

    await pool.query("DELETE FROM erp_rental_billings WHERE id = $1", [parseInt(id, 10)]);

    return NextResponse.json({
      success: true,
      message: `임대 청구 [${billing.billing_no}] 내역이 성공적으로 삭제되었습니다.`
    });
  } catch (error: any) {
    console.error("DELETE Rental Billing Error:", error);
    return NextResponse.json({ error: "임대 청구 삭제 실패: " + error.message }, { status: 500 });
  }
}
