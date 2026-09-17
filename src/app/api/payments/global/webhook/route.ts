import { NextRequest, NextResponse } from "next/server";
import { createOrderAndIssueLicense } from "@/lib/licenseService";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // 1. Detect Gateway (Lemon Squeezy vs Stripe vs Generic Global)
    const eventName = body.meta?.event_name || body.type || body.event || "order_created";
    const customData = body.meta?.custom_data || body.data?.object?.metadata || body.custom_data || {};

    const customerEmail =
      body.data?.attributes?.user_email ||
      body.data?.object?.customer_email ||
      body.data?.object?.receipt_email ||
      customData.customerEmail ||
      body.customerEmail;

    const customerName =
      body.data?.attributes?.user_name ||
      body.data?.object?.customer_details?.name ||
      customData.customerName ||
      "Global Customer";

    const countryCode =
      body.data?.attributes?.country ||
      body.data?.object?.customer_details?.address?.country ||
      customData.countryCode ||
      "US";

    const languageCode = customData.languageCode || (countryCode === "JP" ? "ja" : countryCode === "KR" ? "ko" : "en");

    const productId = customData.productId || body.productId || "MANUAL_STUDIO";
    const planType = customData.planType || body.planType || "PERSONAL";

    const totalRaw =
      body.data?.attributes?.total ||
      body.data?.object?.amount_total ||
      body.amount ||
      2900;

    const currency = (
      body.data?.attributes?.currency ||
      body.data?.object?.currency ||
      body.currency ||
      "USD"
    ).toUpperCase();

    const amount = currency === "USD" ? Number(totalRaw) / (totalRaw > 500 ? 100 : 1) : Number(totalRaw);

    const orderNo = `GLOB_${Date.now()}_${body.data?.id || body.id || Math.random().toString(36).substring(7)}`;
    const gateway = body.meta?.event_name ? "LEMONSQUEEZY" : body.type ? "STRIPE" : "GLOBAL";

    if (!customerEmail) {
      console.warn("[Global Webhook] Received webhook without customer email:", body);
      return NextResponse.json({ received: true, status: "SKIPPED_NO_EMAIL" });
    }

    // Issue License
    const result = await createOrderAndIssueLicense({
      orderNo,
      productId,
      planType,
      customerName,
      customerEmail,
      countryCode,
      languageCode,
      amount,
      currency,
      gateway,
      paymentKey: String(body.data?.id || body.id || ""),
    });

    console.log(`[Global Webhook] ✅ Processed ${gateway} order: ${orderNo} ➔ ${result.license.license_key}`);

    return NextResponse.json({
      received: true,
      success: true,
      licenseKey: result.license.license_key,
      orderNo: result.order.order_no,
    });
  } catch (error: any) {
    console.error("[Global Webhook Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
