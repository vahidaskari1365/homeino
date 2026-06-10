import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConsultationRequestDialog from "@/components/ConsultationRequestDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Send, MessageCircle, Sparkles, Loader2 } from "lucide-react";

type Consultation = {
  id: string;
  customer_id: string;
  designer_id: string | null;
  consultation_type: string;
  status: string;
  title: string;
  description: string | null;
  room_type: string | null;
  style_preference: string | null;
  city: string | null;
  customer_name: string;
  customer_phone: string;
  budget_min: number | null;
  budget_max: number | null;
  designer_note: string | null;
  final_price: number | null;
  created_at: string;
};

type Message = {
  id: string;
  consultation_id: string;
  sender_id: string;
  sender_role: string;
  body: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  pending: "در انتظار",
  assigned: "اختصاص داده شده",
  in_progress: "در حال انجام",
  completed: "تکمیل شده",
  cancelled: "لغو شده",
};

const typeLabels: Record<string, string> = {
  advice: "مشاوره عمومی",
  chat: "گفتگو با طراح",
  custom_design: "طراحی اختصاصی",
};

const Consultations = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [designerId, setDesignerId] = useState<string | null>(null);
  const [list, setList] = useState<Consultation[]>([]);
  const [active, setActive] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);
      const { data: d } = await supabase.from("designers").select("id").eq("user_id", user.id).maybeSingle();
      setDesignerId(d?.id ?? null);
      await loadList(user.id, d?.id ?? null);
      setLoading(false);
    });
  }, [navigate]);

  const loadList = async (uid: string, did: string | null) => {
    let query = supabase.from("consultations").select("*").order("created_at", { ascending: false });
    if (did) {
      query = query.or(`customer_id.eq.${uid},designer_id.eq.${did},designer_id.is.null`);
    } else {
      query = query.eq("customer_id", uid);
    }
    const { data, error } = await query;
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    setList((data as Consultation[]) ?? []);
  };

  useEffect(() => {
    if (!active) return;
    supabase.from("consultation_messages").select("*").eq("consultation_id", active.id).order("created_at")
      .then(({ data }) => setMessages((data as Message[]) ?? []));

    const channel = supabase.channel(`consult-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "consultation_messages", filter: `consultation_id=eq.${active.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !active || !userId) return;
    const role = active.customer_id === userId ? "customer" : (designerId && active.designer_id === designerId ? "designer" : "designer");
    setSending(true);
    const { error } = await supabase.from("consultation_messages").insert({
      consultation_id: active.id,
      sender_id: userId,
      sender_role: role,
      body: input.trim(),
    });
    setSending(false);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    setInput("");
  };

  const claim = async (c: Consultation) => {
    if (!designerId) return;
    const { error } = await supabase.from("consultations").update({ designer_id: designerId, status: "assigned" }).eq("id", c.id);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "انجام شد", description: "درخواست به شما اختصاص داده شد" });
    if (userId) await loadList(userId, designerId);
  };

  const updateStatus = async (status: string) => {
    if (!active) return;
    const { error } = await supabase.from("consultations").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", active.id);
    if (error) { toast({ title: "خطا", description: error.message, variant: "destructive" }); return; }
    toast({ title: "بروزرسانی شد" });
    if (userId) await loadList(userId, designerId);
  };

  const myRequests = list.filter((c) => c.customer_id === userId);
  const designerRequests = list.filter((c) => designerId && (c.designer_id === designerId || c.designer_id === null));

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-6 pt-28 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-display text-gold font-bold">مشاوره آنلاین دکوراسیون</h1>
            <p className="text-muted-foreground mt-2">با طراحان داخلی متخصص گفتگو کنید و طراحی اختصاصی سفارش دهید</p>
          </div>
          <ConsultationRequestDialog />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={40} /></div>
        ) : (
          <Tabs defaultValue="mine">
            <TabsList>
              <TabsTrigger value="mine">درخواست‌های من ({myRequests.length})</TabsTrigger>
              {designerId && <TabsTrigger value="designer">پنل طراح ({designerRequests.length})</TabsTrigger>}
            </TabsList>

            <TabsContent value="mine" className="mt-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="space-y-3 lg:col-span-1">
                  {myRequests.length === 0 && (
                    <Card><CardContent className="py-10 text-center text-muted-foreground">هنوز درخواست مشاوره‌ای ثبت نکرده‌اید.</CardContent></Card>
                  )}
                  {myRequests.map((c) => (
                    <Card key={c.id} onClick={() => setActive(c)} className={`cursor-pointer transition ${active?.id === c.id ? "border-gold" : "hover:border-gold/50"}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{c.title}</CardTitle>
                          <Badge variant="secondary">{statusLabels[c.status]}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        <div>{typeLabels[c.consultation_type]}</div>
                        {c.final_price && <div className="text-gold mt-1">قیمت نهایی: {Number(c.final_price).toLocaleString("fa-IR")} تومان</div>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="lg:col-span-2">
                  {active && active.customer_id === userId ? (
                    <ChatPanel active={active} messages={messages} input={input} setInput={setInput} sendMessage={sendMessage} sending={sending} scrollRef={scrollRef} userId={userId} />
                  ) : (
                    <Card><CardContent className="py-20 text-center text-muted-foreground">یک درخواست را انتخاب کنید تا گفتگو را ببینید</CardContent></Card>
                  )}
                </div>
              </div>
            </TabsContent>

            {designerId && (
              <TabsContent value="designer" className="mt-6">
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="space-y-3 lg:col-span-1">
                    {designerRequests.map((c) => (
                      <Card key={c.id} onClick={() => setActive(c)} className={`cursor-pointer transition ${active?.id === c.id ? "border-gold" : "hover:border-gold/50"}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{c.title}</CardTitle>
                            <Badge variant={c.designer_id === null ? "default" : "secondary"}>{c.designer_id === null ? "آزاد" : statusLabels[c.status]}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          <div>{typeLabels[c.consultation_type]} • {c.customer_name}</div>
                          {c.city && <div>{c.city}</div>}
                          {c.designer_id === null && (
                            <Button size="sm" className="mt-2 w-full" onClick={(e) => { e.stopPropagation(); claim(c); }}>پذیرش درخواست</Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="lg:col-span-2 space-y-4">
                    {active && (active.designer_id === designerId) ? (
                      <>
                        <Card>
                          <CardContent className="pt-6 flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => updateStatus("in_progress")}>شروع کار</Button>
                            <Button size="sm" variant="outline" onClick={() => updateStatus("completed")}>تکمیل</Button>
                            <Button size="sm" variant="outline" onClick={() => updateStatus("cancelled")}>لغو</Button>
                          </CardContent>
                        </Card>
                        <ChatPanel active={active} messages={messages} input={input} setInput={setInput} sendMessage={sendMessage} sending={sending} scrollRef={scrollRef} userId={userId} />
                      </>
                    ) : (
                      <Card><CardContent className="py-20 text-center text-muted-foreground">یک درخواست را انتخاب یا بپذیرید</CardContent></Card>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

const ChatPanel = ({ active, messages, input, setInput, sendMessage, sending, scrollRef, userId }: {
  active: Consultation;
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  sendMessage: () => void;
  sending: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  userId: string | null;
}) => (
  <Card className="flex flex-col h-[600px]">
    <CardHeader className="border-b">
      <CardTitle className="text-lg">{active.title}</CardTitle>
      <div className="text-sm text-muted-foreground">
        {typeLabels[active.consultation_type]} • {statusLabels[active.status]}
        {active.room_type && ` • ${active.room_type}`}
        {active.style_preference && ` • ${active.style_preference}`}
      </div>
      {active.description && <p className="text-sm mt-2">{active.description}</p>}
    </CardHeader>
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-10">
          <MessageCircle className="mx-auto mb-2 text-gold" size={32} />
          گفتگو را شروع کنید
        </div>
      )}
      {messages.map((m: Message) => {
        const mine = m.sender_id === userId;
        return (
          <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[75%] rounded-2xl p-3 text-sm ${mine ? "bg-gold/20 text-foreground rounded-tr-none" : "bg-accent rounded-tl-none"}`}>
              <div className="text-xs text-muted-foreground mb-1">{m.sender_role === "customer" ? "مشتری" : m.sender_role === "designer" ? "طراح" : "مدیر"}</div>
              {m.body}
            </div>
          </div>
        );
      })}
    </div>
    <div className="border-t p-3 flex gap-2">
      <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="پیام خود را بنویسید..." />
      <Button onClick={sendMessage} disabled={sending || !input.trim()} className="gradient-gold text-primary-foreground">
        {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
      </Button>
    </div>
  </Card>
);

export default Consultations;
