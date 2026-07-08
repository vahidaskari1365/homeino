import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  ShoppingBag, Heart, User, Package, Clock, MapPin, ChevronRight, Loader2,
  Settings, Bell, Check, CheckCheck, Trash2, Sparkles, LayoutGrid, Megaphone,
  Crown, Coins, Plus, Pencil, Pause, Play, Home as HomeIcon,
  LogOut, ImageIcon,
} from "lucide-react";
import { formatPersianDate } from "@/lib/date";
import { useWishlist } from "@/hooks/useWishlist";
import { useNotifications, type NotificationType } from "@/hooks/useNotifications";
import { useTokens } from "@/hooks/useTokens";
import { useAddresses, type AddressInput } from "@/hooks/useAddresses";
import { AvatarUploader } from "@/components/AvatarUploader";
import ViewInMyRoomButton from "@/components/ViewInMyRoomButton";
import { useMyAds, useAdCategories, type AdInput } from "@/hooks/useMyAds";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

// ============================================================
// Homeino — Customer Dashboard
// ============================================================
// The primary account hub for regular customers. Rendered by
// src/pages/Dashboard.tsx for any signed-in user who does not own a store.
//
// Sections (per product spec): Home, My Designs, My Projects, Favorites,
// My Ads, Premium, Notifications, Profile, Settings.
//
// STRICT SCOPE: read-only display of existing AI designs/rooms — this
// component never calls Gemini, never touches ai_logs/placements/overlay
// rendering, and implements NO checkout/payment flow. "Increase Balance"
// and "Premium" only link to a payment-gateway PLACEHOLDER (/billing).
// ============================================================

type Profile = Tables<"profiles">;
type RoomRow = Tables<"rooms">;
type DesignRow = Tables<"designs"> & { rooms: Pick<RoomRow, "id" | "image_url" | "budget" | "user_id"> | null };
type SubscriptionPlan = Tables<"subscription_plans">;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "در انتظار", color: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmed: { label: "تایید شده", color: "bg-blue-100 text-blue-700 border-blue-200" },
  shipped: { label: "ارسال شده", color: "bg-purple-100 text-purple-700 border-purple-200" },
  delivered: { label: "تحویل شده", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled: { label: "لغو شده", color: "bg-rose-100 text-rose-700 border-rose-200" },
};

const typeEmoji: Record<NotificationType, string> = {
  order_new: "🛒", order_status: "📦", review_new: "⭐", quote_new: "💬",
  consultation_new: "🎨", consultation_message: "✉️", site_visit_new: "📅",
  inquiry_new: "📨", system: "🔔",
};

const PROPERTY_TYPES = [
  { value: "apartment", label: "آپارتمان" },
  { value: "villa", label: "ویلا" },
  { value: "office", label: "دفتر کار" },
  { value: "commercial", label: "تجاری" },
];

const PREFERRED_STYLES = [
  "مدرن", "کلاسیک", "مینیمال", "صنعتی", "اسکاندیناوی", "لوکس", "بوهمی", "ژاپنی",
];

interface Order {
  id: string; created_at: string; status: string; total_amount: number;
  recipient_name: string; address: string;
  order_items: { id: string; product_name: string; quantity: number; unit_price: number }[];
}

const fmtToman = (n: number | null | undefined) => `${(n ?? 0).toLocaleString("en-US")} تومان`;

