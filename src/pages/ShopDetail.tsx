import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, MapPin, Phone, Globe, User, Package, BadgeCheck, Lock, CalendarCheck, ShoppingBag } from "lucide-react";
import { ProfileTrustPills } from "@/components/ProfileTrustPills";
import { formatPersianDate } from "@/lib/date";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InquiryDialog from "@/components/InquiryDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import WishlistButton from "@/components/WishlistButton";
import CompareButton from "@/components/CompareButton";
import ViewInMyRoomButton from "@/components/ViewInMyRoomButton";
import ReviewSection from "@/components/ReviewSection";
import ProductReviewsDialog from "@/components/ProductReviewsDialog";
import PriceQuoteDialog from "@/components/PriceQuoteDialog";
import SiteVisitDialog from "@/components/SiteVisitDialog";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import OptimizedImage from "@/components/OptimizedImage";
import SEO from "@/components/SEO";

type Profile = {
  id: string;
  brand_name: string;
  description: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  contact_name: string | null;
  contact_published: boolean;
  contact_published_at: string | null;
  profile_categories: { producer_categories: { id: string; name: string } | null }[];
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  stock: number;
  category_id: string | null;
  attributes?: Record<string, unknown>;
  rating?: number;
};

const ShopDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const { addItem, setOpen } = useCart();

  const logView = async (product_id: string, profile_id: string) => {
    const key = `viewed:${product_id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("product_views").insert({ product_id, profile_id, viewer_id: user?.id ?? null });
  };

  const handleAddToCart = (p: Product) => {
    if (!profile) return;
    if (!p.price) {
      toast({ title: "قیمت ثبت نشده", description: "برای این محصول استعلام بفرستید", variant: "destructive" });
      return;
    }
    const res = addItem({
      product_id: p.id,
      profile_id: profile.id,
      name: p.name,
      price: p.price,
      image_url: p.image_url,
      stock: p.stock,
    });
    if (!res.ok) {
      toast({ title: "توجه", description: res.message, variant: "destructive" });
      return;
    }
    toast({ title: "اضافه شد", description: `${p.name} به سبد خرید اضافه شد` });
    void logView(p.id, profile.id);
    setOpen(true);
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [profRes, prodRes] = await Promise.all([
        supabase
          .from("public_profiles")
          .select("id, brand_name, description, city, address, phone, website, contact_name, contact_published, contact_published_at")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("products")
          .select("id, name, description, price, image_url, stock, category_id, attributes, rating")
          .eq("profile_id", id)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);
      const prof = profRes.data as unknown as Profile | null;
      setProfile(prof);
      const prodList = (prodRes.data as Product[]) ?? [];
      setProducts(prodList);
      if (prof) {
        // Fire-and-forget view logging: one per product per browser session
        void (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          const toLog = prodList.filter((p) => !sessionStorage.getItem(`viewed:${p.id}`));
          if (toLog.length === 0) return;
          toLog.forEach((p) => sessionStorage.setItem(`viewed:${p.id}`, "1"));
          await supabase.from("product_views").insert(
            toLog.map((p) => ({ product_id: p.id, profile_id: prof.id, viewer_id: user?.id ?? null }))
          );
        })();
      }
      setLoading(false);
    };
    load();
  }, [id]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {profile && (
        <SEO 
          title={profile.brand_name} 
          description={profile.description || `محصولات و خدمات ${profile.brand_name} در خانه‌زیبا`}
        />
      )}
      <Navbar />
      <main className="container mx-auto px-6 pt-28 pb-16">
        <Link to="/shops" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold mb-6 text-sm">
          <ArrowRight size={16} /> بازگشت به فروشگاه‌ها
        </Link>

        {loading ? (
          <Skeleton className="h-48 mb-8" />
        ) : !profile ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">فروشگاه یافت نشد.</p>
            <Button asChild><Link to="/shops">بازگشت</Link></Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="mb-10 p-6 md:p-8 rounded-xl border border-border bg-card">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <h1 className="text-3xl md:text-4xl font-display text-gold font-bold">{profile.brand_name}</h1>
                <div className="flex flex-col items-end gap-1">
                  {profile.contact_published && (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-brand/15 text-emerald-brand border border-emerald-brand/30">
                        <BadgeCheck size={14} /> اطلاعات تأیید شده
                      </span>
                      {profile.contact_published_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarCheck size={12} /> آخرین تأیید: {formatPersianDate(profile.contact_published_at)}
                        </span>
                      )}
                    </>
                  )}
                  <ProfileTrustPills profileId={profile.id} size="xs" />
                </div>
              </div>
              {profile.description && (
                <p className="text-muted-foreground leading-relaxed mb-4 max-w-3xl">{profile.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mb-5">
                {profile.profile_categories?.map((pc) =>
                  pc.producer_categories ? (
                    <Badge key={pc.producer_categories.id} variant="secondary">
                      {pc.producer_categories.name}
                    </Badge>
                  ) : null
                )}
              </div>
              {profile.contact_published ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {profile.contact_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User size={16} className="text-gold" /> {profile.contact_name}
                    </div>
                  )}
                  {profile.phone && (
                    <a href={`tel:${profile.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-gold">
                      <Phone size={16} className="text-gold" /> {profile.phone}
                    </a>
                  )}
                  {profile.city && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin size={16} className="text-gold" /> {profile.city}
                    </div>
                  )}
                  {profile.address && (
                    <div className="flex items-start gap-2 text-muted-foreground md:col-span-2">
                      <MapPin size={16} className="text-gold mt-0.5" /> {profile.address}
                    </div>
                  )}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-muted-foreground hover:text-gold md:col-span-2">
                      <Globe size={16} className="text-gold" /> {profile.website}
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-md border border-dashed border-border bg-muted/30">
                  <Lock size={14} /> اطلاعات تماس این فروشگاه هنوز توسط تولیدکننده منتشر نشده است.
                </div>
              )}
              <div className="mt-5 pt-5 border-t border-border flex flex-wrap gap-2">
                <InquiryDialog profile_id={profile.id} label="ارسال درخواست به فروشگاه" />
                <PriceQuoteDialog
                  profile_id={profile.id}
                  request_type="custom"
                  title={`درخواست قیمت سفارشی از ${profile.brand_name}`}
                  label="درخواست قیمت سفارشی"
                />
                <SiteVisitDialog profile_id={profile.id} />
              </div>
            </header>

            {/* Products */}
            <section>
              <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
                <Package className="text-gold" size={22} /> محصولات ({products.length})
              </h2>
              {products.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">هنوز محصولی ثبت نشده است.</p>
              ) : (
                <div className="columns-1 sm:columns-2 lg:columns-4 gap-6 [column-fill:_auto] space-y-6">
                  {products.map((p) => (
                    <Card key={p.id} className="break-inside-avoid overflow-hidden border border-border/60 rounded-2xl hover:border-gold/50 shadow-sm hover:shadow-xl transition-all duration-300 bg-card mb-6">
                      <div className="relative overflow-hidden bg-muted group">
                        {p.image_url ? (
                          <OptimizedImage src={p.image_url} alt={p.name}
                            className="w-full h-auto max-h-[350px] object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="aspect-[4/3] w-full flex items-center justify-center text-muted-foreground">
                            <Package size={40} />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex flex-col gap-2 z-10">
                          <WishlistButton item={{
                            item_type: "product",
                            item_id: p.id,
                            title: p.name,
                            description: p.description,
                            image_url: p.image_url,
                            price: p.price,
                            metadata: { profile_id: profile.id, brand_name: profile.brand_name },
                          }} />
                          <CompareButton item={{
                            id: p.id,
                            name: p.name,
                            price: p.price,
                            image_url: p.image_url,
                            rating: Number(p.rating || 0),
                            attributes: p.attributes || {},
                            shop_id: profile.id,
                            shop_name: profile.brand_name,
                          }} />
                          <ViewInMyRoomButton
                            productId={p.id}
                            productName={p.name}
                            productImage={p.image_url}
                            productPrice={p.price}
                          />
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-bold text-base line-clamp-1 hover:text-gold transition-colors">{p.name}</h3>
                        {p.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{p.description}</p>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                          {p.price ? (
                            <span className="text-gold font-extrabold text-base">
                              {new Intl.NumberFormat("fa-IR").format(p.price)} تومان
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs font-semibold">استعلام قیمت</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${p.stock > 0 ? "bg-emerald-brand/10 text-emerald-brand" : "bg-red-500/10 text-red-500"}`}>
                            {p.stock > 0 ? `موجود` : "ناموجود"}
                          </span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            className="flex-1 gradient-gold text-primary-foreground gap-1 font-bold text-xs"
                            disabled={p.stock <= 0 || !p.price}
                            onClick={() => handleAddToCart(p)}
                          >
                            <ShoppingBag size={14} /> افزودن
                          </Button>
                          <InquiryDialog profile_id={profile.id} product_id={p.id} label="استعلام" variant="outline" size="sm" />
                        </div>
                        <PriceQuoteDialog
                          profile_id={profile.id}
                          request_type="product"
                          product_id={p.id}
                          title={p.name}
                          label="درخواست قیمت سفارشی"
                          variant="secondary"
                          size="sm"
                          fullWidth
                        />
                        <div className="pt-1">
                          <ProductReviewsDialog productId={p.id} profileId={profile.id} productName={p.name} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <ReviewSection targetType="shop" targetId={profile.id} profileId={profile.id} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ShopDetail;
