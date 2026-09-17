import { sql } from "./db";

export interface ProductPlan {
  id?: number;
  productId: string;
  planType: string;
  planName: string;
  planBadge?: string;
  priceKrw: number;
  priceUsd: number;
  maxActivations: number;
  deviceDesc: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  version: string;
  badge: string;
  summary: string;
  features: string[];
  iconType: string;
  detailUrl: string;
  downloadUrl: string;
  isPublished: boolean;
  sortOrder: number;
  plans: ProductPlan[];
}

/**
 * Fetches all published products and active plans for the public store page
 */
export async function getPublishedProducts(): Promise<Product[]> {
  try {
    const products = await sql`
      SELECT * FROM products 
      WHERE is_published = TRUE 
      ORDER BY sort_order ASC, created_at ASC;
    `;

    if (!products || products.length === 0) {
      return [];
    }

    const productIds = products.map((p: any) => p.id);

    const plans = await sql`
      SELECT * FROM product_plans 
      WHERE product_id = ANY(${productIds}) AND is_active = TRUE 
      ORDER BY sort_order ASC, price_krw ASC;
    `;

    return products.map((p: any) => {
      const productPlans = plans
        .filter((plan: any) => plan.product_id === p.id)
        .map((plan: any) => ({
          id: plan.id,
          productId: plan.product_id,
          planType: plan.plan_type,
          planName: plan.plan_name,
          planBadge: plan.plan_badge,
          priceKrw: Number(plan.price_krw),
          priceUsd: Number(plan.price_usd),
          maxActivations: Number(plan.max_activations),
          deviceDesc: plan.device_desc,
          isActive: Boolean(plan.is_active),
          sortOrder: Number(plan.sort_order),
        }));

      return {
        id: p.id,
        name: p.name,
        nameEn: p.name_en,
        version: p.version,
        badge: p.badge,
        summary: p.summary,
        features: Array.isArray(p.features) ? p.features : typeof p.features === "string" ? JSON.parse(p.features) : [],
        iconType: p.icon_type,
        detailUrl: p.detail_url,
        downloadUrl: p.download_url,
        isPublished: Boolean(p.is_published),
        sortOrder: Number(p.sort_order),
        plans: productPlans,
      };
    });
  } catch (error) {
    console.error("[ProductService] Error fetching published products:", error);
    return [];
  }
}

/**
 * Fetches all products and plans including unpublished ones for admin management
 */
export async function getAllProductsForAdmin(): Promise<Product[]> {
  try {
    const products = await sql`
      SELECT * FROM products 
      ORDER BY sort_order ASC, created_at ASC;
    `;

    const plans = await sql`
      SELECT * FROM product_plans 
      ORDER BY sort_order ASC, price_krw ASC;
    `;

    return products.map((p: any) => {
      const productPlans = plans
        .filter((plan: any) => plan.product_id === p.id)
        .map((plan: any) => ({
          id: plan.id,
          productId: plan.product_id,
          planType: plan.plan_type,
          planName: plan.plan_name,
          planBadge: plan.plan_badge,
          priceKrw: Number(plan.price_krw),
          priceUsd: Number(plan.price_usd),
          maxActivations: Number(plan.max_activations),
          deviceDesc: plan.device_desc,
          isActive: Boolean(plan.is_active),
          sortOrder: Number(plan.sort_order),
        }));

      return {
        id: p.id,
        name: p.name,
        nameEn: p.name_en,
        version: p.version,
        badge: p.badge,
        summary: p.summary,
        features: Array.isArray(p.features) ? p.features : typeof p.features === "string" ? JSON.parse(p.features) : [],
        iconType: p.icon_type,
        detailUrl: p.detail_url,
        downloadUrl: p.download_url,
        isPublished: Boolean(p.is_published),
        sortOrder: Number(p.sort_order),
        plans: productPlans,
      };
    });
  } catch (error) {
    console.error("[ProductService] Error fetching all products for admin:", error);
    return [];
  }
}

/**
 * Updates a product's basic info or publish status
 */
