import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Loader2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "نام الزامی است").max(120),
  phone: z.string().trim().min(6, "شماره تماس الزامی است").max(30),
  message: z.string().trim().min(3, "پیام را وارد کنید").max(1000),
});

interface Props {
  profile_id: string;
  product_id?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
}

const InquiryDialog = ({ profile_id, product_id, label = "ارسال درخواست", variant = "outline" }: Props) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
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
      toast({ title: "ورود لازم است", description: "برای ارسال درخواست ابتدا وارد شوید" });
      setOpen(false);
      navigate("/auth");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("inquiries").insert({
      customer_id: user.id,
      profile_id,
      product_id: product_id ?? null,
      name: parsed.data.name,
      phone: parsed.data.phone,
      message: parsed.data.message,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "ارسال شد", description: "درخواست شما برای فروشنده ارسال شد" });
    setForm({ name: "", phone: "", message: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className="gap-2">
          <MessageSquare size={16} /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>ارسال درخواست / استعلام</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>نام *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} required />
          </div>
          <div className="space-y-2">
            <Label>شماره تماس *</Label>
            <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} required />
          </div>
          <div className="space-y-2">
            <Label>پیام *</Label>
            <Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={1000} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
            <Button type="submit" disabled={submitting} className="gradient-gold text-primary-foreground">
              {submitting ? <Loader2 className="animate-spin" size={16} /> : "ارسال"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InquiryDialog;
