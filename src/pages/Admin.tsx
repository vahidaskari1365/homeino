import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Store,
  Users,
  Package,
  Tags,
  Flag,
  CreditCard,
  Megaphone,
  ShoppingBag,
  ShieldCheck,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  ClipboardList,
  Search,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { auditService, type AuditLog } from "@/services/auditService";
import { getActorLabel, getActionLabel } from "@/hooks/useAuditLogs";
import { formatPersianDate } from "@/lib/date";
import Navbar from "@/components/Navbar";

type ShopProfile = {
  id: string;
  brand_name: string;
  city: string | null;
  approval_status: string;
  is_visible: boolean;
  is_blocked: boolean;
  contact_name: string | null;
  phone: string | null;
  user_id: string;
  created_at: string;
};

type SecondHandListing = {
  id: string;
  title: string;
  price: number | null;
  city: string | null;
  approval_status: string;
  created_at: string;
};

type AdminProduct = {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  is_active: boolean;
  stores: { name: string } | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Report = {
  id: string;
  target_type: string;
  reason: string;
  description: string | null;
  status: string;
};

type Payment = {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

type Advertisement = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  placement: string;
  is_active: boolean;
  view_count: number;
  click_count: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "در انتظار", variant: "secondary" },
    approved: { label: "تایید شده", variant: "default" },
    rejected: { label: "رد شده", variant: "destructive" },
    reviewing: { label: "در حال بررسی", variant: "secondary" },
    resolved: { label: "حل شده", variant: "default" },
    dismissed: { label: "رد شده", variant: "outline" },
    paid: { label: "پرداخت شده", variant: "default" },
    failed: { label: "ناموفق", variant: "destructive" },
    refunded: { label: "بازگشت", variant: "outline" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, isModerator, loading } = useAdminRole();

  useEffect(() => {
    if (!loading && !isModerator) {
      navigate("/");
    }
  }, [loading, isModerator, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isModerator) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-display font-bold">پنل مدیریت</h1>
            <p className="text-muted-foreground text-sm">مدیریت کامل سایت خانه‌زیبا</p>
          </div>
        </div>

        <Tabs defaultValue="shops" className="w-full" dir="rtl">
          <TabsList className="grid grid-cols-5 lg:grid-cols-9 mb-6 h-auto">
            <TabsTrigger value="shops" className="flex flex-col gap-1 py-2">
              <Store className="h-4 w-4" /> <span className="text-xs">فروشگاه‌ها</span>
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex flex-col gap-1 py-2">
              <ShoppingBag className="h-4 w-4" /> <span className="text-xs">دست دوم</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex flex-col gap-1 py-2">
              <Users className="h-4 w-4" /> <span className="text-xs">کاربران</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex flex-col gap-1 py-2">
              <Package className="h-4 w-4" /> <span className="text-xs">محصولات</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex flex-col gap-1 py-2">
              <Tags className="h-4 w-4" /> <span className="text-xs">دسته‌ها</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex flex-col gap-1 py-2">
              <Flag className="h-4 w-4" /> <span className="text-xs">تخلفات</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex flex-col gap-1 py-2">
              <CreditCard className="h-4 w-4" /> <span className="text-xs">پرداخت‌ها</span>
            </TabsTrigger>
            <TabsTrigger value="ads" className="flex flex-col gap-1 py-2">
              <Megaphone className="h-4 w-4" /> <span className="text-xs">تبلیغات</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex flex-col gap-1 py-2">
              <BarChart className="h-4 w-4" /> <span className="text-xs">آمار کل</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex flex-col gap-1 py-2">
              <ClipboardList className="h-4 w-4" /> <span className="text-xs">رویدادها</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shops"><ShopsTab /></TabsContent>
          <TabsContent value="listings"><ListingsTab /></TabsContent>
          <TabsContent value="users"><UsersTab isAdmin={isAdmin} /></TabsContent>
          <TabsContent value="products"><ProductsTab /></TabsContent>
          <TabsContent value="categories"><CategoriesTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
          <TabsContent value="payments"><PaymentsTab /></TabsContent>
          <TabsContent value="ads"><AdsTab /></TabsContent>
          <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
          <TabsContent value="audit"><AuditTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ============ ANALYTICS TAB ============
const AnalyticsTab = () => {
  const [data, setData] = useState<{
    stats: { label: string; value: number | string; icon: React.ElementType; color: string }[];
    dailyViews: { day: string; views: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [
        { count: userCount },
        { count: shopCount },
        { count: productCount },
        { count: orderCount },
        { data: payments },
        { data: views }
      ] = await Promise.all([
        supabase.from("user_roles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("payments").select("amount, status, created_at"),
        supabase.from("product_daily_views").select("views, day").order("day", { ascending: true })
      ]);

      const totalRevenue = (payments || [])
        .filter(p => p.status === "paid")
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // Group views by day
      const dailyViews = (views || []).reduce((acc: { day: string; views: number }[], curr: { day: string; views: number }) => {
        const existing = acc.find(a => a.day === curr.day);
        if (existing) {
          existing.views += curr.views;
        } else {
          acc.push({ day: curr.day, views: curr.views });
        }
        return acc;
      }, []);

      setData({
        stats: [
          { label: "کل کاربران", value: userCount || 0, icon: Users, color: "text-blue-600" },
          { label: "فروشگاه‌ها", value: shopCount || 0, icon: Store, color: "text-emerald-600" },
          { label: "محصولات", value: productCount || 0, icon: Package, color: "text-orange-600" },
          { label: "سفارش‌ها", value: orderCount || 0, icon: ShoppingBag, color: "text-purple-600" },
          { label: "درآمد کل", value: `${(totalRevenue / 1000000).toFixed(1)}M`, icon: CreditCard, color: "text-gold" },
        ],
        dailyViews: dailyViews.slice(-14), // Last 14 days
      });
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading || !data) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {data.stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <h3 className="text-2xl font-bold">{s.value.toLocaleString("fa-IR")}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">بازدید کل سایت (۱۴ روز اخیر)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyViews}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tickFormatter={(v) => v.split('-').slice(1).join('/')}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  contentStyle={{ direction: 'rtl', borderRadius: '8px' }}
                  labelFormatter={(v) => `تاریخ: ${v}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  name="بازدید"
                  stroke="hsl(var(--gold))" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "hsl(var(--gold))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ SHOPS TAB ============
const ShopsTab = () => {
  const [shops, setShops] = useState<ShopProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setShops((data as ShopProfile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateShop = async (id: string, updates: Partial<ShopProfile>) => {
    const { error } = await supabase.from("profiles").update(updates).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("به‌روزرسانی شد"); load(); }
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>مدیریت فروشگاه‌ها ({shops.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام</TableHead>
              <TableHead>شهر</TableHead>
              <TableHead>وضعیت تایید</TableHead>
              <TableHead>نمایش</TableHead>
              <TableHead>عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shops.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.brand_name}</TableCell>
                <TableCell>{s.city ?? "-"}</TableCell>
                <TableCell>{statusBadge(s.approval_status)}</TableCell>
                <TableCell>
                  <Switch
                    checked={s.is_visible}
                    onCheckedChange={(v) => updateShop(s.id, { is_visible: v })}
                  />
                </TableCell>
                <TableCell className="flex gap-2">
                  {s.approval_status !== "approved" && (
                    <Button size="sm" variant="default" onClick={() => updateShop(s.id, { approval_status: "approved" })}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                  {s.approval_status !== "rejected" && (
                    <Button size="sm" variant="destructive" onClick={() => updateShop(s.id, { approval_status: "rejected" })}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ============ LISTINGS TAB ============
const ListingsTab = () => {
  const [items, setItems] = useState<SecondHandListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("second_hand_listings")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as SecondHandListing[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, updates: Partial<SecondHandListing>) => {
    const { error } = await supabase.from("second_hand_listings").update(updates).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("به‌روزرسانی شد"); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف شود؟")) return;
    const { error } = await supabase.from("second_hand_listings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("حذف شد"); load(); }
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>آگهی‌های دست دوم ({items.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">هنوز آگهی ثبت نشده است</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>قیمت</TableHead>
                <TableHead>شهر</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.title}</TableCell>
                  <TableCell>{it.price ? `${Number(it.price).toLocaleString()} ت` : "-"}</TableCell>
                  <TableCell>{it.city ?? "-"}</TableCell>
                  <TableCell>{statusBadge(it.approval_status)}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" onClick={() => update(it.id, { approval_status: "approved" })}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => update(it.id, { approval_status: "rejected" })}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(it.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ============ USERS TAB ============
const UsersTab = ({ isAdmin }: { isAdmin: boolean }) => {
  const [profiles, setProfiles] = useState<ShopProfile[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles((ps as ShopProfile[]) ?? []);
    const grouped: Record<string, string[]> = {};
    (rs ?? []).forEach((r: { user_id: string; role: string }) => {
      grouped[r.user_id] = [...(grouped[r.user_id] ?? []), r.role];
    });
    setRoles(grouped);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleBlock = async (id: string, blocked: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: blocked }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(blocked ? "مسدود شد" : "رفع مسدود شد"); load(); }
  };

  const toggleRole = async (userId: string, role: "admin" | "moderator") => {
    const has = (roles[userId] ?? []).includes(role);
    if (has) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      toast.success("نقش حذف شد");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role });
      toast.success("نقش اضافه شد");
    }
    load();
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>کاربران ({profiles.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام برند</TableHead>
              <TableHead>تماس</TableHead>
              <TableHead>نقش‌ها</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.brand_name}</TableCell>
                <TableCell>{p.contact_name ?? "-"}<br /><span className="text-xs text-muted-foreground">{p.phone}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(roles[p.user_id] ?? ["user"]).map((r) => (
                      <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {p.is_blocked ? <Badge variant="destructive">مسدود</Badge> : <Badge variant="outline">فعال</Badge>}
                </TableCell>
                <TableCell className="flex gap-2 flex-wrap">
                  <Button size="sm" variant={p.is_blocked ? "default" : "destructive"} onClick={() => toggleBlock(p.id, !p.is_blocked)}>
                    {p.is_blocked ? "رفع مسدود" : "مسدود"}
                  </Button>
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => toggleRole(p.user_id, "moderator")}>
                        {(roles[p.user_id] ?? []).includes("moderator") ? "حذف ناظر" : "ناظر"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleRole(p.user_id, "admin")}>
                        {(roles[p.user_id] ?? []).includes("admin") ? "حذف ادمین" : "ادمین"}
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ============ PRODUCTS TAB ============
const ProductsTab = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*, stores(name)")
      .order("created_at", { ascending: false });
    setProducts((data as AdminProduct[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("products").update({ is_active: active }).eq("id", id);
    toast.success("به‌روزرسانی شد");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف شود؟")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("حذف شد");
    load();
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>محصولات ({products.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام</TableHead>
              <TableHead>فروشگاه</TableHead>
              <TableHead>قیمت</TableHead>
              <TableHead>موجودی</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.stores?.name ?? "-"}</TableCell>
                <TableCell>{p.price ? `${Number(p.price).toLocaleString()} ت` : "-"}</TableCell>
                <TableCell>{p.stock}</TableCell>
                <TableCell>
                  <Switch checked={p.is_active} onCheckedChange={(v) => toggleActive(p.id, v)} />
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ============ CATEGORIES TAB ============
const CategoriesTab = () => {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("producer_categories").select("*").order("name");
    setCats((data as Category[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name || !slug) return toast.error("نام و slug الزامی است");
    const { error } = await supabase.from("producer_categories").insert({ name, slug });
    if (error) toast.error(error.message);
    else { toast.success("اضافه شد"); setName(""); setSlug(""); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف شود؟")) return;
    const { error } = await supabase.from("producer_categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("حذف شد"); load(); }
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>دسته‌بندی‌ها ({cats.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1"><Label>نام</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="flex-1"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="furniture" /></div>
          <Button onClick={add}><Plus className="h-4 w-4 ml-1" /> افزودن</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cats.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell><code className="text-xs">{c.slug}</code></TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ============ REPORTS TAB ============
const ReportsTab = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    setReports((data as Report[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("reports").update({ status }).eq("id", id);
    toast.success("به‌روزرسانی شد");
    load();
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>گزارش تخلفات ({reports.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">گزارشی ثبت نشده است</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نوع</TableHead>
                <TableHead>دلیل</TableHead>
                <TableHead>توضیح</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline">{r.target_type}</Badge></TableCell>
                  <TableCell className="font-medium">{r.reason}</TableCell>
                  <TableCell className="max-w-xs truncate">{r.description ?? "-"}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">در انتظار</SelectItem>
                        <SelectItem value="reviewing">در حال بررسی</SelectItem>
                        <SelectItem value="resolved">حل شده</SelectItem>
                        <SelectItem value="dismissed">رد شده</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ============ PAYMENTS TAB ============
const PaymentsTab = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });
    setPayments((data as Payment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const updates: Partial<Payment> = { status };
    if (status === "paid") updates.paid_at = new Date().toISOString();
    await supabase.from("payments").update(updates).eq("id", id);
    toast.success("به‌روزرسانی شد");
    load();
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>پرداخت‌ها ({payments.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">پرداختی ثبت نشده است</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>سفارش</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>روش</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell><code className="text-xs">{p.order_id?.slice(0, 8) ?? "-"}</code></TableCell>
                  <TableCell>{Number(p.amount ?? 0).toLocaleString()} ت</TableCell>
                  <TableCell><Badge variant="outline">{p.method}</Badge></TableCell>
                  <TableCell>{statusBadge(p.status)}</TableCell>
                  <TableCell>
                    <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">در انتظار</SelectItem>
                        <SelectItem value="paid">پرداخت شده</SelectItem>
                        <SelectItem value="failed">ناموفق</SelectItem>
                        <SelectItem value="refunded">بازگشت</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ============ ADS TAB ============
const AdsTab = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Advertisement | null>(null);
  const [form, setForm] = useState<Partial<Advertisement>>({
    title: "", description: "", image_url: "", link_url: "",
    placement: "home_banner", is_active: true, start_date: "", end_date: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("advertisements").select("*").order("created_at", { ascending: false });
    setAds((data as Advertisement[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", description: "", image_url: "", link_url: "", placement: "home_banner", is_active: true, start_date: "", end_date: "" });
    setOpen(true);
  };

  const openEdit = (ad: Advertisement) => {
    setEditing(ad);
    setForm({
      title: ad.title, description: ad.description ?? "", image_url: ad.image_url ?? "",
      link_url: ad.link_url ?? "", placement: ad.placement, is_active: ad.is_active,
      start_date: ad.start_date ? ad.start_date.slice(0, 16) : "",
      end_date: ad.end_date ? ad.end_date.slice(0, 16) : "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title) return toast.error("عنوان الزامی است");
    const payload = {
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    const { error } = editing
      ? await supabase.from("advertisements").update(payload).eq("id", editing.id)
      : await supabase.from("advertisements").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "ویرایش شد" : "اضافه شد"); setOpen(false); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف شود؟")) return;
    await supabase.from("advertisements").delete().eq("id", id);
    toast.success("حذف شد");
    load();
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>تبلیغات ({ads.length})</CardTitle>
        <Button onClick={openNew}><Plus className="h-4 w-4 ml-1" /> تبلیغ جدید</Button>
      </CardHeader>
      <CardContent>
        {ads.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">تبلیغی ثبت نشده است</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>محل نمایش</TableHead>
                <TableHead>بازدید/کلیک</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell><Badge variant="outline">{a.placement}</Badge></TableCell>
                  <TableCell>{a.view_count} / {a.click_count}</TableCell>
                  <TableCell>
                    {a.is_active ? <Badge>فعال</Badge> : <Badge variant="outline">غیرفعال</Badge>}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش تبلیغ" : "تبلیغ جدید"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>عنوان</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>توضیح</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>لینک تصویر</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
            <div><Label>لینک مقصد</Label><Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></div>
            <div>
              <Label>محل نمایش</Label>
              <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="home_banner">بنر صفحه اصلی</SelectItem>
                  <SelectItem value="home_sidebar">سایدبار صفحه اصلی</SelectItem>
                  <SelectItem value="shops_top">بالای صفحه فروشگاه‌ها</SelectItem>
                  <SelectItem value="product_detail">جزئیات محصول</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>تاریخ شروع</Label><Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>تاریخ پایان</Label><Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>فعال</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
            <Button onClick={save}>ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// ============ AUDIT LOG TAB ============
const AuditTab = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const result = await auditService.search({
      actor_id: actorFilter || undefined,
      action: actionFilter || undefined,
      target_type: targetFilter || undefined,
      actor_type: (typeFilter as any) || undefined,
      limit: 100,
    });
    setLogs(result.logs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const doSearch = () => load();

  const ACTOR_COLORS: Record<string, string> = {
    user: "bg-blue-100 text-blue-800",
    seller: "bg-emerald-100 text-emerald-800",
    admin: "bg-red-100 text-red-800",
    system: "bg-purple-100 text-purple-800",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>رویدادهای سیستم (Audit Log)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Input placeholder="شناسه بازیگر" value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} />
          <Input placeholder="نوع هدف (مثال: product)" value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)} />
          <Input placeholder="عملیات (مثال: product_created)" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="نوع بازیگر" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="user">کاربر</SelectItem>
              <SelectItem value="seller">فروشنده</SelectItem>
              <SelectItem value="admin">مدیر</SelectItem>
              <SelectItem value="system">سیستم</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={doSearch} className="gap-1"><Search size={14} /> جستجو</Button>
        </div>

        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">رویدادی ثبت نشده است</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>زمان</TableHead>
                  <TableHead>بازیگر</TableHead>
                  <TableHead>هدف</TableHead>
                  <TableHead>عملیات</TableHead>
                  <TableHead>جزئیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatPersianDate(l.created_at)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${ACTOR_COLORS[l.actor_type] || "bg-gray-100 text-gray-800"}`}>
                        {getActorLabel(l.actor_type)}
                        <span className="text-[10px] opacity-70">({l.actor_id?.slice(0, 8)}...)</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{l.target_type}{l.target_id ? ` (${l.target_id.slice(0, 8)}...)` : ""}</TableCell>
                    <TableCell className="text-xs font-medium">{getActionLabel(l.action)}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={JSON.stringify(l.new_values)}>
                      {Object.keys(l.new_values || {}).length > 0 ? `${Object.keys(l.new_values).length} فیلد` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Admin;
