import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionService, type SubscriptionPlan } from "@/services/subscriptionService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Crown, Check, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { storeSubscription } = useSubscription();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth", { replace: true }); return; }
      const { data: store } = await supabase.from("stores").select("id").eq("owner_id", session.user.id).maybeSingle();
      if (!store) { navigate("/dashboard", { replace: true }); return; }
      setStoreId(store.id);
      const p = await subscriptionService.getPlans();
      setPlans(p);
      setLoading(false);
    };
    init();
  }, [navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-gold" size={32} /></div>;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-2">
            <ArrowRight size={16} /> بازگشت به داشبورد
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Crown className="text-gold" /> پلن‌های اشتراک
          </h1>
          {storeSubscription?.plan && (
            <p className="text-muted-foreground mt-1">
              پلن فعلی: <span className="font-bold text-gold">{storeSubscription.plan.name}</span>
              {storeSubscription.subscription?.status === "trialing" && " (دوره آزمایشی)"}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = storeSubscription?.plan?.id === plan.id;
            const features = (plan.features as string[]) ?? [];
            return (
              <Card key={plan.id} className={`p-6 bg-card border-border relative ${isCurrent ? "ring-2 ring-gold" : ""}`}>
                {isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gold text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                    پلن فعلی
                  </span>
                )}
                <div className="text-center mb-6">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isCurrent ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground"}`}>
                    <Crown size={24} />
                  </div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  {plan.tagline && <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>}
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{subscriptionService.formatPrice(plan.price_monthly)}</span>
                    {plan.price_monthly > 0 && <span className="text-xs text-muted-foreground">/ماه</span>}
                  </div>
                  {plan.price_yearly > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      سالانه: {subscriptionService.formatPrice(plan.price_yearly)}
                    </p>
                  )}
                </div>

                <div className="space-y-2 mb-6">
                  {plan.max_products !== null && (
                    <p className="text-xs flex items-center gap-2"><Check size={12} className="text-emerald-brand" /> تا {plan.max_products} محصول</p>
                  )}
                  {plan.max_products === null && (
                    <p className="text-xs flex items-center gap-2"><Check size={12} className="text-emerald-brand" /> محصول نامحدود</p>
                  )}
                  <p className="text-xs flex items-center gap-2"><Check size={12} className="text-emerald-brand" /> {plan.max_featured} محصول ویژه</p>
                  {plan.max_ai_designs !== null ? (
                    <p className="text-xs flex items-center gap-2"><Check size={12} className="text-emerald-brand" /> تا {plan.max_ai_designs} طراحی AI</p>
                  ) : (
                    <p className="text-xs flex items-center gap-2"><Check size={12} className="text-emerald-brand" /> طراحی AI نامحدود</p>
                  )}
                  {plan.has_analytics && (
                    <p className="text-xs flex items-center gap-2"><Sparkles size={12} className="text-gold" /> آنالیتیکس هومینو استودیو</p>
                  )}
                  {plan.storage_limit_mb && (
                    <p className="text-xs flex items-center gap-2"><Check size={12} className="text-emerald-brand" /> {plan.storage_limit_mb} مگابایت فضای ذخیره‌سازی</p>
                  )}
                  {features.map((f, i) => (
                    <p key={i} className="text-xs flex items-center gap-2"><Check size={12} className="text-emerald-brand" /> {f}</p>
                  ))}
                </div>

                <Button className="w-full" variant={isCurrent ? "outline" : "default"} disabled={isCurrent}>
                  {isCurrent ? "پلن فعلی" : "ارتقا به این پلن"}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
