import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, contactPerson, phone, email, serviceType, message } = body;

    if (!companyName || !contactPerson || !phone || !email || !message) {
      return NextResponse.json(
        { error: "필수 입력 항목이 누락되었습니다." },
        { status: 400 }
      );
    }

    // Server-side audit log
    console.log(`[Contact Submission] Date: ${new Date().toISOString()}`);
    console.log(`Company: ${companyName}, Person: ${contactPerson}, Phone: ${phone}, Email: ${email}`);
    console.log(`Type: ${serviceType}`);
    console.log(`Message: ${message}`);

    // In production, send via Resend API or SMTP:
    // const resendApiKey = process.env.RESEND_API_KEY;
    // await fetch('https://api.resend.com/emails', { ... });

    return NextResponse.json(
      {
        success: true,
        message: "상담 신청이 정상 접수되었습니다.",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Contact API Error]", error);
    return NextResponse.json(
      { error: "문의 처리 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}