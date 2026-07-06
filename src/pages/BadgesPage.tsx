import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserBadges, useBadges, useSellerBadges } from "@/hooks/useBadges";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowRight, Award, Store } from "lucide-react";
import { badgeService } from "@/services/badgeService";

export default function BadgesPage() {
  const navigate = useNavigate();
  const { badges: earnedBadges, loading: userBadgesLoading, refresh: refreshUserBadges } = useUserBadges();
  const { definitions, loading: defsLoading } = useBadges();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);
  const { badges: sellerBadges, loading: sellerBadgesLoading } = useSellerBadges(userStoreId);

  useEffect(() => {
    const init = async () => {
      const { data: { session, user } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth", { replace: true }); return; }
      setUserId(user!.id);

      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (store) setUserStoreId(store.id);

      setLoading(false);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (userId) {
      badgeService.checkAndAwardUserBadges(userId).then(() => refreshUserBadges());
    }
  }, [userId, refreshUserBadges]);

  if (loading || userBadgesLoading || defsLoading || sellerBadgesLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-gold" size={32} /></div>;
  }

  const earnedSlugs = new Set(earnedBadges.map((b) => b.badge_definitions?.slug));
  const sellerEarnedSlugs = new Set(sellerBadges.map((b: any) => b.badge_definitions?.slug));

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-2">
            <ArrowRight size={16} /> بازگشت به داشبورد
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Award className="text-gold" /> نشان‌های من
          </h1>
        </div>

        <Card className="p-6 bg-card border-border">
          <h2 className="font-bold mb-4">نشان‌های کاربری</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {definitions.filter((d) => d.category === "user").map((badge) => (
              <BadgeDisplay
                key={badge.id}
                badge={badge}
                earned={earnedSlugs.has(badge.slug)}
                size="md"
              />
            ))}
          </div>
        </Card>

        {userStoreId && (
          <Card className="p-6 bg-card border-border mt-6">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Store size={18} className="text-gold" /> نشان‌های فروشگاهی
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {definitions.filter((d) => d.category === "seller").map((badge) => (
                <BadgeDisplay
                  key={badge.id}
                  badge={badge}
                  earned={sellerEarnedSlugs.has(badge.slug)}
                  size="md"
                />
              ))}
            </div>
          </Card>
        )}

        {sellerBadges.length > 0 && (
          <Card className="p-6 bg-card border-border mt-6">
            <h2 className="font-bold mb-4">نشان‌های فروشگاهی کسب شده</h2>
            <div className="space-y-2">
              {sellerBadges.map((b: any) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                  {b.badge_definitions && <BadgeDisplay badge={b.badge_definitions} size="sm" />}
                  <div>
                    <p className="text-sm font-medium">{b.badge_definitions?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.badge_definitions?.description} — {new Date(b.awarded_at).toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {earnedBadges.length > 0 && (
          <Card className="p-6 bg-card border-border mt-6">
            <h2 className="font-bold mb-4">نشان‌های کاربری کسب شده</h2>
            <div className="space-y-2">
              {earnedBadges.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                  {b.badge_definitions && <BadgeDisplay badge={b.badge_definitions} size="sm" />}
                  <div>
                    <p className="text-sm font-medium">{b.badge_definitions?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.badge_definitions?.description} — {new Date(b.awarded_at).toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
