import { NextResponse } from "next/server";
import { getErpPool } from "@/lib/supabaseErp";

// POST: Execute monthly straight-line depreciation for assets
export async function POST(request: Request) {
  try {
    const { yearMonth, actorName } = await request.json();
    const targetYm = yearMonth || new Date().toISOString().slice(0, 7); // YYYY-MM
    const actor = actorName || "ADMIN";

    const pool = getErpPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check if already executed for this month
      const checkRes = await client.query(
        "SELECT count(*) as count FROM erp_asset_depreciation_logs WHERE year_month = $1",
        [targetYm]
      );
      if (parseInt(checkRes.rows[0].count, 10) > 0) {
        return NextResponse.json(
          { error: `${targetYm}월 감가상각이 이미 마감 실행되었습니다.` },
          { status: 400 }
        );
      }

      // Fetch all eligible assets (not disposed and book_value > salvage_value)
      const assetRes = await client.query(
        `SELECT id, asset_no, acquisition_cost, salvage_value, useful_life_years, 
                accumulated_depreciation, book_value 
         FROM erp_rental_assets 
         WHERE status != 'DISPOSED' AND book_value > salvage_value`
      );

      const assets = assetRes.rows;
      let executedCount = 0;
      let totalDeprecAmount = 0;

      for (const a of assets) {
        const cost = parseFloat(a.acquisition_cost);
        const salvage = parseFloat(a.salvage_value);
        const currentAccum = parseFloat(a.accumulated_depreciation);
        const maxDeprec = Math.max(0, cost - salvage);

        // 정액법 월 감가상각비 = (취득원가 - 잔존가치) / (내용연수 * 12)
        const totalMonths = Math.max(1, a.useful_life_years * 12);
        let monthlyAmt = Math.round((cost - salvage) / totalMonths);

        // 잔존가치 미만으로 감가상각되지 않도록 상한 보정
        if (currentAccum + monthlyAmt > maxDeprec) {
          monthlyAmt = maxDeprec - currentAccum;
        }

        if (monthlyAmt > 0) {
          const newAccum = currentAccum + monthlyAmt;
          const newBookValue = cost - newAccum;

          // 1. Update asset table
          await client.query(
            `UPDATE erp_rental_assets 
             SET accumulated_depreciation = $1, book_value = $2, updated_at = NOW() 
             WHERE id = $3`,
            [newAccum, newBookValue, a.id]
          );

          // 2. Insert depreciation log
          await client.query(
            `INSERT INTO erp_asset_depreciation_logs 
             (asset_id, year_month, monthly_depreciation, accumulated_depreciation, book_value_after) 
             VALUES ($1, $2, $3, $4, $5)`,
            [a.id, targetYm, monthlyAmt, newAccum, newBookValue]
          );

          executedCount++;
          totalDeprecAmount += monthlyAmt;
        }
      }

      // Audit Log (헌장 1.2 무누락 저장)
      await client.query(
        `INSERT INTO erp_audit_logs (domain, action_type, record_id, actor_name, details)
         VALUES ('RENTAL_ASSET', 'DEPRECIATION_EXEC', $1, $2, $3)`,
        [targetYm, actor, JSON.stringify({ executedCount, totalDeprecAmount })]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: `${targetYm}월 총 ${executedCount}건의 자산에 대해 ₩${totalDeprecAmount.toLocaleString()} 감가상각이 마감되었습니다.`,
        executedCount,
        totalDeprecAmount,
      });
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Depreciation Execution Error:", error);
    return NextResponse.json({ error: "감가상각 마감 실행 실패: " + error.message }, { status: 500 });
  }
}
