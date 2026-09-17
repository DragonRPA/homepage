import { sql } from "./db";
import crypto from "crypto";
import { sendLicenseEmail } from "./emailService";

export interface CreateOrderParams {
  orderNo?: string;
  productId: "MANUAL_STUDIO" | "LABEL_STATION" | "UNIVERSAL_RPA" | "ALL_PASS" | string;
  planType: "PERSONAL" | "BUSINESS" | "ENTERPRISE" | string;
  customerName?: string;
  customerEmail: string;
  countryCode?: string;
  languageCode?: string;
  amount: number;
  currency?: "KRW" | "USD" | string;
  gateway: "TOSS" | "LEMONSQUEEZY" | "STRIPE" | "TEST" | string;
  paymentKey?: string;
}

export interface LicenseVerificationParams {
  licenseKey: string;
  machineId: string;
  machineName?: string;
  clientVersion?: string;
}

// Product Prefix Map
const PRODUCT_CODE_MAP: Record<string, string> = {
  MANUAL_STUDIO: "MS",
  LABEL_STATION: "LS",
  UNIVERSAL_RPA: "UR",
  ALL_PASS: "ALL",
};

// Plan Prefix Map
const PLAN_CODE_MAP: Record<string, string> = {
  PERSONAL: "PERM",
  BUSINESS: "BIZ",
  ENTERPRISE: "ENT",
};

/**
 * Calculates a simple 4-char CRC16 checksum in hex
 */
