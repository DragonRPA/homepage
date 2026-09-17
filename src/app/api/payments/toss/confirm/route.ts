import { NextRequest, NextResponse } from "next/server";
import { createOrderAndIssueLicense } from "@/lib/licenseService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      paymentKey,
      orderId,
      amount,
      productId = "MANUAL_STUDIO",
      planType = "PERSONAL",
      customerName = "Customer",
      customerEmail,
      countryCode = "KR",
      languageCode = "ko",
    } = body;

    if (!orderId || !amount || !customerEmail) {
      return NextResponse.json(
        { success: false, error: "MISSING_REQUIRED_FIELDS", message: "필수 결제 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const tossSecretKey = process.env.TOSS_SECRET_KEY;
    let isApproved = true;

    // Real Toss Payments API Verification if secret key is present
    if (tossSecretKey && paymentKey) {
      const basicAuth = Buffer.from(`${tossSecretKey}:`).toString("base64");
      const confirmRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount,
        }),
      });

      if (!confirmRes.ok) {
        const errJson = await confirmRes.json();
        console.error("[Toss Confirm Error]", errJson);
        return NextResponse.json(
          { success: false, error: "PAYMENT_CONFIRM_FAILED", message: errJson.message || "토스 결제 승인에 실패했습니다." },
          { status: 400 }
        );
      }
    }

    // Issue License in Central DB
    const result = await createOrderAndIssueLicense({
      orderNo: orderId,
      productId,
      planType,
      customerName,
      customerEmail,
      countryCode,
      languageCode,
      amount: Number(amount),
      currency: "KRW",
      gateway: "TOSS",
      paymentKey,
    });

    return NextResponse.json({
      success: true,
      orderNo: result.order.order_no,
      licenseKey: result.license.license_key,
      productId: result.license.product_id,
      planType: result.license.plan_type,
      maxActivations: result.license.max_activations,
      customerEmail: result.license.customer_email,
      message: "결제가 성공적으로 승인되고 라이선스 키가 발급되었습니다.",
    });
  } catch (error: any) {
    console.error("[API Toss Confirm] Exception:", error);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: error.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
