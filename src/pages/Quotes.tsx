import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Tag, Loader2, Check, X, Clock, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatPersianDate } from "@/lib/date";

type Status = "pending" | "answered" | "accepted" | "rejected" | "expired";
interface Quote {
  id: string;
  customer_id: string;
  profile_id: string;
  request_type: string;
  title: string;
  description: string | null;
  customer_name: string;
  customer_phone: string;
  city: string | null;
  budget_min: number | null;
  budget_max: number | null;
  status: Status;
  quoted_price: number | null;
  seller_note: string | null;
  valid_until: string | null;
  answered_at: string | null;
  created_at: string;
}

const STATUS: Record<Status, { label: string; cls: string }> = {
  pending: { label: "در انتظار پاسخ", cls: "bg-gold/15 text-gold border-gold/30" },
  answered: { label: "پاسخ داده شده", cls: "bg-primary/15 text-primary border-primary/30" },
  accepted: { label: "پذیرفته شده", cls: "bg-emerald-brand/15 text-emerald-brand border-emerald-brand/30" },
  rejected: { label: "رد شده", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  expired: { label: "منقضی", cls: "bg-muted text-muted-foreground border-border" },
};

const fmt = (n: number | null) => (n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان");

const Quotes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [myQuotes, setMyQuotes] = useState<Quote[]>([]);
  const [sellerQuotes, setSellerQuotes] = useState<Quote[]>([]);
  const [hasShop, setHasShop] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [days, setDays] = useState("7");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
    setHasShop(!!prof);

    const my = await supabase.from("price_quotes").select("*").eq("customer_id", user.id).order("created_at", { ascending: false });
    setMyQuotes((my.data ?? []) as Quote[]);

    if (prof) {
      const sq = await supabase.from("price_quotes").select("*").eq("profile_id", prof.id).order("created_at", { ascending: false });
      setSellerQuotes((sq.data ?? []) as Quote[]);
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); document.title = "درخواست‌های قیمت | هومینو"; }, [load]);

  const openRespond = (q: Quote) => {
    setEditing(q);
    setPrice(q.quoted_price?.toString() ?? "");
    setNote(q.seller_note ?? "");
    setDays("7");
  };

  const submitResponse = async () => {
    if (!editing) return;
    const p = Number(price);
    if (!p || p <= 0) {
      toast({ title: "خطا", description: "قیمت معتبر وارد کنید", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const valid_until = new Date(Date.now() + Number(days || "7") * 86400000).toISOString();
    const { error } = await supabase.from("price_quotes").update({
      quoted_price: p,
      seller_note: note || null,
      valid_until,
      status: "answered",
      answered_at: new Date().toISOString(),
    }).eq("id", editing.id);
    setSubmitting(false);
    if (error) { toast({ title: "خطا", description: error.message, variant: "destructive" }); return; }
    toast({ title: "پاسخ ارسال شد" });
    setEditing(null);
    await load();
  };

  const customerAction = async (q: Quote, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("price_quotes").update({ status }).eq("id", q.id);
    if (error) { toast({ title: "خطا", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "accepted" ? "پذیرفته شد" : "رد شد" });
    await load();
  };

  const QuoteCard = ({ q, sellerView }: { q: Quote; sellerView?: boolean }) => (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag size={16} className="text-gold" /> {q.title}
          </CardTitle>
          <Badge variant="outline" className={STATUS[q.status].cls}>{STATUS[q.status].label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Clock size={12} /> {formatPersianDate(q.created_at)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {q.description && <p className="text-muted-foreground">{q.description}</p>}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {sellerView && (
            <>
              <div><span className="text-muted-foreground">مشتری: </span>{q.customer_name}</div>
              <div dir="ltr"><span className="text-muted-foreground">تماس: </span>{q.customer_phone}</div>
            </>
          )}
          {q.city && <div><span className="text-muted-foreground">شهر: </span>{q.city}</div>}
          {(q.budget_min || q.budget_max) && (
            <div className="col-span-2">
              <span className="text-muted-foreground">بودجه: </span>
              {fmt(q.budget_min)} تا {fmt(q.budget_max)}
            </div>
          )}
        </div>

        {q.quoted_price != null && (
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">قیمت پیشنهادی فروشنده</span>
              <span className="font-bold text-gold text-lg">{fmt(q.quoted_price)}</span>
            </div>
            {q.seller_note && <p className="text-xs text-muted-foreground">{q.seller_note}</p>}
            {q.valid_until && (
              <p className="text-xs text-muted-foreground">معتبر تا: {formatPersianDate(q.valid_until)}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {sellerView && q.status === "pending" && (
            <Button size="sm" className="gradient-gold text-primary-foreground gap-1" onClick={() => openRespond(q)}>
              <MessageCircle size={14} /> پاسخ به درخواست
            </Button>
          )}
          {sellerView && q.status === "answered" && (
            <Button size="sm" variant="outline" onClick={() => openRespond(q)}>ویرایش پاسخ</Button>
          )}
          {!sellerView && q.status === "answered" && (
            <>
              <Button size="sm" className="gap-1 bg-emerald-brand text-primary-foreground hover:bg-emerald-brand/90" onClick={() => customerAction(q, "accepted")}>
                <Check size={14} /> پذیرش
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => customerAction(q, "rejected")}>
                <X size={14} /> رد
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-6 pt-28 pb-16">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold mb-6 text-sm">
          <ArrowRight size={16} /> بازگشت
        </Link>
        <h1 className="text-3xl font-display font-bold text-gold mb-6 flex items-center gap-2">
          <Tag /> درخواست‌های قیمت
        </h1>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" /></div>
        ) : (
          <Tabs defaultValue="my">
            <TabsList>
              <TabsTrigger value="my">درخواست‌های من ({myQuotes.length})</TabsTrigger>
              {hasShop && <TabsTrigger value="shop">دریافتی فروشگاه ({sellerQuotes.length})</TabsTrigger>}
            </TabsList>

            <TabsContent value="my" className="space-y-3 mt-4">
              {myQuotes.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">هنوز درخواست قیمتی ثبت نکرده‌اید.</p>
              ) : myQuotes.map((q) => <QuoteCard key={q.id} q={q} />)}
            </TabsContent>

            {hasShop && (
              <TabsContent value="shop" className="space-y-3 mt-4">
                {sellerQuotes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">درخواست قیمتی برای فروشگاه شما ثبت نشده است.</p>
                ) : sellerQuotes.map((q) => <QuoteCard key={q.id} q={q} sellerView />)}
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>پاسخ به درخواست قیمت</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>قیمت پیشنهادی (تومان) *</Label>
              <Input dir="ltr" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>اعتبار پیشنهاد (روز)</Label>
              <Input dir="ltr" type="number" value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>توضیحات / شرایط</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>انصراف</Button>
            <Button onClick={submitResponse} disabled={submitting} className="gradient-gold text-primary-foreground">
              {submitting ? <Loader2 className="animate-spin" size={16} /> : "ارسال پاسخ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Quotes;
