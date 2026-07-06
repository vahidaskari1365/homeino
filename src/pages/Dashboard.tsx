import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, ArrowRight, Sparkles, LogOut, Plus, Pencil, Trash2,
  Package, ImageIcon, Save, CheckCircle2, AlertCircle, Send, EyeOff,
  ShoppingCart, MessageSquare, BarChart3, Eye, Phone, MapPin, Clock, Check, User,
  Boxes, Store as StoreIcon, Tag,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatPersianDate } from "@/lib/date";
import { CustomerDashboard } from "@/components/CustomerDashboard";
import { SellerAnalyticsPanel } from "@/components/SellerAnalyticsPanel";
import { ProfileCompletionBar } from "@/components/ProfileCompletionBar";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { StoreHealthPanel } from "@/components/StoreHealthPanel";

interface Category { id: string; name: string; slug: string; }

// Seller/brand form — backed by the `stores` table (the seller entity).
interface SellerForm {
  id: string; // store id ("" until the store is created)
  brand_name: string;
  contact_name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  description: string | null;
  website: string | null;
  contact_published: boolean;
  contact_published_at: string | null;
}
interface Product {
  id: string; name: string; description: string | null;
  price: number | null; stock: number; image_url: string | null;
  is_active: boolean; category_id: string | null;
}

type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
interface OrderItem {
  id: string; product_name: string; unit_price: number; quantity: number;
}
interface Order {
  id: string; recipient_name: string; phone: string; city: string | null;
  address: string; note: string | null; status: OrderStatus;
  total_amount: number; created_at: string; order_items: OrderItem[];
}

type QuoteStatus = "pending" | "answered" | "accepted" | "rejected" | "expired";
interface Quote {
  id: string; product_name: string | null; product_id: string | null;
  quantity: number | null; notes: string | null; status: QuoteStatus;
  proposed_price: number | null; created_at: string;
}

