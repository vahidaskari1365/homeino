import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  title: z.string().trim().min(3).max(200),
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(6).max(30),
  description: z.string().trim().max(2000).optional(),
  room_type: z.string().trim().max(60).optional(),
  style_preference: z.string().trim().max(60).optional(),
  city: z.string().trim().max(60).optional(),
  budget_min: z.string().optional(),
  budget_max: z.string().optional(),
});

interface Props {
  trigger?: React.ReactNode;
  defaultType?: "advice" | "chat" | "custom_design";
}

const ConsultationRequestDialog = ({ trigger, defaultType = "advice" }: Props) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<"advice" | "chat" | "custom_design">(defaultType);
  const [form, setForm] = useState({
    title: "",
    customer_name: "",
    customer_phone: "",
    description: "",
    room_type: "",
    style_preference: "",
    city: "",
    budget_min: "",
    budget_max: "",
  });
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "خطا", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "ورود لازم است", description: "ابتدا وارد حساب کاربری شوید" });
      setOpen(false);
      navigate("/auth");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("consultations").insert({
      customer_id: user.id,
      consultation_type: type,
      title: parsed.data.title,
      description: parsed.data.description || null,
      room_type: parsed.data.room_type || null,
      style_preference: parsed.data.style_preference || null,
      city: parsed.data.city || null,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "ارسال شد", description: "درخواست مشاوره شما ثبت شد. به‌زودی پاسخ داده می‌شود." });
    setOpen(false);
    navigate("/consultations");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2 gradient-gold text-primary-foreground">
            <Sparkles size={16} /> درخواست مشاوره
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>درخواست مشاوره دکوراسیون</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>نوع درخواست</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="advice">مشاوره عمومی</SelectItem>
                <SelectItem value="chat">گفتگو با طراح داخلی</SelectItem>
                <SelectItem value="custom_design">طراحی اختصاصی</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>عنوان *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>نام *</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>تلفن *</Label>
              <Input dir="ltr" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>نوع فضا</Label>
              <Input placeholder="مثلاً پذیرایی" value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>سبک مورد علاقه</Label>
              <Input placeholder="مدرن، کلاسیک..." value={form.style_preference} onChange={(e) => setForm({ ...form, style_preference: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>شهر</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>حداقل بودجه (تومان)</Label>
              <Input dir="ltr" type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>حداکثر بودجه (تومان)</Label>
              <Input dir="ltr" type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>توضیحات</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
            <Button type="submit" disabled={submitting} className="gradient-gold text-primary-foreground">
              {submitting ? <Loader2 className="animate-spin" size={16} /> : "ارسال درخواست"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConsultationRequestDialog;
