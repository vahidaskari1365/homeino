import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowRight, Calculator, Plus, Trash2, Check, Sparkles, Filter, Info, ShoppingBag } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

type Category = { id: string; name: string; slug: string };

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_name: string;
  style: string;
  brand_name?: string;
};

const STYLES = [
  { id: "modern", name: "مدرن" },
  { id: "minimal", name: "مینیمال" },
  { id: "classic", name: "کلاسیک" },
  { id: "neoclassic", name: "نئوکلاسیک" },
  { id: "rustic", name: "روستیک" },
  { id: "industrial", name: "صنعتی" }
];

// Fallback high quality mock products
const MOCK_PRODUCTS: Product[] = [
  {
    id: "mock-1",
    name: "مبل تک نفره مدرن راحتی",
    description: "طراحی شیک و ارگونومیک، پایه چوبی راش و پارچه ضد لک ترک مناسب برای دکوراسیون خانه‌های مدرن.",
    price: 12000000,
    image_url: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&auto=format&fit=crop&q=60",
    category_name: "مبلمان",
    style: "مدرن",
    brand_name: "مبلمان پارسا"
  },
  {
    id: "mock-2",
    name: "ست مبل ال مینیمال الوند",
    description: "کم‌جا، شیک و بسیار راحت. با اسفنج ۳۵ کیلویی ویژه و کلاف تمام چوب روسی جهت دوام بالا.",
    price: 35000000,
    image_url: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&auto=format&fit=crop&q=60",
    category_name: "مبلمان",
    style: "مینیمال",
    brand_name: "دکور مبل ایلیا"
  },
  {
    id: "mock-3",
    name: "مبل سه نفره کلاسیک امپراتور",
    description: "پارچه طلاکوب برجسته، چوب راش گرجستان منبت‌کاری شده با دست. مظهر لوکس بودن در پذیرایی شما.",
    price: 28000000,
    image_url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=60",
    category_name: "مبلمان",
    style: "کلاسیک",
    brand_name: "مبلمان سلطنتی آریا"
  },
  {
    id: "mock-4",
    name: "میز ناهارخوری ۴ نفره چوبی روستیک",
    description: "ساخته شده از چوب طبیعی گردو با حفظ لبه‌های طبیعی درخت و پایه‌های فلزی مشکی مات الکترواستاتیک.",
    price: 15000000,
    image_url: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=600&auto=format&fit=crop&q=60",
    category_name: "میز ناهارخوری",
    style: "روستیک",
    brand_name: "کارگاه هنر چوب"
  },
  {
    id: "mock-5",
    name: "میز ناهارخوری ۶ نفره نئوکلاسیک شهبانو",
    description: "صفحه ام‌دی‌اف روکش بلوط، پایه‌های خراطی شده زیبا با رنگ پلی‌اورتان ضدخش فرانسوی.",
    price: 22000000,
    image_url: "https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=600&auto=format&fit=crop&q=60",
    category_name: "میز ناهارخوری",
    style: "نئوکلاسیک",
    brand_name: "گروه صنعتی چوبینه"
  },
  {
    id: "mock-6",
    name: "میز ناهارخوری فلزی طرح صنعتی",
    description: "طراحی سبک اکسپوز و مینیمال، مقاوم در برابر ضربه و رطوبت. انتخابی عالی برای فضاهای مدرن و کافی‌شاپ‌ها.",
    price: 18000000,
    image_url: "https://images.unsplash.com/photo-1530018607912-eff2df114f11?w=600&auto=format&fit=crop&q=60",
    category_name: "میز ناهارخوری",
    style: "صنعتی",
    brand_name: "متال دیزاین"
  },
  {
    id: "mock-7",
    name: "لوستر مدرن برنجی خطی دایره‌ای",
    description: "لوستر سقفی مدرن با آبکاری برنجی لوکس، دارای لامپ‌های LED با بازده نوری عالی و مصرف کم.",
    price: 6500000,
    image_url: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600&auto=format&fit=crop&q=60",
    category_name: "لوستر و روشنایی",
    style: "مدرن",
    brand_name: "نورپردازی تابان"
  },
  {
    id: "mock-8",
    name: "لوستر آویز مینیمال مکعبی",
    description: "تک آویز مشکی مات مدرن و ظریف، عالی برای بالای کانتر آشپزخانه و میز ناهارخوری دو نفره.",
    price: 3800000,
    image_url: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=600&auto=format&fit=crop&q=60",
    category_name: "لوستر و روشنایی",
    style: "مینیمال",
    brand_name: "صنایع نوری هوم"
  },
  {
    id: "mock-9",
    name: "لوستر کریستالی کلاسیک پاریس",
    description: "بدنه تمام برنز با آویزهای کریستالی اصل شامپاینی، ۱۲ شاخه پر نور برای پذیرایی‌های مجلل.",
    price: 14000000,
    image_url: "https://images.unsplash.com/photo-1517999144091-3d9dca6d1e43?w=600&auto=format&fit=crop&q=60",
    category_name: "لوستر و روشنایی",
    style: "کلاسیک",
    brand_name: "لوستر عتیق"
  },
  {
    id: "mock-10",
    name: "فرش مدرن طرح ابریشم بلژیکی",
    description: "فرش ۱۲۰۰ شانه تراکم ۳۶۰۰، بافت نرم بدون پرزدهی، ضد حساسیت و رنگبندی طوسی متالیک با ترنج کم‌رنگ.",
    price: 9500000,
    image_url: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&auto=format&fit=crop&q=60",
    category_name: "فرش و قالی",
    style: "مدرن",
    brand_name: "فرش رخ آذین"
  },
  {
    id: "mock-11",
    name: "فرش دستبافت سنتی کاشان کلاسیک",
    description: "فرش دستبافت ۶ متری با پشم طبیعی و رنگ‌های گیاهی روناسی و سرمه‌ای، نقش نقشه لچک ترنج اصیل کاشان.",
    price: 45000000,
    image_url: "https://images.unsplash.com/photo-1581428982868-e410dd047a90?w=600&auto=format&fit=crop&q=60",
    category_name: "فرش و قالی",
    style: "کلاسیک",
    brand_name: "فرش دستبافت اخوان"
  },
  {
    id: "mock-12",
    name: "پرده کتان مدرن آماده نصب",
    description: "دو قواره پرده پانچ شده کتان ملانژ طوسی ملایم با دوام بالا در شستشو، ریزش فوق‌العاده شیک روی چوب پرده.",
    price: 4500000,
    image_url: "https://images.unsplash.com/photo-1514894780887-121968d00567?w=600&auto=format&fit=crop&q=60",
    category_name: "پرده",
    style: "مدرن",
    brand_name: "پرده‌سرای آرا"
  },
  {
    id: "mock-13",
    name: "پرده حریر کلاسیک نئوکلاسیک",
    description: "حریر با کیفیت با شاین ظریف به همراه دکور مخمل کوبیده ترک سرمه‌ای، ظاهری سلطنتی برای پذیرایی.",
    price: 7200000,
    image_url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&auto=format&fit=crop&q=60",
    category_name: "پرده",
    style: "نئوکلاسیک",
    brand_name: "پرده‌سرای آرا"
  },
  {
    id: "mock-14",
    name: "ست کالای خواب دو نفره کتان هومینو",
    description: "ست لحاف، ملحفه تشک کشدار و ۴ عدد روبالشی تمام کتان ارگانیک ضد حساسیت با طرح چهارخونه مینیمال.",
    price: 3200000,
    image_url: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=60",
    category_name: "کالای خواب",
    style: "مینیمال",
    brand_name: "کالای خواب نسیم"
  }
];

