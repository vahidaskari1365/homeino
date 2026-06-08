import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import PromoteListingDialog from "@/components/PromoteListingDialog";
import { Loader2, MapPin, Tag, Plus, Flame, Sparkles, Trash2 } from "lucide-react";

type Listing = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  city: string | null;
  phone?: string | null;
  approval_status: string;
  is_active: boolean;
  is_urgent: boolean;
  is_featured: boolean;
  featured_until: string | null;
  urgent_until: string | null;
  bumped_at: string | null;
  created_at: string;
};

const sortListings = (list: Listing[]) => {
  const now = Date.now();
  const featured = (l: Listing) => l.is_featured && (!l.featured_until || new Date(l.featured_until).getTime() > now);
  const urgent = (l: Listing) => l.is_urgent && (!l.urgent_until || new Date(l.urgent_until).getTime() > now);
  return [...list].sort((a, b) => {
    if (featured(a) !== featured(b)) return featured(a) ? -1 : 1;
    if (urgent(a) !== urgent(b)) return urgent(a) ? -1 : 1;
    const at = a.bumped_at ? new Date(a.bumped_at).getTime() : new Date(a.created_at).getTime();
    const bt = b.bumped_at ? new Date(b.bumped_at).getTime() : new Date(b.created_at).getTime();
    return bt - at;
  });
};

const SecondHand = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [list, setList] = useState<Listing[]>([]);
  const [mine, setMine] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "", city: "", phone: "", image_url: "" });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      await load(user?.id);
      setLoading(false);
    })();
  }, []);

  const load = async (uid?: string | null) => {
    // Public list uses the safe view (no phone exposed to anonymous visitors)
    const { data: pub } = await supabase
      .from("public_second_hand_listings")
      .select("*");
    setList(sortListings(((pub as unknown) as Listing[]) ?? []));
    if (uid) {
      const { data: my } = await supabase
        .from("second_hand_listings")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      setMine((my as Listing[]) ?? []);
    }
  };

  const submit = async () => {
    if (!userId) { navigate("/auth"); return; }
    if (!form.title.trim()) { toast({ title: "عنوان الزامی است", variant: "destructive" }); return; }
    const { error } = await supabase.from("second_hand_listings").insert({
      user_id: userId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      price: form.price ? Number(form.price) : null,
      city: form.city.trim() || null,
      phone: form.phone.trim() || null,
      image_url: form.image_url.trim() || null,
    });
    if (error) { toast({ title: "خطا", description: error.message, variant: "destructive" }); return; }
    toast({ title: "ثبت شد", description: "آگهی پس از تأیید نمایش داده می‌شود" });
    setForm({ title: "", description: "", price: "", city: "", phone: "", image_url: "" });
    setOpen(false);
    await load(userId);
  };

  const removeListing = async (id: string) => {
    const { error } = await supabase.from("second_hand_listings").delete().eq("id", id);
    if (error) { toast({ title: "خطا", description: error.message, variant: "destructive" }); return; }
    await load(userId);
  };

  const renderCard = (l: Listing, mineMode = false) => {
    const now = Date.now();
    const isFeatured = l.is_featured && (!l.featured_until || new Date(l.featured_until).getTime() > now);
    const isUrgent = l.is_urgent && (!l.urgent_until || new Date(l.urgent_until).getTime() > now);
    return (
      <Card key={l.id} className={`overflow-hidden transition ${isFeatured ? "border-gold ring-1 ring-gold/40 shadow-lg" : "hover:border-gold/40"}`}>
        <div className="relative">
          {l.image_url ? (
            <img src={l.image_url} alt={l.title} className="w-full h-44 object-cover" />
          ) : (
            <div className="w-full h-44 bg-muted flex items-center justify-center"><Tag size={32} className="text-muted-foreground/30" /></div>
          )}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {isFeatured && <Badge className="bg-gold text-primary-foreground"><Sparkles size={12} className="ml-1" />ویژه</Badge>}
            {isUrgent && <Badge variant="destructive"><Flame size={12} className="ml-1" />فوری</Badge>}
          </div>
        </div>
        <CardContent className="pt-4 space-y-2">
          <h3 className="font-bold">{l.title}</h3>
          {l.city && <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin size={14} />{l.city}</div>}
          {l.price && <div className="text-gold font-bold">{Number(l.price).toLocaleString("fa-IR")} تومان</div>}
          {mineMode && (
            <div className="flex flex-col gap-2 pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                وضعیت: {l.approval_status === "approved" ? "تأیید شده" : l.approval_status === "pending" ? "در انتظار تأیید" : "رد شده"}
              </div>
              <div className="flex gap-2">
                {userId && <PromoteListingDialog listingId={l.id} userId={userId} onDone={() => load(userId)} />}
                <Button size="sm" variant="ghost" onClick={() => removeListing(l.id)}><Trash2 size={14} /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const featuredAds = list.filter((l) => l.is_featured && (!l.featured_until || new Date(l.featured_until).getTime() > Date.now()));

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-6 pt-28 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-display text-gold font-bold">آگهی دست دوم</h1>
            <p className="text-muted-foreground mt-2">بخرید، بفروشید و آگهی خود را ویژه کنید</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gradient-gold text-primary-foreground"><Plus size={16} className="ml-1" />ثبت آگهی</Button></DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>ثبت آگهی جدید</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2"><Label>عنوان</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>توضیحات</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2"><Label>قیمت (تومان)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                  <div className="space-y-2"><Label>شهر</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>تلفن تماس</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>تصویر (URL)</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={submit} className="gradient-gold text-primary-foreground">ثبت</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={40} /></div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">همه آگهی‌ها ({list.length})</TabsTrigger>
              <TabsTrigger value="featured"><Sparkles size={14} className="ml-1" />ویژه ({featuredAds.length})</TabsTrigger>
              {userId && <TabsTrigger value="mine">آگهی‌های من ({mine.length})</TabsTrigger>}
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {featuredAds.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gold"><Sparkles size={18} />آگهی‌های ویژه</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{featuredAds.slice(0, 4).map((l) => renderCard(l))}</div>
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {list.filter((l) => !featuredAds.find((f) => f.id === l.id)).map((l) => renderCard(l))}
                {list.length === 0 && <Card className="col-span-full"><CardContent className="py-10 text-center text-muted-foreground">هنوز آگهی ثبت نشده است</CardContent></Card>}
              </div>
            </TabsContent>

            <TabsContent value="featured" className="mt-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredAds.map((l) => renderCard(l))}
                {featuredAds.length === 0 && <Card className="col-span-full"><CardContent className="py-10 text-center text-muted-foreground">آگهی ویژه‌ای موجود نیست</CardContent></Card>}
              </div>
            </TabsContent>

            {userId && (
              <TabsContent value="mine" className="mt-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mine.map((l) => renderCard(l, true))}
                  {mine.length === 0 && <Card className="col-span-full"><CardContent className="py-10 text-center text-muted-foreground">هنوز آگهی ثبت نکرده‌اید</CardContent></Card>}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SecondHand;
