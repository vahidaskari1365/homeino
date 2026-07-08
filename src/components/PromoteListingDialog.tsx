import { useState, type ComponentType } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Flame, Sparkles, ArrowUp, Loader2 } from "lucide-react";

type PromotionType = "urgent" | "featured" | "bump";

const PLANS: Record<PromotionType, { label: string; price: number; days: number; icon: ComponentType<{ className?: string; size?: number }>; desc: string; color: string }> = {
  urgent: { label: "آگهی فوری", price: 50000, days: 7, icon: Flame, desc: "نمایش با برچسب «فوری» و رنگ متفاوت در لیست", color: "text-red-500" },
  featured: { label: "آگهی ویژه", price: 150000, days: 14, icon: Sparkles, desc: "نمایش در صدر صفحه و بخش ویژه با برچسب طلایی", color: "text-gold" },
  bump: { label: "بالا آوردن", price: 20000, days: 1, icon: ArrowUp, desc: "آگهی شما به ابتدای لیست منتقل می‌شود", color: "text-emerald-500" },
};

interface Props {
  listingId: string;
  userId: string;
  trigger?: React.ReactNode;
  onDone?: () => void;
}

const PromoteListingDialog = ({ listingId, userId, trigger, onDone }: Props) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PromotionType | null>(null);
  const [loading, setLoading] = useState(false);

  const purchase = async () => {
    if (!selected) return;
    setLoading(true);
    const plan = PLANS[selected];
    const now = new Date();
    const expires = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);

    const { error: pErr } = await supabase.from("listing_promotions").insert({
      listing_id: listingId,
      user_id: userId,
      promotion_type: selected,
      amount: plan.price,
      duration_days: plan.days,
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
      status: "active",
    });
    if (pErr) { setLoading(false); toast({ title: "خطا", description: pErr.message, variant: "destructive" }); return; }

    const update: {
      is_urgent?: boolean; urgent_until?: string;
      is_featured?: boolean; featured_until?: string;
      bumped_at?: string;
    } = {};
    if (selected === "urgent") { update.is_urgent = true; update.urgent_until = expires.toISOString(); }
    if (selected === "featured") { update.is_featured = true; update.featured_until = expires.toISOString(); }
    if (selected === "bump") { update.bumped_at = now.toISOString(); }

    const { error: uErr } = await supabase.from("second_hand_listings").update(update).eq("id", listingId);
    setLoading(false);
    if (uErr) { toast({ title: "خطا", description: uErr.message, variant: "destructive" }); return; }
    toast({ title: "ارتقا فعال شد", description: `${plan.label} تا ${plan.days} روز فعال است` });
    setOpen(false);
    setSelected(null);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" variant="outline" className="border-gold/50 text-gold"><Sparkles size={14} className="ml-1" />ارتقا آگهی</Button>}
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ارتقا آگهی</DialogTitle>
          <DialogDescription>پلن مناسب را انتخاب کنید تا آگهی شما بیشتر دیده شود</DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-3 gap-3">
          {(Object.keys(PLANS) as PromotionType[]).map((key) => {
            const p = PLANS[key];
            const Icon = p.icon;
            const active = selected === key;
            return (
              <Card key={key} onClick={() => setSelected(key)} className={`cursor-pointer transition ${active ? "border-gold ring-2 ring-gold/30" : "hover:border-gold/50"}`}>
                <CardContent className="pt-5 text-center space-y-2">
                  <Icon className={`mx-auto ${p.color}`} size={32} />
                  <div className="font-semibold">{p.label}</div>
                  <p className="text-xs text-muted-foreground min-h-10">{p.desc}</p>
                  <Badge variant="secondary">{p.days} روز</Badge>
                  <div className="text-gold font-bold">{p.price.toLocaleString("en-US")} تومان</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={purchase} disabled={!selected || loading} className="gradient-gold text-primary-foreground">
            {loading ? <Loader2 className="animate-spin" size={16} /> : "پرداخت و فعال‌سازی"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromoteListingDialog;
