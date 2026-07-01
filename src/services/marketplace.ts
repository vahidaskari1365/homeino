// ====================================================================
// سرویس بازار - فقط محصولات واقعی از دیتابیس
// ====================================================================
// این سرویس تضمین می‌کند که همه محصولات استفاده شده در طراحی
// از دیتابیس مارکت‌پلیس می‌آیند و هیچ محصول ساختگی وجود ندارد.
// ====================================================================

import { supabase } from "@/integrations/supabase/client";

// ---- Types ----

export interface MarketplaceProduct {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  category_id: string | null;
  profile_id: string;
  stock: number;
  rating: number;
  description: string | null;
  attributes: Record<string, unknown>;
}

export interface MarketplaceStore {
  id: string;
  brand_name: string;
  city: string | null;
  phone: string | null;
  description: string | null;
}

export interface ProductUsageReport {
  products: MarketplaceProduct[];
  productIds: string[];
  storeIds: string[];
  storeNames: Record<string, string>;
  totalCost: number;
  productPrices: Record<string, number>;
  alternatives: Record<string, MarketplaceProduct[]>;
  categoryBreakdown: Record<string, { count: number; total: number }>;
}

// ---- Core Functions ----

/**
 * دریافت محصولات از مارکت‌پلیس بر اساس فیلترهای مختلف
 * همیشه از دیتابیس می‌آید - هیچ محصول ساختگی‌ای وجود ندارد
 */
export async function getMarketplaceProducts(options: {
  categorySlug?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
  excludeIds?: string[];
} = {}): Promise<MarketplaceProduct[]> {
  const {
    categorySlug,
    categoryId,
    limit = 50,
    offset = 0,
    minPrice,
    maxPrice,
    searchQuery,
    excludeIds = [],
  } = options;

  let query = supabase
    .from("products")
    .select("id, name, price, image_url, category_id, profile_id, stock, rating, description, attributes")
    .eq("is_active", true)
    .not("image_url", "is", null)
    .not("price", "is", null);

  // Filter by category
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  } else if (categorySlug) {
    // Look up category ID from slug
    const { data: cat } = await supabase
      .from("producer_categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();
    if (cat) {
      query = query.eq("category_id", cat.id);
    }
  }

  // Price range
  if (minPrice !== undefined) {
    query = query.gte("price", minPrice);
  }
  if (maxPrice !== undefined) {
    query = query.lte("price", maxPrice);
  }

  // Search
  if (searchQuery) {
    query = query.ilike("name", `%${searchQuery}%`);
  }

  // Exclude specific IDs
  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query
    .order("price", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("خطا در دریافت محصولات:", error);
    return [];
  }

  return (data || []) as MarketplaceProduct[];
}

/**
 * یافتن نزدیک‌ترین محصولات بازار به یک محصول خاص
 * برای زمانی که محصول دقیق در دسترس نیست
 */
export async function findClosestProducts(
  productName: string,
  categoryId: string | null,
  targetPrice: number,
  limit: number = 5
): Promise<MarketplaceProduct[]> {
  // First try to find products with similar names in the same category
  if (categoryId) {
    const nameWords = productName.split(/\s+/).filter(w => w.length > 1);
    
    for (const word of nameWords) {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, image_url, category_id, profile_id, stock, rating, description, attributes")
        .eq("is_active", true)
        .eq("category_id", categoryId)
        .not("image_url", "is", null)
        .not("price", "is", null)
        .ilike("name", `%${word}%`)
        .order("price", { ascending: true })
        .limit(limit);

      if (data && data.length > 0) {
        return data as MarketplaceProduct[];
      }
    }
  }

  // Fallback: get any products from the same category
  if (categoryId) {
    const { data } = await supabase
      .from("products")
      .select("id, name, price, image_url, category_id, profile_id, stock, rating, description, attributes")
      .eq("is_active", true)
      .eq("category_id", categoryId)
      .not("image_url", "is", null)
      .not("price", "is", null)
      .order("price", { ascending: true })
      .limit(limit);

    if (data && data.length > 0) {
      return data as MarketplaceProduct[];
    }
  }

  // Last resort: any active product
  const { data } = await supabase
    .from("products")
    .select("id, name, price, image_url, category_id, profile_id, stock, rating, description, attributes")
    .eq("is_active", true)
    .not("image_url", "is", null)
    .not("price", "is", null)
    .order("price", { ascending: true })
    .limit(limit);

  return (data || []) as MarketplaceProduct[];
}

/**
 * دریافت جایگزین‌های اقتصادی (ارزان‌تر) از بازار واقعی
 */
