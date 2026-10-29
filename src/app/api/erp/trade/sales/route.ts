import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// GET: List all sales (optionally filter by entityType, or id for single contract file)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const entityType = searchParams.get("entityType");

    const pool = getErpPool();

    if (idParam) {
      const singleRes = await pool.query(
        `
        SELECT 
          id,
          sale_no AS "saleNo",
          customer_name AS "customerName",
          contract_file_url AS "contractFileUrl",
          contract_file_name AS "contractFileName"
        FROM erp_trade_sales
        WHERE id = $1
        LIMIT 1
        `,
        [parseInt(idParam, 10)]
      );
      if (singleRes.rows.length === 0) {
        return NextResponse.json({ error: "해당 판매 계약을 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({ success: true, sale: singleRes.rows[0] });
    }

    let query = `
      SELECT 
        s.id,
        s.sale_no as "saleNo",
        s.entity_type as "entityType",
        s.partner_id as "partnerId",
        s.sale_date as "saleDate",
        s.customer_name as "customerName",
        s.product_id as "productId",
        tp.sku_code as "skuCode",
        tp.name as "productName",
        tp.spec as "productSpec",
        tp.unit,
        s.qty,
        s.unit_price as "unitPrice",
        s.total_amount as "totalAmount",
        COALESCE(NULLIF(s.vat_amount, 0), ROUND(s.total_amount * 0.1)) as "vatAmount",
        s.cogs_amount as "cogsAmount",
        s.margin_amount as "marginAmount",
        CASE WHEN s.total_amount > 0 THEN ROUND((s.margin_amount / s.total_amount) * 100, 1) ELSE 0 END as "marginRate",
        s.status,
        s.memo,
        COALESCE(NULLIF(s.customer_biz_no, ''), p.business_no, '') as "customerBizNo",
        COALESCE(NULLIF(s.customer_ceo_name, ''), p.ceo_name, '') as "customerCeoName",
        COALESCE(NULLIF(s.customer_address, ''), CONCAT_WS(' ', p.address, p.address_detail), '') as "customerAddress",
        COALESCE(NULLIF(s.customer_biz_type, ''), p.biz_type, '') as "customerBizType",
        COALESCE(NULLIF(s.customer_biz_class, ''), p.biz_item, '') as "customerBizClass",
        COALESCE(NULLIF(s.customer_email, ''), p.main_email, '') as "customerEmail",
        COALESCE(s.customer_email2, '') as "customerEmail2",
        COALESCE(s.tax_purpose, '청구') as "taxPurpose",
        COALESCE(s.tax_memo, '') as "taxMemo",
        COALESCE(s.tax_items, '[]'::jsonb) as "taxItems",
        s.tax_invoice_id as "taxInvoiceId",
        ti.invoice_no as "taxInvoiceNo",
        s.contract_file_name as "contractFileName",
        (s.contract_file_url IS NOT NULL AND s.contract_file_url <> '') as "hasContractFile",
        s.created_at as "createdAt"
      FROM erp_trade_sales s
      LEFT JOIN erp_trade_products tp ON s.product_id = tp.id
      LEFT JOIN erp_partners p ON s.partner_id = p.id OR (s.partner_id IS NULL AND s.customer_name = p.name)
      LEFT JOIN erp_tax_invoices ti ON s.tax_invoice_id = ti.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (entityType && entityType !== "ALL") {
      params.push(entityType);
      query += ` AND s.entity_type = $${params.length}`;
    }
    query += " ORDER BY s.sale_date DESC, s.id DESC";

    const res = await pool.query(query, params);
    return NextResponse.json({ success: true, sales: res.rows });
  } catch (error: any) {
    console.error("GET Sales Error:", error);
    return NextResponse.json({ error: "판매 목록 조회 실패" }, { status: 500 });
  }
}

// POST: Register a sale/distribution contract (출고 1건당 1개의 계약, 1건에 여러 종의 제품 포함 가능)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      saleDate,
      partnerId,
      customerName,
      productId,
      qty,
      unitPrice,
      supplyAmount,
      vatAmount,
      items, // 다중 제품 배열: [{ productId, qty, unitPrice, supplyAmount, vatAmount, itemName, spec }]
      memo,
      entityType,
      customerBizNo,
      customerCeoName,
      customerAddress,
      customerBizType,
      customerBizClass,
      customerEmail,
      customerEmail2,
      taxPurpose,
      taxMemo,
      taxItems,
      contractFileUrl,
      contractFileName,
    } = body;

    const hasMultiItems = Array.isArray(items) && items.length > 0;
    if (!customerName || (!hasMultiItems && (!productId || !qty || unitPrice === undefined))) {
      return NextResponse.json({ error: "고객사 및 최소 1개 이상의 출고 상품 정보는 필수입니다." }, { status: 400 });
    }

    const assignedEntity = entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
    const effectiveSaleDate = saleDate || new Date().toISOString().split("T")[0];
    const mm = effectiveSaleDate.slice(5, 7);
    const dd = effectiveSaleDate.slice(8, 10);

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 다중 품목 정규화 및 상품별 재고 차감 / 원가(COGS) 합산
      const lineInputs = hasMultiItems
        ? items
        : [
            {
              productId,
              qty,
              unitPrice,
              supplyAmount,
              vatAmount,
            },
          ];

      let totalQty = 0;
      let totalSupply = 0;
      let totalVat = 0;
      let totalCogs = 0;
      let primaryProductId: number | null = null;
      let primaryUnitPrice = 0;
      let primaryProductName = "판매 상품";
      const builtTaxItems: any[] = [];

      for (let i = 0; i < lineInputs.length; i++) {
        const line = lineInputs[i];
        const lPid = line.productId ? parseInt(String(line.productId), 10) : null;
        const lQty = Math.max(1, parseInt(String(line.qty || 1), 10));
        const lPrice = Math.round(parseFloat(String(line.unitPrice ?? line.unitCost ?? 0)));
        const lSupply = line.supplyAmount !== undefined && line.supplyAmount !== null && line.supplyAmount !== ""
          ? Math.round(parseFloat(String(line.supplyAmount)))
          : lQty * lPrice;
        const lVat = line.vatAmount !== undefined && line.vatAmount !== null && line.vatAmount !== ""
          ? Math.round(parseFloat(String(line.vatAmount)))
          : Math.round(lSupply * 0.1);

        let prodName = line.itemName || line.productName || "판매 상품";
        let prodSpec = line.spec || "";
        let unitCost = 0;

        if (lPid) {
          const prodRes = await client.query(
            "SELECT id, standard_cost, current_stock, name, spec, sku_code FROM erp_trade_products WHERE id = $1 FOR UPDATE",
            [lPid]
          );
          if (prodRes.rows.length === 0) {
            throw new Error(`상품(ID: ${lPid})을 찾을 수 없습니다.`);
          }
          const prod = prodRes.rows[0];
          prodName = line.itemName || prod.name;
          prodSpec = line.spec || prod.spec || "";
          unitCost = parseFloat(prod.standard_cost || "0");

          // 재고 차감
          await client.query(
            `UPDATE erp_trade_products
             SET current_stock = current_stock - $1, updated_at = NOW()
             WHERE id = $2`,
            [lQty, lPid]
          );

          if (!primaryProductId) {
            primaryProductId = lPid;
            primaryUnitPrice = lPrice;
            primaryProductName = prod.name;
          }
        }

        totalQty += lQty;
        totalSupply += lSupply;
        totalVat += lVat;
        totalCogs += Math.round(lQty * unitCost);

        builtTaxItems.push({
          productId: lPid,
          month: line.month || mm,
          day: line.day || dd,
          itemName: prodName,
          spec: prodSpec,
          qty: lQty,
          unitCost: lPrice,
          unitPrice: lPrice,
          supplyAmount: lSupply,
          vatAmount: lVat,
          note: line.note || line.remark || "",
        });
      }

      if (!primaryProductId && productId) {
        primaryProductId = parseInt(String(productId), 10);
      }

      const finalTotalAmount = supplyAmount !== undefined && supplyAmount !== null && supplyAmount !== ""
        ? Math.round(parseFloat(String(supplyAmount)))
        : totalSupply;
      const finalVatAmount = vatAmount !== undefined && vatAmount !== null && vatAmount !== ""
        ? Math.round(parseFloat(String(vatAmount)))
        : totalVat;
      const marginAmount = finalTotalAmount - totalCogs;
      const saleNo = `SO${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      const normalizedTaxItems = Array.isArray(taxItems) && taxItems.length > 0
        ? taxItems.map((ti: any, idx: number) => ({
            ...ti,
            productId: ti.productId ?? builtTaxItems[idx]?.productId ?? null,
          }))
        : builtTaxItems;

      // Insert 1 sale contract for this outbound (출고 1건당 1개의 계약)
      const insRes = await client.query(
        `INSERT INTO erp_trade_sales 
         (sale_no, entity_type, partner_id, sale_date, customer_name, product_id, qty, unit_price,
          total_amount, vat_amount, cogs_amount, margin_amount, status, memo,
          customer_biz_no, customer_ceo_name, customer_address, customer_biz_type, customer_biz_class,
          customer_email, customer_email2, tax_purpose, tax_memo, tax_items,
          contract_file_url, contract_file_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
                 $9, $10, $11, $12, 'CONFIRMED', $13,
                 $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb, $24, $25)
         RETURNING *`,
        [
          saleNo,
          assignedEntity,
          partnerId ? parseInt(String(partnerId), 10) : null,
          effectiveSaleDate,
          customerName.trim(),
          primaryProductId,
          totalQty,
          primaryUnitPrice,
          finalTotalAmount,
          finalVatAmount,
          totalCogs,
          marginAmount,
          memo || "",
          customerBizNo || "",
          customerCeoName || "",
          customerAddress || "",
          customerBizType || "",
          customerBizClass || "",
          customerEmail || "",
          customerEmail2 || "",
          taxPurpose || "청구",
          taxMemo || "{1번째 아이템} 외",
          JSON.stringify(normalizedTaxItems),
          contractFileUrl || null,
          contractFileName || null,
        ]
      );

      // Audit log
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('TRADE', 'SALE', $1, 'ADMIN', $2)`,
        [
          saleNo,
          JSON.stringify({
            customerName,
            itemCount: normalizedTaxItems.length,
            qty: totalQty,
            totalAmount: finalTotalAmount,
            marginAmount,
            entityType: assignedEntity,
            primaryProductName,
          }),
        ]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true, sale: insRes.rows[0] });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST Sale Error:", error);
    return NextResponse.json({ error: "판매 등록 실패: " + error.message }, { status: 500 });
  }
}

// PUT: Update sale/distribution contract & tax invoice fields
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      entityType,
      partnerId,
      saleDate,
      customerName,
      qty,
      unitPrice,
      supplyAmount,
      vatAmount,
      memo,
      customerBizNo,
      customerCeoName,
      customerAddress,
      customerBizType,
      customerBizClass,
      customerEmail,
      customerEmail2,
      taxPurpose,
      taxMemo,
      taxItems,
      contractFileUrl,
      contractFileName,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "수정할 판매 계약 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingRes = await client.query(
        `SELECT s.id, s.sale_no, s.product_id, s.qty, s.tax_items, tp.standard_cost
         FROM erp_trade_sales s
         LEFT JOIN erp_trade_products tp ON s.product_id = tp.id
         WHERE s.id = $1 FOR UPDATE`,
        [parseInt(String(id), 10)]
      );
      if (existingRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "해당 판매 내역을 찾을 수 없습니다." }, { status: 404 });
      }
      const existing = existingRes.rows[0];

      const assignedEntity = entityType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORP";
      const parsedQty = parseInt(String(qty || existing.qty), 10);
      const parsedUnitPrice = parseFloat(String(unitPrice || "0"));
      const unitCost = parseFloat(existing.standard_cost || "0");
      const totalAmount = supplyAmount !== undefined && supplyAmount !== null && supplyAmount !== ""
        ? parseFloat(String(supplyAmount))
        : parsedQty * parsedUnitPrice;
      const parsedVat = vatAmount !== undefined && vatAmount !== null && vatAmount !== ""
        ? parseFloat(String(vatAmount))
        : Math.round(totalAmount * 0.1);
      const cogsAmount = parsedQty * unitCost;
      const marginAmount = totalAmount - cogsAmount;
      const normalizedTaxItems = Array.isArray(taxItems) ? JSON.stringify(taxItems) : null;

      // Adjust stock if qty changed
      const qtyDiff = parsedQty - parseInt(String(existing.qty), 10);
      if (qtyDiff !== 0) {
        await client.query(
          "UPDATE erp_trade_products SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2",
          [qtyDiff, existing.product_id]
        );
      }

      const updateRes = await client.query(
        `
        UPDATE erp_trade_sales
        SET
          entity_type = COALESCE($1, entity_type),
          partner_id = $2,
          sale_date = COALESCE($3, sale_date),
          customer_name = $4,
          qty = $5,
          unit_price = $6,
          total_amount = $7,
          vat_amount = $8,
          cogs_amount = $9,
          margin_amount = $10,
          memo = $11,
          customer_biz_no = COALESCE($12, customer_biz_no),
          customer_ceo_name = COALESCE($13, customer_ceo_name),
          customer_address = COALESCE($14, customer_address),
          customer_biz_type = COALESCE($15, customer_biz_type),
          customer_biz_class = COALESCE($16, customer_biz_class),
          customer_email = COALESCE($17, customer_email),
          customer_email2 = COALESCE($18, customer_email2),
          tax_purpose = COALESCE($19, tax_purpose),
          tax_memo = COALESCE($20, tax_memo),
          tax_items = COALESCE($21::jsonb, tax_items),
          contract_file_url = CASE WHEN $22::text = '__DELETE__' THEN NULL ELSE COALESCE($22, contract_file_url) END,
          contract_file_name = CASE WHEN $22::text = '__DELETE__' THEN NULL ELSE COALESCE($23, contract_file_name) END
        WHERE id = $24
        RETURNING *
        `,
        [
          assignedEntity,
          partnerId ? parseInt(String(partnerId), 10) : null,
          saleDate || null,
          customerName.trim(),
          parsedQty,
          parsedUnitPrice,
          totalAmount,
          parsedVat,
          cogsAmount,
          marginAmount,
          memo || "",
          customerBizNo !== undefined ? customerBizNo : null,
          customerCeoName !== undefined ? customerCeoName : null,
          customerAddress !== undefined ? customerAddress : null,
          customerBizType !== undefined ? customerBizType : null,
          customerBizClass !== undefined ? customerBizClass : null,
          customerEmail !== undefined ? customerEmail : null,
          customerEmail2 !== undefined ? customerEmail2 : null,
          taxPurpose || "청구",
          taxMemo !== undefined ? taxMemo : null,
          normalizedTaxItems,
          contractFileUrl || null,
          contractFileName || null,
          parseInt(String(id), 10),
        ]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true, sale: updateRes.rows[0], message: "판매 계약 정보가 수정되었습니다." });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("PUT Sale Error:", error);
    return NextResponse.json({ error: "판매 계약 수정 실패: " + error.message }, { status: 500 });
  }
}

// DELETE: Delete unissued sale record and restore stock
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 판매 ID가 필요합니다." }, { status: 400 });
    }

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const saleRes = await client.query(
        "SELECT id, sale_no, product_id, qty, tax_items, tax_invoice_id FROM erp_trade_sales WHERE id = $1 FOR UPDATE",
        [parseInt(id, 10)]
      );
      if (saleRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "해당 판매 내역을 찾을 수 없습니다." }, { status: 404 });
      }
      const sale = saleRes.rows[0];
      if (sale.tax_invoice_id) {
        await client.query("ROLLBACK");
        return NextResponse.json({
          error: "이미 세금계산서가 발행된 판매 내역은 삭제할 수 없습니다."
        }, { status: 400 });
      }

      // Restore stock for all items in the sale
      const itemsArr = Array.isArray(sale.tax_items) ? sale.tax_items : [];
      const itemsWithPid = itemsArr.filter((it: any) => it.productId);
      if (itemsWithPid.length > 0) {
        for (const it of itemsWithPid) {
          await client.query(
            "UPDATE erp_trade_products SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2",
            [Math.max(1, parseInt(String(it.qty || 1), 10)), parseInt(String(it.productId), 10)]
          );
        }
      } else if (sale.product_id) {
        await client.query(
          "UPDATE erp_trade_products SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2",
          [sale.qty, sale.product_id]
        );
      }

      await client.query("DELETE FROM erp_trade_sales WHERE id = $1", [parseInt(id, 10)]);
      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: `판매 [${sale.sale_no}] 내역이 삭제되었으며 재고가 복구되었습니다.`
      });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("DELETE Sale Error:", error);
    return NextResponse.json({ error: "판매 삭제 실패: " + error.message }, { status: 500 });
  }
}
