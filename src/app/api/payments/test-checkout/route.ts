import { NextRequest, NextResponse } from "next/server";
import { createOrderAndIssueLicense } from "@/lib/licenseService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productId = "MANUAL_STUDIO",
      planType = "PERSONAL",
      customerName = "테스트 구매자",
      customerEmail = "buyer@dragonrpa.co.kr",
      countryCode = "KR",
      languageCode = "ko",
      amount = 33000,
      currency = "KRW",
    } = body;

    const result = await createOrderAndIssueLicense({
      productId,
      planType,
      customerName,
      customerEmail,
      countryCode,
      languageCode,
      amount: Number(amount),
      currency,
      gateway: "TEST",
      paymentKey: `TEST_KEY_${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      orderNo: result.order.order_no,
      licenseKey: result.license.license_key,
      productId: result.license.product_id,
      planType: result.license.plan_type,
      maxActivations: result.license.max_activations,
      customerEmail: result.license.customer_email,
      message: "모의 결제 및 라이선스 키 발급이 성공적으로 완료되었습니다.",
    });
  } catch (error: any) {
    console.error("[Test Checkout Error]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