export async function getEconomyAlternatives(
  product: MarketplaceProduct,
  limit: number = 3
): Promise<MarketplaceProduct[]> {
  if (!product.price || !product.category_id) return [];

  const { data } = await supabase
    .from("products")
    .select("id, name, price, image_url, category_id, profile_id, stock, rating, description, attributes")
    .eq("is_active", true)
    .eq("category_id", product.category_id)
    .not("image_url", "is", null)
    .not("price", "is", null)
    .lt("price", product.price)
    .neq("id", product.id)
    .order("price", { ascending: false })
    .limit(limit);

  return (data || []) as MarketplaceProduct[];
}

/**
 * دریافت جایگزین‌های لوکس (گران‌تر) از بازار واقعی
 */
export async function getPremiumAlternatives(
  product: MarketplaceProduct,
  limit: number = 3
): Promise<MarketplaceProduct[]> {
  if (!product.price || !product.category_id) return [];

  const { data } = await supabase
    .from("products")
    .select("id, name, price, image_url, category_id, profile_id, stock, rating, description, attributes")
    .eq("is_active", true)
    .eq("category_id", product.category_id)
    .not("image_url", "is", null)
    .not("price", "is", null)
    .gt("price", product.price)
    .neq("id", product.id)
    .order("price", { ascending: true })
    .limit(limit);

  return (data || []) as MarketplaceProduct[];
}

/**
 * دریافت اطلاعات فروشگاه از دیتابیس
 */
export async function getStoreInfo(profileId: string): Promise<MarketplaceStore | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, brand_name, city, phone, description")
    .eq("id", profileId)
    .single();

  return data as MarketplaceStore | null;
}

/**
 * دریافت اطلاعات چند فروشگاه
 */
export async function getStoresInfo(profileIds: string[]): Promise<Record<string, MarketplaceStore>> {
  if (profileIds.length === 0) return {};

  const { data } = await supabase
    .from("profiles")
    .select("id, brand_name, city, phone, description")
    .in("id", profileIds);

  const map: Record<string, MarketplaceStore> = {};
  (data || []).forEach((store) => {
    map[store.id] = store as MarketplaceStore;
  });
  return map;
}

/**
 * اعتبارسنجی - آیا این محصول از مارکت‌پلیس است؟
 */
export async function validateProductFromMarketplace(productId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("is_active", true)
    .single();

  return !error && !!data;
}

/**
 * اعتبارسنجی - آیا همه محصولات از مارکت‌پلیس هستند؟
 */
export async function validateAllProductsFromMarketplace(
  productIds: string[]
): Promise<{ valid: boolean; invalidIds: string[] }> {
  if (productIds.length === 0) return { valid: true, invalidIds: [] };

  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", true)
    .in("id", productIds);

  const validIds = new Set((data || []).map((p) => p.id));
  const invalidIds = productIds.filter((id) => !validIds.has(id));

  return {
    valid: invalidIds.length === 0,
    invalidIds,
  };
}

/**
 * ساختن گزارش کامل از محصولات استفاده شده
 */
export async function buildProductUsageReport(
  products: MarketplaceProduct[]
): Promise<ProductUsageReport> {
  const productIds = products.map((p) => p.id);
  const storeIds = [...new Set(products.map((p) => p.profile_id))];
  const storeNames: Record<string, string> = {};
  const productPrices: Record<string, number> = {};
  const alternatives: Record<string, MarketplaceProduct[]> = {};
  const categoryBreakdown: Record<string, { count: number; total: number }> = {};

  // Get store info
  const stores = await getStoresInfo(storeIds);
  for (const store of Object.values(stores)) {
    storeNames[store.id] = store.brand_name;
  }

  // Build prices and breakdown
  let totalCost = 0;
  for (const p of products) {
    const price = Number(p.price) || 0;
    productPrices[p.id] = price;
    totalCost += price;

    // Category breakdown
    const catId = p.category_id || "unknown";
    if (!categoryBreakdown[catId]) {
      categoryBreakdown[catId] = { count: 0, total: 0 };
    }
    categoryBreakdown[catId].count++;
    categoryBreakdown[catId].total += price;

    // Find alternatives for each product
    const economyAlts = await getEconomyAlternatives(p, 2);
    const premiumAlts = await getPremiumAlternatives(p, 2);
    alternatives[p.id] = [...economyAlts, ...premiumAlts];
  }

  return {
    products,
    productIds,
    storeIds,
    storeNames,
    totalCost,
    productPrices,
    alternatives,
    categoryBreakdown,
  };
}