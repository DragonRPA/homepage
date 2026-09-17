// Multi-Lingual Realtime License Email Dispatcher
// Supported Languages: Korean (ko), English (en), Japanese (ja), Chinese (zh), German (de), Spanish (es), French (fr)

export interface SendLicenseEmailParams {
  to: string;
  customerName?: string;
  licenseKey: string;
  productId: string;
  planType: string;
  amount: number;
  currency: string;
  countryCode?: string;
  languageCode?: string;
}

interface EmailContent {
  subject: string;
  greeting: string;
  thanksText: string;
  keyHeader: string;
  productName: string;
  planName: string;
  guideTitle: string;
  step1: string;
  step2: string;
  step3: string;
  downloadBtnText: string;
  downloadUrl: string;
  footerNotice: string;
  companyName: string;
}

const PRODUCT_NAMES: Record<string, Record<string, string>> = {
  MANUAL_STUDIO: {
    ko: "매뉴얼 스튜디오 (Manual Studio)",
    en: "Manual Studio",
    ja: "マニュアルスタジオ (Manual Studio)",
    zh: "Manual Studio 智能手册制作工具",
    de: "Manual Studio",
    es: "Manual Studio",
    fr: "Manual Studio",
  },
  LABEL_STATION: {
    ko: "라벨스테이션 (Label Print Station)",
    en: "Label Print Station",
    ja: "ラベルステーション (Label Print Station)",
    zh: "Label Print Station 标签打印站",
    de: "Label Print Station",
    es: "Label Print Station",
    fr: "Label Print Station",
  },
};

const DOWNLOAD_URLS: Record<string, string> = {
  MANUAL_STUDIO: "https://www.dragonrpa.co.kr/downloads/ManualStudio_Setup_v1.4.0.exe",
  LABEL_STATION: "https://www.dragonrpa.co.kr/downloads/LabelStation_Setup_v1.0.0.exe",
};

/**
 * Resolves best language code from country code & language code
 */
function resolveLanguage(lang?: string, country?: string): string {
  if (lang && ["ko", "en", "ja", "zh", "de", "es", "fr"].includes(lang.toLowerCase())) {
    return lang.toLowerCase();
  }

  const c = (country || "").toUpperCase();
  if (c === "KR") return "ko";
  if (c === "JP") return "ja";
  if (["CN", "TW", "HK"].includes(c)) return "zh";
  if (["DE", "AT", "CH"].includes(c)) return "de";
  if (["ES", "MX", "AR", "CO", "CL"].includes(c)) return "es";
  if (["FR", "BE", "CA"].includes(c)) return "fr";

  return "en"; // Default fallback
}

/**
 * Builds localized email template dictionary
 */
