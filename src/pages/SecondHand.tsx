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
import { Loader2, MapPin, Tag, Plus, Flame, Sparkles, Trash2, ChevronRight, ChevronLeft, Phone } from "lucide-react";
import SEO from "@/components/SEO";

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
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 12;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      await load(user?.id, page);
      setLoading(false);
    })();
  }, [page]);

  const load = async (uid?: string | null, pageNum = 0) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Public list uses the safe view (no phone exposed to anonymous visitors)
    const { data: pub, count } = await supabase
      .from("public_second_hand_listings")
      .select("*", { count: 'exact' })
      .range(from, to);
    
    setList(sortListings(((pub as unknown) as Listing[]) ?? []));
    setTotalCount(count ?? 0);

    if (uid) {
      const { data: my } = await supabase
        .from("second_hand_listings")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      setMine((my as Listing[]) ?? []);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
      <Card 
        key={l.id} 
        onClick={() => { setSelectedListing(l); setIsDetailOpen(true); }}
        className={`break-inside-avoid mb-4 inline-block w-full overflow-hidden transition-all duration-300 rounded-2xl cursor-pointer border border-border/50 hover:border-gold/50 hover:shadow-luxury group relative bg-card ${isFeatured ? "border-gold ring-1 ring-gold/40 shadow-md" : ""}`}
      >
        <div className="relative overflow-hidden">
          {l.image_url ? (
            <img 
              src={l.image_url} 
              alt={l.title} 
              className="w-full h-auto max-h-[350px] min-h-[160px] object-cover transition-transform duration-500 group-hover:scale-105" 
            />
          ) : (
            <div className="w-full h-44 bg-muted flex items-center justify-center">
              <Tag size={32} className="text-muted-foreground/30" />
            </div>
          )}

          {/* Badge overlays on top corner */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
            {isFeatured && <Badge className="bg-gold text-primary-foreground"><Sparkles size={10} className="ml-1" />ویژه</Badge>}
            {isUrgent && <Badge variant="destructive" className="bg-red-500"><Flame size={10} className="ml-1" />فوری</Badge>}
          </div>

          {/* Pinterest-style Hover Info Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 text-white z-20">
            <h3 className="font-bold text-base line-clamp-2 mb-1">{l.title}</h3>
            {l.city && (
              <div className="flex items-center gap-1 text-xs text-gray-300 mb-2">
                <MapPin size={12} />
                {l.city}
              </div>
            )}
            {l.description && (
              <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                {l.description}
              </p>
            )}
            <div className="flex items-center justify-between border-t border-white/20 pt-2">
              {l.price ? (
                <span className="text-gold font-extrabold text-sm">
                  {Number(l.price).toLocaleString("en-US")} تومان
                </span>
              ) : (
                <span className="text-gray-300 text-xs">توافقی</span>
              )}
              <span className="text-[10px] bg-gold/90 text-primary-foreground font-bold px-2.5 py-1 rounded-lg">
                مشاهده جزئیات
              </span>
            </div>
          </div>
        </div>

        {/* Regular static content underneath (visible on mobile / when not hovered) */}
        <CardContent className="p-4 space-y-2 group-hover:md:opacity-80 transition-opacity duration-300">
          <h3 className="font-bold text-foreground line-clamp-1">{l.title}</h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {l.city && (
              <div className="flex items-center gap-1">
                <MapPin size={12} />
                {l.city}
              </div>
            )}
            {l.price ? (
              <div className="text-gold font-bold">{Number(l.price).toLocaleString("en-US")} تومان</div>
            ) : (
              <div className="text-muted-foreground">توافقی</div>
            )}
          </div>
          {mineMode && (
            <div className="flex flex-col gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
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
      <SEO 
        title="آگهی‌های دست دوم" 
        description="خرید و فروش لوازم خانگی و دکوراسیون دست دوم در هومینو." 
      />
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
          <>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">همه آگهی‌ها ({totalCount})</TabsTrigger>
                <TabsTrigger value="featured"><Sparkles size={14} className="ml-1" />ویژه ({featuredAds.length})</TabsTrigger>
                {userId && <TabsTrigger value="mine">آگهی‌های من ({mine.length})</TabsTrigger>}
              </TabsList>

              <TabsContent value="all" className="mt-6">
                {featuredAds.length > 0 && page === 0 && (
                  <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gold"><Sparkles size={18} />آگهی‌های ویژه</h2>
                    <div className="columns-1 sm:columns-2 lg:columns-4 gap-4 space-y-4">{featuredAds.slice(0, 4).map((l) => renderCard(l))}</div>
                  </div>
                )}
                <div className="columns-1 sm:columns-2 lg:columns-4 gap-4 space-y-4">
                  {list.filter((l) => !featuredAds.find((f) => f.id === l.id)).map((l) => renderCard(l))}
                  {list.length === 0 && <Card className="col-span-full"><CardContent className="py-10 text-center text-muted-foreground">هنوز آگهی ثبت نشده است</CardContent></Card>}
                </div>
              </TabsContent>

              <TabsContent value="featured" className="mt-6">
                <div className="columns-1 sm:columns-2 lg:columns-4 gap-4 space-y-4">
                  {featuredAds.map((l) => renderCard(l))}
                  {featuredAds.length === 0 && <Card className="col-span-full"><CardContent className="py-10 text-center text-muted-foreground">آگهی ویژه‌ای موجود نیست</CardContent></Card>}
                </div>
              </TabsContent>

              {userId && (
                <TabsContent value="mine" className="mt-6">
                  <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                    {mine.map((l) => renderCard(l, true))}
                    {mine.length === 0 && <Card className="col-span-full"><CardContent className="py-10 text-center text-muted-foreground">هنوز آگهی ثبت نکرده‌اید</CardContent></Card>}
                  </div>
                </TabsContent>
              )}
            </Tabs>

            {totalPages > 1 && (
              <div className="flex justify-center mt-12 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.max(0, prev - 1))}
                  disabled={page === 0}
                >
                  <ChevronRight size={16} className="ml-1" /> قبلی
                </Button>
                <div className="flex items-center px-4 text-sm font-medium">
                  صفحه {page + 1} از {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={page === totalPages - 1}
                >
                  بعدی <ChevronLeft size={16} className="mr-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />

      {/* Listing Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[550px] overflow-hidden rounded-3xl border border-border/40 bg-card p-0" dir="rtl">
          {selectedListing && (
            <div className="flex flex-col">
              {/* Image Header */}
              <div className="relative w-full h-64 bg-muted overflow-hidden">
                {selectedListing.image_url ? (
                  <img 
                    src={selectedListing.image_url} 
                    alt={selectedListing.title} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Tag size={48} className="text-muted-foreground/30" />
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-4 right-4 flex flex-col gap-1">
                  {selectedListing.is_featured && <Badge className="bg-gold text-primary-foreground"><Sparkles size={12} className="ml-1" />آگهی ویژه</Badge>}
                  {selectedListing.is_urgent && <Badge variant="destructive" className="bg-red-500"><Flame size={12} className="ml-1" />آگهی فوری</Badge>}
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground leading-snug">{selectedListing.title}</h2>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <MapPin size={14} />
                    <span>{selectedListing.city || "تهران"}</span>
                    <span className="text-border/60">•</span>
                    <span>ثبت شده در: {new Date(selectedListing.created_at).toLocaleDateString("fa-IR")}</span>
                  </div>
                </div>

                <div className="border-t border-border/30 pt-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">قیمت</span>
                    <span className="text-xl font-black text-gold mt-1">
                      {selectedListing.price ? `${Number(selectedListing.price).toLocaleString("en-US")} تومان` : "توافقی"}
                    </span>
                  </div>

                  {selectedListing.phone && (
                    <a 
                      href={`tel:${selectedListing.phone}`}
                      className="flex items-center gap-2 bg-emerald-brand hover:bg-emerald-brand/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors"
                    >
                      <Phone size={16} />
                      تماس: {selectedListing.phone}
                    </a>
                  )}
                </div>

                {selectedListing.description && (
                  <div className="border-t border-border/30 pt-4">
                    <h4 className="text-sm font-bold text-foreground mb-2">توضیحات آگهی</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedListing.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SecondHand;
