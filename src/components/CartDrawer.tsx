import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Minus, ShoppingBag, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const checkoutSchema = z.object({
  recipient_name: z.string().trim().min(2, "نام الزامی است").max(120),
  phone: z.string().trim().min(6, "شماره تماس الزامی است").max(30),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().min(5, "آدرس الزامی است").max(500),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

const CartDrawer = () => {
  const { items, isOpen, setOpen, updateQuantity, removeItem, totalAmount, totalItems, clear } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState<"cart" | "checkout" | "done">("cart");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ recipient_name: "", phone: "", city: "", address: "", note: "" });

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "خطا", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "ورود لازم است", description: "برای ثبت سفارش ابتدا وارد حساب شوید" });
      setOpen(false);
      navigate("/auth");
      return;
    }
    if (!items.length) return;

    setSubmitting(true);
    const profile_id = items[0].profile_id;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        profile_id,
        recipient_name: parsed.data.recipient_name,
        phone: parsed.data.phone,
        city: parsed.data.city || null,
        address: parsed.data.address,
        note: parsed.data.note || null,
        total_amount: totalAmount,
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      setSubmitting(false);
      toast({ title: "خطا", description: orderErr?.message ?? "ثبت سفارش ناموفق بود", variant: "destructive" });
      return;
    }

    const { error: itemsErr } = await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        product_name: i.name,
        unit_price: i.price,
        quantity: i.quantity,
      }))
    );
    setSubmitting(false);

    if (itemsErr) {
      toast({ title: "خطا در ثبت اقلام", description: itemsErr.message, variant: "destructive" });
      return;
    }

    clear();
    setStep("done");
  };

  const closeAndReset = () => {
    setOpen(false);
    setTimeout(() => setStep("cart"), 300);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(v) => { if (!v) closeAndReset(); else setOpen(true); }}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto" dir="rtl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-gold" />
            {step === "done" ? "سفارش ثبت شد" : step === "checkout" ? "تکمیل سفارش" : `سبد خرید (${totalItems})`}
          </SheetTitle>
        </SheetHeader>

        {step === "cart" && (
          <div className="mt-6 space-y-4">
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">سبد خرید شما خالی است.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {items.map((i) => (
                    <div key={i.product_id} className="flex gap-3 p-3 rounded-lg border border-border bg-card">
                      <div className="w-16 h-16 rounded-md bg-muted overflow-hidden flex-shrink-0">
                        {i.image_url && <img src={i.image_url} alt={i.name} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1">{i.name}</p>
                        <p className="text-gold text-sm">{i.price.toLocaleString("fa-IR")} تومان</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(i.product_id, i.quantity - 1)}>
                              <Minus size={12} />
                            </Button>
                            <span className="text-sm w-6 text-center">{i.quantity}</span>
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(i.product_id, i.quantity + 1)}>
                              <Plus size={12} />
                            </Button>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(i.product_id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex justify-between font-bold">
                    <span>جمع کل:</span>
                    <span className="text-gold">{totalAmount.toLocaleString("fa-IR")} تومان</span>
                  </div>
                  <Button onClick={() => setStep("checkout")} className="w-full gradient-gold text-primary-foreground">
                    ادامه و تکمیل سفارش
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === "checkout" && (
          <form onSubmit={submitOrder} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>نام گیرنده *</Label>
              <Input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} maxLength={120} required />
            </div>
            <div className="space-y-2">
              <Label>شماره تماس *</Label>
              <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} required />
            </div>
            <div className="space-y-2">
              <Label>شهر</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label>آدرس *</Label>
              <Textarea rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={500} required />
            </div>
            <div className="space-y-2">
              <Label>یادداشت (اختیاری)</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={500} />
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span>مبلغ قابل پرداخت:</span>
              <span className="text-gold font-bold">{totalAmount.toLocaleString("fa-IR")} تومان</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("cart")} className="flex-1">بازگشت</Button>
              <Button type="submit" disabled={submitting} className="flex-1 gradient-gold text-primary-foreground">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : "ثبت سفارش"}
              </Button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="mt-10 text-center space-y-4">
            <CheckCircle2 size={56} className="mx-auto text-emerald-brand" />
            <h3 className="text-lg font-bold">سفارش شما با موفقیت ثبت شد</h3>
            <p className="text-sm text-muted-foreground">فروشنده به‌زودی با شما تماس می‌گیرد.</p>
            <Button onClick={closeAndReset} className="w-full">بستن</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
