// @ts-nocheck
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Loader2 } from "lucide-react";
import { z } from "zod";
import ReCAPTCHA from "react-google-recaptcha";

const schema = z.object({
  customer_name: z.string().trim().min(2, "نام الزامی است").max(120),
  customer_phone: z.string().trim().min(6, "شماره تماس الزامی است").max(30),
  description: z.string().trim().max(1500).optional(),
  city: z.string().trim().max(80).optional(),
  budget_min: z.string().optional(),
  budget_max: z.string().optional(),
});

type RequestType = "product" | "set" | "custom";

interface Props {
  profile_id: string;
  request_type?: RequestType;
  product_id?: string;
  set_id?: string;
  items?: Array<{ id?: string; name: string; quantity?: number }>;
  title: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  fullWidth?: boolean;
}

const PriceQuoteDialog = ({
  profile_id,
  request_type = "product",
  product_id,
  set_id,
  items = [],
  title,
  label = "درخواست قیمت",
  variant = "outline",
  size = "default",
  className,
  fullWidth,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    description: "",
    city: "",
    budget_min: "",
    budget_max: "",
  });
  const navigate = useNavigate();

  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recaptchaToken) {
      toast({ title: "خطا", description: "لطفاً تأیید کنید که ربات نیستید", variant: "destructive" });
      return;
    }

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "خطا", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "ورود لازم است", description: "برای ثبت درخواست قیمت وارد شوید" });
      setOpen(false);
      navigate("/auth");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("price_quotes").insert({
      customer_id: user.id,
      profile_id,
      request_type,
      product_id: product_id ?? null,
      set_id: set_id ?? null,
      items: items as unknown as Record<string, unknown>[],
      title,
      description: parsed.data.description || null,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      city: parsed.data.city || null,
      budget_min: parsed.data.budget_min ? Number(parsed.data.budget_min) : null,
      budget_max: parsed.data.budget_max ? Number(parsed.data.budget_max) : null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "درخواست ارسال شد", description: "فروشنده به‌زودی قیمت پیشنهادی خود را ارسال می‌کند" });
    setForm({ customer_name: "", customer_phone: "", description: "", city: "", budget_min: "", budget_max: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={`gap-2 ${fullWidth ? "w-full" : ""} ${className ?? ""}`}>
          <Tag size={16} /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>درخواست قیمت</DialogTitle>
          <DialogDescription className="line-clamp-2">{title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>نام شما *</Label>
            <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} maxLength={120} required />
          </div>
          <div className="space-y-2">
            <Label>شماره تماس *</Label>
            <Input dir="ltr" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} maxLength={30} required />
          </div>
          <div className="space-y-2">
            <Label>شهر</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={80} />
          </div>
          <div className="grid grid-cols-2 gap-2">
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
            <Textarea
              rows={3}
              placeholder="مثلاً: این ست را برای پذیرایی ۲۰ متری می‌خواهم، رنگ کرم..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={1500}
            />
          </div>

          <div className="flex justify-center py-2">
            <ReCAPTCHA
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={(token) => setRecaptchaToken(token)}
              hl="fa"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
            <Button type="submit" disabled={submitting || !recaptchaToken} className="gradient-gold text-primary-foreground">
              {submitting ? <Loader2 className="animate-spin" size={16} /> : "ارسال درخواست"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PriceQuoteDialog;