interface DailyView { day: string; views: number; }
interface ProductAnalytics {
  product_id: string; product_name: string;
  views: number; clicks: number; saves: number; ai_recommendations: number;
}
interface StoreOverview {
  product_count: number | null; active_product_count: number | null;
  featured_count: number | null; out_of_stock_count: number | null;
  total_stock: number | null;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "در انتظار",
  confirmed: "تأیید شده",
  shipped: "ارسال شده",
  delivered: "تحویل داده شده",
  cancelled: "لغو شده",
};
const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "bg-gold/15 text-gold border-gold/30",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  shipped: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  delivered: "bg-emerald-brand/15 text-emerald-brand border-emerald-brand/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};
const QUOTE_STATUS: Record<QuoteStatus, { label: string; cls: string }> = {
  pending: { label: "در انتظار پاسخ", cls: "bg-gold/15 text-gold border-gold/30" },
  answered: { label: "پاسخ داده شده", cls: "bg-primary/15 text-primary border-primary/30" },
  accepted: { label: "پذیرفته شده", cls: "bg-emerald-brand/15 text-emerald-brand border-emerald-brand/30" },
  rejected: { label: "رد شده", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  expired: { label: "منقضی", cls: "bg-muted text-muted-foreground border-border" },
};

const profileSchema = z.object({
  brand_name: z.string().trim().min(1, "نام برند الزامی است").max(120),
  contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  website: z.string().trim().max(255).optional().or(z.literal("")),
});

const productSchema = z.object({
  name: z.string().trim().min(1, "نام محصول الزامی است").max(150),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(999999999).optional(),
  stock: z.coerce.number().int().min(0).max(999999),
  category_id: z.string().nullable().optional(),
  is_active: z.boolean(),
});

const emptyForm: SellerForm = {
  id: "", brand_name: "", contact_name: null, phone: null, city: null,
  address: null, description: null, website: null,
  contact_published: false, contact_published_at: null,
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<SellerForm | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"producer" | "customer">("producer");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [dailyViews, setDailyViews] = useState<DailyView[]>([]);
  const [dailySales, setDailySales] = useState<{ day: string; amount: number }[]>([]);
  const [productViews, setProductViews] = useState<Record<string, number>>({});
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>([]);
  const [overview, setOverview] = useState<StoreOverview | null>(null);

  // quote respond
  const [quotePrice, setQuotePrice] = useState<Record<string, string>>({});

  // product dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pPrice, setPPrice] = useState<string>("");
  const [pStock, setPStock] = useState<string>("0");
  const [pCat, setPCat] = useState<string>("none");
  const [pActive, setPActive] = useState(true);
  const [pImageFile, setPImageFile] = useState<File | null>(null);
  const [pImageUrl, setPImageUrl] = useState<string>("");

  // ---- bootstrap ----
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth", { replace: true }); return; }
      if (!mounted) return;
      setUserId(session.user.id);
      await loadAll(session.user.id);
      setLoading(false);
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) navigate("/auth", { replace: true });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async (uid: string) => {
    const [{ data: cats }, { data: store }] = await Promise.all([
      supabase.from("producer_categories").select("id, name, slug").order("name"),
      supabase.from("stores").select("*").eq("owner_id", uid).maybeSingle(),
    ]);
    if (cats) setCategories(cats);

    if (store) {
      setStoreId(store.id);
      setProfile({
        id: store.id,
        brand_name: store.name ?? "",
        contact_name: store.contact_name,
        phone: store.phone,
        city: store.city,
        address: store.address,
        description: store.description,
        website: store.website,
        contact_published: store.contact_published ?? false,
        contact_published_at: store.contact_published_at,
      });
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, description, price, stock, image_url, is_active, category_id")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });
      if (prods) setProducts(prods as Product[]);
      await loadSellerData(store.id, uid);
    } else {
      // No store yet — show an empty seller profile the user can fill to onboard.
      setStoreId(null);
      setProfile({ ...emptyForm });
      setProducts([]);
      setOrders([]);
      setQuotes([]);
      setDailyViews([]);
      setDailySales([]);
      setProductViews({});
      setProductAnalytics([]);
      setOverview(null);
    }
  };

  const loadSellerData = async (sid: string, uid: string) => {
    const [ordersRes, quotesRes, dailyRes, analyticsRes, overviewRes] = await Promise.all([
      supabase.from("orders")
        .select("id, recipient_name, phone, city, address, note, status, total_amount, created_at, order_items(id, product_name, unit_price, quantity)")
        .eq("profile_id", uid)
        .order("created_at", { ascending: false }),
      supabase.from("price_quotes")
        .select("id, product_name, product_id, quantity, notes, status, proposed_price, created_at")
        .eq("profile_id", uid)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_store_daily_views", { p_store_id: sid, p_days: 30 }),
      supabase.rpc("get_store_product_analytics", { p_store_id: sid }),
      supabase.from("seller_store_overview").select("*").eq("store_id", sid).maybeSingle(),
    ]);

    if (ordersRes.data) {
      const ordersData = ordersRes.data as unknown as Order[];
      setOrders(ordersData);
      const salesMap = new Map<string, number>();
      ordersData.forEach((o) => {
        const day = o.created_at.split("T")[0];
        salesMap.set(day, (salesMap.get(day) ?? 0) + (o.total_amount ?? 0));
      });
      setDailySales(
        Array.from(salesMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, amount]) => ({ day, amount })),
      );
    } else {
      setOrders([]);
      setDailySales([]);
    }

    setQuotes((quotesRes.data as Quote[] | null) ?? []);

    if (dailyRes.data) {
      setDailyViews(
        (dailyRes.data as { day: string; views: number }[])
          .map((r) => ({ day: r.day, views: Number(r.views) || 0 }))
          .sort((a, b) => a.day.localeCompare(b.day)),
      );
    } else {
      setDailyViews([]);
    }

    if (analyticsRes.data) {
      const rows = (analyticsRes.data as ProductAnalytics[]).map((r) => ({
        ...r,
        views: Number(r.views) || 0,
        clicks: Number(r.clicks) || 0,
        saves: Number(r.saves) || 0,
        ai_recommendations: Number(r.ai_recommendations) || 0,
      }));
      setProductAnalytics(rows);
      const counts: Record<string, number> = {};
      rows.forEach((r) => { counts[r.product_id] = r.views; });
      setProductViews(counts);
    } else {
      setProductAnalytics([]);
      setProductViews({});
    }

    setOverview((overviewRes.data as StoreOverview | null) ?? null);
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    toast({ title: "وضعیت به‌روز شد" });
  };

  const respondQuote = async (id: string) => {
    const raw = quotePrice[id];
    const price = Number(raw);
    if (!raw || Number.isNaN(price) || price <= 0) {
      toast({ title: "خطا", description: "قیمت معتبر وارد کنید", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("price_quotes")
      .update({ proposed_price: price, status: "answered" })
      .eq("id", id);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    setQuotes((prev) => prev.map((q) => q.id === id ? { ...q, proposed_price: price, status: "answered" } : q));
    setQuotePrice((prev) => ({ ...prev, [id]: "" }));
    toast({ title: "قیمت پیشنهادی ثبت شد" });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // ---- profile save (creates or updates the store) ----
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !userId) return;
    const result = profileSchema.safeParse(profile);
    if (!result.success) {
      toast({ title: "خطا", description: result.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: profile.brand_name,
      description: profile.description || null,
      city: profile.city || null,
      contact_name: profile.contact_name || null,
      phone: profile.phone || null,
      address: profile.address || null,
      website: profile.website || null,
    };

    if (profile.id) {
      const { error } = await supabase.from("stores").update(payload).eq("id", profile.id);
      setSaving(false);
      if (error) {
        toast({ title: "خطا در ذخیره", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "ذخیره شد", description: "اطلاعات فروشگاه به‌روزرسانی شد" });
    } else {
      const { data: created, error } = await supabase
        .from("stores")
        .insert({ owner_id: userId, ...payload })
        .select("*")
        .single();
      if (error || !created) {
        setSaving(false);
        toast({ title: "خطا در ایجاد فروشگاه", description: error?.message, variant: "destructive" });
        return;
      }
      // Mark the user as a seller (allowed by profiles_self_update RLS).
      await supabase.from("profiles").update({ role: "seller" }).eq("id", userId);
      setSaving(false);
      setStoreId(created.id);
      setProfile((prev) => prev ? { ...prev, id: created.id } : prev);
      toast({ title: "فروشگاه ایجاد شد", description: "اکنون می‌توانید محصولات خود را اضافه کنید" });
      await loadSellerData(created.id, userId);
    }
  };

  // ---- contact info completeness & publish ----
  const contactFields = profile
    ? [
        { key: "phone", label: "شماره تماس", value: profile.phone },
        { key: "city", label: "شهر", value: profile.city },
        { key: "address", label: "آدرس", value: profile.address },
        { key: "website", label: "وب‌سایت", value: profile.website },
      ]
    : [];
  const filledCount = contactFields.filter((f) => f.value && f.value.trim().length > 0).length;
  const isContactComplete = filledCount === contactFields.length;

  const togglePublish = async (publish: boolean) => {
    if (!profile) return;
    if (!profile.id) {
      toast({ title: "ابتدا ذخیره کنید", description: "برای انتشار، ابتدا اطلاعات فروشگاه را ذخیره کنید.", variant: "destructive" });
      return;
    }
    if (publish && !isContactComplete) {
      toast({
        title: "اطلاعات ناقص است",
        description: "برای انتشار، تمام فیلدهای تماس را تکمیل و ذخیره کنید.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const publishedAt = publish ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("stores")
      .update({ contact_published: publish, contact_published_at: publishedAt })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    setProfile({ ...profile, contact_published: publish, contact_published_at: publishedAt });
    toast({
      title: publish ? "اطلاعات منتشر شد" : "انتشار لغو شد",
      description: publish ? "اطلاعات تماس شما اکنون در سایت نمایش داده می‌شود" : "اطلاعات تماس از سایت حذف شد",
    });
  };

  const resetProductForm = () => {
    setEditing(null); setPName(""); setPDesc(""); setPPrice("");
    setPStock("0"); setPCat("none"); setPActive(true);
    setPImageFile(null); setPImageUrl("");
  };

  const openNewProduct = () => { resetProductForm(); setDialogOpen(true); };
  const openEditProduct = (p: Product) => {
    setEditing(p);
    setPName(p.name); setPDesc(p.description ?? "");
    setPPrice(p.price?.toString() ?? ""); setPStock(p.stock.toString());
    setPCat(p.category_id ?? "none"); setPActive(p.is_active);
    setPImageUrl(p.image_url ?? ""); setPImageFile(null);
    setDialogOpen(true);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!userId) return null;
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "خطا در آپلود", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!storeId) {
      toast({ title: "ابتدا فروشگاه بسازید", description: "برای افزودن محصول، ابتدا اطلاعات فروشگاه را ذخیره کنید.", variant: "destructive" });
      return;
    }
    const parsed = productSchema.safeParse({
      name: pName, description: pDesc, price: pPrice || undefined,
      stock: pStock, category_id: pCat === "none" ? null : pCat, is_active: pActive,
    });
    if (!parsed.success) {
      toast({ title: "خطا", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    let imageUrl = pImageUrl || null;
    if (pImageFile) {
      const uploaded = await uploadImage(pImageFile);
      if (uploaded) imageUrl = uploaded;
    }

    const payload = {
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price ?? null,
      stock: parsed.data.stock,
      category_id: parsed.data.category_id ?? null,
      is_active: parsed.data.is_active,
      image_url: imageUrl,
      store_id: storeId,
      profile_id: userId,
    };

    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "محصول ویرایش شد" : "محصول اضافه شد" });
    setDialogOpen(false);
    resetProductForm();
    await loadAll(userId);
  };

  const deleteProduct = async (p: Product) => {
    if (!confirm(`حذف محصول «${p.name}»؟`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast({ title: "خطا", description: error.message, variant: "destructive" });
    else { toast({ title: "حذف شد" }); setProducts((prev) => prev.filter((x) => x.id !== p.id)); }
  };

  const updateProfileField = useCallback(<K extends keyof SellerForm>(key: K, val: SellerForm[K]) => {
    setProfile((prev) => prev ? { ...prev, [key]: val } : prev);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background py-10 px-4 relative overflow-hidden">
        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-2">
                <ArrowRight size={16} /> بازگشت به خانه
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">حساب کاربری من</h1>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="gap-2 self-start">
              <LogOut size={16} /> خروج
            </Button>
          </div>
          {userId && <CustomerDashboard userId={userId} />}
        </div>
      </div>
    );
  }

  const pendingQuotes = quotes.filter((q) => q.status === "pending").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const totalViews30d = dailyViews.reduce((s, d) => s + d.views, 0);

  return (
    <div className="min-h-screen bg-background py-10 px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-brand/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-2">
              <ArrowRight size={16} /> بازگشت به خانه
            </Link>
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 mb-2">
              <Sparkles size={14} className="text-gold" />
              <span className="text-gold text-xs font-medium">داشبورد تولیدکننده</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{profile.brand_name || "فروشگاه من"}</h1>
          </div>
          <div className="flex gap-2 self-start">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "producer" ? "customer" : "producer")}
              className="gap-2"
            >
              {viewMode === "producer" ? <User size={16} /> : <Sparkles size={16} />}
              {viewMode === "producer" ? "پنل مشتری" : "پنل فروشنده"}
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/analytics"><BarChart3 size={16} /> آنالیتیکس</Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/subscription"><Sparkles size={16} /> اشتراک</Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/badges"><Package size={16} /> نشان‌ها</Link>
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut size={16} /> خروج
            </Button>
          </div>
        </div>

        {viewMode === "customer" ? (
          userId && <CustomerDashboard userId={userId} />
        ) : (
          <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 md:max-w-3xl mb-6 h-auto">
            <TabsTrigger value="profile" className="text-xs md:text-sm">پروفایل</TabsTrigger>
            <TabsTrigger value="products" className="text-xs md:text-sm">محصولات ({products.length})</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs md:text-sm gap-1">
              <ShoppingCart size={14} />سفارش‌ها ({pendingOrders})
            </TabsTrigger>
            <TabsTrigger value="quotes" className="text-xs md:text-sm gap-1">
              <MessageSquare size={14} />درخواست‌ها ({pendingQuotes})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs md:text-sm gap-1">
              <BarChart3 size={14} />آمار
            </TabsTrigger>
            <TabsTrigger value="health" className="text-xs md:text-sm gap-1">
              سلامت
            </TabsTrigger>
            <TabsTrigger value="trust" className="text-xs md:text-sm gap-1">
              اعتماد
            </TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile">
            <Card className="p-6 md:p-8 shadow-luxury bg-card border-border">
              {!profile.id && (
                <div className="flex items-start gap-3 mb-6 p-4 rounded-xl border border-gold/30 bg-gold/5">
                  <StoreIcon size={20} className="text-gold shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-foreground">هنوز فروشگاهی ندارید</p>
                    <p className="text-muted-foreground">اطلاعات زیر را تکمیل و ذخیره کنید تا فروشگاه شما ساخته شود.</p>
                  </div>
                </div>
              )}
              <form onSubmit={saveProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نام برند <span className="text-destructive">*</span></Label>
                    <Input value={profile.brand_name}
                      onChange={(e) => updateProfileField("brand_name", e.target.value)} maxLength={120} />
                  </div>
                  <div className="space-y-2">
                    <Label>نام مسئول</Label>
                    <Input value={profile.contact_name ?? ""}
                      onChange={(e) => updateProfileField("contact_name", e.target.value)} maxLength={120} />
                  </div>
                  <div className="space-y-2">
                    <Label>شماره تماس</Label>
                    <Input dir="ltr" value={profile.phone ?? ""}
                      onChange={(e) => updateProfileField("phone", e.target.value)} maxLength={30} />
                  </div>
                  <div className="space-y-2">
                    <Label>شهر</Label>
                    <Input value={profile.city ?? ""}
                      onChange={(e) => updateProfileField("city", e.target.value)} maxLength={80} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>آدرس</Label>
                    <Input value={profile.address ?? ""}
                      onChange={(e) => updateProfileField("address", e.target.value)} maxLength={300} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>وب‌سایت</Label>
                    <Input dir="ltr" placeholder="https://" value={profile.website ?? ""}
                      onChange={(e) => updateProfileField("website", e.target.value)} maxLength={255} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>درباره برند</Label>
                    <Textarea rows={4} value={profile.description ?? ""}
                      onChange={(e) => updateProfileField("description", e.target.value)} maxLength={1000} />
                  </div>
                </div>

                {/* Contact info status & publish */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-base">وضعیت اطلاعات تماس</Label>
                    {profile.contact_published ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-brand/15 text-emerald-brand border border-emerald-brand/30">
                        <CheckCircle2 size={14} /> منتشر شده
                      </span>
                    ) : isContactComplete ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gold/15 text-gold border border-gold/30">
                        <CheckCircle2 size={14} /> آماده انتشار
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
                        <AlertCircle size={14} /> ناقص ({filledCount}/{contactFields.length})
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {contactFields.map((f) => {
                      const ok = !!(f.value && f.value.trim());
                      return (
                        <div key={f.key}
                          className={`flex items-center gap-1.5 p-2 rounded-md border ${
                            ok ? "border-emerald-brand/30 bg-emerald-brand/5 text-foreground"
                               : "border-border bg-muted/30 text-muted-foreground"
                          }`}>
                          {ok ? <CheckCircle2 size={12} className="text-emerald-brand" />
                              : <AlertCircle size={12} />}
                          <span>{f.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    اطلاعات تماس فقط بعد از تأیید و انتشار، در صفحه عمومی فروشگاه شما نمایش داده می‌شود.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" disabled={saving}
                    className="gradient-gold text-primary-foreground hover:opacity-90 gap-2">
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    ذخیره تغییرات
                  </Button>
                  {profile.contact_published ? (
                    <Button type="button" variant="outline" disabled={saving} onClick={() => togglePublish(false)} className="gap-2">
                      <EyeOff size={16} /> لغو انتشار
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" disabled={saving || !isContactComplete || !profile.id}
                      onClick={() => togglePublish(true)} className="gap-2 border-gold/40 text-gold hover:bg-gold/10">
                      <Send size={16} /> تأیید و انتشار اطلاعات
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </TabsContent>

          {/* PRODUCTS TAB */}
          <TabsContent value="products">
            <Card className="p-6 md:p-8 shadow-luxury bg-card border-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Package size={20} className="text-gold" /> محصولات شما
                </h2>
                <Button onClick={openNewProduct}
                  className="gradient-gold text-primary-foreground hover:opacity-90 gap-2">
                  <Plus size={18} /> افزودن محصول
                </Button>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                  <Package size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">
                    {storeId ? "هنوز محصولی اضافه نکرده‌اید" : "برای افزودن محصول، ابتدا فروشگاه خود را در تب پروفایل بسازید"}
                  </p>
                  {storeId && (
                    <Button onClick={openNewProduct} variant="outline" className="gap-2">
                      <Plus size={16} /> افزودن اولین محصول
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((p) => (
                    <Card key={p.id} className="overflow-hidden border-border bg-background hover:shadow-luxury transition-shadow">
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon size={36} />
                          </div>
                        )}
                        {!p.is_active && (
                          <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">
                            غیرفعال
                          </span>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="font-bold text-foreground line-clamp-1">{p.name}</h3>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gold font-bold">
                            {p.price ? `${p.price.toLocaleString("fa-IR")} تومان` : "—"}
                          </span>
                          <span className="text-muted-foreground text-xs">موجودی: {p.stock}</span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEditProduct(p)}>
                            <Pencil size={14} /> ویرایش
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteProduct(p)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ORDERS TAB */}
          <TabsContent value="orders">
            <Card className="p-6 md:p-8 shadow-luxury bg-card border-border">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-6">
                <ShoppingCart size={20} className="text-gold" /> سفارش‌ها ({orders.length})
              </h2>
              {orders.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                  <ShoppingCart size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">هنوز سفارشی ثبت نشده است</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <Card key={o.id} className="p-4 bg-background border-border">
                      <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                        <div>
                          <p className="font-bold text-foreground">{o.recipient_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1"><Phone size={12} /> {o.phone}</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> {formatPersianDate(o.created_at)}</span>
                          </p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLOR[o.status]}`}>
                          {STATUS_LABEL[o.status]}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-start gap-1 mb-3">
                        <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                        <span>{o.city ? `${o.city} — ` : ""}{o.address}</span>
                      </div>
                      {o.note && <p className="text-xs text-muted-foreground italic mb-3">یادداشت: {o.note}</p>}
                      <div className="border-t border-border pt-3 space-y-1.5">
                        {(o.order_items ?? []).map((it) => (
                          <div key={it.id} className="flex justify-between text-sm">
                            <span className="text-foreground">{it.product_name} × {it.quantity}</span>
                            <span className="text-muted-foreground">{(it.unit_price * it.quantity).toLocaleString("fa-IR")} ت</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                        <span className="text-sm font-bold">جمع کل:</span>
                        <span className="text-gold font-bold">{o.total_amount.toLocaleString("fa-IR")} تومان</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-border items-center">
                        <Label className="text-xs text-muted-foreground">تغییر وضعیت:</Label>
                        <Select value={o.status} onValueChange={(v) => updateOrderStatus(o.id, v as OrderStatus)}>
                          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* QUOTES / REQUESTS TAB */}
          <TabsContent value="quotes">
            <Card className="p-6 md:p-8 shadow-luxury bg-card border-border">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-6">
                <MessageSquare size={20} className="text-gold" /> درخواست‌های قیمت مشتری ({quotes.length})
              </h2>
              {quotes.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                  <MessageSquare size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">درخواستی از مشتری‌ها دریافت نکرده‌اید</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map((q) => (
                    <Card key={q.id} className={`p-4 bg-background border ${q.status === "pending" ? "border-gold/50 bg-gold/5" : "border-border"}`}>
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-foreground flex items-center gap-1">
                              <Tag size={14} className="text-gold" /> {q.product_name || "درخواست قیمت"}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${QUOTE_STATUS[q.status].cls}`}>
                              {QUOTE_STATUS[q.status].label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-3 mb-2">
                            <span className="flex items-center gap-1"><Clock size={12} /> {formatPersianDate(q.created_at)}</span>
                            {q.quantity != null && <span>تعداد: {q.quantity.toLocaleString("fa-IR")}</span>}
                          </p>
                          {q.notes && <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{q.notes}</p>}
                          {q.proposed_price != null && (
                            <p className="text-sm font-bold text-emerald-brand">
                              قیمت پیشنهادی شما: {q.proposed_price.toLocaleString("fa-IR")} تومان
                            </p>
                          )}
                        </div>
                      </div>
                      {q.status === "pending" && (
                        <div className="flex flex-wrap items-end gap-2 pt-3 mt-3 border-t border-border">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">قیمت پیشنهادی (تومان)</Label>
                            <Input
                              type="number" min="0" dir="ltr" className="w-44"
                              value={quotePrice[q.id] ?? ""}
                              onChange={(e) => setQuotePrice((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            />
                          </div>
                          <Button size="sm" onClick={() => respondQuote(q.id)} className="gap-1">
                            <Send size={14} /> ثبت قیمت
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics">
            {userId && <SellerAnalyticsPanel ownerId={userId} />}

            {/* Store health / overview */}
            {overview && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">کل محصولات</span>
                    <Package size={15} className="text-gold" />
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">{(overview.product_count ?? 0).toLocaleString("fa-IR")}</p>
                </Card>
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">محصولات فعال</span>
                    <CheckCircle2 size={15} className="text-emerald-brand" />
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">{(overview.active_product_count ?? 0).toLocaleString("fa-IR")}</p>
                </Card>
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">محصولات ویژه</span>
                    <Sparkles size={15} className="text-gold" />
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">{(overview.featured_count ?? 0).toLocaleString("fa-IR")}</p>
                </Card>
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">ناموجود</span>
                    <Boxes size={15} className="text-destructive" />
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">{(overview.out_of_stock_count ?? 0).toLocaleString("fa-IR")}</p>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-5 bg-card border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">کل بازدیدها (۳۰ روز)</span>
                  <Eye size={16} className="text-gold" />
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {totalViews30d.toLocaleString("fa-IR")}
                </p>
              </Card>
              <Card className="p-5 bg-card border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">کل فروش</span>
                  <ShoppingCart size={16} className="text-gold" />
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {orders.reduce((s, o) => s + o.total_amount, 0).toLocaleString("fa-IR")} <span className="text-xs">تومان</span>
                </p>
              </Card>
              <Card className="p-5 bg-card border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">درخواست‌های در انتظار</span>
                  <MessageSquare size={16} className="text-gold" />
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {pendingQuotes.toLocaleString("fa-IR")}
                </p>
              </Card>
            </div>

            <Card className="p-6 shadow-luxury bg-card border-border mb-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-gold" /> فروش روزانه (۳۰ روز اخیر)
              </h3>
              {dailySales.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">هنوز فروشی ثبت نشده است</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11}
                        tickFormatter={(v) => v.slice(5)} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false}
                        tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip
                        formatter={(v: number) => [`${v.toLocaleString("fa-IR")} تومان`, "فروش"]}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Line type="monotone" dataKey="amount" stroke="hsl(var(--gold))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="p-6 shadow-luxury bg-card border-border mb-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-gold" /> بازدید روزانه محصولات (۳۰ روز اخیر)
              </h3>
              {dailyViews.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">هنوز بازدیدی ثبت نشده است</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyViews} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11}
                        tickFormatter={(v) => v.slice(5)} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Line type="monotone" dataKey="views" stroke="hsl(var(--gold))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="p-6 shadow-luxury bg-card border-border">
              <h3 className="font-bold text-foreground mb-4">بازدید تک‌تک محصولات</h3>
              {products.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">محصولی ندارید</p>
              ) : (
                <div className="space-y-2">
                  {[...products]
                    .map((p) => ({ p, v: productViews[p.id] ?? 0 }))
                    .sort((a, b) => b.v - a.v)
                    .map(({ p, v }) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                        <span className="text-foreground text-sm line-clamp-1">{p.name}</span>
                        <span className="text-sm font-bold text-gold flex items-center gap-1">
                          <Eye size={14} /> {v.toLocaleString("fa-IR")}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* HEALTH TAB */}
          <TabsContent value="health">
            <Card className="p-6 shadow-luxury bg-card border-border">
              {storeId && <StoreHealthPanel storeId={storeId} />}
            </Card>
          </TabsContent>

          {/* TRUST SCORE TAB */}
          <TabsContent value="trust">
            {storeId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TrustScoreBadge storeId={storeId} showRecalculate />
                <Card className="p-6 bg-card border-border">
                  <ProfileCompletionBar />
                </Card>
              </div>
            )}
          </TabsContent>
          </Tabs>
        )}
        </div>

        {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetProductForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش محصول" : "افزودن محصول جدید"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveProduct} className="space-y-4">
            <div className="space-y-2">
              <Label>نام محصول <span className="text-destructive">*</span></Label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} maxLength={150} required />
            </div>
            <div className="space-y-2">
              <Label>توضیحات</Label>
              <Textarea rows={3} value={pDesc} onChange={(e) => setPDesc(e.target.value)} maxLength={2000} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>قیمت (تومان)</Label>
                <Input type="number" min="0" dir="ltr" value={pPrice} onChange={(e) => setPPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>موجودی</Label>
                <Input type="number" min="0" dir="ltr" value={pStock} onChange={(e) => setPStock(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>دسته‌بندی</Label>
              <Select value={pCat} onValueChange={setPCat}>
                <SelectTrigger><SelectValue placeholder="انتخاب دسته" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون دسته</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تصویر محصول</Label>
              {pImageUrl && !pImageFile && (
                <img src={pImageUrl} alt="" className="w-24 h-24 object-cover rounded-lg border border-border" />
              )}
              <Input type="file" accept="image/*"
                onChange={(e) => setPImageFile(e.target.files?.[0] ?? null)} />
              {pImageFile && <p className="text-xs text-muted-foreground">{pImageFile.name}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={pActive} onCheckedChange={(v) => setPActive(v === true)} />
              <Label htmlFor="active" className="cursor-pointer">محصول فعال (در فروشگاه نمایش داده شود)</Label>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={saving} className="gradient-gold text-primary-foreground hover:opacity-90 gap-2">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                ذخیره
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