function getLocalizedTemplate(lang: string, productId: string, planType: string): EmailContent {
  const pName = PRODUCT_NAMES[productId]?.[lang] || PRODUCT_NAMES[productId]?.en || "DragonRPA Software";
  const downloadUrl = DOWNLOAD_URLS[productId] || "https://www.dragonrpa.co.kr";

  const templates: Record<string, EmailContent> = {
    ko: {
      subject: `[드래곤RPA] ${pName} 정품 라이선스 키가 발급되었습니다.`,
      greeting: "고객님, 안녕하세요!",
      thanksText: `(주)드래곤알피에이의 [${pName}]를 구매해 주셔서 진심으로 감사드립니다. 고객님의 공식 정품 라이선스 키가 정상 발급되었습니다.`,
      keyHeader: "🔑 발급된 정품 라이선스 키",
      productName: pName,
      planName: planType === "BUSINESS" ? "기업용 영구 라이선스 (3 PC)" : "개인용 영구 라이선스 (1 PC)",
      guideTitle: "📌 [초간단 정품 인증 3단계]",
      step1: "1. 아래 다운로드 버튼을 눌러 최신 설치 파일을 다운로드하여 실행합니다.",
      step2: "2. 프로그램 상단 메뉴의 '라이선스 등록' 창을 엽니다.",
      step3: "3. 발급받으신 라이선스 키를 복사하여 붙여넣으시면 즉시 정품 활성화가 완료됩니다!",
      downloadBtnText: "📥 프로그램 설치 파일 다운로드",
      downloadUrl,
      footerNotice: "※ 본 메일은 영구 보관용 라이선스 증빙 메일입니다. PC 교체 시 본 키를 다시 사용할 수 있습니다.",
      companyName: "(주)드래곤알피에이 고객지원팀",
    },
    en: {
      subject: `[DragonRPA] Your Official License Key for ${pName} is Ready!`,
      greeting: "Hello, valued customer!",
      thanksText: `Thank you for purchasing ${pName} from DragonRPA Co., Ltd.! Your official lifetime license key has been generated successfully.`,
      keyHeader: "🔑 Your Official License Key",
      productName: pName,
      planName: planType === "BUSINESS" ? "Business Lifetime License (3 PCs)" : "Personal Lifetime License (1 PC)",
      guideTitle: "📌 [Quick 3-Step Activation Guide]",
      step1: "1. Click the download button below to get the latest software installer.",
      step2: "2. Launch the application and open the 'License Registration' dialog.",
      step3: "3. Copy & paste your license key above to activate your full product immediately!",
      downloadBtnText: "📥 Download Software Installer",
      downloadUrl,
      footerNotice: "※ Please keep this email safe. You can use this key to re-activate your software upon PC upgrade.",
      companyName: "DragonRPA Co., Ltd. Customer Support",
    },
    ja: {
      subject: `[DragonRPA] ${pName} 正規ライセンスキーが発行されました。`,
      greeting: "お客様、ご購入ありがとうございます！",
      thanksText: `DragonRPAの【${pName}】をご購入いただき、誠にありがとうございます。お客様の正規ライセンスキーが正常に発行されました。`,
      keyHeader: "🔑 発行された正規ライセンスキー",
      productName: pName,
      planName: planType === "BUSINESS" ? "ビジネス永久ライセンス (3 PC)" : "パーソナル永久ライセンス (1 PC)",
      guideTitle: "📌 【かんたん3ステップ認証ガイド】",
      step1: "1. 下記のダウンロードボタンから最新のインストーラーを取得してインストールします。",
      step2: "2. プログラムを起動し、上部メニューの「ライセンス登録」を開きます。",
      step3: "3. 上記のライセンスキーを貼り付けると、すぐに製品版としてアクティベートされます！",
      downloadBtnText: "📥 プログラムをダウンロード",
      downloadUrl,
      footerNotice: "※ 本メールは永久保存用のライセンス証明です。大切に保管してください。",
      companyName: "DragonRPA サポートチーム",
    },
    zh: {
      subject: `[DragonRPA] 您的 ${pName} 正版许可证密钥已成功生成`,
      greeting: "尊敬的客户，您好！",
      thanksText: `感谢您购买 DragonRPA 的【${pName}】！您的官方永久许可证密钥已成功生成。`,
      keyHeader: "🔑 您的正版许可证密钥",
      productName: pName,
      planName: planType === "BUSINESS" ? "企业永久版 (3台设备)" : "个人永久版 (1台设备)",
      guideTitle: "📌 【快速激活3步骤】",
      step1: "1. 点击下方按钮下载最新版安装程序并完成安装。",
      step2: "2. 打开软件，点击顶部菜单的“注册许可证”。",
      step3: "3. 复制并粘贴上方的许可证密钥，即可立即激活正版全功能！",
      downloadBtnText: "📥 下载安装包",
      downloadUrl,
      footerNotice: "※ 请妥善保管此邮件。更换电脑时可凭此密钥重新激活。",
      companyName: "DragonRPA 客户支持团队",
    },
    de: {
      subject: `[DragonRPA] Ihr Lizenzschlüssel für ${pName} ist bereit!`,
      greeting: "Hallo!",
      thanksText: `Vielen Dank für den Kauf von ${pName}. Ihr offizieller Lizenzschlüssel wurde erfolgreich generiert.`,
      keyHeader: "🔑 Ihr Lizenzschlüssel",
      productName: pName,
      planName: planType === "BUSINESS" ? "Business Lifetime (3 PCs)" : "Personal Lifetime (1 PC)",
      guideTitle: "📌 [Aktivierungsanleitung]",
      step1: "1. Laden Sie das Installationsprogramm herunter.",
      step2: "2. Starten Sie das Programm und öffnen Sie das Lizenzmenü.",
      step3: "3. Fügen Sie Ihren Schlüssel ein, um die Vollversion freizuschalten.",
      downloadBtnText: "📥 Jetzt herunterladen",
      downloadUrl,
      footerNotice: "※ Bitte bewahren Sie diese E-Mail für zukünftige Neuinstallationen gut auf.",
      companyName: "DragonRPA Support-Team",
    },
    es: {
      subject: `[DragonRPA] ¡Su clave de licencia para ${pName} está lista!`,
      greeting: "¡Hola!",
      thanksText: `¡Gracias por adquirir ${pName}! Su clave de licencia oficial de por vida ha sido generada con éxito.`,
      keyHeader: "🔑 Su Clave de Licencia",
      productName: pName,
      planName: planType === "BUSINESS" ? "Licencia Business (3 PCs)" : "Licencia Personal (1 PC)",
      guideTitle: "📌 [Guía de Activación en 3 Pasos]",
      step1: "1. Descargue el instalador con el botón de abajo.",
      step2: "2. Abra el programa e ingrese al diálogo de 'Registro de Licencia'.",
      step3: "3. Pegue su clave para activar todas las funciones inmediatamente.",
      downloadBtnText: "📥 Descargar Instalador",
      downloadUrl,
      footerNotice: "※ Conserve este correo para futuras reinstalaciones.",
      companyName: "Equipo de Soporte DragonRPA",
    },
    fr: {
      subject: `[DragonRPA] Votre clé de licence pour ${pName} est prête !`,
      greeting: "Bonjour !",
      thanksText: `Merci d'avoir acheté ${pName}. Votre clé de licence officielle à vie a été générée avec succès.`,
      keyHeader: "🔑 Votre Clé de Licence",
      productName: pName,
      planName: planType === "BUSINESS" ? "Licence Entreprise (3 PC)" : "Licence Personnelle (1 PC)",
      guideTitle: "📌 [Guide d'Activation en 3 Étapes]",
      step1: "1. Téléchargez le programme d'installation ci-dessous.",
      step2: "2. Lancez le logiciel et ouvrez la fenêtre d'enregistrement de licence.",
      step3: "3. Collez votre clé pour activer le produit immédiatement.",
      downloadBtnText: "📥 Télécharger le logiciel",
      downloadUrl,
      footerNotice: "※ Veuillez conserver cet e-mail pour vos réinstallations futures.",
      companyName: "Support Client DragonRPA",
    },
  };

  return templates[lang] || templates.en;
}