export async function updateProduct(id: string, updates: Partial<Product>) {
  const {
    name,
    nameEn,
    version,
    badge,
    summary,
    features,
    iconType,
    detailUrl,
    downloadUrl,
    isPublished,
    sortOrder,
  } = updates;

  await sql`
    UPDATE products SET
      name = COALESCE(${name}, name),
      name_en = COALESCE(${nameEn}, name_en),
      version = COALESCE(${version}, version),
      badge = COALESCE(${badge}, badge),
      summary = COALESCE(${summary}, summary),
      features = COALESCE(${features ? JSON.stringify(features) : null}::jsonb, features),
      icon_type = COALESCE(${iconType}, icon_type),
      detail_url = COALESCE(${detailUrl}, detail_url),
      download_url = COALESCE(${downloadUrl}, download_url),
      is_published = COALESCE(${isPublished}, is_published),
      sort_order = COALESCE(${sortOrder}, sort_order),
      updated_at = NOW()
    WHERE id = ${id};
  `;

  return { success: true };
}

/**
 * Updates a product plan's pricing, device slots, or active status
 */
export async function updateProductPlan(
  productId: string,
  planType: string,
  updates: Partial<ProductPlan>
) {
  const {
    planName,
    planBadge,
    priceKrw,
    priceUsd,
    maxActivations,
    deviceDesc,
    isActive,
    sortOrder,
  } = updates;

  await sql`
    UPDATE product_plans SET
      plan_name = COALESCE(${planName}, plan_name),
      plan_badge = COALESCE(${planBadge}, plan_badge),
      price_krw = COALESCE(${priceKrw}, price_krw),
      price_usd = COALESCE(${priceUsd}, price_usd),
      max_activations = COALESCE(${maxActivations}, max_activations),
      device_desc = COALESCE(${deviceDesc}, device_desc),
      is_active = COALESCE(${isActive}, is_active),
      sort_order = COALESCE(${sortOrder}, sort_order),
      updated_at = NOW()
    WHERE product_id = ${productId} AND plan_type = ${planType};
  `;

  return { success: true };
}

/**
 * Inserts or Upserts a Product and its Plans
 */
export async function upsertProductWithPlans(product: Product) {
  await sql`
    INSERT INTO products (
      id, name, name_en, version, badge, summary, features, icon_type, detail_url, download_url, is_published, sort_order
    ) VALUES (
      ${product.id}, ${product.name}, ${product.nameEn || ""}, ${product.version || "v1.0.0"}, 
      ${product.badge || ""}, ${product.summary || ""}, ${JSON.stringify(product.features || [])}::jsonb, 
      ${product.iconType || "file"}, ${product.detailUrl || ""}, ${product.downloadUrl || ""}, 
      ${product.isPublished ?? true}, ${product.sortOrder || 1}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      name_en = EXCLUDED.name_en,
      version = EXCLUDED.version,
      badge = EXCLUDED.badge,
      summary = EXCLUDED.summary,
      features = EXCLUDED.features,
      icon_type = EXCLUDED.icon_type,
      detail_url = EXCLUDED.detail_url,
      download_url = EXCLUDED.download_url,
      is_published = EXCLUDED.is_published,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW();
  `;

  if (product.plans && product.plans.length > 0) {
    for (const plan of product.plans) {
      await sql`
        INSERT INTO product_plans (
          product_id, plan_type, plan_name, plan_badge, price_krw, price_usd, max_activations, device_desc, is_active, sort_order
        ) VALUES (
          ${product.id}, ${plan.planType}, ${plan.planName}, ${plan.planBadge || ""}, 
          ${plan.priceKrw}, ${plan.priceUsd}, ${plan.maxActivations || 1}, ${plan.deviceDesc}, 
          ${plan.isActive ?? true}, ${plan.sortOrder || 1}
        )
        ON CONFLICT (product_id, plan_type) DO UPDATE SET
          plan_name = EXCLUDED.plan_name,
          plan_badge = EXCLUDED.plan_badge,
          price_krw = EXCLUDED.price_krw,
          price_usd = EXCLUDED.price_usd,
          max_activations = EXCLUDED.max_activations,
          device_desc = EXCLUDED.device_desc,
          is_active = EXCLUDED.is_active,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW();
      `;
    }
  }

  return { success: true };
}

/**
 * Deletes a product and its associated plans
 */
export async function deleteProduct(id: string) {
  await sql`DELETE FROM products WHERE id = ${id};`;
  return { success: true };
}
