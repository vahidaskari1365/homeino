// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ProfileCompletionBar } from "@/components/ProfileCompletionBar";
import { AvatarUploader } from "@/components/AvatarUploader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, ArrowRight, Save, Phone, MapPin, Home, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/tracking";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth", { replace: true }); return; }
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(data);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(profile).eq("id", userId);
    if (error) {
      toast({ title: "خطا در ذخیره پروفایل", variant: "destructive" });
    } else {
      toast({ title: "پروفایل با موفقیت ذخیره شد" });
      trackEvent("profile_updated");
    }
    setSaving(false);
  };

  const updateField = (field: string, value: string | number) => setProfile((prev) => prev ? { ...prev, [field]: value } : prev);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-gold" size={32} /></div>;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-2">
            <ArrowRight size={16} /> بازگشت به داشبورد
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2"><User className="text-gold" /> پروفایل من</h1>
        </div>

        <ProfileCompletionBar />

        <form onSubmit={handleSave} className="space-y-6 mt-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="font-bold mb-4">اطلاعات شخصی</h2>
            <div className="flex items-center gap-6 mb-6">
              <AvatarUploader />
              <p className="text-sm text-muted-foreground">تصویر پروفایل خود را آپلود کنید</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>نام</Label><Input value={profile?.first_name || ""} onChange={(e) => updateField("first_name", e.target.value)} /></div>
              <div className="space-y-2"><Label>نام خانوادگی</Label><Input value={profile?.last_name || ""} onChange={(e) => updateField("last_name", e.target.value)} /></div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="font-bold mb-4">اطلاعات تماس</h2>
            <div className="space-y-4">
              <div className="space-y-2"><Label>شماره تماس</Label><Input type="tel" value={profile?.phone || ""} onChange={(e) => updateField("phone", e.target.value)} /></div>
              <div className="space-y-2"><Label>استان</Label><Input value={profile?.province || ""} onChange={(e) => updateField("province", e.target.value)} /></div>
              <div className="space-y-2"><Label>شهر</Label><Input value={profile?.city || ""} onChange={(e) => updateField("city", e.target.value)} /></div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="font-bold mb-4">مشخصات ملک</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>نوع ملک</Label>
                <Select value={profile?.property_type || ""} onValueChange={(v) => updateField("property_type", v)}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">آپارتمان</SelectItem>
                    <SelectItem value="villa">ویلا</SelectItem>
                    <SelectItem value="office">دفتر کار</SelectItem>
                    <SelectItem value="commercial">تجاری</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>سبک مورد علاقه</Label>
                <Select value={profile?.preferred_style || ""} onValueChange={(v) => updateField("preferred_style", v)}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">مدرن</SelectItem>
                    <SelectItem value="classic">کلاسیک</SelectItem>
                    <SelectItem value="minimalist">مینیمال</SelectItem>
                    <SelectItem value="industrial">صنعتی</SelectItem>
                    <SelectItem value="bohemian">بوهمین</SelectItem>
                    <SelectItem value="luxury">لوکس</SelectItem>
                    <SelectItem value="traditional">سنتی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>مساحت (متر مربع)</Label><Input type="number" value={profile?.area_sqm || ""} onChange={(e) => updateField("area_sqm", Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>تعداد اتاق</Label><Input type="number" value={profile?.room_count || ""} onChange={(e) => updateField("room_count", Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>بودجه (تومان)</Label><Input type="number" value={profile?.preferred_budget || ""} onChange={(e) => updateField("preferred_budget", Number(e.target.value))} /></div>
            </div>
          </Card>

          <Button type="submit" disabled={saving} className="w-full gradient-gold text-primary-foreground gap-2">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} ذخیره تغییرات
          </Button>
        </form>
      </div>
    </div>
  );
}