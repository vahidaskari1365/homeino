import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, ChevronLeft, User, Clock, ShoppingBag } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useMessages } from "@/hooks/useMessages";
import { formatPersianDate } from "@/lib/date";

const Messages = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  const { conversations, loading, unreadCount } = useMessages(userId);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="pt-32 pb-20 container mx-auto px-4 flex items-center justify-center">
          <Skeleton className="h-64 w-full max-w-2xl" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="pt-32 pb-20 container mx-auto px-4 text-center">
          <div className="max-w-md mx-auto">
            <MessageCircle size={64} className="mx-auto text-gold mb-6 opacity-50" />
            <h1 className="text-2xl font-bold mb-4">پیام‌های من</h1>
            <p className="text-muted-foreground mb-6">برای استفاده از سیستم پیام‌رسانی، ابتدا وارد حساب کاربری خود شوید.</p>
            <Link to="/auth">
              <Button className="gradient-gold text-primary-foreground px-8">ورود / ثبت‌نام</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="pt-32 pb-20 container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle size={24} className="text-gold" />
              پیام‌های من
            </h1>
            <p className="text-muted-foreground text-sm mt-1">گفتگو با فروشندگان و خریداران</p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="px-3 py-1.5">
              {unreadCount.toLocaleString("fa-IR")} پیام جدید
            </Badge>
          )}
        </div>

        {/* Conversations List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <MessageCircle size={48} className="mx-auto text-muted-foreground mb-4 opacity-30" />
              <p className="text-muted-foreground text-lg mb-2">هنوز هیچ گفتگویی ندارید</p>
              <p className="text-muted-foreground text-sm mb-6">
                می‌توانید از طریق صفحه محصولات و فروشگاه‌ها با فروشندگان گفتگو کنید
              </p>
              <Link to="/shops">
                <Button variant="outline" className="gap-2">
                  <ShoppingBag size={16} /> مشاهده فروشگاه‌ها
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <Card
                key={conv.user_id}
                className={`cursor-pointer hover:shadow-md transition-all hover:border-gold/30 ${
                  conv.unread_count > 0 ? "border-r-4 border-r-gold bg-gold/5" : ""
                }`}
                onClick={() => navigate(`/messages/${conv.user_id}`)}
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="h-12 w-12 bg-gold/20 rounded-full flex items-center justify-center shrink-0">
                      <User size={22} className="text-gold" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-bold truncate ${conv.unread_count > 0 ? "text-foreground" : ""}`}>
                          {conv.brand_name}
                        </h3>
                        <span className="text-xs text-muted-foreground shrink-0 mr-2 flex items-center gap-1">
                          <Clock size={12} />
                          {formatPersianDate(conv.last_message_time)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conv.last_message.length > 60
                          ? conv.last_message.slice(0, 60) + "..."
                          : conv.last_message}
                      </p>
                    </div>

                    {/* Unread badge + arrow */}
                    <div className="flex items-center gap-2 shrink-0">
                      {conv.unread_count > 0 && (
                        <Badge className="bg-gold text-primary-foreground px-2 py-0.5 text-xs">
                          {conv.unread_count.toLocaleString("fa-IR")}
                        </Badge>
                      )}
                      <ChevronLeft size={18} className="text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Messages;
