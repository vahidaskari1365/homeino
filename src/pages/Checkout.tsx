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
import { Loader2, ArrowRight, CreditCard, MapPin, Phone, User, ShoppingBag, CheckCircle2 } from "lucide-react";
import { formatPersianPrice } from "@/lib/calculations";
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

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalAmount, clear } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [step, setStep] = useState<"details" | "payment" | "success">("details");

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

  useEffect(() => {
    if (items.length === 0 && step !== "success") {
      navigate("/shops");
    }
  }, [items, navigate, step]);

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

      // 1. Create the order
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
          total_amount: totalAmount,
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
    // Placeholder for actual payment gateway integration (e.g. ZarinPal)
    // In a real app, we would redirect to the gateway here.
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
          amount: totalAmount,
          customer_id: userData.user?.id || "",
          profile_id: items[0].profile_id,
          status: "completed",
          method: "online",
          reference_code: "ZP-" + Math.random().toString(36).substring(7).toUpperCase(),
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
    <div className="min-h-screen bg-background py-12 px-4">
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
                              <Input placeholder="مثلاً: تهران" {...field} />
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
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "تأیید و ادامه"}
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
                    شما در حال انتقال به درگاه پرداخت زرین‌پال هستید. مبلغ {formatPersianPrice(totalAmount)} از حساب شما کسر خواهد شد.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      onClick={handlePayment} 
                      className="gradient-gold text-primary-foreground h-12 px-12"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : "پرداخت و نهایی‌سازی"}
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
                  
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">قیمت کالاها:</span>
                      <span>{formatPersianPrice(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">هزینه ارسال:</span>
                      <span className="text-emerald-600 font-medium">رایگان</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2">
                      <span>جمع کل:</span>
                      <span className="text-gold">{formatPersianPrice(totalAmount)}</span>
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
