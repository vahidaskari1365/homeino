import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShoppingBag, 
  Heart, 
  User, 
  Package, 
  Clock, 
  MapPin, 
  ChevronRight,
  Loader2,
  Settings,
  Bell,
  Check,
  CheckCheck,
  Trash2
} from "lucide-react";
import { formatPersianDate } from "@/lib/date";
import { useWishlist } from "@/hooks/useWishlist";
import { useNotifications, type NotificationType } from "@/hooks/useNotifications";

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  recipient_name: string;
  address: string;
  order_items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "در انتظار", color: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmed: { label: "تایید شده", color: "bg-blue-100 text-blue-700 border-blue-200" },
  shipped: { label: "ارسال شده", color: "bg-purple-100 text-purple-700 border-purple-200" },
  delivered: { label: "تحویل شده", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled: { label: "لغو شده", color: "bg-rose-100 text-rose-700 border-rose-200" },
};

const typeEmoji: Record<NotificationType, string> = {
  order_new: "🛒",
  order_status: "📦",
  review_new: "⭐",
  quote_new: "💬",
  consultation_new: "🎨",
  consultation_message: "✉️",
  site_visit_new: "📅",
  inquiry_new: "📨",
  system: "🔔",
};

export const CustomerDashboard = ({ userId }: { userId: string }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { items: wishlistItems } = useWishlist();
  const { items: notifications, unreadCount, markRead, markAllRead, remove } = useNotifications();

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, created_at, status, total_amount, recipient_name, address,
          order_items (id, product_name, quantity, unit_price)
        `)
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data as unknown as Order[]);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-gold/10 to-transparent border-gold/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">سفارش‌های من</p>
                <h3 className="text-2xl font-bold mt-1">{orders.length.toLocaleString("fa-IR")}</h3>
              </div>
              <div className="h-12 w-12 bg-gold/20 rounded-full flex items-center justify-center text-gold">
                <ShoppingBag size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-brand/10 to-transparent border-emerald-brand/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">علاقه‌مندی‌ها</p>
                <h3 className="text-2xl font-bold mt-1">{wishlistItems.length.toLocaleString("fa-IR")}</h3>
              </div>
              <div className="h-12 w-12 bg-emerald-brand/20 rounded-full flex items-center justify-center text-emerald-brand">
                <Heart size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">اعلان‌های جدید</p>
                <h3 className="text-2xl font-bold mt-1">{unreadCount.toLocaleString("fa-IR")}</h3>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Bell size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="w-full" dir="rtl">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-6">
          <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-6">
            <ShoppingBag size={16} className="ml-2" /> سفارش‌های اخیر
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-6">
            <Bell size={16} className="ml-2" /> مرکز اعلان‌ها
            {unreadCount > 0 && (
              <Badge variant="destructive" className="mr-2 px-1.5 py-0.5 text-[10px]">
                {unreadCount.toLocaleString("fa-IR")}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-6">
            <Heart size={16} className="ml-2" /> لیست علاقه‌مندی
          </TabsTrigger>
          <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent py-3 px-6">
            <User size={16} className="ml-2" /> اطلاعات کاربری
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
                <p className="text-muted-foreground">هنوز هیچ سفارشی ثبت نکرده‌اید.</p>
                <Link to="/shops">
                  <Button variant="link" className="text-gold mt-2">مشاهده فروشگاه‌ها</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <Package className="text-muted-foreground" size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">سفارش #{order.id.slice(0, 8)}</span>
                          <Badge variant="outline" className={STATUS_MAP[order.status]?.color || ""}>
                            {STATUS_MAP[order.status]?.label || order.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock size={12} /> {formatPersianDate(order.created_at)}</span>
                          <span className="flex items-center gap-1"><ShoppingBag size={12} /> {order.order_items.length} کالا</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm text-muted-foreground">مبلغ کل</p>
                      <p className="text-lg font-bold text-gold">{order.total_amount.toLocaleString("fa-IR")} تومان</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <MapPin size={14} className="text-muted-foreground" /> جزییات ارسال
                      </p>
                      <p className="text-xs text-muted-foreground">{order.recipient_name}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{order.address}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">اقلام سفارش</p>
                      <div className="space-y-1">
                        {order.order_items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{item.product_name} (×{item.quantity})</span>
                            <span>{(item.unit_price * item.quantity).toLocaleString("fa-IR")} ت</span>
                          </div>
                        ))}
                        {order.order_items.length > 3 && (
                          <p className="text-[10px] text-gold">و {order.order_items.length - 3} مورد دیگر...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Bell size={20} className="text-gold" /> اعلان‌های دریافتی
            </h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-gold">
                <CheckCheck size={14} /> علامت‌گذاری همه به عنوان خوانده شده
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
                <p className="text-muted-foreground">اعلانی برای نمایش وجود ندارد.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <Card 
                  key={n.id} 
                  className={`transition-all hover:border-muted-foreground/30 ${
                    n.is_read ? "opacity-75 bg-card/50" : "border-r-4 border-r-gold bg-gold/5 shadow-sm"
                  }`}
                >
                  <CardContent className="p-4 md:p-5 flex gap-4 items-start">
                    <div className="text-2xl mt-0.5 shrink-0 bg-muted/30 p-2.5 rounded-xl">
                      {typeEmoji[n.type] || "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm md:text-base ${n.is_read ? "text-muted-foreground font-normal" : "font-bold text-foreground"}`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatPersianDate(n.created_at)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
                          {n.body}
                        </p>
                      )}
                      {n.link && (
                        <div className="mt-3">
                          <Link to={n.link}>
                            <Button variant="link" size="sm" className="text-xs p-0 h-auto text-gold gap-1">
                              مشاهده جزئیات سفارش <ChevronRight size={12} className="rotate-180" />
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 justify-center">
                      {!n.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-gold"
                          onClick={() => markRead(n.id)}
                          title="علامت‌گذاری به عنوان خوانده شده"
                        >
                          <Check size={16} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(n.id)}
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="wishlist">
          {wishlistItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
                <p className="text-muted-foreground">لیست علاقه‌مندی‌های شما خالی است.</p>
                <Link to="/shops">
                  <Button variant="link" className="text-gold mt-2">گردش در فروشگاه‌ها</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlistItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Heart size={24} />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-bold truncate">{item.title}</h4>
                    <p className="text-gold font-bold mt-1">{item.price?.toLocaleString("fa-IR")} تومان</p>
                    <div className="flex gap-2 mt-4">
                      <Link to={item.item_type === 'product' ? `/product/${item.item_id}` : '/wishlist'} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">مشاهده</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تنظیمات حساب کاربری</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                <div className="h-16 w-16 bg-gold rounded-full flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {userId.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold">کاربر هومینو</p>
                  <p className="text-sm text-muted-foreground">ID: {userId.slice(0, 8)}...</p>
                </div>
                <Button variant="ghost" size="icon" className="mr-auto">
                  <Settings size={20} />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">آدرس پیش‌فرض</p>
                  <p className="text-sm">ثبت نشده است</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">شماره تماس</p>
                  <p className="text-sm">ثبت نشده است</p>
                </div>
              </div>

              <Button className="w-full gradient-gold text-primary-foreground">ویرایش پروفایل</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
