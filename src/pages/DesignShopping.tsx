import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowLeft, FileText, Package, Store, Clock, CheckCircle, Truck, Loader2, CreditCard, AlertCircle, Trash2, Plus, Minus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";

interface ShoppingItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  shop_name: string;
  profile_id: string;
  estimated_delivery: string;
  stock: number;
}

// Estimated delivery labels
const DELIVERY_OPTIONS = [
  { min: 0, max: 2, label: "فوری (۱-۲ روز)" },
  { min: 3, max: 5, label: "سریع (۳-۵ روز)" },
  { min: 6, max: 10, label: "معمولی (۶-۱۰ روز)" },
  { min: 11, max: 21, label: "طولانی (۲-۳ هفته)" },
];

const getDeliveryLabel = (idx: number) => {
  return DELIVERY_OPTIONS[idx % DELIVERY_OPTIONS.length].label;
};

const formatPrice = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fa-IR").format(n) + " تومان";

const DesignShopping = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, setOpen: setCartOpen } = useCart();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [sending, setSending] = useState(false);
  const [addingAll, setAddingAll] = useState(false);

  // Load products – try localStorage first, then Supabase
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Try reading from localStorage (set by AIDesign page)
        const stored = localStorage.getItem(`design_products_${id}`);
        if (stored) {
          const parsed: ShoppingItem[] = JSON.parse(stored);
          if (parsed.length > 0) {
            setItems(parsed);
            const qtyMap: Record<string, number> = {};
            parsed.forEach((p) => { qtyMap[p.id] = p.quantity || 1; });
            setQuantities(qtyMap);
            setLoading(false);
            return;
          }
        }

        // Fallback: fetch random products from Supabase for demo purposes
        const { data: prods, error: err } = await supabase
          .from("products")
          .select("id, name, price, image_url, profile_id, stock")
          .eq("is_active", true)
          .not("image_url", "is", null)
          .not("price", "is", null)
          .limit(12);

        if (err) throw err;

        if (!prods || prods.length === 0) {
          setError("هنوز محصولی در بازار ثبت نشده است.");
          setLoading(false);
          return;
        }

        // Fetch shop names
        const profileIds = [...new Set(prods.map((p) => p.profile_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", profileIds);

        const profileMap: Record<string, string> = {};
        (profiles || []).forEach((p) => { profileMap[p.id] = p.display_name || "فروشگاه"; });

        const mapped: ShoppingItem[] = prods.map((p, idx) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          quantity: 1,
          image_url: p.image_url,
          shop_name: profileMap[p.profile_id] || "فروشگاه",
          profile_id: p.profile_id,
          estimated_delivery: getDeliveryLabel(idx),
          stock: p.stock || 10,
        }));

        setItems(mapped);
        const qtyMap: Record<string, number> = {};
        mapped.forEach((p) => { qtyMap[p.id] = 1; });
        setQuantities(qtyMap);
      } catch (e) {
        console.error("Error loading shopping items:", e);
        setError("خطا در بارگذاری اطلاعات محصولات");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const updateQty = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(current + delta, 99));
      return { ...prev, [productId]: next };
    });
  };

  const totalAmount = useMemo(
    () => items.reduce((sum, p) => sum + p.price * (quantities[p.id] || 1), 0),
    [items, quantities]
  );

  // Group by shop for display
  const groupedByShop = useMemo(() => {
    const groups: Record<string, { shop: string; items: ShoppingItem[] }> = {};
    items.forEach((p) => {
      const key = p.profile_id;
      if (!groups[key]) groups[key] = { shop: p.shop_name, items: [] };
      groups[key].items.push(p);
    });
    return Object.values(groups);
  }, [items]);

  const handleBuyAll = async () => {
    if (items.length === 0) return;
    setAddingAll(true);

    try {
      let addedCount = 0;
      let skippedCount = 0;

      for (const p of items) {
        const qty = quantities[p.id] || 1;
        const result = addItem(
          {
            product_id: p.id,
            profile_id: p.profile_id,
            name: p.name,
            price: p.price,
            image_url: p.image_url,
            stock: p.stock,
          },
          qty
        );
        if (result.ok) addedCount++;
        else skippedCount++;
      }

      if (addedCount > 0) {
        toast.success(`${addedCount} محصول به سبد خرید اضافه شد`);
        setCartOpen(true);
      }
      if (skippedCount > 0) {
        toast.info(`${skippedCount} محصول به دلیل محدودیت سبد خرید (تک فروشگاه) اضافه نشد`);
      }

      if (addedCount > 0) {
        navigate("/checkout");
      }
    } catch (e) {
      toast.error("خطا در افزودن به سبد خرید");
    } finally {
      setAddingAll(false);
    }
  };

  const handleSendForExecution = async () => {
    if (items.length === 0) return;
    setSending(true);

    try {
      // Simulate sending the project for execution
      await new Promise((r) => setTimeout(r, 1500));

      // Here you would typically create a project/order in the database
      const projectData = {
        design_id: id,
        items: items.map((p) => ({
          product_id: p.id,
          name: p.name,
          price: p.price,
          quantity: quantities[p.id] || 1,
          shop_name: p.shop_name,
          profile_id: p.profile_id,
        })),
        total_amount: totalAmount,
        status: "pending_execution",
        created_at: new Date().toISOString(),
      };

      // Store in localStorage for now (in production, save to DB)
      const existing = JSON.parse(localStorage.getItem("execution_projects") || "[]");
      existing.push(projectData);
      localStorage.setItem("execution_projects", JSON.stringify(existing));

      toast.success("پروژه با موفقیت برای اجرا ارسال شد", {
        description: "تیم اجرایی هومینو به زودی با شما تماس خواهد گرفت.",
      });

      navigate("/dashboard");
    } catch (e) {
      toast.error("خطا در ارسال پروژه");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin text-accent mx-auto mb-4" size={40} />
            <p className="text-muted-foreground">در حال بارگذاری لیست خرید...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="text-destructive mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold mb-2">خطا</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" onClick={() => navigate("/ai-design")}>
              <ArrowLeft size={16} className="ml-2" /> بازگشت به طراحی
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      <main className="container mx-auto px-4 md:px-6 pt-24 pb-16">
        {/* Breadcrumb */}
        <Link
          to="/ai-design"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-accent mb-6 text-sm transition-colors"
        >
          <ArrowLeft size={16} /> بازگشت به طراحی
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-3">
              <ShoppingBag size={14} className="text-accent" />
              <span className="text-accent text-xs font-bold">لیست خرید طراحی</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold">سبد خرید طراحی #{id?.slice(0, 8)}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {items.length} محصول از {groupedByShop.length} فروشگاه
            </p>
          </div>

          {/* Price summary badge */}
          <div className="bg-card border border-border rounded-2xl px-6 py-3 text-center md:text-left">
            <p className="text-xs text-muted-foreground mb-1">مجموع قیمت</p>
            <p className="text-2xl font-bold text-accent">{formatPrice(totalAmount)}</p>
          </div>
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Shopping list table */}
          <div className="lg:col-span-2 space-y-6">
            {groupedByShop.map((group) => (
              <Card key={group.shop} className="overflow-hidden border-border/60 shadow-sm">
                <CardHeader className="bg-muted/30 pb-3 border-b border-border/40">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Store size={18} className="text-accent" />
                    <span>{group.shop}</span>
                    <Badge variant="secondary" className="text-[10px] mr-auto">
                      {group.items.length} کالا
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Table header - hidden on mobile */}
                  <div className="hidden md:grid grid-cols-[80px_2fr_1.2fr_1fr_80px_1.2fr] gap-3 px-5 py-3 bg-muted/20 text-xs font-bold text-muted-foreground border-b border-border/40">
                    <span>تصویر</span>
                    <span>نام محصول</span>
                    <span>فروشگاه</span>
                    <span>قیمت واحد</span>
                    <span>تعداد</span>
                    <span>تحویل تخمینی</span>
                  </div>

                  {/* Items */}
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[60px_1fr] md:grid-cols-[80px_2fr_1.2fr_1fr_80px_1.2fr] gap-3 items-center px-4 md:px-5 py-4 border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors"
                    >
                      {/* Image */}
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-muted overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Package size={20} />
                          </div>
                        )}
                      </div>

                      {/* Info - stacked on mobile */}
                      <div className="md:hidden">
                        <p className="text-sm font-bold line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.shop_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-accent text-sm font-bold">{formatPrice(item.price)}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Truck size={10} /> {item.estimated_delivery}
                          </span>
                        </div>
                      </div>

                      {/* Desktop columns */}
                      <div className="hidden md:block">
                        <p className="text-sm font-bold line-clamp-1">{item.name}</p>
                      </div>
                      <div className="hidden md:block">
                        <span className="text-sm text-muted-foreground">{item.shop_name}</span>
                      </div>
                      <div className="hidden md:block">
                        <span className="text-accent text-sm font-bold">{formatPrice(item.price)}</span>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          disabled={(quantities[item.id] || 1) <= 1}
                          className="w-7 h-7 rounded-lg bg-card border border-border hover:bg-accent/10 hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold tabular-nums">
                          {quantities[item.id] || 1}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          disabled={(quantities[item.id] || 1) >= (item.stock || 99)}
                          className="w-7 h-7 rounded-lg bg-card border border-border hover:bg-accent/10 hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Delivery estimate - desktop */}
                      <div className="hidden md:flex items-center gap-1.5">
                        <Truck size={12} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{item.estimated_delivery}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>

                {/* Shop subtotal */}
                <CardFooter className="bg-muted/10 flex justify-between py-3 px-5 text-sm">
                  <span className="text-muted-foreground">جمع کل {group.shop}</span>
                  <span className="font-bold text-accent">
                    {formatPrice(
                      group.items.reduce(
                        (s, p) => s + p.price * (quantities[p.id] || 1),
                        0
                      )
                    )}
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Sidebar - Summary & Actions */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            {/* Order summary */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag size={18} className="text-accent" />
                  خلاصه سفارش
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">تعداد کالاها</span>
                  <span className="font-bold">{items.length} عدد</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">تعداد فروشندگان</span>
                  <span className="font-bold">{groupedByShop.length}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">جمع کل</span>
                  <span className="font-bold text-accent text-lg">{formatPrice(totalAmount)}</span>
                </div>
                <Separator />
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <Truck size={10} />
                  هزینه ارسال پس از تأیید سفارش محاسبه می‌شود
                </div>
              </CardContent>
            </Card>

            {/* CTA: Buy All */}
            <Button
              onClick={handleBuyAll}
              disabled={addingAll || items.length === 0}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-6 rounded-xl text-base transition-all shadow-lg shadow-accent/20"
            >
              {addingAll ? (
                <><Loader2 className="animate-spin ml-2" size={18} /> در حال افزودن...</>
              ) : (
                <><ShoppingBag size={18} className="ml-2" /> خرید همه محصولات</>
              )}
            </Button>

            {/* CTA: Send for Project Execution */}
            <Button
              onClick={handleSendForExecution}
              disabled={sending || items.length === 0}
              variant="outline"
              className="w-full border-accent/40 hover:bg-accent/5 text-foreground font-bold py-6 rounded-xl text-base transition-all"
            >
              {sending ? (
                <><Loader2 className="animate-spin ml-2" size={18} /> در حال ارسال...</>
              ) : (
                <><FileText size={18} className="ml-2" /> ارسال برای اجرای پروژه</>
              )}
            </Button>

            {/* Info box */}
            <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-2xl p-4 text-xs text-muted-foreground space-y-2">
              <p className="flex items-center gap-2 font-bold text-foreground">
                <CheckCircle size={14} className="text-accent" />
                توضیحات
              </p>
              <p>
                با کلیک روی <strong>«خرید همه محصولات»</strong>، همه کالاها به سبد خرید اضافه شده و می‌توانید فرایند خرید را تکمیل کنید.
              </p>
              <p>
                با کلیک روی <strong>«ارسال برای اجرای پروژه»</strong>، لیست خرید شما به تیم اجرایی هومینو ارسال می‌شود تا شما را راهنمایی کنند.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DesignShopping;