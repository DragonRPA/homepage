import { NextRequest, NextResponse } from "next/server";
import { lookupLicensesByEmail, deactivateMachine } from "@/lib/licenseService";
import { sendLicenseEmail } from "@/lib/emailService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, action, licenseKey, machineId } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "올바른 이메일 주소를 입력해주세요." },
        { status: 400 }
      );
    }

    if (action === "deactivate" && licenseKey && machineId) {
      await deactivateMachine(licenseKey, machineId);
      const updatedLicenses = await lookupLicensesByEmail(email);
      return NextResponse.json({
        success: true,
        licenses: updatedLicenses.map((l: any) => ({
          licenseKey: l.license_key,
          productId: l.product_id,
          planType: l.plan_type,
          status: l.status,
          maxActivations: l.max_activations,
          activeDevices: l.active_devices,
          devices: l.devices || [],
          createdAt: l.created_at,
        })),
        message: "선택한 PC 기기 등록이 성공적으로 해제되었습니다. 새 컴퓨터에서 라이선스를 다시 인증하실 수 있습니다.",
      });
    }

    const licenses = await lookupLicensesByEmail(email);

    if (licenses.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        licenses: [],
        message: "해당 이메일로 구매된 라이선스 내역을 찾을 수 없습니다.",
      });
    }

    // Auto resend emails for the found licenses
    for (const lic of licenses) {
      sendLicenseEmail({
        to: lic.customer_email,
        customerName: lic.customer_name || "Customer",
        licenseKey: lic.license_key,
        productId: lic.product_id,
        planType: lic.plan_type,
        amount: 0,
        currency: "KRW",
        countryCode: lic.country_code || "KR",
        languageCode: lic.language_code || "ko",
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      count: licenses.length,
      licenses: licenses.map((l: any) => ({
        licenseKey: l.license_key,
        productId: l.product_id,
        planType: l.plan_type,
        status: l.status,
        maxActivations: l.max_activations,
        activeDevices: l.active_devices,
        devices: l.devices || [],
        createdAt: l.created_at,
      })),
      message: `고객님의 이메일(${email})로 보유 중인 라이선스 ${licenses.length}건의 정보가 재발송되었습니다.`,
    });
  } catch (error: any) {
    console.error("[API License Lookup] Error:", error);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