const BudgetEstimator = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBudget = Number(searchParams.get("amount") || "50000000");

  const [budget, setBudget] = useState<number>(initialBudget);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const { addItem, setOpen } = useCart();

  useEffect(() => {
    const fetchDbData = async () => {
      setLoading(true);
      try {
        // Fetch categories from db
        const { data: catData } = await supabase
          .from("producer_categories")
          .select("name");

        const dbCats = catData ? Array.from(new Set(catData.map(c => c.name))) : [];
        const fallbackCats = Array.from(new Set(MOCK_PRODUCTS.map(p => p.category_name)));
        setCategories(dbCats.length > 0 ? dbCats : fallbackCats);

        // Fetch products from db
        const { data: prodData } = await supabase
          .from("products")
          .select("id, name, description, price, image_url, attributes, profiles(brand_name)")
          .eq("is_active", true);

        if (prodData && prodData.length > 0) {
          const formattedProducts: Product[] = prodData.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price || 0,
            image_url: p.image_url,
            category_name: (p.attributes?.category as string) || "مبلمان",
            style: (p.attributes?.style as string) || "مدرن",
            brand_name: p.profiles?.brand_name || "تولیدکننده هومینو"
          }));
          setDbProducts(formattedProducts);
        }
      } catch (err) {
        console.error("Error fetching db products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDbData();
  }, []);

  const allProducts = dbProducts.length > 0 ? [...dbProducts, ...MOCK_PRODUCTS.filter(mp => !dbProducts.some(dp => dp.name === mp.name))] : MOCK_PRODUCTS;

  // Filter products based on selected categories and styles
  const filteredProducts = allProducts.filter((product) => {
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(product.category_name);
    const styleMatch = selectedStyles.length === 0 || selectedStyles.includes(product.style);
    return categoryMatch && styleMatch;
  });

  const totalCost = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const remainingBudget = budget - totalCost;
  const isOverBudget = remainingBudget < 0;
  const percentSpent = Math.min((totalCost / budget) * 100, 100);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleStyle = (styleName: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleName) ? prev.filter((s) => s !== styleName) : [...prev, styleName]
    );
  };

  const handleSelectItem = (product: Product) => {
    if (selectedItems.some((item) => item.id === product.id)) {
      setSelectedItems((prev) => prev.filter((item) => item.id !== product.id));
      toast.success(`"${product.name}" از لیست محاسبات بودجه حذف شد.`);
    } else {
      if (product.price > remainingBudget) {
        toast.warning("توجه: انتخاب این محصول شما را از سقف بودجه فراتر خواهد برد!");
      }
      setSelectedItems((prev) => [...prev, product]);
      toast.success(`"${product.name}" به لیست محاسبات بودجه اضافه شد.`);
    }
  };

  const handleAddAllToCart = () => {
    if (selectedItems.length === 0) {
      toast.error("لطفاً ابتدا چند محصول را انتخاب کنید.");
      return;
    }
    
    let addedCount = 0;
    selectedItems.forEach((item) => {
      addItem({
        product_id: item.id,
        profile_id: "budget-estimator",
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        stock: 99
      });
      addedCount++;
    });

    toast.success(`${addedCount} محصول با موفقیت به سبد خریدتان افزوده شد! 🎉`);
    setOpen(true);
  };

  const formatPersianPrice = (num: number) => {
    return num.toLocaleString("fa-IR") + " تومان";
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SEO 
        title="توصیه‌گر هوشمند بودجه دکوراسیون" 
        description="تجهیز و چیدمان خانه رویایی بر اساس بودجه دلخواه شما با پیشنهاد کالاها در سبک‌های متنوع."
      />
      <Navbar />

      <main className="container mx-auto px-6 pt-28 pb-16">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold transition-colors text-sm">
            <ArrowRight size={16} />
            <span>بازگشت به خانه</span>
          </Link>
        </div>

        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-5 py-2 mb-4">
            <Calculator size={18} className="text-gold" />
            <span className="text-gold text-sm font-semibold">سیستم بودجه‌بندی هوشمند هومینو</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-display text-gold font-bold mb-4">طراحی چیدمان متناسب با بودجه شما</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            بودجه خود را ویرایش کنید، دسته‌بندی‌ها و سبک‌های دکوراسیون ایده‌آل خود را علامت بزنید و مناسب‌ترین محصولات را برای تکمیل چیدمان خانه‌تان انتخاب کنید.
          </p>
        </header>

        {/* Dynamic Budget Controller Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Budget Display Card */}
          <Card className="lg:col-span-2 border-gold/30 bg-card shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-gold flex items-center gap-2">
                <span>تراز مالی بودجه دکوراسیون</span>
              </CardTitle>
              <CardDescription>مدیریت هزینه‌ها و اقلام انتخابی دکوراسیون به صورت زنده</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-xs text-muted-foreground mb-2 font-medium">سقف بودجه کل شما</label>
                  <div className="relative flex items-center">
                    <Input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="pl-4 pr-3 py-6 font-bold text-lg text-gold border-gold/40 focus-visible:ring-gold"
                    />
                    <span className="absolute left-3 text-xs text-muted-foreground pointer-events-none">تومان</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-2 font-medium">کل هزینه اقلام انتخابی</label>
                  <div className="bg-primary/5 rounded-lg py-3 px-4 border border-border h-[50px] flex items-center font-bold text-lg text-foreground">
                    {formatPersianPrice(totalCost)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-2 font-medium">بودجه باقی‌مانده</label>
                  <div className={`rounded-lg py-3 px-4 border h-[50px] flex items-center font-bold text-lg ${isOverBudget ? "bg-red-500/10 text-red-500 border-red-500/30" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"}`}>
                    {formatPersianPrice(remainingBudget)}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>میزان بودجه مصرف‌شده: {percentSpent.toFixed(0)}٪</span>
                  <span>{formatPersianPrice(budget)}</span>
                </div>
                <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${isOverBudget ? "bg-red-500" : "bg-gold"}`}
                    style={{ width: `${percentSpent}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Card */}
          <Card className="border-border shadow-md flex flex-col justify-between">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>اقلام انتخاب شده ({selectedItems.length})</span>
              </CardTitle>
              <CardDescription>افزودن یکجای کالاها به سبد خرید</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="max-h-[140px] overflow-y-auto space-y-2 mb-4 scrollbar-thin">
                {selectedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">کارت‌های پایین را علامت بزنید تا در اینجا نمایش داده شوند.</p>
                ) : (
                  selectedItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs bg-muted p-2 rounded-lg border border-border">
                      <span className="font-medium truncate max-w-[180px]">{item.name}</span>
                      <span className="text-gold font-bold shrink-0">{formatPersianPrice(item.price)}</span>
                    </div>
                  ))
                )}
              </div>
              <Button 
                onClick={handleAddAllToCart} 
                disabled={selectedItems.length === 0} 
                className="w-full gradient-gold text-primary-foreground font-bold py-6 gap-2"
              >
                <ShoppingBag size={18} />
                افزودن همه به سبد خرید
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Filter Toolbar Section */}
        <div className="bg-card border border-border rounded-xl p-6 mb-10 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Filter size={18} className="text-gold" />
            <span>تنظیم فیلترهای نمایش اقلام</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Category selection */}
            <div>
              <span className="block text-sm font-semibold text-muted-foreground mb-3">انتخاب دسته‌بندی‌ها (امکان انتخاب همزمان چند مورد):</span>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <Badge
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-4 py-2 cursor-pointer rounded-full transition-all text-xs font-semibold select-none border ${isSelected ? "bg-gold text-primary-foreground border-gold hover:bg-gold/90" : "bg-background text-foreground border-border hover:border-gold/50"}`}
                    >
                      {cat}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Style selection */}
            <div>
              <span className="block text-sm font-semibold text-muted-foreground mb-3">انتخاب سبک‌ها و مدل‌ها:</span>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((style) => {
                  const isSelected = selectedStyles.includes(style.name);
                  return (
                    <Badge
                      key={style.id}
                      onClick={() => toggleStyle(style.name)}
                      className={`px-4 py-2 cursor-pointer rounded-full transition-all text-xs font-semibold select-none border ${isSelected ? "bg-gold text-primary-foreground border-gold hover:bg-gold/90" : "bg-background text-foreground border-border hover:border-gold/50"}`}
                    >
                      {style.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Product Cards Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-foreground">
              کالاهای پیشنهادی متناسب ({filteredProducts.length} کالا)
            </h3>
            {filteredProducts.length > 0 && (
              <span className="text-xs text-muted-foreground">برای اضافه یا حذف از برگه محاسبات روی کارت‌ها کلیک کنید</span>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-24 bg-card rounded-xl border border-border">
              <Info size={48} className="text-gold mx-auto mb-4" />
              <h4 className="text-xl font-bold mb-2">هیچ کالایی یافت نشد</h4>
              <p className="text-muted-foreground max-w-md mx-auto">
                هیچ کدام از کالاها با فیلترهای انتخابی شما همخوانی ندارند. لطفاً دسته‌بندی‌ها یا سبک‌های انتخابی را تغییر دهید.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const isSelected = selectedItems.some((item) => item.id === product.id);
                return (
                  <Card 
                    key={product.id} 
                    className={`flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg ${isSelected ? "border-gold ring-2 ring-gold/40" : "border-border hover:border-gold/50"}`}
                    onClick={() => handleSelectItem(product)}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          تصویر کالا
                        </div>
                      )}
                      
                      {/* Category and Style Badges */}
                      <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                        <Badge className="bg-charcoal/80 backdrop-blur-md text-white border-0 text-[10px] px-2 py-0.5">
                          {product.category_name}
                        </Badge>
                        <Badge className="bg-gold text-primary-foreground border-0 text-[10px] px-2 py-0.5 font-bold">
                          سبک {product.style}
                        </Badge>
                      </div>

                      {/* Selected Overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-gold/10 backdrop-blur-[1px] flex items-center justify-center transition-all">
                          <div className="bg-gold text-primary-foreground rounded-full p-2.5 shadow-lg">
                            <Check size={24} className="stroke-[3]" />
                          </div>
                        </div>
                      )}
                    </div>

                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-base text-foreground line-clamp-1">{product.name}</h4>
                      </div>
                      {product.brand_name && (
                        <span className="text-[10px] text-muted-foreground font-semibold">برند: {product.brand_name}</span>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-2 h-8 leading-relaxed">
                        {product.description}
                      </p>
                    </CardHeader>

                    <CardContent className="p-4 pt-2">
                      <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
                        <span className="text-xs text-muted-foreground">قیمت مستقیم:</span>
                        <span className="text-gold font-extrabold text-base">{formatPersianPrice(product.price)}</span>
                      </div>
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation(); // Don't trigger the select item action
                          addItem({
                            product_id: product.id,
                            profile_id: "budget-estimator",
                            name: product.name,
                            price: product.price,
                            image_url: product.image_url,
                            stock: 99
                          });
                          toast.success(`"${product.name}" به سبد خریدتان اضافه شد.`);
                        }}
                        className="w-full mt-3 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs py-2 h-9 rounded-lg"
                      >
                        افزودن به سبد خرید
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BudgetEstimator;