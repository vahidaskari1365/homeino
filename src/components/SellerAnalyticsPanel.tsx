import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye, Sparkles, MousePointerClick, Heart, Trophy, Crown, Star, TrendingUp,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

// ============================================================
// Homeino — Seller Dashboard: AI Analytics & Subscription
// ============================================================
// The primary revenue dashboard section. Reads exclusively from the REAL,
// live schema (`stores`, `products`, `store_subscriptions`,
// `subscription_plans`, and the `get_store_product_analytics` SECURITY
// DEFINER RPC) — it does not depend on any other part of the seller
// dashboard, so it degrades gracefully if the user has no store yet.
//
// Does NOT implement checkout or payment; "ارتقا اشتراک" only links to the
// /billing placeholder, consistent with "architecture only, no payment
// gateway yet".
// ============================================================

type Store = Tables<"stores">;
type SubscriptionPlan = Tables<"subscription_plans">;
type StoreSubscription = Tables<"store_subscriptions">;
type ProductAnalyticsRow = {
  product_id: string; product_name: string;
  views: number; clicks: number; saves: number; ai_recommendations: number;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  trialing: { label: "دوره آزمایشی", color: "bg-blue-100 text-blue-700 border-blue-200" },
  active: { label: "فعال", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  past_due: { label: "پرداخت معوق", color: "bg-amber-100 text-amber-700 border-amber-200" },
  canceled: { label: "لغو شده", color: "bg-rose-100 text-rose-700 border-rose-200" },
  none: { label: "بدون اشتراک", color: "bg-muted text-muted-foreground" },
};

export const SellerAnalyticsPanel = ({ ownerId }: { ownerId: string }) => {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [subscription, setSubscription] = useState<(StoreSubscription & { subscription_plans: SubscriptionPlan | null }) | null>(null);
  const [rows, setRows] = useState<ProductAnalyticsRow[]>([]);
  const [featuredCount, setFeaturedCount] = useState(0);
  const [storeCount, setStoreCount] = useState(0);
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: storeRow } = await supabase.from("stores").select("*").eq("owner_id", ownerId).maybeSingle();
      if (!storeRow) { setLoading(false); return; }
      setStore(storeRow);

      const [subRes, analyticsRes, featuredRes, allStoresRes] = await Promise.all([
        supabase.from("store_subscriptions").select("*, subscription_plans(*)").eq("store_id", storeRow.id).maybeSingle(),
        supabase.rpc("get_store_product_analytics", { p_store_id: storeRow.id }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeRow.id).eq("is_featured", true),
        supabase.from("stores").select("id, rating").order("rating", { ascending: false }),
      ]);

      if (subRes.data) setSubscription(subRes.data as typeof subscription);
      if (analyticsRes.data) setRows(analyticsRes.data as ProductAnalyticsRow[]);
      setFeaturedCount(featuredRes.count ?? 0);
      if (allStoresRes.data) {
        setStoreCount(allStoresRes.data.length);
        const idx = allStoresRes.data.findIndex((s) => s.id === storeRow.id);
        setRank(idx >= 0 ? idx + 1 : null);
      }
      setLoading(false);
    })();
  }, [ownerId]);

  if (loading) return null;
  if (!store) return null;

  const totals = rows.reduce(
    (acc, r) => ({
      views: acc.views + (r.views || 0),
      clicks: acc.clicks + (r.clicks || 0),
      saves: acc.saves + (r.saves || 0),
      ai: acc.ai + (r.ai_recommendations || 0),
    }),
    { views: 0, clicks: 0, saves: 0, ai: 0 }
  );

  const plan = subscription?.subscription_plans;
  const status = subscription?.status ?? "none";

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Eye size={18} />} label="بازدید محصولات" value={totals.views} color="blue" />
        <StatCard icon={<Sparkles size={18} />} label="پیشنهاد هوش مصنوعی" value={totals.ai} color="emerald" />
        <StatCard icon={<MousePointerClick size={18} />} label="کلیک محصولات" value={totals.clicks} color="purple" />
        <StatCard icon={<Heart size={18} />} label="محصولات ذخیره‌شده" value={totals.saves} color="rose" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><Trophy size={18} /></div>
            <div>
              <p className="text-xs text-muted-foreground">رتبه فروشگاه</p>
              <p className="font-bold">{rank ? `${rank.toLocaleString("fa-IR")} از ${storeCount.toLocaleString("fa-IR")}` : "—"}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Star size={10} className="fill-amber-400 text-amber-400" /> امتیاز {store.rating?.toLocaleString("fa-IR") ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0"><Crown size={18} /></div>
              <div>
                <p className="text-xs text-muted-foreground">وضعیت اشتراک</p>
                <p className="font-bold">{plan?.name ?? "بدون پلن"}</p>
              </div>
            </div>
            <Badge variant="outline" className={STATUS_LABEL[status]?.color}>{STATUS_LABEL[status]?.label}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0"><TrendingUp size={18} /></div>
              <div>
                <p className="text-xs text-muted-foreground">محصولات ویژه</p>
                <p className="font-bold">{featuredCount.toLocaleString("fa-IR")} / {plan?.max_featured ?? 0}</p>
              </div>
            </div>
            <Link to="/billing"><Button size="sm" variant="outline" className="text-xs">ارتقا اشتراک</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600",
  emerald: "bg-emerald-100 text-emerald-600",
  purple: "bg-purple-100 text-purple-600",
  rose: "bg-rose-100 text-rose-600",
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: keyof typeof COLOR_CLASSES }) => (
  <Card>
    <CardContent className="p-4">
      <div className={`h-9 w-9 rounded-full flex items-center justify-center mb-2 ${COLOR_CLASSES[color]}`}>{icon}</div>
      <p className="text-lg font-bold">{value.toLocaleString("fa-IR")}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </CardContent>
  </Card>
);
