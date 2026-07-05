import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Sparkles, Factory } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";
import SEO from "@/components/SEO";
import { trackEvent } from "@/lib/tracking";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const signInSchema = z.object({
  email: z.string().trim().email({ message: "ایمیل معتبر وارد کنید" }).max(255),
  password: z.string().min(6, { message: "رمز عبور حداقل ۶ کاراکتر باشد" }).max(72),
});

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "ایمیل معتبر وارد کنید" }).max(255),
  password: z.string().min(6, { message: "رمز عبور حداقل ۶ کاراکتر باشد" }).max(72),
  isProducer: z.boolean(),
  brandName: z.string().trim().max(120).optional(),
  contactName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(80).optional(),
  categorySlugs: z.array(z.string()),
}).refine(
  (data) => !data.isProducer || (data.brandName && data.brandName.length > 0),
  { message: "نام برند الزامی است", path: ["brandName"] }
).refine(
  (data) => !data.isProducer || data.categorySlugs.length > 0,
  { message: "حداقل یک دسته فعالیت انتخاب کنید", path: ["categorySlugs"] }
);

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  // Sign in state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign up state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isProducer, setIsProducer] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"; // Test key

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/", { replace: true });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/", { replace: true });
    });

    return () => subscription.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    supabase
      .from("producer_categories")
      .select("id, name, slug")
      .order("name")
      .then(({ data, error }) => {
        if (!error && data) setCategories(data);
      });
  }, []);

  const toggleCategory = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      toast({ title: "خطا در ورود با گوگل", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recaptchaToken) {
      toast({ title: "خطا", description: "لطفاً تأیید کنید که ربات نیستید", variant: "destructive" });
      return;
    }

    const result = signInSchema.safeParse({ email: signInEmail, password: signInPassword });
    if (!result.success) {
      toast({ title: "خطا", description: result.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });
    setLoading(false);
    if (error) {
      toast({ title: "ورود ناموفق", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "خوش آمدید", description: "با موفقیت وارد شدید" });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recaptchaToken) {
      toast({ title: "خطا", description: "لطفاً تأیید کنید که ربات نیستید", variant: "destructive" });
      return;
    }

    const result = signUpSchema.safeParse({
      email,
      password,
      isProducer,
      brandName,
      contactName,
      phone,
      city,
      categorySlugs: selectedSlugs,
    });
    if (!result.success) {
      toast({ title: "خطا", description: result.error.issues[0].message, variant: "destructive" });
      return;
    }

    setLoading(true);
    const metadata: Record<string, unknown> = {};
    if (isProducer) {
      metadata.brand_name = brandName;
      metadata.contact_name = contactName;
      metadata.phone = phone;
      metadata.city = city;
      metadata.category_slugs = selectedSlugs;
    }

    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: metadata,
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "ثبت‌نام ناموفق", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "حساب ساخته شد", description: "خوش آمدید!" });
      trackEvent("user_registered", {
        metadata: {
          is_producer: isProducer,
          has_brand: !!brandName,
        },
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 relative overflow-hidden" dir="rtl">
      <SEO title="ورود و ثبت‌نام" description="به حساب کاربری خود در خانه‌زیبا وارد شوید." />
      
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-brand/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold transition-colors mb-6"
        >
          <ArrowRight size={16} />
          <span className="text-sm">بازگشت به خانه</span>
        </Link>

        <Card className="p-8 shadow-luxury border-border bg-card">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 mb-4">
              <Sparkles size={14} className="text-gold" />
              <span className="text-gold text-xs font-medium">خانه‌زیبا</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              ورود به حساب کاربری
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              برای دسترسی به امکانات سایت وارد شوید یا ثبت‌نام کنید
            </p>
          </div>

          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-6 border-border hover:bg-accent transition-colors"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              ورود با حساب گوگل
            </Button>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">یا با ایمیل</span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">ورود</TabsTrigger>
              <TabsTrigger value="signup">ثبت‌نام</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">ایمیل</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="email@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    dir="ltr"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">رمز عبور</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    dir="ltr"
                    required
                  />
                </div>
                
                <div className="flex justify-center py-2">
                  <ReCAPTCHA
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={(token) => setRecaptchaToken(token)}
                    hl="fa"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !recaptchaToken}
                  className="w-full gradient-gold text-primary-foreground hover:opacity-90"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : "ورود"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">ایمیل</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">رمز عبور</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="حداقل ۶ کاراکتر"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    required
                  />
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/50 border border-border">
                  <Checkbox
                    id="is-producer"
                    checked={isProducer}
                    onCheckedChange={(v) => setIsProducer(v === true)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="is-producer"
                      className="flex items-center gap-2 cursor-pointer text-foreground font-medium"
                    >
                      <Factory size={16} className="text-gold" />
                      به‌عنوان تولیدکننده ثبت‌نام می‌کنم
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      اگر فروشگاه یا تولیدی دارید، اطلاعات برند خود را وارد کنید
                    </p>
                  </div>
                </div>

                {isProducer && (
                  <div className="space-y-4 p-4 rounded-xl border border-gold/20 bg-gold/5 animate-fade-in-up">
                    <div className="space-y-2">
                      <Label htmlFor="brand-name">
                        نام برند / فروشگاه <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="brand-name"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="مثلاً: مبلمان رویال"
                        maxLength={120}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name">نام مسئول</Label>
                        <Input
                          id="contact-name"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          maxLength={120}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">شماره تماس</Label>
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          dir="ltr"
                          maxLength={30}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">شهر</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="مثلاً: تهران"
                        maxLength={80}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        دسته فعالیت <span className="text-destructive">*</span>
                      </Label>
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 rounded-lg border border-border bg-background">
                        {categories.map((cat) => {
                          const checked = selectedSlugs.includes(cat.slug);
                          return (
                            <label
                              key={cat.id}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                                checked
                                  ? "bg-gold/15 border border-gold/40 text-foreground"
                                  : "border border-transparent hover:bg-accent text-muted-foreground"
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleCategory(cat.slug)}
                              />
                              <span>{cat.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-center py-2">
                  <ReCAPTCHA
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={(token) => setRecaptchaToken(token)}
                    hl="fa"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !recaptchaToken}
                  className="w-full gradient-gold text-primary-foreground hover:opacity-90"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : "ثبت‌نام"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
