import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, Mail, Smartphone, Globe, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { prefs, loading, updatePrefs, refresh } = useNotificationPrefs();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth", { replace: true }); return; }
    };
    init();
  }, [navigate]);

  const handleToggle = async (channel: keyof typeof prefs, value: boolean) => {
    if (!prefs) return;
    setSaving(true);
    try {
      await updatePrefs({ [channel]: value });
    } catch {
      toast({ title: "خطا در ذخیره", variant: "destructive" });
      refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-gold" size={32} /></div>;

  const channels = [
    { key: "in_app" as const, icon: Bell, label: "در برنامه", desc: "اعلان‌ها در داخل اپلیکیشن نمایش داده می‌شوند" },
    { key: "email" as const, icon: Mail, label: "ایمیل", desc: "اعلان‌ها به ایمیل شما ارسال می‌شوند" },
    { key: "sms" as const, icon: Smartphone, label: "پیامک", desc: "اعلان‌های مهم به صورت پیامک ارسال می‌شوند" },
    { key: "push" as const, icon: Globe, label: "پوش‌نوتیفیکیشن", desc: "اعلان‌های لحظه‌ای روی دستگاه شما" },
  ];

  const categories = [
    { key: "order_updates" as const, label: "بروزرسانی سفارشات", desc: "وضعیت سفارش، ارسال، تحویل" },
    { key: "design_updates" as const, label: "بروزرسانی طراحی‌ها", desc: "اتمام طراحی، تغییرات، تایید" },
    { key: "marketing" as const, label: "تبلیغات و پیشنهادات", desc: "کمپین‌ها، تخفیف‌ها، محصولات جدید" },
    { key: "system_alerts" as const, label: "هشدارهای سیستم", desc: "امنیتی، حفظ حریم خصوصی، بروزرسانی‌ها" },
  ];

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-2">
            <ArrowRight size={16} /> بازگشت به داشبورد
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="text-gold" /> تنظیمات اعلان‌ها</h1>
        </div>

        <Card className="p-6 bg-card border-border mb-6">
          <h2 className="font-bold mb-4">کانال‌های تحویل</h2>
          <div className="space-y-4">
            {channels.map((ch) => (
              <div key={ch.key} className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gold/10"><ch.icon className="text-gold" size={20} /></div>
                  <div>
                    <p className="font-medium">{ch.label}</p>
                    <p className="text-sm text-muted-foreground">{ch.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={prefs[ch.key]}
                  onCheckedChange={(v) => handleToggle(ch.key, v)}
                  disabled={saving}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h2 className="font-bold mb-4">دسته‌بندی اعلان‌ها</h2>
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.key} className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                <div>
                  <p className="font-medium">{cat.label}</p>
                  <p className="text-sm text-muted-foreground">{cat.desc}</p>
                </div>
                <Switch
                  checked={prefs[cat.key]}
                  onCheckedChange={(v) => handleToggle(cat.key, v)}
                  disabled={saving}
                />
              </div>
            ))}
          </div>
        </Card>

        {saving && <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"><Loader2 className="animate-spin text-gold" size={32} /></div>}
      </div>
    </div>
  );
}