// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export interface ProfileCompletion {
  score: number;
  items: {
    label: string;
    key: string;
    completed: boolean;
    weight: number;
  }[];
}

export const profileService = {
  async getCompletion(userId: string): Promise<ProfileCompletion> {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    const { count: addressCount } = await supabase
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const items = [
      { label: "عکس پروفایل", key: "avatar", completed: !!profile?.avatar_url, weight: 10 },
      { label: "نام", key: "firstName", completed: !!profile?.first_name, weight: 8 },
      { label: "نام خانوادگی", key: "lastName", completed: !!profile?.last_name, weight: 7 },
      { label: "شماره تلفن", key: "phone", completed: !!profile?.phone, weight: 8 },
      { label: "تلفن تأیید شده", key: "phoneVerified", completed: !!profile?.phone_verified, weight: 7 },
      { label: "ایمیل", key: "email", completed: true, weight: 10 },
      { label: "آدرس", key: "address", completed: (addressCount ?? 0) > 0, weight: 15 },
      { label: "نوع ملک", key: "propertyType", completed: !!profile?.property_type, weight: 5 },
      { label: "متراژ", key: "area", completed: !!profile?.area_sqm, weight: 5 },
      { label: "تعداد اتاق", key: "roomCount", completed: !!profile?.room_count, weight: 5 },
      { label: "سبک مورد علاقه", key: "style", completed: !!profile?.preferred_style, weight: 4 },
      { label: "بودجه", key: "budget", completed: !!profile?.preferred_budget, weight: 3 },
      { label: "رنگ‌های مورد علاقه", key: "colors", completed: !!(profile?.favorite_colors && profile.favorite_colors.length > 0), weight: 3 },
      { label: "تلفن دوم", key: "secondaryPhone", completed: !!profile?.secondary_phone, weight: 5 },
    ];

    const score = Math.min(100, items.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0));
    return { score, items };
  },
};