/**
 * Builds sleek, high-conversion HTML email
 */
function buildHtmlBody(t: EmailContent, key: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B1120; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #1E293B; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); border-bottom: 1px solid #334155;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; color: #38BDF8; letter-spacing: -0.5px;">DRAGON<span style="color: #F8FAFC;">RPA</span></span>
                  </td>
                  <td align="right">
                    <span style="font-size: 13px; font-weight: 600; color: #94A3B8; background-color: #334155; padding: 6px 14px; border-radius: 20px;">Official License</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 40px 24px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px;">${t.greeting}</h1>
              <p style="font-size: 15px; line-height: 1.6; color: #CBD5E1; margin: 0 0 28px;">${t.thanksText}</p>

              <!-- License Key Highlight Box -->
              <div style="background-color: #0F172A; border: 2px solid #3B82F6; border-radius: 12px; padding: 24px; margin-bottom: 28px; text-align: center;">
                <div style="font-size: 13px; font-weight: 600; color: #93C5FD; text-transform: uppercase; margin-bottom: 8px;">${t.keyHeader}</div>
                <div style="font-size: 22px; font-family: monospace; font-weight: 800; color: #FACC15; letter-spacing: 1.5px; word-break: break-all; padding: 12px; background-color: rgba(59, 130, 246, 0.1); border-radius: 8px; border: 1px dashed #3B82F6;">
                  ${key}
                </div>
                <div style="margin-top: 14px; font-size: 13px; color: #94A3B8;">
                  <strong>${t.productName}</strong> | ${t.planName}
                </div>
              </div>

              <!-- Activation Guide -->
              <div style="background-color: #1A2234; border-radius: 12px; padding: 20px; margin-bottom: 32px; border: 1px solid #2D3748;">
                <h3 style="font-size: 15px; font-weight: 700; color: #F8FAFC; margin: 0 0 12px;">${t.guideTitle}</h3>
                <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 6px 0;">${t.step1}</p>
                <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 6px 0;">${t.step2}</p>
                <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 6px 0;">${t.step3}</p>
              </div>

              <!-- CTA Download Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${t.downloadUrl}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                  ${t.downloadBtnText}
                </a>
              </div>

              <p style="font-size: 12px; line-height: 1.5; color: #64748B; margin: 0 0 8px;">${t.footerNotice}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #0F172A; border-top: 1px solid #334155; text-align: center; font-size: 12px; color: #64748B;">
              <p style="margin: 0 0 6px;">${t.companyName} | contact@dragonrpa.co.kr | <a href="https://www.dragonrpa.co.kr" style="color: #38BDF8; text-decoration: none;">www.dragonrpa.co.kr</a></p>
              <p style="margin: 0;">Sent to: ${email} | (주)드래곤알피에이 (DragonRPA Co., Ltd.)</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Sends real-time license email via Resend / SMTP, or fallback logger
 */
export async function sendLicenseEmail(params: SendLicenseEmailParams): Promise<boolean> {
  const { to, licenseKey, productId, planType, countryCode, languageCode } = params;

  const lang = resolveLanguage(languageCode, countryCode);
  const template = getLocalizedTemplate(lang, productId, planType);
  const htmlBody = buildHtmlBody(template, licenseKey, to);

  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "DragonRPA <license@dragonrpa.co.kr>",
          to: [to],
          subject: template.subject,
          html: htmlBody,
        }),
      });

      if (res.ok) {
        console.log(`[EmailService] ✅ Email dispatched to ${to} (${lang}) via Resend API`);
        return true;
      } else {
        const errorData = await res.json();
        console.warn(`[EmailService] Resend API responded with error:`, errorData);
      }
    } catch (err) {
      console.error(`[EmailService] Failed to send via Resend:`, err);
    }
  }

  // Local/Dev Simulation Logger
  console.log(`=================================================================`);
  console.log(`📧 [REALTIME EMAIL SIMULATOR]`);
  console.log(`   To: ${to}`);
  console.log(`   From: (주)드래곤알피에이 <license@dragonrpa.co.kr>`);
  console.log(`   Lang: ${lang.toUpperCase()} | Country: ${countryCode || "KR"}`);
  console.log(`   Subject: ${template.subject}`);
  console.log(`   License Key: ${licenseKey}`);
  console.log(`=================================================================`);

  return true;
}
