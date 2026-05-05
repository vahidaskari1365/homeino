import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatPersianDate } from "@/lib/date";
import { CalendarCheck, MapPin, Phone, User } from "lucide-react";

type Visit = {
  id: string;
  customer_id: string;
  profile_id: string;
  purpose: "renovation" | "interior_design" | "bulk_purchase" | "other";
  status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled";
  customer_name: string;
  customer_phone: string;
  city: string | null;
  address: string | null;
  description: string | null;
  preferred_date: string | null;
  preferred_time_range: string | null;
  confirmed_at: string | null;
  seller_note: string | null;
  created_at: string;
};

const purposeLabels: Record<Visit["purpose"], string> = {
  renovation: "بازسازی خانه",
  interior_design: "طراحی داخلی",
  bulk_purchase: "خرید عمده",
  other: "سایر",
};

const statusLabels: Record<Visit["status"], string> = {
  pending: "در انتظار",
  confirmed: "تأیید شده",
  rejected: "رد شده",
  completed: "انجام شده",
  cancelled: "لغو شده",
};

const statusVariant: Record<Visit["status"], "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  rejected: "destructive",
  completed: "outline",
  cancelled: "destructive",
};

const SiteVisits = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [profileIds, setProfileIds] = useState<string[]>([]);
  const [myVisits, setMyVisits] = useState<Visit[]>([]);
  const [shopVisits, setShopVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data: profs } = await supabase.from("profiles").select("id").eq("user_id", user.id);
    const ids = (profs || []).map((p: any) => p.id);
    setProfileIds(ids);

    const { data: mine } = await supabase.from("site_visits").select("*").eq("customer_id", user.id).order("created_at", { ascending: false });
    setMyVisits((mine as Visit[]) || []);

    if (ids.length > 0) {
      const { data: shop } = await supabase.from("site_visits").select("*").in("profile_id", ids).order("created_at", { ascending: false });
      setShopVisits((shop as Visit[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    document.title = "رزرو بازدید حضوری | هومینو";
  }, []);

  const cancelVisit = async (id: string) => {
    const { error } = await supabase.from("site_visits").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast({ title: "خطا", description: error.message, variant: "destructive" });
    toast({ title: "لغو شد" });
    load();
  };

  const updateStatus = async (id: string, status: Visit["status"], extra?: { seller_note?: string; confirmed_at?: string | null }) => {
    const { error } = await supabase.from("site_visits").update({ status, ...extra }).eq("id", id);
    if (error) return toast({ title: "خطا", description: error.message, variant: "destructive" });
    toast({ title: "به‌روزرسانی شد" });
    load();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-6 pt-28 pb-16">
        <h1 className="text-3xl font-display text-gold font-bold mb-2 flex items-center gap-2">
          <CalendarCheck /> رزرو بازدید حضوری
        </h1>
        <p className="text-muted-foreground mb-8">برای بازسازی، طراحی داخلی یا خرید عمده، بازدید حضوری از فروشگاه را رزرو کنید.</p>

        {!userId ? (
          <p className="text-center text-muted-foreground py-20">برای مشاهده لطفاً وارد شوید.</p>
        ) : (
          <Tabs defaultValue="mine">
            <TabsList>
              <TabsTrigger value="mine">درخواست‌های من ({myVisits.length})</TabsTrigger>
              {profileIds.length > 0 && (
                <TabsTrigger value="shop">رزروهای فروشگاه ({shopVisits.length})</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="mine" className="mt-6 space-y-4">
              {loading ? <p>در حال بارگذاری...</p> : myVisits.length === 0 ? (
                <p className="text-muted-foreground">هنوز درخواستی ثبت نکرده‌اید.</p>
              ) : myVisits.map((v) => (
                <Card key={v.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {purposeLabels[v.purpose]}
                    </CardTitle>
                    <Badge variant={statusVariant[v.status]}>{statusLabels[v.status]}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                      {v.preferred_date && <span><CalendarCheck size={14} className="inline ml-1" />{formatPersianDate(v.preferred_date)} {v.preferred_time_range}</span>}
                      {v.city && <span><MapPin size={14} className="inline ml-1" />{v.city}</span>}
                    </div>
                    {v.description && <p>{v.description}</p>}
                    {v.seller_note && (
                      <div className="p-2 rounded bg-muted/50 border border-border">
                        <span className="text-xs text-muted-foreground">پاسخ فروشنده:</span>
                        <p>{v.seller_note}</p>
                      </div>
                    )}
                    {v.status === "pending" && (
                      <Button size="sm" variant="destructive" onClick={() => cancelVisit(v.id)}>لغو درخواست</Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {profileIds.length > 0 && (
              <TabsContent value="shop" className="mt-6 space-y-4">
                {loading ? <p>در حال بارگذاری...</p> : shopVisits.length === 0 ? (
                  <p className="text-muted-foreground">رزرو فعالی برای فروشگاه شما وجود ندارد.</p>
                ) : shopVisits.map((v) => (
                  <ShopVisitCard key={v.id} visit={v} onUpdate={updateStatus} />
                ))}
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

const ShopVisitCard = ({ visit: v, onUpdate }: { visit: Visit; onUpdate: (id: string, status: Visit["status"], extra?: any) => void }) => {
  const [note, setNote] = useState(v.seller_note || "");
  const [confirmDate, setConfirmDate] = useState(v.confirmed_at?.slice(0, 16) || "");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-base">{purposeLabels[v.purpose]}</CardTitle>
        <Badge variant={statusVariant[v.status]}>{statusLabels[v.status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
          <span><User size={14} className="inline ml-1" />{v.customer_name}</span>
          <a href={`tel:${v.customer_phone}`} className="hover:text-gold"><Phone size={14} className="inline ml-1" />{v.customer_phone}</a>
          {v.preferred_date && <span><CalendarCheck size={14} className="inline ml-1" />{formatPersianDate(v.preferred_date)} {v.preferred_time_range}</span>}
          {v.city && <span><MapPin size={14} className="inline ml-1" />{v.city}</span>}
        </div>
        {v.address && <p className="text-muted-foreground">آدرس: {v.address}</p>}
        {v.description && <p>{v.description}</p>}

        {(v.status === "pending" || v.status === "confirmed") && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div>
              <Label className="text-xs">تاریخ نهایی تأیید</Label>
              <Input type="datetime-local" value={confirmDate} onChange={(e) => setConfirmDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">یادداشت برای مشتری</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onUpdate(v.id, "confirmed", { seller_note: note, confirmed_at: confirmDate ? new Date(confirmDate).toISOString() : null })}>
                تأیید
              </Button>
              <Button size="sm" variant="outline" onClick={() => onUpdate(v.id, "completed", { seller_note: note })}>
                انجام شد
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onUpdate(v.id, "rejected", { seller_note: note })}>
                رد
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SiteVisits;
