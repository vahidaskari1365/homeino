import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StoreHealthPanel } from "@/components/StoreHealthPanel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Activity } from "lucide-react";

export default function StoreHealthPage() {
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth", { replace: true }); return; }
      const { data: store } = await supabase.from("stores").select("id").eq("owner_id", session.user.id).maybeSingle();
      if (!store) { navigate("/dashboard", { replace: true }); return; }
      setStoreId(store.id);
      setLoading(false);
    };
    init();
  }, [navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-gold" size={32} /></div>;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-2">
            <ArrowRight size={16} /> بازگشت به داشبورد
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Activity className="text-gold" /> سلامت فروشگاه
          </h1>
        </div>
        <Card className="p-6 bg-card border-border">
          {storeId && <StoreHealthPanel storeId={storeId} />}
        </Card>
      </div>
    </div>
  );
}
