import { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Send, User, ShoppingBag, Loader2, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMessages } from "@/hooks/useMessages";
import { formatPersianDate } from "@/lib/date";

const Chat = () => {
  const { userId: otherUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [otherUserName, setOtherUserName] = useState("کاربر");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setMyUserId(data.session?.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  const { currentChat, fetchConversation, send } = useMessages(myUserId);

  // Fetch other user's name
  useEffect(() => {
    if (!otherUserId) return;
    supabase
      .from("profiles")
      .select("brand_name")
      .eq("id", otherUserId)
      .single()
      .then(({ data }) => {
        if (data) setOtherUserName(data.brand_name);
      });
  }, [otherUserId]);

  // Load conversation
  useEffect(() => {
    if (!otherUserId || !myUserId) return;
    fetchConversation(otherUserId);
  }, [otherUserId, myUserId, fetchConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat]);

  // Realtime subscription for new messages in this conversation
  useEffect(() => {
    if (!myUserId || !otherUserId) return;

    const channel = supabase
      .channel(`chat-${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${myUserId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id === otherUserId) {
            fetchConversation(otherUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myUserId, otherUserId, fetchConversation]);

  const handleSend = async () => {
    if (!input.trim() || !otherUserId || sending) return;
    setSending(true);
    await send(otherUserId, input.trim());
    setInput("");
    setSending(false);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="pt-32 pb-20 container mx-auto px-4 max-w-2xl flex items-center justify-center">
          <Skeleton className="h-96 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!myUserId) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="pt-32 pb-20 container mx-auto px-4 text-center">
          <div className="max-w-md mx-auto">
            <MessageCircle size={64} className="mx-auto text-gold mb-6 opacity-50" />
            <h1 className="text-2xl font-bold mb-4">گفتگو</h1>
            <p className="text-muted-foreground mb-6">برای ارسال پیام، ابتدا وارد حساب کاربری خود شوید.</p>
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
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <Navbar />

      <div className="pt-28 pb-4 container mx-auto px-4 max-w-2xl flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center gap-4 mb-4 bg-card border border-border rounded-2xl p-4">
          <button
            onClick={() => navigate("/messages")}
            className="text-muted-foreground hover:text-gold transition-colors shrink-0"
            title="بازگشت به پیام‌ها"
          >
            <ArrowRight size={20} />
          </button>
          <div className="h-10 w-10 bg-gold/20 rounded-full flex items-center justify-center shrink-0">
            <User size={20} className="text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold truncate">{otherUserName}</h2>
            <p className="text-xs text-muted-foreground">گفتگوی خصوصی</p>
          </div>
          <Link to={`/shops/${otherUserId}`}>
            <Button variant="ghost" size="icon" title="مشاهده فروشگاه">
              <ShoppingBag size={18} className="text-muted-foreground hover:text-gold" />
            </Button>
          </Link>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 mb-4 min-h-[50vh] max-h-[55vh] custom-scrollbar">
          {currentChat.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle size={48} className="mx-auto text-muted-foreground mb-4 opacity-30" />
                <p className="text-muted-foreground">هنوز پیامی رد و بدل نشده است.</p>
                <p className="text-muted-foreground text-sm mt-1">اولین پیام را ارسال کنید 👋</p>
              </div>
            </div>
          ) : (
            currentChat.map((msg) => {
              const isMe = msg.sender_id === myUserId;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%]`}>
                    <div
                      className={`p-3 text-sm rounded-2xl ${
                        isMe
                          ? "bg-gold text-primary-foreground rounded-br-none"
                          : "bg-card border border-border text-foreground rounded-tr-none shadow-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px] text-muted-foreground">
                        {formatPersianDate(msg.created_at)}
                      </span>
                      {isMe && msg.is_read && (
                        <span className="text-[10px] text-gold/70">✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 sticky bottom-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="پیام خود را بنویسید..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none py-2"
            maxLength={2000}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="gradient-gold text-primary-foreground p-2 rounded-xl hover:opacity-90 transition-opacity shrink-0 h-10 w-10"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Chat;
