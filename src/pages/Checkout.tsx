// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, CreditCard, MapPin, Phone, User, ShoppingBag, CheckCircle2, Percent, Check, AlertCircle } from "lucide-react";
import { formatPersianPrice } from "@/lib/calculations";
import { trackEvent } from "@/lib/tracking";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const checkoutSchema = z.object({
  recipient_name: z.string().min(3, "نام و نام خانوادگی الزامی است"),
  phone: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
  city: z.string().min(2, "نام شهر الزامی است"),
  address: z.string().min(10, "آدرس دقیق الزامی است"),
  note: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_purchase_amount?: number | null;
  max_discount_amount?: number | null;
  is_active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalAmount, clear } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [step, setStep] = useState<"details" | "payment" | "success">("details");

  // Coupon States
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Saved Form details state to access during payment step
  const [savedOrderAmount, setSavedOrderAmount] = useState<number>(totalAmount);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      recipient_name: "",
      phone: "",
      city: "",
      address: "",
      note: "",
    },
  });

  const watchCity = form.watch("city");

  // Shipping Cost Logic: Tehran: 45,000, Major cities: 65,000, Others: 85,000
  const calculateShippingFee = (cityStr?: string) => {
    if (!cityStr) return 0;
    const trimmedCity = cityStr.trim();
    if (trimmedCity === "تهران") {
      return 45000;
    }
    const majorCities = ["اصفهان", "شیراز", "مشهد", "تبریز", "کرج", "قم", "اهواز", "کرمان", "یزد", "رشت"];
    if (majorCities.includes(trimmedCity)) {
      return 65000;
    }
    return 85000;
  };

  const shippingFee = calculateShippingFee(watchCity);

  // Discount calculation
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      discountAmount = (totalAmount * Number(appliedCoupon.discount_value)) / 100;
      if (appliedCoupon.max_discount_amount && discountAmount > Number(appliedCoupon.max_discount_amount)) {
        discountAmount = Number(appliedCoupon.max_discount_amount);
      }
    } else if (appliedCoupon.discount_type === "fixed") {
      discountAmount = Number(appliedCoupon.discount_value);
    }
  }

  const finalAmount = Math.max(0, totalAmount + shippingFee - discountAmount);

  useEffect(() => {
    if (items.length === 0 && step !== "success") {
      navigate("/shops");
    }
  }, [items, navigate, step]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setCouponError("کد تخفیف معتبر نیست یا منقضی شده است");
        setAppliedCoupon(null);
        return;
      }

      if (data.min_purchase_amount && totalAmount < Number(data.min_purchase_amount)) {
        setCouponError(`این کد تخفیف برای خریدهای بالای ${formatPersianPrice(Number(data.min_purchase_amount))} قابل استفاده است`);
        setAppliedCoupon(null);
        return;
      }

      if (data.end_date && new Date(data.end_date) < new Date()) {
        setCouponError("کد تخفیف منقضی شده است");
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon(data);
      setCouponSuccess(`تخفیف به مبلغ ${data.discount_type === 'percentage' ? `${data.discount_value}٪` : formatPersianPrice(Number(data.discount_value))} با موفقیت اعمال شد.`);
    } catch (err) {
      setCouponError("خطا در بررسی کد تخفیف");
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const onSubmit = async (values: CheckoutFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "خطا",
          description: "برای ثبت سفارش باید وارد حساب خود شوید",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // 1. Create the order with final amount including shipping fee and discount
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          profile_id: items[0].profile_id,
          recipient_name: values.recipient_name,
          phone: values.phone,
          city: values.city,
          address: values.address,
          note: values.note,
          total_amount: finalAmount,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setOrderId(order.id);
      setSavedOrderAmount(finalAmount);
      setStep("payment");
    } catch (error) {
      toast({
        title: "خطا در ثبت سفارش",
        description: error instanceof Error ? error.message : "خطای ناشناخته",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    setIsSubmitting(true);
    // UI and logic preparation for ZarinPal gateway redirection
    // Real implementation would make a call to an Edge Function that returns a ZarinPal payment URL, 
    // e.g., https://api.zarinpal.com/pg/v4/payment/request.json
    // And then we do window.location.href = `https://www.zarinpal.com/pg/StartPay/${authority}`;
    
    setTimeout(async () => {
      try {
        // Mock successful payment
        const { error } = await supabase
          .from("orders")
          .update({ status: "confirmed" })
          .eq("id", orderId || "");

        if (error) throw error;

        // Create a payment record
        const { data: userData } = await supabase.auth.getUser();
        await supabase.from("payments").insert({
          order_id: orderId || "",
          amount: savedOrderAmount,
          customer_id: userData.user?.id || "",
          profile_id: items[0].profile_id,
          status: "completed",
          method: "online",
          reference_code: "ZP-" + Math.random().toString(36).substring(7).toUpperCase(),
        });

        // Trigger real-time notification
        if (userData.user) {
          await supabase.from("notifications").insert({
            user_id: userData.user.id,
            type: "order_status",
            title: "سفارش شما تایید شد",
            body: `پرداخت سفارش #${orderId?.slice(0, 8)} با موفقیت انجام شد و در حال آماده‌سازی است.`,
            is_read: false,
          });
        }

        trackEvent("purchase_conversion", {
          entityType: "order",
          entityId: orderId || "",
          metadata: { amount: savedOrderAmount, items_count: items.length },
        });
        trackEvent("order_placed", {
          entityType: "order",
          entityId: orderId || "",
          metadata: { amount: savedOrderAmount, items_count: items.length },
        });
        clear();
        setStep("success");
      } catch (error) {
        toast({
          title: "خطا در تأیید پرداخت",
          description: error instanceof Error ? error.message : "خطای ناشناخته",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    }, 2000);
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-100 p-4 rounded-full">
              <CheckCircle2 className="text-emerald-600 w-12 h-12" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">سفارش با موفقیت ثبت شد</h1>
          <p className="text-muted-foreground mb-6">
            شماره سفارش: <span className="font-mono font-bold text-foreground">{orderId?.slice(0, 8)}</span>
          </p>
          <div className="space-y-3">
            <Button className="w-full gradient-gold text-primary-foreground" asChild>
              <Link to="/dashboard">مشاهده در پنل کاربری</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/">بازگشت به خانه</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold text-sm mb-4">
            <ArrowRight size={16} /> بازگشت
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="text-gold" /> نهایی‌سازی خرید
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === "details" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin size={20} className="text-gold" /> اطلاعات ارسال
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="recipient_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>نام و نام خانوادگی گیرنده</FormLabel>
                              <FormControl>
                                <Input placeholder="مثلاً: علی محمدی" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>شماره تماس (موبایل)</FormLabel>
                              <FormControl>
                                <Input dir="ltr" placeholder="09123456789" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>شهر</FormLabel>
                            <FormControl>
                              <Input placeholder="مثلاً: تهران، اصفهان، شیراز" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>آدرس دقیق</FormLabel>
                            <FormControl>
                              <Textarea placeholder="نام خیابان، کوچه، پلاک، واحد" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="note"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>توضیحات (اختیاری)</FormLabel>
                            <FormControl>
                              <Input placeholder="نکته‌ای برای ارسال..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full gradient-gold text-primary-foreground h-12 text-lg mt-4"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "تأیید و ادامه و پرداخت"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard size={20} className="text-gold" /> پرداخت آنلاین
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <div className="mb-6 bg-gold/10 p-6 rounded-2xl inline-block">
                    <CreditCard className="w-16 h-16 text-gold" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">انتقال به درگاه پرداخت ایمن</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    شما در حال انتقال به درگاه پرداخت زرین‌پال (ZarinPal) هستید. مبلغ {formatPersianPrice(savedOrderAmount)} از حساب شما کسر خواهد شد.
                  </p>
                  
                  {/* Gateway Readiness Info */}
                  <div className="mb-8 p-4 bg-muted/60 rounded-xl max-w-md mx-auto text-right text-xs text-muted-foreground space-y-2 border border-border">
                    <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <AlertCircle size={14} className="text-gold" /> اطلاعات فنی درگاه زرین‌پال:
                    </p>
                    <p>• وب‌سرویس فعال شده: SOAP / REST API v4</p>
                    <p>• شناسه مرجع پرداخت (Authority): پارامتر بازگشتی تراکنش</p>
                    <p>• آدرس بازگشت (Callback URL): <code className="bg-background px-1 py-0.5 rounded">/checkout/verify</code></p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      onClick={handlePayment} 
                      className="gradient-gold text-primary-foreground h-12 px-12"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="animate-spin ml-2" /> : null}
                      اتصال به درگاه و نهایی‌سازی پرداخت
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setStep("details")}
                      disabled={isSubmitting}
                      className="h-12"
                    >
                      بازگشت و ویرایش آدرس
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingBag size={20} className="text-gold" /> خلاصه سفارش
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex gap-3">
                      <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-full h-full p-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">تعداد: {item.quantity}</p>
                        <p className="text-xs font-bold text-gold mt-1">
                          {formatPersianPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Coupon Input Block */}
                  {step === "details" && (
                    <div className="pt-4 border-t space-y-2">
                      <Label htmlFor="coupon" className="text-xs text-muted-foreground">کد تخفیف</Label>
                      <div className="flex gap-2">
                        <Input
                          id="coupon"
                          placeholder="مثلاً: WELCOME10"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="h-9 text-center uppercase"
                          disabled={isValidatingCoupon}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={handleApplyCoupon}
                          disabled={isValidatingCoupon || !couponCode.trim()}
                          className="h-9 shrink-0"
                        >
                          {isValidatingCoupon ? <Loader2 className="animate-spin w-4 h-4" /> : "اعمال"}
                        </Button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-destructive flex items-center gap-1.5 mt-1">
                          <AlertCircle size={12} /> {couponError}
                        </p>
                      )}
                      {couponSuccess && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1.5 mt-1">
                          <Check size={12} /> {couponSuccess}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">قیمت کالاها:</span>
                      <span>{formatPersianPrice(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">هزینه ارسال:</span>
                      {shippingFee > 0 ? (
                        <span className="text-foreground">{formatPersianPrice(shippingFee)}</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">رایگان (نیاز به وارد کردن شهر)</span>
                      )}
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">تخفیف:</span>
                        <span className="text-destructive font-medium">
                          -{formatPersianPrice(discountAmount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>جمع کل:</span>
                      <span className="text-gold">{formatPersianPrice(finalAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 flex flex-col gap-2 p-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>تضمین اصالت و سلامت فیزیکی کالا</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>۷ روز ضمانت بازگشت وجه</span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