export const CustomerDashboard = ({ userId }: { userId: string }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("home");

  const { items: wishlistItems } = useWishlist();
  const { items: notifications, unreadCount, markRead, markAllRead, remove } = useNotifications();
  const tokens = useTokens();
  const addresses = useAddresses();
  const ads = useMyAds();
  const { categories: adCategories } = useAdCategories();

  const loadAll = useCallback(async () => {
    const [ordersRes, roomsRes, designsRes, profileRes, plansRes] = await Promise.all([
      supabase
        .from("orders")
        .select(`id, created_at, status, total_amount, recipient_name, address, order_items (id, product_name, quantity, unit_price)`)
        .eq("customer_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("rooms").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase
        .from("designs")
        .select("*, rooms!inner(id, image_url, budget, user_id)")
        .eq("rooms.user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
    ]);

    if (ordersRes.data) setOrders(ordersRes.data as unknown as Order[]);
    if (roomsRes.data) setRooms(roomsRes.data);
    if (designsRes.data) setDesigns(designsRes.data as unknown as DesignRow[]);
    if (profileRes.data) setProfile(profileRes.data);
    if (plansRes.data) setPlans(plansRes.data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
    : profile?.full_name || "کاربر هومینو";
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header: avatar, welcome, remaining free designs, token balance ── */}
      <Card className="bg-gradient-to-l from-gold/10 via-transparent to-transparent border-gold/20">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-gold/30">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-gold text-primary-foreground text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">خوش آمدید،</p>
              <h2 className="text-lg font-bold">{displayName}</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-brand/10 border border-emerald-brand/20 rounded-xl px-3 py-2">
              <Sparkles size={16} className="text-emerald-brand shrink-0" />
              <div className="text-xs">
                <p className="text-muted-foreground">طراحی رایگان باقیمانده</p>
                <p className="font-bold text-emerald-brand">{tokens.freeDesignsRemaining.toLocaleString("en-US")}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-xl px-3 py-2">
              <Coins size={16} className="text-gold shrink-0" />
              <div className="text-xs">
                <p className="text-muted-foreground">موجودی توکن</p>
                <p className="font-bold text-gold">🪙 {tokens.tokenBalance.toLocaleString("en-US")}</p>
              </div>
              <Link to="/billing">
                <Button size="sm" variant="outline" className="h-7 text-[11px] border-gold/40 text-gold hover:bg-gold/10">
                  + افزایش موجودی
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="w-full" dir="rtl">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max sm:w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-6 gap-1">
            <TabsTrigger value="home" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-4 shrink-0">
              <HomeIcon size={16} className="ml-2" /> داشبورد
            </TabsTrigger>
            <TabsTrigger value="designs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-4 shrink-0">
              <Sparkles size={16} className="ml-2" /> طراحی‌های من
            </TabsTrigger>
            <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-4 shrink-0">
              <LayoutGrid size={16} className="ml-2" /> پروژه‌های من
            </TabsTrigger>
            <TabsTrigger value="favorites" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-4 shrink-0">
              <Heart size={16} className="ml-2" /> علاقه‌مندی‌ها
            </TabsTrigger>
            <TabsTrigger value="ads" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-4 shrink-0">
              <Megaphone size={16} className="ml-2" /> آگهی‌های من
            </TabsTrigger>
            <TabsTrigger value="premium" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-4 shrink-0">
              <Crown size={16} className="ml-2" /> پرمیوم
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-4 shrink-0">
              <Bell size={16} className="ml-2" /> اعلان‌ها
              {unreadCount > 0 && <Badge variant="destructive" className="mr-2 px-1.5 py-0.5 text-[10px]">{unreadCount.toLocaleString("en-US")}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-4 shrink-0">
              <User size={16} className="ml-2" /> پروفایل
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-4 shrink-0">
              <Settings size={16} className="ml-2" /> تنظیمات
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── HOME ── */}
        <TabsContent value="home" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard icon={<Sparkles size={20} />} label="کل طراحی‌های هومینو استودیو" value={designs.length} color="emerald-brand" />
            <SummaryCard icon={<Coins size={20} />} label="طراحی رایگان باقیمانده" value={tokens.freeDesignsRemaining} color="gold" />
            <SummaryCard icon={<Coins size={20} />} label="موجودی توکن" value={tokens.tokenBalance} color="gold" />
            <SummaryCard icon={<Megaphone size={20} />} label="آگهی‌های فعال" value={ads.items.filter((a) => a.status === "active").length} color="blue-500" />
            <SummaryCard icon={<Heart size={20} />} label="علاقه‌مندی‌ها" value={wishlistItems.length} color="rose-500" />
            <SummaryCard icon={<Bell size={20} />} label="اعلان‌های خوانده‌نشده" value={unreadCount} color="purple-500" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/ai-design" className="flex-1">
              <Button className="w-full gradient-gold text-primary-foreground gap-2 h-12">
                <Sparkles size={18} /> شروع طراحی هوشمند جدید
              </Button>
            </Link>
            <Button variant="outline" className="flex-1 h-12 gap-2" onClick={() => setTab("ads")}>
              <Plus size={18} /> ثبت آگهی جدید
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">سفارش‌های اخیر</CardTitle></CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">هنوز هیچ سفارشی ثبت نکرده‌اید.</p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <span>سفارش #{order.id.slice(0, 8)}</span>
                      <Badge variant="outline" className={STATUS_MAP[order.status]?.color}>{STATUS_MAP[order.status]?.label || order.status}</Badge>
                      <span className="font-bold text-gold">{fmtToman(order.total_amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MY DESIGNS ── */}
        <TabsContent value="designs">
          {designs.length === 0 ? (
            <EmptyState icon={<Sparkles size={48} />} text="هنوز هیچ طراحی هوشمندی نساخته‌اید." linkTo="/ai-design" linkLabel="شروع اولین طراحی" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {designs.map((d) => (
                <Card key={d.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {d.rooms?.image_url ? (
                      <img src={d.rooms.image_url} alt={d.style ?? "طراحی"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon size={24} /></div>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{d.style || "سبک آزاد"}</span>
                      <span className="text-xs text-muted-foreground">{formatPersianDate(d.created_at)}</span>
                    </div>
                    <p className="text-gold font-bold">{fmtToman(d.total_price)}</p>
                    {d.consultation && <p className="text-xs text-muted-foreground line-clamp-2">{d.consultation}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── MY PROJECTS (uploaded rooms, grouped) ── */}
        <TabsContent value="projects">
          {rooms.length === 0 ? (
            <EmptyState icon={<LayoutGrid size={48} />} text="هنوز هیچ پروژه‌ای (تصویر فضا) آپلود نکرده‌اید." linkTo="/ai-design" linkLabel="آپلود اولین فضا" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((r) => {
                const count = designs.filter((d) => d.room_id === r.id).length;
                return (
                  <Card key={r.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted">
                      <img src={r.image_url} alt="پروژه" className="w-full h-full object-cover" />
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{formatPersianDate(r.created_at)}</span>
                        <Badge variant="outline">{count.toLocaleString("en-US")} طراحی</Badge>
                      </div>
                      {r.budget && <p className="text-xs text-muted-foreground">بودجه: {fmtToman(r.budget)}</p>}
                      <Link to="/ai-design"><Button variant="outline" size="sm" className="w-full">ادامه طراحی</Button></Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── FAVORITES ── */}
        <TabsContent value="favorites">
          {wishlistItems.length === 0 ? (
            <EmptyState icon={<Heart size={48} />} text="لیست علاقه‌مندی‌های شما خالی است." linkTo="/shops" linkLabel="گردش در فروشگاه‌ها" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlistItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Heart size={24} /></div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-bold truncate">{item.title}</h4>
                    <p className="text-gold font-bold mt-1">{fmtToman(item.price)}</p>
                    <div className="flex gap-2 mt-3">
                      <Link to={item.item_type === "product" ? `/product/${item.item_id}` : "/wishlist"} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">مشاهده</Button>
                      </Link>
                      {item.item_type === "product" && (
                        <ViewInMyRoomButton
                          productId={item.item_id}
                          productName={item.title}
                          productImage={item.image_url}
                          productPrice={item.price}
                          variant="full"
                          className="text-xs flex-1"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── MY ADS ── */}
        <TabsContent value="ads">
          <MyAdsSection ads={ads} categories={adCategories} />
        </TabsContent>

        {/* ── PREMIUM (placeholder — no payment gateway wired yet) ── */}
        <TabsContent value="premium">
          <PremiumSection plans={plans} />
        </TabsContent>

        {/* ── NOTIFICATIONS ── */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold flex items-center gap-2"><Bell size={20} className="text-gold" /> اعلان‌های دریافتی</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-gold">
                <CheckCheck size={14} /> علامت‌گذاری همه به عنوان خوانده شده
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <EmptyState icon={<Bell size={48} />} text="اعلانی برای نمایش وجود ندارد." />
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <Card key={n.id} className={`transition-all hover:border-muted-foreground/30 ${n.is_read ? "opacity-75 bg-card/50" : "border-r-4 border-r-gold bg-gold/5 shadow-sm"}`}>
                  <CardContent className="p-4 md:p-5 flex gap-4 items-start">
                    <div className="text-2xl mt-0.5 shrink-0 bg-muted/30 p-2.5 rounded-xl">{typeEmoji[n.type] || "🔔"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm md:text-base ${n.is_read ? "text-muted-foreground font-normal" : "font-bold text-foreground"}`}>{n.title}</h4>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatPersianDate(n.created_at)}</span>
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">{n.body}</p>}
                      {n.link && (
                        <Link to={n.link} className="inline-block mt-3">
                          <Button variant="link" size="sm" className="text-xs p-0 h-auto text-gold gap-1">مشاهده جزئیات <ChevronRight size={12} className="rotate-180" /></Button>
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 justify-center">
                      {!n.is_read && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold" onClick={() => markRead(n.id)} title="علامت‌گذاری به عنوان خوانده شده">
                          <Check size={16} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(n.id)} title="حذف">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── PROFILE ── */}
        <TabsContent value="profile">
          <ProfileSection profile={profile} userId={userId} onSaved={loadAll} addresses={addresses} />
        </TabsContent>

        {/* ── SETTINGS ── */}
        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle className="text-lg">تنظیمات حساب</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold">اعلان‌ها</p>
                    <p className="text-xs text-muted-foreground">مدیریت اعلان‌های دریافتی از بخش «اعلان‌ها» در همین داشبورد</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border">
                <div>
                  <p className="text-sm font-semibold">خروج از حساب کاربری</p>
                  <p className="text-xs text-muted-foreground">از این دستگاه خارج شوید</p>
                </div>
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}>
                  <LogOut size={14} /> خروج
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============================================================
// Home summary card
// ============================================================
// NOTE: Tailwind classes must appear as complete, static strings in the
// source for the JIT compiler to generate them — a template-literal class
// like `bg-${color}/10` would silently produce no CSS in production. This
// lookup table keeps every class name whole and statically analyzable.
type SummaryColor = "emerald-brand" | "gold" | "blue-500" | "rose-500" | "purple-500";
const SUMMARY_COLOR_CLASSES: Record<SummaryColor, { card: string; iconWrap: string }> = {
  "emerald-brand": { card: "bg-gradient-to-br from-emerald-brand/10 to-transparent border-emerald-brand/20", iconWrap: "bg-emerald-brand/15 text-emerald-brand" },
  gold: { card: "bg-gradient-to-br from-gold/10 to-transparent border-gold/20", iconWrap: "bg-gold/15 text-gold" },
  "blue-500": { card: "bg-gradient-to-br from-blue-500/10 to-transparent border-blue-200", iconWrap: "bg-blue-100 text-blue-600" },
  "rose-500": { card: "bg-gradient-to-br from-rose-500/10 to-transparent border-rose-200", iconWrap: "bg-rose-100 text-rose-600" },
  "purple-500": { card: "bg-gradient-to-br from-purple-500/10 to-transparent border-purple-200", iconWrap: "bg-purple-100 text-purple-600" },
};

const SummaryCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: SummaryColor }) => {
  const cls = SUMMARY_COLOR_CLASSES[color];
  return (
    <Card className={cls.card}>
      <CardContent className="p-4">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center mb-2 ${cls.iconWrap}`}>{icon}</div>
        <p className="text-xl font-bold">{value.toLocaleString("en-US")}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ icon, text, linkTo, linkLabel }: { icon: React.ReactNode; text: string; linkTo?: string; linkLabel?: string }) => (
  <Card>
    <CardContent className="py-12 text-center">
      <div className="mx-auto text-muted-foreground mb-4 opacity-20 w-fit">{icon}</div>
      <p className="text-muted-foreground">{text}</p>
      {linkTo && (
        <Link to={linkTo}><Button variant="link" className="text-gold mt-2">{linkLabel}</Button></Link>
      )}
    </CardContent>
  </Card>
);

// ============================================================
// My Ads
// ============================================================
const MyAdsSection = ({ ads, categories }: { ads: ReturnType<typeof useMyAds>; categories: ReturnType<typeof useAdCategories>["categories"] }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<null | (typeof ads.items)[number]>(null);
  const [form, setForm] = useState<AdInput>({ title: "", description: "", price: null, images: [], city: "", category_id: null });

  const openCreate = () => { setEditing(null); setForm({ title: "", description: "", price: null, images: [], city: "", category_id: categories[0]?.id ?? null }); setOpen(true); };
  const openEdit = (ad: (typeof ads.items)[number]) => {
    setEditing(ad);
    setForm({ title: ad.title, description: ad.description, price: ad.price, images: ad.images, city: ad.city, category_id: ad.category_id });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title?.trim()) { toast({ title: "عنوان آگهی الزامی است", variant: "destructive" }); return; }
    if (editing) await ads.update(editing.id, form);
    else await ads.create(form);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Megaphone size={20} className="text-gold" /> آگهی‌های من</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 gradient-gold text-primary-foreground" onClick={openCreate}><Plus size={16} /> ثبت آگهی جدید</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader><DialogTitle>{editing ? "ویرایش آگهی" : "ثبت آگهی جدید"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {!editing && ads.items.length === 0 && (
                <p className="text-xs text-emerald-brand bg-emerald-brand/10 rounded-lg p-2">🎉 اولین آگهی شما رایگان است!</p>
              )}
              <div className="space-y-1.5">
                <Label>دسته‌بندی</Label>
                <Select value={form.category_id ?? undefined} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="انتخاب دسته‌بندی" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>عنوان</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>توضیحات</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>قیمت (تومان)</Label><Input type="number" value={form.price ?? ""} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value ? Number(e.target.value) : null }))} /></div>
                <div className="space-y-1.5"><Label>شهر</Label><Input value={form.city ?? ""} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
              <Button className="gradient-gold text-primary-foreground" onClick={submit}>{editing ? "ذخیره تغییرات" : "ثبت آگهی"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {ads.items.length === 0 ? (
        <EmptyState icon={<Megaphone size={48} />} text="هنوز هیچ آگهی ثبت نکرده‌اید." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.items.map((ad) => (
            <Card key={ad.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={ad.status === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : ad.status === "paused" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-muted"}>
                    {ad.status === "active" ? "فعال" : ad.status === "paused" ? "متوقف شده" : ad.status === "expired" ? "منقضی" : "پیش‌نویس"}
                  </Badge>
                  {ad.is_free && <Badge variant="outline" className="text-[10px] bg-gold/10 text-gold border-gold/30">رایگان</Badge>}
                </div>
                <h4 className="font-bold truncate">{ad.title}</h4>
                {ad.price != null && <p className="text-gold font-bold">{fmtToman(ad.price)}</p>}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{(ad.views_count ?? 0).toLocaleString("en-US")} بازدید</span>
                  <span>{(ad.clicks_count ?? 0).toLocaleString("en-US")} کلیک</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(ad)}><Pencil size={13} /> ویرایش</Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => ads.setStatus(ad.id, ad.status === "active" ? "paused" : "active")}>
                    {ad.status === "active" ? <Pause size={13} /> : <Play size={13} />}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => ads.remove(ad.id)}><Trash2 size={13} /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Premium (subscription/token placeholder — no payment gateway)
// ============================================================
const PremiumSection = ({ plans }: { plans: SubscriptionPlan[] }) => (
  <div className="space-y-4">
    <Card className="bg-gradient-to-l from-gold/15 to-transparent border-gold/30">
      <CardContent className="p-6 flex items-center gap-4">
        <Crown size={32} className="text-gold shrink-0" />
        <div>
          <h3 className="font-bold text-lg">هومینو پرمیوم</h3>
          <p className="text-sm text-muted-foreground">با ارتقا به پلن‌های بالاتر، امکانات ویژه فروشگاهی و اعتبار بیشتر برای طراحی هوشمند دریافت کنید.</p>
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {plans.map((p) => (
        <Card key={p.id} className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{p.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{p.tagline}</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            <p className="text-xl font-bold text-gold">{p.price_monthly > 0 ? `${fmtToman(p.price_monthly)} / ماه` : "رایگان"}</p>
            <ul className="text-xs text-muted-foreground space-y-1 flex-1">
              {((p.features as string[]) || []).map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
            <Link to="/billing"><Button variant="outline" className="w-full">به‌زودی</Button></Link>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// ============================================================
// Profile (personal info, contact, house profile, addresses)
// ============================================================
const ProfileSection = ({
  profile, userId, onSaved, addresses,
}: {
  profile: Profile | null; userId: string; onSaved: () => void; addresses: ReturnType<typeof useAddresses>;
}) => {
  const [form, setForm] = useState({
    first_name: profile?.first_name ?? "", last_name: profile?.last_name ?? "",
    avatar_url: profile?.avatar_url ?? "", phone: profile?.phone ?? "",
    secondary_phone: profile?.secondary_phone ?? "", birth_date: profile?.birth_date ?? "",
    property_type: profile?.property_type ?? "", area_sqm: profile?.area_sqm ?? "",
    room_count: profile?.room_count ?? "", construction_year: profile?.construction_year ?? "",
    preferred_style: profile?.preferred_style ?? "", preferred_budget: profile?.preferred_budget ?? "",
    favorite_colors: (profile?.favorite_colors ?? []).join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrForm, setAddrForm] = useState<AddressInput>({
    title: "", province: "", city: "", district: "", neighborhood: "", street: "",
    alley: "", building_number: "", unit: "", floor: "", postal_code: "", description: "", is_default: false,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email ?? ""));
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      full_name: `${form.first_name} ${form.last_name}`.trim() || null,
      avatar_url: form.avatar_url || null,
      phone: form.phone || null,
      secondary_phone: form.secondary_phone || null,
      birth_date: form.birth_date || null,
      property_type: form.property_type || null,
      area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
      room_count: form.room_count ? Number(form.room_count) : null,
      construction_year: form.construction_year ? Number(form.construction_year) : null,
      preferred_style: form.preferred_style || null,
      preferred_budget: form.preferred_budget ? Number(form.preferred_budget) : null,
      favorite_colors: form.favorite_colors ? form.favorite_colors.split(",").map((c) => c.trim()).filter(Boolean) : [],
    }).eq("id", userId);
    setSaving(false);
    if (error) { toast({ title: "ذخیره پروفایل با خطا مواجه شد", variant: "destructive" }); return; }
    toast({ title: "پروفایل با موفقیت بروزرسانی شد" });
    onSaved();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">اطلاعات شخصی</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <AvatarUploader
            userId={userId}
            value={form.avatar_url || null}
            fallback={form.first_name || "ک"}
            onChange={(url) => {
              setForm((f) => ({ ...f, avatar_url: url ?? "" }));
              onSaved();
            }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>نام</Label><Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>نام خانوادگی</Label><Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>تاریخ تولد (اختیاری)</Label><Input type="date" value={form.birth_date ?? ""} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">اطلاعات تماس</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">شماره موبایل تایید شده {profile?.phone_verified && <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">تایید شده</Badge>}</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="09xxxxxxxxx" />
          </div>
          <div className="space-y-1.5"><Label>شماره موبایل دوم (اختیاری)</Label><Input value={form.secondary_phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, secondary_phone: e.target.value }))} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>ایمیل</Label><Input value={email} disabled /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">پروفایل خانه (بهبود پیشنهادات هومینو استودیو)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>نوع ملک</Label>
            <Select value={form.property_type} onValueChange={(v) => setForm((f) => ({ ...f, property_type: v }))}>
              <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
              <SelectContent>{PROPERTY_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>متراژ (متر مربع)</Label><Input type="number" value={form.area_sqm} onChange={(e) => setForm((f) => ({ ...f, area_sqm: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>تعداد اتاق</Label><Input type="number" value={form.room_count} onChange={(e) => setForm((f) => ({ ...f, room_count: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>سال ساخت</Label><Input type="number" value={form.construction_year} onChange={(e) => setForm((f) => ({ ...f, construction_year: e.target.value }))} /></div>
          <div className="space-y-1.5">
            <Label>سبک مورد علاقه</Label>
            <Select value={form.preferred_style} onValueChange={(v) => setForm((f) => ({ ...f, preferred_style: v }))}>
              <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
              <SelectContent>{PREFERRED_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>بودجه مورد نظر (تومان)</Label><Input type="number" value={form.preferred_budget} onChange={(e) => setForm((f) => ({ ...f, preferred_budget: e.target.value }))} /></div>
          <div className="space-y-1.5 md:col-span-3"><Label>رنگ‌های مورد علاقه (با ویرگول جدا کنید)</Label><Input value={form.favorite_colors} onChange={(e) => setForm((f) => ({ ...f, favorite_colors: e.target.value }))} placeholder="کرم, خاکستری, آبی" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><MapPin size={18} /> آدرس‌ها</CardTitle>
          <Dialog open={addrOpen} onOpenChange={setAddrOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1.5"><Plus size={14} /> افزودن آدرس</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg" dir="rtl">
              <DialogHeader><DialogTitle>آدرس جدید</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pl-1">
                {([
                  ["title", "عنوان (مثلاً منزل)"], ["province", "استان"], ["city", "شهر"], ["district", "منطقه"],
                  ["neighborhood", "محله"], ["street", "خیابان"], ["alley", "کوچه"], ["building_number", "پلاک"],
                  ["unit", "واحد"], ["floor", "طبقه (اختیاری)"], ["postal_code", "کد پستی"],
                ] as [keyof AddressInput, string][]).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input value={(addrForm[key] as string) ?? ""} onChange={(e) => setAddrForm((f) => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="space-y-1.5 col-span-2"><Label className="text-xs">توضیحات</Label><Textarea value={addrForm.description ?? ""} onChange={(e) => setAddrForm((f) => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddrOpen(false)}>انصراف</Button>
                <Button className="gradient-gold text-primary-foreground" onClick={async () => { await addresses.create(addrForm); setAddrOpen(false); }}>ثبت آدرس</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {addresses.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">هنوز آدرسی ثبت نکرده‌اید.</p>
          ) : (
            addresses.items.map((a) => (
              <div key={a.id} className="flex items-center justify-between border rounded-xl p-3 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{a.title || "آدرس"}</span>
                    {a.is_default && <Badge variant="outline" className="text-[10px] bg-gold/10 text-gold border-gold/30">پیش‌فرض</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{[a.province, a.city, a.district, a.street].filter(Boolean).join("، ")}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {!a.is_default && <Button variant="ghost" size="sm" className="text-xs" onClick={() => addresses.setDefault(a.id)}>پیش‌فرض</Button>}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => addresses.remove(a.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Button className="w-full gradient-gold text-primary-foreground h-11" disabled={saving} onClick={save}>
        {saving ? <Loader2 className="animate-spin" size={16} /> : "ذخیره تغییرات پروفایل"}
      </Button>
    </div>
  );
};
