// @ts-nocheck
// ============================================================
// Homeino — Seller Dashboard: Analytics Engine
// ============================================================
// Full analytics dashboard with beautiful recharts visualizations:
// - Product performance bar chart (views, clicks, saves)
// - Monthly trend line chart
// - Top products table with CTR & recommendation rate
// - AI insights: top styles, colors, budgets
// - Popularity trend
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye, Sparkles, MousePointerClick, Heart, Trophy, Crown, Star, TrendingUp,
  BarChart3, LineChart, PieChart, ArrowUp, ArrowDown, Layers, Palette,
  Home, DollarSign, Target, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart as ReLineChart, Line, AreaChart, Area, PieChart as RePieChart,
  Pie, Cell, Legend,
} from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import type { Tables } from "@/integrations/supabase/types";
import { useStoreAnalytics, type ProductAnalyticsRow } from "@/hooks/useStoreAnalytics";

// ─── Types ────────────────────────────────────────────────
type Store = Tables<"stores">;
type SubscriptionPlan = Tables<"subscription_plans">;
type StoreSubscription = Tables<"store_subscriptions">;

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  trialing: { label: "دوره آزمایشی", color: "bg-blue-100 text-blue-700 border-blue-200" },
  active: { label: "فعال", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  past_due: { label: "پرداخت معوق", color: "bg-amber-100 text-amber-700 border-amber-200" },
  canceled: { label: "لغو شده", color: "bg-rose-100 text-rose-700 border-rose-200" },
  none: { label: "بدون اشتراک", color: "bg-muted text-muted-foreground" },
};

const PIE_COLORS = ["#D4A853", "#1B4332", "#7C3AED", "#059669", "#DC2626", "#2563EB", "#D97706", "#EC4899"];
const BAR_COLORS = { views: "#2563EB", clicks: "#7C3AED", saves: "#D4A853", ai: "#059669" };

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("fa-IR");

