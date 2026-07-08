import type { Database } from "@/integrations/supabase/types";

export type Inspiration = Database["public"]["Tables"]["inspirations"]["Row"];

export type ContentType =
  | "inspiration"
  | "design_guide"
  | "buying_guide"
  | "product_comparison"
  | "before_after"
  | "room_makeover"
  | "designer_picks"
  | "trending_designs"
  | "ai_picks"
  | "top_products"
  | "top_stores"
  | "seasonal_collections"
  | "color_guides"
  | "material_guides"
  | "furniture_guide"
  | "curtain_guide"
  | "lighting_guide"
  | "decoration_guide"
  | "interior_tips"
  | "construction_tips"
  | "renovation_guide"
  | "project_showcase"
  | "customer_showcase"
  | "video"
  | "faq"
  | "news"
  | "service_guide";

export interface ContentHubItem extends Inspiration {
  content_type: ContentType;
  slug?: string;
  summary?: string;
  gallery?: string[];
  materials?: string[];
  reading_time?: number;
  popularity?: number;
  seo_title?: string;
  seo_description?: string;
  canonical_url?: string;
  is_featured?: boolean;
  video_url?: string;
  video_type?: string;
  before_image_url?: string;
  after_image_url?: string;
  designer_name?: string;
  completion_time?: string;
  is_project_showcase?: boolean;
  is_customer_showcase?: boolean;
  content_user_id?: string;
  brand?: string;
  store_id?: string;
}

export interface ContentRelation {
  id: string;
  source_content_id: string;
  target_content_id: string;
  relation_type: string;
  created_at: string;
}

export interface ContentProduct {
  id: string;
  content_id: string;
  product_id: string;
  relation_type: string;
  sort_order: number;
  product?: Database["public"]["Tables"]["products"]["Row"];
}

export interface ContentStore {
  id: string;
  content_id: string;
  store_id: string;
  store?: Database["public"]["Tables"]["stores"]["Row"];
}

export interface ContentService {
  id: string;
  content_id: string;
  service_type: string;
  service_id?: string;
}

export interface ContentView {
  id: string;
  content_id: string;
  user_id?: string;
  session_id?: string;
  referrer?: string;
  read_time_seconds?: number;
  created_at: string;
}

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  inspiration: "الهام دکوراسیون",
  design_guide: "راهنمای طراحی",
  buying_guide: "راهنمای خرید",
  product_comparison: "مقایسه محصولات",
  before_after: "قبل و بعد",
  room_makeover: "دگرگونی فضا",
  designer_picks: "انتخاب طراح",
  trending_designs: "ترندهای روز",
  ai_picks: "پیشنهاد هوش مصنوعی",
  top_products: "محصولات برتر",
  top_stores: "فروشگاه‌های برتر",
  seasonal_collections: "مجموعه‌های فصلی",
  color_guides: "راهنمای رنگ",
  material_guides: "راهنمای مصالح",
  furniture_guide: "راهنمای مبلمان",
  curtain_guide: "راهنمای پرده",
  lighting_guide: "راهنمای نورپردازی",
  decoration_guide: "راهنمای دکوراسیون",
  interior_tips: "نکات طراحی داخلی",
  construction_tips: "نکات ساختمانی",
  renovation_guide: "راهنمای بازسازی",
  project_showcase: "نمونه پروژه",
  customer_showcase: "نمونه مشتری",
  video: "ویدیو",
  faq: "سوالات متداول",
  news: "اخبار",
  service_guide: "راهنمای خدمات",
};

export const CONTENT_TYPE_ICONS: Record<string, string> = {
  inspiration: "✨",
  design_guide: "📐",
  buying_guide: "🛒",
  product_comparison: "⚖️",
  before_after: "🔄",
  room_makeover: "🏠",
  designer_picks: "👨‍🎨",
  trending_designs: "📈",
  ai_picks: "🤖",
  top_products: "⭐",
  top_stores: "🏪",
  seasonal_collections: "🌸",
  color_guides: "🎨",
  material_guides: "🧱",
  furniture_guide: "🛋️",
  curtain_guide: "🪟",
  lighting_guide: "💡",
  decoration_guide: "🎀",
  interior_tips: "💡",
  construction_tips: "🔨",
  renovation_guide: "🔧",
  project_showcase: "🏗️",
  customer_showcase: "👤",
  video: "🎬",
  faq: "❓",
  news: "📰",
  service_guide: "🛠️",
};

export const ROOM_LABELS: Record<string, string> = {
  living: "نشیمن",
  bedroom: "اتاق خواب",
  kitchen: "آشپزخانه",
  bathroom: "حمام و سرویس",
  office: "اتاق کار",
  dining: "ناهارخوری",
  outdoor: "فضای باز",
  hallway: "راهرو",
  balcony: "بالکن",
  kids: "اتاق کودک",
  study: "مطالعه",
  gym: "ورزشی",
  storage: "انباری",
};

export const STYLE_LABELS: Record<string, string> = {
  modern: "مدرن",
  classic: "کلاسیک",
  minimal: "مینیمال",
  luxury: "لوکس",
  traditional: "سنتی",
  industrial: "صنعتی",
  scandinavian: "اسکاندیناوی",
  bohemian: "بوهمی",
  contemporary: "معاصر",
  rustic: "روستیک",
  art_deco: "آرت دکو",
  mid_century: "میانه قرن",
  japandi: "جاپاندی",
  eclectic: "تلفیقی",
};
