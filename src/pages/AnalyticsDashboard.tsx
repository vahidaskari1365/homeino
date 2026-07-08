import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, BarChart3, Eye, MousePointerClick, Heart, TrendingUp, Sparkles, Package } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#C8A97E", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#3B82F6"];

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { productAnalytics, dailyStats, topCategories, totalViews, totalClicks, avgCtr, loading: analyticsLoading } = useAnalytics(storeId);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth", { replace: true }); return; }
      const { data: store } = await supabase.from("stores").select("id").eq("owner_id", session.user.id).maybeSingle();
      if (!store) { navigate("/dashboard", { replace: true }); return; }
      if (mounted) setStoreId(store.id);
      if (mounted) setLoading(false);
    };
    init();
    return () => { mounted = false; };
  }, [navigate]);

  if (loading || analyticsLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-gold" size={32} /></div>;
  }

  const ctrData = productAnalytics.map((p) => ({ name: (p.product_name ?? "").slice(0, 15), ctr: p.ctr, views: p.views }));

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-2">
              <ArrowRight size={16} /> بازگشت به داشبورد
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="text-gold" /> آنالیتیکس پیشرفته
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">بازدید کل</span>
              <Eye size={16} className="text-gold" />
            </div>
            <p className="text-2xl font-bold">{totalViews.toLocaleString("en-US")}</p>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">کلیک کل</span>
              <MousePointerClick size={16} className="text-gold" />
            </div>
            <p className="text-2xl font-bold">{totalClicks.toLocaleString("en-US")}</p>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">نرخ کلیک (CTR)</span>
              <TrendingUp size={16} className="text-gold" />
            </div>
            <p className="text-2xl font-bold">{avgCtr.toFixed(1)}%</p>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">محصولات</span>
              <Package size={16} className="text-gold" />
            </div>
            <p className="text-2xl font-bold">{productAnalytics.length.toLocaleString("en-US")}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 bg-card border-border">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-gold" /> CTR محصولات
            </h3>
            {ctrData.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">داده‌ای موجود نیست</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ctrData.slice(0, 10)} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-30} textAnchor="end" />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit="%" />
                    <Tooltip
                      formatter={(v: number) => [`${v.toFixed(2)}%`, "CTR"]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="ctr" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-card border-border">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Package size={18} className="text-gold" /> دسته‌بندی محصولات
            </h3>
            {topCategories.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">دسته‌بندی وجود ندارد</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topCategories.map((c) => ({ name: c.category, value: c.count }))}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                      dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {topCategories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6 bg-card border-border mb-8">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-gold" /> عملکرد محصولات
          </h3>
          {productAnalytics.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">داده‌ای موجود نیست</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-right p-2 text-muted-foreground">محصول</th>
                    <th className="text-center p-2 text-muted-foreground">بازدید</th>
                    <th className="text-center p-2 text-muted-foreground">کلیک</th>
                    <th className="text-center p-2 text-muted-foreground">علاقه‌مندی</th>
                    <th className="text-center p-2 text-muted-foreground">هومینو استودیو</th>
                    <th className="text-center p-2 text-muted-foreground">CTR</th>
                    <th className="text-center p-2 text-muted-foreground">رشد</th>
                  </tr>
                </thead>
                <tbody>
                  {productAnalytics.map((p) => (
                    <tr key={p.product_id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-2 font-medium">{p.product_name}</td>
                      <td className="text-center p-2">{p.views.toLocaleString("en-US")}</td>
                      <td className="text-center p-2">{p.clicks.toLocaleString("en-US")}</td>
                      <td className="text-center p-2">{p.favorites.toLocaleString("en-US")}</td>
                      <td className="text-center p-2">{p.ai_recommendations.toLocaleString("en-US")}</td>
                      <td className="text-center p-2">{p.ctr.toFixed(1)}%</td>
                      <td className={`text-center p-2 ${p.monthly_growth >= 0 ? "text-emerald-brand" : "text-destructive"}`}>
                        {p.monthly_growth > 0 ? "+" : ""}{p.monthly_growth.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
