import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight, ShoppingBag, Minus, Plus, Store, MapPin, Phone, BadgeCheck,
  Truck, ShieldCheck, RefreshCw, Star, Package, ChevronLeft,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import WishlistButton from "@/components/WishlistButton";
import CompareButton from "@/components/CompareButton";
import ReviewSection from "@/components/ReviewSection";
import ProductReviewsDialog from "@/components/ProductReviewsDialog";
import PriceQuoteDialog from "@/components/PriceQuoteDialog";
import InquiryDialog from "@/components/InquiryDialog";
import SiteVisitDialog from "@/components/SiteVisitDialog";
import OptimizedImage from "@/components/OptimizedImage";
import SEO from "@/components/SEO";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Seller = {
  id: string;
  brand_name: string;
  description: string | null;
  city: string | null;
  phone: string | null;
  contact_name: string | null;
  contact_published: boolean;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  stock: number;
  category_id: string | null;
  profile_id: string;
  attributes?: Record<string, unknown> | null;
  rating?: number | null;
};

const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(n);

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [qty, setQty] = useState(1);
  const { addItem, setOpen } = useCart();

  const logView = useCallback(async (product_id: string, profile_id: string) => {
    const key = `viewed:${product_id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("product_views").insert({ product_id, profile_id, viewer_id: user?.id ?? null });
  }, []);

  useEffect(() => {
    if (!id) return;
    setQty(1);
    const load = async () => {
      setLoading(true);
      const { data: prod } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, stock, category_id, profile_id, attributes, rating")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();
      const p = prod as unknown as Product | null;
      setProduct(p);

      if (p) {
        const [{ data: sel }, { data: rel }] = await Promise.all([
          supabase
            .from("public_profiles")
            .select("id, brand_name, description, city, phone, contact_name, contact_published")
            .eq("id", p.profile_id)
            .maybeSingle(),
          supabase
            .from("products")
            .select("id, name, description, price, image_url, stock, category_id, profile_id, attributes, rating")
            .eq("profile_id", p.profile_id)
            .eq("is_active", true)
            .neq("id", p.id)
            .limit(4),
        ]);
        setSeller(sel as unknown as Seller | null);
        setRelated((rel as Product[]) ?? []);
        void logView(p.id, p.profile_id);
      }
      setLoading(false);
    };
    load();
  }, [id, logView]);

  const handleAddToCart = () => {
    if (!product || !seller) return;
    if (!product.price) {
      toast({ title: "قیمت ثبت نشده", description: "برای این محصول استعلام بفرستید", variant: "destructive" });
      return;
    }
    const res = addItem(
      {
        product_id: product.id,
        profile_id: seller.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        stock: product.stock,
      },
      qty
    );
    if (!res.ok) {
      toast({ title: "توجه", description: res.message, variant: "destructive" });
      return;
    }
    toast({ title: "افزوده شد", description: `${product.name} به سبد خرید اضافه شد` });
    setOpen(true);
  };

  const attrs = product?.attributes && typeof product.attributes === "object"
    ? (Object.entries(product.attributes as Record<string, unknown>).filter(([, v]) => v != null && v !== "") )
    : [];
  const rating = Number(product?.rating || 0);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {product && (
        <SEO title={product.name} description={product.description || `${product.name} در هومینو`} />
      )}
      <Navbar />
      <main className="container mx-auto px-6 pt-28 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-gold">خانه</Link>
          <ChevronLeft size={14} />
          <Link to="/shops" className="hover:text-gold">فروشگاه‌ها</Link>
          {seller && (
            <>
              <ChevronLeft size={14} />
              <Link to={`/shops/${seller.id}`} className="hover:text-gold">{seller.brand_name}</Link>
            </>
          )}
        </nav>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-10">
            <Skeleton className="aspect-square rounded-3xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : !product ? (
          <div className="text-center py-24">
            <Package size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-4">محصول یافت نشد.</p>
            <Button asChild><Link to="/shops">بازگشت به فروشگاه‌ها</Link></Button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {/* Gallery */}
              <div className="space-y-4">
                <div className="relative rounded-3xl overflow-hidden bg-muted shadow-card group">
                  {product.image_url ? (
                    <OptimizedImage
                      src={product.image_url}
                      alt={product.name}
                      className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="aspect-square w-full flex items-center justify-center text-muted-foreground">
                      <Package size={56} />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    <WishlistButton item={{
                      item_type: "product",
                      item_id: product.id,
                      title: product.name,
                      description: product.description,
                      image_url: product.image_url,
                      price: product.price,
                      metadata: { profile_id: product.profile_id, brand_name: seller?.brand_name },
                    }} />
                    <CompareButton item={{
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image_url: product.image_url,
                      rating,
                      attributes: product.attributes || {},
                      shop_id: product.profile_id,
                      shop_name: seller?.brand_name || "",
                    }} />
                  </div>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Truck, label: "ارسال سریع" },
                    { icon: ShieldCheck, label: "ضمانت اصالت" },
                    { icon: RefreshCw, label: "بازگشت کالا" },
                  ].map((b) => (
                    <div key={b.label} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border text-center">
                      <b.icon size={20} className="text-gold" />
                      <span className="text-xs text-muted-foreground font-semibold">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${product.stock > 0 ? "bg-emerald-brand/10 text-emerald-brand" : "bg-red-500/10 text-red-500"}`}>
                    {product.stock > 0 ? `موجود در انبار (${fmt(product.stock)})` : "ناموجود"}
                  </span>
                  {rating > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gold font-bold">
                      <Star size={13} className="fill-current" /> {rating.toFixed(1)}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-3">{product.name}</h1>

                {seller && (
                  <Link to={`/shops/${seller.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold mb-5">
                    <Store size={15} /> {seller.brand_name}
                    {seller.contact_published && <BadgeCheck size={14} className="text-emerald-brand" />}
                  </Link>
                )}

                {/* Price */}
                <div className="p-5 rounded-2xl bg-section-alt border border-border mb-6">
                  {product.price ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-gold">{fmt(product.price)}</span>
                      <span className="text-sm font-semibold text-muted-foreground">تومان</span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">قیمت با استعلام</span>
                  )}
                </div>

                {/* Quantity + Add to cart */}
                {product.price && product.stock > 0 && (
                  <div className="flex items-stretch gap-3 mb-6">
                    <div className="flex items-center rounded-full border border-border bg-card overflow-hidden">
                      <button onClick={() => setQty((q) => Math.min(q + 1, product.stock))} className="px-3.5 h-12 hover:bg-muted transition-colors" aria-label="افزایش"><Plus size={16} /></button>
                      <span className="w-10 text-center font-bold">{fmt(qty)}</span>
                      <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3.5 h-12 hover:bg-muted transition-colors" aria-label="کاهش"><Minus size={16} /></button>
                    </div>
                    <Button onClick={handleAddToCart} className="flex-1 h-12 gradient-gold text-charcoal font-bold gap-2 rounded-full shadow-luxury hover:opacity-90">
                      <ShoppingBag size={18} /> افزودن به سبد خرید
                    </Button>
                  </div>
                )}

                {/* Secondary actions */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {seller && (
                    <>
                      <PriceQuoteDialog profile_id={seller.id} request_type="product" product_id={product.id} title={product.name} label="درخواست قیمت سفارشی" variant="outline" size="sm" />
                      <InquiryDialog profile_id={seller.id} product_id={product.id} label="ارسال استعلام" variant="outline" size="sm" />
                      <SiteVisitDialog profile_id={seller.id} />
                    </>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold mb-2">توضیحات محصول</h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
                  </div>
                )}

                {/* Attributes */}
                {attrs.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3">مشخصات</h2>
                    <dl className="rounded-2xl border border-border overflow-hidden">
                      {attrs.map(([k, v], i) => (
                        <div key={k} className={`flex items-center justify-between px-4 py-3 text-sm ${i % 2 ? "bg-card" : "bg-section-alt"}`}>
                          <dt className="text-muted-foreground">{k}</dt>
                          <dd className="font-semibold text-foreground">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Seller card */}
                {seller && (
                  <div className="p-5 rounded-2xl border border-border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold flex items-center gap-2"><Store size={18} className="text-gold" /> فروشنده</h3>
                      <Link to={`/shops/${seller.id}`} className="text-sm text-gold hover:underline">مشاهده فروشگاه</Link>
                    </div>
                    <p className="font-semibold text-foreground">{seller.brand_name}</p>
                    {seller.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{seller.description}</p>}
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                      {seller.city && <span className="flex items-center gap-1"><MapPin size={14} className="text-gold" /> {seller.city}</span>}
                      {seller.contact_published && seller.phone && (
                        <a href={`tel:${seller.phone}`} className="flex items-center gap-1 hover:text-gold"><Phone size={14} className="text-gold" /> {seller.phone}</a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reviews */}
            <div className="mt-10">
              <ProductReviewsDialog productId={product.id} profileId={product.profile_id} productName={product.name} />
            </div>
            <ReviewSection targetType="product" targetId={product.id} profileId={product.profile_id} />

            {/* Related */}
            {related.length > 0 && (
              <section className="mt-14">
                <h2 className="text-2xl font-black mb-6">محصولات مشابه از این فروشنده</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  {related.map((r) => (
                    <Link to={`/product/${r.id}`} key={r.id} className="group rounded-2xl overflow-hidden bg-card border border-border hover:border-gold/40 hover:shadow-luxury hover:-translate-y-1 transition-all duration-500">
                      <div className="relative overflow-hidden bg-muted">
                        {r.image_url ? (
                          <OptimizedImage src={r.image_url} alt={r.name} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-700" />
                        ) : (
                          <div className="aspect-square flex items-center justify-center text-muted-foreground"><Package size={32} /></div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-bold text-sm line-clamp-1">{r.name}</h3>
                        {r.price ? (
                          <span className="text-gold font-black text-sm">{fmt(r.price)} <span className="text-xs font-semibold text-muted-foreground">تومان</span></span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-semibold">استعلام قیمت</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
