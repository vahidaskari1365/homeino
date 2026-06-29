import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatPersianDate } from "@/lib/date";
import { useNotifications, type NotificationType } from "@/hooks/useNotifications";

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

const NotificationBell = () => {
  const { items, unreadCount, markRead, markAllRead, remove, isAuthed } = useNotifications();

  if (!isAuthed) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative text-muted-foreground hover:text-gold transition-colors"
          title="اعلان‌ها"
          aria-label={`اعلان‌ها${unreadCount ? ` (${unreadCount} جدید)` : ""}`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" dir="rtl">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-bold text-sm">اعلان‌ها</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
              <CheckCheck size={14} /> همه را خواندم
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">اعلانی ندارید</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const content = (
                  <div className="flex gap-2 p-3 hover:bg-accent/40 transition-colors">
                    <div className="text-xl leading-none mt-0.5">{typeEmoji[n.type] || "🔔"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${n.is_read ? "text-muted-foreground" : "font-semibold"}`}>
                          {n.title}
                        </p>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-gold mt-1.5 flex-shrink-0" />}
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{formatPersianDate(n.created_at)}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!n.is_read && (
                        <button
                          onClick={(e) => { e.preventDefault(); markRead(n.id); }}
                          className="text-muted-foreground hover:text-gold p-1"
                          title="علامت‌گذاری به‌عنوان خوانده‌شده"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); remove(n.id); }}
                        className="text-muted-foreground hover:text-destructive p-1"
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} onClick={() => !n.is_read && markRead(n.id)}>
                    {n.link ? <Link to={n.link}>{content}</Link> : content}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