// ─── Component ────────────────────────────────────────────
export const SellerAnalyticsPanel = ({ ownerId }: { ownerId: string }) => {
  const analytics = useStoreAnalytics(ownerId);
  const [store, setStore] = useState<Store | null>(null);
  const [subscription, setSubscription] = useState<(StoreSubscription & { subscription_plans: SubscriptionPlan | null }) | null>(null);
  const [featuredCount, setFeaturedCount] = useState(0);
  const [storeCount, setStoreCount] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [tab, setTab] = useState("overview");

  // Load store/subscription data
  useEffect(() => {
    (async () => {
      const { data: storeRow } = await supabase.from("stores").select("*").eq("owner_id", ownerId).maybeSingle();
      if (!storeRow) return;
      setStore(storeRow);

      const [subRes, featuredRes, allStoresRes] = await Promise.all([
        supabase.from("store_subscriptions").select("*, subscription_plans(*)").eq("store_id", storeRow.id).maybeSingle(),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeRow.id).eq("is_featured", true),
        supabase.from("stores").select("id, rating").order("rating", { ascending: false }),
      ]);

      if (subRes.data) setSubscription(subRes.data as typeof subscription);
      setFeaturedCount(featuredRes.count ?? 0);
      if (allStoresRes.data) {
        setStoreCount(allStoresRes.data.length);
        const idx = allStoresRes.data.findIndex((s) => s.id === storeRow.id);
        setRank(idx >= 0 ? idx + 1 : null);
      }
    })();
  }, [ownerId]);

  if (analytics.loading) {
    return (
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!store) return null;

  const plan = subscription?.subscription_plans;
  const status = subscription?.status ?? "none";
  const overview = analytics.overview;
  const products = analytics.products;
  const insights = analytics.insights;

  // Prepare chart data
  const topProducts = products.slice(0, 10);
  const barData = topProducts.map((p) => ({
    name: p.product_name.length > 12 ? p.product_name.slice(0, 12) + "..." : p.product_name,
    بازدید: p.views,
    کلیک: p.clicks,
    "ذخیره شده": p.saves,
    "پیشنهاد هومینو استودیو": p.ai_recommendations,
  }));

  const trendData = overview?.popularity_trend || [];

  return (
    <div className="space-y-4 mb-6">
      {/* ── Stat Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Eye size={18} />} label="بازدید محصولات" value={overview?.total_views ?? 0} color="blue" />
        <StatCard icon={<Sparkles size={18} />} label="پیشنهاد هومینو استودیو" value={overview?.total_ai_recommendations ?? 0} color="emerald" />
        <StatCard icon={<MousePointerClick size={18} />} label="کلیک محصولات" value={overview?.total_clicks ?? 0} color="purple" />
        <StatCard icon={<Heart size={18} />} label="محصولات ذخیره‌شده" value={overview?.total_saves ?? 0} color="rose" />
      </div>

      {/* ── Status Row ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><Trophy size={18} /></div>
            <div>
              <p className="text-xs text-muted-foreground">رتبه فروشگاه</p>
              <p className="font-bold">{rank ? `${fmt(rank)} از ${fmt(storeCount)}` : "—"}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Star size={10} className="fill-amber-400 text-amber-400" /> امتیاز {fmt(store.rating ?? 0)}</p>
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
                <p className="font-bold">{fmt(featuredCount)} / {fmt(plan?.max_featured ?? 0)}</p>
              </div>
            </div>
            <Link to="/billing"><Button size="sm" variant="outline" className="text-xs">ارتقا اشتراک</Button></Link>
          </CardContent>
        </Card>
      </div>

      {/* ── Analytics Tabs ─────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="overview" className="gap-2"><BarChart3 size={14} /> نمای کلی</TabsTrigger>
          <TabsTrigger value="products" className="gap-2"><Layers size={14} /> محصولات</TabsTrigger>
          <TabsTrigger value="insights" className="gap-2"><Palette size={14} /> بینش هومینو استودیو</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ──────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          {/* Monthly Growth Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">نرخ کلیک (CTR)</p>
                  <Target size={14} className="text-purple-500" />
                </div>
                <p className="text-2xl font-bold mt-1">{overview?.ctr ?? 0}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">رشد ماهانه</p>
                  {(overview?.monthly_growth ?? 0) >= 0
                    ? <ArrowUp size={14} className="text-emerald-500" />
                    : <ArrowDown size={14} className="text-red-500" />}
                </div>
                <p className={`text-2xl font-bold mt-1 ${(overview?.monthly_growth ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {overview ? `${overview.monthly_growth >= 0 ? "+" : ""}${overview.monthly_growth}%` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">نرخ پیشنهاد هومینو استودیو</p>
                  <Sparkles size={14} className="text-emerald-500" />
                </div>
                <p className="text-2xl font-bold mt-1">
                  {overview && overview.total_views > 0
                    ? `${((overview.total_ai_recommendations / overview.total_views) * 100).toFixed(1)}%`
                    : "۰%"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Popularity Trend Chart */}
          {trendData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <LineChart size={16} className="text-gold" />
                  روند محبوبیت (۱۲ ماه اخیر)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4A853" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#D4A853" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [fmt(value), "بازدید"]}
                      />
                      <Area type="monotone" dataKey="views" stroke="#D4A853" fill="url(#colorViews)" strokeWidth={2} name="بازدید" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Performance Bar Chart */}
          {barData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 size={16} className="text-gold" />
                  عملکرد محصولات (۱۰ محصول برتر)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      <Bar dataKey="بازدید" fill={BAR_COLORS.views} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="کلیک" fill={BAR_COLORS.clicks} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="ذخیره شده" fill={BAR_COLORS.saves} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Products Tab ──────────────────────────── */}
        <TabsContent value="products" className="space-y-4">
          {products.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Layers size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">هنوز محصولی ثبت نشده است.</p>
                <p className="text-xs mt-1">با افزودن محصول، آمار این بخش نمایش داده می‌شود.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers size={16} className="text-gold" />
                  جزئیات عملکرد محصولات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-right py-2 px-2 font-medium text-muted-foreground">محصول</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground">بازدید</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground">کلیک</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground">CTR</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground">پیشنهاد هومینو استودیو</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground">نرخ پیشنهاد</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground">علاقه‌مندی</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p, i) => (
                        <tr key={p.product_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                              <Link to={`/product/${p.product_id}`} className="hover:text-gold font-medium truncate max-w-[150px] block">
                                {p.product_name}
                              </Link>
                            </div>
                          </td>
                          <td className="text-center py-2.5 px-2 font-medium">{fmt(p.views)}</td>
                          <td className="text-center py-2.5 px-2">{fmt(p.clicks)}</td>
                          <td className="text-center py-2.5 px-2">
                            <Badge variant="outline" className={`text-[10px] ${p.ctr > 5 ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                              {p.ctr}%
                            </Badge>
                          </td>
                          <td className="text-center py-2.5 px-2">{fmt(p.ai_recommendations)}</td>
                          <td className="text-center py-2.5 px-2">
                            <Badge variant="outline" className={`text-[10px] ${p.recommendation_rate > 10 ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"}`}>
                              {p.recommendation_rate}%
                            </Badge>
                          </td>
                          <td className="text-center py-2.5 px-2">{fmt(p.favorites)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── AI Insights Tab ───────────────────────── */}
        <TabsContent value="insights" className="space-y-4">
          {!insights ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Palette size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">بینش هومینو استودیو پس از تعامل کاربران با محصولات شما نمایش داده می‌شود.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Styles */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palette size={14} className="text-gold" />
                    سبک‌های پرطرفدار
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.top_styles.length === 0 ? (
                    <p className="text-xs text-muted-foreground">داده‌ای ثبت نشده</p>
                  ) : (
                    <div className="space-y-2">
                      {insights.top_styles.map((item, i) => (
                        <div key={item.value} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-xs">{item.value}</span>
                          </div>
                          <span className="text-xs font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Colors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palette size={14} className="text-rose-500" />
                    رنگ‌های پرطرفدار
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.top_colors.length === 0 ? (
                    <p className="text-xs text-muted-foreground">داده‌ای ثبت نشده</p>
                  ) : (
                    <div className="space-y-2">
                      {insights.top_colors.map((item, i) => (
                        <div key={item.value} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border border-border"
                              style={{ backgroundColor: item.value }}
                            />
                            <span className="text-xs">{item.value}</span>
                          </div>
                          <span className="text-xs font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Budgets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign size={14} className="text-emerald-500" />
                    بودجه‌های پرطرفدار
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.top_budgets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">داده‌ای ثبت نشده</p>
                  ) : (
                    <div className="space-y-2">
                      {insights.top_budgets.map((item, i) => (
                        <div key={item.value} className="flex items-center justify-between">
                          <span className="text-xs">{item.value}</span>
                          <span className="text-xs font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Room Types */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Home size={14} className="text-blue-500" />
                    فضاهای پرکاربرد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.top_room_types.length === 0 ? (
                    <p className="text-xs text-muted-foreground">داده‌ای ثبت نشده</p>
                  ) : (
                    <div className="space-y-2">
                      {insights.top_room_types.map((item, i) => (
                        <div key={item.value} className="flex items-center justify-between">
                          <span className="text-xs">{item.value}</span>
                          <span className="text-xs font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* AI Recommendation Pie Chart */}
          {products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChart size={16} className="text-gold" />
                  توزیع پیشنهادات هومینو استودیو
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={products.slice(0, 8).map((p) => ({
                          name: p.product_name.length > 15 ? p.product_name.slice(0, 15) + "..." : p.product_name,
                          value: p.ai_recommendations || 1,
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={true}
                      >
                        {products.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Refresh Button ─────────────────────────── */}
      <div className="text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={analytics.refresh}
          className="gap-2"
        >
          <RefreshCw size={14} /> بروزرسانی آمار
        </Button>
      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────
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
      <p className="text-lg font-bold">{fmt(value)}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </CardContent>
  </Card>
);