function calculateChecksum(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Generates an unforgeable, human-readable license key
 * Format: DRAGON-[PROD]-[PLAN]-[RAND1]-[RAND2]-[CRC]
 * Example: DRAGON-MS-PERM-8F92-K3D1-C19A
 */
export function generateLicenseKey(productId: string, planType: string): string {
  const pCode = PRODUCT_CODE_MAP[productId] || "MS";
  const plCode = PLAN_CODE_MAP[planType] || "PERM";
  
  const rand1 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const rand2 = crypto.randomBytes(2).toString("hex").toUpperCase();
  
  const payload = `DRAGON-${pCode}-${plCode}-${rand1}-${rand2}`;
  const checksum = calculateChecksum(payload);
  
  return `${payload}-${checksum}`;
}

/**
 * Validates a license key's checksum format before DB lookup
 */
export function validateLicenseKeyFormat(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  const parts = key.trim().toUpperCase().split("-");
  if (parts.length !== 6 || parts[0] !== "DRAGON") return false;
  
  const payload = parts.slice(0, 5).join("-");
  const providedChecksum = parts[5];
  const expectedChecksum = calculateChecksum(payload);
  
  return providedChecksum === expectedChecksum;
}

/**
 * Creates order record and issues an unforgeable license key in DB.
 * Automatically triggers real-time multi-lingual confirmation email.
 */
export async function createOrderAndIssueLicense(params: CreateOrderParams) {
  const {
    productId,
    planType,
    customerName = "Customer",
    customerEmail,
    countryCode = "KR",
    languageCode = "ko",
    amount,
    currency = "KRW",
    gateway,
    paymentKey = null,
  } = params;

  const orderNo = params.orderNo || `ORD_${Date.now()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const maxActivations = planType === "BUSINESS" ? 3 : planType === "ENTERPRISE" ? 10 : 1;
  const licenseKey = generateLicenseKey(productId, planType);

  // 1. Insert Order
  const orderResult = await sql`
    INSERT INTO orders (
      order_no, product_id, plan_type, customer_name, customer_email,
      country_code, language_code, amount, currency, gateway, payment_key, status
    ) VALUES (
      ${orderNo}, ${productId}, ${planType}, ${customerName}, ${customerEmail},
      ${countryCode}, ${languageCode}, ${amount}, ${currency}, ${gateway}, ${paymentKey}, 'PAID'
    ) RETURNING id, order_no, created_at;
  `;

  const orderId = orderResult[0]?.id;

  // 2. Insert License
  const licenseResult = await sql`
    INSERT INTO licenses (
      license_key, order_id, product_id, plan_type, customer_name, customer_email,
      country_code, language_code, max_activations, status
    ) VALUES (
      ${licenseKey}, ${orderId}, ${productId}, ${planType}, ${customerName}, ${customerEmail},
      ${countryCode}, ${languageCode}, ${maxActivations}, 'ACTIVE'
    ) RETURNING *;
  `;

  const issuedLicense = licenseResult[0];

  // 3. Send Multi-Lingual Realtime Email (Non-blocking)
  sendLicenseEmail({
    to: customerEmail,
    customerName,
    licenseKey,
    productId,
    planType,
    amount,
    currency,
    countryCode,
    languageCode,
  }).catch((err) => {
    console.error("[LicenseService] Email send error:", err);
  });

  return {
    order: orderResult[0],
    license: issuedLicense,
  };
}

/**
 * Verifies client application license & binds hardware machine ID (Node-Lock)
 */
export async function verifyLicense(params: LicenseVerificationParams) {
  const { licenseKey, machineId, machineName = "Unknown PC" } = params;

  if (!licenseKey || !machineId) {
    return { valid: false, error: "INVALID_PARAMETERS", message: "라이선스 키와 기기 ID가 필요합니다." };
  }

  // Quick checksum format validation
  if (!validateLicenseKeyFormat(licenseKey)) {
    return { valid: false, error: "INVALID_KEY_FORMAT", message: "라이선스 키 형식이 올바르지 않습니다." };
  }

  // 1. Fetch license from DB
  const licenses = await sql`
    SELECT * FROM licenses WHERE license_key = ${licenseKey.trim().toUpperCase()};
  `;

  if (!licenses || licenses.length === 0) {
    return { valid: false, error: "KEY_NOT_FOUND", message: "등록되지 않은 라이선스 키입니다." };
  }

  const lic = licenses[0];

  if (lic.status === "REVOKED") {
    return { valid: false, error: "KEY_REVOKED", message: "사용이 정지된 라이선스 키입니다. 고객센터에 문의해주세요." };
  }

  if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
    return { valid: false, error: "KEY_EXPIRED", message: "라이선스 유효기간이 만료되었습니다." };
  }

  // 2. Fetch existing activations for this license
  const activations = await sql`
    SELECT * FROM license_activations WHERE license_key = ${lic.license_key};
  `;

  const existingActivation = activations.find((a: any) => a.machine_id === machineId);

  if (existingActivation) {
    // Already registered machine -> Update last_check_at
    await sql`
      UPDATE license_activations
      SET last_check_at = NOW(), machine_name = ${machineName}
      WHERE id = ${existingActivation.id};
    `;

    return {
      valid: true,
      status: "ACTIVE",
      productId: lic.product_id,
      planType: lic.plan_type,
      maxActivations: lic.max_activations,
      currentActivations: activations.length,
      customerEmail: lic.customer_email,
      message: "정품 인증이 성공적으로 확인되었습니다.",
    };
  }

  // New machine -> Check if slot is available
  if (activations.length >= lic.max_activations) {
    return {
      valid: false,
      error: "MAX_ACTIVATIONS_EXCEEDED",
      maxActivations: lic.max_activations,
      currentActivations: activations.length,
      message: `허용된 PC 등록 대수(${lic.max_activations}대)를 초과했습니다. 기존 PC 등록을 해제해주세요.`,
    };
  }

  // Register new machine
  await sql`
    INSERT INTO license_activations (license_key, machine_id, machine_name)
    VALUES (${lic.license_key}, ${machineId}, ${machineName});
  `;

  return {
    valid: true,
    status: "ACTIVE",
    productId: lic.product_id,
    planType: lic.plan_type,
    maxActivations: lic.max_activations,
    currentActivations: activations.length + 1,
    customerEmail: lic.customer_email,
    message: "새로운 PC 기기가 성공적으로 정품 등록되었습니다.",
  };
}

/**
 * Self-service lookup for all licenses and their active machines associated with an email
 */
export async function lookupLicensesByEmail(email: string) {
  if (!email || !email.includes("@")) {
    return [];
  }

  const cleanEmail = email.trim().toLowerCase();

  const licenses = await sql`
    SELECT l.*, 
           (SELECT COUNT(*)::int FROM license_activations a WHERE a.license_key = l.license_key) as active_devices
    FROM licenses l
    WHERE LOWER(l.customer_email) = ${cleanEmail}
    ORDER BY l.created_at DESC;
  `;

  if (!licenses || licenses.length === 0) {
    return [];
  }

  // Fetch activations for all found licenses
  const licenseKeys = licenses.map((l: any) => l.license_key);
  const allActivations = await sql`
    SELECT * FROM license_activations 
    WHERE license_key = ANY(${licenseKeys})
    ORDER BY activated_at ASC;
  `;

  // Map activations into each license object
  return licenses.map((lic: any) => {
    const devices = allActivations
      .filter((a: any) => a.license_key === lic.license_key)
      .map((a: any) => ({
        id: a.id,
        machineId: a.machine_id,
        machineName: a.machine_name || "Windows PC",
        activatedAt: a.activated_at,
        lastCheckAt: a.last_check_at,
      }));

    return {
      ...lic,
      devices,
    };
  });
}

/**
 * Deactivates a specific machine from a license
 */
export async function deactivateMachine(licenseKey: string, machineId: string) {
  await sql`
    DELETE FROM license_activations 
    WHERE license_key = ${licenseKey.trim().toUpperCase()} AND machine_id = ${machineId};
  `;
  return { success: true, message: "기기 등록이 성공적으로 해제되었습니다." };
}

